// filepath: /home/ellie/Dev/legality-checker-web/routes/api/commander-bracket.ts

import { FreshContext } from "$fresh/server.ts";

// Types for our bracket system
interface BracketRequirements {
  maxMassLandDenial: number;
  maxExtraTurns: number;
  maxTutors: number;
  maxGameChangers: number;
  maxTwoCardCombos: number;
  allowsExtraTurnChaining: boolean;
  allowsEarlyGameCombos: boolean;
}

interface DeckAnalysis {
  massLandDenial: string[];
  extraTurns: string[];
  tutors: string[];
  gameChangers: string[];
  twoCardCombos: Array<{ cards: string[]; isEarlyGame: boolean }>;
  minimumBracket: number;
  recommendedBracket: number;
  details: {
    minimumBracketReason: string;
    recommendedBracketReason: string;
    bracketRequirementsFailed: string[];
  };
}

// Define the bracket requirements as per the description
const BRACKET_REQUIREMENTS: BracketRequirements[] = [
  // Bracket 1
  {
    maxMassLandDenial: 0,
    maxExtraTurns: 0,
    maxTutors: 2,
    maxGameChangers: 0,
    maxTwoCardCombos: 0,
    allowsExtraTurnChaining: false,
    allowsEarlyGameCombos: false,
  },
  // Bracket 2
  {
    maxMassLandDenial: 0,
    maxExtraTurns: 2,
    maxTutors: 3,
    maxGameChangers: 0,
    maxTwoCardCombos: 0,
    allowsExtraTurnChaining: false,
    allowsEarlyGameCombos: false,
  },
  // Bracket 3
  {
    maxMassLandDenial: 0,
    maxExtraTurns: 3,
    maxTutors: Number.POSITIVE_INFINITY,
    maxGameChangers: 3,
    maxTwoCardCombos: Number.POSITIVE_INFINITY,
    allowsExtraTurnChaining: false,
    allowsEarlyGameCombos: false,
  },
  // Bracket 4
  {
    maxMassLandDenial: Number.POSITIVE_INFINITY,
    maxExtraTurns: Number.POSITIVE_INFINITY,
    maxTutors: Number.POSITIVE_INFINITY,
    maxGameChangers: Number.POSITIVE_INFINITY,
    maxTwoCardCombos: Number.POSITIVE_INFINITY,
    allowsExtraTurnChaining: true,
    allowsEarlyGameCombos: true,
  },
];

// Lists of cards in each category
const MASS_LAND_DENIAL_CARDS = new Set([
  "acid rain",
  "alpine moon",
  "apocalypse",
  "armageddon",
  "back to basics",
  "bearer of the heavens",
  "bend or break",
  "blood moon",
  "boil",
  "boiling seas",
  "boom // bust",
  "burning of xinye",
  "cataclysm",
  "catastrophe",
  "cleansing",
  "contamination",
  "conversion",
  "death cloud",
  "decree of annihilation",
  "desolation angel",
  "destructive force",
  "devastating dreams",
  "devastation",
  "dimensional breach",
  "epicenter",
  "fall of the thran",
  "flashfires",
  "gilt-leaf archdruid",
  "glaciers",
  "global ruin",
  "hall of gemstone",
  "harbinger of the seas",
  "hokori, dust drinker",
  "impending disaster",
  "infernal darkness",
  "jokulhaups",
  "keldon firebombers",
  "magus of the moon",
  "myojin of infinite rage",
  "naked singularity",
  "obliterate",
  "omen of fire",
  "raiding party",
  "ravages of war",
  "razia's purification",
  "reality twist",
  "realm razer",
  "rising waters",
  "ritual of subdual",
  "ruination",
  "soulscour",
  "stasis",
  "static orb",
  "stench of evil",
  "sunder",
  "tectonic break",
  "thoughts of ruin",
  "tsunami",
  "urza's sylex",
  "wildfire",
  "winter moon",
  "winter orb",
  "worldfire",
  "worldpurge",
  "worldslayer",
]);

