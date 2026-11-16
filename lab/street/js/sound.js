// 聲音全部用 Web Audio 即時合成：腳步聲、街道環境音、鳥叫、大廳電子音、投幣聲、自動門鈴
export class Sound {
  constructor(on) { this.on = on; this.ctx = null; this.area = 'street'; this.birdT = 2; this.beepT = 1; this.doorDing = false; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.on ? 0.9 : 0; this.master.connect(c.destination);
    // noise buffer
    const n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
    this.noise = buf;
    // ambience beds
    const bed = (freq, q, gain) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(this.master); s.start(); return g; };
    this.streetBed = bed(700, .3, 0); this.hallBed = bed(260, .5, 0);
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, .05); }
  _tone(type, f0, f1, t0, dur, vol, dest) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest || this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  step(area, speed) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(), g = c.createGain();
    const carpet = area === 'hall';
    f.type = carpet ? 'lowpass' : 'bandpass'; f.frequency.value = carpet ? 420 : 1300 + Math.random() * 500; f.Q.value = carpet ? .7 : 1.2;
    const v = (carpet ? 0.22 : 0.3) * Math.min(1.3, 0.6 + speed * 0.2);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + (carpet ? 0.09 : 0.07));
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 1.5, 0.12);
  }
  coin() {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    [988, 1319, 1976].forEach((f, i) => this._tone('square', f, 0, t + i * 0.08, 0.18, 0.08));
  }
  ding() {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    this._tone('sine', 1318, 0, t, 0.9, 0.12); this._tone('sine', 1046, 0, t + 0.35, 1.1, 0.12);
  }
  update(dt, area, pos) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const inHall = area === 'hall';
    this.streetBed.gain.setTargetAtTime(inHall ? 0.02 : 0.11, t, 0.6);
    this.hallBed.gain.setTargetAtTime(inHall ? 0.16 : 0.0, t, 0.6);
    // door chime when entering
    const atDoor = Math.abs(pos.x) < 2.2 && Math.abs(pos.z + 2.2) < 1.2;
    if (atDoor && !this.doorDing) { this.doorDing = true; this.ding(); }
    if (!atDoor && Math.abs(pos.z + 2.2) > 4) this.doorDing = false;
    if (!this.on) return;
    if (!inHall) {
      this.birdT -= dt;
      if (this.birdT < 0) {
        this.birdT = 2 + Math.random() * 5;
        const base = 2600 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) this._tone('sine', base * (1 + Math.random() * .2), base * (1.25 + Math.random() * .3), t + i * 0.11, 0.08, 0.025);
      }
    } else {
      this.beepT -= dt;
      if (this.beepT < 0) {
        this.beepT = 0.6 + Math.random() * 1.8;
        const scale = [523, 587, 659, 784, 880, 1046, 1175];
        const n = 2 + Math.floor(Math.random() * 4), t0 = t + Math.random() * .1, ty = Math.random() < .5 ? 'square' : 'triangle';
        for (let i = 0; i < n; i++) this._tone(ty, scale[Math.floor(Math.random() * scale.length)] * (Math.random() < .3 ? .5 : 1), 0, t0 + i * 0.09, 0.08, 0.018);
      }
    }
  }
}
