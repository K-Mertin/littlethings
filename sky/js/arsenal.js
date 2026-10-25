'use strict';
// 新武器與僚機：
// - 綠「波動砲」（第 3 關起出現）：越飛越寬的弧形光波，會穿透敵人
// - 金「穿甲光槍」（第 5 關起出現）：一發貫穿整條直線，打頭目很痛
// - 「O」僚機道具（第 2 關起）：最多兩架僚機跟在旁邊一起開火，被打下來會掉一架

function availW() {
  const A = ['red', 'blue', 'purple'];
  if (G.round > 1 || G.stage >= 2) A.push('wave');
  if (G.round > 1 || G.stage >= 4) A.push('rail');
  return A;
}
Object.assign(ITEM_COL, { wave: ['#3fe8c8', '#0a7a6a'], rail: ['#ffd84a', '#a07400'], O: ['#9af0ff', '#2a6aa0'] });
Object.assign(WNAME, { wave: '波動砲', rail: '穿甲光槍' });
Object.assign(EVO, { wave: { 5: '雙重波動', 8: '三重巨浪' }, rail: { 5: '雙軌光槍', 8: '三軌衝擊波' } });
for (const [k, letter] of [['wave', 'W'], ['rail', 'R']]) {
  const [c1, c2] = ITEM_COL[k];
  SPR['it_' + k] = { w: 22, h: 22, draw(g) {
    P_(g, [0, -10, 9, -4, 9, 5, 0, 10, -9, 5, -9, -4], lin(g, -9, -10, 9, 10, [c1, c2]), 'rgba(255,255,255,.85)', 1.2);
    P_(g, [0, -10, 9, -4, 0, 0, -9, -4], 'rgba(255,255,255,.35)');
    g.fillStyle = '#fff'; g.font = '900 11px "Silkscreen",ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,.45)'; g.strokeText(letter, 0, 1); g.fillText(letter, 0, 1);
  } };
}
SPR.it_O = { w: 22, h: 22, draw(g) {
  circ(g, 0, 0, 9.5, rad(g, -3, -3, 11, ['#e6fcff', ITEM_COL.O[0], ITEM_COL.O[1]]), 'rgba(255,255,255,.9)', 1.2);
  circ(g, 0, 0, 5, null, '#fff', 1.6);
  g.fillStyle = '#fff'; g.fillRect(-1, -9, 2, 4); g.fillRect(-1, 5, 2, 4);
} };
SPR.pod = { w: 18, h: 18, draw(g) { circ(g, 0, 0, 6, rad(g, -2, -2, 7, ['#ffffff', '#8adcff', '#2a6aa0'])); P_(g, [-8, 4, -3, -2, -3, 4], '#9aa4b0'); P_(g, [8, 4, 3, -2, 3, 4], '#9aa4b0'); } };

// 道具顏色輪替改成跟著已解鎖的武器
spawnItem = (function (base) {
  return function (kind, x, y, forced) {
    base(kind, x, y, forced);
    const it = G.items[G.items.length - 1];
    if (kind === 'P') { const A = availW(); it.c0 = forced && A.includes(forced) ? A.indexOf(forced) : (Math.max(0, A.indexOf(P.w)) + 1 + (Math.random() * (A.length - 1) | 0)) % A.length; }
  };
})(spawnItem);
itemLook = (function (base) {
  return function (it) {
    if (it.kind === 'P') { const A = availW(); return A[(it.c0 + Math.floor(it.t / 2.6)) % A.length]; }
    return base(it);
  };
})(itemLook);

