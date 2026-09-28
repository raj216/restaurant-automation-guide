import { m, useScroll, useSpring } from "framer-motion";
import { useRef } from "react";
import type { IconName } from "../brand/glyphs";
import { useMotionKit } from "../motion/core";
import { DrawIcon } from "../motion/DrawIcon";
import { Reveal } from "../motion/Reveal";
import { pad } from "../utils";

export interface WorkflowStepsProps {
  /** The steps, each { title, text, icon }, numbered 01, 02, 03; icon is a kit icon name (see Icon). */
  steps: { title: string; text: string; icon: IconName }[];
}

/** One step in a process. */
export type WorkflowStep = WorkflowStepsProps["steps"][number];

/**
 * Numbered steps down a ruled column, each with a serif title, a line of detail and a drawn icon. For light sections.
 *
 * Beside them a terracotta rule fills as the reader scrolls.
 */
export function WorkflowSteps({ steps }: WorkflowStepsProps) {
  const { mode } = useMotionKit();
  // The rule fills as the steps pass through the viewport.
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });
  return (
    <div className="workflow-steps" ref={ref}>
      <div className="workflow-track" aria-hidden="true">
        <m.div className="workflow-track-fill" style={{ scaleY: mode === "on" ? fill : 1 }} />
      </div>
      {steps.map((step, i) => (
        <Reveal key={step.title} className="workflow-step" distance={18}>
          <span>{pad(i)}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
          <DrawIcon name={step.icon} delay={0.3} />
        </Reveal>
      ))}
    </div>
  );
}
