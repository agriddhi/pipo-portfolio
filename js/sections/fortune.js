/* ══════════════════════════════════════════════════════════════
   PIPO — sections/fortune.js   (Project P/03)
   THE FORTUNE MACHINE, in pixel art.

   The cookie is drawn on a genuinely low-resolution canvas (96×96)
   and scaled up with nearest-neighbour, so it is real pixel art
   rather than a rounded div pretending. Everything snaps to whole
   pixels — there is no anti-aliasing anywhere in here.

   Frames:
     0  whole, sealed
     1  the seam widens
     2  it splits, the slip pokes out
     3  open, the slip has unrolled
   ══════════════════════════════════════════════════════════════ */

import { audio } from "../audio.js";

/* ── palette, taken straight from Pipo's own scales ── */
const C = {
  rim:    "#8a4a2e",
  crust:  "#c9764a",
  mid:    "#e0a06a",
  light:  "#f6c894",
  hi:     "#ffe6bd",
  seam:   "#fff3e0",
  paper:  "#fff8f1",
  paper2: "#f0dfca",
  ink:    "#3a2350",
  pink:   "#e8799f",
  pink2:  "#f9c2d4",
  lav:    "#cbb2ec",
};

const S = 96;                 // logical sprite size — one unit = one pixel
const px = (x, y, w, h, col) => {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
};

const FORTUNES = [
  "The thing you are worried about will turn out to be a very small thing.",
  "Someone is going to be kind to you today without expecting anything back.",
  "You are allowed to want things. Wanting is not greed.",
  "The next door will open. It is already warm on the other side.",
  "You will think of the right thing about eleven minutes too late, and it will still work.",
  "A very old friend is thinking about you right now.",
  "Something you gave away will come back wearing a different coat.",
  "The good news is small and the bad news is smaller. Look for the small good news.",
  "You will laugh at something today that is not funny. That is the best kind.",
  "There is a version of tomorrow that is easier than the one you are picturing.",
  "Say the compliment. You have been holding it for a week.",
  "Rest is not the same as giving up, and the difference is going to matter.",
  "The thing you lost is not gone. It is just somewhere you have not looked.",
  "You are exactly the amount of enough that you are.",
  "Ask for help. It is the most underrated superpower there is.",
];

const ASIDES = [
  "Pipo adds: <b>“i told you.”</b>",
  "Pipo adds: <b>“this is legally binding. i checked. i made the rules.”</b>",
  "Pipo adds: <b>“my lovely friend on the third roof says hi.”</b>",
  "Pipo adds: <b>“do not snack on this, the crumbs are load-bearing.”</b>",
  "Pipo adds: <b>“i will be back in three hundred years to check if you did it.”</b>",
  "Pipo adds: <b>“rate it out of ten. actually don't. it is perfect.”</b>",
  "Pipo adds: <b>“if this is wrong, blame the dragon. not me. i only cracked it.”</b>",
];

let ctx = null;

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ══════════════════════════ THE SPRITE ══════════════════════════ */

/** a folded cookie half, drawn row by row so every edge stays a hard pixel.
    No ctx.rotate anywhere in this file — rotating anti-aliases fillRect and
    smears the pixel grid. Everything moves in whole pixels instead. */
function drawHalf(dir, ox, oy) {
  const cx = S / 2, cy = S / 2 + 6;
  const rx = 37, ry = 27;          // wider than tall: a folded disc, not a pie
  ox = Math.round(ox); oy = Math.round(oy);

  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t <= 0) continue;
    const half = Math.sqrt(t) * rx;
    const ny = (y + ry) / (2 * ry);

    // identical shading on both halves, so a cracked cookie still
    // reads as one cookie rather than two different biscuits
    let col = C.mid;
    if (ny < 0.34) col = C.light;
    if (ny < 0.13) col = C.hi;
    if (ny > 0.76) col = C.crust;

    const yy = cy + y + oy;

    if (dir < 0) {
      px(cx - half + ox, yy, half, 1, col);
      px(cx - half + ox, yy, 2, 1, C.rim);        // baked outer edge
      px(cx - 2 + ox, yy, 2, 1, C.seam);         // the fold, pressed pale
    } else {
      px(cx + ox, yy, half, 1, col);
      px(cx + half - 2 + ox, yy, 2, 1, C.rim);
      px(cx + ox, yy, 2, 1, C.seam);
    }
  }

  // the crimp marks pressed along the fold
  for (let i = -2; i <= 2; i++) {
    px(dir < 0 ? cx - 4 + ox : cx + 2 + ox, cy + i * 8 + oy, 2, 2, C.rim);
  }
}

/** a few baked freckles, so it is not a flat blob */
function freckles() {
  const spots = [[30, 42], [64, 38], [40, 70], [70, 62], [24, 58], [56, 32], [46, 78], [78, 50]];
  spots.forEach(([x, y], i) => {
    px(x + (i % 3), y + (i % 2), 2, 2, i % 2 ? C.crust : C.rim);
  });
}

