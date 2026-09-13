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

export type Corner = "buy" | "why" | "save" | "no";

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

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const money = (n: number) => "$" + Math.round(n).toLocaleString();

export function decide(a: Answers, avoid?: string): Verdict {
  const ratio = a.price / Math.max(a.income, 1);
  const can = ratio <= CAN_THRESHOLD;
  const need = NEED.use[a.use] + NEED.replaces[a.replaces] + NEED.wanted[a.wanted] + NEED.ifnot[a.ifnot];
  const should = need >= SHOULD_THRESHOLD;

  let key: Corner = can ? (should ? "buy" : "why") : should ? "save" : "no";
  if (ratio > NEVER_THRESHOLD) key = "no";

  const v = VERDICTS[key];
  const unwrap = (l: Line) => (typeof l === "string" ? l : l.t);
  const fits = (l: Line) => typeof l === "string" || l.when(a);
  const base = (v.lines[a.household] ?? v.lines.family).filter(fits).map(unwrap);
  const pool = base.filter((l) => l !== avoid);
  const punch = rand(pool.length ? pool : base.length ? base : v.lines.family.filter(fits).map(unwrap));

  // the honest line: one money truth + up to two usage truths, all specific
  const pct = Math.round(ratio * 100);
  const usesPerYear = { daily: 365, weekly: 52, weekends: 20, once: 1 }[a.use];
  const perUse = a.price / usesPerYear;

  const moneyLine =
    ratio > NEVER_THRESHOLD
      ? `This is ${ratio.toFixed(1)} months of income. Not a purchase, a project.`
      : ratio > CAN_THRESHOLD
      ? `${pct}% of a month's income. Anything over a third of your month isn't "affordable", it's "survivable".`
      : ratio > 0.1
      ? `${pct}% of a month's income. Doable, but it's a real line on the statement, not a coffee.`
      : `${pct}% of a month's income. Financially this is a rounding error. The rest is psychology.`;

  const useLines: string[] = [];
  if (a.use === "once") useLines.push(`Used once, that's ${money(a.price)} for one afternoon. Rent it, borrow it, or admit it's for the photo.`);
  else if (a.use === "weekends") useLines.push(`"Weekends" means about 20 real uses a year. That's ${money(perUse)} per use, and that's the optimistic math.`);
  else if (a.use === "daily") useLines.push(`Daily use puts it at ${money(perUse)} a day. Cheaper than most things you do daily without asking anyone.`);
  else useLines.push(`Weekly use is ${money(perUse)} per use in year one, and it only gets cheaper from there.`);

  if (a.replaces === "habit") useLines.push("It replaces something you already pay for, so the real question is how many months of that habit it costs. Usually fewer than you think.");
  if (a.replaces === "broken") useLines.push("It replaces something broken. You're not choosing whether to spend, you're choosing when.");
  if (a.replaces === "fine") useLines.push(`It replaces something that works. You're paying ${money(a.price)} for the difference between "fine" and "new". Say that out loud.`);
  if (a.wanted === "someone") useLines.push("You've wanted it since you saw someone else with it. Give it two weeks. Most of these don't survive two weeks.");
  if (a.wanted === "years") useLines.push("You've wanted it for years. That's not an impulse, that's a decision you keep postponing.");
  if (a.wanted === "morning") useLines.push("Since this morning. Nothing you've wanted since this morning has ever needed to be bought today.");
  if (a.ifnot === "nothing") useLines.push("Your own words: nothing happens if you don't buy it. Read that again.");
  if (a.ifnot === "worse") useLines.push("You said your life is measurably worse without it. If that's true, the price is the least interesting number here.");

  const fact = `${moneyLine} ${useLines.slice(0, 2).join(" ")}`;

  return { key, title: v.title, punch, fact, pct, can, should, need };
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
