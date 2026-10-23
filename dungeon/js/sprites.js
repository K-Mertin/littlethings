'use strict';
// 深淵地牢：程式繪製的角色與怪物像素圖（多影格：待機、走路、攻擊；主角會換上身上的裝備）
// 每張圖都是小畫布，最後自動加上受光、陰影與外框；用 (ax, ay) 當腳底的錨點。

const Pix = {
  mk(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    const P = {
      c, x, w, h, ox: 0, oy: 0,
      p(px, py, col) { x.fillStyle = col; x.fillRect(Math.round(px + P.ox), Math.round(py + P.oy), 1, 1); },
      r(px, py, ww, hh, col) { if (ww <= 0 || hh <= 0) return; x.fillStyle = col; x.fillRect(Math.round(px + P.ox), Math.round(py + P.oy), Math.round(ww), Math.round(hh)); },
      e(cx, cy, rx, ry, col) {
        x.fillStyle = col; cx += P.ox; cy += P.oy;
        for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) {
          const dy = (j + 0.5 - cy) / ry; if (Math.abs(dy) >= 1) continue;
          const hw = rx * Math.sqrt(1 - dy * dy), a = Math.round(cx - hw), b = Math.round(cx + hw);
          if (b > a) x.fillRect(a, j, b - a, 1);
        }
      },
      l(x0, y0, x1, y1, col, w = 1) {
        x.fillStyle = col;
        x0 = Math.round(x0 + P.ox); y0 = Math.round(y0 + P.oy); x1 = Math.round(x1 + P.ox); y1 = Math.round(y1 + P.oy);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy, X = x0, Y = y0;
        const o = (w - 1) >> 1;
        for (let i = 0; i < 99; i++) { x.fillRect(X - o, Y - o, w, w); if (X === x1 && Y === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; X += sx; } if (e2 <= dx) { err += dx; Y += sy; } }
      },
      // 多邊形（以掃描線填滿），座標為整數像素
      poly(pts, col) {
        x.fillStyle = col; const ys = pts.map(p => p[1]); const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
        for (let y = y0; y <= y1; y++) {
          const xs = []; const yy = y + 0.5;
          for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + (yy - ay) / (by - ay) * (bx - ax)); }
          xs.sort((a, b) => a - b);
          for (let i = 0; i + 1 < xs.length; i += 2) { const a = Math.round(xs[i]), b = Math.round(xs[i + 1]); if (b > a) x.fillRect(a + P.ox, y + P.oy, b - a, 1); }
        }
      },
    };
    return P;
  },
  // 受光（左上）、陰影（右下）與帶顏色的深色外框
  finish(P, o = {}) {
    const { c, w, h } = P, x = c.getContext('2d');
    const id = x.getImageData(0, 0, w, h), d = id.data, A = i => d[i * 4 + 3];
    const op = (px, py) => px >= 0 && py >= 0 && px < w && py < h && d[(py * w + px) * 4 + 3] > 0;
    const src = new Uint8ClampedArray(d);
    if (!o.flat) for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const i = py * w + px; if (!A(i) || src[i * 4 + 3] < 200) continue;
      let k = 0;
      if (!op(px, py - 1)) k += 0.2; else if (!op(px, py - 2)) k += 0.07;
      if (!op(px - 1, py)) k += 0.08;
      if (!op(px, py + 1)) k -= 0.22; else if (!op(px, py + 2)) k -= 0.08;
      if (!op(px + 1, py)) k -= 0.1;
      if (!k) continue;
      for (let ch = 0; ch < 3; ch++) { const v = src[i * 4 + ch]; d[i * 4 + ch] = k > 0 ? v + (255 - v) * k : v * (1 + k); }
    }
    if (!o.noOutline) {
      const out = [];
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        const i = py * w + px; if (src[i * 4 + 3]) continue;
        let n = -1;
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const qx = px + dx, qy = py + dy; if (qx >= 0 && qy >= 0 && qx < w && qy < h && src[(qy * w + qx) * 4 + 3] > 120) { n = qy * w + qx; break; } }
        if (n >= 0) out.push(i, n);
      }
      for (let j = 0; j < out.length; j += 2) {
        const i = out[j], n = out[j + 1];
        d[i * 4] = src[n * 4] * 0.22 + 10; d[i * 4 + 1] = src[n * 4 + 1] * 0.2 + 7; d[i * 4 + 2] = src[n * 4 + 2] * 0.24 + 16; d[i * 4 + 3] = 245;
      }
    }
    x.putImageData(id, 0, 0);
    const wc = document.createElement('canvas'); wc.width = w; wc.height = h;
    const wx = wc.getContext('2d'); wx.drawImage(c, 0, 0); wx.globalCompositeOperation = 'source-in'; wx.fillStyle = '#fff'; wx.fillRect(0, 0, w, h);
    let top = h; for (let py = 0; py < h && top === h; py++) for (let px = 0; px < w; px++) if (d[(py * w + px) * 4 + 3]) { top = py; break; }
    return { c, w: wc, top, ax: o.ax != null ? o.ax : w >> 1, ay: o.ay != null ? o.ay : h - 2, sw: o.sw || 0.32, fly: o.fly || 0 };
  },
};

// ---------- 武器（從手的位置往 ang 方向畫） ----------
const WPN_COL = { blade: '#e4eaf2', bladeD: '#8f9bb0', gold: '#e8b84a', wood: '#8a5a30', woodD: '#5a3a1e', iron: '#9aa2b0', ironD: '#5a6070' };
function drawWeapon(P, kind, hx, hy, ang, o = {}) {
  if (!kind || kind === 'fist') return;
  const dx = Math.cos(ang), dy = Math.sin(ang), qx = -dy, qy = dx;
  const at = (a, b = 0) => [hx + dx * a + qx * b, hy + dy * a + qy * b];
  const L = (a0, a1, col, w = 1, b = 0) => { const [x0, y0] = at(a0, b), [x1, y1] = at(a1, b); P.l(x0, y0, x1, y1, col, w); };
  const C = Object.assign({}, WPN_COL, o.pal || {});
  switch (kind) {
    case 'sword': case 'rapier': case 'dagger': case 'greatsword': {
      const len = kind === 'dagger' ? 5 : kind === 'greatsword' ? 12 : kind === 'rapier' ? 11 : 9;
      if (kind === 'greatsword') { L(2, len, C.bladeD, 1, 1); L(2, len, C.blade, 1, 0); L(2, len - 1, C.blade, 1, -1); }
      else { L(2, len, C.bladeD, 1, 0.6); L(2, len, C.blade, 1, 0); }
      const [tx, ty] = at(len + 0.6); P.p(tx, ty, '#ffffff');
      const g = kind === 'greatsword' ? 3 : kind === 'rapier' ? 1 : 2;
      for (let b = -g; b <= g; b++) { const [x, y] = at(1, b); P.p(x, y, kind === 'greatsword' ? '#c04a4a' : C.gold); }
      if (kind === 'rapier') { const [x, y] = at(0.5, 0); P.e(x, y, 1.3, 1.3, C.gold); }
      L(-1, 0, C.woodD); const [px, py] = at(-1.6); P.p(px, py, C.gold);
      break;
    }
    case 'spear': { L(-5, 8, C.wood); L(-5, 8, C.woodD, 1, 0.7); L(9, 11, C.blade, 1); L(9, 10, C.bladeD, 1, 0.8); L(9, 10, C.bladeD, 1, -0.8); const [x, y] = at(12); P.p(x, y, '#fff'); const [rx, ry] = at(8); P.p(rx, ry, '#c84a3a'); break; }
    case 'axe': {
      L(-2, 8, C.wood); L(-2, 8, C.woodD, 1, 0.7);
      for (let a = 5; a <= 8; a++) for (let b = 1; b <= 4; b++) { if (b === 4 && (a === 5 || a === 8)) continue; const [x, y] = at(a, b); P.p(x, y, b >= 3 ? C.blade : C.iron); }
      for (let a = 6; a <= 7; a++) { const [x, y] = at(a, -1); P.p(x, y, C.ironD); }
      break;
    }
    case 'scythe': {
      L(-4, 10, C.woodD); L(-4, 10, C.wood, 1, 0.6);
      const pts = [[10, 0], [10, 1], [9.5, 2], [9, 3], [8, 4], [7, 5], [5.5, 5.5], [4, 6]];
      for (let i = 0; i < pts.length; i++) { const [x, y] = at(pts[i][0], pts[i][1]); P.p(x, y, i > 5 ? '#ffffff' : C.blade); const [x2, y2] = at(pts[i][0] + 0.8, pts[i][1] - 0.6); if (i < 6) P.p(x2, y2, C.bladeD); }
      break;
    }
    case 'mace': case 'warhammer': {
      L(-1, 6, C.wood); L(-1, 6, C.woodD, 1, 0.6);
      if (kind === 'mace') { const [x, y] = at(7.5); P.e(x, y, 2, 2, C.iron); P.p(x - 0.5, y - 1.5, '#e8eef6'); for (const [a, b] of [[10, 0], [7.5, 2.6], [7.5, -2.6]]) { const [sx, sy] = at(a, b); P.p(sx, sy, C.ironD); } }
      else { for (let a = 6; a <= 9; a++) for (let b = -3; b <= 3; b++) { const [x, y] = at(a, b); P.p(x, y, a === 6 || b === -3 ? '#d8dee8' : a === 9 || b === 3 ? C.ironD : C.iron); } const [gx, gy] = at(7.5, 0); P.p(gx, gy, '#ffd75a'); }
      break;
    }
    case 'staff': {
      L(-6, 6, C.wood); L(-6, 6, C.woodD, 1, 0.6);
      const [x, y] = at(7.6); const oc = o.orb || '#7fe8ff';
      P.e(x, y, 1.8, 1.8, oc); P.p(x - 0.6, y - 0.6, '#ffffff');
      const [c1x, c1y] = at(6, 1.4), [c2x, c2y] = at(6, -1.4); P.p(c1x, c1y, C.gold); P.p(c2x, c2y, C.gold);
      break;
    }
    case 'bow': {
      for (let b = -6; b <= 6; b++) { const a = 2.2 - b * b / 14; const [x, y] = at(a, b); P.p(x, y, C.wood); }
      const [s0x, s0y] = at(-0.4, -6), [s1x, s1y] = at(-0.4, 6); P.l(s0x, s0y, s1x, s1y, '#e8e0d0');
      break;
    }
    case 'knife': { L(1, 4, C.blade); L(-1, 0, C.woodD); break; }
    case 'club': { L(-1, 7, C.wood, 2); const [x, y] = at(7); P.e(x, y, 1.6, 1.6, C.woodD); break; }
    case 'orb': { const [x, y] = at(1.5); P.e(x, y, 2.2, 2.2, o.orb || '#ff9a3a'); P.e(x - 0.4, y - 0.4, 1.1, 1.1, '#fff4c0'); break; }
  }
}

