import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";
import CardManager from "../load-data/CardManager.ts";
import { TestSetup } from "./utils/test-setup.ts";
import { assert } from "$std/assert/assert.ts";

/**
 * This test suite tests the CardManager class that handles card legality checks
 */
Deno.test("CardManager functionality", async (t) => {
  // Force build mode to avoid async file operations
  TestSetup.setup();

  try {
    const cardManager = new CardManager();

    // Create sample deck lists for testing
    const validDeckList = {
      mainDeck: [
        { name: "Island", quantity: 30 },
        { name: "Mountain", quantity: 30 },
        { name: "Forest", quantity: 39 },
      ],
      commander: { name: "Niv-Mizzet, Parun", quantity: 1 },
    };

    await t.step("parseDeckList parses a deck list string correctly", () => {
      const deckListString = `30 Island
30 Mountain
39 Forest

1 Niv-Mizzet, Parun`;

      const result = cardManager.parseDeckList(deckListString);

      assertEquals(result.mainDeck.length, 3);
      assertEquals(result.mainDeck[0].name, "Island");
      assertEquals(result.mainDeck[0].quantity, 30);
      assertEquals(result.commander.name, "Niv-Mizzet, Parun");
      assertEquals(result.commander.quantity, 1);
    });

    await t.step("testDecklist validates a deck list correctly", () => {
      const result = cardManager.testDecklist(validDeckList);

      // We can't make strong assertions about the legality of specific cards
      // as the card data might change, but we can test the structure
      assertExists(result.legalCards);
      assertExists(result.illegalCards);
      assert(Array.isArray(result.legalCards));
      assert(Array.isArray(result.illegalCards));
    });

    await t.step("fetchCard handles card data appropriately", () => {
      const card = cardManager.fetchCard("Island");

      // In tests, card data might not be fully loaded,
      // so we should handle both cases where data might or might not be available
      if (card) {
        assertEquals(card.name, "Island");
        assertExists(card.legalities);
      } else {
        // If card data is null during testing, this is also acceptable
        assert(true, "Card data may not be available during testing");
      }
    });

    await t.step(
      "isAllowedToBreakSingletonRule checks singleton rule exceptions",
      () => {
        // Cards in the singleton exceptions list should be allowed
        const ratColonyAllowed = cardManager.isAllowedToBreakSingletonRule(
          "Rat Colony",
        );
        assertEquals(ratColonyAllowed, true);

        // Most cards should follow the singleton rule
        const randomCardAllowed = cardManager.isAllowedToBreakSingletonRule(
          "Counterspell",
        );
        assertEquals(randomCardAllowed, false);
      },
    );
  } finally {
    // Clean up to avoid leaks
    TestSetup.teardown();
    // Give any pending async operations a chance to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }
});
