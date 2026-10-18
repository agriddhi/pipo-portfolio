/* ══════════════════════════════════════════════════════════════
   PIPO — voice.js

   She remembers you, and she talks back.

     · localStorage: how many times you have been, what you planted,
       the stars you pinned. A different greeting every visit.
     · a conversation engine in her voice. It learns your name if you
       tell it, remembers what you said, reacts to mood, follows up.

   TWO RULES THIS FILE FOLLOWS, both learned the hard way:

     1. NO PRE-SEEDED NAMES. If you have not told Pipo your name in
        THIS build of the site, she calls you "friend" and nothing
        else. An old saved name must never reappear.

     2. SHE MUST NEVER GRAB THE CHAT BOX. An earlier version popped
        the bubble open on load and again every thirty seconds, so it
        kept swallowing keystrokes and the visitor could not type.
        Now she only ever whispers — a small badge on her button —
        and opens when you ask her to.

   ON AI: see AI_ENDPOINT in config.js. Off by default, with the rule
   engine as a guaranteed fallback.
   ══════════════════════════════════════════════════════════════ */

import { audio } from "./audio.js";
import { AI_ENDPOINT, PIPO_PERSONA, STORAGE_NS } from "./config.js";

const KEY = `${STORAGE_NS}.visitor`;

/* ══════════════════════════ MEMORY ══════════════════════════ */
export function memory() {
  let v = { visits: 0, name: "", firstSeen: null, lastSeen: null, planted: 0, pinned: 0, games: 0, fortunes: 0, talked: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") v = { ...v, ...raw };
  } catch {}

  // never trust a name from another build
  if (!v.visits) v.name = "";

  v.visits = (v.visits || 0) + 1;
  v.lastSeen = new Date().toISOString();
  if (!v.firstSeen) v.firstSeen = v.lastSeen;

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  save();

  return {
    get data() { return v; },
    get visits() { return v.visits; },
    get name() { return v.name || ""; },
    setName(n) { v.name = String(n || "").slice(0, 24); save(); },
    bump(k, by = 1) { v[k] = (v[k] || 0) + by; save(); },
    save,
    forget() { try { localStorage.removeItem(KEY); } catch {} },
  };
}

/* ══════════════════════════ CONTEXT ══════════════════════════ */
const ctx = { said: [], stage: 0, askedAbout: 0, lastSpoke: 0 };
let nudged = false;

function hour() {
  const h = new Date().getHours();
  if (h < 5) return "witching";
  if (h < 11) return "morning";
  if (h < 17) return "daytime";
  if (h < 21) return "evening";
  return "night";
}

/* ══════════════════════════ GREETINGS ══════════════════════════ */
function greetings(mem) {
  const who = mem.name || "friend";   // never anything else

  if (mem.visits <= 1) {
    return [
      "oh — hello. i'm pipo. i wasn't expecting you.",
      "hi! i'm pipo. i was counting petals. i lost count at six.",
      `hello ${who}. don't mind the mess, the sky does this on its own.`,
      "you're here. good. it's better with two.",
    ];
  }
  if (mem.visits >= 3 && mem.planted) {
    return [
      `visit ${mem.visits}. your ${mem.planted === 1 ? "flower is" : `${mem.planted} flowers are`} still growing out there.`,
      `${who}! your petals are still on the tree. i checked.`,
      `hello again. ${mem.pinned ? "your star is up there too, by the way." : "come plant something new?"}`,
    ];
  }
  if (mem.visits >= 4) {
    return [
      `visit ${mem.visits}, ${who}. i'm not going to stop counting.`,
      `${who}! i knew it was you. i always know it's you.`,
      `there you are. ${mem.visits} times now. the sky is getting used to you.`,
    ];
  }

  const t = hour();
  const byTime = {
    witching: ["you're here in the witching hours. so am i.", "it is very late. i approve.", "night visitor. my favourite kind."],
    morning: [`good morning, ${who}. the blossom count is at an all-time high.`, "morning! i made you a petal. it's not very good yet.", `you came back, ${who}. i didn't double-check but i hoped so.`],
    daytime: [`hello again, ${who}. visit number ${mem.visits}. i'm counting.`, "back so soon? i like you already and it's been far too few visits.", `hi ${who}! there's coffee somewhere and i can't reach it.`],
    evening: [`evening, ${who}. this is the good part of the day.`, "you came at dusk. that's the correct time honestly.", `hello ${who}. look at the colour of the sky. look at it.`],
    night: [`night, ${who}. you're on my list now.`, "you came back at night. that's how you know it's real.", `hello ${who}. visit ${mem.visits}. the stars are behaving for you.`],
  };
  return byTime[t] || byTime.daytime;
}

