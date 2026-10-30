// 萬軍守城（複製自千軍突圍 rush/js）— 場景細節：地面小東西、路面痕跡、圍欄、雲、天氣
'use strict';

const SCN = { wx: [], wxTheme: '', lastT: 0 };

function buildScene() {
  const S = ART.scene = {};
  S.shadow = mk(128, 64, g => {
    const gr = g.createRadialGradient(64, 32, 2, 64, 32, 62);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.save(); g.scale(1, 0.5); ell(g, 64, 64, 62, 62); g.restore(); g.fill();
  });
  const tuft = (cols, n) => mk(64, 48, g => {
    for (let i = 0; i < n; i++) {
      const x = 32 + (i - n / 2) * 4 + Math.sin(i * 7) * 3, h = 22 + (i * 13 % 7) * 3;
      g.strokeStyle = cols[i % cols.length]; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, 47); g.quadraticCurveTo(x + (i % 2 ? 4 : -4), 47 - h * 0.6, x + (i % 2 ? 7 : -7), 47 - h); g.stroke();
    }
  });
  const pebbles = cols => mk(64, 32, g => {
    for (const [x, y, r, c] of [[18, 22, 7, 0], [36, 24, 5, 1], [48, 20, 6, 0], [28, 26, 4, 1]]) { g.fillStyle = rad(g, x, y, r, cols[c], cols[2]); ell(g, x, y, r, r * 0.7); g.fill(); }
  });
  const flowers = cols => mk(64, 40, g => {
    for (let i = 0; i < 5; i++) {
      const x = 10 + i * 11, y = 18 + (i % 2) * 8;
      g.strokeStyle = '#3c8f3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, 39); g.stroke();
      g.fillStyle = cols[i % cols.length]; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ell(g, x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2, 2.6, 2.6); g.fill(); }
      g.fillStyle = '#ffe066'; ell(g, x, y, 1.8, 1.8); g.fill();
    }
  });
  const lump = (c0, c1) => mk(64, 32, g => { g.fillStyle = rad(g, 30, 22, 26, c0, c1); g.beginPath(); g.ellipse(32, 30, 28, 16, 0, Math.PI, 0); g.fill(); });
  S.detail = {
    meadow: [tuft(['#4fae3a', '#6cc950', '#3d8f2e'], 9), tuft(['#5fbf45', '#88d86a'], 7), flowers(['#ff6b9a', '#ffffff', '#ffd23f']), pebbles(['#c8c3ba', '#a8a29a', '#6c675f'])],
    desert: [tuft(['#b5a050', '#d6bf6a', '#8f7d3a'], 7), pebbles(['#e0b47a', '#c4925a', '#8a5a2a']), pebbles(['#d9a06a', '#b07040', '#6a3a1a']), lump('#f7d9a0', '#d4a564')],
    snow: [lump('#ffffff', '#c7d6ea'), lump('#f6fbff', '#b9cbe2'), tuft(['#5a7a6a', '#7f9f8a'], 5), pebbles(['#c9d6e6', '#a8b8cc', '#6e7f96'])],
    night: [pebbles(['#4a4f66', '#3a3f55', '#1c1f2c']), tuft(['#3a8a6a', '#2c6a52'], 6), mk(64, 32, g => { g.fillStyle = 'rgba(120,200,255,.35)'; ell(g, 32, 18, 28, 10); g.fill(); g.fillStyle = 'rgba(255,90,220,.35)'; ell(g, 26, 18, 12, 5); g.fill(); }), pebbles(['#5a5f78', '#3a3f55', '#1c1f2c'])],
  };
  // 路面痕跡（平貼在地上）
  S.road = {
    crack: mk(128, 64, g => { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(10, 30); g.lineTo(40, 26); g.lineTo(60, 38); g.lineTo(90, 30); g.lineTo(118, 36); g.moveTo(60, 38); g.lineTo(70, 54); g.moveTo(40, 26); g.lineTo(46, 10); g.stroke(); }),
    patch: mk(128, 64, g => { g.fillStyle = 'rgba(0,0,0,.08)'; rr(g, 12, 10, 100, 44, 8); g.fill(); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; rr(g, 12, 10, 100, 44, 8); g.stroke(); }),
    manhole: mk(128, 128, g => { g.fillStyle = rad(g, 64, 64, 50, '#7b828f', '#3e434d', 0, 0); ell(g, 64, 64, 48, 48); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(30, 64 + i * 12); g.lineTo(98, 64 + i * 12); g.stroke(); } g.lineWidth = 4; ell(g, 64, 64, 48, 48); g.stroke(); }),
    tire: mk(64, 256, g => { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(8, 0, 14, 256); g.fillRect(42, 0, 14, 256); }),
    arrow: mk(128, 192, g => { g.fillStyle = 'rgba(255,255,255,.55)'; poly(g, [64, 8, 112, 80, 80, 80, 80, 184, 48, 184, 48, 80, 16, 80]); g.fill(); }),
  };
  // 圍欄柱
  const post = (top, body, cap) => mk(32, 96, g => {
    g.fillStyle = lin(g, 8, 0, 24, 0, body); rr(g, 9, 10, 14, 86, 3); g.fill();
    if (cap) { g.fillStyle = cap; ell(g, 16, 11, 10, 6); g.fill(); }
    else { g.fillStyle = top; poly(g, [9, 12, 16, 4, 23, 12]); g.fill(); }
  });
  S.post = {
    meadow: post('#c99a62', ['#8a5a30', '#c99a62', '#6b4426']),
    desert: post('#a87a4a', ['#6b4426', '#a87a4a', '#4a2e18']),
    snow: post('#ffffff', ['#6b4426', '#9b6a3e', '#5a3820'], '#ffffff'),
    night: mk(32, 96, g => { g.fillStyle = '#2a2d3c'; rr(g, 11, 6, 10, 90, 3); g.fill(); g.fillStyle = '#ff4fd8'; rr(g, 12, 8, 8, 10, 3); g.fill(); }),
  };
  S.rail = { meadow: ['#a87342', '#d9a874'], desert: ['#7a5230', '#b0804e'], snow: ['#8a5a30', '#ffffff'], night: ['#ff4fd8', '#3ff2ff'] };
  // 雲
  S.clouds = [0, 1, 2].map(v => mk(220, 90, g => {
    const r = rng(v * 31 + 5);
    for (let i = 0; i < 6; i++) {
      const x = 40 + r() * 140, y = 45 + (r() - 0.5) * 22, rr2 = 22 + r() * 22;
      g.fillStyle = rad(g, x, y, rr2, 'rgba(255,255,255,.98)', 'rgba(225,235,248,.85)', -0.2, -0.5); ell(g, x, y, rr2, rr2 * 0.75); g.fill();
    }
  }));
}

