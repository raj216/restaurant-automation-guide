// Brio's ball for Talk to Brio, drawn by the very shader the 3D phone uses
// (orbShader.ts), in plain WebGL so three.js stays off the page until the
// phone needs it. One hidden WebGL canvas draws every ball in turn and copies
// it onto that ball's own canvas. Without WebGL, the CSS ball shows instead.

import { ORB_FRAGMENT, PALETTE } from "@/components/phone/scene/orbShader";

export interface BallState {
  /** How loud Brio is (0–1) during a call, or null to hum softly on its own. */
  voice: number | null;
  /** True while the ball rings, like an incoming call. */
  ringing: boolean;
}

interface Ball {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  read: () => BallState;
  level: number;
  ring: number;
}

const VERTEX = /* glsl */ `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

// three.js converts the shader's linear colors for the screen with this
// include; here it's done by hand, with the result premultiplied for the canvas.
const FRAGMENT =
  /* glsl */ `
  precision highp float;
  vec3 toScreen(vec3 c) {
    return mix(pow(c, vec3(0.41666)) * 1.055 - vec3(0.055), c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
  }
` +
  ORB_FRAGMENT.replace(
    "#include <colorspace_fragment>",
    "gl_FragColor = vec4(toScreen(gl_FragColor.rgb) * gl_FragColor.a, gl_FragColor.a);"
  );

/** The palette in linear light, as three.js hands it to the shader. */
function linearPalette() {
  return PALETTE.flatMap(hex =>
    [1, 3, 5].map(i => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
  );
}

let gl: WebGLRenderingContext | null | undefined;
let drawing: HTMLCanvasElement;
let uniforms: Record<"time" | "level" | "ring", WebGLUniformLocation | null>;
const balls = new Set<Ball>();
let frame = 0;
let last = 0;
let time = 0;

function setUp() {
  if (gl !== undefined) return gl;
  gl = null;
  try {
    drawing = document.createElement("canvas");
    const context = drawing.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!context) return null;
    const compile = (type: number, source: string) => {
      const shader = context.createShader(type)!;
      context.shaderSource(shader, source);
      context.compileShader(shader);
      return shader;
    };
    const program = context.createProgram()!;
    context.attachShader(program, compile(context.VERTEX_SHADER, VERTEX));
    context.attachShader(program, compile(context.FRAGMENT_SHADER, FRAGMENT));
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) return null;
    context.useProgram(program);

    const corners = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, corners);
    context.bufferData(
      context.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      context.STATIC_DRAW
    );
    const position = context.getAttribLocation(program, "aPosition");
    context.enableVertexAttribArray(position);
    context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
    context.uniform3fv(
      context.getUniformLocation(program, "uColors"),
      linearPalette()
    );
    uniforms = {
      time: context.getUniformLocation(program, "uTime"),
      level: context.getUniformLocation(program, "uLevel"),
      ring: context.getUniformLocation(program, "uRing"),
    };
    context.clearColor(0, 0, 0, 0);
    drawing.addEventListener("webglcontextlost", () => {
      gl = null;
      cancelAnimationFrame(frame);
      frame = 0;
      balls.forEach(ball =>
        ball.canvas.parentElement?.classList.remove("is-gl")
      );
      balls.clear();
    });
    gl = context;
  } catch {
    gl = null;
  }
  return gl;
}

const still = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Brio's voice when the ball hums on its own: it rises and falls like speech, as on the phone. */
const hum = (t: number) =>
  0.5 * (Math.abs(Math.sin(t * 6.3) * Math.sin(t * 2.1 + 1.3)) * 0.8 + 0.2);

function draw(ball: Ball, dt: number) {
  const { canvas } = ball;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const size = Math.round(canvas.clientWidth * scale);
  if (!gl || size === 0) return;
  if (canvas.width !== size) canvas.width = canvas.height = size;
  if (drawing.width < size) drawing.width = drawing.height = size;

  const state = ball.read();
  const voice = state.voice ?? hum(time);
  ball.level += (voice - ball.level) * Math.min(1, dt * 8);
  ball.ring += ((state.ringing ? 1 : 0) - ball.ring) * Math.min(1, dt * 6);

  gl.viewport(0, 0, size, size);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1f(uniforms.time, time);
  gl.uniform1f(uniforms.level, ball.level);
  gl.uniform1f(uniforms.ring, ball.ring);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  ball.context.clearRect(0, 0, size, size);
  ball.context.drawImage(
    drawing,
    0,
    drawing.height - size,
    size,
    size,
    0,
    0,
    size,
    size
  );
}

function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  balls.forEach(ball => draw(ball, dt));
  frame = balls.size && !document.hidden ? requestAnimationFrame(tick) : 0;
}

function run() {
  if (frame || !balls.size || document.hidden || still()) return;
  last = performance.now();
  frame = requestAnimationFrame(tick);
}

if (typeof document !== "undefined")
  document.addEventListener("visibilitychange", run);

/**
 * Draws Brio's ball on `canvas`, whose parent gets the class "is-gl" (so its
 * CSS ball can step aside). Returns the clean-up, or nothing without WebGL.
 */
export function mountBrioBall(
  canvas: HTMLCanvasElement,
  read: () => BallState
): (() => void) | undefined {
  const context = canvas.getContext("2d");
  if (!context || !setUp()) return;
  const ball: Ball = { canvas, context, read, level: 0, ring: 0 };
  // Start where it would be, so the first frame already looks right.
  if (!time) time = 2;
  ball.level = read().voice ?? hum(time);
  ball.ring = read().ringing ? 1 : 0;
  balls.add(ball);
  draw(ball, 0);
  canvas.parentElement?.classList.add("is-gl");
  run();
  return () => {
    balls.delete(ball);
    canvas.parentElement?.classList.remove("is-gl");
    if (!balls.size) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}
