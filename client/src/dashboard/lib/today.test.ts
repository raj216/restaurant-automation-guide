import { describe, expect, it } from "vitest";
import { brioLine, callbackItems, kitchenStep, partyLine, ticketLine, whyItWaits } from "./today";
import { statusOf } from "./orders";
import type { GuestRequest, Order } from "./types";

const NOW = new Date("2026-10-29T20:16:00Z");
const ago = (m: number) => new Date(NOW.getTime() - m * 60000).toISOString();

const order = (over: Partial<Order> = {}): Order => ({
  id: "o1",
  restaurant_id: "r1",
  state: "pending_staff_review",
  created_at: ago(8),
  updated_at: ago(8),
  customer_name: "Elena M.",
  customer_phone: "+19175550148",
  requested_pickup_time: null,
  intake_mode: "staffed",
  staff_review_deadline: null,
  payment_method: "pay_at_pickup",
  currency: "USD",
  subtotal_cents: 980,
  line_items: [{ name: "Flat White", quantity: 1, unit_price_cents: 555, line_total_cents: 555 }],
  allergy_note: null,
  call_id: null,
  menu_version: 1,
  ...over,
});
const request = (over: Partial<GuestRequest> = {}): GuestRequest => ({
  id: "g1",
  restaurant_id: "r1",
  kind: "callback",
  status: "pending_staff_review",
  call_id: null,
  customer_name: "Rachel M.",
  customer_phone: "+16465550133",
  party_size: null,
  requested_time: null,
  note: "Wants a manager to call back.",
  topic: "complaint",
  allergy_note: null,
  created_at: ago(30),
  updated_at: ago(30),
  ...over,
});

describe("one word per step", () => {
  it("reads To check, In the kitchen, Picked up, Cancelled, Call the guest", () => {
    expect(statusOf("pending_staff_review").label).toBe("To check");
    expect(statusOf("pos_entered").label).toBe("In the kitchen");
    expect(statusOf("pos_accepted").label).toBe("In the kitchen");
    expect(statusOf("fulfilled").label).toBe("Picked up");
    expect(statusOf("rejected").label).toBe("Cancelled");
    expect(statusOf("cancelled").label).toBe("Cancelled");
    expect(statusOf("escalated").label).toBe("Call the guest");
    expect(kitchenStep("pos_entered")).toBe("Sent");
    expect(kitchenStep("pos_accepted")).toBe("Kitchen has it");
    expect(kitchenStep("fulfilled")).toBeNull();
  });
  it("never says accepted before the kitchen has it", () => {
    for (const s of ["pending_staff_review", "pos_entered"] as const) expect(statusOf(s).label.toLowerCase()).not.toContain("accept");
  });
});

describe("why an order waits", () => {
  it("names the real reason, allergy first", () => {
    expect(whyItWaits(order({ allergy_note: "tree nuts", intake_mode: "after_hours_request" }))).toMatch(/^allergy note/);
    expect(whyItWaits(order({ intake_mode: "after_hours_request" }))).toMatch(/^after-hours request/);
    expect(whyItWaits(order({ subtotal_cents: 15_001 }))).toMatch(/^big order/);
    expect(whyItWaits(order({ line_items: [{ name: "Latte", quantity: 21, unit_price_cents: 1, line_total_cents: 21 }] }))).toMatch(/^big order/);
    expect(whyItWaits(order({ payment_method: "payment_link" }))).toMatch(/^big order: the guest pays first/);
    expect(whyItWaits(order())).toBe("every order is checked by a person before the kitchen.");
  });
});

