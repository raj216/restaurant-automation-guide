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
import { BRIO_PALETTE, ORB_GLSL, RIM_GLSL } from "./orbShader";

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ORB_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uLevel;
  uniform float uRing;
  uniform vec3 uColors[5];
  varying vec2 vUv;
  ${ORB_GLSL}
  void main() {
    // The plane is 1.5 orb radii across each way: the orb is r < 1.
    gl_FragColor = brioOrb((vUv - 0.5) * 3.0);
    #include <colorspace_fragment>
  }
`;

const RIM_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;
  uniform vec2 uSize;
  uniform float uCorner;
  uniform vec3 uColors[5];
  varying vec2 vUv;
  ${RIM_GLSL}
  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float d = roundedBox(p, uSize * 0.5, uCorner);
    if (d > 0.0) discard;
    gl_FragColor = vec4(brioRim(p, d) * uStrength, 1.0);
    #include <colorspace_fragment>
  }
`;

const palette = () => BRIO_PALETTE.map(hex => new Color(hex));

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
