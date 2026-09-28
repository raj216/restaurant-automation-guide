import { Icon } from "../brand/Icon";
import type { IconName } from "../brand/glyphs";
import type { EntranceProps } from "../motion/core";
import { Reveal } from "../motion/Reveal";

export interface TrustStripProps extends EntranceProps {
  /** Two to four short reassurances, each { icon, label }; icon is a kit icon name (see Icon). */
  items: { icon: IconName; label: string }[];
  /** Accessible name for the group, e.g. "Kadmivo safeguards". */
  label?: string;
}

/**
 * A row of short reassurances under a thin rule, each led by a terracotta icon. For light sections.
 *
 * Uncovers left to right.
 */
export function TrustStrip({ items, label, ...entrance }: TrustStripProps) {
  return (
    <Reveal className="trust-strip" aria-label={label} variant="wipe" {...entrance}>
      {items.map(item => (
        <span key={item.label}>
          <Icon name={item.icon} size={15} /> {item.label}
        </span>
      ))}
    </Reveal>
  );
}
