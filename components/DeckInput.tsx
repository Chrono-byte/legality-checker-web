interface DeckInputProps {
  deckUrl: string;
  loading: boolean;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
}

export default function DeckInput(
  { deckUrl, loading, onUrlChange, onSubmit }: DeckInputProps,
) {
  return (
    <div class="bg-white rounded-lg shadow-lg p-8 mb-8 border border-gray-200">
      <form
        class="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading) {
            onSubmit();
          }
        }}
      >
        <label for="deck-url" class="text-xl font-bold text-gray-800">
          Enter Moxfield Deck URL:
        </label>
        <div class="flex flex-col md:flex-row gap-4">
          <input
            id="deck-url"
            type="text"
            value={deckUrl}
            onInput={(e) => onUrlChange((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                e.preventDefault();
                onSubmit();
              }
            }}
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-lg"
            placeholder="https://www.moxfield.com/decks/example"
            disabled={loading}
          />
          <button
            type="submit"
            class={`px-6 py-3 text-lg font-semibold text-white rounded-lg transition-colors ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
            disabled={loading}
          >
            {loading ? "Checking..." : "Check Deck"}
          </button>
        </div>
      </form>
    </div>
  );
}
