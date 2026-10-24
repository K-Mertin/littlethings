'use strict';
/* ------------------------- hero redesign (v2) -------------------------
   Same proportions as before, more drawing: hair locks, a signature accessory
   per hero, eyelids, shoe stripes. Plus animal heroes that read as HEROES, not
   monsters: they wear clothes and gear, use bright unnatural colours, have big
   coloured eyes and smile, and are species no enemy uses. */
let REDRAW = !/[?&]redraw=0/.test(location.search);

/* hair locks: a few darker curves over the top of the head */
function hairLocks(c, L) {
  if (!REDRAW || !L.hair || L.animal || L.beast || ['hood', 'witch', 'bubblecap', 'bald'].includes(L.style)) return;
  const R = HR; c.save(); c.beginPath(); c.arc(0, 0, R + 0.5, Math.PI, TAU); c.lineTo(R, -4); c.lineTo(-R, -4); c.clip();
  c.strokeStyle = shade(L.hair, -0.32); c.lineWidth = 1.1; c.lineCap = 'round'; c.beginPath();
  for (const [x0, k] of [[-7, 1], [-2, 1.15], [3, 1.05], [8, 0.9]]) { c.moveTo(x0 - 3, -R + 1); c.quadraticCurveTo(x0 + 2, -R * 0.6 * k, x0 + 5, -5); }
  c.stroke(); c.restore();
}
/* behind the body: cape, backpack */
function drawBack(c, L, top, hip, f) {
  if (!REDRAW) return;
  const t = f ? f.clock : 0, run = f && (f.state === 'run' || Math.abs(f.vx || 0) > 3) ? 1.7 : 1;
  if (L.cape) {
    const w = Math.sin(t * 0.12 * run) * 3 * run;
    c.beginPath(); c.moveTo(top.x + 2, top.y + 2); c.quadraticCurveTo(top.x - 14 - 6 * run, top.y + 10 + w, hip.x - 16 - 8 * run, hip.y + 10 + w);
    c.lineTo(hip.x - 4, hip.y + 8); c.quadraticCurveTo(top.x - 4, top.y + 14, top.x + 2, top.y + 2); c.closePath();
    c.fillStyle = L.cape; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
    if (L.capeTrim) { c.save(); c.clip(); c.strokeStyle = L.capeTrim; c.lineWidth = 2.5; c.beginPath(); c.moveTo(hip.x - 18 - 8 * run, hip.y + 8 + w); c.lineTo(hip.x - 2, hip.y + 6); c.stroke(); c.restore(); }
    if (L.leafCape) { c.fillStyle = shade(L.cape, 0.25); for (let i = 0; i < 4; i++) { const k = i / 4, x = lerp(top.x - 4, hip.x - 12 - 6 * run, k), y = lerp(top.y + 8, hip.y + 6, k) + w * k; c.beginPath(); c.ellipse(x, y, 4, 2, 0.6, 0, TAU); c.fill(); } }
  }
  if (L.pack) { // little water tank on the back
    const x = lerp(hip.x, top.x, 0.6) - 11, y = lerp(hip.y, top.y, 0.6) - 4;
    c.beginPath(); c.roundRect ? c.roundRect(x - 5, y - 9, 10, 18, 4) : c.rect(x - 5, y - 9, 10, 18); c.fillStyle = L.pack; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    c.fillStyle = 'rgba(190,240,255,.85)'; c.fillRect(x - 2.5, y - 5, 5, 9); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 0.5, y - 2, 1.2, 0, TAU); c.fill();
  }
}
/* at the neck, in front of the body */
function drawNeck(c, L, top) {
  if (!REDRAW) return;
  if (L.collar) { for (let i = 0; i < 6; i++) { const a = Math.PI * (0.95 + i * 0.22); blob(c, top.x + Math.cos(a) * 9 + 2, top.y + 4 + Math.sin(a) * 2.5 + 2, 3.6, 3.2, L.collar); } }
  if (L.bell) { c.strokeStyle = L.bellBand || '#e8432f'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(top.x - 7, top.y + 3); c.quadraticCurveTo(top.x + 2, top.y + 7, top.x + 10, top.y + 3); c.stroke(); blob(c, top.x + 4, top.y + 8, 3.2, 3.2, L.bell); c.fillStyle = INK; c.fillRect(top.x + 2.5, top.y + 8.5, 3, 1); }
}
/* on the head, over hair and face */
function drawHeadAcc(c, L, P, f) {
  if (!REDRAW) return;
  const R = HR;
  if (L.goggles) {
    c.save(); c.beginPath(); c.arc(0, 0, R + 0.6, 0, TAU); c.clip(); c.fillStyle = '#2b2733'; c.fillRect(-R - 2, -R * 0.62 - 1.5, R * 2 + 4, 3); c.restore();
    for (const gx of [R * 0.12, R * 0.68]) { blob(c, gx, -R * 0.62, 3.6, 3.2, L.goggles); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(gx - 1, -R * 0.62 - 1, 1.1, 0, TAU); c.fill(); }
  }
  if (L.mask) { c.save(); c.beginPath(); c.ellipse(R * 0.45, -1, R * 0.6 + 0.5, 4.8, 0, 0, TAU); c.clip(); c.fillStyle = L.mask; c.fillRect(0, 1.2, R * 2, 6); c.restore(); c.strokeStyle = 'rgba(28,26,46,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(R * 0.05, 1.4); c.lineTo(R * 1.05, 1.4); c.stroke(); }
  if (L.catEars) for (const [x, k] of [[-5, 0.85], [4, 1]]) { c.beginPath(); c.moveTo(x - 4 * k, -R + 3); c.lineTo(x, -R - 7 * k); c.lineTo(x + 4.5 * k, -R + 2); c.closePath(); c.fillStyle = L.catEars; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.moveTo(x - 1.8 * k, -R + 1.5); c.lineTo(x + 0.2, -R - 3.6 * k); c.lineTo(x + 2.2 * k, -R + 1); c.closePath(); c.fillStyle = '#ffd0e0'; c.fill(); }
  if (L.leaf) { c.save(); c.translate(-6, -R - 2); c.rotate(-0.7); c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(-5, -3, 0, -9); c.quadraticCurveTo(5, -3, 0, 4); c.fillStyle = L.leaf; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.moveTo(0, 3); c.lineTo(0, -6); c.lineWidth = 1; c.stroke(); c.restore(); }
  if (L.flake) { c.save(); c.translate(-4, -R + 2); c.strokeStyle = INK; c.lineWidth = 3.4; c.lineCap = 'round'; const arms = () => { c.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.moveTo(Math.cos(a) * 4.5, Math.sin(a) * 4.5); c.lineTo(-Math.cos(a) * 4.5, -Math.sin(a) * 4.5); } c.stroke(); }; arms(); c.strokeStyle = L.flake; c.lineWidth = 1.6; arms(); c.restore(); }
  if (L.earring) drawStar(c, 1, 6, 2.6, L.earring);
}
/* hands and feet */
function drawHandAcc(c, L, g, fist) {
  if (!REDRAW || !L.wrap) return;
  c.save(); c.translate(g.h.x, g.h.y); c.rotate(-g.s2); c.beginPath(); c.arc(0, 0, fist + 0.3, 0, TAU); c.clip();
  c.fillStyle = L.wrap; c.fillRect(-fist - 1, -fist - 1, fist * 2 + 2, fist * 0.9); c.strokeStyle = 'rgba(28,26,46,.45)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-fist, -fist * 0.55); c.lineTo(fist, -fist * 0.35); c.moveTo(-fist, -fist * 0.2); c.lineTo(fist, 0); c.stroke(); c.restore();
}
function drawShoeAcc(c, L, fx, fy, rx, rot) {
  if (!REDRAW || L.animal || !(L.stripe || L.trim || L.acc)) return;
  c.save(); c.translate(fx, fy); c.rotate(rot); c.strokeStyle = L.stripe || L.trim || L.acc; c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-rx * 0.55, 1.2); c.quadraticCurveTo(-rx * 0.05, -2.4, rx * 0.45, 0.6); c.stroke(); c.restore();
}
/* upper eyelid: a thicker line along the top of the eye */
function eyeLid(c, ex, ey, lash) {
  if (!REDRAW) return;
  c.strokeStyle = INK; c.lineWidth = lash ? 1.9 : 1.6; c.lineCap = 'round'; c.beginPath(); c.ellipse(ex, ey, 2.9, 4, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
}

/* ---------------- animal heroes: heads (drawn from drawHair) ---------------- */
function beastHead(c, L, back, f, P) {
  const R = HR, t = f ? f.clock : 0;
  switch (L.style) {
    case 'pangolin': { // 阿甲：穿山甲
      if (back) { // overlapping scales down the back of the head
        for (let i = 0; i < 4; i++) { const a = -1.9 - i * 0.42; blob(c, Math.cos(a) * (R - 1), Math.sin(a) * (R - 1), 5, 4, shade(L.fur, -0.08 - i * 0.03), a + Math.PI / 2); }
        return;
      }
      c.save(); c.beginPath(); c.arc(0, 0, R + 0.5, 0, TAU); c.clip(); // scale cap
      for (let r = 0; r < 3; r++) for (let k = 0; k < 5 - r; k++) { const x = -R + 2 + k * 5.6 + r * 2.8, y = -R + 1 + r * 4.2; c.beginPath(); c.moveTo(x - 3.6, y); c.quadraticCurveTo(x, y + 6.5, x + 3.6, y); c.closePath(); c.fillStyle = shade(L.fur, -0.18 + r * 0.06); c.fill(); c.lineWidth = 1.1; c.strokeStyle = 'rgba(28,26,46,.65)'; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(x - 1.6, y + 1.2); c.quadraticCurveTo(x, y + 3, x + 1.2, y + 1.6); c.stroke(); }
      c.restore();
      c.beginPath(); c.moveTo(R * 0.45, 3); c.quadraticCurveTo(R + 9, 3, R + 10, 7); c.quadraticCurveTo(R + 4, 10.5, R * 0.45, 9.5); c.closePath(); c.fillStyle = L.skin; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); // snout
      blob(c, R + 9.5, 6.5, 2, 1.8, '#3a2a30');
      blob(c, -3, -3, 3.2, 3.6, L.skin); // small round ear
      if (L.band) { c.save(); c.beginPath(); c.arc(0, 0, R + 0.6, 0, TAU); c.clip(); c.fillStyle = L.band; c.fillRect(-R - 2, -R * 0.72, R * 2 + 4, 3.4); c.restore(); seg(c, [P2(-R + 1, -R * 0.62), P2(-R - 7, -R * 0.5 + Math.sin(t * 0.25) * 2), P2(-R - 13, -R * 0.3)], 3, L.band); }
      break;
    }
    case 'otter': { // 水水：水獺
      if (back) return;
      for (const [x, y] of [[-6, -R + 3], [4, -R + 1]]) { blob(c, x, y, 3.4, 3.2, L.fur); c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fillStyle = '#d98a7a'; c.fill(); }
      c.beginPath(); c.ellipse(R * 0.5, 4, 9, 6.5, 0, 0, TAU); c.fillStyle = L.skin; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); // cream face
      blob(c, R * 0.95, 2.4, 2.6, 2, '#3a2a30');
      c.strokeStyle = 'rgba(28,26,46,.7)'; c.lineWidth = 0.9; c.beginPath(); for (const dy of [0, 2.2]) { c.moveTo(R * 0.9, 4.2 + dy); c.lineTo(R + 7, 3 + dy * 1.6); } c.stroke();
      break;
    }
    case 'deer': { // 小鹿：梅花鹿，鹿角開花
      if (back) { c.beginPath(); c.moveTo(-6, -R + 4); c.quadraticCurveTo(-R - 8, -R - 2, -R - 6, -R + 8); c.quadraticCurveTo(-R - 1, -3, -6, -R + 4); c.fillStyle = L.fur; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); return; }
      const antler = (x, s) => { c.save(); c.translate(x, -R + 2); c.scale(s, s); c.strokeStyle = INK; c.lineWidth = 4.2; c.lineCap = 'round'; const path = () => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-2, -8, 2, -15); c.moveTo(-0.5, -6); c.lineTo(-6, -10); c.moveTo(1, -11); c.lineTo(6, -15); c.stroke(); }; path(); c.strokeStyle = L.antler; c.lineWidth = 2; path();
        for (const [px, py, col] of [[2, -16, L.flower], [-6.5, -10.5, L.flower2], [6.5, -15.5, L.flower2]]) { c.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; c.beginPath(); c.arc(px + Math.cos(a) * 1.8, py + Math.sin(a) * 1.8, 1.5, 0, TAU); c.fill(); } c.fillStyle = '#ffe28a'; c.beginPath(); c.arc(px, py, 1, 0, TAU); c.fill(); }
        c.restore(); };
      antler(-6, 0.85); antler(3, 1);
      c.fillStyle = '#fff6e6'; for (const [x, y] of [[-7, -5], [-4, 1], [-9, 3], [-2, -8]]) { c.beginPath(); c.arc(x, y, 1.4, 0, TAU); c.fill(); }
      c.beginPath(); c.ellipse(R * 0.62, 4.5, 6.5, 5, 0, 0, TAU); c.fillStyle = L.skin; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
      blob(c, R * 0.62 + 5, 2.6, 2.2, 1.8, '#3a2a30');
      break;
    }
    case 'rabbit': { // 跳跳：兔子
      const ear = (x, rot, fold, col) => { c.save(); c.translate(x, -R + 3); c.rotate(rot); c.beginPath(); if (fold) { c.moveTo(-3.5, 0); c.quadraticCurveTo(-4, -12, 2, -13); c.quadraticCurveTo(9, -13, 10, -7); c.quadraticCurveTo(4, -9, 3.5, 0); } else c.ellipse(0, -10, 4, 11, 0, 0, TAU); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
        if (!fold) { c.beginPath(); c.ellipse(0, -10, 1.8, 7.5, 0, 0, TAU); c.fillStyle = '#ffc2d6'; c.fill(); } c.restore(); };
      if (back) { ear(-5, -0.35 + Math.sin(t * 0.09) * 0.05, true, shade(L.fur, -0.08)); return; }
      ear(3, 0.12 + Math.sin(t * 0.09 + 1) * 0.06, false, L.fur);
      blob(c, R * 0.85, 3.4, 2, 1.6, '#ff8aa8');
      c.strokeStyle = 'rgba(28,26,46,.6)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(R * 0.8, 5.2); c.lineTo(R + 6, 4.4); c.moveTo(R * 0.8, 6.4); c.lineTo(R + 6, 7.2); c.stroke();
      break;
    }
  }
}
function beastTail(c, L, hip, f) {
  const t = f ? f.clock : 0, y = hip.y, fur = L.fur;
  if (L.tail === 'scaly') { const w = Math.sin(t * 0.08) * 2; for (let i = 4; i >= 0; i--) blob(c, -8 - i * 5, y + 2 - i * 1.5 + w * i * 0.2, 6.5 - i * 0.8, 5 - i * 0.5, shade(fur, -0.05 - i * 0.03), 0.3); }
  else if (L.tail === 'otter') { const w = Math.sin(t * 0.1) * 3; c.beginPath(); c.moveTo(-4, y - 4); c.quadraticCurveTo(-18, y - 2, -26, y + 4 + w); c.quadraticCurveTo(-16, y + 8, -4, y + 5); c.closePath(); c.fillStyle = fur; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); }
  else if (L.tail === 'puff') blob(c, -11, y - 2, 4.6, 4.2, L.tailCol || '#ffffff');
}

