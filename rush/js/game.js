// 千軍突圍 — 遊戲邏輯（不碰 DOM，模擬器也用這支）
'use strict';

let G = null;
let _uid = 1;

// 士兵隊形（向日葵排列）
const FORM = [];
for (let i = 0; i < VIS_CAP; i++) {
  const r = 0.3 * Math.sqrt(i + 0.6), a = i * 2.39996;
  FORM.push({ x: r * Math.cos(a), z: r * Math.sin(a) * 0.72 });
}

function newGame(s, opts) {
  opts = opts || {};
  const L = genStage(s, opts.seed);
  const up = opts.up || { men: 0, dmg: 0, rate: 0 };
  G = {
    s, L, st: 'play', t: 0, dist: 0, evI: 0, spd: L.spd, scroll: true,
    N: startN(s) + up.men * 2, peak: 0, wid: 'rifle', lv: 1,
    dmgK: 1 + up.dmg * 0.05, rateK: 1 + up.rate * 0.04,
    px: 0, tx: 0,
    sold: [], objs: [], bullets: [], parts: [], floats: [], q: [],
    fireAcc: 0, shooterI: 0, boss: null, bossDone: false, endT: 0,
    shake: 0, flash: 0, lost: 0, gained: 0, kills: 0, gatesGood: 0, gatesBad: 0,
    hint: null, sim: !!opts.sim,
  };
  G.peak = G.N;
  syncSoldiers(true);
  return G;
}

const emit = (name, a) => { if (!G.sim) G.q.push([name, a]); };

// 畫面上的士兵（最多 VIS_CAP 個）
function visCount(N) { return Math.min(VIS_CAP, N <= 0 ? 0 : N <= 40 ? N : Math.round(40 + (Math.min(N, 400) - 40) / 360 * (VIS_CAP - 40))); }
function syncSoldiers(instant) {
  const want = visCount(G.N);
  const S = G.sold;
  while (S.length < want) {
    const f = FORM[S.length];
    S.push({ x: instant ? f.x : 0, z: instant ? f.z : -0.4, ph: Math.random() * 6, pop: instant ? 0 : 1 });
  }
  while (S.length > want) {
    const o = S.pop();
    if (!G.sim) for (let i = 0; i < 3; i++) G.parts.push(part(G.px + o.x, o.z, 0.5, '#4aa3ff', 1.2));
  }
}
function crowdR() {
  const n = G.sold.length;
  if (!n) return { rx: 0.3, rz: 0.3 };
  const r = 0.3 * Math.sqrt(n + 0.6);
  return { rx: r + 0.25, rz: r * 0.72 + 0.25 };
}

function part(x, z, h, col, sz, vy) {
  return { x, z, h, vx: (Math.random() - 0.5) * 4, vz: (Math.random() - 0.3) * 4, vh: (vy || 3) + Math.random() * 3, life: 0.5 + Math.random() * 0.4, t: 0, col, sz: sz || 1 };
}
function floatText(x, z, h, text, col, big) { if (!G.sim) G.floats.push({ x, z, h, text, col, big: big || 1, t: 0 }); }

function setN(n, why) {
  n = clamp(Math.round(n), 0, MAX_N);
  const d = n - G.N;
  if (d < 0) G.lost -= d; else G.gained += d;
  G.N = n;
  if (n > G.peak) G.peak = n;
  syncSoldiers(false);
  if (d !== 0) emit('count', { d, why });
}

// 目前預期火力（不含強化，讓強化真的有幫助）
function curDps() { return Math.max(1, G.N) * genDps(G.wid, G.lv); }

