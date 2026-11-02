// Dish marks and the guest's changes, drawn the same on the dashboard and the kitchen
// screen: a mark for the dish (shape + word, never colour alone), one row per change
// with its word first (NO / ADD / EXTRA / LESS / SWAP / SPICE), and a yellow flag where
// a dish isn't marked for the guest's diet. The rules live in lib/dish.ts.

import { CHANGE_WORD, MARK_LABEL, dietFlag, dishMarks, lineChanges, lineTitle, guestNeeds, markFromChanges, spiceDots, visibleMarks, type DishMark } from "./lib/dish";
import { formatMoney } from "./lib/format";
import type { LineItem, Order } from "./lib/types";

/** One mark: a dot (veg), a triangle (non-veg), a leaf (vegan), GF (gluten-free). */
export function MarkIcon({ mark, size = 18 }: { mark: DishMark; size?: number }) {
  const label = MARK_LABEL[mark];
  if (mark === "gluten_free") {
    return (
      <span className="d-mark d-mark-gf" role="img" aria-label={label} title={label} style={{ width: size, height: size }}>
        GF
      </span>
    );
  }
  const color = mark === "non_veg" ? "#8a3b12" : "#1f7a3a";
  return (
    <svg className="d-mark" role="img" aria-label={label} width={size} height={size} viewBox="0 0 18 18">
      <title>{label}</title>
      <rect x="1" y="1" width="16" height="16" rx="2" fill="#ffffff" stroke={color} strokeWidth="2" />
      {mark === "veg" ? <circle cx="9" cy="9" r="4.5" fill={color} /> : null}
      {mark === "non_veg" ? <polygon points="9,4 14,13 4,13" fill={color} /> : null}
      {mark === "vegan" ? (
        <>
          <path d="M4.5 13.5 C4.5 7.5 8.5 4.5 13.5 4.5 C13.5 9.5 10.5 13.5 4.5 13.5 Z" fill={color} />
          <path d="M4.5 13.5 L10 8" stroke="#ffffff" strokeWidth="1.4" fill="none" />
        </>
      ) : null}
    </svg>
  );
}

/** The dish's marks, or nothing when the menu gave none. */
export function DishMarks({ tags, size }: { tags: readonly string[] | undefined; size?: number }) {
  return <LineMarks item={{ dietary_tags: tags ? [...tags] : [] }} marks={dishMarks(tags)} size={size} />;
}

/** A line's marks; one the guest's choices earned ("vegan with oat milk") says "with changes". */
function LineMarks({ item, marks, size }: { item: Pick<LineItem, "dietary_tags" | "diet_changes">; marks: DishMark[]; size?: number }) {
  if (marks.length === 0) return null;
  const changed = marks.some(m => markFromChanges(item, m));
  return (
    <span className="d-marks">
      {changed ? <span className="d-marks-why">with changes</span> : null}
      {marks.map(m => (
        <MarkIcon key={m} mark={m} size={size} />
      ))}
    </span>
  );
}

/** The calm green label for a guest's diet ("Diet · vegan"). Allergies stay red (ui.tsx AllergyBadge). */
export function NoteBadge({ note, short }: { note: string; short?: boolean }) {
  return (
    <span className="d-diet">
      <MarkIcon mark={guestNeeds(note).vegan ? "vegan" : "veg"} size={15} />
      {short ? "Diet" : `Diet · ${note}`}
    </span>
  );
}

/** A mark with its word, for the menu list and legends. */
export function MarkChip({ mark }: { mark: DishMark }) {
  return (
    <span className={`d-markchip d-markchip-${mark}`}>
      <MarkIcon mark={mark} size={16} />
      {MARK_LABEL[mark]}
    </span>
  );
}

/** The guest's changes to one line, one per row, the word first. */
export function Changes({ item }: { item: LineItem }) {
  const changes = lineChanges(item);
  if (changes.length === 0) return null;
  return (
    <div className="d-chgs">
      {changes.map((c, i) => (
        <div className="d-chg" key={`${c.text}-${i}`}>
          {c.kind ? <span className={`d-chg-w d-chg-${c.kind}`}>{CHANGE_WORD[c.kind]}</span> : null}
          {c.kind === "spice" && spiceDots(c).length ? (
            <span className="d-dots" aria-hidden="true">
              {spiceDots(c).map((on, j) => (
                <span key={j} className={on ? "d-dot d-on" : "d-dot"} />
              ))}
            </span>
          ) : null}
          <span className={c.kind === "spice" ? "d-chg-t d-cap" : "d-chg-t"}>
            {c.text}
            {c.kind === "spice" && c.level && c.levels ? <span className="d-vh">, level {c.level} of {c.levels}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Yellow: this dish isn't marked for the guest's diet. */
export function DietFlag({ text, kitchen }: { text: string; kitchen?: boolean }) {
  return (
    <div className="d-dietflag" role="note">
      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 L22 20 H2 Z" />
        <path d="M12 10 V14" />
        <path d="M12 17.5 V17.6" />
      </svg>
      {kitchen ? text.toUpperCase() : text}
    </div>
  );
}

/**
 * An order's lines: quantity, name, marks, then changes and any diet flag. `prices` adds
 * the line totals (order details); `kitchen` is the kitchen screen's wording.
 */
export function OrderLines({
  order,
  prices,
  kitchen,
  servesMeat,
}: {
  order: Pick<Order, "line_items" | "allergy_note" | "currency">;
  prices?: boolean;
  kitchen?: boolean;
  servesMeat?: boolean;
}) {
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  return (
    <ul className={`d-lines${kitchen ? " d-lines-k" : ""}`}>
      {items.map((item, i) => {
        const flag = dietFlag(item, order.allergy_note);
        return (
          <li className="d-ln" key={`${item.sku ?? item.name}-${i}`}>
            <div className="d-ln-top">
              <b className="d-ln-q">{item.quantity}{kitchen ? "" : "×"}</b>
              <b className="d-ln-n">{lineTitle(item)}</b>
              <LineMarks item={item} marks={visibleMarks(item, { servesMeat, note: order.allergy_note })} size={kitchen ? 22 : 18} />
              {prices ? <span className="d-ln-p">{formatMoney(item.line_total_cents, order.currency)}</span> : null}
            </div>
            <Changes item={item} />
            {flag ? <DietFlag text={flag} kitchen={kitchen} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
