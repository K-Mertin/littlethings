'use strict';
// 守塔奇兵：遊戲邏輯（純模擬，不碰 DOM）。座標單位是「格」，地圖 16×10。
const STEP = 1 / 60;

function metaBonus(meta) {
  const r = id => (meta && meta[id]) || 0;
  return {
    startGold: r('gold') * 30, bounty: 1 + r('bounty') * 0.08, cheap: r('cheap') * 0.05, refund: 0.7 + r('refund') * 0.1,
    early: 1 + r('early') * 0.5, lives: r('lives') * 3, range: 1 + r('range') * 0.05,
    dmg: { arrow: 1 + r('arrow') * 0.12, cannon: 1 + r('cannon') * 0.08, frost: 1 + r('frost') * 0.15, magic: 1 + r('magic') * 0.12, sniper: 1 + r('sniper') * 0.12, banner: 1, mine: 1 },
    splash: 1 + r('cannon') * 0.12, slowT: 1 + r('frost') * 0.25, banner: r('banner') * 0.05, mine: 1 + r('mine') * 0.15,
    meteor: 1 + r('meteor') * 0.35, meteorCd: 1 - r('meteorCd') * 0.15, freeze: r('freeze'), freezeCd: 1 - r('freezeCd') * 0.15,
  };
}

function buildPath(pts) {
  const p = pts.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
  const seg = []; let len = 0;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y);
    seg.push({ a, b, l, s: len, dx: (b.x - a.x) / l, dy: (b.y - a.y) / l });
    len += l;
  }
  return { pts: p, seg, len };
}
function pathPos(P, d, o) {
  let s = P.seg[P.seg.length - 1];
  for (let i = 0; i < P.seg.length; i++) { if (d < P.seg[i].s + P.seg[i].l) { s = P.seg[i]; break; } }
  const t = clamp(d - s.s, 0, s.l);
  o.x = s.a.x + s.dx * t; o.y = s.a.y + s.dy * t; o.dx = s.dx; o.dy = s.dy;
  return o;
}
const inMap = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

function buildGrid(L, T) {
  const g = [];
  for (let y = 0; y < ROWS; y++) { const row = []; for (let x = 0; x < COLS; x++) row.push({ path: false, block: false, water: false, deco: null, tower: null, near: 9 }); g.push(row); }
  for (const P of L.paths) {
    for (let i = 0; i < P.length - 1; i++) {
      let [x0, y0] = P[i]; const [x1, y1] = P[i + 1];
      const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
      for (;;) {
        if (inMap(x0, y0)) g[y0][x0].path = true;
        if (x0 === x1 && y0 === y1) break;
        x0 += sx; y0 += sy;
      }
    }
  }
  for (const [wx, wy, ww, wh] of (L.water || [])) {
    for (let y = wy; y < wy + wh; y++) for (let x = wx; x < wx + ww; x++) if (inMap(x, y) && !g[y][x].path) { g[y][x].water = true; g[y][x].block = true; }
  }
  // 與路的距離（切比雪夫距離）
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    let n = 9;
    for (let yy = 0; yy < ROWS; yy++) for (let xx = 0; xx < COLS; xx++) if (g[yy][xx].path) n = Math.min(n, Math.max(Math.abs(xx - x), Math.abs(yy - y)));
    g[y][x].near = n;
  }
  const rng = mkRng(L.seed * 131 + 7);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const c = g[y][x];
    const p = c.near === 1 ? 0.05 : c.near === 2 ? 0.1 : 0.2;
    const r = rng();
    if (!c.path && !c.water && r < p) { c.block = true; c.deco = T.deco[Math.floor(rng() * T.deco.length)]; c.dv = rng(); }
  }
  return g;
}

function levelAvail(li) {
  // 第 li 關可以用的塔：解鎖條件 ≤ max(這關, 已過關數)
  let cleared = 0;
  for (let i = 0; i < LEVELS.length; i++) if (Store.data.levels[i] && Store.data.levels[i].stars) cleared = i + 1;
  return Math.max(li, cleared);
}

function newGame(li, diff, opts) {
  opts = opts || {};
  const L = LEVELS[li], T = THEMES[L.theme], D = DIFFS[diff] || DIFFS.normal;
  const M = metaBonus(opts.meta !== undefined ? opts.meta : Store.data.meta);
  const lv = opts.avail !== undefined ? opts.avail : levelAvail(li);
  const G = {
    li, L, T, D, M, diff, endless: !!opts.endless, noFx: !!opts.noFx, rnd: mkRng(opts.seed || (Date.now() & 0xffffff)),
    t: 0, gold: L.gold + D.gold + M.startGold + (opts.endless ? 200 : 0), lives: D.lives + M.lives, uid: 1,
    paths: L.paths.map(buildPath), fpaths: L.paths.map(p => buildPath([p[0], p[p.length - 1]])),
    grid: buildGrid(L, T), wave: -1, spawners: [], enemies: [], towers: [], projs: [],
    parts: [], texts: [], rings: [], bolts: [], nextT: null, state: 'ready', dirty: true,
    towersAvail: TOWER_ORDER.filter(k => TOWERS[k].unlock <= lv),
    skills: {
      meteor: { cd: 0, max: SKILLS.meteor.cd * M.meteorCd, on: SKILLS.meteor.unlock <= lv },
      freeze: { cd: 0, max: SKILLS.freeze.cd * M.freezeCd, on: SKILLS.freeze.unlock <= lv },
    },
    stats: { kills: 0, leaks: 0, built: 0, earned: 0 }, bossOn: null, flash: 0,
  };
  G.maxLives = G.lives;
  G.waves = G.endless ? [] : genWaves(L);
  G.nWaves = G.endless ? Infinity : G.waves.length;
  // 入口與出口位置（拿來畫箭頭和城堡）
  G.entryPts = L.entries.map(ent => {
    const P = G.paths[ent[0]], o = { x: 0, y: 0 };
    pathPos(P, 1.0, o); return { x: o.x, y: o.y, dx: P.seg[0].dx, dy: P.seg[0].dy };
  });
  const ex = G.paths[0], last = ex.seg[ex.seg.length - 1];
  G.exitPt = { x: last.b.x - last.dx * 0.5, y: last.b.y - last.dy * 0.5, dx: last.dx, dy: last.dy };
  return G;
}

