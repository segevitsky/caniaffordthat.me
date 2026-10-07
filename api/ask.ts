// POST /api/ask — log one verdict to Supabase. ROADMAP.md Phase 1 item 1.
// Fire-and-forget from the client; validates everything, buckets income (privacy rule:
// income is stored as a bucket, never a number), inserts with the secret key.
// Minimal local types instead of @vercel/node, to keep the site dependency-free.
// Shape-compatible with Vercel's Node runtime (req.body is pre-parsed JSON).
interface VercelRequest {
  method?: string;
  body?: unknown;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  end(): VercelResponse;
}
declare const process: { env: Record<string, string | undefined> };

const HOUSEHOLDS = ["solo", "partner", "family", "parents"];
const USES = ["daily", "weekly", "weekends", "once"];
const REPLACES = ["new", "broken", "fine", "habit"];
const WANTED = ["morning", "weeks", "years", "someone"];
const IFNOT = ["nothing", "sad", "asking", "worse"];
const CORNERS = ["buy", "why", "save", "no", "tiny", "dream"];
const MONTHS = ["untouched", "fewthings", "stopped", "cardknows"];

const oneOf = (v: unknown, list: string[]): v is string => typeof v === "string" && list.includes(v);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const positive = (v: unknown, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max;

function incomeBucket(income: number): string {
  if (income < 2000) return "lt2k";
  if (income < 4000) return "2k-4k";
  if (income < 6000) return "4k-6k";
  if (income < 10000) return "6k-10k";
  if (income < 20000) return "10k-20k";
  return "gte20k";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const body = (req.body ?? {}) as Record<string, unknown>;
  const { item, price, corner, can, should, punch } = body;
  const a = (body.answers ?? {}) as Record<string, unknown>;

  if (
    !text(item, 200) ||
    !positive(price, 1e12) ||
    !positive(a.income, 1e9) ||
    !oneOf(a.household, HOUSEHOLDS) ||
    !oneOf(a.use, USES) ||
    !oneOf(a.replaces, REPLACES) ||
    !oneOf(a.wanted, WANTED) ||
    !oneOf(a.ifnot, IFNOT) ||
    !oneOf(corner, CORNERS) ||
    typeof can !== "boolean" ||
    typeof should !== "boolean" ||
    !text(punch, 300)
  ) {
    return res.status(400).json({ error: "bad body" });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: "server not configured" });

  const category = typeof body.category === "string" && body.category.length > 0 ? body.category.slice(0, 100) : null;

  // signals as computed by the brain: [{name, axis, score, weight}] — sanitized, never rejected
  const rawSignals = Array.isArray(body.signals) ? body.signals.slice(0, 10) : [];
  const signals = rawSignals.flatMap((s) => {
    const o = (s ?? {}) as Record<string, unknown>;
    return typeof o.name === "string" && o.name.length <= 40 &&
      (o.axis === "can" || o.axis === "should") &&
      typeof o.score === "number" && Number.isFinite(o.score) &&
      typeof o.weight === "number" && Number.isFinite(o.weight)
      ? [{ name: o.name, axis: o.axis, score: o.score, weight: o.weight }]
      : [];
  });
  const row = {
    item: item.trim(),
    price,
    currency: "USD",
    category,
    income_bucket: incomeBucket(a.income),
    household: a.household,
    month_state: oneOf(a.month, MONTHS) ? a.month : null,
    use: a.use,
    replaces: a.replaces,
    wanted: a.wanted,
    ifnot: a.ifnot,
    corner,
    can,
    should,
    punch,
    signals: signals.length ? signals : null,
    source: "web",
  };

  const insert = await fetch(`${url}/rest/v1/asks`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!insert.ok) return res.status(502).json({ error: "insert failed" });
  return res.status(204).end();
}
