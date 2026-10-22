'use strict';
// 地形：每關一種程式產生的地面，分塊畫好後捲動。
// 座標 v = 往下為正的世界座標；畫面 y = H + scroll + v。
const CH = 320;
const Terrain = {
  stage: 0, scale: 2, chunks: new Map(), pend: [], used: new Set(), statics: true,
  setScale(s) { this.scale = s; this.chunks.clear(); this.job = null; },
  reset(stage) { this.stage = stage; this.chunks.clear(); this.job = null; this.pend = []; this.used = new Set(); this.statics = true; },
  job: null,
  ensure(scroll) {
    const k0 = Math.floor((scroll - 40) / CH), k1 = Math.floor((scroll + H + CH) / CH);
    for (let k = k0; k <= k1; k++) {
      if (this.chunks.has(k)) continue;
      if (this.job && this.job.k === k) { this.finish(); continue; }
      this.chunks.set(k, this.run(this.genJob(k)));
    }
    for (const k of this.chunks.keys()) if (k < k0 - 1) this.chunks.delete(k);
    // 預先在背景慢慢做下一塊
    if (!this.job) for (const k of [k1 + 1, k1 + 2]) if (!this.chunks.has(k)) { this.job = { k, it: this.genJob(k), stage: this.stage, scale: this.scale }; break; }
  },
  work(ms) {
    const t0 = performance.now();
    while (this.job && performance.now() - t0 < ms) {
      const j = this.job;
      if (j.stage !== this.stage || j.scale !== this.scale) { this.job = null; break; }
      const r = j.it.next();
      if (r.done) { this.chunks.set(j.k, r.value); this.job = null; }
    }
  },
  finish() { const j = this.job; this.job = null; if (j.stage === this.stage && j.scale === this.scale) this.chunks.set(j.k, this.run(j.it)); },
  run(it) { let r; do { r = it.next(); } while (!r.done); return r.value; },
  *genJob(k) {
    const P = PAINT[this.stage], v0 = -(k + 1) * CH, v1 = -k * CH;
    const R = P.H ? yield* reliefGen(v0, v1, P.H, P.C, P.k) : null;
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * this.scale); c.height = Math.ceil(CH * this.scale);
    const g = c.getContext('2d');
    g.scale(this.scale, this.scale);
    g.translate(0, (k + 1) * CH);
    if (R) drawRelief(g, R);
    const spawns = [];
    P.d(g, v0, v1, spawns, R);
    for (const s of spawns) {
      const key = s.type + ':' + Math.round(s.x) + ':' + Math.round(s.v);
      if (this.used.has(key)) continue;
      this.used.add(key); this.pend.push(s);
    }
    return c;
  },
  draw(ctx, scroll) {
    for (const [k, c] of this.chunks) {
      const y = H + scroll - (k + 1) * CH;
      if (y > H || y + CH < 0) continue;
      ctx.drawImage(c, 0, y, W, CH + 0.6);
    }
  },
  // 由捲動決定的固定地面目標（砲座等）進入畫面時才生出來
  takeStatics(scroll) {
    const out = [];
    for (let i = this.pend.length - 1; i >= 0; i--) {
      const s = this.pend[i], y = H + scroll + s.v;
      if (y > -40) { this.pend.splice(i, 1); if (this.statics && y < H) out.push({ ...s, y }); }
    }
    return out;
  },
  isWater(x, v) { return WATER[this.stage](x, v); },
  // 找附近適合的地面位置（kind: land / water / road）
  findX(pref, v, kind) {
    for (let d = 0; d < 180; d += 6) {
      for (const x of [pref + d, pref - d]) {
        if (x < 24 || x > W - 24) continue;
        if (kind === 'road') { const r = ROADX[this.stage] && ROADX[this.stage](x, v); if (r !== null && r !== undefined) return r; continue; }
        const w = this.isWater(x, v) || this.isWater(x - 14, v) || this.isWater(x + 14, v);
        if (kind === 'water' ? (this.isWater(x, v) && this.isWater(x - 12, v) && this.isWater(x + 12, v)) : !w) return x;
      }
    }
    return null;
  },
};

// ---------- 共用繪圖 ----------
function mottle(g, v0, v1, cA, cB, s, sc = 0.012, step = 8) {
  for (let v = Math.floor(v0 / step) * step; v < v1; v += step) {
    for (let x = 0; x < W; x += step) {
      g.fillStyle = mixColor(cA, cB, fbm(x * sc, v * sc, s));
      g.fillRect(x, v, step + 0.5, step + 0.5);
    }
  }
}
function cells(cw, chh, v0, v1, margin, fn) {
  const j0 = Math.floor((v0 - margin) / chh), j1 = Math.floor((v1 + margin) / chh);
  const i1 = Math.ceil(W / cw);
  for (let j = j0; j <= j1; j++) for (let i = -1; i <= i1; i++) fn(i, j, i * cw, j * chh);
}
function tree(g, x, y, r, c1 = '#2f5a26', c2 = '#4f8a38') {
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.arc(x + r * 0.45, y + r * 0.55, r, 0, TAU); g.fill();
  g.fillStyle = c1; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = c2; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.55, 0, TAU); g.fill();
}
function bandPath(g, fx, fw, v0, v1, extra) {
  const pts = [];
  for (let v = v0 - 20; v <= v1 + 20; v += 6) pts.push([fx(v), fw(v), v]);
  g.beginPath();
  pts.forEach((p, i) => i ? g.lineTo(p[0] - p[1] / 2 - extra, p[2]) : g.moveTo(p[0] - p[1] / 2 - extra, p[2]));
  for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] + pts[i][1] / 2 + extra, pts[i][2]);
  g.closePath();
}
function house(g, x, y, w, h, roof) {
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 3, y + 3, w, h);
  g.fillStyle = roof; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, w, h / 2);
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
}

