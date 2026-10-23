'use strict';
// 曉鐘傳說：所有圖像都在這裡用程式畫出來（像素畫）

// ───── 像素畫筆：形狀自動上光影、外框 ─────
class Pix {
  constructor(w, h, S = 1) { this.w = w; this.h = h; this.S = S; this.d = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : null; }
  // 依法線方向挑選四階色
  shade(col, sv, edge, x, y, o) {
    if (o.flat) return col;
    const dith = ((x + y) & 1) === 0;
    if (edge && !o.noEdge) return darken(col, 0.42);
    if (sv > 0.62 || (sv > 0.52 && dith)) return lighten(col, 0.38);
    if (sv < -0.5 || (sv < -0.4 && dith)) return darken(col, 0.3);
    return col;
  }
  ell(cx, cy, rx, ry, col, o = {}) {
    const S = this.S; cx *= S; cy *= S; rx *= S; ry *= S;
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1), y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    const inside = (x, y) => { const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry; return nx * nx + ny * ny <= 1; };
    const lx = o.lx ?? -0.55, ly = o.ly ?? -0.8;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue;
      if (o.clipY !== undefined && y > o.clipY * S) continue;
      if (o.clipTop !== undefined && y < o.clipTop * S) continue;
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      const sv = nx * lx + ny * ly + (o.hl ? 0.25 * (1 - nx * nx - ny * ny) : 0);
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1) || (o.clipY !== undefined && y + 1 > o.clipY * S);
      this.set(x, y, this.shade(col, sv, edge, x, y, o));
    }
    if (o.shine) { this.set(cx - rx * 0.4, cy - ry * 0.5, '#ffffff'); if (S > 1.4) this.set(cx - rx * 0.4 + 1, cy - ry * 0.5, '#ffffff'); }
  }
  ell2(cx, cy, rx, ry, col, o = {}) { this.ell(cx, cy, rx, ry, col, o); this.ell(48 - cx, cy, rx, ry, col, Object.assign({}, o, { lx: o.lx ?? -0.55 })); }
  rect(x, y, w, h, col, o = {}) {
    const S = this.S; const X0 = Math.round(x * S), Y0 = Math.round(y * S), X1 = Math.round((x + w) * S) - 1, Y1 = Math.round((y + h) * S) - 1;
    for (let yy = Y0; yy <= Y1; yy++) for (let xx = X0; xx <= X1; xx++) {
      const nx = (xx - X0) / Math.max(1, X1 - X0) * 2 - 1, ny = (yy - Y0) / Math.max(1, Y1 - Y0) * 2 - 1;
      const edge = xx === X0 || xx === X1 || yy === Y0 || yy === Y1;
      this.set(xx, yy, this.shade(col, -0.45 * nx - 0.65 * ny, edge, xx, yy, o));
    }
  }
  rect2(x, y, w, h, col, o) { this.rect(x, y, w, h, col, o); this.rect(48 - x - w, y, w, h, col, o); }
  poly(pts, col, o = {}) {
    const S = this.S, P = pts.map(([x, y]) => [x * S, y * S]);
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const [x, y] of P) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const ins = (px, py) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; };
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, rx = Math.max(1, (maxX - minX) / 2), ry = Math.max(1, (maxY - minY) / 2);
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
      if (!ins(x + 0.5, y + 0.5)) continue;
      const edge = !ins(x - 0.5, y + 0.5) || !ins(x + 1.5, y + 0.5) || !ins(x + 0.5, y - 0.5) || !ins(x + 0.5, y + 1.5);
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      this.set(x, y, this.shade(col, (o.lx ?? -0.55) * nx + (o.ly ?? -0.8) * ny, edge, x, y, o));
    }
  }
  poly2(pts, col, o) { this.poly(pts, col, o); this.poly(pts.map(([x, y]) => [48 - x, y]), col, Object.assign({}, o)); }
  line(x0, y0, x1, y1, col, w = 1) {
    const S = this.S; x0 *= S; y0 *= S; x1 *= S; y1 *= S; w = Math.max(1, w * S);
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5) + 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t);
      for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) this.set(x - w / 2 + a + 0.5, y - w / 2 + b + 0.5, col);
    }
  }
  line2(x0, y0, x1, y1, col, w) { this.line(x0, y0, x1, y1, col, w); this.line(48 - x0, y0, 48 - x1, y1, col, w); }
  dot(x, y, col, r = 0.5) { const S = this.S; const R = Math.max(0.5, r * S); for (let a = -R; a < R; a++) for (let b = -R; b < R; b++) this.set(x * S + a, y * S + b, col); }
  eye(x, y, r, iris = '#1a1020', o = {}) {
    this.ell(x, y, r, r * (o.tall || 1.15), o.white || '#ffffff', { flat: true });
    this.ell(x + (o.lookX || 0), y + r * 0.2, r * 0.6, r * 0.7, iris, { flat: true });
    this.dot(x - r * 0.25, y - r * 0.25, '#ffffff', 0.5);
  }
  eye2(x, y, r, iris, o) { this.eye(x, y, r, iris, o); this.eye(48 - x, y, r, iris, o); }
  outline(col = '#160d22') {
    const w = this.w, h = this.h, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (this.d[y * w + x]) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push(y * w + x);
    }
    for (const i of add) this.d[i] = col;
  }
  canvas() {
    const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
    const g = c.getContext('2d'), im = g.createImageData(this.w, this.h);
    for (let i = 0; i < this.d.length; i++) {
      const v = this.d[i]; if (!v) continue;
      const [r, gg, b] = hexToRgb(v); im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255;
    }
    g.putImageData(im, 0, 0); return c;
  }
}

// 白色剪影（受傷閃爍用）
function silhouette(src, col) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c;
}

