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
import { ORB_FRAGMENT, PALETTE, VERTEX } from "./orbShader";

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
