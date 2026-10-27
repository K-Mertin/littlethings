// 千軍突圍 — 特效（只在畫面上，不影響遊戲結果）
'use strict';

const FX = {
  add(e) { if (G.fx.length < 360) { e.t = 0; G.fx.push(e); } },
  rnd: (a, b) => a + Math.random() * (b - a),

  shot(so, wid, b) {
    if (b) b.born = G.t;
    const x = G.px + so.x, z = so.z;
    if ((wid === 'rifle' || wid === 'smg') && Math.random() < 0.3 && G.parts.length < 380)
      G.parts.push({ x: x + 0.14, z, h: 0.85, vx: FX.rnd(1.6, 3), vz: FX.rnd(-0.6, 0.4), vh: FX.rnd(2.2, 3.6), life: 0.55, t: 0, col: '#e9b949', sz: 0.5, shell: 1 });
    else if (wid === 'shotgun' && Math.random() < 0.35)
      G.parts.push({ x: x + 0.14, z, h: 0.85, vx: FX.rnd(1.4, 2.6), vz: FX.rnd(-0.6, 0.4), vh: FX.rnd(2.6, 3.8), life: 0.6, t: 0, col: '#d8402c', sz: 0.65, shell: 1 });
    else if (wid === 'rocket' && Math.random() < 0.5)
      FX.add({ k: 'puff', spr: 'smoke', x: x + 0.1, z: z - 0.5, h: 1.0, life: 0.6, size: 0.7, grow: 1.4, rise: 0.4, a: 0.6 });
  },

  hit(b, o, dmg) {
    const isBoss = o.t === 'boss';
    const h = o.t === 'gate' ? FX.rnd(0.6, 2.2) : isBoss ? FX.rnd(0.25, 0.8) * o.h : (o.h || 1) * FX.rnd(0.35, 0.7);
    const x = isBoss ? b.x : b.x, z = o.z - (o.t === 'gate' ? 0.05 : (o.r || 0.4) * 0.5);
    const w = WEAPONS[b.wid];
    if (Math.random() < (b.wid === 'smg' ? 0.5 : 0.85))
      FX.add({ k: 'spark', x, z, h, life: 0.11, size: b.wid === 'rocket' ? 1.4 : b.wid === 'laser' ? 0.9 : 0.6, fl: b.wid === 'laser' ? 'c' : b.wid === 'rocket' ? 'o' : 'y', rot: Math.random() * 3 });
    if (Math.random() < 0.35 && G.parts.length < 380)
      for (let i = 0; i < 2; i++) G.parts.push({ x, z, h, vx: FX.rnd(-4, 4), vz: FX.rnd(-3, 1), vh: FX.rnd(1, 5), life: 0.25, t: 0, col: w.col, sz: 0.5, streak: 1 });
    if (o.t === 'gate') {
      if (Math.random() < 0.4) FX.add({ k: 'ripple', x, z, h, life: 0.3, size: 0.5 });
      return;
    }
    if (o.t === 'en' && Math.random() < 0.25 && G.parts.length < 380)
      G.parts.push({ x, z, h, vx: FX.rnd(-2, 2), vz: FX.rnd(-1, 2), vh: FX.rnd(2, 4), life: 0.4, t: 0, col: ENEMY_COL[o.k], sz: 0.8 });
    // 傷害數字：只給頭目和大隻的
    if (isBoss || o.k === 'brute' || o.k === 'shield') {
      o.dmgAcc = (o.dmgAcc || 0) + dmg;
      if (!o.dmgT || G.t - o.dmgT > (isBoss ? 0.22 : 0.3)) {
        o.dmgT = G.t;
        floatText(o.x + FX.rnd(-o.r, o.r) * 0.7, o.z - 0.3, o.h * FX.rnd(0.55, 0.95), fmtNum(o.dmgAcc), isBoss ? '#fff3a0' : '#ffffff', isBoss ? 0.62 : 0.5);
        o.dmgAcc = 0;
      }
    }
  },

  kill(o) {
    FX.add({ k: 'die', e: o.art || o.k, x: o.x, z: o.z, h: o.h, ph: o.ph, life: 0.28 });
    const n = o.k === 'brute' ? 4 : 2;
    for (let i = 0; i < n; i++) FX.add({ k: 'puff', spr: 'dust', x: o.x + FX.rnd(-o.r, o.r) * 0.6, z: o.z, h: FX.rnd(0.1, o.h * 0.5), life: 0.45, size: o.r * 1.6, grow: 1.6, rise: 0.6, a: 0.85 });
    for (let i = 0; i < (o.k === 'brute' ? 10 : 5) && G.parts.length < 380; i++)
      G.parts.push({ x: o.x, z: o.z, h: o.h * 0.5, vx: FX.rnd(-4, 4), vz: FX.rnd(-2, 3), vh: FX.rnd(3, 6), life: 0.5, t: 0, col: ENEMY_COL[o.k], sz: o.k === 'brute' ? 1.3 : 0.9 });
    if (Math.random() < 0.5) FX.add({ k: 'coin', x: o.x, z: o.z, h: o.h * 0.6, vh: 4.5, life: 0.6 });
  },

  boom(x, z, k, lite) {
    FX.add({ k: 'flash', x, z, h: 0.6 * k, life: 0.16, size: 3.2 * k });
    FX.add({ k: 'ring', x, z, life: 0.42, size: 3.4 * k, col: '255,220,150' });
    const nf = lite ? 2 : 4 + 3 * k, ns = lite ? 1 : 3 + 3 * k, nd = lite ? 3 : 6 * k;
    for (let i = 0; i < nf; i++) FX.add({ k: 'puff', spr: 'fire', x: x + FX.rnd(-0.8, 0.8) * k, z: z + FX.rnd(-0.5, 0.5) * k, h: FX.rnd(0.2, 1.2) * k, life: FX.rnd(0.25, 0.45), size: FX.rnd(0.8, 1.4) * k, grow: 1.5, rise: 1.2, a: 1, add: 1 });
    for (let i = 0; i < ns; i++) FX.add({ k: 'puff', spr: 'smoke', x: x + FX.rnd(-1, 1) * k, z: z + FX.rnd(-0.6, 0.6) * k, h: FX.rnd(0.4, 1.6) * k, life: FX.rnd(0.7, 1.1), size: FX.rnd(1.0, 1.6) * k, grow: 1.8, rise: 1.1, a: 0.7, dl: 0.08 });
    for (let i = 0; i < nd && G.parts.length < 380; i++)
      G.parts.push({ x, z, h: 0.4, vx: FX.rnd(-6, 6), vz: FX.rnd(-4, 5), vh: FX.rnd(4, 9), life: 0.7, t: 0, col: i % 2 ? '#3a2a1a' : '#ff9a3a', sz: 0.8 });
    if (lite && Math.random() < 0.7) return;
    if (G.decals.length > 24) G.decals.shift();
    G.decals.push({ x, z, size: 1.3 * k, rot: Math.random() });
  },

  crowdHit(o, loss) {
    FX.add({ k: 'puff', spr: 'dust', x: o.x, z: Math.max(0.3, o.z), h: 0.4, life: 0.4, size: 1.2, grow: 1.5, rise: 0.5, a: 0.8 });
    FX.add({ k: 'ring', x: o.x, z: Math.max(0.2, o.z), life: 0.3, size: 1.4, col: '255,90,90' });
  },

  slam(b) {
    FX.add({ k: 'ring', x: G.px, z: 0.6, life: 0.45, size: 3.2, col: '255,255,255' });
    for (let i = 0; i < 5; i++) FX.add({ k: 'puff', spr: 'dust', x: G.px + FX.rnd(-1.6, 1.6), z: FX.rnd(0, 1.2), h: 0.2, life: 0.55, size: 1.3, grow: 1.6, rise: 0.4, a: 0.85 });
  },


  wallbreak(o) {
    for (let i = 0; i < 18 && G.parts.length < 400; i++)
      G.parts.push({ x: FX.rnd(-ROAD, ROAD), z: o.z, h: FX.rnd(0.2, 1.6), vx: FX.rnd(-3, 3), vz: FX.rnd(-4, 1), vh: FX.rnd(2, 6), life: 0.9, t: 0, col: i % 3 ? '#b5653f' : '#8a8f99', sz: 1.6, brick: 1 });
    for (let i = 0; i < 5; i++) FX.add({ k: 'puff', spr: 'dust', x: FX.rnd(-ROAD, ROAD), z: o.z, h: FX.rnd(0.3, 1.2), life: 0.7, size: 1.8, grow: 1.6, rise: 0.5, a: 0.8 });
  },
  crate(o) {
    FX.add({ k: 'flash', x: o.x, z: o.z, h: 0.5, life: 0.2, size: 2 });
    for (let i = 0; i < 10 && G.parts.length < 400; i++)
      G.parts.push({ x: o.x, z: o.z, h: 0.5, vx: FX.rnd(-3, 3), vz: FX.rnd(-2, 2), vh: FX.rnd(3, 6), life: 0.7, t: 0, col: i % 2 ? '#d9a35a' : '#ffe680', sz: 0.9, brick: 1 });
  },
  strike(x, z) {
    for (let i = 0; i < 6; i++) FX.add({ k: 'ring', x, z: z - 1.5 - i * 1.8, life: 0.35 + i * 0.05, size: 1.6, col: '255,120,90' });
    for (let i = 0; i < 8; i++) FX.add({ k: 'puff', spr: 'dust', x: x + FX.rnd(-1.1, 1.1), z: FX.rnd(-2, z - 1), h: 0.3, life: 0.6, size: 1.4, grow: 1.6, rise: 0.6, a: 0.85 });
  },

  bossdie(o) {
    o.deadAt = G.t;
    FX.q = [];
    for (let i = 0; i < 7; i++) FX.q.push({ at: G.t + i * 0.22, x: o.x + FX.rnd(-o.r, o.r), z: o.z + FX.rnd(-0.5, 0.5), k: 1 + Math.random() * 0.8 });
    FX.add({ k: 'die', boss: o, x: o.x, z: o.z, life: 1.8 });
  },

  update(dt) {
    const v = G.scroll && G.st === 'play' ? G.spd : 0;
    if (FX.q && FX.q.length) {
      for (let i = FX.q.length - 1; i >= 0; i--) if (G.t >= FX.q[i].at) { const e = FX.q.splice(i, 1)[0]; FX.boom(e.x, e.z, e.k); if (typeof AU !== 'undefined') AU.sfx('boom'); G.shake = Math.max(G.shake, 0.6); }
    }
    const E = G.fx;
    for (let i = E.length - 1; i >= 0; i--) {
      const e = E[i];
      e.t += dt;
      if (e.t >= e.life + (e.dl || 0)) { E.splice(i, 1); continue; }
      if (e.k !== 'die' || !e.boss) e.z -= v * dt;
      if (e.k === 'puff') e.h += (e.rise || 0) * dt;
      else if (e.k === 'coin') { e.h += e.vh * dt; e.vh -= 12 * dt; }
    }
    // 火箭尾煙
    G.smokeT = (G.smokeT || 0) + dt;
    if (G.smokeT > 0.05) {
      G.smokeT = 0;
      let n = 0;
      for (const b of G.bullets) if (b.wid === 'rocket' && n++ < 8) FX.add({ k: 'puff', spr: 'smoke', x: b.x, z: b.z - 0.4, h: 1.0, life: 0.5, size: 0.5, grow: 1.6, rise: 0.3, a: 0.45 });
    }
    const D = G.decals;
    for (let i = D.length - 1; i >= 0; i--) { D[i].z -= v * dt; if (D[i].z < -9) D.splice(i, 1); }
  },
};
const ENEMY_COL = { grunt: '#9a6cf0', runner: '#ff6b4a', brute: '#6fc95e', shield: '#9aa7c7', thrower: '#f0a83a', splitter: '#6fe07a', mini: '#6fe07a' };
function fmtNum(n) { n = Math.round(n); return n >= 10000 ? (n / 1000).toFixed(0) + 'K' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(Math.max(1, n)); }
