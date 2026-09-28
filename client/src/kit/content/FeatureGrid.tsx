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
 * Three ruled columns for a dark section, each with a drawn icon, a white serif title and a short explanation.
 *
 * Stacks on phones.
 */
export function FeatureGrid({ items }: FeatureGridProps) {
  return (
    <Reveal className="guardrail-grid" variant="wipe">
      {items.map((item, i) => (
        <Reveal key={item.title} delay={at(0.15 + 0.15 * i)} distance={18}>
          <DrawIcon name={item.icon} delay={at(0.35 + 0.15 * i)} />
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </Reveal>
      ))}
    </Reveal>
  );
}
