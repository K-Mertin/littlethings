'use strict';
// 聲音：全部用 WebAudio 即時合成（八音盒般的環境音樂＋音效），不用音檔
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
const Snd = {
  ctx: null, out: null, sfxG: null, musG: null, nb: null, rev: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const c = this.ctx = new C();
      this.out = c.createDynamicsCompressor(); this.out.connect(c.destination);
      this.master = c.createGain(); this.master.connect(this.out);
      this.sfxG = c.createGain(); this.sfxG.gain.value = 0.8; this.sfxG.connect(this.master);
      this.musG = c.createGain(); this.musG.gain.value = 0.26; this.musG.connect(this.master);
      // 簡單的回音，讓八音盒聽起來比較溫暖
      const d = c.createDelay(1); d.delayTime.value = 0.27; const fb = c.createGain(); fb.gain.value = 0.32; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      d.connect(lp); lp.connect(fb); fb.connect(d); const wet = c.createGain(); wet.gain.value = 0.35; lp.connect(wet); wet.connect(this.master);
      this.rev = d;
      const n = c.sampleRate, b = this.nb = c.createBuffer(1, n, n), dd = b.getChannelData(0);
      for (let i = 0; i < n; i++) dd[i] = Math.random() * 2 - 1;
      this.applyMute();
      setInterval(() => Music.tick(), 50);
    } catch (e) { this.ctx = null; }
  },
  applyMute() {
    document.body.classList.toggle('muted', !!Store.data.mute);
    if (this.ctx) this.master.gain.setTargetAtTime(Store.data.mute ? 0 : 1, this.ctx.currentTime, 0.05);
  },
  toggle() { Store.data.mute = !Store.data.mute; Store.save(); this.init(); this.applyMute(); },
  // 八音盒音色：正弦＋高次泛音，很快衰減
  bell(f, when = 0, g = 0.12, dur = 1.4, dest) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when;
    [[1, 1], [2.01, 0.35], [3.98, 0.12], [6.1, 0.05]].forEach(([m, a]) => {
      const o = c.createOscillator(), v = c.createGain();
      o.type = 'sine'; o.frequency.value = f * m;
      v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g * a, t + 0.006); v.gain.exponentialRampToValueAtTime(0.0001, t + dur / (m * 0.7 + 0.3));
      o.connect(v); v.connect(dest || this.sfxG); if (m === 1 && this.rev) v.connect(this.rev);
      o.start(t); o.stop(t + dur + 0.05);
    });
  },
  tone(f, dur, type = 'sine', g = 0.1, f2 = null, when = 0, dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), a = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(dest || this.sfxG); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, g = 0.2, f1 = 2000, f2 = 200, when = 0, type = 'lowpass') {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when, s = c.createBufferSource(), fl = c.createBiquadFilter(), a = c.createGain();
    s.buffer = this.nb; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(fl); fl.connect(a); a.connect(this.sfxG);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  piano(n, when = 0) { // n = MIDI 音高
    const f = NOTE(n); this.tone(f, 1.2, 'triangle', 0.16, null, when); this.tone(f * 2, 0.5, 'sine', 0.05, null, when);
  },
  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'tap': this.tone(1200, 0.05, 'sine', 0.05); break;
      case 'step': this.noise(0.12, 0.05, 900, 300); break;
      case 'turn': this.noise(0.22, 0.06, 1400, 400, 0, 'bandpass'); this.tone(300, 0.15, 'sine', 0.03, 220); break;
      case 'pick': this.bell(NOTE(84), 0, 0.09, 0.6); this.bell(NOTE(91), 0.08, 0.09, 0.9); break;
      case 'select': this.tone(880, 0.06, 'triangle', 0.05); break;
      case 'wrong': this.tone(180, 0.22, 'square', 0.05, 140); this.tone(170, 0.22, 'square', 0.04, 120, 0.12); break;
      case 'click': this.tone(2200, 0.03, 'square', 0.03); this.noise(0.04, 0.08, 4000, 1500, 0, 'bandpass'); break;
      case 'unlock': this.noise(0.06, 0.2, 3000, 800, 0, 'bandpass'); this.tone(1400, 0.05, 'square', 0.04, null, 0.05);[72, 76, 79, 84].forEach((n, i) => this.bell(NOTE(n), 0.1 + i * 0.08, 0.08, 0.9)); break;
      case 'open': this.noise(0.5, 0.08, 600, 200); this.tone(160, 0.5, 'sine', 0.05, 110); break;
      case 'door': this.noise(0.8, 0.12, 500, 120); this.tone(110, 0.6, 'sine', 0.08, 70);[67, 72, 76, 79].forEach((n, i) => this.bell(NOTE(n), 0.3 + i * 0.1, 0.07, 1.2)); break;
      case 'combine': this.tone(500, 0.08, 'triangle', 0.06, 900);[79, 84].forEach((n, i) => this.bell(NOTE(n), 0.1 + i * 0.1, 0.08, 0.8)); break;
      case 'page': this.noise(0.25, 0.1, 5000, 1500, 0, 'highpass'); break;
      case 'slide': this.noise(0.08, 0.07, 1800, 700, 0, 'bandpass'); break;
      case 'water': for (let i = 0; i < 6; i++) this.tone(600 + Math.random() * 900, 0.08, 'sine', 0.04, 300, i * 0.07); break;
      case 'snip': this.noise(0.05, 0.25, 6000, 3000, 0, 'highpass'); this.noise(0.05, 0.25, 6000, 3000, 0.12, 'highpass'); break;
      case 'light': this.tone(900, 0.5, 'sine', 0.05, 1800);[84, 88, 91].forEach((n, i) => this.bell(NOTE(n), 0.15 + i * 0.07, 0.06, 1)); break;
      case 'gear': for (let i = 0; i < 8; i++) this.noise(0.03, 0.12, 2500, 1200, i * 0.09, 'bandpass'); break;
      case 'beep': this.tone(1320, 0.08, 'square', 0.04); this.tone(1760, 0.1, 'square', 0.04, null, 0.1); break;
      case 'meow': this.tone(700, 0.4, 'triangle', 0.07, 1000); this.tone(1000, 0.25, 'triangle', 0.05, 600, 0.3); break;
      case 'solve': [72, 76, 79, 84, 88].forEach((n, i) => this.bell(NOTE(n), i * 0.09, 0.1, 1.6)); break;
      case 'fanfare': [[60, 0], [64, 0.15], [67, 0.3], [72, 0.45], [67, 0.7], [72, 0.85], [76, 1]].forEach(([n, t]) => { this.bell(NOTE(n + 12), t, 0.1, 1.5); this.tone(NOTE(n), 0.4, 'triangle', 0.05, null, t); }); break;
      case 'objection': this.noise(0.25, 0.3, 3000, 200); [60, 63, 67, 72].forEach(n => this.tone(NOTE(n), 0.6, 'sawtooth', 0.04)); this.tone(NOTE(48), 0.7, 'square', 0.06); break;
      case 'hurt': this.tone(300, 0.3, 'sawtooth', 0.06, 90); this.noise(0.2, 0.15, 1200, 100); break;
      case 'chime': this.bell(NOTE(76), 0, 0.12, 2); this.bell(NOTE(72), 0.5, 0.12, 2.4); break;
    }
  },
  melody(notes, step = 0.32) { notes.forEach((n, i) => n && this.bell(NOTE(n), i * step, 0.13, 1.6)); },
};

