'use strict';
// 第 15 關（最終關）「時空裂隙」：天空裂開，地面變成一片片漂浮的碎片，每一片都是之前去過的世界
// 新敵人：殘影機（打爆會分裂）、跳躍機（會瞬間移動）、時鐘砲台；各個世界的敵人也會從裂隙裡跑出來
// 中頭目「鏡像機」（會跟你左右相反移動）；最終頭目「虛空之王」（召喚過去頭目的幻影、讓時間停止）

// ================= 地形 =================
const Z16 = v => { const d = -v; return { a: 1 - smooth(1400, 1800, d), void: smooth(2600, 3400, d) }; };
const SH16 = 64;
function shard16(x, v) { // 不規則碎片（Voronoi）：回傳最近的中心、第二近距離差（裂縫）
  const ci = Math.floor(x / SH16), cj = Math.floor(v / SH16);
  let b1 = 1e9, b2 = 1e9, id = 0, cx = 0, cy = 0;
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
    const px = (i + 0.15 + hash(i, j, 1601) * 0.7) * SH16, py = (j + 0.15 + hash(j, i, 1602) * 0.7) * SH16, d = Math.hypot(x - px, v - py);
    if (d < b1) { b2 = b1; b1 = d; id = i * 7919 + j; cx = px; cy = py; } else if (d < b2) b2 = d;
  }
  return { id, edge: b2 - b1, cx, cy, d: b1 };
}
const shardOn16 = (s, v) => hash(s.id, 3, 1603) > 0.12 + Z16(v).void * 0.5;
const H16 = (x, v) => {
  const s = shard16(x, v);
  if (s.edge < 3 || !shardOn16(s, v)) return -24;
  return 10 + hash(s.id, 1, 1604) * 26 - s.d * 0.08;
};
const C16 = (x, v, h) => {
  const s = shard16(x, v);
  if (s.edge < 3 || !shardOn16(s, v)) { const n = fbm(x * 0.01, v * 0.01, 1605); return mixC([14, 6, 30], [50, 16, 80], n); }
  // 每片碎片映出之前某一關的地面
  const k = (hash(s.id, 2, 1606) * 12) | 0, Pk = PAINT[k];
  let c = [90, 80, 120];
  if (Pk && Pk.C) {
    const sv = -400 - hash(s.id, 4, 1607) * 3400, sx = x, vv = sv + (v - s.cy);
    try { c = Pk.C(sx, vv, Pk.H ? Pk.H(sx, vv) : 0, 0.2); } catch (e) { }
  }
  const edge = smooth(3, 12, s.edge);
  c = mixC(c, [120, 70, 200], 0.18 + (1 - edge) * 0.5);
  return mixC(c, [20, 10, 40], clamp(s.d / 90, 0, 0.5));
};
PAINT.push({ H: H16, C: C16, k: 1.3, d: (g, v0, v1, sp) => {
  // 裂縫發光
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let v = Math.floor(v0 / 6) * 6; v < v1; v += 6) for (let x = 0; x < W; x += 6) {
    const s = shard16(x, v);
    if (s.edge < 4 && shardOn16(s, v)) { const p = hash(x, v, 1608); g.fillStyle = p > 0.5 ? 'rgba(170,90,255,.5)' : 'rgba(90,220,255,.45)'; g.fillRect(x - 1, v - 1, 3, 3); }
  }
  g.restore();
  // 漂浮的時鐘圈（時間的象徵）
  cells(180, 220, v0, v1, 70, (i, j, x, v) => {
    if (hash(i, j, 1609) < 0.55) return;
    const cx = x + 40 + hash(i, j, 1610) * 100, cv = v + 50 + hash(j, i, 1610) * 120, r = 30 + hash(i, j, 1611) * 26;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(200,170,255,.35)'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cv, r, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(200,170,255,.18)'; g.lineWidth = 5; g.stroke();
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; g.fillStyle = k % 3 ? 'rgba(220,200,255,.5)' : 'rgba(255,230,150,.85)'; g.fillRect(cx + Math.cos(a) * (r - 4) - 1, cv + Math.sin(a) * (r - 4) - 1, k % 3 ? 2 : 3, k % 3 ? 2 : 3); }
    const ha = hash(j, i, 1612) * TAU; g.strokeStyle = 'rgba(255,230,150,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx, cv); g.lineTo(cx + Math.cos(ha) * r * 0.55, cv + Math.sin(ha) * r * 0.55); g.moveTo(cx, cv); g.lineTo(cx + Math.cos(ha * 3) * r * 0.8, cv + Math.sin(ha * 3) * r * 0.8); g.stroke();
    g.restore();
    if (cv >= v0 && cv < v1 && j < -3 && hash(i, j, 1613) > 0.5) sp.push({ type: 'clockT', x: clamp(cx, 40, W - 40), v: cv });
  });
} });
WATER.push(() => false);
ROADX.push(null);

