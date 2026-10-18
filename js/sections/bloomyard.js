/* ══════════════════════════════════════════════════════════════
   PIPO — sections/bloomyard.js   (Project P/01)
   A flower shop with no door. Draw a flower, plant it in the yard,
   and it stays there — yours, next to everybody else's.

   ── WHY THIS FILE IS BUILT THE WAY IT IS ────────────────────

   The obvious way to store a drawing is a PNG data URL, which is
   what this used to do. A single flower came out at 40–80 KB, and
   a message broker will happily accept about 4 KB. So the garden
   could never be shared — it was localStorage only, and every
   visitor's yard contained only their own flowers.

   Instead, each flower is stored as the STROKES that made it:
   a list of polylines with a colour and a width, in normalised
   0–1 coordinates. That is roughly a kilobyte, it fits, and it is
   resolution independent, so the grid can render it at any size
   and it looks better than a blurry bitmap ever did.

   Everything still works offline. If the post fails, the flower is
   already in localStorage and the form says so.
   ══════════════════════════════════════════════════════════════ */

import { audio } from "../audio.js";
import { gardenFeed } from "../shared.js";

const MAX = 60;
/* hard caps so one enormous scribble can never blow the message limit */
const MAX_STROKES = 14;
const MAX_POINTS = 260;

const COLORS = ["#f4a6c0", "#e8799f", "#ffd0e0", "#cbb2ec", "#9b7ad1", "#fff1e4", "#f7dcab", "#7f93e8"];

