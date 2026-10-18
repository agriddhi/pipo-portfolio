/* ══════════════════════════════════════════════════════════════
   PIPO — sky.js
   · falling sakura petals, always, whatever the hour
   · the sky button — which now scrubs the whole world to a
     chosen hour instead of swapping a palette
   ══════════════════════════════════════════════════════════════ */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ══════════════════════════ PETALS ══════════════════════════ */
export function initPetals() {
  const cv = document.getElementById("petals");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const COUNT = window.innerWidth < 700 ? 26 : 54;

  let w = 0, h = 0;
  function size() {
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener("resize", size, { passive: true });

  const PINK = ["#f9c2d4", "#f4a6c0", "#ffd9e4", "#e8799f", "#fff1e4"];

  const petals = Array.from({ length: COUNT }, () => spawn(true));
  function spawn(anywhere = false) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -20,
      r: 3 + Math.random() * 7,
      vy: 0.25 + Math.random() * 0.7,
      vx: -0.35 - Math.random() * 0.5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.045,
      wob: Math.random() * Math.PI * 2,
      wobAmp: 0.4 + Math.random() * 1.4,
      a: 0.25 + Math.random() * 0.6,
      c: PINK[(Math.random() * PINK.length) | 0],
    };
  }

  function drawPetal(p) {
    const r = p.r;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(1, 0.55 + Math.abs(Math.sin(p.wob)) * 0.45);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.95, -r * 0.55, r * 0.85, r * 0.72, 0, r);
    ctx.bezierCurveTo(-r * 0.85, r * 0.72, -r * 0.95, -r * 0.55, 0, -r);
    ctx.closePath();
    ctx.fillStyle = p.c;
    ctx.globalAlpha = p.a;
    ctx.fill();
    ctx.restore();
  }

  let visible = true;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; });

  (function loop() {
    requestAnimationFrame(loop);
    if (!visible || reduce) return;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    // read the live CSS var once per frame, not once per petal
    const op = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--petal-op")) || 0.3;

    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];
      p.wob += 0.03;
      p.x += p.vx + Math.sin(p.wob) * 0.35;
      p.y += p.vy;
      p.rot += p.vr;

      if (p.y > h + 30 || p.x < -40) petals[i] = spawn(false);

      drawPetal({ ...p, a: p.a * Math.min(1, op * 1.6) });
    }
  })();
}

/* ══════════════════════════ THE SKY BUTTON ══════════════════════════ */
const HOURS = [
  { name: "morning", at: 0.06 },
  { name: "noon",    at: 0.40 },
  { name: "dusk",    at: 0.72 },
  { name: "night",   at: 0.98 },
];

export function initSkyControl(world) {
  const btn = document.getElementById("btn-sky");
  const label = document.getElementById("sky-state");
  if (!btn || !world) return;

  let idx = -1;   // -1 = the scroll decides

  btn.addEventListener("click", () => {
    idx = (idx + 1) % (HOURS.length + 1);
    window.__pipoAudio?.click();

    if (idx >= HOURS.length) {
      world.release();
      if (label) label.textContent = "auto";
      btn.setAttribute("aria-pressed", "false");
      return;
    }

    const h = HOURS[idx];
    world.pin(h.at);
    if (label) label.textContent = h.name;
    btn.setAttribute("aria-pressed", "true");
  });

  /* keep the label in sync with whatever the scroll is doing */
  world.onChange?.((p) => {
    if (idx >= 0) return;
    if (label) label.textContent = p < 0.22 ? "morning" : p < 0.55 ? "noon" : p < 0.8 ? "dusk" : "night";
  });
}