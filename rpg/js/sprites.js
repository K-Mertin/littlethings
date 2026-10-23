'use strict';
// 曉鐘傳說：人物圖像產生器（地圖行走圖 16×24、戰鬥側身圖、對話頭像），全部以程式繪製

// ───── 小型像素緩衝 ─────
class PB {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  P(x, y, c) { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  G(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : null; }
  R(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.P(x + i, y + j, c); }
  // 填滿橢圓；fn(x,y,nx,ny) 回傳顏色
  E(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) this.P(x, y, typeof c === 'function' ? c(x, y, nx, ny) : c);
    }
  }
  // 粗線
  L(x0, y0, x1, y1, c, w = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t); if (w <= 1) this.P(x, y, typeof c === 'function' ? c(t) : c); else this.R(Math.round(x - (w - 1) / 2), Math.round(y - (w - 1) / 2), w, w, typeof c === 'function' ? c(t) : c); }
  }
  // 選擇性外框：外框顏色取相鄰顏色的暗色
  selout(dark = '#140a1e', k = 0.78) {
    const w = this.w, h = this.h, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (this.d[y * w + x]) continue;
      const n = this.G(x, y + 1) || this.G(x, y - 1) || this.G(x - 1, y) || this.G(x + 1, y);
      if (n) add.push([y * w + x, n]);
    }
    for (const [i, n] of add) this.d[i] = n === 'GLOW' ? null : mix(n, dark, k);
  }
  flipX() { const o = new PB(this.w, this.h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x]; return o; }
  blit(g, ox, oy, alpha = 1) {
    const im = g.getImageData(ox, oy, this.w, this.h);
    for (let i = 0; i < this.d.length; i++) {
      const v = this.d[i]; if (!v) continue;
      const [r, gg, b] = hexToRgb(v); im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255 * alpha;
    }
    g.putImageData(im, ox, oy);
  }
  canvas() { const c = document.createElement('canvas'); c.width = this.w; c.height = this.h; this.blit(c.getContext('2d'), 0, 0); return c; }
}
const shd = c => ({ hi: lighten(c, 0.32), md: c, lo: darken(c, 0.28), dk: darken(c, 0.5) });

