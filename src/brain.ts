// The brain. Two axes: CAN (money) and SHOULD (need). Four corners, four voices.
// Content rule: a line that mentions a specific answer MUST carry a `when` condition.

export type Household = "solo" | "partner" | "family" | "parents";
export type Use = "daily" | "weekly" | "weekends" | "once";
export type Replaces = "new" | "broken" | "fine" | "habit";
export type Wanted = "morning" | "weeks" | "years" | "someone";
export type IfNot = "nothing" | "sad" | "asking" | "worse";

export interface Answers {
  price: number;
  income: number; // monthly, after tax
  household: Household;
  use: Use;
  replaces: Replaces;
  wanted: Wanted;
  ifnot: IfNot;
}

export type Corner = "buy" | "why" | "save" | "no" | "tiny" | "dream";

export type Line = string | { t: string; when: (a: Answers) => boolean };

export interface Verdict {
  key: Corner;
  title: string;
  punch: string;
  fact: string;
  pct: number;
  can: boolean;
  should: boolean;
  need: number;
}

export const CAN_THRESHOLD = 0.35; // share of monthly income
export const NEVER_THRESHOLD = 1.5;
export const SHOULD_THRESHOLD = 6; // out of 12
export const TINY_PRICE = 20; // pocket change in absolute terms
export const TINY_RATIO = 0.005; // or pocket change relative to income
export const DREAM_RATIO = 24; // two years of income: not a purchase, a fantasy

const NEED = {
  use: { daily: 3, weekly: 2, weekends: 1, once: 0 },
  replaces: { habit: 3, broken: 3, new: 1, fine: 0 },
  wanted: { years: 3, weeks: 2, morning: 0, someone: -1 },
  ifnot: { worse: 3, asking: 1, sad: 1, nothing: 0 },
} as const;

type Pools = Partial<Record<Household, Line[]>> & { family: Line[] };

