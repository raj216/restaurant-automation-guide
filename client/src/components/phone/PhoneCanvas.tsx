import type { MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { PhoneScene, SceneMode } from "./scene/phoneScene";

/** True when the browser can draw WebGL. */
export function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface PhoneCanvasProps {
  mode: SceneMode;
  /** Story progress, 0–1. */
  progress?: MotionValue<number>;
  /** Called once the 3D phone is drawn, with its controls. */
  onReady?: (scene: PhoneScene) => void;
  /** Called if the 3D phone fails or the GPU drops it. */
  onFail?: () => void;
}

/**
 * The 3D phone's canvas. The scene (three.js) loads after the page is up,
 * draws only while the canvas is on screen, and follows the canvas's size.
 */
export function PhoneCanvas({ mode, progress, onReady, onFail }: PhoneCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onReady, onFail });
  callbacks.current = { onReady, onFail };

  useEffect(() => {
    const canvas = ref.current;
    const box = canvas?.parentElement;
    if (!canvas || !box) return;
    let scene: PhoneScene | undefined;
    let cancelled = false;
    const cleanups: (() => void)[] = [];

    const start = async () => {
      try {
        const { createPhoneScene } = await import("./scene/phoneScene");
        if (cancelled) return;
        scene = await createPhoneScene(canvas, mode, () => {
          setReady(false);
          callbacks.current.onFail?.();
        });
        if (cancelled) {
          scene.dispose();
          return;
        }
        const live = scene;
        const fit = () => live.resize(box.clientWidth, box.clientHeight);
        const resize = new ResizeObserver(fit);
        resize.observe(box);
        cleanups.push(() => resize.disconnect());
        fit();
        if (progress) {
          live.setProgress(progress.get());
          cleanups.push(progress.on("change", value => live.setProgress(value)));
        }
        const visible = new IntersectionObserver(([entry]) => live.setActive(entry.isIntersecting), {
          rootMargin: "80px",
        });
        visible.observe(box);
        cleanups.push(() => visible.disconnect());
        setReady(true);
        callbacks.current.onReady?.(live);
      } catch {
        callbacks.current.onFail?.();
      }
    };

    // Load once the page is up and the browser has a moment.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void start(), { timeout: 1200 })
      : window.setTimeout(() => void start(), 250);
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      cleanups.forEach(cleanup => cleanup());
      scene?.dispose();
    };
  }, [mode, progress]);

  return <canvas ref={ref} className={`phone-canvas${ready ? " is-ready" : ""}`} aria-hidden="true" />;
}
