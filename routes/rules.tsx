export default function Rules() {
  return (
    <>
      <header class="text-center mb-12">
        <h1 class="text-5xl font-bold text-green-800 mb-4">Format Rules</h1>
        <p class="text-xl text-gray-600 max-w-4xl mx-auto mb-4">
          Pioneer Highlander combines Commander gameplay with the modern Pioneer
          card pool.
        </p>
        <div class="flex justify-center space-x-4">
          <a
            href="/philosophy"
            class="text-green-700 hover:text-green-800 font-medium hover:underline"
          >
            Read about our format philosophy →
          </a>
        </div>
      </header>

      {/* Format Rules Section */}
      <section class="mb-12 bg-white rounded-lg shadow-sm p-8">
        <div class="space-y-10">
          {/* Deck Construction */}
          <div>
            <h3 class="text-2xl font-semibold text-green-600 mb-4">
              Deck Construction Rules
            </h3>
            <ul class="list-disc pl-6 space-y-3 text-gray-700">
              <li>
                Players must choose a legendary creature as their commander
              </li>
              <li>
                A deck must contain exactly 100 cards, including the commander
              </li>
              <li>
                A card's color identity includes its color plus the colors of
                any mana symbols in its rules text
              </li>
              <li>
                Cards in your deck cannot have any colors in their color
                identity which are not in your commander's color identity
              </li>
              <li>
                With the exception of basic lands, no two cards in your deck may
                have the same English name
              </li>
              <li>
                All cards must be Pioneer-legal (Return to Ravnica and forward),
                except for specifically allowed cards
              </li>
            </ul>
          </div>

          {/* Game Rules */}
          <div>
            <h3 class="text-2xl font-semibold text-green-600 mb-4">
              Play Rules
            </h3>
            <div class="bg-green-50 p-6 rounded-lg">
              <ul class="list-disc pl-6 space-y-2 text-gray-700">
                <li>Players begin with 40 life</li>
                <li>
                  A player who has been dealt 21 combat damage by a single
                  commander loses the game
                </li>
                <li>
                  Regular mulligan rules apply, with the exception of the first
                  being free
                </li>
                <li>The player who plays first draws for their first turn</li>
                <li>
                  Turn order proceeds clockwise from the starting player
                </li>
              </ul>
            </div>
          </div>

          {/* Commander Rules */}
          <div>
            <h3 class="text-2xl font-semibold text-green-600 mb-4">
              Commander-Specific Rules
            </h3>
            <ul class="list-disc pl-6 space-y-3 text-gray-700">
              <li>Your commander begins the game in the command zone</li>
              <li>
                You may cast your commander from the command zone at any time
                you could normally cast that creature
              </li>
              <li>
                Each time you cast your commander from the command zone, it
                costs {"{2}"}{" "}
                more for each previous time you've cast it from the command zone
              </li>
              <li>
                If your commander would go to your hand, library, graveyard, or
                exile, you may instead put it into the command zone
              </li>
              <li>
                Being a commander is a property of the physical card and cannot
                be copied or overwritten by effects
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
