'use strict';
// 曉鐘傳說：城鎮與迷宮的地圖烘焙（地板、牆面陰影、屋頂、立體物件、光源）

const LTH = {
  town: { ground: 'grass', roofs: ['#c8503a', '#b8663a', '#3f8a7a', '#a8443a'], wall: '#efe2c4', wall2: '#cdb894', timber: '#6a4a2a', floor: '#c8955c', liquid: 'water', tops: '#5a4030' },
  port: { ground: 'cobble', roofs: ['#3a62b0', '#2f7ab8', '#4a52a0', '#2a8a9a'], wall: '#f2f2f6', wall2: '#c8ccd8', timber: '#4a5a7a', floor: '#c8955c', liquid: 'water', tops: '#4a4a5a' },
  sand: { ground: 'sand', roofs: ['#e8c890', '#dab070', '#e4bc84', '#d8a868'], flat: 1, wall: '#f2dca8', wall2: '#d4b47a', timber: '#a07a40', floor: '#d8b07a', liquid: 'water', tops: '#8a6a3a' },
  snow: { ground: 'snow', roofs: ['#6a4a9a', '#7a4a5a', '#4a5a8a', '#5a4a7a'], snowy: 1, wall: '#a87a52', wall2: '#86603e', timber: '#5a3a24', floor: '#a87a50', liquid: 'ice', tops: '#4a3a3a', logs: 1 },
  cave: { floor: ['#6e5a48', '#62503f', '#7c6852'], top: '#2a2018', face: ['#7a6048', '#5e4a38', '#94785a'], moss: '#5a8a3a', liquid: 'water' },
  mine: { floor: ['#7a6a54', '#6c5c48', '#887660'], top: '#241e18', face: ['#6e5c48', '#544636', '#867058'], beams: 1, liquid: 'water' },
  tower: { floor: ['#9aa0ae', '#8a909e', '#aab0bc'], top: '#30343e', face: ['#a8aebc', '#868c9a', '#c4c8d4'], bricks: 1, liquid: 'water' },
  tomb: { floor: ['#d0ae6c', '#c09e5c', '#dcbc7c'], top: '#3e2e18', face: ['#c09a58', '#9a7a40', '#dcbc7c'], bricks: 1, glyph: 1, liquid: 'abyss' },
  ice: { floor: ['#bfe2f6', '#a8d4f0', '#d8f0ff'], top: '#1e4a78', face: ['#86bce4', '#5a96c8', '#c0e4fa'], bricks: 1, liquid: 'ice' },
  castle: { floor: ['#4e4262', '#443a58', '#5a4e70'], top: '#140e22', face: ['#62547e', '#463a60', '#7a6c98'], bricks: 1, banner: 1, liquid: 'abyss' },
};
const LIQ = {
  water: ['#1f62b8', '#2f80d8', '#5aa8ee', '#e8f8ff'],
  ice: ['#3a86c8', '#5aa8e0', '#9ad4f4', '#ffffff'],
  abyss: ['#08040e', '#140a22', '#2a1a40', '#5a3a8a'],
  lava: ['#c83010', '#f06a1a', '#ffb030', '#fff0a0'],
};
const WALLS = new Set(['#', '!', 'k']);
const FLOORISH = new Set(['o', '=', 'b', 't', 'B', 'p', 'X', 'R', 'Y', 'Q', 'K', 'Z', '+']);
const PROPKINDS = { T: 'tree', P: 'palm', A: 'pine', L: 'lamp', w: 'well', S: 'statue', O: 'pillar', c: 'crystal', G: 'grave', s: 'sign', Z: 'throne', n: 'coffin', r: 'rock' };

