import { FreshContext } from "$fresh/server.ts";
import { DeckCache } from "../../utils/deck-cache.ts";
import { RateLimiter } from "../../utils/rate-limiter.ts";
import type {
  MoxfieldResponse,
  ProcessedDeck,
  SuccessResponse,
  ErrorResponse,
} from "../../types/moxfield.ts";

// Common response headers
const JSON_HEADERS = {
  "Content-Type": "application/json",
};

// Initialize utilities
const _deckCache = new DeckCache();
export const rateLimiter = new RateLimiter();

// Processes Moxfield data into our application format
function processMoxfieldData(moxfieldData: MoxfieldResponse): ProcessedDeck {
  const commander =
    moxfieldData.commanders && Object.values(moxfieldData.commanders)[0]
      ? {
          quantity: 1,
          name: Object.values(moxfieldData.commanders)[0].card.name,
        }
      : null;

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
  let timeoutId: number | undefined = undefined;

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

    const rateLimit = rateLimiter.check(clientIp);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((rateLimit.timeUntilReset || 0) / 1000),
        } as ErrorResponse),
        {
          status: 429,
          headers: {
            ...JSON_HEADERS,
            ...rateLimit.headers,
          },
        },
      );
    }

    // Check cache
    const cachedDeck = _deckCache.get(deckId);
    if (cachedDeck) {
      return new Response(
        JSON.stringify(cachedDeck),
        { 
          headers: { 
            ...JSON_HEADERS,
            ...rateLimit.headers,
            "X-Cache": "HIT"
          }
        },
      );
    }

    // Fetch the deck from Moxfield API with timeout and retry logic
    const maxRetries = 3;
    let retries = 0;
    let moxfieldData: MoxfieldResponse | undefined;

    while (retries <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutMs = 10000 + (retries * 5000); // Increase timeout with each retry

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
            cache: "force-cache",
            keepalive: true,
          },
        );

        clearTimeout(timeoutId);
        timeoutId = undefined;

        if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
          console.log(
            `Fetched deck: https://api.moxfield.com/v2/decks/all/${deckId}`,
          );
        }

        if (!response.ok) {
          if (response.status === 429 && retries < maxRetries) {
            retries++;
            const backoffTime = 1000 * Math.pow(2, retries);
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
            continue;
          }

          return new Response(
            JSON.stringify({
              error: `Failed to fetch deck: ${response.statusText}`,
            } as ErrorResponse),
            {
              status: response.status,
              headers: { ...JSON_HEADERS, ...rateLimit.headers },
            },
          );
        }

        moxfieldData = await response.json() as MoxfieldResponse;
        break;
      } catch (fetchError: unknown) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = undefined;

        if (fetchError instanceof Error) {
          if (
            fetchError.name === "AbortError" ||
            fetchError.name === "TypeError" ||
            fetchError.message.includes("network")
          ) {
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
                headers: { ...JSON_HEADERS, ...rateLimit.headers },
              },
            );
          }
        }

        throw fetchError;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }
    }

    if (!moxfieldData) {
      return new Response(
        JSON.stringify(
          {
            error: "Failed to fetch deck after multiple attempts",
          } as ErrorResponse,
        ),
        {
          status: 500,
          headers: { ...JSON_HEADERS, ...rateLimit.headers },
        },
      );
    }

    const processedDeck = processMoxfieldData(moxfieldData);

    if (!processedDeck.commander) {
      return new Response(
        JSON.stringify(
          { error: "No commander found in deck" } as ErrorResponse,
        ),
        {
          status: 400,
          headers: { ...JSON_HEADERS, ...rateLimit.headers },
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
          headers: { ...JSON_HEADERS, ...rateLimit.headers },
        },
      );
    }

    // Cache the processed deck
    _deckCache.set(deckId, processedDeck);

    return new Response(
      JSON.stringify(processedDeck as SuccessResponse),
      {
        headers: {
          ...JSON_HEADERS,
          ...rateLimit.headers,
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
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};
