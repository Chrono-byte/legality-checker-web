import { FreshContext } from "fresh";
import type { IScryfallCard } from "npm:scryfall-types";
import CardManager from "../../CardManager/CardManager.ts";

/** Represents a single card in a deck with its quantity */
interface Card {
  /** Number of copies of the card */
  quantity: number;
  /** Name of the card */
  name: string;
}

/** Request payload for deck legality check */
interface DeckLegalityRequest {
  /** Array of cards in the main deck */
  mainDeck: Card[];
  /** The commander card */
  commander: Card;
}

/** Individual format rule check results */
interface LegalityChecks {
  /** Whether the deck size is legal */
  size: boolean;
  /** Whether the commander is legal */
  commander: boolean;
  /** Whether all cards match the commander's color identity */
  colorIdentity: boolean;
  /** Whether the deck follows singleton rules */
  singleton: boolean;
  /** Whether all cards are legal in the format */
  illegalCards: boolean;
}

/** Response payload for deck legality check */
interface LegalityResponse {
  /** Overall legality of the deck */
  legal: boolean;
  /** Name of the commander */
  commander: string;
  /** The commander's Scryfall image URIs */
  commanderImageUris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    art_crop?: string;
    border_crop?: string;
  };
  /** Color identity of the deck */
  colorIdentity: string[];
  /** Total number of cards in the deck */
  deckSize: number;
  /** Required deck size for the format */
  requiredSize: number;
  /** Array of card names that are not legal in the format */
  illegalCards: string[];
  /** Array of card names that violate color identity rules */
  colorIdentityViolations: string[];
  /** Array of card names that violate singleton rules */
  nonSingletonCards: string[];
  /** Detailed explanation of legality issues */
  legalIssues: {
    /** Issue with deck size */
    size: string | null;
    /** Issue with commander legality */
    commander: string | null;
    /** Issue with commander type (legendary/creature) */
    commanderType: string | null;
    /** Issue with color identity */
    colorIdentity: string | null;
    /** Issue with singleton rule */
    singleton: string | null;
    /** Issue with illegal cards */
    illegalCards: string | null;
  };
  /** Error message if request processing failed */
  error?: string;
}

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

// Helper functions
const createError = (
  message: string,
  status = 400,
) => {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: SECURITY_HEADERS,
    },
  );
};

const BASIC_LANDS = new Set([
  "Plains",
  "Island",
  "Swamp",
  "Mountain",
  "Forest",
  "Wastes",
]);

// Validation constants
const VALIDATION_LIMITS = {
  MAX_CARD_NAME_LENGTH: 200,
  MAX_DECK_SIZE: 100,
  MIN_CARD_QUANTITY: 1,
  MAX_CARD_QUANTITY: 100,
  REQUEST_TIMEOUT_MS: 5000,
  MAX_MAINBOARD_CARDS: 100, // Reasonable limit for parsing
};

