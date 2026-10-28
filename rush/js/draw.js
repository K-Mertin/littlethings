// 千軍突圍 — 繪圖（透視跑道、物件、頭目、HUD）
'use strict';

const R = { cv: null, g: null, W: 0, H: 0, dpr: 1, q: 1, bg: null, bgKey: '', vig: null };
let Z0 = 8;   // 鏡頭在 z=0 後面多遠

// 俯瞰鏡頭：鏡頭在高處往前下方看。
// 依「部隊在畫面哪裡」和「最遠要看到幾公尺」算出焦距，所以手機直放、橫放都會自動調整。
const CAMS = {
  run:      { th: 40, h: 12, d: 8, z0: 0,    y0: 0.80, zT: 110, yT: 0.09, minRoad: 0 },
  runL:     { th: 30, h: 10, d: 8, z0: 0,    y0: 0.85, zT: 80,  yT: 0.14, minRoad: 0.27 },
  defense:  { th: 52, h: 22, d: 8, z0: -1.2, y0: 0.87, zT: 46,  yT: 0.17, minRoad: 0 },
  defenseL: { th: 46, h: 20, d: 8, z0: -1.2, y0: 0.88, zT: 47,  yT: 0.24, minRoad: 0.12 },
};

function resizeRender() {
  const cv = R.cv;
  const cw = cv.clientWidth || innerWidth, ch = cv.clientHeight || innerHeight;
  R.dpr = Math.min(2, window.devicePixelRatio || 1) * R.q;
  R.W = Math.round(cw * R.dpr); R.H = Math.round(ch * R.dpr);
  cv.width = R.W; cv.height = R.H;
  R.cssW = cw; R.cssH = ch;
  const port = R.H > R.W * 1.05;
  const C = CAMS[(R.camMode === 'defense' ? 'defense' : 'run') + (port ? '' : 'L')];
  const th = C.th * Math.PI / 180;
  R.cc = Math.cos(th); R.ss = Math.sin(th); R.ch = C.h; Z0 = C.d;
  const dep = z => (z + C.d) * R.cc + C.h * R.ss, ver = z => -C.h * R.cc + (z + C.d) * R.ss;
  let F = (C.y0 - C.yT) * R.H / (ver(C.zT) / dep(C.zT) - ver(C.z0) / dep(C.z0));
  const maxF = 0.49 * R.W * dep(C.z0) / ROAD, minF = C.minRoad * 0.5 * R.W * dep(C.z0) / ROAD;
  F = clamp(F, minF, maxF);
  R.F = F;
  R.cy = C.y0 * R.H + ver(C.z0) * F / dep(C.z0);
  R.hy = R.cy - F * Math.tan(th);       // 地平線（常常在畫面上方看不到）
  R.k0 = F / dep(0);                     // z=0 每公尺幾個像素
  R.cx = R.W / 2;
  R.u = Math.min(cw, ch * 0.75, 520) / 400; // HUD 單位（CSS 像素）
  R.bgKey = '';
  R.vig = null;
  R.zTop = zAtY(0);
}

// 世界 → 螢幕
function P(x, z, h) {
  const dz = z + Z0, dy = (h || 0) - R.ch;
  let dep = dz * R.cc - dy * R.ss; if (dep < 0.5) dep = 0.5;
  const sc = R.F / dep;
  return { x: R.cx + (x - R.camX) * sc, y: R.cy - (dy * R.cc + dz * R.ss) * sc, s: sc };
}
// 螢幕上某一列對應地面上的 z
function zAtY(y) {
  const k = (R.cy - y) / R.F, den = R.ss - k * R.cc;
  return den <= 0.0005 ? 1e4 : R.ch * (R.cc + k * R.ss) / den - Z0;
}

function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return n >>> 0; }

// ---------- 天空與遠景（快取） ----------
function buildBg(th) {
  const W = R.W, H = Math.max(8, Math.ceil(R.hy + 4));
  const pad = Math.round(W * 0.1);
  const c = mkCanvas(W + pad * 2, H);
  const g = c.getContext('2d');
  const CW = c.width;
  g.fillStyle = lin(g, 0, 0, 0, H, th.sky); g.fillRect(0, 0, CW, H);
  const hy = H - 4;
  const r = rng(th.id.length * 97 + 7);
  if (th.id === 'volcano') bgVolcano(g, CW, hy, r);
  else if (th.id === 'night') {
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; g.fillRect(r() * CW, r() * hy * 0.8, 1.5 * R.dpr, 1.5 * R.dpr); }
    g.fillStyle = radial(g, CW * 0.78, hy * 0.3, hy * 0.18, '#fff8e0', '#e8d8a0', 0, 0); ell(g, CW * 0.78, hy * 0.3, hy * 0.12, hy * 0.12); g.fill();
    // 天際線
    for (let layer = 0; layer < 2; layer++) {
      let x = 0;
      while (x < CW) {
        const w = (18 + r() * 40) * R.dpr * (layer ? 1.3 : 1), h = (hy * (layer ? 0.35 : 0.55)) * (0.4 + r() * 0.6);
        g.fillStyle = layer ? '#2a2058' : '#1c1740';
        g.fillRect(x, hy - h, w, h + 4);
        if (layer) for (let wy = hy - h + 4; wy < hy - 3; wy += 6 * R.dpr) for (let wx = x + 3; wx < x + w - 3; wx += 6 * R.dpr) if (r() < 0.3) { g.fillStyle = r() < 0.5 ? '#ffe680' : '#ff8ad8'; g.fillRect(wx, wy, 2 * R.dpr, 2.5 * R.dpr); }
        x += w + r() * 4 * R.dpr;
      }
    }
  } else {
    if (th.id !== 'snow') {
      const sx = CW * 0.22, sy = hy * 0.32;
      g.fillStyle = radial(g, sx, sy, hy * 0.5, 'rgba(255,255,230,.9)', 'rgba(255,255,230,0)', 0, 0);
      ell(g, sx, sy, hy * 0.5, hy * 0.5); g.fill();
      g.fillStyle = '#fffbe6'; ell(g, sx, sy, hy * 0.09, hy * 0.09); g.fill();
    }
    // 雲
    for (let i = 0; i < 7; i++) {
      const x = r() * CW, y = hy * (0.12 + r() * 0.4), s = (24 + r() * 30) * R.dpr;
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (let k = 0; k < 4; k++) { ell(g, x + (k - 1.5) * s * 0.6, y + (k % 2) * s * 0.12, s * (0.5 + (k % 2) * 0.2), s * 0.32); g.fill(); }
    }
    // 山丘／沙丘／雪山
    const layers = th.id === 'snow' ? [[th.far2, 0.75, 1], [th.far, 0.45, 0]] : [[th.far2, 0.55, 0], [th.far, 0.3, 0]];
    for (const [col, amp, peaks] of layers) {
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, hy + 2);
      const n = 9; const pts = [];
      for (let i = 0; i <= n; i++) pts.push([i / n * CW, hy - hy * amp * (0.35 + r() * 0.65)]);
      if (peaks) { for (let i = 0; i <= n; i++) g.lineTo(pts[i][0], pts[i][1]); }
      else { g.lineTo(pts[0][0], pts[0][1]); for (let i = 1; i <= n; i++) { const mx = (pts[i - 1][0] + pts[i][0]) / 2; g.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], mx, (pts[i - 1][1] + pts[i][1]) / 2); } }
      g.lineTo(CW, hy + 2); g.closePath(); g.fill();
      if (peaks) { // 山頂積雪
        g.fillStyle = '#ffffff';
        for (let i = 0; i <= n; i++) { const [x, y] = pts[i]; if (y < hy * 0.55) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + hy * 0.08, y + hy * 0.1); g.lineTo(x - hy * 0.08, y + hy * 0.1); g.fill(); } }
      }
    }
  }
  R.bgPad = pad;
  return c;
}

function vignette() {
  const c = mkCanvas(R.W, R.H), g = c.getContext('2d');
  const gr = g.createRadialGradient(R.W / 2, R.H * 0.55, Math.min(R.W, R.H) * 0.35, R.W / 2, R.H * 0.55, Math.max(R.W, R.H) * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.38)');
  g.fillStyle = gr; g.fillRect(0, 0, R.W, R.H);
  return c;
}

// ---------- 地面 ----------
function quad(g, a, b, c, d) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fill(); }

