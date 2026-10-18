# 🐉 PIPO — Baby's First Website

**haX.baby · Track 2 — Your Own Baby** · 17–19 October 2026

> *"Everything is possible with the power of love and gratitude."*

Pipo is an original chibi sakura dragon: chubby round body, huge sparkly blue
eyes, cream antler-like horns, a curled tail, pastel scales and blossom
branches growing out of her shoulders. She works the night shift at the
**Sky Tech Department** as a **Junior Dream Courier**, was raised by the Dragon
of Moons and Stars, and she **sneezes cherry blossom petals**.

This is her site.

---

# 🚀 Start here — do these in this order

| # | task | time | why it's here |
|---|---|---|---|
| **1** | **Deploy** (Netlify Drop) | 2 min | Submission needs a live URL. Nothing else matters more. |
| **2** | **Public repo** (GitHub Desktop) | 5 min | Submission needs a public repo with commits dated 17–19 Oct. |
| **3** | **Supabase** (optional) | 10 min | Makes the four shared walls survive a server restart. |

Do **1 and 2 before touching anything else.** They are the submission.
Supabase is a bonus — the walls already work without it.

---

## 1 · Deploy — 2 minutes

No build step, no config, no account needed.

1. Open **<https://app.netlify.com/drop>**
2. Drag the whole **`pipo-portfolio` folder** onto the page
3. Wait ~30 seconds. You get a URL like `https://random-word.netlify.app`
4. Optional: **Site settings → Change site name** → `pipo-baby`

**That is your live URL. Write it down.**

To update later, drag the folder onto the drop page again — it redeploys in
about 30 seconds.

> Any static host works. Cloudflare Pages, GitHub Pages and Vercel all serve
> this as-is with no build command and no output directory.

---

## 2 · Public repo — 5 minutes

There is **no git on this machine**, so use GitHub Desktop.

The trap: *File → Add Local Repository* fails on `pipo-portfolio`, because
the folder is not a git repo yet. That error contains a **"create a
repository"** link — that is the step people miss.

1. **File → Add Local Repository** → pick `pipo-portfolio`
2. When it complains, click **"create a repository"**
3. Name: `pipo-baby`
4. ⚠️ **Untick "Keep this code private"** — the brief requires it public
5. **Create Repository**, then **Publish branch** (top right)

44 files, ~3.7 MB, no `node_modules`. It goes straight through.

### Alternative — do it in the browser instead

Skip Desktop entirely if it is being difficult:

1. github.com → **+ → New repository**
2. Name `pipo-baby`, select **Public**, tick **"Add a README"**
3. On the repo page: **Add file → Upload files**
4. Drag the *contents* of `pipo-portfolio` in (44 files, well under the
   100-file limit)

---

## 3 · Supabase — 10 minutes (optional, but worth it)

Pipo has four walls that everybody shares: the **Bloom Yard**, the
**Star Terminal**, the **Sneeze Dash leaderboard** and the **Dream Wishes**.
You asked for a real backend so the data comes from every visitor, not just
this browser. This is that.

**You do not need this for the walls to work.** They already work without it.
Supabase just makes them survive a server restart instead of expiring.

### Step 1 — create the project

1. **<https://supabase.com>** → sign in with GitHub → **New project**
2. Name it anything (`pipo-baby`), set a database password (save it), pick a
   region near you → **Create new project**
3. Wait ~2 minutes for provisioning

### Step 2 — create the tables

1. Left sidebar → **SQL Editor** → **New query**
2. Open **`SUPABASE-SETUP.sql`** from this repo, copy the whole thing, paste it in
3. Press **Run**

You should see `Success. No rows returned`. That created four tables
(`stars`, `wishes`, `scores`, `garden`) and opened read/write on them.

> Running it twice is harmless — it drops and rebuilds.

### Step 3 — get the two numbers

Left sidebar → **Project Settings → API** (it may be called **Data API** now).
Copy both:

| what | looks like |
|---|---|
| **Project URL** | `https://abcdefghijklmnop.supabase.co` |
| **anon public** key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

The anon key is safe to put in front-end JavaScript. It is designed for that,
and the SQL above restricts what it can do to these four tables.

### Step 4 — paste them in

Open **`js/shared.js`** and find `supa()` (near the bottom):

