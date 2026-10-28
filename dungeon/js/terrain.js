'use strict';
// 深淵地牢：地形材質與整層地形快取
// 每個生態區先做出 16×16 的基本材質；看到的格子再依照四周的地形（牆邊陰影、牆頂邊緣、地毯邊框…）
// 畫進一張「整層樓」大小的畫布，之後每一格只要一次 drawImage 就能畫完整個畫面。

const TEX = {
  biome: -1, t: null,
  mk(fn, w = 16, h = 16) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x, (px, py, col) => { x.fillStyle = col; x.fillRect(px, py, 1, 1); }); return c; },
  build(bi) {
    if (this.biome === bi && this.t) return this.t;
    this.biome = bi;
    const P = BIOMES[bi].pal, S = bi * 131 + 7, t = {};
    const H = (a, b, c = 0) => hash2(a, b, S + c);
    const mix = (a, b, k) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const r = (A >> 16) + (((B >> 16) - (A >> 16)) * k), g = ((A >> 8) & 255) + ((((B >> 8) & 255) - ((A >> 8) & 255)) * k), bl = (A & 255) + (((B & 255) - (A & 255)) * k); return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1); };
    t.mix = mix;
    // ---- 地板：石板 ----
    const LAYOUTS = [
      [[0, 0, 8, 7], [8, 0, 8, 9], [0, 7, 9, 9], [9, 9, 7, 7]],
      [[0, 0, 10, 6], [10, 0, 6, 10], [0, 6, 6, 10], [6, 6, 4, 10], [10, 10, 6, 6]],
      [[0, 0, 7, 9], [7, 0, 9, 7], [7, 7, 9, 9], [0, 9, 7, 7]],
      [[0, 0, 16, 7], [0, 7, 9, 9], [9, 7, 7, 9]],
      [[0, 0, 6, 6], [6, 0, 10, 6], [0, 6, 11, 10], [11, 6, 5, 10]],
      [[0, 0, 8, 8], [8, 0, 8, 8], [0, 8, 8, 8], [8, 8, 8, 8]],
    ];
    const slab = (x, px, v, o) => {
      const L = o.layouts ? o.layouts[v % o.layouts.length] : LAYOUTS[v % LAYOUTS.length];
      x.fillStyle = mix(o.base, o.mortar, o.mortK || 0.7); x.fillRect(0, 0, 16, 16);
      L.forEach(([sx, sy, sw, sh], i) => {
        const base = shade(o.base, (H(v, i, 1) - 0.5) * o.jit);
        for (let j = sy; j < sy + sh - 1; j++) for (let k = sx; k < sx + sw - 1; k++) {
          const n = H(k + v * 17, j + i * 5, 2);
          px(k, j, n < 0.12 ? shade(base, -0.07) : n > 0.9 ? shade(base, 0.06) : base);
        }
        x.fillStyle = shade(base, o.bevel || 0.07); x.fillRect(sx, sy, sw - 1, 1); x.fillRect(sx, sy, 1, sh - 1);
        x.fillStyle = shade(base, -(o.bevel || 0.07)); x.fillRect(sx, sy + sh - 2, sw - 1, 1); x.fillRect(sx + sw - 2, sy, 1, sh - 1);
        if (o.crack && H(v, i, 9) < o.crack) { let cx = sx + 2 + ((H(i, v, 4) * (sw - 4)) | 0), cy = sy + 1; x.fillStyle = o.crackCol || shade(base, -0.3); for (let s = 0; s < sh - 2; s++) { x.fillRect(cx, cy + s, 1, 1); if (H(s, i, v) < 0.4) cx += H(i, s, v) < 0.5 ? -1 : 1; cx = clamp(cx, sx + 1, sx + sw - 3); } }
      });
    };
    const rough = (x, px, v) => {
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
        const n = (H(i >> 1, j >> 1, v + 3) * 0.6 + H(i, j, v + 40) * 0.4);
        px(i, j, n < 0.25 ? P.floor2 : n < 0.62 ? P.floor : n < 0.88 ? shade(P.floor, 0.06) : shade(P.floor, 0.13));
      }
      for (let k = 0; k < 3; k++) { const cx = (H(k, v, 7) * 13 + 1) | 0, cy = (H(v, k, 8) * 13 + 1) | 0; px(cx, cy, shade(P.floor, 0.22)); px(cx + 1, cy, shade(P.floor, 0.1)); px(cx, cy + 1, shade(P.floor, -0.25)); px(cx + 1, cy + 1, shade(P.floor, -0.3)); }
      if (v % 3 === 1) { x.fillStyle = shade(P.floor2, -0.15); const cx = (H(v, 9, 9) * 10 + 2) | 0, cy = (H(9, v, 9) * 10 + 2) | 0; x.fillRect(cx, cy, 4, 2); x.fillRect(cx + 1, cy + 2, 2, 1); }
    };
    const BIG = [[[0, 0, 9, 16], [9, 0, 7, 9], [9, 9, 7, 7]], [[0, 0, 16, 9], [0, 9, 6, 7], [6, 9, 10, 7]], [[0, 0, 16, 16]], [[0, 0, 7, 7], [7, 0, 9, 16], [0, 7, 7, 9]], [[0, 0, 16, 6], [0, 6, 16, 10]], [[0, 0, 11, 11], [11, 0, 5, 16], [0, 11, 11, 5]]];
    const FLO = [
      (x, px, v) => slab(x, px, v, { base: P.floor, mortar: P.line, jit: 0.08, crack: 0.08, layouts: BIG }),
      (x, px, v) => rough(x, px, v),
      (x, px, v) => slab(x, px, v, { base: P.floor, mortar: '#1e1210', mortK: 0.5, jit: 0.12, crack: 0.1, crackCol: '#c8441a', layouts: BIG }),
      (x, px, v) => { slab(x, px, v, { base: P.floor, mortar: P.line, jit: 0.05, bevel: 0.12, layouts: [LAYOUTS[5]] }); for (let k = 0; k < 2; k++) px((H(k, v, 3) * 15) | 0, (H(v, k, 3) * 15) | 0, '#e8fbff'); },
      (x, px, v) => { slab(x, px, v, { base: P.floor, mortar: P.line, jit: 0.08, crack: 0.1, crackCol: '#7a3aa0', layouts: BIG }); },
      // 溺沒古城：長著水藻的古老石磚
      (x, px, v) => { slab(x, px, v, { base: P.floor, mortar: P.line, jit: 0.1, crack: 0.12, crackCol: '#1f3432', layouts: LAYOUTS }); for (let k = 0; k < 4; k++) { const cx = (H(k, v, 12) * 14) | 0, cy = (H(v, k, 13) * 14) | 0; px(cx, cy, '#4f8a6a'); px(cx + 1, cy, '#3f7a5a'); if (k % 2) px(cx, cy + 1, '#5fa07a'); } },
      // 星骸虛空：帶星屑的淡紫色石板
      (x, px, v) => { slab(x, px, v, { base: P.floor, mortar: P.line, jit: 0.07, bevel: 0.1, crack: 0.06, crackCol: '#2a2640', layouts: BIG }); for (let k = 0; k < 3; k++) px((H(k, v, 21) * 15) | 0, (H(v, k, 22) * 15) | 0, k ? '#c8c0e8' : '#ffe8a0'); },
      // 終焉之心：泛著紅光裂縫的黑曜石
      (x, px, v) => { slab(x, px, v, { base: P.floor, mortar: '#120a10', mortK: 0.55, jit: 0.1, crack: 0.16, crackCol: '#c8304a', layouts: BIG }); },
    ];
    t.floor = [0, 1, 2, 3, 4, 5].map(v => this.mk((x, px) => FLO[bi](x, px, v)));
    // ---- 牆頂 ----
    t.cap = [0, 1, 2].map(v => this.mk((x, px) => {
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const n = H(i >> 1, j >> 1, v + 60) * 0.7 + H(i, j, v + 61) * 0.3; px(i, j, n < 0.3 ? shade(P.wall, -0.12) : n < 0.75 ? P.wall : shade(P.wall, 0.07)); }
      if (bi !== 1) { x.fillStyle = shade(P.wall, -0.2); const o = v * 5 % 16; x.fillRect(0, (o + 3) % 16, 16, 1); x.fillRect((o + 7) % 16, 0, 1, 16); }
    }));
    // ---- 牆面 ----
    const face = (x, px, v) => {
      const top = shade(P.wallHi, 0.08), faceC = P.face;
      // 牆頂邊緣
      x.fillStyle = P.wall; x.fillRect(0, 0, 16, 3); x.fillStyle = top; x.fillRect(0, 3, 16, 1); x.fillStyle = shade(P.wallHi, -0.1); x.fillRect(0, 4, 16, 1);
      if (bi === 1) { // 洞穴：岩層
        for (let j = 5; j < 16; j++) for (let i = 0; i < 16; i++) { const n = H(i >> 1, j, v + 70) * 0.6 + H(i, j, v + 71) * 0.4, g = (j - 5) / 11; px(i, j, mix(n < 0.35 ? shade(faceC, -0.12) : n < 0.8 ? faceC : shade(faceC, 0.1), P.faceLo, g * 0.75)); }
        x.fillStyle = shade(P.faceLo, -0.2); for (let k = 0; k < 3; k++) x.fillRect(0, 7 + k * 3 + (v + k) % 2, 16, 1);
        if (v === 1) { for (const [cx, cy, c] of [[4, 9, P.deco], [11, 12, P.deco2], [7, 13, P.deco]]) { px(cx, cy, c); px(cx + 1, cy, shade(c, 0.4)); px(cx, cy + 1, shade(c, -0.3)); } }
      } else {
        for (let r = 0; r < 4; r++) {
          const y0 = 5 + r * 3, off = (r + v) % 2 ? 0 : 4;
          for (let b = -1; b < 3; b++) {
            const bx = off + b * 8, base = mix(shade(faceC, (H(r, b + 4, v + 80) - 0.5) * 0.16), P.faceLo, r * 0.18);
            x.fillStyle = base; x.fillRect(bx, y0, 7, 2);
            x.fillStyle = shade(base, 0.14); x.fillRect(bx, y0, 7, 1);
          }
          x.fillStyle = shade(P.faceLo, -0.15); x.fillRect(0, y0 + 2, 16, 1);
          for (let b = -1; b < 3; b++) x.fillRect(off + b * 8 + 7, y0, 1, 2);
        }
        if (bi === 0 && v === 1) { x.fillStyle = P.deco; x.fillRect(2, 5, 5, 1); x.fillRect(3, 6, 3, 1); x.fillRect(4, 7, 1, 3); x.fillRect(11, 5, 3, 1); x.fillRect(12, 6, 1, 2); x.fillStyle = P.deco2; x.fillRect(3, 5, 2, 1); x.fillRect(12, 5, 1, 1); }
        if (bi === 0 && v === 2) { x.fillStyle = '#1a1420'; x.fillRect(9, 7, 1, 3); x.fillRect(10, 9, 1, 3); x.fillRect(9, 12, 1, 2); }
        if (bi === 2 && v === 1) { x.fillStyle = '#ff6a2a'; x.fillRect(3, 9, 1, 1); x.fillRect(4, 10, 2, 1); x.fillRect(6, 11, 1, 2); x.fillRect(12, 6, 1, 3); x.fillStyle = '#ffc06a'; x.fillRect(4, 10, 1, 1); x.fillRect(12, 7, 1, 1); }
        if (bi === 2 && v === 2) { x.fillStyle = '#1a1010'; x.fillRect(4, 7, 8, 6); x.fillStyle = '#6a5a5a'; for (let i = 0; i < 4; i++) x.fillRect(5 + i * 2, 7, 1, 6); x.fillRect(4, 7, 8, 1); x.fillStyle = 'rgba(255,110,40,.35)'; x.fillRect(5, 11, 6, 2); }
        if (bi === 3 && v === 1) { x.fillStyle = P.deco; x.fillRect(5, 8, 2, 4); x.fillStyle = P.deco2; x.fillRect(5, 8, 1, 2); }
        if (bi === 3) { x.fillStyle = '#d8f4ff'; for (const ix of v === 2 ? [2, 6, 12] : [9]) { x.fillRect(ix, 5, 2, 1); x.fillRect(ix, 6, 1, 2); } }
        if (bi === 4 && v === 1) { x.fillStyle = P.deco; x.fillRect(6, 7, 4, 1); x.fillRect(7, 8, 1, 4); x.fillRect(9, 9, 1, 2); x.fillRect(6, 11, 3, 1); }
        if (bi === 5 && v !== 2) { x.fillStyle = '#2f6a4a'; for (const ix of v ? [3, 11] : [7]) { x.fillRect(ix, 5, 1, 7 + (ix % 3)); x.fillRect(ix + 1, 7, 1, 4); } x.fillStyle = '#5fa07a'; x.fillRect(v ? 3 : 7, 5, 1, 2); x.fillStyle = 'rgba(120,230,210,.25)'; x.fillRect(0, 13, 16, 2); }
        if (bi >= 6 && v === 1) { x.fillStyle = bi === 6 ? '#ffe8a0' : '#ff5a6a'; x.fillRect(4, 8, 1, 1); x.fillRect(11, 11, 1, 1); x.fillStyle = bi === 6 ? '#9ab8ff' : '#c060ff'; x.fillRect(8, 6, 1, 1); }
      }
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 15, 16, 1);
    };
    t.face = [0, 1, 2, 3].map(v => this.mk((x, px) => face(x, px, v)));
    // 旗幟（青苔地窖、神殿、王座）與鎖鏈
    t.banner = this.mk((x, px) => { face(x, px, 0); const c = bi === 3 ? '#3a6ad0' : bi === 4 ? '#6a2a9a' : '#8a2a3a'; x.fillStyle = '#c8a040'; x.fillRect(4, 5, 8, 1); x.fillStyle = c; x.fillRect(5, 6, 6, 8); x.fillStyle = shade(c, 0.2); x.fillRect(5, 6, 1, 8); x.fillStyle = shade(c, -0.3); x.fillRect(10, 6, 1, 8); x.fillStyle = '#e0b040'; x.fillRect(7, 8, 2, 3); x.fillRect(6, 9, 4, 1); x.fillStyle = c; x.fillRect(5, 14, 2, 1); x.fillRect(9, 14, 2, 1); });
    t.chain = this.mk((x, px) => { face(x, px, 3); x.fillStyle = '#8a8a96'; for (let j = 5; j < 13; j += 2) { x.fillRect(5, j, 1, 1); x.fillRect(11, j + 1, 1, 1); } x.fillStyle = '#5a5a66'; for (let j = 6; j < 13; j += 2) { x.fillRect(5, j, 1, 1); x.fillRect(11, j - 1, 1, 1); } x.fillRect(4, 13, 3, 2); x.fillRect(10, 13, 3, 2); });
    // 火把座（火焰每格另畫）
    t.torch = this.mk((x, px) => { face(x, px, 0); x.fillStyle = '#3a2a1a'; x.fillRect(6, 10, 4, 1); x.fillStyle = '#6a4a2a'; x.fillRect(7, 8, 2, 5); x.fillStyle = '#8a8a96'; x.fillRect(6, 7, 4, 1); });
    // ---- 門 ----
    t.door = this.mk((x, px) => { // 門框在左右兩側的牆裡（正面看）
      x.drawImage(t.cap[0], 0, 0);
      x.fillStyle = shade(P.wallHi, 0.05); x.fillRect(1, 2, 14, 14); x.fillStyle = P.faceLo; x.fillRect(2, 3, 12, 13);
      x.fillStyle = '#7a4a24'; x.fillRect(3, 4, 10, 12); x.fillStyle = '#9a6232'; for (let i = 0; i < 3; i++) x.fillRect(3 + i * 3 + 1, 4, 2, 12);
      x.fillStyle = '#5a3418'; x.fillRect(3, 4, 10, 1); x.fillStyle = '#6a6a76'; x.fillRect(3, 7, 10, 1); x.fillRect(3, 12, 10, 1); x.fillStyle = '#a8a8b4'; x.fillRect(3, 7, 2, 1); x.fillRect(3, 12, 2, 1);
      x.fillStyle = '#e0b040'; x.fillRect(10, 9, 2, 2); x.fillStyle = '#7a5a20'; x.fillRect(11, 10, 1, 1);
    });
    t.doorSide = this.mk((x, px) => { // 走廊左右向，門板側面
      x.drawImage(t.floor[0], 0, 0);
      x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(5, 1, 7, 15);
      x.fillStyle = P.face; x.fillRect(6, 0, 4, 16); x.fillStyle = '#7a4a24'; x.fillRect(7, 1, 3, 15); x.fillStyle = '#9a6232'; x.fillRect(7, 1, 1, 15);
      x.fillStyle = '#6a6a76'; x.fillRect(7, 4, 3, 1); x.fillRect(7, 11, 3, 1); x.fillStyle = '#e0b040'; x.fillRect(9, 8, 1, 2);
    });
    t.odoor = this.mk((x, px) => { x.drawImage(t.floor[1], 0, 0); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(0, 0, 16, 3); x.fillStyle = '#5a3418'; x.fillRect(0, 0, 3, 14); x.fillStyle = '#8a5a2e'; x.fillRect(1, 0, 2, 13); x.fillStyle = '#6a6a76'; x.fillRect(0, 3, 3, 1); x.fillRect(0, 9, 3, 1); });
    t.odoorSide = this.mk((x, px) => { x.drawImage(t.floor[1], 0, 0); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 0, 16, 4); x.fillStyle = '#5a3418'; x.fillRect(2, 0, 12, 3); x.fillStyle = '#8a5a2e'; x.fillRect(2, 0, 12, 2); x.fillStyle = '#6a6a76'; x.fillRect(4, 0, 1, 3); x.fillRect(11, 0, 1, 3); });
    // ---- 樓梯 ----
    t.stairs = this.mk((x, px) => {
      x.drawImage(t.floor[2], 0, 0);
      x.fillStyle = shade(P.wallHi, 0.12); x.fillRect(1, 1, 14, 14); x.fillStyle = shade(P.wallHi, -0.15); x.fillRect(2, 14, 13, 1); x.fillRect(14, 2, 1, 13);
      x.fillStyle = '#05040a'; x.fillRect(2, 2, 12, 12);
      for (let i = 0; i < 5; i++) { const w = 12 - i * 2, c = shade(P.floor, 0.18 - i * 0.2); x.fillStyle = c; x.fillRect(2 + i, 2 + i * 2.4, w, 2); x.fillStyle = shade(c, 0.2); x.fillRect(2 + i, 2 + i * 2.4, w, 1); }
    });
    // ---- 草、灰燼、冰、碎石 ----
    t.grass = [0, 1, 2].map(v => this.mk((x, px) => {
      x.drawImage(t.floor[v + 1], 0, 0);
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 10, 16, 6);
      for (let k = 0; k < 13; k++) {
        const gx = (H(k, v, 3) * 15) | 0, h = 5 + ((H(v, k, 4) * 8) | 0), c = k % 3 ? P.grass : k % 2 ? shade(P.grass, 0.28) : shade(P.grass, -0.2), lean = H(k, k, v) < 0.5 ? -1 : 1;
        for (let s = 0; s < h; s++) px(clamp(gx + (s > h * 0.6 ? lean : 0), 0, 15), 15 - s, s === h - 1 ? shade(c, 0.3) : c);
      }
      if (bi === 0 && v === 1) { px(6, 8, '#ffe070'); px(5, 9, '#ffe070'); px(7, 9, '#ffe070'); px(6, 9, '#ffb030'); }
    }));
    t.ash = this.mk((x, px) => { x.drawImage(t.floor[3], 0, 0); x.fillStyle = 'rgba(30,24,28,.55)'; x.fillRect(0, 0, 16, 16); for (let k = 0; k < 9; k++) px((H(k, 1, 7) * 15) | 0, (H(1, k, 7) * 15) | 0, k % 3 ? '#6a6470' : '#ff7a3a'); });
    t.ice = this.mk((x, px) => { for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(i, j, mix('#a8dcf2', '#7ab8dc', (i + j) / 30 + H(i, j, 77) * 0.15)); x.fillStyle = '#e8fbff'; x.fillRect(3, 4, 5, 1); x.fillRect(4, 5, 2, 1); x.fillRect(9, 10, 4, 1); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(11, 3, 1, 1); x.fillStyle = '#6aa8cc'; x.fillRect(2, 12, 6, 1); x.fillRect(7, 11, 1, 1); });
    t.rubble = this.mk((x, px) => { x.drawImage(t.floor[1], 0, 0); for (let k = 0; k < 7; k++) { const cx = (H(k, 2, 5) * 12 + 1) | 0, cy = (H(2, k, 5) * 10 + 4) | 0, w = 2 + (k % 3), c = shade(P.wallHi, (k % 3) * 0.12 - 0.05); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(cx + 1, cy + 1, w, 2); x.fillStyle = c; x.fillRect(cx, cy, w, 2); x.fillStyle = shade(c, 0.25); x.fillRect(cx, cy, w, 1); } });
    // ---- 石柱、冰晶 ----
    t.pillar = this.mk((x, px) => {
      x.drawImage(t.floor[4], 0, 0); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(3, 13, 12, 3);
      x.fillStyle = shade(P.wallHi, 0.1); x.fillRect(3, 12, 10, 3); x.fillRect(3, 1, 10, 3);
      x.fillStyle = P.face; x.fillRect(4, 4, 8, 8); x.fillStyle = shade(P.wallHi, 0.2); x.fillRect(4, 4, 2, 8); x.fillStyle = P.faceLo; x.fillRect(10, 4, 2, 8); x.fillStyle = shade(P.face, 0.08); x.fillRect(7, 4, 1, 8);
      x.fillStyle = shade(P.wallHi, 0.3); x.fillRect(3, 1, 10, 1); x.fillRect(3, 12, 10, 1);
    });
    t.crystal = this.mk((x, px) => {
      x.drawImage(t.floor[0], 0, 0); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(2, 13, 13, 3);
      const cr = (cx, h, w) => { x.fillStyle = '#3f9ad0'; x.fillRect(cx, 15 - h, w, h); x.fillStyle = '#8ae0ff'; x.fillRect(cx, 15 - h, 1, h); x.fillStyle = '#2a6aa0'; x.fillRect(cx + w - 1, 15 - h, 1, h); x.fillStyle = '#e8fbff'; x.fillRect(cx + 1, 14 - h, w - 2, 1); x.fillRect(cx, 15 - h, 1, 2); };
      cr(2, 8, 3); cr(6, 13, 4); cr(11, 7, 3);
    });
    t.bridge = this.mk((x, px) => { x.fillStyle = '#2a1410'; x.fillRect(0, 0, 16, 16); for (let j = 0; j < 16; j += 4) { x.fillStyle = '#7a4a26'; x.fillRect(0, j, 16, 3); x.fillStyle = '#9a6232'; x.fillRect(0, j, 16, 1); x.fillStyle = '#4a2a14'; x.fillRect((j * 3) % 13, j + 1, 1, 2); } x.fillStyle = '#5a5a66'; x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16); });
    t.carpet = this.mk((x, px) => { x.fillStyle = '#8a2a3a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#a83a4a'; for (let j = 0; j < 16; j += 4) for (let i = (j / 4) % 2 * 2; i < 16; i += 4) x.fillRect(i, j, 2, 2); x.fillStyle = '#6a1a2a'; for (let j = 1; j < 16; j += 4) for (let i = 1; i < 16; i += 4) x.fillRect(i, j, 1, 1); });
    // ---- 泉水（底座；水面每格另畫） ----
    t.fountain = this.mk((x, px) => {
      x.drawImage(t.floor[5], 0, 0); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(1, 13, 15, 3);
      x.fillStyle = '#6a6e80'; x.fillRect(1, 5, 14, 10); x.fillStyle = '#9aa0b4'; x.fillRect(1, 5, 14, 2); x.fillStyle = '#4a4e5e'; x.fillRect(1, 14, 14, 1);
      x.fillStyle = '#2a5a90'; x.fillRect(3, 7, 10, 6);
      x.fillStyle = '#8a90a4'; x.fillRect(7, 1, 2, 7); x.fillStyle = '#b8c0d0'; x.fillRect(6, 1, 4, 1);
    });
    t.dryfount = this.mk((x, px) => { x.drawImage(t.floor[5], 0, 0); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(1, 13, 15, 3); x.fillStyle = '#5a5e6e'; x.fillRect(1, 5, 14, 10); x.fillStyle = '#7a8090'; x.fillRect(1, 5, 14, 2); x.fillStyle = '#2a2a34'; x.fillRect(3, 7, 10, 6); x.fillStyle = '#3a3a44'; x.fillRect(4, 11, 3, 1); x.fillStyle = '#7a8090'; x.fillRect(7, 1, 2, 7); });
    // ---- 液體（動畫影格）：32×32 無縫循環材質，相鄰格子的花紋會接起來 ----
    const liquid = (f, n, cols, hi, lava) => this.mk((x, px) => {
      const p = f / n * TAU, K = TAU / 32;
      for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) {
        // 座標扭曲讓花紋像流動的液體（扭曲量本身也是 32 格循環，所以仍然無縫）
        const wi = i + 2.2 * Math.sin(j * K * 2 + p) + 1.2 * Math.sin(j * K * 5 - p * 2), wj = j + 2.2 * Math.sin(i * K * 3 - p) + 1.0 * Math.sin(i * K * 1 + p);
        let a = Math.sin(wi * K * 2 + wj * K + p) + 0.8 * Math.sin(wj * K * 3 - wi * K - p) + 0.4 * Math.sin((wi - wj) * K * 4 + p * 2) + 0.35 * Math.sin((i + 2 * j) * K * 1 - p);
        a += ((i + j) & 1) ? 0.07 : -0.07;
        px(i, j, a > 1.45 ? cols[4] : a > 0.75 ? cols[3] : a > 0.05 ? cols[2] : a > -0.85 ? cols[1] : cols[0]);
      }
      // 浪花／岩漿泡：沿著水流方向移動的小亮點（位置也循環）
      x.fillStyle = hi;
      for (let k = 0; k < 5; k++) {
        const bx = (k * 13 + f * 4) % 32, by = (k * 7 + (k % 2 ? f * 2 : 32 - f * 2)) % 32;
        if (lava) { const r = (f + k * 3) % n; if (r < 3) { x.fillRect(bx, by, 1 + (r > 0), 1 + (r > 0)); if (r === 2) { x.fillStyle = cols[0]; x.fillRect(bx, by, 1, 1); x.fillStyle = hi; } } }
        else { x.fillRect(bx, by, 3, 1); x.fillRect(bx + 1, by - 1 < 0 ? 31 : by - 1, 1, 1); }
      }
    }, 32, 32);
    const W = P.water;
    t.water = [0, 1, 2, 3, 4, 5, 6, 7].map(f => liquid(f, 8, [shade(W, -0.38), shade(W, -0.2), shade(W, -0.04), shade(W, 0.12), shade(W, 0.3)], 'rgba(225,245,255,.7)', 0));
    t.lava = [0, 1, 2, 3, 4, 5, 6, 7].map(f => liquid(f, 8, ['#4a0e06', '#a8260c', '#e8501a', '#ff8a2a', '#ffc85a'], '#fff2b0', 1));
    // 液體邊緣：依照四周哪些格子不是液體，畫出彎曲的岸邊（北岸看得到岸壁，其他三邊是岸線）
    const LE = new Map(), pal = P;
    t.liqEdge = (lava, m) => {
      const key = lava * 256 + m; let c = LE.get(key); if (c) return c;
      const pr = (i, s) => Math.round(0.9 * Math.sin(i * TAU / 16 + s) + 0.5 * Math.sin(i * TAU / 8 + s * 1.7));
      const N = m & 1, E = m & 2, S = m & 4, Wd = m & 8;
      const face = lava ? '#2a100a' : shade(pal.floor2, -0.42), faceHi = lava ? '#4a2014' : shade(pal.floor, -0.12), faceLo = lava ? '#1a0806' : shade(pal.floor2, -0.55);
      const shore = lava ? '#331410' : shade(pal.floor2, -0.18);
      const seam = lava ? '#ffe08a' : 'rgba(225,245,255,.85)', seam2 = lava ? '#ff8a2a' : 'rgba(0,0,0,.28)';
      c = this.mk((x, px) => {
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
          const dN = N ? 3 + pr(i, 1) : -9, dS = S ? 1 + pr(i, 2.3) : -9, dW = Wd ? 1 + pr(j, 4.1) : -9, dE = E ? 1 + pr(j, 5.2) : -9;
          // 和岸邊的距離（負數＝岸上）
          let d = 99;
          if (N) d = Math.min(d, j - dN); if (S) d = Math.min(d, (15 - j) - dS); if (Wd) d = Math.min(d, i - dW); if (E) d = Math.min(d, (15 - i) - dE);
          if (N && Wd) d = Math.min(d, (i - dW) + (j - dN) - 2); if (N && E) d = Math.min(d, (15 - i - dE) + (j - dN) - 2);
          if (S && Wd) d = Math.min(d, (i - dW) + (15 - j - dS) - 2); if (S && E) d = Math.min(d, (15 - i - dE) + (15 - j - dS) - 2);
          if (m & 128) d = Math.min(d, i + j - 3); if (m & 16) d = Math.min(d, (15 - i) + j - 3);
          if (m & 32) d = Math.min(d, (15 - i) + (15 - j) - 3); if (m & 64) d = Math.min(d, i + (15 - j) - 3);
          if (d >= 2) continue;
          const north = N && j < dN;
          if (d < 0) px(i, j, north ? (j === 0 ? faceHi : j >= dN - 1 ? faceLo : face) : shore);
          else if (d === 0) px(i, j, seam);
          else px(i, j, seam2);
        }
      });
      LE.set(key, c); return c;
    };
    // ---- 地面裝飾（透明底） ----
    const DECO = [
      [ // 地窖：骨頭、青苔、水窪
        (x, px) => { x.fillStyle = '#d8d0c0'; x.fillRect(4, 10, 7, 1); x.fillRect(3, 9, 2, 3); x.fillRect(10, 9, 2, 3); x.fillStyle = '#a8a090'; x.fillRect(4, 11, 7, 1); x.fillStyle = '#e8e0d0'; x.fillRect(9, 5, 4, 3); x.fillStyle = '#1a1420'; x.fillRect(10, 6, 1, 1); x.fillRect(12, 6, 1, 1); x.fillStyle = '#c8c0b0'; x.fillRect(9, 8, 4, 1); },
        (x, px) => { x.fillStyle = P.deco; for (const [a, b] of [[3, 4], [4, 3], [5, 4], [4, 5], [11, 10], [12, 9], [12, 11], [13, 10], [7, 12]]) x.fillRect(a, b, 1, 1); x.fillStyle = P.deco2; x.fillRect(4, 4, 1, 1); x.fillRect(12, 10, 1, 1); x.fillStyle = '#4a7a3a'; x.fillRect(2, 13, 3, 1); x.fillRect(10, 13, 4, 1); },
        (x, px) => { x.fillStyle = 'rgba(40,80,110,.75)'; x.fillRect(4, 7, 8, 4); x.fillRect(3, 8, 10, 2); x.fillStyle = 'rgba(140,200,240,.6)'; x.fillRect(5, 7, 3, 1); x.fillRect(10, 9, 1, 1); },
      ],
      [ // 洞窟：發光蘑菇
        (x, px) => { const m = (cx, cy, c) => { x.fillStyle = '#e8dcc0'; x.fillRect(cx + 1, cy + 2, 1, 3); x.fillStyle = c; x.fillRect(cx, cy, 3, 2); x.fillRect(cx - 1, cy + 1, 5, 1); x.fillStyle = shade(c, 0.5); x.fillRect(cx, cy, 1, 1); }; m(5, 6, P.deco); m(10, 9, P.deco); m(4, 11, P.deco); },
        (x, px) => { const m = (cx, cy, c) => { x.fillStyle = '#e8dcc0'; x.fillRect(cx + 1, cy + 2, 1, 2); x.fillStyle = c; x.fillRect(cx, cy, 3, 2); x.fillStyle = '#ffffff'; x.fillRect(cx, cy, 1, 1); }; m(7, 7, P.deco2); m(11, 11, P.deco2); },
        (x, px) => { x.fillStyle = shade(P.floor, 0.25); for (const [a, b] of [[3, 5], [9, 4], [12, 11], [6, 12]]) { x.fillRect(a, b, 2, 1); } x.fillStyle = shade(P.floor, -0.3); for (const [a, b] of [[3, 6], [9, 5], [12, 12], [6, 13]]) x.fillRect(a, b, 2, 1); x.fillStyle = P.deco; x.fillRect(8, 8, 1, 1); },
      ],
      [ // 熔爐：裂縫、礦渣、鍊條
        (x, px) => { x.fillStyle = '#1a0a08'; let cx = 3; for (let j = 3; j < 14; j++) { x.fillRect(cx, j, 2, 1); if (j % 3 === 0) cx += 2; } x.fillStyle = '#ff6a2a'; cx = 3; for (let j = 3; j < 14; j++) { x.fillRect(cx, j, 1, 1); if (j % 3 === 0) cx += 2; } },
        (x, px) => { for (const [a, b, w] of [[4, 9, 4], [8, 7, 3], [9, 10, 4]]) { x.fillStyle = '#2a2020'; x.fillRect(a, b + 1, w, 2); x.fillStyle = '#4a3a3a'; x.fillRect(a, b, w, 2); x.fillStyle = '#ff9a3a'; x.fillRect(a + 1, b, 1, 1); } },
        (x, px) => { x.fillStyle = '#5a5a66'; for (let i = 2; i < 14; i += 2) x.fillRect(i, 8 + (i % 4 ? 1 : 0), 1, 1); x.fillStyle = '#8a8a96'; for (let i = 3; i < 14; i += 2) x.fillRect(i, 8 + (i % 4 === 1 ? 0 : 1), 1, 1); },
      ],
      [ // 神殿：冰晶、碎陶
        (x, px) => { x.fillStyle = P.deco; x.fillRect(5, 6, 1, 5); x.fillRect(7, 8, 1, 3); x.fillRect(9, 7, 1, 4); x.fillStyle = P.deco2; x.fillRect(5, 6, 1, 1); x.fillRect(9, 7, 1, 1); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(5, 11, 6, 1); },
        (x, px) => { x.fillStyle = '#c8a878'; x.fillRect(4, 9, 3, 2); x.fillRect(9, 10, 2, 2); x.fillRect(7, 6, 2, 1); x.fillStyle = '#8a6a48'; x.fillRect(4, 11, 3, 1); x.fillRect(9, 12, 2, 1); },
        (x, px) => { x.fillStyle = 'rgba(232,251,255,.6)'; for (const [a, b] of [[3, 3], [12, 5], [7, 11], [10, 13], [4, 9]]) { x.fillRect(a, b, 1, 1); } x.fillStyle = 'rgba(200,240,255,.35)'; x.fillRect(5, 6, 6, 4); },
      ],
      [ // 王座：符文、骨頭
        (x, px) => { x.fillStyle = P.deco; x.fillRect(4, 8, 8, 1); x.fillRect(7, 5, 1, 7); x.fillRect(5, 6, 1, 1); x.fillRect(10, 10, 1, 1); },
        (x, px) => { x.fillStyle = '#c8c0d0'; x.fillRect(4, 10, 7, 1); x.fillRect(3, 9, 2, 3); x.fillRect(10, 9, 2, 3); },
        (x, px) => { x.fillStyle = P.deco2; x.fillRect(6, 6, 4, 4); x.fillStyle = '#2a1428'; x.fillRect(7, 7, 2, 2); },
      ],
      [ // 古城：貝殼、水草、發光的海葵
        (x, px) => { x.fillStyle = '#e8d8c8'; x.fillRect(5, 9, 5, 3); x.fillRect(6, 8, 3, 1); x.fillStyle = '#b8a090'; for (let i = 5; i < 10; i += 2) x.fillRect(i, 9, 1, 3); x.fillStyle = '#f8f0e8'; x.fillRect(11, 11, 2, 2); },
        (x, px) => { x.fillStyle = P.deco; x.fillRect(6, 10, 1, 3); x.fillRect(8, 9, 1, 4); x.fillRect(10, 10, 1, 3); x.fillStyle = P.deco2; x.fillRect(6, 9, 1, 1); x.fillRect(8, 8, 1, 1); x.fillRect(10, 9, 1, 1); x.fillStyle = '#2a4446'; x.fillRect(5, 13, 7, 1); },
        (x, px) => { x.fillStyle = '#2f6a4a'; for (const [a, b, h] of [[4, 13, 6], [6, 13, 8], [11, 13, 5]]) { x.fillRect(a, b - h, 1, h); x.fillRect(a + 1, b - h + 2, 1, h - 3); } x.fillStyle = '#4f9a6a'; x.fillRect(6, 5, 1, 2); },
      ],
      [ // 虛空：星屑、隕石碎片、法陣
        (x, px) => { x.fillStyle = P.deco; x.fillRect(7, 7, 1, 1); x.fillRect(4, 11, 1, 1); x.fillRect(11, 5, 1, 1); x.fillStyle = 'rgba(255,230,160,.45)'; x.fillRect(6, 7, 3, 1); x.fillRect(7, 6, 1, 3); },
        (x, px) => { for (const [a, b, w] of [[4, 9, 3], [9, 11, 4], [7, 5, 2]]) { x.fillStyle = '#2a2640'; x.fillRect(a, b + 1, w, 2); x.fillStyle = '#5a5480'; x.fillRect(a, b, w, 2); x.fillStyle = P.deco2; x.fillRect(a, b, 1, 1); } },
        (x, px) => { x.fillStyle = 'rgba(154,184,255,.4)'; x.fillRect(4, 4, 8, 1); x.fillRect(4, 11, 8, 1); x.fillRect(4, 4, 1, 8); x.fillRect(11, 4, 1, 8); x.fillStyle = 'rgba(255,217,138,.6)'; x.fillRect(7, 7, 2, 2); },
      ],
      [ // 終焉：發光裂縫、碎骨
        (x, px) => { x.fillStyle = '#1a0a10'; let cx = 4; for (let j = 3; j < 14; j++) { x.fillRect(cx, j, 2, 1); if (j % 3 === 0) cx += 2; } x.fillStyle = P.deco; cx = 4; for (let j = 3; j < 14; j++) { x.fillRect(cx, j, 1, 1); if (j % 3 === 0) cx += 2; } },
        (x, px) => { x.fillStyle = '#c8b8c0'; x.fillRect(4, 10, 7, 1); x.fillRect(3, 9, 2, 3); x.fillRect(10, 9, 2, 3); },
        (x, px) => { x.fillStyle = P.deco2; x.fillRect(6, 6, 4, 4); x.fillStyle = '#2a0a14'; x.fillRect(7, 7, 2, 2); },
      ],
    ];
    t.deco = DECO[bi].map(fn => this.mk(fn));
    t.web = this.mk((x, px) => { x.fillStyle = 'rgba(220,220,235,.55)'; for (let i = 0; i < 9; i++) { px(i, 0, 'rgba(220,220,235,.5)'); px(0, i, 'rgba(220,220,235,.5)'); px(i, i, 'rgba(220,220,235,.6)'); } for (let i = 0; i < 6; i++) { px(i, 5 - i, 'rgba(220,220,235,.45)'); px(i + 1, 8 - i, 'rgba(220,220,235,.35)'); } px(2, 0, '#fff'); });
    // ---- 陷阱 ----
    t.trap = {};
    for (const k in TRAPS) t.trap[k] = this.mk((x, px) => {
      const c = TRAPS[k].col;
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(2, 3, 12, 11); x.fillStyle = shade(P.floor, -0.25); x.fillRect(3, 4, 10, 9); x.fillStyle = shade(P.floor, 0.18); x.fillRect(3, 4, 10, 1);
      x.fillStyle = c;
      if (k === 'spike') { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { x.fillRect(4 + i * 3, 6 + j * 3, 2, 1); x.fillStyle = '#ffffff'; x.fillRect(4 + i * 3, 5 + j * 3, 1, 1); x.fillStyle = c; } }
      else if (k === 'pit') { x.fillStyle = '#05040a'; x.fillRect(3, 5, 10, 7); x.fillStyle = c; x.fillRect(3, 4, 10, 1); }
      else { x.fillRect(4, 5, 8, 1); x.fillRect(4, 11, 8, 1); x.fillRect(4, 5, 1, 7); x.fillRect(11, 5, 1, 7); x.fillRect(7, 7, 2, 2); x.fillStyle = shade(c, 0.4); x.fillRect(6, 6, 1, 1); x.fillRect(9, 9, 1, 1); }
    });
    this.t = t;
    return t;
  },
};

