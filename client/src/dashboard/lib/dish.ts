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

// Words that only describe a diet (same list as the server's dishMarks.js).
const DIET_ONLY_WORDS =
  /\b(vegan|vegetarian|veggie|plant[- ]based|gluten[- ]free|gluten|free|celiac|coeliac|disease|strict|strictly|diet|guest|guests|i'?m|i|am|we|are|is|one|all|of|us|the|a|only|and|need|needs|no)\b/gi;

/**
 * How the note is shown. "diet": only vegan or vegetarian, a calm green label. "allergy":
 * anything else, red, because someone could get sick: allergies, and gluten-free / celiac
 * (owner decision 2026-11-02). null: no note.
 */
export function noteKind(note: string | null | undefined): "allergy" | "diet" | null {
  if (!note?.trim()) return null;
  const n = guestNeeds(note);
  const onlyDiet = note.replace(DIET_ONLY_WORDS, "").replace(/[^a-z]/gi, "") === "";
  return (n.vegan || n.vegetarian) && !n.glutenFree && onlyDiet ? "diet" : "allergy";
}

/**
 * The marks worth showing on this line: at a restaurant that serves meat, all of them (veg /
 * non-veg matters on every order). At a coffee shop, none: like a real POS ticket, a drink is
 * its name and its changes, and a guest's diet is one note on top plus a plain-word line on
 * any item that doesn't fit (dietFlag).
 */
export function visibleMarks(item: Pick<LineItem, "dietary_tags">, { servesMeat }: { servesMeat?: boolean; note?: string | null }): DishMark[] {
  return servesMeat ? dishMarks(item.dietary_tags) : [];
}

/** True when this mark is there because of the guest's choices ("vegan with these changes"). */
export function markFromChanges(item: Pick<LineItem, "diet_changes">, mark: DishMark): boolean {
  const added = item.diet_changes?.added ?? [];
  return mark === "veg" ? added.includes("vegetarian") : added.includes(mark);
}

/** "vegan", "gluten-free", "vegan and gluten-free", or null when the note isn't about a diet. */
export function dietWords(note: string | null | undefined): string | null {
  const n = guestNeeds(note);
  const words = [n.vegan ? "vegan" : n.vegetarian ? "vegetarian" : null, n.glutenFree ? "gluten-free" : null].filter(Boolean);
  return words.length ? words.join(" and ") : null;
}

const DIET_WORD: Record<"vegan" | "vegetarian" | "gluten_free", string> = { vegan: "vegan", vegetarian: "vegetarian", gluten_free: "gluten-free" };

/**
 * For a guest with a diet: a plain-word line when this item doesn't fit, or null when it does.
 * The words come from the menu, frozen on the line when Brio took the order (diet_hints):
 *   "Not vegan: the caramel syrup has dairy"   the menu says why
 *   "For vegan: no cream"                      what the guest's choices are still missing
 *   "The menu doesn't say if it's vegan"       the restaurant gave us nothing about it
 */
export function dietFlag(item: Pick<LineItem, "dietary_tags" | "diet_hints">, note: string | null | undefined): string | null {
  const n = guestNeeds(note);
  const tags = Array.isArray(item.dietary_tags) ? item.dietary_tags : [];
  const unmet = (
    [
      n.vegan && !tags.includes("vegan") ? "vegan" : null,
      n.vegetarian && !tags.includes("vegetarian") && !tags.includes("vegan") ? "vegetarian" : null,
      n.glutenFree && !tags.includes("gluten_free") ? "gluten_free" : null,
    ] as const
  ).filter((t): t is "vegan" | "vegetarian" | "gluten_free" => t !== null);
  if (unmet.length === 0) return null;
  return unmet
    .map(tag => {
      const hint = item.diet_hints?.[tag];
      if (tag !== "gluten_free" && tags.includes("non_veg")) return `Not ${DIET_WORD[tag]}: it's non-veg`;
      if (hint?.because) return `Not ${DIET_WORD[tag]}: ${hint.because}`;
      if (hint?.needs?.length) return `For ${DIET_WORD[tag]}: ${hint.needs.join(" and ")}`;
      return `The menu doesn't say if it's ${DIET_WORD[tag]}`;
    })
    .join(". ");
}

/** Spice dots: [true, true, true, false] for level 3 of 4. */
export function spiceDots(change: Change): boolean[] {
  if (!change.level || !change.levels) return [];
  return Array.from({ length: Math.min(change.levels, 6) }, (_, i) => i < change.level!);
}
