// Rate limiting configuration - Sliding window
const RATE_LIMIT = 30; // Max requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute window in ms

interface SlidingWindowRateLimitEntry {
  currentWindowStart: number;
  prevWindowCount: number;
  currentWindowCount: number;
}

export class RateLimiter {
  private rateLimitStore = new Map<string, SlidingWindowRateLimitEntry>();
  private cleanupInterval: number;

  constructor() {
    // Cleanup old rate limit entries periodically (every minute)
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  // Add method to clean up when the rate limiter is no longer needed
  dispose() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  check(
    clientIp: string,
  ): {
    allowed: boolean;
    headers: Record<string, string>;
    timeUntilReset?: number;
  } {
    const now = Date.now();
    const entry = this.rateLimitStore.get(clientIp);

    if (!entry) {
      this.rateLimitStore.set(clientIp, {
        currentWindowStart: now,
        prevWindowCount: 0,
        currentWindowCount: 1,
      });
      return {
        allowed: true,
        headers: this.getRateLimitHeaders(RATE_LIMIT - 1, now),
      };
    }

    const elapsed = now - entry.currentWindowStart;
    if (elapsed < RATE_WINDOW) {
      const slidingWindowCount =
        entry.prevWindowCount * (1 - elapsed / RATE_WINDOW) +
        entry.currentWindowCount;

      if (slidingWindowCount >= RATE_LIMIT) {
        const timeUntilReset = RATE_WINDOW - elapsed;
        return {
          allowed: false,
          timeUntilReset,
          headers: this.getRateLimitHeaders(0, now, timeUntilReset),
        };
      }

      entry.currentWindowCount++;
      return {
        allowed: true,
        headers: this.getRateLimitHeaders(
          RATE_LIMIT - Math.ceil(slidingWindowCount) - 1,
          now,
        ),
      };
    }

    // New window
    this.rateLimitStore.set(clientIp, {
      currentWindowStart: now,
      prevWindowCount: entry.currentWindowCount,
      currentWindowCount: 1,
    });

    return {
      allowed: true,
      headers: this.getRateLimitHeaders(RATE_LIMIT - 1, now),
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now - entry.currentWindowStart >= RATE_WINDOW * 2) {
        this.rateLimitStore.delete(key);
      } else if (now - entry.currentWindowStart >= RATE_WINDOW) {
        this.rateLimitStore.set(key, {
          currentWindowStart: entry.currentWindowStart + RATE_WINDOW,
          prevWindowCount: entry.currentWindowCount,
          currentWindowCount: 0,
        });
      }
    }
  }

  private getRateLimitHeaders(
    remaining: number,
    now: number,
    retryAfter?: number,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": RATE_LIMIT.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": Math.floor(
        (now + RATE_WINDOW) / 1000,
      ).toString(),
    };

    if (retryAfter !== undefined) {
      headers["Retry-After"] = Math.ceil(retryAfter / 1000).toString();
    }

    return headers;
  }
}