const EXTRA_TURN_CHAIN_CARDS = new Set([
  "alchemist's gambit",
  "alrund's epiphany",
  "beacon of tomorrows",
  "capture of jingzhou",
  "chance for glory",
  "expropriate",
  "final fortune",
  "gonti's aether heart",
  "ichormoon gauntlet",
  "karn's temporal sundering",
  "last chance",
  "lighthouse chronologist",
  "lost isle calling",
  "magistrate's scepter",
  "magosi, the waterveil",
  "medomai the ageless",
  "mu yanling",
  "nexus of fate",
  "notorious throng",
  "part the waterveil",
  "plea for power",
  "ral zarek",
  "regenerations restored",
  "rise of the eldrazi",
  "sage of hours",
  "savor the moment",
  "search the city",
  "second chance",
  "seedtime",
  "stitch in time",
  "teferi, master of time",
  "teferi, timebender",
  "temporal extortion",
  "temporal manipulation",
  "temporal mastery",
  "temporal trespass",
  "time sieve",
  "timesifter",
  "timestream navigator",
  "time stretch",
  "time warp",
  "twice upon a time",
  "ugin's nexus",
  "walk the aeons",
  "wanderwine prophets",
  "warrior's oath",
  "wormfang manta",
]);

const GAME_CHANGER_CARDS = new Set([
  "ad nauseam",
  "ancient tomb",
  "aura shards",
  "bolas's citadel",
  "braids, cabal minion",
  "chrome mox",
  "coalition victory",
  "consecrated sphinx",
  "crop rotation",
  "cyclonic rift",
  "deflecting swat",
  "demonic tutor",
  "drannith magistrate",
  "enlightened tutor",
  "expropriate",
  "field of the dead",
  "fierce guardianship",
  "food chain",
  "force of will",
  "gaea's cradle",
  "gamble",
  "gifts ungiven",
  "glacial chasm",
  "grand arbiter augustin iv",
  "grim monolith",
  "humility",
  "imperial seal",
  "intuition",
  "jeska's will",
  "jin-gitaxias, core augur",
  "kinnan, bonder prodigy",
  "lion's eye diamond",
  "mana vault",
  "mishra's workshop",
  "mox diamond",
  "mystical tutor",
  "narset, parter of veils",
  "natural order",
  "necropotence",
  "notion thief",
  "opposition agent",
  "orcish bowmasters",
  "panoptic mirror",
  "rhystic study",
  "seedborn muse",
  "serra's sanctum",
  "smothering tithe",
  "survival of the fittest",
  "sway of the stars",
  "teferi's protection",
  "tergrid, god of fright",
  "thassa's oracle",
  "the one ring",
  "the tabernacle at pendrell vale",
  "underworld breach",
  "urza, lord high artificer",
  "vampiric tutor",
  "vorinclex, voice of hunger",
  "winota, joiner of forces",
  "worldly tutor",
  "yuriko, the tiger's shadow",
]);

// Map of known 2-card infinite combos
// Format: [cardA, cardB] => description of the combo
const TWO_CARD_COMBOS = new Map<
  string,
  { description: string; totalCost: number }
>();
// We'll populate this with a function to reduce boilerplate
function addCombo(
  card1: string,
  card2: string,
  description: string,
  totalCost: number,
): void {
  const key1 = `${card1}|${card2}`;
  const key2 = `${card2}|${card1}`;
  const value = { description, totalCost };
  TWO_CARD_COMBOS.set(key1, value);
  TWO_CARD_COMBOS.set(key2, value);
}

// Add some well-known combos
// This is just a small sample - in a real system you'd want a more complete database
addCombo(
  "kiki-jiki, mirror breaker",
  "zealous conscripts",
  "Infinite creatures with haste",
  8,
);
addCombo("sanguine bond", "exquisite blood", "Infinite life drain", 10);
addCombo("mikaeus, the unhallowed", "triskelion", "Infinite damage", 10);
addCombo(
  "splinter twin",
  "deceiver exarch",
  "Infinite creatures with haste",
  7,
);
addCombo(
  "isochron scepter",
  "dramatic reversal",
  "Infinite mana with mana rocks",
  4,
);
addCombo(
  "simic growth chamber",
  "retreat to coralhelm",
  "Infinite landfall with exploration effect",
  5,
);

/**
 * Analyzes a deck to determine its bracket
 * @param cards Array of card names in the deck
 * @param powerScore The deck's power score if available
 * @returns DeckAnalysis with bracket information
 */
