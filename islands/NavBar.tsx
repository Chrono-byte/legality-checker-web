import { useSignal } from "@preact/signals";

export default function NavBar() {
  const isOpen = useSignal(false);

  const toggleMenu = () => {
    isOpen.value = !isOpen.value;
  };

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
              <span class="text-white font-bold text-xl tracking-tight hidden sm:inline">
                Pioneer Highlander
              </span>
            </a>
          </div>

          {/* Mobile menu button */}
          <div class="flex md:hidden">
            <button
              type="button"
              onClick={toggleMenu}
              class="text-green-50 hover:bg-green-600 inline-flex items-center justify-center p-2 rounded-md"
              aria-expanded={isOpen.value}
              aria-label="Main menu"
            >
              <svg
                class="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isOpen.value
                  ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  )
                  : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
              </svg>
            </button>
          </div>

          {/* Navigation links - Desktop */}
          <div class="hidden md:flex flex-shrink-0">
            <div class="flex items-center space-x-1">
              <a
                href="/philosophy"
                class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Philosophy
              </a>
              <a
                href="/rules"
                class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Rules
              </a>
              <a
                href="/cards"
                class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Card Lists
              </a>
              <a
                href="/deck-checker"
                class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Deck Checker
              </a>
            </div>
          </div>
        </div>

        {/* Mobile menu - Shown below header when menu is open */}
        <div class={`${isOpen.value ? "block" : "hidden"} md:hidden pb-3`}>
          <div class="flex flex-col space-y-1">
            <a
              href="/philosophy"
              class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              Philosophy
            </a>
            <a
              href="/rules"
              class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              Rules
            </a>
            <a
              href="/cards"
              class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              Card Lists
            </a>
            <a
              href="/deck-checker"
              class="text-green-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              Deck Checker
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
