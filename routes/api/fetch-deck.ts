import { FreshContext } from "fresh";
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

// Helper functions
const createError = (
  message: string,
  status = 400,
) => {
  return new Response(
    JSON.stringify({ error: message } as ErrorResponse),
    {
      status,
      headers: SECURITY_HEADERS,
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

export const handler = {
  async GET(ctx: FreshContext): Promise<Response> {
    let timeoutId: number | undefined;

    try {
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
        const url = new URL(ctx.req.url);
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

      if (!validateDeckId(deckId)) {
        return createError("Invalid deck ID format");
      }

      console.log(`[fetch-deck] Fetching deckId=${deckId}`);
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
            if (
              response.status === 429 && retries < REQUEST_CONFIG.maxRetries
            ) {
              retries++;
              await new Promise((resolve) =>
                setTimeout(resolve, calculateBackoff(retries))
              );
              continue;
            }

            return createError(
              `Failed to fetch deck: ${response.statusText}`,
              response.status,
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

            if (isNetworkError) {
              return createError(
                "Request timeout or network error fetching deck from Moxfield",
                504,
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
        );
      }

      // Process and validate deck data
      const processedDeck = processMoxfieldData(moxfieldData);

      if (!processedDeck.commander) {
        return createError(
          "No commander found in deck",
          400,
        );
      }

      if (!processedDeck.mainDeck.length) {
        return createError(
          "Deck contains no cards in the mainboard",
          400,
        );
      }

      return new Response(
        JSON.stringify(processedDeck as SuccessResponse),
        {
          headers: SECURITY_HEADERS,
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
  },
};