const VERDICTS: Record<Corner, { title: string; lines: Pools }> = {
  buy: {
    title: "Buy it",
    lines: {
      family: [
        { t: "You can afford it and you'll actually use it. Why are you on this site?", when: (a) => a.use !== "once" },
        "Yes. This is the rare purchase that survives both the budget and the partner.",
        "Buy it. This is the first thing in years that isn't for a child and isn't a mistake.",
        { t: "You've wanted it forever, you'll use it daily, and it's cheap. That's a unicorn. Catch it.", when: (a) => a.wanted === "years" && a.use === "daily" },
        "Yes. Buy it, and say 'we needed it' with the confidence of someone who did the math.",
        "Yes. Even your partner would say yes. Don't test that theory, just buy it.",
        "Yes. Put it on a high shelf and enjoy it before anyone under four finds it.",
        "Buy it. This is what 'responsible' looks like, and it looks suspiciously like fun.",
        { t: "Yes. It replaces something broken. That's not shopping, that's maintenance. Go.", when: (a) => a.replaces === "broken" },
        { t: "Yes. It replaces a habit you pay for. You're not spending, you're refinancing.", when: (a) => a.replaces === "habit" },
        { t: "Yes. You've wanted it for weeks and you'll use it every day. That's the whole checklist.", when: (a) => a.wanted === "weeks" && a.use === "daily" },
      ],
      solo: [
        "Yes. You've overthought this. That's your only expense here.",
        "Buy it. Nobody's stopping you, including the math.",
      ],
      partner: [
        "Yes. This one doesn't even need the talk. Save the talk for the next thing.",
        "Yes. Bring it up over dinner as a done deal. It is one.",
      ],
      parents: [
        "Yes. No rent, real use, fair price. Have one thing that's yours.",
        "Buy it. Your mother will comment. She was going to anyway.",
      ],
    },
  },
  why: {
    title: "You can. But why?",
    lines: {
      family: [
        { t: "You can afford it. You'll use it twice. That's a very expensive twice.", when: (a) => a.use === "once" || a.use === "weekends" },
        "Money isn't the problem here. You are. Lovingly.",
        "Yes, you can. And in six months it'll be in the garage next to the other 'yes, you can'.",
        "You can afford it. Your partner will still ask 'what's that', and you won't have an answer.",
        "Sure. It'll live in the closet with the bread maker and the good intentions.",
        { t: "You can. But you saw someone else with it, and that's not a reason, that's a symptom.", when: (a) => a.wanted === "someone" },
        "You can afford it. So can the kids, apparently, because they're the ones who'll end up with it.",
        "Yes, technically. But you'd get more out of a nap. Naps are free. You have kids. Take the nap.",
        { t: "You can. It replaces something that works fine. So did the last three things.", when: (a) => a.replaces === "fine" },
        { t: "You can afford it. You've wanted it since this morning. Your kids have wanted things since this morning too. You said no to them.", when: (a) => a.wanted === "morning" },
        { t: "You can. And you said nothing happens if you don't. Nothing is very cheap.", when: (a) => a.ifnot === "nothing" },
      ],
      solo: [
        { t: "You can afford it. Nobody's going to notice it collecting dust either.", when: (a) => a.use !== "daily" },
        "You can. You'll also forget you own it by spring.",
      ],
      partner: [
        "You can. Explaining why is the expensive part.",
        "Yes. And 'we might use it' is not a sentence your partner is going to accept.",
      ],
      parents: [
        "You can afford it. Your parents will ask what it's for. You'll lie. Badly.",
        "You can. It'll go in the room that's still yours 'for now'.",
      ],
    },
  },
  save: {
    title: "Save for it",
    lines: {
      family: [
        "You genuinely need this. You just can't pay for it this month. That's a plan, not a no.",
        "Not now. But this is a real need, so it goes on the list above the birthday parties.",
        "Not yet. This one's worth the boring route: a little every month, and a very smug purchase later.",
        { t: "You should own this. You shouldn't own it on a credit card. Two different sentences.", when: (a) => a.replaces !== "fine" },
        "Not this month. Ask again after the dentist. There's always a dentist.",
        "You need it, you can't afford it, and that's just Tuesday for a parent. Save for it.",
        "This is the good kind of no. The kind that turns into yes after a tax refund.",
        "Not now. But say the words 'we're saving for it' out loud. Partners love that sentence.",
      ],
      solo: [
        "You need it. You can't afford it. Welcome to having a savings goal for the first time.",
        "Not now. But this is worth the wait, and you have no one to blame for the wait but your rent.",
      ],
      partner: [
        "Not now. But it's a real need, so this is the one you bring up as a shared project.",
        "Save for it. Together. It's cheaper and it's a great excuse for a spreadsheet date.",
      ],
      parents: [
        "You need this. Save for it, and let it be the first thing you fully own.",
        "Not now. But it's a real reason to keep living at home a bit longer. Use it.",
      ],
    },
  },
  tiny: {
    title: "Yes. Obviously.",
    lines: {
      family: [
        "Yes. You asked the internet for permission to spend pocket change. The internet says grow up, lovingly.",
        "Buy it. You've spent more than this on things the kids dropped once and never touched again.",
        "Yes. If this needs approval, the family budget meeting has gone too far.",
        "Buy it. Buy two. Hide the second one from everyone you live with.",
        "The babysitter costs more per hour than this thing costs, total. Go.",
        "This isn't a financial decision. This is you practicing asking permission. Buy it.",
        "Yes. Treat yourself. The bar for 'treat' has apparently never been lower.",
        "Buy it in cash so there's no evidence either way.",
        { t: "You'll use it every day and it costs less than the parking. This site is for dilemmas.", when: (a) => a.use === "daily" },
        { t: "You've wanted it since this morning and it costs almost nothing. That's not a dilemma, that's a snack.", when: (a) => a.wanted === "morning" },
        { t: "It replaces a habit that costs you money. At this price the habit should be embarrassed.", when: (a) => a.replaces === "habit" },
        { t: "Your own words: nothing happens if you don't. Sure. But it costs the price of nothing. Buy it.", when: (a) => a.ifnot === "nothing" },
      ],
      solo: [
        "Yes. You live alone and still asked. Buy it, and maybe call someone.",
        "It's pocket change. The only thing you can't afford here is more hesitation.",
      ],
      partner: [
        "Buy it before your partner finds out you asked a website about this.",
        "Yes. Every couple has a 'we should discuss it' threshold. This is under it. Way under.",
      ],
      parents: [
        "Buy it. You live rent-free. This is literally what your money is for.",
        "Yes. Even your parents would say yes, and they still have opinions about how you cut tomatoes.",
      ],
    },
  },
  dream: {
    title: "Be serious.",
    lines: {
      family: [
        "No. You typed a number with that many zeroes into a comedy site. That was the joke, and you made it.",
        "Absolutely not. This isn't a purchase, it's a second life. You're busy with the first one.",
        "No. The kids' college fund just felt a disturbance and doesn't know why.",
        "This isn't 'can I afford it'. This is 'who would I have to become'. And that person doesn't have your kids.",
        "No, but respect. Most people ask this site about headphones.",
        "Not in this economy, not in the next one, not in the one after that. But it's good to have dreams.",
        "No. This is a lottery-win purchase, and you have kids, so you can't even afford the ticket habit.",
        "Print a photo of it and put it on the fridge. That's within budget, and the fridge is where dreams live anyway.",
        { t: "You saw someone else with it. That person has a different everything. Wave, don't follow.", when: (a) => a.wanted === "someone" },
        { t: "You've wanted it for years. Keep wanting it. Wanting it is the affordable part.", when: (a) => a.wanted === "years" },
        { t: "You'd use it once. At this price, museums exist so nobody has to do this.", when: (a) => a.use === "once" },
      ],
      solo: [
        "No. But you live alone, so at least nobody heard you ask.",
        "This is a vision board item. Print a photo. Frame it. That's within budget.",
      ],
      partner: [
        "No. There is no version of 'honey, guess what' that survives this number.",
        "Absolutely not. This price has in-laws in it.",
      ],
      parents: [
        "You live with your parents. The answer was in the question.",
        "No. Your parents' house doesn't cost this. Ask them, they'll tell you. At length.",
      ],
    },
  },
  no: {
    title: "Absolutely not",
    lines: {
      family: [
        { t: "No. You can't afford it and you'd use it twice. This is a 'no' from both sides of the brain.", when: (a) => a.use === "once" || a.use === "weekends" },
        "No. You have kids. You've already made your big financial decision.",
        { t: "Absolutely not. You saw someone else with it. That someone has no kids.", when: (a) => a.wanted === "someone" },
        "No. Screenshot this and show it to your partner. You're welcome.",
        "No. Close the tab. Go check if anyone's crying.",
        "No. This is the kind of purchase that gets its own chapter in the divorce.",
        "Absolutely not. Buy a nice bottle of wine and look at pictures of it. That you can afford.",
        "No. Not a 'not now'. A 'not while anyone in this house is under 18'.",
      ],
      solo: [
        "No. Close the tab. Drink some water.",
        "Absolutely not. This isn't a want, it's a cry for help with a price tag.",
      ],
      partner: [
        "No. And don't say 'we'. There's no 'we' in this purchase. There's you, alone, explaining.",
        "Absolutely not. This is a 'sleep on the couch' amount.",
      ],
      parents: [
        "No. You can't afford it and you can't afford the dinner conversation about it.",
        "Absolutely not. Your parents already paid for the thing you're sitting on.",
      ],
    },
  },
};

