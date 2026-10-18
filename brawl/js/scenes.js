'use strict';
/* ------------------------------ drawing ------------------------------ */
const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function drawSky(c, top, bot, stops) { const g = c.createLinearGradient(0, top, 0, bot); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); c.fillStyle = g; c.fillRect(W.camX - 4, top, Wv + 8, bot - top); }

const SHOPS = [
  { n: '早餐店', sc: '#e8432f', tc: '#fff', kind: 'griddle' }, { n: '雞排', sc: '#ff9a1f', tc: '#3a1a00', kind: 'fryer' }, { n: '珍珠奶茶', sc: '#2f9a6a', tc: '#fff', kind: 'cups' },
  { n: '豆花', sc: '#fff3d0', tc: '#9a3a1a', kind: 'bowls' }, { n: '滷肉飯', sc: '#c0392b', tc: '#ffe28a', kind: 'bowls' }, { n: '剉冰', sc: '#3fa9ff', tc: '#fff', kind: 'ice' },
  { n: '機車行', sc: '#2d3a6e', tc: '#ffe28a', kind: 'tires' }, { n: '文具行', sc: '#ffd34d', tc: '#2d2440', kind: 'shelves' }, { n: '水果行', sc: '#38a35a', tc: '#fff', kind: 'fruit' },
  { n: '便當', sc: '#e8432f', tc: '#fff', kind: 'bowls' }, { n: '麵線', sc: '#8a3a2a', tc: '#ffe28a', kind: 'griddle' }, { n: '五金行', sc: '#5a6170', tc: '#fff', kind: 'shelves' }
];
const VSIGNS = ['牙醫診所', '美語補習班', '鋼琴教室', '自助餐', '眼鏡行', '中醫', '美髮', '咖啡', '書法教室', '電器行', '小吃', '民宿'];
const WALLS = ['#ece6da', '#dfccae', '#cfdcd4', '#eacbb9', '#d3d7df', '#e6dcc0', '#d8c6d6'];
const TEMPLE_X = 3640;
const wrap = (i, n) => ((i % n) + n) % n;