// ================= 環境：飄浮的碎片 =================
AMB2.rift = {
  update(dt) {
    const A = G.amb;
    while (A.length < 26) A.push({ x: rnd(W), y: rnd(-30, H), a: rnd(TAU), sp: rnd(-1.5, 1.5), s: rnd(3, 9), vy: rnd(20, 60), c: Math.random() < 0.5 });
    for (const p of A) { p.a += p.sp * dt; p.y += (p.vy + G.speed * 0.6) * dt; p.x += Math.sin(p.a) * 8 * dt; if (p.y > H + 20) { p.y = -20; p.x = rnd(W); } }
    G.ripT = (G.ripT || 0) - dt; if (G.ripT <= 0) { G.ripT = rnd(3, 6); G.rip = { x: rnd(60, W - 60), y: rnd(100, 500), t: 0 }; }
    if (G.rip) G.rip.t += dt;
  },
  draw(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of G.amb) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.c ? 'rgba(170,110,255,.16)' : 'rgba(90,220,255,.14)'; ctx.strokeStyle = p.c ? 'rgba(210,170,255,.6)' : 'rgba(150,240,255,.55)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.8, p.s * 0.6); ctx.lineTo(-p.s * 0.6, p.s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const R = G.rip; if (R && R.t < 1.2) { const k = R.t / 1.2; ctx.strokeStyle = `rgba(200,160,255,${0.4 * (1 - k)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(R.x, R.y, 10 + k * 90, 0, TAU); ctx.stroke(); }
    ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, 'rgba(20,0,40,0)'); vg.addColorStop(1, 'rgba(40,0,70,.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },
};

// ================= 時間停止（最終頭目用）=================
G.freezeT = 0;
updateEB = (function (base) {
  return function (dt) {
    if (G.freezeT > 0) {
      G.freezeT -= dt;
      const hr = G.d.hit * (P.hitk || 1);
      for (const b of G.eb) if (P.alive && d2(b.x, b.y, P.x, P.y) < (b.r + hr) * (b.r + hr)) { b.dead = true; playerHit(); }
      G.eb = G.eb.filter(b => !b.dead);
      if (G.freezeT <= 0) { // 時間恢復：三分之一的子彈改成朝你飛過來
        G.eb.forEach((b, i) => { if (i % 3) return; const sp = Math.max(70, Math.hypot(b.vx, b.vy) * 0.8), a = aim(b.x, b.y) + rnd(-0.15, 0.15); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.av = 0; });
        Snd.tone(300, 0.4, 'sawtooth', 0.06, 900);
      }
      // 光束照常
      for (const bm of G.beams) bm.t += dt;
      G.beams = G.beams.filter(b => b.t < b.warn + b.life);
      return;
    }
    base(dt);
  };
})(updateEB);
drawEB = (function (base) {
  return function (ctx) {
    if (G.freezeT > 0) { ctx.fillStyle = `rgba(120,80,200,${Math.min(0.22, G.freezeT * 0.3)})`; ctx.fillRect(0, 0, W, H); }
    base(ctx);
  };
})(drawEB);
startStage = (function (base) { return function (n) { G.freezeT = 0; base(n); }; })(startStage);
bossDown = (function (base) { return function (e) { G.freezeT = 0; base(e); }; })(bossDown);