// ---------- 主角 ----------
const HERO_LOOK = {
  warrior: { skin: '#f0c49a', cloth: '#c8402e', clothD: '#86261e', pants: '#4a3a52', boot: '#5a3a22', hair: '#7a4a22' },
  rogue: { skin: '#e8bc92', cloth: '#3f7a3a', clothD: '#25502a', pants: '#3a3442', boot: '#3a2a22', hair: '#2a2a2a' },
  mage: { skin: '#f0c8a0', cloth: '#3b5bc8', clothD: '#25358a', pants: '#2c2a4a', boot: '#3a2a40', hair: '#e8e4dc' },
  ranger: { skin: '#e8b88a', cloth: '#4f8a3a', clothD: '#2f5a26', pants: '#5a4430', boot: '#5a3a22', hair: '#a8642a' },
  paladin: { skin: '#f0c49a', cloth: '#e8e2cc', clothD: '#a8a08a', pants: '#6a7080', boot: '#6a7080', hair: '#d8a040' },
};
const ARMOR_LOOK = { cloth: 'cloth', robe: 'robe', leather: 'leather', scale: 'scale', chain: 'chain', plate: 'plate', cloak: 'cloak', dragon: 'scale' };

function drawHero(P, cls, armK, armTint, wpnK, f) {
  const H = HERO_LOOK[cls] || HERO_LOOK.warrior;
  const br = f.fr === 'idle' && f.i ? 1 : 0, step = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, atk = f.fr === 'atk' ? f.i + 1 : 0;
  const ux = atk === 2 ? 1 : atk === 1 ? -1 : 0, uy = br;
  const kind = ARMOR_LOOK[armK] || 'none';
  const tint = armTint || H.cloth, tintD = shade(tint, -0.35), tintL = shade(tint, 0.25);
  const metal = kind === 'chain' || kind === 'plate';
  const body = kind === 'none' || kind === 'cloth' ? H.cloth : tint, bodyD = kind === 'none' || kind === 'cloth' ? H.clothD : tintD;
  const sleeve = metal || kind === 'scale' ? tint : H.cloth;
  const pants = metal ? shade(tint, -0.25) : H.pants, boot = kind === 'plate' ? shade(tint, -0.1) : H.boot;
  // 背後：披風、箭袋、盾
  if (cls === 'paladin') { P.poly([[7 + ux, 11 + uy], [11 + ux, 11 + uy], [10, 21], [5 - (step ? 1 : 0), 21]], '#3a5ac8'); P.l(6, 20, 9, 20, '#e8c050'); }
  if (kind === 'cloak') P.poly([[7 + ux, 10 + uy], [12 + ux, 10 + uy], [11, 21], [5 - (step ? 1 : 0), 20]], tintD);
  if (cls === 'ranger') { P.r(5 + ux, 9 + uy, 3, 8, '#7a4a26'); P.r(5 + ux, 9 + uy, 3, 1, '#a8703a'); P.p(5 + ux, 7 + uy, '#e8e0d0'); P.p(6 + ux, 6 + uy, '#e8e0d0'); P.p(7 + ux, 7 + uy, '#d8443a'); P.p(5 + ux, 8 + uy, '#d8443a'); P.p(7 + ux, 8 + uy, '#e8e0d0'); }
  // 後手
  P.r(8 + ux, 12 + uy, 2, 4, shade(sleeve, -0.3)); P.r(8 + ux, 16 + uy, 2, 1, shade(H.skin, -0.25));
  if (cls === 'paladin') { P.e(7 + ux, 15 + uy, 3.4, 4.2, '#3a62d0'); P.e(7 + ux, 15 + uy, 2.4, 3.2, '#2a48a8'); P.r(6.5 + ux, 12.5 + uy, 1, 5, '#f0c850'); P.r(5 + ux, 14 + uy, 4, 1, '#f0c850'); }
  // 腿
  const legs = (x, lift, col, bcol) => { P.r(x, 17 - lift, 2, 3, col); P.r(x, 20 - lift, 3, 2, bcol); P.p(x + 2, 20 - lift, shade(bcol, 0.2)); };
  const bl = step === 1 ? 1 : 0, fl = step === -1 ? 1 : 0;
  legs(9 - step, bl, shade(pants, -0.25), shade(boot, -0.25));
  legs(12 + step, fl, pants, boot);
  // 身體
  if (kind === 'robe') {
    P.poly([[8 + ux, 11 + uy], [16 + ux, 11 + uy], [17, 20], [7, 20]], tint);
    P.r(7, 19, 11, 1, tintD); P.r(11 + ux, 12 + uy, 1, 8 - uy, '#e8c050'); P.r(7, 20, 11, 1, '#e8c050');
  } else {
    P.r(8 + ux, 11 + uy, 8, 6 - uy, body);
    P.r(9 + ux, 17, 6, 1, pants);
    P.r(8 + ux, 16, 8, 1, cls === 'paladin' ? '#e8c050' : '#4a2e1a'); P.p(12 + ux, 16, '#e8c050');
    if (kind === 'leather') { P.l(9 + ux, 12 + uy, 14 + ux, 15, tintD); P.r(8 + ux, 11 + uy, 8, 1, tintL); }
    if (kind === 'scale') for (let yy = 12 + uy; yy < 16; yy++) for (let xx = 8 + ux + (yy % 2); xx < 16 + ux; xx += 2) P.p(xx, yy, tintD);
    if (kind === 'chain') for (let yy = 11 + uy; yy < 16; yy++) for (let xx = 8 + ux + (yy % 2); xx < 16 + ux; xx += 2) P.p(xx, yy, tintL);
    if (kind === 'plate') { P.r(10 + ux, 12 + uy, 1, 4 - uy, tintL); P.r(13 + ux, 12 + uy, 1, 3 - uy, tintD); P.r(8 + ux, 15, 8, 1, tintD); }
    if (kind === 'cloth' || kind === 'none') { P.r(11 + ux, 11 + uy, 3, 1, H.clothD); }
    if (cls === 'paladin' && !metal) { P.r(11 + ux, 12 + uy, 2, 3, '#e8c050'); }
    if (cls === 'paladin') { P.r(10.5 + ux, 12 + uy, 1, 3, '#d8443a'); P.r(9.5 + ux, 13 + uy, 3, 1, '#d8443a'); }
  }
  if (kind === 'cloak') { P.r(8 + ux, 11 + uy, 8, 2, tintD); P.r(14 + ux, 12 + uy, 2, 5, tintD); }
  // 頭
  const hx = 9 + ux, hy = 4 + uy;
  P.e(hx + 3.5, hy + 3.6, 3.6, 3.7, H.skin);
  P.p(hx + 6, hy + 4, shade(H.skin, -0.2));
  P.p(hx + 5, hy + 3, '#1a1222');
  switch (cls) {
    case 'warrior': {
      P.e(hx + 3.5, hy + 2, 4, 2.6, '#c0c8d6'); P.r(hx - 0.5, hy + 2, 8, 1.4, '#8f9bb0'); P.r(hx + 6, hy + 2, 1, 3, '#c0c8d6');
      P.r(hx, hy + 3, 2, 3, H.hair); P.p(hx + 2, hy + 4, '#c0c8d6');
      P.p(hx + 2, hy - 1, '#d8443a'); P.p(hx + 1, hy - 1, '#d8443a'); P.p(hx, hy, '#d8443a'); P.p(hx - 1, hy + 1, '#a02a26'); P.p(hx + 3, hy - 1, '#ff6a50');
      break;
    }
    case 'rogue': {
      P.e(hx + 3.2, hy + 3.4, 4.3, 4.4, H.cloth); P.r(hx + 3, hy + 2, 4, 4, H.skin); P.r(hx + 3, hy + 2, 4, 1, shade(H.skin, -0.35));
      P.p(hx + 5, hy + 3, '#ffe9a0'); P.r(hx + 3, hy + 4, 4, 2, '#2a3a2a'); P.p(hx - 1, hy + 6, H.cloth); P.p(hx - 2, hy + 7, H.clothD);
      P.r(hx, hy + 1, 3, 1, H.clothD);
      break;
    }
    case 'mage': {
      P.r(hx + 4, hy + 5, 3, 3, H.hair); P.p(hx + 5, hy + 8, H.hair); P.r(hx, hy + 3, 2, 3, H.hair);
      P.r(hx - 1.5, hy + 1, 10, 1.5, H.clothD);
      P.poly([[hx, hy + 1.5], [hx + 7, hy + 1.5], [hx + 4, hy - 4], [hx, hy - 6], [hx - 2, hy - 5], [hx + 1, hy - 3]], H.cloth);
      P.r(hx, hy, 7, 1, '#e8c050'); P.p(hx + 3, hy - 2, '#ffe680');
      break;
    }
    case 'ranger': {
      P.e(hx + 3.2, hy + 2.6, 4.1, 3.4, '#7a5a2e'); P.r(hx + 3, hy + 3, 4, 3, H.skin); P.p(hx + 5, hy + 3, '#1a1222');
      P.r(hx - 1, hy + 1, 9, 1, '#5a4020'); P.p(hx, hy - 2, '#d8443a'); P.p(hx - 1, hy - 3, '#d8443a'); P.p(hx + 1, hy - 1, '#ff7a5a'); P.p(hx - 2, hy - 4, '#ff9a7a');
      P.r(hx, hy + 3, 2, 3, H.hair);
      break;
    }
    case 'paladin': {
      P.e(hx + 3.5, hy + 3.4, 4, 4, '#d8dee8'); P.r(hx - 0.5, hy + 3, 8, 4, '#d8dee8');
      P.r(hx + 3, hy + 3, 4, 1, '#20182a'); P.p(hx + 5, hy + 5, '#20182a'); P.p(hx + 6, hy + 5, '#20182a');
      P.r(hx + 1.5, hy + 1, 1, 4, '#e8c050'); P.r(hx + 0.5, hy + 2, 3, 1, '#e8c050');
      P.p(hx + 3, hy - 1, '#f2f4f8'); P.p(hx + 2, hy - 1, '#d8443a'); P.p(hx + 1, hy, '#d8443a'); P.p(hx + 4, hy - 1, '#f2f4f8');
      break;
    }
  }
  // 前手與武器
  const sx = 13 + ux, sy = 12 + uy;
  const hand = atk === 1 ? [10 + ux, 9 + uy] : atk === 2 ? [18 + ux, 13 + uy] : [15 + ux, 15 + uy];
  const longW = wpnK === 'staff' || wpnK === 'spear' || wpnK === 'scythe';
  const ang = atk === 1 ? -2.4 : atk === 2 ? (longW ? 0 : -0.15) : longW ? -1.45 : -1.05;
  if (atk !== 1) drawWeapon(P, wpnK, hand[0], hand[1], ang);
  P.l(sx, sy, hand[0], hand[1], sleeve, 2);
  if (kind === 'plate') P.e(sx + 0.2, sy + 0.3, 2.2, 1.8, shade(tint, 0.15));
  if (atk === 1) drawWeapon(P, wpnK, hand[0], hand[1], ang);
  P.r(hand[0] - 0.5, hand[1] - 0.5, 2, 2, H.skin);
}

