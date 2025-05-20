/**
 * Determines if the application is running in build mode
 * Used to conditionally skip certain operations during static site generation
 * @returns {boolean} True if running in build mode, false otherwise
 */
export function isBuildMode(): boolean {
  return Deno.args.includes("build");
}
