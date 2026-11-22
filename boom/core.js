// 砰砰小隊 · 遊戲核心（規則、關卡產生、怪物、電腦對手）
// 不碰 DOM：瀏覽器和 node（tools/sim.mjs）共用同一份。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BoomCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const W = 13, H = 11, N = W * H;
const FLOOR = 0, HARD = 1, SOFT = 2;
const FUSE = 2.4, FLAME_T = 0.5, BURN_T = 0.4;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// 道具代碼
const IT = { B: 1, F: 2, S: 3, K: 4, H: 5, L: 6, P: 7, Z: 8, DOOR: 9, X: 10 };   // P 穿透火焰、Z 冰凍、X 骷髏（詛咒）

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ───────── 世界與關卡 ─────────
const WORLDS = [
  { key: 'grass', name: '青草原', kit: { b: 1, f: 2 }, sp: 1 },
  { key: 'snow', name: '雪花谷', kit: { b: 2, f: 2 }, sp: 1.08 },
  { key: 'lava', name: '火山口', kit: { b: 2, f: 3 }, sp: 1.16 },
  { key: 'castle', name: '月光古堡', kit: { b: 2, f: 3 }, sp: 1.2 },
];
// m：怪物（s 史萊姆、b 蝙蝠、g 幽靈、c 小惡魔、K 大王）；d：木箱密度；it：藏在木箱裡的道具；lay：場地樣式
const STAGES = [
  // 青草原
  { m: 'ss', d: .42, it: 'BF', lay: 0 },
  { m: 'sss', d: .48, it: 'BFS', lay: 0 },
  { m: 'ssb', d: .5, it: 'BFF', lay: 1 },
  { m: 'sssbb', d: .55, it: 'BFSH', lay: 0 },
  { m: 'ssbbb', d: .55, it: 'BBFK', lay: 2 },
  { m: 'sssg', d: .6, it: 'BFFS', lay: 0 },
  { m: 'bbbgg', d: .6, it: 'BFSKH', lay: 3 },
  { m: 'Kss', d: .32, it: 'BFFSH', lay: 1, boss: 3 },
  // 雪花谷
  { m: 'sssc', d: .5, it: 'BFS', lay: 0 },
  { m: 'bbbc', d: .55, it: 'BFFH', lay: 2 },
  { m: 'ssggc', d: .55, it: 'BFSK', lay: 3 },
  { m: 'bbbcc', d: .6, it: 'BBFSH', lay: 0 },
  { m: 'gggcc', d: .6, it: 'BFFSL', lay: 1 },
  { m: 'ssbbgc', d: .62, it: 'BFFSKH', lay: 3 },
  { m: 'bbgccc', d: .62, it: 'BBFFSH', lay: 2 },
  { m: 'Kcbb', d: .35, it: 'BFFSHL', lay: 1, boss: 4 },
  // 火山口
  { m: 'sbgcc', d: .55, it: 'BFSH', lay: 3 },
  { m: 'bbbbcc', d: .58, it: 'BFFSK', lay: 0 },
  { m: 'ggggcc', d: .6, it: 'BBFSH', lay: 2 },
  { m: 'ssbbccc', d: .62, it: 'BFFSHL', lay: 3 },
  { m: 'bbggccc', d: .64, it: 'BBFFSK', lay: 1 },
  { m: 'bbbgcccc', d: .64, it: 'BBFFSHL', lay: 0 },
  { m: 'ggbbcccc', d: .66, it: 'BBFFSSHK', lay: 3 },
  { m: 'KKcc', d: .3, it: 'BBFFSHL', lay: 1, boss: 4 },
  // 月光古堡（S 分裂史萊姆、x 炸彈怪）
  { m: 'SSsb', d: .5, it: 'BFS', lay: 0 },
  { m: 'xxss', d: .55, it: 'BFH', lay: 2 },
  { m: 'SSxbc', d: .55, it: 'BFSK', lay: 3 },
  { m: 'xxgcc', d: .6, it: 'BBFH', lay: 0 },
  { m: 'SSSxcc', d: .6, it: 'BFFSL', lay: 1 },
  { m: 'xxxggc', d: .62, it: 'BFSKH', lay: 3 },
  { m: 'SSxxbccg', d: .64, it: 'BBFFSHL', lay: 2 },
  { m: 'KxSc', d: .3, it: 'BBFFSHL', lay: 1, boss: 5 },
];
const PER_WORLD = 8;
const MON = {
  s: { type: 'slime', sp: 1.5, hp: 1 },
  b: { type: 'bat', sp: 2.4, hp: 1 },
  g: { type: 'ghost', sp: 1.2, hp: 1 },
  c: { type: 'imp', sp: 2.0, hp: 1 },
  K: { type: 'boss', sp: 1.35, hp: 3 },
  S: { type: 'split', sp: 1.3, hp: 1 },
  x: { type: 'bomber', sp: 1.5, hp: 1 },
};

