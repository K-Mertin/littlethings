'use strict';
// 音效與音樂：全部用 WebAudio 即時合成
const Snd = {
  ctx: null, out: null, sfxG: null, musG: null, nb: null, last: Object.create(null),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const c = this.ctx = new C();
      this.out = c.createDynamicsCompressor(); this.out.connect(c.destination);
      this.sfxG = c.createGain(); this.sfxG.connect(this.out);
      this.musG = c.createGain(); this.musG.connect(this.out);
      this.applyVol();
      const n = c.sampleRate, b = this.nb = c.createBuffer(1, n, n), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      setInterval(() => Music.tick(), 30);
    } catch (e) { this.ctx = null; }
  },
  applyVol() {
    if (!this.ctx) return;
    this.sfxG.gain.value = Prefs.d.sfx ? 0.8 : 0;
    this.musG.gain.value = Prefs.d.music ? 0.26 : 0;
  },
  tone(f, dur, type = 'square', g = 0.1, f2 = null, when = 0, dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), a = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(g, t + 0.006);
    a.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(a); a.connect(dest || this.sfxG); o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, g = 0.2, f1 = 2000, f2 = 200, when = 0, type = 'lowpass', dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when, s = c.createBufferSource(), fl = c.createBiquadFilter(), a = c.createGain();
    s.buffer = this.nb; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    s.connect(fl); fl.connect(a); a.connect(dest || this.sfxG);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  },
  arp(fs, step, dur, type = 'square', g = 0.06) { fs.forEach((f, i) => this.tone(f, dur, type, g, null, i * step)); },
  play(name) {
    if (!this.ctx || !Prefs.d.sfx) return;
    const now = this.ctx.currentTime, gap = { coin: 0.06, pop: 0.05, click: 0.03, happy: 0.12, sad: 0.2, steam: 0.3, clean: 0.1 }[name] || 0;
    if (gap && this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'click': this.tone(1200, 0.04, 'square', 0.035); break;
      case 'tab': this.tone(700, 0.05, 'triangle', 0.08); this.tone(1050, 0.05, 'triangle', 0.06, null, 0.04); break;
      case 'coin': this.tone(1568, 0.06, 'square', 0.035); this.tone(2093, 0.14, 'square', 0.03, null, 0.05); break;
      case 'place': this.tone(220, 0.12, 'sine', 0.25, 110); this.noise(0.08, 0.12, 1500, 300); this.tone(880, 0.06, 'square', 0.03, null, 0.05); break;
      case 'bad': this.tone(220, 0.16, 'square', 0.05, 160); break;
      case 'pop': this.tone(600, 0.06, 'sine', 0.12, 1200); break;
      case 'happy': this.arp([1047, 1319], 0.06, 0.08, 'triangle', 0.07); break;
      case 'sad': this.tone(392, 0.25, 'triangle', 0.08, 300); break;
      case 'clean': this.noise(0.12, 0.05, 6000, 2000, 0, 'bandpass'); break;
      case 'hire': this.arp([523, 659, 784, 1047], 0.07, 0.12); break;
      case 'level': this.arp([523, 659, 784, 1047, 1319, 1568], 0.06, 0.14, 'square', 0.05); break;
      case 'discover': this.arp([784, 988, 1175, 1568, 1976, 2349], 0.05, 0.2, 'triangle', 0.08); this.noise(0.6, 0.03, 9000, 5000, 0.1, 'highpass'); break;
      case 'fail': this.arp([523, 494, 440, 330], 0.1, 0.16, 'triangle', 0.08); break;
      case 'event': this.arp([659, 784, 659, 1047], 0.09, 0.14, 'square', 0.05); break;
      case 'cash': this.noise(0.05, 0.1, 4000, 2000, 0, 'bandpass'); this.tone(2637, 0.3, 'triangle', 0.06, null, 0.04); this.tone(3136, 0.35, 'triangle', 0.05, null, 0.09); break;
      case 'fanfare': this.arp([523, 523, 523, 659, 784, 659, 784, 1047], 0.12, 0.22, 'square', 0.06); this.arp([262, 262, 262, 330, 392, 330, 392, 523], 0.12, 0.22, 'triangle', 0.1); break;
      case 'drum': for (let i = 0; i < 12; i++) this.noise(0.06, 0.08 + i * 0.01, 3000, 800, i * 0.07, 'bandpass'); break;
      case 'start': this.arp([392, 523, 659, 784, 1047], 0.07, 0.15); break;
    }
  },
};

