'use strict';
// 深淵地牢：畫面繪製（地形、光影、角色、特效、小地圖）
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const now = () => performance.now() / 1000;

const FX = {
  parts: [], nums: [], projs: [], rings: [], decals: [], shakeAmt: 0, hurtT: 0, pd: 0,
  _d() { return this.pd; },
  delayNext(d) { this.pd = Math.max(this.pd, d); if (!this._q) { this._q = 1; Promise.resolve().then(() => { this.pd = 0; this._q = 0; }); } },
  burst(x, y, col, n = 8) {
    const t0 = now() + this._d();
    for (let i = 0; i < n && this.parts.length < 400; i++) { const a = Math.random() * TAU, s = fx_rand(1.5, 5); this.parts.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, t0, life: fx_rand(0.3, 0.7), col, sz: fx_rand(1, 2.4), g: 9 }); }
  },
  num(x, y, text, col, big) { if (this.nums.length > 60) this.nums.shift(); this.nums.push({ x: x + 0.5 + fx_rand(-0.2, 0.2), y: y + 0.2, text, col, big, t0: now() + this._d() }); },
  text(x, y, text, col) { this.nums.push({ x: x + 0.5, y: y - 0.1, text, col, t0: now() + this._d(), label: 1 }); },
  flash(a) { Render.rs(a).flash = now() + this._d(); },
  bump(a, dx, dy) { const r = Render.rs(a); r.bdx = dx; r.bdy = dy; r.bt = now(); },
  step(a) { },
  shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); },
  hurt(n) { this.hurtT = Math.max(this.hurtT, 0.35 + n * 0.6); },
  corpse(m) { const D = MON[m.k]; this.decals.push({ x: m.x, y: m.y, d: G.depth, col: D.undead ? '#bfb8a8' : m.k === 'slime' || m.k === 'sporeling' || m.k === 'shroom' ? '#3a8a4a' : '#7a1a22', s: Math.random() * 1000 }); if (this.decals.length > 120) this.decals.shift(); },
  ring(x, y, r, col) { this.rings.push({ x: x + 0.5, y: y + 0.5, r, col, t0: now() }); },
  dash(a) { const r = Render.rs(a); for (let i = 0; i < 10; i++) this.parts.push({ x: r.x + 0.5, y: r.y + 0.5, vx: fx_rand(-1, 1), vy: fx_rand(-1, 1), t0: now(), life: 0.4, col: '#ffd0a0', sz: 2, g: 0 }); },
  proj(x0, y0, x1, y1, kind, col) {
    const d = Math.max(1, cheb(x0, y0, x1, y1)), dur = Math.min(0.45, 0.04 + d * 0.035);
    this.projs.push({ x0: x0 + 0.5, y0: y0 + 0.5, x1: x1 + 0.5, y1: y1 + 0.5, kind, col, t0: now() + this._d(), dur });
    this.delayNext(dur);
  },
};

