// 2D drawings for the 3D phone: its screen in each story state, the paper
// order ticket and the approval stamp. Drawn in Mona Sans on canvases that
// become textures.

export const INK = {
  midnight: "#07151C",
  dusk: "#0D212B",
  tide: "#1B3440",
  cream: "#F6F1E7",
  mist: "#9CB0B8",
  slate: "#4A5E66",
  lantern: "#FFB23F",
  ember: "#FF7A3D",
  jade: "#3FD69A",
};

const FAMILY = '"Mona Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// Lucide paths (24 × 24), the same icons the site uses.
const ICONS = {
  phone: [
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  ],
  check: ["M20 6 9 17l-5-5"],
  clipboard: [
    "M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
    "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
    "m9 14 2 2 4-4",
  ],
  hand: [
    "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",
    "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",
    "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",
    "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
  ],
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

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string; fontStretch?: string };

function icon(ctx: Ctx, name: IconKey, cx: number, cy: number, size: number, color: string, weight = 2) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const p of iconPaths(name)) ctx.stroke(p);
  ctx.restore();
}

function font(ctx: Ctx, weight: number, size: number, stretch: "normal" | "semi-expanded" | "expanded" = "normal", tracking = 0) {
  ctx.font = `${weight} ${size}px ${FAMILY}`;
  if ("fontStretch" in ctx) ctx.fontStretch = stretch;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${tracking}px`;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function disc(ctx: Ctx, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function ring(ctx: Ctx, x: number, y: number, r: number, color: string, width: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function checkDisc(ctx: Ctx, x: number, y: number, r: number, scale = 1) {
  if (scale <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  disc(ctx, 0, 0, r, INK.jade);
  icon(ctx, "check", 0, 0, r * 1.2, INK.midnight, 3);
  ctx.restore();
}

/** Loads the brand font before anything is drawn with it. */
export async function loadFonts() {
  if (!("fonts" in document)) return;
  const wanted = [400, 600, 700].map(w => document.fonts.load(`${w} 40px "Mona Sans"`));
  await Promise.race([Promise.all(wanted), new Promise(resolve => setTimeout(resolve, 1800))]);
}

// ── The screen ───────────────────────────────────────────────────────────

export const SCREEN_W = 640;
export const SCREEN_H = 1366;

export type ScreenKind = "idle" | "ringing" | "answered" | "menu" | "order" | "team";

/** Draws the phone screen for a story state; k is progress within that state (0–1). */
export function drawScreen(canvas: HTMLCanvasElement, kind: ScreenKind, k = 0) {
  const ctx = canvas.getContext("2d") as Ctx;
  const W = SCREEN_W;
  const H = SCREEN_H;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  roundRect(ctx, 0, 0, W, H, 88);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0B1E27");
  bg.addColorStop(1, INK.midnight);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glowY = kind === "menu" || kind === "order" || kind === "team" ? 260 : 560;
  const glowStrength = kind === "ringing" ? 0.66 : kind === "idle" ? 0.6 : 0.32;
  const glow = ctx.createRadialGradient(W / 2, glowY, 0, W / 2, glowY, 560);
  glow.addColorStop(0, `rgba(255,178,63,${glowStrength})`);
  glow.addColorStop(0.45, `rgba(255,122,61,${glowStrength * 0.28})`);
  glow.addColorStop(1, "rgba(255,122,61,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // The island.
  roundRect(ctx, W / 2 - 80, 34, 160, 46, 23);
  ctx.fillStyle = "#02080B";
  ctx.fill();

  ctx.textBaseline = "alphabetic";
  if (kind === "idle") {
    ctx.save();
    ctx.shadowColor = INK.lantern;
    ctx.shadowBlur = 44;
    ring(ctx, W / 2, 560, 88, INK.lantern, 20);
    ctx.restore();
    ring(ctx, W / 2, 560, 88, INK.lantern, 20);
    font(ctx, 700, 58, "expanded", 1);
    ctx.fillStyle = INK.cream;
    ctx.textAlign = "center";
    ctx.fillText("Kadmivo", W / 2, 790);
  } else if (kind === "ringing") {
    [300, 220, 150].forEach((r, i) => ring(ctx, W / 2, 560, r, `rgba(255,178,63,${0.14 + i * 0.16})`, 5));
    ctx.save();
    ctx.shadowColor = INK.lantern;
    ctx.shadowBlur = 60;
    disc(ctx, W / 2, 560, 108, INK.lantern);
    ctx.restore();
    icon(ctx, "phone", W / 2, 560, 96, INK.midnight, 2.2);
  } else if (kind === "answered") {
    ctx.save();
    ctx.shadowColor = INK.jade;
    ctx.shadowBlur = 40;
    disc(ctx, W / 2, 400, 78, INK.jade);
    ctx.restore();
    icon(ctx, "phone", W / 2, 400, 70, INK.midnight, 2.4);
    // The voice waveform is drawn by bars in the 3D scene, over this line.
    ctx.fillStyle = "rgba(156,176,184,.18)";
    ctx.fillRect(96, 745, W - 192, 3);
  } else if (kind === "menu") {
    disc(ctx, W / 2, 250, 62, "rgba(255,178,63,.16)");
    icon(ctx, "clipboard", W / 2, 250, 64, INK.lantern, 2.2);
    const rows: [string, string][] = [
      ["1 × Rigatoni", "extra sauce · no cheese"],
      ["1 × Garlic knots", "sauce on the side"],
    ];
    rows.forEach(([name, note], i) => {
      const y = 400 + i * 230;
      roundRect(ctx, 44, y, W - 88, 196, 40);
      ctx.fillStyle = INK.dusk;
      ctx.fill();
      ctx.strokeStyle = INK.tide;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.textAlign = "left";
      font(ctx, 700, 44);
      ctx.fillStyle = INK.cream;
      ctx.fillText(name, 84, y + 86);
      font(ctx, 400, 32);
      ctx.fillStyle = INK.mist;
      ctx.fillText(note, 84, y + 138);
      const at = i === 0 ? 0.3 : 0.6;
      const pop = Math.min(1, Math.max(0, (k - at) / 0.12));
      checkDisc(ctx, W - 116, y + 98, 38, pop < 1 ? pop * 1.12 : 1);
    });
    if (k > 0.82) {
      ctx.globalAlpha = Math.min(1, (k - 0.82) / 0.1);
      icon(ctx, "clipboard", 196, 922, 44, INK.jade, 2.4);
      font(ctx, 600, 38);
      ctx.fillStyle = INK.jade;
      ctx.textAlign = "left";
      ctx.fillText("Menu checked", 236, 936);
      ctx.globalAlpha = 1;
    }
  } else if (kind === "order") {
    ctx.textAlign = "left";
    font(ctx, 600, 26, "semi-expanded", 4);
    ctx.fillStyle = INK.mist;
    ctx.fillText("ASSISTED ORDER · SAMPLE", 60, 190);
    font(ctx, 700, 52, "semi-expanded");
    ctx.fillStyle = INK.cream;
    ctx.fillText("Order draft K-021", 60, 270);
    font(ctx, 400, 30);
    ctx.fillStyle = INK.mist;
    ctx.fillText("Pickup for Maya · Today · 8:20 PM", 60, 326);
    // Pending chip.
    roundRect(ctx, 60, 370, 322, 70, 35);
    ctx.fillStyle = "rgba(255,178,63,.16)";
    ctx.fill();
    disc(ctx, 100, 405, 11, INK.lantern);
    font(ctx, 600, 32);
    ctx.fillStyle = INK.lantern;
    ctx.fillText("Pending review", 126, 416);
    // The items, as they print.
    ctx.fillStyle = INK.tide;
    ctx.fillRect(60, 500, W - 120, 3);
    const items: [string, string][] = [
      ["1 × Rigatoni", "$19.00"],
      ["1 × Garlic knots", "$8.50"],
    ];
    items.forEach(([name, price], i) => {
      const y = 590 + i * 96;
      font(ctx, 600, 38);
      ctx.fillStyle = INK.cream;
      ctx.textAlign = "left";
      ctx.fillText(name, 60, y);
      ctx.textAlign = "right";
      ctx.fillText(price, W - 60, y);
    });
    ctx.fillStyle = INK.tide;
    ctx.fillRect(60, 760, W - 120, 3);
    // Printing: an arrow up the screen.
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(k * Math.PI * 6) ** 2;
    ctx.save();
    ctx.translate(W / 2, 980);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = INK.lantern;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-46, 0);
    ctx.lineTo(46, 0);
    ctx.moveTo(10, -36);
    ctx.lineTo(46, 0);
    ctx.lineTo(10, 36);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  } else {
    // Team review, then on to the POS.
    ctx.textAlign = "left";
    font(ctx, 700, 50, "semi-expanded");
    ctx.fillStyle = INK.cream;
    ctx.fillText("Order draft K-021", 60, 250);
    const teamDone = k > 0.55;
    const posDone = k > 0.86;
    const rows: [string, "done" | "current" | "pending"][] = [
      ["Customer confirmed", "done"],
      ["Menu checked", "done"],
      ["Your team checks the order", teamDone ? "done" : "current"],
      ["Reaches POS", posDone ? "done" : teamDone ? "current" : "pending"],
    ];
    rows.forEach(([label, state], i) => {
      const y = 400 + i * 150;
      if (i > 0) {
        ctx.fillStyle = INK.tide;
        ctx.fillRect(60, y - 75, W - 120, 3);
      }
      if (state === "done") checkDisc(ctx, 96, y - 12, 30);
      else if (state === "current") {
        disc(ctx, 96, y - 12, 30, "rgba(255,178,63,.2)");
        disc(ctx, 96, y - 12, 14, INK.lantern);
      } else ring(ctx, 96, y - 12, 26, INK.mist, 4);
      font(ctx, state === "current" ? 700 : 600, 34);
      ctx.fillStyle = state === "current" ? INK.lantern : state === "done" ? INK.cream : INK.mist;
      ctx.fillText(label, 150, y);
    });
    icon(ctx, "hand", W / 2, 1080, 92, teamDone ? INK.jade : INK.lantern, 2);
  }
  ctx.restore();
}

/** A white rounded-rectangle mask of the screen, for the glass layer. */
export function drawScreenMask(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d") as Ctx;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  roundRect(ctx, 0, 0, canvas.width, canvas.height, canvas.width * 0.1375);
  ctx.fillStyle = "#fff";
  ctx.fill();
}

// ── The paper ticket ─────────────────────────────────────────────────────

export const TICKET_W = 600;
export const TICKET_H = 800;

/** The printed order ticket, with a torn zigzag bottom edge. */
export function drawTicket(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d") as Ctx;
  const W = TICKET_W;
  const H = TICKET_H;
  const tooth = 24;
  ctx.clearRect(0, 0, W, H);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, H - tooth);
  for (let x = W; x > 0; x -= tooth * 2) {
    ctx.lineTo(x - tooth, H);
    ctx.lineTo(x - tooth * 2, H - tooth);
  }
  ctx.closePath();
  const paper = ctx.createLinearGradient(0, 0, 0, H);
  paper.addColorStop(0, "#F9F5EC");
  paper.addColorStop(1, "#EFE8DA");
  ctx.fillStyle = paper;
  ctx.fill();

  const dashed = (y: number) => {
    ctx.save();
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = "rgba(7,21,28,.3)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(W - 40, y);
    ctx.stroke();
    ctx.restore();
  };

  ctx.textAlign = "left";
  font(ctx, 700, 24, "semi-expanded", 4);
  ctx.fillStyle = INK.slate;
  ctx.fillText("ORDER DRAFT K-021", 40, 72);
  ctx.textAlign = "right";
  font(ctx, 500, 26);
  ctx.fillText("7:42 PM", W - 40, 72);
  ctx.textAlign = "left";
  font(ctx, 400, 28);
  ctx.fillText("Pickup for Maya · Today · 8:20 PM", 40, 128);
  dashed(168);

  const items: [string, string, string][] = [
    ["1 × Rigatoni", "$19.00", "extra sauce · no cheese"],
    ["1 × Garlic knots", "$8.50", "sauce on the side"],
  ];
  items.forEach(([name, price, note], i) => {
    const y = 236 + i * 124;
    font(ctx, 700, 38);
    ctx.fillStyle = INK.midnight;
    ctx.textAlign = "left";
    ctx.fillText(name, 40, y);
    ctx.textAlign = "right";
    ctx.fillText(price, W - 40, y);
    ctx.textAlign = "left";
    font(ctx, 400, 26);
    ctx.fillStyle = INK.slate;
    ctx.fillText(note, 40, y + 44);
  });
  dashed(444);
  font(ctx, 700, 34);
  ctx.fillStyle = INK.midnight;
  ctx.textAlign = "left";
  ctx.fillText("Total", 40, 510);
  ctx.textAlign = "right";
  ctx.fillText("$27.50", W - 40, 510);
  ctx.textAlign = "left";
  font(ctx, 600, 26);
  ctx.fillStyle = INK.slate;
  ctx.fillText("Customer confirmed · Menu checked", 40, 578);
  font(ctx, 700, 22, "semi-expanded", 4);
  ctx.fillText("NOT A LIVE ORDER", 40, 690);
}

/** The team's approval stamp: a jade disc with a check. */
export function drawStamp(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d") as Ctx;
  const s = canvas.width;
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.shadowColor = "rgba(63,214,154,.7)";
  ctx.shadowBlur = s * 0.08;
  disc(ctx, s / 2, s / 2, s * 0.4, INK.jade);
  ctx.restore();
  icon(ctx, "check", s / 2, s / 2, s * 0.5, INK.midnight, 3.2);
}
