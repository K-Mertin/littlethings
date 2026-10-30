// 萬軍守城（複製自千軍突圍 rush/js）— 預先畫好的精靈圖（士兵、怪物、裝飾、油桶）
'use strict';

const ART = {};

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function mk(w, h, fn) { const c = mkCanvas(w, h); const g = c.getContext('2d'); fn(g, w, h); return c; }
function flashOf(src) {
  return mk(src.width, src.height, g => {
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillRect(0, 0, src.width, src.height);
  });
}
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
function radial(g, x, y, r, c0, c1, ox, oy) {
  const gr = g.createRadialGradient(x + (ox == null ? -0.35 : ox) * r, y + (oy == null ? -0.4 : oy) * r, r * 0.1, x, y, r * 1.1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr;
}
function lin(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; }

// ---------- 士兵（背面） ----------
function drawSoldier(g, W, H, f) {
  const cx = W / 2, s = H / 100;
  g.save();
  g.translate(cx, 0);
  const sw = f === 0 ? 0 : f === 1 ? 1 : -1;
  // 腿
  for (const side of [-1, 1]) {
    const lift = side * sw * 5 * s;
    g.fillStyle = '#23345a';
    rr(g, side * 9 * s - 6 * s, 62 * s - Math.max(0, lift), 12 * s, 26 * s, 4 * s); g.fill();
    g.fillStyle = '#1a1d24';
    rr(g, side * 9 * s - 7 * s, 84 * s - Math.max(0, lift), 14 * s, 10 * s, 4 * s); g.fill();
  }
  // 手臂（往前持槍，從背後看手肘往外）
  g.fillStyle = '#2f6fd0';
  rr(g, -27 * s, 34 * s, 11 * s, 22 * s, 5 * s); g.fill();
  rr(g, 16 * s, 34 * s, 11 * s, 22 * s, 5 * s); g.fill();
  // 槍（從右肩露出）
  g.fillStyle = '#2b2f36';
  g.save(); g.translate(14 * s, 30 * s); g.rotate(-0.12);
  rr(g, -3 * s, -26 * s, 7 * s, 32 * s, 2 * s); g.fill();
  g.fillStyle = '#4a515c'; rr(g, -2 * s, -26 * s, 3 * s, 28 * s, 1.5 * s); g.fill();
  g.restore();
  // 身體
  g.fillStyle = radial(g, 0, 46 * s, 24 * s, '#5aa2ff', '#1f58b8', -0.3, -0.5);
  rr(g, -19 * s, 30 * s, 38 * s, 36 * s, 10 * s); g.fill();
  // 背包
  g.fillStyle = radial(g, 0, 48 * s, 14 * s, '#9db06a', '#56663a');
  rr(g, -12 * s, 36 * s, 24 * s, 24 * s, 6 * s); g.fill();
  g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, -12 * s, 52 * s, 24 * s, 3 * s, 1 * s); g.fill();
  g.strokeStyle = '#3f4a2a'; g.lineWidth = 2 * s;
  g.beginPath(); g.moveTo(-10 * s, 32 * s); g.lineTo(-9 * s, 38 * s); g.moveTo(10 * s, 32 * s); g.lineTo(9 * s, 38 * s); g.stroke();
  // 腰帶
  g.fillStyle = '#2a2116'; rr(g, -19 * s, 62 * s, 38 * s, 5 * s, 2 * s); g.fill();
  // 脖子
  g.fillStyle = '#e8b48c'; rr(g, -6 * s, 24 * s, 12 * s, 9 * s, 3 * s); g.fill();
  // 頭盔
  g.fillStyle = radial(g, 0, 18 * s, 17 * s, '#7fa0c9', '#2c4a74', -0.35, -0.55);
  ell(g, 0, 18 * s, 17 * s, 15 * s); g.fill();
  g.fillStyle = '#24405f'; rr(g, -18 * s, 22 * s, 36 * s, 5 * s, 2.5 * s); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; ell(g, -6 * s, 10 * s, 6 * s, 3.5 * s); g.fill();
  g.restore();
}

