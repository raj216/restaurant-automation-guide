import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import type { ReactNode } from "react";
import { MotionModeContext, type MotionMode } from "./core";

export interface KadmivoProviderProps {
  /** "on" plays entrances and scroll effects (honouring reduced-motion settings); "off" renders the final state. Default "off". */
  motion?: MotionMode;
  children: ReactNode;
}

/**
 * Wraps a Kadmivo page or design and sets whether its components move.
 * Components used without it render static.
 */
export function KadmivoProvider({ motion = "off", children }: KadmivoProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={motion === "on" ? "user" : "always"}>
        <MotionModeContext.Provider value={motion}>
          {motion === "on" ? (
            children
          ) : (
            // Also stills the stylesheet's own looping animations.
            <div className="kadmivo-motion-off">{children}</div>
          )}
        </MotionModeContext.Provider>
      </MotionConfig>
    </LazyMotion>
  );
}
