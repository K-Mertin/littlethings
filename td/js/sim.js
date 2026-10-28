'use strict';
// 守塔奇兵：遊戲邏輯（純模擬，不碰 DOM）。座標單位是「格」，地圖 16×10。
const STEP = 1 / 60;

function metaBonus(meta) {
  const r = id => (meta && meta[id]) || 0;
  return {
    startGold: r('gold') * 30, bounty: 1 + r('bounty') * 0.08, cheap: r('cheap') * 0.05, refund: 0.7 + r('refund') * 0.1,
    early: 1 + r('early') * 0.5, lives: r('lives') * 3, range: 1 + r('range') * 0.05,
    dmg: { arrow: 1 + r('arrow') * 0.12, cannon: 1 + r('cannon') * 0.08, frost: 1 + r('frost') * 0.15, magic: 1 + r('magic') * 0.12, sniper: 1 + r('sniper') * 0.12, banner: 1, mine: 1, barracks: 1 + r('barracks') * 0.1, alchemy: 1 + r('alchemy') * 0.12 },
    troopHp: 1 + r('barracks') * 0.15, poolT: 1 + r('alchemy') * 0.1, sight: r('sight') * 0.4, reveal: 1.5 + r('sight') * 0.3,
    splash: 1 + r('cannon') * 0.12, slowT: 1 + r('frost') * 0.25, banner: r('banner') * 0.05, mine: 1 + r('mine') * 0.15,
    meteor: 1 + r('meteor') * 0.35, meteorCd: 1 - r('meteorCd') * 0.15, freeze: r('freeze'), freezeCd: 1 - r('freezeCd') * 0.15,
  };
}

// tp：傳送段（直接跳過）、rv：河道段（坐船）、tn：地道段（在地底走）
function buildPath(pts, tp, rv, tn) {
  const p = pts.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
  const seg = []; let len = 0;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y);
    seg.push({ a, b, l, s: len, i, dx: (b.x - a.x) / l, dy: (b.y - a.y) / l, tp: !!(tp && tp.includes(i)), rv: !!(rv && rv.includes(i)), tn: !!(tn && tn.includes(i)) });
    len += l;
  }
  return { pts: p, seg, len };
}
function pathPos(P, d, o) {
  let s = P.seg[P.seg.length - 1];
  for (let i = 0; i < P.seg.length; i++) { if (d < P.seg[i].s + P.seg[i].l) { s = P.seg[i]; break; } }
  const t = clamp(d - s.s, 0, s.l);
  o.x = s.a.x + s.dx * t; o.y = s.a.y + s.dy * t; o.dx = s.dx; o.dy = s.dy; o.sg = s;
  return o;
}
// 每條路線（含傳送段、河道、地道的標記）
const levelPaths = L => L.paths.map((p, i) => buildPath(p, L.tp && L.tp[i], L.river && L.river[i], L.tunnel && L.tunnel[i]));
// 一條路線拆成幾段折線（畫路用）：跳過傳送段與地道；water = true 時河道也跳過
function pathRuns(P, water) {
  const runs = []; let cur = [P.pts[0]];
  P.seg.forEach((sg, i) => { if (sg.tp || sg.tn || (water && sg.rv)) { if (cur.length > 1) runs.push(cur); cur = [P.pts[i + 1]]; } else cur.push(P.pts[i + 1]); });
  if (cur.length > 1) runs.push(cur);
  return runs;
}
// 一條路線上的河道段（畫水用）
function riverRuns(P) { return P.seg.filter(sg => sg.rv).map(sg => [sg.a, sg.b]); }
const inMap = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

function buildGrid(L, T) {
  const g = [];
  for (let y = 0; y < ROWS; y++) { const row = []; for (let x = 0; x < COLS; x++) row.push({ path: false, block: false, water: false, deco: null, tower: null, near: 9 }); g.push(row); }
  L.paths.forEach((P, pi) => {
    for (let i = 0; i < P.length - 1; i++) {
      if (L.tp && L.tp[pi] && L.tp[pi].includes(i)) continue;
      const tn = L.tunnel && L.tunnel[pi] && L.tunnel[pi].includes(i), rv = L.river && L.river[pi] && L.river[pi].includes(i);
      let [x0, y0] = P[i]; const [x1, y1] = P[i + 1];
      const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
      for (;;) {
        // 地道：只有兩端的洞口是路，中間的地面可以蓋塔
        if (inMap(x0, y0) && (!tn || (x0 === P[i][0] && y0 === P[i][1]) || (x0 === x1 && y0 === y1))) g[y0][x0].path = true;
        if (inMap(x0, y0) && rv) g[y0][x0].riv = true;
        if (x0 === x1 && y0 === y1) break;
        x0 += sx; y0 += sy;
      }
    }
  });
  for (const [px, py] of (L.pads || [])) if (inMap(px, py)) g[py][px].pad = true;
  // 第三章：雪崩陷阱、冰洞巢穴、熔爐基座、碎石、火盆、輸送帶拉桿（都不能蓋塔，碎石清掉之後可以）
  for (const [tx, ty] of (L.traps || [])) if (inMap(tx, ty)) { g[ty][tx].trap = true; g[ty][tx].block = true; }
  for (const [nx, ny] of (L.nests || [])) if (inMap(nx, ny)) { g[ny][nx].nest = true; g[ny][nx].block = true; }
  for (const [ax, ay] of (L.anvils || [])) if (inMap(ax, ay)) g[ay][ax].anv = true;
  for (const [rx, ry] of (L.rubble || [])) if (inMap(rx, ry) && !g[ry][rx].path) { g[ry][rx].rub = true; g[ry][rx].block = true; }
  for (const [bx, by] of (L.braziers || [])) if (inMap(bx, by)) { g[by][bx].brz = true; g[by][bx].block = true; }
  if (L.lever && inMap(L.lever[0], L.lever[1])) { g[L.lever[1]][L.lever[0]].lever = true; g[L.lever[1]][L.lever[0]].block = true; }
  for (const [cx, cy, cw, chh] of (L.belts || [])) for (let y = cy; y < cy + chh; y++) for (let x = cx; x < cx + cw; x++) if (inMap(x, y)) g[y][x].belt = true;
  (L.bridges || []).forEach(([bx, by], i) => { if (inMap(bx, by)) g[by][bx].br = i; });
  for (const [lx, ly] of (L.lamps || [])) if (inMap(lx, ly) && !g[ly][lx].path) { g[ly][lx].block = true; g[ly][lx].deco = 'lamp'; g[ly][lx].dv = 0.5; }
  if (L.tunnel) L.paths.forEach((P, pi) => (L.tunnel[pi] || []).forEach(i => { for (const [tx, ty] of [P[i], P[i + 1]]) if (inMap(tx, ty)) g[ty][tx].hole = true; }));
  for (const [cx, cy, cw, chh] of (L.current || [])) for (let y = cy; y < cy + chh; y++) for (let x = cx; x < cx + cw; x++) if (inMap(x, y)) g[y][x].cur = true;
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
    if (!c.path && !c.water && !c.pad && !c.deco && !c.block && !c.anv && r < p && !nearMech(g, x, y)) { c.block = true; c.deco = T.deco[Math.floor(rng() * T.deco.length)]; c.dv = rng(); }
  }
  return g;
}

// 陷阱和巢穴旁邊不放裝飾物（免得擋住）
function nearMech(g, x, y) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const r = g[y + dy], c = r && r[x + dx]; if (c && (c.trap || c.nest || c.lever)) return true; } return false; }
function levelAvail(li) {
  // 第 li 關可以用的塔：解鎖條件 ≤ max(這關, 已過關數)
  let cleared = 0;
  for (let i = 0; i < LEVELS.length; i++) if (Store.data.levels[i] && Store.data.levels[i].stars) cleared = i + 1;
  return Math.max(li, cleared);
}