// ---------- 怪物（正面） ----------
function eyes(g, x, y, r, gap, look, angry) {
  for (const sd of [-1, 1]) {
    g.fillStyle = '#fff'; ell(g, x + sd * gap, y, r, r * 1.08); g.fill();
    g.fillStyle = '#1b1430'; ell(g, x + sd * gap + (look || 0) * r * 0.2, y + r * 0.25, r * 0.5, r * 0.55); g.fill();
    g.fillStyle = '#fff'; ell(g, x + sd * gap - r * 0.15, y + r * 0.05, r * 0.16, r * 0.16); g.fill();
  }
  if (angry) {
    g.strokeStyle = '#1b1430'; g.lineWidth = r * 0.42; g.lineCap = 'round';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x + sd * (gap + r * 0.95), y - r * 1.25); g.lineTo(x + sd * (gap - r * 0.75), y - r * 0.8); g.stroke(); }
  }
}
function drawGrunt(g, W, H, f) {
  const s = H / 100, cx = W / 2;
  g.save(); g.translate(cx, 0);
  const sw = f ? 1 : -1;
  // 腳
  g.fillStyle = '#4b2b8f';
  ell(g, -14 * s, 92 * s - (sw > 0 ? 4 * s : 0), 10 * s, 6 * s); g.fill();
  ell(g, 14 * s, 92 * s - (sw < 0 ? 4 * s : 0), 10 * s, 6 * s); g.fill();
  // 手
  g.fillStyle = '#7444d6';
  ell(g, -33 * s, 58 * s + sw * 5 * s, 8 * s, 10 * s); g.fill();
  ell(g, 33 * s, 58 * s - sw * 5 * s, 8 * s, 10 * s); g.fill();
  // 角
  g.fillStyle = '#ffe7b0';
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 12 * s, 26 * s); g.quadraticCurveTo(sd * 22 * s, 10 * s, sd * 24 * s, 4 * s); g.quadraticCurveTo(sd * 20 * s, 18 * s, sd * 22 * s, 30 * s); g.fill(); }
  // 身體
  g.fillStyle = radial(g, 0, 58 * s, 34 * s, '#b48bff', '#5b2fc2');
  ell(g, 0, 58 * s, 31 * s, 34 * s); g.fill();
  g.fillStyle = 'rgba(255,230,255,.28)'; ell(g, 0, 70 * s, 18 * s, 15 * s); g.fill();
  eyes(g, 0, 47 * s, 8.5 * s, 11 * s, 0, true);
  // 嘴
  g.fillStyle = '#2a1240';
  g.beginPath(); g.ellipse(0, 66 * s, 11 * s, 6 * s, 0, 0, Math.PI); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(-7 * s, 66 * s); g.lineTo(-4 * s, 71 * s); g.lineTo(-1 * s, 66 * s); g.fill();
  g.beginPath(); g.moveTo(7 * s, 66 * s); g.lineTo(4 * s, 71 * s); g.lineTo(1 * s, 66 * s); g.fill();
  g.restore();
}
function drawRunner(g, W, H, f) {
  const s = H / 100, cx = W / 2;
  g.save(); g.translate(cx, 0);
  const sw = f ? 1 : -1;
  g.fillStyle = '#8f2318';
  ell(g, -11 * s, 93 * s - (sw > 0 ? 7 * s : 0), 8 * s, 5 * s); g.fill();
  ell(g, 11 * s, 93 * s - (sw < 0 ? 7 * s : 0), 8 * s, 5 * s); g.fill();
  g.fillStyle = '#d8402c';
  rr(g, -15 * s, 70 * s, 9 * s, 22 * s, 4 * s); g.fill(); rr(g, 6 * s, 70 * s, 9 * s, 22 * s, 4 * s); g.fill();
  // 耳朵
  g.fillStyle = '#ff7a5c';
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 14 * s, 30 * s); g.lineTo(sd * 34 * s, 12 * s); g.lineTo(sd * 22 * s, 40 * s); g.fill(); }
  g.fillStyle = radial(g, 0, 50 * s, 26 * s, '#ff8f6b', '#c3301f');
  ell(g, 0, 50 * s, 23 * s, 27 * s); g.fill();
  // 手臂往後擺
  g.fillStyle = '#c3301f';
  ell(g, -25 * s, 58 * s - sw * 6 * s, 6 * s, 8 * s); g.fill();
  ell(g, 25 * s, 58 * s + sw * 6 * s, 6 * s, 8 * s); g.fill();
  eyes(g, 0, 44 * s, 7 * s, 9 * s, 0, true);
  g.strokeStyle = '#3a0c08'; g.lineWidth = 3 * s; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-8 * s, 60 * s); g.quadraticCurveTo(0, 66 * s, 8 * s, 60 * s); g.stroke();
  g.restore();
}
function drawBrute(g, W, H, f) {
  const s = H / 100, cx = W / 2;
  g.save(); g.translate(cx, 0);
  const sw = f ? 1 : -1;
  g.fillStyle = '#2f6b2a';
  ell(g, -20 * s, 93 * s - (sw > 0 ? 3 * s : 0), 14 * s, 7 * s); g.fill();
  ell(g, 20 * s, 93 * s - (sw < 0 ? 3 * s : 0), 14 * s, 7 * s); g.fill();
  // 大手
  g.fillStyle = radial(g, -38 * s, 62 * s, 14 * s, '#8fe07f', '#3a8a32');
  ell(g, -40 * s, 62 * s + sw * 3 * s, 12 * s, 17 * s); g.fill();
  g.fillStyle = radial(g, 38 * s, 62 * s, 14 * s, '#8fe07f', '#3a8a32');
  ell(g, 40 * s, 62 * s - sw * 3 * s, 12 * s, 17 * s); g.fill();
  g.fillStyle = radial(g, 0, 55 * s, 40 * s, '#9be68a', '#3c8f34');
  ell(g, 0, 56 * s, 36 * s, 38 * s); g.fill();
  g.fillStyle = 'rgba(255,255,220,.25)'; ell(g, 0, 70 * s, 22 * s, 18 * s); g.fill();
  // 頭頂刺
  g.fillStyle = '#e9e3c4';
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 9 * s - 4 * s, 22 * s + Math.abs(i) * 2 * s); g.lineTo(i * 9 * s, 12 * s + Math.abs(i) * 3 * s); g.lineTo(i * 9 * s + 4 * s, 22 * s + Math.abs(i) * 2 * s); g.fill(); }
  eyes(g, 0, 40 * s, 6 * s, 10 * s, 0, true);
  g.fillStyle = '#1d3a19';
  rr(g, -14 * s, 54 * s, 28 * s, 9 * s, 4 * s); g.fill();
  g.fillStyle = '#fffbe8';
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 10 * s, 58 * s); g.lineTo(sd * 8 * s, 47 * s); g.lineTo(sd * 5 * s, 58 * s); g.fill(); }
  g.restore();
}
function drawShield(g, W, H, f) {
  const s = H / 100, cx = W / 2;
  g.save(); g.translate(cx, 0);
  const sw = f ? 1 : -1;
  g.fillStyle = '#3c4256';
  ell(g, -12 * s, 93 * s - (sw > 0 ? 4 * s : 0), 9 * s, 5 * s); g.fill();
  ell(g, 12 * s, 93 * s - (sw < 0 ? 4 * s : 0), 9 * s, 5 * s); g.fill();
  // 頭
  g.fillStyle = radial(g, 0, 26 * s, 18 * s, '#c9d3ef', '#6a7594');
  ell(g, 0, 26 * s, 17 * s, 16 * s); g.fill();
  g.fillStyle = '#596384'; rr(g, -18 * s, 12 * s, 36 * s, 8 * s, 4 * s); g.fill();
  eyes(g, 0, 28 * s, 5 * s, 7 * s, 0, true);
  // 盾
  g.fillStyle = lin(g, 0, 36 * s, 0, 92 * s, ['#9fb0d0', '#5c6c8f']);
  rr(g, -30 * s, 36 * s, 60 * s, 54 * s, 9 * s); g.fill();
  g.strokeStyle = '#ffd25c'; g.lineWidth = 3.5 * s; rr(g, -26 * s, 40 * s, 52 * s, 46 * s, 7 * s); g.stroke();
  g.fillStyle = '#ffd25c';
  g.beginPath(); g.moveTo(0, 50 * s); g.lineTo(10 * s, 60 * s); g.lineTo(0, 76 * s); g.lineTo(-10 * s, 60 * s); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.25)'; rr(g, -26 * s, 40 * s, 20 * s, 8 * s, 4 * s); g.fill();
  g.restore();
}

