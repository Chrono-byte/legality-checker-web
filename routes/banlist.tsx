import { Handlers, PageProps } from "$fresh/server.ts";

interface BanlistData {
  bannedCards: string[];
  allowedCards: string[];
}

export const handler: Handlers<BanlistData> = {
  async GET(_, ctx) {
    try {
      // Try to read the cleaned banned list first, fall back to the original if not found
      const bannedListText = await Deno.readTextFile(
        new URL("../load-data/banned_list.csv", import.meta.url),
      );

      const allowedListText = await Deno.readTextFile(
        new URL("../load-data/allowed_list.csv", import.meta.url),
      );

      // Parse the CSV files into arrays of card names
      const bannedCards = bannedListText
        .split("\n")
        .map((line) => line.replace(/"/g, "").trim())
        .filter((line) => line && !line.startsWith("//"));

      const allowedCards = allowedListText
        .split("\n")
        .map((line) => line.replace(/"/g, "").trim())
        .filter((line) => line && !line.startsWith("//"));

      return ctx.render({ bannedCards, allowedCards });
    } catch (error) {
      console.error("Error loading banlist data:", error);
      return ctx.render({ bannedCards: [], allowedCards: [] });
    }
  },
};

export default function Banlist({ data }: PageProps<BanlistData>) {
  const { bannedCards, allowedCards } = data;

  return (
    <div class="px-4 py-8 mx-auto">
      <div class="max-w-screen-lg mx-auto flex flex-col items-center justify-center">
        <header class="w-full text-center mb-8">
          <h1 class="text-4xl font-bold text-green-700">
            Pioneer Highlander Banlist
          </h1>
          <p class="mt-2 text-gray-600">
            Cards that are banned or specifically allowed in Pioneer Highlander
          </p>
        </header>

        <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Banned Cards Section */}
          <section class="w-full p-6 bg-red-50 rounded-lg shadow-sm">
            <h2 class="text-2xl font-semibold text-red-700 mb-4">
              Banned Cards ({bannedCards.length})
            </h2>
            <p class="text-gray-700 mb-4">
              The following cards are banned in Pioneer Highlander. These cards
              would otherwise be legal in the standard PHL format, but are
              banned to help steer the format the direction we prefer.
            </p>
            <div class="max-h-96 overflow-y-auto pr-2">
              <ul class="divide-y divide-red-200">
                {bannedCards.map((card) => (
                  <li key={card} class="py-2 hover:bg-red-100 px-2 rounded">
                    <a
                      href={`https://scryfall.com/search?q=${
                        encodeURIComponent(`!"${card}"`)
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-red-900 hover:text-red-700 hover:underline"
                    >
                      {card}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Allowed Cards Section */}
          <section class="w-full p-6 bg-green-50 rounded-lg shadow-sm">
            <h2 class="text-2xl font-semibold text-green-700 mb-4">
              Specifically Allowed Cards ({allowedCards.length})
            </h2>
            <p class="text-gray-700 mb-4">
              The following cards are specifically allowed in Pioneer
              Highlander, even though they might not be legal in the standard
              Pioneer format. These exceptions are carefully chosen to enhance
              the format.
            </p>
            <div class="max-h-96 overflow-y-auto pr-2">
              <ul class="divide-y divide-green-200">
                {allowedCards.map((card) => (
                  <li key={card} class="py-2 hover:bg-green-100 px-2 rounded">
                    <a
                      href={`https://scryfall.com/search?q=${
                        encodeURIComponent(`!"${card}"`)
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-green-900 hover:text-green-700 hover:underline"
                    >
                      {card}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <div class="mt-8 p-6 bg-blue-50 rounded-lg shadow-sm w-full max-w-3xl">
          <h2 class="text-2xl font-semibold text-blue-700 mb-3">
            About the Banlist
          </h2>
          <div class="prose text-gray-700">
            <p class="mb-2">
              The Pioneer Highlander banlist is designed with a careful
              philosophy to ensure the format remains balanced, diverse, and
              fun, while staying true to the singleton principle and the Pioneer
              card pool.
            </p>

            <h3 class="text-xl font-semibold text-blue-700 mt-4 mb-2">
              Format Philosophy
            </h3>
            <p class="mb-2">
              Pioneer Highlander represents a balanced approach to constructed
              Magic, combining:
            </p>
            <ul class="list-disc pl-5 mb-4">
              <li>
                The strategic depth of singleton formats that reward card
                evaluation and creative deckbuilding
              </li>
              <li>
                The accessibility and balanced power level of the Pioneer card
                pool
              </li>
              <li>
                The variety and engagement of commander-style deckbuilding
                centered around legendary creatures
              </li>
            </ul>

            <h3 class="text-xl font-semibold text-blue-700 mt-4 mb-2">
              Banlist Approach
            </h3>
            <p class="mb-2">
              Our banlist philosophy follows these principles:
            </p>
            <ol class="list-decimal pl-5 mb-4">
              <li>
                <strong>Format Health:</strong>{" "}
                Cards that would create unhealthy play patterns, reduce
                diversity, or lead to repetitive gameplay are restricted
              </li>
              <li>
                <strong>Power Level Balance:</strong>{" "}
                The format aims to maintain a balanced power level where a wide
                variety of strategies can succeed
              </li>
              <li>
                <strong>Strategic Enhancement:</strong>{" "}
                A small curated list of cards is specifically allowed to enhance
                strategic diversity and deckbuilding options
              </li>
            </ol>

            <p class="mb-2">
              Currently there are no additional bans, but we are open to adding
              them as playtesting proves it needed.
            </p>

            {/* Explain the allowed Talismans and Lands */}
            <h3 class="text-xl font-semibold text-blue-700 mt-4 mb-2">
              Specially Allowed Cards:
            </h3>
            <p class="mb-2">
              Specific cards are specifically allowed in Pioneer Highlander,
              even though they might not be legal in the standard Pioneer
              format. These exceptions are carefully chosen to enhance the
              format.
            </p>

            <div class="mt-6 flex justify-center space-x-4">
              <a
                href="/deck-checker"
                class="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Check Your Deck's Legality
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
