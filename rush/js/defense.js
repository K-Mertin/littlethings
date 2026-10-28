// 千軍突圍 — 守城模式：砲台不往前跑，一直射出小兵，穿過門變多，去打迎面來的怪物和敵方基地
'use strict';

const DEF_Z_BASE = 46;    // 敵方基地位置
const DEF_Z_CANNON = -1.2;
const DEF_UNIT_CAP = 420;
const DEF_UNIT_SPD = 7.5;

const DSTAGES = [
  { name: '草原前哨', theme: 0, rows: 1, slide: 0, red: 0, lvl: 1 },
  { name: '風車防線', theme: 0, rows: 2, slide: 0, red: 0, lvl: 2 },
  { name: '沙丘堡壘', theme: 1, rows: 2, slide: 1, red: 0, lvl: 3 },
  { name: '峽谷關卡', theme: 1, rows: 2, slide: 1, red: 1, lvl: 4 },
  { name: '冰原要塞', theme: 2, rows: 3, slide: 1, red: 1, lvl: 5 },
  { name: '暴風雪', theme: 2, rows: 3, slide: 2, red: 1, lvl: 6 },
  { name: '霓虹基地', theme: 3, rows: 3, slide: 2, red: 2, lvl: 7 },
  { name: '魔王城', theme: 3, rows: 3, slide: 2, red: 2, lvl: 8 },
];

// 砲台一次射出一小隊（3 個人）。門是對「整隊」算的：
// ×2 讓整隊變兩倍，+6 讓整隊多 6 個人，所以隊伍越大，乘法門越划算。
const DEF_SQUAD = 3;
function defApply(S, g) { return g.k === 'mul' ? S * g.v : g.k === 'add' ? S + g.v : g.k === 'kill' ? 0 : S; }

function genDefense(n, seed) {
  const D = DSTAGES[n - 1];
  const R = rng(seed || n * 4241 + 77);
  const pick = a => a[Math.floor(R() * a.length)];
  const gates = [];
  const rowZ = D.rows === 1 ? [18] : D.rows === 2 ? [13, 24] : [11, 20, 29];
  let slides = D.slide, reds = D.red;
  rowZ.forEach((z, ri) => {
    // 每排 2～3 扇門，中間有空隙
    const cnt = D.rows === 1 ? 2 : R() < 0.5 ? 2 : 3;
    const xs = cnt === 2 ? [-1.9, 1.9] : [-2.7, 0, 2.7];
    const w = cnt === 2 ? 1.25 : 0.95;
    const opts = ri === 0 ? [{ k: 'mul', v: 2 }, { k: 'add', v: 4 }, { k: 'add', v: 5 }] : ri === 1 ? [{ k: 'mul', v: 2 }, { k: 'mul', v: 3 }, { k: 'add', v: 6 }, { k: 'add', v: 8 }] : [{ k: 'mul', v: 2 }, { k: 'mul', v: 3 }, { k: 'add', v: 10 }, { k: 'add', v: 15 }];
    xs.forEach((x, i) => {
      let g = n === 1 ? [{ k: 'mul', v: 2 }, { k: 'add', v: 5 }][i] : pick(opts);
      if (reds > 0 && i === cnt - 1 && ri > 0 && R() < 0.7) { g = { k: 'kill', v: 0 }; reds--; }
      const o = { t: 'gate', id: _uid++, x, w, z, k: g.k, v: g.v, pair: { used: false, n: 1 }, fade: 0, bump: 0, acc: 0 };
      if (slides > 0 && (g.k !== 'kill' || D.lvl >= 7) && i === 0 && R() < 0.8) { o.slide = { cx: 0, amp: 4.2 - w - 0.3, f: 0.6 + R() * 0.4, ph: R() * 6 }; slides--; }
      gates.push(o);
    });
  });
  // 預期：好好瞄準時每秒能送出多少小兵
  const rate = 5;
  let best = 1;
  for (let x = -3.4; x <= 3.4; x += 0.2) best = Math.max(best, defPathGain(gates, x, 0));
  const E = rate * Math.pow(Math.min(best, 30), 0.75) * 0.75;
  const lv = D.lvl;
  return {
    n, name: D.name, theme: THEMES[D.theme], gates, E, lv,
    baseHp: Math.round(E * (30 + lv * 3)),
    castle: 15,
    flow: E * (0.5 + lv * 0.055),   // 怪物每秒的血量
    dur: 0,
  };
}

