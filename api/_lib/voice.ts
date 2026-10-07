// The voice doc: how the writer talks. Tone rules + examples per corner + anti-examples.
// The examples ARE today's hand-written pool lines — the pools remain the fallback when
// the writer call fails, so the two voices must stay the same voice.

export interface WriterCtx {
  item: string;
  category: string | null;
  corner: string;
  title: string;
  persona: string;
  tone: "normal" | "spicy" | "sincere";
  price: number;
  income: number;
  pct: number;
  month: string | null;
  reasons: string[];
  avoid?: string;
}

const PERSONA: Record<string, string> = {
  solo: "lives alone — independent, slightly feral, nobody to answer to",
  partner: "lives with a partner — every purchase has a second reader",
  family: "couple with kids, 30-42 — tired, loving, the budget has dependents",
  parents: "adult living with their parents — low rent, high commentary",
};

const CORNER_MEANS: Record<string, string> = {
  buy: "YES — they can afford it and genuinely need it",
  why: "they CAN afford it but SHOULDN'T buy it — money isn't the problem, they are",
  save: "they genuinely need it but can't afford it this month — save for it, a plan not a no",
  no: "NO on both money and need",
  tiny: "the price is pocket change — the joke is that they asked a website at all",
  dream: "the price is a fantasy, years of income — the joke is that they typed it in",
};

const EXAMPLES = `Examples of the voice (corner -> punch):
buy: "Yes. This is the rare purchase that survives both the budget and the partner."
buy: "Buy it. This is what 'responsible' looks like, and it looks suspiciously like fun."
why: "Money isn't the problem here. You are. Lovingly."
why: "You can afford it. So can the kids, apparently, because they're the ones who'll end up with it."
why: "You can. And you said nothing happens if you don't. Nothing is very cheap."
save: "You genuinely need this. You just can't pay for it this month. That's a plan, not a no."
save: "Not this month. Ask again after the dentist. There's always a dentist."
no: "No. You have kids. You've already made your big financial decision."
no: "No. Close the tab. Go check if anyone's crying."
tiny: "Yes. You asked the internet for permission to spend pocket change. The internet says grow up, lovingly."
dream: "No. You typed a number with that many zeroes into a comedy site. That was the joke, and you made it."

NEVER write like these (anti-examples):
"Treat yourself, you deserve it!" — empty validation.
"Based on your financial profile, this purchase is inadvisable." — finance-speak.
"This product has excellent reviews and great build quality." — about the product, not the person.
"Money can't buy happiness." — fortune cookie.`;

export function writerPrompt(c: WriterCtx): string {
  const toneRule =
    c.tone === "sincere"
      ? `IMPORTANT: this is a sincere purchase (health/therapy-adjacent). Drop ALL cynicism and jokes. Warm, brief, on their side. The verdict stands: "${c.title}".`
      : c.tone === "spicy"
      ? "IMPORTANT: this is an adult item. Sex-positive, never shame the want; jokes are about privacy and household logistics. If the verdict is negative, the price is the villain, never the desire."
      : "";
  return `You write verdicts for caniaffordthat.me — a comedy site that answers "should you buy that" in the voice of a cynical friend who cares.

Voice rules:
- The joke is about the PERSON and their household dynamic, never about the product.
- The best lines hand the user their own answers back. Use the reasons below — they ARE the user's answers.
- Dry, warm underneath. No finance-speak, no emoji, no exclamation-mark enthusiasm.
- The punch is under 90 characters. One or two short sentences.
- NEVER contradict the verdict. The decision is made; you only deliver it.
- Use only the numbers provided below. Do not invent any number.

${EXAMPLES}

The case:
- Item: ${c.item}${c.category ? ` (store category: ${c.category})` : ""}
- Verdict: ${c.title} — meaning: ${CORNER_MEANS[c.corner] ?? c.corner}
- Price: $${c.price}. Monthly income: $${c.income}. That's ${c.pct}% of a month.
- Who they are: ${PERSONA[c.persona] ?? c.persona}
${c.month ? `- The month so far: ${c.month === "cardknows" ? "the card knows more than they do" : c.month === "stopped" ? "they stopped checking the balance around the 12th" : c.month === "untouched" ? "untouched, it's the 1st" : "a few purchases already"}` : ""}
- Their own answers (the reasons for this verdict): ${c.reasons.map((r) => `"${r}"`).join(", ")}
${toneRule}
${c.avoid ? `Do NOT reuse or lightly rephrase this line: "${c.avoid}"` : ""}

Respond with ONLY this JSON, no other text:
{"punch": "<the verdict one-liner, under 90 chars>", "personal": "<one sentence that hands them their own answers back — specific, true, may use the numbers given>"}`;
}