// ---------- 雙足怪物共用的身體 ----------
// d: 'small' | 'med' | 'big'
const BIPED = {
  small: { lx: [10, 13], lw: 2, ly: 18, ty: 13, tx: 9, tw: 7, hx: 9, hy: 6, hw: 7, hh: 7, sh: [14, 14] },
  med: { lx: [9, 12], lw: 2, ly: 17, ty: 11, tx: 8, tw: 8, hx: 9, hy: 4, hw: 7, hh: 7, sh: [13, 12] },
  big: { lx: [8, 13], lw: 3, ly: 17, ty: 9, tx: 6, tw: 12, hx: 8, hy: 2, hw: 9, hh: 7, sh: [16, 10] },
};
function biped(P, o, f) {
  const D = BIPED[o.size || 'med'];
  const br = f.fr === 'idle' && f.i ? 1 : 0, step = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, atk = f.fr === 'atk' ? f.i + 1 : 0;
  const ux = atk === 2 ? 1 : atk === 1 ? -1 : 0, uy = br;
  if (o.back) o.back(P, ux, uy, f);
  // 後手
  if (!o.noArms) P.r(D.tx + ux, D.ty + 1 + uy, 2, 4, shade(o.arm || o.body, -0.3));
  // 腿
  if (o.robe) {
    P.poly([[D.tx + ux, D.ty + uy], [D.tx + D.tw + ux, D.ty + uy], [D.tx + D.tw + 1 + (step ? 1 : 0), 21], [D.tx - 1 - (step ? 1 : 0), 21]], o.body);
    P.r(D.tx - 1, 20, D.tw + 3, 1, shade(o.body, -0.35));
    if (o.trim) P.r(D.tx - 1, 21, D.tw + 3, 1, o.trim);
  } else if (!o.noLegs) {
    const leg = (x, lift, c) => { P.r(x, D.ly - lift, D.lw, 21 - D.ly - 1, c); P.r(x, 21 - lift - 1, D.lw + 1, 2, shade(o.boot || o.leg, -0.1 + (c === o.leg ? 0 : -0.25))); };
    leg(D.lx[0] - step, step === 1 ? 1 : 0, shade(o.leg, -0.25));
    leg(D.lx[1] + step, step === -1 ? 1 : 0, o.leg);
  }
  // 身體
  if (!o.robe) { P.r(D.tx + ux, D.ty + uy, D.tw, D.ly - D.ty - uy, o.body); if (o.belt) P.r(D.tx + ux, D.ly - 1, D.tw, 1, o.belt); }
  if (o.torso) o.torso(P, D.tx + ux, D.ty + uy, D, f);
  // 頭
  o.head(P, D.hx + ux, D.hy + uy, D, f, atk);
  // 前手
  if (!o.noArms) {
    const sx = D.sh[0] + ux, sy = D.sh[1] + uy;
    const hand = atk === 1 ? [sx - 3, sy - 3] : atk === 2 ? [sx + 5, sy + 1] : [sx + 2, sy + 3];
    const longW = o.wpn === 'staff' || o.wpn === 'spear' || o.wpn === 'scythe';
    const ang = atk === 1 ? -2.4 : atk === 2 ? (longW ? 0 : -0.15) : longW ? -1.45 : -1.05;
    if (o.wpn && o.wpn !== 'bow' && o.wpn !== 'orb') drawWeapon(P, o.wpn, hand[0], hand[1], o.wpn === 'bow' ? 0 : ang, o.wo || {});
    P.l(sx, sy, hand[0], hand[1], o.arm || o.body, 2);
    if (o.wpn === 'bow') drawWeapon(P, 'bow', hand[0] + 1, hand[1] - 1, 0, o.wo || {});
    if (o.wpn === 'orb') drawWeapon(P, 'orb', hand[0], hand[1] - 1, -1, o.wo || {});
    P.r(hand[0] - 0.5, hand[1] - 0.5, 2, 2, o.skin);
  }
}

