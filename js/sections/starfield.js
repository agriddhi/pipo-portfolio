/* ══════════════════════════════════════════════════════════════
   PIPO — sections/starfield.js   (The Star Terminal)

   Her sky has stars in it. Every star carries a line - most of them
   hers, and the rest belong to whoever pinned them.

   The feed comes from js/shared.js. With no backend configured it is
   that visitor's own stars; with one configured it is everybody's.
   ══════════════════════════════════════════════════════════════ */

import { audio } from "../audio.js";
import { starsFeed } from "../shared.js";

/* Pipo's own lines, grouped by the colour of the star. */
export const SEED_STARS = [
  { c: "#ffd08a", kind: "courage",   line: "You do not have to be brave. You only have to begin.",         from: "pipo",  x: 11, y: 20 },
  { c: "#f4a6c0", kind: "tenderness", line: "Resting is not the same as giving up. Sleep, small one.",      from: "pipo",  x: 29, y: 11 },
  { c: "#8fa6f5", kind: "calm",       line: "The sky is enormous. So is the gap between a worry and a fact.", from: "pipo", x: 50, y: 24 },
  { c: "#fff4e6", kind: "rest",       line: "Put it down. It will still be there in the morning.",          from: "pipo",  x: 72, y: 14 },
  { c: "#cbb2ec", kind: "curiosity",  line: "Ask the silly question. The silly ones teach the most.",        from: "pipo",  x: 89, y: 32 },
  { c: "#ffd08a", kind: "courage",    line: "Nobody is watching. Nobody ever really was.",                  from: "pipo",  x: 20, y: 46 },
  { c: "#f4a6c0", kind: "tenderness", line: "You are somebody's favourite person. Probably several someones.", from: "pipo",  x: 43, y: 42 },
  { c: "#8fa6f5", kind: "calm",       line: "Breathe out longer than you breathe in. That is the whole trick.", from: "pipo", x: 65, y: 50 },
  { c: "#fff4e6", kind: "rest",       line: "You have survived every bad day so far. That is not nothing.",   from: "pipo",  x: 83, y: 60 },
  { c: "#cbb2ec", kind: "curiosity",  line: "Go and look at the thing you are scared to be interested in.",  from: "pipo",  x: 34, y: 68 },
  { c: "#ffd08a", kind: "courage",    line: "If nobody claps, clap for yourself. Loudly. In the dark.",       from: "pipo",  x: 59, y: 74 },
  { c: "#f4a6c0", kind: "tenderness", line: "Say the thing out loud. It gets smaller when you share it.",    from: "pipo",  x: 13, y: 78 },
  { c: "#8fa6f5", kind: "calm",       line: "The wind is not against you. It is only very busy.",           from: "pipo",  x: 77, y: 83 },
  { c: "#fff4e6", kind: "rest",       line: "Tomorrow-you is a friend. Be kind to today-you.",               from: "pipo",  x: 49, y: 89 },
  { c: "#ffd08a", kind: "courage",    line: "I told her to write this one. I did not have to. That is the joke.", from: "pipo", x: 26, y: 90 },
];

const KIND_LABEL = {
  courage: "a courage star", tenderness: "a tenderness star", calm: "a calm star",
  rest: "a rest star", curiosity: "a curiosity star",
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function initStarfield({ onRead, scene } = {}) {
  const sky = document.getElementById("star-sky");
  const out = document.getElementById("star-read");
  if (!sky || !out) return;

  const feed = starsFeed();
  let nodes = [];
  let pinned = [];

  const all = () => [...SEED_STARS, ...pinned];

  function render() {
    const list = all();
    sky.innerHTML = "";
    nodes = list.map((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "star";
      b.style.left = s.x + "%";
      b.style.top = s.y + "%";
      b.style.setProperty("--c", s.c || "#f4a6c0");
      b.style.setProperty("--s", (s.big ? 17 : 9 + ((i * 7) % 8)) + "px");
      b.style.setProperty("--d", 2.3 + ((i * 0.7) % 3.4) + "s");
      b.style.setProperty("--dl", (-((i * 0.4) % 4)).toFixed(2) + "s");
      const who = s.mine ? "you" : (s.from || "someone");
      b.setAttribute("aria-label", `${KIND_LABEL[s.kind] || "a star"}: ${s.line}. pinned by ${who}`);
      b.innerHTML = `<span class="star__dot" aria-hidden="true"></span><span class="star__name" aria-hidden="true">${esc(who)}</span>`;
      b.dataset.i = i;
      sky.appendChild(b);
      return b;
    });
  }

  function read(i) {
    const list = all();
    if (!nodes[i]) return;
    nodes.forEach((n) => n.classList.remove("is-read"));
    nodes[i].classList.add("is-read");
    nodes[i].focus?.({ preventScroll: true });

    const d = list[i];
    out.innerHTML = `
      <div>
        <span class="wish-read__star" style="color:${d.c || "#f4a6c0"}" aria-hidden="true">&#10022;</span>
        <p class="wish-read__line">&ldquo;${esc(d.line)}&rdquo;</p>
        <p class="wish-read__from">&mdash; ${esc(d.from || "someone out there")}</p>
      </div>`;

    audio.sparkle();
    const r = nodes[i].getBoundingClientRect();
    scene?.sendTo(r.left + r.width / 2, r.top + r.height / 2, 850);
    onRead?.(d);
  }

  /* ── interaction ──────────────────────────────────────────── */
  sky.addEventListener("click", (e) => {
    const b = e.target.closest(".star");
    if (b) read(+b.dataset.i);
  });

  let focusIdx = 0;
  sky.addEventListener("keydown", (e) => {
    const cols = 6;
    const n = nodes.length;
    if (!n) return;
    if (e.key === "ArrowRight") focusIdx = (focusIdx + 1) % n;
    else if (e.key === "ArrowLeft") focusIdx = (focusIdx - 1 + n) % n;
    else if (e.key === "ArrowDown") focusIdx = (focusIdx + cols) % n;
    else if (e.key === "ArrowUp") focusIdx = (focusIdx - cols + n) % n;
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); read(focusIdx); return; }
    else return;
    e.preventDefault();
    nodes[focusIdx]?.focus();
  });

  /* ── the shared feed ──────────────────────────────────────── */
  /* Pipo's own stars carry `line`; pinned stars from the shared feed
     carry `text`. Without this normaliser the readout printed
     "undefined" for every star a visitor pinned. */
  const normalise = (r, i) => ({
    ...r,
    line: r.line ?? r.text ?? "",
    from: r.from || r.from_name || "a visitor",
    c: r.c || r.colour || "#f4a6c0",
    kind: r.kind || "calm",
    big: true,
    x: 7 + ((i * 23) % 86),
    y: 13 + ((i * 37) % 76),
  });

  feed.onChange((items) => {
    pinned = items.slice(0, 40).map(normalise);
    render();
  });

  pinned = feed.items.map(normalise);
  render();
  feed.load();

  return {
    render,
    get shared() { return feed.shared; },
    get count() { return pinned.length; },
    /** pin a line — shared if a backend is configured, local otherwise */
    async add(text, from) {
      await feed.add({ text, from });
      return feed.shared;
    },
    clear() {
      feed.items.length = 0;
      pinned = [];
      render();
      out.innerHTML = `<p class="wish-read__placeholder">&hellip;</p>`;
    },
  };
}