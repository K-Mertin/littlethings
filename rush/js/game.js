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
  const L = genStage(s, opts.seed, opts.gen);
  const up = opts.up || { men: 0, dmg: 0, rate: 0 };
  G = {
    s, L, st: 'play', t: 0, dist: 0, evI: 0, spd: L.spd, scroll: true,
    N: startN(s) + up.men * 2, peak: 0, wid: 'rifle', lv: 1,
    dmgK: 1 + up.dmg * 0.05, rateK: 1 + up.rate * 0.04,
    px: 0, tx: 0,
    sold: [], objs: [], bullets: [], parts: [], floats: [], fx: [], decals: [], q: [],
    fireAcc: 0, shooterI: 0, boss: null, bossDone: false, endT: 0,
    shake: 0, flash: 0, lost: 0, gained: 0, kills: 0, gatesGood: 0, gatesBad: 0,
    hint: null, sim: !!opts.sim,
    rule: L.rule, ice: L.rule === 'ice', vx: 0,
  };
  G.peak = G.N;
  syncSoldiers(true);
  return G;
}

const emit = (name, a) => { if (!G.sim) G.q.push([name, a]); };
const fxOn = () => !G.sim && typeof FX !== 'undefined';

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

// 強化只算一半進難度（強化有幫助，但不會讓關卡變無聊）
function upK() { return Math.sqrt(G.dmgK * G.rateK); }

function mkEnemy(k, x, z, hp, sHP) {
  const K = ENEMIES[k];
  const o = { t: 'en', id: _uid++, k, art: K.art || k, x, z, hp, max: hp, r: K.r, h: K.h, spd: K.spd, home: K.home, mass: K.mass, sHP, ph: Math.random() * 6, hit: 0, dead: 0 };
  if (k === 'thrower') { o.hold = 15 + Math.random() * 6; o.throws = 0; o.throwT = 0.6 + Math.random() * 0.8; }
  return o;
}

// 拋射物（丟丟鬼的炸彈、頭目的石頭）：落點在地上，會跟著地面捲動
function lob(sx, sz, sh, kind, T, dmgF, rad, tx) {
  const v = G.scroll && G.st === 'play' ? G.spd : 0;
  const o = { t: 'lob', id: _uid++, kind, sx, sz, sh, tx: tx == null ? clamp(G.px + (Math.random() - 0.5) * 0.8, -PX_MAX, PX_MAX) : tx, tz: v * T, T, age: 0, dmgF, rad, x: sx, z: sz, h: sh };
  G.objs.push(o);
  emit('throw', o);
  return o;
}