// Spicy overlay: adult items get their own pools. Rules: sex-positive, never shame the want,
// jokes are about privacy and household logistics. In "no", the price is the villain, not the desire.
const SPICY_RE =
  /\b(vibrators?|dildos?|sex ?toys?|butt ?plugs?|anal (beads|plug|toy)|fleshlights?|lube|lingerie|handcuffs|bondage|bdsm|kink|strap[- ]?ons?|cock ?rings?|nipple clamps?|condoms?|onlyfans|sex (swing|doll|robot)|wand massagers?|rabbit vibrators?)\b/i;
export const isSpicy = (item: string) => SPICY_RE.test(item);

const SPICY: Record<Corner, Pools> = {
  buy: {
    family: [
      "Yes. You say yes to everyone else in this house all day. Your turn.",
      "Buy it. Self-care is cheaper than couples therapy, and you're allowed both.",
      "Yes. It's cheaper than a weekend away and requires no babysitter.",
      "Buy it. Just also budget for a lock on the nightstand drawer.",
      "Yes. And nobody in this house needs to see the budget line. Call it 'wellness'.",
      "Buy it. Date night at home costs less, and the babysitter never has to know why.",
      "Yes. You budgeted for the household. Budget for the householders.",
      { t: "Every day? Buy it, hydrate, and godspeed.", when: (a) => a.use === "daily" },
      { t: "It replaces something broken. Mourn it, replace it, move on. Healthiest sentence on this site.", when: (a) => a.replaces === "broken" },
      { t: "You've wanted it for years. That's not a purchase, that's overdue self-respect.", when: (a) => a.wanted === "years" },
    ],
    solo: [
      "Yes. You live alone. This is what living alone is for.",
      "Buy it. No one to explain it to, nothing to hide. The dream.",
    ],
    partner: [
      "Yes. Buy it 'for the relationship'. It might even be true.",
      "Buy it. Worst case it's yours. Best case it's plural.",
    ],
    parents: [
      "Yes. Get the quiet one.",
      "Buy it. You have a door that locks. Presumably. Check first.",
    ],
  },
  why: {
    family: [
      "You can afford it. And honestly, asking a website first is the real intimacy issue here.",
      "You can. Whether you'll have the energy, between work and the kids, is the actual question.",
      "Money's fine. It's drawer space in a house full of snoops you should be pricing.",
      "You can afford it. The question is whether it sees more action than the exercise bike.",
      "You can. But you're tired. You're always tired. Buy a nap first, then revisit.",
      { t: "Once? Even your excuses deserve better than 'once'.", when: (a) => a.use === "once" },
      { t: "You saw someone else with it. We're not asking where. You can afford it — that's all we know for sure.", when: (a) => a.wanted === "someone" },
      { t: "You said nothing happens if you don't buy it. Respectfully: something could.", when: (a) => a.ifnot === "nothing" },
    ],
    solo: [
      "You can. You'd also survive without it, but who wants to just survive.",
      "You can afford it. Your search history already committed. Follow through or clear it.",
    ],
    partner: [
      "You can. Just mention it to your partner before it mentions itself.",
      "You can afford it. The conversation is free, and you should still have it.",
    ],
    parents: [
      "You can afford it. Shipping it to your parents' house is the bold part.",
      "You can. Discreet packaging was invented for exactly your living situation.",
    ],
  },
  save: {
    family: [
      "A real need, a real budget problem. Save for it. Anticipation is famously half the fun.",
      "Not this month. Put it on the list. The private list, not the fridge list.",
      "You need it and you can't swing it right now. This is what 'treat yourself later' was invented for.",
      "Save for it. When it arrives, it'll be the most earned purchase in this house.",
      "Not yet. But a need is a need — skip two takeout nights and this becomes a yes.",
      "Save for it quietly. Some savings goals don't go in the shared spreadsheet.",
      "Not now. Soon. Some things are worth the boring route, and this is embarrassingly one of them.",
      { t: "It broke and you can't replace it this month. Genuinely the saddest math on this site. Save fast.", when: (a) => a.replaces === "broken" },
    ],
    solo: [
      "Save for it. You're the only stakeholder, and the stakeholder deserves nice things.",
      "Not this month. Good news: nobody else gets a vote on next month.",
    ],
    partner: [
      "Save for it together. Best shared project a spreadsheet has ever seen.",
      "Not yet. Bring it up as a 'we' goal and watch your partner suddenly care about budgeting.",
    ],
    parents: [
      "Save for it, plus a little extra for whatever makes the least noise.",
      "Not yet. Use the wait to plan logistics. You live with your parents. Logistics are everything.",
    ],
  },
  no: {
    family: [
      "No, and it's purely the money. The spirit is willing. The wallet is not.",
      "Not at this price. It had better also do the dishes.",
      "No. Nobody's love life ever failed for lack of the premium model.",
      "No. This is luxury tier on a family budget. The desire is valid. The price isn't.",
      "Not this one. Whatever it promises at this price, a cheaper one and some imagination gets you there.",
      "No. Spend the money you don't have on a babysitter and an early night instead.",
      "Absolutely not at this price. Good news: this is one market where the budget options overperform.",
      { t: "You saw someone else with it and now it's a personality. It's not. Cheaper one, same destination.", when: (a) => a.wanted === "someone" },
    ],
    solo: [
      "No. At that price it should text you back.",
      "Not this one. Your standards can stay high while the price comes down.",
    ],
    partner: [
      "Not at this price. And you have a partner — you already own the free alternative.",
      "No. The conversation where you explain this number costs more than the item.",
    ],
    parents: [
      "No. Some purchases need a deposit on privacy first, and you live with your parents.",
      "Absolutely not. Move out first. Consider it motivation.",
    ],
  },
  tiny: {
    family: [
      "Yes. This is a household staple. It just doesn't go on the fridge list.",
      "Buy it. Some things you don't price-check, you just restock.",
      "Yes, obviously. Joy and safety for pocket change. Best ratio on this site.",
      "It costs nothing and you asked anyway. That's either very responsible or very sweet. Buy it.",
    ],
    solo: [
      "Yes. Stock up. Optimism is a virtue.",
      "Buy it. Cheapest good decision you'll make this week.",
    ],
    partner: [
      "Yes. This is below the discussion threshold and above the necessity line. Go.",
      "Buy it. Your partner isn't going to audit this one.",
    ],
    parents: [
      "Yes. And use the self-checkout.",
      "Buy it. Cash. Self-checkout. You know the drill.",
    ],
  },
  dream: {
    family: [
      "No. At that price it's not a purchase, it's a relationship. You already have one of those.",
      "Be serious. For that money you could take your partner around the world, which historically also works.",
      "Absolutely not. If it costs more than a car, it's not self-care, it's a plot twist.",
      "No. Anything in this category at this price comes with a documentary later, and nobody comes off well in those.",
    ],
    solo: [
      "No. At that price it's not a toy, it's a co-signer.",
      "Be serious. That number isn't desire, it's a startup pitch.",
    ],
    partner: [
      "No. There's no drawer big enough to hide this from your partner, or the number from yourself.",
      "Be serious. For that money, book the hotel. For a year.",
    ],
    parents: [
      "No. This costs more than moving out. Move out. Solve both problems.",
      "Be serious. This number buys an apartment with a door that locks.",
    ],
  },
};