function newGame(li, diff, opts) {
  opts = opts || {};
  const W = opts.weekly || null;
  if (W) { li = W.li; diff = 'normal'; opts.endless = true; opts.meta = {}; }
  const L = LEVELS[li], T = THEMES[L.theme], D = DIFFS[diff] || DIFFS.normal;
  const M = metaBonus(opts.meta !== undefined ? opts.meta : Store.data.meta);
  const lv = opts.avail !== undefined ? opts.avail : levelAvail(li);
  const mods = W ? W.mods : opts.heroic ? (L.heroic || []) : [];
  const G = {
    li, L, T, D, M, diff, endless: !!opts.endless, noFx: !!opts.noFx, rnd: mkRng(opts.seed || (Date.now() & 0xffffff)),
    t: 0, gold: L.gold + D.gold + M.startGold + (opts.endless ? 200 : 0), lives: D.lives + M.lives, uid: 1,
    paths: levelPaths(L), fpaths: L.paths.map(p => buildPath([p[0], p[p.length - 1]])),
    grid: buildGrid(L, T), wave: -1, spawners: [], enemies: [], towers: [], projs: [],
    parts: [], texts: [], rings: [], bolts: [], nextT: null, state: 'ready', dirty: true,
    heroic: !!opts.heroic, weekly: W, mods: new Set(mods), troops: [], pools: [],
    towersAvail: W ? W.towers.slice() : TOWER_ORDER.filter(k => TOWERS[k].unlock <= lv),
    skills: {
      meteor: { cd: 0, max: SKILLS.meteor.cd * M.meteorCd, on: SKILLS.meteor.unlock <= lv },
      freeze: { cd: 0, max: SKILLS.freeze.cd * M.freezeCd, on: SKILLS.freeze.unlock <= lv },
    },
    stats: { kills: 0, leaks: 0, built: 0, earned: 0, blocks: 0, poisonKills: 0, trapKills: 0, nests: 0 }, bossOn: null, flash: 0,
  };
  if (G.mods.has('poor')) G.gold = Math.round(G.gold * 0.8);
  if (G.heroic) G.lives = HEROIC_LIVES + M.lives;
  if (W) { G.gold = WEEKLY.gold + L.gold * 0.25; G.lives = WEEKLY.lives; G.gold = Math.round(G.gold); }
  // 挑戰模式
  G.chal = opts.chal || null;
  if (G.chal === 'limit' && L.limit) G.towersAvail = G.towersAvail.filter(k => L.limit.includes(k));
  if (G.chal === 'noskill') { G.skills.meteor.on = false; G.skills.freeze.on = false; }
  if (G.chal === 'iron') G.lives = 1;
  G.mod = null;
  G.stormT = L.storm ? L.storm[0] * 0.6 : 0; G.stormOn = false;
  G.maxLives = G.lives;
  G.waves = G.endless ? [] : genWaves(L);
  if (G.heroic) for (const w of G.waves) for (const g of w.groups) g.hp *= HEROIC_HP;
  if (G.mods.has('horde')) for (const w of G.waves) for (const g of w.groups) if (!ENEMIES[g.k].boss) g.n = Math.max(g.n + 1, Math.round(g.n * 1.3));
  G.nWaves = G.endless ? Infinity : G.waves.length;
  // 入口與出口位置（拿來畫箭頭和城堡）
  G.entryPts = L.entries.map(ent => {
    const P = G.paths[ent[0]], o = { x: 0, y: 0 };
    pathPos(P, 1.0, o); return { x: o.x, y: o.y, dx: P.seg[0].dx, dy: P.seg[0].dy };
  });
  const ex = G.paths[0], last = ex.seg[ex.seg.length - 1];
  G.exitPt = { x: last.b.x - last.dx * 0.5, y: last.b.y - last.dy * 0.5, dx: last.dx, dy: last.dy };
  G.hasCur = !!(L.current && L.current.length);
  for (const P of G.paths) { P.hasTp = P.seg.some(sg => sg.tp); P.hasRv = P.seg.some(sg => sg.rv); P.hasTn = P.seg.some(sg => sg.tn); }
  // 岔路口：同一個入口的路線共用的開頭有多長（敵人走到這裡才決定走哪條，吊橋、旋轉祭壇用）
  G.forkJ = G.paths.map(() => 0);
  for (const ent of L.entries) for (const pi of ent) {
    let J = 0;
    for (const pj of ent) {
      if (pj === pi) continue;
      const A = L.paths[pi], B = L.paths[pj]; let k = 0;
      while (k < A.length && k < B.length && A[k][0] === B[k][0] && A[k][1] === B[k][1]) k++;
      if (k >= 2) J = Math.max(J, G.paths[pi].seg[k - 2].s + G.paths[pi].seg[k - 2].l);
    }
    G.forkJ[pi] = J;
  }
  // 關卡機制的狀態
  G.bridges = (L.bridges || []).map(([x, y, ph]) => ({ x, y, ph, open: true }));
  G.weather = L.weather ? { i: 0, t: L.weather[0][1], k: L.weather[0][0], strikeT: 1.5 } : null;
  G.rotor = L.rotor ? { i: 0, t: L.rotor[2], ang: 0 } : null;
  G.fog = !!L.fog; G.eclipse = false;
  G.lamps = (L.lamps || []).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
  // 第三章的關卡機制
  G.traps = (L.traps || []).map(([x, y], i) => { const p = nearPath(G, x + 0.5, y + 0.5); return { i, x, y, cx: x + 0.5, cy: y + 0.5, tx: lerp(p.x, x + 0.5, 0.12), ty: lerp(p.y, y + 0.5, 0.12), cd: 3 + i * 2, max: TRAP.cd }; });
  G.nests = (L.nests || []).map(([x, y, w]) => { const p = nearPath(G, x + 0.5, y + 0.5); return { nest: true, x: x + 0.5, y: y + 0.5, gx: x, gy: y, wake: w, awake: false, alive: true, hp: 1, maxHp: 1, spawnT: 2, pi: p.pi, pd: p.d, d: {}, fly: false, boss: false, under: 0, inv: 0, inT: false, vis: true, dist: 1, P: { len: 2 }, r: 0.42, off: 0, shield: 0, slowA: 0, slowT: 0, frozenT: 0, markT: 0, markA: 0, flash: 0, k: 'nest' }; });
  G.belt = L.belts ? { on: 0, cd: 2, max: BELT.cd } : null;
  G.cold = L.cold ? { on: false, t: L.cold[0] * 0.7 } : null;
  G.braziers = (L.braziers || []).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
  G.wyrmStorm = false;
  updateBridges(G);
  G.hero = opts.hero && typeof makeHero === 'function' ? makeHero(G, opts.hero) : null;
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
  Hook.fx('build', G, t);
  calcStats(G);
  if (TOWERS[k].troops) { t.rally = rallyPoint(G, t); syncTroops(G, t); }
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
  if (TOWERS[t.k].troops) syncTroops(G, t, true);
  Hook.fx('upgrade', G, t);
  burst(G, t.cx, t.cy, 0.5, 22, t.tier === 3 ? '#ffe27a' : '#ffffff', 2.6, 0.7);
  ring(G, t.cx, t.cy, 0.2, 0.9, 0.4, '#ffe27a');
  Hook.sfx(t.tier === 3 ? 'spec' : 'upgrade');
  return true;
}
function sellValue(G, t) { return G.wave < 0 ? t.spent : Math.floor(t.spent * G.M.refund); }
function sellTower(G, t) {
  const v = sellValue(G, t);
  Hook.fx('sell', G, t);
  G.gold += v;
  G.towers = G.towers.filter(o => o !== t);
  if (G.troops.length) G.troops = G.troops.filter(o => o.t !== t);
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
  const wk = G.weather ? G.weather.k : null;
  for (const t of G.towers) {
    const d = TOWERS[t.k], s = baseStats(t);
    s.air = s.air !== undefined ? s.air : d.air;
    if (t.buff.air && !d.troops && t.k !== 'alchemy') s.air = true;
    const pad = G.grid[t.y][t.x].pad, anv = G.grid[t.y][t.x].anv;
    if (s.dmg) s.dmg *= M.dmg[t.k] * (1 + t.buff.dmg) * (pad ? 1.25 : 1) * (anv ? 1.1 : 1) * (wk === 'thunder' && t.k === 'magic' ? 1.35 : 1);
    if (d.troops) s.range *= 1; // 集結範圍不受射程加成影響
    else s.range *= M.range * (1 + t.buff.range) * (pad ? 1.1 : 1) * (G.stormOn ? G.L.storm[2] : 1) * (wk === 'wind' && (t.k === 'arrow' || t.k === 'sniper') ? 0.85 : 1);
    if (s.rate) s.rate *= (1 + t.buff.rate) * (wk === 'rain' && t.k !== 'frost' && !d.troops ? 0.85 : 1) * (anv ? 1.2 : 1);
    // 寒潮：沒有靠近火盆的塔凍得動作變慢；永夜暴風雪：所有塔都變慢
    t.cold = !!(G.cold && G.cold.on && !d.troops && !towerWarm(G, t));
    if (s.rate && t.cold) s.rate *= G.L.cold[2];
    if (s.rate && G.wyrmStorm && !d.troops) s.rate *= 0.8;
    if (wk === 'rain' && s.slow) s.slow = Math.min(0.75, s.slow + 0.1);
    if (d.troops) { s.hp *= M.troopHp * (pad ? 1.25 : 1); }
    if (s.poolT) s.poolT *= M.poolT * (wk === 'rain' ? 0.65 : 1);
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
  if (G.endless) G.waves[G.wave] = endlessWave(G, G.wave);
  const W = G.waves[G.wave];
  if (G.endless) G.mod = W.mod || null;
  let boss = null;
  for (const g of W.groups) {
    G.spawners.push({ k: g.k, left: g.n, gap: g.gap, delay: g.delay, timer: 0, entry: g.entry, hp: g.hp });
    if (ENEMIES[g.k].boss) boss = g.k;
  }
  G.nextT = null;
  // 每波的軍餉
  if (G.wave > 0) { const wg = waveGold(G); G.gold += wg; G.stats.earned += wg; if (G.hero) heroXp(G, G.hero, 10); }
  // 金礦發薪水
  for (const t of G.towers) {
    if (t.k !== 'mine') continue;
    let g = Math.round(t.st.gold * G.M.mine);
    if (t.st.interest) g += Math.min(80, Math.floor(G.gold * t.st.interest));
    G.gold += g; G.stats.earned += g;
    addText(G, t.cx, t.cy - 0.4, '+' + g, '#ffd84a', 1.2);
    Hook.fx('mine', G, t, g);
    burst(G, t.cx, t.cy, 0.5, 8, '#ffd84a', 1.8, 0.7);
    t.pulse = 1;
  }
  Hook.sfx(boss ? 'bosshorn' : 'horn');
  Hook.banner(G, boss);
  return true;
}
// 無盡模式（含每週挑戰）的一波：套用「大軍」詞綴
function endlessWave(G, i) {
  const W = genEndlessWave(G.L, i);
  if (G.mods.has('horde')) for (const g of W.groups) if (!ENEMIES[g.k].boss) g.n = Math.max(g.n + 1, Math.round(g.n * 1.3));
  return W;
}
// 下一波預覽
function waveGold(G) { return Math.round(10 + 3 * Math.min(G.wave, 30)); }
function nextWaveInfo(G) {
  const i = G.wave + 1;
  if (i >= G.nWaves) return null;
  if (G.endless && !G.waves[i]) G.waves[i] = endlessWave(G, i);
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
    abilT: d.stomp || d.summon || d.dash || d.burrow || d.dig || d.shell || d.drums || (d.freezeT ? d.freezeT * 0.6 : 0) || d.throwT || d.shellT || d.breathT || 2.4, under: 0, revived: false, dashT: 0, stunFx: 0,
    off: d.boss ? 0 : (G.rnd() - 0.5) * 0.34, x: 0, y: 0, dx: 1, dy: 0, alive: true, wob: G.rnd() * 6.28, r: d.r,
    lives: d.lives || 1, healFx: 0, vis: true, revealT: 0, wardA: 0, phase: 0, inv: 0, inT: false, riv: false,
    poisonT: 0, poisonD: 0, corT: 0, corA: 0, hasteT: 0, abil2: 6, forkDone: false,
  };
  if (G.mod === 'swift') e.spd *= 1.15;
  if (G.mod === 'armored') e.armor = Math.min(0.85, e.armor + 0.2);
  if (G.mods.size) {
    if (G.mods.has('swift')) e.spd *= 1.12;
    if (G.mods.has('armored')) e.armor = Math.min(0.85, e.armor + 0.15);
    if (G.mods.has('warded')) e.mres = Math.min(0.85, e.mres + 0.2);
    if (G.mods.has('shielded') && !e.boss) { e.shield += hp * 0.2; e.shieldMax += hp * 0.2; }
  }
  if (d.boss && d.phases) e.abil2 = 9;
  if (k === 'bossEclipse') { e.shield = e.shieldMax = hp * 0.12; }
  if (k === 'bossWyrm') e.fly = true; // 冰龍一開始在空中盤旋（但沿著道路前進）
  e.shieldBase = e.shieldMax; // 會自己回充的護盾上限（冰晶蛾給的冰片護盾不會回充）
  placeEnemy(e);
  G.enemies.push(e);
  if (e.boss) { G.bossOn = e; Hook.sfx('roar'); Hook.shake(0.5); Hook.fx('boss', G, e); }
  return e;
}
const _po = { x: 0, y: 0, dx: 0, dy: 0 };
function placeEnemy(e) {
  pathPos(e.P, e.dist, _po);
  e.x = _po.x - _po.dy * e.off; e.y = _po.y + _po.dx * e.off; e.dx = _po.dx; e.dy = _po.dy;
  const sg = _po.sg;
  if (!e.fly) {
    // 地道：除了洞口附近都在地底下
    e.inT = sg.tn && e.dist > sg.s + 0.35 && e.dist < sg.s + sg.l - 0.35;
    e.riv = sg.rv && e.dist > sg.s + 0.2 && e.dist < sg.s + sg.l - 0.2;
  }
}

