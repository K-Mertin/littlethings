'use strict';
// 武器 v2：讓每種武器看起來連貫、有份量
// - 紅：火神砲曳光彈連成一道道火線，砲口閃光，翼砲
// - 藍：一整條連續雷射光束，跟著飛機擺動彎曲，打到第一個敵人就停在那裡，命中點有火花
// - 紫：電漿閃電會「滑」到新目標（不會瞬間跳），有分岔小電弧和命中光球
// - 飛彈：煙霧尾跡連成一條線
// - 雷射與電漿有持續的嗡嗡聲（不再是一格一格的嗶嗶聲）

Object.assign(P, { beam: { k: 0, hist: [], pts: [], endY: 0, hit: null, sparkT: 0, on: false }, tend: [], mf: 0, aura: 0, auraCol: '#fff', alt: 0 });

// ---------- 持續音效 ----------
Snd.hums = {};
Snd.makeHum = function (name) {
  const c = this.ctx, g = c.createGain(); g.gain.value = 0; g.connect(this.sfxG);
  if (name === 'laser') {
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; f.Q.value = 4; f.connect(g);
    const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 220;
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 441;
    const lfo = c.createOscillator(); lfo.frequency.value = 9; const lg = c.createGain(); lg.gain.value = 14; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    const m2 = c.createGain(); m2.gain.value = 0.35; o2.connect(m2); m2.connect(f); o1.connect(f);
    o1.start(); o2.start(); lfo.start();
  } else {
    const s = c.createBufferSource(); s.buffer = this.nb; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
    const am = c.createGain(); am.gain.value = 0.6;
    const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 17; const lg = c.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    s.connect(f); f.connect(am); am.connect(g);
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 74; const og = c.createGain(); og.gain.value = 0.35; o.connect(og); og.connect(g);
    s.start(); lfo.start(); o.start();
  }
  return { g, level: 0 };
};
Snd.hum = function (name, level) {
  if (!this.ctx) return;
  if (!Store.data.sfx) level = 0;
  let h = this.hums[name];
  if (!h) { if (!level) return; h = this.hums[name] = this.makeHum(name); }
  if (Math.abs(h.level - level) < 0.001) return;
  h.level = level; h.g.gain.setTargetAtTime(level, this.ctx.currentTime, 0.035);
};
Snd.humAll = function (level) { for (const k in this.hums) this.hum(k, level); };

// ---------- 開火 ----------
firePrimary = function (dt) {
  const L = P.lvl;
  if (P.w === 'red') {
    if (P.ft > 0) return;
    P.ft = Math.max(P.ft, -0.03) + 0.07;
    P.alt ^= 1;
    const j = P.alt ? 1.6 : -1.6;
    const n = [2, 3, 4, 5, 5, 6, 7, 8][L - 1], spread = [0, 7, 12, 17, 22, 27, 32, 38][L - 1] * Math.PI / 180;
    if (n === 2 && !spread) { pbShot(P.x - 5 + j * 0.4, P.y - 16, 0, 'v'); pbShot(P.x + 5 + j * 0.4, P.y - 16, 0, 'v'); }
    else for (let i = 0; i < n; i++) { const a = -spread + 2 * spread * i / (n - 1) + j * 0.004; pbShot(P.x + Math.sin(a) * 8 + j * 0.5, P.y - 16, a, 'v'); }
    if (L >= 4) for (const s of [-1, 1]) pbShot(P.x + s * 13, P.y + 2, s * 0.03, 'v');
    P.mf = 0.05;
    Snd.play('shot');
  } else if (P.w === 'blue') {
    P.beam.on = true;
  } else {
    plasmaTick(dt);
  }
};
fireSub = function () {
  if (!P.sub || P.st > 0) return;
  const L = P.sl;
  if (P.sub === 'M') {
    P.st = [0.55, 0.45, 0.4, 0.32][L - 1];
    const offs = L >= 3 ? [-14, -7, 7, 14] : [-9, 9];
    for (const o of offs) G.pb.push({ x: P.x + o, y: P.y, vx: o * 2, vy: -140, kind: 'm', dmg: 4, a: 0, tr: [] });
  } else {
    P.st = [0.6, 0.5, 0.45, 0.38][L - 1];
    const n = [2, 2, 3, 4][L - 1];
    for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.9; G.pb.push({ x: P.x, y: P.y, vx: Math.sin(a) * 260, vy: -Math.cos(a) * 160, kind: 'h', dmg: 3, a, life: 2.6, tr: [] }); }
  }
  Snd.play('missile');
};
function pulseFlash(e) { e.flash = Math.floor(G.t * 18) % 2 ? 0.05 : 0; }

