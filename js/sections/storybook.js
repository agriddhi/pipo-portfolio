/* ══════════════════════════════════════════════════════════════
   PIPO — sections/storybook.js   (Tier 2)
   A four-page flipbook. Buttons, arrow keys, and drag/swipe.
   ══════════════════════════════════════════════════════════════ */

import { audio } from "../audio.js";

export function initStorybook() {
  const book = document.getElementById("book");
  const stage = document.getElementById("book-stage");
  const prev = document.getElementById("book-prev");
  const next = document.getElementById("book-next");
  const count = document.getElementById("book-count");
  if (!book || !stage) return;

  const pages = [...stage.querySelectorAll(".page")];
  let i = 0;

  function show(n) {
    i = Math.max(0, Math.min(pages.length - 1, n));
    pages.forEach((p, k) => {
      p.classList.toggle("is-open", k === i);
      p.classList.toggle("is-turning", k === i && n > 0 && i > 0);
      p.setAttribute("aria-hidden", String(k !== i));
    });
    if (count) count.textContent = `page ${i + 1} of ${pages.length}`;
    prev.disabled = i === 0;
    next.disabled = i === pages.length - 1;
    prev.style.opacity = i === 0 ? ".45" : "1";
    next.style.opacity = i === pages.length - 1 ? ".45" : "1";
  }

  const turn = (dir) => {
    const n = i + dir;
    if (n < 0 || n >= pages.length) return;
    show(n);
    audio._voice(523.25 * Math.pow(2, (dir > 0 ? [0, 4, 7, 9] : [9, 7, 4, 0])[Math.floor(Math.random() * 4)] / 12), {
      dur: 0.5, gain: 0.13,
    });
  };

  prev?.addEventListener("click", () => turn(-1));
  next?.addEventListener("click", () => turn(1));

  /* ── keyboard, only while the book is on screen ───────────── */
  const onKey = (e) => {
    if (!isVisible()) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (e.key === "ArrowRight") { e.preventDefault(); turn(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); turn(-1); }
  };
  document.addEventListener("keydown", onKey);

  let visible = false;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (es) => es.forEach((e) => { visible = e.isIntersecting; }),
      { threshold: 0.15 }
    ).observe(book);
  } else visible = true;
  function isVisible() { return visible; }

  /* ── drag / swipe ─────────────────────────────────────────── */
  let dragging = false, startX = 0, moved = 0;

  const down = (e) => {
    if (!isVisible()) return;
    dragging = true; startX = e.clientX; moved = 0;
    book.classList.add("is-grabbing");
  };
  const move = (e) => {
    if (!dragging) return;
    moved = e.clientX - startX;
    const page = pages[i];
    if (page) page.style.transform = `rotateY(${moved / 14}deg)`;
  };
  const up = () => {
    if (!dragging) return;
    dragging = false;
    book.classList.remove("is-grabbing");
    const page = pages[i];
    if (page) page.style.transform = "";
    if (Math.abs(moved) > 55) turn(moved < 0 ? 1 : -1);
  };

  stage.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);

  /* stop the page scroll from stealing the drag on touch */
  stage.addEventListener("touchmove", (e) => { if (dragging) e.preventDefault(); }, { passive: false });

  show(0);
  return { show, turn, get page() { return i; } };
}