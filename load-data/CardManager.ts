import type { IScryfallCard } from "npm:scryfall-types";

// Define data and cache directories
const DATA_DIR = "./data";
const CACHE_DIR = "./cache";

interface DeckCard {
  quantity: number;
  name: string;
}

interface DeckList {
  mainDeck: DeckCard[];
  commander: DeckCard;
}

interface CardValidationResult {
  legalCards: IScryfallCard[];
  illegalCards: string[];
}

// Utility function to read and parse a CSV file into an array of trimmed card names
async function loadCardList(filename: string): Promise<string[]> {
  const text = await Deno.readTextFile(
    new URL(`${DATA_DIR}/${filename}`, import.meta.url),
  );
  return text
    .split("\n")
    .map((line) => line.replace(/"/g, "").trim())
    .filter(Boolean);
}

// Load lists concurrently
const [bannedListArray, allowedListArray, singletonExceptionsArray] =
  await Promise.all([
    loadCardList("banned_list.csv"),
    loadCardList("allowed_list.csv"),
    loadCardList("singleton_exceptions.csv"),
  ]);

/**
 * Manages card data, legality checks, and deck validation for the format
 */
export default class CardManager {
  private cards: IScryfallCard[];
  private readonly bannedList: string[];
  private readonly allowedList: string[];
  private readonly singletonExceptions: string[];
  private readonly cardLegality: Map<string, boolean>;

  constructor() {
    this.cards = [];
    this.bannedList = bannedListArray;
    this.allowedList = allowedListArray;
    this.singletonExceptions = singletonExceptionsArray;
    this.cardLegality = new Map();

    void this.loadCards();
  }

  /**
   * Loads card data from the cache file or downloads it if not available
   * @throws Error if card data cannot be loaded or downloaded
   */
  async loadCards(): Promise<void> {
    try {
      const filePath = new URL(`${CACHE_DIR}/cards.json`, import.meta.url);
      const data = await Deno.readTextFile(filePath);
      this.cards = JSON.parse(data) as IScryfallCard[];
      console.log(`Loaded ${this.cards.length} cards from cards.json`);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log("cards.json not found, downloading cards...");
        await this.downloadCards();
      } else if (error instanceof SyntaxError) {
        console.error("Error parsing cards.json, redownloading...");
        await this.downloadCards();
      } else {
        console.error("Error loading cards:", error);
        throw error; // Re-throw unexpected errors
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
      const timeoutMs = 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log("Fetching Scryfall bulk data information...");
      const bulkData = await this.fetchBulkData(controller.signal, retryCount);
      clearTimeout(timeoutId);

      console.log(`Successfully downloaded ${bulkData.length} cards from Scryfall`);

      // Filter cards to include only physical cards
      const pdhCards = bulkData.filter((card) => card.games.includes("paper"));

      // Calculate statistics
      const stats = this.calculateCardStats(pdhCards);
      this.logCardStats(stats);

      // Cache the filtered data
      await this.cacheCardData(pdhCards);

      // Reload the cards into memory
      await this.loadCards();
      console.log("Successfully processed and saved card data");
    } catch (error) {
      console.error("Error fetching bulk card data:", error);
      if (retryCount > 0) {
        console.log(`Retrying download... (${retryCount - 1} attempts remaining)`);
        await this.downloadCards(retryCount - 1);
      } else {
        throw new Error("Failed to download card data after all retry attempts");
      }
    }
  }

  /**
   * Fetches bulk data from Scryfall API
   * @param signal AbortSignal for request cancellation
   * @param retryCount Number of retries for failed requests
   */
  private async fetchBulkData(
    signal: AbortSignal,
    retryCount: number,
  ): Promise<IScryfallCard[]> {
    const response = await this.fetchWithRetry(
      "https://api.scryfall.com/bulk-data/oracle-cards",
      {
        signal,
        headers: {
          "Accept": "application/json",
          "User-Agent": "PHL-Legality-Checker",
        },
        cache: "force-cache",
      },
      retryCount,
    );

    const data = await response.json();
    const bulkDataUrl = data.download_uri;

    console.log("Fetching bulk card data from:", bulkDataUrl);
    const bulkDataResponse = await this.fetchWithRetry(
      bulkDataUrl,
      {
        signal,
        headers: {
          "Accept": "application/json",
          "User-Agent": "PHL-Legality-Checker",
        },
        cache: "force-cache",
      },
      retryCount,
    );

    return await bulkDataResponse.json() as IScryfallCard[];
  }

  /**
   * Fetches data with retry logic
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
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        console.log(`Attempt ${attempt} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error("All retry attempts failed");
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
      banned: cards.filter((card) => this.bannedList.includes(card.name)).length,
      allowed: cards.filter((card) => this.allowedList.includes(card.name)).length,
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
    const filePath = new URL(`${CACHE_DIR}/cards.json`, import.meta.url);
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
      const card = this.cards.find((c) => c.name === cardName);
      if (card && this.isToken(card)) {
        console.log(
          `Card "${cardName}" marked illegal: This is a token, not a real card`,
        );
      } else {
        console.log(
          `Card "${cardName}" marked illegal: Card not found in database`,
        );
      }
      illegalCards.push(cardName);
      return;
    }

    if (cardData.legalities.pioneer !== "legal") {
      console.log(cardData);

      console.log(
        `Card "${cardName}" marked illegal: Not legal in Pioneer format`,
      );
      if (this.bannedList.includes(cardName)) {
        console.log(`-> Reason: Card is on the banned list`);
      } else if (!this.allowedList.includes(cardName)) {
        console.log(`-> Reason: Card is not on the allowed list`);
      }
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

  fetchCard(cardName: string): IScryfallCard | null {
    return this.getCardWithLegality(cardName);
  }

  // Check if a card is allowed to break the singleton rule
  isAllowedToBreakSingletonRule(cardName: string): boolean {
    return this.singletonExceptions.includes(cardName);
  }
}