function hurt(G, e, amt, type, src) {
  if (e.nest) return hurtNest(G, e, amt, type, src);
  if (!e.alive || amt <= 0 || e.under > 0 || e.inv > 0) return 0;
  let m = 1;
  if (e.markT > 0) m += e.markA;
  if (e.frozenT > 0 && e.brittle) m += 0.5;
  const cor = e.corT > 0 ? e.corA : 0;
  if (type === 'phys') {
    let ar = Math.max(0, e.armor - e.shred - cor);
    if (src && src.pierce) ar *= 1 - src.pierce;
    m *= 1 - ar;
  } else if (type === 'magic') m *= 1 - Math.max(0, e.mres - cor * 0.6);
  else if (type === 'poison') m *= 1 - Math.max(0, e.mres - cor * 0.6) * 0.5;
  if (e.wardA > 0) m *= 1 - e.wardA;
  let a = amt * m;
  if (e.d.cap && type !== 'true') a = Math.min(a, e.maxHp * e.d.cap);
  const dealt = a;
  if (e.d.stealth || G.fog || G.eclipse) e.revealT = Math.max(e.revealT, 1.2);
  if (e.shield > 0) { const ab = Math.min(e.shield, a); e.shield -= ab; a -= ab; }
  e.hp -= a; e.flash = 0.09; e.lastHit = G.t;
  if (src && src.t) src.t.dmgDone += dealt;
  else if (src && src.h) src.h.dmgDone += dealt;
  if (e.hp <= 0) { if (type === 'poison') e._pk = true; killEnemy(G, e, src); }
  return dealt;
}
function killEnemy(G, e, src) {
  if (e.d.revive && !e.revived) {
    // 木乃伊：倒下一次會再站起來
    e.revived = true; e.hp = e.maxHp * e.d.revive; e.frozenT = Math.max(e.frozenT, 0.8); e.stunFx = 0;
    ring(G, e.x, e.y, 0.1, 0.9, 0.5, '#e8d8a0'); Hook.fx('revive', G, e); Hook.sfx('summon');
    return;
  }
  e.alive = false;
  if (e._pk) G.stats.poisonKills++;
  if (src && src.trap) { G.stats.trapKills++; e._tk = true; }
  if (e.d.shatter) {
    // 冰晶蛾：碎成冰片，附近的同伴得到一層不會回充的護盾
    let n = 0;
    for (const o of G.enemies) {
      if (!o.alive || o === e || o.boss || o.d.shatter || dist2(o.x, o.y, e.x, e.y) > 1.5 * 1.5) continue;
      o.shield += o.maxHp * e.d.shatter; o.shieldMax = Math.max(o.shieldMax, o.shield); n++;
    }
    ring(G, e.x, e.y, 0.1, 1.5, 0.45, '#cff4ff'); Hook.fx('shatter', G, e, n);
  }
  Hook.fx('kill', G, e);
  const b = Math.max(1, Math.round(e.d.bounty * Math.pow(e.hpMul, 0.7) * G.D.bounty * G.M.bounty * (G.mod === 'rich' ? 1.3 : 1)));
  G.gold += b; G.stats.kills++;
  if (src && src.t) src.t.kills++;
  else if (src && src.h) { src.h.kills++; heroXp(G, src.h, e.boss ? 120 : Math.max(2, Math.round(b * 0.8))); }
  addText(G, e.x, e.y - 0.35 - (e.fly ? 0.5 : 0), '+' + b, '#ffd84a', e.boss ? 1.6 : 0.9);
  const col = enemyColor(e.k);
  if (e.boss) {
    burst(G, e.x, e.y, 0.6, 60, col, 4, 1.2); burst(G, e.x, e.y, 0.6, 30, '#ffd84a', 3, 1);
    ring(G, e.x, e.y, 0.2, 2.6, 0.7, '#ffffff');
    Hook.shake(1); Hook.sfx('bossdie');
    if (G.bossOn === e) G.bossOn = null;
    if (e.k === 'bossEclipse') { G.eclipse = false; Hook.fx('dawn', G, e); }
    if (e.k === 'bossWyrm' && G.wyrmStorm) { G.wyrmStorm = false; G.dirty = true; Hook.fx('dawn', G, e); }
  } else {
    burst(G, e.x, e.y, e.fly ? 0.6 : 0.25, 12, col, 2.6, 0.55);
    Hook.sfx('pop');
  }
  if (e.d.drop) {
    // 熱氣球：哥布林跳到最近的地面道路上
    const P = G.paths[e.pi], o = { x: 0, y: 0 };
    let bd = 1e9, best = 0;
    for (let d = 0.4; d < P.len - 0.6; d += 0.25) { pathPos(P, d, o); if (o.sg.tp) continue; const dd = dist2(o.x, o.y, e.x, e.y); if (dd < bd) { bd = dd; best = d; } }
    for (let i = 0; i < e.d.dropN; i++) { const c = spawnEnemy(G, e.d.drop, 0, e.hpMul, e.pi, Math.max(0, best - 0.1 - i * 0.2)); c.off = (i - 1) * 0.18; placeEnemy(c); c._drop = 0.45; }
    Hook.fx('drop', G, e);
  }
  if (e.poisonT > 0 && e.poisonSpread && !e.fly) addPool(G, e.x, e.y, 0.55, e.poisonSpread, 2.2, { spread: false, corrode: 0, src: e.poisonSrc, mini: true });
  if (e.d.split) {
    for (let i = 0; i < e.d.splitN; i++) {
      const c = spawnEnemy(G, e.d.split, 0, e.hpMul, e.pi, Math.max(0, e.dist - 0.12 - i * 0.22));
      c.off = (i - 1) * 0.18; placeEnemy(c);
    }
  }
}
function enemyColor(k) {
  return ({ slime: '#6ad65e', runner: '#ff9a3c', beetle: '#9aa6b6', bat: '#9c6bff', golem: '#b9a98e', healer: '#ffffff', shield: '#5aa8ff', splitter: '#ff7fbf', mini: '#ff9fd0', ogre: '#7fae55', gargoyle: '#8e98a8', skeleton: '#f1eee2', bossGolem: '#b28c63', bossDragon: '#ff5a3a', bossLich: '#8a5cff', wisp: '#bfe8ff', crawler: '#7fe8ff', mummy: '#e8dcc0', crab: '#ff7a4a', imp: '#e8f6ff', yeti: '#f0f4fa', clock: '#c8a050', frostmage: '#7ac8ff', moth: '#bfeaff', bossYeti: '#e8f0ff', bossColossus: '#a8a0a0', bossWyrm: '#8ad8ff', bossRoc: '#6a8ae8', bossWorm: '#9a7ad8', bossPharaoh: '#ffd36b', bossKraken: '#b04ad8' })[k] || '#fff';
}

