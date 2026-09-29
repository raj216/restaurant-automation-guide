// Brio's two lights on the phone's screen, drawn live over the call screen:
// the voice orb, which swirls with Brio's spectrum and swells as someone
// speaks, and a glow that runs around the screen's edge while Brio is on the
// line.

import {
  AdditiveBlending,
  Color,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
} from "three";

const PALETTE = ["#ffb547", "#ff6a55", "#ff4f9a", "#8b5cf6", "#38bdf8"];

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Colored light blobs drifting inside a disc, a bright rim, a soft halo.
const ORB_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uLevel;
  uniform float uRing;
  uniform vec3 uColors[5];
  varying vec2 vUv;

  vec3 blob(vec2 p, vec2 c, float s, vec3 color) {
    vec2 d = p - c;
    return color * exp(-dot(d, d) / (s * s));
  }

  void main() {
    // The plane is 1.5 orb radii across each way: the orb is r < 1.
    vec2 p = (vUv - 0.5) * 3.0;
    float angle = atan(p.y, p.x);
    float t = uTime * (0.55 + 0.5 * uLevel);
    float wobble = 1.0
      + (0.018 + 0.06 * uLevel) * sin(angle * 3.0 + uTime * 2.1) * sin(angle * 2.0 - uTime * 1.6)
      + 0.05 * uRing * (0.5 + 0.5 * sin(uTime * 9.0));
    float r = length(p) / wobble;

    vec3 color = vec3(0.03, 0.02, 0.07);
    color += blob(p, vec2(sin(t * 1.1) * 0.5, cos(t * 0.9) * 0.45), 0.72, uColors[3]);
    color += blob(p, vec2(cos(t * 0.7 + 1.0) * 0.55, sin(t * 1.3 + 2.0) * 0.5), 0.66, uColors[2]);
    color += blob(p, vec2(sin(t * 0.8 + 4.0) * 0.5, cos(t * 1.2 + 3.0) * 0.55), 0.62, uColors[4]);
    color += blob(p, vec2(cos(t * 1.4 + 2.0) * 0.45, sin(t * 0.6 + 5.0) * 0.5), 0.58, uColors[0]);
    color += blob(p, vec2(sin(t * 0.5 + 1.5) * 0.35, cos(t * 1.7 + 0.5) * 0.35), 0.48, uColors[1]) * 0.7;
    color *= 0.85 + 0.35 * uLevel;

    // A brighter rim, and a glassy highlight up and to the left.
    float rim = pow(clamp(r, 0.0, 1.0), 7.0);
    color += rim * mix(uColors[4], uColors[2], 0.5 + 0.5 * sin(angle + uTime)) * 0.9;
    vec2 h = (p - vec2(-0.32, 0.4)) * vec2(1.0, 1.7);
    color += vec3(1.0) * smoothstep(0.42, 0.0, length(h)) * 0.28;

    float body = 1.0 - smoothstep(0.985, 1.0, r);
    float halo = exp(-max(r - 1.0, 0.0) * 5.0) * (1.0 - body) * (0.28 + 0.45 * uLevel + 0.4 * uRing);
    vec3 haloColor = mix(uColors[3], uColors[2], 0.5 + 0.5 * sin(angle * 2.0 - uTime));
    gl_FragColor = vec4(color * body + haloColor * halo, max(body, halo));
    #include <colorspace_fragment>
  }
`;

// A band of light just inside the screen's rounded edge, its colors turning.
const RIM_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;
  uniform vec2 uSize;
  uniform float uCorner;
  uniform vec3 uColors[5];
  varying vec2 vUv;

  float roundedBox(vec2 p, vec2 half_, float r) {
    vec2 q = abs(p) - half_ + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  vec3 spectrum(float x) {
    x = fract(x) * 5.0;
    int i = int(floor(x));
    float f = smoothstep(0.0, 1.0, fract(x));
    vec3 a = uColors[0];
    vec3 b = uColors[1];
    if (i == 1) { a = uColors[1]; b = uColors[2]; }
    else if (i == 2) { a = uColors[2]; b = uColors[3]; }
    else if (i == 3) { a = uColors[3]; b = uColors[4]; }
    else if (i >= 4) { a = uColors[4]; b = uColors[0]; }
    return mix(a, b, f);
  }

  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float d = roundedBox(p, uSize * 0.5, uCorner);
    if (d > 0.0) discard;
    float band = exp(d * 55.0) * 0.9 + exp(d * 180.0) * 0.6;
    float turn = atan(p.y, p.x) / 6.28318 + uTime * 0.06;
    vec3 color = spectrum(turn);
    gl_FragColor = vec4(color * band * uStrength, 1.0);
    #include <colorspace_fragment>
  }
`;

const palette = () => PALETTE.map(hex => new Color(hex));

export interface ScreenEffects {
  orb: Mesh<PlaneGeometry, ShaderMaterial>;
  rim: Mesh<PlaneGeometry, ShaderMaterial>;
  /** Sets the time, the voice level (0–1), and ringing (0–1). */
  update(time: number, level: number, ring: number): void;
  dispose(): void;
}

/**
 * The orb, `diameter` across, and the rim glow for a screen `width` ×
 * `height` with corners of radius `corner` (scene units).
 */
export function createScreenEffects(
  diameter: number,
  width: number,
  height: number,
  corner: number
): ScreenEffects {
  const orbMaterial = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uRing: { value: 0 },
      uColors: { value: palette() },
    },
    vertexShader: VERTEX,
    fragmentShader: ORB_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    toneMapped: false,
  });
  const orb = new Mesh(
    new PlaneGeometry(diameter * 1.5, diameter * 1.5),
    orbMaterial
  );

  const rimMaterial = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: 0.6 },
      uSize: { value: new Vector2(width, height) },
      uCorner: { value: corner },
      uColors: { value: palette() },
    },
    vertexShader: VERTEX,
    fragmentShader: RIM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const rim = new Mesh(new PlaneGeometry(width, height), rimMaterial);

  return {
    orb,
    rim,
    update(time, level, ring) {
      orbMaterial.uniforms.uTime.value = time;
      orbMaterial.uniforms.uLevel.value = level;
      orbMaterial.uniforms.uRing.value = ring;
      rimMaterial.uniforms.uTime.value = time;
      rimMaterial.uniforms.uStrength.value = 0.34 + 0.34 * level + 0.5 * ring;
    },
    dispose() {
      orb.geometry.dispose();
      orbMaterial.dispose();
      rim.geometry.dispose();
      rimMaterial.dispose();
    },
  };
}