// ───────── 塔 ─────────
const roundCost = c => Math.max(5, Math.round(c / 5) * 5);
function tierCost(G, k, tier, spec) {
  const d = TOWERS[k];
  const c = tier < 3 ? d.tiers[tier].cost : d.spec[spec].cost;
  return roundCost(c * (1 - G.M.cheap));
}
function canBuild(G, x, y) {
  if (!inMap(x, y)) return false;
  const c = G.grid[y][x];
  return !c.path && !c.block && !c.tower;
}
function buildTower(G, k, x, y) {
  if (G.state === 'won' || G.state === 'lost') return null;
  if (!G.towersAvail.includes(k) || !canBuild(G, x, y)) return null;
  const cost = tierCost(G, k, 0);
  if (G.gold < cost) return null;
  G.gold -= cost;
  const t = {
    id: G.uid++, k, x, y, cx: x + 0.5, cy: y + 0.5, tier: 0, spec: -1, spent: cost, cd: 0.3, ang: -Math.PI / 2,
    mode: k === 'sniper' ? 'strong' : 'first', stunT: 0, kills: 0, dmgDone: 0, bornT: G.t, recoil: 0, pulse: 0,
    buff: { dmg: 0, range: 0, rate: 0, air: false }, st: null,
  };
  G.towers.push(t); G.grid[y][x].tower = t; G.dirty = true; G.stats.built++;
  calcStats(G);
  burst(G, t.cx, t.cy, 0.1, 14, '#f4e3c0', 2.2, 0.5);
  Hook.sfx('build');
  return t;
}
function upCost(G, t, spec) {
  if (t.tier < 2) return tierCost(G, t.k, t.tier + 1);
  if (t.tier === 2) return tierCost(G, t.k, 3, spec || 0);
  return null;
}
function upgradeTower(G, t, spec) {
  if (!t || t.tier >= 3) return false;
  if (t.tier === 2 && spec !== 0 && spec !== 1) return false;
  const c = upCost(G, t, spec);
  if (G.gold < c) return false;
  G.gold -= c; t.spent += c; t.tier++;
  if (t.tier === 3) t.spec = spec;
  t.bornT = G.t; G.dirty = true; calcStats(G);
  burst(G, t.cx, t.cy, 0.5, 22, t.tier === 3 ? '#ffe27a' : '#ffffff', 2.6, 0.7);
  ring(G, t.cx, t.cy, 0.2, 0.9, 0.4, '#ffe27a');
  Hook.sfx(t.tier === 3 ? 'spec' : 'upgrade');
  return true;
}
function sellValue(G, t) { return G.wave < 0 ? t.spent : Math.floor(t.spent * G.M.refund); }
function sellTower(G, t) {
  const v = sellValue(G, t);
  G.gold += v;
  G.towers = G.towers.filter(o => o !== t);
  G.grid[t.y][t.x].tower = null; G.dirty = true; calcStats(G);
  addText(G, t.cx, t.cy - 0.3, '+' + v, '#ffd84a', 1);
  burst(G, t.cx, t.cy, 0.2, 16, '#c9a36b', 2.4, 0.6);
  Hook.sfx('sell');
  return v;
}
function baseStats(t) {
  const d = TOWERS[t.k];
  return t.tier < 3 ? Object.assign({}, d.tiers[t.tier]) : Object.assign({}, d.tiers[2], d.spec[t.spec]);
}
function calcStats(G) {
  const M = G.M;
  for (const t of G.towers) t.buff = { dmg: 0, range: 0, rate: 0, air: false };
  for (const b of G.towers) {
    if (b.k !== 'banner') continue;
    const bs = baseStats(b), r = bs.range * M.range;
    for (const t of G.towers) {
      if (TOWERS[t.k].support) continue;
      if (dist2(b.cx, b.cy, t.cx, t.cy) > r * r + 0.01) continue;
      t.buff.dmg = Math.max(t.buff.dmg, bs.buffDmg + M.banner);
      t.buff.range = Math.max(t.buff.range, bs.buffRange || 0);
      t.buff.rate = Math.max(t.buff.rate, bs.buffRate || 0);
      if (bs.giveAir) t.buff.air = true;
    }
  }
  for (const t of G.towers) {
    const d = TOWERS[t.k], s = baseStats(t);
    s.air = s.air !== undefined ? s.air : d.air;
    if (t.buff.air) s.air = true;
    if (s.dmg) s.dmg *= M.dmg[t.k] * (1 + t.buff.dmg);
    s.range *= M.range * (1 + t.buff.range);
    if (s.rate) s.rate *= 1 + t.buff.rate;
    if (s.splash && t.k === 'cannon') s.splash *= M.splash;
    if (s.slowT) s.slowT *= M.slowT;
    s.pierce = d.pierce || 0;
    t.st = s;
  }
  G.dirty = false;
}