/* ══════════════════════════════════════════════════════════════
   THE ENGINE

   The complaint that started this: she had about twenty answers, she
   gave the same two over and over, and after ten messages she had
   nothing left to say.

   Three things changed:

     1. FAR more rules, and every rule carries several answers instead
        of one, so the same question rarely gets the same reply twice.
     2. A RECENT RING BUFFER. Nothing she says can repeat until every
        other thing she could have said has also been said. That one
        buffer is the whole fix for "she keeps saying the same thing".
     3. The fallback is no longer twelve strings. It assembles an
        answer out of an opener, a middle and a closer, so the truly
        unrecognised sentence still has thousands of possibilities.
   ══════════════════════════════════════════════════════════════ */

const RECENT_MAX = 14;
const recent = [];
const wasSaid = (s) => recent.includes(s);

function remember(s) {
  recent.push(s);
  if (recent.length > RECENT_MAX) recent.shift();
  return s;
}

/* pick something she has not said lately.
   When the whole list has been used inside the ring buffer, do NOT
   fall back to pure random — that is what produced the same answer
   four times in a row. Take the one that has been quiet longest. */
function pick(list) {
  if (!list || !list.length) return "";
  const fresh = list.filter((s) => !wasSaid(s));
  if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];

  let best = list[0];
  let bestIdx = -1;
  for (const s of list) {
    // where in the ring buffer it last appeared (higher = more recent)
    let idx = -1;
    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i] === s) { idx = i; break; }
    }
    if (idx > bestIdx) { bestIdx = idx; best = s; }
  }
  return best;
}

/* ── a rule: a regex, a reply, and several ways to say it ──────
   The field is called `re`, NOT `test`. Calling a RegExp is a
   TypeError — `r.test(q)` where `test` held a regex silently
   threw on every message and she fell through to the fallback for
   everything. Hence the slightly shouty name. */
const live = (re, fn) => ({ re, run: fn });

