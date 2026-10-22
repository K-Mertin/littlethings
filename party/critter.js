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

/* colour helpers (cached): mix a hex colour toward white (k>0) or black (k<0) */
const _mixCache = {};
function mixCol(hex, k) {
  const key = hex + k; if (_mixCache[key]) return _mixCache[key];
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = k > 0 ? 255 : 0, a = Math.abs(k);
  const out = `rgb(${Math.round(r + (t - r) * a)},${Math.round(g + (t - g) * a)},${Math.round(b + (t - b) * a)})`;
  return _mixCache[key] = out;
}
/* each critter remembers how far it has walked, so feet and arms swing on their own in every game */
const _motion = {};
function critterMotion(x, y, r, col, animal) {
  const now = performance.now(), key = col + '/' + animal + '/' + Math.round(r);
  let m = _motion[key];
  if (!m) m = _motion[key] = { x, y, t: now, step: 0, v: 0 };
  const d = Math.hypot(x - m.x, y - m.y), dt = now - m.t;
  if (dt > 0 && dt < 250 && d < r * 4) { m.v = m.v * 0.6 + (d / dt) * 0.4; m.step += d / (r * 0.5); }
  else if (dt >= 250) m.v = 0;
  if (dt > 0) { m.x = x; m.y = y; m.t = now; }
  return m;
}

/* o: face (radians, where the eyes look), hop (px up), squash, rot, alpha, stun, blink, happy, noShadow,
      step (walk phase, optional — otherwise worked out from movement), moving (optional) */
