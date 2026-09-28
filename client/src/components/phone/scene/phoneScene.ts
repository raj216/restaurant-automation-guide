// The 3D phone. Plain three.js, loaded on demand: the page shows a CSS phone
// until this is ready.
//
// "hero": the phone floats and sways; visitors can spin it by dragging.
// "story": scroll progress (0–1) drives four steps. The phone rings, checks
// the menu on its screen, prints the paper order ticket out of its top edge,
// and the ticket lands with the team, who stamp it.

import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferAttribute,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Quaternion,
  SRGBColorSpace,
  Scene,
  Texture,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  SCREEN_H,
  SCREEN_W,
  TICKET_H,
  TICKET_W,
  drawScreen,
  drawScreenMask,
  drawStamp,
  drawTicket,
  loadFonts,
  type ScreenKind,
} from "./textures";

export type SceneMode = "hero" | "story";

export interface PhoneScene {
  /** Story progress, 0–1. */
  setProgress(value: number): void;
  /** Pointer position over the page, each axis -1–1, for a slight parallax. */
  setPointer(x: number, y: number): void;
  /** Dragging: hold, turn by a number of radians, let go with a velocity. */
  grab(): void;
  dragBy(radians: number): void;
  release(velocity: number): void;
  resize(width: number, height: number): void;
  /** Render only while on screen. */
  setActive(active: boolean): void;
  dispose(): void;
}

