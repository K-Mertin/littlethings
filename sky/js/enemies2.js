'use strict';
// 敵人擴充：機械蛇、浮游水雷、側翼突擊機、步行機甲、重裝砲艇（中頭目）、補給箱
// 3D 模型放在 EXTRA_BAKES，bake.js 會一起烘焙；沒有 3D 時用簡單的 2D 圖

// ---------- 2D 備用圖 ----------
SPR.snakeHead = { w: 26, h: 30, draw(g) { circ(g, 0, 0, 11, rad(g, -3, -3, 13, ['#8a909a', '#3a3f48', '#1d2026'])); circ(g, -4, -7, 2, '#ff3040'); circ(g, 4, -7, 2, '#ff3040'); } };
SPR.snakeSeg = { w: 22, h: 22, draw(g) { circ(g, 0, 0, 9, rad(g, -2, -2, 11, ['#7a808a', '#33373f', '#1a1d22'])); circ(g, 0, 0, 9, null, '#ffb02e', 1.2); } };
SPR.mine = { w: 24, h: 24, draw(g) { for (let i = 0; i < 8; i++) { const a = i * TAU / 8; P_(g, [Math.cos(a) * 11, Math.sin(a) * 11, Math.cos(a + 0.25) * 6, Math.sin(a + 0.25) * 6, Math.cos(a - 0.25) * 6, Math.sin(a - 0.25) * 6], '#555'); } circ(g, 0, 0, 7.5, rad(g, -2, -2, 9, ['#9aa', '#445', '#223'])); } };
SPR.icpt = { w: 30, h: 30, draw(g) { P_(g, [0, -14, 12, 10, 4, 6, 0, 12, -4, 6, -12, 10], '#3a3550'); P_(g, [0, -10, 3, 0, -3, 0], '#ff3cac'); } };
SPR.walker = { w: 30, h: 30, draw(g) { rr(g, -11, -10, 22, 20, 5, '#6f7356'); circ(g, 0, 2, 5, '#ff4040'); } };
SPR.walkerLeg = { w: 10, h: 18, draw(g) { rr(g, -3.5, -8, 7, 16, 3, '#3b3d33'); } };
SPR.heavy = { w: 92, h: 84, draw(g) { const o = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; o.push(Math.cos(a) * 40, Math.sin(a) * 36); } P_(g, o, '#3e4656'); circ(g, 0, 0, 13, '#ff7a2a'); } };
SPR.crate = { w: 20, h: 16, draw(g) { rr(g, -9, -7, 18, 14, 2, '#e08a20'); g.fillStyle = '#fff'; g.fillRect(-1.5, -5, 3, 10); g.fillRect(-5, -1.5, 10, 3); } };

