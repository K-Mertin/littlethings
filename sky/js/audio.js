'use strict';
// 音效與音樂：全部用 WebAudio 即時合成，不需要音檔
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
      setInterval(() => Music.tick(), 25);
    } catch (e) { this.ctx = null; }
  },
  applyVol() {
    if (!this.ctx) return;
    this.sfxG.gain.value = Store.data.sfx ? 0.9 : 0;
    this.musG.gain.value = Store.data.music ? 0.32 : 0;
  },
  tone(f, dur, type = 'square', g = 0.1, f2 = null, when = 0, dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), a = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(a); a.connect(dest || this.sfxG); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, g = 0.2, f1 = 2000, f2 = 200, when = 0, type = 'lowpass', dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when, s = c.createBufferSource(), fl = c.createBiquadFilter(), a = c.createGain();
    s.buffer = this.nb; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(fl); fl.connect(a); a.connect(dest || this.sfxG);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  play(name) {
    if (!this.ctx || !Store.data.sfx) return;
    const now = this.ctx.currentTime, gap = { shot: 0.075, laser: 0.07, plasma: 0.11, hit: 0.045, eshot: 0.07, boom: 0.04, missile: 0.15 }[name] || 0;
    if (gap && this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'shot': this.tone(1100, 0.045, 'square', 0.018, 700); break;
      case 'laser': this.tone(1700, 0.06, 'sawtooth', 0.012, 1300); break;
      case 'plasma': this.tone(260, 0.12, 'sawtooth', 0.02, 420); break;
      case 'missile': this.noise(0.18, 0.05, 3000, 800, 0, 'bandpass'); break;
      case 'hit': this.tone(2400, 0.02, 'square', 0.008); break;
      case 'eshot': this.tone(520, 0.06, 'triangle', 0.02, 380); break;
      case 'boom': this.noise(0.38, 0.22, 2200, 160); this.tone(140, 0.2, 'sine', 0.12, 50); break;
      case 'bigboom': this.noise(1.1, 0.42, 1500, 60); this.tone(90, 0.8, 'sine', 0.45, 28); break;
      case 'item': [660, 880, 1320].forEach((f, i) => this.tone(f, 0.09, 'square', 0.06, null, i * 0.06)); break;
      case 'power': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'square', 0.06, null, i * 0.05)); break;
      case 'medal': this.tone(1568, 0.12, 'triangle', 0.08); this.tone(2093, 0.16, 'triangle', 0.06, null, 0.05); break;
      case 'bomb': this.noise(1.8, 0.5, 3200, 70); this.tone(150, 1.4, 'sine', 0.6, 30); break;
      case 'die': this.tone(700, 0.9, 'square', 0.12, 60); this.noise(0.9, 0.3, 1800, 100); break;
      case 'warn': for (let i = 0; i < 6; i++) this.tone(i % 2 ? 660 : 440, 0.24, 'sawtooth', 0.07, null, i * 0.26); break;
      case '1up': [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.12, 'square', 0.07, null, i * 0.07)); break;
      case 'select': this.tone(880, 0.06, 'square', 0.05); break;
      case 'siren': for (let i = 0; i < 2; i++) { this.tone(420, 0.42, 'sawtooth', 0.05, 840, i * 0.5); this.tone(423, 0.42, 'square', 0.025, 846, i * 0.5); } this.tone(70, 0.9, 'sine', 0.3, 40); break;
      case 'sting': {
        this.noise(0.5, 0.12, 300, 6000, 0, 'bandpass');
        for (const [m, g] of [[38, 0.07], [45, 0.05], [50, 0.045], [53, 0.04], [57, 0.035]]) { const f = 440 * Math.pow(2, (m - 69) / 12); this.tone(f, 1.6, 'sawtooth', g, f * 0.98, 0.45); this.tone(f * 1.006, 1.6, 'square', g * 0.4, null, 0.45); }
        this.tone(55, 1.8, 'sine', 0.55, 30, 0.45); this.noise(1.4, 0.35, 1800, 60, 0.45); this.noise(0.12, 0.3, 8000, 3000, 0.45, 'highpass');
        break;
      }
      case 'start': [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'square', 0.07, null, i * 0.07)); break;
    }
  },
};