export function analyzeDeckForBracket(
  cards: string[],
  powerScore?: number,
): DeckAnalysis {
  const cardNames = cards.map((cardName) => cardName.toLowerCase());

  // Initialize our analysis object
  const analysis: DeckAnalysis = {
    massLandDenial: [],
    extraTurns: [],
    tutors: [],
    gameChangers: [],
    twoCardCombos: [],
    minimumBracket: 1,
    recommendedBracket: 1,
    details: {
      minimumBracketReason: "",
      recommendedBracketReason: "",
      bracketRequirementsFailed: [],
    },
  };

  // Check for Mass Land Denial cards
  analysis.massLandDenial = cardNames.filter((card: string) =>
    MASS_LAND_DENIAL_CARDS.has(card)
  );

  // Check for Extra Turn cards
  analysis.extraTurns = cardNames.filter((card: string) => {
    const lowerCard = card.toLowerCase();
    return lowerCard.includes("extra turn") ||
      lowerCard.includes("additional turn") ||
      EXTRA_TURN_CHAIN_CARDS.has(lowerCard);
  });

  // Set of known tutor cards
  const TUTOR_CARDS = new Set([
    "academy rector",
    "altar of bone",
    "archmage ascension",
    "artificer's intuition",
    "behold the beyond",
    "beseech the mirror",
    "beseech the queen",
    "birthing pod",
    "bring to light",
    "buried alive",
    "captain sisay",
    "chord of calling",
    "cruel tutor",
    "dark petition",
    "demonic collusion",
    "demonic counsel",
    "demonic tutor",
    "diabolic intent",
    "diabolic revelation",
    "diabolic tutor",
    "eladamri's call",
    "eldritch evolution",
    "enlightened tutor",
    "entomb",
    "fabricate",
    "fauna shaman",
    "finale of devastation",
    "gamble",
    "grim tutor",
    "idyllic tutor",
    "imperial seal",
    "increasing ambition",
    "infernal tutor",
    "insidious dreams",
    "intuition",
    "long-term plans",
    "maralen of the mornsong",
    "mastermind's acquisition",
    "merchant scroll",
    "mystical tutor",
    "natural order",
    "personal tutor",
    "prime speaker vannifar",
    "profane tutor",
    "razaketh's rite",
    "reshape",
    "rhystic tutor",
    "scheming symmetry",
    "shared summons",
    "sidisi, undead vizier",
    "solve the equation",
    "survival of the fittest",
    "sylvan tutor",
    "tooth and nail",
    "traverse the ulvenwald",
    "unmarked grave",
    "vampiric tutor",
    "varragoth, bloodsky sire",
    "wargate",
    "whir of invention",
    "wishclaw talisman",
    "worldly tutor",
  ]);

  // Check for Tutors using the official list
  analysis.tutors = cardNames.filter((card: string) =>
    TUTOR_CARDS.has(card.toLowerCase())
  );

  // Check for Game Changers
  analysis.gameChangers = cardNames.filter((card: string) =>
    GAME_CHANGER_CARDS.has(card.toLowerCase())
  );

  // Check for 2-Card Infinite Combos
  for (let i = 0; i < cardNames.length; i++) {
    for (let j = i + 1; j < cardNames.length; j++) {
      const comboKey = `${cardNames[i]}|${cardNames[j]}`;
      const comboInfo = TWO_CARD_COMBOS.get(comboKey);

      if (comboInfo) {
        const isEarlyGame = comboInfo.totalCost < 8; // Define early game as less than 8 mana
        analysis.twoCardCombos.push({
          cards: [cardNames[i], cardNames[j]],
          isEarlyGame,
        });
      }
    }
  }

  // Determine the minimum bracket based on requirements
  let hasExtraTurnChaining = false;
  let hasEarlyGameCombos = false;

  // Check for extra turn chaining
  if (
    cardNames.some((card: string) =>
      EXTRA_TURN_CHAIN_CARDS.has(card.toLowerCase())
    )
  ) {
    hasExtraTurnChaining = true;
  }

  // Check for early game combos
  hasEarlyGameCombos = analysis.twoCardCombos.some((combo) =>
    combo.isEarlyGame
  );

  // Determine minimum bracket
  let minimumBracket = 1;
  const requirementsFailed: string[] = [];

  for (let bracketNum = 1; bracketNum <= 5; bracketNum++) {
    const requirements = BRACKET_REQUIREMENTS[bracketNum - 1];
    let bracketFailed = false;

    // Check Mass Land Denial
    if (analysis.massLandDenial.length > requirements.maxMassLandDenial) {
      bracketFailed = true;
      requirementsFailed.push(
        `Bracket ${bracketNum} allows ${requirements.maxMassLandDenial} Mass Land Denial cards, found ${analysis.massLandDenial.length}`,
      );
    }

    // Check Extra Turns
    if (analysis.extraTurns.length > requirements.maxExtraTurns) {
      bracketFailed = true;
      requirementsFailed.push(
        `Bracket ${bracketNum} allows ${requirements.maxExtraTurns} Extra Turn cards, found ${analysis.extraTurns.length}`,
      );
    }

    // Check Tutors
    if (analysis.tutors.length > requirements.maxTutors) {
      bracketFailed = true;
      requirementsFailed.push(
        `Bracket ${bracketNum} allows ${requirements.maxTutors} Tutor cards, found ${analysis.tutors.length}`,
      );
    }

    // Check Game Changers
    if (analysis.gameChangers.length > requirements.maxGameChangers) {
      bracketFailed = true;
      requirementsFailed.push(
        `Bracket ${bracketNum} allows ${requirements.maxGameChangers} Game Changer cards, found ${analysis.gameChangers.length}`,
      );
    }

    // Check Two Card Combos
    if (analysis.twoCardCombos.length > requirements.maxTwoCardCombos) {
      bracketFailed = true;
      requirementsFailed.push(
        `Bracket ${bracketNum} allows ${requirements.maxTwoCardCombos} Two-Card Combo cards, found ${analysis.twoCardCombos.length}`,
      );
    }

    // Check Extra Turn Chaining
    if (hasExtraTurnChaining && !requirements.allowsExtraTurnChaining) {
      bracketFailed = true;
      requirementsFailed.push(
        `Bracket ${bracketNum} doesn't allow Extra Turn chaining cards`,
      );
    }

    // Check Early Game Combos
    if (hasEarlyGameCombos && !requirements.allowsEarlyGameCombos) {
      bracketFailed = true;
      requirementsFailed.push(
        `Bracket ${bracketNum} doesn't allow early game infinite combos`,
      );
    }

    // If this bracket passed all checks, it's a candidate
    if (!bracketFailed) {
      minimumBracket = bracketNum;
      break;
    }
  }

  analysis.minimumBracket = minimumBracket; // Use the calculated minimumBracket
  analysis.details.bracketRequirementsFailed = requirementsFailed;
  analysis.details.minimumBracketReason = getMinimumBracketReason(analysis);

  // Determine the recommended bracket based on power score
  if (powerScore !== undefined) {
    let recommendedBracket = minimumBracket;

    // Thresholds based on the provided guidelines
    if (powerScore >= 800) {
      recommendedBracket = Math.max(recommendedBracket, 4);
    } else if (powerScore >= 650) {
      recommendedBracket = Math.max(recommendedBracket, 3);
    } else if (powerScore >= 500) {
      recommendedBracket = Math.max(recommendedBracket, 2);
    }

    analysis.recommendedBracket = recommendedBracket;
    analysis.details.recommendedBracketReason =
      `Based on power score ${powerScore}`;
  } else {
    analysis.recommendedBracket = minimumBracket;
    analysis.details.recommendedBracketReason =
      "No power score provided, using minimum bracket";
  }

  return analysis;
}

