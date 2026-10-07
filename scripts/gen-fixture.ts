// Regenerates the calibration fixture from the CURRENT brain.
// Run ONLY when a behavior change is intentional: npx tsx scripts/gen-fixture.ts
// The fixture is the contract; scripts/calibrate.ts verifies the brain still honors it.
import { decide, Answers } from "../src/brain";
import { writeFileSync } from "node:fs";

const INCOMES = [1000, 4000, 12000];
const RATIOS = [0.004, 0.1, 0.3, 0.4, 0.8, 1.6, 30];
const NEEDSETS: Pick<Answers, "use" | "replaces" | "wanted" | "ifnot">[] = [
  { use: "daily", replaces: "broken", wanted: "years", ifnot: "worse" }, // high need
  { use: "once", replaces: "fine", wanted: "someone", ifnot: "nothing" }, // low need
  { use: "weekly", replaces: "new", wanted: "weeks", ifnot: "sad" }, // middle
  { use: "daily", replaces: "habit", wanted: "weeks", ifnot: "asking" }, // habit
];
const HOUSEHOLDS = ["solo", "partner", "family", "parents"] as const;

interface Case {
  input: { a: Answers; item?: string; category?: string };
  expect: { key: string; title: string; can: boolean; should: boolean; need: number; pct: number };
}

const cases: Case[] = [];
let h = 0;
const add = (a: Answers, item?: string, category?: string) => {
  const r = decide(a, undefined, item, category);
  cases.push({ input: { a, item, category }, expect: { key: r.key, title: r.title, can: r.can, should: r.should, need: r.need, pct: r.pct } });
};

for (const income of INCOMES)
  for (const ratio of RATIOS)
    for (const needs of NEEDSETS)
      add({ price: Math.round(income * ratio * 100) / 100, income, household: HOUSEHOLDS[h++ % 4], ...needs });

// tier/item/category cases
const base: Answers = { price: 120, income: 4000, household: "family", use: "weekly", replaces: "new", wanted: "weeks", ifnot: "sad" };
add({ ...base, price: 5 }, "ice cream");
add({ ...base, price: 80, use: "daily" }, "a vibrator");
add({ ...base, price: 80, use: "daily" }, "Satisfyer Pro 2", "Sex Toys");
add({ ...base, price: 500 }, "a dog");
add({ ...base, price: 8000 }, "a dog");
add({ ...base, price: 1000, use: "daily", wanted: "years" }, "a second kid");
add({ ...base, price: 30000, use: "once" }, "a wedding");
add({ ...base, price: 5000, replaces: "fine" }, "a divorce");
add({ ...base, price: 400, use: "weekly" }, "therapy");
add({ ...base, price: 2000 }, "therapy");
add({ ...base, price: 150000, use: "daily" }, "surgery");
add({ ...base, price: 120 }, "knee brace", "Medical Supplies");
add({ ...base, price: 40 }, "fancy shampoo", "Health & Personal Care");
add({ ...base, price: 200 }, "a dog bed", "Pet Supplies");
add({ ...base, price: 10000000, use: "once", wanted: "someone" }, "a yacht");
add({ ...base, price: 500, use: "weekends", wanted: "someone" }, "a PS5");

writeFileSync("tests/calibration.json", JSON.stringify(cases, null, 1));
console.log(`wrote tests/calibration.json with ${cases.length} cases`);
