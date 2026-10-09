// Everything the dashboard reads from, and writes to, the database.
//
// Row Level Security already limits every query to the signed-in user's own
// restaurants and role. This file uses the public key and the user's own login only,
// and writes only what the database allows: order status through the
// transition_order function, request status, a menu item's "sold out" switch, and
// (for owners) the restaurant's settings. Nothing is ever deleted.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase";
import { IN_DEMO } from "../base";
import * as demo from "./demoData";
import type {
  CallLog,
  GuestRequest,
  LiveData,
  Membership,
  MenuItem,
  Order,
  OrderEvent,
  OrderState,
  Restaurant,
  RequestStatus,
} from "./types";

let client: SupabaseClient | null = null;

/** One browser login, kept between visits so a host stand stays signed in all service. */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "cohost.dashboard.auth",
      },
      global: {
        // A save that starts as the screen is being closed still goes through: the browser
        // finishes "keepalive" requests after the page is gone. Reads are left alone.
        fetch: (input, init) => fetch(input, init?.method && init.method !== "GET" && init.method !== "HEAD" ? { ...init, keepalive: true } : init),
      },
    });
  }
  return client;
}

/** An error from the database with the code the screens look at. */
export class DataError extends Error {
  readonly code: string;
  constructor(message: string, code = "") {
    super(message);
    this.name = "DataError";
    this.code = code;
  }
}

interface PostgrestLike {
  message: string;
  code?: string;
  details?: string;
}

function fail(error: PostgrestLike): never {
  throw new DataError(error.message, error.code ?? "");
}

/** Someone else already moved the order. */
export function isStateConflict(error: unknown): boolean {
  return error instanceof DataError && (error.code === "PT409" || /state_conflict/.test(error.message));
}

// ---- Who is signed in, and which restaurants ----

export async function fetchMemberships(userId: string): Promise<Membership[]> {
  if (IN_DEMO) return demo.demoMemberships();
  const { data, error } = await db().from("restaurant_members").select("restaurant_id, role").eq("user_id", userId);
  if (error) fail(error);
  return (data ?? []) as Membership[];
}

const RESTAURANT_COLS =
  "id,name,timezone,currency,accepting_orders,staffed_review_windows,closed_dates,last_call_minutes,takes_reservation_requests,host_notes,phone_number,transfer_phone_number,current_menu_version";

export async function fetchRestaurants(ids: string[]): Promise<Restaurant[]> {
  if (IN_DEMO) return demo.demoRestaurants();
  if (ids.length === 0) return [];
  const { data, error } = await db().from("restaurants").select(RESTAURANT_COLS).in("id", ids).order("name");
  if (error) fail(error);
  return (data ?? []) as Restaurant[];
}

// ---- The live board ----

const ORDER_COLS =
  "id,restaurant_id,state,created_at,updated_at,customer_name,customer_phone,requested_pickup_time,intake_mode,staff_review_deadline,payment_method,currency,subtotal_cents,line_items,allergy_note,call_id,menu_version";

const REACHED_LIMIT = 250;

/**
 * Orders that reached the restaurant: those with a history row that moved them to
 * "pending_staff_review". Brio's drafts, changed or unconfirmed versions and
 * mid-call corrections never did, so they are left out. Escalated orders are added.
 */
async function fetchReachedOrders(restaurantId: string): Promise<Order[]> {
  const embedded = await db()
    .from("order_events")
    .select(`order_id, created_at, orders!inner(${ORDER_COLS})`)
    .eq("restaurant_id", restaurantId)
    .eq("to_state", "pending_staff_review")
    .order("created_at", { ascending: false })
    .limit(REACHED_LIMIT);

  if (!embedded.error && embedded.data) {
    const seen = new Set<string>();
    const orders: Order[] = [];
    for (const row of embedded.data as unknown as { orders: Order | Order[] | null }[]) {
      const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
      if (order && !seen.has(order.id)) {
        seen.add(order.id);
        orders.push(order);
      }
    }
    return orders;
  }

  // If the combined query isn't available, ask in two steps.
  const events = await db()
    .from("order_events")
    .select("order_id")
    .eq("restaurant_id", restaurantId)
    .eq("to_state", "pending_staff_review")
    .order("created_at", { ascending: false })
    .limit(REACHED_LIMIT);
  if (events.error) fail(events.error);
  const ids = [...new Set((events.data ?? []).map(e => (e as { order_id: string }).order_id))];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
  const results = await Promise.all(
    chunks.map(chunk => db().from("orders").select(ORDER_COLS).eq("restaurant_id", restaurantId).in("id", chunk)),
  );
  const orders: Order[] = [];
  for (const r of results) {
    if (r.error) fail(r.error);
    orders.push(...((r.data ?? []) as unknown as Order[]));
  }
  return orders;
}

async function fetchEscalatedOrders(restaurantId: string): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select(ORDER_COLS)
    .eq("restaurant_id", restaurantId)
    .eq("state", "escalated")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) fail(error);
  return (data ?? []) as unknown as Order[];
}

const REQUEST_COLS =
  "id,restaurant_id,kind,status,call_id,customer_name,customer_phone,party_size,requested_time,note,topic,allergy_note,created_at,updated_at";

async function fetchRequests(restaurantId: string): Promise<GuestRequest[]> {
  const { data, error } = await db()
    .from("guest_requests")
    .select(REQUEST_COLS)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) fail(error);
  return (data ?? []) as GuestRequest[];
}

const CALL_LIST_COLS =
  "id,restaurant_id,call_id,call_type,from_number,started_at,ended_at,duration_seconds,category,summary,caller_name,allergies,needs_follow_up,sentiment,ended_by,created_at";

