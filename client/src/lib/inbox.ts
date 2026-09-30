import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase";

// The Live Inbox's side of the ordering database: the calls Brio took, the
// orders taken on them, and the staff's moves. Everything goes through the
// signed-in person's own account, so Row Level Security and the ordering
// system's rules (who may move an order where) decide what they can do.

// The data ---------------------------------------------------------------------

export type OrderState =
  | "draft"
  | "validated"
  | "caller_confirmed"
  | "pending_staff_review"
  | "pos_entered"
  | "pos_accepted"
  | "fulfilled"
  | "cancelled"
  | "rejected"
  | "escalated";

export interface Modifier {
  group_name?: string;
  option_name: string;
  // Where the choice goes when read out: "before" the name, "with" or "comma".
  placement?: string;
  price_cents?: number;
}

export interface LineItem {
  sku?: string;
  name: string;
  quantity: number;
  modifiers?: Modifier[];
  line_total_cents?: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  state: OrderState;
  created_at: string;
  updated_at: string;
  call_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  requested_pickup_time: string | null;
  staff_review_deadline: string | null;
  intake_mode: "staffed" | "after_hours_request" | null;
  payment_method: "pay_at_pickup" | "payment_link" | null;
  line_items: LineItem[];
  subtotal_cents: number | null;
  currency: string;
}

export interface OrderEvent {
  id: number;
  order_id: string;
  from_state: OrderState | null;
  to_state: OrderState;
  actor_kind: "agent" | "staff" | "admin";
  reason: string;
  created_at: string;
}

export type CallKind =
  | "order"
  | "reservation"
  | "alert"
  | "spam"
  | "question"
  | "other";

export interface CallRecord {
  restaurant_id: string;
  call_id: string;
  created_at: string;
  call_type: "phone_call" | "web_call" | null;
  from_number: string | null;
  started_at: string | null;
  duration_seconds: number | null;
  disconnection_reason: string | null;
  kind: CallKind | null;
  summary: string | null;
  transcript: string | null;
  in_voicemail: boolean | null;
  analysis: Record<string, string | number | boolean>;
  handled_at: string | null;
  staff_note: string;
}

export interface Restaurant {
  id: string;
  name: string;
  timezone: string;
  currency: string;
}

export type Role = "owner" | "staff" | "agent";

export interface CallDetails {
  recording_url: string | null;
  summary: string | null;
  transcript: string | null;
  duration_seconds: number | null;
}

// One row of the inbox: a call, with the orders taken on it.
export interface Entry {
  key: string;
  kind: CallKind;
  at: string;
  call: CallRecord | null;
  // The order that counts for this call (the one sent to staff, if any).
  order: Order | null;
  callId: string | null;
  needsYou: boolean;
}

// How the inbox reaches the data: the real database, or the sample data.
export interface InboxBackend {
  restaurant: Restaurant;
  role: Role;
  load(): Promise<{ orders: Order[]; calls: CallRecord[] }>;
  events(order: Order): Promise<OrderEvent[]>;
  move(order: Order, to: OrderState, reason: string): Promise<Order>;
  mark(
    call: CallRecord,
    change: { handled?: boolean; note?: string }
  ): Promise<CallRecord>;
  details(callId: string): Promise<CallDetails | null>;
}

/** A message a person can read; thrown by the backend when a change is refused. */
export class InboxError extends Error {
  constructor(
    message: string,
    readonly signedOut = false,
    readonly stale = false
  ) {
    super(message);
    this.name = "InboxError";
  }
}

// Orders and calls ------------------------------------------------------------

// Which order stands for its call: the one furthest along on the staff side.
const ORDER_WEIGHT: Record<OrderState, number> = {
  pending_staff_review: 10,
  pos_entered: 9,
  pos_accepted: 8,
  fulfilled: 7,
  escalated: 6,
  caller_confirmed: 5,
  validated: 4,
  draft: 3,
  rejected: 2,
  cancelled: 1,
};

/** Staff-side states, where the order reached the restaurant. */
export const REACHED_STAFF: OrderState[] = [
  "pending_staff_review",
  "pos_entered",
  "pos_accepted",
  "fulfilled",
];

function mainOrder(orders: Order[]): Order | null {
  let best: Order | null = null;
  for (const order of orders) {
    if (
      !best ||
      ORDER_WEIGHT[order.state] > ORDER_WEIGHT[best.state] ||
      (ORDER_WEIGHT[order.state] === ORDER_WEIGHT[best.state] &&
        order.created_at > best.created_at)
    )
      best = order;
  }
  return best;
}