// ---------- 怪物 ----------
// 每個函式 (P, f, o) ；f = { fr: 'idle'|'walk'|'atk', i: 0|1 }；o.rage 頭目狂暴
const MSPR = {
  rat(P, f) {
    const st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, a = f.fr === 'atk' ? f.i + 1 : 0, b = f.fr === 'idle' && f.i ? 1 : 0;
    const c = '#8a7a6c', cd = '#5e5048', bel = '#b8a898';
    P.l(5, 18, 2, 16, '#d88a98'); P.l(2, 16, 1, 13, '#d88a98');
    for (const [x, k] of [[7, -1], [10, 1], [14, -1], [16, 1]]) P.r(x + (st * k > 0 ? 1 : 0), 20, 1, 2, cd);
    P.e(11, 17 + b * 0.3, 6.2, 3.6 - b * 0.3, c); P.e(11, 18.6, 4.5, 1.6, bel);
    const hx = 17 + a;
    P.e(hx, 16.5, 3.2, 2.6, c); P.poly([[hx + 1, 15], [hx + 5, 17], [hx + 1, 18.5]], c);
    P.p(hx + 5, 17, '#ff8aa0'); P.e(hx - 1.5, 13.6, 1.5, 1.8, c); P.p(hx - 1.5, 13.8, '#e88a98');
    P.p(hx + 1, 15.5, '#ff3a3a');
    if (a === 2) { P.r(hx + 2, 18, 3, 1, '#2a1010'); P.p(hx + 3, 18, '#ffffff'); }
    P.l(hx + 4, 16, hx + 7, 15, '#d8d0c8'); P.l(hx + 4, 17, hx + 7, 18, '#d8d0c8');
  },
  bat(P, f, o, t) {
    const up = (f.i + (f.fr === 'atk' ? 1 : 0)) % 2, y0 = 9 + (up ? -1 : 1);
    const wing = (s) => {
      const pts = up ? [[12, y0 + 2], [12 + s * 9, y0 - 4], [12 + s * 10, y0 + 1], [12 + s * 7, y0 + 2], [12 + s * 5, y0 + 4]] : [[12, y0 + 2], [12 + s * 9, y0 + 6], [12 + s * 8, y0 + 9], [12 + s * 6, y0 + 6], [12 + s * 3, y0 + 6]];
      P.poly(pts, '#5a3a6a'); P.l(12, y0 + 2, pts[1][0], pts[1][1], '#8a5aa0');
    };
    wing(-1); wing(1);
    P.e(12, y0 + 3, 2.6, 3.2, '#4a3050'); P.p(10.5, y0 - 0.5, '#4a3050'); P.p(13.5, y0 - 0.5, '#4a3050');
    P.p(11, y0 + 2, '#ffdf4a'); P.p(13, y0 + 2, '#ffdf4a'); P.p(11, y0 + 5, '#ffffff'); P.p(13, y0 + 5, '#ffffff');
  },
  slime(P, f) {
    const s = f.fr === 'idle' ? (f.i ? 0.6 : 0) : f.fr === 'walk' ? (f.i ? -0.8 : 0.8) : f.i ? -1.4 : 0.6;
    const ax = f.fr === 'atk' && f.i ? 1.5 : 0;
    P.e(12 + ax, 16.5 + s * 0.5, 7.2 + s, 5.2 - s * 0.8, '#2f9a4a');
    P.e(11.5 + ax, 16 + s * 0.5, 5.6 + s, 3.8 - s * 0.6, '#5fd06a');
    P.e(9 + ax, 14 + s * 0.6, 1.6, 1, '#d8ffd0'); P.p(8 + ax, 15 + s * 0.6, '#b8f8b0');
    P.p(15 + ax, 18, '#8ae890'); P.p(13 + ax, 19, '#8ae890');
    P.r(11 + ax, 16, 1, 2, '#143a1c'); P.r(15 + ax, 16, 1, 2, '#143a1c'); P.p(11 + ax, 16, '#ffffff');
  },
  kobold(P, f) {
    biped(P, { size: 'small', body: '#8a5a3a', leg: '#c87a3a', boot: '#5a3a22', skin: '#c87a3a', belt: '#5a3a22', wpn: 'spear', wo: {},
      head(P, x, y, D, f, a) { P.e(x + 3, y + 3.5, 3.4, 3.2, '#c87a3a'); P.poly([[x + 4, y + 2], [x + 9, y + 4], [x + 8, y + 6], [x + 4, y + 6]], '#c87a3a'); P.p(x + 8, y + 4, '#2a1a1a'); P.p(x + 4, y + 3, '#ffe24a'); P.poly([[x, y + 1], [x + 1, y - 3], [x + 3, y + 1]], '#a05a2a'); P.p(x + 1, y - 1, '#e8a080'); if (a === 2) P.p(x + 7, y + 6, '#ffffff'); },
    }, f);
  },
  archer(P, f) {
    biped(P, { size: 'small', body: '#7a5a3a', leg: '#4a3a2a', skin: '#6ab04a', belt: '#3a2a1a', wpn: 'bow', wo: {}, arm: '#6ab04a',
      back(P, ux, uy) { P.r(6 + ux, 11 + uy, 2, 6, '#6a4424'); P.p(6 + ux, 10 + uy, '#e8e0d0'); P.p(7 + ux, 10 + uy, '#d8443a'); },
      head(P, x, y, D, f, a) { P.e(x + 3.5, y + 3.5, 3.6, 3.2, '#6ab04a'); P.poly([[x, y + 3], [x - 3, y], [x + 1, y + 2]], '#5a9a3a'); P.poly([[x + 6, y + 3], [x + 9, y], [x + 7, y + 3]], '#5a9a3a'); P.p(x + 5, y + 3, '#ff3a3a'); P.p(x + 3, y + 3, '#ff3a3a'); P.r(x + 3, y + 5, 3, 1, '#2a3a1a'); P.p(x + 4, y + 5, '#ffffff'); P.r(x + 1, y, 5, 1.5, '#7a5a3a'); },
    }, f);
  },
  thief(P, f) {
    biped(P, { size: 'small', body: '#3a3050', leg: '#3a3050', boot: '#2a2030', skin: '#8a6acf', belt: '#b08a5a', wpn: 'dagger', wo: {},
      back(P, ux, uy) { P.e(7 + ux, 14 + uy, 3.5, 3.6, '#b08a5a'); P.p(6 + ux, 11 + uy, '#7a5a3a'); P.p(7 + ux, 14 + uy, '#ffd040'); P.p(8 + ux, 15 + uy, '#ffd040'); },
      head(P, x, y, D, f, a) { P.e(x + 3.5, y + 3.5, 3.6, 3.4, '#8a6acf'); P.poly([[x, y + 3], [x - 3, y - 1], [x + 1, y + 1]], '#8a6acf'); P.e(x + 3, y + 1.6, 3.8, 2, '#3a3050'); P.r(x + 3, y + 3, 4, 1, '#3a3050'); P.p(x + 5, y + 4, '#ffe04a'); P.p(x + 3, y + 4, '#ffe04a'); P.r(x + 3, y + 6, 3, 1, '#f8f0e0'); },
    }, f);
  },
  shaman(P, f) {
    biped(P, { size: 'small', body: '#c8402a', leg: '#4a3a2a', skin: '#6ab04a', robe: 1, trim: '#ffd040', wpn: 'staff', wo: { orb: '#9fe8ff' }, arm: '#6ab04a',
      torso(P, x, y) { P.r(x + 1, y + 1, 5, 1, '#efe6cf'); P.p(x + 3, y + 2, '#ffd040'); },
      head(P, x, y, D, f, a) { P.e(x + 3.5, y + 3.6, 3.6, 3.3, '#6ab04a'); P.p(x + 5, y + 3, '#ff3a3a'); P.p(x + 3, y + 3, '#ff3a3a'); P.r(x + 2, y + 5, 4, 1, '#2a3a1a');
        for (let k = 0; k < 5; k++) { P.r(x + k * 1.5, y - 3 + (k % 2), 1, 4, ['#d8443a', '#ffd040', '#4ac8ff', '#ffd040', '#d8443a'][k]); }
        P.r(x, y + 1, 7, 1, '#7a4a26'); },
    }, f);
  },
  imp(P, f) {
    const up = f.i, a = f.fr === 'atk' ? f.i + 1 : 0, y = up ? -1 : 0;
    P.poly([[9, 11 + y], [2, 7 + y * 2], [4, 13 + y], [8, 14 + y]], '#6a2030'); P.poly([[15, 11 + y], [22, 7 + y * 2], [20, 13 + y], [16, 14 + y]], '#6a2030');
    P.l(8, 12 + y, 3, 8 + y * 2, '#a03040'); P.l(16, 12 + y, 21, 8 + y * 2, '#a03040');
    P.l(10, 18 + y, 6, 20 + y, '#a02a2a'); P.poly([[4, 19 + y], [7, 20 + y], [5, 22 + y]], '#a02a2a');
    P.e(12, 15 + y, 3.4, 3.8, '#e04a3a'); P.r(10, 18 + y, 1, 2, '#a02a2a'); P.r(13, 18 + y, 1, 2, '#a02a2a');
    P.e(12.5, 9.5 + y, 3.4, 3.2, '#e04a3a'); P.p(10, 6 + y, '#f0e0c0'); P.p(9, 5 + y, '#f0e0c0'); P.p(15, 6 + y, '#f0e0c0'); P.p(16, 5 + y, '#f0e0c0');
    P.p(13, 9 + y, '#ffe04a'); P.p(15, 9 + y, '#ffe04a'); P.r(12, 11 + y, 4, 1, '#2a1010'); P.p(13, 11 + y, '#ffffff');
    const hx = a === 1 ? 13 : a === 2 ? 19 : 16, hy = a === 1 ? 8 : 13;
    P.l(14, 14 + y, hx, hy + y, '#e04a3a', 2); P.e(hx + 1, hy - 1 + y, 2, 2, '#ff9a3a'); P.e(hx + 0.6, hy - 1.4 + y, 1, 1, '#fff4c0');
  },
  orc(P, f) {
    biped(P, { size: 'big', body: '#6a5a5a', leg: '#5a4a3a', boot: '#2a2020', skin: '#7a9a5a', arm: '#7a9a5a', belt: '#4a3020', wpn: 'axe', wo: { pal: { blade: '#d8dee8', iron: '#9aa2b0' } },
      torso(P, x, y) { P.e(x + 9, y + 1, 3, 2.2, '#9aa2b0'); P.p(x + 9, y, '#d8dee8'); P.r(x + 2, y + 2, 6, 1, '#4a3e3e'); P.r(x + 3, y + 4, 5, 3, '#7a9a5a'); },
      head(P, x, y, D, f, a) { P.e(x + 4.5, y + 4, 4.6, 4, '#7a9a5a'); P.r(x + 1, y + 2, 8, 1, '#5a7a40'); P.p(x + 6, y + 3, '#ff3a2a'); P.p(x + 8, y + 3, '#ff3a2a'); P.p(x + 6, y + 6, '#f8f0d8'); P.p(x + 8, y + 6, '#f8f0d8'); P.p(x + 6, y + 5, '#f8f0d8'); P.r(x + 6, y + 6, 3, 1, a === 2 ? '#3a1010' : '#5a7a40'); P.r(x - 0.5, y + 1, 3, 4, '#2a2020'); },
    }, f);
  },
  necro(P, f) {
    biped(P, { size: 'med', body: '#5a2a7a', leg: '#3a1a50', skin: '#e8e0d0', robe: 1, trim: '#7fff7a', wpn: 'staff', wo: { orb: '#7fff7a' }, arm: '#5a2a7a',
      torso(P, x, y) { P.r(x + 3, y + 1, 2, 5, '#3a1a50'); P.p(x + 3, y + 2, '#e8e0d0'); P.p(x + 4, y + 3, '#e8e0d0'); },
      head(P, x, y, D, f, a) { P.e(x + 3.4, y + 3.2, 4.3, 4.6, '#5a2a7a'); P.e(x + 4, y + 4, 2.8, 3, '#e8e0d0'); P.r(x + 3, y + 3, 1, 1, '#1a1222'); P.r(x + 5, y + 3, 1, 1, '#1a1222'); P.p(x + 3, y + 3, '#7fff7a'); P.p(x + 5, y + 3, '#7fff7a'); P.r(x + 3, y + 6, 3, 1, '#8a8070'); P.p(x + 4, y + 6, '#e8e0d0'); P.poly([[x - 1, y + 2], [x + 2, y - 2], [x + 3, y + 1]], '#3a1a50'); },
    }, f);
  },
  skeleton(P, f) {
    const bone = '#ece6d6', bd = '#a8a090';
    biped(P, { size: 'med', body: '#2a2030', leg: bone, boot: bd, skin: bone, arm: bone, wpn: 'sword', wo: { pal: { blade: '#b8b0a0', bladeD: '#7a6a5a' } },
      back(P, ux, uy) { P.e(7 + ux, 14 + uy, 3, 3.6, '#7a5a30'); P.e(7 + ux, 14 + uy, 1.6, 2.2, '#a8a8b0'); },
      torso(P, x, y) { for (let k = 0; k < 3; k++) P.r(x + 1, y + 1 + k * 2, 6, 1, bone); P.r(x + 3, y, 2, 6, bd); P.r(x + 2, y + 6, 4, 1, bone); },
      head(P, x, y, D, f, a) { P.e(x + 3.5, y + 3.2, 3.8, 3.6, bone); P.r(x + 2, y + 6, 5, 1.5, bone); P.r(x + 4, y + 3, 2, 2, '#1a1222'); P.p(x + 1, y + 3, '#1a1222'); P.p(x + 4, y + 3, '#ff4a3a'); P.p(x + 3, y + 7, '#1a1222'); P.p(x + 5, y + 7, '#1a1222'); },
    }, f);
  },
  spider(P, f) {
    const st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, a = f.fr === 'atk' ? f.i + 1 : 0, b = f.fr === 'idle' && f.i ? 0.5 : 0;
    const legB = '#4a2e58', legF = '#8a5aa0';
    const legs = (col, side) => { for (let k = 0; k < 4; k++) { const bx = 10 + k * 1.6, up = (k + side + (st > 0 ? 1 : 0)) % 2 ? 1 : 0, kx = 2 + k * 5.5 + side, fx = kx + (k < 2 ? -2 : 2); P.l(bx, 16, kx, 9 + up + b + side, col); P.l(kx, 9 + up + b + side, fx, 21, col); } };
    legs(legB, 1);
    P.e(7.5, 15 + b, 4.6, 3.8, '#5a3a6a'); P.e(7, 14 + b, 3, 2.2, '#7a4a8a');
    P.r(6, 13 + b, 3, 1, '#d83a3a'); P.r(7, 12 + b, 1, 3, '#d83a3a');
    const hx = 13.5 + a * 0.8;
    P.e(hx, 15.5, 2.8, 2.4, '#5a3a6a');
    P.p(hx + 1, 14.5, '#ff4a4a'); P.p(hx + 2, 14.5, '#ff4a4a'); P.p(hx + 2, 15.5, '#ff8a6a'); P.p(hx, 14, '#ff4a4a');
    P.l(hx + 2, 17, hx + 3, 18 + (a === 2 ? 1 : 0), '#e8e0d0'); P.l(hx, 17.5, hx + 1, 18.5 + (a === 2 ? 1 : 0), '#e8e0d0');
    legs(legF, 0);
  },
  salamander(P, f) {
    const st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, a = f.fr === 'atk' ? f.i + 1 : 0, fl = f.i;
    P.l(5, 18, 1, 15, '#e04a1a', 2); P.l(1, 15, 1, 12, '#ff7a2a');
    for (const [x, k] of [[7, 1], [9, -1], [14, 1], [16, -1]]) { P.l(x, 18, x + (st * k > 0 ? 1 : -1), 21, '#c03a1a'); }
    P.e(11, 17, 7, 3, '#ff7a2a'); P.e(11, 18.5, 5.5, 1.4, '#ffd04a');
    for (const x of [7, 10, 13]) P.p(x, 15, '#a02a10');
    P.e(19 + a * 0.6, 16, 3.4, 2.4, '#ff7a2a'); P.p(20 + a * 0.6, 15, '#2a1010'); P.p(20 + a * 0.6, 14.5, '#ffe04a');
    if (a === 2) P.r(20, 17, 3, 1, '#2a1010');
    for (const x of [6, 9, 12, 15]) { P.p(x, 13 + ((x + fl) % 2), '#ffe04a'); P.p(x, 14, '#ffa040'); }
  },
  golem(P, f) {
    const br = f.fr === 'idle' && f.i ? 1 : 0, st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, a = f.fr === 'atk' ? f.i + 1 : 0;
    const c = '#4a7aa8', C = '#8ad0f0', w = '#e8fbff';
    P.r(7 - st, 17, 4, 5, c); P.r(14 + st, 17, 4, 5, c);
    P.r(5, 7 + br, 15, 11 - br, c); P.r(6, 8 + br, 13, 8, C); P.e(12.5, 12 + br, 2, 2, '#4af0ff'); P.p(12, 11 + br, '#ffffff');
    P.poly([[5, 8 + br], [3, 2 + br], [7, 7 + br]], w); P.poly([[19, 8 + br], [21, 1 + br], [18, 7 + br]], w); P.poly([[9, 7 + br], [10, 3 + br], [12, 7 + br]], C);
    P.r(9, 3 + br, 7, 5, c); P.r(10, 4 + br, 5, 3, C); P.p(13, 5 + br, '#4af0ff'); P.p(15, 5 + br, '#4af0ff');
    const fx = a === 2 ? 22 : a === 1 ? 17 : 19, fy = a === 1 ? 6 : 15;
    P.l(18, 9 + br, fx, fy, c, 3); P.r(fx - 1, fy - 1, 4, 4, C);
    P.l(5, 9 + br, 3, 16, c, 3); P.r(1, 15, 4, 4, shade(C, -0.2));
  },
  wolf(P, f) {
    const st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, a = f.fr === 'atk' ? f.i + 1 : 0, b = f.fr === 'idle' && f.i ? 0.4 : 0;
    const w = '#e8eef4', W = '#a8b8c8';
    P.poly([[6, 14], [1, 9], [2, 13], [5, 16]], W); P.l(5, 14, 2, 10, w);
    for (const [x, k] of [[7, 1], [9, -1], [15, 1], [17, -1]]) { P.l(x, 17, x + (st * k > 0 ? 1.5 : -0.5), 21, k > 0 ? W : shade(W, -0.2), 1); }
    P.e(12, 15 + b, 6.5, 3.2, w); P.e(12, 16.5 + b, 5, 1.5, W);
    const hx = 18 + a;
    P.e(hx, 13 + b, 3, 2.8, w); P.poly([[hx + 1, 12 + b], [hx + 5, 14 + b], [hx + 1, 15.5 + b]], w); P.p(hx + 5, 14 + b, '#2a2a3a');
    P.poly([[hx - 2, 11 + b], [hx - 1, 7 + b], [hx + 1, 11 + b]], w); P.p(hx - 1, 9 + b, '#c8a8b8');
    P.p(hx + 1, 12.5 + b, '#4ac8ff'); if (a === 2) { P.r(hx + 2, 15 + b, 3, 1, '#2a1010'); P.p(hx + 3, 15 + b, '#ffffff'); }
    P.r(10, 12 + b, 6, 1, '#ffffff');
  },
  shade(P, f) {
    const fl = f.i, a = f.fr === 'atk' ? f.i + 1 : 0, ux = a === 2 ? 1 : a === 1 ? -1 : 0;
    P.poly([[8 + ux, 9], [17 + ux, 9], [17 + (fl ? 1 : 0), 18], [15, 21 - fl], [13, 19], [11, 21 + fl - 1], [8, 19], [7 - (fl ? 1 : 0), 17]], '#2a2440');
    P.poly([[9 + ux, 11], [16 + ux, 11], [15, 18], [10, 18]], '#14101e');
    P.e(12.5 + ux, 7, 4.2, 4.4, '#2a2440'); P.e(13 + ux, 7.5, 2.8, 2.8, '#0a0810'); P.p(13 + ux, 7, '#d05cff'); P.p(15 + ux, 7, '#d05cff');
    P.p(10 + ux, 3, '#2a2440'); P.p(9 + ux, 2, '#2a2440');
    const hx = a === 1 ? 12 : a === 2 ? 19 : 17, hy = a === 1 ? 8 : 13;
    P.l(14 + ux, 12, hx, hy, '#2a2440', 2); drawWeapon(P, 'dagger', hx, hy, a === 2 ? 0 : -0.8, { pal: { blade: '#c8c0e0', bladeD: '#6a5a8a' } });
    P.l(10 + ux, 12, 6 + ux, 15, '#2a2440', 2); drawWeapon(P, 'dagger', 6 + ux, 15, 2.6, { pal: { blade: '#c8c0e0', bladeD: '#6a5a8a' } });
  },
  gargoyle(P, f, o) {
    const s = o && o.stone, g = s ? '#8f8f9a' : '#8a8a96', G = s ? '#777783' : '#6a6a78', eye = s ? '#55555f' : '#ff5a3a';
    const a = f.fr === 'atk' ? f.i + 1 : 0, wu = s ? 0 : f.i;
    P.poly([[9, 10], [1, 4 - wu], [2, 10], [4, 14], [9, 14]], s ? '#7a7a86' : '#5a5a66'); P.poly([[15, 10], [23, 4 - wu], [22, 10], [20, 14], [15, 14]], s ? '#7a7a86' : '#5a5a66');
    P.l(9, 10, 1, 4 - wu, '#9a9aa8'); P.l(15, 10, 23, 4 - wu, '#9a9aa8');
    P.r(8, 18, 3, 4, G); P.r(13, 18, 3, 4, G); P.r(7, 21, 4, 1, '#4a4a56'); P.r(13, 21, 4, 1, '#4a4a56');
    P.e(12, 15, 5, 4.2, g); P.e(12, 16, 3, 2.4, G);
    P.e(12.5, 8.6, 3.6, 3.4, g); P.p(10, 5, '#c8c8d0'); P.p(9, 4, '#c8c8d0'); P.p(15, 5, '#c8c8d0'); P.p(16, 4, '#c8c8d0');
    P.p(12, 8, eye); P.p(14, 8, eye); P.r(11, 10, 4, 1, '#4a4a56');
    const hx = a === 2 ? 20 : 17, hy = a === 1 ? 10 : 16;
    P.l(16, 13, hx, hy, g, 2); P.p(hx + 1, hy + 1, '#e8e8e8'); P.p(hx + 1, hy - 1, '#e8e8e8');
  },
  frostmage(P, f) {
    biped(P, { size: 'med', body: '#7ab8e8', leg: '#5a8ab0', skin: '#e0d0e8', robe: 1, trim: '#ffffff', wpn: 'staff', wo: { orb: '#bff4ff' }, arm: '#7ab8e8',
      torso(P, x, y) { P.r(x + 3, y + 1, 2, 7, '#ffffff'); },
      head(P, x, y, D, f, a) { P.poly([[x - 1, y + 7], [x + 1, y - 3], [x + 4, y - 5], [x + 8, y + 1], [x + 8, y + 7]], '#d8f0ff'); P.r(x + 3, y + 2, 4, 4, '#e0d0e8'); P.p(x + 5, y + 3, '#2a4a8a'); P.r(x + 3, y + 5, 4, 2, '#ffffff'); P.p(x + 4, y - 3, '#8ae8ff'); },
    }, f);
  },
  sporeling(P, f) {
    const b = f.fr === 'idle' && f.i ? 1 : 0, st = f.fr === 'walk' ? f.i : 0;
    P.r(10 - st, 19, 1, 2, '#e8dcc0'); P.r(13 + st, 19, 1, 2, '#e8dcc0');
    P.r(9, 15 + b, 6, 5 - b, '#e8dcc0'); P.p(12, 16 + b, '#2a1a2a'); P.p(14, 16 + b, '#2a1a2a');
    P.e(12, 13 + b, 5, 3, '#4ac8b0'); P.r(8, 14 + b, 9, 1, '#2a5a5a'); P.p(10, 12 + b, '#e0fff8'); P.p(13, 11 + b, '#e0fff8');
  },
  shroom(P, f) {
    const b = f.fr === 'idle' && f.i ? 1 : 0, st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, a = f.fr === 'atk' ? f.i + 1 : 0, ux = a === 2 ? 2 : 0;
    P.r(9 - st, 19, 2, 3, '#c8bca0'); P.r(14 + st, 19, 2, 3, '#c8bca0');
    P.r(8 + ux * 0.5, 12, 9, 8, '#e8dcc0'); P.r(8 + ux * 0.5, 12, 9, 1, '#c8bca0');
    P.p(14 + ux * 0.5, 15, '#2a1a2a'); P.p(16 + ux * 0.5, 15, '#2a1a2a'); P.r(14 + ux * 0.5, 17, 3, 1, '#6a2a5a');
    P.l(9, 14, 6, 17, '#e8dcc0', 2); P.l(16 + ux * 0.5, 14, 19 + ux, 16 + (a ? -1 : 1), '#e8dcc0', 2);
    P.e(12.5 + ux, 9 + b - (a === 1 ? 1 : 0), 8.5, 4.6, '#c84a8a'); P.r(5 + ux, 11 + b, 16, 1.5, '#6a2a5a');
    for (const [x, y] of [[9, 7], [14, 6], [17, 9], [11, 10]]) P.e(x + ux, y + b, 1.2, 1, '#ffe0f0');
  },
  wisp(P, f) {
    const fl = f.i, a = f.fr === 'atk' ? f.i : 0;
    P.e(12, 13, 6.4, 7, '#2a6aff'); P.e(12, 14, 4.6, 5.4, '#5fb8ff'); P.e(12, 15, 3, 3.6, '#d8f4ff');
    P.p(12, 4 + fl, '#5fb8ff'); P.p(10, 6 - fl, '#5fb8ff'); P.p(14, 5 + fl, '#5fb8ff'); P.p(9, 8, '#2a6aff'); P.p(15, 7 + fl, '#2a6aff');
    P.r(10, 14, 1, 2, '#2a2a8a'); P.r(14, 14, 1, 2, '#2a2a8a'); if (a) P.r(11, 17, 3, 1, '#2a2a8a');
  },
  mimic(P, f) {
    const a = f.fr === 'atk' ? f.i + 1 : 0, op = 3 + (f.i ? 1 : 0) + a;
    P.r(4, 15, 16, 7, '#7a4420'); P.r(4, 15, 16, 1, '#a8642a'); P.r(4, 18, 16, 1, '#e0b040'); P.r(11, 17, 2, 3, '#e0b040');
    P.r(5, 14, 14, 1, '#c02a3a'); for (let x = 5; x < 19; x += 2) P.p(x, 13, '#f8f0e0');
    P.poly([[4, 14 - op], [20, 14 - op], [19, 9 - op], [5, 9 - op]], '#8a5028'); P.r(4, 13 - op, 16, 1, '#e0b040');
    for (let x = 5; x < 19; x += 2) P.p(x + 1, 15 - op, '#f8f0e0');
    P.r(5, 14 - op, 14, op, '#5a0a1a'); P.l(8, 14, 13, 15 - op * 0.5, '#e85a7a', 2);
    P.p(7, 11 - op, '#ff3a3a'); P.p(16, 11 - op, '#ff3a3a'); P.r(5, 22, 2, 1, '#5a3010'); P.r(17, 22, 2, 1, '#5a3010');
  },
  keeper(P, f) {
    biped(P, { size: 'med', body: '#3a8a6a', leg: '#4a3a4a', boot: '#3a2a22', skin: '#f0c090', belt: '#e0b040', arm: '#3a8a6a', wpn: 'orb', wo: { orb: '#ffd040' },
      torso(P, x, y) { P.r(x + 3, y, 2, 6, '#2a6a4a'); P.p(x + 3, y + 2, '#e0b040'); P.p(x + 3, y + 4, '#e0b040'); },
      head(P, x, y, D, f, a) { P.e(x + 3.5, y + 3.6, 3.6, 3.6, '#f0c090'); P.p(x + 5, y + 3, '#20162a'); P.r(x + 3, y + 5, 4, 1, '#5a3020'); P.p(x + 7, y + 5, '#5a3020'); P.e(x + 3.5, y + 1, 4.5, 2.4, '#c8402a'); P.r(x - 1, y + 1, 9, 1, '#8a2a1a'); P.p(x + 3, y - 1, '#ffd040'); },
    }, f);
  },
  // 祭壇（火焰另外畫）
  altar(P, f, o) {
    const A = (typeof ALTARS !== 'undefined' && ALTARS[o.k]) || { col: '#c8a0ff' }, used = o.used;
    const st = '#8a8496', sd = '#5a5466', sl = '#b8b2c4';
    P.r(5, 19, 14, 3, sd); P.r(5, 19, 14, 1, st);
    P.r(7, 11, 10, 8, st); P.r(7, 11, 2, 8, sl); P.r(15, 11, 2, 8, sd);
    P.r(6, 9, 12, 3, sl); P.r(6, 11, 12, 1, sd);
    P.r(10, 13, 4, 4, used ? '#4a4456' : A.col); P.p(11, 14, used ? '#5a5466' : '#ffffff');
    P.r(8, 7, 8, 2, used ? '#3a3444' : shade(A.col, -0.4)); P.r(9, 7, 6, 1, used ? '#4a4456' : A.col);
  },
  // 寶箱（偽裝的寶箱怪也用這張）
  chest(P, f, o) {
    const gold = o && o.gold, open = o && o.open;
    const wd = gold ? '#5a2a7a' : '#7a4420', wl = gold ? '#8a4ab0' : '#a8642a', band = gold ? '#ffd75a' : '#d8a040';
    P.r(4, 14, 16, 8, wd); P.r(4, 14, 16, 1, wl); P.r(5, 16, 14, 5, wl); P.r(4, 17, 16, 1, band); P.r(7, 14, 1, 8, band); P.r(16, 14, 1, 8, band);
    if (open) { P.r(5, 12, 14, 3, '#2a1a10'); P.r(6, 12, 12, 2, gold ? '#ffe8a0' : '#ffd060'); P.poly([[4, 13], [20, 13], [19, 6], [5, 6]], wd); P.r(5, 7, 14, 5, wl); P.r(4, 6, 16, 1, band); }
    else { P.poly([[4, 14], [20, 14], [19, 9], [5, 9]], wd); P.r(5, 10, 14, 3, wl); P.r(4, 13, 16, 1, band); P.r(7, 9, 1, 5, band); P.r(16, 9, 1, 5, band); P.r(11, 12, 2, 3, band); P.p(11, 13, '#2a1a10'); }
  },
};