// ---------- 3D 模型 ----------
const EXTRA_MODELS = {
  snakeHead(K) {
    const H = K.M(0x3a3f4a, { m: 0.85, r: 0.3 }), AC = K.M(0x8a6a20, { m: 0.7, r: 0.3, cc: 0.8 }), RG = K.G(0xff2d4a, 3), DK = K.M(0x1d2026, { m: 0.9, r: 0.4 });
    K.lathe([[0, -13], [5, -11], [9, -5], [10.5, 2], [9, 8], [5, 11], [0.2, 12]], H, { sy: 0.7, y: 1 });
    for (const s of [-1, 1]) { K.bar(s * 4, -9, s * 6.5, -16, 3, 2.2, 2, AC); K.sph(1.8, 1.2, 1.8, s * 4.2, 6.2, -6.5, RG); K.ext([s * 9, -1, s * 13, 3, s * 11, 8, s * 8, 6].map((v, i) => i % 2 ? v : v), 1.2, DK, 1, 0.3); }
    K.bar(0, -4, 0, 8, 7.2, 3, 0.6, AC);
  },
  snakeSeg(K) {
    const H = K.M(0x353a44, { m: 0.85, r: 0.3 }), AC = K.M(0x8a6a20, { m: 0.7, r: 0.3, cc: 0.8 });
    K.latheV([[0.01, 0], [9, 0], [9, 2], [7, 5], [0.01, 6.2]], H);
    K.torus(7.6, 0.7, 0, 3.4, 0, K.G(0xffb02e, 2.4));
    for (const s of [-1, 1]) K.ext([s * 8, -3, s * 13, 0, s * 8, 3], 1.4, AC, 1.5, 0.3);
    K.sph(2.4, 1.6, 2.4, 0, 6, 0, AC);
  },
  mine(K) {
    const H = K.M(0x4a4f58, { m: 0.9, r: 0.28 }), SP = K.M(0x9aa0a8, { m: 0.9, r: 0.25 });
    K.sph(7.5, 7.5, 7.5, 0, 0, 0, H);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const m = K.add(new K.T.ConeGeometry(1.6, 5, 10), SP, Math.cos(a) * 9, 0, Math.sin(a) * 9); m.rotation.z = -Math.PI / 2; m.rotation.y = -a; }
    K.sph(2.2, 1.4, 2.2, 0, 7.2, 0, SP);
    K.torus(7.7, 0.6, 0, 0.5, 0, K.G(0xff3040, 2.6));
  },
  icpt(K) {
    const H = K.M(0x3a3552, { m: 0.8, r: 0.3, cc: 0.8 }), H2 = K.M(0x221f33, { m: 0.9, r: 0.4 }), MG = K.G(0xff3cac, 2.8), GL = K.glass(0x2a0520, 0x5a0040);
    K.extM([1.5, -6, 13, 9, 12, 12, 4, 8, 1.5, 9], 1.3, H, 0, 0.4);
    K.extM([1.5, -12, 5, -6, 5, -4, 1.5, -6], 0.8, H2, 0.6, 0.3);
    K.lathe([[0, -15], [1.8, -11], [3.2, -3], [3.4, 6], [2.4, 11], [0.2, 12]], H, { sy: 0.8, y: 1.3 });
    K.sph(1.6, 1.5, 3.6, 0, 3.4, -4.5, GL);
    K.barM(2, -5.5, 12.6, 9.5, 1.5, 0.6, 0.3, MG);
    for (const s of [-1, 1]) K.cyl(1.2, 1.2, 0.6, s * 3, 1.3, 11.6, K.G(0xff6ad0, 3));
  },
  walker(K) {
    const AR = K.M(0x70745a, { m: 0.5, r: 0.45, cc: 0.4 }), DK = K.M(0x2a2c28, { m: 0.8, r: 0.5 }), GL = K.glass(0x2a0508, 0x6a0010);
    K.ext([-11, -9, 11, -9, 13, -3, 11, 11, -11, 11, -13, -3], 7, AR, 3, 1.4);
    K.rbox(16, 7, 1.2, 0, -3, 10, DK, 0.3);
    K.bar(-6, 8, 6, 8, 10.4, 2, 1, GL);
    for (const s of [-1, 1]) { K.cyl(2.4, 2.4, 9, s * 14, 7, -2, DK); K.cyl(1, 1, 6, s * 14, 7, 6, DK); }
    K.sph(1.2, 0.8, 1.2, 0, 10.6, 3, K.G(0xff3040, 2.6));
  },
  walkerLeg(K) {
    const DK = K.M(0x3b3d33, { m: 0.75, r: 0.45 }), AR = K.M(0x5c604a, { m: 0.5, r: 0.45 });
    K.rbox(6, 16, 3, 0, 0, 0, DK, 0.8);
    K.rbox(8, 5, 2, 0, 5.5, 2.5, AR, 0.6);
  },
  heavy(K) {
    const H = K.M(0x3e4658, { m: 0.85, r: 0.3, cc: 0.7 }), H2 = K.M(0x5a6478, { m: 0.8, r: 0.32 }), DK = K.M(0x1d222c, { m: 0.9, r: 0.4 });
    const hex = (rx, rz) => { const o = []; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; o.push(Math.cos(a) * rx, Math.sin(a) * rz); } return o; };
    K.ext(hex(42, 38), 6, H, 0, 1.6);
    K.ext(hex(32, 29), 2, H2, 6, 0.8);
    for (const [x, z] of [[-30, -26], [30, -26], [-30, 26], [30, 26]]) { K.cylV(7, 7.5, 5, x, 2, z, DK); K.cylV(4.6, 4.6, 0.6, x, 7, z, K.G(0xff8a2a, 2.6)); }
    K.cylV(15, 16, 2, 0, 8, 0, DK);
    K.torus(19, 0.9, 0, 8.6, 0, K.G(0xff3040, 2.2));
    K.sph(8, 3, 8, 0, 10, 0, K.glass(0x401008, 0xa03010));
  },
  crate(K) {
    const OR = K.M(0xe08a20, { m: 0.2, r: 0.45, cc: 0.6 }), WH = K.M(0xf4f4ee, { m: 0.1, r: 0.4 });
    K.rbox(18, 14, 7, 0, 0, 0, OR, 0.8);
    for (let k = -6; k <= 6; k += 3) K.box(0.6, 0.4, 13, k, 7.1, 0, K.M(0xb06a10, { m: 0.2, r: 0.5 }));
    K.box(3, 0.6, 10, 0, 7.3, 0, WH); K.box(10, 0.6, 3, 0, 7.3, 0, WH);
    K.sph(1, 0.7, 1, 7, 7.4, -5, K.G(0x60ff90, 2.6));
  },
};
const EXTRA_BAKES = [
  ['snakeHead', 26, 30, EXTRA_MODELS.snakeHead],
  ['snakeSeg', 22, 22, EXTRA_MODELS.snakeSeg],
  ['mine', 24, 24, EXTRA_MODELS.mine],
  ['icpt', 30, 30, EXTRA_MODELS.icpt],
  ['walker', 30, 30, EXTRA_MODELS.walker, { rot: Math.PI }],
  ['walkerLeg', 10, 18, EXTRA_MODELS.walkerLeg],
  ['heavy', 92, 84, EXTRA_MODELS.heavy, { glow: 0.9 }],
  ['crate', 20, 16, EXTRA_MODELS.crate],
];

