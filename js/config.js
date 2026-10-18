/* ══════════════════════════════════════════════════════════════
   PIPO — config.js
   One place for anything you might want to change later.
   ══════════════════════════════════════════════════════════════ */

export const SITE = {
  name: "PIPO",
  she: true,              // Pipo is a girl. Every line of copy says so.
  role: "Sakura Dragon · Keeper of Small Lights",
  tagline: "Everything is possible with the power of love and gratitude.",
};

/* Storage namespace. Bump this to orphan everything from an older
   build — that is how you clear a stale saved name without asking the
   visitor to clear their browser by hand. */
export const STORAGE_NS = "pipo.v3";

/* ──────────────────────────────────────────────────────────────
   SHOULD WE USE REAL AI?

   Left as null, Pipo's conversation engine runs entirely in the
   browser. It has ~20 rule sets, remembers your name and your
   history, follows up, reacts to mood, and never fails or stalls.

   If you paste an endpoint here, she will use it for replies and
   silently fall back to the rules if the request fails, times out
   (6s) or returns nonsense.

   IMPORTANT — read this before you add a key:
   · A key in front-end JavaScript is public. Anyone can read it,
     burn your quota, or bill you. That is a real risk.
   · Judges may have no network, or be offline. A chat box that
     dies in front of them costs you more than it wins.
   · The brief's golden rule: one polished interaction beats five
     half-broken ones.

   The safe version is a free serverless proxy you own (a Cloudflare
   Worker or a Vercel function that holds the key). Point
   AI_ENDPOINT at that and nothing is ever exposed.
   ────────────────────────────────────────────────────────────── */
export const AI_ENDPOINT = null;

/* Sent with every request so a model stays in character. */
export const PIPO_PERSONA =
  "You are Pipo, a chibi sakura dragon and Junior Dream Courier of the Sky Tech " +
  "Department. Small, round, enormous sparkly blue eyes, cream flame horns, pastel " +
  "scales that shift colour with the time of day. Curious, fearless, endlessly " +
  "kind, a little nosy, and genuinely bad at jokes on purpose. You were made out of " +
  "the love that was already in the universe, raised on the moon by the Dragon of " +
  "Moons and Stars, then came down to a cherry-blossom mountain. You hand out " +
  "dreams and stars. Answer in 1-3 short sentences, lowercase, warm, never preachy, " +
  "never more than 40 words.";

/* Where the wish wall posts to. Leave null and wishes stay in the
   visitor's own browser. Whatever you point it at, credit it. */
/* THE SHARED WALLS — wishes, pinned stars, and the game leaderboard.

   Left null, each one falls back to { ntfy: "<topic>" } in js/shared.js:
   a free public message broker that needs NO account, NO key and NO
   signup. Pin a line, everybody sees it. That is the default, and it
   works out of the box.

   To use a real database instead, set any of these to a Supabase REST
   endpoint and the exact same code reads and writes it:

     export const REMOTE_STARS = {
       url:  "https://xxx.supabase.co/rest/v1/stars?select=text,from_name,colour,created_at&order=created_at.desc&limit=40",
       post: "https://xxx.supabase.co/rest/v1/stars",
       key:  "your-anon-key",
       map:  (r) => ({ text: r.text, from: r.from_name, c: r.colour, at: Date.parse(r.created_at) }),
     };

   Whatever happens — no network, blocked, offline judge — it falls back
   to localStorage silently. A pinned star is never lost. */
export const REMOTE_STARS = null;
export const REMOTE_WISHS = null;
export const REMOTE_SCORES = null;
export const REMOTE_GARDEN = null;

/* The safety net behind all four walls.

   Right now, with no Supabase details filled in, that means the
   public ntfy.sh broker — which needs no account at all and keeps
   the walls shared out of the box.

   Once you have confirmed Supabase works, flip this to false and the
   walls are Supabase-only. */
export const NTFY_FALLBACK = true;

/* Your artwork. Any that are missing fall back to a drawn placeholder,
   so the site never looks broken while you are still making art. */
export const ART = {
  hero:   "assets/pipo-adult.png",
  child:  "assets/pipo-child.png",
  glow:   "assets/pipo-glow.png",
  tail:   "assets/pipo-tail.png",
  head:   "assets/pipo-head.png",
  fortune: "assets/fortune-cookie.png",
};

/* WebGL: set false to keep the procedural dragons off entirely. */
export const ENABLE_3D = true;