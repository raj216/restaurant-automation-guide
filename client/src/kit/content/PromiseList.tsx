import { Icon } from "../brand/Icon";
import type { IconName } from "../brand/glyphs";
import { Reveal } from "../motion/Reveal";
import { at } from "../utils";

export interface PromiseListProps {
  /** Two to four short promises, each { icon, label }; icon is a kit icon name (see Icon). */
  items: { icon: IconName; label: string }[];
  /** Seconds to wait, once in view, before the first promise rises. */
  delay?: number;
}

/**
 * Short promises in a wrapping row, each led by a warm icon, for dark sections.
 *
 * They rise in one after another.
 */
export function PromiseList({ items, delay = 0 }: PromiseListProps) {
  return (
    <div className="contact-promises">
      {items.map((item, i) => (
        <Reveal as="span" key={item.label} delay={at(delay + 0.1 * i)} distance={10}>
          <Icon name={item.icon} size={17} /> {item.label}
        </Reveal>
      ))}
    </div>
  );
}
