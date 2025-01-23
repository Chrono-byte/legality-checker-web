import type { IScryfallCard } from "npm:scryfall-types";

export default class LoadCards {
  cards: IScryfallCard[];
  constructor() {
    this.cards = [];

    // check if cards.json exists
    try {
      Deno.statSync(
        "/home/chrono/Documents/Dev/pdh-web/load-data/cards.json",
      );
      
      // read cards.json
      this.cards = JSON.parse(
        Deno.readTextFileSync(
          "/home/chrono/Documents/Dev/pdh-web/load-data/cards.json",
        ),
      ) as IScryfallCard[];
    } catch (_error) {
      console.log("cards.json does not exist");
      this.downloadCards();
    }
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
}
