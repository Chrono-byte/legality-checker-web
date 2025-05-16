// Moxfield API response types
export interface MoxfieldCardData {
  card: {
    name: string;
  };
  quantity: number;
}

export interface MoxfieldResponse {
  commanders: Record<string, MoxfieldCardData>;
  mainboard: Record<string, MoxfieldCardData>;
}

export interface ProcessedDeck {
  cards: Array<{ quantity: number; name: string }>;
  commander: { quantity: number; name: string } | null;
}

// API response types
export interface SuccessResponse {
  cards: Array<{ quantity: number; name: string }>;
  commander: { quantity: number; name: string };
}

export interface ErrorResponse {
  error: string;
  retryAfter?: number;
}
