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
  /* app key → db column. PostgREST rejects a column that is not in
     the table's schema (HTTP 400 / PGRST204), so each feed declares
     exactly what it writes — see COLS below. */
  const APPKEY = { from_name: "from", colour: "c", payload: "strokes" };
  const keyOf = (col) => (cfg.app || APPKEY)[col] ?? col;

  const map = typeof cfg.map === "function"
    ? cfg.map
    : (r) => ({
        id: String(r.id ?? ""),
        text: r.text ?? "",
        from: r.from_name ?? "a visitor",
        c: r.colour ?? "#f4a6c0",
        score: r.score ?? 0,
        payload: r.payload ?? null,
        /* the Bloom Yard stores its drawing in `payload` but reads it
           back as `strokes`, which is the key ntfy uses. Provide both
           so a flower renders identically whichever backend served it. */
        strokes: r.payload ?? null,
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
      if (!Array.isArray(list)) throw new Error("bad shape");
      /* An empty wall is a WORKING wall, not a failure. This used to
         throw on `!list.length`, which meant a fresh Supabase table
         fell through to ntfy — and once ntfy became `state.backend`
         every write preferred it, so Supabase could never receive a
         row and could never stop being empty. Three of the four walls
         were deadlocked there permanently. */
      return list.map(map);
    },
    async push(entry) {
      /* send ONLY the columns this table has. Previously every wall
         sent every field (text, from_name, colour, score, payload)
         to every table, so all four inserts 400'd on the first
         unknown column and fell back to ntfy. */
      const body = cfg.cols
        ? Object.fromEntries(cfg.cols.map((col) => {
            const v = entry[keyOf(col)];
            return [col, v === undefined ? (col === "text" ? "" : null) : v];
          }))
        : {
            text: entry.text ?? "",
            from_name: entry.from ?? "a visitor",
            colour: entry.c ?? "#f4a6c0",
            score: entry.score ?? 0,
            payload: entry.payload ?? null,
          };
      const res = await fetch(POST, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
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

    /* Read from EVERY transport that answers, then union the result.

       This used to stop at the first transport that returned rows.
       That had two problems: a wall whose Supabase table was still
       empty silently skipped Supabase forever, and it meant one
       backend's content could hide the other's. Now a transport that
       answers at all counts as ALIVE, empty or not — alive is what
       decides the write target — and we keep reading the rest for
       their content until Supabase has caught up. */
    const alive = [];
    const got = [];
    for (const net of nets) {
      try {
        const remote = await net.pull();
        if (Array.isArray(remote)) { alive.push(net); got.push(...remote); }
      } catch {
        // down, blocked, rate-limited or misconfigured — the others still run
      }
    }

    /* de-duplicate across sources and against what we already have.
       Local wins on an id collision: it is the same entry, and it is
       the one carrying `mine`, which the copy depends on. Fresh
       remote rows go first because they arrive newest-first. */
    const seen = new Set(state.items.map((e) => e && e.id).filter(Boolean));
    const fresh = [];
    for (const e of got) {
      if (!e || !e.id || seen.has(e.id)) continue;
      seen.add(e.id);
      fresh.push(e);
    }
    state.items = index([...fresh, ...state.items].slice(0, limit));

    state.shared = alive.length > 0;
    /* first survivor wins — that is the one we write back to */
    state.backend = alive.length ? alive[0].label : null;
    if (alive.length) writeLocal(localKey, state.items);
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

/* Exactly which columns each table has. PostgREST answers 400
   (PGRST204 — "Could not find the 'x' column") for any column not in
   the schema, so this cannot be guessed or unioned across walls. */
const WALL_COLS = {
  stars:  ["text", "from_name", "colour"],
  wishes: ["text", "from_name"],
  scores: ["from_name", "score"],
  garden: ["from_name", "colour", "payload"],
};

const SUPA_HOST = "https://xgrtqdqdtyytpopaadcw.supabase.co";
const SUPA_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncnRxZHFkdHl5dHBvcGFhZGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMzEzNzYsImV4cCI6MjEwNzkwNzM3Nn0.KKZDIApF78jpAoLqDaa_ry-sViSHDDDrWQd8lZJvnkE";

const supaHeaders = () => ({
  apikey: SUPA_KEY,
  Authorization: "Bearer " + SUPA_KEY,
  "Content-Type": "application/json",
});

const supa = (table, select) => ({
  label: "supabase",
  url:  `${SUPA_HOST}/rest/v1/${table}?select=${select}&order=created_at.desc&limit=40`,
  post: `${SUPA_HOST}/rest/v1/${table}`,
  key:  SUPA_KEY,
  cols: WALL_COLS[table],
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

/* ══════════════════════════════════════════════════════════════
   HOW MANY PEOPLE HAVE ACTUALLY BEEN HERE
   ══════════════════════════════════════════════════════════════

   This was a hardcoded 1204 with a localStorage bump on top. It
   looked like a counter and was not one. Now it is real, and it comes
   from the same Supabase project as the four walls.

   The trick that keeps it cheap: PostgREST will report an exact count
   in the Content-Range header if you ask for it, so the query returns
   one empty row no matter how large the table grows. It never
   downloads the visits themselves.

   A visit is recorded at most once per browser session, so hammering
   refresh cannot inflate the number.

   Resolves to null when Supabase is unreachable — the caller falls
   back to a local tally, so the odometer is never blank or zero. */
export async function visitTally() {
  try {
    const SEEN = `${STORAGE_NS}.counted`;
    if (!sessionStorage.getItem(SEEN)) {
      sessionStorage.setItem(SEEN, "1");
      try {
        await fetch(`${SUPA_HOST}/rest/v1/visits`, {
          method: "POST",
          headers: supaHeaders(),
          body: JSON.stringify({ referrer: (document.referrer || "").slice(0, 200) }),
        });
      } catch { /* counting is best-effort; the read below still works */ }
    }

    const res = await fetch(`${SUPA_HOST}/rest/v1/visits?select=id`, {
      headers: { ...supaHeaders(), Prefer: "count=exact", Range: "0-0" },
    });
    if (!res.ok) return null;
    /* Content-Range arrives as "0-0/1234" */
    const total = parseInt((res.headers.get("Content-Range") || "").split("/")[1], 10);
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}
