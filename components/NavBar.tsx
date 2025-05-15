import { asset } from "$fresh/runtime.ts";

export default function NavBar() {
  return (
    <nav class="bg-green-700 shadow-md">
      <div class="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <a href="/" class="flex items-center">
                <img
                  class="h-8 w-auto mr-2"
                  src={asset("logo.svg")}
                  alt="Pioneer Highlander Logo"
                />
                <span class="text-white font-bold text-xl">
                  Pioneer Highlander
                </span>
              </a>
            </div>
          </div>
          <div class="flex">
            <div class="ml-4 flex items-center space-x-4">
              <a
                href="/"
                class="text-green-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </a>
              <a
                href="/deck-checker"
                class="text-green-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Deck Checker
              </a>
              <a
                href="/banlist"
                class="text-green-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
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
