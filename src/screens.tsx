import { useEffect, useMemo, useRef, useState } from "react";
import { Answers, categoryKind, decide, interceptFor, isSpicy, money, pickLine, plan } from "./brain";
import { renderReceipt } from "./receipt";
import { Aside, Btn, Q } from "./ui";

const PLACEHOLDERS = [
  "a PS5", "a house", "a third coffee machine", "a divorce", "a MacBook Pro I don't need",
  "a dog", "an electric bike", "a second kid", "the good olive oil", "a standing desk",
];

export interface ParsedLink { name: string | null; price: number | null; category: string | null }

export function Intro({ onNext, onParsed }: { onNext: (item: string) => void; onParsed: (parsed: ParsedLink, url: string) => void }) {
  const [item, setItem] = useState("");
  const [link, setLink] = useState("");
  const [reading, setReading] = useState(false);
  const [linkFail, setLinkFail] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % PLACEHOLDERS.length), 1800);
    return () => clearInterval(t);
  }, []);
  const go = () => item.trim() && onNext(item.trim());
  const goLink = async () => {
    const url = link.trim();
    if (!url || reading) return;
    setReading(true);
    setLinkFail(false);
    try {
      const r = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const p = r.ok ? ((await r.json()) as ParsedLink) : null;
      if (p?.name || p?.price) onParsed({ name: p.name, price: p.price, category: p.category ?? null }, url);
      else setLinkFail(true);
    } catch {
      setLinkFail(true);
    } finally {
      setReading(false);
    }
  };
  return (
    <div className="fadein">
      <p className="font-body text-lg mb-10 text-ink/55">caniaffordthat.me</p>
      <h1 className="font-display text-4xl sm:text-5xl md:text-7xl leading-[1.02] mb-8 md:mb-10 text-ink max-w-[12ch] tracking-tight">What do you want to buy?</h1>
      <input
        autoFocus
        value={item}
        onChange={(e) => setItem(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder={PLACEHOLDERS[i]}
        className="font-body w-full bg-transparent text-2xl sm:text-3xl md:text-5xl py-3 md:py-4 mb-8 focus:outline-none border-b-4 border-ink text-ink"
      />
      <Btn onClick={go} disabled={!item.trim()}>Let's find out</Btn>
      <div className="mt-10">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && goLink()}
          placeholder="or paste a link from any store"
          inputMode="url"
          disabled={reading}
          className="font-body w-full bg-transparent text-lg md:text-xl py-3 min-h-[44px] focus:outline-none border-b-2 border-ink/30 focus:border-ink text-ink placeholder:text-ink/40 disabled:opacity-50"
        />
        {reading && <p className="font-body text-base mt-3 text-ink/55 fadein">Reading the page. Stores lie, give it a second.</p>}
        {linkFail && <p className="font-body text-base mt-3 text-ink/55 fadein">That store won't talk to us. Type it yourself, it's faster than their website anyway.</p>}
      </div>
    </div>
  );
}

export function PriceQ({ item, initial, onNext }: { item: string; initial?: number | null; onNext: (n: number) => void }) {
  const [v, setV] = useState(initial && initial > 0 ? String(initial) : "");
  const n = Number(v);
  const go = () => n > 0 && onNext(n);
  return (
    <div>
      <Q>How much is {item}?</Q>
      <Aside>{initial ? "From the link. Correct it if the store was lying." : "Real price. Not the price you're going to tell people."}</Aside>
      <div className="flex items-end gap-2 mb-8">
        <span className="font-display text-3xl sm:text-4xl md:text-6xl text-ink">$</span>
        <input
          autoFocus
          type="number"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="0"
          inputMode="decimal" className="font-body bg-transparent text-3xl sm:text-4xl md:text-6xl w-full focus:outline-none border-b-4 border-ink text-ink"
        />
      </div>
      <Btn onClick={go} disabled={!(n > 0)}>Next</Btn>
    </div>
  );
}

export function SliderQ({ q, aside, min, max, step, format, onNext, initial }: {
  q: string; aside: string; min: number; max: number; step: number; initial: number;
  format: (v: number) => string; onNext: (v: number) => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <div>
      <Q>{q}</Q>
      <Aside>{aside}</Aside>
      <div className="font-display text-4xl sm:text-5xl md:text-7xl mb-4 text-blue">{format(v)}</div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => setV(Number(e.target.value))} className="w-full h-10 mb-8 md:mb-10" aria-label={q} />
      <Btn onClick={() => onNext(v)}>Next</Btn>
    </div>
  );
}

