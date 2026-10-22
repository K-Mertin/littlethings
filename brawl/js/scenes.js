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
  if (MAT) { paint(c, ['mosaic', 'ertile', 'plaster', 'ertile'][wrap(i * 7 + 3, 4)], wall, x, top, 240, 230 - top, 1); streaks(c, x, top + 7, 240, 120, i * 13.1, 0.12); }
  else { c.strokeStyle = 'rgba(28,26,46,.07)'; c.lineWidth = 1;
  for (let yy = top + 6; yy < 230; yy += 6) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + 240, yy); c.stroke(); } }
  c.fillStyle = shade(wall, -0.18); c.fillRect(x, top, 240, 7); aoBand(c, x, top + 7, 240, 8, 0.25);
  // windows with iron grilles
  for (let fy = top + 18, r = 0; fy < 188; fy += 54, r++) for (let k = 0; k < 2; k++) {
    const wx = x + 28 + k * 108, wy = fy, ww = 76, wh = 38;
    c.fillStyle = '#6a8fb5'; c.fillRect(wx, wy, ww, wh); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(wx, wy, ww, wh);
    if (MAT) { const gg = c.createLinearGradient(wx, wy, wx + ww, wy + wh); gg.addColorStop(0, '#8fb4d6'); gg.addColorStop(0.55, '#5f84ab'); gg.addColorStop(1, '#3f5f86'); c.fillStyle = gg; c.fillRect(wx + 1, wy + 1, ww - 2, wh - 2); c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.moveTo(wx + 10, wy + 1); c.lineTo(wx + 30, wy + 1); c.lineTo(wx + 14, wy + wh - 1); c.lineTo(wx + 1, wy + wh - 1); c.lineTo(wx + 1, wy + 14); c.closePath(); c.fill(); streaks(c, wx + 4, wy + wh + 6, ww - 8, 30, i * 5 + r * 3 + k, 0.14); }
    else { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(wx + 5, wy + 4, 14, wh - 8); }
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
  c.fillStyle = sh.sc; paint(c, 'plaster', sh.sc, x + 22, 196, 196, 32, 0.6); if (MAT) { c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x + 23, 197, 194, 4); } c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x + 22, 196, 196, 32);
  c.fillStyle = sh.tc; c.font = '900 21px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sh.n, x + 120, 213);
  // arcade (騎樓): beam, dark interior, pillars
  paint(c, 'plaster', shade(wall, -0.3), x, 230, 240, 18, 0.7); c.strokeRect(x, 230, 240, 18);
  if (hash(i + 17) > 0.78) {
    c.fillStyle = '#4a4152'; c.fillRect(x + 18, 248, 204, 66); c.fillStyle = '#b8bcc6'; c.fillRect(x + 28, 248, 184, 66);
    c.strokeStyle = 'rgba(28,26,46,.35)'; c.lineWidth = 1.5; for (let yy = 252; yy < 314; yy += 5) { c.beginPath(); c.moveTo(x + 28, yy); c.lineTo(x + 212, yy); c.stroke(); }
    if (MAT) { c.save(); c.translate(x + 28, 248); c.rotate(Math.PI / 2); paint(c, 'metal', '#b8bcc6', 0, -184, 66, 184, 0.7); c.restore(); }
  } else { c.fillStyle = '#4a4152'; c.fillRect(x + 18, 248, 204, 66); drawShopInside(c, x, sh, i); }
  if (MAT) { aoBand(c, x + 18, 248, 204, 22, 0.45); const lg = c.createRadialGradient(x + 120, 252, 4, x + 120, 262, 90); lg.addColorStop(0, 'rgba(255,236,170,.22)'); lg.addColorStop(1, 'rgba(255,236,170,0)'); c.fillStyle = lg; c.fillRect(x + 18, 248, 204, 66); }
  for (const px of [x, x + 222]) { paint(c, 'ertile', shade(wall, -0.08), px, 248, 18, 66, 0.8); aoBand(c, px, 248, 18, 10, 0.3); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(px, 248, 18, 66); c.fillStyle = 'rgba(28,26,46,.12)'; c.fillRect(px, 296, 18, 18); }
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
  paint(c, 'brick', '#b5442f', X, 210, 1400, 104, 0.9); aoBand(c, X, 212, 1400, 14, 0.3); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(X, 210, 1400, 104);
  c.fillStyle = '#5a7a5a'; c.fillRect(X - 6, 200, 1412, 12); c.strokeRect(X - 6, 200, 1412, 12);
  for (let x = X + 40; x < X + 1400; x += 160) { c.fillStyle = '#8a2f22'; c.beginPath(); c.arc(x + 30, 258, 18, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = '#ffcc33'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 18, 258); c.lineTo(x + 42, 258); c.moveTo(x + 30, 246); c.lineTo(x + 30, 270); c.stroke(); c.strokeStyle = INK; }
  // main hall
  const hx = 4230, hw = 520, L = hx - hw / 2;
  paint(c, 'plaster', '#c94a34', L + 20, 150, hw - 40, 164, 0.8); aoBand(c, L + 20, 150, hw - 40, 30, 0.35); c.strokeRect(L + 20, 150, hw - 40, 164);
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
/* manhole covers, patched asphalt and oil stains, placed by world position so they scroll with the road */
function roadWear(c, cx, endX) {
  for (let i = Math.floor(cx / 330) - 1; i < cx / 330 + Wv / 330 + 2; i++) {
    const x = i * 330 + hash(i * 3.7) * 200, z = FLOOR_TOP + 24 + hash(i * 5.1) * 110; if (x > endX - 80) continue;
    const kind = hash(i * 9.3);
    if (kind < 0.3) { // patch of newer, darker asphalt
      c.fillStyle = 'rgba(40,40,52,.28)'; c.beginPath(); c.moveTo(x, z); c.lineTo(x + 90, z - 4); c.lineTo(x + 96, z + 26); c.lineTo(x + 6, z + 30); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(20,20,30,.3)'; c.lineWidth = 1.5; c.stroke();
    } else if (kind < 0.55) { // manhole
      c.fillStyle = '#4f5160'; c.beginPath(); c.ellipse(x, z, 26, 9, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(20,20,30,.6)'; c.lineWidth = 2; c.stroke();
      c.strokeStyle = 'rgba(150,150,165,.45)'; c.lineWidth = 1.2; c.beginPath(); for (let k = -2; k <= 2; k++) { c.moveTo(x - 18, z + k * 3); c.lineTo(x + 18, z + k * 3); } c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(x, z - 1, 22, 7, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    } else if (kind < 0.8) { // oil stain
      const g = c.createRadialGradient(x, z, 0, x, z, 30); g.addColorStop(0, 'rgba(30,26,40,.3)'); g.addColorStop(1, 'rgba(30,26,40,0)'); c.save(); c.translate(x, z); c.scale(1, 0.35); c.translate(-x, -z); c.fillStyle = g; c.fillRect(x - 30, z - 30, 60, 60); c.restore();
    }
  }
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
    paint(c, 'plaster', hash(i + 3) > 0.5 ? '#c4ced8' : '#d4ccc0', x, top, w, hgt + 20, 0.5);
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
  paint(c, 'brick', '#c98d76', cx - 4, 314, Wv + 8, 18, 0.9);
  if (MAT) { aoBand(c, cx - 4, 314, Wv + 8, 7, 0.35); }
  else { c.strokeStyle = 'rgba(90,40,30,.3)'; c.lineWidth = 1.2;
  for (let x = Math.floor(cx / 24) * 24; x < cx + Wv + 24; x += 24) { c.beginPath(); c.moveTo(x, 314); c.lineTo(x, 323); c.moveTo(x + 12, 323); c.lineTo(x + 12, 332); c.stroke(); }
  c.beginPath(); c.moveTo(cx - 4, 323); c.lineTo(cx + Wv + 4, 323); c.stroke(); }
  // parked scooters
  for (let i = Math.floor(cx / 240) - 1; i < cx / 240 + Wv / 240 + 2; i++) {
    if (i * 240 + 240 > TEMPLE_X) continue;
    for (let k = 0; k < 3; k++) if (hash(i * 4 + k + 60) > 0.4) drawScooter(c, i * 240 + 50 + k * 64, 326, ['#ff5a4a', '#3fa9ff', '#f4f1ea', '#ffd34d', '#38d39f', '#2b2733'][wrap(i * 3 + k, 6)], hash(i + k) > 0.5 ? 1 : -1);
  }
  // road
  const rg = c.createLinearGradient(0, FLOOR_TOP, 0, 540); rg.addColorStop(0, '#74778a'); rg.addColorStop(1, '#585b6c');
  if (MAT) { floorFill(c, 'street', '#686b7c', cx - 4, FLOOR_TOP, Wv + 8, 540 - FLOOR_TOP); }
  else { c.fillStyle = rg; c.fillRect(cx - 4, FLOOR_TOP, Wv + 8, 540 - FLOOR_TOP); }
  c.fillStyle = '#d93a2b'; c.fillRect(cx - 4, FLOOR_TOP, Wv + 8, 4);
  if (MAT) roadWear(c, cx, TEMPLE_X);
  c.fillStyle = 'rgba(255,255,255,.8)';
  for (let x = Math.floor(cx / 120) * 120; x < cx + Wv + 120; x += 120) if (x < TEMPLE_X - 60) c.fillRect(x, FLOOR_TOP + 82, 60, 5);
  // zebra crossings at the area borders
  for (const zx of [1180, 2380]) if (zx > cx - 140 && zx < cx + Wv + 20) { c.fillStyle = 'rgba(255,255,255,.75)'; for (let z = 8; z < FLOOR_D; z += 22) c.fillRect(zx, FLOOR_TOP + z, 110, 12); }
  // temple square paving
  if (cx + Wv > TEMPLE_X) {
    floorFill(c, 'temple', '#c9bca8', TEMPLE_X, FLOOR_TOP, 1400, 540 - FLOOR_TOP);
    if (!MAT) { c.strokeStyle = 'rgba(80,60,40,.22)'; c.lineWidth = 1.5; } else c.strokeStyle = 'rgba(0,0,0,0)';
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
  floorFill(c, 'roof', '#b9a99a', cx - 4, FLOOR_TOP, Wv + 8, 540);
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
  else if (it.kind === 'umbrella') { c.rotate(it.fly ? it.spin : 0); seg(c, [P2(-26, 0), P2(24, 0)], 3, '#5a4632'); c.beginPath(); c.moveTo(-22, 0); c.quadraticCurveTo(0, -12, 16, 0); c.closePath(); c.fillStyle = '#3fa9ff'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.arc(24, -3, 3, 0, Math.PI); c.stroke(); }
  else if (it.kind === 'slipper') { c.rotate(it.fly ? it.spin : 0); blob(c, 0, -3, 13, 5.5, '#3fa9ff'); c.strokeStyle = '#fff'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-2, -7); c.lineTo(3, -2); c.lineTo(8, -7); c.stroke(); }
  else if (it.kind === 'cracker') { c.rotate(it.fly ? it.spin * 0.5 : 0); drawCracker(c, 0, -8, 1, it.fuse > 0 || it.fly); }
  else if (it.kind === 'chicken') {
    c.beginPath(); c.moveTo(-11, 0); c.lineTo(-13, -22); c.lineTo(13, -22); c.lineTo(11, 0); c.closePath(); c.fillStyle = '#fff6e6'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.ellipse(0, -26, 14, 10, 0, Math.PI, 0); c.fillStyle = '#d98a2e'; c.fill(); c.stroke();
    c.fillStyle = '#b8661a'; for (let k = 0; k < 5; k++) c.fillRect(-9 + k * 4, -30 + (k & 1) * 3, 2, 2);
    c.fillStyle = '#e8432f'; c.font = '900 9px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('雞排', 0, -10);
  }
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
  if (PROJ2[p.kind]) { PROJ2[p.kind](c, p, p.x, FLOOR_TOP + p.z, FLOOR_TOP + p.z - p.y); return; }
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
  } else if (p.kind === 'bolt') { const g = c.createRadialGradient(0, 0, 2, 0, 0, 18); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#ffe14a'); g.addColorStop(1, 'rgba(255,220,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 18, 0, TAU); c.fill(); zigzag(c, -14, 0, 14, 0, '#fff6b0');
  } else if (p.kind === 'tornado') { c.restore(); c.save(); c.translate(x, gy); for (let k = 0; k < 6; k++) { const yy = -k * 12, rr = 8 + k * 4 + Math.sin(p.t * 0.5 + k) * 2; c.strokeStyle = `rgba(230,250,245,${0.85 - k * 0.08})`; c.lineWidth = 3; c.beginPath(); c.ellipse(Math.sin(p.t * 0.3 + k) * 3, yy - 6, rr, 4, 0, 0, TAU); c.stroke(); }
  } else if (p.kind === 'bone') { c.rotate(p.t * 0.5); seg(c, [P2(-10, 0), P2(10, 0)], 4, '#fff6e6'); for (const sx3 of [-10, 10]) { blob(c, sx3, -3, 3.5, 3.5, '#fff6e6'); blob(c, sx3, 3, 3.5, 3.5, '#fff6e6'); }
  } else if (p.kind === 'ball') { blob(c, 0, 0, 8, 8, '#ff7aa8'); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 5, 0.3, 2.2); c.stroke();
  } else if (p.kind === 'ink') { blob(c, 0, 0, 10, 8, '#2b1f3a'); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(-3, -3, 2.5, 0, TAU); c.fill();
  } else if (p.kind === 'bun') { c.rotate(p.t * 0.1); blob(c, 0, 0, 11, 9, '#fff6e6'); c.strokeStyle = 'rgba(28,26,46,.4)'; c.lineWidth = 1.2; c.beginPath(); for (let k = 0; k < 5; k++) { c.moveTo(0, -2); c.lineTo(Math.cos(k * 1.26) * 6, -2 + Math.sin(k * 1.26) * 4); } c.stroke();
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
    case 'bubbleP': { c.save(); c.globalAlpha = 1 - k; c.beginPath(); c.arc(x, y, 4 + k * 4, 0, TAU); c.strokeStyle = '#9fe3ff'; c.lineWidth = 1.6; c.stroke(); c.restore(); break; }
    case 'chain': { // 連鎖閃電: a jagged bolt through every target
      c.save(); c.globalAlpha = 1 - k * k; c.lineJoin = 'round';
      for (const [w, col] of [[9, 'rgba(255,230,90,.5)'], [3, '#fffbe0']]) {
        c.strokeStyle = col; c.lineWidth = w; c.beginPath();
        p.pts.forEach((q, i) => { const X = q.x, Y = FLOOR_TOP + q.z - q.y; if (!i) { c.moveTo(X, Y); return; } const a = p.pts[i - 1], AX = a.x, AY = FLOOR_TOP + a.z - a.y; for (let s = 1; s <= 5; s++) c.lineTo(lerp(AX, X, s / 5) + (s < 5 ? rnd(-10, 10) : 0), lerp(AY, Y, s / 5) + (s < 5 ? rnd(-10, 10) : 0)); });
        c.stroke();
      }
      c.restore(); break;
    }
    case 'burst': { // comic impact star with a word, pops in then shrinks away
      const s = p.t < 3 ? 0.6 + p.t * 0.2 : 1.2 - k * 0.45, r = p.r * s;
      c.save(); c.translate(x, y); c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      c.beginPath(); for (let i = 0; i < 20; i++) { const a = i * TAU / 20 + 0.1, rr = i & 1 ? r * 0.56 : r * (i % 4 === 0 ? 1.12 : 0.92); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath();
      c.fillStyle = p.col; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.arc(0, 0, r * 0.3, 0, TAU); c.fillStyle = '#fff'; c.fill();
      if (p.word) { c.rotate(-0.12); c.font = `900 ${Math.round(r * 0.7)}px "Noto Sans TC",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 5; c.strokeStyle = INK; c.strokeText(p.word, 0, 1); c.fillStyle = '#ff4d3d'; c.fillText(p.word, 0, 1); }
      c.restore(); break;
    }
    case 'puff': { // landing dust: a row of round clouds
      const s = (p.s || 1) * (0.8 + k * 0.5); c.save(); c.globalAlpha = 1 - k * k;
      [[-1, 0.8], [-0.45, 1.1], [0.2, 1], [0.8, 0.85]].forEach(([dx, kk]) => { c.beginPath(); c.arc(x + dx * 24 * s * (1 + k * 0.6), y - 7 * kk * s - k * 6, 10 * kk * s, 0, TAU); c.fillStyle = '#fff8e8'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); });
      c.restore(); break;
    }
    case 'callout': { // the name of a special move above the fighter's head
      const s = p.t < 5 ? 0.7 + p.t * 0.06 : 1; c.save(); c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1; c.translate(x, y - Math.min(p.t, 10)); c.scale(s, s);
      c.font = '900 22px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = INK; c.strokeText(p.txt + '！', 0, 0); c.fillStyle = p.col; c.fillText(p.txt + '！', 0, 0);
      c.restore(); break;
    }
    case 'zap': c.globalAlpha = 1 - k; zigzag(c, x - 8, y - 8, x + 8, y + 8, '#ffe14a'); c.globalAlpha = 1; break;
    case 'wind': c.strokeStyle = `rgba(230,250,245,${1 - k})`; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, 6 + k * 8, 0, Math.PI * 1.3); c.stroke(); break;
    case 'heart': c.globalAlpha = 1 - k; c.fillStyle = '#ff5a7a'; c.font = '20px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♥', x, y); c.globalAlpha = 1; break;
    case 'strike': { const top = y - 420; c.globalAlpha = 1 - k * 0.7; zigzag(c, x + 10, top, x, FLOOR_TOP + p.z - 4, '#fff6b0', 7); zigzag(c, x + 10, top, x, FLOOR_TOP + p.z - 4, '#ffe14a', 3); c.fillStyle = 'rgba(255,240,150,.5)'; c.beginPath(); c.ellipse(x, FLOOR_TOP + p.z, 40, 10, 0, 0, TAU); c.fill(); c.globalAlpha = 1; break; }
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

const THEMES = { street: drawStreet, roof: drawRoof };

/* ------------------------------ battle arenas ------------------------------ */
const STALLS = [
  { n: '雞排', c: '#ff9a1f' }, { n: '珍奶', c: '#2f9a6a' }, { n: '烤香腸', c: '#c0392b' }, { n: '臭豆腐', c: '#7a5a2a' },
  { n: '撈金魚', c: '#3fa9ff' }, { n: '射氣球', c: '#e8432f' }, { n: '蚵仔煎', c: '#d98a2e' }, { n: '地瓜球', c: '#b06ad9' }
];
function zigzag(c, x0, y0, x1, y1, col, w = 3) {
  c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'miter'; c.beginPath(); c.moveTo(x0, y0);
  const n = 6; for (let i = 1; i < n; i++) { const k = i / n; c.lineTo(lerp(x0, x1, k) + (i & 1 ? 6 : -6) * (Math.abs(y1 - y0) > 40 ? 1 : 0.4), lerp(y0, y1, k) + (i & 1 ? -4 : 4) * (Math.abs(y1 - y0) > 40 ? 0 : 1)); }
  c.lineTo(x1, y1); c.stroke(); c.lineJoin = 'round';
}
function glow(c, x, y, r, col) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,200,80,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function skyline(c, k, col, win, hmax, step, seed) {
  const cx = W.camX, fx = cx * k, i0 = Math.floor(fx / step) - 1;
  for (let i = i0; i < i0 + Wv / step + 3; i++) {
    const x = cx + i * step - fx, h = 60 + hash(i + seed) * hmax, w = step - 6, top = 300 - h;
    c.fillStyle = col; c.fillRect(x, top, w, h + 20);
    if (win) { c.fillStyle = win; for (let yy = top + 10; yy < 290; yy += 13) for (let xx = x + 6; xx < x + w - 6; xx += 11) if (hash(xx * 0.37 + yy * 1.7) > 0.55) c.fillRect(xx, yy, 5, 6); }
  }
}
function drawMarket(c) {
  const cx = W.camX;
  drawSky(c, -100, FLOOR_TOP, ['#120d33', '#2a1f5c', '#4a2f6e']);
  for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + hash(i) * 0.5})`; c.fillRect(cx + ((hash(i + 3) * 2000 - cx * 0.02) % Wv + Wv) % Wv, hash(i + 7) * 120, 2, 2); }
  skyline(c, 0.2, '#2b2150', 'rgba(255,214,120,.45)', 150, 80, 7);
  // stalls
  for (let i = Math.floor(cx / 220) - 1; i < cx / 220 + Wv / 220 + 2; i++) {
    const x = i * 220, st = STALLS[wrap(i * 3, STALLS.length)];
    c.strokeStyle = INK; c.lineWidth = 2;
    c.fillStyle = '#3a2d4a'; c.fillRect(x + 14, 200, 190, 116);
    glow(c, x + 110, 250, 120, 'rgba(255,200,90,.35)');
    for (let k = 0; k < 8; k++) { c.fillStyle = k & 1 ? '#fff6e6' : st.c; c.beginPath(); c.moveTo(x + 6 + k * 26, 180); c.lineTo(x + 6 + (k + 1) * 26, 180); c.lineTo(x + 6 + (k + 1) * 26, 202); c.quadraticCurveTo(x + 6 + (k + .5) * 26, 212, x + 6 + k * 26, 202); c.closePath(); c.fill(); }
    c.strokeRect(x + 6, 180, 208, 22);
    c.fillStyle = '#ffe28a'; c.fillRect(x + 50, 150, 120, 28); c.strokeRect(x + 50, 150, 120, 28);
    c.fillStyle = '#c0392b'; c.font = '900 19px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(st.n, x + 110, 165);
    c.fillStyle = '#c9a27a'; c.fillRect(x + 20, 270, 178, 46); c.strokeRect(x + 20, 270, 178, 46);
    for (let k = 0; k < 6; k++) { c.fillStyle = ['#ffcc33', '#ff9a3c', '#fff6e6', '#ff5a7a'][(k + i) & 3]; c.beginPath(); c.arc(x + 40 + k * 28, 266, 8, 0, TAU); c.fill(); c.lineWidth = 1.5; c.stroke(); }
    for (let k = 0; k < 3; k++) { const bx = x + 40 + k * 70; c.strokeStyle = 'rgba(255,240,200,.7)'; c.beginPath(); c.moveTo(bx, 202); c.lineTo(bx, 214); c.stroke(); c.fillStyle = '#fff3b8'; c.beginPath(); c.arc(bx, 218, 5, 0, TAU); c.fill(); glow(c, bx, 218, 26, 'rgba(255,240,170,.5)'); }
    if (hash(i + 9) > 0.5) for (let k = 0; k < 3; k++) { const yy = 240 - ((W.t * 0.4 + k * 18) % 50); c.fillStyle = `rgba(240,240,250,${0.35 * (1 - (240 - yy) / 50)})`; c.beginPath(); c.arc(x + 80 + k * 10 + Math.sin((W.t + k * 30) * 0.05) * 4, yy, 6 + k, 0, TAU); c.fill(); }
  }
  // string lights
  for (let i = Math.floor(cx / 160) - 1; i < cx / 160 + Wv / 160 + 2; i++) {
    const x0 = i * 160; c.strokeStyle = 'rgba(20,16,40,.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, 60); c.quadraticCurveTo(x0 + 80, 100, x0 + 160, 60); c.stroke();
    for (let k = 1; k < 6; k++) { const t = k / 6, ly = (1 - t) * (1 - t) * 60 + 2 * t * (1 - t) * 100 + t * t * 60; const col = ['#ff5a4a', '#ffcc33', '#38d39f', '#3fa9ff', '#ff7aa8'][(i + k) % 5]; glow(c, x0 + 160 * t, ly + 6, 14, 'rgba(255,230,150,.35)'); c.fillStyle = col; c.beginPath(); c.arc(x0 + 160 * t, ly + 6, 4, 0, TAU); c.fill(); }
  }
  const rg = c.createLinearGradient(0, FLOOR_TOP, 0, 540); rg.addColorStop(0, '#4d4a5c'); rg.addColorStop(1, '#353344');
  c.fillStyle = MAT ? matTex(c, 'asphalt', '#434052', 0.6) : rg; c.fillRect(cx - 4, FLOOR_TOP, Wv + 8, 540 - FLOOR_TOP);
  c.fillStyle = 'rgba(255,210,120,.12)'; for (let x = Math.floor(cx / 220) * 220; x < cx + Wv + 220; x += 220) c.fillRect(x + 30, FLOOR_TOP, 160, 30);
  c.fillStyle = 'rgba(255,255,255,.5)'; for (let x = Math.floor(cx / 120) * 120; x < cx + Wv + 120; x += 120) c.fillRect(x, FLOOR_TOP + 82, 60, 4);
  c.fillStyle = '#2a2836'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
}
function drawPark(c) {
  const cx = W.camX;
  drawSky(c, -100, FLOOR_TOP, ['#6ec2ff', '#b2e1ff', '#e8f8e0']);
  [[0.08, '#9fd08a', 230, 30], [0.16, '#7cc06e', 262, 22]].forEach(([k, col, base, amp], L) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(cx - 4, 330);
    for (let s2 = -4; s2 <= Wv + 24; s2 += 16) { const wx = s2 + cx * k + L * 300; c.lineTo(cx + s2, base - amp - Math.sin(wx * 0.01) * amp - Math.sin(wx * 0.027) * amp * 0.5); }
    c.lineTo(cx + Wv + 24, 330); c.closePath(); c.fill();
  });
  // trees and playground pieces
  for (let i = Math.floor(cx / 300) - 1; i < cx / 300 + Wv / 300 + 2; i++) {
    const x = i * 300, kind = wrap(i, 4);
    c.strokeStyle = INK; c.lineWidth = 2;
    if (kind === 0) { // slide
      c.fillStyle = '#ffcc33'; c.fillRect(x + 40, 210, 10, 106); c.fillRect(x + 90, 210, 10, 106); c.strokeRect(x + 40, 210, 10, 106); c.strokeRect(x + 90, 210, 10, 106);
      c.fillStyle = '#ff5a4a'; c.fillRect(x + 36, 204, 68, 12); c.strokeRect(x + 36, 204, 68, 12);
      for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(x + 50, 230 + k * 18); c.lineTo(x + 90, 230 + k * 18); c.stroke(); }
      c.beginPath(); c.moveTo(x + 104, 210); c.quadraticCurveTo(x + 150, 230, x + 190, 314); c.lineTo(x + 206, 314); c.quadraticCurveTo(x + 166, 222, x + 104, 196); c.closePath(); c.fillStyle = '#3fa9ff'; c.fill(); c.stroke();
    } else if (kind === 1) { // swings
      c.strokeStyle = '#5a6170'; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 30, 316); c.lineTo(x + 60, 200); c.lineTo(x + 90, 316); c.moveTo(x + 190, 316); c.lineTo(x + 220, 200); c.lineTo(x + 250, 316); c.moveTo(x + 60, 200); c.lineTo(x + 220, 200); c.stroke();
      c.lineWidth = 1.5; c.strokeStyle = INK;
      for (const sx2 of [x + 110, x + 170]) { const sw = Math.sin(W.t * 0.04 + sx2) * 10; c.beginPath(); c.moveTo(sx2 - 10, 200); c.lineTo(sx2 - 10 + sw, 280); c.moveTo(sx2 + 10, 200); c.lineTo(sx2 + 10 + sw, 280); c.stroke(); c.fillStyle = '#ff7aa8'; c.fillRect(sx2 - 14 + sw, 278, 28, 6); }
    } else {
      for (let k = 0; k < 2; k++) { const tx = x + 60 + k * 140; c.fillStyle = '#8a5a34'; c.fillRect(tx - 7, 230, 14, 86); c.strokeRect(tx - 7, 230, 14, 86); c.fillStyle = k ? '#4fae5a' : '#3f9a4c'; c.beginPath(); c.arc(tx, 210, 42, 0, TAU); c.arc(tx - 30, 232, 28, 0, TAU); c.arc(tx + 30, 232, 28, 0, TAU); c.fill(); c.stroke(); }
      if (kind === 3) { c.fillStyle = '#b8623a'; c.fillRect(x + 110, 292, 80, 8); c.fillRect(x + 116, 300, 6, 16); c.fillRect(x + 178, 300, 6, 16); c.strokeRect(x + 110, 292, 80, 8); }
    }
  }
  c.fillStyle = '#7fc46a'; c.fillRect(cx - 4, 312, Wv + 8, 20);
  floorFill(c, 'park', '#86c873', cx - 4, FLOOR_TOP, Wv + 8, 540);
  floorFill(c, 'path', '#d9cfb8', cx - 4, FLOOR_TOP + 46, Wv + 8, 70);
  c.strokeStyle = 'rgba(90,70,40,.18)'; c.lineWidth = 1.5; for (let x = Math.floor(cx / 50) * 50; x < cx + Wv + 50; x += 50) { c.beginPath(); c.moveTo(x, FLOOR_TOP + 46); c.lineTo(x, FLOOR_TOP + 116); c.stroke(); }
  c.fillStyle = '#5fa24e'; for (let x = Math.floor(cx / 37) * 37; x < cx + Wv + 37; x += 37) { const yy = FLOOR_TOP + 10 + hash(x) * 30; c.fillRect(x, yy, 2, 6); c.fillRect(x + 3, yy + 1, 2, 5); const y2 = FLOOR_TOP + 125 + hash(x + 1) * 30; c.fillRect(x + 10, y2, 2, 6); }
  c.fillStyle = '#6aae58'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
}
function drawMRT(c) {
  const cx = W.camX;
  c.fillStyle = '#2b3140'; c.fillRect(cx - 4, -100, Wv + 8, 160);
  c.fillStyle = '#e9eef2'; c.fillRect(cx - 4, 60, Wv + 8, 160);
  c.strokeStyle = 'rgba(28,26,46,.08)'; c.lineWidth = 1; for (let y = 72; y < 220; y += 12) { c.beginPath(); c.moveTo(cx - 4, y); c.lineTo(cx + Wv + 4, y); c.stroke(); }
  // signs and pillars
  for (let i = Math.floor(cx / 360) - 1; i < cx / 360 + Wv / 360 + 2; i++) {
    const x = i * 360; c.strokeStyle = INK; c.lineWidth = 2;
    c.fillStyle = '#1f6f8b'; c.fillRect(x + 60, 90, 180, 40); c.strokeRect(x + 60, 90, 180, 40);
    c.fillStyle = '#fff'; c.font = '900 18px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(i & 1 ? '往 動物園 ▶' : '◀ 往 海邊', x + 150, 110);
    c.fillStyle = '#c9d1d8'; c.fillRect(x + 300, 60, 30, 260); c.strokeRect(x + 300, 60, 30, 260);
    c.fillStyle = '#ffcc33'; c.fillRect(x + 300, 160, 30, 8);
  }
  // track pit and the train
  c.fillStyle = '#3a3f4a'; c.fillRect(cx - 4, 220, Wv + 8, 100);
  c.fillStyle = '#6a6f7a'; c.fillRect(cx - 4, 300, Wv + 8, 6); c.fillRect(cx - 4, 286, Wv + 8, 4);
  const T = W.train;
  if (T && T.x !== null) {
    for (let k = 0; k < 6; k++) {
      const x = T.x + k * 230; if (x > cx + Wv + 10 || x + 226 < cx - 10) continue;
      c.fillStyle = '#f4f6f8'; c.beginPath(); c.roundRect ? c.roundRect(x, 216, 226, 84, 14) : c.rect(x, 216, 226, 84); c.fill(); c.strokeStyle = INK; c.lineWidth = 2.4; c.stroke();
      c.fillStyle = '#1aa39a'; c.fillRect(x, 276, 226, 8); c.fillStyle = '#3fa9ff'; c.fillRect(x, 284, 226, 4);
      for (let w = 0; w < 4; w++) { c.fillStyle = '#2b3a50'; c.fillRect(x + 14 + w * 52, 230, 36, 30); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 16 + w * 52, 232, 8, 26); }
      const open = T.doors; c.fillStyle = '#d8dde2'; c.fillRect(x + 100 - open * 10, 226, 12, 58); c.fillRect(x + 114 + open * 10, 226, 12, 58);
    }
  }
  // platform
  floorFill(c, 'mrt', '#c9ccd2', cx - 4, FLOOR_TOP - 10, Wv + 8, 540);
  c.fillStyle = '#ffcc33'; c.fillRect(cx - 4, FLOOR_TOP + 2, Wv + 8, 10);
  c.fillStyle = 'rgba(28,26,46,.2)'; for (let x = Math.floor(cx / 10) * 10; x < cx + Wv + 10; x += 10) c.fillRect(x, FLOOR_TOP + 4, 4, 6);
  c.strokeStyle = 'rgba(28,26,46,.12)'; c.lineWidth = 1.5;
  for (let z = 20; z <= FLOOR_D; z += 34) { c.beginPath(); c.moveTo(cx - 4, FLOOR_TOP + z); c.lineTo(cx + Wv + 4, FLOOR_TOP + z); c.stroke(); }
  for (let x = Math.floor(cx / 68) * 68; x < cx + Wv + 68; x += 68) { c.beginPath(); c.moveTo(x, FLOOR_TOP + 12); c.lineTo(x, FLOOR_TOP + FLOOR_D); c.stroke(); }
  c.fillStyle = '#9ca1aa'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
}
function drawBeach(c) {
  const cx = W.camX;
  drawSky(c, -100, 210, ['#4fb0ff', '#9fd8ff', '#e6f6ff']);
  c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(cx + Wv * 0.75 - cx * 0.03, 90, 34, 0, TAU); c.fill();
  c.fillStyle = '#7fae9a'; c.beginPath(); c.ellipse(cx + 300 - cx * 0.05, 210, 160, 30, 0, Math.PI, 0); c.fill();
  const sg = c.createLinearGradient(0, 210, 0, FLOOR_TOP); sg.addColorStop(0, '#2f8fd1'); sg.addColorStop(1, '#5fc4e8');
  c.fillStyle = sg; c.fillRect(cx - 4, 208, Wv + 8, FLOOR_TOP - 208);
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2;
  for (let r = 0; r < 6; r++) { const y = 220 + r * 18; c.beginPath(); for (let x = cx - 20; x < cx + Wv + 20; x += 40) { const o = Math.sin((x + W.t * (0.5 + r * 0.2)) * 0.05) * 3; c.moveTo(x, y + o); c.lineTo(x + 18, y + o); } c.stroke(); }
  for (let i = Math.floor(cx / 700) - 1; i < cx / 700 + Wv / 700 + 2; i++) { const bx = i * 700 + 200 + Math.sin(W.t * 0.01 + i) * 20, by = 236; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(bx - 26, by); c.lineTo(bx + 26, by); c.lineTo(bx + 18, by + 10); c.lineTo(bx - 18, by + 10); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#ff5a4a'; c.beginPath(); c.moveTo(bx, by - 30); c.lineTo(bx, by); c.lineTo(bx + 18, by - 6); c.closePath(); c.fill(); c.stroke(); }
  // sand and beach things
  floorFill(c, 'beach', '#f2dca0', cx - 4, FLOOR_TOP - 14, Wv + 8, 560);
  c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(cx - 4, FLOOR_TOP - 14); for (let x = cx - 4; x < cx + Wv + 8; x += 20) c.lineTo(x, FLOOR_TOP - 14 + Math.sin((x + W.t) * 0.08) * 3 + 4); c.lineTo(cx + Wv + 8, FLOOR_TOP - 14); c.fill();
  for (let i = Math.floor(cx / 420) - 1; i < cx / 420 + Wv / 420 + 2; i++) {
    const x = i * 420 + 100; c.strokeStyle = INK; c.lineWidth = 2;
    c.fillStyle = '#fff'; c.fillRect(x - 2, FLOOR_TOP - 70, 4, 70);
    c.beginPath(); c.moveTo(x - 50, FLOOR_TOP - 66); c.quadraticCurveTo(x, FLOOR_TOP - 104, x + 50, FLOOR_TOP - 66); c.closePath(); c.fillStyle = ['#ff5a4a', '#ffcc33', '#38d39f'][wrap(i, 3)]; c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 17, FLOOR_TOP - 66); c.quadraticCurveTo(x, FLOOR_TOP - 98, x + 17, FLOOR_TOP - 66); c.closePath(); c.fill();
  }
  for (let x = Math.floor(cx / 53) * 53; x < cx + Wv + 53; x += 53) { if (hash(x) < 0.5) continue; const yy = FLOOR_TOP + 20 + hash(x + 1) * 120; c.fillStyle = hash(x + 2) > 0.5 ? '#ffb3a9' : '#fff6e6'; c.beginPath(); c.arc(x, yy, 3, 0, Math.PI, true); c.fill(); }
  c.fillStyle = '#e6cc8a'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
  // incoming tide (hazard)
  if (W.tide > 0) {
    const edge = FLOOR_TOP + W.tide * 75;
    c.fillStyle = 'rgba(52,160,215,.62)'; c.beginPath(); c.moveTo(cx - 4, FLOOR_TOP - 14);
    for (let x = cx - 4; x <= cx + Wv + 8; x += 16) c.lineTo(x, edge + Math.sin((x + W.t * 3) * 0.05) * 5);
    c.lineTo(cx + Wv + 8, FLOOR_TOP - 14); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.beginPath(); for (let x = cx - 4; x <= cx + Wv + 8; x += 16) c.lineTo(x, edge + Math.sin((x + W.t * 3) * 0.05) * 5); c.stroke();
  }
}
THEMES.market = drawMarket; THEMES.park = drawPark; THEMES.mrt = drawMRT; THEMES.beach = drawBeach;

