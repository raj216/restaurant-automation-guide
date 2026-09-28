import { m } from "framer-motion";
import type { ReactNode } from "react";
import { useMotionKit, type EntranceProps } from "./core";

type RevealTag =
  | "div"
  | "p"
  | "span"
  | "strong"
  | "section"
  | "article"
  | "aside"
  | "header"
  | "footer"
  | "ul"
  | "ol"
  | "li"
  | "blockquote";

export interface RevealProps extends EntranceProps {
  /** Element to render. Default "div". */
  as?: RevealTag;
  /** rise fades up into place, wipe uncovers left to right like a rule being drawn, fade fades in place. Default rise. */
  variant?: "rise" | "wipe" | "fade";
  /** How far a rise travels, in px. Default 22. */
  distance?: number;
  /** For content at the very bottom of a page, which can never scroll far enough to trigger the usual reveal. */
  atPageEnd?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  children?: ReactNode;
}

/**
 * Wraps any content in the kit's entrance: it rises, wipes or fades in as it scrolls into view.
 *
 * With playOnLoad it plays on page load instead. Every animated kit component
 * uses it. With motion off it renders the element as is.
 */
export function Reveal({
  as = "div",
  variant = "rise",
  delay = 0,
  distance = 22,
  playOnLoad = false,
  ready = true,
  atPageEnd = false,
  children,
  ...rest
}: RevealProps) {
  const k = useMotionKit();
  const Tag = m[as] as typeof m.div;
  const entrance =
    variant === "wipe"
      ? playOnLoad
        ? k.wipeIn(delay, ready)
        : k.wipe(delay)
      : variant === "fade"
        ? playOnLoad
          ? k.fade(delay, ready)
          : k.reveal(delay, 0, atPageEnd)
        : playOnLoad
          ? k.enter(delay, distance, ready)
          : k.reveal(delay, distance, atPageEnd);
  return (
    <Tag {...rest} {...entrance}>
      {children}
    </Tag>
  );
}
