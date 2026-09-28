import { m, useInView } from "framer-motion";
import { Fragment, useRef, useState } from "react";
import { EASE, VIEWPORT, useMotionKit, type EntranceProps } from "../motion/core";

export interface HeadingProps extends EntranceProps {
  /** 1 for the page title, 2 for section titles, 3 for card titles. Default 2. */
  level?: 1 | 2 | 3;
  /** The heading text. Plain text only, since its words animate one by one. */
  children: string;
  /** A phrase of the heading to set in gold, e.g. "during the rush." It must appear in the text exactly. */
  highlight?: string;
  id?: string;
  className?: string;
}

/** Splits text into words, marking those inside the highlighted phrase. */
function splitWords(text: string, highlight?: string) {
  const start = highlight ? text.indexOf(highlight) : -1;
  const end = start + (highlight?.length ?? 0);
  let offset = 0;
  return text.split(" ").map(word => {
    const at = text.indexOf(word, offset);
    offset = at + word.length;
    return { word, lit: start >= 0 && at >= start && at < end };
  });
}

/**
 * A heading in semi-wide Mona Sans, tightly tracked, with an optional phrase in gold. In motion its words rise into place one by one.
 *
 * The words rise from behind a mask. The heading stays plain text except while it animates: before that it is
 * transparent (so font loading re-flows it like any paragraph), and once the
 * last word lands it is plain again, identical to the static design. While
 * split, aria-label keeps it one sentence for screen readers.
 */
export function Heading({
  level = 2,
  children: text,
  highlight,
  id,
  className,
  delay = 0,
  playOnLoad = false,
  ready = true,
}: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, VIEWPORT);
  const { reduce } = useMotionKit();
  const [done, setDone] = useState(false);

  const start = highlight ? text.indexOf(highlight) : -1;
  const plain =
    start >= 0 && highlight ? (
      <>
        {text.slice(0, start)}
        <span className="hl">{highlight}</span>
        {text.slice(start + highlight.length)}
      </>
    ) : (
      text
    );

  if (reduce || done) {
    return (
      <Tag id={id} className={className}>
        {plain}
      </Tag>
    );
  }
  if (!(playOnLoad ? ready : inView)) {
    return (
      <Tag ref={ref} id={id} className={className} style={{ opacity: 0 }}>
        {plain}
      </Tag>
    );
  }
  const words = splitWords(text, highlight);
  return (
    <Tag ref={ref} id={id} className={className} aria-label={text}>
      {words.map(({ word, lit }, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="word-mask" aria-hidden="true">
            <m.span
              className={lit ? "word hl" : "word"}
              initial={{ y: "130%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 1, ease: EASE, delay: delay + i * 0.045 }}
              onAnimationComplete={
                i === words.length - 1 ? () => setDone(true) : undefined
              }
            >
              {word}
            </m.span>
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
