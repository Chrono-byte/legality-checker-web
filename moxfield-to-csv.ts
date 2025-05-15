#!/usr/bin/env -S deno run --allow-net --allow-write --allow-read

// Define types for Moxfield API response
interface MoxfieldCardData {
  card: {
    name: string;
  };
  quantity: number;
}

interface MoxfieldResponse {
  commanders: Record<string, MoxfieldCardData>;
  mainboard: Record<string, MoxfieldCardData>;
}

/**
 * Shows help information for the script
 */
function showHelp(): void {
  console.log(`Moxfield to CSV Converter
-------------------------
Fetches a Moxfield deck by URL and converts it to CSV format with each card name on its own line, wrapped in quotes.

Usage:
  moxfield-to-csv [options] [URL]

Options:
  -h, --help              Show this help message
  -o, --output FILENAME   Save output to a file instead of printing to console
  -s, --single-column     Output in single column format (card names only, no quantities)

Examples:
  moxfield-to-csv https://www.moxfield.com/decks/example-deck-id
  moxfield-to-csv https://www.moxfield.com/decks/example-deck-id -o mydeck.csv
  moxfield-to-csv https://www.moxfield.com/decks/example-deck-id -s

If no URL is provided, the script will run in interactive mode.`);
}

/**
 * Extracts the deck ID from a Moxfield URL
 * Handles both formats:
 * - https://www.moxfield.com/decks/[deck-id]
 * - https://www.moxfield.com/decks/[deck-id]/[deck-name]
 */
function extractDeckId(url: string): string | null {
  try {
    // Fast path - If URL is just an ID already, return it directly
    if (/^[a-zA-Z0-9_-]+$/.test(url)) {
      return url;
    }

    // Check if URL contains expected pattern before parsing
    if (!url.includes("moxfield.com")) {
      return null;
    }

    const parsedUrl = new URL(url);

    // Use regex to extract the ID more efficiently
    const match = parsedUrl.pathname.match(/\/decks\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    console.error("Error parsing URL:", error);
    return null;
  }
}

/**
 * Fetches a deck from Moxfield API with retry logic and HTTP/2 optimizations
 * @param deckId The Moxfield deck ID
 * @param maxRetries Number of retries on failure (default: 3)
 * @returns The deck data or null if not found after retries
 */
async function fetchDeckFromAPI(
  deckId: string,
  maxRetries = 3,
): Promise<MoxfieldResponse | null> {
  let retries = 0;
  let timeoutId: number | null = null;

  while (retries <= maxRetries) {
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutMs = 15000 + (retries * 5000); // Increase timeout with each retry
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      if (retries > 0) {
        console.log(
          `Retrying fetch for deck with ID: ${deckId} (attempt ${retries}/${maxRetries})`,
        );
      } else {
        console.log(`Fetching deck with ID: ${deckId}`);
      }

      // Fetch with timeout, custom headers and HTTP/2 optimizations
      const response = await fetch(
        `https://api.moxfield.com/v2/decks/all/${deckId}`,
        {
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
            "User-Agent": "Moxfield-CSV-Exporter",
          },
          // HTTP/2 optimizations
          cache: "force-cache", // Use cache when possible
          keepalive: true, // Keep connection alive for better performance
        },
      );

      clearTimeout(timeoutId);
      timeoutId = null;

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "5",
          10,
        );
        console.log(
          `Rate limited. Waiting ${retryAfter} seconds before retry.`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        retries++;
        continue;
      }

      if (!response.ok) {
        console.error(`Failed to fetch deck: ${response.statusText}`);
        if (response.status >= 500) {
          // Server error, retry
          retries++;
          if (retries <= maxRetries) {
            const backoffTime = 2000 * retries;
            console.log(
              `Server error, waiting ${
                backoffTime / 1000
              } seconds before retry...`,
            );
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
            continue;
          }
        }
        return null; // Client error or max retries reached
      }

      const data = await response.json() as MoxfieldResponse;
      return data;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.error(
            `Request timeout fetching deck (attempt ${retries}/${maxRetries})`,
          );
        } else {
          console.error(
            `Error fetching deck (attempt ${retries}/${maxRetries}):`,
            error,
          );
        }
      }

      retries++;
      if (retries <= maxRetries) {
        // Wait before retrying with exponential backoff
        const backoffTime = 1000 * Math.pow(2, retries);
        console.log(`Waiting ${backoffTime / 1000} seconds before retry...`);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        continue;
      }

      return null; // Failed after all retries
    }
  }

  return null; // Should never reach here, but TypeScript wants a return
}

