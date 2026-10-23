'use strict';
// 深淵地牢：遊戲核心（狀態、道具、玩家行動、戰鬥）
let G = null;
const COL = { n: '#dfe3ea', g: '#8fe388', b: '#ff7b6b', i: '#8fd0ff', y: '#ffd75a', p: '#d6b8ff', w: '#ffb35a', m: '#9aa3b2' };
function msg(t, c = 'n') {
  if (!G) return;
  const last = G.log[G.log.length - 1];
  if (last && last.t === t && last.turn === G.turn) { last.x = (last.x || 1) + 1; }
  else G.log.push({ t, c, turn: G.turn });
  if (G.log.length > 150) G.log.splice(0, G.log.length - 150);
  if (c === 'b' || c === 'w') G.interrupt = true;
  if (typeof UI !== 'undefined') UI.dirtyLog = true;
}
const XP_NEED = L => 8 * L + 4 * L * L;

const Game = {
  look(k) { return G && G.looks[k] != null ? G.looks[k] : 0; },
  rng() { return G.rng; },

  // ---------- 開新局 ----------
  newRun(cls, seedStr, daily, opt = {}) {
    const seed = seedStr || randomSeedStr();
    const rng = new RNG('run:' + seed);
    const looks = {}, snames = {};
    for (const [cat, pool] of [['potion', POTION_LOOKS], ['ring', RING_LOOKS], ['wand', WAND_LOOKS]]) {
      const idx = rng.shuffle(pool.map((_, i) => i)); let j = 0;
      for (const k in ITEMS) if (ITEMS[k].c === cat) looks[k] = idx[j++ % idx.length];
    }
    let si = 0;
    for (const k in ITEMS) if (ITEMS[k].c === 'scroll') {
      const n = rng.int(2, 3); let s = '';
      for (let i = 0; i < n; i++) s += rng.pick(SCROLL_SYL) + (i === 0 && n === 3 ? '' : '');
      s += '·' + rng.pick(SCROLL_SYL) + rng.pick(SCROLL_SYL);
      snames[k] = s; looks[k] = si++;
    }
    const C = CLASSES[cls], ups = Store.meta.ups || {};
    G = {
      v: 1, seed, daily: !!daily, cls, asc: daily ? 0 : (opt.asc || 0), boon: daily ? 'none' : (opt.boon || 'none'), mod: daily ? Object.keys(DMODS)[hashStr(seed) % Object.keys(DMODS).length] : null, depth: 0, turn: 0, rng, looks, snames, known: {}, tried: {}, nid: 1, log: [],
      stats: { kills: 0, bosses: 0, gold: 0, maxDepth: 1, dmg: 0, items: 0, potions: 0, scrolls: 0, elites: 0, chests: 0, altars: 0, trials: 0, floors: [] },
      F: null, P: null, over: false, cause: '', pendingPerks: 0, perkChoices: null, interrupt: false, vis: null, started: Date.now(),
    };
    const P = G.P = {
      id: 0, isP: 1, x: 0, y: 0, cls, lvl: 1, xp: 0, mhp: C.hp + (ups.hp || 0) * 4, hp: 0, str: C.str, energy: 100, st: {},
      hunger: 1500, gold: (ups.gold || 0) * 60, inv: [], eq: { w: null, a: null, r1: null, r2: null }, cds: {}, perks: {}, regen: 0, sneakNext: 0,
      invMax: 22 + (ups.pack ? 4 : 0),
    };
    if (G.mod === 'glass') P.mhp = Math.round(P.mhp * 0.7);
    P.hp = P.mhp;
    for (const a of C.abil) P.cds[a] = 0;
    // 起始裝備
    for (let [k, n] of C.start) {
      if (k === 'ration' && (asc(8) || G.mod === 'famine')) continue;
      let it;
      if (k === 'WAND') { it = this.makeItem(rng.pick(['w_bolt', 'w_frost', 'w_sleep', 'w_slow'])); G.known[it.k] = 1; }
      else it = this.makeItem(k, { n, ench: 0, cursed: false });
      it.known = true; if (ITEMS[k] && (ITEMS[k].c === 'potion')) G.known[k] = 1;
      this.addInv(it, true);
      if (it.c === 'weapon' && !P.eq.w) P.eq.w = it.id;
      if (it.c === 'armor' && !P.eq.a) P.eq.a = it.id;
    }
    if (ups.heal) { const it = this.makeItem('p_heal'); G.known.p_heal = 1; this.addInv(it, true); }
    if (ups.food) this.addInv(this.makeItem('ration'), true);
    if (ups.idscroll) { G.known.s_id = 1; this.addInv(this.makeItem('s_id', { n: 2 }), true); }
    if (ups.lore) { G.known.p_heal = 1; G.known.s_id = 1; }
    if (ups.knives) this.addInv(this.makeItem('knife', { n: 6 }), true);
    // 開局祝福
    if (G.boon === 'rune') { const w = this.equipped('w'); if (w) { this.giveRune(w); w.known = true; } }
    if (G.boon === 'alch') { G.known.p_heal = 1; for (let i = 0; i < 2; i++) this.addInv(this.makeItem(rng.pick(['p_heal', 'p_haste', 'p_detect', 'p_str', 'p_poison', 'p_conf'])), true); }
    if (G.mod === 'arcane') for (const o of P.inv) if (o.c === 'wand') o.ch += 2;
    Store.meta.runs++; Store.saveMeta();
    this.enterFloor(1);
    if (G.boon === 'veteran') { G.pendingPerks++; this.rollPerks(); }
    msg('歡迎來到深淵地牢。往下走，擊敗深淵之王！', 'y');
    if (G.asc) msg('深淵等級 ' + G.asc + '：' + ASC.slice(1, G.asc + 1).map(a => a.d).join(' '), 'w');
    if (G.mod) msg('今日變化「' + DMODS[G.mod].n + '」：' + DMODS[G.mod].d, 'w');
    if (G.boon && G.boon !== 'none') msg('開局祝福「' + BOONS[G.boon].n + '」：' + BOONS[G.boon].d, 'i');
    msg('種子：' + seed + (daily ? '（每日挑戰）' : ''), 'm');
  },

  // ---------- 道具 ----------
  makeItem(k, o = {}) {
    const K = ITEMS[k], rng = G.rng;
    const it = { id: G.nid++, k, c: K.c, n: o.n || 1, ench: 0, cursed: false, known: false };
    if (K.c === 'weapon' || K.c === 'armor' || K.c === 'ring') {
      const d = G.depth || 1, r = rng.next();
      if (K.c === 'ring') {
        it.ench = r < 0.22 ? -rng.int(1, 2) : rng.int(1, d > 8 ? 3 : 2);
        if (k === 'r_tele') it.ench = rng.chance(0.5) ? -1 : 1;
      } else if (r < 0.14) it.ench = -rng.int(1, 3);
      else if (r < 0.48) it.ench = rng.int(1, 1 + Math.floor(d / 5));
      it.cursed = it.ench < 0 || (k === 'r_tele' && rng.chance(0.5));
      if (K.c !== 'ring' && rng.chance(0.06 + d * 0.012)) it.rune = rng.pick(K.c === 'weapon' ? W_RUNES : A_RUNES);
      if (o.ench != null) { it.ench = o.ench; it.cursed = !!o.cursed; delete it.rune; }
    }
    if (K.c === 'wand') it.ch = rng.int(K.ch[0], K.ch[1]);
    if (K.stack && !o.n) it.n = rng.int(K.stack[0], K.stack[1]);
    return it;
  },
  randomItem(depth) {
    const rng = G.rng;
    const avail = c => Object.keys(ITEMS).some(k => ITEMS[k].c === c && ITEMS[k].d <= depth && ITEMS[k].w > 0 && Meta.itemOk(k));
    const cat = rng.weighted(Object.entries(CAT_W).filter(([c]) => avail(c)).map(([c, w]) => [w, c]));
    const list = Object.keys(ITEMS).filter(k => ITEMS[k].c === cat && ITEMS[k].d <= depth && ITEMS[k].w > 0 && Meta.itemOk(k)).map(k => [ITEMS[k].w, k]);
    return this.makeItem(rng.weighted(list));
  },
  isKnown(it) { const K = ITEMS[it.k]; return !(K.c === 'potion' || K.c === 'scroll' || K.c === 'ring' || K.c === 'wand') || !!G.known[it.k]; },
  itemName(it, plain) {
    const K = ITEMS[it.k], kn = this.isKnown(it);
    let s;
    const en = v => (v >= 0 ? '+' : '') + v;
    switch (K.c) {
      case 'weapon': case 'armor': s = (it.known ? en(it.ench) + ' ' : '') + (it.known && it.rune ? RUNES[it.rune].n + '之' : '') + K.n; break;
      case 'ring': s = kn ? K.n + (it.known ? ' ' + en(it.ench) : '') : RING_LOOKS[this.look(it.k)][0] + '戒指'; break;
      case 'potion': s = kn ? K.n : POTION_LOOKS[this.look(it.k)][0] + '藥水'; break;
      case 'scroll': s = kn ? K.n : '「' + G.snames[it.k] + '」卷軸'; break;
      case 'wand': s = kn ? K.n + (it.known ? ' [' + it.ch + ']' : '') : WAND_LOOKS[this.look(it.k)][0] + '魔杖'; break;
      case 'gold': s = it.n + ' 金幣'; return s;
      default: s = K.n;
    }
    if (!kn && G.tried[it.k] && !plain) s += '（用過）';
    if (it.known && it.cursed && !plain) s += '（詛咒）';
    if (it.n > 1) s += ' ×' + it.n;
    return s;
  },
  itemDesc(it) {
    const K = ITEMS[it.k], kn = this.isKnown(it);
    const rn = (K.c === 'weapon' || K.c === 'armor') && it.rune ? (it.known ? ' 符文「' + RUNES[it.rune].n + '」：' + RUNES[it.rune].d : ' 隱約透出符文的光芒。') : '';
    if (K.c === 'weapon') return (K.keen ? '細長的劍，會心一擊機率 +10%。' : K.sweep ? '橫掃身邊所有敵人（其他敵人受到 50% 傷害）。' : '') + '傷害 ' + K.dmg[0] + '–' + K.dmg[1] + (K.acc ? '，命中 ' + (K.acc > 0 ? '+' : '') + K.acc : '') + (K.pierce ? '。能刺穿後面的敵人。' : K.cleave ? '。會順勢砍到旁邊的敵人。' : K.stun ? '。有機會打暈敵人。' : K.magic ? '。強化魔杖威力。' : '。') + (it.known ? '' : ' 強化值未知，裝備後才知道。') + rn;
    if (K.c === 'armor') return (K.sneak ? '輕巧的斗篷，讓你更不容易被發現。' : K.fireRes ? '龍鱗做的鎧甲，燃燒傷害減半。' : '') + '護甲 ' + K.arm + (K.eva ? '，閃避 ' + K.eva : '') + (K.cdr ? '，技能冷卻較快' : '') + '。' + (it.known ? '' : ' 強化值未知，穿上後才知道。') + rn;
    if (K.c === 'throw') return '投擲傷害 ' + K.dmg[0] + '–' + K.dmg[1] + (K.poison ? '，帶毒。' : '。') + '丟出去後可以撿回來。';
    if (K.c === 'food') return '可以填飽肚子。';
    if (!kn) return { potion: '不知道是什麼藥水。喝下去或丟出去就知道了。', scroll: '上面寫著看不懂的文字。讀了就知道。', ring: '不知道有什麼魔力。戴上就知道。', wand: '不知道是什麼魔杖。揮動看看。' }[K.c];
    return K.desc || '';
  },
  addInv(it, silent) {
    const P = G.P;
    if (it.k === 'gold') { const n = Math.round(it.n * (P.perks.greed ? 1.5 : 1)); P.gold += n; G.stats.gold += n; if (!silent) { msg('撿到 ' + n + ' 金幣。', 'y'); Snd.play('gold'); } return true; }
    const K = ITEMS[it.k];
    if (K.c === 'potion' || K.c === 'scroll' || K.c === 'throw' || K.c === 'food') {
      const same = P.inv.find(o => o.k === it.k);
      if (same) { same.n += it.n; if (!silent) { msg('撿起了' + this.itemName(it) + '。', 'p'); Snd.play('pick'); } return true; }
    }
    if (it.k === 'gold' && G.mod === 'rich') it.n *= 2;
    if (P.inv.length >= P.invMax) { if (!silent) msg('背包滿了！', 'w'); return false; }
    if (this.isMageWand(it)) { G.known[it.k] = 1; it.known = true; }
    P.inv.push(it);
    if (!silent) { msg('撿起了' + this.itemName(it) + '。', 'p'); Snd.play('pick'); G.stats.items++; }
    return true;
  },
  isMageWand(it) { return G.cls === 'mage' && ITEMS[it.k].c === 'wand'; },
  inv(id) { return G.P.inv.find(o => o.id === id); },
  equipped(slot) { const id = G.P.eq[slot]; return id != null ? this.inv(id) : null; },
  isEquipped(it) { const e = G.P.eq; return e.w === it.id || e.a === it.id || e.r1 === it.id || e.r2 === it.id; },
  ringEnch(k) { let s = 0; for (const sl of ['r1', 'r2']) { const r = this.equipped(sl); if (r && r.k === k) s += r.ench; } return s; },
  hasRing(k) { return ['r1', 'r2'].some(sl => { const r = this.equipped(sl); return r && r.k === k; }); },
  removeInv(it, n = 1) {
    const P = G.P;
    if (it.n > n) { it.n -= n; return; }
    for (const s in P.eq) if (P.eq[s] === it.id) P.eq[s] = null;
    P.inv.splice(P.inv.indexOf(it), 1);
  },

  // ---------- 玩家數值 ----------
  stats() {
    const P = G.P, C = CLASSES[P.cls], w = this.equipped('w'), a = this.equipped('a');
    const W = w ? ITEMS[w.k] : { dmg: [1, 3], acc: 0 }, A = a ? ITEMS[a.k] : { arm: 0, eva: 0 };
    const weak = P.hunger < 100 ? 2 : 0;
    let bonus = P.str + (P.perks.str || 0) * 2 + this.ringEnch('r_str') + (w ? w.ench : 0) - weak;
    const furyOn = P.perks.fury && P.hp < P.mhp * 0.35;
    const st = {
      dmin: Math.max(1, W.dmg[0] + bonus), dmax: Math.max(1, W.dmg[1] + bonus),
      acc: C.acc + Math.floor(P.lvl / 2) + (W.acc || 0) + (w ? w.ench : 0) + (P.perks.acc || 0) * 3 - weak,
      eva: C.eva + (A.eva || 0) + Math.floor(P.lvl / 3) + (P.perks.dodge || 0) * 3 + this.ringEnch('r_evade') * 2 + (this.runeOf('a') === 'swift' ? 3 : 0) + (this.reson() === 'rime' ? 2 : 0),
      arm: Math.max(0, (A.arm || 0) + (a ? a.ench : 0) + this.ringEnch('r_prot') + (P.perks.tough || 0) + (P.cls === 'paladin' ? 1 : 0)),
      crit: 0.05 + (P.perks.crit || 0) * 0.07 + (P.cls === 'rogue' ? 0.05 : 0) + (this.runeOf('w') === 'keen' ? 0.1 : 0) + (w && ITEMS[w.k].keen ? 0.1 : 0) + Math.max(0, this.ringEnch('r_crit')) * 0.05 + (this.reson() === 'hunt' ? 0.05 : 0),
      fury: furyOn ? 1.5 : 1,
      sight: 8 + (P.perks.eye ? 2 : 0) + (P.cls === 'ranger' ? 1 : 0) - (G.mod === 'dark' ? 2 : 0),
      wname: w ? this.itemName(w, true) : '拳頭',
    };
    return st;
  },
  pSpeed() { const s = G.P.st; return s.haste ? 200 : s.slow ? 50 : 100; },
  canSeeInvis() { return this.hasRing('r_sight') || G.P.st.detect > 0; },

  // ---------- 樓層 ----------
  enterFloor(depth, how) {
    const prevDepth = G.depth;
    G.depth = depth;
    const rng = new RNG('floor:' + G.seed + ':' + depth);
    const F = Gen.make(depth, rng, {});
    F.seen = new Uint8Array(F.w * F.h);
    F.mons = []; F.items = []; F.traps = []; F.clouds = []; F.detect = false; F.spawnT = 0; F.visited = {};
    G.F = F;
    const P = G.P;
    [P.x, P.y] = F.start;
    if (how === 'fall') { const p = this.randomFree(); [P.x, P.y] = p; }
    P.energy = 100;
    this.populate(F, depth);
    G.stats.maxDepth = Math.max(G.stats.maxDepth, depth);
    if (depth > (Store.meta.deepest || 0)) { Store.meta.deepest = depth; }
    if (depth >= 6 && !Store.meta.unlocked.ranger) { Store.meta.unlocked.ranger = true; G.newUnlock = 'ranger'; msg('解鎖了新職業：遊俠！', 'y'); }
    Store.saveMeta();
    const B = BIOMES[F.biome];
    if (prevDepth) msg('你來到了第 ' + depth + ' 層 · ' + B.n + '。', 'i');
    if (!prevDepth || biomeOf(prevDepth) !== F.biome) msg(B.flavor, 'm');
    if (BOSS_FLOOR[depth]) msg(depth === LAST_FLOOR ? '空氣凝重得讓人發抖……深淵之王就在這裡。' : '一股強大的氣息擋住了樓梯……這層有守層頭目！', 'w');
    if (F.shop) msg('這層好像有一間商店。', 'y');
    if (G.boon === 'map' && F.stairs) { for (const [dx, dy] of [[0, 0]].concat(DIRS8)) { const x = F.stairs[0] + dx, y = F.stairs[1] + dy; if (x >= 0 && y >= 0 && x < F.w && y < F.h) F.seen[y * F.w + x] = 1; } msg('探路者的直覺告訴你樓梯的位置。', 'i'); }
    G.stats.floors = G.stats.floors || []; if (!G.stats.floors.includes(depth)) G.stats.floors.push(depth);
    Art.buildTiles(F.biome);
    this.updateFov();
    Meta.event('depth', depth);
    if (typeof Music !== 'undefined') Music.play(BOSS_FLOOR[depth] ? 'boss' : 'b' + F.biome);
    if (typeof Render !== 'undefined') Render.snapCam();
    this.save();
  },
  populate(F, depth) {
    const rng = new RNG('pop:' + G.seed + ':' + depth), saveRng = G.rng;
    // 使用樓層專屬亂數，讓同種子同樓層內容一致
    G.rng = rng;
    const used = new Set([F.start[1] * F.w + F.start[0]]);
    const free = (room, avoidStart = true) => {
      for (let i = 0; i < 200; i++) {
        let x, y;
        if (room) { x = rng.int(room.x, room.x + room.w - 1); y = rng.int(room.y, room.y + room.h - 1); }
        else { x = rng.int(1, F.w - 2); y = rng.int(1, F.h - 2); }
        const k = y * F.w + x, v = F.t[k];
        if (!(v === T.FLOOR || v === T.GRASS || v === T.RUBBLE || v === T.ICE || v === T.CARPET)) continue;
        if (used.has(k)) continue;
        if (avoidStart && cheb(x, y, F.start[0], F.start[1]) < 7) continue;
        if (!room && Gen.inVault(F, k)) continue;
        if (!room && F.shop && this.inRoom(F.shop, x, y)) continue;
        used.add(k); return [x, y];
      }
      return null;
    };
    // 商店
    const bossK = BOSS_FLOOR[depth];
    if (!F.arena && !bossK && depth >= 2 && (depth === 3 || depth === 10 || rng.chance(G.mod === 'rich' ? 0.55 : 0.3))) {
      const cand = F.rooms.filter(r => r.kind === 'room' && !r.start && r.w * r.h >= 16 && r.w >= 4 && r.h >= 4 && !this.inRoom(r, F.stairs[0], F.stairs[1]));
      if (cand.length) {
        const r = rng.pick(cand); r.kind = 'shop'; F.shop = r;
        const tiles = [];
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { const k = y * F.w + x; if (TP[F.t[k]].walk && F.t[k] !== T.DOOR) { F.t[k] = T.CARPET; F.deco[k] = 0; tiles.push([x, y]); } }
        rng.shuffle(tiles);
        const kp = tiles.pop(); used.add(kp[1] * F.w + kp[0]);
        F.mons.push(this.makeMon('keeper', kp[0], kp[1]));
        const goods = ['p_heal', 'ration'];
        const n = Math.min(tiles.length - 2, rng.int(6, 9));
        for (let i = 0; i < n; i++) {
          const [x, y] = tiles.pop(); used.add(y * F.w + x);
          const it = i < goods.length ? this.makeItem(goods[i]) : this.randomItem(depth + 2);
          if (it.cursed && rng.chance(0.7)) { it.ench = Math.abs(it.ench); it.cursed = false; }
          it.price = this.price(it);
          F.items.push({ x, y, it });
        }
      }
    }
    // 怪物
    const pool = Object.keys(MON).filter(k => MON[k].d <= depth && MON[k].dx >= depth);
    const B = BIOMES[F.biome];
    const pickMon = () => rng.weighted(pool.map(k => [(MON[k].d >= B.from - 1 ? 10 : 4) * (MON[k].rare ? 0.25 : 1), k]));
    if (!F.arena) {
      const nm = 5 + Math.floor(depth * 0.45) + rng.int(0, 3);
      for (let i = 0; i < nm; i++) {
        const k = pickMon(), D = MON[k], p = free(null); if (!p) continue;
        const grp = D.pack ? rng.int(D.pack[0], D.pack[1]) : 1;
        const asleep = rng.chance(D.sleepy || 0.55);
        const lead = this.spawnAt(k, p[0], p[1], asleep, used);
        if (rng.chance(this.eliteChance())) this.makeElite(lead);
        for (let j = 1; j < grp; j++) { const q = this.nearFree(p[0], p[1], used); if (q) this.spawnAt(k, q[0], q[1], asleep, used); }
      }
    }
    // 頭目
    if (bossK) {
      const at = F.arena ? F.bossAt : this.nearFree(F.stairs[0], F.stairs[1], used, 3) || F.stairs;
      const b = this.spawnAt(bossK, at[0], at[1], true, used);
      b.boss = 1; F.locked = !F.arena; F.bossId = b.id;
      if (F.arena) for (let i = 0; i < 3; i++) { const q = this.nearFree(at[0], at[1] + 4, used, 4); if (q) this.spawnAt('skeleton', q[0], q[1], true, used); }
    }
    // 特殊房間
    for (const v of F.vaults) {
      v.loot = rng.pick(['treasure', 'treasure', 'library', 'armory']);
      const n = rng.int(3, 4);
      for (let i = 0; i < n; i++) {
        const p = free(v, false); if (!p) break;
        let it;
        if (v.loot === 'library') it = this.makeItem(rng.weighted(Object.keys(ITEMS).filter(k => ITEMS[k].c === 'scroll' && !ITEMS[k].bad).map(k => [ITEMS[k].w, k])));
        else if (v.loot === 'armory' || i === 0) {
          const ks = Object.keys(ITEMS).filter(k => (ITEMS[k].c === 'weapon' || ITEMS[k].c === 'armor' || ITEMS[k].c === 'ring') && ITEMS[k].d <= depth + 3 && !ITEMS[k].bad);
          it = this.makeItem(rng.pick(ks)); if (it.ench <= 0) { it.ench = rng.int(1, 2 + (depth / 6 | 0)); it.cursed = false; }
        } else it = this.randomItem(depth + 2);
        F.items.push({ x: p[0], y: p[1], it });
      }
      const g = free(v, false); if (g) F.items.push({ x: g[0], y: g[1], it: this.goldItem(depth, 3) });
      if (depth >= 4 && rng.chance(0.3)) { const p = free(v, false); if (p) this.spawnAt('mimic', p[0], p[1], true, used); }
    }
    // 怪物巢穴：一般房間裡塞滿睡著的怪物與寶物
    if (!F.arena && depth >= 3 && rng.chance(0.25)) {
      const cand = F.rooms.filter(r => r.kind === 'room' && !r.start && r.w * r.h >= 20);
      if (cand.length) {
        const r = rng.pick(cand); r.kind = 'den';
        const k = pickMon();
        for (let i = 0; i < rng.int(4, 6); i++) { const p = free(r, true); if (p) this.spawnAt(k, p[0], p[1], true, used); }
        for (let i = 0; i < 2; i++) { const p = free(r, true); if (p) F.items.push({ x: p[0], y: p[1], it: this.randomItem(depth + 1) }); }
      }
    }
    // 寶箱與祭壇
    this.populateExtra(F, depth, rng, used);
    // 一般道具
    if (!F.arena) {
      const ni = 5 + rng.int(0, 3) + (G.mod === 'famine' ? 1 : 0);
      for (let i = 0; i < ni; i++) { const p = free(null, false); if (p) F.items.push({ x: p[0], y: p[1], it: this.randomItem(depth) }); }
      for (let i = rng.int(2, 4); i > 0; i--) { const p = free(null, false); if (p) F.items.push({ x: p[0], y: p[1], it: this.goldItem(depth, 1) }); }
      if (rng.chance(G.mod === 'famine' ? 0.2 : 0.55)) { const p = free(null, false); if (p) F.items.push({ x: p[0], y: p[1], it: this.makeItem('ration') }); }
      if (rng.chance(G.mod === 'famine' ? 0.25 : 0.5)) { const p = free(null, false); if (p) F.items.push({ x: p[0], y: p[1], it: this.makeItem('apple') }); }
      // 寶箱怪偽裝
      if (depth >= 4 && rng.chance(0.18)) { const p = free(null); if (p) this.spawnAt('mimic', p[0], p[1], true, used); }
      // 陷阱
      const tk = Object.keys(TRAPS).filter(k => TRAPS[k].d <= depth);
      const nt = 1 + Math.floor(depth / 3) + rng.int(0, 2) + (asc(8) ? 2 : 0);
      for (let i = 0; i < nt; i++) {
        let p = null;
        for (let j = 0; j < 30 && !p; j++) {
          const q = free(null);
          if (q && (F.corr && F.corr[q[1] * F.w + q[0]] || rng.chance(0.5))) p = q; else if (q) used.delete(q[1] * F.w + q[0]);
        }
        if (!p) continue;
        let k = rng.pick(tk); if (k === 'pit' && BOSS_FLOOR[depth]) k = 'spike';
        F.traps.push({ x: p[0], y: p[1], k, hid: 1 });
      }
    }
    G.rng = saveRng;
  },
  inRoom(r, x, y) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; },
  goldItem(depth, mult) { const it = { id: G.nid++, k: 'gold', c: 'gold', n: Math.round(G.rng.int(6, 14 + depth * 5) * mult) }; return it; },
  price(it) {
    const K = ITEMS[it.k]; let p = K.price || 10;
    if (it.ench > 0) p *= 1 + it.ench * 0.5;
    if (K.c === 'wand') p *= 0.6 + (it.ch || 1) * 0.15;
    p *= it.n * (0.9 + G.depth * 0.03) * (asc(5) ? 1.3 : 1);
    return Math.max(2, Math.round(p / 5) * 5);
  },
  nearFree(x, y, used, r = 2) {
    const F = G.F, c = [];
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const nx = x + i, ny = y + j; if (nx < 1 || ny < 1 || nx >= F.w - 1 || ny >= F.h - 1) continue;
      const k = ny * F.w + nx, v = F.t[k];
      if (!TP[v].walk || v === T.LAVA || v === T.DOOR || v === T.STAIRS || (used && used.has(k)) || this.monAt(nx, ny) || (nx === G.P.x && ny === G.P.y)) continue;
      c.push([nx, ny]);
    }
    if (!c.length) return null;
    c.sort((a, b) => cheb(a[0], a[1], x, y) - cheb(b[0], b[1], x, y));
    const best = c.filter(p => cheb(p[0], p[1], x, y) === cheb(c[0][0], c[0][1], x, y));
    const p = G.rng.pick(best); if (used) used.add(p[1] * F.w + p[0]); return p;
  },
  randomFree(minDist = 0) {
    const F = G.F;
    for (let i = 0; i < 3000; i++) {
      const x = G.rng.int(1, F.w - 2), y = G.rng.int(1, F.h - 2), v = F.t[y * F.w + x];
      if ((v === T.FLOOR || v === T.GRASS || v === T.RUBBLE || v === T.ICE) && !this.monAt(x, y) && !(x === G.P.x && y === G.P.y) && cheb(x, y, G.P.x, G.P.y) >= minDist && !Gen.inVault(F, y * F.w + x)) return [x, y];
    }
    return F.start.slice();
  },
  makeMon(k, x, y) {
    const D = MON[k], lv = Math.max(0, (G.depth || 1) - (D.d > 50 ? G.depth : D.d));
    const hp = Math.round(D.hp * (1 + lv * 0.07) * (G.asc ? this.ascMult('mhp') : 1) * (D.boss && asc(7) ? 1.25 : 1));
    return { id: G.nid++, k, x, y, hp, mhp: hp, lv, energy: G.rng.int(0, 99), awake: false, mode: 'sleep', tx: x, ty: y, st: {}, cd: {}, gold: 0, disg: D.disguise ? 1 : 0, wt: null };
  },
  spawnAt(k, x, y, asleep, used) {
    const m = this.makeMon(k, x, y);
    if (!asleep) { m.awake = true; m.mode = 'wander'; }
    if (used) used.add(y * G.F.w + x);
    G.F.mons.push(m);
    return m;
  },
  monAt(x, y) { const ms = G.F.mons; for (let i = 0; i < ms.length; i++) if (ms[i].x === x && ms[i].y === y && ms[i].hp > 0) return ms[i]; return null; },
  itemsAt(x, y) { return G.F.items.filter(o => o.x === x && o.y === y); },
  trapAt(x, y) { return G.F.traps.find(t => t.x === x && t.y === y); },
  tile(x, y) { const F = G.F; return x < 0 || y < 0 || x >= F.w || y >= F.h ? T.WALL : F.t[y * F.w + x]; },
  setTile(x, y, v) { const F = G.F; if (x > 0 && y > 0 && x < F.w - 1 && y < F.h - 1) F.t[y * F.w + x] = v; },
  dropItem(it, x, y) {
    // 掉在附近沒有東西的格子
    const F = G.F;
    for (let r = 0; r < 4; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
      const nx = x + i, ny = y + j, v = this.tile(nx, ny);
      if (!TP[v].walk || v === T.LAVA || v === T.STAIRS || v === T.DOOR) continue;
      if (this.itemsAt(nx, ny).length) continue;
      if (v === T.WATER && it.c !== 'gold' && G.rng.chance(0.2)) { /* 掉進水裡也沒關係 */ }
      const o = { x: nx, y: ny, it }; F.items.push(o); if (typeof FX !== 'undefined' && (nx !== x || ny !== y || it.k !== 'gold')) FX.pop(o, x, y); return true;
    }
    return false;
  },

  // ---------- 視野 ----------
  updateFov() {
    const F = G.F, P = G.P, st = this.stats();
    G.vis = FOV.compute(F, P.x, P.y, st.sight);
    for (let i = 0; i < G.vis.length; i++) if (G.vis[i]) F.seen[i] = 1;
    // 看得見的牆旁邊也標示（避免邊緣破洞）
    const seenNow = [];
    for (const m of F.mons) if (m.hp > 0 && this.monVisible(m)) seenNow.push(m.id);
    const prev = G.seenMons || [];
    for (const id of seenNow) if (!prev.includes(id)) {
      const m = F.mons.find(o => o.id === id);
      if (m && !MON[m.k].npc && !m.disg) {
        G.interrupt = true;
        if (!G.introduced) G.introduced = {};
        Meta.seeMon(m.k);
        if (m.elite && !m.introduced) { m.introduced = 1; msg('小心！這是' + this.monName(m) + '：' + ELITES[m.elite].d, 'w'); }
        if (!G.introduced[m.k]) { G.introduced[m.k] = 1; msg('你看到了' + MON[m.k].n + '。' + (MON[m.k].d2 || ''), MON[m.k].boss ? 'w' : 'm'); if (MON[m.k].boss) { Snd.play('roar'); if (typeof UI !== 'undefined') UI.bossIntro(m); } }
      }
    }
    G.seenMons = seenNow;
  },
  monVisible(m) {
    if (G.F.detect && !MON[m.k].invis) return true;
    const F = G.F; if (!G.vis || !G.vis[m.y * F.w + m.x]) return false;
    if (MON[m.k].invis && !m.st.revealed && !this.canSeeInvis() && cheb(m.x, m.y, G.P.x, G.P.y) > 1) return false;
    return true;
  },
  hostiles() { return G.F.mons.filter(m => m.hp > 0 && !MON[m.k].npc && this.monVisible(m) && !m.disg); },
  inView(x, y) { return G.vis && G.vis[y * G.F.w + x]; },

  // ---------- 玩家行動 ----------
  canAct() { return G && !G.over && !G.pendingPerks && !G.pendingId; },
  passDiag(x, y, dx, dy) { if (!dx || !dy) return true; return TP[this.tile(x + dx, y)].walk && TP[this.tile(x, y + dy)].walk && this.tile(x + dx, y) !== T.DOOR && this.tile(x, y + dy) !== T.DOOR || (TP[this.tile(x + dx, y)].walk && TP[this.tile(x, y + dy)].walk); },
  move(dx, dy, opts = {}) {
    if (!this.canAct()) return false;
    const P = G.P;
    if (P.st.para || P.st.freeze) { msg('你動彈不得！', 'b'); this.endTurn(); return true; }
    if (P.st.conf && G.rng.chance(0.5)) { [dx, dy] = G.rng.pick(DIRS8); msg('你頭昏腦脹，走錯了方向。', 'w'); }
    const nx = P.x + dx, ny = P.y + dy, v = this.tile(nx, ny);
    const m = this.monAt(nx, ny);
    if (m) {
      const D = MON[m.k];
      if (D.npc) { msg(G.F.shop && this.inRoom(G.F.shop, P.x, P.y) ? '商人：「看上什麼就撿起來，錢會自動付清。也可以在背包裡賣東西給我。」' : '商人：「歡迎光臨！」', 'y'); return false; }
      if (m.disg) this.reveal(m);
      this.meleeAttack(m);
      this.endTurn();
      return true;
    }
    if (dx && dy && (!TP[this.tile(P.x + dx, P.y)].walk || !TP[this.tile(P.x, P.y + dy)].walk)) { return false; }
    if (v === T.FOUNTAIN) { this.drinkFountain(nx, ny); return true; }
    if (v === T.CHEST) { const c = this.chestAt(nx, ny); if (c && !c.open) { if (typeof FX !== 'undefined') FX.bump(P, dx, dy); return this.openChest(c); } if (!opts.auto) msg('空空的寶箱。', 'm'); return false; }
    if (v === T.ALTAR) { const a = this.altarAt(nx, ny); if (!a) return false; if (a.used) { if (!opts.auto) msg(ALTARS[a.k].n + '的力量已經消失了。', 'm'); return false; } if (!opts.auto && typeof UI !== 'undefined') UI.askAltar(a); return false; }
    if (v === T.DRYFOUNT) { msg('泉水已經乾涸了。', 'm'); return false; }
    if (v === T.SECRET || !TP[v].walk) { if (!opts.auto && G.bumpT !== G.turn) { G.bumpT = G.turn; } return false; }
    if (v === T.DOOR) { this.setTile(nx, ny, T.ODOOR); Snd.play('door'); }
    if (v === T.LAVA && !opts.force) { if (G.lavaWarn !== nx + ',' + ny) { G.lavaWarn = nx + ',' + ny; msg('那是滾燙的岩漿！再按一次才會走進去。', 'w'); return false; } }
    const tr = this.trapAt(nx, ny);
    if (tr && !tr.hid && !opts.force) { if (G.trapWarn !== nx + ',' + ny) { G.trapWarn = nx + ',' + ny; msg('那裡有' + TRAPS[tr.k].n + '！再按一次才會踩上去。', 'w'); return false; } }
    G.trapWarn = G.lavaWarn = null;
    P.x = nx; P.y = ny;
    if (typeof FX !== 'undefined') FX.step(P);
    this.onEnter(opts);
    this.endTurn();
    return true;
  },
  onEnter(opts = {}) {
    const P = G.P, F = G.F, v = this.tile(P.x, P.y);
    // 被動搜尋
    this.searchAround(1, (P.cls === 'rogue' ? 0.22 : 0.07) + this.ringEnch('r_sight') * 0.15);
    // 陷阱
    const tr = this.trapAt(P.x, P.y);
    if (tr && !tr.hid && G.rng.chance(0.75)) msg('你小心翼翼地跨過了' + TRAPS[tr.k].n + '。', 'm');
    else if (tr) this.triggerTrap(tr);
    if (G.over || G.depth !== F.depth) return;
    if (v === T.LAVA) { this.lavaBurn(P); }
    if (v === T.WATER && P.st.burn) { P.st.burn = 0; msg('水澆熄了你身上的火。', 'g'); }
    // 道具
    const its = this.itemsAt(P.x, P.y);
    for (const o of its) {
      if (o.it.price) { msg(this.itemName(o.it) + '：售價 ' + o.it.price + ' 金幣。撿起即可購買。', 'y'); continue; }
      if (o.skip) continue;
      if (this.addInv(o.it)) F.items.splice(F.items.indexOf(o), 1); else o.skip = 1;
    }
    if (v === T.STAIRS && !opts.auto) msg(F.locked ? '樓梯被一股力量封住了，必須先打倒守層頭目。' : '這裡有往下的樓梯。按「下樓」繼續深入。', 'i');
    if (F.shop && this.inRoom(F.shop, P.x, P.y) && !F.visited.shop) { F.visited.shop = 1; msg('商人：「歡迎光臨！看上什麼就撿起來，錢會自動付清。」', 'y'); Snd.play('gold'); }
  },
  wait() { if (!this.canAct()) return false; this.searchAround(1, 0.12); this.endTurn(); return true; },
  rest() { // 一回合的休息＋仔細搜尋
    if (!this.canAct()) return false;
    const P = G.P, r = 1 + (P.perks.greed ? 1 : 0) + (P.cls === 'rogue' ? 1 : 0);
    this.searchAround(r, (P.cls === 'rogue' ? 0.45 : 0.3) + this.ringEnch('r_sight') * 0.15);
    this.endTurn();
    return true;
  },
  searchAround(r, ch) {
    const F = G.F, P = G.P;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const x = P.x + i, y = P.y + j, d = Math.max(Math.abs(i), Math.abs(j));
      const c = d <= 1 ? ch : ch * 0.5;
      if (this.tile(x, y) === T.SECRET && G.rng.chance(c)) { this.setTile(x, y, T.DOOR); F.seen[y * F.w + x] = 1; msg('你發現了一扇秘門！', 'y'); Snd.play('secret'); G.interrupt = true; if (typeof FX !== 'undefined') FX.burst(x, y, '#ffd75a', 12); }
      const tr = this.trapAt(x, y);
      if (tr && tr.hid && G.rng.chance(c)) { tr.hid = 0; msg('你發現了' + TRAPS[tr.k].n + '！', 'w'); Snd.play('secret'); G.interrupt = true; }
    }
  },
  descend() {
    if (!this.canAct()) return false;
    const P = G.P, F = G.F;
    if (this.tile(P.x, P.y) !== T.STAIRS) { msg('這裡沒有樓梯。', 'm'); return false; }
    if (F.locked) { msg('樓梯被一股力量封住了，必須先打倒守層頭目。', 'w'); return false; }
    Snd.play('stairs');
    this.enterFloor(G.depth + 1);
    return true;
  },
  pickup(confirmBuy) {
    if (!this.canAct()) return { ok: false };
    const P = G.P, its = this.itemsAt(P.x, P.y);
    if (!its.length) { msg('這裡沒有東西可以撿。', 'm'); return { ok: false }; }
    const o = its[0];
    if (o.it.price) {
      if (!confirmBuy) return { ok: false, buy: o };
      if (P.gold < o.it.price) { msg('金幣不夠。需要 ' + o.it.price + ' 金幣。', 'w'); return { ok: false }; }
      const price = o.it.price; delete o.it.price;
      if (!this.addInv(o.it)) { o.it.price = price; return { ok: false }; }
      P.gold -= price; G.F.items.splice(G.F.items.indexOf(o), 1);
      msg('花了 ' + price + ' 金幣。商人：「謝謝惠顧！」', 'y'); Snd.play('gold');
      return { ok: true };
    }
    if (this.addInv(o.it)) { G.F.items.splice(G.F.items.indexOf(o), 1); this.endTurn(); return { ok: true }; }
    return { ok: false };
  },
  inShop() { const F = G.F; return F.shop && this.inRoom(F.shop, G.P.x, G.P.y) && F.mons.some(m => m.k === 'keeper'); },
  sell(it) {
    if (!this.inShop() || this.isEquipped(it) && it.cursed) return false;
    const unit = Object.assign({}, it, { n: 1 });
    const v = Math.max(1, Math.round(this.price(unit) * 0.4));
    if (this.isEquipped(it)) { if (!this.unequip(it, true)) return false; }
    this.removeInv(it, 1);
    G.P.gold += v; msg('賣出了' + this.itemName(unit, true) + '，得到 ' + v + ' 金幣。', 'y'); Snd.play('gold');
    return true;
  },
  sellValue(it) { return Math.max(1, Math.round(this.price(Object.assign({}, it, { n: 1 })) * 0.4)); },

  // ---------- 裝備 ----------
  equip(it) {
    if (!this.canAct()) return false;
    const P = G.P, K = ITEMS[it.k];
    let slot = K.c === 'weapon' ? 'w' : K.c === 'armor' ? 'a' : null;
    if (K.c === 'ring') slot = !P.eq.r1 ? 'r1' : !P.eq.r2 ? 'r2' : 'r1';
    if (!slot) return false;
    const cur = this.equipped(slot);
    if (cur && cur.cursed) { msg(this.itemName(cur) + '被詛咒了，拿不下來！', 'b'); return false; }
    P.eq[slot] = it.id;
    const wasKnown = it.known; it.known = true;
    if (K.c === 'ring') { if (!G.known[it.k]) { G.known[it.k] = 1; msg('你戴上戒指……這是' + K.n + '！', 'i'); } else msg('你戴上了' + this.itemName(it) + '。', 'n'); }
    else msg((K.c === 'weapon' ? '你拿起了' : '你穿上了') + this.itemName(it) + '。', 'n');
    if (it.cursed && !wasKnown) { msg('糟糕！它被詛咒了，黏在身上拿不下來！', 'b'); Snd.play('curse'); }
    else if (it.ench > 0 && !wasKnown) msg('你感覺到一股力量。', 'g');
    Snd.play('equip');
    this.endTurn();
    return true;
  },
  unequip(it, silent) {
    if (it.cursed) { msg(this.itemName(it) + '被詛咒了，拿不下來！', 'b'); return false; }
    for (const s in G.P.eq) if (G.P.eq[s] === it.id) G.P.eq[s] = null;
    if (!silent) { msg('你卸下了' + this.itemName(it) + '。', 'n'); this.endTurn(); }
    return true;
  },
  drop(it) {
    if (!this.canAct()) return false;
    if (this.isEquipped(it) && !this.unequip(it, true)) return false;
    const P = G.P;
    this.removeInv(it, it.n);
    G.F.items.push({ x: P.x, y: P.y, it, skip: 1, seen: 1 });
    msg('你丟下了' + this.itemName(it) + '。', 'n');
    this.endTurn();
    return true;
  },
  eat(it) {
    if (!this.canAct()) return false;
    const P = G.P, K = ITEMS[it.k];
    P.hunger = Math.min(2100, P.hunger + K.food);
    this.removeInv(it);
    msg(it.k === 'ration' ? '你吃掉了乾糧，好飽！' : '你吃了一顆蘋果，清脆可口。', 'g');
    Snd.play('eat');
    this.endTurn();
    return true;
  },

  // ---------- 藥水 ----------
  quaff(it) {
    if (!this.canAct()) return false;
    const P = G.P, k = it.k, was = !!G.known[k];
    this.removeInv(it);
    G.stats.potions++;
    Snd.play('drink');
    const alch = P.perks.alch ? 1.5 : 1;
    switch (k) {
      case 'p_heal': { const n = Math.round((P.mhp * 0.55 + 10) * alch * (asc(6) ? 0.75 : 1)); this.healP(n); P.st.poison = 0; msg('一股暖流湧遍全身。', 'g'); break; }
      case 'p_xheal': { P.mhp += 6; this.healP(P.mhp); P.st.poison = 0; P.st.burn = 0; msg('你完全恢復了，而且感覺更強壯！', 'g'); break; }
      case 'p_str': P.str++; msg('你的肌肉鼓了起來！力量 +1。', 'g'); break;
      case 'p_life': P.mhp += 10; this.healP(P.mhp); msg('生命力充滿全身！最大 HP +10。', 'g'); break;
      case 'p_haste': P.st.haste = 15; msg('你的動作變得飛快！', 'g'); break;
      case 'p_detect': G.F.detect = true; msg('你的感官擴展到整層樓……所有怪物和道具都浮現在腦海中。', 'g'); break;
      case 'p_xp': this.gainXp(XP_NEED(P.lvl) - P.xp); msg('一股知識湧入腦海！', 'g'); break;
      case 'p_poison': if (P.perks.resist) msg('你喝下毒藥，但抗性保護了你。', 'g'); else { P.st.poison = (P.st.poison || 0) + 8; msg('好難喝！你中毒了！', 'b'); G.lastHit = { src: '毒藥水', how: '毒' }; } break;
      case 'p_conf': P.st.conf = 8; msg('天旋地轉……你頭昏腦脹！', 'b'); break;
      case 'p_fire': this.cloudArea(P.x, P.y, 1, 'fire', 2, '烈焰藥水的火'); this.igniteP('烈焰藥水的火'); msg('藥水在你嘴裡燃燒起來！', 'b'); break;
      case 'p_para': P.st.para = 5; msg('你的身體僵住了，動彈不得！', 'b'); break;
    }
    if (!was) { G.known[k] = 1; msg('原來是' + ITEMS[k].n + '。', 'i'); }
    this.endTurn();
    return true;
  },
  healP(n) {
    const P = G.P, h = Math.min(n, P.mhp - P.hp); P.hp += h;
    if (h > 0 && typeof FX !== 'undefined') FX.num(P.x, P.y, '+' + h, '#7dffa0');
  },

  // ---------- 卷軸 ----------
  read(it) {
    if (!this.canAct()) return false;
    const P = G.P, k = it.k, was = !!G.known[k];
    if (P.st.conf) { msg('你頭太昏了，看不清卷軸上的字。', 'w'); return false; }
    this.removeInv(it);
    G.stats.scrolls++;
    Snd.play('read');
    G.known[k] = 1;
    if (!was) msg('這是' + ITEMS[k].n + '！', 'i');
    switch (k) {
      case 's_id': {
        const un = P.inv.filter(o => this.needsId(o));
        if (!un.length) { msg('你沒有需要辨識的東西。', 'm'); break; }
        if (un.length === 1) { this.identify(un[0]); break; }
        G.pendingId = true; msg('選擇要辨識的道具。', 'i');
        return true; // 等玩家選擇後才結束回合
      }
      case 's_tele': this.teleportP(); msg('你被傳送到了別的地方！', 'i'); break;
      case 's_map': this.magicMap(); msg('整層樓的地圖浮現在你眼前！', 'g'); break;
      case 's_uncurse': { let n = 0; for (const o of P.inv) if (o.cursed) { o.cursed = false; if (o.ench < 0) o.ench = 0; n++; } msg(n ? '一道柔和的光芒驅散了詛咒。' : '你感覺好像有人在照顧你。', 'g'); break; }
      case 's_ew': { const w = this.equipped('w'); if (w) { w.ench++; w.cursed = false; w.known = true; msg(this.itemName(w) + '發出了藍色的光芒！', 'g'); } else msg('你的雙手發出微光，然後又暗了下去。', 'm'); break; }
      case 's_ea': { const a = this.equipped('a'); if (a) { a.ench++; a.cursed = false; a.known = true; msg(this.itemName(a) + '發出了銀色的光芒！', 'g'); } else msg('你的皮膚發出微光，然後又暗了下去。', 'm'); break; }
      case 's_fear': { let n = 0; for (const m of G.F.mons) if (m.hp > 0 && !MON[m.k].npc && this.inView(m.x, m.y)) { m.st.fear = MON[m.k].boss ? 4 : 12; m.awake = true; n++; } msg(n ? '卷軸發出刺耳的尖叫，怪物們嚇得四處逃竄！' : '卷軸發出刺耳的尖叫。', 'g'); break; }
      case 's_summon': { const n = G.rng.int(2, 3); for (let i = 0; i < n; i++) { const q = this.nearFree(P.x, P.y); if (q) { const m = this.spawnAt(this.randomMonKind(), q[0], q[1], false); m.mode = 'hunt'; m.tx = P.x; m.ty = P.y; } } msg('怪物從煙霧中出現了！', 'b'); Snd.play('summon'); break; }
      case 's_charge': { let n = 0; for (const o of P.inv) if (o.c === 'wand') { o.ch += G.rng.int(2, 4); n++; } msg(n ? '你的魔杖充滿了能量！' : '你感到一陣靜電。', n ? 'g' : 'm'); break; }
      case 's_rune': { const it = [this.equipped('w'), this.equipped('a')].filter(Boolean).find(o => !o.rune) || this.equipped('w') || this.equipped('a'); if (it) { this.giveRune(it); it.known = true; msg(this.itemName(it) + '刻上了「' + RUNES[it.rune].n + '」符文！' + RUNES[it.rune].d, 'g'); if (typeof FX !== 'undefined') FX.burst(P.x, P.y, RUNES[it.rune].col, 20); } else msg('卷軸上的符文閃了一下就消失了。', 'm'); break; }
      case 's_noise': for (const m of G.F.mons) if (!MON[m.k].npc && !m.disg) { m.awake = true; m.mode = 'hunt'; m.tx = P.x; m.ty = P.y; } msg('卷軸發出震耳欲聾的巨響！整層的怪物都醒了！', 'b'); Snd.play('alarm'); break;
    }
    this.endTurn();
    return true;
  },
  needsId(o) { return !this.isKnown(o) || ((o.c === 'weapon' || o.c === 'armor' || o.c === 'ring' || o.c === 'wand') && !o.known); },
  identify(o) {
    G.known[o.k] = 1; o.known = true;
    msg('辨識完成：' + this.itemName(o) + '。', 'i');
  },
  finishIdentify(o) { if (!G.pendingId) return; G.pendingId = false; if (o) this.identify(o); this.endTurn(); },
  randomMonKind() {
    const pool = Object.keys(MON).filter(k => MON[k].d <= G.depth && MON[k].dx >= G.depth && !MON[k].disguise);
    return pool.length ? G.rng.pick(pool) : 'rat';
  },
  magicMap() {
    const F = G.F;
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) {
      const k = y * F.w + x;
      if (F.t[k] === T.SECRET) F.t[k] = T.DOOR;
      if (TP[F.t[k]].walk || F.t[k] === T.FOUNTAIN) F.seen[k] = 1;
      else for (const [dx, dy] of DIRS8) { const v = this.tile(x + dx, y + dy); if (TP[v].walk) { F.seen[k] = 1; break; } }
    }
    for (const t of F.traps) t.hid = 0;
  },
  teleportP() {
    const P = G.P, p = this.randomFree(10);
    if (typeof FX !== 'undefined') FX.burst(P.x, P.y, '#b48cff', 16);
    P.x = p[0]; P.y = p[1];
    Snd.play('tele');
    if (typeof FX !== 'undefined') { FX.burst(P.x, P.y, '#b48cff', 16); Render.snapCam(); }
    this.updateFov();
  },

  // ---------- 泉水 ----------
  drinkFountain(x, y) {
    const P = G.P, r = G.rng.next();
    this.setTile(x, y, T.DRYFOUNT);
    Snd.play('drink');
    if (r < 0.45) { this.healP(P.mhp); P.st.poison = 0; msg('你喝了泉水，傷勢完全痊癒了！', 'g'); }
    else if (r < 0.7) {
      const un = P.inv.filter(o => this.needsId(o));
      if (un.length) { const o = G.rng.pick(un); this.identify(o); msg('泉水讓你的頭腦清晰起來。', 'g'); } else { this.healP(P.mhp >> 1); msg('泉水很清涼。', 'g'); }
    } else if (r < 0.82) { P.mhp += 3; P.hp += 3; msg('泉水帶著魔力，最大 HP +3！', 'g'); }
    else if (r < 0.92) { P.st.poison = 6; msg('泉水是苦的……你中毒了！', 'b'); G.lastHit = { src: '泉水', how: '毒' }; }
    else { const q = this.nearFree(P.x, P.y); if (q) { const m = this.spawnAt(this.randomMonKind(), q[0], q[1], false); m.mode = 'hunt'; } msg('水裡爬出了一隻怪物！', 'b'); }
    msg('泉水乾涸了。', 'm');
    this.endTurn();
  },

  // ---------- 經驗與等級 ----------
  gainXp(n) {
    const P = G.P; P.xp += n;
    while (P.xp >= XP_NEED(P.lvl)) {
      P.xp -= XP_NEED(P.lvl); P.lvl++;
      const C = CLASSES[P.cls], g = C.lvHp + G.rng.int(0, 2);
      P.mhp += g; P.hp += g;
      msg('升級了！你現在是 ' + P.lvl + ' 級。最大 HP +' + g + '。', 'y');
      Snd.play('level');
      if (typeof FX !== 'undefined') { FX.burst(P.x, P.y, '#ffd75a', 26); FX.text(P.x, P.y, 'LEVEL UP', '#ffd75a'); }
      G.pendingPerks++;
    }
    if (G.pendingPerks && !G.perkChoices) this.rollPerks();
  },
  rollPerks() {
    const P = G.P, bias = CLASS_PERK_BIAS[P.cls] || [];
    const pool = Object.keys(PERKS).filter(k => (P.perks[k] || 0) < PERKS[k].max).map(k => [bias.includes(k) ? 3 : 1, k]);
    const out = [];
    while (out.length < 3 && pool.length) { const k = G.rng.weighted(pool); out.push(k); pool.splice(pool.findIndex(e => e[1] === k), 1); }
    G.perkChoices = out;
  },
  choosePerk(k) {
    const P = G.P; if (!G.perkChoices || !G.perkChoices.includes(k)) return;
    P.perks[k] = (P.perks[k] || 0) + 1;
    if (k === 'vit') { P.mhp += 12; P.hp += 12; }
    msg('獲得天賦：' + PERKS[k].n + '（' + PERKS[k].d + '）', 'y');
    G.pendingPerks--; G.perkChoices = null;
    if (G.pendingPerks > 0) this.rollPerks();
    this.updateFov();
  },

  // ---------- 存檔 ----------
  save() {
    if (!G || G.over || G.demo) return;
    const F = G.F;
    const snap = Object.assign({}, G, {
      rng: G.rng.s, vis: null,
      F: Object.assign({}, F, { _tset: undefined, t: Array.from(F.t), deco: Array.from(F.deco), seen: Array.from(F.seen), corr: F.corr ? Array.from(F.corr) : null }),
      log: G.log.slice(-60),
    });
    Store.saveRun(snap);
    Store.saveMeta();
  },
  load() {
    const s = Store.loadRun(); if (!s || s.v !== 1) return false;
    try {
      s.rng = new RNG(s.rng);
      const F = s.F; F.chests = F.chests || []; F.altars = F.altars || []; s.asc = s.asc || 0; s.boon = s.boon || 'none'; s.mod = s.mod || null; F.t = Uint8Array.from(F.t); F.deco = Uint8Array.from(F.deco); F.seen = Uint8Array.from(F.seen); if (F.corr) F.corr = Uint8Array.from(F.corr);
      G = s; G.interrupt = false; G.seenMons = [];
      Art.buildTiles(F.biome);
      this.updateFov();
      msg('繼續冒險。', 'i');
      if (typeof Music !== 'undefined') Music.play(BOSS_FLOOR[G.depth] ? 'boss' : 'b' + F.biome);
      return true;
    } catch (e) { G = null; return false; }
  },
};