function drawCritter(g, x, y, r, col, animal, o) {
  o = o || {};
  const C = PARTY_COLORS[((col % 6) + 6) % 6], A = PARTY_ANIMALS[((animal % 6) + 6) % 6].id, T = Math.PI * 2;
  const f = o.face == null ? Math.PI / 2 : o.face, lx = Math.cos(f), ly = Math.sin(f);
  const hop = o.hop || 0, now = performance.now();
  let step = o.step, moving = o.moving;
  if (step == null) { if (r >= 14 && !o.still) { const m = critterMotion(x, y, r, col, animal); step = m.step; if (moving == null) moving = m.v > 0.05; } else step = 0; }
  const walk = moving ? Math.sin(step) : 0, walk2 = moving ? Math.cos(step) : 0;
  const light = mixCol(C.c, 0.42), mid = C.c, dark = C.d, ink = '#2b2340';
  g.save(); g.translate(x, y);
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  if (!o.noShadow) {
    const k = 1 - Math.min(0.45, hop / (r * 3));
    g.fillStyle = 'rgba(30,20,50,.22)'; g.beginPath(); g.ellipse(0, r * 0.86, r * 0.95 * k, r * 0.3 * k, 0, 0, T); g.fill();
  }
  g.translate(0, -hop - (moving ? Math.abs(walk) * r * 0.06 : 0));
  if (o.rot) g.rotate(o.rot);
  const sq = o.squash || 0; g.scale(1 + sq, 1 - sq);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const lw = Math.max(1.5, r * 0.085);
  const shape = (path, fill, stroke) => { g.beginPath(); path(); g.fillStyle = fill; g.fill(); if (stroke !== false) { g.strokeStyle = stroke || dark; g.lineWidth = lw; g.stroke(); } };
  const pink = '#ffc6d6', pinkD = '#f59ab6';
  const back = lx >= 0 ? -1 : 1;   // the side away from where we look: tails peek out there

  // ---- tail (behind)
  const tx = back * r * 0.82, ty = r * 0.28;
  if (A === 'cat') {
    const wag = Math.sin(now * 0.004 + col) * 0.25;
    g.strokeStyle = dark; g.lineWidth = r * 0.26; g.beginPath(); g.moveTo(tx * 0.7, ty); g.quadraticCurveTo(tx * 1.5, ty - r * 0.1, tx * (1.35 + wag), ty - r * 0.85); g.stroke();
    g.strokeStyle = mid; g.lineWidth = r * 0.17; g.stroke();
    g.fillStyle = light; g.beginPath(); g.arc(tx * (1.35 + wag), ty - r * 0.85, r * 0.09, 0, T); g.fill();
  } else if (A === 'dog') {
    const wag = Math.sin(now * (moving ? 0.03 : 0.012) + col) * 0.6;
    g.save(); g.translate(tx * 0.95, ty - r * 0.05); g.rotate(back * (-0.9 + wag));
    shape(() => g.ellipse(0, -r * 0.22, r * 0.12, r * 0.28, 0, 0, T), mid); g.restore();
  } else if (A === 'bunny') {
    shape(() => g.arc(tx * 0.95, ty + r * 0.1, r * 0.2, 0, T), '#ffffff', '#d9d4e6');
  } else if (A === 'bear') {
    shape(() => g.arc(tx * 0.95, ty + r * 0.15, r * 0.14, 0, T), dark);
  } else if (A === 'pig') {
    g.strokeStyle = pinkD; g.lineWidth = r * 0.08; g.beginPath(); g.moveTo(tx * 0.9, ty + r * 0.05);
    for (let k = 0; k <= 16; k++) { const a = k / 16 * T * 1.4, rr = r * 0.05 + k * r * 0.008; g.lineTo(tx * 1.08 + back * Math.cos(a) * rr, ty - r * 0.05 + Math.sin(a) * rr); }
    g.stroke();
  }

  // ---- ears / bumps (behind the head)
  for (const s of [-1, 1]) {
    if (A === 'cat') {
      shape(() => { g.moveTo(s * r * 0.84, -r * 0.3); g.lineTo(s * r * 0.82, -r * 1.12); g.lineTo(s * r * 0.16, -r * 0.84); g.closePath(); }, mid);
      shape(() => { g.moveTo(s * r * 0.7, -r * 0.48); g.lineTo(s * r * 0.71, -r * 0.94); g.lineTo(s * r * 0.36, -r * 0.78); g.closePath(); }, pink, false);
    } else if (A === 'bunny') {
      const flop = s === back ? 0.12 : 0, sway = moving ? walk * 0.08 * s : 0;
      g.save(); g.translate(s * r * 0.38, -r * 0.62); g.rotate(s * 0.2 + flop * s + sway);
      shape(() => g.ellipse(0, -r * 0.48, r * 0.24, r * 0.6, 0, 0, T), mid);
      shape(() => g.ellipse(0, -r * 0.45, r * 0.12, r * 0.44, 0, 0, T), pink, false);
      g.restore();
    } else if (A === 'bear') {
      shape(() => g.arc(s * r * 0.7, -r * 0.7, r * 0.33, 0, T), mid);
      shape(() => g.arc(s * r * 0.7, -r * 0.7, r * 0.17, 0, T), mixCol(C.c, 0.55), false);
    } else if (A === 'pig') {
      shape(() => { g.moveTo(s * r * 0.8, -r * 0.48); g.lineTo(s * r * 0.9, -r * 1.02); g.lineTo(s * r * 0.3, -r * 0.86); g.closePath(); }, mid);
      shape(() => { g.moveTo(s * r * 0.72, -r * 0.6); g.lineTo(s * r * 0.8, -r * 0.9); g.lineTo(s * r * 0.45, -r * 0.82); g.closePath(); }, pink, false);
    } else if (A === 'frog') {
      shape(() => g.arc(s * r * 0.44, -r * 0.7, r * 0.37, 0, T), mid);
    }
  }

  // ---- body with soft light
  const grd = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.15);
  grd.addColorStop(0, light); grd.addColorStop(0.55, mid); grd.addColorStop(1, mixCol(C.c, -0.18));
  shape(() => g.arc(0, 0, r, 0, T), grd);
  // tummy
  const fx = lx * r * 0.2, fy = ly * r * 0.12;
  g.fillStyle = A === 'frog' ? '#f4ffd6' : mixCol(C.c, 0.68);
  g.beginPath(); g.ellipse(fx * 0.6, r * (A === 'frog' ? 0.55 : 0.45) + fy * 0.3, r * (A === 'frog' ? 0.45 : 0.5), r * (A === 'frog' ? 0.3 : 0.38), 0, 0, T); g.fill();
  // markings
  if (A === 'cat') { g.strokeStyle = mixCol(C.d, 0.1); g.lineWidth = r * 0.07; for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(fx + k * r * 0.14, -r * 0.92); g.lineTo(fx + k * r * 0.12, -r * 0.72); g.stroke(); } }
  if (A === 'frog') { g.fillStyle = mixCol(C.c, -0.15); for (const [sx, sy, sr] of [[-0.5, -0.1, 0.1], [0.55, 0.05, 0.08], [-0.2, 0.15, 0.06]]) { g.beginPath(); g.arc(sx * r, sy * r, sr * r, 0, T); g.fill(); } }
  if (A === 'dog') { g.fillStyle = mixCol(C.d, 0.05); g.beginPath(); g.ellipse(-r * 0.36 + fx, -r * 0.14 + fy, r * 0.27, r * 0.24, -0.3, 0, T); g.fill(); }
  // ---- feet (little shoes at the bottom)
  for (const s of [-1, 1]) {
    const fy = r * 0.88 + (moving ? s * walk * r * 0.1 : 0), fx = s * r * 0.4 + (moving ? s * walk2 * r * 0.04 : 0);
    shape(() => g.ellipse(fx + lx * r * 0.08, fy, r * 0.23, r * 0.14, 0, 0, T), A === 'frog' ? mixCol(C.c, -0.15) : dark, mixCol(C.d, -0.25));
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(fx + lx * r * 0.08 - r * 0.06, fy - r * 0.05, r * 0.1, r * 0.05, 0, 0, T); g.fill();
  }

  // rim light
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = r * 0.07; g.beginPath(); g.arc(0, 0, r * 0.84, Math.PI * 1.08, Math.PI * 1.45); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.38)'; g.beginPath(); g.ellipse(-r * 0.42, -r * 0.46, r * 0.22, r * 0.12, -0.7, 0, T); g.fill();
  // floppy dog ears hang in front
  if (A === 'dog') for (const s of [-1, 1]) {
    const flap = moving ? walk * 0.15 * s : 0;
    g.save(); g.translate(s * r * 0.82, -r * 0.42); g.rotate(s * -0.3 + flap);
    shape(() => g.ellipse(0, r * 0.25, r * 0.26, r * 0.5, 0, 0, T), mixCol(C.d, 0.08), mixCol(C.d, -0.25));
    g.restore();
  }
  // little arms that swing while walking (raised when happy)
  for (const s of [-1, 1]) {
    const up = o.happy ? -r * 0.35 : 0, sw = moving ? s * walk * r * 0.12 : 0;
    shape(() => g.ellipse(s * r * 0.9, r * 0.36 + up + sw, r * 0.15, r * 0.19, s * (o.happy ? -0.6 : 0.35), 0, T), mid);
  }

  // ---- face looks toward the facing direction
  const frog = A === 'frog';
  const eyeX = frog ? r * 0.44 : r * 0.34, eyeY = frog ? -r * 0.72 + fy * 0.4 : -r * 0.12 + fy;
  const blink = o.blink || (!o.still && (now * 0.001 + col * 1.3 + animal * 0.7) % 4.2 < 0.12 && !o.stun && !o.happy);
  for (const s of [-1, 1]) {
    const ex = s * eyeX + fx * (frog ? 0.5 : 1), ey = eyeY;
    if (o.stun) {
      g.strokeStyle = ink; g.lineWidth = r * 0.08; const k = r * 0.12;
      g.beginPath(); g.moveTo(ex - k, ey - k); g.lineTo(ex + k, ey + k); g.moveTo(ex + k, ey - k); g.lineTo(ex - k, ey + k); g.stroke();
    } else if (o.happy) {
      g.strokeStyle = ink; g.lineWidth = r * 0.08; g.beginPath(); g.arc(ex, ey + r * 0.05, r * 0.13, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    } else if (blink) {
      g.strokeStyle = ink; g.lineWidth = r * 0.07; g.beginPath(); g.arc(ex, ey - r * 0.02, r * 0.13, 0.2, Math.PI - 0.2); g.stroke();
    } else {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, r * 0.21, r * 0.23, 0, 0, T); g.fill();
      g.strokeStyle = 'rgba(43,35,64,.25)'; g.lineWidth = r * 0.03; g.stroke();
      const px = ex + lx * r * 0.07, py = ey + ly * r * 0.06;
      g.fillStyle = '#4a3a6a'; g.beginPath(); g.arc(px, py, r * 0.14, 0, T); g.fill();
      g.fillStyle = ink; g.beginPath(); g.arc(px, py, r * 0.09, 0, T); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(px - r * 0.05, py - r * 0.06, r * 0.05, 0, T); g.fill();
      g.beginPath(); g.arc(px + r * 0.04, py + r * 0.04, r * 0.022, 0, T); g.fill();
    }
  }
  // cheeks
  g.fillStyle = 'rgba(255,110,150,.42)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.56 + fx, r * 0.2 + fy, r * 0.15, r * 0.09, 0, 0, T); g.fill(); }
  // snout / nose / mouth
  const mx = fx, my = r * 0.24 + fy;
  if (A === 'pig') {
    shape(() => g.ellipse(mx, my - r * 0.04, r * 0.26, r * 0.18, 0, 0, T), '#ffb6cb', pinkD);
    g.fillStyle = '#c75a7c'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(mx + s * r * 0.08, my - r * 0.04, r * 0.04, r * 0.065, 0, 0, T); g.fill(); }
  } else if (A === 'bear' || A === 'dog') {
    g.fillStyle = '#fff3e3'; g.beginPath(); g.ellipse(mx, my, r * 0.28, r * 0.2, 0, 0, T); g.fill();
    g.fillStyle = ink; g.beginPath(); g.ellipse(mx, my - r * 0.07, r * 0.1, r * 0.065, 0, 0, T); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(mx - r * 0.03, my - r * 0.09, r * 0.025, 0, T); g.fill();
  } else if (!frog) {
    g.fillStyle = A === 'cat' ? '#ff7d9c' : '#ff9ab3';
    g.beginPath(); g.moveTo(mx - r * 0.07, my - r * 0.1); g.lineTo(mx + r * 0.07, my - r * 0.1); g.lineTo(mx, my - r * 0.02); g.closePath(); g.fill();
  }
  g.strokeStyle = ink; g.lineWidth = r * 0.06; g.beginPath();
  if (o.stun) { g.moveTo(mx - r * 0.14, my + r * 0.1); g.quadraticCurveTo(mx - r * 0.07, my + r * 0.03, mx, my + r * 0.1); g.quadraticCurveTo(mx + r * 0.07, my + r * 0.17, mx + r * 0.14, my + r * 0.1); }
  else if (frog) g.arc(mx, my - r * 0.12, r * 0.3, 0.2, Math.PI - 0.2);
  else if (o.happy) { g.moveTo(mx - r * 0.12, my + r * 0.03); g.quadraticCurveTo(mx, my + r * 0.2, mx + r * 0.12, my + r * 0.03); }
  else { g.arc(mx - r * 0.07, my + r * 0.02, r * 0.07, 0.15, Math.PI - 0.15); g.moveTo(mx + r * 0.14, my + r * 0.03); g.arc(mx + r * 0.07, my + r * 0.02, r * 0.07, 0.15, Math.PI - 0.15); }
  g.stroke();
  if (o.happy && !frog) { g.fillStyle = '#ff6f8f'; g.beginPath(); g.ellipse(mx, my + r * 0.1, r * 0.06, r * 0.04, 0, 0, T); g.fill(); }
  if (A === 'bunny' && !o.stun) { g.fillStyle = '#fff'; g.strokeStyle = 'rgba(43,35,64,.4)'; g.lineWidth = r * 0.02; g.beginPath(); g.rect(mx - r * 0.05, my + r * 0.05, r * 0.1, r * 0.09); g.fill(); g.stroke(); g.beginPath(); g.moveTo(mx, my + r * 0.05); g.lineTo(mx, my + r * 0.14); g.stroke(); }
  if (A === 'cat') { g.strokeStyle = 'rgba(43,35,64,.45)'; g.lineWidth = r * 0.025; for (const s of [-1, 1]) for (const k of [-1, 1]) { g.beginPath(); g.moveTo(mx + s * r * 0.18, my - r * 0.02 + k * r * 0.03); g.lineTo(mx + s * r * 0.48, my - r * 0.06 + k * r * 0.07); g.stroke(); } }
  g.restore();
}

const critterCache = {};
function critterURL(col, animal, size) {
  size = size || 96; const key = col + '/' + animal + '/' + size;
  if (critterCache[key]) return critterCache[key];
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const g = cv.getContext('2d'); drawCritter(g, size / 2, size * 0.58, size * 0.32, col, animal, { noShadow: true, still: true });
  return critterCache[key] = cv.toDataURL('image/png');
}
