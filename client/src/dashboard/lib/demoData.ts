// The example dashboard at cohost.site/demo. Everything here is made up: a pretend
// restaurant, 555 phone numbers (reserved for fiction), and orders that live only in
// this browser tab. Nothing is read from or written to the real database.

import type {
  CallLog,
  GuestRequest,
  LineItem,
  LiveData,
  Membership,
  MenuItem,
  Order,
  OrderEvent,
  OrderState,
  Restaurant,
  RequestStatus,
} from "./types";
import type { RestaurantPatch } from "./data";

const RESTAURANT_ID = "demo-norma-trattoria";
const NOW = Date.now();
const iso = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

let restaurant: Restaurant = {
  id: RESTAURANT_ID,
  name: "Norma Trattoria",
  timezone: "America/New_York",
  currency: "USD",
  accepting_orders: true,
  staffed_review_windows: DAYS.map(day => ({ day, start: "00:00", end: "23:59" })),
  closed_dates: [],
  last_call_minutes: 0,
  takes_reservation_requests: true,
  host_notes: "Street parking only. Corkage is $25 per bottle. Gluten-free penne is available for $2 more.",
  phone_number: "+12125550100",
  transfer_phone_number: null,
  current_menu_version: 1,
};

// ---- Menu ----

const MENU_ROWS: [string, string, number, string, boolean][] = [
  ["rigatoni-vodka", "Rigatoni alla Vodka", 2200, "Spicy vodka sauce, parmigiano. Contains dairy.", true],
  ["fennel-salad", "Arugula & Shaved Fennel Salad", 1400, "Lemon, olive oil, shaved pecorino.", false],
  ["burrata", "Burrata", 1600, "Heirloom tomato, basil, grilled bread.", true],
  ["margherita", "Margherita Pizza", 1900, "San Marzano tomato, fior di latte, basil.", true],
  ["chicken-parm", "Chicken Parmigiana", 2600, "Breaded cutlet, marinara, mozzarella. Served with spaghetti.", false],
  ["lasagna", "Lasagna Bolognese", 2400, "Slow-cooked beef ragu, béchamel.", true],
  ["meatballs", "Meatballs", 1500, "Three beef and pork meatballs in marinara.", false],
  ["caesar", "Caesar Salad", 1300, "Little gem, anchovy dressing, croutons.", false],
  ["garlic-bread", "Garlic Bread", 800, "Baked in the wood oven.", false],
  ["tiramisu", "Tiramisu", 1000, "Espresso-soaked ladyfingers, mascarpone.", true],
  ["panna-cotta", "Panna Cotta", 900, "Vanilla bean, seasonal fruit.", false],
  ["cannoli", "Cannoli", 800, "Ricotta, pistachio, chocolate chips.", false],
  ["espresso", "Espresso", 400, "Double shot.", false],
];

let menu: MenuItem[] = MENU_ROWS.map(([sku, name, price, description, popular]) => ({
  id: `demo-item-${sku}`,
  restaurant_id: RESTAURANT_ID,
  menu_version: 1,
  sku,
  name,
  price_cents: price,
  available: true,
  description,
  dietary_tags: sku === "fennel-salad" || sku === "caesar" ? ["Vegetarian"] : [],
  popular,
  required_modifiers: [],
  optional_modifiers: [],
}));

const price = (sku: string) => MENU_ROWS.find(r => r[0] === sku)![2];
const nameOf = (sku: string) => MENU_ROWS.find(r => r[0] === sku)![1];

function line(sku: string, quantity: number, modifier?: { name: string; cents: number }): LineItem {
  const unit = price(sku) + (modifier?.cents ?? 0);
  return {
    sku,
    name: nameOf(sku),
    quantity,
    unit_price_cents: unit,
    line_total_cents: unit * quantity,
    modifiers: modifier ? [{ option_name: modifier.name, price_cents: modifier.cents, placement: "with" }] : [],
  };
}

// ---- Orders ----

let nextEventId = 1;
let events: OrderEvent[] = [];

function addEvent(orderId: string, from: OrderState | null, to: OrderState, reason: string, minutesAgo: number, actor: OrderEvent["actor_kind"] = "agent") {
  events.push({
    id: nextEventId++,
    order_id: orderId,
    from_state: from,
    to_state: to,
    actor_kind: actor,
    actor_user_id: actor === "agent" ? null : "demo-user",
    reason,
    created_at: iso(minutesAgo),
  });
}

