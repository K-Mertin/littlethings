'use strict';
// 深淵地牢：第三輪——支線秘境（第 3／7／11／15 層的秘境裂口，各有秘境守護者與獨有遺物）與「頭目連戰」模式

// ---------- 秘境裂口 ----------
T.PORTAL = 23;
TP[T.PORTAL] = { walk: 1, op: 0, n: '秘境裂口' };
const BRANCHES = {
  hoard: { n: '哥布林藏寶窟', at: 3, biome: 0, kind: 'caves', col: '255,200,90', mons: [[4, 'kobold'], [3, 'archer'], [2, 'shaman'], [1, 'thief'], [2, 'rat']], boss: 'gobking', relic: 'warhorn',
    flavor: '狹窄的洞窟裡堆滿了偷來的金幣，到處都是哥布林的叫囂聲。' },
  nest: { n: '蛛后巢穴', at: 7, biome: 1, kind: 'caves', col: '190,140,255', mons: [[2, 'spider'], [3, 'shroom'], [2, 'bat'], [1, 'wisp'], [2, 'slime']], boss: 'spiderq', relic: 'silk',
    flavor: '洞壁上掛滿了蛛網和被包成繭的獵物，黑暗裡有無數雙眼睛在看著你。' },
  vault: { n: '熔岩寶庫', at: 11, biome: 2, kind: 'lava', col: '255,130,40', mons: [[3, 'imp'], [3, 'salamander'], [3, 'orc'], [1, 'skeleton']], boss: 'magmaw', relic: 'magma',
    flavor: '古代矮人藏寶的熔爐地窖，岩漿下傳來巨蟲翻身的震動。' },
  tomb: { n: '冰封王陵', at: 15, biome: 3, kind: 'mixed', col: '150,230,255', mons: [[4, 'skeleton'], [2, 'shade'], [2, 'frostmage'], [1, 'golem'], [1, 'wolf']], boss: 'lich', relic: 'phylac',
    flavor: '冰封的王族墓室。棺木一具具打開了，寒氣從裡面湧出。' },
};
const BR_AT = {}; for (const k in BRANCHES) BR_AT[BRANCHES[k].at] = k;

// 秘境守護者（小頭目）
Object.assign(MON, {
  gobking: { n: '哥布林酋長', spr: 'gobking', hp: 64, atk: [3, 7], acc: 3, eva: 2, arm: 1, spd: 100, xp: 50, d: 99, verb: '砍', boss: 1, mini: 1, summon: { t: 'kobold', n: 1, cd: 9 }, d2: '頭戴金盆、坐擁贓物的哥布林老大。' },
  spiderq: { n: '蛛后', spr: 'spiderq', hp: 90, atk: [3, 7], acc: 4, eva: 3, arm: 1, spd: 100, xp: 90, d: 99, verb: '咬', boss: 1, mini: 1, poison: 2, summon: { t: 'spider', n: 1, cd: 14 }, ranged: { r: 5, dmg: [3, 6], k: 'spore', v: '吐出蛛絲', web: 1, cd: 3 }, d2: '巢穴深處的巨大蜘蛛，蛛絲會把人纏住。' },
  magmaw: { n: '熔岩巨蟲', spr: 'magmaw', hp: 150, atk: [6, 12], acc: 5, eva: 0, arm: 4, spd: 100, xp: 170, d: 99, verb: '咬', boss: 1, mini: 1, burn: 1, fireImm: 1, lavaWalk: 1, ranged: { r: 6, dmg: [6, 11], k: 'fire', v: '噴出岩漿', burn: 1, aoe: 1, cd: 3 }, d2: '在寶庫岩漿裡翻滾的巨蟲。' },
  lich: { n: '冰霜巫妖', spr: 'lich', hp: 180, atk: [7, 12], acc: 6, eva: 4, arm: 2, spd: 100, xp: 220, d: 99, verb: '敲', boss: 1, mini: 1, undead: 1, ranged: { r: 7, dmg: [6, 11], k: 'frost', v: '射出寒冰', slow: 1, cd: 3 }, summon: { t: 'skeleton', n: 1, cd: 11 }, blink: 1, kite: 1, d2: '沉睡在王陵裡的不死之王。' },
});
// 秘境獨有的遺物（不會出現在一般的遺物池）
Object.assign(RELICS, {
  warhorn: { n: '酋長戰號', tag: 'legend', ex: 1, col: '#e8b040', d: '打倒精英怪或頭目時，回復 30% 最大 HP。（哥布林藏寶窟）' },
  silk: { n: '蛛后之絲', tag: 'legend', ex: 1, col: '#e0d8f0', d: '近戰命中時，有 20% 機率用蛛絲把敵人纏住 2 回合。（蛛后巢穴）' },
  magma: { n: '熔岩之心', tag: 'legend', ex: 1, col: '#ff7a2a', d: '岩漿不會傷害你，你也不會著火。（熔岩寶庫）' },
  phylac: { n: '巫妖命匣', tag: 'legend', ex: 1, col: '#7fe8ff', d: '法術與魔杖傷害 +30%；打倒敵人時有 20% 機率替一根魔杖充能。（冰封王陵）' },
});
RSETS.legend = { n: '秘境征服者', d: '近戰傷害 +2，受到的所有傷害 -1。' };

