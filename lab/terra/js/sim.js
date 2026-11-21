// 地形和水的模擬（顯示卡 compute shader）
// 做法：Mei、Decaudin、Hu 2007〈Fast Hydraulic Erosion Simulation and Visualization on GPU〉的「虛擬水管」模型
//   每一格有：地面高度 H、水深 W、水裡帶著的泥沙 S、往上下左右四個鄰居流出去的水量 F、水流速度 V
//   每一步：
//   A 水管：水面比鄰居高就往那邊流（流量慢慢加速），流出去的總量不能超過自己有的水
//   B 水量：流進來的減掉流出去的＝新的水深；算出水流速度；下雨、泉水、蒸發；海（地面低於 0）水面固定在 0
//   C 沖刷：水流越快、坡越陡，能帶走的泥沙越多（搬運能力）；帶得動就把地面挖掉，帶不動就把泥沙放下來
//   D 搬運：泥沙順著水流往下游移動；把結果寫進一張貼圖給畫面用
import * as THREE from 'three';
import { Fn, instancedArray, instanceIndex, uniform, uniformArray, float, int, vec2, vec4, floor, clamp, max, min, abs, sqrt, select, smoothstep, length, textureStore, uvec2, If } from 'three/tsl';

export const K = { G: 9.8, Kc: 0.1, Ks: 0.008, Kd: 0.015, Ke: 0.004, minH: -12, maxH: 70 };

