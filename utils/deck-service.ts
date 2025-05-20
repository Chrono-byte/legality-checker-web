import { ApiClient, ApiError } from "./api-client.ts";
import type { Card, LegalityResult } from "../types/components.ts";

export interface CommanderBracketResult {
  minimumBracket: number;
  recommendedBracket: number;
  details: {
    minimumBracketReason: string;
    recommendedBracketReason: string;
    bracketRequirementsFailed: string[];
  };
  massLandDenial: string[];
  extraTurns: string[];
  tutors: string[];
  gameChangers: string[];
  twoCardCombos: Array<{ cards: string[]; isEarlyGame: boolean }>;
}

export interface Decklist {
  mainDeck: Card[];
  commander: Card;
}

export class DeckServiceError extends Error {
  override cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "DeckServiceError";
    this.cause = cause;
  }
}

export interface DeckValidationError {
  field: string;
  message: string;
}

export interface DeckValidationResult {
  isValid: boolean;
  errors: DeckValidationError[];
}

export class DeckService {
  private static instance: DeckService;
  private apiClient: ApiClient;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  static getInstance(): DeckService {
    if (!DeckService.instance) {
      DeckService.instance = new DeckService();
    }
    return DeckService.instance;
  }

  async fetchDecklist(deckId: string): Promise<Decklist> {
    try {
      return await this.apiClient.request<Decklist>(
        `/api/fetch-deck?id=${encodeURIComponent(deckId)}`,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw new DeckServiceError(
          `Failed to fetch deck: ${error.message}`,
          error,
        );
      }
      throw new DeckServiceError(
        "Failed to fetch deck",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async checkLegality(decklist: Decklist): Promise<LegalityResult> {
    try {
      return await this.apiClient.request<LegalityResult>(
        "/api/check-legality",
        {
          method: "POST",
          body: decklist,
        },
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw new DeckServiceError(
          `Failed to check legality: ${error.message}`,
          error,
        );
      }
      throw new DeckServiceError(
        "Failed to check legality",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async checkCommanderBracket(
    mainDeck: Card[],
  ): Promise<CommanderBracketResult> {
    try {
      const deckList = mainDeck
        .flatMap((card) => Array(card.quantity).fill(card.name))
        .join("\n");

      const params = new URLSearchParams({ deckList });
      return await this.apiClient.request<CommanderBracketResult>(
        `/api/commander-bracket?${params}`,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw new DeckServiceError(
          `Failed to check commander bracket: ${error.message}`,
          error,
        );
      }
      throw new DeckServiceError(
        "Failed to check commander bracket",
        error instanceof Error ? error : undefined,
      );
    }
  }

  validateDecklist(decklist: Partial<Decklist>): DeckValidationResult {
    const errors: DeckValidationError[] = [];

    if (!decklist.commander) {
      errors.push({
        field: "commander",
        message: "Commander is required",
      });
    }

    if (
      !decklist.mainDeck || !Array.isArray(decklist.mainDeck) ||
      decklist.mainDeck.length === 0
    ) {
      errors.push({
        field: "mainDeck",
        message: "Main deck must contain at least one card",
      });
    } else {
      const invalidCards = decklist.mainDeck.filter(
        (card) =>
          !card.name || typeof card.quantity !== "number" || card.quantity < 1,
      );
      if (invalidCards.length > 0) {
        errors.push({
          field: "mainDeck",
          message: "All cards must have a name and positive quantity",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  extractDeckIdFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (
        urlObj.hostname === "www.moxfield.com" ||
        urlObj.hostname === "moxfield.com"
      ) {
        const parts = urlObj.pathname.split("/").filter((part) => part);
        if (parts.length >= 2) {
          return parts[parts.length - 1];
        }
      }
      throw new Error("Invalid Moxfield URL format");
    } catch (error) {
      throw new DeckServiceError(
        `Could not parse deck URL: ${
          error instanceof Error ? error.message : "Invalid URL"
        }`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
