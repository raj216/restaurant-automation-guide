// The status chip in the top bar, and the hours rules behind it (spec 7.4).
// It only displays what Brio is doing. It is worked out in the restaurant's timezone.

import { addDays, dayKey, DAY_KEYS, hhmmToMinutes, zonedParts } from "./time";
import type { ClosedDate, Restaurant, ShiftWindow } from "./types";

export type BrioStatusKind = "paused" | "taking_orders" | "last_call" | "closed";

export interface BrioStatus {
  kind: BrioStatusKind;
  label: string;
}

export const BRIO_STATUS_LABELS: Record<BrioStatusKind, string> = {
  paused: "Paused: Brio isn't answering",
  taking_orders: "Taking orders",
  last_call: "Last call: requests only",
  closed: "Closed: taking requests for later",
};

export interface Shift {
  /** Minutes from midnight at the start of the day being checked. May be negative or past 1440. */
  from: number;
  to: number;
}

/** Overlapping shifts are merged, as the database does. */
export function mergeShifts(shifts: Shift[]): Shift[] {
  const sorted = [...shifts].sort((a, b) => a.from - b.from);
  const out: Shift[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.from <= last.to) last.to = Math.max(last.to, s.to);
    else out.push({ ...s });
  }
  return out;
}

/**
 * The shifts that touch one calendar day. A shift belongs to the day it starts, so
 * yesterday's overnight shift shows up here with negative start minutes. A closed
 * date removes the shifts that START that day.
 */
export function shiftsAround(
  windows: ShiftWindow[],
  closedDates: ClosedDate[],
  localYear: number,
  localMonth: number,
  localDay: number,
  weekday: number,
): Shift[] {
  const closed = new Set(closedDates.map(c => c.date));
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayKey = `${localYear}-${pad(localMonth)}-${pad(localDay)}`;
  const yesterday = new Date(Date.UTC(localYear, localMonth - 1, localDay - 1));
  const yesterdayKey = `${yesterday.getUTCFullYear()}-${pad(yesterday.getUTCMonth() + 1)}-${pad(yesterday.getUTCDate())}`;

  const out: Shift[] = [];
  for (const w of windows) {
    const start = hhmmToMinutes(w.start);
    let end = hhmmToMinutes(w.end);
    if (start === end) continue;
    if (end < start) end += 1440;
    if (w.day === DAY_KEYS[weekday] && !closed.has(todayKey)) out.push({ from: start, to: end });
    if (w.day === DAY_KEYS[(weekday + 6) % 7] && end > 1440 && !closed.has(yesterdayKey)) {
      out.push({ from: start - 1440, to: end - 1440 });
    }
  }
  return mergeShifts(out);
}

/** What the chip says right now. */
export function brioStatus(restaurant: Restaurant, now: Date): BrioStatus {
  const make = (kind: BrioStatusKind): BrioStatus => ({ kind, label: BRIO_STATUS_LABELS[kind] });
  if (!restaurant.accepting_orders) return make("paused");

  const p = zonedParts(now, restaurant.timezone);
  const minutes = p.hour * 60 + p.minute + p.second / 60;
  const shifts = shiftsAround(
    restaurant.staffed_review_windows ?? [],
    restaurant.closed_dates ?? [],
    p.year,
    p.month,
    p.day,
    p.weekday,
  );
  const current = shifts.find(s => minutes >= s.from && minutes < s.to);
  if (!current) return make("closed");
  const lastCall = restaurant.last_call_minutes ?? 0;
  if (lastCall > 0 && minutes >= current.to - lastCall) return make("last_call");
  return make("taking_orders");
}

/** Is today one of the restaurant's closed dates? The reason, if so. */
export function closedTodayReason(restaurant: Restaurant, now: Date): string | null {
  const key = dayKey(now, restaurant.timezone);
  return restaurant.closed_dates?.find(c => c.date === key)?.reason ?? null;
}

/** Midnight tomorrow, for date pickers that start from tomorrow. */
export function tomorrow(restaurant: Restaurant, now: Date): Date {
  return addDays(now, 1, restaurant.timezone);
}

// ---- Validation for the settings screen: the database refuses anything else. ----

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const REAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function validateWindows(windows: ShiftWindow[]): string | null {
  for (const w of windows) {
    if (!DAY_KEYS.includes(w.day)) return "Pick a day for every shift.";
    if (!HHMM.test(w.start) || !HHMM.test(w.end)) return "Enter every time as hours and minutes.";
    if (w.start === w.end) return "A shift can't start and end at the same time.";
  }
  return null;
}

export function validateClosedDates(dates: ClosedDate[]): string | null {
  const seen = new Set<string>();
  for (const d of dates) {
    const m = REAL_DATE.exec(d.date);
    if (!m) return "Pick a date for every closed day.";
    const probe = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    if (probe.getUTCMonth() !== Number(m[2]) - 1) return `${d.date} isn't a real date.`;
    if (seen.has(d.date)) return "Each date can only be listed once.";
    seen.add(d.date);
    const reason = d.reason.trim();
    if (reason.length < 1 || reason.length > 60) return "A reason is 1 to 60 characters.";
  }
  return null;
}

export function validateTransferNumber(value: string): string | null {
  if (value === "") return null;
  return /^\+[1-9][0-9]{6,14}$/.test(value) ? null : "Use + and 7 to 15 digits, for example +16305551122.";
}