// 守護者的像素圖
Object.assign(BSPR, {
  gobking: { w: 30, h: 30, draw(P, f, o) {
    const b = f.fr === 'idle' && f.i ? 1 : 0, a = f.fr === 'atk' ? f.i + 1 : 0, st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0, rg = o.rage, ux = a === 2 ? 2 : a === 1 ? -1 : 0;
    P.r(9 - st, 22, 4, 6, '#4a3a2a'); P.r(17 + st, 22, 4, 6, '#4a3a2a'); P.r(8 - st, 27, 6, 2, '#2a1a12'); P.r(16 + st, 27, 6, 2, '#2a1a12');
    P.poly([[8 + ux, 12 + b], [22 + ux, 12 + b], [24, 24], [6, 24]], '#8a2a2a'); P.r(7, 22, 17, 2, '#e0b040');
    P.e(15 + ux, 16 + b, 6, 5, '#5a9a3a'); P.r(11 + ux, 17 + b, 8, 2, '#c8a040'); for (let x = 12; x < 19; x += 2) P.p(x + ux, 17 + b, '#ffe080');
    P.e(15 + ux, 8 + b, 5.6, 5, '#6ab04a'); P.poly([[9 + ux, 8 + b], [4 + ux, 4 + b], [10 + ux, 6 + b]], '#5a9a3a'); P.poly([[21 + ux, 8 + b], [26 + ux, 4 + b], [20 + ux, 6 + b]], '#5a9a3a');
    P.p(13 + ux, 8 + b, rg ? '#ffffff' : '#ff3a3a'); P.p(17 + ux, 8 + b, rg ? '#ffffff' : '#ff3a3a'); P.r(13 + ux, 11 + b, 5, 1, '#2a3a1a'); P.p(14 + ux, 11 + b, '#ffffff'); P.p(17 + ux, 11 + b, '#ffffff');
    P.e(15 + ux, 4 + b, 5, 2, '#e0b040'); P.r(10 + ux, 4 + b, 10, 1, '#a07a20'); P.p(15 + ux, 3 + b, '#ff3a5a');
    const hx = a === 1 ? 20 : a === 2 ? 28 : 25, hy = a === 1 ? 6 : 15;
    P.l(20 + ux, 14 + b, hx, hy, '#6ab04a', 2); drawWeapon(P, 'axe', hx, hy, a === 2 ? -0.1 : a === 1 ? -2.4 : -1.1, { pal: { blade: '#d8dee8' } });
    P.l(10 + ux, 14 + b, 6, 20, '#6ab04a', 2); P.e(5, 21, 3, 2.4, '#e0b040'); P.p(4, 20, '#fff4c0');
  } },
  spiderq: { w: 38, h: 28, draw(P, f, o) {
    const a = f.fr === 'atk' ? f.i + 1 : 0, st = f.fr === 'walk' ? f.i : 0, rg = o.rage, b = f.fr === 'idle' && f.i ? 1 : 0;
    for (let i = 0; i < 4; i++) { const k = (i + st) % 2 ? 1 : -1; P.l(15 - i * 2, 16, 6 - i * 3, 9 + i * 2 + k, '#3a2a3a', 2); P.l(6 - i * 3, 9 + i * 2 + k, 3 - i * 2, 22 + k, '#3a2a3a', 2); P.l(23 + i * 2, 16, 32 + i * 2, 9 + i * 2 - k, '#3a2a3a', 2); P.l(32 + i * 2, 9 + i * 2 - k, 35 + i, 22 - k, '#3a2a3a', 2); }
    P.e(12, 16 + b, 9, 7, rg ? '#6a1a3a' : '#4a2a4a'); P.e(12, 15 + b, 7, 5, rg ? '#8a2a4a' : '#6a3a6a');
    for (const [x, y] of [[9, 13], [14, 12], [11, 17], [15, 17]]) P.p(x, y + b, '#e85a7a');
    P.e(25 + a, 17, 6, 5, '#4a2a4a'); P.e(25 + a, 16, 4.6, 3.6, '#6a3a6a');
    for (const [x, y] of [[26, 14], [28, 15], [26, 17], [28, 17], [24, 15]]) P.p(x + a, y, rg ? '#ffffff' : '#ff3a5a');
    P.l(29 + a, 19, 31 + a * 1.5, 22, '#d8d0c8'); P.l(27 + a, 20, 28 + a, 23, '#d8d0c8');
    P.e(12, 9 + b, 3, 1.5, '#e8e0f0'); P.p(12, 8 + b, '#ffffff');
  } },
  magmaw: { w: 42, h: 32, draw(P, f, o) {
    const a = f.fr === 'atk' ? f.i + 1 : 0, b = f.i ? 1 : 0, rg = o.rage, hot = rg ? '#fff0a0' : '#ffd04a';
    P.e(21, 29, 18, 2.6, '#4a0e06'); P.e(21, 29, 14, 1.6, '#e8501a');
    const segs = [[6, 26], [11, 23 - b], [16, 21], [21, 19 + b], [26, 16]];
    for (const [x, y] of segs) { P.e(x, y, 5, 4.6, '#3a2420'); P.e(x, y - 1, 3.6, 3, '#6a3a2a'); P.r(x - 1, y - 4, 2, 2, hot); }
    const hx = 31 + a * 2, hy = 12 - a;
    P.e(hx, hy, 7.5, 7, '#3a2420'); P.e(hx, hy - 1, 6, 5, '#6a3a2a'); P.e(hx + 3, hy + 2, 3.6, 3 + a, '#1a0a08'); P.e(hx + 3, hy + 2, 2.4, 1.8 + a, '#ff7a2a');
    for (let i = 0; i < 4; i++) P.p(hx + 1 + i * 1.5, hy, '#f8f0d8');
    P.p(hx - 2, hy - 3, hot); P.p(hx + 1, hy - 4, hot);
    for (const [x, y] of [[8, 22], [18, 17], [28, 9]]) P.p(x, y, '#ff9a3a');
  } },
  lich: { w: 32, h: 36, draw(P, f, o) {
    const b = f.fr === 'idle' && f.i ? 1 : 0, a = f.fr === 'atk' ? f.i + 1 : 0, ux = a === 2 ? 1 : a === 1 ? -1 : 0, rg = o.rage;
    P.poly([[10 + ux, 13 + b], [22 + ux, 13 + b], [26, 34], [6, 34]], '#2a3a5a'); P.poly([[12 + ux, 15 + b], [20 + ux, 15 + b], [22, 33], [10, 33]], '#3a5a8a');
    P.r(6, 33, 20, 1, '#bff4ff'); P.r(15 + ux, 15 + b, 2, 18, '#bff4ff');
    P.e(16 + ux, 9 + b, 4.6, 5, '#e8e0d0'); P.r(13 + ux, 8 + b, 2, 2, '#0a1424'); P.r(17 + ux, 8 + b, 2, 2, '#0a1424'); P.p(13 + ux, 8 + b, rg ? '#ff3a6a' : '#7fe8ff'); P.p(17 + ux, 8 + b, rg ? '#ff3a6a' : '#7fe8ff');
    P.r(14 + ux, 12 + b, 4, 1, '#3a3a4a'); for (let x = 14; x < 18; x++) P.p(x + ux, 12 + b, x % 2 ? '#e8e0d0' : '#3a3a4a');
    for (const [x, h] of [[11, 3], [13, 5], [16, 7], [19, 5], [21, 3]]) P.r(x + ux, 5 + b - h, 1, h, '#8ae8ff');
    P.r(11 + ux, 5 + b, 11, 1, '#5aa8e8');
    const hx = a === 1 ? 18 : a === 2 ? 27 : 24, hy = a === 1 ? 10 : 18;
    P.l(20 + ux, 17 + b, hx, hy + b, '#3a5a8a', 2);
    const sx = hx + 1, sy = hy + b; P.l(sx, sy + 12, sx, sy - 6, '#8a8a96'); P.e(sx, sy - 8, 2.6, 2.6, '#e8e0d0'); P.p(sx - 1, sy - 9, '#0a1424'); P.p(sx + 1, sy - 9, '#0a1424'); P.p(sx, sy - 11, '#7fe8ff');
  } },
});

