/* ══════════════════════════════════════════════════════════════
   PIPO — timemachine.js
   A slider that drags the entire day sideways.

   The world already interpolates morning → noon → dusk → night off
   the scroll position. This hands you the same lever directly: drag
   it and the sky, the sun, the stars and the blossom density all
   move with your thumb, in either direction, at any point on the
   page. Release and it slowly drifts back to wherever you actually
   are — unless you pin it.

   Three modes:
     · follow   the scroll decides (default)
     · locked   you set the hour and it stays
     · scrub    you drag; it eases back when you let go
   ══════════════════════════════════════════════════════════════ */

const HOURS = [
  { at: 0.02, name: "first light" },
  { at: 0.20, name: "morning" },
  { at: 0.42, name: "noon" },
  { at: 0.66, name: "afternoon" },
  { at: 0.80, name: "dusk" },
  { at: 0.93, name: "night" },
  { at: 1.00, name: "small hours" },
];

function hourName(p) {
  let n = HOURS[0].name;
  for (const h of HOURS) if (p >= h.at) n = h.name;
  return n;
}

export function initTimeMachine({ world }) {
  const panel = document.getElementById("timemachine");
  if (!panel || !world) return null;

  const range = document.getElementById("time-range");
  const readout = document.getElementById("time-read");
  const modeBtn = document.getElementById("time-mode");
  const live = document.getElementById("time-live");

  let mode = "follow";      // follow | locked | scrub
  let scrubbing = false;
  let ease = null;

  const paint = (p) => {
    if (range) range.value = String(Math.round(p * 1000));
    if (readout) readout.textContent = hourName(p);
    if (live) live.textContent = Math.round(p * 100).toString().padStart(3, "0");
  };

  /* ── slider ── */
  range?.addEventListener("pointerdown", () => {
    scrubbing = true;
    ease = null;
    world.pin(+range.value / 1000);
    paint(+range.value / 1000);
  });

  range?.addEventListener("input", () => {
    mode = "scrub";
    world.pin(+range.value / 1000);
    paint(+range.value / 1000);
    label();
  });

  const release = () => {
    if (!scrubbing) return;
    scrubbing = false;
    // ease back to wherever the scroll says we are
    ease = { from: world.progress, to: world.scrollProgress, t: 0 };
  };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  /* ── mode button: follow → locked → follow ── */
  function label() {
    const names = { follow: "auto", locked: "locked", scrub: "scrub" };
    if (modeBtn) {
      modeBtn.textContent = names[mode];
      modeBtn.setAttribute("aria-pressed", String(mode !== "follow"));
    }
    panel?.setAttribute("data-mode", mode);
  }

  modeBtn?.addEventListener("click", () => {
    ease = null;
    if (mode === "follow") {
      mode = "locked";
      world.pin(world.progress);
    } else {
      mode = "follow";
      world.release();
    }
    window.__pipoAudio?.hover();
    label();
  });

  /* ── keep the slider honest when the page scrolls ── */
  world.onChange?.((p) => {
    if (mode === "follow") { paint(p); return; }
    if (mode === "locked" && !scrubbing) paint(p);
  });

  /* ── the ease-back ── */
  window.__pipoTick = () => {
    if (!ease) return;
    ease.t = Math.min(1, ease.t + 0.05);
    const k = 1 - Math.pow(1 - ease.t, 3);
    const p = ease.from + (ease.to - ease.from) * k;
    world.pin(p);
    paint(p);
    if (ease.t >= 1) { ease = null; world.release(); mode = "follow"; label(); }
  };

  panel.hidden = false;
  label();
  paint(0);

  return {
    open(v) {
      panel.classList.toggle("is-open", v ?? !panel.classList.contains("is-open"));
    },
    toggle() { this.open(); },
    get mode() { return mode; },
  };
}