/* ------------------------------ stage 3 & 4 backgrounds ------------------------------ */
function drawTea(c) {
  const cx = W.camX;
  drawSky(c, -100, FLOOR_TOP, ['#7fc8f0', '#c4e8f4', '#f2fae8']);
  // misty mountains and terraced tea hills
  [[0.05, '#b9d6cf', 170, 60], [0.1, '#93c2a8', 210, 45], [0.18, '#6fae7c', 250, 34]].forEach(([k, col, base, amp], L) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(cx - 4, 330);
    for (let s2 = -4; s2 <= Wv + 24; s2 += 14) { const wx = s2 + cx * k + L * 400; c.lineTo(cx + s2, base - amp - Math.sin(wx * 0.005) * amp - Math.sin(wx * 0.013 + 1) * amp * 0.5); }
    c.lineTo(cx + Wv + 24, 330); c.closePath(); c.fill();
    if (L === 2) { c.strokeStyle = 'rgba(40,90,50,.35)'; c.lineWidth = 3; for (let r = 0; r < 5; r++) { c.beginPath(); for (let s2 = -4; s2 <= Wv + 24; s2 += 14) { const wx = s2 + cx * k + L * 400; const y = base - amp * 0.4 - Math.sin(wx * 0.005) * amp * 0.6 + r * 14; s2 === -4 ? c.moveTo(cx + s2, y) : c.lineTo(cx + s2, y); } c.stroke(); } }
  });
  for (let i = 0; i < 5; i++) { const x = cx + ((i * 420 - cx * 0.06) % (Wv + 400) + Wv + 400) % (Wv + 400) - 200, y = 60 + hash(i) * 60; c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(x, y, 70, 14, 0, 0, TAU); c.ellipse(x + 30, y - 8, 36, 12, 0, 0, TAU); c.fill(); }
  // pavilion and tea rows
  for (let i = Math.floor(cx / 900) - 1; i < cx / 900 + Wv / 900 + 2; i++) {
    const x = i * 900 + 500; c.strokeStyle = INK; c.lineWidth = 2;
    c.fillStyle = '#c94a34'; c.fillRect(x - 50, 220, 8, 96); c.fillRect(x + 42, 220, 8, 96); c.strokeRect(x - 50, 220, 8, 96); c.strokeRect(x + 42, 220, 8, 96);
    c.beginPath(); c.moveTo(x - 80, 226); c.quadraticCurveTo(x - 40, 214, x - 30, 190); c.lineTo(x + 30, 190); c.quadraticCurveTo(x + 40, 214, x + 80, 226); c.closePath(); c.fillStyle = '#2f8a62'; c.fill(); c.stroke();
    c.fillStyle = '#ffcc33'; c.beginPath(); c.arc(x, 186, 6, 0, TAU); c.fill(); c.stroke();
  }
  for (let r = 0; r < 3; r++) for (let i = Math.floor(cx / 60) - 1; i < cx / 60 + Wv / 60 + 2; i++) {
    const x = i * 60 + r * 20, y = 262 + r * 18; c.fillStyle = r === 2 ? '#3f8f4c' : r ? '#4a9a56' : '#56a862'; c.beginPath(); c.ellipse(x, y, 34, 14, 0, Math.PI, 0); c.fill();
    c.fillStyle = 'rgba(180,230,140,.5)'; c.beginPath(); c.arc(x - 8, y - 9, 3, 0, TAU); c.arc(x + 9, y - 7, 2.5, 0, TAU); c.fill();
  }
  c.fillStyle = '#5a9e5a'; c.fillRect(cx - 4, 304, Wv + 8, 28);
  floorFill(c, 'tea', '#c8a77a', cx - 4, FLOOR_TOP, Wv + 8, 540);
  c.fillStyle = 'rgba(120,90,60,.25)'; for (let x = Math.floor(cx / 31) * 31; x < cx + Wv + 31; x += 31) { const yy = FLOOR_TOP + 8 + hash(x) * 140; c.beginPath(); c.ellipse(x, yy, 4, 2, 0, 0, TAU); c.fill(); }
  c.fillStyle = '#4a9a56'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
}
function drawHarbor(c) {
  const cx = W.camX;
  drawSky(c, -100, 230, ['#5fb4f0', '#a8dcf8', '#f0f8ff']);
  c.fillStyle = '#86a8b8'; c.beginPath(); c.ellipse(cx + 500 - cx * 0.04, 232, 260, 30, 0, Math.PI, 0); c.fill();
  const sg = c.createLinearGradient(0, 228, 0, 316); sg.addColorStop(0, '#2a7fbf'); sg.addColorStop(1, '#3f9bd6');
  c.fillStyle = sg; c.fillRect(cx - 4, 228, Wv + 8, 90);
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; for (let r = 0; r < 4; r++) { const y = 240 + r * 18; c.beginPath(); for (let x = cx - 20; x < cx + Wv + 20; x += 36) { const o = Math.sin((x + W.t * (0.6 + r * 0.2)) * 0.06) * 3; c.moveTo(x, y + o); c.lineTo(x + 16, y + o); } c.stroke(); }
  // lighthouse and fishing boats with flags
  for (let i = Math.floor(cx / 1100) - 1; i < cx / 1100 + Wv / 1100 + 2; i++) {
    const x = i * 1100 + 900; c.strokeStyle = INK; c.lineWidth = 2;
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 16, 236); c.lineTo(x - 10, 130); c.lineTo(x + 10, 130); c.lineTo(x + 16, 236); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e8432f'; c.fillRect(x - 13, 170, 26, 16); c.fillRect(x - 11, 140, 22, 12);
    c.fillStyle = '#ffe28a'; c.fillRect(x - 9, 116, 18, 14); c.strokeRect(x - 9, 116, 18, 14); c.beginPath(); c.moveTo(x - 12, 116); c.lineTo(x, 104); c.lineTo(x + 12, 116); c.closePath(); c.fillStyle = '#e8432f'; c.fill(); c.stroke();
  }
  for (let i = Math.floor(cx / 380) - 1; i < cx / 380 + Wv / 380 + 2; i++) {
    const x = i * 380 + 120, bob = Math.sin(W.t * 0.04 + i) * 3, y = 290 + bob, col = ['#e8432f', '#2f6fd1', '#38a35a'][wrap(i, 3)];
    c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - 70, y - 22); c.lineTo(x + 80, y - 26); c.lineTo(x + 60, y); c.lineTo(x - 56, y); c.closePath(); c.fillStyle = '#fff6e6'; c.fill(); c.stroke();
    c.fillStyle = col; c.fillRect(x - 64, y - 12, 136, 6);
    c.fillStyle = '#fff'; c.fillRect(x - 20, y - 52, 50, 28); c.strokeRect(x - 20, y - 52, 50, 28); c.fillStyle = '#5a7fa8'; c.fillRect(x - 14, y - 46, 14, 10); c.fillRect(x + 6, y - 46, 14, 10);
    c.beginPath(); c.moveTo(x + 40, y - 24); c.lineTo(x + 40, y - 80); c.stroke();
    ['#e8432f', '#ffcc33', '#38a35a', '#2f6fd1'].forEach((fc, k) => { c.fillStyle = fc; c.beginPath(); c.moveTo(x + 40, y - 80 + k * 12); c.lineTo(x + 56 + Math.sin(W.t * 0.2 + k) * 2, y - 75 + k * 12); c.lineTo(x + 40, y - 70 + k * 12); c.closePath(); c.fill(); });
  }
  // fish market stalls on the quay
  c.fillStyle = '#a89e8e'; c.fillRect(cx - 4, 300, Wv + 8, 32);
  for (let i = Math.floor(cx / 520) - 1; i < cx / 520 + Wv / 520 + 2; i++) {
    const x = i * 520 + 300; c.strokeStyle = INK; c.lineWidth = 2;
    c.fillStyle = '#2f6fd1'; c.fillRect(x - 60, 268, 120, 10); c.strokeRect(x - 60, 268, 120, 10);
    c.fillStyle = '#d8dde2'; c.fillRect(x - 54, 290, 108, 24); c.strokeRect(x - 54, 290, 108, 24);
    c.fillStyle = '#9ad8f0'; c.fillRect(x - 50, 284, 100, 8);
    for (let k = 0; k < 5; k++) { c.fillStyle = ['#ff9a7a', '#c9ced8', '#ffcc33'][k % 3]; c.beginPath(); c.ellipse(x - 38 + k * 19, 286, 8, 3.5, 0.2, 0, TAU); c.fill(); }
    c.fillStyle = '#fff6e6'; c.fillRect(x - 30, 248, 60, 18); c.strokeRect(x - 30, 248, 60, 18); c.fillStyle = '#c0392b'; c.font = '900 13px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(i & 1 ? '海產' : '漁市', x, 257);
  }
  // wooden dock
  floorFill(c, 'harbor', '#b08a5a', cx - 4, FLOOR_TOP, Wv + 8, 540);
  c.strokeStyle = 'rgba(70,45,20,.35)'; c.lineWidth = 2;
  for (let z = 0; z <= FLOOR_D; z += 20) { c.beginPath(); c.moveTo(cx - 4, FLOOR_TOP + z); c.lineTo(cx + Wv + 4, FLOOR_TOP + z); c.stroke(); }
  for (let x = Math.floor(cx / 120) * 120; x < cx + Wv + 120; x += 120) for (let z = 0; z < FLOOR_D; z += 40) { c.beginPath(); c.moveTo(x + (z % 80 ? 60 : 0), FLOOR_TOP + z); c.lineTo(x + (z % 80 ? 60 : 0), FLOOR_TOP + z + 20); c.stroke(); }
  c.fillStyle = '#7a5c3a'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
  for (let i = Math.floor(cx / 260) - 1; i < cx / 260 + Wv / 260 + 2; i++) { const x = i * 260 + 60; c.fillStyle = '#5a6170'; c.fillRect(x - 8, FLOOR_TOP + FLOOR_D - 6, 16, 14); c.beginPath(); c.ellipse(x, FLOOR_TOP + FLOOR_D - 6, 8, 3, 0, 0, TAU); c.fill(); }
}
THEMES.tea = drawTea; THEMES.harbor = drawHarbor;

