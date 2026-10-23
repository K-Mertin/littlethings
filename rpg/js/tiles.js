'use strict';
// 曉鐘傳說：大地圖烘焙（逐像素的海岸、沙灘、地形漸變、重疊的山與森林）

// ───── 雜訊 ─────
function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, seed) { return vnoise(x, y, seed) * 0.58 + vnoise(x * 2.07, y * 2.07, seed + 7) * 0.29 + vnoise(x * 4.3, y * 4.3, seed + 13) * 0.13; }
const RGB = h => hexToRgb(h);
// 低解析度的雜訊格，雙線性內插取值（烘焙加速用）
function noiseGrid(W, H, step, fn) {
  const gw = Math.ceil(W / step) + 2, gh = Math.ceil(H / step) + 2, a = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) a[j * gw + i] = fn(i * step, j * step);
  return (x, y) => { const fx = x / step, fy = y / step, i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, k = j * gw + i; return (a[k] * (1 - u) + a[k + 1] * u) * (1 - v) + (a[k + gw] * (1 - u) + a[k + gw + 1] * u) * v; };
}

// ───── 大地圖上的物件小圖（像素畫，快取） ─────
const WSpr = {
  cache: {},
  get(key, w, h, fn) {
    if (this.cache[key]) return this.cache[key];
    const p = new PB(w, h); fn(p); p.selout('#140a1e', 0.72);
    return (this.cache[key] = p.canvas());
  },
  tree(v, pal) {
    return this.get('tree' + v + pal.join(), 14, 16, p => {
      const [d, m, l] = pal, r = seeded(v * 31 + 7);
      p.R(6, 11, 2, 4, '#6a4424'); p.P(6, 11, '#8a5a30');
      const cx = 7 + (r() - 0.5), cy = 7 + (r() - 0.5), rx = 5.6 + r() * 0.8, ry = 5.2 + r() * 0.6;
      p.E(cx, cy, rx, ry, (x, y, nx, ny) => { const s = nx * -0.6 + ny * -0.8 + (hash2(x, y, v) - 0.5) * 0.5; return s > 0.55 ? l : s < -0.35 ? d : m; });
      p.E(cx - 1.6, cy - 2, 1.8, 1.3, lighten(l, 0.25));
      p.P(cx - 2, cy - 3, '#f0ffd8');
    });
  },
  pine(v, snowy) {
    return this.get('pine' + v + snowy, 12, 18, p => {
      p.R(5, 14, 2, 3, '#5a3a24');
      const tiers = [[6, 1, 1.5], [6, 4, 3], [6, 7, 4.2], [6, 10, 5.4]];
      for (const [cx, cy, w] of tiers) for (let y = 0; y < 5; y++) { const ww = w * (y + 1) / 5 + 0.6; for (let x = Math.round(cx - ww); x <= Math.round(cx + ww - 1); x++) p.P(x, cy + y, x < cx - 1 ? '#3f8a58' : x > cx + 1 ? '#173a28' : '#2a6a44'); }
      if (snowy) for (const [cx, cy, w] of tiers) { p.R(Math.round(cx - w * 0.4) - 1, cy + 1, Math.max(1, Math.round(w * 0.7)), 1, '#f4f8ff'); p.P(cx - 1, cy, '#ffffff'); }
      p.P(6, 0, snowy ? '#ffffff' : '#4f9a68');
    });
  },
  mount(v, kind) {
    // kind: rock / snow / sand / dark
    return this.get('mt' + v + kind, 26, 22, p => {
      const r = seeded(v * 17 + kind.length * 101);
      const base = { rock: ['#a88a62', '#7e6446', '#c8ae84', '#5a4636'], snow: ['#9aa8c4', '#7280a4', '#c8d4ea', '#4a5470'], sand: ['#c8a060', '#9a7640', '#e0c080', '#6a4e2a'], dark: ['#6a5a7a', '#4a3e5c', '#8a7aa0', '#2a2238'] }[kind];
      const peakX = 11 + r() * 4, peakY = 1 + r() * 3, wl = 11 + r() * 2, wr = 11 + r() * 2;
      const leftAt = y => peakX - (y - peakY) / (21 - peakY) * wl, rightAt = y => peakX + (y - peakY) / (21 - peakY) * wr;
      for (let y = Math.floor(peakY); y < 22; y++) {
        const a = leftAt(y), b = rightAt(y);
        for (let x = Math.round(a); x <= Math.round(b); x++) {
          const ridge = peakX + Math.sin(y * 0.7 + v) * 0.8;
          let col = x < ridge ? base[2] : base[1];
          if (x < ridge && x > ridge - 2.2) col = base[0];
          if (x >= ridge && (x - ridge) < 1) col = base[3];
          if (hash2(x, y, v) < 0.08) col = x < ridge ? base[0] : base[3];
          p.P(x, y, col);
        }
      }
      // 山脊的岩縫
      for (let i = 0; i < 3; i++) { const sx = peakX + (r() - 0.3) * 8, sy = 8 + r() * 10; p.L(sx, sy, sx + 2, sy + 4, base[3]); }
      // 雪頂
      const snowLine = kind === 'snow' ? 11 : kind === 'rock' ? 6 : kind === 'dark' ? 0 : 0;
      for (let y = Math.floor(peakY); y < peakY + snowLine; y++) {
        const a = leftAt(y), b = rightAt(y), jag = (hash2(Math.round(y), v, 3) * 2) | 0;
        for (let x = Math.round(a); x <= Math.round(b); x++) { if (y > peakY + snowLine - 3 && hash2(x, y, 9) < 0.45) continue; p.P(x, y + jag * 0, x < peakX + 0.5 ? '#ffffff' : '#d8e2f4'); }
      }
    });
  },
  hill(v, grassy) {
    return this.get('hill' + v + grassy, 16, 10, p => {
      const c = grassy === 'sand' ? ['#d4b46e', '#f2dca0', '#b8944e'] : grassy === 'snow' ? ['#dce6f4', '#ffffff', '#b8c8e0'] : ['#5aac40', '#86d466', '#3f8a32'];
      p.E(8 + (v % 2), 7, 7.2, 5, (x, y, nx, ny) => { const s = -nx * 0.6 - ny * 0.9; return s > 0.45 ? c[1] : s < -0.2 ? c[2] : c[0]; });
      p.P(5, 4, c[1]); p.P(6, 3, c[1]);
    });
  },
  cactus(v) {
    return this.get('cac' + v, 12, 16, p => {
      const G = ['#2a7a3a', '#4aa850', '#7ad470'];
      p.R(5, 2, 3, 13, G[0]); p.R(5, 2, 1, 13, G[2]); p.R(6, 2, 1, 13, G[1]);
      p.R(2, 6, 3, 2, G[1]); p.R(2, 3, 2, 4, G[1]); p.P(2, 3, G[2]);
      p.R(8, 8, 3, 2, G[1]); p.R(9, 5, 2, 4, G[1]); p.P(9, 5, G[2]);
      if (v % 2) { p.P(6, 1, '#ff7aa0'); p.P(5, 1, '#ffb0c8'); }
      for (let i = 0; i < 5; i++) p.P(5 + (i % 3), 4 + i * 2, '#e8ffe0');
    });
  },
  village(roof, wall) {
    return this.get('vil' + roof + wall, 24, 22, p => {
      const house = (ox, oy, w, rc) => {
        const R = shd(rc), W = shd(wall);
        p.R(ox, oy + 5, w, 5, W.md); p.R(ox + w - 1, oy + 5, 1, 5, W.lo); p.R(ox, oy + 9, w, 1, W.lo);
        p.R(ox + (w >> 1) - 1, oy + 7, 2, 3, '#5a3a24');
        p.P(ox + 1, oy + 6, '#ffe890'); if (w > 6) p.P(ox + w - 2, oy + 6, '#ffe890');
        for (let i = 0; i < 5; i++) { const ww = Math.round((w + 2) * (i + 1) / 5); p.R(ox + ((w - ww) >> 1), oy + i, ww, 1, i < 2 ? R.hi : i === 4 ? R.lo : R.md); }
        p.R(ox - 1, oy + 4, w + 2, 1, R.lo);
      };
      house(1, 6, 8, roof); house(13, 3, 9, roof); house(7, 11, 9, roof);
      p.R(19, 15, 2, 4, '#6a4424'); p.E(20, 13, 3, 3, '#3f9446');
    });
  },
  cave(snowy) {
    return this.get('cave' + snowy, 22, 18, p => {
      const c = snowy ? ['#9aa8c4', '#c8d4ea', '#6a789a'] : ['#8a7458', '#b09a78', '#5e4c3a'];
      p.E(11, 12, 10.5, 9, (x, y, nx, ny) => { if (y > 17) return null; const s = -nx * 0.6 - ny * 0.8; return s > 0.4 ? c[1] : s < -0.3 ? c[2] : c[0]; });
      if (snowy) p.E(10, 6, 6, 3, (x, y) => (y < 6 ? '#ffffff' : null));
      p.E(11, 15, 4.2, 5, (x, y) => (y > 17 ? null : y < 12 ? '#2a1a14' : '#0a0608'));
      p.R(6, 17, 10, 1, c[2]);
    });
  },
  lighthouse(lit) {
    return this.get('lh' + lit, 14, 30, p => {
      for (let y = 8; y < 28; y++) { const w = 3 + Math.round((y - 8) * 0.12); for (let x = 7 - w; x <= 6 + w; x++) p.P(x, y, ((y - 8) / 4 | 0) % 2 ? (x > 7 ? '#a8303a' : '#e04a3a') : (x > 7 ? '#c8ccd8' : '#ffffff')); }
      p.R(3, 27, 8, 2, '#6a6a7a');
      p.R(4, 6, 6, 2, '#3a3a4a'); p.R(5, 2, 4, 4, lit ? '#fff08a' : '#5a6070'); p.R(5, 2, 1, 4, lit ? '#ffffff' : '#7a8090'); p.R(4, 1, 6, 1, '#3a3a4a'); p.P(7, 0, '#3a3a4a');
    });
  },
  pyramid() {
    return this.get('pyr', 34, 24, p => {
      for (let y = 2; y < 24; y++) { const h = (y - 2) * 0.78 + 1; for (let x = Math.round(17 - h); x <= Math.round(16 + h); x++) p.P(x, y, x < 17 ? ((y % 3 === 0) ? '#d0a850' : '#ecc870') : ((y % 3 === 0) ? '#946a30' : '#b48848')); }
      p.R(15, 18, 4, 6, '#2a1a10'); p.R(16, 17, 2, 1, '#2a1a10'); p.P(17, 2, '#fff0a0');
    });
  },
  icetower() {
    return this.get('itw', 18, 34, p => {
      for (let y = 6; y < 33; y++) { const w = 4 + (y > 28 ? 2 : 0); for (let x = 9 - w; x <= 8 + w; x++) p.P(x, y, x < 7 ? '#d8f2ff' : x < 10 ? '#9ad4f4' : '#5a9ad0'); }
      for (const [x, y, h] of [[3, 20, 10], [14, 22, 9], [9, 0, 8]]) for (let i = 0; i < h; i++) { const w = Math.max(0, Math.round((i / h) * 2)); p.R(x - w, y + i, w * 2 + 1, 1, i < 2 ? '#ffffff' : '#bfe8ff'); }
      p.R(7, 12, 3, 4, '#2a5a8a'); p.R(7, 22, 3, 5, '#1a3050'); p.P(8, 13, '#e8ffff');
    });
  },
  castle() {
    return this.get('cst', 36, 34, p => {
      const S = ['#5a4a7a', '#3e3258', '#7a6aa0', '#2a2040'];
      p.R(4, 14, 28, 18, S[0]); p.R(4, 14, 3, 18, S[2]); p.R(29, 14, 3, 18, S[1]);
      for (let x = 4; x < 32; x += 3) p.R(x, 12, 2, 2, S[0]);
      for (const [tx, h] of [[2, 22], [15, 30], [28, 22]]) {
        p.R(tx, 34 - h, 6, h - 2, S[0]); p.R(tx, 34 - h, 2, h - 2, S[2]); p.R(tx + 5, 34 - h, 1, h - 2, S[1]);
        for (let i = 0; i < 5; i++) p.R(tx + 3 - (i >> 1), 34 - h - 5 + i, 1 + (i >> 1) * 2, 1, '#8a1a3a');
        p.P(tx + 3, 34 - h - 6, '#ff3050');
        p.R(tx + 2, 34 - h + 4, 2, 3, '#ff5070');
      }
      p.R(14, 24, 8, 8, '#1a0a1a'); p.R(15, 23, 6, 1, '#1a0a1a'); p.R(16, 25, 4, 1, '#c02040');
      p.R(9, 18, 2, 3, '#ff6080'); p.R(25, 18, 2, 3, '#ff6080');
    });
  },
  altar(lit) {
    return this.get('alt' + lit, 22, 20, p => {
      p.E(11, 14, 10, 5, '#8a8a9a'); p.E(11, 13.5, 8.5, 4, '#b8b8c8');
      for (const [x, y] of [[3, 6], [18, 6], [5, 2], [16, 2]]) { p.R(x, y, 2, 9, '#e8e8f0'); p.R(x + 1, y, 1, 9, '#a8a8b8'); p.R(x - 1, y - 1, 4, 1, '#d8d8e8'); }
      p.E(11, 12, 2.5, 2, lit ? '#fff08a' : '#8ac8ff');
      if (lit) p.P(10, 11, '#ffffff');
    });
  },
  log() { return this.get('log', 18, 12, p => { p.R(0, 3, 18, 6, '#6a4424'); p.R(0, 3, 18, 1, '#a8743e'); p.R(0, 8, 18, 1, '#3a2414'); p.E(15.5, 6, 2.5, 3, '#d8b07a'); p.E(15.5, 6, 1.2, 1.5, '#a8743e'); p.R(4, 1, 3, 2, '#3a8a40'); p.R(10, 0, 2, 3, '#3a8a40'); }); },
  gate(open) {
    return this.get('gate' + open, 20, 20, p => {
      p.R(0, 4, 20, 16, '#6a6a7a'); p.R(0, 4, 20, 2, '#a8a8b8'); for (let x = 0; x < 20; x += 4) p.R(x, 2, 2, 2, '#8a8a9a');
      for (let y = 7; y < 20; y += 3) p.R(0, y, 20, 1, '#5a5a6a');
      p.R(5, 9, 10, 11, open ? '#1a1020' : '#7a4a24'); if (!open) { p.R(9, 9, 2, 11, '#4a2a14'); p.P(7, 14, '#f2c14e'); p.P(12, 14, '#f2c14e'); }
      p.R(4, 8, 12, 1, '#4a4a5a');
    });
  },
  flowers(v) {
    return this.get('fl' + v, 16, 16, p => {
      const r = seeded(v * 13 + 5), cols = ['#ff6a8a', '#fff4a0', '#ffffff', '#ff9a40', '#c08aff'];
      for (let i = 0; i < 5; i++) { const x = 2 + (r() * 12) | 0, y = 2 + (r() * 12) | 0, c = cols[(r() * 5) | 0]; p.P(x, y, c); p.P(x + 1, y, c); p.P(x, y + 1, c); p.P(x + 1, y + 1, '#ffe060'); p.P(x, y + 2, '#3f8a32'); }
    });
  },
};

