/** Directory path for static data files */
const DATA_DIR = "./data";

/**
 * Parses text content into an array of trimmed card names
 */
function parseCardList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/"/g, "").trim())
    .filter(Boolean);
}

/**
 * Class to manage initialization and access to card lists
 */
export class CardLists {
  private static _bannedList: string[] = [];
  private static _allowedList: string[] = [];
  private static _singletonExceptions: string[] = [];
  private static initialized = false;

  static get bannedList(): string[] {
    return this._bannedList;
  }

  static get allowedList(): string[] {
    return this._allowedList;
  }

  static get singletonExceptions(): string[] {
    return this._singletonExceptions;
  }

  /**
   * Add cards to the banned list
   * @param cardNames Names of cards to add to the banned list
   */
  static addToBannedList(cardNames: string[]): void {
    // Only add cards that aren't already in the banned list
    const newBannedCards = cardNames.filter((name) =>
      !this._bannedList.includes(name)
    );
    this._bannedList.push(...newBannedCards);
  }

  /**
   * Initialize the lists with card data
   */
  static async initializeAsync(): Promise<void> {
    if (this.initialized) return;

    try {
      const [banned, allowed, singletons] = await Promise.all([
        Deno.readTextFile(
          new URL(`${DATA_DIR}/banned_list.csv`, import.meta.url),
        ),
        Deno.readTextFile(
          new URL(`${DATA_DIR}/allowed_list.csv`, import.meta.url),
        ),
        Deno.readTextFile(
          new URL(`${DATA_DIR}/singleton_exceptions.csv`, import.meta.url),
        ),
      ]);

      this._bannedList = parseCardList(banned);
      this._allowedList = parseCardList(allowed);
      this._singletonExceptions = parseCardList(singletons);
      this.initialized = true;
    } catch (error) {
      console.error("Failed to load card lists:", error);
      this._bannedList = [];
      this._allowedList = [];
      this._singletonExceptions = [];
      throw error;
    }
  }

  /**
   * Reset all lists and initialization state
   */
  static reset(): void {
    this._bannedList = [];
    this._allowedList = [];
    this._singletonExceptions = [];
    this.initialized = false;
  }
}
