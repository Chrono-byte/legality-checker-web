import { FreshContext } from "$fresh/server.ts";

// Define types for Moxfield API response
interface MoxfieldCardData {
  card: {
    name: string;
  };
  quantity: number;
}

interface MoxfieldResponse {
  commanders: Record<string, MoxfieldCardData>;
  mainboard: Record<string, MoxfieldCardData>;
}

// Define deck building restrictions
const DECK_SIZE_REQUIREMENT = 100;

export const handler = async (req: Request, _ctx: FreshContext): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const deckId = url.searchParams.get("id");
    
    if (!deckId) {
      return new Response(JSON.stringify({ error: "No deck ID provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch the deck from Moxfield API
    const response = await fetch(`https://api.moxfield.com/v2/decks/all/${deckId}`);
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch deck: ${response.statusText}` }), 
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const moxfieldData = await response.json() as MoxfieldResponse;
    
    // Transform Moxfield data into our expected format
    const cards = [];
    let commander = null;

    // Process commander
    if (moxfieldData.commanders) {
      const commanders = Object.values(moxfieldData.commanders);
      if (commanders.length > 0) {
        const commanderCard = commanders[0];
        commander = {
          quantity: 1,
          name: commanderCard.card.name,
        };
      }
    }
    
    // Process mainboard cards
    if (moxfieldData.mainboard) {
      for (const [, card] of Object.entries(moxfieldData.mainboard)) {
        cards.push({
          quantity: card.quantity,
          name: card.card.name,
        });
      }
    }

    // If we don't have a commander, return an error
    if (!commander) {
      return new Response(
        JSON.stringify({ error: "No commander found in deck" }), 
        {
          status: 400, 
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if there are any cards in the mainboard
    if (cards.length === 0) {
      return new Response(
        JSON.stringify({ error: "Deck contains no cards in the mainboard" }), 
        {
          status: 400, 
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check deck size requirement
    let totalCardCount = 0;
    cards.forEach(card => {
      totalCardCount += card.quantity;
    });
    
    // Add the commander to the total count
    totalCardCount += commander.quantity;
    
    if (totalCardCount !== DECK_SIZE_REQUIREMENT) {
      return new Response(
        JSON.stringify({ 
          error: `Deck size incorrect: contains ${totalCardCount} cards, but needs exactly ${DECK_SIZE_REQUIREMENT} cards`,
          cards,
          commander 
        }), 
        {
          status: 400, 
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check for duplicate card names (except for basic lands)
    const nonBasicCardCounts = new Map<string, number>();
    const possibleBasicLands = ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"];
    
    for (const card of cards) {
      if (!possibleBasicLands.includes(card.name)) {
        if (nonBasicCardCounts.has(card.name)) {
          return new Response(
            JSON.stringify({ 
              error: `Deck contains duplicate copies of "${card.name}" which violates singleton format rules`,
              cards,
              commander 
            }), 
            {
              status: 400, 
              headers: { "Content-Type": "application/json" },
            }
          );
        } else {
          nonBasicCardCounts.set(card.name, card.quantity);
        }
      }
    }

    return new Response(
      JSON.stringify({ cards, commander }), 
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching deck:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};