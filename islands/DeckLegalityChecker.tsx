import { useState } from "preact/hooks";
import DeckHeader from "../components/DeckHeader.tsx";
import DeckMetrics from "../components/DeckMetrics.tsx";
import DetailedIssues from "../components/DetailedIssues.tsx";
import DeckInput from "../components/DeckInput.tsx";
import CommanderInfo from "../components/CommanderInfo.tsx";
import { DeckService, DeckServiceError } from "../utils/deck-service.ts";
import type { LegalityResult } from "../types/components.ts";

export default function DeckLegalityChecker() {
  const [deckService] = useState(() => DeckService.getInstance());
  const [deckUrl, setDeckUrl] = useState<string>("");
  const [legalityStatus, setLegalityStatus] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<{
    fetchingDeck: boolean;
    checkingLegality: boolean;
  }>({
    fetchingDeck: false,
    checkingLegality: false,
  });
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<LegalityResult | null>(null);
  const [commander, setCommander] = useState<string | null>(null);
  const [colorIdentity, setColorIdentity] = useState<string[]>([]);

  const loading = loadingStates.fetchingDeck || loadingStates.checkingLegality;
  const MAX_RETRIES = 3;

  const setLoading = (state: keyof typeof loadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [state]: value }));
  };

  const onRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(count => count + 1);
      onCheckDeckLegality();
    }
  };

  const onCheckDeckLegality = async () => {
    // Input validation
    const trimmedDeckUrl = deckUrl.trim();
    if (!trimmedDeckUrl) {
      setLegalityStatus("Please enter a valid deck URL");
      return;
    }

    // Clear all previous state
    setLoadingStates({ fetchingDeck: true, checkingLegality: false });
    setLegalityStatus("Fetching deck...");
    setResult(null);
    setCommander(null);
    setColorIdentity([]);

    try {
      // Extract deck ID from URL
      const deckId = deckService.extractDeckIdFromUrl(trimmedDeckUrl);

      // Fetch deck
      const decklist = await deckService.fetchDecklist(deckId);
      setLoading("fetchingDeck", false);
      setLoading("checkingLegality", true);
      setLegalityStatus("Checking deck legality...");

      // Validate the decklist
      const validation = deckService.validateDecklist(decklist);
      if (!validation.isValid) {
        throw new DeckServiceError(
          "Invalid deck format",
          new Error(validation.errors.map(e => e.message).join(", "))
        );
      }

      // Check legality
      const legalityResult = await deckService.checkLegality(decklist);

      // Update UI with results
      setResult(legalityResult);
      setCommander(legalityResult.commander);
      setColorIdentity(legalityResult.colorIdentity || []);
      setRetryCount(0); // Reset retry count on success

      if (legalityResult.legal) {
        setLegalityStatus("✅ Deck is legal for PHL!");
      } else {
        setLegalityStatus("❌ Deck is not legal for PHL");
      }
    } catch (error: unknown) {
      console.error("Error checking deck legality:", error);
      let errorMessage = "An unknown error occurred";
      let canRetry = true;

      if (error instanceof DeckServiceError) {
        errorMessage = error.message;
        if (error.cause) {
          if (error.cause.message.includes("Rate limit")) {
            errorMessage = `Rate limit exceeded. ${
              retryCount < MAX_RETRIES 
                ? "Retrying in 5 seconds..." 
                : "Please try again later."
            }`;
            if (retryCount < MAX_RETRIES) {
              setTimeout(onRetry, 5000);
            }
          } else {
            errorMessage += ` (${error.cause.message})`;
          }
        }
        // Don't allow retries for validation errors
        canRetry = !error.message.includes("Invalid deck format");
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setLegalityStatus(
        `Error: ${errorMessage}${
          canRetry && retryCount < MAX_RETRIES 
            ? "\nRetrying..." 
            : ""
        }`
      );
    } finally {
      setLoadingStates({ fetchingDeck: false, checkingLegality: false });
    }
  };

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

    return issues.filter((issue): issue is string => issue !== null);
  }

  return (
    <div class="w-full max-w-4xl mx-auto">
      <DeckInput
        deckUrl={deckUrl}
        loading={loading}
        onUrlChange={setDeckUrl}
        onSubmit={onCheckDeckLegality}
      />

      {legalityStatus && (
        <div class="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          {loadingStates.fetchingDeck && (
            <div class="p-4 bg-blue-50 border-b border-blue-100">
              <p class="text-blue-700 flex items-center">
                <span class="mr-2">🔄</span>
                Fetching deck details...
              </p>
            </div>
          )}

          {loadingStates.checkingLegality && (
            <div class="p-4 bg-blue-50 border-b border-blue-100">
              <p class="text-blue-700 flex items-center">
                <span class="mr-2">⚖️</span>
                Checking deck legality...
              </p>
            </div>
          )}

          {!loading && legalityStatus.startsWith("Error") && (
            <div class="p-4 bg-red-50 border-b border-red-100">
              <p class="text-red-700 whitespace-pre-line">{legalityStatus}</p>
              {retryCount < MAX_RETRIES && !legalityStatus.includes("Invalid deck format") && (
                <button
                  type="button"
                  onClick={onRetry}
                  class="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Retry Check
                </button>
              )}
            </div>
          )}

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
