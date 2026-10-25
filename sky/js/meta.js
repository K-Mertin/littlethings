'use strict';
// 耐玩度：三種機體、本機排行榜（分數＋獎章）、練習模式（已過的關、可直接打頭目）、
// 第 9 關後的「超限」武器等級（Lv9、Lv10）、第 10 關出現的新武器「迴旋光刃」

// ================= 存檔欄位（舊存檔自動補上）=================
{
  const d = Store.data;
  if (!d.ship) d.ship = 'falcon';
  if (!d.rank || typeof d.rank !== 'object') d.rank = {};
  for (const k of ['easy', 'normal', 'hard']) if (!Array.isArray(d.rank[k])) d.rank[k] = [];
  if (typeof d.cleared !== 'number') d.cleared = Math.max(0, (d.reached || 1) - 1);
  if (!d.pbest || typeof d.pbest !== 'object') d.pbest = {};
}

// ================= 機體 =================
const SHIPS = {
  falcon: { name: '白隼', en: 'FALCON', spr: 'player', spd: 1, hitk: 1, dmgk: 1, bomb: 'std', st: [3, 3, 3, 3],
    note: '平衡型。標準的速度與判定，炸彈會清光整個畫面的子彈。' },
  raptor: { name: '赤鋒', en: 'RAPTOR', spr: 'raptor', spd: 1.17, hitk: 1.18, dmgk: 1.15, bomb: 'pillar', st: [5, 4, 2, 3],
    note: '高速強襲型。速度快、火力 +15%，但被打中的判定比較大。炸彈是正前方的烈焰巨柱。' },
  aegis: { name: '蒼盾', en: 'AEGIS', spr: 'aegis', spd: 0.86, hitk: 0.72, dmgk: 1, bomb: 'shield', st: [2, 3, 5, 4],
    note: '重裝防禦型。比較慢但判定很小，還有會自動充能的護盾（擋一次）。炸彈變成長時間防護罩。' },
};
function curShip() { return SHIPS[G.ship] || SHIPS.falcon; }
G.ship = SHIPS[Store.data.ship] ? Store.data.ship : 'falcon';
function applyShip() { const S = curShip(); P.spd = S.spd; P.hitk = S.hitk; P.spr = S.spr; P.shield = G.ship === 'aegis' ? 1 : 0; P.shT = 0; }