// 平貼地面的圖：寬 w 公尺、深 d 公尺
function flatImg(g, img, x, z, w, d, alpha) {
  const a = P(x, z, 0), b = P(x, z + d, 0);
  const h = a.y - b.y; if (h < 0.5) return;
  const ww = w * (a.s + b.s) / 2;
  if (alpha != null) g.globalAlpha = alpha;
  g.drawImage(img, a.x - ww / 2, b.y, ww, h);
  if (alpha != null) g.globalAlpha = 1;
}

function drawGroundDetail(g, th, dist) {
  const S = ART.scene;
  const det = S.detail[th.id];
  const zNear = -Z0 + 1, zFar = ZSPAWN + 4;
  // 路面
  const RS = 7;
  for (let k = Math.floor((dist + zNear) / RS); k <= Math.floor((dist + zFar) / RS); k++) {
    const h = hash(k * 7 + 99);
    const z = k * RS - dist + (h % 30) / 10;
    if (z < zNear || z > zFar) continue;
    const kind = h % 9;
    const x = ((h >>> 5) % 70) / 10 - 3.5;
    if (kind < 2) flatImg(g, S.road.crack, x, z, 2.2, 1.0);
    else if (kind === 3 && Math.abs(x) > 1) flatImg(g, S.road.manhole, x * 0.8, z, 1.0, 1.0);
    else if (kind === 4) flatImg(g, S.road.tire, Math.sign(x || 1) * 2.1, z, 1.4, 6, 0.8);
    else if (kind === 5 && th.id !== 'night' && (k % 4 === 0)) { flatImg(g, S.road.arrow, -2.1, z, 1.1, 2.4, 0.7); flatImg(g, S.road.arrow, 2.1, z, 1.1, 2.4, 0.7); }
  }
  // 路邊小東西
  const DS = 1.6;
  for (let k = Math.floor((dist + zNear) / DS); k <= Math.floor((dist + zFar) / DS); k++) {
    for (const side of [-1, 1]) {
      const h = hash(k * 3 + (side > 0 ? 1 : 2) + th.id.length * 77);
      if (h % 3 === 0) continue;
      const z = k * DS - dist + (h % 16) / 10;
      if (z < zNear || z > zFar) continue;
      const x = side * (ROAD + 0.8 + ((h >>> 6) % 90) / 10);
      const img = det[(h >>> 3) % det.length];
      const p = P(x, z, 0);
      const w = (0.5 + ((h >>> 11) % 40) / 100) * p.s, hh = w * img.height / img.width;
      if (p.y - hh > R.H || p.x + w < 0 || p.x - w > R.W) continue;
      g.drawImage(img, p.x - w / 2, p.y - hh, w, hh);
    }
  }
  // 焦痕
  for (const d of G.decals) {
    const a = P(d.x, d.z - d.size * 0.5, 0), b = P(d.x, d.z + d.size * 0.5, 0);
    const rx = d.size * a.s, ry = Math.max(1, (a.y - b.y) / 2);
    if (rx > R.W * 0.35) continue;
    const gr = g.createRadialGradient(a.x, (a.y + b.y) / 2, 0, a.x, (a.y + b.y) / 2, rx);
    const fa = clamp((d.z + 2) / 10, 0, 1) * 0.6;
    if (fa <= 0.02) continue;
    gr.addColorStop(0, `rgba(20,12,8,${fa})`); gr.addColorStop(0.7, `rgba(20,12,8,${fa * 0.45})`); gr.addColorStop(1, 'rgba(20,12,8,0)');
    g.fillStyle = gr; g.save(); g.translate(a.x, (a.y + b.y) / 2); g.scale(1, ry / rx); ell(g, 0, 0, rx, rx); g.restore(); g.fill();
  }
}