/** the fortune slip, unrolling out of the fold */
function drawSlip(t) {
  const w = 32;
  const h = Math.round(4 + t * 32);
  const x = S / 2 - w / 2;
  const y = S / 2 + 6 - 4 - h;

  px(x + 2, y, w - 4, h, C.paper2);        // shadow edge
  px(x, y, w, h, C.paper);

  // "handwriting" appears once it is mostly out
  if (t > 0.45) {
    const rows = Math.min(3, Math.floor((t - 0.45) * 7));
    for (let i = 0; i < rows; i++) {
      const ly = y + 7 + i * 6;
      if (ly > y + h - 4) break;
      px(x + 6, ly, 10 + ((i * 7) % 11), 2, C.ink);
    }
  }
  // the curled top lip of the slip
  px(x, y, w, 2, C.pink2);
  px(x, y + 2, w, 1, C.paper);
}

/** a few sakura petals drifting inside the machine's little window */
function drawPetals(t) {
  if (reduce) return;
  for (let i = 0; i < 5; i++) {
    const seed = i * 97;
    const x = 5 + ((seed * 3 + t * 240 * (0.5 + (i % 3) * 0.3)) % (S - 10));
    const y = 5 + ((seed * 5 + t * 470 * (0.6 + (i % 2) * 0.5)) % (S - 10));
    const s = 2 + (i % 2);
    px(x, y, s, s, i % 2 ? C.pink : C.pink2);
    px(x + 1, y - 1, 1, 1, C.seam);
  }
}

/* ── one full frame ── */
function render(frame, t = 0) {
  ctx.clearRect(0, 0, S, S);

  // a soft pixel halo so the sprite is not floating in nothing
  for (let y = 0; y < S; y += 4) {
    for (let x = 0; x < S; x += 4) {
      const d = Math.hypot(x - S / 2, y - (S / 2 + 6)) / 42;
      if (d < 1) px(x, y, 4, 4, d < 0.6 ? "rgba(255,244,230,0.11)" : "rgba(255,244,230,0.04)");
    }
  }

  drawPetals(t);

  if (frame === 0) {
    drawHalf(-1, 0, 0);
    drawHalf(1, 0, 0);
    freckles();
  } else if (frame === 1) {
    // the fold gives — the halves pull apart a hair
    drawHalf(-1, -2, -1);
    drawHalf(1, 2, 1);
    freckles();
    px(S / 2 - 1, S / 2 + 4, 3, 2, C.seam);
  } else if (frame === 2) {
    drawHalf(-1, -6, -3);
    drawHalf(1, 6, 3);
    freckles();
    drawSlip(0.35);
  } else {
    drawHalf(-1, -11, -5);
    drawHalf(1, 11, 5);
    freckles();
    drawSlip(1);
  }
}

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ══════════════════════════ THE MACHINE ══════════════════════════ */
export function initFortune({ confetti, sneeze, onCrack } = {}) {
  const btn = document.getElementById("fortune-btn");
  const cv = document.getElementById("fortune-pixel");
  const card = document.getElementById("fortune-card");
  const line = document.getElementById("fortune-line");
  const aside = document.getElementById("fortune-aside");
  const again = document.getElementById("fortune-again");
  if (!btn || !cv || !card) return;

  cv.width = S; cv.height = S;
  ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let frame = 0;
  let raf = 0;
  let busy = false;
  let t = 0;
  let onScreen = false;

  function loop() {
    t += 0.016;
    render(frame, t);
    raf = requestAnimationFrame(loop);
  }

  /* paint one frame immediately, whether or not the ambient loop is
     running — so the crack always reads correctly */
  const paint = () => { t += 0.02; render(frame, t); };

  /* only animate continuously while the machine is on screen */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (es) => {
        onScreen = es[0].isIntersecting;
        if (onScreen && !raf) { t = 0; raf = requestAnimationFrame(loop); }
        else if (!onScreen && raf) { cancelAnimationFrame(raf); raf = 0; }
      },
      { threshold: 0.05 }
    ).observe(cv);
  } else { onScreen = true; raf = requestAnimationFrame(loop); }

  const steps = [
    { f: 1, ms: 180, sfx: () => audio._voice(340, { dur: 0.2, gain: 0.16, type: "square" }) },
    { f: 2, ms: 260, sfx: () => audio._voice(880, { dur: 0.5, gain: 0.22, type: "square" }) },
    { f: 3, ms: 320, sfx: () => { audio._voice(1244, { dur: 0.8, gain: 0.14, type: "sine" }); confetti?.(null, 90); sneeze?.(0.7); } },
  ];

  function crack() {
    if (busy) return;
    busy = true;

    // the machine rattles
    btn.classList.add("is-cracking");

    let delay = 0;
    steps.forEach((st) => {
      delay += st.ms;
      setTimeout(() => { frame = st.f; paint(); st.sfx(); }, delay);
    });

    setTimeout(() => {
      line.textContent = pick(FORTUNES);
      aside.innerHTML = pick(ASIDES);
      card.hidden = false;
      audio.sparkle();
      btn.classList.remove("is-cracking");
      // say plainly that this cookie is used up, so a cracked cookie
      // on screen never reads as "it was already like that"
      const deck = btn.querySelector(".fortune__deck b");
      if (deck) deck.textContent = "press for another";
      btn.setAttribute("aria-label", "Crack another fortune cookie");
      onCrack?.();
      busy = false;
    }, delay + 180);
  }

  btn.addEventListener("click", crack);

  again?.addEventListener("click", () => {
    card.hidden = true;
    frame = 0;                    // back to a whole cookie before the next crack
    paint();
    line.textContent = "";
    aside.innerHTML = "";
    audio.click();
    setTimeout(crack, 220);
  });

  render(0, 0);
  return { crack, get frame() { return frame; } };
}