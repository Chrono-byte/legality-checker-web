import { useSignal } from "@preact/signals";
import DeckHeader from "../components/DeckHeader.tsx";
import DeckMetrics from "../components/DeckMetrics.tsx";
import DetailedIssues from "../components/DetailedIssues.tsx";
import DeckInput from "../components/DeckInput.tsx";
import CommanderInfo from "../components/CommanderInfo.tsx";
import { DeckService, DeckServiceError } from "../utils/deck-service.ts";
import type { LegalityResult } from "../types/components.ts";

export default function DeckLegalityChecker() {
  const deckService = DeckService.getInstance();
  const deckUrl = useSignal("");
  const legalityStatus = useSignal<string | null>(null);
  const loading = useSignal({
    fetchingDeck: false,
    checkingLegality: false,
  });
  const retryCount = useSignal(0);
  const result = useSignal<LegalityResult | null>(null);
  const commander = useSignal<string | null>(null);
  const colorIdentity = useSignal<string[]>([]);

  const isLoading = () =>
    loading.value.fetchingDeck || loading.value.checkingLegality;
  const MAX_RETRIES = 3;

  const onCheckDeckLegality = async () => {
    const trimmedDeckUrl = deckUrl.value.trim();
    if (!trimmedDeckUrl) {
      legalityStatus.value = "Please enter a valid deck URL";
      return;
    }

    loading.value = { fetchingDeck: true, checkingLegality: false };
    legalityStatus.value = "Fetching deck...";
    result.value = null;
    commander.value = null;
    colorIdentity.value = [];

    try {
      const deckId = deckService.extractDeckIdFromUrl(trimmedDeckUrl);
      const decklist = await deckService.fetchDecklist(deckId);

      loading.value = { fetchingDeck: false, checkingLegality: true };
      legalityStatus.value = "Checking deck legality...";

      const validation = deckService.validateDecklist(decklist);
      if (!validation.isValid) {
        throw new DeckServiceError(
          "Invalid deck format",
          new Error(validation.errors.map((e) => e.message).join(", ")),
        );
      }

      const legalityResult = await deckService.checkLegality(decklist);
      result.value = legalityResult;
      commander.value = legalityResult.commander;
      colorIdentity.value = legalityResult.colorIdentity || [];
      retryCount.value = 0;

      legalityStatus.value = legalityResult.legal
        ? "✅ Deck is legal for PHL!"
        : "❌ Deck is not legal for PHL";
    } catch (error) {
      console.error("Error checking deck legality:", error);
      let errorMessage = "An unknown error occurred";
      let shouldRetry = true;

      if (error instanceof DeckServiceError) {
        errorMessage = error.message;
        if (error.cause) {
          if (error.cause.message.includes("Rate limit")) {
            errorMessage = `Rate limit exceeded. ${
              retryCount.value < MAX_RETRIES
                ? "Retrying in 5 seconds..."
                : "Please try again later."
            }`;
            if (retryCount.value < MAX_RETRIES) {
              setTimeout(() => retryCheck(), 5000);
            }
          } else {
            errorMessage += ` (${error.cause.message})`;
          }
        }
        shouldRetry = !error.message.includes("Invalid deck format");
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      legalityStatus.value = `Error: ${errorMessage}${
        shouldRetry && retryCount.value < MAX_RETRIES ? "\nRetrying..." : ""
      }`;
    } finally {
      loading.value = { fetchingDeck: false, checkingLegality: false };
    }
  };

  const retryCheck = () => {
    if (retryCount.value < MAX_RETRIES) {
      retryCount.value++;
      onCheckDeckLegality();
    }
  };

  const getLegalityIssues = () => {
    if (!result.value || !result.value.legalIssues) return [];
    const issues = [];
    const { legalIssues } = result.value;

    if (legalIssues.size) issues.push(legalIssues.size);
    if (legalIssues.commander) issues.push(legalIssues.commander);
    if (legalIssues.commanderType) issues.push(legalIssues.commanderType);
    if (legalIssues.colorIdentity) issues.push(legalIssues.colorIdentity);
    if (legalIssues.singleton) issues.push(legalIssues.singleton);
    if (legalIssues.illegalCards) issues.push(legalIssues.illegalCards);

    return issues.filter((issue) => issue !== null);
  };

  return (
    <div class="w-full max-w-4xl mx-auto">
      <DeckInput
        deckUrl={deckUrl.value}
        loading={isLoading()}
        onUrlChange={(newUrl: string) => deckUrl.value = newUrl}
        onSubmit={onCheckDeckLegality}
      />

      {legalityStatus.value && (
        <div class="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          {loading.value.fetchingDeck && (
            <div class="p-4 bg-blue-50 border-b border-blue-100">
              <p class="text-blue-700 flex items-center">
                <span class="mr-2">🔄</span>
                Fetching deck details...
              </p>
            </div>
          )}

          {loading.value.checkingLegality && (
            <div class="p-4 bg-blue-50 border-b border-blue-100">
              <p class="text-blue-700 flex items-center">
                <span class="mr-2">⚖️</span>
                Checking deck legality...
              </p>
            </div>
          )}

          {!isLoading() && legalityStatus.value.startsWith("Error") && (
            <div class="p-4 bg-red-50 border-b border-red-100">
              <p class="text-red-700 whitespace-pre-line">
                {legalityStatus.value}
              </p>
              {retryCount.value < MAX_RETRIES &&
                !legalityStatus.value.includes("Invalid deck format") && (
                <button
                  type="button"
                  onClick={retryCheck}
                  class="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Retry Check
                </button>
              )}
            </div>
          )}

          <DeckHeader
            commander={commander.value}
            deckSize={result.value?.deckSize}
            isLegal={result.value?.legal}
          />

          {result.value && (
            <DeckMetrics
              isLegal={result.value.legal}
              colorIdentity={colorIdentity.value}
              deckSize={result.value.deckSize}
              requiredSize={result.value.requiredSize}
            />
          )}

          {commander.value && result.value && (
            <CommanderInfo
              commander={commander.value}
              imageUri={result.value.commanderImageUris?.normal}
              isLegal={result.value.legal}
              legalityIssues={getLegalityIssues()}
            />
          )}

          {result.value && (
            <DetailedIssues
              colorIdentityViolations={result.value.colorIdentityViolations}
              nonSingletonCards={result.value.nonSingletonCards}
              illegalCards={result.value.illegalCards}
            />
          )}
        </div>
      )}
    </div>
  );
}
