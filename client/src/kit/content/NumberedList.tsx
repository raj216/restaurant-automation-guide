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
 * A ruled list of numbered points: a gold number, a title and a line of detail.
 *
 * The rules uncover, then each point rises in turn.
 */
export function NumberedList({ items, delay = 0 }: NumberedListProps) {
  return (
    <Reveal className="numbered-list" variant="wipe" delay={delay}>
      {items.map((item, i) => (
        <Reveal key={item.title} className="numbered-item" delay={at(delay + 0.2 + 0.12 * i)} distance={14}>
          <span className="numbered-index">{pad(i)}</span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        </Reveal>
      ))}
    </Reveal>
  );
}
