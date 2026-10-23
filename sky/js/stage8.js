'use strict';
// 第 8 關「星海決戰」：衝出大氣層 → 巨型太空站表面 → 深空星雲小行星帶，最終頭目「星艦母艦」（三階段）

// ================= 地形 =================
const Z8 = v => { const d = -v; const st = smooth(800, 1100, d) * (1 - smooth(2600, 2900, d)); return { orbit: 1 - smooth(800, 1100, d), st, deep: smooth(2600, 2900, d) }; };
const TRENCH = 180;
const planetEdge = x => -330 + 0.0042 * (x - 180) * (x - 180);
const station8 = (x, v) => Z8(v).st > 0.5 && Math.abs(x - TRENCH) > 22;
const H8 = (x, v) => {
  const z = Z8(v);
  if (z.st < 0.02) return 0;
  const q = Math.floor(vnoise(Math.floor(x / 24) * 0.37, Math.floor(v / 30) * 0.31, 801) * 4) * 4;
  let h = (6 + q) * z.st;
  if (Math.abs(x - TRENCH) < 22) h -= 18 * z.st;
  return h;
};
const C8 = (x, v, h) => {
  const z = Z8(v);
  // 星空底色＋星雲
  const neb = fbm(x * 0.004, v * 0.004, 802), neb2 = fbm(x * 0.006 + 9, v * 0.006, 803);
  let c = mixC([4, 6, 16], [10, 14, 34], neb);
  c = mixC(c, [70, 26, 90], smooth(0.55, 0.8, neb) * (0.4 + z.deep * 0.6));
  c = mixC(c, [20, 70, 110], smooth(0.6, 0.85, neb2) * (0.3 + z.deep * 0.5));
  // 起點：藍色星球的邊緣和大氣層
  if (z.orbit > 0.01) {
    const edge = planetEdge(x);
    const t = v - edge;
    if (t > 0) c = mixC(c, mixC([30, 90, 170], [60, 140, 90], smooth(0.55, 0.7, fbm(x * 0.01, v * 0.01, 804))), clamp(t / 30, 0, 1));
    c = mixC(c, [120, 200, 255], Math.max(0, 1 - Math.abs(t) / 28) * 0.8);
  }
  // 太空站表面
  if (z.st > 0.02) {
    const plate = mixC([92, 100, 114], [128, 136, 150], hash(Math.floor(x / 24), Math.floor(v / 30), 805));
    const tr = Math.abs(x - TRENCH) < 22;
    c = mixC(c, tr ? [36, 40, 50] : plate, z.st);
  }
  return c;
};
PAINT.push({ H: H8, C: C8, k: 1.4, d: (g, v0, v1, sp) => {
  // 星星（不在太空站上）
  for (let k = 0; k < 90; k++) {
    const x = hash(k, Math.floor(v0), 811) * W, v = v0 + hash(Math.floor(v0), k, 812) * (v1 - v0);
    if (Z8(v).st > 0.5 || v > planetEdge(x) - 4) continue;
    const r = hash(k, k, Math.floor(v0)) * 1.3 + 0.3;
    g.fillStyle = `rgba(${200 + (hash(k, 3, 813) * 55 | 0)},${210 + (hash(k, 4, 813) * 45 | 0)},255,${0.5 + r * 0.35})`;
    g.beginPath(); g.arc(x, v, r, 0, TAU); g.fill();
    if (r > 1.35) { g.strokeStyle = 'rgba(200,220,255,.35)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - 4, v); g.lineTo(x + 4, v); g.moveTo(x, v - 4); g.lineTo(x, v + 4); g.stroke(); }
  }
  // 星球上的雲
  for (let k = 0; k < 10; k++) {
    const x = hash(k, Math.floor(v0), 814) * W, v = v0 + hash(Math.floor(v0), k, 815) * (v1 - v0);
    if (v < planetEdge(x) + 16) continue;
    cloud(g, x, v, 14 + hash(k, 1, 816) * 14, k * 7, 0.55);
  }
  // 太空站細節：面板接縫、燈、通風口、壕溝裡的燈
  cells(24, 30, v0, v1, 0, (i, j, x, v) => {
    if (Z8(v + 15).st < 0.5 || Math.abs(x + 12 - TRENCH) < 30) return;
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.8; g.strokeRect(x + 0.5, v + 0.5, 23, 29);
    const r = hash(i, j, 817);
    if (r < 0.12) { g.fillStyle = '#2a2e38'; g.fillRect(x + 4, v + 6, 16, 18); g.fillStyle = 'rgba(0,0,0,.5)'; for (let k = 0; k < 4; k++) g.fillRect(x + 5, v + 8 + k * 4, 14, 1.5); }
    else if (r < 0.2) glowDotT(g, x + 12, v + 15, 4, pick2(['rgba(80,220,255,.9)', 'rgba(255,80,80,.9)', 'rgba(255,220,100,.9)'], i, j));
    else if (r < 0.26) { g.fillStyle = 'rgba(160,200,255,.25)'; g.fillRect(x + 3, v + 3, 18, 24); g.strokeStyle = 'rgba(160,220,255,.6)'; g.strokeRect(x + 3.5, v + 3.5, 17, 23); }
    if (r > 0.94 && j < -2 && v + 15 >= v0 && v + 15 < v1) sp.push({ type: 'turret', x: x + 12, v: v + 15 });
  });
  for (let v = Math.floor(v0 / 24) * 24; v < v1; v += 24) {
    if (Z8(v).st < 0.5) continue;
    glowDotT(g, TRENCH - 18, v, 3, 'rgba(255,200,80,.9)'); glowDotT(g, TRENCH + 18, v + 12, 3, 'rgba(255,200,80,.9)');
    g.fillStyle = 'rgba(80,90,110,.8)'; g.fillRect(TRENCH - 20, v + 6, 40, 2);
  }
} });
WATER.push((x, v) => !station8(x, v));
ROADX.push(null);

// ================= 小行星（打碎會分裂）=================
SPR.rockL = { w: 44, h: 44, draw(g) { const o = []; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; o.push(Math.cos(a) * (16 + hash(i, 1, 9) * 5), Math.sin(a) * (16 + hash(i, 2, 9) * 5)); } P_(g, o, '#6a625a'); } };
SPR.rockS = { w: 24, h: 24, draw(g) { const o = []; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; o.push(Math.cos(a) * (8 + hash(i, 3, 9) * 3), Math.sin(a) * (8 + hash(i, 4, 9) * 3)); } P_(g, o, '#7a7068'); } };
Object.assign(ET, {
  rock: { hp: 12, r: 18, score: 300, spr: 'rockL',
    init(e, o) { e.small = !!o.small; if (e.small) { e.hp = e.maxhp = 3 * G.d.hp; e.r = 9; e.score = 100; } e.vx = o.vx ?? rnd(-30, 30); e.vy = o.vy ?? rnd(50, 90); e.spin = rnd(-1.5, 1.5); },
    update(e, dt) { e.ang += e.spin * dt; },
    shadow() { },
    draw(ctx, e) { spr(ctx, e, e.small ? 'rockS' : 'rockL'); },
    onDeath(e) {
      if (!e.small) for (const s of [-1, 1]) spawn('rock', e.x + s * 8, e.y, { small: true, vx: s * rnd(50, 90) + e.vx, vy: e.vy * 0.8 });
      for (let i = 0; i < 6; i++) fxP({ k: 'k', x: e.x, y: e.y, vx: rnd(-120, 120), vy: rnd(-120, 120), life: 0, max: 0.4 });
      if (Math.random() < (e.small ? 0.05 : 0.15)) spawnItem('medal', e.x, e.y);
    },
  },
});

