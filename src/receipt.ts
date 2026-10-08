// The receipt (ROADMAP §1.8): canvas-rendered PNG, portrait, torn edges, monospace,
// verdict stamped diagonally in blue. This is the share artifact — it replaces the dark card.
// renderReceipt(answers, verdict, item, punch) -> PNG Blob. Pure client, no network.
import { Answers, Verdict, money } from "./brain";

const W = 560;
const PAD = 44;
const SCALE = 2; // retina
const INK = "#141A33";
const PAPER = "#F7F2E8";
const BLUE = "#1F3BE0";
const WHITE = "#FFFDF7";
const MONO = "ui-monospace, 'SF Mono', Menlo, 'Courier New', monospace";
const USES_PER_YEAR = { daily: 365, weekly: 52, weekends: 20, once: 1 } as const;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const t = line ? `${line} ${word}` : word;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// One pass with real=false measures and returns the height; real=true draws.
function paint(ctx: CanvasRenderingContext2D, a: Answers, v: Verdict, item: string, punch: string, real: boolean): number {
  const innerW = W - PAD * 2;
  const centerX = W / 2;
  let y = 0;

  const text = (s: string, font: string, x: number, align: CanvasTextAlign, color = INK) => {
    if (!real) return;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  };
  const dashes = () => {
    y += 26;
    if (real) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(W - PAD, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    y += 10;
  };
  const row = (label: string, value: string) => {
    y += 30;
    if (!real) return;
    ctx.font = `500 19px ${MONO}`;
    const dotW = ctx.measureText(".").width;
    const gap = innerW - ctx.measureText(label).width - ctx.measureText(value).width - 12;
    const dots = ".".repeat(Math.max(0, Math.floor(gap / dotW)));
    text(label, `500 19px ${MONO}`, PAD, "left");
    text(dots, `500 19px ${MONO}`, PAD + ctx.measureText(label).width + 6, "left");
    text(value, `700 19px ${MONO}`, W - PAD, "right");
  };

  // header
  y += 64;
  text("caniaffordthat.me", `700 24px ${MONO}`, centerX, "center");
  y += 28;
  text(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), `500 17px ${MONO}`, centerX, "center", "#4A5072");
  dashes();

  // item (up to 2 lines)
  ctx.font = `700 22px ${MONO}`;
  const itemLines = wrap(ctx, item.toUpperCase(), innerW).slice(0, 2);
  for (const l of itemLines) {
    y += 30;
    text(l, `700 22px ${MONO}`, PAD, "left");
  }
  dashes();

  // the numbers
  const perUse = a.price / USES_PER_YEAR[a.use];
  row("PRICE", money(a.price));
  row("INCOME / MO", money(a.income));
  row("SHARE OF MONTH", `${v.pct}%`);
  row("USES / YEAR", String(USES_PER_YEAR[a.use]));
  row("COST PER USE", perUse < 1 ? "pennies" : money(perUse));
  row("CAN AFFORD", v.can ? "YES" : "NO");
  row("SHOULD BUY", v.should ? "YES" : "NO");
  dashes();

  // punchline
  ctx.font = `500 20px ${MONO}`;
  const punchLines = wrap(ctx, `"${punch}"`, innerW).slice(0, 6);
  const stampTop = y; // stamp overlays the punch area
  for (const l of punchLines) {
    y += 28;
    text(l, `500 20px ${MONO}`, PAD, "left");
  }
  dashes();

  y += 30;
  text("Thank you for questioning", `500 18px ${MONO}`, centerX, "center");
  y += 24;
  text("your choices.", `500 18px ${MONO}`, centerX, "center");

  // barcode, deterministic from the item
  y += 28;
  if (real) {
    ctx.fillStyle = INK;
    let x = PAD + 10;
    for (let i = 0; x < W - PAD - 10; i++) {
      const w = ((item.charCodeAt(i % item.length) || 7) % 4) + 1;
      ctx.fillRect(x, y, w, 40);
      x += w + 3;
    }
  }
  y += 40;

  // the stamp: verdict title diagonally in blue, over the punch area
  if (real) {
    let fs = 46;
    ctx.font = `700 ${fs}px ${MONO}`;
    const stampText = v.title.toUpperCase();
    while (fs > 24 && ctx.measureText(stampText).width > innerW - 36) {
      fs -= 2;
      ctx.font = `700 ${fs}px ${MONO}`;
    }
    const sw = ctx.measureText(stampText).width;
    ctx.save();
    ctx.translate(centerX, stampTop + (y - stampTop) * 0.35);
    ctx.rotate(-0.16);
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 4;
    ctx.strokeRect(-sw / 2 - 18, -fs * 0.82, sw + 36, fs * 1.36);
    ctx.fillStyle = BLUE;
    ctx.textAlign = "center";
    ctx.fillText(stampText, 0, fs * 0.18);
    ctx.restore();
  }

  return y + 46; // bottom margin before the torn edge
}

function tornEdges(ctx: CanvasRenderingContext2D, h: number) {
  // paper background, then the white receipt with zigzag top and bottom
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, h);
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  const tooth = 16;
  ctx.moveTo(0, 18);
  for (let x = 0; x < W; x += tooth) {
    ctx.lineTo(x + tooth / 2, 7);
    ctx.lineTo(x + tooth, 18);
  }
  ctx.lineTo(W, h - 18);
  for (let x = W; x > 0; x -= tooth) {
    ctx.lineTo(x - tooth / 2, h - 7);
    ctx.lineTo(x - tooth, h - 18);
  }
  ctx.closePath();
  ctx.fill();
}

export function renderReceipt(a: Answers, v: Verdict, item: string, punch: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d");
  if (!measure) return Promise.reject(new Error("canvas unavailable"));
  const h = paint(measure, a, v, item, punch, false) + 24;
  canvas.width = W * SCALE;
  canvas.height = h * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  tornEdges(ctx, h);
  ctx.textBaseline = "alphabetic";
  paint(ctx, a, v, item, punch, true);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}