// ---------- 整層樓的地形快取 ----------
const Terr = {
  F: null, c: null, x: null, sig: null,
  solid(v) { return v === T.WALL || v === T.SECRET; },
  reset(F) {
    this.F = F;
    if (!this.c) { this.c = document.createElement('canvas'); }
    this.c.width = F.w * 16; this.c.height = F.h * 16;
    this.x = this.c.getContext('2d'); this.x.imageSmoothingEnabled = false;
    this.sig = new Int32Array(F.w * F.h).fill(-1);
    TEX.build(F.biome);
  },
  get(F, x, y) { return x < 0 || y < 0 || x >= F.w || y >= F.h ? T.WALL : F.t[y * F.w + x]; },
  seen(F, x, y) { return x >= 0 && y >= 0 && x < F.w && y < F.h && F.seen[y * F.w + x]; },
  sigOf(F, x, y) {
    const v = F.t[y * F.w + x];
    let m = 0;
    if (this.solid(v)) {
      // 牆：記下哪些相鄰格是看得到的空地（決定要不要畫牆面、牆頂邊緣）
      for (let i = 0; i < 8; i++) { const [dx, dy] = DIRS8[i], n = this.get(F, x + dx, y + dy); if (!this.solid(n) && this.seen(F, x + dx, y + dy)) m |= 1 << i; }
      return v | (m << 5);
    }
    for (let i = 0; i < 8; i++) { const [dx, dy] = DIRS8[i]; if (this.solid(this.get(F, x + dx, y + dy))) m |= 1 << i; }
    let s = 0;
    for (let i = 0; i < 4; i++) { const [dx, dy] = DIRS4[i]; if (this.get(F, x + dx, y + dy) === v) s |= 1 << i; }
    return v | (m << 5) | (s << 13);
  },
  update(F, x0, y0, x1, y1) {
    if (this.F !== F || !this.c) this.reset(F);
    for (let y = Math.max(0, y0); y <= Math.min(F.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(F.w - 1, x1); x++) {
      const k = y * F.w + x; if (!F.seen[k]) continue;
      const s = this.sigOf(F, x, y);
      if (s !== this.sig[k]) { this.sig[k] = s; this.paint(F, x, y, s); }
    }
  },
  paint(F, x, y, s) {
    const X = x * 16, Y = y * 16, c = this.x, t = TEX.t, v = F.t[y * F.w + x], bi = F.biome;
    c.clearRect(X, Y, 16, 16);
    const h = (k) => hash2(x, y, k);
    const fl = () => c.drawImage(t.floor[(h(1) * t.floor.length) | 0], X, Y);
    if (this.solid(v)) {
      const m = s >> 5, open = i => (m >> i) & 1;   // DIRS8：0 上 1 右上 2 右 3 右下 4 下 5 左下 6 左 7 左上
      if (open(4)) {
        const fv = h(3); let img = t.face[fv < 0.6 ? 0 : fv < 0.8 ? 1 : fv < 0.9 ? 3 : 2];
        if (F.torches.length && Render.isTorch(F, x, y)) img = t.torch;
        else if (bi !== 1 && bi !== 2 && h(8) < 0.06) img = t.banner;
        else if (bi === 2 && h(8) < 0.04) img = t.chain;
        c.drawImage(img, X, Y);
        // 牆面兩端：轉角的陰影與邊線
        const L = this.get(F, x - 1, y), R = this.get(F, x + 1, y);
        if (!this.solid(L)) { c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(X, Y + 4, 1, 12); c.fillStyle = BIOMES[bi].pal.wallHi; c.fillRect(X, Y, 1, 4); }
        if (!this.solid(R)) { c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(X + 15, Y + 4, 1, 12); c.fillStyle = BIOMES[bi].pal.wallHi; c.fillRect(X + 15, Y, 1, 4); }
        if (open(0)) { c.fillStyle = shade(BIOMES[bi].pal.wallHi, 0.2); c.fillRect(X, Y, 16, 1); }
      } else {
        c.drawImage(t.cap[(h(5) * 3) | 0], X, Y);
        const hi = shade(BIOMES[bi].pal.wallHi, 0.15), lo = shade(BIOMES[bi].pal.wall, -0.3);
        c.fillStyle = hi;
        if (open(0)) c.fillRect(X, Y, 16, 1);
        if (open(6)) c.fillRect(X, Y, 1, 16);
        if (open(2)) c.fillRect(X + 15, Y, 1, 16);
        c.fillStyle = lo;
        if (open(0)) c.fillRect(X, Y + 1, 16, 1);
        if (open(6)) c.fillRect(X + 1, Y, 1, 16);
        if (open(2)) c.fillRect(X + 14, Y, 1, 16);
        c.fillStyle = hi;
        if (open(7) && !open(0) && !open(6)) c.fillRect(X, Y, 1, 1);
        if (open(1) && !open(0) && !open(2)) c.fillRect(X + 15, Y, 1, 1);
        if (open(5) && !open(6)) c.fillRect(X, Y + 15, 1, 1);
        if (open(3) && !open(2)) c.fillRect(X + 15, Y + 15, 1, 1);
      }
      return;
    }
    switch (v) {
      case T.DOOR: { const sideways = this.solid(this.get(F, x, y - 1)) && this.solid(this.get(F, x, y + 1)); c.drawImage(sideways ? t.doorSide : t.door, X, Y); break; }
      case T.ODOOR: { const sideways = this.solid(this.get(F, x, y - 1)) && this.solid(this.get(F, x, y + 1)); c.drawImage(sideways ? t.odoorSide : t.odoor, X, Y); break; }
      case T.STAIRS: c.drawImage(t.stairs, X, Y); break;
      case T.GRASS: c.drawImage(t.grass[(h(2) * 3) | 0], X, Y); break;
      case T.ASH: c.drawImage(t.ash, X, Y); break;
      case T.ICE: c.drawImage(t.ice, X, Y); break;
      case T.RUBBLE: c.drawImage(t.rubble, X, Y); break;
      case T.PILLAR: c.drawImage(t.pillar, X, Y); break;
      case T.CRYSTAL: c.drawImage(t.crystal, X, Y); break;
      case T.BRIDGE: c.drawImage(t.bridge, X, Y); break;
      case T.FOUNTAIN: c.drawImage(t.fountain, X, Y); break;
      case T.DRYFOUNT: c.drawImage(t.dryfount, X, Y); break;
      case T.CARPET: {
        c.drawImage(t.carpet, X, Y);
        const sm = s >> 13; c.fillStyle = '#e0b040';
        if (!(sm & 1)) c.fillRect(X, Y, 16, 2); if (!(sm & 2)) c.fillRect(X + 14, Y, 2, 16); if (!(sm & 4)) c.fillRect(X, Y + 14, 16, 2); if (!(sm & 8)) c.fillRect(X, Y, 2, 16);
        c.fillStyle = '#7a5a10';
        if (!(sm & 1)) c.fillRect(X, Y + 2, 16, 1); if (!(sm & 4)) c.fillRect(X, Y + 13, 16, 1);
        break;
      }
      case T.WATER: case T.LAVA: case T.DEEP: break; // 每格動畫，另外畫
      case T.CHASM: { // 虛空裂谷：星空＋上方的斷崖
        c.fillStyle = '#04030a'; c.fillRect(X, Y, 16, 16);
        for (let k = 0; k < 3; k++) { const sx = (hash2(x * 3 + k, y, 51) * 16) | 0, sy = (hash2(x, y * 3 + k, 52) * 16) | 0, b = hash2(x, y, 53 + k); if (b < 0.55) { c.fillStyle = b < 0.12 ? '#ffe8a0' : b < 0.3 ? '#9ab8ff' : 'rgba(255,255,255,.55)'; c.fillRect(X + sx, Y + sy, 1, 1); } }
        if (hash2(x, y, 57) < 0.05) { c.fillStyle = 'rgba(160,140,255,.5)'; const sx = X + 5 + ((hash2(x, y, 58) * 6) | 0), sy = Y + 5 + ((hash2(x, y, 59) * 6) | 0); c.fillRect(sx - 1, sy, 3, 1); c.fillRect(sx, sy - 1, 1, 3); c.fillStyle = '#ffffff'; c.fillRect(sx, sy, 1, 1); }
        const nb = (xx, yy) => xx < 0 || yy < 0 || xx >= F.w || yy >= F.h ? T.CHASM : F.t[yy * F.w + xx];
        const up = nb(x, y - 1), lf = nb(x - 1, y), rt = nb(x + 1, y), dn = nb(x, y + 1);
        const solidUp = up !== T.CHASM && up !== T.BRIDGE;
        if (solidUp) { const pal = BIOMES[bi].pal; for (let j = 0; j < 7; j++) { c.fillStyle = shade(pal.floor2, -0.35 - j * 0.07); c.fillRect(X, Y + j, 16, 1); } c.fillStyle = shade(pal.floor, -0.15); c.fillRect(X, Y, 16, 1); c.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 1; i < 16; i += 5) c.fillRect(X + i + (y % 3), Y + 2, 1, 4 + (i % 3)); c.fillStyle = 'rgba(4,3,10,.6)'; c.fillRect(X, Y + 7, 16, 2); }
        c.fillStyle = shade(BIOMES[bi].pal.floor2, -0.25);
        if (lf !== T.CHASM && lf !== T.BRIDGE) c.fillRect(X, Y, 1, 16);
        if (rt !== T.CHASM && rt !== T.BRIDGE) c.fillRect(X + 15, Y, 1, 16);
        if (dn !== T.CHASM && dn !== T.BRIDGE) { c.fillRect(X, Y + 15, 16, 1); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(X, Y + 14, 16, 1); }
        return;
      }
      default: fl();
        if (v === T.FLOOR || v === T.ALTAR || v === T.CHEST) {
          const d = F.deco[y * F.w + x];
          if (d && v === T.FLOOR) c.drawImage(t.deco[(d === 1 && hash2(x, y, 41) < 0.55 ? 1 : d - 1) % t.deco.length], X, Y);
        }
    }
    // 牆邊陰影（環境光遮蔽）
    if (v !== T.WATER && v !== T.LAVA && v !== T.PILLAR && v !== T.DEEP) {
      const m = (s >> 5) & 255, wall = i => (m >> i) & 1;
      if (wall(0)) { for (let j = 0; j < 6; j++) { c.fillStyle = 'rgba(0,0,0,' + (0.42 - j * 0.07) + ')'; c.fillRect(X, Y + j, 16, 1); } }
      if (wall(6)) { c.fillStyle = 'rgba(0,0,0,.24)'; c.fillRect(X, Y, 2, 16); c.fillStyle = 'rgba(0,0,0,.1)'; c.fillRect(X + 2, Y, 2, 16); }
      if (wall(2)) { c.fillStyle = 'rgba(0,0,0,.16)'; c.fillRect(X + 14, Y, 2, 16); }
      if (wall(7) && !wall(0) && !wall(6)) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(X, Y, 3, 4); }
      if (wall(1) && !wall(0) && !wall(2)) { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(X + 13, Y, 3, 4); }
      if (v === T.FLOOR && wall(0) && wall(6) && (bi === 0 || bi === 3 || bi === 4) && hash2(x, y, 99) < 0.35) c.drawImage(t.web, X, Y);
    }
  },
};
