'use strict';
// 深淵地牢：WebAudio 即時合成音效與環境音樂（不需要音檔）
const Snd = {
  ctx: null, out: null, sfxG: null, musG: null, wet: null, nb: null, last: Object.create(null),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const c = this.ctx = new C();
      this.out = c.createDynamicsCompressor(); this.out.threshold.value = -14; this.out.connect(c.destination);
      this.sfxG = c.createGain(); this.sfxG.connect(this.out);
      this.musG = c.createGain(); this.musG.connect(this.out);
      // 音樂用的回音
      const dl = c.createDelay(1); dl.delayTime.value = 0.37; const fb = c.createGain(); fb.gain.value = 0.38;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      this.wet = c.createGain(); this.wet.gain.value = 0.55;
      this.wet.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(this.musG);
      this.applyVol();
      const n = c.sampleRate, b = this.nb = c.createBuffer(1, n, n), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      setInterval(() => Music.tick(), 50);
    } catch (e) { this.ctx = null; }
  },
  applyVol() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxG.gain.setTargetAtTime(Store.set.sfx ? 0.85 : 0, t, 0.05);
    this.musG.gain.setTargetAtTime(Store.set.music ? 0.38 : 0, t, 0.2);
  },
  tone(f, dur, type = 'square', g = 0.1, f2 = null, when = 0, dest = null, atk = 0.004) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), a = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(g, t + atk); a.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(a); a.connect(dest || this.sfxG); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, g = 0.2, f1 = 2000, f2 = 200, when = 0, type = 'lowpass', dest = null, q = 1) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when, s = c.createBufferSource(), fl = c.createBiquadFilter(), a = c.createGain();
    s.buffer = this.nb; s.loop = true;
    fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    s.connect(fl); fl.connect(a); a.connect(dest || this.sfxG);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },
  arp(notes, gap, type = 'square', g = 0.06, dur = 0.12) { notes.forEach((f, i) => this.tone(f, dur, type, g, null, i * gap)); },
  play(name) {
    if (!this.ctx || !Store.set.sfx) return;
    const now = this.ctx.currentTime, gap = { hit: 0.05, miss: 0.05, hurt: 0.06, mdie: 0.05, pick: 0.06, gold: 0.08, step: 0.05, zap: 0.05, warn: 0.5 }[name] || 0.02;
    if (this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    const r = 1 + (Math.random() - 0.5) * 0.12;
    switch (name) {
      case 'step': this.noise(0.05, 0.03, 900, 300, 0, 'bandpass'); break;
      case 'hit': this.noise(0.09, 0.22, 2600 * r, 500, 0, 'bandpass', null, 1.2); this.tone(180 * r, 0.08, 'square', 0.06, 70); break;
      case 'crit': this.noise(0.16, 0.3, 4000, 300, 0, 'bandpass'); this.tone(320, 0.18, 'sawtooth', 0.08, 60); this.tone(1200, 0.08, 'square', 0.04, 1800, 0.02); break;
      case 'miss': this.noise(0.12, 0.08, 1800 * r, 4000, 0, 'bandpass', null, 2); break;
      case 'hurt': this.tone(240 * r, 0.16, 'sawtooth', 0.1, 90); this.noise(0.12, 0.16, 1400, 200); break;
      case 'mdie': this.tone(420 * r, 0.22, 'square', 0.06, 70); this.noise(0.2, 0.12, 1800, 120); break;
      case 'bigdie': this.noise(1.2, 0.4, 1600, 50); this.tone(110, 1.0, 'sawtooth', 0.2, 30); this.arp([392, 330, 262, 196], 0.12, 'square', 0.05, 0.3); break;
      case 'death': this.tone(392, 0.4, 'triangle', 0.12, null, 0); this.tone(330, 0.4, 'triangle', 0.12, null, 0.35); this.tone(262, 0.5, 'triangle', 0.12, null, 0.7); this.tone(196, 1.4, 'triangle', 0.14, 98, 1.05); this.noise(1.0, 0.2, 800, 60); break;
      case 'victory': this.arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.12, 'square', 0.07, 0.3); this.tone(262, 1.6, 'triangle', 0.12, null, 0.96); break;
      case 'pick': this.tone(880 * r, 0.06, 'square', 0.04); this.tone(1320 * r, 0.08, 'square', 0.035, null, 0.05); break;
      case 'gold': this.tone(1568, 0.07, 'square', 0.035); this.tone(2093, 0.12, 'square', 0.03, null, 0.06); break;
      case 'drink': for (let i = 0; i < 4; i++) this.tone(300 + i * 90 + Math.random() * 40, 0.07, 'sine', 0.08, 500 + i * 100, i * 0.07); break;
      case 'read': this.noise(0.25, 0.08, 6000, 2000, 0, 'highpass'); this.arp([660, 990, 1320], 0.07, 'triangle', 0.05, 0.25); break;
      case 'equip': this.noise(0.08, 0.12, 3000, 800, 0, 'bandpass'); this.tone(520, 0.1, 'square', 0.04, null, 0.04); break;
      case 'curse': this.tone(180, 0.6, 'sawtooth', 0.09, 90); this.tone(190, 0.6, 'sawtooth', 0.07, 85); break;
      case 'eat': for (let i = 0; i < 3; i++) this.noise(0.06, 0.12, 1200, 400, i * 0.12, 'bandpass'); break;
      case 'door': this.noise(0.18, 0.12, 500, 120, 0, 'lowpass'); this.tone(140, 0.12, 'triangle', 0.06, 90); break;
      case 'stairs': for (let i = 0; i < 5; i++) { this.noise(0.08, 0.1, 700 - i * 80, 200, i * 0.11, 'lowpass'); } this.tone(330, 0.6, 'triangle', 0.06, 165, 0.1); break;
      case 'secret': this.arp([784, 988, 1175, 1568], 0.06, 'triangle', 0.07, 0.2); break;
      case 'trap': this.tone(1200, 0.05, 'square', 0.06); this.noise(0.3, 0.25, 2500, 300, 0.03); break;
      case 'alarm': for (let i = 0; i < 6; i++) this.tone(i % 2 ? 880 : 660, 0.18, 'square', 0.06, null, i * 0.2); break;
      case 'warn': this.tone(440, 0.15, 'triangle', 0.06); this.tone(370, 0.25, 'triangle', 0.06, null, 0.15); break;
      case 'level': this.arp([523, 659, 784, 1047, 1319], 0.08, 'square', 0.07, 0.22); this.tone(1047, 0.6, 'triangle', 0.06, null, 0.4); break;
      case 'zap': this.tone(900, 0.1, 'sawtooth', 0.04, 1600); break;
      case 'thunder': this.noise(0.35, 0.3, 5000, 400, 0, 'bandpass', null, 0.7); this.tone(80, 0.3, 'sawtooth', 0.12, 40); break;
      case 'fire': this.noise(0.5, 0.28, 1400, 200, 0, 'lowpass'); this.tone(90, 0.4, 'sine', 0.15, 40); break;
      case 'ice': this.arp([1760, 2349, 2093, 2637], 0.04, 'sine', 0.05, 0.3); this.noise(0.3, 0.1, 8000, 3000, 0, 'highpass'); break;
      case 'magic': this.tone(600, 0.2, 'triangle', 0.08, 1400); this.tone(900, 0.2, 'sine', 0.05, 2000, 0.03); break;
      case 'bow': this.tone(220, 0.08, 'triangle', 0.08, 120); this.noise(0.12, 0.08, 3000, 6000, 0.02, 'bandpass', null, 3); break;
      case 'throw': this.noise(0.14, 0.08, 1500, 4000, 0, 'bandpass', null, 2); break;
      case 'shatter': for (let i = 0; i < 5; i++) this.tone(2000 + Math.random() * 3000, 0.08, 'square', 0.02, null, i * 0.02); this.noise(0.2, 0.15, 6000, 2000, 0, 'highpass'); break;
      case 'tele': this.tone(300, 0.4, 'sine', 0.08, 1800); this.tone(310, 0.4, 'triangle', 0.05, 1900, 0.05); break;
      case 'summon': this.tone(120, 0.6, 'sawtooth', 0.1, 220); this.noise(0.6, 0.14, 400, 2000, 0, 'bandpass'); break;
      case 'roar': this.noise(0.8, 0.3, 700, 120, 0, 'lowpass'); this.tone(90, 0.8, 'sawtooth', 0.14, 55); this.tone(95, 0.8, 'sawtooth', 0.1, 50); break;
      case 'whirl': this.noise(0.35, 0.2, 800, 4000, 0, 'bandpass', null, 2); break;
      case 'charge': this.noise(0.3, 0.2, 400, 2400, 0, 'bandpass'); this.tone(150, 0.25, 'square', 0.08, 60, 0.15); break;
      case 'stealth': this.tone(800, 0.5, 'sine', 0.05, 200); break;
      case 'haste': this.arp([660, 880, 1100, 1320], 0.04, 'triangle', 0.05, 0.15); break;
      case 'holy': this.tone(784, 0.8, 'triangle', 0.07); this.tone(988, 0.8, 'triangle', 0.06, null, 0.05); this.tone(1175, 0.8, 'triangle', 0.05, null, 0.1); break;
      case 'select': this.tone(880, 0.05, 'square', 0.04); break;
      case 'click': this.tone(600, 0.03, 'square', 0.03); break;
      case 'start': this.arp([262, 330, 392, 523], 0.09, 'triangle', 0.09, 0.4); break;
    }
  },
};