// ───────── 波次 ─────────
function canCallWave(G) {
  if (G.state === 'ready') return true;
  return G.state === 'run' && G.nextT !== null && G.wave < G.nWaves - 1;
}
function earlyBonus(G) {
  if (G.state !== 'run' || G.nextT === null) return 0;
  return Math.round((G.nextT / WAVE_GAP) * (8 + 2.5 * (G.wave + 1)) * G.M.early);
}
function callWave(G, early) {
  if (!canCallWave(G)) return false;
  if (G.state === 'ready') G.state = 'run';
  else if (early) {
    const b = earlyBonus(G);
    if (b > 0) {
      G.gold += b;
      const ep = G.entryPts[0];
      addText(G, ep.x, ep.y - 0.4, '提早 +' + b, '#ffd84a', 1.3);
      Hook.sfx('coin');
    }
  }
  G.wave++;
  if (G.endless) G.waves[G.wave] = genEndlessWave(G.L, G.wave);
  const W = G.waves[G.wave];
  let boss = null;
  for (const g of W.groups) {
    G.spawners.push({ k: g.k, left: g.n, gap: g.gap, delay: g.delay, timer: 0, entry: g.entry, hp: g.hp });
    if (ENEMIES[g.k].boss) boss = g.k;
  }
  G.nextT = null;
  // 每波的軍餉
  if (G.wave > 0) { const wg = waveGold(G); G.gold += wg; G.stats.earned += wg; }
  // 金礦發薪水
  for (const t of G.towers) {
    if (t.k !== 'mine') continue;
    let g = Math.round(t.st.gold * G.M.mine);
    if (t.st.interest) g += Math.min(80, Math.floor(G.gold * t.st.interest));
    G.gold += g; G.stats.earned += g;
    addText(G, t.cx, t.cy - 0.4, '+' + g, '#ffd84a', 1.2);
    burst(G, t.cx, t.cy, 0.5, 8, '#ffd84a', 1.8, 0.7);
    t.pulse = 1;
  }
  Hook.sfx(boss ? 'bosshorn' : 'horn');
  Hook.banner(G, boss);
  return true;
}
// 下一波預覽
function waveGold(G) { return Math.round(10 + 3 * Math.min(G.wave, 30)); }
function nextWaveInfo(G) {
  const i = G.wave + 1;
  if (i >= G.nWaves) return null;
  if (G.endless && !G.waves[i]) G.waves[i] = genEndlessWave(G.L, i);
  const W = G.waves[i];
  const ents = new Set(W.groups.map(g => g.entry));
  return { n: i, sum: waveSummary(W), ents: [...ents] };
}

// ───────── 敵人 ─────────
function spawnEnemy(G, k, entry, hpMul, pi, at) {
  const d = ENEMIES[k];
  if (pi === undefined) { const ent = G.L.entries[entry] || G.L.entries[0]; pi = ent[Math.floor(G.rnd() * ent.length)]; }
  const P = d.fly ? G.fpaths[pi] : G.paths[pi];
  const hp = d.hp * hpMul * G.D.hp;
  const e = {
    id: G.uid++, k, d, P, pi, dist: at || 0, hp, maxHp: hp, hpMul, spd: d.spd * G.D.spd * (0.96 + G.rnd() * 0.08),
    armor: d.armor || 0, mres: d.mres || 0, fly: !!d.fly, boss: !!d.boss,
    shield: d.shield ? d.shield * hpMul * G.D.hp : 0, shieldMax: d.shield ? d.shield * hpMul * G.D.hp : 0,
    slowT: 0, slowA: 0, frozenT: 0, brittle: false, markT: 0, markA: 0, shred: 0, flash: 0, lastHit: -9,
    abilT: d.stomp || d.summon || d.dash || 2.4, dashT: 0, stunFx: 0,
    off: d.boss ? 0 : (G.rnd() - 0.5) * 0.34, x: 0, y: 0, dx: 1, dy: 0, alive: true, wob: G.rnd() * 6.28, r: d.r,
    lives: d.lives || 1, healFx: 0,
  };
  placeEnemy(e);
  G.enemies.push(e);
  if (e.boss) { G.bossOn = e; Hook.sfx('roar'); Hook.shake(0.5); }
  return e;
}
const _po = { x: 0, y: 0, dx: 0, dy: 0 };
function placeEnemy(e) {
  pathPos(e.P, e.dist, _po);
  e.x = _po.x - _po.dy * e.off; e.y = _po.y + _po.dx * e.off; e.dx = _po.dx; e.dy = _po.dy;
}

