// Dish marks and the guest's changes (owner decision 2026-11-02). Same rules as the
// server (phone-orders src/domain/dishMarks.js): a dish's marks come only from the
// restaurant's menu labels, copied onto the order line when Brio took it, and a guest's
// diet ("vegan", "gluten-free, celiac") is read from the allergy note by plain code.
// A dish with no mark says nothing: for a vegan guest it is flagged, never assumed.

import type { LineItem, OrderModifier } from "./types";

export type DishMark = "veg" | "non_veg" | "vegan" | "gluten_free";
export type ChangeKind = "no" | "add" | "extra" | "less" | "swap" | "spice";

export const MARK_LABEL: Record<DishMark, string> = { veg: "Veg", non_veg: "Non-veg", vegan: "Vegan", gluten_free: "Gluten-free" };
export const CHANGE_WORD: Record<ChangeKind, string> = { no: "NO", add: "ADD", extra: "EXTRA", less: "LESS", swap: "SWAP", spice: "SPICE" };
const KINDS = Object.keys(CHANGE_WORD) as ChangeKind[];

/** The menu's labels as marks. Vegan shows as the leaf alone (it is also veg). */
export function dishMarks(tags: readonly string[] | undefined): DishMark[] {
  const t = Array.isArray(tags) ? tags : [];
  const marks: DishMark[] = [];
  if (t.includes("vegan")) marks.push("vegan");
  else if (t.includes("vegetarian")) marks.push("veg");
  else if (t.includes("non_veg")) marks.push("non_veg");
  if (t.includes("gluten_free")) marks.push("gluten_free");
  return marks;
}

export interface Change {
  /** null: a plain choice (a size, "warmed"), shown as text without a word in front. */
  kind: ChangeKind | null;
  text: string;
  level?: number;
  levels?: number;
}

/** "no cream" with NO in front reads "NO cream", never "NO no cream". */
const LEAD_WORD = /^(no|without|hold the|hold|extra|more|less|light|add)\s+/i;

/** Every choice on a line except the ones read before the name (sizes, "iced"), one per row. */
export function lineChanges(item: Pick<LineItem, "modifiers">): Change[] {
  return (item.modifiers ?? [])
    .filter(m => m.placement !== "before")
    .map((m: OrderModifier) => {
      const kind = m.kind && KINDS.includes(m.kind) ? m.kind : null;
      if (kind === "spice") {
        const ok = Number.isInteger(m.level) && Number.isInteger(m.levels) && m.level! >= 1 && m.level! <= m.levels!;
        return { kind, text: m.option_name, ...(ok ? { level: m.level, levels: m.levels } : {}) };
      }
      const text = kind && kind !== "swap" && kind !== "add" ? m.option_name.replace(LEAD_WORD, "") || m.option_name : m.option_name;
      return { kind, text };
    });
}

/** The line's name with the choices read before it: "grande Caffè Latte". */
export function lineTitle(item: Pick<LineItem, "name" | "modifiers">): string {
  const before = (item.modifiers ?? []).filter(m => m.placement === "before").map(m => m.option_name);
  return [...before, item.name].join(" ");
}

export interface GuestNeeds {
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
}

/** What the allergy note says about the guest's diet. */
export function guestNeeds(note: string | null | undefined): GuestNeeds {
  const text = note ?? "";
  const vegan = /\bvegan\b/i.test(text);
  return {
    vegan,
    vegetarian: !vegan && /(?<!non[- ]?)\b(vegetarian|veggie)\b/i.test(text),
    glutenFree: /\b(gluten|celiac|coeliac)\b/i.test(text),
  };
}

/** "vegan", "gluten-free", "vegan and gluten-free", or null when the note isn't about a diet. */
export function dietWords(note: string | null | undefined): string | null {
  const n = guestNeeds(note);
  const words = [n.vegan ? "vegan" : n.vegetarian ? "vegetarian" : null, n.glutenFree ? "gluten-free" : null].filter(Boolean);
  return words.length ? words.join(" and ") : null;
}

/**
 * For a guest with a diet: what this dish is NOT marked as on the menu, or null when it
 * fits. "Not marked vegan on the menu. Ask the guest." Plain code, never a guess.
 */
export function dietFlag(item: Pick<LineItem, "dietary_tags">, note: string | null | undefined): string | null {
  const n = guestNeeds(note);
  const tags = Array.isArray(item.dietary_tags) ? item.dietary_tags : [];
  const missing = [
    n.vegan && !tags.includes("vegan") ? "vegan" : null,
    n.vegetarian && !tags.includes("vegetarian") && !tags.includes("vegan") ? "vegetarian" : null,
    n.glutenFree && !tags.includes("gluten_free") ? "gluten-free" : null,
  ].filter(Boolean);
  return missing.length ? `Not marked ${missing.join(" or ")} on the menu` : null;
}

/** Spice dots: [true, true, true, false] for level 3 of 4. */
export function spiceDots(change: Change): boolean[] {
  if (!change.level || !change.levels) return [];
  return Array.from({ length: Math.min(change.levels, 6) }, (_, i) => i < change.level!);
}
