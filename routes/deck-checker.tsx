import DeckLegalityChecker from "../islands/DeckLegalityChecker.tsx";

export default function DeckCheckerPage() {
  return (
    <div class="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div class="px-4 py-12 mx-auto">
        <div class="max-w-4xl mx-auto">
          <header class="text-center mb-12">
            <h1 class="text-5xl font-bold text-green-800 mb-4">
              Deck Legality Checker
            </h1>
            <p class="text-xl text-gray-600">
              Verify your deck's legality for Pioneer Highlander
            </p>
          </header>

          <div class="mb-12 bg-white rounded-lg shadow-sm p-8">
            <DeckLegalityChecker />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* How to Use */}
            <section class="bg-white rounded-lg shadow-sm p-8">
              <h2 class="text-2xl font-semibold text-green-700 mb-4">
                How to Use
              </h2>
              <div class="prose text-gray-700">
                <ul class="list-disc pl-6 space-y-2">
                  <li>Create your deck on Moxfield</li>
                  <li>Copy your deck's URL from Moxfield</li>
                  <li>Paste the URL in the checker above</li>
                  <li>Review the results and any warnings</li>
                </ul>
              </div>
            </section>

            {/* Format Requirements */}
            <section class="bg-white rounded-lg shadow-sm p-8">
              <h2 class="text-2xl font-semibold text-green-700 mb-4">
                Format Requirements
              </h2>
              <div class="prose text-gray-700">
                <ul class="list-disc pl-6 space-y-2">
                  <li>100 card singleton deck</li>
                  <li>Pioneer-legal legendary creature as commander</li>
                  <li>All cards must be Pioneer-legal</li>
                  <li>
                    Check the{" "}
                    <a href="/banlist" class="text-green-700 hover:underline">
                      banlist
                    </a>{" "}
                    for additional restrictions
                  </li>
                </ul>
              </div>
            </section>
          </div>

          <footer class="mt-16 text-center text-sm text-gray-500">
            <p>
              Need more information? Check the{" "}
              <a href="/rules" class="text-green-700 hover:underline">
                complete format rules
              </a>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
