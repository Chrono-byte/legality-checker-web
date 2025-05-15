import { FreshContext } from "$fresh/server.ts";
import CardManager from "../../load-data/load-cards.ts";

// Define types for card and deck data
interface Card {
  quantity: number;
  name: string;
}

// Define deck building restrictions
const DECK_SIZE_REQUIREMENT = 100;

// Initialize card manager
const cardManager = new CardManager();

// Common response headers for consistent API responses
const JSON_HEADERS = {
  "Content-Type": "application/json"
};

export const handler = async (
  req: Request,
  _ctx: FreshContext,
): Promise<Response> => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: JSON_HEADERS,
      });
    }

    // Parse the request body with timeout handling
    let body;
    try {
      body = await req.json();
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      return new Response(JSON.stringify({ 
        error: `Failed to parse request body: ${errorMessage}` 
      }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }
    
    const { cards, commander } = body;

    if (!cards || !commander) {
      return new Response(JSON.stringify({ error: "Invalid deck data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get commander card data
    const commanderData = cardManager.fetchCard(commander.name);
    if (!commanderData) {
      return new Response(
        JSON.stringify({
          legal: false,
          commander: commander.name,
          error: "Commander not found in database",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check if commander is a creature
    if (!commanderData.type_line.toLowerCase().includes("creature")) {
      return new Response(
        JSON.stringify({
          legal: false,
          commander: commander.name,
          error: "Commander must be a creature",
          legalIssues: {
            commanderType: "Commander must be a creature",
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Test decklist for legality
    const [_legalCards, illegalCards] = cardManager.testDecklist(
      cards,
      commander,
    );

    // Total card quantities
    let cardQuantities = 0;
    cards.forEach((card: Card) => {
      cardQuantities += card.quantity;
    });

    // Check basic legality conditions
    const legalChecks = {
      size: cardQuantities + commander.quantity === DECK_SIZE_REQUIREMENT,
      commander: commanderData.legalities.pioneer === "legal",
      colorIdentity: true, // Start as true and check below
      singleton: true, // Start as true and check below
      legality: illegalCards.length === 0, // Are all cards legal in format
    };

    // Check cards that violate singleton format
    const cardCounts: Record<string, number> = {};
    const basicLandNames = [
      "Plains",
      "Island",
      "Swamp",
      "Mountain",
      "Forest",
      "Wastes",
    ];
    const nonSingletonCards: string[] = [];

    // Check for duplicate cards (except basic lands and singleton exceptions)
    cards.forEach((card: Card) => {
      // Skip basic lands for singleton check
      if (basicLandNames.includes(card.name)) {
        return;
      }

      // Skip singleton exceptions
      if (cardManager.isAllowedToBreakSingletonRule(card.name)) {
        return;
      }

      if (!cardCounts[card.name]) {
        cardCounts[card.name] = 0;
      }
      cardCounts[card.name] += card.quantity;

      // Check if any card has more than MAX_CARDS_PER_CARD
      if (cardCounts[card.name] > 1) {
        legalChecks.singleton = false;
        nonSingletonCards.push(card.name);
      }
    });

    // Check color identity
    const colorIdentity = commanderData.color_identity;
    const colorIdentityViolations: string[] = [];

    cards.forEach((card: Card) => {
      const cardData = cardManager.fetchCard(card.name);
      if (cardData) {
        if (
          !cardData.color_identity.every((color) =>
            colorIdentity.includes(color)
          )
        ) {
          legalChecks.colorIdentity = false;
          colorIdentityViolations.push(card.name);
        }
      }
    });

    // Check if any cards are marked as reserved list
    const reservedListCards: string[] = [];
    cards.forEach((card: Card) => {
      const cardData = cardManager.fetchCard(card.name);
      if (cardData && cardData.reserved) {
        reservedListCards.push(card.name);
      }
    });

    // Determine overall legality
    const isLegal = legalChecks.size &&
      legalChecks.commander &&
      legalChecks.colorIdentity &&
      legalChecks.singleton &&
      illegalCards.length === 0;

    return new Response(
      JSON.stringify({
        legal: isLegal,
        commander: commander.name,
        colorIdentity: commanderData.color_identity,
        deckSize: cardQuantities + commander.quantity,
        requiredSize: DECK_SIZE_REQUIREMENT,
        illegalCards: illegalCards,
        colorIdentityViolations: colorIdentityViolations,
        nonSingletonCards: nonSingletonCards,
        reservedListCards: reservedListCards,
        legalIssues: {
          size: !legalChecks.size
            ? `Deck size incorrect: has ${
              cardQuantities + commander.quantity
            } cards, needs ${DECK_SIZE_REQUIREMENT}`
            : null,
          commander: !legalChecks.commander
            ? "Commander not legal in Pioneer"
            : null,
          colorIdentity: !legalChecks.colorIdentity
            ? "Cards outside commander's color identity"
            : null,
          singleton: !legalChecks.singleton
            ? "Deck contains multiple copies of non-basic land cards that aren't allowed to break the singleton rule"
            : null,
          illegalCards: illegalCards.length > 0
            ? "Deck contains cards that aren't legal in the format"
            : null,
          reservedList: reservedListCards.length > 0
            ? "Deck contains cards from the Reserved List"
            : null,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error checking deck legality:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
