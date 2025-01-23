// server for loading bulk card data and saving it to disk
import loadCards from "./load-cards.ts";

const cardloader = new loadCards();

// date>=rtr f:edh ((-o:commander) or (-o:commander and name:commander)) game:paper

const pdhCards = cardloader.cards.filter((card) =>
  card.legalities.commander === "legal" && card.games.includes("paper") &&
  card.released_at >= "2012-10-05"
);

// filter out cards that are not legal in our card pool:
const pdhPoolFiltered = pdhCards.filter((card) => {
  if (card.oracle_text) {
    // does the name of the card contain "commander"?
    if (card.name.toLowerCase().includes("commander")) {
      // does the card text contain "commander"?
      if (card.oracle_text.toLowerCase().includes("commander")) {
        return false;
      }
    }

    // does the card text contain "commander"?
    if (card.oracle_text.toLowerCase().includes("commander")) {
      return false;
    }
    return true;
  }
});

// print out the number of cards in our card pool
console.log("Number of cards in PDH pool:", pdhPoolFiltered.length);