// ================= 最終頭目：星艦母艦（三階段）=================
ET.boss8 = { name: '星艦母艦', en: 'STAR MOTHERSHIP', hp: 2600, r: 50, score: 300000, boss: true, layer: 'air', hb: [[0, 0, 46], [-90, -10, 30], [90, -10, 30], [-140, -20, 18], [140, -20, 18]],
  init(e) { bossBase(e); e.y = -170; e.ph = 1; e.k = 0; e.td = 6; },
  update(e, dt) {
    if (bossEnter(e, dt, 140, 60)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.35) * 34; e.y = 140 + Math.sin(e.mt * 0.8) * 10;
    const f0 = e.hp / e.maxhp, ph = f0 > 0.66 ? 1 : f0 > 0.33 ? 2 : 3;
    if (ph !== e.ph) {
      e.ph = ph; G.shake = 10; G.eb.length = 0;
      for (let i = 0; i < 6; i++) G.queue.push({ t: G.st + i * 0.12, fn: () => boom(e.x + rnd(-120, 120), e.y + rnd(-40, 40), 1.6) });
      popText(e.x, e.y + 60, ph === 2 ? '核心開啟！' : '最後的掙扎！', '#ff5a4e');
    }
    if (Math.random() < 0.06 * ph) fxP({ k: 's', x: e.x + rnd(-120, 120), y: e.y + rnd(-30, 30), vx: 0, vy: -30, r: rnd(4, 8), life: 0, max: 1, a: 0.3 });
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    if (ph === 1) {
      e.ta -= f; if (e.ta <= 0) { e.ta = 0.9; for (const s of [-1, 1]) fan(e.x + s * 90, e.y + 10, aim(e.x + s * 90, e.y + 10), 3, 0.32, 160); }
      e.tb -= f; if (e.tb <= 0) { e.tb = 2.4; ring(e.x, e.y + 20, 18, 100, e.mt, 'b'); }
      e.td -= f; if (e.td <= 0) { e.td = 6; for (let i = 0; i < 4; i++) G.queue.push({ t: G.st + i * 0.25, fn: () => { if (!e.dead) spawn('fighter', e.x + (i % 2 ? 140 : -140), e.y, { path: 'dive', stop: rnd(200, 280) }); } }); }
    } else if (ph === 2) {
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.09; e.sa += 0.19; for (let a = 0; a < 4; a++) eShot(e.x, e.y + 10, e.sa + a * TAU / 4, 105); }
      e.ta -= f; if (e.ta <= 0) { e.ta = 2.2; fan(e.x, e.y + 30, aim(e.x, e.y + 30), 7, 0.8, 160, 'b'); }
      e.tb -= f; if (e.tb <= 0) {
        e.tb = 4.6;
        if (G.d.beams) { for (const bx of [P.x - 70, P.x + 70]) G.beams.push({ x: clamp(bx, 20, W - 20), y: e.y + 40, w: 24, t: 0, warn: 1, life: 0.8 }); Snd.play('warn'); }
        else ring(e.x, e.y, 14, 90, e.mt);
      }
    } else {
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.07; e.sa += 0.23; e.sb = (e.sb || 0) - 0.17; for (let a = 0; a < 3; a++) { eShot(e.x, e.y + 10, e.sa + a * TAU / 3, 110); eShot(e.x, e.y + 10, e.sb + a * TAU / 3, 90); } }
      e.ta -= f; if (e.ta <= 0) { e.ta = 1.8; fan(e.x, e.y + 30, aim(e.x, e.y + 30), 5, 0.5, 175, 'b'); }
      e.tb -= f; if (e.tb <= 0) { e.tb = 3.4; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) eShot(e.x + s * 140, e.y - 20, Math.PI / 2 + s * (0.3 + k * 0.3), 120, 'm'); Snd.play('missile'); }
    }
  },
  shadow(ctx, e) { },
  draw(ctx, e) {
    const x = e.x, y = e.y;
    for (const ex of [-110, -50, 50, 110]) glowDot(ctx, x + ex, y - 66, 14 + Math.random() * 6, 'rgba(120,180,255,.8)');
    Art.draw(ctx, 'b8', x, y);
    bFlash(ctx, 'b8', e);
    const ph = e.ph, core = ph === 1 ? 0.35 : 0.6 + 0.4 * Math.sin(e.t * (ph === 3 ? 16 : 9));
    glowDot(ctx, x, y + 6, ph === 1 ? 22 : 40, ph === 3 ? `rgba(255,60,60,${core})` : ph === 2 ? `rgba(255,150,60,${core})` : 'rgba(140,180,255,.4)');
    glowDot(ctx, x, y + 6, 14, `rgba(255,255,255,${core})`);
    for (const s of [-1, 1]) glowDot(ctx, x + s * 90, y - 10, 9, ph === 1 ? 'rgba(255,80,80,.8)' : 'rgba(255,80,80,.3)');
  },
};
ET.boss8.onDeath = e => bossDown(e);
SPR.b8 = { w: 340, h: 190, draw(g) { P_(g, [0, 90, 170, -10, 150, -60, 40, -80, -40, -80, -150, -60, -170, -10], '#2a3048'); circ(g, 0, 6, 30, '#506090'); } };

