// The Today board: which lane an order is in, why an order waits for a person, the
// one "Call back" list (messages, table requests, calls Brio couldn't finish), and the
// one sentence Brio says at the top. Plain functions, tested in today.test.ts.
//
// Three lanes, read left to right: To check → In the kitchen → Picked up.

import { callerLabel, formatMoney } from "./format";
import { TOPIC_LABEL, topicOf } from "./labels";
import type { PillTone } from "./orders";
import type { CallLog, GuestRequest, Order, OrderState } from "./types";

/**
 * A big order: the restaurant's big-order amount or more ($150 unless the owner set it
 * lower), or more than BIG_ORDER_ITEMS items. Same rule as the server (src/domain/bigOrder.js).
 */
export const BIG_ORDER_CENTS = 15_000;
export const BIG_ORDER_ITEMS = 20;

/** "Sent" until the kitchen (or staff) says it has the order, then "Kitchen has it". */
export function kitchenStep(state: OrderState): "Sent" | "Kitchen has it" | null {
  if (state === "pos_entered") return "Sent";
  if (state === "pos_accepted") return "Kitchen has it";
  return null;
}

/** Why an order in To check is waiting for a person, in plain words. */
export function whyItWaits(
  order: Pick<Order, "allergy_note" | "intake_mode" | "subtotal_cents" | "line_items" | "payment_method">,
  { autoSend = false, bigOrderCents = BIG_ORDER_CENTS }: { autoSend?: boolean; bigOrderCents?: number } = {},
): string {
  if (order.allergy_note) return "allergy note. A person checks these.";
  if (order.intake_mode === "after_hours_request") return "after-hours request. Call the guest to confirm.";
  const items = (Array.isArray(order.line_items) ? order.line_items : []).reduce((n, l) => n + (l.quantity ?? 0), 0);
  if (order.payment_method === "payment_link") return "big order: the guest pays first, by the restaurant's own link.";
  const big = Math.min(bigOrderCents, BIG_ORDER_CENTS); // never looser than $150
  if ((order.subtotal_cents ?? 0) >= big || items > BIG_ORDER_ITEMS) return "big order. A person checks these.";
  // A simple order still waiting while auto-send is on: the kitchen couldn't be reached.
  if (autoSend) return "auto-send couldn't reach the kitchen. Send it yourself.";
  return "every order is checked by a person before the kitchen.";
}

export type CallbackKind = "message" | "reservation" | "unfinished";

export interface CallbackItem {
  id: string;
  kind: CallbackKind;
  tag: string;
  tone: PillTone;
  who: string;
  phone: string | null;
  what: string;
  at: string;
  pending: boolean;
  request?: GuestRequest;
  order?: Order;
}

const TOPIC_TONE: Record<string, PillTone> = {
  complaint: "red",
  order_issue: "amber",
  catering: "purple",
  lost_and_found: "blue",
  delivery: "blue",
};

/**
 * Everyone to call back, in one list: messages, table requests and calls Brio couldn't
 * finish (escalated orders). `pendingOnly` = only what still needs doing. Oldest first,
 * so nobody waits longest.
 */
export function callbackItems(
  requests: GuestRequest[],
  orders: Order[],
  calls: Pick<CallLog, "call_id" | "from_number" | "caller_name">[],
  { pendingOnly, dismissed = new Set(), now, partyText }: { pendingOnly: boolean; dismissed?: Set<string>; now: Date; partyText: (r: GuestRequest) => string },
): CallbackItem[] {
  const items: CallbackItem[] = [];
  for (const r of requests) {
    const pending = r.status === "pending_staff_review";
    if (pendingOnly && !pending) continue;
    if (r.kind === "reservation") {
      items.push({ id: `r:${r.id}`, kind: "reservation", tag: "Table request", tone: "blue", who: r.customer_name, phone: r.customer_phone, what: partyText(r), at: r.created_at, pending, request: r });
    } else {
      const topic = topicOf(r);
      items.push({
        id: `r:${r.id}`,
        kind: "message",
        tag: TOPIC_LABEL[topic],
        tone: TOPIC_TONE[topic] ?? "gray",
        who: r.customer_name,
        phone: r.customer_phone,
        what: r.note ? `“${r.note}”` : "No message left.",
        at: r.created_at,
        pending,
        request: r,
      });
    }
  }
  const TWO_HOURS = 2 * 3600_000;
  for (const o of orders) {
    if (o.state !== "escalated" || dismissed.has(o.id)) continue;
    if (pendingOnly && now.getTime() - new Date(o.created_at).getTime() > TWO_HOURS) continue;
    const call = o.call_id ? calls.find(c => c.call_id === o.call_id) : undefined;
    items.push({
      id: `o:${o.id}`,
      kind: "unfinished",
      tag: "Couldn't finish",
      tone: "red",
      who: callerLabel(o.customer_name ?? call?.caller_name, o.customer_phone ?? call?.from_number),
      phone: o.customer_phone ?? call?.from_number ?? null,
      what: "Brio couldn't finish this call. The guest may be waiting for a call back.",
      at: o.created_at,
      pending: true,
      order: o,
    });
  }
  if (!pendingOnly) return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()); // history: newest first
  // To call: most urgent kind first (a guest who got cut off, a complaint), sales pitches last; oldest first within each.
  return items.sort((a, b) => rank(a) - rank(b) || new Date(a.at).getTime() - new Date(b.at).getTime());
}