/* ------------------------------ foreground ------------------------------
   Dark silhouettes in front of everything that slide past a little faster than the
   fighters, so the street has depth. They fade when someone walks behind them. */
const FG_INK = 'rgba(28,26,48,.9)';
const FG = {
  pole(c, x) {
    c.fillStyle = FG_INK; c.fillRect(x - 10, -120, 20, VH + 140); c.fillRect(x - 30, -40, 60, 7); c.fillRect(x - 24, -14, 48, 6);
    c.fillStyle = 'rgba(255,204,51,.85)'; c.fillRect(x - 10, VH - 120, 20, 8); c.fillRect(x - 10, VH - 96, 20, 8);
  },
  plant(c, x) {
    c.fillStyle = FG_INK; c.beginPath(); c.moveTo(x - 30, VH + 4); c.lineTo(x - 25, VH - 36); c.lineTo(x + 25, VH - 36); c.lineTo(x + 30, VH + 4); c.fill();
    [[-26, -60, -0.7], [-10, -84, -0.25], [8, -88, 0.2], [24, -66, 0.65], [-36, -40, -1.1], [36, -42, 1.1]].forEach(([dx, h, r]) => { c.save(); c.translate(x + dx * 0.55, VH - 36); c.rotate(r); c.beginPath(); c.ellipse(0, h * 0.5, 10, -h * 0.5, 0, 0, TAU); c.fill(); c.restore(); });
  },
  scooter(c, x) {
    c.fillStyle = FG_INK; c.beginPath(); c.ellipse(x, VH - 26, 44, 24, 0, Math.PI, 0); c.fill();
    c.beginPath(); c.arc(x - 30, VH - 10, 13, 0, TAU); c.arc(x + 32, VH - 10, 13, 0, TAU); c.fill(); c.fillRect(x + 28, VH - 78, 6, 50); c.fillRect(x + 18, VH - 80, 26, 6);
  },
  bush(c, x) { c.fillStyle = 'rgba(24,52,40,.9)'; [[-40, 26], [-12, 36], [18, 32], [44, 24]].forEach(([dx, r]) => { c.beginPath(); c.arc(x + dx, VH - r * 0.7, r, 0, TAU); c.fill(); }); },
  lamp(c, x) { c.fillStyle = FG_INK; c.fillRect(x - 5, VH - 260, 10, 270); c.beginPath(); c.ellipse(x, VH - 262, 18, 10, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,230,150,.7)'; c.beginPath(); c.arc(x, VH - 256, 6, 0, TAU); c.fill(); },
  lanterns(c, x) {
    c.strokeStyle = FG_INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 180, 96); c.quadraticCurveTo(x, 156, x + 180, 96); c.stroke();
    for (let i = 0; i < 7; i++) { const t = (i + 0.5) / 7, lx = x - 180 + t * 360, ly = 96 + Math.sin(t * Math.PI) * 30 + 6; c.fillStyle = '#e8402f'; c.beginPath(); c.ellipse(lx, ly + 10, 9, 12, 0, 0, TAU); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#ffcc33'; c.fillRect(lx - 5, ly - 3, 10, 4); }
  },
  crate(c, x) { c.fillStyle = FG_INK; c.fillRect(x - 34, VH - 56, 68, 60); c.fillRect(x - 6, VH - 98, 48, 44); c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2; c.strokeRect(x - 28, VH - 50, 56, 50); },
  bollard(c, x) { c.fillStyle = FG_INK; c.fillRect(x - 16, VH - 52, 32, 56); c.beginPath(); c.ellipse(x, VH - 52, 22, 9, 0, 0, TAU); c.fill(); c.strokeStyle = FG_INK; c.lineWidth = 5; c.beginPath(); c.moveTo(x + 16, VH - 40); c.quadraticCurveTo(x + 90, VH - 4, x + 170, VH - 30); c.stroke(); },
  pillar(c, x) { c.fillStyle = FG_INK; c.fillRect(x - 22, -120, 44, VH + 140); c.fillStyle = 'rgba(255,204,51,.7)'; c.fillRect(x - 22, VH - 150, 44, 10); },
  tea(c, x) { c.fillStyle = 'rgba(30,70,46,.9)'; c.beginPath(); c.ellipse(x, VH - 6, 80, 42, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(x + 90, VH, 60, 30, 0, Math.PI, 0); c.fill(); },
  rail(c, x) { c.fillStyle = FG_INK; c.fillRect(x - 90, VH - 70, 180, 6); c.fillRect(x - 90, VH - 40, 180, 5); for (let i = -90; i <= 90; i += 45) c.fillRect(x + i - 3, VH - 70, 6, 80); },
  umbrella(c, x) { c.fillStyle = FG_INK; c.fillRect(x - 3, VH - 150, 6, 160); c.beginPath(); c.moveTo(x - 80, VH - 140); c.quadraticCurveTo(x, VH - 210, x + 80, VH - 140); c.closePath(); c.fill(); }
};
const FOREGROUNDS = {
  street: { every: 620, list: ['pole', 'plant', 'scooter'] },
  market: { every: 520, list: ['lanterns', 'scooter', 'lanterns', 'plant'] },
  roof: { every: 700, list: ['rail', 'plant'] },
  park: { every: 560, list: ['bush', 'plant', 'bush'] },
  mrt: { every: 760, list: ['pillar', 'plant'] },
  beach: { every: 680, list: ['umbrella', 'bush'] },
  tea: { every: 560, list: ['tea', 'pole', 'tea'] },
  harbor: { every: 600, list: ['bollard', 'crate', 'pole'] }
};
function drawForeground(c) {
  const F = FOREGROUNDS[W.theme]; if (!F) return;
  const p = 1.3, shift = (p - 1) * W.camX;                     // moves 30% faster than the floor
  const n0 = Math.floor((W.camX + shift - 200) / F.every), n1 = Math.ceil((W.camX + shift + Wv + 200) / F.every);
  for (let n = n0; n <= n1; n++) {
    const kind = F.list[((n % F.list.length) + F.list.length) % F.list.length], x = n * F.every + 160 - shift;
    const tall = kind === 'pole' || kind === 'pillar' || kind === 'lamp' || kind === 'lanterns';
    const behind = W.fighters.some(f => !f.dead && Math.abs(f.x - x) < (tall ? 40 : 90) && (tall || f.z > 90));
    c.save(); c.globalAlpha = behind ? 0.35 : 1; FG[kind](c, x); c.restore();
  }
}

/* ------------------------------ magic and ultimate projectiles ------------------------------ */
function glowBall(c, x, y, r, inner, outer) { const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(0.35, inner); g.addColorStop(1, outer); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
const PROJ2 = {
  phoenix(c, p, x, gy, y) { // a big bird of fire, wings beating
    c.save(); c.translate(x, y); c.scale(p.face, 1); const fl = Math.sin(p.t * 0.35);
    glowBall(c, 0, 0, 90, 'rgba(255,170,60,.55)', 'rgba(255,80,30,0)');
    for (const s of [-1, 1]) { c.save(); c.scale(1, s); c.rotate(-0.25 - fl * 0.35 * s); c.beginPath(); c.moveTo(-10, 0); c.quadraticCurveTo(-20, -70, -80, -90); c.quadraticCurveTo(-50, -40, -60, -20); c.quadraticCurveTo(-30, -10, -10, 0); c.fillStyle = s > 0 ? '#ff7a2f' : '#ffb23d'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); c.restore(); }
    c.beginPath(); c.moveTo(-60, 0); c.quadraticCurveTo(-100, 20, -130, 6 + fl * 10); c.quadraticCurveTo(-100, 4, -60, -6); c.fillStyle = '#ffd23f'; c.fill(); c.stroke();
    blob(c, 0, 0, 34, 20, '#ff9a3d'); blob(c, 34, -12, 16, 14, '#ffc23d');
    c.beginPath(); c.moveTo(48, -12); c.lineTo(62, -8); c.lineTo(48, -4); c.closePath(); c.fillStyle = '#ffe9a0'; c.fill(); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(38, -15, 3, 0, TAU); c.fill();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(28 - i * 6, -24); c.quadraticCurveTo(22 - i * 8, -44, 14 - i * 10, -40); c.strokeStyle = '#ff4d3d'; c.lineWidth = 4; c.stroke(); }
    c.restore();
  },
  boulder(c, p, x, gy, y) { c.fillStyle = 'rgba(20,16,40,.25)'; c.beginPath(); c.ellipse(x, gy, 22, 6, 0, 0, TAU); c.fill(); c.save(); c.translate(x, y); c.rotate(p.t * 0.12); blob(c, 0, 0, 24, 20, '#9a8f86'); c.fillStyle = 'rgba(60,50,40,.35)'; c.beginPath(); c.arc(8, 6, 5, 0, TAU); c.arc(-9, 2, 3.5, 0, TAU); c.fill(); c.restore(); },
  mstar(c, p, x, gy, y) { c.fillStyle = 'rgba(20,16,40,.18)'; c.beginPath(); c.ellipse(x, gy, 8, 2.5, 0, 0, TAU); c.fill(); glowBall(c, x, y, 18, 'rgba(255,230,120,.6)', 'rgba(255,200,80,0)'); c.save(); c.translate(x, y); c.rotate(p.t * 0.25); drawStar(c, 0, 0, 10, '#ffd23f'); c.restore(); },
  spell(c, p, x, gy, y) { glowBall(c, x, y, 20, 'rgba(180,120,255,.7)', 'rgba(140,80,255,0)'); for (let i = 0; i < 3; i++) { const a = p.t * 0.4 + i * TAU / 3; drawStar(c, x + Math.cos(a) * 12, y + Math.sin(a) * 12, 4, '#e7d2ff'); } },
  bubble(c, p, x, gy, y) { const r = 16 + Math.sin(p.t * 0.2) * 1.5; c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = 'rgba(170,230,255,.35)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(110,200,255,.95)'; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - r * 0.4, y - r * 0.4, 4, 2.5, -0.6, 0, TAU); c.fill(); c.restore(); },
  wave(c, p, x, gy) { // a tall breaking wave sliding across the floor
    c.save(); c.translate(x, gy - p.z + FLOOR_D * 0.5); c.scale(p.face, 1); const s = Math.sin(p.t * 0.3) * 6;
    const g = c.createLinearGradient(0, -230, 0, 40); g.addColorStop(0, '#bff0ff'); g.addColorStop(0.4, '#3fa9ff'); g.addColorStop(1, '#2366c8');
    c.beginPath(); c.moveTo(-260, 60); c.lineTo(-240, -40); c.quadraticCurveTo(-120, -150, 10, -200 + s); c.quadraticCurveTo(80, -230, 90, -170); c.quadraticCurveTo(60, -190, 40, -150); c.quadraticCurveTo(70, -60, 60, 60); c.closePath();
    c.fillStyle = g; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1; c.lineWidth = 4; c.strokeStyle = '#1c3f8a'; c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.moveTo(-200, -60); c.quadraticCurveTo(-100, -150, 10, -190 + s); c.quadraticCurveTo(70, -210, 80, -175); c.stroke();
    for (let i = 0; i < 5; i++) { c.fillStyle = '#fff'; c.beginPath(); c.arc(60 - i * 14, 40 + Math.sin(p.t * 0.5 + i) * 6, 8, 0, TAU); c.fill(); }
    c.restore();
  },
  bigtornado(c, p, x, gy) { c.save(); c.translate(x, gy); for (let k = 0; k < 12; k++) { const yy = -k * 16, rr = 16 + k * 8 + Math.sin(p.t * 0.5 + k) * 4; c.strokeStyle = `rgba(${200 - k * 6},${240 - k * 4},255,${0.9 - k * 0.04})`; c.lineWidth = 5; c.beginPath(); c.ellipse(Math.sin(p.t * 0.3 + k * 0.6) * 10, yy, rr, rr * 0.3, 0, p.t * 0.4 + k, p.t * 0.4 + k + 4.6); c.stroke(); } c.restore(); },
  meteor(c, p, x, gy, y) {
    const k = clamp(1 - p.y / 420, 0, 1); c.fillStyle = `rgba(20,16,40,${0.1 + k * 0.3})`; c.beginPath(); c.ellipse(x + p.vx * p.y / 11, gy, 14 + k * 20, 4 + k * 6, 0, 0, TAU); c.fill();
    for (let i = 1; i <= 5; i++) { c.fillStyle = `rgba(255,${180 - i * 20},60,${0.5 - i * 0.08})`; c.beginPath(); c.arc(x - p.vx * i * 3, y - p.vy * i * 3, 22 - i * 2, 0, TAU); c.fill(); }
    blob(c, x, y, 24, 22, '#8a5a4a'); c.fillStyle = '#ffb23d'; c.beginPath(); c.arc(x - 6, y - 6, 6, 0, TAU); c.fill();
  },
  animal(c, p, x, gy, y) { // 動物大遊行
    c.fillStyle = 'rgba(20,16,40,.25)'; c.beginPath(); c.ellipse(x, gy, 22, 5, 0, 0, TAU); c.fill();
    const fake = { clock: p.t * 2, state: 'run', st: p.t, face: 1, look: CHARS[p.who].look, def: CHARS[p.who], hold: null, vy: 0, vx: 6, inkT: 0 };
    c.save(); c.translate(x, y - Math.abs(Math.sin(p.t * 0.4)) * 6); c.scale(p.face * 1.1, 1.1);
    if (p.who === 'dog') drawDog(c, fake); else drawBody(c, fake.look, pose(fake), fake);
    c.restore();
  }
};
