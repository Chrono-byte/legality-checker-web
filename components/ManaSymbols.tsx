interface ManaSymbolProps {
  symbol: "W" | "U" | "B" | "R" | "G" | "C";
  className?: string;
}

export default function ManaSymbol(
  { symbol, className = "" }: ManaSymbolProps,
) {
  return (
    <img
      src={`/${symbol}.svg`}
      alt={`${symbol} mana`}
      className={`${className} inline-block mana-symbol`}
      width="24"
      height="24"
    />
  );
}