function updateEnemies(G, dt) {
  // 每隔幾幀：隱身／夜霧的可見度、薩滿的守護光環
  G._visT = (G._visT || 0) - dt;
  if (G._visT <= 0) { G._visT = 0.1; updateVision(G); }
  const wk = G.weather ? G.weather.k : null;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.d.mech) { e.frozenT = 0; e.slowA = 0; e.slowT = 0; e.brittle = false; } // 發條兵、鋼鐵巨像：不會被減速、冰凍、震暈
    if (e.markT > 0) e.markT -= dt;
    if (e.revealT > 0) e.revealT -= dt;
    if (e.corT > 0) e.corT -= dt;
    if (e.hasteT > 0) e.hasteT -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowA = 0; }
    let sp = e.spd * (1 - e.slowA);
    if (e.frozenT > 0) { e.frozenT -= dt; sp = 0; if (e.frozenT <= 0) e.brittle = false; }
    if (e.held && !e.riv && !e.inT) sp = 0;
    if (e.dashT > 0) { e.dashT -= dt; sp *= 2.4; }
    if (e.under > 0) e.under -= dt;
    if (e.inv > 0) { e.inv -= dt; sp = 0; }
    if (e.hasteT > 0) sp *= 1.45;
    if (e.d.rage) sp *= 1 + e.d.rage * clamp(1 - e.hp / e.maxHp, 0, 1);
    if (!e.fly && G.hasCur) { const cx = Math.floor(e.x), cy = Math.floor(e.y); if (inMap(cx, cy) && G.grid[cy][cx].cur) sp *= 1.4; }
    if (e.riv) sp *= 1.5;
    if (wk === 'rain') sp *= 0.9;
    else if (wk === 'wind' && e.fly) sp *= 1.4;
    if (e._drop > 0) { e._drop -= dt; sp = 0; }
    // 吊橋收起：在橋頭等
    if (G.bridges.length && !e.fly && sp > 0) {
      pathPos(e.P, e.dist + 0.62, _po);
      const ax = Math.floor(_po.x), ay = Math.floor(_po.y), cx = Math.floor(e.x), cy = Math.floor(e.y);
      if (inMap(ax, ay)) { const b = G.grid[ay][ax].br; if (b !== undefined && !G.bridges[b].open && !(inMap(cx, cy) && G.grid[cy][cx].br === b)) { sp = 0; e.waitBr = true; } else e.waitBr = false; }
    }
    // 輸送帶反轉：把地面敵人往回推（頭目只推一半）
    if (G.belt && G.belt.on > 0 && !e.fly && !e.inT) { const bx = Math.floor(e.x), by = Math.floor(e.y); if (inMap(bx, by) && G.grid[by][bx].belt) sp -= BELT.push * (e.boss ? 0.5 : 1); }
    e.dist = Math.max(0, e.dist + sp * dt);
    // 岔路口：吊橋與旋轉祭壇決定走哪條
    if (!e.fly && !e.forkDone && G.forkJ[e.pi] > 0 && e.dist >= G.forkJ[e.pi]) { e.forkDone = true; forkChoose(G, e); }
    if (e.P.hasTp) {
      for (const sg of e.P.seg) if (sg.tp && e.dist > sg.s && e.dist < sg.s + sg.l) {
        const fx = e.x, fy = e.y; e.dist = sg.s + sg.l + 0.02; placeEnemy(e);
        Hook.fx('tp', G, e, fx, fy); Hook.sfx('magic');
        break;
      }
    }
    e.wob += dt * (2 + sp * 4);
    if (e.dist >= e.P.len) { leak(G, e); continue; }
    const wasT = e.inT;
    placeEnemy(e);
    if (wasT !== e.inT) Hook.fx(e.inT ? 'tunnelIn' : 'tunnelOut', G, e);
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
        if (n) { ring(G, e.x, e.y, 0.2, 1.7, 0.5, '#7dffb0'); Hook.sfx('heal'); Hook.fx('heal', G, e); }
      }
    }
    if (e.shieldBase && e.shield < e.shieldBase && G.t - e.lastHit > 3) e.shield = Math.min(e.shieldBase, e.shield + e.shieldBase * 0.4 * dt);
    if (d.stomp && e.frozenT <= 0) {
      e.abilT -= dt;
      if (e.abilT <= 0) {
        e.abilT = d.stomp; let n = 0;
        const sr = d.ink ? 2.3 : 2.0;
        for (const t of G.towers) if (dist2(t.cx, t.cy, e.x, e.y) < sr * sr) { t.stunT = d.ink ? 2.2 : 2.5; t.inked = !!d.ink; n++; }
        ring(G, e.x, e.y, 0.3, sr, 0.6, d.ink ? '#5a3a8a' : '#d9b27a'); burst(G, e.x, e.y, 0, 20, d.ink ? '#2a1a3a' : '#a88a66', 3, 0.7);
        Hook.shake(0.6); Hook.sfx('stomp'); Hook.fx(d.ink ? 'ink' : 'stomp', G, e);
      }
    }
    if (d.summon && e.frozenT <= 0) {
      e.abilT -= dt;
      if (e.abilT <= 0) { e.abilT = d.summon; summonAround(G, e, d.summonK || 'skeleton', d.summonN || 3); }
    }
    if (d.burrow && e.frozenT <= 0) {
      e.abilT -= dt;
      if (e.abilT <= 0) { e.abilT = d.burrow; e.under = 2; e.dashT = 2; Hook.sfx('stomp'); Hook.fx('burrow', G, e); }
    }
    if (d.dig && e.frozenT <= 0 && !e.held && !e.inT && !e.riv) {
      e.abilT -= dt;
      if (e.abilT <= 0) { e.abilT = d.dig + G.rnd() * 1.2; e.under = 1.4; e.dashT = 1.4; Hook.fx('dig', G, e); }
    }
    if (d.freezeT && e.frozenT <= 0 && e.vis) {
      // 冰霜巫師：把附近一座塔凍成冰塊
      e.abilT -= dt;
      if (e.abilT <= 0) {
        let best = null, bd = 2.4 * 2.4;
        for (const t of G.towers) { if (t.stunT > 0.3) continue; const dd = dist2(t.cx, t.cy, e.x, e.y); if (dd < bd) { bd = dd; best = t; } }
        if (best) { e.abilT = d.freezeT; best.stunT = Math.max(best.stunT, 2); best.inked = false; best.iced = 2; Hook.fx('chill', G, e, best); Hook.sfx('frost'); }
        else e.abilT = 0.5;
      }
    }
    if (d.dash) {
      e.abilT -= dt;
      if (e.abilT <= 0) { e.abilT = d.dash; e.dashT = 1.6; Hook.sfx('roar'); Hook.fx('dash', G, e); }
    }
    if (d.phases) bossLogic(G, e, dt);
    if (e.healFx > 0) e.healFx -= dt;
    if (G.mod === 'regen' && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
    if (G.mods.has('regen') && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.015 * dt);
  }
}
function summonAround(G, e, sk, sn) {
  const hm = 1 + 0.05 * Math.max(0, G.wave);
  for (let i = 0; i < sn; i++) { const c = spawnEnemy(G, sk, 0, hm, e.pi, Math.max(0, e.dist - 0.3 - i * 0.3)); c.off = (i - (sn - 1) / 2) * 0.22; c.forkDone = e.forkDone; c.P = e.P; placeEnemy(c); }
  ring(G, e.x, e.y, 0.2, 1.5, 0.6, sk === 'wisp' ? '#bfe8ff' : sk === 'mummy' ? '#ffd36b' : sk === 'crab' ? '#ff9a6a' : sk === 'yeti' || sk === 'moth' ? '#dff6ff' : sk === 'clock' ? '#ffcf7a' : '#b38aff'); Hook.sfx('summon'); Hook.fx('summon', G, e);
}
// 隱身與夜霧：誰看得到
function updateVision(G) {
  const fog = G.fog || G.eclipse, sight = (G.eclipse ? 2.2 : 2.0) + G.M.sight, rv = G.M.reveal;
  let anyWard = false;
  for (const e of G.enemies) { e.wardA = 0; if (e.alive && e.d.ward) anyWard = true; }
  if (anyWard) for (const s of G.enemies) {
    if (!s.alive || !s.d.ward) continue;
    for (const o of G.enemies) if (o.alive && o !== s && dist2(o.x, o.y, s.x, s.y) < 1.7 * 1.7) o.wardA = Math.max(o.wardA, s.d.ward);
  }
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (!fog && !e.d.stealth) { e.vis = true; continue; }
    let v = e.revealT > 0 || e.held;
    const r = e.d.stealth ? Math.min(rv, fog ? sight : rv) : sight;
    if (!v) for (const t of G.towers) if (dist2(t.cx, t.cy, e.x, e.y) < r * r) { v = true; break; }
    if (!v && fog && !e.d.stealth && !G.eclipse) for (const l of G.lamps) if (dist2(l.x, l.y, e.x, e.y) < 2.2 * 2.2) { v = true; break; }
    if (!v && fog) { const ex = G.exitPt; if (dist2(ex.x, ex.y, e.x, e.y) < 2.2 * 2.2) v = true; }
    if (!v && e.boss && !G.eclipse) v = true; // 頭目太大了，霧裡也看得到
    e.vis = v;
  }
}
function forkChoose(G, e) {
  const ent = G.L.entries.find(en => en.includes(e.pi));
  if (!ent || ent.length < 2) return;
  let np = e.pi;
  if (G.rotor) np = G.L.rotor[3][G.rotor.i];
  else if (G.bridges.length) {
    // 選吊橋放下的那條；都收起就選比較快放下的
    let best = -1e9;
    for (const pi of ent) {
      const b = bridgeOn(G, pi); if (!b) continue;
      const sc = b.open ? 100 + G.rnd() : -bridgeWait(G, b);
      if (sc > best) { best = sc; np = pi; }
    }
  }
  if (np !== e.pi && ent.includes(np)) { e.pi = np; e.P = G.paths[np]; }
}
function bridgeOn(G, pi) {
  for (const sg of G.paths[pi].seg) for (const b of G.bridges) if (segDist2(b.x + 0.5, b.y + 0.5, sg.a.x, sg.a.y, sg.b.x, sg.b.y) < 0.05) return b;
  return null;
}
const BR_P = 14, BR_OPEN = 8;
function bridgeWait(G, b) { const ph = (G.t + b.ph) % BR_P; return ph < BR_OPEN ? 0 : BR_P - ph; }
function updateBridges(G) {
  for (const b of G.bridges) {
    const ph = (G.t + b.ph) % BR_P, op = ph < BR_OPEN;
    if (op !== b.open) { b.open = op; Hook.fx('bridge', G, b, op); }
    b.p = op ? (BR_OPEN - ph) / BR_OPEN : (BR_P - ph) / (BR_P - BR_OPEN); // 剩下的比例（畫面用）
  }
}
// 天氣、旋轉祭壇
function updateLevelMech(G, dt) {
  if (G.bridges.length) updateBridges(G);
  updateMech3(G, dt);
  const W = G.weather;
  if (W && G.state === 'run') {
    W.t -= dt;
    if (W.t <= 0) {
      W.i = (W.i + 1) % G.L.weather.length; const [k, d] = G.L.weather[W.i];
      W.k = k; W.t = d; W.max = d; G.dirty = true; W.strikeT = 1.2;
      Hook.fx('weather', G, k);
    }
    if (W.k === 'thunder') {
      W.strikeT -= dt;
      if (W.strikeT <= 0) {
        W.strikeT = 1.3 + G.rnd() * 0.8;
        const list = G.enemies.filter(e => e.alive && !e.inT && e.under <= 0 && e.dist > 0.5);
        if (list.length) {
          const e = list[Math.floor(G.rnd() * list.length)];
          hurt(G, e, (45 + 4 * Math.max(0, G.wave)) * (e.boss ? 0.5 : 1), 'true', null);
          e.stunFx = 0.6; if (!e.boss && e.frozenT < 0.6) e.frozenT = 0.6;
          G.bolts.push({ pts: [{ x: e.x + 0.6, y: e.y, h: 7 }, { x: e.x + 0.2, y: e.y, h: 3.5 }, { x: e.x, y: e.y, h: 0.3 }], life: 0.3, max: 0.3, c: '#fff3a0', w: 2 });
          Hook.fx('strike', G, e); Hook.sfx('zap');
        }
      }
    }
  }
  if (G.rotor && G.state === 'run') {
    const R = G.rotor; R.t -= dt;
    if (R.t <= 0) { R.t = G.L.rotor[2]; R.i = (R.i + 1) % G.L.rotor[3].length; Hook.fx('rotor', G, R); Hook.sfx('build'); }
  }
}
// ───────── 第三章的關卡機制 ─────────
const TRAP = { cd: 20, r: 1.3, dmg: 75 };
const BELT = { cd: 24, dur: 5, push: 1.55 };
const NEST = { hp: 1300, every: 7, bounty: 60 };
const RUB_COST = 40;
// 最靠近某一點的地面道路（不含傳送段、地道）
function nearPath(G, x, y) {
  const o = { x: 0, y: 0 }; let best = { x, y, pi: 0, d: 0 }, bd = 1e9;
  G.paths.forEach((P, pi) => { for (let d = 0.6; d < P.len - 0.6; d += 0.1) { pathPos(P, d, o); if (o.sg.tp || o.sg.tn) continue; const dd = dist2(o.x, o.y, x, y); if (dd < bd) { bd = dd; best = { x: o.x, y: o.y, pi, d }; } } });
  return best;
}
// 雪崩陷阱：砸中附近道路上的地面敵人（頭目只吃六成、不會被砸暈）
function triggerTrap(G, tr) {
  if (!tr || tr.cd > 0 || G.state !== 'run') return false;
  tr.cd = tr.max;
  const dmg = TRAP.dmg * (1 + 0.09 * Math.max(0, G.wave)) * (G.M.meteor > 1 ? 1 + (G.M.meteor - 1) * 0.5 : 1);
  for (const e of G.enemies) {
    if (!e.alive || e.fly || e.inT || e.under > 0) continue;
    if (dist2(e.x, e.y, tr.tx, tr.ty) > (TRAP.r + e.r * 0.5) ** 2) continue;
    hurt(G, e, e.boss ? dmg * 0.6 : dmg, 'true', { trap: true });
    if (!e.alive) continue;
    if (e.boss) applySlow(G, e, 0.5, 3); else if (!e.d.mech && e.frozenT < 1.6) { e.frozenT = 1.6; e.stunFx = 1.6; }
  }
  ring(G, tr.tx, tr.ty, 0.2, TRAP.r, 0.6, '#ffffff'); burst(G, tr.tx, tr.ty, 0.3, 26, '#f4faff', 3.2, 0.9);
  Hook.fx('avalanche', G, tr); Hook.sfx('meteorhit'); Hook.shake(0.5);
  return true;
}
// 清除碎石（底下可能有熔爐基座）
function clearRubble(G, x, y) {
  if (!inMap(x, y) || G.state === 'won' || G.state === 'lost') return false;
  const c = G.grid[y][x];
  if (!c.rub || G.gold < RUB_COST) return false;
  G.gold -= RUB_COST; c.rub = false; c.block = false; c.dug = true;
  G._spotCache = {};
  burst(G, x + 0.5, y + 0.5, 0.2, 18, '#9a8a7a', 2.6, 0.7);
  Hook.fx('rubble', G, x, y, !!c.anv); Hook.sfx(c.anv ? 'spec' : 'stomp');
  return true;
}
// 輸送帶反轉
function activateBelt(G) {
  const B = G.belt;
  if (!B || B.cd > 0 || G.state !== 'run') return false;
  B.cd = B.max; B.on = BELT.dur;
  Hook.fx('belt', G, true); Hook.sfx('build');
  return true;
}
// 冰洞巢穴受傷：物理七成、毒打不到
function hurtNest(G, n, amt, type, src) {
  if (!n.alive || !n.awake || amt <= 0 || type === 'poison') return 0;
  const a = amt * (type === 'phys' ? 0.7 : 1) * (n.markT > 0 ? 1 + n.markA : 1);
  n.hp -= a; n.flash = 0.09;
  if (src && src.t) src.t.dmgDone += a;
  if (n.hp <= 0) {
    n.alive = false; G.grid[n.gy][n.gx].nestDead = true;
    const b = Math.round((NEST.bounty + 5 * Math.max(0, G.wave)) * G.D.bounty);
    G.gold += b; G.stats.nests++;
    if (src && src.t) src.t.kills++;
    addText(G, n.x, n.y - 0.6, '+' + b, '#ffd84a', 1.4);
    burst(G, n.x, n.y, 0.4, 40, '#dff6ff', 3.5, 1); ring(G, n.x, n.y, 0.2, 1.6, 0.6, '#bfeaff');
    Hook.fx('nestDie', G, n); Hook.sfx('bossdie'); Hook.shake(0.5);
  }
  return a;
}
function updateNests(G, dt) {
  for (const n of G.nests) {
    if (n.flash > 0) n.flash -= dt;
    if (n.markT > 0) n.markT -= dt;
    if (!n.alive || G.state !== 'run') continue;
    if (!n.awake) {
      if (G.wave >= n.wake) {
        n.awake = true; n.maxHp = n.hp = NEST.hp * G.D.hp * (1 + 0.08 * G.wave) * (G.heroic ? HEROIC_HP : 1); n.spawnT = 1.5;
        Hook.fx('nestWake', G, n); Hook.sfx('summon');
      }
      continue;
    }
    // 這一波還在出怪時，每隔幾秒放出小雪妖
    if (!G.spawners.length) continue;
    n.spawnT -= dt;
    if (n.spawnT <= 0) {
      n.spawnT = NEST.every;
      const hm = G.L.hp0 * (1 + G.L.hpg * Math.max(0, G.wave));
      for (let i = 0; i < 2; i++) { const c = spawnEnemy(G, 'imp', 0, hm, n.pi, Math.max(0, n.pd - i * 0.25)); c.forkDone = true; c._drop = 0.35; }
      Hook.fx('nestSpawn', G, n);
    }
  }
}
function towerWarm(G, t) { for (const b of G.braziers) if (dist2(b.x, b.y, t.cx, t.cy) <= 2.25 * 2.25) return true; return false; }
function updateMech3(G, dt) {
  if (G.state !== 'run') return;
  for (const tr of G.traps) if (tr.cd > 0) tr.cd = Math.max(0, tr.cd - dt);
  if (G.belt) { const B = G.belt; if (B.cd > 0) B.cd = Math.max(0, B.cd - dt); if (B.on > 0) { B.on -= dt; if (B.on <= 0) { B.on = 0; Hook.fx('belt', G, false); } } }
  if (G.nests.length) updateNests(G, dt);
  if (G.cold) {
    const C = G.cold; C.t -= dt;
    if (C.t <= 0) { C.on = !C.on; C.t = C.on ? G.L.cold[1] : G.L.cold[0]; C.max = C.t; G.dirty = true; Hook.fx('cold', G, C.on); }
  }
}

