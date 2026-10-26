// 千軍突圍 — 繪圖（透視跑道、物件、頭目、HUD）
'use strict';

const R = { cv: null, g: null, W: 0, H: 0, dpr: 1, q: 1, bg: null, bgKey: '', vig: null };
const Z0 = 7.5;

function resizeRender() {
  const cv = R.cv;
  const cw = cv.clientWidth || innerWidth, ch = cv.clientHeight || innerHeight;
  R.dpr = Math.min(2, window.devicePixelRatio || 1) * R.q;
  R.W = Math.round(cw * R.dpr); R.H = Math.round(ch * R.dpr);
  cv.width = R.W; cv.height = R.H;
  R.cssW = cw; R.cssH = ch;
  const port = R.H > R.W * 1.05;
  R.hy = R.H * (port ? 0.15 : 0.12);
  R.y0 = R.H * (port ? 0.8 : 0.83);
  const Wp = Math.min(R.W, R.H * (port ? 0.64 : 0.95));
  R.k0 = 0.46 * Wp / ROAD;
  R.F = R.k0 * Z0;
  R.camH = (R.y0 - R.hy) / R.k0;
  R.cx = R.W / 2;
  R.u = Math.min(cw, ch * 0.75, 520) / 400; // HUD 單位（CSS 像素）
  R.bgKey = '';
  R.vig = null;
}

// 世界 → 螢幕
function P(x, z, h) {
  let d = z + Z0; if (d < 0.5) d = 0.5;
  const sc = R.F / d;
  return { x: R.cx + (x - R.camX) * sc, y: R.hy + (R.camH - (h || 0)) * sc, s: sc };
}
function zAtY(y) { return R.camH * R.F / Math.max(1, y - R.hy) - Z0; }

function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return n >>> 0; }

