// The 3D phone's screen: Brio on a call, drawn in Geist on a canvas that
// becomes a texture. The voice orb and the glow around the screen's edge are
// live shaders drawn over it (see effects.ts); this leaves their place dark.

import { STAGE } from "@/site/content";

export const INK = {
  top: "#0c0f18",
  bottom: "#05060a",
  text: "#f4f5f8",
  text2: "#a4abbb",
  text3: "#7c8497",
  amber: "#ffb547",
  coral: "#ff6a55",
  rose: "#ff4f9a",
  violet: "#8b5cf6",
  sky: "#38bdf8",
  green: "#34d399",
  red: "#ff453a",
};

const FAMILY =
  '"Geist Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = '"Geist Mono Variable", ui-monospace, "SF Mono", Menlo, monospace';

// Lucide paths (24 × 24), the same icons the site uses.
const ICONS = {
  phone: [
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  ],
  check: ["M20 6 9 17l-5-5"],
  micOff: [
    "M2 2l20 20",
    "M18.89 13.23A7.12 7.12 0 0 0 19 12v-2",
    "M5 10v2a7 7 0 0 0 12 5",
    "M15 9.34V5a3 3 0 0 0-5.68-1.33",
    "M9 9v3a3 3 0 0 0 5.12 2.12",
    "M12 19v3",
  ],
  handoff: ["M8 3 4 7l4 4", "M4 7h16", "m16 21 4-4-4-4", "M20 17H4"],
};
type IconKey = keyof typeof ICONS;
const paths = new Map<IconKey, Path2D[]>();
function iconPaths(name: IconKey) {
  let list = paths.get(name);
  if (!list) {
    list = ICONS[name].map(d => new Path2D(d));
    paths.set(name, list);
  }
  return list;
}

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function icon(
  ctx: Ctx,
  name: IconKey,
  cx: number,
  cy: number,
  size: number,
  color: string,
  weight = 2,
  turn = 0
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(turn);
  ctx.translate(-size / 2, -size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const p of iconPaths(name)) ctx.stroke(p);
  ctx.restore();
}

function font(
  ctx: Ctx,
  weight: number,
  size: number,
  family = FAMILY,
  tracking = 0
) {
  ctx.font = `${weight} ${size}px ${family}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${tracking}px`;
}

/** A rounded rectangle with Apple-style continuous corners, like the phone's own. */
function smoothRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const e = Math.min(r * 1.2, w / 2, h / 2);
  const c = e * 0.36;
  ctx.beginPath();
  ctx.moveTo(x + e, y);
  ctx.lineTo(x + w - e, y);
  ctx.bezierCurveTo(x + w - c, y, x + w, y + c, x + w, y + e);
  ctx.lineTo(x + w, y + h - e);
  ctx.bezierCurveTo(x + w, y + h - c, x + w - c, y + h, x + w - e, y + h);
  ctx.lineTo(x + e, y + h);
  ctx.bezierCurveTo(x + c, y + h, x, y + h - c, x, y + h - e);
  ctx.lineTo(x, y + e);
  ctx.bezierCurveTo(x, y + c, x + c, y, x + e, y);
  ctx.closePath();
}

function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function disc(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  fill: string | CanvasGradient
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function spectrum(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, INK.amber);
  g.addColorStop(0.3, INK.coral);
  g.addColorStop(0.55, INK.rose);
  g.addColorStop(0.8, INK.violet);
  g.addColorStop(1, INK.sky);
  return g;
}

