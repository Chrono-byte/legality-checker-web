import ManaSymbol from "./ManaSymbols.tsx";

interface MetricsProps {
  isLegal: boolean;
  colorIdentity: string[];
  deckSize?: number;
  requiredSize?: number;
}

// WUBRG order following the color wheel
const COLOR_ORDER = ["W", "U", "B", "R", "G"] as const;

// Color names for tooltips
const COLOR_NAMES: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
};

// The canonical ordering for two-color combinations (Guilds)
const TWO_COLOR_BASE_ORDERS: Record<string, string[]> = {
  "WU": ["W", "U"], // Azorius
  "WB": ["W", "B"], // Orzhov
  "UB": ["U", "B"], // Dimir
  "UR": ["U", "R"], // Izzet
  "BR": ["B", "R"], // Rakdos
  "BG": ["B", "G"], // Golgari
  "RG": ["R", "G"], // Gruul
  "RW": ["R", "W"], // Boros
  "GW": ["G", "W"], // Selesnya
  "GU": ["G", "U"], // Simic
};

// The canonical ordering for three-color combinations (Shards and Wedges)
const THREE_COLOR_BASE_ORDERS: Record<string, string[]> = {
  // Shards (allied colors)
  "WUB": ["W", "U", "B"], // Esper
  "UBR": ["U", "B", "R"], // Grixis
  "BRG": ["B", "R", "G"], // Jund
  "RGW": ["R", "G", "W"], // Naya
  "GWU": ["G", "W", "U"], // Bant

  // Wedges (enemy colors)
  "WBG": ["W", "B", "G"], // Abzan
  "URW": ["U", "R", "W"], // Jeskai
  "BGU": ["B", "G", "U"], // Sultai
  "RWB": ["R", "W", "B"], // Mardu
  "GUR": ["G", "U", "R"], // Temur
};

// The canonical ordering for four-color combinations
const FOUR_COLOR_BASE_ORDERS: Record<string, string[]> = {
  "WUBR": ["W", "U", "B", "R"], // Yore (Yore-Tiller), Artifice, Non-green
  "UBRG": ["U", "B", "R", "G"], // Glint-Eye, Chaos, Non-white
  "BRGW": ["B", "R", "G", "W"], // Dune (Dune-Brood), Aggression, Non-blue
  "RGWU": ["R", "G", "W", "U"], // Ink-Treader, Altruism, Non-black
  "GWUB": ["G", "W", "U", "B"], // Witch (Witch-Maw), Growth, Non-red
};

function getFourColorOrder(colors: string[]): string[] | null {
  if (colors.length !== 4) return null;

  // Sort the colors to get a canonical form
  const sortedKey = [...colors].sort().join("");

  // Check each base ordering to find a match
  for (const [key, order] of Object.entries(FOUR_COLOR_BASE_ORDERS)) {
    if ([...key].sort().join("") === sortedKey) {
      return order;
    }
  }
  return null;
}

function getThreeColorOrder(colors: string[]): string[] | null {
  // Sort the colors to get a canonical form
  const sortedKey = [...colors].sort().join("");

  // Check each base ordering to find a match
  for (const [key, order] of Object.entries(THREE_COLOR_BASE_ORDERS)) {
    if ([...key].sort().join("") === sortedKey) {
      return order;
    }
  }
  return null;
}

function getTwoColorOrder(colors: string[]): string[] | null {
  // Sort the colors to get a canonical form
  const sortedKey = [...colors].sort().join("");

  // Check each base ordering to find a match
  for (const [key, order] of Object.entries(TWO_COLOR_BASE_ORDERS)) {
    if ([...key].sort().join("") === sortedKey) {
      return order;
    }
  }
  return null;
}

function sortColors(colors: string[]): string[] {
  if (colors.length <= 1) return colors;

  // Handle four-color combinations
  if (colors.length === 4) {
    const order = getFourColorOrder(colors);
    if (order) {
      return order;
    }
  }

  // Handle three-color combinations
  if (colors.length === 3) {
    const order = getThreeColorOrder(colors);
    if (order) {
      return order;
    }
  }

  // Handle two-color combinations (Guilds)
  if (colors.length === 2) {
    const order = getTwoColorOrder(colors);
    if (order) {
      return order;
    }
  }

  // Default to WUBRG order for other cases (including five colors)
  return [...colors].sort(
    (a, b) =>
      COLOR_ORDER.indexOf(a as typeof COLOR_ORDER[number]) -
      COLOR_ORDER.indexOf(b as typeof COLOR_ORDER[number]),
  );
}

export default function DeckMetrics(
  { isLegal, colorIdentity, deckSize, requiredSize }: MetricsProps,
) {
  const sortedColors = sortColors(colorIdentity);

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
        <div class="flex gap-1.5 items-center">
          {sortedColors.length > 0
            ? (
              sortedColors.map((color) => (
                <div
                  key={color}
                  class="w-7 h-7"
                  title={`${COLOR_NAMES[color]} Mana`}
                >
                  <ManaSymbol
                    symbol={color as typeof COLOR_ORDER[number]}
                    className="w-full h-full transition-transform hover:scale-110"
                  />
                </div>
              ))
            )
            : (
              <div class="w-7 h-7" title="Colorless Mana">
                <ManaSymbol
                  symbol="C"
                  className="w-full h-full transition-transform hover:scale-110"
                />
              </div>
            )}
        </div>
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
