'use strict';
// 第 12 關「異星地表」：發光蕈菇森林 → 水晶峽谷與酸液湖 → 有機蜂巢
// 新敵人：異星蟲群、孢子囊（打破會散開）、酸液花（地面）、甲蟲戰車（地面）；中頭目「異星母巢」；最終頭目「異星女王」

// ================= 地形 =================
const Z12 = v => { const d = -v; const cry = smooth(1200, 1600, d) * (1 - smooth(2800, 3200, d)); return { fung: 1 - smooth(1200, 1600, d), cry, hive: smooth(2800, 3200, d) }; };
const acid12 = (x, v) => { const z = Z12(v); return z.cry > 0.4 && smooth(0.6, 0.64, fbm(x * 0.008, v * 0.008, 1201)) > 0.5; };
const H12 = (x, v) => {
  const z = Z12(v);
  let h = fbm(x * 0.006, v * 0.006, 1202) * (26 + z.cry * 30);
  h += Math.pow(ridge(x * 0.012, v * 0.012, 1203), 4) * 18 * (z.cry + z.hive * 0.6);
  // 隕石坑
  const cx = Math.floor(x / 120), cy = Math.floor(v / 140);
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) {
    if (hash(i, j, 1204) < 0.6) continue;
    const px = (i + hash(i, j, 1205)) * 120, py = (j + hash(j, i, 1205)) * 140, r = 22 + hash(i, j, 1206) * 26, d = Math.hypot(x - px, v - py) / r;
    if (d < 1.3) h += d < 1 ? -14 * (1 - d * d) : 6 * (1.3 - d) / 0.3;
  }
  if (acid12(x, v)) h -= 6;
  return h;
};
const C12 = (x, v, h, s) => {
  const z = Z12(v);
  let c = mixC([58, 36, 74], [92, 58, 104], fbm(x * 0.01, v * 0.01, 1207));
  c = mixC(c, mixC([28, 92, 98], [40, 126, 120], vnoise(x * 0.05, v * 0.05, 1208)), smooth(0.52, 0.66, fbm(x * 0.012, v * 0.012, 1209)) * (0.6 + z.fung * 0.4));
  c = mixC(c, [120, 70, 110], clamp((s - 0.5) * 2, 0, 1) * 0.7);
  c = mixC(c, [70, 40, 50], z.hive * 0.45);
  if (z.cry > 0.4) { const a = smooth(0.56, 0.64, fbm(x * 0.008, v * 0.008, 1201)) * z.cry; c = mixC(c, mixC([40, 120, 30], [90, 190, 50], vnoise(x * 0.04, v * 0.04, 1230)), a * 0.8); }
  return c;
};
function shroom(g, x, y, r, col) {
  g.fillStyle = 'rgba(10,0,20,.4)'; g.beginPath(); g.arc(x + r * 0.5, y + r * 0.6, r, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); gr.addColorStop(0, rgb(col, 1.35)); gr.addColorStop(0.6, rgb(col, 0.9)); gr.addColorStop(1, rgb(col, 0.45));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = 'rgba(200,255,240,.35)'; for (let k = 0; k < 3; k++) { const a = k * 1.7 + x, d = r * 0.55; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.12, 0, TAU); g.fill(); }
}
function crystal(g, x, y, r, a, col) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = 'rgba(10,0,20,.45)'; g.beginPath(); g.moveTo(4, 6); g.lineTo(r * 0.35 + 4, 6 - r); g.lineTo(r * 0.7 + 4, 6); g.fill();
  g.fillStyle = rgb(col, 1.4); g.beginPath(); g.moveTo(-r * 0.3, 0); g.lineTo(0, -r); g.lineTo(0, r * 0.2); g.fill();
  g.fillStyle = rgb(col, 0.75); g.beginPath(); g.moveTo(r * 0.3, 0); g.lineTo(0, -r); g.lineTo(0, r * 0.2); g.fill();
  g.restore();
}
PAINT.push({ H: H12, C: C12, k: 1.7, d: (g, v0, v1, sp) => {
  grain(g, v0, v1, 1210, 0.06);
  // 發光的血管紋
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  cells(70, 70, v0, v1, 40, (i, j, x, v) => {
    if (hash(i, j, 1211) < 0.5) return;
    let px = x + hash(i, j, 1212) * 70, pv = v + hash(i, j, 1213) * 70;
    const col = Z12(pv).hive > 0.5 ? 'rgba(255,80,60,' : 'rgba(80,255,220,';
    g.strokeStyle = col + '.28)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(px, pv);
    for (let k = 0; k < 5; k++) { px += (hash(k, i, j) - 0.5) * 30; pv += (hash(j, k, i) - 0.5) * 26; g.lineTo(px, pv); }
    g.stroke(); g.strokeStyle = col + '.5)'; g.lineWidth = 0.8; g.stroke();
  });
  g.restore();
  // 蕈菇森林
  const SH = [[130, 56, 130], [44, 120, 130], [96, 70, 160], [70, 96, 150]];
  cells(48, 48, v0, v1, 24, (i, j, x, v) => {
    const z = Z12(v + 24); if (hash(i, j, 1214) > z.fung * 0.32 + z.cry * 0.06) return;
    const n = 1 + ((hash(i, j, 1215) * 4) | 0);
    for (let k = 0; k < n; k++) { const sx = x + hash(k, i, j) * 48, sv = v + hash(j, k, i) * 48; if (acid12(sx, sv)) continue; shroom(g, sx, sv, 3 + hash(i + k, j, 1216) * 6, pick2(SH, i * 5 + k, j)); }
  });
  g.save(); g.globalCompositeOperation = 'lighter';
  cells(48, 48, v0, v1, 24, (i, j, x, v) => { const z = Z12(v); if (hash(i, j, 1217) > z.fung * 0.4) return; glowDotT(g, x + 24, v + 24, 22, 'rgba(160,80,255,.16)'); });
  g.restore();
  // 水晶柱與酸液湖岸
  const CR = [[90, 230, 255], [230, 110, 255], [120, 255, 200]];
  cells(56, 56, v0, v1, 30, (i, j, x, v) => {
    const z = Z12(v + 28); if (hash(i, j, 1218) > z.cry * 0.65 + z.hive * 0.1) return;
    const cx = x + hash(i, j, 1219) * 56, cv = v + hash(j, i, 1219) * 56; if (acid12(cx, cv)) return;
    const col = pick2(CR, i, j), n = 3 + ((hash(i, j, 1220) * 4) | 0);
    g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, cx, cv, 26, rgb(col, 1, 0.22)); g.restore();
    for (let k = 0; k < n; k++) crystal(g, cx + (hash(k, i, j) - 0.5) * 18, cv + (hash(j, k, i) - 0.5) * 12, 10 + hash(k, k, i + j) * 16, (hash(i, k, j) - 0.5) * 1.4, col);
  });
  cells(14, 14, v0, v1, 0, (i, j, x, v) => {
    if (!acid12(x + 7, v + 7)) return;
    if (hash(i, j, 1221) > 0.85) { g.fillStyle = 'rgba(220,255,160,.6)'; g.beginPath(); g.arc(x + 7, v + 7, 1.6 + hash(j, i, 1221) * 2, 0, TAU); g.fill(); }
  });
  // 蜂巢區：有機圓頂、孔洞
  cells(90, 100, v0, v1, 50, (i, j, x, v) => {
    const cx = x + 20 + hash(i, j, 1222) * 50, cv = v + 20 + hash(i, j, 1223) * 60, z = Z12(cv);
    if (z.hive < 0.5 || hash(i, j, 1224) < 0.3 || acid12(cx, cv)) return;
    const r = 16 + hash(i, j, 1225) * 16;
    g.fillStyle = 'rgba(20,0,10,.45)'; g.beginPath(); g.ellipse(cx + 6, cv + 8, r, r * 0.85, 0, 0, TAU); g.fill();
    const gr = g.createRadialGradient(cx - r * 0.4, cv - r * 0.4, 1, cx, cv, r); gr.addColorStop(0, '#d89a8a'); gr.addColorStop(0.5, '#8a4a5a'); gr.addColorStop(1, '#3a1a2a');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cv, r, r * 0.85, 0, 0, TAU); g.fill();
    for (let k = 0; k < 5; k++) { const a = hash(k, i, j) * TAU, d = r * 0.5; const hx = cx + Math.cos(a) * d, hy = cv + Math.sin(a) * d * 0.85; g.fillStyle = '#1a0610'; g.beginPath(); g.ellipse(hx, hy, r * 0.16, r * 0.12, a, 0, TAU); g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, hx, hy, r * 0.22, 'rgba(255,120,40,.5)'); g.restore(); }
    if (cv >= v0 && cv < v1 && j < -3 && hash(i, j, 1226) > 0.86) sp.push({ type: 'spitter', x: cx, v: cv });
  });
  // 蕈菇區也有酸液花
  cells(120, 180, v0, v1, 0, (i, j, x, v) => {
    if (j > -3 || hash(i, j, 1227) < 0.8) return;
    const cx = x + 30 + hash(i, j, 1228) * 60, cv = v + 40 + hash(i, j, 1229) * 100;
    if (cx < 30 || cx > W - 30 || cv < v0 || cv >= v1 || Z12(cv).hive > 0.4 || acid12(cx, cv)) return;
    sp.push({ type: 'spitter', x: cx, v: cv });
  });
} });
WATER.push(acid12);
ROADX.push(null);

