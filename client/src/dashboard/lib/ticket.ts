// The kitchen ticket: what prints on the receipt printer when an order goes to the
// kitchen (CLAUDE.md rule 11, owner decision 2026-10-29). Allergy on top, items big,
// "NOT PAID" for pay at pickup, and REPRINT on every extra copy so a second copy is
// never taken for a second order. Only orders already in the kitchen get one.

import { formatPhone, orderCode } from "./format";
import { formatTime } from "./time";
import type { Order } from "./types";

export interface KitchenTicket {
  banner: "REPRINT" | "TEST TICKET" | null;
  code: string;
  time: string;
  pickup: string;
  allergy: string | null;
  lines: { quantity: number; name: string; choices: string[] }[];
  guest: string;
  phone: string;
  payment: string;
  source: string;
}

export const KITCHEN_STATES = ["pos_entered", "pos_accepted", "fulfilled"];

export function kitchenTicket(order: Order, { kind, tz, now }: { kind: "kitchen" | "reprint" | "test"; tz: string; now: Date }): KitchenTicket {
  if (kind !== "test" && !KITCHEN_STATES.includes(order.state)) {
    throw new Error("Only an order in the kitchen gets a kitchen ticket");
  }
  return {
    banner: kind === "reprint" ? "REPRINT" : kind === "test" ? "TEST TICKET" : null,
    code: orderCode(order.id),
    time: formatTime(now, tz),
    pickup: order.requested_pickup_time ? `PICKUP ${formatTime(order.requested_pickup_time, tz)}` : "PICKUP ASAP",
    allergy: order.allergy_note ? `ALLERGY: ${order.allergy_note.toUpperCase()}` : null,
    lines: (Array.isArray(order.line_items) ? order.line_items : []).map(l => ({
      quantity: l.quantity,
      name: l.name,
      choices: (l.modifiers ?? []).map(m => m.option_name),
    })),
    guest: order.customer_name ?? "Phone guest",
    phone: order.customer_phone ? formatPhone(order.customer_phone) : "",
    payment: order.payment_method === "payment_link" ? "PAID BY LINK: CHECK" : "NOT PAID · pay at pickup",
    source: "Phone order · Brio",
  };
}

/** A made-up order for "Print a test ticket", so owners can check the printer. */
export function testOrder(restaurantId: string): Order {
  const now = new Date().toISOString();
  return {
    id: "00000000-0000-4000-8000-000000000000",
    restaurant_id: restaurantId,
    state: "pos_entered",
    created_at: now,
    updated_at: now,
    customer_name: "Test ticket",
    customer_phone: null,
    requested_pickup_time: null,
    intake_mode: "staffed",
    staff_review_deadline: null,
    payment_method: "pay_at_pickup",
    currency: "USD",
    subtotal_cents: 0,
    line_items: [{ name: "Printer check", quantity: 1, unit_price_cents: 0, line_total_cents: 0, modifiers: [{ option_name: "if you can read this, it works" }] }],
    allergy_note: "example allergy line",
    call_id: null,
    menu_version: 1,
  };
}
