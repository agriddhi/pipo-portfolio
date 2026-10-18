/* ══════════════════════════════════════════════════════════════
   PIPO — audio.js
   Every sound on this site is synthesised live. No audio files.

   THREE BUSES, so nothing ever fights anything else:

       master ──▶ [compressor] ──▶ speakers
         ├── sfx     : clicks, chimes, sneezes        (loud-ish)
         ├── music   : the background score           (quiet)
         └── radio   : the Mood Radio                 (ducked down
                                                          when the
                                                          score plays)

   · clickChime()   – soft wooden marimba blip on every click
   · score          – a light, playful generative piece, see below
   · sparkle()      – star chime for easter eggs
   · swoop()        – wing whoosh
   Mute is wired to the HUD switch and to localStorage.
   ══════════════════════════════════════════════════════════════ */

const STORE_KEY = "pipo.sound";

export const audio = {
  ctx: null,
  master: null,
  sfx: null,
  music: null,
  radio: null,
  muted: false,
  ready: false,

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;

    // gentle bus compression so nothing ever spikes
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;

    this.master.connect(comp).connect(this.ctx.destination);

    const bus = (v) => {
      const g = this.ctx.createGain();
      g.gain.value = v;
      g.connect(this.master);
      return g;
    };
    this.sfx = bus(1);
    this.music = bus(0.34);   // background: present, never the main event
    this.radio = bus(0.9);

    // a shared plate-ish reverb from noise, cheap and warm
    this.verb = this.ctx.createConvolver();
    this.verb.buffer = this._impulse(2.6, 2.4);
    this.verbGain = this.ctx.createGain();
    this.verbGain.gain.value = 0.32;
    this.verb.connect(this.verbGain).connect(this.master);

    this.ready = true;
  },

  /* The Mood Radio gets the room to itself. The score eases out of the
     way, then comes back when the radio stops. This is the whole
     reason the two never clash. */
  duckFor(seconds = 2.5) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.radio.gain.cancelScheduledValues(t);
    this.radio.gain.setTargetAtTime(1.0, t, 0.05);
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setTargetAtTime(0.09, t, 0.25);   // nearly silent
    clearTimeout(this._unduck);
    this._unduck = setTimeout(() => {
      if (!this.ready) return;
      const n = this.ctx.currentTime;
      this.music.gain.cancelScheduledValues(n);
      this.music.gain.setTargetAtTime(this.musicTarget ?? 0.34, n, 0.9);
      this.radio.gain.cancelScheduledValues(n);
      this.radio.gain.setTargetAtTime(0.9, n, 0.5);
    }, seconds * 1000);
  },

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },

  _impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * seconds));
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  },

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem(STORE_KEY, m ? "off" : "on"); } catch {}
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(m ? 0 : 0.9, t, 0.05);
    // a muted site must be a silent site — no lingering hum
    if (m) { this.score?.stop(); }
  },

  loadPref() {
    try {
      const v = localStorage.getItem(STORE_KEY);
      if (v !== null) this.muted = v === "off";
    } catch {}
  },

  /* ── one shaped voice: a marimba / music-box tone ─────────────
     `bus` chooses which of the three buses it lands on. */
  _voice(freq, { when = 0, dur = 1.1, gain = 0.22, type = "triangle", detune = 0, bus = "sfx" } = {}) {
    if (!this.ready || this.muted) return;
    const dest = this[bus] || this.sfx;
    const t0 = this.ctx.currentTime + when;

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    // the "wooden" partial an octave up that makes it read as a music box
    const ping = this.ctx.createOscillator();
    ping.type = "sine";
    ping.frequency.value = freq * 4.02;

    const g = this.ctx.createGain();
    const pg = this.ctx.createGain();
    pg.gain.value = 0.16;

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    pg.gain.setValueAtTime(0.0001, t0);
    pg.gain.exponentialRampToValueAtTime(gain * 0.16, t0 + 0.006);
    pg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.35);

    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4200;

    osc.connect(lp);
    ping.connect(pg).connect(lp);
    lp.connect(g);
    g.connect(dest);
    g.connect(this.verb);

    osc.start(t0); ping.start(t0);
    osc.stop(t0 + dur + 0.05); ping.stop(t0 + dur + 0.05);
  },

  /* a soft rounded thump for the score's pulse */
  _thump(freq = 90, { when = 0, gain = 0.2, dur = 0.36 } = {}) {
    if (!this.ready || this.muted) return;
    const dest = this.music || this.sfx;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * 1.7, t0);
    o.frequency.exponentialRampToValueAtTime(freq, t0 + dur * 0.7);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },

  /* ── UI sounds ─────────────────────────────────────────────── */
  click() {
    if (!this.ready || this.muted) return;
    // pentatonic ladder so rapid clicks sound like a melody, not noise
    const scale = [0, 2, 4, 7, 9, 12, 16];
    const semi = scale[Math.floor(Math.random() * scale.length)];
    this._voice(523.25 * Math.pow(2, semi / 12), { dur: 0.55, gain: 0.16 });
  },

  hover() {
    if (!this.ready || this.muted) return;
    this._voice(1567.98, { dur: 0.22, gain: 0.045, type: "sine" });
  },

  sparkle() {
    if (!this.ready || this.muted) return;
    [0, 4, 7, 12, 16, 19].forEach((s, i) =>
      this._voice(1046.5 * Math.pow(2, s / 12), { when: i * 0.055, dur: 1.2, gain: 0.13 })
    );
  },

  swoop() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 3.5;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    src.connect(bp).connect(g).connect(this.sfx);
    src.start(t);
  },

  /* her one flaw. every sneeze is a small weather event. */
  sneeze() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    // the "ach"
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.22), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const k = i / d.length;
      d[i] = (Math.random() * 2 - 1) * Math.sin(k * Math.PI) * (1 - k * 0.5);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(280, t + 0.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    src.connect(bp).connect(g).connect(this.sfx);
    src.start(t);

    // the tiny offended "hmp"
    setTimeout(() => {
      const o = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(320, this.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(190, this.ctx.currentTime + 0.18);
      og.gain.setValueAtTime(0.1, this.ctx.currentTime);
      og.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.2);
      o.connect(og).connect(this.sfx);
      o.start(); o.stop(this.ctx.currentTime + 0.22);
    }, 120);
  },
};