// ---------- 天空與遠景（快取） ----------
function buildBg(th) {
  const W = R.W, H = Math.ceil(R.hy + 4);
  const pad = Math.round(W * 0.1);
  const c = mkCanvas(W + pad * 2, H);
  const g = c.getContext('2d');
  const CW = c.width;
  g.fillStyle = lin(g, 0, 0, 0, H, th.sky); g.fillRect(0, 0, CW, H);
  const hy = H - 4;
  const r = rng(th.id.length * 97 + 7);
  if (th.id === 'night') {
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

function drawGround(g, th, dist) {
  const zFar = ZSPAWN + 8, zNear = Math.max(-Z0 + 0.6, zAtY(R.H + 4));
  const yFar = P(0, zFar, 0).y;
  g.fillStyle = th.side[0]; g.fillRect(0, R.hy, R.W, R.H - R.hy);
  // 路邊條紋
  const SB = 5;
  g.fillStyle = th.side[1];
  for (let z = Math.floor((zNear + dist) / SB) * SB - dist; z < zFar; z += SB) {
    if ((Math.floor((z + dist) / SB + 0.001) & 1) === 0) continue;
    const z1 = Math.max(z, zNear), z2 = Math.min(z + SB, zFar); if (z2 <= z1) continue;
    const a = P(0, z1, 0), b = P(0, z2, 0);
    g.fillRect(0, b.y, R.W, a.y - b.y + 1);
  }
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
  // 地平線霧
  const fg = g.createLinearGradient(0, R.hy - 2, 0, R.hy + R.H * 0.12);
  fg.addColorStop(0, th.fog + '0.55)'); fg.addColorStop(1, th.fog + '0)');
  g.fillStyle = fg; g.fillRect(0, R.hy - 2, R.W, R.H * 0.12 + 2);
}

// ---------- 門 ----------
const GATE_COL = { good: ['#2f9bff', '#7fd0ff', '#0b4fae'], bad: ['#ff3b4f', '#ff9aa4', '#9b0f22'], wpn: ['#ffb020', '#ffe08a', '#a86400'], lv: ['#2fd07a', '#a6f5c8', '#0d7a40'] };
function gateLook(o) {
  if (o.k === 'wpn') return 'wpn';
  if (o.k === 'lv') return 'lv';
  if (o.k === 'mul') return 'good';
  if (o.k === 'div') return 'bad';
  return o.v >= 0 ? 'good' : 'bad';
}
function gateText(o) {
  if (o.k === 'add') return (o.v >= 0 ? '+' : '−') + Math.abs(o.v);
  if (o.k === 'mul') return '×' + o.v;
  if (o.k === 'div') return '÷' + o.v;
  if (o.k === 'wpn') return WEAPONS[o.v].name;
  if (o.k === 'lv') return '火力 +1';
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
  g.save();
  g.globalAlpha = al;
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
  const isWord = o.k === 'wpn' || o.k === 'lv';
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
  if (o.k === 'lv') { // 往上箭頭
    const cx = A.x + w / 2, cy = B.y + h * 0.3, s = h * 0.16;
    g.fillStyle = '#fff'; g.strokeStyle = look[2]; g.lineWidth = s * 0.25;
    g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s, cy); g.lineTo(cx + s * 0.4, cy); g.lineTo(cx + s * 0.4, cy + s); g.lineTo(cx - s * 0.4, cy + s); g.lineTo(cx - s * 0.4, cy); g.lineTo(cx - s, cy); g.closePath(); g.stroke(); g.fill();
  }
  g.restore();
  g.globalAlpha = al;
  drawPost(g, o.x - o.w, o.z, H + 0.15);
  drawPost(g, o.x + o.w, o.z, H + 0.15);
  g.globalAlpha = 1;
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
  // 影子
  g.fillStyle = 'rgba(0,0,0,.28)'; ell(g, p.x, p.y, b.r * 1.15 * s, b.r * 0.35 * s); g.fill();
  g.save();
  g.translate(p.x + jit, p.y);
  g.scale(s, s);
  const sc = b.h / BOSSES[b.k].h;
  g.scale(sc, sc);
  let ap = 0; // 攻擊動作 0..1..0
  if (b.atk > 0) { const q = 1 - b.atk / 0.35; ap = q < 0.45 ? q / 0.45 : 1 - (q - 0.45) / 0.55; }
  const raise = b.atk > 0 && (1 - b.atk / 0.35) < 0.45;
  const bob = Math.sin(b.ph * 2) * 0.06;
  const rage = b.phase > 1;
  const intro = b.intro > 0 ? clamp(1 - b.intro / 2.2, 0, 1) : 1;
  if (intro < 1) g.globalAlpha = Math.min(1, intro * 1.6);
  const fn = BOSS_DRAW[b.k];
  fn(g, { ap, raise, bob, rage, t, ph: b.ph, dead: b.dead });
  g.restore();
}
const BOSS_DRAW = {
  golem(g, a) {
    const rock = (x, y, w, h, c0, c1) => { g.fillStyle = radial(g, x, y, Math.max(w, h) / 2, c0, c1); rr(g, x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.3); g.fill(); };
    // 腿
    rock(-0.65, -0.55 + Math.max(0, a.bob), 0.9, 1.1, '#a39a8d', '#5a524a');
    rock(0.65, -0.55 + Math.max(0, -a.bob), 0.9, 1.1, '#a39a8d', '#5a524a');
    // 手臂
    const armY = a.raise ? -4.0 - a.ap * 0.4 : -2.1 + a.ap * 0.9;
    for (const sd of [-1, 1]) {
      rock(sd * 1.75, -3.0, 0.8, 0.8, '#b5ab9c', '#655c52');
      rock(sd * (1.85 - (a.raise ? 0.3 : 0)), armY + a.bob, 1.15, 1.3, '#b5ab9c', '#5f564c');
    }
    // 身體
    rock(0, -2.25 + a.bob, 2.8, 2.3, '#c2b8a8', '#5f574d');
    g.fillStyle = 'rgba(90,160,70,.7)'; ell(g, -0.7, -3.2 + a.bob, 0.55, 0.22); g.fill(); ell(g, 0.9, -1.6 + a.bob, 0.35, 0.15); g.fill();
    // 裂縫發光
    g.strokeStyle = a.rage ? '#ff5a2a' : '#ffa53a'; g.lineWidth = 0.09; g.lineCap = 'round';
    g.shadowColor = g.strokeStyle; g.shadowBlur = 0;
    g.beginPath(); g.moveTo(-0.3, -1.4 + a.bob); g.lineTo(-0.05, -2.0 + a.bob); g.lineTo(-0.35, -2.5 + a.bob); g.lineTo(0.1, -3.0 + a.bob);
    g.moveTo(0.6, -1.5 + a.bob); g.lineTo(0.85, -2.1 + a.bob); g.stroke();
    // 頭
    rock(0, -3.85 + a.bob, 1.5, 1.05, '#cfc6b6', '#6b6257');
    const eg = a.rage ? '#ff3b1f' : '#ffb13a';
    g.fillStyle = radial(g, 0, -3.85 + a.bob, 0.7, eg, 'rgba(255,120,30,0)', 0, 0); ell(g, 0, -3.85 + a.bob, 0.75, 0.45); g.fill();
    g.fillStyle = '#fff3c4'; ell(g, -0.32, -3.88 + a.bob, 0.14, 0.1); g.fill(); ell(g, 0.32, -3.88 + a.bob, 0.14, 0.1); g.fill();
  },
  scorpion(g, a) {
    const body = '#d9a441', dark = '#8a5a1f';
    // 腳
    g.strokeStyle = dark; g.lineWidth = 0.13; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
      const kx = sd * (1.0 + i * 0.35), lift = Math.sin(a.ph * 3 + i + (sd > 0 ? 1 : 0)) * 0.1;
      g.beginPath(); g.moveTo(sd * 0.7, -0.9); g.lineTo(kx + sd * 0.4, -1.35 + lift); g.lineTo(kx + sd * 0.8, 0); g.stroke();
    }
    // 尾巴（攻擊時往前刺）
    const segs = 6;
    let px = 0, py = -1.4;
    const curl = a.raise ? 0.25 : a.ap > 0 ? -0.6 * a.ap : 0;
    for (let i = 0; i < segs; i++) {
      const ang = -Math.PI / 2 + i * (0.42 + curl * 0.15) + Math.sin(a.ph + i) * 0.04;
      const nx = px + Math.cos(ang) * 0.5 * 0.2, ny = py + Math.sin(ang) * 0.5;
      const r = 0.36 - i * 0.03;
      g.fillStyle = radial(g, nx, ny, r, '#f3c86a', dark); ell(g, nx, ny, r, r * 0.85); g.fill();
      px = nx; py = ny;
    }
    g.fillStyle = a.rage ? '#ff3b3b' : '#6a1f8f';
    g.beginPath(); g.moveTo(px - 0.18, py - 0.05); g.lineTo(px, py + 0.55 + a.ap * 0.5); g.lineTo(px + 0.18, py - 0.05); g.fill();
    // 身體
    g.fillStyle = radial(g, 0, -0.95, 1.6, '#f6cc72', '#9a6526');
    ell(g, 0, -0.95 + a.bob * 0.5, 1.55, 0.72); g.fill();
    g.strokeStyle = 'rgba(90,50,10,.5)'; g.lineWidth = 0.06;
    for (const y of [-0.7, -1.0, -1.25]) { g.beginPath(); g.ellipse(0, y + a.bob * 0.5, 1.3, 0.35, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
    // 鉗子
    for (const sd of [-1, 1]) {
      const cx = sd * (1.85 + (a.raise ? 0.2 : 0)), cy = -1.1 - (a.raise ? 0.5 : 0) + a.ap * 0.3;
      g.strokeStyle = dark; g.lineWidth = 0.22; g.beginPath(); g.moveTo(sd * 1.1, -0.9); g.lineTo(cx, cy + 0.25); g.stroke();
      g.fillStyle = radial(g, cx, cy, 0.5, '#f3c86a', '#9a6526');
      g.beginPath(); g.ellipse(cx, cy, 0.45, 0.32, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = body;
      g.beginPath(); g.moveTo(cx - 0.2 * sd, cy - 0.2); g.lineTo(cx + sd * 0.15, cy - 0.75); g.lineTo(cx + sd * 0.35, cy - 0.2); g.fill();
      g.beginPath(); g.moveTo(cx + sd * 0.1, cy - 0.15); g.lineTo(cx + sd * 0.55, cy - 0.55); g.lineTo(cx + sd * 0.45, cy); g.fill();
    }
    // 眼
    for (const sd of [-1, 1]) { g.fillStyle = a.rage ? '#ff2b2b' : '#2a0f05'; ell(g, sd * 0.32, -1.32 + a.bob * 0.5, 0.15, 0.13); g.fill(); g.fillStyle = '#fff'; ell(g, sd * 0.32 - 0.04, -1.36 + a.bob * 0.5, 0.05, 0.05); g.fill(); }
  },
  yeti(g, a) {
    const fur = (x, y, rx, ry) => { g.fillStyle = radial(g, x, y, Math.max(rx, ry), '#ffffff', '#9fb4cc'); ell(g, x, y, rx, ry); g.fill(); };
    fur(-0.6, -0.45 + Math.max(0, a.bob), 0.5, 0.5); fur(0.6, -0.45 + Math.max(0, -a.bob), 0.5, 0.5);
    const armY = a.raise ? -4.6 : -1.6 + a.ap * 0.8;
    for (const sd of [-1, 1]) {
      g.strokeStyle = '#d7e3f0'; g.lineWidth = 0.75; g.lineCap = 'round';
      g.beginPath(); g.moveTo(sd * 1.2, -3.1 + a.bob); g.lineTo(sd * (1.6 - (a.raise ? 0.3 : 0)), armY + a.bob); g.stroke();
      g.fillStyle = '#6f9fd0'; ell(g, sd * (1.6 - (a.raise ? 0.3 : 0)), armY + a.bob - (a.raise ? 0.1 : -0.2), 0.42, 0.38); g.fill();
    }
    fur(0, -2.25 + a.bob, 1.45, 1.75);
    // 毛邊
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) { const ang = Math.PI * (0.1 + i * 0.1); g.beginPath(); const x = Math.cos(ang) * 1.45, y = -2.25 + a.bob - Math.sin(ang) * 1.75; g.moveTo(x - 0.18, y); g.lineTo(x * 1.12, y - 0.25); g.lineTo(x + 0.18, y); g.fill(); }
    // 臉
    g.fillStyle = radial(g, 0, -3.15 + a.bob, 0.8, '#9cc8f0', '#4a7fb5'); ell(g, 0, -3.15 + a.bob, 0.78, 0.62); g.fill();
    // 角
    g.fillStyle = '#e9e1c8';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 0.7, -3.9 + a.bob); g.quadraticCurveTo(sd * 1.4, -4.4 + a.bob, sd * 1.1, -4.9 + a.bob); g.quadraticCurveTo(sd * 1.05, -4.35 + a.bob, sd * 0.45, -4.0 + a.bob); g.fill(); }
    const ec = a.rage ? '#ff3030' : '#1b2a4a';
    for (const sd of [-1, 1]) { g.fillStyle = '#fff'; ell(g, sd * 0.3, -3.3 + a.bob, 0.17, 0.15); g.fill(); g.fillStyle = ec; ell(g, sd * 0.3, -3.27 + a.bob, 0.09, 0.09); g.fill(); }
    g.fillStyle = '#1b2a4a'; g.beginPath(); g.ellipse(0, -2.9 + a.bob, 0.38, 0.2 + a.ap * 0.12, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-0.25, -2.9 + a.bob); g.lineTo(-0.17, -2.72 + a.bob); g.lineTo(-0.09, -2.9 + a.bob); g.fill(); g.beginPath(); g.moveTo(0.25, -2.9 + a.bob); g.lineTo(0.17, -2.72 + a.bob); g.lineTo(0.09, -2.9 + a.bob); g.fill();
  },
  mech(g, a) {
    const metal = (x, y, w, h, r) => { g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, ['#5a6377', '#c9d2e3', '#7a8499', '#3e4556']); rr(g, x - w / 2, y - h / 2, w, h, r || 0.12); g.fill(); };
    // 腿
    for (const sd of [-1, 1]) { const l = sd > 0 ? Math.max(0, -a.bob) : Math.max(0, a.bob); metal(sd * 0.7, -0.9 + l, 0.5, 1.3); metal(sd * 0.75, -0.18 + l, 0.9, 0.36, 0.08); }
    // 手臂砲
    const armY = a.raise ? -4.2 : -2.0 + a.ap * 0.9;
    for (const sd of [-1, 1]) {
      metal(sd * 1.85, -3.4 + a.bob, 1.05, 0.8, 0.25);
      metal(sd * (1.9 - (a.raise ? 0.2 : 0)), armY + a.bob, 0.7, 1.6, 0.15);
      g.fillStyle = '#20242e'; ell(g, sd * (1.9 - (a.raise ? 0.2 : 0)), armY + a.bob + 0.75, 0.24, 0.12); g.fill();
    }
    // 身體
    metal(0, -2.55 + a.bob, 2.6, 2.1, 0.3);
    g.fillStyle = '#2b3140'; rr(g, -0.9, -3.3 + a.bob, 1.8, 0.35, 0.1); g.fill();
    const core = a.rage ? '#ff3b4f' : '#3ff2ff';
    g.fillStyle = radial(g, 0, -2.4 + a.bob, 0.7, '#ffffff', core, 0, 0); ell(g, 0, -2.4 + a.bob, 0.42 + Math.sin(a.t * 6) * 0.04, 0.42 + Math.sin(a.t * 6) * 0.04); g.fill();
    g.strokeStyle = core; g.lineWidth = 0.07; ell(g, 0, -2.4 + a.bob, 0.62, 0.62); g.stroke();
    // 頭
    metal(0, -4.05 + a.bob, 1.15, 0.8, 0.25);
    g.fillStyle = a.rage ? '#ff2b2b' : '#ff5a3a'; rr(g, -0.42, -4.15 + a.bob, 0.84, 0.18, 0.08); g.fill();
    g.strokeStyle = '#9aa3b5'; g.lineWidth = 0.06; g.beginPath(); g.moveTo(0.35, -4.45 + a.bob); g.lineTo(0.5, -4.95 + a.bob); g.stroke();
    g.fillStyle = core; ell(g, 0.5, -4.98 + a.bob, 0.07, 0.07); g.fill();
  },
};