// Phone and ticket sizes, in scene units (the phone is 1.6 tall).
const W = 0.78;
const H = 1.6;
const D = 0.09;
const SW = W - 0.056;
const SH = H - 0.056;
const TW = 0.62;
const TH = (TW * TICKET_H) / TICKET_W;
const SLOT = H / 2 - 0.015; // where the ticket leaves the phone, in phone space

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const backOut = (t: number) => {
  const c = 1.8;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

// Story poses at progress 0, .25, .5, .75 and 1: x, y, z, yaw, pitch, roll.
const POSES = [
  [0, 0.08, 0, -0.55, 0.1, 0.06],
  [0, 0.08, 0, -0.28, 0.08, 0.03],
  [0, 0.02, 0.12, 0, 0.03, 0],
  [0, -0.5, 0, 0.05, 0.48, 0],
  [-0.62, -0.42, -0.6, 0.55, 0.28, 0.02],
];
const LANDED_POSITION = new Vector3(0.52, 0.16, 0.55);
const LANDED_QUATERNION = new Quaternion().setFromEuler(new Euler(-0.06, -0.2, 0.05));

function makeTexture(canvas: HTMLCanvasElement, renderer: WebGLRenderer) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function createPhoneScene(
  canvas: HTMLCanvasElement,
  mode: SceneMode,
  onLost?: () => void
): Promise<PhoneScene> {
  await loadFonts();

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const lost = (event: Event) => {
    event.preventDefault();
    onLost?.();
  };
  canvas.addEventListener("webglcontextlost", lost);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;

  const camera = new PerspectiveCamera(28, 1, 0.1, 60);

  // Warm key light, the lantern glow from behind, a cool fill.
  const key = new DirectionalLight(0xffe7c2, 1.5);
  key.position.set(2.5, 3, 4);
  const rim = new PointLight(0xffb23f, 7, 7, 1.6);
  rim.position.set(-1.4, 0.8, -1.3);
  const fill = new AmbientLight(0x9cb0b8, 0.28);
  scene.add(key, rim, fill);

  // ── The phone ──────────────────────────────────────────────────────────
  const phone = new Group();
  const metal = new MeshPhysicalMaterial({
    color: 0x1b2e37,
    metalness: 0.78,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.15,
  });
  phone.add(new Mesh(new RoundedBoxGeometry(W, H, D, 6, 0.12), metal));

  const screenCanvas = canvasOf(SCREEN_W, SCREEN_H);
  drawScreen(screenCanvas, "idle");
  const screenTexture = makeTexture(screenCanvas, renderer);
  const screen = new Mesh(
    new PlaneGeometry(SW, SH),
    new MeshBasicMaterial({ map: screenTexture, transparent: true, toneMapped: false })
  );
  screen.position.z = D / 2 + 0.0015;
  phone.add(screen);

  // A faint glass reflection over the screen.
  const maskCanvas = canvasOf(160, 342);
  drawScreenMask(maskCanvas);
  const mask = new CanvasTexture(maskCanvas);
  const glass = new Mesh(
    new PlaneGeometry(SW, SH),
    new MeshPhysicalMaterial({
      color: 0x000000,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      transparent: true,
      opacity: 0.12,
      alphaMap: mask,
      envMapIntensity: 1.6,
      depthWrite: false,
    })
  );
  glass.position.z = D / 2 + 0.003;
  phone.add(glass);

  // Side buttons.
  const button = (height: number, y: number, side: 1 | -1) => {
    const mesh = new Mesh(new RoundedBoxGeometry(0.014, height, 0.03, 2, 0.006), metal);
    mesh.position.set(side * (W / 2 + 0.004), y, 0);
    phone.add(mesh);
  };
  button(0.22, 0.36, 1);
  button(0.12, 0.44, -1);
  button(0.12, 0.27, -1);

  // The back: a glowing lantern ring and a camera block.
  const logo = new Mesh(
    new TorusGeometry(0.15, 0.012, 16, 96),
    new MeshStandardMaterial({ color: 0xffb23f, emissive: 0xffb23f, emissiveIntensity: 1.5, roughness: 0.4 })
  );
  logo.position.set(0, 0.02, -D / 2 - 0.004);
  phone.add(logo);
  const cameraBlock = new Mesh(
    new RoundedBoxGeometry(0.27, 0.27, 0.022, 4, 0.07),
    new MeshPhysicalMaterial({ color: 0x0c1a20, metalness: 0.4, roughness: 0.22, clearcoat: 1 })
  );
  cameraBlock.position.set(0.2, 0.56, -D / 2 - 0.009);
  phone.add(cameraBlock);
  const lensMaterial = new MeshPhysicalMaterial({ color: 0x050b0e, metalness: 0.2, roughness: 0.05, clearcoat: 1 });
  for (const [x, y] of [
    [0.25, 0.61],
    [0.15, 0.51],
  ]) {
    const lens = new Mesh(new CylinderGeometry(0.048, 0.048, 0.02, 40), lensMaterial);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, y, -D / 2 - 0.022);
    phone.add(lens);
  }

  // The voice waveform shown while the call is answered.
  const bars = new Group();
  const barMaterial = new MeshBasicMaterial({ color: 0xffb23f, toneMapped: false });
  const barCount = 17;
  for (let i = 0; i < barCount; i++) {
    const bar = new Mesh(new PlaneGeometry(0.016, 1), barMaterial);
    bar.position.set(-0.24 + (i * 0.48) / (barCount - 1), -0.013, D / 2 + 0.0025);
    bars.add(bar);
  }
  bars.visible = false;
  phone.add(bars);
  scene.add(phone);

  // ── The ticket ─────────────────────────────────────────────────────────
  const ticketCanvas = canvasOf(TICKET_W, TICKET_H);
  drawTicket(ticketCanvas);
  const ticketTexture = makeTexture(ticketCanvas, renderer);
  const ticketGeometry = new PlaneGeometry(TW, TH, 1, 56);
  const ticketPositions = ticketGeometry.attributes.position as BufferAttribute;
  const baseY = Array.from({ length: ticketPositions.count }, (_, i) => ticketPositions.getY(i));
  const clip = new Plane(new Vector3(0, 1, 0), 1000);
  const ticket = new Mesh(
    ticketGeometry,
    new MeshStandardMaterial({
      map: ticketTexture,
      roughness: 0.8,
      metalness: 0,
      side: DoubleSide,
      transparent: true,
      alphaTest: 0.5,
      toneMapped: false,
      clippingPlanes: [clip],
    })
  );
  ticket.visible = false;
  scene.add(ticket);

  const stampCanvas = canvasOf(256, 256);
  drawStamp(stampCanvas);
  const stamp = new Mesh(
    new PlaneGeometry(0.2, 0.2),
    new MeshBasicMaterial({ map: makeTexture(stampCanvas, renderer), transparent: true, toneMapped: false, depthWrite: false })
  );
  stamp.position.set(TW * 0.24, -TH * 0.08, 0.006);
  stamp.scale.setScalar(0.0001);
  ticket.add(stamp);

  let bent = "";
  /** Curls the ticket from `start` (ticket space) up, around a circle of radius 1 / curvature. */
  function bendTicket(start: number, curvature: number) {
    const key = `${start.toFixed(4)} ${curvature.toFixed(4)}`;
    if (key === bent) return;
    bent = key;
    for (let i = 0; i < ticketPositions.count; i++) {
      const y = baseY[i];
      if (y <= start || curvature < 0.002) {
        ticketPositions.setY(i, y);
        ticketPositions.setZ(i, 0);
        continue;
      }
      const radius = 1 / curvature;
      const angle = (y - start) / radius;
      ticketPositions.setY(i, start + radius * Math.sin(angle));
      ticketPositions.setZ(i, radius * (1 - Math.cos(angle)));
    }
    ticketPositions.needsUpdate = true;
    ticketGeometry.computeVertexNormals();
  }

  // ── State ──────────────────────────────────────────────────────────────
  let target = 0;
  let progress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let aimX = 0;
  let aimY = 0;
  let spin = 0;
  let spinVelocity = 0;
  let held = false;
  let time = 0;
  let last = 0;
  let frame = 0;
  let active = false;
  let screenKey = "";
  let fitHeight = mode === "hero" ? 2.05 : 2.45;
  let fitWidth = mode === "hero" ? 1.5 : 2.35;

  const local = new Matrix4();
  const attached = new Matrix4();
  const attachedPosition = new Vector3();
  const attachedQuaternion = new Quaternion();
  const attachedScale = new Vector3();
  const up = new Vector3();
  const slot = new Vector3();

  function setScreen(kind: ScreenKind, k: number) {
    const steps = kind === "menu" ? 30 : kind === "order" ? 24 : kind === "team" ? 12 : 1;
    const key = `${kind}:${Math.round(k * steps)}`;
    if (key === screenKey) return;
    screenKey = key;
    drawScreen(screenCanvas, kind, Math.round(k * steps) / steps);
    screenTexture.needsUpdate = true;
  }

  function place(p: number) {
    const i = Math.min(3, Math.floor(p * 4));
    const t = smooth(p * 4 - i);
    const [x, y, z, yaw, pitch, roll] = POSES[i].map((v, j) => lerp(v, POSES[i + 1][j], t));
    return { x, y, z, yaw, pitch, roll };
  }

  function update(dt: number) {
    time += dt;
    const bob = Math.sin(time * 0.9) * 0.035;
    aimX += (pointerX - aimX) * Math.min(1, dt * 4);
    aimY += (pointerY - aimY) * Math.min(1, dt * 4);

    if (mode === "hero") {
      if (!held) {
        spin += spinVelocity;
        spinVelocity *= Math.pow(0.9, dt * 60);
        if (Math.abs(spinVelocity) < 0.0008) {
          spin = Math.atan2(Math.sin(spin), Math.cos(spin));
          spin *= 1 - Math.min(1, dt * 0.45);
        }
      }
      phone.position.set(0, 0.03 + bob, 0);
      phone.rotation.set(
        0.1 + aimY * 0.06 + Math.sin(time * 0.7) * 0.02,
        -0.42 + Math.sin(time * 0.45) * 0.2 + spin + aimX * 0.12,
        0.06
      );
      setScreen("idle", 0);
      return;
    }

    progress += (target - progress) * Math.min(1, dt * 10);
    const p = progress;
    const a = seg(p, 0, 0.25);
    const c = seg(p, 0.5, 0.75);
    const d = seg(p, 0.75, 1);
    const pose = place(p);

    // Ringing: a quick shake while the call comes in.
    const ringing = a > 0.08 && a < 0.5 ? Math.sin((Math.PI * (a - 0.08)) / 0.42) : 0;
    phone.position.set(pose.x, pose.y + bob * (1 - d * 0.6), pose.z);
    phone.rotation.set(
      pose.pitch,
      pose.yaw + Math.sin(time * 37) * 0.02 * ringing,
      pose.roll + Math.sin(time * 42) * 0.035 * ringing
    );

    let kind: ScreenKind;
    let k = 0;
    if (p < 0.25) kind = a < 0.08 ? "idle" : a < 0.5 ? "ringing" : "answered";
    else if (p < 0.5) [kind, k] = ["menu", seg(p, 0.25, 0.5)];
    else if (p < 0.75) [kind, k] = ["order", c];
    else [kind, k] = ["team", d];
    setScreen(kind, k);

    bars.visible = kind === "answered";
    if (bars.visible) {
      bars.children.forEach((bar, i) => {
        const level = Math.abs(Math.sin(time * 6.2 + i * 0.7)) * (0.55 + 0.45 * Math.sin(time * 2.3 + i * 1.3));
        bar.scale.y = 0.02 + 0.2 * level;
      });
    }

    // The ticket prints during the third step, then lands with the team.
    ticket.visible = p > 0.5;
    if (!ticket.visible) return;
    phone.updateMatrixWorld(true);
    const printed = smooth(seg(c, 0.06, 0.92)) * TH;
    const center = SLOT - TH / 2 + printed;
    local.makeTranslation(0, center, 0);
    attached.multiplyMatrices(phone.matrixWorld, local);
    attached.decompose(attachedPosition, attachedQuaternion, attachedScale);
    const land = smooth(seg(d, 0, 0.55));
    ticket.position.lerpVectors(attachedPosition, LANDED_POSITION, land);
    ticket.quaternion.slerpQuaternions(attachedQuaternion, LANDED_QUATERNION, land);

    // While printing, everything below the slot stays hidden inside the phone.
    if (land > 0) clip.set(up.set(0, 1, 0), 1000);
    else {
      up.set(0, 1, 0).applyQuaternion(phone.quaternion).normalize();
      slot.set(0, SLOT, 0).applyMatrix4(phone.matrixWorld);
      clip.setFromNormalAndCoplanarPoint(up, slot);
    }
    const curvature = lerp(0.4, 1.05, printed / TH) * (1 - land);
    bendTicket(SLOT - center, curvature);

    const stamped = clamp01((d - 0.5) / 0.18);
    stamp.scale.setScalar(stamped > 0 ? Math.max(0.0001, backOut(stamped)) : 0.0001);
  }

  function frameCamera(width: number, height: number) {
    const aspect = width / Math.max(1, height);
    camera.aspect = aspect;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const distance = Math.max(fitHeight / 2 / tan, fitWidth / 2 / (tan * aspect));
    camera.position.set(0, 0, distance + 0.4);
    camera.lookAt(0, mode === "story" ? -0.05 : 0, 0);
    camera.updateProjectionMatrix();
  }

  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    update(dt);
    renderer.render(scene, camera);
  }

  function render() {
    update(0);
    renderer.render(scene, camera);
  }

  return {
    setProgress(value) {
      target = clamp01(value);
      if (!active) {
        progress = target;
        render();
      }
    },
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    grab() {
      held = true;
      spinVelocity = 0;
    },
    dragBy(radians) {
      spin += radians;
    },
    release(velocity) {
      held = false;
      spinVelocity = Math.max(-0.25, Math.min(0.25, velocity));
    },
    resize(width, height) {
      if (width < 2 || height < 2) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.75 : 2));
      renderer.setSize(width, height, false);
      if (mode === "story" && width / height < 0.9) {
        fitHeight = 2.5;
        fitWidth = 1.95;
      } else if (mode === "story") {
        fitHeight = 2.45;
        fitWidth = 2.35;
      }
      frameCamera(width, height);
      render();
    },
    setActive(value) {
      if (value === active) return;
      active = value;
      if (active) {
        last = 0;
        frame = requestAnimationFrame(loop);
      } else cancelAnimationFrame(frame);
    },
    dispose() {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("webglcontextlost", lost);
      const textures = new Set<Texture>();
      scene.traverse(object => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[];
        for (const material of materials) {
          for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
          material.dispose();
        }
      });
      textures.forEach(texture => texture.dispose());
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