function hurt(G, e, amt, type, src) {
  if (!e.alive || amt <= 0) return 0;
  let m = 1;
  if (e.markT > 0) m += e.markA;
  if (e.frozenT > 0 && e.brittle) m += 0.5;
  if (type === 'phys') {
    let ar = Math.max(0, e.armor - e.shred);
    if (src && src.pierce) ar *= 1 - src.pierce;
    m *= 1 - ar;
  } else if (type === 'magic') m *= 1 - e.mres;
  let a = amt * m;
  const dealt = a;
  if (e.shield > 0) { const ab = Math.min(e.shield, a); e.shield -= ab; a -= ab; }
  e.hp -= a; e.flash = 0.09; e.lastHit = G.t;
  if (src && src.t) src.t.dmgDone += dealt;
  if (e.hp <= 0) killEnemy(G, e, src);
  return dealt;
}
function killEnemy(G, e, src) {
  e.alive = false;
  const b = Math.max(1, Math.round(e.d.bounty * Math.pow(e.hpMul, 0.7) * G.D.bounty * G.M.bounty));
  G.gold += b; G.stats.kills++;
  if (src && src.t) src.t.kills++;
  addText(G, e.x, e.y - 0.35 - (e.fly ? 0.5 : 0), '+' + b, '#ffd84a', e.boss ? 1.6 : 0.9);
  const col = enemyColor(e.k);
  if (e.boss) {
    burst(G, e.x, e.y, 0.6, 60, col, 4, 1.2); burst(G, e.x, e.y, 0.6, 30, '#ffd84a', 3, 1);
    ring(G, e.x, e.y, 0.2, 2.6, 0.7, '#ffffff');
    Hook.shake(1); Hook.sfx('bossdie');
    if (G.bossOn === e) G.bossOn = null;
  } else {
    burst(G, e.x, e.y, e.fly ? 0.6 : 0.25, 12, col, 2.6, 0.55);
    Hook.sfx('pop');
  }
  if (e.d.split) {
    for (let i = 0; i < e.d.splitN; i++) {
      const c = spawnEnemy(G, e.d.split, 0, e.hpMul, e.pi, Math.max(0, e.dist - 0.12 - i * 0.22));
      c.off = (i - 1) * 0.18; placeEnemy(c);
    }
  }
}
function enemyColor(k) {
  return ({ slime: '#6ad65e', runner: '#ff9a3c', beetle: '#9aa6b6', bat: '#9c6bff', golem: '#b9a98e', healer: '#ffffff', shield: '#5aa8ff', splitter: '#ff7fbf', mini: '#ff9fd0', ogre: '#7fae55', gargoyle: '#8e98a8', skeleton: '#f1eee2', bossGolem: '#b28c63', bossDragon: '#ff5a3a', bossLich: '#8a5cff' })[k] || '#fff';
}

function updateEnemies(G, dt) {
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.markT > 0) e.markT -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowA = 0; }
    let sp = e.spd * (1 - e.slowA);
    if (e.frozenT > 0) { e.frozenT -= dt; sp = 0; if (e.frozenT <= 0) e.brittle = false; }
    if (e.dashT > 0) { e.dashT -= dt; sp *= 2.4; }
    e.dist += sp * dt;
    e.wob += dt * (2 + sp * 4);
    if (e.dist >= e.P.len) { leak(G, e); continue; }
    placeEnemy(e);
    const d = e.d;
    // 特殊能力
    if (d.heal) {
      e.abilT -= dt;
      if (e.abilT <= 0) {
        e.abilT = 2.4; let n = 0;
        for (const o of G.enemies) {
          if (!o.alive || o === e || o.boss || o.hp >= o.maxHp) continue;
          if (dist2(o.x, o.y, e.x, e.y) > 1.7 * 1.7) continue;
          o.hp = Math.min(o.maxHp, o.hp + o.maxHp * d.heal); o.healFx = 0.6; n++;
        }
        if (n) { ring(G, e.x, e.y, 0.2, 1.7, 0.5, '#7dffb0'); Hook.sfx('heal'); }
      }
    }
    if (e.shieldMax && e.shield < e.shieldMax && G.t - e.lastHit > 3) e.shield = Math.min(e.shieldMax, e.shield + e.shieldMax * 0.4 * dt);
    if (d.stomp && e.frozenT <= 0) {
      e.abilT -= dt;
      if (e.abilT <= 0) {
        e.abilT = d.stomp; let n = 0;
        for (const t of G.towers) if (dist2(t.cx, t.cy, e.x, e.y) < 2.0 * 2.0) { t.stunT = 2.5; n++; }
        ring(G, e.x, e.y, 0.3, 2.0, 0.6, '#d9b27a'); burst(G, e.x, e.y, 0, 20, '#a88a66', 3, 0.7);
        Hook.shake(0.6); Hook.sfx('stomp');
      }
    }
    if (d.summon && e.frozenT <= 0) {
      e.abilT -= dt;
      if (e.abilT <= 0) {
        e.abilT = d.summon;
        const hm = 1 + 0.05 * Math.max(0, G.wave);
        for (let i = 0; i < 3; i++) { const c = spawnEnemy(G, 'skeleton', 0, hm, e.pi, Math.max(0, e.dist - 0.3 - i * 0.3)); c.off = (i - 1) * 0.22; placeEnemy(c); }
        ring(G, e.x, e.y, 0.2, 1.5, 0.6, '#b38aff'); Hook.sfx('summon');
      }
    }
    if (d.dash) {
      e.abilT -= dt;
      if (e.abilT <= 0) { e.abilT = d.dash; e.dashT = 1.6; Hook.sfx('roar'); }
    }
    if (e.healFx > 0) e.healFx -= dt;
  }
}
function leak(G, e) {
  e.alive = false;
  G.lives = Math.max(0, G.lives - e.lives); G.stats.leaks += e.lives;
  if (G.bossOn === e) G.bossOn = null;
  addText(G, G.exitPt.x, G.exitPt.y - 0.5, '-' + e.lives + ' ♥', '#ff5d6c', 1.3);
  Hook.sfx('leak'); Hook.shake(0.35);
  G.flash = 0.35;
  if (G.lives <= 0 && G.state === 'run') { G.state = 'lost'; Hook.sfx('lose'); Hook.ended(G); }
}

