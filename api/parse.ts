// POST /api/parse — { url } in, { name, price, currency, category, image, confidence, source } out.
// Tier 1: OG + JSON-LD from the page itself. Tier 2: when tier 1 can't produce name+price and an
// ANTHROPIC_API_KEY is configured, a fast/cheap model with web search fills the gaps.
// Still no cache (ROADMAP wants 24h by URL) — add once there's traffic worth caching.
// .js extensions are required: with "type": "module" Vercel runs these as ES modules,
// and Node ESM resolution needs explicit extensions on relative imports (TS maps .js -> .ts).
import { parseProductPage } from "./_lib/parse.js";
import { aiParseProduct } from "./_lib/ai.js";

export const config = { maxDuration: 30 }; // tier 1 (10s) + tier 2 (20s) can exceed the 10s default

interface VercelRequest {
  method?: string;
  body?: unknown;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  end(): VercelResponse;
}

// The server fetches a user-supplied URL, so refuse anything that could point inside our network.
function safeUrl(raw: unknown): URL | null {
  if (typeof raw !== "string" || raw.length > 2000) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) || // raw IPv4 — product links use hostnames
    host.includes(":") // raw IPv6
  ) {
    return null;
  }
  return u;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const url = safeUrl((req.body as Record<string, unknown> | undefined)?.url);
  if (!url) return res.status(400).json({ error: "bad url" });
  const result = await parseProductPage(url.href);
  if (result.name && result.price) return res.status(200).json(result);

  const guess = await aiParseProduct(url.href, result.name);
  if (!guess || (!guess.name && !guess.price)) return res.status(200).json(result);

  // tier 1 facts win where present; the model fills the gaps
  return res.status(200).json({
    ...result,
    name: result.name ?? guess.name,
    price: result.price ?? guess.price,
    currency: result.currency ?? guess.currency,
    category: result.category ?? guess.category,
    confidence: Math.min(0.7, guess.confidence), // searched, not read off the page — cap below tier 1's 0.75+
    source: "ai",
  });
}