// 2D 備用圖
for (const [k, tint] of [['raptor', 'rgba(200,30,40,.45)'], ['aegis', 'rgba(40,110,220,.4)']]) {
  SPR[k] = { w: 36, h: 40, draw(g) { SPR.player.draw(g); g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(-20, -22, 40, 44); g.globalCompositeOperation = 'source-over'; } };
}
Object.assign(EXTRA_MODELS, {
  raptor(K) {
    const RD = K.M(0xc8202a, { m: 0.35, r: 0.28, cc: 1 }), BK = K.M(0x1c1e24, { m: 0.85, r: 0.32 }), GR = K.M(0x4a4e58, { m: 0.85, r: 0.3 }), GD = K.M(0xe0b040, { m: 0.9, r: 0.25, cc: 1, panel: false });
    const OR = K.G(0xffa040, 2.8), GL = K.glass(0x2a1205, 0x8a4a10);
    K.extM([2, 2, 12, -4, 18, 6, 17, 10, 10, 9, 2, 12], 1.4, RD, 0, 0.5);
    K.extM([12, -4, 18, 6, 15, 6], 0.3, BK, 1.4, 0);
    K.extM([2, -12, 7, -10, 7, -8, 2, -7], 0.8, BK, 0.9, 0.3);
    K.lathe([[0, -23], [1.1, -21], [2.2, -17], [3.2, -10], [4, -2], [4.4, 8], [4, 15], [3.2, 18.4], [0.2, 19]], BK, { sy: 0.8, y: 1.8 });
    K.lathe([[0, -23.2], [1.2, -21], [2.3, -17.6], [2.6, -16], [0.2, -15.9]], GD, { sy: 0.9, y: 1.84 });
    K.sph(2, 1.9, 5.4, 0, 4.2, -8, GL);
    for (const s of [-1, 1]) {
      K.cyl(2.3, 2.1, 10, s * 3.4, 1.3, 13, GR); K.cyl(1.8, 1.8, 0.7, s * 3.4, 1.3, 18.3, OR);
      const f = K.box(0.8, 5.6, 6.4, s * 5.6, 4.4, 13.4, RD); f.rotation.z = -s * 0.5;
    }
    K.barM(3, 2.4, 16.6, 8.8, 2, 0.7, 0.3, OR);
    K.barM(2.6, -11, 6.6, -8.6, 1.7, 0.5, 0.3, K.G(0xffd070, 2.6));
  },
  aegis(K) {
    const WH = K.M(0xe6edf6, { m: 0.25, r: 0.28, cc: 1 }), BL = K.M(0x2a5ab0, { m: 0.4, r: 0.28, cc: 1 }), GR = K.M(0x56616f, { m: 0.85, r: 0.3 }), DK = K.M(0x1f242b, { m: 0.9, r: 0.42 });
    const CY = K.G(0x50d8ff, 2.8), GL = K.glass(0x0a2a44, 0x0b5a8a);
    K.extM([2, -6, 12, 2, 19, 10, 18.5, 13.5, 4, 13], 1.8, WH, 0, 0.6);
    K.extM([12, 2, 19, 10, 17, 10.4, 11, 4.4], 0.4, BL, 1.7, 0);
    K.lathe([[0, -19], [1.6, -17], [3, -12], [4.6, -4], [5.4, 6], [5, 14], [3.8, 18], [0.2, 18.6]], WH, { sy: 0.85, y: 2 });
    K.lathe([[0, -19.2], [1.7, -17], [2.9, -13.5], [3.2, -12.5], [0.2, -12.4]], BL, { sy: 0.92, y: 2.04 });
    K.sph(2.6, 2.3, 5.2, 0, 4.8, -6.5, GL);
    K.torus(6.6, 0.7, 0, 4.6, 6, CY);
    for (const s of [-1, 1]) { K.cyl(2.9, 2.7, 11, s * 4.4, 1.4, 12.8, DK); K.cyl(2.3, 2.3, 0.7, s * 4.4, 1.4, 18.5, CY); K.cylV(1.6, 1.8, 2.4, s * 14, 1.4, 9, GR); K.sph(1, 0.8, 1, s * 14, 4, 9, CY); }
    K.barM(4.6, 0, 17.8, 11.8, 2, 0.6, 0.3, CY);
  },
});
for (const k of ['raptor', 'aegis']) {
  EXTRA_BAKES.push([k, 38, 44, EXTRA_MODELS[k]]);
  for (let i = 1; i <= 3; i++) EXTRA_BAKES.push([k + '_r' + i, 38, 44, EXTRA_MODELS[k], { roll: -0.28 * i }], [k + '_l' + i, 38, 44, EXTRA_MODELS[k], { roll: 0.28 * i }]);
}
drawPlayer = function (ctx) {
  if (!P.alive) return;
  if (P.inv > 0 && !P.entering && Math.floor(G.t * 20) % 2 === 0 && G.bombT <= 0) return;
  const base = P.spr || 'player', baked = Bake.has(base);
  const sx = baked ? 1 : 1 - Math.abs(P.bank) * 0.22;
  const bi = Math.round(clamp(P.bank, -1, 1) * 3);
  const pn = baked && bi ? base + (bi > 0 ? '_r' : '_l') + Math.abs(bi) : base;
  const ex = (G.ship === 'aegis' ? 4.4 : 3.6) * Math.cos(bi * 0.28);
  const fl = 7 + Math.random() * 6 + (P.auto ? 14 : 0);
  const hot = G.ship === 'raptor';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const ox of [-ex, ex]) {
    const gr = ctx.createLinearGradient(0, P.y + 18, 0, P.y + 19 + fl);
    gr.addColorStop(0, 'rgba(255,255,240,.95)'); gr.addColorStop(0.35, hot ? 'rgba(255,170,60,.85)' : 'rgba(90,210,255,.85)'); gr.addColorStop(1, hot ? 'rgba(255,60,20,0)' : 'rgba(40,90,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(P.x + ox * sx - 2.2, P.y + 18.5); ctx.lineTo(P.x + ox * sx + 2.2, P.y + 18.5); ctx.lineTo(P.x + ox * sx, P.y + 19 + fl); ctx.fill();
  }
  if (P.od > 0) { // 超限光環
    const k = 0.5 + 0.5 * Math.sin(G.t * 8);
    glowDot(ctx, P.x, P.y, 26 + k * 4, `rgba(255,210,80,${0.12 + 0.08 * k + (P.od - 1) * 0.08})`);
  }
  ctx.restore();
  Art.draw(ctx, pn, P.x, P.y, 0, 1, sx, 1);
  if (P.shield && G.ship === 'aegis' && G.bombT <= 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(110,210,255,${0.35 + 0.15 * Math.sin(G.t * 5)})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * TAU / 6 + G.t * 0.6; i ? ctx.lineTo(P.x + Math.cos(a) * 21, P.y + Math.sin(a) * 21) : ctx.moveTo(P.x + Math.cos(a) * 21, P.y + Math.sin(a) * 21); } ctx.stroke(); ctx.restore();
  }
  if (P.inv > 0 && P.entering <= 0 && G.bombT <= 0) { ctx.strokeStyle = 'rgba(120,220,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P.x, P.y, 22, 0, TAU); ctx.stroke(); }
};

