// 聲音：水底的低沉環境音、潛艇馬達、發現新生物的聲納「叮」、撿垃圾的泡泡聲（全部用 WebAudio 合成，沒有音檔）
export class Sound {
  constructor() { this.on = true; this.ctx = null; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.on ? 0.8 : 0; this.master.connect(c.destination);
    // 環境音：棕噪音＋低通
    const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    this.amb = c.createGain(); this.amb.gain.value = 0.35;
    src.connect(lp).connect(this.amb).connect(this.master); src.start();
    // 馬達
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 52;
    const mlp = c.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 180;
    this.motor = c.createGain(); this.motor.gain.value = 0;
    o.connect(mlp).connect(this.motor).connect(this.master); o.start();
    this.motorOsc = o;
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.8 : 0; }
  update(speed, depth) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.motor.gain.setTargetAtTime(Math.min(1, speed / 8) * 0.09, t, 0.15);
    this.motorOsc.frequency.setTargetAtTime(45 + speed * 6, t, 0.2);
    this.amb.gain.setTargetAtTime(0.25 + Math.min(1, depth / 90) * 0.2, t, 0.5);
  }
  ping() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    for (const [dt, g] of [[0, 0.25], [0.32, 0.1], [0.64, 0.04]]) {
      const o = c.createOscillator(), e = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1320, t + dt); o.frequency.exponentialRampToValueAtTime(880, t + dt + 0.5);
      e.gain.setValueAtTime(0, t + dt); e.gain.linearRampToValueAtTime(g, t + dt + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.7);
      o.connect(e).connect(this.master); o.start(t + dt); o.stop(t + dt + 0.8);
    }
  }
  bubble() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    for (let i = 0; i < 4; i++) {
      const o = c.createOscillator(), e = c.createGain(), s = t + i * 0.06;
      o.type = 'sine'; o.frequency.setValueAtTime(300 + Math.random() * 300, s); o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 400, s + 0.08);
      e.gain.setValueAtTime(0.12, s); e.gain.exponentialRampToValueAtTime(0.0001, s + 0.1);
      o.connect(e).connect(this.master); o.start(s); o.stop(s + 0.12);
    }
  }
  fanfare() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = c.createOscillator(), e = c.createGain(), s = t + i * 0.13;
      o.type = 'triangle'; o.frequency.value = f; e.gain.setValueAtTime(0.18, s); e.gain.exponentialRampToValueAtTime(0.0001, s + 0.5);
      o.connect(e).connect(this.master); o.start(s); o.stop(s + 0.55);
    });
  }
}