/**
 * Stream-based approach for writing deck data directly to file
 * This avoids loading the entire deck into memory
 * @param deckUrl The URL of the Moxfield deck
 * @param fileName The output file name
 * @param singleColumn If true, output only card names without quantities
 * @returns True if successful, false otherwise
 */
async function writeCsvStreamingToFile(
  deckUrl: string,
  fileName: string,
  singleColumn: boolean = false,
): Promise<boolean> {
  try {
    const deckId = extractDeckId(deckUrl);
    if (!deckId) {
      console.error(
        "Invalid Moxfield URL. Expected format: https://www.moxfield.com/decks/[deck-id]",
      );
      return false;
    }

    // Fetch the deck
    const moxfieldData = await fetchDeckFromAPI(deckId);

    if (!moxfieldData) {
      return false;
    }

    // Process card data
    const commanderCards: string[] = [];
    const mainDeckEntries: [string, number][] = [];

    // Process commanders
    if (moxfieldData.commanders) {
      Object.values(moxfieldData.commanders).forEach((card) => {
        commanderCards.push(card.card.name);
      });
    }

    // Process mainboard cards
    if (moxfieldData.mainboard) {
      const tempCardCounts: Record<string, number> = {};

      Object.values(moxfieldData.mainboard).forEach((card) => {
        const name = card.card.name;
        tempCardCounts[name] = (tempCardCounts[name] || 0) + card.quantity;
      });

      mainDeckEntries.push(
        ...Object.entries(tempCardCounts)
          .sort((a, b) => a[0].localeCompare(b[0])),
      );
    }

    // Check if we have any cards
    if (mainDeckEntries.length === 0 && commanderCards.length === 0) {
      console.error("No cards found in the deck");
      return false;
    }

    // Open file for streaming write
    const file = await Deno.open(fileName, {
      write: true,
      create: true,
      truncate: true,
    });
    const encoder = new TextEncoder();
    let bytesWritten = 0;

    // Stream write main deck
    if (singleColumn) {
      // Single column format
      for (const [name, quantity] of mainDeckEntries) {
        for (let i = 0; i < quantity; i++) {
          const line = `"${name}"\n`;
          bytesWritten += await file.write(encoder.encode(line));
        }
      }
    } else {
      // Two column format
      for (const [name, quantity] of mainDeckEntries) {
        const line = `"${name}","${quantity}"\n`;
        bytesWritten += await file.write(encoder.encode(line));
      }
    }

    // Stream write commanders
    if (commanderCards.length > 0) {
      // Add separator
      bytesWritten += await file.write(encoder.encode("\n"));

      // Write commanders
      for (const name of commanderCards) {
        const line = singleColumn ? `"${name}"` : `"${name}","1"`;
        bytesWritten += await file.write(encoder.encode(line));
      }
    }

    file.close();
    console.log(`Wrote ${bytesWritten} bytes to ${fileName}`);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing deck: ${errorMessage}`);
    return false;
  }
}

// Main function
async function main() {
  // Get URL and output options from command line arguments or prompt the user
  const args = Deno.args;
  let deckUrl: string;
  let outputToFile = false;
  let outputFileName = "";
  let singleColumn = false;

  /**
   * Parse command line arguments more efficiently using a single pass
   * This avoids multiple array scans and splices which are O(n) operations
   */
  function parseArguments(args: string[]): {
    deckUrl: string;
    outputToFile: boolean;
    outputFileName: string;
    singleColumn: boolean;
    showHelp: boolean;
  } {
    // Default values
    let deckUrl = "";
    let outputToFile = false;
    let outputFileName = "";
    let singleColumn = false;
    let showHelp = false;

    // Single-pass parsing
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // Handle flags
      if (arg === "-h" || arg === "--help") {
        showHelp = true;
        break;
      } else if (arg === "-s" || arg === "--single-column") {
        singleColumn = true;
      } else if ((arg === "-o" || arg === "--output") && i + 1 < args.length) {
        outputToFile = true;
        outputFileName = args[++i]; // Increment i to skip the next argument
      } else if (!arg.startsWith("-") && !deckUrl) {
        // First non-flag argument is the URL
        deckUrl = arg;
      }
    }

    return { deckUrl, outputToFile, outputFileName, singleColumn, showHelp };
  }

  // Process command line arguments
  if (args.length > 0) {
    const parsedArgs = parseArguments(args);

    if (parsedArgs.showHelp) {
      showHelp();
      Deno.exit(0);
    }

    singleColumn = parsedArgs.singleColumn;
    outputToFile = parsedArgs.outputToFile;
    outputFileName = parsedArgs.outputFileName;

    if (parsedArgs.deckUrl) {
      deckUrl = parsedArgs.deckUrl;
    } else {
      console.log("Enter Moxfield deck URL:");
      deckUrl = prompt("") || "";
    }
  } else {
    console.log("Enter Moxfield deck URL:");
    deckUrl = prompt("") || "";

    console.log("Use single column format (card names only)? (y/n):");
    const singleColResponse = prompt("") || "n";
    singleColumn = singleColResponse.toLowerCase() === "y" ||
      singleColResponse.toLowerCase() === "yes";

    console.log("Save to file? (y/n):");
    const saveToFile = prompt("") || "n";
    if (
      saveToFile.toLowerCase() === "y" || saveToFile.toLowerCase() === "yes"
    ) {
      outputToFile = true;
      console.log("Enter filename (default: deck.csv):");
      outputFileName = prompt("") || "deck.csv";
    }
  }

  if (!deckUrl) {
    console.error("No URL provided. Exiting.");
    Deno.exit(1);
  }

  // Process the deck using streaming for all operations
  if (outputToFile) {
    const fileName = outputFileName ||
      `deck-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    console.log(`Writing to file: ${fileName}`);
    const success = await writeCsvStreamingToFile(
      deckUrl,
      fileName,
      singleColumn,
    );
    if (!success) {
      console.error("Failed to write deck to file.");
      Deno.exit(1);
    }
    console.log(`\nDeck successfully written to ${fileName}`);
  } else {
    // For console output, we'll use a temporary file and then read it
    const tempFileName = `temp-deck-${Date.now()}.csv`;
    const success = await writeCsvStreamingToFile(
      deckUrl,
      tempFileName,
      singleColumn,
    );

    if (!success) {
      console.error("Failed to convert deck to CSV.");
      Deno.exit(1);
    }

    try {
      // Read file stats to get size
      const fileInfo = await Deno.stat(tempFileName);
      const fileSize = fileInfo.size;

      console.log("\nCSV Output:\n");

      // For larger files, show a preview
      // Show a preview if the file is larger than 4000 bytes
      if (fileSize > 2000) {
        const file = await Deno.open(tempFileName);
        const buffer = new Uint8Array(1000);
        await file.read(buffer);
        file.close();

        const decoder = new TextDecoder();
        const preview = decoder.decode(buffer).trim();

        // Count lines in the file
        const fileContent = await Deno.readTextFile(tempFileName);
        const lineCount = fileContent.split("\n").length;

        console.log(`${preview}...\n[${lineCount} rows total]`);
      } else {
        // Small file, display all content
        const content = await Deno.readTextFile(tempFileName);
        console.log(content);
      }

      // Clean up the temporary file
      await Deno.remove(tempFileName);

      console.log(
        "\nTo save this output to a file, run the command with the -o flag:",
      );
      console.log(
        `moxfield-to-csv "${deckUrl}" -o deck.csv`,
      );
    } catch (error) {
      console.error("Error reading temporary file:", error);
      // Try to clean up even if there was an error
      try {
        await Deno.remove(tempFileName);
      } catch (_) {
        // Ignore cleanup errors
      }
      Deno.exit(1);
    }
  }
}

// Run the main function
if (import.meta.main) {
  await main();
}
