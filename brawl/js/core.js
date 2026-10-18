'use strict';
/* =====================================================================
   小夥伴大作戰 Buddy Battle — a Little Fighter 2 style brawler in one file.
   World: x = left/right, z = depth (0 back .. FLOOR_D front), y = height.
   Simulation runs at a fixed 60 steps per second. Every fighter (player
   or CPU) is driven by a controller that fills the same Input object,
   so more human players can be added later by giving them controllers.
   ===================================================================== */
const VH = 540, FLOOR_TOP = 330, FLOOR_D = 160, GRAV = 0.5;
const INK = '#1c1a2e';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const sgn = v => v < 0 ? -1 : 1;
const store = {
  get(k, d) { try { const v = localStorage.getItem('buddybattle.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('buddybattle.' + k, JSON.stringify(v)); } catch (e) {} }
};

/* ------------------------------ audio ------------------------------ */
const Sound = {
  ac: null, master: null, muted: store.get('muted', false), music: null, noiseBuf: null,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ac = new AC(); this.master = this.ac.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = this.ac.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4; this.master.connect(comp); comp.connect(this.ac.destination);
    this.mus = this.ac.createGain(); this.mus.gain.value = 0.55; this.mus.connect(this.master);
    const n = this.ac.sampleRate; this.noiseBuf = this.ac.createBuffer(1, n, n); const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  },
  setMuted(m) { this.muted = m; store.set('muted', m); if (this.master) this.master.gain.value = m ? 0 : 0.8; },
  noise(t, dur, f0, f1, q, vol, type = 'bandpass', out) {
    const a = this.ac, s = a.createBufferSource(); s.buffer = this.noiseBuf;
    const f = a.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(out || this.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  tone(t, dur, f0, f1, vol, type = 'sine', out) {
    const a = this.ac, o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out || this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  play(name, vol = 1) {
    if (!this.ac || this.muted) return; const t = this.ac.currentTime;
    switch (name) {
      case 'hit': this.noise(t, 0.035, 3200, 1400, 1, 0.5 * vol); this.tone(t, 0.12, 230, 70, 0.6 * vol); this.tone(t, 0.05, 900, 320, 0.16 * vol, 'triangle'); break;
      case 'heavy': this.noise(t, 0.06, 2600, 800, 0.8, 0.55 * vol); this.tone(t, 0.3, 150, 38, 0.95 * vol); this.noise(t, 0.28, 900, 110, 0.7, 0.4 * vol, 'lowpass'); this.tone(t, 0.08, 620, 160, 0.18 * vol, 'square'); break;
      case 'whiff': this.noise(t, 0.13, 500, 2600, 1.2, 0.15 * vol); break;
      case 'block': this.tone(t, 0.09, 1250, 1200, 0.09 * vol, 'square'); this.tone(t, 0.07, 1830, 1790, 0.07 * vol, 'square'); this.noise(t, 0.04, 6000, 4000, 1.5, 0.22 * vol); break;
      case 'gong': this.drum('gong', t, vol, this.master); break;
      case 'jump': this.tone(t, 0.12, 260, 520, 0.12 * vol, 'triangle'); break;
      case 'land': this.noise(t, 0.08, 400, 120, 0.8, 0.25 * vol, 'lowpass'); break;
      case 'fall': this.noise(t, 0.22, 600, 90, 0.6, 0.5 * vol, 'lowpass'); this.tone(t, 0.2, 90, 40, 0.6 * vol); break;
      case 'fire': this.noise(t, 0.45, 300, 1800, 0.6, 0.35 * vol); this.tone(t, 0.3, 140, 70, 0.25 * vol, 'sawtooth'); break;
      case 'ice': [1320, 1760, 2349].forEach((f, i) => this.tone(t + i * 0.04, 0.25, f, f * 0.98, 0.08 * vol, 'triangle')); this.noise(t, 0.3, 6000, 3000, 2, 0.12 * vol); break;
      case 'shatter': this.noise(t, 0.3, 7000, 2500, 1.2, 0.35 * vol, 'highpass'); [2600, 3100].forEach((f, i) => this.tone(t + i * 0.03, 0.15, f, f * 0.8, 0.06 * vol, 'square')); break;
      case 'star': this.noise(t, 0.12, 5000, 2500, 3, 0.15 * vol); break;
      case 'slash': this.noise(t, 0.16, 1200, 5000, 2, 0.3 * vol); break;
      case 'quake': this.noise(t, 0.6, 300, 50, 0.5, 0.8 * vol, 'lowpass'); this.tone(t, 0.5, 70, 30, 0.9 * vol); break;
      case 'power': this.tone(t, 0.35, 200, 800, 0.15 * vol, 'sawtooth'); this.tone(t + 0.05, 0.3, 300, 1200, 0.1 * vol, 'triangle'); break;
      case 'pick': this.tone(t, 0.08, 600, 900, 0.15 * vol, 'triangle'); break;
      case 'pop': this.noise(t, 0.06, 3000, 900, 0.7, 0.45 * vol); this.tone(t, 0.04, 900, 200, 0.2 * vol, 'square'); break;
      case 'drum': this.tone(t, 0.18, 110, 70, 0.7 * vol, 'sine'); this.noise(t, 0.05, 900, 300, 0.7, 0.2 * vol, 'lowpass'); break;
      case 'roar': this.noise(t, 0.9, 300, 120, 0.6, 0.6 * vol, 'lowpass'); this.tone(t, 0.8, 110, 70, 0.4 * vol, 'sawtooth'); this.tone(t, 0.8, 165, 100, 0.2 * vol, 'sawtooth'); break;
      case 'zap': this.noise(t, 0.12, 6000, 2000, 2, 0.25 * vol, 'highpass'); this.tone(t, 0.1, 1800, 600, 0.08 * vol, 'square'); break;
      case 'thunder': this.noise(t, 0.05, 8000, 4000, 1, 0.5 * vol, 'highpass'); this.noise(t + 0.03, 0.7, 500, 80, 0.5, 0.6 * vol, 'lowpass'); this.tone(t, 0.5, 90, 40, 0.5 * vol); break;
      case 'wind': this.noise(t, 0.6, 400, 1800, 1.5, 0.3 * vol); this.noise(t + 0.2, 0.5, 1800, 600, 1.5, 0.2 * vol); break;
      case 'woof': this.tone(t, 0.09, 520, 300, 0.25 * vol, 'sawtooth'); this.tone(t + 0.14, 0.11, 560, 320, 0.25 * vol, 'sawtooth'); break;
      case 'honk': this.tone(t, 0.18, 420, 410, 0.12 * vol, 'square'); this.tone(t + 0.22, 0.25, 420, 400, 0.12 * vol, 'square'); this.tone(t, 0.18, 530, 520, 0.08 * vol, 'square'); this.tone(t + 0.22, 0.25, 530, 520, 0.08 * vol, 'square'); break;
      case 'wave': this.noise(t, 1.2, 400, 1600, 0.4, 0.3 * vol, 'lowpass'); this.noise(t + 0.3, 1.0, 2500, 800, 0.6, 0.18 * vol); break;
      case 'train': this.noise(t, 2.5, 200, 120, 0.7, 0.25 * vol, 'lowpass'); [660, 830].forEach((f, i) => this.tone(t + i * 0.35, 0.3, f, f, 0.07 * vol, 'triangle')); break;
      case 'drink': [520, 660, 780, 1040].forEach((f, i) => this.tone(t + i * 0.07, 0.1, f, f, 0.12 * vol, 'triangle')); break;
      case 'throw': this.noise(t, 0.15, 600, 2400, 1.2, 0.2 * vol); break;
      case 'ko': this.tone(t, 0.6, 400, 60, 0.3 * vol, 'square'); break;
      case 'go': [660, 880].forEach((f, i) => this.tone(t + i * 0.1, 0.12, f, f, 0.15 * vol, 'square')); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.12, 0.25, f, f, 0.16, 'square')); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(t + i * 0.18, 0.3, f, f * 0.97, 0.16, 'triangle')); break;
      case 'poof': this.tone(t, 0.12, 500, 1400, 0.18 * vol, 'sine'); this.noise(t, 0.2, 2000, 600, 0.8, 0.15 * vol); break;
      case 'arrow': this.noise(t, 0.12, 2500, 900, 3, 0.2 * vol); this.tone(t, 0.05, 220, 180, 0.15 * vol, 'triangle'); break;
    }
  },
  /* ---------------- music: a small step sequencer with chiptune and temple-fair instruments ---------------- */
  freq(n) { const m = /^([A-G])(#?)(\d)$/.exec(n); const i = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); return 440 * Math.pow(2, (i + (+m[3] + 1) * 12 - 69) / 12); },
  pulse() {
    if (this._pulse) return this._pulse; const n = 32, re = new Float32Array(n), im = new Float32Array(n), d = 0.25;
    for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * d) * 1; // 25% pulse wave
    for (let k = 1; k < n; k++) { re[k] = im[k]; im[k] = 0; }
    return (this._pulse = this.ac.createPeriodicWave(re, im));
  },
  env(g, t, a, peak, sus, dur, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + 0.08); g.gain.setValueAtTime(Math.max(0.0001, peak * sus), t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel); },
  inst(name, t, f, dur, vol, out) {
    const a = this.ac; out = out || this.mus;
    if (name === 'pluck' || name === 'soft') {
      const o = a.createOscillator(); if (name === 'pluck') o.setPeriodicWave(this.pulse()); else o.type = 'triangle';
      o.frequency.setValueAtTime(f, t);
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      const g = a.createGain(); this.env(g, t, 0.006, vol, 0.55, dur * 0.85, 0.08);
      o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.15);
    } else if (name === 'bass') {
      const o = a.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t);
      const g = a.createGain(); this.env(g, t, 0.005, vol, 0.7, dur * 0.8, 0.05); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.1);
    } else if (name === 'suona') { // nasal reed: saw + square, band-passed, pitch scoop and delayed vibrato
      const g = a.createGain(); this.env(g, t, 0.02, vol, 0.8, dur * 0.92, 0.06);
      const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.2;
      const pk = a.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 2600; pk.gain.value = 8; pk.Q.value = 2;
      const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 5.8; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.25, dur));
      lfo.connect(lg);
      for (const [type, mul, v] of [['sawtooth', 1, 1], ['square', 1.003, 0.5]]) {
        const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f * mul * 0.95, t); o.frequency.exponentialRampToValueAtTime(f * mul, t + 0.05);
        lg.connect(o.frequency); const og = a.createGain(); og.gain.value = v; o.connect(og); og.connect(bp); o.start(t); o.stop(t + dur + 0.1);
      }
      bp.connect(pk); pk.connect(g); g.connect(out); lfo.start(t); lfo.stop(t + dur + 0.1);
    }
  },
  drum(name, t, vol, out) {
    out = out || this.mus;
    switch (name) {
      case 'kick': this.tone(t, 0.16, 150, 42, 0.9 * vol, 'sine', out); break;
      case 'snare': this.noise(t, 0.12, 2200, 1200, 0.8, 0.5 * vol, 'bandpass', out); this.tone(t, 0.06, 240, 160, 0.25 * vol, 'triangle', out); break;
      case 'hat': this.noise(t, 0.035, 9000, 8000, 1, 0.16 * vol, 'highpass', out); break;
      case 'tanggu': this.tone(t, 0.26, 115, 62, 0.9 * vol, 'sine', out); this.noise(t, 0.08, 600, 200, 0.7, 0.35 * vol, 'lowpass', out); break;   // 堂鼓
      case 'cymbal': this.noise(t, 0.4, 7000, 5000, 0.6, 0.35 * vol, 'highpass', out); this.noise(t, 0.3, 3300, 3100, 9, 0.3 * vol, 'bandpass', out); break; // 鈸
      case 'xiaoluo': this.tone(t, 0.45, 690, 880, 0.22 * vol, 'sine', out); this.tone(t, 0.3, 1310, 1650, 0.08 * vol, 'sine', out); break; // 小鑼, rising "jiang"
      case 'gong': [1, 1.48, 2.03, 2.55, 3.1, 4.2].forEach((m, i) => this.tone(t, 2.2 - i * 0.25, 98 * m, 92 * m, 0.32 * vol / (1 + i * 0.6), 'sine', out)); this.noise(t, 0.5, 700, 300, 0.8, 0.25 * vol, 'bandpass', out); break; // 大鑼
      case 'block': this.tone(t, 0.05, 1500, 1400, 0.25 * vol, 'sine', out); this.tone(t, 0.04, 2350, 2200, 0.1 * vol, 'sine', out); break; // 梆子
    }
  },
  parse(str) { // "C5 . E5 - ..." -> [{s, n, len}]
    const tok = str.trim().split(/\s+/).filter(x => x !== '|'), ev = [];
    tok.forEach((x, i) => { if (x === '-') { if (ev.length) ev[ev.length - 1].len++; } else if (x !== '.') ev.push({ s: i, n: x, len: 1 }); });
    return { ev, len: tok.length };
  },
  song(name) {
    if (!this.songs) this.songs = {};
    if (this.songs[name]) return this.songs[name];
    const S = SONGS[name], steps = S.lead.reduce((a, s) => a + this.parse(s).len, 0), lead = [];
    let off = 0; for (const s of S.lead) { const p = this.parse(s); p.ev.forEach(e => lead.push({ s: e.s + off, n: e.n, len: e.len })); off += p.len; }
    return (this.songs[name] = { ...S, steps, leadEv: lead });
  },
  startMusic(name) {
    this.stopMusic(); if (!this.ac || !SONGS[name]) return;
    const S = this.song(name), step = 60 / S.bpm / 2;
    let i = 0, next = this.ac.currentTime + 0.12; this.musicName = name;
    const tick = () => {
      if (!this.ac) return;
      while (next < this.ac.currentTime + 0.3) {
        if (!this.muted && !(running && paused)) {
          const s = i % S.steps, bar = (s >> 3), b = s % 8;
          for (const e of S.leadEv) if (e.s === s) this.inst(S.leadInst, next, this.freq(e.n), e.len * step, S.leadVol);
          if (S.bass) { const r = this.freq(S.bass[bar % S.bass.length]), pat = S.bassPat || 'R.F.R.FR'; const c = pat[b]; if (c !== '.') this.inst('bass', next, c === 'F' ? r * 1.5 : c === 'O' ? r * 2 : r, step * 0.9, S.bassVol || 0.16); }
          for (const k in S.drums) { const pat = S.drums[k]; if (pat[s % pat.length] === 'x') this.drum(k, next, (S.drumVol && S.drumVol[k]) || 0.6); }
        }
        next += step; i++;
      }
    };
    tick(); this.music = setInterval(tick, 50);
  },
  stopMusic() { if (this.music) clearInterval(this.music); this.music = null; this.musicName = null; },
  jingle(name) {
    if (!this.ac || this.muted) return; this.stopMusic(); const t = this.ac.currentTime + 0.05, out = this.master;
    if (name === 'win') { ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'].forEach((n, k) => this.inst('pluck', t + k * 0.11 + (k > 3 ? 0.08 : 0), this.freq(n), k === 5 ? 0.7 : 0.12, 0.2, out)); this.drum('gong', t + 0.62, 0.8, out); }
    else { ['G4', 'E4', 'D4', 'C4'].forEach((n, k) => this.inst('soft', t + k * 0.24, this.freq(n), k === 3 ? 0.9 : 0.22, 0.26, out)); }
  }
};