// ───── 大地圖烘焙 ─────
const WorldBake = {
  cache: {},
  key() { return ['d1', 'gate', 'bridge', 'd2'].map(k => F(k) ? 1 : 0).join(''); },
  get(f) { const k = this.key(); if (!this.cache[k]) { this.cache = {}; this.cache[k] = this.bake(f); } return this.cache[k]; },
  bake(f) {
    const TW = f.w, TH = f.h, W = TW * 16, H = TH * 16, N = W * H;
    const tileAt = (x, y) => f.tile(clamp(x, 0, TW - 1), clamp(y, 0, TH - 1));
    const isWaterC = c => c === '~' || c === 'd' || c === 'b';
    // 1. 陸地遮罩（以 2D 前綴和模糊後取閾值，讓海岸圓滑）
    const raw = new Uint8Array(N);
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
      const land = isWaterC(f.tile(tx, ty)) ? 0 : 1;
      if (!land) continue;
      for (let y = 0; y < 16; y++) raw.fill(1, (ty * 16 + y) * W + tx * 16, (ty * 16 + y) * W + tx * 16 + 16);
    }
    const integ = a => { const I = new Float32Array((W + 1) * (H + 1)); for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += a[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } } return I; };
    const box = (I, x, y, r) => { const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(W, x + r + 1), y1 = Math.min(H, y + r + 1); return (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0)); };
    const IL = integ(raw);
    const land = new Uint8Array(N);
    const nLand = noiseGrid(W, H, 3, (x, y) => fbm(x / 9, y / 9, 3)), nGx = noiseGrid(W, H, 4, (x, y) => vnoise(x / 11, y / 11, 21)), nGy = noiseGrid(W, H, 4, (x, y) => vnoise(x / 11, y / 11, 37));
    const nPatch = noiseGrid(W, H, 4, (x, y) => fbm(x / 26, y / 26, 5)), nRip = noiseGrid(W, H, 4, (x, y) => fbm(x / 20, y / 20, 2)), nRoad = noiseGrid(W, H, 2, (x, y) => fbm(x / 6, y / 6, 8)), nDeep = noiseGrid(W, H, 6, (x, y) => fbm(x / 30, y / 30, 1));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, n = (nLand(x, y) - 0.5) * 0.36;
      land[i] = box(IL, x, y, 5) + n > 0.5 ? 1 : 0;
      // 角色可以站的格子中心一定是陸地
      const tx = x >> 4, ty = y >> 4, lx = x & 15, ly = y & 15;
      if (raw[i] && lx > 3 && lx < 12 && ly > 3 && ly < 12) land[i] = 1;
    }
    // 2. 到海岸的距離（兩次掃描的近似距離）
    const BIG = 99, dW = new Uint8Array(N).fill(BIG), dL = new Uint8Array(N).fill(BIG);
    for (let i = 0; i < N; i++) { if (land[i]) dW[i] = 0; else dL[i] = 0; }
    const cham = d => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = d[i]; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) v = Math.min(v, d[i - W] + 1); if (x > 0 && y > 0) v = Math.min(v, d[i - W - 1] + 1); if (x < W - 1 && y > 0) v = Math.min(v, d[i - W + 1] + 1); d[i] = v; }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; let v = d[i]; if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) v = Math.min(v, d[i + W] + 1); if (x < W - 1 && y < H - 1) v = Math.min(v, d[i + W + 1] + 1); if (x > 0 && y < H - 1) v = Math.min(v, d[i + W - 1] + 1); d[i] = v; }
    };
    cham(dW); cham(dL);
    // 3. 道路遮罩
    const roadRaw = new Uint8Array(N);
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
      const c = f.tile(tx, ty);
      const road = c === ';' || (c === 'Y' && F('d1')) || 'VPSFcmLpiKaG'.includes(c) && [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => tileAt(tx + dx, ty + dy) === ';');
      if (!road) continue;
      for (let y = 0; y < 16; y++) roadRaw.fill(1, (ty * 16 + y) * W + tx * 16, (ty * 16 + y) * W + tx * 16 + 16);
    }
    const IR = integ(roadRaw);
    // 4. 逐像素上色
    const PAL = {
      grass: [RGB('#5cb446'), RGB('#4a9a3a'), RGB('#74c858'), RGB('#3f8a32')],
      sand: [RGB('#e6cc8a'), RGB('#d2b472'), RGB('#f2e0a6'), RGB('#c4a466')],
      snow: [RGB('#e8f0fa'), RGB('#ccd8ec'), RGB('#ffffff'), RGB('#b8c8e0')],
      wither: [RGB('#665a7c'), RGB('#54486a'), RGB('#7a6c90'), RGB('#463c58')],
    };
    const BEACH = RGB('#efd8a0'), WET = RGB('#c8b07a'), ROAD = RGB('#c89c64'), ROADL = RGB('#dab47c'), ROADE = RGB('#9e7a4c');
    const gArr = []; for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) gArr.push(isWaterC(f.tile(tx, ty)) ? null : f.groundAt(tx, ty));
    const gtype = (x, y) => {
      const nx = (nGx(x, y) - 0.5) * 14, ny = (nGy(x, y) - 0.5) * 14;
      const tx = clamp(Math.floor((x + nx) / 16), 0, TW - 1), ty = clamp(Math.floor((y + ny) / 16), 0, TH - 1);
      return gArr[ty * TW + tx] || f.groundAt(x >> 4, y >> 4);
    };
    const BLACK = [0, 0, 0], SNR = [RGB('#c8d0dc'), RGB('#aab4c4')], SDR = [RGB('#d4b070'), RGB('#b8945a')];
    const base = new Uint8ClampedArray(N * 4);
    const waterIdx = [];
    for (let by = 0; by < H; by += 2) for (let bx = 0; bx < W; bx += 2) {
      // 每 2×2 像素共用一次地形類型與斑塊雜訊
      const gB = gtype(bx, by), nB = nPatch(bx, by);
      for (let y = by; y < by + 2; y++) for (let x = bx; x < bx + 2; x++) {
      const i = y * W + x, o = i * 4;
      let col;
      if (land[i]) {
        const g = gB, P = PAL[g] || PAL.grass;
        const n = nB, n2 = hash2(x, y, 11);
        col = n > 0.62 ? P[2] : n < 0.36 ? P[1] : P[0];
        if (n2 < 0.06) col = P[1]; else if (n2 > 0.95) col = P[2];
        if (g === 'grass' && n2 > 0.985) col = P[3];
        if (g === 'sand' && Math.sin(x * 0.35 + y * 0.9 + nRip(x, y) * 6) > 0.86) col = P[1];
        // 沙灘
        const dw = dL[i];
        if (dw <= 3 && g !== 'snow' && g !== 'wither') col = dw <= 1 ? WET : BEACH;
        if (dw <= 2 && g === 'snow') col = PAL.snow[1];
        if (dw <= 1 && g === 'wither') col = PAL.wither[3];
        // 道路
        const rb = box(IR, x, y, 4), rv = rb > 0.3 ? rb + (nRoad(x, y) - 0.5) * 0.25 : 0;
        if (rv > 0.62) col = hash2(x, y, 4) < 0.1 ? ROADL : ROAD;
        else if (rv > 0.5) col = ROADE;
        if (g === 'snow' && rv > 0.5) col = rv > 0.62 ? SNR[0] : SNR[1];
        if (g === 'sand' && rv > 0.5) col = rv > 0.62 ? SDR[0] : SDR[1];
      } else { waterIdx.push(i); col = BLACK; }
      base[o] = col[0]; base[o + 1] = col[1]; base[o + 2] = col[2]; base[o + 3] = 255;
      }
    }
    // 5. 物件層
    const obj = document.createElement('canvas'); obj.width = W; obj.height = H;
    const og = obj.getContext('2d');
    const at = (img, tx, ty, ox = 0, oy = 0) => og.drawImage(img, Math.round(tx * 16 + 8 - img.width / 2 + ox), Math.round(ty * 16 + 16 - img.height + oy));
    for (let ty = 0; ty < TH; ty++) {
      for (let tx = 0; tx < TW; tx++) {
        const c = f.tile(tx, ty), h = hash2(tx, ty, 77), v = (h * 6) | 0, g = f.groundAt(tx, ty);
        const shadow = (w, oy = 15) => { og.fillStyle = 'rgba(20,30,10,.18)'; og.beginPath(); og.ellipse(tx * 16 + 8, ty * 16 + oy, w, 2.5, 0, 0, TAU); og.fill(); };
        switch (c) {
          case ',': at(WSpr.flowers(v), tx, ty); break;
          case 'T': {
            const pals = [['#24602e', '#3a8a40', '#66c24c'], ['#2a6a34', '#3f9446', '#72d058'], ['#205a2c', '#368a3c', '#5cb848']];
            const spots = [[-4, -6], [4, -5], [0, 0], [-5, 2], [5, 3]];
            const isT = (dx, dy) => tileAt(tx + dx, ty + dy) === 'T';
            for (let k = 0; k < spots.length; k++) {
              const [sx, sy] = spots[k];
              if (sx < 0 && !isT(-1, 0) && k !== 2 && hash2(tx, ty, k) < 0.6) continue;
              if (sx > 0 && !isT(1, 0) && k !== 2 && hash2(tx, ty, k + 9) < 0.6) continue;
              at(WSpr.tree((v + k) % 6, pals[(v + k) % 3]), tx, ty, sx + (hash2(tx, ty, k + 3) - 0.5) * 3, sy + 2);
            }
            break;
          }
          case 'A': { const sn = g === 'snow' || true; for (const [sx, sy] of [[-4, -4], [4, -3], [0, 2]]) at(WSpr.pine((v + sx) & 3, sn), tx, ty, sx, sy); break; }
          case 'h': shadow(7); at(WSpr.hill(v % 2, g), tx, ty, -3, -4); at(WSpr.hill((v + 1) % 2, g), tx, ty, 3, 0); break;
          case '^': at(WSpr.mount(v, g === 'sand' ? 'sand' : g === 'wither' ? 'dark' : 'rock'), tx, ty, (h - 0.5) * 3, 3); break;
          case 'M': at(WSpr.mount(v, 'snow'), tx, ty, (h - 0.5) * 3, 3); break;
          case 'C': shadow(4); at(WSpr.cactus(v), tx, ty, (h - 0.5) * 4, -1); break;
          case 'V': shadow(10); at(WSpr.village('#d84a3a', '#f4e8d0'), tx, ty, 0, 2); break;
          case 'P': shadow(10); at(WSpr.village('#3a6ad8', '#f0f0f6'), tx, ty, 0, 2); break;
          case 'S': shadow(10); at(WSpr.village('#e0902a', '#f8e8c0'), tx, ty, 0, 2); break;
          case 'F': shadow(10); at(WSpr.village('#8a4ac8', '#e8e0f0'), tx, ty, 0, 2); break;
          case 'c': case 'm': at(WSpr.cave(g === 'snow'), tx, ty, 0, 1); break;
          case 'L': shadow(5); at(WSpr.lighthouse(F('d2')), tx, ty, 0, 1); break;
          case 'p': shadow(14); at(WSpr.pyramid(), tx, ty, 0, 2); break;
          case 'i': shadow(7); at(WSpr.icetower(), tx, ty, 0, 1); break;
          case 'K': shadow(15); at(WSpr.castle(), tx, ty, 0, 3); break;
          case 'a': at(WSpr.altar(F('bridge')), tx, ty, 0, 2); break;
          case 'Y': if (!F('d1')) at(WSpr.log(), tx, ty, 0, -2); break;
          case 'G': at(WSpr.gate(F('gate')), tx, ty, 0, 2); break;
          case 'd': { og.fillStyle = '#3a2414'; og.fillRect(tx * 16 + 1, ty * 16, 14, 16); for (let y = 0; y < 16; y += 3) { og.fillStyle = '#c8945a'; og.fillRect(tx * 16 + 2, ty * 16 + y, 12, 2); og.fillStyle = '#e0b07a'; og.fillRect(tx * 16 + 2, ty * 16 + y, 12, 1); } og.fillStyle = '#5a3a20'; og.fillRect(tx * 16 + 1, ty * 16 + 13, 2, 4); og.fillRect(tx * 16 + 13, ty * 16 + 13, 2, 4); break; }
          case 'b': if (F('bridge')) { const cols = ['#ff6a6a', '#ffb04a', '#fff06a', '#6ae07a', '#6ab0ff', '#b07aff']; for (let i = 0; i < 6; i++) { og.fillStyle = cols[i]; og.fillRect(tx * 16, ty * 16 + 2 + i * 2, 16, 2); } og.fillStyle = 'rgba(255,255,255,.5)'; og.fillRect(tx * 16, ty * 16 + 2, 16, 1); } break;
        }
      }
    }
    // 6. 水面（四格動畫）
    const DEEP = RGB('#1f5cb4'), MID = RGB('#2f78d4'), SHAL = RGB('#4aa0e6'), SHAL2 = RGB('#74c0ee'), FOAM = RGB('#e8f8ff'), SPARK = RGB('#c8ecff');
    const MIDL = [MID[0] + 30, MID[1] + 40, MID[2] + 30];
    // 靜態水色先寫進底圖，只把會動的像素記下來
    const foam = [], wave = [];
    for (const i of waterIdx) {
      const x = i % W, y = (i / W) | 0, d = dW[i], o = i * 4;
      const col = d <= 2 ? SHAL2 : d <= 5 ? SHAL : d <= 9 ? ((d === 6 || d === 7) && hash2(x, y, 2) < 0.5 ? SHAL : MID) : (nDeep(x, y) > 0.55 ? MID : DEEP);
      base[o] = col[0]; base[o + 1] = col[1]; base[o + 2] = col[2];
      if (d <= 2) foam.push(i);
      else if (d > 3 && (y & 3) < 2 && hash2(x >> 2, y, 1) < 0.75) wave.push(i);
    }
    const frames = [];
    for (let fr = 0; fr < 4; fr++) {
      const data = new Uint8ClampedArray(base);
      const ph = fr / 4 * TAU;
      for (const i of foam) { const x = i % W, y = (i / W) | 0, d = dW[i]; if (d <= 1 ? Math.sin(ph + (x + y) * 0.35) > -0.2 : Math.sin(ph + (x - y) * 0.3) > 0.5) { const o = i * 4; data[o] = FOAM[0]; data[o + 1] = FOAM[1]; data[o + 2] = FOAM[2]; } }
      for (const i of wave) { const x = i % W, y = (i / W) | 0; if (Math.sin(x * 0.42 + Math.sin(y * 0.21 + ph) * 2 + ph) + Math.sin(y * 0.9 + x * 0.1 - ph) > 1.72) { const o = i * 4, col = dW[i] > 9 ? MIDL : SPARK; data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; } }
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.putImageData(new ImageData(data, W, H), 0, 0);
      g.drawImage(obj, 0, 0);
      frames.push(c);
    }
    return frames;
  },
};