// Input validation functions
const sanitizeString = (str: string): string => {
  // Remove any non-alphanumeric, spaces, apostrophes, commas, hyphens, and slashes (for split cards)
  return str.replace(/[^a-zA-Z0-9\s',\-\/]/g, "").trim();
};

const validateCard = (card: Card): { valid: boolean; error?: string } => {
  if (!card || typeof card !== "object") {
    return { valid: false, error: "Invalid card format" };
  }

  if (typeof card.name !== "string" || !card.name) {
    return { valid: false, error: "Card name must be a non-empty string" };
  }

  if (card.name.length > VALIDATION_LIMITS.MAX_CARD_NAME_LENGTH) {
    return { valid: false, error: "Card name exceeds maximum length" };
  }

  if (!Number.isInteger(card.quantity)) {
    return { valid: false, error: "Card quantity must be an integer" };
  }

  if (
    card.quantity < VALIDATION_LIMITS.MIN_CARD_QUANTITY ||
    card.quantity > VALIDATION_LIMITS.MAX_CARD_QUANTITY
  ) {
    return {
      valid: false,
      error:
        `Card quantity must be between ${VALIDATION_LIMITS.MIN_CARD_QUANTITY} and ${VALIDATION_LIMITS.MAX_CARD_QUANTITY}`,
    };
  }

  // Sanitize the card name
  card.name = sanitizeString(card.name);

  return { valid: true };
};

const validateDeckInput = (
  body: unknown,
): { valid: boolean; error?: string; data?: DeckLegalityRequest } => {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request format" };
  }

  const data = body as DeckLegalityRequest;

  if (!Array.isArray(data.mainDeck)) {
    return { valid: false, error: "mainDeck must be an array" };
  }

  if (data.mainDeck.length > VALIDATION_LIMITS.MAX_MAINBOARD_CARDS) {
    return { valid: false, error: "mainDeck exceeds maximum allowed cards" };
  }

  // Validate commander
  const commanderValidation = validateCard(data.commander);
  if (!commanderValidation.valid) {
    return {
      valid: false,
      error: `Invalid commander: ${commanderValidation.error}`,
    };
  }

  // Validate each card in mainDeck
  for (const card of data.mainDeck) {
    const validation = validateCard(card);
    if (!validation.valid) {
      return {
        valid: false,
        error: `Invalid card in mainDeck: ${validation.error} (${card.name})`,
      };
    }
  }

  return { valid: true, data };
};

// Helper functions
const checkCommander = (
  commander: Card,
  commanderData: IScryfallCard | null,
): Response | null => {
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

export const handler = {
  async POST(ctx: FreshContext): Promise<Response> {
    try {
      // Skip during build and initialize utilities lazily, but allow tests to run
      const { isBuildMode } = await import("../../utils/is-build.ts");
      if (isBuildMode() && !Deno.env.get("DENO_TEST")) {
        return new Response(
          JSON.stringify({ error: "Service unavailable during build" }),
          { status: 503, headers: SECURITY_HEADERS },
        );
      }

      // Parse request body with timeout handling
      let body: DeckLegalityRequest;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const clonedReq = ctx.req.clone();
        body = await clonedReq.json();
        clearTimeout(timeoutId);
      } catch (parseError) {
        return createError(
          `Failed to parse request body: ${String(parseError)}`,
        );
      }

      // Validate request data
      const validation = validateDeckInput(body);
      if (!validation.valid) {
        return createError(validation.error || "Invalid deck data");
      }

      const { mainDeck, commander } = validation.data!;
      console.log(
        `[check-legality] Parsed body: commander=${commander.name}, mainDeck items=${
          Array.isArray(mainDeck) ? mainDeck.length : 0
        }`,
      );

      // Preliminary validations complete, proceeding to fetch commander data
      console.log(
        `[check-legality] Fetching commander data for ${commander.name}`,
      );

      // Validate commander and cache it
      const commanderData = cardManager.fetchCard(commander.name);
      const commanderError = checkCommander(commander, commanderData);
      if (commanderError) return commanderError;

      // We can now safely assert commanderData is not null since checkCommander would have returned
      const validCommanderData = commanderData as IScryfallCard;

      // Get deck legality information
      console.log(
        `[check-legality] Testing decklist for commander=${commander.name}`,
      );
      const { illegalCards } = cardManager.testDecklist({
        mainDeck,
        commander,
      });

      // Calculate total cards
      const cardQuantities = mainDeck.reduce(
        (total: number, card: Card) => total + card.quantity,
        0,
      );
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

      for (const card of mainDeck) {
        if (
          !BASIC_LANDS.has(card.name) &&
          !cardManager.isAllowedToBreakSingletonRule(card.name)
        ) {
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

      for (const card of mainDeck) {
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

        if (
          cardData &&
          Array.isArray(cardData.color_identity) &&
          !cardData.color_identity.every((color) => colorIdentity.has(color))
        ) {
          legalChecks.colorIdentity = false;
          colorIdentityViolations.add(card.name);
        }
      }

      // Determine overall legality
      const isLegal = Object.values(legalChecks).every((check) => check);
      console.log(
        `[check-legality] Deck legality: legal=${isLegal}, illegalCards=${illegalCards.length}`,
      );

      // Construct response
      const response: LegalityResponse = {
        legal: isLegal,
        commander: commander.name,
        commanderImageUris: validCommanderData.image_uris ?? undefined,
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
      return createError(
        error instanceof Error ? error.message : String(error),
        500,
      );
    }
  },
};
