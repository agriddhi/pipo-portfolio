/* ══════════════════════════════════════════════════════════════
   PIPO — scene.js
   Two WebGL surfaces, one character:

     #gl       full-screen, fixed, behind the page
               → the chibi Pipo that flies after your pointer
     #gl-card  a small panel in the character sheet
               → the grown Pipo, turning slowly, built live

   Both are assembled from primitives at runtime. No .glb, no
   licence, no download, no "loading model…" spinner.
   ══════════════════════════════════════════════════════════════ */

import * as THREE from "../vendor/three.module.js";
import { buildPipo } from "./pipo.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(pointer: coarse)").matches;

export const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: false };

/* ── shared lighting rig so both dragons sit in the same world ──
   Soft and ambient, per the brief: a wide hemisphere fill doing most
   of the work, a gentle key, and a lavender rim to lift her off the
   sky. Nothing harsh — the whole point is that she looks like an
   illustration, not a render. */
function addLights(scene, { key = 1.5, rim = 0.9, hemi = 2.3 } = {}) {
  scene.add(new THREE.HemisphereLight(0xfff4ea, 0xc7aee8, hemi));
  const k = new THREE.DirectionalLight(0xfff8ee, key);
  k.position.set(3.5, 5, 6);
  scene.add(k);
  const r = new THREE.DirectionalLight(0xf0c0dd, rim);
  r.position.set(-5, 1.5, -3.5);
  scene.add(r);
  // a second fill from below so the cream belly and the claws read
  const f = new THREE.DirectionalLight(0xdce8ff, rim * 0.6);
  f.position.set(1, -4, 2);
  scene.add(f);
  return { key: k, rim: r };
}

function mkRenderer(canvas, alpha) {
  return new THREE.WebGLRenderer({ canvas, alpha, antialias: true, powerPreference: "high-performance" });
}

/* ══════════════════════════════════════════════════════════════
   1 · the full-screen layer — the cursor chibi
   ══════════════════════════════════════════════════════════════ */
function initCursorLayer({ onReady } = {}) {
  const canvas = document.getElementById("gl");
  if (!canvas) return null;

  let renderer;
  try { renderer = mkRenderer(canvas, true); }
  catch (err) { console.warn("[pipo] WebGL unavailable — carrying on without 3D.", err); canvas.remove(); return null; }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.z = 9;
  const lights = addLights(scene, { key: 1.6, rim: 1.0, hemi: 2.4 });

  const rig = new THREE.Group();
  const chibi = buildPipo({ chibi: true });
  const CHIBI_SCALE = coarse ? 0.3 : 0.34;
  chibi.scale.setScalar(CHIBI_SCALE);
  rig.add(chibi);
  rig.visible = false;
  scene.add(rig);

  /* a soft glow disc so she reads against any background */
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 32),
    new THREE.MeshBasicMaterial({ color: 0xf4a6c0, transparent: true, opacity: 0.13, depthWrite: false })
  );
  glow.position.z = -0.6;
  rig.add(glow);

  const clock = new THREE.Clock();
  const wp = new THREE.Vector3();
  const cur = new THREE.Vector3();
  const prev = new THREE.Vector3();
  let visible = false, running = true, idle = 0, spawnAt = performance.now();

  function toWorld(nx, ny, out) {
    const v = out || new THREE.Vector3();
    const wide = window.innerWidth / window.innerHeight;
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const halfW = halfH * wide;
    v.set((nx - 0.5) * 2 * halfW, (0.5 - ny) * 2 * halfH, 0);
    return v;
  }

  function onMove(e) {
    pointer.tx = e.clientX / window.innerWidth;
    pointer.ty = e.clientY / window.innerHeight;
    pointer.active = true;
    idle = 0;
  }
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onMove, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const wide = w / h;
    camera.aspect = wide;
    // pull back on narrow phones so she is never cropped
    camera.position.z = wide < 0.8 ? 13 : wide < 1.35 ? 10.5 : 9;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    toWorld(pointer.x, pointer.y, cur);
  }
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("orientationchange", resize);
  resize();

  const api = {
    show() { visible = true; rig.visible = true; spawnAt = performance.now(); },
    hide() { visible = false; rig.visible = false; },
    /** make her dart at a screen position (used by the stars + easter eggs) */
    sendTo(clientX, clientY, ms = 900) {
      toWorld(clientX / window.innerWidth, clientY / window.innerHeight, wp);
      const from = cur.clone();
      const t0 = performance.now();
      rig.visible = true;
      visible = true;
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3);
        cur.lerpVectors(from, wp, e);
        cur.y += Math.sin(k * Math.PI * 5) * 0.5 * (1 - k);
        if (k < 1) requestAnimationFrame(step);
      };
      step();
    },
  };

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (!visible) return;

    /* let her fly in from the hero rather than popping into existence */
    const age = (performance.now() - spawnAt) / 1000;
    const intro = Math.min(1, age / 1.1);
    rig.scale.setScalar(0.2 + 0.8 * (1 - Math.pow(1 - intro, 3)));

    idle += dt;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 13);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 13);

    toWorld(pointer.x, pointer.y, wp);

    /* nobody has moved the mouse → drift gently on our own */
    if (!pointer.active || idle > 2.4) {
      pointer.tx = 0.5 + Math.cos(t * 0.22) * 0.3;
      pointer.ty = 0.5 + Math.sin(t * 0.3) * 0.24;
      toWorld(pointer.tx, pointer.ty, wp);
    }

    /* the zigzag — two out-of-phase sines, exactly like a snake in flight */
    const amp = reduce ? 0 : 0.4;
    const OFF_X = coarse ? 0 : 0.55;   // she trails behind your hand, never sits on it
    const OFF_Y = coarse ? 0 : -0.5;
    const desired = {
      x: wp.x + OFF_X + Math.sin(t * 2.9) * amp,
      y: wp.y + OFF_Y + Math.cos(t * 4.4) * amp * 0.5,
      z: Math.sin(t * 1.7) * 0.5,
    };

    prev.copy(cur);
    cur.x += (desired.x - cur.x) * Math.min(1, dt * 6.5);
    cur.y += (desired.y - cur.y) * Math.min(1, dt * 6.5);
    cur.z += (desired.z - cur.z) * Math.min(1, dt * 3.5);

    const dx = cur.x - prev.x, dy = cur.y - prev.y, dz = cur.z - prev.z;
    const speed = Math.hypot(dx, dy, dz) / Math.max(dt, 0.0001);

    rig.position.copy(cur);
    rig.rotation.y = Math.atan2(dx, dz + 0.0001);
    rig.rotation.z = THREE.MathUtils.clamp(-dx * 3.2, -0.7, 0.7);
    rig.rotation.x = THREE.MathUtils.clamp(dy * 1.6, -0.4, 0.4);

    chibi.userData.update(dt, t, {
      flying: true,
      speed: THREE.MathUtils.clamp(speed * 0.6, 0.5, 2.8),
      lookY: Math.sin(t * 1.3) * 0.22,
      lookX: 0.18,
    });

    /* squash & stretch sells the flight */
    const st = THREE.MathUtils.clamp(speed * 0.05, 0, 0.15);
    const s = rig.scale.x / (0.2 + 0.8);
    chibi.scale.set(CHIBI_SCALE * s * (1 + st), CHIBI_SCALE * s * (1 - st * 0.7), CHIBI_SCALE * s * (1 + st * 0.6));

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
  });

  onReady?.();
  requestAnimationFrame(() => canvas.classList.add("ready"));
  return api;
}