// ───────── 場地產生 ─────────
function connected(grid) {
  let start = -1, total = 0;
  for (let i = 0; i < N; i++) if (grid[i] !== HARD) { total++; if (start < 0) start = i; }
  const seen = new Uint8Array(N); const q = [start]; seen[start] = 1; let n = 0;
  while (q.length) {
    const i = q.pop(); n++;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS) { const j = (y + dy) * W + x + dx; if (!seen[j] && grid[j] !== HARD) { seen[j] = 1; q.push(j); } }
  }
  return n === total;
}
function genGrid(r, lay, density, safe) {
  const grid = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) grid[i] = HARD;
    else if (x % 2 === 0 && y % 2 === 0) {
      let keep = true;
      if (lay === 1) keep = r() > .35;                              // 開闊：少一些柱子
      else if (lay === 2) keep = ((x / 2 + y / 2) & 1) === 1;         // 棋盤：柱子隔一個才有
      grid[i] = keep ? HARD : FLOOR;
    }
  }
  if (lay === 3) {                                                    // 迷宮：多幾段牆，但不能把場地切開
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (grid[i] !== FLOOR || ((x + y) & 1) === 0 || safe.has(i) || r() > .14) continue;
      grid[i] = HARD; if (!connected(grid)) grid[i] = FLOOR;
    }
  }
  for (let i = 0; i < N; i++) if (grid[i] === FLOOR && !safe.has(i) && r() < density) grid[i] = SOFT;
  return grid;
}
function safeZone(x, y) {
  const s = [y * W + x];
  s.push(y * W + (x === 1 ? 2 : x - 1));
  s.push((y === 1 ? 2 : y - 1) * W + x);
  return s;
}
function mkState(mode) {
  return {
    W, H, mode, grid: null, items: new Int8Array(N), hidden: new Int8Array(N),
    flameT: new Float32Array(N), flameOwner: new Int8Array(N), flameDir: new Uint8Array(N), burnT: new Float32Array(N),
    bombs: [], bombAt: new Array(N).fill(null), players: [], mons: [], ev: [],
    time: 0, freezeT: 0, timeLeft: Infinity, over: null, endT: 0, kid: false, doorI: -1, doorOpen: false, doorShown: false,
    sd: null, rnd: Math.random, portalAt: new Int16Array(N).fill(-1), portals: [], vents: [],
  };
}
function addPortal(G, a, b, safe) { G.portalAt[a] = b; G.portalAt[b] = a; G.portals.push([a, b]); if (safe) for (const i of [a, b]) { safe.add(i); safe.add(i + (i % W < W - 2 ? 1 : -1)); } }   // 門旁邊留一格空地，傳過去才不會被木箱關住
function mkPlayer(id, x, y, kit) {
  return {
    id, x, y, fx: 0, fy: 1, alive: true, bombsMax: kit.b, range: kit.f, speed: 3.4, shoes: 0, kick: false, shield: false,
    inv: 0, hearts: 1, lost: 0, pierce: false, frozen: 0, curse: null, active: 0, ix: 0, iy: 0, wantBomb: false, bot: null, moving: false, deadT: 0, human: true, kills: 0,
  };
}

function newAdventure(stage, opts) {
  opts = opts || {};
  const def = STAGES[stage], world = WORLDS[(stage / PER_WORLD) | 0];
  const r = mulberry(7919 * (stage + 1) + (opts.seed || 0));
  const G = mkState('adv'); G.rnd = mulberry(1234567 + stage * 31 + (opts.seed || 0) + ((Math.random() * 1e9) | 0));
  G.stage = stage; G.world = world.key; G.kid = !!opts.kid;
  const safe = new Set(safeZone(1, 1));
  // 怪物出生點：離起點遠、不是柱子
  const spots = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (x % 2 === 0 && y % 2 === 0) continue;
    if (x + y - 2 >= 7 && (x % 2 === 1 && y % 2 === 1)) spots.push(y * W + x);
  }
  for (let i = spots.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [spots[i], spots[j]] = [spots[j], spots[i]]; }
  const mdefs = def.m.split('');
  const mspots = spots.slice(0, mdefs.length);
  // 世界機關：雪花谷有傳送門，火山口有會噴火的地洞
  const k8 = stage % PER_WORLD, extra = spots.slice(mdefs.length);
  const nTp = world.key === 'snow' ? (k8 < 4 ? 1 : 2) : world.key === 'castle' ? 1 : 0, nVent = world.key === 'lava' ? [2, 2, 3, 3, 3, 4, 4, 3][k8] : world.key === 'castle' ? 2 : 0;
  for (let k = 0; k < nTp && extra.length >= 2; k++) addPortal(G, extra.shift(), extra.shift(), safe);
  for (let k = 0; k < nVent && extra.length; k++) { const i = extra.shift(); safe.add(i); G.vents.push({ i, t: 3 + k * 1.3, period: 5.2 }); }
  for (const i of mspots) { safe.add(i); const x = i % W; safe.add(i + (x < W - 2 ? 1 : -1)); }
  G.grid = genGrid(r, def.lay || 0, def.d, safe);
  mdefs.forEach((c, k) => {
    const d = MON[c], i = mspots[k];
    G.mons.push({
      id: k, type: d.type, x: i % W, y: (i / W) | 0, tx: i % W, ty: (i / W) | 0, px: i % W, py: (i / W) | 0, dx: 0, dy: 0,
      speed: d.sp * world.sp, hp: c === 'K' ? (def.boss || 3) : d.hp, maxHp: c === 'K' ? (def.boss || 3) : d.hp, inv: 0, alive: true, deadT: 0, wait: .6 + r() * .8, bombT: 3 + r() * 3,
    });
  });
  // 門和道具藏在木箱下
  const crates = [];
  for (let i = 0; i < N; i++) if (G.grid[i] === SOFT) crates.push(i);
  for (let i = crates.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [crates[i], crates[j]] = [crates[j], crates[i]]; }
  let di = crates.findIndex(i => (i % W) + ((i / W) | 0) - 2 >= 6); if (di < 0) di = 0;
  G.doorI = crates[di]; G.hidden[G.doorI] = IT.DOOR; crates.splice(di, 1);
  (def.it + (stage % 4 === 2 ? 'P' : '') + (stage % 5 === 4 ? 'Z' : '')).split('').forEach((c, k) => { if (crates[k] != null) G.hidden[crates[k]] = IT[c]; });
  const p = mkPlayer(0, 1, 1, world.kit); p.hearts = G.kid ? 5 : 3; G.players.push(p);
  G.timeLeft = G.kid ? Infinity : 300; G.par = 100 + 12 * mdefs.length + (def.boss ? 30 : 0);
  G.cratesLeft = crates.length + 1;
  return G;
}