// ---------- 油桶 ----------
function drawBarrel(g, W, H) {
  const s = H / 100, cx = W / 2;
  g.fillStyle = lin(g, cx - 30 * s, 0, cx + 30 * s, 0, ['#8f1d1d', '#e84a3a', '#ff7b63', '#c23128', '#7a1414']);
  rr(g, cx - 30 * s, 14 * s, 60 * s, 82 * s, 8 * s); g.fill();
  g.fillStyle = '#5a1010';
  for (const y of [30, 66]) { rr(g, cx - 31 * s, y * s, 62 * s, 5 * s, 2 * s); g.fill(); }
  g.fillStyle = '#ffd34d';
  g.beginPath(); g.moveTo(cx, 40 * s); g.lineTo(cx + 12 * s, 60 * s); g.lineTo(cx - 12 * s, 60 * s); g.closePath(); g.fill();
  g.fillStyle = '#7a1414'; g.font = `900 ${14 * s}px sans-serif`; g.textAlign = 'center'; g.fillText('!', cx, 58 * s);
  g.fillStyle = radial(g, cx, 14 * s, 30 * s, '#ff8b78', '#a3221a', 0, 0);
  ell(g, cx, 15 * s, 30 * s, 8 * s); g.fill();
  g.fillStyle = '#5a1010'; ell(g, cx + 10 * s, 14 * s, 5 * s, 2 * s); g.fill();
}

