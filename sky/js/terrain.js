'use strict';
// 地形：每關一種程式產生的地面，分塊畫好後捲動。
// 座標 v = 往下為正的世界座標；畫面 y = H + scroll + v。
const CH = 320;
const Terrain = {
  stage: 0, scale: 2, chunks: new Map(), pend: [], used: new Set(), statics: true,
  setScale(s) { this.scale = s; this.chunks.clear(); },
  reset(stage) { this.stage = stage; this.chunks.clear(); this.pend = []; this.used = new Set(); this.statics = true; },
  ensure(scroll) {
    const k0 = Math.floor((scroll - 40) / CH), k1 = Math.floor((scroll + H + CH) / CH);
    for (let k = k0; k <= k1; k++) if (!this.chunks.has(k)) this.chunks.set(k, this.gen(k));
    for (const k of this.chunks.keys()) if (k < k0 - 1) this.chunks.delete(k);
  },
  gen(k) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * this.scale); c.height = Math.ceil(CH * this.scale);
    const g = c.getContext('2d');
    g.scale(this.scale, this.scale);
    g.translate(0, (k + 1) * CH);
    const v0 = -(k + 1) * CH, v1 = -k * CH;
    const spawns = [];
    PAINT[this.stage](g, v0, v1, spawns);
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
const roadX1 = v => {
  const r = riverX(v);
  return r > 180 ? 64 + Math.sin(v * 0.0016) * 20 : 296 + Math.sin(v * 0.0016) * 20;
};
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

