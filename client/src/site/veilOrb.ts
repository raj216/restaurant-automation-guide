import { BRIO_PALETTE, ORB_GLSL, RIM_GLSL } from "@/components/phone/scene/orbShader";

// The loading screen drawn like the 3D phone's call screen: its dark ground and
// purple light, the colored glow along the edge, and Brio's voice orb, from the
// same shader the phone uses.

/** One pixel of the phone's 640 px screen texture, in its scene units. */
const SCENE_PER_SCREEN_PX = 0.7289 / 640;
/** The orb's radius on the phone's screen texture, in its pixels. */
const PHONE_ORB_R = 132;
/** The edge glow keeps its own size, so it stays soft around a small orb. */
const EDGE = 0.5;

const VERTEX = `
  attribute vec2 aPos;
  void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
  precision highp float;
  uniform vec2 uRes;
  uniform vec2 uCenter;
  uniform float uRadius;
  uniform float uScale;
  uniform float uEdge;
  uniform float uCorner;
  uniform float uIntro;
  uniform float uTime;
  uniform float uLevel;
  uniform float uRing;
  uniform vec3 uColors[5];
  ${ORB_GLSL}
  ${RIM_GLSL}

  vec3 toLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
  }
  vec3 toSRGB(vec3 c) {
    c = max(c, 0.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }

  void main() {
    vec2 f = gl_FragCoord.xy;

    // The call screen's ground, and Brio's light behind the orb.
    vec3 ground = mix(vec3(5.0, 6.0, 10.0), vec3(12.0, 15.0, 24.0), f.y / uRes.y) / 255.0;
    float g = length(f - uCenter) / (470.0 * uScale);
    vec4 light = g < 0.45
      ? mix(vec4(139.0, 92.0, 246.0, 66.3), vec4(255.0, 79.0, 154.0, 20.4), g / 0.45) / 255.0
      : mix(vec4(255.0, 79.0, 154.0, 20.4), vec4(255.0, 79.0, 154.0, 0.0), clamp((g - 0.45) / 0.55, 0.0, 1.0)) / 255.0;
    vec3 color = toLinear(mix(ground, light.rgb, light.a));

    // The glow along the edge.
    vec2 p = f - uRes * 0.5;
    float d = roundedBox(p, uRes * 0.5, uCorner);
    color += brioRim(p, d / uEdge * ${SCENE_PER_SCREEN_PX.toFixed(8)}) * (0.34 + 0.34 * uLevel) * uIntro;

    // Brio.
    float grow = 0.7 + 0.3 * uIntro;
    vec4 orb = brioOrb((f - uCenter) / (uRadius * grow));
    orb.a *= uIntro;
    color = mix(color, orb.rgb, orb.a);

    gl_FragColor = vec4(toSRGB(color), 1.0);
  }
`;

function toLinear(hex: string): number[] {
  return [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/**
 * Draws Brio into `canvas`, filling the screen, with the orb centered on `spot`.
 * Returns false when the browser can't (no WebGL); the page then shows its CSS orb.
 */
export function startVeilOrb(canvas: HTMLCanvasElement, spot: HTMLElement): boolean {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return false;
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return false;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const at = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    res: at("uRes"),
    center: at("uCenter"),
    radius: at("uRadius"),
    scale: at("uScale"),
    edge: at("uEdge"),
    corner: at("uCorner"),
    intro: at("uIntro"),
    time: at("uTime"),
    level: at("uLevel"),
    ring: at("uRing"),
  };
  gl.uniform3fv(at("uColors"), new Float32Array(BRIO_PALETTE.flatMap(toLinear)));
  gl.uniform1f(u.ring, 0);

  // Sharp enough for the orb, light enough for a phone: at most 1.5x, and
  // about two million pixels in all.
  const area = window.innerWidth * window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2e6 / Math.max(1, area)));
  let start = 0;
  let last = 0;
  let level = 0;

  const frame = (now: number) => {
    if (!canvas.isConnected) return;
    if (!start) start = last = now;
    const time = (now - start) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    const box = spot.getBoundingClientRect();
    const radius = (box.width / 2) * dpr;

    // Brio speaking, as on the phone: the level rises and falls like speech.
    const speech = Math.abs(Math.sin(time * 6.3) * Math.sin(time * 2.1 + 1.3)) * 0.8 + 0.2;
    level += (speech - level) * Math.min(1, dt * 8);
    const intro = 1 - (1 - Math.min(1, time / 0.9)) ** 3;

    gl.uniform2f(u.res, width, height);
    gl.uniform2f(u.center, (box.left + box.width / 2) * dpr, height - (box.top + box.height / 2) * dpr);
    gl.uniform1f(u.radius, radius);
    gl.uniform1f(u.scale, radius / PHONE_ORB_R);
    gl.uniform1f(u.edge, EDGE * dpr);
    gl.uniform1f(u.corner, 28 * dpr);
    gl.uniform1f(u.intro, intro);
    gl.uniform1f(u.time, time + 2);
    gl.uniform1f(u.level, level);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return true;
}
