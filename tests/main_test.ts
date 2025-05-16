import { createHandler, ServeHandlerInfo } from "$fresh/server.ts";
import manifest from "../fresh.gen.ts";
import config from "../fresh.config.ts";
import { TestSetup } from "./utils/test-setup.ts";
import { assert, assertEquals } from "$std/assert/mod.ts";

const CONN_INFO: ServeHandlerInfo = {
  remoteAddr: { hostname: "127.0.0.1", port: 53496, transport: "tcp" },
  completed: Promise.resolve(),
};

/**
 * Wait for any pending operations that might have been started by imports
 * This helps avoid the "leaks" error in Deno tests
 */
async function waitForPendingOperations(timeoutMs = 500): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, timeoutMs));
}

/**
 * This test suite tests the main routes of the application to ensure they return
 * the expected responses.
 */
Deno.test("Basic route tests", async (t) => {
  // Force build mode to avoid async file operations
  TestSetup.setup();
  
  // Wait to ensure CardManager and other async initializations complete
  await waitForPendingOperations();
  
  try {
    const handler = await createHandler(manifest, config);

    await t.step("Home page loads successfully", async () => {
      const resp = await handler(new Request("http://127.0.0.1/"), CONN_INFO);
      assertEquals(resp.status, 200);
      
      const text = await resp.text();
      assert(text.includes("Pioneer Highlander"));
      assert(text.includes("Check Your Deck"));
    });

    await t.step("Deck checker page loads successfully", async () => {
      const resp = await handler(new Request("http://127.0.0.1/deck-checker"), CONN_INFO);
      assertEquals(resp.status, 200);
      
      const text = await resp.text();
      assert(text.includes("Deck Legality Checker"));
      assert(text.includes("Verify your deck's legality"));
    });

    await t.step("Banlist page loads successfully", async () => {
      const resp = await handler(new Request("http://127.0.0.1/banlist"), CONN_INFO);
      assertEquals(resp.status, 200);
      
      const text = await resp.text();
      assert(text.includes("Banned Cards"));
    });

    await t.step("Rules page loads successfully", async () => {
      const resp = await handler(new Request("http://127.0.0.1/rules"), CONN_INFO);
      assertEquals(resp.status, 200);
      
      const text = await resp.text();
      assert(text.includes("Format Rules"));
    });

    await t.step("404 page loads for non-existent route", async () => {
      const resp = await handler(new Request("http://127.0.0.1/non-existent"), CONN_INFO);
      assertEquals(resp.status, 404);
      
      const text = await resp.text();
      assert(text.includes("404"));
      assert(text.includes("not found"));
    });
  } finally {
    // Clean up to avoid leaks
    TestSetup.teardown();
    // Give any pending async operations a chance to complete
    await waitForPendingOperations(150); 
  }
});
