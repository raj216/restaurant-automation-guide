// Time helpers. Every time the dashboard shows, and every "today" it works out,
// uses the restaurant's own timezone, never the device's.

import type { DayKey } from "./types";

export interface Zoned {
  year: number;
  month: number; // 1 to 12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
}

export const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** The wall-clock time in a timezone. */
export function zonedParts(date: Date, timeZone: string): Zoned {
  const out: Record<string, string> = {};
  for (const p of partsFormatter(timeZone).formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS[out.weekday] ?? 0,
  };
}

function offsetMs(ms: number, timeZone: string): number {
  const p = zonedParts(new Date(ms), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** The real moment when the wall clock in a timezone reads this date and time. */
export function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let utc = guess - offsetMs(guess, timeZone);
  utc = guess - offsetMs(utc, timeZone);
  return new Date(utc);
}

/** Midnight at the start of the day that contains `date`, in the timezone. */
export function startOfDay(date: Date, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  return zonedToUtc(p.year, p.month, p.day, 0, 0, timeZone);
}

/** Midnight `days` calendar days after the day that contains `date`. */
export function addDays(date: Date, days: number, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  // Date.UTC rolls over month ends for us.
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return zonedToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 0, 0, timeZone);
}

/** "2026-10-06" for the day that contains `date` in the timezone. */
export function dayKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function formatTime(value: string | Date | null | undefined, timeZone: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

/** "Tue, Oct 6 · 7:46 PM" */
export function formatNow(value: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(value);
  return `${day} · ${formatTime(value, timeZone)}`;
}

/** "Today", "Tomorrow", "Yesterday", or "Fri, Oct 9". */
export function dayLabel(value: string | Date, now: Date, timeZone: string): string {
  const date = new Date(value);
  const diff = Math.round((startOfDay(date, timeZone).getTime() - startOfDay(now, timeZone).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(date);
}

/** "Tomorrow · 12:30 PM" */
export function dayAndTime(value: string | Date, now: Date, timeZone: string): string {
  return `${dayLabel(value, now, timeZone)} · ${formatTime(value, timeZone)}`;
}

/** "Friday, Oct 9" for grouping. */
export function longDay(value: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "short", day: "numeric" }).format(new Date(value));
}

export function minutesSince(value: string | Date, now: Date): number {
  return Math.floor((now.getTime() - new Date(value).getTime()) / 60000);
}

/** "just now", "4 min ago", "2 hr ago", "3 days ago". */
export function relative(value: string | Date, now: Date): string {
  const minutes = minutesSince(value, now);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/** "4 min ago · 7:42 PM" */
export function relativeAndTime(value: string | Date, now: Date, timeZone: string): string {
  return `${relative(value, now)} · ${formatTime(value, timeZone)}`;
}

/** "in 16 h 14 m" or "overdue by 5 m". */
export function countdown(deadline: string | Date, now: Date): { text: string; overdue: boolean } {
  const ms = new Date(deadline).getTime() - now.getTime();
  const overdue = ms < 0;
  const total = Math.floor(Math.abs(ms) / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const span = h > 0 ? `${h} h ${m} m` : `${m} m`;
  return { text: overdue ? `overdue by ${span}` : `in ${span}`, overdue };
}

/** "2:31" for a length in seconds. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "12:00 PM" from "12:00". */
export function clock12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
