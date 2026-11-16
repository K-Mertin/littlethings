// 沙之實驗室的聲音（WebAudio 合成，沒有音檔）
// 倒材料時有對應的聲音：沙沙、嘩啦、轟轟、劈啪；按鈕、過關、失敗也有音效
const POUR = {
  sand: { type: 'highpass', f: 2600, q: 0.6, g: 0.10, wob: 0 },
  seed: { type: 'highpass', f: 3200, q: 0.8, g: 0.06, wob: 0 },
  water: { type: 'lowpass', f: 900, q: 6, g: 0.16, wob: 1 },
  oil: { type: 'lowpass', f: 500, q: 4, g: 0.14, wob: 0.6 },
  lava: { type: 'lowpass', f: 220, q: 2, g: 0.22, wob: 0.3 },
  fire: { type: 'bandpass', f: 1800, q: 0.7, g: 0.08, crackle: true },
  ice: { type: 'bandpass', f: 4200, q: 6, g: 0.05, wob: 0 },
  erase: { type: 'bandpass', f: 1200, q: 1, g: 0.05, wob: 0 },
};
export class Sound {
  constructor() { this.on = true; this.ctx = null; this.cur = null; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.on ? 0.8 : 0; this.master.connect(c.destination);
    const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = b;
    // 一條一直開著的「倒東西」聲道，用音量開關
    const src = c.createBufferSource(); src.buffer = b; src.loop = true;
    this.pf = c.createBiquadFilter(); this.pg = c.createGain(); this.pg.gain.value = 0;
    src.connect(this.pf).connect(this.pg).connect(this.master); src.start();
    this.lfo = c.createOscillator(); this.lfoG = c.createGain(); this.lfo.frequency.value = 7; this.lfoG.gain.value = 0;
    this.lfo.connect(this.lfoG).connect(this.pf.frequency); this.lfo.start();
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.8 : 0; }
  pour(tool) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, p = POUR[tool];
    if (!p) { this.click(); this.pg.gain.setTargetAtTime(0, t, 0.05); this.cur = null; return; }
    this.cur = tool;
    this.pf.type = p.type; this.pf.frequency.setValueAtTime(p.f, t); this.pf.Q.value = p.q;
    this.lfoG.gain.value = p.wob * p.f * 0.4; this.lfo.frequency.value = 5 + Math.random() * 5;
    this.pg.gain.setTargetAtTime(p.g, t, 0.04);
  }
  stop() { if (!this.ctx) return; this.pg.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06); this.cur = null; }
  tick() {   // 每格呼叫：火的劈啪聲
    if (!this.ctx || this.cur !== 'fire') return;
    if (Math.random() < 0.25) this.burst(1500 + Math.random() * 2500, 0.03, 0.12);
  }
  burst(f, dur, g) {
    const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.noise;
    const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = 3;
    const e = c.createGain(); e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(e).connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  tone(f, dur, g = 0.12, type = 'sine', at = 0) {
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), e = c.createGain();
    o.type = type; o.frequency.value = f; e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  click() { if (this.ctx) this.tone(880, 0.06, 0.08, 'triangle'); }
  win() { if (this.ctx) [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.5, 0.14, 'triangle', i * 0.11)); }
  lose() { if (this.ctx) [392, 330, 262].forEach((f, i) => this.tone(f, 0.45, 0.12, 'sine', i * 0.16)); }
}