// 小型音樂合成器：和弦進行 + 貝斯 + 琶音 + 旋律 + 鼓
const SONGS = {
  title: { bpm: 112, key: 45, prog: [[0, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M']], seed: 3, drums: 1 },
  s0: { bpm: 140, key: 45, prog: [[0, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M']], seed: 11, drums: 2 },
  s1: { bpm: 146, key: 47, prog: [[0, 'm'], [-2, 'M'], [-4, 'M'], [-5, 'M']], seed: 23, drums: 2 },
  s2: { bpm: 152, key: 43, prog: [[0, 'm'], [3, 'M'], [-2, 'M'], [5, 'm']], seed: 37, drums: 2 },
  s3: { bpm: 144, key: 50, prog: [[0, 'm'], [-4, 'M'], [-2, 'M'], [0, 'm'], [5, 'm'], [3, 'M'], [-2, 'M'], [-5, 'M']], seed: 41, drums: 2 },
  s4: { bpm: 156, key: 48, prog: [[0, 'M'], [-3, 'm'], [5, 'M'], [7, 'M']], seed: 59, drums: 2 },
  boss: { bpm: 168, key: 44, prog: [[0, 'm'], [0, 'm'], [1, 'M'], [-1, 'M']], seed: 71, drums: 3 },
  clear: { bpm: 132, key: 48, prog: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']], seed: 83, drums: 1, once: 2 },
  ending: { bpm: 108, key: 48, prog: [[0, 'M'], [-3, 'm'], [5, 'M'], [7, 'M']], seed: 97, drums: 1 },
};
const Music = {
  song: null, name: '', step: 0, next: 0, bars: null, fade: 1,
  play(name) {
    if (this.name === name) return;
    this.name = name; this.song = SONGS[name] || null; this.step = 0;
    if (Snd.ctx) this.next = Snd.ctx.currentTime + 0.08;
    if (this.song) this.bars = this.compose(this.song);
  },
  stop() { this.name = ''; this.song = null; },
  compose(s) {
    // 每個和弦一小節，旋律以兩小節為一句：A A' B A
    const rand = (() => { let a = s.seed * 9973; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
    const rhythms = [[0, 3, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 11, 14], [0, 4, 6, 8, 12, 14], [0, 3, 6, 10, 12]];
    const phrase = () => {
      const r = rhythms[(rand() * rhythms.length) | 0], notes = [];
      for (const st of r) notes.push({ st, deg: [0, 2, 4, 7, 4, 2, 9][(rand() * 7) | 0], len: 2 });
      return notes;
    };
    const A = phrase(), B = phrase(), A2 = A.map(n => ({ ...n, deg: n.deg === 0 ? 4 : n.deg }));
    return [A, A2, B, A];
  },
  tick() {
    const c = Snd.ctx; if (!c || !this.song) return;
    const s = this.song, sp = 60 / s.bpm / 4;
    if (this.next < c.currentTime - 0.3) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.15) {
      if (!G.paused) this.playStep(this.step, this.next - c.currentTime, sp);
      this.next += sp; this.step++;
    }
  },
  playStep(step, when, sp) {
    const s = this.song, nb = s.prog.length, bar = Math.floor(step / 16) % nb, st = step % 16;
    if (s.once && step >= nb * 16) return;
    const [root, q] = s.prog[bar], third = q === 'm' ? 3 : 4;
    const midi = n => 440 * Math.pow(2, (n - 69) / 12), D = Snd.musG;
    const base = s.key + root;
    // 貝斯
    const bassPat = s.drums >= 3 ? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] : [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1];
    if (bassPat[st]) Snd.tone(midi(base - 12 + (st % 8 === 6 ? 12 : 0)), sp * 0.9, 'triangle', 0.32, null, when, D);
    // 琶音
    if (st % 2 === 0) {
      const arp = [0, third, 7, 12, 7, third, 0, 12][(st / 2) | 0];
      Snd.tone(midi(base + 12 + arp), sp * 1.4, 'square', 0.035, null, when, D);
    }
    // 旋律
    const ph = this.bars[Math.floor(step / 32) % 4], local = step % 32;
    for (const n of ph) {
      const at = n.st + (local >= 16 ? 16 : 0);
      if (local === at && (local < 16 || n.st < 16)) {
        const iv = q === 'm' ? ({ 4: 3, 9: 8 }[n.deg] ?? n.deg) : n.deg;
        Snd.tone(midi(base + 24 + iv), sp * n.len * 1.6, 'square', 0.055, null, when, D);
        Snd.tone(midi(base + 24 + iv) * 1.005, sp * n.len * 1.6, 'sawtooth', 0.018, null, when, D);
      }
    }
    // 鼓
    if (s.drums >= 1) {
      if (st === 0 || st === 8 || (s.drums >= 2 && st === 10)) { Snd.tone(150, 0.12, 'sine', 0.55, 45, when, D); }
      if (s.drums >= 2 && (st === 4 || st === 12)) Snd.noise(0.12, 0.22, 4000, 1200, when, 'bandpass', D);
      if (st % 2 === 0) Snd.noise(0.03, s.drums >= 2 ? 0.06 : 0.035, 9000, 7000, when, 'highpass', D);
      if (s.drums >= 3 && st % 4 === 2) Snd.noise(0.05, 0.08, 8000, 6000, when, 'highpass', D);
    }
  },
};