// 從 x 直直往前，一隊會變成原本的幾倍（看當下門的位置）
function defPathGain(gates, x, t) {
  let S = DEF_SQUAD;
  const gs = gates.slice().sort((a, b) => a.z - b.z);
  for (const g of gs) {
    const gx = g.slide ? g.slide.cx + g.slide.amp * Math.sin(t * g.slide.f + g.slide.ph) : g.x;
    if (Math.abs(x - gx) <= g.w) S = defApply(S, g);
  }
  return S / DEF_SQUAD;
}

function newDefense(n, opts) {
  opts = opts || {};
  const L = genDefense(n, opts.seed);
  const up = opts.up || { men: 0, dmg: 0, rate: 0 };
  G = {
    mode: 'defense', s: n, L, st: 'play', t: 0, dist: 0, spd: 0, scroll: false,
    px: 0, tx: 0, vx: 0,
    units: [], objs: L.gates.slice(), parts: [], floats: [], fx: [], decals: [], q: [], bullets: [], sold: [],
    fireAcc: 0, rate: 5 * (1 + up.rate * 0.04), pow: 1 + up.dmg * 0.05,
    castle: L.castle + up.men, castleMax: L.castle + up.men,
    base: { t: 'base', hp: L.baseHp, max: L.baseHp, hit: 0, rage: false, x: 0, z: DEF_Z_BASE },
    spawnAcc: 0, waveT: 2.5, waveN: 0, giant: 0, giantMax: 90, sqId: 0,
    shake: 0, flash: 0, kills: 0, sent: 0, peak: 0, endT: 0, sim: !!opts.sim,
    rule: 'none', N: 0, lost: 0,
  };
  return G;
}

function defEnemy(k, x, z, hp) {
  const K = ENEMIES[k];
  return { t: 'en', id: _uid++, k, art: K.art || k, x, z, hp, max: hp, r: K.r, h: K.h, spd: K.spd * 0.62 + 0.4, mass: 1, ph: Math.random() * 6, hit: 0, dead: 0, pow: k === 'brute' ? 4 : k === 'shield' ? 2 : 1 };
}

// 一波怪物：總血量依時間與關卡增加
function defWave() {
  const L = G.L, lv = L.lv;
  G.waveN++;
  const ramp = 1 + Math.min(1.2, G.t / 70) + (G.base.rage ? 0.35 : 0);
  const hpBudget = L.flow * G.waveT * ramp;
  const kinds = [];
  let w = 0;
  const add = (k, hk) => { kinds.push(k); w += hk; };
  const big = lv >= 2 && G.waveN % 3 === 0;
  if (big) add('brute', 8);
  if (lv >= 3 && Math.random() < 0.5) add('shield', 3);
  if (lv >= 4 && Math.random() < 0.4) add('splitter', 3);
  const nSmall = 5 + Math.floor(Math.random() * 4) + lv;
  for (let i = 0; i < nSmall; i++) add(Math.random() < 0.25 && lv >= 2 ? 'runner' : 'grunt', 1);
  const unit = hpBudget / w;
  const cx = (Math.random() * 2 - 1) * 2.4;
  kinds.forEach((k, i) => {
    const hk = k === 'brute' ? 8 : k === 'shield' || k === 'splitter' ? 3 : 1;
    const x = clamp(cx + (Math.random() - 0.5) * 3.2, -PX_MAX, PX_MAX);
    G.objs.push(defEnemy(k, x, DEF_Z_BASE - 2 - (i % 4) * 0.9 - Math.random(), Math.max(1, Math.round(unit * hk))));
  });
  emit('dwave', { n: G.waveN });
}

// 巨魔兵：基地半血時派出來，很耐打，撞到城扣很多
function defBoss() {
  if (G.L.lv < 2) return;
  const o = defEnemy('brute', (Math.random() - 0.5) * 2, DEF_Z_BASE - 2.5, Math.round(G.L.E * (5 + G.L.lv * 0.8)));
  o.h *= 1.9; o.r *= 1.7; o.pow = 6; o.spd *= 0.7; o.boss = 1;
  G.objs.push(o);
  emit('dboss', o);
}

function defFireUnit(giant, sq, k) {
  if (G.units.length >= DEF_UNIT_CAP && !giant) return;
  const off = k == null ? 0 : (k - 1) * 0.32;
  const u = { x: G.px + off + (Math.random() - 0.5) * 0.12, vx: (Math.random() - 0.5) * 0.4, z: DEF_Z_CANNON + 0.6 - (k || 0) % 2 * 0.25, ph: Math.random() * 6, v: (Math.random() * 3) | 0, gates: 0, pop: 0.6, sq };
  if (giant) { u.giant = 1; u.hp = 24 * G.pow; u.r = 0.62; u.spd = 4.2; }
  else { u.hp = G.pow; u.r = 0.22; u.spd = DEF_UNIT_SPD; }
  G.units.push(u);
  if (sq) sq.size++;
  G.sent++;
  return u;
}
// 一次射一隊
function defFireSquad() {
  const sq = { id: ++G.sqId, size: 0, used: 0 };
  let n = 0;
  for (let k = 0; k < DEF_SQUAD; k++) if (defFireUnit(false, sq, k)) n++;
  return n;
}

