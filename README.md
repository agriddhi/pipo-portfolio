# 🐉 PIPO — Sakura Dragon

**Track 2 · Your Own Baby** — built for [haX.baby — Baby's First Website](https://hax.baby/first-website) (17–19 Oct 2026)

> *"Everything is possible with the power of love and gratitude."*

---

## Run it

No build step. No `npm install`. Everything is vendored locally.

```bash
# any static server works
python -m http.server 4321
#  → http://localhost:4321
```

> ⚠️ You **must** serve it over `http://`, not open `index.html` directly.
> Browsers block ES modules on `file://`.

---

## 🎨 Drop your art in here

Put your files in `assets/` with these exact names. **One file is the minimum.**

| File | Where it appears | Required? |
|---|---|---|
| `assets/pipo-adult.png` | the landing hero | **yes** |
| `assets/pipo-child.png` | the character sheet | **yes** |
| `assets/fortune-cookie.png` | the fortune machine (hides the CSS shell) | no |
| `assets/pipo-glow.png` | back layer of the hero zoom | no |
| `assets/pipo-tail.png` | back layer of the hero zoom | no |
| `assets/pipo-head.png` | front layer of the hero zoom | no |

**Transparent PNG or WebP only** — strip the checkerboard with
[remove.bg](https://remove.bg) (free) or crop in [Photopea](https://www.photopea.com) (free, in-browser).

Anything missing falls back to a hand-drawn SVG placeholder, so the site
never looks broken while you work.

> **This is the one thing only you can do.** The site is currently running on
> drawn SVG placeholders. Save your dragon art as those filenames and it swaps
> in automatically. Nothing else needs changing.

### The depth zoom

The hero doesn't just scale the dragon up. Each layer moves at its own rate:

```
glow  depth 0.30   ← barely moves, sells the distance
tail  depth 0.62   ← medium
body  depth 1.00   ← the reference plane
head  depth 1.55   ← closest to camera, fastest, fades out first
```

Plus petals **rushing past the camera** at three depths. That combination is
what makes it read as a real dolly-zoom instead of a flat scale.

You only need `pipo-adult.png` for 70% of the effect. Cut the art up in
Photopea whenever you have time and it gets the rest.

---

## 🗂 The map

```
index.html              the whole document
css/
  base.css              tokens, reset, palette, stacking order
  world.css             the scrolling background + section transitions
  site.css              every section
js/
  main.js               boots everything
  hero.js               the gate + the depth zoom
  world.js              morning → noon → dusk → night
  voice.js              she remembers you + she talks back
  scene.js              two WebGL surfaces
  pipo.js               the 3D dragon, built from maths
  audio.js              every sound, synthesised live
  chaos.js              chaos mode
  art.js                placeholder art
  easter.js             six easter eggs
  cursor.js             sparkle trail + odometer + torch
  sky.js                petals + the sky button
  sections/             bloomyard · radio · fortune · starfield ·
                        storybook · game · guestbook
vendor/                 three.js, GSAP, ScrollTrigger, Lenis (local)
```

---

## ✅ The rubric, mapped

**Core requirements**
1. Character intro + identity — ✅ 5-point character sheet
2. 3+ projects — ✅ Bloom Yard · Mood Radio · Fortune Machine
3. Scroll-driven origin story — ✅ 5 scenes, each under 150 words
4. Immersion — ✅ cursor reaction, live audio with mute, 7 clickables
5. Mobile — ✅ responsive to 360px
6. Hidden easter egg — ✅ **six** of them

**Tiers**
- **Tier 1** — cursor reaction ✅, scroll story ✅, day/night toggle ✅, responsive ✅, easter egg ✅
- **Tier 2** — Web Audio lullaby ✅, torch cursor ✅, scroll-synced route ✅ (removed, replaced), storybook flip ✅, mini-game ✅
- **Tier 3** — live 3D WebGL character ✅, visitor memory ✅, character chats back ✅, Lighthouse target 90+

**Side quests — all 13 points**
| Quest | | |
|---|---|---|
| Live Guestbook | +2 | ✅ |
| Sparkle Cursor Trail | +2 | ✅ |
| Hit Counter Odometer | +1 | ✅ |
| Click Sounds + Mute | +3 | ✅ |
| Responsive Chaos Mode | +5 | ✅ |

---

## 🥠 The Fortune Machine — pixel art

An arcade cabinet: scrolling marquee, CRT screen with scanlines, chunky
control deck. The cookie is drawn on a **96×96 canvas and scaled up with
nearest-neighbour**, so it is genuine pixel art rather than a rounded div
pretending. Four frames stepped on the crack: sealed → the fold gives → it
splits → the slip unrolls. The cabinet rattles while it cracks.

> **Note for future edits:** there is deliberately no `ctx.rotate` anywhere in
> `js/sections/fortune.js`. Rotating anti-aliases `fillRect` and smears the
> pixel grid. Everything moves in whole pixels instead.

---

---

## 🌐 The shared walls — no signup required

The wishes, the pinned stars and the Sneeze Dash leaderboard all need the
same thing: everybody should see everybody else's.

**This already works, out of the box, with no account and no API key.**

`js/shared.js` talks to [ntfy.sh](https://ntfy.sh), a free public message
broker. You POST to a topic and read the topic back as JSON. That is a
pub/sub pipe rather than a database — which is honestly all three of
these features need.

```
pin a star  →  POST ntfy.sh/haxbaby-babyfirstwebsite-pipo-<ns>-stars
next visitor →  GET  the same topic, and your star is already in the sky
```

**Verified end to end:** clear the browser entirely, reload, and the wishes
and the leaderboard are still there. That is the proof it is genuinely
shared rather than faked with localStorage.

### The honest caveats

- **Topics are like URLs.** Anyone who knows one can read it, and can write
  to it. The topics are long and silly to discourage drive-by vandalism,
  but this is a public art piece, not a bank.
- **Messages expire after 12 hours.** The walls reset themselves, which
  means nobody's 3am joke becomes permanent folklore. Good, honestly.
- **Free tier rate limits** are generous for this (a handful of requests
  per visitor) and irrelevant at hackathon scale.

### If you want a real database instead

Point any of these in `js/config.js` at a Supabase REST endpoint and the
exact same code reads and writes it — no other changes anywhere:

```js
export const REMOTE_STARS = {
  url:  "https://xxx.supabase.co/rest/v1/stars?select=text,from_name,colour,created_at&order=created_at.desc&limit=40",
  post: "https://xxx.supabase.co/rest/v1/stars",
  key:  "your-anon-key",
  map:  (r) => ({ text: r.text, from: r.from_name, c: r.colour, at: Date.parse(r.created_at) }),
};
```

### It never lies about where your words went

The form says *"pinned for everyone"* when the network is live and *"saved
on this device"* when it is not. Offline, blocked, rate-limited, judge on
hotel wifi — it all falls back to localStorage silently. **A pinned star
is never lost.**

---

## 🎵 The music

Two things play, on deliberately separate buses so they can never talk over
each other:

| bus | what | volume |
|---|---|---|
| `sfx` | clicks, chimes, sneezes | full |
| `music` | the background score | 0.34 |
| `radio` | the Mood Radio | 0.9, ducked when the score plays |

**The score** (`Score` in `js/audio.js`) is a light, playful generative
piece: a soft pulse, a walking bass, a mostly-stepwise melody and a
shimmer, in major pentatonic so it never sounds sour. It thickens and
darkens as the sky goes to night, driven by `world.progress`.

It is a real fix: this used to exist as a slow lullaby called `hush` that
**was never wired to anything at all**, which is why the site had no music.

**The Mood Radio** used to pick a random scale note on a random octave
every tick, which sounded like a broken toy. Each station now has a real
16-step bar — a chord that turns over every two bars, a bassline that
follows it, a melody that walks the chord tones — and it loops forever.

When you tune the radio in, `audio.duckFor()` eases the score almost to
nothing. When you leave, it comes back.

---

## 🐉 The 3D Pipo

Two dragons, both **built from maths at runtime** in `js/pipo.js` — no
`.glb`, no download, nothing to credit. Same builder, two sizes: the tiny
one that flies after your cursor, and the big one turning slowly in the
character sheet.

Modelled from your character sheet: the big fluffy cream mane, branching
candle-flame horns, enormous blue eyes with two highlights and a dark rim,
cream belly, stubby legs, a long fluffy curled tail, and sakura blossoms
clinging to it.

**If you want a true-to-the-art model instead**, that can't be made here
— it needs a 3D generator. Fastest route: upload your art to
[Meshy](https://www.meshy.ai) or [Tripo](https://www.tripo3d.ai), export a
`.glb`, drop it in `assets/`. Honestly though — for a cursor follower,
low-poly stylised reads *better* than a realistic model and costs nothing
in file size. Keep the maths one.

---

## 📱 Mobile

Verified at 360px. What specifically matters on a phone:

- **Every tap target is at least 44×44px.** Under 700px the HUD buttons
  drop their labels and become icon-only; the colour swatches carry an
  invisible 8px touch ring.
- **`#game-canvas` uses `touch-action: pan-y`, not `none`.** The
  mini-game only moves left and right, so a vertical swipe still scrolls
  the page. With `none` a visitor can genuinely get stuck — swipe, nothing
  happens, swipe, nothing happens.
- **`#bloom-canvas` keeps `touch-action: none`** because it is a drawing
  surface and you cannot draw a flower and scroll at the same time. It
  gets a visible dashed frame and a squarer ratio on phones, with
  scrollable page above and below it.
- The odometer hides under 700px rather than fighting Pipo's chat button
  for the bottom corner.

---

## 🌤️ The sky controls

Two things you can play with, both in the top bar:

**Weather** — `✿ petals · ☂ rain · ❄ snow · ✺ storm · ☀ clear`
It blends with the hour, so you can stand in the snow at noon. The storm
throws lightning and blows the petals sideways. Each one has a line of
dialogue from Pipo.

**The time machine** (`◷`) — a slider that drags the whole day sideways:
sky colour, sun position, stars, blossom density, cloud drift, the lot.
Release the thumb and it eases back to wherever you actually are, or hit
**lock** to hold an hour.

## 🏠 The treehouse (the easter egg)

At the foot of the big sakura tree there is a small lit window. It is very
easy to miss. Click it — or click the tree itself — and the whole page
slides into her room.

There is a lantern, a jar of nine buttons, a leaf she is keeping for no
reason, the satchel, and one small sleeping dragon. The objects are
clickable. On your **first** find she is asleep, and you get to wake her.

---

## 🧠 Should we use real AI?

The conversation engine runs **entirely in the browser** — ~20 rule sets,
memory of your name and history, mood reactions, follow-ups, and a
three-stage secret. It never fails and never stalls.

There *is* a hook. Put an endpoint in `js/config.js` (`AI_ENDPOINT`) and she
will use it, falling back to the rules on any failure, timeout or nonsense.
It is off by default on purpose:

- a key in front-end JavaScript is **public** — anyone can read it and burn your quota
- judges may be offline, and a dead chat box costs you more than it wins
- the brief's golden rule: one polished interaction beats five half-broken ones

The safe version is a free Cloudflare Worker or Vercel function that holds
the key, and point `AI_ENDPOINT` at that. Nothing is ever exposed.

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

---

## 🚀 Ship it

```bash
git init
git add .
git commit -m "pipo — baby dragon, night shift"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then **Vercel** → import the repo → deploy. No build command, no output
directory — it serves the root as static files.

Other options: Netlify (drag the folder), Cloudflare Pages, GitHub Pages.

---

## ⚙️ Config

Everything adjustable lives in `js/config.js`.

## 🎨 Credit

Pipo is an original character invented for this hackathon. Not affiliated
with, and not resembling, any existing franchise. Type: **Fraunces** and
**Fredoka** (SIL OFL). Libraries: three.js (MIT), GSAP, Lenis (MIT).