// ---- 事件生成 ----
function spawnEvents() {
  const L = G.L;
  while (G.evI < L.ev.length && L.ev[G.evI].d - G.dist <= ZSPAWN) {
    const e = L.ev[G.evI++];
    const z0 = e.d - G.dist;
    if (e.type === 'gates') {
      const pair = { id: _uid++, used: false };
      for (const side of [-1, 1]) {
        const g = side < 0 ? e.L : e.R;
        G.objs.push({ t: 'gate', id: _uid++, pair, side, x: side * ROAD / 2, w: ROAD / 2, z: z0, k: g.k, v: g.v, acc: 0, step: e.step, bump: 0, fade: 0 });
      }
    } else if (e.type === 'wave') {
      // 依目前實力調整（選得好還是比較強，但不會無聊）
      const f = clamp(Math.pow(curDps() / e.exp, 0.6), 0.5, 3);
      const sHP = curDps() / Math.max(1, G.N);
      for (const m of e.list) {
        const K = ENEMIES[m.k];
        const hp = m.hp * f;
        G.objs.push({ t: 'en', id: _uid++, k: m.k, x: m.x, z: z0 + m.dz, hp, max: hp, r: K.r, h: K.h, spd: K.spd, home: K.home, mass: K.mass, sHP, ph: Math.random() * 6, hit: 0, dead: 0 });
      }
      if (e.barrels) for (const b of e.barrels) G.objs.push({ t: 'bar', id: _uid++, x: b.x, z: z0 + b.dz, hp: b.hp * f, max: b.hp * f, boom: b.boom * f, r: 0.55, hit: 0 });
    } else if (e.type === 'boss') {
      const B = BOSSES[e.k];
      const sc = 1 + e.tier * 0.12;
      const f = clamp(Math.pow(curDps() / e.exp, 0.8), 0.5, 4);
      const hp = e.hp * f;
      G.boss = { t: 'boss', id: _uid++, k: e.k, tier: e.tier, x: 0, z: Math.min(z0, 34), hp, max: hp, r: B.r * sc, h: B.h * sc, spd: 2.5, eat: Math.max(1, G.N * 0.05), sHP: curDps() / Math.max(1, G.N), atk: 0, atkT: 0, phase: 1, hit: 0, ph: 0, intro: 2.2, dead: 0 };
      G.objs.push(G.boss);
      G.stopAt = G.dist + 6;
      emit('boss', G.boss);
    }
  }
}

// ---- 射擊 ----
function fire(dt) {
  if (G.N <= 0 || !G.sold.length) return;
  const w = WEAPONS[G.wid];
  const shooters = Math.min(G.sold.length, MAX_SHOOTERS);
  const rate = w.rate * G.rateK;
  G.fireAcc += dt * rate * shooters;
  const per = w.dmg * lvMult(G.lv) * G.dmgK * G.N / shooters;
  // 瞄準：前方扇形內最近的幾個敵人（沒有敵人就直直往前打，可以打門）
  if (G.fireAcc >= 1) {
    const T = G.aimT || (G.aimT = []);
    T.length = 0;
    for (const o of G.objs) {
      if ((o.t !== 'en' && o.t !== 'boss' && o.t !== 'bar') || o.dead || o.intro > 0) continue;
      if (o.z < 0.6 || o.z > BULLET_RANGE - 4) continue;
      if (Math.abs(o.x - G.px) > 1.4 + o.z * 0.5 + o.r) continue;
      T.push(o);
    }
    T.sort((a, b) => a.z - b.z);
    if (T.length > 4) T.length = 4;
  }
  let n = 0;
  while (G.fireAcc >= 1 && n < 40) {
    G.fireAcc -= 1; n++;
    const S = G.sold;
    const idx = (G.shooterI++ * 7) % S.length;
    const so = S[idx];
    const bx = G.px + so.x, bz = so.z + 0.35;
    let a0 = 0;
    const T = G.aimT;
    if (T && T.length) {
      const o = T[n % T.length];
      const tz = Math.max(0.5, o.z - bz - (o.t === 'en' ? (G.scroll ? G.spd : 0) + o.spd : 0) * (o.z - bz) / BULLET_V);
      a0 = Math.atan2(o.x - bx, tz);
    }
    for (let k = 0; k < w.n; k++) {
      const a = a0 + (w.n > 1 ? (k - (w.n - 1) / 2) * w.spread + (Math.random() - 0.5) * 0.03 : (Math.random() - 0.5) * w.spread);
      G.bullets.push({ x: bx, z: bz, vx: Math.sin(a) * BULLET_V, vz: Math.cos(a) * BULLET_V, dmg: per, pierce: w.pierce, splash: w.splash, wid: G.wid, d: 0, last: 0 });
    }
    so.fl = 0.06;
  }
  if (n) emit('shot', { wid: G.wid, n });
}

