import DeckLegalityChecker from "../islands/DeckLegalityChecker.tsx";

export default function Home() {
  return (
    <div class="px-4 py-8 mx-auto bg-white">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <header class="w-full text-center mb-8">
          <h1 class="text-4xl font-bold text-green-700">
            PHL Legality Checker
          </h1>
          <p class="mt-2 text-gray-600">
            Check if your deck is legal for Pioneer Highlander (PHL)
          </p>
        </header>

        <div class="w-full">
          <DeckLegalityChecker />
        </div>

        <footer class="mt-12 text-center text-sm text-gray-500">
          <p>
            PHL is a format where your commander must be legal in Pioneer, and
            all other cards in your deck must be within your commander's color
            identity and legal in Pioneer.
          </p>
          <p class="mt-2">
            &copy; {new Date().getFullYear()} PHL Legality Checker
          </p>
        </footer>
      </div>
    </div>
  );
}