// 秘境裂口與守護者的生成
Object.assign(Game, {
  areaName() { const F = G.F; return F && F.branch ? BRANCHES[F.branch].n : BIOMES[F.biome].n; },
  // 一般樓層上放置秘境裂口（每局在第 3／7／11／15 層各有機會出現）
  placePortal(F, depth, used) {
    const b = BR_AT[depth]; if (!b || G.rush || F.arena || BOSS_FLOOR[depth]) return;
    const rng = new RNG('portal:' + G.seed + ':' + depth);
    if (!rng.chance(0.6) || (typeof window !== 'undefined' && window.__noBranch)) return;
    const p = this.placeBlock(F, rng, used, T.PORTAL);
    if (p) { F.portal = { x: p[0], y: p[1], b, used: 0 }; F.deco[p[1] * F.w + p[0]] = 0; }
  },
  enterBranch() {
    const F = G.F, P = G.P, pt = F.portal; if (!pt || pt.used) return false;
    const BR = BRANCHES[pt.b];
    G.mainF = F;
    const rng = new RNG('branchmap:' + G.seed + ':' + G.depth);
    const BF = Gen.make(G.depth, rng, { kind: BR.kind, biome: BR.biome });
    BF.biome = BR.biome; BF.depth = G.depth; BF.branch = pt.b;
    BF.seen = new Uint8Array(BF.w * BF.h); BF.mons = []; BF.items = []; BF.traps = []; BF.clouds = []; BF.detect = false; BF.spawnT = 0; BF.visited = {}; BF.props = []; BF.chests = []; BF.altars = [];
    G.F = BF; [P.x, P.y] = BF.start; P.energy = 100;
    this.populateBranch(BF, G.depth, BR);
    G.stats.branches = (G.stats.branches || 0) + 1;
    Snd.play('tele');
    msg('你踏進了秘境裂口……這裡是「' + BR.n + '」。', 'y');
    msg(BR.flavor, 'm');
    msg('打倒秘境守護者，出口的裂口才會打開。腳下的裂口可以隨時回去（秘境會關閉）。', 'i');
    if (typeof UI !== 'undefined' && !G.demo) setTimeout(() => UI.banner('支線秘境', BR.n, '打倒秘境守護者，帶走獨有的遺物。'), 300);
    Art.buildTiles(BF.biome);
    this.updateFov();
    if (typeof Music !== 'undefined') Music.play('b' + BF.biome);
    if (typeof Render !== 'undefined') Render.snapCam();
    this.save();
    return true;
  },
  populateBranch(F, depth, BR) {
    const rng = new RNG('branch:' + G.seed + ':' + depth), saveRng = G.rng; G.rng = rng;
    const used = new Set([F.start[1] * F.w + F.start[0]]);
    const free = (minD = 6) => {
      for (let i = 0; i < 300; i++) {
        const x = rng.int(1, F.w - 2), y = rng.int(1, F.h - 2), k = y * F.w + x, v = F.t[k];
        if (!(v === T.FLOOR || v === T.GRASS || v === T.RUBBLE || v === T.ICE) || used.has(k) || cheb(x, y, F.start[0], F.start[1]) < minD || Gen.inVault(F, k)) continue;
        used.add(k); return [x, y];
      }
      return null;
    };
    // 守護者在出口旁邊；出口與入口都是裂口
    const ex = F.stairs; F.t[ex[1] * F.w + ex[0]] = T.PORTAL;
    F.t[F.start[1] * F.w + F.start[0]] = T.PORTAL; F.backPortal = F.start.slice();
    const at = this.nearFree(ex[0], ex[1], used, 3) || ex;
    const b = this.spawnAt(BR.boss, at[0], at[1], true, used);
    b.boss = 1; F.locked = 1; F.bossId = b.id;
    // 怪物：比一般樓層多，精英也更常見
    const n = 4 + Math.floor(depth * 0.25) + rng.int(0, 1);
    for (let i = 0; i < n; i++) {
      const k = rng.weighted(BR.mons), D = MON[k], p = free(); if (!p) continue;
      const m = this.spawnAt(k, p[0], p[1], rng.chance(0.55), used);
      if (rng.chance(this.eliteChance())) this.makeElite(m);
      const grp = D.pack ? rng.int(1, D.pack[0]) : 1;
      for (let j = 1; j < grp; j++) { const q = this.nearFree(p[0], p[1], used); if (q) this.spawnAt(k, q[0], q[1], m.mode === 'sleep', used); }
    }
    // 寶物：守護者附近的寶箱，再加上散落的金幣與道具
    const pass = v => TP[v].walk && v !== T.LAVA;
    for (let i = 0, made = 0; i < 12 && made < 2; i++) { const p = this.nearFree(ex[0], ex[1], used, 4); if (p && F.t[p[1] * F.w + p[0]] === T.FLOOR && cheb(p[0], p[1], ex[0], ex[1]) > 1 && DIRS8.every(([dx, dy]) => pass(F.t[(p[1] + dy) * F.w + p[0] + dx])) && Gen.safeBlock(F, p[0], p[1], pass)) { F.t[p[1] * F.w + p[0]] = T.CHEST; F.chests.push({ x: p[0], y: p[1], open: 0, gold: made === 0 ? 1 : 0 }); made++; } }
    for (let i = 0; i < 4; i++) { const p = free(3); if (p) F.items.push({ x: p[0], y: p[1], it: this.randomItem(depth + 2) }); }
    for (let i = 0; i < 4; i++) { const p = free(3); if (p) F.items.push({ x: p[0], y: p[1], it: this.goldItem(depth, BR.boss === 'gobking' ? 3 : 1.5) }); }
    // 入口附近有一堆篝火，可以在挑戰守護者之前休息一次
    for (let tries = 0; tries < 80; tries++) {
      const x = F.start[0] + rng.int(-4, 4), y = F.start[1] + rng.int(-4, 4), k = y * F.w + x;
      if (x < 2 || y < 2 || x >= F.w - 2 || y >= F.h - 2 || F.t[k] !== T.FLOOR || used.has(k) || cheb(x, y, F.start[0], F.start[1]) < 2) continue;
      if (!DIRS8.every(([dx, dy]) => pass(F.t[k + dy * F.w + dx])) || !Gen.safeBlock(F, x, y, pass)) continue;
      F.t[k] = T.PROP; used.add(k); F.props.push({ x, y, k: 'fire', camp: 1 }); break;
    }
    const nt = 1 + Math.floor(depth / 4);
    for (let i = 0; i < nt; i++) { const p = free(4); if (p) F.traps.push({ x: p[0], y: p[1], k: rng.pick(Object.keys(TRAPS).filter(k => TRAPS[k].d <= depth && k !== 'pit')), hid: 1 }); }
    G.rng = saveRng;
  },
  branchCleared(m) {
    const F = G.F, BR = BRANCHES[F.branch]; if (!BR) return;
    F.locked = 0;
    msg('秘境守護者倒下了！出口的裂口打開了。', 'y');
    Snd.play('victory');
    this.dropItem(this.relicItem(G.P.relics.includes(BR.relic) ? null : BR.relic), m.x, m.y);
    this.dropItem(this.goodItem(G.depth + 3), m.x, m.y);
    this.dropItem(this.goldItem(G.depth, 4), m.x, m.y);
    for (const o of F.mons) if (o.summoner === m.id && o.hp > 0) { o.hp = 0; if (typeof FX !== 'undefined') FX.burst(o.x, o.y, '#b48cff', 8); }
    if (!G.dbgSkip) { const M = Store.meta; M.branchDone = M.branchDone || {}; M.branchDone[F.branch] = (M.branchDone[F.branch] || 0) + 1; }
    G.stats.branchWins = (G.stats.branchWins || 0) + 1;
    Meta.inc('branches'); Meta.event('branch', F.branch);
  },
  leaveBranch() {
    const F = G.mainF, P = G.P; if (!F) return false;
    const BF = G.F, cleared = !BF.locked;
    G.mainF = null;
    if (F.portal) { F.portal.used = 1; F.t[F.portal.y * F.w + F.portal.x] = T.FLOOR; }
    G.F = F; [P.x, P.y] = [F.portal.x, F.portal.y]; P.energy = 100;
    Snd.play('tele');
    msg(cleared ? '你帶著戰利品回到了第 ' + G.depth + ' 層。秘境裂口在身後闔上了。' : '你退出了秘境，裂口在身後闔上了。', 'i');
    Art.buildTiles(F.biome);
    this.updateFov();
    if (typeof Music !== 'undefined') Music.play(BOSS_FLOOR[G.depth] ? 'boss' : 'b' + F.biome);
    if (typeof Render !== 'undefined') Render.snapCam();
    this.save();
    return true;
  },
  // 下樓：一般樓梯、秘境裂口、頭目連戰的下一戰
  descend() {
    if (!this.canAct()) return false;
    const P = G.P, F = G.F, v = this.tile(P.x, P.y);
    if (v === T.PORTAL) {
      if (F.branch) {
        const exit = F.stairs && P.x === F.stairs[0] && P.y === F.stairs[1];
        if (exit && F.locked) { msg('出口的裂口還被守護者的力量封住。', 'w'); return false; }
        if (!exit && F.locked) { if (G.leaveWarn !== G.turn) { G.leaveWarn = G.turn; msg('還沒打倒守護者。現在離開，秘境就會關閉、再也回不來。再按一次確定離開。', 'w'); return false; } }
        return this.leaveBranch();
      }
      return this.enterBranch();
    }
    if (v !== T.STAIRS) { msg('這裡沒有樓梯。', 'm'); return false; }
    if (F.locked) { msg('樓梯被一股力量封住了，必須先打倒守層頭目。', 'w'); return false; }
    Snd.play('stairs');
    if (G.rush) { this.enterRush(G.rushStage + 1); return true; }
    this.enterFloor(G.depth + 1);
    return true;
  },
  // 存檔：主樓層（在秘境裡時）也要一起存
  packF(F) { return Object.assign({}, F, { _tset: undefined, t: Array.from(F.t), deco: Array.from(F.deco), seen: Array.from(F.seen), corr: F.corr ? Array.from(F.corr) : null }); },
  unpackF(F) { F.chests = F.chests || []; F.altars = F.altars || []; F.props = F.props || []; F.t = Uint8Array.from(F.t); F.deco = Uint8Array.from(F.deco); F.seen = Uint8Array.from(F.seen); if (F.corr) F.corr = Uint8Array.from(F.corr); return F; },
});
{
  const pop0 = Game.populateMore;
  Game.populateMore = function (F, depth, used) { pop0.call(this, F, depth, used); this.placePortal(F, depth, used); };
  const enter0 = Game.onEnter;
  Game.onEnter = function (opts = {}) {
    enter0.call(this, opts);
    const P = G.P, F = G.F;
    if (this.tile(P.x, P.y) === T.PORTAL && !opts.auto) {
      if (F.branch) msg(F.stairs && P.x === F.stairs[0] && P.y === F.stairs[1] ? (F.locked ? '出口的裂口被封住了，先打倒秘境守護者。' : '出口的裂口。按「離開」回到第 ' + G.depth + ' 層。') : '回去的裂口。按「離開」回到第 ' + G.depth + ' 層（秘境會關閉）。', 'i');
      else if (F.portal) msg('一道通往「' + BRANCHES[F.portal.b].n + '」的秘境裂口。按「進入」踏進去——裡面有秘境守護者與獨有的遺物。', 'y');
    }
  };
  const save0 = Game.save;
  Game.save = function () {
    if (!G || G.over || G.demo) return;
    if (!G.mainF) return save0.call(this);
    const mf = G.mainF; G.mainF = this.packF(mf);
    try { save0.call(this); } finally { G.mainF = mf; }
  };
  const load0 = Game.load;
  Game.load = function () {
    const ok = load0.call(this);
    if (ok && G.mainF) this.unpackF(G.mainF);
    if (ok && G.F.branch) { if (typeof Music !== 'undefined') Music.play('b' + G.F.biome); }
    return ok;
  };
}