// ================= 環境：孢子、熱霧 =================
AMB2.spore = {
  update(dt) {
    const A = G.amb;
    while (A.length < 46) A.push({ x: rnd(W), y: rnd(-20, H), r: rnd(1, 3.2), vx: rnd(-10, 10), vy: rnd(10, 30), ph: rnd(TAU), c: Math.random() < 0.5 });
    for (const p of A) { p.ph += dt * 2; p.x += (p.vx + Math.sin(p.ph) * 14) * dt; p.y += (p.vy + G.speed * 0.4) * dt; if (p.y > H + 10) { p.y = -10; p.x = rnd(W); } }
  },
  draw(ctx) {
    const z = Z12(-G.scroll - H / 2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of G.amb) { const f = 0.5 + 0.5 * Math.sin(p.ph * 2); ctx.fillStyle = p.c ? `rgba(120,255,200,${0.3 + f * 0.4})` : `rgba(220,120,255,${0.3 + f * 0.4})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, 'rgba(30,0,40,0)'); vg.addColorStop(1, `rgba(${z.hive > 0.5 ? '50,0,10' : '30,0,40'},.4)`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },
};

// ================= 敵人 =================
SPR.bug = { w: 20, h: 20, draw(g) { circ(g, 0, 0, 6, '#3a6a4a'); circ(g, 0, 4, 2.4, '#ff5040'); } };
SPR.spore = { w: 32, h: 32, draw(g) { circ(g, 0, 0, 13, rad(g, -3, -3, 14, ['#f0c0ff', '#9a4ac0', '#40104a'])); } };
SPR.spitter = { w: 34, h: 34, draw(g) { for (let i = 0; i < 6; i++) { const a = i * TAU / 6; circ(g, Math.cos(a) * 9, Math.sin(a) * 9, 7, '#6a3a7a'); } circ(g, 0, 0, 7, '#a0ff60'); } };
SPR.beetle = { w: 30, h: 36, draw(g) { rr(g, -12, -16, 24, 32, 10, '#2a5a4a'); circ(g, 0, 12, 4, '#ff6040'); } };
SPR.brood = { w: 120, h: 120, draw(g) { circ(g, 0, 0, 52, rad(g, -16, -16, 60, ['#d090a0', '#7a3a5a', '#2a0a1a'])); } };
Object.assign(ET, {
  bug: { hp: 1, r: 8, score: 80, spr: 'bug',
    init(e, o) { e.x0 = e.x; e.ph = o.ph || rnd(TAU); e.sp = o.sp || 170; e.dir = o.dir || 1; e.vy = e.sp; },
    update(e, dt) {
      const k = e.t < 0.9 ? 0 : Math.min(1, (e.t - 0.9) * 2);
      const tgt = Math.atan2(P.y - e.y, P.x - e.x);
      if (!e.locked && e.t > 1.1) { e.locked = true; e.la = tgt; }
      const a = e.locked ? e.la + Math.sin(e.t * 9 + e.ph) * 0.25 : Math.PI / 2 + Math.sin(e.t * 6 + e.ph) * 0.8 * e.dir;
      e.vx = Math.cos(a) * e.sp * (0.7 + k * 0.5); e.vy = Math.sin(a) * e.sp * (0.7 + k * 0.5);
      e.ang = a - Math.PI / 2;
    },
    draw(ctx, e) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fl = Math.sin(e.t * 50) * 0.5 + 0.5;
      for (const s of [-1, 1]) { ctx.fillStyle = `rgba(160,255,220,${0.25 + fl * 0.25})`; ctx.beginPath(); ctx.ellipse(e.x + s * 6, e.y - 2, 6, 2.5, s * (0.6 + fl * 0.4) + e.ang, 0, TAU); ctx.fill(); }
      ctx.restore();
      spr(ctx, e, 'bug', e.ang);
    },
  },
  spore: { hp: 10, r: 14, score: 600, spr: 'spore',
    init(e, o) { e.vy = o.vy || 45; e.x0 = e.x; e.ph = rnd(TAU); },
    update(e, dt) { e.x = e.x0 + Math.sin(e.t * 1.1 + e.ph) * 20; e.ang += dt * 0.6; if (e.t > 5.5 && !e.burst && e.y > 60) { e.burst = true; e.score = 0; G.kills--; killEnemy(e); } },
    draw(ctx, e) {
      const p = 1 + Math.sin(e.t * (e.t > 4 ? 14 : 4)) * 0.07;
      glowDot(ctx, e.x, e.y, 24, e.t > 4 ? 'rgba(255,90,140,.5)' : 'rgba(200,110,255,.35)');
      spr(ctx, e, 'spore', e.ang, p, p);
    },
    onDeath(e) {
      if (G.phase === 'down') return;
      if (P.alive && G.d.dens >= 0.7) { const n = G.d.dens >= 1 ? 10 : 7, a0 = rnd(TAU); for (let i = 0; i < n; i++) eShot2(e.x, e.y, a0 + i * TAU / n, 60, 'a', { acc: 25, vmax: 110 }); }
      for (let i = 0; i < (G.d.dens >= 1 ? 3 : 2); i++) G.queue.push({ t: G.st + 0.1 + i * 0.1, fn: () => spawn('bug', e.x, e.y, { sp: 140, ph: i * 2 }) });
    },
  },
  spitter: { hp: 14, r: 13, score: 500, ground: true, medal: 0.6,
    init(e) { e.open = 0; e.ft = rnd(0.8, 2); },
    update(e, dt) {
      e.ft -= dt * G.d.fr;
      e.open = e.ft < 0.6 ? Math.min(1, e.open + dt * 3) : Math.max(0, e.open - dt * 2);
      if (e.ft <= 0) { e.ft = 2.6; if (canShoot(e)) { const a = aim(e.x, e.y); for (let k = -2; k <= 2; k++) eShot2(e.x, e.y, a + k * 0.22, 115 - Math.abs(k) * 8, 'a'); Snd.play('eshot'); } }
    },
    draw(ctx, e) {
      const o = e.open;
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + e.t * 0.3; Art.draw(ctx, 'petal', e.x + Math.cos(a) * (6 + o * 4), e.y + Math.sin(a) * (6 + o * 4), a + Math.PI / 2); }
      glowDot(ctx, e.x, e.y, 10 + o * 8, `rgba(160,255,80,${0.5 + o * 0.4})`);
      spr(ctx, e, 'spitter', 0, 0.6 + o * 0.25, 0.6 + o * 0.25);
    },
  },
  beetle: { hp: 16, r: 13, score: 700, ground: true, medal: 0.6, gs: 'beetle',
    init(e) { e.vy = 26; e.ft = rnd(0.8, 1.5); e.body = 0; },
    update(e, dt) {
      e.vx = Math.sin(e.t * 0.8) * 20; e.body = Math.atan2(e.vy + G.speed, e.vx) - Math.PI / 2;
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 2.2; if (canShoot(e)) for (let k = 0; k < 4; k++) G.queue.push({ t: G.st + k * 0.1, fn: () => { if (!e.dead && canShoot(e)) eShot(e.x, e.y + 10, aim(e.x, e.y) + (k - 1.5) * 0.12, 140, 'a'); } }); }
    },
    draw(ctx, e) {
      ctx.strokeStyle = '#1a2a24'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const s = k < 3 ? -1 : 1, i = k % 3, ph = e.t * 9 + i * 2 + (s > 0 ? 3 : 0); ctx.beginPath(); ctx.moveTo(e.x + s * 6, e.y + (i - 1) * 8); ctx.lineTo(e.x + s * 16, e.y + (i - 1) * 9 + Math.sin(ph) * 3); ctx.stroke(); }
      spr(ctx, e, 'beetle', e.body);
    },
  },
  brood: { hp: 480, r: 44, score: 14000, big: 1, drop: ['P', 'S'], hb: [[0, 0, 46]],
    init(e) { e.vy = 50; e.ft = 1; e.tb = 2; e.tc = 3; e.sa = 0; },
    update(e, dt) {
      if (e.st === undefined) { e.vy = Math.max(12, (150 - e.y) * 1.2); if (e.y >= 146) { e.st = 0; e.x0 = e.x; e.vy = 0; } return; }
      e.st += dt; e.vy = e.st > 18 ? 60 : 0;
      e.x = e.x0 + Math.sin(e.st * 0.5) * 50;
      if (!canShoot(e) || e.st > 18) return;
      const f = dt * G.d.fr;
      e.ft -= f; if (e.ft <= 0) { e.ft = 0.12; e.sa += 0.27; for (let k = 0; k < 3; k++) eShot(e.x, e.y, e.sa + k * TAU / 3, 95, 'a'); }
      e.tb -= f; if (e.tb <= 0) { e.tb = 3.4; for (let i = 0; i < 4; i++) G.queue.push({ t: G.st + i * 0.15, fn: () => { if (!e.dead) spawn('bug', e.x + (i % 2 ? 40 : -40), e.y + 20, { sp: 150, ph: i }); } }); }
      e.tc -= f; if (e.tc <= 0) { e.tc = 4; fan(e.x, e.y + 40, aim(e.x, e.y), 7, 0.9, 150, 'b'); }
    },
    shadow(ctx, e) { Art.shadow(ctx, 'brood', e.x, e.y, 0, 0.9); },
    draw(ctx, e) {
      const p = 1 + Math.sin(e.t * 3) * 0.04;
      glowDot(ctx, e.x, e.y, 70, 'rgba(255,80,120,.2)');
      spr(ctx, e, 'brood', e.t * 0.2, p, p);
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + e.t * 0.2; glowDot(ctx, e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34, 7 + Math.sin(e.t * 5 + k) * 2, 'rgba(255,170,60,.8)'); }
    },
  },
});
SPR.petal = { w: 14, h: 22, draw(g) { P_(g, [0, -10, 6, 0, 0, 10, -6, 0], '#7a3a8a'); } };

// ================= 最終頭目：異星女王 =================
SPR.q12 = { w: 300, h: 230, draw(g) { P_(g, [0, -100, 90, -70, 140, 0, 90, 90, 0, 110, -90, 90, -140, 0, -90, -70], '#4a2a40'); circ(g, 0, 10, 30, '#ff5070'); } };
SPR.q12o = SPR.q12;
SPR.q12claw = { w: 40, h: 110, draw(g) { P_(g, [-10, -50, 10, -50, 16, 20, 4, 54, -6, 30], '#3a2030'); } };
const Q12C = [[-100, 30], [100, 30]];
ET.boss12 = { name: '異星女王', en: 'HIVE QUEEN', hp: 5400, r: 50, score: 600000, boss: true, layer: 'ground', hb: [[0, 0, 52], [0, -70, 34], [-96, 20, 22], [96, 20, 22]], marks: [0.66, 0.33],
  init(e) { bossBase(e); e.y = -180; e.ph = 1; e.claw = [0, 0]; e.ci = 0; e.td = 3; e.te = 2; e.eyes = []; for (let i = 0; i < 8; i++) e.eyes.push({ a: -0.4 + i * 0.11 * (i % 2 ? 1 : -1), r: 0 }); },
  update(e, dt) {
    e.claw = e.claw.map((c, i) => c + dt);
    if (bossEnter(e, dt, 150, 50)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.33) * 30; e.y = 150 + Math.sin(e.mt * 0.8) * 8;
    const f0 = e.hp / e.maxhp, ph = f0 > 0.66 ? 1 : f0 > 0.33 ? 2 : 3;
    if (ph !== e.ph) {
      e.ph = ph; G.shake = 14; G.eb.length = 0; G.flash = 0.4;
      for (let i = 0; i < 8; i++) G.queue.push({ t: G.st + i * 0.1, fn: () => boom(e.x + rnd(-130, 130), e.y + rnd(-60, 60), 1.6, true) });
      popText(e.x, e.y + 100, ph === 2 ? '甲殼裂開了！' : '女王暴走！', '#ff6a9a');
      Snd.play('sting');
    }
    bossSmoke(e);
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    // 爪子：酸液扇形
    e.ta -= f;
    if (e.ta <= 0) {
      e.ta = ph === 1 ? 1.0 : ph === 2 ? 1.3 : 1.5; e.ci ^= 1; e.claw[e.ci] = 0;
      const [ox, oy] = Q12C[e.ci], cx = e.x + ox, cy = e.y + oy + 40;
      fan(cx, cy, aim(cx, cy), ph === 1 ? 5 : 4, 0.6, 150, 'a');
    }
    if (ph === 1) {
      // 花瓣彈幕
      e.tb -= f; if (e.tb <= 0) { e.tb = 2.2; const n = Math.round(16 * G.d.dens); for (let i = 0; i < n; i++) { const a = e.mt + i * TAU / n; eShot2(e.x, e.y + 20, a, 90, 's', { av: 0.45 }); eShot2(e.x, e.y + 20, a, 90, 's', { av: -0.45 }); } Snd.play('eshot'); }
      e.td -= f; if (e.td <= 0) { e.td = 6; for (let i = 0; i < 5; i++) G.queue.push({ t: G.st + i * 0.2, fn: () => { if (!e.dead) spawn('bug', e.x + rnd(-80, 80), e.y - 40, { sp: 150, ph: i }); } }); }
    } else if (ph === 2) {
      // 大腦外露：混亂的花形＋追蹤孢子
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.08; e.sa += 0.21; const r = Math.sin(e.mt * 2.2) * 0.9; eShot2(e.x, e.y - 10, e.sa, 105, 'ink', { av: r }); eShot2(e.x, e.y - 10, e.sa + Math.PI, 105, 'ink', { av: -r }); }
      e.td -= f; if (e.td <= 0) { e.td = 3.6; for (const s of [-1, 1]) for (let k = 0; k < 2; k++) eShot(e.x + s * 60, e.y - 50, Math.PI / 2 + s * (0.6 + k * 0.4), 100, 'm'); Snd.play('missile'); }
    } else {
      // 暴走：旋轉密集花朵＋眼睛光束
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.1; e.sa += 0.33; for (let k = 0; k < 4; k++) eShot2(e.x, e.y + 10, e.sa + k * TAU / 4, 115, k % 2 ? 'a' : 's', { av: k % 2 ? 0.5 : -0.5 }); }
      e.td -= f;
      if (e.td <= 0) {
        e.td = 4.2;
        if (G.d.beams) { for (const bx of [P.x - 46, P.x + 46]) G.beams.push({ x: clamp(bx, 20, W - 20), y: e.y + 60, w: 22, t: 0, warn: 0.9, life: 1.1, col: 'v' }); Snd.play('warn'); }
        else ring(e.x, e.y, 16, 90, e.mt, 'b');
      }
      e.te -= f; if (e.te <= 0) { e.te = 5; for (let i = 0; i < 3; i++) spawn('spore', e.x + (i - 1) * 90, e.y + 30, { vy: 60 }); }
    }
  },
  draw(ctx, e) {
    const x = e.x, y = e.y, ph = e.ph || 1, open = ph >= 2;
    const breathe = 1 + Math.sin(e.t * 2) * 0.015;
    glowDot(ctx, x, y, 170, ph === 3 ? 'rgba(255,40,80,.25)' : 'rgba(180,60,255,.18)');
    // 爪子
    Q12C.forEach(([ox, oy], i) => {
      const k = Math.min(1, e.claw[i] / 0.35), swing = (1 - k) * 0.5 * (i ? -1 : 1);
      const a = Math.sin(e.t * 1.4 + i * 2) * 0.15 + swing + (i ? -0.2 : 0.2);
      Art.draw(ctx, 'q12claw', x + ox + 6, y + oy + 40 + 9, a, 0.3, i ? -1 : 1, 1, 's');
      ctx.save(); ctx.translate(x + ox, y + oy); ctx.rotate(a); if (i) ctx.scale(-1, 1); Art.draw(ctx, 'q12claw', 0, 40); ctx.restore();
      if (k < 1) glowDot(ctx, x + ox, y + oy + 86, 14, 'rgba(160,255,80,.8)');
    });
    const img = open ? 'q12o' : 'q12';
    Art.draw(ctx, img, x + 7, y + 10, 0, 0.35, breathe, breathe, 's');
    Art.draw(ctx, img, x, y, 0, 1, breathe, breathe);
    bFlash(ctx, img, e);
    // 大腦核心
    const pulse = 0.5 + 0.5 * Math.sin(e.t * (ph === 3 ? 10 : 4));
    if (open) { glowDot(ctx, x, y - 10, 48, `rgba(255,${ph === 3 ? 40 : 90},${ph === 3 ? 80 : 200},${0.35 + pulse * 0.35})`); glowDot(ctx, x, y - 10, 18, `rgba(255,230,255,${0.5 + pulse * 0.4})`); }
    // 眼睛群
    for (let i = 0; i < 8; i++) {
      const s = i % 2 ? 1 : -1, k = i >> 1, ex = x + s * (18 + k * 12), ey = y + 54 - k * 6;
      const a = aim(ex, ey), r = 3.6 - k * 0.4;
      ctx.fillStyle = '#1a0408'; ctx.beginPath(); ctx.arc(ex, ey, r + 1.2, 0, TAU); ctx.fill();
      ctx.fillStyle = ph === 3 ? '#ff3a3a' : '#ffd040'; ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + Math.cos(a) * r * 0.4, ey + Math.sin(a) * r * 0.4, r * 0.45, 0, TAU); ctx.fill();
    }
    glowDot(ctx, x, y + 50, 30, ph === 3 ? `rgba(255,60,60,${0.2 + pulse * 0.3})` : `rgba(255,200,60,${0.12 + pulse * 0.15})`);
  },
};
ET.boss12.onDeath = e => bossDown(e);

// ================= 3D 模型 =================
Object.assign(EXTRA_MODELS, {
  bug(K) {
    const SH = K.M(0x2a5a4a, { m: 0.6, r: 0.3, cc: 1, panel: false }), DK = K.M(0x10201a, { m: 0.6, r: 0.4, panel: false });
    K.sph(5, 3, 7, 0, 2, 0, SH);
    K.sph(3, 2.4, 3, 0, 2.6, 7, DK);
    for (const s of [-1, 1]) { K.sph(1.2, 1, 1.2, s * 1.6, 4.6, 8.6, K.G(0xff5040, 3)); K.bar(s * 1.5, 9, s * 3.5, 13, 3, 0.6, 0.5, DK); }
    K.bar(0, -6, 0, 6, 5, 0.6, 0.4, K.G(0x60ffc0, 2.4));
  },
  spore(K) {
    const SK = K.M(0x9a4ac0, { m: 0.2, r: 0.3, cc: 1, panel: false }), DK = K.M(0x3a1040, { m: 0.2, r: 0.5, panel: false });
    const geo = new K.T.IcosahedronGeometry(12, 2), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const f = 0.9 + hash(Math.round(p.getX(i) * 5), Math.round(p.getZ(i) * 5), 1240) * 0.2; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.8, p.getZ(i) * f); }
    geo.computeVertexNormals(); K.add(geo, SK);
    for (let i = 0; i < 7; i++) { const a = i * 0.9; K.sph(2.2, 1.4, 2.2, Math.cos(a) * 8, 7, Math.sin(a) * 8, K.G(i % 2 ? 0xffa0ff : 0x80ffd0, 2.6)); }
    K.sph(3, 2, 3, 0, 9, 0, DK);
  },
  spitter(K) {
    const IN = K.M(0x4a6a2a, { m: 0.1, r: 0.4, cc: 1, panel: false });
    K.sph(9, 5, 9, 0, 0, 0, IN);
    K.sph(5, 3, 5, 0, 4, 0, K.G(0xa0ff60, 2.8));
  },
  petal(K) { K.ext([0, -10, 6, -2, 4, 8, 0, 11, -4, 8, -6, -2], 2, K.M(0x8a3a9a, { m: 0.1, r: 0.35, cc: 1, panel: false }), 0, 0.6); K.bar(0, -8, 0, 8, 2.4, 0.8, 0.3, K.G(0xe080ff, 2)); },
  beetle(K) {
    const SH = K.M(0x24584a, { m: 0.65, r: 0.25, cc: 1, panel: false }), SH2 = K.M(0x3a8a6a, { m: 0.65, r: 0.25, cc: 1, panel: false }), DK = K.M(0x0e1a16, { m: 0.6, r: 0.4, panel: false });
    for (const s of [-1, 1]) K.ext([0, -15, s * 11, -10, s * 13, 4, s * 8, 13, 0, 12], 5, SH, 1, 1.2);
    K.bar(0, -15, 0, 12, 6.4, 0.8, 0.5, SH2);
    K.sph(6, 4, 5, 0, 3, 14, DK);
    for (const s of [-1, 1]) { K.ext([s * 3, 16, s * 8, 24, s * 4, 22], 1.4, SH2, 3, 0.3); K.sph(1.2, 1, 1.2, s * 2.6, 6.4, 17, K.G(0xff6040, 3)); }
  },
  brood(K) {
    const FL = K.M(0x8a3a5a, { m: 0.15, r: 0.35, cc: 1, panel: false }), FL2 = K.M(0xc07a8a, { m: 0.15, r: 0.35, cc: 1, panel: false }), DK = K.M(0x2a0a1a, { m: 0.2, r: 0.5, panel: false });
    const geo = new K.T.IcosahedronGeometry(50, 3), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const f = 0.88 + vnoise(p.getX(i) * 0.08, p.getZ(i) * 0.08, 1241) * 0.24; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.55, p.getZ(i) * f); }
    geo.computeVertexNormals(); K.add(geo, FL);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; K.sph(9, 6, 9, Math.cos(a) * 34, 20, Math.sin(a) * 34, FL2); K.sph(4, 2, 4, Math.cos(a) * 34, 25, Math.sin(a) * 34, DK); }
    K.sph(12, 8, 12, 0, 26, 0, K.G(0xff6080, 2.4));
  },
  q12(K, o) {
    const CA = K.M(0x3a1e34, { m: 0.55, r: 0.25, cc: 1, panel: false }), CA2 = K.M(0x5a2e4a, { m: 0.55, r: 0.25, cc: 1, panel: false }), DK = K.M(0x12060e, { m: 0.4, r: 0.4, panel: false });
    const FL = K.M(0xa04a6a, { m: 0.1, r: 0.35, cc: 1, panel: false }), GL = K.G(0xc060ff, 2.4), AC = K.G(0x90ff50, 2.4);
    const open = !!(o && o.open);
    // 腹部（往上方延伸，一節一節）
    for (let k = 0; k < 4; k++) { const z = -60 - k * 18, r = 46 - k * 8; K.sph(r, 12 - k, 14, 0, 4, z, k % 2 ? CA : CA2); K.bar(-r * 0.8, z + 6, r * 0.8, z + 6, 14 - k, 1.4, 0.6, GL); }
    // 胸甲（打開時往兩邊掀開，露出大腦）
    if (!open) {
      K.ext([0, -48, 56, -36, 74, 6, 50, 46, 0, 56, -50, 46, -74, 6, -56, -36], 12, CA, 2, 3);
      K.ext([0, -38, 40, -28, 54, 4, 36, 34, 0, 42, -36, 34, -54, 4, -40, -28], 3, CA2, 14, 1.2);
      K.bar(0, -40, 0, 42, 17.6, 2, 0.8, GL);
    } else {
      for (const s of [-1, 1]) { K.ext([s * 34, -46, s * 90, -30, s * 106, 8, s * 78, 50, s * 40, 40, s * 48, 4], 12, CA, 2, 3); K.bar(s * 50, -30, s * 90, 30, 15, 1.6, 0.6, GL); }
      const geo = new K.T.IcosahedronGeometry(30, 3), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const f = 0.9 + Math.abs(Math.sin(p.getX(i) * 0.5 + p.getZ(i) * 0.3)) * 0.12; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.6, p.getZ(i) * f); }
      geo.computeVertexNormals(); K.add(geo, FL, 0, 6, -6);
      for (let k = -2; k <= 2; k++) K.bar(k * 9, -30, k * 9 + 3, 18, 22, 1.2, 0.8, K.G(0xff70c0, 2.2));
    }
    // 頭部（朝下）與觸鬚
    K.sph(30, 12, 24, 0, 6, 54, DK);
    for (const s of [-1, 1]) {
      K.ext([s * 8, 70, s * 28, 96, s * 22, 104, s * 4, 80], 3, CA2, 10, 0.8);
      for (let k = 0; k < 4; k++) K.ext([s * (60 + k * 16), -10 + k * 14, s * (100 + k * 14), -40 + k * 30, s * (104 + k * 14), -34 + k * 30, s * (64 + k * 16), 0 + k * 14], 2.4, k % 2 ? CA : CA2, 3, 0.6);
      K.bar(s * 30, -20, s * 60, 60, 4, 2, 1, AC);
    }
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.sph(2, 1.2, 2, Math.cos(a) * 62, 6, -40 + Math.sin(a) * 30 - 30, K.G(0xff9a40, 2.6)); }
  },
  q12claw(K) {
    const CA = K.M(0x3a1e34, { m: 0.55, r: 0.25, cc: 1, panel: false }), CA2 = K.M(0x6a3a56, { m: 0.55, r: 0.25, cc: 1, panel: false }), BN = K.M(0xe8d8c8, { m: 0.2, r: 0.3, cc: 1, panel: false });
    K.ext([-9, -52, 9, -52, 12, -8, 7, 0, -7, 0, -12, -8], 6, CA, 0, 1.4);
    K.ext([-7, 0, 7, 0, 12, 30, 2, 46, -6, 30], 5, CA2, 0, 1.2);
    K.ext([2, 44, 14, 36, 8, 56, -2, 54], 3, BN, 2, 0.5);
    K.ext([-4, 40, -14, 34, -8, 52], 3, BN, 2, 0.5);
    K.bar(0, -46, 0, 26, 6.4, 1.2, 0.5, K.G(0x90ff50, 2.2));
  },
});
EXTRA_BAKES.push(
  ['bug', 20, 20, EXTRA_MODELS.bug, { glow: 0.7 }],
  ['spore', 32, 32, EXTRA_MODELS.spore, { glow: 0.9 }],
  ['spitter', 22, 22, EXTRA_MODELS.spitter, { glow: 0.8 }],
  ['petal', 14, 22, EXTRA_MODELS.petal, { glow: 0.6 }],
  ['beetle', 30, 40, EXTRA_MODELS.beetle, { rot: Math.PI, glow: 0.7 }],
  ['brood', 120, 120, EXTRA_MODELS.brood, { glow: 0.8 }],
  ['q12', 240, 240, EXTRA_MODELS.q12, { glow: 0.8 }],
  ['q12o', 240, 240, EXTRA_MODELS.q12, { glow: 0.8, open: true }],
  ['q12claw', 40, 120, EXTRA_MODELS.q12claw, { glow: 0.7 }],
);

// ================= 波次、關卡、音樂 =================
Object.assign(WAVES, {
  swarmL: q => { for (let i = 0; i < 8; i++) q(i * 0.12, () => spawn('bug', 60 + i * 8, -12, { dir: 1, ph: i })); return 2.6; },
  swarmR: q => { for (let i = 0; i < 8; i++) q(i * 0.12, () => spawn('bug', 300 - i * 8, -12, { dir: -1, ph: i })); return 2.6; },
  spores: q => { [80, 280, 180].forEach((x, i) => q(i * 0.8, () => spawn('spore', x, -20))); return 4; },
  beetles: q => { for (let i = 0; i < 3; i++) q(i * 0.6, () => { const x = groundX(rnd(60, 300), 'land'); if (x !== null) spawn('beetle', x, -26); }); return 3; },
  brood: q => { q(0, () => spawn('brood', 180, -70)); return 11; },
});
STAGES.push({ name: '異星地表', en: 'ALIEN WORLD', boss: 'boss12', amb: 'spore', speed: 48, bossSong: 'final',
  seq: ['swarmL', 'beetles', 'fDown', 'carrierP', 'spores', 'swarmR', 'icpt', 'crates', 'beetles', 'snakeL', 'carrierS', 'swarmL', 'spores', 'jetsUp', 'beetles', 'carrierP', 'brood', 'swarmR', 'spores', 'fDive', 'beetles', 'crates', 'swarmL', 'carrierB', 'spores', 'swarmR', 'droneW'] });
Object.assign(SONGS, {
  s11: { bpm: 150, key: 42, prog: [[0, 'm'], [1, 'M'], [-2, 'm'], [-1, 'M'], [0, 'm'], [6, 'M'], [5, 'm'], [1, 'M']], seed: 257, drums: 3, lead: 'sawtooth', arpW: 'triangle', pad: 0.8, bass: 'sawtooth', arp: [0, 1, 7, 12, 6, 7, 1, 0] },
  final: { bpm: 182, key: 45, prog: [[0, 'm'], [-4, 'M'], [-2, 'M'], [0, 'm'], [1, 'M'], [-1, 'M'], [-5, 'm'], [-4, 'M']], seed: 281, drums: 3, lead: 'sawtooth', pad: 1, bass: 'sawtooth' },
});