// ---------- 行為 ----------
Object.assign(ET, {
  // 機械蛇：一節一節跟著頭走，整條共用血量，每一節都打得到
  snake: { hp: 30, r: 10, score: 3000,
    init(e, o) { e.dir = o.dir || 1; e.x0 = e.x; e.n = 9; e.hist = []; e.segs = []; e.ang = 0; e.ft = 1.4; },
    update(e, dt) {
      e.vx = 0; e.vy = 0;
      const t = e.t;
      e.x = e.x0 + Math.sin(t * 1.5) * 105 * e.dir;
      e.y = -24 + t * 92 - Math.max(0, Math.sin(t * 0.75)) * 0;
      e.hist.unshift([e.x, e.y]); if (e.hist.length > 400) e.hist.length = 400;
      const segs = [[e.x, e.y, 11, 0]];
      let need = 14, acc = 0, prev = e.hist[0];
      for (let i = 1; i < e.hist.length && segs.length < e.n; i++) {
        const p = e.hist[i]; acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p;
        if (acc >= need) { segs.push([p[0], p[1], 9, 0]); need += 13; }
      }
      const h1 = e.hist[Math.min(3, e.hist.length - 1)];
      for (let i = 0; i < segs.length; i++) {
        const a = segs[i], b = segs[i + 1];
        const dx = b ? a[0] - b[0] : (i ? segs[i - 1][0] - a[0] : a[0] - h1[0]), dy = b ? a[1] - b[1] : (i ? segs[i - 1][1] - a[1] : a[1] - h1[1]);
        a[3] = (dx || dy) ? Math.atan2(dy, dx) + Math.PI / 2 : Math.PI;
      }
      e.segs = segs;
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 1.6; const s = segs[(Math.random() * segs.length) | 0]; if (canShoot({ x: s[0], y: s[1] })) eShot(s[0], s[1], aim(s[0], s[1]), 140); }
      if (e.y > H + 160) e.gone = true;
    },
    shadow(ctx, e) { for (let i = e.segs.length - 1; i >= 0; i--) { const s = e.segs[i]; Art.shadow(ctx, i ? 'snakeSeg' : 'snakeHead', s[0], s[1], s[3]); } },
    draw(ctx, e) {
      for (let i = e.segs.length - 1; i >= 0; i--) {
        const s = e.segs[i], n = i ? 'snakeSeg' : 'snakeHead';
        Art.draw(ctx, n, s[0], s[1], s[3]);
        if (e.flash > 0) Art.draw(ctx, n, s[0], s[1], s[3], 0.45, 1, 1, 'w');
      }
    },
    onDeath(e) {
      e.segs.slice(1).forEach((s, i) => G.queue.push({ t: G.st + 0.07 * (i + 1), fn: () => boom(s[0], s[1], 1) }));
      spawnItem(Math.random() < 0.5 ? 'P' : 'S', e.x, e.y);
    },
  },
  // 浮游水雷：慢慢飄，打爆會炸出一圈子彈（簡單模式不會）
  mine: { hp: 4, r: 10, score: 300, spr: 'mine',
    init(e, o) { e.vy = o.vy || rnd(35, 55); e.vx = o.vx || 0; e.spin = rnd(-1.2, 1.2); },
    update(e, dt) { e.ang += e.spin * dt; e.vx = Math.sin(e.t * 1.7 + e.spin) * 18; },
    draw(ctx, e) {
      spr(ctx, e, 'mine');
      if (Math.floor(e.t * 3) % 2) glowDot(ctx, e.x, e.y, 8, 'rgba(255,50,60,.8)');
    },
    onDeath(e) { if (G.d.dens >= 1 && P.alive && G.phase !== 'down') ring(e.x, e.y, 8, 95, rnd(TAU)); },
  },
  // 側翼突擊機：從左右飛進來，停一下開火，再橫衝出去
  icpt: { hp: 5, r: 11, score: 400, spr: 'icpt',
    init(e, o) { e.dir = o.dir; e.tx = o.tx; e.ang = e.dir * Math.PI / 2; e.st = -1; },
    update(e, dt) {
      if (e.st < 0) { e.vx = (e.tx - e.x) * 3.2 + e.dir * 25; if (Math.abs(e.tx - e.x) < 6) { e.st = 0; e.vx = 0; } }
      else {
        e.st += dt;
        if (e.st < 0.9) { e.vx = 0; e.ang = turnTo(e.ang, aim(e.x, e.y) + Math.PI / 2, 5 * dt); if (!e.fired && e.st > 0.45) { e.fired = true; if (canShoot(e)) fan(e.x, e.y, aim(e.x, e.y), 5, 0.6, 150); } }
        else { e.vx += e.dir * 900 * dt; e.vy = 30; e.ang = turnTo(e.ang, e.dir * Math.PI / 2, 6 * dt); }
      }
    },
    draw(ctx, e) { spr(ctx, e, 'icpt'); if (e.st >= 0.9) glowDot(ctx, e.x - e.dir * 14, e.y, 7, 'rgba(255,100,210,.8)'); },
  },
  // 步行機甲（地面）
  walker: { hp: 16, r: 14, score: 800, ground: true, gs: 'walker', medal: 0.6,
    init(e, o) { e.vy = o.vy ?? 12; e.ft = rnd(0.8, 1.6); e.tur = Math.PI / 2; },
    update(e, dt) {
      e.tur = turnTo(e.tur, aim(e.x, e.y), 2.2 * dt);
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) {
        e.ft = 2.4; if (!canShoot(e)) return;
        for (let k = 0; k < 3; k++) G.queue.push({ t: G.st + k * 0.12, fn: () => { if (!e.dead && canShoot(e)) for (const s of [-1, 1]) eShot(e.x + s * 14, e.y + 4, aim(e.x + s * 14, e.y + 4), 150); } });
      }
    },
    draw(ctx, e) {
      const ph = e.t * 5;
      for (const s of [-1, 1]) { const off = Math.sin(ph + (s > 0 ? Math.PI : 0)) * 5; Art.draw(ctx, 'walkerLeg', e.x + s * 8, e.y + off, 0); }
      spr(ctx, e, 'walker', 0);
    },
  },
  // 重裝砲艇（中頭目）：四個旋轉砲塔打螺旋，中間核心會發光
  heavy: { hp: 120, r: 32, score: 8000, big: 1, hb: [[0, 0, 32]], drop: ['P', 'S'],
    init(e) { e.vy = 70; e.ring = 0; e.ft = 1.2; e.tb = 2.5; e.tur = [0, 0, 0, 0].map(() => Math.PI / 2); },
    update(e, dt) {
      e.ring += dt * 0.9;
      e.tur = e.tur.map((a, i) => turnTo(a, aim(e.x + Math.cos(e.ring + i * Math.PI / 2) * 30, e.y + Math.sin(e.ring + i * Math.PI / 2) * 27), 3 * dt));
      if (e.st === undefined) { e.vy = Math.max(12, (125 - e.y) * 1.4); if (e.y >= 122) { e.st = 0; e.x0 = e.x; } return; }
      e.st += dt; e.vy = e.st > 17 ? -70 : 0;
      e.x = e.x0 + Math.sin(e.st * 0.5) * 60;
      if (!canShoot(e) || e.st > 17) return;
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 0.32; e.k = ((e.k || 0) + 1) % 4; const a = e.ring + e.k * Math.PI / 2, px = e.x + Math.cos(a) * 30, py = e.y + Math.sin(a) * 27; eShot(px, py, a, 115); eShot(px, py, a + Math.PI / 2, 115); }
      e.tb -= dt * G.d.fr;
      if (e.tb <= 0) { e.tb = 3; fan(e.x, e.y + 12, aim(e.x, e.y), 5, 0.7, 150, 'b'); }
    },
    shadow(ctx, e) { Art.shadow(ctx, 'heavy', e.x, e.y, 0); },
    draw(ctx, e) {
      spr(ctx, e, 'heavy', 0);
      for (let i = 0; i < 4; i++) { const a = e.ring + i * Math.PI / 2; Art.draw(ctx, 'gunTur', e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 27, e.tur[i] - Math.PI / 2, 1, 0.95, 0.95); }
      glowDot(ctx, e.x, e.y, 14 + Math.sin(e.t * 6) * 3, 'rgba(255,120,60,.7)');
    },
  },
  // 補給箱（地面）：打開會掉好東西
  crate: { hp: 3, r: 10, score: 100, ground: true, gs: 'crate',
    init() { },
    update() { },
    draw(ctx, e) { spr(ctx, e, 'crate', 0); },
    onDeath(e) {
      const r = Math.random();
      if (r < 0.28) spawnItem('P', e.x, e.y);
      else if (r < 0.48) spawnItem('S', e.x, e.y);
      else if (r < 0.62) spawnItem('B', e.x, e.y);
      else if (r < 0.66 && G.lives < 5) spawnItem('1up', e.x, e.y);
      else for (let i = 0; i < 3; i++) spawnItem('medal', e.x + (i - 1) * 14, e.y);
      popText(e.x, e.y - 14, '補給！', '#7dffb0');
    },
  },
});

