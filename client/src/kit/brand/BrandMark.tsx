import { m } from "framer-motion";
import { EASE, useMotionKit } from "../motion/core";

export interface BrandMarkProps {
  /** Light version, for dark backgrounds. */
  inverse?: boolean;
  /** Draw the mark when it scrolls into view instead of on page load, e.g. in a footer. */
  drawOnView?: boolean;
}

/**
 * The Kadmivo logo: the transfer mark followed by the wordmark.
 *
 * In motion its strokes draw in order: the two ink brackets, the terracotta
 * register line, then the transfer bar that joins them.
 */
export function BrandMark({ inverse = false, drawOnView = false }: BrandMarkProps) {
  const { reduce } = useMotionKit();
  const play = drawOnView
    ? { whileInView: { pathLength: 1, opacity: 1 }, viewport: { once: true } }
    : { animate: { pathLength: 1, opacity: 1 } };
  const stroke = (className: string, d: string, delay: number) =>
    reduce ? (
      <path className={className} d={d} />
    ) : (
      <m.path
        className={className}
        d={d}
        initial={{ pathLength: 0, opacity: 0 }}
        {...play}
        transition={{
          pathLength: { duration: 0.8, ease: EASE, delay },
          opacity: { duration: 0.01, delay },
        }}
      />
    );
  return (
    <span className={`brand-lockup ${inverse ? "brand-lockup-inverse" : ""}`}>
      <svg className="brand-mark" viewBox="0 0 48 48" aria-label="Kadmivo mark" role="img">
        {stroke("mark-ink", "M20 7H8v15h12", 0.15)}
        {stroke("mark-ink", "M28 26h12v15H28", 0.3)}
        {stroke("mark-register", "M24 10v28", 0.55)}
        {stroke("mark-transfer", "M19 24h10", 0.8)}
      </svg>
      <span className="brand-word">Kadmivo</span>
    </span>
  );
}
