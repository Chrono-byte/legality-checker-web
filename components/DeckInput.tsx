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
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3">
          <label for="deck-url" class="text-xl font-bold text-gray-800">
            Enter Moxfield Deck URL:
          </label>
          <div class="flex flex-col md:flex-row gap-4">
            <input
              id="deck-url"
              type="text"
              value={deckUrl}
              onInput={(e) => onUrlChange((e.target as HTMLInputElement).value)}
              class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-lg"
              placeholder="https://www.moxfield.com/decks/example"
              disabled={loading}
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              class="md:w-auto w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              {loading ? "Analyzing..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
