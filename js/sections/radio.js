/* ══════════════════════════════════════════════════════════════
   PIPO — sections/radio.js   (Project P/02)
   The Mood Radio. You pick a mood, Pipo writes a track from
   scratch in front of you. Five moods, five completely different
   synthesisers. No samples, no files, no loops.
   ══════════════════════════════════════════════════════════════ */

import { audio } from "../audio.js";

/* Each mood is a whole little instrument: a scale, a tempo, a
   timbre, and how much percussion is in the mix. */
export const MOODS = [
  {
    id: "joyful", emoji: "🌞", label: "joyful", freq: "94.7",
    note: "bright, fast, slightly ridiculous",
    root: 392.00, scale: [0, 2, 4, 7, 9], beat: 210, type: "triangle",
    gain: 0.15, octave: 1, drum: "kick", cut: 5200, wet: 0.22,
  },
  {
    id: "calm", emoji: "🌊", label: "calm", freq: "88.0",
    note: "wide, slow, like water on stone",
    root: 261.63, scale: [0, 2, 4, 6, 7, 9, 11], beat: 640, type: "sine",
    gain: 0.14, octave: 0, drum: null, cut: 2600, wet: 0.5,
  },
  {
    id: "brave", emoji: "🔥", label: "brave", freq: "101.3",
    note: "steady pulse. do the thing anyway.",
    root: 329.63, scale: [0, 3, 5, 7, 10], beat: 260, type: "sawtooth",
    gain: 0.11, octave: 0, drum: "kickhat", cut: 3400, wet: 0.16,
  },
  {
    id: "tender", emoji: "🌧️", label: "tender", freq: "90.1",
    note: "it is allowed to be a bit sad",
    root: 220.00, scale: [0, 2, 3, 7, 8, 11], beat: 820, type: "triangle",
    gain: 0.16, octave: 0, drum: null, cut: 2000, wet: 0.58,
  },
  {
    id: "sleepy", emoji: "🌙", label: "sleepy", freq: "86.3",
    note: "good for lying down",
    root: 174.61, scale: [0, 3, 5, 7, 10], beat: 1150, type: "sine",
    gain: 0.17, octave: 0, drum: null, cut: 1100, wet: 0.68,
  },
];

