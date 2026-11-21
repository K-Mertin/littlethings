// 沒有 WebGPU 時：同一套模擬在 CPU 上跑（格子比較少），結果寫進一張 DataTexture，畫面的程式完全一樣
import * as THREE from 'three';
import { K } from './sim.js';

export class CpuSim {
  constructor(N, initH) {
    this.kind = 'cpu'; this.N = N;
    const NN = N * N;
    this.H = initH.slice(); this.H2 = new Float32Array(NN); this.W = new Float32Array(NN); this.S = new Float32Array(NN); this.S2 = new Float32Array(NN);
    this.F = new Float32Array(NN * 4); this.V = new Float32Array(NN * 2); this.H0 = initH.slice();
    for (let i = 0; i < NN; i++) this.W[i] = Math.max(0, -initH[i]);
    this.data = new Float32Array(NN * 4);
    this.tex = new THREE.DataTexture(this.data, N, N, THREE.RGBAFormat, THREE.FloatType); this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter; this.tex.needsUpdate = true;
    this.springs = [];
  }
  setSprings(list) { this.springs = list.slice(0, 8); }
  step(dt, o) {
    const { N, H, H2, W, S, S2, F, V } = this, NN = N * N, g = dt * K.G;
    const b = o.brush, rain = o.rain || 0;
    const bk = (x, y) => { if (!b) return 0; const d = Math.hypot(x - b.x, y - b.y); const t = Math.min(1, Math.max(0, (b.r - d) / (b.r * 0.7))); return t * t * (3 - 2 * t); };
    // A 水管
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, hc = H[i] + W[i];
      const hn = (j) => H[j] + W[j];
      const fl = x > 0 ? Math.max(0, F[i * 4] + g * (hc - hn(i - 1))) : 0;
      const fr = x < N - 1 ? Math.max(0, F[i * 4 + 1] + g * (hc - hn(i + 1))) : 0;
      const ft = y > 0 ? Math.max(0, F[i * 4 + 2] + g * (hc - hn(i - N))) : 0;
      const fb = y < N - 1 ? Math.max(0, F[i * 4 + 3] + g * (hc - hn(i + N))) : 0;
      const k = Math.min(1, W[i] / ((fl + fr + ft + fb) * dt + 1e-6));
      F[i * 4] = fl * k; F[i * 4 + 1] = fr * k; F[i * 4 + 2] = ft * k; F[i * 4 + 3] = fb * k;
    }
    // B 水量
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const inL = x > 0 ? F[(i - 1) * 4 + 1] : 0, inR = x < N - 1 ? F[(i + 1) * 4] : 0, inT = y > 0 ? F[(i - N) * 4 + 3] : 0, inB = y < N - 1 ? F[(i + N) * 4 + 2] : 0;
      const out = F[i * 4] + F[i * 4 + 1] + F[i * 4 + 2] + F[i * 4 + 3];
      const w0 = W[i];
      let w1 = w0 + dt * (inL + inR + inT + inB - out) + rain * dt;
      if (b && b.mode === 3) w1 += bk(x, y) * b.amt * dt;
      for (const s of this.springs) { const d = Math.hypot(x - s.x, y - s.y); if (d < s.r) w1 += (1 - d / s.r) * s.rate * dt; }
      w1 = Math.max(0, w1 * (1 - dt * K.Ke));
      if (H[i] < 0) w1 = -H[i];
      W[i] = w1;
      const dep = Math.max((w0 + w1) * 0.5, 0.05);
      let vx = (inL - F[i * 4] + F[i * 4 + 1] - inR) * 0.5 / dep, vy = (inT - F[i * 4 + 2] + F[i * 4 + 3] - inB) * 0.5 / dep;
      const sp = Math.hypot(vx, vy); if (sp > 8) { vx *= 8 / sp; vy *= 8 / sp; }
      V[i * 2] = vx; V[i * 2 + 1] = vy;
    }
    // C 沖刷
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, h = H[i], w = W[i], s = S[i];
      const gx = (H[y * N + Math.min(N - 1, x + 1)] - H[y * N + Math.max(0, x - 1)]) * 0.5, gy = (H[Math.min(N - 1, y + 1) * N + x] - H[Math.max(0, y - 1) * N + x]) * 0.5;
      const g2 = gx * gx + gy * gy, sinA = Math.sqrt(g2 / (g2 + 1));
      const sm = (a, b2, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b2 - a))); return k * k * (3 - 2 * k); };
      const cap = K.Kc * Math.max(sinA, 0.04) * Math.hypot(V[i * 2], V[i * 2 + 1]) * sm(0.01, 0.15, w) / (w * 0.15 + 1) * (h < -0.5 ? 0.2 : 1);
      const take = cap > s ? K.Ks * (cap - s) : -K.Kd * (s - cap);
      let h2 = Math.max(h - take, K.minH);
      if (b && (b.mode === 1 || b.mode === 2)) h2 += (b.mode === 1 ? 1 : -1) * bk(x, y) * b.amt * dt;
      H2[i] = Math.min(K.maxH, Math.max(K.minH, h2)); S2[i] = Math.max(0, s + take);
    }
    // D 搬運＋寫貼圖
    const D = this.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const px = Math.min(N - 1, Math.max(0, x - V[i * 2] * dt)), py = Math.min(N - 1, Math.max(0, y - V[i * 2 + 1] * dt));
      const x0 = Math.floor(px), y0 = Math.floor(py), x1 = Math.min(N - 1, x0 + 1), y1 = Math.min(N - 1, y0 + 1), fx = px - x0, fy = py - y0;
      S[i] = (S2[y0 * N + x0] * (1 - fx) + S2[y0 * N + x1] * fx) * (1 - fy) + (S2[y1 * N + x0] * (1 - fx) + S2[y1 * N + x1] * fx) * fy;
      H[i] = H2[i];
      D[i * 4] = H[i]; D[i * 4 + 1] = W[i]; D[i * 4 + 2] = S[i]; D[i * 4 + 3] = Math.hypot(V[i * 2], V[i * 2 + 1]);
    }
    this.tex.needsUpdate = true;
    void NN;
  }
  async read() { return { H: this.H, W: this.W }; }
}