// 環境音樂：和弦墊音＋低音持續音＋零星的琶音與鐘聲；頭目戰加鼓
const SCALES = { aeo: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], phr: [0, 1, 3, 5, 7, 8, 10], hm: [0, 2, 3, 5, 7, 8, 11], lyd: [0, 2, 4, 6, 7, 9, 11] };
const SONGS = {
  title: { bpm: 70, root: 50, sc: 'aeo', prog: [0, 5, 3, 4], arp: 0.5, bell: 0.18, pad: 0.05 },
  b0: { bpm: 76, root: 45, sc: 'aeo', prog: [0, 0, 5, 6, 3, 3, 4, 4], arp: 0.35, bell: 0.08, pad: 0.045 },
  b1: { bpm: 66, root: 52, sc: 'dor', prog: [0, 3, 0, 6], arp: 0.25, bell: 0.22, pad: 0.04 },
  b2: { bpm: 84, root: 38, sc: 'phr', prog: [0, 0, 1, 0, 6, 0, 1, 5], arp: 0.3, bell: 0.05, pad: 0.04, tom: 1 },
  b3: { bpm: 68, root: 54, sc: 'aeo', prog: [0, 5, 2, 6], arp: 0.3, bell: 0.3, pad: 0.035, high: 1 },
  b4: { bpm: 72, root: 41, sc: 'hm', prog: [0, 0, 5, 4], arp: 0.3, bell: 0.1, pad: 0.045 },
  boss: { bpm: 132, root: 40, sc: 'hm', prog: [0, 0, 5, 4, 0, 0, 1, 4], arp: 0.85, bell: 0, pad: 0.035, drums: 1 },
};
const midiF = m => 440 * Math.pow(2, (m - 69) / 12);
const Music = {
  cur: null, song: null, step: 0, next: 0,
  play(name) {
    if (this.cur === name) return;
    this.cur = name; this.song = SONGS[name] || null; this.step = 0;
    if (Snd.ctx) this.next = Snd.ctx.currentTime + 0.15;
  },
  stop() { this.cur = null; this.song = null; },
  tick() {
    const c = Snd.ctx; if (!c || !this.song || !Store.set.music) return;
    const S = this.song, spb = 60 / S.bpm / 2;
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.3) { this.sched(S, this.step, this.next); this.next += spb; this.step++; }
  },
  deg(S, d, oct = 0) { const sc = SCALES[S.sc], n = sc.length; const o = Math.floor(d / n); return S.root + sc[((d % n) + n) % n] + 12 * (o + oct); },
  voice(f, t, dur, type, g, cut, atk = 0.01, dest) {
    const c = Snd.ctx, o = c.createOscillator(), a = c.createGain(), fl = c.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut;
    a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(g, t + atk); a.gain.setTargetAtTime(0.0001, t + atk, dur / 3);
    o.connect(fl); fl.connect(a); a.connect(dest || Snd.musG); o.start(t); o.stop(t + dur * 1.6 + 0.1);
    return a;
  },
  sched(S, step, t) {
    const bar = Math.floor(step / 8), s = step % 8, chord = S.prog[bar % S.prog.length], spb = 60 / S.bpm / 2;
    const h = hash2(step, bar, S.root * 7);
    if (s === 0) {
      // 和弦墊音
      for (const k of [0, 2, 4]) { const f = midiF(this.deg(S, chord + k, 1)); this.voice(f, t, spb * 8, 'sawtooth', S.pad * 0.5, 700, 0.8); this.voice(f * 1.006, t, spb * 8, 'triangle', S.pad, 1200, 0.9); }
      // 低音
      this.voice(midiF(this.deg(S, chord, -1)), t, spb * 8, 'sine', 0.16, 400, 0.2);
    }
    if (S.drums) {
      if (s === 0 || s === 4 || (s === 6 && h < 0.4)) { const c = Snd.ctx, o = c.createOscillator(), a = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); a.gain.setValueAtTime(0.45, t); a.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(a); a.connect(Snd.musG); o.start(t); o.stop(t + 0.25); }
      if (s === 2 || s === 6) this.noiseAt(t, 0.14, 0.22, 1800);
      this.noiseAt(t, 0.03, 0.05, 8000, 'highpass');
      if (s % 2 === 0) this.voice(midiF(this.deg(S, chord, -1)), t, spb * 1.2, 'square', 0.05, 500, 0.005);
    }
    if (S.tom && (s === 0 || (s === 3 && h < 0.5))) { const c = Snd.ctx, o = c.createOscillator(), a = c.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.3); a.gain.setValueAtTime(0.25, t); a.gain.exponentialRampToValueAtTime(0.001, t + 0.4); o.connect(a); a.connect(Snd.musG); o.start(t); o.stop(t + 0.45); }
    // 琶音
    if (h < S.arp) {
      const k = [0, 2, 4, 7, 4, 2][(step + bar) % 6], f = midiF(this.deg(S, chord + k, S.high ? 2 : 1));
      const g = this.voice(f, t, spb * 2.5, S.drums ? 'square' : 'triangle', S.drums ? 0.025 : 0.045, S.drums ? 1800 : 2600, 0.005);
      g.connect(Snd.wet);
    }
    // 鐘聲旋律
    if (S.bell && hash2(bar, s, 99 + S.root) < S.bell && s % 2 === 0) {
      const f = midiF(this.deg(S, chord + [0, 2, 4, 6, 7][(h * 5) | 0], 2));
      const g = this.voice(f, t, 1.6, 'sine', 0.05, 5000, 0.004); g.connect(Snd.wet);
      const g2 = this.voice(f * 2.01, t, 0.8, 'sine', 0.012, 6000, 0.004); g2.connect(Snd.wet);
    }
  },
  noiseAt(t, dur, g, f, type = 'bandpass') {
    const c = Snd.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), a = c.createGain();
    s.buffer = Snd.nb; fl.type = type; fl.frequency.value = f; a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(a); a.connect(Snd.musG); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
};