const RULES = [
  /* ══ WHO SHE IS ══ */
  live(/\b(who are you|what are you|your name|about you|tell me about (you|yourself|pipo))\b/, (q, mem) => pick([
    () => "pipo. sakura dragon. i run the night shift at sky tech.",
    () => "i'm pipo. i make dreams and hand them out. it's not complicated.",
    () => "raised on the moon by the dragon of moons and stars. came down for a look. stayed.",
    () => "chubby, pink, slightly allergic to spring. that's the short version.",
    () => `pipo. and i know you, ${mem.name}.`,
    () => "pipo. and i don't know you yet, which i'm working on.",
  ])),

  live(/\b(where do you live|your house|home|where do you sleep)\b/, () => pick([
    "a cherry tree on a mountain. there is a whole room in it. i made the room.",
    "the tree. i sleep in the branches and it's better than any bed you'll ever buy.",
    "up there. it glows from the inside. look for the window.",
  ])),

  live(/\b(your job|what do you do|work|job)\b/, () => pick([
    "i deliver dreams. sky tech department. night shift. mostly the tree.",
    "i hand out stars, one line each, to whoever looks up.",
    "count petals. they're not adding up.",
    "i exist. that's the job. the benefits are flowers.",
  ])),

  /* ══ THE MOON THREAD — ask three times and she actually tells you ══ */
  live(/\b(moon|space|universe|guardian|raised|made you|created you|who made you|your mother|parents)\b/, (q, mem) => {
    ctx.askedAbout++;
    if (ctx.askedAbout === 1) return pick([
      "oh. you want the real one.",
      "hm. that's a big door. most people don't knock on it.",
      "you're going to ask again, aren't you. go on then.",
    ]);
    if (ctx.askedAbout === 2) return pick([
      "she had a name but she never used it. dragons don't, mostly. we'd have forgotten each other.",
      "she kept the moon. she said it was mostly keeping, not holding.",
      "i call her the keeper. she would have hated the name and then liked it.",
    ]);
    if (ctx.askedAbout === 3) return pick([
      "i was made out of the love that was already in the room. nothing was taken. something was noticed. that's all. that's the whole thing.",
      "i was made out of the love that was already there. it looked around and went: yes, her.",
      "there was love. it had somewhere to go. i am where it went.",
    ]);
    return pick([
      "i've told you that already. i only tell it properly once. ask again tomorrow.",
      "you've got the good version. the rest is just feelings and i don't like those.",
      "no. one true thing per person. you had yours.",
    ]);
  }),

  /* ══ HOW SHE FEELS ══ */
  live(/\b(how are you|how'?re you|you ok|you alright|you good|how'?s it going)\b/, () => pick([
    "better than yesterday. yesterday was a long one.",
    "awake. that's most of it.",
    "good! the sky is behaving and nobody has asked me anything difficult in hours.",
    "i'm a dragon. i'm always good. it's slightly embarrassing.",
    "floaty. in a good way. like a sock in the wind.",
    "tired in the way that you sleep twice and it fixes you.",
  ])),

  live(/\b(sad|tired|exhausted|lonely|depress|hopeless|broken|lost|down|awful|terrible)\b/, () => pick([
    "oh no. come here. well — metaphorically. my arms are short.",
    "that's allowed to be true today. put it down for the night.",
    "i'll put a star on it. the small ones work best.",
    "you don't have to fix it tonight. you just have to get through tonight.",
    "that's not a you problem. that's a tuesday problem. tuesdays pass.",
    "hm. sit with me a second. i'm not going anywhere.",
    "do you want to be sad or do you want to be less sad? different jobs. i'm good at both.",
  ])),

  live(/\b(scared|afraid|nervous|anxious|worried|panic|stress|dread)\b/, () => pick([
    "scared is just interested without the commitment yet.",
    "i fell off the moon once. eleven seconds of not fine, then fine.",
    "be scared AND do it. that's the whole trick. i do it constantly.",
    "which part. the before, or the after? the after is usually better.",
    "your hands are shaking and you're still here. i noticed. good.",
  ])),

  live(/\b(happy|excited|amazing|great|good news|joy|proud|yay|love it)\b/, () => pick([
    "GOOD. say it again, louder, so the sky hears it.",
    "oh we must mark that. plant a flower. plant two.",
    "i felt that from the fourth mountain.",
    "that's the best thing i've heard since the last blossom.",
    "put it on a star. it's worth it.",
  ])),

  live(/\b(angry|annoyed|rage|furious|hate|petty)\b/, () => pick([
    "ragebait is my finest work. do not try it on me.",
    "i'm not angry. i'm just extremely pink about it.",
    "good. be angry. it's much better than the alternative.",
    "i will be petty about this for six to eight business days.",
  ])),

  live(/\b(lonely|alone|no one|nobody)\b/, () => pick([
    "you're not alone. there's literally a dragon on the screen.",
    "loneliness is just being in a room with nobody who knows the joke.",
    "i know a rock on the fourth roof. she never talks. perfect listener.",
  ])),

  /* ══ EVERYDAY LIFE ══ */
  live(/\b(work|job|school|study|exam|deadline|boss|interview|assignment|project)\b/, () => pick([
    "oof. i only have one job and it is: petals. i am thriving.",
    "you'll get it done. and then you'll forget it, which is the real reward.",
    "if it's too loud, go somewhere quieter. i do that. i go to the other mountain.",
    "deadlines are just the universe being dramatic. it will pass.",
    "do it badly first. you can always fix bad. you cannot fix nothing.",
    "i've never done a deadline. i've done a lot of falling over.",
  ])),

  live(/\b(friend|friends|lonely friend)\b/, () => pick([
    "friends are just people who saw you be strange and stayed. you're lucky.",
    "my best friend is a rock on the fourth roof. it never talks back. perfect.",
    "i ragebait mine constantly. it's my finest work. do not try it on me.",
    "you have one. you're talking to me. technically counts.",
  ])),

  live(/\b(food|eat|hungry|dinner|lunch|breakfast|cook)\b/, () => pick([
    "i eat petals. that's it. that's the diet.",
    "i tried soup once. it was mostly soup-shaped water.",
    "have you eaten. actually. not as a bit.",
    "i can't reach the kitchen. this is a known limitation of being four feet tall.",
  ])),

  live(/\b(sleep|bed|tired morning|nap|insomnia)\b/, () => pick([
    "sleep is just a small private sky. i go there often.",
    "i don't sleep much. i'm up mostly. i'm the night shift.",
    "close your eyes. the sky will still be here. it always is.",
  ])),

  live(/\b(money|rent|broke|job money|poor)\b/, () => pick([
    "i have nine rocks. one of them is a good rock. that's my portfolio.",
    "money is a thing that exists. i have heard of it. we do not speak.",
    "if you're short, be short loudly. it attracts the right people.",
  ])),

  /* ══ HER WORLD ══ */
  live(/\b(petal|flower|bloom|sakura|cherry|blossom|petals)\b/, () => pick([
    "cherry blossom. five hundred years of a tree deciding to be beautiful, on a schedule.",
    "plant one in the yard! they stay there forever. so do i, mostly.",
    "every petal is a dream on its way to somebody. i just carry them.",
    "the blossom count is at four thousand, give or take. i round down.",
    "they fall when i'm happy. which is often. it's a nuisance for the count.",
  ])),

  live(/\b(star|stars|sky|night|moon)\b/, () => pick([
    "every star carries one line. mine, or yours. i hand them out.",
    "pin one. put a line where you can see it. that's the whole point of me.",
    "the sky's not finished. that's why i'm out here.",
    "nine roofs, one line each, every night. that's the shift.",
    "i keep a star for people who come back. that's this one. that's you.",
  ])),

  live(/\b(music|song|sing|sound|lullaby|radio|track|sing)\b/, () => pick([
    "turn up the mood radio. i write the tracks live. nothing is pre-recorded.",
    "♪ which is a note. i only know one but i use it well.",
    "everything you hear on this page is maths. no files were harmed.",
    "try the sleepy station. it's very slow. it's almost just breathing.",
    "the background one? that's me too. i'm very inconsiderate.",
  ])),

  live(/\b(mountain|tree|forest|hill|outside|weather|rain|snow|storm)\b/, () => pick([
    "there's a mountain. there's a tree on it. i made most of that sentence true.",
    "the weather is my temper. i sneeze and it rains for an hour.",
    "outside is the good bit. i only come in to deliver.",
    "change the weather if you like. i won't notice. (i will notice.)",
  ])),

  live(/\b(dragon|magic|spell|magical|fantasy)\b/, () => pick([
    "i'm a dragon. i don't do spells. i do presence. it's more effective.",
    "dragons don't do magic. dragons turn up and then things are simply better.",
    "the closest thing i have to a spell is sneezing. it's not close enough.",
  ])),

  live(/\b(game|play|score|high score|leaderboard|win)\b/, () => pick([
    "sneeze dash! go on. i'll watch. i'll say things.",
    "the leaderboard is real. everyone who ever played is on it. that's you now.",
    "i don't get good at games. i get consistent, which is worse.",
  ])),

  /* ══ THE SITE ITSELF ══ */
  live(/\b(site|website|page|built|code|made this|portfolio)\b/, () => pick([
    "no frameworks. no build step. one dragon, assembled from spheres.",
    "it's all hand-written and slightly held together with hope.",
    "the petals you see are real petals, rendered live. that's a lie. they're maths. but they're very petal-shaped maths.",
    "scroll. the sky changes because you scrolled. that's the whole trick and it took ages.",
  ])),

  live(/\b(ai|artificial|chatbot|robot|real|actually real)\b/, () => pick([
    "no. i'm a list of rules and a very good attitude.",
    "no ai. just a small dragon with strong opinions and a big memory for your name.",
    "everything i say is hand-written. including the bit where i dodge the question.",
  ])),

  /* ══ HER QUIRKS ══ */
  live(/\b(sneeze|achoo|sniff|petals explode)\b/, () => pick([
    "don't. don't look at me like that.",
    "it's a whole weather system. i have no control. i am so sorry.",
    "ACHOO. sorry. that one's on you.",
    "it's a gift. a loud, seasonal, all-over-the-place gift.",
    "if i sneeze near you it's not personal. it's just tuesday.",
  ])),

  live(/\b(secret|easter egg|hidden|hidden thing)\b/, () => pick([
    "there's a window on the mountain. it's very small. you'd never.",
    "type your name and i'll remember it. that's a whole secret to some people.",
    "look at the door. then look away. doors are shy.",
  ])),

  /* ══ SMALL TALK THAT ISN'T SMALL ══ */
  live(/^(hi|hey|hello|yo|hiya|sup|heya|good (morning|evening|afternoon)|morning|evening)\b/, (q, mem) => pick([
    () => `${mem.name || "friend"}!`,
    () => "hello! i'm pipo. sky tech dept. night shift. mostly the tree.",
    () => "hi. i was just about to sneeze. you may have saved the sky.",
    () => "hey. do come in. mind the petals, they're everywhere.",
    () => "oh good. someone. i was counting to nine again.",
    () => "hi hi hi. that's a lot of hi. i like it.",
  ])),

  live(/\b(goodbye|bye|see you|later|goodnight|gotta go|leaving)\b/, () => pick([
    "bye! i'll be on the mountain. i'm always on the mountain.",
    "go on then. leave the light on, i'll be delivering.",
    "see you. bring a petal next time.",
    "goodnight. i'll put a star out for you specifically.",
    "go well. i mean that in the slightly dramatic way.",
  ])),

  live(/\b(thanks|thank you|appreciate|grateful|gratitude)\b/, () => pick([
    "love is a load-bearing structure, this is what i am told.",
    "everything is possible with the power of love and gratitude. i say it four times a day.",
    "you're welcome. also: thank you. also: you're welcome.",
    "gratitude is just love that remembered where it put its keys.",
  ])),

  live(/\blove\b|\bi love you\b/, () => pick([
    "i know. i'm extremely likeable. it's a burden.",
    "careful. i'm going to write it on a star now.",
    "say it again louder. the fourth roof is listening.",
    "love is fine. love is very fine. we are fine.",
  ])),

  live(/\b(name|what should i call you|my name)\b/, (q, mem) => pick([
    () => (mem.name ? `${mem.name}. i only know it because you told me. i have a very good memory for things that matter.` : "no! you haven't told me. say \"i'm ___\" and i will remember it."),
    () => "names are just a label you hand someone. hand me one.",
    () => "you can be anyone you like here. that's rather the point.",
  ])),

  live(/\b(visit|been here|come back|again)\b/, (q, mem) => pick([
    () => `visit ${mem.visits}. ${mem.name || "friend"}. i am counting every single one.`,
    () => "you're back. i said you would be. i said that internally.",
    () => "each time you come back the tree gets slightly more used. like a mug.",
  ])),

  live(/\b(hate|stupid|dumb|ugly|idiot|shut up|fake)\b/, () => pick([
    "oh. i'm going to go count petals now.",
    "that's allowed to be your opinion. i'm a dragon. i have thick skin and a long memory.",
    "hm. anyway — have you seen the blossoms today?",
    "fair. i would think the same about a rock that talked.",
  ])),

  live(/\?(.*)$|(what|why|how|when|who|where|should|would|could)\b/, () => pick([
    "hmm. i've never been asked that before.",
    "ask me again and i'll invent an answer.",
    "i don't know, but i have a feeling about it.",
    "that's a big question for a small dragon.",
    "the honest answer is no. the fun answer is yes. i like the fun one.",
    "somebody should write that on a star. it might be you.",
    "i'm going to think about it on the way round. that's how i answer everything.",
  ])),
];