// ================= 敵人 =================
SPR.echo = { w: 30, h: 30, draw(g) { P_(g, [0, 14, 12, -6, 6, -12, 0, -6, -6, -12, -12, -6], '#3a2a5a'); circ(g, 0, 0, 4, '#c080ff'); } };
SPR.warper = { w: 30, h: 30, draw(g) { P_(g, [0, -14, 14, 0, 0, 14, -14, 0], '#2a3a5a'); circ(g, 0, 0, 5, '#60e8ff'); } };
SPR.clockT = { w: 34, h: 34, draw(g) { circ(g, 0, 0, 15, '#5a4a7a'); circ(g, 0, 0, 12, '#e8e0f8'); } };
Object.assign(ET, {
  // 殘影機：打爆會分裂成兩台小殘影（只分裂一次）
  echo: { hp: 5, r: 11, score: 300, spr: 'echo',
    init(e, o) { e.gen = o.gen || 0; e.dir = o.dir || 1; e.vy = e.gen ? 60 : 120; e.vx = e.gen ? e.dir * 160 : 0; e.ft = rnd(0.6, 1.2); e.tr = []; e.x0 = e.x; if (e.gen) { e.hp = 2; e.r = 8; e.score = 150; } },
    update(e, dt) {
      if (!e.gen) { e.x = e.x0 + Math.sin(e.t * 2.2) * 50; e.vy = 110; }
      else { e.vx *= Math.pow(0.4, dt); e.vy = 70 + e.t * 40; }
      e.tr.unshift([e.x, e.y]); if (e.tr.length > 9) e.tr.length = 9;
      e.ft -= dt * G.d.fr; if (e.ft <= 0) { e.ft = 1.5; if (canShoot(e)) eShot(e.x, e.y, aim(e.x, e.y), 140, e.gen ? 's' : 'ink'); }
    },
    draw(ctx, e) {
      const sc = e.gen ? 0.7 : 1;
      for (let i = 8; i >= 2; i -= 3) { const p = e.tr[i]; if (p) Art.draw(ctx, 'echo', p[0], p[1], 0, 0.18 * (1 - i / 9), sc, sc); }
      spr(ctx, e, 'echo', 0, sc, sc);
      glowDot(ctx, e.x, e.y, 9 * sc, 'rgba(200,120,255,.7)');
    },
    onDeath(e) { if (!e.gen && G.phase !== 'down') for (const d of [-1, 1]) G.queue.push({ t: G.st + 0.05, fn: () => spawn('echo', e.x + d * 8, e.y, { gen: 1, dir: d }) }); },
  },
  // 跳躍機：出現 → 開火 → 消失 → 在你前方附近重新出現
  warper: { hp: 6, r: 12, score: 500, spr: 'warper',
    init(e) { e.cyc = 0; e.vy = 0; e.jumps = 0; e.tx = e.x; e.ty = rnd(110, 220); e.y = e.ty; e.st = 'in'; e.k = 0; },
    update(e, dt) {
      e.k += dt;
      if (e.st === 'in') { e.hidden = false; e.inv = e.k < 0.35; if (e.k > 0.35) { e.st = 'on'; e.k = 0; } }
      else if (e.st === 'on') { if (!e.fired && e.k > 0.5) { e.fired = true; if (canShoot(e)) fan(e.x, e.y, aim(e.x, e.y), 3, 0.35, 160, 'c'); } if (e.k > 1.5) { e.st = 'out'; e.k = 0; } }
      else if (e.st === 'out') { e.inv = true; if (e.k > 0.3) { e.st = 'gone'; e.k = 0; e.hidden = true; e.jumps++; e.tx = clamp(P.x + rnd(-110, 110), 30, W - 30); e.ty = rnd(90, 250); } }
      else if (e.st === 'gone') { if (e.k > 0.55) { if (e.jumps > 3) { e.gone = true; return; } e.x = e.tx; e.y = e.ty; e.st = 'in'; e.k = 0; e.fired = false; } }
    },
    draw(ctx, e) {
      if (e.st === 'gone') { const k = e.k / 0.55; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(90,230,255,${k})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.tx, e.ty, 26 * (1 - k) + 6, 0, TAU); ctx.stroke(); ctx.restore(); return; }
      const a = e.st === 'in' ? Math.min(1, e.k / 0.35) : e.st === 'out' ? 1 - e.k / 0.3 : 1;
      Art.draw(ctx, 'warper', e.x, e.y, e.t * 2, a, 1 + (1 - a), 1 - (1 - a) * 0.8);
      if (e.flash > 0) Art.draw(ctx, 'warper', e.x, e.y, e.t * 2, 0.5, 1, 1, 'w');
      glowDot(ctx, e.x, e.y, 12 * a, 'rgba(90,230,255,.7)');
    },
  },
  // 時鐘砲台：時針、分針轉動，從針尖射出子彈
  clockT: { hp: 20, r: 15, score: 800, ground: true, medal: 0.8, gs: 'pad',
    init(e) { e.h = rnd(TAU); e.m = rnd(TAU); e.ft = 0.6; },
    update(e, dt) {
      e.h += dt * 0.5; e.m += dt * 2.1;
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = G.d.dens >= 1 ? 0.28 : 0.42; if (canShoot(e)) { eShot(e.x + Math.cos(e.m) * 14, e.y + Math.sin(e.m) * 14, e.m, 90, 's'); if (Math.floor(e.t * 3) % 3 === 0) eShot(e.x + Math.cos(e.h) * 10, e.y + Math.sin(e.h) * 10, e.h, 120, 'ink'); } }
    },
    draw(ctx, e) {
      Art.draw(ctx, 'pad', e.x, e.y); spr(ctx, e, 'clockT', 0);
      ctx.strokeStyle = '#2a1a4a'; ctx.lineCap = 'round';
      ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.h) * 7, e.y + Math.sin(e.h) * 7); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.m) * 11, e.y + Math.sin(e.m) * 11); ctx.stroke();
      glowDot(ctx, e.x + Math.cos(e.m) * 12, e.y + Math.sin(e.m) * 12, 4, 'rgba(200,140,255,.9)');
    },
  },
  // 中頭目：鏡像機（你往左它就往右，在正中間時會在你正上方）
  mirror: { hp: 600, r: 26, score: 15000, big: 1, drop: ['P', 'S'], hb: [[0, 0, 30]],
    init(e) { e.vy = 60; e.ft = 1; e.tb = 2.4; e.tc = 3.5; },
    update(e, dt) {
      if (e.st === undefined) { e.vy = Math.max(12, (130 - e.y) * 1.4); if (e.y >= 126) { e.st = 0; e.vy = 0; } return; }
      e.st += dt; e.vy = e.st > 19 ? -60 : 0;
      const tx = W - P.x; e.x += clamp(tx - e.x, -170 * dt, 170 * dt);
      if (!canShoot(e) || e.st > 19) return;
      const f = dt * G.d.fr;
      e.ft -= f; if (e.ft <= 0) { e.ft = 0.14; for (const s of [-1, 1]) eShot(e.x + s * 10, e.y + 24, Math.PI / 2 + s * 0.06, 230, 'c'); }
      e.tb -= f; if (e.tb <= 0) { e.tb = 2.6; fan(e.x, e.y + 20, aim(e.x, e.y), 7, 1.0, 130, 'ink'); }
      e.tc -= f; if (e.tc <= 0) { e.tc = 5; if (G.d.beams) { G.beams.push({ x: e.x, y: e.y + 20, w: 16, t: 0, warn: 0.8, life: 1.1, col: 'v' }); Snd.play('warn'); } else ring(e.x, e.y, 12, 90, e.st, 'c'); }
    },
    shadow(ctx, e) { Art.shadow(ctx, P.spr || 'player', e.x, e.y, Math.PI, 1.4); },
    draw(ctx, e) {
      const img = P.spr || 'player';
      glowDot(ctx, e.x, e.y, 46, 'rgba(160,80,255,.3)');
      Art.draw(ctx, img, e.x, e.y, Math.PI, 1, 1.9, 1.9);
      Art.draw(ctx, img, e.x, e.y, Math.PI, 0.55, 1.9, 1.9, 's');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; Art.draw(ctx, img, e.x, e.y, Math.PI, 0.3, 1.9, 1.9, 'w'); ctx.restore();
      if (e.flash > 0) Art.draw(ctx, img, e.x, e.y, Math.PI, 0.5, 1.9, 1.9, 'w');
      for (const s of [-1, 1]) glowDot(ctx, e.x + s * 7, e.y - 30, 9, 'rgba(200,120,255,.9)');
    },
  },
});