// ───── 立體物件小圖 ─────
const LSpr = {
  cache: {},
  get(key, w, h, fn, outline = true) { if (this.cache[key]) return this.cache[key]; const p = new PB(w, h); fn(p); if (outline) p.selout('#140a1e', 0.72); return (this.cache[key] = p.canvas()); },
  tree(v, snowy) {
    return this.get('t' + v + snowy, 18, 28, p => {
      p.R(8, 19, 3, 8, '#6a4424'); p.R(8, 19, 1, 8, '#8a5a30'); p.P(7, 26, '#5a3a20'); p.P(11, 26, '#5a3a20');
      const pal = snowy ? ['#2a5a3a', '#3a7a4a', '#5a9a6a'] : [['#245e2c', '#3a8a40', '#6ac850'], ['#2a6830', '#44964a', '#7ad45e'], ['#2a5a30', '#3e8044', '#64b450']][v % 3];
      const blob = (cx, cy, rx, ry) => p.E(cx, cy, rx, ry, (x, y, nx, ny) => { const s = -nx * 0.55 - ny * 0.85 + (hash2(x, y, v) - 0.5) * 0.45; return s > 0.5 ? pal[2] : s < -0.3 ? pal[0] : pal[1]; });
      blob(9, 14, 7.5, 6); blob(6, 10, 5, 5); blob(12, 9, 5.2, 5); blob(9, 6, 5, 4.5);
      p.E(7, 5, 1.6, 1.2, lighten(pal[2], 0.3));
      if (snowy) { p.E(8, 4, 3.5, 1.5, '#ffffff'); p.E(5, 9, 2.5, 1, '#f4f8ff'); p.E(13, 8, 2.5, 1, '#f4f8ff'); }
      for (let i = 0; i < 3; i++) p.P(5 + i * 4, 12 + (i % 2) * 3, v % 2 ? '#ff8aa0' : pal[2]);
    });
  },
  palm(v) {
    return this.get('palm' + v, 20, 30, p => {
      for (let y = 10; y < 29; y++) { const x = 9 + Math.sin(y * 0.18 + v) * 1.5; p.R(Math.round(x), y, 3, 1, y % 3 ? '#a87a3a' : '#7a5228'); p.P(Math.round(x), y, '#c8984a'); }
      const leaf = (a, l) => { for (let i = 0; i < l; i++) { const t = i / l, x = 10 + Math.cos(a) * i, y = 9 + Math.sin(a) * i + t * t * 5; p.R(Math.round(x), Math.round(y), 2, 2, i % 2 ? '#2a8a3a' : '#3aa848'); } };
      for (const [a, l] of [[-2.8, 9], [-0.3, 9], [-1.9, 7], [-1.2, 7], [2.6, 7], [0.5, 7]]) leaf(a, l);
      p.E(10.5, 10, 2, 1.6, '#6a3a1a'); p.P(10, 9, '#9a5a2a');
    });
  },
  pine(v, snowy) {
    return this.get('lp' + v + snowy, 16, 28, p => {
      p.R(7, 22, 2, 5, '#5a3a24');
      for (const [cy, w] of [[2, 2], [6, 4], [10, 5.5], [14, 7]]) for (let y = 0; y < 6; y++) { const ww = w * (y + 1) / 6 + 0.6; for (let x = Math.round(8 - ww); x <= Math.round(7 + ww); x++) p.P(x, cy + y, x < 6 ? '#3f8a58' : x > 9 ? '#173a28' : '#2a6a44'); }
      if (snowy) for (const [cy, w] of [[2, 2], [6, 4], [10, 5.5], [14, 7]]) { p.R(Math.round(8 - w * 0.6), cy + 2, Math.max(2, Math.round(w)), 1, '#ffffff'); p.R(Math.round(8 - w * 0.3), cy + 1, Math.max(1, Math.round(w * 0.5)), 1, '#f4f8ff'); }
      p.P(8, 1, snowy ? '#ffffff' : '#4f9a68');
    });
  },
  lamp() {
    return this.get('lamp', 12, 30, p => {
      p.R(5, 8, 2, 20, '#2a2a3a'); p.R(5, 8, 1, 20, '#4a4a5a'); p.R(3, 27, 6, 2, '#3a3a4a');
      p.R(2, 1, 8, 2, '#2a2a3a'); p.R(3, 3, 6, 5, '#ffe08a'); p.R(4, 4, 2, 3, '#ffffff'); p.R(2, 8, 8, 1, '#2a2a3a'); p.P(6, 0, '#2a2a3a');
    });
  },
  well() {
    return this.get('well', 18, 26, p => {
      p.E(9, 20, 8, 4.5, '#6a6a7a'); p.E(9, 19.5, 6.5, 3.2, '#2a5aa0'); p.E(8, 19, 3, 1.2, '#5a8ad0');
      for (let x = 1; x < 17; x++) p.P(x, 22 + Math.round(Math.sin(x / 16 * Math.PI) * 1.5), '#a8a8b8');
      p.R(2, 6, 2, 15, '#6a4424'); p.R(14, 6, 2, 15, '#6a4424');
      for (let i = 0; i < 5; i++) p.R(1 + i, 5 - i, 16 - i * 2, 1, i < 2 ? '#b8503a' : '#d8684a');
      p.R(4, 9, 10, 1, '#8a5a30'); p.R(8, 10, 1, 5, '#c8c8d0'); p.R(7, 15, 3, 2, '#7a5a3a');
    });
  },
  statue() {
    return this.get('statue', 16, 30, p => {
      p.R(2, 24, 12, 5, '#7a7a8a'); p.R(2, 24, 12, 1, '#b8b8c8'); p.R(3, 23, 10, 1, '#9a9aaa');
      p.E(8, 7, 3, 3.2, '#eef0fa'); p.R(6, 4, 4, 2, '#f8f8ff');
      for (let y = 10; y < 23; y++) { const w = 2.5 + (y - 10) * 0.25; for (let x = Math.round(8 - w); x <= Math.round(7 + w); x++) p.P(x, y, x < 7 ? '#ffffff' : x > 9 ? '#b8bccc' : '#dfe2ee'); }
      p.L(5, 12, 1, 6, '#e8eaf6', 2); p.L(11, 12, 15, 6, '#e8eaf6', 2);
      p.E(1, 5, 1.5, 1.5, '#9ad4ff'); p.E(15, 5, 1.5, 1.5, '#9ad4ff');
      p.P(8, 2, '#f2c14e'); p.P(7, 2, '#f2c14e'); p.P(9, 2, '#f2c14e');
    });
  },
  pillar(th) {
    return this.get('pil' + th.face[0], 16, 32, p => {
      const [m, d, l] = th.face;
      p.R(2, 0, 12, 3, l); p.R(1, 2, 14, 2, m);
      p.R(3, 4, 10, 24, m); p.R(3, 4, 2, 24, l); p.R(10, 4, 3, 24, d); p.R(6, 4, 1, 24, lighten(m, 0.15));
      p.R(1, 27, 14, 3, m); p.R(1, 27, 14, 1, l); p.R(2, 30, 12, 1, d);
      if (th.glyph) { p.R(7, 10, 2, 1, '#6a4a20'); p.R(7, 14, 2, 3, '#6a4a20'); }
      if (th.banner) { p.R(4, 8, 8, 12, '#a8203a'); p.R(4, 8, 8, 1, '#f2c14e'); p.P(7, 13, '#f2c14e'); p.P(8, 13, '#f2c14e'); p.P(4, 20, '#7a1028'); p.P(11, 20, '#7a1028'); p.R(6, 20, 4, 1, '#a8203a'); p.R(7, 21, 2, 1, '#a8203a'); }
    });
  },
  crystal(v) {
    return this.get('cr' + v, 16, 24, p => {
      const sh = (x, y0, h, w) => { for (let i = 0; i < h; i++) { const ww = Math.max(0, Math.round(w * Math.min(1, i / 3))); p.R(x - ww, y0 + i, ww * 2 + 1, 1, i < 2 ? '#ffffff' : 'X'); } };
      void sh;
      const shard = (cx, top, bot, w) => { for (let y = top; y <= bot; y++) { const t = (y - top) / Math.max(1, bot - top), ww = Math.round(w * Math.min(1, t * 2.5)); for (let x = cx - ww; x <= cx + ww; x++) p.P(x, y, x < cx ? '#e0f6ff' : x === cx ? '#9ad4f4' : '#5aa0d8'); } };
      shard(8, 1 + v, 22, 3); shard(4, 10, 22, 2); shard(12, 8, 22, 2);
      p.P(7, 4 + v, '#ffffff'); p.P(3, 12, '#ffffff');
      p.R(2, 22, 12, 1, '#3a5a8a');
    });
  },
  grave() { return this.get('grave', 14, 18, p => { p.R(3, 3, 8, 13, '#9a9aaa'); p.E(7, 4, 4, 3, '#9a9aaa'); p.R(3, 3, 2, 13, '#c8c8d8'); p.R(6, 6, 2, 6, '#5a5a6a'); p.R(5, 8, 4, 1, '#5a5a6a'); p.R(1, 16, 12, 2, '#5a8a3a'); }); },
  sign() { return this.get('sign', 16, 20, p => { p.R(7, 10, 2, 9, '#5a3a20'); p.R(1, 2, 14, 9, '#a8743e'); p.R(1, 2, 14, 1, '#d8a868'); p.R(1, 10, 14, 1, '#6a4424'); p.R(3, 4, 10, 1, '#5a3a20'); p.R(3, 6, 8, 1, '#5a3a20'); p.R(3, 8, 9, 1, '#5a3a20'); }); },
  throne() {
    return this.get('thr', 16, 28, p => {
      p.R(2, 2, 12, 24, '#c8a030'); p.R(3, 3, 10, 22, '#f2c14e'); p.R(4, 5, 8, 14, '#a8203a'); p.R(4, 5, 8, 1, '#d84060');
      p.R(1, 16, 14, 4, '#f2c14e'); p.R(1, 16, 14, 1, '#fff0a0'); p.R(2, 20, 12, 6, '#c8a030');
      p.R(6, 0, 4, 3, '#f2c14e'); p.P(7, 0, '#ff4060'); p.P(8, 0, '#ff4060');
    });
  },
  coffin() { return this.get('cof', 14, 20, p => { p.R(2, 2, 10, 17, '#8a6a3a'); p.R(3, 3, 8, 15, '#c8a050'); p.R(6, 5, 2, 8, '#5a3a20'); p.R(4, 7, 6, 2, '#5a3a20'); p.R(3, 3, 8, 1, '#e8c870'); }); },
  rock(th) { return this.get('rock' + th.face[0], 16, 16, p => { p.E(8, 10, 6.5, 5, (x, y, nx, ny) => (-nx * 0.6 - ny * 0.8 > 0.35 ? th.face[2] : -nx * 0.6 - ny * 0.8 < -0.3 ? th.face[1] : th.face[0])); p.P(5, 7, '#ffffff'); }); },
};

