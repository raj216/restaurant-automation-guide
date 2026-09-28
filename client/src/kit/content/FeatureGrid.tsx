import type { IconName } from "../brand/glyphs";
import { DrawIcon } from "../motion/DrawIcon";
import { Reveal } from "../motion/Reveal";
import { at } from "../utils";

export interface FeatureGridProps {
  /** Three features fill one row, each { icon, title, text }; icon is a kit icon name (see Icon). */
  items: { icon: IconName; title: string; text: string }[];
}

/** One feature: icon, title and a line of detail. */
export type Feature = FeatureGridProps["items"][number];

/**
 * Three cards side by side, each with a drawn gold icon in a soft disc, a title and a short explanation.
 *
 * Stacks on phones. The cards rise in turn and lift on hover.
 */
export function FeatureGrid({ items }: FeatureGridProps) {
  return (
    <div className="feature-grid">
      {items.map((item, i) => (
        <Reveal key={item.title} className="feature-card" delay={at(0.1 + 0.12 * i)} distance={24}>
          <span className="icon-disc">
            <DrawIcon name={item.icon} size={22} delay={at(0.3 + 0.12 * i)} />
          </span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </Reveal>
      ))}
    </div>
  );
}
