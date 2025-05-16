import type {
  IScryfallCard,
  IScryfallColor as _IScryfallColor,
} from "npm:scryfall-types";

// Utility function to read and parse a CSV file into an array of trimmed card names
async function loadCardList(filename: string): Promise<string[]> {
  const text = await Deno.readTextFile(new URL(filename, import.meta.url));
  return text
    .split("\n")
    .map((line) => line.replace(/"/g, "").trim())
    .filter(Boolean);
}

// Load lists concurrently
const [bannedListArray, allowedListArray, singletonExceptionsArray] =
  await Promise.all([
    loadCardList("./banned_list.csv"),
    loadCardList("./allowed_list.csv"),
    loadCardList("./singleton_exceptions.csv"),
  ]);

export default class CardManager {
  cards: IScryfallCard[];
  bannedList: string[];
  allowedList: string[];
  singletonExceptions: string[];
  cardLegality: Map<string, boolean>;

  constructor() {
    this.cards = [];
    this.bannedList = bannedListArray;
    this.allowedList = allowedListArray;
    this.singletonExceptions = singletonExceptionsArray;
    this.cardLegality = new Map();

    this.loadCards();
  }
  async loadCards() {
    try {
      const data = await Deno.readTextFile(
        new URL("./cards.json", import.meta.url),
      );
      this.cards = JSON.parse(data) as IScryfallCard[];
      console.log(`Loaded ${this.cards.length} cards from cards.json`);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log("cards.json not found, downloading cards...");
        await this.downloadCards();
      } else {
        console.error("Error loading cards:", error);
      }
    }
  }

  async downloadCards(retryCount = 3): Promise<void> {
    try {
      const controller = new AbortController();
      let timeoutId: number | undefined;
      const timeoutMs = 30000;

      const fetchWithRetry = async (
        url: string,
        options: RequestInit,
        maxRetries: number,
      ): Promise<Response> => {
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
      };

      timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log("Fetching Scryfall bulk data information...");

      const response = await fetchWithRetry(
        "https://api.scryfall.com/bulk-data/oracle-cards",
        {
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
            "User-Agent": "PHL-Legality-Checker",
          },
          cache: "force-cache",
          keepalive: true,
        },
        retryCount,
      );

      clearTimeout(timeoutId);

      const data = await response.json();
      const bulkDataUrl = data.download_uri;

      console.log("Fetching bulk card data from:", bulkDataUrl);

      const bulkController = new AbortController();
      timeoutId = setTimeout(() => bulkController.abort(), 120000);

      const bulkDataResponse = await fetchWithRetry(
        bulkDataUrl,
        {
          signal: bulkController.signal,
          headers: {
            "Accept": "application/json",
            "User-Agent": "PHL-Legality-Checker",
          },
          cache: "force-cache",
        },
        retryCount,
      );

      clearTimeout(timeoutId);

      const bulkData = await bulkDataResponse.json() as IScryfallCard[];

      console.log(
        `Successfully downloaded ${bulkData.length} cards from Scryfall`,
      );

      // Filter cards based on our requirements:
      // 1. Must be a paper card
      // 2. Must be in Pioneer or a supplemental set
      // 3. Not on our banned list
      // 4. On our allowed list, if not Pioneer legal
      const pdhCards = bulkData.filter((card: IScryfallCard) => {
        // Must be a paper card
        if (!card.games.includes("paper")) return false;

        // // Check if it's in our allowed list
        // if (this.allowedList.includes(card.name)) return true;

        // // Check if it's on our banned list
        // if (this.bannedList.includes(card.name)) return false;

        // // Check Pioneer legality
        // return card.legalities.pioneer === "legal";
        return true;
      });

      // Calculate and log some statistics
      const bannedCount = bulkData.filter((card) =>
        this.bannedList.includes(card.name)
      ).length;
      const allowedCount = bulkData.filter((card) =>
        this.allowedList.includes(card.name)
      ).length;
      const pioneerLegalCount =
        pdhCards.filter((card) => card.legalities.pioneer === "legal").length;

      console.log(`Statistics:
        - Total cards filtered: ${pdhCards.length}
        - Pioneer legal: ${pioneerLegalCount}
        - Banned cards: ${bannedCount}
        - Allowed list additions: ${allowedCount}
      `);

      // write filtered data to disk with efficient JSON stringification
      const jsonString = JSON.stringify(pdhCards);
      await Deno.writeTextFile(
        new URL("./cards.json", import.meta.url),
        jsonString,
      );

      // Reload the cards into memory
      this.loadCards();

      console.log("Successfully processed and saved card data");
    } catch (error) {
      console.error("Error fetching bulk card data:", error);

      // If we have retries left, try again
      if (retryCount > 0) {
        console.log(
          `Retrying download... (${retryCount - 1} attempts remaining)`,
        );
        await this.downloadCards(retryCount - 1);
      } else {
        throw new Error(
          "Failed to download card data after all retry attempts",
        );
      }
    }
  }

  // decklists are provided as a string with each card on a new line with a number of copies followed by the card name
  parseDeckList(
    deckList: string,
  ): [
    { quantity: number; name: string }[],
    { quantity: number; name: string },
  ] {
    // find our empty line that separates the main deck from the commander
    const commanderIndex = deckList.split("\n").findIndex((line) =>
      line === ""
    );

    // split the decklist into the main deck and the commander
    const mainDeck = deckList.split("\n").slice(0, commanderIndex);
    const commander = deckList.split("\n")[commanderIndex + 1];

    let commanderCard: { quantity: number; name: string } | null = null;

    // find the commander in the cards array
    if (commander) {
      const [quantity, ...cardName] = commander.split(" ");
      commanderCard = {
        quantity: parseInt(quantity),
        name: cardName.join(" "),
      };
    } else if (!commanderCard) {
      throw new Error("Commander not found");
    }

    // split the main deck into an array of that contains the quantity and card object
    const deckListArray = mainDeck.map((line) => {
      const [quantity, ...cardName] = line.split(" ");
      return {
        quantity: parseInt(quantity),
        name: cardName.join(" "),
      };
    });

    return [deckListArray, commanderCard];
  }

  private findDFCCard(cardName: string): IScryfallCard | null {
    return this.cards.find(
      (c) =>
        Array.isArray(c.card_faces) &&
        c.card_faces.some((cf) => cf.name === cardName),
    ) || null;
  }

  private isCardLegal(
    cardName: string,
    cardData: IScryfallCard | null,
  ): boolean {
    if (!cardData) return false;
    return this.allowedList.includes(cardName) ||
      (cardData.legalities.pioneer === "legal" &&
        !this.bannedList.includes(cardName));
  }

  private addCardToList(
    card: IScryfallCard,
    quantity: number,
    legalCards: IScryfallCard[],
  ): void {
    for (let i = 0; i < quantity; i++) {
      legalCards.push({ ...card });
    }
  }

  private isToken(card: IScryfallCard): boolean {
    return card.layout === "token" ||
      card.type_line?.toLowerCase().includes("token") ||
      card.layout === "double_faced_token";
  }

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

  testDecklist(
    deckList: { quantity: number; name: string }[],
    commander: { quantity: number; name: string },
  ): [IScryfallCard[], string[]] {
    const legalCards: IScryfallCard[] = [];
    const illegalCards: string[] = [];

    // Check commander legality first
    this.checkCardLegality(
      commander.name,
      commander.quantity,
      legalCards,
      illegalCards,
    );

    // Check legality for each card in the decklist
    for (const { name: cardName, quantity } of deckList) {
      this.checkCardLegality(cardName, quantity, legalCards, illegalCards);
    }

    return [legalCards, illegalCards];
  }

  fetchCard(cardName: string): IScryfallCard | null {
    return this.getCardWithLegality(cardName);
  }

  // Check if a card is allowed to break the singleton rule
  isAllowedToBreakSingletonRule(cardName: string): boolean {
    return this.singletonExceptions.includes(cardName);
  }
}
