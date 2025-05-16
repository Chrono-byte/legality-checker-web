/**
 * Determines if the application is running in build mode
 * Used to conditionally skip certain operations during static site generation
 * @returns {boolean} True if running in build mode, false otherwise
 */
export function isBuildMode(): boolean {
  console.log("Deno.args", Deno.args);

  return Deno.args.includes("build");
}
