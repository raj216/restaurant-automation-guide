import { m } from "framer-motion";
import { EASE, useMotionKit } from "../motion/core";
import { cx } from "../utils";

export interface BrandMarkProps {
  /** Dark lettering, for light backgrounds. Default: light lettering, for the dark site. */
  onLight?: boolean;
  /** Draw the ring when it scrolls into view instead of on page load, e.g. in a footer. */
  drawOnView?: boolean;
  /** Show only the ring, without the wordmark. */
  ringOnly?: boolean;
}

/**
 * The Kadmivo logo: a glowing lantern ring followed by the wordmark in wide Mona Sans.
 *
 * In motion the ring draws itself in a single stroke.
 */
export function BrandMark({ onLight = false, drawOnView = false, ringOnly = false }: BrandMarkProps) {
  const { reduce } = useMotionKit();
  const play = drawOnView
    ? { whileInView: { pathLength: 1, opacity: 1 }, viewport: { once: true } }
    : { animate: { pathLength: 1, opacity: 1 } };
  return (
    <span className={cx("brand-lockup", onLight && "brand-lockup-dark")}>
      <svg className="brand-ring" viewBox="0 0 24 24" aria-hidden="true">
        {reduce ? (
          <circle cx="12" cy="12" r="9" />
        ) : (
          <m.circle
            cx="12"
            cy="12"
            r="9"
            initial={{ pathLength: 0, opacity: 0 }}
            {...play}
            transition={{
              pathLength: { duration: 1.1, ease: EASE, delay: 0.15 },
              opacity: { duration: 0.01, delay: 0.15 },
            }}
          />
        )}
      </svg>
      {!ringOnly && <span className="brand-word">Kadmivo</span>}
    </span>
  );
}