// 圍欄（加入深度排序）
const FENCE_SP = 3;
function fenceItems(items, th, dist) {
  const k0 = Math.floor((dist - Z0) / FENCE_SP), k1 = Math.floor((dist + ZSPAWN + 4) / FENCE_SP);
  for (let k = k0; k <= k1; k++) {
    const z = k * FENCE_SP - dist;
    if (z < -Z0 + 0.6) continue;
    items.push({ z, fence: -1, k }); items.push({ z, fence: 1, k });
  }
}
function drawFence(g, it, th) {
  const S = ART.scene, x = it.fence * (ROAD + 0.85);
  const z = it.z, z2 = z + FENCE_SP;
  const cols = S.rail[th.id];
  const neon = th.id === 'night';
  // 欄杆（往遠方那一根連過去）
  for (const [hh, ci] of [[0.5, 0], [0.92, 1]]) {
    const a = P(x, z, hh), b = P(x, z2, hh), a2 = P(x, z, hh - 0.09), b2 = P(x, z2, hh - 0.09);
    g.fillStyle = cols[neon ? (it.k + ci) % 2 : ci];
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(b2.x, b2.y); g.lineTo(a2.x, a2.y); g.closePath(); g.fill();
  }
  const p = P(x, z, 0);
  const h = 1.08 * p.s, w = h / 3;
  g.drawImage(S.post[th.id], p.x - w / 2, p.y - h, w, h);
}

function drawClouds(g, th, t) {
  if (th.dark || th.hot || R.hy < R.H * 0.06) return;
  const S = ART.scene;
  for (let i = 0; i < 5; i++) {
    const sp = 0.004 + (i % 3) * 0.002;
    const fx = ((i * 0.31 + t * sp) % 1.4) - 0.2;
    const x = fx * R.W - R.camX * 2 * R.dpr * 0.5, y = R.hy * (0.12 + (i % 3) * 0.14);
    const w = R.hy * (0.9 + (i % 2) * 0.5), h = w * 90 / 220;
    g.globalAlpha = 0.8;
    g.drawImage(S.clouds[i % 3], x, y, w, h);
  }
  g.globalAlpha = 1;
}

