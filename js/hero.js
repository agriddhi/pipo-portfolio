/* ══════════════════════════════════════════════════════════════
   PIPO — hero.js
   The camera push-in.

   Not a flat scale-up. Each layer of the dragon moves at its own
   rate — glow, tail, body, head — so the zoom reads as real depth.
   On top of that, petals rush past the camera at three depths.

   YOU DO NOT NEED TO CUT THE ART UP TO GET THIS WORKING.
   assets/pipo-adult.png alone already produces a proper dolly
   because of the petal rush + the moon. Drop in the extra layers
   whenever you feel like it and the effect just gets better.
   ══════════════════════════════════════════════════════════════ */

import { placeholder } from "./art.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ══════════════════════════ PETAL RUSH ══════════════════════════
   Petals spawn at three depths and scale up as they "pass the
   camera". Depth 3 petals get huge and blur out — that is the
   single cheapest trick that makes a 2D scroll feel cinematic. */
function initRush(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  let push = 0;          // 0 → 1 across the hero scroll
  let intensity = 0;     // petals only appear as you scroll in

  function size() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener("resize", size, { passive: true });

  const COLORS = ["#f9c2d4", "#f4a6c0", "#ffd9e4", "#e8799f", "#fff1e4"];
  const DEPTHS = [0.35, 0.7, 1];
  let bits = [];

  function spawn() {
    const d = DEPTHS[Math.random() < 0.5 ? 0 : Math.random() < 0.7 ? 1 : 2];
    bits.push({
      d,
      x: Math.random() * w,
      y: -30,
      vx: (Math.random() - 0.5) * 20,
      vy: 30 + Math.random() * 50 + d * 90,
      r: (2 + Math.random() * 5) * d,
      rot: Math.random() * 6.3,
      vr: (Math.random() - 0.5) * 2.2,
      wob: Math.random() * 6.3,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      a: 0.55 + Math.random() * 0.45,
    });
  }

  function draw(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    const r = o.r * (1 + push * o.d * 3.4);
    ctx.scale(1, 0.55 + Math.abs(Math.sin(o.wob)) * 0.45);
    ctx.globalAlpha = o.a * (o.d === 1 ? 0.9 : 0.65);
    ctx.fillStyle = o.c;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r, -r * 0.5, r * 0.9, r * 0.8, 0, r);
    ctx.bezierCurveTo(-r * 0.9, r * 0.8, -r, -r * 0.5, 0, -r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  let visible = true, raf = 0;
  function loop() {
    // Nothing to draw until the visitor actually starts scrolling the
    // hero — so an idle page does not repaint this canvas at all.
    if (!visible || reduce || intensity <= 0.001) {
      raf = 0;
      if (bits.length) { ctx.clearRect(0, 0, w, h); bits.length = 0; }
      return;
    }

    raf = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, w, h);

    const want = Math.round(intensity * 26);
    while (bits.length < want) spawn();
    if (bits.length > want + 12) bits.length = want + 12;

    for (let i = 0; i < bits.length; i++) {
      const o = bits[i];
      o.wob += 0.05;
      o.x += o.vx + Math.sin(o.wob) * 22;
      o.y += o.vy;
      o.rot += o.vr;
      if (o.y > h + 60) bits.splice(i, 1);
      else draw(o);
    }
    ctx.globalAlpha = 1;
  }

  document.addEventListener("visibilitychange", () => { visible = !document.hidden; });

  return (p) => {
    const was = intensity;
    push = p;
    intensity = Math.max(0, Math.min(1, (p - 0.04) * 3.2));
    // start the loop the moment there is something to show
    if (!raf && intensity > 0.001) raf = requestAnimationFrame(loop);
    // and stop it again once the hero is behind us
    else if (raf && intensity <= 0.001 && was > 0.001) { cancelAnimationFrame(raf); raf = 0; }
  };
}