// ---------- 守層頭目（較大的畫布） ----------
const BSPR = {
  ratking: { w: 36, h: 32, draw(P, f, o) {
    const st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, a = f.fr === 'atk' ? f.i + 1 : 0, b = f.fr === 'idle' && f.i ? 1 : 0, rg = o.rage;
    const c = '#7a6a5a', cd = '#4e4038', bel = '#a89888';
    P.l(6, 25, 2, 22, '#d88a98', 2); P.l(2, 22, 2, 16, '#d88a98'); P.l(2, 16, 4, 13, '#d88a98');
    P.poly([[9, 15 + b], [20, 14 + b], [22, 27], [6, 28]], rg ? '#a01a2a' : '#7a1a2a'); P.r(7, 27, 15, 1, '#e0b040');
    for (const [x, k] of [[9, -1], [13, 1], [21, -1], [24, 1]]) P.r(x + (st * k > 0 ? 1 : 0), 27, 2, 3, cd);
    P.e(16, 22 + b * 0.4, 10, 6 - b * 0.4, c); P.e(16, 25, 7, 2.4, bel);
    const hx = 26 + a;
    P.e(hx, 19, 5, 4, c); P.poly([[hx + 2, 16], [hx + 8, 20], [hx + 2, 22.5]], c); P.p(hx + 8, 20, '#ff8aa0');
    P.e(hx - 3, 14, 2.4, 2.8, c); P.p(hx - 3, 14, '#e88a98');
    P.r(hx + 1, 17, 2, 1, rg ? '#ffffff' : '#ff3030'); P.p(hx + 2, 17, rg ? '#ff2020' : '#ffd0d0');
    if (a === 2) { P.r(hx + 3, 22, 5, 1.5, '#2a1010'); P.p(hx + 4, 22, '#ffffff'); P.p(hx + 6, 22, '#ffffff'); }
    P.r(hx - 4, 12, 8, 3, '#ffd040'); for (const k of [0, 3, 6]) P.r(hx - 4 + k, 9, 2, 3, '#ffd040'); P.p(hx - 3, 13, '#ff3a5a'); P.p(hx, 13, '#3a8aff'); P.p(hx + 3, 13, '#3aff8a');
    P.l(hx + 5, 19, hx + 11, 18, '#d8d0c8'); P.l(hx + 5, 20, hx + 11, 22, '#d8d0c8');
  } },
  mother: { w: 40, h: 38, draw(P, f, o) {
    const b = f.fr === 'idle' && f.i ? 1 : 0, a = f.fr === 'atk' ? f.i + 1 : 0, rg = o.rage;
    for (const x of [6, 12, 26, 32]) P.l(x, 36, x + (x < 20 ? 3 : -3), 28, '#8a7a90', 2);
    P.r(12, 20, 16, 15, '#e8dcc0'); P.r(12, 20, 16, 2, '#c8bca0');
    P.e(17, 27, 1.6, 1.6, '#2a1a2a'); P.e(23, 27, 1.6, 1.6, '#2a1a2a'); P.p(17, 26, rg ? '#ff4040' : '#ffffff'); P.p(23, 26, rg ? '#ff4040' : '#ffffff');
    P.e(20, 31, 3.2, 1.2 + a * 0.6, '#6a2a3a');
    P.e(20, 13 + b - (a === 1 ? 1 : 0), 18, 9, rg ? '#b03aa0' : '#9a4ad0'); P.r(3, 18 + b, 34, 2, '#4a2a5a');
    for (let x = 4; x < 36; x += 3) P.r(x, 20 + b, 1, 2, '#6a3a7a');
    for (const [x, y, r] of [[10, 10, 2], [20, 7, 2.6], [29, 11, 2], [15, 15, 1.4], [26, 16, 1.5], [33, 15, 1.2], [6, 15, 1.2]]) { P.e(x, y + b, r, r * 0.8, '#ffe0ff'); P.p(x - 0.5, y - 0.5 + b, '#ffffff'); }
    P.e(5, 33, 2.6, 2, '#4ac8b0'); P.e(35, 33, 2.6, 2, '#4ac8b0');
  } },
  forge: { w: 44, h: 42, draw(P, f, o) {
    const br = f.fr === 'idle' && f.i ? 1 : 0, st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, a = f.fr === 'atk' ? f.i + 1 : 0, rg = o.rage;
    const k = '#3a2420', K = '#6a3a2a', hot = rg ? '#fff0a0' : '#ffd04a';
    P.r(12 - st, 30, 7, 10, k); P.r(25 + st, 30, 7, 10, k); P.r(11 - st, 38, 9, 2, K); P.r(24 + st, 38, 9, 2, K);
    P.r(9, 12 + br, 26, 19 - br, k); P.r(11, 14 + br, 22, 15, K);
    P.e(22, 22 + br, 6, 5, '#ff7a2a'); P.e(22, 23 + br, 4, 3, hot); P.r(16, 17 + br, 12, 1, '#2a1410');
    for (const [x, y] of [[13, 16], [30, 18], [14, 26], [31, 27]]) P.l(x, y + br, x + 2, y + 3 + br, '#ff7a2a');
    P.r(8, 8 + br, 4, 6, k); P.r(32, 8 + br, 4, 6, k); P.r(8, 6 + br, 4, 2, '#2a1410'); P.r(32, 6 + br, 4, 2, '#2a1410');
    P.r(16, 4 + br, 12, 9, k); P.r(17, 5 + br, 10, 7, K); P.r(18, 8 + br, 3, 2, hot); P.r(24, 8 + br, 3, 2, hot); P.r(19, 11 + br, 7, 1, '#ff7a2a');
    const hx = a === 2 ? 42 : a === 1 ? 36 : 38, hy = a === 1 ? 6 : a === 2 ? 22 : 30;
    P.l(34, 15 + br, hx - 2, hy, k, 5); P.r(hx - 5, hy - 3, 7, 7, K); P.r(hx - 4, hy - 2, 5, 5, '#8a5a3a'); P.p(hx - 2, hy, hot);
    P.l(10, 15 + br, 5, 28, k, 5); P.r(2, 27, 7, 7, K); P.r(3, 28, 5, 5, '#8a5a3a');
  } },
  witch: { w: 34, h: 36, draw(P, f, o) {
    const b = f.fr === 'idle' && f.i ? 1 : 0, a = f.fr === 'atk' ? f.i + 1 : 0, ux = a === 2 ? 1 : a === 1 ? -1 : 0, rg = o.rage;
    P.poly([[11 + ux, 14 + b], [21 + ux, 14 + b], [25, 34], [7, 34]], '#5aa8e8'); P.poly([[13 + ux, 16 + b], [19 + ux, 16 + b], [21, 33], [11, 33]], '#2a6ab0');
    P.r(7, 33, 18, 1, '#e8fbff'); P.r(15 + ux, 16 + b, 2, 17, '#ffffff');
    P.poly([[9 + ux, 9 + b], [13 + ux, 9 + b], [10, 26], [6, 28]], '#e8f4ff');
    P.e(16 + ux, 9 + b, 4.5, 5, '#e8f4ff'); P.r(14 + ux, 7 + b, 6, 6, '#e8d8f0'); P.p(18 + ux, 9 + b, rg ? '#ff3a6a' : '#3a6ad0'); P.p(16 + ux, 9 + b, rg ? '#ff3a6a' : '#3a6ad0'); P.r(16 + ux, 12 + b, 3, 1, '#b07aa0');
    for (const [x, h] of [[12, 3], [14, 5], [16, 6], [18, 5], [20, 3]]) P.r(x + ux, 4 + b - h, 1, h, '#bff4ff');
    P.r(12 + ux, 4 + b, 9, 1, '#8ae8ff');
    const hx = a === 1 ? 18 : a === 2 ? 27 : 24, hy = a === 1 ? 10 : 18;
    P.l(20 + ux, 17 + b, hx, hy + b, '#5aa8e8', 2);
    const sx = hx + 1, sy = hy + b; P.l(sx, sy + 10, sx, sy - 6, '#c0e0f0'); P.poly([[sx, sy - 12], [sx + 3, sy - 7], [sx, sy - 4], [sx - 3, sy - 7]], '#8ae8ff'); P.p(sx - 1, sy - 9, '#ffffff');
  } },
  lord: { w: 44, h: 44, draw(P, f, o) {
    const br = f.fr === 'idle' && f.i ? 1 : 0, st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, a = f.fr === 'atk' ? f.i + 1 : 0, ux = a === 2 ? 2 : a === 1 ? -1 : 0, rg = o.rage;
    const k = '#2a1a3a', K = '#4a2a6a', glow = rg ? '#ff4a8a' : '#ff4ad0';
    P.poly([[12 + ux, 14 + br], [30 + ux, 14 + br], [36, 42], [30, 40], [26, 43], [20, 40], [14, 43], [8, 41]], '#1a0f24');
    P.r(14 - st, 32, 6, 10, k); P.r(24 + st, 32, 6, 10, k); P.r(13 - st, 40, 8, 2, K); P.r(23 + st, 40, 8, 2, K);
    P.r(13 + ux, 16 + br, 18, 17 - br, k); P.r(15 + ux, 18 + br, 14, 12, K); P.e(22 + ux, 23 + br, 3, 3, glow); P.p(21 + ux, 22 + br, '#ffffff');
    P.e(12 + ux, 17 + br, 4, 3, K); P.e(32 + ux, 17 + br, 4, 3, K);
    P.r(16 + ux, 5 + br, 12, 11, k); P.r(17 + ux, 7 + br, 10, 7, K); P.r(18 + ux, 10 + br, 3, 1, glow); P.r(24 + ux, 10 + br, 3, 1, glow);
    P.poly([[17 + ux, 7 + br], [9 + ux, 2 + br], [7 + ux, -3 + br], [12 + ux, 3 + br], [18 + ux, 5 + br]], '#e8d0ff'); P.poly([[27 + ux, 7 + br], [35 + ux, 2 + br], [37 + ux, -3 + br], [32 + ux, 3 + br], [26 + ux, 5 + br]], '#e8d0ff');
    P.r(19 + ux, 13 + br, 6, 1, '#ff8af0');
    const hx = a === 1 ? 26 : a === 2 ? 40 : 36, hy = a === 1 ? 8 : a === 2 ? 22 : 28;
    P.l(31 + ux, 18 + br, hx, hy, k, 3);
    drawWeapon(P, 'greatsword', hx, hy, a === 1 ? -2.4 : a === 2 ? -0.1 : -1.2, { pal: { blade: '#d05cff', bladeD: '#6a2a9a', gold: '#ffd040' } });
    P.r(hx - 1, hy - 1, 3, 3, K);
    P.l(13 + ux, 18 + br, 9, 30, k, 3);
  } },
};

