'use strict';
// 音效與音樂：全部 WebAudio 即時合成，沒有任何音檔
const Snd = {
  ctx: null, out: null, sfxG: null, musG: null, nb: null, pulse: {}, last: Object.create(null),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const c = this.ctx = new C();
      this.out = c.createDynamicsCompressor(); this.out.threshold.value = -14; this.out.connect(c.destination);
      this.sfxG = c.createGain(); this.sfxG.connect(this.out);
      this.musG = c.createGain(); this.musG.connect(this.out);
      this.applyVol();
      const n = c.sampleRate, b = this.nb = c.createBuffer(1, n, n), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      for (const duty of [0.125, 0.25]) {
        const N = 32, re = new Float32Array(N), im = new Float32Array(N);
        for (let k = 1; k < N; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
        this.pulse[duty] = c.createPeriodicWave(re, im);
      }
      setInterval(() => Music.tick(), 25);
    } catch (e) { this.ctx = null; }
  },
  applyVol() {
    if (!this.ctx) return;
    this.sfxG.gain.value = Store.data.sfx ? 0.8 : 0;
    this.musG.gain.value = Store.data.music ? 0.36 : 0;
  },
  osc(type) {
    const o = this.ctx.createOscillator();
    if (type === 'p12' || type === 'p25') o.setPeriodicWave(this.pulse[type === 'p12' ? 0.125 : 0.25]); else o.type = type;
    return o;
  },
  tone(f, dur, type = 'square', g = 0.1, f2 = null, when = 0, dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + Math.max(0, when), o = this.osc(type), a = c.createGain();
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(a); a.connect(dest || this.sfxG); o.start(t); o.stop(t + dur + 0.02);
  },
  // 有包絡的樂音（音樂用）
  note(f, t, dur, type, g, dest) {
    const c = this.ctx, o = this.osc(type), a = c.createGain();
    o.frequency.setValueAtTime(f, t);
    a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(g, t + 0.006);
    a.gain.linearRampToValueAtTime(g * 0.7, t + Math.min(0.08, dur * 0.4));
    a.gain.setValueAtTime(g * 0.7, t + Math.max(0.01, dur - 0.04)); a.gain.exponentialRampToValueAtTime(0.0005, t + dur + 0.03);
    o.connect(a); a.connect(dest); o.start(t); o.stop(t + dur + 0.06);
  },
  noise(dur, g = 0.2, f1 = 2000, f2 = 200, when = 0, type = 'lowpass', dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + Math.max(0, when), s = c.createBufferSource(), fl = c.createBiquadFilter(), a = c.createGain();
    s.buffer = this.nb; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(fl); fl.connect(a); a.connect(dest || this.sfxG);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  bell(f, g = 0.3, when = 0) {
    // 鐘聲：不諧和泛音
    [[1, 1, 4], [2.0, 0.5, 2.6], [2.76, 0.35, 2], [5.4, 0.2, 1.2], [0.5, 0.4, 5]].forEach(([m, v, d]) => this.tone(f * m, d, 'sine', g * v, null, when));
  },
  play(name) {
    if (!this.ctx || !Store.data.sfx) return;
    const now = this.ctx.currentTime, gap = { cursor: 0.03, hit: 0.05, step: 0.1 }[name] || 0;
    if (gap && this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    const T = (...a) => this.tone(...a), N = (...a) => this.noise(...a);
    switch (name) {
      case 'cursor': T(1320, 0.035, 'p25', 0.05); break;
      case 'ok': T(880, 0.05, 'p25', 0.06); T(1320, 0.07, 'p25', 0.05, null, 0.045); break;
      case 'cancel': T(660, 0.05, 'p25', 0.05); T(440, 0.07, 'p25', 0.05, null, 0.04); break;
      case 'bump': T(110, 0.08, 'square', 0.08, 70); break;
      case 'talk': T(760, 0.02, 'p12', 0.025); break;
      case 'stairs': [523, 440, 349, 262].forEach((f, i) => T(f, 0.07, 'p25', 0.05, null, i * 0.06)); break;
      case 'door': N(0.12, 0.12, 1200, 300); break;
      case 'chest': [392, 523, 659, 784, 1047].forEach((f, i) => T(f, 0.1, 'p25', 0.06, null, i * 0.05)); break;
      case 'coin': T(1568, 0.05, 'square', 0.05); T(2093, 0.18, 'square', 0.05, null, 0.06); break;
      case 'encounter': for (let i = 0; i < 8; i++) T(300 + i * 140, 0.05, 'square', 0.05, null, i * 0.035); N(0.4, 0.1, 6000, 400, 0.05, 'bandpass'); break;
      case 'attack': N(0.12, 0.18, 6000, 900, 0, 'bandpass'); break;
      case 'hit': N(0.14, 0.32, 1800, 120); T(180, 0.1, 'square', 0.1, 60); break;
      case 'crit': N(0.3, 0.4, 3000, 100); T(900, 0.25, 'square', 0.08, 120); T(1800, 0.12, 'p25', 0.06, 400, 0.02); break;
      case 'phit': N(0.18, 0.35, 900, 80); T(120, 0.16, 'square', 0.14, 50); break;
      case 'miss': T(1200, 0.12, 'sine', 0.05, 2400); break;
      case 'kill': for (let i = 0; i < 6; i++) T(900 - i * 110, 0.05, 'p25', 0.05, null, i * 0.04); N(0.3, 0.12, 3000, 300, 0.05); break;
      case 'spell': for (let i = 0; i < 6; i++) T(880 * Math.pow(1.122, i), 0.07, 'p12', 0.04, null, i * 0.035); break;
      case 'fire': N(0.6, 0.3, 1600, 120); T(200, 0.4, 'sawtooth', 0.05, 60); break;
      case 'ice': for (let i = 0; i < 7; i++) T(2400 + Math.random() * 1600, 0.12, 'sine', 0.04, null, i * 0.05); N(0.4, 0.1, 9000, 3000, 0, 'highpass'); break;
      case 'thunder': N(0.9, 0.5, 5000, 60); T(70, 0.6, 'sawtooth', 0.12, 30); break;
      case 'wind': N(0.8, 0.22, 600, 2400, 0, 'bandpass'); N(0.8, 0.12, 2400, 500, 0.15, 'bandpass'); break;
      case 'holy': [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => T(f, 0.5, 'sine', 0.05, null, i * 0.05)); break;
      case 'heal': [523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 0.16, 'sine', 0.06, null, i * 0.05)); break;
      case 'buff': [392, 494, 587, 784].forEach((f, i) => T(f, 0.1, 'p25', 0.05, null, i * 0.05)); break;
      case 'debuff': [784, 587, 494, 392].forEach((f, i) => T(f, 0.1, 'p25', 0.05, null, i * 0.05)); break;
      case 'poison': for (let i = 0; i < 4; i++) T(300 + Math.random() * 200, 0.08, 'sine', 0.07, 150, i * 0.07); break;
      case 'sleep': [660, 550, 440].forEach((f, i) => T(f, 0.2, 'sine', 0.05, null, i * 0.12)); break;
      case 'breath': N(1.0, 0.35, 400, 2000, 0, 'bandpass'); N(1.0, 0.2, 1200, 200, 0.2); break;
      case 'roar': T(90, 0.7, 'sawtooth', 0.15, 60); N(0.7, 0.2, 800, 200); break;
      case 'run': for (let i = 0; i < 5; i++) T(600 + i * 120, 0.04, 'p25', 0.04, null, i * 0.04); break;
      case 'buy': T(1047, 0.05, 'square', 0.05); T(1568, 0.12, 'square', 0.05, null, 0.05); break;
      case 'swamp': T(160, 0.12, 'square', 0.08, 80); break;
      case 'slide': N(0.15, 0.06, 7000, 3000, 0, 'highpass'); break;
      case 'warp': for (let i = 0; i < 12; i++) T(400 + i * 90, 0.06, 'p12', 0.04, null, i * 0.03); break;
      case 'bell': this.bell(392, 0.35); this.bell(392, 0.25, 1.6); break;
      case 'boss': T(55, 1.2, 'sawtooth', 0.15, 40); N(1.2, 0.2, 300, 60); break;
    }
  },
};

