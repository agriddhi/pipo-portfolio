/* ══════════════════════════════════════════════════════════════
   PIPO — world.js
   One continuous scene that the page scrolls through.

   Scroll position 0 → 1 maps to a whole day:
       0.00  morning   pale gold, low sun, long pink light
       0.34  noon      bright, blue-ish, sun overhead
       0.68  dusk      peach into mauve, sun on the horizon
       1.00  night     deep plum, moon out, stars, heaviest petals

   Nothing here snaps. Every colour is interpolated, so the sky
   changes under you as you scroll rather than between sections.
   ══════════════════════════════════════════════════════════════ */

const lerp = (a, b, t) => a + (b - a) * t;

/* ── four keyframes, written out so they are easy to art-direct ── */
const KEYS = [
  { at: 0.00, top: [255,236,214], mid: [253,246,238], bot: [255,241,232], ink: [58,35,80], inkSoft: [92,71,122], accent: [232,121,159], sun: 0.00, stars: 0,   petals: 0.30, ridge: [203,178,236] },
  { at: 0.34, top: [206,232,250], mid: [238,246,255], bot: [255,247,240], ink: [42,32,74],  inkSoft: [86,70,120], accent: [226,116,158], sun: 0.46, stars: 0,   petals: 0.24, ridge: [186,164,230] },
  { at: 0.68, top: [249,196,178], mid: [232,170,190], bot: [252,214,198], ink: [62,30,74],  inkSoft: [116,66,104], accent: [206,96,146], sun: 0.80, stars: 0.3, petals: 0.62, ridge: [176,140,206] },
  { at: 1.00, top: [16,17,50],    mid: [30,22,66],    bot: [60,32,78],    ink: [253,238,248],inkSoft: [215,182,220], accent: [244,166,192], sun: 1.00, stars: 1,   petals: 0.95, ridge: [58,40,90] },
];

const mix = (a, b, t) => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t)),
];
const rgb = (c) => `rgb(${c[0]} ${c[1]} ${c[2]})`;

function sample(p) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = Math.max(0, Math.min(1, (p - a.at) / (b.at - a.at)));
  return {
    top: mix(a.top, b.top, t),
    mid: mix(a.mid, b.mid, t),
    bot: mix(a.bot, b.bot, t),
    ink: mix(a.ink, b.ink, t),
    inkSoft: mix(a.inkSoft, b.inkSoft, t),
    accent: mix(a.accent, b.accent, t),
    ridge: mix(a.ridge, b.ridge, t),
    sun: lerp(a.sun, b.sun, t),
    stars: lerp(a.stars, b.stars, t),
    petals: lerp(a.petals, b.petals, t),
  };
}

/* ══════════════════════════ BUILD THE SCENE ══════════════════════════ */
const RIDGE_FAR = `<svg viewBox="0 0 1600 500" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 500 L0 380 L190 214 L330 318 L470 150 L640 330 L790 236 L960 344 L1120 190 L1320 320 L1600 246 L1600 500 Z"/>
  <path class="world__cap" d="M430 186 L470 150 L512 186 L486 176 L470 188 L452 178 Z"/>
  <path class="world__cap" d="M1082 222 L1120 190 L1160 222 L1130 212 L1120 224 L1102 214 Z"/>
</svg>`;

const RIDGE_MID = `<svg viewBox="0 0 1600 460" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 460 L0 330 L140 240 L280 336 L440 206 L620 348 L780 262 L960 356 L1140 232 L1330 340 L1600 258 L1600 460 Z"/>
</svg>`;

const RIDGE_NEAR = `<svg viewBox="0 0 1600 400" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 400 L0 300 L180 250 L340 330 L520 240 L700 344 L900 268 L1120 356 L1340 272 L1600 336 L1600 400 Z"/>
</svg>`;

