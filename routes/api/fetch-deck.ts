import { FreshContext } from "$fresh/server.ts";
import { DeckCache } from "../../utils/deck-cache.ts";
import { RateLimiter } from "../../utils/rate-limiter.ts";
import type {
  ErrorResponse,
  MoxfieldResponse,
  ProcessedDeck,
  SuccessResponse,
} from "../../types/moxfield.ts";

// Constants
const JSON_HEADERS = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

const SECURITY_HEADERS = {
  ...JSON_HEADERS,
  "Cache-Control": "no-store, max-age=0",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

const REQUEST_CONFIG = {
  maxRetries: 3,
  maxTimeout: 20000, // 20 second maximum timeout
  baseTimeout: 10000, // 10 second base timeout
  backoffFactor: 1.5, // Exponential backoff multiplier
  maxDeckIdLength: 100, // Reasonable limit for deck ID length
  ipRequestWindow: 60 * 1000, // 1 minute
  maxRequestsPerWindow: 30, // 30 requests per minute
};

// Input validation function
const validateDeckId = (deckId: string): boolean => {
  // Check length
  if (!deckId || deckId.length > REQUEST_CONFIG.maxDeckIdLength) {
    return false;
  }

  // Only allow alphanumeric characters and hyphens in deck IDs
  return /^[a-zA-Z0-9\-]+$/.test(deckId);
};

// Initialize utilities
let deckCache: DeckCache | null = null;
let rateLimiter: RateLimiter | null = null;

// Helper functions
const createError = (
  message: string,
  status = 400,
  rateLimit?: { headers: Record<string, string> },
) => {
  return new Response(
    JSON.stringify({ error: message } as ErrorResponse),
    {
      status,
      headers: {
        ...SECURITY_HEADERS,
        ...(rateLimit?.headers || {}),
      },
    },
  );
};

const calculateBackoff = (retries: number): number => {
  return Math.min(
    REQUEST_CONFIG.baseTimeout *
      Math.pow(REQUEST_CONFIG.backoffFactor, retries),
    REQUEST_CONFIG.maxTimeout,
  );
};

const processMoxfieldData = (moxfieldData: MoxfieldResponse): ProcessedDeck => {
  const commander =
    moxfieldData.commanders && Object.values(moxfieldData.commanders)[0]
      ? {
        quantity: 1,
        name: Object.values(moxfieldData.commanders)[0].card.name,
      }
      : null;

  const mainDeck = moxfieldData.mainboard
    ? Object.values(moxfieldData.mainboard).map((card) => ({
      quantity: card.quantity,
      name: card.card.name,
    }))
    : [];

  return { mainDeck, commander };
};

const fetchDeckFromMoxfield = async (
  deckId: string,
  controller: AbortController,
): Promise<Response> => {
  const response = await fetch(
    `https://api.moxfield.com/v2/decks/all/${deckId}`,
    {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "PHL-Legality-Checker/1.0",
      },
      cache: "force-cache",
      keepalive: true,
    },
  );

  if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
    console.log(
      `Fetched deck: https://api.moxfield.com/v2/decks/all/${deckId}`,
    );
  }

  return response;
};

