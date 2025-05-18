import { useEffect, useState } from "preact/hooks";
import type { IScryfallCard } from "npm:scryfall-types";

export default function RandomCardIsland() {
  const [cards, setCards] = useState<IScryfallCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Get elevation style based on card ID hash to ensure consistent but random elevation
  const getElevationStyle = (id: string | undefined, isFeatured: boolean) => {
    if (isFeatured) {
      // the "featured" card should always be on top, and be the highest elevation
      return {
        zIndex: 50, // Much higher to ensure it's always on top
        transform: "scale(1.12) translateY(-32px)",
        boxShadow: "0 14px 40px 0 rgba(0,0,0,0.35)",
      };
    }
    if (!id) return {};

    // More varied hash function for better distribution
    let hash = 5381;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash * 33) ^ id.charCodeAt(i)) >>> 0;
    }
    // Use a larger range before modulo to get better distribution
    const mod = Math.abs((hash * 0xdeadbeef) % 5);

    console.log(`Card ${id}: hash=${hash}, mod=${mod}`); // Debug log

    // we want the cards to be in a random order, and have a few different elevations to look shuffled
    switch (mod) {
      case 0:
        return {
          zIndex: 10,
          transform: "scale(0.98) translateY(8px)",
          boxShadow: "0 2px 8px 0 rgba(0,0,0,0.2)",
        };
      case 1:
        return {
          zIndex: 20,
          transform: "scale(1.0) translateY(0px)",
          boxShadow: "0 4px 12px 0 rgba(0,0,0,0.25)",
        };
      case 2:
        return {
          zIndex: 30,
          transform: "scale(1.04) translateY(-12px)",
          boxShadow: "0 8px 20px 0 rgba(0,0,0,0.3)",
        };
      case 3:
        return {
          zIndex: 35,
          transform: "scale(1.08) translateY(-24px)",
          boxShadow: "0 12px 28px 0 rgba(0,0,0,0.35)",
        };
      case 4:
        return {
          zIndex: 40,
          transform: "scale(1.12) translateY(-36px)",
          boxShadow: "0 16px 36px 0 rgba(0,0,0,0.4)",
        };
      // Default case to handle unexpected values
      default:
        return {};
    }
  };

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/random-card");
      if (!response.ok) throw new Error("Network response was not ok");
      const cards = await response.json();
      console.log("Received cards:", cards); // Debug log
      setCards(cards);
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  if (loading) {
    return (
      <div class="homepage-collage-cards">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            class={`card ${
              i === 0
                ? "featured"
                : Math.random() > 0.5
                ? (Math.random() > 0.5 ? "elevated" : "elevatedSmall")
                : ""
            }`}
          >
            <div
              class="bg-white/5 rounded-lg animate-pulse"
              style={{
                width: "158px",
                height: "219px",
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div class="homepage-collage-cards">
      {cards.map((card, i) => (
        <a
          key={card.oracle_id}
          href={card.uri}
          onClick={(e) => {
            e.preventDefault();
            globalThis.open(card.uri, "_blank");
          }}
          class="card"
          style={{
            ...getElevationStyle(card.oracle_id, i === 0),
            transition: "transform 0.3s ease-out, box-shadow 0.3s ease-out",
          }}
        >
          <img
            src={card.image_uris?.normal ||
              card.card_faces?.[0].image_uris?.normal}
            alt={card.name}
            class="shadow-xl"
            loading="eager"
            draggable={false}
          />
        </a>
      ))}
    </div>
  );
}
