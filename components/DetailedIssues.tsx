interface DetailedIssuesProps {
  colorIdentityViolations?: string[];
  nonSingletonCards?: string[];
  illegalCards?: string[];
}

export default function DetailedIssues({
  colorIdentityViolations,
  nonSingletonCards,
  illegalCards,
}: DetailedIssuesProps) {
  if (
    !colorIdentityViolations?.length && !nonSingletonCards?.length &&
    !illegalCards?.length
  ) {
    return null;
  }

  return (
    <div class="border-t border-gray-200">
      <div class="p-6">
        <h3 class="text-2xl font-bold text-gray-800 mb-4">
          Detailed Analysis
        </h3>

        <div class="space-y-8">
          {/* Color Identity Violations */}
          {colorIdentityViolations && colorIdentityViolations.length > 0 && (
            <div class="bg-white p-5 rounded-lg border border-red-200">
              <h4 class="text-xl font-bold text-red-700 mb-3 flex items-center">
                <span class="mr-2">⚠️</span>
                Color Identity Violations ({colorIdentityViolations.length})
              </h4>
              <ul class="grid grid-cols-1 md:grid-cols-2 gap-2">
                {colorIdentityViolations.map((card) => (
                  <li key={card} class="text-red-700 flex items-start">
                    <span class="mr-2">•</span>
                    <span>{card}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Non-Singleton Cards */}
          {nonSingletonCards && nonSingletonCards.length > 0 && (
            <div class="bg-white p-5 rounded-lg border border-red-200">
              <h4 class="text-xl font-bold text-red-700 mb-3 flex items-center">
                <span class="mr-2">⚠️</span>
                Non-Singleton Cards ({nonSingletonCards.length})
              </h4>
              <ul class="grid grid-cols-1 md:grid-cols-2 gap-2">
                {nonSingletonCards.map((card) => (
                  <li key={card} class="text-red-700 flex items-start">
                    <span class="mr-2">•</span>
                    <span>{card}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Illegal Cards */}
          {illegalCards && illegalCards.length > 0 && (
            <div class="bg-white p-5 rounded-lg border border-red-200">
              <h4 class="text-xl font-bold text-red-700 mb-3 flex items-center">
                <span class="mr-2">⚠️</span>
                Illegal Cards ({illegalCards.length})
              </h4>
              <ul class="grid grid-cols-1 md:grid-cols-2 gap-2">
                {illegalCards.map((card) => (
                  <li key={card} class="text-red-700 flex items-start">
                    <span class="mr-2">•</span>
                    <span>{card}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