// ───────── 塔攻擊 ─────────
function score(t, e) {
  switch (t.mode) {
    case 'last': return e.P.len - e.dist;
    case 'strong': return e.hp + e.shield + (e.boss ? 1e6 : 0);
    case 'close': return -dist2(t.cx, t.cy, e.x, e.y);
    default: return -(e.P.len - e.dist);
  }
}
function targets(G, t, n) {
  const st = t.st, r2 = st.range * st.range, out = [];
  for (const e of G.enemies) {
    if (!e.alive || (e.fly && !st.air) || e.dist < 0.35) continue;
    if (dist2(t.cx, t.cy, e.x, e.y) > r2) continue;
    out.push(e);
  }
  if (out.length > 1) { out.sort((a, b) => score(t, b) - score(t, a)); }
  return n ? out.slice(0, n) : out;
}
function aimAt(t, e) { t.ang = Math.atan2(e.y - t.cy, e.x - t.cx); }

function updateTowers(G, dt) {
  if (G.dirty) calcStats(G);
  for (const t of G.towers) {
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 4);
    if (t.pulse > 0) t.pulse = Math.max(0, t.pulse - dt * 1.5);
    if (t.stunT > 0) { t.stunT -= dt; continue; }
    const st = t.st;
    if (!st.rate) continue;
    t.cd -= dt;
    if (t.cd > 0) continue;
    if (st.aura) {
      const list = targets(G, t);
      if (!list.length) { t.cd = 0.05; continue; }
      t.cd = 1 / st.rate;
      for (const e of list) { hurt(G, e, st.dmg, 'magic', { t }); applySlow(G, e, st.slow, st.slowT); }
      ring(G, t.cx, t.cy, 0.3, st.range, 0.45, '#bfefff');
      if (!G.noFx) for (let i = 0; i < 4; i++) { const a = G.rnd() * 6.28, rr = G.rnd() * st.range; part(G, t.cx + Math.cos(a) * rr, t.cy + Math.sin(a) * rr, 0.3, 0, 0, 0.6, 0.9, '#ffffff', 0.06, 'snow'); }
      Hook.sfx('blizzard');
      t.recoil = 1;
      continue;
    }
    const n = st.multi || st.missiles || 1;
    const list = targets(G, t, st.missiles ? 3 : n);
    if (!list.length) { t.cd = 0.05; continue; }
    t.cd = 1 / st.rate;
    t.recoil = 1;
    aimAt(t, list[0]);
    fire(G, t, list);
  }
}
function applySlow(G, e, a, T) {
  if (!a) return;
  const bossMul = e.boss ? 0.5 : 1;
  if (a * bossMul >= e.slowA) { e.slowA = a * bossMul; e.slowT = Math.max(e.slowT, T); }
  else e.slowT = Math.max(e.slowT, T * 0.5);
}
const TOP_H = { arrow: 0.75, cannon: 0.5, frost: 0.8, magic: 0.95, sniper: 1.0, banner: 0.8, mine: 0.3 };
function fire(G, t, list) {
  const st = t.st, h0 = TOP_H[t.k] * (1 + t.tier * 0.08);
  const e = list[0];
  switch (t.k) {
    case 'arrow': {
      const shots = st.multi ? list.slice(0, st.multi) : [e];
      for (const tg of shots) {
        let dmg = st.dmg, crit = false;
        if (st.crit && G.rnd() < st.crit) { dmg *= st.critX; crit = true; }
        G.projs.push({ k: 'arrow', x: t.cx, y: t.cy, h: h0, tg, tx: tg.x, ty: tg.y, spd: 13, dmg, crit, shred: st.shred, src: { t }, life: 2 });
      }
      Hook.sfx('arrow');
      break;
    }
    case 'cannon': {
      if (st.missiles) {
        for (let i = 0; i < st.missiles; i++) {
          const tg = list[i % list.length];
          const a = t.ang + (i - 1) * 0.9;
          G.projs.push({ k: 'missile', x: t.cx, y: t.cy, h: h0, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, tg, tx: tg.x, ty: tg.y, spd: 2, dmg: st.dmg, splash: st.splash, src: { t }, life: 4, smoke: 0 });
        }
        Hook.sfx('missile');
      } else {
        const T = 0.55 + Math.sqrt(dist2(t.cx, t.cy, e.x, e.y)) * 0.07;
        // 預判落點
        const o = { x: 0, y: 0 };
        const lead = e.frozenT > 0 ? 0 : e.spd * (1 - e.slowA) * T * 0.92;
        pathPos(e.P, Math.min(e.P.len, e.dist + lead), o);
        G.projs.push({ k: 'ball', x0: t.cx, y0: t.cy, x: t.cx, y: t.cy, tx: o.x - o.dy * e.off, ty: o.y + o.dx * e.off, T, tt: 0, h0, h: h0, dmg: st.dmg, splash: st.splash, stun: st.stun || 0, big: !!st.stun, src: { t } });
        Hook.sfx(st.stun ? 'bigboom' : 'cannon');
      }
      break;
    }
    case 'frost':
      G.projs.push({ k: 'shard', x: t.cx, y: t.cy, h: h0, tg: e, tx: e.x, ty: e.y, spd: 9, dmg: st.dmg, slow: st.slow, slowT: st.slowT, splash: st.splash || 0, freeze: st.freeze || 0, freezeT: st.freezeT || 0, src: { t }, life: 2 });
      Hook.sfx('frost');
      break;
    case 'magic':
      if (st.chain) {
        const pts = [{ x: t.cx, y: t.cy, h: h0 }];
        const hit = new Set();
        let cur = e, dmg = st.dmg;
        for (let i = 0; i < st.chain && cur; i++) {
          hit.add(cur);
          pts.push({ x: cur.x, y: cur.y, h: cur.fly ? 0.75 : 0.25 });
          hurt(G, cur, dmg, 'magic', { t });
          spark(G, cur.x, cur.y, cur.fly ? 0.75 : 0.25, '#d9c2ff', 5);
          dmg *= 0.85;
          let best = null, bd = 1.8 * 1.8;
          for (const o of G.enemies) {
            if (!o.alive || hit.has(o)) continue;
            const dd = dist2(o.x, o.y, cur.x, cur.y);
            if (dd < bd) { bd = dd; best = o; }
          }
          cur = best;
        }
        G.bolts.push({ pts, life: 0.22, max: 0.22, c: '#c9a8ff', w: 1 });
        Hook.sfx('zap');
      } else if (st.beam) {
        const dx = e.x - t.cx, dy = e.y - t.cy, l = Math.hypot(dx, dy) || 1;
        const L = st.range + 0.6, bx = t.cx + dx / l * L, by = t.cy + dy / l * L;
        for (const o of G.enemies) {
          if (!o.alive) continue;
          if (segDist2(o.x, o.y, t.cx, t.cy, bx, by) < (0.32 + o.r * 0.5) ** 2) hurt(G, o, st.dmg, 'magic', { t });
        }
        G.bolts.push({ pts: [{ x: t.cx, y: t.cy, h: h0 }, { x: bx, y: by, h: 0.35 }], life: 0.3, max: 0.3, c: '#ff9ef0', w: 3, beam: true });
        Hook.sfx('beam');
      } else {
        G.projs.push({ k: 'orb', x: t.cx, y: t.cy, h: h0, tg: e, tx: e.x, ty: e.y, spd: 7.5, dmg: st.dmg, src: { t }, life: 2.5 });
        Hook.sfx('magic');
      }
      break;
    case 'sniper': {
      let dmg = st.dmg;
      let head = false;
      if (st.headshot && G.rnd() < st.headshot) { head = true; dmg = e.boss ? dmg * 3 : e.hp + e.shield + 1e5; }
      if (st.mark) { e.markT = st.markT; e.markA = Math.max(e.markA, st.mark); }
      const dealt = hurt(G, e, dmg, head && !e.boss ? 'true' : 'phys', { t, pierce: st.pierce });
      G.bolts.push({ pts: [{ x: t.cx, y: t.cy, h: h0 }, { x: e.x, y: e.y, h: e.fly ? 0.75 : 0.25 }], life: 0.16, max: 0.16, c: '#fff6c8', w: 1.5, tracer: true });
      spark(G, e.x, e.y, e.fly ? 0.75 : 0.3, '#fff2a8', 6);
      if (head) addText(G, e.x, e.y - 0.6, '爆頭！', '#ff5d6c', 1.1);
      else if (dealt > 0 && !G.noFx) addText(G, e.x, e.y - 0.55, String(Math.round(dealt)), '#ffffff', 0.8, true);
      Hook.sfx('snipe');
      break;
    }
  }
}

