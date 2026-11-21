// WebAudio 合成音效：射擊、爆炸、擦彈、撿道具、炸彈、被打到，加上一段簡單的背景節奏
export class Sound {
  constructor() { this.ctx = null; this.on = true; this.t = {}; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    const c = this.ctx; this.master = c.createGain(); this.master.gain.value = this.on ? 0.5 : 0; this.master.connect(c.destination);
    const len = c.sampleRate; this.noise = c.createBuffer(1, len, c.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.5 : 0; }
  gap(k, ms) { const n = performance.now(); if (n - (this.t[k] || 0) < ms) return false; this.t[k] = n; return true; }
  tone(f0, f1, dur, type = 'square', vol = 0.1) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(this.master); o.start(t); o.stop(t + dur);
  }
  boom(dur = 0.4, vol = 0.3, cut = 1200) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + dur);
  }
  shot() { if (this.gap('shot', 90)) this.tone(1400, 700, 0.05, 'square', 0.02); }
  kill(big) { if (big) { this.boom(1.4, 0.5, 2400); this.tone(200, 40, 1.2, 'sawtooth', 0.12); } else if (this.gap('kill', 60)) this.boom(0.3, 0.18, 1800); }
  graze() { if (this.gap('graze', 50)) this.tone(2600, 2400, 0.03, 'sine', 0.04); }
  item() { if (this.gap('item', 40)) this.tone(900, 1800, 0.08, 'triangle', 0.08); }
  bomb() { this.boom(1.2, 0.45, 3000); this.tone(120, 900, 0.8, 'sawtooth', 0.08); }
  hit() { this.boom(0.8, 0.45, 900); this.tone(600, 80, 0.6, 'square', 0.12); }
  warn() { for (let i = 0; i < 3; i++) setTimeout(() => this.tone(440, 430, 0.35, 'square', 0.08), i * 500); }
  // 背景：低音一拍一拍＋小小的琶音（不同關卡換根音）
  music(root = 55) {
    const c = this.ctx; if (!c) return; this.stopMusic();
    const steps = [0, 0, 12, 0, 7, 0, 10, 12], arp = [24, 31, 36, 31, 27, 34, 39, 34];
    let i = 0;
    this.seq = setInterval(() => {
      if (!this.on) return; const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = root * 2 ** (steps[i % 8] / 12);
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + 0.22);
      const o2 = c.createOscillator(), g2 = c.createGain(); o2.type = 'triangle'; o2.frequency.value = root * 2 ** (arp[(i * 3) % 8] / 12);
      g2.gain.setValueAtTime(0.025, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o2.connect(g2).connect(this.master); o2.start(t); o2.stop(t + 0.2);
      i++;
    }, 180);
  }
  stopMusic() { if (this.seq) clearInterval(this.seq); this.seq = null; }
}
