// 燼燈 · 繪圖：背景、地形、角色、光影、介面
(() => {
'use strict';
const EM = window.EM;
const { T, TL } = EM;
const G = () => EM.G;

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const lcv = document.createElement('canvas'), lctx = lcv.getContext('2d');
let W = 0, H = 0, DPR = 1, S = 1, VW = 0, VH = 0;
const VIEW_H = 13 * T;
const FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif';
EM.FONT = FONT;
function resize() {
  W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  S = Math.min(H / VIEW_H, W / (15 * T));
  VW = W / S; VH = H / S;
  lcv.width = Math.ceil(cv.width / 2); lcv.height = Math.ceil(cv.height / 2);
}
addEventListener('resize', resize); resize();
EM.view = () => ({ VW, VH, S, W, H });

const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// ───────────── 攝影機 ─────────────
const cam = EM.cam = { x: 0, y: 0, room: -1 };
function camTarget() {
  const g = G(), P = g.P, R = g.W.rooms[g.roomIdx];
  let tx = P.x - VW / 2 + P.face * 40, ty = P.y - 20 - VH / 2;
  const rx = R.x * T, ry = R.y * T, rw = R.w * T, rh = R.h * T;
  tx = rw <= VW ? rx + (rw - VW) / 2 : Math.max(rx, Math.min(rx + rw - VW, tx));
  ty = rh <= VH ? ry + (rh - VH) / 2 : Math.max(ry, Math.min(ry + rh - VH, ty));
  return [tx, ty];
}
EM.snapCam = () => { [cam.x, cam.y] = camTarget(); cam.room = G().roomIdx; };
EM.stepCam = dt => {
  const [tx, ty] = camTarget();
  const g = G();
  const k = cam.room !== g.roomIdx ? 10 : 7;
  cam.x += (tx - cam.x) * Math.min(1, dt * k); cam.y += (ty - cam.y) * Math.min(1, dt * k);
  if (Math.abs(tx - cam.x) < 1 && Math.abs(ty - cam.y) < 1) cam.room = g.roomIdx;
};

// ───────────── 地形貼圖 ─────────────
const RES = 2, spr = new Map();
function solidForMask(c, r) { const t = EM.tileAt(c, r); return t === TL.ROCK || t === TL.BREAK || t === TL.SIGIL; }
function tileSprite(area, t, mask, v) {
  const key = `${area}|${t}|${mask}|${v}`;
  let c = spr.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = (T + 8) * RES; c.height = (T + 8) * RES;
  const g = c.getContext('2d'); g.scale(RES, RES); g.translate(4, 4);
  const A = EM.AREAS[area];
  const U = mask & 1, D = mask & 2, L = mask & 4, R = mask & 8;
  let seed = v * 977 + t * 131 + mask * 17 + area.charCodeAt(0);
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (t === TL.ROCK || t === TL.BREAK || t === TL.SIGIL) {
    g.fillStyle = A.rock; g.fillRect(L ? -2 : 0, U ? -2 : 0, T + (L ? 2 : 0) + (R ? 2 : 0), T + (U ? 2 : 0) + (D ? 2 : 0));
    // 石頭紋理
    for (let i = 0; i < 6; i++) { g.fillStyle = rnd() < 0.5 ? A.rock2 : 'rgba(255,255,255,.025)'; g.beginPath(); g.ellipse(rnd() * 32, rnd() * 32, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * 3, 0, 7); g.fill(); }
    if (area === 'T') { g.strokeStyle = 'rgba(200,170,255,.07)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 8 + rnd() * 16); g.bezierCurveTo(10, rnd() * 32, 22, rnd() * 32, 32, 6 + rnd() * 20); g.stroke(); }
    if (area === 'D' && v === 1) { g.strokeStyle = 'rgba(255,120,50,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(4 + rnd() * 10, 4); g.lineTo(10 + rnd() * 10, 16); g.lineTo(6 + rnd() * 16, 28); g.stroke(); }
    const rim = A.rim;
    if (!U) {
      g.fillStyle = rim; g.globalAlpha = 0.55; g.fillRect(L ? 0 : 1, 0, T - (L ? 0 : 1) - (R ? 0 : 1), 2); g.globalAlpha = 0.18; g.fillRect(0, 2, T, 4); g.globalAlpha = 1;
      if (area === 'B') { for (let i = 0; i < 3; i++) { const x = 3 + rnd() * 26; g.fillStyle = 'rgba(80,240,200,.55)'; g.beginPath(); g.ellipse(x, 0, 3 + rnd() * 3, 2, 0, Math.PI, 0); g.fill(); } }
      if (area === 'A' || area === 'T') { g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 3; i++) g.fillRect(rnd() * 30, 2, 2, 2); }
      if (area === 'C') { g.fillStyle = 'rgba(120,190,255,.3)'; g.fillRect(rnd() * 26, 2, 4 + rnd() * 4, 1); }
    }
    if (!D) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, T - 3, T, 3); g.fillStyle = rim; g.globalAlpha = 0.1; g.fillRect(0, T - 1, T, 1); g.globalAlpha = 1; }
    if (!L) { g.fillStyle = rim; g.globalAlpha = 0.25; g.fillRect(0, 0, 1.5, T); g.globalAlpha = 1; }
    if (!R) { g.fillStyle = rim; g.globalAlpha = 0.25; g.fillRect(T - 1.5, 0, 1.5, T); g.globalAlpha = 1; }
    if (t === TL.BREAK) {
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, T, T);
      g.strokeStyle = 'rgba(220,230,255,.35)'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(6, 2); g.lineTo(14, 13); g.lineTo(9, 22); g.lineTo(16, 31); g.moveTo(14, 13); g.lineTo(26, 10); g.moveTo(9, 22); g.lineTo(24, 24); g.stroke();
    }
  } else if (t === TL.PLAT) {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 7, T, 3);
    const gr = g.createLinearGradient(0, 0, 0, 8); gr.addColorStop(0, A.rim); gr.addColorStop(0.15, A.rock); gr.addColorStop(1, A.rock2);
    g.fillStyle = gr; g.fillRect(0, 0, T, 8);
    g.globalAlpha = 0.5; g.fillStyle = A.rim; g.fillRect(0, 0, T, 1.5); g.globalAlpha = 1;
    g.fillStyle = A.rock2; g.fillRect(4, 8, 3, 6); g.fillRect(25, 8, 3, 6);
  } else if (t === TL.CRUMB) {
    g.fillStyle = A.rock; rr(g, 1, 1, T - 2, 14, 3); g.fill();
    g.strokeStyle = A.rim; g.globalAlpha = 0.5; g.lineWidth = 1; rr(g, 1, 1, T - 2, 14, 3); g.stroke(); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.moveTo(10, 1); g.lineTo(14, 8); g.lineTo(11, 15); g.moveTo(22, 1); g.lineTo(20, 9); g.stroke();
  } else if (t === TL.SHROOM) {
    g.fillStyle = '#123a33'; g.fillRect(11, 14, 10, 18);
    const gr = g.createRadialGradient(14, 6, 2, 16, 12, 20); gr.addColorStop(0, '#d6fff2'); gr.addColorStop(0.35, '#4fe0c0'); gr.addColorStop(1, '#127060');
    g.fillStyle = gr; g.beginPath(); g.ellipse(16, 14, 17, 12, 0, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; for (const [x, y] of [[8, 9], [16, 5], [23, 10]]) { g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); }
  }
  spr.set(key, c);
  return c;
}
function maskAt(c, r) {
  return (solidForMask(c, r - 1) ? 1 : 0) | (solidForMask(c, r + 1) ? 2 : 0) | (solidForMask(c - 1, r) ? 4 : 0) | (solidForMask(c + 1, r) ? 8 : 0);
}

