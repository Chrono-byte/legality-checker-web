export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <div class="text-center mb-16">
        <h1 class="text-5xl font-bold text-green-700 mb-6">
          Pioneer Highlander
        </h1>
        <p class="text-xl text-gray-700 mb-8">
          A singleton format that brings Commander's variety to Pioneer
        </p>
        <div class="flex justify-center space-x-4">
          <a
            href="/deck-checker"
            class="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
          >
            Check Your Deck
          </a>
          <a
            href="/rules"
            class="bg-white hover:bg-green-50 text-green-700 font-bold py-3 px-8 rounded-lg border-2 border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
          >
            Learn More
          </a>
        </div>
      </div>

      {/* Content Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Format Overview */}
        <div class="bg-white p-8 rounded-lg shadow-sm">
          <h2 class="text-2xl font-semibold text-green-700 mb-4">
            What is Pioneer Highlander?
          </h2>
          <p class="text-gray-600">
            Pioneer Highlander combines the best aspects of Commander with
            Pioneer's balanced card pool. Build a 100-card singleton deck with
            your favorite legendary creature as your commander.
          </p>
        </div>

        {/* Getting Started */}
        <div class="bg-white p-8 rounded-lg shadow-sm">
          <h2 class="text-2xl font-semibold text-green-700 mb-4">
            Getting Started
          </h2>
          <ul class="text-gray-600 space-y-2">
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
        <div class="bg-white p-8 rounded-lg shadow-sm">
          <h2 class="text-2xl font-semibold text-green-700 mb-4">
            Resources
          </h2>
          <div class="space-y-3">
            <a
              href="/rules"
              class="block text-green-700 hover:text-green-800 font-medium"
            >
              📋 Complete Format Rules
            </a>
            <a
              href="/cards"
              class="block text-green-700 hover:text-green-800 font-medium"
            >
              🚫 Card Lists
            </a>
            <a
              href="/deck-checker"
              class="block text-green-700 hover:text-green-800 font-medium"
            >
              ✓ Deck Legality Checker
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
