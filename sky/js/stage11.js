'use strict';
// 第 11 關「極光高空」：夜晚的月光雲海 → 雷暴雲層（閃電）→ 極地冰海上空，天上有會飄動的極光
// 新敵人：幽靈飛翼（隱形，現身才打得到）、離子浮游砲（三顆繞圈）；中頭目「空中戰艦」；頭目「極光鳳凰」（會俯衝）

// ================= 地形 =================
const Z11 = v => { const d = -v; const storm = smooth(1200, 1600, d) * (1 - smooth(2800, 3200, d)); return { moon: 1 - smooth(1200, 1600, d), storm, ice: smooth(2800, 3200, d) }; };
const cN11 = (x, v) => fbm(x * 0.005, v * 0.005 + 7, 1101) * 0.8 + vnoise(x * 0.028, v * 0.028, 1102) * 0.2;
const cH11 = (x, v) => { const z = Z11(v); const cov = 0.6 - z.storm * 0.12 + z.ice * 0.1; return Math.max(0, cN11(x, v) - cov) * (130 + z.storm * 120); };
const floe11 = (x, v) => smooth(0.5, 0.53, fbm(x * 0.012, v * 0.012, 1103));
const H11 = (x, v) => { const c = cH11(x, v); return c > 0 ? c * 0.6 : floe11(x, v) * 3 * Z11(v).ice + vnoise(x * 0.06, v * 0.09, 1104) * 0.8; };
const C11 = (x, v) => {
  const z = Z11(v), c = cH11(x, v);
  let sea = mixC([8, 16, 38], [14, 26, 52], fbm(x * 0.006, v * 0.006, 1105));
  const fl = floe11(x, v) * z.ice;
  sea = mixC(sea, mixC([70, 96, 130], [120, 150, 180], vnoise(x * 0.04, v * 0.04, 1106)), fl);
  const band = Math.max(0, Math.sin(x * 0.012 + v * 0.004) * Math.sin(v * 0.0021 + x * 0.002));
  sea = mixC(sea, [40, 190, 120], band * 0.25 * (0.4 + z.ice));
  if (c <= 0) return sea;
  const top = mixC(mixC([62, 72, 108], [138, 150, 188], clamp(c / 22, 0, 1)), [56, 60, 82], z.storm * 0.55);
  const aur = Math.max(0, Math.sin(x * 0.01 + v * 0.003 + 1)) * 0.16;
  return mixC(sea, mixC(top, [120, 230, 170], aur * (1 - z.storm * 0.6)), smooth(0, 10, c));
};
PAINT.push({ H: H11, C: C11, k: 1.1, d: (g, v0, v1, sp) => {
  // 冰海：浮冰裂縫、極地基地燈光
  cells(60, 60, v0, v1, 10, (i, j, x, v) => {
    const z = Z11(v + 30); if (z.ice < 0.4 || hash(i, j, 1110) < 0.5) return;
    const cx = x + hash(i, j, 1111) * 60, cv = v + hash(i, j, 1112) * 60;
    if (cH11(cx, cv) > 0 || floe11(cx, cv) < 0.5) return;
    g.strokeStyle = 'rgba(20,40,70,.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(cx, cv);
    for (let k = 0; k < 4; k++) g.lineTo(cx + (hash(k, i, j) - 0.5) * 40, cv + (hash(j, k, i) - 0.5) * 30); g.stroke();
  });
  cells(150, 260, v0, v1, 40, (i, j, x, v) => {
    const cx = x + 30 + hash(i, j, 1113) * 90, cv = v + 40 + hash(i, j, 1114) * 180;
    if (Z11(cv).ice < 0.5 || cH11(cx, cv) > 0 || floe11(cx, cv) < 0.6 || cx < 40 || cx > W - 40) return;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(cx - 22, cv - 16, 50, 38);
    g.fillStyle = '#4a5468'; g.fillRect(cx - 24, cv - 18, 48, 36);
    g.strokeStyle = '#e0b030'; g.lineWidth = 1; g.setLineDash([3, 3]); g.strokeRect(cx - 24, cv - 18, 48, 36); g.setLineDash([]);
    dome(g, cx - 10, cv - 4, 8); dish(g, cx + 12, cv + 6, 7, hash(i, j, 1115) * TAU);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 8; k++) glowDotT(g, cx - 22 + k * 6.3, cv + 22, 3, k % 2 ? 'rgba(255,210,120,.9)' : 'rgba(120,220,255,.9)');
    glowDotT(g, cx, cv, 30, 'rgba(255,200,120,.18)');
    g.restore();
    if (cv >= v0 && cv < v1 && j < -3) sp.push({ type: 'turret', x: cx + 12, v: cv + 6 });
  });
  // 雲頂的月光邊與雷暴的閃光雲
  g.save(); g.globalCompositeOperation = 'lighter';
  cells(40, 40, v0, v1, 20, (i, j, x, v) => {
    const cx = x + hash(i, j, 1116) * 40, cv = v + hash(i, j, 1117) * 40, z = Z11(cv);
    const c = cH11(cx, cv);
    if (c <= 2) return;
    if (z.storm > 0.4 && hash(i, j, 1118) > 0.8) glowDotT(g, cx, cv, 24 + hash(i, j, 1119) * 20, 'rgba(160,170,255,.22)');
    else if (hash(i, j, 1120) > 0.7) glowDotT(g, cx - 4, cv - 4, 10, 'rgba(220,235,255,.18)');
  });
  g.restore();
  // 雲海下的城市燈光（起點）
  cells(24, 24, v0, v1, 0, (i, j, x, v) => {
    if (Z11(v).moon < 0.5 || cH11(x, v) > 0 || hash(i, j, 1121) < 0.82) return;
    g.fillStyle = hash(i, j, 1122) > 0.5 ? 'rgba(255,200,110,.75)' : 'rgba(150,200,255,.6)';
    g.fillRect(x + hash(i, j, 1123) * 20, v + hash(j, i, 1123) * 20, 1.4, 1.4);
  });
} });
WATER.push((x, v) => !(Z11(v).ice > 0.5 && floe11(x, v) > 0.6 && cH11(x, v) <= 0));
ROADX.push(null);