describe("one Call back list", () => {
  const partyText = (r: GuestRequest) => partyLine(r.party_size, r.requested_time ? "Sat 7:00 PM" : null);
  it("merges messages, table requests and unfinished calls, oldest first", () => {
    const items = callbackItems(
      [request(), request({ id: "g2", kind: "reservation", topic: null, note: null, customer_name: "Nina R.", party_size: 4, requested_time: ago(-600), created_at: ago(5) })],
      [order({ id: "o9", state: "escalated", customer_name: null, customer_phone: null, call_id: "c1", created_at: ago(50) })],
      [{ call_id: "c1", from_number: "+17185550190", caller_name: null }],
      { pendingOnly: true, now: NOW, partyText },
    );
    expect(items.map(i => [i.kind, i.tag])).toEqual([
      ["unfinished", "Couldn't finish"],
      ["message", "Complaint"],
      ["reservation", "Table request"],
    ]);
    expect(items[0].phone).toBe("+17185550190");
    expect(items[2].what).toBe("4 people · Sat 7:00 PM");
  });
  it("puts urgent ones first: cut-off calls and complaints before sales pitches", () => {
    const items = callbackItems(
      [request({ id: "s", topic: "sales", created_at: ago(300) }), request({ id: "j", topic: "job_inquiry", created_at: ago(200) }), request({ id: "c", topic: "complaint", created_at: ago(10) })],
      [],
      [],
      { pendingOnly: true, now: NOW, partyText },
    );
    expect(items.map(i => i.tag)).toEqual(["Complaint", "Job inquiry", "Sales"]);
  });
  it("leaves out handled requests, dismissed calls and unfinished calls older than 2 hours", () => {
    const items = callbackItems(
      [request({ status: "called_back" })],
      [order({ id: "a", state: "escalated", created_at: ago(10) }), order({ id: "b", state: "escalated", created_at: ago(200) })],
      [],
      { pendingOnly: true, dismissed: new Set(["a"]), now: NOW, partyText },
    );
    expect(items).toEqual([]);
    const all = callbackItems([request({ status: "called_back" })], [], [], { pendingOnly: false, now: NOW, partyText });
    expect(all.map(i => i.pending)).toEqual([false]);
  });
});

describe("Brio's one line", () => {
  const minutes = (o: Order) => Math.floor((NOW.getTime() - new Date(o.created_at).getTime()) / 60000);
  it("says what to do first, with the allergy", () => {
    expect(brioLine({ check: [order({ allergy_note: "tree nuts" }), order({ id: "o2" })], kitchenCount: 1, callbacks: [], minutesWaited: minutes })).toBe(
      "2 orders need you. Start with Elena M. (waiting 8 min, allergy: tree nuts).",
    );
    expect(brioLine({ check: [order({ created_at: ago(0) })], kitchenCount: 0, callbacks: [], minutesWaited: minutes })).toBe(
      "1 order needs you. Start with Elena M. (just came in).",
    );
  });
  it("then call-backs, then the kitchen, then all clear", () => {
    const cb = callbackItems([request()], [], [], { pendingOnly: true, now: NOW, partyText: () => "" });
    expect(brioLine({ check: [], kitchenCount: 2, callbacks: cb, minutesWaited: minutes })).toBe("Nothing to check. 1 guest to call back, starting with Rachel M.");
    expect(brioLine({ check: [], kitchenCount: 2, callbacks: [], minutesWaited: minutes })).toBe("All checked. 2 orders are in the kitchen.");
    expect(brioLine({ check: [], kitchenCount: 0, callbacks: [], minutesWaited: minutes })).toBe("All caught up. I'm answering the phone.");
  });
});

describe("auto-send and kitchen tickets on the card", () => {
  it("a simple order still waiting with auto-send on says the kitchen couldn't be reached", () => {
    expect(whyItWaits(order(), { autoSend: true })).toBe("auto-send couldn't reach the kitchen. Send it yourself.");
    expect(whyItWaits(order({ allergy_note: "nuts" }), { autoSend: true })).toMatch(/^allergy note/); // the real reason still wins
  });
  it("shows the latest ticket: printed, waiting, or didn't print (with how to fix it)", () => {
    const t = (iso: string) => iso.slice(11, 16);
    const job = (over: object) => ({ order_id: "o1", kind: "kitchen", status: "printed", printed_at: "2026-10-29T20:14:00Z", last_error: null, ...over });
    expect(ticketLine([], "o1", t)).toBeNull();
    expect(ticketLine([job({})], "o1", t)).toEqual({ text: "Ticket printed 20:14", bad: false });
    expect(ticketLine([job({ kind: "reprint" })], "o1", t)?.text).toBe("Ticket printed 20:14 (reprint)");
    expect(ticketLine([job({ status: "queued", printed_at: null })], "o1", t)?.text).toBe("Ticket waiting for the printer");
    expect(ticketLine([job({ status: "failed", printed_at: null, last_error: "out of paper" })], "o1", t)).toEqual({
      text: "Ticket didn't print: out of paper. Print it again from ⋯",
      bad: true,
    });
  });
});
