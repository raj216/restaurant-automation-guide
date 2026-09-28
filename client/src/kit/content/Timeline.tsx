import { Reveal } from "../motion/Reveal";
import { at } from "../utils";

export interface TimelineProps {
  /** Four stages fill a row (two on tablets, one on phones), each { label, title, text }. */
  items: { label: string; title: string; text: string }[];
}

/** One stage: a small label, a title and a line of detail. */
export type TimelineItem = TimelineProps["items"][number];

/**
 * Stages side by side between two rules: a small terracotta label, a serif title and a short explanation each.
 *
 * For light sections.
 */
export function Timeline({ items }: TimelineProps) {
  return (
    <Reveal className="pilot-timeline" variant="wipe">
      {items.map((item, i) => (
        <Reveal key={item.title} delay={at(0.15 + 0.12 * i)} distance={16}>
          <span>{item.label}</span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </Reveal>
      ))}
    </Reveal>
  );
}