// 火力加成（機體＋超限）
hurt = (function (base) {
  return function (e, d) { base(e, d * (curShip().dmgk) * (P.od >= 1 ? 1.2 : 1) * (P.od >= 2 ? 1.08 : 1)); };
})(hurt);

// 護盾（蒼盾）
playerHit = (function (base) {
  return function () {
    if (G.ship === 'aegis' && P.shield && P.alive && P.inv <= 0 && G.bombT <= 0 && !P.auto) {
      P.shield = 0; P.shT = 22; P.inv = 1.4; G.shake = 5;
      for (const b of G.eb) if (d2(b.x, b.y, P.x, P.y) < 70 * 70) { b.dead = true; fxP({ k: 'c', x: b.x, y: b.y, vx: 0, vy: -30, life: 0, max: 0.3 }); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; fxP({ k: 'k', x: P.x, y: P.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0, max: 0.3, c: 'b' }); }
      popText(P.x, P.y - 30, '護盾抵擋！', '#8fe0ff'); Snd.play('power');
      return;
    }
    const was = P.alive;
    base();
    if (was && !P.alive) { P.od = 0; G.pb3.length = 0; if (G.ship === 'aegis') { P.shield = 0; P.shT = 10; } if (G.practice) G.lives = Math.max(G.lives, 3); }
  };
})(playerHit);

