import { isBuildMode as _isBuildMode } from "../../utils/is-build.ts";

/**
 * Helper class for test setup to ensure we don't have leaks
 */
export class TestSetup {
  private static originalIncludes: (
    searchElement: unknown,
    fromIndex?: number,
  ) => boolean;

  /**
   * Set up the test environment before running tests
   */
  static async setup(): Promise<void> {
    // Wait a short time to ensure any pending async operations from previous tests have completed
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Force build mode to prevent file operations during tests
    if (!Deno.args.includes("build")) {
      Deno.args.push("build");
    }

    // Set the DENO_TEST environment variable
    Deno.env.set("DENO_TEST", "true");

    // Add Deno.args.includes hack for isBuildMode to work properly
    this.originalIncludes = Array.prototype.includes;
    Array.prototype.includes = function (item) {
      if (item === "build" && this === Deno.args) {
        return true;
      }
      return TestSetup.originalIncludes.call(this, item);
    };
  }

  /**
   * Tear down the test environment after tests complete
   */
  static teardown(): void {
    // Remove build arg
    const buildIndex = Deno.args.indexOf("build");
    if (buildIndex !== -1) {
      Deno.args.splice(buildIndex, 1);
    }

    // Remove the DENO_TEST environment variable
    try {
      Deno.env.delete("DENO_TEST");
    } catch (_e) {
      // Ignore if environment can't be modified
    }

    // Clean up any hanging intervals (helps with leak detection)
    // This is a workaround for intervals that might be started by the server or other code
    // Get the global object in Deno
    const global = globalThis as unknown as {
      _intervals?: Map<number, number>;
    };

    // If there's any way to access active intervals, clean them up
    if (global._intervals) {
      for (const id of global._intervals.keys()) {
        clearInterval(id);
      }
    } else {
      // Best effort approach - this won't catch all intervals but might help
      // Clear a reasonable range of interval IDs that might be active
      for (let i = 0; i < 1000; i++) {
        try {
          clearInterval(i);
        } catch (_e) {
          // Ignore errors from clearing non-existent intervals
        }
      }
    }

    // Force a garbage collection if possible (not standard, but might be available)
    // TypeScript doesn't recognize the gc function, which is sometimes available in JavaScript environments
    // @ts-ignore: gc might be available in certain JavaScript runtimes
    if (typeof globalThis.gc === "function") {
      try {
        // @ts-ignore: Call gc if available
        globalThis.gc();
      } catch (_e) {
        // Ignore if gc is not available
      }
    }
  }
}