// ---------- 第 1 關：綠野河谷 ----------
const riverX = v => 180 + Math.sin(v * 0.0021) * 95 + Math.sin(v * 0.0057 + 1) * 35;
const riverW = v => 48 + Math.sin(v * 0.004) * 12;
const roadX1 = v => 180 + Math.sin(v * 0.0013 + 2) * 118 + Math.sin(v * 0.0041) * 12;
// 第 2 關：海岸線與小島
const coastV = x => -470 + Math.sin(x * 0.03) * 22 + Math.sin(x * 0.011 + 2) * 36;
function islandAt(j) {
  const r0 = hash(7, j, 202);
  if (j > -2 || r0 < 0.18) return null;
  return { x: 60 + hash(3, j, 202) * 240, v: j * 520 + 260, r: 42 + hash(5, j, 202) * 34, j };
}
function islandR(isl, a) { return isl.r * (0.82 + 0.18 * vnoise(Math.cos(a) * 2 + isl.j, Math.sin(a) * 2, 31)); }
function inIsland(x, v, extra = 0) {
  const j = Math.floor(v / 520);
  for (const jj of [j - 1, j, j + 1]) {
    const isl = islandAt(jj); if (!isl) continue;
    const dx = x - isl.x, dy = v - isl.v, d = Math.hypot(dx, dy);
    if (d < islandR(isl, Math.atan2(dy, dx)) + extra) return true;
  }
  return false;
}
// 第 3 關：城市道路
const CITY_BW = 100, CITY_BH = 124, CITY_RW = 18;
const cityRoadX = i => 20 + i * CITY_BW;
// 第 4 關：沙漠基地
const baseAt = j => (j < -1 && ((j % 3) + 3) % 3 === 0) ? { v0: j * 360, v1: j * 360 + 300, x0: 30 + hash(1, j, 404) * 60, x1: 270 + hash(2, j, 404) * 60 } : null;
const oasisAt = j => (hash(9, j, 405) > 0.72 && j < -1) ? { x: 60 + hash(4, j, 405) * 240, v: j * 360 + 180, r: 22 + hash(6, j, 405) * 14 } : null;

const WATER = [
  (x, v) => Math.abs(x - riverX(v)) < riverW(v) / 2,
  (x, v) => v < coastV(x) && !inIsland(x, v),
  () => false,
  (x, v) => { const o = oasisAt(Math.floor(v / 360)); return !!o && Math.hypot(x - o.x, v - o.v) < o.r; },
  () => false,
];
const ROADX = [
  (x, v) => { const r = roadX1(v); return Math.abs(r - x) < 40 && Math.abs(riverX(v) - r) > riverW(v) / 2 + 14 ? r : null; },
  null,
  (x) => { const i = Math.round((x - 20) / CITY_BW); const r = cityRoadX(i); return r > 10 && r < W - 10 && Math.abs(r - x) < 50 ? r : null; },
  (x, v) => { const r = 180 + Math.sin(v * 0.003) * 110; return Math.abs(r - x) < 40 ? r : null; },
  null,
];

// 各關的繪製函式在 paint.js
const PAINT = [];
function pick2(a, i, j) { return a[(hash(i, j, 99) * a.length) | 0]; }
function cloud(g, x, y, r, seed, alpha = 0.9) {
  const n = 7;
  g.save(); g.globalAlpha = alpha;
  g.fillStyle = 'rgba(30,60,100,.25)';
  for (let k = 0; k < n; k++) { const a = hash(k, seed, 61) * TAU, d = hash(seed, k, 62) * r * 0.8; g.beginPath(); g.arc(x + Math.cos(a) * d * 1.4 + 10, y + Math.sin(a) * d * 0.7 + 14, r * (0.5 + hash(k, k, seed) * 0.4), 0, TAU); g.fill(); }
  for (let k = 0; k < n; k++) { const a = hash(k, seed, 61) * TAU, d = hash(seed, k, 62) * r * 0.8; g.fillStyle = '#e8eef5'; g.beginPath(); g.arc(x + Math.cos(a) * d * 1.4, y + Math.sin(a) * d * 0.7, r * (0.5 + hash(k, k, seed) * 0.4), 0, TAU); g.fill(); }
  for (let k = 0; k < n; k++) { const a = hash(k, seed, 61) * TAU, d = hash(seed, k, 62) * r * 0.8; const rr2 = r * (0.5 + hash(k, k, seed) * 0.4); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + Math.cos(a) * d * 1.4 - rr2 * 0.2, y + Math.sin(a) * d * 0.7 - rr2 * 0.25, rr2 * 0.7, 0, TAU); g.fill(); }
  g.restore();
}

// 第 5 關的高空雲層（比地面捲得快，畫在空中敵機下面）
const SkyClouds = {
  list: [], init() { this.list = []; for (let i = 0; i < 6; i++) this.add(rnd(-200, H)); },
  add(y) { this.list.push({ x: rnd(-20, W + 20), y, r: rnd(30, 60), seed: (Math.random() * 1000) | 0, sp: rnd(1.9, 2.6) }); },
  update(dt, speed) {
    for (const c of this.list) c.y += speed * c.sp * dt;
    this.list = this.list.filter(c => c.y < H + 120);
    while (this.list.length < 6) this.add(rnd(-260, -100));
  },
  draw(ctx) { for (const c of this.list) cloud(ctx, c.x, c.y, c.r, c.seed, 0.42); },
};
