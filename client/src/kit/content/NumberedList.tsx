import { Reveal } from "../motion/Reveal";
import { at, pad } from "../utils";

export interface NumberedListProps {
  /** The points, each { title, text }, numbered 01, 02, 03 in order. */
  items: { title: string; text: string }[];
  /** Seconds to wait, once in view, before the list uncovers. */
  delay?: number;
}

/** One numbered point. */
export type NumberedListItem = NumberedListProps["items"][number];

/**
 * A ruled list of numbered points: a terracotta number, a bold title and a line of detail. For light sections.
 *
 * The rules uncover, then each point rises in turn.
 */
export function NumberedList({ items, delay = 0 }: NumberedListProps) {
  return (
    <Reveal className="problem-list" variant="wipe" delay={delay}>
      {items.map((item, i) => (
        <Reveal key={item.title} delay={at(delay + 0.2 + 0.12 * i)} distance={14}>
          <span>{pad(i)}</span>
          <strong>{item.title}</strong>
          <p>{item.text}</p>
        </Reveal>
      ))}
    </Reveal>
  );
}