const SPAWN = [[1, 1], [W - 2, H - 2], [W - 2, 1], [1, H - 2]];
function newBattle(opts) {
  const seed = opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0;
  const r = mulberry(seed);
  const G = mkState('battle'); G.rnd = mulberry(seed ^ 0x5bd1e995);
  G.world = opts.world || ['grass', 'snow', 'lava', 'castle'][(r() * 4) | 0];
  const total = Math.min(4, opts.humans + opts.bots);
  const safe = new Set();
  for (let k = 0; k < 4; k++) for (const i of safeZone(SPAWN[k][0], SPAWN[k][1])) safe.add(i);
  G.grid = genGrid(r, opts.lay != null ? opts.lay : [0, 0, 1, 2][(r() * 4) | 0], .78, safe);
  const clear = i => { G.grid[i] = FLOOR; };
  if (G.world === 'snow' || G.world === 'castle') { const a = 5 * W + 3, b = 5 * W + 9; clear(a); clear(b); clear(a + 1); clear(b - 1); addPortal(G, a, b); }
  if (G.world === 'lava' || G.world === 'castle') for (const [i, t] of [[3 * W + 6, 4], [7 * W + 6, 6.6]]) { clear(i); G.vents.push({ i, t, period: 5.2 }); }
  const bag = 'BBBBBBBFFFFFFFSSSSKKKHHPPZXX';
  for (let i = 0; i < N; i++) if (G.grid[i] === SOFT && r() < .4) G.hidden[i] = IT[bag[(r() * bag.length) | 0]];
  // 兩個人時坐對角
  const order = total === 2 ? [0, 1] : [0, 1, 2, 3];
  for (let k = 0; k < total; k++) {
    const [x, y] = SPAWN[order[k]];
    const p = mkPlayer(k, x, y, { b: 1, f: 2 });
    if (k >= opts.humans) { p.human = false; p.bot = mkBot(opts.level == null ? 1 : opts.level, r); }
    G.players.push(p);
  }
  G.sd = { start: opts.sdStart || 70, order: spiral(), k: 0, t: 0, every: .32 };
  return G;
}
function spiral() {
  const out = [];
  for (let k = 1; k <= 4; k++) {
    const x0 = k, x1 = W - 1 - k, y0 = k, y1 = H - 1 - k;
    for (let x = x0; x <= x1; x++) out.push(y0 * W + x);
    for (let y = y0 + 1; y <= y1; y++) out.push(y * W + x1);
    for (let x = x1 - 1; x >= x0; x--) out.push(y1 * W + x);
    for (let y = y1 - 1; y > y0; y--) out.push(y * W + x0);
  }
  return out;
}

// ───────── 移動 ─────────
function passable(G, tx, ty, e) {
  const i = ty * W + tx;
  if (G.grid[i] !== FLOOR) return false;
  const b = G.bombAt[i];
  return !(b && !b.pass.has(e));
}
function tryKick(G, e, tx, ty, dx, dy) {
  if (!e.kick) return;
  const b = G.bombAt[ty * W + tx];
  if (b && !b.vx && !b.vy && !b.pass.has(e)) { b.vx = dx; b.vy = dy; G.ev.push({ t: 'kick', x: tx, y: ty }); }
}
// 沿一個軸走；另一個軸沒對齊走道時先滑進走道（轉角輔助）
function moveEnt(G, e, dx, dy, dist) {
  const horiz = dx !== 0;
  let a = horiz ? e.x : e.y, c = horiz ? e.y : e.x; const d = horiz ? dx : dy;
  const lane = Math.round(c), off = lane - c;
  const tileOk = (ta, tc) => horiz ? passable(G, ta, tc, e) : passable(G, tc, ta, e);
  if (Math.abs(off) > 1e-4) {
    const ta = Math.round(a);
    let target = null;
    if (tileOk(ta + d, lane)) target = lane;
    else { const other = c < lane ? lane - 1 : lane + 1; if (tileOk(ta + d, other) && tileOk(ta, other)) target = other; }
    if (target === null) return false;
    const need = Math.abs(target - c), m = Math.min(dist, need);
    c += Math.sign(target - c) * m; dist -= m;
    if (need - m < 1e-4) c = target;
    if (horiz) e.y = c; else e.x = c;
    if (dist <= 1e-6 || c !== target) return true;
  } else c = lane;
  let moved = false, guard = 0;
  while (dist > 1e-6 && guard++ < 8) {
    const ta = Math.round(a);
    if (d > 0 ? a < ta - 1e-6 : a > ta + 1e-6) { const m = Math.min(dist, Math.abs(ta - a)); a += d * m; dist -= m; moved = true; if (Math.abs(ta - a) < 1e-6) a = ta; continue; }
    if (Math.abs(a - ta) < 1e-6) a = ta;
    if (!tileOk(ta + d, c)) { if (horiz) tryKick(G, e, ta + d, c, d, 0); else tryKick(G, e, c, ta + d, 0, d); break; }
    const m = Math.min(dist, .5); a += d * m; dist -= m; moved = true;
  }
  if (horiz) { e.x = a; e.y = c; } else { e.y = a; e.x = c; }
  return moved;
}