// ───── 人物外觀設定 ─────
// hs 髮型：spiky long bob short bun pony bald；hat 帽子：band hood witch helm cap turban crown wide hat2；out 服裝：tunic robe dress armor
const LOOKS = {
  hero: { skin: '#f6c9a0', hair: '#8a4a22', hs: 'spiky', eye: '#3a2a6a', top: '#3a74d8', trim: '#f2d27a', pants: '#3a4472', shoes: '#6a3e22', belt: '#7a4a24', out: 'tunic', hat: 'band', hatc: '#e04040', cape: '#d84040', scarf: '#e04040' },
  lia: { skin: '#f8d4b4', hair: '#f4d880', hs: 'long', eye: '#3a6ad0', top: '#f6f4ff', trim: '#e8b84a', pants: '#f6f4ff', shoes: '#8a6a4a', belt: '#e8b84a', out: 'robe', hat: 'hood', hatc: '#f6f4ff', robe2: '#8aa8f0' },
  mira: { skin: '#f8d0b0', hair: '#e0483a', hs: 'long', eye: '#2a8a4a', top: '#8a52d8', trim: '#ffd84e', pants: '#4a2b80', shoes: '#4a2a3a', belt: '#ffd84e', out: 'dress', hat: 'witch', hatc: '#5b37a8' },
  balk: { skin: '#eab48a', hair: '#c0602a', hs: 'short', eye: '#2a1a1a', top: '#a8b4c8', trim: '#b8322e', pants: '#5a4030', shoes: '#4a3020', belt: '#6a4024', out: 'armor', hat: 'helm', hatc: '#b8c2d4', beard: '#c0602a', big: 1, cape: '#b8322e' },
  grandpa: { skin: '#f0c8a0', hair: '#eeeef4', hs: 'bald', eye: '#3a2a2a', top: '#8a7a5a', trim: '#c8b080', pants: '#5a4a3a', shoes: '#4a3424', belt: '#5a4028', out: 'robe', beard: '#eeeef4', robe2: '#6a5a40' },
  man: { skin: '#f0c098', hair: '#3a2a1a', hs: 'short', eye: '#2a1a1a', top: '#4a9a4a', trim: '#2a6a2a', pants: '#6a5030', shoes: '#4a3020', belt: '#5a3a1a', out: 'tunic' },
  man2: { skin: '#e8b890', hair: '#8a5a2a', hs: 'short', eye: '#2a1a1a', top: '#d08030', trim: '#f0e0c0', pants: '#4a4a6a', shoes: '#4a3020', belt: '#5a3a1a', out: 'tunic', apron: '#f4ecd8' },
  woman: { skin: '#f6c8a8', hair: '#6a3a1a', hs: 'bun', eye: '#3a2020', top: '#d8607a', trim: '#f8e0e8', pants: '#d8607a', shoes: '#7a3a3a', belt: '#f8e0e8', out: 'dress' },
  woman2: { skin: '#f0c098', hair: '#2a1a1a', hs: 'pony', eye: '#2a1a2a', top: '#4aa8b8', trim: '#f4f0e0', pants: '#4aa8b8', shoes: '#3a3a5a', belt: '#f4f0e0', out: 'dress', apron: '#f4f0e0' },
  girl: { skin: '#f8d0b0', hair: '#f0b040', hs: 'pony', eye: '#3a4a9a', top: '#f08a5a', trim: '#fff0c0', pants: '#f08a5a', shoes: '#c04040', belt: '#fff0c0', out: 'dress', small: 1 },
  boy: { skin: '#f0c098', hair: '#4a3020', hs: 'spiky', eye: '#2a1a1a', top: '#5ac0e0', trim: '#2a6a9a', pants: '#3a5a8a', shoes: '#5a3a1a', belt: '#5a3a1a', out: 'tunic', small: 1 },
  oldwoman: { skin: '#eec4a0', hair: '#dcdce4', hs: 'bun', eye: '#3a2a3a', top: '#8a6aa0', trim: '#d8c8e8', pants: '#8a6aa0', shoes: '#4a3a4a', belt: '#d8c8e8', out: 'robe', robe2: '#6a4a80', shawl: '#c8a050' },
  soldier: { skin: '#f0c098', hair: '#5a3a1a', hs: 'short', eye: '#2a1a1a', top: '#3a5fa0', trim: '#e0e4ee', pants: '#3a3a5a', shoes: '#3a2a1a', belt: '#8a5a2a', out: 'armor', hat: 'helm', hatc: '#c0c8d8' },
  merchant: { skin: '#e8b890', hair: '#d0a040', hs: 'short', eye: '#2a1a1a', top: '#b07a30', trim: '#f2d27a', pants: '#5a4030', shoes: '#4a3020', belt: '#5a3a1a', out: 'tunic', hat: 'cap', hatc: '#3a7a3a', apron: '#e8dcc0', mous: '#d0a040' },
  priest: { skin: '#f0c8a8', hair: '#a8a8b8', hs: 'short', eye: '#2a2a3a', top: '#ffffff', trim: '#e8b84a', pants: '#e8eaf6', shoes: '#6a5a4a', belt: '#e8b84a', out: 'robe', hat: 'hat2', hatc: '#ffffff', robe2: '#e8b84a' },
  sailor: { skin: '#e8b080', hair: '#2a3a6a', hs: 'short', eye: '#2a1a1a', top: '#f0f4fa', trim: '#2a4a8a', pants: '#2a4a8a', shoes: '#2a2a3a', belt: '#2a2a3a', out: 'tunic', hat: 'cap', hatc: '#f0f4fa', scarf: '#d03a3a', stripes: '#2a4a8a' },
  captain: { skin: '#e8b080', hair: '#e8e8ee', hs: 'short', eye: '#2a1a1a', top: '#2a3a6a', trim: '#f2c14e', pants: '#2a3a6a', shoes: '#1a1a2a', belt: '#f2c14e', out: 'tunic', hat: 'cap', hatc: '#2a3a6a', beard: '#e8e8ee' },
  queen: { skin: '#d8a070', hair: '#1a1a2a', hs: 'long', eye: '#3a2010', top: '#c0304a', trim: '#f2c14e', pants: '#c0304a', shoes: '#7a1a2a', belt: '#f2c14e', out: 'robe', hat: 'crown', hatc: '#f2c14e', robe2: '#f2c14e', cape: '#7a1a6a' },
  desert: { skin: '#c88a58', hair: '#3a2010', hs: 'short', eye: '#1a1010', top: '#e8cc8a', trim: '#a07a40', pants: '#a07a40', shoes: '#6a4a2a', belt: '#c03a2a', out: 'robe', hat: 'turban', hatc: '#f0ece0', robe2: '#c8a060' },
  desertw: { skin: '#c88a58', hair: '#3a2010', hs: 'long', eye: '#1a1010', top: '#3a9aa0', trim: '#f2c14e', pants: '#3a9aa0', shoes: '#6a4a2a', belt: '#f2c14e', out: 'dress', scarf: '#f2c14e' },
  guard: { skin: '#c88a58', hair: '#2a1a10', hs: 'short', eye: '#1a1010', top: '#3a9aa0', trim: '#f2c14e', pants: '#8a6a3a', shoes: '#4a3020', belt: '#f2c14e', out: 'armor', hat: 'turban', hatc: '#f2c14e' },
  scholar: { skin: '#f0c8a0', hair: '#9a9aa8', hs: 'short', eye: '#2a2a3a', top: '#4a5a9a', trim: '#d8c890', pants: '#4a5a9a', shoes: '#3a2a2a', belt: '#d8c890', out: 'robe', beard: '#9a9aa8', glasses: 1, robe2: '#2a3a7a' },
  miner: { skin: '#e8a878', hair: '#7a6a5a', hs: 'short', eye: '#2a1a1a', top: '#8a5a30', trim: '#e0b020', pants: '#4a3a2a', shoes: '#3a2a1a', belt: '#3a2a1a', out: 'tunic', hat: 'helm', hatc: '#e0b020', beard: '#9a9088' },
  snowm: { skin: '#f0c8a8', hair: '#6a4a2a', hs: 'short', eye: '#2a1a1a', top: '#8a5a3a', trim: '#f4f4f8', pants: '#5a3a2a', shoes: '#3a2a1a', belt: '#3a2a1a', out: 'tunic', hat: 'fur', hatc: '#f0ece4', scarf: '#c04040' },
  snoww: { skin: '#f6d0b8', hair: '#c08050', hs: 'long', eye: '#2a2a4a', top: '#a04a5a', trim: '#f4f4f8', pants: '#a04a5a', shoes: '#4a2a2a', belt: '#f4f4f8', out: 'dress', hat: 'fur', hatc: '#f4f4f8' },
  smith: { skin: '#e0a880', hair: '#2a1a1a', hs: 'bald', eye: '#1a1010', top: '#6a6a7a', trim: '#3a3a4a', pants: '#4a3a2a', shoes: '#2a1a1a', belt: '#3a2a1a', out: 'tunic', beard: '#2a1a1a', apron: '#7a4a2a', big: 1 },
  witch: { skin: '#e8d0c0', hair: '#8a8aa0', hs: 'long', eye: '#4a2a6a', top: '#3a3a5a', trim: '#8a6ab0', pants: '#3a3a5a', shoes: '#2a2a3a', belt: '#8a6ab0', out: 'robe', hat: 'witch', hatc: '#2a2a40', robe2: '#2a2a40' },
  ghost: { skin: '#e0e8ff', hair: '#c8d8ff', hs: 'long', eye: '#3a4a8a', top: '#a8b8f0', trim: '#e0e8ff', pants: '#a8b8f0', shoes: '#a8b8f0', belt: '#e0e8ff', out: 'robe', robe2: '#c8d8ff', alpha: 0.7 },
  dknight: { skin: '#3a2a5a', hair: '#3a2a5a', hs: 'short', eye: '#ff4040', top: '#2a2040', trim: '#c02040', pants: '#2a2040', shoes: '#1a1020', belt: '#c02040', out: 'armor', hat: 'helm', hatc: '#3a2a5a', cape: '#8a1a2a' },
  gambler: { skin: '#f0c098', hair: '#1a1a1a', hs: 'short', eye: '#2a1a1a', top: '#2a2a3a', trim: '#f2c14e', pants: '#2a2a3a', shoes: '#1a1a1a', belt: '#f2c14e', out: 'tunic', hat: 'wide', hatc: '#3a2a2a', scarf: '#d03a5a', mous: '#1a1a1a' },
  collector: { skin: '#f0c8a0', hair: '#c0a0e0', hs: 'bob', eye: '#4a2a8a', top: '#4a3a8a', trim: '#ffd84e', pants: '#4a3a8a', shoes: '#2a2a4a', belt: '#ffd84e', out: 'robe', hat: 'witch', hatc: '#3a2a6a', robe2: '#ffd84e' },
  bard: { skin: '#f6c8a8', hair: '#d8803a', hs: 'bob', eye: '#2a4a2a', top: '#3aa070', trim: '#f2e8c0', pants: '#6a4a2a', shoes: '#4a3020', belt: '#f2c14e', out: 'tunic', hat: 'wide', hatc: '#3a7a5a', cape: '#2a6a5a' },
};

