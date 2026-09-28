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
 * Short promises in a ruled list, each led by a gold icon in a soft disc.
 *
 * They rise in one after another.
 */
export function PromiseList({ items, delay = 0 }: PromiseListProps) {
  return (
    <div className="promise-list">
      {items.map((item, i) => (
        <Reveal key={item.label} className="promise-item" delay={at(delay + 0.1 * i)} distance={10}>
          <span className="icon-disc">
            <Icon name={item.icon} size={20} />
          </span>
          {item.label}
        </Reveal>
      ))}
    </div>
  );
}
