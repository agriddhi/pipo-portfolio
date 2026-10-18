/* ══════════════════════════════════════════════════════════════
   PIPO — easter.js
   Required by the brief: at least one hidden Easter egg.
   Shipped: five, because a dragon this small deserves to be found.

     1 · type  p i p o   → Pipo swoops in and sparkles
     2 · type  a c h o o → she actually sneezes, and it rains petals
     3 · click the moon  three times
     4 · ↑↑↓↓←→←→BA      → chaos mode, unlocked for everyone
     5 · click the footer star → a whole sky of petals
   ══════════════════════════════════════════════════════════════ */

import { audio } from "./audio.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ══════════════════════════ PETAL CONFETTI ══════════════════════════ */
export function initConfetti() {
  const cv = document.getElementById("confetti");
  if (!cv) return () => {};
  const ctx = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0, bits = [], raf = 0;

  const size = () => {
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  window.addEventListener("resize", size, { passive: true });

  function step() {
    ctx.clearRect(0, 0, w, h);
    bits = bits.filter((o) => {
      o.life -= 0.011;
      if (o.life <= 0 || o.y > h + 40) return false;
      o.vy += 0.1; o.vx *= 0.99;
      o.x += o.vx; o.y += o.vy; o.rot += o.vr;
      draw(o);
      return true;
    });
    if (bits.length) raf = requestAnimationFrame(step);
    else { cv.classList.remove("run"); raf = 0; }
  }

  function draw(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, o.life));
    ctx.fillStyle = o.c;
    if (o.star) {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2, r = i % 2 === 0 ? o.r : o.r * 0.34;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.scale(1, 0.6);
      ctx.beginPath();
      ctx.moveTo(0, -o.r);
      ctx.bezierCurveTo(o.r, -o.r * 0.5, o.r * 0.9, o.r * 0.8, 0, o.r);
      ctx.bezierCurveTo(-o.r * 0.9, o.r * 0.8, -o.r, -o.r * 0.5, 0, -o.r);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  return function burst(origin = null, amount = 90) {
    if (reduce) return;
    const ox = origin?.x ?? w / 2;
    const oy = origin?.y ?? h / 2;
    const COLORS = ["#f4a6c0", "#ffd9e4", "#ffd08a", "#fff1e4", "#e8799f", "#cbb2ec"];
    for (let i = 0; i < amount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 9;
      bits.push({
        x: ox, y: oy,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 3,
        rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.3,
        r: 4 + Math.random() * 8,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        star: Math.random() < 0.4,
        life: 1,
      });
    }
    cv.classList.add("run");
    if (!raf) raf = requestAnimationFrame(step);
  };
}

/* ══════════════════════════ TOAST ══════════════════════════ */
export function initToast() {
  const el = document.getElementById("easter-toast");
  let timer;
  return function toast(msg, ms = 4400) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(timer);
    timer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => { el.hidden = true; }, 450);
    }, ms);
  };
}

/* ══════════════════════════ THE EGGS ══════════════════════════ */
export function initEasterEggs({ scene, toast, confetti, setChaos, sneeze, pipo } = {}) {
  const found = new Set();

  function celebrate(id, msg) {
    if (found.has(id)) return false;
    found.add(id);
    audio.sparkle();
    confetti(null, 70);
    toast(msg);
    return true;
  }

  /* ── 1 & 2 · typing ── */
  let buf = "";
  const typing = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    buf = (buf + e.key.toLowerCase()).slice(-12);

    if (buf.endsWith("achoo")) {
      buf = "";
      audio.sneeze();
      setTimeout(() => sneeze?.(1), 260);
      toast("a-CHOO. and now it is petals everywhere. sorry. she cannot help it. 🌸");
      return;
    }
    if (buf.endsWith("pipo")) {
      buf = "";
      if (celebrate("name", "you said her name. she heard you. ✿")) {
        const r = document.querySelector(".hero__name")?.getBoundingClientRect();
        if (r) scene?.sendTo(r.left + r.width / 2, r.top + r.height / 2, 1200);
      }
    }
  };
  window.addEventListener("keydown", typing);

  /* ── 3 · the moon, top-centre of the hero ── */
  let moonClicks = 0;
  document.getElementById("hero")?.addEventListener("click", (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    if (Math.hypot(x - 0.5, y - 0.18) > 0.16) { moonClicks = 0; return; }
    moonClicks++;
    if (moonClicks >= 3) {
      moonClicks = 0;
      celebrate("moon", "you knocked on the moon. somebody knocked back. 🌙");
    } else audio.hover();
  });

  /* ── 4 · Konami ── */
  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let ki = 0;
  window.addEventListener("keydown", (e) => {
    ki = e.key.toLowerCase() === KONAMI[ki].toLowerCase() ? ki + 1 : 0;
    if (ki !== KONAMI.length) return;
    ki = 0;
    if (!found.has("konami")) { found.add("konami"); confetti(null, 120); audio.sparkle(); }
    toast("↑↑↓↓←→←→BA — okay, you found the good one. chaos mode unlocked.", 5200);
    setChaos?.(true);
  });

  /* ── 5 · the footer star ── */
  document.getElementById("foot-sign")?.addEventListener("click", () => {
    if (celebrate("footer", "a whole sky of petals. she is very pleased. ✦")) {
      document.getElementById("story")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }
  });

  /* ── 6 · the sixth one, for the very curious:
        ask her about the thing she will not talk about ── */
  const asking = ["who raised you", "the moon", "the guardian", "who made you", "your first memory", "the fall"];
  let asked = 0;
  window.addEventListener("keydown", (e) => {
    if ((e.target.id || "") !== "pipo-input") return;
    const q = (e.key === "Enter" ? (e.target.value || "") : "").toLowerCase();
    if (!q) return;
    if (asking.some((k) => q.includes(k))) {
      asked++;
      if (asked === 1) {
        pipo?.say("oh. you want the real one.");
      } else if (asked === 2) {
        pipo?.say("she had a name but she never used it. dragons don't, mostly. we'd have forgotten each other.");
      } else {
        pipo?.say("i was made out of the love that was already in the room. nothing was taken. something was noticed. that's all. that's the whole thing.");
        found.add("moon");
        toast("you asked her three times. she told you. she does not tell people. ✦");
      }
    }
  });

  return { celebrate, found };
}