/**
 * Generates an explanation for the minimum bracket
 */
function getMinimumBracketReason(analysis: DeckAnalysis): string {
  // Collect all reasons that might push the deck to a higher bracket
  const reasons = [];

  if (analysis.massLandDenial.length > 0) {
    reasons.push(`${analysis.massLandDenial.length} mass land denial cards`);
  }

  if (analysis.extraTurns.length > 0) {
    if (analysis.extraTurns.length > 3) {
      reasons.push(
        `${analysis.extraTurns.length} extra turn cards (above bracket 3 limit)`,
      );
    } else if (analysis.extraTurns.length > 2) {
      reasons.push(
        `${analysis.extraTurns.length} extra turn cards (above bracket 2 limit)`,
      );
    } else if (analysis.extraTurns.length > 0) {
      reasons.push(
        `${analysis.extraTurns.length} extra turn cards (above bracket 1 limit)`,
      );
    }
  }

  if (
    analysis.extraTurns.some((card) =>
      EXTRA_TURN_CHAIN_CARDS.has(card.toLowerCase())
    )
  ) {
    reasons.push("extra turn chaining cards (requires bracket 4+)");
  }

  if (analysis.tutors.length > 0) {
    if (analysis.tutors.length > 3) {
      reasons.push(`${analysis.tutors.length} tutors (above bracket 2 limit)`);
    } else if (analysis.tutors.length > 2) {
      reasons.push(`${analysis.tutors.length} tutors (above bracket 1 limit)`);
    }
  }

  if (analysis.gameChangers.length > 0) {
    if (analysis.gameChangers.length > 3) {
      reasons.push(
        `${analysis.gameChangers.length} game changer cards (above bracket 3 limit)`,
      );
    } else if (analysis.gameChangers.length > 0) {
      reasons.push(
        `${analysis.gameChangers.length} game changer cards (above bracket 2 limit)`,
      );
    }
  }

  if (analysis.twoCardCombos.length > 0) {
    const earlyGameCombos = analysis.twoCardCombos.filter((combo) =>
      combo.isEarlyGame
    ).length;
    const lateGameCombos = analysis.twoCardCombos.length - earlyGameCombos;

    if (earlyGameCombos > 0) {
      reasons.push(
        `${earlyGameCombos} early game infinite combos (requires bracket 4+)`,
      );
    }

    if (lateGameCombos > 0) {
      reasons.push(
        `${lateGameCombos} late game infinite combos (allowed in bracket 3+)`,
      );
    }
  }

  if (reasons.length === 0) {
    return `Meets all criteria for Bracket ${analysis.minimumBracket}`;
  } else if (analysis.minimumBracket >= 4) {
    return `Minimum Bracket ${analysis.minimumBracket} due to: ${
      reasons.join(", ")
    }`;
  } else {
    return `Bracket ${analysis.minimumBracket}: has ${
      reasons.join(", ")
    } but still meets requirements`;
  }
}

