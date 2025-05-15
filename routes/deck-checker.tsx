import DeckLegalityChecker from "../islands/DeckLegalityChecker.tsx";

export default function DeckCheckerPage() {
  return (
    <div class="px-4 py-8 mx-auto">
      <div class="max-w-screen-lg mx-auto flex flex-col items-center justify-center">
        <header class="w-full text-center mb-8">
          <h1 class="text-4xl font-bold text-green-700">
            Deck Legality Checker
          </h1>
          <p class="mt-2 text-gray-600">
            Check if your Pioneer Highlander deck is legal for play
          </p>
        </header>

        <div class="w-full">
          <DeckLegalityChecker />
        </div>

        <section class="mt-10 mb-6 w-full max-w-2xl mx-auto p-6 bg-green-50 rounded-lg shadow-sm">
          <h2 class="text-2xl font-semibold text-green-700 mb-3">
            How to Use
          </h2>
          <div class="prose text-gray-700">
            <p class="mb-2">
              You can paste your deck list's link from Moxfield.
            </p>
            <p class="mb-2">
              The checker will verify if your deck follows all Pioneer
              Highlander rules.
            </p>
            <p class="mb-2">
              Be sure to check the{" "}
              <a href="/banlist" class="text-green-700 hover:underline">
                format banlist
              </a>{" "}
              for specific banned and allowed cards.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
