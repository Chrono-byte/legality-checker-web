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
              Pioneer Highlander is unofficial Fan Content permitted under the
              Fan Content Policy. Not approved/endorsed by Wizards. Portions of
              the materials used are property of Wizards of the Coast. © Wizards
              of the Coast LLC.
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
