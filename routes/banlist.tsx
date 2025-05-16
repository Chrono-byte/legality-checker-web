import { Handlers, PageProps } from "$fresh/server.ts";

interface BanlistData {
  bannedCards: string[];
  allowedCards: string[];
}

export const handler: Handlers<BanlistData> = {
  async GET(_, ctx) {
    try {
      const bannedListText = await Deno.readTextFile(
        new URL("../load-data/data/banned_list.csv", import.meta.url),
      );

      const allowedListText = await Deno.readTextFile(
        new URL("../load-data/data/allowed_list.csv", import.meta.url),
      );

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
    <div class="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div class="px-4 py-12 mx-auto">
        <div class="max-w-4xl mx-auto">
          <header class="text-center mb-12">
            <h1 class="text-5xl font-bold text-green-800 mb-4">
              Banlist & Allowances
            </h1>
            <p class="text-xl text-gray-600">
              Cards that are banned or specifically allowed in Pioneer
              Highlander
            </p>
          </header>

          <section class="mb-12 bg-white rounded-lg shadow-sm p-8">
            <div class="prose max-w-none text-gray-700 mb-8">
              <h2 class="text-3xl font-bold text-green-700 mb-6">
                About the Banlist
              </h2>
              <p>
                The Pioneer Highlander banlist is designed to maintain format
                health and diversity while preserving the unique aspects of
                Commander-style gameplay within Pioneer's card pool.
              </p>
              <div class="mt-4">
                <h3 class="text-2xl font-semibold text-green-600 mb-4">
                  Banlist Philosophy
                </h3>
                <ul class="list-disc pl-6 space-y-2">
                  <li>Maintain format health and diversity</li>
                  <li>Balance power level across strategies</li>
                  <li>
                    Allow strategic enhancements through specific allowances
                  </li>
                  <li>Regular review of format health</li>
                </ul>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Banned Cards */}
              <div>
                <h3 class="text-2xl font-semibold text-red-600 mb-4">
                  Banned Cards ({bannedCards.length})
                </h3>
                <div class="bg-red-50 rounded-lg p-4">
                  <div class="max-h-96 overflow-y-auto pr-2">
                    <ul class="divide-y divide-red-200">
                      {bannedCards.map((card) => (
                        <li
                          key={card}
                          class="py-2 hover:bg-red-100 px-2 rounded"
                        >
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
                </div>
              </div>

              {/* Allowed Cards */}
              <div>
                <h3 class="text-2xl font-semibold text-green-600 mb-4">
                  Specifically Allowed ({allowedCards.length})
                </h3>
                <div class="bg-green-50 rounded-lg p-4">
                  <div class="max-h-96 overflow-y-auto pr-2">
                    <ul class="divide-y divide-green-200">
                      {allowedCards.map((card) => (
                        <li
                          key={card}
                          class="py-2 hover:bg-green-100 px-2 rounded"
                        >
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
                </div>
              </div>
            </div>
          </section>

          <div class="mt-12 flex justify-center">
            <a
              href="/deck-checker"
              class="inline-block bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Check Your Deck's Legality
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
