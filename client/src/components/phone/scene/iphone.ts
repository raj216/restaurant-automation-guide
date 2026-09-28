// The phone itself: an iPhone 18 Pro Max, built from Apple's published
// measurements. 163.4 × 78.0 × 8.75 mm, a 6.9-inch 2868 × 1320 display, the
// Dynamic Island at 13.5 mm wide, and the aluminum camera plateau across
// the top of the back. Scene units are 100 mm. There is no Apple logo.

import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  Vector2,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export const PHONE = {
  width: 0.78,
  height: 1.634,
  depth: 0.0875,
  /** Corner radius of the body, seen from the front. */
  corner: 0.125,
  /** Rounding where the sides meet the front and the back. */
  edge: 0.014,
  /** The display's lit area: 2868 × 1320 px at 460 ppi. */
  screenWidth: 0.7289,
  screenHeight: 1.5836,
  /** How far the camera plateau stands off the back. */
  plateau: 0.02,
} as const;

export type Finish = "silver" | "black" | "lightBlue" | "burgundy";

// The four iPhone 18 Pro finishes. The glass window on the back is tinted
// to match its aluminum.
const FINISHES: Record<Finish, { metal: number; glass: number; band: number }> = {
  silver: { metal: 0xd9dbdd, glass: 0xcdd0d2, band: 0xc3c6c8 },
  black: { metal: 0x3b3e43, glass: 0x34373b, band: 0x2b2d31 },
  lightBlue: { metal: 0xaec5dc, glass: 0xb5c9dd, band: 0x9fb6cc },
  burgundy: { metal: 0x5c1f2c, glass: 0x5f2331, band: 0x4b1825 },
};

/**
 * A rectangle with Apple-style continuous corners: each corner eases in
 * over a little more than its radius, so the curve never jumps.
 */
export function smoothRectShape(width: number, height: number, radius: number) {
  const shape = new Shape();
  const x = -width / 2;
  const y = -height / 2;
  const e = Math.min(radius * 1.2, width / 2, height / 2);
  const c = e * 0.36;
  shape.moveTo(x + e, y);
  shape.lineTo(x + width - e, y);
  shape.bezierCurveTo(x + width - c, y, x + width, y + c, x + width, y + e);
  shape.lineTo(x + width, y + height - e);
  shape.bezierCurveTo(x + width, y + height - c, x + width - c, y + height, x + width - e, y + height);
  shape.lineTo(x + e, y + height);
  shape.bezierCurveTo(x + c, y + height, x, y + height - c, x, y + height - e);
  shape.lineTo(x, y + e);
  shape.bezierCurveTo(x, y + c, x + c, y, x + e, y);
  return shape;
}

/** Extrudes a shape with rounded edges and smooth shading, centered on z = 0. */
function roundedSlab(shape: Shape, depth: number, edge: number, curveSegments = 24) {
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(0.0001, depth - 2 * edge),
    bevelEnabled: true,
    bevelThickness: edge,
    bevelSize: edge,
    bevelSegments: 7,
    curveSegments,
  });
  geometry.translate(0, 0, -(depth - 2 * edge) / 2);
  return smoothShading(geometry);
}