// 炸彈變化
useBomb = (function (base) {
  return function () {
    const ok = base();
    if (ok && G.ship === 'aegis') { G.bombT = 4.5; P.inv = Math.max(P.inv, 4.6); G.flash = 0.3; }
    if (ok && G.ship === 'raptor') { G.bombT = 2.4; P.inv = Math.max(P.inv, 2.8); }
    return ok;
  };
})(useBomb);
const _bombTickM = bombTick;
bombTick = function (dt) {
  if (G.ship === 'aegis') {
    const el = 4.5 - G.bombT; G.bombT -= dt;
    if (el < 0.35) { for (const b of G.eb) fxP({ k: 'c', x: b.x, y: b.y, vx: 0, vy: -40, life: 0, max: 0.35 }); addScore(G.eb.length * 10); G.eb.length = 0; G.beams.length = 0; for (const e of G.enemies) if (!e.dead && !e.hidden && e.y > -20 && e.y < H + 20) hurt(e, 30 * dt); return; }
    const R = 62;
    for (const b of G.eb) if (d2(b.x, b.y, P.x, P.y) < R * R) { b.dead = true; addScore(20); fxP({ k: 'c', x: b.x, y: b.y, vx: 0, vy: -30, life: 0, max: 0.3 }); }
    G.eb = G.eb.filter(b => !b.dead);
    for (const e of G.enemies) if (!e.dead && !e.hidden) for (const [cx, cy, r] of hitCircles(e)) if (d2(cx, cy, P.x, P.y) < (R + r) ** 2) { hurt(e, 70 * dt); break; }
    return;
  }
  _bombTickM(dt);
  if (G.ship === 'raptor') {
    for (const e of G.enemies) if (!e.dead && !e.hidden && e.y < P.y && e.y > -20) for (const [cx, cy, r] of hitCircles(e)) if (Math.abs(cx - P.x) < 46 + r && cy < P.y) { hurt(e, 150 * dt); break; }
    if (Math.random() < dt * 40) fxP({ k: 'f', x: P.x + rnd(-30, 30), y: rnd(0, P.y - 30), vx: 0, vy: -200, r: rnd(10, 20), life: 0, max: 0.4 });
  }
};
const _drawBombM = drawBomb;
drawBomb = function (c) {
  if (G.ship === 'aegis') {
    const el = 4.5 - G.bombT, k = Math.min(1, el / 0.3), fade = Math.min(1, G.bombT / 0.5), R = 62 * k;
    c.save(); c.globalCompositeOperation = 'lighter';
    if (el < 0.4) { c.strokeStyle = `rgba(150,230,255,${0.8 - el * 2})`; c.lineWidth = 10; c.beginPath(); c.arc(P.x, P.y, el * 1200, 0, TAU); c.stroke(); }
    const gr = c.createRadialGradient(P.x, P.y, R * 0.5, P.x, P.y, R); gr.addColorStop(0, 'rgba(60,160,255,0)'); gr.addColorStop(0.85, `rgba(90,200,255,${0.22 * fade})`); gr.addColorStop(1, `rgba(200,245,255,${0.7 * fade})`);
    c.fillStyle = gr; c.beginPath(); c.arc(P.x, P.y, R, 0, TAU); c.fill();
    c.strokeStyle = `rgba(160,235,255,${0.45 * fade})`; c.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + G.t; c.beginPath(); c.moveTo(P.x + Math.cos(a) * R, P.y + Math.sin(a) * R); c.lineTo(P.x + Math.cos(a + TAU / 6) * R, P.y + Math.sin(a + TAU / 6) * R); c.stroke(); }
    c.restore(); return;
  }
  if (G.ship === 'raptor') {
    const el = 2.4 - G.bombT, w = 56 * Math.min(1, el / 0.25) * Math.min(1, G.bombT / 0.4);
    c.save(); c.globalCompositeOperation = 'lighter';
    const gr = c.createLinearGradient(P.x - w, 0, P.x + w, 0); gr.addColorStop(0, 'rgba(255,80,20,0)'); gr.addColorStop(0.3, 'rgba(255,120,30,.55)'); gr.addColorStop(0.5, 'rgba(255,240,180,.95)'); gr.addColorStop(0.7, 'rgba(255,120,30,.55)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
    c.fillStyle = gr; c.fillRect(P.x - w, 0, w * 2, P.y - 10);
    c.fillStyle = `rgba(255,140,40,${0.15 * Math.min(1, G.bombT)})`; c.fillRect(0, 0, W, H);
    c.restore(); return;
  }
  _drawBombM(c);
};

// ================= 超限（Lv9、Lv10）=================
LV_CAP.length = 12; LV_CAP[8] = 9; LV_CAP[9] = 9; LV_CAP[10] = 10; LV_CAP[11] = 10;
P.od = 0;
function odCap() { const c = G.round > 1 ? 10 : (LV_CAP[G.stage] ?? 10); return Math.max(0, c - 8); }
wCap = function () { return G.round > 1 ? 8 : Math.min(8, LV_CAP[G.stage] ?? 8); };
G.pulses = []; G.pb3 = [];
const _collectMeta = collect;
collect = function (it) {
  if (it.kind === 'P' && itemLook(it) === P.w && P.lvl >= 8 && P.od < odCap()) {
    P.od++; Snd.play('1up'); P.aura = 0.8; P.auraCol = '#ffd84a';
    popText(P.x, P.y - 26, '超限 Lv' + (8 + P.od) + '！', '#ffd84a');
    G.queue.push({ t: G.st + 0.5, fn: () => popText(P.x, P.y - 48, P.od >= 2 ? '進化！共鳴脈衝' : '進化！火力 +20%', '#7dffb0') });
    return;
  }
  if (it.kind === 'P' && itemLook(it) !== P.w) P.od = 0;
  _collectMeta(it);
};