// ---- 事件生成 ----
function spawnEvents() {
  const L = G.L;
  while (G.evI < L.ev.length && L.ev[G.evI].d - G.dist <= ZSPAWN) {
    const e = L.ev[G.evI++];
    const z0 = e.d - G.dist;
    if (e.type === 'gates') {
      if (e.slide) {
        const pair = { id: _uid++, used: false, n: 1 };
        const sl = Object.assign({ cx: 0 }, e.slide);
        G.objs.push({ t: 'gate', id: _uid++, pair, side: 0, x: sl.cx + sl.amp * Math.sin(G.t * sl.f + sl.ph), w: 1.45, z: z0, k: e.L.k, v: e.L.v, acc: 0, step: e.step, bump: 0, fade: 0, slide: sl });
      } else {
        const pair = { id: _uid++, used: false, n: 2 };
        for (const side of [-1, 1]) {
          const r = e.roul ? e.roul[side < 0 ? 0 : 1] : null;
          const g = r ? r.vals[0] : side < 0 ? e.L : e.R;
          const o = { t: 'gate', id: _uid++, pair, side, x: side * ROAD / 2, w: ROAD / 2, z: z0, k: g.k, v: g.v, acc: 0, step: e.step, bump: 0, fade: 0 };
          if (r) o.roul = { vals: r.vals, per: r.per, i: 0, t: side < 0 ? 0 : r.per * 0.5 };
          G.objs.push(o);
        }
      }
    } else if (e.type === 'wall') {
      const f = clamp(Math.pow(curDps() * upK() / (e.sHP * Math.max(1, e.expN || 1)), 0.6), 0.5, 3);
      const hp = e.hp * f;
      G.objs.push({ t: 'wall', id: _uid++, x: 0, z: z0, hp, max: hp, rw: e.rw, sHP: curDps() / Math.max(1, G.N), r: ROAD, hit: 0 });
    } else if (e.type === 'saw') {
      for (const m of e.list) G.objs.push({ t: 'saw', id: _uid++, cx: m.cx, amp: m.amp, f: m.f, ph: m.ph, x: m.cx, z: z0 + m.dz, r: 0.72, tick: 0, spin: 0 });
    } else if (e.type === 'spike') {
      for (const m of e.list) G.objs.push({ t: 'spike', id: _uid++, x0: m.x0, x1: m.x1, x: (m.x0 + m.x1) / 2, z: z0 + m.dz, len: 2.6, per: m.per, ph: m.ph, hitC: -1 });
    } else if (e.type === 'wave') {
      // 依目前實力調整（選得好還是比較強，但不會無聊）
      const f = clamp(Math.pow(curDps() * upK() / e.exp, 0.6), 0.5, 3);
      const sHP = curDps() / Math.max(1, G.N);
      for (const m of e.list) {
        const K = ENEMIES[m.k];
        const hp = m.hp * f;
        G.objs.push(mkEnemy(m.k, m.x, z0 + m.dz, hp, sHP));
      }
      if (e.crates) for (const c of e.crates) G.objs.push({ t: 'crate', id: _uid++, x: c.x, z: z0 + c.dz, hp: c.hp * f, max: c.hp * f, rw: c.rw, r: 0.5, hit: 0 });
      if (e.barrels) for (const b of e.barrels) G.objs.push({ t: 'bar', id: _uid++, x: b.x, z: z0 + b.dz, hp: b.hp * f, max: b.hp * f, boom: b.boom * f, r: 0.55, hit: 0 });
    } else if (e.type === 'boss') {
      const B = BOSSES[e.k];
      const sc = 1 + e.tier * 0.12;
      const f = clamp(Math.pow(curDps() * upK() / e.exp, 0.8), 0.5, 4);
      const hp = e.hp * f;
      G.boss = { t: 'boss', id: _uid++, k: e.k, tier: e.tier, x: 0, z: Math.min(z0, 34), hp, max: hp, r: B.r * sc, h: B.h * sc, spd: 2.5, eat: Math.max(1, G.N * 0.045), sHP: curDps() / Math.max(1, G.N), atk: 0, atkT: 0, phase: 1, hit: 0, ph: 0, intro: 2.2, dead: 0 };
      G.objs.push(G.boss);
      G.stopAt = G.dist + 6;
      emit('boss', G.boss);
    }
  }
}

// 頭目丟的東西
const BOSS_MOVES = {
  golem:    { kind: 'rock',    every: 3.4, n: 1 },
  scorpion: { kind: 'poison',  every: 2.9, n: 1 },
  yeti:     { kind: 'ice',     every: 3.2, n: 2 },
  mech:     { kind: 'missile', every: 3.3, n: 2 },
};

// ---- 射擊 ----
// 射擊範圍：外側士兵往外偏 FAN_A 弧度；每發再隨機偏 ±AIM_JIT
const FAN_W = 1.6, FAN_A = 0.07, AIM_JIT = 0.035, BULLET_R = 0.5;

function fire(dt) {
  if (G.N <= 0 || !G.sold.length) return;
  const w = WEAPONS[G.wid];
  const shooters = Math.min(G.sold.length, MAX_SHOOTERS);
  const rate = w.rate * G.rateK;
  G.fireAcc += dt * rate * shooters;
  const per = w.dmg * lvMult(G.lv) * G.dmgK * G.N / shooters;
  let n = 0;
  while (G.fireAcc >= 1 && n < 40) {
    G.fireAcc -= 1; n++;
    const S = G.sold;
    const idx = (G.shooterI++ * 7) % S.length;
    const so = S[idx];
    const bx = G.px + so.x, bz = so.z + 0.35;
    // 不鎖定目標：每個士兵朝自己前方開槍，隊伍外側稍微往外散開，蓋住部隊前方一整片
    const a0 = so.x / FAN_W * FAN_A + (Math.random() - 0.5) * 2 * AIM_JIT;
    for (let k = 0; k < w.n; k++) {
      const a = a0 + (w.n > 1 ? (k - (w.n - 1) / 2) * w.spread + (Math.random() - 0.5) * 0.03 : (Math.random() - 0.5) * w.spread);
      G.bullets.push({ x: bx, z: bz, vx: Math.sin(a) * BULLET_V, vz: Math.cos(a) * BULLET_V, dmg: per, pierce: w.pierce, splash: w.splash, wid: G.wid, d: 0, last: 0 });
    }
    so.fl = 0.06;
    if (fxOn()) FX.shot(so, G.wid, G.bullets[G.bullets.length - 1]);
  }
  if (n) emit('shot', { wid: G.wid, n });
}