/** Calls and orders as inbox rows, newest first. */
export function buildEntries(orders: Order[], calls: CallRecord[]): Entry[] {
  const byCall = new Map<string, Order[]>();
  const loose: Order[] = [];
  for (const order of orders) {
    if (!order.call_id) loose.push(order);
    else
      byCall.set(order.call_id, [...(byCall.get(order.call_id) ?? []), order]);
  }
  const callsById = new Map(calls.map(call => [call.call_id, call]));
  const ids = new Set(
    Array.from(byCall.keys()).concat(Array.from(callsById.keys()))
  );

  const entries: Entry[] = [];
  for (const id of Array.from(ids)) {
    const call = callsById.get(id) ?? null;
    const order = mainOrder(byCall.get(id) ?? []);
    entries.push(makeEntry(`call:${id}`, id, call, order));
  }
  for (const order of loose)
    entries.push(makeEntry(`order:${order.id}`, null, null, order));
  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

function makeEntry(
  key: string,
  callId: string | null,
  call: CallRecord | null,
  order: Order | null
): Entry {
  const kind: CallKind = order ? "order" : (call?.kind ?? "other");
  const at = call?.started_at ?? order?.created_at ?? call?.created_at ?? "";
  let needsYou: boolean;
  if (order) {
    needsYou =
      order.state === "pending_staff_review" ||
      (order.state === "escalated" && !call?.handled_at);
  } else {
    needsYou = kind !== "spam" && !call?.handled_at && !call?.in_voicemail;
  }
  return { key, kind, at, call, order, callId, needsYou };
}

// What staff can do next with an order. Only the moves the ordering system
// allows staff to make (private.order_transition_actor).
export const NEXT_STEP: Partial<
  Record<
    OrderState,
    { to: OrderState; label: string; done: string; reason: string }
  >
> = {
  pending_staff_review: {
    to: "pos_entered",
    label: "Punch to Kitchen",
    done: "Marked as entered in your POS.",
    reason: "staff_entered_in_pos",
  },
  pos_entered: {
    to: "pos_accepted",
    label: "Mark Accepted",
    done: "Marked as accepted in your POS.",
    reason: "staff_marked_accepted",
  },
  pos_accepted: {
    to: "fulfilled",
    label: "Mark Picked Up",
    done: "Marked as picked up.",
    reason: "staff_marked_picked_up",
  },
};

/** Ways staff can stop an order at each state. */
export const STOP_STEPS: Partial<
  Record<OrderState, ("rejected" | "cancelled")[]>
> = {
  pending_staff_review: ["rejected", "cancelled"],
  pos_entered: ["rejected", "cancelled"],
  pos_accepted: ["cancelled"],
};

export const STOP_REASONS = [
  "Sold out",
  "Kitchen too busy",
  "Customer asked to cancel",
  "Duplicate order",
  "Couldn't reach the customer",
];

// Words -------------------------------------------------------------------------

export const STATE_LABEL: Record<OrderState, string> = {
  draft: "Not finished",
  validated: "Not confirmed",
  caller_confirmed: "Confirmed by caller",
  pending_staff_review: "Needs review",
  pos_entered: "In the POS",
  pos_accepted: "Accepted",
  fulfilled: "Picked up",
  cancelled: "Cancelled",
  rejected: "Rejected",
  escalated: "Needs a person",
};

export const KIND_LABEL: Record<CallKind, string> = {
  order: "To-Go Order",
  reservation: "Reservation",
  alert: "Guest Alert",
  spam: "Robocall Dropped",
  question: "Question",
  other: "Call",
};

/** "(646) 555-0142" for US numbers; others as stored. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const us =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (us.length === 10 && (digits.length === 10 || digits.startsWith("1")))
    return `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}`;
  return phone;
}

/** Digits and a leading + only, for tel: and sms: links. */
export function dialable(phone: string | null | undefined): string {
  return (phone ?? "").replace(/(?!^\+)[^\d]/g, "");
}

export function money(
  cents: number | null | undefined,
  currency = "USD"
): string {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100
  );
}

/** "7:55 PM" today, "Fri 7:55 PM" this week, "Oct 2, 7:55 PM" later, in the restaurant's time zone. */
export function clockTime(
  iso: string,
  timeZone: string,
  now = Date.now()
): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone });
  if (day(date) === day(new Date(now))) return time;
  const days = Math.abs(date.getTime() - now) / 86400000;
  const label =
    days < 6
      ? date.toLocaleDateString("en-US", { timeZone, weekday: "short" })
      : date.toLocaleDateString("en-US", {
          timeZone,
          month: "short",
          day: "numeric",
        });
  return `${label} ${time}`;
}