/* Songs: lead is written in eighth notes ("." rest, "-" hold); bass is one root per bar;
   drum patterns repeat (one character per eighth). */
const SONGS = {
  menu: { bpm: 108, leadInst: 'soft', leadVol: 0.2,
    lead: ['A4 . C5 D5 . C5 A4 . G4 A4 C5 . A4 G4 E4 . G4 A4 C5 D5 E5 . D5 C5 C5 - - - . . . .'],
    bass: ['F2', 'C3', 'G2', 'C3'], bassPat: 'R...F...', bassVol: 0.14, drums: { hat: '..x...x.' }, drumVol: { hat: 0.5 } },
  street: { bpm: 136, leadInst: 'pluck', leadVol: 0.13,
    lead: ['G4 . A4 C5 . A4 G4 . E4 G4 A4 . G4 E4 D4 . C4 D4 E4 G4 A4 . G4 E4 D4 - - - . . . .',
           'A4 . C5 D5 . C5 A4 . G4 A4 C5 . A4 G4 E4 . G4 A4 C5 D5 E5 . D5 C5 C5 - - - . . . .'],
    bass: ['C3', 'A2', 'F2', 'G2', 'F2', 'C3', 'G2', 'C3'],
    drums: { kick: 'x...x.x.', snare: '..x...x.', hat: '.x.x.x.x' }, drumVol: { kick: 0.7, snare: 0.55, hat: 0.6 } },
  battle: { bpm: 144, leadInst: 'pluck', leadVol: 0.13,
    lead: ['A4 . C5 A4 D5 . C5 A4 G4 . A4 . E4 . G4 . A4 . C5 D5 E5 . D5 C5 D5 . C5 . A4 - - .',
           'E5 . D5 C5 D5 . C5 A4 C5 . A4 G4 A4 - - . E4 G4 A4 C5 D5 C5 A4 G4 A4 - - - . . E5 .'],
    bass: ['A2', 'F2', 'G2', 'A2', 'C3', 'G2', 'A2', 'E2'], bassPat: 'R.RFR.RO',
    drums: { kick: 'x..x..x.', snare: '..x...x.', hat: 'xxxxxxxx' }, drumVol: { kick: 0.75, snare: 0.55, hat: 0.35 } },
  night: { bpm: 124, leadInst: 'pluck', leadVol: 0.12,   // 夜市: bouncy minor pentatonic
    lead: ['E4 . G4 A4 . G4 E4 . D4 E4 G4 . E4 D4 C4 . D4 . E4 G4 A4 C5 A4 G4 E4 - - . . . . .',
           'A4 . C5 D5 . C5 A4 . G4 A4 C5 . A4 G4 E4 . G4 A4 G4 E4 D4 E4 D4 C4 A3 - - . . . . .'],
    bass: ['A2', 'A2', 'D3', 'E2', 'F2', 'C3', 'D3', 'E2'], bassPat: 'R.FR.FR.',
    drums: { kick: 'x...x...', snare: '..x...x.', hat: '.xx.xx.x', block: 'x..x..x.' }, drumVol: { kick: 0.7, snare: 0.5, hat: 0.4, block: 0.3 } },
  mountain: { bpm: 112, leadInst: 'soft', leadVol: 0.2,   // 茶園: gentle folk tune
    lead: ['G4 A4 C5 . D5 C5 A4 . G4 A4 G4 E4 D4 - . . E4 G4 A4 . C5 A4 G4 E4 G4 - - - . . . .',
           'C5 . D5 E5 . D5 C5 A4 G4 . A4 C5 D5 - . . E5 D5 C5 A4 G4 A4 C5 D5 C5 - - - . . . .'],
    bass: ['C3', 'A2', 'G2', 'C3', 'F2', 'C3', 'G2', 'C3'], bassPat: 'R...F.R.', bassVol: 0.15,
    drums: { kick: 'x.......', hat: '..x...x.', block: '....x...' }, drumVol: { kick: 0.5, hat: 0.4, block: 0.3 } },
  harbor: { bpm: 132, leadInst: 'pluck', leadVol: 0.12,   // 漁港: sea-shanty swing
    lead: ['D4 G4 G4 A4 B4 . G4 . A4 . F#4 . D4 . . . D4 G4 G4 A4 B4 . D5 . C5 B4 A4 . G4 - - .',
           'B4 . D5 . E5 D5 B4 . A4 . B4 A4 G4 . E4 . D4 G4 B4 D5 C5 B4 A4 . G4 - - - . . . .'],
    bass: ['G2', 'D3', 'G2', 'D3', 'G2', 'E2', 'D3', 'G2'], bassPat: 'R..FR..F',
    drums: { kick: 'x..x....', snare: '....x...', hat: 'x.xx.xx.' }, drumVol: { kick: 0.65, snare: 0.5, hat: 0.35 } },
  boss2: { bpm: 158, leadInst: 'pluck', leadVol: 0.12,   // big boss fight
    lead: ['A4 A4 C5 A4 D5 C5 A4 G4 A4 . E5 . D5 C5 A4 . G4 G4 A4 G4 E4 D4 E4 G4 A4 - - - . . E5 .',
           'E5 E5 D5 C5 D5 D5 C5 A4 C5 C5 A4 G4 A4 . . . G4 A4 C5 D5 E5 D5 C5 D5 E5 - - - G5 - E5 .'],
    bass: ['A2', 'A2', 'F2', 'G2', 'A2', 'F2', 'G2', 'E2'], bassPat: 'RRFRRRFO',
    drums: { kick: 'x.x.x.x.', snare: '..x...x.', hat: 'xxxxxxxx', tanggu: 'x' + '.'.repeat(15) }, drumVol: { kick: 0.75, snare: 0.6, hat: 0.3, tanggu: 0.6 } },
  temple: { bpm: 152, leadInst: 'suona', leadVol: 0.09,   // 廟口: 嗩吶 over 鑼鼓
    lead: ['C5 D5 E5 . G5 E5 D5 C5 D5 . E5 D5 C5 A4 G4 . A4 C5 D5 . E5 . D5 C5 A4 - G4 - - . . .',
           'E5 G5 A5 . G5 E5 D5 . E5 D5 C5 . D5 C5 A4 . G4 A4 C5 D5 E5 D5 C5 A4 C5 - - - . . . .'],
    bass: ['C3', 'C3', 'A2', 'G2', 'C3', 'A2', 'G2', 'C3'], bassPat: 'R...R...', bassVol: 0.13,
    drums: { tanggu: 'x.xx.x.x', cymbal: '..x...x.', xiaoluo: '....x...', block: 'x.x.x.x.', gong: 'x' + '.'.repeat(31) },
    drumVol: { tanggu: 0.7, cymbal: 0.45, xiaoluo: 0.7, block: 0.35, gong: 0.75 } }
};

