import { m, useScroll, useSpring } from "framer-motion";
import { useMotionKit } from "./core";

/**
 * A thin terracotta reading-progress rule fixed along the top of the window.
 * Renders nothing when motion is off.
 */
export function ScrollProgress() {
  const { mode } = useMotionKit();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30, restDelta: 0.001 });
  if (mode === "off") return null;
  return <m.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />;
}
