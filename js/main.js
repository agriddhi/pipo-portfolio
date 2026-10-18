/* ══════════════════════════════════════════════════════════════
   PIPO — main.js
   Boot everything, wire the controls, keep the console clean.
   ══════════════════════════════════════════════════════════════ */

import { audio, score } from "./audio.js";
import { initScene } from "./scene.js";
import { initHeroZoom, initGate } from "./hero.js";
import { initWorld } from "./world.js";
import { initTimeMachine } from "./timemachine.js";
import { initWeather } from "./weather.js";
import { initTreehouse } from "./treehouse.js";
import { memory, initPipo, initIntro } from "./voice.js";
import { initSparkleTrail, initNightlight, initOdometer } from "./cursor.js";
import { initPetals, initSkyControl } from "./sky.js";
import { initStarfield } from "./sections/starfield.js";
import { initBloomYard } from "./sections/bloomyard.js";
import { initMoodRadio } from "./sections/radio.js";
import { initFortune } from "./sections/fortune.js";
import { initStorybook } from "./sections/storybook.js";
import { initGame } from "./sections/game.js";
import { initLeaderboard } from "./sections/leaderboard.js";
import { initGuestbook } from "./sections/guestbook.js";
import { initConfetti, initToast, initEasterEggs } from "./easter.js";
import { guardArt } from "./art.js";
import { ENABLE_3D } from "./config.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

window.__pipoAudio = audio;

/* ══════════════════════════ SMOOTH SCROLL ══════════════════════════ */
function initSmoothScroll() {
  if (reduce || !window.Lenis) return null;
  const lenis = new window.Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  if (window.gsap && window.ScrollTrigger) {
    lenis.on("scroll", window.ScrollTrigger.update);
    window.gsap.ticker.add((t) => lenis.raf(t * 1000));
    window.gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (!id || id === "#") return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el, { offset: -10, duration: 1.2 });
  });

  return lenis;
}

/* ══════════════════════════ MOTION TOGGLE ══════════════════════════ */
function initMotionToggle() {
  const btn = document.getElementById("btn-motion");
  const KEY = "pipo.motion";
  let on = true;
  try { on = localStorage.getItem(KEY) !== "off"; } catch {}
  if (reduce) on = false;

  const paint = () => {
    btn?.setAttribute("aria-pressed", String(on));
    document.documentElement.setAttribute("data-motion", on ? "on" : "off");
  };
  paint();

  btn?.addEventListener("click", () => {
    on = !on;
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
    paint();
    audio.click();
  });
}

/* ══════════════════════════ REVEALS ══════════════════════════ */
function initReveals() {
  const items = [...document.querySelectorAll(".reveal")];
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) { items.forEach((i) => i.classList.add("is-in")); return; }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.style.transitionDelay = `${Math.min(items.indexOf(en.target) * 0.06, 0.4).toFixed(2)}s`;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
  );
  items.forEach((i) => io.observe(i));
}

/* ══════════════════════════ CLICK SOUNDS ══════════════════════════ */
function initClickSounds() {
  const SEL = "button, a, .star, .key, .chip, .swatch, .mood, summary, [role='button']";
  document.addEventListener("pointerdown", (e) => { if (e.target.closest?.(SEL)) audio.click(); }, { passive: true });
  document.addEventListener("pointerover", (e) => { if (e.target.closest?.(SEL)) audio.hover(); }, { passive: true });
}

/* ══════════════════════════ SOUND TOGGLE ══════════════════════════ */
function initSoundToggle() {
  const btn = document.getElementById("btn-sound");
  const label = document.getElementById("sound-state");
  audio.loadPref();

  const paint = () => {
    btn?.setAttribute("aria-pressed", String(!audio.muted));
    if (label) label.textContent = audio.muted ? "off" : "on";
    const ic = btn?.querySelector(".hbtn__icon");
    if (ic) ic.textContent = audio.muted ? "✕" : "♪";
  };
  paint();

  btn?.addEventListener("click", () => {
    audio.resume();
    audio.setMuted(!audio.muted);
    paint();
    if (!audio.muted) audio.sparkle();
  });

  return paint;
}

/* ══════════════════════════ THE TRAP DOOR ══════════════════════════
   A loading gate and a name dialog are the two most dangerous things
   on a page: if either throws, or if the listener that dismisses them
   never attaches, the visitor is staring at your website and cannot
   use it. So whatever happens, we force it open.

   The timer deliberately does NOT close the gate — closing it early
   would rob the visitor of the "enter with sound / enter quietly"
   choice, which is the entire point of having a gate. It only lifts
   the scroll lock, so the page is never frozen. Only an actual error
   tears the gate down.
*/
function installTrapDoor() {
  const unlockscroll = () => {
    document.body.classList.remove("is-locked");
    // smooth scroll must never be left stopped, or the page looks frozen
    try { window.__pipoScroll?.start?.(); } catch {}
  };

  const openAll = () => {
    unlockscroll();
    const g = document.getElementById("gate");
    if (g) { g.classList.add("is-gone"); setTimeout(() => g.remove(), 900); }
    const i = document.getElementById("intro");
    if (i && !i.hidden) i.classList.add("is-gone");
  };

  setTimeout(unlockscroll, 2500);
  window.addEventListener("error", openAll);
  window.addEventListener("unhandledrejection", openAll);
}

