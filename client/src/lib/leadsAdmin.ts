import { rpc } from "./supabase";

// The Leads page's side of the database: sign in with the passcode, then
// read and update the sign-ups sent from the website's forms.

export type LeadStatus =
  | "new"
  | "contacted"
  | "booked"
  | "trial"
  | "customer"
  | "not_a_fit"
  | "spam";

export const LEAD_STATUSES: { id: LeadStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "booked", label: "Setup booked" },
  { id: "trial", label: "In pilot" },
  { id: "customer", label: "Customer" },
  { id: "not_a_fit", label: "Not a fit" },
  { id: "spam", label: "Spam" },
];

export const statusLabel = (status: LeadStatus) =>
  LEAD_STATUSES.find(s => s.id === status)?.label ?? status;

export interface LeadSource {
  page?: string;
  referrer?: string;
  utm?: Partial<
    Record<
      "utm_source" | "utm_medium" | "utm_campaign" | "utm_term" | "utm_content",
      string
    >
  >;
  user_agent?: string;
  language?: string;
  timezone?: string;
  screen?: string;
  seconds_to_send?: number;
}

/** Which form sent it: the 14-day pilot sign-up, or the earlier contact form. */
export type LeadForm = "pilot" | "review";

export const formLabel = (form: LeadForm) =>
  form === "pilot" ? "14-day pilot" : "Contact form";

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  form: LeadForm;
  restaurant: string;
  phone: string | null;
  // The pilot form asks only for the restaurant and a phone number.
  name: string | null;
  email: string | null;
  location: string | null;
  pos: string | null;
  need: string | null;
  contact_preference: string | null;
  status: LeadStatus;
  notes: string;
  source: LeadSource;
}

export type LeadsError =
  | "signed_out"
  | "wrong_passcode"
  | "locked"
  | "not_set_up"
  | "too_short"
  | "invalid"
  | "not_found";

type Reply<T> =
  | ({ ok: true } & T)
  | { ok: false; error: LeadsError; field?: string };

export const leadsApi = {
  signIn: (passcode: string) =>
    rpc<Reply<{ token: string; expires_at: string }>>("leads_sign_in", {
      p_passcode: passcode,
    }),
  signOut: (token: string) =>
    rpc<Reply<object>>("leads_sign_out", { p_token: token }),
  list: (token: string) =>
    rpc<Reply<{ leads: Lead[]; now: string }>>("leads_list", {
      p_token: token,
    }),
  update: (
    token: string,
    id: string,
    change: { status?: LeadStatus; notes?: string }
  ) =>
    rpc<Reply<{ lead: Lead }>>("leads_update", {
      p_token: token,
      p_id: id,
      p_status: change.status ?? null,
      p_notes: change.notes ?? null,
    }),
  changePasscode: (token: string, current: string, next: string) =>
    rpc<Reply<object>>("leads_change_passcode", {
      p_token: token,
      p_current: current,
      p_new: next,
    }),
};

// The session token is kept on this device for its 30 days.
const SESSION_KEY = "cohost.leads.session";

export function loadSession(): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as {
      token?: string;
      expires_at?: string;
    } | null;
    if (
      !saved?.token ||
      !saved.expires_at ||
      Date.parse(saved.expires_at) <= Date.now()
    )
      return null;
    return saved.token;
  } catch {
    return null;
  }
}

export function saveSession(token: string, expiresAt: string) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token, expires_at: expiresAt })
    );
  } catch {
    // Private windows can refuse storage; the session then lasts until the tab closes.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}

// Dates and times --------------------------------------------------------------

/** "just now", "12 min ago", "3 h ago", "Yesterday", "Mon", "Sep 21", "Sep 21, 2025". */
export function whenShort(iso: string, now = Date.now()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now - then.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const today = new Date(now);
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  if (then.getTime() >= startOfToday)
    return `${Math.floor(minutes / 60)} h ago`;
  if (then.getTime() >= startOfToday - 86400000) return "Yesterday";
  if (then.getTime() >= startOfToday - 6 * 86400000)
    return then.toLocaleDateString(undefined, { weekday: "short" });
  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: then.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

/** "Sunday, September 28, 2026 at 7:42 PM" in the viewer's own time zone. */
export function whenLong(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

// Spreadsheet export ---------------------------------------------------------

const two = (n: number) => String(n).padStart(2, "0");

/** 2026-09-28 19:42 in the viewer's time zone: sorts correctly and reads in any spreadsheet. */
function spreadsheetTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

// A cell that starts like a formula is written as a text formula, so a
// spreadsheet shows it as typed and never runs it. Phone numbers starting
// with "+" stay readable too.
function csvCell(value: string) {
  const text = /^[=+\-@\t\r]/.test(value)
    ? `="${value.replace(/"/g, '""')}"`
    : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_COLUMNS: [string, (lead: Lead) => string][] = [
  ["Received", l => spreadsheetTime(l.created_at)],
  ["Status", l => statusLabel(l.status)],
  ["Form", l => formLabel(l.form)],
  ["Restaurant", l => l.restaurant],
  ["Phone", l => l.phone ?? ""],
  ["Name", l => l.name ?? ""],
  ["Email", l => l.email ?? ""],
  ["City / neighborhood", l => l.location ?? ""],
  ["Current POS", l => l.pos ?? ""],
  ["Best way to respond", l => l.contact_preference ?? ""],
  ["What happens when the phone gets busy?", l => l.need ?? ""],
  ["Notes", l => l.notes],
  ["Page", l => l.source.page ?? ""],
  ["Came from", l => l.source.referrer ?? ""],
  ["Campaign source", l => l.source.utm?.utm_source ?? ""],
  ["Campaign medium", l => l.source.utm?.utm_medium ?? ""],
  ["Campaign name", l => l.source.utm?.utm_campaign ?? ""],
];

/** The sign-ups as a CSV file that Excel, Numbers and Google Sheets open directly. */
export function leadsCsv(leads: Lead[]): string {
  const rows = [
    CSV_COLUMNS.map(([title]) => csvCell(title)).join(","),
    ...leads.map(lead =>
      CSV_COLUMNS.map(([, read]) => csvCell(read(lead))).join(",")
    ),
  ];
  // The byte-order mark tells Excel the file is UTF-8, so accents and emoji survive.
  return `﻿${rows.join("\r\n")}\r\n`;
}
