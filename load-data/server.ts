// server for loading bulk card data and saving it to disk
import CardManager from "./load-cards.ts";
import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";

const cardloader = new CardManager();

const router = new Router();
router.get("/", (ctx) => {
  ctx.response.body = cardloader.cards;
});

router.get("/banned", (ctx) => {
  ctx.response.body = cardloader.bannedList;
});

router.get("/verify-legality", (ctx) => {
  const cardName = ctx.request.url.searchParams.get("cardName");
  if (!cardName) {
    ctx.response.body = "No card name provided";
    return;
  }

  const card = cardloader.cards.find((card) => card.name === cardName);
  if (!card) {
    ctx.response.body = "Card not found";
    return;
  }

  if (cardloader.bannedList.includes(cardName)) {
    ctx.response.body = "Card is banned in PDH";
    return;
  }

  ctx.response.body = true;
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8080 });