/* ══════════════════════════ THE ZOOM ══════════════════════════ */
export function initHeroZoom() {
  const hero = document.getElementById("hero");
  const layers = [...document.querySelectorAll("#hero-layers .hero__layer")];
  const type = document.getElementById("hero-type");
  const cue = document.querySelector(".scroll-cue");
  const moon = document.querySelector(".hero__moon");
  const ticker = document.querySelector(".hero__ticker");
  const rush = initRush(document.getElementById("rush"));

  /* Missing files are handled differently depending on the layer:
       · the optional depth slices (glow / tail / head) simply vanish
       · the main body layer falls back to the drawn placeholder
     One PNG is therefore all you need to ship the zoom. */
  layers.forEach((img) => {
    if (img.dataset.gone) return;
    const missing = () => {
      if (img.getAttribute("alt")) {
        img.src = placeholder("adult");
        img.dataset.placeholder = "1";
      } else {
        img.classList.add("is-gone");
        img.dataset.gone = "1";
      }
    };
    img.addEventListener("error", missing);
    if (img.complete && img.naturalWidth === 0) missing();
  });

  /* the ticker text, borrowed from the very early web */
  const marquee = document.getElementById("hero-marquee");
  if (marquee) {
    const txt = "★ WELCOME TO PIPO ★ · the sky tech dept. is open tonight · " +
      "nothing on this page is pre-recorded · scroll gently, she is sleeping · " +
      "everything is possible with the power of love and gratitude · ";
    marquee.innerHTML = `<span>${txt}</span><span>${txt}</span>`;
  }

  const live = () => layers.filter((l) => !l.classList.contains("is-gone"));

  function apply(p) {
    rush(p);

    live().forEach((img) => {
      const depth = parseFloat(img.dataset.depth || "1");
      const dy = parseFloat(img.dataset.y || "0");
      // depth 1 is the reference plane; deeper = closer to camera = faster
      const s = 1 + p * (1.1 + depth * 1.9);
      img.style.transform = `translateY(${dy * p * 2.2}%) scale(${s})`;
      img.style.opacity = String(Math.max(0, 1 - p * (depth >= 1.4 ? 1.9 : 1.5)));
    });

    if (moon) {
      const s = 1 + p * 0.75;
      moon.style.transform = `translateX(-50%) scale(${s})`;
      moon.style.opacity = String(Math.max(0, (0.3 + 0.7 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--moon-op") || 0)) * (1 - p * 1.4)));
    }
    if (type) {
      type.style.transform = `translateY(${-p * 130}%)`;
      type.style.opacity = String(Math.max(0, 1 - p * 2.2));
    }
    if (cue) cue.style.opacity = String(Math.max(0, 1 - p * 3));
    if (ticker) ticker.style.opacity = String(Math.max(0, 1 - p * 4));
  }

  apply(0);

  if (window.gsap && window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: 0.4,
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    });
  } else {
    // no GSAP: still give them the zoom, just not smoothed
    const onScroll = () => {
      const r = hero.getBoundingClientRect();
      apply(Math.max(0, Math.min(1, -r.top / Math.max(1, r.height))));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  return { apply };
}

/* ══════════════════════════ THE GATE ══════════════════════════ */
export function initGate({ onEnter }) {
  const gate = document.getElementById("gate");
  const pct = document.getElementById("gate-pct");
  const line = document.getElementById("gate-line");
  const bar = document.getElementById("gate-bar");
  const withSound = document.getElementById("gate-sound");
  const quiet = document.getElementById("gate-quiet");
  if (!gate) return;

  const LINES = [
    "waking her up…",
    "counting the stars…",
    "folding the nightcap…",
    "teaching the petals to fall…",
    "one more breath…",
  ];

  document.body.classList.add("is-locked");

  let shown = 0;
  let entered = false;
  const started = performance.now();

  const setPct = (p) => {
    if (pct) pct.textContent = p + "%";
    if (bar) bar.style.width = p + "%";
  };

  /* Driven by a TIMER, never requestAnimationFrame.
     An earlier version disabled the buttons until the rAF progress
     loop finished. On any device where rAF is throttled — a
     background tab, a throttled phone, low-power mode — that loop
     stalled, the buttons stayed dead, and the visitor was locked out
     of their own website. A loading screen must never be able to trap
     anyone, so the buttons are never disabled at all. */
  const spin = setInterval(() => {
    const target = Math.min(1, (performance.now() - started) / 1400);
    shown += (target - shown) * 0.2;
    setPct(String(Math.round(Math.min(99, shown * 100))));
    if (line) line.textContent = LINES[Math.min(LINES.length - 1, Math.floor(shown * LINES.length))];
    if (shown >= 0.995) {
      clearInterval(spin);
      /* setPct appends the "%" itself — passing "100%" here rendered
         "100%%" on the last frame of every single load. */
      setPct("100");
      if (line) line.textContent = "she is awake. good timing.";
    }
  }, 60);

  function enter(withSoundOn) {
    if (entered) return;
    entered = true;
    clearInterval(spin);
    gate.classList.add("is-gone");
    document.body.classList.remove("is-locked");
    window.__pipoScroll?.scrollTo?.(0, { immediate: true });
    window.scrollTo(0, 0);
    if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
    setTimeout(() => { try { gate.remove(); } catch {} }, 900);
    onEnter?.(withSoundOn);
  }

  withSound?.addEventListener("click", () => enter(true));
  quiet?.addEventListener("click", () => enter(false));

  /* three ways out no matter what: the buttons, the keyboard, or
     simply scrolling. nobody gets locked out of their own site. */
  window.addEventListener("keydown", (e) => {
    if (entered) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); enter(false); }
  });
  window.addEventListener("wheel", () => { if (!entered) enter(false); }, { passive: true });
  window.addEventListener("touchstart", () => {
    if (!entered && performance.now() - started > 1200) enter(false);
  }, { passive: true });

  /* last-resort failsafe */
  setTimeout(() => enter(false), 12000);

  return { enter };
}