async function fetchCalls(restaurantId: string): Promise<CallLog[]> {
  const { data, error } = await db()
    .from("call_logs")
    .select(CALL_LIST_COLS)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) fail(error);
  return (data ?? []) as CallLog[];
}

/** Everything the live board polls for, in one go. */
export async function fetchLiveData(restaurantId: string): Promise<LiveData> {
  if (IN_DEMO) return demo.demoLiveData();
  const [reached, escalated, requests, calls] = await Promise.all([
    fetchReachedOrders(restaurantId),
    fetchEscalatedOrders(restaurantId),
    fetchRequests(restaurantId),
    fetchCalls(restaurantId),
  ]);
  const byId = new Map<string, Order>();
  for (const o of [...reached, ...escalated]) byId.set(o.id, o);
  return { orders: [...byId.values()], requests, calls };
}

/**
 * Brio's own phone drafts: orders that never reached the restaurant (drafts, versions
 * the caller changed or didn't confirm, mid-call corrections). Owners can look at them.
 */
export async function fetchPhoneDrafts(restaurantId: string, reachedIds: Set<string>): Promise<Order[]> {
  if (IN_DEMO) return demo.demoPhoneDrafts();
  const { data, error } = await db()
    .from("orders")
    .select(ORDER_COLS)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) fail(error);
  return ((data ?? []) as unknown as Order[]).filter(o => !reachedIds.has(o.id) && o.state !== "escalated");
}

// ---- Detail screens ----

export async function fetchOrder(restaurantId: string, orderId: string): Promise<Order | null> {
  if (IN_DEMO) return demo.demoOrder(orderId);
  const { data, error } = await db()
    .from("orders")
    .select(ORDER_COLS)
    .eq("restaurant_id", restaurantId)
    .eq("id", orderId)
    .maybeSingle();
  if (error) fail(error);
  return (data as unknown as Order | null) ?? null;
}

export async function fetchOrderEvents(restaurantId: string, orderId: string): Promise<OrderEvent[]> {
  if (IN_DEMO) return demo.demoOrderEvents(orderId);
  const { data, error } = await db()
    .from("order_events")
    .select("id,order_id,from_state,to_state,actor_kind,actor_user_id,reason,created_at")
    .eq("restaurant_id", restaurantId)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) fail(error);
  return (data ?? []) as OrderEvent[];
}

/** The call with its transcript. Details arrive about a minute after the call ends. */
export async function fetchCallDetail(restaurantId: string, callId: string): Promise<CallLog | null> {
  if (IN_DEMO) return demo.demoCall(callId);
  const { data, error } = await db()
    .from("call_logs")
    .select(`${CALL_LIST_COLS},transcript`)
    .eq("restaurant_id", restaurantId)
    .eq("call_id", callId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail(error);
  return (data as CallLog | null) ?? null;
}

export async function fetchMenu(restaurantId: string, version: number): Promise<MenuItem[]> {
  if (IN_DEMO) return demo.demoMenu();
  const { data, error } = await db()
    .from("menu_items")
    .select(
      "id,restaurant_id,menu_version,sku,name,price_cents,available,description,dietary_tags,popular,required_modifiers,optional_modifiers",
    )
    .eq("restaurant_id", restaurantId)
    .eq("menu_version", version)
    .order("name");
  if (error) fail(error);
  return (data ?? []) as MenuItem[];
}

// ---- The only writes ----

export async function transitionOrder(args: {
  restaurantId: string;
  orderId: string;
  from: OrderState;
  to: OrderState;
  reason: string;
}): Promise<void> {
  if (IN_DEMO) {
    try {
      return demo.demoTransition(args.orderId, args.from, args.to, args.reason);
    } catch (e) {
      throw new DataError(e instanceof Error ? e.message : "state_conflict", "PT409");
    }
  }
  const { error } = await db().rpc("transition_order", {
    p_restaurant_id: args.restaurantId,
    p_order_id: args.orderId,
    p_from_state: args.from,
    p_to_state: args.to,
    p_reason: args.reason,
    p_details: {},
  });
  if (error) fail(error);
}

export async function setRequestStatus(restaurantId: string, requestId: string, status: RequestStatus): Promise<void> {
  if (IN_DEMO) return demo.demoSetRequestStatus(requestId, status);
  const { data, error } = await db()
    .from("guest_requests")
    .update({ status })
    .eq("restaurant_id", restaurantId)
    .eq("id", requestId)
    .select("id");
  if (error) fail(error);
  if (!data || data.length === 0) throw new DataError("Couldn't update this request.", "no_rows");
}

export async function setItemAvailable(restaurantId: string, itemId: string, available: boolean): Promise<void> {
  if (IN_DEMO) return demo.demoSetItemAvailable(itemId, available);
  const { data, error } = await db()
    .from("menu_items")
    .update({ available })
    .eq("restaurant_id", restaurantId)
    .eq("id", itemId)
    .select("id");
  if (error) fail(error);
  if (!data || data.length === 0) throw new DataError("Couldn't update this item.", "no_rows");
}

export type RestaurantPatch = Partial<
  Pick<
    Restaurant,
    | "name"
    | "accepting_orders"
    | "staffed_review_windows"
    | "closed_dates"
    | "last_call_minutes"
    | "takes_reservation_requests"
    | "host_notes"
    | "transfer_phone_number"
  >
>;

/** Owners only. The database refuses this for anyone else. */
export async function updateRestaurant(restaurantId: string, patch: RestaurantPatch): Promise<Restaurant> {
  if (IN_DEMO) return demo.demoUpdateRestaurant(patch);
  const { data, error } = await db().from("restaurants").update(patch).eq("id", restaurantId).select(RESTAURANT_COLS);
  if (error) fail(error);
  if (!data || data.length === 0) throw new DataError("Only owners can change settings.", "no_rows");
  return data[0] as Restaurant;
}
