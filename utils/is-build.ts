export function isBuildMode(): boolean {
  return Deno.args.includes("build");
}
