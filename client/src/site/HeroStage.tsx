import { PhoneCanvas, hasWebGL } from "@/components/phone/PhoneCanvas";
import { heroPhonePixels } from "@/components/phone/scene/fit";
import type { PhoneScene } from "@/components/phone/scene/phoneScene";
import { useReducedMotion } from "framer-motion";
import {
  MessageSquareText,
  MoveHorizontal,
  PhoneIncoming,
  ShieldBan,
  ShoppingBag,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { STAGE } from "./content";
import { PhonePoster } from "./PhonePoster";

// The call plays in four steps, each held this long, then rests and repeats.
const STEP_MS = 3400;
const REST_MS = 1100;
const LAST_STEP = STAGE.events.length - 1;
const ICONS = [PhoneIncoming, ShoppingBag, MessageSquareText, ShieldBan];
const PLACES = ["event-a", "event-b", "event-c", "event-d"];

/** True while the element is on screen and the tab is in front. */
function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [seen, setSeen] = useState(false);
  const [shown, setShown] = useState(
    () => typeof document === "undefined" || !document.hidden
  );
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSeen(entry.isIntersecting),
      { rootMargin: "60px" }
    );
    observer.observe(el);
    const onVisibility = () => setShown(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ref]);
  return seen && shown;
}

/**
 * The hero's stage: Brio on a call on the 3D iPhone, and what the call turns
 * into, card by card, around it. Visitors can spin the phone by dragging
 * sideways; vertical swipes still scroll the page.
 */
export function HeroStage() {
  const reduce = useReducedMotion() ?? false;
  const [webgl] = useState(() => typeof window !== "undefined" && hasWebGL());
  const [scene, setScene] = useState<PhoneScene | null>(null);
  const [failed, setFailed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const phoneBox = useRef<HTMLDivElement>(null);
  const running = useOnScreen(stage) && !reduce;
  const [step, setStep] = useState(-1);
  const live = Boolean(scene) && !failed;
  // With reduced motion, everything shows at once and holds still.
  const shownStep = reduce ? LAST_STEP : step;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(
      () => setStep(value => (value >= LAST_STEP ? -1 : value + 1)),
      step < 0 ? REST_MS : STEP_MS
    );
    return () => window.clearTimeout(timer);
  }, [running, step]);

  useEffect(() => {
    scene?.setStep(shownStep);
  }, [scene, shownStep]);

  // Size the CSS phone like the 3D one, so the hand-over doesn't jump.
  useLayoutEffect(() => {
    const el = phoneBox.current;
    if (!el) return;
    const size = () => {
      const phone = heroPhonePixels(el.clientWidth, el.clientHeight);
      el.style.setProperty("--poster-scale", (phone / 562).toFixed(3));
    };
    size();
    const observer = new ResizeObserver(size);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!scene || !el) return;
    let down = false;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof HTMLCanvasElement))
        return;
      down = true;
      lastX = event.clientX;
      lastTime = event.timeStamp;
      velocity = 0;
      el.setPointerCapture(event.pointerId);
      el.classList.add("is-dragging");
      scene.grab();
    };
    const onMove = (event: PointerEvent) => {
      if (!down) return;
      const turn = (event.clientX - lastX) * 0.012;
      const elapsed = Math.max(1, event.timeStamp - lastTime);
      velocity = (turn / elapsed) * 16;
      scene.dragBy(turn);
      lastX = event.clientX;
      lastTime = event.timeStamp;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      el.classList.remove("is-dragging");
      scene.release(velocity);
    };
    // A slight lean toward the cursor, on devices with one.
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onPoint = (event: PointerEvent) =>
      scene.setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1
      );

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    if (fine)
      window.addEventListener("pointermove", onPoint, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointermove", onPoint);
    };
  }, [scene]);

  return (
    <div
      ref={stage}
      className={`stage${live ? " is-interactive" : ""}`}
      role="img"
      aria-label={STAGE.label}
    >
      <div className="stage-glow" />
      <div className="ripples">
        <i />
        <i />
        <i />
      </div>
      <div className="stage-floor" />
      <div ref={phoneBox} className="stage-phone">
        <PhonePoster step={shownStep} hidden={live} />
        {webgl && !reduce && !failed && (
          <PhoneCanvas onReady={setScene} onFail={() => setFailed(true)} />
        )}
      </div>
      <ul className="events">
        {STAGE.events.map((event, i) => {
          const Icon = ICONS[i];
          const classes = ["event", PLACES[i]];
          if (i <= shownStep) classes.push("is-shown");
          if (i === shownStep && !reduce) classes.push("is-active");
          if (i === 0 && shownStep === 0 && !reduce) classes.push("ringing");
          return (
            <li key={event.title} className={classes.join(" ")}>
              <span className="event-icon">
                <Icon size={18} />
              </span>
              <span className="event-text">
                <span className="event-title">
                  {event.title}
                  <time>{event.time}</time>
                </span>
                <span className="event-main">{event.main}</span>
                <span className="event-sub">{event.sub}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <span className="drag-hint">
        <MoveHorizontal size={15} /> {STAGE.hint}
      </span>
    </div>
  );
}
