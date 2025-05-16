import { Button } from "../components/Button.tsx";
import { useState } from "preact/hooks";

// Define the Card interface for our decklist structure
interface Card {
  quantity: number;
  name: string;
}

// Define the Decklist interface
interface Decklist {
  mainDeck: Card[];
  commander: Card;
}

interface LegalityResult {
  legal: boolean;
  commander: string;
  commanderImageUris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    art_crop?: string;
    border_crop?: string;
  };
  colorIdentity?: string[];
  illegalCards?: string[];
  colorIdentityViolations?: string[];
  nonSingletonCards?: string[];
  legalIssues?: {
    size?: string | null;
    commander?: string | null;
    commanderType?: string | null;
    colorIdentity?: string | null;
    singleton?: string | null;
    illegalCards?: string | null;
  };
  error?: string;
  deckSize?: number;
  requiredSize?: number;
}

export default function DeckLegalityChecker() {
  const [deckUrl, setDeckUrl] = useState<string>("");
  const [legalityStatus, setLegalityStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LegalityResult | null>(null);
  const [commander, setCommander] = useState<string | null>(null);
  const [colorIdentity, setColorIdentity] = useState<string[]>([]);

  async function checkDeckLegality() {
    // Input validation
    const trimmedDeckUrl = deckUrl.trim();
    if (!trimmedDeckUrl) {
      setLegalityStatus("Please enter a valid deck URL");
      return;
    }

    // Clear all previous state
    setLoading(true);
    setLegalityStatus("Checking deck legality...");
    setResult(null);
    setCommander(null);
    setColorIdentity([]);

    try {
      // Extract deck ID from URL if it's a Moxfield URL
      let deckId = trimmedDeckUrl;
      if (trimmedDeckUrl.includes("moxfield.com")) {
        const urlParts = trimmedDeckUrl.split("/");
        // Get the last non-empty segment
        for (let i = urlParts.length - 1; i >= 0; i--) {
          if (urlParts[i]) {
            deckId = urlParts[i];
            break;
          }
        }
      }

      // Fetch deck and check legality in parallel where possible
      const decklistPromise = fetchDecklist(deckId);

      // Wait for the decklist to be fetched
      const decklist = await decklistPromise;

      // Check legality once we have the deck
      const legalityResult = await checkPHLLegality(decklist);

      // Update UI with results
      setResult(legalityResult);
      setCommander(legalityResult.commander);
      setColorIdentity(legalityResult.colorIdentity || []);

      if (legalityResult.legal) {
        setLegalityStatus("✅ Deck is legal for PHL!");
      } else {
        setLegalityStatus("❌ Deck is not legal for PHL");
      }
    } catch (error: unknown) {
      console.error("Error checking deck legality:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      setLegalityStatus(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDecklist(deckId: string): Promise<Decklist> {
    // Fetch deck from API with a timeout and retry logic
    const controller = new AbortController();
    let timeoutId: number | undefined;
    const maxRetries = 2;
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        // Increase timeout with each retry
        const timeoutMs = 15000 + (retries * 5000);

        // Clear any existing timeout
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Fetch deck data with proper error handling
        const response = await fetch(
          `/api/fetch-deck?id=${encodeURIComponent(deckId)}`,
          {
            signal: controller.signal,
            // Add HTTP/2 optimizations
            cache: "default", // Use browser's standard cache behavior
            keepalive: true, // Keep connection alive for better performance
          },
        );

        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        timeoutId = undefined;

        // Handle error responses from the API
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));

          // Special handling for rate limit errors
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After") ||
              data.retryAfter || "60";
            const seconds = parseInt(retryAfter, 10);

            if (retries < maxRetries) {
              retries++;
              // Use the retry-after value or exponential backoff
              const waitTime = seconds * 1000 || Math.pow(2, retries) * 1000;
              await new Promise((resolve) => setTimeout(resolve, waitTime));
              continue;
            }

            throw new Error(
              `Rate limit exceeded. Please try again in ${seconds} second${
                seconds !== 1 ? "s" : ""
              }.`,
            );
          }

          throw new Error(
            data.error || `Failed to fetch decklist (${response.status})`,
          );
        }

        // Parse the JSON response
        return await response.json();
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        timeoutId = undefined;

        if (error instanceof Error) {
          if (
            error.name === "AbortError" ||
            error.name === "TypeError" ||
            error.message.includes("network")
          ) {
            retries++;
            if (retries <= maxRetries) {
              // Exponential backoff
              const backoffTime = 1000 * Math.pow(2, retries);
              await new Promise((resolve) => setTimeout(resolve, backoffTime));
              continue;
            }

            throw new Error(
              "Request timeout or network error - the server took too long to respond",
            );
          }
        }
        throw error;
      }
    }

    // This should never be reached due to the error handling above
    throw new Error("Failed to fetch deck after multiple attempts");
  }

  async function checkPHLLegality(decklist: Decklist): Promise<LegalityResult> {
    // Call our API endpoint to check legality with improved timeout and retry logic
    const controller = new AbortController();
    let timeoutId: number | undefined;
    const maxRetries = 2;
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        // Increase timeout with each retry
        const timeoutMs = 15000 + (retries * 5000);

        // Clear any existing timeout
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Send request to check legality with HTTP/2 optimizations
        const response = await fetch("/api/check-legality", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(decklist),
          signal: controller.signal,
          // HTTP/2 optimizations
          keepalive: true, // Keep connection alive for better performance
        });

        // Clear timeout since we got a response
        clearTimeout(timeoutId);
        timeoutId = undefined;

        // Handle API errors
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));

          // Special handling for rate limit errors
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After") ||
              data.retryAfter || "60";
            const seconds = parseInt(retryAfter, 10);

            if (retries < maxRetries) {
              retries++;
              // Use the retry-after value or exponential backoff
              const waitTime = seconds * 1000 || Math.pow(2, retries) * 1000;
              await new Promise((resolve) => setTimeout(resolve, waitTime));
              continue;
            }

            throw new Error(
              `Rate limit exceeded. Please try again in ${seconds} second${
                seconds !== 1 ? "s" : ""
              }.`,
            );
          }

          throw new Error(
            data.error || `Failed to check deck legality (${response.status})`,
          );
        }

        // Parse and return the result
        return await response.json();
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        timeoutId = undefined;

        if (error instanceof Error) {
          if (
            error.name === "AbortError" ||
            error.name === "TypeError" ||
            error.message.includes("network")
          ) {
            retries++;
            if (retries <= maxRetries) {
              // Exponential backoff
              const backoffTime = 1000 * Math.pow(2, retries);
              await new Promise((resolve) => setTimeout(resolve, backoffTime));
              continue;
            }

            throw new Error(
              "Request timeout - the legality check took too long",
            );
          }
        }
        throw error;
      }
    }

    // This should never be reached due to the error handling above
    throw new Error("Failed to check deck legality after multiple attempts");
  }

  // Helper function to get legality issues from result
  function getLegalityIssues(): string[] {
    if (!result || !result.legalIssues) return [];

    const issues: string[] = [];
    const { legalIssues } = result;

    if (legalIssues.size) issues.push(legalIssues.size);
    if (legalIssues.commander) issues.push(legalIssues.commander);
    if (legalIssues.commanderType) issues.push(legalIssues.commanderType);
    if (legalIssues.colorIdentity) issues.push(legalIssues.colorIdentity);
    if (legalIssues.singleton) issues.push(legalIssues.singleton);
    if (legalIssues.illegalCards) issues.push(legalIssues.illegalCards);

    return issues;
  }

  return (
    <div class="w-full max-w-2xl mx-auto">
      <div class="bg-white rounded-lg shadow-sm p-8 mb-8">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="deck-url" class="text-lg font-semibold text-gray-700">
              Enter Moxfield Deck URL:
            </label>
            <input
              id="deck-url"
              type="text"
              value={deckUrl}
              onInput={(e) => setDeckUrl((e.target as HTMLInputElement).value)}
              class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              placeholder="https://www.moxfield.com/decks/example"
              disabled={loading}
            />
          </div>

          <Button
            onClick={checkDeckLegality}
            disabled={loading}
            class="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? "Checking..." : "Check Deck Legality"}
          </Button>
        </div>
      </div>

      {legalityStatus && (
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Status Header */}
          <div class={`p-6 ${result?.legal ? "bg-green-50" : "bg-red-50"}`}>
            <p
              class={`text-2xl font-bold ${
                result?.legal ? "text-green-700" : "text-red-700"
              }`}
            >
              {legalityStatus}
            </p>
          </div>

          {/* Deck Info */}
          {commander && (
            <div class="border-t border-gray-100 p-6">
              <h3 class="text-xl font-semibold text-gray-800 mb-4">
                Deck Information
              </h3>
              <div class="flex flex-col md:flex-row gap-6">
                {result?.commanderImageUris?.normal && (
                  <div class="flex-shrink-0">
                    <img
                      src={result.commanderImageUris.normal}
                      alt={commander}
                      class="rounded-lg shadow-lg w-full md:w-64"
                      width={265}
                      height={370}
                      loading="lazy"
                    />
                  </div>
                )}
                <div class="space-y-2">
                  <p>
                    <span class="font-medium text-gray-700">Commander:</span>
                    {" "}
                    <span class="text-gray-900">{commander}</span>
                  </p>
                  <p>
                    <span class="font-medium text-gray-700">
                      Color Identity:
                    </span>{" "}
                    <span class="text-gray-900">
                      {colorIdentity.join(", ")}
                    </span>
                  </p>
                  {result?.deckSize != null && (
                    <p>
                      <span class="font-medium text-gray-700">Deck Size:</span>
                      {" "}
                      <span class="text-gray-900">
                        {result.deckSize} cards (Required:{" "}
                        {result.requiredSize})
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Legality Issues */}
          {result && !result.legal && (
            <div class="border-t border-gray-100 p-6 bg-red-50">
              <h3 class="text-xl font-semibold text-red-700 mb-3">
                Legality Issues
              </h3>
              <ul class="space-y-2">
                {getLegalityIssues().map((issue, index) => (
                  <li key={index} class="text-red-600 flex items-start">
                    <span class="mr-2">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Issues */}
          {result && (
            <div class="border-t border-gray-100 p-6">
              <div class="space-y-6">
                {result.colorIdentityViolations &&
                  result.colorIdentityViolations.length > 0 && (
                  <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">
                      Color Identity Violations ({result.colorIdentityViolations
                        .length})
                    </h3>
                    <ul class="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {result.colorIdentityViolations.map((card) => (
                        <li key={card} class="text-red-600 flex items-start">
                          <span class="mr-2">•</span>
                          <span>{card}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.nonSingletonCards &&
                  result.nonSingletonCards.length > 0 && (
                  <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">
                      Non-Singleton Cards ({result.nonSingletonCards.length})
                    </h3>
                    <ul class="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {result.nonSingletonCards.map((card) => (
                        <li key={card} class="text-red-600 flex items-start">
                          <span class="mr-2">•</span>
                          <span>{card}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.illegalCards && result.illegalCards.length > 0 && (
                  <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">
                      Illegal Cards ({result.illegalCards.length})
                    </h3>
                    <ul class="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {result.illegalCards.map((card) => (
                        <li key={card} class="text-red-600 flex items-start">
                          <span class="mr-2">•</span>
                          <span>{card}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
