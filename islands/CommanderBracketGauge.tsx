interface CommanderBracketGaugeProps {
  bracketResult: CommanderBracketResult | null;
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

export default function CommanderBracketGauge(
  { bracketResult, loadingBracket }: CommanderBracketGaugeProps,
) {
  if (loadingBracket) {
    return (
      <div class="flex justify-center items-center p-8">
        <div class="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent">
        </div>
        <span class="ml-3 text-blue-700">Analyzing deck power level...</span>
      </div>
    );
  }

  if (!bracketResult) {
    return (
      <div class="flex flex-col items-center py-4">
        {/* Default Speedometer - SVG Arc */}
        <div class="relative w-64 h-40">
          <svg viewBox="0 0 200 120" class="w-full h-full">
            <path
              d="M 10,110 A 90,90 0 0,1 190,110"
              stroke="#e5e7eb"
              stroke-width="10"
              fill="none"
            />

            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`divider-${i}`}
                x1={10 + 45 * i}
                y1="110"
                x2={10 + 45 * i}
                y2="100"
                stroke="#94a3b8"
                stroke-width="2"
              />
            ))}

            <circle cx="100" cy="110" r="5" fill="#94a3b8" />

            {[1, 2, 3, 4, 5].map((num) => (
              <text
                key={`label-${num}`}
                x={10 + 45 * (num - 1)}
                y="130"
                text-anchor="middle"
                font-size="10"
                font-weight="bold"
                fill="#64748b"
              >
                {num}
              </text>
            ))}
          </svg>
        </div>

        <div class="flex justify-between w-full px-4 mt-2">
          <div class="text-center">
            <div class="text-lg font-bold text-gray-700">Casual</div>
            <div class="text-xs text-gray-500">No tutors</div>
          </div>

          <div class="text-center">
            <div class="text-xs text-blue-600 font-bold">LOADING</div>
          </div>

          <div class="text-center">
            <div class="text-lg font-bold text-gray-700">cEDH</div>
            <div class="text-xs text-gray-500">Competitive</div>
          </div>
        </div>

        <div class="mt-4 bg-white p-3 rounded border border-blue-100">
          <p class="text-sm text-blue-800">
            <span class="font-semibold">Info:</span>{" "}
            Analysis could not be performed. Please try submitting again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div class="flex flex-col items-center py-4">
        {/* Speedometer - SVG Arc */}
        <div class="relative w-64 h-40">
          <svg viewBox="0 0 200 120" class="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10,110 A 90,90 0 0,1 190,110"
              stroke="#e5e7eb"
              stroke-width="10"
              fill="none"
            />

            {/* Section dividers */}
            {Array.from({ length: 5 }, (_, i) => {
              const angle = -180 + (i * 45);
              const x = 100 + 90 * Math.cos(angle * Math.PI / 180);
              const y = 110 + 90 * Math.sin(angle * Math.PI / 180);
              return (
                <g key={i}>
                  {/* Tick marks */}
                  <line
                    x1={x}
                    y1={y}
                    x2={x + 10 * Math.cos(angle * Math.PI / 180)}
                    y2={y + 10 * Math.sin(angle * Math.PI / 180)}
                    stroke="#94a3b8"
                    stroke-width="2"
                  />
                  {/* Labels */}
                  <text
                    x={x}
                    y={y + 20}
                    text-anchor="middle"
                    font-size="10"
                    font-weight="bold"
                    fill={i + 1 === bracketResult.recommendedBracket
                      ? "#1e40af"
                      : i + 1 === bracketResult.minimumBracket
                      ? "#2563eb"
                      : "#64748b"}
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}

            {/* Active arcs */}
            {(() => {
              // Calculate start and end angles
              const startAngle = -180;
              const minAngle = startAngle +
                ((bracketResult.minimumBracket - 1) * 45);
              const recAngle = startAngle +
                ((bracketResult.recommendedBracket - 1) * 45);

              // Calculate points for minimum bracket arc
              const minX = 100 + 90 * Math.cos(minAngle * Math.PI / 180);
              const minY = 110 + 90 * Math.sin(minAngle * Math.PI / 180);

              // Generate path for minimum bracket
              const minPath = `M 10,110 A 90,90 0 0,1 ${minX},${minY}`;

              // If recommended is higher, generate second arc
              let recPath = null;
              if (
                bracketResult.recommendedBracket > bracketResult.minimumBracket
              ) {
                const recX = 100 + 90 * Math.cos(recAngle * Math.PI / 180);
                const recY = 110 + 90 * Math.sin(recAngle * Math.PI / 180);
                recPath = `M ${minX},${minY} A 90,90 0 0,1 ${recX},${recY}`;
              }

              return (
                <>
                  <path
                    d={minPath}
                    stroke="#60a5fa"
                    stroke-width="10"
                    fill="none"
                    stroke-linecap="round"
                  />
                  {recPath && (
                    <path
                      d={recPath}
                      stroke="#facc15"
                      stroke-width="10"
                      fill="none"
                      stroke-linecap="round"
                    />
                  )}
                </>
              );
            })()}

            {/* Needle */}
            {(() => {
              const angle = -180 +
                ((bracketResult.recommendedBracket - 1) * 45);
              const x2 = 100 + 60 * Math.cos(angle * Math.PI / 180);
              const y2 = 110 + 60 * Math.sin(angle * Math.PI / 180);
              return (
                <>
                  <line
                    x1="100"
                    y1="110"
                    x2={x2}
                    y2={y2}
                    stroke="#1e40af"
                    stroke-width="2"
                  />
                  <circle cx="100" cy="110" r="5" fill="#1e40af" />
                </>
              );
            })()}
          </svg>
        </div>

        {/* Labels section */}
        <div class="flex justify-between w-full px-4 mt-2">
          <div class="text-center">
            <div class="text-lg font-bold text-gray-700">Casual</div>
            <div class="text-xs text-gray-500">No tutors</div>
          </div>

          <div class="text-center">
            <div class="text-lg font-bold text-blue-700">
              {[
                "Casual",
                "Focused",
                "Optimized",
                "Competitive",
                "cEDH",
              ][bracketResult.recommendedBracket - 1]}
            </div>
            <div class="text-xs text-blue-600 font-bold">RECOMMENDED</div>
          </div>

          <div class="text-center">
            <div class="text-lg font-bold text-gray-700">cEDH</div>
            <div class="text-xs text-gray-500">Competitive</div>
          </div>
        </div>

        {/* Legend */}
        <div class="flex gap-6 mt-6 text-sm">
          {bracketResult.recommendedBracket !== bracketResult.minimumBracket &&
            (
              <>
                <div class="flex items-center">
                  <div class="w-4 h-4 bg-blue-400 rounded-full mr-2"></div>
                  <span>Minimum ({bracketResult.minimumBracket})</span>
                </div>
                <div class="flex items-center">
                  <div class="w-4 h-4 bg-yellow-400 rounded-full mr-2"></div>
                  <span>Recommended ({bracketResult.recommendedBracket})</span>
                </div>
              </>
            )}
          {bracketResult.recommendedBracket === bracketResult.minimumBracket &&
            (
              <div class="flex items-center">
                <div class="w-4 h-4 bg-blue-400 rounded-full mr-2"></div>
                <span>Power Level: {bracketResult.recommendedBracket}</span>
              </div>
            )}
        </div>
      </div>

      {bracketResult.details.minimumBracketReason && (
        <div class="mt-4 bg-white p-3 rounded border border-blue-100">
          <p class="text-sm text-blue-800">
            <span class="font-semibold">Analysis:</span>{" "}
            {bracketResult.details.minimumBracketReason}
          </p>
        </div>
      )}
    </>
  );
}
