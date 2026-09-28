/**
 * Join class names, skipping empty ones. Returns undefined when nothing is
 * left, so no empty class attribute is rendered.
 */
export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ") || undefined;

/** Seconds rounded to the millisecond, so staggered delays stay exact. */
export const at = (seconds: number) => Math.round(seconds * 1000) / 1000;

/** List position as a two-digit number: 0 -> "01". */
export const pad = (index: number) => String(index + 1).padStart(2, "0");