```js
const supa = (table, select) => ({
  label: "supabase",
  url:  `https://abcdefghijklmnop.supabase.co/rest/v1/${table}?select=${select}&order=created_at.desc&limit=40`,
  post: `https://abcdefghijklmnop.supabase.co/rest/v1/${table}`,
  key:  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
});
```

Three replacements, all on that one function:

- `YOUR-PROJECT` appears **twice** → becomes `abcdefghijklmnop`
- `YOUR-ANON-KEY` appears **once** → becomes the long `eyJ...` string

**That is the entire integration.** Redeploy and the walls switch over.

### Step 5 — check it actually took

Open your live site, open the browser console, and run:

```js
JSON.parse(localStorage.getItem("pipo.v3.stars"))
```

Each entry has a `backend` field. If it says `"supabase"`, you are connected.
If it says `"ntfy"`, Supabase did not answer and it fell back — check the
Project URL for typos and make sure you ran the SQL.

### How the fallback chain works

Every wall tries its transports **in order**, and whichever answers first
becomes the write target:

```
Supabase  →  ntfy.sh  →  localStorage
```

So if Supabase is asleep, misconfigured, rate-limited, or the judge is on
hotel wifi, the wall silently drops to the next one. **Nothing is ever
lost and nothing ever breaks.** Leave `NTFY_FALLBACK = true` in
`js/config.js` — that is the safety net.

### The honest caveats

- **ntfy.sh topics are like URLs.** Anyone who knows one can read and write
  it. The topics are long and silly to discourage drive-by vandalism, but
  this is a public art piece, not a bank.
- **ntfy messages expire after 12 hours.** The walls reset themselves,
  which means nobody's 3am joke becomes permanent folklore. Honestly good.
- **Supabase RLS is wide open on purpose** — `anyone can read` and
  `anyone can post`. There is no personal data here beyond a name somebody
  typed in themselves.

### It never lies about where your words went

The forms say *"pinned for everyone"* when a network is live and *"saved on
this device"* when it is not. Offline, blocked, rate-limited — it all falls
back to `localStorage` silently. **A pinned star is never lost.**

---

# 🖥 Running it locally

Any static server works. No `npm install`, no build.

```bash
python -m http.server 4321
#  → http://localhost:4321
```

> ⚠️ You **must** serve it over `http://`. Opening `index.html` directly
> fails — browsers block ES modules on `file://`.

---

# 🗂 The map

```
index.html              the whole document
chaos.html              chaos mode — its own page, deliberately
SUPABASE-SETUP.sql      paste into the Supabase SQL editor
netlify.toml, _headers  deploy config
css/
  base.css              tokens, reset, palette, stacking order
  world.css             the scrolling background + section transitions
  site.css              every section
  chaos.css             chaos mode only
js/
  main.js               boots everything
  hero.js               the gate + the depth zoom
  world.js              morning → noon → dusk → night
  voice.js              she remembers you + she talks back
  scene.js              two WebGL surfaces + lighting
  pipo.js               the 3D dragon, built from maths
  audio.js              every sound, synthesised live + the score
  shared.js             the transport chain (Supabase → ntfy → local)
  config.js             everything adjustable
  chaos.js              chaos mode furniture
  chaospage.js          the chaos mini-game
  art.js                placeholder art
  easter.js             six easter eggs
  cursor.js             sparkle trail + odometer + torch
  sky.js                petals + the sky button
  timemachine.js        the hour slider
  treehouse.js          the hidden room
  weather.js            petals · rain · snow · storm · clear
  sections/             bloomyard · radio · fortune · starfield ·
                        storybook · game · guestbook · leaderboard
assets/                 drop-in art (see below)
vendor/                 three.js, GSAP, ScrollTrigger, Lenis (local copies)
```

**Zero build step.** Everything is vanilla and vendored. Node is not required.

---

# 🎨 Drop your art in here

Put files in `assets/` with these exact names. **One file is the minimum.**

| File | Where it appears | Required? |
|---|---|---|
| `assets/pipo-adult.png` | the landing hero | **yes** |
| `assets/pipo-child.png` | the character sheet | **yes** |
| `assets/fortune-cookie.png` | the fortune machine | no |
| `assets/pipo-glow.png` | back layer of the hero zoom | no |
| `assets/pipo-tail.png` | back layer of the hero zoom | no |
| `assets/pipo-head.png` | front layer of the hero zoom | no |

