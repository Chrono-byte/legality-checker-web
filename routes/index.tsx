export default function Home() {
  return (
    <div class="px-4 py-8 mx-auto">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <header class="w-full text-center mb-8">
          <h1 class="text-4xl font-bold text-green-700">
            Pioneer Highlander
          </h1>
          <p class="mt-2 text-gray-600">
            A singleton format for Pioneer, based on Commander.
          </p>
        </header>

        <section class="mt-6 mb-6 w-full max-w-2xl mx-auto p-6 bg-green-50 rounded-lg shadow-sm">
          <h2 class="text-2xl font-semibold text-green-700 mb-3">
            Format Philosophy
          </h2>
          <div class="prose text-gray-700">
            <p class="mb-2">
              Pioneer Highlander (PHL) was created to combine the strategic
              depth of singleton formats with the balanced and accessible card
              pool of Pioneer.
            </p>
            <p class="mb-2">
              By restricting our card pool to Pioneer-legal cards, we achieve
              several goals:
            </p>
            <ul class="list-disc pl-5 mb-4">
              <li>
                Building on a format actively supported and balanced by Wizards
                of the Coast
              </li>
              <li>
                Creating a diverse metagame where deck-building creativity is
                rewarded
              </li>
              <li>
                Offering a more accessible entry point compared to other
                singleton formats
              </li>
            </ul>
          </div>
        </section>

        <section class="mt-6 mb-6 w-full max-w-2xl mx-auto p-6 bg-green-50 rounded-lg shadow-sm">
          <h2 class="text-2xl font-semibold text-green-700 mb-3">
            Core Rules
          </h2>
          <div class="prose text-gray-700">
            <ul class="list-disc pl-5 mb-4">
              <li>
                Decks must follow all normal Commander deckbuilding rules (
                <a
                  href="https://mtgcommander.net/index.php/rules/"
                  class="text-green-700 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  see Commander rules
                </a>
                )
              </li>
              <li>
                A separate{" "}
                <a href="/banlist" class="text-green-700 hover:underline">
                  banlist
                </a>{" "}
                applies specifically to Pioneer Highlander, which bans the few
                cards in Pioneer that care about your commander
              </li>
            </ul>
            <div class="mt-4 flex justify-center">
              <a
                href="/deck-checker"
                class="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Check Your Deck's Legality
              </a>
            </div>
          </div>
        </section>

        <footer class="mt-8 text-center text-sm text-gray-500">
          <p>
            Created by{" "}
            <a
              href="https://unknownhost.name"
              class="text-green-700 hover:underline"
            >
              Chrono
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