function explode(G, x, y, r, dmg, type, src, opts) {
  opts = opts || {};
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (e.fly && !opts.air) continue;
    const d2 = dist2(e.x, e.y, x, y), rr = r + e.r * 0.6;
    if (d2 > rr * rr) continue;
    const fall = 1 - 0.35 * Math.sqrt(d2) / rr;
    hurt(G, e, dmg * fall, type, src);
    if (opts.stun && e.alive) { const T = e.boss ? opts.stun * 0.25 : opts.stun; if (e.frozenT < T) { e.frozenT = T; e.stunFx = T; } }
  }
}

function updateProjs(G, dt) {
  const keep = [];
  for (const p of G.projs) {
    let done = false;
    if (p.k === 'ball' || p.k === 'meteor') {
      p.tt += dt;
      if (p.tt < 0) { keep.push(p); continue; }
      const u = Math.min(1, p.tt / p.T);
      p.x = lerp(p.x0, p.tx, u); p.y = lerp(p.y0, p.ty, u);
      p.h = p.k === 'ball' ? lerp(p.h0, 0.1, u) + Math.sin(u * Math.PI) * (0.9 + p.T * 0.6) : lerp(7, 0, u * u);
      if (p.k === 'meteor' && !G.noFx && G.rnd() < 0.8) part(G, p.x, p.y, p.h, (G.rnd() - 0.5) * 0.5, (G.rnd() - 0.5) * 0.5, 0.5, 0.45, G.rnd() < 0.5 ? '#ffb347' : '#ff6a3a', 0.12, 'smoke');
      if (u >= 1) {
        done = true;
        if (p.k === 'ball') {
          explode(G, p.tx, p.ty, p.splash, p.dmg, 'phys', p.src, { stun: p.stun });
          boom(G, p.tx, p.ty, p.splash, p.big);
          Hook.sfx(p.big ? 'bigboomhit' : 'boom');
        } else {
          explode(G, p.tx, p.ty, p.r, p.dmg, 'true', null, { air: true });
          boom(G, p.tx, p.ty, p.r, true);
          Hook.shake(0.45); Hook.sfx('meteorhit');
        }
      }
    } else if (p.k === 'missile') {
      p.life -= dt;
      if (p.tg && p.tg.alive) { p.tx = p.tg.x; p.ty = p.tg.y; }
      else if (p.tg && !p.tg.alive) {
        // 原目標死了：找最近的新目標
        let best = null, bd = 9;
        for (const o of G.enemies) { if (!o.alive) continue; const dd = dist2(o.x, o.y, p.x, p.y); if (dd < bd) { bd = dd; best = o; } }
        p.tg = best;
      }
      p.spd = Math.min(9, p.spd + dt * 14);
      const dx = p.tx - p.x, dy = p.ty - p.y, l = Math.hypot(dx, dy) || 1;
      const turn = Math.min(1, dt * 7);
      p.vx = lerp(p.vx, dx / l * p.spd, turn); p.vy = lerp(p.vy, dy / l * p.spd, turn);
      p.x += p.vx * dt; p.y += p.vy * dt;
      const th = p.tg && p.tg.fly ? 0.75 : 0.25; p.h = lerp(p.h, th, Math.min(1, dt * 3));
      p.smoke -= dt;
      if (p.smoke <= 0 && !G.noFx) { p.smoke = 0.03; part(G, p.x, p.y, p.h, 0, 0, 0.25, 0.4, '#d9d9d9', 0.07, 'smoke'); }
      if (l < 0.22 || p.life <= 0) {
        done = true;
        explode(G, p.x, p.y, p.splash, p.dmg, 'phys', p.src, { air: true });
        boom(G, p.x, p.y, p.splash * 0.8, false, p.h);
        Hook.sfx('boom');
      }
    } else {
      // 追蹤彈：箭、冰晶、法球
      p.life -= dt;
      if (p.tg && p.tg.alive) { p.tx = p.tg.x; p.ty = p.tg.y; }
      const th = p.tg && p.tg.fly ? 0.75 : 0.28;
      const dx = p.tx - p.x, dy = p.ty - p.y, l = Math.hypot(dx, dy);
      const mv = p.spd * dt;
      p.ang = Math.atan2(dy, dx);
      if (l <= mv + 0.05 || p.life <= 0) {
        done = true;
        const tg = p.tg && p.tg.alive ? p.tg : null;
        if (p.k === 'arrow') {
          if (tg) {
            if (p.shred) tg.shred = Math.min(0.3, tg.shred + p.shred);
            const dealt = hurt(G, tg, p.dmg, 'phys', p.src);
            if (p.crit) addText(G, p.tx, p.ty - 0.6, '暴擊 ' + Math.round(dealt), '#ffb347', 0.9);
            spark(G, p.tx, p.ty, th, '#ffe7b0', 3);
          }
        } else if (p.k === 'shard') {
          const hitList = [];
          if (p.splash) { for (const o of G.enemies) if (o.alive && dist2(o.x, o.y, p.tx, p.ty) < (p.splash) ** 2) hitList.push(o); }
          else if (tg) hitList.push(tg);
          if (tg && !hitList.includes(tg)) hitList.push(tg);
          for (const o of hitList) {
            hurt(G, o, p.dmg, 'magic', p.src);
            if (!o.alive) continue;
            applySlow(G, o, p.slow, p.slowT);
            if (p.freeze && G.rnd() < p.freeze) { const T = o.boss ? p.freezeT * 0.25 : p.freezeT; if (o.frozenT < T) { o.frozenT = T; o.brittle = true; } }
          }
          spark(G, p.tx, p.ty, th, '#c8f3ff', 7);
          if (p.splash) ring(G, p.tx, p.ty, 0.1, p.splash, 0.3, '#bdefff');
        } else {
          if (tg) hurt(G, tg, p.dmg, 'magic', p.src);
          spark(G, p.tx, p.ty, th, '#e2c8ff', 8);
        }
      } else {
        p.x += dx / l * mv; p.y += dy / l * mv; p.h = lerp(p.h, th, Math.min(1, dt * 4));
      }
    }
    if (!done) keep.push(p);
  }
  G.projs = keep;
}