const PAINT = [
  // 綠野河谷
  (g, v0, v1, sp) => {
    mottle(g, v0, v1, '#5f8f39', '#78a84a', 11);
    cells(92, 74, v0, v1, 80, (i, j, x, v) => {
      if (hash(i, j, 1) > 0.58) return;
      const cx = x + 46, cv = v + 37;
      if (Math.abs(cx - riverX(cv)) < riverW(cv) / 2 + 50) return;
      if (Math.abs(cx - roadX1(cv)) < 52) return;
      const col = ['#b9b04f', '#8fae45', '#9c7a4b', '#c9a959', '#7ea13b', '#a5b956'][(hash(i, j, 2) * 6) | 0];
      g.fillStyle = 'rgba(40,60,20,.35)'; g.fillRect(x + 2, v + 2, 88, 70);
      g.fillStyle = col; g.fillRect(x + 4, v + 4, 84, 66);
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1.2;
      const horiz = hash(i, j, 3) > 0.5;
      for (let k = 8; k < (horiz ? 66 : 84); k += 5) { g.beginPath(); if (horiz) { g.moveTo(x + 4, v + 4 + k); g.lineTo(x + 88, v + 4 + k); } else { g.moveTo(x + 4 + k, v + 4); g.lineTo(x + 4 + k, v + 70); } g.stroke(); }
    });
    cells(64, 64, v0, v1, 40, (i, j, x, v) => {
      if (hash(i, j, 5) < 0.62) return;
      const n = 5 + ((hash(i, j, 6) * 9) | 0);
      for (let k = 0; k < n; k++) {
        const tx = x + hash(i * 31 + k, j, 7) * 64, tv = v + hash(i, j * 17 + k, 8) * 64;
        if (Math.abs(tx - riverX(tv)) < riverW(tv) / 2 + 8 || Math.abs(tx - roadX1(tv)) < 12) continue;
        tree(g, tx, tv, 5 + hash(k, i + j, 9) * 4);
      }
    });
    // 河流
    bandPath(g, riverX, riverW, v0, v1, 7); g.fillStyle = '#cdb67e'; g.fill();
    bandPath(g, riverX, riverW, v0, v1, 0); g.fillStyle = '#3c7fae'; g.fill();
    bandPath(g, riverX, v => riverW(v) * 0.55, v0, v1, 0); g.fillStyle = '#346f9c'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.2;
    for (let v = Math.floor(v0 / 26) * 26; v < v1; v += 26) {
      const o = (hash(1, v, 12) - 0.5) * riverW(v) * 0.6;
      g.beginPath(); g.moveTo(riverX(v) + o - 5, v); g.lineTo(riverX(v) + o + 5, v + 2); g.stroke();
    }
    // 道路與橋
    g.lineCap = 'round';
    g.beginPath(); for (let v = v0 - 20; v <= v1 + 20; v += 5) v === v0 - 20 ? g.moveTo(roadX1(v), v) : g.lineTo(roadX1(v), v);
    g.strokeStyle = '#7f7768'; g.lineWidth = 15; g.stroke(); g.strokeStyle = '#958c7b'; g.lineWidth = 12; g.stroke();
    g.setLineDash([6, 7]); g.strokeStyle = '#efe4c6'; g.lineWidth = 1.2; g.stroke(); g.setLineDash([]);
    // 房子
    cells(70, 70, v0, v1, 30, (i, j, x, v) => {
      if (hash(i, j, 14) < 0.8) return;
      const hx = x + 20 + hash(i, j, 15) * 30, hv = v + 20 + hash(i, j, 16) * 30;
      if (Math.abs(hx - riverX(hv)) < riverW(hv) / 2 + 24 || Math.abs(hx - roadX1(hv)) < 22) return;
      house(g, hx, hv, 14, 10, pick2(['#b4553a', '#3b6aa0', '#8a6f4a'], i, j));
      if (hash(i, j, 17) > 0.5) house(g, hx + 18, hv + 4, 10, 8, '#a8a196');
    });
    // 防空砲座
    cells(120, 170, v0, v1, 0, (i, j, x, v) => {
      if (j > -3 || hash(i, j, 18) < 0.72) return;
      const cx = x + 30 + hash(i, j, 19) * 60, cv = v + 40 + hash(i, j, 20) * 90;
      if (cx < 30 || cx > W - 30 || cv < v0 || cv >= v1) return;
      if (Math.abs(cx - riverX(cv)) < riverW(cv) / 2 + 26 || Math.abs(cx - roadX1(cv)) < 28) return;
      sp.push({ type: 'turret', x: cx, v: cv });
    });
  },
  // 碧海艦隊
  (g, v0, v1, sp) => {
    mottle(g, v0, v1, '#1a5482', '#256a9e', 21, 0.01);
    g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1;
    cells(40, 30, v0, v1, 10, (i, j, x, v) => {
      if (hash(i, j, 22) < 0.55) return;
      const wx = x + hash(i, j, 23) * 40, wv = v + hash(i, j, 24) * 30;
      g.beginPath(); g.arc(wx, wv + 6, 7, -2.4, -0.7); g.stroke();
    });
    // 小島
    for (let j = Math.floor(v0 / 520) - 1; j <= Math.floor(v1 / 520) + 1; j++) {
      const isl = islandAt(j); if (!isl) continue;
      const shape = (extra) => { g.beginPath(); for (let a = 0; a <= TAU + 0.01; a += 0.2) { const r = islandR(isl, a) + extra; const px = isl.x + Math.cos(a) * r, pv = isl.v + Math.sin(a) * r; a ? g.lineTo(px, pv) : g.moveTo(px, pv); } g.closePath(); };
      shape(18); g.fillStyle = 'rgba(90,190,220,.35)'; g.fill();
      shape(8); g.fillStyle = 'rgba(120,210,225,.45)'; g.fill();
      shape(0); g.fillStyle = '#ddc88c'; g.fill();
      shape(-7); g.fillStyle = '#5c8d3a'; g.fill();
      for (let k = 0; k < isl.r / 5; k++) {
        const a = hash(k, j, 25) * TAU, r = hash(j, k, 26) * (isl.r - 16);
        tree(g, isl.x + Math.cos(a) * r, isl.v + Math.sin(a) * r, 4 + hash(k, k, j) * 3, '#2e6b2a', '#58a043');
      }
      if (isl.r > 52 && isl.v >= v0 && isl.v < v1) sp.push({ type: 'turret', x: isl.x, v: isl.v });
    }
    // 起點的海岸與港口
    if (v1 > -700) {
      g.beginPath(); g.moveTo(0, 60); for (let x = 0; x <= W; x += 6) g.lineTo(x, coastV(x) + 14); g.lineTo(W, 60); g.closePath(); g.fillStyle = 'rgba(120,210,225,.5)'; g.fill();
      g.beginPath(); g.moveTo(0, 60); for (let x = 0; x <= W; x += 6) g.lineTo(x, coastV(x)); g.lineTo(W, 60); g.closePath(); g.fillStyle = '#e2cf98'; g.fill();
      g.beginPath(); g.moveTo(0, 60); for (let x = 0; x <= W; x += 6) g.lineTo(x, coastV(x) + 30); g.lineTo(W, 60); g.closePath(); g.fillStyle = '#6a9a42'; g.fill();
      for (let k = 0; k < 14; k++) { const x = 14 + k * 25; house(g, x, coastV(x) + 52 + hash(k, 1, 27) * 40, 14, 11, pick2(['#c85a3a', '#e8e2d0', '#4a78b0'], k, 2)); }
      for (const px of [70, 200, 300]) { g.fillStyle = '#9a8f7c'; g.fillRect(px, coastV(px) - 60, 8, 66); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(px + 8, coastV(px) - 60, 2, 66); }
    }
  },
  // 鋼鐵都市
  (g, v0, v1, sp) => {
    g.fillStyle = '#585c60'; g.fillRect(0, v0, W, v1 - v0);
    const roofs = ['#9aa0a6', '#b8b0a0', '#7d8790', '#c5c9cc', '#8a7f73', '#a7b1a0', '#6f7780', '#b39c84'];
    cells(CITY_BW, CITY_BH, v0, v1, 10, (i, j, x, v) => {
      const bx = cityRoadX(i) + CITY_RW / 2, bv = v + CITY_RW / 2, bw = CITY_BW - CITY_RW, bh = CITY_BH - CITY_RW;
      g.fillStyle = '#8b8d8a'; g.fillRect(bx, bv, bw, bh);
      const kind = hash(i, j, 31);
      if (kind < 0.14) {
        g.fillStyle = '#5d8f45'; g.fillRect(bx + 3, bv + 3, bw - 6, bh - 6);
        for (let k = 0; k < 9; k++) tree(g, bx + 10 + hash(k, i, j) * (bw - 20), bv + 10 + hash(i, k, j) * (bh - 20), 5 + hash(k, j, 2) * 3, '#2f6a2a', '#5aa043');
        g.strokeStyle = '#c8bd9c'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx + 3, bv + bh / 2); g.quadraticCurveTo(bx + bw / 2, bv + bh * 0.2, bx + bw - 3, bv + bh / 2); g.stroke();
        return;
      }
      const lots = kind < 0.5 ? [[0, 0, 1, 1]] : kind < 0.8 ? [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] : [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1, 0.5]];
      lots.forEach((l, n) => {
        const lx = bx + l[0] * bw + 4, lv = bv + l[1] * bh + 4, lw = l[2] * bw - 8, lh = l[3] * bh - 8;
        const tall = 3 + hash(i * 7 + n, j, 32) * 9;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(lx + tall * 0.6, lv + tall, lw, lh);
        const roof = roofs[(hash(i, j * 5 + n, 33) * roofs.length) | 0];
        g.fillStyle = roof; g.fillRect(lx, lv, lw, lh);
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(lx, lv, lw, 2); g.fillRect(lx, lv, 2, lh);
        g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(lx + 3, lv + 3, lw - 6, lh - 6); g.fillStyle = roof; g.fillRect(lx + 4, lv + 4, lw - 8, lh - 8);
        for (let k = 0; k < 3; k++) {
          const ax = lx + 6 + hash(k, n, i + j * 9) * (lw - 18), av = lv + 6 + hash(n, k, i - j) * (lh - 18);
          g.fillStyle = '#c9cdd0'; g.fillRect(ax, av, 7, 6); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(ax + 7, av + 2, 2, 5);
        }
        if (hash(i, j, 34 + n) > 0.8) { g.strokeStyle = '#e8e090'; g.lineWidth = 1.2; g.beginPath(); g.arc(lx + lw / 2, lv + lh / 2, 7, 0, TAU); g.stroke(); g.fillStyle = '#e8e090'; g.font = '700 8px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', lx + lw / 2, lv + lh / 2 + 0.5); }
        const tv = lv + lh / 2;
        if (lw > 30 && lh > 30 && j < -3 && hash(i, j, 36 + n) > 0.84 && tv >= v0 && tv < v1) sp.push({ type: 'turret', x: lx + lw / 2, v: tv });
      });
    });
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2; g.setLineDash([7, 8]);
    for (let i = 0; i <= 3; i++) { g.beginPath(); g.moveTo(cityRoadX(i), v0); g.lineTo(cityRoadX(i), v1); g.stroke(); }
    for (let j = Math.floor(v0 / CITY_BH); j <= Math.floor(v1 / CITY_BH) + 1; j++) { g.beginPath(); g.moveTo(0, j * CITY_BH); g.lineTo(W, j * CITY_BH); g.stroke(); }
    g.setLineDash([]);
  },
  // 黃沙要塞
  (g, v0, v1, sp) => {
    mottle(g, v0, v1, '#cfa65e', '#e4c47f', 41, 0.009);
    g.strokeStyle = 'rgba(150,100,40,.35)'; g.lineWidth = 2;
    cells(70, 46, v0, v1, 20, (i, j, x, v) => {
      if (hash(i, j, 42) < 0.45) return;
      const dx = x + hash(i, j, 43) * 70, dv = v + hash(i, j, 44) * 46;
      g.beginPath(); g.moveTo(dx - 22, dv + 4); g.quadraticCurveTo(dx, dv - 8, dx + 22, dv + 4); g.stroke();
    });
    // 碎石路
    g.beginPath(); for (let v = v0 - 20; v <= v1 + 20; v += 5) { const x = 180 + Math.sin(v * 0.003) * 110; v === v0 - 20 ? g.moveTo(x, v) : g.lineTo(x, v); }
    g.strokeStyle = '#b8935a'; g.lineWidth = 14; g.stroke(); g.strokeStyle = '#c9a46a'; g.lineWidth = 10; g.stroke();
    cells(60, 60, v0, v1, 20, (i, j, x, v) => {
      if (hash(i, j, 45) < 0.8) return;
      const n = 2 + ((hash(i, j, 46) * 4) | 0);
      for (let k = 0; k < n; k++) {
        const rx = x + hash(k, i, j) * 60, rv = v + hash(j, k, i) * 60, r = 3 + hash(i + k, j, 47) * 6;
        g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(rx + 2, rv + 2, r, r * 0.8, 0, 0, TAU); g.fill();
        g.fillStyle = '#9a7d5a'; g.beginPath(); g.ellipse(rx, rv, r, r * 0.8, 0, 0, TAU); g.fill();
        g.fillStyle = '#b8997a'; g.beginPath(); g.ellipse(rx - r * 0.3, rv - r * 0.3, r * 0.5, r * 0.4, 0, 0, TAU); g.fill();
      }
    });
    for (let j = Math.floor(v0 / 360) - 1; j <= Math.floor(v1 / 360) + 1; j++) {
      const o = oasisAt(j);
      if (o) {
        g.fillStyle = '#7da04a'; g.beginPath(); g.arc(o.x, o.v, o.r + 9, 0, TAU); g.fill();
        g.fillStyle = '#3f8fb0'; g.beginPath(); g.arc(o.x, o.v, o.r, 0, TAU); g.fill();
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + j; tree(g, o.x + Math.cos(a) * (o.r + 8), o.v + Math.sin(a) * (o.r + 8), 4.5, '#3d7a2a', '#7cb84a'); }
      }
      const b = baseAt(j); if (!b) continue;
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(b.x0 + 4, b.v0 + 4, b.x1 - b.x0, b.v1 - b.v0);
      g.fillStyle = '#a9a69a'; g.fillRect(b.x0, b.v0, b.x1 - b.x0, b.v1 - b.v0);
      g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 1;
      for (let x = b.x0; x < b.x1; x += 20) { g.beginPath(); g.moveTo(x, b.v0); g.lineTo(x, b.v1); g.stroke(); }
      for (let v = b.v0; v < b.v1; v += 20) { g.beginPath(); g.moveTo(b.x0, v); g.lineTo(b.x1, v); g.stroke(); }
      const rx = (b.x0 + b.x1) / 2;
      g.fillStyle = '#5a5c5e'; g.fillRect(rx - 18, b.v0, 36, b.v1 - b.v0);
      g.fillStyle = '#f1efe6'; for (let v = b.v0 + 10; v < b.v1 - 10; v += 22) g.fillRect(rx - 1.5, v, 3, 12);
      for (let k = 0; k < 6; k++) { g.fillRect(rx - 15 + k * 5, b.v1 - 14, 3, 10); }
      for (const hx of [b.x0 + 14, b.x1 - 50]) {
        const hv = b.v0 + 30;
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(hx + 4, hv + 4, 36, 54);
        g.fillStyle = lin(g, hx, 0, hx + 36, 0, ['#6f7a6a', '#a8b3a2', '#6f7a6a']); g.fillRect(hx, hv, 36, 54);
        g.strokeStyle = 'rgba(0,0,0,.2)'; for (let v = hv + 6; v < hv + 54; v += 6) { g.beginPath(); g.moveTo(hx, v); g.lineTo(hx + 36, v); g.stroke(); }
      }
      for (let k = 0; k < 3; k++) { const fx = b.x0 + 26 + k * 18, fv = b.v1 - 40; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(fx + 2, fv + 3, 7, 0, TAU); g.fill(); g.fillStyle = '#d8d4c4'; g.beginPath(); g.arc(fx, fv, 7, 0, TAU); g.fill(); g.strokeStyle = '#a09a88'; g.beginPath(); g.arc(fx, fv, 4, 0, TAU); g.stroke(); }
      g.fillStyle = '#e0b030'; for (let x = b.x0; x < b.x1; x += 12) { g.fillRect(x, b.v0, 6, 3); g.fillRect(x + 6, b.v1 - 3, 6, 3); }
      for (const [tx, tv] of [[b.x0 + 32, b.v0 + 120], [b.x1 - 32, b.v0 + 150], [b.x1 - 30, b.v1 - 40]]) {
        if (tv >= v0 && tv < v1) sp.push({ type: 'turret', x: tx, v: tv });
      }
    }
  },
  // 雲端決戰：高空往下看海面，雲層另外在上方飄
  (g, v0, v1) => {
    mottle(g, v0, v1, '#1d4f7a', '#2a6496', 51, 0.006, 10);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
    cells(30, 24, v0, v1, 10, (i, j, x, v) => {
      if (hash(i, j, 52) < 0.6) return;
      g.beginPath(); g.moveTo(x, v); g.lineTo(x + 8, v + 1); g.stroke();
    });
    cells(120, 140, v0, v1, 90, (i, j, x, v) => {
      if (hash(i, j, 53) < 0.4) return;
      cloud(g, x + hash(i, j, 54) * 120, v + hash(i, j, 55) * 140, 26 + hash(i, j, 56) * 30, i * 13 + j, 0.5);
    });
  },
];
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
