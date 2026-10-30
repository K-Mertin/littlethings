// 萬軍守城 — 遊戲邏輯：砲台不往前跑，一直射出小兵，穿過門變多，去打迎面來的怪物和敵方基地
'use strict';

const DEF_Z_BASE = 46;    // 敵方基地位置
const DEF_Z_CANNON = -1.2;
const DEF_UNIT_CAP = 420;
const DEF_UNIT_SPD = 7.5;

// df：每關的難度係數，用 tools/defsim.js 的機器人校準過（普通玩家勝率由 100% 慢慢降到 45%）
// 每關一個新花樣：roul 轉盤門、bomb 基地砲擊、wall 擋路的牆、pow 強化門、gey 噴火口
const DSTAGES = [
  { name: '草原前哨', theme: 0, rows: 1, slide: 0, red: 0, lvl: 1, tip: '怪物會從左右兩邊來，移過去擋住！' },
  { name: '風車防線', theme: 0, rows: 2, slide: 0, red: 0, lvl: 2, df: 2.2, tip: '兩排門：先 ×2 再 ×3 最划算' },
  { name: '沙丘堡壘', theme: 1, rows: 2, slide: 1, red: 0, lvl: 3, df: 2.3, tip: '會動的門：抓好時機再射' },
  { name: '峽谷關卡', theme: 1, rows: 2, slide: 0, red: 1, lvl: 4, df: 1.72, roul: 1, tip: '轉盤門會換數字，看準了再過' },
  { name: '冰原要塞', theme: 2, rows: 3, slide: 1, red: 1, lvl: 5, df: 2.4, bomb: 1, tip: '基地會砲擊！地上出現紅圈就快移開' },
  { name: '暴風雪', theme: 2, rows: 3, slide: 1, red: 1, lvl: 6, df: 1.43, wall: 1, tip: '中間有一道牆，打破它才能過後面的大門' },
  { name: '霓虹基地', theme: 3, rows: 3, slide: 2, red: 1, lvl: 7, df: 1.54, roul: 1, bomb: 1, tip: '轉盤門加砲擊，眼睛要放亮' },
  { name: '魔王城', theme: 3, rows: 3, slide: 1, red: 2, lvl: 8, df: 1.45, roul: 1, bomb: 1, wall: 1, tip: '魔王城什麼都有，記得挑好強化卡' },
  { name: '熔岩前線', theme: 4, rows: 3, slide: 1, red: 1, lvl: 9, df: 1.08, pow: 1, gey: 1, tip: '黃色強化門讓小兵變兩倍強' },
  { name: '噴火峽谷', theme: 4, rows: 3, slide: 2, red: 1, lvl: 10, df: 1.43, pow: 1, gey: 2, roul: 1, tip: '火口冒煙就要噴火了' },
  { name: '火龍巢穴', theme: 4, rows: 4, slide: 2, red: 2, lvl: 11, df: 0.6, pow: 2, gey: 2, bomb: 1, tip: '火口加砲擊，別待在同一個地方' },
  { name: '最終火山', theme: 4, rows: 4, slide: 2, red: 2, lvl: 12, df: 1.28, pow: 2, gey: 2, roul: 1, bomb: 1, wall: 1, tip: '最後一關，全部都來了！' },
];

// 砲台一次射出一小隊（3 個人）。門是對「整隊」算的：
// ×2 讓整隊變兩倍，+6 讓整隊多 6 個人，所以隊伍越大，乘法門越划算。
const DEF_SQUAD = 3;
const DEF_K = { base: 1.6, flow: 1.0, steer: 0.9, ramp: 0.45, ex: 0.65, ls: 0.05, tz: 9, tw: 2.2, td: 0.5 }; // 平衡用的係數（模擬器會調）
function defApply(S, g) { return g.k === 'mul' ? S * g.v : g.k === 'add' ? S + g.v : g.k === 'kill' ? 0 : S; }
// 強化門：人數不變，但每個小兵變成兩倍強（算「戰力」時當 ×2）
function defPower(S, g) { return g.k === 'pow' ? S * 2 : defApply(S, g); }

