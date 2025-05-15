import { FreshContext } from "$fresh/server.ts";

// Define types for Moxfield API response
interface MoxfieldCardData {
  card: {
    name: string;
  };
  quantity: number;
}

interface MoxfieldResponse {
  commanders: Record<string, MoxfieldCardData>;
  mainboard: Record<string, MoxfieldCardData>;
}

interface ProcessedDeck {
  cards: Array<{ quantity: number; name: string }>;
  commander: { quantity: number; name: string } | null;
}

// API response types for better type safety
interface SuccessResponse {
  cards: Array<{ quantity: number; name: string }>;
  commander: { quantity: number; name: string };
}

interface ErrorResponse {
  error: string;
}

// Common response headers
const JSON_HEADERS = {
  "Content-Type": "application/json",
};

// Simple in-memory cache for decks to prevent repeated API calls
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes cache TTL
const MAX_CACHE_SIZE = 1000; // Maximum number of entries to prevent memory issues
interface CacheEntry {
  timestamp: number;
  data: ProcessedDeck;
}
const deckCache = new Map<string, CacheEntry>();

// Rate limiting configuration - Sliding window
const RATE_LIMIT = 30; // Max requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute window in ms
interface SlidingWindowRateLimitEntry {
  currentWindowStart: number; // Start timestamp of the current window
  prevWindowCount: number; // Number of requests in previous window
  currentWindowCount: number; // Number of requests in current window
}
// Store IP addresses and their request counts
const rateLimitStore = new Map<string, SlidingWindowRateLimitEntry>();

// Cleanup old rate limit entries periodically (every minute)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.currentWindowStart >= RATE_WINDOW * 2) {
      // If the entry is older than 2 windows, it's no longer relevant
      rateLimitStore.delete(key);
    } else if (now - entry.currentWindowStart >= RATE_WINDOW) {
      // If we've moved to a new window, slide the window forward
      rateLimitStore.set(key, {
        currentWindowStart: entry.currentWindowStart + RATE_WINDOW,
        prevWindowCount: entry.currentWindowCount,
        currentWindowCount: 0,
      });
    }
  }
}, 60 * 1000);

// Cleanup old cache entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  let count = 0;
  for (const [key, entry] of deckCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      deckCache.delete(key);
      count++;
    }
  }
  // Log cleanup in development environment
  if (count > 0 && !Deno.env.get("DENO_DEPLOYMENT_ID")) {
    console.log(`Cache cleanup: removed ${count} expired entries`);
  }
}, 5 * 60 * 1000);

// Processes Moxfield data into our application format
function processMoxfieldData(moxfieldData: MoxfieldResponse): ProcessedDeck {
  // Use direct assignment for commander with optional chaining
  const commander =
    moxfieldData.commanders && Object.values(moxfieldData.commanders)[0]
      ? {
        quantity: 1,
        name: Object.values(moxfieldData.commanders)[0].card.name,
      }
      : null;

  // Process mainboard cards in one step
  const cards = moxfieldData.mainboard
    ? Object.values(moxfieldData.mainboard).map((card) => ({
      quantity: card.quantity,
      name: card.card.name,
    }))
    : [];

  return { cards, commander };
}

