// How the hero's camera frames the phone. Shared with the CSS phone, which
// sizes itself to match so the hand-over to 3D doesn't jump. No three.js here.

export const CAMERA_FOV = 28;
export const PHONE_HEIGHT = 1.634;
export const HERO_FIT = { height: 2.1, width: 1.5 };

/** Camera distance that fits `fit` (scene units) into a canvas of this shape. */
export function fitDistance(fit: { height: number; width: number }, aspect: number) {
  const tan = Math.tan((CAMERA_FOV * Math.PI) / 360);
  return Math.max(fit.height / 2 / tan, fit.width / 2 / (tan * aspect)) + 0.4;
}

/** The hero phone's height on screen, in pixels, for a stage this size. */
export function heroPhonePixels(width: number, height: number) {
  const tan = Math.tan((CAMERA_FOV * Math.PI) / 360);
  return (PHONE_HEIGHT / (2 * tan * fitDistance(HERO_FIT, width / Math.max(1, height)))) * height;
}
