# caniaffordthat.me — product plan

Last revised: 2026-10-07. Supersedes the earlier roadmap.

## What it is
A friend who looks at the purchase before you make it. People come for "can I afford that" and get
"should you buy that", told the truth but funny. Once it knows you, every product link you share
gets a verdict in a second.

Two surfaces, one brain:
- **Web (caniaffordthat.me)** — the front door and the desktop experience. Type a product or paste a link,
  answer the questions, get the verdict. Fully usable on its own; this is where everything ships first.
- **Mobile app** — same brain, the share sheet wrapped around it. Onboard once, then share links from any
  store. Holds the list and the monthly receipt.

Target persona for v1: couple with kids, 30–42. Signature verdict: "You can. But why?"

## How a verdict is made
Three parts, clear boundaries:

1. **Link parser (AI).** URL in, `{ name, price, currency, category, confidence }` out. OG tags first,
   model-with-search as fallback. The user sees the result and can correct it. Low confidence = ask.
2. **The brain (code, deterministic).** A set of **signals**, each a small pure function:
   `{ name, axis: "can"|"should", score, weight, reason }`. Signals come from the user's answers, from
   their history, or from AI-supplied product facts; the brain sums them per axis and picks one of four
   corners (buy / why / save / no). Same inputs, same corner, always. The top signals are the reasons.
3. **The writer (AI).** Gets the corner, the numbers, the top signals, the product, the user's answers and
   history, and our voice (style rules + ~20 example punchlines). Returns one punchline, three specific
   reasons, one personal line. Different every time, never a different direction. May add a caveat that
   offers the user a tap to change an input ("the old one broke?"); never overrides the brain.

Fallback: if the writer call fails, a small hand-written pool produces the punchline so a verdict always appears.

Learning: every verdict logs its signals and what happened after (kept, bought, dropped). Weights are
tuned by hand from that data, slowly. Thresholds and structure stay fixed. Never learned by the model directly.

---

## Phase 1 — Web: brain v2 + writer (now)
Goal: the site becomes the real product in miniature, and we learn from every visitor.

1. **Learning loop + analytics.** Supabase, table `asks` (signals included), `api/ask`, GA4 live. Ships first.
2. **Brain v2: signals.** Refactor `brain.ts` into signal functions. Existing four inputs become four
   signals; thresholds unchanged, output unchanged. Add `item` to `Answers`.
3. **Eighth question.** "How's this month going?" (Untouched, it's the 1st / A few things I'd rather not
   mention / Stopped checking around the 12th / The card knows more than I do). A `can` signal.
