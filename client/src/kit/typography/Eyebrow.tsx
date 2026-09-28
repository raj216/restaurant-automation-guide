import { m } from "framer-motion";
import type { ReactNode } from "react";
import { EASE, VIEWPORT, useMotionKit, type EntranceProps } from "../motion/core";
import { cx } from "../utils";

export interface EyebrowProps extends EntranceProps {
  /** A short label; the style sets it in spaced capitals. */
  children: ReactNode;
  /** plain: gold text above a section heading. chip: a pill with a blinking gold dot, for the hero. Default plain. */
  variant?: "plain" | "chip";
}

/**
 * The small gold label above a heading, in spaced capitals. The chip version sits in a pill with a blinking dot.
 *
 * In light sections it turns night blue and keeps its gold dot. In motion the
 * dot pops in, then the label slides in.
 */
export function Eyebrow({
  children,
  variant = "plain",
  delay = 0,
  playOnLoad = false,
  ready = true,
}: EyebrowProps) {
  const { reduce } = useMotionKit();
  const className = cx("eyebrow", variant === "chip" && "eyebrow-chip");
  if (reduce) {
    return (
      <p className={className}>
        <span className="eyebrow-dot" aria-hidden="true" />
        <span>{children}</span>
      </p>
    );
  }
  const play = playOnLoad
    ? { animate: ready ? "shown" : undefined }
    : { whileInView: "shown", viewport: VIEWPORT };
  return (
    <m.p className={className} initial="hidden" {...play}>
      <m.span
        className="eyebrow-dot"
        aria-hidden="true"
        variants={{ hidden: { scale: 0 }, shown: { scale: 1 } }}
        transition={{ type: "spring", stiffness: 420, damping: 18, delay }}
      />
      <m.span
        variants={{
          hidden: { opacity: 0, x: -10 },
          shown: { opacity: 1, x: 0 },
        }}
        transition={{ duration: 0.7, ease: EASE, delay: delay + 0.15 }}
      >
        {children}
      </m.span>
    </m.p>
  );
}