// ================= 環境：極光、快速雲絮、閃電 =================
AMB2.aurora = {
  update(dt) {
    const A = G.amb, z = Z11(-G.scroll - H / 2);
    while (A.filter(p => p.k === 'w').length < 5) A.push({ k: 'w', x: rnd(-40, W + 40), y: rnd(-300, -80) + (A.length ? 0 : rnd(0, H)), r: rnd(30, 70), seed: (Math.random() * 999) | 0, sp: rnd(2, 2.8) });
    for (const p of A) if (p.k === 'w') { p.y += G.speed * p.sp * dt; if (p.y > H + 100) p.dead = true; }
    G.amb = A.filter(p => !p.dead);
    this.flash = Math.max(0, (this.flash || 0) - dt * 3);
    if (z.storm > 0.5 && Math.random() < dt * 0.35) { this.flash = 1; this.bolt = { x: rnd(40, W - 40), seed: Math.random() * 999 }; if (Snd.ctx) Snd.noise(1.2, 0.18, 400, 60); }
  },
  under(ctx) {
    const z = Z11(-G.scroll - H / 2), k = 0.8 - z.storm * 0.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let c = 0; c < 3; c++) {
      const base = 90 + c * 170 + Math.sin(G.t * 0.2 + c) * 40, cols = c === 1 ? ['rgba(190,90,255,', 'rgba(80,255,170,'] : ['rgba(60,255,160,', 'rgba(120,140,255,'];
      for (let x = -10; x < W + 10; x += 5) {
        const y = base + Math.sin(x * 0.018 + G.t * 0.6 + c * 2) * 26 + Math.sin(x * 0.05 - G.t * 1.3) * 7;
        const h = 60 + Math.sin(x * 0.03 + G.t * 0.9 + c) * 30;
        const a = (0.07 + 0.05 * Math.sin(x * 0.07 + G.t * 2 + c)) * k;
        const gr = ctx.createLinearGradient(0, y - h, 0, y + 6);
        gr.addColorStop(0, cols[0] + '0)'); gr.addColorStop(0.7, cols[0] + a + ')'); gr.addColorStop(1, cols[1] + a * 1.6 + ')');
        ctx.fillStyle = gr; ctx.fillRect(x, y - h, 5.5, h + 6);
      }
    }
    ctx.restore();
    for (const p of G.amb) if (p.k === 'w') {
      ctx.save(); ctx.globalAlpha = 0.28;
      for (let i = 0; i < 6; i++) { const a = hash(i, p.seed, 61) * TAU, d = hash(p.seed, i, 62) * p.r * 0.8; ctx.fillStyle = z.storm > 0.5 ? '#3a4058' : '#8a98c0'; ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * d * 1.6, p.y + Math.sin(a) * d * 0.5, p.r * 0.6, p.r * 0.3, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  },
  draw(ctx) {
    if (this.flash > 0) {
      if (this.bolt && this.flash > 0.6) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        const pts = [[this.bolt.x, -10]]; let x = this.bolt.x;
        for (let y = 30; y < H * 0.7; y += 30) { x += (hash(y, 1, this.bolt.seed) - 0.5) * 50; pts.push([x, y]); }
        for (const [w, c] of [[9, 'rgba(140,150,255,.3)'], [3, 'rgba(200,210,255,.8)'], [1.2, 'rgba(255,255,255,1)']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
        ctx.restore();
      }
      ctx.fillStyle = `rgba(200,210,255,${this.flash * 0.22})`; ctx.fillRect(0, 0, W, H);
    }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,20,0)'); vg.addColorStop(1, 'rgba(0,0,20,.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },
};

// ================= 敵人 =================
SPR.stealth = { w: 54, h: 30, draw(g) { P_(g, [0, 13, 26, -6, 20, -10, 6, -4, 0, -12, -6, -4, -20, -10, -26, -6], '#22283a'); } };
SPR.orb = { w: 20, h: 20, draw(g) { circ(g, 0, 0, 8, '#3a4258'); circ(g, 0, 0, 4, '#a0f0ff'); } };
SPR.airship = { w: 110, h: 230, draw(g) { rr(g, -34, -110, 68, 220, 34, '#4a5262'); rr(g, -14, -30, 28, 70, 6, '#2a303c'); } };
Object.assign(ET, {
  stealth: { hp: 9, r: 13, score: 700, spr: 'stealth', hb: [[0, 0, 12], [-15, -4, 9], [15, -4, 9]],
    init(e, o) { e.vy = 140; e.stop = o.stop || rnd(120, 220); e.cl = 1; e.inv = true; },
    update(e, dt) {
      if (e.st === undefined) { e.vy = Math.max(30, (e.stop - e.y) * 2.4); if (e.y >= e.stop - 3) { e.st = 0; e.vy = 0; } }
      else {
        e.st += dt;
        if (e.st < 2.8) { e.cl = Math.max(0, e.cl - dt * 2.5); if (!e.fired && e.st > 0.7) { e.fired = true; if (canShoot(e)) fan(e.x, e.y + 8, aim(e.x, e.y), 5, 0.7, 150); } if (!e.f2 && e.st > 1.8) { e.f2 = true; if (canShoot(e) && G.d.dens >= 1) fan(e.x, e.y + 8, aim(e.x, e.y), 4, 0.5, 170); } }
        else { e.cl = Math.min(1, e.cl + dt * 2); e.vy = -60 - (e.st - 2.8) * 200; }
      }
      e.inv = e.cl > 0.5;
    },
    shadow(ctx, e) { if (e.cl < 0.5) Art.shadow(ctx, 'stealth', e.x, e.y, 0); },
    draw(ctx, e) {
      if (e.cl > 0.02) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(160,220,255,${0.35 * e.cl})`; ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) { const o = Math.sin(G.t * 9 + k * 2) * 2; ctx.beginPath(); ctx.moveTo(e.x - 26, e.y - 6 + o + k * 3); ctx.lineTo(e.x, e.y + 12 + o); ctx.lineTo(e.x + 26, e.y - 6 + o + k * 3); ctx.stroke(); }
        ctx.restore();
      }
      Art.draw(ctx, 'stealth', e.x, e.y, 0, 1 - e.cl * 0.88);
      if (e.flash > 0) Art.draw(ctx, 'stealth', e.x, e.y, 0, 0.5, 1, 1, 'w');
      if (e.cl < 0.5) for (const s of [-1, 1]) glowDot(ctx, e.x + s * 18, e.y - 6, 5, 'rgba(160,120,255,.8)');
    },
  },
  orb: { hp: 3, r: 9, score: 200, spr: 'orb',
    init(e, o) { e.cx = o.cx; e.k = o.k; e.vyc = o.vy || 60; e.cy = e.y; e.ft = 1 + e.k * 0.5; },
    update(e, dt) {
      e.cy += e.vyc * dt; const a = e.t * 2.2 + e.k * TAU / 3;
      e.cx += Math.sin(e.t * 0.9) * 30 * dt;
      e.x = e.cx + Math.cos(a) * 26; e.y = e.cy + Math.sin(a) * 26;
      e.ft -= dt * G.d.fr; if (e.ft <= 0) { e.ft = 2.2; if (canShoot(e)) eShot(e.x, e.y, aim(e.x, e.y), 150, 'c'); }
    },
    draw(ctx, e) { glowDot(ctx, e.x, e.y, 14, 'rgba(120,230,255,.45)'); spr(ctx, e, 'orb', e.t * 3); },
  },
  airship: { hp: 450, r: 34, score: 12000, big: 1, drop: ['P', 'S'], hb: [[0, -70, 26], [0, -20, 32], [0, 30, 32], [0, 80, 24]],
    guns: [[-30, -50], [30, -50], [-30, 40], [30, 40]],
    init(e) { e.vy = 50; e.tur = [0, 0, 0, 0].map(() => Math.PI / 2); e.gi = 0; e.ft = 1; e.tb = 2.5; e.tc = 4; },
    update(e, dt) {
      const Gs = ET.airship.guns;
      e.tur = e.tur.map((a, i) => turnTo(a, aim(e.x + Gs[i][0], e.y + Gs[i][1]), 2.2 * dt));
      if (e.st === undefined) { e.vy = Math.max(12, (170 - e.y) * 1.1); if (e.y >= 166) { e.st = 0; e.x0 = e.x; e.vy = 0; } return; }
      e.st += dt; e.vy = e.st > 18 ? 60 : 0;
      e.x = e.x0 + Math.sin(e.st * 0.35) * 70;
      if (!canShoot(e) || e.st > 18) return;
      const f = dt * G.d.fr;
      e.ft -= f; if (e.ft <= 0) { e.ft = 0.45; e.gi = (e.gi + 1) % 4; const [ox, oy] = Gs[e.gi]; fan(e.x + ox, e.y + oy, e.tur[e.gi], 3, 0.3, 150); }
      e.tb -= f; if (e.tb <= 0) { e.tb = 3.2; for (const s of [-1, 1]) for (let k = 0; k < 5; k++) eShot2(e.x + s * 34, e.y - 60 + k * 30, s > 0 ? 0.25 : Math.PI - 0.25, 90, 'b', { av: s * 0.5 }); Snd.play('eshot'); }
      e.tc -= f; if (e.tc <= 0) { e.tc = 4.5; for (let k = 0; k < 4; k++) eShot(e.x + (k % 2 ? 12 : -12), e.y + 90, Math.PI / 2 + (k - 1.5) * 0.3, 110, 'm'); Snd.play('missile'); }
    },
    shadow(ctx, e) { Art.shadow(ctx, 'airship', e.x, e.y, 0, 0.9); },
    draw(ctx, e) {
      for (const s of [-1, 1]) rotor(ctx, e.x + s * 42, e.y - 100, 16, e.t * (s), 3);
      spr(ctx, e, 'airship', 0);
      ET.airship.guns.forEach(([ox, oy], i) => Art.draw(ctx, 'gunTur', e.x + ox, e.y + oy, e.tur[i] - Math.PI / 2, 1, 1.1, 1.1));
      if (Math.floor(e.t * 3) % 2) for (const s of [-1, 1]) glowDot(ctx, e.x + s * 34, e.y + 104, 6, s < 0 ? 'rgba(255,60,60,.9)' : 'rgba(60,255,120,.9)');
    },
  },
});

// ================= 頭目 11：極光鳳凰 =================
SPR.p11body = { w: 70, h: 150, draw(g) { P_(g, [0, 72, 18, 20, 16, -40, 0, -70, -16, -40, -18, 20], '#c8d8f0'); } };
SPR.p11wing = { w: 160, h: 120, draw(g) { P_(g, [-80, 0, -10, -40, 76, -56, 60, 10, 20, 50, -60, 20], '#a8c0e0'); } };
ET.boss11 = { name: '極光鳳凰', en: 'AURORA PHOENIX', hp: 4400, r: 34, score: 450000, boss: true, layer: 'air', hb: [[0, 4, 30], [0, 44, 16], [-66, -16, 20], [66, -16, 20]], marks: [0.66, 0.33],
  init(e) { bossBase(e); e.y = -170; e.ph = 1; e.flap = 0; e.wi = 0; e.dive = null; e.td = 5; e.trail = []; },
  update(e, dt) {
    e.flap += dt * (e.dive ? 9 : e.ph === 3 ? 5 : 3.2);
    e.trail.unshift([e.x, e.y]); if (e.trail.length > 24) e.trail.length = 24;
    if (bossEnter(e, dt, 140, 70)) return;
    e.mt += dt;
    const f0 = e.hp / e.maxhp, ph = f0 > 0.66 ? 1 : f0 > 0.33 ? 2 : 3;
    if (ph !== e.ph) {
      e.ph = ph; G.shake = 10; G.eb.length = 0;
      for (let i = 0; i < 6; i++) G.queue.push({ t: G.st + i * 0.12, fn: () => boom(e.x + rnd(-90, 90), e.y + rnd(-40, 40), 1.4) });
      popText(e.x, e.y + 70, ph === 2 ? '極光羽翼展開！' : '鳳凰浴火！', '#7dffc8');
    }
    // 俯衝
    if (e.dive) {
      const D = e.dive; D.t += dt;
      if (D.t < 0.85) { e.x = lerp(e.x, D.x, dt * 4); e.y = 140 + Math.sin(D.t * 20) * 2 - D.t * 30; }
      else if (D.t < 1.55) { const u = (D.t - 0.85) / 0.7; e.y = lerp(110, D.ty, u * u); if (Math.random() < 0.6 && canShoot({ x: e.x, y: 100 })) eShot2(e.x + rnd(-20, 20), e.y - 20, -Math.PI / 2 + rnd(-1.2, 1.2), 40, 'c', { acc: 60, vmax: 140 }); }
      else if (D.t < 2.6) { const u = (D.t - 1.55) / 1.05; e.y = lerp(D.ty, 140, 1 - (1 - u) * (1 - u)); }
      else { e.dive = null; e.mt = Math.asin(clamp((e.x - 180) / 60, -1, 1)) / 0.45; }
      return;
    }
    e.x = 180 + Math.sin(e.mt * 0.45) * 60; e.y = 140 + Math.sin(e.mt * 1.1) * 12;
    if (Math.random() < 0.08) fxP({ k: 'k', x: e.x + rnd(-80, 80), y: e.y + rnd(-20, 20), vx: rnd(-30, 30), vy: -80, life: 0, max: 0.6, c: 'g' });
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    // 羽毛彈：從翅膀尖射出弧線
    e.ta -= f;
    if (e.ta <= 0) {
      e.ta = ph === 1 ? 1.0 : ph === 2 ? 1.5 : 1.8; e.wi ^= 1;
      const s = e.wi ? 1 : -1, wx = e.x + s * 86, wy = e.y - 20, n = ph === 1 ? 6 : 4;
      for (let k = 0; k < n; k++) eShot2(wx, wy, Math.PI / 2 - s * (0.3 + k * 0.18), 120, 'c', { av: s * 0.7 });
      Snd.play('eshot');
    }
    e.tb -= f;
    if (e.tb <= 0) { e.tb = 2.1; fan(e.x, e.y + 50, aim(e.x, e.y + 50), ph === 1 ? 3 : 5, 0.4, 175); }
    if (ph === 2) {
      e.tc -= f;
      if (e.tc <= 0) {
        e.tc = 5.5;
        if (G.d.beams) { const xs = [60, 180, 300]; xs.forEach((bx, i) => G.beams.push({ x: bx, y: e.y + 30, w: 18, t: -i * 0.25, warn: 1.1, life: 2.6, col: 'g', vx: (i - 1 || 1) * 60 })); Snd.play('warn'); }
        else ring(e.x, e.y, 14, 90, e.mt, 'b');
      }
      e.td -= f; if (e.td <= 0) { e.td = 2.4; for (let k = 0; k < 3; k++) { const b = eShot2(e.x, e.y + 30, aim(e.x, e.y) + (k - 1) * 0.5, 120, 'b'); if (b) b.split = 0.8; } }
    }
    if (ph === 3) {
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.12; e.sa += 0.5; for (const s of [-1, 1]) eShot2(e.x, e.y + 20, e.sa * s + Math.PI / 2, 105, 's', { av: s * 0.6 }); }
      e.td -= f;
      if (e.td <= 0 && G.d.beams) { e.td = 4.6; e.dive = { t: 0, x: clamp(P.x, 70, W - 70), ty: clamp(P.y - 70, 260, 470) }; Snd.play('warn'); popText(clamp(P.x, 70, W - 70), 230, '俯衝！', '#ff8a6a'); }
      else if (e.td <= 0) { e.td = 3; ring(e.x, e.y, 16, 95, e.mt); }
    }
  },
  shadow(ctx, e) { ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x + 16, e.y + 40, 120, 30, 0, 0, TAU); ctx.fill(); ctx.restore(); },
  draw(ctx, e) {
    const x = e.x, y = e.y, ph = e.ph || 1;
    // 極光尾羽
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const u = i / 15, px = x + (k - 2) * 8 + Math.sin(G.t * 3 + i * 0.5 + k) * (4 + i * 1.6) * (k - 2 || 0.5), py = y - 60 - i * 9; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.strokeStyle = k % 2 ? `rgba(180,90,255,${ph === 3 ? 0.45 : 0.3})` : `rgba(70,255,170,${ph === 3 ? 0.45 : 0.32})`; ctx.lineWidth = 7 - Math.abs(k - 2); ctx.stroke();
    }
    ctx.restore();
    if (e.dive && e.dive.t < 0.85) glowDot(ctx, x, y, 70, `rgba(255,90,60,${0.3 + 0.3 * Math.sin(e.dive.t * 30)})`);
    // 翅膀（拍動）
    const fl = Math.sin(e.flap), fold = e.dive && e.dive.t > 0.6 && e.dive.t < 1.8 ? 0.55 : 1;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(x + s * 16, y - 10); ctx.rotate(s * (-0.12 + fl * 0.14)); ctx.scale(s * fold, 0.85 + fl * 0.18);
      Art.draw(ctx, 'p11wing', 74, -6);
      if (e.flash > 0) Art.draw(ctx, 'p11wing', 74, -6, 0, 0.35, 1, 1, 'w');
      ctx.restore();
      glowDot(ctx, x + s * 86 * fold, y - 20, 10 + fl * 3, ph === 3 ? 'rgba(255,140,80,.8)' : 'rgba(120,255,200,.8)');
    }
    Art.draw(ctx, 'p11body', x, y);
    bFlash(ctx, 'p11body', e);
    const pulse = 0.5 + 0.5 * Math.sin(e.t * (ph === 3 ? 12 : 5));
    glowDot(ctx, x, y + 2, 26, ph === 3 ? `rgba(255,120,60,${0.4 + pulse * 0.4})` : `rgba(90,255,190,${0.3 + pulse * 0.35})`);
    glowDot(ctx, x, y + 2, 9, `rgba(255,255,255,${0.6 + pulse * 0.4})`);
    for (const s of [-1, 1]) glowDot(ctx, x + s * 6, y + 52, 4, ph === 3 ? 'rgba(255,60,60,1)' : 'rgba(255,230,120,1)');
  },
};
ET.boss11.onDeath = e => bossDown(e);

// ================= 3D 模型 =================
Object.assign(EXTRA_MODELS, {
  stealth(K) {
    const H = K.M(0x1c2232, { m: 0.85, r: 0.3, cc: 1 }), H2 = K.M(0x2e3650, { m: 0.8, r: 0.3, cc: 1 }), PU = K.G(0xa070ff, 2.6);
    K.ext([0, -14, 27, 5, 24, 9, 14, 6, 8, 10, 0, 6, -8, 10, -14, 6, -24, 9, -27, 5], 2.4, H, 0, 0.8);
    K.ext([0, -10, 14, 0, 0, 2, -14, 0], 1, H2, 2.4, 0.3);
    K.barM(4, -8, 24, 5, 2.6, 0.6, 0.3, PU);
    K.sph(2.6, 1.4, 4, 0, 3, -5, K.glass(0x1a0a40, 0x3a1a90));
  },
  orb(K) {
    const ST = K.M(0x3a4258, { m: 0.85, r: 0.3, cc: 0.8 });
    K.sph(7, 5, 7, 0, 0, 0, ST);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; K.bar(Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * 9.5, Math.sin(a) * 9.5, 0, 1.6, 1.6, ST); }
    K.sph(3.6, 3, 3.6, 0, 3.4, 0, K.G(0x90f0ff, 3));
  },
  airship(K) {
    const EN = K.M(0x4a5468, { m: 0.6, r: 0.35, cc: 0.8 }), EN2 = K.M(0x6a7690, { m: 0.6, r: 0.35, cc: 0.8 }), DK = K.M(0x1a1e28, { m: 0.9, r: 0.4 }), RD = K.M(0x8a2a2a, { m: 0.3, r: 0.5, panel: false });
    K.lathe([[0, -112], [16, -104], [30, -80], [36, -40], [36, 40], [30, 82], [16, 104], [0.2, 112]], EN, { sy: 0.75, y: 6 });
    for (let k = -3; k <= 3; k++) K.bar(-34, k * 28, 34, k * 28, 32, 1.4, 0.8, DK);
    K.rbox(26, 70, 10, 0, 6, 30, EN2, 3);
    K.bar(-8, -26, 8, -26, 40, 1.4, 1, K.glass(0x0a2030, 0x1a5a8a));
    for (const s of [-1, 1]) { K.ext([s * 30, 86, s * 50, 104, s * 48, 112, s * 30, 104], 2, EN2, 4, 0.6); K.cyl(6, 6, 12, s * 42, 4, -100, DK); }
    K.ext([-4, 92, 4, 92, 4, 116, -4, 116], 14, EN2, 4, 1);
    K.bar(-36, 0, 36, 0, 33, 6, 0.6, RD);
    for (const z of [-80, -40, 0, 40, 80]) for (const s of [-1, 1]) K.sph(1.2, 0.8, 1.2, s * 34, 20, z, K.G(0xffd070, 2.6));
  },
  p11body(K) {
    const WH = K.M(0xe8f0ff, { m: 0.35, r: 0.25, cc: 1 }), CR = K.M(0x9ad8ff, { m: 0.2, r: 0.12, cc: 1, panel: false }), GD = K.M(0xd8b048, { m: 0.95, r: 0.22, cc: 1, panel: false }), DK = K.M(0x1c2236, { m: 0.85, r: 0.35 });
    K.lathe([[0, -72], [8, -60], [15, -36], [18, -6], [17, 18], [12, 40], [6, 60], [0.2, 74]], WH, { sy: 0.7, y: 4 });
    K.lathe([[0, 46], [5, 52], [6, 62], [0.2, 76]], GD, { sy: 0.8, y: 7 });
    // 胸前水晶
    K.add(new K.T.OctahedronGeometry(9, 0), K.G(0x80ffd0, 2.6), 0, 18, 2);
    for (const s of [-1, 1]) { K.ext([s * 6, -40, s * 22, -60, s * 18, -30, s * 8, -24], 2, CR, 10, 0.5); K.bar(s * 4, -50, s * 4, 40, 16, 1, 0.6, K.G(0x60ffc0, 2.2)); }
    // 頭冠
    for (const k of [-1, 0, 1]) K.ext([k * 6, 54, k * 12, 70, k * 6 + 2, 64], 1.4, GD, 12, 0.3);
    K.cylV(9, 10, 2, 0, 9, -50, DK);
  },
  p11wing(K) {
    const WH = K.M(0xe0eaff, { m: 0.35, r: 0.25, cc: 1 }), CY = K.M(0xa8d8ff, { m: 0.3, r: 0.2, cc: 1 }), GD = K.M(0xd8b048, { m: 0.95, r: 0.22, cc: 1, panel: false }), GL = K.G(0x60ffc0, 2.4);
    // 左側往外是 -x：這裡建右翼（+x），畫的時候左邊鏡像
    K.ext([-76, 4, -40, -22, 0, -40, 40, -52, 76, -58, 64, -36, 40, -10, 10, 14, -40, 22], 3, WH, 0, 1);
    for (let f = 0; f < 6; f++) {
      const bx = -50 + f * 22, tx = bx + 16, tz = 26 + f * 4;
      K.ext([bx, 6 - f * 4, tx + 6, tz - 10, tx, tz + 6, bx - 8, 14 - f * 3], 1.4, f % 2 ? CY : WH, 2.6, 0.4);
      K.bar(bx, 8 - f * 4, tx + 2, tz - 2, 4.4, 0.8, 0.4, GL);
    }
    K.bar(-76, 4, 76, -58, 3.5, 2.6, 1.2, GD);
    K.sph(3, 2, 3, 74, 4, -56, K.G(0xa0ffe0, 3));
  },
});
EXTRA_BAKES.push(
  ['stealth', 56, 32, EXTRA_MODELS.stealth, { rot: Math.PI, glow: 0.8 }],
  ['orb', 20, 20, EXTRA_MODELS.orb, { glow: 0.9 }],
  ['airship', 110, 236, EXTRA_MODELS.airship, { glow: 0.6 }],
  ['p11body', 70, 156, EXTRA_MODELS.p11body, { glow: 0.9 }],
  ['p11wing', 164, 128, EXTRA_MODELS.p11wing, { glow: 0.9 }],
);

// ================= 波次、關卡、音樂 =================
Object.assign(WAVES, {
  ghosts: q => { [90, 270, 180].forEach((x, i) => q(i * 0.7, () => spawn('stealth', x, -20, { stop: 120 + i * 50 }))); return 4.2; },
  orbs: q => { for (const [cx, t] of [[100, 0], [260, 1.2]]) for (let k = 0; k < 3; k++) q(t, () => spawn('orb', cx, -30, { cx, k })); return 3.6; },
  airship: q => { q(0, () => spawn('airship', 180, -130)); return 11; },
});
STAGES.push({ name: '極光高空', en: 'AURORA HEIGHTS', boss: 'boss11', amb: 'aurora', speed: 58, bossSong: 'bossX',
  under: ctx => AMB2.aurora.under(ctx),
  seq: ['fDown', 'ghosts', 'orbs', 'carrierP', 'fSwoopL', 'fSwoopR', 'icpt', 'jetsUp', 'ghosts', 'droneW', 'carrierS', 'orbs', 'snakeR', 'fDive', 'bomber', 'carrierP', 'ghosts', 'airship', 'orbs', 'jetsUp', 'icpt', 'fSine', 'ghosts', 'carrierB', 'orbs', 'fDown', 'droneW'] });
Object.assign(SONGS, {
  s10: { bpm: 140, key: 47, prog: [[0, 'M'], [-3, 'm'], [5, 'M'], [2, 'm'], [0, 'M'], [7, 'M'], [5, 'M'], [-5, 'M']], seed: 233, drums: 2, lead: 'sine', arpW: 'triangle', pad: 1.3, arp: [0, 7, 12, 16, 19, 16, 12, 7], oct: 0 },
});