// ───────────── 背景 ─────────────
function drawBackground(area, R, t) {
  const A = EM.AREAS[area];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const gr = ctx.createLinearGradient(0, 0, 0, cv.height);
  gr.addColorStop(0, A.sky[0]); gr.addColorStop(0.6, A.sky[1]); gr.addColorStop(1, A.sky[2]);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, cv.width, cv.height);
  const s = S * DPR;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  const bottom = (R.y + R.h) * T;
  const layer = (k, gap, fn) => {
    const ox = -cam.x * k;
    const by = VH + (bottom - (cam.y + VH)) * k * 0.6 + 30;
    const i0 = Math.floor(-ox / gap) - 1, i1 = i0 + Math.ceil(VW / gap) + 2;
    for (let i = i0; i <= i1; i++) fn(ox + i * gap, by, i);
  };
  if (area === 'A') {
    layer(0.12, 230, (x, y, i) => {
      ctx.fillStyle = '#0f1628';
      const h = 160 + hash(i, 1) * 200, w = 60 + hash(i, 2) * 50;
      ctx.fillRect(x, y - h, w, h + 400);
      ctx.beginPath(); ctx.moveTo(x - 6, y - h); ctx.lineTo(x + w * 0.3, y - h - 40 - hash(i, 3) * 30); ctx.lineTo(x + w * 0.55, y - h - 10); ctx.lineTo(x + w + 6, y - h - 24); ctx.lineTo(x + w + 6, y - h); ctx.fill();
      ctx.fillStyle = `rgba(150,180,255,${0.08 + 0.05 * Math.sin(t + i)})`;
      for (let k = 0; k < 4; k++) if (hash(i, k + 9) > 0.5) ctx.fillRect(x + 10 + k * 12, y - h + 30 + hash(i, k) * 80, 5, 9);
    });
    layer(0.3, 180, (x, y, i) => {
      ctx.fillStyle = '#0b111f';
      ctx.fillRect(x, y - 260, 26, 600); ctx.fillRect(x + 150, y - 260, 26, 600);
      ctx.beginPath(); ctx.moveTo(x, y - 260); ctx.lineTo(x + 176, y - 260); ctx.lineTo(x + 176, y - 230); ctx.arc(x + 88, y - 230, 62, 0, Math.PI, true); ctx.lineTo(x, y - 230); ctx.fill();
    });
    layer(0.6, 260, (x, y, i) => {
      if (hash(i, 5) < 0.5) return;
      ctx.strokeStyle = '#070a12'; ctx.lineWidth = 3;
      ctx.beginPath(); for (let k = 0; k < 14; k++) { ctx.moveTo(x + Math.sin(t + k) * 2, -20 + k * 18); ctx.lineTo(x + Math.sin(t + k + 1) * 2, -8 + k * 18); } ctx.stroke();
    });
  } else if (area === 'B') {
    layer(0.12, 200, (x, y, i) => {
      const h = 180 + hash(i, 1) * 200, cw = 80 + hash(i, 2) * 80;
      ctx.fillStyle = '#0b2421'; ctx.fillRect(x - 8, y - h, 16, h + 300);
      ctx.beginPath(); ctx.ellipse(x, y - h, cw, cw * 0.4, 0, Math.PI, 0); ctx.fill();
      for (let k = 0; k < 6; k++) { ctx.fillStyle = `rgba(80,240,200,${0.15 + 0.15 * Math.sin(t * 1.5 + k + i)})`; ctx.beginPath(); ctx.arc(x - cw * 0.7 + k * cw * 0.28, y - h - 6 - hash(i, k) * 18, 2.5, 0, 7); ctx.fill(); }
    });
    layer(0.35, 150, (x, y, i) => {
      ctx.strokeStyle = '#081a18'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x, -10); ctx.bezierCurveTo(x + 40, 120, x - 40, 220, x + 10 + hash(i, 4) * 30, 320); ctx.stroke();
    });
    // 飄的孢子
    for (let i = 0; i < 40; i++) {
      const x = ((hash(i, 7) * 3000 - cam.x * 0.5 + Math.sin(t * 0.3 + i) * 30) % VW + VW) % VW;
      const y = ((hash(i, 8) * 2000 - cam.y * 0.5 - t * 12) % VH + VH) % VH;
      ctx.fillStyle = `rgba(120,255,210,${0.25 + 0.25 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill();
    }
  } else if (area === 'C') {
    layer(0.12, 260, (x, y, i) => {
      ctx.fillStyle = '#0d1b33';
      ctx.fillRect(x, y - 330, 260, 40);
      ctx.fillRect(x, y - 290, 30, 700);
      ctx.beginPath(); ctx.moveTo(x + 30, y - 290); ctx.arc(x + 130, y - 290, 100, Math.PI, 0, true); ctx.lineTo(x + 260, y - 290); ctx.lineTo(x + 30, y - 290); ctx.fill();
      if (hash(i, 3) > 0.4) {
        const fx = x + 120;
        const wg = ctx.createLinearGradient(fx - 14, 0, fx + 14, 0); wg.addColorStop(0, 'rgba(100,170,255,0)'); wg.addColorStop(0.5, 'rgba(120,190,255,.16)'); wg.addColorStop(1, 'rgba(100,170,255,0)');
        ctx.fillStyle = wg; ctx.fillRect(fx - 14, y - 300, 28, 600);
        ctx.fillStyle = 'rgba(170,220,255,.12)'; for (let k = 0; k < 6; k++) ctx.fillRect(fx - 8 + k * 3, y - 300 + ((t * 200 + k * 60) % 300), 1.5, 30);
      }
    });
    layer(0.35, 210, (x, y, i) => {
      ctx.fillStyle = '#0a1528'; ctx.fillRect(x, y - 180 - hash(i, 1) * 80, 170, 18); ctx.fillRect(x + 140, y - 180 - hash(i, 1) * 80, 18, 400);
    });
  } else if (area === 'D') {
    layer(0.12, 240, (x, y, i) => {
      const h = 200 + hash(i, 1) * 160;
      ctx.fillStyle = '#250c07'; ctx.beginPath(); ctx.moveTo(x, y + 300); ctx.lineTo(x + 20, y - h); ctx.lineTo(x + 90, y - h); ctx.lineTo(x + 110, y + 300); ctx.fill();
      const gl = 0.25 + 0.15 * Math.sin(t * 3 + i);
      ctx.fillStyle = `rgba(255,120,40,${gl})`; ctx.fillRect(x + 38, y - h + 60, 34, 44);
      ctx.fillStyle = 'rgba(60,30,25,.5)'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + 55 + Math.sin(t + k) * 10, y - h - 30 - ((t * 30 + k * 40) % 120), 20 + k * 6, 0, 7); ctx.fill(); }
    });
    layer(0.35, 300, (x, y, i) => {
      if (hash(i, 2) < 0.4) return;
      const cx = x + 80, cy = y - 220 - hash(i, 3) * 60, r = 60 + hash(i, 4) * 30, a = t * (i % 2 ? 0.4 : -0.4);
      ctx.fillStyle = '#1c0907';
      ctx.beginPath();
      for (let k = 0; k < 24; k++) { const ang = a + k * Math.PI / 12, rr2 = k % 2 ? r : r + 12; ctx.lineTo(cx + Math.cos(ang) * rr2, cy + Math.sin(ang) * rr2); }
      ctx.fill(); ctx.fillStyle = '#2a0e08'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, 7); ctx.fill();
    });
    for (let i = 0; i < 40; i++) {
      const x = ((hash(i, 7) * 3000 - cam.x * 0.6) % VW + VW) % VW;
      const y = ((hash(i, 8) * 2000 - cam.y * 0.6 - t * 50) % VH + VH) % VH;
      ctx.fillStyle = `rgba(255,${120 + (i % 5) * 20},50,${0.4 + 0.3 * Math.sin(t * 4 + i)})`; ctx.fillRect(x, y, 2, 2);
    }
  } else {
    layer(0.12, 200, (x, y, i) => {
      ctx.fillStyle = '#170f24'; ctx.fillRect(x + 60, y - 500, 50, 900);
      ctx.fillStyle = '#1d132e'; ctx.fillRect(x + 54, y - 500, 62, 16); ctx.fillRect(x + 54, y - 40, 62, 16);
      if (hash(i, 2) > 0.5) { ctx.fillStyle = '#2a0f2a'; ctx.beginPath(); ctx.moveTo(x + 66, y - 460); ctx.lineTo(x + 104, y - 460); ctx.lineTo(x + 104, y - 300); ctx.lineTo(x + 85, y - 320); ctx.lineTo(x + 66, y - 300); ctx.fill(); }
    });
    for (let i = 0; i < 50; i++) {
      const x = ((hash(i, 7) * 3000 - cam.x * 0.5 + Math.sin(t * 0.5 + i) * 20) % VW + VW) % VW;
      const y = ((hash(i, 8) * 2000 - cam.y * 0.5 + t * 20) % VH + VH) % VH;
      ctx.fillStyle = 'rgba(190,170,210,.25)'; ctx.fillRect(x, y, 2, 2);
    }
  }
  // 霧
  const fog = ctx.createLinearGradient(0, VH * 0.4, 0, VH);
  fog.addColorStop(0, 'rgba(0,0,0,0)'); fog.addColorStop(1, A.fog);
  ctx.fillStyle = fog; ctx.fillRect(0, 0, VW, VH);
}

// ───────────── 裝飾 ─────────────
function drawDecor(d, t, area) {
  const A = EM.AREAS[area];
  const x = d.x, y = d.y;
  ctx.save();
  switch (d.kind) {
    case 'chain': ctx.strokeStyle = 'rgba(120,130,160,.45)'; ctx.lineWidth = 2;
      for (let k = 0; k < 10; k++) { const sw = Math.sin(t * 0.8 + x) * k * 0.6; ctx.beginPath(); ctx.ellipse(x + sw, y - 200 + k * 12, 3, 6, 0, 0, 7); ctx.stroke(); } break;
    case 'arch': ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 40, y - 150, 12, 150); ctx.fillRect(x + 28, y - 150, 12, 150); ctx.beginPath(); ctx.arc(x, y - 150, 40, Math.PI, 0); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke(); break;
    case 'banner': { ctx.fillStyle = 'rgba(60,20,40,.8)'; const sw = Math.sin(t + x) * 3; ctx.beginPath(); ctx.moveTo(x - 14, y - 30); ctx.lineTo(x + 14, y - 30); ctx.lineTo(x + 14 + sw, y + 50); ctx.lineTo(x + sw, y + 38); ctx.lineTo(x - 14 + sw, y + 50); ctx.fill();
      ctx.strokeStyle = rgba(A.glow, 0.4); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + sw * 0.5, y + 8, 7, 0, 7); ctx.stroke(); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 18, y - 33, 36, 4); break; }
    case 'fungus': for (let k = -1; k <= 1; k++) { const h = 10 + hash(x, k) * 16, cx = x + k * 9; ctx.fillStyle = '#0d2a25'; ctx.fillRect(cx - 1.5, y - h, 3, h);
      ctx.fillStyle = `rgba(80,240,200,${0.55 + 0.25 * Math.sin(t * 2 + k + x)})`; ctx.beginPath(); ctx.ellipse(cx, y - h, 6, 4, 0, Math.PI, 0); ctx.fill(); } break;
    case 'root': ctx.strokeStyle = 'rgba(10,30,26,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y - 32); ctx.bezierCurveTo(x + 20, y + 20, x - 20, y + 60, x + 6, y + 110); ctx.stroke(); break;
    case 'pipe': ctx.fillStyle = 'rgba(40,60,90,.6)'; ctx.fillRect(x - 10, y - 32, 20, 160); ctx.fillStyle = 'rgba(80,110,150,.4)'; ctx.fillRect(x - 13, y + 30, 26, 6); ctx.fillRect(x - 13, y + 90, 26, 6);
      ctx.fillStyle = 'rgba(140,200,255,.5)'; ctx.fillRect(x - 1, y + 128 + ((t * 120) % 40), 2, 6); break;
    case 'waterfall': { const wg = ctx.createLinearGradient(x - 18, 0, x + 18, 0); wg.addColorStop(0, 'rgba(100,170,255,0)'); wg.addColorStop(0.5, 'rgba(140,200,255,.22)'); wg.addColorStop(1, 'rgba(100,170,255,0)');
      ctx.fillStyle = wg; ctx.fillRect(x - 18, y - 40, 36, 900); ctx.fillStyle = 'rgba(200,235,255,.25)'; for (let k = 0; k < 8; k++) ctx.fillRect(x - 12 + k * 3, y - 40 + ((t * 260 + k * 47) % 600), 1.5, 40); break; }
    case 'wheel': { ctx.translate(x, y); ctx.rotate(t * 0.6); ctx.strokeStyle = 'rgba(70,100,140,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 60, 0, 7); ctx.stroke();
      for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = 'rgba(70,100,140,.55)'; ctx.fillRect(-3, 0, 6, 60); ctx.fillRect(-12, 56, 24, 8); } break; }
    case 'gear': { ctx.translate(x, y); ctx.rotate(t * (x % 2 ? 0.5 : -0.5)); ctx.fillStyle = 'rgba(70,30,20,.7)'; ctx.beginPath();
      for (let k = 0; k < 20; k++) { const a = k * Math.PI / 10, r = k % 2 ? 40 : 50; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.fillStyle = 'rgba(30,12,8,.9)'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); break; }
    case 'furnace': { ctx.fillStyle = '#2a1410'; rr(ctx, x - 40, y - 90, 80, 90, [30, 30, 0, 0]); ctx.fill();
      const gl = 0.6 + 0.3 * Math.sin(t * 6);
      const fg = ctx.createRadialGradient(x, y - 26, 2, x, y - 26, 30); fg.addColorStop(0, `rgba(255,230,140,${gl})`); fg.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = '#120806'; rr(ctx, x - 22, y - 50, 44, 40, [18, 18, 0, 0]); ctx.fill(); ctx.fillStyle = fg; ctx.fillRect(x - 30, y - 60, 60, 60); break; }
    case 'bell': ctx.fillStyle = 'rgba(70,80,110,.6)'; ctx.beginPath(); ctx.moveTo(x - 30, y + 20); ctx.quadraticCurveTo(x - 30, y - 40, x, y - 44); ctx.quadraticCurveTo(x + 30, y - 40, x + 30, y + 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(40,45,65,.8)'; ctx.fillRect(x - 34, y + 18, 68, 6); break;
    case 'throne': { ctx.fillStyle = '#1e1430'; ctx.fillRect(x - 46, y - 160, 92, 160); ctx.fillStyle = '#2b1d44'; ctx.beginPath(); ctx.moveTo(x - 56, y - 160); ctx.lineTo(x, y - 230); ctx.lineTo(x + 56, y - 160); ctx.fill();
      ctx.fillStyle = 'rgba(200,150,255,.25)'; ctx.beginPath(); ctx.arc(x, y - 170, 14, 0, 7); ctx.fill(); ctx.fillStyle = '#120c1c'; ctx.fillRect(x - 30, y - 70, 60, 70); break; }
    case 'pillar': ctx.fillStyle = 'rgba(30,20,45,.8)'; ctx.fillRect(x - 18, y - 400, 36, 400); ctx.fillStyle = 'rgba(60,45,90,.6)'; ctx.fillRect(x - 24, y - 20, 48, 20); ctx.fillRect(x - 24, y - 400, 48, 20); break;
  }
  ctx.restore();
}

// ───────────── 角色 ─────────────
function drawPlayer(P, t) {
  if (P.dead) return;
  if (P.inv > 0 && Math.floor(t * 20) % 2 === 0 && P.hazardT <= 0) ctx.globalAlpha = 0.45;
  if (P.hazardT > 0) ctx.globalAlpha = Math.max(0, P.hazardT / 0.45) * 0.8;
  const x = P.x, y = P.y, f = P.face;
  const run = P.grounded && Math.abs(P.vx) > 30;
  const bob = run ? Math.abs(Math.sin(P.anim * 14)) * 2 : 0;
  const sq = P.land * 0.25;
  ctx.save();
  ctx.translate(x, y); ctx.scale(1 + sq, 1 - sq); ctx.translate(0, -bob);
  // 斗篷
  const sway = Math.max(-1, Math.min(1, -P.vx / 220)) * 6 + Math.sin(t * 3) * 1;
  ctx.fillStyle = '#16121f';
  ctx.beginPath(); ctx.moveTo(-7, -20); ctx.quadraticCurveTo(-11 + sway, -6, -10 + sway * 1.4, 0); ctx.lineTo(10 + sway * 1.4, 0); ctx.quadraticCurveTo(11 + sway, -6, 7, -20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(160,150,200,.35)'; ctx.lineWidth = 1; ctx.stroke();
  // 腳
  if (run) { ctx.fillStyle = '#0c0a12'; const k = Math.sin(P.anim * 14) * 4; ctx.fillRect(-4 + k, -2, 3, 3); ctx.fillRect(2 - k, -2, 3, 3); }
  // 頭（兜帽）
  ctx.fillStyle = '#1d1828';
  ctx.beginPath(); ctx.ellipse(0, -24, 8.5, 8, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, -29); ctx.lineTo(-3, -36); ctx.lineTo(1, -30); ctx.fill();   // 帽尖
  ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.ellipse(f * 2, -23.5, 5.5, 5, 0, 0, 7); ctx.fill();
  // 眼睛
  const blink = (Math.floor(t * 0.7) % 5 === 0 && (t * 0.7 % 1) < 0.08) ? 0.2 : 1;
  ctx.fillStyle = '#ffe9b0';
  ctx.beginPath(); ctx.ellipse(f * 2 - 2, -24, 1.4, 2 * blink, 0, 0, 7); ctx.ellipse(f * 2 + 2.6, -24, 1.4, 2 * blink, 0, 0, 7); ctx.fill();
  // 燈籠（拿在後面那隻手）
  const lx = -f * 9, ly = -11 + Math.sin(t * 4) * 1.2 + (run ? Math.sin(P.anim * 14) * 1.5 : 0);
  ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-f * 5, -14); ctx.lineTo(lx, ly - 5); ctx.stroke();
  ctx.fillStyle = '#3a2c1e'; ctx.fillRect(lx - 3.5, ly - 5, 7, 2); ctx.fillRect(lx - 3.5, ly + 5, 7, 2);
  const lg = ctx.createRadialGradient(lx, ly + 1, 0.5, lx, ly + 1, 6); lg.addColorStop(0, '#fff6d0'); lg.addColorStop(0.5, '#ffb84a'); lg.addColorStop(1, 'rgba(255,140,40,.2)');
  ctx.fillStyle = lg; ctx.fillRect(lx - 3, ly - 3, 6, 8);
  // 劍
  if (P.atkT <= 0) { ctx.strokeStyle = '#a9b0c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f * 6, -12); ctx.lineTo(f * 10, 2); ctx.stroke(); }
  // 回復中
  if (P.healT > 0) { ctx.strokeStyle = `rgba(255,210,120,${0.4 + P.healT * 0.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -14, 16 + P.healT * 6, -Math.PI / 2, -Math.PI / 2 + P.healT / 0.9 * Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  ctx.globalAlpha = 1;
  // 揮劍特效
  if (P.atkT > 0) {
    const k = 1 - P.atkT / 0.2;
    ctx.save(); ctx.translate(x, y - 14);
    if (P.atkDir === 'up') ctx.rotate(-Math.PI / 2 * f);
    if (P.atkDir === 'down') ctx.rotate(Math.PI / 2 * f);
    ctx.scale(f, 1);
    ctx.globalAlpha = 1 - k * 0.8;
    const sg = ctx.createLinearGradient(0, -30, 40, 30); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,245,220,.95)'); sg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = sg;
    const a0 = -1.2 + k * 0.8;
    ctx.beginPath(); ctx.arc(6, 0, 36, a0, a0 + 2.1); ctx.arc(10, 0, 24, a0 + 2.1, a0, true); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
}
function drawEnemy(e, t) {
  const g = G();
  if (e.dead) return;
  const cx = e.x + e.w / 2, by = e.y + e.h;
  ctx.save();
  const flash = e.flash > 0;
  const body = flash ? '#ffffff' : '#0d0a14';
  const eye = EM.enemyColor(e);
  switch (e.type) {
    case 'crawler': {
      const k = Math.sin(e.t * 12);
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(cx, by - 8, 13, 9, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = body; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 7, by - 4); ctx.lineTo(cx + i * 7 + k * 2, by); ctx.stroke(); }
      ctx.fillStyle = 'rgba(200,160,255,.25)'; ctx.beginPath(); ctx.ellipse(cx, by - 12, 9, 3, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(cx + e.face * 9, by - 9, 2, 0, 7); ctx.fill();
      break;
    }
    case 'moth': case 'jelly': {
      const cy = e.y + e.h / 2, fl = Math.sin(t * (e.type === 'moth' ? 22 : 4) + e.ph);
      if (e.type === 'moth') {
        ctx.fillStyle = flash ? '#fff' : 'rgba(40,30,60,.95)';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * 8, cy - 2, 9, 5 + fl * 3, s * 0.5, 0, 7); ctx.fill(); }
        ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(cx, cy, 4, 7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(cx - 1.5, cy - 3, 1.4, 0, 7); ctx.arc(cx + 1.5, cy - 3, 1.4, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = flash ? '#fff' : 'rgba(120,200,255,.35)'; ctx.beginPath(); ctx.ellipse(cx, cy - 2, 10, 8 + fl, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(140,210,255,.5)'; ctx.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 4, cy - 2); ctx.quadraticCurveTo(cx + i * 4 + Math.sin(t * 3 + i) * 3, cy + 6, cx + i * 4, cy + 12); ctx.stroke(); }
      }
      break;
    }
    case 'spitter': {
      const wind = e.st === 'wind' ? Math.min(1, e.t / 0.4) : 0;
      ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(cx - 12, by); ctx.quadraticCurveTo(cx - 14, by - 18, cx, by - 24 - wind * 4); ctx.quadraticCurveTo(cx + 14, by - 18, cx + 12, by); ctx.fill();
      ctx.fillStyle = `rgba(138,255,192,${0.5 + wind * 0.5})`; ctx.beginPath(); ctx.arc(cx + e.face * 4, by - 18 - wind * 3, 4 + wind * 2, 0, 7); ctx.fill();
      break;
    }
    case 'hopper': {
      const air = e.st === 'air';
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(cx, by - 9, 11, air ? 11 : 8, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = body; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - 6, by - 4); ctx.lineTo(cx - 10, by + (air ? 4 : 0)); ctx.moveTo(cx + 6, by - 4); ctx.lineTo(cx + 10, by + (air ? 4 : 0)); ctx.stroke();
      ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(cx + e.face * 4 - 3, by - 12, 2, 0, 7); ctx.arc(cx + e.face * 4 + 3, by - 12, 2, 0, 7); ctx.fill();
      break;
    }
    case 'charger': {
      const sh = e.st === 'wind' ? (Math.random() - 0.5) * 3 : 0;
      ctx.translate(sh, 0);
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(cx, by - 12, 17, 12, 0, Math.PI, 0); ctx.lineTo(cx + 17, by - 4); ctx.lineTo(cx - 17, by - 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + e.face * 12, by - 16); ctx.lineTo(cx + e.face * 26, by - 22); ctx.lineTo(cx + e.face * 16, by - 10); ctx.fill();
      ctx.strokeStyle = body; ctx.lineWidth = 3; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 10, by - 5); ctx.lineTo(cx + i * 10 + Math.sin(e.t * 20) * (e.st === 'charge' ? 4 : 1), by); ctx.stroke(); }
      ctx.fillStyle = e.st === 'wind' || e.st === 'charge' ? '#ff5a3a' : eye; ctx.beginPath(); ctx.arc(cx + e.face * 10, by - 14, 2.4, 0, 7); ctx.fill();
      break;
    }
    case 'shield': {
      ctx.fillStyle = body; rr(ctx, cx - 9, by - 28, 18, 28, 6); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, by - 30, 7, 0, 7); ctx.fill();
      ctx.fillStyle = eye; ctx.fillRect(cx + e.face * 2 - 2, by - 32, 4, 2);
      // 盾牌
      ctx.fillStyle = flash ? '#fff' : '#3a3f55'; ctx.strokeStyle = '#a9b0c8'; ctx.lineWidth = 1.5;
      rr(ctx, cx + e.face * 10 - 5, by - 30, 10, 26, 4); ctx.fill(); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
function drawBoss(b, t) {
  if (b.dead && b.deadT > 1.2) return;
  if (b.hidden) return;
  const cx = b.x + b.w / 2, by = b.y + b.h, f = b.face;
  ctx.save();
  if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.deadT / 1.2); ctx.translate((Math.random() - 0.5) * 6, 0); }
  const flash = b.flash > 0;
  const body = flash ? '#ffffff' : '#0a0810';
  if (b.type === 'knight' || b.type === 'king') {
    const king = b.type === 'king';
    const h = b.h, w = b.w;
    const wind = b.st === 'dashwind' || (b.st === 'swipe' && ((b.t % (0.36)) / 0.36) < 0.45) || b.st === 'pillars' || b.st === 'rain';
    // 披風
    ctx.fillStyle = king ? (flash ? '#fff' : '#2a1240') : (flash ? '#fff' : '#1a1f2e');
    ctx.beginPath(); ctx.moveTo(cx - w * 0.35, by - h * 0.78); ctx.lineTo(cx - f * w * 0.8 + Math.sin(t * 3) * 3, by); ctx.lineTo(cx + f * w * 0.2, by); ctx.closePath(); ctx.fill();
    // 身體
    ctx.fillStyle = body; rr(ctx, cx - w * 0.38, by - h * 0.78, w * 0.76, h * 0.6, 8); ctx.fill();
    ctx.fillRect(cx - w * 0.28, by - h * 0.2, w * 0.18, h * 0.2); ctx.fillRect(cx + w * 0.1, by - h * 0.2, w * 0.18, h * 0.2);
    // 頭盔
    ctx.beginPath(); ctx.ellipse(cx, by - h * 0.86, w * 0.32, h * 0.14, 0, 0, 7); ctx.fill();
    if (king) { ctx.fillStyle = flash ? '#fff' : '#c9a24a'; ctx.beginPath(); for (let k = 0; k < 5; k++) { const x = cx - 14 + k * 7; ctx.moveTo(x - 3, by - h * 0.96); ctx.lineTo(x, by - h * 1.08 - (k % 2) * 6); ctx.lineTo(x + 3, by - h * 0.96); } ctx.fill(); }
    else { ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(cx - 4, by - h); ctx.lineTo(cx + f * 16, by - h * 1.12); ctx.lineTo(cx + 6, by - h * 0.93); ctx.fill(); }
    ctx.fillStyle = king ? '#d9b3ff' : '#ffe2a8'; ctx.fillRect(cx + f * 4 - 6, by - h * 0.87, 12, 3);
    // 武器
    ctx.save(); ctx.translate(cx + f * w * 0.36, by - h * 0.55);
    const ang = wind ? -f * 1.9 : b.st === 'dash' ? f * 1.4 : b.hits.length ? f * 0.9 : f * 0.4;
    ctx.rotate(ang);
    ctx.fillStyle = flash ? '#fff' : (king ? '#6a5a8a' : '#7a849e'); ctx.fillRect(-3, -h * 0.75, 6, h * 0.8);
    ctx.fillStyle = flash ? '#fff' : '#3a3f55'; ctx.fillRect(-9, 0, 18, 5);
    if (king) { ctx.fillStyle = 'rgba(255,140,60,.6)'; ctx.fillRect(-1.5, -h * 0.72, 3, h * 0.7); }
    ctx.restore();
    if (wind) { ctx.fillStyle = 'rgba(255,230,170,.7)'; ctx.beginPath(); ctx.arc(cx + f * 6, by - h * 0.87, 3, 0, 7); ctx.fill(); }
  } else if (b.type === 'matriarch') {
    const em = b.st === 'emerge' ? Math.min(1, b.t / 0.6) : b.st === 'burrow' ? 1 - Math.min(1, b.t / 0.7) : 1;
    ctx.beginPath(); ctx.rect(b.x - 30, b.y - 60, b.w + 60, b.h + 60); ctx.clip();
    ctx.translate(0, (1 - em) * b.h);
    const pulse = Math.sin(t * 3) * 2;
    ctx.fillStyle = flash ? '#fff' : '#0b1f1c';
    ctx.beginPath(); ctx.moveTo(cx - 30, by); ctx.quadraticCurveTo(cx - 34, by - 30, cx - 20, by - 44); ctx.lineTo(cx + 20, by - 44); ctx.quadraticCurveTo(cx + 34, by - 30, cx + 30, by); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#0f2a26'; ctx.beginPath(); ctx.ellipse(cx, by - 46, 40 + pulse, 20 + pulse * 0.5, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 9; k++) { ctx.fillStyle = `rgba(90,255,210,${0.5 + 0.4 * Math.sin(t * 2 + k)})`; ctx.beginPath(); ctx.arc(cx - 32 + k * 8, by - 50 - Math.sin(k * 1.3) * 10, 2.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#d6fff2'; ctx.beginPath(); ctx.ellipse(cx - 8, by - 28, 4, 6, 0, 0, 7); ctx.ellipse(cx + 8, by - 28, 4, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#05100e'; ctx.beginPath(); ctx.arc(cx - 8, by - 27, 1.8, 0, 7); ctx.arc(cx + 8, by - 27, 1.8, 0, 7); ctx.fill();
  } else if (b.type === 'jelly') {
    const cy = b.y + b.h * 0.45, pulse = Math.sin(t * 2.4) * 3;
    const charging = b.st === 'ring' && b.k === 0;
    const gl = ctx.createRadialGradient(cx, cy, 4, cx, cy, 46);
    gl.addColorStop(0, flash ? '#ffffff' : charging ? 'rgba(230,250,255,.95)' : 'rgba(170,225,255,.85)'); gl.addColorStop(0.6, 'rgba(80,150,255,.45)'); gl.addColorStop(1, 'rgba(60,120,255,.08)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(cx, cy, 34 + pulse, 26 - pulse * 0.4, 0, Math.PI, 0); ctx.quadraticCurveTo(cx + 30, cy + 10, cx, cy + 8); ctx.quadraticCurveTo(cx - 30, cy + 10, cx - 34 - pulse, cy); ctx.fill();
    ctx.strokeStyle = 'rgba(150,210,255,.6)'; ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 8, cy + 6); for (let k = 1; k <= 6; k++) ctx.lineTo(cx + i * 8 + Math.sin(t * 3 + i + k * 0.7) * 5, cy + 6 + k * 7); ctx.stroke(); }
    ctx.fillStyle = '#0a1a33'; ctx.beginPath(); ctx.arc(cx - 9, cy - 6, 4, 0, 7); ctx.arc(cx + 9, cy - 6, 4, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawProj(p, t) {
  if (p.t < 0 && p.kind !== 'mark') return;
  ctx.save();
  if (p.kind === 'ring') {
    const rad = p.r0 + (p.r1 - p.r0) * Math.min(1, p.t / p.dur);
    ctx.strokeStyle = `rgba(200,240,255,${1 - Math.min(1, p.t / p.dur) * 0.6})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,190,255,.5)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 7); ctx.stroke();
  } else if (p.kind === 'pillar') {
    if (p.t < p.warn) { ctx.fillStyle = `rgba(255,120,50,${0.25 + 0.25 * Math.sin(t * 30)})`; ctx.fillRect(p.x - 14, p.y - 6, 28, 6); }
    else if (p.on) { const k = Math.min(1, (p.t - p.warn) / 0.1); const gr = ctx.createLinearGradient(p.x - 16, 0, p.x + 16, 0); gr.addColorStop(0, 'rgba(255,90,30,0)'); gr.addColorStop(0.5, 'rgba(255,230,150,.95)'); gr.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = gr; ctx.fillRect(p.x - 18, p.y - 150 * k, 36, 150 * k); }
  } else if (p.kind === 'mark') {
    if (p.t > 0) { ctx.fillStyle = `rgba(150,255,220,${0.3 + 0.3 * Math.sin(t * 20)})`; ctx.fillRect(p.x - 10, p.y - 3, 20, 3); }
  } else if (p.kind === 'wave') {
    const gr = ctx.createLinearGradient(0, p.y - 28, 0, p.y); gr.addColorStop(0, 'rgba(255,230,160,0)'); gr.addColorStop(1, 'rgba(255,220,140,.9)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(p.x - 12, p.y); ctx.quadraticCurveTo(p.x, p.y - 34, p.x + 12, p.y); ctx.fill();
  } else {
    const c = p.c || '#fff';
    const gr = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r * 1.8);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.8, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// ───────────── 主繪圖 ─────────────
EM.render = function (dt) {
  const g = G();
  if (!g) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, cv.width, cv.height); return; }
  const P = g.P, Wd = g.W, t = g.t;
  const R = Wd.rooms[g.roomIdx];
  const area = R.area, A = EM.AREAS[area];
  drawBackground(area, R, t);
  const s = S * DPR;
  let sx = 0, sy = 0;
  if (g.shake > 0) { sx = (Math.random() - 0.5) * g.shake * 22; sy = (Math.random() - 0.5) * g.shake * 22; }
  const cx = Math.round((cam.x + sx) * s) / s, cy = Math.round((cam.y + sy) * s) / s;
  ctx.setTransform(s, 0, 0, s, -cx * s, -cy * s);
  const c0 = Math.max(0, Math.floor(cx / T) - 1), c1 = Math.min(Wd.W - 1, Math.ceil((cx + VW) / T) + 1);
  const r0 = Math.max(0, Math.floor(cy / T) - 1), r1 = Math.min(Wd.H - 1, Math.ceil((cy + VH) / T) + 1);
  const vis = (x, y, m = 200) => x > cx - m && x < cx + VW + m && y > cy - m && y < cy + VH + m;

  for (const d of Wd.decor) if (vis(d.x, d.y, 400)) drawDecor(d, t, Wd.rooms[d.room].area);

  // 地形
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const tt = Wd.grid[r * Wd.W + c];
    if (tt === TL.AIR || tt === TL.WATER || tt === TL.LAVA) continue;
    const ra = Wd.roomOf[r * Wd.W + c], ar = ra >= 0 ? Wd.rooms[ra].area : area;
    const x = c * T, y = r * T;
    if (tt === TL.ROCK || tt === TL.BREAK || tt === TL.PLAT || tt === TL.SHROOM || tt === TL.CRUMB) {
      if (tt === TL.CRUMB) { const st = g.crumbles.get(r * Wd.W + c); if (st && st.state === 2) continue; if (st && st.state === 1) ctx.translate(Math.sin(t * 60) * 1.5, 0); }
      const m = tt === TL.ROCK || tt === TL.BREAK ? maskAt(c, r) : 0;
      ctx.drawImage(tileSprite(ar, tt, m, (hash(c, r) * 3) | 0), x - 4, y - 4, T + 8, T + 8);
      if (tt === TL.CRUMB) ctx.setTransform(s, 0, 0, s, -cx * s, -cy * s);
      if (tt === TL.BREAK) { const n = g.brk.get(r * Wd.W + c) || 0; if (n) { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 16, y + 4); ctx.lineTo(x + 8 + n * 3, y + 20); ctx.lineTo(x + 20, y + 28); ctx.stroke(); } }
      if (tt === TL.SHROOM) { const f = g.fx.find(q => q.k === 'shroom' && q.c === c && q.r === r); if (f) { ctx.fillStyle = `rgba(200,255,240,${0.6 - f.t * 2})`; ctx.beginPath(); ctx.ellipse(x + 16, y + 6, 20, 8, 0, 0, 7); ctx.fill(); } }
    } else if (tt === TL.SPIKE) {
      const up = EM.solidTile(c, r + 1), down = EM.solidTile(c, r - 1), lf = EM.solidTile(c - 1, r), rt = EM.solidTile(c + 1, r);
      ctx.save(); ctx.translate(x + 16, y + 16);
      if (!up && down) ctx.rotate(Math.PI); else if (!up && lf) ctx.rotate(Math.PI / 2); else if (!up && rt) ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#c8c2d8';
      ctx.beginPath(); for (let k = 0; k < 4; k++) { const bx = -16 + k * 8; ctx.moveTo(bx, 16); ctx.lineTo(bx + 4, -4 - (k % 2) * 6); ctx.lineTo(bx + 8, 16); } ctx.fill();
      ctx.fillStyle = 'rgba(40,30,50,.6)'; ctx.beginPath(); for (let k = 0; k < 4; k++) { const bx = -16 + k * 8; ctx.moveTo(bx + 4, 16); ctx.lineTo(bx + 4, -4 - (k % 2) * 6); ctx.lineTo(bx + 8, 16); } ctx.fill();
      ctx.restore();
    } else if (tt === TL.GATE) {
      if (!EM.solidTile(c, r)) continue;
      ctx.fillStyle = '#2a2f40'; for (let k = 0; k < 3; k++) ctx.fillRect(x + 4 + k * 10, y, 5, T);
      ctx.fillStyle = 'rgba(200,210,240,.35)'; for (let k = 0; k < 3; k++) ctx.fillRect(x + 4 + k * 10, y, 1.5, T);
      ctx.fillStyle = '#1a1d28'; ctx.fillRect(x, y + 12, T, 4);
    } else if (tt === TL.SIGIL) {
      const open = g.save.sigils;
      ctx.drawImage(tileSprite(ar, TL.ROCK, maskAt(c, r), 0), x - 4, y - 4, T + 8, T + 8);
      ctx.fillStyle = `rgba(200,150,255,${0.25 + 0.15 * Math.sin(t * 2 + c)})`; ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
      if (r === Math.floor(r)) { ctx.strokeStyle = 'rgba(230,200,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 16, y + 16, 8, 0, 7); ctx.stroke(); }
      if (open > 0) { ctx.fillStyle = '#ffd27a'; for (let k = 0; k < open; k++) { ctx.beginPath(); ctx.arc(x + 9 + k * 7, y + 16, 2, 0, 7); ctx.fill(); } }
    }
  }
  // 水、岩漿
  const liquid = (type, fillFn) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (Wd.grid[r * Wd.W + c] !== type) continue;
      const surf = EM.tileAt(c, r - 1) !== type;
      fillFn(c * T, r * T, surf, c, r);
    }
  };
  // 移動平台
  for (const m of Wd.plats) {
    if (!vis(m.x, m.y)) continue;
    const ar = Wd.rooms[m.room].area, AA = EM.AREAS[ar];
    ctx.fillStyle = AA.rock; rr(ctx, m.x, m.y, m.w, 14, 3); ctx.fill();
    ctx.fillStyle = AA.rim; ctx.globalAlpha = 0.7; ctx.fillRect(m.x + 2, m.y, m.w - 4, 2); ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(AA.glow, 0.6); for (let k = 0; k < m.w / T; k++) { ctx.beginPath(); ctx.arc(m.x + 16 + k * T, m.y + 8, 2, 0, 7); ctx.fill(); }
  }
  // 壓碎機
  for (const c of Wd.crushers) {
    if (!vis(c.x, c.cy)) continue;
    ctx.strokeStyle = 'rgba(90,60,50,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c.x + c.w / 2, c.yTop - 4); ctx.lineTo(c.x + c.w / 2, c.cy); ctx.stroke();
    const sh = c.st === 'shake' ? (Math.random() - 0.5) * 3 : 0;
    ctx.fillStyle = '#2b1a16'; rr(ctx, c.x + sh, c.cy, c.w, c.h, 4); ctx.fill();
    ctx.fillStyle = '#4a2c22'; ctx.fillRect(c.x + 4 + sh, c.cy + 4, c.w - 8, 8);
    ctx.fillStyle = '#c8c2d8'; ctx.beginPath(); for (let k = 0; k < c.w / 8; k++) { ctx.moveTo(c.x + sh + k * 8, c.cy + c.h); ctx.lineTo(c.x + sh + k * 8 + 4, c.cy + c.h + 8); ctx.lineTo(c.x + sh + k * 8 + 8, c.cy + c.h); } ctx.fill();
    if (c.st === 'shake') { ctx.fillStyle = 'rgba(255,120,60,.6)'; ctx.fillRect(c.x + 6, c.cy + c.h - 10, c.w - 12, 3); }
  }
  // 噴火口
  for (const j of Wd.jets) {
    if (!vis(j.x, j.y)) continue;
    ctx.fillStyle = '#2b1a16'; ctx.fillRect(j.x + 4, j.y + T - 8, T - 8, 8);
    ctx.fillStyle = j.state === 'warn' ? '#ff9a4a' : '#5a2a1a'; ctx.fillRect(j.x + 10, j.y + T - 10, T - 20, 3);
    if (j.state === 'on') {
      const fl = Math.sin(t * 40) * 3;
      const gr = ctx.createLinearGradient(0, j.y + T, 0, j.y - 2 * T); gr.addColorStop(0, 'rgba(255,240,180,.95)'); gr.addColorStop(0.5, 'rgba(255,130,40,.8)'); gr.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(j.x + 6, j.y + T - 6); ctx.quadraticCurveTo(j.x + 16 + fl, j.y - 3 * T, j.x + 26, j.y + T - 6); ctx.fill();
    } else if (j.state === 'warn') { ctx.fillStyle = 'rgba(255,140,60,.5)'; for (let k = 0; k < 3; k++) ctx.fillRect(j.x + 10 + k * 5, j.y + T - 14 - Math.random() * 10, 2, 2); }
  }
  // 篝火
  for (const bn of Wd.benches) {
    if (!vis(bn.x, bn.y)) continue;
    const lit = g.save.bench === bn.id;
    ctx.fillStyle = '#2b2230'; ctx.beginPath(); ctx.ellipse(bn.x, bn.y - 2, 20, 5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#4a3528'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bn.x - 14, bn.y - 2); ctx.lineTo(bn.x + 10, bn.y - 10); ctx.moveTo(bn.x + 14, bn.y - 2); ctx.lineTo(bn.x - 10, bn.y - 10); ctx.stroke();
    const fh = (lit ? 26 : 16) + Math.sin(t * 9 + bn.x) * 3;
    const fg = ctx.createLinearGradient(0, bn.y - 6, 0, bn.y - 6 - fh); fg.addColorStop(0, '#fff2c0'); fg.addColorStop(0.4, '#ffb04a'); fg.addColorStop(1, 'rgba(255,80,30,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(bn.x - 9, bn.y - 6); ctx.quadraticCurveTo(bn.x - 6 + Math.sin(t * 7) * 3, bn.y - 6 - fh, bn.x + Math.sin(t * 5) * 2, bn.y - 6 - fh); ctx.quadraticCurveTo(bn.x + 6, bn.y - fh * 0.6, bn.x + 9, bn.y - 6); ctx.fill();
  }
  // 石碑
  for (const tb of Wd.tablets) {
    if (!vis(tb.x, tb.y)) continue;
    ctx.fillStyle = '#1e2232'; rr(ctx, tb.x - 11, tb.y - 34, 22, 34, [10, 10, 2, 2]); ctx.fill();
    ctx.strokeStyle = `rgba(${A.glow.join(',')},${0.4 + 0.2 * Math.sin(t * 2 + tb.x)})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tb.x - 5, tb.y - 22); ctx.lineTo(tb.x + 5, tb.y - 22); ctx.moveTo(tb.x - 5, tb.y - 16); ctx.lineTo(tb.x + 3, tb.y - 16); ctx.moveTo(tb.x - 5, tb.y - 10); ctx.lineTo(tb.x + 5, tb.y - 10); ctx.stroke();
  }
  // 道具
  for (const it of Wd.items) {
    if (!vis(it.x, it.y)) continue;
    const yy = it.y + Math.sin(t * 2.5 + it.x) * 4;
    const col = it.kind === 'life' ? '255,120,110' : it.kind === 'flask' ? '255,200,110' : '255,240,200';
    const gr = ctx.createRadialGradient(it.x, yy, 1, it.x, yy, it.kind === 'ability' ? 26 : 16);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, `rgba(${col},.95)`); gr.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(it.x, yy, it.kind === 'ability' ? 26 : 16, 0, 7); ctx.fill();
    if (it.kind === 'life') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(it.x, yy - 6); ctx.lineTo(it.x + 5, yy); ctx.lineTo(it.x, yy + 6); ctx.lineTo(it.x - 5, yy); ctx.fill(); }
    if (it.kind === 'ability') { ctx.strokeStyle = 'rgba(255,230,180,.7)'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(it.x, yy, 14 + k * 6, t * 2 + k, t * 2 + k + 1.5); ctx.stroke(); } }
  }
  for (const e of g.enemies) if (vis(e.x, e.y)) drawEnemy(e, t);
  for (const b of g.bosses) drawBoss(b, t);
  // 殘影
  for (const f of g.fx) if (f.k === 'ghost') { ctx.globalAlpha = 0.3 * (1 - f.t / f.life); ctx.fillStyle = '#9fb0ff'; ctx.beginPath(); ctx.ellipse(f.x, f.y - 13, 8, 13, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  drawPlayer(P, t);
  for (const p of g.proj) drawProj(p, t);
  // 水（蓋在角色上）
  {
    // 水：整片合成一個路徑一次填色，才不會有格線
    const wp = new Path2D(), surfs = [];
    liquid(TL.WATER, (x, y, surf) => { wp.rect(x, y + (surf ? 4 : 0), T, T - (surf ? 4 : 0)); if (surf) surfs.push([x, y]); });
    ctx.fillStyle = 'rgba(40,110,200,.38)'; ctx.fill(wp);
    ctx.save(); ctx.clip(wp); ctx.strokeStyle = 'rgba(160,210,255,.12)'; ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) { const yy = cy + ((k * 97 + t * 14) % VH); ctx.beginPath(); for (let xx = cx; xx < cx + VW; xx += 24) ctx.lineTo(xx, yy + Math.sin(xx * 0.03 + t + k) * 6); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(160,210,255,.7)'; for (const [x, y] of surfs) ctx.fillRect(x, y + 4 + Math.sin(t * 2 + x * 0.05) * 1.5, T + 0.5, 1.5);
  }
  liquid(TL.LAVA, (x, y, surf) => {
    const gr = ctx.createLinearGradient(0, y, 0, y + T); gr.addColorStop(0, '#ff9a3a'); gr.addColorStop(1, '#a82a10');
    ctx.fillStyle = gr; ctx.fillRect(x, y + (surf ? 8 : 0), T + 0.5, T - (surf ? 8 : 0) + 0.5);
    if (surf) { ctx.fillStyle = '#ffe08a'; ctx.fillRect(x, y + 8 + Math.sin(t * 1.5 + x * 0.04) * 1.5, T + 0.5, 2);
      if (hash(x, Math.floor(t * 2)) > 0.85) { ctx.fillStyle = 'rgba(255,220,120,.8)'; ctx.beginPath(); ctx.arc(x + 16, y + 6 - ((t * 2) % 1) * 8, 2.5, 0, 7); ctx.fill(); } }
  });
  // 粒子
  for (const f of g.fx) {
    if (f.k !== 'p' && f.k !== 'spark') continue;
    ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, f.r || 1.5, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── 光影 ──
  drawLighting(g, A, cx, cy, s, t, vis);

  // 提示文字（不受黑暗影響）
  ctx.setTransform(s, 0, 0, s, -cx * s, -cy * s);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const h of Wd.hints) {
    if (h.room !== g.roomIdx || !vis(h.x, h.y, 0)) continue;
    if ((h.need && g.save.abil[h.need]) || (h.have && !g.save.abil[h.have])) continue;
    const d = Math.abs(P.x - h.x);
    if (d > 260) continue;
    ctx.globalAlpha = Math.max(0, 1 - d / 260) * 0.9;
    ctx.font = `600 14px ${FONT}`; ctx.fillStyle = '#e8e2f5'; ctx.fillText(h.text, h.x, h.y);
  }
  ctx.globalAlpha = 1;
  if (P.interact && !P.dead && !g.dialog) {
    const it = P.interact.ref, label = P.interact.kind === 'bench' ? '↑ 休息' : '↑ 閱讀';
    ctx.font = `700 13px ${FONT}`; const w = ctx.measureText(label).width + 16;
    ctx.fillStyle = 'rgba(10,8,18,.75)'; rr(ctx, it.x - w / 2, it.y - 64, w, 22, 11); ctx.fill();
    ctx.fillStyle = '#ffe2a8'; ctx.fillText(label, it.x, it.y - 53);
  }
  ctx.font = `800 14px ${FONT}`;
  for (const f of g.floats) { ctx.globalAlpha = Math.max(0, 1 - f.t / 1.2); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - f.t * 30); }
  ctx.globalAlpha = 1;

  // ── 介面 ──
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,240,220,${Math.min(0.6, g.flash)})`; ctx.fillRect(0, 0, W, H); }
  drawHud(g);
};

function drawLighting(g, A, cx, cy, s, t, vis) {
  const P = g.P, Wd = g.W;
  const ls = s / 2;
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, lcv.width, lcv.height);
  lctx.fillStyle = `rgba(2,1,8,${A.dark})`; lctx.fillRect(0, 0, lcv.width, lcv.height);
  lctx.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, a = 1) => {
    const X = (x - cx) * ls, Y = (y - cy) * ls, Rr = r * ls;
    if (X < -Rr || Y < -Rr || X > lcv.width + Rr || Y > lcv.height + Rr) return;
    const gr = lctx.createRadialGradient(X, Y, 0, X, Y, Rr);
    gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = gr; lctx.fillRect(X - Rr, Y - Rr, Rr * 2, Rr * 2);
  };
  if (!P.dead) light(P.x - P.face * 9, P.y - 12, 250 + Math.sin(t * 7) * 6);
  for (const bn of Wd.benches) if (vis(bn.x, bn.y, 300)) light(bn.x, bn.y - 16, 190 + Math.sin(t * 9 + bn.x) * 8);
  for (const it of Wd.items) if (vis(it.x, it.y, 200)) light(it.x, it.y, it.kind === 'ability' ? 220 : 110, 0.9);
  for (const d of Wd.decor) if ((d.kind === 'fungus' || d.kind === 'furnace' || d.kind === 'waterfall' || d.kind === 'throne') && vis(d.x, d.y, 200)) light(d.x, d.y - 20, d.kind === 'furnace' ? 200 : d.kind === 'waterfall' ? 150 : 110, 0.7);
  for (const tb of Wd.tablets) if (vis(tb.x, tb.y, 100)) light(tb.x, tb.y - 18, 70, 0.6);
  for (const p of g.proj) if (p.t >= 0) light(p.x, p.y, p.kind === 'ring' ? 220 : p.kind === 'pillar' ? 140 : 60, 0.8);
  for (const j of Wd.jets) if (j.state === 'on' && vis(j.x, j.y)) light(j.x + 16, j.y - 20, 150, 0.9);
  for (const b of g.bosses) if (!b.dead && b.st !== 'sleep' && !b.hidden) light(b.x + b.w / 2, b.y + b.h / 2, b.type === 'jelly' ? 260 : 150, b.type === 'jelly' ? 1 : 0.5);
  // 岩漿、菌菇、王座之門
  const c0 = Math.max(0, Math.floor(cx / T) - 2), c1 = Math.min(Wd.W - 1, Math.ceil((cx + VW) / T) + 2);
  const r0 = Math.max(0, Math.floor(cy / T) - 2), r1 = Math.min(Wd.H - 1, Math.ceil((cy + VH) / T) + 2);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c += 2) {
    const tt = Wd.grid[r * Wd.W + c];
    if (tt === TL.LAVA && EM.tileAt(c, r - 1) !== TL.LAVA) light(c * T + 32, r * T, 120, 0.9);
    else if (tt === TL.SHROOM) light(c * T + 16, r * T, 70, 0.7);
    else if (tt === TL.SIGIL) light(c * T + 16, r * T + 16, 90, 0.6);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lcv, 0, 0, cv.width, cv.height);
  // 暖色光暈
  ctx.setTransform(s, 0, 0, s, -cx * s, -cy * s);
  ctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, r, col, a) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  if (!P.dead) glow(P.x - P.face * 9, P.y - 11, 70, '255,170,80', 0.22);
  for (const bn of Wd.benches) if (vis(bn.x, bn.y, 200)) glow(bn.x, bn.y - 14, 90, '255,150,60', 0.25);
  for (const d of Wd.decor) if (d.kind === 'furnace' && vis(d.x, d.y, 200)) glow(d.x, d.y - 30, 120, '255,120,40', 0.25);
  ctx.globalCompositeOperation = 'source-over';
  // 暗角
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vg = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * 0.35, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, cv.width, cv.height);
}

// ───────────── HUD ─────────────
function drawHud(g) {
  const P = g.P, s = g.save;
  const pad = Math.max(12, Math.min(W, H) * 0.025);
  const top = pad + (EM.safeTop || 0);
  // 燼（回復能量）
  const ox = pad + 26, oy = top + 24;
  const cap = 33 * s.maxFlask, k = P.energy / cap;
  ctx.fillStyle = 'rgba(10,8,18,.6)'; ctx.beginPath(); ctx.arc(ox, oy, 24, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(ox, oy, 20, 0, 7); ctx.clip();
  const lg = ctx.createLinearGradient(0, oy + 20, 0, oy - 20); lg.addColorStop(0, '#ff8a3a'); lg.addColorStop(1, '#ffe2a8');
  ctx.fillStyle = lg; ctx.fillRect(ox - 20, oy + 20 - 40 * k, 40, 40 * k);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,226,168,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 21, 0, 7); ctx.stroke();
  for (let i = 1; i < s.maxFlask; i++) { const yy = oy + 20 - 40 * i / s.maxFlask; ctx.strokeStyle = 'rgba(20,10,20,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox - 19, yy); ctx.lineTo(ox + 19, yy); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.font = `800 12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.floor(P.energy / 33), ox, oy + 1);
  // 生命
  for (let i = 0; i < s.maxHp; i++) {
    const x = ox + 40 + i * 22, y = oy - 6, full = i < P.hp;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = full ? '#f2e6d0' : 'rgba(10,8,18,.6)'; ctx.fillRect(-6.5, -6.5, 13, 13);
    ctx.strokeStyle = full ? '#ffb84a' : 'rgba(242,230,208,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(-6.5, -6.5, 13, 13);
    ctx.restore();
  }
  // 印記
  if (s.sigils) for (let i = 0; i < s.sigils; i++) { ctx.fillStyle = '#c79bff'; ctx.beginPath(); ctx.arc(ox + 44 + i * 14, oy + 16, 4, 0, 7); ctx.fill(); }
  // 頭目血條
  if (g.fight) {
    const b = g.fight.boss, bw = Math.min(520, W * 0.6), bx = (W - bw) / 2, byy = H - 46 - (EM.safeBottom || 0) - (document.body.classList.contains('touch') ? 120 : 0);
    ctx.fillStyle = 'rgba(10,8,18,.7)'; ctx.fillRect(bx - 2, byy - 2, bw + 4, 12);
    ctx.fillStyle = '#7a1e2a'; ctx.fillRect(bx, byy, bw * b.hp / b.maxHp, 8);
    ctx.fillStyle = '#ff6a5e'; ctx.fillRect(bx, byy, bw * b.hp / b.maxHp, 3);
    ctx.fillStyle = '#f2e6d0'; ctx.font = `700 14px ${FONT}`; ctx.fillText(b.name, W / 2, byy - 14);
  }
  // 區域／頭目名稱橫幅
  if (g.banner) {
    const bn = g.banner, a = bn.t < 0.6 ? bn.t / 0.6 : bn.t > 2.6 ? Math.max(0, 1 - (bn.t - 2.6) / 0.8) : 1;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#f2e6d0'; ctx.font = `800 ${Math.round(Math.min(44, W * 0.07))}px ${FONT}`; ctx.fillText(bn.title, W / 2, H * 0.32);
    ctx.font = `600 13px ${FONT}`; ctx.fillStyle = 'rgba(242,230,208,.7)'; ctx.fillText(bn.sub.split('').join(bn.boss ? '' : ' '), W / 2, H * 0.32 + 34);
    ctx.strokeStyle = 'rgba(242,230,208,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W / 2 - 120, H * 0.32 + 18); ctx.lineTo(W / 2 + 120, H * 0.32 + 18); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // 死掉
  if (P.dead) {
    const a = Math.min(1, P.deadT / 1.2);
    ctx.fillStyle = `rgba(0,0,0,${a * 0.85})`; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(1, P.deadT / 0.8); ctx.fillStyle = '#f2e6d0'; ctx.font = `800 30px ${FONT}`; ctx.fillText('燈熄了', W / 2, H / 2); ctx.globalAlpha = 1;
  }
}

