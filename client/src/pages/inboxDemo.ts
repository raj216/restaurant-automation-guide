import {
  InboxError,
  NEXT_STEP,
  STOP_STEPS,
  type CallRecord,
  type InboxBackend,
  type Order,
  type OrderEvent,
  type OrderState,
} from "@/lib/inbox";
import { RESTAURANT } from "@/site/content";

// Sample calls for /inbox?demo: the website's four dashboard examples and
// two more orders further along, so the Live Inbox can be seen without a
// staff login. Nothing here reaches the database.

const RESTAURANT_ID = "00000000-0000-4000-8000-000000000001";
const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60000).toISOString();
const minutesAhead = (m: number) =>
  new Date(Date.now() + m * 60000).toISOString();

function order(
  fields: Partial<Order> & Pick<Order, "id" | "state" | "created_at">
): Order {
  return {
    restaurant_id: RESTAURANT_ID,
    updated_at: fields.created_at,
    call_id: null,
    customer_name: null,
    customer_phone: null,
    requested_pickup_time: null,
    staff_review_deadline: null,
    intake_mode: "staffed",
    payment_method: "pay_at_pickup",
    line_items: [],
    subtotal_cents: null,
    currency: "USD",
    ...fields,
  };
}

function call(
  fields: Partial<CallRecord> & Pick<CallRecord, "call_id" | "started_at">
): CallRecord {
  return {
    restaurant_id: RESTAURANT_ID,
    created_at: fields.started_at ?? minutesAgo(1),
    call_type: "phone_call",
    from_number: null,
    duration_seconds: null,
    disconnection_reason: "user_hangup",
    kind: null,
    summary: null,
    transcript: null,
    in_voicemail: false,
    analysis: {},
    handled_at: null,
    staff_note: "",
    ...fields,
  };
}

function sampleData() {
  const orders: Order[] = [
    order({
      id: "a1f0c2d4-0000-4000-8000-000000001082",
      state: "pending_staff_review",
      created_at: minutesAgo(1),
      call_id: "demo_call_order",
      customer_name: "Sarah L.",
      customer_phone: "+16465550142",
      requested_pickup_time: minutesAhead(24),
      line_items: [
        {
          name: "Rigatoni alla Vodka",
          quantity: 1,
          modifiers: [
            {
              group_name: "pasta",
              option_name: "gluten-free penne",
              placement: "with",
              price_cents: 200,
            },
          ],
          line_total_cents: 2400,
        },
        {
          name: "Classic Rigatoni alla Vodka",
          quantity: 1,
          line_total_cents: 2200,
        },
        {
          name: "Arugula & Shaved Fennel Salad",
          quantity: 1,
          line_total_cents: 1400,
        },
      ],
      subtotal_cents: 6000,
    }),
    order({
      id: "b7e21c90-0000-4000-8000-000000001079",
      state: "pos_entered",
      created_at: minutesAgo(22),
      call_id: "demo_call_order_2",
      customer_name: "Marcus T.",
      customer_phone: "+17185550126",
      requested_pickup_time: minutesAhead(8),
      line_items: [
        {
          name: "Margherita Pizza",
          quantity: 2,
          modifiers: [
            {
              group_name: "size",
              option_name: "large",
              placement: "before",
              price_cents: 400,
            },
          ],
          line_total_cents: 4200,
        },
        {
          name: "Tiramisu",
          quantity: 1,
          line_total_cents: 1100,
        },
      ],
      subtotal_cents: 5300,
    }),
    order({
      id: "c3d9aa51-0000-4000-8000-000000001074",
      state: "fulfilled",
      created_at: minutesAgo(95),
      call_id: "demo_call_order_3",
      customer_name: "Priya S.",
      customer_phone: "+12015550148",
      line_items: [
        {
          name: "Chicken Parm Hero",
          quantity: 1,
          modifiers: [
            {
              group_name: "side",
              option_name: "side salad",
              placement: "with",
              price_cents: 0,
            },
          ],
          line_total_cents: 1800,
        },
      ],
      subtotal_cents: 1800,
    }),
  ];

  const calls: CallRecord[] = [
    call({
      call_id: "demo_call_order",
      started_at: minutesAgo(2),
      from_number: "+16465550142",
      duration_seconds: 48,
      kind: "order",
      summary:
        "Caller confirmed allergy: 1 GF penne substituted. Caller told estimated pickup is 25 minutes. SMS confirmation dispatched.",
    }),
    call({
      call_id: "demo_call_res",
      started_at: minutesAgo(4),
      from_number: "+19175550187",
      duration_seconds: 71,
      kind: "reservation",
      analysis: {
        caller_name: "Dave K.",
        party_size: 4,
        requested_time: "Tonight 8:00 PM",
        seating_preference: "Indoor / Quiet booth if possible",
        occasion: "Anniversary Dinner",
      },
      summary:
        "Brio informed caller that 8:00 PM is high volume, logged party size, and explained a 10-15 min greeting window upon arrival.",
    }),
    call({
      call_id: "demo_call_alert",
      started_at: minutesAgo(8),
      from_number: "+12125550163",
      duration_seconds: 56,
      kind: "alert",
      analysis: {
        caller_name: "Elena M.",
        topic: "Left sunglasses at booth #4",
        dined_at: "6:15 PM",
      },
      summary:
        "Guest states she left a pair of black prescription sunglasses at booth #4 during early dinner service. Requested host or manager check the booth.",
    }),
    call({
      call_id: "demo_call_spam",
      started_at: minutesAgo(12),
      duration_seconds: 2,
      kind: "spam",
      analysis: { spam_reason: "Working Capital Loan Offer" },
      summary:
        "Brio identified an automated sales pitch attempting to solicit linen services and small business loans. Call was terminated in 1.8 seconds. Your host desk phone never made a sound.",
    }),
    call({
      call_id: "demo_call_order_2",
      started_at: minutesAgo(23),
      from_number: "+17185550126",
      duration_seconds: 64,
      kind: "order",
      summary:
        "Caller ordered two large Margherita pizzas and a tiramisu for pickup in about 30 minutes.",
    }),
  ];
  return { orders, calls };
}