/* the four animal hero looks (design proposal) */
const BEASTS = {
  jia: { name: '阿甲', en: 'Jia', kind: '穿山甲', look: mkLook({ style: 'pangolin', beast: true, fur: '#f0a94a', skin: '#ffe2b0', shirt: '#2fb8a8', trim: '#ffd34d', pants: '#24577a', shoe: '#ff5a4a', stripe: '#fff6e6', glove: '#ffe2b0', band: '#ff4d3d', tail: 'scaly', eye: '#7a3a14', emblem: 'power', emblemCol: '#ffd34d' }) },
  otto: { name: '水水', en: 'Otto', kind: '水獺', look: mkLook({ style: 'otter', beast: true, fur: '#c9875a', skin: '#fff0d8', shirt: '#ffd23f', trim: '#ffffff', pants: '#2f6fd1', shoe: '#3fa9ff', stripe: '#ffffff', glove: '#c9875a', goggles: '#7fd8ff', tail: 'otter', eye: '#2a6fd1', emblem: 'drop', emblemCol: '#3fa9ff', sleeve: 'long' }) },
  lulu: { name: '小鹿', en: 'Lulu', kind: '梅花鹿', look: mkLook({ style: 'deer', beast: true, fur: '#f0a070', skin: '#fff3e2', shirt: '#7fd6a0', trim: '#ffffff', pants: '#3f8f6a', shoe: '#fff6e6', stripe: '#ff8ab3', glove: '#f0a070', antler: '#f6e3c0', flower: '#ff8ab3', flower2: '#fff6e6', cape: '#3fae6a', leafCape: true, tail: 'puff', eye: '#3f8f5a', lash: true, emblem: 'star', emblemCol: '#ffe28a' }) },
  bunny: { name: '跳跳', en: 'Hop', kind: '兔子', look: mkLook({ style: 'rabbit', beast: true, fur: '#f6f2ff', skin: '#ffffff', shirt: '#5fb8ff', trim: '#ffd34d', pants: '#ff6a7a', shoe: '#ff4d3d', stripe: '#ffffff', glove: '#f6f2ff', tail: 'puff', eye: '#c2407a', emblem: 'star', emblemCol: '#ffd34d', scarf: '#ffd34d' }) }
};
/* redesign accessories for the current heroes */
const LOOK2 = {
  rex: { wrap: '#ff3b2f', stripe: '#ff3b2f' },
  yuki: { collar: '#ffffff', flake: '#bfe8ff', stripe: '#3fa9ff' },
  gan: { wrap: '#fff6e6', stripe: '#ffcc33' },
  kite: { mask: '#5a6286', stripe: '#ff4d3d' },
  zap: { goggles: '#ffd23f', stripe: '#ffd23f', wrap: '#ffd23f' },
  feng: { leaf: '#5fd08a', stripe: '#ffffff' },
  mimi: { catEars: '#ff8ab3', bell: '#ffd23f', stripe: '#ff8ab3' },
  moon: { cape: '#4a2fa0', capeTrim: '#ffd23f', earring: '#ffd23f', stripe: '#8a5cf6' },
  bobo: { pack: '#3fa9ff', goggles: '#bff0ff', stripe: '#5fd0ff' }
};
for (const id in LOOK2) if (CHARS[id]) Object.assign(CHARS[id].look, LOOK2[id]);