function hurt(o, dmg, b) {
  if (o.t === 'gate') {
    if (o.k !== 'add' || o.pair.used) return false;
    o.acc += dmg;
    const st = Math.max(o.step, curDps() * G.dmgK * 0.45);
    if (o.acc >= st) {
      const inc = Math.floor(o.acc / st);
      o.acc -= inc * st;
      const was = o.v;
      o.v += inc;
      o.bump = 1;
      if (was < 0 && o.v >= 0) emit('gateflip', o);
      emit('gatebump', o);
    }
    return true;
  }
  if (o.dead) return false;
  o.hp -= dmg;
  o.hit = 0.08;
  if (o.hp <= 0) kill(o, b);
  return true;
}

function kill(o, b) {
  o.dead = 1;
  if (o.t === 'en') {
    G.kills++;
    emit('kill', o);
    if (!G.sim) for (let i = 0; i < 6; i++) G.parts.push(part(o.x, o.z, o.h * 0.5, o.k === 'brute' ? '#7bd36a' : o.k === 'runner' ? '#ff6b5a' : o.k === 'shield' ? '#9aa7c7' : '#b07cff', o.k === 'brute' ? 2 : 1.2));
  } else if (o.t === 'bar') {
    emit('boom', o);
    G.shake = Math.max(G.shake, 0.5);
    for (const e of G.objs) {
      if (e.t !== 'en' || e.dead) continue;
      const dx = e.x - o.x, dz = e.z - o.z;
      if (dx * dx + dz * dz < 3.2 * 3.2) hurt(e, o.boom);
    }
    if (G.boss && !G.boss.dead && Math.abs(G.boss.z - o.z) < 4) hurt(G.boss, o.boom * 0.5);
    if (!G.sim) for (let i = 0; i < 26; i++) G.parts.push(part(o.x, o.z, 0.6, i % 3 ? '#ffb347' : '#ff5a36', 2.4, 6));
  } else if (o.t === 'boss') {
    emit('bossdie', o);
    G.shake = 1.2;
    G.endT = 2.2;
    if (!G.sim) for (let i = 0; i < 60; i++) G.parts.push(part(o.x + (Math.random() - 0.5) * o.r * 2, o.z, Math.random() * o.h, i % 2 ? '#ffd166' : '#ff7b54', 3, 7));
  }
}

function updateBullets(dt) {
  const B = G.bullets;
  const O = G.objs;
  for (let i = B.length - 1; i >= 0; i--) {
    const b = B[i];
    const z0 = b.z;
    b.x += b.vx * dt; b.z += b.vz * dt; b.d += BULLET_V * dt;
    if (b.d > BULLET_RANGE || Math.abs(b.x) > ROAD + 3) { B.splice(i, 1); continue; }
    // 找這一步路徑上最近的目標
    let best = null, bz = 1e9;
    for (let j = 0; j < O.length; j++) {
      const o = O[j];
      if (o.dead || o === b.last) continue;
      if (o.t === 'gate') {
        if (o.k !== 'add' || o.pair.used) continue;
        if (o.z < z0 - 0.2 || o.z > b.z + 0.2) continue;
        if (Math.abs(b.x - o.x) > o.w - 0.12) continue;
        if (o.z < bz) { bz = o.z; best = o; }
      } else {
        const rr = o.r * (o.t === 'boss' ? 0.9 : 1);
        if (o.z - rr * 0.6 > b.z || o.z + rr * 0.6 < z0) continue;
        if (Math.abs(b.x - o.x) > rr) continue;
        if (o.intro > 0) continue;
        if (o.z < bz) { bz = o.z; best = o; }
      }
    }
    if (!best) continue;
    let dmg = b.dmg;
    // 盾牌兵正面減傷
    if (best.t === 'en' && best.k === 'shield' && !b.splash && !b.pierce) dmg *= 0.45;
    hurt(best, dmg, b);
    if (!G.sim) G.parts.push({ x: b.x, z: best.z - 0.2, h: best.t === 'gate' ? 1.2 : (best.h || 1) * 0.55, vx: 0, vz: 0, vh: 0, life: 0.12, t: 0, col: WEAPONS[b.wid].col, sz: 1.4, spark: 1 });
    if (b.splash) {
      for (const o of O) {
        if (o === best || o.dead || (o.t !== 'en' && o.t !== 'bar')) continue;
        const dx = o.x - b.x, dz = o.z - best.z;
        if (dx * dx + dz * dz < b.splash * b.splash) hurt(o, b.dmg * 0.6);
      }
      if (!G.sim) { for (let k = 0; k < 6; k++) G.parts.push(part(b.x, best.z, 0.6, '#ffa040', 1.6, 4)); emit('rocket', best); }
    }
    if (b.pierce > 0 && best.t !== 'gate') { b.pierce--; b.last = best; }
    else B.splice(i, 1);
  }
}