/* ══════════════════════════════════════════════════════════════
   THE SCORE — a light, playful generative piece

   This used to be a slow lullaby called `hush`, and it was never
   wired to anything at all, which is why the site had no music.
   It is now an actual piece of background music: a soft pulse, a
   walking bass, a wandering melody and a sparkle on top, all in
   major pentatonic so it never sounds sour.

   It lives on the `music` bus at low volume, and when the Mood Radio
   starts up, audio.duckFor() eases this almost to nothing so the two
   can never talk over each other.

   "night depth" (driven by the sky, 0 = day, 1 = night) thickens and
   darkens it without ever going anywhere unpleasant.
   ══════════════════════════════════════════════════════════════ */

const PENT = [0, 2, 4, 7, 9, 12, 14];   // major pentatonic, one octave up
const ROOT = 261.63;                      // C4

class Score {
  constructor() {
    this.timer = null;
    this.step = 0;
    this.depth = 0.4;
    this.running = false;
    this.bpm = 104;
    this.onChange = null;
    this._chord = 0;
  }

  setDepth(v) { this.depth = Math.max(0, Math.min(1, v / 100)); }

  /* the four chords she cycles through: C  Am  F  G */
  _chords() {
    return [
      { root: 0,  notes: [0, 4, 7] },      // C
      { root: -3, notes: [0, 3, 7] },      // Am
      { root: -7, notes: [0, 4, 7] },      // F
      { root: -5, notes: [0, 4, 7] },      // G
    ];
  }

  _semi(i) { return PENT[i % PENT.length] + 12 * Math.floor(i / PENT.length); }

  _tick() {
    if (!this.running) return;
    const d = this.depth;
    const chords = this._chords();
    const ch = chords[this._chord % chords.length];
    const beat = (60 / this.bpm) * 1000;     // ms per eighth note
    const s = this.step;

    /* ── the pulse: a soft thump on 1 and 3, lighter on the offbeats ── */
    if (s % 4 === 0) audio._thump(78, { gain: 0.22 - d * 0.06 });
    else if (s % 4 === 2) audio._thump(72, { gain: 0.13 });
    if (d < 0.6 && s % 4 === 3) audio._thump(200, { gain: 0.035, dur: 0.14 });

    /* ── the bass: a walk, one note per beat ── */
    if (s % 2 === 0) {
      const b = ch.root + (Math.random() < 0.3 ? 7 : 0);
      audio._voice((ROOT / 2) * Math.pow(2, b / 12), {
        dur: 1.1, gain: 0.10, type: "sine", bus: "music",
      });
    }

    /* ── the melody: mostly stepwise, with the odd leap, never twice
          in a row ── */
    if (Math.random() < 0.82) {
      let step = Math.random() < 0.62 ? this._last + (Math.random() < 0.5 ? 1 : -1) : (Math.random() * 7 | 0);
      step = Math.max(0, Math.min(11, step));
      this._last = step;
      const note = ch.notes[0] + this._semi(step) + (d > 0.7 ? -12 : 0);
      audio._voice(ROOT * Math.pow(2, note / 12), {
        dur: 0.55 + Math.random() * 0.4,
        gain: 0.115 - d * 0.02,
        type: "triangle",
        detune: (Math.random() - 0.5) * 8,
        bus: "music",
      });
    }

    /* ── a shimmer on the offbeat, thinning out at night ── */
    if (s % 2 === 1 && Math.random() < 0.34 - d * 0.2) {
      audio._voice(ROOT * 4 * Math.pow(2, this._semi(Math.random() * 5 | 0) / 12), {
        dur: 0.7, gain: 0.028, type: "sine", bus: "music",
      });
    }

    this.step++;
    if (this.step % 8 === 0) this._chord++;   // one chord per bar
    // a lazy tempo drift so it never sounds like a metronome
    this.timer = setTimeout(() => this._tick(), beat * (0.94 + Math.random() * 0.12));
  }

  start() {
    audio.resume();
    if (this.running) return;
    if (audio.muted) return;
    audio.musicTarget = 0.34;
    this.running = true;
    this._last = 3;
    this._tick();
    this.onChange?.(true);
  }

  stop() {
    this.running = false;
    clearTimeout(this.timer);
    this.timer = null;
    this.onChange?.(false);
  }
}

export const score = new Score();
/* the old name, kept so nothing that imported it breaks */
export const hush = score;