4. **The writer.** `api/verdict`: brain output + context → model → punchline, three reasons, personal line.
   Voice doc with ~20 example punchlines (today's pools become these). Latency budget 2s; pool fallback.
5. **Verdict screen v2.** Punchline, three reasons (from signals), re-roll re-asks the writer, "full math"
   expands the numbers. Pills stay.
6. **Paste a link.** Second field on the intro. `api/parse` → name + price prefilled → questions.
7. **OG tags + intro copy.** Static OG image, one-line explainer, SEO block below the fold.
8. **Receipt** as the share artifact (spec below). Replaces the dark card.
9. **Partner mode** (spec below). Deterministic text for the shared link: seed the writer with the
   encoded answers so both people read the same verdict.

Done means: a stranger pastes a link, gets a verdict that mentions their actual situation, and sends
the receipt to someone.

## Phase 2 — Mobile app
Goal: the share-sheet habit. Same brain and writer via the same endpoints.

10. **Expo project.** React Native + TypeScript. `brain.ts` shared with the web as a package. Onboarding
    (income, household, month) stored on device. Paste-a-link screen, verdict screen.
11. **Share intent** (expo-share-intent). Share from any store → app opens with the link → verdict.
    v1 opens the app; the in-store sheet (native extension UI) comes later.
12. **Auth + list.** Supabase email magic link, table `list`, "Things you almost bought" screen, "Keep it
    on the list" button. Onboarding profile moves to the account.
13. **History signals.** Repeat category, time of day, kept-vs-bought ratio. Pre-filled answers
    ("Replaces the one from August?"). This is where the writer gets personal.
14. **Monthly receipt.** Push/email: "September: 7 things, $3,106 still yours."
15. **Store prep + quiet launch.** TestFlight to 20 people. Metric: links shared per person per week.
    Under 3 → fix friction in 11 before anything else.

## Phase 3 — Money and depth (only after 15 shows a habit)
16. **Affiliate on "buy it" only.** The user's own link, our tag. Transparency line next to it.
17. **Product-knowledge signals (AI-supplied).** Cost of ownership, resale value, category abandonment
    rate. Fixed weights, shown as reasons.
18. **"I disagree" — one round.** User writes a sentence, writer answers once, may propose an input change.
19. **In-store sheet on iOS** (Swift). Verdict without leaving the store.
20. **Pro.** List + monthly receipt + year-end "money you didn't spend." Small subscription.
21. **Brands judged in public** — paid, honest, published by them. Only works because we say no.

Not doing until Phase 3: affiliate, AI in the brain's decision, browser extension, Hebrew edition, open chat.

---

## Technical direction

### Stack
- **Web:** stays Vite + React + TS + Tailwind. Server code lives in `api/` as Vercel serverless functions
  (Node runtime, TS). No Next migration for now; revisit only if OG images or SSR for partner links hurt.
- **Mobile:** Expo (React Native + TS), EAS Build. `expo-share-intent` for the share sheet.
- **Backend:** Supabase. Postgres for data, Auth for magic links (phase 2), RLS from day one.
- **AI:** one provider via one wrapper module (`packages/core/ai.ts`). Fast/cheap tier for parse and
  writer. Keep the vendor swappable: the wrapper is the only file that imports an SDK.
- **Analytics:** GA4 on web (done), same `track()` signature in the app via expo-firebase or PostHog later.

### Repo layout (monorepo, pnpm workspaces)
```
caniaffordthat/
  packages/core/        brain (signals), types, voice doc, pool fallback, ai wrapper. No I/O. 100% tested.
  apps/web/             current Vite site + api/ functions
  apps/mobile/          Expo app (phase 2)
  CLAUDE.md ROADMAP.md
```
Move today's `src/brain.ts` into `packages/core` as step 2. Both apps import `@caniaffordthat/core`.

### Data model (Supabase)
```sql
asks (
  id uuid pk, created_at timestamptz,
  item text, price numeric, currency text, category text,
  income_bucket text, household text, month_state text,
  use text, replaces text, wanted text,
  corner text, can bool, should bool,
  signals jsonb,            -- [{name, axis, score, weight}] as computed
  punch text, writer_model text,
  source text               -- 'web' | 'app' | 'partner'
)
-- phase 2
profiles (user_id pk, income_bucket, household, month_state, persona, created_at)
list (id, user_id fk, ask_id fk, item, price, url, image_url, corner, status, added_at)
events (id, user_id, ask_id, kind, at)   -- kept | bought | dropped | price_drop
```
RLS: `asks` insert-only for anon, select for service role. `profiles`/`list`/`events` owner-only.
No `user_id` on `asks` in phase 1; phase 2 adds a nullable one.

### API (Vercel functions, all POST, JSON)
- `api/ask` — log a verdict. Fire-and-forget from client (`fetch` + `keepalive`).
- `api/parse` — `{ url }` → `{ name, price, currency, category, image, confidence, source }`.
  Order: fetch page → OG/JSON-LD → if blocked or no price, AI with search → if still low confidence, return
  what you have with `confidence < 0.5`. 10 s timeout, cache by URL for 24 h (Vercel KV or Supabase table).
- `api/verdict` — `{ brainOutput, product, answers, persona, history?, seed? }` → writer JSON.
  Validates: punch ≤ 90 chars, no digits not present in input numbers, corner-agreement check (a small
  classifier prompt or keyword rule); on failure regenerate once, then return a pool line with `fallback: true`.
  `seed` makes partner links deterministic (same seed → cached result).
- Later: `api/list/*` behind Supabase auth, `api/receipt` if we move PNG rendering server-side.

### Brain v2 implementation notes
- `packages/core/signals/*.ts`, one file per signal, each `(ctx) => Signal | null`.
- `decide(ctx)` collects signals, sums per axis, applies the 150% hard override, returns
  `{ corner, can, should, numbers, signals, topSignals }`.
- Calibration test: a fixture of 50 answer sets from today's engine must map to the same corners after
  the refactor. Write the fixture first, from the current `brain.ts`.
- Weights live in `weights.json`; changing a weight is a data change, not a code change.

### Writer implementation notes
- Prompt = system (voice doc) + user (JSON context). Ask for JSON output, parse strictly.
- `voice.md` in core: tone rules, 20 examples tagged by corner and persona, 5 anti-examples.
- Cache key = hash(corner, numbers, topSignals, product.name, persona, seed). Re-roll passes a new seed.
- Budget: p95 under 2 s. Show the verdict title and pills immediately from the brain; stream or fade in
  the punch when the writer returns. The user never waits on a blank screen.

### Mobile notes (phase 2)
- Onboarding writes `profiles` locally (MMKV/AsyncStorage) until auth; migrates to Supabase on first login.
- Share intent → `/share?url=` route → `api/parse` → three chips → `decide()` on device → `api/verdict`.
- Brain runs on device; writer and parser are network. Offline = pool fallback + "price from link unavailable".

### Infrastructure (as of 2026-10-07)
- **Supabase project:** `caniaffordthat`, ref `jrsiebjoeddwkhtqhfqp`, URL `https://jrsiebjoeddwkhtqhfqp.supabase.co`.
  Separate from any other project on purpose.
- **Keys:** Supabase's new key format. `sb_publishable_…` is the browser-safe key (what the docs used to
  call "anon"); `sb_secret_…` is the server-only key (formerly "service_role"). supabase-js accepts them
  wherever the old keys went.