// ───── 圖塊繪製工具 ─────
function px(g, x, y, c, w = 1, h = 1) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function floorTile(g, th, x0, y0, seed, kind) {
  const [m, d, l] = th.floor, r = seeded(seed);
  px(g, x0, y0, m, 16, 16);
  switch (kind) {
    case 'cave': case 'mine':
      for (let i = 0; i < 18; i++) px(g, x0 + (r() * 16) | 0, y0 + (r() * 16) | 0, r() < 0.5 ? d : l);
      for (let i = 0; i < 2; i++) { const xx = x0 + 2 + (r() * 11) | 0, yy = y0 + 2 + (r() * 11) | 0; px(g, xx, yy, d, 3, 2); px(g, xx, yy, l, 2, 1); }
      if (th.moss && r() < 0.35) for (let i = 0; i < 6; i++) px(g, x0 + (r() * 16) | 0, y0 + (r() * 16) | 0, th.moss);
      break;
    case 'tower': case 'castle': {
      px(g, x0, y0, l, 15, 1); px(g, x0, y0, l, 1, 15); px(g, x0, y0 + 15, d, 16, 1); px(g, x0 + 15, y0, d, 1, 16);
      px(g, x0 + 8, y0 + 1, d, 1, 7); px(g, x0 + 1, y0 + 8, d, 15, 1); px(g, x0 + 1, y0 + 9, l, 7, 1);
      for (let i = 0; i < 4; i++) px(g, x0 + 1 + (r() * 14) | 0, y0 + 1 + (r() * 14) | 0, r() < 0.5 ? d : l);
      if (r() < 0.12) { const xx = x0 + 3 + (r() * 8) | 0, yy = y0 + 3 + (r() * 8) | 0; px(g, xx, yy, d); px(g, xx + 1, yy + 1, d); px(g, xx + 2, yy + 1, d); }
      break;
    }
    case 'tomb':
      px(g, x0, y0 + 7, d, 16, 1); px(g, x0, y0 + 15, d, 16, 1); px(g, x0 + ((seed & 1) ? 4 : 11), y0, d, 1, 7); px(g, x0 + ((seed & 1) ? 11 : 4), y0 + 8, d, 1, 7);
      px(g, x0, y0, l, 16, 1); px(g, x0, y0 + 8, l, 16, 1);
      for (let i = 0; i < 5; i++) px(g, x0 + (r() * 16) | 0, y0 + (r() * 16) | 0, r() < 0.5 ? d : l);
      break;
    case 'ice':
      for (let i = 0; i < 3; i++) { const xx = (r() * 16) | 0, yy = (r() * 16) | 0; for (let k = 0; k < 5; k++) px(g, x0 + ((xx + k) & 15), y0 + ((yy - k) & 15), l); }
      px(g, x0, y0 + 15, d, 16, 1); px(g, x0 + 15, y0, d, 1, 16);
      break;
    case 'wood':
      px(g, x0, y0, '#c8955c', 16, 16);
      for (let yy = 0; yy < 16; yy += 4) { px(g, x0, y0 + yy + 3, '#a07040', 16, 1); px(g, x0, y0 + yy, '#d8a870', 16, 1); const s = ((seed * 7 + yy * 3) % 11) + 2; px(g, x0 + s, y0 + yy, '#a07040', 1, 3); }
      for (let i = 0; i < 3; i++) px(g, x0 + (r() * 16) | 0, y0 + (r() * 16) | 0, '#b88450');
      break;
  }
}
function wallFace(g, th, x0, y0, seed, kind) {
  const [m, d, l] = th.face, r = seeded(seed);
  px(g, x0, y0, m, 16, 16);
  if (th.bricks) {
    for (let yy = 0; yy < 16; yy += 4) { px(g, x0, y0 + yy + 3, d, 16, 1); px(g, x0, y0 + yy, l, 16, 1); for (let xx = ((yy / 4) % 2 ? 4 : 0) + ((seed * 3) % 2); xx < 16; xx += 8) px(g, x0 + xx, y0 + yy, d, 1, 3); }
    for (let i = 0; i < 4; i++) px(g, x0 + (r() * 16) | 0, y0 + 1 + (r() * 14) | 0, r() < 0.5 ? d : l);
    if (th.glyph && seed % 3 === 0) { px(g, x0 + 5, y0 + 5, '#6a4a20', 2, 5); px(g, x0 + 9, y0 + 5, '#6a4a20', 3, 1); px(g, x0 + 10, y0 + 6, '#6a4a20', 1, 4); px(g, x0 + 8, y0 + 9, '#6a4a20', 3, 1); }
    if (kind === 'ice') { px(g, x0 + 2, y0 + 2, '#ffffff', 1, 5); px(g, x0 + 3, y0 + 2, '#e8f8ff', 1, 3); }
  } else {
    // 岩壁：直向紋理
    for (let xx = 0; xx < 16; xx++) { const h = 3 + ((hash2(x0 + xx, 1, seed) * 8) | 0); px(g, x0 + xx, y0 + 16 - h, d, 1, h); }
    for (let i = 0; i < 10; i++) { const xx = (r() * 15) | 0, yy = (r() * 12) | 0; px(g, x0 + xx, y0 + yy, l, 1, 2); px(g, x0 + xx + 1, y0 + yy, d, 1, 2); }
    if (th.moss) for (let i = 0; i < 5; i++) px(g, x0 + (r() * 16) | 0, y0 + (r() * 5) | 0, th.moss);
    if (th.beams && seed % 3 === 0) { px(g, x0 + 2, y0, '#4a2e18', 4, 16); px(g, x0 + 3, y0, '#8a5a30', 1, 16); px(g, x0 + 2, y0 + 1, '#2a1a10', 4, 1); }
  }
  px(g, x0, y0, lighten(m, 0.3), 16, 1);
  px(g, x0, y0 + 14, darken(m, 0.25), 16, 1); px(g, x0, y0 + 15, darken(m, 0.45), 16, 1);
}