function drawScooter(c, x, y, col, dir) {
  c.save(); c.translate(x, y); c.scale(dir, 1); c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-22, -6); c.quadraticCurveTo(-26, -20, -12, -22); c.lineTo(4, -22); c.lineTo(10, -12); c.lineTo(16, -12); c.lineTo(20, -34); c.lineTo(26, -34); c.lineTo(24, -10); c.quadraticCurveTo(22, -2, 14, -2); c.lineTo(-18, -2); c.closePath();
  c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#2b2733'; c.beginPath(); c.roundRect ? c.roundRect(-20, -27, 22, 6, 3) : c.rect(-20, -27, 22, 6); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(22, -34); c.lineTo(16, -38); c.lineWidth = 3; c.stroke();
  c.fillStyle = '#fff3b8'; c.beginPath(); c.arc(25, -27, 2.5, 0, TAU); c.fill(); c.lineWidth = 1.5; c.stroke();
  for (const wx of [-15, 18]) { c.beginPath(); c.arc(wx, 0, 6.5, 0, TAU); c.fillStyle = '#2b2733'; c.fill(); c.lineWidth = 2; c.stroke(); c.beginPath(); c.arc(wx, 0, 2.5, 0, TAU); c.fillStyle = '#c9ced8'; c.fill(); }
  c.restore();
}
function drawLantern(c, x, y, s = 1) {
  c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y - 12 * s); c.lineTo(x, y - 9 * s); c.stroke();
  c.fillStyle = '#d93a2b'; c.beginPath(); c.ellipse(x, y, 9 * s, 10 * s, 0, 0, TAU); c.fill(); c.lineWidth = 2; c.stroke();
  c.fillStyle = '#ffcc33'; c.fillRect(x - 5 * s, y - 11 * s, 10 * s, 3 * s); c.fillRect(x - 5 * s, y + 8 * s, 10 * s, 3 * s);
  c.strokeStyle = 'rgba(28,26,46,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 9 * s); c.lineTo(x, y + 9 * s); c.stroke();
}
function drawShopInside(c, x, sh, i) {
  const ix = x + 28, iw = 184, top = 248;
  c.fillStyle = '#4a4152'; c.fillRect(ix, top, iw, 66);
  c.fillStyle = 'rgba(255,240,190,.35)'; c.fillRect(ix, top, iw, 8);
  c.strokeStyle = INK; c.lineWidth = 2;
  switch (sh.kind) {
    case 'griddle': c.fillStyle = '#fff'; c.fillRect(ix + 100, top + 6, 70, 30); c.strokeRect(ix + 100, top + 6, 70, 30); c.fillStyle = '#c0392b'; for (let k = 0; k < 4; k++) c.fillRect(ix + 106, top + 11 + k * 6, 40 + (k * 13) % 17, 2.5);
      c.fillStyle = '#b8bcc6'; c.fillRect(ix + 6, top + 36, 90, 30); c.strokeRect(ix + 6, top + 36, 90, 30); c.fillStyle = '#ffd88a'; for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(ix + 24 + k * 26, top + 36, 9, 3, 0, 0, TAU); c.fill(); }
      for (let k = 0; k < 3; k++) { c.fillStyle = '#e8432f'; c.fillRect(ix + 110 + k * 22, top + 52, 12, 4); c.fillRect(ix + 114 + k * 22, top + 56, 4, 10); } break;
    case 'fryer': c.fillStyle = '#c9ced8'; c.fillRect(ix + 10, top + 30, 110, 36); c.strokeRect(ix + 10, top + 30, 110, 36); c.fillStyle = '#e8a33a'; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(ix + 24 + k * 20, top + 28, 9, 5, 0.2, 0, TAU); c.fill(); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.35)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(ix + 40 + k * 26, top + 12 - (i % 3), 6, 0, TAU); c.fill(); } break;
    case 'cups': c.fillStyle = '#e9e2d0'; c.fillRect(ix + 4, top + 34, iw - 8, 32); c.strokeRect(ix + 4, top + 34, iw - 8, 32);
      for (let k = 0; k < 7; k++) { const cx2 = ix + 16 + k * 24; c.fillStyle = k % 2 ? '#c8935a' : '#e9c9a0'; c.fillRect(cx2, top + 14, 14, 20); c.strokeRect(cx2, top + 14, 14, 20); c.fillStyle = '#2b2733'; c.fillRect(cx2 + 2, top + 28, 10, 4); c.fillRect(cx2 + 6, top + 6, 3, 9); } break;
    case 'bowls': c.fillStyle = '#c9a27a'; c.fillRect(ix + 4, top + 36, iw - 8, 30); c.strokeRect(ix + 4, top + 36, iw - 8, 30);
      for (let k = 0; k < 5; k++) { c.fillStyle = '#fff'; c.beginPath(); c.arc(ix + 26 + k * 34, top + 32, 10, 0, Math.PI); c.fill(); c.stroke(); c.fillStyle = sh.n === '豆花' ? '#f3e2b0' : '#7a3a1a'; c.fillRect(ix + 17 + k * 34, top + 30, 18, 3); }
      c.fillStyle = '#fff6d6'; c.fillRect(ix + 40, top + 4, 100, 20); c.strokeRect(ix + 40, top + 4, 100, 20); break;
    case 'ice': c.fillStyle = '#d6f0ff'; c.fillRect(ix + 4, top + 36, iw - 8, 30); c.strokeRect(ix + 4, top + 36, iw - 8, 30);
      for (let k = 0; k < 5; k++) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(ix + 18 + k * 34, top + 34); c.lineTo(ix + 28 + k * 34, top + 14); c.lineTo(ix + 38 + k * 34, top + 34); c.closePath(); c.fill(); c.stroke(); c.fillStyle = ['#ff5a7a', '#ffcc33', '#38d39f', '#7d5ab8', '#ff8a3d'][k]; c.beginPath(); c.arc(ix + 28 + k * 34, top + 22, 4, 0, TAU); c.fill(); } break;
    case 'tires': for (let k = 0; k < 4; k++) for (let r = 0; r < 3; r++) { c.fillStyle = '#2b2733'; c.beginPath(); c.ellipse(ix + 20 + k * 22, top + 58 - r * 12, 10, 6, 0, 0, TAU); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#6a6f80'; c.stroke(); }
      drawScooter(c, ix + 140, top + 64, ['#ff5a4a', '#3fa9ff', '#ffd34d'][i % 3], -1); break;
    case 'shelves': for (let r = 0; r < 3; r++) { c.fillStyle = '#8a6a4a'; c.fillRect(ix + 6, top + 20 + r * 16, iw - 12, 3); for (let k = 0; k < 14; k++) { c.fillStyle = ['#ff5a4a', '#3fa9ff', '#ffd34d', '#38d39f', '#fff'][(k + r * 2 + i) % 5]; c.fillRect(ix + 10 + k * 12, top + 8 + r * 16, 9, 12); } } break;
    case 'fruit': c.fillStyle = '#9a7a52'; c.beginPath(); c.moveTo(ix + 4, top + 66); c.lineTo(ix + 20, top + 30); c.lineTo(ix + iw - 20, top + 30); c.lineTo(ix + iw - 4, top + 66); c.closePath(); c.fill(); c.stroke();
      for (let k = 0; k < 16; k++) { c.fillStyle = ['#ff5a4a', '#ffcc33', '#38d39f', '#ff9a3c'][(k >> 2) % 4]; c.beginPath(); c.arc(ix + 26 + (k % 8) * 18, top + 34 + (k >> 3) * 12, 6.5, 0, TAU); c.fill(); c.lineWidth = 1.5; c.stroke(); } break;
  }
}
function drawBuilding(c, i) {
  const x = i * 240, h = hash(i * 3.3), wall = WALLS[wrap(i, WALLS.length)], top = 64 + h * 56;
  // rooftop extras
  if (hash(i + 21) > 0.55) {
    const col = hash(i + 4) > 0.5 ? '#5d8fbf' : '#5aa07a';
    c.fillStyle = shade(col, -0.1); c.fillRect(x + 30, top - 34, 140, 34); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x + 30, top - 34, 140, 34);
    c.fillStyle = col; c.beginPath(); c.moveTo(x + 22, top - 32); c.lineTo(x + 100, top - 50); c.lineTo(x + 178, top - 32); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(28,26,46,.3)'; c.lineWidth = 1; for (let k = 0; k < 14; k++) { c.beginPath(); c.moveTo(x + 34 + k * 10, top - 32); c.lineTo(x + 34 + k * 10, top - 2); c.stroke(); }
  } else if (hash(i + 8) > 0.35) {
    const tx = x + 120 + hash(i + 2) * 60; c.strokeStyle = INK; c.lineWidth = 2;
    c.fillStyle = '#8a8f9c'; c.fillRect(tx - 18, top - 20, 4, 20); c.fillRect(tx + 14, top - 20, 4, 20);
    c.fillStyle = '#dfe4ea'; c.fillRect(tx - 20, top - 58, 40, 40); c.strokeRect(tx - 20, top - 58, 40, 40);
    c.beginPath(); c.ellipse(tx, top - 58, 20, 6, 0, 0, TAU); c.fillStyle = '#eef2f6'; c.fill(); c.stroke();
    c.strokeStyle = 'rgba(28,26,46,.25)'; for (const yy of [-48, -36, -26]) { c.beginPath(); c.moveTo(tx - 20, top + yy); c.lineTo(tx + 20, top + yy); c.stroke(); }
  }
  // facade
  c.fillStyle = wall; c.fillRect(x, top, 240, 250 - top); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, top, 240, 250 - top);
  c.strokeStyle = 'rgba(28,26,46,.07)'; c.lineWidth = 1;
  for (let yy = top + 6; yy < 230; yy += 6) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + 240, yy); c.stroke(); }
  c.fillStyle = shade(wall, -0.18); c.fillRect(x, top, 240, 7);
  // windows with iron grilles
  for (let fy = top + 18, r = 0; fy < 188; fy += 54, r++) for (let k = 0; k < 2; k++) {
    const wx = x + 28 + k * 108, wy = fy, ww = 76, wh = 38;
    c.fillStyle = '#6a8fb5'; c.fillRect(wx, wy, ww, wh); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(wx, wy, ww, wh);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(wx + 5, wy + 4, 14, wh - 8);
    // grille sticks out a little
    c.strokeStyle = '#f4f4f0'; c.lineWidth = 2.2; c.strokeRect(wx - 4, wy - 3, ww + 8, wh + 8);
    for (let b = 1; b < 7; b++) { c.beginPath(); c.moveTo(wx - 4 + b * (ww + 8) / 7, wy - 3); c.lineTo(wx - 4 + b * (ww + 8) / 7, wy + wh + 5); c.stroke(); }
    c.beginPath(); c.moveTo(wx - 4, wy + wh / 2); c.lineTo(wx + ww + 4, wy + wh / 2); c.stroke();
    const hk = hash(i * 7 + r * 3 + k);
    if (hk > 0.62) { c.fillStyle = '#e9e9ee'; c.fillRect(wx + 20, wy + wh + 6, 36, 15); c.strokeStyle = INK; c.lineWidth = 1.6; c.strokeRect(wx + 20, wy + wh + 6, 36, 15); c.fillStyle = '#999'; for (let s = 0; s < 5; s++) c.fillRect(wx + 24 + s * 6, wy + wh + 9, 3, 9); }
    else if (hk < 0.25) { c.fillStyle = '#4fae5a'; for (let s = 0; s < 4; s++) { c.beginPath(); c.arc(wx + 6 + s * 20, wy + wh + 2, 8, 0, TAU); c.fill(); } c.fillStyle = '#b8623a'; c.fillRect(wx + 2, wy + wh + 4, ww - 4, 6); }
  }
  // horizontal sign over the arcade
  const sh = SHOPS[wrap(i * 5 + 2, SHOPS.length)];
  c.fillStyle = sh.sc; c.fillRect(x + 22, 196, 196, 32); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x + 22, 196, 196, 32);
  c.fillStyle = sh.tc; c.font = '900 21px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sh.n, x + 120, 213);
  // arcade (騎樓): beam, dark interior, pillars
  c.fillStyle = shade(wall, -0.3); c.fillRect(x, 230, 240, 18); c.strokeRect(x, 230, 240, 18);
  if (hash(i + 17) > 0.78) {
    c.fillStyle = '#4a4152'; c.fillRect(x + 18, 248, 204, 66); c.fillStyle = '#b8bcc6'; c.fillRect(x + 28, 248, 184, 66);
    c.strokeStyle = 'rgba(28,26,46,.35)'; c.lineWidth = 1.5; for (let yy = 252; yy < 314; yy += 5) { c.beginPath(); c.moveTo(x + 28, yy); c.lineTo(x + 212, yy); c.stroke(); }
  } else { c.fillStyle = '#4a4152'; c.fillRect(x + 18, 248, 204, 66); drawShopInside(c, x, sh, i); }
  for (const px of [x, x + 222]) { c.fillStyle = shade(wall, -0.08); c.fillRect(px, 248, 18, 66); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(px, 248, 18, 66); c.fillStyle = 'rgba(28,26,46,.12)'; c.fillRect(px, 296, 18, 18); }
  // vertical signs hanging off the facade
  for (let k = 0; k < 2; k++) {
    if (hash(i * 2 + k + 40) < 0.35) continue;
    const vs = VSIGNS[wrap(i * 3 + k * 5, VSIGNS.length)], vx = x + (k ? 214 : 2), vt = top + 14 + k * 30, vh = vs.length * 22 + 12;
    if (vt + vh > 192) continue;
    const cols = [['#fff6e6', '#d9302b'], ['#d9302b', '#ffe28a'], ['#ffd34d', '#2d2440'], ['#2f6fd1', '#fff']][wrap(i + k * 3, 4)];
    c.fillStyle = cols[0]; c.fillRect(vx, vt, 26, vh); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(vx, vt, 26, vh);
    c.fillStyle = cols[1]; c.font = '900 17px "Noto Sans TC",sans-serif'; [...vs].forEach((ch, n) => c.fillText(ch, vx + 13, vt + 16 + n * 22));
  }
}
function drawTemple(c) {
  const X = TEMPLE_X, cx = W.camX; if (cx + Wv < X - 40) return;
  // courtyard wall
  c.fillStyle = '#b5442f'; c.fillRect(X, 210, 1400, 104); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(X, 210, 1400, 104);
  c.fillStyle = '#5a7a5a'; c.fillRect(X - 6, 200, 1412, 12); c.strokeRect(X - 6, 200, 1412, 12);
  for (let x = X + 40; x < X + 1400; x += 160) { c.fillStyle = '#8a2f22'; c.beginPath(); c.arc(x + 30, 258, 18, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = '#ffcc33'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 18, 258); c.lineTo(x + 42, 258); c.moveTo(x + 30, 246); c.lineTo(x + 30, 270); c.stroke(); c.strokeStyle = INK; }
  // main hall
  const hx = 4230, hw = 520, L = hx - hw / 2;
  c.fillStyle = '#c94a34'; c.fillRect(L + 20, 150, hw - 40, 164); c.strokeRect(L + 20, 150, hw - 40, 164);
  // doors
  for (const dx of [-120, 0, 120]) { const w = dx ? 74 : 96; c.fillStyle = '#9a2a1f'; c.fillRect(hx + dx - w / 2, 214, w, 100); c.strokeRect(hx + dx - w / 2, 214, w, 100); c.beginPath(); c.moveTo(hx + dx, 214); c.lineTo(hx + dx, 314); c.stroke();
    c.fillStyle = '#ffcc33'; for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(hx + dx - w / 2 + 9 + k * 9, 228 + r * 18, 2, 0, TAU); c.arc(hx + dx + 9 + k * 9, 228 + r * 18, 2, 0, TAU); c.fill(); } }
  // plaque
  c.fillStyle = '#1f3a6a'; c.fillRect(hx - 60, 172, 120, 34); c.strokeRect(hx - 60, 172, 120, 34); c.strokeStyle = '#ffcc33'; c.strokeRect(hx - 56, 176, 112, 26); c.strokeStyle = INK;
  c.fillStyle = '#ffcc33'; c.font = '900 20px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('福德宮', hx, 190);
  // pillars
  for (let k = 0; k < 6; k++) { const px = L + 30 + k * (hw - 70) / 5; c.fillStyle = '#d9302b'; c.fillRect(px, 150, 14, 164); c.strokeRect(px, 150, 14, 164); c.fillStyle = '#ffcc33'; c.fillRect(px - 2, 150, 18, 8); }
  // swallowtail roof (two tiers)
  const roof = (y, w, h, col) => {
    c.beginPath(); c.moveTo(hx - w / 2 - 30, y - h - 22); c.quadraticCurveTo(hx - w / 2 + 10, y - h + 2, hx - w / 2 + 40, y - h);
    c.lineTo(hx + w / 2 - 40, y - h); c.quadraticCurveTo(hx + w / 2 - 10, y - h + 2, hx + w / 2 + 30, y - h - 22);
    c.lineTo(hx + w / 2 + 14, y - h - 8); c.lineTo(hx + w / 2 + 10, y); c.lineTo(hx - w / 2 - 10, y); c.lineTo(hx - w / 2 - 14, y - h - 8); c.closePath();
    c.fillStyle = col; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
    c.strokeStyle = 'rgba(28,26,46,.25)'; c.lineWidth = 1.5; for (let x = hx - w / 2; x < hx + w / 2; x += 12) { c.beginPath(); c.moveTo(x, y - h + 2); c.lineTo(x + (x - hx) * 0.04, y - 2); c.stroke(); }
    c.fillStyle = '#d94a3a'; c.fillRect(hx - w / 2 + 40, y - h - 7, w - 80, 8); c.lineWidth = 2; c.strokeStyle = INK; c.strokeRect(hx - w / 2 + 40, y - h - 7, w - 80, 8);
  };
  roof(156, hw, 36, '#d0702f');
  roof(108, hw - 140, 40, '#2f8a62');
  // ridge pearl and two little dragons
  c.fillStyle = '#ffcc33'; c.beginPath(); c.arc(hx, 52, 9, 0, TAU); c.fill(); c.lineWidth = 2; c.stroke();
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(hx + s * 18, 60); c.quadraticCurveTo(hx + s * 40, 40, hx + s * 62, 58); c.quadraticCurveTo(hx + s * 80, 48, hx + s * 96, 60); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#38a35a'; c.stroke(); }
  // lantern strings across the plaza
  for (let k = 0; k < 4; k++) { const x0 = X + 40 + k * 340; c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, 120); c.quadraticCurveTo(x0 + 170, 170, x0 + 340, 120); c.stroke(); for (let n = 1; n < 6; n++) { const t = n / 6, ly = (1 - t) * (1 - t) * 120 + 2 * t * (1 - t) * 170 + t * t * 120; drawLantern(c, x0 + 340 * t, ly + 14, 0.9); } }
  // incense burner against the wall
  c.fillStyle = '#b08a3a'; c.beginPath(); c.moveTo(hx - 34, 300); c.lineTo(hx + 34, 300); c.lineTo(hx + 26, 326); c.lineTo(hx - 26, 326); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#c9a24a'; c.fillRect(hx - 40, 294, 80, 8); c.strokeRect(hx - 40, 294, 80, 8);
  c.fillStyle = 'rgba(230,230,240,.5)'; for (let k = 0; k < 3; k++) { const yy = 280 - k * 22 - (W.t * 0.3 % 22); c.beginPath(); c.arc(hx + Math.sin((W.t + k * 40) * 0.03) * 6, yy, 6 + k * 2, 0, TAU); c.fill(); }
}
function drawStreet(c) {
  const cx = W.camX;
  drawSky(c, -100, FLOOR_TOP, ['#6ec2ff', '#b2e1ff', '#fff1d4']);
  // mountains
  [[0.06, '#a9cfcc', 210, 50], [0.12, '#86bba0', 236, 40]].forEach(([k, col, base, amp], L) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(cx - 4, 330);
    for (let s = -4; s <= Wv + 24; s += 16) { const wx = s + cx * k + L * 500; c.lineTo(cx + s, base - amp - Math.sin(wx * 0.006) * amp - Math.sin(wx * 0.017 + 2) * amp * 0.4); }
    c.lineTo(cx + Wv + 24, 330); c.closePath(); c.fill();
  });
  // clouds
  for (let i = 0; i < 7; i++) {
    const x = cx + ((i * 360 - cx * 0.08) % (Wv + 400) + Wv + 400) % (Wv + 400) - 200, y = 34 + hash(i) * 70;
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(x, y, 56, 15, 0, 0, TAU); c.ellipse(x + 28, y - 9, 32, 15, 0, 0, TAU); c.ellipse(x - 28, y - 4, 28, 11, 0, 0, TAU); c.fill();
  }
  // far apartment blocks with rooftop sheds and water tanks
  const fx = cx * 0.32, i0 = Math.floor(fx / 96) - 1;
  for (let i = i0; i < i0 + Wv / 96 + 3; i++) {
    const x = cx + i * 96 - fx, hgt = 90 + hash(i) * 100, w = 84, top = 300 - hgt;
    c.fillStyle = hash(i + 3) > 0.5 ? '#c4ced8' : '#d4ccc0'; c.fillRect(x, top, w, hgt + 20);
    c.fillStyle = 'rgba(80,100,130,.35)'; for (let yy = top + 10; yy < 290; yy += 16) for (let xx = x + 8; xx < x + w - 10; xx += 18) c.fillRect(xx, yy, 11, 9);
    if (hash(i + 7) > 0.5) { c.fillStyle = hash(i + 1) > 0.5 ? '#7da6cc' : '#7fb89a'; c.fillRect(x + 10, top - 14, 50, 14); }
    else { c.fillStyle = '#e6eaee'; c.fillRect(x + 50, top - 18, 16, 18); }
  }
  // shop houses (the last stretch is the temple square)
  const i1 = Math.floor(cx / 240) - 1;
  for (let i = i1; i < i1 + Wv / 240 + 3; i++) if (i * 240 + 240 <= TEMPLE_X) drawBuilding(c, i);
  drawTemple(c);
  // utility poles and the famous tangle of wires
  const poles = []; for (let i = Math.floor(cx / 400) - 1; i < cx / 400 + Wv / 400 + 2; i++) if (i * 400 + 330 < TEMPLE_X) poles.push(i * 400 + 330);
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(28,26,46,.75)';
  for (let n = 0; n < poles.length - 1; n++) for (let w = 0; w < 5; w++) { const a = poles[n], b = poles[n + 1], y0 = 70 + w * 9; c.beginPath(); c.moveTo(a, y0); c.quadraticCurveTo((a + b) / 2, y0 + 26 + w * 4, b, y0 + (w % 2) * 4); c.stroke(); }
  for (const x of poles) {
    c.fillStyle = '#9a9a9e'; c.fillRect(x - 5, 56, 10, 260); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x - 5, 56, 10, 260);
    c.fillStyle = '#8a8f9c'; c.fillRect(x - 22, 66, 44, 5); c.strokeRect(x - 22, 66, 44, 5);
    c.fillStyle = '#6a7080'; c.fillRect(x + 6, 120, 22, 30); c.strokeRect(x + 6, 120, 22, 30);
    c.fillStyle = '#ffd34d'; c.fillRect(x - 5, 250, 10, 6); c.fillStyle = INK; c.fillRect(x - 5, 256, 10, 6); c.fillStyle = '#ffd34d'; c.fillRect(x - 5, 262, 10, 6);
  }
  // sidewalk of red bricks, red curb line
  c.fillStyle = '#c98d76'; c.fillRect(cx - 4, 314, Wv + 8, 18);
  c.strokeStyle = 'rgba(90,40,30,.3)'; c.lineWidth = 1.2;
  for (let x = Math.floor(cx / 24) * 24; x < cx + Wv + 24; x += 24) { c.beginPath(); c.moveTo(x, 314); c.lineTo(x, 323); c.moveTo(x + 12, 323); c.lineTo(x + 12, 332); c.stroke(); }
  c.beginPath(); c.moveTo(cx - 4, 323); c.lineTo(cx + Wv + 4, 323); c.stroke();
  // parked scooters
  for (let i = Math.floor(cx / 240) - 1; i < cx / 240 + Wv / 240 + 2; i++) {
    if (i * 240 + 240 > TEMPLE_X) continue;
    for (let k = 0; k < 3; k++) if (hash(i * 4 + k + 60) > 0.4) drawScooter(c, i * 240 + 50 + k * 64, 326, ['#ff5a4a', '#3fa9ff', '#f4f1ea', '#ffd34d', '#38d39f', '#2b2733'][wrap(i * 3 + k, 6)], hash(i + k) > 0.5 ? 1 : -1);
  }
  // road
  const rg = c.createLinearGradient(0, FLOOR_TOP, 0, 540); rg.addColorStop(0, '#74778a'); rg.addColorStop(1, '#585b6c');
  c.fillStyle = rg; c.fillRect(cx - 4, FLOOR_TOP, Wv + 8, 540 - FLOOR_TOP);
  c.fillStyle = '#d93a2b'; c.fillRect(cx - 4, FLOOR_TOP, Wv + 8, 4);
  c.fillStyle = 'rgba(255,255,255,.8)';
  for (let x = Math.floor(cx / 120) * 120; x < cx + Wv + 120; x += 120) if (x < TEMPLE_X - 60) c.fillRect(x, FLOOR_TOP + 82, 60, 5);
  // zebra crossings at the area borders
  for (const zx of [1180, 2380]) if (zx > cx - 140 && zx < cx + Wv + 20) { c.fillStyle = 'rgba(255,255,255,.75)'; for (let z = 8; z < FLOOR_D; z += 22) c.fillRect(zx, FLOOR_TOP + z, 110, 12); }
  // temple square paving
  if (cx + Wv > TEMPLE_X) {
    c.fillStyle = '#c9bca8'; c.fillRect(TEMPLE_X, FLOOR_TOP, 1400, 540 - FLOOR_TOP);
    c.strokeStyle = 'rgba(80,60,40,.22)'; c.lineWidth = 1.5;
    for (let z = 0; z <= FLOOR_D; z += 32) { c.beginPath(); c.moveTo(TEMPLE_X, FLOOR_TOP + z); c.lineTo(TEMPLE_X + 1400, FLOOR_TOP + z); c.stroke(); }
    for (let x = TEMPLE_X; x < TEMPLE_X + 1400; x += 64) { c.beginPath(); c.moveTo(x, FLOOR_TOP); c.lineTo(x, FLOOR_TOP + FLOOR_D); c.stroke(); }
  }
  c.fillStyle = '#c98d76'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
  c.fillStyle = '#d93a2b'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 4);
}

