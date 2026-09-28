import { Reveal } from "../motion/Reveal";

export interface PriceCardProps {
  /** Small label, e.g. "STARTING TRIAL RANGE". */
  label: string;
  /** The figure, e.g. "$750–$1,500". */
  price: string;
  /** The terms under the figure. */
  detail: string;
  /** Muted small print. */
  note?: string;
  /** Seconds to wait, once in view, before the card rises. */
  delay?: number;
}

/**
 * A night-blue price card with a warm glow in its corner: small label, a large gold figure, then the terms and small print.
 */
export function PriceCard({ label, price, detail, note, delay = 0 }: PriceCardProps) {
  return (
    <Reveal className="price-card" delay={delay} distance={36}>
      <span className="price-label">{label}</span>
      <strong className="price-figure">{price}</strong>
      <p className="price-detail">{detail}</p>
      {note && <small className="price-note">{note}</small>}
    </Reveal>
  );
}
