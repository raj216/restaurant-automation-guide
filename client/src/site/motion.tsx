import { m, useReducedMotion } from "framer-motion";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

// Quick start, long calm settle. Every entrance on the page uses it.
export const EASE = [0.22, 1, 0.36, 1] as const;

// Start a reveal a little before the element is fully on screen; play once.
const VIEWPORT = { once: true, margin: "0px 0px -10% 0px" } as const;

type Tag =
  | "div"
  | "section"
  | "header"
  | "article"
  | "p"
  | "h2"
  | "h3"
  | "ul"
  | "li"
  | "span";

export interface RevealProps {
  as?: Tag;
  /** Seconds to wait before playing. */
  delay?: number;
  /** How far it rises, in px. */
  y?: number;
  /** Also sharpens from a soft blur. Best on text; skip it on big panels. */
  blur?: boolean;
  /** Plays on page load instead of when scrolled into view. */
  onLoad?: boolean;
  /** Holds an on-load entrance until this turns true (e.g. fonts ready). */
  ready?: boolean;
  className?: string;
  id?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "data-spotlight"?: boolean;
  children?: ReactNode;
}

/**
 * Rises (and sharpens) into place when scrolled into view, or on page load.
 * With reduced motion it simply renders.
 */
export function Reveal({
  as = "div",
  delay = 0,
  y = 22,
  blur = false,
  onLoad = false,
  ready = true,
  children,
  ...rest
}: RevealProps) {
  const reduce = useReducedMotion();
  const Element = m[as] as typeof m.div;
  if (reduce) return <Element {...rest}>{children}</Element>;
  const hidden = { opacity: 0, y, ...(blur ? { filter: "blur(8px)" } : {}) };
  const shown = { opacity: 1, y: 0, ...(blur ? { filter: "blur(0px)" } : {}) };
  const transition = { duration: 0.9, ease: EASE, delay };
  const motion = onLoad
    ? { initial: hidden, animate: ready ? shown : hidden, transition }
    : { initial: hidden, whileInView: shown, viewport: VIEWPORT, transition };
  return (
    <Element {...rest} {...motion}>
      {children}
    </Element>
  );
}

/**
 * Text that arrives word by word on page load. Each word is its own box, so
 * the sentence still reads as one to screen readers (the spaces are real).
 * `className` styles the words; `suffix` (a full stop, say) rides in with
 * the last word, unstyled, and never wraps away from it.
 */
export function Words({
  text,
  className,
  suffix,
  delay = 0,
  step = 0.055,
  ready = true,
}: {
  text: string;
  className?: string;
  suffix?: string;
  delay?: number;
  step?: number;
  ready?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ").filter(Boolean);
  return (
    <>
      {words.map((word, i) => {
        const last = i === words.length - 1;
        const inner = (
          <>
            <span className={className}>{word}</span>
            {last && suffix}
          </>
        );
        return (
          <span key={`${word}-${i}`}>
            {reduce ? (
              <span className="word">{inner}</span>
            ) : (
              <m.span
                className="word"
                initial={{ opacity: 0, y: "0.35em", filter: "blur(10px)" }}
                animate={
                  ready ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined
                }
                transition={{
                  duration: 0.8,
                  ease: EASE,
                  delay: delay + i * step,
                }}
              >
                {inner}
              </m.span>
            )}
            {last ? "" : " "}
          </span>
        );
      })}
    </>
  );
}

/**
 * True once the page's fonts have loaded, or after `timeout` ms, so text
 * doesn't re-flow while it is moving in.
 */
export function useFontsReady(timeout = 900) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const timer = window.setTimeout(finish, timeout);
    if ("fonts" in document) {
      Promise.all([
        document.fonts.load('600 64px "Geist Variable"'),
        document.fonts.load('italic 400 64px "Instrument Serif"'),
      ]).then(finish, finish);
    } else finish();
    return () => {
      done = true;
      window.clearTimeout(timer);
    };
  }, [timeout]);
  return ready;
}

/**
 * Lets `[data-spotlight]` panels follow the pointer with a soft light: one
 * listener for the whole page, on devices with a mouse.
 */
export function useSpotlight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const target = last?.target;
      if (!last || !(target instanceof Element)) return;
      const panel = target.closest<HTMLElement>("[data-spotlight]");
      if (!panel) return;
      const box = panel.getBoundingClientRect();
      panel.style.setProperty("--mx", `${last.clientX - box.left}px`);
      panel.style.setProperty("--my", `${last.clientY - box.top}px`);
    };
    const onMove = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
}
