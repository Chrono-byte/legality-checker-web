import { FreshContext } from "fresh";
import { CardLists } from "../CardManager/CardLists.ts";

interface BanlistData {
  bannedCards: string[];
  allowedCards: string[];
}

function BanlistUI({ data }: { data: BanlistData }) {
  const { bannedCards, allowedCards } = data;
  return (
    <>
      <header class="text-center mb-12">
        <h1 class="text-5xl font-bold text-green-800 mb-4">
          Format Card Rules
        </h1>
        <p class="text-xl text-gray-600">
          Cards that are banned or specifically allowed in Pioneer Highlander
        </p>
      </header>

      <section class="mb-12 bg-white rounded-lg shadow-sm p-8">
        <div class="prose max-w-none text-gray-700 mb-8">
          <p>
            These lists are automatically generated and updated with the Deck
            Checker. Pioneer Highlander bans certain cards for balance and
            allows a few extra cards (mainly for mana fixing) to support diverse
            deck building.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Banned Cards */}
          <div>
            <h3 class="text-2xl font-semibold text-red-600 mb-4">
              Banned Cards ({bannedCards.length})
            </h3>

            <p class="text-gray-700 mb-4">
              Cards on this list are not allowed in Pioneer Highlander. All
              Pioneer bans also apply. Cards are banned to maintain format
              diversity and prevent any single strategy from becoming dominant
              in the format.
            </p>

            {/* Explain that currently we don't also follow the commander */}
            <p class="text-gray-700 mb-4 text-sm italic">
              Currently, we do not follow the Commander banlist. This is
              unlikely to change, but if it does, we will update this page.
            </p>

            <div class="bg-red-50 rounded-lg p-4">
              <div class="h-96 overflow-y-auto pr-2">
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
              Allowed Cards ({allowedCards.length})
            </h3>

            <p class="text-gray-700 mb-4">
              Pioneer Highlander allows certain cards from outside Pioneer to
              enhance gameplay variety. These carefully selected additions focus
              on mana-fixing tools that enable more diverse deck building
              strategies while maintaining competitive balance.
            </p>

            <div class="bg-green-50 rounded-lg p-4">
              <div class="h-96 overflow-y-auto pr-2">
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
    </>
  );
}

// Using async route handler pattern for simpler data fetching
export default async function handler(_ctx: FreshContext) {
  try {
    await CardLists.initializeAsync();
    const bannedCards = CardLists.bannedList;
    const allowedCards = CardLists.allowedList;

    return <BanlistUI data={{ bannedCards, allowedCards }} />;
  } catch (error) {
    console.error("Error loading card data:", error);
    return <BanlistUI data={{ bannedCards: [], allowedCards: [] }} />;
  }
}
