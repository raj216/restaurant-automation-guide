// Brio's voice orb and the glow along the screen's edge, as GLSL shared by the
// 3D phone and the loading screen that opens the example dashboard, so both
// show the very same Brio. A shader that includes these declares the uniforms
// uTime, uLevel (voice, 0–1), uRing (ringing, 0–1) and uColors[5] (linear).

export const BRIO_PALETTE = ["#ffb547", "#ff6a55", "#ff4f9a", "#8b5cf6", "#38bdf8"];

// Colored light blobs drifting inside a disc, a bright rim, a soft halo.
export const ORB_GLSL = /* glsl */ `
  vec3 blob(vec2 p, vec2 c, float s, vec3 color) {
    vec2 d = p - c;
    return color * exp(-dot(d, d) / (s * s));
  }

  // p is in orb radii: the orb is r < 1, its halo beyond. Color and alpha.
  vec4 brioOrb(vec2 p) {
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
    return vec4(color * body + haloColor * halo, max(body, halo));
  }
`;

// A band of light just inside a rounded edge, its colors turning.
export const RIM_GLSL = /* glsl */ `
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

  // p from the center; d is how far inside the edge (negative), in the 3D
  // phone's scene units.
  vec3 brioRim(vec2 p, float d) {
    float band = exp(d * 55.0) * 0.9 + exp(d * 180.0) * 0.6;
    float turn = atan(p.y, p.x) / 6.28318 + uTime * 0.06;
    return spectrum(turn) * band;
  }
`;