function makeOrder(
  id: string,
  state: OrderState,
  minutesAgo: number,
  name: string | null,
  phone: string,
  items: LineItem[],
  extra: Partial<Order> = {},
): Order {
  const subtotal = items.reduce((sum, i) => sum + i.line_total_cents, 0);
  return {
    id,
    restaurant_id: RESTAURANT_ID,
    state,
    created_at: iso(minutesAgo),
    updated_at: iso(minutesAgo),
    customer_name: name,
    customer_phone: phone,
    requested_pickup_time: null,
    intake_mode: "staffed",
    staff_review_deadline: null,
    payment_method: "pay_at_pickup",
    currency: "USD",
    subtotal_cents: subtotal,
    line_items: items,
    allergy_note: null,
    call_id: null,
    menu_version: 1,
    ...extra,
  };
}

const TRANSCRIPTS: Record<string, string> = {
  "demo-call-1082": [
    "Agent: Thanks for calling Norma Trattoria! This is Brio. How can I help?",
    "Caller: Hi, two rigatoni vodka for pickup, one of them gluten-free, and the fennel salad.",
    "Agent: Got it. One rigatoni alla vodka, one with gluten-free penne for two dollars more, and one arugula and fennel salad. Is the gluten-free for an allergy?",
    "Caller: Yes, one of us is gluten intolerant.",
    "Agent: I've noted it. Your total is sixty dollars before tax. When would you like to pick it up?",
    "Caller: Around 7:55 if that works.",
    "Agent: Done! I've sent your order to the restaurant for review. It is not accepted or in the kitchen yet, and you'll get a text. Please mention the gluten allergy again at pickup.",
  ].join("\n"),
  "demo-call-1083": [
    "Agent: Thanks for calling Norma Trattoria! This is Brio. How can I help?",
    "Caller: A margherita pizza and a tiramisu to go, please.",
    "Agent: One margherita pizza and one tiramisu, twenty-nine dollars before tax. Name for the order?",
    "Caller: Marcus.",
    "Agent: Thanks, Marcus. I've sent your order to the restaurant for review. It is not accepted or in the kitchen yet.",
  ].join("\n"),
  "demo-call-res": [
    "Agent: Thanks for calling Norma Trattoria! This is Brio. How can I help?",
    "Caller: Do you have a table for four tonight around eight? It's an anniversary.",
    "Agent: I can't book a table myself, but I can take a request and have the host call you back to confirm. What name and number should I use?",
    "Caller: Dave, and this number is fine.",
    "Agent: Thanks, Dave. I've passed on a request for four tonight at eight, noted as an anniversary. Someone will call you to confirm.",
  ].join("\n"),
  "demo-call-complaint": [
    "Agent: Thanks for calling Norma Trattoria! This is Brio. How can I help?",
    "Caller: I want to complain. I waited forty minutes for a pickup order last night.",
    "Agent: I'm sorry about that. I'll make sure a manager hears this and calls you back. Can I get your name and number?",
    "Caller: Rachel, same number I'm calling from.",
    "Agent: Thank you, Rachel. I've flagged it for a manager to call you back.",
  ].join("\n"),
  "demo-call-spam": "Agent: Thanks for calling Norma Trattoria! This is Brio. How can I help?\nCaller: This is an important message about your business loan eligibility.\nAgent: This looks like an automated sales call. Goodbye.",
};

let orders: Order[] = [];
let requests: GuestRequest[] = [];
let calls: CallLog[] = [];
let ready = false;
let liveOrderTimer: ReturnType<typeof setTimeout> | null = null;

function addCall(
  n: string,
  minutesAgo: number,
  seconds: number,
  from: string,
  category: CallLog["category"],
  summary: string,
  extra: Partial<CallLog> = {},
) {
  calls.push({
    id: `demo-callrow-${n}`,
    restaurant_id: RESTAURANT_ID,
    call_id: `demo-call-${n}`,
    call_type: "phone_call",
    from_number: from,
    started_at: iso(minutesAgo),
    ended_at: iso(minutesAgo - seconds / 60),
    duration_seconds: seconds,
    category,
    summary,
    caller_name: null,
    allergies: null,
    needs_follow_up: false,
    sentiment: "positive",
    ended_by: "caller",
    transcript: TRANSCRIPTS[`demo-call-${n}`] ?? null,
    created_at: iso(minutesAgo),
    ...extra,
  });
}