// 遊戲裡每關的配置是固定的：從幾個種子裡挑一個「站在中間不動不划算」的
function genDefense(n, seed) {
  if (seed) return genDefense1(n, seed);
  let L = null;
  for (let k = 0; k < 24; k++) {
    L = genDefense1(n, n * 4241 + 77 + k * 7919);
    if (n === 1 || L.idleGain <= L.bestGain * (n === 2 ? 0.22 : 0.36)) break;
  }
  return L;
}
function genDefense1(n, seed) {
  const D = DSTAGES[n - 1];
  const R = rng(seed);
  const pick = a => a[Math.floor(R() * a.length)];
  const gates = [];
  const rowZ = D.rows === 1 ? [18] : D.rows === 2 ? [13, 24] : D.rows === 3 ? [11, 20, 29] : [9, 16.5, 24, 31.5];
  let slides = D.slide, reds = D.red, pows = D.pow || 0, rouls = D.roul || 0;
  rowZ.forEach((z, ri) => {
    // 每排 2～3 扇門，中間有空隙
    const cnt = D.rows === 1 ? 2 : R() < 0.5 ? 2 : 3;
    const xs = cnt === 2 ? [-1.9, 1.9] : [-2.7, 0, 2.7];
    const w = cnt === 2 ? 1.25 : 0.95;
    const opts = ri === 0 ? [{ k: 'mul', v: 2 }, { k: 'add', v: 4 }, { k: 'add', v: 5 }] : ri === 1 ? [{ k: 'mul', v: 2 }, { k: 'mul', v: 3 }, { k: 'add', v: 6 }, { k: 'add', v: 8 }] : [{ k: 'mul', v: 2 }, { k: 'mul', v: 3 }, { k: 'add', v: 10 }, { k: 'add', v: 15 }];
    xs.forEach((x, i) => {
      let g = n === 1 ? [{ k: 'mul', v: 2 }, { k: 'add', v: 5 }][i] : pick(opts);
      if (reds > 0 && i === cnt - 1 && ri > 0 && R() < 0.7) { g = { k: 'kill', v: 0 }; reds--; }
      else if (pows > 0 && ri >= D.rows - 2 && i === 0 && R() < 0.75) { g = { k: 'pow', v: 2 }; pows--; }
      const o = { t: 'gate', id: _uid++, x, w, z, k: g.k, v: g.v, pair: { used: false, n: 1 }, fade: 0, bump: 0, acc: 0 };
      if (slides > 0 && (g.k !== 'kill' || D.lvl >= 7) && i === 0 && R() < 0.8) { o.slide = { cx: 0, amp: 4.2 - w - 0.3, f: 0.6 + R() * 0.4, ph: R() * 6 }; slides--; }
      else if (rouls > 0 && ri >= 1 && i === Math.floor(cnt / 2) && g.k !== 'kill') {
        // 轉盤門：大獎和陷阱輪流出現
        const vals = ri === 1 ? [{ k: 'mul', v: 3 }, { k: 'add', v: 2 }, { k: 'kill', v: 0 }] : [{ k: 'mul', v: 4 }, { k: 'add', v: 4 }, { k: 'kill', v: 0 }];
        o.roul = { vals, per: 1.5, t: R() * 1.5, i: 0 }; o.k = vals[0].k; o.v = vals[0].v; rouls--;
      }
      gates.push(o);
    });
  });
  // 預期：好好瞄準時每秒能送出多少小兵
  const rate = 5;
  // 轉盤門算預期時用比較保守的那一格（+n），不然會把大獎當成常態
  for (const o of gates) if (o.roul) { o.k = o.roul.vals[1].k; o.v = o.roul.vals[1].v; }
  let best = 1;
  for (let x = -3.4; x <= 3.4; x += 0.2) best = Math.max(best, defPathGain(gates, x, 0));
  {
    // 門會動、會轉：用一段時間內的平均最佳路線來算，不然會高估
    let sum = 0;
    for (let t = 0; t < 10; t += 0.5) { let b = 1; for (let x = -3.4; x <= 3.4; x += 0.2) b = Math.max(b, defPathGain(gates, x, t)); sum += b; }
    best = Math.min(best, sum / 20);
  }
  for (const o of gates) if (o.roul) { o.k = o.roul.vals[0].k; o.v = o.roul.vals[0].v; }
  // 擋路的牆：放在最後一排門前面的中間，牆後面放一扇大門
  if (D.wall) {
    const zl = rowZ[rowZ.length - 1];
    gates.push({ t: 'dwall', id: _uid++, x: 0, w: 1.7, z: zl - 3.2, hp: 1, max: 1, hit: 0 });
  }
  // 站在中間（±0.6）不動能拿到多少
  let idle = 0;
  for (let t = 0; t < 10; t += 0.5) for (const x of [-0.6, 0, 0.6]) idle += defPathGain(gates, x, t) / 60;
  const E = rate * Math.pow(Math.min(best, 30), DEF_K.ex) * 0.75 * (D.bomb ? 0.9 : 1) * (D.wall ? 0.92 : 1);
  const lv = D.lvl;
  const lvE = lv <= 8 ? lv : 8 + (lv - 8) * 0.2;   // 火山關卡的難度主要來自火口和新怪物
  for (const o of gates) if (o.t === 'dwall') { o.hp = o.max = Math.round(E * (5 + lvE * 0.6)); }
  // 噴火口：放在門的排與排之間，噴火時小兵和怪物都會被燒
  for (let k = 0; k < (D.gey || 0); k++) {
    const z = k === 0 ? (rowZ[0] + rowZ[1]) / 2 : k === 1 ? (rowZ[rowZ.length - 1] + 38) / 2 : (rowZ[1] + rowZ[2]) / 2;
    gates.push({ t: 'geyser', id: _uid++, x: (R() * 2 - 1) * 2.6, z, per: 4.2 + R() * 1.4, ph: R() * 3, r: 1.15 });
  }
  return {
    n, name: D.name, theme: THEMES[D.theme], gates, E, lv, hot: !!THEMES[D.theme].hot,
    baseHp: Math.round(E * DEF_K.base * (26 + lvE * 2.2)),
    castle: 15,
    flow: E * DEF_K.flow * (D.df || 1) * (0.42 + lvE * DEF_K.ls),   // 怪物每秒的血量
    bomb: !!D.bomb, tip: D.tip, idleGain: idle, bestGain: best,
    dur: 0,
  };
}

