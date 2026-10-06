// Plain-language formatting for money, phone numbers, order codes and order items.

import type { LineItem, Order, OrderModifier } from "./types";

/** Money in the restaurant's currency. Prices are stored in cents. */
export function formatMoney(cents: number | null | undefined, currency = "USD"): string {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

/** "+16305551122" becomes "(630) 555-1122". Other numbers are shown with a "+". */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value.startsWith("+") ? value : `+${digits}`;
}

/** A link a phone or iPad can tap to call. */
export function telHref(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "#";
}

/** "#3F9A1C": the first 6 characters of the order id. Display only. */
export function orderCode(id: string): string {
  return `#${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

const GROUP_BY_PLACEMENT = (modifiers: OrderModifier[] | undefined, placement: "before" | "with" | "comma") =>
  (modifiers ?? []).filter(m => (m.placement ?? "with") === placement).map(m => m.option_name);

/**
 * An item as Brio read it back: choices with placement "before" go in front of the
 * name (sizes), "with" after the word "with", and "comma" after a comma.
 */
export function itemName(item: LineItem): string {
  const before = GROUP_BY_PLACEMENT(item.modifiers, "before");
  const withs = GROUP_BY_PLACEMENT(item.modifiers, "with");
  const commas = GROUP_BY_PLACEMENT(item.modifiers, "comma");
  let text = [...before, item.name].join(" ");
  if (withs.length) text += ` with ${withs.join(" and ")}`;
  if (commas.length) text += `, ${commas.join(", ")}`;
  return text;
}

/** "2 Rigatoni alla Vodka, 1 Tiramisu" */
export function orderSummary(order: Pick<Order, "line_items">): string {
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  if (items.length === 0) return "No items";
  return items.map(item => `${item.quantity} ${itemName(item)}`).join(", ");
}

export function customerLabel(order: Pick<Order, "customer_name" | "customer_phone">): string {
  return order.customer_name?.trim() || "No name given";
}

/** The name a caller gave, or their number. */
export function callerLabel(name: string | null | undefined, number: string | null | undefined): string {
  return name?.trim() || formatPhone(number) || "Unknown caller";
}

export function initials(email: string | undefined): string {
  const local = (email ?? "").split("@")[0] ?? "";
  const letters = local.replace(/[^a-zA-Z]/g, "");
  return (letters.slice(0, 2) || "ME").toUpperCase();
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The database refuses anything that looks like a card number in a reason. */
export function looksLikeCardNumber(text: string): boolean {
  return /(\d[ .-]?){12,18}\d/.test(text);
}