// 天氣粒子（螢幕座標）
function drawWeather(g, th, t) {
  const dt = Math.min(0.05, Math.max(0, t - SCN.lastT)); SCN.lastT = t;
  const W = R.W, H = R.H, d = R.dpr;
  if (SCN.wxTheme !== th.id + W) {
    SCN.wxTheme = th.id + W; SCN.wx = [];
    const n = th.id === 'snow' ? 80 : th.id === 'night' ? 70 : th.id === 'desert' ? 36 : th.id === 'volcano' ? 46 : th.id === 'sky' ? 26 : 18;
    for (let i = 0; i < n; i++) SCN.wx.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random(), ph: Math.random() * 6 });
  }
  const scroll = G && G.scroll && G.st === 'play' ? 1 : 0.3;
  for (const p of SCN.wx) {
    if (th.id === 'volcano') {
      // 火星與灰燼往上飄
      p.y -= (50 + p.s * 60) * d * dt; p.x += Math.sin(t * 1.7 + p.ph) * 26 * d * dt;
      if (p.y < -20) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.ph > 2) { g.fillStyle = `rgba(255,${150 + (p.ph * 30 | 0) % 80},40,${0.55 + 0.35 * Math.sin(t * 6 + p.ph)})`; ell(g, p.x, p.y, 1.8 * p.s * d, 1.8 * p.s * d); g.fill(); }
      else { g.fillStyle = 'rgba(70,60,60,.5)'; ell(g, p.x, p.y, 2.6 * p.s * d, 2 * p.s * d); g.fill(); }
    } else if (th.id === 'sky') {
      // 飄過去的雲絲和羽毛
      const wd = G && G.gust && G.gust.warn <= 0 ? G.gust.dir * 520 : -60;
      p.x += (wd + Math.sin(t + p.ph) * 20) * d * dt; p.y += (18 + p.s * 10) * d * dt;
      if (p.ph > 4.5) { g.fillStyle = 'rgba(255,255,255,.8)'; g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(t * 2 + p.ph)); ell(g, 0, 0, 5 * p.s * d, 1.6 * p.s * d); g.fill(); g.restore(); }
      else { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + 30 * p.s * d, p.y); g.stroke(); }
    } else if (th.id === 'snow') {
      p.y += (40 + p.s * 50) * d * dt; p.x += Math.sin(t * 1.4 + p.ph) * 18 * d * dt;
      g.fillStyle = 'rgba(255,255,255,.85)'; ell(g, p.x, p.y, 2.2 * p.s * d, 2.2 * p.s * d); g.fill();
    } else if (th.id === 'night') {
      p.y += (700 + p.s * 300) * d * dt; p.x -= 60 * d * dt;
      g.strokeStyle = 'rgba(160,200,255,.32)'; g.lineWidth = 1.2 * d; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + 4 * d, p.y - 16 * p.s * d); g.stroke();
    } else if (th.id === 'desert') {
      p.x -= (260 + p.s * 200) * d * dt; p.y += (30 + Math.sin(t + p.ph) * 20) * d * dt * scroll;
      g.strokeStyle = 'rgba(255,235,200,.35)'; g.lineWidth = 1.5 * d; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + 24 * p.s * d, p.y - 2 * d); g.stroke();
    } else {
      p.y += (30 + p.s * 25) * d * dt; p.x += (Math.sin(t * 1.1 + p.ph) * 30 - 10) * d * dt;
      g.save(); g.translate(p.x, p.y); g.rotate(t * 2 + p.ph);
      g.fillStyle = p.ph > 3 ? 'rgba(255,170,200,.85)' : 'rgba(255,255,255,.85)'; ell(g, 0, 0, 3.5 * p.s * d, 1.8 * p.s * d); g.fill(); g.restore();
    }
    if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
    if (p.x < -40) { p.x = W + 30; p.y = Math.random() * H; }
    if (p.x > W + 40) p.x = -30;
  }
}