// 從 x 直直往前，一隊會變成原本的幾倍（看當下門的位置）
function defPathGain(gates, x, t) {
  let S = DEF_SQUAD;
  const gs = gates.filter(g => g.t === 'gate').sort((a, b) => a.z - b.z);
  for (const g of gs) {
    const gx = g.slide ? g.slide.cx + g.slide.amp * Math.sin(t * g.slide.f + g.slide.ph) : g.x;
    if (Math.abs(x - gx) <= g.w) S = defPower(S, g);
  }
  return S / DEF_SQUAD;
}

function newDefense(n, opts) {
  opts = opts || {};
  const L = genDefense(n, opts.seed);
  const up = Object.assign({ rate: 0, wall: 0, power: 0, giant: 0, card: 0 }, opts.up || {});
  G = {
    mode: 'defense', s: n, L, st: 'play', t: 0, dist: 0, spd: 0, scroll: false,
    px: 0, tx: 0, vx: 0,
    units: [], objs: L.gates.slice(), parts: [], floats: [], fx: [], decals: [], q: [], bullets: [], sold: [],
    fireAcc: 0, rate: 5 * (1 + up.rate * 0.05), pow: 1 + up.power * 0.06,
    castle: L.castle + up.wall * 2, castleMax: L.castle + up.wall * 2,
    base: { t: 'base', hp: L.baseHp, max: L.baseHp, hit: 0, rage: false, x: 0, z: DEF_Z_BASE },
    spawnAcc: 0, waveT: 2.5, waveN: 0, giant: 0, giantMax: Math.round(90 * (1 - 0.06 * up.giant)), sqId: 0,
    shake: 0, flash: 0, kills: 0, sent: 0, peak: 0, endT: 0, sim: !!opts.sim,
    rule: 'none', N: 0, lost: 0,
    squadN: DEF_SQUAD, card: null, cardT: 18 - up.card * 3, cards: 0, picked: [], bombT: 9,
  };
  return G;
}