function hurt(o, dmg, b) {
  if (o.t === 'gate') {
    if (o.k !== 'add' || o.pair.used || o.roul) return false;
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
    if (fxOn()) FX.kill(o);
    if (o.k === 'splitter') {
      for (let k = 0; k < 3; k++) G.objs.push(mkEnemy('mini', clamp(o.x + (k - 1) * 0.8, -PX_MAX, PX_MAX), o.z + 0.3 + (k % 2) * 0.5, o.max * 0.28, o.sHP));
      emit('split', o);
    }
  } else if (o.t === 'wall' || o.t === 'crate') {
    const r = applyGate(o.rw, true);
    floatText(o.t === 'wall' ? G.px : o.x, o.z, o.t === 'wall' ? 2.4 : 1.6, (o.t === 'wall' ? '破牆！' : '') + r.txt, '#ffe066', o.t === 'wall' ? 1.5 : 1.1);
    emit(o.t === 'wall' ? 'wallbreak' : 'crate', o);
    if (fxOn()) FX[o.t === 'wall' ? 'wallbreak' : 'crate'](o);
  } else if (o.t === 'bar') {
    emit('boom', o);
    G.shake = Math.max(G.shake, 0.5);
    for (const e of G.objs) {
      if (e.t !== 'en' || e.dead) continue;
      const dx = e.x - o.x, dz = e.z - o.z;
      if (dx * dx + dz * dz < 3.2 * 3.2) hurt(e, o.boom);
    }
    if (G.boss && !G.boss.dead && Math.abs(G.boss.z - o.z) < 4) hurt(G.boss, o.boom * 0.5);
    if (fxOn()) FX.boom(o.x, o.z, 1.6);
  } else if (o.t === 'boss') {
    emit('bossdie', o);
    G.shake = 1.2;
    G.endT = 2.2;
    if (fxOn()) FX.bossdie(o);
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
      if (o.t === 'saw' || o.t === 'spike' || o.t === 'lob') continue;
      if (o.t === 'wall') {
        if (o.z < z0 - 0.2 || o.z > b.z + 0.2) continue;
        if (o.z < bz) { bz = o.z; best = o; }
        continue;
      }
      if (o.t === 'gate') {
        if (o.k !== 'add' || o.pair.used || o.roul) continue;
        if (o.z < z0 - 0.2 || o.z > b.z + 0.2) continue;
        if (Math.abs(b.x - o.x) > o.w - 0.12) continue;
        if (o.z < bz) { bz = o.z; best = o; }
      } else {
        const rr = o.r * (o.t === 'boss' ? 0.9 : 1) + BULLET_R;
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
    if (fxOn()) FX.hit(b, best, dmg);
    if (b.splash) {
      for (const o of O) {
        if (o === best || o.dead || (o.t !== 'en' && o.t !== 'bar')) continue;
        const dx = o.x - b.x, dz = o.z - best.z;
        if (dx * dx + dz * dz < b.splash * b.splash) hurt(o, b.dmg * 0.6);
      }
      if (fxOn()) { FX.boom(b.x, best.z, 0.8, true); emit('rocket', best); }
    }
    if (b.pierce > 0 && best.t !== 'gate' && best.t !== 'wall') { b.pierce--; b.last = best; }
    else B.splice(i, 1);
  }
}

function applyGate(g, reward) {
  let good = true, txt = '';
  if (g.k === 'add') { setN(G.N + g.v, 'gate'); good = g.v >= 0; txt = (g.v >= 0 ? '+' : '−') + Math.abs(g.v); }
  else if (g.k === 'mul') { setN(G.N * g.v, 'gate'); txt = '×' + g.v; }
  else if (g.k === 'div') { setN(Math.ceil(G.N / g.v), 'gate'); good = false; txt = '÷' + g.v; }
  else if (g.k === 'wpn') { G.wid = g.v; txt = WEAPONS[g.v].name; }
  else if (g.k === 'lv') { G.lv = Math.min(LV_MAX, G.lv + 1); txt = '火力 Lv' + G.lv; }
  return { good, txt };
}

function passGate(g) {
  g.pair.used = true;
  const before = G.N;
  const { good, txt } = applyGate(g);
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
  if (G.ice) {
    // 冰面：像彈簧一樣，會滑過頭一點
    G.vx += (22 * (G.tx - G.px) - 3.2 * G.vx) * dt;
    G.vx = clamp(G.vx, -11, 11);
    G.px = clamp(G.px + G.vx * dt, -PX_MAX, PX_MAX);
  } else G.px += clamp(G.tx - G.px, -14 * dt, 14 * dt);

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
      if (o.slide && !o.pair.used) o.x = o.slide.cx + o.slide.amp * Math.sin(G.t * o.slide.f + o.slide.ph);
      if (o.roul && !o.pair.used) {
        const r = o.roul;
        r.t += dt;
        if (r.t >= r.per) { r.t -= r.per; r.i = (r.i + 1) % r.vals.length; o.k = r.vals[r.i].k; o.v = r.vals[r.i].v; o.bump = 0.5; emit('roul', o); }
      }
      if (!o.pair.used && o.z <= 0) {
        if (o.pair.n === 1) {
          if (Math.abs(G.px - o.x) <= o.w + 0.15) passGate(o);
          else { o.pair.used = true; floatText(G.px, 1.2, 2.2, '錯過了', '#c9d3e6', 1.1); emit('miss', o); }
        } else {
          const side = G.px < 0 ? -1 : 1;
          if (o.side === side) passGate(o);
        }
      }
      if (o.pair.used) o.fade += dt * 2.5;
      if (o.z < -6) O.splice(i, 1);
    } else if (o.t === 'bar' || o.t === 'crate') {
      o.z -= v * dt;
      if (o.dead || o.z < -6) O.splice(i, 1);
    } else if (o.t === 'wall') {
      if (o.dead) { O.splice(i, 1); continue; }
      o.z -= v * dt;
      if (o.z <= cr.rz + 0.2) {
        const loss = Math.max(1, Math.ceil(o.hp / o.sHP * 0.7));
        O.splice(i, 1);
        G.shake = Math.max(G.shake, 0.6);
        floatText(G.px, 0.6, 2, '撞牆 −' + loss, '#ff6b6b', 1.2);
        setN(G.N - loss, 'wall');
        emit('wallhit', { loss });
        if (fxOn()) FX.wallbreak(o);
        if (G.N <= 0) { lose(); return; }
      }
    } else if (o.t === 'saw') {
      o.z -= v * dt;
      o.x = o.cx + o.amp * Math.sin(G.t * o.f + o.ph);
      o.spin += dt * 14;
      if (Math.abs(o.z) < cr.rz + 0.35 && Math.abs(o.x - G.px) < cr.rx + o.r * 0.75) {
        o.tick -= dt;
        if (o.tick <= 0) {
          o.tick = 0.3;
          const loss = Math.max(1, Math.ceil(G.N * 0.06));
          floatText(o.x, 0.4, 1.4, '−' + loss, '#ff6b6b', 0.9);
          setN(G.N - loss, 'saw');
          emit('saw', { loss, o });
          if (G.N <= 0) { lose(); return; }
        }
      } else o.tick = 0;
      if (o.z < -6) O.splice(i, 1);
    } else if (o.t === 'spike') {
      o.z -= v * dt;
      const c = (G.t + o.ph) % o.per, idx = Math.floor((G.t + o.ph) / o.per);
      o.up = c < o.per * 0.42;
      o.warn = !o.up && c > o.per - 0.45;
      if (o.up && idx !== o.hitC && cr.rz > o.z - 0.1 && -cr.rz < o.z + o.len && G.px + cr.rx > o.x0 && G.px - cr.rx < o.x1) {
        o.hitC = idx;
        const loss = Math.max(1, Math.ceil(G.N * 0.12)) + 1;
        floatText(G.px, 0.5, 1.6, '−' + loss, '#ff6b6b', 1.1);
        setN(G.N - loss, 'spike');
        emit('spike', { loss });
        G.shake = Math.max(G.shake, 0.35);
        if (G.N <= 0) { lose(); return; }
      }
      if (o.z + o.len < -6) O.splice(i, 1);
    } else if (o.t === 'lob') {
      o.sz -= v * dt; o.tz -= v * dt;
      o.age += dt;
      const q = Math.min(1, o.age / o.T);
      o.x = lerp(o.sx, o.tx, q); o.z = lerp(o.sz, o.tz, q); o.h = lerp(o.sh, 0, q) + 5 * q * (1 - q);
      if (o.age >= o.T) {
        O.splice(i, 1);
        if (fxOn()) FX.boom(o.tx, o.tz, o.rad * 0.7, true);
        emit('land', o);
        // 只炸到落點附近的士兵：正中間全傷害，擦邊少一點
        const dd = Math.abs(G.px - o.tx);
        const cov = Math.abs(o.tz) <= o.rad + cr.rz ? clamp((o.rad + cr.rx * 0.35 - dd) / o.rad, 0, 1) : 0;
        if (cov > 0) {
          const loss = Math.max(1, Math.ceil(G.N * o.dmgF * cov) + (cov > 0.6 ? 1 : 0));
          floatText(o.tx, 0.6, 1.8, '−' + loss, '#ff6b6b', 1.2);
          setN(G.N - loss, 'lob');
          emit('hit', { loss });
          G.shake = Math.max(G.shake, 0.5);
          if (G.N <= 0) { lose(); return; }
        }
      }
    } else if (o.t === 'en') {
      if (o.dead) { O.splice(i, 1); continue; }
      if (o.k === 'thrower' && o.throws < 3 && o.z <= o.hold) {
        // 停在前面丟炸彈（跟著部隊一起往前），丟完三顆才衝過來
        o.ph += dt * 3;
        o.throwT -= dt;
        if (o.throwT <= 0) { o.throwT = 1.9; o.throws++; o.atk = 0.3; lob(o.x, o.z - 0.3, 1.4, 'bomb', 1.25, 0.06, 1.05); }
        if (o.atk > 0) o.atk -= dt;
        o.x += clamp(G.px - o.x, -1, 1) * 0.6 * dt;
      } else {
        o.z -= (v + o.spd) * dt;
        o.ph += dt * (6 + o.spd * 1.5);
      }
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
        if (fxOn()) FX.crowdHit(o, loss);
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
          if (fxOn()) FX.slam(o);
          if (G.N <= 0) { lose(); return; }
        }
      }
      if (o.atk > 0) o.atk -= dt;
      // 丟東西：地上會出現紅圈，閃開就好
      o.lobT = (o.lobT == null ? 1.8 : o.lobT) - dt;
      if (o.lobT <= 0 && o.z < 36) {
        const B = BOSS_MOVES[o.k];
        o.lobT = B.every * (o.phase > 1 ? 0.75 : 1) * (o.z <= cr.rz + o.r * 0.6 ? 1.5 : 1);
        const n = B.n + (o.phase > 1 && o.tier >= 1 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const tx = n === 1 ? undefined : clamp(G.px + (k - (n - 1) / 2) * 1.9 + (Math.random() - 0.5) * 0.4, -PX_MAX, PX_MAX);
          lob(o.x + (k - (n - 1) / 2) * 0.8, o.z - 0.5, o.h * 0.8, B.kind, 1.35 + k * 0.12, 0.07, 1.2, tx);
        }
        o.throwA = 0.4;
      }
      if (o.throwA > 0) o.throwA -= dt;
      // 重擊（第 5 關以後的狂暴階段）：地上出現紅色長條，站在裡面會被打到
      if (o.phase > 1 && G.s >= 5) {
        if (!o.strike) {
          o.strT = (o.strT == null ? 1.5 : o.strT) - dt;
          if (o.strT <= 0) { o.strike = { x: clamp(G.px, -PX_MAX + 0.6, PX_MAX - 0.6), t: 1.05 }; emit('strikewarn', o); }
        } else {
          o.strike.t -= dt;
          if (o.strike.t <= 0) {
            const sx = o.strike.x;
            o.strike = null; o.strT = 5.2; o.atk = 0.35;
            G.shake = Math.max(G.shake, 0.8);
            emit('strike', o);
            if (fxOn()) FX.strike(sx, o.z);
            if (Math.abs(G.px - sx) <= 1.25 + cr.rx * 0.5) {
              const loss = Math.max(1, Math.ceil(G.N * 0.18)) + 2;
              floatText(G.px, 0.8, 2.2, '−' + loss, '#ff6b6b', 1.4);
              setN(G.N - loss, 'strike');
              if (G.N <= 0) { lose(); return; }
            }
          }
        }
      }
      o.x += clamp((o.strike ? o.strike.x : G.px) * 0.6 - o.x, -1, 1) * 0.8 * dt;
      if (o.phase === 1 && o.hp < o.max * 0.5) {
        o.phase = 2;
        emit('rage', o);
        // 叫小怪
        for (let k = 0; k < 6; k++) {
          const K = ENEMIES.grunt, hp = o.max * 0.012;
          O.push({ t: 'en', id: _uid++, k: 'grunt', x: clamp(o.x + (k - 2.5) * 1.3, -PX_MAX, PX_MAX), z: Math.max(2.5, o.z - o.r * 0.6 - 0.8 - (k % 2) * 0.9), hp, max: hp, r: K.r, h: K.h, spd: K.spd, home: K.home, mass: K.mass, sHP: o.sHP, ph: k, hit: 0, dead: 0 });
        }
      }
    }
  }
  stepFx(dt);
}

function stepFx(dt) {
  if (G.sim) return;
  if (typeof FX !== 'undefined') FX.update(dt);
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
