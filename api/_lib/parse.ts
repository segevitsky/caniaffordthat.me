// Tier-1 link parser: fetch the page, read JSON-LD (schema.org Product) first, OG/meta tags second.
// No AI, no dependencies. ROADMAP.md api/parse — this is the spike that measures whether the
// "share a link, get a verdict" bet survives contact with real stores.
// Files under api/_lib are not deployed as functions (underscore prefix); the handler and the
// local harness both import from here.

export interface ParseResult {
  name: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  image: string | null;
  confidence: number; // 0..1 — under 0.5 means "show what we have and ask"
  source: "jsonld" | "og" | "title" | "blocked" | "error" | "none";
  status?: number;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

const SYMBOLS: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "₪": "ILS", "¥": "JPY" };

function toPrice(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// ---- JSON-LD ----------------------------------------------------------------

function* jsonLdBlocks(html: string): Generator<unknown> {
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      yield JSON.parse(m[1].trim());
    } catch {
      /* malformed block, skip */
    }
  }
}

function* walk(node: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(node)) for (const n of node) yield* walk(n);
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    yield o;
    if (o["@graph"]) yield* walk(o["@graph"]);
    if (o.mainEntity) yield* walk(o.mainEntity);
  }
}

function isProduct(o: Record<string, unknown>): boolean {
  const t = o["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && /product/i.test(x));
}

function fromJsonLd(html: string): Partial<ParseResult> | null {
  for (const block of jsonLdBlocks(html)) {
    for (const o of walk(block)) {
      if (!isProduct(o)) continue;
      const offers = o.offers;
      const offer = (Array.isArray(offers) ? offers[0] : offers) as Record<string, unknown> | undefined;
      const spec = (offer?.priceSpecification ?? {}) as Record<string, unknown>;
      const price = toPrice(offer?.price ?? offer?.lowPrice ?? spec.price);
      const name = typeof o.name === "string" ? decodeEntities(o.name) : null;
      if (!name && !price) continue;
      const image = Array.isArray(o.image) ? o.image[0] : o.image;
      return {
        name,
        price,
        currency:
          (typeof offer?.priceCurrency === "string" && offer.priceCurrency) ||
          (typeof spec.priceCurrency === "string" && spec.priceCurrency) ||
          null,
        category: typeof o.category === "string" ? o.category : null,
        image: typeof image === "string" ? image : null,
        source: "jsonld",
      };
    }
  }
  return null;
}

// ---- OG / meta tags ---------------------------------------------------------

function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    // property/name/itemprop in either attribute order
    const re = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)\\s*=\\s*["']${key.replace(/[.:*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
      "i"
    );
    const tag = re.exec(html)?.[0];
    if (!tag) continue;
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (content) return decodeEntities(content);
  }
  return null;
}

function fromMeta(html: string): Partial<ParseResult> | null {
  const name = metaContent(html, ["og:title", "twitter:title"]);
  const rawPrice = metaContent(html, ["product:price:amount", "og:price:amount", "price"]);
  const currency = metaContent(html, ["product:price:currency", "og:price:currency", "priceCurrency"]);
  const image = metaContent(html, ["og:image", "twitter:image"]);
  const price = toPrice(rawPrice);
  if (!name && !price) return null;
  return { name, price, currency, image, source: "og" };
}

// ---- entry ------------------------------------------------------------------

export async function parseProductPage(url: string, timeoutMs = 10_000): Promise<ParseResult> {
  const none: ParseResult = { name: null, price: null, currency: null, category: null, image: null, confidence: 0, source: "none" };
  let html: string;
  let status: number;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const resp = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,he;q=0.8",
      },
    });
    clearTimeout(timer);
    status = resp.status;
    if (!resp.ok) return { ...none, source: "blocked", status };
    html = await resp.text();
  } catch {
    return { ...none, source: "error" };
  }

  const ld = fromJsonLd(html);
  const og = fromMeta(html);
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];

  // bot-challenge pages return 200 with a fake title — a wrong "name" is worse than none
  if (title && /robot or human|access denied|captcha|are you (a )?human|pardon our interruption|verification required|just a moment/i.test(title)) {
    return { ...none, source: "blocked", status };
  }

  // JSON-LD wins, OG fills its gaps, <title> is the last resort for a name
  const name = ld?.name ?? og?.name ?? (title ? decodeEntities(title) : null);
  const price = ld?.price ?? og?.price ?? null;
  let currency = ld?.currency ?? og?.currency ?? null;
  if (currency && SYMBOLS[currency]) currency = SYMBOLS[currency];

  const source: ParseResult["source"] = ld ? "jsonld" : og ? "og" : title ? "title" : "none";
  const confidence = name && price ? (ld ? 0.9 : 0.75) : name ? 0.4 : 0;

  return {
    name: name ? name.slice(0, 200) : null,
    price,
    currency,
    category: ld?.category ?? null,
    image: ld?.image ?? og?.image ?? null,
    confidence,
    source,
    status,
  };
}