// ================= 3D 模型 =================
Object.assign(EXTRA_MODELS, {
  rockL(K) { const geo = new K.T.IcosahedronGeometry(17, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const f = 0.8 + hash(Math.round(p.getX(i) * 9), Math.round(p.getZ(i) * 9), 820) * 0.38; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.7, p.getZ(i) * f); } geo.computeVertexNormals(); K.add(geo, K.M(0x7a6e62, { m: 0.15, r: 0.85, cc: 0, flat: true, panel: false })); K.sph(3, 1.5, 3, 5, 9, -4, K.M(0x5a5048, { m: 0.1, r: 0.9, panel: false })); },
  rockS(K) { const geo = new K.T.IcosahedronGeometry(8.5, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const f = 0.78 + hash(Math.round(p.getX(i) * 9), Math.round(p.getZ(i) * 9), 821) * 0.4; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.7, p.getZ(i) * f); } geo.computeVertexNormals(); K.add(geo, K.M(0x8a7e70, { m: 0.15, r: 0.85, cc: 0, flat: true, panel: false })); },
  b8(K) {
    const H = K.M(0x2c3450, { m: 0.85, r: 0.3, cc: 0.8 }), H2 = K.M(0x4a5680, { m: 0.8, r: 0.3, cc: 0.8 }), DK = K.M(0x141a2a, { m: 0.9, r: 0.35 }), GD = K.M(0xc8a040, { m: 0.9, r: 0.25, cc: 1 });
    const CY = K.G(0x6fd0ff, 2.4), RD = K.G(0xff3040, 2.8);
    K.ext([0, 92, 170, -6, 156, -58, 40, -82, -40, -82, -156, -58, -170, -6], 10, H, 0, 2.5);
    K.ext([0, 64, 120, -8, 108, -46, 30, -64, -30, -64, -108, -46, -120, -8], 5, H2, 10, 1.4);
    for (const ex of [-110, -50, 50, 110]) { K.rbox(22, 22, 8, ex, -68, 4, DK, 1.4); K.cyl(8, 8, 1, ex, 9, -80, K.G(0x8ac8ff, 3.2)); }
    for (const s of [-1, 1]) {
      K.latheV([[0.01, 0], [30, 0], [28, 4], [20, 9], [0.01, 10]], H2, s * 90, 10, -10);
      K.cylV(14, 14, 1, s * 90, 20, -10, DK);
      K.rbox(16, 34, 6, s * 140, -20, 8, DK, 1.2);
      K.bar(s * 132, -36, s * 132, -4, 14.4, 1.2, 0.5, CY);
      for (let k = 0; k < 3; k++) K.rbox(10, 7, 1.4, s * (46 + k * 14), 28 - k * 10, 15, DK, 0.3);
    }
    K.torus(34, 3, 0, 15.6, 6, GD);
    K.cylV(30, 30, 1, 0, 15, 6, K.glass(0x200a1a, 0x401030));
    K.barM(20, 70, 140, -2, 10.4, 1, 0.4, CY);
    K.barM(30, -60, 150, -40, 10.4, 1, 0.4, CY);
    for (const s of [-1, 1]) K.sph(2.4, 1.4, 2.4, s * 166, 9, -12, RD);
    K.rbox(6, 28, 4, 0, 74, 13, GD, 1);
  },
});
EXTRA_BAKES.push(
  ['rockL', 44, 44, EXTRA_MODELS.rockL],
  ['rockS', 24, 24, EXTRA_MODELS.rockS],
  ['b8', 344, 190, EXTRA_MODELS.b8, { glow: 0.8 }],
);

