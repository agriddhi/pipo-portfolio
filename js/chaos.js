/* ══════════════════════════════════════════════════════════════
   PIPO — chaos.js
   Side Quest: Responsive Chaos Mode (+5 — the biggest bonus)

   Glorious early-web chaos that reshapes itself to any viewport:
   two marquees, a beveled Win95 window, blink text, a tiled
   floor, a live readout of how broken your screen is, fake
   system windows that pop open, a fake "now playing" bar, a
   visitor counter, an animated mascot, and aKonami easter egg
   that turns all of it on.
   ══════════════════════════════════════════════════════════════ */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const KEY = "pipo.chaos";

const LINES = [
  "★ WELCOME TO PIPO.EXE ★",
  "under construction since the last full moon",
  "best viewed in 800×600",
  "she can probably see you",
  "made with 0 frameworks and 1 (1) dragon",
  "do not feed the dragon after midnight",
  "loading dreams… ██████████░░ 78%",
  "turn on the music, it helps",
  "now accepting submissions from the 4th floor",
  "this site is 100% hand written. like a criminal.",
  "no cookies. no trackers. one (1) dragon.",
  "scrolling is a feature, not a bug",
];

export function initChaos({ onToggle, force = false } = {}) {
  const btn = document.getElementById("btn-chaos");
  const dims = document.getElementById("chaos-dims");
  const tracks = [document.getElementById("marquee-a"), document.getElementById("marquee-b")];
  const extra = document.getElementById("chaos-extra");

  let on = force ? true : false;
  if (!force) { try { on = localStorage.getItem(KEY) === "on"; } catch {} }
  const chaosBits = { _t: null };

  function fill(el, text) {
    if (!el) return;
    // duplicated so the -50% translate loop is seamless
    el.innerHTML = `<span>${text}</span><span>${text}</span>`;
  }

  function paint() {
    const txt = `${LINES.join("  ❀  ")}  ❀  `;
    tracks.forEach((t) => fill(t, txt));
  }
  paint();

  /* ── the extra nonsense ───────────────────────────────────── */
  if (extra) {
    const hits = 1204 + Math.floor(Math.random() * 60);
    extra.innerHTML = `
      <!-- a fake desktop: icons and a taskbar. these are NOT popups,
           they sit in the page like furniture, so nothing lands on
           top of the thing you were trying to read -->
      <div class="chaos-desktop" aria-hidden="true">
        <div class="chaos-icons">
          <span class="chaos-icon"><b>🗑</b>my computer</span>
          <span class="chaos-icon"><b>📁</b>dragon_stuff</span>
          <span class="chaos-icon"><b>🌸</b>DO NOT OPEN</span>
          <span class="chaos-icon"><b>🎵</b>mix 04</span>
          <span class="chaos-icon"><b>⚙️</b>settings</span>
        </div>
      </div>

      <div class="chaos-taskbar">
        <span class="chaos-taskbar__start"><b>✿</b> start</span>
        <span class="chaos-taskbar__apps">
          <i class="chaos-app is-active">petal.exe</i>
          <i class="chaos-app">sky95.wmf</i>
          <i class="chaos-app">untitled3.txt</i>
          <i class="chaos-app">&#128274;</i>
        </span>
        <span class="chaos-taskbar__tray">&#128251; <b id="chaos-clock">0:00</b> &#9835;</span>
      </div>

      <div class="chaos-nowplaying">
        <span class="chaos-nowplaying__eq"><i></i><i></i><i></i><i></i></span>
        <span class="chaos-nowplaying__txt">♪ now playing: petal_dust_03.mp3 (generated live, never once recorded)</span>
      </div>

      <div class="chaos-badge">
        <b>you are visitor</b>
        <span>${hits.toLocaleString("en-US")}</span>
        <small>of approximately nine roofs</small>
      </div>

      <div class="chaos-rotator">
        <span>★</span><span>P</span><span>I</span><span>P</span><span>O</span><span>★</span>
      </div>

      <div class="chaos-gifs" aria-hidden="true">
        <span class="chaos-gif chaos-gif--1">✿</span>
        <span class="chaos-gif chaos-gif--2">🐉</span>
        <span class="chaos-gif chaos-gif--3">🌸</span>
        <span class="chaos-gif chaos-gif--4">💫</span>
      </div>

      <div class="chaos-hearts">${Array.from({ length: 14 }, () => "<i>&#9829;</i>").join("")}</div>

      <!-- the loading bar that never finishes -->
      <div class="chaos-load">
        <p class="blink">loading your entire personality</p>
        <div class="chaos-load__bar"><i id="chaos-load-fill"></i></div>
        <span id="chaos-load-pct">1%</span>
      </div>

      <div class="chaos-counter">
        <p class="blink">this site has been up for</p>
        <b id="chaos-uptime">0:00:00</b>
        <p>and still no cookies</p>
      </div>

      <p class="chaos-marquee2"><span>THIS PAGE IS BEST EXPERIENCED WITH SOUND ON &middot; CONTAINS ONE (1) DRAGON &middot; PLEASE DO NOT PET THE PIXELS &middot; THIS PAGE IS BEST EXPERIENCED WITH SOUND ON &middot; CONTAINS ONE (1) DRAGON &middot; PLEASE DO NOT PET THE PIXELS &middot;</span></p>

      <div class="chaos-webring">
        <p>&#9658; previous &middot; <a href="#top" onclick="return false">a lonely homepage</a> &middot; random &middot; <a href="#top" onclick="return false">the 4th roof</a> &#9658;</p>
      </div>

      <button class="chaos-door" id="chaos-door" type="button">
        <span aria-hidden="true">&#128274;</span>
        <b>do not open</b>
      </button>

      <div class="chaos-room" id="chaos-room" hidden>
        <div class="chaos-room__bar"><i>PIPO.SHRINE</i><button type="button" id="chaos-room-x" aria-label="close">&times;</button></div>
        <div class="chaos-room__body">
          <p class="blink">*** WELCOME TO THE SECRET ROOM ***</p>
          <p>you found the door behind the taskbar. nobody finds this door.</p>
          <hr />
          <p>&#10003; you may pet the pixels now</p>
          <p>&#10003; the dragon says thank you</p>
          <p>&#10003; sound on, volume up, it is nicer</p>
          <p>&#10007; do not close this window. it has never been closed.</p>
          <hr />
          <p class="chaos-room__ticker">presumably someone will find this eventually</p>
          <button class="chaos-room__btn" id="chaos-room-gift" type="button">press the big red button</button>
        </div>
      </div>
    `;
  }

  /* ── the taskbar clock and the loading bar that never finishes ── */
  const clockEl = document.getElementById("chaos-clock");
  const loadFill = document.getElementById("chaos-load-fill");
  const loadPct = document.getElementById("chaos-load-pct");
  let loadPctVal = 1;
  const tickBits = () => {
    if (!on) return;
    if (clockEl) {
      const d = new Date();
      clockEl.textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    if (loadFill && loadPct) {
      // creeps toward 99 and then resets, like every real progress bar
      loadPctVal = loadPctVal >= 99 ? 1 : loadPctVal + Math.random() * 4;
      loadFill.style.width = Math.min(99, loadPctVal) + "%";
      loadPct.textContent = Math.floor(Math.min(99, loadPctVal)) + "%";
    }
    chaosBits._t = setTimeout(tickBits, 1000);
  };
  chaosBits._t = setTimeout(tickBits, 1000);

  /* ── the secret room ─────────────────────────────────────── */
  const door = document.getElementById("chaos-door");
  const room = document.getElementById("chaos-room");
  let doorShy = 0;

  door?.addEventListener("click", () => {
    // it runs away the first two times. this is the whole joke.
    if (doorShy < 2) {
      doorShy++;
      const vw = innerWidth, vh = innerHeight;
      door.style.left = 10 + Math.random() * (vw - 220) + "px";
      door.style.top = 10 + Math.random() * (vh - 140) + "px";
      door.style.right = "auto";
      door.style.bottom = "auto";
      door.querySelector("b").textContent = ["do not open", "i said no", "…"][doorShy - 1];
      window.__pipoAudio?.hover();
      return;
    }
    if (room) room.hidden = false;
    window.__pipoAudio?.sparkle();
  });

  document.getElementById("chaos-room-x")?.addEventListener("click", () => {
    if (room) room.hidden = true;
  });

  let gifts = 0;
  document.getElementById("chaos-room-gift")?.addEventListener("click", (e) => {
    gifts++;
    e.currentTarget.textContent = ["press the big red button", "you pressed it. again?", "it is a button. press it.", "ok fine. one more.", "THE BUTTON IS TIRED"][Math.min(4, gifts)];
    window.__pipoAudio?.swoop();
    onToggle?.(true, "secret");
  });

  /* an uptime counter, because of course */
  const upEl = document.getElementById("chaos-uptime");
  const since = Date.now();
  let upTimer = null;
  function uptime() {
    if (!upEl) return;
    const s = Math.floor((Date.now() - since) / 1000);
    upEl.textContent = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
      .map((n) => String(n).padStart(2, "0")).join(":");
  }

  function readout() {
    if (dims) dims.textContent = `${window.innerWidth}×${window.innerHeight}`;
  }
  readout();
  window.addEventListener("resize", readout, { passive: true });

  function set(v, quiet = false) {
    on = v;
    document.documentElement.setAttribute("data-chaos", v ? "on" : "off");
    document.body.setAttribute("data-chaos", v ? "on" : "off");
    btn?.setAttribute("aria-pressed", String(v));
    try { localStorage.setItem(KEY, v ? "on" : "off"); } catch {}
    readout();

    if (v) { uptime(); clearInterval(upTimer); upTimer = setInterval(uptime, 1000); clearTimeout(chaosBits._t); tickBits(); }
    else { clearInterval(upTimer); clearTimeout(chaosBits._t); }

    if (!quiet) onToggle?.(v);
  }

  set(on, true);

  btn?.addEventListener("click", () => set(!on));

  /* on this page the furniture is the point, so the button is a
     power switch and there is nothing to switch it *off* to */
  if (force) {
    set(true, true);
    return { set, get on() { return on; } };
  }

  /* ── chaos mode is chaotic. it rearranges itself on resize. ── */
  let raf = 0;
  const shuffle = () => {
    if (!on || reduce) return;
    const pop = document.querySelector(".chaos-pop");
    const np = document.querySelector(".chaos-nowplaying");
    const badge = document.querySelector(".chaos-badge");
    const rot = document.querySelector(".chaos-rotator");
    // each element takes a random corner on every window resize
    const pickCorner = (el) => {
      if (!el) return;
      const x = Math.random() * 70, y = Math.random() * 70;
      el.style.left = x + "vw";
      el.style.top = y + "vh";
      el.style.right = "auto";
      el.style.bottom = "auto";
    };
    [pop, np, badge, rot].forEach(pickCorner);
    clearTimeout(shuffle._t);
    shuffle._t = setTimeout(shuffle, 9000);
  };
  window.addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(shuffle); });
  shuffle();

  /* Esc always gets you out of chaos. That is the one escape hatch. */
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && on) set(false); });

  return { set, get on() { return on; } };
}