const TOPIC_RANK: Record<string, number> = { complaint: 1, order_issue: 2, catering: 4, lost_and_found: 5, delivery: 5, general: 6, job_inquiry: 8, sales: 9 };

function rank(item: CallbackItem): number {
  if (item.kind === "unfinished") return 0;
  if (item.kind === "reservation") return 3;
  return TOPIC_RANK[topicOf(item.request ?? { topic: null })] ?? 6;
}

/**
 * The one sentence Brio says at the top of Today: what to do first. Never invents
 * anything: only counts, names, minutes and allergy notes from the board itself.
 */
export function brioLine({
  check,
  kitchenCount,
  callbacks,
  minutesWaited,
}: {
  check: Order[];
  kitchenCount: number;
  callbacks: CallbackItem[];
  minutesWaited: (o: Order) => number;
}): string {
  if (check.length > 0) {
    const first = check[0];
    const name = first.customer_name ?? "the first guest";
    const waited = Math.max(0, minutesWaited(first));
    const wait = waited < 1 ? "just came in" : `waiting ${waited} min`;
    const allergy = first.allergy_note ? `, allergy: ${first.allergy_note}` : "";
    const lead = check.length === 1 ? "1 order needs you." : `${check.length} orders need you.`;
    return `${lead} Start with ${name} (${wait}${allergy}).`;
  }
  if (callbacks.length > 0) {
    const lead = callbacks.length === 1 ? "Nothing to check. 1 guest to call back" : `Nothing to check. ${callbacks.length} guests to call back`;
    return `${lead}, starting with ${callbacks[0].who.replace(/\.$/, "")}.`; // "Rachel M." must not end in ".."
  }
  if (kitchenCount > 0) return `All checked. ${kitchenCount === 1 ? "1 order is" : `${kitchenCount} orders are`} in the kitchen.`;
  return "All caught up. I'm answering the phone.";
}

/** The order's kitchen ticket, in a few words, or null when it has none. */
export function ticketLine(jobs: { order_id: string; kind: string; status: string; printed_at: string | null; last_error: string | null }[] | undefined, orderId: string, time: (iso: string) => string): { text: string; bad: boolean } | null {
  const mine = (jobs ?? []).filter(j => j.order_id === orderId);
  if (mine.length === 0) return null;
  const latest = mine[0]; // newest first
  if (latest.status === "printed" && latest.printed_at) return { text: `Ticket printed ${time(latest.printed_at)}${latest.kind === "reprint" ? " (reprint)" : ""}`, bad: false };
  if (latest.status === "failed") return { text: `Ticket didn't print${latest.last_error ? `: ${latest.last_error}` : ""}. Print it again from ⋯`, bad: true };
  return { text: "Ticket waiting for the printer", bad: false };
}

/** "2 people · Sat 7:00 PM" for a table request. */
export function partyLine(partySize: number | null, when: string | null): string {
  const people = partySize ? `${partySize} ${partySize === 1 ? "person" : "people"}` : "Party size not given";
  return when ? `${people} · ${when}` : `${people} · no time given`;
}

/** "$9.80 · ASAP" */
export function totalAndPickup(order: Pick<Order, "subtotal_cents" | "currency">, pickup: string): string {
  return `${formatMoney(order.subtotal_cents, order.currency)} · ${pickup}`;
}