// ───── 音樂 ─────
// 旋律以「音名 長度(八分音符)」寫成，和弦每小節一個（可用 - 分成兩個）
const SONGS = {
  title: {
    bpm: 96, bar: 8, lead: 'p25', bass: 'slow', arp: 'arp', drum: 'soft',
    chords: 'Bb F Gm Eb Bb F Eb F Bb Dm Eb Cm Bb F Bb Bb',
    mel: 'F4 2 Bb4 2 D5 3 C5 1 | C5 4 F5 4 | D5 2 Bb4 2 G5 3 F5 1 | Eb5 4 G5 4 | F5 2 D5 2 Bb5 3 A5 1 | A5 4 C6 4 | Bb5 2 G5 2 Eb5 2 G5 2 | F5 8 |' +
      'D5 2 F5 2 Bb5 4 | A5 2 F5 2 D5 4 | G5 2 Bb5 2 Eb6 3 D6 1 | C6 4 G5 4 | F5 2 Bb5 2 D6 4 | C6 3 A5 1 F5 4 | Bb5 8 | R 8',
  },
  town: {
    bpm: 138, bar: 6, lead: 'p25', bass: 'waltz', arp: 'waltz', drum: 'none',
    chords: 'F C Dm Bb F C F F Bb F Gm C F Dm Gm-C F',
    mel: 'C5 2 F5 2 A5 2 | G5 3 F5 1 E5 2 | F5 2 D5 2 A4 2 | Bb4 4 D5 2 | C5 2 A4 2 F4 2 | G4 2 Bb4 2 E5 2 | F5 6 | A4 2 Bb4 2 C5 2 |' +
      'D5 2 F5 2 Bb5 2 | A5 3 G5 1 F5 2 | G5 2 D5 2 Bb4 2 | C5 4 E5 2 | F5 2 A5 2 C6 2 | A5 3 F5 1 D5 2 | Bb4 2 E5 2 G5 2 | F5 4 R 2',
  },
  field: {
    bpm: 124, bar: 8, lead: 'square', bass: 'march', arp: 'broken', drum: 'march',
    chords: 'C G Am Em F C Dm G C G Am Em F G C C',
    mel: 'G4 2 C5 2 E5 3 D5 1 | D5 2 B4 2 G4 4 | A4 2 C5 2 E5 2 A5 2 | G5 4 E5 4 | F5 2 E5 2 D5 2 C5 2 | E5 3 C5 1 G4 4 | A4 2 D5 2 F5 2 E5 2 | D5 6 R 2 |' +
      'G4 2 C5 2 E5 3 D5 1 | D5 2 G5 2 F5 2 D5 2 | E5 2 A5 2 G5 2 E5 2 | B4 4 E5 4 | A5 3 G5 1 F5 2 A5 2 | G5 3 F5 1 E5 2 D5 2 | C5 2 E5 2 G5 2 E5 2 | C5 6 R 2',
  },
  dungeon: {
    bpm: 88, bar: 8, lead: 'p25', bass: 'slow', arp: 'arp', drum: 'none', vol: 0.8,
    chords: 'Dm Dm Bb A Dm Gm A A Bb F Gm A Dm Bb A Dm',
    mel: 'D5 4 F5 2 E5 2 | D5 2 A4 6 | Bb4 4 A4 2 G4 2 | A4 6 C#5 2 | D5 4 F5 2 A5 2 | G5 4 F5 2 E5 2 | E5 4 C#5 2 E5 2 | A4 8 |' +
      'F5 4 D5 2 F5 2 | C5 4 A4 4 | Bb4 4 D5 2 G5 2 | E5 6 C#5 2 | D5 2 E5 2 F5 2 G5 2 | A5 4 G5 2 F5 2 | E5 2 F5 2 E5 2 C#5 2 | D5 8',
  },
  tower: {
    bpm: 112, bar: 8, lead: 'square', bass: 'drive', arp: 'arp', drum: 'soft',
    chords: 'Em C D Em Em C D B C D Em Em Am B Em B',
    mel: 'B4 2 E5 2 G5 2 B5 2 | A5 3 G5 1 E5 4 | F#5 2 A5 2 D5 2 F#5 2 | G5 6 E5 2 | B4 2 E5 2 G5 2 B5 2 | C6 3 B5 1 A5 4 | A5 2 F#5 2 D5 2 A5 2 | F#5 6 D#5 2 |' +
      'E5 2 G5 2 C6 2 B5 2 | A5 2 F#5 2 D5 4 | G5 2 F#5 2 E5 2 B4 2 | E5 6 R 2 | C5 2 E5 2 A5 2 C6 2 | B5 3 A5 1 F#5 4 | G5 2 B5 2 E6 2 B5 2 | D#5 4 F#5 4',
  },
  castle: {
    bpm: 100, bar: 8, lead: 'p25', bass: 'drive', arp: 'pad', drum: 'soft', vol: 0.9,
    chords: 'Em Em C B Em Am B B C Am B Em C D B B',
    mel: 'E5 2 G5 2 B5 2 A5 2 | G5 3 F#5 1 E5 4 | E5 2 G5 2 C6 2 B5 2 | A5 2 F#5 2 D#5 4 | E5 2 B4 2 E5 2 G5 2 | A5 3 G5 1 F#5 2 E5 2 | D#5 2 F#5 2 A5 2 F#5 2 | B4 8 |' +
      'G5 4 E5 4 | C6 4 A5 4 | B5 2 A5 2 G5 2 F#5 2 | E5 8 | E5 2 G5 2 C6 4 | D6 2 A5 2 F#5 4 | D#5 2 F#5 2 B5 4 | A5 4 F#5 4',
  },
  battle: {
    bpm: 158, bar: 8, lead: 'square', bass: 'gallop', arp: 'stab', drum: 'battle',
    chords: 'Am Am F G Am Am F E Dm Am Dm E F G Am E',
    mel: 'A4 1 A4 1 E5 2 A5 2 G5 1 E5 1 | C6 2 B5 1 A5 1 G5 2 E5 2 | F5 2 A5 2 C6 2 A5 2 | B5 3 G5 1 D5 2 G5 2 | A5 1 A5 1 E5 2 A5 2 B5 1 C6 1 | D6 2 C6 1 B5 1 A5 2 E5 2 | F5 2 E5 2 D5 2 C5 2 | B4 2 E5 2 G#5 4 |' +
      'F5 2 D5 2 A5 2 F5 2 | E5 2 C5 2 A5 2 E5 2 | D5 2 F5 2 A5 2 D6 2 | B5 3 G#5 1 E5 4 | C6 2 A5 2 F5 2 A5 2 | D6 2 B5 2 G5 2 B5 2 | C6 2 B5 2 A5 2 E5 2 | G#5 2 B5 2 E6 4',
  },
  boss: {
    bpm: 170, bar: 8, lead: 'square', bass: 'gallop', arp: 'stab', drum: 'boss',
    chords: 'Cm Cm Ab Bb Cm Cm Ab G Fm Cm Fm G Ab Bb Cm G',
    mel: 'C5 1 C5 1 G5 2 Eb5 1 F5 1 G5 2 | C6 3 Bb5 1 G5 4 | Ab5 2 G5 2 F5 2 Eb5 2 | F5 3 D5 1 Bb4 4 | C5 1 C5 1 G5 2 Eb5 1 F5 1 G5 2 | Eb6 3 D6 1 C6 4 | C6 2 Ab5 2 Eb5 2 C6 2 | B5 6 G5 2 |' +
      'Ab5 2 F5 2 C6 2 Ab5 2 | G5 2 Eb5 2 C5 2 G5 2 | F5 2 Ab5 2 C6 2 F6 2 | D6 3 B5 1 G5 4 | Eb6 2 C6 2 Ab5 2 C6 2 | D6 2 Bb5 2 F5 2 Bb5 2 | C6 2 G5 2 Eb5 2 G5 2 | B5 2 D6 2 G6 4',
  },
  final: {
    bpm: 176, bar: 8, lead: 'square', bass: 'gallop', arp: 'stab', drum: 'boss',
    chords: 'Dm Bb C A Dm Bb Gm A Bb C Dm Dm Gm A Dm A',
    mel: 'D5 1 F5 1 A5 1 D6 1 C6 2 A5 2 | Bb5 3 A5 1 F5 2 D5 2 | E5 1 G5 1 C6 1 E6 1 D6 2 C6 2 | C#6 4 A5 4 | D6 2 A5 2 F5 2 A5 2 | D6 2 Bb5 2 F5 2 D6 2 | G5 2 Bb5 2 D6 2 G6 2 | E6 4 C#6 2 A5 2 |' +
      'F6 3 E6 1 D6 2 Bb5 2 | E6 3 D6 1 C6 2 G5 2 | A5 2 D6 2 F6 2 D6 2 | A5 6 R 2 | Bb5 2 G5 2 D5 2 G5 2 | C#6 2 A5 2 E5 2 A5 2 | D6 2 F6 2 E6 2 D6 2 | C#6 2 E6 2 A6 4',
  },
  ending: {
    bpm: 80, bar: 8, lead: 'p25', bass: 'slow', arp: 'arp', drum: 'none',
    chords: 'Bb F Gm Eb Bb F Eb F Bb Dm Eb Cm Bb F Bb Bb',
    mel: 'F4 2 Bb4 2 D5 3 C5 1 | C5 4 F5 4 | D5 2 Bb4 2 G5 3 F5 1 | Eb5 4 G5 4 | F5 2 D5 2 Bb5 3 A5 1 | A5 4 C6 4 | Bb5 2 G5 2 Eb5 2 G5 2 | F5 8 |' +
      'D5 2 F5 2 Bb5 4 | A5 2 F5 2 D5 4 | G5 2 Bb5 2 Eb6 3 D6 1 | C6 4 G5 4 | F5 2 Bb5 2 D6 4 | C6 3 A5 1 F5 4 | Bb5 8 | R 8',
  },
  // 短樂句
  victory: { bpm: 150, bar: 8, lead: 'square', bass: 'march', arp: 'stab', drum: 'none', once: true, chords: 'C G-C', mel: 'G4 1 C5 1 E5 1 G5 1 C6 3 R 1 | B5 1 A5 1 B5 1 D6 1 C6 4' },
  levelup: { bpm: 150, bar: 8, lead: 'square', bass: 'slow', arp: 'none', drum: 'none', once: true, chords: 'C', mel: 'C5 1 E5 1 G5 1 C6 1 E6 4' },
  inn: { bpm: 100, bar: 8, lead: 'p25', bass: 'slow', arp: 'arp', drum: 'none', once: true, chords: 'F C F', mel: 'C5 2 F5 2 A5 2 G5 2 | F5 2 E5 2 G5 2 E5 2 | F5 8' },
  item: { bpm: 140, bar: 8, lead: 'square', bass: 'slow', arp: 'none', drum: 'none', once: true, chords: 'G', mel: 'G5 1 A5 1 B5 1 D6 1 G6 4' },
  save: { bpm: 120, bar: 8, lead: 'p25', bass: 'slow', arp: 'arp', drum: 'none', once: true, chords: 'C', mel: 'E5 1 G5 1 C6 2 G5 1 C6 3' },
  gameover: { bpm: 80, bar: 8, lead: 'p25', bass: 'slow', arp: 'pad', drum: 'none', once: true, chords: 'Am E-Am', mel: 'E5 3 D5 1 C5 2 B4 2 | A4 8' },
  join: { bpm: 132, bar: 8, lead: 'square', bass: 'march', arp: 'stab', drum: 'none', once: true, chords: 'F C-F', mel: 'C5 1 F5 1 A5 1 C6 1 A5 2 C6 2 | D6 2 E6 2 F6 4' },
};

