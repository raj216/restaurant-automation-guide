import { describe, expect, it } from "vitest";
import { kitchenTicket, testOrder } from "./ticket";
import type { Order } from "./types";

const NOW = new Date("2026-10-29T00:14:00Z"); // 8:14 PM in New York
const order = (over: Partial<Order> = {}): Order => ({
  ...testOrder("r1"),
  id: "c1084900-0000-4000-8000-000000000000",
  state: "pos_entered",
  customer_name: "Elena M.",
  customer_phone: "+19175550148",
  allergy_note: "tree nuts",
  line_items: [{ name: "Flat White", quantity: 1, unit_price_cents: 555, line_total_cents: 555, modifiers: [{ option_name: "grande" }, { option_name: "oat milk" }] }],
  ...over,
});

describe("the kitchen ticket", () => {
  it("puts the allergy on top, the items with their choices, the guest, and NOT PAID", () => {
    const t = kitchenTicket(order(), { kind: "kitchen", tz: "America/New_York", now: NOW });
    expect(t.banner).toBeNull();
    expect(t.allergy).toBe("ALLERGY: TREE NUTS");
    expect(t.lines).toEqual([{ quantity: 1, name: "Flat White", choices: ["grande", "oat milk"] }]);
    expect(t.guest).toBe("Elena M.");
    expect(t.phone).toBe("(917) 555-0148");
    expect(t.payment).toBe("NOT PAID · pay at pickup");
    expect(t.source).toBe("Phone order · Brio");
    expect(t.time).toBe("8:14 PM");
    expect(t.pickup).toBe("PICKUP ASAP");
  });
  it("marks every extra copy REPRINT, and the printer check TEST TICKET", () => {
    expect(kitchenTicket(order(), { kind: "reprint", tz: "America/New_York", now: NOW }).banner).toBe("REPRINT");
    expect(kitchenTicket(testOrder("r1"), { kind: "test", tz: "America/New_York", now: NOW }).banner).toBe("TEST TICKET");
  });
  it("is never made for an order that is still being checked", () => {
    expect(() => kitchenTicket(order({ state: "pending_staff_review" }), { kind: "kitchen", tz: "America/New_York", now: NOW })).toThrow(/in the kitchen/);
    expect(() => kitchenTicket(order({ state: "cancelled" }), { kind: "reprint", tz: "America/New_York", now: NOW })).toThrow();
  });
  it("leaves out the allergy line when there is none", () => {
    expect(kitchenTicket(order({ allergy_note: null }), { kind: "kitchen", tz: "America/New_York", now: NOW }).allergy).toBeNull();
  });
});
