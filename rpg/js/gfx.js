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

// 地圖圖塊的邊長（像素）
const TS = 16;
