// Calibration test: the brain must reproduce the recorded fixture exactly.
// Run: npm test. If a behavior change is INTENDED, regenerate with scripts/gen-fixture.ts
// and review the fixture diff in the same commit.
import { decide } from "../src/brain";
import { readFileSync } from "node:fs";

interface Case {
  input: { a: Parameters<typeof decide>[0]; item?: string; category?: string };
  expect: { key: string; title: string; can: boolean; should: boolean; need: number; pct: number };
}

const cases: Case[] = JSON.parse(readFileSync("tests/calibration.json", "utf8"));
let failed = 0;
for (const [i, c] of cases.entries()) {
  const r = decide(c.input.a, undefined, c.input.item, c.input.category);
  const got = { key: r.key, title: r.title, can: r.can, should: r.should, need: r.need, pct: r.pct };
  if (JSON.stringify(got) !== JSON.stringify(c.expect)) {
    failed++;
    console.error(`case ${i} MISMATCH\n  input:  ${JSON.stringify(c.input)}\n  expect: ${JSON.stringify(c.expect)}\n  got:    ${JSON.stringify(got)}`);
  }
}
if (failed) {
  console.error(`\n${failed}/${cases.length} cases FAILED`);
  process.exit(1);
}
console.log(`calibration: ${cases.length}/${cases.length} cases match`);