// ---------- 開火 ----------
G.pb2 = []; G.rails = [];
P.opts = [];
const _fireEvo = firePrimary;
firePrimary = function (dt) {
  if (P.w === 'wave') fireWave();
  else if (P.w === 'rail') fireRail();
  else _fireEvo(dt);
  fireOpts(dt);
};
function fireWave() {
  if (P.ft > 0) return;
  const L = P.lvl;
  P.ft = Math.max(P.ft, -0.03) + 0.21 - L * 0.008;
  const angs = L >= 8 ? [-0.2, 0, 0.2] : L >= 5 ? [-0.13, 0.13] : [0];
  for (const a of angs) G.pb2.push({ kind: 'wv', x: P.x, y: P.y - 20, vx: Math.sin(a) * 520, vy: -Math.cos(a) * 520, a, age: 0, w0: 18 + L * 3, dmg: 2 + L * 0.45, hit: new Set() });
  P.mf = 0.05;
  Snd.tone(420, 0.09, 'sine', 0.035, 900);
}
function fireRail() {
  if (P.ft > 0) return;
  const L = P.lvl;
  P.ft = Math.max(P.ft, -0.03) + 0.42 - L * 0.02;
  const offs = L >= 8 ? [-12, 0, 12] : L >= 5 ? [-7, 7] : [0];
  for (const o of offs) {
    const x = P.x + o, y0 = P.y - 22, hits = [];
    for (const e of G.enemies) {
      if (e.dead || e.hidden || e.inv) continue;
      for (const [cx, cy, r] of hitCircles(e)) {
        if (cy > y0 + r || cy < -20 || Math.abs(cx - x) > r + 4) continue;
        hurt(e, 8 + L * 2.2); hits.push([x, Math.min(y0, cy + r * 0.4), e]); break;
      }
    }
    G.rails.push({ x, y0, t: 0, hits });
    for (const [hx, hy] of hits) {
      for (let i = 0; i < 5; i++) fxP({ k: 'k', x: hx, y: hy, vx: rnd(-200, 200), vy: rnd(-60, 200), life: 0, max: rnd(0.2, 0.35) });
      fxP({ k: 'f', x: hx, y: hy, vx: 0, vy: 0, r: 7, life: 0, max: 0.18 });
      if (L >= 8) {
        fxP({ k: 'r', x: hx, y: hy, r: 4, R: 34, life: 0, max: 0.3 });
        for (const e of G.enemies) if (!e.dead && !e.hidden && !e.inv && d2(e.x, e.y, hx, hy) < 36 * 36) hurt(e, 4);
      }
    }
  }
  P.mf = 0.08;
  Snd.tone(1800, 0.18, 'sawtooth', 0.04, 200); Snd.noise(0.12, 0.08, 6000, 1500, 0, 'highpass');
}
function fireOpts(dt) {
  if (!P.opts.length) return;
  P.optT = (P.optT || 0) - dt;
  if (P.optT > 0) return;
  P.optT = 0.13;
  for (const o of P.opts) { pbShot(o.x, o.y - 8, 0, 'v'); o.mf = 0.05; }
}

// ---------- 更新 ----------
const _updatePBEvo = updatePB;
updatePB = function (dt) {
  _updatePBEvo(dt);
  // 波動砲：越飛越寬，穿透
  for (const b of G.pb2) {
    b.age += dt; b.x += b.vx * dt; b.y += b.vy * dt;
    b.w = Math.min(96, b.w0 + b.age * 110);
    if (b.y < -40 || b.x < -60 || b.x > W + 60) { b.dead = true; continue; }
    for (const e of G.enemies) {
      if (e.dead || e.hidden || e.y < -10 || b.hit.has(e)) continue;
      for (const [cx, cy, r] of hitCircles(e)) {
        if (Math.abs(cx - b.x) < b.w / 2 + r && Math.abs(cy - b.y) < r + 9) {
          b.hit.add(e); hurt(e, b.dmg);
          for (let i = 0; i < 3; i++) fxP({ k: 'k', x: cx + rnd(-r, r) * 0.5, y: b.y, vx: rnd(-90, 90), vy: rnd(-120, 40), life: 0, max: 0.22, c: 'g' });
          Snd.play('hit');
          break;
        }
      }
    }
  }
  G.pb2 = G.pb2.filter(b => !b.dead);
  for (const r of G.rails) r.t += dt;
  G.rails = G.rails.filter(r => r.t < 0.32);
  // 僚機跟隨
  P.opts.forEach((o, i) => {
    const tx = P.x + (i ? 26 : -26), ty = P.y + 14 + Math.sin(G.t * 3 + i * Math.PI) * 3;
    const f = Math.min(1, dt * 9);
    o.x += (tx - o.x) * f; o.y += (ty - o.y) * f; o.mf = Math.max(0, (o.mf || 0) - dt);
  });
};