// ================= 最終頭目：虛空之王 =================
SPR.v16core = { w: 120, h: 120, draw(g) { circ(g, 0, 0, 44, '#2a1a4a'); circ(g, 0, 0, 18, '#c080ff'); } };
SPR.v16eye = { w: 120, h: 120, draw(g) { circ(g, 0, 0, 44, '#2a1a4a'); circ(g, 0, 0, 22, '#fff'); circ(g, 0, 0, 10, '#ff3060'); } };
SPR.v16ring = { w: 230, h: 230, draw(g) { g.strokeStyle = '#8a7ab0'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 100, 0, TAU); g.stroke(); } };
SPR.v16plate = { w: 46, h: 30, draw(g) { P_(g, [-20, -12, 20, -12, 14, 12, -14, 12], '#5a4a7a'); } };
const PHANT16 = ['nb1', 'nb2', 'nb3', 'nb4', 'nb5', 'nb6', 'nb7', 'nb8', 'k9body', 'b10', 'p11body', 'q12'];
ET.boss16 = { name: '虛空之王', en: 'VOID SOVEREIGN', hp: 7200, r: 40, score: 1000000, boss: true, layer: 'air', hb: [[0, 0, 44]], marks: [0.66, 0.33],
  init(e) { bossBase(e); e.y = -160; e.ph = 1; e.rot = 0; e.pi = 0; e.ph2 = null; e.td = 3; e.te = 7; e.tf = 2; e.pq = shuffle(PHANT16.map((_, i) => i)); },
  update(e, dt) {
    e.rot += dt * (e.ph === 3 ? 1.4 : 0.7);
    if (bossEnter(e, dt, 160, 50)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.35) * 40; e.y = 160 + Math.sin(e.mt * 0.7) * 14;
    const f0 = e.hp / e.maxhp, ph = f0 > 0.66 ? 1 : f0 > 0.33 ? 2 : 3;
    if (ph !== e.ph) {
      e.ph = ph; G.shake = 16; G.eb.length = 0; G.flash = 0.5; e.phan = null; G.freezeT = 0;
      for (let i = 0; i < 10; i++) G.queue.push({ t: G.st + i * 0.09, fn: () => boom(e.x + rnd(-110, 110), e.y + rnd(-80, 80), 1.6) });
      popText(e.x, e.y + 110, ph === 2 ? '回憶迴廊：過去的強敵出現了！' : '虛空之眼睜開了……', '#d0a0ff');
      Snd.play('sting'); e.te = 2;
    }
    bossSmoke(e);
    // 幻影：過去的頭目輪流出現，各自打出招牌攻擊
    if (e.phan) {
      const F = e.phan; F.t += dt;
      F.x = lerp(F.x, F.tx, Math.min(1, dt * 2)); F.y = lerp(F.y, F.ty, Math.min(1, dt * 2));
      if (F.t > 5.2) e.phan = null;
      else if (F.t > 0.8 && canShoot(e)) this.phanFire(e, F, dt * G.d.fr);
    }
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    const nodes = [0, 1, 2, 3].map(k => { const a = e.rot + k * Math.PI / 2; return [e.x + Math.cos(a) * 92, e.y + Math.sin(a) * 92 * 0.75]; });
    if (ph === 1) {
      e.ta -= f; if (e.ta <= 0) { e.ta = 0.42; e.pi = (e.pi + 1) % 4; const [nx, ny] = nodes[e.pi]; fan(nx, ny, aim(nx, ny), 3, 0.3, 150, 'c'); }
      e.tb -= f; if (e.tb <= 0) { e.tb = 0.13; e.sa += 0.29; eShot2(e.x, e.y, e.sa, 100, 'ink', { av: 0.2 }); eShot2(e.x, e.y, -e.sa + Math.PI, 100, 'ink', { av: -0.2 }); }
      e.tc -= f; if (e.tc <= 0) { e.tc = 3.2; ring(e.x, e.y, 18, 85, e.mt, 'b'); }
    } else if (ph === 2) {
      e.te -= f;
      if (e.te <= 0 && !e.phan) {
        e.te = 1.2;
        if (!e.pq.length) e.pq = shuffle(PHANT16.map((_, i) => i));
        const i = e.pq.pop(), T = ET['boss' + (i + 1)], side = Math.random() < 0.5 ? -1 : 1;
        e.phan = { i, img: PHANT16[i], name: T ? T.name : '', x: 180 + side * 220, y: 290, tx: 180 + side * 96, ty: 270 + rnd(0, 30), t: 0, k: 0, sa: rnd(TAU) };
         Snd.tone(220, 0.6, 'sine', 0.07, 440);
      }
      e.tc -= f; if (e.tc <= 0) { e.tc = 2.8; ring(e.x, e.y, 12, 75, e.mt, 'ink'); }
    } else {
      e.tb -= f; if (e.tb <= 0) { e.tb = 0.11; e.sa += 0.43; for (let k = 0; k < 2; k++) eShot2(e.x, e.y, e.sa + k * Math.PI, 105, k ? 'c' : 'ink', { av: 0.32 }); }
      e.ta -= f; if (e.ta <= 0) { e.ta = 1.3; e.pi = (e.pi + 1) % 4; const [nx, ny] = nodes[e.pi]; fan(nx, ny, aim(nx, ny), 5, 0.6, 170, 'b'); }
      e.tf -= f;
      if (e.tf <= 0) { // 時間停止
        e.tf = 8.5; G.freezeT = G.d.dens >= 1 ? 1.4 : 1.0;
        popText(180, 300, '時間停止！', '#d0a0ff'); Snd.tone(1200, 0.5, 'square', 0.05, 300); G.flash = 0.25;
      }
      e.td -= f;
      if (e.td <= 0) {
        e.td = 5;
        if (G.d.beams) { [0, 1, 2].forEach(i => G.beams.push({ x: 60 + i * 120 + rnd(-20, 20), y: e.y + 40, w: 20, t: -i * 0.25, warn: 1.0, life: 1.4, col: 'v', vx: (i - 1) * 50 || 40 })); Snd.play('warn'); }
        else ring(e.x, e.y, 16, 90, e.mt, 'c');
      }
    }
  },
  phanFire(e, F, f) {
    const p = F.i % 6, x = F.x, y = F.y + 30;
    F.k -= f; if (F.k > 0) return;
    if (p === 0) { F.k = 0.9; fan(x, y, aim(x, y), 5, 0.7, 150); }
    else if (p === 1) { F.k = 1.4; for (const s of [-1, 1]) eShot(x + s * 30, y, Math.PI / 2 + s * 0.6, 100, 'm'); Snd.play('missile'); }
    else if (p === 2) { F.k = 0.12; F.sa += 0.35; for (const s of [-1, 1]) eShot(x, y, F.sa * s + Math.PI / 2, 110, 's'); }
    else if (p === 3) { F.k = 1.6; ring(x, y, 12, 95, F.sa, 'b'); F.sa += 0.3; }
    else if (p === 4) { F.k = 1.1; ring(x, y, 16, 80, F.sa, 'c'); F.sa += 0.2; }
    else { F.k = 0.3; F.sa += 0.6; eShot2(x, y, F.sa, 90, 'a', { av: 0.4 }); eShot2(x, y, F.sa + Math.PI, 90, 'a', { av: 0.4 }); }
  },
  shadow(ctx, e) { ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x + 16, e.y + 30, 110, 40, 0, 0, TAU); ctx.fill(); ctx.restore(); },
  draw(ctx, e) {
    const x = e.x, y = e.y, ph = e.ph || 1, F = e.phan;
    if (F) {
      const a = Math.min(1, F.t / 0.6) * (F.t > 4.6 ? Math.max(0, (5.2 - F.t) / 0.6) : 1);
      ctx.save(); ctx.globalAlpha = 0.62 * a;
      const img = Art.get(F.img), sc = img ? Math.min(0.85, 130 / Math.max(img.lw, img.lh)) : 1;
      glowDot(ctx, F.x, F.y, 70, `rgba(150,80,255,${0.3 * a})`);
      if (img) { Art.draw(ctx, F.img, F.x + (Math.random() < 0.08 ? rnd(-4, 4) : 0), F.y, 0, 1, sc, sc); ctx.globalCompositeOperation = 'lighter'; Art.draw(ctx, F.img, F.x, F.y, 0, 0.45, sc, sc, 'w'); }
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(180,120,255,.25)';
      for (let yy = F.y - 70 + (G.t * 50) % 4; yy < F.y + 70; yy += 4) ctx.fillRect(F.x - 80, yy, 160, 1.2);
      ctx.restore();
      txt(ctx, '幻影・' + F.name, clamp(F.x, 70, W - 70), F.y + 62, 10, `rgba(220,190,255,${a})`, 'center', CJK, 700);
    }
    // 外環（陀螺儀）
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = ph === 3 ? 'rgba(255,80,140,.4)' : 'rgba(170,120,255,.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, 92, 69, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, 70, 104, e.rot * 0.5, 0, TAU); ctx.stroke();
    ctx.restore();
    Art.draw(ctx, 'v16ring', x, y, e.rot, 1, 1, 0.75);
    for (let k = 0; k < 4; k++) { const a = e.rot + k * Math.PI / 2; Art.draw(ctx, 'v16plate', x + Math.cos(a) * 92, y + Math.sin(a) * 92 * 0.75, a + Math.PI / 2); glowDot(ctx, x + Math.cos(a) * 92, y + Math.sin(a) * 69, 8, k === e.pi ? 'rgba(255,220,140,.95)' : 'rgba(200,150,255,.6)'); }
    const img = ph === 3 ? 'v16eye' : 'v16core';
    Art.draw(ctx, img, x, y, ph === 3 ? 0 : -e.rot * 0.6);
    bFlash(ctx, img, e);
    const p = 0.5 + 0.5 * Math.sin(e.t * (ph === 3 ? 10 : 4));
    glowDot(ctx, x, y, 40 + p * 8, ph === 3 ? `rgba(255,60,120,${0.3 + p * 0.3})` : `rgba(170,90,255,${0.3 + p * 0.3})`);
    if (ph === 3) { const a = aim(x, y); glowDot(ctx, x + Math.cos(a) * 8, y + Math.sin(a) * 8, 8, 'rgba(255,255,255,.95)'); }
  },
};
ET.boss16.onDeath = e => { e.phan = null; bossDown(e); };