// ---------- 雷射光束 ----------
const beamW = () => 5 + P.lvl * 1.5;
function beamX(pts, y) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (y <= a[1] && y >= b[1]) { const t = (a[1] - y) / (a[1] - b[1] || 1); return a[0] + (b[0] - a[0]) * t; }
  }
  return pts.length ? pts[pts.length - 1][0] : P.x;
}
function updateBeam(dt) {
  const B = P.beam;
  const active = B.on && P.alive && P.w === 'blue' && !P.auto;
  B.k = clamp(B.k + (active ? dt / 0.06 : -dt / 0.12), 0, 1);
  B.hist.unshift(P.x); if (B.hist.length > 40) B.hist.length = 40;
  const nose = P.y - 22, seg = 18, pts = [];
  for (let i = 0; ; i++) {
    const y = nose - i * seg;
    pts.push([B.hist[Math.min(i, B.hist.length - 1)] ?? P.x, y]);
    if (y < -30) break;
  }
  B.pts = pts; B.endY = -30; B.hit = null;
  if (active) {
    const w = beamW();
    let best = null, by = -1e9;
    for (const e of G.enemies) {
      if (e.dead || e.hidden || e.inv) continue;
      for (const [cx, cy, r] of hitCircles(e)) {
        if (cy > nose + r || cy < -20) continue;
        const xb = beamX(pts, cy);
        if (Math.abs(cx - xb) < r * 0.85 + w / 2) { const hy = Math.min(nose, cy + r * 0.55); if (hy > by) { by = hy; best = e; } }
      }
    }
    if (best) {
      B.hit = best; B.endY = by;
      hurt(best, (24 + P.lvl * 6.5) * dt); pulseFlash(best);
      B.sparkT -= dt;
      if (B.sparkT <= 0) {
        B.sparkT = 0.035;
        const x = beamX(pts, by);
        for (let i = 0; i < 2; i++) { const a = -Math.PI / 2 + rnd(-1.3, 1.3); fxP({ k: 'k', x, y: by, vx: Math.cos(a) * rnd(90, 220), vy: Math.sin(a) * rnd(90, 220) + 60, life: 0, max: rnd(0.15, 0.3), c: 'b' }); }
        fxP({ k: 'f', x: x + rnd(-3, 3), y: by + rnd(-3, 3), vx: 0, vy: 0, r: w * 0.35, life: 0, max: 0.12, c: 'b' });
        Snd.play('hit');
      }
    }
  }
  Snd.hum('laser', active ? 0.05 : 0);
  B.on = false;
}
function drawBeam(ctx) {
  const B = P.beam;
  if (B.k <= 0.01 || !P.alive) return;
  const w = beamW() * (0.4 + 0.6 * B.k), k = B.k;
  const pts = []; for (const p of B.pts) { pts.push(p); if (p[1] <= B.endY) break; }
  if (pts.length < 2) return;
  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  if (last[1] < B.endY) { const t = (prev[1] - B.endY) / (prev[1] - last[1] || 1); pts[pts.length - 1] = [prev[0] + (last[0] - prev[0]) * t, B.endY]; }
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); };
  const fl = 0.85 + 0.15 * Math.sin(G.t * 60);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  path();
  ctx.strokeStyle = `rgba(30,110,255,${0.22 * k})`; ctx.lineWidth = w + 16; ctx.stroke();
  ctx.strokeStyle = `rgba(60,170,255,${0.55 * k})`; ctx.lineWidth = w + 5; ctx.stroke();
  ctx.strokeStyle = `rgba(140,225,255,${0.9 * k})`; ctx.lineWidth = w * fl; ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.95 * k})`; ctx.lineWidth = Math.max(1.2, w * 0.32); ctx.stroke();
  ctx.setLineDash([10, 26]); ctx.lineDashOffset = G.t * 900;
  ctx.strokeStyle = `rgba(230,250,255,${0.55 * k})`; ctx.lineWidth = w * 0.7; ctx.stroke();
  ctx.setLineDash([]);
  // 砲口光
  const nx = pts[0][0], ny = pts[0][1];
  glowDot(ctx, nx, ny, w * 1.7 * fl, `rgba(120,220,255,${0.9 * k})`);
  glowDot(ctx, nx, ny, w * 0.7, `rgba(255,255,255,${k})`);
  // 命中點
  if (B.hit) {
    const ex = pts[pts.length - 1][0], ey = pts[pts.length - 1][1], r = w * (2 + Math.random() * 0.6);
    glowDot(ctx, ex, ey, r, 'rgba(150,230,255,.95)');
    glowDot(ctx, ex, ey, r * 0.45, 'rgba(255,255,255,1)');
    ctx.strokeStyle = 'rgba(200,245,255,.8)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) { const a = G.t * 7 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a) * r * 1.3, ey + Math.sin(a) * r * 0.7); ctx.stroke(); }
  }
  ctx.restore();
}

// ---------- 電漿閃電 ----------
function plasmaTick(dt) {
  const L = P.lvl, nt = [1, 1, 2, 2, 3, 3, 4, 4][L - 1], dps = 12 + L * 1.3;
  const list = G.enemies.filter(e => !e.dead && !e.hidden && !e.inv && e.y > 0 && e.y < H && e.x > 0 && e.x < W)
    .sort((a, b) => d2(a.x, a.y, P.x, P.y) - d2(b.x, b.y, P.x, P.y));
  while (P.tend.length < nt) P.tend.push({ x: P.x, y: P.y - 40, cx: P.x, cy: P.y - 60, e: null, side: P.tend.length % 2 ? 1 : -1, k: 0 });
  P.tend.length = nt;
  P.tend.forEach((t, i) => {
    t.k = Math.min(1, t.k + dt / 0.08); t.live = true;
    const e = list.length ? list[i % list.length] : null;
    let tx, ty;
    if (e) { tx = e.x; ty = e.y; }
    else { tx = P.x + (i - (nt - 1) / 2) * 30 + Math.sin(G.t * 3 + i * 2) * 18; ty = P.y - 150 - Math.sin(G.t * 2.3 + i) * 25; }
    const f = Math.min(1, dt * (e ? 18 : 8));
    t.x += (tx - t.x) * f; t.y += (ty - t.y) * f;
    const ox = P.x + t.side * (nt >= 3 && i >= 2 ? 13 : 6);
    const ccx = ox + t.side * 45 + (t.x - ox) * 0.2, ccy = Math.min(P.y - 60, (P.y + t.y) / 2);
    t.cx += (ccx - t.cx) * Math.min(1, dt * 10); t.cy += (ccy - t.cy) * Math.min(1, dt * 10);
    t.ox = ox;
    t.e = e && d2(t.x, t.y, e.x, e.y) < 26 * 26 ? e : null;
    if (t.e) { hurt(t.e, dps * dt * (list.length < nt && i >= list.length ? 0.6 : 1)); pulseFlash(t.e); if (Math.random() < dt * 25) fxP({ k: 'k', x: t.x, y: t.y, vx: rnd(-150, 150), vy: rnd(-150, 150), life: 0, max: 0.2, c: 'p' }); }
  });
  P.plasma = P.tend;
}
function updatePlasma(dt) {
  let any = false;
  for (const t of P.tend) {
    if (!t.live) t.k = Math.max(0, t.k - dt / 0.12);
    t.live = false;
    if (t.k > 0) any = true;
  }
  if (!any || P.w !== 'purple' || !P.alive) { if (P.w !== 'purple' || !P.alive) P.tend.length = 0; }
  Snd.hum('plasma', P.tend.some(t => t.e) && P.alive ? 0.06 : P.tend.some(t => t.k > 0.5) && P.alive ? 0.025 : 0);
}
function drawPlasma(ctx) {
  if (!P.alive || !P.tend.length) return;
  const fr = Math.floor(G.t * 30);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  P.tend.forEach((t, ti) => {
    if (t.k <= 0) return;
    const sx = t.ox ?? P.x, sy = P.y - 18, pts = [];
    const N = 14;
    for (let i = 0; i <= N; i++) {
      const u = i / N, iu = 1 - u;
      let x = iu * iu * sx + 2 * iu * u * t.cx + u * u * t.x, y = iu * iu * sy + 2 * iu * u * t.cy + u * u * t.y;
      if (i && i < N) { const amp = 5 * Math.sin(u * Math.PI); x += (hash(i, fr, ti) - 0.5) * amp * 2; y += (hash(fr, i, ti) - 0.5) * amp * 2; }
      pts.push([x, y]);
    }
    const line = (arr) => { ctx.beginPath(); ctx.moveTo(arr[0][0], arr[0][1]); for (let i = 1; i < arr.length; i++) ctx.lineTo(arr[i][0], arr[i][1]); };
    const k = t.k;
    line(pts);
    ctx.strokeStyle = `rgba(150,50,255,${0.25 * k})`; ctx.lineWidth = 12; ctx.stroke();
    ctx.strokeStyle = `rgba(200,120,255,${0.7 * k})`; ctx.lineWidth = 4.5; ctx.stroke();
    ctx.strokeStyle = `rgba(255,240,255,${0.95 * k})`; ctx.lineWidth = 1.7; ctx.stroke();
    // 分岔小電弧
    for (let b = 0; b < 3; b++) {
      const i = 3 + ((hash(b, fr, ti + 7) * (N - 5)) | 0), p = pts[i];
      const a = Math.atan2(pts[i + 1][1] - p[1], pts[i + 1][0] - p[0]) + (hash(fr, b, ti) > 0.5 ? 1 : -1) * rnd(0.5, 1.1);
      const L = rnd(8, 18), mx = p[0] + Math.cos(a) * L * 0.5 + rnd(-3, 3), my = p[1] + Math.sin(a) * L * 0.5 + rnd(-3, 3);
      ctx.strokeStyle = `rgba(220,160,255,${0.6 * k})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(mx, my); ctx.lineTo(p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L); ctx.stroke();
    }
    glowDot(ctx, sx, sy, 7 * k, `rgba(220,150,255,${0.9 * k})`);
    if (t.e) {
      const r = 10 + Math.sin(G.t * 40 + ti) * 3;
      glowDot(ctx, t.x, t.y, r * 1.6, 'rgba(190,90,255,.85)');
      glowDot(ctx, t.x, t.y, r * 0.6, 'rgba(255,240,255,1)');
      ctx.strokeStyle = 'rgba(230,180,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(t.x, t.y, r + 4 + (G.t * 60 % 8), 0, TAU); ctx.stroke();
    } else glowDot(ctx, t.x, t.y, 5 * k, `rgba(220,160,255,${0.7 * k})`);
  });
  ctx.restore();
}

