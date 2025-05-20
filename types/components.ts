export interface Card {
  quantity: number;
  name: string;
}

export interface LegalityResult {
  legal: boolean;
  commander: string;
  commanderImageUris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    art_crop?: string;
    border_crop?: string;
  };
  colorIdentity: string[];
  deckSize: number;
  requiredSize: number;
  illegalCards: string[];
  colorIdentityViolations: string[];
  nonSingletonCards: string[];
  legalIssues: {
    size: string | null;
    commander: string | null;
    commanderType: string | null;
    colorIdentity: string | null;
    singleton: string | null;
    illegalCards: string | null;
  };
  error?: string;
}
