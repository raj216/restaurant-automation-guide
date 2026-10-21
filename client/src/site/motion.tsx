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
 * Marks each section `data-paused` while it's off screen, which stops its
 * looping CSS animations (see site.css), so a phone only draws the ones in view.
 */
export function usePauseOffscreen() {
  useEffect(() => {
    const watch = new IntersectionObserver(
      entries => {
        for (const entry of entries)
          entry.target.toggleAttribute("data-paused", !entry.isIntersecting);
      },
      { rootMargin: "120px 0px" }
    );
    document
      .querySelectorAll(".site section, .site footer")
      .forEach(part => watch.observe(part));
    return () => watch.disconnect();
  }, []);
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

/**
 * Links to a section of this page (#pricing, #faq…) scroll to it without
 * loading the page again, so in-app browsers (a chat or social app) keep the
 * page instead of handing the link to another browser. And an address that
 * arrives with a section in it (cohost.site/#pricing) lands on that section:
 * the browser looks for it before the page has drawn, so it can't.
 */
export function useSectionLinks() {
  useEffect(() => {
    const find = (hash: string) => {
      if (hash.length < 2) return null;
      try {
        return document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {
        return null;
      }
    };

    // Arriving with a section in the address: land on it once the page has
    // drawn, and again as fonts and pictures settle, until the visitor scrolls.
    const arrived = find(window.location.hash);
    let moved = false;
    const stop = () => (moved = true);
    const land = () => {
      if (arrived && !moved)
        arrived.scrollIntoView({ block: "start", behavior: "instant" });
    };
    if (arrived) {
      requestAnimationFrame(land);
      void document.fonts?.ready.then(() => requestAnimationFrame(land));
      window.addEventListener("load", land, { once: true });
      window.addEventListener("wheel", stop, { passive: true, once: true });
      window.addEventListener("touchstart", stop, {
        passive: true,
        once: true,
      });
      window.addEventListener("keydown", stop, { once: true });
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const link = (
        event.target as Element | null
      )?.closest?.<HTMLAnchorElement>('a[href^="#"]:not(.skip)');
      const hash = link?.getAttribute("href") ?? "";
      const section = find(hash);
      if (!section) return;
      event.preventDefault();
      if (window.location.hash !== hash)
        window.history.pushState(null, "", hash);
      // After the phone menu has closed (it holds the page still while open).
      requestAnimationFrame(() => section.scrollIntoView({ block: "start" }));
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("load", land);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);
}