/* ------------------------------ input ------------------------------ */
/* One Input per fighter. Held values: mx, mz (-1..1), run, def.
   Edge values (true for one step): atk, jmp, defP, skill (0 none, 1..3). */
class Input {
  constructor() { this.mx = 0; this.mz = 0; this.run = false; this.def = false; this.atk = false; this.jmp = false; this.defP = false; this.skill = 0; }
  clearEdges() { this.atk = this.jmp = this.defP = false; this.skill = 0; }
}

let lastDevice = 'keyboard';
/* Keyboard sets. In one-player games everything goes to 1P (WASD or arrows).
   With two players on one keyboard, 1P has the left side and 2P the right side. */
const KEYSETS = {
  solo: { KeyA: 'L', ArrowLeft: 'L', KeyD: 'R', ArrowRight: 'R', KeyW: 'U', ArrowUp: 'U', KeyS: 'Dn', ArrowDown: 'Dn',
    KeyJ: 'A', KeyZ: 'A', KeyK: 'J', KeyX: 'J', Space: 'J', KeyL: 'F', KeyC: 'F', KeyU: 'S1', KeyI: 'S2', KeyO: 'S3', ShiftLeft: 'RUN', ShiftRight: 'RUN' },
  p1: { KeyA: 'L', KeyD: 'R', KeyW: 'U', KeyS: 'Dn', KeyJ: 'A', KeyK: 'J', Space: 'J', KeyL: 'F', KeyU: 'S1', KeyI: 'S2', KeyO: 'S3', ShiftLeft: 'RUN' },
  p2: { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'Dn', Numpad1: 'A', Period: 'A', Numpad2: 'J', Slash: 'J', Numpad3: 'F', Comma: 'F',
    Numpad4: 'S1', Numpad5: 'S2', Numpad6: 'S3', ShiftRight: 'RUN', Numpad0: 'RUN' }
};
class KeyboardSet {
  constructor(map) { this.map = map; this.held = new Set(); this.edges = []; this.lastTap = { L: -99, R: -99 }; this.runDir = 0; this.frame = 0; this.seq = []; }
  key(code, down, repeat) {
    const k = this.map[code]; if (!k) return false;
    if (!down) { this.held.delete(k); return true; }
    if (!repeat) { this.held.add(k); this.edges.push(k); }
    return true;
  }
  fill(inp) {
    this.frame++;
    const h = this.held, f = this.frame;
    let mx = (h.has('R') ? 1 : 0) - (h.has('L') ? 1 : 0), mz = (h.has('Dn') ? 1 : 0) - (h.has('U') ? 1 : 0);
    for (const k of this.edges) {
      if (k === 'L' || k === 'R') {
        const d = k === 'R' ? 1 : -1;
        if (f - this.lastTap[k] < 16) this.runDir = d;
        this.lastTap[k] = f;
        if (this.runDir && this.runDir !== d) this.runDir = 0;
      }
      // classic command: Defend, direction, Attack
      if (k === 'F' || k === 'L' || k === 'R' || k === 'U' || k === 'Dn') this.seq.push({ k, f });
      if (k === 'A') {
        const s = this.seq.filter(e => f - e.f < 30); let sk = 0;
        for (let i = 0; i < s.length - 1; i++) if (s[i].k === 'F') {
          const d = s[i + 1].k; sk = (d === 'L' || d === 'R') ? 1 : d === 'U' ? 2 : 3;
        }
        if (sk) { inp.skill = sk; const last = s.filter(e => e.k === 'L' || e.k === 'R').pop(); if (last) inp.mx = last.k === 'R' ? 1 : -1; this.seq = []; }
        else inp.atk = true;
      }
      if (k === 'J') inp.jmp = true;
      if (k === 'F') inp.defP = true;
      if (k === 'S1') inp.skill = 1; if (k === 'S2') inp.skill = 2; if (k === 'S3') inp.skill = 3;
    }
    if (this.seq.length > 8) this.seq.splice(0, this.seq.length - 8);
    this.edges.length = 0;
    if (this.runDir && !h.has(this.runDir > 0 ? 'R' : 'L')) this.runDir = 0;
    const run = !!this.runDir || (h.has('RUN') && mx !== 0);
    if (mx || mz || run || h.has('F')) { inp.mx = inp.mx || mx; inp.mz = inp.mz || mz; }
    inp.run = inp.run || run;
    inp.def = inp.def || h.has('F');
  }
  clear() { this.held.clear(); this.edges.length = 0; }
}
const KB = { solo: new KeyboardSet(KEYSETS.solo), p1: new KeyboardSet(KEYSETS.p1), p2: new KeyboardSet(KEYSETS.p2) };
const Keyboard = {
  init() {
    const all = Object.values(KB);
    addEventListener('keydown', e => {
      if (!running || paused) return;
      let used = false; for (const s of all) used = s.key(e.code, true, e.repeat) || used;
      if (used) { e.preventDefault(); lastDevice = 'keyboard'; }
    });
    addEventListener('keyup', e => { for (const s of all) s.key(e.code, false); });
    addEventListener('blur', () => all.forEach(s => s.clear()));
  }
};