export const handler = async (
  req: Request,
  ctx: FreshContext,
): Promise<Response> => {
  let timeoutId: number | undefined;

  try {
    // Validate request method
    if (req.method !== "GET") {
      return createError("Method not allowed", 405);
    }

    // Skip during build and initialize utilities lazily, but allow tests to run
    const { isBuildMode } = await import("../../utils/is-build.ts");
    if (isBuildMode() && !Deno.env.get("DENO_TEST")) {
      return new Response(
        JSON.stringify({ error: "Service unavailable during build" }),
        { status: 503, headers: SECURITY_HEADERS },
      );
    }

    // Extract and validate deck ID from URL with proper error handling
    let deckId: string;
    try {
      const url = new URL(req.url);
      const rawDeckId = url.searchParams.get("id");
      if (!rawDeckId) {
        return createError("No deck ID provided");
      }

      if (!validateDeckId(rawDeckId)) {
        return createError("Invalid deck ID format");
      }

      deckId = rawDeckId;
    } catch (_error) {
      return createError("Invalid request URL");
    }

    // Lazy initialization of utilities with proper error handling
    if (!deckCache || !rateLimiter) {
      try {
        deckCache = new DeckCache();
        rateLimiter = new RateLimiter();
      } catch (error) {
        console.error("[fetch-deck] Failed to initialize utilities:", error);
        return createError("Service initialization error", 500);
      }
    }

    // From this point on, we know these are initialized
    const validDeckCache = deckCache!;
    const validRateLimiter = rateLimiter!;

    if (!validateDeckId(deckId)) {
      return createError("Invalid deck ID format");
    }

    // Get client IP from x-forwarded-for header
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    console.log(`[fetch-deck] Fetching deckId=${deckId} from IP=${clientIp}`);

    const rateLimit = validRateLimiter.check(clientIp);
    if (!rateLimit.allowed) {
      return createError(
        "Rate limit exceeded. Please try again later.",
        429,
        { headers: rateLimit.headers },
      );
    }

    // Check cache first
    const cachedDeck = validDeckCache.get(deckId);
    if (cachedDeck) {
      console.log(`[fetch-deck] Cache HIT for deckId=${deckId}`);
      // Return cached deck
      return new Response(
        JSON.stringify(cachedDeck),
        {
          headers: {
            ...SECURITY_HEADERS,
            ...rateLimit.headers,
            "X-Cache": "HIT",
          },
        },
      );
    }

    // Cache MISS, proceeding to fetch
    console.log(`[fetch-deck] Cache MISS for deckId=${deckId}`);
    // Fetch deck with retries
    let retries = 0;
    let moxfieldData: MoxfieldResponse | undefined;

    while (retries <= REQUEST_CONFIG.maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutMs = calculateBackoff(retries);

        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        if (retries > 0) {
          console.log(
            `Retrying fetch for deck with ID: ${deckId} (attempt ${retries}/${REQUEST_CONFIG.maxRetries})`,
          );
        }

        const response = await fetchDeckFromMoxfield(deckId, controller);
        clearTimeout(timeoutId);
        timeoutId = undefined;

        if (!response.ok) {
          if (response.status === 429 && retries < REQUEST_CONFIG.maxRetries) {
            retries++;
            await new Promise((resolve) =>
              setTimeout(resolve, calculateBackoff(retries))
            );
            continue;
          }

          return createError(
            `Failed to fetch deck: ${response.statusText}`,
            response.status,
            { headers: rateLimit.headers },
          );
        }

        moxfieldData = await response.json() as MoxfieldResponse;
        break;
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        if (error instanceof Error) {
          const isNetworkError = error.name === "AbortError" ||
            error.name === "TypeError" ||
            error.message.includes("network");

          if (isNetworkError && retries < REQUEST_CONFIG.maxRetries) {
            retries++;
            await new Promise((resolve) =>
              setTimeout(resolve, calculateBackoff(retries))
            );
            continue;
          }

          if (isNetworkError) {
            return createError(
              "Request timeout or network error fetching deck from Moxfield",
              504,
              { headers: rateLimit.headers },
            );
          }
        }

        throw error;
      }
    }

    if (!moxfieldData) {
      return createError(
        "Failed to fetch deck after multiple attempts",
        500,
        { headers: rateLimit.headers },
      );
    }

    // Process and validate deck data
    const processedDeck = processMoxfieldData(moxfieldData);

    if (!processedDeck.commander) {
      return createError(
        "No commander found in deck",
        400,
        { headers: rateLimit.headers },
      );
    }

    if (!processedDeck.mainDeck.length) {
      return createError(
        "Deck contains no cards in the mainboard",
        400,
        { headers: rateLimit.headers },
      );
    }

    // Cache the validated deck
    validDeckCache.set(deckId, processedDeck);
    console.log(`[fetch-deck] Cached deckId=${deckId} successfully`);

    return new Response(
      JSON.stringify(processedDeck as SuccessResponse),
      {
        headers: {
          ...SECURITY_HEADERS,
          ...rateLimit.headers,
          "X-Cache": "MISS",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching deck:", error);
    return createError(
      error instanceof Error ? error.message : String(error),
      500,
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
