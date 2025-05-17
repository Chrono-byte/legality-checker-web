interface DeckHeaderProps {
  commander: string | null;
  deckSize?: number;
  isLegal?: boolean;
}

export default function DeckHeader(
  { commander, deckSize, isLegal }: DeckHeaderProps,
) {
  if (!commander) return null;

  return (
    <div class="p-6 bg-gray-800 text-white">
      <h2 class="text-3xl font-bold">{commander} Deck</h2>
      {deckSize && (
        <p class="mt-2 text-gray-300">
          {deckSize} total cards {isLegal ? "legal" : "analyzed"}.
        </p>
      )}
    </div>
  );
}
