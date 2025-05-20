export default function Philosophy() {
  return (
    <>
      <header class="text-center mb-12">
        <h1 class="text-5xl font-bold text-green-800 mb-4">
          Format Philosophy
        </h1>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
          Understanding the vision and goals behind Pioneer Highlander
        </p>
      </header>

      <section class="bg-white rounded-lg shadow-sm p-8">
        <div class="prose max-w-4xl mx-auto text-gray-700">
          <p class="text-lg mb-12">
            Pioneer Highlander's use of the Pioneer card pool is intentional.
            Modern Magic design provides a more structured color pie where each
            color's strengths and limitations are clearly defined. This creates
            both an accessible entry point and a more balanced gameplay
            experience, free from many of the color pie breaks and power level
            inconsistencies found in older formats.
          </p>

          <div class="space-y-12">
            <div>
              <div class="bg-green-50 rounded-lg p-8 mb-4">
                <h3 class="text-2xl font-semibold text-green-700 mb-4">
                  Modern Design
                </h3>
                <p class="text-gray-800">
                  Pioneer Highlander embraces Magic's modern design
                  philosophies. By using the Pioneer card pool, we ensure games
                  are played with cards that reflect current understandings of
                  the color pie, power level, and balanced gameplay mechanics.
                  This creates an environment where strategy is clear and
                  interactions are intuitive.
                </p>
              </div>
              <div class="flex justify-end">
                <a
                  href="#creative-balance"
                  class="text-green-700 hover:text-green-800 font-medium group"
                >
                  Learn about format balance
                  <span class="inline-block transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </div>
            </div>

            <div>
              <div
                id="creative-balance"
                class="bg-green-50 rounded-lg p-8 mb-4"
              >
                <h3 class="text-2xl font-semibold text-green-700 mb-4">
                  Creative Balance
                </h3>
                <p class="text-gray-800">
                  Our format strikes a balance between creativity and
                  competitive viability. The Pioneer card pool offers enough
                  depth for diverse strategies while maintaining consistent
                  power levels. This allows players to express themselves
                  through deckbuilding without worrying about facing
                  dramatically mismatched power levels.
                </p>
              </div>
              <div class="flex justify-end">
                <a
                  href="#format-evolution"
                  class="text-green-700 hover:text-green-800 font-medium group"
                >
                  See how the format evolves
                  <span class="inline-block transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </div>
            </div>

            <div>
              <div
                id="format-evolution"
                class="bg-green-50 rounded-lg p-8 mb-4"
              >
                <h3 class="text-2xl font-semibold text-green-700 mb-4">
                  Format Evolution
                </h3>
                <p class="text-gray-800">
                  As a Pioneer-based format, PHL naturally grows alongside
                  Magic's contemporary design space. This means the format stays
                  fresh with new sets while maintaining a carefully curated card
                  pool that avoids many of the complex rules interactions and
                  power level concerns found in older cards.
                </p>
              </div>
              <div class="flex justify-end">
                <a
                  href="/rules"
                  class="text-green-700 hover:text-green-800 font-medium group"
                >
                  Read the format rules
                  <span class="inline-block transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
