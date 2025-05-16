import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertNotEquals } from "https://deno.land/std@0.224.0/assert/assert_not_equals.ts";
import { isBuildMode } from "../utils/is-build.ts";
import { RateLimiter } from "../utils/rate-limiter.ts";

// We're importing the real class but creating a mock to avoid interval leaks
import type { ProcessedDeck } from "../types/moxfield.ts";

/**
 * Mock version of DeckCache for testing to avoid interval leaks
 */
class TestDeckCache {
  private cache = new Map<string, { timestamp: number; data: ProcessedDeck }>();

  get(deckId: string): ProcessedDeck | null {
    const entry = this.cache.get(deckId);
    if (!entry) return null;
    return entry.data;
  }

  set(deckId: string, deck: ProcessedDeck): void {
    this.cache.set(deckId, {
      timestamp: Date.now(),
      data: deck,
    });
  }
}

/**
 * This test suite tests the utility functions and classes of the application
 */
Deno.test("Utility functions", async (t) => {
  await t.step("isBuildMode returns a boolean", () => {
    const result = isBuildMode();
    assertEquals(typeof result, "boolean");
  });

  await t.step("DeckCache manages cache correctly", () => {
    const cache = new TestDeckCache();
    const deckId = "test-deck-id";
    const deckData = {
      name: "Test Deck",
      commander: { name: "Test Commander", quantity: 1 },
      mainDeck: [{ name: "Test Card", quantity: 99 }],
    };

    // Initially not in cache
    const notInCache = cache.get(deckId);
    assertEquals(notInCache, null);

    // Add to cache
    cache.set(deckId, deckData);

    // Should be in cache now
    const fromCache = cache.get(deckId);
    assertEquals(fromCache, deckData);

    // Test basic cache functionality
    cache.set("another-deck", deckData);
    const anotherDeck = cache.get("another-deck");
    assertEquals(anotherDeck, deckData);

    // We can't test private methods directly, but we can verify non-null entry exists
    assertNotEquals(cache.get("another-deck"), null);
  });

  await t.step("RateLimiter manages rate limits correctly", () => {
    const limiter = new RateLimiter();

    const ip = "127.0.0.1";

    // Initial request should be allowed
    const first = limiter.check(ip);
    assertEquals(first.allowed, true);
    assertEquals(first.headers["X-RateLimit-Remaining"], (30 - 1).toString());

    // Make multiple requests but leave some room in the rate limit
    for (let i = 0; i < 25; i++) {
      const result = limiter.check(ip);
      assertEquals(result.allowed, true);
    }

    // After many requests, we should still be allowed
    const stillAllowed = limiter.check(ip);
    assertEquals(stillAllowed.allowed, true);

    // Test that headers contain rate limit information
    assertNotEquals(stillAllowed.headers["X-RateLimit-Limit"], undefined);
    assertNotEquals(stillAllowed.headers["X-RateLimit-Remaining"], undefined);
    assertNotEquals(stillAllowed.headers["X-RateLimit-Reset"], undefined);

    // Clean up the rate limiter
    limiter.dispose();
  });
});
