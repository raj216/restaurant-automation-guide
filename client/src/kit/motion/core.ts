import { useReducedMotion, type Transition } from "framer-motion";
import { createContext, useContext, useEffect, useState } from "react";

// Quick start, long calm settle. Every entrance in the kit uses it.
export const EASE = [0.22, 1, 0.36, 1] as const;

// Start a reveal a little before the element is fully on screen; play once.
export const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

/**
 * "on" plays the kit's entrances; "off" renders every component in its
 * final, static state.
 */
export type MotionMode = "on" | "off";

// Components outside a KadmivoProvider render static, so they can never be
// left at a hidden start state.
export const MotionModeContext = createContext<MotionMode>("off");

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
 * Props for the kit's shared entrances, to spread onto a motion element.
 * When motion is off (the provider's mode, or the visitor's reduced-motion
 * setting) every helper returns nothing, so the element simply renders in its
 * final, static state. Page-load helpers hold their start state until `ready`.
 */
export function useMotionKit() {
  const mode = useContext(MotionModeContext);
  const reduce = (useReducedMotion() ?? false) || mode === "off";
  const none = {};
  return {
    reduce,
    mode,
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
    fade: (delay = 0, ready = true) =>
      reduce
        ? none
        : {
            initial: { opacity: 0 },
            animate: ready ? { opacity: 1 } : undefined,
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

/** Shared props for components that can play their entrance on page load. */
export interface EntranceProps {
  /** Play the entrance on page load (for content above the fold) instead of on scrolling into view. */
  playOnLoad?: boolean;
  /** With playOnLoad: hold the entrance until true, e.g. useFontsReady(["Fraunces", "Manrope"]). Default true. */
  ready?: boolean;
  /** Seconds to wait before the entrance starts. */
  delay?: number;
}