function drawRoof(c) {
  const cx = W.camX;
  drawSky(c, -100, FLOOR_TOP, ['#3b2a6b', '#a7508a', '#ff8a5c', '#ffd28a']);
  c.fillStyle = '#ffe7a3'; c.beginPath(); c.arc(cx + Wv * 0.7 - cx * 0.03, 230, 70, 0, TAU); c.fill();
  [[0.15, '#6a4a8a', 160, 70], [0.35, '#45305f', 110, 90]].forEach(([k, col, hmax, step], L) => {
    const fx = cx * k, i0 = Math.floor(fx / step) - 1;
    for (let i = i0; i < i0 + Wv / step + 3; i++) {
      const x = cx + i * step - fx, h = 60 + hash(i + L * 50) * hmax, w = step - 6, top = 300 - h;
      c.fillStyle = col; c.fillRect(x, top, w, h + 20);
      c.fillStyle = 'rgba(255,214,120,.55)';
      for (let yy = top + 10; yy < 290; yy += 13) for (let xx = x + 6; xx < x + w - 6; xx += 11) if (hash(xx * 0.37 + yy * 1.7) > 0.55) c.fillRect(xx, yy, 5, 6);
    }
  });
  // Taiwanese rooftop: a sheet-metal shed, stainless water tanks, laundry lines, potted plants
  for (let i = Math.floor(cx / 420) - 1; i < cx / 420 + Wv / 420 + 2; i++) {
    const x = i * 420 + 40, kind = wrap(i, 3);
    c.strokeStyle = INK; c.lineWidth = 2;
    if (kind === 0) {
      c.fillStyle = '#6f9cc8'; c.fillRect(x, 200, 200, 96); c.strokeRect(x, 200, 200, 96);
      c.strokeStyle = 'rgba(28,26,46,.3)'; c.lineWidth = 1; for (let k = 0; k < 20; k++) { c.beginPath(); c.moveTo(x + 5 + k * 10, 200); c.lineTo(x + 5 + k * 10, 296); c.stroke(); }
      c.fillStyle = '#4f7fae'; c.beginPath(); c.moveTo(x - 10, 204); c.lineTo(x + 100, 176); c.lineTo(x + 210, 204); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#e8e2d0'; c.fillRect(x + 130, 236, 46, 60); c.strokeRect(x + 130, 236, 46, 60); c.fillStyle = '#ffe28a'; c.fillRect(x + 22, 226, 60, 34); c.strokeRect(x + 22, 226, 60, 34);
    } else if (kind === 1) {
      for (const tx of [x + 30, x + 110]) {
        c.fillStyle = '#7a7f8c'; c.fillRect(tx + 4, 250, 6, 46); c.fillRect(tx + 50, 250, 6, 46); c.fillRect(tx, 248, 60, 6);
        c.fillStyle = '#dfe4ea'; c.fillRect(tx, 178, 60, 72); c.strokeRect(tx, 178, 60, 72);
        c.beginPath(); c.ellipse(tx + 30, 178, 30, 8, 0, 0, TAU); c.fillStyle = '#f3f6f9'; c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(tx + 8, 184, 6, 60);
        c.strokeStyle = 'rgba(28,26,46,.25)'; for (const yy of [200, 222]) { c.beginPath(); c.moveTo(tx, yy); c.lineTo(tx + 60, yy); c.stroke(); } c.strokeStyle = INK;
      }
    } else {
      c.fillStyle = '#7a7f8c'; c.fillRect(x + 10, 214, 5, 84); c.fillRect(x + 230, 214, 5, 84);
      c.beginPath(); c.moveTo(x + 12, 218); c.lineTo(x + 232, 218); c.lineWidth = 2; c.stroke();
      const cl = ['#ff5a4a', '#3fa9ff', '#ffd34d', '#ffffff', '#38d39f'];
      for (let k = 0; k < 6; k++) { const lx = x + 30 + k * 34, sw = Math.sin(W.t * 0.05 + k) * 2; c.fillStyle = cl[(k + i) % 5]; c.beginPath(); c.moveTo(lx, 218); c.lineTo(lx + 24, 218); c.lineTo(lx + 22 + sw, 252); c.lineTo(lx + 2 + sw, 252); c.closePath(); c.fill(); c.stroke(); }
      for (let k = 0; k < 3; k++) { const px = x + 260 + k * 40; c.fillStyle = '#b8623a'; c.fillRect(px, 276, 26, 20); c.strokeRect(px, 276, 26, 20); c.fillStyle = '#4fae5a'; c.beginPath(); c.arc(px + 13, 268, 14, 0, TAU); c.fill(); c.stroke(); }
    }
  }
  // parapet
  c.fillStyle = '#cdb9a4'; c.fillRect(cx - 4, 296, Wv + 8, 36); c.fillStyle = '#e4d3c0'; c.fillRect(cx - 4, 290, Wv + 8, 8);
  c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 4, 290); c.lineTo(cx + Wv + 4, 290); c.stroke();
  // floor tiles with a bit of perspective
  c.fillStyle = '#b9a99a'; c.fillRect(cx - 4, FLOOR_TOP, Wv + 8, 540);
  c.strokeStyle = 'rgba(70,50,60,.25)'; c.lineWidth = 1.5;
  for (let z = 0; z <= FLOOR_D; z += 32) { c.beginPath(); c.moveTo(cx - 4, FLOOR_TOP + z); c.lineTo(cx + Wv + 4, FLOOR_TOP + z); c.stroke(); }
  const mid = cx + Wv / 2;
  for (let x = Math.floor((cx - 200) / 64) * 64; x < cx + Wv + 200; x += 64) { c.beginPath(); c.moveTo(x, FLOOR_TOP); c.lineTo(x + (x - mid) * 0.3, FLOOR_TOP + FLOOR_D + 10); c.stroke(); }
  if (W.arena) { c.fillStyle = '#7d6a5c'; c.fillRect(-60, 280, 60, 260); c.fillRect(W.arena, 280, 60, 260); }
  c.fillStyle = '#8f7f72'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
}

