import { useInView } from "framer-motion";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { glyphs, type IconName } from "../brand/glyphs";
import { VIEWPORT, useMotionKit } from "./core";

export interface DrawIconProps {
  /** Which icon to draw. */
  name: IconName;
  /** Seconds to wait, once in view, before the strokes start drawing. */
  delay?: number;
  /** Width and height in px. Default 24. */
  size?: number;
  /** Line weight. Default 2. */
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A line icon whose strokes draw themselves in when it scrolls into view.
 * With motion off it is a plain Icon.
 */
export function DrawIcon({
  name,
  delay = 0,
  className,
  style,
  ...props
}: DrawIconProps) {
  const Glyph = glyphs[name];
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, VIEWPORT);
  const { reduce } = useMotionKit();
  // Normalise every stroke to length 1 before paint so the CSS dash trick
  // in index.css can draw any icon with the same two values.
  useLayoutEffect(() => {
    if (reduce) return;
    ref.current
      ?.querySelectorAll("path, circle, rect, line, polyline, polygon, ellipse")
      .forEach(shape => shape.setAttribute("pathLength", "1"));
  }, [reduce]);
  if (reduce) return <Glyph className={className} style={style} {...props} />;
  const classes = ["draw-icon", inView && "is-drawn", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Glyph
      ref={ref}
      className={classes}
      style={{ ...style, "--draw-delay": `${delay}s` } as CSSProperties}
      {...props}
    />
  );
}