// ───────── 技能 ─────────
function castMeteor(G, x, y) {
  const s = G.skills.meteor;
  if (!s.on || s.cd > 0 || G.state !== 'run') return false;
  s.cd = s.max;
  const dmg = SKILLS.meteor.dmg * G.M.meteor * (1 + 0.06 * Math.max(0, G.wave));
  const offs = [[0, 0], [-0.55, 0.45], [0.55, 0.4]];
  offs.forEach(([ox, oy], i) => {
    const tx = clamp(x + ox, 0, COLS), ty = clamp(y + oy, 0, ROWS);
    G.projs.push({ k: 'meteor', x0: tx + 1.5, y0: ty - 2.5, x: tx, y: ty, tx, ty, T: 0.7, tt: -i * 0.2, h: 7, dmg, r: SKILLS.meteor.r });
  });
  Hook.sfx('meteor');
  return true;
}
function castFreeze(G) {
  const s = G.skills.freeze;
  if (!s.on || s.cd > 0 || G.state !== 'run') return false;
  s.cd = s.max;
  const dur = SKILLS.freeze.dur + G.M.freeze;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (e.boss) { e.slowA = Math.max(e.slowA, 0.6); e.slowT = Math.max(e.slowT, dur); }
    else e.frozenT = Math.max(e.frozenT, dur);
    if (!G.noFx) part(G, e.x, e.y, 0.4, 0, 0, 1.2, 0.8, '#e6fbff', 0.1, 'snow');
  }
  G.iceFlash = 0.8;
  Hook.sfx('freeze');
  return true;
}