// ───────── 多階段頭目 ─────────
function bossLogic(G, e, dt) {
  const d = e.d, f = e.hp / e.maxHp;
  while (e.phase < d.phases.length && f <= d.phases[e.phase]) { e.phase++; bossPhase(G, e); }
  if (e.frozenT > 0) return;
  e.abil2 -= dt;
  if (e.k === 'bossTortoise') {
    if (e.phase === 0) {
      e.abilT -= dt;
      if (e.abilT <= 0 && e.inv <= 0) { e.abilT = d.shell; e.inv = 2.6; Hook.fx('shell', G, e); Hook.sfx('stomp'); }
    } else if (e.abil2 <= 0) { e.abil2 = 6; summonAround(G, e, 'crab', 3); }
  } else if (e.k === 'bossRaijin') {
    e.abilT -= dt;
    if (e.abilT <= 0) {
      e.abilT = d.drums;
      const near = G.towers.filter(t => dist2(t.cx, t.cy, e.x, e.y) < 3.4 * 3.4);
      for (let i = 0; i < 3 && near.length; i++) {
        const t = near.splice(Math.floor(G.rnd() * near.length), 1)[0];
        t.stunT = 1.8; t.inked = false;
        G.bolts.push({ pts: [{ x: t.cx + 0.4, y: t.cy, h: 7 }, { x: t.cx + 0.1, y: t.cy, h: 3.5 }, { x: t.cx, y: t.cy, h: 1.0 }], life: 0.35, max: 0.35, c: '#bfe0ff', w: 2 });
      }
      ring(G, e.x, e.y, 0.3, 3.4, 0.6, '#bfe0ff'); Hook.shake(0.5); Hook.sfx('zap'); Hook.fx('drums', G, e);
    }
    if (e.phase >= 2 && e.abil2 <= 0) {
      e.abil2 = 8;
      for (const o of G.enemies) if (o.alive) o.hasteT = 3.5;
      Hook.fx('frenzy', G, e); Hook.sfx('roar');
    }
  } else if (e.k === 'bossYeti' || e.k === 'bossColossus' || e.k === 'bossWyrm') {
    bossLogic3(G, e, dt);
  } else if (e.k === 'bossEclipse') {
    if (e.phase === 0) {
      if (e.abil2 <= 0) { e.abil2 = 9; summonAround(G, e, 'shade', 2); }
    } else if (e.phase === 1) {
      e.abilT -= dt;
      if (e.abilT <= 0) {
        e.abilT = 6.5;
        const fx = e.x, fy = e.y; e.dist = Math.min(e.P.len - 2.5, e.dist + 2.0); placeEnemy(e);
        Hook.fx('blink', G, e, fx, fy); Hook.sfx('magic');
      }
      if (e.abil2 <= 0) { e.abil2 = 9; summonAround(G, e, 'raven', 3); }
    } else {
      e.abilT -= dt;
      if (e.abilT <= 0) {
        e.abilT = 7;
        for (const t of G.towers) if (dist2(t.cx, t.cy, e.x, e.y) < 2.4 * 2.4) { t.stunT = 2.5; t.inked = true; }
        ring(G, e.x, e.y, 0.3, 2.4, 0.7, '#6a3ad8'); Hook.shake(0.7); Hook.sfx('stomp'); Hook.fx('pulse', G, e);
      }
      if (e.abil2 <= 0) { e.abil2 = 8; summonAround(G, e, 'shade', 2); }
    }
  }
}
// 頭目往塔丟東西（雪球、砲彈）：落地時讓塔暫停
function lobAt(G, e, t, kind, stun) {
  const T = 0.75 + Math.sqrt(dist2(e.x, e.y, t.cx, t.cy)) * 0.08;
  G.projs.push({ k: 'lob', kind, x0: e.x, y0: e.y, x: e.x, y: e.y, tx: t.cx, ty: t.cy, T, tt: 0, h0: 1.2, h: 1.2, tgt: t, stun });
}
// 射程內最強的塔（等級高、輸出高的優先）
function strongTowers(G, e, r, n) {
  return G.towers.filter(t => !TOWERS[t.k].support && t.stunT <= 0.5 && dist2(t.cx, t.cy, e.x, e.y) < r * r).sort((a, b) => (b.tier * 1e6 + b.dmgDone) - (a.tier * 1e6 + a.dmgDone)).slice(0, n);
}
function iceTowers(G, x, y, r, T) {
  for (const t of G.towers) if (dist2(t.cx, t.cy, x, y) < r * r) { t.stunT = Math.max(t.stunT, T); t.inked = false; t.iced = T; }
}
function bossLogic3(G, e, dt) {
  const d = e.d;
  if (e.k === 'bossYeti') {
    e.abilT -= dt;
    if (e.phase === 0) {
      if (e.abilT <= 0) { const tg = strongTowers(G, e, 4.2, 1)[0]; e.abilT = tg ? d.throwT : 1; if (tg) { lobAt(G, e, tg, 'snow', 3.5); Hook.fx('throw', G, e); Hook.sfx('stomp'); } }
    } else {
      if (e.abilT <= 0) { e.abilT = 8; iceTowers(G, e.x, e.y, 2.3, 2); ring(G, e.x, e.y, 0.3, 2.3, 0.7, '#cff4ff'); Hook.shake(0.6); Hook.sfx('blizzard'); Hook.fx('roar3', G, e); }
      if (e.abil2 <= 0) { e.abil2 = 13; summonAround(G, e, 'yeti', 2); }
    }
  } else if (e.k === 'bossColossus') {
    e.abilT -= dt;
    if (e.phase === 0) {
      if (e.abilT <= 0) { const ts = strongTowers(G, e, 4.6, 2); e.abilT = ts.length ? d.shellT : 1; for (const t of ts) lobAt(G, e, t, 'shell', 2.4); if (ts.length) { Hook.fx('cannon3', G, e); Hook.sfx('bigboom'); } }
    } else {
      if (e.abilT <= 0) { e.abilT = 6; iceTowers(G, e.x, e.y, 1.9, 1.5); for (const t of G.towers) if (dist2(t.cx, t.cy, e.x, e.y) < 1.9 * 1.9) t.iced = 0; ring(G, e.x, e.y, 0.3, 1.9, 0.6, '#e8e0d8'); Hook.sfx('blizzard'); Hook.fx('steam', G, e); }
      if (e.abil2 <= 0) { e.abil2 = 7; summonAround(G, e, 'clock', 3); }
    }
  } else if (e.k === 'bossWyrm') {
    e.abilT -= dt;
    if (e.abilT <= 0) {
      e.abilT = e.phase >= 2 ? 6 : d.breathT;
      // 冰息：前方一片區域的塔被凍住
      const o = { x: 0, y: 0 }; pathPos(e.P, Math.min(e.P.len - 0.5, e.dist + 1.6), o);
      iceTowers(G, o.x, o.y, 2.0, 2.2);
      G.bolts.push({ pts: [{ x: e.x, y: e.y, h: e.fly ? 1.2 : 0.8 }, { x: o.x, y: o.y, h: 0.2 }], life: 0.5, max: 0.5, c: '#bff0ff', w: 4, beam: true });
      ring(G, o.x, o.y, 0.3, 2.0, 0.7, '#dff8ff'); burst(G, o.x, o.y, 0.3, 30, '#e8fbff', 3, 0.9);
      Hook.fx('breath', G, e, o.x, o.y); Hook.sfx('blizzard'); Hook.shake(0.4);
    }
    if (e.phase === 1 && e.abil2 <= 0) { e.abil2 = 12; e.shield += e.maxHp * 0.08; e.shieldMax = Math.max(e.shieldMax, e.shield); summonAround(G, e, 'yeti', 2); Hook.fx('iceArmor', G, e); }
    if (e.phase === 2 && e.abil2 <= 0) { e.abil2 = 10; summonAround(G, e, 'moth', 3); }
  }
}
function bossPhase(G, e) {
  const k = e.k;
  if (k === 'bossTortoise') { e.armor = 0.1; e.spd *= 1.7; e.inv = 0; e.abil2 = 1; }
  else if (k === 'bossRaijin') { if (e.phase === 1) { e.fly = true; e.spd *= 1.15; } else { e.abil2 = 0.5; e.spd *= 1.1; } }
  else if (k === 'bossYeti') { e.spd *= 1.25; e.abilT = 1.5; e.abil2 = 2; }
  else if (k === 'bossColossus') { e.armor = 0.15; e.spd *= 1.45; e.abilT = 2; e.abil2 = 1.5; }
  else if (k === 'bossWyrm') {
    if (e.phase === 1) { e.fly = false; e.abilT = 3; e.abil2 = 1; e.armor = 0.4; }
    else { G.wyrmStorm = true; G.dirty = true; e.spd *= 1.3; e.abilT = 2; e.abil2 = 3; }
  }
  else if (k === 'bossEclipse') {
    if (e.phase === 1) { G.eclipse = true; e.shield = 0; e.shieldMax = 0; e.shieldBase = 0; e.abilT = 2; e.abil2 = 3; }
    else { e.spd *= 1.35; e.abilT = 2; e.abil2 = 4; }
  }
  e.frozenT = 0; e.slowA = 0;
  burst(G, e.x, e.y, 0.8, 40, '#ffffff', 3.5, 1); ring(G, e.x, e.y, 0.2, 2.8, 0.8, '#ffe9a0');
  Hook.shake(1); Hook.sfx('bosshorn'); Hook.fx('phase', G, e, e.phase);
}

