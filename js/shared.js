/* ══════════════════════════════════════════════════════════════
   PIPO — shared.js

   The shared walls: the wishes, the stars you pin, and the Sneeze
   Dash leaderboard. All three want the same thing — everybody should
   see everybody else's.

   ── HOW IT WORKS, IN ONE PARAGRAPH ──

   Rather than make you sign up for a database at 2am on a Tuesday,
   this talks to ntfy.sh: a free public message broker where you can
   POST to a topic with no account, no key and no signup, and read the
   topic back as JSON. It is a pub/sub pipe, not a database — which is
   honestly all three of these features need. Pin a line, it is in the
   sky for every visitor from then on.

   ── THE HONEST BIT ──

   A topic is a bit like a URL: anyone who knows it can read it, and
   anyone who knows it can write to it. The topics below are long and
   silly to discourage drive-by vandalism, but this is a public art
   piece, not a bank. Messages expire after 12 hours, so the walls
   reset themselves and nobody's 3am joke becomes permanent folklore.

   Everything degrades silently. Offline, blocked, rate-limited, judge
   on hotel wifi — it all falls back to localStorage and the site never
   breaks. A pinned star is never lost.

   If you later want a real database, set REMOTE_* in config.js to a
   Supabase REST endpoint instead and the same code reads and writes it.
   ══════════════════════════════════════════════════════════════ */

import { REMOTE_STARS, REMOTE_WISHS, REMOTE_SCORES, REMOTE_GARDEN, NTFY_FALLBACK, STORAGE_NS } from "./config.js";

/* ── local storage: always on, always the fallback ───────────── */
function readLocal(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
function writeLocal(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list.slice(0, 80))); } catch {}
}

const PALETTE = ["#ffd08a", "#f4a6c0", "#8fa6f5", "#fff4e6", "#cbb2ec"];
const colour = (i) => PALETTE[i % PALETTE.length];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ══════════════════════════ THE TRANSPORT ══════════════════════
   A FEED CAN HAVE SEVERAL BACKENDS, TRIED IN ORDER.

       Supabase  ->  ntfy.sh  ->  localStorage

   Why the chain exists: if you point a feed at Supabase and get a
   row-level security policy slightly wrong, a single-backend feed
   fails silently and drops to localStorage — strictly worse than the
   thing that was already working. With the chain, a broken Supabase
   config falls through to ntfy and nobody notices.

   Whichever backend answers a read first is the one we then write to.
   ══════════════════════════════════════════════════════════════ */

/* ── ntfy.sh ── */
function ntfyTransport(topic) {
  const base = topic.replace(/\/+$/, "");
  return {
    label: "ntfy",
    async pull() {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`${base}/json?poll=1`, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      clearTimeout(t);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      // newline-delimited JSON, one message per line
      return text.split("\n").filter(Boolean).map((line) => {
        let m;
        try { m = JSON.parse(line); } catch { return null; }
        if (!m || m.event !== "message") return null;
        try { return JSON.parse(m.message); } catch { return null; }
      }).filter(Boolean);
    },
    async push(entry) {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
    },
  };
}

