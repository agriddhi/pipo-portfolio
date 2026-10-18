/* ══════════════════════════════════════════════════════════════
   PIPO — sections/game.js   (Tier 2 mini-game)
   Pipo's Sneeze Dash. She sneezes, the sky erupts in petals, and
   now you have to catch them before they hit the mountain.
   Keyboard (arrows / WASD), pointer drag, or just swipe.
   ══════════════════════════════════════════════════════════════ */

import { audio } from "../audio.js";
import { STORAGE_NS } from "../config.js";

const W = 960, H = 520;
const GROUND = H - 34;
const DURATION = 30;
const COLORS = ["#f9c2d4", "#f4a6c0", "#ffd9e4", "#e8799f", "#fff1e4", "#cbb2ec"];

export function initGame({ onEnd } = {}) {
  const cv = document.getElementById("game-canvas");
  const startBtn = document.getElementById("game-start");
  const scoreEl = document.getElementById("game-score");
  const bestEl = document.getElementById("game-best");
  const timeEl = document.getElementById("game-time");
  const msg = document.getElementById("game-msg");
  const wrap = cv?.parentElement;
  if (!cv) return;

  const ctx = cv.getContext("2d");
  let raf = 0, running = false;

  const pipo = { x: W / 2, y: GROUND - 56, vx: 0, targetX: W / 2, blink: 0, wing: 0 };
  const keys = new Set();
  let petals = [], sparks = [], score = 0, left = DURATION, spawnIn = 0;

  const BEST_KEY = `${STORAGE_NS}.sneezeBest`;
  let best = 0;
  try { best = +localStorage.getItem(BEST_KEY) || 0; } catch {}
  if (bestEl) bestEl.textContent = best;

  /* ── drawing ──────────────────────────────────────────────── */
  function drawSky(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#dfe6ff");
    g.addColorStop(0.55, "#cdd9ff");
    g.addColorStop(1, "#f3dcef");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // drifting sakura clouds
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 5; i++) {
      const x = ((t * 12 + i * 260) % (W + 300)) - 150;
      const y = 40 + i * 46;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(x, y, 70, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 34, y - 10, 46, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // the mountain
    ctx.fillStyle = "#7f8fd8";
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W * 0.2, GROUND - 120);
    ctx.lineTo(W * 0.42, GROUND - 30);
    ctx.lineTo(W * 0.62, GROUND - 96);
    ctx.lineTo(W * 0.84, GROUND - 18);
    ctx.lineTo(W, GROUND - 70);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#6b4f9e";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#8f7ac0";
    ctx.fillRect(0, GROUND, W, 5);
  }

  function drawPipo(t) {
    const { x, y } = pipo;
    const bob = Math.sin(t * 4) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    const tilt = Math.max(-0.28, Math.min(0.28, pipo.vx / 420));
    ctx.rotate(tilt);

    const bodyW = 40, bodyH = 34;

    // tail
    ctx.strokeStyle = "#f4d3e4";
    ctx.lineWidth = 9; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-bodyW * 0.8, 6);
    ctx.quadraticCurveTo(-bodyW * 1.5, 6 + Math.sin(t * 5) * 12, -bodyW * 1.9, 18 + Math.cos(t * 5) * 10);
    ctx.stroke();

    // wings
    const flap = Math.sin(t * 12) * 0.4;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * bodyW * 0.62, -4);
      ctx.rotate(s * (0.4 + flap));
      ctx.fillStyle = "rgba(232,121,159,.85)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 26, -30, s * 40, -6);
      ctx.quadraticCurveTo(s * 26, 4, 0, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // body + belly
    ctx.fillStyle = "#fbe4ec";
    ctx.beginPath(); ctx.ellipse(0, 0, bodyW, bodyH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff6ec";
    ctx.beginPath(); ctx.ellipse(4, 8, bodyW * 0.62, bodyH * 0.55, 0, 0, Math.PI * 2); ctx.fill();

    // head
    ctx.fillStyle = "#fbe4ec";
    ctx.beginPath(); ctx.arc(2, -bodyH - 10, 24, 0, Math.PI * 2); ctx.fill();

    // cream flame horns
    ctx.fillStyle = "#f7dcab";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(2 + s * 9, -bodyH - 26);
      ctx.quadraticCurveTo(2 + s * 20, -bodyH - 52, 2 + s * 9, -bodyH - 46);
      ctx.quadraticCurveTo(2 + s * 4, -bodyH - 36, 2 + s * 9, -bodyH - 26);
      ctx.fill();
    }

    // big sparkly eyes
    const bl = pipo.blink > 0 ? 0.12 : 1;
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#2a2350";
      ctx.beginPath(); ctx.ellipse(2 + s * 9, -bodyH - 12, 6.4, 7.4 * bl, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7f93e8";
      ctx.beginPath(); ctx.ellipse(2 + s * 9, -bodyH - 12, 4.4, 5.6 * bl, 0, 0, Math.PI * 2); ctx.fill();
      if (bl > 0.5) {
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(2 + s * 9 + 2, -bodyH - 15, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(2 + s * 9 - 1.4, -bodyH - 9, 0.9, 0, Math.PI * 2); ctx.fill();
      }
    }
    // smile
    ctx.strokeStyle = "#3a2350"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(2, -bodyH - 2, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();

    ctx.restore();
  }

  function petal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(1, 0.55 + Math.abs(Math.sin(p.wob)) * 0.45);
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.moveTo(0, -p.r);
    ctx.bezierCurveTo(p.r, -p.r * 0.5, p.r * 0.9, p.r * 0.8, 0, p.r);
    ctx.bezierCurveTo(-p.r * 0.9, p.r * 0.8, -p.r, -p.r * 0.5, 0, -p.r);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function spark(s) {
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.fillStyle = s.c;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2, r = i % 2 === 0 ? 7 : 2.4;
      const px = s.x + Math.cos(a) * r, py = s.y + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ── loop ─────────────────────────────────────────────────── */
  let last = 0, t = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    /* movement */
    let ax = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) ax -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) ax += 1;

    if (ax) { pipo.vx += ax * 1400 * dt; }
    else pipo.vx *= 0.86;
    if (pipo.targetX != null && !ax) {
      pipo.vx += (pipo.targetX - pipo.x) * 5 * dt;
      pipo.vx *= 0.9;
    }
    pipo.vx = Math.max(-520, Math.min(520, pipo.vx));
    pipo.x += pipo.vx * dt;
    if (pipo.x < 42) { pipo.x = 42; pipo.vx = 0; }
    if (pipo.x > W - 42) { pipo.x = W - 42; pipo.vx = 0; }
    pipo.wing = Math.abs(pipo.vx) / 400;
    pipo.blink -= dt;

    /* spawn */
    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawnIn = 0.18 + Math.random() * 0.22;
      petals.push({
        x: 40 + Math.random() * (W - 80), y: -20,
        vx: (Math.random() - 0.5) * 34,
        vy: 70 + Math.random() * 70 + (DURATION - left) * 1.6,
        rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 3,
        wob: Math.random() * 6.3,
        r: 8 + Math.random() * 7,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1,
      });
    }

    /* update + collide */
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.wob += dt * 4;
      p.x += p.vx + Math.sin(p.wob) * 30 * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      const d = Math.hypot(p.x - pipo.x, p.y - pipo.y);
      if (d < 44) {
        petals.splice(i, 1);
        score++;
        if (scoreEl) scoreEl.textContent = score;
        audio._voice(880 + (score % 8) * 110, { dur: 0.3, gain: 0.14, type: "sine" });
        for (let k = 0; k < 8; k++) {
          const a = Math.random() * 6.3;
          sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 - 40, life: 1, c: p.c });
        }
        continue;
      }
      if (p.y > H) { sparks.push({ x: p.x, y: H - 14, vx: 0, vy: -30, life: .5, c: "#b9a4d6" }); petals.splice(i, 1); }
    }

    sparks = sparks.filter((s) => {
      s.life -= dt * 1.6; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 320 * dt;
      return s.life > 0;
    });

    /* clock */
    left -= dt;
    if (timeEl) timeEl.textContent = Math.max(0, Math.ceil(left));
    if (left <= 0) { end(); return; }

    /* paint */
    drawSky(t);
    petals.forEach(petal);
    sparks.forEach(spark);
    drawPipo(t);

    if (msg && !msg.dataset.locked) {
      msg.dataset.locked = "1";
      msg.textContent = "left / right or drag · catch everything you can";
    }
  }

  /* ── input ────────────────────────────────────────────────── */
  const onKeyDown = (e) => {
    if (!running) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s"].includes(k)) {
      keys.add(k); e.preventDefault();
    }
  };
  const onKeyUp = (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  let dragging = false;
  const toX = (clientX) => {
    const r = cv.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * W;
  };
  cv.addEventListener("pointerdown", (e) => { if (!running) return; dragging = true; pipo.targetX = toX(e.clientX); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", (e) => { if (dragging && running) pipo.targetX = toX(e.clientX); });
  const up = () => { dragging = false; pipo.targetX = null; };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);

  /* ── lifecycle ────────────────────────────────────────────── */
  function start() {
    audio.resume();
    score = 0; left = DURATION; spawnIn = 0; petals = []; sparks = [];
    pipo.x = W / 2; pipo.vx = 0; pipo.targetX = null;
    running = true;
    last = performance.now();
    if (scoreEl) scoreEl.textContent = "0";
    if (timeEl) timeEl.textContent = DURATION;
    if (startBtn) startBtn.hidden = true;
    if (msg) msg.textContent = "left / right or drag · catch everything you can";
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function end() {
    running = false;
    cancelAnimationFrame(raf);
    if (startBtn) { startBtn.hidden = false; startBtn.textContent = "again ▶"; }
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch {}
      if (msg) msg.textContent = `new best: ${best} petals. pipo is genuinely impressed.`;
    } else if (msg) msg.textContent = `${score} petals. best is ${best}. one more?`;
    onEnd?.(score, best);
    audio.sparkle();
  }

  startBtn?.addEventListener("click", start);

  /* only run when you can see it */
  if (wrap && "IntersectionObserver" in window) {
    new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting && running) end(); }), { threshold: 0.05 })
      .observe(wrap);
  }

  /* Idle preview before you press start — but only while the section is
     actually on screen. Repainting a 960×520 canvas 60 times a second
     for a picture nobody is looking at is pure waste. */
  let preview = true;
  let previewOnScreen = true;
  if (wrap && "IntersectionObserver" in window) {
    new IntersectionObserver(
      (es) => { previewOnScreen = es[0].isIntersecting; },
      { threshold: 0 }
    ).observe(wrap);
  }

  (function previewLoop() {
    if (!preview) return;
    requestAnimationFrame(previewLoop);
    if (!previewOnScreen || document.hidden) return;
    const tt = performance.now() / 1000;
    pipo.x = W / 2 + Math.sin(tt * 0.8) * 260;
    drawSky(tt);
    drawPipo(tt);
  })();
  startBtn?.addEventListener("click", () => { preview = false; });

  return { start, end, get score() { return score; } };
}