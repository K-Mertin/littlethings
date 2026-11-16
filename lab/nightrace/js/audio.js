// 聲音（WebAudio 合成）：引擎（轉速跟著速度和檔位）、雨聲、輪胎打滑、撞牆、倒數嗶聲
export class Sound {
  constructor() { this.on = true; this.ctx = null; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.on ? 0.7 : 0; this.master.connect(c.destination);
    const len = c.sampleRate * 2, nb = c.createBuffer(1, len, c.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = nb;
    const loop = (f, q, type) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(this.master); s.start(); return { g, fl }; };
    this.rain = loop(2600, 0.4, 'highpass'); this.rain2 = loop(500, 0.7, 'lowpass');
    this.skid = loop(1300, 3, 'bandpass');
    // 引擎：兩個鋸齒波＋低通
    this.eng = c.createGain(); this.eng.gain.value = 0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 2;
    this.o1 = c.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = c.createOscillator(); this.o2.type = 'square';
    const g2 = c.createGain(); g2.gain.value = 0.35;
    this.o1.connect(lp); this.o2.connect(g2).connect(lp); lp.connect(this.eng).connect(this.master);
    this.o1.start(); this.o2.start(); this.lp = lp;
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.7 : 0; }
  update({ speed, gas, slip, rain, racing }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, kmh = Math.abs(speed) * 3.6;
    // 假的換檔：每個檔位轉速從低爬到高
    const gears = [0, 45, 85, 125, 165, 230]; let g = 1; while (g < gears.length - 1 && kmh > gears[g]) g++;
    const r = (kmh - gears[g - 1]) / (gears[g] - gears[g - 1]);
    const rpm = 900 + Math.max(0, Math.min(1, r)) * 5200 + gas * 300;
    const f = rpm / 60 * 2;
    this.o1.frequency.setTargetAtTime(f, t, 0.05); this.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    this.lp.frequency.setTargetAtTime(500 + gas * 1400 + kmh * 4, t, 0.1);
    this.eng.gain.setTargetAtTime(racing ? 0.05 + gas * 0.06 : 0.03, t, 0.1);
    this.rain.g.gain.setTargetAtTime(rain * 0.08, t, 0.5); this.rain2.g.gain.setTargetAtTime(rain * 0.12, t, 0.5);
    this.skid.g.gain.setTargetAtTime(Math.min(0.12, Math.max(0, slip - 2) * 0.02), t, 0.06);
  }
  beep(high) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), e = c.createGain();
    o.type = 'square'; o.frequency.value = high ? 1320 : 660; e.gain.setValueAtTime(0.12, t); e.gain.exponentialRampToValueAtTime(0.0001, t + (high ? 0.6 : 0.25));
    o.connect(e).connect(this.master); o.start(t); o.stop(t + 0.65);
  }
  hit(k) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.noise;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 600; const e = c.createGain();
    e.gain.setValueAtTime(0.25 * k, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    s.connect(fl).connect(e).connect(this.master); s.start(t); s.stop(t + 0.32);
  }
  fanfare() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => { const o = c.createOscillator(), e = c.createGain(), s = t + i * 0.14; o.type = 'triangle'; o.frequency.value = f; e.gain.setValueAtTime(0.18, s); e.gain.exponentialRampToValueAtTime(0.0001, s + 0.55); o.connect(e).connect(this.master); o.start(s); o.stop(s + 0.6); });
  }
}