// ---------- 子彈更新 ----------
updatePB = function (dt) {
  P.mf = Math.max(0, P.mf - dt); P.aura = Math.max(0, P.aura - dt);
  updateBeam(dt);
  updatePlasma(dt);
  for (const b of G.pb) {
    if (b.kind === 'm') { b.vy = Math.max(-650, b.vy - 1400 * dt); b.vx *= 0.9; }
    else if (b.kind === 'h') {
      b.life -= dt;
      if (!b.tg || b.tg.dead || b.tg.hidden) b.tg = nearestEnemy(b.x, b.y);
      const sp = 440;
      let a = Math.atan2(b.vy, b.vx);
      if (b.tg) a = turnTo(a, Math.atan2(b.tg.y - b.y, b.tg.x - b.x), 6.5 * dt);
      else a = turnTo(a, -Math.PI / 2, 3 * dt);
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
    }
    if (b.tr) { b.tr.unshift([b.x, b.y]); if (b.tr.length > 14) b.tr.length = 14; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -70 || b.y > H + 20 || b.x < -20 || b.x > W + 20 || b.life < 0) { b.dead = true; continue; }
    for (const e of G.enemies) {
      if (e.dead || e.hidden || e.y < -10) continue;
      if (hitTest(e, b)) {
        hurt(e, b.dmg); b.dead = true;
        if (b.kind === 'v') {
          fxP({ k: 'f', x: b.x, y: b.y - 2, vx: 0, vy: 0, r: 3.5, life: 0, max: 0.08 });
          for (let i = 0; i < 2; i++) fxP({ k: 'k', x: b.x, y: b.y, vx: rnd(-90, 90), vy: rnd(30, 140), life: 0, max: 0.14 });
        } else {
          fxP({ k: 'f', x: b.x, y: b.y, vx: 0, vy: 0, r: 9, life: 0, max: 0.28 });
          fxP({ k: 'r', x: b.x, y: b.y, r: 3, R: 16, life: 0, max: 0.22 });
          for (let i = 0; i < 4; i++) fxP({ k: 'k', x: b.x, y: b.y, vx: rnd(-140, 140), vy: rnd(-140, 140), life: 0, max: 0.25 });
          for (let i = 0; i < 2; i++) fxP({ k: 's', x: b.x, y: b.y, vx: rnd(-20, 20), vy: rnd(-20, 20), r: 4, life: 0, max: 0.6, a: 0.35 });
        }
        Snd.play('hit');
        break;
      }
    }
  }
  G.pb = G.pb.filter(b => !b.dead);
};

