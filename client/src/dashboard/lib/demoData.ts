// The example dashboard at cohost.site/demo. Everything here is made up: a pretend
// coffee shop (the same Demo Coffee House Brio answers for on the demo phone number), 555 phone numbers (reserved for fiction), and orders that live only in
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

const RESTAURANT_ID = "demo-coffee-house";
const NOW = Date.now();
const iso = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

let restaurant: Restaurant = {
  id: RESTAURANT_ID,
  name: "Demo Coffee House",
  timezone: "America/New_York",
  currency: "USD",
  accepting_orders: true,
  staffed_review_windows: DAYS.map(day => ({ day, start: "00:00", end: "23:59" })),
  closed_dates: [],
  last_call_minutes: 0,
  takes_reservation_requests: false,
  host_notes: "Pickup only, no delivery. No table reservations. Oat, almond, soy or coconut milk is 70 cents more. Free Wi-Fi.",
  phone_number: "+12125550100",
  transfer_phone_number: null,
  current_menu_version: 1,
};

// ---- Menu ----

const MENU_ROWS: [string, string, number, string, boolean][] = [
  ["caffe-latte", "Caffè Latte", 445, "Espresso with steamed milk and a light layer of foam, hot or iced.", false],
  ["vanilla-latte", "Vanilla Latte", 495, "Espresso and steamed milk with sweet vanilla syrup, hot or iced.", true],
  ["caramel-latte", "Caramel Latte", 495, "Espresso and steamed milk with buttery caramel syrup, hot or iced.", false],
  ["matcha-latte", "Matcha Latte", 525, "Sweetened green tea matcha with milk, hot or iced. Not coffee.", false],
  ["chai-latte", "Chai Latte", 525, "Black tea with cinnamon, clove and warm spices, with milk. Not coffee.", false],
  ["brewed-coffee", "Brewed Coffee", 295, "Freshly brewed drip coffee, hot.", false],
  ["caffe-americano", "Caffè Americano", 365, "Espresso shots topped with hot water. Bold and not sweet.", false],
  ["cold-brew", "Cold Brew", 465, "Coffee slow-steeped in cold water, served over ice.", true],
  ["cappuccino", "Cappuccino", 445, "Espresso under a deep, airy layer of milk foam.", false],
  ["flat-white", "Flat White", 525, "Smooth espresso with velvety steamed milk.", false],
  ["strawberry-acai", "Strawberry Açaí Refresher", 495, "Strawberry and açaí fruit juice shaken with ice. No milk.", true],
  ["mango-dragonfruit", "Mango Dragonfruit Refresher", 495, "Mango and dragonfruit juice shaken with ice. No milk.", false],
  ["pineapple-passionfruit", "Pineapple Passionfruit Refresher", 495, "Pineapple and passionfruit juice shaken with ice. No milk.", false],
  ["peach-citrus", "Peach Citrus Refresher", 495, "Peach and citrus juice shaken with ice. No milk.", false],
  ["berry-hibiscus", "Berry Hibiscus Refresher", 495, "Mixed berries and hibiscus tea shaken with ice. No milk.", false],
  ["butter-croissant", "Butter Croissant", 345, "A flaky, buttery French-style croissant. Contains dairy, wheat and eggs.", true],
  ["blueberry-muffin", "Blueberry Muffin", 325, "A soft muffin packed with blueberries. Contains dairy, wheat and eggs.", false],
  ["banana-bread", "Banana Bread", 375, "Classic banana bread with walnuts. Contains walnuts, wheat, dairy and eggs.", false],
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
  dietary_tags: /acai|dragonfruit|passionfruit|citrus|hibiscus|cold-brew|americano|brewed/.test(sku) ? ["Vegan", "Dairy-free"] : ["Vegetarian"],
  popular,
  required_modifiers: [],
  optional_modifiers: [],
}));

const price = (sku: string) => MENU_ROWS.find(r => r[0] === sku)![2];
const nameOf = (sku: string) => MENU_ROWS.find(r => r[0] === sku)![1];

type Pick = { name: string; cents: number; placement?: "before" | "with" | "comma" };

/** One order line: the drink or pastry plus the choices the caller made (size, milk, ...). */
function line(sku: string, quantity: number, ...picks: Pick[]): LineItem {
  const unit = price(sku) + picks.reduce((sum, p) => sum + p.cents, 0);
  return {
    sku,
    name: nameOf(sku),
    quantity,
    unit_price_cents: unit,
    line_total_cents: unit * quantity,
    modifiers: picks.map(p => ({ option_name: p.name, price_cents: p.cents, placement: p.placement ?? "with" })),
  };
}

const grande: Pick = { name: "grande", cents: 60, placement: "before" };
const venti: Pick = { name: "venti", cents: 110, placement: "before" };
const iced: Pick = { name: "iced", cents: 0, placement: "before" };
const oat: Pick = { name: "oat milk", cents: 70 };
const warmed: Pick = { name: "warmed", cents: 0, placement: "comma" };

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