/* ══════════════════════════ GHOST BUSTER ══════════════════════════
   Clicks were dying and nobody could work out why.

   The cause: the treehouse is a full-screen `inset:0` overlay. When
   closed it was only faded to `opacity:0` — and opacity does NOT stop
   an element receiving clicks. An invisible sheet of glass was sitting
   over the entire website eating every tap: the header, the hero
   buttons, the chat, the guestbook. All of it. Silently.

   This walks the page for anything that is invisible, covers the
   screen, and is still clickable, and switches its pointer events off.
   The CSS is fixed properly; this is the seatbelt.
*/
function installGhostBuster() {
  const scan = () => {
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "absolute") continue;
      if (cs.pointerEvents === "none") continue;
      if (cs.visibility === "hidden" || cs.display === "none") continue;

      const r = el.getBoundingClientRect();
      if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) continue;

      // covers the screen but you cannot see it -> it is a ghost
      if (parseFloat(cs.opacity) > 0.05) continue;

      el.style.pointerEvents = "none";
      el.dataset.ghostFixed = "1";
    }
  };

  // once now, then keep checking as things open and close
  [0, 400, 1200, 2500, 5000].forEach((ms) => setTimeout(scan, ms));
  setInterval(scan, 2000);
  window.addEventListener("resize", scan);
}

/* ══════════════════════════ SAFE INIT ══════════════════════════
   One broken feature must never take down the whole website.

   A single null `.querySelector` in one module was killing boot before
   the chat, the stars, the storybook and the game had even started —
   the visitor got a dead page and no clue why.

   Every initialiser now runs inside its own try/catch. If the weather
   breaks, the rest of Pipo still turns up.
*/
function safe(name, fn) {
  try {
    return fn();
  } catch (err) {
    console.warn(`[pipo] "${name}" failed to start:`, err);
    return null;
  }
}