// ---------- 路邊裝飾 ----------
const DECOR = {
  tree: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    g.fillStyle = lin(g, cx - 5 * s, 0, cx + 5 * s, 0, ['#6b4426', '#9b6a3e', '#5a3820']);
    rr(g, cx - 5 * s, 60 * s, 10 * s, 40 * s, 3 * s); g.fill();
    const blobs = [[0, 42, 30], [-18, 52, 20], [18, 52, 20], [-8, 26, 20], [10, 30, 18]];
    for (const [x, y, r] of blobs) { g.fillStyle = radial(g, cx + x * s, y * s, r * s, '#9be36f', '#2f8a3a'); ell(g, cx + x * s, y * s, r * s, r * s * 0.95); g.fill(); }
  },
  bush: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    for (const [x, y, r] of [[-22, 72, 22], [20, 72, 22], [0, 62, 28]]) { g.fillStyle = radial(g, cx + x * s, y * s, r * s, '#86d36a', '#2f7a33'); ell(g, cx + x * s, y * s, r * s, r * s * 0.85); g.fill(); }
    g.fillStyle = '#ff6fae'; for (const [x, y] of [[-20, 62], [8, 52], [24, 68]]) { ell(g, cx + x * s, y * s, 4 * s, 4 * s); g.fill(); }
  },
  flower: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    const cols = ['#ff6b9a', '#ffd23f', '#ffffff', '#ff9f43', '#b18cff'];
    for (let i = 0; i < 9; i++) {
      const x = cx + (i % 3 - 1) * 26 * s + (i * 7 % 5) * s, y = 60 * s + Math.floor(i / 3) * 14 * s;
      g.strokeStyle = '#3c8f3a'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 18 * s); g.stroke();
      g.fillStyle = cols[i % cols.length]; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ell(g, x + Math.cos(a) * 4 * s, y + Math.sin(a) * 4 * s, 3.5 * s, 3.5 * s); g.fill(); }
      g.fillStyle = '#ffe066'; ell(g, x, y, 2.5 * s, 2.5 * s); g.fill();
    }
  },
  rock: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    g.fillStyle = radial(g, cx, 70 * s, 40 * s, '#c8c3ba', '#6c675f');
    g.beginPath(); g.moveTo(cx - 42 * s, 98 * s); g.lineTo(cx - 34 * s, 62 * s); g.lineTo(cx - 8 * s, 44 * s); g.lineTo(cx + 22 * s, 50 * s); g.lineTo(cx + 42 * s, 74 * s); g.lineTo(cx + 40 * s, 98 * s); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(cx - 30 * s, 64 * s); g.lineTo(cx - 8 * s, 48 * s); g.lineTo(cx + 4 * s, 56 * s); g.closePath(); g.fill();
  },
  windmill: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    g.fillStyle = lin(g, cx - 12 * s, 0, cx + 12 * s, 0, ['#d8cfc0', '#fff8ea', '#b8ad9c']);
    g.beginPath(); g.moveTo(cx - 8 * s, 30 * s); g.lineTo(cx + 8 * s, 30 * s); g.lineTo(cx + 14 * s, 100 * s); g.lineTo(cx - 14 * s, 100 * s); g.closePath(); g.fill();
    g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(cx - 11 * s, 31 * s); g.lineTo(cx, 18 * s); g.lineTo(cx + 11 * s, 31 * s); g.fill();
    g.strokeStyle = '#7a5a3a'; g.lineWidth = 3 * s;
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(cx, 28 * s); g.lineTo(cx + Math.cos(a) * 30 * s, 28 * s + Math.sin(a) * 30 * s); g.stroke();
      g.fillStyle = 'rgba(255,250,235,.9)'; g.save(); g.translate(cx, 28 * s); g.rotate(a); g.fillRect(8 * s, 0, 22 * s, 7 * s); g.restore(); }
    g.fillStyle = '#5a4030'; ell(g, cx, 28 * s, 3 * s, 3 * s); g.fill();
  },
  cactus: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    const col = lin(g, cx - 10 * s, 0, cx + 10 * s, 0, ['#2f8a4a', '#6bd17a', '#2a7a40']);
    g.fillStyle = col; rr(g, cx - 9 * s, 22 * s, 18 * s, 78 * s, 9 * s); g.fill();
    rr(g, cx - 28 * s, 42 * s, 10 * s, 28 * s, 5 * s); g.fill(); rr(g, cx - 28 * s, 62 * s, 22 * s, 9 * s, 4 * s); g.fill();
    rr(g, cx + 18 * s, 34 * s, 10 * s, 26 * s, 5 * s); g.fill(); rr(g, cx + 6 * s, 52 * s, 22 * s, 9 * s, 4 * s); g.fill();
    g.fillStyle = '#ff7aa8'; ell(g, cx, 22 * s, 5 * s, 4 * s); g.fill();
  },
  skull: (g, W, H) => { // 沙漠的骨頭改成小沙丘＋草
    const s = H / 100, cx = W / 2;
    g.fillStyle = radial(g, cx, 90 * s, 40 * s, '#f3d495', '#c99c56');
    g.beginPath(); g.ellipse(cx, 98 * s, 42 * s, 18 * s, 0, Math.PI, 0); g.fill();
    g.strokeStyle = '#9b8a3a'; g.lineWidth = 2.5 * s;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * 5 * s, 84 * s); g.lineTo(cx + i * 8 * s, 66 * s - Math.abs(i) * 2 * s); g.stroke(); }
  },
  palm: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 8 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx + 6 * s, 100 * s); g.quadraticCurveTo(cx - 10 * s, 60 * s, cx, 22 * s); g.stroke();
    g.fillStyle = '#3aa356';
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; g.save(); g.translate(cx, 22 * s); g.rotate(a + Math.PI / 2);
      g.beginPath(); g.ellipse(0, -18 * s, 6 * s, 20 * s, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = '#6b3f1a'; ell(g, cx - 4 * s, 26 * s, 4 * s, 4 * s); g.fill(); ell(g, cx + 4 * s, 27 * s, 4 * s, 4 * s); g.fill();
  },
  mesa: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    g.fillStyle = lin(g, 0, 30 * s, 0, 100 * s, ['#e08a4a', '#b65a2c', '#8f4220']);
    g.beginPath(); g.moveTo(cx - 46 * s, 100 * s); g.lineTo(cx - 36 * s, 34 * s); g.lineTo(cx + 34 * s, 30 * s); g.lineTo(cx + 46 * s, 100 * s); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,220,170,.35)'; g.fillRect(cx - 36 * s, 34 * s, 70 * s, 6 * s);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (const y of [56, 76]) g.fillRect(cx - 42 * s, y * s, 86 * s, 3 * s);
  },
  pine: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    g.fillStyle = '#6b4426'; g.fillRect(cx - 4 * s, 82 * s, 8 * s, 18 * s);
    for (let k = 0; k < 3; k++) {
      const y = 22 + k * 20, w = 18 + k * 9;
      g.fillStyle = lin(g, cx - w * s, 0, cx + w * s, 0, ['#1f5a46', '#2f8a68', '#1a4e3c']);
      g.beginPath(); g.moveTo(cx, (y - 14) * s); g.lineTo(cx + w * s, (y + 24) * s); g.lineTo(cx - w * s, (y + 24) * s); g.closePath(); g.fill();
      g.fillStyle = '#f4f9ff';
      g.beginPath(); g.moveTo(cx, (y - 14) * s); g.lineTo(cx + w * 0.45 * s, (y + 3) * s); g.lineTo(cx, y * s); g.lineTo(cx - w * 0.45 * s, (y + 3) * s); g.closePath(); g.fill();
    }
  },
  snowman: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    g.fillStyle = radial(g, cx, 76 * s, 24 * s, '#ffffff', '#c7d6ea'); ell(g, cx, 78 * s, 23 * s, 21 * s); g.fill();
    g.fillStyle = radial(g, cx, 44 * s, 17 * s, '#ffffff', '#c7d6ea'); ell(g, cx, 46 * s, 16 * s, 15 * s); g.fill();
    g.fillStyle = '#222'; ell(g, cx - 5 * s, 42 * s, 2 * s, 2 * s); g.fill(); ell(g, cx + 5 * s, 42 * s, 2 * s, 2 * s); g.fill();
    g.fillStyle = '#ff8a2a'; g.beginPath(); g.moveTo(cx, 47 * s); g.lineTo(cx + 10 * s, 49 * s); g.lineTo(cx, 50 * s); g.fill();
    g.fillStyle = '#d83a3a'; rr(g, cx - 15 * s, 54 * s, 30 * s, 6 * s, 3 * s); g.fill();
    g.fillStyle = '#2b2b33'; rr(g, cx - 12 * s, 22 * s, 24 * s, 12 * s, 2 * s); g.fill(); rr(g, cx - 17 * s, 32 * s, 34 * s, 4 * s, 2 * s); g.fill();
  },
  ice: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    const shard = (x, w, h) => { g.fillStyle = lin(g, cx + (x - w) * s, 0, cx + (x + w) * s, 0, ['#9fd8ff', '#e8f8ff', '#6fb7e8']); g.beginPath(); g.moveTo(cx + (x - w) * s, 100 * s); g.lineTo(cx + x * s, (100 - h) * s); g.lineTo(cx + (x + w) * s, 100 * s); g.closePath(); g.fill(); };
    shard(-16, 10, 46); shard(12, 12, 66); shard(0, 9, 34); shard(26, 7, 30);
  },
  lamp: (g, W, H) => {
    const s = H / 100, cx = W / 2;
    g.fillStyle = '#3a3f55'; g.fillRect(cx - 2.5 * s, 14 * s, 5 * s, 86 * s);
    g.fillRect(cx - 16 * s, 12 * s, 18 * s, 4 * s);
    g.fillStyle = radial(g, cx - 14 * s, 18 * s, 10 * s, 'rgba(255,240,180,1)', 'rgba(255,200,80,0)', 0, 0);
    ell(g, cx - 14 * s, 18 * s, 10 * s, 10 * s); g.fill();
    g.fillStyle = '#fff7c2'; ell(g, cx - 14 * s, 17 * s, 4 * s, 3 * s); g.fill();
  },
  building: (g, W, H, v) => {
    const s = H / 100, cx = W / 2;
    const cols = [['#3a2f6a', '#22193f'], ['#2a4a6a', '#152a40'], ['#5a2a5a', '#2f1530']][v % 3];
    g.fillStyle = lin(g, cx - 40 * s, 0, cx + 40 * s, 0, [cols[0], cols[1]]);
    g.fillRect(cx - 40 * s, 6 * s, 80 * s, 94 * s);
    const wc = ['#ffe680', '#7df9ff', '#ff8ad8'][v % 3];
    for (let y = 12; y < 92; y += 9) for (let x = -34; x < 32; x += 11) {
      if (((x * 7 + y * 13 + v * 31) % 5) < 2) continue;
      g.fillStyle = wc; g.globalAlpha = 0.85; g.fillRect(cx + x * s, y * s, 6 * s, 5 * s); g.globalAlpha = 1;
    }
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(cx - 40 * s, 6 * s, 10 * s, 94 * s);
  },
  sign: (g, W, H, v) => {
    const s = H / 100, cx = W / 2;
    g.fillStyle = '#2a2d3c'; g.fillRect(cx - 3 * s, 50 * s, 6 * s, 50 * s);
    const c = ['#ff4fd8', '#3ff2ff', '#ffe14f'][v % 3];
    g.strokeStyle = c; g.lineWidth = 4 * s; g.shadowColor = c; g.shadowBlur = 12 * s;
    rr(g, cx - 30 * s, 20 * s, 60 * s, 30 * s, 6 * s); g.stroke();
    g.fillStyle = c; g.font = `900 ${18 * s}px "Noto Sans TC",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(['夜市', 'GO!', '★★'][v % 3], cx, 36 * s);
    g.shadowBlur = 0;
  },
};
const DECOR_SIZE = { tree: [3.2, 3.6], bush: [1.6, 1.2], flower: [1.8, 1.0], rock: [1.8, 1.2], windmill: [4.2, 6.5], cactus: [1.6, 2.6], skull: [2.4, 1.4],
  palm: [3.6, 4.6], mesa: [7, 5.5], pine: [3.2, 4.2], snowman: [1.4, 2], ice: [2, 2.2], lamp: [2.4, 4.4], building: [8, 9], sign: [2.4, 3.6] };

function buildArt() {
  const SH = 112;
  ART.barrel = mk(96, 112, drawBarrel);
  ART.decor = {};
  for (const k in DECOR) {
    const [ww, hh] = DECOR_SIZE[k];
    const H = k === 'building' ? 220 : 150, W = Math.round(H * ww / hh);
    ART.decor[k] = [0, 1, 2].map(v => mk(W, H, (g, w, h) => DECOR[k](g, w, h, v)));
  }
  if (typeof buildChars === 'function') buildChars();
  if (typeof buildScene === 'function') buildScene();
  if (typeof buildHaz === 'function') buildHaz();
  if (typeof buildDefArt === 'function') buildDefArt();
  if (typeof buildVolc === 'function') buildVolc();
  if (typeof buildSky === 'function') buildSky();
}
