'use strict';
// 守塔奇兵：塔上的小兵（弓箭手、砲手、冰霜守衛、法師、狙擊手、旗手／鼓手／哨兵、礦工）。
// 和英雄同一套分部位畫法；身體和「手＋武器」分開快取，瞄準時武器在貼圖時才旋轉，
// 所以轉向很順、每幀只要貼兩三張小圖，比以前每幀重畫向量還省。

const Crew = (() => {
  const { TAU, mix, rgba } = Gfx;
  const { mat, P, part, eye, mouth, blush, seg, glow, halo } = Rig;
  const OUT = Rig.OUT, E = Rig.ease;
  const SKIN = mat('#ffd6b4', { sh: 0.3 });
  const lw = r => r * 0.075;
  let dpr = 2, SS = 1.4;
  function setDpr(d) { dpr = d; }
  function setSS(v) { SS = v; }

  // ───────── 共用：Q 版身體 ─────────
  // r = 小兵的體型單位（全身約 2.9r 高），腳底在 (0,0)、面向右
  function legs(x, r, c, step) {
    const m = mat(c, { sh: 0.45 });
    for (const [i, dx] of [[1, -0.2], [0, 0.18]]) {
      const lift = step ? Math.max(0, Math.sin(step + i * Math.PI)) * r * 0.12 : 0;
      part(x, P.rr(dx * r - r * 0.15, -r * 0.62 - lift, r * 0.3, r * 0.55, r * 0.1), i ? mat(mix(c, '#000000', 0.2)) : m, dx * r, -r * 0.35, r * 0.25, { lw: lw(r) * 0.8 });
      part(x, P.fn(q => { q.moveTo(dx * r - r * 0.17, -r * 0.18 - lift); q.lineTo(dx * r + r * 0.1, -r * 0.18 - lift); q.quadraticCurveTo(dx * r + r * 0.3, -r * 0.1 - lift, dx * r + r * 0.3, -lift); q.lineTo(dx * r - r * 0.18, -lift); q.closePath(); }), mat('#4a3426'), dx * r, -r * 0.1, r * 0.2, { lw: lw(r) * 0.8 });
    }
  }
  function torso(x, r, c, o) {
    o = o || {};
    const m = mat(c, { sh: 0.36, hia: 0.8 });
    const p = o.robe ? P.fn(q => { q.moveTo(-r * 0.36, -r * 1.42); q.lineTo(r * 0.36, -r * 1.42); q.quadraticCurveTo(r * 0.55, -r * 0.6, r * 0.58, -r * 0.05); q.quadraticCurveTo(0, r * 0.05, -r * 0.58, -r * 0.05); q.quadraticCurveTo(-r * 0.55, -r * 0.6, -r * 0.36, -r * 1.42); q.closePath(); }) : P.rr(-r * 0.4, -r * 1.42, r * 0.8, r * 0.88, r * 0.26);
    part(x, p, m, 0, -r * 0.95, r * 0.5, { lw: lw(r), tex: q => { if (o.belt !== false) { q.fillStyle = o.belt || '#5a3a1e'; q.fillRect(-r * 0.6, -r * 0.78, r * 1.2, r * 0.13); q.fillStyle = '#f2c14e'; q.fillRect(-r * 0.05, -r * 0.78, r * 0.12, r * 0.13); } if (o.trim) { q.fillStyle = o.trim; q.fillRect(-r * 0.07, -r * 1.42, r * 0.14, r * 1.4); } if (o.stars) for (const [sx, sy] of [[-0.25, -0.4], [0.25, -0.62]]) Gfx.star(q, sx * r, sy * r, r * 0.08, '#ffe9a0', false); } });
  }
  function head(x, r, o) {
    o = o || {};
    x.save(); x.translate(r * 0.04, -r * 1.86); if (o.tilt) x.rotate(o.tilt);
    if (o.hairBack) part(x, P.fn(q => { q.arc(-r * 0.1, r * 0.05, r * 0.58, Math.PI * 0.45, Math.PI * 1.4); q.closePath(); }), mat(o.hairBack), -r * 0.3, r * 0.1, r * 0.4, { lw: lw(r) * 0.8 });
    part(x, P.circ(r * 0.05, 0, r * 0.55), SKIN, r * 0.05, 0, r * 0.55, { lw: lw(r), rim: false, hd: 0.15 });
    const md = o.mood || 'n';
    eye(x, r * 0.2, r * 0.04, r * 0.15, { iris: o.iris || '#4a3060', mood: md, look: [0.3, 0.1] });
    eye(x, r * 0.47, r * 0.04, r * 0.14, { iris: o.iris || '#4a3060', mood: md, look: [0.3, 0.1] });
    blush(x, r * 0.12, r * 0.26, r * 0.1, 0.45);
    mouth(x, r * 0.36, r * 0.28, r * 0.08, o.mouth || 'smile', r * 0.1);
    if (o.hat) o.hat(x, r);
    x.restore();
  }
  // 帽子們（在頭的座標系，頭中心 (0.05r, 0)、半徑 0.55r）
  const HATS = {
    cap: (c, feather) => (x, r) => { part(x, P.fn(q => { q.moveTo(-r * 0.58, -r * 0.05); q.quadraticCurveTo(-r * 0.4, -r * 0.72, r * 0.15, -r * 0.66); q.quadraticCurveTo(r * 0.6, -r * 0.55, r * 0.62, -r * 0.12); q.lineTo(r * 0.92, -r * 0.05); q.lineTo(-r * 0.6, 0); q.closePath(); }), mat(c), 0, -r * 0.35, r * 0.5, { lw: lw(r) }); if (feather) part(x, P.fn(q => { q.moveTo(-r * 0.3, -r * 0.5); q.quadraticCurveTo(-r * 0.75, -r * 1.05, -r * 1.05, -r * 0.62); q.quadraticCurveTo(-r * 0.7, -r * 0.7, -r * 0.35, -r * 0.4); q.closePath(); }), mat(feather), -r * 0.65, -r * 0.7, r * 0.25, { lw: lw(r) * 0.8 }); },
    hood: c => (x, r) => { part(x, P.fn(q => { q.arc(r * 0.05, -r * 0.02, r * 0.64, Math.PI * 0.95, Math.PI * 2.02); q.quadraticCurveTo(r * 0.45, -r * 0.22, r * 0.12, -r * 0.3); q.quadraticCurveTo(-r * 0.3, -r * 0.15, -r * 0.45, r * 0.5); q.lineTo(-r * 0.62, r * 0.25); q.closePath(); }), mat(c), 0, -r * 0.3, r * 0.6, { lw: lw(r) }); },
    helm: (c, plume) => (x, r) => { part(x, P.fn(q => { q.arc(r * 0.05, -r * 0.02, r * 0.62, Math.PI, 0); q.lineTo(r * 0.78, -r * 0.0); q.lineTo(-r * 0.62, r * 0.02); q.closePath(); }), mat(c, { gloss: 0.8 }), 0, -r * 0.3, r * 0.6, { lw: lw(r) }); if (plume) part(x, P.circ(r * 0.05, -r * 0.68, r * 0.13), mat(plume), r * 0.05, -r * 0.68, r * 0.13, { lw: lw(r) * 0.7 }); },
    wizard: (c, band) => (x, r) => { part(x, P.fn(q => { q.moveTo(-r * 0.85, -r * 0.3); q.quadraticCurveTo(0, -r * 0.6, r * 0.95, -r * 0.3); q.quadraticCurveTo(0, -r * 0.15, -r * 0.85, -r * 0.3); q.closePath(); }), mat(mix(c, '#000', 0.25)), 0, -r * 0.35, r * 0.5, { lw: lw(r) }); part(x, P.fn(q => { q.moveTo(-r * 0.45, -r * 0.4); q.quadraticCurveTo(-r * 0.2, -r * 1.2, r * 0.1, -r * 1.4); q.quadraticCurveTo(-r * 0.55, -r * 1.55, -r * 0.85, -r * 1.25); q.quadraticCurveTo(r * 0.15, -r * 1.0, r * 0.55, -r * 0.4); q.closePath(); }), mat(c), 0, -r * 0.85, r * 0.5, { lw: lw(r), tex: q => { q.fillStyle = band || '#f2c14e'; q.fillRect(-r * 0.6, -r * 0.62, r * 1.2, r * 0.12); } }); Gfx.star(x, -r * 0.85, -r * 1.25, r * 0.14, '#ffe27a', false); },
    miner: () => (x, r) => { part(x, P.fn(q => { q.arc(r * 0.05, -r * 0.05, r * 0.6, Math.PI, 0); q.lineTo(r * 0.8, -r * 0.02); q.lineTo(-r * 0.62, -r * 0.02); q.closePath(); }), mat('#f2c14e', { gloss: 0.8 }), 0, -r * 0.3, r * 0.55, { lw: lw(r) }); glow(x, () => Gfx.circ(x, r * 0.3, -r * 0.42, r * 0.12, '#fffbe0'), '#fff3a0', r * 0.4); },
    tophat: (c, band) => (x, r) => { part(x, P.ell(r * 0.05, -r * 0.42, r * 0.78, r * 0.16), mat(c), r * 0.05, -r * 0.42, r * 0.5, { lw: lw(r) }); part(x, P.rr(-r * 0.36, -r * 1.12, r * 0.8, r * 0.72, r * 0.1), mat(c, { gloss: 0.4 }), r * 0.04, -r * 0.75, r * 0.45, { lw: lw(r), tex: q => { q.fillStyle = band || '#e5484d'; q.fillRect(-r * 0.4, -r * 0.62, r * 0.9, r * 0.14); } }); },
    beret: c => (x, r) => { part(x, P.fn(q => { q.ellipse(0, -r * 0.4, r * 0.66, r * 0.3, -0.15, 0, TAU); }), mat(c), 0, -r * 0.4, r * 0.5, { lw: lw(r) }); part(x, P.circ(-r * 0.05, -r * 0.7, r * 0.08), mat('#ffd36b'), 0, -r * 0.7, r * 0.08, { lw: lw(r) * 0.6 }); },
  };
  const arm = (x, r, x0, y0, x1, y1, c) => { part(x, P.cap(x0, y0, x1, y1, r * 0.13, r * 0.11), mat(c), (x0 + x1) / 2, (y0 + y1) / 2, r * 0.2, { lw: lw(r) * 0.75 }); part(x, P.circ(x1, y1, r * 0.11), SKIN, x1, y1, r * 0.11, { lw: lw(r) * 0.6 }); };

  // ───────── 各種小兵（身體） ─────────
  const BODY = {
    archer(x, r, L, f) {
      if (L.hood) part(x, P.fn(q => { q.moveTo(-r * 0.3, -r * 1.42); q.quadraticCurveTo(-r * 0.8, -r * 0.9, -r * 0.6, -r * 0.25); q.lineTo(-r * 0.2, -r * 0.5); q.closePath(); }), mat(mix(L.hat, '#000', 0.15)), -r * 0.45, -r * 0.9, r * 0.4, { lw: lw(r) });
      x.save(); x.translate(-r * 0.42, -r * 1.05); x.rotate(-0.35); part(x, P.rr(-r * 0.13, -r * 0.42, r * 0.26, r * 0.62, r * 0.08), mat('#8a5a2a'), 0, -r * 0.1, r * 0.25, { lw: lw(r) * 0.8 }); for (let i = 0; i < 2; i++) part(x, P.poly([-r * 0.07 + i * r * 0.1, -r * 0.42, -r * 0.03 + i * r * 0.1, -r * 0.65, r * 0.01 + i * r * 0.1, -r * 0.42]), mat(i ? '#e5484d' : '#ffffff'), 0, -r * 0.5, r * 0.06, { lw: lw(r) * 0.4, flat: true }); x.restore();
      legs(x, r, '#5a4a3a'); torso(x, r, L.tunic, { belt: '#6a4220' });
      head(x, r, { iris: '#3a6a3a', hairBack: '#8a5a2a', hat: L.hood ? HATS.hood(L.hat) : HATS.cap(L.hat, L.feather || '#e5484d'), mood: f === 1 ? 'angry' : 'n' });
    },
    gunner(x, r, L, f) {
      legs(x, r, '#4a4a5a'); torso(x, r, L.coat, { belt: '#3a2a1a' });
      head(x, r, { iris: '#3a3a5a', hat: HATS.helm(L.helm, '#e5484d'), mood: f === 1 ? 'angry' : 'n', mouth: f === 1 ? 'open' : 'smile' });
      // 火把手
      const up = f === 1 ? 0.35 : 0;
      arm(x, r, r * 0.15, -r * 1.15, r * 0.55, -r * (1.05 + up), L.coat);
      x.save(); x.translate(r * 0.6, -r * (1.05 + up)); x.rotate(0.5 - up);
      part(x, P.rr(-r * 0.05, -r * 0.6, r * 0.1, r * 0.65, r * 0.04), mat('#7a4a22'), 0, -r * 0.3, r * 0.12, { lw: lw(r) * 0.6 });
      x.restore();
    },
    frost(x, r, L, f) {
      const c = f >= 2 ? 1 : 0;
      part(x, P.fn(q => { q.moveTo(-r * 0.3, -r * 1.42); q.quadraticCurveTo(-r * 0.85, -r * 0.8, -r * 0.65, -r * 0.05); q.lineTo(-r * 0.2, -r * 0.3); q.closePath(); }), mat('#7ab8e8'), -r * 0.5, -r * 0.8, r * 0.4, { lw: lw(r) });
      legs(x, r, '#5a6a8a'); torso(x, r, '#e8f4ff', { robe: true, belt: '#4a8ad8', trim: '#8fd0ff' });
      head(x, r, { iris: '#2a7ab8', hairBack: '#e8f6ff', hat: HATS.hood('#5aa8e0'), mood: c ? 'shut' : 'n', mouth: c ? 'o' : 'smile' });
      // 雙手舉起（施法時更高）
      const hy = -r * (1.25 + c * 0.55), hx = r * (0.5 + c * 0.1);
      arm(x, r, -r * 0.1, -r * 1.25, hx - r * 0.15, hy - r * 0.05, '#e8f4ff'); arm(x, r, r * 0.15, -r * 1.2, hx + r * 0.05, hy, '#e8f4ff');
      if (c) { halo(x, hx, hy - r * 0.2, r * 0.6, '#bff0ff', 0.8); for (let i = 0; i < 3; i++) { const a = i * 2.1 + f; Gfx.star(x, hx + Math.cos(a) * r * 0.35, hy - r * 0.2 + Math.sin(a) * r * 0.3, r * 0.1, '#ffffff', false); } }
    },
    wizard(x, r, L, f) {
      const c = f === 1 ? 1 : 0;
      legs(x, r, '#3a2a48'); torso(x, r, L.robe, { robe: true, belt: '#f2c14e', stars: true });
      head(x, r, { iris: '#6a3ac8', hairBack: '#e8e8f0', hat: HATS.wizard(L.hat), mood: c ? 'angry' : 'n', mouth: c ? 'open' : 'smile' });
      x.save(); x.translate(r * 0.62, -r * (1.1 + c * 0.3)); x.rotate(0.1 - c * 0.25);
      part(x, P.rr(-r * 0.05, -r * 1.1, r * 0.1, r * 1.45, r * 0.04), mat('#8a5a32'), 0, -r * 0.4, r * 0.15, { lw: lw(r) * 0.6 });
      halo(x, 0, -r * 1.2, r * (0.35 + c * 0.35), L.orb, 0.6 + c * 0.3);
      part(x, P.circ(0, -r * 1.2, r * 0.16), mat(L.orb, { gloss: 1 }), 0, -r * 1.2, r * 0.16, { lw: lw(r) * 0.7 });
      x.restore();
      arm(x, r, r * 0.1, -r * 1.2, r * 0.6, -r * (1.1 + c * 0.3), L.robe);
    },
    sniper(x, r, L) {
      legs(x, r, '#3a3a3a'); torso(x, r, L.coat, { belt: mix(L.coat, '#000', 0.4) });
      head(x, r, { iris: '#3a3020', hat: HATS.tophat(L.hat, L.band), mood: 'angry', mouth: 'flat' });
    },
    bearer(x, r, L, f) {
      // 旗手：揮著小旗加油
      const w = Math.sin(f / 4 * TAU);
      legs(x, r, '#4a3a2a', f % 2 ? 0.8 : 0); torso(x, r, L.c, { belt: '#5a3a1e' });
      head(x, r, { iris: '#5a3020', hairBack: '#5a3a22', hat: HATS.beret(L.hat), mood: 'happy', mouth: 'open' });
      x.save(); x.translate(r * 0.45, -r * 1.25); x.rotate(-0.4 + w * 0.35);
      part(x, P.rr(-r * 0.04, -r * 1.3, r * 0.08, r * 1.4, r * 0.03), mat('#7a4a22'), 0, -r * 0.6, r * 0.12, { lw: lw(r) * 0.6 });
      const fp = P.fn(q => { q.moveTo(r * 0.04, -r * 1.28); for (let i = 0; i <= 6; i++) { const t = i / 6; q.lineTo(r * 0.04 + t * r * 0.75, -r * 1.28 + Math.sin(f + t * 3) * r * 0.06 * t); } for (let i = 6; i >= 0; i--) { const t = i / 6; q.lineTo(r * 0.04 + t * r * 0.75, -r * 0.82 + Math.sin(f + t * 3) * r * 0.06 * t); } q.closePath(); });
      part(x, fp, mat(L.flag), r * 0.4, -r * 1.05, r * 0.3, { lw: lw(r) * 0.7, tex: q => Gfx.star(q, r * 0.38, -r * 1.05, r * 0.12, '#fff3c0', false) });
      x.restore();
      arm(x, r, r * 0.1, -r * 1.2, r * 0.45, -r * 1.25, L.c);
    },
    drummer(x, r, L, f) {
      legs(x, r, '#4a3a2a'); torso(x, r, L.c, { belt: '#f2c14e' });
      head(x, r, { iris: '#5a3020', hairBack: '#5a3a22', hat: HATS.helm('#c8d0dc', '#f2c14e'), mood: f % 2 ? 'happy' : 'n', mouth: 'open' });
      part(x, P.ell(r * 0.45, -r * 0.65, r * 0.38, r * 0.3), mat('#c83a30'), r * 0.45, -r * 0.65, r * 0.35, { lw: lw(r), tex: q => { q.fillStyle = '#f2ece0'; q.beginPath(); q.ellipse(r * 0.45, -r * 0.88, r * 0.36, r * 0.1, 0, 0, TAU); q.fill(); q.strokeStyle = '#f2c14e'; q.lineWidth = r * 0.05; q.beginPath(); for (let i = 0; i < 4; i++) { q.moveTo(r * (0.12 + i * 0.22), -r * 0.82); q.lineTo(r * (0.22 + i * 0.22), -r * 0.45); } q.stroke(); } });
      const h = f % 2 ? 0.25 : -0.1;
      for (const [sx, ph] of [[0.25, h], [0.6, -h]]) { arm(x, r, r * 0.05, -r * 1.2, r * sx, -r * (1.05 + ph * 0.5), L.c); seg(x, r * sx, -r * (1.05 + ph * 0.5), r * (sx + 0.15), -r * (0.9 - ph), '#6b4a2a', r * 0.07); }
    },
    sentry(x, r, L) {
      legs(x, r, '#3a3a4a'); torso(x, r, L.c, { belt: '#3a2a1a' });
      head(x, r, { iris: '#3a3a5a', hat: HATS.helm('#c8d0dc', '#3a6fd8'), mood: 'n' });
      part(x, P.rr(r * 0.3, -r * 2.0, r * 0.62, r * 0.17, r * 0.06), mat('#c9a040', { gloss: 0.8 }), r * 0.6, -r * 1.92, r * 0.2, { lw: lw(r) * 0.7 });
      arm(x, r, r * 0.1, -r * 1.25, r * 0.45, -r * 1.85, L.c);
    },
    miner(x, r, L, f) {
      const sw = Math.sin(f / 8 * TAU);
      legs(x, r, '#4a4a6a'); torso(x, r, '#5a6aa8', { belt: '#3a2a1a' });
      head(x, r, { iris: '#3a3a3a', hairBack: '#3a2a22', hat: HATS.miner(), mood: sw > 0.6 ? 'angry' : 'n', mouth: sw > 0.6 ? 'grin' : 'smile' });
      x.save(); x.translate(r * 0.2, -r * 1.15); x.rotate(-1.4 + (sw + 1) * 1.1);
      part(x, P.rr(-r * 0.05, -r * 1.0, r * 0.1, r * 1.05, r * 0.04), mat('#9a6a3a'), 0, -r * 0.5, r * 0.12, { lw: lw(r) * 0.6 });
      part(x, P.fn(q => { q.moveTo(-r * 0.5, -r * 0.85); q.quadraticCurveTo(0, -r * 1.15, r * 0.5, -r * 0.85); q.lineTo(r * 0.45, -r * 0.95); q.quadraticCurveTo(0, -r * 1.1, -r * 0.45, -r * 0.95); q.closePath(); }), mat('#c0c8d4', { gloss: 0.8 }), 0, -r * 0.95, r * 0.3, { lw: lw(r) * 0.7 });
      x.restore();
      arm(x, r, r * 0.05, -r * 1.2, r * 0.2 + Math.sin(-1.4 + (sw + 1) * 1.1) * -r * 0.0, -r * 1.15, '#5a6aa8');
    },
  };
  // 手＋武器（會在貼圖時旋轉）：原點 = 肩膀
  const ARMS = {
    bow(x, r, L, pull) {
      const br = r * (L.long ? 1.0 : 0.82), bx = r * 0.62;
      const hx2 = bx - br * 0.62 + Math.cos(1.0) * br - r * 0.06 - pull * r * 0.45;
      arm(x, r, -r * 0.05, r * 0.05, bx, 0, L.tunic);
      x.strokeStyle = OUT; x.lineWidth = r * 0.19; x.lineCap = 'round'; x.beginPath(); x.arc(bx - br * 0.62, 0, br, -1.0, 1.0); x.stroke();
      x.strokeStyle = L.bow || '#b07038'; x.lineWidth = r * 0.1; x.stroke(); x.strokeStyle = '#ffd36b'; x.lineWidth = r * 0.07; x.beginPath(); x.arc(bx - br * 0.62, 0, br, -0.15, 0.15); x.stroke(); x.lineCap = 'butt';
      const ex = bx - br * 0.62 + Math.cos(1.0) * br, ey = Math.sin(1.0) * br;
      x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = r * 0.04; x.beginPath(); x.moveTo(ex, -ey); x.lineTo(hx2, 0); x.lineTo(ex, ey); x.stroke();
      if (pull > 0.2) { seg(x, hx2, 0, bx + r * 0.42, 0, OUT, r * 0.1); seg(x, hx2, 0, bx + r * 0.42, 0, '#7a5232', r * 0.05); part(x, P.poly([bx + r * 0.58, 0, bx + r * 0.38, -r * 0.1, bx + r * 0.38, r * 0.1]), mat('#e8eef8', { gloss: 0.8 }), bx + r * 0.45, 0, r * 0.08, { lw: lw(r) * 0.5 }); }
      arm(x, r, -r * 0.05, r * 0.08, hx2, 0, L.tunic);
      part(x, P.circ(bx, 0, r * 0.12), SKIN, bx, 0, r * 0.12, { lw: lw(r) * 0.6 });
    },
    rifle(x, r, L) {
      part(x, P.rr(-r * 0.4, -r * 0.13, r * 0.6, r * 0.28, r * 0.08), mat('#a86a3a'), -r * 0.1, 0, r * 0.25, { lw: lw(r) * 0.7 });
      part(x, P.rr(r * 0.15, -r * 0.08, r * 1.65, r * 0.15, r * 0.04), mat('#6a707a', { gloss: 0.9 }), r * 0.9, 0, r * 0.2, { lw: lw(r) * 0.7 });
      part(x, P.rr(r * 0.4, -r * 0.34, r * 0.6, r * 0.18, r * 0.07), mat(L.scope || '#2a2d33', { gloss: 0.8 }), r * 0.7, -r * 0.25, r * 0.2, { lw: lw(r) * 0.6 });
      glow(x, () => Gfx.circ(x, r * 1.0, -r * 0.25, r * 0.07, '#9fe6ff'), '#9fe6ff', r * 0.3);
      part(x, P.rr(r * 1.72, -r * 0.12, r * 0.12, r * 0.23, r * 0.03), mat('#3a3e46'), r * 1.78, 0, r * 0.1, { lw: lw(r) * 0.5 });
      arm(x, r, -r * 0.1, r * 0.05, r * 0.05, r * 0.1, L.coat); arm(x, r, 0, r * 0.05, r * 0.6, r * 0.08, L.coat);
    },
  };

  // ───────── 快取與繪製 ─────────
  const keyOf = L => L ? Object.values(L).join('|') : '';
  function bodySprite(kind, L, r, f) {
    const rq = Math.round(r * 8) / 8;
    const ss = Math.max(1, Math.min(SS, 2.5 / dpr));
    return Gfx.sheet(`crew:${kind}:${keyOf(L)}:${rq}:${f}`, rq * 3.6, rq * 4.2, rq * 1.8, rq * 3.4, dpr, x => BODY[kind](x, rq, L, f), { ss, outline: Math.max(0.5, rq * 0.055), oc: 'rgba(30,18,40,.8)' });
  }
  function armSprite(kind, L, r, f) {
    const rq = Math.round(r * 8) / 8;
    const ss = Math.max(1, Math.min(SS, 2.5 / dpr));
    return Gfx.sheet(`crewA:${kind}:${keyOf(L)}:${rq}:${f}`, rq * 3.2, rq * 2.6, rq * 0.8, rq * 1.3, dpr, x => ARMS[kind](x, rq, L, f / 3), { ss, outline: Math.max(0.5, rq * 0.055), oc: 'rgba(30,18,40,.8)' });
  }
  // u = 塔的單位；回傳小兵的體型單位
  const rOf = u => u * 0.148;
  // 在 (0,0) 畫一個小兵（呼叫端已經 translate 到腳底並處理左右翻轉）
  function draw(x, kind, L, u, f) { Gfx.drawSprite(x, bodySprite(kind, L, rOf(u), f || 0), 0, 0); }
  // 弓箭手：aim 相對角度（往右為 0），pull 0~1
  function archer(x, u, aim, pull, L) {
    const r = rOf(u);
    Gfx.drawSprite(x, bodySprite('archer', L, r, pull > 0.6 ? 1 : 0), 0, 0);
    x.save(); x.translate(r * 0.12, -r * 1.2); x.rotate(aim);
    Gfx.drawSprite(x, armSprite('bow', L, r, Math.round(Math.min(1, pull) * 3)), 0, 0);
    x.restore();
  }
  function rifleman(x, u, aim, rec, L) {
    const r = rOf(u);
    Gfx.drawSprite(x, bodySprite('sniper', L, r, 0), 0, 0);
    x.save(); x.translate(r * 0.15 - rec * r * 0.25, -r * 1.2); x.rotate(aim - rec * 0.15);
    Gfx.drawSprite(x, armSprite('rifle', L, r, 0), 0, 0);
    x.restore();
  }
  return { draw, archer, rifleman, setDpr, setSS, rOf, BODY };
})();