function smoothShading(geometry: BufferGeometry) {
  geometry.deleteAttribute("uv");
  geometry.deleteAttribute("normal");
  const merged = mergeVertices(geometry, 1e-5);
  merged.computeVertexNormals();
  geometry.dispose();
  return merged;
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A camera lens seen through its cover glass: dark, with a coated sheen. */
function lensTexture() {
  return canvasTexture(256, (ctx, s) => {
    const c = s / 2;
    const base = ctx.createRadialGradient(c, c, 0, c, c, c);
    base.addColorStop(0, "#050607");
    base.addColorStop(0.55, "#0b0e12");
    base.addColorStop(0.8, "#171b21");
    base.addColorStop(1, "#08090b");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    // The coated inner element: a violet-green sheen, as on real lenses.
    const sheen = ctx.createRadialGradient(c * 0.82, c * 0.78, 2, c, c, c * 0.52);
    sheen.addColorStop(0, "rgba(160,120,255,.55)");
    sheen.addColorStop(0.35, "rgba(70,150,160,.3)");
    sheen.addColorStop(0.7, "rgba(20,24,40,.2)");
    sheen.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,130,150,.35)";
    for (const [r, w] of [
      [0.52, 2],
      [0.66, 1.5],
      [0.9, 3],
    ]) {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(c, c, c * r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,.85)";
    ctx.beginPath();
    ctx.arc(c, c, c * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.ellipse(c * 0.72, c * 0.66, c * 0.08, c * 0.05, -0.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** The True Tone flash: frosted, with fine rings. */
function flashTexture() {
  return canvasTexture(128, (ctx, s) => {
    const c = s / 2;
    const base = ctx.createRadialGradient(c, c, 0, c, c, c);
    base.addColorStop(0, "#f7f1de");
    base.addColorStop(0.7, "#e9e1c8");
    base.addColorStop(1, "#bdb49c");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(120,110,80,.25)";
    ctx.lineWidth = 1.2;
    for (let r = 6; r < c; r += 5) {
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

/**
 * A photo studio for reflections: three.js's neutral room, plus a warm soft
 * box and a lantern-gold strip that keep the metal in the site's light.
 */
export function studioScene() {
  const studio = new RoomEnvironment();
  const box = (w: number, h: number, color: number, strength: number, x: number, y: number, z: number) => {
    const mesh = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: new Color(color).multiplyScalar(strength), side: DoubleSide })
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
  };
  box(8, 4.5, 0xffe7c4, 5, -4.5, 9, 7); // warm soft box, above left
  box(1.4, 9, 0xffb23f, 9, -9, 4, -5); // lantern strip behind, left
  box(1.2, 8, 0xdcebf4, 5, 10, 4, 3); // cool strip, right
  return studio;
}

export interface Iphone {
  group: Group;
  /** z of the display surface, in phone space. */
  screenZ: number;
  dispose(): void;
}

/**
 * Builds the phone. `screen` is the display's texture (transparent outside
 * its rounded corners); `studio` lights the metal and glass.
 */
export function buildIphone(screen: Texture, studio: Texture, finish: Finish = "silver"): Iphone {
  const { width: W, height: H, depth: D, corner: R, edge: E } = PHONE;
  const colors = FINISHES[finish];
  const group = new Group();
  const own: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(thing: T) => {
    own.push(thing);
    return thing;
  };

  // Materials.
  // Anodized aluminum: satin, so reflections soften.
  const aluminum = keep(
    new MeshPhysicalMaterial({
      color: colors.metal,
      metalness: 1,
      roughness: 0.34,
      clearcoat: 0.3,
      clearcoatRoughness: 0.28,
      envMap: studio,
      envMapIntensity: 1,
    })
  );
  const band = keep(new MeshStandardMaterial({ color: colors.band, roughness: 0.55, metalness: 0.2, envMap: studio }));
  // Frosted glass, tinted so it blends with the aluminum around it.
  const backGlass = keep(
    new MeshPhysicalMaterial({
      color: colors.glass,
      metalness: 0.9,
      roughness: 0.46,
      clearcoat: 0.5,
      clearcoatRoughness: 0.5,
      envMap: studio,
      envMapIntensity: 1,
    })
  );
  const blackGlass = keep(
    new MeshPhysicalMaterial({ color: 0x030405, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMap: studio })
  );
  const darkPart = keep(new MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.6, metalness: 0.2 }));
  const sapphire = keep(
    new MeshPhysicalMaterial({ color: 0x111418, roughness: 0.08, metalness: 0.4, clearcoat: 1, envMap: studio, envMapIntensity: 1.3 })
  );

  const mesh = (geometry: BufferGeometry, material: MeshStandardMaterial | MeshBasicMaterial) => {
    keep(geometry);
    const m = new Mesh(geometry, material);
    group.add(m);
    return m;
  };

  // The unibody.
  mesh(roundedSlab(smoothRectShape(W - 2 * E, H - 2 * E, R - E), D, E, 28), aluminum);

  // The front: black glass edge to edge, the display, and a faint reflection.
  const front = smoothRectShape(W - 2 * E, H - 2 * E, R - E);
  const cover = mesh(new ShapeGeometry(front, 28), blackGlass);
  cover.position.z = D / 2 + 0.0003;
  const screenZ = D / 2 + 0.0007;
  const display = mesh(
    new PlaneGeometry(PHONE.screenWidth, PHONE.screenHeight),
    keep(new MeshBasicMaterial({ map: screen, transparent: true, toneMapped: false }))
  );
  display.position.z = screenZ;
  display.renderOrder = 1;
  const reflection = mesh(
    new ShapeGeometry(front, 28),
    keep(
      new MeshPhysicalMaterial({
        color: 0x000000,
        roughness: 0.05,
        metalness: 0,
        clearcoat: 1,
        transparent: true,
        opacity: 0.1,
        envMap: studio,
        envMapIntensity: 1.5,
        depthWrite: false,
      })
    )
  );
  reflection.position.z = D / 2 + 0.0024;
  reflection.renderOrder = 2;

  // Buttons: Action button and volume on the left; side button and Camera Control on the right.
  const top = H / 2;
  const button = (length: number, fromTop: number, side: 1 | -1) => {
    const b = mesh(new RoundedBoxGeometry(0.012, length, 0.03, 3, 0.0055), aluminum);
    b.position.set(side * (W / 2 + 0.0005), top - fromTop, 0);
  };
  button(0.085, 0.3, -1);
  button(0.165, 0.485, -1);
  button(0.165, 0.68, -1);
  button(0.245, 0.54, 1);
  const control = mesh(new RoundedBoxGeometry(0.009, 0.205, 0.034, 3, 0.0042), aluminum);
  control.position.set(W / 2 - 0.0018, top - 1.02, 0);
  const crystal = mesh(new RoundedBoxGeometry(0.009, 0.19, 0.028, 3, 0.0038), sapphire);
  crystal.position.set(W / 2 - 0.0012, top - 1.02, 0);

  // Antenna bands where the sides run straight.
  for (const side of [1, -1]) {
    for (const y of [top - 0.16, -top + 0.16]) {
      const strip = mesh(new BoxGeometry(0.0012, 0.005, D * 0.66), band);
      strip.position.set(side * (W / 2 + 0.0001), y, 0);
    }
  }

  // The bottom edge: USB-C and the speaker and microphone holes.
  const port = mesh(new RoundedBoxGeometry(0.0895, 0.006, 0.0325, 3, 0.016), darkPart);
  port.position.set(0, -top + 0.0024, 0);
  const hole = keep(new CylinderGeometry(0.0055, 0.0055, 0.004, 14));
  for (const side of [1, -1]) {
    for (let i = 0; i < 6; i++) {
      const h = new Mesh(hole, darkPart);
      h.position.set(side * (0.12 + i * 0.021), -top + 0.0012, 0);
      group.add(h);
    }
  }

  // The back: a glass window tinted to match, under the camera plateau.
  const back = -D / 2;
  const plateauHeight = 0.44;
  const windowTop = top - plateauHeight - 0.034;
  const windowBottom = -top + 0.037;
  const glassPanel = mesh(new ShapeGeometry(smoothRectShape(W - 0.074, windowTop - windowBottom, 0.085), 20), backGlass);
  glassPanel.position.set(0, (windowTop + windowBottom) / 2, back - 0.0003);
  glassPanel.rotation.y = Math.PI;

  // The plateau follows the top corners of the body.
  const inset = E + 0.0015;
  const pw = W - 2 * inset;
  const plateauShape = new Shape();
  {
    const b = 0.004; // its own edge rounding
    const x0 = -pw / 2 + b;
    const x1 = pw / 2 - b;
    const y0 = top - plateauHeight + b;
    const y1 = top - inset - b;
    const e = (R - inset) * 1.2;
    const c = e * 0.36;
    const r2 = 0.02;
    plateauShape.moveTo(x0 + r2, y0);
    plateauShape.lineTo(x1 - r2, y0);
    plateauShape.quadraticCurveTo(x1, y0, x1, y0 + r2);
    plateauShape.lineTo(x1, y1 - e);
    plateauShape.bezierCurveTo(x1, y1 - c, x1 - c, y1, x1 - e, y1);
    plateauShape.lineTo(x0 + e, y1);
    plateauShape.bezierCurveTo(x0 + c, y1, x0, y1 - c, x0, y1 - e);
    plateauShape.lineTo(x0, y0 + r2);
    plateauShape.quadraticCurveTo(x0, y0, x0 + r2, y0);
    const T = PHONE.plateau;
    const slab = new ExtrudeGeometry(plateauShape, {
      depth: T + 0.001 - 2 * b,
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 4,
      curveSegments: 20,
    });
    slab.translate(0, 0, back - T + b);
    mesh(smoothShading(slab), aluminum);
  }
  const face = back - PHONE.plateau; // the plateau's outer face

  // Three lenses in a triangle, on the side that shows top-left from behind.
  // Outer wall up, across the chamfered top, inner wall down: a lathe
  // faces outward when its profile runs this way.
  const ringProfile = [
    [0.0825, 0],
    [0.0825, 0.0098],
    [0.078, 0.0135],
    [0.0645, 0.0135],
    [0.061, 0.0105],
    [0.061, 0],
  ].map(([x, y]) => new Vector2(x, y));
  const ringGeometry = keep(new LatheGeometry(ringProfile, 72));
  const lensMaterial = keep(
    new MeshPhysicalMaterial({ map: keep(lensTexture()), roughness: 0.04, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.02, envMap: studio, envMapIntensity: 1.4 })
  );
  const lensGeometry = keep(new CircleGeometry(0.0615, 64));
  const lensAt = (x: number, fromTop: number) => {
    const ring = new Mesh(ringGeometry, aluminum);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, top - fromTop, face + 0.0005);
    const glass = new Mesh(lensGeometry, lensMaterial);
    glass.rotation.y = Math.PI;
    glass.position.set(x, top - fromTop, face - 0.009);
    group.add(ring, glass);
  };
  lensAt(W / 2 - 0.135, 0.125);
  lensAt(W / 2 - 0.135, 0.305);
  lensAt(W / 2 - 0.292, 0.215);

  // Flash, microphone and LiDAR at the other end of the plateau.
  const flat = (radius: number, material: MeshStandardMaterial, x: number, fromTop: number) => {
    const disc = mesh(new CircleGeometry(radius, 48), material);
    disc.rotation.y = Math.PI;
    disc.position.set(x, top - fromTop, face - 0.0004);
  };
  flat(0.033, darkPart, -W / 2 + 0.13, 0.13);
  const flash = mesh(new CircleGeometry(0.029, 48), keep(new MeshStandardMaterial({ map: keep(flashTexture()), roughness: 0.35 })));
  flash.rotation.y = Math.PI;
  flash.position.set(-W / 2 + 0.13, top - 0.13, face - 0.0008);
  flat(0.006, darkPart, -W / 2 + 0.13, 0.215);
  flat(0.029, keep(new MeshPhysicalMaterial({ color: 0x07080a, roughness: 0.1, clearcoat: 1, envMap: studio })), -W / 2 + 0.13, 0.3);

  return {
    group,
    screenZ,
    dispose() {
      for (const thing of own) thing.dispose();
    },
  };
}