// 小型音樂合成器：五聲音階旋律 + 和弦琶音 + 貝斯 + 輕鼓
const SONGS = {
  title: { bpm: 116, key: 60, prog: [[0, 'M'], [5, 'M'], [-3, 'm'], [7, 'M']], seed: 5, drums: 1 },
  spring: { bpm: 128, key: 62, prog: [[0, 'M'], [-3, 'm'], [5, 'M'], [7, 'M'], [0, 'M'], [4, 'm'], [5, 'M'], [7, 'M']], seed: 12, drums: 2 },
  summer: { bpm: 138, key: 65, prog: [[0, 'M'], [5, 'M'], [2, 'm'], [7, 'M']], seed: 27, drums: 2 },
  autumn: { bpm: 122, key: 60, prog: [[0, 'M'], [4, 'm'], [5, 'M'], [2, 'm'], [0, 'M'], [-3, 'm'], [5, 'M'], [7, 'M']], seed: 33, drums: 2 },
  winter: { bpm: 112, key: 63, prog: [[0, 'M'], [-3, 'm'], [2, 'm'], [7, 'M']], seed: 48, drums: 1 },
  contest: { bpm: 150, key: 62, prog: [[0, 'M'], [0, 'M'], [5, 'M'], [7, 'M']], seed: 61, drums: 3 },
  award: { bpm: 100, key: 60, prog: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']], seed: 77, drums: 1 },
};
const Music = {
  song: null, name: '', step: 0, next: 0, bars: null, paused: false,
  play(name) {
    if (this.name === name) return;
    this.name = name; this.song = SONGS[name] || null; this.step = 0;
    if (Snd.ctx) this.next = Snd.ctx.currentTime + 0.1;
    if (this.song) this.bars = this.compose(this.song);
  },
  stop() { this.name = ''; this.song = null; },
  compose(s) {
    let a = s.seed * 9973;
    const rand = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
    const rhythms = [[0, 2, 4, 6, 8, 10, 12], [0, 3, 4, 6, 8, 12, 14], [0, 2, 3, 4, 8, 10, 12], [0, 4, 6, 8, 10, 12, 14], [0, 2, 6, 8, 10, 11, 12]];
    const pent = [0, 2, 4, 7, 9, 12, 14, 16];
    const phrase = end => {
      const r = rhythms[(rand() * rhythms.length) | 0], notes = [];
      let d = (rand() * 5) | 0;
      r.forEach((st, i) => {
        d = clamp(d + ((rand() * 5) | 0) - 2, 0, 7);
        const nx = r[i + 1] ?? 16;
        notes.push({ st, deg: pent[d], len: Math.min(nx - st, 3) });
      });
      notes[notes.length - 1].deg = end; notes[notes.length - 1].len = 4;
      return notes;
    };
    const A = phrase(4), B = phrase(7), C = phrase(9), D = phrase(0);
    return [A, B, A, C, A, B, C, D];
  },
  tick() {
    const c = Snd.ctx; if (!c || !this.song) return;
    const s = this.song, sp = 60 / s.bpm / 4;
    if (this.next < c.currentTime - 0.3) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.18) {
      if (!this.paused) { this.playStep(this.step, this.next - c.currentTime, sp); this.step++; }
      this.next += sp;
    }
  },
  playStep(step, when, sp) {
    const s = this.song, nb = s.prog.length, bar = Math.floor(step / 16) % nb, st = step % 16;
    const [root, q] = s.prog[bar], third = q === 'm' ? 3 : 4;
    const midi = n => 440 * Math.pow(2, (n - 69) / 12), D = Snd.musG;
    const base = s.key + root;
    // 貝斯：彈跳的根音-五度
    if (st % 4 === 0) Snd.tone(midi(base - 24), sp * 1.6, 'triangle', 0.36, null, when, D);
    if (st % 4 === 2) Snd.tone(midi(base - 17), sp * 1.2, 'triangle', 0.24, null, when, D);
    // 和弦反拍
    if (st % 4 === 2) for (const iv of [0, third, 7]) Snd.tone(midi(base + iv), sp * 0.9, 'square', 0.018, null, when, D);
    // 鐘琴點綴
    if (st % 8 === 4 && s.drums < 3) Snd.tone(midi(base + 24 + [7, 12, third + 12, 7][(step >> 3) & 3]), sp * 3, 'sine', 0.05, null, when, D);
    // 旋律
    const ph = this.bars[Math.floor(step / 16) % this.bars.length];
    for (const n of ph) {
      if (n.st !== st) continue;
      let iv = n.deg;
      if (q === 'm') iv = ({ 4: 3, 16: 15 }[iv] ?? iv);
      const f = midi(base + 12 + iv);
      Snd.tone(f, sp * n.len * 0.95, 'square', 0.05, null, when, D);
      Snd.tone(f * 2.003, sp * n.len * 0.6, 'triangle', 0.025, null, when, D);
    }
    // 鼓
    if (s.drums >= 1) {
      if (st === 0 || st === 8) Snd.tone(140, 0.1, 'sine', 0.5, 50, when, D);
      if (s.drums >= 2 && (st === 4 || st === 12)) Snd.noise(0.09, 0.14, 5000, 1500, when, 'bandpass', D);
      if (st % 2 === 0) Snd.noise(0.025, 0.035, 9000, 7000, when, 'highpass', D);
      if (s.drums >= 3 && st % 4 === 3) Snd.noise(0.05, 0.08, 6000, 3000, when, 'bandpass', D);
    }
  },
};
