import { describe, expect, it } from "vitest";
import { payLine, payMessage, payStage, paymentFor, smsHref } from "./payFirst";
import { kitchenTicket, testOrder } from "./ticket";
import type { OrderPayment } from "./types";

const pay = (over: Partial<OrderPayment> = {}): OrderPayment => ({ order_id: "o1", link_sent_at: null, paid_at: null, paid_how: null, ...over });
const t = (iso: string) => iso.slice(11, 16);

describe("pay first", () => {
  it("only pay-link orders have a payment step: send link, waiting, paid", () => {
    expect(payStage({ payment_method: "pay_at_pickup" }, undefined)).toBe("none");
    expect(payStage({ payment_method: "payment_link" }, undefined)).toBe("send_link");
    expect(payStage({ payment_method: "payment_link" }, pay({ link_sent_at: "2026-10-30T20:01:00Z" }))).toBe("waiting");
    expect(payStage({ payment_method: "payment_link" }, pay({ link_sent_at: "2026-10-30T20:01:00Z", paid_at: "2026-10-30T20:05:00Z", paid_how: "link" }))).toBe("paid");
    expect(paymentFor({ id: "o1" }, [pay()])?.order_id).toBe("o1");
    expect(paymentFor({ id: "o2" }, [pay()])).toBeUndefined();
  });
  it("says where the payment is, in plain words", () => {
    expect(payLine("none", undefined, t)).toBeNull();
    expect(payLine("send_link", undefined, t)).toBe("Pay first: text the guest the pay link");
    expect(payLine("waiting", pay({ link_sent_at: "2026-10-30T20:01:00Z" }), t)).toBe("Pay link texted 20:01 · waiting for payment");
    expect(payLine("paid", pay({ paid_at: "2026-10-30T20:05:00Z", paid_how: "in_person" }), t)).toBe("Paid in person · 20:05");
  });
  it("writes a short, honest text with the restaurant's own link", () => {
    const body = payMessage({
      order: { id: "c1084900-0000-4000-8000-000000000000", customer_name: "Elena M.", subtotal_cents: 21240, currency: "USD" },
      restaurantName: "Demo Coffee House",
      link: "https://square.link/u/AbCd",
    });
    expect(body).toBe("Hi Elena, it's Demo Coffee House. To confirm your order #C10849 ($212.40 before tax), please pay here: https://square.link/u/AbCd We'll start it as soon as it's paid.");
    expect(smsHref("+1 (917) 555-0148", "hi & bye")).toBe("sms:+19175550148?&body=hi%20%26%20bye");
  });
  it("the kitchen ticket says PAID only when a person marked it paid", () => {
    const order = { ...testOrder("r1"), payment_method: "payment_link" as const };
    const opts = { kind: "kitchen" as const, tz: "America/New_York", now: new Date("2026-10-30T20:10:00Z") };
    expect(kitchenTicket(order, { ...opts, payment: pay({ paid_at: "2026-10-30T20:05:00Z", paid_how: "link" }) }).payment).toBe("PAID · by link");
    expect(kitchenTicket(order, { ...opts, payment: pay({ paid_at: "2026-10-30T20:05:00Z", paid_how: "in_person" }) }).payment).toBe("PAID · in person");
    expect(kitchenTicket(order, { ...opts, payment: undefined }).payment).toBe("NOT PAID · pay link not paid yet");
    expect(kitchenTicket({ ...order, payment_method: "pay_at_pickup" }, opts).payment).toBe("NOT PAID · pay at pickup");
  });
});
