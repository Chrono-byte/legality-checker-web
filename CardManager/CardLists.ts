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
   * Initialize the lists synchronously - only use in test mode
   */
  static initializeSync(): void {
    if (this.initialized) return;

    try {
      this._bannedList = parseCardList(
        Deno.readTextFileSync(
          new URL(`${DATA_DIR}/banned_list.csv`, import.meta.url),
        ),
      );
      this._allowedList = parseCardList(
        Deno.readTextFileSync(
          new URL(`${DATA_DIR}/allowed_list.csv`, import.meta.url),
        ),
      );
      this._singletonExceptions = parseCardList(
        Deno.readTextFileSync(
          new URL(`${DATA_DIR}/singleton_exceptions.csv`, import.meta.url),
        ),
      );
      this.initialized = true;
    } catch (error) {
      console.error("Failed to load card lists:", error);
      this._bannedList = [];
      this._allowedList = [];
      this._singletonExceptions = [];
    }
  }

  /**
   * Initialize the lists asynchronously - use in production
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

  /**
   * Initialize lists based on environment
   */
  static async initialize(): Promise<void> {
    if (Deno.env.get("DENO_TEST")) {
      this.initializeSync();
    } else {
      await this.initializeAsync();
    }
  }
}
