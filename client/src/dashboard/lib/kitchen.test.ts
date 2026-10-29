import { describe, expect, it } from "vitest";
import { ageLabel, gotItReminder, kitchenBoard, kitchenLine, newScreenId, screenOnline } from "./kitchen";
import type { Order, PosJob } from "./types";

const NOW = new Date("2026-10-29T20:16:00Z");
const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60000).toISOString();

const order = (id: string, state: Order["state"], updatedMinsAgo = 1): Order => ({
  id,
  restaurant_id: "r1",
  state,
  created_at: minsAgo(20),
  updated_at: minsAgo(updatedMinsAgo),
  customer_name: "Marcus T.",
  customer_phone: "+19175550121",
  requested_pickup_time: null,
  intake_mode: "staffed",
  staff_review_deadline: null,
  payment_method: "pay_at_pickup",
  currency: "USD",
  subtotal_cents: 900,
  line_items: [{ name: "Cold Brew", quantity: 1, unit_price_cents: 525, line_total_cents: 525, modifiers: [{ option_name: "grande" }] }],
  allergy_note: null,
  call_id: null,
  menu_version: 1,
});
const job = (orderId: string, status: PosJob["status"], sentMinsAgo: number | null): PosJob => ({
  order_id: orderId,
  status,
  attempts: 1,
  last_error: null,
  external_order_id: sentMinsAgo === null ? null : `KDS-${orderId}`,
  sent_at: sentMinsAgo === null ? null : minsAgo(sentMinsAgo),
  updated_at: minsAgo(0),
});

describe("the Kitchen screen board", () => {
  it("puts sent orders in New and Got-it orders in Kitchen has it, oldest first", () => {
    const board = kitchenBoard(
      [order("a", "pos_entered"), order("b", "pos_entered"), order("c", "pos_accepted"), order("d", "pending_staff_review")],
      [job("a", "sent", 1), job("b", "sent", 4), job("c", "sent", 12)],
      NOW,
      new Set(),
    );
    expect(board.fresh.map(t => t.order.id)).toEqual(["b", "a"]);
    expect(board.cooking.map(t => t.order.id)).toEqual(["c"]);
    expect(board.cooking[0].late).toBe(true); // 12 min with the kitchen
    expect(board.fresh.some(t => t.order.id === "d")).toBe(false); // still in review: never on the kitchen screen
  });
  it("shows a cancelled order that reached the kitchen until the cook dismisses it", () => {
    const orders = [order("x", "cancelled", 2), order("y", "cancelled", 2), order("z", "cancelled", 45)];
    const jobs = [job("x", "cancelled", 5), job("z", "cancelled", 50)];
    expect(kitchenBoard(orders, jobs, NOW, new Set()).cancelled.map(t => t.order.id)).toEqual(["x"]); // y never reached it, z is old
    expect(kitchenBoard(orders, jobs, NOW, new Set(["x"])).cancelled).toEqual([]);
  });
  it("Done hides an order on this tablet only", () => {
    const board = kitchenBoard([order("c", "pos_accepted")], [job("c", "sent", 3)], NOW, new Set(["c"]));
    expect(board.cooking).toEqual([]);
  });
});

describe("kitchen helpers", () => {
  it("reads lines like a cook", () => {
    expect(kitchenLine(order("a", "pos_entered").line_items[0])).toEqual({ quantity: 1, name: "Cold Brew", choices: "grande" });
    expect(ageLabel(0)).toBe("just now");
    expect(ageLabel(7)).toBe("7 min");
  });
  it("a tablet counts as on for 5 minutes after it checks in", () => {
    expect(screenOnline([{ last_seen_at: minsAgo(4) }], NOW)).toBe(true);
    expect(screenOnline([{ last_seen_at: minsAgo(6) }], NOW)).toBe(false);
    expect(screenOnline(undefined, NOW)).toBe(false);
  });
  it("reminds the counter when the kitchen hasn't tapped Got it after 2 minutes", () => {
    expect(gotItReminder("pos_entered", job("a", "sent", 1), NOW)).toBeNull();
    expect(gotItReminder("pos_entered", job("a", "sent", 3), NOW)).toBe("Kitchen hasn't tapped Got it · 3 min");
    expect(gotItReminder("pos_accepted", job("a", "sent", 9), NOW)).toBeNull();
  });
  it("makes tablet ids the server accepts", () => {
    expect(newScreenId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });
});