function leak(G, e) {
  e.alive = false;
  Hook.fx('leak', G, e);
  G.lives = Math.max(0, G.lives - e.lives); G.stats.leaks += e.lives;
  if (G.bossOn === e) G.bossOn = null;
  if (e.k === 'bossEclipse') G.eclipse = false;
  if (e.k === 'bossWyrm' && G.wyrmStorm) { G.wyrmStorm = false; G.dirty = true; }
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
    if (!e.alive || (e.fly && !st.air) || e.dist < 0.35 || e.under > 0 || e.inT || !e.vis || e.inv > 0) continue;
    if (dist2(t.cx, t.cy, e.x, e.y) > r2) continue;
    out.push(e);
  }
  // 附近沒有敵人時，打冰洞巢穴
  if (!out.length && G.nests.length && t.k !== 'alchemy') for (const nb of G.nests) if (nb.alive && nb.awake && dist2(t.cx, t.cy, nb.x, nb.y) <= r2 + 0.2) out.push(nb);
  if (out.length > 1) { out.sort((a, b) => score(t, b) - score(t, a)); }
  return n ? out.slice(0, n) : out;
}
function aimAt(t, e) { t.ang = Math.atan2(e.y - t.cy, e.x - t.cx); }

function updateTowers(G, dt) {
  if (G.dirty) calcStats(G);
  for (const t of G.towers) {
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 4);
    if (t.pulse > 0) t.pulse = Math.max(0, t.pulse - dt * 1.5);
    if (t.iced > 0) t.iced -= dt;
    if (t.snowT > 0) t.snowT -= dt;
    if (t.stunT > 0) { t.stunT -= dt; continue; }
    const st = t.st;
    if (!st.rate || TOWERS[t.k].troops) continue;
    t.cd -= dt;
    if (t.cd > 0) continue;
    if (st.aura) {
      const list = targets(G, t);
      if (!list.length) { t.cd = 0.05; continue; }
      t.cd = 1 / st.rate;
      for (const e of list) { hurt(G, e, st.dmg, 'magic', { t }); applySlow(G, e, st.slow, st.slowT); }
      ring(G, t.cx, t.cy, 0.3, st.range, 0.45, '#bfefff');
      if (!G.noFx) for (let i = 0; i < 4; i++) { const a = G.rnd() * 6.28, rr = G.rnd() * st.range; part(G, t.cx + Math.cos(a) * rr, t.cy + Math.sin(a) * rr, 0.3, 0, 0, 0.6, 0.9, '#ffffff', 0.06, 'snow'); }
      Hook.sfx('blizzard'); Hook.fx('aura', G, t);
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
    Hook.fx('fire', G, t, list[0]);
  }
}
function applySlow(G, e, a, T) {
  if (!a || e.d.mech) return;
  if (e.d.chill) a *= e.d.chill;
  const bossMul = e.boss ? 0.5 : 1;
  if (a * bossMul >= e.slowA) { e.slowA = a * bossMul; e.slowT = Math.max(e.slowT, T); }
  else e.slowT = Math.max(e.slowT, T * 0.5);
}
const TOP_H = { arrow: 0.75, cannon: 0.5, frost: 0.8, magic: 0.95, sniper: 1.0, banner: 0.8, mine: 0.3, barracks: 0.55, alchemy: 0.85 };
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
        const o = { x: e.x, y: e.y, dx: 0, dy: 0 };
        const lead = e.frozenT > 0 || e.nest ? 0 : e.spd * (1 - e.slowA) * T * 0.92;
        if (!e.nest) pathPos(e.P, Math.min(e.P.len, e.dist + lead), o);
        G.projs.push({ k: 'ball', x0: t.cx, y0: t.cy, x: t.cx, y: t.cy, tx: o.x - o.dy * e.off, ty: o.y + o.dx * e.off, T, tt: 0, h0, h: h0, dmg: st.dmg, splash: st.splash, stun: st.stun || 0, big: !!st.stun, src: { t } });
        Hook.sfx(st.stun ? 'bigboom' : 'cannon');
      }
      break;
    }
    case 'alchemy': {
      // 毒瓶：拋物線，預判落點（跟砲彈一樣）
      const T = 0.65 + Math.sqrt(dist2(t.cx, t.cy, e.x, e.y)) * 0.08, o = { x: 0, y: 0 };
      const lead = e.frozenT > 0 || e.held ? 0 : e.spd * (1 - e.slowA) * T * 0.85;
      pathPos(e.P, Math.min(e.P.len, e.dist + lead), o);
      G.projs.push({ k: 'flask', x0: t.cx, y0: t.cy, x: t.cx, y: t.cy, tx: o.x - o.dy * e.off, ty: o.y + o.dx * e.off, T, tt: 0, h0, h: h0, dmg: st.dmg, r: st.pool, life: st.poolT, spread: !!st.spread, corrode: st.corrode || 0, spec: t.spec, src: { t } });
      Hook.sfx('flask');
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
        if (e.nest) hurt(G, e, st.dmg, 'magic', { t });
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
      if (st.headshot && !e.nest && G.rnd() < st.headshot) { head = true; dmg = e.boss ? dmg * 3 : e.hp + e.shield + 1e5; }
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
    if (opts.evade && e.d.evade && G.rnd() < e.d.evade) continue;
    const fall = 1 - 0.35 * Math.sqrt(d2) / rr;
    hurt(G, e, dmg * fall, type, src);
    if (opts.stun && e.alive && !e.d.mech) { const T = e.boss ? opts.stun * 0.25 : opts.stun; if (e.frozenT < T) { e.frozenT = T; e.stunFx = T; } }
  }
  for (const nb of G.nests) if (nb.alive && nb.awake && dist2(nb.x, nb.y, x, y) < (r + 0.4) ** 2) hurtNest(G, nb, dmg, type, src);
}

