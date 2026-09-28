import { m, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { useRef, useState, type CSSProperties } from "react";
import { useMotionKit } from "../motion/core";
import { Reveal } from "../motion/Reveal";
import { at, cx } from "../utils";

export interface TimelineProps {
  /** Four stages fill a row (a column on phones), each { label, title, text }. */
  items: { label: string; title: string; text: string }[];
}

/** One stage: a small label, a title and a line of detail. */
export type TimelineItem = TimelineProps["items"][number];

/**
 * Stages along a line, each marked by a node: a small label, a title and a short explanation. For light sections.
 *
 * In motion a gold line fills as the reader scrolls, lighting each node as it
 * passes.
 */
export function Timeline({ items }: TimelineProps) {
  const { reduce } = useMotionKit();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 110, damping: 26, restDelta: 0.001 });
  const [reached, setReached] = useState(reduce ? items.length : 0);
  useMotionValueEvent(fill, "change", value => {
    if (!reduce) setReached(Math.floor(value * items.length + 0.02));
  });
  return (
    <div className="timeline" ref={ref}>
      <div className="timeline-track" aria-hidden="true">
        <m.span style={{ "--fill": reduce ? 1 : fill } as unknown as CSSProperties} />
      </div>
      {items.map((item, i) => (
        <Reveal
          key={item.title}
          className={cx("timeline-item", (reduce || i < Math.max(reached, 1)) && "is-reached")}
          delay={at(0.1 + 0.12 * i)}
          distance={16}
        >
          <span className="timeline-node" aria-hidden="true" />
          <span className="timeline-label">{item.label}</span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </Reveal>
      ))}
    </div>
  );
}
