import { useState } from "preact/hooks";
import type { IScryfallCard } from "npm:scryfall-types";

interface RandomCardProps {
  card: IScryfallCard;
  onNewCard?: () => void;
}

export default function RandomCard({ card, onNewCard }: RandomCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const imageUri = card.image_uris?.normal ||
    (card.card_faces?.[0].image_uris?.normal);

  if (!imageUri) return null;

  return (
    <div class="flex flex-col items-center">
      <div
        class="relative transition-all duration-300 ease-in-out transform hover:scale-105 hover:-translate-y-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          filter: isHovered
            ? "drop-shadow(0 0 12px rgba(255, 255, 255, 0.2))"
            : "none",
        }}
      >
        <img
          src={imageUri}
          alt={card.name}
          class="rounded-lg max-h-[400px] w-auto"
          style={{
            filter: "drop-shadow(0 0 8px rgba(0, 0, 0, 0.3))",
          }}
        />
        {isHovered && (
          <button
            type="button"
            onClick={onNewCard}
            class="absolute bottom-4 right-4 bg-black/80 hover:bg-black text-white font-medium py-2 px-4 rounded-lg shadow-lg transition-all hover:scale-105"
          >
            Random Card ↻
          </button>
        )}
      </div>
    </div>
  );
}