// ───────── 炸彈與火焰 ─────────
function placeBomb(G, p) {
  if (!p.alive || p.active >= p.bombsMax) return false;
  const tx = Math.round(p.x), ty = Math.round(p.y), i = ty * W + tx;
  if (G.bombAt[i] || G.grid[i] !== FLOOR) return false;
  const b = { tx, ty, ox: 0, oy: 0, vx: 0, vy: 0, owner: p.id, range: p.range, pierce: p.pierce, t: FUSE, pass: new Set(), born: G.time };
  for (const e of G.players) if (e.alive && Math.abs(e.x - tx) < 1 && Math.abs(e.y - ty) < 1) b.pass.add(e);
  G.bombs.push(b); G.bombAt[i] = b; p.active++;
  G.ev.push({ t: 'place', x: tx, y: ty });
  return true;
}
function addFlame(G, i, owner, dir) {
  G.flameT[i] = FLAME_T; G.flameOwner[i] = owner; G.flameDir[i] |= dir;
  const it = G.items[i];
  if (it && it !== IT.DOOR) { G.items[i] = 0; G.ev.push({ t: 'itemburn', x: i % W, y: (i / W) | 0 }); }
}
function explode(G, b) {
  const k = G.bombs.indexOf(b); if (k < 0) return;
  G.bombs.splice(k, 1); G.bombAt[b.ty * W + b.tx] = null;
  const o = G.players[b.owner]; if (o) o.active = Math.max(0, o.active - 1);
  G.ev.push({ t: 'boom', x: b.tx, y: b.ty, r: b.range });
  fireAt(G, b.tx, b.ty, b.range, b.owner, b.pierce);
}
function fireAt(G, tx, ty, range, owner, pierce) {
  G.flameDir[ty * W + tx] = 0; addFlame(G, ty * W + tx, owner, 3);
  for (const [dx, dy] of DIRS) {
    for (let s = 1; s <= range; s++) {
      const x = tx + dx * s, y = ty + dy * s, i = y * W + x, g = G.grid[i];
      if (g === HARD) break;
      if (g === SOFT) { if (G.burnT[i] <= 0) { G.burnT[i] = BURN_T; G.ev.push({ t: 'crate', x, y }); } if (pierce) continue; break; }
      const ob = G.bombAt[i];
      if (ob) { ob.t = Math.min(ob.t, .07); break; }
      if (G.flameT[i] <= 0) G.flameDir[i] = 0;
      addFlame(G, i, owner, dx ? 1 : 2);
    }
  }
}
function teleport(G, e) {
  const i = Math.round(e.y) * W + Math.round(e.x);
  if (e.tpFrom != null) { if (e.tpFrom !== i) e.tpFrom = null; else return; }
  const j = G.portalAt[i]; if (j < 0 || G.bombAt[j]) return;
  if (Math.abs(e.x - i % W) > .12 || Math.abs(e.y - ((i / W) | 0)) > .12) return;
  G.ev.push({ t: 'tp', x: j % W, y: (j / W) | 0, fx: i % W, fy: (i / W) | 0 });
  e.x = j % W; e.y = (j / W) | 0; e.tpFrom = j;
}
function stepVents(G, dt) {
  for (const v of G.vents) {
    v.t -= dt;
    if (v.t <= 0) { v.t = v.period; if (G.grid[v.i] !== FLOOR) continue; fireAt(G, v.i % W, (v.i / W) | 0, 1, -1); G.ev.push({ t: 'vent', x: v.i % W, y: (v.i / W) | 0 }); }
  }
}
function stepBombs(G, dt) {
  for (const b of G.bombs) {
    for (const e of b.pass) if (!e.alive || Math.abs(e.x - b.tx) >= .95 || Math.abs(e.y - b.ty) >= .95) b.pass.delete(e);
    if (b.vx || b.vy) {
      if (b.ox || b.oy) {
        const m = 8 * dt;
        b.ox = Math.abs(b.ox) <= m ? 0 : b.ox - Math.sign(b.ox) * m;
        b.oy = Math.abs(b.oy) <= m ? 0 : b.oy - Math.sign(b.oy) * m;
      }
      if (!b.ox && !b.oy) {
        const nx = b.tx + b.vx, ny = b.ty + b.vy, ni = ny * W + nx;
        let ok = G.grid[ni] === FLOOR && !G.bombAt[ni] && G.flameT[ni] <= 0;
        if (ok) for (const e of G.players) if (e.alive && Math.round(e.x) === nx && Math.round(e.y) === ny) { ok = false; break; }
        if (ok) for (const m of G.mons) if (m.alive && Math.round(m.x) === nx && Math.round(m.y) === ny) { ok = false; break; }
        if (ok) { G.bombAt[b.ty * W + b.tx] = null; b.tx = nx; b.ty = ny; G.bombAt[ni] = b; b.ox = -b.vx; b.oy = -b.vy; b.pass.clear(); }
        else { b.vx = 0; b.vy = 0; }
      }
    }
    b.t -= dt;
  }
  // 火焰碰到的炸彈馬上爆
  for (const b of G.bombs) if (G.flameT[b.ty * W + b.tx] > 0) b.t = Math.min(b.t, .05);
  let guard = 0;
  for (;;) {
    const b = G.bombs.find(b => b.t <= 0); if (!b || guard++ > 200) break;
    explode(G, b);
  }
}
function stepFlames(G, dt) {
  for (let i = 0; i < N; i++) {
    if (G.flameT[i] > 0) { G.flameT[i] -= dt; if (G.flameT[i] <= 0) { G.flameT[i] = 0; G.flameDir[i] = 0; } }
    if (G.burnT[i] > 0) {
      G.burnT[i] -= dt;
      if (G.burnT[i] <= 0) {
        G.burnT[i] = 0; G.grid[i] = FLOOR; if (G.cratesLeft) G.cratesLeft--;
        if (G.hidden[i]) { G.items[i] = G.hidden[i]; G.hidden[i] = 0; if (G.items[i] === IT.DOOR) { G.doorShown = true; G.ev.push({ t: 'door', x: i % W, y: (i / W) | 0 }); } }
      }
    }
  }
}