// ---------- 頭目連戰 ----------
const RUSH = ['ratking', 'mother', 'forge', 'witch', 'lord', 'kraken', 'devourer'];
const RUSH_D = { ratking: 4, mother: 8, forge: 12, witch: 16, lord: 17, kraken: 21, devourer: 25 };
const RUSH_LV = [4, 8, 11, 13, 15, 17, 19];
Object.assign(Game, {
  rushList() { return Store.meta.deepOpen ? RUSH : RUSH.slice(0, 5); },
  rushSetup() {
    const P = G.P;
    G.rushStage = -1; G.rushN = this.rushList().length;
    P.hunger = 2100;
    for (let i = 0; i < 2; i++) { const it = this.makeItem('p_heal'); this.addInv(it, true); }
    G.known.p_heal = 1;
    msg('頭目連戰：一場接一場，打倒所有守層頭目！每一戰之間會回復體力、提升等級，並挑選遺物。', 'y');
    this.enterRush(0);
  },
  enterRush(i) {
    const list = this.rushList(), P = G.P;
    if (i >= list.length) { this.win(); return; }
    const k = list[i], depth = RUSH_D[k];
    G.rushStage = i;
    // 戰前整備：等級提升到這一戰的標準、補充藥水與一件裝備
    const lv = RUSH_LV[i];
    if (P.lvl < lv) this.gainXp(XP_NEED(P.lvl) - P.xp);
    while (P.lvl < lv) { P.xp = 0; this.gainXp(XP_NEED(P.lvl)); }
    P.hp = P.mhp; P.st = {}; for (const id in P.cds) P.cds[id] = 0; P.hunger = Math.max(P.hunger, 1600);
    this.enterFloor(depth);
    for (let j = 0; j < (i > 0 ? 2 : 1); j++) { const it = this.goodItem(depth); it.known = true; this.dropItem(it, P.x, P.y); }
    if (i > 0) { const h = this.makeItem('p_heal'); this.dropItem(h, P.x, P.y); }
    msg('第 ' + (i + 1) + ' 戰（共 ' + list.length + ' 戰）：' + MON[k].n + '！', 'w');
    if (typeof UI !== 'undefined' && !G.demo) setTimeout(() => UI.banner('頭目連戰 · 第 ' + (i + 1) + ' 戰', MON[k].n, MON[k].d2), 250);
  },
  rushCleared(m) {
    const F = G.F, list = this.rushList();
    G.stats.rush = G.rushStage + 1;
    if (G.rushStage + 1 >= list.length) { this.win(); return; }
    const at = F.bossAt && TP[this.tile(F.bossAt[0], F.bossAt[1])].walk && !(G.P.x === F.bossAt[0] && G.P.y === F.bossAt[1]) ? F.bossAt : this.nearFree(m.x, m.y, null, 3);
    if (at) { this.setTile(at[0], at[1], T.STAIRS); F.stairs = [at[0], at[1]]; F.seen[at[1] * F.w + at[0]] = 1; if (typeof FX !== 'undefined') FX.pillar(at[0], at[1], '255,215,90', 1); }
    this.healP(Math.round(G.P.mhp * 0.4));
    msg('第 ' + (G.rushStage + 1) + ' 戰勝利！走上發光的階梯前往下一戰：' + MON[list[G.rushStage + 1]].n + '。', 'y');
    if (G.rushStage + 1 === 4 && !Store.meta.deepOpen) { /* 只有五戰 */ }
  },
});

// ---------- 成就 ----------
ACH.push(
  { id: 'branch1', n: '秘境初探', d: '打倒一位秘境守護者', s: 8, chk: e => e.t === 'branch' },
  { id: 'branch4', n: '秘境探險家', d: '打倒全部四位秘境守護者（可以分好幾局）', s: 20, chk: e => e.t === 'branch' && Object.keys(Store.meta.branchDone || {}).length >= 4 },
  { id: 'rush5', n: '連戰勇者', d: '在頭目連戰中連續打倒五位頭目', s: 20, chk: e => e.t === 'boss' && G.rush && (G.stats.rush || 0) >= 4 && e.v === 'lord' },
);