const WHO: Record<string, OrderEvent["actor_kind"]> = {
  agent: "agent",
  staff: "staff",
};

/** Sample data with the same moves as the real inbox (and the same rules). */
export function demoBackend(): InboxBackend {
  let { orders, calls } = sampleData();
  const history = new Map<string, OrderEvent[]>();
  let nextEvent = 1;
  const event = (
    o: Order,
    from: OrderState | null,
    to: OrderState,
    actor: string,
    reason: string,
    at: string
  ) => ({
    id: nextEvent++,
    order_id: o.id,
    from_state: from,
    to_state: to,
    actor_kind: WHO[actor],
    reason,
    created_at: at,
  });
  // How each sample order got where it is.
  for (const o of orders) {
    const start = Date.parse(o.created_at);
    const at = (s: number) => new Date(start + s * 1000).toISOString();
    const trail = [
      event(o, null, "draft", "agent", "order_created", at(0)),
      event(o, "draft", "validated", "agent", "menu_validation_passed", at(4)),
      event(
        o,
        "validated",
        "caller_confirmed",
        "agent",
        "caller_said_yes",
        at(21)
      ),
      event(
        o,
        "caller_confirmed",
        "pending_staff_review",
        "agent",
        "sent_to_staff",
        at(22)
      ),
    ];
    if (o.state === "pos_entered" || o.state === "fulfilled")
      trail.push(
        event(
          o,
          "pending_staff_review",
          "pos_entered",
          "staff",
          "staff_entered_in_pos",
          at(160)
        )
      );
    if (o.state === "fulfilled") {
      trail.push(
        event(
          o,
          "pos_entered",
          "pos_accepted",
          "staff",
          "staff_marked_accepted",
          at(200)
        )
      );
      trail.push(
        event(
          o,
          "pos_accepted",
          "fulfilled",
          "staff",
          "staff_marked_picked_up",
          at(1900)
        )
      );
    }
    history.set(o.id, trail);
  }

  const pause = () => new Promise(resolve => window.setTimeout(resolve, 250));

  return {
    restaurant: {
      id: RESTAURANT_ID,
      name: RESTAURANT,
      timezone: "America/New_York",
      currency: "USD",
    },
    role: "owner",
    async load() {
      return { orders: [...orders], calls: [...calls] };
    },
    async events(o) {
      return [...(history.get(o.id) ?? [])];
    },
    async move(o, to, reason) {
      await pause();
      const allowed =
        NEXT_STEP[o.state]?.to === to ||
        (STOP_STEPS[o.state] ?? []).includes(to as "rejected");
      const current = orders.find(x => x.id === o.id);
      if (!allowed || !current || current.state !== o.state)
        throw new InboxError(
          "This order was just changed somewhere else. The inbox has the latest now.",
          false,
          true
        );
      const moved = {
        ...current,
        state: to,
        updated_at: new Date().toISOString(),
      };
      orders = orders.map(x => (x.id === o.id ? moved : x));
      history
        .get(o.id)
        ?.push(event(o, o.state, to, "staff", reason, moved.updated_at));
      return moved;
    },
    async mark(c, { handled, note }) {
      await pause();
      const updated: CallRecord = {
        ...c,
        ...(handled !== undefined && {
          handled_at: handled ? new Date().toISOString() : null,
        }),
        ...(note !== undefined && { staff_note: note }),
      };
      calls = calls.map(x => (x.call_id === c.call_id ? updated : x));
      return updated;
    },
    async details(callId) {
      await pause();
      const c = calls.find(x => x.call_id === callId);
      return c
        ? {
            recording_url: null,
            summary: c.summary,
            transcript: null,
            duration_seconds: c.duration_seconds,
          }
        : null;
    },
  };
}
