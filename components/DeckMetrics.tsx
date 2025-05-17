interface MetricsProps {
  isLegal: boolean;
  colorIdentity: string[];
  deckSize?: number;
  requiredSize?: number;
}

export default function DeckMetrics(
  { isLegal, colorIdentity, deckSize, requiredSize }: MetricsProps,
) {
  return (
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gray-100">
      {/* Legality Status Metric */}
      <div class="bg-white p-5 rounded-lg shadow flex flex-col items-center">
        <div class="flex items-center mb-2">
          <span class="mr-2 text-2xl">
            {isLegal ? "✅" : "❌"}
          </span>
          <h3 class="font-bold text-xl text-gray-800">
            Legality Status
          </h3>
        </div>
        <p
          class={`text-2xl font-bold ${
            isLegal ? "text-green-600" : "text-red-600"
          }`}
        >
          {isLegal ? "Legal" : "Not Legal"}
        </p>
      </div>

      {/* Color Identity Metric */}
      <div class="bg-white p-5 rounded-lg shadow flex flex-col items-center">
        <div class="flex items-center mb-2">
          <span class="mr-2 text-2xl">🎨</span>
          <h3 class="font-bold text-xl text-gray-800">
            Color Identity
          </h3>
        </div>
        <p class="text-2xl font-bold text-gray-800">
          {colorIdentity.length > 0 ? colorIdentity.join(", ") : "None"}
        </p>
      </div>

      {/* Deck Size Metric */}
      {deckSize && (
        <div class="bg-white p-5 rounded-lg shadow flex flex-col items-center">
          <div class="flex items-center mb-2">
            <span class="mr-2 text-2xl">📏</span>
            <h3 class="font-bold text-xl text-gray-800">Deck Size</h3>
          </div>
          <p class="text-2xl font-bold text-gray-800">
            {deckSize} / {requiredSize}
          </p>
        </div>
      )}
    </div>
  );
}