// ---------- 畫面 ----------
drawPB = function (ctx) {
  // 飛彈煙霧尾跡
  for (const b of G.pb) {
    if (!b.tr || b.tr.length < 2) continue;
    for (let i = 1; i < b.tr.length; i++) {
      const a = b.tr[i - 1], c = b.tr[i], t = i / b.tr.length;
      ctx.strokeStyle = `rgba(200,205,210,${0.32 * (1 - t)})`; ctx.lineWidth = 2 + t * 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  // 火神砲曳光彈：連成火線
  ctx.beginPath();
  for (const b of G.pb) if (b.kind === 'v') { ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.04, b.y - b.vy * 0.04); }
  ctx.strokeStyle = 'rgba(255,150,40,.42)'; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,120,.85)'; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.beginPath();
  for (const b of G.pb) if (b.kind === 'v') { ctx.moveTo(b.x, b.y + 1); ctx.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016); }
  ctx.strokeStyle = 'rgba(255,255,240,1)'; ctx.lineWidth = 1.3; ctx.stroke();
  // 飛彈尾焰
  for (const b of G.pb) {
    if (b.kind !== 'm' && b.kind !== 'h') continue;
    const a = Math.atan2(b.vy, b.vx), fx = b.x - Math.cos(a) * 9, fy = b.y - Math.sin(a) * 9;
    glowDot(ctx, fx, fy, 6 + Math.random() * 2, b.kind === 'm' ? 'rgba(255,170,60,.9)' : 'rgba(120,255,160,.9)');
  }
  // 砲口閃光
  if (P.mf > 0 && P.alive) {
    const k = P.mf / 0.05;
    glowDot(ctx, P.x, P.y - 22, 9 * k + 3, 'rgba(255,220,120,.9)');
    ctx.fillStyle = `rgba(255,250,220,${k})`;
    ctx.beginPath(); ctx.moveTo(P.x - 2.5, P.y - 20); ctx.lineTo(P.x, P.y - 34 - Math.random() * 6); ctx.lineTo(P.x + 2.5, P.y - 20); ctx.fill();
    if (P.lvl >= 4) for (const s of [-1, 1]) glowDot(ctx, P.x + s * 13, P.y - 2, 6 * k + 2, 'rgba(255,210,110,.85)');
  }
  // 吃到道具的光環
  if (P.aura > 0 && P.alive) {
    const t = 1 - P.aura / 0.6;
    ctx.strokeStyle = P.auraCol; ctx.globalAlpha = 1 - t; ctx.lineWidth = 3 * (1 - t) + 1;
    ctx.beginPath(); ctx.arc(P.x, P.y, 16 + t * 34, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.restore();
  for (const b of G.pb) if (b.kind === 'm' || b.kind === 'h') Art.draw(ctx, b.kind === 'm' ? 'mis' : 'hmis', b.x, b.y, Math.atan2(b.vy, b.vx) + Math.PI / 2);
  drawBeam(ctx);
  drawPlasma(ctx);
};

// 吃到武器道具時的光環
const _collect = collect;
collect = function (it) {
  _collect(it);
  if (it.kind === 'P' || it.kind === 'S') {
    const k = it.kind === 'P' ? P.w : P.sub;
    P.aura = 0.6; P.auraCol = ITEM_COL[k] ? ITEM_COL[k][0] : '#fff';
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; fxP({ k: 'k', x: P.x, y: P.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0, max: 0.3, c: it.kind === 'P' ? P.w[0] : 'g' }); }
  }
};
