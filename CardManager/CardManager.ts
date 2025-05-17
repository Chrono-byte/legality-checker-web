import type { IScryfallCard } from "npm:scryfall-types";
import { isBuildMode } from "../utils/is-build.ts";

/** Directory path for static data files */
const DATA_DIR = "./data";
/** Directory path for cached data */
const CACHE_DIR = "./cache";

/**
 * Represents a card in a deck with its quantity and name
 */
interface DeckCard {
  /** The number of copies of the card */
  quantity: number;
  /** The name of the card */
  name: string;
}

/**
 * Represents a complete deck list with main deck and commander
 */
interface DeckList {
  /** Array of cards in the main deck */
  mainDeck: DeckCard[];
  /** The commander card */
  commander: DeckCard;
}

/**
 * Results from validating a deck list against format rules
 */
interface CardValidationResult {
  /** Array of cards that are legal in the format */
  legalCards: IScryfallCard[];
  /** Array of card names that are not legal in the format */
  illegalCards: string[];
}

/**
 * Utility function to read and parse a CSV file into an array of trimmed card names
/**
 * Reads a CSV file and returns its contents as an array of trimmed strings
 * @param filename The name of the CSV file to read
 * @returns Promise resolving to an array of card names
 * @throws Error if file cannot be read or parsed
 */
