import { STORAGE_NS } from "./config.js";
﻿/* ══════════════════════════════════════════════════════════════
   PIPO — cursor.js
   Side Quests:
     · Sparkle Cursor Trail   (+2) — retro glitter, sakura-coloured
     · Hit Counter Odometer   (+1) — real rolling mechanical wheels
   Plus the nightlight mask that lights the dark story layers.
   ══════════════════════════════════════════════════════════════ */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(pointer: coarse)").matches;

/* ══════════════════════════════════════════════════════════════
   SPARKLE TRAIL
   ══════════════════════════════════════════════════════════════ */
export function initSparkleTrail() {
  const cv = document.getElementById("sparkle");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const COLORS = ["#f4a6c0", "#fff1e4", "#ffc36b", "#e8799f", "#ffffff", "#ffd9e4"];
  const POOL = coarse ? 90 : 260;
  const bits = Array.from({ length: POOL }, () => ({ life: 0 }));

  let head = 0, w = 0, h = 0, raf = 0, aliveFor = 0;

  function size() {
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener("resize", size, { passive: true });

  function spawn(x, y) {
    const b = bits[head];
    head = (head + 1) % POOL;
    b.x = x; b.y = y;
    b.vx = (Math.random() - 0.5) * 1.1;
    b.vy = -0.25 - Math.random() * 0.9;
    b.life = 1;
    b.decay = 0.012 + Math.random() * 0.02;
    b.size = 2 + Math.random() * 5;
    b.color = COLORS[(Math.random() * COLORS.length) | 0];
    b.spin = (Math.random() - 0.5) * 0.25;
    b.a = Math.random() * Math.PI;
  }

  function star(x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const ang = rot + (i * Math.PI) / 2;
      const rr = i % 2 === 0 ? r : r * 0.32;
      const px = x + Math.cos(ang) * rr;
      const py = y + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  window.addEventListener("pointermove", (e) => {
    if (reduce) return;
    const mx = e.clientX, my = e.clientY;
    const n = coarse ? 2 : 3;
    for (let i = 0; i < n; i++) spawn(mx + (Math.random() - 0.5) * 12, my + (Math.random() - 0.5) * 12);
    aliveFor = 900;
  }, { passive: true });

  window.addEventListener("pointerdown", (e) => {
    if (reduce) return;
    for (let i = 0; i < (coarse ? 14 : 22); i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 1.4 + Math.random() * 3.2;
      spawn(e.clientX, e.clientY);
      const b = bits[(head - 1 + POOL) % POOL];
      b.vx = Math.cos(ang) * sp;
      b.vy = Math.sin(ang) * sp - 0.6;
      b.life = 1.3;
    }
    aliveFor = 1200;
  }, { passive: true });

  /* the loop only runs while there is something to draw — an idle page
     does not repaint 60 times a second for no reason */
  function frame() {
    ctx.clearRect(0, 0, w, h);
    let alive = false;

    for (const b of bits) {
      if (b.life <= 0) continue;
      b.life -= b.decay;
      if (b.life <= 0) continue;
      alive = true;

      b.vy += 0.012;
      b.vx *= 0.985;
      b.x += b.vx; b.y += b.vy; b.a += b.spin;

      ctx.globalAlpha = Math.max(0, Math.min(1, b.life));
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = b.color;
      star(b.x, b.y, b.size * (0.5 + b.life * 0.6), b.a);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (alive || aliveFor > 0) {
      aliveFor -= 16;
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
      ctx.clearRect(0, 0, w, h);
    }
  }

  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  window.addEventListener("pointermove", kick, { passive: true });
  window.addEventListener("pointerdown", kick, { passive: true });
}

/* ══════════════════════════════════════════════════════════════
   NIGHTLIGHT MASK
   ══════════════════════════════════════════════════════════════ */
export function initNightlight() {
  const el = document.getElementById("nightlight");
  if (!el) return () => {};
  if (coarse || reduce) return () => {};

  let on = false, raf = 0, tx = 50, ty = 50, x = 50, y = 50;

  function turn(v) {
    on = v;
    el.classList.toggle("on", on);
    if (on && !raf) raf = requestAnimationFrame(tick);
    if (!on) cancelAnimationFrame(raf), (raf = 0);
  }

  window.addEventListener("pointermove", (e) => {
    tx = (e.clientX / window.innerWidth) * 100;
    ty = (e.clientY / window.innerHeight) * 100;
    if (!on) turn(true);
  }, { passive: true });

  window.addEventListener("pointerdown", () => turn(true), { passive: true });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") turn(false);
    if (e.key.toLowerCase() === "l") turn(!on);
  });

  function tick() {
    if (!on) return;
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    el.style.setProperty("--nx", x.toFixed(2) + "%");
    el.style.setProperty("--ny", y.toFixed(2) + "%");
    raf = requestAnimationFrame(tick);
  }

  return { turn, get on() { return on; } };
}

/* ══════════════════════════════════════════════════════════════
   HIT COUNTER ODOMETER  (+1)
   Real rolling wheels rather than one number in a box. Each digit
   is a strip of 0-9 that spins until it lands, and the wheels
   settle right-to-left — like a mechanical counter falling.
   ══════════════════════════════════════════════════════════════ */
export function initOdometer() {
  const root = document.getElementById("odometer");
  const el = document.getElementById("odo");
  const sr = document.getElementById("odo-sr");
  if (!el || !root) return;

  const KEY = `${STORAGE_NS}.dreamsDelivered`;
  let value = 1204;

  try {
    const extra = parseInt(localStorage.getItem(KEY) || "0", 10);
    const n = isNaN(extra) ? 0 : extra;
    value = 1204 + n;
    localStorage.setItem(KEY, String(n));
  } catch {}

  const fmt = (n) => n.toLocaleString("en-US");

  /* one wheel per digit, commas preserved in place */
  el.innerHTML = "";
  const wheels = [];
  for (const c of fmt(value)) {
    if (c === ",") {
      const s = document.createElement("i");
      s.className = "odometer__comma";
      s.textContent = ",";
      el.appendChild(s);
      continue;
    }
    const w = document.createElement("b");
    w.className = "odometer__wheel";
    const strip = document.createElement("span");
    strip.className = "odometer__strip";
    // 27 entries so a wheel can run past 9 before landing
    for (let n = 0; n < 26; n++) {
      const i = document.createElement("i");
      i.textContent = String(n % 10);
      strip.appendChild(i);
    }
    const last = document.createElement("i");
    last.textContent = c;
    strip.appendChild(last);
    w.appendChild(strip);
    el.appendChild(w);
    wheels.push({ strip, target: +c });
  }

  const paint = () => { if (sr) sr.textContent = "dreams delivered: " + fmt(value); };

  const settle = (i, delay) => setTimeout(() => {
    const w = wheels[i];
    if (!w) return;
    w.strip.style.transition = "transform 1.1s cubic-bezier(.18,1.5,.4,1)";
    w.strip.style.transform = `translateY(${-w.target * 1.35}em)`;
  }, delay);

  function start() {
    root.classList.add("is-rolling");
    wheels.forEach((_, i) => settle(i, 120 + i * 190));
    paint();
    setTimeout(() => root.classList.remove("is-rolling"), 2400);
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { start(); io.disconnect(); } });
    }, { threshold: 0.4 });
    io.observe(root);
  } else start();

  return {
    /** spin only the wheels that actually changed */
    bump(n = 1) {
      try {
        const cur = parseInt(localStorage.getItem(KEY) || "0", 10) || 0;
        localStorage.setItem(KEY, String(cur + n));
      } catch {}
      value += n;
      paint();

      let wi = 0;
      for (const c of fmt(value)) {
        if (c === ",") continue;
        const w = wheels[wi++];
        if (!w) continue;
        const next = +c;
        if (next === w.target) continue;
        w.target = next;
        // a full turn first, so it reads mechanical rather than a glitch
        w.strip.style.transition = "none";
        w.strip.style.transform = `translateY(${-(next + 10) * 1.35}em)`;
        requestAnimationFrame(() => {
          w.strip.style.transition = "transform .75s cubic-bezier(.2,1.6,.4,1)";
          w.strip.style.transform = `translateY(${-next * 1.35}em)`;
        });
      }
    },
  };
}