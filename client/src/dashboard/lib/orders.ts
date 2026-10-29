// Order statuses, what staff may do next, and which orders count as "reached the restaurant".

import type { Order, OrderEvent, OrderState } from "./types";

export type PillTone = "amber" | "blue" | "green" | "gray" | "red" | "purple";
export type IconName =
  | "clock"
  | "clipboard"
  | "check"
  | "x"
  | "user";

export interface StatusStyle {
  label: string;
  tone: PillTone;
  icon: IconName;
}

/**
 * One word per step, read left to right: To check → In the kitchen → Picked up.
 * "Sent" / "Kitchen has it" is shown next to "In the kitchen" (kitchenStep in today.ts).
 * Rejected and cancelled both read "Cancelled"; who and why are shown under it.
 * Nothing says "accepted" before the kitchen has it.
 */
export const ORDER_STATUS: Partial<Record<OrderState, StatusStyle>> = {
  pending_staff_review: { label: "To check", tone: "amber", icon: "clock" },
  pos_entered: { label: "In the kitchen", tone: "blue", icon: "clipboard" },
  pos_accepted: { label: "In the kitchen", tone: "blue", icon: "check" },
  fulfilled: { label: "Picked up", tone: "gray", icon: "check" },
  rejected: { label: "Cancelled", tone: "gray", icon: "x" },
  cancelled: { label: "Cancelled", tone: "gray", icon: "x" },
  escalated: { label: "Call the guest", tone: "purple", icon: "user" },
};

export function statusOf(state: OrderState): StatusStyle {
  return ORDER_STATUS[state] ?? { label: "Draft", tone: "gray", icon: "clock" };
}

export interface OrderAction {
  to: OrderState;
  label: string;
  /** What gets saved as the reason, or null when staff type their own. */
  reason: string | null;
  kind: "forward" | "reject" | "cancel";
}

/** What staff and owners may do from each state. Final states have no actions. */
export function actionsFor(state: OrderState): OrderAction[] {
  switch (state) {
    case "pending_staff_review":
      return [
        { to: "pos_entered", label: "Entered in POS", reason: "staff_entered_in_pos", kind: "forward" },
        { to: "rejected", label: "Reject", reason: null, kind: "reject" },
        { to: "cancelled", label: "Cancel", reason: null, kind: "cancel" },
      ];
    case "pos_entered":
      return [
        { to: "pos_accepted", label: "Kitchen has it", reason: "staff_accepted_in_pos", kind: "forward" },
        { to: "rejected", label: "Reject", reason: null, kind: "reject" },
        { to: "cancelled", label: "Cancel", reason: null, kind: "cancel" },
      ];
    case "pos_accepted":
      return [
        { to: "fulfilled", label: "Picked up", reason: "picked_up", kind: "forward" },
        { to: "cancelled", label: "Cancel", reason: null, kind: "cancel" },
      ];
    default:
      return [];
  }
}

/** Needs a person, or an order that is still waiting: shown on the live board. */
export function needsReview(order: Order): boolean {
  return order.state === "pending_staff_review";
}

const TWO_HOURS = 2 * 60 * 60 * 1000;

/** Escalated orders from the last 2 hours show on the live board. */
export function recentEscalated(order: Order, now: Date): boolean {
  return order.state === "escalated" && now.getTime() - new Date(order.created_at).getTime() <= TWO_HOURS;
}

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

/**
 * Orders staff are working on (entered in the POS, or accepted) from the last 12 hours,
 * one shift: they stay on the live board until they're picked up. Older unfinished
 * ones stay under Orders → In progress.
 */
export function recentInProgress(order: Order, now: Date): boolean {
  return (order.state === "pos_entered" || order.state === "pos_accepted") && now.getTime() - new Date(order.created_at).getTime() <= TWELVE_HOURS;
}

export type OrderTab = "all" | "to_check" | "in_kitchen" | "picked_up" | "cancelled";

/** The Orders page (history) filters. Same words as the steps. */
export const ORDER_TABS: { id: OrderTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "to_check", label: "To check" },
  { id: "in_kitchen", label: "In the kitchen" },
  { id: "picked_up", label: "Picked up" },
  { id: "cancelled", label: "Cancelled" },
];

export function inTab(order: Order, tab: OrderTab): boolean {
  switch (tab) {
    case "to_check":
      return order.state === "pending_staff_review";
    case "in_kitchen":
      return order.state === "pos_entered" || order.state === "pos_accepted";
    case "picked_up":
      return order.state === "fulfilled";
    case "cancelled":
      return order.state === "rejected" || order.state === "cancelled";
    default:
      return true;
  }
}

/**
 * An order reached the restaurant only if it was ever sent for staff review.
 * Brio's own drafts, changed or unconfirmed versions and mid-call corrections never
 * were, so they stay out of the lists and the numbers.
 */
export function reachedRestaurant(order: Order, events: Pick<OrderEvent, "order_id" | "to_state">[]): boolean {
  return events.some(e => e.order_id === order.id && e.to_state === "pending_staff_review");
}

/** Orders that count toward the order value: not rejected, not cancelled. */
export function countsTowardValue(order: Order): boolean {
  return order.state !== "rejected" && order.state !== "cancelled" && order.state !== "escalated";
}

/** Who made a change, in the words staff use. Names aren't stored, so staff are just "Staff". */
export function actorLabel(event: Pick<OrderEvent, "actor_kind" | "actor_user_id">, currentUserId: string | undefined): string {
  if (event.actor_kind === "agent") return "Brio";
  if (event.actor_kind === "pos_integration") return "Auto-send";
  if (event.actor_user_id && event.actor_user_id === currentUserId) return "You";
  return "Staff";
}

/** Turns a reason code like "staff_entered_in_pos" into words. */
export function readableReason(reason: string): string {
  const text = reason.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function sortOldestFirst<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function sortNewestFirst<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/** How long an order has waited changes its color: amber after 3 minutes, red after 7. */
export function waitTone(minutes: number): "normal" | "amber" | "red" {
  if (minutes >= 7) return "red";
  if (minutes >= 3) return "amber";
  return "normal";
}

/** The card pulses once an order has waited more than 5 minutes. */
export function shouldPulse(minutes: number): boolean {
  return minutes > 5;
}