function defLaunchGiant() {
  if (G.mode !== 'defense' || G.st !== 'play' || G.giant < G.giantMax) return false;
  G.giant = 0;
  defFireUnit(true);
  emit('giant');
  return true;
}

function defStep(dt, input) {
  if (G.st === 'win' || G.st === 'lost') return;
  G.t += dt;
  if (input && input.abs != null) G.tx = clamp(input.abs, -PX_MAX, PX_MAX);
  G.px += clamp(G.tx - G.px, -12 * dt, 12 * dt);
  if (G.st !== 'play') {
    G.endT -= dt;
    if (G.endT <= 0) G.st = G.st === 'lose' ? 'lost' : 'win';
    if (G.st === 'win') emit('win');
    stepFx(dt);
    defUnitsMove(dt, true);
    return;
  }
  // 發射：每次一小隊
  G.fireAcc += dt * G.rate / DEF_SQUAD;
  let shots = 0;
  while (G.fireAcc >= 1) { G.fireAcc -= 1; shots += defFireSquad(); G.giant = Math.min(G.giantMax, G.giant + DEF_SQUAD); }
  if (shots) emit('dshot', { n: shots });
  // 門移動
  for (const o of G.objs) if (o.t === 'gate') {
    if (o.slide) o.x = o.slide.cx + o.slide.amp * Math.sin(G.t * o.slide.f + o.slide.ph);
    if (o.bump > 0) o.bump = Math.max(0, o.bump - dt * 5);
  }
  // 怪物出生
  G.waveT = Math.max(2.2, 3.4 - G.L.lv * 0.12);
  G.spawnAcc += dt;
  if (G.spawnAcc >= G.waveT) { G.spawnAcc -= G.waveT; defWave(); }
  defUnitsMove(dt, false);
  // 怪物前進
  const O = G.objs;
  for (let i = O.length - 1; i >= 0; i--) {
    const o = O[i];
    if (o.t !== 'en') continue;
    if (o.hit > 0) o.hit -= dt;
    if (o.dead) { O.splice(i, 1); continue; }
    o.z -= o.spd * dt;
    o.ph += dt * (5 + o.spd);
    // 看到附近有小兵就衝過去打（兩邊的人會撞在一起）
    let tx = null, bd = 1e9;
    for (let k = 0; k < G.units.length; k += 3) {
      const u = G.units[k], dz = o.z - u.z, dx = u.x - o.x;
      if (dz < -0.5 || dz > 5) continue;
      const dd = Math.abs(dx) + dz * 0.5;
      if (Math.abs(dx) < 2.6 && dd < bd) { bd = dd; tx = u.x; }
    }
    if (tx != null) o.x += clamp(tx - o.x, -1, 1) * 1.6 * dt;
    else o.x += Math.sin(G.t * 0.8 + o.id) * 0.25 * dt;
    if (o.z <= 0.2) {
      O.splice(i, 1);
      G.castle -= o.pow;
      G.shake = Math.max(G.shake, 0.35 + o.pow * 0.05);
      G.flash = Math.max(G.flash, 0.5);
      floatText(o.x, 0.6, 1.4, '−' + o.pow, '#ff6b6b', 1);
      if (fxOn()) FX.crowdHit(o, o.pow);
      emit('castlehit', { pow: o.pow });
      if (G.castle <= 0) { G.castle = 0; G.st = 'lose'; G.endT = 1.8; emit('lose'); return; }
    }
  }
  if (G.base.hit > 0) G.base.hit -= dt;
  stepFx(dt);
}

function defUnitGone(u) { if (u.sq) u.sq.size = Math.max(0, u.sq.size - 1); }