// ───── 烘焙 ─────
const LocalBake = {
  bake(f) {
    const def = f.def, th = LTH[def.theme] || LTH.cave, town = def.kind === 'town';
    const TW = f.w, TH = f.h, W = TW * 16, H = TH * 16;
    const T = (x, y) => (x < 0 || y < 0 || x >= TW || y >= TH) ? (town ? 'T' : '#') : f.grid[y][x];
    const isWall = (x, y) => WALLS.has(T(x, y)) || (!town && T(x, y) === 'D' && !F('door:' + f.id + ':' + x + ',' + y));
    const liquid = th.liquid || 'water';
    const res = { props: [], lights: [], builds: [], anim: [], fx: [] };
    // ── 建築物偵測（城鎮） ──
    const inB = new Int16Array(TW * TH).fill(-1);
    if (town) {
      const out = new Uint8Array(TW * TH), q = [];
      const block = c => WALLS.has(c) || c === '+';
      for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if ((x === 0 || y === 0 || x === TW - 1 || y === TH - 1) && !block(T(x, y))) { out[y * TW + x] = 1; q.push([x, y]); }
      while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= TW || ny >= TH) continue; const i = ny * TW + nx; if (out[i] || block(T(nx, ny))) continue; out[i] = 1; q.push([nx, ny]); } }
      const seen = new Uint8Array(TW * TH);
      for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
        const i = y * TW + x; if (out[i] || seen[i] || block(T(x, y))) continue;
        const cells = [], st = [[x, y]]; seen[i] = 1;
        while (st.length) { const [cx, cy] = st.pop(); cells.push([cx, cy]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= TW || ny >= TH) continue; const j = ny * TW + nx; if (seen[j] || out[j] || block(T(nx, ny))) continue; seen[j] = 1; st.push([nx, ny]); } }
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (const [cx, cy] of cells) { x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy); }
        x0--; y0--; x1++; y1++;
        const kinds = new Set(cells.map(([cx, cy]) => T(cx, cy)));
        res.builds.push({ x0, y0, x1, y1, kinds, alpha: 1 });
      }
      res.builds.forEach((b, k) => { for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (x >= 0 && y >= 0 && x < TW && y < TH) inB[y * TW + x] = k; });
    }
    // ── 地面（城鎮室外以逐像素處理，讓道路與水岸圓滑） ──
    const N = W * H, ground = new Uint8ClampedArray(N * 4), waterPx = [], dWarr = new Uint8Array(N).fill(99);
    if (town) {
      const gname = th.ground;
      const P = { grass: ['#5cb446', '#4a9a3a', '#74c858', '#3f8a32'], cobble: ['#a8a4a0', '#8e8a86', '#bcb8b2', '#7a7672'], sand: ['#e6cc8a', '#d2b472', '#f2e0a6', '#c4a466'], snow: ['#e8f0fa', '#ccd8ec', '#ffffff', '#b8c8e0'] }[gname].map(RGB);
      const road = gname === 'snow' ? ['#c8d0dc', '#aab4c4'] : gname === 'sand' ? ['#d4b070', '#b8945a'] : ['#c89c64', '#9e7a4c'];
      const R0 = RGB(road[0]), R1 = RGB(road[1]), COB = ['#a8a4a0', '#8e8a86', '#c4c0ba', '#7a7672'].map(RGB), SANDC = RGB('#e6cc8a'), SNOWC = RGB('#e8f0fa');
      const isWater = (x, y) => { const c = T(x, y); return c === '~' || c === 'D'; };
      const mask = new Uint8Array(N), wmask = new Uint8Array(N);
      for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) { const c = T(tx, ty); const isR = c === ';'; const isW = isWater(tx, ty); if (!isR && !isW) continue; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const i = (ty * 16 + y) * W + tx * 16 + x; if (isR) mask[i] = 1; if (isW) wmask[i] = 1; } }
      const integ = a => { const I = new Float32Array((W + 1) * (H + 1)); for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += a[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } } return I; };
      const box = (I, x, y, r) => { const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(W, x + r + 1), y1 = Math.min(H, y + r + 1); return (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0)); };
      const IR = integ(mask), IW = integ(wmask);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, o = i * 4, tx = x >> 4, ty = y >> 4, c = T(tx, ty);
        const n = fbm(x / 22, y / 22, 5), h = hash2(x, y, 3);
        let col = n > 0.62 ? P[2] : n < 0.36 ? P[1] : P[0];
        if (h < 0.05) col = P[1]; else if (h > 0.96) col = P[2];
        if (gname === 'grass' && h > 0.988) col = P[3];
        if (gname === 'cobble') { const sx = (x + ((y >> 2) & 1) * 3) % 6, sy = y % 4; col = sx === 0 || sy === 0 ? COB[3] : sx === 1 && sy === 1 ? COB[2] : (hash2((x + ((y >> 2) & 1) * 3) / 6 | 0, y >> 2, 1) < 0.3 ? COB[1] : COB[0]); }
        if (c === '_' && gname !== 'cobble') { const sx = (x + ((y >> 2) & 1) * 3) % 6, sy = y % 4; col = sx === 0 || sy === 0 ? COB[3] : (sx === 1 && sy === 1) ? COB[2] : COB[0]; }
        if (c === ':' && gname !== 'sand') col = SANDC; if (c === '*' && gname !== 'snow') col = SNOWC;
        const rv = box(IR, x, y, 3) + (fbm(x / 5, y / 5, 8) - 0.5) * 0.3;
        if (rv > 0.6) col = h < 0.08 ? R1 : R0; else if (rv > 0.48) col = R1;
        const wv = box(IW, x, y, 4) + (fbm(x / 7, y / 7, 2) - 0.5) * 0.2;
        if (wv > 0.5 && (isWater(tx, ty) || box(IW, x, y, 1) > 0.3)) { waterPx.push(i); dWarr[i] = Math.round((1 - wv) * 0 + Math.min(9, (wv - 0.5) * 20)); }
        ground[o] = col[0]; ground[o + 1] = col[1]; ground[o + 2] = col[2]; ground[o + 3] = 255;
      }
    }
    // ── 靜態層 ──
    const stat = document.createElement('canvas'); stat.width = W; stat.height = H;
    const g = stat.getContext('2d');
    const kindOf = def.theme;
    const floorKind = town ? 'wood' : kindOf;
    const animCells = [];
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const c = T(x, y), X = x * 16, Y = y * 16, seed = ((hash2(x, y, 7) * 1000) | 0) + 1;
      const insideB = town && inB[y * TW + x] >= 0;
      const floorHere = () => { if (town) { if (insideB) floorTile(g, th, X, Y, seed, 'wood'); } else floorTile(g, th, X, Y, seed, floorKind); };
      if (isWall(x, y) && !(c === 'D' && town)) {
        const below = T(x, y + 1), face = !isWall(x, y + 1) && y + 1 < TH;
        if (town) {
          // 城鎮的牆（室內切面）：木樑與室內牆
          if (face && insideB && inB[(y + 1) * TW + x] >= 0 && FLOORISH.has(below) || (face && insideB && below !== '+' && inB[(y + 1) * TW + x] >= 0)) {
            px(g, X, Y, '#d8c8a4', 16, 16); px(g, X, Y + 10, '#8a6a44', 16, 6); px(g, X, Y + 10, '#a8845a', 16, 1); px(g, X, Y + 15, '#5a4028', 16, 1);
            for (let xx = 0; xx < 16; xx += 4) px(g, X + xx, Y + 11, '#7a5a38', 1, 4);
            px(g, X, Y, '#5a4030', 16, 3); px(g, X, Y + 3, '#3a2a1a', 16, 1);
            if (c === 'k') { px(g, X + 1, Y + 1, '#3a2414', 14, 14); px(g, X + 2, Y + 2, '#6a4424', 12, 12); for (let yy = 2; yy < 14; yy += 4) { const cols = ['#d84a3a', '#4a7ad8', '#3aa050', '#f2c14e', '#a050d0']; for (let xx = 2; xx < 14; xx += 2) px(g, X + xx, Y + yy, cols[(xx + yy + seed) % 5], 2, 3); px(g, X + 2, Y + yy + 3, '#3a2414', 12, 1); } }
          } else {
            px(g, X, Y, '#5a4030', 16, 16); px(g, X, Y, '#7a5a40', 16, 1); px(g, X + 1, Y + 1, '#4a3424', 14, 14);
            if (!isWall(x - 1, y)) px(g, X, Y, '#8a6a4a', 1, 16); if (!isWall(x + 1, y)) px(g, X + 15, Y, '#3a2818', 1, 16);
            if (!isWall(x, y - 1)) px(g, X, Y, '#8a6a4a', 16, 1); if (!isWall(x, y + 1)) px(g, X, Y + 15, '#2a1a10', 16, 1);
          }
          continue;
        }
        if (face) {
          wallFace(g, th, X, Y, seed, kindOf);
          if (c === '!') { px(g, X + 7, Y + 7, '#5a3a20', 2, 6); px(g, X + 5, Y + 6, '#3a2414', 6, 2); res.lights.push({ x: X + 8, y: Y + 4, r: 46, col: '255,170,80', fl: 1, flame: 1 }); }
          if (c === 'k') { px(g, X + 1, Y + 1, '#3a2414', 14, 14); px(g, X + 2, Y + 2, '#6a4424', 12, 12); }
          if (th.banner && seed % 4 === 0) { px(g, X + 4, Y + 1, '#a8203a', 8, 11); px(g, X + 4, Y + 1, '#f2c14e', 8, 1); px(g, X + 7, Y + 5, '#f2c14e', 2, 2); px(g, X + 5, Y + 12, '#a8203a', 2, 1); px(g, X + 9, Y + 12, '#a8203a', 2, 1); }
        } else {
          px(g, X, Y, th.top, 16, 16);
          const r = seeded(seed); for (let i = 0; i < 8; i++) px(g, X + (r() * 16) | 0, Y + (r() * 16) | 0, lighten(th.top, 0.08));
          const rim = lighten(th.face[0], 0.05), rimD = darken(th.top, 0.4);
          if (!isWall(x - 1, y)) { px(g, X, Y, rim, 2, 16); px(g, X + 2, Y, rimD, 1, 16); }
          if (!isWall(x + 1, y)) { px(g, X + 14, Y, rim, 2, 16); px(g, X + 13, Y, rimD, 1, 16); }
          if (!isWall(x, y - 1)) { px(g, X, Y, rim, 16, 2); px(g, X, Y + 2, rimD, 16, 1); }
          if (!isWall(x, y + 1)) { px(g, X, Y + 14, rim, 16, 2); }
        }
        continue;
      }
      // 非牆
      switch (c) {
        case '~': case '%': case 'H': animCells.push([x, y, c]); if (c === 'H') res.lights.push({ x: X + 8, y: Y + 8, r: 34, col: '120,220,255', fl: 0 }); continue;
        case 'D': if (town) { animCells.push([x, y, 'D']); continue; } break;
      }
      if (!town || insideB) floorHere();
      // AO：牆下方與左右的陰影
      if (!town || insideB) {
        if (isWall(x, y - 1)) { const gr = g.createLinearGradient(0, Y, 0, Y + 7); gr.addColorStop(0, 'rgba(10,6,20,.45)'); gr.addColorStop(1, 'rgba(10,6,20,0)'); g.fillStyle = gr; g.fillRect(X, Y, 16, 7); }
        if (isWall(x - 1, y)) { g.fillStyle = 'rgba(10,6,20,.25)'; g.fillRect(X, Y, 3, 16); }
        if (isWall(x + 1, y)) { g.fillStyle = 'rgba(10,6,20,.18)'; g.fillRect(X + 13, Y, 3, 16); }
      }
      const drawObj = () => {
        switch (c) {
          case 'R': { px(g, X, Y, '#9a1a34', 16, 16); px(g, X + 1, Y, '#f2c14e', 1, 16); px(g, X + 14, Y, '#f2c14e', 1, 16); px(g, X + 2, Y, '#c03450', 12, 16); for (let yy = 0; yy < 16; yy += 8) { px(g, X + 7, Y + yy + 3, '#f2c14e', 2, 2); } if (T(x, y - 1) !== 'R' && T(x, y - 1) !== 'Z') px(g, X, Y, '#f2c14e', 16, 1); if (T(x, y + 1) !== 'R') px(g, X, Y + 15, '#f2c14e', 16, 1); break; }
          case ',': { const r = seeded(seed + 9), cols = ['#ff6a8a', '#fff4a0', '#ffffff', '#ff9a40', '#c08aff']; for (let i = 0; i < 5; i++) { const xx = X + 1 + (r() * 13) | 0, yy = Y + 1 + (r() * 13) | 0, cc = cols[(r() * 5) | 0]; px(g, xx, yy + 2, '#3f8a32', 1, 2); px(g, xx - 1, yy, cc); px(g, xx + 1, yy, cc); px(g, xx, yy - 1, cc); px(g, xx, yy + 1, cc); px(g, xx, yy, '#ffe060'); } break; }
          case 'h': { for (const [bx, by, br] of [[5, 10, 4.5], [11, 10, 4.5], [8, 6.5, 4.5]]) for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) if (a * a + b * b <= br * br) px(g, X + bx + a, Y + by + b, a + b < -3 ? '#7ad45e' : a + b > 3 ? '#2a6a30' : '#44964a'); px(g, X + 5, Y + 6, '#ff8aa0'); px(g, X + 10, Y + 9, '#ffffff'); break; }
          case 'f': { px(g, X, Y + 6, '#5a3a20', 16, 2); px(g, X, Y + 11, '#5a3a20', 16, 2); px(g, X, Y + 6, '#c8945a', 16, 1); px(g, X, Y + 11, '#c8945a', 16, 1); for (const xx of [2, 11]) { px(g, X + xx, Y + 3, '#3a2414', 3, 12); px(g, X + xx + 1, Y + 3, '#d0a070', 1, 11); } break; }
          case 'F': { animCells.push([x, y, 'F']); break; }
          case '=': { px(g, X, Y + 2, '#3a2414', 16, 12); px(g, X, Y + 3, '#b07a44', 16, 4); px(g, X, Y + 7, '#8a5a30', 16, 6); px(g, X, Y + 3, '#d8a868', 16, 1); for (let xx = 2; xx < 16; xx += 5) px(g, X + xx, Y + 8, '#6a4424', 1, 5); break; }
          case 'b': { px(g, X + 2, Y + 1, '#3a2414', 12, 14); px(g, X + 3, Y + 2, '#f4f4f4', 10, 4); px(g, X + 4, Y + 3, '#ffffff', 8, 2); px(g, X + 3, Y + 6, '#4a7ad8', 10, 8); px(g, X + 3, Y + 6, '#7aa2f0', 10, 1); px(g, X + 3, Y + 9, '#3a64c0', 10, 1); px(g, X + 2, Y + 14, '#5a3a20', 12, 1); break; }
          case 't': { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(X + 3, Y + 12, 11, 3); px(g, X + 2, Y + 4, '#3a2414', 12, 8); px(g, X + 3, Y + 5, '#b07a44', 10, 5); px(g, X + 3, Y + 5, '#d8a868', 10, 1); px(g, X + 3, Y + 10, '#6a4424', 2, 4); px(g, X + 11, Y + 10, '#6a4424', 2, 4); px(g, X + 6, Y + 6, '#f4f4f4', 3, 2); px(g, X + 7, Y + 5, '#f2c14e', 1, 1); break; }
          case 'B': { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(X + 3, Y + 13, 11, 3); px(g, X + 3, Y + 2, '#3a2414', 10, 13); px(g, X + 4, Y + 3, '#a8743e', 8, 11); px(g, X + 4, Y + 3, '#6a4424', 8, 2); px(g, X + 4, Y + 6, '#5a3a20', 8, 1); px(g, X + 4, Y + 11, '#5a3a20', 8, 1); px(g, X + 5, Y + 4, '#c8945a', 2, 10); break; }
          case 'p': { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(X + 4, Y + 13, 9, 3); px(g, X + 4, Y + 4, '#2a1420', 8, 11); px(g, X + 5, Y + 5, '#c86a3a', 6, 9); px(g, X + 6, Y + 3, '#2a1420', 4, 2); px(g, X + 6, Y + 6, '#f0a070', 2, 4); px(g, X + 5, Y + 9, '#a04a2a', 6, 1); break; }
          case 'X': { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(X + 3, Y + 13, 12, 3); px(g, X + 2, Y + 3, '#3a2414', 12, 12); px(g, X + 3, Y + 4, '#c8945a', 10, 10); px(g, X + 3, Y + 4, '#e0b07a', 10, 1); px(g, X + 3, Y + 8, '#7a5230', 10, 1); px(g, X + 8, Y + 4, '#7a5230', 1, 10); break; }
          case 'Y': { px(g, X + 1, Y + 4, '#3a3a4a', 14, 10); px(g, X + 2, Y + 5, '#f0f0f8', 12, 4); px(g, X + 2, Y + 9, '#c8c8d8', 12, 4); px(g, X + 2, Y + 5, '#f2c14e', 12, 1); px(g, X + 7, Y, '#f2c14e', 2, 6); px(g, X + 5, Y + 2, '#f2c14e', 6, 1); for (const xx of [3, 12]) { px(g, X + xx, Y + 2, '#f8f0d0', 1, 3); res.lights.push({ x: X + xx + 0.5, y: Y + 1, r: 20, col: '255,220,140', fl: 1, flame: 0.5 }); } break; }
          case 'Q': { px(g, X + 1, Y, '#5a3a20', 2, 16); px(g, X + 13, Y, '#5a3a20', 2, 16); px(g, X + 1, Y, '#7a5a30', 14, 2); px(g, X + 4, Y + 3, '#3a2010', 8, 10); px(g, X + 5, Y + 3, '#f2c14e', 6, 9); px(g, X + 3, Y + 11, '#3a2010', 10, 2); px(g, X + 4, Y + 11, '#d8a030', 8, 1); px(g, X + 6, Y + 4, '#fff0a0', 1, 6); px(g, X + 7, Y + 13, '#8a6a20', 2, 2); break; }
          case 'K': { px(g, X + 2, Y + 6, '#1a1020', 12, 4); px(g, X + 3, Y + 6, '#7a7a8a', 10, 2); px(g, X + 5, Y + 10, '#3a3a4a', 6, 4); px(g, X + 3, Y + 13, '#3a3a4a', 10, 2); px(g, X + 12, Y + 2, '#ff7a20', 3, 3); res.lights.push({ x: X + 13, y: Y + 3, r: 26, col: '255,140,60', fl: 1 }); break; }
          case 'C': { const open = f.chestOpen(x, y); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X + 2, Y + 13, 13, 3); px(g, X + 2, Y + 4, '#2a1420', 12, 11); px(g, X + 3, Y + 5, open ? '#3a2414' : '#c8803a', 10, 4); px(g, X + 3, Y + 9, '#a8602a', 10, 5); px(g, X + 3, Y + 9, '#f2c14e', 10, 1); px(g, X + 3, Y + 5, open ? '#2a1a10' : '#e8a050', 10, 1); px(g, X + 2, Y + 4, '#f2c14e', 1, 11); px(g, X + 13, Y + 4, '#f2c14e', 1, 11); px(g, X + 7, Y + 8, '#ffe070', 2, 3); if (!open) res.fx.push({ kind: 'glint', x: X + 4, y: Y + 5 }); break; }
          case '<': { for (let i = 0; i < 5; i++) { px(g, X + 2, Y + 1 + i * 3, '#1a1020', 12, 3); px(g, X + 3, Y + 1 + i * 3, lighten((th.floor || ['#c8955c'])[0], 0.3 - i * 0.05), 10, 2); } px(g, X + 2, Y, '#1a1020', 1, 16); px(g, X + 13, Y, '#1a1020', 1, 16); break; }
          case '>': { px(g, X + 1, Y + 1, '#120a18', 14, 14); for (let i = 0; i < 4; i++) px(g, X + 2 + i, Y + 2 + i * 3, darken((th.floor || ['#8a8a8a'])[0], 0.25 + i * 0.17), 12 - i * 2, 3); px(g, X + 1, Y + 1, lighten((th.floor || ['#8a8a8a'])[0], 0.2), 14, 1); break; }
          case 'E': { const gr = g.createLinearGradient(0, Y, 0, Y + 16); gr.addColorStop(0, 'rgba(255,250,220,.0)'); gr.addColorStop(1, 'rgba(255,250,220,.75)'); g.fillStyle = gr; g.fillRect(X + 2, Y, 12, 16); res.lights.push({ x: X + 8, y: Y + 14, r: 40, col: '255,250,220', fl: 0 }); break; }
          case 'i': { px(g, X, Y, '#d8f2ff', 16, 16); px(g, X, Y, '#ffffff', 16, 1); px(g, X, Y, '#ffffff', 1, 16); for (let k = 0; k < 6; k++) px(g, X + 3 + k, Y + 9 - k, '#ffffff'); for (let k = 0; k < 3; k++) px(g, X + 9 + k, Y + 13 - k, '#ffffff'); px(g, X + 15, Y, '#9ad0f0', 1, 16); px(g, X, Y + 15, '#9ad0f0', 16, 1); break; }
          case 'j': { px(g, X, Y + 3, '#5a3a20', 16, 2); px(g, X, Y + 11, '#5a3a20', 16, 2); for (let xx = 1; xx < 16; xx += 4) px(g, X + xx, Y + 2, '#7a5a3a', 2, 12); px(g, X, Y + 4, '#b8b8c8', 16, 1); px(g, X, Y + 12, '#b8b8c8', 16, 1); px(g, X, Y + 3, '#e8e8f0', 16, 1); px(g, X, Y + 11, '#e8e8f0', 16, 1); break; }
          case 'D': { // 迷宮的鎖門（已開）
            break; }
        }
      };
      drawObj();
      if (c === 'D' && !town && !F('door:' + f.id + ':' + x + ',' + y)) { wallFace(g, th, X, Y, seed, kindOf); px(g, X + 2, Y + 1, '#1a1020', 12, 15); px(g, X + 3, Y + 2, '#7a5a30', 10, 14); px(g, X + 3, Y + 2, '#9a7a40', 10, 1); px(g, X + 7, Y + 2, '#5a3a20', 2, 14); px(g, X + 6, Y + 8, '#f2c14e', 4, 4); px(g, X + 7, Y + 9, '#1a1020', 2, 2); }
      // 立體物件
      if (PROPKINDS[c]) {
        const k = PROPKINDS[c], v = (hash2(x, y, 5) * 3) | 0, snowy = th.snowy || def.theme === 'snow';
        let img = null;
        if (k === 'tree') img = snowy ? LSpr.pine(v, true) : LSpr.tree(v, false);
        if (k === 'palm') img = LSpr.palm(v); if (k === 'pine') img = LSpr.pine(v, snowy);
        if (k === 'lamp') { img = LSpr.lamp(); res.lights.push({ x: X + 8, y: Y - 9, r: 54, col: '255,220,140', fl: 0.4, lamp: 1 }); }
        if (k === 'well') img = LSpr.well(); if (k === 'statue') { img = LSpr.statue(); res.lights.push({ x: X + 8, y: Y - 2, r: 30, col: '170,210,255', fl: 0 }); }
        if (k === 'pillar') img = LSpr.pillar(th.face ? th : LTH.tower); if (k === 'crystal') { img = LSpr.crystal(v); res.lights.push({ x: X + 8, y: Y + 2, r: 40, col: '140,210,255', fl: 0.2 }); }
        if (k === 'grave') img = LSpr.grave(); if (k === 'sign') img = LSpr.sign(); if (k === 'throne') img = LSpr.throne(); if (k === 'coffin') img = LSpr.coffin(); if (k === 'rock') img = LSpr.rock(th.face ? th : LTH.cave);
        if (img) {
          if (k !== 'sign' && k !== 'coffin' && k !== 'throne' && k !== 'rock') { g.fillStyle = 'rgba(10,20,10,.22)'; g.beginPath(); g.ellipse(X + 8, Y + 14, img.width * 0.36, 3, 0, 0, TAU); g.fill(); }
          res.props.push({ x, y, img, ox: X + 8 - img.width / 2, oy: Y + 16 - img.height + (k === 'tree' || k === 'pine' ? 2 : 0) });
        }
      }
    }
    // ── 建築外觀（屋頂、正面牆）──
    if (town) res.builds.forEach((b, k) => { b.img = this.roof(f, th, b, k, T); b.key = b.y1 + 0.55; for (const l of b.lights) res.lights.push(l); });
    // ── 動畫層與合成 ──
    const frames = [];
    const L = LIQ[liquid] || LIQ.water;
    for (let fr = 0; fr < 4; fr++) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const cg = c.getContext('2d');
      if (town) {
        const data = new Uint8ClampedArray(ground), ph = fr / 4 * TAU, C = L.map(RGB);
        for (const i of waterPx) { const x = i % W, y = (i / W) | 0, d = dWarr[i], o = i * 4; let col = d <= 0 ? C[3] : d <= 1 ? (Math.sin(ph + (x + y) * 0.4) > 0 ? C[3] : C[2]) : d <= 3 ? C[2] : d <= 6 ? C[1] : C[0]; if (d > 2 && Math.sin(x * 0.45 + Math.sin(y * 0.25 + ph) * 2) + Math.sin(y * 0.9 - ph) > 1.7 && (y & 3) < 2) col = C[3]; data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; }
        cg.putImageData(new ImageData(data, W, H), 0, 0);
      } else { cg.fillStyle = th.top; cg.fillRect(0, 0, W, H); }
      cg.drawImage(stat, 0, 0);
      for (const [x, y, k] of animCells) this.animTile(cg, f, th, x, y, k, fr, L, T, town);
      frames.push(c);
    }
    res.frames = frames;
    return res;
  },
  animTile(g, f, th, x, y, k, fr, L, T, town) {
    const X = x * 16, Y = y * 16, ph = fr / 4 * TAU;
    if (k === '~' && town) return; // 城鎮的水已在逐像素中處理
    if (k === '~' || k === 'D') {
      const liq = k === 'D' ? LIQ.water : L;
      if (!(town && k === 'D')) {
        px(g, X, Y, liq[0], 16, 16);
        for (let yy = 0; yy < 16; yy += 3) for (let xx = 0; xx < 16; xx++) if (Math.sin((xx + X) * 0.5 + ph + yy) > 0.7) px(g, X + xx, Y + yy + ((xx + fr) & 1), liq[1]);
        if (Math.sin(ph + x * 2.3 + y) > 0.2) px(g, X + ((x * 5 + fr * 3) % 12), Y + 4 + (y % 3) * 3, liq[2], 3, 1);
        const land = (dx, dy) => { const c = T(x + dx, y + dy); return c !== '~' && c !== 'D'; };
        if (land(0, -1)) { px(g, X, Y, darken(liq[0], 0.4), 16, 3); px(g, X, Y + 3, liq[3], 16, 1); }
        if (land(-1, 0)) px(g, X, Y, liq[2], 1, 16); if (land(1, 0)) px(g, X + 15, Y, liq[2], 1, 16); if (land(0, 1)) px(g, X, Y + 15, liq[2], 16, 1);
      }
      if (k === 'D') { px(g, X + 1, Y, '#3a2414', 14, 16); for (let yy = 0; yy < 16; yy += 3) { px(g, X + 2, Y + yy, '#c8945a', 12, 2); px(g, X + 2, Y + yy, '#e0b07a', 12, 1); } px(g, X + 1, Y + 13, '#5a3a20', 2, 3); px(g, X + 13, Y + 13, '#5a3a20', 2, 3); }
      return;
    }
    if (k === '%') {
      px(g, X, Y, '#3a2a4a', 16, 16); const r = seeded(x * 31 + y);
      for (let i = 0; i < 16; i++) px(g, X + (r() * 16) | 0, Y + (r() * 16) | 0, r() < 0.5 ? '#6a3a8a' : '#4a3a5a');
      const b = (fr + x + y) & 3; px(g, X + 3 + b * 2, Y + 4 + (b & 1) * 6, '#c08ae0', 2, 2); px(g, X + 11 - b, Y + 11, '#a070c0', 2, 1); if (b === 2) px(g, X + 9, Y + 3, '#e0b0ff');
      return;
    }
    if (k === 'H') {
      floorTile(g, th, X, Y, x * 7 + y, th.floor ? f.def.theme : 'tower');
      px(g, X + 1, Y + 1, '#1a1020', 14, 14); px(g, X + 2, Y + 2, '#5ad0ff', 12, 12); px(g, X + 2, Y + 2, '#8ae4ff', 12, 2);
      px(g, X + 4 + fr, Y + 6 + (fr & 1), '#ffffff', 2, 1); px(g, X + 10 - fr, Y + 10, '#c8f4ff', 2, 1); px(g, X + 7, Y + 4 + fr * 2 % 6, '#e8ffff');
      return;
    }
    if (k === 'F') {
      px(g, X + 1, Y + 3, '#5a5a6a', 14, 12); px(g, X + 2, Y + 4, '#4a92e6', 12, 10); px(g, X + 2, Y + 4, '#a8a8b8', 12, 1);
      px(g, X + 6, Y + 3, '#a8a8b8', 4, 8); px(g, X + 7, Y + 3, '#d8d8e8', 1, 8);
      const s = fr & 3; px(g, X + 7, Y + s % 2, '#e8f8ff', 2, 3); px(g, X + 4 + s, Y + 7 + (s & 1), '#d8f0ff'); px(g, X + 11 - s, Y + 9, '#d8f0ff');
      px(g, X + 3, Y + 12, '#b8e0ff', 3, 1); px(g, X + 10, Y + 6 + s, '#b8e0ff', 2, 1);
    }
  },
  // 建築外觀：屋頂 + 正面牆
  roof(f, th, b, k, T) {
    const w = (b.x1 - b.x0 + 1) * 16, hRoof = (b.y1 - b.y0) * 16, padT = 10, padS = 3;
    const c = document.createElement('canvas'); c.width = w + padS * 2; c.height = hRoof + 16 + padT + 2;
    const g = c.getContext('2d');
    b.lights = [];
    const ox = padS, oy = padT; // 建築左上角
    b.ox = b.x0 * 16 - padS; b.oy = b.y0 * 16 - padT;
    const roofC = th.roofs[(b.x0 * 7 + b.y0 * 3) % th.roofs.length];
    const R = shd(roofC);
    const isChurch = b.kinds.has('Y'), isInn = b.kinds.has('b') && b.kinds.has('='), isShop = b.kinds.has('=') && !isInn, isSmith = b.kinds.has('K'), isBell = b.kinds.has('Q'), isPalace = b.kinds.has('Z');
    // 正面牆（最下面一排）
    const fy = oy + hRoof;
    for (let x = b.x0; x <= b.x1; x++) {
      const X = ox + (x - b.x0) * 16, cc = T(x, b.y1);
      if (th.logs) { for (let yy = 0; yy < 16; yy += 4) { px(g, X, fy + yy, th.wall, 16, 4); px(g, X, fy + yy, lighten(th.wall, 0.2), 16, 1); px(g, X, fy + yy + 3, th.wall2, 16, 1); } }
      else { px(g, X, fy, th.wall, 16, 16); px(g, X, fy + 13, th.wall2, 16, 3); px(g, X, fy, th.timber, 16, 2); if ((x - b.x0) % 3 === 0 && !th.flat) px(g, X, fy, th.timber, 2, 16); }
      if (cc === '+') {
        px(g, X + 3, fy + 2, '#3a2414', 10, 14); px(g, X + 4, fy + 3, '#8a5a30', 8, 13); px(g, X + 4, fy + 3, '#a8743e', 8, 1); px(g, X + 8, fy + 4, '#5a3a20', 1, 12); px(g, X + 10, fy + 9, '#f2c14e');
        px(g, X + 2, fy + 1, th.timber, 12, 1);
      } else if ((x + b.y1) % 2 === 0 && x > b.x0 && x < b.x1) {
        px(g, X + 4, fy + 4, '#3a2a1a', 8, 8); px(g, X + 5, fy + 5, '#ffd98a', 6, 6); px(g, X + 5, fy + 5, '#fff2c8', 2, 2); px(g, X + 8, fy + 5, '#c89a4a', 1, 6); px(g, X + 5, fy + 8, '#c89a4a', 6, 1);
        px(g, X + 3, fy + 12, th.timber, 10, 1);
        b.lights.push({ x: b.ox + X + 8, y: b.oy + fy + 9, r: 22, col: '255,210,120', fl: 0.15, win: 1 });
      }
    }
    // 側門／後門的標記
    // 屋頂
    const top = oy - 8, bottom = fy + 2, ridge = Math.round(lerp(top, bottom, th.flat ? 0 : 0.3));
    if (th.flat) {
      px(g, ox - padS, top, R.lo, w + padS * 2, bottom - top);
      px(g, ox - padS + 2, top + 2, R.md, w + padS * 2 - 4, bottom - top - 5);
      const r = seeded(k * 9 + 1); for (let i = 0; i < w * 0.6; i++) px(g, ox + (r() * w) | 0, top + 3 + (r() * (bottom - top - 8)) | 0, r() < 0.5 ? R.hi : R.lo);
      px(g, ox - padS, top, R.hi, w + padS * 2, 2); px(g, ox - padS, bottom - 3, darken(roofC, 0.45), w + padS * 2, 3);
      if (isPalace || w > 7 * 16) { const cx = ox + w / 2, cy = top + (bottom - top) * 0.45, rr = Math.min(w * 0.18, (bottom - top) * 0.32); g.fillStyle = '#e8c060'; g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.85, 0, Math.PI, 0); g.fill(); g.fillStyle = '#fff0b0'; g.fillRect(cx - rr * 0.5, cy - rr * 0.7, rr * 0.25, rr * 0.5); g.fillStyle = '#c89030'; g.fillRect(cx - rr, cy, rr * 2, 2); g.fillStyle = '#f2c14e'; g.fillRect(cx - 1, cy - rr * 0.85 - 6, 2, 6); }
      else if (k % 2 === 0) { px(g, ox + w - 22, top + 6, '#c0a070', 8, 6); px(g, ox + w - 22, top + 6, '#e0c090', 8, 1); }
    } else {
      // 北坡
      for (let y = top; y < ridge; y++) { const t = (y - top) / Math.max(1, ridge - top); px(g, ox - padS, y, mix(R.hi, R.md, t * 0.6), w + padS * 2, 1); }
      for (let y = top + 3; y < ridge; y += 3) for (let x = ox - padS + ((y / 3) % 2 ? 2 : 0); x < ox + w + padS; x += 5) px(g, x, y, R.md, 1, 2);
      // 屋脊
      px(g, ox - padS, ridge - 1, lighten(roofC, 0.5), w + padS * 2, 2); px(g, ox - padS, ridge + 1, R.dk, w + padS * 2, 1);
      // 南坡（瓦片）
      for (let y = ridge + 2; y < bottom; y++) {
        const t = (y - ridge) / Math.max(1, bottom - ridge), row = ((y - ridge - 2) / 4) | 0, ry = (y - ridge - 2) % 4;
        px(g, ox - padS, y, ry === 3 ? R.lo : mix(R.md, R.lo, t * 0.5), w + padS * 2, 1);
        if (ry === 0) for (let x = ox - padS + (row % 2 ? 3 : 0); x < ox + w + padS; x += 6) px(g, x, y, R.lo, 1, 3);
        if (ry === 1) for (let x = ox - padS + (row % 2 ? 4 : 1); x < ox + w + padS; x += 6) px(g, x, y, lighten(roofC, 0.12), 2, 1);
      }
      px(g, ox - padS, bottom - 2, R.dk, w + padS * 2, 2);
      // 山牆兩端
      px(g, ox - padS, top, R.lo, 2, bottom - top); px(g, ox + w + padS - 2, top, R.dk, 2, bottom - top);
      if (th.snowy) {
        for (let x = ox - padS; x < ox + w + padS; x++) { const d = 3 + Math.round(Math.sin(x * 0.4) * 1.5 + hash2(x, k, 3) * 2); px(g, x, top, '#ffffff', 1, ridge - top + 1); px(g, x, ridge + 1, '#f0f6ff', 1, d); if (x % 7 === 3) px(g, x, bottom, '#d8f0ff', 1, 2 + (x % 3)); }
      }
      // 煙囪
      if (!isChurch && !isBell) { const cx = ox + w - 26 - (k % 2) * 20, cy = ridge - 6; px(g, cx, cy, '#6a4a3a', 7, 10); px(g, cx, cy, '#8a6a5a', 7, 1); px(g, cx - 1, cy - 1, '#4a3a2a', 9, 2); b.chimney = { x: b.ox + cx + 3.5, y: b.oy + cy - 2 }; }
      if (isChurch) { const cx = ox + w / 2; px(g, cx - 1, top - 10, '#f2c14e', 3, 12); px(g, cx - 4, top - 6, '#f2c14e', 9, 2); px(g, cx, top - 10, '#fff0a0', 1, 10); }
      if (isBell) { const cx = ox + w / 2; for (let i = 0; i < 12; i++) px(g, cx - 1 - i * 0.9, top - 12 + i, R.md, 3 + i * 1.8, 1); px(g, cx - 4, top - 2, '#3a2a1a', 8, 7); px(g, cx - 3, top - 1, '#f2c14e', 6, 5); px(g, cx - 2, top, '#fff0a0', 1, 3); }
    }
    // 招牌
    const sign = isInn ? 'inn' : isShop ? 'shop' : isSmith ? 'smith' : isChurch ? 'church' : null;
    if (sign) {
      const doorX = (() => { for (let x = b.x0; x <= b.x1; x++) if (T(x, b.y1) === '+') return x; return null; })();
      const sx = ox + ((doorX !== null ? doorX - b.x0 : 1) + (doorX !== null ? 1 : 0)) * 16 + 2, sy = fy - 1;
      if (doorX !== null && doorX < b.x1) {
        px(g, sx, sy, '#3a2414', 12, 10); px(g, sx + 1, sy + 1, '#e8d0a0', 10, 8);
        const ic = { inn: () => { px(g, sx + 3, sy + 4, '#4a7ad8', 6, 2); px(g, sx + 2, sy + 3, '#ffffff', 3, 2); px(g, sx + 2, sy + 6, '#6a4424', 8, 1); }, shop: () => { px(g, sx + 4, sy + 2, '#3aa050', 4, 5); px(g, sx + 5, sy + 2, '#8ae08a', 1, 4); px(g, sx + 4, sy + 7, '#d84a3a', 4, 1); }, smith: () => { px(g, sx + 3, sy + 5, '#6a6a7a', 6, 2); px(g, sx + 5, sy + 2, '#8a8a9a', 2, 3); }, church: () => { px(g, sx + 5, sy + 2, '#d8a030', 2, 6); px(g, sx + 3, sy + 4, '#d8a030', 6, 2); } }[sign];
        ic();
      }
    }
    // 不是在正面牆的門（側門、後門）：在屋頂上畫出入口
    for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
      if (T(x, y) !== '+') continue;
      const X = ox + (x - b.x0) * 16, Y = oy + (y - b.y0) * 16;
      if (y === b.y0) { px(g, X + 2, Y - 9, '#3a2414', 12, 13); px(g, X + 3, Y - 8, '#8a5a30', 10, 11); px(g, X + 3, Y - 8, '#c8945a', 10, 1); px(g, X + 7, Y - 7, '#5a3a20', 2, 10); px(g, X + 1, Y + 3, '#2a1a10', 14, 2); }
      else { const left = x === b.x0; px(g, X + (left ? -3 : 7), Y + 1, '#3a2414', 12, 14); px(g, X + (left ? -2 : 8), Y + 2, '#8a5a30', 10, 12); px(g, X + (left ? -2 : 8), Y + 2, '#c8945a', 10, 1); px(g, X + (left ? 3 : 13), Y + 8, '#f2c14e'); }
    }
    return c;
  },
};