function updateProjs(G, dt) {
  const keep = [];
  for (const p of G.projs) {
    let done = false;
    if (p.k === 'lob') {
      p.tt += dt;
      const u = Math.min(1, p.tt / p.T);
      p.x = lerp(p.x0, p.tx, u); p.y = lerp(p.y0, p.ty, u);
      p.h = lerp(p.h0, 0.6, u) + Math.sin(u * Math.PI) * (1.6 + p.T);
      if (u >= 1) {
        done = true;
        const t = p.tgt;
        if (t && G.towers.includes(t)) { t.stunT = Math.max(t.stunT, p.stun); t.inked = false; t.iced = 0; if (p.kind === 'snow') t.snowT = p.stun; }
        if (p.kind === 'shell') boom(G, p.tx, p.ty, 0.7, true, 0.5); else { burst(G, p.tx, p.ty, 0.6, 24, '#f4faff', 2.8, 0.8); ring(G, p.tx, p.ty, 0.1, 0.9, 0.4, '#ffffff'); }
        Hook.fx('lobHit', G, p); Hook.sfx(p.kind === 'shell' ? 'bigboomhit' : 'stomp'); Hook.shake(0.3);
      }
    } else if (p.k === 'flask') {
      p.tt += dt;
      const u = Math.min(1, p.tt / p.T);
      p.x = lerp(p.x0, p.tx, u); p.y = lerp(p.y0, p.ty, u);
      p.h = lerp(p.h0, 0.05, u) + Math.sin(u * Math.PI) * (1.0 + p.T * 0.5);
      if (u >= 1) { done = true; landFlask(G, p); }
    } else if (p.k === 'ball' || p.k === 'meteor') {
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
          Hook.fx('meteor', G, p.tx, p.ty, p.r);
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
        explode(G, p.x, p.y, p.splash, p.dmg, 'phys', p.src, { air: true, evade: true });
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
        let tg = p.tg && p.tg.alive ? p.tg : null;
        if (tg && tg.d.evade && G.rnd() < tg.d.evade) { addText(G, tg.x, tg.y - 0.8, '閃避', '#cfe0ff', 0.75, true); Hook.fx('evade', G, tg); tg = null; }
        if (p.k === 'arrow') {
          if (tg) {
            if (p.shred) tg.shred = Math.min(0.3, tg.shred + p.shred);
            const dealt = hurt(G, tg, p.dmg, 'phys', p.src);
            if (p.crit) addText(G, p.tx, p.ty - 0.6, '暴擊 ' + Math.round(dealt), '#ffb347', 0.9);
            Hook.fx('hit', G, p, tg);
            spark(G, p.tx, p.ty, th, '#ffe7b0', 3);
          }
        } else if (p.k === 'shard') {
          const hitList = [];
          if (p.splash) { for (const o of G.enemies) if (o.alive && dist2(o.x, o.y, p.tx, p.ty) < (p.splash) ** 2 && (o === tg || !o.d.evade || G.rnd() >= o.d.evade)) hitList.push(o); }
          else if (tg) hitList.push(tg);
          if (tg && !hitList.includes(tg)) hitList.push(tg);
          for (const o of hitList) {
            hurt(G, o, p.dmg, 'magic', p.src);
            if (!o.alive) continue;
            applySlow(G, o, p.slow, p.slowT);
            if (p.freeze && G.rnd() < p.freeze) { const T = o.boss ? p.freezeT * 0.25 : p.freezeT; if (o.frozenT < T) { o.frozenT = T; o.brittle = true; } }
          }
          spark(G, p.tx, p.ty, th, '#c8f3ff', 7);
          Hook.fx('hit', G, p, tg);
          if (p.splash) ring(G, p.tx, p.ty, 0.1, p.splash, 0.3, '#bdefff');
        } else {
          if (p.splash) explode(G, p.tx, p.ty, p.splash, p.dmg, 'magic', p.src, { air: true });
          else if (tg) hurt(G, tg, p.dmg, 'magic', p.src);
          spark(G, p.tx, p.ty, th, '#e2c8ff', 8);
          Hook.fx('hit', G, p, tg);
        }
      } else {
        p.x += dx / l * mv; p.y += dy / l * mv; p.h = lerp(p.h, th, Math.min(1, dt * 4));
      }
    }
    if (!done) keep.push(p);
  }
  G.projs = keep;
}


