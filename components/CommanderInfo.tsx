import CommanderBracketGauge from "../islands/CommanderBracketGauge.tsx";

interface CommanderInfoProps {
  commander: string;
  imageUri?: string;
  isLegal: boolean;
  legalityIssues?: string[];
  bracketResult?: CommanderBracketResult | null;
  loadingBracket: boolean;
}

interface CommanderBracketResult {
  minimumBracket: number;
  recommendedBracket: number;
  details: {
    minimumBracketReason: string;
    recommendedBracketReason: string;
    bracketRequirementsFailed: string[];
  };
  massLandDenial: string[];
  extraTurns: string[];
  tutors: string[];
  gameChangers: string[];
  twoCardCombos: Array<{ cards: string[]; isEarlyGame: boolean }>;
}

export default function CommanderInfo({
  commander,
  imageUri,
  isLegal,
  legalityIssues = [],
  bracketResult,
  loadingBracket,
}: CommanderInfoProps) {
  return (
    <div class="border-t border-gray-200 p-6">
      <div class="flex flex-col md:flex-row gap-8">
        {/* Commander Image */}
        {imageUri && (
          <div class="flex-shrink-0 flex justify-center md:justify-start">
            <img
              src={imageUri}
              alt={commander}
              class="rounded-xl shadow-xl w-auto h-[385px]"
              loading="lazy"
            />
          </div>
        )}

        {/* Commander Info and Issues */}
        <div class="flex-1">
          {/* Legality Issues Alert */}
          {!isLegal && (
            <div class="p-5 bg-red-50 rounded-lg border border-red-200 mb-6">
              <h3 class="text-2xl font-bold text-red-700 mb-3 flex items-center">
                <span class="mr-2">⚠️</span>Legality Issues
              </h3>
              <ul class="space-y-2">
                {legalityIssues.map((issue, index) => (
                  <li
                    key={index}
                    class="text-red-800 flex items-start text-lg"
                  >
                    <span class="mr-2">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Message for Legal Decks */}
          {isLegal && (
            <div class="p-5 bg-green-50 rounded-lg border border-green-200 mb-6">
              <h3 class="text-2xl font-bold text-green-700 flex items-center">
                <span class="mr-2">🏆</span>Legal for Pioneer Highlander
              </h3>
              <p class="mt-2 text-lg text-green-800">
                This deck meets all format requirements!
              </p>
            </div>
          )}

          {/* Commander Brackets */}
          {isLegal && false && (
            <div class="p-5 bg-blue-50 rounded-lg border border-blue-200 mb-6">
              <h3 class="text-2xl font-bold text-blue-700 flex items-center">
                <span class="mr-2">🏵️</span>Commander Bracket
              </h3>
              {bracketResult && (
                <CommanderBracketGauge
                  bracketResult={bracketResult}
                  loadingBracket={loadingBracket}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