function request(
  n: string,
  kind: GuestRequest["kind"],
  status: RequestStatus,
  minutesAgo: number,
  name: string,
  phone: string,
  extra: Partial<GuestRequest> = {},
) {
  requests.push({
    id: `demo-request-${n}`,
    restaurant_id: RESTAURANT_ID,
    kind,
    status,
    call_id: null,
    customer_name: name,
    customer_phone: phone,
    party_size: null,
    requested_time: null,
    note: null,
    topic: null,
    allergy_note: null,
    created_at: iso(minutesAgo),
    updated_at: iso(minutesAgo),
    ...extra,
  });
}

function build() {
  if (ready) return;
  ready = true;
  const hex = (n: number) => `${n.toString(16).padStart(6, "0")}-0000-4000-8000-000000000000`;
  const in_ = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString();

  const o1 = makeOrder(hex(0xa1082c), "pending_staff_review", 4, "Sarah L.", "+16465550142", [line("rigatoni-vodka", 1), line("rigatoni-vodka", 1, { name: "Gluten-free penne", cents: 200 }), line("fennel-salad", 1)], {
    allergy_note: "Gluten (one guest)",
    requested_pickup_time: new Date(NOW + 25 * 60_000).toISOString(),
    call_id: "demo-call-1082",
  });
  const o2 = makeOrder(hex(0xb1083d), "pending_staff_review", 2, "Marcus T.", "+19175550121", [line("margherita", 1), line("tiramisu", 1)], { call_id: "demo-call-1083" });
  const o3 = makeOrder(hex(0xc10849), "pending_staff_review", 8, "Elena M.", "+12125550163", [line("chicken-parm", 1), line("caesar", 1)], { allergy_note: "Shellfish" });
  const o4 = makeOrder(hex(0xd1085e), "pending_staff_review", 6, "Priya S.", "+13475550118", [line("lasagna", 2), line("cannoli", 2)], {
    intake_mode: "after_hours_request",
    requested_pickup_time: in_(15),
    staff_review_deadline: in_(12),
  });
  const o5 = makeOrder(hex(0xe10871), "pos_entered", 14, "Jordan P.", "+17185550134", [line("lasagna", 2)]);
  const o6 = makeOrder(hex(0xf10882), "pos_accepted", 25, "Tom R.", "+19295550150", [line("meatballs", 1), line("garlic-bread", 1)]);
  const o7 = makeOrder(hex(0x110893), "fulfilled", 70, "Anna K.", "+12125550177", [line("margherita", 2), line("burrata", 1), line("espresso", 2)]);
  const o8 = makeOrder(hex(0x1208a4), "fulfilled", 190, "Luis G.", "+16465550109", [line("rigatoni-vodka", 1), line("caesar", 1)]);
  const o9 = makeOrder(hex(0x1308b5), "rejected", 130, "Chris W.", "+19175550166", [line("lasagna", 1)]);
  const o10 = makeOrder(hex(0x1408c6), "cancelled", 26 * 60, "Mei L.", "+13475550172", [line("burrata", 1), line("tiramisu", 1)]);
  const o11 = makeOrder(hex(0x1508d7), "escalated", 40, null, "+17185550190", [], { call_id: "demo-call-esc" });
  orders = [o1, o2, o3, o4, o5, o6, o7, o8, o9, o10, o11];

  for (const o of [o1, o2, o3, o4]) {
    const age = Math.round((NOW - new Date(o.created_at).getTime()) / 60_000);
    addEvent(o.id, null, "caller_confirmed", "caller_confirmed", age + 1);
    addEvent(o.id, "caller_confirmed", "pending_staff_review", "sent_for_staff_review", age);
  }
  addEvent(o5.id, "caller_confirmed", "pending_staff_review", "sent_for_staff_review", 14);
  addEvent(o5.id, "pending_staff_review", "pos_entered", "staff_entered_in_pos", 11, "staff");
  addEvent(o6.id, "caller_confirmed", "pending_staff_review", "sent_for_staff_review", 25);
  addEvent(o6.id, "pending_staff_review", "pos_entered", "staff_entered_in_pos", 22, "staff");
  addEvent(o6.id, "pos_entered", "pos_accepted", "staff_accepted_in_pos", 20, "staff");
  addEvent(o7.id, "caller_confirmed", "pending_staff_review", "sent_for_staff_review", 70);
  addEvent(o7.id, "pending_staff_review", "pos_entered", "staff_entered_in_pos", 66, "staff");
  addEvent(o7.id, "pos_entered", "pos_accepted", "staff_accepted_in_pos", 64, "staff");
  addEvent(o7.id, "pos_accepted", "fulfilled", "picked_up", 40, "staff");
  addEvent(o8.id, "caller_confirmed", "pending_staff_review", "sent_for_staff_review", 190);
  addEvent(o8.id, "pending_staff_review", "fulfilled", "picked_up", 150, "staff");
  addEvent(o9.id, "caller_confirmed", "pending_staff_review", "sent_for_staff_review", 130);
  addEvent(o9.id, "pending_staff_review", "rejected", "Out of the lasagna tonight", 126, "staff");
  addEvent(o10.id, "caller_confirmed", "pending_staff_review", "sent_for_staff_review", 26 * 60);
  addEvent(o10.id, "pending_staff_review", "cancelled", "Guest asked to cancel", 26 * 60 - 5, "staff");

  addCall("1082", 6, 118, "+16465550142", "order", "Ordered two rigatoni alla vodka (one gluten-free) and the fennel salad for pickup at 7:55 PM.", { caller_name: "Sarah L.", allergies: "Gluten (one guest)" });
  addCall("1083", 4, 74, "+19175550121", "order", "Ordered a margherita pizza and a tiramisu.", { caller_name: "Marcus T." });
  addCall("res", 12, 95, "+19175550187", "reservation", "Asked for a table for four tonight at 8:00 PM, an anniversary. Request passed to the host.", { caller_name: "Dave K.", needs_follow_up: true });
  addCall("complaint", 22, 88, "+16465550133", "complaint", "Waited 40 minutes for a pickup order last night. Wants a manager to call back.", { caller_name: "Rachel M.", needs_follow_up: true, sentiment: "negative" });
  addCall("esc", 40, 150, "+17185550190", "other", "Brio couldn't finish this call. The caller asked about a large order and hung up before giving details.", { needs_follow_up: true, sentiment: "neutral", ended_by: "caller" });
  addCall("spam", 18, 2, "+18005550101", "spam", "Automated business-loan sales call. Dropped in 2 seconds.", { sentiment: "neutral", ended_by: "agent" });
  addCall("spam2", 95, 2, "+18005550144", "spam", "Automated linen-service pitch. Dropped in 2 seconds.", { sentiment: "neutral", ended_by: "agent" });
  addCall("menu", 55, 41, "+12125550115", "menu_question", "Asked whether the vodka sauce has dairy. Brio confirmed it does and mentioned the dairy-free options.", { allergies: "Dairy" });
  addCall("hours", 110, 22, "+17185550120", "general_question", "Asked the hours for tonight and whether a reservation is needed on Saturday.");
  addCall("lost", 200, 63, "+12125550163", "lost_and_found", "Left black prescription sunglasses at booth 4 during early dinner. Wants a call back.", { caller_name: "Elena M.", needs_follow_up: true });
  addCall("job", 300, 49, "+13475550101", "job_inquiry", "Asked about line cook openings and who to send a résumé to.");
  addCall("wrong", 380, 6, "+19295550111", "wrong_number", "Wrong number.", { sentiment: "neutral" });
  addCall("old1", 26 * 60, 130, "+16465550188", "order", "Ordered chicken parmigiana and a Caesar salad.", { caller_name: "Mei L." });
  addCall("old2", 28 * 60, 97, "+12125550155", "reservation", "Asked for a table for six on Friday.", { caller_name: "Helen P." });
  addCall("old3", 30 * 60, 3, "+18005550166", "spam", "Robocall. Dropped.", { sentiment: "neutral", ended_by: "agent" });

  request("r1", "reservation", "pending_staff_review", 12, "Dave K.", "+19175550187", {
    party_size: 4,
    requested_time: in_(3),
    note: "Anniversary dinner. A quiet booth if possible.",
    call_id: "demo-call-res",
  });
  request("r2", "reservation", "pending_staff_review", 50, "Sam Lee", "+13475550102", { party_size: 2, requested_time: in_(26), note: "Window table if available." });
  request("r3", "reservation", "confirmed", 24 * 60, "Helen P.", "+12125550155", { party_size: 6, requested_time: in_(-2 + 72), note: "Birthday for a colleague." });
  request("m1", "callback", "pending_staff_review", 22, "Rachel M.", "+16465550133", {
    topic: "complaint",
    note: "Waited 40 minutes for a pickup order last night and would like a manager to call back.",
    call_id: "demo-call-complaint",
  });
  request("m2", "callback", "pending_staff_review", 75, "Julia R.", "+19175550140", { topic: "catering", note: "Planning a company lunch for 30 people next Thursday. Wants a quote for family-style trays." });
  request("m3", "callback", "pending_staff_review", 200, "Elena M.", "+12125550163", { topic: "lost_and_found", note: "Left black prescription sunglasses at booth 4 during early dinner service.", call_id: "demo-call-lost" });
  request("m4", "callback", "pending_staff_review", 300, "Alex D.", "+13475550101", { topic: "job_inquiry", note: "Interested in line cook openings. Has three years of experience." });
  request("m5", "callback", "pending_staff_review", 340, "Linen Co.", "+18005550177", { topic: "sales", note: "Offering linen service pricing." });
  request("m6", "callback", "called_back", 24 * 60 + 30, "Peter N.", "+17185550162", { topic: "general", note: "Asked whether the restaurant hosts private events." });
}