// ---------- 快取與對外介面 ----------
const Spr = {
  cache: new Map(),
  frameKey(f) { return f.fr + f.i; },
  // 主角：依職業與目前裝備
  hero(cls, f, gear) {
    const key = 'H|' + cls + '|' + gear.a + '|' + gear.t + '|' + gear.w + '|' + this.frameKey(f);
    let s = this.cache.get(key); if (s) return s;
    const P = Pix.mk(36, 30); P.ox = 6; P.oy = 6;
    drawHero(P, cls, gear.a, gear.t, gear.w, f);
    s = Pix.finish(P, { ax: 18, ay: 28, sw: 0.3 });
    this.cache.set(key, s); return s;
  },
  mon(k, f, o = {}) {
    const key = 'M|' + k + '|' + (o.rage ? 1 : 0) + (o.k || '') + (o.used ? 'u' : '') + (o.stone ? 's' : '') + (o.gold ? 'g' : '') + (o.open ? 'o' : '') + '|' + this.frameKey(f);
    let s = this.cache.get(key); if (s) return s;
    const B = BSPR[k];
    if (B) {
      const P = Pix.mk(B.w + 8, B.h + 4); P.ox = 4; P.oy = 2;
      B.draw(P, f, o);
      s = Pix.finish(P, { ax: 4 + (B.w >> 1), ay: B.h, sw: 0.42 });
    } else {
      const P = Pix.mk(32, 28); P.ox = 4; P.oy = 4;
      (MSPR[k] || MSPR.rat)(P, f, o);
      const D = MON[k] || {};
      s = Pix.finish(P, { ax: 16, ay: 26, sw: k === 'golem' || k === 'orc' ? 0.38 : 0.3, fly: D.fly || k === 'wisp' || k === 'shade' });
    }
    this.cache.set(key, s); return s;
  },
  // 由裝備推算外觀
  gearOf(P) {
    const g = { a: 'none', t: '', w: 'fist' };
    if (!G || !P.eq) return g;
    const w = P.eq.w != null ? Game.inv(P.eq.w) : null, a = P.eq.a != null ? Game.inv(P.eq.a) : null;
    if (w) g.w = WPN_LOOK[w.k] || ITEMS[w.k].spr || 'sword';
    if (a) { const K = ITEMS[a.k]; g.a = K.look || a.k; g.t = K.tint || ''; }
    return g;
  },
};
const WPN_LOOK = { dagger: 'dagger', shortsword: 'sword', longsword: 'sword', spear: 'spear', axe: 'axe', mace: 'mace', staff: 'staff', greatsword: 'greatsword', warhammer: 'warhammer', rapier: 'rapier', scythe: 'scythe' };