function defEnemy(k, x, z, hp) {
  const K = ENEMIES[k];
  return { t: 'en', id: _uid++, k, art: K.art || k, x, z, hp, max: hp, r: K.r, h: K.h, spd: K.spd * 0.62 + 0.4, mass: 1, ph: Math.random() * 6, hit: 0, dead: 0, pow: k === 'brute' ? 4 : k === 'shield' || k === 'magma' ? 2 : 1, fly: K.fly };
}

// 一波怪物：總血量依時間與關卡增加
function defWave() {
  const L = G.L, lv = L.lv;
  G.waveN++;
  const ramp = 1 + Math.min(DEF_K.ramp, G.t / 120) + (G.base.rage ? 0.25 : 0);
  const hpBudget = L.flow * G.waveT * ramp;
  const kinds = [];
  let w = 0;
  const add = (k, hk) => { kinds.push(k); w += hk; };
  const big = lv >= 2 && G.waveN % 3 === 0;
  if (big) add('brute', 8);
  if (lv >= 3 && Math.random() < 0.5) add('shield', 3);
  if (lv >= 4 && Math.random() < 0.4) add('splitter', 3);
  if (L.hot) {
    for (let i = 1 + Math.floor(Math.random() * 2); i > 0; i--) add('bat', 1);
    if (lv >= 10 && Math.random() < 0.35) add('healer', 2);
    if (Math.random() < 0.35) add('magma', 3);
  }
  const nSmall = 4 + Math.floor(Math.random() * 3) + Math.floor(Math.min(lv, 8) / 2);   // 後面的關卡怪物比較少、比較壯，不會一大群漏過去
  for (let i = 0; i < nSmall; i++) add(Math.random() < 0.25 && lv >= 2 ? 'runner' : 'grunt', 1);
  const unit = hpBudget / w;
  // 左右輪流來，偶爾從中間：站著不動一定會漏
  const side = G.waveN % 2 ? 1 : -1;
  const cx = G.waveN % 5 === 0 ? (Math.random() - 0.5) * 1.2 : side * (2.4 + Math.random() * 1.0);
  kinds.forEach((k, i) => {
    const hk = k === 'brute' ? 8 : k === 'shield' || k === 'splitter' || k === 'magma' ? 3 : k === 'healer' ? 2 : 1;
    const x = clamp(cx + (Math.random() - 0.5) * 1.8, -PX_MAX, PX_MAX);
    G.objs.push(defEnemy(k, x, DEF_Z_BASE - 2 - (i % 4) * 0.9 - Math.random(), Math.max(1, Math.round(unit * hk))));
  });
  emit('dwave', { n: G.waveN });
}

// 巨魔兵：基地半血時派出來，很耐打，撞到城扣很多
function defBoss() {
  if (G.L.lv < 2) return;
  const o = defEnemy(G.L.hot ? 'magma' : 'brute', (Math.random() - 0.5) * 2, DEF_Z_BASE - 2.5, Math.round(G.L.E * (5 + G.L.lv * 0.8)));
  o.h *= G.L.hot ? 2.6 : 1.9; o.r *= G.L.hot ? 2.3 : 1.7; o.pow = 6; o.spd *= 0.7; o.boss = 1;
  G.objs.push(o);
  emit('dboss', o);
}

