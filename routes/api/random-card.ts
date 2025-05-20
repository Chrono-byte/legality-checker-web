import type { IScryfallCard } from "npm:scryfall-types";
import CardManager from "../../CardManager/CardManager.ts";
import { FreshContext } from "fresh";

export const handler = {
  async GET(_ctx: FreshContext) {
    try {
      // Create a new instance of CardManager
      const cardManager = new CardManager();

      // Fetch a random set of cards
      let cards = await cardManager.getSixCards();

      // Check if cards are available
      if (!cards || cards.length === 0) {
        return new Response(
          JSON.stringify({ error: "No cards available" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Keep necessary card data fields
      cards = cards.map((card) => {
        return {
          name: card.name,
          oracle_id: card.oracle_id,
          image_uris: card.image_uris,
          uri: card.scryfall_uri,
        };
      }) as IScryfallCard[];

      return new Response(
        JSON.stringify(cards),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error fetching random card:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch random card" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