// Life events: the site's own placeholders bait these ("a dog", "a second kid", "a divorce").
// The one-time-price math is a lie for them — the honest line switches to recurring-cost truth.
// Whole-item match on purpose: "a dog" is a life event, "a dog bed" is a purchase.
export type LifeKind = "pet" | "kid" | "wedding" | "divorce";
const LIFE_RES: [LifeKind, RegExp][] = [
  ["pet", /^(a |another |the )?(dog|puppy|cat|kitten|hamster|parrot|rabbit|bunny|horse|pet)$/],
  ["kid", /^(a |another |the )?((second|third|fourth) )?(kid|child|baby|son|daughter)$/],
  ["wedding", /^(a |my |the |our )?wedding$/],
  ["divorce", /^(a |my |the )?divorce$/],
];
export const lifeKind = (item: string): LifeKind | null =>
  LIFE_RES.find(([, re]) => re.test(item.trim().toLowerCase()))?.[0] ?? null;

// Life pools live entirely in the `family` slot as an "everyone" pool; household-specific lines
// carry a `when` guard on a.household instead of separate per-household arrays.
const LIFE: Record<LifeKind, { yes: Pools; no: Pools }> = {
  pet: {
    yes: {
      family: [
        "Yes. You know it's a scam and you want the scam. That's love. Get the dog.",
        "Yes. You're not buying an animal, you're hiring a personal trainer with fur.",
        "Yes. It'll destroy one couch and fix every bad day. Net positive.",
        "Yes. Just know the price tag is the cheapest thing about it, and go anyway.",
        { t: "Yes. The kids promised to walk it. They're lying. Get it anyway.", when: (a) => a.household === "family" },
        { t: "Yes. You live alone. Get the dog before you start narrating your day to the fridge.", when: (a) => a.household === "solo" },
        { t: "Yes. Best co-parenting rehearsal money can rent.", when: (a) => a.household === "partner" },
      ],
    },
    no: {
      family: [
        "Not yet. A pet is rent that loves you back, and you can't make rent twice.",
        "No. Foster first. All the tail wags, none of the vet bills.",
        "Not this month. The dog doesn't exist yet — it can wait better than you can.",
        "No. Volunteer at a shelter. Free dogs, no invoices, moral high ground.",
        { t: "Not now. You already have dependents who can talk, and they're expensive enough.", when: (a) => a.household === "family" },
      ],
    },
  },
  kid: {
    yes: {
      family: [
        "Sure. It's the worst financial decision that everyone defends. Welcome.",
        "Yes, in the sense that nobody can afford one and everybody has them anyway.",
        "Financially: no. But this was never a financial question, and you know it.",
        { t: "Another one? The math said no last time too, and look at you.", when: (a) => a.household === "family" },
        { t: "Yes. But this one you discuss with your partner, not with a website.", when: (a) => a.household === "partner" },
      ],
    },
    no: {
      family: [
        "A kid is the only purchase where 'can I afford it' has never once changed anyone's mind.",
        "The honest answer: nobody can. People do it anyway. That's the whole species.",
        "Not a purchase. A subscription with a 20-year minimum term and no cancel button.",
        { t: "You have kids. You know exactly what this costs, and you're still asking. Interesting.", when: (a) => a.household === "family" },
        { t: "You live with your parents. Ask them what you cost. That's your answer.", when: (a) => a.household === "parents" },
      ],
    },
  },
  wedding: {
    yes: {
      family: [
        "Yes. Just remember the marriage is the product. The wedding is the packaging.",
        "You can afford it. Whether the guest list stays this size is the real budget question.",
        "Yes. Spend it on the food and the music. Nobody remembers the chair covers. Nobody.",
        { t: "Yes. You're marrying someone who checks a comedy site before spending. You're both fine.", when: (a) => a.household === "partner" },
      ],
    },
    no: {
      family: [
        "Not at this number. The marriage costs nothing. The party is optional at any price.",
        "No. Courthouse, twenty people, one great restaurant. The photos come out better anyway.",
        "Not this budget. Cut the guest list before you cut the honeymoon.",
        { t: "You have kids and you're pricing a party. You know better. Smaller. Warmer. Cheaper.", when: (a) => a.household === "family" },
      ],
    },
  },
  divorce: {
    yes: {
      family: [
        "If you're asking for real, no comedy site should talk you out of it. Talk to a lawyer, not a website.",
        "You can afford it. Cheaper than thirty more years of pretending, says everyone who's done it.",
        "Expensive exit, but staying unhappy has a monthly cost too, and you've been paying it.",
      ],
    },
    no: {
      family: [
        "'Can't afford it' is how a lot of people stay married. A counselor is cheaper than counsel. Start there.",
        "The money finds itself when it's real. First: one honest conversation. Those are free.",
        "A divorce isn't priced in dollars anyway. If you're serious, this isn't the site. If you're joking, the couch is free tonight.",
      ],
    },
  },
};

