// 萬軍守城 — 大軍對決的畫面：紅色人海、藍軍、戰線、兩側走廊
'use strict';

const CLA = {};
// 一條「人海」：從上面往下看的一排排小兵（12 公尺寬），紅、藍各兩格動畫
function buildClashArt() {
  const W = 1200, H = 64;
  const mkCrowd = (body, head, hi, seed) => mk(W, H, g => {
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (const [y0, off] of [[22, 0], [46, 14]]) {
      for (let x = -10 + off; x < W + 10; x += 28) {
        const x1 = x + (rnd() - 0.5) * 8, y1 = y0 + (rnd() - 0.5) * 6;
        g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, x1 + 2, y1 + 9, 12, 6); g.fill();
        g.fillStyle = body; ell(g, x1, y1 + 5, 11, 8); g.fill();
        g.fillStyle = head; ell(g, x1, y1 - 2, 7.5, 7.5); g.fill();
        g.fillStyle = hi; ell(g, x1 - 2.5, y1 - 4.5, 3, 2.4); g.fill();
        if (rnd() < 0.5) { g.strokeStyle = '#d8d8e0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x1 + 7, y1 + 2); g.lineTo(x1 + 11, y1 - 12); g.stroke(); }
      }
    }
  });
  CLA.red = [mkCrowd('#8e1616', '#e2332f', '#ff8a7a', 7), mkCrowd('#8e1616', '#e2332f', '#ff8a7a', 91)];
  CLA.blue = [mkCrowd('#163c8e', '#2f78e2', '#9ac8ff', 13), mkCrowd('#163c8e', '#2f78e2', '#9ac8ff', 57)];
  CLA.W = W;
}
const CL_TINT = new WeakMap();
function clRedSpr(spr) {
  let c = CL_TINT.get(spr);
  if (!c) { c = mk(spr.width, spr.height, g => { g.drawImage(spr, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(210,30,30,.6)'; g.fillRect(0, 0, spr.width, spr.height); }); c.wh = spr.wh; c.foot = spr.foot; CL_TINT.set(spr, c); }
  return c;
}

// 一排人海：在 z 這一排，畫 [x0,x1] 這一段（貼圖跟著世界座標走，戰線移動時小兵不會跳）
function clCrowdSeg(g, img, x0, x1, z, k, bob) {
  if (x1 - x0 < 0.05) return;
  const a = P(x0, z, 0), b = P(x1, z, 0), top = P(x0, z, 0.95);
  const w = b.x - a.x, h = (a.y - top.y) * 1.25;
  if (h < 1) return;
  const pm = CLA.W / 12, sw = (x1 - x0) * pm, sx = (x0 + CL_FW) * pm + ((k * 173) % 300 + 300) % 300;
  g.drawImage(img, sx, 0, sw, 64, a.x, a.y - h * (0.85 + bob), w, h);
}

// 每一格 x 的戰線位置、藍軍厚度（每一幀算一次；厚度慢慢變，援軍到了不會一下子跳）
const CL_NS = 44;
function clSamples(G, t) {
  let S = R.clS;
  if (!S || S.G !== G) S = R.clS = { G, t, x: new Float32Array(CL_NS + 1), f: new Float32Array(CL_NS + 1), d: new Float32Array(CL_NS + 1), seg: new Float32Array(CL_NS + 4), v: new Float32Array(CL_NS + 1) };
  const dt = clamp(t - S.t, 0, 0.1); S.t = t;
  const ease = S.init ? Math.min(1, dt * 4) : 1; S.init = 1;
  for (let k = 0; k <= CL_NS; k++) {
    const x = -CL_FW + 2 * CL_FW * k / CL_NS;
    S.x[k] = x; S.f[k] = clFrontAt(G.f, x);
    const bb = clFrontAt(G.b, x);
    const d = bb > 0.6 ? clamp(Math.sqrt(bb) * 0.36, 0.45, 6.5) : 0;
    S.d[k] += (d - S.d[k]) * (d === 0 && S.d[k] < 0.5 ? 1 : ease);
  }
  return S;
}
// 在 z 這一排，S.v[k] > 0 的連續段落（邊界用內插算到剛好的位置）；結果放在 S.seg，回傳段數
function clSegs(S) {
  const v = S.v, out = S.seg, dx = 2 * CL_FW / CL_NS;
  let n = 0, a = null;
  for (let k = 0; k <= CL_NS; k++) {
    const ok = v[k] > 0;
    if (ok && a == null) a = k === 0 ? S.x[0] : S.x[k] - dx * v[k] / (v[k] - v[k - 1]);
    if (a != null && (!ok || k === CL_NS)) {
      const e = ok ? S.x[k] : S.x[k - 1] + dx * v[k - 1] / (v[k - 1] - v[k]);
      if (n + 2 <= out.length) { out[n++] = a; out[n++] = e; }
      a = null;
    }
  }
  return n;
}

function renderClash(G, t) {
  if (!CLA.red) buildClashArt();
  const g = R.g, th = G.L.theme;
  R.camX = G.px * 0.15;
  if (R.bgKey !== th.id + R.W + 'x' + R.H) { R.bg = buildBg(th); R.bgKey = th.id + R.W + 'x' + R.H; R.sun = null; }
  if (!R.vig) R.vig = vignette();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const sh = G.shake * 9 * R.dpr * R.q;
  g.translate(sh ? (Math.random() - 0.5) * sh : 0, sh ? (Math.random() - 0.5) * sh : 0);
  if (R.hy > 2) g.drawImage(R.bg, -R.bgPad - R.camX * 2 * R.dpr, 0);
  drawClouds(g, th, t);
  drawGround(g, th, 0);
  drawGroundDetail(g, th, 0);
  // 走廊地面（深一點）
  for (const sx of [-1, 1]) {
    const x0 = sx * CL_WALL, x1 = sx * (CL_COR + CL_CORW + 0.15);
    const a = P(x0, CL_FENCE, 0.01), b = P(x1, CL_FENCE, 0.01), c = P(x1, CL_TOP + 2, 0.01), d = P(x0, CL_TOP + 2, 0.01);
    g.fillStyle = 'rgba(40,30,20,.16)'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.fill();
  }
  // 自己這邊的城牆線
  { const a = P(-ROAD, 0.2, 0), b = P(ROAD, 0.2, 0);
    g.strokeStyle = 'rgba(80,170,255,.75)'; g.lineWidth = Math.max(3, 0.12 * a.s);
    g.setLineDash([14 * R.dpr, 10 * R.dpr]); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]); }
  for (const e of G.fx) if (e.k === 'ring') drawRing(g, e);
  const S = clSamples(G, t);

  const items = R.items || (R.items = []);
  items.length = 0;
  const SP = 4.2;
  for (let k = -2; k <= 16; k++) for (const side of [-1, 1]) {
    const h = hash(k * 2 + (side > 0 ? 1 : 0) + th.id.length * 1000 + 55);
    if (h % 10 < 3) continue;
    const kind = th.decor[(h >>> 4) % th.decor.length];
    const far = kind === 'building' || kind === 'mesa' || kind === 'windmill';
    const x = side * (ROAD + (far ? 5.5 : 1.9) + ((h >>> 9) % 70) / 10);
    const z = k * SP + ((h >>> 3) % 20) / 10;
    if (z < -Z0 + 1 || z > DEF_Z_BASE + 6) continue;
    items.push({ z, kind, x, v: (h >>> 12) % 3, sc: 0.8 + ((h >>> 15) % 50) / 100 });
  }
  fenceItems(items, th, 0);
  // 走廊和戰場中間的矮牆（一段一段才排得進前後順序）
  for (let z = CL_FENCE; z < CL_TOP + 2; z += 2.5) for (const sx of [-1, 1]) items.push({ z: z + 0.01, wall: sx, z1: Math.min(CL_TOP + 2, z + 2.5) });
  for (const o of G.gates) items.push({ z: o.z, tile: o });
  items.push({ z: G.mid.z, o: G.mid });
  // 人海：紅色從基地一路往戰線湧下來，藍色往上頂（每一排會慢慢移動，看起來是一直在走）
  let fmin = 1e9, fmax = -1e9;
  for (let k = 0; k <= CL_NS; k++) { fmin = Math.min(fmin, S.f[k] - S.d[k]); fmax = Math.max(fmax, S.f[k]); }
  const RZ = 0.45, mv = G.st === 'play' ? 1 : 0.3;
  const rOff = (t * 0.55 * mv) % RZ, rJ = Math.floor(t * 0.55 * mv / RZ);
  for (let k = Math.ceil((CL_TOP + 1.6) / RZ) + 1; ; k--) {
    const z = k * RZ - rOff;
    if (z < fmin - 0.1) break;
    if (z > CL_TOP + 1.6) continue;
    items.push({ z, sea: 'r', k: k + rJ });
  }
  const bOff = (t * 0.7 * mv) % RZ, bJ = Math.floor(t * 0.7 * mv / RZ);
  for (let k = Math.floor((fmin - 0.1) / RZ); ; k++) {
    const z = k * RZ + bOff;
    if (z > fmax + 0.1) break;
    items.push({ z: z - 0.001, sea: 'b', k: k - bJ });
  }
  items.push({ z: (fmin + fmax) / 2 + 0.002, front: 1 });
  for (const q of G.brutes) items.push({ z: G.f[q.c] + 0.6, brute: q });
  for (const e of G.fx) if (e.k !== 'ring') items.push({ z: e.z - 0.05, e });
  for (const bl of G.blobs) items.push({ z: bl.z, bl });
  items.push({ z: DEF_Z_BASE + 0.5, base: 1 });
  items.push({ z: DEF_Z_CANNON, cannon: 1 });
  items.sort((p, q) => q.z - p.z);
  for (const it of items) {
    if (it.kind) drawDecor(g, it);
    else if (it.fence) drawFence(g, it, th);
    else if (it.sea) {
      const z = it.z, red = it.sea === 'r', v = S.v;
      if (red) for (let k = 0; k <= CL_NS; k++) v[k] = z - 0.15 - S.f[k];
      else for (let k = 0; k <= CL_NS; k++) v[k] = S.d[k] > 0 ? Math.min(S.f[k] - 0.1 - z, z - S.f[k] + S.d[k]) : -1;
      const n = clSegs(S), ph = t * 6 + it.k * 0.9;
      const img = (red ? CLA.red : CLA.blue)[Math.floor(ph / Math.PI) & 1], bob = 0.04 * Math.abs(Math.sin(ph));
      for (let i = 0; i < n; i += 2) clCrowdSeg(g, img, S.seg[i], S.seg[i + 1], z, red ? it.k : it.k + 7, bob);
    } else if (it.front) drawClashFront(g, G, S, t);
    else if (it.wall) drawClashWall(g, it.wall * CL_WALL, it.z, it.z1);
    else if (it.tile) drawClashTile(g, it.tile, t);
    else if (it.o) drawGate(g, it.o, t);
    else if (it.brute) drawClashBrute(g, G, it.brute);
    else if (it.bl) drawClashBlob(g, it.bl);
    else if (it.e) drawFxItem(g, it.e);
    else if (it.base) drawBase(g, G, t);
    else if (it.cannon) drawCannon(g, G, t);
  }
  drawParts(g, G);
  drawFloats(g, G);
  drawClashSurge(g, G, t);
  drawWeather(g, th, t);
  if (th.dark) { g.fillStyle = 'rgba(30,10,60,.12)'; g.fillRect(-20, -20, R.W + 40, R.H + 40); }
  if (G.charge > 0) { g.fillStyle = `rgba(90,170,255,${0.06 + 0.04 * Math.sin(t * 12)})`; g.fillRect(-20, -20, R.W + 40, R.H + 40); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(R.vig, 0, 0);
  if (G.flash > 0) { g.fillStyle = `rgba(255,60,60,${G.flash * 0.3})`; g.fillRect(0, 0, R.W, R.H); }
}

// 戰線：兩邊撞在一起的地方，一條灰灰的塵土和倒下的小兵
function drawClashFront(g, G, S, t) {
  g.save();
  g.beginPath();
  for (let k = 0; k <= CL_NS; k++) { const p = P(S.x[k], S.f[k] + 0.25, 0); k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
  for (let k = CL_NS; k >= 0; k--) { const p = P(S.x[k], S.f[k] - 0.25, 0); g.lineTo(p.x, p.y); }
  g.closePath();
  g.fillStyle = 'rgba(70,64,64,.55)'; g.fill();
  g.restore();
  // 塵土
  for (let k = 0; k <= CL_NS; k += 2) {
    const c = clCol(S.x[k]);
    if (G.b[c] < 1 || G.r[c] < 1) continue;
    const p = P(S.x[k] + Math.sin(t * 3 + k) * 0.1, S.f[k], 0.35 + 0.15 * Math.sin(t * 5 + k * 1.7));
    const s = (0.5 + 0.2 * Math.sin(t * 7 + k)) * p.s;
    g.fillStyle = `rgba(200,195,190,${0.25 + 0.15 * Math.sin(t * 9 + k * 2.3)})`;
    ell(g, p.x, p.y, s, s * 0.55); g.fill();
  }
}

function drawClashWall(g, x, z0, z1) {
  const H = 0.75;
  const a = P(x, z0, 0), b = P(x, z1, 0), c = P(x, z1, H), d = P(x, z0, H);
  const side = x < 0 ? 1 : -1;   // 面向戰場的那一面
  const a2 = P(x + side * 0.12, z0, H), b2 = P(x + side * 0.12, z1, H), c2 = P(x - side * 0.12, z1, H), d2 = P(x - side * 0.12, z0, H);
  g.fillStyle = '#8b939e'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.fill();
  g.fillStyle = '#c3cad3'; g.beginPath(); g.moveTo(a2.x, a2.y); g.lineTo(b2.x, b2.y); g.lineTo(c2.x, c2.y); g.lineTo(d2.x, d2.y); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = Math.max(1, 0.03 * a.s);
  g.beginPath();
  for (let z = z0 + 0.8; z < z1; z += 0.8) { const p = P(x, z, 0), q = P(x, z, H); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); }
  g.stroke();
}

// 走廊裡的門：像廣告那樣一格一格的牌子
const CL_TILE = { wpn: ['#ffc21a', '#fff1a0', '#9a5a00'], good: ['#2f9bff', '#bfe6ff', '#0b4fae'], bad: ['#ff3b4f', '#ffc0c8', '#9b0f22'] };
// 門牌每一格都重畫字很花時間：先畫成小圖存起來（依文字、顏色、大小分類），之後只要貼上去
const CL_SPR = new Map();
function clSprite(key, w, h, draw) {
  let c = CL_SPR.get(key);
  if (!c) {
    if (CL_SPR.size > 240) CL_SPR.clear();
    c = mk(Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h)), draw);
    CL_SPR.set(key, c);
  }
  return c;
}
function clTileSpr(txt, lookK, open, ar, hb) {
  const pad = Math.ceil(hb * 0.1), H = hb, W = Math.round(hb * ar);
  return clSprite(`t|${txt}|${lookK}|${open ? 1 : 0}|${ar}|${hb}`, W + pad * 2, H + pad * 2, g => {
    const look = CL_TILE[lookK], x = pad, y = pad, rad = Math.max(2, H * 0.12);
    g.fillStyle = open ? 'rgba(255,60,80,.15)' : look[0];
    rr(g, x, y, W, H, rad); g.fill();
    if (!open) { g.fillStyle = 'rgba(255,255,255,.22)'; rr(g, x + 2, y + 2, W - 4, H * 0.35, Math.max(2, H * 0.1)); g.fill(); }
    g.lineWidth = Math.max(1.5, H * 0.05); g.strokeStyle = look[1];
    if (open) g.setLineDash([H * 0.08, H * 0.06]);
    rr(g, x, y, W, H, rad); g.stroke(); g.setLineDash([]);
    let fs = H * 0.62;
    g.font = `900 ${fs}px "Noto Sans TC",system-ui,sans-serif`;
    const tw = g.measureText(txt).width; if (tw > W * 0.9) { fs *= W * 0.9 / tw; g.font = `900 ${fs}px "Noto Sans TC",system-ui,sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = fs * 0.18; g.strokeStyle = look[2]; g.strokeText(txt, x + W / 2, y + H / 2 + fs * 0.04);
    g.fillStyle = '#fff'; g.fillText(txt, x + W / 2, y + H / 2 + fs * 0.04);
  });
}
function drawClashTile(g, o, t) {
  const H = 1.25, lookK = o.k === 'kill' ? 'bad' : o.look || 'good';
  const A = P(o.x - o.w + 0.04, o.z, 0.05), B = P(o.x + o.w - 0.04, o.z, H);
  const w = B.x - A.x, h = A.y - B.y;
  if (h < 2) return;
  const open = o.blink && !o.shut;
  const txt = o.k === 'kill' ? (open ? '開' : '✕') : o.k === 'mul' ? '×' + o.v : '+' + o.v;
  // 大小分級（每 12px 一級），太大就用最大那張放大
  const hb = clamp(Math.ceil(h / 12) * 12, 12, 156), ar = Math.round(w / h * 4) / 4;
  const spr = clTileSpr(txt, lookK, open, ar, hb), k = h / hb;
  const bump = 1 + (o.bump || 0) * 0.12, cx = A.x + w / 2, cy = B.y + h / 2;
  const dw = spr.width * k * bump, dh = spr.height * k * bump;
  const ga = g.globalAlpha;
  g.globalAlpha = ga * (1 - (o.fade || 0));
  g.drawImage(spr, cx - dw / 2, cy - dh / 2, dw, dh);
  g.globalAlpha = ga;
}

// 一團小兵：最多畫 12 個，上面寫人數
function drawClashBlob(g, bl) {
  const m = Math.min(12, Math.max(1, Math.round(bl.n / 3) + 2, bl.n > 3 ? 4 : bl.n));
  const cols = Math.min(4, m), rows = Math.ceil(m / cols);
  const p0 = P(bl.x, bl.z, 0);
  drawShadow(g, p0.x, p0.y, (0.4 + cols * 0.22) * p0.s);
  for (let r = rows - 1; r >= 0; r--) for (let c = 0; c < cols; c++) {
    const i = r * cols + c; if (i >= m) continue;
    const x = bl.x + (c - (cols - 1) / 2) * 0.3 + ((i * 37) % 7 - 3) * 0.012, z = bl.z + (r - (rows - 1) / 2) * 0.3;
    const p = P(x, z, 0);
    const spr = ART.soldierV[i % 3][Math.floor(bl.ph / (Math.PI / 2) + i) & 3];
    const h = (spr.wh ? spr.wh * 0.765 : 0.78) * p.s * (1 + bl.pop * 0.4), w = h * spr.width / spr.height;
    g.drawImage(spr, p.x - w / 2, p.y - h * (1 - (spr.foot || 0)), w, h);
  }
  if (bl.n > DEF_SQUAD) {
    const q = P(bl.x, bl.z, 1.5), u = R.u * R.dpr, fs = Math.max(11 * u, 0.55 * q.s) * (1 + bl.pop * 0.4);
    const txt = fmtNum(bl.n), fb = fs > 40 ? 72 : 40;   // 只有兩種大小，小隊往前走時不用一直產生新圖
    const spr = clSprite(`n|${txt}|${fb}`, fb * (txt.length * 0.62 + 0.8), fb * 1.3, g2 => {
      g2.font = `900 ${fb}px "Noto Sans TC",system-ui,sans-serif`; g2.textAlign = 'center'; g2.textBaseline = 'middle';
      const W = g2.canvas.width, Hh = g2.canvas.height;
      const tw = Math.min(W, g2.measureText(txt).width + fb * 0.6);
      g2.fillStyle = 'rgba(20,60,150,.85)'; rr(g2, (W - tw) / 2, (Hh - fb * 1.24) / 2, tw, fb * 1.24, fb * 0.5); g2.fill();
      g2.fillStyle = '#fff'; g2.fillText(txt, W / 2, Hh / 2 + fb * 0.04);
    });
    const k = fs / fb;
    g.drawImage(spr, q.x - spr.width * k / 2, q.y - spr.height * k / 2, spr.width * k, spr.height * k);
  }
}

// 紅軍巨兵
function drawClashBrute(g, G, q) {
  const x = clColX(q.c), z = G.f[q.c] + 0.6, p = P(x, z, 0);
  const spr = clRedSpr(ART.soldierV[0][Math.floor(q.ph) & 3]);
  const h = (spr.wh ? spr.wh * 0.765 : 0.78) * p.s * 2.8, w = h * spr.width / spr.height;
  drawShadow(g, p.x, p.y, 1.2 * p.s);
  g.drawImage(spr, p.x - w / 2, p.y - h * (1 - (spr.foot || 0)), w, h);
}

// 猛衝的預告：那一路畫紅色箭頭
function drawClashSurge(g, G, t) {
  const s = G.surge; if (!s) return;
  const x = clColX(s.c), z = G.f[s.c];
  if (s.warn > 0) {
    const a = 0.55 + 0.45 * Math.sin(t * 14);
    for (let k = 0; k < 3; k++) {
      const p = P(x, z - 1 - k * 1.3, 0.2), sz = 0.9 * p.s;
      g.globalAlpha = a * (1 - k * 0.25);
      g.fillStyle = '#ff2b3b'; g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, sz * 0.12);
      g.beginPath(); g.moveTo(p.x - sz, p.y - sz * 0.45); g.lineTo(p.x, p.y + sz * 0.35); g.lineTo(p.x + sz, p.y - sz * 0.45); g.lineTo(p.x + sz * 0.6, p.y - sz * 0.75); g.lineTo(p.x, p.y - sz * 0.25); g.lineTo(p.x - sz * 0.6, p.y - sz * 0.75); g.closePath(); g.stroke(); g.fill();
    }
    g.globalAlpha = 1;
    const q = P(x, z + 1, 2.2), u = R.u * R.dpr;
    g.font = `900 ${18 * u}px "Noto Sans TC",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 5 * u; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText('猛衝！', q.x, q.y); g.fillStyle = '#ff5a5a'; g.fillText('猛衝！', q.x, q.y);
  } else {
    const a = P(x - CL_CW * 1.5, z, 0.02), b = P(x + CL_CW * 1.5, z + 6, 0.02);
    g.fillStyle = `rgba(255,40,40,${0.12 + 0.06 * Math.sin(t * 10)})`; g.fillRect(a.x, b.y, b.x - a.x, a.y - b.y);
  }
}

function drawClashHud(G) {
  const g = R.g, u = R.u * R.dpr;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const top = (R.safeTop || 0) * R.dpr + 10 * u;
  const cx = R.W / 2;
  const BW = Math.min(R.W - 130 * u, 300 * u), by = top + 4 * u;
  const b = G.base;
  g.fillStyle = 'rgba(10,10,20,.72)'; rr(g, cx - BW / 2, by, BW, 26 * u, 9 * u); g.fill();
  const k = clamp(b.hp / b.max, 0, 1);
  g.fillStyle = lin(g, cx - BW / 2, 0, cx + BW / 2, 0, b.rage ? ['#ff2b4b', '#ff7a3a'] : ['#c93cff', '#ff4f7a']);
  if (k > 0) { rr(g, cx - BW / 2 + 3 * u, by + 3 * u, Math.max(6 * u, (BW - 6 * u) * k), 20 * u, 7 * u); g.fill(); }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${13 * u}px "Noto Sans TC",system-ui,sans-serif`;
  g.fillText(`敵方基地 ${fmtNum(Math.max(0, b.hp))}`, cx, by + 13.5 * u);
  // 兵力對比：藍 vs 紅
  let SB = 0, SR = 0; for (let i = 0; i < CL_NC; i++) { SB += G.b[i]; SR += G.r[i]; }
  const ty = by + 32 * u, TW = BW * 0.86, kb = clamp(SB / (SB + SR + 1e-6), 0.04, 0.96);
  g.fillStyle = 'rgba(10,10,20,.6)'; rr(g, cx - TW / 2, ty, TW, 16 * u, 8 * u); g.fill();
  g.fillStyle = '#2f78e2'; rr(g, cx - TW / 2 + 2 * u, ty + 2 * u, (TW - 4 * u) * kb, 12 * u, 6 * u); g.fill();
  g.fillStyle = '#e2332f'; rr(g, cx - TW / 2 + 2 * u + (TW - 4 * u) * kb, ty + 2 * u, (TW - 4 * u) * (1 - kb), 12 * u, 6 * u); g.fill();
  g.font = `900 ${10.5 * u}px "Noto Sans TC",system-ui,sans-serif`; g.fillStyle = '#fff';
  g.textAlign = 'left'; g.fillText(`前線 藍 ${fmtNum(SB)}`, cx - TW / 2 + 7 * u, ty + 8.5 * u);
  g.textAlign = 'right'; g.fillText(`紅 ${fmtNum(SR)}`, cx + TW / 2 - 7 * u, ty + 8.5 * u);
  g.textAlign = 'center';
  g.font = `900 ${12 * u}px "Noto Sans TC",system-ui,sans-serif`;
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 4 * u;
  const lab = `大軍對決 ${G.s} · ${G.L.name}` + (G.charge > 0 ? '  ⚡衝鋒中' : '');
  g.strokeText(lab, cx, ty + 30 * u); g.fillText(lab, cx, ty + 30 * u);
  // 自己的城
  const bw2 = 150 * u, bx2 = 12 * u, by2 = R.H - 40 * u - (R.safeBot || 0) * R.dpr;
  g.fillStyle = 'rgba(10,14,24,.7)'; rr(g, bx2, by2, bw2, 28 * u, 10 * u); g.fill();
  const kc = clamp(G.castle / G.castleMax, 0, 1);
  g.fillStyle = kc > 0.5 ? '#33d17a' : kc > 0.25 ? '#ffb03a' : '#ff4040';
  if (kc > 0) { rr(g, bx2 + 30 * u, by2 + 7 * u, (bw2 - 38 * u) * kc, 14 * u, 7 * u); g.fill(); }
  g.fillStyle = '#fff'; g.font = `900 ${15 * u}px system-ui,sans-serif`; g.textAlign = 'center'; g.fillText('🏰', bx2 + 16 * u, by2 + 15 * u);
}