// ---------- 新波次 ----------
Object.assign(WAVES, {
  snakeL: q => { q(0, () => spawn('snake', 120, -24, { dir: 1 })); return 5; },
  snakeR: q => { q(0, () => spawn('snake', 240, -24, { dir: -1 })); return 5; },
  mines: q => { for (let i = 0; i < 6; i++) q(i * 0.45, () => spawn('mine', rnd(40, W - 40), -16)); return 4; },
  icpt: q => {
    q(0, () => spawn('icpt', -20, rnd(110, 160), { dir: 1, tx: rnd(70, 130) }));
    q(0.6, () => spawn('icpt', W + 20, rnd(170, 230), { dir: -1, tx: rnd(230, 290) }));
    q(1.4, () => spawn('icpt', -20, rnd(220, 260), { dir: 1, tx: rnd(110, 170) }));
    return 3.6;
  },
  walkers: q => {
    for (let i = 0; i < 2; i++) q(i * 0.8, () => { const x = groundX(i ? rnd(200, 300) : rnd(60, 160), 'land'); if (x !== null) spawn('walker', x, -30); });
    return 3.4;
  },
  heavy: q => { q(0, () => spawn('heavy', 180, -60)); return 9; },
  crates: q => {
    for (let i = 0; i < 3; i++) q(i * 0.4, () => { const x = groundX(rnd(50, 310), 'land'); if (x !== null) spawn('crate', x, -24); });
    return 1.6;
  },
});

