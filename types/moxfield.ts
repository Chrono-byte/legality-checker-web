/** Type definitions for Moxfield API responses */

/**
 * Represents a single card entry from Moxfield API
 */
export interface MoxfieldCardData {
  /** Card information */
  card: {
    /** Name of the card */
    name: string;
  };
  /** Number of copies of the card */
  quantity: number;
}

/**
 * Complete deck data structure from Moxfield API
 */
export interface MoxfieldResponse {
  /** Commander cards in the deck */
  commanders: Record<string, MoxfieldCardData>;
  /** Main deck cards */
  mainboard: Record<string, MoxfieldCardData>;
}

/**
 * Simplified deck structure after processing Moxfield data
 */
export interface ProcessedDeck {
  /** Array of cards in the main deck with quantities */
  mainDeck: Array<{ quantity: number; name: string }>;
  /** The commander card with quantity, or null if no commander */
  commander: { quantity: number; name: string } | null;
}

/** API Response type definitions */

/**
 * Successful deck fetch response
 */
export interface SuccessResponse {
  /** Array of cards in the main deck with quantities */
  mainDeck: Array<{ quantity: number; name: string }>;
  /** The commander card with quantity */
  commander: { quantity: number; name: string };
}

/**
 * Error response when deck fetch fails
 */
export interface ErrorResponse {
  /** Error message describing what went wrong */
  error: string;
  /** Optional retry delay in seconds for rate-limited requests */
  retryAfter?: number;
}