/** "just now", "4m ago", "2h ago", "Yesterday", "Sep 21". */
export function ago(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 60 * 48) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "0:48", "12:05". */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const READ_BEFORE = new Set(["before"]);
const READ_AFTER_COMMA = new Set(["comma"]);

/**
 * One order line the way Brio reads it back: "2x grande Caffè Mocha", with
 * the other choices as a note ("with oat milk, warmed").
 */
export function lineText(line: LineItem): { name: string; note: string } {
  const modifiers = line.modifiers ?? [];
  const before = modifiers
    .filter(m => READ_BEFORE.has(m.placement ?? ""))
    .map(m => m.option_name);
  const comma = modifiers
    .filter(m => READ_AFTER_COMMA.has(m.placement ?? ""))
    .map(m => m.option_name);
  const withList = modifiers
    .filter(
      m =>
        !READ_BEFORE.has(m.placement ?? "") &&
        !READ_AFTER_COMMA.has(m.placement ?? "")
    )
    .map(m => m.option_name);
  const listed = (words: string[]) =>
    new Intl.ListFormat("en-US", { style: "long", type: "conjunction" }).format(
      words
    );
  const note = [
    withList.length ? `with ${listed(withList)}` : "",
    comma.join(", "),
  ]
    .filter(Boolean)
    .join(", ");
  return {
    name: `${line.quantity}x ${[...before, line.name].join(" ")}`,
    note,
  };
}

/** The feed's one-line summary of an order: "2x Caffè Mocha + Croissant". */
export function orderHeadline(order: Order): string {
  const lines = order.line_items ?? [];
  if (!lines.length) return "Order not finished";
  const names = lines.map(line =>
    line.quantity > 1 ? `${line.quantity}x ${line.name}` : line.name
  );
  return names.length > 2
    ? `${names.slice(0, 2).join(" + ")} + ${names.length - 2} more`
    : names.join(" + ");
}