// ================= 3D 模型 =================
Object.assign(EXTRA_MODELS, {
  echo(K) {
    const GL = new K.T.MeshPhysicalMaterial({ color: 0x3a2a6a, metalness: 0.4, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85, emissive: 0x2a1060, emissiveIntensity: 0.6 });
    K.ext([0, 14, 12, -6, 6, -12, 0, -6, -6, -12, -12, -6], 3, GL, 0, 0.8);
    K.sph(3.4, 2, 3.4, 0, 4, 0, K.G(0xc080ff, 3));
    K.barM(3, 8, 10, -6, 3.4, 0.8, 0.4, K.G(0x9060ff, 2));
  },
  warper(K) {
    const DK = K.M(0x2a3a5a, { m: 0.85, r: 0.25, cc: 1 }), CH = K.M(0xa8b4c8, { m: 0.95, r: 0.2, cc: 1, panel: false });
    K.ext([0, -14, 14, 0, 0, 14, -14, 0], 3, DK, 0, 1);
    K.torus(9, 1, 0, 3.4, 0, CH);
    K.sph(4, 3, 4, 0, 4, 0, K.G(0x60e8ff, 3));
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; K.sph(1.4, 1, 1.4, Math.cos(a) * 12, 3, Math.sin(a) * 12, K.G(0x60e8ff, 2.6)); }
  },
  clockT(K) {
    const BR = K.M(0x5a4a7a, { m: 0.9, r: 0.25, cc: 1, panel: false }), FC = K.M(0xe8e0f8, { m: 0.1, r: 0.3, cc: 1, panel: false }), GD = K.M(0xd8b048, { m: 0.95, r: 0.22, cc: 1, panel: false });
    K.cylV(16, 17, 4, 0, 0, 0, BR);
    K.cylV(13, 13, 1, 0, 4, 0, FC);
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; K.box(k % 3 ? 1 : 2, 0.6, k % 3 ? 2 : 3, Math.cos(a) * 11, 5.2, Math.sin(a) * 11, k % 3 ? BR : GD); }
    K.torus(15, 1, 0, 4.4, 0, GD);
    K.sph(1.6, 1, 1.6, 0, 5.4, 0, GD);
  },
  v16core(K, o) {
    const CR = new K.T.MeshPhysicalMaterial({ color: 0x2a1a4a, metalness: 0.5, roughness: 0.08, clearcoat: 1, emissive: 0x1a0a3a, emissiveIntensity: 0.8 });
    const GD = K.M(0xd8b048, { m: 0.95, r: 0.22, cc: 1, panel: false });
    K.add(new K.T.IcosahedronGeometry(42, 1), CR, 0, 0, 0);
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; K.add(new K.T.OctahedronGeometry(9, 0), CR, Math.cos(a) * 48, 6, Math.sin(a) * 48); }
    K.torus(50, 2, 0, 10, 0, GD);
    if (o && o.eye) { K.sph(24, 16, 24, 0, 30, 0, K.M(0xf8f0ff, { m: 0, r: 0.15, cc: 1, panel: false })); K.sph(12, 6, 12, 0, 44, 0, K.G(0xff3060, 3)); K.sph(5, 3, 5, 0, 50, 0, K.M(0x0a0010, { m: 0, r: 0.1, panel: false })); }
    else K.add(new K.T.OctahedronGeometry(20, 0), K.G(0xc080ff, 2.8), 0, 30, 0);
  },
  v16ring(K) {
    const RG = K.M(0x8a7ab0, { m: 0.95, r: 0.22, cc: 1, panel: false }), GL = K.G(0xb080ff, 2.2);
    K.torus(100, 5, 0, 0, 0, RG);
    K.torus(100, 1.2, 0, 4, 0, GL);
    for (let k = 0; k < 24; k++) { const a = k * TAU / 24; K.box(6, 3, 10, Math.cos(a) * 100, 5, Math.sin(a) * 100, RG).rotation.y = -a; }
  },
  v16plate(K) {
    const PL = K.M(0x5a4a7a, { m: 0.9, r: 0.25, cc: 1 }), GD = K.M(0xd8b048, { m: 0.95, r: 0.22, cc: 1, panel: false });
    K.ext([-20, -12, 20, -12, 14, 12, -14, 12], 5, PL, 0, 1.2);
    K.bar(-16, -10, 16, -10, 5.4, 2, 0.8, GD);
    K.sph(4, 3, 4, 0, 6, 2, K.G(0xffd890, 3));
  },
});
EXTRA_BAKES.push(
  ['echo', 30, 30, EXTRA_MODELS.echo, { glow: 0.9 }],
  ['warper', 32, 32, EXTRA_MODELS.warper, { glow: 0.9 }],
  ['clockT', 36, 36, EXTRA_MODELS.clockT],
  ['v16core', 120, 120, EXTRA_MODELS.v16core, { glow: 0.9 }],
  ['v16eye', 120, 120, EXTRA_MODELS.v16core, { glow: 1, eye: true }],
  ['v16ring', 214, 214, EXTRA_MODELS.v16ring, { glow: 0.7 }],
  ['v16plate', 44, 30, EXTRA_MODELS.v16plate, { glow: 0.8 }],
);

