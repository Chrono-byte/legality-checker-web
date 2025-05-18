export default function Footer() {
  return (
    <footer class="py-6 bg-green-800">
      <div class="container mx-auto px-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {/* Social Links */}
          <nav class="flex flex-col space-y-1">
            <a
              href="https://discord.gg/pioneerhl"
              class="text-green-50 hover:text-white text-md transition-colors duration-200"
            >
              Discord
            </a>
          </nav>

          {/* Legal Text and Credits */}
          <div class="flex flex-col space-y-2">
            <p class="text-xs text-green-50/80">
              Portions of this site are unofficial Fan Content permitted under
              the Wizards of the Coast Fan Content Policy. The literal and
              graphical information presented about Magic: The Gathering,
              including card images and mana symbols, is copyright Wizards of
              the Coast, LLC. This site is not produced by or endorsed by
              Wizards of the Coast.
            </p>
            <p class="text-sm text-green-50">
              Created by{" "}
              <a
                href="https://unknownhost.name"
                class="text-green-200 hover:text-white hover:underline transition-colors duration-200"
              >
                Chrono
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