/** "#8F3A": short enough to say across the counter. */
export function orderNumber(order: Order): string {
  return `#${order.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/** A value from Retell's post-call analysis, under any of the usual field names. */
export function analysisValue(
  call: CallRecord | null,
  ...names: string[]
): string | null {
  if (!call) return null;
  for (const name of names) {
    const value = call.analysis?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

export function callerName(entry: Entry): string | null {
  return (
    entry.order?.customer_name ??
    analysisValue(entry.call, "caller_name", "customer_name", "name")
  );
}

export function callerPhone(entry: Entry): string | null {
  return entry.order?.customer_phone ?? entry.call?.from_number ?? null;
}

/** The feed's line under the caller: what the call was about. */
export function headline(entry: Entry): string {
  if (entry.order) return orderHeadline(entry.order);
  const call = entry.call;
  if (!call) return "";
  if (entry.kind === "reservation") {
    const party = analysisValue(call, "party_size", "guests");
    const time = analysisValue(
      call,
      "requested_time",
      "reservation_time",
      "date_time"
    );
    const parts = [party ? `Party of ${party}` : "", time ?? ""].filter(
      Boolean
    );
    if (parts.length) return parts.join(" • ");
  }
  if (entry.kind === "spam") {
    const reason = analysisValue(call, "spam_reason", "reason", "topic");
    if (reason) return `"${reason}"`;
  }
  const topic = analysisValue(
    call,
    "topic",
    "reason",
    "alert_detail",
    "question"
  );
  if (topic) return topic;
  if (call.in_voicemail) return "Went to voicemail";
  const summary = call.summary ?? "";
  const sentence = summary.split(/(?<=[.!?])\s/)[0] ?? "";
  return sentence.length > 70
    ? `${sentence.slice(0, 68)}…`
    : sentence || "No summary yet";
}

/** The feed's status line: "Needs review • 4m ago". */
export function statusLine(entry: Entry, now = Date.now()): string {
  let status: string;
  if (entry.order) status = STATE_LABEL[entry.order.state];
  else if (entry.kind === "spam") {
    const seconds = entry.call?.duration_seconds;
    status =
      seconds !== null && seconds !== undefined
        ? `Ended in ${Math.max(1, seconds)}s`
        : "Blocked";
  } else status = entry.call?.handled_at ? "Handled" : "Needs a look";
  return entry.at ? `${status} • ${ago(entry.at, now)}` : status;
}

// The database ----------------------------------------------------------------

const ORDER_COLUMNS =
  "id, restaurant_id, state, created_at, updated_at, call_id, customer_name, customer_phone, requested_pickup_time, staff_review_deadline, intake_mode, payment_method, line_items, subtotal_cents, currency";
const CALL_COLUMNS =
  "restaurant_id, call_id, created_at, call_type, from_number, started_at, duration_seconds, disconnection_reason, kind, summary, transcript, in_voicemail, analysis, handled_at, staff_note";
// Two weeks of calls is plenty for a working inbox.
const WINDOW_MS = 14 * 86400000;

let client: SupabaseClient | null = null;

/** One client for the page, keeping the staff login on this device. */
export function inboxClient(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "cohost.inbox.auth",
    },
  });
  return client;
}

// Postgres raises these from the ordering rules (orders_before_update, transition_order).
function readableError(message: string): InboxError {
  if (/jwt|token|not authenticated/i.test(message))
    return new InboxError("Your sign-in ended. Sign in again.", true);
  if (/state_conflict/.test(message))
    return new InboxError(
      "This order was just changed somewhere else. The inbox has the latest now.",
      false,
      true
    );
  if (
    /illegal_transition|only staff|insufficient_privilege|call_rule/.test(
      message
    )
  )
    return new InboxError(
      "Your account can't make that change. Ask the owner to give you a staff login."
    );
  return new InboxError(
    "Couldn't save that. Check your connection and try again."
  );
}

export interface Membership {
  restaurant: Restaurant;
  role: Role;
}

/** The restaurants this person works at (Row Level Security shows only their own). */
export async function loadMemberships(session: Session): Promise<Membership[]> {
  const db = inboxClient();
  const { data: members, error } = await db
    .from("restaurant_members")
    .select("restaurant_id, role")
    .eq("user_id", session.user.id);
  if (error) throw readableError(error.message);
  if (!members?.length) return [];
  const { data: restaurants, error: restaurantsError } = await db
    .from("restaurants")
    .select("id, name, timezone, currency")
    .in(
      "id",
      members.map(m => m.restaurant_id)
    );
  if (restaurantsError) throw readableError(restaurantsError.message);
  return members.flatMap(member => {
    const restaurant = restaurants?.find(r => r.id === member.restaurant_id);
    return restaurant ? [{ restaurant, role: member.role as Role }] : [];
  });
}

export function databaseBackend({
  restaurant,
  role,
}: Membership): InboxBackend {
  const db = inboxClient();
  return {
    restaurant,
    role,
    async load() {
      const since = new Date(Date.now() - WINDOW_MS).toISOString();
      const [orders, calls] = await Promise.all([
        db
          .from("orders")
          .select(ORDER_COLUMNS)
          .eq("restaurant_id", restaurant.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(400),
        db
          .from("calls")
          .select(CALL_COLUMNS)
          .eq("restaurant_id", restaurant.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(400),
      ]);
      if (orders.error) throw readableError(orders.error.message);
      // Before the calls table exists (or if it can't be read), orders alone still work.
      return {
        orders: (orders.data ?? []) as Order[],
        calls: calls.error ? [] : ((calls.data ?? []) as CallRecord[]),
      };
    },
    async events(order) {
      const { data, error } = await db
        .from("order_events")
        .select(
          "id, order_id, from_state, to_state, actor_kind, reason, created_at"
        )
        .eq("restaurant_id", restaurant.id)
        .eq("order_id", order.id)
        .order("id");
      if (error) throw readableError(error.message);
      return (data ?? []) as OrderEvent[];
    },
    async move(order, to, reason) {
      const { data, error } = await db.rpc("transition_order", {
        p_restaurant_id: restaurant.id,
        p_order_id: order.id,
        p_from_state: order.state,
        p_to_state: to,
        p_reason: reason,
        p_details: {},
      });
      if (error) throw readableError(error.message);
      return { ...order, ...(data as Partial<Order>) };
    },
    async mark(call, { handled, note }) {
      const update: Record<string, unknown> = {};
      if (handled !== undefined)
        update.handled_at = handled ? new Date().toISOString() : null;
      if (note !== undefined) update.staff_note = note;
      const { data, error } = await db
        .from("calls")
        .update(update)
        .eq("restaurant_id", restaurant.id)
        .eq("call_id", call.call_id)
        .select(CALL_COLUMNS)
        .single();
      if (error) throw readableError(error.message);
      return data as CallRecord;
    },
    async details(callId) {
      const { data, error } = await db.functions.invoke("call-details", {
        body: { restaurant_id: restaurant.id, call_id: callId },
      });
      if (error) return null;
      return data as CallDetails;
    },
  };
}