const HELLO = "Agent: Thanks for calling Demo Coffee House! This is Brio. How can I help?";

const TRANSCRIPTS: Record<string, string> = {
  "demo-call-1082": [
    HELLO,
    "Caller: Hi, two grande vanilla lattes for pickup, one of them with oat milk.",
    "Agent: Great pick. Two grande vanilla lattes, one with oat milk for seventy cents more. Is the oat milk for an allergy?",
    "Caller: Yes, one of us can't have dairy.",
    "Agent: Thanks for telling me, I've noted it. Your subtotal is eleven eighty before tax. Name for the order?",
    "Caller: Sarah.",
    "Agent: Thanks, Sarah! I've sent your order to the restaurant for review. It is not accepted or in the kitchen yet. Please mention the dairy allergy again at pickup.",
  ].join("\n"),
  "demo-call-1083": [
    HELLO,
    "Caller: A grande cold brew and a banana bread to go, please.",
    "Agent: One grande cold brew and one banana bread, nine dollars before tax. Name for the order?",
    "Caller: Marcus.",
    "Agent: Thanks, Marcus. I've sent your order to the restaurant for review. It is not accepted or in the kitchen yet.",
  ].join("\n"),
  "demo-call-cater": [
    HELLO,
    "Caller: I'm planning an office meeting next Thursday, about thirty people. Can you do a big coffee order?",
    "Agent: That sounds great. I can't quote a catering order myself, but I can pass the details to the manager. What name and number should I use?",
    "Caller: Dave, and this number is fine.",
    "Agent: Thanks, Dave. I've passed on your request for about thirty people next Thursday.",
  ].join("\n"),
  "demo-call-complaint": [
    HELLO,
    "Caller: I ordered an oat milk latte this morning and got whole milk. I'm not happy.",
    "Agent: I'm sorry about that. I'll make sure a manager hears this. Can I get your name and number?",
    "Caller: Rachel, same number I'm calling from.",
    "Agent: Thank you, Rachel. I've flagged it for a manager to follow up.",
  ].join("\n"),
  "demo-call-spam": "Agent: Thanks for calling Demo Coffee House! This is Brio. How can I help?\nCaller: This is an important message about your business loan eligibility.\nAgent: This looks like an automated sales call. Goodbye.",
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

  const o1 = makeOrder(hex(0xa1082c), "pending_staff_review", 4, "Sarah L.", "+16465550142", [line("vanilla-latte", 1, grande, oat), line("vanilla-latte", 1, grande)], {
    allergy_note: "Dairy (one guest)",
    requested_pickup_time: new Date(NOW + 25 * 60_000).toISOString(),
    call_id: "demo-call-1082",
  });
  const o2 = makeOrder(hex(0xb1083d), "pending_staff_review", 2, "Marcus T.", "+19175550121", [line("cold-brew", 1, grande), line("banana-bread", 1)], { call_id: "demo-call-1083" });
  const o3 = makeOrder(hex(0xc10849), "pending_staff_review", 8, "Elena M.", "+12125550163", [line("flat-white", 1, grande, oat), line("blueberry-muffin", 1, warmed)], { allergy_note: "Tree nuts" });
  const o4 = makeOrder(hex(0xd1085e), "pending_staff_review", 6, "Priya S.", "+13475550118", [line("chai-latte", 2, iced, grande), line("butter-croissant", 2)], {
    intake_mode: "after_hours_request",
    requested_pickup_time: in_(15),
    staff_review_deadline: in_(12),
  });
  const o5 = makeOrder(hex(0xe10871), "pos_entered", 14, "Jordan P.", "+17185550134", [line("caffe-latte", 2, grande)]);
  const o6 = makeOrder(hex(0xf10882), "pos_accepted", 25, "Tom R.", "+19295550150", [line("brewed-coffee", 1, venti), line("blueberry-muffin", 1)]);
  const o7 = makeOrder(hex(0x110893), "fulfilled", 70, "Anna K.", "+12125550177", [line("strawberry-acai", 2, grande), line("butter-croissant", 1), line("caffe-americano", 2)]);
  const o8 = makeOrder(hex(0x1208a4), "fulfilled", 190, "Luis G.", "+16465550109", [line("mango-dragonfruit", 1, venti), line("banana-bread", 1)]);
  const o9 = makeOrder(hex(0x1308b5), "rejected", 130, "Chris W.", "+19175550166", [line("banana-bread", 1)]);
  const o10 = makeOrder(hex(0x1408c6), "cancelled", 26 * 60, "Mei L.", "+13475550172", [line("cappuccino", 1, grande), line("blueberry-muffin", 1)]);
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
  addEvent(o9.id, "pending_staff_review", "rejected", "Out of banana bread today", 126, "staff");
  addEvent(o10.id, "caller_confirmed", "pending_staff_review", "sent_for_staff_review", 26 * 60);
  addEvent(o10.id, "pending_staff_review", "cancelled", "Guest asked to cancel", 26 * 60 - 5, "staff");

  addCall("1082", 6, 118, "+16465550142", "order", "Ordered two grande vanilla lattes (one with oat milk) for pickup.", { caller_name: "Sarah L.", allergies: "Dairy (one guest)" });
  addCall("1083", 4, 74, "+19175550121", "order", "Ordered a grande cold brew and a banana bread.", { caller_name: "Marcus T." });
  addCall("cater", 12, 95, "+19175550187", "catering", "Planning an office meeting for about 30 people next Thursday and wants a quote for a big coffee order. Details passed to the manager.", { caller_name: "Dave K.", needs_follow_up: true });
  addCall("complaint", 22, 88, "+16465550133", "complaint", "Ordered an oat milk latte this morning and got whole milk. Wants a manager to follow up.", { caller_name: "Rachel M.", needs_follow_up: true, sentiment: "negative" });
  addCall("esc", 40, 150, "+17185550190", "other", "Brio couldn't finish this call. The caller asked about a large order and hung up before giving details.", { needs_follow_up: true, sentiment: "neutral", ended_by: "caller" });
  addCall("spam", 18, 2, "+18005550101", "spam", "Automated business-loan sales call. Dropped in 2 seconds.", { sentiment: "neutral", ended_by: "agent" });
  addCall("spam2", 95, 2, "+18005550144", "spam", "Automated linen-service pitch. Dropped in 2 seconds.", { sentiment: "neutral", ended_by: "agent" });
  addCall("menu", 55, 41, "+12125550115", "menu_question", "Asked whether the banana bread has nuts. Brio said it contains walnuts and asked the caller to double-check with the staff.", { allergies: "Tree nuts" });
  addCall("hours", 110, 22, "+17185550120", "general_question", "Asked the hours for tonight and whether the Wi-Fi is free.");
  addCall("lost", 200, 63, "+12125550163", "lost_and_found", "Left a black umbrella at the corner table this morning. Wants a call back.", { caller_name: "Elena M.", needs_follow_up: true });
  addCall("job", 300, 49, "+13475550101", "job_inquiry", "Asked about barista openings and who to send a résumé to.");
  addCall("wrong", 380, 6, "+19295550111", "wrong_number", "Wrong number.", { sentiment: "neutral" });
  addCall("old1", 26 * 60, 130, "+16465550188", "order", "Ordered a cappuccino and a blueberry muffin.", { caller_name: "Mei L." });
  addCall("old2", 28 * 60, 97, "+12125550155", "menu_question", "Asked whether oat milk costs extra and whether there is a rewards card.", { caller_name: "Helen P." });
  addCall("old3", 30 * 60, 3, "+18005550166", "spam", "Robocall. Dropped.", { sentiment: "neutral", ended_by: "agent" });

  request("r1", "callback", "pending_staff_review", 12, "Dave K.", "+19175550187", {
    topic: "catering",
    note: "Office meeting for about 30 people next Thursday. Wants a quote for a big coffee order.",
    call_id: "demo-call-cater",
  });
  request("r2", "callback", "pending_staff_review", 50, "Sam Lee", "+13475550102", { topic: "general", note: "Asked whether the shop can host a small book club on Sunday mornings." });
  request("r3", "callback", "called_back", 24 * 60, "Helen P.", "+12125550155", { topic: "general", note: "Asked about a rewards card for regulars." });
  request("m1", "callback", "pending_staff_review", 22, "Rachel M.", "+16465550133", {
    topic: "complaint",
    note: "Ordered an oat milk latte this morning and got whole milk. Would like a manager to follow up.",
    call_id: "demo-call-complaint",
  });
  request("m2", "callback", "pending_staff_review", 75, "Julia R.", "+19175550140", { topic: "catering", note: "Wants a quote for a coffee cart at a wedding next month." });
  request("m3", "callback", "pending_staff_review", 200, "Elena M.", "+12125550163", { topic: "lost_and_found", note: "Left a black umbrella at the corner table this morning.", call_id: "demo-call-lost" });
  request("m4", "callback", "pending_staff_review", 300, "Alex D.", "+13475550101", { topic: "job_inquiry", note: "Interested in barista openings. Has three years of experience." });
  request("m5", "callback", "pending_staff_review", 340, "Bean Supply Co.", "+18005550177", { topic: "sales", note: "Offering wholesale coffee bean pricing." });
  request("m6", "callback", "called_back", 24 * 60 + 30, "Peter N.", "+17185550162", { topic: "general", note: "Asked whether the shop hosts private events." });
}

// Shortly after the example opens, a new order arrives, so visitors see it live.
function scheduleLiveOrder() {
  if (liveOrderTimer) return;
  liveOrderTimer = setTimeout(() => {
    const id = "a0b1c2-0000-4000-8000-000000000000";
    orders.push(
      makeOrder(id, "pending_staff_review", 0, "Olivia B.", "+17185550177", [line("pineapple-passionfruit", 1, grande), line("butter-croissant", 1)], {
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