// ================= 波次、關卡、音樂 =================
Object.assign(WAVES, {
  rocks: q => { for (let i = 0; i < 5; i++) q(i * 0.6, () => spawn('rock', rnd(40, W - 40), -24)); return 4; },
  stationGuns: q => { for (let i = 0; i < 3; i++) q(i * 0.5, () => { const x = groundX(rnd(40, 320), 'land'); if (x !== null) spawn('turret', x, -24); }); return 2.5; },
});
STAGES.push({ name: '星海決戰', en: 'STARFIELD', boss: 'boss8', speed: 55,
  seq: ['droneW', 'fDown', 'icpt', 'carrierP', 'fSwoopL', 'fSwoopR', 'stationGuns', 'snakeL', 'jetsUp', 'crates', 'mines', 'carrierS', 'heavy', 'stationGuns', 'icpt', 'fDive', 'rocks', 'snakeR', 'carrierP', 'rocks', 'bomber', 'mines', 'carrierB', 'rocks', 'icpt', 'droneW'] });
Object.assign(SONGS, {
  s7: { bpm: 150, key: 45, prog: [[0, 'm'], [-4, 'M'], [-2, 'M'], [-7, 'm'], [0, 'm'], [3, 'M'], [5, 'm'], [7, 'M']], seed: 151, drums: 3 },
});
