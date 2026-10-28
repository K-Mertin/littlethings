'use strict';
// 深淵地牢：畫面繪製（地形、光影、角色、特效、環境粒子、小地圖）
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const now = () => performance.now() / 1000;
const FR = { idle0: { fr: 'idle', i: 0 }, idle1: { fr: 'idle', i: 1 }, walk0: { fr: 'walk', i: 0 }, walk1: { fr: 'walk', i: 1 }, atk0: { fr: 'atk', i: 0 }, atk1: { fr: 'atk', i: 1 } };

const FX = {
  parts: [], nums: [], projs: [], rings: [], decals: [], slashes: [], dying: [], lights: [], pops: new Map(), shakeAmt: 0, hurtT: 0, pd: 0, flashT: 0, flashCol: '255,255,255',
  _d() { return this.pd; },
  delayNext(d) { this.pd = Math.max(this.pd, d); if (!this._q) { this._q = 1; Promise.resolve().then(() => { this.pd = 0; this._q = 0; }); } },
  // 短暫的動態光源（法術、爆炸）：格子座標、半徑（格）、'r,g,b'、強度、持續秒數
  light(x, y, r, rgb, a = 0.5, dur = 0.4, grow) { if (this.lights.length < 24) this.lights.push({ x, y, r, col: 'rgba(' + rgb + ',A)', a, dur, grow, t0: now() + this._d() }); },
  burst(x, y, col, n = 8) {
    if (Render.q >= 2) n = Math.ceil(n / 2);
    const t0 = now() + this._d();
    for (let i = 0; i < n && this.parts.length < 500; i++) { const a = Math.random() * TAU, s = fx_rand(1.5, 5); this.parts.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, t0, life: fx_rand(0.3, 0.7), col, sz: fx_rand(1, 2.4), g: 9 }); }
  },
  spark(x, y, col = '#fff6d0', n = 6) {
    const t0 = now() + this._d();
    for (let i = 0; i < n; i++) { const a = i / n * TAU + Math.random() * 0.5; this.parts.push({ x: x + 0.5, y: y + 0.45, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, t0, life: 0.16, col, sz: 1, g: 0, ray: 1 }); }
  },
  num(x, y, text, col, big) { if (this.nums.length > 60) this.nums.shift(); this.nums.push({ x: x + 0.5 + fx_rand(-0.2, 0.2), y: y + 0.2, text, col, big, t0: now() + this._d() }); },
  text(x, y, text, col) { this.nums.push({ x: x + 0.5, y: y - 0.1, text, col, t0: now() + this._d(), label: 1 }); },
  flash(a) { Render.rs(a).flash = now() + this._d(); },
  bump(a, dx, dy) { const r = Render.rs(a); r.bdx = dx; r.bdy = dy; r.bt = now(); if (dx || dy) r.face = dx < 0 ? -1 : dx > 0 ? 1 : r.face; },
  slash(x, y, dx, dy, col = '#ffffff', big) { this.slashes.push({ x: x + 0.5, y: y + 0.5, a: Math.atan2(dy, dx), col, t0: now() + this._d() + 0.05, big }); },
  screen(col, a = 0.35) { this.flashT = now(); this.flashCol = col; this.flashA = a; },
  step(a) { },
  shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); },
  hurt(n) { this.hurtT = Math.max(this.hurtT, 0.35 + n * 0.6); },
  corpse(m) { const D = MON[m.k]; this.decals.push({ x: m.x, y: m.y, d: G.depth, col: D.undead ? '#bfb8a8' : m.k === 'slime' || m.k === 'sporeling' || m.k === 'shroom' || m.k === 'mother' ? '#3a8a4a' : m.k === 'wisp' || m.k === 'shade' ? '#5a4a9a' : m.k === 'golem' ? '#8ad0f0' : '#7a1a22', s: Math.random() * 1000 }); if (this.decals.length > 120) this.decals.shift(); },
  die(m) {
    const r = Render.rs(m), D = MON[m.k];
    const s = Spr.mon(m.k, FR.idle0, { rage: m.enraged });
    this.dying.push({ s, x: r.x, y: r.y, face: r.face, t0: now() + this._d(), boss: D.boss, col: D.undead ? '#e8e0d0' : '#ff6a5a' });
  },
  pop(o, fx, fy) { this.pops.set(o, { fx, fy, t0: now() + this._d() }); },
  ring(x, y, r, col) { this.rings.push({ x: x + 0.5, y: y + 0.5, r, col, t0: now() }); },
  dash(a) { const r = Render.rs(a); for (let i = 0; i < 14; i++) this.parts.push({ x: r.x + 0.5, y: r.y + 0.6, vx: fx_rand(-1, 1), vy: fx_rand(-1, 0.5), t0: now(), life: 0.45, col: '#ffd0a0', sz: 2, g: 0 }); },
  proj(x0, y0, x1, y1, kind, col) {
    const d = Math.max(1, cheb(x0, y0, x1, y1)), dur = Math.min(0.45, 0.04 + d * 0.035);
    this.projs.push({ x0: x0 + 0.5, y0: y0 + 0.5, x1: x1 + 0.5, y1: y1 + 0.5, kind, col, t0: now() + this._d(), dur });
    this.delayNext(dur);
  },
};

// 每個生態區的環境粒子
const AMB = [
  { n: 34, cols: ['#c8bca0', '#a89c88'], vx: [-0.15, 0.15], vy: [-0.12, 0.05], sz: [0.5, 1], life: [4, 8], glow: 0, a: 0.5 },          // 灰塵
  { n: 40, cols: ['#b98cff', '#5fe0d0', '#e0b8ff'], vx: [-0.2, 0.2], vy: [-0.35, -0.1], sz: [0.6, 1.2], life: [3, 7], glow: 1, a: 0.9 }, // 孢子
  { n: 46, cols: ['#ff9a3a', '#ffd06a', '#ff5a1a'], vx: [-0.3, 0.3], vy: [-1.4, -0.6], sz: [0.6, 1.2], life: [1.5, 3.5], glow: 1, a: 1 }, // 火星
  { n: 52, cols: ['#ffffff', '#d8f0ff'], vx: [-0.35, 0.05], vy: [0.5, 1.1], sz: [0.6, 1.3], life: [4, 7], glow: 0, a: 0.85 },           // 雪
  { n: 36, cols: ['#d05cff', '#ff6fb0', '#8a5aff'], vx: [-0.15, 0.15], vy: [-0.5, -0.15], sz: [0.6, 1.3], life: [2.5, 5], glow: 1, a: 0.9 }, // 虛空微光
  { n: 34, cols: ['#bff4ff', '#7fe8d0', '#e8fffa'], vx: [-0.08, 0.08], vy: [-0.6, -0.25], sz: [0.6, 1.4], life: [3, 6], glow: 1, a: 0.6 }, // 氣泡
  { n: 44, cols: ['#ffffff', '#ffe8a0', '#9ab8ff'], vx: [-0.1, 0.1], vy: [-0.08, 0.08], sz: [0.5, 1.2], life: [2, 5], glow: 1, a: 0.9 }, // 星塵
  { n: 40, cols: ['#ff5a6a', '#ffb0c0', '#c060ff'], vx: [-0.2, 0.2], vy: [-0.7, -0.2], sz: [0.6, 1.3], life: [2, 4], glow: 1, a: 0.9 }, // 終焉餘燼
];