// ---------- 畫面 ----------
const _drawPBEvo = drawPB;
drawPB = function (ctx) {
  _drawPBEvo(ctx);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const b of G.pb2) {
    const a = Math.atan2(b.vy, b.vx) + Math.PI / 2, half = b.w / 2, k = Math.max(0.35, 1 - b.age * 0.9);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
    const arc = (wd, col) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(-half, 6); ctx.quadraticCurveTo(0, -10, half, 6); ctx.stroke(); };
    arc(12, `rgba(40,220,180,${0.22 * k})`);
    arc(5, `rgba(90,255,210,${0.75 * k})`);
    arc(1.8, `rgba(235,255,250,${0.95 * k})`);
    ctx.fillStyle = `rgba(120,255,220,${0.18 * k})`; ctx.beginPath(); ctx.moveTo(-half, 6); ctx.quadraticCurveTo(0, -10, half, 6); ctx.quadraticCurveTo(0, 2, -half, 6); ctx.fill();
    ctx.restore();
  }
  for (const r of G.rails) {
    const k = 1 - r.t / 0.32, top = -20;
    const g = ctx.createLinearGradient(r.x - 13, 0, r.x + 13, 0);
    g.addColorStop(0, 'rgba(255,200,40,0)'); g.addColorStop(0.5, `rgba(255,220,90,${0.55 * k})`); g.addColorStop(1, 'rgba(255,200,40,0)');
    ctx.fillStyle = g; ctx.fillRect(r.x - 13 - (1 - k) * 6, top, 26 + (1 - k) * 12, r.y0 - top);
    ctx.strokeStyle = `rgba(255,255,230,${k})`; ctx.lineWidth = 2.4 * k + 0.5; ctx.beginPath(); ctx.moveTo(r.x, r.y0); ctx.lineTo(r.x, top); ctx.stroke();
    ctx.strokeStyle = `rgba(255,220,120,${0.7 * k})`; ctx.lineWidth = 1;
    for (let y = r.y0 - ((r.t * 2000) % 40); y > top; y -= 40) { ctx.beginPath(); ctx.ellipse(r.x, y, 6 * k + 2, 2, 0, 0, TAU); ctx.stroke(); }
    for (const [hx, hy] of r.hits) glowDot(ctx, hx, hy, 16 * k + 4, `rgba(255,220,100,${k})`);
  }
  if (P.alive) for (const o of P.opts) {
    glowDot(ctx, o.x, o.y, 11, 'rgba(110,220,255,.55)');
    if (o.mf > 0) glowDot(ctx, o.x, o.y - 10, 6, 'rgba(255,230,140,.9)');
  }
  ctx.restore();
  if (P.alive) for (const o of P.opts) {
    Art.draw(ctx, 'pod', o.x, o.y, Math.sin(G.t * 4) * 0.2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(140,230,255,.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(o.x, o.y, 9, G.t * 6, G.t * 6 + 2.2); ctx.stroke(); ctx.beginPath(); ctx.arc(o.x, o.y, 9, G.t * 6 + Math.PI, G.t * 6 + Math.PI + 2.2); ctx.stroke(); ctx.restore();
  }
};

// ---------- 道具、死亡、關卡 ----------
const _collectArs = collect;
collect = function (it) {
  if (it.kind === 'O') {
    if (P.opts.length < 2) { P.opts.push({ x: P.x, y: P.y + 10, mf: 0 }); popText(P.x, P.y - 26, '僚機加入！', ITEM_COL.O[0]); }
    else { addScore(5000); popText(P.x, P.y - 26, '5000', '#ffd23f'); }
    Snd.play('power'); P.aura = 0.6; P.auraCol = ITEM_COL.O[0];
    return;
  }
  _collectArs(it);
};
const _playerHitArs = playerHit;
playerHit = function () {
  const was = P.alive;
  _playerHitArs();
  if (was && !P.alive && P.opts.length) { const o = P.opts.pop(); spawnItem('O', o.x, o.y); }
  if (!P.alive) { G.pb2.length = 0; }
};
const _newGameArs = newGame;
newGame = function (from) { P.opts = []; G.pb2 = []; G.rails = []; _newGameArs(from); };
const _startStageArs = startStage;
startStage = function (n) {
  _startStageArs(n);
  G.pb2 = []; G.rails = [];
  if (G.round === 1 && (n === 2 || n === 4)) G.banner.extra2 = n === 2 ? '新武器出現：綠色「波動砲」' : '新武器出現：金色「穿甲光槍」';
};
const _hudArs = drawHUD;
drawHUD = function (c) {
  _hudArs(c);
  P.opts.forEach((o, i) => { c.fillStyle = ITEM_COL.O[0]; c.beginPath(); c.arc(98 + (window.odCap ? odCap() : 0) * 6 + i * 11, H - 50, 3.6, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 0.8; c.stroke(); });
  const bn = G.banner;
  if (bn && bn.extra2 && bn.t < 3.2 && G.phase === 'fight') {
    c.globalAlpha = bn.t < 0.3 ? bn.t / 0.3 : bn.t > 2.6 ? Math.max(0, (3.2 - bn.t) / 0.6) : 1;
    txt(c, bn.extra2, W / 2, 364, 13, ITEM_COL[G.stage === 2 ? 'wave' : 'rail'][0], 'center', CJK, 700);
    c.globalAlpha = 1;
  }
};

// ---------- 僚機道具波次 ----------
WAVES.carrierO = q => { q(0, () => spawn('carrier', rnd(90, 270), -20, { drop: 'O' })); return 2; };
for (let s = 1; s < STAGES.length; s++) {
  const seq = STAGES[s].seq, i = seq.indexOf('carrierS');
  seq.splice(i >= 0 ? i + 1 : 6, 0, 'carrierO');
}

// 3D 模型
EXTRA_MODELS.pod = K => {
  const WH = K.M(0xeef3f8, { m: 0.3, r: 0.3, cc: 1 }), DK = K.M(0x3a4250, { m: 0.85, r: 0.35 });
  K.sph(5.6, 4.2, 5.6, 0, 3, 0, WH);
  K.sph(2.6, 2, 2.6, 0, 6.2, -1, K.glass(0x0a2a44, 0x0b6a9a));
  K.extM([4, 1, 9, 5, 9, 7, 4, 5], 1, DK, 1.5, 0.3);
  K.cyl(1.4, 1.4, 0.6, 0, 3, 5.6, K.G(0x5fd8ff, 2.8));
};
EXTRA_BAKES.push(['pod', 18, 18, EXTRA_MODELS.pod]);