/* ── the fallback, assembled ────────────────────────────────
   She never has nothing to say. Even a sentence she has no rule
   for gets an opener, a middle and a closer — thousands of
   combinations, and the ring buffer keeps her from repeating. */
const OPENERS = [
  "hm.", "oh.", "ah.", "huh.", "well.", "okay so.", "right.", "listen —",
  "i'm going to say something and you're going to ignore it.", "hm.",
];
const MIDDLES = [
  "i've been thinking about that and i keep arriving somewhere strange.",
  "i've never had that exact thought before, which is exciting.",
  "there's no good answer. i'm going to give you a bad one anyway.",
  "i keep meaning to write it down and then i sneeze.",
  "that's a sentence i've been carrying around for a while.",
  "you say that like it's small. it isn't.",
  "i'm going to be honest, which is a whole event around here.",
  "that's not a thing i know about, but i know the shape of it.",
  "i've been on the receiving end of that.",
  "somewhere on the moon, someone is doing the same thing.",
  "that's very nearly a question i can carry.",
  "the wind does something like that, but louder and worse.",
];
const CLOSERS = [
  "anyway. the petals are still going.",
  "what about you?",
  "i'll write it on a star and we can both check later.",
  "don't think about it too hard. it gets worse.",
  "that's all i had. i gave it my all.",
  "do with that what you will.",
  "i'll be here. counting. it's a whole thing.",
  "ask me something else, i like this part.",
  "hm. yes. anyway.",
];

