import { STORAGE_NS } from "./config.js";
/* ══════════════════════════════════════════════════════════════
   PIPO — weather.js
   Weather is the other half of the sky.

   Because her scales shift colour with the weather, it is very much
   her business. Five states, one shared canvas, and it blends with
   whatever hour the time machine is currently holding — so you can
   stand in the snow at noon.

     ✿ petals   the default. always a little.
     ☂ rain     the mountain gets serious
     ❄ snow     quiet, slow, good for reading
     ✺ storm    petals sideways and fast
     ☀ clear    nothing. just the mountain.
   ══════════════════════════════════════════════════════════════ */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(pointer: coarse)").matches;
const KEY = `${STORAGE_NS}.weather`;

export const WEATHER = [
  { id: "petals", icon: "✿", name: "petals",  say: "the usual. it is always the usual." },
  { id: "rain",   icon: "☂", name: "rain",    say: "oh no. the mountain is being dramatic." },
  { id: "snow",   icon: "❄", name: "snow",    say: "shhh. it is snowing. you are allowed to be quiet now." },
  { id: "storm",  icon: "✺", name: "storm",   say: "this is fine. this is completely fine. ACHOO." },
  { id: "clear",  icon: "☀", name: "clear",   say: "nothing is falling. look how far you can see." },
];

export function initWeather({ onSay } = {}) {
  const cv = document.getElementById("weather");
  const btn = document.getElementById("btn-weather");
  const label = document.getElementById("weather-state");
  const word = document.getElementById("weather-word");
  const root = document.documentElement;
  if (!cv || !btn) return null;

  const ctx = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);

  let w = 0, h = 0;
  function size() {
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener("resize", size, { passive: true });

  let idx = 0;
  try {
    const saved = localStorage.getItem(KEY);
    const i = WEATHER.findIndex((x) => x.id === saved);
    if (i >= 0) idx = i;
  } catch {}

  let mode = WEATHER[idx].id;
  let wind = 0;        // -1 .. 1, drifts
  let flashes = 0;
  let parts = [];
  let raf = 0;

  const COUNT = () => ({
    petals: coarse ? 40 : 90,
    rain: coarse ? 90 : 190,
    snow: coarse ? 70 : 150,
    storm: coarse ? 110 : 240,
    clear: 0,
  }[mode]);

  const PAL = {
    petals: ["#f9c2d4", "#f4a6c0", "#ffd9e4", "#e8799f", "#fff1e4"],
    rain:   ["#b9c9e8", "#dfe8ff", "#8fa6c9"],
    snow:   ["#ffffff", "#f2f6ff", "#ffeede"],
    storm:  ["#f9c2d4", "#ffd9e4", "#cbb2ec"],
    clear:  [],
  };

  function spawn(initial = false) {
    const heavy = mode === "storm";
    return {
      x: Math.random() * (w + 240) - 120,
      y: initial ? Math.random() * h : -20,
      r: mode === "snow" ? 1.5 + Math.random() * 3.5
        : mode === "rain" ? 6 + Math.random() * 14
        : 4 + Math.random() * 9,
      vx: (mode === "rain" ? -2 : (Math.random() - 0.5) * 1.6) + (heavy ? 9 : 0),
      vy: mode === "snow" ? 16 + Math.random() * 26
        : mode === "rain" ? 380 + Math.random() * 420
        : (heavy ? 150 : 45) + Math.random() * 80,
      rot: Math.random() * 6.3,
      vr: (Math.random() - 0.5) * (mode === "petals" || heavy ? 0.3 : 0.05),
      wob: Math.random() * 6.3,
      a: 0.35 + Math.random() * 0.55,
      c: PAL[mode][(Math.random() * PAL[mode].length) | 0],
    };
  }

  function drawPetal(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.scale(1, 0.55 + Math.abs(Math.sin(o.wob)) * 0.45);
    ctx.globalAlpha = o.a;
    ctx.fillStyle = o.c;
    ctx.beginPath();
    ctx.moveTo(0, -o.r);
    ctx.bezierCurveTo(o.r, -o.r * 0.5, o.r * 0.9, o.r * 0.8, 0, o.r);
    ctx.bezierCurveTo(-o.r * 0.9, o.r * 0.8, -o.r, -o.r * 0.5, 0, -o.r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRain(o) {
    ctx.globalAlpha = 0.32 + o.a * 0.4;
    ctx.strokeStyle = o.c;
    ctx.lineWidth = Math.max(1, o.r * 0.28);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(o.x - o.vx * 0.35, o.y + o.r * 4);
    ctx.stroke();
  }

  function drawSnow(o) {
    ctx.globalAlpha = o.a;
    ctx.fillStyle = o.c;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const DRAW = { petals: drawPetal, storm: drawPetal, rain: drawRain, snow: drawSnow };

  let last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (reduce || document.hidden) return;

    ctx.clearRect(0, 0, w, h);

    // the wind breathes
    wind = Math.sin(now / 4200) * 0.6 + (mode === "storm" ? 0.9 : 0);

    const want = COUNT();
    while (parts.length < want) parts.push(spawn(true));
    if (parts.length > want) parts.length = want;

    for (let i = parts.length - 1; i >= 0; i--) {
      const o = parts[i];
      o.wob += dt * (mode === "snow" ? 1.6 : 3);
      const drift = mode === "snow" ? Math.sin(o.wob) * 22 : Math.sin(o.wob) * 26;
      o.x += (o.vx + drift) * dt + wind * 34 * dt;
      o.y += o.vy * dt;
      o.rot += o.vr * dt;

      if (o.y > h + 30 || o.x < -160 || o.x > w + 160) { parts.splice(i, 1); parts.push(spawn(false)); continue; }
      DRAW[mode]?.(o);
    }

    // lightning
    if (mode === "storm") {
      if (Math.random() < dt * 0.28) flashes = 5;
      if (flashes > 0) {
        flashes--;
        ctx.globalAlpha = Math.min(0.5, flashes * 0.1);
        ctx.fillStyle = "#efe6ff";
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }
    }

    ctx.globalAlpha = 1;
  }
  raf = requestAnimationFrame(frame);

  /* ── switching ── */
  function set(i, quiet = false) {
    idx = (i + WEATHER.length) % WEATHER.length;
    mode = WEATHER[idx].id;
    parts = [];
    try { localStorage.setItem(KEY, mode); } catch {}
    root.setAttribute("data-weather", mode);
    btn.setAttribute("aria-pressed", String(mode !== "petals"));
    if (label) label.textContent = WEATHER[idx].name;
    if (word) word.textContent = WEATHER[idx].say;
    /* the weather control is a project card now, not a header button, so
       look for either shape. A null here used to throw and take the
       entire page down with it. */
    const iconEl = btn.querySelector(".hbtn__icon, .proj__icon");
    if (iconEl) iconEl.textContent = WEATHER[idx].icon;
    if (!quiet) { window.__pipoAudio?.click(); onSay?.(WEATHER[idx]); }
  }

  btn.addEventListener("click", () => set(idx + 1));

  set(idx, true);

  return { set, get mode() { return mode; }, WEATHER };
}