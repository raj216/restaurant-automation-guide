import { useEffect, useRef, useState } from "react";
import type { PhoneScene } from "./scene/phoneScene";

/** True when the browser can draw WebGL. */
export function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * True when the visitor asked their browser to save data, or is on a 2G or 3G
 * connection. The 3D phone is about 150 KB of code plus the work of drawing
 * it, so those visitors keep the lighter CSS phone (the same design, not spinnable).
 */
export function onSlowConnection() {
  const link = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return Boolean(
    link?.saveData || /^(slow-2g|2g|3g)$/.test(link?.effectiveType ?? "")
  );
}

export interface PhoneCanvasProps {
  /** Called once the 3D phone is drawn, with its controls. */
  onReady?: (scene: PhoneScene) => void;
  /** Called if the 3D phone fails or the GPU drops it. */
  onFail?: () => void;
}

/**
 * The 3D phone's canvas. The scene (three.js) loads after the page is up,
 * draws only while the canvas is on screen, and follows the canvas's size.
 */
export function PhoneCanvas({ onReady, onFail }: PhoneCanvasProps) {
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
        scene = await createPhoneScene(canvas, () => {
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
        const visible = new IntersectionObserver(
          ([entry]) => live.setActive(entry.isIntersecting),
          {
            rootMargin: "80px",
          }
        );
        visible.observe(box);
        cleanups.push(() => visible.disconnect());
        setReady(true);
        callbacks.current.onReady?.(live);
      } catch {
        callbacks.current.onFail?.();
      }
    };

    // Building the scene is heavy, so wait until the hero's headline has
    // arrived (about 2.4 s in) and the browser has a moment: doing it during
    // the entrance would stutter it on slower devices. The CSS phone shows
    // until then.
    let idle = 0;
    const later = window.setTimeout(
      () => {
        idle = window.requestIdleCallback
          ? window.requestIdleCallback(() => void start(), { timeout: 1200 })
          : window.setTimeout(() => void start(), 50);
      },
      Math.max(0, 2400 - performance.now())
    );
    return () => {
      cancelled = true;
      window.clearTimeout(later);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      cleanups.forEach(cleanup => cleanup());
      scene?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={`phone-canvas${ready ? " is-ready" : ""}`}
      aria-hidden="true"
    />
  );
}
