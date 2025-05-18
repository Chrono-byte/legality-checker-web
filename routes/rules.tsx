export default function Rules() {
  return (
    <>
      <header class="text-center mb-12">
        <h1 class="text-5xl font-bold text-green-800 mb-4">
          Format Rules
        </h1>
        <p class="text-xl text-gray-600">
          Complete rules and philosophy for Pioneer Highlander
        </p>
      </header>

      {/* Format Rules Section */}
      <section class="mb-12 bg-white rounded-lg shadow-sm p-8">
        <h2 class="text-3xl font-bold text-green-700 mb-6">Format Rules</h2>

        <div class="space-y-8">
          {/* Deck Construction */}
          <div>
            <h3 class="text-2xl font-semibold text-green-600 mb-4">
              Deck Construction
            </h3>
            <ul class="list-disc pl-6 space-y-2 text-gray-700">
              <li>Your deck must contain exactly 100 cards</li>
              <li>One card must be designated as your commander</li>
              <li>
                All cards must be Pioneer-legal (except specifically allowed
                cards)
              </li>
              <li>
                You can only have one copy of any card in your deck
                (singleton)
              </li>
            </ul>
          </div>

          {/* Commander Rules */}
          <div>
            <h3 class="text-2xl font-semibold text-green-600 mb-4">
              Commander Rules
            </h3>
            <ul class="list-disc pl-6 space-y-2 text-gray-700">
              <li>Your commander must be a legendary creature</li>
              <li>
                Your deck can only include cards within your commander's color
                identity
              </li>
              <li>
                Commander damage and commander tax rules apply as in regular
                Commander
              </li>
            </ul>
          </div>

          {/* Game Rules */}
          <div>
            <h3 class="text-2xl font-semibold text-green-600 mb-4">
              Game Rules
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ul class="list-disc pl-6 space-y-1 text-gray-700">
                <li>40 starting life</li>
                <li>21 commander damage</li>
                <li>Free mulligan</li>
                <li>First player does draw for turn</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section class="bg-white rounded-lg shadow-sm p-8">
        <h2 class="text-3xl font-bold text-green-700 mb-6">
          Format Philosophy
        </h2>
        <div class="prose max-w-none text-gray-700">
          <p class="mb-6">
            Pioneer Highlander represents a balanced approach to constructed
            Magic, combining the strategic depth of singleton formats with the
            accessibility of Pioneer.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 class="text-2xl font-semibold text-green-600 mb-4">
                Format Goals
              </h3>
              <ul class="list-disc pl-6 space-y-2">
                <li>Promote strategic depth and creative deckbuilding</li>
                <li>Maintain accessibility through the Pioneer card pool</li>
                <li>Foster engaging commander-style gameplay</li>
                <li>Support both casual and competitive play</li>
              </ul>
            </div>

            <div>
              <h3 class="text-2xl font-semibold text-green-600 mb-4">
                Banlist Overview
              </h3>
              <p class="mb-4">
                Our banlist is carefully curated to maintain format health and
                diversity. View the complete list and our banlist philosophy
                on the{" "}
                <a href="/banlist" class="text-green-700 hover:underline">
                  banlist page
                </a>
                .
              </p>
            </div>
          </div>

          <div class="mt-12 flex justify-center">
            <a
              href="/deck-checker"
              class="inline-block bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Check Your Deck's Legality
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
