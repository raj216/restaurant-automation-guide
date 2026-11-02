import { describe, expect, it } from "vitest";
import { dietFlag, dietWords, dishMarks, guestNeeds, lineChanges, lineTitle, markFromChanges, menuDiet, noteKind, spiceDots, visibleMarks } from "./dish";
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
    expect(dietFlag(latte, "vegan")).toBe("The menu doesn't say if it's vegan");
    expect(dietFlag(latte, "vegetarian")).toBeNull();
    expect(dietFlag(tikka, "vegetarian")).toBe("Not vegetarian: it's non-veg");
    expect(dietFlag(tikka, "celiac")).toBeNull();
    expect(dietFlag(latte, "vegan, gluten-free")).toBe("The menu doesn't say if it's vegan. The menu doesn't say if it's gluten-free");
    expect(dietFlag({ dietary_tags: undefined }, "vegan")).toBe("The menu doesn't say if it's vegan");
    // The menu's own words, frozen on the line: why it isn't, or what's still missing.
    expect(dietFlag({ dietary_tags: ["vegetarian"], diet_hints: { vegan: { because: "the caramel syrup has dairy" } } }, "vegan")).toBe("Not vegan: the caramel syrup has dairy");
    expect(dietFlag({ dietary_tags: ["vegetarian"], diet_hints: { vegan: { needs: ["no cream"] } } }, "vegan")).toBe("For vegan: no cream");
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
      flag: "NOT VEGETARIAN: IT'S NON-VEG",
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
  it("a coffee shop shows no marks; a restaurant with meat always shows them", () => {
    // A coffee shop: never a mark on a drink, diet or not (like a real POS ticket).
    expect(visibleMarks(latte, {})).toEqual([]);
    expect(visibleMarks(latte, { note: "vegan" })).toEqual([]);
    expect(visibleMarks({ dietary_tags: ["vegan", "vegetarian"] }, { note: "vegan" })).toEqual([]);
    expect(visibleMarks(tikka, { servesMeat: true })).toEqual(["non_veg", "gluten_free"]);
  });
  it("a mark the guest's choices earned says so", () => {
    const oatLatte = { dietary_tags: ["vegan", "vegetarian", "dairy_free"], diet_changes: { added: ["vegan", "dairy_free"], removed: [] } };
    expect(markFromChanges(oatLatte, "vegan")).toBe(true);
    expect(markFromChanges(latte, "veg")).toBe(false);
    expect(dietFlag(oatLatte, "vegan")).toBeNull();
    const t = kitchenTicket(order({ allergy_note: "vegan", line_items: [{ ...latte, ...oatLatte }] }), { kind: "kitchen", tz: "America/New_York", now: new Date(), servesMeat: true });
    expect(t.allergy).toBe("DIET: VEGAN");
    expect(t.lines[0]).toMatchObject({ marks: "[VEGAN WITH CHANGES]", flag: null });
  });
});

describe("the Menu page says the same, in plain words", () => {
  const milk = { key: "milk", name: "milk", options: ["oat", "almond", "soy", "coconut"].map(k => ({ key: `${k}_milk`, name: `${k} milk`, price_cents: 70 })) };
  const cream = { key: "cream", name: "cream", options: [{ key: "less_cream", name: "less cream", price_cents: 0 }, { key: "extra_cream", name: "extra cream", price_cents: 0 }, { key: "no_cream", name: "no cream", price_cents: 0 }] };
  const dish = (dietary_tags: string[], diet_rules: object[], groups = [milk, cream]) => ({ dietary_tags, diet_rules, required_modifiers: [], optional_modifiers: groups });
  it("a latte at a coffee shop: no Veg dot, just how to make it vegan", () => {
    const latte = dish(["vegetarian"], [{ adds: "vegan", when: [{ group: "milk", any: ["oat_milk", "almond_milk", "soy_milk", "coconut_milk"] }, { group: "cream", any: ["no_cream"] }] }]);
    expect(menuDiet(latte, {})).toEqual({ marks: [], dairyFree: false, lines: [{ ok: true, text: "Vegan with oat, almond, soy or coconut milk and no cream" }] });
    expect(menuDiet(latte, { servesMeat: true }).marks).toEqual(["veg"]);
  });
  it("black coffee: Vegan once, and what takes it away; the caramel latte says why not", () => {
    const coffee = dish(["vegan", "dairy_free"], [{ removes: "dairy_free", when: [{ group: "cream", any: ["less_cream", "extra_cream"] }] }], [cream]);
    expect(menuDiet(coffee, {})).toEqual({ marks: ["vegan"], dairyFree: false, lines: [{ ok: false, text: "Not vegan with less cream or extra cream" }] });
    expect(menuDiet(dish(["vegetarian"], [{ blocks: "vegan", because: "the caramel syrup has dairy" }]), {}).lines).toEqual([{ ok: false, text: "Not vegan: the caramel syrup has dairy" }]);
  });
});