// ───────── 受傷 ─────────
function hurtPlayer(G, p, by) {
  if (!p.alive || p.inv > 0) return;
  if (p.shield) { p.shield = false; p.inv = 1.5; G.ev.push({ t: 'shield', x: p.x, y: p.y }); return; }
  p.hearts--; p.lost++;
  if (p.hearts <= 0) {
    p.alive = false; p.deadT = 0; G.ev.push({ t: 'die', x: p.x, y: p.y, id: p.id });
    if (by != null && by !== p.id && G.players[by]) G.players[by].kills++;
  } else { p.inv = 2; G.ev.push({ t: 'hurt', x: p.x, y: p.y, id: p.id }); }
}
function hurtMon(G, m) {
  if (!m.alive || m.inv > 0) return;
  m.hp--;
  if (m.hp <= 0) {
    m.alive = false; m.deadT = 0; G.ev.push({ t: 'mdie', x: m.x, y: m.y, type: m.type });
    if (m.type === 'split') for (let k = 0; k < 2; k++) {          // 分裂成兩隻小的
      const x = Math.round(m.x), y = Math.round(m.y);
      G.mons.push({ id: G.mons.length, type: 'mini', x, y, tx: x, ty: y, px: x, py: y, dx: 0, dy: 0, speed: m.speed * 1.75, hp: 1, maxHp: 1, inv: .9, alive: true, deadT: 0, wait: .55 + k * .25, bombT: 0 });
    }
  }
  else { m.inv = 1.2; G.ev.push({ t: 'mhurt', x: m.x, y: m.y }); }
}

// ───────── 怪物 ─────────
function monOk(G, m, x, y) {
  const i = y * W + x, g = G.grid[i];
  if (g === HARD) return false;
  if (g === SOFT && m.type !== 'ghost') return false;
  return !G.bombAt[i];
}
function bfsStep(G, m, sx, sy, goals) {
  const prev = new Int16Array(N).fill(-1), q = [sy * W + sx]; prev[q[0]] = q[0];
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    if (goals.has(i) && i !== q[0]) { let c = i; while (prev[c] !== q[0]) c = prev[c]; return c; }
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS) {
      const j = (y + dy) * W + x + dx;
      if (prev[j] < 0 && monOk(G, m, x + dx, y + dy) && G.flameT[j] <= 0) { prev[j] = i; q.push(j); }
    }
  }
  return -1;
}
function monBomb(G, m) {
  const i = m.ty * W + m.tx;
  if (G.bombAt[i] || G.grid[i] !== FLOOR || G.portalAt[i] >= 0) return;
  const b = { tx: m.tx, ty: m.ty, ox: 0, oy: 0, vx: 0, vy: 0, owner: -1, range: 2, pierce: false, t: FUSE + .4, pass: new Set(), born: G.time };
  for (const e of G.players) if (e.alive && Math.abs(e.x - b.tx) < 1 && Math.abs(e.y - b.ty) < 1) b.pass.add(e);
  G.bombs.push(b); G.bombAt[i] = b; G.ev.push({ t: 'place', x: b.tx, y: b.ty });
}
function monChoose(G, m) {
  const x = m.tx, y = m.ty, r = G.rnd;
  if (m.type === 'bomber') {
    if (m.bombT <= 0) { m.bombT = 4 + r() * 2.5; monBomb(G, m); }
    const D = dangerMap(G, null, null, true);
    if (D[y * W + x] !== Infinity) {          // 自己放的也會怕：往安全的地方跑
      const goals = new Set(); for (let i = 0; i < N; i++) if (D[i] === Infinity && G.grid[i] === FLOOR) goals.add(i);
      const st = bfsStep(G, m, x, y, goals);
      if (st >= 0) { m.dx = st % W - x; m.dy = ((st / W) | 0) - y; m.px = x; m.py = y; m.tx = x + m.dx; m.ty = y + m.dy; return; }
    }
  }
  const opts = DIRS.filter(([dx, dy]) => monOk(G, m, x + dx, y + dy));
  if (!opts.length) { m.dx = m.dy = 0; return; }
  const fwd = opts.find(([dx, dy]) => dx === m.dx && dy === m.dy && (dx || dy));
  const noRev = opts.filter(([dx, dy]) => !(dx === -m.dx && dy === -m.dy));
  const pool = noRev.length ? noRev : opts;
  let pick = null;
  const target = G.players.find(p => p.alive);
  if ((m.type === 'imp' || m.type === 'boss') && target) {
    const s = bfsStep(G, m, x, y, new Set([Math.round(target.y) * W + Math.round(target.x)]));
    if (s >= 0 && r() < .92) pick = [s % W - x, ((s / W) | 0) - y];
  } else if (m.type === 'ghost' && target && r() < .6) {
    let best = 1e9;
    for (const o of pool) { const d = Math.abs(x + o[0] - target.x) + Math.abs(y + o[1] - target.y); if (d < best) { best = d; pick = o; } }
  }
  if (!pick) {
    if (m.type === 'bat') pick = pool[(r() * pool.length) | 0];
    else pick = fwd && r() < .75 ? fwd : pool[(r() * pool.length) | 0];
  }
  m.dx = pick[0]; m.dy = pick[1]; m.px = x; m.py = y; m.tx = x + pick[0]; m.ty = y + pick[1];
}
function stepMons(G, dt) {
  if (G.freezeT > 0) G.freezeT -= dt;
  for (const m of G.mons) {
    if (!m.alive) { m.deadT += dt; continue; }
    if (m.inv > 0) m.inv -= dt;
    if (m.wait > 0) { m.wait -= dt; continue; }
    if (G.freezeT > 0) continue;
    if (m.bombT > 0) m.bombT -= dt;
    let dist = m.speed * dt, guard = 0;
    while (dist > 1e-6 && guard++ < 4) {
      const rx = m.tx - m.x, ry = m.ty - m.y, rem = Math.abs(rx) + Math.abs(ry);
      if (rem < 1e-6) {
        m.x = m.tx; m.y = m.ty;
        const pj = G.portalAt[m.ty * W + m.tx];
        if (pj >= 0 && !m.tpLock && !G.bombAt[pj]) {
          G.ev.push({ t: 'tp', x: pj % W, y: (pj / W) | 0, fx: m.tx, fy: m.ty });
          m.x = m.tx = pj % W; m.y = m.ty = (pj / W) | 0; m.tpLock = true; m.wait = .25; break;
        } else if (pj < 0) m.tpLock = false;
        monChoose(G, m);
        if (!m.dx && !m.dy) break;
        continue;
      }
      // 路上被炸彈擋住就掉頭
      if (rem > .5 && G.bombAt[m.ty * W + m.tx]) { const tx = m.px, ty = m.py; m.px = m.tx; m.py = m.ty; m.tx = tx; m.ty = ty; m.dx = -m.dx; m.dy = -m.dy; continue; }
      const s = Math.min(dist, rem); m.x += Math.sign(rx) * s; m.y += Math.sign(ry) * s; dist -= s;
    }
  }
}