// 每關重新排波次：加入新敵人，讓每關的節奏不一樣
STAGES[0].seq = ['droneL', 'droneR', 'tanks3', 'carrierP', 'fDown', 'crates', 'chop2', 'droneW', 'fSwoopL', 'fSwoopR', 'boats', 'snakeL', 'carrierS', 'tanks3', 'fDive', 'trucks', 'icpt', 'chop3', 'carrierP', 'bomber', 'crates', 'droneL', 'fSine', 'tanks3', 'carrierB', 'fDown', 'droneW'];
STAGES[1].seq = ['fDown', 'boats', 'mines', 'carrierP', 'cruiser', 'fSwoopL', 'fSwoopR', 'icpt', 'chop2', 'boats', 'snakeR', 'carrierS', 'mines', 'droneW', 'fDive', 'cruiser', 'chop3', 'carrierP', 'bomber', 'fSine', 'mines', 'boats', 'carrierB', 'icpt', 'fDown', 'droneW', 'chop2'];
STAGES[2].seq = ['droneW', 'tanks3', 'fDown', 'carrierP', 'jetsUp', 'crates', 'chop2', 'trucks', 'icpt', 'fSwoopL', 'fSwoopR', 'walkers', 'tanks3', 'carrierS', 'snakeL', 'chop3', 'jetsUp', 'fDive', 'heavy', 'carrierP', 'crates', 'fSine', 'icpt', 'tanks3', 'droneW', 'carrierB', 'jetsUp', 'chop3', 'fDown'];
STAGES[3].seq = ['fDown', 'tanks3', 'walkers', 'chop2', 'carrierP', 'crates', 'fSwoopL', 'fSwoopR', 'tanks3', 'jetsUp', 'snakeR', 'bomber', 'carrierS', 'walkers', 'droneW', 'icpt', 'fDive', 'tanks3', 'chop3', 'crates', 'carrierP', 'heavy', 'fSine', 'jetsUp', 'walkers', 'carrierB', 'fDown', 'chop3'];
STAGES[4].seq = ['droneW', 'fDown', 'fSwoopL', 'fSwoopR', 'carrierP', 'icpt', 'chop3', 'mines', 'jetsUp', 'snakeL', 'fDive', 'bomber', 'carrierS', 'droneW', 'icpt', 'fSine', 'mines', 'fDown', 'snakeR', 'chop3', 'carrierP', 'jetsUp', 'heavy', 'fSwoopL', 'fSwoopR', 'carrierB', 'fDive', 'droneW'];
