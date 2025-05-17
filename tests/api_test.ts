import { createHandler, ServeHandlerInfo } from "$fresh/server.ts";
import manifest from "../fresh.gen.ts";
import config from "../fresh.config.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { TestSetup } from "./utils/test-setup.ts";

const CONN_INFO: ServeHandlerInfo = {
  remoteAddr: { hostname: "127.0.0.1", port: 8000, transport: "tcp" },
  completed: Promise.resolve(),
};

/**
 * Wait for any pending operations that might have been started by imports
 * This helps avoid the "leaks" error in Deno tests
 */
async function waitForPendingOperations(timeoutMs = 500): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

/**
 * This test suite tests the API endpoints of the application
 */
Deno.test("API endpoints", async (t) => {
  // Force build mode to avoid async file operations
  TestSetup.setup();

  // Wait to ensure CardManager and other async initializations complete
  await waitForPendingOperations();

  try {
    const handler = await createHandler(manifest, config);

    await t.step(
      "check-legality API returns 405 for GET requests",
      async () => {
        const resp = await handler(
          new Request("http://127.0.0.1/api/check-legality"),
          CONN_INFO,
        );
        assertEquals(resp.status, 405);

        const data = await resp.json();
        assertEquals(data.error, "Method not allowed");
      },
    );

    await t.step("check-legality API validates request body", async () => {
      // Test with invalid JSON body
      const badRequest = new Request("http://127.0.0.1/api/check-legality", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing commander
          mainDeck: [
            { name: "Island", quantity: 40 },
            { name: "Mountain", quantity: 40 },
            { name: "Forest", quantity: 20 },
          ],
        }),
      });

      const resp = await handler(badRequest, CONN_INFO);
      assertEquals(resp.status, 400);

      const data = await resp.json();
      // The error message might vary, so we just check that there is an error
      assertExists(data.error);
    });

    await t.step("fetch-deck API validates request parameters", async () => {
      const resp = await handler(
        new Request("http://127.0.0.1/api/fetch-deck"),
        CONN_INFO,
      );
      assertEquals(resp.status, 400);

      const data = await resp.json();
      assertEquals(data.error, "No deck ID provided");
    });
  } finally {
    // Clean up to avoid leaks
    TestSetup.teardown();
    // Give any pending async operations a chance to complete
    await waitForPendingOperations(150);
  }
});