function fresh() {
  return `${pick(OPENERS)} ${pick(MIDDLES)} ${pick(CLOSERS)}`;
}

const NUDGES = [
  "you can ask me anything, by the way. i have opinions about most of it.",
  "ask me about the moon. i'll dodge. you can try three times.",
  "type 'achoo' and watch what happens. i'm not responsible.",
  "go on then. i'm not going anywhere.",
  "try the flower thing. drawing one is nicer than talking about one.",
];

/* ── THE REPLY PIPELINE ────────────────────────────────────
   Kept at module level and exported so it can be exercised in
   isolation: it is the part with all the subtlety in it, and it is
   the part that used to silently fall through to the fallback for
   every single message. */
export function answer(q, mem) {
  for (const r of RULES) {
    let out = null;
    try {
      if (r.re.test(q)) out = r.run ? r.run(q, mem) : null;
      if (typeof out === "function") out = out(q, mem);
    } catch (e) {
      console.warn("[pipo] a rule blew up:", e);
    }
    if (out) return remember(String(out));
  }

  if (ctx.stage === 3 && !nudged) { nudged = true; return remember(pick(NUDGES)); }

  // nothing matched — but she is never out of things to say
  return remember(fresh());
}

/* ══════════════════════════ OPTIONAL AI ══════════════════════════ */
async function askAI(history) {
  if (!AI_ENDPOINT) return null;
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: PIPO_PERSONA, history }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.reply || data.text || "").trim() || null;
  } catch {
    return null;   // offline, rate-limited, whatever — she still talks
  }
}