function drawItem(c, it) {
  const x = it.x, gy = FLOOR_TOP + it.z, y = gy - it.y;
  c.fillStyle = 'rgba(20,16,40,.25)'; c.beginPath(); c.ellipse(x, gy, 14, 4, 0, 0, TAU); c.fill();
  c.save(); c.translate(x, y - (it.y > 0 ? 0 : 4)); c.lineCap = 'round';
  const glow = !it.fly && !it.holder && it.y <= 0 && (W.t >> 4) & 1;
  if (it.kind === 'stick') { c.rotate(it.fly ? it.spin : 0); seg(c, [P2(-22, 0), P2(22, 0)], 5, '#b07a3d'); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-16, -1.5, 30, 1.5); }
  else if (it.kind === 'stone') { c.rotate(it.spin || 0); blob(c, 0, -6, 12, 10, '#9a9aa8'); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-4, -10, 4, 2.5, 0, 0, TAU); c.fill(); }
  else if (it.kind === 'milk' || it.kind === 'juice') {
    const tea = it.kind === 'milk' ? '#d9a878' : '#c9822e';
    c.beginPath(); c.moveTo(-8, -24); c.lineTo(8, -24); c.lineTo(6, 0); c.lineTo(-6, 0); c.closePath(); c.fillStyle = 'rgba(255,255,255,.75)'; c.fill();
    c.beginPath(); c.moveTo(-7.6, -19); c.lineTo(7.6, -19); c.lineTo(6, 0); c.lineTo(-6, 0); c.closePath(); c.fillStyle = tea; c.fill();
    if (it.kind === 'milk') { c.fillStyle = '#2b2018'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(-4 + k * 2, -3 - (k & 1) * 2.5, 1.8, 0, TAU); c.fill(); } }
    else { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-5, -16, 3, 12); }
    c.beginPath(); c.moveTo(-8, -24); c.lineTo(8, -24); c.lineTo(6, 0); c.lineTo(-6, 0); c.closePath(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.ellipse(0, -24, 8.5, 3, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.stroke();
    seg(c, [P2(2, -24), P2(5, -34)], 3.2, it.kind === 'milk' ? '#ff5a7a' : '#3fa9ff');
  }
  c.restore();
  if (glow && !it.fly) { c.strokeStyle = 'rgba(255,230,120,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, gy, 18, 5, 0, 0, TAU); c.stroke(); }
}
function drawProj(c, p) {
  const x = p.x, gy = FLOOR_TOP + p.z, y = gy - p.y;
  if (p.kind === 'spikes') return;
  c.fillStyle = 'rgba(20,16,40,.2)'; c.beginPath(); c.ellipse(x, gy, 10, 3, 0, 0, TAU); c.fill();
  c.save(); c.translate(x, y); c.scale(p.face, 1);
  if (p.kind === 'fire') {
    const g = c.createRadialGradient(0, 0, 2, 0, 0, 22); g.addColorStop(0, '#fffbe0'); g.addColorStop(0.4, '#ffb13d'); g.addColorStop(1, 'rgba(255,60,30,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(-4, 0, 26, 18, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(4, 0, 8, 0, TAU); c.fill();
  } else if (p.kind === 'ice') {
    c.rotate(p.t * 0.2); c.beginPath(); c.moveTo(0, -13); c.lineTo(10, 0); c.lineTo(0, 13); c.lineTo(-10, 0); c.closePath();
    c.fillStyle = '#cfefff'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = '#2f6fd1'; c.stroke(); c.fillStyle = '#fff'; c.fillRect(-2, -6, 3, 6);
  } else if (p.kind === 'star') {
    c.rotate(p.t * 0.6); c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i & 1 ? 3 : 10; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
    c.fillStyle = '#c9ced8'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke();
  } else if (p.kind === 'arrow') {
    seg(c, [P2(-18, 0), P2(12, 0)], 2.5, '#a0662f'); c.beginPath(); c.moveTo(18, 0); c.lineTo(10, -5); c.lineTo(10, 5); c.closePath(); c.fillStyle = '#c9ced8'; c.fill(); c.stroke();
    c.fillStyle = '#ff5a4a'; c.fillRect(-20, -4, 6, 3); c.fillRect(-20, 1, 6, 3);
  } else if (p.kind === 'fruit') { c.rotate(p.t * 0.3); blob(c, 0, 0, 7, 7, '#ff5a4a'); c.fillStyle = '#4fae5a'; c.beginPath(); c.ellipse(3, -7, 4, 2, -0.5, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(-2, -2, 2, 0, TAU); c.fill();
  } else if (p.kind === 'rock') { c.rotate(p.t * 0.15); blob(c, 0, 0, 16, 13, '#8e8a98'); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-5, -5, 5, 3, 0, 0, TAU); c.fill(); }
  c.restore();
}
function drawPart(c, p) {
  const k = p.t / p.life, x = p.x, y = FLOOR_TOP + p.z - p.y;
  switch (p.kind) {
    case 'spark': {
      c.save(); c.translate(x, y); c.strokeStyle = p.col || '#fff6b0'; c.lineWidth = 3 * (1 - k) + 1; c.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.3, r0 = 6 + k * 10, r1 = 14 + k * 22; c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke(); }
      if (k < 0.4) { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 9 * (1 - k * 2), 0, TAU); c.fill(); }
      c.restore(); break;
    }
    case 'star': drawStar(c, x, y, 7 * (1 - k) + 2, '#ffd34d'); break;
    case 'dust': case 'smoke': c.fillStyle = p.kind === 'smoke' ? `rgba(230,225,245,${0.7 * (1 - k)})` : `rgba(235,225,205,${0.65 * (1 - k)})`; c.beginPath(); c.arc(x, y, (p.kind === 'smoke' ? 8 : 5) + k * 12, 0, TAU); c.fill(); break;
    case 'fire': c.fillStyle = `rgba(255,${(200 - k * 150) | 0},60,${1 - k})`; c.beginPath(); c.arc(x, y, 7 * (1 - k) + 2, 0, TAU); c.fill(); break;
    case 'snow': c.fillStyle = `rgba(225,245,255,${1 - k})`; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); break;
    case 'ice': c.fillStyle = `rgba(200,236,255,${1 - k})`; c.save(); c.translate(x, y); c.rotate(p.t * 0.3); c.fillRect(-3, -3, 6, 6); c.restore(); break;
    case 'rock': c.fillStyle = p.col || '#8e8a98'; c.fillRect(x - (p.r || 4), y - (p.r || 4), (p.r || 4) * 2, (p.r || 4) * 2); break;
    case 'text': {
      c.globalAlpha = Math.min(1, (1 - k) * 2); c.font = '28px Bangers, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.strokeStyle = INK; c.strokeText(p.txt, x, y - k * 20); c.fillStyle = p.col; c.fillText(p.txt, x, y - k * 20); c.globalAlpha = 1; break;
    }
    case 'ring': c.strokeStyle = `rgba(255,240,200,${1 - k})`; c.lineWidth = 6 * (1 - k) + 1; c.beginPath(); c.ellipse(x, FLOOR_TOP + p.z, p.r + p.t * p.grow, (p.r + p.t * p.grow) * 0.3, 0, 0, TAU); c.stroke(); break;
    case 'slash': {
      c.save(); c.translate(x, y); c.scale(p.face, 1); c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 8 * (1 - k) + 2; c.lineCap = 'round';
      c.beginPath(); c.arc(-10, 0, 40, -1.2, 1.2); c.stroke(); c.strokeStyle = `rgba(255,90,74,${1 - k})`; c.lineWidth = 3; c.beginPath(); c.arc(-14, 0, 40, -1.1, 1.1); c.stroke(); c.restore(); break;
    }
    case 'ghost': if (p.f) { c.save(); c.globalAlpha = 0.35 * (1 - k); c.translate(x, FLOOR_TOP + p.z - p.y); c.scale(p.f.face, 1); drawBody(c, p.f.look, { ...basePose(), lean: 0.55, ar: [1.75, 0], al: [-0.6, 0.6], ll: [-0.9, 0.3], lr: [0.9, 0.7], by: 4 }, null); c.restore(); } break;
    case 'spike': {
      const h = p.h * Math.min(1, p.t / 4) * (k > 0.7 ? (1 - k) / 0.3 : 1);
      c.beginPath(); c.moveTo(x - 8, FLOOR_TOP + p.z); c.lineTo(x - 1, FLOOR_TOP + p.z - h); c.lineTo(x + 8, FLOOR_TOP + p.z); c.closePath();
      c.fillStyle = '#cfefff'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#2f6fd1'; c.stroke(); break;
    }
  }
}

