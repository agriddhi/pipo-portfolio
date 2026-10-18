/* ══════════════════════════════════════════════════════════════
   PIPO — chaospage.js
   CHAOS MODE, on its own page.

   The old chaos mode was an overlay on the real site: a taskbar, some
   desktop icons, a progress bar that never finished. Decoration. It
   made the actual website worse every time somebody toggled it.

   So it left. It is a page now, and it has a job:

     ── FEED THE DRAGON ──
     Pipo is UNWELL. She flies across the screen at genuinely
     unreasonable speed, and the faster she goes the more agitated she
     gets. Left alone she climbs toward MAX CHAOS, and at MAX CHAOS
     she loses it completely and sneezes, and the whole room fills
     with petals.

     You have a tray of food. Throw something, she catches it or she
     doesn't. A catch calms her down. A miss makes it worse.

   Score is how long you kept her steady, plus every catch.
   ══════════════════════════════════════════════════════════════ */

import * as THREE from "../vendor/three.module.js";
import { buildPipo } from "./pipo.js";
import { audio } from "./audio.js";
import { score as bgScore } from "./audio.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export function initChaosPage() {
  const canvas = document.getElementById("chaos-gl");
  const room = document.getElementById("chaos-room-scene");
  const meterFill = document.getElementById("chaos-fill");
  const meterWord = document.getElementById("chaos-word");
  const foodTray = document.getElementById("chaos-food");
  const throwBtn = document.getElementById("chaos-throw");
  const scoreEl = document.getElementById("chaos-score");
  const timeEl = document.getElementById("chaos-time");
  const overEl = document.getElementById("chaos-over");
  const overMsg = document.getElementById("chaos-over-msg");
  const againBtn = document.getElementById("chaos-again");
  const hintEl = document.getElementById("chaos-hint");

  if (!canvas || !room) return null;

  /* ══════════════ THE 3D DRAGON ══════════════ */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    // no WebGL at all: the page still works, she just is not drawn
    canvas.hidden = true;
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  // soft ambient, same family as the main site
  scene.add(new THREE.HemisphereLight(0xfff4ea, 0xc7aee8, 2.4));
  const key = new THREE.DirectionalLight(0xfff8ee, 1.6);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xf0c0dd, 1.0);
  rim.position.set(-5, 1.5, -3.5);
  scene.add(rim);

  const pipo = buildPipo({ chibi: true });
  pipo.scale.setScalar(1.15);
  scene.add(pipo);

  function resize() {
    const w = room.clientWidth, h = room.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // the projection below depends on this, and nothing else moves the
    // camera — so it is set once here rather than every frame
    camera.updateMatrixWorld();
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(room);
  else addEventListener("resize", resize, { passive: true });
  addEventListener("resize", resize, { passive: true });
  resize();

  /* ══════════════ THE GAME STATE ══════════════ */
  const S = {
    agitation: 26,     // 0 = peaceful, 100 = about to sneeze everywhere
    caught: 0,
    seconds: 0,
    running: false,
    over: false,
    pos: new THREE.Vector3(0, 0, 0),
    vel: new THREE.Vector3(0, 0, 0),
    target: new THREE.Vector3(0, 0, 0),
    retarget: 0,
    shake: 0,
    panic: false,
    flights: 0,
  };

  const MAX_SPEED_BASE = 2.2;

  /* ── WHERE THE SCREEN ACTUALLY IS, IN WORLD UNITS ────────────

     This used to be `w * 0.36` and `h * 0.3` — PIXELS, mixed into
     world coordinates. The visible half-width here is about 7 world
     units, so she was being allowed to wander to ±323 units, which is
     roughly forty screens wide. That is why she kept flying off the
     screen and could never be caught.

     Derive it from the camera instead, so it stays correct at any
     aspect ratio and any window size. */
  function viewBounds() {
    const dist = Math.abs(camera.position.z - pipo.position.z);
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * dist;
    const halfW = halfH * camera.aspect;
    // 0.82 keeps her fully inside, with a little air at the edges
    return { x: halfW * 0.82, y: halfH * 0.82 };
  }

  /* ── WHERE SHE IS ON THE SCREEN, IN PIXELS ───────────────────
     Also used to be a guess: `(pos.x / 9 + 0.5) * w`. Nine was a
     magic number for the camera distance and 6.2 was a magic number
     for the field of view, so the throw target and the catch test
     were measuring her in a place that was not where she was drawn.

     Project it properly instead. This is the single reason the food
     never connected. */
  const _proj = new THREE.Vector3();
  function screenPos() {
    _proj.copy(S.pos).project(camera);
    return {
      x: (_proj.x * 0.5 + 0.5) * room.clientWidth,
      y: (-_proj.y * 0.5 + 0.5) * room.clientHeight,
    };
  }

  /* how fast she is going, as a fraction — drives the meter colour */
  function speedNow() {
    return clamp(S.vel.length() / (MAX_SPEED_BASE + 20), 0, 1);
  }

  function paintMeter() {
    const a = clamp(S.agitation, 0, 100);
    if (meterFill) meterFill.style.width = a + "%";
    const word =
      a < 22 ? "perfectly fine" :
      a < 42 ? "a bit buzzy" :
      a < 60 ? "getting restless" :
      a < 78 ? "quite wound up" :
      a < 92 ? "DO NOT LET HER" : "MAX CHAOS";
    if (meterWord) {
      meterWord.textContent = word;
      meterWord.className = a >= 78 ? "chaos-meter__word is-high" : a >= 55 ? "chaos-meter__word is-mid" : "chaos-meter__word";
    }
    document.documentElement.style.setProperty("--agitation", (a / 100).toFixed(3));
  }

  function paintScore() {
    if (scoreEl) scoreEl.textContent = String(S.caught);
    const m = Math.floor(S.seconds / 60), s = Math.floor(S.seconds % 60);
    if (timeEl) timeEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
  }

  /* ══════════════ HER MOVEMENT ══════════════
     She does not fly in a straight line. She picks a point, commits,
     overshoots, and swerves — and the angrier she gets the more
     often she changes her mind mid-air. */
  function pickTarget() {
    const b = viewBounds();
    S.target.set(rand(-b.x, b.x), rand(-b.y, b.y), rand(-0.4, 0.6));
  }

  function stepPipo(dt, t) {
    const rage = S.agitation / 100;
    /* chaos mode: she is meant to be FAST. ~10 units/s crosses the
       arena in a little over a second; at full rage she crosses in
       about half of that, which is properly unreasonable. */
    const maxSpeed = MAX_SPEED_BASE + 8 + rage * 20;
    const turn = 2.4 + rage * 4.0;

    S.retarget -= dt;
    if (S.retarget <= 0) {
      pickTarget();
      // the angrier she is, the twitchier: 1.6s down to 0.18s
      S.retarget = rand(0.18, 1.1) * (1 - rage * 0.8) + 0.08;
      if (Math.random() < rage * 0.5) {
        audio._voice(320 + Math.random() * 500, { dur: 0.16, gain: 0.05, type: "square" });
      }
    }

    const to = S.target.clone().sub(S.pos);
    const dist = to.length();
    if (dist > 0.001) to.multiplyScalar(1 / dist);
    S.vel.addScaledVector(to, turn * dt * 9);

    // drag, then clamp to her top speed
    S.vel.multiplyScalar(1 - Math.min(0.9, dt * 1.1));
    const sp = S.vel.length();
    if (sp > maxSpeed) S.vel.multiplyScalar(maxSpeed / sp);
    else if (sp > 0.001 && sp < maxSpeed * 0.55) S.vel.multiplyScalar((maxSpeed * 0.55) / sp);

    S.pos.addScaledVector(S.vel, dt);

    // stay on screen — in WORLD units this time
    const b = viewBounds();
    if (S.pos.x < -b.x) { S.pos.x = -b.x; S.vel.x = Math.abs(S.vel.x) * 0.7; S.retarget = 0; }
    if (S.pos.x >  b.x) { S.pos.x =  b.x; S.vel.x = -Math.abs(S.vel.x) * 0.7; S.retarget = 0; }
    if (S.pos.y < -b.y) { S.pos.y = -b.y; S.vel.y = Math.abs(S.vel.y) * 0.7; S.retarget = 0; }
    if (S.pos.y >  b.y) { S.pos.y =  b.y; S.vel.y = -Math.abs(S.vel.y) * 0.7; S.retarget = 0; }

    pipo.position.copy(S.pos);
    pipo.rotation.y = Math.atan2(S.vel.x, S.vel.z + 0.001);
    pipo.rotation.z = clamp(-S.vel.x * 0.16, -0.8, 0.8);
    pipo.rotation.x = clamp(S.vel.y * 0.1, -0.5, 0.5);

    // squash and stretch sells the speed
    const st = clamp(S.vel.length() * 0.018, 0, 0.24);
    pipo.scale.set(1.15 * (1 + st), 1.15 * (1 - st * 0.7), 1.15 * (1 + st * 0.6));

    pipo.userData.update(dt, t, {
      flying: true,
      speed: clamp(0.6 + speedNow() * 2.6, 0.5, 3),
      lookY: clamp(-S.vel.x * 0.1, -0.3, 0.3),
      lookX: 0.2,
    });

    return dist;
  }

  /* ══════════════ FOOD ══════════════ */
  const FOODS = [
    { k: "cherry",  emoji: "🍒", calms: 20, say: "a cherry. she takes it without looking. crisis averted." },
    { k: "cake",    emoji: "🌸", calms: 26, say: "sakura cake. that is the correct food and she knows it." },
    { k: "peach",   emoji: "🍑", calms: 17, say: "a peach. eaten in one bite, out of spite." },
    { k: "dango",   emoji: "🍡", calms: 30, say: "dango. she stops mid-air for this. it is the good stuff." },
  ];
  let foodKind = FOODS[0];
  let inFlight = null;

  FOODS.forEach((f, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chaos-food" + (i === 0 ? " is-on" : "");
    b.innerHTML = `<span aria-hidden="true">${f.emoji}</span><i>${f.k}</i>`;
    b.setAttribute("aria-label", `${f.k}, calms her by ${f.calms}`);
    b.addEventListener("click", () => {
      foodKind = f;
      foodTray.querySelectorAll(".chaos-food").forEach((x) => x.classList.remove("is-on"));
      b.classList.add("is-on");
      audio.hover();
      throwFood();
    });
    foodTray.appendChild(b);
  });

  throwBtn?.addEventListener("click", throwFood);

  function throwFood() {
    if (!S.running || S.over || inFlight) return;

    const node = document.createElement("div");
    node.className = "chaos-fly";
    node.textContent = foodKind.emoji;
    room.appendChild(node);

    const FLIGHT = 0.72;

    /* Lead the throw properly. She is moving at up to ~30 world
       units a second, so aiming where she IS means the food always
       arrives where she was. Predict where she will be, then project
       that into screen space using the same camera maths as
       everything else. */
    const predicted = S.pos.clone().addScaledVector(S.vel, FLIGHT * 0.55);
    const aim = worldToScreen(predicted);

    const from = { x: room.clientWidth * 0.5, y: room.clientHeight + 40 };
    // enough spread that a clean catch feels earned, not automatic —
    // but never so much that a good read is punished
    const to = { x: aim.x + rand(-55, 55), y: aim.y + rand(-45, 45) };

    inFlight = { node, food: foodKind, t: 0, dur: FLIGHT, from, to };
    audio.click();
  }

  const _ws = new THREE.Vector3();
  function worldToScreen(v) {
    _ws.copy(v).project(camera);
    return {
      x: (_ws.x * 0.5 + 0.5) * room.clientWidth,
      y: (-_ws.y * 0.5 + 0.5) * room.clientHeight,
    };
  }

  function stepFood(dt) {
    if (!inFlight) return;
    const f = inFlight;
    f.t += dt / f.dur;

    const ease = 1 - Math.pow(1 - clamp(f.t, 0, 1), 2);
    const x = f.from.x + (f.to.x - f.from.x) * ease;
    // a lob, not a laser: rise then fall
    const y = f.from.y + (f.to.y - f.from.y) * ease - Math.sin(ease * Math.PI) * room.clientHeight * 0.22;
    f.node.style.transform = `translate(${x}px, ${y}px) rotate(${ease * 540}deg)`;

    const now = screenPos();
    const gap = Math.hypot(now.x - f.to.x, now.y - f.to.y);

    // she is big and fast and you are throwing a snack: a generous
    // radius is the difference between a game and a frustration
    if (f.t >= 0.14 && gap < CATCH_RADIUS) return resolveThrow(f, true);
    if (f.t >= 1) resolveThrow(f, false);
  }

  const CATCH_RADIUS = 130;

  function resolveThrow(f, caught) {
    f.node.remove();
    inFlight = null;

    if (caught) {
      S.caught++;
      S.agitation = clamp(S.agitation - f.food.calms, 0, 100);
      S.panic = false;
      S.shake = 0;
      audio.sparkle();
      burst(f.to.x, f.to.y, 18, f.food.emoji);
      if (hintEl) hintEl.textContent = f.food.say;
      // she slows down for a moment
      S.vel.multiplyScalar(0.35);
      if (scoreEl) { scoreEl.textContent = String(S.caught); scoreEl.classList.remove("is-pop"); void scoreEl.offsetWidth; scoreEl.classList.add("is-pop"); }
    } else {
      S.agitation = clamp(S.agitation + 9, 0, 100);
      audio.swoop();
      if (hintEl) hintEl.textContent = "she missed it. that did not help.";
    }
    paintMeter();
    paintScore();
  }

  /* a little burst of petals where she caught it */
  function burst(x, y, n, glyph) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "chaos-spark";
      s.textContent = i % 3 === 0 ? glyph : "✿";
      s.style.left = x + "px";
      s.style.top = y + "px";
      s.style.setProperty("--dx", rand(-90, 90) + "px");
      s.style.setProperty("--dy", rand(-140, -20) + "px");
      room.appendChild(s);
      setTimeout(() => s.remove(), 1000);
    }
  }

  /* ══════════════ LOSING ══════════════
     The storm used to be generated and then immediately hidden: the
     game-over overlay is z-index 9 with a 78%-opaque background, and
     the petals were z-index 4, i.e. directly behind it. They were
     there the whole time, under a dark sheet. */
  function lose() {
    S.over = true;
    S.running = false;
    audio.sneeze();
    audio.swoop();
    S.shake = 1;

    room.classList.add("is-sneeze");
    setTimeout(() => room.classList.remove("is-sneeze"), 1800);

    // the great petal storm, in waves, above everything
    const waves = [18, 26, 34];
    waves.forEach((n, w) => {
      setTimeout(() => {
        for (let i = 0; i < n; i++) {
          petalStorm(rand(-40, room.clientWidth + 40), rand(-60, room.clientHeight * 0.7));
        }
      }, w * 260);
    });

    if (overEl) {
      overEl.hidden = false;
      overMsg.innerHTML = `She caught <b>${S.caught}</b> ${S.caught === 1 ? "snack" : "snacks"} and stayed sane for <b>${Math.floor(S.seconds)}s</b>.<br>${Math.floor(S.seconds) < 12 ? "that is genuinely impressive." : "she remembers you."}`;
    }
  }

  /* a petal that FALLS, which is what a sneeze actually does */
  function petalStorm(x, y) {
    const s = document.createElement("span");
    s.className = "chaos-storm";
    s.textContent = Math.random() < 0.25 ? "🌸" : "✿";
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.setProperty("--dx", rand(-70, 70) + "px");
    s.style.setProperty("--drift", rand(4, 11) + "s");
    s.style.setProperty("--fall", rand(1.6, 3.2) + "s");
    s.style.setProperty("--spin", rand(-540, 540) + "deg");
    room.appendChild(s);
    setTimeout(() => s.remove(), 4200);
  }

  function reset() {
    S.agitation = 26; S.caught = 0; S.seconds = 0; S.over = false; S.panic = false; S.shake = 0;
    S.pos.set(0, 0, 0); S.vel.set(0, 0, 0); S.retarget = 0;
    if (overEl) overEl.hidden = true;
    if (inFlight) { inFlight.node.remove(); inFlight = null; }
    paintMeter(); paintScore();
    start();
  }

  againBtn?.addEventListener("click", () => { audio.click(); reset(); });

  /* ══════════════ THE LOOP ══════════════ */
  const clock = new THREE.Clock();
  let running = true;
  let raf = 0;

  function start() {
    S.running = true;
    audio.resume();
    if (!audio.muted) bgScore.start();
  }

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (S.running && !S.over) {
      // the baseline climb: she gets wound up just by existing
      S.agitation = clamp(S.agitation + dt * (3.4 + speedNow() * 2.6), 0, 100);
      S.seconds += dt;

      const wasPanic = S.panic;
      S.panic = S.agitation >= 78;
      if (S.panic && !wasPanic) {
        if (hintEl) hintEl.textContent = "SHE IS GOING. THROW SOMETHING.";
        audio._voice(140, { dur: 0.5, gain: 0.16, type: "sawtooth" });
      }

      paintMeter();
      paintScore();

      if (S.agitation >= 100) { lose(); }
    }

    // she keeps flying even after the game is over — she does not stop
    stepPipo(dt, t);
    stepFood(dt);

    // the room shakes when she is out of control
    if (S.shake > 0) {
      S.shake = Math.max(0, S.shake - dt * 1.6);
      const k = S.shake * 9;
      room.style.transform = `translate(${rand(-k, k)}px, ${rand(-k, k)}px)`;
    } else if (room.style.transform) {
      room.style.transform = "";
    }

    renderer.render(scene, camera);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (!running) { running = true; clock.getDelta(); raf = requestAnimationFrame(frame); }
  });

  addEventListener("keydown", (e) => {
    if (e.key === "Escape") { location.href = "index.html"; return; }
    const k = e.key.toLowerCase();
    const idx = { q: 0, w: 1, e: 2, r: 3 }[k];
    if (idx !== undefined && FOODS[idx]) {
      foodKind = FOODS[idx];
      foodTray.querySelectorAll(".chaos-food").forEach((x, i) => x.classList.toggle("is-on", i === idx));
    }
    if (e.key === " ") { e.preventDefault(); throwFood(); }
  });

  paintMeter();
  paintScore();
  start();
  raf = requestAnimationFrame(frame);

  // the intro hint has to survive rAF being throttled in a background tab
  setTimeout(() => { if (hintEl && !hintEl.dataset.changed) hintEl.textContent = "throw her something. q / w / e / r to pick, space to throw."; }, 1200);

  const api = {
    throwFood, reset, screenPos, viewBounds,
    get state() { return { ...S, speed: speedNow() }; },
  };
  // a handle for testing and for the easter egg console
  window.__chaos = api;
  return api;
}