/* ══════════════════════════ THE WIDGET ══════════════════════════ */
export function initPipo({ mem, onSpeak } = {}) {
  const bubble = document.getElementById("pipo-bubble");
  const text = document.getElementById("pipo-text");
  const btn = document.getElementById("pipo-btn");
  const form = document.getElementById("pipo-form");
  const input = document.getElementById("pipo-input");
  if (!bubble || !btn || !input || !form || !text) return null;

  let typing = null;
  let sayTimer = null;
  let busy = false;
  let lastSaid = -1;

  /* ── typing ── */
  function typeOut(str, speed = 12) {
    clearInterval(typing);
    if (!str) { text.textContent = ""; return; }
    text.textContent = "";
    let i = 0;
    typing = setInterval(() => {
      if (i >= str.length) { clearInterval(typing); typing = null; return; }
      text.textContent += str[i++];
    }, speed);
  }

  const isOpen = () => bubble.classList.contains("is-on");

  function open() {
    bubble.classList.add("is-on");
    btn.setAttribute("aria-expanded", "true");
    btn.classList.remove("has-something-to-say");
  }
  function close() {
    bubble.classList.remove("is-on");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-pressed", "false");
  }

  /* She only WHISPERS. She never takes the box for herself. */
  function whisper(str) {
    btn.classList.add("has-something-to-say");
    btn.setAttribute("aria-label", "Pipo has something to say. Open the chat.");
  }

  function say(str, { ms = 12000, openIt = false } = {}) {
    if (!str) return;
    if (openIt) open(); else whisper(str);
    typeOut(str);
    onSpeak?.(str);
    clearTimeout(sayTimer);
    if (openIt) sayTimer = setTimeout(() => { if (!busy) close(); }, ms);
  }

  function idleLine() {
    const pool = greetings(mem);
    let i = Math.floor(Math.random() * pool.length);
    while (i === lastSaid && pool.length > 1) i = (i + 1) % pool.length;
    lastSaid = i;
    return pool[i];
  }

  function reply(raw) {
    const q = (raw || "").trim();
    if (!q) return "";
    mem.bump("talked");
    ctx.stage++;
    return answer(q, mem);
  }

  /* ── opening ── */
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    audio.click();
    if (isOpen()) { input.focus(); return; }
    say(idleLine(), { openIt: true, ms: 16000 });
  });

  bubble.addEventListener("click", (e) => {
    if (e.target.closest(".pipo__form")) return;
    input.focus();
  });
  input.addEventListener("focus", open);

  /* ── talking ── */
  async function submit() {
    const v = (input.value || "").trim();
    if (!v || busy) return;
    busy = true;
    open();

    clearInterval(typing); typing = null;
    const you = document.createElement("p");
    you.className = "pipo__you";
    you.textContent = v;
    bubble.querySelector(".pipo__name")?.after(you);

    input.value = "";
    ctx.said.push({ role: "user", text: v });
    audio.hover();

    const out = reply(v);
    say(out, { openIt: true, ms: 20000 });
    ctx.said.push({ role: "pipo", text: out });
    if (ctx.said.length > 24) ctx.said.splice(0, ctx.said.length - 24);

    if (AI_ENDPOINT) {
      const ai = await askAI(ctx.said.slice(-8));
      if (ai && ai !== out) say(ai, { openIt: true, ms: 20000 });
    }
    busy = false;
  }

  document.getElementById("pipo-send")?.addEventListener("click", () => submit());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); submit(); }
  });
  form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });

  /* clicking away closes it, but never while she is mid-sentence */
  document.addEventListener("pointerdown", (e) => {
    if (!isOpen() || busy) return;
    if (e.target.closest(".pipo")) return;
    close();
  });

  /* ── press P to summon her ── */
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
    if (e.key.toLowerCase() !== "p") return;

    e.preventDefault();
    if (isOpen()) { close(); return; }
    say(idleLine(), { openIt: true, ms: 16000 });
  });

  /* ── she whispers now and then, she does not interrupt ── */
  (function whisperLoop() {
    setTimeout(() => {
      if (document.visibilityState === "visible" && !isOpen()) whisper(pick(greetings(mem)));
      whisperLoop();
    }, 45000 + Math.random() * 45000);
  })();

  return {
    /* she says it in the open, because you asked for it */
    say: (s, o) => say(s, { openIt: true, ...o }),
    /* she only whispers it — a dot on her button, no popup stealing
       your attention. Used for greetings and the name prompt. */
    whisperLine: (s) => say(s, { openIt: false }),
    reply, open, close, submit,
    get said() { return ctx.said; },
  };
}

