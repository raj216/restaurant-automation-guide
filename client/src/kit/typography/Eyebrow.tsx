import { m } from "framer-motion";
import type { ReactNode } from "react";
import { EASE, VIEWPORT, useMotionKit, type EntranceProps } from "../motion/core";

export interface EyebrowProps extends EntranceProps {
  /** A short label; the style sets it in spaced capitals. */
  children: ReactNode;
}

/**
 * The small terracotta label above a heading, in spaced capitals led by a short rule.
 *
 * In motion the rule draws out, then the label slides in.
 */
export function Eyebrow({
  children,
  delay = 0,
  playOnLoad = false,
  ready = true,
}: EyebrowProps) {
  const { reduce } = useMotionKit();
  if (reduce) {
    return (
      <p className="eyebrow">
        <span className="eyebrow-line" /> {children}
      </p>
    );
  }
  const play = playOnLoad
    ? { animate: ready ? "shown" : undefined }
    : { whileInView: "shown", viewport: VIEWPORT };
  return (
    <m.p className="eyebrow" initial="hidden" {...play}>
      <m.span
        className="eyebrow-line"
        style={{ originX: 0 }}
        variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }}
        transition={{ duration: 0.7, ease: EASE, delay }}
      />{" "}
      <m.span
        variants={{
          hidden: { opacity: 0, x: -10 },
          shown: { opacity: 1, x: 0 },
        }}
        transition={{ duration: 0.7, ease: EASE, delay: delay + 0.2 }}
      >
        {children}
      </m.span>
    </m.p>
  );
}