// 地面質感：柏油顆粒、草地紋路（中性的明暗，各主題的顏色都能疊）
const TEXM = 64; // 貼圖每公尺幾像素
function groundTex() {
  if (R.gtex) return R.gtex;
  const N = 256, r = rng(77);
  const wrap = (g, fn) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.save(); g.translate(ox, oy); fn(g); g.restore(); } };
  const road = mk(N, N, g => {
    const pts = []; for (let i = 0; i < 2600; i++) pts.push([r() * N, r() * N, r() < 0.55, 0.6 + r() * 1.4]);
    const blot = []; for (let i = 0; i < 9; i++) blot.push([r() * N, r() * N, 10 + r() * 26, r() < 0.5]);
    const cracks = []; for (let i = 0; i < 2; i++) { let x = r() * N, y = r() * N; const c = [[x, y]]; for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += 8 + r() * 14; c.push([x, y]); } cracks.push(c); }
    wrap(g, g => {
      for (const [x, y, rr0, d] of blot) { g.fillStyle = d ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.05)'; g.beginPath(); g.ellipse(x, y, rr0, rr0 * 0.6, 0, 0, 7); g.fill(); }
      for (const [x, y, d, sz] of pts) { g.fillStyle = d ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.16)'; g.fillRect(x, y, sz, sz); }
      g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 1.2; g.lineCap = 'round';
      for (const c of cracks) { g.beginPath(); g.moveTo(c[0][0], c[0][1]); for (const q of c) g.lineTo(q[0], q[1]); g.stroke(); }
    });
  });
  const grass = mk(N, N, g => {
    const bl = []; for (let i = 0; i < 1500; i++) bl.push([r() * N, r() * N, (r() - 0.5) * 0.9, 3 + r() * 6, r() < 0.5]);
    const clump = []; for (let i = 0; i < 14; i++) clump.push([r() * N, r() * N, 12 + r() * 30, r() < 0.5]);
    wrap(g, g => {
      for (const [x, y, rr0, d] of clump) { g.fillStyle = d ? 'rgba(0,30,0,.08)' : 'rgba(255,255,220,.07)'; g.beginPath(); g.ellipse(x, y, rr0, rr0 * 0.55, 0, 0, 7); g.fill(); }
      g.lineCap = 'round'; g.lineWidth = 1.3;
      for (const [x, y, a, l, d] of bl) { g.strokeStyle = d ? 'rgba(0,40,0,.2)' : 'rgba(255,255,210,.16)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); g.stroke(); }
    });
  });
  const g0 = R.g;
  R.gtex = { road: g0.createPattern(road, 'repeat'), grass: g0.createPattern(grass, 'repeat') };
  return R.gtex;
}
// 一段一段（近的段短、遠的段長）用貼圖填，每段依深度縮放
function texBands(g, zNear, zFar, dist, pat, x0, x1, alpha) {
  if (R.q < 0.75 || R.noTex || typeof DOMMatrix === 'undefined' || window.NOTEX) return;
  let z = zNear;
  const M = new DOMMatrix();
  g.save(); g.imageSmoothingEnabled = false;
  while (z < zFar) {
    const dz = Math.max(0.6, (z + Z0) * 0.16), z2 = Math.min(zFar, z + dz);
    const a = P(0, z, 0), b = P(0, z2, 0), sm = P(0, (z + z2) / 2, 0).s;
    const ky = (a.y - b.y) / (z2 - z) / TEXM, kx = sm / TEXM;
    const fade = clamp(1.4 - (z + Z0) / 55, 0, 1) * alpha;
    if (fade > 0.03 && a.y - b.y > 0.5) {
      M.a = kx; M.b = 0; M.c = 0; M.d = ky; M.e = R.cx - R.camX * sm; M.f = a.y + (z + dist) * ky * TEXM;
      pat.setTransform(M);
      g.globalAlpha = fade; g.fillStyle = pat;
      if (x0 == null) {
        // 只填路兩邊（路面等一下會蓋掉中間）
        const L1 = P(-ROAD - 0.3, z, 0), L2 = P(-ROAD - 0.3, z2, 0), R1 = P(ROAD + 0.3, z, 0), R2 = P(ROAD + 0.3, z2, 0);
        g.beginPath(); g.moveTo(0, a.y + 0.6); g.lineTo(L1.x, a.y + 0.6); g.lineTo(L2.x, b.y); g.lineTo(0, b.y); g.closePath();
        g.moveTo(R1.x, a.y + 0.6); g.lineTo(R.W, a.y + 0.6); g.lineTo(R.W, b.y); g.lineTo(R2.x, b.y); g.closePath(); g.fill();
      }
      else { const nl = P(x0, z, 0), nr = P(x1, z, 0), fr = P(x1, z2, 0), fl = P(x0, z2, 0); g.beginPath(); g.moveTo(nl.x, nl.y + 0.6); g.lineTo(nr.x, nr.y + 0.6); g.lineTo(fr.x, fr.y); g.lineTo(fl.x, fl.y); g.closePath(); g.fill(); }
    }
    z = z2;
  }
  g.restore();
}

function drawGround(g, th, dist) {
  const zFar = Math.min(R.zTop + 4, 170), zNear = Math.max(-Z0 + 0.6, zAtY(R.H + 4));
  const gy = Math.max(0, R.hy);
  g.fillStyle = th.side[0]; g.fillRect(0, gy, R.W, R.H - gy);
  // 路邊條紋
  const SB = 5;
  g.fillStyle = th.side[1];
  for (let z = Math.floor((zNear + dist) / SB) * SB - dist; z < zFar; z += SB) {
    if ((Math.floor((z + dist) / SB + 0.001) & 1) === 0) continue;
    const z1 = Math.max(z, zNear), z2 = Math.min(z + SB, zFar); if (z2 <= z1) continue;
    const a = P(0, z1, 0), b = P(0, z2, 0);
    g.fillRect(0, b.y, R.W, a.y - b.y + 1);
  }
  const GT = groundTex();
  texBands(g, zNear, Math.min(zFar, 70), dist, GT.grass, null, null, 1);
  // 路面
  const nl = P(-ROAD, zNear, 0), nr = P(ROAD, zNear, 0), fl = P(-ROAD, zFar, 0), fr = P(ROAD, zFar, 0);
  g.fillStyle = th.road[0]; quad(g, nl, nr, fr, fl);
  const RB = 4;
  g.fillStyle = th.road[1];
  for (let z = Math.floor((zNear + dist) / RB) * RB - dist; z < zFar; z += RB) {
    if ((Math.floor((z + dist) / RB + 0.001) & 1) === 0) continue;
    const z1 = Math.max(z, zNear), z2 = Math.min(z + RB, zFar); if (z2 <= z1) continue;
    quad(g, P(-ROAD, z1, 0), P(ROAD, z1, 0), P(ROAD, z2, 0), P(-ROAD, z2, 0));
  }
  texBands(g, zNear, Math.min(zFar, 70), dist, GT.road, -ROAD, ROAD, 1);
  // 路肩紅白
  const KB = 2, KW = 0.38;
  for (let z = Math.floor((zNear + dist) / KB) * KB - dist; z < zFar; z += KB) {
    const z1 = Math.max(z, zNear), z2 = Math.min(z + KB, zFar); if (z2 <= z1) continue;
    g.fillStyle = th.kerb[(Math.floor((z + dist) / KB + 0.001) & 1)];
    quad(g, P(-ROAD - KW, z1, 0), P(-ROAD, z1, 0), P(-ROAD, z2, 0), P(-ROAD - KW, z2, 0));
    quad(g, P(ROAD, z1, 0), P(ROAD + KW, z1, 0), P(ROAD + KW, z2, 0), P(ROAD, z2, 0));
  }
  // 白邊線、中央虛線
  g.fillStyle = 'rgba(255,255,255,.55)';
  for (const sx of [-1, 1]) quad(g, P(sx * (ROAD - 0.25), zNear, 0), P(sx * (ROAD - 0.13), zNear, 0), P(sx * (ROAD - 0.13), zFar, 0), P(sx * (ROAD - 0.25), zFar, 0));
  g.fillStyle = th.line;
  const DB = 6;
  for (let z = Math.floor((zNear + dist) / DB) * DB - dist; z < zFar; z += DB) {
    const z1 = Math.max(z, zNear), z2 = Math.min(z + DB * 0.5, zFar); if (z2 <= z1) continue;
    quad(g, P(-0.09, z1, 0), P(0.09, z1, 0), P(0.09, z2, 0), P(-0.09, z2, 0));
  }
  // 遠方的霧：越遠越淡，蓋住路的盡頭
  const yA = P(0, Math.min(zFar, ZSPAWN) * 0.72, 0).y, yB = Math.max(gy, P(0, Math.min(zFar, ZSPAWN + 12), 0).y);
  if (yA > yB + 2) {
    const fg = g.createLinearGradient(0, yB, 0, yA);
    fg.addColorStop(0, th.fog + '0.9)'); fg.addColorStop(1, th.fog + '0)');
    g.fillStyle = fg; g.fillRect(0, yB, R.W, yA - yB);
  }
  g.fillStyle = th.fog + '0.9)'; g.fillRect(0, gy, R.W, Math.max(0, yB - gy) + 1);
}

