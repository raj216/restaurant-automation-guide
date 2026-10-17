// Brio's ball: the shader that draws it, shared by the 3D phone (effects.ts,
// through three.js) and the Talk to Brio balls (site/brioBall.ts, plain
// WebGL), so Brio looks the same everywhere. No three.js here.

export const PALETTE = ["#ffb547", "#ff6a55", "#ff4f9a", "#8b5cf6", "#38bdf8"];

export const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Colored light blobs drifting inside a disc, a bright rim, a soft halo.
export const ORB_FRAGMENT = /* glsl */ `
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