/** Splits text into lines no wider than `max`, in the context's current font. */
function wrap(ctx: Ctx, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Loads the fonts the screen is drawn in. */
export async function loadFonts() {
  if (!("fonts" in document)) return;
  const wanted = [
    document.fonts.load(`400 40px ${FAMILY}`),
    document.fonts.load(`600 40px ${FAMILY}`),
    document.fonts.load(`500 40px ${MONO}`),
  ];
  await Promise.race([
    Promise.all(wanted),
    new Promise(resolve => setTimeout(resolve, 1800)),
  ]);
}

// ── Layout ───────────────────────────────────────────────────────────────

// The iPhone 18 Pro Max display is 2868 × 1320 pixels: drawn here at 640 wide.
export const SCREEN_W = 640;
export const SCREEN_H = 1391;
/** The voice orb: center and radius, in screen pixels. The orb shader sits here. */
export const ORB = { x: 320, y: 352, r: 132 };
/** Corner radius of the display, in screen pixels. */
export const SCREEN_CORNER = 87;

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

/** Status bar, drawn around the Dynamic Island: the time, then signal, Wi-Fi and battery. */
function statusBar(ctx: Ctx) {
  ctx.fillStyle = INK.text;
  ctx.textAlign = "center";
  font(ctx, 600, 27);
  ctx.fillText(STAGE.clock, 118, 54);
  for (let i = 0; i < 4; i++) {
    const h = 8 + i * 4.2;
    roundRect(ctx, 462 + i * 8.5, 52 - h, 6, h, 1.6);
    ctx.fill();
  }
  ctx.save();
  ctx.strokeStyle = INK.text;
  ctx.lineCap = "round";
  ctx.lineWidth = 3.6;
  for (const r of [7, 13, 19]) {
    ctx.beginPath();
    ctx.arc(522, 53, r, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
  }
  ctx.restore();
  disc(ctx, 522, 51, 2.6, INK.text);
  ctx.save();
  ctx.strokeStyle = "rgba(244,245,248,.45)";
  ctx.lineWidth = 2.4;
  roundRect(ctx, 546, 33, 44, 22, 6.5);
  ctx.stroke();
  ctx.restore();
  roundRect(ctx, 549.5, 36.5, 31, 15, 3.5);
  ctx.fillStyle = INK.text;
  ctx.fill();
  roundRect(ctx, 592.5, 40, 3.5, 8, 1.5);
  ctx.fillStyle = "rgba(244,245,248,.45)";
  ctx.fill();
  ctx.textAlign = "left";
}

/** The Dynamic Island. On a call it widens into a live activity: Brio's dot and a waveform. */
function island(ctx: Ctx, onCall: boolean, t: number) {
  const W = SCREEN_W;
  const width = onCall ? 236 : 118;
  roundRect(ctx, W / 2 - width / 2, 16, width, 54, 27);
  ctx.fillStyle = "#000";
  ctx.fill();
  // Front camera.
  disc(ctx, W / 2 + 32, 43, 11, "#0a0d14");
  disc(ctx, W / 2 + 32, 43, 5, "#161d2b");
  if (!onCall) return;
  disc(ctx, W / 2 - 92, 43, 11, spectrum(ctx, W / 2 - 103, 32, W / 2 - 81, 54));
  for (let i = 0; i < 5; i++) {
    const h = 8 + 16 * Math.abs(Math.sin(t * 5.1 + i * 1.3));
    roundRect(ctx, W / 2 + 62 + i * 9, 43 - h / 2, 5, h, 2.5);
    ctx.fillStyle = [INK.amber, INK.coral, INK.rose, INK.violet, INK.sky][i];
    ctx.fill();
  }
}

/** The CoHost AI mark, as an app icon. */
function appIcon(ctx: Ctx, x: number, y: number, s: number) {
  smoothRect(ctx, x, y, s, s, s * 0.24);
  ctx.fillStyle = "#0e1119";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
  const k = s / 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.strokeStyle = INK.text;
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.stroke(new Path2D("M21.9 10.3A8.2 8.2 0 1 0 21.9 21.7"));
  disc(ctx, 24.4, 16, 3.1, spectrum(ctx, 21, 13, 28, 19));
  ctx.restore();
}

export interface ScreenState {
  /** -1 ringing, then 0–3 as in the cards around the phone. */
  step: number;
  /** Seconds on the call. */
  seconds: number;
  /** 0–1: how far the newest thing on screen has come in. */
  enter: number;
  /** Seconds since the scene started, for the island's waveform. */
  time: number;
}

/** Draws Brio's call screen. */
export function drawScreen(
  canvas: HTMLCanvasElement,
  { step, seconds, enter, time }: ScreenState
) {
  const ctx = canvas.getContext("2d") as Ctx;
  const W = SCREEN_W;
  const H = SCREEN_H;
  const ringing = step < 0;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  smoothRect(ctx, 0, 0, W, H, SCREEN_CORNER);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, INK.top);
  bg.addColorStop(1, INK.bottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Brio's light, behind the orb.
  const glow = ctx.createRadialGradient(ORB.x, ORB.y, 0, ORB.x, ORB.y, 470);
  glow.addColorStop(0, "rgba(139,92,246,.26)");
  glow.addColorStop(0.45, "rgba(255,79,154,.08)");
  glow.addColorStop(1, "rgba(255,79,154,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  island(ctx, !ringing, time);
  statusBar(ctx);
  ctx.textBaseline = "alphabetic";

  // Who, and how long.
  ctx.textAlign = "center";
  font(ctx, 600, 46, FAMILY, -1);
  ctx.fillStyle = INK.text;
  ctx.fillText(ringing ? STAGE.events[0].title : "Brio", W / 2, 566);
  font(ctx, 500, 24, MONO);
  ctx.fillStyle = INK.text2;
  ctx.fillText(
    ringing ? STAGE.caller : `${STAGE.caller} • ${clock(seconds)}`,
    W / 2,
    610
  );

  // The conversation, one bubble per line said so far.
  font(ctx, 400, 26);
  let y = 656;
  const lines = STAGE.transcript.filter(line => line.step <= step);
  lines.forEach((line, i) => {
    const newest = i === lines.length - 1 && line.step === step;
    const k = newest ? ease(enter) : 1;
    const rows = wrap(ctx, line.text, 420);
    const bw = Math.max(...rows.map(row => ctx.measureText(row).width)) + 48;
    const bh = rows.length * 34 + 30;
    const x = line.brio ? W - 40 - bw : 40;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.translate(0, (1 - k) * 22);
    roundRect(ctx, x, y, bw, bh, 26);
    if (line.brio) {
      const fill = ctx.createLinearGradient(x, y, x + bw, y + bh);
      fill.addColorStop(0, "rgba(139,92,246,.42)");
      fill.addColorStop(1, "rgba(255,79,154,.26)");
      ctx.fillStyle = fill;
    } else ctx.fillStyle = "rgba(255,255,255,.09)";
    ctx.fill();
    ctx.fillStyle = INK.text;
    ctx.textAlign = "left";
    rows.forEach((row, r) => ctx.fillText(row, x + 24, y + 43 + r * 34));
    ctx.restore();
    y += bh + 16;
  });

  // Sent to the manager.
  if (step >= 2) {
    const k = step === 2 ? ease(enter * 1.4 - 0.4) : 1;
    font(ctx, 600, 23);
    const label = STAGE.sent;
    const cw = ctx.measureText(label).width + 76;
    const cx = W / 2 - cw / 2;
    ctx.save();
    ctx.globalAlpha = k;
    roundRect(ctx, cx, y + 6, cw, 50, 25);
    ctx.fillStyle = "rgba(52,211,153,.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(52,211,153,.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    disc(ctx, cx + 30, y + 31, 12, INK.green);
    icon(ctx, "check", cx + 30, y + 31, 15, "#05060a", 3.4);
    ctx.fillStyle = INK.green;
    ctx.textAlign = "left";
    ctx.fillText(label, cx + 52, y + 39);
    ctx.restore();
  }

  // Call controls.
  const by = 1252;
  if (ringing) {
    disc(ctx, 200, by, 50, INK.red);
    icon(ctx, "phone", 200, by, 44, "#fff", 2.2, (Math.PI * 3) / 4);
    const pulse = 0.5 + 0.5 * Math.sin(time * 9);
    disc(ctx, 440, by, 50 + pulse * 8, "rgba(52,211,153,.25)");
    disc(ctx, 440, by, 50, INK.green);
    icon(ctx, "phone", 440, by, 44, "#fff", 2.2);
  } else {
    disc(ctx, 170, by, 46, "rgba(255,255,255,.12)");
    icon(ctx, "micOff", 170, by, 40, INK.text, 2);
    disc(ctx, 320, by, 46, "rgba(255,255,255,.12)");
    icon(ctx, "handoff", 320, by, 40, INK.text, 2);
    disc(ctx, 470, by, 46, INK.red);
    icon(ctx, "phone", 470, by, 40, "#fff", 2.2, (Math.PI * 3) / 4);
  }

  // The robocall, dropped: a notification slides down over the call.
  if (step >= 3) {
    const k = ease(enter);
    const top = 84 - (1 - k) * 150;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.5);
    smoothRect(ctx, 22, top, W - 44, 122, 38);
    ctx.fillStyle = "rgba(34,38,52,.96)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.1)";
    ctx.lineWidth = 2;
    ctx.stroke();
    appIcon(ctx, 44, top + 29, 64);
    ctx.textAlign = "left";
    font(ctx, 600, 26);
    ctx.fillStyle = INK.text;
    ctx.fillText(STAGE.events[3].title, 128, top + 54);
    font(ctx, 400, 23);
    ctx.fillStyle = INK.text2;
    ctx.fillText(`${STAGE.events[3].main} • 2s`, 128, top + 90);
    ctx.textAlign = "right";
    font(ctx, 400, 21);
    ctx.fillStyle = INK.text3;
    ctx.fillText("now", W - 50, top + 52);
    ctx.restore();
  }

  // The home indicator.
  roundRect(ctx, W / 2 - 97, H - 22, 194, 7, 3.5);
  ctx.fillStyle = "rgba(244,245,248,.72)";
  ctx.fill();
  ctx.restore();
}
