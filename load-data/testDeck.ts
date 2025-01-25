// server for loading bulk card data and saving it to disk
import CardManager from "./load-cards.ts";

// read decklist.txt
const DecklistTest = Deno.readTextFileSync("./decklist.txt");

const cardloader = new CardManager();

// load cards from decklist
const [cards, commander] = cardloader.parseDeckList(DecklistTest);

// total the quanties of each card
let cardQuantities = 0;
cards.forEach((card) => {
  cardQuantities += card.quantity;
});

console.log("Cards in decklist:", cardQuantities+commander.quantity);
console.log("Commander:", commander.name);

// write to disk
await Deno.writeTextFile(
  "./decklist.json",
  JSON.stringify({ cards, commander }, null, 2),
);

// test decklist for legality
const [legalcards, illegalcards] = cardloader.testDecklist(cards, commander);

console.log("Legal cards:", legalcards.length);
console.log("Illegal cards:", illegalcards.length);

illegalcards.forEach((element) => {
console.log(element);
});
