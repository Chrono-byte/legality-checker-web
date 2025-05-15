import type {
  IScryfallCard,
  IScryfallColor as _IScryfallColor,
} from "npm:scryfall-types";

// load our banned list and allowed lists
const bannedList = await Deno.readTextFile(
  new URL("./banned_list.csv", import.meta.url),
);
const allowedList = await Deno.readTextFile(
  new URL("./allowed_list.csv", import.meta.url),
);
const singletonExceptions = await Deno.readTextFile(
  new URL("./singleton_exceptions.csv", import.meta.url),
);

// parse the lists into arrays of card names, we must also parse each line as a string as they are wrapped in quotes
// we should also check that there aren't more than 1 column in the csv
const bannedListArray = bannedList.split("\n").map((line) =>
  line.replace(/"/g, "")
);
const allowedListArray = allowedList.split("\n").map((line) =>
  line.replace(/"/g, "")
);
const singletonExceptionsArray = singletonExceptions.split("\n").map((line) =>
  line.replace(/"/g, "").trim()
).filter(Boolean); // Filter out any empty lines

export default class CardManager {
  cards: IScryfallCard[];
  bannedList: string[];
  allowedList: string[];
  singletonExceptions: string[];
  constructor() {
    this.cards = [];
    this.bannedList = bannedListArray;
    this.allowedList = allowedListArray;
    this.singletonExceptions = singletonExceptionsArray;

    this.init().then(() => {
      console.log("Card manager initialized");
    });
  }

  async init() {
    // try to load cards from disk for n times where n is the number of attempts we allow
    for (let i = 0; i < 1; i++) {
      try {
        this.loadCards();
      } catch (error) {
        console.error("Error loading cards from disk:", error);
        await this.downloadCards();
      }
    }
  }

  loadCards() {
    // check if cards.json exists
    Deno.statSync(
      new URL("./cards.json", import.meta.url),
    );

    // read cards.json
    this.cards = JSON.parse(
      Deno.readTextFileSync(
        new URL("./cards.json", import.meta.url),
      ),
    ) as IScryfallCard[];

    // date>=rtr f:edh game:paper
    const pdhCards = this.cards.filter((
      card: IScryfallCard,
    ) => {
      // check if card is legal in pioneer and is a paper card
      if (
        (card.legalities.pioneer === "legal" && card.games.includes("paper")) ||
        (allowedListArray.includes(card.name) && card.games.includes("paper"))
      ) {
        return true;
      }
      return false;
    });

    // filter out cards that are banned in pdh
    const pdhPoolFiltered = pdhCards.filter((card) => {
      if (this.bannedList.includes(card.name)) {
        return false;
      }
      return true;
    });

    // push to cards array
    this.cards = pdhPoolFiltered;
  }

  async downloadCards() {
    try {
      // Use AbortController for timeout with proper error handling
      const controller = new AbortController();
      let timeoutId: number | undefined;
      const timeoutMs = 30000; // Generous timeout for large data
      
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      console.log("Fetching Scryfall bulk data information...");
      
      // deno fetch bulk card data from scryfall api with improved error handling
      const response = await fetch(
        "https://api.scryfall.com/bulk-data/oracle-cards",
        {
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
            "User-Agent": "PHL-Legality-Checker",
          },
          // HTTP/2 optimizations
          cache: "force-cache", // Use cache when possible
          keepalive: true, // Keep connection alive for better performance
        }
      );

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bulk card data: ${response.statusText}`);
      }

      const data = await response.json();

      // find bulk data url
      const bulkDataUrl = data.download_uri;

      console.log("Fetching bulk card data from:", bulkDataUrl);

      // Set a new timeout for the actual bulk data download
      const bulkController = new AbortController(); 
      timeoutId = setTimeout(() => bulkController.abort(), 120000); // 2 minute timeout for bulk download
      
      // fetch bulk card data with improved error handling
      const bulkDataResponse = await fetch(bulkDataUrl, {
        signal: bulkController.signal,
        headers: {
          "Accept": "application/json", 
          "User-Agent": "PHL-Legality-Checker",
        },
        cache: "force-cache",
      });

      clearTimeout(timeoutId);
      
      if (!bulkDataResponse.ok) {
        throw new Error(`Failed to fetch bulk card data: ${bulkDataResponse.statusText}`);
      }

      const bulkData = await bulkDataResponse.json();

      console.log(`Successfully downloaded ${bulkData.length} cards from Scryfall`);
      
      // write to disk
      await Deno.writeTextFile(
        new URL("./cards.json", import.meta.url),
        JSON.stringify(bulkData, null, 2),
      );

      // check read
      const cards = JSON.parse(
        await Deno.readTextFile(
          new URL("./cards.json", import.meta.url),
        ),
      ) as IScryfallCard[];

      console.log("Fetched bulk card data:", cards.length);
    } catch (error) {
      console.error("Error fetching bulk card data:", error);
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

  // decklist [{quantity: number, name: string}[]]
  testDecklist(
    deckList: { quantity: number; name: string }[],
    commander: { quantity: number; name: string },
  ): [IScryfallCard[], string[]] {
    const legalcards: IScryfallCard[] = [];
    const illegalcards: string[] = [];

    // check if commander is legal
    const commanderLegal = this.cards.find((c) => c.name === commander.name);

    if (!commanderLegal) {
      illegalcards.push(commander.name);
    } else {
      // add commander to deck
      legalcards.push(commanderLegal);
    }

    // check if cards are legal
    deckList.forEach((card) => {
      const cardName = card.name;
      const quantity = card.quantity;

      // handle DFCs
      // if the card has a card_faces property, we will need to search for a card CONTAINING the name, as DFCs have FRONT // BACK format in the name
      const isDFC = this.cards.find((c) => {
        if (c.card_faces) {
          // if one of the card faces contains the card name, return true
          if (c.card_faces.find((cf) => (cf.name === cardName))) {
            return true;
          }
        }

        return null;
      });

      if (isDFC) {
        // check the color identity of both faces
        legalcards.push(isDFC);
        return;
      }

      // is the card legal
      const cardFound = this.cards.find((c) => c.name === cardName);

      if (!cardFound) {
        illegalcards.push(cardName);
      } else {
        for (let i = 0; i < quantity; i++) {
          legalcards.push(cardFound);
        }
      }
    });

    return [legalcards, illegalcards];
  }

  fetchCard(cardName: string): IScryfallCard | null {
    const card = this.cards.find((c) => c.name === cardName);
    return card || null;
  }

  // Check if a card is allowed to break the singleton rule
  isAllowedToBreakSingletonRule(cardName: string): boolean {
    return this.singletonExceptions.includes(cardName);
  }
}