/* ══════════════════════════ BOOT ══════════════════════════ */
function boot() {
  installTrapDoor();
  installGhostBuster();

  window.__pipoScroll = safe("smooth scroll", initSmoothScroll);

  if (window.gsap && window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);

  safe("placeholder art", () => guardArt(document));
  safe("motion toggle", initMotionToggle);
  safe("reveals", initReveals);

  const confetti = safe("confetti", initConfetti) || (() => {});
  const toast = safe("toast", initToast) || (() => {});
  const paintSound = safe("sound toggle", initSoundToggle) || (() => {});

  /* ── she remembers you ── */
  const mem = safe("memory", memory) || { name: "", visits: 0, bump() {}, setName() {} };

  /* ── the world: morning → noon → dusk → night ── */
  const world = safe("world", initWorld);
  safe("sky control", () => initSkyControl(world));

  /* the score thickens as the sky goes to night */
  safe("score follows the sky", () => {
    if (!world?.onChange) return;
    const apply = () => score.setDepth((world.progress ?? 0) * 100);
    world.onChange?.(apply);
    apply();
    window.addEventListener("scroll", () => { score.setDepth((world.progress ?? 0) * 100); }, { passive: true });
  });

  /* ── weather ── */
  const word = document.getElementById("weather-word");
  const weather = safe("weather", () =>
    initWeather({
      onSay: (w) => {
        if (!word) return;
        word.textContent = w.say;
        word.classList.add("is-on");
        clearTimeout(weather._t);
        weather._t = setTimeout(() => word.classList.remove("is-on"), 6000);
      },
    })
  );

  /* ── the time machine ── */
  const timeMachine = safe("time machine", () => initTimeMachine({ world }));
  safe("time machine wiring", () => {
    const timeBtn = document.getElementById("btn-time");
    timeBtn?.addEventListener("click", () => {
      timeMachine?.toggle();
      timeBtn.setAttribute("aria-expanded", String(document.getElementById("timemachine")?.classList.contains("is-open")));
      audio.click();
    });
    document.getElementById("time-reset")?.addEventListener("click", () => {
      world?.release();
      timeBtn?.setAttribute("aria-expanded", "false");
      document.getElementById("timemachine")?.classList.remove("is-open");
      audio.hover();
    });
    document.addEventListener("pointerdown", (e) => {
      if (!e.target.closest("#timemachine, #btn-time")) {
        document.getElementById("timemachine")?.classList.remove("is-open");
        timeBtn?.setAttribute("aria-expanded", "false");
      }
    });
    if (window.gsap) window.gsap.ticker.add(() => window.__pipoTick?.());
  });

  /* ── the one shared sneeze: petals everywhere ── */
  let sneezeLock = 0;
  function sneeze(power = 1) {
    const now = performance.now();
    if (now - sneezeLock < 700) return;
    sneezeLock = now;
    audio.sneeze();
    confetti(null, Math.round(60 * power));
  }

  const scene = safe("3D", () => (ENABLE_3D ? initScene() : null));

  /* ── the landing ── */
  safe("hero zoom", initHeroZoom);

  /* ── she talks ── */
  const pipo = safe("pipo chat", () => initPipo({ mem }));

  /* ── her work ── */
  safe("bloom yard", () => initBloomYard({ sneeze, onPlant: () => mem.bump("planted") }));
  safe("mood radio", initMoodRadio);
  safe("fortune machine", () => initFortune({ confetti, sneeze, onCrack: () => mem.bump("fortunes") }));
  const odo = safe("odometer", initOdometer) || { bump() {} };
  const stars = safe("star terminal", () => initStarfield({ scene })) || { add: async () => false, clear() {}, shared: false };

  /* pin your own star — shared with everybody if a backend is wired */
  safe("star form", () => {
  const starForm = document.getElementById("star-form");
  const starName = document.getElementById("star-name");
  const starText = document.getElementById("star-text");
  const starMsg = document.getElementById("star-msg");
  starForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (starText.value || "").trim();
    const who = (starName.value || "").trim() || "a nameless dreamer";
    if (text.length < 3) {
      starMsg.textContent = "a star needs a few more words to glow…";
      starMsg.classList.add("err");
      starText.focus();
      return;
    }
    const shared = await stars.add(text, who);
    starText.value = ""; starName.value = "";
    starMsg.classList.remove("err");
    starMsg.textContent = shared
      ? "✦ pinned. everyone can see it now."
      : "✦ pinned. it is in your sky.";
    odo.bump(1);
    mem.bump("pinned");
    confetti(null, 40);
  });
  document.getElementById("star-clear")?.addEventListener("click", () => {
    stars.clear();
    if (starMsg) { starMsg.classList.remove("err"); starMsg.textContent = "your sky is clear again."; }
  });
  });

  /* ── the extras ── */
  const board = safe("leaderboard", initLeaderboard) || null;
  safe("storybook", initStorybook);
  safe("mini game", () => initGame({
    onEnd: (score) => {
      mem.bump("games");
      // put it on the wall automatically, under whatever she's called you
      if (score > 0) {
        board?.submit({ name: mem.name || "a nameless dragon", score });
        const bm = document.getElementById("board-msg");
        if (bm && !bm.textContent) {
          bm.textContent = board?.shared
            ? "✦ your score is on the wall."
            : "✦ your score is saved on this device.";
        }
      }
    },
  }));
  safe("guestbook", () => initGuestbook({
    name: mem.name,
    onPin: (entry) => {
      odo.bump(1);
      confetti(null, 50);
      if (!mem.name && entry.name) mem.setName(entry.name);
    },
  }));

  /* ── the world dressing ── */
  safe("sparkle trail", initSparkleTrail);
  safe("petals", initPetals);
  safe("nightlight", initNightlight);

  /* chaos has its own page now (chaos.html) — nothing overlays the
     real site any more */
  const chaos = { set() {} };

  safe("easter eggs", () => initEasterEggs({ scene, toast, confetti, sneeze, pipo }));

  /* ── the treehouse: the easter egg ── */
  safe("treehouse", () => initTreehouse({ sneeze, audio, toast }));

  /* ── the gate ── */
  safe("gate", () => initGate({
    onEnter: (withSound) => {
      scene?.showChibi();
      audio.resume();
      audio.setMuted(!withSound);
      paintSound();
      if (withSound) {
        setTimeout(() => audio.sparkle(), 700);
        // the background score. light, playful, on its own quiet bus.
        // the Mood Radio eases this out of the way if you tune in.
        score.start();
      }
      window.ScrollTrigger?.refresh();

      /* She greets you by WHISPERING, not by popping the box open.
         Nothing should ever take the chat away from you on arrival. */
      pipo?.whisperLine(
        mem.visits <= 1
          ? "hi. i'm pipo. tap the round button, or press P, any time you want to talk."
          : "you came back. good. tap the round button, or press P."
      );

      /* first visit only: ask what to call you */
      safe("intro", () => initIntro({
        mem,
        onNamed: (n) => {
          if (n) setTimeout(() => pipo?.whisperLine(`hi ${n}. i'm going to remember that. it's written on me now.`), 500);
          else setTimeout(() => pipo?.whisperLine("no name. fine. i'll just call you friend."), 500);
        },
      }));
    },
  }));

  /* ── housekeeping ── */
  const refresh = () => window.ScrollTrigger?.refresh();
  window.addEventListener("load", refresh);
  setTimeout(refresh, 900);
  setTimeout(refresh, 2800);   // after webfonts have settled
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();