function defFireUnit(giant, sq, k) {
  if (G.units.length >= DEF_UNIT_CAP && !giant) return;
  const off = k == null ? 0 : (k - (G.squadN - 1) / 2) * 0.32;
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
  for (let k = 0; k < G.squadN; k++) if (defFireUnit(false, sq, k)) n++;
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
  // 強化卡：選的時候遊戲停住
  if (G.card) return;
  G.cardT -= dt;
  if (G.cardT <= 0 && G.cards < 4) { G.cardT = 24; defCardOffer(); return; }
  // 轉盤門
  for (const o of G.objs) if (o.t === 'gate' && o.roul) {
    const r = o.roul; r.t += dt;
    if (r.t >= r.per) { r.t -= r.per; r.i = (r.i + 1) % r.vals.length; o.k = r.vals[r.i].k; o.v = r.vals[r.i].v; o.bump = 0.4; }
  }
  // 基地砲擊：紅圈預告，落下時炸掉圈裡的小兵
  if (G.L.bomb) {
    G.bombT -= dt;
    if (G.bombT <= 0) {
      G.bombT = Math.max(4.5, 7.5 - G.L.lv * 0.25) * (G.base.rage ? 0.8 : 1);
      // 瞄準小兵最多的地方
      let bx = G.px, bz = 14 + Math.random() * 14, cnt = 0;
      for (let k = 0; k < G.units.length; k += 2) { const u = G.units[k]; if (u.z > 6 && u.z < 34) { let c = 0; for (let j = 0; j < G.units.length; j += 3) { const w = G.units[j]; if (Math.abs(w.x - u.x) < 1.4 && Math.abs(w.z - u.z) < 2) c++; } if (c > cnt) { cnt = c; bx = u.x; bz = u.z - 2; } } }
      const T = 1.7;
      G.objs.push({ t: 'lob', id: _uid++, kind: 'missile', sx: 0, sz: DEF_Z_BASE - 1, sh: 5, tx: clamp(bx, -PX_MAX, PX_MAX), tz: clamp(bz, 6, 34), T, age: 0, rad: 1.25, x: 0, z: DEF_Z_BASE - 1, h: 5, def: 1 });
      emit('dbomb');
    }
  }
  for (let i = G.objs.length - 1; i >= 0; i--) {
    const o = G.objs[i];
    if (o.t !== 'lob' || !o.def) continue;
    o.age += dt;
    const q = Math.min(1, o.age / o.T);
    o.x = lerp(o.sx, o.tx, q); o.z = lerp(o.sz, o.tz, q); o.h = lerp(o.sh, 0, q) + 6 * q * (1 - q);
    if (o.age >= o.T) {
      G.objs.splice(i, 1);
      if (fxOn()) FX.boom(o.tx, o.tz, o.rad * 0.8, true);
      emit('land', o);
      const U = G.units;
      for (let k = U.length - 1; k >= 0; k--) { const u = U[k]; if (Math.hypot(u.x - o.tx, (u.z - o.tz) * 0.8) < o.rad) { if (u.giant) { u.hp -= 8 * G.pow; if (u.hp > 0) continue; } U.splice(k, 1); defUnitGone(u); } }
    }
  }
  // 牆：被打破就消失
  for (let i = G.objs.length - 1; i >= 0; i--) { const o = G.objs[i]; if (o.t === 'dwall') { if (o.hit > 0) o.hit -= dt; if (o.hp <= 0) { G.objs.splice(i, 1); emit('wallbreak', o); if (fxOn()) FX.wallbreak(o); } } }
  // 發射：每次一小隊
  G.fireAcc += dt * G.rate / DEF_SQUAD;   // 每秒幾隊不變；強化卡加的是每隊人數
  let shots = 0;
  while (G.fireAcc >= 1) { G.fireAcc -= 1; shots += defFireSquad(); G.giant = Math.min(G.giantMax, G.giant + G.squadN); }
  if (shots) emit('dshot', { n: shots });
  // 門移動、噴火口
  for (const o of G.objs) if (o.t === 'gate') {
    if (o.slide) o.x = o.slide.cx + o.slide.amp * Math.sin(G.t * o.slide.f + o.slide.ph);
    if (o.bump > 0) o.bump = Math.max(0, o.bump - dt * 5);
  } else if (o.t === 'geyser') {
    const c = (G.t + o.ph) % o.per, idx = Math.floor((G.t + o.ph) / o.per);
    o.erupt = c > o.per - 0.75; o.warn = !o.erupt && c > o.per - 1.9;
    if (o.erupt) {
      if (o.killC !== idx) { o.killC = idx; emit('geyser', o); }
      const U = G.units;
      for (let k = U.length - 1; k >= 0; k--) {
        const u = U[k];
        if (Math.abs(u.x - o.x) < o.r && Math.abs(u.z - o.z) < o.r) {
          if (u.giant) { u.hp -= 6 * dt * G.pow; if (u.hp > 0) continue; }
          U.splice(k, 1); defUnitGone(u);
        }
      }
      for (const e of G.objs) if (e.t === 'en' && !e.dead && Math.abs(e.x - o.x) < o.r + e.r * 0.5 && Math.abs(e.z - o.z) < o.r + e.r * 0.5) e.hp -= e.max * 1.3 * dt, e.hit = 0.08;
    }
  } else if (o.t === 'pool') {
    o.life -= dt;
    const U = G.units;
    for (let k = U.length - 1; k >= 0; k--) { const u = U[k]; if (!u.giant && Math.abs(u.x - o.x) < o.r && Math.abs(u.z - o.z) < o.r * 0.8) { U.splice(k, 1); defUnitGone(u); } }
  }
  for (let i = G.objs.length - 1; i >= 0; i--) if (G.objs[i].t === 'pool' && G.objs[i].life <= 0) G.objs.splice(i, 1);
  // 砲台的護城機槍：自動打靠近城、又在砲台前面的怪（所以砲台要移過去）
  G.tAcc = (G.tAcc || 0) + dt;
  if (G.tAcc >= 0.25) {
    G.tAcc -= 0.25;
    let tgt = null, tz = 1e9;
    for (const e of G.objs) if (e.t === 'en' && !e.dead && e.z < DEF_K.tz && Math.abs(e.x - G.px) < DEF_K.tw && e.z < tz) { tz = e.z; tgt = e; }
    if (tgt) {
      tgt.hp -= G.L.E * DEF_K.td * 0.25 * G.pow; tgt.hit = 0.08;
      G.tShot = { x: tgt.x, z: tgt.z, t: 0.12 };
      emit('dturret', tgt);
      if (fxOn()) FX.add({ k: 'spark', x: tgt.x, z: tgt.z, h: 0.6, life: 0.1, size: 0.6, fl: 'y', rot: Math.random() * 3 });
    }
  }
  if (G.tShot) { G.tShot.t -= dt; if (G.tShot.t <= 0) G.tShot = null; }
  // 怪物出生
  G.waveT = Math.max(3.0, 3.8 - G.L.lv * 0.07);   // 左右輪流，間隔太短砲台會來不及兩邊跑
  G.spawnAcc += dt;
  if (G.spawnAcc >= G.waveT) { G.spawnAcc -= G.waveT; defWave(); }
  defUnitsMove(dt, false);
  // 怪物前進
  const O = G.objs;
  for (let i = O.length - 1; i >= 0; i--) {
    const o = O[i];
    if (o.t !== 'en') continue;
    if (o.hit > 0) o.hit -= dt;
    if (o.hp <= 0 && !o.dead) { o.dead = 1; G.kills++; emit('kill', o); if (fxOn()) FX.kill(o); if (o.k === 'magma') O.push({ t: 'pool', id: _uid++, x: o.x, z: o.z, r: 1.0, life: 3 }); }
    if (o.dead) { O.splice(i, 1); continue; }
    if (o.k === 'healer') {
      o.healT = (o.healT == null ? 2 : o.healT) - dt;
      if (o.healT <= 0) {
        o.healT = 2.6; o.atk = 0.4;
        for (const e of O) if (e.t === 'en' && !e.dead && e !== o && e.hp < e.max && Math.abs(e.x - o.x) < 3.5 && Math.abs(e.z - o.z) < 4) e.hp = Math.min(e.max, e.hp + e.max * 0.15);
        emit('enheal', o);
        if (fxOn()) FX.add({ k: 'ring', x: o.x, z: o.z, life: 0.6, size: 3.5, col: '120,255,140' });
      }
      if (o.atk > 0) o.atk -= dt;
    }
    o.z -= o.spd * dt;
    o.ph += dt * (5 + o.spd);
    // 看到附近有小兵就衝過去打（兩邊的人會撞在一起）
    let tx = null, bd = 1e9;
    for (let k = 0; k < G.units.length; k += 3) {
      const u = G.units[k], dz = o.z - u.z, dx = u.x - o.x;
      if (dz < -0.5 || dz > 5) continue;
      const dd = Math.abs(dx) + dz * 0.5;
      if (Math.abs(dx) < DEF_K.steer && dd < bd) { bd = dd; tx = u.x; }
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
        if (g.k === 'pow') { u.hp *= 2; u.pw = (u.pw || 0) + 1; if (!G.sim && G.t - (g.ftT || -9) > 0.9) { g.ftT = G.t; g.bump = 0.6; floatText(g.x, g.z, 3.3, '變強！', '#ffe066', 0.55); } continue; }
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
    // 撞到牆：把力氣都打在牆上
    if (!endOnly) {
      let wall = null;
      for (const o of O) if (o.t === 'dwall' && o.hp > 0 && z0 < o.z && u.z >= o.z - 0.1 && Math.abs(u.x - o.x) <= o.w + u.r) { wall = o; break; }
      if (wall) { const d = Math.min(u.hp, wall.hp); wall.hp -= d; wall.hit = 0.08; U.splice(i, 1); defUnitGone(u); continue; }
    }
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
        if (hitE.k === 'magma') G.objs.push({ t: 'pool', id: _uid++, x: hitE.x, z: hitE.z, r: 1.0, life: 3 });
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

// ---------- 強化卡：每隔一段時間停下來選一張 ----------
const DCARDS = {
  rate:  { name: '砲台加速', desc: '射得更快 +25%', ico: '⚡' },
  squad: { name: '擴編小隊', desc: '每次多射 1 個人', ico: '👥' },
  armor: { name: '鋼鐵小兵', desc: '小兵變強 +40%', ico: '🛡️' },
  gate:  { name: '門升級', desc: '+ 門再 +3、✕ 門變成 +3', ico: '🚪' },
  fix:   { name: '修補城牆', desc: '城的血量 +6', ico: '🧱' },
  giant: { name: '大兵支援', desc: '馬上放出金色大兵', ico: '💪' },
};
function defCardOffer() {
  const pool = ['rate', 'squad', 'armor', 'giant'];
  if (G.objs.some(o => o.t === 'gate' && (o.k === 'add' || o.k === 'kill') && !o.roul)) pool.push('gate');
  if (G.castle < G.castleMax) pool.push('fix', 'fix');
  const out = [];
  while (out.length < 3 && pool.length) { const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; if (!out.includes(k)) out.push(k); }
  G.card = out;
  emit('dcard', out);
}
function defPickCard(k) {
  if (!G.card || !G.card.includes(k)) return false;
  G.card = null; G.cards++; G.picked.push(k);
  if (k === 'rate') G.rate *= 1.25;
  else if (k === 'squad') G.squadN++;
  else if (k === 'armor') G.pow *= 1.4;
  else if (k === 'gate') { for (const o of G.objs) if (o.t === 'gate' && !o.roul) { if (o.k === 'add') o.v += 3; else if (o.k === 'kill') { o.k = 'add'; o.v = 3; } o.bump = 0.8; } }
  else if (k === 'fix') G.castle = Math.min(G.castleMax, G.castle + 6);
  else if (k === 'giant') { G.giant = G.giantMax; defLaunchGiant(); }
  emit('dpick', k);
  return true;
}
