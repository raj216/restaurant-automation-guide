import { Reveal } from "../motion/Reveal";

export interface PriceCardProps {
  /** Small teal label, e.g. "STARTING TRIAL RANGE". */
  label: string;
  /** The figure, e.g. "$750–$1,500". */
  price: string;
  /** Bold terms under the figure. */
  detail: string;
  /** Muted small print. */
  note?: string;
  /** Seconds to wait, once in view, before the card rises. */
  delay?: number;
}

/**
 * A white price block: small label, a large terracotta serif figure, then the terms and small print.
 */
export function PriceCard({ label, price, detail, note, delay = 0 }: PriceCardProps) {
  return (
    <Reveal className="pilot-price" delay={delay} distance={36}>
      <span>{label}</span>
      <strong>{price}</strong>
      <p>{detail}</p>
      {note && <small>{note}</small>}
    </Reveal>
  );
}
