// Hit-rate harness for the tier-1 link parser. Run: npx tsx scripts/parse-harness.ts [urls-file]
// Prints one line per URL (name/price/source/confidence) and a hit-rate summary.
// The URL list is the test fixture: real product pages across the stores we care about.
import { parseProductPage } from "../api/_lib/parse.js";
import { readFileSync } from "node:fs";

const DEFAULT_URLS = [
  // populated by scripts/parse-urls.txt; keep a couple inline as a smoke fallback
  "https://www.apple.com/shop/buy-airpods/airpods-pro-3",
  "https://www.ikea.com/us/en/p/billy-bookcase-white-00263850/",
];

const file = process.argv[2];
const urls = (file ? readFileSync(file, "utf8").split("\n") : DEFAULT_URLS)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

const short = (u: string) => new URL(u).hostname.replace(/^www\./, "");
const cell = (v: string | null, w: number) => (v ?? "—").slice(0, w).padEnd(w);

(async () => {
  const results = await Promise.all(
    urls.map(async (u) => {
      const started = Date.now();
      const r = await parseProductPage(u);
      return { u, r, ms: Date.now() - started };
    })
  );

  console.log(cell("store", 22), cell("name", 40), cell("price", 12), cell("src", 8), "conf", " ms");
  for (const { u, r, ms } of results) {
    const price = r.price ? `${r.price} ${r.currency ?? ""}`.trim() : null;
    console.log(cell(short(u), 22), cell(r.name, 40), cell(price, 12), cell(r.source, 8), r.confidence.toFixed(2), String(ms).padStart(5));
  }

  const full = results.filter(({ r }) => r.name && r.price).length;
  const nameOnly = results.filter(({ r }) => r.name && !r.price).length;
  const blocked = results.filter(({ r }) => r.source === "blocked" || r.source === "error").length;
  console.log(
    `\n${results.length} urls: ${full} full (name+price), ${nameOnly} name-only, ${blocked} blocked/error — tier-1 hit rate ${(
      (full / results.length) * 100
    ).toFixed(0)}%`
  );
})();
