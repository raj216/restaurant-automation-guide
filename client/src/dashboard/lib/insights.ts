// Real counts for the Insights screen. Nothing here is estimated.

import { isTestCall, callTime } from "./labels";
import { countsTowardValue } from "./orders";
import { addDays, startOfDay, zonedParts } from "./time";
import type { CallCategory, CallLog, GuestRequest, Order } from "./types";

export type RangeId = "today" | "yesterday" | "7d" | "30d";

export const RANGES: { id: RangeId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

/** [start, end) of a range, in the restaurant's timezone. */
export function rangeBounds(range: RangeId, now: Date, timeZone: string): { start: Date; end: Date } {
  const today = startOfDay(now, timeZone);
  const tomorrow = addDays(now, 1, timeZone);
  switch (range) {
    case "yesterday":
      return { start: addDays(now, -1, timeZone), end: today };
    case "7d":
      return { start: addDays(now, -6, timeZone), end: tomorrow };
    case "30d":
      return { start: addDays(now, -29, timeZone), end: tomorrow };
    default:
      return { start: today, end: tomorrow };
  }
}

function within(value: string, start: Date, end: Date): boolean {
  const t = new Date(value).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export interface Insights {
  callsAnswered: number;
  ordersSent: number;
  /** Sum of subtotals of orders that reached the restaurant and weren't rejected or cancelled. */
  orderValueCents: number;
  reservationRequests: number;
  messages: number;
  spamBlocked: number;
  averageCallSeconds: number | null;
  callsByHour: number[]; // 24 slots
  callsByCategory: { category: CallCategory; count: number }[];
  ordersByDay: { key: string; count: number }[];
}

export function computeInsights(
  input: { orders: Order[]; requests: GuestRequest[]; calls: CallLog[] },
  range: RangeId,
  now: Date,
  timeZone: string,
): Insights {
  const { start, end } = rangeBounds(range, now, timeZone);

  // Test calls from the website are left out of every number.
  const calls = input.calls.filter(c => !isTestCall(c) && within(callTime(c), start, end));
  // Orders here are the ones that reached the restaurant, plus escalated ones, which carry no value.
  const reached = input.orders.filter(o => o.state !== "escalated" && within(o.created_at, start, end));
  const requests = input.requests.filter(r => within(r.created_at, start, end));

  const callsByHour = new Array<number>(24).fill(0);
  const byCategory = new Map<CallCategory, number>();
  let totalSeconds = 0;
  let counted = 0;
  for (const c of calls) {
    callsByHour[zonedParts(new Date(callTime(c)), timeZone).hour] += 1;
    byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
    if (c.duration_seconds != null) {
      totalSeconds += c.duration_seconds;
      counted += 1;
    }
  }

  const days = new Map<string, number>();
  for (const o of reached) {
    const p = zonedParts(new Date(o.created_at), timeZone);
    const key = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
    days.set(key, (days.get(key) ?? 0) + 1);
  }

  return {
    callsAnswered: calls.length,
    ordersSent: reached.length,
    orderValueCents: reached.filter(countsTowardValue).reduce((sum, o) => sum + (o.subtotal_cents ?? 0), 0),
    reservationRequests: requests.filter(r => r.kind === "reservation").length,
    messages: requests.filter(r => r.kind === "callback").length,
    spamBlocked: calls.filter(c => c.category === "spam").length,
    averageCallSeconds: counted ? Math.round(totalSeconds / counted) : null,
    callsByHour,
    callsByCategory: [...byCategory.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    ordersByDay: [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, count]) => ({ key, count })),
  };
}