export const handler = async (
  req: Request,
  _ctx: FreshContext,
): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const deckId = url.searchParams.get("id");

    if (!deckId) {
      return new Response(
        JSON.stringify({ error: "No deck ID provided" } as ErrorResponse),
        {
          status: 400,
          headers: JSON_HEADERS,
        },
      );
    }

    // Rate limiting logic
    const clientIp = req.headers.get("x-forwarded-for") ||
      req.headers.get("cf-connecting-ip") || "unknown";
    const now = Date.now();
    const rateLimitEntry = rateLimitStore.get(clientIp);

    if (rateLimitEntry) {
      const elapsed = now - rateLimitEntry.currentWindowStart;
      if (elapsed < RATE_WINDOW) {
        const slidingWindowCount =
          rateLimitEntry.prevWindowCount * (1 - elapsed / RATE_WINDOW) +
          rateLimitEntry.currentWindowCount;
        if (slidingWindowCount >= RATE_LIMIT) {
          // Calculate time until reset and remaining requests
          const timeUntilReset = RATE_WINDOW - elapsed;
          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded. Please try again later.",
              retryAfter: Math.ceil(timeUntilReset / 1000),
            } as ErrorResponse),
            {
              status: 429,
              headers: {
                ...JSON_HEADERS,
                "X-RateLimit-Limit": RATE_LIMIT.toString(),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": Math.floor(
                  (rateLimitEntry.currentWindowStart + RATE_WINDOW) / 1000,
                ).toString(),
                "Retry-After": Math.ceil(timeUntilReset / 1000).toString(),
              },
            },
          );
        }
        rateLimitEntry.currentWindowCount++;
      } else {
        rateLimitStore.set(clientIp, {
          currentWindowStart: now,
          prevWindowCount: rateLimitEntry.currentWindowCount,
          currentWindowCount: 1,
        });
      }
    } else {
      rateLimitStore.set(clientIp, {
        currentWindowStart: now,
        prevWindowCount: 0,
        currentWindowCount: 1,
      });
    }

    // Check if we have a valid cache entry for this deck
    const cachedDeck = deckCache.get(deckId);

    if (cachedDeck && (now - cachedDeck.timestamp) < CACHE_TTL) {
      // Return cached results if they're still valid
      return new Response(
        JSON.stringify(cachedDeck.data),
        { headers: { ...JSON_HEADERS, "X-Cache": "HIT" } },
      );
    }

    // Fetch the deck from Moxfield API with timeout and retry logic
    const maxRetries = 3;
    let retries = 0;
    let timeoutId: number | undefined = undefined;
    let moxfieldData: MoxfieldResponse | undefined;

    while (retries <= maxRetries) {
      try {
        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutMs = 10000 + (retries * 5000); // Increase timeout with each retry
        
        // Set timeout with proper type handling
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        if (retries > 0 && !Deno.env.get("DENO_DEPLOYMENT_ID")) {
          console.log(
            `Retrying fetch for deck with ID: ${deckId} (attempt ${retries}/${maxRetries})`,
          );
        } else if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
          console.log(`Fetching deck with ID: ${deckId}`);
        }

        const response = await fetch(
          `https://api.moxfield.com/v2/decks/all/${deckId}`,
          {
            signal: controller.signal,
            headers: {
              "Accept": "application/json",
              "User-Agent": "PHL-Legality-Checker",
            },
            // HTTP/2 optimizations
            cache: "force-cache", // Use cache when possible
            keepalive: true, // Keep connection alive for better performance
          },
        );

        clearTimeout(timeoutId);
        timeoutId = undefined;

        // Log request in development environment
        if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
          console.log(
            `Fetched deck: https://api.moxfield.com/v2/decks/all/${deckId}`,
          );
        }

        if (!response.ok) {
          if (response.status === 429 && retries < maxRetries) {
            // Too Many Requests - implement exponential backoff
            retries++;
            const backoffTime = 1000 * Math.pow(2, retries); // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
            continue;
          }

          return new Response(
            JSON.stringify({
              error: `Failed to fetch deck: ${response.statusText}`,
            } as ErrorResponse),
            {
              status: response.status,
              headers: JSON_HEADERS,
            },
          );
        }

        moxfieldData = await response.json() as MoxfieldResponse;

        // We got a successful response, break out of the retry loop
        break;
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        timeoutId = undefined;

        if (fetchError instanceof Error) {
          // For timeout or network errors, retry if possible
          if (fetchError.name === "AbortError" ||
            fetchError.name === "TypeError" ||
            fetchError.message.includes("network")) {
            retries++;
            if (retries <= maxRetries) {
              const backoffTime = 1000 * Math.pow(2, retries);
              await new Promise((resolve) => setTimeout(resolve, backoffTime));
              continue;
            }

            return new Response(
              JSON.stringify(
                {
                  error: "Request timeout or network error fetching deck from Moxfield",
                } as ErrorResponse,
              ),
              {
                status: 504,
                headers: JSON_HEADERS,
              },
            );
          }
        }

        throw fetchError;
      }
    }

    // If we reach here without successful data, return a timeout error
    if (!moxfieldData) {
      return new Response(
        JSON.stringify(
          { error: "Failed to fetch deck after multiple attempts" } as ErrorResponse,
        ),
        {
          status: 500,
          headers: JSON_HEADERS,
        },
      );
    }

    // Transform Moxfield data into our expected format
    const processedDeck = processMoxfieldData(moxfieldData);

    // Validation checks
    if (!processedDeck.commander) {
      return new Response(
        JSON.stringify(
          { error: "No commander found in deck" } as ErrorResponse,
        ),
        {
          status: 400,
          headers: JSON_HEADERS,
        },
      );
    }

    if (processedDeck.cards.length === 0) {
      return new Response(
        JSON.stringify(
          { error: "Deck contains no cards in the mainboard" } as ErrorResponse,
        ),
        {
          status: 400,
          headers: JSON_HEADERS,
        },
      );
    }

    // Implement cache size management - if we're at capacity, remove oldest entry
    if (deckCache.size >= MAX_CACHE_SIZE) {
      // Find the oldest cache entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of deckCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      // Remove oldest entry
      if (oldestKey) {
        deckCache.delete(oldestKey);
      }
    }

    // Save to cache
    deckCache.set(deckId, {
      timestamp: now,
      data: processedDeck,
    });

    // Return the processed deck
    return new Response(
      JSON.stringify(processedDeck as SuccessResponse),
      {
        headers: {
          ...JSON_HEADERS,
          "X-Cache": "MISS",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Error fetching deck:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage } as ErrorResponse),
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    );
  }
};