// ───── 人物小圖（16×16，四方向×兩步） ─────
const SPR_DOWN = [
  '................',
  '.....KKKKKK.....',
  '....KHHHHHHK....',
  '...KHHHHHHHHK...',
  '..KHHHHHHHHHhK..',
  '..KhHHHHHHHHhK..',
  '..KhSSSSSSSShK..',
  '..KSSESSSSESsK..',
  '...KSSSSSSSsK...',
  '....KKSSSSKK....',
  '...KCCKAAKCcK...',
  '..KSKCCAACcKsK..',
  '..KsKCCCCCcKsK..',
  '...KKBBBBBBKK...',
  '....KDDKKDdK....',
  '.....KK..KBK....',
];
const SPR_UP = [
  '................',
  '.....KKKKKK.....',
  '....KHHHHHHK....',
  '...KHHHHHHHHK...',
  '..KHHHHHHHHHhK..',
  '..KhHHHHHHHHhK..',
  '..KhHHHHHHHHhK..',
  '..KhHHHHHHHHhK..',
  '...KhhHHHHhhK...',
  '....KKhhhhKK....',
  '...KCCCCCCCcK...',
  '..KSKCCCCCcKsK..',
  '..KsKCCCCCcKsK..',
  '...KKBBBBBBKK...',
  '....KDDKKDdK....',
  '.....KK..KBK....',
];
const SPR_SIDE = [
  '................',
  '......KKKKKK....',
  '.....KHHHHHHK...',
  '....KHHHHHHHHK..',
  '....KHHHHHHHHhK.',
  '...KSHHHHHHHHhK.',
  '...KSSSSHHHHhhK.',
  '...KSESSSHHhhK..',
  '....KSSSSSShK...',
  '.....KKSSSKK....',
  '.....KCCCCcK....',
  '....KCSSCCcK....',
  '....KCsSCccK....',
  '.....KBBBBK.....',
  '....KDDKKDdK....',
  '....KBK..KBK....',
];
const SIDE_B = ['.....KDDDdK.....', '.....KBBBBK.....'];
const HAT_FRONT = ['.......KK.......', '......KXxK......', '.....KXXXxK.....', '....KXXXXXxK....', '.KKKKXXXXXxKKKK.', 'KxxxxxxxxxxxxxxK'];
const HAT_SIDE = ['..........KK....', '.........KXK....', '......KKXXxK....', '.....KXXXXXxK...', '....KXXXXXXXxK..', '.KKKxxxxxxxxxxK.'];
const CAT = ['................', '................', '................', '................', '................', '................', '................',
  '................', '....K....K......', '...KHK..KHK.....', '...KHHHHHHK.....', '...KHEHHEHK..KK.', '....KHHWHK..KHK.', '...KHHHHHHKKHK..', '...KHhHHhHHHK...', '....KK.KK.KK....'];

function applyVariant(rows, v, view) {
  rows = rows.slice();
  const put = (y, s) => { rows[y] = s; };
  const setc = (x, y, c) => { const r = rows[y].split(''); r[x] = c; rows[y] = r.join(''); };
  if (v.long) {
    if (view === 'down' || view === 'up') for (let y = 8; y <= 11; y++) { setc(2, y, 'K'); setc(3, y, 'H'); setc(12, y, 'h'); setc(13, y, 'K'); }
    else for (let y = 8; y <= 11; y++) { setc(11, y, 'H'); setc(12, y, 'h'); setc(13, y, 'K'); }
  }
  if (v.beard) {
    if (view === 'down') { put(8, '...KHSSSSSSHK...'); put(9, '....KHHHHHHK....'); setc(7, 10, 'H'); setc(8, 10, 'H'); }
    if (view === 'side') { put(8, '....KHHHSSShK...'); put(9, '.....KHHHSKK....'); }
  }
  if (v.hat) { const H = view === 'side' ? HAT_SIDE : HAT_FRONT; for (let i = 0; i < 6; i++) put(i, H[i]); }
  if (v.crown) { put(0, '....KAKKKKAK....'); put(1, '....KAAAAAAK....'); }
  if (v.band) { if (view !== 'side') put(4, '..KAAAAAAAAAAK..'); else put(4, '....KAAAAAAAAAK.'); }
  return rows;
}
function charSheet(spec) {
  // 輸出：寬 32（兩步）× 高 64（下、上、左、右）
  const c = document.createElement('canvas'); c.width = 32; c.height = 64;
  const g = c.getContext('2d');
  const pal = Object.assign({ K: '#1a1020', S: '#f6c9a0', E: '#2a1a30', W: '#ffffff', B: '#5a3a24', D: '#3b3b5c', A: '#f2c14e' }, spec.pal);
  if (!pal.h) pal.h = darken(pal.H, 0.3);
  if (!pal.s) pal.s = darken(pal.S, 0.22);
  if (!pal.c && pal.C) pal.c = darken(pal.C, 0.3);
  if (!pal.d && pal.D) pal.d = darken(pal.D, 0.3);
  if (pal.X && !pal.x) pal.x = darken(pal.X, 0.3);
  const draw = (rows, ox, oy, flip) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const ch = (rows[y] || '')[x]; if (!ch || ch === '.') continue;
      const col = pal[ch]; if (!col) continue;
      g.fillStyle = col; g.fillRect(ox + (flip ? 15 - x : x), oy + y, 1, 1);
    }
  };
  if (spec.cat) { for (let f = 0; f < 2; f++) for (let d = 0; d < 4; d++) { const r = CAT.slice(); if (f) { r[15] = '....K.KK.KK.....'; } draw(r, f * 16, d * 16, d === 3); } return c; }
  const v = spec.v || {};
  const down = applyVariant(SPR_DOWN, v, 'down'), up = applyVariant(SPR_UP, v, 'up'), side = applyVariant(SPR_SIDE, v, 'side');
  const sideB = side.slice(); sideB[14] = SIDE_B[0]; sideB[15] = SIDE_B[1];
  draw(down, 0, 0, false); draw(down, 16, 0, true);
  draw(up, 0, 16, false); draw(up, 16, 16, true);
  draw(side, 0, 32, false); draw(sideB, 16, 32, false);
  draw(side, 0, 48, true); draw(sideB, 16, 48, true);
  return c;
}
const SPRITES = {
  hero: { pal: { H: '#7a4520', C: '#2f6fd8', D: '#34406a', A: '#f2c14e' }, v: { band: true } },
  lia: { pal: { H: '#f0d27a', C: '#f4f2ff', D: '#7d9bea', A: '#f2c14e', B: '#8a6a4a' }, v: { long: true } },
  mira: { pal: { H: '#d0453a', C: '#7a4fd0', D: '#4a2b80', X: '#5b37a8', A: '#ffd34e' }, v: { hat: true, long: true } },
  balk: { pal: { H: '#b0582a', C: '#a8322e', D: '#5a4030', A: '#c0c8d8', S: '#eab48a' }, v: { beard: true } },
  grandpa: { pal: { H: '#e8e8ee', C: '#8a7a5a', D: '#5a4a3a' }, v: { beard: true } },
  man: { pal: { H: '#3a2a1a', C: '#4a9a4a', D: '#6a5030' } },
  man2: { pal: { H: '#8a5a2a', C: '#c07830', D: '#4a4a6a' } },
  woman: { pal: { H: '#6a3a1a', C: '#d0607a', D: '#d0607a', B: '#7a3a3a' }, v: { long: true } },
  woman2: { pal: { H: '#2a1a1a', C: '#4aa0b0', D: '#4aa0b0' }, v: { long: true } },
  girl: { pal: { H: '#f0b040', C: '#f08a5a', D: '#f08a5a' }, v: { long: true } },
  boy: { pal: { H: '#4a3020', C: '#5ac0e0', D: '#3a5a8a' } },
  oldwoman: { pal: { H: '#d8d8e0', C: '#8a6aa0', D: '#8a6aa0' }, v: { long: true } },
  soldier: { pal: { H: '#a8b0c0', C: '#3a5fa0', D: '#3a3a5a', A: '#e0e4ee' } },
  merchant: { pal: { H: '#d0a040', C: '#b07a30', D: '#5a4030' }, v: { band: true } },
  priest: { pal: { H: '#f4f4fa', C: '#ffffff', D: '#d8dcf0', A: '#f2c14e' } },
  sailor: { pal: { H: '#2a3a6a', C: '#e8eef8', D: '#2a4a8a', A: '#d03a3a' }, v: { band: true } },
  captain: { pal: { H: '#e8e8ee', C: '#2a3a6a', D: '#2a3a6a', A: '#f2c14e' }, v: { beard: true } },
  queen: { pal: { H: '#1a1a2a', C: '#c0304a', D: '#c0304a', S: '#d8a070' }, v: { long: true, crown: true } },
  desert: { pal: { H: '#f0ece0', C: '#e0c080', D: '#a07a40', S: '#c88a58' } },
  desertw: { pal: { H: '#3a2010', C: '#3a9aa0', D: '#3a9aa0', S: '#c88a58' }, v: { long: true } },
  guard: { pal: { H: '#f2c14e', C: '#3a9aa0', D: '#8a6a3a', S: '#c88a58', A: '#f2c14e' } },
  scholar: { pal: { H: '#9a9aa8', C: '#4a5a9a', D: '#4a5a9a' }, v: { beard: true } },
  miner: { pal: { H: '#e0b020', C: '#8a5a30', D: '#4a3a2a' }, v: { beard: true } },
  snowm: { pal: { H: '#f0f0f6', C: '#8a5a3a', D: '#5a3a2a' } },
  snoww: { pal: { H: '#f0f0f6', C: '#a04a5a', D: '#a04a5a' }, v: { long: true } },
  smith: { pal: { H: '#2a1a1a', C: '#6a6a7a', D: '#4a3a2a', S: '#e0a880' }, v: { beard: true } },
  witch: { pal: { H: '#8a8aa0', C: '#3a3a5a', D: '#3a3a5a', X: '#2a2a40' }, v: { hat: true, long: true } },
  ghost: { pal: { H: '#c8d8ff', C: '#a8b8f0', D: '#a8b8f0', S: '#e0e8ff', B: '#a8b8f0' } },
  cat: { cat: true, pal: { H: '#f0a040', h: '#c07020', E: '#2a1a30', W: '#ffd0d0' } },
  dknight: { pal: { H: '#3a2a5a', C: '#2a2040', D: '#2a2040', A: '#c02040', S: '#3a2a5a', E: '#ff4040' } },
};
const SheetCache = {};
function sheet(id) { return SheetCache[id] || (SheetCache[id] = charSheet(SPRITES[id] || SPRITES.man)); }