/* ══════════════════════════════════════════════════════════════
   2 · the character-sheet card — the grown Pipo, turning
   ══════════════════════════════════════════════════════════════ */
function initCardLayer() {
  const canvas = document.getElementById("gl-card");
  if (!canvas) return;

  let renderer;
  try { renderer = mkRenderer(canvas, false); }
  catch { canvas.remove(); return; }

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0.35, 4.4);

  const lights = addLights(scene, { key: 1.9, rim: 1.2, hemi: 2.6 });
  lights.key.position.set(3, 4, 5);
  lights.rim.position.set(-4, -1, -3);

  const adult = buildPipo({ chibi: false });
  adult.scale.setScalar(1.25);
  adult.position.y = -0.35;
  scene.add(adult);

  const clock = new THREE.Clock();
  let running = true, onScreen = false;

  function resize() {
    const w = canvas.clientWidth || 280;
    const h = canvas.clientHeight || 280;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else window.addEventListener("resize", resize, { passive: true });
  resize();

  /* only burn GPU while it is actually on screen */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => es.forEach((e) => { onScreen = e.isIntersecting; if (onScreen) resize(); }), { threshold: 0.05 })
      .observe(canvas);
  } else onScreen = true;

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!onScreen) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    adult.userData.update(dt, t, { flying: false, lookX: 0.1, lookY: 0 });
    adult.rotation.y += dt * 0.42;
    adult.rotation.x = Math.sin(t * 0.6) * 0.06;
    adult.position.y = -0.35 + Math.sin(t * 0.9) * 0.07;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
  });

  requestAnimationFrame(() => canvas.classList.add("ready"));
}

/* ══════════════════════════════════════════════════════════════ */
export function initScene(opts = {}) {
  const cursor = initCursorLayer(opts);
  initCardLayer();
  return {
    showChibi: () => cursor?.show(),
    hideChibi: () => cursor?.hide(),
    sendTo: (x, y, ms) => cursor?.sendTo(x, y, ms),
  };
}