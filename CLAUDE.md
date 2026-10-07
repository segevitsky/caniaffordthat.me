# caniaffordthat.me

A comedy site that answers a better question than the one you typed.
People come for "can I afford that", and get "should you buy that", told the truth but funny.
Pure frontend, no backend, no login, no AI (for now). Shareable verdict is the growth loop.

## Product in one paragraph
Type what you want to buy. Answer 7 quick questions (price, monthly income, who lives with you,
how often you'll use it, what it replaces, how long you've wanted it, what happens if you don't).
Get one of four verdicts, a one-line punch in the voice of a cynical friend who cares, and an
"honest line" that hands your own answers back to you with real numbers. Re-roll the punch.
If the answer is no, an "afford it anyway" plan mode shows absurd strategies next to the one boring
real one.

## The brain (src/brain.ts)
Two axes, four corners:
- CAN = price / monthly income <= 0.35. Over 1.5 is an automatic "no".
- SHOULD = need score 0-12 from the four usage questions, threshold 6.
- buy (can+should), why (can, shouldn't) <- signature corner, save (can't, should), no (neither).
- Two override tiers for people testing the site: `tiny` (price <= $20 or <= 0.5% of income —
  the joke is that you asked a website about pocket change) and `dream` (over 24 months of
  income — the joke is that you typed a fantasy into a comedy quiz). Per-use math is skipped
  (tiny) or reworded (dream) so the honest line stays true at the extremes.

- Life events ("a dog", "a second kid", "a wedding", "a divorce" — whole-item match, so "a dog
  bed" stays a normal purchase): dedicated yes/no punch pools, and the honest line swaps to
  recurring-cost truth (a dog is ~$150/mo for 12 years; a kid is ~$300k to 18; a divorce is a
  percentage, not a price). These close the loop on the site's own intro placeholders.
- Sincere tier (therapy, dentist, meds, surgery...): the cynical voice must NOT fire. Need is
  real by definition, so SHOULD is forced true and the verdict is only buy ("Yes. Go.") or
  save ("Find a way."), warm both ways. Honest line drops the jokes.
- Intercepts (checked at the intro, never reach the questions): un-buyables (love, a
  girlfriend, sleep, happiness, my ex) get "Not for sale." with a re-rollable punch; illegal
  items get "Nope." and a deflection — never run affordability math on a felony.
- Category hint: a pasted link's parsed store category routes tiers the item-name regex
  can't catch ("a Satisfyer Pro 2" → category "Sex Toys" → spicy). Deliberately conservative:
  only unambiguous categories route (sex/adult → spicy, strictly-medical → sincere). "Pet
  Supplies" never triggers the pet life-event (a dog bed is a purchase, not a dog) and generic
  "Health & Personal Care" never triggers sincere. Category is also logged to asks.
- Spicy overlay: adult items (vibrator etc., regex on the typed item) swap in dedicated pools
  for every corner — the regular pools produce accidental horror next to a sex toy ("the kids
  will end up with it", "rent it, borrow it"). Rules for spicy lines: sex-positive, never shame
  the want, jokes are about privacy and household logistics; in "no", the price is the villain,
  never the desire.

Voice is chosen by household: solo / partner / family / parents.
`family` (couple with kids, 30-42) is the fully written persona and the first target audience.
Others are placeholder pools for now.

## Content rules (non-negotiable)
- A line that references a specific answer (daily use, "since you saw someone else", broken, etc.)
  MUST carry a `when` condition. A joke that's wrong about the user is a form letter, not a joke.
- Jokes are about the person and their household dynamic, not the product.
- Best lines are the site handing you your own answer back: "Your own words: nothing happens
  if you don't buy it. Read that again."
- Every verdict = punch (funny) + honest line (specific, numeric, true). Keep both.
- 8-12 lines per corner per persona minimum, so re-roll doesn't repeat quickly.

## Design rules
- Palette: ink #141A33, paper #F7F2E8, blue #1F3BE0, yellow #F9E547. No red. No traffic-light emojis.
- Type: Archivo Black for display, Archivo for body. Big type is the design; keep effects minimal.
- One screen per question. Nothing that slows the path to the punch.
- Bad verdicts get a yellow highlighter behind the title, not a red label.
- Mobile first. Most traffic will arrive from a WhatsApp link on a phone. Default styles are for
  ~375px; `sm:` and `md:` scale up. Choice buttons stack full-width on mobile, tap targets >= 44px,
  numeric inputs use inputMode="decimal", respect safe-area insets.

## Roadmap (agreed in chat, not built)
1. Write full pools for solo / partner / parents personas.
2. Share card as an actual image (canvas or OG route) for WhatsApp/Twitter.
3. Optional AI moments only where they add surprise: price guess on the price screen ("around $499?
   correct me"), and a generated personal plan in "afford it anyway" mode. Never on the critical path.
4. v2 only if v1 gets shared: "where do I get it cheapest" behind a button at the end (affiliate).
5. SEO landing copy on the intro screen without cluttering it.

## Dev
npm install && npm run dev