**Transparent PNG or WebP only** — strip the checkerboard with
[remove.bg](https://remove.bg) or crop in [Photopea](https://www.photopea.com),
both free and in-browser.

Anything missing falls back to a hand-drawn SVG placeholder, so the site never
looks broken while you work.

> **This is the one thing only you can do.** The site runs happily on drawn
> SVG placeholders. Save your dragon art as those filenames and it swaps in
> automatically. Nothing else needs changing.

---

# ✅ The rubric, mapped

**Core requirements**

| # | requirement | status |
|---|---|---|
| 1 | Character intro + identity | ✅ 5-point character sheet, live 3D model |
| 2 | 3+ projects | ✅ Bloom Yard · Mood Radio · Fortune Machine |
| 3 | Scroll-driven origin story | ✅ 5 scenes, motion-led, under 150 words each |
| 4 | Immersion | ✅ cursor reaction, live audio with mute, 7 clickables |
| 5 | Mobile | ✅ responsive down to 360px |
| 6 | Hidden easter egg | ✅ **six** of them |

**Tiers**

- **Tier 1** — cursor reaction ✅ · scroll story ✅ · day/night ✅ ·
  responsive ✅ · easter egg ✅
- **Tier 2** — Web Audio score ✅ · torch cursor ✅ · storybook flip ✅ ·
  mini-game ✅
- **Tier 3** — live 3D WebGL character ✅ · visitor memory ✅ ·
  character chats back ✅

**Side quests — all 13 points**

| Quest | | |
|---|---|---|
| Live Guestbook | +2 | ✅ |
| Sparkle Cursor Trail | +2 | ✅ |
| Hit Counter Odometer | +1 | ✅ |
| Click Sounds + Mute | +3 | ✅ |
| Responsive Chaos Mode | +5 | ✅ |

---

# 🧩 The four shared walls

All four read and write through the same transport chain in `js/shared.js`:

| wall | table | what it stores |
|---|---|---|
| **Bloom Yard** | `garden` | drawn flowers |
| **Star Terminal** | `stars` | pinned stars + messages |
| **Sneeze Dash** | `scores` | the leaderboard |
| **Dream Wishes** | `wishes` | wishes |

Flowers are stored as **vector strokes, not a PNG**. A bitmap flower cost
40–80 KB, which is far too big to push around. Strokes cost about a
kilobyte and look sharper when redrawn.

**Verified end to end:** clear the browser storage entirely, reload, and the
garden, stars, wishes and leaderboard are all still there. That is the proof
they are genuinely shared rather than faked with `localStorage`.

---

# 🍀 The Fortune Machine — real pixel art

An arcade cabinet: scrolling marquee, CRT screen with scanlines, chunky
control deck. The cookie is drawn on a **96×96 canvas and scaled up with
nearest-neighbour**, so it is genuine pixel art rather than a rounded div
pretending. Four frames stepped on the crack: sealed → the fold gives → it
splits → the slip unrolls. The cabinet rattles while it cracks.

> **Note for future edits:** there is deliberately no `ctx.rotate` anywhere
> in `js/sections/fortune.js`. Rotating anti-aliases `fillRect` and smears
> the pixel grid. Everything moves in whole pixels instead.

**The cookie never cracks early.** The fortune is not generated, not shown in
the DOM, not put in an aria-label until you press the button. That is the
whole joke.

---

# 🐉 The 3D Pipo

Two dragons, both **built from maths at runtime** in `js/pipo.js` — no
`.glb`, no download, nothing to credit. Same builder, two sizes: the tiny one
that flies after your cursor, and the big one turning slowly in the character
sheet.

Modelled from the character sheet: cream branching antler horns, enormous blue
eyes with two highlights and a dark rim, cream belly and muzzle, stubby legs
with small claws, a long curled fluffy tail, and five-petal sakura blossoms
with green leaves clinging to her shoulders and tail. **Wingless**, symmetric,
in a neutral floating pose — as the brief requires.

Her scales shimmer in pastel pink, lilac and light blue. The drift is
deliberately tiny — computed from a **fixed base colour** each frame rather
than accumulated, so she never visibly changes colour over time.

> **If you want a true-to-the-art model instead**, that cannot be made here —
> it needs a 3D generator. Fastest route: upload your art to
> [Meshy](https://www.meshy.ai) or [Tripo](https://www.tripo3d.ai), export a
> `.glb`, drop it in `assets/`. Honestly though — for a cursor follower,
> low-poly stylised reads *better* than a realistic model and costs nothing
> in file size. Keep the maths one.

---

# 🎵 The music

Two things play, on deliberately separate buses so they can never talk over
each other:

| bus | what | volume |
|---|---|---|
| `sfx` | clicks, chimes, sneezes | full |
| `music` | the background score | 0.34 |
| `radio` | the Mood Radio | 0.9, ducked when the score plays |

**The score** (`Score` in `js/audio.js`) is a light, playful generative piece:
a soft pulse, a walking bass, a mostly-stepwise melody and a shimmer, in
major pentatonic so it never sounds sour. It thickens and darkens as the sky
goes to night, driven by `world.progress`.

**The Mood Radio** gives each station a real 16-step bar — a chord that turns
over every two bars, a bassline that follows it, a melody that walks the
chord tones — and loops forever. When you tune in, `audio.duckFor()` eases
the score almost to nothing. When you leave, it comes back.

---

# 🥚 Easter eggs

| How | What |
|---|---|
| type `pipo` | she swoops over and sparkles |
| type `achoo` | she sneezes. petals everywhere. sorry. |
| click the moon 3× | somebody knocks back |
| `↑↑↓↓←→←→BA` | chaos mode |
| click the footer ✿ | a whole sky of petals |
| ask her about the moon **three times** | she actually tells you |
| press **P** | summon her anywhere on the page |

---

# 🌀 Chaos mode

Chaos mode is **its own page** (`chaos.html`), not an overlay on the real
site — the joke only works if the proper site is untouched.

Pipo is flying fast and panicked. Feed her to calm her down. Miss too long
and she detonates into a petal storm. The world bounds are derived from the
camera rather than guessed, so she cannot escape the screen and you cannot
miss a catch through a scaling bug.

---

# 🌤 The sky controls

**Weather** — `✿ petals · ☂ rain · ❄ snow · ✺ storm · ☀ clear`
It blends with the hour, so you can stand in the snow at noon. The storm
throws lightning and blows the petals sideways. Each has a line of dialogue.

**The time machine** (`◷`) — a slider that drags the whole day sideways:
sky colour, sun position, stars, blossom density, cloud drift. Release and
it eases back to wherever you actually are, or hit **lock** to hold an hour.

---

# 🏠 The treehouse (the big easter egg)

At the foot of the big sakura tree there is a small lit window. It is very
easy to miss. Click it — or the tree itself — and the whole page slides into
her room.

There is a lantern, a jar of nine buttons, a leaf she is keeping for no
reason, the satchel, and one small sleeping dragon. The objects are
clickable. On your **first** find she is asleep, and you get to wake her.

---

# 📱 Mobile

Verified at 360px. What specifically matters on a phone:

- **Every tap target is at least 44×44px.** Under 700px the HUD buttons drop
  their labels and become icon-only; the colour swatches carry an invisible
  8px touch ring.
- **`#game-canvas` uses `touch-action: pan-y`, not `none`.** The mini-game
  only moves left and right, so a vertical swipe still scrolls the page. With
  `none` a visitor can genuinely get stuck — swipe, nothing happens, swipe,
  nothing happens.
- **`#bloom-canvas` keeps `touch-action: none`** because it is a drawing
  surface and you cannot draw a flower and scroll at the same time. It gets a
  visible dashed frame and a squarer ratio on phones.
- The odometer hides under 700px rather than fighting Pipo's chat button for
  the bottom corner.

---

# 🧠 Should we use real AI?

The conversation engine runs **entirely in the browser** — 33 rule sets,
memory of your name and history, mood reactions, follow-ups, and a
three-stage secret. It never fails and never stalls.

There *is* a hook. Put an endpoint in `js/config.js` (`AI_ENDPOINT`) and she
will use it, falling back to the rules on any failure, timeout or nonsense.
It is **off by default** on purpose:

- a key in front-end JavaScript is **public** — anyone can read it and burn
  your quota
- judges may be offline, and a dead chat box costs more than it wins
- the brief's golden rule: one polished interaction beats five half-broken ones

The safe version is a free Cloudflare Worker or Vercel function that holds the
key, with `AI_ENDPOINT` pointed at that. Nothing is ever exposed.

---

# ⚙️ Config

Everything adjustable lives in `js/config.js`:

| key | what it does |
|---|---|
| `STORAGE_NS` | namespace for all local storage — change it to wipe everything |
| `REMOTE_*` | point any wall at your own REST endpoint |
| `NTFY_FALLBACK` | keep the ntfy safety net on (leave it on) |
| `AI_ENDPOINT` | optional LLM proxy. `null` = rules engine only |

---

# 🎨 Credit

Pipo is an original character invented for this hackathon. Not affiliated
with, and not resembling, any existing franchise.

- **Type** — [Fraunces](https://fonts.google.com/specimen/Fraunces) and
  [Fredoka](https://fonts.google.com/specimen/Fredoka), both SIL OFL
- **three.js** — MIT
- **GSAP + ScrollTrigger** — standard licence
- **Lenis** — MIT
- **Supabase** — Apache 2.0 · **ntfy** — GPL-2.0