// ================= 新武器：迴旋光刃 =================
availW = (function (base) { return function () { const A = base(); if (G.round > 1 || G.stage >= 9) A.push('blade'); return A; }; })(availW);
ITEM_COL.blade = ['#ff7ad8', '#a01a7a']; WNAME.blade = '迴旋光刃'; EVO.blade = { 5: '雙刃迴旋', 8: '三刃風暴' };
SPR.it_blade = { w: 22, h: 22, draw(g) {
  P_(g, [0, -10, 9, -4, 9, 5, 0, 10, -9, 5, -9, -4], lin(g, -9, -10, 9, 10, ITEM_COL.blade), 'rgba(255,255,255,.85)', 1.2);
  P_(g, [0, -10, 9, -4, 0, 0, -9, -4], 'rgba(255,255,255,.35)');
  g.fillStyle = '#fff'; g.font = '900 11px "Silkscreen",ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,.45)'; g.strokeText('X', 0, 1); g.fillText('X', 0, 1);
} };
const _fireMeta = firePrimary;
firePrimary = function (dt) {
  P.firing = G.t;
  if (P.w === 'blade') { fireBlade(); fireOpts(dt); } else _fireMeta(dt);
};
function fireBlade() {
  if (P.ft > 0) return;
  const L = P.lvl;
  P.ft = Math.max(P.ft, -0.03) + 0.36 - L * 0.012;
  const angs = L >= 8 ? [-0.32, 0, 0.32] : L >= 5 ? [-0.2, 0.2] : [0];
  for (const a of angs) G.pb3.push({ x: P.x, y: P.y - 16, vx: Math.sin(a) * 560, vy: -Math.cos(a) * 560, t: 0, spin: rnd(TAU), r: 10 + L * 0.7, dmg: 2.2 + L * 0.42, cd: new Map(), tr: [] });
  P.mf = 0.04; Snd.tone(900, 0.12, 'triangle', 0.035, 1500);
}
const _updatePBMeta = updatePB;
updatePB = function (dt) {
  _updatePBMeta(dt);
  if (!G.pb3) G.pb3 = [];
  for (const b of G.pb3) {
    b.t += dt; b.spin += dt * 22;
    if (b.t < 0.5) { const k = Math.pow(1 - b.t / 0.5, 0.8); b.x += b.vx * k * dt; b.y += b.vy * k * dt; }
    else { const a = Math.atan2(P.y - b.y, P.x - b.x), sp = Math.min(760, 200 + (b.t - 0.5) * 900); b.x += Math.cos(a) * sp * dt; b.y += Math.sin(a) * sp * dt; if (d2(b.x, b.y, P.x, P.y) < 18 * 18 || !P.alive) b.dead = true; }
    if (b.t > 2.6) b.dead = true;
    b.tr.unshift([b.x, b.y]); if (b.tr.length > 7) b.tr.length = 7;
    for (const e of G.enemies) {
      if (e.dead || e.hidden || e.inv || e.y < -20) continue;
      const last = b.cd.get(e) || -1;
      if (b.t - last < 0.13) continue;
      for (const [cx, cy, r] of hitCircles(e)) if (d2(cx, cy, b.x, b.y) < (r + b.r) ** 2) {
        hurt(e, b.dmg); b.cd.set(e, b.t); pulseFlash(e);
        for (let i = 0; i < 2; i++) fxP({ k: 'k', x: b.x, y: b.y, vx: rnd(-150, 150), vy: rnd(-150, 150), life: 0, max: 0.2, c: 'p' });
        Snd.play('hit'); break;
      }
    }
  }
  G.pb3 = G.pb3.filter(b => !b.dead);
  // 共鳴脈衝（Lv10）
  if (P.od >= 2 && P.alive && G.t - (P.firing || -9) < 0.15 && G.phase !== 'clear' && G.phase !== 'down') {
    P.pulseT = (P.pulseT || 0) - dt;
    if (P.pulseT <= 0) {
      P.pulseT = 2.2; G.pulses.push({ x: P.x, y: P.y, t: 0, col: ITEM_COL[P.w][0] });
      let n = 0;
      for (const b of G.eb) if (d2(b.x, b.y, P.x, P.y) < 72 * 72) { b.dead = true; n++; fxP({ k: 'c', x: b.x, y: b.y, vx: 0, vy: -40, life: 0, max: 0.3 }); }
      if (n) addScore(n * 10);
      for (const e of G.enemies) if (!e.dead && !e.hidden && !e.inv) for (const [cx, cy, r] of hitCircles(e)) if (d2(cx, cy, P.x, P.y) < (120 + r) ** 2) { hurt(e, 26); break; }
      Snd.tone(220, 0.4, 'sine', 0.08, 660); Snd.noise(0.3, 0.05, 3000, 800, 0, 'bandpass');
    }
  }
  for (const p of G.pulses) p.t += dt;
  G.pulses = G.pulses.filter(p => p.t < 0.45);
};
const _drawPBMeta = drawPB;
drawPB = function (ctx) {
  _drawPBMeta(ctx);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const b of G.pb3 || []) {
    for (let i = 1; i < b.tr.length; i++) { const t = i / b.tr.length; ctx.strokeStyle = `rgba(255,110,220,${0.4 * (1 - t)})`; ctx.lineWidth = b.r * 0.9 * (1 - t); ctx.beginPath(); ctx.moveTo(b.tr[i - 1][0], b.tr[i - 1][1]); ctx.lineTo(b.tr[i][0], b.tr[i][1]); ctx.stroke(); }
    glowDot(ctx, b.x, b.y, b.r * 1.8, 'rgba(255,90,210,.45)');
    for (let k = 0; k < 2; k++) {
      const a = b.spin + k * Math.PI;
      ctx.strokeStyle = 'rgba(255,140,230,.9)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, a, a + 2.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,255,1)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, a + 0.2, a + 1.9); ctx.stroke();
    }
    glowDot(ctx, b.x, b.y, 4, 'rgba(255,255,255,.95)');
  }
  for (const p of G.pulses) {
    const k = p.t / 0.45;
    ctx.strokeStyle = p.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = 6 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, 20 + k * 110, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 14 + k * 100, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
};

