'use strict';
/* The six little animals everyone plays as. Shared by the big screen (index.html)
   and the phones (pad.html), so a phone shows exactly the character on the TV. */
const PARTY_COLORS = [
  { c: '#ff4f58', d: '#b8262f', n: '紅' }, { c: '#2f8cff', d: '#1658b5', n: '藍' }, { c: '#ffbf1f', d: '#a87700', n: '黃' },
  { c: '#22c26a', d: '#127a40', n: '綠' }, { c: '#9b5cff', d: '#6430c2', n: '紫' }, { c: '#ff6fb7', d: '#c23c82', n: '粉' }
];
const PARTY_ANIMALS = [
  { id: 'cat', n: '貓咪', say: '喵！' }, { id: 'dog', n: '小狗', say: '汪！' }, { id: 'bunny', n: '兔兔', say: '噗！' },
  { id: 'bear', n: '小熊', say: '吼！' }, { id: 'pig', n: '小豬', say: '齁！' }, { id: 'frog', n: '青蛙', say: '呱！' }
];

/* o: face (radians, where the eyes look), hop (px up), squash, rot, alpha, stun, blink, happy, noShadow */
function drawCritter(g, x, y, r, col, animal, o) {
  o = o || {};
  const C = PARTY_COLORS[((col % 6) + 6) % 6], A = PARTY_ANIMALS[((animal % 6) + 6) % 6].id, T = Math.PI * 2;
  const f = o.face == null ? Math.PI / 2 : o.face, lx = Math.cos(f), ly = Math.sin(f);
  const hop = o.hop || 0;
  g.save(); g.translate(x, y);
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  if (!o.noShadow) {
    const k = 1 - Math.min(0.45, hop / (r * 3));
    g.fillStyle = 'rgba(30,20,50,.22)'; g.beginPath(); g.ellipse(0, r * 0.8, r * 0.92 * k, r * 0.3 * k, 0, 0, T); g.fill();
  }
  g.translate(0, -hop);
  if (o.rot) g.rotate(o.rot);
  const sq = o.squash || 0; g.scale(1 + sq, 1 - sq);
  g.lineWidth = Math.max(1.5, r * 0.09); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = C.d;
  const shape = (path, fill, stroke) => { g.beginPath(); path(); g.fillStyle = fill; g.fill(); if (stroke !== false) g.stroke(); };
  const pink = '#ffc6d6';
  for (const s of [-1, 1]) {
    if (A === 'cat') {
      shape(() => { g.moveTo(s * r * 0.84, -r * 0.3); g.lineTo(s * r * 0.8, -r * 1.12); g.lineTo(s * r * 0.16, -r * 0.84); g.closePath(); }, C.c);
      shape(() => { g.moveTo(s * r * 0.7, -r * 0.5); g.lineTo(s * r * 0.7, -r * 0.92); g.lineTo(s * r * 0.36, -r * 0.78); g.closePath(); }, pink, false);
    } else if (A === 'bunny') {
      shape(() => g.ellipse(s * r * 0.4, -r * 1.06, r * 0.25, r * 0.62, s * 0.2, 0, T), C.c);
      shape(() => g.ellipse(s * r * 0.4, -r * 1.03, r * 0.12, r * 0.44, s * 0.2, 0, T), pink, false);
    } else if (A === 'bear') {
      shape(() => g.arc(s * r * 0.7, -r * 0.7, r * 0.33, 0, T), C.c);
      shape(() => g.arc(s * r * 0.7, -r * 0.7, r * 0.16, 0, T), pink, false);
    } else if (A === 'pig') {
      shape(() => { g.moveTo(s * r * 0.8, -r * 0.48); g.lineTo(s * r * 0.86, -r * 1.02); g.lineTo(s * r * 0.3, -r * 0.86); g.closePath(); }, C.c);
    } else if (A === 'frog') {
      shape(() => g.arc(s * r * 0.44, -r * 0.7, r * 0.36, 0, T), C.c);
    }
  }
  shape(() => g.arc(0, 0, r, 0, T), C.c);
  if (A === 'dog') for (const s of [-1, 1]) shape(() => g.ellipse(s * r * 0.88, -r * 0.18, r * 0.27, r * 0.52, s * -0.3, 0, T), C.d, false);
  g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.44, r * 0.3, r * 0.16, -0.7, 0, T); g.fill();

  // the face turns toward where the critter is heading
  const fx = lx * r * 0.2, fy = ly * r * 0.12, frog = A === 'frog';
  const eyeX = frog ? r * 0.44 : r * 0.36, eyeY = frog ? -r * 0.72 + fy * 0.4 : -r * 0.12 + fy;
  const ink = '#2b2340';
  for (const s of [-1, 1]) {
    const ex = s * eyeX + fx * (frog ? 0.5 : 1), ey = eyeY;
    if (o.stun) {
      g.strokeStyle = ink; g.lineWidth = r * 0.08; const k = r * 0.12;
      g.beginPath(); g.moveTo(ex - k, ey - k); g.lineTo(ex + k, ey + k); g.moveTo(ex + k, ey - k); g.lineTo(ex - k, ey + k); g.stroke();
    } else if (o.happy) {
      g.strokeStyle = ink; g.lineWidth = r * 0.08; g.beginPath(); g.arc(ex, ey + r * 0.05, r * 0.13, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    } else if (o.blink) {
      g.strokeStyle = ink; g.lineWidth = r * 0.07; g.beginPath(); g.moveTo(ex - r * 0.12, ey); g.lineTo(ex + r * 0.12, ey); g.stroke();
    } else {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, r * 0.2, 0, T); g.fill();
      const px = ex + lx * r * 0.07, py = ey + ly * r * 0.06;
      g.fillStyle = ink; g.beginPath(); g.arc(px, py, r * 0.12, 0, T); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(px - r * 0.04, py - r * 0.045, r * 0.04, 0, T); g.fill();
    }
  }
  g.fillStyle = 'rgba(255,110,150,.45)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.56 + fx, r * 0.2 + fy, r * 0.14, r * 0.09, 0, 0, T); g.fill(); }
  const mx = fx, my = r * 0.24 + fy;
  g.lineWidth = r * 0.06;
  if (A === 'pig') {
    g.strokeStyle = C.d; shape(() => g.ellipse(mx, my - r * 0.04, r * 0.25, r * 0.17, 0, 0, T), '#ffb6cb');
    g.fillStyle = C.d; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(mx + s * r * 0.08, my - r * 0.04, r * 0.04, r * 0.06, 0, 0, T); g.fill(); }
  } else if (A === 'bear' || A === 'dog') {
    g.fillStyle = '#fff3e3'; g.beginPath(); g.ellipse(mx, my, r * 0.27, r * 0.19, 0, 0, T); g.fill();
    g.fillStyle = ink; g.beginPath(); g.ellipse(mx, my - r * 0.07, r * 0.09, r * 0.06, 0, 0, T); g.fill();
  } else if (!frog) {
    g.fillStyle = A === 'cat' ? '#ff7d9c' : '#ff9ab3';
    g.beginPath(); g.moveTo(mx - r * 0.07, my - r * 0.1); g.lineTo(mx + r * 0.07, my - r * 0.1); g.lineTo(mx, my - r * 0.02); g.closePath(); g.fill();
  }
  g.strokeStyle = ink; g.lineWidth = r * 0.06; g.beginPath();
  if (o.stun) { g.moveTo(mx - r * 0.14, my + r * 0.1); g.quadraticCurveTo(mx - r * 0.07, my + r * 0.03, mx, my + r * 0.1); g.quadraticCurveTo(mx + r * 0.07, my + r * 0.17, mx + r * 0.14, my + r * 0.1); }
  else if (frog) g.arc(mx, my - r * 0.12, r * 0.3, 0.2, Math.PI - 0.2);
  else { g.arc(mx - r * 0.07, my + r * 0.02, r * 0.07, 0.15, Math.PI - 0.15); g.moveTo(mx + r * 0.14, my + r * 0.03); g.arc(mx + r * 0.07, my + r * 0.02, r * 0.07, 0.15, Math.PI - 0.15); }
  g.stroke();
  g.restore();
}

const critterCache = {};
function critterURL(col, animal, size) {
  size = size || 96; const key = col + '/' + animal + '/' + size;
  if (critterCache[key]) return critterCache[key];
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const g = cv.getContext('2d'); drawCritter(g, size / 2, size * 0.58, size * 0.32, col, animal, { noShadow: true });
  return critterCache[key] = cv.toDataURL('image/png');
}
