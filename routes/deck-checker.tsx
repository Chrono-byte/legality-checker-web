import DeckLegalityChecker from "../islands/DeckLegalityChecker.tsx";

export default function DeckCheckerPage() {
  return (
    <div class="flex flex-col gap-8">
      <header class="text-center">
        <h1 class="text-5xl font-bold text-green-800 mb-4">
          Deck Legality Checker
        </h1>
        <p class="text-xl text-gray-600">
          Verify your deck's legality for Pioneer Highlander
        </p>
      </header>

      <section class="bg-white rounded-lg shadow-sm p-8">
        <DeckLegalityChecker />
      </section>

      <section class="bg-white rounded-lg shadow-sm p-8">
        <h2 class="text-2xl font-semibold text-green-700 mb-6">
          How to Use
        </h2>
        <div class="prose text-gray-700 max-w-none">
          <div class="grid md:grid-cols-2 gap-8">
            <div>
              <h3 class="text-xl font-semibold text-green-600 mb-4">Steps</h3>
              <ol class="list-decimal list-inside space-y-2">
                <li>
                  Paste your Moxfield deck URL above and select{" "}
                  <strong>Check Deck</strong>.
                </li>
                <li>
                  The checker will verify your deck for:
                  <ul class="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Card legality in Pioneer</li>
                    <li>Commander color identity</li>
                    <li>100-card singleton format</li>
                    <li>Special allowed/banned cards</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div>
              <h3 class="text-xl font-semibold text-green-600 mb-4">
                Additional Resources
              </h3>
              <ul class="space-y-4">
                <li>
                  <a
                    href="/rules"
                    class="inline-flex items-center text-green-700 hover:text-green-800 font-medium"
                  >
                    <svg
                      class="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Format Rules
                  </a>
                </li>
                <li>
                  <a
                    href="/cards"
                    class="inline-flex items-center text-green-700 hover:text-green-800 font-medium"
                  >
                    <svg
                      class="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    Card Lists
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div class="text-center text-sm text-gray-500">
        <p>
          Need more information? Check the{" "}
          <a href="/rules" class="text-green-700 hover:underline">
            complete format rules
          </a>
        </p>
      </div>
    </div>
  );
}
