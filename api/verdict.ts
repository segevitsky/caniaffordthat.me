// POST /api/verdict — the writer (ROADMAP §1.4). Brain output + context in, one AI-written
// punch + personal line out. The brain already decided; the writer only delivers. On any
// failure or validation miss: { fallback: true } and the client keeps its pool line.
import { complete } from "./_lib/ai.js";
import { writerPrompt, WriterCtx } from "./_lib/voice.js";

interface VercelRequest {
  method?: string;
  body?: unknown;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  end(): VercelResponse;
}

const CORNERS = ["buy", "why", "save", "no", "tiny", "dream"];
const TONES = ["normal", "spicy", "sincere"];
const FALLBACK = { punch: null, personal: null, fallback: true };

const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// every digit-run in the output must appear verbatim in the inputs — no invented numbers
function digitsOk(text: string, allowed: Set<string>): boolean {
  return (text.match(/\d+/g) ?? []).every((d) => allowed.has(d));
}

// the writer must never contradict the verdict
function agreesWithCorner(punch: string, corner: string): boolean {
  if ((corner === "no" || corner === "dream") && /^(yes\b|buy it\b)/i.test(punch.trim())) return false;
  if ((corner === "buy" || corner === "tiny") && /^(no\b|absolutely not\b|don't\b)/i.test(punch.trim())) return false;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const b = (req.body ?? {}) as Record<string, unknown>;

  if (
    !str(b.item, 200) || !str(b.title, 60) || !str(b.persona, 20) ||
    !CORNERS.includes(b.corner as string) || !num(b.price) || !num(b.income) || !num(b.pct) ||
    !Array.isArray(b.reasons) || b.reasons.length > 6 || !b.reasons.every((r) => str(r, 200))
  ) {
    return res.status(400).json({ error: "bad body" });
  }

  const ctx: WriterCtx = {
    item: (b.item as string).trim(),
    category: typeof b.category === "string" ? b.category.slice(0, 100) : null,
    corner: b.corner as string,
    title: b.title as string,
    persona: b.persona as string,
    tone: TONES.includes(b.tone as string) ? (b.tone as WriterCtx["tone"]) : "normal",
    price: b.price as number,
    income: b.income as number,
    pct: b.pct as number,
    month: typeof b.month === "string" ? b.month.slice(0, 20) : null,
    reasons: b.reasons as string[],
    avoid: typeof b.avoid === "string" ? b.avoid.slice(0, 300) : undefined,
  };

  const text = await complete(writerPrompt(ctx), 300);
  if (!text) return res.status(200).json(FALLBACK);

  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) return res.status(200).json(FALLBACK);
  let punch: string, personal: string | null;
  try {
    const o = JSON.parse(match[0]) as Record<string, unknown>;
    if (typeof o.punch !== "string") return res.status(200).json(FALLBACK);
    punch = o.punch.replace(/\s+/g, " ").trim();
    personal = typeof o.personal === "string" ? o.personal.replace(/\s+/g, " ").trim().slice(0, 300) : null;
  } catch {
    return res.status(200).json(FALLBACK);
  }

  const allowedDigits = new Set(
    [ctx.item, ctx.title, String(ctx.price), String(ctx.income), String(ctx.pct), ...ctx.reasons]
      .flatMap((s) => s.match(/\d+/g) ?? [])
  );
  const valid =
    punch.length > 0 && punch.length <= 140 &&
    agreesWithCorner(punch, ctx.corner) &&
    digitsOk(punch, allowedDigits) &&
    (personal === null || digitsOk(personal, allowedDigits));
  if (!valid) return res.status(200).json(FALLBACK);

  return res.status(200).json({ punch, personal, fallback: false });
}