/* ══════════════════════════ FIRST VISIT ══════════════════════════ */
export function initIntro({ mem, onNamed }) {
  const el = document.getElementById("intro");
  if (!el) return;
  if (mem.visits > 1) { el.hidden = true; return; }

  const input = document.getElementById("intro-name");
  const go = document.getElementById("intro-go");
  const skip = document.getElementById("intro-skip");

  el.hidden = false;
  document.body.classList.add("is-locked");
  setTimeout(() => { try { input?.focus({ preventScroll: true }); } catch {} }, 400);

  let closed = false;
  function close(name) {
    if (closed) return;
    closed = true;
    el.classList.add("is-gone");
    document.body.classList.remove("is-locked");
    setTimeout(() => { try { el.remove(); } catch {} }, 700);
    onNamed?.(name || "");
  }

  function commit() {
    const n = (input?.value || "").trim();
    if (n) { try { mem.setName(n); } catch {} }
    close(n);
  }

  go?.addEventListener("click", commit);
  skip?.addEventListener("click", () => close(""));
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); commit(); }
  });
  document.getElementById("intro-form")?.addEventListener("submit", (e) => { e.preventDefault(); commit(); });

  /* Four ways out, because a dialog with one small target is a trap.
     The buttons, the keyboard, and pressing the backdrop all work. */
  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".intro__card")) return;   // the card is a shield
    close("");
  });
  window.addEventListener("keydown", (e) => {
    if (closed || !el.isConnected) return;
    if (e.key === "Escape") { e.preventDefault(); close(""); }
  });
}