// ───── 地圖行走圖 16×24：每個方向 3 格（左腳、站立、右腳） ─────
const FW = 16, FH = 24;
function drawHead(p, L, view, oy) {
  const S = shd(L.skin), H = shd(L.hair), ex = L.small ? 0 : 0;
  const top = 2 + oy + (L.small ? 1 : 0);
  if (view === 'side') {
    p.E(7, 8 + oy + (L.small ? 0.5 : 0), 5.6, 5.8, (x, y, nx, ny) => nx < -0.55 && ny > 0.1 ? S.md : nx > 0.5 ? S.lo : S.md);
    p.P(1, 10 + oy, S.md); // 鼻子
    // 眼睛
    p.P(3, 9 + oy, '#1a1020'); p.P(3, 10 + oy, L.eye); p.P(4, 9 + oy, '#1a1020'); p.P(4, 10 + oy, L.eye);
    p.P(4, 11 + oy, mix(S.md, '#ff7a8a', 0.35));
  } else if (view === 'down') {
    p.E(7.5, 8 + oy + (L.small ? 0.5 : 0), 6, 5.8, (x, y, nx, ny) => nx > 0.62 || ny > 0.82 ? S.lo : S.md);
    p.P(2, 9 + oy, S.lo); p.P(13, 9 + oy, S.lo);
    // 大眼睛（上深下彩，含高光）
    for (const ex2 of [4, 10]) { p.P(ex2, 9 + oy, '#1a1020'); p.P(ex2 + 1, 9 + oy, '#1a1020'); p.P(ex2, 10 + oy, L.eye); p.P(ex2 + 1, 10 + oy, '#1a1020'); p.P(ex2, 9 + oy, '#ffffff'); }
    p.P(4, 11 + oy, mix(S.md, '#ff7a8a', 0.4)); p.P(11, 11 + oy, mix(S.md, '#ff7a8a', 0.4));
    p.P(7, 12 + oy, mix(S.md, '#a0302a', 0.35)); p.P(8, 12 + oy, mix(S.md, '#a0302a', 0.35));
  } else {
    p.E(7.5, 8 + oy + (L.small ? 0.5 : 0), 6, 5.8, S.md);
  }
  // 頭髮
  const hairCol = (x, y) => (y < 4 + oy ? H.hi : x > 11 ? H.lo : H.md);
  const hs = L.hs;
  const fillCap = (rows) => { p.E(7.5 + (view === 'side' ? 0.6 : 0), 7.2 + oy, view === 'side' ? 5.9 : 6.3, 5.6, (x, y, nx, ny) => (y <= rows + oy ? hairCol(x, y) : null)); };
  if (view === 'up') {
    if (hs !== 'bald') p.E(7.5, 8 + oy, 6.3, 6, (x, y, nx, ny) => y > 12 + oy ? null : (nx > 0.5 ? H.lo : ny < -0.5 ? H.hi : H.md));
    else { p.E(7.5, 8 + oy, 6, 5.8, S.md); p.P(5, 4 + oy, S.hi); for (let y = 8; y <= 11; y++) { p.P(2, y + oy, H.md); p.P(13, y + oy, H.md); } p.R(3, 11 + oy, 10, 1, H.md); }
    if (hs === 'long') { p.R(3, 12 + oy, 10, 6, H.md); p.R(3, 12 + oy, 1, 6, H.hi); p.R(12, 12 + oy, 1, 6, H.lo); p.R(4, 18 + oy, 8, 1, H.lo); }
    if (hs === 'bob') p.R(3, 12 + oy, 10, 1, H.lo);
    if (hs === 'pony') { p.R(7, 12 + oy, 2, 5, H.md); p.P(7, 17 + oy, H.lo); }
    if (hs === 'bun') p.E(7.5, 3 + oy, 2.4, 2, H.hi);
    if (hs === 'spiky') { p.P(4, 2 + oy, H.hi); p.P(7, 1 + oy, H.hi); p.P(10, 2 + oy, H.hi); p.P(12, 13 + oy, H.md); p.P(3, 13 + oy, H.md); }
  } else if (view === 'down') {
    if (hs === 'bald') { p.P(5, 4 + oy, S.hi); p.P(6, 4 + oy, S.hi); for (let y = 7; y <= 10; y++) { p.P(2, y + oy, H.md); p.P(13, y + oy, H.md); } }
    else {
      fillCap(6);
      // 瀏海
      const bang = hs === 'spiky' ? [3, 4, 6, 7, 9, 10, 12] : hs === 'bob' || hs === 'long' ? [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [3, 4, 5, 7, 8, 10, 11, 12];
      for (const x of bang) p.P(x, 7 + oy, x > 10 ? H.lo : H.md);
      for (const x of (hs === 'spiky' ? [3, 7, 12] : hs === 'bob' || hs === 'long' ? [3, 4, 11, 12] : [3, 12])) p.P(x, 8 + oy, H.lo);
      const sideLen = hs === 'long' ? 17 : hs === 'bob' ? 12 : hs === 'pony' || hs === 'bun' ? 10 : 9;
      for (let y = 8; y <= sideLen; y++) { p.P(2, y + oy, H.md); p.P(13, y + oy, H.lo); if (hs === 'long' || hs === 'bob') { if (y > 9) { p.P(1, y + oy, H.md); p.P(14, y + oy, H.lo); } } }
      if (hs === 'spiky') { p.P(3, 2 + oy, H.hi); p.P(4, 1 + oy, H.hi); p.P(7, 0 + oy, H.hi); p.P(7, 1 + oy, H.hi); p.P(11, 1 + oy, H.hi); p.P(12, 2 + oy, H.md); p.P(1, 6 + oy, H.md); p.P(14, 6 + oy, H.lo); }
      if (hs === 'bun') { p.E(7.5, 2.2 + oy, 2.6, 2, H.hi); }
      if (hs === 'pony') { p.P(14, 9 + oy, H.lo); p.P(14, 10 + oy, H.lo); p.P(15, 11 + oy, H.lo); }
      p.P(5, 3 + oy, lighten(L.hair, 0.55)); p.P(6, 3 + oy, lighten(L.hair, 0.55)); // 光澤
    }
  } else { // side，面向左
    if (hs === 'bald') { p.P(5, 4 + oy, S.hi); for (let y = 7; y <= 10; y++) { p.P(9, y + oy, H.md); p.P(10, y + oy, H.lo); } }
    else {
      fillCap(6);
      for (let y = 6; y <= 11; y++) for (let x = 7; x <= 12; x++) { if ((x - 7) + (11 - y) * 0.6 > 1.2 && Math.hypot((x + 0.5 - 7.6) / 5.9, (y + 0.5 - 7.2 - oy) / 5.6) <= 1.05) p.P(x, y + oy, x > 10 ? H.lo : H.md); }
      p.P(2, 7 + oy, H.md); p.P(3, 7 + oy, H.md); p.P(4, 7 + oy, H.lo); p.P(2, 8 + oy, H.lo);
      if (hs === 'long') { for (let y = 12; y <= 17; y++) { p.P(9, y + oy, H.md); p.P(10, y + oy, H.md); p.P(11, y + oy, H.lo); } p.P(12, 13 + oy, H.lo); }
      if (hs === 'bob') { for (let y = 12; y <= 12; y++) for (let x = 8; x <= 12; x++) p.P(x, y + oy, H.lo); }
      if (hs === 'pony') { p.P(13, 8 + oy, H.md); p.P(14, 9 + oy, H.md); p.P(14, 10 + oy, H.lo); p.P(13, 11 + oy, H.lo); }
      if (hs === 'bun') p.E(10.5, 3 + oy, 2.4, 2, H.hi);
      if (hs === 'spiky') { p.P(4, 1 + oy, H.hi); p.P(8, 0 + oy, H.hi); p.P(8, 1 + oy, H.hi); p.P(12, 2 + oy, H.md); p.P(13, 4 + oy, H.md); p.P(13, 7 + oy, H.lo); p.P(13, 5 + oy, H.lo); }
      p.P(6, 3 + oy, lighten(L.hair, 0.55));
    }
  }
  // 鬍子
  if (L.beard) {
    const B = shd(L.beard);
    if (view === 'down') { for (let y = 11; y <= 14; y++) for (let x = 4; x <= 11; x++) { if (y === 14 && (x < 6 || x > 9)) continue; if (y === 11 && x > 5 && x < 10) continue; p.P(x, y + oy, x > 9 ? B.lo : B.md); } p.P(7, 12 + oy, '#5a2a2a'); p.P(8, 12 + oy, '#5a2a2a'); }
    if (view === 'side') { for (let y = 11; y <= 14; y++) for (let x = 2; x <= 7; x++) { if (y === 14 && x < 4) continue; p.P(x, y + oy, B.md); } }
  }
  if (L.mous && view === 'down') { p.R(5, 11 + oy, 6, 1, L.mous); p.P(4, 12 + oy, L.mous); p.P(11, 12 + oy, L.mous); }
  if (L.glasses && view !== 'up') { if (view === 'down') { p.R(3, 9 + oy, 4, 1, '#3a3a4a'); p.R(9, 9 + oy, 4, 1, '#3a3a4a'); p.P(4, 10 + oy, '#c8e0ff'); p.P(10, 10 + oy, '#c8e0ff'); } else { p.R(2, 9 + oy, 4, 1, '#3a3a4a'); p.P(3, 10 + oy, '#c8e0ff'); } }
  // 帽子
  if (L.hat) drawHat(p, L, view, oy);
}
function drawHat(p, L, view, oy) {
  const C = shd(L.hatc), s = view === 'side';
  switch (L.hat) {
    case 'band':
      if (view === 'up') { p.R(2, 6 + oy, 12, 1, C.md); p.P(6, 7 + oy, C.md); p.P(9, 7 + oy, C.md); p.P(6, 8 + oy, C.lo); p.P(10, 8 + oy, C.lo); p.P(6, 9 + oy, C.lo); p.P(11, 9 + oy, C.lo); }
      else if (s) { p.R(3, 6 + oy, 10, 1, C.md); p.P(13, 7 + oy, C.md); p.P(14, 8 + oy, C.lo); p.P(14, 9 + oy, C.lo); p.P(15, 10 + oy, C.lo); }
      else { p.R(3, 6 + oy, 10, 1, C.md); p.P(4, 6 + oy, C.hi); p.P(5, 6 + oy, C.hi); p.P(2, 6 + oy, C.lo); p.P(13, 6 + oy, C.lo); }
      break;
    case 'hood': {
      // 白色兜帽，露出臉
      p.E(7.5 + (s ? 0.8 : 0), 7.4 + oy, 6.8, 6.3, (x, y, nx, ny) => {
        if (view === 'down' && y >= 7 + oy && x >= 3 && x <= 12) return null;
        if (s && y >= 7 + oy && x <= 7) return null;
        return y < 4 + oy ? C.hi : nx > 0.5 ? C.lo : C.md;
      });
      if (view === 'down') { p.R(3, 6 + oy, 10, 1, L.trim); for (let y = 7; y <= 15; y++) { p.P(1, y + oy, C.md); p.P(2, y + oy, C.md); p.P(13, y + oy, C.lo); p.P(14, y + oy, C.lo); } p.P(7, 4 + oy, L.trim); p.P(8, 4 + oy, L.trim); p.P(7, 3 + oy, L.trim); }
      if (s) { p.R(3, 6 + oy, 6, 1, L.trim); for (let y = 7; y <= 15; y++) for (let x = 8; x <= 13; x++) p.P(x, y + oy, x > 11 ? C.lo : C.md); }
      if (view === 'up') { for (let y = 8; y <= 17; y++) for (let x = 2; x <= 13; x++) p.P(x, y + oy, x > 10 ? C.lo : C.md); p.R(7, 3 + oy, 2, 2, L.trim); }
      break;
    }
    case 'witch': {
      const by = 5 + oy;
      // 帽簷
      for (let x = 0; x < 16; x++) p.P(x, by, x < 3 ? C.hi : x > 12 ? C.lo : C.md);
      for (let x = 1; x < 15; x++) p.P(x, by - 1, C.md);
      // 帽身
      const tip = s ? 13 : 11;
      for (let y = 0; y <= 4; y++) { const w = Math.round(1 + (y + oy) * 1.1); const cx = s ? 8 + (4 - y) * 0.9 : 7.5 + (4 - y) * 0.5; for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) p.P(x, y + oy - 1, x > cx + w * 0.4 ? C.lo : C.md); }
      p.P(tip, oy - 1, C.lo); p.P(tip + 1, oy, C.lo);
      p.R(3, by - 2, 10, 1, L.trim); // 帽帶
      if (view === 'down') p.P(7, by - 2, '#fff7b0');
      break;
    }
    case 'helm': {
      p.E(7.5 + (s ? 0.6 : 0), 6.6 + oy, s ? 6 : 6.4, 5, (x, y, nx, ny) => (y <= 7 + oy ? (ny < -0.4 && nx < 0.2 ? C.hi : nx > 0.45 ? C.lo : C.md) : null));
      if (view === 'down') { p.R(2, 7 + oy, 12, 1, C.lo); p.R(7, 7 + oy, 2, 3, C.md); p.P(4, 5 + oy, '#ffffff'); p.P(3, 7 + oy, C.dk); p.P(12, 7 + oy, C.dk); if (L.trim && L.big) { p.R(7, 1 + oy, 2, 3, L.trim); } }
      if (s) { p.R(2, 7 + oy, 11, 1, C.lo); p.R(2, 7 + oy, 2, 3, C.md); if (L.big) p.R(7, 1 + oy, 3, 2, L.trim); }
      if (view === 'up') { p.R(2, 7 + oy, 12, 1, C.lo); if (L.big) p.R(7, 1 + oy, 2, 3, L.trim); }
      break;
    }
    case 'cap':
      p.E(7.5, 5.2 + oy, 6.2, 3.4, (x, y) => (y <= 6 + oy ? (y < 4 + oy ? C.hi : C.md) : null));
      if (view === 'down') { p.R(3, 6 + oy, 10, 1, darken(L.hatc, 0.45)); p.R(6, 3 + oy, 4, 2, L.trim || C.lo); }
      if (s) { p.R(0, 6 + oy, 6, 1, darken(L.hatc, 0.45)); }
      break;
    case 'turban':
      p.E(7.5, 5 + oy, 7, 4.2, (x, y, nx) => (y <= 6 + oy ? ((x + y) % 3 === 0 ? C.lo : nx > 0.5 ? C.lo : C.md) : null));
      if (view === 'down') p.P(7, 4 + oy, '#d03a3a');
      break;
    case 'fur':
      p.E(7.5, 5 + oy, 7, 4, (x, y, nx) => (y <= 6 + oy ? (((x * 7 + y * 3) % 5 === 0) ? C.lo : C.md) : null));
      if (view !== 'up') { p.R(1, 7 + oy, 2, 4, C.md); p.R(13, 7 + oy, 2, 4, C.lo); }
      break;
    case 'crown':
      for (const x of [4, 6, 8, 10]) { p.P(x, 1 + oy, C.hi); }
      p.R(4, 2 + oy, 8, 2, C.md); p.P(7, 2 + oy, '#e03050'); p.P(8, 2 + oy, '#e03050');
      break;
    case 'hat2': // 神父的高帽
      p.R(5, 0 + oy, 6, 5, C.md); p.R(5, 0 + oy, 1, 5, C.hi); p.R(10, 0 + oy, 1, 5, C.lo); p.R(7, 1 + oy, 2, 3, '#e8b84a');
      break;
    case 'wide':
      for (let x = 0; x < 16; x++) p.P(x, 5 + oy, x < 3 ? C.hi : C.md);
      p.R(3, 1 + oy, 10, 4, C.md); p.R(3, 1 + oy, 2, 4, C.hi); p.R(3, 4 + oy, 10, 1, L.scarf || '#d03a3a');
      break;
  }
}
function drawBody(p, L, view, fr, oy) {
  const T = shd(L.top), P2 = shd(L.pants), SH = shd(L.shoes), SK = shd(L.skin), TR = L.trim || T.lo;
  const big = L.big ? 1 : 0, sm = L.small ? 1 : 0;
  const by = 14 + oy, x0 = 4 - big, x1 = 11 + big;
  const robe = L.out === 'robe', dress = L.out === 'dress', armor = L.out === 'armor';
  const step = fr === 1 ? 0 : fr === 0 ? -1 : 1;
  if (view === 'down' || view === 'up') {
    const back = view === 'up';
    // 披風（背面）
    if (L.cape && back) { const C = shd(L.cape); for (let y = by; y <= 21; y++) for (let x = x0 - 1; x <= x1 + 1; x++) p.P(x, y, x < x0 + 1 ? C.hi : x > x1 - 1 ? C.lo : C.md); p.R(x0, 21, x1 - x0 + 1, 1, C.lo); }
    if (L.cape && !back) { const C = shd(L.cape); for (let y = by; y <= 19; y++) { p.P(x0 - 1, y, C.lo); p.P(x1 + 1, y, C.lo); } }
    // 腳
    const legL = step === -1 ? 1 : 0, legR = step === 1 ? 1 : 0;
    if (!robe) {
      const ly = 20 + oy;
      for (const [lx, lift] of [[5, legL], [9, legR]]) {
        const yb = 23 - lift; for (let y = ly; y < yb; y++) { p.P(lx, y, P2.md); p.P(lx + 1, y, P2.lo); }
        p.P(lx, yb, SH.md); p.P(lx + 1, yb, SH.lo); if (!back) p.P(lx + (lx < 8 ? -1 : 2), yb, SH.lo);
      }
    } else {
      p.P(5, 23 - legL, SH.md); p.P(6, 23 - legL, SH.lo); p.P(9, 23 - legR, SH.md); p.P(10, 23 - legR, SH.lo);
    }
    // 身體
    const bottom = robe ? 22 : dress ? 21 : 19 + oy;
    for (let y = by; y <= bottom; y++) {
      let a = x0, b = x1;
      if (robe && y > by + 4) { a = x0 - Math.min(1, (y - by - 4) >> 1); b = x1 + Math.min(1, (y - by - 4) >> 1); }
      if (dress && y >= 18 + oy) { a = x0 - Math.min(2, y - 17 - oy); b = x1 + Math.min(2, y - 17 - oy); }
      for (let x = a; x <= b; x++) p.P(x, y, x === a ? T.hi : x >= b - 1 ? T.lo : T.md);
    }
    if (robe) { p.R(x0 - 1, 22, x1 - x0 + 3, 1, L.robe2 || T.lo); if (!back) p.R(7, by + 1, 2, 22 - by - 1, L.robe2 || TR); }
    if (dress) p.R(x0 - 2, 21, x1 - x0 + 5, 1, TR);
    if (armor) {
      const A = shd(L.top);
      p.R(x0 - 1, by, 3, 2, A.hi); p.R(x1 - 1, by, 3, 2, A.lo);
      if (!back) { p.R(6, by + 1, 4, 3, A.hi); p.P(7, by + 2, '#ffffff'); p.R(x0, by + 4, x1 - x0 + 1, 1, TR); }
      else p.R(x0, by + 4, x1 - x0 + 1, 1, TR);
    }
    // 腰帶、圍裙、條紋
    if (!robe && !armor) { p.R(x0, 18 + oy, x1 - x0 + 1, 1, L.belt); if (!back) { p.P(7, 18 + oy, '#f2d27a'); p.P(8, 18 + oy, '#c09a4a'); } }
    if (dress && !back) p.R(x0, 17 + oy, x1 - x0 + 1, 1, L.belt);
    if (L.stripes) for (let y = by + 1; y <= by + 3; y += 2) p.R(x0 + 1, y, x1 - x0 - 1, 1, L.stripes);
    if (L.apron && !back) { const A = shd(L.apron); for (let y = by + 2; y <= Math.min(bottom + 1, 21); y++) for (let x = x0 + 1; x <= x1 - 1; x++) p.P(x, y, x > x1 - 2 ? A.lo : A.md); }
    // 領口與領巾
    if (!back) { if (L.scarf) { p.R(x0 + 1, by, x1 - x0 - 1, 1, L.scarf); p.P(9, by + 1, L.scarf); p.P(9, by + 2, darken(L.scarf, 0.3)); } else if (!armor) { p.P(7, by, TR); p.P(8, by, TR); } }
    if (L.shawl && !back) { p.R(x0, by, x1 - x0 + 1, 2, L.shawl); }
    // 手臂
    const armY = by, swingL = view === 'down' ? step : -step;
    for (const [ax, sw, col] of [[x0 - 2, swingL, T], [x1 + 1, -swingL, T]]) {
      const len = 3 + (sw > 0 ? 1 : 0) - (sw < 0 ? 1 : 0);
      for (let y = 0; y < len; y++) { p.P(ax, armY + y, ax < 8 ? col.md : col.lo); p.P(ax + 1, armY + y, ax < 8 ? col.lo : col.lo); }
      p.P(ax, armY + len, SK.md); p.P(ax + 1, armY + len, SK.lo);
    }
  } else {
    // 側面（面向左）
    const C = L.cape ? shd(L.cape) : null;
    if (C) { for (let y = by; y <= 21; y++) for (let x = 9; x <= 11 + (y > 17 ? 1 : 0) + (step !== 0 && y > 18 ? 1 : 0); x++) p.P(x, y, x > 10 ? C.lo : C.md); }
    // 腳
    const legs = step === 0 ? [[6, 0, P2.md], [8, 0, P2.lo]] : [[4 + (step < 0 ? 0 : 0), -1, step < 0 ? P2.md : P2.lo], [9, 1, step < 0 ? P2.lo : P2.md]];
    if (!robe) {
      for (const [lx, d, col] of legs) {
        const ly = 20 + oy;
        for (let y = ly; y < 23; y++) { const xx = lx + (d !== 0 ? Math.round(d * (y - ly) * 0.4) : 0); p.P(xx, y, col); p.P(xx + 1, y, darken(col, 0.12)); }
        const fx = lx + (d !== 0 ? Math.round(d * 1.2) : 0);
        p.P(fx - 1, 23, col === P2.md ? SH.md : SH.lo); p.P(fx, 23, col === P2.md ? SH.md : SH.lo); p.P(fx + 1, 23, SH.lo);
      }
    } else {
      const off = step === 0 ? 0 : step;
      p.R(4 - (step !== 0 ? 1 : 0), 23, 3, 1, SH.md); if (step !== 0) p.R(9, 23, 2, 1, SH.lo);
      void off;
    }
    const bottom = robe ? 22 : dress ? 21 : 19 + oy;
    for (let y = by; y <= bottom; y++) {
      let a = 5 - big, b = 10 + big;
      if (robe && y > by + 4) { a -= 1; b += step !== 0 ? 1 : 0; }
      if (dress && y >= 18 + oy) { a -= Math.min(2, y - 17 - oy); b += Math.min(1, y - 17 - oy); }
      for (let x = a; x <= b; x++) p.P(x, y, x === a ? T.hi : x >= b ? T.lo : T.md);
    }
    if (robe) p.R(3, 22, 9, 1, L.robe2 || T.lo);
    if (dress) p.R(2, 21, 10, 1, TR);
    if (armor) { p.R(5, by, 4, 2, T.hi); p.R(5 - big, by + 4, 6 + big * 2, 1, TR); }
    if (!robe && !armor) p.R(5 - big, 18 + oy, 6 + big * 2, 1, L.belt);
    if (L.apron) { const A = shd(L.apron); for (let y = by + 2; y <= Math.min(bottom + 1, 21); y++) { p.P(4 - big, y, A.md); p.P(5 - big, y, A.lo); } }
    if (L.scarf) { p.R(5, by, 5, 1, L.scarf); p.P(10, by + 1, L.scarf); p.P(11, by + 2, darken(L.scarf, 0.3)); }
    if (L.stripes) p.R(5, by + 2, 6, 1, L.stripes);
    // 手臂
    const ax = 7, ay = by + 1;
    const pts = step === 0 ? [[ax, ay], [ax, ay + 1], [ax, ay + 2]] : step < 0 ? [[ax - 1, ay], [ax - 2, ay + 1], [ax - 3, ay + 2]] : [[ax + 1, ay], [ax + 2, ay + 1], [ax + 3, ay + 1]];
    for (const [x, y] of pts) { p.P(x, y, T.md); p.P(x + 1, y, T.lo); }
    const h = pts[2]; p.P(h[0], h[1] + 1, SK.md); p.P(h[0] + 1, h[1] + 1, SK.lo);
  }
}
function fieldFrame(L, view, fr) {
  const p = new PB(FW, FH);
  const oy = fr === 1 ? 0 : 1;
  drawBody(p, L, view, fr, oy);
  drawHead(p, L, view, oy);
  p.selout();
  return p;
}
// 產生整張行走圖：寬 48（3 格）× 高 96（下、上、左、右）
function makeFieldSheet(L) {
  const c = document.createElement('canvas'); c.width = FW * 3; c.height = FH * 4;
  const g = c.getContext('2d');
  for (let f = 0; f < 3; f++) {
    fieldFrame(L, 'down', f).blit(g, f * FW, 0, L.alpha || 1);
    fieldFrame(L, 'up', f).blit(g, f * FW, FH, L.alpha || 1);
    const s = fieldFrame(L, 'side', f);
    s.blit(g, f * FW, FH * 2, L.alpha || 1);
    s.flipX().blit(g, f * FW, FH * 3, L.alpha || 1);
  }
  return c;
}
const FieldSheets = {};
function fieldSheet(id) {
  if (FieldSheets[id]) return FieldSheets[id];
  const L = LOOKS[id];
  return (FieldSheets[id] = L ? makeFieldSheet(L) : null);
}
// 行走動畫：站立、左腳、站立、右腳
const WALK_SEQ = [1, 0, 1, 2];
function drawWalker(g, id, dir, phase, x, y, T, alpha = 1) {
  const sh = fieldSheet(id); if (!sh) return false;
  const row = { down: 0, up: 1, left: 2, right: 3 }[dir] || 0;
  const k = T / 16;
  g.globalAlpha = alpha;
  g.drawImage(sh, WALK_SEQ[phase & 3] * FW, row * FH, FW, FH, Math.round(x), Math.round(y + T - FH * k), FW * k, FH * k);
  g.globalAlpha = 1;
  return true;
}