const Render = {
  ps: 3, TS: 48, dpr: 1, W: 0, H: 0, cam: { x: 0, y: 0 }, _rs: new Map(), lm: null, lmx: null, inset: { t: 60, b: 120, l: 0, r: 0 }, miniT: 0, statue: null,
  rs(a) {
    let r = this._rs.get(a.id);
    if (!r) { r = { x: a.x, y: a.y, flash: 0, bt: 0, bdx: 0, bdy: 0, seed: Math.random() * 10 }; this._rs.set(a.id, r); }
    return r;
  },
  resize() {
    const dpr = this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.W = cv.width = Math.round(innerWidth * dpr); this.H = cv.height = Math.round(innerHeight * dpr);
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    const target = [17, 13.5, 10.5][clamp((Store.set.zoom | 0) + 1, 0, 2)];
    const base = Math.min(this.W, this.H - (this.inset.t + this.inset.b) * dpr * 0.6);
    this.ps = Math.max(2, Math.round(base / (16 * target)));
    this.TS = this.ps * 16;
  },
  snapCam() { if (!G) return; this.cam.x = G.P.x; this.cam.y = G.P.y; this._rs.clear(); },
  // 畫面中心（扣掉上下的介面）
  center() { const d = this.dpr, I = this.inset; return [(I.l + (innerWidth - I.l - I.r) / 2) * d, (I.t + (innerHeight - I.t - I.b) / 2) * d]; },
  toScreen(tx, ty) { const [cx, cy] = this.center(); return [cx + (tx - this.cam.x - 0.5) * this.TS, cy + (ty - this.cam.y - 0.5) * this.TS]; },
  toTile(px, py) { const [cx, cy] = this.center(), d = this.dpr; return [Math.floor((px * d - cx) / this.TS + this.cam.x + 0.5), Math.floor((py * d - cy) / this.TS + this.cam.y + 0.5)]; },

  tileImg(F, x, y, v, t) {
    const A = Art.tiles, k = y * F.w + x;
    switch (v) {
      case T.WALL: case T.SECRET: {
        const below = Gen.get(F, x, y + 1);
        const open = TP[below].walk || below === T.FOUNTAIN || below === T.DRYFOUNT || below === T.PILLAR || below === T.CRYSTAL;
        if (open && F.seen[(y + 1) * F.w + x]) { if (F.torches.length && this.isTorch(F, x, y)) return A.torch; return A.face[hash2(x, y, 3) < 0.25 ? 1 : 0]; }
        return A.wall[hash2(x, y, 5) < 0.2 ? 1 : 0];
      }
      case T.FLOOR: case T.STAIRS: return v === T.STAIRS ? A.stairs : A.floor[(hash2(x, y, 1) * 4) | 0];
      case T.DOOR: return A.door; case T.ODOOR: return A.odoor;
      case T.WATER: return A.water[((t * 2.2 + hash2(x, y, 9) * 3) | 0) % 3];
      case T.LAVA: return A.lava[((t * 1.6 + hash2(x, y, 9) * 3) | 0) % 3];
      case T.GRASS: return A.grass[hash2(x, y, 2) < 0.5 ? 0 : 1];
      case T.FOUNTAIN: return A.fountain; case T.DRYFOUNT: return A.dryfount;
      case T.RUBBLE: return A.rubble; case T.PILLAR: return A.pillar; case T.CARPET: return A.carpet;
      case T.CRYSTAL: return A.crystal; case T.BRIDGE: return A.bridge; case T.ASH: return A.ash; case T.ICE: return A.ice;
    }
    return A.floor[0];
  },
  isTorch(F, x, y) { if (!(F._tset instanceof Set)) { F._tset = new Set(F.torches.map(([a, b]) => a + b * 1000)); } return F._tset.has(x + y * 1000); },

  draw() {
    const t = now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!G || !G.F || !Art.tiles) { ctx.fillStyle = '#07060c'; ctx.fillRect(0, 0, this.W, this.H); return; }
    const F = G.F, P = G.P, TS = this.TS, B = BIOMES[F.biome];
    ctx.fillStyle = B.pal.bg; ctx.fillRect(0, 0, this.W, this.H);
    ctx.imageSmoothingEnabled = false;
    // 角色位置補間
    const dt = Math.min(0.05, t - (this.lt || t)); this.lt = t;
    for (const a of [P].concat(F.mons)) { const r = this.rs(a); const k = 1 - Math.pow(0.0005, dt); if (Math.abs(r.x - a.x) > 6 || Math.abs(r.y - a.y) > 6) { r.x = a.x; r.y = a.y; } r.x += (a.x - r.x) * k; r.y += (a.y - r.y) * k; }
    const pr = this.rs(P);
    const ck = 1 - Math.pow(0.004, dt);
    this.cam.x += (pr.x - this.cam.x) * ck; this.cam.y += (pr.y - this.cam.y) * ck;
    // 鏡頭晃動
    let sx = 0, sy = 0;
    if (FX.shakeAmt > 0.1) { sx = fx_rand(-1, 1) * FX.shakeAmt * this.dpr; sy = fx_rand(-1, 1) * FX.shakeAmt * this.dpr; FX.shakeAmt *= Math.pow(0.002, dt); } else FX.shakeAmt = 0;
    ctx.setTransform(1, 0, 0, 1, Math.round(sx), Math.round(sy));
    const [cx, cy] = this.center();
    const x0 = Math.floor(this.cam.x - cx / TS) - 1, x1 = Math.ceil(this.cam.x + (this.W - cx) / TS) + 1;
    const y0 = Math.floor(this.cam.y - cy / TS) - 1, y1 = Math.ceil(this.cam.y + (this.H - cy) / TS) + 1;
    const ox = cx - (this.cam.x + 0.5) * TS, oy = cy - (this.cam.y + 0.5) * TS;
    const px = x => Math.round(ox + x * TS), py = y => Math.round(oy + y * TS);
    const vis = G.vis;
    // 地形
    for (let y = Math.max(0, y0); y <= Math.min(F.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(F.w - 1, x1); x++) {
      const k = y * F.w + x; if (!F.seen[k]) continue;
      const v = F.t[k], X = px(x), Y = py(y);
      ctx.drawImage(this.tileImg(F, x, y, v, t), X, Y, TS, TS);
      if (F.deco[k] && (v === T.FLOOR)) ctx.drawImage(Art.tiles.deco[F.deco[k] - 1], X, Y, TS, TS);
      if (TP[v].walk && v !== T.LAVA && v !== T.WATER) {
        const n = Gen.get(F, x, y - 1);
        if (n === T.WALL || n === T.SECRET || n === T.DOOR) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(X, Y, TS, this.ps * 3); ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(X, Y + this.ps * 3, TS, this.ps * 2); }
        const w = Gen.get(F, x - 1, y); if (w === T.WALL || w === T.SECRET) { ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(X, Y, this.ps * 2, TS); }
      }
    }
    // 血跡
    for (const d of FX.decals) if (d.d === G.depth && F.seen[d.y * F.w + d.x]) {
      ctx.fillStyle = d.col; ctx.globalAlpha = 0.55;
      for (let i = 0; i < 5; i++) { const a = hash2(i, d.s, 1) * TAU, r = hash2(d.s, i, 2) * 5; ctx.fillRect(px(d.x) + (8 + Math.cos(a) * r) * this.ps | 0, py(d.y) + (10 + Math.sin(a) * r * 0.6) * this.ps | 0, this.ps * (1 + (i % 2)), this.ps); }
      ctx.globalAlpha = 1;
    }
    // 陷阱
    for (const tr of F.traps) if (!tr.hid && F.seen[tr.y * F.w + tr.x]) ctx.drawImage(Art.tiles.trap[tr.k], px(tr.x), py(tr.y), TS, TS);
    // 道具
    for (const o of F.items) {
      const k = o.y * F.w + o.x;
      if (vis[k]) o.seen = 1;
      if (!(o.seen && F.seen[k]) && !F.detect) continue;
      const bob = Math.sin(t * 2.5 + o.x * 1.3 + o.y) * this.ps * 0.6;
      ctx.drawImage(Art.itemSprite(o.it).c, px(o.x), py(o.y) + bob - this.ps, TS, TS);
      if (o.it.price && vis[k]) { this.label(o.it.price + '$', px(o.x) + TS / 2, py(o.y) + TS - this.ps, '#ffd75a', 4.2); }
      else if (vis[k] && hash2(o.x, o.y, (t * 1.5) | 0) < 0.12) { ctx.fillStyle = '#fff'; ctx.fillRect(px(o.x) + (4 + hash2(o.y, o.x, 3) * 8 | 0) * this.ps, py(o.y) + (4 + hash2(o.x, 7, o.y) * 6 | 0) * this.ps, this.ps, this.ps); }
    }
    // 雲霧
    for (const c of F.clouds) {
      if (!vis[c.y * F.w + c.x]) continue;
      const col = { poison: '120,230,80', conf: '220,140,255', para: '255,230,120', fire: '255,120,40' }[c.k];
      for (let i = 0; i < 3; i++) {
        const a = t * (1 + i * 0.3) + c.x * 2 + i * 2, r = TS * (0.32 + 0.08 * Math.sin(a * 1.7));
        const g = ctx.createRadialGradient(px(c.x) + TS / 2 + Math.cos(a) * TS * 0.15, py(c.y) + TS / 2 + Math.sin(a) * TS * 0.15, 0, px(c.x) + TS / 2, py(c.y) + TS / 2, r * 1.6);
        g.addColorStop(0, 'rgba(' + col + ',' + (c.k === 'fire' ? 0.7 : 0.38) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = g; ctx.fillRect(px(c.x) - TS * 0.3, py(c.y) - TS * 0.3, TS * 1.6, TS * 1.6);
      }
      if (c.k === 'fire' && Math.random() < 0.3) FX.parts.push({ x: c.x + Math.random(), y: c.y + 0.8, vx: fx_rand(-0.3, 0.3), vy: -fx_rand(1, 2.5), t0: t, life: 0.5, col: Math.random() < 0.5 ? '#ffd040' : '#ff6a2a', sz: 1.5, g: -1 });
    }
    // 角色
    const actors = F.mons.filter(m => m.hp > 0 && (Game.monVisible(m) || m.disg && F.seen[m.y * F.w + m.x] && vis[m.y * F.w + m.x]));
    actors.push(P);
    actors.sort((a, b) => this.rs(a).y - this.rs(b).y);
    for (const a of actors) this.drawActor(a, px, py, t);
    // 光影
    this.lighting(F, x0, y0, x1, y1, ox, oy, t);
    // 投射物與粒子
    this.drawFx(ox, oy, t, dt);
    // 目標指示
    if (typeof UI !== 'undefined') this.drawUiMarks(px, py, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 受傷紅框
    const low = P.hp < P.mhp * 0.3 && !G.over ? 0.25 + 0.12 * Math.sin(t * 5) : 0;
    if (FX.hurtT > 0 || low > 0) {
      const a = Math.max(low, Math.min(0.6, FX.hurtT));
      const g = ctx.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.35, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.75);
      g.addColorStop(0, 'rgba(180,0,20,0)'); g.addColorStop(1, 'rgba(180,0,20,' + a + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
      FX.hurtT = Math.max(0, FX.hurtT - dt * 1.5);
    }
    if (t - this.miniT > 0.25 || UI.miniDirty) { this.miniT = t; UI.miniDirty = false; this.minimap(document.getElementById('mini'), 3); }
  },
  label(s, x, y, col, size = 5) {
    ctx.font = (size * this.ps) + 'px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = this.ps * 1.2; ctx.strokeStyle = 'rgba(10,6,16,.9)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
  },
  drawActor(a, px, py, t) {
    const r = this.rs(a), TS = this.TS, ps = this.ps;
    let X = px(0) + r.x * TS, Y = py(0) + r.y * TS;
    const bt = t - r.bt; if (bt < 0.16) { const k = Math.sin(bt / 0.16 * Math.PI) * 0.28; X += r.bdx * k * TS; Y += r.bdy * k * TS; }
    let spr, scale = 1, alpha = 1;
    if (a.isP) spr = Art.sprite(CLASSES[a.cls].spr);
    else {
      const D = MON[a.k];
      if (a.disg) spr = a.k === 'mimic' ? Art.sprite('chest') : (this.statue || (this.statue = Art.sprite('gargoyle', { e: '#55555f', g: '#8f8f9a', G: '#777783', h: '#a8a8b0' })));
      else spr = Art.sprite(D.spr);
      if (D.boss) scale = D.final ? 1.7 : 1.45;
      if (D.invis && !a.st.revealed && !Game.canSeeInvis()) alpha = 0.45 + 0.15 * Math.sin(t * 6);
    }
    if (a.isP && a.st.invis) alpha = 0.45;
    const asleep = !a.isP && (!a.awake || a.st.sleep > 0) && !a.disg;
    const bob = a.disg ? 0 : asleep ? 0 : Math.round(Math.sin(t * 3.2 + r.seed) * 0.6) * ps;
    const w = TS * scale, h = TS * scale;
    const dx = Math.round(X + (TS - w) / 2), dy = Math.round(Y + TS - h) + bob;
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(X + TS / 2, Y + TS - ps * 1.5, w * 0.3, ps * 1.6 * scale, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = alpha;
    if (a.isP && Game.tile(a.x, a.y) === T.WATER) { ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, w, h - ps * 3); ctx.clip(); ctx.drawImage(spr.c, dx, dy, w, h); ctx.restore(); }
    else ctx.drawImage(spr.c, dx, dy, w, h);
    if (t - r.flash < 0.12 && t >= r.flash) { ctx.globalAlpha = 0.85; ctx.drawImage(spr.w, dx, dy, w, h); }
    ctx.globalAlpha = 1;
    const st = a.st || {};
    if (st.freeze > 0) { ctx.fillStyle = 'rgba(140,220,255,.35)'; ctx.fillRect(dx + ps * 2, dy + ps * 2, w - ps * 4, h - ps * 3); }
    if (st.burn > 0 && Math.random() < 0.4) FX.parts.push({ x: r.x + 0.3 + Math.random() * 0.4, y: r.y + 0.6, vx: 0, vy: -2, t0: t, life: 0.4, col: '#ff8a2a', sz: 1.6, g: -1 });
    if (st.poison > 0 && Math.random() < 0.08) FX.parts.push({ x: r.x + 0.3 + Math.random() * 0.4, y: r.y + 0.3, vx: 0, vy: -0.8, t0: t, life: 0.6, col: '#7be04a', sz: 1.3, g: 0 });
    if (asleep) this.label('z', X + TS * 0.8 + Math.sin(t * 2) * ps, Y + ps * 2 - (t * 4 % 4) * ps * 0.5, '#cfe6ff', 4);
    if (st.conf > 0) this.label('?', X + TS * 0.8, Y + ps * 3, '#e0a0ff', 5);
    if (st.stun > 0 || st.para > 0) this.label('*', X + TS * 0.5, Y + ps * 1, '#ffe08a', 5);
    // HP 條
    if (!a.isP && !a.disg && a.hp < a.mhp && !MON[a.k].npc) {
      const bw = TS * 0.75 * Math.min(1.4, scale), bx = X + (TS - bw) / 2, by = dy - ps * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(bx - ps / 2, by - ps / 2, bw + ps, ps * 2);
      const f = Math.max(0, a.hp / a.mhp);
      ctx.fillStyle = f > 0.5 ? '#6fe06a' : f > 0.25 ? '#ffc040' : '#ff4a4a'; ctx.fillRect(bx, by, bw * f, ps);
    }
  },
  lighting(F, x0, y0, x1, y1, ox, oy, t) {
    const vw = x1 - x0 + 1, vh = y1 - y0 + 1;
    if (!this.lm || this.lm.width !== vw || this.lm.height !== vh) { this.lm = document.createElement('canvas'); this.lm.width = vw; this.lm.height = vh; this.lmx = this.lm.getContext('2d'); this.lmd = this.lmx.createImageData(vw, vh); }
    const d = this.lmd.data, P = G.P, R = Game.stats().sight + 1, vis = G.vis;
    const B = BIOMES[F.biome], dark = F.biome === 1 || F.biome === 4 ? 0.62 : 0.5;
    for (let j = 0; j < vh; j++) for (let i = 0; i < vw; i++) {
      const x = x0 + i, y = y0 + j, o = (j * vw + i) * 4;
      let a = 255;
      if (x >= 0 && y >= 0 && x < F.w && y < F.h) {
        const k = y * F.w + x;
        if (vis[k]) { const dd = Math.sqrt(dist2(x, y, P.x, P.y)) / R; a = Math.min(dark, dd * dd * 0.85) * 255; }
        else if (F.seen[k]) a = 186;
      }
      d[o] = 5; d[o + 1] = 6; d[o + 2] = 16; d[o + 3] = a;
    }
    this.lmx.putImageData(this.lmd, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.lm, Math.round(ox + x0 * this.TS), Math.round(oy + y0 * this.TS), vw * this.TS, vh * this.TS);
    ctx.imageSmoothingEnabled = false;
    // 光源（加亮）
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, col, a) => {
      const X = ox + (x + 0.5) * this.TS, Y = oy + (y + 0.5) * this.TS, rr = r * this.TS;
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, rr); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
      ctx.fillStyle = g; ctx.fillRect(X - rr, Y - rr, rr * 2, rr * 2);
    };
    let n = 0;
    const flick = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3);
    for (const [x, y] of F.torches) { if (x < x0 || x > x1 || y < y0 || y > y1 || !vis[y * F.w + x]) continue; glow(x, y + 0.6, 3.2, 'rgba(255,170,80,A)', 0.22 * flick); if (++n > 30) break; }
    for (let y = Math.max(0, y0); y <= Math.min(F.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(F.w - 1, x1); x++) {
      const k = y * F.w + x; if (!vis[k]) continue; const v = F.t[k];
      if (v === T.LAVA && (x + y) % 2 === 0) glow(x, y, 2, 'rgba(255,110,30,A)', 0.16 + 0.04 * Math.sin(t * 2 + x));
      else if (v === T.CRYSTAL) glow(x, y, 2.2, 'rgba(110,210,255,A)', 0.16);
      else if (v === T.FOUNTAIN) glow(x, y, 2, 'rgba(110,190,255,A)', 0.14);
      else if (v === T.STAIRS) glow(x, y, 1.4, 'rgba(255,220,140,A)', 0.08 + 0.04 * Math.sin(t * 3));
      else if (F.biome === 1 && F.deco[k] && v === T.FLOOR) glow(x, y, 1.6, F.deco[k] === 2 ? 'rgba(90,230,210,A)' : 'rgba(190,140,255,A)', 0.13);
      else if (F.biome === 4 && F.deco[k] && v === T.FLOOR) glow(x, y, 1.4, 'rgba(210,90,255,A)', 0.1 + 0.05 * Math.sin(t * 2 + y));
    }
    const pr = this.rs(P);
    glow(pr.x, pr.y, 4.5, 'rgba(255,200,140,A)', 0.09);
    for (const m of F.mons) if (m.hp > 0 && Game.monVisible(m) && (m.k === 'wisp' || m.k === 'imp' || m.k === 'forge' || m.k === 'lord')) { const r = this.rs(m); glow(r.x, r.y, 2.4, m.k === 'wisp' ? 'rgba(90,170,255,A)' : m.k === 'lord' ? 'rgba(220,80,255,A)' : 'rgba(255,120,40,A)', 0.2); }
    ctx.globalCompositeOperation = 'source-over';
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
        ctx.strokeStyle = col; ctx.lineWidth = ps * (p.kind === 'bolt' ? 1.5 : 2); ctx.globalAlpha = 1 - kk * 0.5; ctx.beginPath(); ctx.moveTo(sx(p.x0), sy(p.y0));
        const n = 8; for (let i = 1; i <= n; i++) { const f = i / n * kk; ctx.lineTo(sx(lerp(p.x0, p.x1, f)) + (i < n ? fx_rand(-1, 1) * ps * 3 : 0), sy(lerp(p.y0, p.y1, f)) + (i < n ? fx_rand(-1, 1) * ps * 3 : 0)); }
        ctx.stroke(); ctx.globalAlpha = 1; continue;
      }
      if (k > 1) continue;
      ctx.save(); ctx.translate(sx(x), sy(y)); ctx.rotate(ang);
      if (p.kind === 'arrow' || p.kind === 'knife') { ctx.fillStyle = col; ctx.fillRect(-ps * 4, -ps * 0.5, ps * 8, ps); ctx.fillStyle = '#fff'; ctx.fillRect(ps * 3, -ps, ps * 2, ps * 2); }
      else if (p.kind === 'potion') { ctx.rotate(t * 12); ctx.fillStyle = col; ctx.fillRect(-ps * 2, -ps * 2, ps * 4, ps * 4); ctx.fillStyle = '#e8f4ff'; ctx.fillRect(-ps, -ps * 3, ps * 2, ps); }
      else {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ps * 6); g.addColorStop(0, '#fff'); g.addColorStop(0.3, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(-ps * 6, -ps * 6, ps * 12, ps * 12);
        if (Math.random() < 0.7) FX.parts.push({ x, y, vx: fx_rand(-0.5, 0.5), vy: fx_rand(-0.5, 0.5), t0: t, life: 0.3, col, sz: 1.5, g: 0 });
      }
      ctx.restore();
    }
    // 擴散圈
    FX.rings = FX.rings.filter(r => t - r.t0 < 0.45);
    for (const r of FX.rings) { const k = (t - r.t0) / 0.45; ctx.strokeStyle = r.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = ps * 2 * (1 - k) + ps; ctx.beginPath(); ctx.arc(sx(r.x), sy(r.y), (r.r + 0.5) * TS * k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    // 粒子
    FX.parts = FX.parts.filter(p => t - p.t0 < p.life);
    for (const p of FX.parts) {
      const a = t - p.t0; if (a < 0) continue;
      const x = p.x + p.vx * a, y = p.y + p.vy * a + 0.5 * p.g * a * a * 0.3;
      ctx.globalAlpha = 1 - a / p.life; ctx.fillStyle = p.col; const s = Math.max(1, p.sz * ps);
      ctx.fillRect(Math.round(sx(x) - s / 2), Math.round(sy(y) - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
    // 數字
    FX.nums = FX.nums.filter(n => t - n.t0 < (n.label ? 1.1 : 0.9));
    for (const n of FX.nums) {
      const a = t - n.t0; if (a < 0) continue;
      const life = n.label ? 1.1 : 0.9, k = a / life;
      const y = n.y - 0.2 - (n.label ? a * 0.6 : (1 - Math.pow(1 - Math.min(1, a * 2.5), 2)) * 0.7);
      const sz = n.big ? 8 : n.label ? 5 : 6.5, pop = a < 0.08 ? 1.3 : 1;
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
      else if (v === T.DOOR || v === T.ODOOR) c = '#b07a40';
      else if (v === T.WATER) c = '#3a7ab0';
      else if (v === T.LAVA) c = '#e05a1a';
      else if (v === T.CARPET) c = '#a83a4a';
      else c = G.vis[k] ? shade(pal.floor, 0.35) : shade(pal.floor, 0.05);
      x.fillStyle = c; x.fillRect(i * s, j * s, s, s);
    }
    for (const o of F.items) if ((o.seen && F.seen[o.y * F.w + o.x]) || F.detect) { x.fillStyle = o.it.k === 'gold' ? '#ffd75a' : '#d6b8ff'; x.fillRect(o.x * s + s / 4, o.y * s + s / 4, s / 2 + 0.5, s / 2 + 0.5); }
    for (const m of F.mons) if (m.hp > 0 && Game.monVisible(m) && !m.disg) { x.fillStyle = MON[m.k].npc ? '#7dffa0' : MON[m.k].boss ? '#ff40d0' : '#ff4a4a'; x.fillRect(m.x * s - 0.5, m.y * s - 0.5, s + 1, s + 1); }
    x.fillStyle = '#fff'; x.fillRect(P.x * s - 1, P.y * s - 1, s + 2, s + 2);
  },
};