/* ── Supabase REST, or any endpoint that speaks this shape ── */
function restTransport(cfg) {
  const GET = cfg.url;
  const POST = cfg.post || cfg.url;
  const map = typeof cfg.map === "function"
    ? cfg.map
    : (r) => ({
        id: String(r.id ?? ""),
        text: r.text ?? "",
        from: r.from_name ?? "a visitor",
        c: r.colour ?? "#f4a6c0",
        score: r.score ?? 0,
        payload: r.payload ?? null,
        at: Date.parse(r.created_at) || Date.now(),
      });

  const headers = () => {
    const h = { "Content-Type": "application/json", Prefer: "return=minimal" };
    if (cfg.key) { h.apikey = cfg.key; h.Authorization = "Bearer " + cfg.key; }
    return h;
  };

  return {
    label: cfg.label || "rest",
    async pull() {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(GET, { headers: headers(), signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || data.records || []);
      if (!Array.isArray(list) || !list.length) throw new Error("empty");
      return list.map(map);
    },
    async push(entry) {
      const res = await fetch(POST, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          text: entry.text ?? "",
          from_name: entry.from ?? "a visitor",
          colour: entry.c ?? "#f4a6c0",
          score: entry.score ?? 0,
          payload: entry.payload ?? null,
        }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
    },
  };
}

/* turn whatever is in config into an ordered list of transports */
function transportList(spec) {
  if (!spec) return [];
  const one = (s) => {
    if (!s) return null;
    if (typeof s === "string") {
      // a bare URL: Supabase-shaped if it looks like one, else ntfy
      return /supabase\.co/.test(s) ? restTransport({ url: s }) : ntfyTransport(s);
    }
    if (s.ntfy) return ntfyTransport(s.ntfy);
    if (s.url || s.post) return restTransport(s);
    return null;
  };
  return (Array.isArray(spec) ? spec : [spec]).map(one).filter(Boolean);
}

/* ══════════════════════════ THE FEED ══════════════════════════ */
export function createFeed({ endpoint, localKey, limit = 40, colourByIndex = true }) {
  const nets = transportList(endpoint);
  const state = { items: [], loaded: false, shared: false, listeners: [], backend: null };
  const emit = () => state.listeners.forEach((f) => f(state.items, state.shared));

  const byId = new Map();
  const index = (list) => {
    byId.clear();
    list.forEach((e) => e.id && byId.set(e.id, e));
    return list;
  };
  index(state.items);

  /* Try each backend in turn. The first that answers wins, and from
     then on it is the one we write to. */
  async function load() {
    state.items = index(readLocal(localKey));

    for (const net of nets) {
      try {
        const remote = await net.pull();
        // merge: local wins on id collision (it is the same entry)
        const merged = [...remote.filter((e) => e.id && !byId.has(e.id)), ...state.items];
        state.items = index(merged.slice(0, limit));
        state.shared = true;
        state.backend = net.label;
        writeLocal(localKey, state.items);
        state.loaded = true;
        emit();
        return state.items;
      } catch {
        // this one is down or misconfigured — fall through to the next
      }
    }

    state.shared = false;   // offline, blocked, or nothing configured
    state.loaded = true;
    emit();
    return state.items;
  }

  async function add({ text, from, ...rest }) {
    const entry = {
      id: uid(),
      text: String(text ?? "").slice(0, 140),
      from: String(from || "a visitor").slice(0, 24),
      c: colourByIndex ? colour(state.items.length) : "#f4a6c0",
      at: Date.now(),
      ...rest,
    };
    entry.mine = true;

    // write it locally FIRST so it always shows, even if the post fails
    state.items = index([entry, ...state.items].slice(0, limit));
    writeLocal(localKey, state.items);
    emit();

    if (nets.length) {
      // prefer whichever backend answered last time, then try the rest
      const preferred = nets.filter((n) => n.label === state.backend);
      const others = nets.filter((n) => n.label !== state.backend);
      for (const net of [...preferred, ...others]) {
        try {
          await net.push({ id: entry.id, text: entry.text, from: entry.from, c: entry.c, ...rest });
          state.shared = true;
          state.backend = net.label;
          setTimeout(load, 1500);   // re-read so you see everyone else too
          return entry;
        } catch {
          // try the next backend
        }
      }
    }
    return entry;
  }

  /* how many of these did *this browser* add — used by the copy */
  const mine = () => state.items.filter((e) => e.mine).length;

  return {
    load, add, emit, mine,
    onChange(fn) { state.listeners.push(fn); fn(state.items, state.shared); },
    get items() { return state.items; },
    get shared() { return state.shared; },
    get backend() { return state.backend; },
    get hasBackend() { return nets.length > 0; },
  };
}

/* ══════════════════════════ THE FOUR WALLS ══════════════════

   Each one is a LIST, tried in order:

       [ Supabase from config.js , ntfy.sh , localStorage ]

   So the moment you paste your Supabase details into config.js it
   takes over. If anything about it is wrong — wrong key, a security
   policy that blocks reads, the project sleeping — it falls through
   to ntfy and the walls keep working. You cannot break them.
   ══════════════════════════════════════════════════════════════ */

/* ntfy topic names may only contain letters, digits, - and _.
   STORAGE_NS is "pipo.v3", and the dot made every publish 404 and
   every read throw a CORS-shaped error. Slug it. */
const slug = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, "-");
const BASE = `https://ntfy.sh/haxbaby-babyfirstwebsite-pipo-${slug(STORAGE_NS)}`;

/* the safety net only. Returns nothing once it is switched off. */
const spare = NTFY_FALLBACK ? (t) => [{ ntfy: `${BASE}-${t}` }] : () => [];

const supa = (table, select) => ({
  label: "supabase",
  url:  `https://YOUR-PROJECT.supabase.co/rest/v1/${table}?select=${select}&order=created_at.desc&limit=40`,
  post: `https://YOUR-PROJECT.supabase.co/rest/v1/${table}`,
  key:  "YOUR-ANON-KEY",
});

/* ── the pinned stars ── */
export const starsFeed = () =>
  createFeed({
    endpoint: [
      REMOTE_STARS,
      supa("stars", "id,text,from_name,colour,created_at"), ...spare("stars"),
    ],
    localKey: `${STORAGE_NS}.stars`,
    limit: 40,
  });

/* ── the dream wishes ── */
export const wishesFeed = () =>
  createFeed({
    endpoint: [
      REMOTE_WISHS,
      supa("wishes", "id,text,from_name,created_at"), ...spare("wishes"),
    ],
    localKey: `${STORAGE_NS}.wishes`,
    limit: 40,
  });

/* ── the Sneeze Dash leaderboard ── */
export const scoresFeed = () =>
  createFeed({
    endpoint: [
      REMOTE_SCORES,
      supa("scores", "id,from_name,score,created_at"), ...spare("scores"),
    ],
    localKey: `${STORAGE_NS}.scores`,
    limit: 60,
    colourByIndex: false,
  });

/* ── the bloom yard. Not a bitmap — see bloomyard.js, which stores
      each flower as a set of strokes rather than a PNG, so a drawing
      costs about a kilobyte instead of eighty. ── */
export const gardenFeed = () =>
  createFeed({
    endpoint: [
      REMOTE_GARDEN,
      supa("garden", "id,from_name,colour,payload,created_at"), ...spare("garden"),
    ],
    localKey: `${STORAGE_NS}.garden`,
    limit: 60,
  });