// ================= 關卡流程：練習模式、通關紀錄 =================
G.practice = false; G.bossOnly = false; G.mode = 'arcade';
const _newGameMeta = newGame;
newGame = function (from) {
  G.practice = G.mode === 'practice'; G.runId = Date.now(); G.pb3 = []; G.pulses = [];
  applyShip(); P.od = 0;
  _newGameMeta(from);
  P.lvl = Math.min(P.lvl, 8);
  if (from >= 8 && G.round === 1) P.od = Math.min(odCap(), from >= 10 ? 1 : 0);
};
const _startStageMeta = startStage;
startStage = function (n) {
  _startStageMeta(n);
  G.pb3 = []; G.pulses = []; G.stageScore0 = G.score;
  if (G.round === 1 && n === 9) G.banner.extra3 = '新武器出現：粉紅「迴旋光刃」';
  if (G.round === 1 && n === 8) G.banner.extra3 = '超限解放：同色武器吃滿後還能再升級';
  if (G.practice && G.bossOnly) { G.seqI = STAGES[n].seq.length; G.nextWave = 1.2; G.scroll = 4300; G.banner.extra = '頭目練習'; }
};
const _bossDownMeta = bossDown;
bossDown = function (e) {
  _bossDownMeta(e);
  if (G.round === 1 && G.stage + 1 > Store.data.cleared) { Store.data.cleared = G.stage + 1; Store.save(); }
};
for (const k in ET) if (ET[k].boss) ET[k].onDeath = e => bossDown(e);
const _runScriptMeta = runScript;
runScript = function (dt) {
  if (G.practice && G.phase === 'clear' && G.clearT > 5.6) { practiceDone(); return; }
  _runScriptMeta(dt);
};
function practiceDone() {
  G.state = 'practice'; document.body.classList.remove('playing');
  const st = G.stage, sc = G.score - (G.stageScore0 || 0), key = st + (G.bossOnly ? 'b' : '');
  const best = Store.data.pbest[key] || 0, isNew = sc > best;
  if (isNew) { Store.data.pbest[key] = sc; Store.save(); }
  $('pracStage').textContent = '第 ' + (st + 1) + ' 關 · ' + STAGES[st].name + (G.bossOnly ? '（頭目）' : '');
  $('pracScore').textContent = sc.toLocaleString();
  $('pracBest').textContent = isNew ? '新的練習紀錄！' : '練習最佳 ' + best.toLocaleString();
  showOv('prac'); Music.play('title');
}

