// The kitchen ticket: what prints on the receipt printer when an order goes to the
// kitchen (CLAUDE.md rule 11, owner decision 2026-10-29). Allergy on top, items big,
// "NOT PAID" for pay at pickup, and REPRINT on every extra copy so a second copy is
// never taken for a second order. Only orders already in the kitchen get one.

import { CHANGE_WORD, MARK_LABEL, dietFlag, dietWords, dishMarks, lineChanges, lineTitle } from "./dish";
import { formatPhone, orderCode } from "./format";
import { formatTime } from "./time";
import type { Order, OrderPayment } from "./types";

export interface KitchenTicket {
  banner: "REPRINT" | "TEST TICKET" | null;
  code: string;
  time: string;
  pickup: string;
  allergy: string | null;
  /** marks: "[VEG] [GF]"; choices: "NO cream", "SPICE: HOT (3/4)"; flag: "NOT MARKED VEGAN". */
  lines: { quantity: number; name: string; marks: string; choices: string[]; flag: string | null }[];
  guest: string;
  phone: string;
  payment: string;
  source: string;
}

export const KITCHEN_STATES = ["pos_entered", "pos_accepted", "fulfilled"];

export function kitchenTicket(
  order: Order,
  { kind, tz, now, payment }: { kind: "kitchen" | "reprint" | "test"; tz: string; now: Date; payment?: OrderPayment },
): KitchenTicket {
  if (kind !== "test" && !KITCHEN_STATES.includes(order.state)) {
    throw new Error("Only an order in the kitchen gets a kitchen ticket");
  }
  return {
    banner: kind === "reprint" ? "REPRINT" : kind === "test" ? "TEST TICKET" : null,
    code: orderCode(order.id),
    time: formatTime(now, tz),
    pickup: order.requested_pickup_time ? `PICKUP ${formatTime(order.requested_pickup_time, tz)}` : "PICKUP ASAP",
    allergy: order.allergy_note ? `${dietWords(order.allergy_note) ? "ALLERGY / DIET" : "ALLERGY"}: ${order.allergy_note.toUpperCase()}` : null,
    // A receipt printer is black and white: the marks and change words are printed as words.
    lines: (Array.isArray(order.line_items) ? order.line_items : []).map(l => {
      const flag = dietFlag(l, order.allergy_note);
      return {
        quantity: l.quantity,
        name: lineTitle(l),
        marks: dishMarks(l.dietary_tags).map(m => `[${MARK_LABEL[m].toUpperCase()}]`).join(" "),
        choices: lineChanges(l).map(c =>
          c.kind === "spice"
            ? `SPICE: ${c.text.toUpperCase()}${c.level && c.levels ? ` (${c.level}/${c.levels})` : ""}`
            : c.kind
              ? `${CHANGE_WORD[c.kind]} ${c.text}`
              : c.text,
        ),
        flag: flag ? flag.toUpperCase() : null,
      };
    }),
    guest: order.customer_name ?? "Phone guest",
    phone: order.customer_phone ? formatPhone(order.customer_phone) : "",
    // PAID only when a person saw the payment (pay first add-on); otherwise the counter collects it.
    payment:
      order.payment_method !== "payment_link"
        ? "NOT PAID · pay at pickup"
        : payment?.paid_at
          ? `PAID · ${payment.paid_how === "in_person" ? "in person" : "by link"}`
          : "NOT PAID · pay link not paid yet",
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