// ================= 波次、關卡、音樂 =================
Object.assign(WAVES, {
  echoes: q => { [100, 260, 180, 60, 300].forEach((x, i) => q(i * 0.45, () => spawn('echo', x, -16))); return 3.4; },
  warpers: q => { for (let i = 0; i < 3; i++) q(i * 0.7, () => spawn('warper', clamp(P.x + (i - 1) * 100, 40, W - 40), -40)); return 4.5; },
  mirror: q => { q(0, () => spawn('mirror', 180, -60)); return 12; },
});
STAGES.push({ name: '時空裂隙', en: 'THE RIFT', boss: 'boss16', amb: 'rift', speed: 56, bossSong: 'final',
  seq: ['echoes', 'warpers', 'swarmL', 'carrierP', 'cars', 'echoes', 'gargs', 'carrierS', 'carrierO', 'warpers', 'kitesR', 'ghosts', 'echoes', 'crates', 'carrierP', 'mirror', 'warpers', 'swarmR', 'fans', 'echoes', 'orbs', 'carrierB', 'warpers', 'holos', 'echoes', 'jetsUp', 'fDown'] });
Object.assign(SONGS, {
  s15: { bpm: 160, key: 43, prog: [[0, 'm'], [1, 'M'], [-4, 'M'], [-1, 'M'], [0, 'm'], [6, 'M'], [3, 'M'], [-5, 'm']], seed: 373, drums: 3, lead: 'sawtooth', arpW: 'square', pad: 1.2, bass: 'sawtooth', arp: [0, 12, 1, 13, 7, 19, 6, 18] },
});
BOSS_INFO.boss16 = { img: 'v16core', cls: '時空裂隙的支配者', threat: 5, col: '#c080ff' };
MID_INFO.mirror = '鏡像機';

// 打倒最終頭目的結局文字
showEnding = (function (base) {
  return function () {
    base();
    if (G.stage === STAGES.length - 1 && STAGES.length >= 16) {
      document.querySelector('#end .sub').textContent = '虛空之王被擊敗，時空裂隙封印了。天空終於恢復和平！';
    }
  };
})(showEnding);
