import type { IScryfallCard } from "npm:scryfall-types";
import { isBuildMode } from "../utils/is-build.ts";
import { CardLists } from "./CardLists.ts";

// Import CardLists from our new module
// Initialize card lists based on environment
await CardLists.initializeAsync();

/** Directory path for cached data */
const CACHE_DIR = "./cache";
/** Minimum delay between Scryfall API requests in milliseconds */
const SCRYFALL_DELAY = 100; // 100ms = 10 requests per second maximum

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

// Initialize card lists asynchronously
void CardLists.initializeAsync();

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

  private initialized = false;

  constructor() {
    this.cards = [];
    this.bannedList = CardLists.bannedList;
    this.allowedList = CardLists.allowedList;
    this.singletonExceptions = CardLists.singletonExceptions;

    // If running in a build mode, just download the cards
    if (isBuildMode()) {
      this.downloadCards().then(() => {
        console.log("[CardManager] cards downloaded");
      }).catch((error) => {
        console.error("[CardManager] Error downloading cards:", error);
      });
      return;
    }

    // In non-build mode, load cards from cache or download them
    console.log("[CardManager] initialized");
    void this.loadCards().then(() => {
      console.log("[CardManager] cards loaded");
      this.initialized = true;
    }).catch((error) => {
      console.error("[CardManager] Error loading cards:", error);
    });
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

      // Find all cards that are banned in Pioneer from Scryfall data
      const pioneerBannedCards = this.cards
        .filter((card) => card.legalities?.pioneer === "banned")
        .map((card) => card.name);

      // Add these cards to our banned list
      if (pioneerBannedCards.length > 0) {
        console.log(
          `[CardManager] adding ${pioneerBannedCards.length} Pioneer-banned cards to banned list`,
        );

        // sort them alphabetically to match our allowed list
        pioneerBannedCards.sort((a, b) => a.localeCompare(b));

        // This is a bit of a hack, but we need to add these cards to the banned list
        CardLists.addToBannedList(pioneerBannedCards);
      }

      console.log(`[CardManager] loaded ${this.cards.length} cards from cache`);
    } catch (error) {
      // During build, we should never try to download cards
      if (isBuildMode()) {
        throw new Error(
          "Card data is required for build but cards.json was not found. Please run the build command to download card data.",
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
   * Implements rate-limited fetch to respect Scryfall API limits
   * @param url URL to fetch from
   * @param options Fetch options
   * @returns Promise resolving to Response
   */
  private async rateLimitedFetch(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    // Add required headers for Scryfall API
    const headers = {
      "Accept": "application/json",
      "User-Agent": "PHL-Legality-Checker/1.0",
      ...(options.headers || {}),
    };

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, SCRYFALL_DELAY));

    const response = await fetch(url, { ...options, headers });

    // Handle rate limiting response
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default to 60s if no header
      console.log(
        `Rate limited by Scryfall API, waiting ${
          waitTime / 1000
        }s before retry...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.rateLimitedFetch(url, options);
    }

    return response;
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
      "scryfall_uri",
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
    // Exclude non-paper cards
    if (!card.games?.includes("paper")) return false;

    const layout = card.layout?.toLowerCase() ?? "";
    const typeLine = card.type_line?.toLowerCase() ?? "";
    const setType = card.set_type?.toLowerCase() ?? "";
    const name = card.name.toLowerCase();

    // Handle DFCs - if it's a DFC, it must be one of the valid layouts
    if (Array.isArray(card.card_faces)) {
      if (!this.isValidMultiFaceLayout(layout)) return false;
    }

    // Exclude special layout types that don't represent playable cards
    const excludedLayouts = [
      "token",
      "double_faced_token",
      "emblem",
      "art_series",
      "reversible_card", // Configuration cards like The List
      "planar",
      "scheme",
      "vanguard",
    ];
    if (excludedLayouts.includes(layout)) return false;

    // Exclude memorabilia and tokens from special sets
    if (setType.includes("memorabilia") || setType.includes("token")) {
      return false;
    }

    // Exclude emblems and counters by name/type
    if (name.includes("emblem") || typeLine.includes("emblem")) return false;

    // Exclude special card types
    const excludedTypes = [
      "conspiracy",
      "phenomenon",
      "plane ", // Space after to avoid matching "planeswalker"
      "scheme",
      "vanguard",
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
        const response = await this.rateLimitedFetch(url, options);
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
   * Checks if a card has a valid multi-face layout
   * @param layout The card's layout
   * @returns Whether the layout is a valid multi-face type
   */
  private isValidMultiFaceLayout(layout: string): boolean {
    const validLayouts = [
      "transform",
      "modal_dfc",
      "meld",
      "split",
      "flip",
      "adventure",
    ];
    return validLayouts.includes(layout?.toLowerCase() ?? "");
  }

  /**
   * Finds a card by one of its face names
   * @param cardName Name of the card face to search for
   * @returns Card data if found, null otherwise
   */
  private findByCardFace(cardName: string): IScryfallCard | null {
    return this.cards.find(
      (c) =>
        // Direct name match
        c.name === cardName ||
        // Match multi-face card face
        (Array.isArray(c.card_faces) &&
          this.isValidMultiFaceLayout(c.layout) &&
          c.card_faces.some((cf) => cf.name === cardName)),
    ) || null;
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
        this.isValidMultiFaceLayout(c.layout) &&
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
    const layout = card.layout?.toLowerCase() ?? "";
    const typeLine = card.type_line?.toLowerCase() ?? "";
    const setType = card.set_type?.toLowerCase() ?? "";

    // Check for token-specific layouts
    if (layout === "token" || layout === "double_faced_token") return true;

    // Check type line and set type as fallbacks
    if (typeLine.includes("token")) return true;
    if (setType.includes("token")) return true;

    return false;
  }

  /**
   * Finds a non-token card by name
   * @param cardName Name of the card to find
   * @returns Card data if found, null otherwise
   */
  private findRealCard(cardName: string): IScryfallCard | null {
    // Try to find by full card name first
    const matchingCards = this.cards.filter((c) => c.name === cardName);
    if (matchingCards.length > 0) {
      // If we have multiple cards with the same name, prefer non-tokens
      if (matchingCards.length > 1) {
        const nonTokens = matchingCards.filter((c) => !this.isToken(c));
        return nonTokens[0] || null;
      }
      const card = matchingCards[0];
      return card && !this.isToken(card) ? card : null;
    }

    // If no direct match, try to find by card face name
    return this.findByCardFace(cardName);
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
    const cardData = this.getCardWithLegality(cardName);

    // No need for special handling here anymore - findRealCard now handles all card types

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

  /**
   * Shuffles an array using Fisher-Yates algorithm
   * @param array Array to shuffle
   * @returns Shuffled array
   */
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Gets all Pioneer-legal cards
   * @returns Array of legal cards
   */
  /**
   * Returns six unique random Pioneer-legal rare or mythic rare cards (non-token, non-DFC)
   */
  async getSixCards(): Promise<IScryfallCard[]> {
    while (!this.initialized) {
      // Wait for cards to be loaded
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Filter cards to get only those that are legal in Pioneer and not a DFC
    const legalCards = this.cards.filter((card) =>
      card.legalities.pioneer === "legal" &&
      !this.isValidMultiFaceLayout(card.layout)
    );

    //
    // Shuffle the array to get random cards
    const shuffledCards = this.shuffleArray(legalCards);
    // Get the first six cards
    const selectedCards = shuffledCards.slice(0, 6);

    return selectedCards;
  }
}