// ---------- 門 ----------
const GATE_COL = { good: ['#2f9bff', '#7fd0ff', '#0b4fae'], bad: ['#ff3b4f', '#ff9aa4', '#9b0f22'], wpn: ['#ffb020', '#ffe08a', '#a86400'], lv: ['#2fd07a', '#a6f5c8', '#0d7a40'], spec: ['#9a4dff', '#d8b8ff', '#4a1a9a'], buff: ['#ff4fb8', '#ffb8e4', '#9a1060'] };
function gateLook(o) {
  if (o.k === 'spec') return 'spec';
  if (o.k === 'buff') return 'buff';
  if (o.k === 'pow') return 'wpn';
  if (o.k === 'kill') return 'bad';
  if (o.k === 'wpn') return 'wpn';
  if (o.k === 'lv') return 'lv';
  if (o.k === 'mul') return 'good';
  if (o.k === 'div') return 'bad';
  return o.v >= 0 ? 'good' : 'bad';
}
function gateText(o) {
  if (o.k === 'kill') return '✕';
  if (o.k === 'add') return (o.v >= 0 ? '+' : '−') + Math.abs(o.v);
  if (o.k === 'mul') return '×' + o.v;
  if (o.k === 'div') return '÷' + o.v;
  if (o.k === 'wpn') return WEAPONS[o.v].name;
  if (o.k === 'lv') return '火力 +1';
  if (o.k === 'spec') return SPEC[o.v].name;
  if (o.k === 'buff') return BUFF[o.v].name;
  if (o.k === 'pow') return '強化 ×2';
  return '';
}
function drawPost(g, x, z, H) {
  const a = P(x, z, 0), b = P(x, z, H);
  const w = Math.max(2, 0.22 * a.s);
  g.fillStyle = lin(g, a.x - w / 2, 0, a.x + w / 2, 0, ['#8b95a8', '#eef2f8', '#6c768a']);
  g.fillRect(a.x - w / 2, b.y, w, a.y - b.y);
  g.fillStyle = '#ffd34d'; ell(g, a.x, b.y, w * 0.8, w * 0.55); g.fill();
}
function drawGate(g, o, t) {
  const H = 2.7;
  const al = clamp(1 - o.fade, 0, 1);
  if (al <= 0) return;
  const look = GATE_COL[gateLook(o)];
  const x0 = o.x - o.w + 0.12, x1 = o.x + o.w - 0.12;
  const A = P(x0, o.z, 0.15), B = P(x1, o.z, H);
  const w = B.x - A.x, h = A.y - B.y;
  const ga = g.globalAlpha;
  if (o.slide || o.roul) drawGateExtra(g, o, t);
  g.save();
  g.globalAlpha = al * ga;
  // 面板
  const gr = g.createLinearGradient(0, B.y, 0, A.y);
  gr.addColorStop(0, look[0] + 'e0'); gr.addColorStop(0.55, look[0] + '80'); gr.addColorStop(1, look[0] + '30');
  g.fillStyle = gr;
  rr(g, A.x, B.y, w, h, Math.max(2, h * 0.06)); g.fill();
  // 光澤斜條
  g.save(); rr(g, A.x, B.y, w, h, Math.max(2, h * 0.06)); g.clip();
  const sh = ((t * 0.6 + o.id * 0.37) % 1.6) - 0.3;
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.beginPath(); g.moveTo(A.x + w * sh, B.y); g.lineTo(A.x + w * (sh + 0.18), B.y); g.lineTo(A.x + w * (sh - 0.12), A.y); g.lineTo(A.x + w * (sh - 0.3), A.y); g.fill();
  g.restore();
  g.lineWidth = Math.max(1.5, 0.07 * A.s);
  g.strokeStyle = look[1];
  rr(g, A.x, B.y, w, h, Math.max(2, h * 0.06)); g.stroke();
  // 文字
  const txt = gateText(o);
  const isWord = o.k === 'wpn' || o.k === 'lv' || o.k === 'spec' || o.k === 'buff' || o.k === 'pow';
  let fs = (isWord ? 0.62 : 1.05) * A.s * (1 + o.bump * 0.22);
  const ty = B.y + h * (isWord ? 0.66 : 0.5);
  g.font = `900 ${fs}px "Noto Sans TC","PingFang TC",system-ui,sans-serif`;
  const tw = g.measureText(txt).width;
  if (tw > w * 0.92) { fs *= w * 0.92 / tw; g.font = `900 ${fs}px "Noto Sans TC","PingFang TC",system-ui,sans-serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = fs * 0.16; g.strokeStyle = look[2];
  g.strokeText(txt, A.x + w / 2, ty);
  g.fillStyle = '#fff'; g.fillText(txt, A.x + w / 2, ty);
  if (o.k === 'wpn') drawWeaponIcon(g, o.v, A.x + w / 2, B.y + h * 0.3, h * 0.22, '#fff', look[2]);
  if (o.k === 'spec' || o.k === 'buff') drawSpecIcon(g, o.v, A.x + w / 2, B.y + h * 0.3, h * 0.26, look[2]);
  if (o.k === 'pow') drawSpecIcon(g, 'fury', A.x + w / 2, B.y + h * 0.3, h * 0.26, look[2]);
  if (o.k === 'lv') { // 往上箭頭
    const cx = A.x + w / 2, cy = B.y + h * 0.3, s = h * 0.16;
    g.fillStyle = '#fff'; g.strokeStyle = look[2]; g.lineWidth = s * 0.25;
    g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s, cy); g.lineTo(cx + s * 0.4, cy); g.lineTo(cx + s * 0.4, cy + s); g.lineTo(cx - s * 0.4, cy + s); g.lineTo(cx - s * 0.4, cy); g.lineTo(cx - s, cy); g.closePath(); g.stroke(); g.fill();
  }
  g.restore();
  g.globalAlpha = al * ga;
  drawPost(g, o.x - o.w, o.z, H + 0.15);
  drawPost(g, o.x + o.w, o.z, H + 0.15);
  g.globalAlpha = ga;
}

function drawWeaponIcon(g, wid, x, y, s, fill, stroke) {
  g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
  g.fillStyle = fill; g.strokeStyle = stroke || 'rgba(0,0,0,.6)'; g.lineWidth = 5; g.lineJoin = 'round';
  const P2 = pts => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.stroke(); g.fill(); };
  if (wid === 'rifle') { P2([-34, -6, 26, -6, 26, -12, 34, -12, 34, -2, 4, -2, 0, 10, -10, 10, -8, -2, -22, -2, -30, 10, -38, 10, -34, -2]); }
  else if (wid === 'smg') { P2([-24, -10, 22, -10, 22, -4, 30, -4, 30, 2, 6, 2, 6, 16, -2, 16, -2, 2, -14, 2, -18, 12, -26, 12, -22, 2, -24, 2]); }
  else if (wid === 'shotgun') { P2([-36, -8, 34, -8, 34, 0, 0, 0, -6, 4, -14, 4, -20, 0, -28, 12, -38, 10, -32, -2]); g.fillRect(-4, 2, 18, 5); }
  else if (wid === 'rocket') { P2([-34, -10, 22, -10, 30, -16, 36, -16, 36, 16, 30, 16, 22, 10, -34, 10]); g.beginPath(); g.moveTo(-8, 10); g.lineTo(-4, 22); g.lineTo(4, 22); g.lineTo(2, 10); g.stroke(); g.fill(); }
  else if (wid === 'laser') { P2([-30, -8, 18, -12, 32, -4, 32, 4, 18, 12, -30, 8]); g.fillStyle = '#7df9ff'; g.fillRect(14, -3, 22, 6); g.beginPath(); g.moveTo(-6, 8); g.lineTo(-10, 20); g.lineTo(-2, 20); g.lineTo(2, 8); g.fillStyle = fill; g.stroke(); g.fill(); }
  g.restore();
}

// ---------- 頭目 ----------
function drawBoss(g, b, t) {
  const p = P(b.x, b.z, 0);
  const s = p.s;
  const jit = b.hit > 0 ? (Math.random() - 0.5) * 0.06 * s : 0;
  let alpha = 1, sink = 0, dj = 0;
  if (b.dead) {
    const dt = G.t - (b.deadAt || G.t);
    alpha = clamp(1 - dt / 1.7, 0, 1); sink = dt * 0.5 * s; dj = (Math.random() - 0.5) * 0.12 * s * alpha;
    if (alpha <= 0) return;
  }
  const intro = b.intro > 0 ? clamp(1 - b.intro / 2.2, 0, 1) : 1;
  alpha *= Math.min(1, intro * 1.6);
  drawShadow(g, p.x, p.y, b.r * 2.6 * s);
  const sc = b.h / BOSSES[b.k].h;
  // 先畫到離屏畫布，才能加外框和受擊閃白
  const u = s * sc;
  let ap = 0; // 攻擊動作 0..1..0
  if (b.atk > 0) { const q = 1 - b.atk / 0.35; ap = q < 0.45 ? q / 0.45 : 1 - (q - 0.45) / 0.55; }
  const raise = b.atk > 0 && (1 - b.atk / 0.35) < 0.45;
  const bob = Math.sin(b.ph * 2) * 0.06;
  // 3D 烤好的頭目：挑一格動作
  const BK = typeof Bake !== 'undefined' && Bake.boss[b.k];
  let F = null;
  if (BK) {
    const set = b.phase > 1 ? BK.r : BK.n;
    F = set[b.dead ? 0 : raise ? 4 : b.atk > 0 ? (ap > 0.7 ? 5 : 6) : (Math.floor(Math.abs(b.ph) * 4 / Math.PI) & 3)];
  }
  const BW = F ? Math.ceil(F.wh * u * F.width / F.height) : Math.ceil(6.4 * u), BH = F ? Math.ceil(F.wh * u) : Math.ceil(6.2 * u);
  if (BW < 4 || BH < 4) return;
  if (!R.bossCv) { R.bossCv = mkCanvas(8, 8); R.bossSil = mkCanvas(8, 8); }
  const C = R.bossCv, S = R.bossSil;
  if (C.width < BW || C.height < BH) { C.width = S.width = Math.max(C.width, BW); C.height = S.height = Math.max(C.height, BH); }
  const c = C.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, C.width, C.height);
  if (F) c.drawImage(F, 0, 0, BW, BH);
  else {
    c.translate(BW / 2, BH - 0.2 * u); c.scale(u, u);
    BOSS_DRAW[b.k](c, { ap, raise, bob, rage: b.phase > 1, t, ph: b.ph, dead: b.dead });
  }
  const sg = S.getContext('2d');
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, S.width, S.height);
  sg.drawImage(C, 0, 0); sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = b.phase > 1 ? 'rgba(90,0,10,.95)' : 'rgba(20,14,30,.92)'; sg.fillRect(0, 0, S.width, S.height);
  sg.globalCompositeOperation = 'source-over';
  const ox = p.x + jit + dj - BW / 2, oy = F ? p.y + sink - BH * (1 - F.foot) : p.y + sink - BH + 0.2 * u;
  const ol = Math.max(1.5, 0.05 * u);
  g.save(); g.globalAlpha = alpha;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.drawImage(S, ox + Math.cos(a) * ol, oy + Math.sin(a) * ol); }
  g.drawImage(C, ox, oy);
  if (b.hit > 0 || b.atk > 0.25) {
    sg.globalCompositeOperation = 'source-in'; sg.fillStyle = b.hit > 0 ? '#ffffff' : '#ff3030'; sg.fillRect(0, 0, S.width, S.height); sg.globalCompositeOperation = 'source-over';
    g.globalAlpha = alpha * (b.hit > 0 ? 0.35 : 0.25); g.drawImage(S, ox, oy);
  }
  g.restore();
}
const BOSS_DRAW = {
  golem(g, a) {
    const B = a.bob;
    const rock = (x, y, w, h, c0, c1, rot) => {
      g.save(); g.translate(x, y); if (rot) g.rotate(rot);
      g.fillStyle = radial(g, 0, 0, Math.max(w, h) / 2, c0, c1); rr(g, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.32); g.fill();
      g.fillStyle = 'rgba(255,255,255,.14)'; rr(g, -w / 2 + w * 0.08, -h / 2 + h * 0.06, w * 0.5, h * 0.18, h * 0.08); g.fill();
      g.fillStyle = 'rgba(40,30,20,.22)'; ell(g, w * 0.18, h * 0.12, w * 0.08, h * 0.06); g.fill(); ell(g, -w * 0.2, h * 0.24, w * 0.06, h * 0.05); g.fill();
      g.restore();
    };
    const glow = a.rage ? '#ff4a1f' : '#ffab3a';
    // 腿
    rock(-0.68, -0.6 + Math.max(0, B), 0.95, 1.2, '#a8a093', '#544c44', -0.05);
    rock(0.68, -0.6 + Math.max(0, -B), 0.95, 1.2, '#a8a093', '#544c44', 0.05);
    rock(-0.72, -0.12 + Math.max(0, B), 1.2, 0.4, '#8e867a', '#3f3832');
    rock(0.72, -0.12 + Math.max(0, -B), 1.2, 0.4, '#8e867a', '#3f3832');
    // 手臂
    const armY = a.raise ? -4.1 - a.ap * 0.4 : -2.0 + a.ap * 0.9;
    for (const sd of [-1, 1]) {
      const ax = sd * (1.9 - (a.raise ? 0.3 : 0));
      rock(sd * 1.6, -3.05 + B, 1.0, 0.95, '#bdb3a4', '#62594f', sd * 0.2);
      rock(sd * 1.82, (armY - 3.05) / 2 + B + 0.2, 0.7, 0.9, '#aea495', '#5a5248');
      rock(ax, armY + B, 1.25, 1.35, '#c2b8a8', '#5a5248', sd * 0.1);
      g.fillStyle = 'rgba(60,50,40,.35)'; for (let k = -1; k <= 1; k++) { rr(g, ax + k * 0.32 - 0.12, armY + B + 0.35, 0.24, 0.28, 0.08); g.fill(); }
      // 肩上的水晶
      g.fillStyle = lin(g, sd * 1.4, -4.2, sd * 1.9, -3.4, [a.rage ? '#ffb3a0' : '#ffe8a8', glow]);
      poly(g, [sd * 1.35, -3.4 + B, sd * 1.5, -4.15 + B, sd * 1.65, -3.4 + B]); g.fill();
      poly(g, [sd * 1.65, -3.35 + B, sd * 1.88, -3.95 + B, sd * 1.95, -3.3 + B]); g.fill();
    }
    // 身體
    rock(0, -2.25 + B, 2.9, 2.35, '#c8beae', '#5c544a');
    rock(-0.62, -2.85 + B, 1.25, 0.8, '#d4cabb', '#6f665a', -0.08);
    rock(0.7, -2.8 + B, 1.15, 0.75, '#d0c6b6', '#6b6256', 0.1);
    rock(0, -1.4 + B, 1.9, 0.75, '#b4aa9a', '#544c42');
    g.fillStyle = 'rgba(90,160,70,.75)';
    for (const [x, y, rx, ry] of [[-0.95, -3.2, 0.5, 0.18], [0.95, -1.55, 0.35, 0.13], [-0.2, -3.25, 0.25, 0.1]]) { ell(g, x, y + B, rx, ry); g.fill(); }
    // 胸口符文
    g.strokeStyle = glow; g.lineWidth = 0.08; g.lineCap = 'round';
    ell(g, 0, -2.2 + B, 0.42, 0.42); g.stroke();
    g.beginPath(); g.moveTo(0, -2.55 + B); g.lineTo(0, -1.85 + B); g.moveTo(-0.3, -2.2 + B); g.lineTo(0.3, -2.2 + B); g.stroke();
    g.fillStyle = radial(g, 0, -2.2 + B, 0.6, a.rage ? 'rgba(255,120,60,.8)' : 'rgba(255,200,90,.7)', 'rgba(255,150,40,0)', 0, 0); ell(g, 0, -2.2 + B, 0.6, 0.6); g.fill();
    // 裂縫
    g.strokeStyle = glow; g.lineWidth = 0.06;
    g.beginPath(); g.moveTo(-0.95, -1.7 + B); g.lineTo(-0.7, -2.0 + B); g.lineTo(-0.85, -2.3 + B); g.moveTo(0.9, -2.4 + B); g.lineTo(1.1, -2.0 + B); g.stroke();
    // 頭
    rock(0, -3.9 + B, 1.55, 1.1, '#d6cdbd', '#6b6257');
    g.fillStyle = '#5a5248'; rr(g, -0.7, -4.2 + B, 1.4, 0.22, 0.1); g.fill(); // 眉骨
    g.fillStyle = radial(g, 0, -3.9 + B, 0.8, glow, 'rgba(255,120,30,0)', 0, 0); ell(g, 0, -3.88 + B, 0.85, 0.42); g.fill();
    g.fillStyle = '#fff6d0'; ell(g, -0.33, -3.92 + B, 0.15, 0.1); g.fill(); ell(g, 0.33, -3.92 + B, 0.15, 0.1); g.fill();
    g.fillStyle = '#3a332c'; rr(g, -0.35, -3.6 + B + a.ap * 0.05, 0.7, 0.12 + a.ap * 0.1, 0.05); g.fill();
  },
  scorpion(g, a) {
    const B = a.bob * 0.5, dark = '#7a4a16';
    // 腳（分節）
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
      const kx = sd * (1.05 + i * 0.38), lift = Math.sin(a.ph * 3 + i + (sd > 0 ? 1 : 0)) * 0.1;
      g.strokeStyle = dark; g.lineWidth = 0.16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(sd * 0.75, -0.9); g.lineTo(kx + sd * 0.4, -1.4 + lift); g.lineTo(kx + sd * 0.85, 0); g.stroke();
      g.strokeStyle = '#e0aa50'; g.lineWidth = 0.06;
      g.beginPath(); g.moveTo(sd * 0.75, -0.95); g.lineTo(kx + sd * 0.4, -1.45 + lift); g.stroke();
      g.fillStyle = '#5a3410'; ell(g, kx + sd * 0.4, -1.4 + lift, 0.09, 0.09); g.fill();
    }
    // 尾巴
    let px = 0, py = -1.4;
    const curl = a.raise ? 0.25 : a.ap > 0 ? -0.6 * a.ap : 0;
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI / 2 + i * (0.42 + curl * 0.15) + Math.sin(a.ph + i) * 0.04;
      const nx = px + Math.cos(ang) * 0.1, ny = py + Math.sin(ang) * 0.5;
      const r = 0.38 - i * 0.03;
      g.fillStyle = radial(g, nx, ny, r, '#ffd884', '#8a5a1f'); ell(g, nx, ny, r, r * 0.85); g.fill();
      g.strokeStyle = 'rgba(90,50,10,.55)'; g.lineWidth = 0.04; g.beginPath(); g.ellipse(nx, ny + r * 0.3, r * 0.8, r * 0.3, 0, 0, Math.PI); g.stroke();
      g.fillStyle = '#5a3410'; poly(g, [nx - 0.05, ny - r * 0.8, nx, ny - r * 1.15, nx + 0.05, ny - r * 0.8]); g.fill();
      px = nx; py = ny;
    }
    const sting = a.rage ? '#ff3b3b' : '#9b3fd0';
    g.fillStyle = radial(g, px, py + 0.2, 0.4, a.rage ? 'rgba(255,80,80,.6)' : 'rgba(190,100,255,.6)', 'rgba(0,0,0,0)', 0, 0); ell(g, px, py + 0.25, 0.45, 0.45); g.fill();
    g.fillStyle = sting; g.beginPath(); g.moveTo(px - 0.2, py - 0.05); g.quadraticCurveTo(px - 0.05, py + 0.3, px, py + 0.62 + a.ap * 0.5); g.quadraticCurveTo(px + 0.05, py + 0.3, px + 0.2, py - 0.05); g.fill();
    // 身體（甲殼）
    g.fillStyle = radial(g, 0, -0.95, 1.6, '#ffd884', '#8f5a1e');
    ell(g, 0, -0.95 + B, 1.6, 0.75); g.fill();
    for (const [y, w] of [[-0.72, 1.35], [-1.0, 1.25], [-1.27, 1.0]]) {
      g.strokeStyle = 'rgba(90,50,10,.6)'; g.lineWidth = 0.06; g.beginPath(); g.ellipse(0, y + B, w, 0.35, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      g.strokeStyle = 'rgba(255,240,190,.45)'; g.lineWidth = 0.03; g.beginPath(); g.ellipse(0, y + B - 0.04, w * 0.9, 0.3, 0, Math.PI * 1.2, Math.PI * 1.6); g.stroke();
    }
    g.fillStyle = '#6a3c12'; for (let i = -2; i <= 2; i++) { poly(g, [i * 0.42 - 0.08, -1.55 + B + Math.abs(i) * 0.06, i * 0.42, -1.82 + B + Math.abs(i) * 0.06, i * 0.42 + 0.08, -1.55 + B + Math.abs(i) * 0.06]); g.fill(); }
    // 鉗子
    for (const sd of [-1, 1]) {
      const cx = sd * (1.9 + (a.raise ? 0.2 : 0)), cy = -1.1 - (a.raise ? 0.5 : 0) + a.ap * 0.3;
      g.strokeStyle = dark; g.lineWidth = 0.26; g.beginPath(); g.moveTo(sd * 1.1, -0.9); g.quadraticCurveTo(sd * 1.6, -0.6, cx, cy + 0.25); g.stroke();
      g.fillStyle = radial(g, cx, cy, 0.55, '#ffd884', '#8f5a1e');
      g.beginPath(); g.ellipse(cx, cy, 0.5, 0.36, 0, 0, Math.PI * 2); g.fill();
      const open = 0.15 + (a.raise ? 0.25 : 0) + Math.sin(a.ph * 2) * 0.05;
      g.fillStyle = '#e8b35a';
      poly(g, [cx - 0.22 * sd, cy - 0.2, cx + sd * 0.1, cy - 0.85 - open, cx + sd * 0.38, cy - 0.22]); g.fill();
      poly(g, [cx + sd * 0.12, cy - 0.12, cx + sd * 0.62, cy - 0.5 + open * 0.5, cx + sd * 0.5, cy + 0.02]); g.fill();
      g.fillStyle = '#fff3d0'; for (let k = 0; k < 3; k++) { ell(g, cx + sd * (0.12 + k * 0.1), cy - 0.32 - k * 0.12, 0.035, 0.035); g.fill(); }
    }
    // 眼（四顆）
    for (const [x, y, r] of [[-0.32, -1.32, 0.15], [0.32, -1.32, 0.15], [-0.12, -1.5, 0.08], [0.12, -1.5, 0.08]]) {
      g.fillStyle = a.rage ? '#ff2b2b' : '#2a0f05'; ell(g, x, y + B, r, r * 0.85); g.fill();
      g.fillStyle = '#fff'; ell(g, x - r * 0.3, y + B - r * 0.3, r * 0.3, r * 0.3); g.fill();
    }
  },
  yeti(g, a) {
    const B = a.bob;
    const fur = (x, y, rx, ry) => { g.fillStyle = radial(g, x, y, Math.max(rx, ry), '#ffffff', '#93aac6'); ell(g, x, y, rx, ry); g.fill(); };
    // 腳與爪
    for (const sd of [-1, 1]) {
      const l = sd < 0 ? Math.max(0, B) : Math.max(0, -B);
      fur(sd * 0.62, -0.5 + l, 0.55, 0.55);
      g.fillStyle = '#5f8fc4'; ell(g, sd * 0.65, -0.08 + l, 0.5, 0.17); g.fill();
      g.fillStyle = '#eef4ff'; for (let k = -1; k <= 1; k++) { poly(g, [sd * 0.65 + k * 0.18 - 0.05, -0.05 + l, sd * 0.65 + k * 0.18, 0.08 + l, sd * 0.65 + k * 0.18 + 0.05, -0.05 + l]); g.fill(); }
    }
    // 手臂
    const armY = a.raise ? -4.6 : -1.6 + a.ap * 0.8;
    for (const sd of [-1, 1]) {
      const hx = sd * (1.65 - (a.raise ? 0.3 : 0));
      g.strokeStyle = '#d7e3f0'; g.lineWidth = 0.85; g.lineCap = 'round';
      g.beginPath(); g.moveTo(sd * 1.2, -3.1 + B); g.lineTo(hx, armY + B); g.stroke();
      g.strokeStyle = 'rgba(120,150,190,.5)'; g.lineWidth = 0.05;
      for (let k = 0; k < 4; k++) { const tt = 0.2 + k * 0.2; const x = sd * 1.2 + (hx - sd * 1.2) * tt, y = -3.1 + B + (armY + 3.1) * tt; g.beginPath(); g.moveTo(x - 0.2, y); g.lineTo(x - 0.1, y + 0.15); g.moveTo(x + 0.2, y); g.lineTo(x + 0.1, y + 0.15); g.stroke(); }
      const hy = armY + B - (a.raise ? 0.1 : -0.25);
      g.fillStyle = radial(g, hx, hy, 0.5, '#8fbbe8', '#3f6ea8'); ell(g, hx, hy, 0.48, 0.42); g.fill();
      g.fillStyle = '#eef4ff'; for (let k = -1; k <= 1; k++) { poly(g, [hx + k * 0.2 - 0.06, hy + 0.3, hx + k * 0.2, hy + (a.raise ? -0.6 : 0.6), hx + k * 0.2 + 0.06, hy + 0.3]); g.fill(); }
    }
    // 身體
    fur(0, -2.25 + B, 1.5, 1.8);
    g.strokeStyle = 'rgba(130,160,200,.55)'; g.lineWidth = 0.05; g.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const x = -1.1 + (i % 6) * 0.44 + ((i * 7) % 3) * 0.05, y = -2.9 + Math.floor(i / 6) * 0.65 + B; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 0.08, y + 0.18, x, y + 0.32); g.stroke(); }
    g.fillStyle = 'rgba(175,200,230,.55)'; ell(g, 0, -1.7 + B, 0.85, 0.8); g.fill(); // 肚子
    // 毛邊
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 11; i++) { const ang = Math.PI * (0.05 + i * 0.09); const x = Math.cos(ang) * 1.5, y = -2.25 + B - Math.sin(ang) * 1.8; poly(g, [x - 0.2, y, x * 1.13, y - 0.28, x + 0.2, y]); g.fill(); }
    // 肩上的冰
    for (const sd of [-1, 1]) {
      g.fillStyle = lin(g, sd * 1.0, -4.0, sd * 1.4, -3.3, ['#e8f8ff', '#7fc8f0']);
      poly(g, [sd * 0.95, -3.45 + B, sd * 1.12, -4.1 + B, sd * 1.25, -3.45 + B]); g.fill();
      poly(g, [sd * 1.2, -3.35 + B, sd * 1.42, -3.85 + B, sd * 1.5, -3.25 + B]); g.fill();
    }
    // 臉
    g.fillStyle = radial(g, 0, -3.15 + B, 0.85, '#a8d2f6', '#4a7fb5'); ell(g, 0, -3.15 + B, 0.82, 0.66); g.fill();
    g.fillStyle = 'rgba(40,70,120,.35)'; ell(g, 0, -2.95 + B, 0.42, 0.25); g.fill();
    g.fillStyle = '#1b2a4a'; ell(g, -0.09, -3.05 + B, 0.05, 0.035); g.fill(); ell(g, 0.09, -3.05 + B, 0.05, 0.035); g.fill();
    // 角
    for (const sd of [-1, 1]) {
      g.fillStyle = lin(g, sd * 0.5, -4.0, sd * 1.3, -4.9, ['#d9cfb0', '#fff8e4']);
      g.beginPath(); g.moveTo(sd * 0.7, -3.9 + B); g.quadraticCurveTo(sd * 1.45, -4.4 + B, sd * 1.12, -4.95 + B); g.quadraticCurveTo(sd * 1.05, -4.35 + B, sd * 0.45, -4.0 + B); g.fill();
      g.strokeStyle = 'rgba(150,120,70,.5)'; g.lineWidth = 0.04; g.beginPath(); g.moveTo(sd * 0.85, -4.0 + B); g.lineTo(sd * 0.95, -4.15 + B); g.moveTo(sd * 1.05, -4.2 + B); g.lineTo(sd * 1.18, -4.33 + B); g.stroke();
    }
    const ec = a.rage ? '#ff3030' : '#1b2a4a';
    for (const sd of [-1, 1]) {
      g.fillStyle = '#fff'; ell(g, sd * 0.3, -3.32 + B, 0.17, 0.15); g.fill(); g.fillStyle = ec; ell(g, sd * 0.3, -3.29 + B, 0.09, 0.09); g.fill();
      g.strokeStyle = '#1b2a4a'; g.lineWidth = 0.07; g.beginPath(); g.moveTo(sd * 0.5, -3.55 + B); g.lineTo(sd * 0.14, -3.44 + B); g.stroke();
    }
    g.fillStyle = '#1b2a4a'; g.beginPath(); g.ellipse(0, -2.82 + B, 0.4, 0.2 + a.ap * 0.14, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#fff';
    for (const sd of [-1, 1]) { poly(g, [sd * 0.28, -2.82 + B, sd * 0.2, -2.6 + B, sd * 0.12, -2.82 + B]); g.fill(); }
  },
  mech(g, a) {
    const B = a.bob;
    const metal = (x, y, w, h, r, dark) => {
      g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, dark ? ['#3a4152', '#7c879e', '#4a5266', '#2a303e'] : ['#5a6377', '#d4dcec', '#7a8499', '#3e4556']);
      rr(g, x - w / 2, y - h / 2, w, h, r == null ? 0.12 : r); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, x - w / 2 + 0.05, y - h / 2 + 0.04, w - 0.1, Math.min(0.12, h * 0.2), 0.05); g.fill();
    };
    const rivet = (x, y) => { g.fillStyle = '#9aa3b5'; ell(g, x, y, 0.045, 0.045); g.fill(); g.fillStyle = '#2a303e'; ell(g, x + 0.015, y + 0.015, 0.02, 0.02); g.fill(); };
    const core = a.rage ? '#ff3b4f' : '#3ff2ff';
    // 腿
    for (const sd of [-1, 1]) {
      const l = sd > 0 ? Math.max(0, -B) : Math.max(0, B);
      metal(sd * 0.7, -1.0 + l, 0.55, 1.2, 0.12, true);
      metal(sd * 0.7, -0.55 + l, 0.7, 0.32, 0.12);
      metal(sd * 0.78, -0.16 + l, 1.0, 0.34, 0.08);
      g.fillStyle = '#ffcc33'; for (let k = 0; k < 3; k++) { poly(g, [sd * 0.78 - 0.4 + k * 0.28, -0.04 + l, sd * 0.78 - 0.28 + k * 0.28, -0.28 + l, sd * 0.78 - 0.18 + k * 0.28, -0.28 + l, sd * 0.78 - 0.3 + k * 0.28, -0.04 + l]); g.fill(); }
    }
    // 手臂砲
    const armY = a.raise ? -4.2 : -2.0 + a.ap * 0.9;
    for (const sd of [-1, 1]) {
      const ax = sd * (1.95 - (a.raise ? 0.2 : 0));
      metal(ax, armY + B, 0.72, 1.65, 0.15, true);
      metal(ax, armY + B - 0.45, 0.82, 0.3, 0.08);
      g.fillStyle = '#20242e'; ell(g, ax, armY + B + 0.78, 0.26, 0.13); g.fill();
      g.fillStyle = radial(g, ax, armY + B + 0.78, 0.25, core, 'rgba(0,0,0,0)', 0, 0); ell(g, ax, armY + B + 0.78, 0.2, 0.1); g.fill();
      // 肩上飛彈莢
      metal(sd * 1.85, -3.45 + B, 1.1, 0.85, 0.22);
      g.fillStyle = '#2a303e'; for (let k = 0; k < 4; k++) { ell(g, sd * 1.85 + ((k % 2) - 0.5) * 0.36, -3.55 + B + Math.floor(k / 2) * 0.28, 0.1, 0.1); g.fill(); }
      g.fillStyle = '#ff5a3a'; for (let k = 0; k < 4; k++) { ell(g, sd * 1.85 + ((k % 2) - 0.5) * 0.36, -3.55 + B + Math.floor(k / 2) * 0.28, 0.05, 0.05); g.fill(); }
    }
    // 身體
    metal(0, -2.55 + B, 2.7, 2.2, 0.32);
    g.strokeStyle = 'rgba(30,36,48,.55)'; g.lineWidth = 0.04;
    g.beginPath(); g.moveTo(-1.2, -2.0 + B); g.lineTo(-0.7, -1.6 + B); g.lineTo(0.7, -1.6 + B); g.lineTo(1.2, -2.0 + B); g.moveTo(-1.1, -3.1 + B); g.lineTo(1.1, -3.1 + B); g.stroke();
    for (const [x, y] of [[-1.15, -3.45], [1.15, -3.45], [-1.15, -1.75], [1.15, -1.75]]) rivet(x, y + B);
    // 散熱口
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
      g.fillStyle = '#2a303e'; rr(g, sd * 0.95 - 0.18, -2.75 + B + k * 0.2, 0.36, 0.1, 0.04); g.fill();
      g.fillStyle = a.rage ? 'rgba(255,90,60,.7)' : 'rgba(255,160,60,.55)'; rr(g, sd * 0.95 - 0.15, -2.74 + B + k * 0.2, 0.3, 0.05, 0.02); g.fill();
    }
    // 核心
    const pulse = Math.sin(a.t * 6) * 0.04;
    g.fillStyle = radial(g, 0, -2.4 + B, 1.0, a.rage ? 'rgba(255,60,80,.5)' : 'rgba(63,242,255,.45)', 'rgba(0,0,0,0)', 0, 0); ell(g, 0, -2.4 + B, 0.95, 0.95); g.fill();
    g.fillStyle = radial(g, 0, -2.4 + B, 0.5, '#ffffff', core, 0, 0); ell(g, 0, -2.4 + B, 0.42 + pulse, 0.42 + pulse); g.fill();
    g.strokeStyle = core; g.lineWidth = 0.07;
    g.save(); g.translate(0, -2.4 + B); g.rotate(a.t * 2);
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(0, 0, 0.62, k * 2.1, k * 2.1 + 1.3); g.stroke(); }
    g.restore();
    // 頭
    metal(0, -4.05 + B, 1.2, 0.85, 0.28);
    metal(0, -3.65 + B, 0.7, 0.2, 0.06, true);
    g.fillStyle = '#1a1e28'; rr(g, -0.48, -4.2 + B, 0.96, 0.24, 0.1); g.fill();
    g.fillStyle = a.rage ? '#ff2b2b' : '#ff5a3a'; rr(g, -0.45, -4.18 + B, 0.9, 0.2, 0.08); g.fill();
    const scan = Math.sin(a.t * 3) * 0.35;
    g.fillStyle = '#fff2c0'; rr(g, scan - 0.08, -4.17 + B, 0.16, 0.18, 0.05); g.fill();
    g.strokeStyle = '#9aa3b5'; g.lineWidth = 0.06; g.beginPath(); g.moveTo(0.38, -4.45 + B); g.lineTo(0.52, -5.0 + B); g.stroke();
    g.fillStyle = core; ell(g, 0.52, -5.02 + B, 0.08, 0.08); g.fill();
  },
};

// ---------- 主畫面 ----------
function render(G, t) {
  const g = R.g, th = G.L.theme;
  // 鏡頭稍微跟隨部隊
  R.camX = G.px * 0.35;
  if (R.bgKey !== th.id + R.W + 'x' + R.H) { R.bg = buildBg(th); R.bgKey = th.id + R.W + 'x' + R.H; R.sun = null; }
  if (!R.vig) R.vig = vignette();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const sh = G.shake * 9 * R.dpr * R.q;
  const sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0;
  g.translate(sx, sy);
  // 天空
  if (R.hy > 2) g.drawImage(R.bg, -R.bgPad - R.camX * 2 * R.dpr, 0);
  drawClouds(g, th, t);
  drawGround(g, th, G.dist);
  drawGroundDetail(g, th, G.dist);
  drawHazGround(g, G, t);
  for (const e of G.fx) if (e.k === 'ring') drawRing(g, e);

  // 收集要畫的東西
  const items = R.items || (R.items = []);
  items.length = 0;
  const SP = 4.2;
  const k0 = Math.floor((G.dist - 10) / SP), k1 = Math.floor((G.dist + ZSPAWN + 8) / SP);
  for (let k = k0; k <= k1; k++) for (const side of [-1, 1]) {
    const h = hash(k * 2 + (side > 0 ? 1 : 0) + th.id.length * 1000);
    if (h % 10 < 3) continue;
    const kind = th.decor[(h >>> 4) % th.decor.length];
    const far = kind === 'building' || kind === 'mesa' || kind === 'windmill';
    const x = side * (ROAD + (far ? 5.5 : 1.9) + ((h >>> 9) % 70) / 10);
    const z = k * SP - G.dist + ((h >>> 3) % 20) / 10;
    if (z < -Z0 + 1 || z > ZSPAWN + 6) continue;
    items.push({ z, d: 0, kind, x, v: (h >>> 12) % 3, sc: 0.8 + ((h >>> 15) % 50) / 100 });
  }
  fenceItems(items, th, G.dist);
  for (const o of G.objs) {
    if (o.t === 'spike') continue;
    if (o.t === 'divider') { dividerItems(items, o); continue; }
    items.push({ z: o.t === 'lob' ? o.z - 0.3 : o.z, o });
  }
  for (const e of G.fx) if (e.k !== 'ring' && !(e.k === 'die' && e.boss)) items.push({ z: e.z - 0.05, e });
  items.push({ z: 0.001, crowd: 1 });
  items.sort((a, b) => b.z - a.z);
  for (const it of items) {
    if (it.kind) drawDecor(g, it);
    else if (it.fence) drawFence(g, it, th);
    else if (it.div) drawDividerSeg(g, it);
    else if (it.e) drawFxItem(g, it.e);
    else if (it.crowd) drawCrowd(g, G, t);
    else {
      const o = it.o;
      if (o.t === 'gate') drawGate(g, o, t);
      else if (o.t === 'en') drawEnemy(g, o);
      else if (o.t === 'bar') drawBarrelObj(g, o, t);
      else if (o.t === 'boss') drawBoss(g, o, t);
      else if (o.t === 'wall') drawWall(g, o, t);
      else if (o.t === 'crate') drawCrate(g, o, t);
      else if (o.t === 'saw') drawSaw(g, o);
      else if (o.t === 'lob' || o.t === 'shell') drawLob(g, o);
      else if (o.t === 'geyser') drawGeyserPlume(g, o, t);
    }
  }
  drawLobWarnTop(g, G, t);
  if (G.rule === 'fog') drawFogRule(g, th);
  if (G.rule === 'dark') drawDarkRule(g, G);
  drawBullets(g, G);
  drawParts(g, G);
  drawFloats(g, G);
  drawWeather(g, th, t);
  if (th.dark) { g.fillStyle = 'rgba(30,10,60,.12)'; g.fillRect(-20, -20, R.W + 40, R.H + 40); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!th.dark) {
    if (!R.sun) {
      R.sun = mkCanvas(R.W, R.H); const s = R.sun.getContext('2d');
      const gr = s.createRadialGradient(R.W * 0.15, 0, 0, R.W * 0.15, 0, Math.max(R.W, R.H) * 0.8);
      gr.addColorStop(0, 'rgba(255,240,200,.28)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
      s.fillStyle = gr; s.fillRect(0, 0, R.W, R.H);
    }
    g.drawImage(R.sun, 0, 0);
  }
  g.drawImage(R.vig, 0, 0);
  if (G.flash > 0) { g.fillStyle = `rgba(255,60,60,${G.flash * 0.35})`; g.fillRect(0, 0, R.W, R.H); }
  if (G.themeFade > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(1, G.themeFade * 1.4)})`; g.fillRect(0, 0, R.W, R.H); }
}