// 環境音樂：八音盒琶音＋柔和長音，每章不同的和弦進行
const Music = {
  mood: null, next: 0, step: 0, bar: 0,
  moods: {
    title: { bpm: 76, prog: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]] },
    warm: { bpm: 72, prog: [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 67]] },
    green: { bpm: 78, prog: [[65, 69, 72, 76], [62, 65, 69, 72], [58, 62, 65, 69], [60, 64, 67, 70]] },
    night: { bpm: 64, prog: [[57, 60, 64, 67], [53, 57, 60, 64], [60, 64, 67, 71], [55, 59, 62, 67]] },
    case: { bpm: 84, prog: [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 67]] },
    tense: { bpm: 96, prog: [[57, 60, 64, 69], [57, 60, 64, 69], [53, 57, 60, 65], [52, 56, 59, 64]] },
  },
  set(m) { if (this.mood === m) return; this.mood = m; this.step = 0; this.bar = 0; if (Snd.ctx) this.next = Snd.ctx.currentTime + 0.2; },
  tick() {
    const c = Snd.ctx; if (!c || !this.mood || Store.data.mute) { if (c) this.next = c.currentTime + 0.1; return; }
    const M = this.moods[this.mood]; const dt = 60 / M.bpm / 2;
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.3) {
      const ch = M.prog[this.bar % M.prog.length], t = this.next - c.currentTime;
      const pat = [0, 1, 2, 3, 2, 1, 3, 2];
      const n = ch[pat[this.step]] + 12;
      if (!(this.step === 7 && this.bar % 2)) Snd.bell(NOTE(n), t, this.step === 0 ? 0.075 : 0.05, 1.3, Snd.musG);
      if (this.step === 0) this.pad(ch, t, dt * 8);
      if (this.step === 0 || this.step === 4) Snd.tone(NOTE(ch[0] - 12), dt * 3, 'sine', 0.06, null, t, Snd.musG);
      this.next += dt; this.step++;
      if (this.step >= 8) { this.step = 0; this.bar++; }
    }
  },
  pad(ch, when, dur) {
    const c = Snd.ctx, t = c.currentTime + when;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g); g.connect(Snd.musG);
    ch.slice(0, 3).forEach((n, i) => { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = NOTE(n); o.detune.value = (i - 1) * 6; o.connect(f); o.start(t); o.stop(t + dur + 0.05); });
  },
};