// Shortly after the example opens, a new order arrives, so visitors see it live.
function scheduleLiveOrder() {
  if (liveOrderTimer) return;
  liveOrderTimer = setTimeout(() => {
    const id = "a0b1c2-0000-4000-8000-000000000000";
    orders.push(
      makeOrder(id, "pending_staff_review", 0, "Olivia B.", "+17185550177", [line("burrata", 1), line("rigatoni-vodka", 1)], {
        requested_pickup_time: new Date(Date.now() + 30 * 60_000).toISOString(),
      }),
    );
    addEvent(id, null, "caller_confirmed", "caller_confirmed", 0);
    addEvent(id, "caller_confirmed", "pending_staff_review", "sent_for_staff_review", 0);
  }, 25_000);
}

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// ---- The same functions lib/data.ts offers, answered from this tab's memory ----

export function demoMemberships(): Membership[] {
  return [{ restaurant_id: RESTAURANT_ID, role: "owner" }];
}

export function demoRestaurants(): Restaurant[] {
  return [copy(restaurant)];
}

export function demoLiveData(): LiveData {
  build();
  scheduleLiveOrder();
  const withoutTranscripts = calls.map(c => {
    const { transcript: _transcript, ...rest } = c;
    void _transcript;
    return rest as CallLog;
  });
  return copy({ orders, requests, calls: withoutTranscripts });
}

