'use strict';
// 武器成長：
// - 等級上限跟著關卡解鎖（第 1 關 Lv4，每關 +1，第 5 關起 Lv8；第二輪直接 Lv8）
// - 到特定等級會「進化」出新招式：
//   紅 Lv4 翼砲、Lv6 後方砲、Lv8 火龍追蹤彈
//   藍 Lv5 雙副雷射、Lv8 超級貫穿雷射（不會被擋住，整條線上的敵人都打）
//   紫 Lv6 連鎖電擊（跳到旁邊的敵人）、Lv8 雙重連鎖

const LV_CAP = [4, 5, 6, 7, 8, 8, 8, 8];
function wCap() { return G.round > 1 ? 8 : (LV_CAP[G.stage] ?? 8); }
const EVO = {
  red: { 4: '翼砲展開', 6: '後方砲', 8: '火龍追蹤彈' },
  blue: { 5: '雙副雷射', 8: '超級貫穿雷射' },
  purple: { 6: '連鎖電擊', 8: '雙重連鎖' },
};

// ---------- 開火 ----------
const _fireBase = firePrimary;
firePrimary = function (dt) {
  if (P.w === 'blue') { P.beamOn = true; return; }
  _fireBase(dt);
  if (P.w === 'red' && P.ft > 0.06) { // 剛開過一輪火
    const L = P.lvl;
    if (L >= 6 && P.alt) for (const s of [-1, 1]) pbShot(P.x + s * 6, P.y + 10, s * (Math.PI - 0.5), 'v');
  }
  if (P.w === 'red' && P.lvl >= 8) {
    P.dragonT = (P.dragonT || 0) - dt;
    if (P.dragonT <= 0) {
      P.dragonT = 0.38;
      for (const s of [-1, 1]) G.pb.push({ x: P.x + s * 10, y: P.y - 6, vx: s * 220, vy: -200, kind: 'fd', dmg: 2.4, life: 1.7, fr: [] });
    }
  }
};