function defUnitsMove(dt, endOnly) {
  const U = G.units, O = G.objs;
  const gates = O.filter(o => o.t === 'gate');
  const ens = O.filter(o => o.t === 'en' && !o.dead);
  for (let i = U.length - 1; i >= 0; i--) {
    const u = U[i];
    const z0 = u.z;
    u.z += u.spd * dt;
    if (u.vx) { u.x = clamp(u.x + u.vx * dt, -ROAD + 0.3, ROAD - 0.3); u.vx *= Math.pow(0.5, dt); }
    u.ph += dt * 12;
    if (u.pop > 0) u.pop = Math.max(0, u.pop - dt * 3);
    if (endOnly) { if (u.z > DEF_Z_BASE + 2) U.splice(i, 1); continue; }
    // 穿過門
    if (!u.giant) for (let k = 0; k < gates.length; k++) {
      const g = gates[k];
      if (z0 < g.z && u.z >= g.z && Math.abs(u.x - g.x) <= g.w && !(u.gates & (1 << k))) {
        u.gates |= 1 << k;
        if (g.k === 'kill') { U.splice(i, 1); defUnitGone(u); emit('unitdie'); if (fxOn() && Math.random() < 0.4) FX.add({ k: 'spark', x: u.x, z: g.z, h: 0.6, life: 0.12, size: 0.6, fl: 'o', rot: 0 }); break; }
        const sq = u.sq;
        if (!sq || (sq.used & (1 << k))) continue;   // 這一隊已經算過這扇門了
        sq.used |= 1 << k;
        const before = sq.size;
        const extra = Math.max(0, Math.round(defApply(before, g)) - before);
        let made = 0;
        for (let c = 0; c < extra && U.length < DEF_UNIT_CAP; c++) {
          const nu = { x: clamp(u.x + ((c % 6) - 2.5) * 0.3, g.x - g.w + 0.1, g.x + g.w - 0.1), vx: (Math.random() - 0.5) * 1.4, z: u.z + 0.05 + Math.floor(c / 6) * 0.3, ph: Math.random() * 6, v: (Math.random() * 3) | 0, gates: u.gates, pop: 1, hp: u.hp, r: u.r, spd: u.spd, sq };
          U.push(nu); made++;
        }
        sq.size += made;
        if (made > 0) { g.bump = 0.6; emit('mult', { g }); if (!G.sim && G.t - (g.ftT || -9) > 0.9) { g.ftT = G.t; floatText(g.x, g.z, 3.3, `${before}→${before + made}`, '#ffffff', 0.55); } }
      }
    }
    if (U[i] !== u) continue;
    // 撞到怪物
    let hitE = null;
    for (const e of ens) {
      if (e.dead) continue;
      if (Math.abs(e.z - u.z) < 0.45 + e.r * 0.4 && Math.abs(e.x - u.x) < e.r + u.r) { hitE = e; break; }
    }
    if (hitE) {
      const d = Math.min(u.hp, hitE.hp);
      hitE.hp -= d; u.hp -= d; hitE.hit = 0.08;
      if (hitE.hp <= 0.001) {
        hitE.dead = 1; G.kills++;
        emit('kill', hitE);
        if (fxOn()) FX.kill(hitE);
        if (hitE.k === 'splitter') for (let c = 0; c < 3; c++) G.objs.push(defEnemy('mini', clamp(hitE.x + (c - 1) * 0.7, -PX_MAX, PX_MAX), hitE.z + 0.4, Math.max(1, Math.round(hitE.max * 0.25))));
      }
      if (u.hp <= 0.001) { U.splice(i, 1); defUnitGone(u); continue; }
    }
    // 打到基地
    if (u.z >= DEF_Z_BASE - 1.2) {
      const b = G.base;
      b.hp -= u.hp; b.hit = 0.1;
      U.splice(i, 1); defUnitGone(u);
      emit('basehit', { d: u.hp, giant: !!u.giant });
      if (fxOn() && Math.random() < (u.giant ? 1 : 0.2)) FX.add({ k: 'spark', x: u.x, z: DEF_Z_BASE - 1.4, h: 0.5 + Math.random() * 2.5, life: 0.12, size: u.giant ? 2 : 0.8, fl: 'y', rot: Math.random() * 3 });
      if (u.giant && fxOn()) FX.boom(u.x, DEF_Z_BASE - 1.4, 1.2);
      if (!b.rage && b.hp < b.max * 0.5) { b.rage = true; emit('baserage'); defBoss(); }
      if (b.hp <= 0 && G.st === 'play') {
        b.hp = 0; G.st = 'winning'; G.endT = 2.6; G.shake = 1.2;
        for (const e of G.objs) if (e.t === 'en' && !e.dead) { e.dead = 1; if (fxOn()) FX.kill(e); }
        if (fxOn()) { FX.bossdie({ x: 0, z: DEF_Z_BASE, r: 3, h: 4, k: 'base' }); }
        emit('bossdie', b);
      }
    }
  }
  G.N = U.length;
  if (G.N > G.peak) G.peak = G.N;
}