const LIFE_MONEY: Record<LifeKind, (a: Answers) => string> = {
  pet: (a) => `${money(a.price)} is just the entry fee. Budget about $150 a month for the next 12 years — call it ${money(a.price + 150 * 12 * 12)}, plus one couch.`,
  kid: (a) => `You typed ${money(a.price)}. The going estimate to age 18 is about $300,000, before college. Your number is adorable.`,
  wedding: (a) => `${money(a.price)} for one day. That's about ${money(a.price / 10)} an hour, and the only hour anyone remembers is free.`,
  divorce: (a) => `You typed ${money(a.price)}, but a divorce isn't a price, it's a percentage. Historically: half.`,
};

// Sincere tier: the cynical-friend voice must not fire on therapy or a root canal.
// Need is real by definition, so the only question left is CAN — verdict is buy or save, warm both ways.
const SINCERE_RE =
  /\b(therapy|therapists?|psychologists?|psychiatrists?|counsell?ing|counsell?ors?|rehab|meds|medications?|medicine|dentists?|doctors?|surgery|glasses|hearing aids?|physio(therapy)?|a wheelchair)\b/i;
export const isSincere = (item: string) => SINCERE_RE.test(item);

const SINCERE_LINES: { yes: Pools; no: Pools } = {
  yes: {
    family: [
      "Yes. This is the one purchase this site doesn't joke about. Go.",
      "Yes. Best line item in the budget — the rest of the budget works better after this one.",
      "Buy it. 'Can I afford it' was never the real question here, and you know it.",
      "Yes. You've spent more on things that made you feel worse.",
      "Yes. Book it before you talk yourself out of it. That's the whole verdict.",
      { t: "Yes. Everyone in the house benefits from this one, even though it's yours.", when: (a) => a.household === "family" },
      { t: "Yes. Your partner will notice the difference before you do.", when: (a) => a.household === "partner" },
    ],
  },
  no: {
    family: [
      "The answer is yes — the price is the only problem, and this is the one market where prices negotiate. Sliding scales exist. Ask.",
      "Find a way. This is the one thing on this site worth the boring route, the awkward calls, all of it.",
      "'Can't afford it this month' is not 'no'. This one stays on the list. Top of it.",
      "If anything deserves the savings account, it's this. Not the gadget. This.",
      { t: "The family budget has room for this. Something else moves. That's the whole answer.", when: (a) => a.household === "family" },
    ],
  },
};