// ───── 戰鬥側身圖（面向左，28×28，含武器） ─────
const BWEAP = { hero: 'sword', lia: 'rod', mira: 'staff', balk: 'axe' };
const BPOSES = {
  idle0: { arm: 'down', legs: 'stand' }, idle1: { arm: 'down', legs: 'stand', breath: 1 },
  ready: { arm: 'fwd', legs: 'lunge', lean: -1 },
  atk0: { arm: 'back', legs: 'lunge', lean: 1 }, atk1: { arm: 'fwdDown', legs: 'lunge', lean: -1 }, atk2: { arm: 'down2', legs: 'lunge', lean: -1 },
  cast0: { arm: 'up', legs: 'stand', arm2: 'up' }, cast1: { arm: 'high', legs: 'stand', arm2: 'up' },
  hurt: { arm: 'down', legs: 'stand', lean: 1, eyes: 'shut' }, guard: { arm: 'guard', legs: 'stand' },
  kneel: { arm: 'down', legs: 'kneel', eyes: 'tired' }, win0: { arm: 'high', legs: 'stand' }, win1: { arm: 'high', legs: 'stand', jump: 1 },
  item: { arm: 'up', legs: 'stand', item: 1 }, sleep: { arm: 'down', legs: 'kneel', eyes: 'shut' },
};
const ARMS = {
  down: [[0, 1], [0, 2], [0, 3]], down2: [[-1, 2], [-2, 3], [-3, 4]], fwd: [[-1, 1], [-2, 1], [-3, 1]], fwdDown: [[-1, 1], [-2, 2], [-3, 3]],
  up: [[-1, 0], [-2, -1], [-3, -2]], high: [[0, 0], [0, -1], [0, -2]], back: [[1, 0], [2, -1], [3, -2]], guard: [[-1, 1], [-2, 1], [-2, 0]],
};
const WANG = { sword: { down: -70, down2: -30, fwd: 5, fwdDown: -25, up: 60, high: 90, back: 140, guard: 85 }, rod: { down: 95, down2: 60, fwd: 60, fwdDown: 45, up: 75, high: 90, back: 120, guard: 90 }, axe: { down: -70, down2: -20, fwd: 10, fwdDown: -20, up: 60, high: 90, back: 135, guard: 90 } };
WANG.staff = WANG.rod;
function drawWeapon(p, kind, hx, hy, deg) {
  const a = deg * Math.PI / 180, dx = -Math.cos(a), dy = -Math.sin(a);
  const seg = (s, e, col) => { for (let t = s; t <= e; t += 0.5) p.P(hx + dx * t, hy + dy * t, col); };
  if (kind === 'sword') {
    seg(-2, -0.5, '#6a3a1a');
    for (let t = 1; t <= 9; t += 0.5) { p.P(hx + dx * t, hy + dy * t, '#e8eef8'); p.P(hx + dx * t + dy * 0.9, hy + dy * t - dx * 0.9, '#9aa6bc'); }
    p.P(hx + dx * 10, hy + dy * 10, '#ffffff');
    for (let t = -1.5; t <= 1.5; t += 0.5) p.P(hx + dx * 0.6 - dy * t, hy + dy * 0.6 + dx * t, '#f2c14e');
  } else if (kind === 'axe') {
    seg(-2, 9, '#7a5030'); for (let t = -2; t <= 9; t += 0.5) p.P(hx + dx * t - dy * 0.9, hy + dy * t + dx * 0.9, '#4a2e18');
    for (let t = 6; t <= 9.5; t += 0.5) for (let s = 0.5; s <= 3.5; s += 0.5) p.P(hx + dx * t + dy * s, hy + dy * t - dx * s, s > 2.8 ? '#ffffff' : '#b8c0d0');
  } else {
    seg(-3, 9, kind === 'rod' ? '#e8c060' : '#7a5030'); for (let t = -3; t <= 9; t += 0.5) p.P(hx + dx * t + dy * 0.9, hy + dy * t - dx * 0.9, kind === 'rod' ? '#a8802a' : '#4a2e18');
    const ox = hx + dx * 10.5, oy = hy + dy * 10.5;
    if (kind === 'rod') { for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) p.P(ox + x, oy + y, '#f2c14e'); p.P(ox, oy, '#fff8d0'); p.P(ox + dx * 1.8, oy + dy * 1.8, '#f2c14e'); }
    else { p.R(Math.round(ox) - 1, Math.round(oy) - 1, 3, 3, '#e8403a'); p.P(Math.round(ox) - 1, Math.round(oy) - 1, '#ffb0a0'); p.P(ox - dy * 2, oy + dx * 2, '#f2c14e'); p.P(ox + dy * 2, oy - dx * 2, '#f2c14e'); }
  }
}
function battleFrame(L, id, poseName) {
  const pose = BPOSES[poseName];
  const OX = 6, OY = 4;
  const kneel = pose.legs === 'kneel', oy = (kneel ? 3 : 0) + (pose.breath ? 1 : 0);
  const body = new PB(16, 24), head = new PB(16, 24);
  const T = shd(L.top), P2 = shd(L.pants), SH = shd(L.shoes), SK = shd(L.skin), TR = L.trim || T.lo;
  const big = L.big ? 1 : 0, robe = L.out === 'robe', dress = L.out === 'dress', armor = L.out === 'armor';
  const by = 14 + oy;
  // 披風
  if (L.cape) { const C = shd(L.cape); for (let y = by; y <= 21 + (kneel ? 1 : 0); y++) for (let x = 9; x <= 12 + (y > 17 ? 1 : 0) + (pose.legs === 'lunge' && y > 18 ? 1 : 0); x++) body.P(x, y, x > 10 ? C.lo : C.md); }
  // 腳
  if (kneel) {
    body.R(3, 23, 4, 1, SH.md); body.R(5, 21, 2, 2, P2.md); body.R(4, 20, 3, 1, P2.md);
    body.R(8, 23, 4, 1, P2.lo); body.R(11, 23, 2, 1, SH.lo); body.R(8, 21, 2, 2, P2.lo);
  } else if (!robe) {
    const legs = pose.legs === 'lunge' ? [[4, -1, P2.md], [9, 1, P2.lo]] : [[6, 0, P2.md], [8, 0, P2.lo]];
    for (const [lx, d, col] of legs) {
      for (let y = 20; y < 23; y++) { const xx = lx + (d !== 0 ? Math.round(d * (y - 20) * 0.4) : 0); body.P(xx, y, col); body.P(xx + 1, y, darken(col, 0.12)); }
      const fx = lx + (d !== 0 ? Math.round(d * 1.2) : 0); body.P(fx - 1, 23, col === P2.md ? SH.md : SH.lo); body.P(fx, 23, col === P2.md ? SH.md : SH.lo); body.P(fx + 1, 23, SH.lo);
    }
  } else { body.R(pose.legs === 'lunge' ? 3 : 4, 23, 3, 1, SH.md); if (pose.legs === 'lunge') body.R(9, 23, 2, 1, SH.lo); }
  // 軀幹
  const bottom = kneel ? 22 : robe ? 22 : dress ? 21 : 19;
  for (let y = by; y <= bottom; y++) {
    let a = 5 - big, b = 10 + big;
    if ((robe || kneel) && y > by + 4) { a -= 1; b += 1; }
    if (dress && y >= 18) { a -= Math.min(2, y - 17); b += Math.min(1, y - 17); }
    for (let x = a; x <= b; x++) body.P(x, y, x === a ? T.hi : x >= b ? T.lo : T.md);
  }
  if (robe) body.R(3, 22, 9, 1, L.robe2 || T.lo);
  if (dress && !kneel) body.R(2, 21, 10, 1, TR);
  if (armor) { body.R(5, by, 4, 2, T.hi); body.R(5 - big, by + 4, 6 + big * 2, 1, TR); }
  if (!robe && !armor) body.R(5 - big, 18 + oy, 6 + big * 2, 1, L.belt);
  if (L.scarf) { body.R(5, by, 5, 1, L.scarf); body.P(10, by + 1, L.scarf); body.P(11, by + 2, darken(L.scarf, 0.3)); body.P(12, by + 2, darken(L.scarf, 0.3)); }
  // 頭
  drawHead(head, L, 'side', oy);
  if (pose.eyes === 'shut' || pose.eyes === 'tired') { const sk = L.skin; for (const [x, y] of [[3, 9], [4, 9], [3, 10], [4, 10]]) head.P(x, y + oy, sk); head.P(3, 10 + oy, '#1a1020'); head.P(4, pose.eyes === 'shut' ? 9 + oy : 10 + oy, '#1a1020'); }
  // 合成到 28×28
  const p = new PB(28, 28), hx0 = OX + (pose.lean || 0);
  const blitPB = (src, dx, dy) => { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const v = src.d[y * src.w + x]; if (v) p.P(x + dx, y + dy, v); } };
  const jump = pose.jump ? -2 : 0;
  const kind = BWEAP[id] || 'sword';
  const arm = ARMS[pose.arm] || ARMS.down, sx = OX + 7, sy = OY + by + 1 + jump;
  const hand = arm[2], hxp = sx + hand[0], hyp = sy + hand[1] + 1;
  const behind = pose.arm === 'back' || pose.arm === 'high';
  // 後面的手（施法時）
  if (pose.arm2) { const a2 = ARMS[pose.arm2]; for (const [x, y] of a2) { p.P(sx + 1 + x, sy + y, T.lo); } const h2 = a2[2]; p.P(sx + 1 + h2[0], sy + h2[1] + 1, SK.lo); }
  if (behind) drawWeapon(p, kind, hxp, hyp, (WANG[kind] || WANG.sword)[pose.arm]);
  blitPB(body, OX, OY + jump);
  blitPB(head, hx0, OY + jump);
  for (const [x, y] of arm) { p.P(sx + x, sy + y, T.md); p.P(sx + x + 1, sy + y, T.dk); p.P(sx + x, sy + y + 1, p.G(sx + x, sy + y + 1) && !arm.some(([ax, ay]) => ax === x && ay === y + 1) ? T.dk : p.G(sx + x, sy + y + 1)); }
  p.P(hxp, hyp, SK.md); p.P(hxp + 1, hyp, SK.lo);
  if (!behind && !pose.item) drawWeapon(p, kind, hxp, hyp, (WANG[kind] || WANG.sword)[pose.arm]);
  if (pose.item) { p.R(hxp - 1, hyp - 4, 3, 4, '#5ad08a'); p.R(hxp - 1, hyp - 4, 1, 4, '#b0ffd0'); p.R(hxp, hyp - 5, 1, 1, '#c8a060'); }
  p.selout();
  return p.canvas();
}
const BattleSheets = {};
function battleSprites(id) {
  if (BattleSheets[id]) return BattleSheets[id];
  const L = LOOKS[id] || LOOKS.hero, o = {};
  for (const k in BPOSES) o[k] = battleFrame(L, id, k);
  o.white = {}; o.red = {};
  for (const k in o) if (k !== 'white' && k !== 'red') { o.white[k] = silhouette(o[k], '#ffffff'); }
  return (BattleSheets[id] = o);
}