async function loadCardList(filename: string): Promise<string[]> {
  const text = await Deno.readTextFile(
    new URL(`${DATA_DIR}/${filename}`, import.meta.url),
  );
  return text
    .split("\n")
    .map((line) => line.replace(/"/g, "").trim())
    .filter(Boolean);
}

/** Banner list initialized with CSV data */
let bannedListArray: string[] = [];
/** Allowed list initialized with CSV data */
let allowedListArray: string[] = [];
/** Singleton exceptions initialized with CSV data */
let singletonExceptionsArray: string[] = [];

// Load lists concurrently
try {
  [bannedListArray, allowedListArray, singletonExceptionsArray] = await Promise
    .all([
      loadCardList("banned_list.csv"),
      loadCardList("allowed_list.csv"),
      loadCardList("singleton_exceptions.csv"),
    ]);
} catch (error) {
  console.error("Failed to load card lists:", error);
  // Initialize with empty arrays to prevent runtime errors
  bannedListArray = [];
  allowedListArray = [];
  singletonExceptionsArray = [];
}

/**
 * Manages card data, legality checks, and deck validation for the format
 */
export default class CardManager {
  /** Array of all cards from Scryfall */
  private cards: IScryfallCard[];
  /** List of cards banned in the format */
  private readonly bannedList: string[];
  /** List of additional cards allowed in the format */
  private readonly allowedList: string[];
  /** List of cards allowed to have multiple copies */
  private readonly singletonExceptions: string[];

  constructor() {
    this.cards = [];
    this.bannedList = bannedListArray;
    this.allowedList = allowedListArray;
    this.singletonExceptions = singletonExceptionsArray;

    // If running in a test environment, use mock data
    if (Deno.env.get("DENO_TEST")) {
      this.setupTestData();
      return; // Skip loading cards in test environment
    }

    // If running in a non-build mode, load cards from cache or download them
    if (!isBuildMode() && !Deno.env.get("DENO_TEST")) {
      // Semi-verbose log: CardManager initialized
      console.log("[CardManager] initialized");
      void this.loadCards().then(() => {
        console.log("[CardManager] cards loaded");
      }).catch((error) => {
        console.error("[CardManager] Error loading cards:", error);
      });
    }
  }

  /**
   * Sets up mock test data for testing environment
   */
  private setupTestData(): void {
    console.log("[CardManager] setting up test data");

    // Add some basic test cards
    const mockCards = [
      {
        name: "Elesh Norn",
        type_line: "Legendary Creature - Praetor",
        color_identity: ["W"],
        legalities: {
          pioneer: "legal",
          commander: "legal",
        },
        image_uris: {
          small: "https://example.com/small.jpg",
          normal: "https://example.com/normal.jpg",
        },
      },
      {
        name: "Island",
        type_line: "Basic Land — Island",
        color_identity: ["U"],
        legalities: {
          pioneer: "legal",
          commander: "legal",
        },
      },
      {
        name: "Sol Ring",
        type_line: "Artifact",
        color_identity: [],
        legalities: {
          pioneer: "not_legal",
          commander: "legal",
        },
      },
      {
        name: "Rat Colony",
        type_line: "Creature — Rat",
        color_identity: ["B"],
        legalities: {
          pioneer: "legal",
          commander: "legal",
        },
      },
    ] as unknown as IScryfallCard[];

    this.cards = mockCards;
  }

  /**
   * Loads card data from the cache file or downloads it if not available
   * @throws Error if card data cannot be loaded or downloaded
   */
  async loadCards(): Promise<void> {
    try {
      const filePath = new URL(`${CACHE_DIR}/cards.json`, import.meta.url);
      console.log(`[CardManager] loading cards from cache ${filePath}`);
      const data = await Deno.readTextFile(filePath);
      this.cards = JSON.parse(data) as IScryfallCard[];
      console.log(`[CardManager] loaded ${this.cards.length} cards from cache`);
    } catch (error) {
      // During build, we should never try to download cards
      if (isBuildMode()) {
        throw new Error(
          "Card data is required for build but cards.json was not found. Please run the development server first to download card data.",
        );
      }

      if (
        error instanceof Deno.errors.NotFound || error instanceof SyntaxError
      ) {
        console.log("Card cache missing or invalid, downloading fresh data...");
        await this.downloadCards();
      } else {
        console.error("Unexpected error loading cards:", error);
        throw error;
      }
    }
  }

  /**
   * Downloads and processes card data from Scryfall
   * @param retryCount Number of retries for failed requests
   * @throws Error if card data cannot be downloaded after all retries
   */
  private async downloadCards(retryCount = 3): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutMs = 30000; // 30 seconds
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log("[CardManager] fetching bulk data information");

      // Get bulk data URL
      const bulkDataInfo = await this.fetchBulkDataInfo(
        controller.signal,
        retryCount,
      );
      clearTimeout(timeoutId);

      if (!bulkDataInfo.download_uri) {
        throw new Error("No download URI found in Scryfall bulk data response");
      }

      console.log("[CardManager] starting streaming download");
      const bulkDataUrl = bulkDataInfo.download_uri;

      // Stream and process the data
      const processedCards = await this.streamAndProcessCards(
        bulkDataUrl,
        controller.signal,
        retryCount,
      );

      console.log(
        `[CardManager] successfully processed ${processedCards.length} cards`,
      );

      // Calculate statistics
      const stats = this.calculateCardStats(processedCards);
      this.logCardStats(stats);

      // Cache the filtered data
      console.log("[CardManager] caching processed cards");
      await this.cacheCardData(processedCards);

      // Reload the cards into memory
      console.log("[CardManager] reloading cards after cache update");
      await this.loadCards();
      console.log("Successfully processed and saved card data");
    } catch (error) {
      console.error("Error fetching bulk card data:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
      if (retryCount > 0) {
        const delayMs = (4 - retryCount) * 5000; // Exponential backoff: 5s, 10s, 15s
        console.log(
          `Retrying download in ${delayMs / 1000}s... (${
            retryCount - 1
          } attempts remaining)`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        await this.downloadCards(retryCount - 1);
      } else {
        throw new Error(
          `Failed to download card data after all retry attempts: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }
  }

  /**
   * Fetches bulk data information from Scryfall API
   * @param signal AbortSignal for request cancellation
   * @param retryCount Number of retries for failed requests
   */
  private async fetchBulkDataInfo(
    signal: AbortSignal,
    retryCount: number,
  ): Promise<{ download_uri: string }> {
    const response = await this.fetchWithRetry(
      "https://api.scryfall.com/bulk-data/oracle-cards",
      {
        signal,
        headers: {
          "Accept": "application/json",
          "User-Agent": "PHL-Legality-Checker/1.0",
        },
      },
      retryCount,
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} - ${await response.text()}`,
      );
    }

    return await response.json() as { download_uri: string };
  }

  /**
   * Streams and processes card data with memory-efficient approach
   * @param bulkDataUrl URL to fetch card data from
   * @param signal AbortSignal for request cancellation
   * @param retryCount Number of retries for failed requests
   */
  private async streamAndProcessCards(
    bulkDataUrl: string,
    signal: AbortSignal,
    retryCount: number,
  ): Promise<IScryfallCard[]> {
    console.log("Fetching bulk card data from: ", bulkDataUrl);

    const response = await this.fetchWithRetry(
      bulkDataUrl,
      {
        signal,
        headers: {
          "Accept": "application/json",
          "User-Agent": "PHL-Legality-Checker/1.0",
        },
      },
      retryCount,
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} - ${await response.text()}`,
      );
    }

    // For memory efficiency, we'll only keep the fields we actually need
    const processedCards: IScryfallCard[] = [];
    const necessaryFields = [
      "name",
      "image_uris",
      "oracle_id",
      "legalities",
      "games",
      "layout",
      "type_line",
      "set_type",
      "card_faces",
      "color_identity",
      "game_changer",
    ];

    // Use streaming JSON parser if available
    if (typeof response.body?.getReader === "function") {
      // Read the response as a stream of UTF-8 text
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let depth = 0;
      let currentObject = "";
      let inQuotes = false;
      let escapeNext = false;

      console.log("Processing card data as stream...");
      let processedCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        while (buffer.length > 0) {
          const char = buffer[0];
          buffer = buffer.slice(1);

          if (escapeNext) {
            currentObject += char;
            escapeNext = false;
            continue;
          }

          if (char === '"' && !inQuotes) {
            inQuotes = true;
            currentObject += char;
          } else if (char === '"' && inQuotes) {
            inQuotes = false;
            currentObject += char;
          } else if (char === "\\" && inQuotes) {
            escapeNext = true;
            currentObject += char;
          } else if (char === "{" && !inQuotes) {
            depth++;
            currentObject += char;
          } else if (char === "}" && !inQuotes) {
            currentObject += char;
            depth--;

            if (depth === 0) {
              try {
                const card = JSON.parse(currentObject) as IScryfallCard;

                // Apply filtering criteria during streaming
                if (this.isCardEligible(card)) {
                  // Only keep necessary fields to reduce memory usage
                  const trimmedCard = this.trimCardData(card, necessaryFields);

                  processedCards.push(trimmedCard);
                }

                processedCount++;
                if (processedCount % 10000 === 0) {
                  console.log(`Processed ${processedCount} cards...`);
                }

                currentObject = "";
              } catch (e) {
                console.error("Failed to parse card object:", e);
                currentObject = "";
              }
            }
          } else if (char === "[" && !inQuotes && depth === 0) {
            // Start of array, ignore
          } else if (char === "]" && !inQuotes && depth === 0) {
            // End of array, ignore
          } else if (char === "," && !inQuotes && depth === 0) {
            // Comma between objects at root level, ignore
          } else {
            currentObject += char;
          }

          // If buffer gets too big, pause and return current results
          if (buffer.length > 10000000) { // 10MB
            console.log("Buffer getting large, processing in chunks...");
            break;
          }
        }
      }

      decoder.decode(); // Flush the decoder
      console.log(
        `Processed ${processedCount} cards, kept ${processedCards.length} eligible`,
      );
    } else {
      throw new Error(
        "Streaming JSON parser not available, unable to process card data",
      );
    }

    return processedCards;
  }

  /**
   * Checks if a card is eligible to be included in the data set
   * @param card Card to check
   * @returns Whether the card should be included
   */
  private isCardEligible(card: IScryfallCard): boolean {
    // Exclude non-paper, tokens, memorabilia, emblems, and special types
    if (!card.games?.includes("paper")) return false;
    const layout = card.layout?.toLowerCase() ?? "";
    const typeLine = card.type_line?.toLowerCase() ?? "";
    const setType = card.set_type?.toLowerCase() ?? "";
    const name = card.name.toLowerCase();

    if (layout.includes("token")) return false;
    if (typeLine.includes("token")) return false;
    if (setType.includes("memorabilia") || setType.includes("token")) {
      return false;
    }
    if (name.includes("emblem")) return false;

    // Exclude special card types
    const excludedTypes = [
      "vanguard",
      "scheme",
      "conspiracy",
      "phenomenon",
    ];
    if (excludedTypes.some((type) => typeLine.includes(type))) return false;

    return true;
  }

  /**
   * Creates a trimmed down version of card data with only needed fields
   * @param card The full card data
   * @param fields Array of field names to keep
   * @returns Trimmed card object
   */
  private trimCardData(card: IScryfallCard, fields: string[]): IScryfallCard {
    // Only keep the specified fields from the card object
    const trimmedCard: { [key: string]: unknown } = {};
    for (const field of fields) {
      if (field in card) {
        trimmedCard[field] =
          (card as IScryfallCard)[field as keyof IScryfallCard];
      }
    }
    // return the trimmed card object
    return trimmedCard as unknown as IScryfallCard;
  }

  /**
   * Fetches data with retry logic and exponential backoff
   * @param url URL to fetch from
   * @param options Fetch options
   * @param maxRetries Maximum number of retries
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number,
  ): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        return response;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to fetch from ${url}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          );
        }
        const delayMs = attempt * 5000; // Exponential backoff: 5s, 10s, 15s
        console.log(
          `Attempt ${attempt} failed, retrying in ${delayMs / 1000}s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error(`All ${maxRetries} retry attempts failed for ${url}`);
  }

  /**
   * Calculates card statistics
   */
  private calculateCardStats(cards: IScryfallCard[]): {
    totalCards: number;
    pioneerLegal: number;
    banned: number;
    allowed: number;
  } {
    return {
      totalCards: cards.length,
      pioneerLegal: cards.filter((card) => card.legalities.pioneer === "legal")
        .length,
      banned:
        cards.filter((card) => this.bannedList.includes(card.name)).length,
      allowed:
        cards.filter((card) => this.allowedList.includes(card.name)).length,
    };
  }

  /**
   * Logs card statistics to console
   */
  private logCardStats(stats: {
    totalCards: number;
    pioneerLegal: number;
    banned: number;
    allowed: number;
  }): void {
    console.log(`Statistics:
      - Total cards filtered: ${stats.totalCards}
      - Pioneer legal: ${stats.pioneerLegal}
      - Banned cards: ${stats.banned}
      - Allowed list additions: ${stats.allowed}
    `);
  }

  /**
   * Caches card data to disk
   */
  private async cacheCardData(cards: IScryfallCard[]): Promise<void> {
    const cacheUrl = new URL(`${CACHE_DIR}`, import.meta.url);
    const filePath = new URL(`${CACHE_DIR}/cards.json`, import.meta.url);

    try {
      // Create cache directory if it doesn't exist
      await Deno.mkdir(cacheUrl, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error;
      }
    }

    const jsonString = JSON.stringify(cards);
    await Deno.writeTextFile(filePath, jsonString);
  }

  /**
   * Parses a deck list string into a structured format
   * @param deckList Raw deck list string with quantity and card names
   * @returns Parsed deck list with main deck and commander
   */
  parseDeckList(deckList: string): DeckList {
    const lines = deckList.split("\n");
    const commanderIndex = lines.findIndex((line) => line.trim() === "");

    if (commanderIndex === -1) {
      throw new Error("Invalid deck list format: No separator line found");
    }

    const mainDeckLines = lines.slice(0, commanderIndex);
    const commanderLine = lines[commanderIndex + 1]?.trim();

    if (!commanderLine) {
      throw new Error("Invalid deck list format: No commander found");
    }

    const [quantityStr, ...cardName] = commanderLine.split(" ");
    const quantity = parseInt(quantityStr, 10);

    if (isNaN(quantity) || quantity < 1) {
      throw new Error(`Invalid commander quantity: ${quantityStr}`);
    }

    const commander: DeckCard = {
      quantity,
      name: cardName.join(" "),
    };

    const mainDeck = mainDeckLines.map((line): DeckCard => {
      const [quantityStr, ...cardName] = line.split(" ");
      const quantity = parseInt(quantityStr, 10);

      if (isNaN(quantity) || quantity < 1) {
        throw new Error(`Invalid quantity in line: ${line}`);
      }

      return {
        quantity,
        name: cardName.join(" "),
      };
    });

    return { mainDeck, commander };
  }

  /**
   * Checks if a card is a double-faced card and finds its data
   * @param cardName Name of the card to search for
   * @returns Card data if found, null otherwise
   */
  private findDFCCard(cardName: string): IScryfallCard | null {
    return this.cards.find(
      (c) =>
        Array.isArray(c.card_faces) &&
        c.card_faces.some((cf) => cf.name === cardName),
    ) || null;
  }

  /**
   * Determines if a card is legal in the format
   * @param cardName Name of the card to check
   * @param cardData Card data from Scryfall
   * @returns Whether the card is legal
   */
  private isCardLegal(
    cardName: string,
    cardData: IScryfallCard | null,
  ): boolean {
    if (!cardData) return false;
    return this.allowedList.includes(cardName) ||
      (cardData.legalities.pioneer === "legal" &&
        !this.bannedList.includes(cardName));
  }

  /**
   * Adds multiple copies of a card to the legal cards list
   * @param card Card data to add
   * @param quantity Number of copies to add
   * @param legalCards List to add the cards to
   */
  private addCardToList(
    card: IScryfallCard,
    quantity: number,
    legalCards: IScryfallCard[],
  ): void {
    for (let i = 0; i < quantity; i++) {
      legalCards.push({ ...card });
    }
  }

  /**
   * Checks if a card is a token card
   * @param card Card data to check
   * @returns Whether the card is a token
   */
  private isToken(card: IScryfallCard): boolean {
    return card.layout === "token" ||
      card.type_line?.toLowerCase().includes("token") ||
      card.layout === "double_faced_token";
  }

  /**
   * Finds a non-token card by name
   * @param cardName Name of the card to find
   * @returns Card data if found, null otherwise
   */
  private findRealCard(cardName: string): IScryfallCard | null {
    const matchingCards = this.cards.filter((c) => c.name === cardName);
    // If we have multiple cards with the same name, prefer non-tokens
    if (matchingCards.length > 1) {
      const nonTokens = matchingCards.filter((c) => !this.isToken(c));
      return nonTokens[0] || null;
    }
    const card = matchingCards[0];
    return card && !this.isToken(card) ? card : null;
  }

  /**
   * Gets a card with its legality information
   * @param cardName Name of the card to get
   * @returns Card data with format legality if found, null otherwise
   */
  private getCardWithLegality(cardName: string): IScryfallCard | null {
    const card = this.findRealCard(cardName);
    if (!card) return null;

    // Create a new object to avoid modifying the original
    return {
      ...card,
      legalities: {
        ...card.legalities,
        pioneer: this.isCardLegal(cardName, card) ? "legal" : "not_legal",
      },
    };
  }

  /**
   * Validates a single card and updates the legal/illegal lists
   * @param cardName Name of the card to check
   * @param quantity Number of copies
   * @param legalCards List of legal cards to update
   * @param illegalCards List of illegal cards to update
   */
  private checkCardLegality(
    cardName: string,
    quantity: number,
    legalCards: IScryfallCard[],
    illegalCards: string[],
  ): void {
    let cardData = this.getCardWithLegality(cardName);

    // Handle double-faced cards (DFCs)
    if (!cardData) {
      const dfc = this.findDFCCard(cardName);
      if (dfc && !this.isToken(dfc)) {
        cardData = this.getCardWithLegality(dfc.name);
      }
    }

    if (!cardData) {
      illegalCards.push(cardName);
      return;
    }

    if (cardData.legalities.pioneer !== "legal") {
      illegalCards.push(cardName);
      return;
    }

    this.addCardToList(cardData, quantity, legalCards);
  }

  /**
   * Tests a decklist for format legality
   * @param deckList The deck list to test
   * @returns Object containing arrays of legal and illegal cards
   */
  testDecklist(deckList: DeckList): CardValidationResult {
    const legalCards: IScryfallCard[] = [];
    const illegalCards: string[] = [];

    // Check commander legality first
    this.checkCardLegality(
      deckList.commander.name,
      deckList.commander.quantity,
      legalCards,
      illegalCards,
    );

    // Check legality for each card in the decklist
    for (const { name, quantity } of deckList.mainDeck) {
      this.checkCardLegality(name, quantity, legalCards, illegalCards);
    }

    return { legalCards, illegalCards };
  }

  /**
   * Gets a card's data and legality information by name
   * @param cardName Name of the card to fetch
   * @returns Card data with legality information if found, null otherwise
   */
  fetchCard(cardName: string): IScryfallCard | null {
    return this.getCardWithLegality(cardName);
  }

  /**
   * Checks if a card is allowed to have multiple copies in the deck
   * @param cardName Name of the card to check
   * @returns Whether the card is exempt from the singleton rule
   */
  isAllowedToBreakSingletonRule(cardName: string): boolean {
    return this.singletonExceptions.includes(cardName);
  }
}
