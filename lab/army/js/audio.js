// 聲音（WebAudio 合成）：戰鼓、刀劍碰撞、射箭的咻咻聲、號角、勝利
export class Sound {
  constructor() { this.on = true; this.ctx = null; this.clashAcc = 0; this.volleyAcc = 0; this.drumT = 0; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.on ? 0.7 : 0; this.master.connect(c.destination);
    const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.7 : 0; }
  burst({ f = 3000, q = 4, dur = 0.08, g = 0.2, type = 'bandpass', at = 0 }) {
    const c = this.ctx, t = c.currentTime + at, s = c.createBufferSource(); s.buffer = this.noise;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const e = c.createGain(); e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(e).connect(this.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  drum(at = 0, g = 0.35) {
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), e = c.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
    e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(e).connect(this.master); o.start(t); o.stop(t + 0.45);
  }
  horn() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    for (const [f, d] of [[220, 0], [330, 0.02]]) {
      const o = c.createOscillator(), e = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.9, t + d); o.frequency.linearRampToValueAtTime(f, t + d + 0.3);
      e.gain.setValueAtTime(0, t + d); e.gain.linearRampToValueAtTime(0.12, t + d + 0.2); e.gain.setValueAtTime(0.12, t + 1.3); e.gain.linearRampToValueAtTime(0, t + 1.8);
      o.connect(lp).connect(e).connect(this.master); o.start(t + d); o.stop(t + 1.9);
    }
  }
  fanfare(win) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, notes = win ? [523, 659, 784, 1047] : [392, 330, 262];
    notes.forEach((f, i) => { const o = c.createOscillator(), e = c.createGain(), s = t + i * 0.18; o.type = 'triangle'; o.frequency.value = f; e.gain.setValueAtTime(0.2, s); e.gain.exponentialRampToValueAtTime(0.0001, s + 0.6); o.connect(e).connect(this.master); o.start(s); o.stop(s + 0.65); });
  }
  // 每格：依這一格發生多少碰撞、射了多少箭，發出對應的聲音（有上限）
  update(dt, ev, fighting) {
    if (!this.ctx) return;
    this.clashAcc += ev.clash; this.volleyAcc += ev.volley; ev.clash = 0; ev.volley = 0;
    if (this.clashAcc > 0) { const k = Math.min(3, Math.ceil(this.clashAcc / 25)); for (let i = 0; i < k; i++) this.burst({ f: 2500 + Math.random() * 3000, q: 8, dur: 0.06, g: 0.06 + Math.random() * 0.05, at: Math.random() * 0.05 }); this.clashAcc = 0; }
    if (this.volleyAcc > 12) { this.burst({ f: 1800, q: 1.2, dur: 0.45, g: 0.08, type: 'bandpass' }); this.volleyAcc = 0; }
    if (fighting) { this.drumT -= dt; if (this.drumT <= 0) { this.drum(0, 0.3); this.drum(0.28, 0.2); this.drumT = 1.1; } }
  }
}