/* a big ink-brush sakura tree, drawn once as SVG */
const TREE = `<svg viewBox="0 0 900 620" aria-hidden="true">
  <g class="branch">
    <path d="M700 620 C 690 520, 660 470, 600 430 C 540 390, 470 380, 420 340" stroke-width="30"/>
    <path d="M640 470 C 600 430, 540 420, 470 430 C 420 438, 380 420, 350 392" stroke-width="20"/>
    <path d="M600 430 C 570 380, 560 330, 520 292" stroke-width="18"/>
    <path d="M520 292 C 470 260, 410 258, 360 232" stroke-width="14"/>
    <path d="M470 428 C 440 470, 400 492, 350 500" stroke-width="14"/>
    <path d="M660 500 C 700 460, 740 448, 790 452" stroke-width="16"/>
    <path d="M430 344 C 400 300, 396 262, 372 226" stroke-width="12"/>
    <path d="M300 380 C 262 350, 230 340, 196 318" stroke-width="11"/>
  </g>
  <g>
    <circle class="blossom" cx="356" cy="200" r="96"/>
    <circle class="blossom blossom--lit" cx="470" cy="168" r="112"/>
    <circle class="blossom blossom--deep" cx="596" cy="214" r="86"/>
    <circle class="blossom" cx="250" cy="300" r="72"/>
    <circle class="blossom blossom--lit" cx="180" cy="300" r="62"/>
    <circle class="blossom blossom--deep" cx="768" cy="404" r="78"/>
    <circle class="blossom" cx="336" cy="470" r="64"/>
    <circle class="blossom blossom--lit" cx="524" cy="286" r="70"/>
    <circle class="blossom" cx="430" cy="236" r="84"/>
    <circle class="blossom blossom--deep" cx="66"  cy="336" r="54"/>
  </g>
  <g opacity=".95">
    ${Array.from({ length: 26 }, (_, i) => {
      const x = 60 + (i * 137) % 800;
      const y = 150 + (i * 83) % 300;
      const r = 8 + ((i * 7) % 12);
      const cls = ["blossom", "blossom--lit", "blossom--deep"][i % 3];
      return `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`;
    }).join("")}
  </g>
</svg>`;

function cloud(seed, w, h, n) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w;
    const r = h * (0.55 + Math.sin(seed + i * 1.7) * 0.3);
    const y = h * 0.6 + Math.sin(seed * 2 + i) * h * 0.25;
    out += `<i style="left:${x - r}px;top:${y - r * 0.8}px;width:${r * 2}px;height:${r * 1.6}px"></i>`;
  }
  return out;
}