// ---------- 雷射：主光束＋副光束，Lv8 貫穿 ----------
P.beams = [
  { ox: 0, oy: -22, ws: 1, dk: 1, k: 0, hist: [], pts: [], endY: -30, hits: [], sparkT: 0 },
  { ox: -13, oy: -2, ws: 0.36, dk: 0.3, k: 0, hist: [], pts: [], endY: -30, hits: [], sparkT: 0 },
  { ox: 13, oy: -2, ws: 0.36, dk: 0.3, k: 0, hist: [], pts: [], endY: -30, hits: [], sparkT: 0 },
];
updateBeam = function (dt) {
  const on = P.beamOn && P.alive && P.w === 'blue' && !P.auto;
  P.beamOn = false;
  const L = P.lvl, pierce = L >= 8, dpsBase = 24 + L * 6.5;
  P.beams.forEach((B, bi) => {
    const active = on && (bi === 0 || L >= 5);
    B.k = clamp(B.k + (active ? dt / 0.06 : -dt / 0.12), 0, 1);
    B.hist.unshift(P.x + B.ox); if (B.hist.length > 40) B.hist.length = 40;
    const nose = P.y + B.oy, pts = [];
    for (let i = 0; ; i++) { const y = nose - i * 18; pts.push([B.hist[Math.min(i, B.hist.length - 1)] ?? P.x, y]); if (y < -30) break; }
    B.pts = pts; B.endY = -30; B.hits = [];
    if (!active) return;
    const w = beamW() * B.ws * (pierce && bi === 0 ? 1.1 : 1);
    const cands = [];
    for (const e of G.enemies) {
      if (e.dead || e.hidden || e.inv) continue;
      let hy = null;
      for (const [cx, cy, r] of hitCircles(e)) {
        if (cy > nose + r || cy < -20) continue;
        if (Math.abs(cx - beamX(pts, cy)) < r * 0.85 + w / 2) { const y = Math.min(nose, cy + r * 0.55); if (hy === null || y > hy) hy = y; }
      }
      if (hy !== null) cands.push([e, hy]);
    }
    if (!cands.length) return;
    cands.sort((a, b) => b[1] - a[1]);
    const targets = pierce && bi === 0 ? cands : [cands[0]];
    if (!(pierce && bi === 0)) B.endY = targets[0][1];
    for (const [e, hy] of targets) {
      hurt(e, dpsBase * B.dk * (pierce && bi === 0 ? 0.8 : 1) * dt, 'blue'); pulseFlash(e);
      B.hits.push([beamX(pts, hy), hy]);
    }
    B.sparkT -= dt;
    if (B.sparkT <= 0) {
      B.sparkT = bi ? 0.08 : 0.035;
      for (const [x, y] of B.hits) {
        const a = -Math.PI / 2 + rnd(-1.3, 1.3);
        fxP({ k: 'k', x, y, vx: Math.cos(a) * rnd(90, 220), vy: Math.sin(a) * rnd(90, 220) + 60, life: 0, max: rnd(0.15, 0.3), c: 'b' });
        if (!bi) fxP({ k: 'f', x: x + rnd(-3, 3), y: y + rnd(-3, 3), vx: 0, vy: 0, r: w * 0.35, life: 0, max: 0.12, c: 'b' });
      }
      Snd.play('hit');
    }
  });
  P.beam.k = P.beams[0].k;
  Snd.hum('laser', on ? (L >= 8 ? 0.065 : 0.05) : 0);
};
drawBeam = function (ctx) {
  if (!P.alive) return;
  const pierce = P.lvl >= 8;
  P.beams.forEach((B, bi) => {
    if (B.k <= 0.01) return;
    const k = B.k, w = beamW() * B.ws * (pierce && !bi ? 0.9 : 1) * (0.4 + 0.6 * k);
    const pts = []; for (const p of B.pts) { pts.push(p); if (p[1] <= B.endY) break; }
    if (pts.length < 2) return;
    const last = pts[pts.length - 1], prev = pts[pts.length - 2];
    if (last[1] < B.endY) { const t = (prev[1] - B.endY) / (prev[1] - last[1] || 1); pts[pts.length - 1] = [prev[0] + (last[0] - prev[0]) * t, B.endY]; }
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); };
    const fl = 0.85 + 0.15 * Math.sin(G.t * 60 + bi);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    path();
    const hue = pierce && !bi ? [150, 120, 255] : [30, 110, 255];
    ctx.strokeStyle = `rgba(${hue[0]},${hue[1]},${hue[2]},${(pierce && !bi ? 0.14 : 0.22) * k})`; ctx.lineWidth = w + (bi ? 8 : 16); ctx.stroke();
    ctx.strokeStyle = pierce && !bi ? `rgba(110,90,255,${0.45 * k})` : `rgba(60,170,255,${0.55 * k})`; ctx.lineWidth = w + (bi ? 2 : 5); ctx.stroke();
    ctx.strokeStyle = pierce && !bi ? `rgba(150,120,255,${0.6 * k})` : `rgba(140,225,255,${0.9 * k})`; ctx.lineWidth = w * fl; ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * k})`; ctx.lineWidth = Math.max(1, w * 0.32); ctx.stroke();
    ctx.setLineDash([10, 26]); ctx.lineDashOffset = G.t * 900 + bi * 13;
    ctx.strokeStyle = `rgba(230,250,255,${(pierce && !bi ? 0.25 : 0.55) * k})`; ctx.lineWidth = w * 0.7; ctx.stroke();
    ctx.setLineDash([]);
    if (pierce && !bi) { // 超級雷射：外圈旋轉光紋
      ctx.setLineDash([3, 14]); ctx.lineDashOffset = -G.t * 600;
      ctx.strokeStyle = `rgba(190,150,255,${0.35 * k})`; ctx.lineWidth = w + 12; ctx.stroke(); ctx.setLineDash([]);
    }
    const nx = pts[0][0], ny = pts[0][1];
    glowDot(ctx, nx, ny, w * 1.7 * fl, `rgba(120,220,255,${0.9 * k})`);
    glowDot(ctx, nx, ny, w * 0.7, `rgba(255,255,255,${k})`);
    for (const [ex, ey] of B.hits) {
      const r = w * (bi ? 2.4 : 2) * (1 + Math.random() * 0.3);
      glowDot(ctx, ex, ey, r, 'rgba(150,230,255,.95)');
      glowDot(ctx, ex, ey, r * 0.45, 'rgba(255,255,255,1)');
      if (!bi) { ctx.strokeStyle = 'rgba(200,245,255,.8)'; ctx.lineWidth = 1.4; for (let i = 0; i < 4; i++) { const a = G.t * 7 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a) * r * 1.3, ey + Math.sin(a) * r * 0.7); ctx.stroke(); } }
    }
    ctx.restore();
  });
};

// ---------- 電漿：連鎖電擊 ----------
const _plasmaBase = plasmaTick;
plasmaTick = function (dt) {
  _plasmaBase(dt);
  const L = P.lvl, jumps = L >= 8 ? 2 : L >= 6 ? 1 : 0, dps = 12 + L * 1.3;
  const used = new Set(P.tend.map(t => t.e).filter(Boolean));
  for (const t of P.tend) {
    t.chain = [];
    if (!t.e || !jumps) continue;
    let from = t.e;
    for (let j = 0; j < jumps; j++) {
      let best = null, bd = 120 * 120;
      for (const e of G.enemies) {
        if (e.dead || e.hidden || e.inv || used.has(e) || e.y < 0 || e.y > H) continue;
        const d = d2(e.x, e.y, from.x, from.y); if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      used.add(best); t.chain.push([from, best]);
      hurt(best, dps * (j ? 0.35 : 0.5) * dt, 'purple'); pulseFlash(best);
      from = best;
    }
  }
};
const _drawPlasmaBase = drawPlasma;
drawPlasma = function (ctx) {
  _drawPlasmaBase(ctx);
  if (!P.alive) return;
  const fr = Math.floor(G.t * 30);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  P.tend.forEach((t, ti) => {
    (t.chain || []).forEach(([a, b], ci) => {
      if (a.dead || b.dead) return;
      const pts = [[a.x, a.y]], N = 8;
      for (let i = 1; i < N; i++) { const u = i / N; pts.push([a.x + (b.x - a.x) * u + (hash(i, fr, ti * 9 + ci) - 0.5) * 14, a.y + (b.y - a.y) * u + (hash(fr, i, ti * 9 + ci) - 0.5) * 14]); }
      pts.push([b.x, b.y]);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]);
      ctx.strokeStyle = 'rgba(150,60,255,.3)'; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = 'rgba(210,140,255,.8)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,245,255,.95)'; ctx.lineWidth = 1.2; ctx.stroke();
      glowDot(ctx, b.x, b.y, 12, 'rgba(190,90,255,.8)');
    });
  });
  ctx.restore();
};

// ---------- 火龍追蹤彈 ----------
const _updatePBBase = updatePB;
updatePB = function (dt) {
  for (const b of G.pb) {
    if (b.kind !== 'fd') continue;
    b.life -= dt;
    if (!b.tg || b.tg.dead || b.tg.hidden) b.tg = nearestEnemy(b.x, b.y);
    let a = Math.atan2(b.vy, b.vx);
    a = b.tg ? turnTo(a, Math.atan2(b.tg.y - b.y, b.tg.x - b.x), 7 * dt) : turnTo(a, -Math.PI / 2, 3 * dt);
    b.vx = Math.cos(a) * 470; b.vy = Math.sin(a) * 470;
    b.fr.unshift([b.x, b.y]); if (b.fr.length > 10) b.fr.length = 10;
  }
  _updatePBBase(dt);
};
const _drawPBBase = drawPB;
drawPB = function (ctx) {
  _drawPBBase(ctx);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const b of G.pb) {
    if (b.kind !== 'fd') continue;
    for (let i = 1; i < b.fr.length; i++) {
      const t = i / b.fr.length;
      ctx.strokeStyle = `rgba(255,${150 - t * 100 | 0},40,${0.8 * (1 - t)})`; ctx.lineWidth = 7 * (1 - t) + 1;
      ctx.beginPath(); ctx.moveTo(b.fr[i - 1][0], b.fr[i - 1][1]); ctx.lineTo(b.fr[i][0], b.fr[i][1]); ctx.stroke();
    }
    glowDot(ctx, b.x, b.y, 9, 'rgba(255,170,60,.95)');
    glowDot(ctx, b.x, b.y, 3.5, 'rgba(255,255,220,1)');
  }
  ctx.restore();
};

// ---------- 撿道具：顯示進化 ----------
const _collectEvo = collect;
collect = function (it) {
  const w0 = P.w, l0 = P.lvl;
  _collectEvo(it);
  if (it.kind !== 'P') return;
  const name = (EVO[P.w] || {})[P.lvl];
  if (name && (P.w !== w0 || P.lvl > l0)) G.queue.push({ t: G.st + 0.45, fn: () => { popText(P.x, P.y - 48, '進化！' + name, '#7dffb0'); Snd.play('1up'); } });
};