// ───── 地圖圖塊 ─────
const TS = 16;
const TileCache = {};
function tileCanvas(key, fn) {
  if (TileCache[key]) return TileCache[key];
  const c = document.createElement('canvas'); c.width = TS; c.height = TS;
  const g = c.getContext('2d'); fn(g); return (TileCache[key] = c);
}
function P_(g, x, y, col, w = 1, h = 1) { g.fillStyle = col; g.fillRect(x, y, w, h); }
function noiseFill(g, base, vars, seed, dens = 0.18) {
  P_(g, 0, 0, base, 16, 16);
  const r = seeded(seed);
  for (let i = 0; i < 256 * dens; i++) P_(g, (r() * 16) | 0, (r() * 16) | 0, vars[(r() * vars.length) | 0]);
}
const GROUND = {
  grass: ['#6cc24a', ['#5db040', '#7ad457', '#62b844']],
  sand: ['#ecd28e', ['#e0c27a', '#f4dea4', '#d8b870']],
  snow: ['#eef4ff', ['#dbe6f6', '#ffffff', '#cfdcf0']],
  dirt: ['#c99c62', ['#b88a52', '#d6ac74', '#a87c48']],
  wither: ['#6d5f80', ['#5f5270', '#7b6c8e', '#584a68']],
  cobble: ['#a8a4a0', ['#8e8a86', '#bcb8b2']],
};
function drawGround(g, kind, seed) {
  const [b, v] = GROUND[kind] || GROUND.grass;
  noiseFill(g, b, v, seed, kind === 'snow' ? 0.12 : 0.2);
  const r = seeded(seed * 7 + 3);
  if (kind === 'grass') for (let i = 0; i < 3; i++) { const x = (r() * 13) | 0, y = 2 + (r() * 12) | 0; P_(g, x, y, '#4f9a36'); P_(g, x + 2, y, '#4f9a36'); P_(g, x + 1, y - 1, '#4f9a36'); }
  if (kind === 'sand') for (let i = 0; i < 2; i++) { const x = (r() * 12) | 0, y = 2 + (r() * 12) | 0; P_(g, x, y, '#d4b06a', 4, 1); }
  if (kind === 'wither') for (let i = 0; i < 3; i++) { const x = (r() * 14) | 0, y = 2 + (r() * 12) | 0; P_(g, x, y, '#4a3e5a'); P_(g, x + 1, y - 1, '#4a3e5a'); }
  if (kind === 'cobble') {
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? -2 : 0; x < 16; x += 5) { P_(g, x, y, '#7e7a76', 5, 1); P_(g, x, y, '#7e7a76', 1, 4); P_(g, x + 1, y + 1, '#c4c0ba', 3, 1); }
  }
}
function drawTree(g, ox, oy, s, pal) {
  // 圓圓的樹冠
  const [d, m, l] = pal;
  const circ = (cx, cy, r, col) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) P_(g, ox + cx + x, oy + cy + y, col); };
  P_(g, ox + 7 * s, oy + 11 * s, '#6a4424', 2 * s, 4 * s);
  circ(8 * s, 7 * s, 6 * s, '#1f4a2a'); circ(8 * s, 6.5 * s, 5.4 * s, d); circ(7.4 * s, 6 * s, 4.4 * s, m); circ(6 * s, 4.6 * s, 2.2 * s, l);
  P_(g, ox + 5 * s, oy + 3 * s, '#e6ffd0');
}
function drawPine(g, ox, oy, snowy) {
  P_(g, ox + 7, oy + 12, '#5a3a24', 2, 3);
  const rows = [[8, 1, 1], [7, 2, 3], [6, 3, 5], [7, 5, 3], [5, 6, 7], [4, 8, 9], [6, 9, 5], [3, 10, 11], [2, 11, 13]];
  for (const [x, y, w] of rows) { P_(g, ox + x - 1, oy + y, '#173a28', w + 1, 1); P_(g, ox + x, oy + y, '#2a6a44', w - 1, 1); P_(g, ox + x, oy + y, '#3f8a58', Math.max(1, (w / 2) | 0), 1); }
  if (snowy) for (const [x, y, w] of rows) if (y % 3 !== 2) P_(g, ox + x, oy + y, '#f4f8ff', Math.max(1, (w / 2.5) | 0), 1);
}
function drawMountain(g, snowy, seed) {
  const r = seeded(seed);
  const base = snowy ? ['#9aa8c4', '#7886a8', '#c8d4ea'] : ['#a08460', '#7e6446', '#c4a87e'];
  for (let y = 2; y < 16; y++) {
    const half = (y - 1) * 0.58 + 1, cx = 8;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      if (x < 0 || x > 15) continue;
      const edge = x === Math.floor(cx - half) || x === Math.ceil(cx + half);
      let col = x < cx ? base[2] : base[1];
      if (x >= cx && x < cx + 1) col = base[0];
      if (edge) col = '#3a2e3a';
      P_(g, x, y, col);
    }
  }
  // 雪頂
  for (let y = 2; y < 6; y++) { const half = (y - 1) * 0.58; P_(g, Math.ceil(8 - half), y, '#ffffff', Math.max(1, Math.floor(half * 2)), 1); }
  P_(g, 5, 6, '#ffffff'); P_(g, 9, 6, '#e8eefa'); P_(g, 7, 6, '#ffffff');
  for (let i = 0; i < 4; i++) P_(g, 4 + (r() * 8) | 0, 9 + (r() * 5) | 0, base[1]);
}
function drawWater(g, frame, mask, kind) {
  const deep = kind === 'lava' ? '#d8401a' : kind === 'abyss' ? '#120a1e' : kind === 'ice' ? '#5aa0d8' : kind === 'poison' ? '#6a3a8a' : '#3478d4';
  const mid = kind === 'lava' ? '#f07a20' : kind === 'abyss' ? '#22163a' : kind === 'ice' ? '#7cc0ea' : kind === 'poison' ? '#8a4aa8' : '#4a92e6';
  const hi = kind === 'lava' ? '#ffd040' : kind === 'abyss' ? '#3a2a5a' : kind === 'ice' ? '#d8f0ff' : kind === 'poison' ? '#c08ae0' : '#b8e0ff';
  P_(g, 0, 0, deep, 16, 16);
  for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) {
    const w = Math.sin((x + frame * 2 + y * 1.7) * 0.8) > 0.55;
    if (w) P_(g, x, y + ((x + frame) % 2), mid);
  }
  P_(g, (3 + frame * 5) % 14, 5 + frame * 2, hi, 3, 1); P_(g, (10 + frame * 3) % 14, 12 - frame * 3, hi, 2, 1);
  if (mask && kind !== 'abyss') {
    const foam = kind === 'lava' ? '#ffe080' : '#e8f6ff';
    if (mask & 1) { P_(g, 0, 0, foam, 16, 1); P_(g, 0, 1, mid, 16, 1); }
    if (mask & 2) { P_(g, 15, 0, foam, 1, 16); P_(g, 14, 0, mid, 1, 16); }
    if (mask & 4) { P_(g, 0, 15, foam, 16, 1); P_(g, 0, 14, mid, 16, 1); }
    if (mask & 8) { P_(g, 0, 0, foam, 1, 16); P_(g, 1, 0, mid, 1, 16); }
  }
}
function drawHouseIcon(g, roof, wall) {
  const house = (ox, oy, rc) => {
    P_(g, ox, oy + 3, '#1a1020', 7, 5); P_(g, ox + 1, oy + 4, wall, 5, 3); P_(g, ox + 3, oy + 5, '#5a3a24', 1, 2);
    for (let i = 0; i < 4; i++) P_(g, ox + 3 - i, oy + i, '#1a1020', 2 * i + 1, 1);
    for (let i = 1; i < 4; i++) P_(g, ox + 4 - i, oy + i, rc, 2 * i - 1, 1);
  };
  house(1, 1, roof); house(8, 3, roof); house(3, 8, roof);
  P_(g, 10, 12, '#5a3a24', 1, 3); P_(g, 9, 10, '#2a7a3a', 3, 2);
}
// 所有地形圖塊
function drawTileKind(g, kind, info) {
  const seed = info.seed || 1, fr = info.frame || 0;
  const base = info.ground || 'grass';
  switch (kind) {
    case 'grass': case 'sand': case 'snow': case 'dirt': case 'wither': case 'cobble': drawGround(g, kind, seed); break;
    case 'flowers': drawGround(g, base, seed); { const r = seeded(seed + 9); const cols = ['#ff6a8a', '#fff4a0', '#ffffff', '#ff9a40', '#c08aff']; for (let i = 0; i < 5; i++) { const x = 1 + (r() * 13) | 0, y = 1 + (r() * 13) | 0, c = cols[(r() * cols.length) | 0]; P_(g, x, y, c); P_(g, x + 1, y, c); P_(g, x, y + 1, c); P_(g, x + 1, y + 1, '#ffe060'); } } break;
    case 'road': drawGround(g, base === 'snow' ? 'snow' : base === 'sand' ? 'sand' : 'dirt', seed); if (base === 'snow') { const r = seeded(seed); for (let i = 0; i < 14; i++) P_(g, (r() * 16) | 0, (r() * 16) | 0, '#c4d0e4'); } if (base === 'sand') { const r = seeded(seed); for (let i = 0; i < 14; i++) P_(g, (r() * 16) | 0, (r() * 16) | 0, '#c8a868'); } break;
    case 'forest': drawGround(g, base, seed); drawTree(g, -3, 1, 0.75, ['#2a6a34', '#3a8a40', '#6ac850']); drawTree(g, 5, -2, 0.75, ['#2a6a34', '#3f9446', '#72d058']); drawTree(g, 3, 5, 0.75, ['#256030', '#378a3c', '#66c24c']); break;
    case 'tree': drawGround(g, base, seed); drawTree(g, 0, 0, 1, ['#2a6a34', '#3a8a40', '#6ac850']); break;
    case 'palm': drawGround(g, base, seed); P_(g, 8, 6, '#8a5a2a', 2, 9); P_(g, 9, 6, '#a87a3a', 1, 9); for (const [x, y, w] of [[2, 3, 6], [9, 3, 6], [4, 1, 9], [1, 5, 3], [12, 5, 3], [6, 4, 5]]) P_(g, x, y, '#2a8a3a', w, 2); P_(g, 5, 1, '#4ac050', 6, 1); P_(g, 8, 5, '#6a3a1a', 2, 2); break;
    case 'pine': drawGround(g, base, seed); drawPine(g, 0, 0, base === 'snow'); break;
    case 'pines': drawGround(g, base, seed); for (const [x, y] of [[-4, -2], [4, -3], [0, 3]]) { g.save(); g.translate(x, y); drawPine(g, 0, 0, base === 'snow'); g.restore(); } break;
    case 'hills': drawGround(g, base, seed); { const c1 = base === 'sand' ? '#d4b46e' : '#55a63c', c2 = base === 'sand' ? '#f8e6b0' : '#8ade6a'; for (const [ox, oy] of [[1, 6], [7, 2], [6, 10]]) { for (let i = 0; i < 7; i++) { const w = Math.round(Math.sin(i / 6 * Math.PI) * 4); P_(g, ox + 4 - w, oy + 4 - (w > 2 ? 2 : w > 0 ? 1 : 0) + (i > 3 ? 0 : 0), c1, 1, 1); } P_(g, ox, oy + 3, c1, 8, 1); P_(g, ox + 1, oy + 2, c2, 3, 1); P_(g, ox + 2, oy + 1, c2, 3, 1); P_(g, ox + 4, oy + 2, c1, 3, 1); } } break;
    case 'mountain': drawGround(g, base, seed); drawMountain(g, false, seed); break;
    case 'snowmtn': drawGround(g, 'snow', seed); drawMountain(g, true, seed); break;
    case 'cactus': drawGround(g, 'sand', seed); P_(g, 6, 3, '#1a4a2a', 4, 12); P_(g, 7, 3, '#3aa050', 2, 11); P_(g, 7, 4, '#6ad070', 1, 9); P_(g, 2, 6, '#1a4a2a', 4, 3); P_(g, 3, 4, '#1a4a2a', 2, 4); P_(g, 3, 5, '#3aa050', 1, 3); P_(g, 10, 7, '#1a4a2a', 4, 3); P_(g, 12, 5, '#1a4a2a', 2, 4); P_(g, 12, 6, '#3aa050', 1, 3); P_(g, 7, 2, '#ff7aa0', 2, 1); break;
    case 'water': drawWater(g, fr, info.mask, info.liquid || 'water'); break;
    case 'bridgeH': drawWater(g, fr, 0, 'water'); P_(g, 0, 3, '#5a3a20', 16, 10); for (let x = 0; x < 16; x += 3) { P_(g, x, 4, '#c8945a', 2, 8); P_(g, x, 4, '#e0b07a', 1, 8); } P_(g, 0, 3, '#3a2414', 16, 1); P_(g, 0, 12, '#3a2414', 16, 1); break;
    case 'bridgeV': drawWater(g, fr, 0, 'water'); P_(g, 3, 0, '#5a3a20', 10, 16); for (let y = 0; y < 16; y += 3) { P_(g, 4, y, '#c8945a', 8, 2); P_(g, 4, y, '#e0b07a', 8, 1); } P_(g, 3, 0, '#3a2414', 1, 16); P_(g, 12, 0, '#3a2414', 1, 16); break;
    case 'rainbow': drawWater(g, fr, 0, 'water'); { const cols = ['#ff6a6a', '#ffb04a', '#fff06a', '#6ae07a', '#6ab0ff', '#b07aff']; for (let i = 0; i < 6; i++) P_(g, 0, 2 + i * 2, cols[i], 16, 2); P_(g, (fr * 7) % 16, 2, '#ffffff', 2, 12); } break;
    case 'log': drawGround(g, base, seed); P_(g, 0, 6, '#3a2414', 16, 7); P_(g, 0, 7, '#8a5a30', 16, 5); P_(g, 0, 8, '#a8743e', 16, 1); P_(g, 12, 6, '#d8b07a', 4, 7); P_(g, 13, 8, '#a8743e', 2, 3); P_(g, 4, 4, '#3a8a40', 3, 3); P_(g, 9, 3, '#3a8a40', 2, 3); break;
    case 'gate': drawGround(g, base, seed); P_(g, 0, 1, '#4a4a5a', 16, 15); P_(g, 1, 2, '#8a8a9a', 14, 13); P_(g, 0, 1, '#b0b0c0', 16, 1); if (info.open) { P_(g, 4, 5, '#2a2030', 8, 11); } else { P_(g, 4, 5, '#6a4424', 8, 11); P_(g, 7, 5, '#3a2414', 1, 11); P_(g, 5, 9, '#f2c14e', 1, 1); P_(g, 10, 9, '#f2c14e', 1, 1); } P_(g, 2, 3, '#6a6a7a', 2, 2); P_(g, 12, 3, '#6a6a7a', 2, 2); break;
    case 'town': drawGround(g, base, seed); drawHouseIcon(g, info.roof || '#d84a3a', info.wallc || '#f4e8d0'); break;
    case 'cave': drawGround(g, base, seed); drawMountain(g, base === 'snow', seed); P_(g, 5, 9, '#1a1020', 6, 7); P_(g, 6, 8, '#1a1020', 4, 1); P_(g, 6, 10, '#000000', 4, 6); break;
    case 'lighthouse': drawGround(g, base, seed); P_(g, 5, 2, '#1a1020', 6, 14); for (let y = 3; y < 15; y++) P_(g, 6, y, ((y / 3) | 0) % 2 ? '#d84a3a' : '#f4f4f4', 4, 1); P_(g, 5, 0, '#1a1020', 6, 3); P_(g, 6, 1, info.lit ? '#fff08a' : '#5a5a6a', 4, 1); P_(g, 7, 14, '#3a2414', 2, 2); break;
    case 'tower': drawGround(g, base, seed); P_(g, 4, 1, '#1a3050', 8, 15); P_(g, 5, 2, '#9ad4f4', 6, 13); P_(g, 5, 2, '#d8f2ff', 2, 13); P_(g, 6, 0, '#1a3050', 4, 2); P_(g, 7, 0, '#d8f2ff', 2, 1); P_(g, 7, 6, '#1a3050', 2, 2); P_(g, 7, 12, '#1a3050', 2, 4); break;
    case 'pyramid': drawGround(g, 'sand', seed); for (let y = 3; y < 15; y++) { const h = y - 2; P_(g, 8 - h * 0.6, y, '#1a1020', h * 1.2 + 1, 1); P_(g, 8 - h * 0.6 + 1, y, '#e0b860', h * 0.6, 1); P_(g, 8, y, '#b08840', h * 0.6 - 1, 1); } P_(g, 7, 11, '#1a1020', 2, 4); break;
    case 'castle': drawGround(g, 'wither', seed); P_(g, 1, 5, '#1a1020', 14, 11); P_(g, 2, 6, '#4a3a6a', 12, 9); for (const x of [1, 6, 11]) { P_(g, x, 1, '#1a1020', 4, 6); P_(g, x + 1, 2, '#5a4a7a', 2, 4); P_(g, x + 1, 0, '#c02040', 2, 2); } P_(g, 6, 10, '#1a1020', 4, 6); P_(g, 7, 11, '#ff4060', 2, 1); break;
    case 'altar': drawGround(g, base, seed); P_(g, 3, 9, '#6a6a7a', 10, 4); P_(g, 3, 9, '#b8b8c8', 10, 1); for (const x of [2, 12]) { P_(g, x, 2, '#3a3a4a', 3, 9); P_(g, x + 1, 3, '#d8d8e8', 1, 7); } P_(g, 7, 6, info.lit ? '#fff08a' : '#8ac8ff', 2, 3); break;
    case 'dock': drawWater(g, fr, 0, 'water'); P_(g, 1, 0, '#3a2414', 14, 16); for (let y = 0; y < 16; y += 3) { P_(g, 2, y, '#c8945a', 12, 2); P_(g, 2, y, '#e0b07a', 12, 1); } P_(g, 1, 13, '#5a3a20', 2, 3); P_(g, 13, 13, '#5a3a20', 2, 3); break;
    case 'shrine': drawGround(g, base, seed); P_(g, 2, 6, '#1a1020', 12, 10); P_(g, 3, 7, '#e8e0d0', 10, 8); P_(g, 1, 3, '#1a1020', 14, 4); P_(g, 2, 4, '#d84a3a', 12, 2); P_(g, 6, 10, '#5a3a24', 4, 5); P_(g, 7, 8, '#f2c14e', 2, 2); break;
  }
}