- **Vercel env vars (set, Production):** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (= publishable),
  `SUPABASE_SERVICE_ROLE_KEY` (= secret). `VITE_GA_ID` for GA4. Local dev reads the same names from `.env`
  (gitignored); `.env.example` lists them without values.
- **Rule:** nothing prefixed `VITE_` may hold the secret key. `api/*` functions use the secret key via
  `process.env`; the browser never talks to Supabase directly in phase 1.
- **Migrations:** SQL files under `supabase/migrations/`, applied by pasting into the SQL editor for now;
  `supabase db push` once the CLI is set up.

### Dev workflow
- Claude Code does: core refactor, signals + tests, api functions, Supabase schema/migrations, screens,
  voice doc drafts. Give it one numbered item at a time with "per ROADMAP.md §N".
- Segev does: Supabase project + env vars, Vercel env, Apple/Google accounts, device testing of share
  intent, EAS credentials, store review.
- Every PR: `pnpm test` (core) + `pnpm build` (web). No PR touches the brain without updating the calibration fixture.

---

## Monetization rules
- Links only on "buy it" (where to buy right) and "save for it" (cheaper version). Never on
  "you can but why" or "absolutely not".
- The brain does not know affiliate exists. Corner is computed before any offer is looked up.
- Every recommendation quotes the user's own answers as its reason. No sentence, no recommendation.
- Disclosure next to the link: "We earn a bit if you buy through this. We'd say the same if we didn't."
- The metric is return visits, not revenue. Revenue up and returns down means we became a store.

## Privacy rules
- Log what people typed and answered; never IP, user agent beyond device class, or anything linking two asks.
- Income stored as a bucket, never a number.
- Partner mode names live in the URL only; the DB never sees them.
- Footer line: "We keep what you typed, anonymously, so the site gets funnier. We don't keep who you are."

---

## Spec: Signals (brain v2)
```ts
type Signal = { name: string; axis: "can" | "should"; score: number; weight: number; reason: string; source: "user" | "history" | "product" };
type SignalFn = (ctx: Context) => Signal | null;
```
- `can` corner if Σ(score·weight) on `can` ≥ 0; `should` if Σ on `should` ≥ 0. Calibrate initial scores so
  today's thresholds (35% of income, need ≥ 6) reproduce exactly.
- Hard override: price > 150% of monthly income → "no" regardless.
- Reasons = top 3 signals by |score·weight|, as their `reason` strings, handed to the writer.
- Initial signals: share_of_income, month_state, use_frequency, replaces, wanted_since. History and
  product signals arrive in phases 2–3 with their own weights.
- Every signal has a unit test; `brain.ts` has no I/O.

## Spec: Writer
- Input: `{ corner, numbers, topSignals, product, answers, history?, persona }`.
- Output JSON: `{ punch, reasons: [3], personal?, caveat?: { text, changeInput: { field, value } } }`.
- Voice doc: tone rules (dry, about the person not the product, no finance-speak, ≤90 chars punch),
  20 example punchlines across corners and personas, 5 anti-examples.
- Constraints enforced in code: punch length, no numbers invented (only the ones passed in), corner
  never contradicted (if the text says "yes" on a "no" corner, regenerate once, then fall back to pool).
- Model: fast tier. Cache by hash of input for re-roll variety without re-paying identical calls.

## Spec: Partner mode
- "Send this to my partner" → URL with encoded answers (positional chars) + optional first name (≤20).
- Partner lands on PartnerView: neutral header, same verdict (writer seeded by the encoded answers),
  "Fair." or "I disagree, let me answer." → same questions → CompareView, two columns, one generated line
  on the biggest disagreement. No storage, no accounts.

## Spec: Receipt
- Canvas-rendered PNG, portrait, receipt layout: site, date, item, price, share of income, uses/year,
  cost per use, can/should, verdict, punchline, "Thank you for questioning your choices."
- Verdict stamped diagonally in blue. Torn edges. Monospace.
- Mobile: Web Share API with the PNG. Desktop: download + clipboard.
- `src/receipt.ts`, `renderReceipt(answers, verdict, item): Blob`.

## Design rules
- Palette: ink #141A33, paper #F7F2E8, blue #1F3BE0, yellow #F9E547. No red, no traffic-light emojis.
- Archivo Black display, Archivo body. Big type is the design.
- Mobile first on web; the app follows the same system.
- Bad verdicts get a yellow highlighter behind the title.

## Open decisions
- Writer model tier and cost ceiling per verdict.
- Dollars only or locale currency in v1.
- Ask the sender's name in partner mode or not.
