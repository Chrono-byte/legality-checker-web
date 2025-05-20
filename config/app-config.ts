export const API_CONFIG = {
  TIMEOUTS: {
    DEFAULT_MS: 15000,
    MAX_MS: 30000,
  },
  CACHE: {
    TTL_MS: 5 * 60 * 1000, // 5 minutes
  },
};

export const VALIDATION = {
  DECK: {
    MAX_SIZE: 100,
    MIN_SIZE: 100,
    MAX_CARD_COPIES: 1,
  },
  CARD_NAME: {
    MAX_LENGTH: 200,
  },
};
