import { FreshContext } from "$fresh/server.ts";
import { IScryfallCard } from "npm:scryfall-types";
import CardManager from "../../load-data/CardManager.ts";

// Types
interface Card {
  quantity: number;
  name: string;
}

interface DeckLegalityRequest {
  cards: Card[];
  commander: Card;
}

interface LegalityChecks {
  size: boolean;
  commander: boolean;
  colorIdentity: boolean;
  singleton: boolean;
  illegalCards: boolean;
}

interface LegalityResponse {
  legal: boolean;
  commander: string;
  colorIdentity: string[];
  deckSize: number;
  requiredSize: number;
  illegalCards: string[];
  colorIdentityViolations: string[];
  nonSingletonCards: string[];
  legalIssues: {
    size: string | null;
    commander: string | null;
    commanderType: string | null;
    colorIdentity: string | null;
    singleton: string | null;
    illegalCards: string | null;
  };
  error?: string;
}

// Constants
const JSON_HEADERS = {
  "Content-Type": "application/json",
};

const BASIC_LANDS = new Set([
  "Plains",
  "Island",
  "Swamp",
  "Mountain",
  "Forest",
  "Wastes",
]);

// Helper functions
const createError = (message: string, status = 400) => new Response(
  JSON.stringify({ error: message }),
  { status, headers: JSON_HEADERS },
);

const checkCommander = (commander: Card, commanderData: IScryfallCard | null): Response | null => {
  if (!commanderData) {
    return new Response(
      JSON.stringify({
        legal: false,
        commander: commander.name,
        error: "Commander not found in database",
      }),
      { headers: JSON_HEADERS },
    );
  }

  if (!commanderData.type_line.toLowerCase().includes("creature")) {
    return new Response(
      JSON.stringify({
        legal: false,
        commander: commander.name,
        error: "Commander must be a creature",
        legalIssues: { commanderType: "Commander must be a creature" },
      }),
      { headers: JSON_HEADERS },
    );
  }

  if (!commanderData.type_line.toLowerCase().includes("legendary")) {
    return new Response(
      JSON.stringify({
        legal: false,
        commander: commander.name,
        error: "Commander must be legendary",
        legalIssues: { commanderType: "Commander must be legendary" },
      }),
      { headers: JSON_HEADERS },
    );
  }

  return null;
};

// Initialize card manager
const cardManager = new CardManager();

export const handler = async (
  req: Request,
  _ctx: FreshContext,
): Promise<Response> => {
  // Skip during build
  const { isBuildMode } = await import("../../utils/is-build.ts");
  if (isBuildMode()) {
    return new Response(
      JSON.stringify({ error: "Service unavailable during build" }),
      { status: 503, headers: JSON_HEADERS },
    );
  };
  try {
    // Validate request method
    if (req.method !== "POST") {
      return createError("Method not allowed", 405);
    }

    // Parse request body with timeout handling
    let body: DeckLegalityRequest;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const clonedReq = req.clone();
      body = await clonedReq.json();
      clearTimeout(timeoutId);
    } catch (parseError) {
      return createError(`Failed to parse request body: ${String(parseError)}`);
    }

    // Validate request data
    const { cards, commander } = body;
    if (!cards?.length || !commander) {
      return createError("Invalid deck data");
    }

    // Validate commander and cache it
    const commanderData = cardManager.fetchCard(commander.name);
    const commanderError = checkCommander(commander, commanderData);
    if (commanderError) return commanderError;
    
    // We can now safely assert commanderData is not null since checkCommander would have returned
    const validCommanderData = commanderData as IScryfallCard;

    // Get deck legality information
    const [_legalCards, illegalCards] = cardManager.testDecklist(cards, commander);

    // Calculate total cards
    const cardQuantities = cards.reduce((total, card) => total + card.quantity, 0);
    const totalCards = cardQuantities + commander.quantity;

    // Initialize legality checks
    const legalChecks: LegalityChecks = {
      size: totalCards === 100,
      commander: validCommanderData.legalities.pioneer === "legal",
      colorIdentity: true,
      singleton: true,
      illegalCards: illegalCards.length === 0,
    };

    // Check singleton rule violations
    const nonSingletonCards = new Set<string>();
    const cardCounts = new Map<string, number>();

    for (const card of cards) {
      if (!BASIC_LANDS.has(card.name) && !cardManager.singletonExceptions.includes(card.name)) {
        const count = (cardCounts.get(card.name) || 0) + card.quantity;
        cardCounts.set(card.name, count);
        if (count > 1) {
          legalChecks.singleton = false;
          nonSingletonCards.add(card.name);
        }
      }
    }

    // Check color identity violations
    const colorIdentity = new Set(validCommanderData.color_identity);
    const colorIdentityViolations = new Set<string>();
    const cardDataCache = new Map<string, IScryfallCard>();

    for (const card of cards) {
      let cardData = cardDataCache.get(card.name);
      if (!cardData) {
        const fetchedCard = cardManager.fetchCard(card.name);
        if (fetchedCard !== null) {
          cardDataCache.set(card.name, fetchedCard);
          cardData = fetchedCard;
        } else {
          cardData = undefined;
        }
      }

      if (cardData && !cardData.color_identity.every(color => colorIdentity.has(color))) {
        legalChecks.colorIdentity = false;
        colorIdentityViolations.add(card.name);
      }
    }

    // Determine overall legality
    const isLegal = Object.values(legalChecks).every(check => check);

    // Construct response
    const response: LegalityResponse = {
      legal: isLegal,
      commander: commander.name,
      colorIdentity: Array.from(colorIdentity),
      deckSize: totalCards,
      requiredSize: 100,
      illegalCards,
      colorIdentityViolations: Array.from(colorIdentityViolations),
      nonSingletonCards: Array.from(nonSingletonCards),
      legalIssues: {
        size: !legalChecks.size 
          ? `Deck size incorrect: has ${totalCards} cards, needs 100` 
          : null,
        commander: !legalChecks.commander
          ? "Commander not legal in Pioneer"
          : null,
        commanderType: null,
        colorIdentity: !legalChecks.colorIdentity
          ? "Cards outside commander's color identity"
          : null,
        singleton: !legalChecks.singleton
          ? "Deck contains multiple copies of non-basic land cards that aren't allowed to break the singleton rule"
          : null,
        illegalCards: !legalChecks.illegalCards
          ? "Deck contains cards that aren't legal in the format"
          : null,
      },
    };

    return new Response(
      JSON.stringify(response),
      { headers: JSON_HEADERS },
    );
  } catch (error: unknown) {
    console.error("Error checking deck legality:", error);
    return createError(error instanceof Error ? error.message : String(error), 500);
  }
};
