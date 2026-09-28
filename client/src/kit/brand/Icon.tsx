import type { CSSProperties } from "react";
import { glyphs, type IconName } from "./glyphs";

export interface IconProps {
  /** Which icon to draw. */
  name: IconName;
  /** Width and height in px. Default 24. */
  size?: number;
  /** Line weight. Default 2. */
  strokeWidth?: number;
  /** Accessible name. Leave unset when the icon sits beside text that says the same thing. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A line icon from the Kadmivo set. It takes the color of the text around it.
 *
 * Twelve icons ship with the kit: arrow-right, arrow-up-right, check,
 * check-circle, clipboard-check, clock, hand, lock, map-pin, phone,
 * shield-check and user.
 */
export function Icon({ name, label, ...props }: IconProps) {
  const Glyph = glyphs[name];
  return (
    <Glyph {...props} aria-label={label} role={label ? "img" : undefined} />
  );
}
