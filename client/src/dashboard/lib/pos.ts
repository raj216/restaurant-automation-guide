// Where a restaurant's kitchen gets orders (a POS, or our own Kitchen screen on a tablet):
// when "Send to kitchen" is offered, what each order's kitchen status says, and the red
// banner when that link is broken. Staff see one button and the same words whatever the
// kitchen uses. Wording rule: nothing says "accepted" before the kitchen has it.

import { gotItReminder, screenOnline } from "./kitchen";
import type { KitchenScreen, Order, OrderState, PosConnection, PosJob, PosProvider } from "./types";

export const SEND_FAILED_NOTE = "Didn't reach the POS, enter it by hand";
export const CANCEL_FAILED_NOTE = "Couldn't cancel it in the POS: cancel it in the POS by hand";

export const PROVIDER_NAME: Record<PosProvider, string> = {
  fake: "Test POS",
  clover: "Clover",
  toast: "Toast",
  kitchen_screen: "Kitchen screen",
};

export function posJobFor(order: Pick<Order, "id">, jobs: PosJob[] | undefined): PosJob | undefined {
  return jobs?.find(j => j.order_id === order.id);
}

/**
 * "Send to POS" shows only for an order waiting for review, at a restaurant with a working POS link.
 * After a failure it can be tapped again; if the POS already has it ("sent") a tap just finishes the
 * move to In POS (the server never makes a second ticket).
 */
export function canSendToPos(state: OrderState, pos: PosConnection | null | undefined, job: PosJob | undefined): boolean {
  if (state !== "pending_staff_review" || pos?.status !== "connected") return false;
  return !job || job.status === "failed" || job.status === "sending" || job.status === "sent";
}

export interface PosLine {
  tone: "blue" | "red" | "gray" | "amber";
  text: string;
  detail?: string;
}

/** One order's kitchen status, for its card and its panel. `state` and `now` add the Got-it reminder. */
export function posStatusLine(job: PosJob | undefined, provider: PosProvider | undefined, state?: OrderState, now?: Date): PosLine | null {
  if (!job) return null;
  const screen = provider === "kitchen_screen";
  const name = provider ? PROVIDER_NAME[provider] : "POS";
  const ref = job.external_order_id && !screen ? ` · ${name} #${job.external_order_id}` : "";
  switch (job.status) {
    case "sending":
      return { tone: "amber", text: screen ? "Sending to the kitchen…" : `Sending to ${name}…` };
    case "sent": {
      const reminder = state && now ? gotItReminder(state, job, now) : null;
      if (reminder) return { tone: "amber", text: reminder, detail: "Check the kitchen tablet." };
      return { tone: "blue", text: screen ? "On the kitchen screen" : `Sent to ${name}${ref}` };
    }
    case "failed":
      return { tone: "red", text: SEND_FAILED_NOTE, detail: cleanError(job.last_error) };
    case "cancel_pending":
      return { tone: "amber", text: `Cancelling in ${name}…` };
    case "cancelled":
      if (screen) return { tone: "gray", text: "Shown as CANCELLED on the kitchen screen" };
      return { tone: "gray", text: job.external_order_id ? `Cancelled in ${name}${ref}` : `Nothing to cancel in ${name}` };
    case "cancel_failed":
      return { tone: "red", text: CANCEL_FAILED_NOTE, detail: cleanError(job.last_error) };
    default:
      return null;
  }
}

/** The red banner shown on every screen, or null when all is well. */
export function posBanner(
  pos: PosConnection | null | undefined,
  jobs: PosJob[] | undefined,
  screens?: KitchenScreen[],
  now: Date = new Date(),
): string | null {
  if (!pos) return null;
  const stuck = (jobs ?? []).filter(j => j.status === "cancel_failed").length;
  const parts: string[] = [];
  if (pos.provider === "kitchen_screen") {
    if (pos.status !== "disconnected" && (pos.status === "broken" || !screenOnline(screens, now))) {
      parts.push("No kitchen screen is on. New orders stay in Needs review: turn on the kitchen tablet, or tell the kitchen yourself.");
    }
  } else if (pos.status === "broken") {
    parts.push(`The ${PROVIDER_NAME[pos.provider]} connection is broken. New orders stay in Needs review: enter them in the POS by hand.`);
  }
  if (stuck > 0) parts.push(`${stuck} cancelled order${stuck === 1 ? "" : "s"} couldn't be cancelled in the POS: cancel ${stuck === 1 ? "it" : "them"} there by hand.`);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** "unreachable: fake POS is down" -> "The POS didn't answer". Short and plain for staff. */
export function cleanError(error: string | null | undefined): string | undefined {
  if (!error) return undefined;
  const code = error.split(":")[0];
  const plain: Record<string, string> = {
    unreachable: "The POS didn't answer.",
    auth_failed: "The POS login was removed or expired. An owner needs to reconnect it.",
    item_missing: "An item on this order isn't in the POS.",
    price_mismatch: "A price is different in the POS. Update the menu.",
    rejected: "The POS refused this order.",
    not_configured: "This POS isn't set up yet.",
  };
  if (/kitchen screen/.test(error)) return "No kitchen tablet is on.";
  return plain[code] ?? "Something went wrong with the POS.";
}

/** The reply's words for a toast after "Send to POS". */
export function sendResultMessage(reply: { ok: boolean; body: { status?: string; error?: string; note?: string } }): { text: string; tone?: "warn" } {
  if (reply.ok && (reply.body.status === "sent" || reply.body.status === "already_sent")) return { text: "Sent to the kitchen." };
  if (reply.body.status === "in_progress") return { text: "Already sending. One moment…" };
  if (reply.body.status === "cancelled_meanwhile") return { text: "This order was cancelled, so it was voided in the POS.", tone: "warn" };
  if (reply.body.error === "signed_out") return { text: "You're signed out. Sign in again, then enter the order by hand if needed.", tone: "warn" };
  return { text: reply.body.note ?? SEND_FAILED_NOTE, tone: "warn" };
}
