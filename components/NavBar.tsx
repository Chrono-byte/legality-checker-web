// import { asset } from "$fresh/runtime.ts";

export default function NavBar() {
  return (
    <nav class="bg-green-800 shadow-lg">
      <div class="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          {/* Logo and brand section */}
          <div class="flex-1 flex items-center justify-start">
            <a
              href="/"
              class="flex items-center space-x-3 group transition-all duration-200"
            >
              <span class="text-xl font-bold tracking-tight bg-gradient-to-r from-yellow-300 via-orange-400 to-cyan-500 bg-clip-text text-transparent select-none">
                PHL
              </span>
              <span class="text-white font-bold text-xl tracking-tight">
                Pioneer Highlander
              </span>
            </a>
          </div>

          {/* Navigation links */}
          <div class="flex-shrink-0">
            <div class="flex items-center space-x-1">
              <a
                href="/"
                class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Home
              </a>
              <a
                href="/deck-checker"
                class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Deck Checker
              </a>
              <a
                href="/rules"
                class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Rules
              </a>
              <a
                href="/banlist"
                class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Banlist
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