export function initMoodRadio() {
  const wrap = document.getElementById("radio-moods");
  const play = document.getElementById("radio-play");
  const now = document.getElementById("radio-now");
  const freq = document.getElementById("radio-freq");
  const meters = document.querySelector(".radio__meters");
  if (!wrap || !play) return;

  let mood = MOODS[0];
  let running = false;
  let timer = null;
  let step = 0;
  let out = null;        // mood-specific output chain
  let meterRAF = 0;

  /* ── build the mood cards ─────────────────────────────────── */
  MOODS.forEach((m, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mood" + (i === 0 ? " is-on" : "");
    b.innerHTML = `<span aria-hidden="true">${m.emoji}</span><b>${m.label}</b><i>${m.note}</i>`;
    b.addEventListener("click", () => {
      mood = m;
      wrap.querySelectorAll(".mood").forEach((x) => x.classList.remove("is-on"));
      b.classList.add("is-on");
      freq.innerHTML = `${m.freq} <span>FM</span>`;
      now.textContent = running ? `now: ${m.label}` : `${m.note} — hit tune it in`;
      if (running) { stop(); start(); }
      audio.hover();
    });
    wrap.appendChild(b);
  });

  /* ── the instrument ───────────────────────────────────────── */
  function chain() {
    audio.init();
    if (!audio.ready) return null;
    const ctx = audio.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = mood.cut;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.value = mood.gain;

    filter.connect(gain);
    // its own bus, so the background score can be eased out of the way
    gain.connect(audio.radio);
    gain.connect(audio.verb);

    return { ctx, filter, gain };
  }

  function note(semi, when, dur, vol = 1) {
    if (!out) return;
    const { ctx, filter } = out;
    const f = mood.root * Math.pow(2, (semi + mood.octave * 12) / 12);

    const osc = ctx.createOscillator();
    osc.type = mood.type;
    osc.frequency.value = f;
    osc.detune.value = (Math.random() - 0.5) * 6;

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = f * 2;
    const subG = ctx.createGain();
    subG.gain.value = 0.18 * vol;

    const g = ctx.createGain();
    const t0 = ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(mood.gain * vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(filter);
    sub.connect(subG).connect(filter);
    filter.connect(g);
    g.connect(audio.radio);

    osc.start(t0); sub.start(t0);
    osc.stop(t0 + dur + 0.05); sub.stop(t0 + dur + 0.05);
  }

  function drum(kind, when) {
    if (!out) return;
    const { ctx } = out;
    const t0 = ctx.currentTime + when;

    if (kind === "kick") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(150, t0);
      o.frequency.exponentialRampToValueAtTime(48, t0 + 0.12);
      g.gain.setValueAtTime(0.22, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.connect(g).connect(audio.radio);
      o.start(t0); o.stop(t0 + 0.22);
    } else if (kind === "hat") {
      const len = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.value = 0.07;
      s.connect(hp).connect(g).connect(audio.radio);
      s.start(t0);
    }
  }

  /* ── THE ARRANGEMENT ──────────────────────────────────────
     The old version picked a random scale note on a random octave
     every tick, which is why it sounded like a broken toy rather
     than a song. Each station now has a real 16-step bar: a chord
     that turns over every two bars, a bassline that follows it, and
     a melody that walks the chord tones. It loops forever and never
     plays the same bar twice in a row. */
  const PROG = [
    [0, 4, 7],    // I
    [0, 4, 7],    // I
    [-3, 0, 4],   // vi
    [-5, -1, 2],  // IV
    [-7, -3, 0],  // V
    [-3, 0, 4],   // vi
    [-5, -1, 2],  // IV
    [0, 3, 7],    // V
  ];
  const PATTERNS = {
    //        x = play, o = accent, . = rest, - = hold
    joyful: { kick: "o..o..o...o..o.", hat: "..o...o...o...o.", lead: "x-x-x-x-x-x-x-x-", bass: "o.......o......." },
    calm:   { kick: "o.......o.......", hat: "................", lead: "x..x..x...x..x..", bass: "o.......x......." },
    brave:  { kick: "o...o...o...o...", hat: "..o...o...o...o.", lead: "x-x-x-x-x-x-x-x-", bass: "o...o...o...o..." },
    tender: { kick: "o.......o.......", hat: "........o.......", lead: "x.....x.x.....x.", bass: "o..............." },
    sleepy: { kick: "o...............", hat: "................", lead: "x......x...x....", bass: "o..............." },
  };

  function tick() {
    if (!running) return;
    const sc = mood.scale;
    const pat = PATTERNS[mood.id] || PATTERNS.joyful;
    const i = step % 16;
    const bar = Math.floor(step / 16);
    const chord = PROG[bar % PROG.length];
    const beatMs = mood.beat;
    const dur = (beatMs / 1000) * 0.95;

    // chord tones, voiced up an octave, are always safe to play
    const tone = (n) => sc[((n % sc.length) + sc.length) % sc.length] + 12 * Math.floor(n / sc.length);

    if (pat.kick[i] === "o") drum("kick", 0);
    else if (pat.kick[i] === "x") drum("kick", 0);
    if (pat.hat[i] === "x" || pat.hat[i] === "o") drum("hat", 0);

    if (pat.lead[i] === "x") {
      // walk the chord, mostly stepwise
      const deg = chord[i % chord.length] + (Math.random() < 0.4 ? tone(2) : 0);
      note(deg, 0, dur * 1.6, 1);
    }
    if (pat.bass[i] === "o" || pat.bass[i] === "x") {
      note(chord[0] - 12, 0, dur * 1.8, 1.3);
    }
    // a soft chord stab on the first beat of every other bar
    if (i === 0 && bar % 2 === 1) {
      chord.forEach((c, k) => note(c, k * 0.03, dur * 2.6, 0.4));
    }

    step++;
    timer = setTimeout(tick, beatMs);
  }

  function start() {
    audio.resume();
    if (!audio.ready) return;
    out = chain();
    if (!out) return;
    running = true;
    step = 0;
    // make room: the background score steps back while the radio plays
    audio.duckFor(999);
    play.setAttribute("aria-pressed", "true");
    play.lastChild.textContent = " change the station";
    now.textContent = `now: ${mood.label} · ${mood.freq} fm`;
    meters?.classList.add("is-live");
    tick();
    startMeters();
  }

  function stop() {
    running = false;
    clearTimeout(timer);
    play.setAttribute("aria-pressed", "false");
    play.lastChild.textContent = " tune it in";
    now.textContent = `${mood.note} — hit tune it in`;
    meters?.classList.remove("is-live");
    cancelAnimationFrame(meterRAF);
    if (meters) meters.querySelectorAll("i").forEach((i) => (i.style.height = "14%"));
    if (out) { try { out.gain.gain.setTargetAtTime(0.0001, out.ctx.currentTime, 0.08); } catch {} }
    out = null;
    // let the background score back in
    audio.duckFor(0);
  }

  /* the VU meters bounce off whatever is playing */
  function startMeters() {
    const bars = meters ? [...meters.querySelectorAll("i")] : [];
    cancelAnimationFrame(meterRAF);
    const loop = () => {
      if (!running) return;
      bars.forEach((b, i) => {
        const v = Math.random() * (out ? out.gain.gain.value : 0.2) * 2200 + 12;
        b.style.height = Math.min(100, 14 + v * (0.4 + 0.6 * Math.sin(i * 0.6 + performance.now() / 220))) + "%";
      });
      meterRAF = requestAnimationFrame(loop);
    };
    loop();
  }

  play.addEventListener("click", () => (running ? stop() : start()));

  // silence when the section scrolls away
  const sec = document.getElementById("radio");
  if (sec && "IntersectionObserver" in window) {
    new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting && running) stop(); }), { threshold: 0.05 })
      .observe(sec);
  }

  return { start, stop, get running() { return running; }, MOODS };
}