import type { IScryfallCard } from "npm:scryfall-types";

// load our banned list and allowed lists
const bannedList = await Deno.readTextFile(
  "/home/chrono/Documents/Dev/pdh-web/load-data/banned_list.csv",
);
const allowedList = await Deno.readTextFile(
  "/home/chrono/Documents/Dev/pdh-web/load-data/allowed_list.csv",
);

// parse the lists into arrays of card names, we must also parse each line as a string as they are wrapped in quotes
// we should also check that there aren't more than 1 column in the csv
const bannedListArray = bannedList.split("\n").map((line) =>
  line.replace(/"/g, "")
);
const allowedListArray = allowedList.split("\n").map((line) =>
  line.replace(/"/g, "")
);

export default class CardManager {
  cards: IScryfallCard[];
  bannedList: string[];
  allowedList: string[];
  constructor() {
    this.cards = [];
    this.bannedList = bannedListArray;
    this.allowedList = allowedListArray;

    // startup routine
    let cycle = 0;
    const maxCycles = 1;

    // try to load cards from disk 3 times
    while (cycle < maxCycles) {
      try {
        this.loadCards();
        break;
      } catch (error) {
        console.error("Error loading cards:", error);
        console.log("Downloading cards...");
        this.downloadCards();
        cycle++;
      }
    }
  }

  loadCards() {
    // check if cards.json exists
    Deno.statSync(
      "/home/chrono/Documents/Dev/pdh-web/load-data/cards.json",
    ); // throws error if file does not exist

    // read cards.json
    this.cards = JSON.parse(
      Deno.readTextFileSync(
        "/home/chrono/Documents/Dev/pdh-web/load-data/cards.json",
      ),
    ) as IScryfallCard[];

    // date>=rtr f:edh game:paper
    const pdhCards = this.cards.filter((
      card: IScryfallCard,
    ) => {
      // if (card.card_faces) {
      //   console.log(card);
      //   process.exit(1);
      // }

      // check if card is in the pdh whitelist
      if (allowedListArray.includes(card.name)) {
        // log that we have encountered a card in the allowed list
        return true;
      }
      // check if card is legal in pioneer and is a paper card
      if (
        card.legalities.pioneer === "legal" && card.games.includes("paper")
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
      // deno fetch bulk card data from scryfall api
      const response = await fetch(
        " https://api.scryfall.com/bulk-data/oracle-cards",
      );

      if (!response.ok) {
        throw new Error("Failed to fetch bulk card data");
      }

      const data = await response.json();

      // find bulk data url
      const bulkDataUrl = data.download_uri;

      console.log("Fetching bulk card data from:", bulkDataUrl);

      console.log("Fetching bulk card data...");

      // fetch bulk card data
      const bulkDataResponse = await fetch(bulkDataUrl);

      if (!bulkDataResponse.ok) {
        throw new Error("Failed to fetch bulk card data");
      }

      const bulkData = await bulkDataResponse.json();

      // write to disk
      await Deno.writeTextFile(
        "/home/chrono/Documents/Dev/pdh-web/load-data/cards.json",
        JSON.stringify(bulkData, null, 2),
      );

      // check read
      const cards = JSON.parse(
        await Deno.readTextFile(
          "/home/chrono/Documents/Dev/pdh-web/load-data/cards.json",
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
      for (let i = 0; i < commander.quantity; i++) {
        legalcards.push(commanderLegal);
      }
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
          return c.card_faces.find((cf) => cf.name.includes(cardName));
        }

        return null;
      });

      if (isDFC) {
        legalcards.push(isDFC);
        return;
      }

      // is the card legal
      const legal = this.cards.find((c) => c.name === cardName);

      if (!legal) {
        illegalcards.push(cardName);
      } else {
        for (let i = 0; i < quantity; i++) {
          legalcards.push(legal);
        }
      }
    });

    return [legalcards, illegalcards];
  }
}