// ================= 排行榜 =================
function recordRun(cleared) {
  if (G.practice || G.score <= 0) return -1;
  const L = Store.data.rank[G.diff] || (Store.data.rank[G.diff] = []);
  const now = new Date(), ent = { s: G.score, st: G.stage + 1, r: G.round, ship: G.ship, m: G.medals, k: G.kills, c: !!cleared, d: (now.getMonth() + 1) + '/' + now.getDate(), id: G.runId };
  const i = L.findIndex(x => x.id === G.runId);
  if (i >= 0) { if (L[i].s > ent.s) return -1; L.splice(i, 1); }
  L.push(ent); L.sort((a, b) => b.s - a.s); L.length = Math.min(L.length, 10);
  Store.save();
  return L.indexOf(ent);
}
function rankText(pos) { return pos === 0 ? '排行榜第 1 名！新紀錄！' : pos > 0 ? '進入排行榜第 ' + (pos + 1) + ' 名' : ''; }
gameOver = (function (base) { return function () { base(); const pos = recordRun(false); $('overRank').textContent = (rankText(pos) ? rankText(pos) + '　' : '') + '獎章 ' + G.medals + ' 個'; }; })(gameOver);
showEnding = (function (base) { return function () { base(); const pos = recordRun(true); $('endRank').textContent = (rankText(pos) ? rankText(pos) + '　' : '') + '獎章 ' + G.medals + ' 個'; }; })(showEnding);
toTitle = (function (base) { return function () { if (G.state === 'play') recordRun(false); G.practice = false; base(); }; })(toTitle);
saveHi = (function (base) { return function () { if (!G.practice) base(); }; })(saveHi);
let rankDiff = 'normal';
function showRank() {
  rankDiff = G.diff;
  showOv('rank'); renderRank();
}
function renderRank() {
  for (const b of document.querySelectorAll('[data-rk]')) b.classList.toggle('on', b.dataset.rk === rankDiff);
  const L = Store.data.rank[rankDiff] || [];
  $('rankList').innerHTML = L.length ? L.map((x, i) => `<li${i < 3 ? ' class="top"' : ''}><b>${i + 1}</b><span class="rs">${x.s.toLocaleString()}</span><span>${x.c ? (x.r > 1 ? '二輪通關' : '全破') : (x.r > 1 ? '2-' : '') + x.st + ' 關'}</span><span>${(SHIPS[x.ship] || SHIPS.falcon).name}</span><span>★${x.m}</span><span class="rd">${x.d}</span></li>`).join('')
    : '<li class="empty">還沒有紀錄，出擊去吧！</li>';
}

