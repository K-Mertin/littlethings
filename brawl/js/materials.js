'use strict';
/* ------------------------------ materials ------------------------------
   Seeded, tileable textures painted once into small canvases (the same idea as
   Cobble Keep's texture painters), used as "detail maps": grey images centred on
   50% grey that are laid over a flat colour with the overlay blend mode. Grey
   leaves the colour as it is, lighter / darker pixels add grain, grout, cracks
   and wear, so one texture works on every colour a scene already uses.
   ?mat=0 turns all of this off (for comparing before / after), ?mat=1 forces it on.
   A device that can't keep up switches to the plain look by itself (see matWatch). */
const MAT_LS = (() => { try { return localStorage.getItem('buddybattle.mat'); } catch (e) { return null; } })();
let MAT = /[?&]mat=1/.test(location.search) || (!/[?&]mat=0/.test(location.search) && MAT_LS !== '0');
const MAT_FORCED = /[?&]mat=/.test(location.search);
/* frame-time watchdog: after 3 s of play, if the median frame takes longer than ~24 ms, go plain */
const matDts = [];
function matWatch(dt) {
  if (!MAT || MAT_FORCED) return;
  matDts.push(dt); if (matDts.length < 180) return;
  const s = matDts.slice().sort((a, b) => a - b), med = s[s.length >> 1]; matDts.length = 0;
  if (med > 24) { MAT = false; DETAIL = false; try { localStorage.setItem('buddybattle.mat', '0'); } catch (e) {} }
}
const MAT_TS = 256;                     // texture size in pixels, drawn at half size (128 world units)
function mrng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
const gv = v => { v = Math.max(0, Math.min(255, v | 0)); return `rgb(${v},${v},${v})`; };
function mwrap(x, y, r, fn) { for (const ox of [-MAT_TS, 0, MAT_TS]) for (const oy of [-MAT_TS, 0, MAT_TS]) { if (x + ox + r < 0 || x + ox - r > MAT_TS || y + oy + r < 0 || y + oy - r > MAT_TS) continue; fn(x + ox, y + oy); } }
function mspeck(g, R, n, lo, hi, r0, r1, a) {
  for (let i = 0; i < n; i++) {
    const x = R() * MAT_TS, y = R() * MAT_TS, r = r0 + R() * (r1 - r0);
    g.globalAlpha = a * (0.4 + R() * 0.6); g.fillStyle = gv(lo + R() * (hi - lo));
    mwrap(x, y, r, (X, Y) => { g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill(); });
  }
  g.globalAlpha = 1;
}
function mblotch(g, R, n, r0, r1, a) { // big soft stains, light and dark
  for (let i = 0; i < n; i++) {
    const x = R() * MAT_TS, y = R() * MAT_TS, r = r0 + R() * (r1 - r0), v = R() > 0.5 ? 255 : 0;
    mwrap(x, y, r, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, `rgba(${v},${v},${v},${a})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(X - r, Y - r, r * 2, r * 2); });
  }
}
function mnoise(g, R, a) { // per-pixel grain
  const im = g.getImageData(0, 0, MAT_TS, MAT_TS), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * a; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
}
function mcrack(g, R, n, a) {
  g.strokeStyle = `rgba(0,0,0,${a})`; g.lineWidth = 1.4; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    let x = R() * MAT_TS, y = R() * MAT_TS, ang = R() * 7; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 8; s++) { ang += (R() - 0.5) * 1.2; x += Math.cos(ang) * 9; y += Math.sin(ang) * 9; g.lineTo(x, y); }
    g.stroke();
  }
}
/* rows of small rectangles with grout: bricks, 二丁掛 tiles, mosaic, paving slabs */
function mbond(g, R, bw, bh, grout, jit, bevel, offset = 0.5) {
  g.fillStyle = gv(70); g.fillRect(0, 0, MAT_TS, MAT_TS);
  const rows = Math.round(MAT_TS / bh), cols = Math.round(MAT_TS / bw); bh = MAT_TS / rows; bw = MAT_TS / cols;
  for (let r = 0; r < rows; r++) for (let k = -1; k <= cols; k++) {
    const x = k * bw + (r & 1) * bw * offset + grout / 2, y = r * bh + grout / 2, w = bw - grout, h = bh - grout, v = 128 + (R() - 0.5) * jit;
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, gv(v + bevel)); gr.addColorStop(0.3, gv(v)); gr.addColorStop(1, gv(v - bevel * 0.7));
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
}
const MAT_PAINT = {
  asphalt: (g, R) => { g.fillStyle = gv(128); g.fillRect(0, 0, MAT_TS, MAT_TS); mblotch(g, R, 14, 30, 90, 0.10); mspeck(g, R, 900, 60, 200, 0.6, 1.8, 0.7); mspeck(g, R, 90, 170, 230, 1.2, 2.6, 0.6); mcrack(g, R, 3, 0.35); mnoise(g, R, 26); },
  plaster: (g, R) => { g.fillStyle = gv(128); g.fillRect(0, 0, MAT_TS, MAT_TS); mblotch(g, R, 18, 20, 70, 0.09); mspeck(g, R, 300, 100, 160, 0.5, 1.4, 0.5); mnoise(g, R, 18); },
  mosaic: (g, R) => { mbond(g, R, 16, 16, 2.5, 38, 22, 0); mnoise(g, R, 10); },           // 馬賽克磁磚
  ertile: (g, R) => { mbond(g, R, 64, 21, 3.5, 34, 26); mblotch(g, R, 6, 30, 70, 0.06); mnoise(g, R, 12); }, // 二丁掛
  brick: (g, R) => { mbond(g, R, 42, 21, 4, 46, 30); mspeck(g, R, 160, 90, 170, 0.6, 1.4, 0.5); mnoise(g, R, 14); },
  slab: (g, R) => { mbond(g, R, 128, 64, 4, 30, 16); mblotch(g, R, 10, 20, 60, 0.08); mspeck(g, R, 500, 90, 180, 0.5, 1.3, 0.5); mcrack(g, R, 2, 0.25); mnoise(g, R, 14); },
  tile: (g, R) => { mbond(g, R, 64, 64, 3, 16, 18, 0); mblotch(g, R, 8, 30, 60, 0.06); mnoise(g, R, 8); },
  planks: (g, R) => {
    mbond(g, R, 256, 32, 3, 30, 8);
    g.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) { const y = R() * MAT_TS, ph = R() * 7, a = 0.6 + R() * 1.6; g.strokeStyle = gv(R() > 0.5 ? 90 : 165); g.globalAlpha = 0.45; g.beginPath(); for (let x = 0; x <= MAT_TS; x += 8) g.lineTo(x, y + Math.sin(x / MAT_TS * Math.PI * 4 + ph) * a); g.stroke(); }
    g.globalAlpha = 1; for (let i = 0; i < 6; i++) { const x = R() * MAT_TS, y = R() * MAT_TS; g.fillStyle = gv(80); g.beginPath(); g.ellipse(x, y, 4, 2.2, 0, 0, 7); g.fill(); }
    mnoise(g, R, 10);
  },
  grass: (g, R) => {
    g.fillStyle = gv(128); g.fillRect(0, 0, MAT_TS, MAT_TS); mblotch(g, R, 16, 20, 60, 0.12); g.lineCap = 'round';
    for (let i = 0; i < 1400; i++) { const x = R() * MAT_TS, y = R() * MAT_TS, l = 3 + R() * 5; g.strokeStyle = gv(R() > 0.45 ? 175 + R() * 50 : 60 + R() * 40); g.globalAlpha = 0.55; g.lineWidth = 1.3; mwrap(x, y, 8, (X, Y) => { g.beginPath(); g.moveTo(X, Y); g.lineTo(X + (R() - 0.5) * 3, Y - l); g.stroke(); }); }
    g.globalAlpha = 1;
  },
  sand: (g, R) => {
    g.fillStyle = gv(128); g.fillRect(0, 0, MAT_TS, MAT_TS); g.lineWidth = 2.5;
    for (let i = 0; i < 9; i++) { g.strokeStyle = gv(i & 1 ? 160 : 100); g.globalAlpha = 0.35; g.beginPath(); for (let x = 0; x <= MAT_TS; x += 8) g.lineTo(x, i * 28.4 + Math.sin(x / MAT_TS * Math.PI * 4 + i) * 5); g.stroke(); }
    g.globalAlpha = 1; mspeck(g, R, 700, 80, 220, 0.4, 1.2, 0.7); mnoise(g, R, 20);
  },
  dirt: (g, R) => { g.fillStyle = gv(128); g.fillRect(0, 0, MAT_TS, MAT_TS); mblotch(g, R, 20, 15, 50, 0.14); mspeck(g, R, 140, 70, 200, 1.2, 3.2, 0.6); mspeck(g, R, 600, 90, 170, 0.4, 1, 0.6); mnoise(g, R, 20); },
  metal: (g, R) => { // corrugated sheet / rolling shutter
    for (let x = 0; x < MAT_TS; x++) { const v = 128 + Math.sin(x / MAT_TS * Math.PI * 2 * 24) * 26; g.fillStyle = gv(v); g.fillRect(x, 0, 1, MAT_TS); }
    mblotch(g, R, 10, 20, 50, 0.1); for (let i = 0; i < 20; i++) { const x = R() * MAT_TS, y = R() * MAT_TS, h = 20 + R() * 60; const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(90,50,20,.35)'); gr.addColorStop(1, 'rgba(90,50,20,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + R() * 3, h); }
    mnoise(g, R, 10);
  },
  fabric: (g, R) => { // tight knit for shirts: tiny diagonal weave
    g.fillStyle = gv(128); g.fillRect(0, 0, MAT_TS, MAT_TS);
    for (let y = 0; y < MAT_TS; y += 2) for (let x = 0; x < MAT_TS; x += 2) { g.fillStyle = gv(((x + y) >> 1) & 1 ? 140 : 116); g.fillRect(x, y, 2, 2); }
    mblotch(g, R, 12, 10, 30, 0.08); mnoise(g, R, 14);
  }
};
const MAT_CACHE = {};
function matPat(c, name) {
  let m = MAT_CACHE[name];
  if (!m) {
    const cv = document.createElement('canvas'); cv.width = cv.height = MAT_TS; const g = cv.getContext('2d');
    MAT_PAINT[name](g, mrng(name.length * 977 + name.charCodeAt(0) * 31)); m = MAT_CACHE[name] = { cv, pat: null };
  }
  if (!m.pat) { m.pat = c.createPattern(m.cv, 'repeat'); if (m.pat.setTransform && typeof DOMMatrix !== 'undefined') m.pat.setTransform(new DOMMatrix().scale(0.5)); }
  return m.pat;
}
/* a texture baked onto a colour: the detail map is blended once into a tile, so the
   game only does a plain pattern fill each frame (blend modes are slow on some devices) */
function matTex(c, name, col, a) {
  const key = name + col + a; let m = MAT_CACHE[key];
  if (!m) {
    matPat(c, name); const src = MAT_CACHE[name].cv, cv = document.createElement('canvas'); cv.width = cv.height = MAT_TS; const g = cv.getContext('2d');
    g.fillStyle = col; g.fillRect(0, 0, MAT_TS, MAT_TS); g.globalCompositeOperation = 'overlay'; g.globalAlpha = a; g.drawImage(src, 0, 0);
    m = MAT_CACHE[key] = { pat: c.createPattern(cv, 'repeat') }; if (m.pat.setTransform && typeof DOMMatrix !== 'undefined') m.pat.setTransform(new DOMMatrix().scale(0.5));
  }
  return m.pat;
}
/* fill a rectangle with colour col in material name (plain colour when materials are off) */
function paint(c, name, col, x, y, w, h, a = 0.85) { c.fillStyle = MAT ? matTex(c, name, col, a) : col; c.fillRect(x, y, w, h); }
const FLOOR_MAT = { street: ['asphalt', 0.75], temple: ['slab', 0.8], roof: ['tile', 0.7], market: ['asphalt', 0.6], park: ['grass', 0.75], path: ['slab', 0.9], mrt: ['tile', 0.55], beach: ['sand', 0.7], tea: ['dirt', 0.8], harbor: ['planks', 0.8] };
function floorFill(c, kind, col, x, y, w, h) { const m = FLOOR_MAT[kind]; paint(c, m[0], col, x, y, w, h, m[1]); }
/* after the theme: the scenery behind throws a soft shadow onto the back of the floor */
function matFloor(c) { if (MAT) aoBand(c, W.camX - 4, FLOOR_TOP, Wv + 8, 26, 0.3); }
/* vertical soft shadow (ambient occlusion) under a ledge, or from the floor up */
function aoBand(c, x, y, w, h, a = 0.35, up = false) {
  if (!MAT) return;
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(up ? 1 : 0, `rgba(30,20,40,${a})`); g.addColorStop(up ? 0 : 1, 'rgba(30,20,40,0)');
  c.fillStyle = g; c.fillRect(x, y, w, h);
}
/* rain / AC drip streaks running down a wall from y */
function streaks(c, x, y, w, h, seed, a = 0.16) {
  if (!MAT) return;
  for (let k = 0; k < 5; k++) {
    const sx = x + hash(seed + k * 1.7) * w, sw = 3 + hash(seed + k * 2.9) * 9, sh = h * (0.4 + hash(seed + k * 4.1) * 0.6);
    const g = c.createLinearGradient(0, y, 0, y + sh); g.addColorStop(0, `rgba(70,55,45,${a})`); g.addColorStop(1, 'rgba(70,55,45,0)');
    c.fillStyle = g; c.fillRect(sx, y, sw, sh);
  }
}
/* per-theme light: the rim colour on characters and a screen tint */
const LIGHT = {
  street: { rim: 'rgba(255,244,214,.85)', sun: 'rgba(255,214,150,.16)', shade: 'rgba(40,40,90,.14)' },
  roof: { rim: 'rgba(255,170,120,.9)', sun: 'rgba(255,150,90,.22)', shade: 'rgba(60,30,90,.22)' },
  market: { rim: 'rgba(255,120,220,.9)', sun: 'rgba(255,190,90,.14)', shade: 'rgba(20,10,60,.3)' },
  park: { rim: 'rgba(240,255,220,.85)', sun: 'rgba(255,240,170,.2)', shade: 'rgba(30,60,60,.16)' },
  mrt: { rim: 'rgba(200,240,255,.85)', sun: 'rgba(220,240,255,.12)', shade: 'rgba(20,30,60,.2)' },
  beach: { rim: 'rgba(255,250,220,.9)', sun: 'rgba(255,230,160,.24)', shade: 'rgba(20,70,110,.14)' },
  tea: { rim: 'rgba(230,255,210,.85)', sun: 'rgba(255,240,180,.2)', shade: 'rgba(30,60,50,.16)' },
  harbor: { rim: 'rgba(200,236,255,.9)', sun: 'rgba(255,220,160,.2)', shade: 'rgba(20,40,80,.2)' }
};
const curLight = () => LIGHT[(typeof W !== 'undefined' && W && W.theme) || 'street'] || LIGHT.street;
/* screen-space light: warm light from the upper left, a cool shade to the lower right and a
   soft vignette, baked into a small canvas per theme and stretched over the view */
const LIGHT_CV = document.createElement('canvas'); let lightKey = '';
function matLight(c) {
  if (!MAT) return;
  const L = curLight(), w = Wv, h = VHv, key = W.theme + w + 'x' + h;
  if (key !== lightKey) {
    lightKey = key; const sw = 192, sh = Math.max(32, Math.round(192 * h / w)); LIGHT_CV.width = sw; LIGHT_CV.height = sh; const g = LIGHT_CV.getContext('2d');
    let gr = g.createLinearGradient(0, 0, sw * 0.8, sh); gr.addColorStop(0, L.sun); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, L.shade);
    g.fillStyle = gr; g.fillRect(0, 0, sw, sh);
    gr = g.createRadialGradient(sw / 2, sh * 0.48, sh * 0.45, sw / 2, sh * 0.5, Math.max(sw, sh) * 0.78); gr.addColorStop(0, 'rgba(20,14,40,0)'); gr.addColorStop(1, 'rgba(20,14,40,.3)');
    g.fillStyle = gr; g.fillRect(0, 0, sw, sh);
  }
  c.drawImage(LIGHT_CV, W.camX - 2, viewTop - offY - 2, w + 4, h + 4);
}
/* soft contact shadow under a character: a wide penumbra and a darker core */
function matShadow(c, x, y, rx, ry) {
  const g = c.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, 'rgba(20,16,40,.42)'); g.addColorStop(0.45, 'rgba(20,16,40,.3)'); g.addColorStop(1, 'rgba(20,16,40,0)');
  c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = g; c.beginPath(); c.arc(x, y, rx * 1.15, 0, TAU); c.fill(); c.restore();
}
/* a thin back-light along the lower-right edge of a round shape, in the scene's light colour */
function rimLight(c, x, y, rx, ry, rot = 0, w = 1.8) {
  if (!MAT) return;
  c.save(); c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.clip();
  c.strokeStyle = curLight().rim; c.lineWidth = w; c.beginPath(); c.ellipse(x - w * 0.7, y - w * 0.7, rx, ry, rot, -0.35, 1.7); c.stroke();
  c.restore();
}