export function demoPhoneDrafts(): Order[] {
  build();
  return [
    copy(
      makeOrder("a9b8c7-0000-4000-8000-000000000000", "draft", 60, "Ben H.", "+16465550199", [line("meatballs", 1)], {
        call_id: "demo-call-draft",
      }),
    ),
  ];
}

export function demoOrder(orderId: string): Order | null {
  build();
  const found = orders.find(o => o.id === orderId);
  return found ? copy(found) : null;
}

export function demoOrderEvents(orderId: string): OrderEvent[] {
  build();
  return copy(events.filter(e => e.order_id === orderId).sort((a, b) => a.id - b.id));
}

export function demoCall(callId: string): CallLog | null {
  build();
  const found = calls.find(c => c.call_id === callId);
  return found ? copy(found) : null;
}

export function demoMenu(): MenuItem[] {
  return copy(menu);
}

export function demoTransition(orderId: string, from: OrderState, to: OrderState, reason: string): void {
  build();
  const order = orders.find(o => o.id === orderId);
  if (!order || order.state !== from) {
    throw Object.assign(new Error("state_conflict"), { code: "PT409" });
  }
  order.state = to;
  order.updated_at = new Date().toISOString();
  addEvent(orderId, from, to, reason, 0, "staff");
}

export function demoSetRequestStatus(requestId: string, status: RequestStatus): void {
  const found = requests.find(r => r.id === requestId);
  if (found) {
    found.status = status;
    found.updated_at = new Date().toISOString();
  }
}

export function demoSetItemAvailable(itemId: string, available: boolean): void {
  menu = menu.map(i => (i.id === itemId ? { ...i, available } : i));
}

export function demoUpdateRestaurant(patch: RestaurantPatch): Restaurant {
  restaurant = { ...restaurant, ...patch };
  return copy(restaurant);
}