// ================= 標題畫面 =================
refreshTitle = (function (base) {
  return function () {
    base();
    const d = Store.data, prac = G.mode === 'practice';
    for (const b of document.querySelectorAll('[data-mode]')) b.classList.toggle('on', b.dataset.mode === G.mode);
    // 練習模式只能選已經打過的關
    const maxSel = prac ? d.cleared : d.reached;
    if (prac && d.cleared < 1) { G.mode = 'arcade'; return refreshTitle(); }
    if (G.startFrom + 1 > maxSel) G.startFrom = Math.max(0, maxSel - 1);
    document.querySelectorAll('#stages .stg').forEach((b, i) => { b.disabled = i + 1 > maxSel; b.classList.toggle('on', i === G.startFrom); });
    $('stageLbl').textContent = prac ? '練習哪一關（已通過的關）' : '從哪一關開始';
    const key = G.startFrom + (G.bossOnly ? 'b' : ''), pb = d.pbest[key];
    $('stageName').textContent = '第 ' + (G.startFrom + 1) + ' 關 · ' + STAGES[G.startFrom].name + (prac && pb ? '　練習最佳 ' + pb.toLocaleString() : '');
    $('bossOnly').hidden = !prac;
    $('bossOnly').classList.toggle('on', G.bossOnly); $('bossOnly').querySelector('b').textContent = G.bossOnly ? '開' : '關';
    $('btnStart').textContent = prac ? '開始練習' : '起 飛';
    $('modePrac').disabled = d.cleared < 1;
    // 機體
    const box = $('ships');
    if (!box.children.length) {
      for (const k in SHIPS) {
        const b = document.createElement('button'); b.className = 'ship'; b.dataset.ship = k;
        b.innerHTML = `<canvas width="96" height="96"></canvas><span><b>${SHIPS[k].name}</b><small>${SHIPS[k].en}</small></span>`;
        b.onclick = () => { G.ship = k; Store.data.ship = k; Store.save(); Snd.init(); Snd.play('select'); refreshTitle(); };
        box.appendChild(b);
      }
    }
    for (const b of box.children) {
      const k = b.dataset.ship, S = SHIPS[k], on = k === G.ship;
      b.classList.toggle('on', on);
      const cv2 = b.querySelector('canvas'), g = cv2.getContext('2d'), img = Art.get(S.spr);
      g.clearRect(0, 0, 96, 96);
      if (img) { const sc = 78 / Math.max(img.lw, img.lh); g.drawImage(img, 48 - img.lw * sc / 2, 50 - img.lh * sc / 2, img.lw * sc, img.lh * sc); }
    }
    const S = curShip(), bar = n => '■'.repeat(n) + '□'.repeat(5 - n);
    $('shipNote').innerHTML = `${S.note}<span class="st"><i>速度 ${bar(S.st[0])}</i><i>火力 ${bar(S.st[1])}</i><i>耐打 ${bar(S.st[2])}</i><i>炸彈 ${bar(S.st[3])}</i></span>`;
    G.previewBaked = Bake.ready;
  };
})(refreshTitle);
{
  for (const b of document.querySelectorAll('[data-mode]')) b.onclick = () => { if (b.disabled) return; G.mode = b.dataset.mode; Snd.init(); Snd.play('select'); refreshTitle(); };
  $('bossOnly').onclick = () => { G.bossOnly = !G.bossOnly; Snd.init(); Snd.play('select'); refreshTitle(); };
  $('btnRank').onclick = () => { Snd.init(); Snd.play('select'); showRank(); };
  $('btnRankBack').onclick = () => { Snd.play('select'); showOv('title'); refreshTitle(); };
  for (const b of document.querySelectorAll('[data-rk]')) b.onclick = () => { rankDiff = b.dataset.rk; Snd.play('select'); renderRank(); };
  $('btnPracAgain').onclick = () => { Snd.init(); Snd.play('start'); document.body.classList.add('playing'); newGame(G.startFrom); };
  $('btnPracTitle').onclick = () => toTitle();
  $('btnOverTitle').onclick = () => toTitle();
  $('btnEndTitle').onclick = () => toTitle();
  $('btnQuit').onclick = () => toTitle();
  $('btnGiveUp').onclick = () => gameOver();
  $('btnRestart').onclick = () => { setPause(false); newGame(G.startFrom); };
  $('btnStart').onclick = () => startFromTitle();
}
// 預渲染完成後更新機體預覽
setInterval(() => { if (G.state === 'title' && Bake.ready && !G.previewBaked) refreshTitle(); }, 500);
refreshTitle();

// HUD：練習標記、新武器提示、獎章數、護盾充能
drawHUD = (function (base) {
  return function (c) {
    base(c);
    txt(c, '★' + G.medals, 26, 24, 8, '#ffd23f');
    if (G.practice) txt(c, '練習', W - 8, 26, 9, '#7dffb0', 'right', CJK, 700);
    const bn = G.banner;
    if (bn && bn.extra3 && bn.t < 3.2 && G.phase === 'fight') {
      c.globalAlpha = bn.t < 0.3 ? bn.t / 0.3 : bn.t > 2.6 ? Math.max(0, (3.2 - bn.t) / 0.6) : 1;
      txt(c, bn.extra3, W / 2, 364, 13, G.stage === 9 ? ITEM_COL.blade[0] : '#ffd84a', 'center', CJK, 700);
      c.globalAlpha = 1;
    }
    if (G.ship === 'aegis' && P.alive) {
      const k = P.shield ? 1 : 1 - P.shT / 22;
      c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 3; c.beginPath(); c.arc(W - 70, H - 20, 7, 0, TAU); c.stroke();
      c.strokeStyle = P.shield ? '#8fe0ff' : 'rgba(143,224,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(W - 70, H - 20, 7, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
    }
  };
})(drawHUD);
// 護盾充能
{
  const _upd = updatePlayer;
  updatePlayer = function (dt) {
    _upd(dt);
    if (G.ship === 'aegis' && !P.shield && P.alive) { P.shT -= dt; if (P.shT <= 0) { P.shield = 1; popText(P.x, P.y - 30, '護盾充能完成', '#8fe0ff'); } }
  };
}
window.__sky.meta = { SHIPS, recordRun, odCap };
