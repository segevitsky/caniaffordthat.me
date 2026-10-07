import { useState } from "react";
import type { Answers, Household, IfNot, Replaces, Use, Wanted } from "./brain";
import { money } from "./brain";
import { interceptFor } from "./brain";
import { ChoiceQ, Intercept, Intro, Plan, PriceQ, SliderQ, Verdict } from "./screens";

const DEFAULTS: Answers = { price: 0, income: 4000, household: "family", use: "weekly", replaces: "new", wanted: "weeks", ifnot: "sad" };
const Q_COUNT = 7;
const VERDICT = 8;
const PLAN = 9;
const INTERCEPT = 10;

export default function App() {
  const [step, setStep] = useState(0);
  const [item, setItem] = useState("");
  const [linkPrice, setLinkPrice] = useState<number | null>(null);
  const [linkCategory, setLinkCategory] = useState<string | null>(null);
  const [a, setA] = useState<Answers>(DEFAULTS);

  const set = <K extends keyof Answers>(k: K) => (v: Answers[K]) => {
    setA((x) => ({ ...x, [k]: v }));
    setStep((s) => s + 1);
  };
  const reset = () => { setStep(0); setItem(""); setLinkPrice(null); setLinkCategory(null); };
  const back = () => setStep((s) => (s === PLAN ? VERDICT : s === INTERCEPT ? 0 : s - 1));

  const screens = [
    <Intro
      onNext={(v) => { setItem(v); setLinkPrice(null); setLinkCategory(null); setStep(interceptFor(v) ? INTERCEPT : 1); }}
      onParsed={(p, url) => {
        const name = p.name ?? `that thing from ${new URL(url).hostname.replace(/^www\./, "")}`;
        setItem(name);
        setLinkPrice(p.price);
        setLinkCategory(p.category);
        setStep(interceptFor(name) ? INTERCEPT : 1);
      }}
    />,
    <PriceQ item={item} initial={linkPrice} onNext={set("price")} />,
    <SliderQ q="What do you make a month?" aside="After tax. Before regret." min={500} max={30000} step={100} initial={a.income} format={money} onNext={set("income")} />,
    <ChoiceQ<Household> q="Who lives with you?" aside="This decides who you'll have to explain it to."
      options={[{ label: "Just me", value: "solo" }, { label: "A partner", value: "partner" }, { label: "A partner and kids", value: "family" }, { label: "My parents, unfortunately", value: "parents" }]}
      onNext={set("household")} />,
    <ChoiceQ<Use> q="How often will you actually use it?" aside="Actually. Not 'in theory'."
      options={[{ label: "Every day", value: "daily" }, { label: "Every week", value: "weekly" }, { label: "'Weekends'", value: "weekends" }, { label: "Once, for the photo", value: "once" }]}
      onNext={set("use")} />,
    <ChoiceQ<Replaces> q="What does it replace?"
      options={[{ label: "Nothing, it's new", value: "new" }, { label: "Something broken", value: "broken" }, { label: "Something that works fine", value: "fine" }, { label: "A habit that costs me money", value: "habit" }]}
      onNext={set("replaces")} />,
    <ChoiceQ<Wanted> q="How long have you wanted it?"
      options={[{ label: "Since this morning", value: "morning" }, { label: "A few weeks", value: "weeks" }, { label: "Years", value: "years" }, { label: "Since I saw someone else with it", value: "someone" }]}
      onNext={set("wanted")} />,
    <ChoiceQ<IfNot> q="What happens if you don't buy it?"
      options={[{ label: "Nothing", value: "nothing" }, { label: "Mild sadness", value: "sad" }, { label: "I'll keep asking this site", value: "asking" }, { label: "My life is measurably worse", value: "worse" }]}
      onNext={set("ifnot")} />,
    <Verdict item={item} a={a} category={linkCategory} onPlan={() => setStep(PLAN)} onReset={reset} />,
    <Plan item={item} a={a} onReset={reset} />,
    <Intercept item={item} onReset={reset} />,
  ];

  const progress = step >= 1 && step <= Q_COUNT ? step / Q_COUNT : 0;

  return (
    <div className="min-h-screen w-full bg-paper">
      <div className="h-2 w-full bg-ink/10">
        <div className="h-2 transition-all duration-300 bg-blue" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-6 md:py-16 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="h-8 mb-6">
          {step > 0 && (
            <button onClick={back} className="font-body text-base text-ink/55 focus:outline-none focus-visible:ring-4 rounded-full px-2 py-2 -ml-2 min-h-[44px]">← Back</button>
          )}
        </div>
        <div key={step} className="fadein">{screens[step]}</div>
      </div>
    </div>
  );
}