// ───────── 電腦對手 ─────────
function mkBot(level, r) {
  const L = [{ every: .34, margin: .45, foe: 0, sloppy: .18, lazy: .45, blind: 45 }, { every: .16, margin: .3, foe: 26, sloppy: .03, lazy: .12, blind: 14 }, { every: .08, margin: .22, foe: 46, sloppy: 0, lazy: 0, blind: 0 }][level];
  return Object.assign({ t: (r ? r() : Math.random()) * .3, path: [], level, noise: 0, noiseT: 0, bad: new Map() }, L);
}
function blast(G, bx, by, range, bombSet, out) {
  out.push(by * W + bx);
  for (const [dx, dy] of DIRS) for (let s = 1; s <= range; s++) {
    const i = (by + dy * s) * W + bx + dx * s;
    if (G.grid[i] !== FLOOR) break;
    out.push(i);
    if (bombSet.has(i)) break;
  }
  return out;
}
function crateCount(G, bx, by, range) {
  let n = 0;
  for (const [dx, dy] of DIRS) for (let s = 1; s <= range; s++) {
    const i = (by + dy * s) * W + bx + dx * s, g = G.grid[i];
    if (g === HARD) break;
    if (g === SOFT) { if (G.burnT[i] <= 0) n++; break; }
    if (G.bombAt[i]) break;
  }
  return n;
}
function dangerMap(G, extra, me, noMons) {
  const D = new Float32Array(N).fill(Infinity);
  // 弱一點的電腦有時候「沒注意到」別人的炸彈
  const blind = me && me.bot ? me.bot.blind : 0;
  const bs = G.bombs.filter(b => !(blind && b.owner !== me.id && ((b.born * 977 + me.id * 131) | 0) % 100 < blind)).map(b => ({ i: b.ty * W + b.tx, x: b.tx, y: b.ty, r: b.range, t: b.t }));
  if (extra) bs.push(extra);
  const set = new Set(bs.map(b => b.i));
  for (const b of bs) b.tiles = blast(G, b.x, b.y, b.r, set, []);
  let ch = true, guard = 0;
  while (ch && guard++ < 20) {
    ch = false;
    for (const a of bs) for (const b of bs) if (a !== b && b.t > a.t + .05 && a.tiles.includes(b.i)) { b.t = a.t + .05; ch = true; }
  }
  for (const b of bs) for (const i of b.tiles) if (b.t < D[i]) D[i] = b.t;
  for (let i = 0; i < N; i++) if (G.flameT[i] > 0) D[i] = 0;
  if (G.sd && G.time > G.sd.start - 3) {
    for (let k = G.sd.k; k < Math.min(G.sd.order.length, G.sd.k + 8); k++) {
      const t = Math.max(0, G.sd.start - G.time) + (k - G.sd.k + 1) * G.sd.every - G.sd.t;
      const i = G.sd.order[k]; if (t < D[i]) D[i] = Math.max(.01, t);
    }
  }
  for (const v of G.vents) if (v.t < 2.6 && G.grid[v.i] === FLOOR) for (const i of blast(G, v.i % W, (v.i / W) | 0, 1, set, [])) if (v.t < D[i]) D[i] = Math.max(.01, v.t);
  if (!noMons) for (const m of G.mons) if (m.alive) {
    const mx = Math.round(m.x), my = Math.round(m.y);
    D[my * W + mx] = Math.min(D[my * W + mx], .2);
    for (const [dx, dy] of DIRS) { const j = (my + dy) * W + mx + dx; D[j] = Math.min(D[j], .3); }
  }
  return D;
}
function botBfs(G, p, D, margin, sdSoon) {
  const s = Math.round(p.y) * W + Math.round(p.x);
  const dist = new Int16Array(N).fill(-1), prev = new Int16Array(N).fill(-1), q = [s];
  dist[s] = 0;
  const step = 1 / p.speed;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS) {
      const j = (y + dy) * W + x + dx;
      if (dist[j] >= 0 || G.grid[j] !== FLOOR || G.bombAt[j] || G.flameT[j] > .12) continue;
      const arrive = (dist[i] + 1) * step;
      if (D[j] !== Infinity && arrive + step + margin >= D[j]) continue;
      dist[j] = dist[i] + 1; prev[j] = i; q.push(j);
    }
  }
  return { s, dist, prev, order: q };
}
function pathTo(prev, s, t) { const out = []; let c = t; while (c !== s && c >= 0) { out.push(c); c = prev[c]; } return out.reverse(); }
function botThink(G, p) {
  const B = p.bot, r = G.rnd;
  const D = dangerMap(G, null, p);
  const { s, dist, prev, order } = botBfs(G, p, D, B.margin);
  const sx = s % W, sy = (s / W) | 0;
  if (D[s] !== Infinity) {                     // 腳下危險：先逃
    let t = -1;
    for (const i of order) if (D[i] === Infinity) { t = i; break; }
    if (t < 0) { let best = -1; for (const i of order) if (D[i] > best) { best = D[i]; t = i; } }
    B.path = t >= 0 ? pathTo(prev, s, t) : [];
    return;
  }
  if (r() < B.lazy * .3) { B.path = []; return; }
  if (G.time > B.noiseT) { B.noise = (r() * 1e6) | 0; B.noiseT = G.time + 2.5; }
  const foes = [], foeP = [];
  for (const e of G.players) if (e !== p && e.alive) { foes.push(Math.round(e.y) * W + Math.round(e.x)); foeP.push(e); }
  for (const m of G.mons) if (m.alive) foes.push(Math.round(m.y) * W + Math.round(m.x));
  const canBomb = p.active < p.bombsMax;
  const set = new Set(G.bombs.map(b => b.ty * W + b.tx));
  let best = -1e9, bt = s, bWant = false;
  for (const i of order) {
    if (D[i] !== Infinity) continue;
    const d = dist[i], x = i % W, y = (i / W) | 0;
    let sc = -d * .6 + (((i * 2654435761 + B.noise) >>> 0) % 100) / 40, want = false;
    const it = G.items[i];
    if (it === IT.DOOR) { if (G.doorOpen) sc += 300; }
    else if (it === IT.X) sc -= 40;
    else if (it) sc += 60 - d * 3;
    if (canBomb && !(B.bad.get(i) > G.time)) {
      const c = crateCount(G, x, y, p.range);
      if (c) { sc += 12 + c * 9 - d * 2.4; want = true; }
      if (foes.length && (B.foe || G.mode === 'adv')) {
        const tiles = blast(G, x, y, p.range, set, []);
        let hit = false; for (const f of foes) if (tiles.includes(f) && f !== i) { hit = true; break; }
        if (hit) {
          sc += (B.foe || 30) - d * 3; want = true;
          // 這顆放下去對手就無路可逃：非常想放
          if (B.level > 0 && d <= 3) for (const e of foeP) {
            const ei = Math.round(e.y) * W + Math.round(e.x);
            if (!tiles.includes(ei)) continue;
            const D2 = dangerMap(G, { i, x, y, r: p.range, t: FUSE });
            const esc = botBfs(G, e, D2, 0); let free = false;
            for (const j of esc.order) if (D2[j] === Infinity) { free = true; break; }
            if (!free) { sc += 45; break; }
          }
        }
      }
      // 對手就在旁邊：放一顆逼他走位
      if (B.foe && !want) for (const f of foes) {
        const md = Math.abs(f % W - x) + Math.abs(((f / W) | 0) - y);
        if (md > 0 && md <= 2) { sc += B.foe * .45 - d * 3; want = true; break; }
      }
      // 炸箱子時優先炸通往對手的路
      if (c && B.foe && foes.length) { let md = 99; for (const f of foes) md = Math.min(md, Math.abs(f % W - x) + Math.abs(((f / W) | 0) - y)); sc += (16 - md) * .9; }
    }
    if (!want && foes.length && B.foe) {      // 沒事做就往對手靠
      let md = 99; for (const f of foes) md = Math.min(md, Math.abs(f % W - x) + Math.abs(((f / W) | 0) - y));
      sc += (14 - md) * (B.foe / 26);
    }
    if (sc > best) { best = sc; bt = i; bWant = want; }
  }
  if (bt === s) {
    B.path = [];
    if (bWant && canBomb && !G.bombAt[s]) {
      let ok = false;
      {
        const D2 = dangerMap(G, { i: s, x: sx, y: sy, r: p.range, t: FUSE });
        const esc = botBfs(G, p, D2, B.margin + .15);
        for (const i of esc.order) if (D2[i] === Infinity) { ok = true; break; }
      }
      // 這格放了逃不掉：先記住，過幾秒再考慮（弱的電腦偶爾會硬放）
      if (!ok) { if (r() < B.sloppy) ok = true; else B.bad.set(s, G.time + 2.5); }
      if (ok && r() > B.lazy) p.wantBomb = true;
    }
  } else B.path = pathTo(prev, s, bt);
}
function stepBot(G, p, dt) {
  const B = p.bot; B.t -= dt;
  const s = Math.round(p.y) * W + Math.round(p.x);
  if (B.t <= 0) { B.t = B.every; botThink(G, p); }
  while (B.path.length && B.path[0] === s) B.path.shift();
  p.ix = p.iy = 0;
  if (B.path.length) {
    const n = B.path[0], dx = n % W - s % W, dy = ((n / W) | 0) - ((s / W) | 0);
    if (Math.abs(dx) + Math.abs(dy) !== 1) { B.path = []; B.t = 0; return; }
    p.ix = dx; p.iy = dy;
  } else {
    // 到站了：回到格子正中央，免得半個身體露在火線上
    const ox = Math.round(p.x) - p.x, oy = Math.round(p.y) - p.y;
    if (Math.abs(ox) > .02) p.ix = Math.sign(ox); else if (Math.abs(oy) > .02) p.iy = Math.sign(oy);
  }
}

