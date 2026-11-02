import { describe, expect, it } from "vitest";
import { dietFlag, dietWords, dishMarks, guestNeeds, lineChanges, lineTitle, markFromChanges, noteKind, spiceDots, visibleMarks } from "./dish";
import { kitchenTicket } from "./ticket";
import { whyItWaits } from "./today";
import type { LineItem, Order } from "./types";

const tikka: LineItem = {
  name: "Chicken Tikka Masala",
  quantity: 1,
  unit_price_cents: 1795,
  line_total_cents: 1795,
  dietary_tags: ["non_veg", "gluten_free"],
  modifiers: [
    { option_name: "hot", placement: "comma", kind: "spice", level: 3, levels: 4 },
    { option_name: "no cilantro", placement: "comma", kind: "no" },
  ],
};
const latte: LineItem = {
  name: "Caffè Latte",
  quantity: 2,
  unit_price_cents: 575,
  line_total_cents: 1150,
  dietary_tags: ["vegetarian"],
  modifiers: [
    { option_name: "grande", placement: "before" },
    { option_name: "oat milk", kind: "swap" },
    { option_name: "extra sugar", placement: "comma", kind: "extra" },
    { option_name: "light ice", placement: "comma", kind: "less" },
    { option_name: "warmed", placement: "comma" },
  ],
};

describe("dish marks", () => {
  it("come only from the menu's labels; vegan shows as the leaf alone", () => {
    expect(dishMarks(["vegan", "vegetarian", "dairy_free"])).toEqual(["vegan"]);
    expect(dishMarks(["vegetarian"])).toEqual(["veg"]);
    expect(dishMarks(["non_veg", "gluten_free"])).toEqual(["non_veg", "gluten_free"]);
    expect(dishMarks([])).toEqual([]);
    expect(dishMarks(undefined)).toEqual([]);
  });
});

describe("the guest's changes", () => {
  it("one row each, the word first and never twice; sizes stay in the name", () => {
    expect(lineTitle(latte)).toBe("grande Caffè Latte");
    expect(lineChanges(latte)).toEqual([
      { kind: "swap", text: "oat milk" },
      { kind: "extra", text: "sugar" },
      { kind: "less", text: "ice" },
      { kind: null, text: "warmed" },
    ]);
    expect(lineChanges(tikka)).toEqual([
      { kind: "spice", text: "hot", level: 3, levels: 4 },
      { kind: "no", text: "cilantro" },
    ]);
  });
  it("spice dots follow the restaurant's own scale; a bad level shows words only", () => {
    expect(spiceDots(lineChanges(tikka)[0])).toEqual([true, true, true, false]);
    const odd = lineChanges({ modifiers: [{ option_name: "hot", kind: "spice", level: 9, levels: 4 }] })[0];
    expect(odd).toEqual({ kind: "spice", text: "hot" });
    expect(spiceDots(odd)).toEqual([]);
  });
  it("older orders without kinds show their choices exactly as before", () => {
    expect(lineChanges({ modifiers: [{ option_name: "no whipped cream" }] })).toEqual([{ kind: null, text: "no whipped cream" }]);
  });
});

describe("the guest's diet", () => {
  it("is read from the allergy note by plain code", () => {
    expect(guestNeeds("vegan")).toEqual({ vegan: true, vegetarian: false, glutenFree: false });
    expect(guestNeeds("Gluten-free, celiac")).toEqual({ vegan: false, vegetarian: false, glutenFree: true });
    expect(dietWords("vegetarian, coeliac")).toBe("vegetarian and gluten-free");
    expect(dietWords("peanut allergy")).toBeNull();
    expect(dietWords("non-vegetarian")).toBeNull();
  });
  it("flags every dish the menu doesn't mark for it, and only those", () => {
    expect(dietFlag(latte, "vegan")).toBe("Not marked vegan on the menu");
    expect(dietFlag(latte, "vegetarian")).toBeNull();
    expect(dietFlag(tikka, "vegetarian")).toBe("Not marked vegetarian on the menu");
    expect(dietFlag(tikka, "celiac")).toBeNull();
    expect(dietFlag(latte, "vegan, gluten-free")).toBe("Not marked vegan or gluten-free on the menu");
    expect(dietFlag({ dietary_tags: undefined }, "vegan")).toBe("Not marked vegan on the menu");
    expect(dietFlag(latte, "peanut allergy")).toBeNull();
  });
});

