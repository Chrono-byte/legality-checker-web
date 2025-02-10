// server for loading bulk card data and saving it to disk
import CardManager from "./load-cards.ts";

// create enum containing our deckbuilding restrictions
enum DeckbuildingRestrictions {
  DeckSize = 50,
}

// read decklist.txt
const DecklistTest = Deno.readTextFileSync("./decklist.txt");
const cardloader = new CardManager();

// load cards from decklist
const [cards, commander] = cardloader.parseDeckList(DecklistTest);

if (!cards || !commander) {
  console.error("Error parsing decklist");
  Deno.exit(1);
}
// fetch commander card data
const commanderData = cardloader.fetchCard(commander.name);

if (!commanderData) {
  console.error("Error fetching commander data, it is likely illegal");
  Deno.exit(1);
}

// total the quanties of each card
let cardQuantities = 0;
cards.forEach((card) => {
  cardQuantities += card.quantity;
});

console.log("Cards in decklist:", cardQuantities + commander.quantity);
console.log("Commander:", commander.name);
// log color identity of our commander
console.log("Color Identity:", commanderData.color_identity);

// log commander card image
console.log("Commander Image:", commanderData.image_uris?.normal);

// write to disk
await Deno.writeTextFile(
  "./decklist.json",
  JSON.stringify({ cards, commander }, null, 2),
);

// test decklist for legality
const [legalcards, illegalcards] = cardloader.testDecklist(cards, commander);

const LegalMode: {
  size: boolean;
  commander: boolean;
  colorIdentity: boolean;
} = {
  size: false,
  commander: false,
  colorIdentity: false,
};

// log legal and illegal cards
if (legalcards.length > 0) {
  console.log("Legal cards:", legalcards.length);
}

if (illegalcards.length > 0) {
  console.log(`Illegal cards: ${illegalcards.length}\n List:`);
  illegalcards.forEach((element) => {
    console.log("  ", element);
  });
}

// Check deck size,
if (cardQuantities + commander.quantity === DeckbuildingRestrictions.DeckSize) {
  LegalMode.size = true;
}

// Check commander legality
if (commanderData.legalities.pioneer === "legal") {
  LegalMode.commander = true;
}

// Check color identity
// for each card in our deck, check if it's color identity is a subset of our commander's color identity
const colorIdentity = commanderData.color_identity;

let colorIdentityCheck = true;
cards.forEach((card) => {
  // find card data
  const cardData = cardloader.fetchCard(card.name);
  if (!cardData) {
    console.error("Error fetching card data on card:", card.name);
    Deno.exit(1);
  }

  if (
    !cardData.color_identity.every((color) => colorIdentity.includes(color))
  ) {
    colorIdentityCheck = false;
  }
});

// log if our deck is legal. check if all legal conditions are met
if (LegalMode.size && LegalMode.commander && LegalMode.colorIdentity) {
  console.log("Deck is legal");
} else {
  console.log("Deck is illegal");

  // explain why:
  if (!LegalMode.size) {
    console.log("Deck size is illegal");
  }

  if (!LegalMode.commander) {
    console.log("Commander is illegal");
  }

  if (!LegalMode.colorIdentity) {
    console.log("Color identity is illegal");
  }
}