// ───────── 兵營的士兵 ─────────
// 集結點：離塔最近、在範圍內的地面道路（不含地道、河道）
function rallyPoint(G, t, wx, wy) {
  const o = { x: 0, y: 0 }, r = t.st.range;
  let best = null, bd = 1e9;
  const px = wx !== undefined ? wx : t.cx, py = wy !== undefined ? wy : t.cy;
  for (const P of G.paths) for (let d = 1.2; d < P.len - 1.4; d += 0.2) {
    pathPos(P, d, o);
    if (o.sg.tp || o.sg.tn || o.sg.rv || o.x < 0.4 || o.y < 0.4 || o.x > COLS - 0.4 || o.y > ROWS - 0.4) continue;
    const dt = dist2(o.x, o.y, t.cx, t.cy); if (dt > r * r) continue;
    const dd = dist2(o.x, o.y, px, py);
    if (dd < bd) { bd = dd; best = { x: o.x, y: o.y, dx: o.dx, dy: o.dy, f: d / P.len }; }
  }
  return best;
}
function setRally(G, t, wx, wy) { const r = rallyPoint(G, t, wx, wy); if (!r) return false; t.rally = r; for (const s of G.troops) if (s.t === t) s.tgt = null; Hook.fx('rally', G, t); return true; }
function troopHome(t, i, n) {
  const R = t.rally; if (!R) return { x: t.cx, y: t.cy };
  const k = n === 1 ? 0 : (i / (n - 1) - 0.5);
  // 沿著道路方向排開，左右錯開一點
  return { x: R.x + R.dx * k * 0.55 - R.dy * (i % 2 ? 0.12 : -0.12), y: R.y + R.dy * k * 0.55 + R.dx * (i % 2 ? 0.12 : -0.12) };
}
function syncTroops(G, t, heal) {
  const st = t.st, n = st.n;
  const mine = G.troops.filter(s => s.t === t);
  for (let i = mine.length; i < n; i++) G.troops.push({ t, i, x: t.cx, y: t.cy + 0.2, hp: st.hp, dead: false, respT: 0, tgt: null, cd: 0.5, atkT: 0, face: 1, walk: 0, id: G.uid++ });
  for (const s of G.troops) if (s.t === t) { s.i = Math.min(s.i, n - 1); if (heal && !s.dead) s.hp = st.hp; }
}
const enemyAtk = (G, e) => (e.d.atk || (2 + e.d.cost * 4)) * Math.sqrt(e.hpMul) * G.D.hp;
function updateTroops(G, dt) {
  for (const e of G.enemies) e.held = false;
  if (!G.troops.length) return;
  for (const s of G.troops) {
    const t = s.t, st = t.st;
    if (s.atkT > 0) s.atkT -= dt;
    if (s.dead) {
      s.respT -= dt;
      if (s.respT <= 0) { s.dead = false; s.hp = st.hp; s.x = t.cx; s.y = t.cy + 0.25; s.tgt = null; Hook.fx('troopUp', G, s); }
      continue;
    }
    if (!t.rally) continue;
    const home = troopHome(t, s.i, st.n);
    let tg = s.tgt;
    if (tg && (!tg.alive || tg.fly || tg.under > 0 || tg.inT || tg.riv || dist2(tg.x, tg.y, t.rally.x, t.rally.y) > 1.6 * 1.6)) tg = s.tgt = null;
    if (!tg && t.stunT <= 0) {
      // 找集結點附近還沒被擋住的地面敵人；都被擋住就去幫忙打
      let best = null, bs = -1e9;
      for (const e of G.enemies) {
        if (!e.alive || e.fly || e.under > 0 || e.inT || e.riv || e.dist < 0.4) continue;
        const dd = dist2(e.x, e.y, t.rally.x, t.rally.y); if (dd > 1.05 * 1.05) continue;
        const taken = G.troops.some(o => o !== s && !o.dead && o.tgt === e);
        const sc = (taken ? -50 : 0) + (e.boss ? -20 : 0) - dd + e.dist * 0.01;
        if (sc > bs) { bs = sc; best = e; }
      }
      if (best) { s.tgt = tg = best; if (!best.boss && !G.troops.some(o => o !== s && o.tgt === best)) { G.stats.blocks++; Hook.fx('block', G, best); } }
    }
    const gx = tg ? tg.x - tg.dx * 0.28 + (s.i - 1) * 0.06 : home.x, gy = tg ? tg.y - tg.dy * 0.28 : home.y;
    const dx = gx - s.x, dy = gy - s.y, l = Math.hypot(dx, dy);
    if (l > 0.06) { const mv = Math.min(l, 2.3 * dt); s.x += dx / l * mv; s.y += dy / l * mv; s.walk += mv * 9; if (Math.abs(dx) > 0.02) s.face = dx > 0 ? 1 : -1; }
    if (tg && l < 0.42) {
      if (!tg.boss) tg.held = true;
      if (Math.abs(tg.x - s.x) > 0.04) s.face = tg.x > s.x ? 1 : -1;
      s.cd -= dt;
      if (s.cd <= 0 && t.stunT <= 0) {
        s.cd = 1 / st.rate; s.atkT = 0.3;
        const dealt = hurt(G, tg, st.dmg, 'phys', { t });
        if (st.leech && dealt > 0) s.hp = Math.min(st.hp, s.hp + dealt * st.leech);
        Hook.fx('troopHit', G, s, tg);
      }
      // 被擋住的敵人反擊（頭目踩過去會造成很大傷害）
      const dps = tg.boss ? 45 * Math.sqrt(tg.hpMul) : enemyAtk(G, tg);
      s.hp -= dps * dt * (1 - st.armor);
      if (s.hp <= 0) { s.dead = true; s.respT = st.resp; tg.held = false; s.tgt = null; Hook.fx('troopDie', G, s); Hook.sfx('pop'); }
    }
  }
}
// ───────── 煉金塔的毒池 ─────────
function landFlask(G, p) {
  const gx = Math.floor(p.tx), gy = Math.floor(p.ty), c = inMap(gx, gy) ? G.grid[gy][gx] : null;
  Hook.fx('splash', G, p.tx, p.ty, p.r, p.corrode ? 1 : p.spread ? 2 : 0);
  Hook.sfx('splash');
  if (c && (c.riv || c.water)) {
    // 掉進河裡：只濺到一下
    for (const e of G.enemies) if (e.alive && !e.fly && dist2(e.x, e.y, p.tx, p.ty) < (p.r + e.r * 0.5) ** 2) hurt(G, e, p.dmg * 1.2, 'poison', p.src);
    return;
  }
  addPool(G, p.tx, p.ty, p.r, p.dmg, p.life, p);
}
function addPool(G, x, y, r, dps, life, o) {
  if (G.pools.length > 40) G.pools.shift();
  G.pools.push({ x, y, r, dps, t: 0, T: life, spread: !!o.spread, corrode: o.corrode || 0, src: o.src, mini: !!o.mini, kind: o.corrode ? 1 : o.spread ? 2 : 0, id: G.uid++ });
}
function updatePools(G, dt) {
  if (!G.pools.length) return;
  for (const p of G.pools) p.t += dt;
  G.pools = G.pools.filter(p => p.t < p.T);
  for (const e of G.enemies) {
    if (!e.alive || e.fly || e.under > 0 || e.inT || e.riv) { if (e.poisonT > 0) e.poisonT -= dt; continue; }
    let best = null;
    for (const p of G.pools) { const rr = p.r + e.r * 0.5; if (dist2(e.x, e.y, p.x, p.y) < rr * rr && (!best || p.dps > best.dps)) best = p; }
    if (best) {
      e.poisonT = 1.2; e.poisonD = best.dps * 0.4; e.poisonSrc = best.src;
      e.poisonSpread = best.spread ? best.dps * 0.6 : 0;
      if (best.corrode) { e.corT = 0.8; e.corA = best.corrode; }
      hurt(G, e, best.dps * dt, 'poison', best.src);
    } else if (e.poisonT > 0) {
      e.poisonT -= dt;
      hurt(G, e, e.poisonD * dt, 'poison', e.poisonSrc);
    }
  }
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
  Hook.sfx('meteor'); Hook.fx('meteorCast', G, x, y);
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
  Hook.sfx('freeze'); Hook.fx('freeze', G);
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
  Hook.fx('boom', G, x, y, r, big, h);
  ring(G, x, y, 0.1, r, 0.35, '#fff3c4');
  for (let i = 0; i < (big ? 26 : 12); i++) {
    const a = G.rnd() * 6.283, v = G.rnd() * r * 2.5;
    part(G, x, y, h + 0.1, Math.cos(a) * v, Math.sin(a) * v, 1 + G.rnd() * 2, 0.4 + G.rnd() * 0.3, G.rnd() < 0.5 ? '#ffb347' : '#ffe27a', 0.08 + G.rnd() * 0.07, 'dot');
  }
  for (let i = 0; i < (big ? 10 : 5); i++) {
    const a = G.rnd() * 6.283, v = G.rnd() * r;
    part(G, x, y, h + 0.15, Math.cos(a) * v, Math.sin(a) * v, 0.6, 0.8 + G.rnd() * 0.5, '#6d6258', 0.16 + G.rnd() * 0.1, 'smoke');
  }
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
  if (G.flash > 0) G.flash -= dt;
  if (G.iceFlash > 0) G.iceFlash -= dt;
}

// ───────── 主更新 ─────────
function step(G, dt) {
  updateFx(G, dt);
  if (G.state === 'won' || G.state === 'lost') return;
  G.t += dt;
  for (const k in G.skills) { const s = G.skills[k]; if (s.cd > 0 && G.state === 'run') s.cd = Math.max(0, s.cd - dt); }
  if (G.L.storm && G.state === 'run') {
    G.stormT -= dt;
    if (G.stormT <= 0) {
      G.stormOn = !G.stormOn; G.stormT = G.stormOn ? G.L.storm[1] : G.L.storm[0];
      G.dirty = true; Hook.fx('storm', G, G.stormOn);
    }
  }
  if (G.nextT !== null) { G.nextT -= dt; if (G.nextT <= 0) { G.nextT = 0; callWave(G, false); } }
  for (const sp of G.spawners) {
    if (sp.delay > 0) { sp.delay -= dt; continue; }
    sp.timer -= dt;
    if (sp.timer <= 0 && sp.left > 0) { spawnEnemy(G, sp.k, sp.entry, sp.hp); sp.left--; sp.timer = sp.gap; }
  }
  if (G.spawners.length) G.spawners = G.spawners.filter(s => s.left > 0);
  if (G.state === 'run' && G.wave >= 0 && !G.spawners.length && G.nextT === null && G.wave < G.nWaves - 1) G.nextT = WAVE_GAP;
  updateLevelMech(G, dt);
  updateTroops(G, dt);
  updateEnemies(G, dt);
  if (G.hero) updateHero(G, dt);
  if (G.state !== 'run') return;
  updateTowers(G, dt);
  updateProjs(G, dt);
  updatePools(G, dt);
  if (G.enemies.some(e => !e.alive)) G.enemies = G.enemies.filter(e => e.alive);
  if (!G.endless && G.wave === G.nWaves - 1 && !G.spawners.length && !G.enemies.length && G.state === 'run') {
    G.state = 'won';
    const f = G.lives / G.maxLives;
    G.stars = f >= 0.9 ? 3 : f >= 0.5 ? 2 : 1;
    Hook.sfx('win'); Hook.ended(G);
  }
}