function passGate(g) {
  g.pair.used = true;
  const before = G.N;
  let good = true, txt = '';
  if (g.k === 'add') { setN(G.N + g.v, 'gate'); good = g.v >= 0; txt = (g.v >= 0 ? '+' : '−') + Math.abs(g.v); }
  else if (g.k === 'mul') { setN(G.N * g.v, 'gate'); txt = '×' + g.v; }
  else if (g.k === 'div') { setN(Math.ceil(G.N / g.v), 'gate'); good = false; txt = '÷' + g.v; }
  else if (g.k === 'wpn') { G.wid = g.v; txt = WEAPONS[g.v].name; }
  else if (g.k === 'lv') { G.lv = Math.min(LV_MAX, G.lv + 1); txt = '火力 Lv' + G.lv; }
  if (good) G.gatesGood++; else G.gatesBad++;
  floatText(G.px, 1.2, 2.2, txt, good ? '#7fd8ff' : '#ff6b6b', 1.6);
  emit('gate', { g, good, before, after: G.N });
  if (G.N <= 0) lose();
}

function lose() {
  if (G.st !== 'play') return;
  G.st = 'lose';
  G.endT = 1.6;
  emit('lose');
}

function step(dt, input) {
  if (G.st === 'win' || G.st === 'lost') return;
  G.t += dt;
  // 移動
  if (input) {
    if (input.abs != null) G.tx = clamp(input.abs, -PX_MAX, PX_MAX);
    if (input.dx) G.tx = clamp(G.tx + input.dx, -PX_MAX, PX_MAX);
  }
  G.px += clamp(G.tx - G.px, -14 * dt, 14 * dt);

  if (G.st === 'lose' || (G.boss && G.boss.dead)) {
    G.endT -= dt;
    if (G.endT <= 0) G.st = G.st === 'lose' ? 'lost' : 'win';
    if (G.st === 'win') emit('win');
    stepFx(dt);
    return;
  }

  // 捲動
  let v = G.spd;
  if (G.stopAt != null && G.dist >= G.stopAt) { v = 0; G.scroll = false; }
  G.dist += v * dt;
  spawnEvents();

  // 士兵位置
  for (let i = 0; i < G.sold.length; i++) {
    const so = G.sold[i], f = FORM[i];
    so.x += (f.x - so.x) * Math.min(1, dt * 8);
    so.z += (f.z - so.z) * Math.min(1, dt * 8);
    so.ph += dt * (G.scroll ? 11 : 4);
    if (so.pop > 0) so.pop = Math.max(0, so.pop - dt * 4);
    if (so.fl > 0) so.fl -= dt;
  }

  fire(dt);
  updateBullets(dt);

  const cr = crowdR();
  const O = G.objs;
  for (let i = O.length - 1; i >= 0; i--) {
    const o = O[i];
    if (o.hit > 0) o.hit -= dt;
    if (o.t === 'gate') {
      o.z -= v * dt;
      if (o.bump > 0) o.bump = Math.max(0, o.bump - dt * 5);
      if (!o.pair.used && o.z <= 0) {
        const side = G.px < 0 ? -1 : 1;
        if (o.side === side) passGate(o);
      }
      if (o.pair.used) o.fade += dt * 2.5;
      if (o.z < -6) O.splice(i, 1);
    } else if (o.t === 'bar') {
      o.z -= v * dt;
      if (o.dead || o.z < -6) O.splice(i, 1);
    } else if (o.t === 'en') {
      if (o.dead) { O.splice(i, 1); continue; }
      o.z -= (v + o.spd) * dt;
      o.ph += dt * (6 + o.spd * 1.5);
      if (o.z < 32) o.x += clamp(G.px - o.x, -1, 1) * o.home * dt;
      // 和隊伍碰撞
      if (o.z - o.r * 0.5 <= cr.rz && o.z > -cr.rz - 1 && Math.abs(o.x - G.px) <= cr.rx + o.r * 0.6) {
        const loss = Math.max(1, Math.ceil(o.hp / o.sHP * o.mass));
        o.dead = 1;
        O.splice(i, 1);
        G.shake = Math.max(G.shake, Math.min(0.6, 0.15 + loss * 0.02));
        floatText(o.x, 0.5, 1.6, '−' + loss, '#ff6b6b', 1);
        setN(G.N - loss, 'hit');
        emit('hit', { loss });
        if (!G.sim) for (let k = 0; k < 5; k++) G.parts.push(part(o.x, o.z, 0.6, '#d9d9ff', 1.2));
        if (G.N <= 0) { lose(); return; }
        continue;
      }
      if (o.z < -5) O.splice(i, 1);
    } else if (o.t === 'boss') {
      if (o.dead) continue;
      if (o.intro > 0) { o.intro -= dt; o.z -= v * dt; continue; }
      o.ph += dt * 3;
      const reach = cr.rz + o.r * 0.55;
      if (o.z > reach) {
        o.z = Math.max(reach, o.z - (v + o.spd * (o.phase > 1 ? 1.3 : 1)) * dt);
      } else {
        // 攻擊
        o.atkT += dt;
        const per = o.phase > 1 ? 0.7 : 0.9;
        if (o.atkT >= per) {
          o.atkT -= per;
          o.atk = 0.35;
          const loss = Math.max(1, Math.ceil(o.eat * (o.phase > 1 ? 1.15 : 1)));
          G.shake = Math.max(G.shake, 0.45);
          floatText(G.px, 0.8, 2, '−' + loss, '#ff6b6b', 1.2);
          setN(G.N - loss, 'boss');
          emit('slam', { loss });
          if (G.N <= 0) { lose(); return; }
        }
      }
      if (o.atk > 0) o.atk -= dt;
      o.x += clamp(G.px * 0.6 - o.x, -1, 1) * 0.8 * dt;
      if (o.phase === 1 && o.hp < o.max * 0.5) {
        o.phase = 2;
        emit('rage', o);
        // 叫小怪
        for (let k = 0; k < 6; k++) {
          const K = ENEMIES.grunt, hp = o.max * 0.012;
          O.push({ t: 'en', id: _uid++, k: 'grunt', x: o.x + (k - 2.5) * 1.1, z: o.z + 1 + (k % 2), hp, max: hp, r: K.r, h: K.h, spd: K.spd, home: K.home, mass: K.mass, sHP: o.sHP, ph: k, hit: 0, dead: 0 });
        }
      }
    }
  }
  stepFx(dt);
}

function stepFx(dt) {
  if (G.sim) return;
  const P = G.parts;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.t += dt;
    if (p.t >= p.life) { P.splice(i, 1); continue; }
    p.x += p.vx * dt; p.z += p.vz * dt - (G.scroll ? G.spd * dt : 0); p.h += p.vh * dt; p.vh -= 14 * dt;
    if (p.h < 0) { p.h = 0; p.vh *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
  }
  if (P.length > 420) P.splice(0, P.length - 420);
  const F = G.floats;
  for (let i = F.length - 1; i >= 0; i--) { F[i].t += dt; F[i].h += dt * 1.2; if (F[i].t > 1.1) F.splice(i, 1); }
  G.shake = Math.max(0, G.shake - dt * 2.2);
}
