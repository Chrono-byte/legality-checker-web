import { useState } from "preact/hooks";
import DeckHeader from "../components/DeckHeader.tsx";
import DeckMetrics from "../components/DeckMetrics.tsx";
import DetailedIssues from "../components/DetailedIssues.tsx";
import DeckInput from "../components/DeckInput.tsx";
import CommanderInfo from "../components/CommanderInfo.tsx";

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

interface CommanderBracketResult {
  minimumBracket: number;
  recommendedBracket: number;
  details: {
    minimumBracketReason: string;
    recommendedBracketReason: string;
    bracketRequirementsFailed: string[];
  };
  massLandDenial: string[];
  extraTurns: string[];
  tutors: string[];
  gameChangers: string[];
  twoCardCombos: Array<{ cards: string[]; isEarlyGame: boolean }>;
}

export default function DeckLegalityChecker() {
  const [deckUrl, setDeckUrl] = useState<string>("");
  const [legalityStatus, setLegalityStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LegalityResult | null>(null);
  const [commander, setCommander] = useState<string | null>(null);
  const [colorIdentity, setColorIdentity] = useState<string[]>([]);
  const [bracketResult, setBracketResult] = useState<
    CommanderBracketResult | null
  >(null);
  const [loadingBracket, setLoadingBracket] = useState<boolean>(false);

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

        // For legal decks, check the commander bracket
        try {
          setLoadingBracket(true);
          const bracketData = await checkCommanderBracket(
            decklist.mainDeck,
            decklist.commander,
          );
          // Update the bracket result state

          setBracketResult(bracketData);
        } catch (error) {
          console.error("Error checking commander bracket:", error);
          // Don't show error to user, just silently fail as this is supplementary info
        } finally {
          setLoadingBracket(false);
        }
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

  async function checkCommanderBracket(
    mainDeck: Card[],
    _commander: Card, // Not used but required by function signature
  ): Promise<CommanderBracketResult> {
    // Create a list of card names from the mainDeck
    const cardNames = mainDeck.flatMap((card) =>
      Array(card.quantity).fill(card.name)
    );

    // Call our API endpoint to check commander bracket
    const controller = new AbortController();
    let timeoutId: number | undefined;

    try {
      // Set timeout
      timeoutId = setTimeout(() => controller.abort(), 15000);

      // Format the deck list as a string (one card per line)
      const deckListStr = cardNames.join("\n");

      // We only need the path since we're on the same origin
      const url = `/api/commander-bracket?deckList=${
        encodeURIComponent(deckListStr)
      }`;

      // Send request to check bracket
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        signal: controller.signal,
      });

      // Clear timeout since we got a response
      clearTimeout(timeoutId);
      timeoutId = undefined;

      // Handle API errors
      if (!response.ok) {
        throw new Error(
          `Failed to check commander bracket (${response.status})`,
        );
      }

      // Parse and return the result
      return await response.json();
    } catch (error: unknown) {
      if (timeoutId) clearTimeout(timeoutId);

      console.error("Error checking commander bracket:", error);
      throw error;
    }
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
    <div class="w-full max-w-4xl mx-auto">
      <DeckInput
        deckUrl={deckUrl}
        loading={loading}
        onUrlChange={setDeckUrl}
        onSubmit={checkDeckLegality}
      />

      {legalityStatus && (
        <div class="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          <DeckHeader
            commander={commander}
            deckSize={result?.deckSize}
            isLegal={result?.legal}
          />

          {result && (
            <DeckMetrics
              isLegal={result.legal}
              colorIdentity={colorIdentity}
              deckSize={result.deckSize}
              requiredSize={result.requiredSize}
            />
          )}

          {commander && result && (
            <CommanderInfo
              commander={commander}
              imageUri={result.commanderImageUris?.normal}
              isLegal={result.legal}
              legalityIssues={getLegalityIssues()}
              bracketResult={bracketResult}
              loadingBracket={loadingBracket}
            />
          )}

          {result && (
            <DetailedIssues
              colorIdentityViolations={result.colorIdentityViolations}
              nonSingletonCards={result.nonSingletonCards}
              illegalCards={result.illegalCards}
            />
          )}
        </div>
      )}
    </div>
  );
}
