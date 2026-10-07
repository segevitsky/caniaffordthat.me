// The AI wrapper — the only file that talks to a model provider (ROADMAP.md: keep the vendor
// swappable; moves to packages/core/ai.ts with the monorepo). Raw fetch, no SDK, no dependencies.
// Tier 2 of the link parser: when OG/JSON-LD fails, ask a fast/cheap model with web search.

const MODEL = "claude-haiku-4-5"; // ROADMAP.md: fast/cheap tier for parse and writer

declare const process: { env: Record<string, string | undefined> };

export interface AiProductGuess {
  name: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  confidence: number;
}

function extractJson(text: string): AiProductGuess | null {
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) return null;
  try {
    const o = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      name: typeof o.name === "string" ? o.name.slice(0, 200) : null,
      price: typeof o.price === "number" && Number.isFinite(o.price) && o.price > 0 ? o.price : null,
      currency: typeof o.currency === "string" ? o.currency.slice(0, 3).toUpperCase() : null,
      category: typeof o.category === "string" ? o.category.slice(0, 100) : null,
      confidence: typeof o.confidence === "number" ? Math.max(0, Math.min(1, o.confidence)) : 0.5,
    };
  } catch {
    return null;
  }
}

// Generic completion — returns the model's text, or null when no key / any failure.
// Every AI feature on the site goes through this file; nothing else knows the provider.
export async function complete(prompt: string, maxTokens = 300, timeoutMs = 10_000): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = (await resp.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n");
    return text || null;
  } catch {
    return null;
  }
}

// Returns null when no API key is configured or the call fails — tier 1's result stands.
export async function aiParseProduct(url: string, tier1Name: string | null): Promise<AiProductGuess | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const prompt = `A user pasted this product link into a shopping site: ${url}
${tier1Name ? `The page title suggests the product is: "${tier1Name}".` : "The store blocked us, so we know nothing about the product."}
Identify the product and its current retail price. Use web search if you are not certain.
Respond with ONLY a JSON object, no other text:
{"name": <short product name, string or null>, "price": <number or null>, "currency": <ISO code like "USD" or "ILS", or null>, "category": <short category like "electronics", or null>, "confidence": <0 to 1>}
Rules: price is a plain number (no symbols). If you cannot determine a field, use null. Never invent a price.`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{ role: "user", content: prompt }],
      }),
    });
    clearTimeout(timer);
    if (!resp.ok) return null;

    const data = (await resp.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n");
    return extractJson(text);
  } catch {
    return null;
  }
}