/**
 * Handler for the commander bracket API endpoint
 */
export function handler(req: Request, _ctx: FreshContext): Response {
  // Parse the request to get deck information
  const url = new URL(req.url);
  const deckId = url.searchParams.get("deckId");
  const deckList = url.searchParams.get("deckList");
  const powerScore = Number(url.searchParams.get("powerScore") || "0");

  // Initialize CardManager if needed
  // We won't use CardManager for now since we're just parsing the deck list
  let cardNames: string[] = [];

  if (deckId) {
    // Fetch deck from Moxfield or other source
    // This would require implementing a deck fetching mechanism
    // For now, we'll respond with an error
    return new Response(
      JSON.stringify({ error: "Fetching decks by ID is not yet implemented" }),
      { status: 501, headers: { "Content-Type": "application/json" } },
    );
  } else if (deckList) {
    // Parse deck list from text
    cardNames = parseDeckList(deckList);
  } else {
    return new Response(
      JSON.stringify({ error: "No deck information provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Analyze the deck
  const analysis = analyzeDeckForBracket(cardNames, powerScore || undefined);

  return new Response(
    JSON.stringify(analysis),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Parses a deck list string into an array of card names
 */
function parseDeckList(deckList: string): string[] {
  // Simple parser - extracts card names from lines like "1x Card Name" or "Card Name"
  const lines = deckList.split("\n");
  const cardNames: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue; // Skip empty lines and comments

    // Match patterns like "1x Card Name" or "1 Card Name"
    const match = trimmed.match(/(?:^|\s)(?:(\d+)x?\s+)?(.+)$/);
    if (match) {
      const count = match[1] ? parseInt(match[1], 10) : 1;
      const cardName = match[2].trim();

      // Add the card name to the list as many times as it appears in the deck
      for (let i = 0; i < count; i++) {
        cardNames.push(cardName);
      }
    }
  }

  return cardNames;
}

// Export handler function for Fresh to use
export const GET = handler;
