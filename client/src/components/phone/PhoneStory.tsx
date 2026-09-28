import { m, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { useRef, useState } from "react";
import { Icon, useMotionKit } from "@/kit";
import { PhoneCanvas, hasWebGL } from "./PhoneCanvas";
import { PhonePoster } from "./PhonePoster";
import type { PhoneScene } from "./scene/phoneScene";

export interface PhoneStoryProps {
  /** The four steps, each { title, text }, in order. */
  steps: { title: string; text: string }[];
}

const pad = (i: number) => String(i + 1).padStart(2, "0");

function StepList({ steps, active }: PhoneStoryProps & { active: number }) {
  return (
    <ol className="story-list">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className={`story-step${i < active ? " is-done" : ""}${i === active ? " is-active" : ""}`}
          aria-current={i === active ? "step" : undefined}
        >
          <span className="story-step-dot" aria-hidden="true" />
          <div className="story-step-head">
            <span className="story-step-num">{pad(i)}</span>
            <h3>{step.title}</h3>
            <Icon name="check" size={18} className="story-step-check" />
          </div>
          <div className="story-step-body">
            <p>{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Without WebGL, or with reduced motion: the steps as a list beside a still phone. */
function StillStory({ steps }: PhoneStoryProps) {
  return (
    <div className="story-static">
      <div className="story-steps">
        <div className="story-rail" aria-hidden="true">
          <span />
        </div>
        <ol className="story-list">
          {steps.map((step, i) => (
            <li key={step.title} className="story-step is-active">
              <span className="story-step-dot" aria-hidden="true" />
              <div className="story-step-head">
                <span className="story-step-num">{pad(i)}</span>
                <h3>{step.title}</h3>
              </div>
              <div className="story-step-body">
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="phone-stage story-stage">
        <div className="stage-halo" />
        <div className="stage-floor" />
        <PhonePoster variant="story" />
      </div>
    </div>
  );
}

/**
 * How one call becomes an approved order, told by the 3D phone. The section
 * pins while the reader scrolls through its four steps: the phone rings,
 * checks the menu on its screen, prints the order ticket, and the ticket
 * lands with the team.
 */
export function PhoneStory({ steps }: PhoneStoryProps) {
  const { reduce } = useMotionKit();
  const [webgl] = useState(() => typeof window !== "undefined" && hasWebGL());
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<PhoneScene | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.5, restDelta: 0.0005 });
  const [active, setActive] = useState(0);
  const [landed, setLanded] = useState(false);

  useMotionValueEvent(progress, "change", value => {
    setActive(Math.min(steps.length - 1, Math.max(0, Math.floor(value * steps.length))));
    setLanded(value > 0.93);
  });

  if (reduce || !webgl || failed) return <StillStory steps={steps} />;

  return (
    <div className="story" ref={ref}>
      <div className="story-sticky">
        <div className="story-grid">
          <div className="story-steps">
            <div className="story-rail" aria-hidden="true">
              <m.span style={{ scaleY: progress }} />
            </div>
            <div className="story-progress" aria-hidden="true">
              {steps.map((step, i) => (
                <span key={step.title} className={i < active ? "is-done" : i === active ? "is-active" : undefined} />
              ))}
            </div>
            <StepList steps={steps} active={active} />
          </div>
          <div className="phone-stage story-stage">
            <div className="stage-halo" />
            <div className={`stage-waves${active === 0 ? " is-ringing" : ""}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="stage-floor" />
            <PhonePoster variant="story" hidden={Boolean(scene)} />
            <PhoneCanvas mode="story" progress={progress} onReady={setScene} onFail={() => setFailed(true)} />
            <span className={`stage-chip chip-pending${active === 2 ? " is-on" : ""}`} aria-hidden="true">
              <i /> Pending review
            </span>
            <span className={`stage-chip chip-pos${landed ? " is-on" : ""}`} aria-hidden="true">
              <Icon name="check" size={16} /> Reaches POS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
