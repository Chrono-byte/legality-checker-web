import type { ProcessedDeck } from "../types/moxfield.ts";

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache TTL
const MAX_CACHE_SIZE = 1000; // Maximum number of entries

/**
 * Represents an entry in the deck cache with timestamp for TTL checks
 */
interface CacheEntry {
  /** Time when the entry was added */
  timestamp: number;
  /** The processed deck data */
  data: ProcessedDeck;
}

/**
 * Caches processed decks to avoid repeated API calls
 * Uses a Map for storage with TTL-based expiration
 */
export class DeckCache {
  /** Internal storage for cached deck data */
  private cache = new Map<string, CacheEntry>();

  constructor() {
    // Cleanup old cache entries periodically (every 5 minutes)
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  get(deckId: string): ProcessedDeck | null {
    const entry = this.cache.get(deckId);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL) {
      this.cache.delete(deckId);
      return null;
    }

    return entry.data;
  }

  set(deckId: string, deck: ProcessedDeck): void {
    // Manage cache size - remove oldest entry if at capacity
    if (this.cache.size >= MAX_CACHE_SIZE) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(deckId, {
      timestamp: Date.now(),
      data: deck,
    });
  }

  private cleanup() {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        this.cache.delete(key);
        count++;
      }
    }

    // Log cleanup in development environment
    if (count > 0 && !Deno.env.get("DENO_DEPLOYMENT_ID")) {
      console.log(`Cache cleanup: removed ${count} expired entries`);
    }
  }
}
