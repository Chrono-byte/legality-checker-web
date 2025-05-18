import _RandomCardIsland from "../islands/RandomCardIsland.tsx";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <div class="text-center mb-28 pt-12">
        <h1 class="text-5xl font-bold text-green-700 mb-8">
          Pioneer Highlander
        </h1>
        <p class="text-xl text-gray-700 mb-10 max-w-2xl mx-auto">
          A singleton format that brings Commander's variety to Pioneer
        </p>
        <div class="flex justify-center space-x-6">
          <a
            href="/deck-checker"
            class="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
          >
            Check Your Deck
          </a>
          <a
            href="/philosophy"
            class="bg-white hover:bg-green-50 text-green-700 font-bold py-3 px-8 rounded-lg border-2 border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
          >
            Learn More
          </a>
        </div>
      </div>

      {/* Random Card Display */}
      {
        /* <div class="flex justify-center items-center">
        <RandomCardIsland />
      </div> */
      }

      {/* Content Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto px-6 pb-12">
        {/* Format Overview */}
        <div class="bg-white p-10 rounded-lg shadow-sm">
          <h2 class="text-2xl font-semibold text-green-700 mb-6">
            What is Pioneer Highlander?
          </h2>
          <p class="text-gray-600 leading-relaxed">
            Pioneer Highlander combines the best aspects of Commander with
            Pioneer's balanced card pool. Build a 100-card singleton deck with
            your favorite legendary creature as your commander.
          </p>
        </div>

        {/* Getting Started */}
        <div class="bg-white p-10 rounded-lg shadow-sm">
          <h2 class="text-2xl font-semibold text-green-700 mb-6">
            Getting Started
          </h2>
          <ul class="text-gray-600 space-y-3">
            <li>
              • Choose any Pioneer-legal legendary creature as your commander
            </li>
            <li>
              • Build a 100-card singleton deck in your commander's colors
            </li>
            <li>• Use Pioneer-legal cards (with a few special exceptions)</li>
          </ul>
        </div>

        {/* Resources */}
        <div class="bg-white p-10 rounded-lg shadow-sm md:col-span-2">
          <h2 class="text-2xl font-semibold text-green-700 mb-6">
            Resources
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href="/rules"
              class="flex items-center justify-center p-4 text-green-700 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all font-medium group shadow hover:shadow-lg"
            >
              <span class="text-2xl group-hover:scale-110 transition-transform mr-3">
                📋
              </span>
              Complete Format Rules
            </a>
            <a
              href="/cards"
              class="flex items-center justify-center p-4 text-green-700 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all font-medium group shadow hover:shadow-lg"
            >
              <span class="text-2xl group-hover:scale-110 transition-transform mr-3">
                🚫
              </span>
              Card Lists
            </a>
            <a
              href="/deck-checker"
              class="flex items-center justify-center p-4 text-green-700 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all font-medium group shadow hover:shadow-lg"
            >
              <span class="text-2xl group-hover:scale-110 transition-transform mr-3">
                ✓
              </span>
              Deck Legality Checker
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