export function ChoiceQ<T extends string>({ q, aside, options, onNext }: {
  q: string; aside?: string; options: { label: string; value: T }[]; onNext: (v: T) => void;
}) {
  return (
    <div>
      <Q>{q}</Q>
      {aside && <Aside>{aside}</Aside>}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => onNext(o.value)}
            className="font-body w-full sm:w-auto px-5 py-4 sm:py-3 min-h-[52px] text-lg font-semibold rounded-full focus:outline-none focus-visible:ring-4 text-left border-[3px] border-ink text-ink bg-transparent hover:bg-ink/5"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const REROLL = ["Say it differently", "Try again, I didn't like that", "One more", "Last one, I promise", "Okay you're just stalling now"];

export function Verdict({ item, a, category, onPlan, onReset }: { item: string; a: Answers; category?: string | null; onPlan: () => void; onReset: () => void }) {
  const [r, setR] = useState(() => decide(a, undefined, item, category));
  const [rolls, setRolls] = useState(0);
  // the writer (ROADMAP §1.4): pool punch shows instantly on load, the AI's replaces it when
  // it lands. On re-roll the current line HOLDS until the new one is ready — one change per
  // click, never two (pool fallback only if the writer is slow or fails).
  const [ai, setAi] = useState<{ punch: string; personal: string | null } | null>(null);
  const [rolling, setRolling] = useState(false);
  const aiSeq = useRef(0);
  const fetchWriter = (avoid?: string): Promise<{ punch: string | null; personal: string | null; fallback: boolean } | null> => {
    const tone = r.title === "Yes. Go." || r.title === "Find a way."
      ? "sincere"
      : isSpicy(item) || (category ? categoryKind(category) === "spicy" : false) ? "spicy" : "normal";
    return fetch("/api/verdict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        item, category: category ?? null, corner: r.key, title: r.title, persona: a.household, tone,
        price: a.price, income: a.income, pct: r.pct, month: a.month ?? null, reasons: r.reasons, avoid,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  };
  useEffect(() => {
    const id = ++aiSeq.current;
    fetchWriter().then((d) => { if (aiSeq.current === id && d && !d.fallback && d.punch) setAi({ punch: d.punch, personal: d.personal ?? null }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // learning loop (ROADMAP.md §1.1): fire-and-forget, once per verdict shown
    fetch("/api/ask", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        item,
        price: a.price,
        category: category ?? null,
        answers: { income: a.income, household: a.household, month: a.month ?? null, use: a.use, replaces: a.replaces, wanted: a.wanted, ifnot: a.ifnot },
        corner: r.key,
        can: r.can,
        should: r.should,
        punch: r.punch,
        signals: r.signals.map(({ name, axis, score, weight }) => ({ name, axis, score, weight })),
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const reroll = () => {
    if (rolling) return;
    const shown = ai?.punch ?? r.punch;
    const next = decide(a, r.punch, item, category); // next pool roll, held back as the fallback
    setRolls((n) => n + 1);
    if (rolls >= 5) {
      // past "Okay you're just stalling now": the site gives up on you — free pool lines only
      setAi(null);
      setR(next);
      return;
    }
    const id = ++aiSeq.current;
    setRolling(true);
    const usePool = () => {
      if (aiSeq.current !== id) return;
      setAi(null);
      setR(next);
      setRolling(false);
    };
    const timer = setTimeout(usePool, 2500); // writer too slow -> pool line, one change either way
    fetchWriter(shown).then((d) => {
      if (aiSeq.current !== id) return;
      clearTimeout(timer);
      if (d && !d.fallback && d.punch && d.punch !== shown) {
        setAi({ punch: d.punch, personal: d.personal ?? null });
        setRolling(false);
      } else usePool();
    });
  };
  const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`font-body text-sm font-semibold px-3 py-1 rounded-full ${ok ? "bg-blue text-paper" : "bg-ink text-yellow"}`}>
      {label}: {ok ? "yes" : "no"}
    </span>
  );
  const clean = r.key === "buy" || r.key === "tiny";
  const shownPunch = ai?.punch ?? r.punch;

  // the receipt (ROADMAP §1.8): re-rendered whenever the shown punch changes
  const receiptBlob = useRef<Blob | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  useEffect(() => {
    let stale = false;
    renderReceipt(a, r, item, shownPunch)
      .then((blob) => {
        if (stale) return;
        receiptBlob.current = blob;
        setReceiptUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      })
      .catch(() => {});
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownPunch]);

  const shareReceipt = async () => {
    const blob = receiptBlob.current ?? (await renderReceipt(a, r, item, shownPunch).catch(() => null));
    if (!blob) return;
    const file = new File([blob], "caniaffordthat-receipt.png", { type: "image/png" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch { /* user closed the sheet */ }
    }
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = "caniaffordthat-receipt.png";
    el.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };
  return (
    <div className="fadein">
      <p className="font-body text-lg mb-4 text-ink/55">{item}, {money(a.price)}</p>
      <div className="flex gap-2 mb-6"><Pill ok={r.can} label="Can afford" /><Pill ok={r.should} label="Should buy" /></div>
      <div className={`font-display text-2xl mb-4 inline-block px-3 py-1 text-ink ${clean ? "" : "bg-yellow"}`}>{r.title}</div>
      <h2 key={shownPunch} className="font-display fadein text-3xl sm:text-4xl md:text-6xl leading-[1.02] mb-6 text-ink max-w-[16ch] tracking-tight">{shownPunch}</h2>
      <button onClick={reroll} disabled={rolling} className={`font-body text-base mb-8 px-4 py-3 min-h-[44px] rounded-full border-2 border-ink text-ink focus:outline-none focus-visible:ring-4 ${rolling ? "opacity-50" : ""}`}>
        {rolling ? "Thinking…" : REROLL[Math.min(rolls, REROLL.length - 1)]}
      </button>
      <p className="font-body text-lg md:text-xl mb-10 max-w-xl text-ink border-l-[6px] border-yellow pl-4">{r.fact}</p>
      {ai?.personal && <p key={ai.personal} className="font-body fadein text-lg md:text-xl -mt-6 mb-10 max-w-xl text-ink border-l-[6px] border-blue pl-4">{ai.personal}</p>}

      {receiptUrl && (
        <div className="mb-10 max-w-sm">
          <img src={receiptUrl} alt="Your verdict, as a receipt" className="w-full drop-shadow-md" />
          <div className="mt-4">
            <Btn dark onClick={shareReceipt}>Send the receipt</Btn>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
        {(r.key === "save" || r.key === "no" || r.key === "dream") && <Btn onClick={onPlan}>Show me how to afford it anyway</Btn>}
        <button onClick={onReset} className="font-body text-lg underline text-ink/55 py-3 text-left">Ask about something else</button>
      </div>
    </div>
  );
}

export function Intercept({ item, onReset }: { item: string; onReset: () => void }) {
  const info = interceptFor(item)!;
  const [punch, setPunch] = useState(() => pickLine(info.lines));
  const [rolls, setRolls] = useState(0);
  const reroll = () => { setPunch(pickLine(info.lines, punch)); setRolls((n) => n + 1); };
  return (
    <div className="fadein">
      <p className="font-body text-lg mb-4 text-ink/55">{item}</p>
      <div className="font-display text-2xl mb-4 inline-block px-3 py-1 text-ink bg-yellow">{info.title}</div>
      <h2 key={punch} className="font-display fadein text-3xl sm:text-4xl md:text-6xl leading-[1.02] mb-6 text-ink max-w-[16ch] tracking-tight">{punch}</h2>
      <button onClick={reroll} className="font-body text-base mb-8 px-4 py-3 min-h-[44px] rounded-full border-2 border-ink text-ink focus:outline-none focus-visible:ring-4">
        {REROLL[Math.min(rolls, REROLL.length - 1)]}
      </button>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
        <Btn onClick={onReset}>Ask about something you can actually buy</Btn>
      </div>
    </div>
  );
}

export function Plan({ item, a, onReset }: { item: string; a: Answers; onReset: () => void }) {
  const steps = useMemo(() => plan(a), [a]);
  const fmtM = (m: number) => (m >= 24 ? `${(m / 12).toFixed(m % 12 === 0 ? 0 : 1)} yrs` : `${m} mo`);
  return (
    <div className="fadein">
      <p className="font-body text-lg mb-6 text-ink/55">The optimistic plan for {item}</p>
      <h2 className="font-display text-3xl sm:text-4xl md:text-6xl leading-[1.02] mb-3 text-ink max-w-[14ch] tracking-tight">Fine. Here's how.</h2>
      <Aside>How long each strategy takes on its own. Pick one. Or don't.</Aside>
      <ol className="max-w-2xl mb-12 border-l-[3px] border-ink ml-[10px]">
        {steps.map((s, i) => (
          <li key={i} className="relative pl-8 mb-8">
            <span className={`absolute rounded-full w-[21px] h-[21px] -left-3 top-1.5 border-[3px] ${s.real ? "bg-blue border-blue" : "bg-paper border-ink"}`} />
            <div className={`font-display text-lg mb-1 ${s.real ? "text-blue" : "text-ink"}`}>{fmtM(s.months)}</div>
            <div className={`font-body text-lg md:text-xl text-ink ${s.real ? "font-semibold" : ""}`}>{s.label}</div>
            <p className="font-body text-sm mt-1 text-ink/55">{s.note}</p>
          </li>
        ))}
      </ol>
      <Btn dark onClick={onReset}>Start over, wiser</Btn>
    </div>
  );
}
