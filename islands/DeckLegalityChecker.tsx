import { Button } from "../components/Button.tsx";
import { useState } from "preact/hooks";

// Define the Card interface for our decklist structure
interface Card {
  quantity: number;
  name: string;
}

// Define the Decklist interface
interface Decklist {
  cards: Card[];
  commander: Card;
}

interface LegalityResult {
  legal: boolean;
  commander: string;
  colorIdentity?: string[];
  illegalCards?: string[];
  colorIdentityViolations?: string[];
  nonSingletonCards?: string[];
  singletonExceptionCardsUsed?: string[];
  reservedListCards?: string[];
  legalIssues?: {
    size?: string | null;
    commander?: string | null;
    commanderType?: string | null;
    colorIdentity?: string | null;
    singleton?: string | null;
    illegalCards?: string | null;
    reservedList?: string | null;
  };
  error?: string;
  deckSize?: number;
  requiredSize?: number;
}

interface DeckCheckerProps {
  initialDecklist?: Decklist;
}

export default function DeckLegalityChecker(_props: DeckCheckerProps) {
  const [deckUrl, setDeckUrl] = useState<string>("");
  const [legalityStatus, setLegalityStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LegalityResult | null>(null);
  const [commander, setCommander] = useState<string | null>(null);
  const [colorIdentity, setColorIdentity] = useState<string[]>([]);

  async function checkDeckLegality() {
    if (!deckUrl.trim()) {
      setLegalityStatus("Please enter a valid deck URL");
      return;
    }

    setLoading(true);
    setLegalityStatus("Checking deck legality...");
    setResult(null);

    try {
      // Extract deck ID from URL if it's a Moxfield URL
      let deckId = deckUrl;
      if (deckUrl.includes("moxfield.com")) {
        const urlParts = deckUrl.split("/");
        deckId = urlParts[urlParts.length - 1];
      }

      const decklist = await fetchDecklist(deckId);
      const legalityResult = await checkPHLLegality(decklist);
      
      setResult(legalityResult);
      setCommander(legalityResult.commander);
      setColorIdentity(legalityResult.colorIdentity || []);
      
      if (legalityResult.legal) {
        setLegalityStatus("✅ Deck is legal for PHL!");
      } else {
        setLegalityStatus("❌ Deck is not legal for PHL");
      }
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLegalityStatus(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDecklist(deckId: string): Promise<Decklist> {
    // Fetch deck from Moxfield API
    const response = await fetch(`/api/fetch-deck?id=${encodeURIComponent(deckId)}`);

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to fetch decklist");
    }

    return await response.json();
  }

  async function checkPHLLegality(decklist: Decklist): Promise<LegalityResult> {
    // Call our API endpoint to check legality
    const response = await fetch("/api/check-legality", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(decklist),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to check deck legality");
    }

    return await response.json();
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
    if (legalIssues.reservedList) issues.push(legalIssues.reservedList);
    
    return issues;
  }

  return (
    <div class="flex flex-col gap-4 py-6 w-full max-w-lg">
      <h2 class="text-2xl font-bold">PHL Deck Legality Checker</h2>
      <div class="flex flex-col gap-2">
        <label for="deck-url" class="font-medium">
          Enter Moxfield Deck URL or ID:
        </label>
        <input
          id="deck-url"
          type="text"
          value={deckUrl}
          onInput={(e) => setDeckUrl((e.target as HTMLInputElement).value)}
          class="px-3 py-2 border border-gray-300 rounded-md"
          placeholder="https://www.moxfield.com/decks/example"
          disabled={loading}
        />
      </div>
      
      <Button 
        onClick={checkDeckLegality} 
        disabled={loading}
        class="mt-2"
      >
        {loading ? "Checking..." : "Check Deck Legality"}
      </Button>

      {legalityStatus && (
        <div class="mt-4 p-4 border rounded-md bg-gray-50">
          <p class="text-xl font-bold">{legalityStatus}</p>
          
          {commander && (
            <div class="mt-2">
              <p><strong>Commander:</strong> {commander}</p>
              <p><strong>Color Identity:</strong> {colorIdentity.join(", ")}</p>
              
              {result?.deckSize && (
                <p><strong>Deck Size:</strong> {result.deckSize} cards (Required: {result.requiredSize})</p>
              )}
            </div>
          )}
          
          {/* Display legality issues if not legal */}
          {result && !result.legal && (
            <div class="mt-4">
              <h3 class="font-bold">Legality Issues:</h3>
              <ul class="list-disc ml-6 mt-1">
                {getLegalityIssues().map((issue, index) => (
                  <li key={index} class="text-red-600">{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Show cards with color identity violations */}
          {result?.colorIdentityViolations && result.colorIdentityViolations.length > 0 && (
            <div class="mt-4">
              <h3 class="font-bold">Color Identity Violations ({result.colorIdentityViolations.length}):</h3>
              <ul class="list-disc ml-6 mt-1">
                {result.colorIdentityViolations.map((card) => (
                  <li key={card}>{card}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Show cards that violate singleton rule */}
          {result?.nonSingletonCards && result.nonSingletonCards.length > 0 && (
            <div class="mt-4">
              <h3 class="font-bold">Non-Singleton Cards ({result.nonSingletonCards.length}):</h3>
              <ul class="list-disc ml-6 mt-1">
                {result.nonSingletonCards.map((card) => (
                  <li key={card}>{card}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Show illegal cards */}
          {result?.illegalCards && result.illegalCards.length > 0 && (
            <div class="mt-4">
              <h3 class="font-bold">Illegal Cards ({result.illegalCards.length}):</h3>
              <ul class="list-disc ml-6 mt-1">
                {result.illegalCards.map((card) => (
                  <li key={card}>{card}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Show singleton exception cards used */}
          {result?.singletonExceptionCardsUsed && result.singletonExceptionCardsUsed.length > 0 && (
            <div class="mt-4">
              <h3 class="font-bold text-green-600">Singleton Exception Cards Used ({result.singletonExceptionCardsUsed.length}):</h3>
              <p class="text-sm text-gray-600 mb-1">These cards are allowed to have multiple copies in your deck.</p>
              <ul class="list-disc ml-6 mt-1">
                {result.singletonExceptionCardsUsed.map((card) => (
                  <li key={card} class="text-green-600">{card}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Show Reserved List cards if any */}
          {result?.reservedListCards && result.reservedListCards.length > 0 && (
            <div class="mt-4">
              <h3 class="font-bold">Reserved List Cards ({result.reservedListCards.length}):</h3>
              <ul class="list-disc ml-6 mt-1">
                {result.reservedListCards.map((card) => (
                  <li key={card}>{card}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