// ───────── 特效（只給畫面用） ─────────
function part(G, x, y, h, vx, vy, vh, life, c, sz, k) {
  if (G.noFx || G.parts.length > 900) return;
  G.parts.push({ x, y, h, vx, vy, vh, life, max: life, c, sz, k: k || 'dot' });
}
function burst(G, x, y, h, n, c, sp, life) {
  if (G.noFx) return;
  for (let i = 0; i < n; i++) {
    const a = G.rnd() * 6.283, v = (0.3 + G.rnd()) * sp * 0.5;
    part(G, x, y, h, Math.cos(a) * v, Math.sin(a) * v, 1 + G.rnd() * 2.5, life * (0.6 + G.rnd() * 0.6), c, 0.05 + G.rnd() * 0.06, 'dot');
  }
}
function spark(G, x, y, h, c, n) {
  if (G.noFx) return;
  for (let i = 0; i < n; i++) {
    const a = G.rnd() * 6.283, v = 1 + G.rnd() * 2;
    part(G, x, y, h, Math.cos(a) * v, Math.sin(a) * v, (G.rnd() - 0.3) * 2, 0.25 + G.rnd() * 0.2, c, 0.04, 'spark');
  }
}
function ring(G, x, y, r0, r1, life, c) { if (!G.noFx) G.rings.push({ x, y, r0, r1, life, max: life, c }); }
function boom(G, x, y, r, big, h) {
  if (G.noFx) return;
  h = h || 0;
  ring(G, x, y, 0.1, r, 0.35, '#fff3c4');
  for (let i = 0; i < (big ? 26 : 12); i++) {
    const a = G.rnd() * 6.283, v = G.rnd() * r * 2.5;
    part(G, x, y, h + 0.1, Math.cos(a) * v, Math.sin(a) * v, 1 + G.rnd() * 2, 0.4 + G.rnd() * 0.3, G.rnd() < 0.5 ? '#ffb347' : '#ffe27a', 0.08 + G.rnd() * 0.07, 'dot');
  }
  for (let i = 0; i < (big ? 10 : 5); i++) {
    const a = G.rnd() * 6.283, v = G.rnd() * r;
    part(G, x, y, h + 0.15, Math.cos(a) * v, Math.sin(a) * v, 0.6, 0.8 + G.rnd() * 0.5, '#6d6258', 0.16 + G.rnd() * 0.1, 'smoke');
  }
  G.scorch = G.scorch || [];
  if (h < 0.2) { G.scorch.push({ x, y, r: r * 0.55, life: 6 }); if (G.scorch.length > 40) G.scorch.shift(); }
}
function addText(G, x, y, s, c, sz, small) {
  if (G.noFx) return;
  if (small && G.texts.length > 40) return;
  G.texts.push({ x, y, s, c, sz: sz || 1, life: 1.1, max: 1.1 });
}
function updateFx(G, dt) {
  if (G.noFx) return;
  const P = [];
  for (const p of G.parts) {
    p.life -= dt; if (p.life <= 0) continue;
    p.x += p.vx * dt; p.y += p.vy * dt; p.h += p.vh * dt;
    if (p.k === 'dot') { p.vh -= 7 * dt; if (p.h < 0) { p.h = 0; p.vh *= -0.3; p.vx *= 0.6; p.vy *= 0.6; } }
    else if (p.k === 'smoke') { p.vx *= 0.96; p.vy *= 0.96; }
    else if (p.k === 'snow') { p.vh = -0.4; }
    else { p.vx *= 0.9; p.vy *= 0.9; }
    P.push(p);
  }
  G.parts = P;
  G.texts = G.texts.filter(t => (t.life -= dt) > 0);
  G.rings = G.rings.filter(r => (r.life -= dt) > 0);
  G.bolts = G.bolts.filter(b => (b.life -= dt) > 0);
  if (G.scorch) G.scorch = G.scorch.filter(s => (s.life -= dt) > 0);
  if (G.flash > 0) G.flash -= dt;
  if (G.iceFlash > 0) G.iceFlash -= dt;
}

// ───────── 主更新 ─────────
function step(G, dt) {
  updateFx(G, dt);
  if (G.state === 'won' || G.state === 'lost') return;
  G.t += dt;
  for (const k in G.skills) { const s = G.skills[k]; if (s.cd > 0 && G.state === 'run') s.cd = Math.max(0, s.cd - dt); }
  if (G.nextT !== null) { G.nextT -= dt; if (G.nextT <= 0) { G.nextT = 0; callWave(G, false); } }
  for (const sp of G.spawners) {
    if (sp.delay > 0) { sp.delay -= dt; continue; }
    sp.timer -= dt;
    if (sp.timer <= 0 && sp.left > 0) { spawnEnemy(G, sp.k, sp.entry, sp.hp); sp.left--; sp.timer = sp.gap; }
  }
  if (G.spawners.length) G.spawners = G.spawners.filter(s => s.left > 0);
  if (G.state === 'run' && G.wave >= 0 && !G.spawners.length && G.nextT === null && G.wave < G.nWaves - 1) G.nextT = WAVE_GAP;
  updateEnemies(G, dt);
  if (G.state !== 'run') return;
  updateTowers(G, dt);
  updateProjs(G, dt);
  if (G.enemies.some(e => !e.alive)) G.enemies = G.enemies.filter(e => e.alive);
  if (!G.endless && G.wave === G.nWaves - 1 && !G.spawners.length && !G.enemies.length && G.state === 'run') {
    G.state = 'won';
    const f = G.lives / G.maxLives;
    G.stars = f >= 0.9 ? 3 : f >= 0.5 ? 2 : 1;
    Hook.sfx('win'); Hook.ended(G);
  }
}