/* ══════════════════════════ GO ══════════════════════════ */
export function initWorld() {
  const world = document.getElementById("world");
  if (!world) return { update() {} };

  world.innerHTML = `
    <div class="world__stars" aria-hidden="true"></div>
    <div class="world__sun" id="world-sun" aria-hidden="true"></div>
    <div class="world__cloud" id="cloud-a" style="width:34vw">${cloud(1, 34, 70, 5)}</div>
    <div class="world__cloud" id="cloud-b" style="width:26vw">${cloud(4, 26, 54, 4)}</div>
    <div class="world__cloud" id="cloud-c" style="width:20vw">${cloud(7, 20, 42, 3)}</div>
    <div class="world__ridge world__ridge--far">${RIDGE_FAR}</div>
    <div class="world__ridge world__ridge--mid">${RIDGE_MID}</div>
    <div class="world__ridge world__ridge--near">${RIDGE_NEAR}</div>
    <div class="world__tree">${TREE}</div>
    <div class="world__wash" aria-hidden="true"></div>
  `;

  const sun = world.querySelector(".world__sun");
  const tree = world.querySelector(".world__tree");
  const ridges = [...world.querySelectorAll(".world__ridge")];
  const clouds = [...world.querySelectorAll(".world__cloud")];
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastCloud = -1;

  let t = 0;
  let drift = 0;
  let pinned = null;           // an explicit hour chosen by the visitor
  const listeners = [];

  /* ── PERFORMANCE ──
     Writing a custom property on <html> invalidates style for every
     element that reads it — which is basically the whole page. Doing
     that 60 times a second murders the main thread.
     So: quantise the sky to 1/64ths and only write when it changes.
     Transforms still run every frame because they are composited. */
  let lastKey = null;
  function paintSky(k) {
    const key = Math.round(t * 64);
    if (key === lastKey) return;
    lastKey = key;

    const s = root.style;
    s.setProperty("--sky-top", rgb(k.top));
    s.setProperty("--sky-mid", rgb(k.mid));
    s.setProperty("--sky-bot", rgb(k.bot));
    s.setProperty("--sky-ink", rgb(k.ink));
    s.setProperty("--sky-ink-soft", rgb(k.inkSoft));
    s.setProperty("--sky-accent", rgb(k.accent));
    s.setProperty("--star-op", k.stars.toFixed(2));
    s.setProperty("--petal-op", k.petals.toFixed(2));
    s.setProperty("--ridge-tint", rgb(k.ridge));

    world.classList.toggle("is-night", t > 0.78);
  }

  function update(progress, dt = 0.016) {
    t = Math.max(0, Math.min(1, pinned ?? progress));
    drift += dt;

    paintSky(sample(t));

    /* the sun arcs from low-left to low-right, then "sets" */
    if (sun) {
      const x = 8 + t * 92;                       // across the sky
      const arc = Math.sin(Math.min(1, t / 0.86) * Math.PI); // up then down
      const y = 78 - arc * 56;                   // % down from the top
      sun.style.transform = `translate3d(${x}%, ${y}%, 0)`;
      sun.style.opacity = t > 0.94 ? String(Math.max(0, 1 - (t - 0.94) * 16)) : "1";
    }

    /* parallax: further = slower */
    if (!reduce) {
      const vy = (t * -100).toFixed(2);
      ridges.forEach((r, i) => {
        r.style.transform = `translate3d(0, ${(parseFloat(vy) * [0.06, 0.13, 0.22][i]).toFixed(2)}vh, 0)`;
      });
      if (tree) tree.style.transform = `translate3d(0, ${(parseFloat(vy) * 0.3).toFixed(2)}vh, 0)`;

      /* clouds only move on resize / occasional tick, not every frame */
      if (drift - lastCloud > 0.5) {
        lastCloud = drift;
        const w = window.innerWidth;
        clouds.forEach((c, i) => {
          const x = ((drift * [7, 11, 15][i] + i * 420) % (w * 2.4)) - w * 0.5;
          c.style.transform = `translate3d(${x.toFixed(0)}px, ${[12, 22, 8][i]}%, 0)`;
        });
      }
    }
  }

  update(0);

  /* drive it from the scroll position of the whole document */
  const scrollApi = { progress: 0 };
  if (window.gsap && window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        scrollApi.progress = self.progress;
        update(self.progress);
        listeners.forEach((f) => f(t));
      },
      onRefresh: (self) => { scrollApi.progress = self.progress; update(self.progress); },
    });
    // keep the parallax drifting even when you stop scrolling
    window.gsap.ticker.add(() => { if (!reduce) update(scrollApi.progress, 0.016); });
  } else {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scrollApi.progress = max > 0 ? window.scrollY / max : 0;
      update(scrollApi.progress);
      listeners.forEach((f) => f(t));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }

  return {
    update,
    /** the visitor picked an hour by hand */
    pin(at) { pinned = Math.max(0, Math.min(1, at)); update(pinned); listeners.forEach((f) => f(t)); },
    /** hand control back to the scroll */
    release() { pinned = null; },
    onChange(fn) { listeners.push(fn); },
    get progress() { return t; },
    /** where the scroll says we actually are, ignoring any pin */
    get scrollProgress() { return scrollApi.progress; },
    get isPinned() { return pinned !== null; },
  };
}