const PROJ_RGB = { bolt: '150,230,255', fire: '255,130,40', frost: '150,230,255', void: '210,90,255', spore: '170,224,90', magic: '190,160,255', slow: '160,160,255', tele: '210,160,255', sleep: '190,210,255', dig: '230,210,170' };
const Render = {
  ps: 3, TS: 48, dpr: 1, W: 0, H: 0, cam: { x: 0, y: 0 }, _rs: new Map(), lm: null, lmx: null, inset: { t: 60, b: 120, l: 0, r: 0 }, miniT: 0, amb: [], vig: null,
  rs(a) {
    let r = this._rs.get(a.id);
    if (!r) { r = { x: a.x, y: a.y, tx: a.x, ty: a.y, fx: a.x, fy: a.y, mt0: -9, mdur: 0.1, mp: 1, lin: 0, face: 1, flash: 0, bt: -9, bdx: 0, bdy: 0, seed: Math.random() * 10, stepN: 0 }; this._rs.set(a.id, r); }
    return r;
  },
  // 畫質：0 高、1 中、2 低、3 最低。畫布解析度取裝置像素比的整數分之一（放大倍率是整數，像素畫才不會歪）
  q: 0, QCAP: [2, 1.5, 1.05, 0.55], fts: [], slowN: 0,
  initQ() { const g = Store.set.gfx || 'auto'; this.q = g === 'low' ? 2 : 0; this.auto = g === 'auto'; },
  forceQ(q) { this.q = q; this.auto = false; this.resize(); },
  // 自動降畫質：連續兩段（各約 1.5 秒）的畫格時間中位數都太長，就降一級
  watchPerf(dt) {
    if (!this.auto || this.q >= 3 || dt <= 0 || dt > 0.25 || document.hidden) return;
    const a = this.fts; a.push(dt);
    if (a.length < 60) return;
    a.sort((x, y) => x - y); const med = a[30]; a.length = 0;
    if (med > 0.024) { if (++this.slowN >= 2) { this.slowN = 0; this.q++; this.resize(); } } else this.slowN = 0;
  },
  resize() {
    const dev = window.devicePixelRatio || 1, cap = this.QCAP[this.q | 0];
    let k = 1; while (dev / k > cap + 1e-6 && k < 6) k++;
    const dpr = this.dpr = dev / k;
    this.W = cv.width = Math.round(innerWidth * dpr); this.H = cv.height = Math.round(innerHeight * dpr);
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    this.lblC = new Map();
    const target = [17, 13.5, 10.5][clamp((Store.set.zoom | 0) + 1, 0, 2)] * (document.body.classList.contains('land') ? 0.8 : 1);
    const base = Math.min(this.W, this.H - (this.inset.t + this.inset.b) * dpr * 0.6);
    this.ps = Math.max(2, Math.round(base / (16 * target)));
    this.TS = this.ps * 16;
  },
  // 移動補間：每一步用固定時間走完一格。連續移動（按住、自動走）用等速，單步用減速收尾。
  // setMove 只影響下一次畫面更新時偵測到的移動，畫完就恢復成單步的預設值
  moveDur: 0.12, moveLin: 0,
  setMove(dur, lin) { this.moveDur = dur; this.moveLin = lin ? 1 : 0; },
  stepActor(a, r, t) {
    if (a.x !== r.tx || a.y !== r.ty) {
      const d = Math.hypot(a.x - r.x, a.y - r.y);
      if (d > 4.5) { r.x = r.fx = r.tx = a.x; r.y = r.fy = r.ty = a.y; r.mp = 1; return; }
      const ddx = a.x - r.tx; if (ddx) r.face = ddx < 0 ? -1 : 1;
      const lin = a.isP ? this.moveLin : (this.moveLin || d > 1.5 ? 1 : 0);
      // 連續等速移動時，新的一步從上一步的終點和結束時間接下去，速度才不會一頓一頓
      const prevEnd = r.mt0 + r.mdur;
      if (lin && r.lin && r.mp > 0.5 && Math.abs(t - prevEnd) < 0.07 && Math.abs(a.x - r.tx) <= 1 && Math.abs(a.y - r.ty) <= 1) { r.fx = r.tx; r.fy = r.ty; r.mt0 = Math.min(prevEnd, t); }
      else { r.fx = r.x; r.fy = r.y; r.mt0 = t; }
      r.tx = a.x; r.ty = a.y; r.lin = lin; r.stepN++;
      r.mdur = this.moveDur * (d > 1.5 ? Math.min(1.8, d / 1.3) : 1);
    }
    const p = Math.min(1, Math.max(0, (t - r.mt0) / r.mdur));
    const e = r.lin ? p : 1 - (1 - p) * (1 - p);
    r.mp = p; r.x = lerp(r.fx, r.tx, e); r.y = lerp(r.fy, r.ty, e);
  },
  snapCam() { if (!G) return; this.cam.x = G.P.x; this.cam.y = G.P.y; this._rs.clear(); this.amb.length = 0; },
  // 畫面中心（扣掉上下的介面）
  center() { const d = this.dpr, I = this.inset; return [(I.l + (innerWidth - I.l - I.r) / 2) * d, (I.t + (innerHeight - I.t - I.b) / 2) * d]; },
  toScreen(tx, ty) { const [cx, cy] = this.center(); return [cx + (tx - this.cam.x - 0.5) * this.TS, cy + (ty - this.cam.y - 0.5) * this.TS]; },
  toTile(px, py) { const [cx, cy] = this.center(), d = this.dpr; return [Math.floor((px * d - cx) / this.TS + this.cam.x + 0.5), Math.floor((py * d - cy) / this.TS + this.cam.y + 0.5)]; },
  isTorch(F, x, y) { if (!(F._tset instanceof Set)) { F._tset = new Set(F.torches.map(([a, b]) => a + b * 1000)); } return F._tset.has(x + y * 1000); },
  frameFor(a, r, t, fly) {
    const bt = t - r.bt;
    if (bt >= 0 && bt < 0.26) return bt < 0.09 ? FR.atk0 : FR.atk1;
    if (fly) return ((t * 7 + r.seed) | 0) % 2 ? FR.idle1 : FR.idle0;
    if (r.mp < 1) return (r.stepN + (r.mp < 0.5 ? 0 : 1)) % 2 ? FR.walk1 : FR.walk0;
    if (!a.isP && (!a.awake || (a.st && a.st.sleep > 0) || a.disg)) return FR.idle0;
    return ((t * 1.7 + r.seed) | 0) % 2 ? FR.idle1 : FR.idle0;
  },

  draw() {
    const t = now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!G || !G.F || !TEX.t) { ctx.fillStyle = '#07060c'; ctx.fillRect(0, 0, this.W, this.H); return; }
    const F = G.F, P = G.P, TS = this.TS, ps = this.ps;
    if (TEX.biome !== F.biome) TEX.build(F.biome);
    ctx.fillStyle = BIOMES[F.biome].pal.bg; ctx.fillRect(0, 0, this.W, this.H);
    ctx.imageSmoothingEnabled = false;
    // 角色位置補間
    const rdt = t - (this.lt || t), dt = Math.min(0.05, rdt); this.lt = t;
    this.watchPerf(rdt);
    for (const a of [P].concat(F.mons)) this.stepActor(a, this.rs(a), t);
    this.moveDur = 0.12; this.moveLin = 0;
    // 鏡頭直接鎖在主角的補間位置（對齊實體像素，避免抖動）；距離太遠時（傳送）才快速追上
    const pr = this.rs(P);
    if (Math.hypot(pr.x - this.cam.x, pr.y - this.cam.y) > 1.2) { const ck = 1 - Math.pow(0.00002, dt); this.cam.x += (pr.x - this.cam.x) * ck; this.cam.y += (pr.y - this.cam.y) * ck; }
    else { this.cam.x = Math.round(pr.x * TS) / TS; this.cam.y = Math.round(pr.y * TS) / TS; }
    // 鏡頭晃動
    let sx = 0, sy = 0;
    if (FX.shakeAmt > 0.1) { sx = fx_rand(-1, 1) * FX.shakeAmt * this.dpr; sy = fx_rand(-1, 1) * FX.shakeAmt * this.dpr; FX.shakeAmt *= Math.pow(0.002, dt); } else FX.shakeAmt = 0;
    ctx.setTransform(1, 0, 0, 1, Math.round(sx), Math.round(sy));
    const [cx, cy] = this.center();
    const x0 = Math.floor(this.cam.x - cx / TS) - 1, x1 = Math.ceil(this.cam.x + (this.W - cx) / TS) + 1;
    const y0 = Math.floor(this.cam.y - cy / TS) - 2, y1 = Math.ceil(this.cam.y + (this.H - cy) / TS) + 2;
    const ox = Math.round(cx - (this.cam.x + 0.5) * TS), oy = Math.round(cy - (this.cam.y + 0.5) * TS);
    const px = x => ox + x * TS, py = y => oy + y * TS;
    const vis = G.vis;
    // 地形（快取）
    Terr.update(F, x0, y0, x1, y1);
    const ax0 = Math.max(0, x0), ay0 = Math.max(0, y0), ax1 = Math.min(F.w - 1, x1), ay1 = Math.min(F.h - 1, y1);
    if (ax1 >= ax0 && ay1 >= ay0) ctx.drawImage(Terr.c, ax0 * 16, ay0 * 16, (ax1 - ax0 + 1) * 16, (ay1 - ay0 + 1) * 16, px(ax0), py(ay0), (ax1 - ax0 + 1) * TS, (ay1 - ay0 + 1) * TS);
    this.drawAnimTiles(F, ax0, ay0, ax1, ay1, px, py, t);
    // 血跡
    for (const d of FX.decals) if (d.d === G.depth && F.seen[d.y * F.w + d.x]) {
      ctx.fillStyle = d.col; ctx.globalAlpha = 0.5;
      for (let i = 0; i < 6; i++) { const a = hash2(i, d.s, 1) * TAU, r = hash2(d.s, i, 2) * 5; ctx.fillRect(px(d.x) + Math.round(8 + Math.cos(a) * r) * ps, py(d.y) + Math.round(10 + Math.sin(a) * r * 0.6) * ps, ps * (1 + (i % 2)), ps); }
      ctx.globalAlpha = 1;
    }
    // 陷阱
    for (const tr of F.traps) if (!tr.hid && F.seen[tr.y * F.w + tr.x]) ctx.drawImage(TEX.t.trap[tr.k], px(tr.x), py(tr.y), TS, TS);
    // 道具
    for (const o of F.items) {
      const k = o.y * F.w + o.x;
      if (vis[k]) o.seen = 1;
      if (!(o.seen && F.seen[k]) && !F.detect) continue;
      let ix = o.x, iy = o.y, lift = 0;
      const pp = FX.pops.get(o);
      if (pp) { const q = (t - pp.t0) / 0.5; if (q >= 1) FX.pops.delete(o); else if (q >= 0) { const e = 1 - (1 - q) * (1 - q); ix = lerp(pp.fx, o.x, e); iy = lerp(pp.fy, o.y, e); lift = Math.sin(q * Math.PI) * 0.9 * TS; } else { ix = pp.fx; iy = pp.fy; } }
      const bob = Math.sin(t * 2.5 + o.x * 1.3 + o.y) * ps * 0.6;
      const X = Math.round(ox + ix * TS), Y = Math.round(oy + iy * TS);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(X + TS / 2, Y + TS - ps * 3, TS * 0.28 * (1 - lift / TS * 0.4), ps * 1.4, 0, 0, TAU); ctx.fill();
      const it = o.it, rare = it.known && (it.rune || it.ench >= 2) && !it.cursed;
      if (rare && vis[k]) { const c = it.rune ? (RUNES[it.rune] || {}).rgb || '120,200,255' : '120,200,255'; this.glowAt(X + TS / 2, Y + TS / 2, TS * 0.6, c, 0.35 + 0.15 * Math.sin(t * 3)); }
      if (vis[k] && !it.price && (it.k === 'relic' || rare)) this.lootBeam(X, Y, it.k === 'relic' ? '255,200,90' : it.rune ? (RUNES[it.rune] || {}).rgb || '120,200,255' : '120,200,255', t, o.x * 3 + o.y);
      if (it.k === 'relic' && vis[k]) this.glowAt(X + TS / 2, Y + TS / 2, TS * 0.7, '255,210,120', 0.4 + 0.15 * Math.sin(t * 4));
      ctx.drawImage(Art.itemSprite(it).c, X, Math.round(Y + bob - ps - lift), TS, TS);
      if (it.price && vis[k]) { this.label(it.price + '$', X + TS / 2, Y + TS - ps, '#ffd75a', 4.2); }
      else if (vis[k] && hash2(o.x, o.y, (t * 1.5) | 0) < 0.12) { ctx.fillStyle = '#fff'; ctx.fillRect(X + (4 + hash2(o.y, o.x, 3) * 8 | 0) * ps, Y + (4 + hash2(o.x, 7, o.y) * 6 | 0) * ps, ps, ps); }
    }
    // 流星等警示標記
    if (F.marks) for (const mk of F.marks) {
      if (!F.seen[mk.y * F.w + mk.x]) continue;
      const X = px(mk.x) + TS / 2, Y = py(mk.y) + TS / 2, pulse = 0.5 + 0.5 * Math.sin(t * 12), R = TS * (0.5 + mk.r);
      this.glowAt(X, Y, R * 1.1, '255,90,60', 0.25 + 0.25 * pulse);
      ctx.strokeStyle = 'rgba(255,' + (mk.t <= 1 ? 60 : 180) + ',90,' + (0.55 + 0.4 * pulse) + ')'; ctx.lineWidth = ps;
      ctx.beginPath(); ctx.ellipse(X, Y + ps * 2, R * 0.92, R * 0.55, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X - ps * 3, Y + ps * 2); ctx.lineTo(X + ps * 3, Y + ps * 2); ctx.moveTo(X, Y - ps); ctx.lineTo(X, Y + ps * 5); ctx.stroke();
    }
    // 雲霧
    for (const c of F.clouds) {
      if (!vis[c.y * F.w + c.x]) continue;
      const col = { poison: '120,230,80', conf: '220,140,255', para: '255,230,120', fire: '255,120,40' }[c.k];
      for (let i = 0; i < (this.q >= 2 ? 2 : 3); i++) {
        const a = t * (1 + i * 0.3) + c.x * 2 + i * 2, r = TS * (0.32 + 0.08 * Math.sin(a * 1.7));
        this.glowAt(px(c.x) + TS / 2 + Math.cos(a) * TS * 0.15, py(c.y) + TS / 2 + Math.sin(a) * TS * 0.15, r * 1.6, col, c.k === 'fire' ? 0.75 : 0.45);
      }
      if (c.k === 'fire' && Math.random() < 0.3 * (this.q >= 2 ? 0.5 : 1)) FX.parts.push({ x: c.x + Math.random(), y: c.y + 0.8, vx: fx_rand(-0.3, 0.3), vy: -fx_rand(1, 2.5), t0: t, life: 0.5, col: Math.random() < 0.5 ? '#ffd040' : '#ff6a2a', sz: 1.5, g: -1 });
    }
    // 角色與物件（依 y 排序）
    const list = [];
    for (const m of F.mons) if (m.hp > 0 && (Game.monVisible(m) || m.disg && F.seen[m.y * F.w + m.x] && vis[m.y * F.w + m.x])) list.push({ y: this.rs(m).y, a: m });
    list.push({ y: pr.y + 0.01, a: P });
    for (const c of F.chests || []) if (F.seen[c.y * F.w + c.x]) list.push({ y: c.y - 0.01, o: c, kind: 'chest' });
    for (const c of F.altars || []) if (F.seen[c.y * F.w + c.x]) list.push({ y: c.y - 0.01, o: c, kind: 'altar' });
    for (const c of F.props || []) if (F.seen[c.y * F.w + c.x]) list.push({ y: c.y - 0.02, o: c, kind: 'prop' });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) { if (e.a) this.drawActor(e.a, px, py, t); else this.drawObj(e.o, e.kind, px, py, t); }
    this.drawDying(ox, oy, t);
    // 光影
    this.lighting(F, x0, y0, x1, y1, ox, oy, t);
    // 環境粒子、投射物與粒子
    this.ambient(F, x0, y0, x1, y1, ox, oy, t, dt);
    this.drawFx(ox, oy, t, dt);
    FX.drawExtra(ox, oy, t, dt);
    // 目標指示
    if (typeof UI !== 'undefined') this.drawUiMarks(px, py, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    FX.drawFlies(t);
    // 全畫面閃光
    const fk = t - FX.flashT;
    if (fk >= 0 && fk < 0.35) { ctx.fillStyle = 'rgba(' + FX.flashCol + ',' + ((FX.flashA || 0.35) * (1 - fk / 0.35)) + ')'; ctx.fillRect(0, 0, this.W, this.H); }
    // 受傷紅框
    const low = P.hp < P.mhp * 0.3 && !G.over ? 0.25 + 0.12 * Math.sin(t * 5) : 0;
    if (FX.hurtT > 0 || low > 0) {
      const a = Math.max(low, Math.min(0.6, FX.hurtT));
      if (!this.hurtC) { const c = this.hurtC = document.createElement('canvas'); c.width = c.height = 192; const x = c.getContext("2d"); const g = x.createRadialGradient(96, 96, 45, 96, 96, 138); g.addColorStop(0, 'rgba(180,0,20,0)'); g.addColorStop(1, 'rgba(180,0,20,1)'); x.fillStyle = g; x.fillRect(0, 0, 192, 192); }
      ctx.globalAlpha = a; ctx.drawImage(this.hurtC, 0, 0, this.W, this.H); ctx.globalAlpha = 1;
      FX.hurtT = Math.max(0, FX.hurtT - dt * 1.5);
    }
    if (t - this.miniT > 0.25 || UI.miniDirty) { this.miniT = t; UI.miniDirty = false; this.minimap(document.getElementById('mini'), 3); }
  },
  // 水、岩漿、火把火焰、泉水等每格動畫
  // 液體格子四周的岸邊遮罩（每層樓算一次）：1 北 2 東 4 南 8 西，16/32/64/128 為東北/東南/西南/西北的內角
  liqMask(F, x, y) {
    if (this._lqF !== F) { this._lqF = F; this._lqm = new Int16Array(F.w * F.h).fill(-1); }
    const k = y * F.w + x; let m = this._lqm[k];
    if (m >= 0) return m;
    const lc = q => q === T.DEEP ? T.WATER : q, v = lc(F.t[k]), g = (dx, dy) => { const q = lc(Gen.get(F, x + dx, y + dy)); return q !== v && q !== T.BRIDGE; };
    m = (g(0, -1) ? 1 : 0) | (g(1, 0) ? 2 : 0) | (g(0, 1) ? 4 : 0) | (g(-1, 0) ? 8 : 0);
    if (!(m & 3) && g(1, -1)) m |= 16; if (!(m & 6) && g(1, 1)) m |= 32; if (!(m & 12) && g(-1, 1)) m |= 64; if (!(m & 9) && g(-1, -1)) m |= 128;
    return (this._lqm[k] = m);
  },
  // 液體影格與岸邊預先放大成畫面大小（每格只做 1:1 的貼圖，水很多的樓層也不會變慢）
  liqCache() { const key = TEX.biome + '|' + this.TS; if (this._lqKey !== key) { this._lqKey = key; this._lqF2 = {}; this._lqE2 = new Map(); } },
  liqFrame(kind, f) {
    this.liqCache();
    const k = kind * 8 + f; let c = this._lqF2[k]; if (c) return c;
    const A = TEX.t, src = kind === 1 ? A.lava[f] : A.water[f], S = this.TS * 2;
    c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, S, S);
    if (kind === 2) { x.fillStyle = 'rgba(2,10,28,.5)'; x.fillRect(0, 0, S, S); }
    return (this._lqF2[k] = c);
  },
  liqEdgeS(lava, m) {
    this.liqCache();
    const k = lava * 256 + m; let c = this._lqE2.get(k); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = this.TS; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(TEX.t.liqEdge(lava, m), 0, 0, this.TS, this.TS);
    this._lqE2.set(k, c); return c;
  },
  drawAnimTiles(F, x0, y0, x1, y1, px, py, t) {
    const TS = this.TS, ps = this.ps, A = TEX.t, vis = G.vis, hi = this.q < 1, pq = this.q < 1 ? 1 : 0.5;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = y * F.w + x; if (!F.seen[k]) continue;
      const v = F.t[k];
      if (v === T.CHASM) { if (vis[k] && Math.random() < 0.003 * pq) FX.parts.push({ x: x + Math.random(), y: y + Math.random(), vx: 0, vy: 0, t0: t, life: 0.9, col: Math.random() < 0.5 ? '#ffffff' : '#ffe8a0', sz: 1.2, g: 0, glow: 1 }); continue; }
      if (v === T.WATER || v === T.LAVA || v === T.DEEP) {
        const X = px(x), Y = py(y), lava = v === T.LAVA;
        // 無縫材質：每格取 32×32 影格中對應的四分之一，相鄰格的花紋自然相連
        const fr = this.liqFrame(lava ? 1 : v === T.DEEP ? 2 : 0, lava ? ((t * 3.2) | 0) % 8 : ((t * 4) | 0) % 8);
        ctx.drawImage(fr, (x & 1) * TS, (y & 1) * TS, TS, TS, X, Y, TS, TS);
        const m = this.liqMask(F, x, y);
        if (m) {
          ctx.drawImage(this.liqEdgeS(lava ? 1 : 0, m), X, Y);
          if (lava && hi) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 3 + x * 0.7 + y); ctx.drawImage(A.liqEdge(1, m), X, Y, TS, TS); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        }
        if (lava && vis[k] && Math.random() < 0.012 * pq) FX.parts.push({ x: x + Math.random(), y: y + Math.random(), vx: 0, vy: -0.6, t0: t, life: 0.6, col: '#ffe08a', sz: 1.6, g: -0.5, glow: 1 });
      } else if (v === T.FOUNTAIN) {
        const X = px(x), Y = py(y);
        ctx.fillStyle = '#3f8fd0'; ctx.fillRect(X + 3 * ps, Y + 7 * ps, 10 * ps, 6 * ps);
        ctx.fillStyle = '#9fe0ff'; const ph = (t * 3) % 1;
        ctx.fillRect(X + Math.round(4 + ph * 6) * ps, Y + 8 * ps, 2 * ps, ps); ctx.fillRect(X + Math.round(10 - ph * 5) * ps, Y + 11 * ps, 2 * ps, ps);
        ctx.fillStyle = '#e8fbff'; ctx.fillRect(X + 7 * ps, Y + Math.round(((t * 6) % 3)) * ps, 2 * ps, ps);
        if (vis[k] && Math.random() < 0.08) FX.parts.push({ x: x + 0.5 + fx_rand(-0.1, 0.1), y: y + 0.1, vx: fx_rand(-0.8, 0.8), vy: -1.2, t0: t, life: 0.5, col: '#bff0ff', sz: 0.8, g: 6 });
      } else if (v === T.PORTAL) {
        // 秘境裂口：旋轉的光環
        const X = px(x) + TS / 2, Y = py(y) + TS / 2, B = BRANCHES[F.branch || (F.portal && F.portal.b)] || { col: '200,160,255' };
        const lock = F.branch && F.locked && F.stairs && x === F.stairs[0] && y === F.stairs[1], col = lock ? '255,70,120' : B.col;
        this.glowAt(X, Y, TS * 1.1, col, 0.5 + 0.15 * Math.sin(t * 3));
        ctx.fillStyle = 'rgba(10,4,20,.75)'; ctx.beginPath(); ctx.ellipse(X, Y + ps, TS * 0.4, TS * 0.25, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(' + col + ',.35)'; ctx.beginPath(); ctx.ellipse(X, Y + ps, TS * 0.3, TS * 0.18, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(' + col + ',.18)'; ctx.fillRect(Math.round(X - TS * 0.22), Math.round(Y - TS * 0.9), Math.round(TS * 0.44), Math.round(TS * 0.9));
        ctx.lineWidth = ps * 1.5;
        for (let i = 0; i < 3; i++) {
          const r = TS * (0.24 + i * 0.1), a0 = t * (2.2 - i * 0.5) * (i % 2 ? -1 : 1) + i;
          ctx.strokeStyle = 'rgba(' + col + ',' + (0.9 - i * 0.22) + ')';
          ctx.beginPath(); ctx.ellipse(X, Y + ps, r, r * 0.62, 0, a0, a0 + Math.PI * 1.25); ctx.stroke();
        }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(X - ps / 2), Math.round(Y + ps / 2), ps, ps);
        if (vis[k] && Math.random() < 0.08 * pq) FX.parts.push({ x: x + 0.5 + fx_rand(-0.3, 0.3), y: y + 0.6, vx: 0, vy: -0.9, t0: t, life: 0.8, col: 'rgb(' + col + ')', sz: 1, g: 0, glow: 1 });
      } else if (v === T.STAIRS) {
        const X = px(x), Y = py(y), a = 0.18 + 0.12 * Math.sin(t * 2.5);
        ctx.fillStyle = F.locked ? 'rgba(255,60,120,' + a + ')' : 'rgba(255,220,140,' + a + ')'; ctx.fillRect(X + 2 * ps, Y + 2 * ps, 12 * ps, 12 * ps);
        if (F.locked) { ctx.strokeStyle = 'rgba(255,90,160,.8)'; ctx.lineWidth = ps; ctx.beginPath(); ctx.arc(X + TS / 2, Y + TS / 2, TS * (0.32 + 0.03 * Math.sin(t * 4)), 0, TAU); ctx.stroke(); }
      }
    }
    // 火把火焰
    for (const [x, y] of F.torches) {
      if (x < x0 || x > x1 || y < y0 || y > y1 || !F.seen[y * F.w + x] || Terr.solid(Gen.get(F, x, y + 1)) || !F.seen[(y + 1) * F.w + x]) continue;
      const X = px(x), Y = py(y), f = Math.sin(t * 13 + x * 3) + Math.sin(t * 7.7 + y);
      const h = 4 + (f > 0.4 ? 1 : 0) + (f > 1.2 ? 1 : 0);
      ctx.fillStyle = '#ff5a1a'; ctx.fillRect(X + 6 * ps, Y + (8 - h) * ps, 4 * ps, h * ps);
      ctx.fillStyle = '#ffb540'; ctx.fillRect(X + 6.5 * ps, Y + (8 - h + 1) * ps, 3 * ps, (h - 1) * ps);
      ctx.fillStyle = '#fff2b0'; ctx.fillRect(X + 7 * ps, Y + (8 - h + 2) * ps, 2 * ps, (h - 2) * ps);
      if (G.vis[y * F.w + x] && Math.random() < 0.06) FX.parts.push({ x: x + 0.5 + fx_rand(-0.1, 0.1), y: y + 0.25, vx: fx_rand(-0.2, 0.2), vy: -1.2, t0: t, life: 0.6, col: '#ffc060', sz: 0.8, g: 0, glow: 1 });
    }
  },
  // 文字標籤（傷害數字、Z、！）：每種文字＋顏色＋大小只描邊繪製一次，之後直接貼圖
  label(s, x, y, col, size = 5) {
    const fs = Math.round(size * this.ps * 2) / 2, key = s + '|' + col + '|' + fs;
    const C = this.lblC || (this.lblC = new Map());
    let c = C.get(key);
    if (!c) {
      if (C.size > 400) C.clear();
      c = document.createElement('canvas'); const g = c.getContext('2d'), f = fs + 'px Silkscreen, monospace';
      g.font = f; const w = Math.ceil(g.measureText(s).width + this.ps * 3), h = Math.ceil(fs * 1.4 + this.ps * 2);
      c.width = w; c.height = h; g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = this.ps * 1.2; g.lineJoin = 'round'; g.strokeStyle = 'rgba(10,6,16,.9)'; g.strokeText(s, w / 2, h / 2); g.fillStyle = col; g.fillText(s, w / 2, h / 2);
      C.set(key, c);
    }
    ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
  },
  // 畫一張以腳底為錨點的精靈圖
  blit(s, img, X, Y, flip, sx = 1, sy = 1) {
    const ps = this.ps;
    ctx.save(); ctx.translate(Math.round(X), Math.round(Y)); ctx.scale(flip ? -sx : sx, sy);
    ctx.drawImage(img, -s.ax * ps, -s.ay * ps, img.width * ps, img.height * ps);
    ctx.restore();
  },
  drawActor(a, px, py, t) {
    const r = this.rs(a), TS = this.TS, ps = this.ps;
    let X = px(0) + r.x * TS, Y = py(0) + r.y * TS;
    const bt = t - r.bt; if (bt >= 0 && bt < 0.16) { const k = Math.sin(bt / 0.16 * Math.PI) * 0.28; X += r.bdx * k * TS; Y += r.bdy * k * TS; }
    let s, alpha = 1;
    const D = a.isP ? null : MON[a.k];
    if (a.isP) s = Spr.hero(a.cls, this.frameFor(a, r, t), Spr.gearOf(a));
    else {
      if (a.disg) s = a.k === 'mimic' ? Spr.mon('chest', FR.idle0) : Spr.mon('gargoyle', FR.idle0, { stone: 1 });
      else s = Spr.mon(a.k, this.frameFor(a, r, t, D.fly && a.k === 'bat'), { rage: a.enraged });
      if (D.invis && !a.st.revealed && !Game.canSeeInvis()) alpha = 0.45 + 0.15 * Math.sin(t * 6);
    }
    if (a.isP && a.st.invis) alpha = 0.45;
    const asleep = !a.isP && (!a.awake || a.st.sleep > 0) && !a.disg && !D.npc;
    const moving = r.mp < 1;
    // 走路：每一步小跳一下、落地時略壓扁
    const hop = moving && !a.disg ? Math.sin(r.mp * Math.PI) : 0;
    const land = moving && r.mp > 0.75 ? (r.mp - 0.75) / 0.25 : 0;
    const sqx = 1 + Math.sin(land * Math.PI) * 0.06, sqy = 1 - Math.sin(land * Math.PI) * 0.06;
    const fly = s.fly && !a.disg ? (3 + Math.sin(t * 3 + r.seed) * 1.2) * ps : 0;
    const FX0 = X + TS / 2, FY = Y + TS - ps * 2;
    // 影子
    const sw = TS * (s.sw || 0.3) * (D && D.boss ? 1.6 : 1) * (1 - hop * 0.18) * (fly ? 0.75 : 1);
    ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(FX0, FY, sw, ps * 1.8 * (D && D.boss ? 1.5 : 1) * (1 - hop * 0.18), 0, 0, TAU); ctx.fill();
    // 精英／頭目光環
    if (a.elite || (a.enraged && D && D.boss)) {
      const E = a.elite ? ELITES[a.elite] : { rgb: '255,60,90' }, pulse = 0.5 + 0.5 * Math.sin(t * 4 + r.seed);
      ctx.save(); ctx.translate(FX0, FY); ctx.scale(1, 0.55); this.glowAt(0, 0, sw * 1.9, E.rgb, 0.35 + 0.25 * pulse); ctx.restore();
      ctx.strokeStyle = 'rgba(' + E.rgb + ',' + (0.5 + 0.4 * pulse) + ')'; ctx.lineWidth = ps * 0.8; ctx.beginPath(); ctx.ellipse(FX0, FY, sw * 1.15, ps * 2.4, 0, 0, TAU); ctx.stroke();
      if (Math.random() < 0.15) FX.parts.push({ x: r.x + 0.5 + fx_rand(-0.35, 0.35), y: r.y + 0.9, vx: 0, vy: -1.4, t0: t, life: 0.6, col: 'rgb(' + E.rgb + ')', sz: 1, g: 0, glow: 1 });
    }
    ctx.globalAlpha = alpha;
    const flip = r.face < 0 && !a.disg;
    const inWater = Game.tile(a.x, a.y) === T.WATER && !moving && !fly;
    const AY = FY + ps - hop * ps * 2.5 - fly;
    if (inWater) { ctx.save(); ctx.beginPath(); ctx.rect(X - TS, Y - TS * 2, TS * 3, TS * 3 - ps * 4); ctx.clip(); }
    this.blit(s, s.c, FX0, AY, flip, sqx, sqy);
    if (t - r.flash < 0.12 && t >= r.flash) { ctx.globalAlpha = 0.9; this.blit(s, s.w, FX0, AY, flip, sqx, sqy); }
    if (inWater) { ctx.restore(); ctx.strokeStyle = 'rgba(220,240,255,.55)'; ctx.lineWidth = ps; ctx.beginPath(); ctx.ellipse(FX0, Y + TS - ps * 4, TS * 0.3 + Math.sin(t * 3) * ps, ps * 1.4, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const top = AY - (s.ay - s.top) * ps;
    const st = a.st || {};
    if (st.freeze > 0) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#9fe8ff'; ctx.fillRect(FX0 - TS * 0.32, top + ps * 2, TS * 0.64, AY - top - ps * 2); ctx.globalAlpha = 1; ctx.fillStyle = '#e8fbff'; ctx.fillRect(FX0 - TS * 0.3, top + ps * 2, ps, AY - top - ps * 3); }
    if (st.burn > 0 && Math.random() < 0.4) FX.parts.push({ x: r.x + 0.3 + Math.random() * 0.4, y: r.y + 0.6, vx: 0, vy: -2, t0: t, life: 0.4, col: '#ff8a2a', sz: 1.6, g: -1, glow: 1 });
    if (st.poison > 0 && Math.random() < 0.08) FX.parts.push({ x: r.x + 0.3 + Math.random() * 0.4, y: r.y + 0.3, vx: 0, vy: -0.8, t0: t, life: 0.6, col: '#7be04a', sz: 1.3, g: 0 });
    if (asleep) this.label('z', FX0 + TS * 0.3 + Math.sin(t * 2) * ps, top - (t * 4 % 4) * ps * 0.5, '#cfe6ff', 4);
    if (st.conf > 0) this.label('?', FX0 + TS * 0.3, top, '#e0a0ff', 5);
    if (st.stun > 0 || st.para > 0) { for (let i = 0; i < 3; i++) { const a2 = t * 5 + i * TAU / 3; this.label('*', FX0 + Math.cos(a2) * TS * 0.25, top + Math.sin(a2) * ps * 1.5, '#ffe08a', 4); } }
    if (D && D.talk && !a.used) { const bb = Math.round(Math.sin(t * 4) * ps); ctx.fillStyle = 'rgba(20,14,30,.85)'; ctx.fillRect(FX0 - ps * 3, top - ps * 9 + bb, ps * 6, ps * 6); ctx.fillStyle = '#ffd75a'; ctx.fillRect(FX0 - ps * 2, top - ps * 8 + bb, ps * 4, ps * 4); this.label('!', FX0, top - ps * 6 + bb, '#2a1a10', 4); }
    if (a.isP && st.haste > 0 && moving) { ctx.fillStyle = 'rgba(255,240,200,.55)'; for (let i = 0; i < 3; i++) { const yy = top + ps * (5 + i * 5) + ((t * 40 + i * 7) % 4) * ps * 0.3; ctx.fillRect(FX0 - r.face * TS * (0.35 + i * 0.08), yy, -r.face * TS * 0.3, ps * 0.8); } }
    // HP 條
    if (!a.isP && !a.disg && (a.hp < a.mhp || a.elite) && !D.npc && !D.boss) {
      const bw = TS * 0.75, bx = FX0 - bw / 2, by = top - ps * 2.5;
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - ps / 2, by - ps / 2, bw + ps, ps * 2);
      const f = Math.max(0, a.hp / a.mhp);
      ctx.fillStyle = f > 0.5 ? '#6fe06a' : f > 0.25 ? '#ffc040' : '#ff4a4a'; ctx.fillRect(bx, by, bw * f, ps);
      if (a.elite) { const E = ELITES[a.elite]; ctx.fillStyle = E.col; ctx.fillRect(bx - ps * 3, by - ps * 1.5, ps * 2, ps * 2); ctx.fillRect(bx - ps * 3.5, by - ps * 2.5, ps, ps); ctx.fillRect(bx - ps * 2, by - ps * 2.5, ps, ps); ctx.fillRect(bx - ps * 0.5 - ps, by - ps * 2.5, ps, ps); }
    }
  },
  drawObj(o, kind, px, py, t) {
    const TS = this.TS, ps = this.ps, X = px(o.x) + TS / 2, Y = py(o.y) + TS - ps * 2;
    ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(X, Y, TS * 0.36, ps * 2, 0, 0, TAU); ctx.fill();
    if (kind === 'prop') {
      const fire = o.k === 'fire' || o.k === 'furnace' || o.k === 'brazier', s = Spr.mon('p_' + o.k, fire && !o.used ? (((t * 6) | 0) % 2 ? FR.idle1 : FR.idle0) : ((t * 1.3 + o.x) | 0) % 2 ? FR.idle1 : FR.idle0);
      this.blit(s, s.c, X, Y + ps, false);
      if (o.k === 'shroom' && Math.random() < 0.05) FX.parts.push({ x: o.x + 0.5 + fx_rand(-0.4, 0.4), y: o.y - 0.4, vx: fx_rand(-0.2, 0.2), vy: -0.4, t0: t, life: 1.5, col: '#e0b8ff', sz: 1, g: 0, glow: 1 });
      if (o.k === 'fire' && !o.used) { this.glowAt(X, Y - 5 * ps, TS * 0.6, '255,150,60', 0.45 + 0.1 * Math.sin(t * 11)); if (Math.random() < 0.15) FX.parts.push({ x: o.x + 0.5 + fx_rand(-0.1, 0.1), y: o.y + 0.4, vx: fx_rand(-0.2, 0.2), vy: -1.4, t0: t, life: 0.7, col: '#ffc060', sz: 0.9, g: 0, glow: 1 }); }
      if (o.k === 'keg' && G.vis[o.y * G.F.w + o.x] && ((t * 3 + o.x) | 0) % 5 === 0) { ctx.fillStyle = '#ffd040'; ctx.fillRect(X + 2 * ps, Y - 21 * ps + ((t * 8) % 2 | 0) * ps, ps, ps); }
      return;
    }
    if (kind === 'chest') {
      const s = Spr.mon('chest', FR.idle0, { gold: o.gold, open: o.open });
      this.blit(s, s.c, X, Y + ps, false);
      if (!o.open && G.vis[o.y * G.F.w + o.x] && hash2(o.x, o.y, (t * 2) | 0) < 0.15) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(X + (hash2(o.x, (t * 2) | 0, 3) * 10 - 5) * ps, Y - 8 * ps, ps, ps); }
    } else {
      const s = Spr.mon('altar', FR.idle0, { k: o.k, used: o.used });
      this.blit(s, s.c, X, Y + ps, false);
      if (!o.used) {
        const A = ALTARS[o.k], fl = Math.sin(t * 9 + o.x) * 0.5 + Math.sin(t * 5.3) * 0.5;
        const fx = X, fy = Y - 13 * ps;
        this.glowAt(fx, fy, TS * 0.5, A.rgb, 0.6);
        ctx.fillStyle = 'rgb(' + A.rgb + ')'; ctx.fillRect(fx - 2 * ps, fy - (3 + fl) * ps, 4 * ps, (4 + fl) * ps);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(fx - ps, fy - (1 + fl * 0.5) * ps, 2 * ps, 2 * ps);
        if (Math.random() < 0.1) FX.parts.push({ x: o.x + 0.5 + fx_rand(-0.15, 0.15), y: o.y + 0.1, vx: 0, vy: -1, t0: t, life: 0.7, col: 'rgb(' + A.rgb + ')', sz: 1, g: 0, glow: 1 });
      }
    }
  },
  drawDying(ox, oy, t) {
    const TS = this.TS, ps = this.ps;
    FX.dying = FX.dying.filter(d => t - d.t0 < (d.boss ? 1.6 : 0.6));
    for (const d of FX.dying) {
      const dur = d.boss ? 1.6 : 0.6, k = (t - d.t0) / dur; if (k < 0) continue;
      const X = ox + d.x * TS + TS / 2, Y = oy + d.y * TS + TS - ps;
      ctx.globalAlpha = Math.max(0, 1 - k * k);
      const sx = 1 + k * 0.35, sy = 1 - k * 0.6;
      if (d.boss) { const j = (1 - k) * ps * 2; this.blit(d.s, d.s.c, X + fx_rand(-j, j), Y, d.face < 0, sx, sy); if (Math.random() < 0.6) FX.parts.push({ x: d.x + 0.5 + fx_rand(-1, 1), y: d.y + fx_rand(-1, 0.6), vx: fx_rand(-1, 1), vy: -2, t0: t, life: 0.7, col: Math.random() < 0.5 ? '#ffd75a' : '#ffffff', sz: 1.6, g: 0, glow: 1 }); }
      else this.blit(d.s, d.s.c, X, Y, d.face < 0, sx, sy);
      if (k < 0.25) { ctx.globalAlpha = 1 - k * 4; this.blit(d.s, d.s.w, X, Y, d.face < 0, sx, sy); }
      ctx.globalAlpha = 1;
    }
  },
  lighting(F, x0, y0, x1, y1, ox, oy, t) {
    const vw = x1 - x0 + 1, vh = y1 - y0 + 1, TS = this.TS;
    // 低畫質：光照遮罩每格 4 像素、隔一幀才重算一次（中間那幀直接沿用上一張）
    const LSq = this.q >= 2 ? 4 : this.LS;
    if (this.q >= 2 && this.lm4 && this.lm4.width === vw * LSq && this.lm4.height === vh * LSq && this._lx0 === x0 && this._ly0 === y0 && (this._lf = (this._lf | 0) + 1) % 2) {
      ctx.imageSmoothingEnabled = false; ctx.drawImage(this.lm4, Math.round(ox + x0 * TS), Math.round(oy + y0 * TS), vw * TS, vh * TS); return;
    }
    this._lx0 = x0; this._ly0 = y0;
    if (!this.lm || this.lm.width !== vw || this.lm.height !== vh || this.lm4.width !== vw * LSq) {
      // 光照遮罩都放在 CPU 端的小畫布（willReadFrequently），在小畫布上先平滑放大，最後用最近鄰貼到畫面（像素風的階梯光影，手機上也很省）
      this.lm = document.createElement('canvas'); this.lm.width = vw; this.lm.height = vh; this.lmx = this.lm.getContext('2d', { willReadFrequently: true }); this.lmd = this.lmx.createImageData(vw, vh); this.lit = new Float32Array(vw * vh);
      this.lm4 = document.createElement('canvas'); this.lm4.width = vw * LSq; this.lm4.height = vh * LSq; this.lm4x = this.lm4.getContext('2d', { willReadFrequently: true });
    }
    const d = this.lmd.data, P = G.P, R = Game.stats().sight + 1, vis = G.vis, lit = this.lit;
    const dark = F.biome === 1 || F.biome === 4 || F.biome >= 6 ? 0.66 : 0.58;
    lit.fill(0);
    const flick = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3);
    const src = [];
    const add = (sx, sy, r, i) => {
      const ix0 = Math.max(x0, Math.floor(sx - r)), ix1 = Math.min(x1, Math.ceil(sx + r)), iy0 = Math.max(y0, Math.floor(sy - r)), iy1 = Math.min(y1, Math.ceil(sy + r));
      for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) { const q = ((x - sx) * (x - sx) + (y - sy) * (y - sy)) / (r * r); if (q < 1) lit[(y - y0) * vw + (x - x0)] += i * (1 - q); }
    };
    const pr = this.rs(P);
    for (const [x, y] of F.torches) { if (x < x0 - 4 || x > x1 + 4 || y < y0 - 4 || y > y1 + 4 || !F.seen[y * F.w + x] || !F.seen[(y + 1) * F.w + x]) continue; add(x, y + 1, 4.8, 0.85 * flick); src.push([x, y + 0.55, 3.4, 'rgba(255,160,70,A)', 0.2 * flick]); }
    for (let y = Math.max(0, y0); y <= Math.min(F.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(F.w - 1, x1); x++) {
      const k = y * F.w + x; if (!vis[k]) continue; const v = F.t[k];
      if (v === T.LAVA) { add(x, y, 2.6, 0.32); if ((x + 2 * y) % 4 === 0) src.push([x, y, 2.6, 'rgba(255,110,30,A)', 0.15 + 0.04 * Math.sin(t * 2 + x)]); }
      else if (v === T.CRYSTAL) { add(x, y, 2.6, 0.5); src.push([x, y, 2.2, 'rgba(110,210,255,A)', 0.14]); }
      else if (v === T.FOUNTAIN) { add(x, y, 2.4, 0.5); src.push([x, y, 2, 'rgba(110,190,255,A)', 0.14]); }
      else if (v === T.PORTAL) { add(x, y, 3, 0.6); src.push([x, y, 2.2, 'rgba(' + ((BRANCHES[F.branch || (F.portal && F.portal.b)] || { col: '200,160,255' }).col) + ',A)', 0.16 + 0.05 * Math.sin(t * 3)]); }
      else if (v === T.STAIRS) { add(x, y, 2, 0.4); src.push([x, y, 1.6, F.locked ? 'rgba(255,80,160,A)' : 'rgba(255,220,140,A)', 0.1 + 0.05 * Math.sin(t * 3)]); }
      else if (F.biome === 1 && F.deco[k] && v === T.FLOOR && F.deco[k] < 3) { add(x, y, 2, 0.32); src.push([x, y, 1.6, F.deco[k] === 2 ? 'rgba(90,230,210,A)' : 'rgba(190,140,255,A)', 0.13 + 0.03 * Math.sin(t * 1.5 + x)]); }
      else if (F.biome === 4 && F.deco[k] && v === T.FLOOR) { add(x, y, 1.6, 0.25); src.push([x, y, 1.4, 'rgba(210,90,255,A)', 0.1 + 0.05 * Math.sin(t * 2 + y)]); }
      else if (F.biome === 2 && F.deco[k] === 1 && v === T.FLOOR) { add(x, y, 1.4, 0.25); src.push([x, y, 1.2, 'rgba(255,110,40,A)', 0.1]); }
      else if (F.biome === 5 && F.deco[k] === 2 && v === T.FLOOR) { add(x, y, 1.6, 0.28); src.push([x, y, 1.3, 'rgba(90,230,210,A)', 0.11 + 0.03 * Math.sin(t * 1.7 + x)]); }
      else if (F.biome >= 6 && F.deco[k] === 1 && v === T.FLOOR) { add(x, y, 1.5, 0.25); src.push([x, y, 1.2, F.biome === 6 ? 'rgba(255,215,140,A)' : 'rgba(255,80,110,A)', 0.1 + 0.05 * Math.sin(t * 2.3 + y)]); }
    }
    for (const a of F.altars || []) if (!a.used && vis[a.y * F.w + a.x]) { add(a.x, a.y, 3, 0.6); src.push([a.x, a.y - 0.4, 2.4, 'rgba(' + ALTARS[a.k].rgb + ',A)', 0.18 * flick]); }
    for (const p of F.props || []) if (PROPS[p.k].light && F.seen[p.y * F.w + p.x]) { add(p.x, p.y, 3, 0.55); src.push([p.x, p.y - 0.6, 2.4, 'rgba(' + PROPS[p.k].light + ',A)', 0.2 * (p.k === 'furnace' ? flick : 0.9 + 0.1 * Math.sin(t * 2 + p.x))]); }
    for (const p of F.props || []) if (p.k === 'fire' && !p.used && F.seen[p.y * F.w + p.x]) { add(p.x, p.y, 4.2, 0.8 * flick); src.push([p.x, p.y - 0.2, 3, 'rgba(255,150,60,A)', 0.22 * flick]); }
    for (const c of F.chests || []) if (!c.open && c.gold && vis[c.y * F.w + c.x]) src.push([c.x, c.y, 1.8, 'rgba(255,215,90,A)', 0.12]);
    for (const m of F.mons) if (m.hp > 0 && Game.monVisible(m)) {
      const r = this.rs(m), L = { wisp: '90,170,255', imp: '255,120,40', forge: '255,120,40', lord: '220,80,255', salamander: '255,120,40', witch: '140,220,255', necro: '120,255,120', golem: '120,220,255', mother: '200,120,255', eel: '255,240,140', siren: '120,220,255', starmote: '255,215,120', voidling: '190,120,255', drowned: '90,230,210', kraken: '120,220,255', devourer: '255,90,140' }[m.k] || (m.elite ? ELITES[m.elite].rgb : null);
      if (L) { add(r.x, r.y, 2.8, 0.5); src.push([r.x, r.y, MON[m.k].boss ? 3.2 : 2.2, 'rgba(' + L + ',A)', 0.18]); }
    }
    for (const p of FX.projs) { const k = (t - p.t0) / p.dur; if (k >= 0 && k <= 1 && p.kind !== 'arrow' && p.kind !== 'knife' && p.kind !== 'potion') { const x = lerp(p.x0, p.x1, k) - 0.5, y = lerp(p.y0, p.y1, k) - 0.5; add(x, y, 2.4, 0.6); } }
    FX.lights = FX.lights.filter(L => t - L.t0 < L.dur);
    for (const L of FX.lights) { const k = (t - L.t0) / L.dur; if (k >= 0) add(L.x, L.y, L.r + 1, L.a * 1.5 * (1 - k)); }
    // 暗部＋暗角合成在同一張低解析度遮罩裡，一次畫滿整個畫面
    const hw = this.W / 2, hh = this.H / 2;
    for (let j = 0; j < vh; j++) {
      const y = y0 + j, sy = (oy + (y + 0.5) * TS - hh) / hh;
      for (let i = 0; i < vw; i++) {
        const x = x0 + i, o = (j * vw + i) * 4;
        let a = 1, r = 5, g = 6, b = 16;
        if (x >= 0 && y >= 0 && x < F.w && y < F.h) {
          const k = y * F.w + x;
          if (vis[k]) { const dd = Math.sqrt(dist2(x, y, pr.x, pr.y)) / R; const L = Math.min(1, Math.max(1 - dd * dd * 1.05, 0) + lit[j * vw + i]); a = dark * (1 - L); }
          else if (F.seen[k]) { a = 0.7; r = 8; g = 10; b = 30; }
        }
        if (a < 1) { const sx = (ox + (x + 0.5) * TS - hw) / hw, v = Math.min(1, Math.max(0, (Math.sqrt(sx * sx + sy * sy) - 0.5) / 0.9)) * 0.55; a = 1 - (1 - a) * (1 - v); }
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a * 255;
      }
    }
    this.lmx.putImageData(this.lmd, 0, 0);
    // 1) 暗部遮罩在 CPU 小畫布上平滑放大成每格 4×4
    const LS = LSq, W4 = vw * LS, H4 = vh * LS, l4 = this.lm4x;
    l4.globalCompositeOperation = 'copy'; l4.imageSmoothingEnabled = true; l4.drawImage(this.lm, 0, 0, W4, H4); l4.globalCompositeOperation = 'source-over';
    // 2) 有顏色的光疊在同樣大小的小畫布上
    if (!this.cl || this.cl.width !== W4 || this.cl.height !== H4) { this.cl = document.createElement('canvas'); this.cl.width = W4; this.cl.height = H4; this.clx = this.cl.getContext('2d', { willReadFrequently: true }); }
    const lx = this.clx;
    lx.globalCompositeOperation = 'source-over'; lx.globalAlpha = 1; lx.clearRect(0, 0, W4, H4); lx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, col, a) => {
      const X = (x - x0 + 0.5) * LS, Y = (y - y0 + 0.5) * LS, rr = r * LS;
      if (X + rr < 0 || Y + rr < 0 || X - rr > W4 || Y - rr > H4) return;
      lx.globalAlpha = Math.min(1, a * 1.6); lx.drawImage(this.glowImg(col), X - rr, Y - rr, rr * 2, rr * 2);
    };
    const maxL = this.q >= 2 ? 14 : this.q >= 1 ? 24 : 36;
    if (src.length > maxL) { src.sort((p, q) => dist2(p[0], p[1], pr.x, pr.y) - dist2(q[0], q[1], pr.x, pr.y)); src.length = maxL; }
    for (const s of src) glow(s[0], s[1], s[2], s[3], s[4]);
    glow(pr.x, pr.y, 4.5, 'rgba(255,200,140,A)', 0.07);
    for (const L of FX.lights) { const k = (t - L.t0) / L.dur; if (k >= 0 && k < 1) glow(L.x, L.y, L.r * (L.grow ? 0.5 + k : 1), L.col, L.a * (1 - k)); }
    // 3) 合成成一張「半透明遮罩」：暗的地方蓋黑、有色光的地方往光的顏色混，畫面只要貼一次（加一點點有序抖動，減少色階）
    const DI = l4.getImageData(0, 0, W4, H4), dd = DI.data, gd = lx.getImageData(0, 0, W4, H4).data, BY = Render.BAYER;
    for (let j = 0, o = 0; j < H4; j++) for (let i = 0; i < W4; i++, o += 4) {
      let A = dd[o + 3] + BY[(j & 3) * 4 + (i & 3)];
      const ga = gd[o + 3] / 255, gr = gd[o] * ga, gg = gd[o + 1] * ga, gb = gd[o + 2] * ga, m = gr > gg ? (gr > gb ? gr : gb) : (gg > gb ? gg : gb);
      if (m > 2) {
        const a = A / 255, nA = Math.max(a, m / 255 * 0.85);
        dd[o] = (gr + a * dd[o]) / nA; dd[o + 1] = (gg + a * dd[o + 1]) / nA; dd[o + 2] = (gb + a * dd[o + 2]) / nA; A = nA * 255;
      }
      dd[o + 3] = A;
    }
    l4.putImageData(DI, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.lm4, Math.round(ox + x0 * TS), Math.round(oy + y0 * TS), vw * TS, vh * TS);
  },
  LS: 8,
  BAYER: [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v - 7.5) * 0.9),
  // 預先畫好的放射狀光暈（依顏色快取）。col 可以是 'rgba(r,g,b,A)' 或 'r,g,b'
  glowImg(col) {
    const GC = this.glowCache || (this.glowCache = new Map());
    let img = GC.get(col);
    if (!img) {
      const c = col.indexOf('A') >= 0 ? col : 'rgba(' + col + ',A)';
      img = document.createElement('canvas'); img.width = img.height = 64; const gx = img.getContext('2d'); const g = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, c.replace('A', 1)); g.addColorStop(0.5, c.replace('A', 0.4)); g.addColorStop(1, c.replace('A', 0)); gx.fillStyle = g; gx.fillRect(0, 0, 64, 64); GC.set(col, img);
    }
    return img;
  },
  // 在畫面上畫一個光暈（以格子座標為中心，r 為半徑格數）
  glowAt(X, Y, rr, col, a, add) {
    if (add) ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.drawImage(this.glowImg(col), X - rr, Y - rr, rr * 2, rr * 2);
    ctx.globalAlpha = 1; if (add) ctx.globalCompositeOperation = 'source-over';
  },
  ambient(F, x0, y0, x1, y1, ox, oy, t, dt) {
    const A = AMB[F.biome] || AMB[0], TS = this.TS, ps = this.ps, vis = G.vis, L = this.amb;
    const n = Math.round(A.n * (UI && UI.touch ? 0.7 : 1) * (this.q >= 2 ? 0.4 : this.q >= 1 ? 0.7 : 1));
    while (L.length < n) L.push({ x: fx_rand(x0, x1 + 1), y: fx_rand(y0, y1 + 1), vx: fx_rand(A.vx[0], A.vx[1]), vy: fx_rand(A.vy[0], A.vy[1]), t0: t - fx_rand(0, 3), life: fx_rand(A.life[0], A.life[1]), sz: fx_rand(A.sz[0], A.sz[1]), col: A.cols[(Math.random() * A.cols.length) | 0], ph: Math.random() * TAU });
    if (A.glow) ctx.globalCompositeOperation = 'lighter';
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i], age = t - p.t0;
      p.x += (p.vx + Math.sin(t * 0.8 + p.ph) * 0.12) * dt; p.y += p.vy * dt;
      if (age > p.life || p.x < x0 - 1 || p.x > x1 + 2 || p.y < y0 - 1 || p.y > y1 + 2) { L.splice(i, 1); continue; }
      const tx = Math.floor(p.x), ty = Math.floor(p.y);
      if (tx < 0 || ty < 0 || tx >= F.w || ty >= F.h || !vis[ty * F.w + tx]) continue;
      const k = age / p.life, a = A.a * Math.sin(k * Math.PI) * (A.glow ? 0.6 + 0.4 * Math.sin(t * 4 + p.ph) : 1);
      ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = p.col;
      const s = Math.max(1, Math.round(p.sz * ps));
      ctx.fillRect(Math.round(ox + p.x * TS), Math.round(oy + p.y * TS), s, s);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  },
  drawFx(ox, oy, t, dt) {
    const TS = this.TS, ps = this.ps;
    const sx = x => ox + x * TS, sy = y => oy + y * TS;
    // 投射物
    FX.projs = FX.projs.filter(p => t - p.t0 < p.dur + 0.05);
    for (const p of FX.projs) {
      const k = (t - p.t0) / p.dur; if (k < 0) continue;
      const kk = Math.min(1, k), x = lerp(p.x0, p.x1, kk), y = lerp(p.y0, p.y1, kk), ang = Math.atan2(p.y1 - p.y0, p.x1 - p.x0);
      const col = { arrow: '#e8dcc0', knife: '#eef3fa', bolt: '#bff4ff', fire: '#ff8a2a', frost: '#9fe8ff', void: '#d05cff', spore: '#b0e060', magic: '#c8a8ff', slow: '#a0a0ff', tele: '#d0a0ff', sleep: '#c0d0ff', dig: '#e0d0b0', potion: p.col || '#fff' }[p.kind] || '#fff';
      if (p.kind === 'bolt' || p.kind === 'dig') {
        ctx.globalCompositeOperation = 'lighter';
        for (const [w, a] of [[4, 0.35], [1.5, 1]]) {
          ctx.strokeStyle = w > 2 ? col : '#ffffff'; ctx.lineWidth = ps * (p.kind === 'bolt' ? w : w + 0.5); ctx.globalAlpha = (1 - kk * 0.5) * a; ctx.beginPath(); ctx.moveTo(sx(p.x0), sy(p.y0));
          const n = 8; for (let i = 1; i <= n; i++) { const f = i / n * kk; ctx.lineTo(sx(lerp(p.x0, p.x1, f)) + (i < n ? fx_rand(-1, 1) * ps * 3 : 0), sy(lerp(p.y0, p.y1, f)) + (i < n ? fx_rand(-1, 1) * ps * 3 : 0)); }
          ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; continue;
      }
      if (k > 1) continue;
      ctx.save(); ctx.translate(sx(x), sy(y)); ctx.rotate(ang);
      if (p.kind === 'arrow' || p.kind === 'knife') {
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-ps * 10, -ps * 0.5, ps * 6, ps);
        ctx.fillStyle = col; ctx.fillRect(-ps * 4, -ps * 0.5, ps * 8, ps); ctx.fillStyle = '#fff'; ctx.fillRect(ps * 3, -ps, ps * 2, ps * 2);
        if (p.kind === 'arrow') { ctx.fillStyle = '#d8443a'; ctx.fillRect(-ps * 5, -ps * 1.5, ps * 2, ps); ctx.fillRect(-ps * 5, ps * 0.5, ps * 2, ps); }
      }
      else if (p.kind === 'potion') { ctx.rotate(t * 12); ctx.fillStyle = col; ctx.fillRect(-ps * 2, -ps * 2, ps * 4, ps * 4); ctx.fillStyle = '#e8f4ff'; ctx.fillRect(-ps, -ps * 3, ps * 2, ps); }
      else {
        ctx.globalCompositeOperation = 'lighter';
        this.glowAt(0, 0, ps * 9, PROJ_RGB[p.kind] || '255,255,255', 1); this.glowAt(0, 0, ps * 3.5, '255,255,255', 0.9);
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 2; i++) FX.parts.push({ x, y, vx: fx_rand(-0.6, 0.6) - Math.cos(ang) * 1.5, vy: fx_rand(-0.6, 0.6) - Math.sin(ang) * 1.5, t0: t, life: 0.35, col, sz: 1.5, g: 0, glow: 1 });
      }
      ctx.restore();
    }
    // 擴散圈
    FX.rings = FX.rings.filter(r => t - r.t0 < 0.5);
    for (const r of FX.rings) { const k = (t - r.t0) / 0.5; ctx.strokeStyle = r.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = ps * 3 * (1 - k) + ps; ctx.beginPath(); ctx.arc(sx(r.x), sy(r.y), (r.r + 0.5) * TS * (1 - (1 - k) * (1 - k)), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    // 揮砍弧線
    FX.slashes = FX.slashes.filter(s => t - s.t0 < 0.2);
    ctx.globalCompositeOperation = 'lighter';
    for (const s of FX.slashes) {
      const k = (t - s.t0) / 0.2; if (k < 0) continue;
      const R = TS * (s.big ? 0.6 : 0.45), X = sx(s.x), Y = sy(s.y), a0 = s.a - 1.3 + k * 0.6, a1 = s.a - 1.3 + Math.min(1, k * 2.2) * 2.6;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = s.col; ctx.lineWidth = ps * 3 * (1 - k * 0.5); ctx.beginPath(); ctx.arc(X - Math.cos(s.a) * TS * 0.2, Y - Math.sin(s.a) * TS * 0.2, R, a0, a1); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = ps; ctx.beginPath(); ctx.arc(X - Math.cos(s.a) * TS * 0.2, Y - Math.sin(s.a) * TS * 0.2, R, a0, a1); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // 粒子
    FX.parts = FX.parts.filter(p => t - p.t0 < p.life);
    for (const p of FX.parts) {
      const a = t - p.t0; if (a < 0) continue;
      const x = p.x + p.vx * a, y = p.y + p.vy * a + 0.5 * p.g * a * a * 0.3;
      ctx.globalAlpha = 1 - a / p.life;
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      if (p.ray) { ctx.strokeStyle = p.col; ctx.lineWidth = ps; ctx.beginPath(); ctx.moveTo(sx(p.x + p.vx * a * 0.45), sy(p.y + p.vy * a * 0.45)); ctx.lineTo(sx(x), sy(y)); ctx.stroke(); }
      else { ctx.fillStyle = p.col; const s = Math.max(1, p.sz * ps); ctx.fillRect(Math.round(sx(x) - s / 2), Math.round(sy(y) - s / 2), s, s); }
      if (p.glow) ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    // 數字
    FX.nums = FX.nums.filter(n => t - n.t0 < (n.label ? 1.1 : 0.9));
    for (const n of FX.nums) {
      const a = t - n.t0; if (a < 0) continue;
      const life = n.label ? 1.1 : 0.9, k = a / life;
      const y = n.y - 0.35 - (n.label ? a * 0.6 : (1 - Math.pow(1 - Math.min(1, a * 2.5), 2)) * 0.7);
      const sz = n.big ? 8 : n.label ? 5 : 6.5, pop = a < 0.08 ? 1.35 : 1;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      this.label(n.text, sx(n.x), sy(y), n.col, sz * pop);
    }
    ctx.globalAlpha = 1;
  },
  drawUiMarks(px, py, t) {
    const TS = this.TS, ps = this.ps, P = G.P;
    if (UI.travel && UI.travel.length) {
      ctx.fillStyle = 'rgba(255,215,90,.55)';
      for (const [x, y] of UI.travel) ctx.fillRect(px(x) + TS / 2 - ps, py(y) + TS / 2 - ps, ps * 2, ps * 2);
    }
    const tg = UI.target;
    if (tg) {
      const pts = lineTo(P.x, P.y, tg.x, tg.y);
      ctx.fillStyle = 'rgba(255,240,180,.5)';
      for (const [x, y] of pts.slice(0, -1)) ctx.fillRect(px(x) + TS / 2 - ps, py(y) + TS / 2 - ps, ps * 2, ps * 2);
      const pulse = 1 + 0.08 * Math.sin(t * 8);
      ctx.strokeStyle = tg.ok ? '#ffd75a' : '#ff6b6b'; ctx.lineWidth = ps;
      const X = px(tg.x) + TS / 2, Y = py(tg.y) + TS / 2, s = TS * 0.5 * pulse;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(X + a * s, Y + b * s * 0.5); ctx.lineTo(X + a * s, Y + b * s); ctx.lineTo(X + a * s * 0.5, Y + b * s); ctx.stroke(); }
    }
    if (UI.hover && !UI.target && !UI.touch) {
      const [x, y] = UI.hover; if (G.F.seen[y * G.F.w + x]) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = ps * 0.75; ctx.strokeRect(px(x) + ps / 2, py(y) + ps / 2, TS - ps, TS - ps); }
    }
  },
  minimap(el, s) {
    if (!el || !G || !G.F) return;
    const F = G.F, P = G.P;
    if (el.width !== F.w * s || el.height !== F.h * s) { el.width = F.w * s; el.height = F.h * s; }
    const x = el.getContext('2d');
    x.clearRect(0, 0, el.width, el.height);
    const pal = BIOMES[F.biome].pal;
    for (let j = 0; j < F.h; j++) for (let i = 0; i < F.w; i++) {
      const k = j * F.w + i; if (!F.seen[k]) continue;
      const v = F.t[k];
      let c = null;
      if (v === T.WALL || v === T.SECRET || v === T.PILLAR || v === T.CRYSTAL) c = shade(pal.wallHi, 0.15);
      else if (v === T.STAIRS) c = '#ffd75a';
      else if (v === T.PORTAL) c = '#ff8af0';
      else if (v === T.DOOR || v === T.ODOOR) c = '#b07a40';
      else if (v === T.WATER) c = '#3a7ab0';
      else if (v === T.DEEP) c = '#1f4a7a';
      else if (v === T.CHASM) continue;
      else if (v === T.LAVA) c = '#e05a1a';
      else if (v === T.CARPET) c = '#a83a4a';
      else if (v === T.ALTAR) c = '#c8a0ff';
      else if (v === T.CHEST) c = '#ffb040';
      else c = G.vis[k] ? shade(pal.floor, 0.35) : shade(pal.floor, 0.05);
      x.fillStyle = c; x.fillRect(i * s, j * s, s, s);
    }
    for (const o of F.items) if ((o.seen && F.seen[o.y * F.w + o.x]) || F.detect) { x.fillStyle = o.it.k === 'gold' ? '#ffd75a' : '#d6b8ff'; x.fillRect(o.x * s + s / 4, o.y * s + s / 4, s / 2 + 0.5, s / 2 + 0.5); }
    for (const m of F.mons) if (m.hp > 0 && Game.monVisible(m) && !m.disg) { x.fillStyle = MON[m.k].npc ? '#7dffa0' : MON[m.k].boss ? '#ff40d0' : m.elite ? '#ffb040' : '#ff4a4a'; x.fillRect(m.x * s - 0.5, m.y * s - 0.5, s + 1, s + 1); }
    x.fillStyle = '#fff'; x.fillRect(P.x * s - 1, P.y * s - 1, s + 2, s + 2);
  },
};