// ---------- 主畫面 ----------
function render(G, t) {
  const g = R.g, th = G.L.theme;
  // 鏡頭稍微跟隨部隊
  R.camX = G.px * 0.35;
  if (R.bgKey !== th.id + R.W + 'x' + R.H) { R.bg = buildBg(th); R.bgKey = th.id + R.W + 'x' + R.H; }
  if (!R.vig) R.vig = vignette();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const sh = G.shake * 9 * R.dpr * R.q;
  const sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0;
  g.translate(sx, sy);
  // 天空
  g.drawImage(R.bg, -R.bgPad - R.camX * 2 * R.dpr, 0);
  drawGround(g, th, G.dist);

  // 收集要畫的東西
  const items = [];
  const SP = 4.2;
  const k0 = Math.floor((G.dist - 10) / SP), k1 = Math.floor((G.dist + ZSPAWN + 8) / SP);
  for (let k = k0; k <= k1; k++) for (const side of [-1, 1]) {
    const h = hash(k * 2 + (side > 0 ? 1 : 0) + th.id.length * 1000);
    if (h % 10 < 3) continue;
    const kind = th.decor[(h >>> 4) % th.decor.length];
    const far = kind === 'building' || kind === 'mesa' || kind === 'windmill';
    const x = side * (ROAD + (far ? 5.5 : 1.4) + ((h >>> 9) % 70) / 10);
    const z = k * SP - G.dist + ((h >>> 3) % 20) / 10;
    if (z < -Z0 + 1 || z > ZSPAWN + 6) continue;
    items.push({ z, d: 0, kind, x, v: (h >>> 12) % 3, sc: 0.8 + ((h >>> 15) % 50) / 100 });
  }
  for (const o of G.objs) items.push({ z: o.z, o });
  items.push({ z: 0.001, crowd: 1 });
  items.sort((a, b) => b.z - a.z);
  const night = th.dark;
  for (const it of items) {
    if (it.kind) drawDecor(g, it);
    else if (it.crowd) drawCrowd(g, G, t);
    else {
      const o = it.o;
      if (o.t === 'gate') drawGate(g, o, t);
      else if (o.t === 'en') drawEnemy(g, o);
      else if (o.t === 'bar') drawBarrelObj(g, o);
      else if (o.t === 'boss') drawBoss(g, o, t);
    }
  }
  drawBullets(g, G);
  drawParts(g, G);
  drawFloats(g, G);
  if (night) { g.fillStyle = 'rgba(30,10,60,.12)'; g.fillRect(-20, -20, R.W + 40, R.H + 40); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(R.vig, 0, 0);
  if (G.flash > 0) { g.fillStyle = `rgba(255,60,60,${G.flash * 0.35})`; g.fillRect(0, 0, R.W, R.H); }
}

function drawDecor(g, it) {
  const spr = ART.decor[it.kind][it.v];
  const [ww, hh] = DECOR_SIZE[it.kind];
  const p = P(it.x, it.z, 0);
  const h = hh * it.sc * p.s, w = ww * it.sc * p.s;
  if (p.y - h > R.H || p.x + w < 0 || p.x - w > R.W) return;
  g.fillStyle = 'rgba(0,0,0,.16)'; ell(g, p.x, p.y, w * 0.38, w * 0.1); g.fill();
  g.drawImage(spr, p.x - w / 2, p.y - h, w, h);
}

function drawEnemy(g, o) {
  const A = ART[o.k];
  const fi = Math.floor(o.ph / Math.PI) & 1;
  const spr = o.hit > 0 ? A.fl[fi] : A.fr[fi];
  const p = P(o.x, o.z, 0);
  const h = o.h * p.s, w = h * spr.width / spr.height;
  if (p.y - h > R.H + 50) return;
  g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, p.x, p.y, o.r * p.s * 0.95, o.r * p.s * 0.3); g.fill();
  const bob = Math.abs(Math.sin(o.ph)) * 0.06 * p.s;
  g.drawImage(spr, p.x - w / 2, p.y - h - bob, w, h);
  if ((o.k === 'brute' || o.k === 'shield') && o.hp < o.max) {
    const bw = o.r * 1.6 * p.s, by = p.y - h - bob - 0.18 * p.s;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(p.x - bw / 2, by, bw, Math.max(3, 0.1 * p.s));
    g.fillStyle = '#ff5a4e'; g.fillRect(p.x - bw / 2, by, bw * clamp(o.hp / o.max, 0, 1), Math.max(3, 0.1 * p.s));
  }
}
function drawBarrelObj(g, o) {
  const p = P(o.x, o.z, 0);
  const h = 1.15 * p.s, w = h * ART.barrel.width / ART.barrel.height;
  g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, p.x, p.y, w * 0.45, w * 0.14); g.fill();
  g.drawImage(ART.barrel, p.x - w / 2, p.y - h, w, h);
  if (o.hit > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(ART.barrel, p.x - w / 2, p.y - h, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
}

function drawCrowd(g, G, t) {
  const S = G.sold;
  if (!S.length) return;
  const cr = crowdR();
  const pc = P(G.px, 0, 0);
  g.fillStyle = 'rgba(10,30,60,.28)'; ell(g, pc.x, pc.y, cr.rx * pc.s, cr.rz * pc.s * 0.6); g.fill();
  // 從後面畫到前面
  const order = R.order || (R.order = []);
  order.length = 0;
  for (let i = 0; i < S.length; i++) order.push(i);
  order.sort((a, b) => S[b].z - S[a].z);
  const walking = G.scroll && G.st === 'play';
  for (const i of order) {
    const so = S[i];
    const p = P(G.px + so.x, so.z, 0);
    const k = 1 + so.pop * 0.6;
    const h = 0.95 * p.s * k, w = h * 0.6;
    const f = walking ? 1 + (Math.floor(so.ph / Math.PI) & 1) : 0;
    const by = walking ? Math.abs(Math.sin(so.ph)) * 0.05 * p.s : 0;
    g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, p.x, p.y, w * 0.38, w * 0.12); g.fill();
    g.drawImage(ART.soldier[f], p.x - w / 2, p.y - h - by, w, h);
    if (so.fl > 0) {
      const m = P(G.px + so.x + 0.14, so.z + 0.25, 1.05);
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = radial(g, m.x, m.y, 0.22 * m.s, 'rgba(255,240,170,1)', 'rgba(255,170,40,0)', 0, 0);
      ell(g, m.x, m.y, 0.22 * m.s, 0.22 * m.s); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
  }
  // 人數牌
  if (G.demo) return;
  const top = P(G.px, cr.rz, 1.25);
  const u = R.u * R.dpr;
  const txt = String(G.N);
  const fs = 22 * u;
  g.font = `900 ${fs}px "Noto Sans TC",system-ui,sans-serif`;
  const tw = g.measureText(txt).width;
  const bw = tw + 40 * u, bh = 32 * u;
  const bounce = (G.badgeBump || 0) * 6 * u;
  const bx = top.x - bw / 2, by = top.y - bh - 10 * u - bounce;
  const hurtC = G.badgeRed > 0;
  g.fillStyle = hurtC ? 'rgba(220,40,50,.92)' : 'rgba(20,90,200,.92)';
  rr(g, bx, by, bw, bh, bh / 2); g.fill();
  g.lineWidth = 2.5 * u; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
  // 小士兵圖示
  g.fillStyle = '#fff'; ell(g, bx + 15 * u, by + bh * 0.36, 5 * u, 5 * u); g.fill();
  rr(g, bx + 9 * u, by + bh * 0.52, 12 * u, 10 * u, 4 * u); g.fill();
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  g.fillText(txt, bx + 27 * u, by + bh / 2 + 1 * u);
  g.beginPath(); g.moveTo(top.x - 6 * u, by + bh); g.lineTo(top.x, by + bh + 7 * u); g.lineTo(top.x + 6 * u, by + bh); g.fillStyle = hurtC ? 'rgba(220,40,50,.92)' : 'rgba(20,90,200,.92)'; g.fill();
}

function drawBullets(g, G) {
  const add = !!G.L.theme.dark;
  if (add) g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (const b of G.bullets) {
    const w = WEAPONS[b.wid];
    const a = P(b.x, b.z, 1.0), c = P(b.x - b.vx / BULLET_V * w.len, b.z - b.vz / BULLET_V * w.len, 1.0);
    if (b.wid === 'rocket') {
      g.fillStyle = '#ffd08a'; ell(g, a.x, a.y, 0.12 * a.s, 0.12 * a.s); g.fill();
      g.strokeStyle = 'rgba(255,130,40,.6)'; g.lineWidth = Math.max(2, 0.14 * a.s);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
      continue;
    }
    g.strokeStyle = w.col;
    g.lineWidth = Math.max(1.5, (b.wid === 'laser' ? 0.13 : 0.08) * a.s);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
    if (b.wid !== 'laser') { g.fillStyle = '#fffbe0'; ell(g, a.x, a.y, Math.max(1.2, 0.06 * a.s), Math.max(1.2, 0.06 * a.s)); g.fill(); }
  }
  g.globalCompositeOperation = 'source-over';
}
function drawParts(g, G) {
  for (const p of G.parts) {
    const q = P(p.x, p.z, p.h);
    const k = 1 - p.t / p.life;
    const r = Math.max(1, p.sz * 0.09 * q.s * (p.spark ? 1.6 : k));
    if (p.spark) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = k; }
    g.fillStyle = p.col;
    ell(g, q.x, q.y, r, r); g.fill();
    if (p.spark) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
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
    g.lineWidth = fs * 0.18; g.strokeStyle = 'rgba(0,0,0,.65)';
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
    const k = clamp(G.dist / G.L.len, 0, 1);
    const label = `第 ${G.s} 關 · ${G.L.name}`;
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