// 室內／城鎮／迷宮主題
const THEMES = {
  town: { roof: '#b8483a', floor: ['#c89a64', '#b88a56', '#d4a872'], wallTop: '#6a5a4a', wallFace: '#d8c8a8', wallLine: '#a89878', ground: 'grass', liquid: 'water' },
  port: { roof: '#3a62b0', floor: ['#c89a64', '#b88a56', '#d4a872'], wallTop: '#4a5a7a', wallFace: '#e8e8f0', wallLine: '#a8b0c8', ground: 'cobble', liquid: 'water' },
  sand: { roof: '#d0803a', floor: ['#d8b07a', '#c89c64', '#e4c08c'], wallTop: '#8a6a3a', wallFace: '#f0d8a0', wallLine: '#c8a868', ground: 'sand', liquid: 'water' },
  snow: { roof: '#6a4a9a', floor: ['#a87a50', '#986c44', '#b8885c'], wallTop: '#5a4a5a', wallFace: '#c8b8a8', wallLine: '#9a8a7a', ground: 'snow', liquid: 'ice' },
  cave: { floor: ['#7a6450', '#6c5846', '#86705a'], wallTop: '#33281f', wallFace: '#6a5240', wallLine: '#4a3a2c', moss: true, ground: 'dirt', liquid: 'water' },
  mine: { floor: ['#80705a', '#726450', '#8c7c66'], wallTop: '#2e2620', wallFace: '#6a5a48', wallLine: '#4a3e32', beams: true, ground: 'dirt', liquid: 'water' },
  tower: { floor: ['#9aa0ac', '#8a909c', '#a8aeba'], wallTop: '#3a4050', wallFace: '#b4bac8', wallLine: '#8a90a0', ground: 'cobble', liquid: 'water' },
  tomb: { floor: ['#d0ae6c', '#c09e5c', '#dcbc7c'], wallTop: '#5a4428', wallFace: '#b8904e', wallLine: '#8a6a38', glyph: true, ground: 'sand', liquid: 'abyss' },
  ice: { floor: ['#c4e6f8', '#b0daf2', '#d8f2ff'], wallTop: '#2a5a8a', wallFace: '#86bce4', wallLine: '#5a96c8', ground: 'snow', liquid: 'ice' },
  castle: { floor: ['#4e4262', '#443a58', '#584c6e'], wallTop: '#1e1630', wallFace: '#62547e', wallLine: '#463a60', ground: 'wither', liquid: 'abyss' },
};
function drawFloor(g, th, seed, style) {
  const [b, v1, v2] = th.floor;
  P_(g, 0, 0, b, 16, 16);
  if (style === 'wood') { for (let y = 0; y < 16; y += 4) { P_(g, 0, y, v1, 16, 1); P_(g, ((y * 5 + seed) % 12) + 2, y + 1, v1, 1, 3); } P_(g, 3, 2, v2, 4, 1); P_(g, 9, 10, v2, 4, 1); return; }
  // 石板
  P_(g, 0, 0, v2, 15, 1); P_(g, 0, 0, v2, 1, 15); P_(g, 0, 15, v1, 16, 1); P_(g, 15, 0, v1, 1, 16);
  const r = seeded(seed); for (let i = 0; i < 6; i++) P_(g, 1 + (r() * 14) | 0, 1 + (r() * 14) | 0, r() < 0.5 ? v1 : v2);
}
function drawWall(g, th, face, seed, extra = {}) {
  if (!face && th.roof) {
    // 城鎮的牆頂畫成屋瓦
    P_(g, 0, 0, th.roof, 16, 16);
    for (let y = 0; y < 16; y += 4) { P_(g, 0, y + 3, darken(th.roof, 0.35), 16, 1); for (let x = (y / 4) % 2 ? 2 : 6; x < 16; x += 8) P_(g, x, y, darken(th.roof, 0.25), 1, 3); P_(g, 0, y, lighten(th.roof, 0.18), 16, 1); }
    if (extra.edgeS) P_(g, 0, 14, darken(th.roof, 0.5), 16, 2);
    return;
  }
  if (!face) {
    P_(g, 0, 0, th.wallTop, 16, 16);
    const r = seeded(seed); for (let i = 0; i < 10; i++) P_(g, (r() * 16) | 0, (r() * 16) | 0, darken(th.wallTop, 0.25));
    if (extra.edgeS) P_(g, 0, 15, lighten(th.wallTop, 0.25), 16, 1);
    return;
  }
  P_(g, 0, 0, th.wallFace, 16, 16);
  if (th.moss || th.beams || th === THEMES.cave) {
    const r = seeded(seed); for (let i = 0; i < 26; i++) P_(g, (r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? th.wallLine : lighten(th.wallFace, 0.2));
    if (th.moss) for (let i = 0; i < 6; i++) P_(g, (r() * 16) | 0, (r() * 6) | 0, '#5a8a3a');
  } else {
    for (let y = 0; y < 16; y += 4) { P_(g, 0, y + 3, th.wallLine, 16, 1); for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) P_(g, x, y, th.wallLine, 1, 3); P_(g, 0, y, lighten(th.wallFace, 0.18), 16, 1); }
  }
  if (th.glyph && seed % 3 === 0) { P_(g, 5, 5, '#6a4a20', 2, 4); P_(g, 9, 4, '#6a4a20', 3, 1); P_(g, 10, 5, '#6a4a20', 1, 4); }
  if (th.beams && seed % 2 === 0) { P_(g, 1, 0, '#4a2e18', 3, 16); P_(g, 2, 0, '#8a5a30', 1, 16); }
  P_(g, 0, 0, darken(th.wallTop, 0.1), 16, 2);
  P_(g, 0, 14, darken(th.wallFace, 0.35), 16, 2);
}
function drawObj(g, kind, th, info) {
  const seed = info.seed || 1;
  const floor = () => drawFloor(g, th, seed, info.wood ? 'wood' : null);
  switch (kind) {
    case 'counter': floor(); P_(g, 0, 3, '#3a2414', 16, 11); P_(g, 0, 4, '#b07a44', 16, 3); P_(g, 0, 7, '#8a5a30', 16, 6); P_(g, 0, 4, '#d09a5c', 16, 1); break;
    case 'bed': floor(); P_(g, 2, 1, '#3a2414', 12, 14); P_(g, 3, 2, '#f4f4f4', 10, 4); P_(g, 3, 6, '#4a7ad8', 10, 8); P_(g, 3, 6, '#6a9aec', 10, 1); P_(g, 4, 3, '#ffffff', 8, 2); break;
    case 'table': floor(); P_(g, 2, 4, '#3a2414', 12, 9); P_(g, 3, 5, '#b07a44', 10, 5); P_(g, 3, 5, '#d09a5c', 10, 1); P_(g, 3, 10, '#6a4424', 2, 3); P_(g, 11, 10, '#6a4424', 2, 3); P_(g, 6, 6, '#f4f4f4', 3, 2); break;
    case 'barrel': floor(); P_(g, 3, 2, '#3a2414', 10, 13); P_(g, 4, 3, '#a8743e', 8, 11); P_(g, 4, 5, '#5a3a20', 8, 1); P_(g, 4, 11, '#5a3a20', 8, 1); P_(g, 5, 3, '#c8945a', 2, 11); break;
    case 'pot': floor(); P_(g, 4, 4, '#1a1020', 8, 11); P_(g, 5, 5, '#c86a3a', 6, 9); P_(g, 6, 3, '#1a1020', 4, 2); P_(g, 6, 6, '#e8945a', 2, 4); break;
    case 'shelf': drawWall(g, th, true, seed); P_(g, 1, 1, '#3a2414', 14, 14); P_(g, 2, 2, '#6a4424', 12, 12); for (let y = 2; y < 14; y += 4) { const cols = ['#d84a3a', '#4a7ad8', '#3aa050', '#f2c14e', '#a050d0']; for (let x = 2; x < 14; x += 2) P_(g, x, y, cols[(x + y + seed) % 5], 2, 3); P_(g, 2, y + 3, '#3a2414', 12, 1); } break;
    case 'carpet': P_(g, 0, 0, '#a8203a', 16, 16); P_(g, 1, 0, '#f2c14e', 1, 16); P_(g, 14, 0, '#f2c14e', 1, 16); P_(g, 2, 0, '#c83a50', 12, 16); break;
    case 'altarT': floor(); P_(g, 1, 4, '#3a3a4a', 14, 10); P_(g, 2, 5, '#e8e8f0', 12, 4); P_(g, 2, 9, '#b8b8c8', 12, 4); P_(g, 7, 0, '#f2c14e', 2, 6); P_(g, 5, 2, '#f2c14e', 6, 1); break;
    case 'bell': floor(); P_(g, 1, 0, '#5a3a20', 2, 16); P_(g, 13, 0, '#5a3a20', 2, 16); P_(g, 1, 0, '#5a3a20', 14, 2); P_(g, 4, 3, '#1a1020', 8, 10); P_(g, 5, 3, '#f2c14e', 6, 9); P_(g, 3, 11, '#1a1020', 10, 2); P_(g, 4, 11, '#d8a030', 8, 1); P_(g, 6, 4, '#fff0a0', 1, 6); P_(g, 7, 13, '#8a6a20', 2, 2); break;
    case 'well': drawGround(g, th.ground, seed); P_(g, 2, 4, '#3a3a4a', 12, 11); P_(g, 3, 5, '#a8a8b8', 10, 9); P_(g, 5, 6, '#2a5aa0', 6, 6); P_(g, 2, 1, '#5a3a20', 2, 6); P_(g, 12, 1, '#5a3a20', 2, 6); P_(g, 2, 0, '#8a5a30', 12, 2); break;
    case 'fence': drawGround(g, th.ground, seed); P_(g, 0, 6, '#5a3a20', 16, 2); P_(g, 0, 11, '#5a3a20', 16, 2); P_(g, 0, 6, '#c8945a', 16, 1); P_(g, 0, 11, '#c8945a', 16, 1); P_(g, 2, 4, '#3a2414', 3, 11); P_(g, 11, 4, '#3a2414', 3, 11); P_(g, 3, 4, '#d0a070', 1, 10); P_(g, 12, 4, '#d0a070', 1, 10); break;
    case 'sign': drawGround(g, th.ground, seed); P_(g, 7, 8, '#5a3a20', 2, 7); P_(g, 2, 2, '#3a2414', 12, 7); P_(g, 3, 3, '#d8a868', 10, 5); P_(g, 4, 4, '#8a6a40', 8, 1); P_(g, 4, 6, '#8a6a40', 6, 1); break;
    case 'bush': drawGround(g, th.ground, seed); for (const [x, y, r] of [[5, 9, 4], [11, 9, 4], [8, 6, 4]]) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r) P_(g, x + a, y + b, a + b < -2 ? '#6ad050' : a + b > 3 ? '#2a6a30' : '#3f9a44'); break;
    case 'door': drawFloor(g, th, seed, 'wood'); P_(g, 0, 0, '#3a2414', 2, 16); P_(g, 14, 0, '#3a2414', 2, 16); P_(g, 0, 0, '#3a2414', 16, 2); break;
    case 'lamp': drawGround(g, th.ground, seed); P_(g, 7, 4, '#2a2a3a', 2, 11); P_(g, 5, 13, '#2a2a3a', 6, 2); P_(g, 5, 0, '#2a2a3a', 6, 5); P_(g, 6, 1, '#ffe08a', 4, 3); break;
    case 'anvil': floor(); P_(g, 2, 6, '#1a1020', 12, 4); P_(g, 3, 6, '#6a6a7a', 10, 2); P_(g, 5, 10, '#3a3a4a', 6, 4); P_(g, 3, 13, '#3a3a4a', 10, 2); P_(g, 12, 2, '#ff7a20', 3, 3); P_(g, 13, 1, '#ffd040', 1, 2); break;
    case 'throne': (info.carpet ? (P_(g, 0, 0, '#a8203a', 16, 16)) : floor()); P_(g, 2, 0, '#1a1020', 12, 16); P_(g, 3, 1, '#f2c14e', 10, 14); P_(g, 5, 3, '#a8203a', 6, 8); P_(g, 3, 11, '#d8a030', 10, 2); P_(g, 7, 0, '#ff4060', 2, 2); break;
    case 'fountain': drawGround(g, th.ground, seed); P_(g, 1, 3, '#5a5a6a', 14, 12); P_(g, 2, 4, '#4a92e6', 12, 10); P_(g, 6, 2, '#a8a8b8', 4, 9); P_(g, 7, 0, '#d8f0ff', 2, 3); P_(g, 4, 6, '#b8e0ff', 2, 1); P_(g, 10, 9, '#b8e0ff', 2, 1); break;
    case 'grave': drawGround(g, th.ground, seed); P_(g, 4, 3, '#3a3a4a', 8, 11); P_(g, 5, 4, '#a8a8b8', 6, 9); P_(g, 7, 6, '#5a5a6a', 2, 5); P_(g, 6, 7, '#5a5a6a', 4, 1); P_(g, 3, 13, '#5a8a3a', 10, 2); break;
    case 'crate': floor(); P_(g, 2, 3, '#3a2414', 12, 12); P_(g, 3, 4, '#c8945a', 10, 10); P_(g, 3, 4, '#5a3a20', 10, 1); P_(g, 3, 8, '#5a3a20', 10, 1); P_(g, 8, 4, '#5a3a20', 1, 10); break;
    case 'stairsUp': floor(); for (let i = 0; i < 5; i++) { P_(g, 2, 2 + i * 3, '#1a1020', 12, 3); P_(g, 3, 2 + i * 3, lighten(th.floor[0], 0.25 - i * 0.04), 10, 2); } break;
    case 'stairsDown': floor(); P_(g, 1, 1, '#1a1020', 14, 14); for (let i = 0; i < 4; i++) P_(g, 2 + i, 2 + i * 3, darken(th.floor[0], 0.2 + i * 0.18), 12 - i * 2, 3); break;
    case 'exit': floor(); P_(g, 2, 0, '#1a1020', 12, 16); P_(g, 3, 0, '#fff4c0', 10, 16); P_(g, 4, 0, '#ffffff', 8, 10); P_(g, 3, 12, th.floor[0], 10, 4); break;
    case 'chest': floor(); P_(g, 2, 4, '#1a1020', 12, 11); P_(g, 3, 5, info.open ? '#3a2414' : '#c8803a', 10, 4); P_(g, 3, 9, '#a8602a', 10, 5); P_(g, 3, 9, '#f2c14e', 10, 1); P_(g, 7, 8, '#f2c14e', 2, 3); if (!info.open) P_(g, 3, 5, '#e09a4a', 10, 1); break;
    case 'statue': floor(); P_(g, 3, 12, '#5a5a6a', 10, 4); P_(g, 4, 12, '#a8a8b8', 8, 1); P_(g, 5, 1, '#1a1020', 6, 12); P_(g, 6, 2, '#e8ecf8', 4, 10); P_(g, 4, 6, '#e8ecf8', 8, 3); P_(g, 6, 2, '#ffffff', 2, 3); P_(g, 7, 0, '#f2c14e', 2, 1); P_(g, 1, 3, '#8ac8ff', 2, 2); P_(g, 13, 3, '#8ac8ff', 2, 2); break;
    case 'pillar': floor(); P_(g, 3, 0, '#1a1020', 10, 16); P_(g, 4, 0, lighten(th.wallFace, 0.2), 8, 16); P_(g, 5, 0, lighten(th.wallFace, 0.45), 2, 16); P_(g, 10, 0, darken(th.wallFace, 0.2), 2, 16); P_(g, 2, 13, '#1a1020', 12, 3); P_(g, 3, 13, th.wallFace, 10, 2); break;
    case 'torch': drawWall(g, th, true, seed); P_(g, 7, 7, '#5a3a20', 2, 6); P_(g, 6, 3, '#ff7a20', 4, 4); P_(g, 7, 2, '#ffd040', 2, 3); P_(g, 7, 1, '#fff8c0', 1, 2); break;
    case 'ice': P_(g, 0, 0, '#d8f2ff', 16, 16); P_(g, 0, 0, '#ffffff', 16, 1); P_(g, 0, 0, '#ffffff', 1, 16); P_(g, 2, 3, '#ffffff', 5, 1); P_(g, 3, 4, '#ffffff', 3, 1); P_(g, 9, 10, '#a8d8f4', 5, 1); P_(g, 11, 11, '#a8d8f4', 3, 1); P_(g, 15, 0, '#a8d8f4', 1, 16); P_(g, 0, 15, '#a8d8f4', 16, 1); break;
    case 'swamp': P_(g, 0, 0, '#3a2a4a', 16, 16); { const r = seeded(seed); for (let i = 0; i < 18; i++) P_(g, (r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? '#6a3a8a' : '#4a3a5a'); } P_(g, 4 + (info.frame || 0) * 5, 5, '#c08ae0', 2, 2); P_(g, 10 - (info.frame || 0) * 3, 11, '#a070c0', 2, 1); break;
    case 'lockdoor': drawWall(g, th, true, seed); P_(g, 2, 1, '#1a1020', 12, 15); P_(g, 3, 2, '#7a5a30', 10, 14); P_(g, 3, 2, '#9a7a40', 10, 1); P_(g, 7, 2, '#5a3a20', 2, 14); P_(g, 6, 8, '#f2c14e', 4, 4); P_(g, 7, 9, '#1a1020', 2, 2); break;
    case 'spring': floor(); P_(g, 1, 1, '#1a1020', 14, 14); P_(g, 2, 2, '#6ad8ff', 12, 12); P_(g, 4, 4, '#c8f4ff', 3, 2); P_(g, 9, 9, '#c8f4ff', 3, 1); P_(g, 7 + (info.frame || 0), 6, '#ffffff', 2, 2); break;
    case 'rock': floor(); P_(g, 2, 5, '#1a1020', 12, 10); P_(g, 3, 6, darken(th.wallFace, 0.1), 10, 8); P_(g, 4, 6, lighten(th.wallFace, 0.2), 5, 3); break;
    case 'crystal': floor(); P_(g, 6, 1, '#1a3050', 4, 14); P_(g, 7, 2, '#9ad4f4', 2, 12); P_(g, 2, 6, '#1a3050', 4, 9); P_(g, 3, 7, '#c8ecff', 2, 7); P_(g, 10, 5, '#1a3050', 4, 10); P_(g, 11, 6, '#7ab8e8', 2, 8); break;
    case 'coffin': floor(); P_(g, 3, 1, '#1a1020', 10, 15); P_(g, 4, 2, '#8a6a3a', 8, 13); P_(g, 5, 3, '#c8a050', 6, 11); P_(g, 7, 4, '#5a3a20', 2, 6); P_(g, 6, 6, '#5a3a20', 4, 1); break;
    case 'rail': floor(); P_(g, 0, 4, '#5a3a20', 16, 2); P_(g, 0, 10, '#5a3a20', 16, 2); for (let x = 1; x < 16; x += 4) P_(g, x, 3, '#8a6a40', 2, 10); P_(g, 0, 4, '#a8a8b8', 16, 1); P_(g, 0, 10, '#a8a8b8', 16, 1); break;
  }
}
