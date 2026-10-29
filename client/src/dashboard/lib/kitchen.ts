// The Kitchen screen (a tablet in the kitchen, for restaurants without a POS): which
// orders it shows, in which column, and how late they are. Plain functions, tested.
//
//   New             sent to the kitchen, nobody has tapped "Got it" yet (pos_entered)
//   Kitchen has it  the cook tapped "Got it" (pos_accepted); "Done" hides it on this tablet
//   Cancelled       cancelled or rejected AFTER it reached the kitchen: shown in red,
//                   "DO NOT MAKE", until the cook taps OK. Never silently disappears.

import type { LineItem, Order, PosJob } from "./types";

/** A tablet that hasn't checked in for this long counts as off (same as the server). */
export const SCREEN_FRESH_MS = 5 * 60 * 1000;
/** The counter is reminded when the kitchen hasn't tapped "Got it" after this long. */
export const GOT_IT_REMINDER_MS = 2 * 60 * 1000;
/** A ticket the kitchen has had this long shows in amber. */
export const LATE_MS = 10 * 60 * 1000;
const CANCELLED_SHOWN_MS = 30 * 60 * 1000;
const KEPT_MS = 12 * 60 * 60 * 1000;

export interface KitchenTicket {
  order: Order;
  kind: "new" | "cooking" | "cancelled";
  /** When it reached the kitchen (the POS job's send time, else the order's last change). */
  since: string;
  minutes: number;
  late: boolean;
}

export interface KitchenBoard {
  fresh: KitchenTicket[];
  cooking: KitchenTicket[];
  cancelled: KitchenTicket[];
}

/** Sorts orders onto the board. `hidden` = ids this tablet marked Done or dismissed. */
export function kitchenBoard(orders: Order[], jobs: PosJob[], now: Date, hidden: Set<string>): KitchenBoard {
  const jobFor = new Map(jobs.map(j => [j.order_id, j]));
  const board: KitchenBoard = { fresh: [], cooking: [], cancelled: [] };
  for (const order of orders) {
    if (hidden.has(order.id)) continue;
    const job = jobFor.get(order.id);
    const since = job?.sent_at ?? order.updated_at;
    const age = now.getTime() - new Date(since).getTime();
    const ticket = (kind: KitchenTicket["kind"]): KitchenTicket => ({
      order,
      kind,
      since,
      minutes: Math.max(0, Math.floor(age / 60000)),
      late: kind === "cooking" && age >= LATE_MS,
    });
    if (order.state === "pos_entered" && age <= KEPT_MS) board.fresh.push(ticket("new"));
    else if (order.state === "pos_accepted" && age <= KEPT_MS) board.cooking.push(ticket("cooking"));
    else if ((order.state === "cancelled" || order.state === "rejected") && job?.sent_at) {
      const cancelledAgo = now.getTime() - new Date(order.updated_at).getTime();
      if (cancelledAgo <= CANCELLED_SHOWN_MS) board.cancelled.push(ticket("cancelled"));
    }
  }
  const oldestFirst = (a: KitchenTicket, b: KitchenTicket) => new Date(a.since).getTime() - new Date(b.since).getTime();
  board.fresh.sort(oldestFirst);
  board.cooking.sort(oldestFirst);
  board.cancelled.sort(oldestFirst);
  return board;
}

/** "1 min", "just now". */
export function ageLabel(minutes: number): string {
  return minutes < 1 ? "just now" : `${minutes} min`;
}

/** One line as the cook reads it: quantity, name, then the choices. */
export function kitchenLine(item: LineItem): { quantity: number; name: string; choices: string } {
  return {
    quantity: item.quantity,
    name: item.name,
    choices: (item.modifiers ?? []).map(m => m.option_name).join(", "),
  };
}

/** Is any kitchen tablet on? */
export function screenOnline(screens: { last_seen_at: string }[] | undefined, now: Date): boolean {
  return (screens ?? []).some(s => now.getTime() - new Date(s.last_seen_at).getTime() <= SCREEN_FRESH_MS);
}

/** For the counter: "Kitchen hasn't tapped Got it · 3 min", or null when all is fine. */
export function gotItReminder(state: Order["state"], job: PosJob | undefined, now: Date): string | null {
  if (state !== "pos_entered" || job?.status !== "sent" || !job.sent_at) return null;
  const waited = now.getTime() - new Date(job.sent_at).getTime();
  if (waited < GOT_IT_REMINDER_MS) return null;
  return `Kitchen hasn't tapped Got it · ${Math.floor(waited / 60000)} min`;
}

/** This tablet's own id, kept in its browser, so the dashboard can tell tablets apart. */
export function newScreenId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return `screen-${Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")}`;
}