/* ------------------------------ line weight ------------------------------
   Character outlines: LINE_K scales every ink line drawn on a fighter, LINE_COL
   draws them in a darker shade of the colour they outline instead of near-black
   (softer, less "thick frame"). Done by wrapping stroke() while a fighter is drawn. */
let LINE_K = 0.85, LINE_COL = true, LINE_DK = 0.3;          // 2026-10-24: option E — lines a bit darker than the colour beside them
const LINE_SH = new Map(); const lineCol = fs => { let v = LINE_SH.get(fs + LINE_DK); if (!v) { v = shade(fs, -LINE_DK); LINE_SH.set(fs + LINE_DK, v); } return v; };
const INK_N = '#1c1a2e';
function withLines(c, fn) {
  if ((LINE_K === 1 && !LINE_COL) || c.__lines) return fn();
  const st = c.stroke, sr = c.strokeRect; c.__lines = true;
  const wrap = orig => function (...a) {
    if (this.strokeStyle !== INK_N || this.__face) return orig.apply(this, a);
    const lw = this.lineWidth; this.lineWidth = lw * LINE_K;
    if (LINE_COL) { const fs = this.fillStyle; this.strokeStyle = typeof fs === 'string' && fs[0] === '#' && fs !== INK_N ? lineCol(fs) : '#3a3350'; }
    orig.apply(this, a); this.lineWidth = lw; this.strokeStyle = INK_N;
  };
  c.stroke = wrap(st); c.strokeRect = wrap(sr);
  try { return fn(); } finally { delete c.stroke; delete c.strokeRect; c.__lines = false; }
}
/* eyes, brows and mouth keep their dark ink so faces stay crisp */
const _drawFaceL = drawFace;
drawFace = function (c, L, P) { c.__face = true; try { return _drawFaceL(c, L, P); } finally { c.__face = false; } };
const _drawBodyL = drawBody;
drawBody = function (c, L, P, f) { return withLines(c, () => _drawBodyL(c, L, P, f)); };
const _drawPortraitL = drawPortrait;
drawPortrait = function (c, ...a) { return withLines(c, () => _drawPortraitL(c, ...a)); };
for (const k in DRAWERS) { const d = DRAWERS[k]; DRAWERS[k] = (c, f) => withLines(c, () => d(c, f)); }
