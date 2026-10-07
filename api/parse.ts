// POST /api/parse — { url } in, { name, price, currency, category, image, confidence, source } out.
// Tier 1 only (OG + JSON-LD). AI fallback and the 24h cache come after the spike proves the tier-1 hit rate.
import { parseProductPage } from "./_lib/parse";

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
  return res.status(200).json(result);
}