export class GpuSim {
  constructor(renderer, N, initH) {
    this.kind = 'gpu'; this.renderer = renderer; this.N = N;
    const NN = N * N;
    const w0 = new Float32Array(NN); for (let i = 0; i < NN; i++) w0[i] = Math.max(0, -initH[i]);
    this.H = instancedArray(initH.slice(), 'float'); this.H2 = instancedArray(initH.slice(), 'float');
    this.W = instancedArray(w0, 'float'); this.S = instancedArray(NN, 'float'); this.S2 = instancedArray(NN, 'float');
    this.F = instancedArray(NN, 'vec4'); this.V = instancedArray(NN, 'vec2');
    this.H0 = initH.slice();
    this.tex = new THREE.StorageTexture(N, N); this.tex.type = THREE.HalfFloatType; this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter;
    // 參數（每一步都可能改）
    this.u = {
      dt: uniform(0.05), rain: uniform(0),
      brush: uniform(new THREE.Vector4(0, 0, 8, 0)),      // x, y（格子座標）, 半徑, 種類（0 沒有 1 堆高 2 挖低 3 下雨）
      bAmt: uniform(0),
    };
    this.springsArr = Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0));
    const SP = uniformArray(this.springsArr, 'vec4');
    const { H, H2, W, S, S2, F, V } = this, u = this.u, Nf = float(N);
    const cell = () => { const i = float(instanceIndex); const y = floor(i.div(Nf)); return [i.sub(y.mul(Nf)), y]; };
    const id = (x, y) => int(clamp(y, 0, N - 1).mul(Nf).add(clamp(x, 0, N - 1)));
    const brushK = (x, y) => { const d = vec2(x, y).sub(vec2(u.brush.x, u.brush.y)).length(); return smoothstep(u.brush.z, u.brush.z.mul(0.3), d); };

    // ---------------- A：水管流量
    this.passA = Fn(() => {
      const [x, y] = cell(), i = id(x, y);
      const hc = H.element(i).add(W.element(i));
      const hn = (dx, dy) => { const j = id(x.add(dx), y.add(dy)); return H.element(j).add(W.element(j)); };
      const f0 = F.element(i), g = u.dt.mul(K.G);
      const edge = (cx) => select(cx, float(0), float(1));   // 邊界外面不流
      const fl = max(f0.x.add(g.mul(hc.sub(hn(-1, 0)))), 0).mul(edge(x.lessThan(1)));
      const fr = max(f0.y.add(g.mul(hc.sub(hn(1, 0)))), 0).mul(edge(x.greaterThan(N - 2)));
      const ft = max(f0.z.add(g.mul(hc.sub(hn(0, -1)))), 0).mul(edge(y.lessThan(1)));
      const fb = max(f0.w.add(g.mul(hc.sub(hn(0, 1)))), 0).mul(edge(y.greaterThan(N - 2)));
      const sum = fl.add(fr).add(ft).add(fb);
      const k = min(float(1), W.element(i).div(sum.mul(u.dt).add(1e-6)));
      F.element(i).assign(vec4(fl, fr, ft, fb).mul(k));
    })().compute(NN);

    // ---------------- B：水量、速度、雨、泉水、海
    this.passB = Fn(() => {
      const [x, y] = cell(), i = id(x, y);
      const f = F.element(i);
      const inL = F.element(id(x.sub(1), y)).y.mul(select(x.lessThan(1), float(0), float(1)));
      const inR = F.element(id(x.add(1), y)).x.mul(select(x.greaterThan(N - 2), float(0), float(1)));
      const inT = F.element(id(x, y.sub(1))).w.mul(select(y.lessThan(1), float(0), float(1)));
      const inB = F.element(id(x, y.add(1))).z.mul(select(y.greaterThan(N - 2), float(0), float(1)));
      const w0 = W.element(i);
      let w1 = w0.add(u.dt.mul(inL.add(inR).add(inT).add(inB).sub(f.x.add(f.y).add(f.z).add(f.w))));
      // 雨：全島＋筆刷下的雨
      w1 = w1.add(u.rain.mul(u.dt)).add(select(u.brush.w.equal(3), brushK(x, y).mul(u.bAmt).mul(u.dt), float(0)));
      // 泉水：最多 8 個
      for (let k = 0; k < 8; k++) { const s = SP.element(k); w1 = w1.add(smoothstep(s.z, s.z.mul(0.2), vec2(x, y).sub(s.xy).length()).mul(s.w).mul(u.dt)); }
      w1 = max(w1.mul(float(1).sub(u.dt.mul(K.Ke))), 0);
      const h = H.element(i);
      w1 = select(h.lessThan(0), max(h.negate(), float(0)), w1);   // 海：水面固定在 0
      W.element(i).assign(w1);
      const vx = inL.sub(f.x).add(f.y).sub(inR).mul(0.5), vy = inT.sub(f.z).add(f.w).sub(inB).mul(0.5);
      const dep = max(w0.add(w1).mul(0.5), 0.05);
      const v = vec2(vx, vy).div(dep);
      const sp = length(v);
      V.element(i).assign(select(sp.greaterThan(8), v.mul(float(8).div(sp)), v));
    })().compute(NN);

    // ---------------- C：沖刷與沉積（寫到 H2、S2，因為鄰居還要讀 H）＋堆高／挖低筆刷
    this.passC = Fn(() => {
      const [x, y] = cell(), i = id(x, y);
      const h = H.element(i), w = W.element(i), s = S.element(i), v = V.element(i);
      const gx = H.element(id(x.add(1), y)).sub(H.element(id(x.sub(1), y))).mul(0.5);
      const gy = H.element(id(x, y.add(1))).sub(H.element(id(x, y.sub(1)))).mul(0.5);
      const g2 = gx.mul(gx).add(gy.mul(gy)), sinA = sqrt(g2.div(g2.add(1)));
      // 搬運能力：坡陡、水快才帶得動；乾地不沖刷；水很深的地方（海、湖底）沖刷變弱
      const cap = float(K.Kc).mul(max(sinA, 0.04)).mul(length(v)).mul(smoothstep(0.01, 0.15, w)).mul(float(1).div(w.mul(0.15).add(1))).mul(select(h.lessThan(-0.5), float(0.2), float(1)));
      const ero = float(K.Ks).mul(cap.sub(s)), dep = float(K.Kd).mul(s.sub(cap));
      const take = select(cap.greaterThan(s), ero, dep.negate());   // 正的＝挖走，負的＝放下
      let h2 = max(h.sub(take), K.minH);
      // 筆刷：堆高、挖低
      const bk = brushK(x, y).mul(u.bAmt).mul(u.dt);
      h2 = h2.add(select(u.brush.w.equal(1), bk, float(0))).sub(select(u.brush.w.equal(2), bk, float(0)));
      H2.element(i).assign(clamp(h2, K.minH, K.maxH));
      S2.element(i).assign(max(s.add(take), 0));
    })().compute(NN);

    // ---------------- D：泥沙順水流搬走（往回找「上一刻在哪裡」），地面高度複製回 H，寫出貼圖
    this.passD = Fn(() => {
      const [x, y] = cell(), i = id(x, y);
      const v = V.element(i);
      const px = clamp(x.sub(v.x.mul(u.dt)), 0, N - 1), py = clamp(y.sub(v.y.mul(u.dt)), 0, N - 1);
      const x0 = floor(px), y0 = floor(py), fx = px.sub(x0), fy = py.sub(y0);
      const s00 = S2.element(id(x0, y0)), s10 = S2.element(id(x0.add(1), y0)), s01 = S2.element(id(x0, y0.add(1))), s11 = S2.element(id(x0.add(1), y0.add(1)));
      const sa = s00.mul(float(1).sub(fx)).add(s10.mul(fx)), sb = s01.mul(float(1).sub(fx)).add(s11.mul(fx));
      const s = sa.mul(float(1).sub(fy)).add(sb.mul(fy));
      S.element(i).assign(s);
      const h = H2.element(i); H.element(i).assign(h);
      textureStore(this.tex, uvec2(int(x), int(y)), vec4(h, W.element(i), s, length(v))).toWriteOnly();
    })().compute(NN);
    void abs; void If;
  }

  setSprings(list) { for (let k = 0; k < 8; k++) { const s = list[k]; if (s) this.springsArr[k].set(s.x, s.y, s.r, s.rate); else this.springsArr[k].set(-99, -99, 0.1, 0); } }
  step(dt, o) {
    const u = this.u;
    u.dt.value = dt; u.rain.value = o.rain || 0;
    const b = o.brush; if (b) { u.brush.value.set(b.x, b.y, b.r, b.mode); u.bAmt.value = b.amt; } else { u.brush.value.w = 0; u.bAmt.value = 0; }
    this.renderer.compute(this.passA); this.renderer.compute(this.passB); this.renderer.compute(this.passC); this.renderer.compute(this.passD);
  }
  // 把 H、W 讀回 CPU（點選地面、判斷任務用）；非同步、偶爾做一次
  async read() {
    const [h, w] = await Promise.all([this.renderer.getArrayBufferAsync(this.H.value), this.renderer.getArrayBufferAsync(this.W.value)]);
    return { H: new Float32Array(h), W: new Float32Array(w) };
  }
}
