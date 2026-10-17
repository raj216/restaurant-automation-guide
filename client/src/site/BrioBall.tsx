import { useLayoutEffect, useRef } from "react";
import { mountBrioBall } from "./brioBallGl";

/**
 * Brio's ball, drawn by the same shader as on the 3D phone, over its parent
 * (which should be position: relative). It hums softly on its own, or follows
 * `voice` (0–1) during a call. Without WebGL it draws nothing, and the
 * parent's CSS ball shows instead.
 */
export function BrioBall({
  ringing = false,
  voice,
}: {
  ringing?: boolean;
  voice?: () => number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const props = useRef({ ringing, voice });
  props.current = { ringing, voice };
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return mountBrioBall(canvas, () => ({
      voice: props.current.voice?.() ?? null,
      ringing: props.current.ringing,
    }));
  }, []);
  return <canvas ref={ref} className="brio-ball" aria-hidden="true" />;
}