const r2 = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function initBloomYard({ onPlant, sneeze, name: who = "" } = {}) {
  const cv = document.getElementById("bloom-canvas");
  const swatches = document.getElementById("bloom-swatches");
  const empty = document.getElementById("bloom-empty");
  const plantBtn = document.getElementById("bloom-plant");
  const clearBtn = document.getElementById("bloom-clear");
  const grid = document.getElementById("garden-grid");
  const count = document.getElementById("garden-count");
  const note = document.getElementById("garden-note");
  if (!cv || !swatches) return null;

  const ctx = cv.getContext("2d");
  const feed = gardenFeed();

  let color = COLORS[0];
  let size = 6;
  let drawing = false;
  let last = null;
  let dirty = false;
  let strokes = [];        // the actual artwork, in normalised coords
  let current = null;

  /* ── tools ────────────────────────────────────────────────── */
  COLORS.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch" + (i === 0 ? " is-on" : "");
    b.style.background = c;
    b.setAttribute("aria-label", "Petal colour " + (i + 1));
    b.addEventListener("click", () => {
      color = c;
      swatches.querySelectorAll(".swatch").forEach((s) => s.classList.remove("is-on"));
      b.classList.add("is-on");
      audio.hover();
    });
    swatches.appendChild(b);
  });

  document.querySelectorAll(".bloom__sizes .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      size = +chip.dataset.size;
      chip.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-on"));
      chip.classList.add("is-on");
      audio.hover();
    });
  });

  /* ── drawing ──────────────────────────────────────────────── */
  function pos(e) {
    const r = cv.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    };
  }

  function dot(p) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x * cv.width, p.y * cv.height, size, 0, Math.PI * 2);
    ctx.fill();
    dirty = true;
    if (empty) empty.style.display = "none";
  }

  cv.addEventListener("pointerdown", (e) => {
    drawing = true;
    last = pos(e);
    current = { c: color, w: size / cv.width, pts: [[r2(last.x), r2(last.y)]] };
    strokes.push(current);
    cv.setPointerCapture(e.pointerId);
    dot(last);
  });

  cv.addEventListener("pointermove", (e) => {
    if (!drawing || !current) return;
    const p = pos(e);
    // interpolate so fast strokes stay smooth rather than dotted
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    const steps = Math.max(1, Math.ceil(dist / (size * 0.4 / cv.width)));
    for (let i = 1; i <= steps; i++) {
      const q = { x: last.x + ((p.x - last.x) * i) / steps, y: last.y + ((p.y - last.y) * i) / steps };
      dot(q);
    }
    const tip = current.pts[current.pts.length - 1];
    if (Math.hypot(p.x - tip[0], p.y - tip[1]) > 0.006) current.pts.push([r2(p.x), r2(p.y)]);
    last = p;
  });

  const stop = () => { drawing = false; last = null; current = null; };
  cv.addEventListener("pointerup", stop);
  cv.addEventListener("pointercancel", stop);
  cv.addEventListener("pointerleave", stop);

  /* ── SHE HELPS ──────────────────────────────────────────────
     Every time you plant, she sneezes — and before she does she
     signs it: a petal stroke and paw prints, added to the artwork
     itself so it travels with the flower. Your drawing is very
     slightly co-authored. */
  function pipoSigns() {
    const w = cv.width, h = cv.height;
    const spots = [
      { x: w * (0.3 + Math.random() * 0.4), y: h * (0.34 + Math.random() * 0.3) },
      { x: w * (0.16 + Math.random() * 0.14), y: h * (0.72 + Math.random() * 0.14) },
      { x: w * (0.7 + Math.random() * 0.14), y: h * (0.72 + Math.random() * 0.14) },
    ];

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#c98fb0";
    ctx.fillStyle = "#c98fb0";
    ctx.lineCap = "round";

    spots.forEach((s, i) => {
      const r = 10 + Math.random() * 9;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate((Math.random() - 0.5) * 1.4);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, r);
      ctx.quadraticCurveTo(r * 0.8, -r * 0.6, 0, -r);
      ctx.quadraticCurveTo(-r * 0.8, -r * 0.6, 0, r);
      ctx.stroke();
      ctx.restore();

      // record her mark so it travels with the flower
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        pts.push([r2(s.x / w + Math.cos(a) * (r / w)), r2(s.y / h + Math.sin(a) * (r / h))]);
      }
      strokes.push({ c: "#c98fb0", w: r2(2.4 / w), pts });

      // two paw prints, because she has four toes and no shame
      if (i > 0) {
        const s2 = r * 0.52;
        ctx.beginPath();
        ctx.ellipse(s.x + s2 * 1.1, s.y + s2 * 1.2, s2, s2 * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let t = -1; t <= 1; t++) {
          ctx.beginPath();
          ctx.ellipse(s.x + s2 * 1.1 + t * s2 * 0.55, s.y + s2 * 0.35, s2 * 0.24, s2 * 0.3, t * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    ctx.restore();
  }

  /* ── trim to a size the wire will accept ──────────────────── */
  function pack(list) {
    const out = list.slice(-MAX_STROKES);
    let budget = MAX_POINTS;
    const kept = [];
    // newest strokes matter most, so fill from the end backwards
    for (let i = out.length - 1; i >= 0; i--) {
      const s = out[i];
      let pts = s.pts;
      if (pts.length > budget) pts = pts.slice(-budget);   // keep the newest end
      if (!pts.length) continue;
      kept.unshift({ c: s.c, w: s.w, pts });
      budget -= pts.length;
      if (budget <= 0) break;
    }
    return kept;
  }

  const bytes = (o) => new Blob([JSON.stringify(o)]).size;

  /* ── the yard ────────────────────────────────────────────── */
  function svgFor(flower) {
    const parts = (flower.strokes || []).map((s) => {
      if (!s.pts || s.pts.length < 2) {
        const p = s.pts?.[0] || [0.5, 0.5];
        return `<circle cx="${p[0] * 100}" cy="${p[1] * 100}" r="${(s.w || 0.01) * 100}" fill="${esc(s.c)}"/>`;
      }
      const d = s.pts.map((p, i) => `${i ? "L" : "M"}${r2(p[0] * 100)} ${r2(p[1] * 100)}`).join(" ");
      return `<path d="${d}" fill="none" stroke="${esc(s.c)}" stroke-width="${r2((s.w || 0.01) * 100)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join("");
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" class="garden__svg">${parts}</svg>`;
  }

  function renderGarden() {
    const items = feed.items.slice(0, MAX);
    grid.innerHTML = items
      .map(
        (f) => `<figure class="garden__cell">
            ${svgFor(f)}
            <b>${esc(f.from || "a visitor")}${f.mine ? " <i>you</i>" : ""}</b>
          </figure>`
      )
      .join("");

    if (count) {
      count.textContent = items.length + (items.length === 1 ? " flower" : " flowers");
    }
    if (note) {
      note.textContent = feed.shared
        ? "shared · everyone's flowers grow here"
        : "saved on this device · no connection right now";
      note.classList.toggle("is-local", !feed.shared);
    }
  }

  feed.onChange(renderGarden);
  renderGarden();
  feed.load();

  /* ── planting ────────────────────────────────────────────── */
  plantBtn?.addEventListener("click", async () => {
    if (!dirty) {
      if (empty) { empty.style.display = ""; empty.textContent = "draw something first — even one dot counts."; }
      return;
    }

    pipoSigns();

    const flower = {
      strokes: pack(strokes),
      c: color,
      from: (who || "a visitor").slice(0, 18),
    };

    // if it will not fit on the wire, keep it local rather than
    // pretending it was shared
    const oversize = bytes(flower) > 3600;
    await feed.add({ text: "", from: flower.from, strokes: flower.strokes, c: flower.c, local: oversize });

    if (oversize && note) {
      note.textContent = "that one was too big to send, so it's growing on this device only";
    }

    renderGarden();
    onPlant?.(flower);
    sneeze?.();          // she cannot help it
    audio.sparkle();

    ctx.clearRect(0, 0, cv.width, cv.height);
    strokes = [];
    dirty = false;
    if (empty && !oversize) {
      empty.style.display = "";
      empty.textContent = "that's in the yard forever. draw another?";
    }
  });

  clearBtn?.addEventListener("click", () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    strokes = [];
    dirty = false;
    if (empty) { empty.style.display = ""; empty.textContent = "clean slate. draw something lovely."; }
    audio.click();
  });

  return {
    renderGarden, sneezed: sneeze,
    get shared() { return feed.shared; },
    get count() { return feed.items.length; },
  };
}
