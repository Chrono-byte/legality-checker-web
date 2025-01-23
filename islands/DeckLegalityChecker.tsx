import type { Signal } from "@preact/signals";
import { Button } from "../components/Button.tsx";

import * as mtgsdk from "npm:mtgsdk@1.0.1";

mtgsdk.

interface DeckCheckerProps {
  decklist: Signal<decklist>;
}

export default function DeckChecker(props: DeckCheckerProps) {
  async function checkDeckLegality() {
    const decklist = await fetchDecklist();
    const legalCards = parsePioneerLegalCards(decklist);
    console.log(legalCards);
  }

  async function fetchDecklist() {
    // fetch deck from moxfield api
    const response = await fetch("https://api.moxfield.com/v1/decks/1");

    if (!response.ok) {
      throw new Error("Failed to fetch decklist");
    }

    return response.json();
  }

  return (
    <div class="flex gap-8 py-6">
      <Button onClick={checkDeckLegality}>Check Deck Legality</Button>
    </div>
  );
}
