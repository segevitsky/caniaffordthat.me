import type { ReactNode } from "react";

export function Btn({ children, onClick, dark, disabled }: { children: ReactNode; onClick: () => void; dark?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-body w-full sm:w-auto px-6 py-4 sm:py-3 text-lg font-semibold rounded-full min-h-[52px] transition-transform active:scale-95 focus:outline-none focus-visible:ring-4 disabled:opacity-40 disabled:cursor-not-allowed ${
        dark ? "bg-ink text-paper" : "bg-yellow text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Q({ children }: { children: ReactNode }) {
  return <h2 className="font-display fadein text-3xl sm:text-4xl md:text-6xl leading-[1.02] mb-6 md:mb-8 text-ink max-w-[14ch] tracking-tight">{children}</h2>;
}

export function Aside({ children }: { children: ReactNode }) {
  return <p className="font-body text-base md:text-lg mb-6 text-ink/55">{children}</p>;
}