// ───── 對話頭像（40×40，由外觀設定自動產生） ─────
function makePortrait(L) {
  const p = new PB(40, 40);
  const S = shd(L.skin), H = shd(L.hair), T = shd(L.top), TR = L.trim || T.lo, hs = L.hs;
  // 後面的長髮
  if (hs === 'long' && L.hat !== 'helm') for (let y = 14; y < 40; y++) for (let x = 7; x <= 32; x++) { if (Math.abs(x - 19.5) < 12.5 - Math.max(0, y - 30) * 0.3) p.P(x, y, x < 12 ? H.hi : x > 28 ? H.lo : H.md); }
  // 肩膀與衣服
  for (let y = 31; y < 40; y++) { const w = 8 + (y - 31) * 1.6 + (L.big ? 3 : 0); for (let x = Math.round(19.5 - w); x <= Math.round(19.5 + w); x++) p.P(x, y, x < 19.5 - w + 3 ? T.hi : x > 19.5 + w - 4 ? T.lo : T.md); }
  if (L.out === 'armor') { p.E(10, 34, 5, 3.5, T.hi); p.E(29, 34, 5, 3.5, T.lo); p.P(10, 32, '#ffffff'); }
  p.R(15, 31, 10, 1, TR); for (let y = 31; y < 40; y++) { p.P(19, y, TR); p.P(20, y, TR); }
  if (L.scarf) { p.R(13, 30, 14, 3, L.scarf); p.R(13, 32, 14, 1, darken(L.scarf, 0.3)); }
  if (L.cape) { p.R(5, 33, 4, 7, L.cape); p.R(31, 33, 4, 7, darken(L.cape, 0.3)); }
  // 脖子與頭
  p.R(17, 26, 6, 6, S.lo);
  p.E(19.5, 17.5, 10.5, 11.5, (x, y, nx, ny) => (nx > 0.62 || ny > 0.85 ? S.lo : S.md));
  p.P(8, 19, S.lo); p.P(31, 19, S.lo); p.P(8, 20, S.md); p.P(31, 20, S.lo);
  // 眼睛
  const eyeShut = false;
  for (const ex of [13, 24]) {
    if (eyeShut) { p.R(ex, 20, 3, 1, '#1a1020'); continue; }
    p.R(ex, 18, 3, 4, L.eye); p.R(ex, 18, 3, 1, '#1a1020'); p.R(ex + 1, 19, 1, 2, '#1a1020'); p.P(ex, 19, '#ffffff'); p.P(ex - 1, 18, '#1a1020'); p.P(ex + 3, 18, '#1a1020');
    p.R(ex, 15, 3, 1, H.lo);
  }
  p.P(19, 22, S.lo); p.P(20, 23, S.lo);
  p.R(18, 25, 4, 1, mix(S.md, '#a0302a', 0.45));
  p.R(11, 22, 2, 1, mix(S.md, '#ff7a8a', 0.45)); p.R(27, 22, 2, 1, mix(S.md, '#ff7a8a', 0.45));
  if (L.glasses) { p.R(11, 17, 6, 1, '#3a3a4a'); p.R(22, 17, 6, 1, '#3a3a4a'); p.R(11, 21, 6, 1, '#3a3a4a'); p.R(22, 21, 6, 1, '#3a3a4a'); p.R(17, 18, 5, 1, '#3a3a4a'); }
  if (L.beard) { const B = shd(L.beard); p.E(19.5, 26, 9, 5.5, (x, y) => (y >= 23 ? (x > 24 ? B.lo : B.md) : null)); p.R(17, 24, 6, 1, B.lo); p.R(18, 25, 4, 1, '#5a2a2a'); }
  if (L.mous) { p.R(15, 24, 10, 1, L.mous); p.P(14, 25, L.mous); p.P(25, 25, L.mous); }
  // 頭髮
  if (hs !== 'bald') {
    p.E(19.5, 15, 11.6, 10.5, (x, y, nx, ny) => (y <= 12 ? (ny < -0.6 ? H.hi : nx > 0.5 ? H.lo : H.md) : null));
    for (let x = 9; x <= 30; x++) { const d = hs === 'spiky' ? ((x % 4) < 2 ? 3 : 1) : hs === 'bob' || hs === 'long' ? 3 + (x % 3 === 0 ? 1 : 0) : 2 + ((x * 7) % 3 === 0 ? 1 : 0); for (let y = 13; y < 13 + d; y++) p.P(x, y, x > 26 ? H.lo : H.md); }
    const side = hs === 'long' ? 30 : hs === 'bob' ? 24 : 19;
    for (let y = 13; y <= side; y++) { p.R(7, y, 3, 1, H.md); p.R(30, y, 3, 1, H.lo); }
    if (hs === 'spiky') for (const [x, y] of [[11, 4], [16, 2], [22, 2], [27, 4], [8, 9], [31, 9]]) { p.E(x, y + 2, 2, 2.5, H.hi); }
    if (hs === 'bun') p.E(19.5, 4, 5, 4, H.hi);
    if (hs === 'pony') { p.E(32, 18, 3, 7, H.lo); }
    p.R(13, 6, 4, 1, lighten(L.hair, 0.5)); p.R(12, 7, 2, 1, lighten(L.hair, 0.5));
  } else { p.R(7, 15, 3, 6, H.md); p.R(30, 15, 3, 6, H.lo); p.R(13, 8, 4, 2, S.hi); }
  // 帽子
  const C = L.hatc ? shd(L.hatc) : null;
  switch (L.hat) {
    case 'band': p.R(8, 11, 24, 3, C.md); p.R(8, 11, 24, 1, C.hi); p.R(31, 12, 4, 2, C.lo); p.R(33, 14, 3, 4, C.lo); break;
    case 'hood': p.E(19.5, 15, 13.5, 13, (x, y, nx, ny) => ((y >= 13 && x >= 10 && x <= 29) ? null : y > 35 ? null : (ny < -0.5 ? C.hi : nx > 0.5 ? C.lo : C.md))); p.R(10, 12, 20, 1, L.trim); p.R(18, 3, 4, 4, L.trim); p.R(19, 2, 2, 6, L.trim); for (let y = 13; y < 34; y++) { p.R(6, y, 4, 1, C.md); p.R(30, y, 4, 1, C.lo); } break;
    case 'witch': for (let y = 0; y < 10; y++) { const w = 1 + y * 1.1; p.R(Math.round(21 - w + (9 - y) * 0.5), y, Math.round(w * 2), 1, C.md); } p.R(1, 10, 38, 3, C.md); p.R(1, 10, 38, 1, C.hi); p.R(1, 12, 38, 1, C.lo); p.R(10, 8, 20, 2, L.trim); p.P(19, 8, '#fff7b0'); break;
    case 'helm': p.E(19.5, 13, 12.5, 10, (x, y, nx, ny) => (y <= 14 ? (ny < -0.4 && nx < 0 ? C.hi : nx > 0.4 ? C.lo : C.md) : null)); p.R(7, 14, 26, 2, C.lo); p.R(18, 14, 4, 6, C.md); p.P(12, 6, '#ffffff'); if (L.big) p.R(17, 0, 6, 5, L.trim); break;
    case 'cap': p.E(19.5, 10, 12, 7, (x, y) => (y <= 13 ? (y < 8 ? C.hi : C.md) : null)); p.R(8, 13, 24, 2, darken(L.hatc, 0.45)); p.R(16, 6, 8, 3, L.trim || C.lo); break;
    case 'turban': p.E(19.5, 9, 13, 8, (x, y) => (y <= 14 ? (((x + y) % 4 === 0) ? C.lo : C.md) : null)); p.E(19.5, 9, 2, 2, '#d03a3a'); break;
    case 'fur': p.E(19.5, 9, 13, 7, (x, y) => (y <= 14 ? (((x * 7 + y * 3) % 5 === 0) ? C.lo : C.md) : null)); p.R(5, 13, 4, 10, C.md); p.R(31, 13, 4, 10, C.lo); break;
    case 'crown': for (const x of [11, 16, 23, 28]) p.R(x, 1, 2, 3, C.hi); p.R(11, 4, 18, 4, C.md); p.R(18, 5, 4, 2, '#e03050'); p.R(13, 5, 2, 2, '#3a7ad8'); p.R(25, 5, 2, 2, '#3a7ad8'); break;
    case 'hat2': p.R(13, 0, 14, 11, C.md); p.R(13, 0, 2, 11, C.hi); p.R(25, 0, 2, 11, C.lo); p.R(18, 2, 4, 7, '#e8b84a'); p.R(17, 4, 6, 2, '#e8b84a'); break;
    case 'wide': p.R(0, 10, 40, 3, C.md); p.R(0, 10, 40, 1, C.hi); p.R(9, 1, 22, 9, C.md); p.R(9, 1, 4, 9, C.hi); p.R(9, 8, 22, 2, L.scarf || '#d03a3a'); break;
  }
  p.selout();
  return p.canvas();
}
const Portraits = {};
function portrait(id) { if (Portraits[id] !== undefined) return Portraits[id]; return (Portraits[id] = LOOKS[id] ? makePortrait(LOOKS[id]) : null); }
// 說話者名稱 → 頭像
const SPEAKERS = { 洛恩: 'hero', 莉亞: 'lia', 米菈: 'mira', 巴爾克: 'balk', 托爾爺爺: 'grandpa', 娜菲莉: 'queen', 砂金女王娜菲莉: 'queen', 船長: 'captain', 葛雷: 'miner', 老礦工葛雷: 'miner', 小萌: 'girl', 學者賽門: 'scholar', 鐵匠: 'smith', 神父: 'priest', 村長: 'grandpa', 見習神官: 'lia', 紅髮女孩: 'mira', 高大的戰士: 'balk', 母親: 'desertw', 女孩: 'girl', 守衛: 'guard', 侍衛: 'guard', 門衛: 'guard', 水手: 'sailor', 漁夫: 'sailor', 樵夫: 'man2', 旅店老闆: 'man2', 吟遊詩人: 'bard', 賭場老闆: 'gambler', 星之收藏家: 'collector', 研究員: 'scholar' };
const BOSS_SPEAK = { 毒霧蕈王: 'mushking', 嵐翼魔鳥: 'stormbird', 鐵甲魔像: 'irongolem', 沙之王: 'sandking', 霜牙龍: 'frostdragon', 加爾德: 'garde', 黯騎士: 'garde', 黯王諾克斯: 'nox1', 諾克斯: 'nox1' };
