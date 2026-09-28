import { m, useInView, useReducedMotion, type Transition } from "framer-motion";
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

// Quick start, long calm settle. Every entrance on the page uses it.
export const EASE = [0.22, 1, 0.36, 1] as const;

// Start a reveal a little before the element is fully on screen; play once.
export const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

const settle = (delay: number, duration = 0.9): Transition => ({
  duration,
  ease: EASE,
  delay,
});

/**
 * True once the named web fonts have loaded, or after `timeout` ms. Entrance
 * animations wait for it so text never re-flows while it is moving.
 */
export function useFontsReady(families: string[], timeout = 1200) {
  const [ready, setReady] = useState(false);
  const key = families.join(",");
  useEffect(() => {
    const names = key.split(",");
    const loaded = () =>
      names.every(name =>
        Array.from(document.fonts).some(
          face =>
            face.family.replace(/["']/g, "") === name &&
            face.status === "loaded"
        )
      );
    const started = performance.now();
    const timer = window.setInterval(() => {
      if (loaded() || performance.now() - started > timeout) {
        window.clearInterval(timer);
        setReady(true);
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [key, timeout]);
  return ready;
}

/**
 * Props for the page's shared entrances, to spread onto a motion element.
 * With reduced motion every helper returns nothing, so the element simply
 * renders in its final, static state. Page-load helpers hold their start
 * state until `ready`.
 */
export function useMotionKit() {
  const reduce = useReducedMotion() ?? false;
  const none = {};
  return {
    reduce,
    /** Fade up on page load. */
    enter: (delay = 0, y = 22, ready = true) =>
      reduce
        ? none
        : {
            initial: { opacity: 0, y },
            animate: ready ? { opacity: 1, y: 0 } : undefined,
            transition: settle(delay),
          },
    /** Fade in on page load. */
    fade: (delay = 0) =>
      reduce
        ? none
        : {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: settle(delay, 0.8),
          },
    /**
     * Fade up when scrolled into view. Pass `atPageEnd` for elements at the
     * very bottom of the page, which can never scroll past VIEWPORT's inset.
     */
    reveal: (delay = 0, y = 22, atPageEnd = false) =>
      reduce
        ? none
        : {
            initial: { opacity: 0, y },
            whileInView: { opacity: 1, y: 0 },
            viewport: atPageEnd ? { once: true } : VIEWPORT,
            transition: settle(delay),
          },
    /** Left-to-right wipe when scrolled into view, like a rule being drawn. */
    wipe: (delay = 0) =>
      reduce
        ? none
        : {
            initial: { clipPath: "inset(0 100% 0 0)" },
            whileInView: {
              clipPath: "inset(0 0% 0 0)",
              transitionEnd: { clipPath: "none" },
            },
            viewport: VIEWPORT,
            transition: settle(delay, 1.1),
          },
    /** The same wipe, played on page load. */
    wipeIn: (delay = 0, ready = true) =>
      reduce
        ? none
        : {
            initial: { clipPath: "inset(0 100% 0 0)" },
            animate: ready
              ? {
                  clipPath: "inset(0 0% 0 0)",
                  transitionEnd: { clipPath: "none" },
                }
              : undefined,
            transition: settle(delay, 1.1),
          },
  };
}

type WordRevealProps = {
  as?: "h1" | "h2";
  text: string;
  id?: string;
  className?: string;
  delay?: number;
  /** Play on page load (once `ready`) instead of when scrolled into view. */
  onLoad?: boolean;
  ready?: boolean;
};

/**
 * A heading whose words rise into place from behind a mask, one after
 * another. The heading stays plain text except while it animates: before
 * that it is transparent (so font loading re-flows it like any paragraph),
 * and once the last word lands it is plain again, identical to the static
 * design. While split, aria-label keeps it one sentence for screen readers.
 */
export function WordReveal({
  as: Tag = "h2",
  text,
  id,
  className,
  delay = 0,
  onLoad = false,
  ready = true,
}: WordRevealProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, VIEWPORT);
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  if (reduce || done) {
    return (
      <Tag id={id} className={className}>
        {text}
      </Tag>
    );
  }
  if (!(onLoad ? ready : inView)) {
    return (
      <Tag ref={ref} id={id} className={className} style={{ opacity: 0 }}>
        {text}
      </Tag>
    );
  }
  const words = text.split(" ");
  return (
    <Tag ref={ref} id={id} className={className} aria-label={text}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="word-mask" aria-hidden="true">
            <m.span
              className="word"
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

/** Section eyebrow: its short rule draws out, then the label slides in. */
export function Eyebrow({
  children,
  delay = 0,
  onLoad = false,
  ready = true,
}: {
  children: ReactNode;
  delay?: number;
  onLoad?: boolean;
  ready?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <p className="eyebrow">
        <span className="eyebrow-line" /> {children}
      </p>
    );
  }
  const play = onLoad
    ? { animate: ready ? "shown" : undefined }
    : { whileInView: "shown", viewport: VIEWPORT };
  return (
    <m.p className="eyebrow" initial="hidden" {...play}>
      <m.span
        className="eyebrow-line"
        style={{ originX: 0 }}
        variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }}
        transition={{ duration: 0.7, ease: EASE, delay }}
      />{" "}
      <m.span
        variants={{
          hidden: { opacity: 0, x: -10 },
          shown: { opacity: 1, x: 0 },
        }}
        transition={{ duration: 0.7, ease: EASE, delay: delay + 0.2 }}
      >
        {children}
      </m.span>
    </m.p>
  );
}

type DrawIconProps = LucideProps & { icon: LucideIcon; delay?: number };

/** A line icon whose strokes draw themselves in when scrolled into view. */
export function DrawIcon({
  icon: Icon,
  delay = 0,
  className,
  style,
  ...props
}: DrawIconProps) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, VIEWPORT);
  const reduce = useReducedMotion();
  // Normalise every stroke to length 1 before paint so the CSS dash trick
  // in index.css can draw any icon with the same two values.
  useLayoutEffect(() => {
    if (reduce) return;
    ref.current
      ?.querySelectorAll("path, circle, rect, line, polyline, polygon, ellipse")
      .forEach(shape => shape.setAttribute("pathLength", "1"));
  }, [reduce]);
  if (reduce) return <Icon className={className} style={style} {...props} />;
  const classes = ["draw-icon", inView && "is-drawn", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Icon
      ref={ref}
      className={classes}
      style={{ ...style, "--draw-delay": `${delay}s` } as CSSProperties}
      {...props}
    />
  );
}