const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteMidi(s) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(s); if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
function chordNotes(s) {
  const m = /^([A-G])([#b]?)(m7|m|7|dim|sus)?$/.exec(s); if (!m) return [48, 52, 55];
  const root = 48 + NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const iv = { m: [0, 3, 7], m7: [0, 3, 7, 10], 7: [0, 4, 7, 10], dim: [0, 3, 6], sus: [0, 5, 7] }[m[3]] || [0, 4, 7];
  return iv.map(i => root + i);
}
const midiF = n => 440 * Math.pow(2, (n - 69) / 12);

const Music = {
  name: '', cur: null, pos: 0, next: 0, onEnd: null, resumeName: null,
  cache: {},
  compile(name) {
    if (this.cache[name]) return this.cache[name];
    const s = SONGS[name], L = s.bar * 2; // 每小節的十六分音符數
    const bars = s.chords.split(/\s+/).filter(Boolean);
    const len = bars.length * L, ev = Array.from({ length: len }, () => []);
    const add = (t, ch, n, d, v, type) => { if (t < len) ev[t].push([ch, n, d, v, type]); };
    // 旋律
    let t = 0;
    const tk = s.mel.replace(/\|/g, ' ').split(/\s+/).filter(Boolean);
    for (let i = 0; i < tk.length; i += 2) {
      const d = +tk[i + 1] * 2, n = noteMidi(tk[i]);
      if (n) add(t, 'lead', n, d, 1, s.lead);
      t += d;
    }
    // 伴奏
    bars.forEach((b, bi) => {
      const parts = b.split('-'), plen = L / parts.length;
      parts.forEach((cn, pi) => {
        const ch = chordNotes(cn), r = ch[0] - 12, T0 = bi * L + pi * plen, five = r + 7;
        switch (s.bass) {
          case 'march': for (let k = 0; k < plen; k += 4) add(T0 + k, 'bass', [r, five, r + 12, five][(k / 4) % 4], 3, 1); break;
          case 'drive': for (let k = 0; k < plen; k += 2) add(T0 + k, 'bass', k % 4 === 2 ? r + 12 : r, 2, 1); break;
          case 'gallop': for (let k = 0; k < plen; k++) if ([0, 3, 6, 8, 11, 14].includes(k % 16)) add(T0 + k, 'bass', k % 8 === 6 ? r + 12 : r, 2, 1); break;
          case 'waltz': add(T0, 'bass', r, 4, 1); if (plen >= 12) add(T0 + 8, 'bass', five - 12 + 12, 3, 0.7); break;
          default: add(T0, 'bass', r, plen / 2, 1); add(T0 + plen / 2, 'bass', five, plen / 2, 0.8);
        }
        switch (s.arp) {
          case 'arp': for (let k = 0; k < plen; k++) { const seq = [0, 1, 2, 3, 2, 1]; const c = ch[seq[k % 6] % ch.length] + 12 + (seq[k % 6] === 3 ? 12 : 0); add(T0 + k, 'arp', c, 1.4, 0.8); } break;
          case 'broken': for (let k = 0; k < plen; k += 2) add(T0 + k, 'arp', ch[[0, 2, 1, 2][(k / 2) % 4]] + 12, 1.6, 1); break;
          case 'stab': for (let k = 2; k < plen; k += 4) ch.slice(0, 3).forEach(c => add(T0 + k, 'arp', c + 12, 1.2, 0.7)); break;
          case 'waltz': for (const k of [4, 8]) if (k < plen) ch.slice(0, 3).forEach(c => add(T0 + k, 'arp', c + 12, 2.5, 0.65)); break;
          case 'pad': ch.slice(0, 3).forEach(c => add(T0, 'pad', c + 12, plen - 0.5, 1)); break;
        }
        if (s.drum !== 'none') for (let k = 0; k < plen; k++) {
          const q = (T0 + k) % 16;
          if (s.drum === 'soft') { if (q === 0) add(T0 + k, 'kick', 0, 1, 0.6); if (q % 4 === 2) add(T0 + k, 'hat', 0, 1, 0.5); }
          else if (s.drum === 'march') { if (q === 0 || q === 8) add(T0 + k, 'kick', 0, 1, 0.8); if (q === 4 || q === 12) add(T0 + k, 'snare', 0, 1, 0.6); if (q === 14 || q === 15) add(T0 + k, 'snare', 0, 1, 0.3); if (q % 2 === 0) add(T0 + k, 'hat', 0, 1, 0.4); }
          else { if (q === 0 || q === 8 || (s.drum === 'boss' && (q === 4 || q === 12 || q === 10))) add(T0 + k, 'kick', 0, 1, 0.9); if (q === 4 || q === 12) add(T0 + k, 'snare', 0, 1, 0.8); add(T0 + k, 'hat', 0, 1, q % 2 ? 0.3 : 0.6); }
        }
      });
    });
    return (this.cache[name] = { s, ev, len });
  },
  play(name, force) {
    if (!force && this.name === name && !this.onEnd) return;
    if (!SONGS[name]) { this.stop(); return; }
    this.name = name; this.cur = this.compile(name); this.pos = 0; this.onEnd = null;
    if (Snd.ctx) this.next = Snd.ctx.currentTime + 0.06;
  },
  // 短樂句播完後回到原本的曲子
  jingle(name, after) {
    const back = after !== undefined ? after : (this.onEnd ? this.resumeName : this.name);
    this.play(name, true); this.resumeName = back;
    return new Promise(res => { this.onEnd = () => { this.onEnd = null; if (back) this.play(back, true); else this.stop(); res(); }; if (!Snd.ctx) setTimeout(() => this.onEnd && this.onEnd(), 600); });
  },
  stop() { this.name = ''; this.cur = null; },
  tick() {
    const c = Snd.ctx; if (!c || !this.cur) return;
    const { s, ev, len } = this.cur, sp = 60 / s.bpm / 4, vol = s.vol || 1, D = Snd.musG;
    if (this.next < c.currentTime - 0.3) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.16 && this.cur) {
      if (this.pos >= len) {
        if (s.once) { const t = this.next; this.cur = null; const fn = this.onEnd; setTimeout(() => fn && fn(), Math.max(0, (t - c.currentTime) * 1000 + 250)); return; }
        this.pos = 0;
      }
      const t = this.next;
      for (const [ch, n, d, v, type] of ev[this.pos]) {
        const dur = d * sp;
        if (ch === 'lead') { Snd.note(midiF(n), t, dur * 0.92, type || 'square', 0.07 * vol, D); Snd.note(midiF(n) * 1.004, t, dur * 0.92, 'p12', 0.018 * vol, D); }
        else if (ch === 'bass') Snd.note(midiF(n), t, dur * 0.85, 'triangle', 0.26 * v * vol, D);
        else if (ch === 'arp') Snd.note(midiF(n), t, dur * 0.8, 'p12', 0.028 * v * vol, D);
        else if (ch === 'pad') Snd.note(midiF(n), t, dur, 'triangle', 0.05 * vol, D);
        else if (ch === 'kick') Snd.tone(140, 0.12, 'sine', 0.5 * v * vol, 42, t - c.currentTime, D);
        else if (ch === 'snare') Snd.noise(0.11, 0.2 * v * vol, 4200, 1300, t - c.currentTime, 'bandpass', D);
        else if (ch === 'hat') Snd.noise(0.03, 0.06 * v * vol, 9000, 7000, t - c.currentTime, 'highpass', D);
      }
      this.pos++; this.next += sp;
    }
  },
};
