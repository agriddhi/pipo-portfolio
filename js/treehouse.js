/* ══════════════════════════════════════════════════════════════
   PIPO — treehouse.js
   THE EASTER EGG.

   Somewhere in the fixed world, at the base of the big sakura tree,
   there is a lit window. It is very small. It is very easy to miss.

   Click it (or the tree, or find her sleeping on a branch) and the
   whole page slides into her room: a lantern, a jar of buttons, a
   leaf she is keeping for no reason, the satchel, and one small
   sleeping dragon you can wake up.
   ══════════════════════════════════════════════════════════════ */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const KEY = "pipo.treehouse";

export function initTreehouse({ sneeze, audio, toast } = {}) {
  const world = document.getElementById("world");
  const house = document.getElementById("treehouse");
  const trigger = document.getElementById("treehouse-trigger");
  const again = document.getElementById("house-again");
  const wake = document.getElementById("house-wake");
  const note = document.getElementById("house-note");

  if (!world || !house || !trigger) return null;

  /* ── the trigger: a lit window at the foot of the tree ── */
  trigger.innerHTML = `
    <span class="house-window" aria-hidden="true"></span>
    <span class="house-door" aria-hidden="true"></span>
    <span class="house-label" aria-hidden="true">pipo's</span>
  `;
  trigger.setAttribute("aria-label", "A small lit window at the base of the tree");
  trigger.hidden = false;

  let found = false;
  try { found = localStorage.getItem(KEY) === "1"; } catch {}
  trigger.classList.toggle("is-found", found);

  /* ── the room ── */
  const NOTES = [
    "i kept this leaf. i don't know why. it matches nothing.",
    "the jar is for buttons. there are nine. they are all from different coats.",
    "the satchel. everything i have ever delivered went through here.",
    "i sleep here. i don't remember much of it.",
    "the lantern is for when the sky goes dark before i do.",
  ];

  function open() {
    house.hidden = false;
    requestAnimationFrame(() => house.classList.add("is-on"));
    trigger.classList.add("is-found");
    try { localStorage.setItem(KEY, "1"); } catch {}
    if (!found) {
      found = true;
      toast("you found her window. nobody finds her window.", 6000);
      audio?.sparkle();
      // first time in: she is asleep, and you get to wake her
      setTimeout(() => note && (note.textContent = "she is asleep. wake her?"), 900);
      setTimeout(() => wake?.classList.add("is-waiting"), 1400);
    } else if (note) {
      note.textContent = NOTES[Math.floor(Math.random() * NOTES.length)];
    }
    house.querySelector(".house__close")?.focus();
  }

  function close() {
    house.classList.remove("is-on");
    setTimeout(() => { house.hidden = true; }, reduce ? 0 : 500);
    trigger.focus?.({ preventScroll: true });
  }

  trigger.addEventListener("click", open);
  again?.addEventListener("click", close);
  house.querySelector(".house__close")?.addEventListener("click", close);

  /* ── wake her ── */
  let woken = false;
  wake?.addEventListener("click", () => {
    if (woken) return;
    woken = true;
    audio?.sneeze();
    setTimeout(() => {
      house.classList.add("is-awake");
      wake.textContent = "she's up.";
      if (note) note.textContent = "…oh. hi. i was mid-dream. one of yours, probably.";
      sneeze?.(1);
      audio?.sparkle();
    }, 420);
  });

  /* ── the escape hatch ── */
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !house.hidden) close();
  });

  /* ── a second, sneakier way in: the whole tree is clickable ── */
  document.getElementById("world")?.addEventListener("click", (e) => {
    if (e.target.closest("#treehouse-trigger")) return;
    if (e.target.closest(".world__tree")) open();
  });

  /* ── one of the objects is worth clicking ── */
  house.querySelectorAll("[data-say]").forEach((el) => {
    el.addEventListener("click", () => {
      audio?.hover();
      note.textContent = el.dataset.say;
    });
  });

  /* ── a slow warm glow so the window is findable eventually ── */
  trigger.classList.add("is-warm");

  return { open, close, get found() { return found; } };
}