import { useEffect, useRef, useState } from "react";
import { Icon, useMotionKit } from "@/kit";
import { PhoneCanvas, hasWebGL } from "./PhoneCanvas";
import { PhonePoster } from "./PhonePoster";
import type { PhoneScene } from "./scene/phoneScene";

/**
 * The hero's 3D phone, floating in its glow. Visitors can spin it by dragging
 * sideways; vertical swipes still scroll the page.
 */
export function HeroPhone() {
  const { reduce } = useMotionKit();
  const [webgl] = useState(() => typeof window !== "undefined" && hasWebGL());
  const [scene, setScene] = useState<PhoneScene | null>(null);
  const [failed, setFailed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const live = Boolean(scene) && !failed;

  useEffect(() => {
    const el = stage.current;
    if (!scene || !el) return;
    let down = false;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
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
      scene.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    if (fine) window.addEventListener("pointermove", onPoint, { passive: true });
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
      className={`phone-stage hero-stage${live ? " is-interactive" : ""}`}
      role="img"
      aria-label="A phone showing the Kadmivo mark"
    >
      <div className="stage-halo" />
      <div className="stage-orbit" />
      <div className="stage-floor" />
      <PhonePoster variant="hero" hidden={live} />
      {webgl && !reduce && !failed && (
        <PhoneCanvas mode="hero" onReady={setScene} onFail={() => setFailed(true)} />
      )}
      <span className="drag-hint">
        <Icon name="rotate" size={16} /> Drag to spin
      </span>
    </div>
  );
}