// ───────── 主迴圈 ─────────
function pickup(G, p) {
  const i = Math.round(p.y) * W + Math.round(p.x), it = G.items[i];
  if (!it || it === IT.DOOR) return;
  if (Math.abs(p.x - i % W) > .5 || Math.abs(p.y - ((i / W) | 0)) > .5) return;
  G.items[i] = 0;
  if (it === IT.B) p.bombsMax = Math.min(8, p.bombsMax + 1);
  else if (it === IT.F) p.range = Math.min(8, p.range + 1);
  else if (it === IT.S) { if (p.shoes < 3) { p.shoes++; p.speed += .45; } }
  else if (it === IT.K) p.kick = true;
  else if (it === IT.H) p.shield = true;
  else if (it === IT.L) p.hearts = Math.min(5, p.hearts + 1);
  else if (it === IT.P) p.pierce = true;
  else if (it === IT.Z) {                       // 冰凍：闖關凍住怪物，對戰凍住其他人
    if (G.mode === 'adv') G.freezeT = 5; else for (const e of G.players) if (e !== p && e.alive) e.frozen = 2.2;
    G.ev.push({ t: 'freeze' });
  } else if (it === IT.X) { p.curse = { type: ['slow', 'rev', 'leak'][(G.rnd() * 3) | 0], t: 8 }; G.ev.push({ t: 'curse', x: p.x, y: p.y, type: p.curse.type }); }
  G.ev.push({ t: 'item', x: p.x, y: p.y, it, id: p.id });
}
function step(G, dt) {
  if (G.over) return;
  G.time += dt;
  for (const p of G.players) {
    if (!p.alive) { p.deadT += dt; continue; }
    if (p.inv > 0) p.inv -= dt;
    if (p.bot) stepBot(G, p, dt);
    p.moving = false;
    let sp = p.speed;
    if (p.curse) { p.curse.t -= dt; const ct = p.curse.type; if (ct === 'slow') sp *= .55; else if (ct === 'rev') { p.ix = -p.ix; p.iy = -p.iy; } else p.wantBomb = true; if (p.curse.t <= 0) p.curse = null; }
    if (p.frozen > 0) { p.frozen -= dt; p.ix = p.iy = 0; }
    if (p.ix || p.iy) {
      const dx = p.ix ? Math.sign(p.ix) : 0, dy = p.ix ? 0 : Math.sign(p.iy);
      p.fx = dx; p.fy = dy;
      p.moving = moveEnt(G, p, dx, dy, sp * dt);
    }
    if (p.wantBomb) { p.wantBomb = false; placeBomb(G, p); }
    pickup(G, p);
    if (G.portals.length) teleport(G, p);
  }
  stepBombs(G, dt);
  if (G.vents.length) stepVents(G, dt);
  stepFlames(G, dt);
  stepMons(G, dt);
  // 火焰
  for (let i = 0; i < N; i++) if (G.flameT[i] > 0) {
    const fx = i % W, fy = (i / W) | 0, owner = G.flameOwner[i];
    for (const p of G.players) if (p.alive && Math.abs(p.x - fx) < .55 && Math.abs(p.y - fy) < .55) {
      if (G.kid && owner === p.id) continue;
      hurtPlayer(G, p, owner);
    }
    for (const m of G.mons) if (m.alive && Math.abs(m.x - fx) < .6 && Math.abs(m.y - fy) < .6) {
      const was = m.alive; hurtMon(G, m);
      if (was && !m.alive && G.players[owner]) G.players[owner].kills++;
    }
  }
  // 怪物碰到人
  if (!(G.freezeT > 0)) for (const m of G.mons) if (m.alive) for (const p of G.players)
    if (p.alive && Math.abs(p.x - m.x) < .62 && Math.abs(p.y - m.y) < .62) hurtPlayer(G, p, null);

  if (G.mode === 'adv') {
    const p = G.players[0];
    if (!G.doorOpen && G.mons.every(m => !m.alive)) { G.doorOpen = true; G.ev.push({ t: 'open', x: G.doorI % W, y: (G.doorI / W) | 0 }); }
    if (G.doorOpen && G.doorShown && p.alive && Math.abs(p.x - G.doorI % W) < .35 && Math.abs(p.y - ((G.doorI / W) | 0)) < .35) {
      const stars = 1 + (p.lost === 0 ? 1 : 0) + (G.time <= G.par ? 1 : 0);
      G.over = { win: true, stars, time: G.time, lost: p.lost }; return;
    }
    if (G.timeLeft !== Infinity) { G.timeLeft -= dt; if (G.timeLeft <= 0 && p.alive) { G.timeLeft = 0; G.over = { win: false, timeout: true }; return; } }
    if (!p.alive && p.deadT > 1.3) G.over = { win: false };
  } else {
    const sd = G.sd;
    if (sd && G.time >= sd.start && sd.k < sd.order.length) {
      if (!sd.on) { sd.on = true; G.ev.push({ t: 'sudden' }); for (const p of G.players) if (p.bot) { p.bot.foe = Math.max(p.bot.foe, 30); p.bot.lazy = 0; } }
      sd.t += dt;
      while (sd.t >= sd.every && sd.k < sd.order.length) {
        sd.t -= sd.every; const i = sd.order[sd.k++], x = i % W, y = (i / W) | 0;
        if (G.grid[i] === HARD) continue;
        G.grid[i] = HARD; G.items[i] = 0; G.hidden[i] = 0; G.burnT[i] = 0; G.flameT[i] = 0; G.flameDir[i] = 0;
        const b = G.bombAt[i]; if (b) { G.bombs.splice(G.bombs.indexOf(b), 1); G.bombAt[i] = null; const o = G.players[b.owner]; if (o) o.active = Math.max(0, o.active - 1); }
        for (const p of G.players) if (p.alive && Math.round(p.x) === x && Math.round(p.y) === y) { p.shield = false; p.inv = 0; p.hearts = 1; hurtPlayer(G, p, null); }
        G.ev.push({ t: 'crush', x, y });
      }
    }
    const alive = G.players.filter(p => p.alive);
    if (sd && G.time > sd.start + 60) { G.over = { winner: -1, timeout: true }; return; }
    if (alive.length <= 1) { G.endT += dt; if (G.endT > .7) G.over = { winner: alive.length ? alive[0].id : -1 }; }
  }
}

return { W, H, N, FLOOR, HARD, SOFT, FUSE, FLAME_T, BURN_T, IT, WORLDS, STAGES, PER_WORLD, newAdventure, newBattle, step, mkBot, dangerMap, connected, placeBomb };
});