/* On-screen controls. One pad fills the screen in one-player games; with two
   players each gets a compact pad on their own side of the tablet. */
const PAD_LAYOUT = {
  full: { atk: [10, 14, 84], jmp: [100, 4, 64], def: [24, 106, 64], s1: [176, 76, 58], s2: [108, 120, 58], s3: [96, 186, 58] },
  half: { atk: [8, 10, 70], jmp: [84, 2, 54], def: [18, 88, 54], s1: [146, 60, 48], s2: [90, 104, 48], s3: [80, 160, 48] }
};
class TouchPad {
  constructor(slot, side, compact) {
    this.slot = slot; this.side = side; this.compact = compact; this.sx = 0; this.sz = 0; this.run = false; this.pid = null; this.held = {}; this.edges = [];
    const root = this.root = document.createElement('div'); root.className = `tpad ${side}${compact ? ' compact' : ''}`;
    root.innerHTML = `<div class="stickZone"><div class="stickBase"><div class="stickKnob"></div></div></div><div class="pad">${compact ? `<span class="ptag p${slot + 1}">${slot + 1}P</span>` : ''}
      <button class="tb sk" data-b="s3"></button><button class="tb sk" data-b="s2"></button><button class="tb sk" data-b="s1"></button>
      <button class="tb" data-b="def">防</button><button class="tb" data-b="jmp">跳</button><button class="tb" data-b="atk">攻</button></div>`;
    document.getElementById('touch').appendChild(root);
    const L = PAD_LAYOUT[compact ? 'half' : 'full'], horiz = side === 'L' ? 'left' : 'right';
    root.querySelectorAll('.tb').forEach(b => { const [h, v, size] = L[b.dataset.b]; b.style[horiz] = h + 'px'; b.style.bottom = v + 'px'; b.style.width = b.style.height = size + 'px'; });
    const zone = root.querySelector('.stickZone'), base = root.querySelector('.stickBase'), knob = root.querySelector('.stickKnob');
    const R = compact ? 46 : 52;
    let ox = 0, oy = 0;
    const move = e => {
      let dx = e.clientX - ox, dy = e.clientY - oy; const m = Math.hypot(dx, dy);
      if (m > R) { dx *= R / m; dy *= R / m; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      const x = dx / R, y = dy / R;
      this.sx = Math.abs(x) < 0.22 ? 0 : x; this.sz = Math.abs(y) < 0.3 ? 0 : y;
      this.run = Math.abs(x) > 0.9 && m >= R * 0.95;
      base.classList.toggle('run', this.run);
    };
    zone.addEventListener('pointerdown', e => {
      if (this.pid !== null) return; e.preventDefault(); lastDevice = 'touch';
      this.pid = e.pointerId; zone.setPointerCapture(e.pointerId);
      const r = zone.getBoundingClientRect();
      base.style.left = (e.clientX - r.left) + 'px'; base.style.top = (e.clientY - r.top) + 'px';
      ox = e.clientX; oy = e.clientY; move(e);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === this.pid) move(e); });
    const end = e => { if (e.pointerId !== this.pid) return; this.pid = null; this.sx = this.sz = 0; this.run = false; knob.style.transform = ''; base.classList.remove('run'); base.style.left = ''; base.style.top = ''; };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    root.querySelectorAll('.tb').forEach(b => {
      const k = b.dataset.b;
      b.addEventListener('pointerdown', e => { e.preventDefault(); lastDevice = 'touch'; b.setPointerCapture(e.pointerId); this.held[k] = true; this.edges.push(k); b.classList.add('on'); Sound.init(); });
      const up = () => { this.held[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
  }
  fill(inp) {
    if (this.sx || this.sz) { inp.mx = inp.mx || this.sx; inp.mz = inp.mz || this.sz; }
    inp.run = inp.run || this.run; inp.def = inp.def || !!this.held.def;
    for (const k of this.edges) {
      if (k === 'atk') inp.atk = true; if (k === 'jmp') inp.jmp = true; if (k === 'def') inp.defP = true;
      if (k === 's1') inp.skill = 1; if (k === 's2') inp.skill = 2; if (k === 's3') inp.skill = 3;
    }
    this.edges.length = 0;
  }
  setSkills(f) {
    f.def.skills.forEach((id, i) => {
      const b = this.root.querySelector(`.tb[data-b="s${i + 1}"]`); if (!b) return;
      if (!id) { b.hidden = true; return; } b.hidden = false;
      b.innerHTML = `${SKILLS[id].name}<small>${SKILLS[id].cost}</small>`; b.classList.toggle('off', f.mp < SKILLS[id].cost);
    });
  }
  remove() { this.root.remove(); }
}
const Touch = { pads: [], setup(n) { this.pads.forEach(p => p.remove()); this.pads = n === 0 ? [] : n === 1 ? [new TouchPad(0, 'R', false)] : [new TouchPad(0, 'L', true), new TouchPad(1, 'R', true)]; } };

/* Standard-mapping gamepads. index = which pad. */
class PadCtl {
  constructor(index) { this.index = index; this.prev = []; }
  fill(inp) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; const p = pads && pads[this.index];
    if (!p) return false;
    const b = i => !!(p.buttons[i] && p.buttons[i].pressed), was = i => !!this.prev[i];
    const ed = i => b(i) && !was(i);
    let ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (Math.abs(ax) < 0.25) ax = 0; if (Math.abs(ay) < 0.3) ay = 0;
    if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
    const any = ax || ay || p.buttons.some(x => x.pressed);
    if (any) lastDevice = 'pad';
    if (ax || ay) { inp.mx = inp.mx || ax; inp.mz = inp.mz || ay; }
    inp.run = inp.run || (Math.abs(p.axes[0] || 0) > 0.92) || (b(7) && ax !== 0) || ((b(14) || b(15)) && b(7));
    inp.def = inp.def || b(1);
    if (ed(2)) inp.atk = true; if (ed(0)) inp.jmp = true; if (ed(1)) inp.defP = true;
    if (ed(3)) inp.skill = 1; if (ed(5)) inp.skill = 2; if (ed(4)) inp.skill = 3;
    if (ed(9) && running) togglePause();
    this.prev = p.buttons.map(x => x.pressed);
    return true;
  }
}
const pads = [new PadCtl(0), new PadCtl(1), new PadCtl(2), new PadCtl(3)];

/* A human player: listens to every input source assigned to that player. */
class HumanCtl {
  constructor(slot, sources) { this.inp = new Input(); this.slot = slot; this.sources = sources; this.human = true; }
  poll() {
    const i = this.inp; i.mx = i.mz = 0; i.run = i.def = false;
    for (const s of this.sources) s.fill(i);
    i.mx = clamp(i.mx, -1, 1); i.mz = clamp(i.mz, -1, 1);
  }
}
/* the input sources for each local player, depending on how many share the device */
function localSources(slot, n) {
  if (n === 1) return [KB.solo, Touch.pads[0], ...pads];
  return [slot === 0 ? KB.p1 : KB.p2, Touch.pads[slot], pads[slot]].filter(Boolean);
}

