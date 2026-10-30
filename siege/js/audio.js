// 萬軍守城（複製自千軍突圍 rush/js）— WebAudio 音效與音樂（全部即時合成）
'use strict';

const AU = {
  ctx: null, master: null, sfxG: null, musG: null, noise: null, on: { sfx: true, music: true },
  last: {}, song: -1, nextT: 0, stepI: 0, boss: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const c = this.ctx = new C();
    this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(this.master);
    this.sfxG = c.createGain(); this.sfxG.gain.value = this.on.sfx ? 0.7 : 0; this.sfxG.connect(comp);
    this.musG = c.createGain(); this.musG.gain.value = this.on.music ? 0.32 : 0; this.musG.connect(comp);
    const n = c.createBuffer(1, c.sampleRate, c.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = n;
  },
  set(kind, v) {
    this.on[kind] = v;
    if (!this.ctx) return;
    const g = kind === 'sfx' ? this.sfxG : this.musG;
    g.gain.setTargetAtTime(v ? (kind === 'sfx' ? 0.7 : 0.32) : 0, this.ctx.currentTime, 0.05);
  },
  // 節流：同一種聲音每秒最多幾次
  ok(name, perSec) {
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (this.last[name] && now - this.last[name] < 1 / perSec) return false;
    this.last[name] = now; return true;
  },
  tone(f, dur, type, vol, slide, dest, when) {
    const c = this.ctx; if (!c) return;
    const t = when || c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxG); o.start(t); o.stop(t + dur + 0.02);
  },
  noiseHit(dur, vol, fc, q, dest, when, type) {
    const c = this.ctx; if (!c) return;
    const t = when || c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = fc || 1200; f.Q.value = q || 1;
    const g = c.createGain(); g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxG);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  sfx(name, a) {
    if (!this.ctx || !this.on.sfx) return;
    switch (name) {
      case 'shot': {
        if (!this.ok('shot', a === 'smg' ? 16 : 11)) return;
        if (a === 'rocket') { this.noiseHit(0.25, 0.18, 500, 0.8); this.tone(180, 0.2, 'sawtooth', 0.06, 70); }
        else if (a === 'laser') this.tone(1400, 0.09, 'square', 0.035, 500);
        else if (a === 'shotgun') this.noiseHit(0.12, 0.2, 900, 0.7);
        else this.noiseHit(0.05, 0.12, 2400 + Math.random() * 600, 1.4);
        break;
      }
      case 'gateGood': { const c = this.ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.18, 0, null, c + i * 0.055)); break; }
      case 'gateBad': { const c = this.ctx.currentTime; [440, 349, 262].forEach((f, i) => this.tone(f, 0.22, 'sawtooth', 0.1, f * 0.8, null, c + i * 0.08)); break; }
      case 'gateWpn': { const c = this.ctx.currentTime; this.noiseHit(0.08, 0.15, 3000, 2); [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.08, 0, null, c + 0.05 + i * 0.045)); break; }
      case 'bump': if (this.ok('bump', 14)) this.tone(900 + Math.min(900, (a || 0) * 12), 0.05, 'triangle', 0.06); break;
      case 'flip': this.tone(660, 0.2, 'triangle', 0.15, 1320); break;
      case 'kill': if (this.ok('kill', 18)) { this.tone(320 + Math.random() * 120, 0.08, 'square', 0.06, 120); this.noiseHit(0.06, 0.06, 1500, 1); } break;
      case 'hit': if (this.ok('hit', 10)) { this.tone(140, 0.16, 'sine', 0.3, 60); this.noiseHit(0.1, 0.12, 400, 0.7); } break;
      case 'boom': this.noiseHit(0.6, 0.45, 300, 0.6, null, null, 'lowpass'); this.tone(90, 0.5, 'sine', 0.4, 35); break;
      case 'rocket': if (this.ok('rkt', 8)) this.noiseHit(0.25, 0.16, 350, 0.6, null, null, 'lowpass'); break;
      case 'boss': { const c = this.ctx.currentTime; for (let i = 0; i < 3; i++) this.tone(220, 0.35, 'sawtooth', 0.13, 200, null, c + i * 0.5); this.tone(55, 1.4, 'sine', 0.35, 40, null, c); break; }
      case 'slam': this.tone(70, 0.4, 'sine', 0.5, 30); this.noiseHit(0.3, 0.25, 250, 0.6, null, null, 'lowpass'); break;
      case 'rage': this.tone(110, 0.9, 'sawtooth', 0.18, 330); this.noiseHit(0.8, 0.12, 600, 0.5); break;
      case 'bossdie': { const c = this.ctx.currentTime; for (let i = 0; i < 5; i++) { this.noiseHit(0.5, 0.35, 250 + i * 80, 0.6, null, c + i * 0.18, 'lowpass'); this.tone(120 - i * 12, 0.4, 'sine', 0.3, 40, null, c + i * 0.18); } break; }
      case 'win': { const c = this.ctx.currentTime; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, i === 6 ? 0.6 : 0.16, 'square', 0.1, 0, null, c + i * 0.11)); break; }
      case 'lose': { const c = this.ctx.currentTime; [392, 370, 349, 262].forEach((f, i) => this.tone(f, i === 3 ? 0.7 : 0.25, 'triangle', 0.18, 0, null, c + i * 0.25)); break; }
      case 'click': this.tone(880, 0.05, 'triangle', 0.1); break;
      case 'throw': if (this.ok('throw', 6)) this.tone(500, 0.25, 'sine', 0.08, 900); break;
      case 'land': if (this.ok('land', 8)) { this.noiseHit(0.3, 0.25, 300, 0.6, null, null, 'lowpass'); this.tone(80, 0.25, 'sine', 0.25, 40); } break;
      case 'split': this.tone(300, 0.15, 'sine', 0.12, 700); break;
      case 'wallbreak': this.noiseHit(0.5, 0.4, 500, 0.5, null, null, 'lowpass'); this.tone(120, 0.3, 'square', 0.1, 50); break;
      case 'crate': { const c = this.ctx.currentTime; this.noiseHit(0.12, 0.2, 1500, 1); [659, 880, 1175].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.14, 0, null, c + 0.05 + i * 0.05)); break; }
      case 'saw': if (this.ok('saw', 6)) this.tone(1800, 0.12, 'sawtooth', 0.06, 900); break;
      case 'spike': this.noiseHit(0.15, 0.25, 3000, 2); this.tone(200, 0.15, 'square', 0.1, 80); break;
      case 'tick': if (this.ok('tick', 5)) this.tone(1500, 0.03, 'square', 0.04); break;
      case 'warn': { const c = this.ctx.currentTime; for (let i = 0; i < 2; i++) this.tone(880, 0.12, 'square', 0.08, 0, null, c + i * 0.18); break; }
      case 'buy': { const c = this.ctx.currentTime; [784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.15, 0, null, c + i * 0.06)); break; }
      case 'star': this.tone(1047 + (a || 0) * 260, 0.25, 'triangle', 0.18); break;
      case 'heal': if (this.ok('heal', 3)) { const c = this.ctx.currentTime; [784, 988, 1175].forEach((f, i) => this.tone(f, 0.1, 'sine', 0.08, 0, null, c + i * 0.04)); } break;
      case 'mortar': if (this.ok('mortar', 4)) { this.tone(160, 0.18, 'sine', 0.22, 60); this.noiseHit(0.12, 0.12, 700, 0.7); } break;
      case 'lava': if (this.ok('lava', 5)) { this.noiseHit(0.25, 0.18, 900, 0.6); this.tone(240, 0.2, 'sawtooth', 0.06, 120); } break;
      case 'geyser': if (this.ok('geyser', 4)) { this.noiseHit(0.6, 0.22, 600, 0.4, null, null, 'lowpass'); this.tone(90, 0.5, 'sawtooth', 0.08, 50); } break;
      case 'breath': this.noiseHit(1.2, 0.3, 500, 0.5, null, null, 'lowpass'); this.tone(140, 1.0, 'sawtooth', 0.1, 70); break;
      case 'buff': { const c = this.ctx.currentTime; [523, 784, 1047, 1568].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.13, 0, null, c + i * 0.05)); break; }
      case 'blocked': if (this.ok('blocked', 6)) this.tone(1200, 0.08, 'triangle', 0.08, 1800); break;
    }
  },
  // ---- 音樂：簡單的步進編曲 ----
  SONGS: [
    { bpm: 132, root: 48, prog: [0, 5, 7, 5], scale: [0, 2, 4, 7, 9] },       // 綠野：大調五聲
    { bpm: 126, root: 45, prog: [0, 3, 5, 3], scale: [0, 3, 5, 7, 10] },      // 沙漠：小調五聲
    { bpm: 120, root: 50, prog: [0, 8, 5, 7], scale: [0, 2, 3, 7, 8] },       // 雪原
    { bpm: 138, root: 43, prog: [0, 0, 3, 5], scale: [0, 3, 5, 6, 7, 10] },   // 夜城
    { bpm: 144, root: 40, prog: [0, 1, 0, 8], scale: [0, 1, 4, 5, 7, 8] },    // 火山：弗里吉亞屬音
  ],
  music(i, boss) {
    if (!this.ctx) return;
    if (this.song === i && this.boss === !!boss) return;
    this.song = i; this.boss = !!boss;
    this.nextT = this.ctx.currentTime + 0.1; this.stepI = 0;
  },
  stop() { this.song = -1; },
  tick() {
    const c = this.ctx; if (!c || this.song < 0) return;
    const S = this.SONGS[this.song];
    const bpm = S.bpm * (this.boss ? 1.12 : 1);
    const st = 60 / bpm / 4;
    while (this.nextT < c.currentTime + 0.15) {
      const t = this.nextT, i = this.stepI;
      const bar = Math.floor(i / 16) % 4, s16 = i % 16;
      const root = S.root + S.prog[bar] + (this.boss ? -1 : 0);
      const hz = m => 440 * Math.pow(2, (m - 69) / 12);
      const D = this.musG;
      // 鼓
      if (s16 % 4 === 0) { this.tone(110, 0.14, 'sine', 0.5, 40, D, t); }
      if (s16 === 4 || s16 === 12) this.noiseHit(0.12, 0.22, 1800, 0.8, D, t);
      if (s16 % 2 === 1) this.noiseHit(0.03, 0.08, 7000, 1, D, t, 'highpass');
      // 貝斯
      if (s16 % 2 === 0) this.tone(hz(root - 12 + (s16 % 8 === 6 ? 7 : 0)), st * 1.6, 'triangle', 0.32, 0, D, t);
      // 琶音
      if (this.boss ? true : s16 % 2 === 0) {
        const sc = S.scale, k = (i * 3 + bar) % (sc.length * 2);
        const n = root + 12 + sc[k % sc.length] + (k >= sc.length ? 12 : 0);
        this.tone(hz(n), st * 0.9, 'square', this.boss ? 0.05 : 0.06, 0, D, t);
      }
      // 旋律（每兩小節換一句）
      if (!this.boss && (s16 === 0 || s16 === 6 || s16 === 10)) {
        const sc = S.scale, k = (bar * 5 + s16) % sc.length;
        this.tone(hz(root + 24 + sc[k]), st * 3, 'triangle', 0.07, 0, D, t);
      }
      this.nextT += st; this.stepI++;
    }
  },
};