// ───────────── 地圖 ─────────────
EM.drawMap = function () {
  const g = G(), Wd = g.W, s = g.save;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = 'rgba(6,5,12,.96)'; ctx.fillRect(0, 0, W, H);
  const cell = Math.min((W - 60) / Wd.GW, (H - 140) / Wd.GH);
  const ox = (W - cell * Wd.GW) / 2, oy = (H - cell * Wd.GH) / 2 + 20;
  const sx = cell / EM.CW, sy = cell / EM.CH;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2e6d0'; ctx.font = `800 20px ${FONT}`; ctx.fillText('地圖', W / 2, oy - 40);
  for (const R of Wd.rooms) {
    if (!s.visited.includes(R.id)) continue;
    const A = EM.AREAS[R.area];
    const x = ox + R.x * sx, y = oy + R.y * sy, w = R.w * sx, h = R.h * sy;
    ctx.fillStyle = rgba(A.glow, R.idx === g.roomIdx ? 0.35 : 0.16); ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = rgba(A.glow, 0.7); ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    // 門
    ctx.fillStyle = 'rgba(6,5,12,1)';
    for (const [dx, dy, horiz] of R.openings || []) {
      if (horiz) ctx.fillRect(ox + dx * sx, oy + dy * sy - 3, sx + 0.6, 6); else ctx.fillRect(ox + dx * sx - 3, oy + dy * sy, 6, sy + 0.6);
    }
    ctx.fillStyle = 'rgba(242,230,208,.55)'; ctx.font = `600 ${Math.max(9, Math.min(12, cell * 0.12))}px ${FONT}`; ctx.fillText(R.name, x + w / 2, y + h / 2);
  }
  for (const bn of Wd.benches) {
    const R = Wd.rooms[bn.room]; if (!s.visited.includes(R.id)) continue;
    const x = ox + bn.x / T * sx, y = oy + bn.y / T * sy;
    ctx.fillStyle = s.bench === bn.id ? '#ffb84a' : '#a07040'; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.quadraticCurveTo(x + 5, y - 2, x, y); ctx.quadraticCurveTo(x - 5, y - 2, x, y - 9); ctx.fill();
  }
  for (const d of Wd.bosses) {
    const R = Wd.rooms[d.room]; if (!s.visited.includes(R.id)) continue;
    const x = ox + d.x / T * sx, y = oy + d.y / T * sy - 8, dead = s.bosses.includes(d.type);
    ctx.fillStyle = dead ? 'rgba(160,150,170,.6)' : '#ff6a5e'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a0810'; ctx.fillRect(x - 3, y - 2, 2, 2); ctx.fillRect(x + 1, y - 2, 2, 2);
  }
  const P = g.P;
  if (Math.floor(g.t * 3) % 2 === 0 || true) { const x = ox + P.x / T * sx, y = oy + (P.y - 12) / T * sy; ctx.fillStyle = '#ffe2a8'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.fillStyle = 'rgba(242,230,208,.6)'; ctx.font = `600 13px ${FONT}`;
  const area = EM.AREAS[Wd.rooms[g.roomIdx].area];
  const total = EM.totalItems(), got = s.items.length;
  ctx.fillText(`${area.name}　·　收集 ${got} / ${total}　·　印記 ${s.sigils} / 3`, W / 2, oy + cell * Wd.GH + 26);
  ctx.fillText('按 M 或 Esc 關閉', W / 2, oy + cell * Wd.GH + 48);
};
})();
