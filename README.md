<div align="center">

# 🌸 PIPO

### Baby's First Website

**[`pipo-portfolio.netlify.app`](https://pipo-portfolio.netlify.app)**

*haX.baby · Track 2 — Your Own Baby · 17–19 October 2026*

> *"Everything is possible with the power of love and gratitude."*

</div>

---

## Who is Pipo

An original chibi sakura dragon, built from scratch in 48 hours.

**A round, chubby body. Huge sparkly eyes with a whole sky inside them. A long
curled tail. Soft pastel scales that shift with the time of day — peach at dawn,
lavender at dusk, moon-white at midnight. Cream horns like candle flame.**

She works the night shift at the **Sky Tech Department** as a **Junior Dream
Courier**. Half the job is her star terminal — a private patch of sky where
every star carries a line. The other half is building things: a flower yard, a
mood radio, a machine that cracks fortune cookies.

Her mission is **spread love, joy and positivity**, and she is not subtle about
it. She sneezes and the sky erupts in cherry blossom petals. She shapeshifts so
she can travel light. And she has a genuinely awful sense of humour — she will
ragebait her friends and laugh about it for an hour.

### The character sheet

| | |
|---|---|
| **Name** | Pipo. Two syllables, one breath. She answers to it from very far away. |
| **What she is** | Sakura Dragon. Curious, fearless, always roaming. Cannot walk past somebody who looks sad. |
| **What she does** | Night Shift, Sky Tech Department. Star terminal, and building things for people. |
| **Her story** | Made out of the love already floating around the universe — nothing was taken, something was *recognised*. The Dragon of Moons and Stars raised her on the moon, where she learned that light is a thing you hand to people. When she grew up she came all the way down to look, found a mountain covered in cherry blossom, and stayed. **The stars came with her.** |
| **Tagline** | *"Everything is possible with the power of love and gratitude."* She says it at least four times a day. She means it every time. |

---

## What's on the site

**Five things she built, all of them working:**

| | |
|---|---|
| 🌸 **Bloom Yard** | Draw a flower. It persists, it goes on a shared wall, and Pipo signs it. |
| 📻 **Mood Radio** | Pick a mood, she synthesises a track for it live in the browser. |
| 🥠 **Fortune Machine** | An arcade cabinet. The cookie cracks **only** when you press the button. Never before. |
| 🏃 **Sneeze Dash** | A mini-game. Arrow keys, WASD, or drag. |
| ⭐ **Star Terminal** | Pin a star to the sky with a line on it. Some stars are hers. Some are yours. |

**Plus:** a scroll-driven origin story, a flip-through storybook, a hidden
treehouse you can sleep in, a weather system, a time machine that drags the
whole day sideways, a visitor counter that counts real visits, and a chat box
where she answers back.

---

## Things worth actually looking at

**🦖 The dragon is built out of maths.** There is no `.glb` file and nothing to
download. `js/pipo.js` assembles her from primitives at runtime — 287 meshes for
the adult, 212 for the tiny one that chases your cursor. Wingless, symmetric,
neutral floating pose, cream branching antlers, scalloped scales and five-petal
sakura blossoms. Same builder, two sizes.

**🌐 Four walls, one real backend.** The Bloom Yard, the Star Terminal, the
Sneeze Dash leaderboard and the Dream Wishes are all shared — everybody sees
everybody else's. They read and write through a transport chain:

```
Supabase  →  ntfy.sh  →  localStorage
```

Whichever backend answers first becomes the write target, and the others are
read as well, so content survives a server restart *and* an outage. **The UI
never lies about where your words went** — it says "pinned for everyone" when a
network is live and "saved on this device" when it is not.

**🎵 Every sound is synthesised live.** No audio files. Three separate buses
(`sfx` / `music` / `radio`) so nothing can ever talk over anything else. The
background score is generative in major pentatonic and darkens as night falls;
the Mood Radio gives each station a real 16-step bar with a chord that turns
over every two bars. Tuning in ducks the score almost to silence.

**🥠 The fortune cookie is real pixel art.** Drawn on a 96×96 canvas and scaled
up nearest-neighbour — not a rounded div pretending. Four frames stepped on the
crack. The cabinet rattles while it cracks.

**🌸 Petals in the Bloom Yard are stored as strokes, not pixels.** A bitmap of
one flower cost 40–80 KB. The same drawing as vector strokes is about a
kilobyte, and looks sharper when redrawn.

---

## The rubric, mapped

**Core requirements**

| | | |
|---|---|---|
| 1 | Character intro + identity | ✅ 5-point character sheet + live 3D model |
| 2 | 3+ projects | ✅ five, all working |
| 3 | Scroll-driven origin story | ✅ 5 scenes, motion-led, under 150 words each |
| 4 | Immersion | ✅ cursor reaction, live audio with mute, 12 controls + 5 hidden secrets |
| 5 | Mobile | ✅ responsive to 360px |
| 6 | Hidden easter egg | ✅ **six** of them |

**Tiers**

- **Tier 1** — cursor reaction ✅ · scroll story ✅ · day/night ✅ · responsive ✅ · easter egg ✅
- **Tier 2** — generative Web Audio score ✅ · torch cursor ✅ · storybook flip ✅ · mini-game ✅
- **Tier 3** — live 3D WebGL character ✅ · visitor memory ✅ · character chats back ✅

**Side quests — all 13 points**

| Quest | | |
|---|---|---|
| Live Guestbook | +2 | ✅ |
| Sparkle Cursor Trail | +2 | ✅ |
| Hit Counter Odometer | +1 | ✅ real, backed by the database |
| Click Sounds + Mute | +3 | ✅ |
| Responsive Chaos Mode | +5 | ✅ |

---

## 🥚 Easter eggs

| How | What |
|---|---|
| type `pipo` | she swoops over and sparkles |
| type `achoo` | she sneezes. petals everywhere. sorry. |
| click the moon 3× | somebody knocks back |
| `↑↑↓↓←→←→BA` | chaos mode |
| click the footer ✿ | a whole sky of petals |
| ask her about the moon **three times** | she actually tells you |
| press **P** | summon her anywhere on the page |

There's also a small lit window at the foot of the big cherry tree. It is very
easy to miss.

---

## 🌀 Chaos mode

Its **own page** — deliberately, so the real site stays untouched. Pipo is
flying fast and panicked. Feed her to calm her down. Let her hit 100% and she
sneezes, and the room fills with petals.

---

## Running it yourself

No build step. No `npm install`. Node is not required. Everything is vanilla and
vendored locally.

```bash
# any static server works
python -m http.server 4321
#  → http://localhost:4321
```

> ⚠️ You **must** serve it over `http://`. Opening `index.html` directly fails —
> browsers block ES modules on `file://`.

Deploy by dragging the folder onto [netlify.com/drop](https://app.netlify.com/drop),
or any static host. Cloudflare Pages, GitHub Pages and Vercel all serve this
as-is with no build command and no output directory.

### Supabase (optional — the walls work without it)

The site ships working on `ntfy.sh` + `localStorage` and needs no account. To
point it at a real database instead:

1. Create a project at [supabase.com](https://supabase.com)
2. **SQL Editor → New query** → paste all of `SUPABASE-SETUP.sql` → **Run**
3. Copy your **Project URL** and **anon public** key from **Project Settings → API**
4. Paste both into the `supa()` function at the bottom of `js/shared.js`,
   replacing `YOUR-PROJECT` (twice) and `YOUR-ANON-KEY` (once)

That is the whole integration. Redeploy and the walls switch over.

---

## 🗂 The map

```
index.html              the whole document
chaos.html              chaos mode — its own page
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
  art.js, easter.js, cursor.js, sky.js, timemachine.js,
  treehouse.js, weather.js
  sections/             bloomyard · radio · fortune · starfield ·
                        storybook · game · guestbook · leaderboard
assets/                 drop-in art
vendor/                 three.js, GSAP, ScrollTrigger, Lenis (local copies)
```

---

## ⚙️ Config

Everything adjustable lives in `js/config.js`:

| key | what it does |
|---|---|
| `STORAGE_NS` | namespace for all local storage — change it to wipe everything |
| `REMOTE_*` | point any wall at your own REST endpoint |
| `NTFY_FALLBACK` | keep the ntfy safety net on (leave it on) |
| `AI_ENDPOINT` | optional LLM proxy. `null` = rules engine only |

---

## Notes for anyone poking at the code

A few things are load-bearing and look like mistakes if you don't know why:

- **`js/sections/fortune.js` contains no `ctx.rotate` anywhere, on purpose.**
  Rotating anti-aliases `fillRect` and smears the pixel grid. Everything moves
  in whole pixels instead.

- **A loading screen can never trap anyone.** The gate's buttons are never
  disabled. An earlier version gated them on a `requestAnimationFrame` loop, and
  on any throttled device — background tab, low-power mode, old phone — that
  loop stalled and the visitor was locked out of their own website.

- **`body` uses `overflow-x: clip`, not `hidden`.** `hidden` silently kills the
  smooth-scroll library.

- **The chat engine's regex rules live in `re`, not `test`.** A `RegExp` stored
  in `.test` and then invoked as a function threw on *every* message, so the
  fallback answered all of them. It looked fine. It answered nothing.

- **`assets/pipo-glow.png`, `pipo-tail.png` and `pipo-head.png` are optional.**
  They are extra parallax slices for the hero zoom. If they're missing the page
  hides those layers and the zoom runs on the main body layer alone — which is
  exactly what the deployed site does today.

---

## 🎨 Credit

**Pipo is an original character invented for this hackathon.** Not affiliated
with, and not resembling, any existing franchise.

- **Art direction** — inspired by Japanese *sumi-e* ink wash and pastel chibi illustration
- **Type** — [Fraunces](https://fonts.google.com/specimen/Fraunces) and [Fredoka](https://fonts.google.com/specimen/Fredoka), both SIL OFL
- **three.js** — MIT · **GSAP + ScrollTrigger** · **Lenis** — MIT
- **Supabase** — Apache 2.0 · **ntfy** — GPL-2.0

All libraries are vendored locally. Hand-written HTML, CSS and JavaScript — no
framework, no build step.

---

<div align="center">

**made in 48 hours, mostly at night** ✿

</div>