const order = (patch: Partial<Order> = {}): Order => ({
  id: "0000000a-0000-4000-8000-000000000001",
  restaurant_id: "r",
  state: "pos_entered",
  created_at: "2026-11-02T18:00:00Z",
  updated_at: "2026-11-02T18:00:00Z",
  customer_name: "Dana",
  customer_phone: "+16305551122",
  requested_pickup_time: null,
  intake_mode: "staffed",
  staff_review_deadline: null,
  payment_method: "pay_at_pickup",
  currency: "USD",
  subtotal_cents: 2945,
  line_items: [tikka, latte],
  allergy_note: "vegetarian",
  call_id: null,
  menu_version: 1,
  ...patch,
});

describe("why it waits and the printed ticket", () => {
  it("a diet guest waits for a person to check every item", () => {
    expect(whyItWaits(order({ state: "pending_staff_review", allergy_note: "vegan" }))).toBe("vegan guest. A person checks every item.");
    expect(whyItWaits(order({ state: "pending_staff_review", allergy_note: "peanuts" }))).toMatch(/^allergy note/);
  });
  it("the receipt prints the marks and changes as words, the diet on top", () => {
    const t = kitchenTicket(order(), { kind: "kitchen", tz: "America/New_York", now: new Date("2026-11-02T18:05:00Z"), servesMeat: true });
    expect(t.allergy).toBe("DIET: VEGETARIAN");
    expect(t.lines[0]).toEqual({
      quantity: 1,
      name: "Chicken Tikka Masala",
      marks: "[NON-VEG] [GLUTEN-FREE]",
      choices: ["SPICE: HOT (3/4)", "NO cilantro"],
      flag: "NOT MARKED VEGETARIAN ON THE MENU",
    });
    expect(t.lines[1]).toMatchObject({ name: "grande Caffè Latte", marks: "[VEG]", choices: ["SWAP oat milk", "EXTRA sugar", "LESS ice", "warmed"], flag: null });
  });
});

describe("only what helps (owner decision 2026-11-02)", () => {
  it("red for allergies and celiac, calm green for a vegan or vegetarian guest", () => {
    expect(noteKind("vegan")).toBe("diet");
    expect(noteKind("Strictly vegetarian")).toBe("diet");
    expect(noteKind("gluten-free, celiac")).toBe("allergy");
    expect(noteKind("vegan, peanut allergy")).toBe("allergy");
    expect(noteKind("Tree nuts")).toBe("allergy");
    expect(noteKind(null)).toBeNull();
  });
  it("a coffee shop shows marks only for a guest's diet; a restaurant with meat always shows them", () => {
    expect(visibleMarks(latte, {})).toEqual([]);
    expect(visibleMarks(latte, { note: "Tree nuts" })).toEqual([]);
    expect(visibleMarks(latte, { note: "vegan" })).toEqual([]);
    expect(visibleMarks({ dietary_tags: ["vegan", "vegetarian"] }, { note: "vegan" })).toEqual(["vegan"]);
    expect(visibleMarks(latte, { note: "vegetarian" })).toEqual(["veg"]);
    expect(visibleMarks(tikka, { note: "celiac" })).toEqual(["gluten_free"]);
    expect(visibleMarks(tikka, { servesMeat: true })).toEqual(["non_veg", "gluten_free"]);
  });
  it("a mark the guest's choices earned says so", () => {
    const oatLatte = { dietary_tags: ["vegan", "vegetarian", "dairy_free"], diet_changes: { added: ["vegan", "dairy_free"], removed: [] } };
    expect(markFromChanges(oatLatte, "vegan")).toBe(true);
    expect(markFromChanges(latte, "veg")).toBe(false);
    expect(dietFlag(oatLatte, "vegan")).toBeNull();
    const t = kitchenTicket(order({ allergy_note: "vegan", line_items: [{ ...latte, ...oatLatte }] }), { kind: "kitchen", tz: "America/New_York", now: new Date() });
    expect(t.allergy).toBe("DIET: VEGAN");
    expect(t.lines[0]).toMatchObject({ marks: "[VEGAN WITH CHANGES]", flag: null });
  });
});