function drawShadow(g, x, y, w) {
  g.drawImage(ART.scene.shadow, x - w / 2, y - w * 0.16, w, w * 0.32);
}

function drawDecor(g, it) {
  const spr = ART.decor[it.kind][it.v];
  const [ww, hh] = DECOR_SIZE[it.kind];
  const p = P(it.x, it.z, 0);
  const h = (spr.wh || hh) * it.sc * p.s, w = spr.wh ? h * spr.width / spr.height : ww * it.sc * p.s;
  if (p.y - h > R.H || p.x + w < 0 || p.x - w > R.W) return;
  drawShadow(g, p.x, p.y, w * 0.9);
  g.drawImage(spr, p.x - w / 2, p.y - h * (1 - (spr.foot || 0)), w, h);
}

function drawEnemy(g, o) {
  const A = ART[o.art || o.k];
  const fi = Math.floor(o.ph / (Math.PI / 2)) & 3;
  const spr = o.hit > 0 ? A.fl[fi] : A.fr[fi];
  const p0 = P(o.x, o.z, 0), p = o.fly ? P(o.x, o.z, 0.9 + 0.15 * Math.sin(o.ph * 0.5)) : p0;
  const h = spr.wh ? spr.wh * o.h / ENEMIES[o.art || o.k].h * p.s : o.h * 1.12 * p.s, w = h * spr.width / spr.height;
  if (p.y - h > R.H + 50 || p.x + w < 0 || p.x - w > R.W) return;
  drawShadow(g, p0.x, p0.y, o.r * 2.4 * p0.s * (o.fly ? 0.7 : 1));
  if (o.k === 'healer' && o.atk > 0) { g.globalCompositeOperation = 'lighter'; const gs = h * 1.6; g.globalAlpha = o.atk / 0.4; g.drawImage(ART.glowW, p.x - gs / 2, p.y - h * 0.6 - gs / 2, gs, gs); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  g.drawImage(spr, p.x - w / 2, p.y - h * (1 - (spr.foot || 0)), w, h);
  if ((o.k === 'brute' || o.k === 'shield' || o.k === 'healer' || o.k === 'magma') && o.hp < o.max) {
    const bw = o.r * 1.7 * p.s, bh = Math.max(4, 0.13 * p.s), by = p.y - h - 0.12 * p.s;
    g.fillStyle = 'rgba(10,10,20,.7)'; rr(g, p.x - bw / 2 - 1, by - 1, bw + 2, bh + 2, bh); g.fill();
    g.fillStyle = o.hp < o.max * 0.35 ? '#ff4040' : '#ffb03a'; rr(g, p.x - bw / 2, by, bw * clamp(o.hp / o.max, 0.02, 1), bh, bh / 2); g.fill();
  }
}
function drawBarrelObj(g, o, t) {
  const p = P(o.x, o.z, 0);
  const BR = ART.barrel, h = (BR.wh || 1.15) * p.s, w = h * BR.width / BR.height, by = p.y - h * (1 - (BR.foot || 0));
  drawShadow(g, p.x, p.y, 1.1 * p.s);
  g.drawImage(BR, p.x - w / 2, by, w, h);
  // 閃爍的警告燈
  const blink = (Math.sin(t * 8 + o.id) + 1) / 2;
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + blink * 0.4;
  const gs = 0.7 * p.s; g.drawImage(ART.glow.rocket, p.x - gs / 2, p.y - h * 1.05 - gs / 2, gs, gs);
  if (o.hit > 0) { g.globalAlpha = 0.5; g.drawImage(BR, p.x - w / 2, by, w, h); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

const MUZ = { rifle: ['y', 0.5], smg: ['y', 0.4], shotgun: ['o', 0.75], rocket: ['o', 0.95], laser: ['c', 0.6] };
function drawCrowd(g, G, t) {
  const S = G.sold;
  if (!S.length) return;
  const cr = crowdR();
  const pc = P(G.px, 0, 0);
  drawShadow(g, pc.x, pc.y + cr.rz * 0.1 * pc.s, cr.rx * 2.6 * pc.s);
  // 從後面畫到前面
  const order = R.order || (R.order = []);
  order.length = 0;
  for (let i = 0; i < S.length; i++) order.push(i);
  order.sort((a, b) => S[b].z - S[a].z);
  const walking = G.scroll && G.st === 'play';
  const mz = MUZ[G.wid];
  // 兵種士兵站在隊伍裡（第 1 號以後的位置），頭上有小標記
  const specAt = R.specAt || (R.specAt = []);
  specAt.length = 0;
  if (G.spec) { let slot = 1; for (const k of SPEC_ORDER) for (let n = 0; n < (G.spec[k] || 0) && slot < S.length; n++) specAt[slot++] = k; }
  const SV = (ART.soldierW && ART.soldierW[G.wid]) || ART.soldierV, SI = (ART.soldierIdleW && ART.soldierIdleW[G.wid]) || ART.soldierIdle;
  for (const i of order) {
    const so = S[i];
    const p = P(G.px + so.x, so.z, 0);
    const k = 1 + so.pop * 0.6;
    const v = i % 5 === 1 ? 1 : i % 7 === 3 ? 2 : 0;
    const spr = walking ? SV[v][Math.floor(so.ph / (Math.PI / 2)) & 3] : SI[v];
    const h = (spr.wh || 1.02) * p.s * k, w = h * spr.width / spr.height;
    drawShadow(g, p.x, p.y, 0.62 * p.s * k);
    g.drawImage(spr, p.x - w / 2, p.y - h * (1 - (spr.foot || 0)), w, h);
    if (specAt[i]) drawSpecBadge(g, specAt[i], p.x, p.y - h * (1 - (spr.foot || 0)) - 0.05 * p.s, 0.34 * p.s);
    if (so.fl > 0) {
      const m = P(G.px + so.x + 0.075, so.z + 0.05, 0.98 * k);
      const s = mz[1] * m.s * (0.8 + Math.random() * 0.4);
      g.globalCompositeOperation = 'lighter';
      g.drawImage(ART.flash[mz[0]], m.x - s / 2, m.y - s * 0.7, s, s);
      g.globalCompositeOperation = 'source-over';
    }
  }
  drawShieldBubble(g, G, t);
  // 人數牌
  if (G.demo) return;
  const top = P(G.px, cr.rz, 1.3);
  const u = R.u * R.dpr;
  const txt = String(G.N);
  const fs = 22 * u;
  g.font = `900 ${fs}px "Noto Sans TC",system-ui,sans-serif`;
  const tw = g.measureText(txt).width;
  const bw = tw + 40 * u, bh = 32 * u;
  const bounce = (G.badgeBump || 0) * 6 * u;
  const bx = top.x - bw / 2, by = top.y - bh - 10 * u - bounce;
  const hurtC = G.badgeRed > 0;
  const c0 = hurtC ? '#ff5a5a' : '#3f9bff', c1 = hurtC ? '#b8141e' : '#1450b8';
  g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, bx, by + 3 * u, bw, bh, bh / 2); g.fill();
  g.fillStyle = lin(g, 0, by, 0, by + bh, [c0, c1]);
  rr(g, bx, by, bw, bh, bh / 2); g.fill();
  g.lineWidth = 2.5 * u; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke();
  g.fillStyle = '#fff'; ell(g, bx + 15 * u, by + bh * 0.36, 5 * u, 5 * u); g.fill();
  rr(g, bx + 9 * u, by + bh * 0.52, 12 * u, 10 * u, 4 * u); g.fill();
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  g.fillText(txt, bx + 27 * u, by + bh / 2 + 1 * u);
  g.beginPath(); g.moveTo(top.x - 6 * u, by + bh - 1); g.lineTo(top.x, by + bh + 7 * u); g.lineTo(top.x + 6 * u, by + bh - 1); g.fillStyle = c1; g.fill();
}

function drawBullets(g, G) {
  g.lineCap = 'round';
  const glows = [];
  for (const b of G.bullets) {
    const w = WEAPONS[b.wid];
    const a = P(b.x, b.z, 1.0);
    if (a.y < 0) continue;
    const L = b.wid === 'laser' ? 2.6 : w.len;
    const c = P(b.x - b.vx / BULLET_V * L, b.z - b.vz / BULLET_V * L, 1.0);
    if (b.wid === 'rocket') {
      g.strokeStyle = '#4a4f5a'; g.lineWidth = Math.max(2.5, 0.16 * a.s);
      const m = P(b.x - b.vx / BULLET_V * 0.5, b.z - b.vz / BULLET_V * 0.5, 1.0);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(m.x, m.y); g.stroke();
      g.fillStyle = '#e8453c'; ell(g, a.x, a.y, Math.max(1.5, 0.08 * a.s), Math.max(1.5, 0.08 * a.s)); g.fill();
      glows.push(['rocket', m.x, m.y, 0.8 * m.s]);
      continue;
    }
    if (b.wid === 'laser') {
      g.strokeStyle = 'rgba(125,249,255,.35)'; g.lineWidth = Math.max(4, 0.32 * a.s);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
      g.strokeStyle = '#eaffff'; g.lineWidth = Math.max(1.5, 0.08 * a.s);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
      glows.push(['laser', a.x, a.y, 0.55 * a.s]);
      continue;
    }
    g.strokeStyle = w.col; g.globalAlpha = 0.85;
    g.lineWidth = Math.max(1.4, (b.wid === 'shotgun' ? 0.07 : 0.085) * a.s);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
    g.globalAlpha = 1;
    glows.push([b.wid, a.x, a.y, (b.wid === 'shotgun' ? 0.34 : 0.42) * a.s]);
  }
  g.globalCompositeOperation = 'lighter';
  for (const [k, x, y, s0] of glows) { const s = Math.max(6, s0); g.drawImage(ART.glow[k], x - s / 2, y - s / 2, s, s); }
  g.globalCompositeOperation = 'source-over';
}
function drawParts(g, G) {
  for (const p of G.parts) {
    const q = P(p.x, p.z, p.h);
    const k = 1 - p.t / p.life;
    if (p.brick) {
      const s = Math.max(2, p.sz * 0.12 * q.s);
      g.save(); g.translate(q.x, q.y); g.rotate(p.t * 9 + p.vx);
      g.fillStyle = p.col; g.fillRect(-s, -s * 0.55, s * 2, s * 1.1); g.restore();
      continue;
    }
    if (p.shell) {
      const s = Math.max(1.5, p.sz * 0.09 * q.s);
      g.save(); g.translate(q.x, q.y); g.rotate(p.t * 25);
      g.fillStyle = p.col; g.fillRect(-s, -s * 0.45, s * 2, s * 0.9); g.restore();
      continue;
    }
    if (p.streak) {
      const e = P(p.x - p.vx * 0.03, p.z - p.vz * 0.03, p.h - p.vh * 0.03);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = k;
      g.strokeStyle = p.col; g.lineWidth = Math.max(1, 0.05 * q.s);
      g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(e.x, e.y); g.stroke();
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      continue;
    }
    const r = Math.max(1, p.sz * 0.09 * q.s * (p.spark ? 1.6 : k));
    if (p.spark) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = k; }
    g.fillStyle = p.col;
    ell(g, q.x, q.y, r, r); g.fill();
    if (p.spark) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
  }
}

// ---------- 特效 ----------
function drawRing(g, e) {
  const q = e.t / e.life, r = e.size * (0.25 + q * 0.75);
  const a = P(e.x, e.z - r, 0), b = P(e.x, e.z + r, 0), m = P(e.x, e.z, 0);
  const rx = r * m.s, ry = Math.max(2, (a.y - b.y) / 2);
  g.strokeStyle = `rgba(${e.col},${(1 - q) * 0.9})`; g.lineWidth = Math.max(2, 0.22 * m.s * (1 - q * 0.6));
  g.beginPath(); g.ellipse(m.x, (a.y + b.y) / 2, rx, ry, 0, 0, Math.PI * 2); g.stroke();
}
function drawFxItem(g, e) {
  const p = P(e.x, e.z, e.h || 0);
  if (e.k === 'spark') {
    const q = e.t / e.life, s = e.size * p.s * (1 - q * 0.4);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - q * 0.5;
    g.save(); g.translate(p.x, p.y); g.rotate(e.rot); g.drawImage(ART.flash[e.fl], -s / 2, -s / 2, s, s); g.restore();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  } else if (e.k === 'die') {
    const A = ART[e.e]; if (!A) return;
    const q = e.t / e.life, fi = Math.floor(e.ph / (Math.PI / 2)) & 3;
    const spr = q < 0.5 ? A.fl[fi] : A.fr[fi];
    const h = e.h * 1.12 * p.s * (1 - q * 0.55), w = e.h * 1.12 * p.s * spr.width / spr.height * (1 + q * 0.45);
    g.globalAlpha = 1 - q;
    g.drawImage(spr, p.x - w / 2, p.y - h, w, h);
    g.globalAlpha = 1;
  } else if (e.k === 'puff') {
    const t = e.t - (e.dl || 0); if (t < 0) return;
    const q = t / e.life, s = e.size * p.s * (1 + q * (e.grow - 1));
    if (e.add) g.globalCompositeOperation = 'lighter';
    g.globalAlpha = e.a * (1 - q);
    g.drawImage(ART[e.spr], p.x - s / 2, p.y - s / 2, s, s);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  } else if (e.k === 'flash') {
    const q = e.t / e.life, s = e.size * p.s * (1 + q * 0.4);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - q;
    g.drawImage(ART.glowW, p.x - s / 2, p.y - s / 2, s, s);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  } else if (e.k === 'coin') {
    const q = e.t / e.life, s = 0.42 * p.s, sx = Math.max(0.15, Math.abs(Math.cos(e.t * 14)));
    g.globalAlpha = q > 0.7 ? (1 - q) / 0.3 : 1;
    g.drawImage(ART.coin, p.x - s * sx / 2, p.y - s / 2, s * sx, s);
    g.globalAlpha = 1;
  } else if (e.k === 'ripple') {
    const q = e.t / e.life, r = (0.15 + q * e.size) * p.s;
    g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - q)})`; g.lineWidth = Math.max(1.5, 0.06 * p.s);
    g.beginPath(); g.ellipse(p.x, p.y, r, r * 0.8, 0, 0, Math.PI * 2); g.stroke();
  }
}

function drawFloats(g, G) {
  const u = R.u * R.dpr;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (const f of G.floats) {
    const q = P(f.x, f.z, f.h);
    const a = f.t < 0.15 ? f.t / 0.15 : 1 - Math.max(0, f.t - 0.6) / 0.5;
    const pop = f.t < 0.15 ? 0.6 + f.t / 0.15 * 0.5 : 1.1 - Math.min(0.1, (f.t - 0.15));
    const fs = 26 * u * f.big * pop;
    g.globalAlpha = clamp(a, 0, 1);
    g.font = `900 ${fs}px "Noto Sans TC",system-ui,sans-serif`;
    g.lineWidth = fs * 0.2; g.strokeStyle = 'rgba(0,0,0,.7)';
    g.strokeText(f.text, q.x, q.y);
    g.fillStyle = f.col; g.fillText(f.text, q.x, q.y);
  }
  g.globalAlpha = 1;
}

// ---------- HUD ----------
function drawHud(G) {
  const g = R.g, u = R.u * R.dpr;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const top = (R.safeTop || 0) * R.dpr + 10 * u;
  // 武器
  const w = WEAPONS[G.wid];
  const bx = 10 * u, bh = 40 * u;
  g.font = `900 ${15 * u}px "Noto Sans TC",system-ui,sans-serif`;
  const nameW = g.measureText(w.name).width;
  const bw = 52 * u + Math.max(nameW, 5 * 9 * u) + 12 * u;
  g.fillStyle = 'rgba(10,14,24,.62)'; rr(g, bx, top, bw, bh, 12 * u); g.fill();
  drawWeaponIcon(g, G.wid, bx + 25 * u, top + bh / 2, 17 * u, '#ffd34d', 'rgba(0,0,0,.7)');
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(w.name, bx + 50 * u, top + bh * 0.37);
  for (let i = 0; i < LV_MAX; i++) { g.fillStyle = i < G.lv ? '#33d17a' : 'rgba(255,255,255,.22)'; rr(g, bx + 50 * u + i * 9 * u, top + bh * 0.68, 7 * u, 5 * u, 2 * u); g.fill(); }
  drawSupportHud(G, bx + bw + 6 * u, top, u);
  // 第二列：進度或頭目血條
  const cx = R.W / 2;
  const BW = Math.min(R.W - 24 * u, 330 * u);
  const by = top + bh + 10 * u;
  if (G.boss && !G.boss.dead && G.boss.intro <= 0) {
    const b = G.boss;
    g.fillStyle = 'rgba(10,10,20,.72)'; rr(g, cx - BW / 2, by, BW, 26 * u, 9 * u); g.fill();
    const k = clamp(b.hp / b.max, 0, 1);
    g.fillStyle = lin(g, cx - BW / 2, 0, cx + BW / 2, 0, b.phase > 1 ? ['#ff2b4b', '#ff7a3a'] : ['#c93cff', '#ff4f7a']);
    if (k > 0) { rr(g, cx - BW / 2 + 3 * u, by + 3 * u, Math.max(6 * u, (BW - 6 * u) * k), 20 * u, 7 * u); g.fill(); }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `900 ${13 * u}px "Noto Sans TC",system-ui,sans-serif`;
    g.fillText(BOSSES[b.k].name + (b.phase > 1 ? '・狂暴' : ''), cx, by + 13.5 * u);
  } else if (!G.boss) {
    const k = chained() ? clamp((G.dist - G.legStart) / (G.L.len - G.legStart), 0, 1) : clamp(G.dist / G.L.len, 0, 1);
    const label = G.mode === 'endless' ? `無盡 · 第 ${G.leg + 1} 段 · ${Math.floor(G.dist)} 公尺` : G.mode === 'boss' ? `頭目連戰 · 第 ${G.leg + 1} / ${BR_BOSSES.length} 戰` : G.mode === 'daily' ? `每日挑戰 · ${RULES[G.rule].name}` : `第 ${G.s} 關 · ${G.L.name}`;
    g.textAlign = 'center'; g.font = `900 ${13 * u}px "Noto Sans TC",system-ui,sans-serif`;
    g.lineJoin = 'round'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 4 * u; g.strokeText(label, cx, by + 6 * u);
    g.fillStyle = '#fff'; g.fillText(label, cx, by + 6 * u);
    const pw = Math.min(BW, 240 * u), py = by + 17 * u;
    g.fillStyle = 'rgba(10,14,24,.55)'; rr(g, cx - pw / 2, py, pw, 10 * u, 5 * u); g.fill();
    if (k > 0) { g.fillStyle = '#ffd34d'; rr(g, cx - pw / 2 + 2 * u, py + 2 * u, Math.max(6 * u, (pw - 4 * u) * k), 6 * u, 3 * u); g.fill(); }
    g.fillStyle = '#ff4f6a'; ell(g, cx + pw / 2, py + 5 * u, 9 * u, 9 * u); g.fill();
    g.fillStyle = '#fff'; g.font = `900 ${11 * u}px system-ui,sans-serif`; g.fillText('!', cx + pw / 2, py + 5.5 * u);
  }
}

// 頭目登場
function drawBossBanner(t) {
  const g = R.g, u = R.u * R.dpr;
  if (t <= 0) return;
  const a = t > 1.8 ? (2.2 - t) / 0.4 : t < 0.4 ? t / 0.4 : 1;
  g.save(); g.globalAlpha = clamp(a, 0, 1);
  const y = R.H * 0.36, h = 74 * u;
  g.fillStyle = 'rgba(120,0,20,.75)'; g.fillRect(0, y - h / 2, R.W, h);
  g.fillStyle = 'rgba(255,220,80,.9)'; g.fillRect(0, y - h / 2, R.W, 3 * u); g.fillRect(0, y + h / 2 - 3 * u, R.W, 3 * u);
  g.fillStyle = '#ffe14f'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${14 * u}px "Silkscreen",ui-monospace,monospace`; g.fillText('WARNING · BOSS', R.W / 2, y - 18 * u);
  g.fillStyle = '#fff'; g.font = `900 ${30 * u}px "Noto Sans TC",system-ui,sans-serif`; g.fillText(BOSSES[G.boss.k].name, R.W / 2, y + 12 * u);
  g.restore();
}
