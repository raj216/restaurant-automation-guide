// The 3D phone: an iPhone 18 Pro Max with Brio on a call. Plain three.js,
// loaded on demand: the page shows a CSS phone until this is ready.
//
// The phone floats and sways; visitors can spin it by dragging. setStep()
// moves the call along: it rings, Brio answers, takes the order, texts the
// manager, and a dropped robocall's notification slides in.

import {
  ACESFilmicToneMapping,
  AmbientLight,
  CanvasTexture,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  SRGBColorSpace,
  Scene,
  Texture,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { createScreenEffects } from "./effects";
import { CAMERA_FOV, HERO_FIT, fitDistance } from "./fit";
import { PHONE, buildIphone, studioScene, type Finish } from "./iphone";
import {
  ORB,
  SCREEN_CORNER,
  SCREEN_H,
  SCREEN_W,
  drawScreen,
  loadFonts,
} from "./textures";

export interface PhoneScene {
  /** The call's step: -1 ringing, then 0–3. */
  setStep(step: number): void;
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

// The finish the phone is shown in: "silver", "black", "lightBlue" or "burgundy".
const FINISH: Finish = "silver";

/** Who is talking in each step, for the orb: Brio, the caller, or no one. */
const VOICE: Record<number, number> = { [-1]: 0, 0: 1, 1: 0.55, 2: 1, 3: 0.2 };

/** Frees what a throwaway scene (like the studio, once captured) holds on the GPU. */
function disposeObjects(root: Object3D) {
  root.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const material of (Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) as Material[])
      material.dispose();
  });
}

export async function createPhoneScene(
  canvas: HTMLCanvasElement,
  onLost?: () => void
): Promise<PhoneScene> {
  await loadFonts();

  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const lost = (event: Event) => {
    event.preventDefault();
    onLost?.();
  };
  canvas.addEventListener("webglcontextlost", lost);

  // One photo-studio capture lights the metal and glass.
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const studioSet = studioScene();
  const studio = pmrem.fromScene(studioSet, 0.02).texture;
  disposeObjects(studioSet);
  scene.environment = studio;

  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 60);

  // A soft key light, Brio's violet and rose from behind, a cool fill.
  const key = new DirectionalLight(0xfff4e8, 1.45);
  key.position.set(2.5, 3, 4);
  const violet = new PointLight(0x8b5cf6, 9, 7, 1.6);
  violet.position.set(-1.5, 0.9, -1.2);
  const rose = new PointLight(0xff4f9a, 6, 7, 1.6);
  rose.position.set(1.6, -0.8, -1.1);
  const fill = new AmbientLight(0xa4abbb, 0.3);
  scene.add(key, violet, rose, fill);

  // ── The phone ──────────────────────────────────────────────────────────
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = SCREEN_W;
  screenCanvas.height = SCREEN_H;
  const screenTexture = new CanvasTexture(screenCanvas);
  screenTexture.colorSpace = SRGBColorSpace;
  screenTexture.anisotropy = Math.min(
    8,
    renderer.capabilities.getMaxAnisotropy()
  );
  const iphone = buildIphone(screenTexture, studio, FINISH);
  const phone = iphone.group;

  // Brio's orb and the glow around the screen, over the call screen.
  const px = PHONE.screenWidth / SCREEN_W;
  const effects = createScreenEffects(
    ORB.r * 2 * px,
    PHONE.screenWidth,
    PHONE.screenHeight,
    SCREEN_CORNER * px * 1.1
  );
  effects.orb.position.set(
    (ORB.x - SCREEN_W / 2) * px,
    (SCREEN_H / 2 - ORB.y) * px,
    iphone.screenZ + 0.0004
  );
  effects.orb.renderOrder = 1.4;
  effects.rim.position.z = iphone.screenZ + 0.0002;
  effects.rim.renderOrder = 1.2;
  phone.add(effects.rim, effects.orb);
  scene.add(phone);

  // ── State ──────────────────────────────────────────────────────────────
  let step = -1;
  let stepAt = 0;
  let callAt = 0;
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
  let level = 0;
  let ring = 0;
  let screenKey = "";

  function drawIfChanged() {
    const since = time - stepAt;
    const enter = Math.min(1, since / 0.5);
    // The call timer counts real seconds, even when frames are slow.
    const seconds =
      step < 0 ? 0 : Math.floor((performance.now() - callAt) / 1000) + 1;
    // Redraw while something is coming in (or ringing), then once a second for the timer.
    const moving =
      enter < 1
        ? Math.round(enter * 14)
        : step < 0
          ? Math.floor(time * 12)
          : 14;
    const key = `${step}:${seconds}:${moving}`;
    if (key === screenKey) return;
    screenKey = key;
    drawScreen(screenCanvas, { step, seconds, enter, time });
    screenTexture.needsUpdate = true;
  }

  function update(dt: number) {
    time += dt;
    const bob = Math.sin(time * 0.9) * 0.035;
    aimX += (pointerX - aimX) * Math.min(1, dt * 4);
    aimY += (pointerY - aimY) * Math.min(1, dt * 4);
    if (!held) {
      spin += spinVelocity;
      spinVelocity *= Math.pow(0.9, dt * 60);
      if (Math.abs(spinVelocity) < 0.0008) {
        spin = Math.atan2(Math.sin(spin), Math.cos(spin));
        spin *= 1 - Math.min(1, dt * 0.45);
      }
    }

    // Voice: a talker's level rises and falls like speech; the ring pulses.
    const since = time - stepAt;
    const voice = (VOICE[step] ?? 0) * (since < 2.6 ? 1 : 0.25);
    const speech =
      Math.abs(Math.sin(time * 6.3) * Math.sin(time * 2.1 + 1.3)) * 0.8 + 0.2;
    level += (voice * speech - level) * Math.min(1, dt * 8);
    ring += ((step < 0 ? 1 : 0) - ring) * Math.min(1, dt * 6);
    effects.update(time, level, ring);

    // A little buzz while it rings.
    const buzz = ring * Math.max(0, Math.sin(time * 5)) ** 2;
    phone.position.set(0, 0.03 + bob, 0);
    phone.rotation.set(
      0.1 + aimY * 0.06 + Math.sin(time * 0.7) * 0.02,
      -0.42 +
        Math.sin(time * 0.45) * 0.2 +
        spin +
        aimX * 0.12 +
        Math.sin(time * 38) * 0.012 * buzz,
      0.06 + Math.sin(time * 43) * 0.02 * buzz
    );
    drawIfChanged();
  }

  function frameCamera(width: number, height: number) {
    const aspect = width / Math.max(1, height);
    camera.aspect = aspect;
    camera.position.set(0, 0, fitDistance(HERO_FIT, aspect));
    camera.lookAt(0, 0, 0);
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
    setStep(value) {
      if (value === step) return;
      step = value;
      stepAt = time;
      if (step === 0) callAt = performance.now();
      if (!active) render();
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
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, width < 700 ? 1.75 : 2)
      );
      renderer.setSize(width, height, false);
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
        const materials = (
          Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        ) as Material[];
        for (const material of materials) {
          for (const value of Object.values(material))
            if (value instanceof Texture) textures.add(value);
          material.dispose();
        }
      });
      textures.forEach(texture => texture.dispose());
      effects.dispose();
      iphone.dispose();
      studio.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
