// "Pay first" on the dashboard (an add-on CoHost switches on per restaurant). A big order
// waits in To check until it is paid through the restaurant's OWN payment link:
//   1. Text the pay link   (opens this device's Messages with the link written in)
//   2. Mark paid           (staff see the payment in their own payment app)
//   3. Send to kitchen     (as any order; the ticket says PAID)
// Brio never touches card details; a person confirms every payment.

import { formatMoney, orderCode } from "./format";
import type { Order, OrderPayment } from "./types";

export type PayStage = "none" | "send_link" | "waiting" | "paid";

export function paymentFor(order: Pick<Order, "id">, payments: OrderPayment[] | undefined): OrderPayment | undefined {
  return payments?.find(p => p.order_id === order.id);
}

/** Where a pay-first order is. "none" for every order paid at pickup. */
export function payStage(order: Pick<Order, "payment_method">, payment: OrderPayment | undefined): PayStage {
  if (order.payment_method !== "payment_link") return "none";
  if (payment?.paid_at) return "paid";
  if (payment?.link_sent_at) return "waiting";
  return "send_link";
}

/** The card's payment line. */
export function payLine(stage: PayStage, payment: OrderPayment | undefined, time: (iso: string) => string): string | null {
  switch (stage) {
    case "send_link":
      return "Pay first: text the guest the pay link";
    case "waiting":
      return `Pay link texted ${payment?.link_sent_at ? time(payment.link_sent_at) : ""} · waiting for payment`.replace("  ", " ");
    case "paid":
      return `Paid ${payment?.paid_how === "in_person" ? "in person" : "by link"}${payment?.paid_at ? ` · ${time(payment.paid_at)}` : ""}`;
    default:
      return null;
  }
}

/** The text message staff send. Plain, short, and says nothing is in the kitchen yet. */
export function payMessage({ order, restaurantName, link }: { order: Pick<Order, "id" | "customer_name" | "subtotal_cents" | "currency">; restaurantName: string; link: string }): string {
  const first = (order.customer_name ?? "").split(" ")[0];
  const hello = first ? `Hi ${first}, ` : "Hi, ";
  return `${hello}it's ${restaurantName}. To confirm your order ${orderCode(order.id)} (${formatMoney(order.subtotal_cents, order.currency)} before tax), please pay here: ${link} We'll start it as soon as it's paid.`;
}

/** Opens the device's Messages app with the text written in (works on iPhone, Android and Mac). */
export function smsHref(phone: string, body: string): string {
  return `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}`;
}
