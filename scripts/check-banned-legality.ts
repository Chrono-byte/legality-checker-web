// This script checks if cards on the banned list are already not legal in Pioneer

import { delay } from "https://deno.land/std@0.224.0/async/delay.ts";

// Read the banned list
const bannedList = await Deno.readTextFile(
  new URL("../load-data/banned_list.csv", import.meta.url),
);

// Parse the list into an array of card names
const bannedCards = bannedList.split("\n")
  .map((line) => line.replace(/"/g, "").trim())
  .filter(Boolean); // Remove empty lines

console.log(`Total banned cards: ${bannedCards.length}`);

// Function to check Pioneer legality via Scryfall API with improved error handling and retry logic
async function checkPioneerLegality(cardName: string): Promise<{
  name: string;
  isPioneerLegal: boolean;
}> {
  const maxRetries = 2;
  let retries = 0;
  let timeoutId: number | undefined;

  while (retries <= maxRetries) {
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutMs = 10000 + (retries * 5000); // Increase timeout with each retry

      // Set timeout with proper type handling
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const encodedName = encodeURIComponent(cardName);
      const response = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodedName}`,
        {
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
            "User-Agent": "PHL-Legality-Checker",
          },
          // HTTP/2 optimizations
          cache: "force-cache", // Use cache when possible
          keepalive: true, // Keep connection alive for better performance
        },
      );

      clearTimeout(timeoutId);
      timeoutId = undefined;

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        retries++;
        if (retries <= maxRetries) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : 1000 * Math.pow(2, retries);
          console.log(
            `Rate limited when fetching ${cardName}. Retrying in ${
              waitTime / 1000
            }s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
      }

      if (!response.ok) {
        console.error(
          `Failed to fetch card: ${cardName} (${response.status}: ${response.statusText})`,
        );
        return { name: cardName, isPioneerLegal: false };
      }

      const cardData = await response.json();
      const isPioneerLegal = cardData.legalities?.pioneer === "legal";

      return {
        name: cardName,
        isPioneerLegal,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      timeoutId = undefined;

      if (error instanceof Error) {
        // For timeout or network errors, retry if possible
        if (
          error.name === "AbortError" ||
          error.name === "TypeError" ||
          error.message.includes("network")
        ) {
          retries++;
          if (retries <= maxRetries) {
            const backoffTime = 1000 * Math.pow(2, retries);
            console.log(
              `Network error when fetching ${cardName}. Retrying in ${
                backoffTime / 1000
              }s...`,
            );
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
            continue;
          }
        }
      }

      console.error(`Error checking ${cardName}:`, error);
      return { name: cardName, isPioneerLegal: false };
    }
  }

  // This will only be reached if all retries failed
  return { name: cardName, isPioneerLegal: false };
}

// Process cards in batches with improved handling for rate limits and failures
const batchSize = 15; // Increased size with better retry handling
const delayBetweenBatches = 800; // Slightly faster processing with better backoff
const results: { name: string; isPioneerLegal: boolean }[] = [];

console.log("Checking Pioneer legality for banned cards...");

// Track failed requests for retry
const failedCards: string[] = [];

// Process in batches to avoid overwhelming the API
for (let i = 0; i < bannedCards.length; i += batchSize) {
  try {
    const batch = bannedCards.slice(i, i + batchSize);

    // Process each batch with controlled concurrency
    const batchResults = await Promise.allSettled(
      batch.map((card) => checkPioneerLegality(card)),
    );

    // Handle results and track any failed requests
    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error(
          `Failed to process card: ${batch[index]}:`,
          result.reason,
        );
        failedCards.push(batch[index]);
      }
    });

    console.log(
      `Processed ${
        Math.min(i + batchSize, bannedCards.length)
      }/${bannedCards.length} cards (${failedCards.length} failed)`,
    );

    // Add delay between batches to avoid overwhelming the API
    if (i + batchSize < bannedCards.length) {
      await delay(delayBetweenBatches);
    }
  } catch (error) {
    console.error(`Error processing batch starting at index ${i}:`, error);
    // Add the whole batch to failed cards
    failedCards.push(...bannedCards.slice(i, i + batchSize));
  }
}

// Retry failed cards if there are any
if (failedCards.length > 0) {
  console.log(
    `\nRetrying ${failedCards.length} failed cards with longer timeout...`,
  );

  // Retry with more aggressive timeout and delay
  for (const card of failedCards) {
    try {
      const result = await checkPioneerLegality(card);
      results.push(result);
      console.log(`Successfully retried card: ${card}`);
      // Add a small delay between retries
      await delay(500);
    } catch (_retryError) {
      console.error(`Failed to process card even after retry: ${card}`);
      // Add a placeholder result for the card
      results.push({ name: card, isPioneerLegal: false });
    }
  }
}

// Filter out cards that are not Pioneer legal to begin with
const unnecessaryBannedCards = results.filter((card) => !card.isPioneerLegal);

console.log(
  "\nCards on the banned list that are not Pioneer legal (unnecessary to ban):",
);
unnecessaryBannedCards.forEach((card) => {
  console.log(`- ${card.name}`);
});
console.log(
  `\nTotal unnecessary banned cards: ${unnecessaryBannedCards.length}`,
);

// Write results to a file
const resultText =
  `# Cards on the banned list that are not Pioneer legal (unnecessary to ban)
${unnecessaryBannedCards.map((card) => card.name).join("\n")}

Total: ${unnecessaryBannedCards.length} cards`;

await Deno.writeTextFile("unnecessary-banned-cards.txt", resultText);
console.log("\nResults written to unnecessary-banned-cards.txt");