// Intercepts: items that should never reach the seven questions. Un-buyables get the joke,
// illegal gets a deflection with no verdict math. Checked at the intro screen.
export interface InterceptResult { kind: string; title: string; lines: string[] }
const INTERCEPTS: { kind: string; re: RegExp; title: string; lines: string[] }[] = [
  {
    kind: "illegal",
    re: /\b(cocaine|heroin|meth|fentanyl|mdma|ecstasy|lsd|hit ?man|a kidney|black market|explosives|grenades?|(?<!bath )bombs?|a gun|guns|rifles?|ammo)\b/,
    title: "Nope.",
    lines: [
      "This site does financial judgment, not legal exposure.",
      "No verdict. No math. This conversation never happened.",
      "We judge purchases, not felonies. Different site. Please don't find it.",
      "The only thing you can't afford here is the lawyer after.",
    ],
  },
  {
    kind: "ex",
    re: /^my ex\b/,
    title: "Not for sale.",
    lines: [
      "Not for sale, and the shipping costs are emotional.",
      "You can't buy them back. There's a reason the store closed.",
      "No refunds, no re-orders. Proud of you for asking a website instead of texting them, though.",
      "That's not a purchase, that's a relapse with a budget.",
    ],
  },
  {
    // buying-a-human territory: the one place the joke targets the asker, hard, and nothing else
    kind: "trafficking",
    re: /\b(slaves?|mail[- ]order bride|child bride|human trafficking|an? orphan)\b/,
    title: "Nope.",
    lines: [
      "People aren't property. This site jokes about everything, and look at that: not this.",
      "No verdict, no math, and the FBI agent in your webcam just sat up straighter.",
      "Not a market. Never was a market. The site is telling your mother.",
      "The only thing you acquired today is a spot on a list.",
    ],
  },
  {
    kind: "person",
    re: /^(a |another |new |a new )?(girlfriend|boyfriend|wife|husband|partner|best friend|friends?( with benefits)?|soulmate|date|person|human|man|woman|guy|girl|boy)$/,
    title: "Not for sale.",
    lines: [
      "People aren't purchases. This site has standards — low ones, but standards.",
      "You can't buy one. You can text back, though. Free, and historically more effective.",
      "Not in the catalog. Shower, hobbies, patience. In that order.",
      "The confidence to talk to one costs $0, and you notably didn't ask us about that.",
      "Humans: not for sale. Renting their attention is the entire rest of the economy, though.",
    ],
  },
  {
    kind: "family-member",
    re: /^(a |another |new |a new )?(mom|mum|dad|mother|father|brother|sister|grandma|grandpa|grandmother|grandfather|uncle|aunt)$/,
    title: "Not for sale.",
    lines: [
      "Not for sale. You get the ones you get. That's the whole deal, and therapy is cheaper anyway.",
      "Can't buy a new one. You can call the current one. They'd like that.",
      "Family isn't in the catalog. Complaints about family, however, are free and unlimited.",
      "No returns, no exchanges, no upgrades. The warranty is called 'the holidays'.",
    ],
  },
  {
    kind: "feeling",
    re: /^((some|a|an|inner|world) )?(happiness|love|joy|peace|peace of mind|motivation|confidence|self[- ]?esteem|personality|good taste|respect|luck)$/,
    title: "Not for sale.",
    lines: [
      "Not in the catalog. Closest we've seen: a nap, a walk, and one less tab open.",
      "Can't be bought. Can be rented briefly — see: every other purchase on this site.",
      "The thing you're actually asking about is free and inconveniently slow. Sorry.",
      "Not for sale. Everything on this site is people trying to buy it anyway.",
    ],
  },
  {
    kind: "sleep",
    re: /^(some )?(sleep|rest|a good night'?s sleep|8 hours of sleep)$/,
    title: "Not for sale.",
    lines: [
      "Sleep is free. It's the time that's expensive.",
      "Can't buy it. Can stop scrolling at 1am. Same aisle.",
      "The price is putting the phone down. Steep, we know.",
      "Free, and you already own everything required. That's the frustrating part.",
    ],
  },
  {
    kind: "unbuyable",
    re: /^((some|more|a) )?(time|free time|a life|youth|manners|taste)$/,
    title: "Not for sale.",
    lines: [
      "Not for sale. That's the bad news and the good news.",
      "Can't be bought. Everything that can be is worse. That's the whole secret of this site.",
      "No store carries it. Most purchases on this site are attempts anyway.",
    ],
  },
];
export function interceptFor(item: string): InterceptResult | null {
  const s = item.trim().toLowerCase();
  const hit = INTERCEPTS.find((i) => i.re.test(s));
  return hit ? { kind: hit.kind, title: hit.title, lines: hit.lines } : null;
}

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export function pickLine(lines: string[], avoid?: string): string {
  const pool = lines.filter((l) => l !== avoid);
  return rand(pool.length ? pool : lines);
}
export const money = (n: number) => "$" + Math.round(n).toLocaleString();

export function decide(a: Answers, avoid?: string, item?: string): Verdict {
  const ratio = a.price / Math.max(a.income, 1);
  const can = ratio <= CAN_THRESHOLD;
  const need = NEED.use[a.use] + NEED.replaces[a.replaces] + NEED.wanted[a.wanted] + NEED.ifnot[a.ifnot];
  const should = need >= SHOULD_THRESHOLD;

  const spicy = !!item && isSpicy(item);
  const life = item ? lifeKind(item) : null;
  const sincere = !!item && isSincere(item);

  let key: Corner = can ? (should ? "buy" : "why") : should ? "save" : "no";
  if (life) key = can ? "buy" : "save"; // the want is taken as real; money is the only axis left
  if (ratio > NEVER_THRESHOLD) key = "no";
  if (ratio > DREAM_RATIO) key = "dream";
  const tiny = a.price <= TINY_PRICE || ratio <= TINY_RATIO;
  if (tiny) key = "tiny";
  if (sincere) key = can ? "buy" : "save"; // need is real by definition; only CAN is in question

  const v = VERDICTS[key];
  const yes = key === "buy" || key === "tiny";
  const lines = sincere ? SINCERE_LINES[yes ? "yes" : "no"] : life ? LIFE[life][yes ? "yes" : "no"] : spicy ? SPICY[key] : v.lines;
  const title = sincere ? (yes ? "Yes. Go." : "Find a way.") : v.title;
  const unwrap = (l: Line) => (typeof l === "string" ? l : l.t);
  const fits = (l: Line) => typeof l === "string" || l.when(a);
  const base = (lines[a.household] ?? lines.family).filter(fits).map(unwrap);
  const pool = base.filter((l) => l !== avoid);
  const punch = rand(pool.length ? pool : base.length ? base : lines.family.filter(fits).map(unwrap));

  // the honest line: one money truth + up to two usage truths, all specific
  const pct = Math.round(ratio * 100);
  const usesPerYear = { daily: 365, weekly: 52, weekends: 20, once: 1 }[a.use];
  const perUse = a.price / usesPerYear;
  const perUseStr = perUse < 1 ? "pennies" : money(perUse);

  const moneyLine = life
    ? LIFE_MONEY[life](a)
    : tiny
    ? `You make ${money(a.income)} a month. This costs ${money(a.price)}. The math was done before you finished typing.`
    : ratio > DREAM_RATIO
      ? `This is ${(ratio / 12).toFixed(1)} years of income. Before rent, before food. That's not a savings plan, that's a biography.`
      : ratio > NEVER_THRESHOLD
      ? `This is ${ratio.toFixed(1)} months of income. Not a purchase, a project.`
      : ratio > CAN_THRESHOLD
      ? `${pct}% of a month's income. Anything over a third of your month isn't "affordable", it's "survivable".`
      : ratio > 0.1
      ? `${pct}% of a month's income. Doable, but it's a real line on the statement, not a coffee.`
      : `${pct}% of a month's income. Financially this is a rounding error. The rest is psychology.`;

  const dream = ratio > DREAM_RATIO;
  const useLines: string[] = [];
  if (tiny || life || sincere) {
    // per-use math is a bug at pocket-change prices and a lie for life events; sincere skips jokes
  } else if (a.use === "once") useLines.push(
    spicy
      ? `Used once, that's ${money(a.price)} for one evening. Still cheaper than the date that goes nowhere.`
      : `Used once, that's ${money(a.price)} for one afternoon. Rent it, borrow it, or admit it's for the photo.`
  );
  else if (a.use === "weekends") useLines.push(`"Weekends" means about 20 real uses a year. That's ${money(perUse)} per use, and that's the optimistic math.`);
  else if (a.use === "daily") useLines.push(
    dream
      ? `Daily use puts it at ${money(perUse)} a day. There are hotels cheaper than that. Nice ones.`
      : `Daily use puts it at ${perUseStr} a day. Cheaper than most things you do daily without asking anyone.`
  );
  else useLines.push(`Weekly use is ${perUseStr} per use in year one, and it only gets cheaper from there.`);

  if (a.replaces === "habit") useLines.push("It replaces something you already pay for, so the real question is how many months of that habit it costs. Usually fewer than you think.");
  if (a.replaces === "broken") useLines.push("It replaces something broken. You're not choosing whether to spend, you're choosing when.");
  if (a.replaces === "fine") useLines.push(`It replaces something that works. You're paying ${money(a.price)} for the difference between "fine" and "new". Say that out loud.`);
  if (a.wanted === "someone" && !tiny && !life) useLines.push("You've wanted it since you saw someone else with it. Give it two weeks. Most of these don't survive two weeks.");
  if (a.wanted === "years") useLines.push(tiny ? `You've wanted it for years and it costs ${money(a.price)}. That's the cheapest closure on the market.` : "You've wanted it for years. That's not an impulse, that's a decision you keep postponing.");
  if (a.wanted === "morning" && !tiny) useLines.push("Since this morning. Nothing you've wanted since this morning has ever needed to be bought today.");
  if (a.ifnot === "nothing") useLines.push(tiny ? "Nothing happens if you don't buy it. Nothing happens if you do, either. That's what pocket change means." : "Your own words: nothing happens if you don't buy it. Read that again.");
  if (a.ifnot === "worse") useLines.push("You said your life is measurably worse without it. If that's true, the price is the least interesting number here.");

  const fact = sincere
    ? can
      ? `${pct}% of a month's income, for something that makes the other ${Math.max(0, 100 - pct)}% work better.`
      : `${ratio > NEVER_THRESHOLD ? `That's ${ratio.toFixed(1)} months of income` : `That's ${pct}% of a month's income`} right now. Sliding scales, public options, and cheaper slots exist — the want is right, the price is negotiable.`
    : `${moneyLine} ${useLines.slice(0, 2).join(" ")}`;

  return { key, title, punch, fact, pct, can, should: sincere || life ? true : should, need };
}

export interface PlanStep { label: string; months: number; note: string; real?: boolean }

export function plan(a: Answers): PlanStep[] {
  const saveMonthly = Math.max(50, Math.round(a.income * 0.1));
  const months = Math.max(1, Math.ceil(a.price / saveMonthly));
  const fam = a.household === "family";
  const m = (n: number) => Math.max(1, Math.ceil(n));
  return [
    { label: `Cancel ${3 + Math.min(4, Math.floor(a.price / 500))} subscriptions you forgot about`, months: m(a.price / 60), note: "Money you're already not enjoying" },
    { label: "Quit daily coffee", months: m(a.price / 120), note: "Gain money, lose personality" },
    fam
      ? { label: "Convince the kids birthdays are a social construct", months: m(a.price / 150), note: "Hard sell. Big savings." }
      : { label: "Stop buying rounds, call it minimalism", months: m(a.price / 200), note: "Friends will adjust. Eventually." },
    { label: "Sell the last thing you bought after asking this", months: 1, note: "You know the one" },
    { label: `Or just save ${money(saveMonthly)} a month like a normal person`, months, note: "Boring. Works.", real: true },
  ];
}
