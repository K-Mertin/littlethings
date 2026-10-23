'use strict';
// 深淵地牢：耐玩度系統——符文與共鳴、精英怪、寶箱、祭壇與試煉、成就、圖鑑、深淵等級、每日變化、開局祝福

// ---------- 新地形 ----------
T.CHEST = 18; T.ALTAR = 19;
TP[T.CHEST] = { walk: 0, op: 0, n: '寶箱' };
TP[T.ALTAR] = { walk: 0, op: 0, n: '祭壇' };

// ---------- 符文 ----------
const RUNES = {
  // 武器
  fire: { n: '烈焰', w: 1, col: '#ff8a3a', rgb: '255,130,50', d: '命中時有 35% 機率讓敵人著火。' },
  frost: { n: '冰霜', w: 1, col: '#9fe8ff', rgb: '150,230,255', d: '命中時有 20% 機率凍住敵人。' },
  vamp: { n: '吸血', w: 1, col: '#ff4a6a', rgb: '255,70,100', d: '命中時吸取 20% 傷害回復 HP。' },
  thunder: { n: '雷鳴', w: 1, col: '#ffe86a', rgb: '255,230,110', d: '命中時有 30% 機率放出連鎖閃電。' },
  keen: { n: '銳利', w: 1, col: '#e8eef6', rgb: '230,240,255', d: '會心一擊機率 +10%。' },
  slayer: { n: '屠魔', w: 1, col: '#ffd75a', rgb: '255,215,90', d: '對頭目與亡靈傷害 ×1.5。' },
  // 護甲
  thorn: { n: '荊棘', a: 1, col: '#7be04a', rgb: '120,225,80', d: '被近戰命中時反彈 30% 傷害。' },
  regen: { n: '再生', a: 1, col: '#7dffa0', rgb: '125,255,160', d: 'HP 回復速度 +60%。' },
  swift: { n: '輕盈', a: 1, col: '#c8f0ff', rgb: '200,240,255', d: '閃避 +3。' },
  fireward: { n: '抗火', a: 1, col: '#ff6a2a', rgb: '255,110,40', d: '燃燒與岩漿的傷害減半。' },
  ward: { n: '反魔', a: 1, col: '#b48cff', rgb: '180,140,255', d: '受到的法術與遠程魔法傷害 -35%。' },
  shadow: { n: '暗影', a: 1, col: '#8a6acf', rgb: '140,110,210', d: '腳步更輕，怪物不容易察覺你。' },
};
const W_RUNES = Object.keys(RUNES).filter(k => RUNES[k].w), A_RUNES = Object.keys(RUNES).filter(k => RUNES[k].a);
// 武器符文＋護甲符文的組合會產生「共鳴」
const RESON = {
  blaze: { n: '炎之共鳴', w: 'fire', a: 'fireward', d: '攻擊必定點燃敵人，你不會被燒傷。' },
  rime: { n: '霜之共鳴', w: 'frost', a: 'swift', d: '凍結機率加倍，閃避再 +2。' },
  blood: { n: '血之共鳴', w: 'vamp', a: 'regen', d: '吸血量加倍。' },
  storm: { n: '雷之共鳴', w: 'thunder', a: 'ward', d: '每次命中都會放出連鎖閃電。' },
  hunt: { n: '獵手共鳴', w: 'keen', a: 'shadow', d: '偷襲傷害再 +50%，會心一擊再 +5%。' },
  holy: { n: '聖裁共鳴', w: 'slayer', a: 'thorn', d: '反彈傷害加倍，對頭目再 +20%。' },
};

// ---------- 精英怪 ----------
const ELITES = {
  fast: { n: '迅捷的', col: '#8fe8ff', rgb: '120,220,255', d: '動作快 50%。' },
  tough: { n: '堅韌的', col: '#c8c8d8', rgb: '200,200,220', d: 'HP 更多，受到的傷害 -2。' },
  rage: { n: '狂暴的', col: '#ff5a4a', rgb: '255,80,70', d: '攻擊力 +40%。' },
  flame: { n: '燃燒的', col: '#ff9a3a', rgb: '255,150,50', d: '攻擊會點燃你，不怕火。' },
  vamp: { n: '嗜血的', col: '#ff4a8a', rgb: '255,70,130', d: '打中你時會回復 HP。' },
  regen: { n: '再生的', col: '#7dffa0', rgb: '125,255,160', d: '每回合回復 HP。' },
};

// ---------- 祭壇 ----------
const ALTARS = {
  blood: { n: '鮮血祭壇', col: '#e83a4a', rgb: '235,60,80', d: '獻上 25% 最大 HP 的鮮血，換取一次天賦選擇。' },
  gold: { n: '黃金祭壇', col: '#ffd040', rgb: '255,210,70', d: '獻上金幣，強化身上的武器或護甲（可能刻上符文）。' },
  chaos: { n: '混沌祭壇', col: '#b05cff', rgb: '180,100,255', d: '免費祈禱，但結果難以預料……' },
  trial: { n: '試煉祭壇', col: '#ff8a3a', rgb: '255,140,60', d: '召喚精英守衛。擊敗所有守衛就能得到豐厚獎勵。' },
};

// ---------- 新道具（有些要靠成就解鎖） ----------
Object.assign(ITEMS, {
  rapier: { c: 'weapon', n: '細劍', spr: 'rapier', dmg: [2, 7], acc: 4, d: 3, w: 6, price: 120, keen: 1, lock: 'rogue8' },
  scythe: { c: 'weapon', n: '死神鐮刀', spr: 'scythe', dmg: [4, 11], acc: -1, d: 6, w: 4, price: 200, sweep: 1, lock: 'elite20' },
  cloak: { c: 'armor', n: '暗影斗篷', spr: 'cloak', arm: 2, eva: 2, d: 3, w: 5, price: 120, tint: '#4a3a6a', look: 'cloak', sneak: 1 },
  dragon: { c: 'armor', n: '龍鱗甲', spr: 'armor', arm: 7, eva: -2, d: 10, w: 3, price: 320, tint: '#c8402a', look: 'dragon', fireRes: 1, lock: 'forge' },
  r_crit: { c: 'ring', n: '會心之戒', d: 3, w: 3, price: 160, desc: '提升會心一擊機率。', lock: 'mage8' },
  s_rune: { c: 'scroll', n: '符文卷軸', d: 2, w: 5, price: 140, desc: '替身上的武器（或護甲）刻上隨機符文。', lock: 'altar5' },
});
Object.assign(SPR, {
  rapier: { p: { w: '#f4f6ff', W: '#a8b4c6', g: '#e0b040', h: '#7a4a2a' }, m: [
    '...........w', '..........w.', '.........w..', '........w...', '.......w....', '......w.....',
    '..gg.wW.....', '..g.wW......', '..ggg.......', '..hh........', '.hh.........', '.h..........'] },
  scythe: { p: { w: '#eef3fa', W: '#a8b4c6', h: '#6a4424' }, m: [
    '..wwwww.....', '.wWWWWWw....', 'wW.....hw...', 'w......h....', '......h.....', '.....h......',
    '....h.......', '...h........', '..h.........', '.h..........', 'h...........', '............'] },
  cloak: { p: { a: '#2a2040', A: '#4a3a6a', h: '#b48cff' }, m: [
    '....aaaa....', '...aAAAAa...', '..aAAhhAAa..', '..aAAAAAAa..', '.aAAAAAAAAa.', '.aAAAAAAAAa.',
    '.aAAAAAAAAa.', 'aAAAAAAAAAAa', 'aAAAAAAAAAAa', 'aAAAAAAAAAAa', 'aaaaaaaaaaaa', '............'] },
});
WPN_LOOK.rapier = 'rapier'; WPN_LOOK.scythe = 'scythe';

// ---------- 深淵等級 ----------
const ASC = [
  { n: '標準', d: '原本的深淵。' },
  { n: '深淵 1', d: '怪物 HP +15%。' },
  { n: '深淵 2', d: '精英怪更常出現。' },
  { n: '深淵 3', d: '肚子餓得更快（+20%）。' },
  { n: '深淵 4', d: '怪物傷害 +15%。' },
  { n: '深淵 5', d: '商店價格 +30%。' },
  { n: '深淵 6', d: '治療藥水效果 -25%。' },
  { n: '深淵 7', d: '守層頭目 HP +25%。' },
  { n: '深淵 8', d: '陷阱更多，開局少帶一份乾糧。' },
  { n: '深淵 9', d: '怪物 HP 再 +15%。' },
  { n: '深淵 10', d: '怪物傷害再 +15%，精英怪再更多。' },
];
const asc = n => G && (G.asc || 0) >= n;

// ---------- 每日挑戰的變化 ----------
const DMODS = {
  glass: { n: '玻璃大砲', d: '你的傷害 +50%，但最大 HP -30%。' },
  elite: { n: '精英之日', d: '精英怪出現率 ×3，牠們掉的寶物也更多。' },
  rich: { n: '黃金時代', d: '撿到的金幣 ×2，商店更常出現。' },
  famine: { n: '饑荒', d: '食物很少，但每層多一件道具。' },
  dark: { n: '永夜', d: '視野 -2，但怪物比較容易睡著。' },
  arcane: { n: '魔力潮汐', d: '魔杖多 2 格能量，法術傷害 +30%。' },
  chests: { n: '寶箱狂熱', d: '每層都有更多寶箱——但也有更多寶箱怪。' },
};
const mod = k => G && G.mod === k;

// ---------- 開局祝福 ----------
const BOONS = {
  none: { n: '無', d: '不帶任何祝福。' },
  map: { n: '探路者', d: '每到一層，就知道樓梯在哪裡。', ach: 'chest10' },
  rune: { n: '符文之刃', d: '起始武器帶有隨機符文。', ach: 'altar5' },
  hunter: { n: '獵人印記', d: '精英怪更常出現，且必定多掉一件寶物。', ach: 'elite20' },
  alch: { n: '鍊金行囊', d: '開局多帶兩瓶藥水，並且認得治療藥水。', ach: 'potions' },
  veteran: { n: '老兵', d: '開局就有一次天賦選擇。', ach: 'allcls' },
};

// ---------- 成就 ----------
const ACH = [
  { id: 'd2', n: '初入深淵', d: '抵達第 2 層', s: 3, chk: e => e.t === 'depth' && e.v >= 2 },
  { id: 'rat', n: '鼠輩終結者', d: '擊敗鼠王', s: 6, chk: e => e.t === 'boss' && e.v === 'ratking' },
  { id: 'd6', n: '深入菇林', d: '抵達第 6 層', s: 5, chk: e => e.t === 'depth' && e.v >= 6 },
  { id: 'speed', n: '速攻', d: '在 1500 回合內抵達第 5 層', s: 6, chk: e => e.t === 'depth' && e.v >= 5 && G.turn <= 1500 },
  { id: 'rich', n: '小富翁', d: '同時持有 500 金幣', s: 4, chk: e => e.t === 'gold' && e.v >= 500 },
  { id: 'chest10', n: '寶箱獵人', d: '累計打開 10 個寶箱', s: 5, chk: e => e.t === 'chest' && Meta.cnt('chests') >= 10, reward: '解鎖開局祝福「探路者」' },
  { id: 'altar5', n: '祭壇信徒', d: '累計使用 5 座祭壇', s: 5, chk: e => e.t === 'altar' && Meta.cnt('altars') >= 5, reward: '符文卷軸開始出現；解鎖祝福「符文之刃」' },
  { id: 'elite20', n: '精英殺手', d: '累計擊敗 20 隻精英怪', s: 8, chk: e => e.t === 'elite' && Meta.cnt('elites') >= 20, reward: '死神鐮刀開始出現；解鎖祝福「獵人印記」' },
  { id: 'trial3', n: '試煉勇者', d: '完成 3 次試煉', s: 8, chk: e => e.t === 'trial' && Meta.cnt('trials') >= 3 },
  { id: 'potions', n: '藥劑師', d: '在同一局辨識 8 種藥水', s: 5, chk: e => e.t === 'id' && Object.keys(G.known).filter(k => ITEMS[k] && ITEMS[k].c === 'potion').length >= 8, reward: '解鎖祝福「鍊金行囊」' },
  { id: 'rogue8', n: '影中之刃', d: '用盜賊抵達第 8 層', s: 6, chk: e => e.t === 'depth' && e.v >= 8 && G.cls === 'rogue', reward: '細劍開始出現' },
  { id: 'mage8', n: '奧術學徒', d: '用法師抵達第 8 層', s: 6, chk: e => e.t === 'depth' && e.v >= 8 && G.cls === 'mage', reward: '會心之戒開始出現' },
  { id: 'mother', n: '除菌專家', d: '擊敗菇母', s: 10, chk: e => e.t === 'boss' && e.v === 'mother' },
  { id: 'resonance', n: '共鳴', d: '同時裝備能產生共鳴的武器與護甲', s: 5, chk: e => e.t === 'reson' },
  { id: 'forge', n: '熄滅熔爐', d: '擊敗熔爐巨像', s: 15, chk: e => e.t === 'boss' && e.v === 'forge', reward: '龍鱗甲開始出現' },
  { id: 'asc3', n: '深淵行者', d: '在深淵等級 3 以上抵達第 10 層', s: 15, chk: e => e.t === 'depth' && e.v >= 10 && (G.asc || 0) >= 3 },
  { id: 'codex', n: '博物學家', d: '圖鑑收錄 20 種怪物', s: 10, chk: e => e.t === 'codex' && Meta.monCount() >= 20 },
  { id: 'allcls', n: '百變冒險者', d: '用全部五個職業各抵達第 5 層', s: 12, chk: e => e.t === 'depth' && e.v >= 5 && CLASS_ORDER.every(c => (Store.meta.clsDeep || {})[c] >= 5), reward: '解鎖祝福「老兵」' },
  { id: 'witch', n: '破冰者', d: '擊敗冰霜女巫', s: 20, chk: e => e.t === 'boss' && e.v === 'witch' },
  { id: 'relic4', n: '收藏家', d: '在同一局擁有 4 件遺物', s: 8, chk: e => e.t === 'relic' && (G.P.relics || []).length >= 4 },
  { id: 'rset', n: '遺物羈絆', d: '湊齊同一種羈絆的兩件遺物', s: 6, chk: e => e.t === 'relic' && Game.activeSets().length > 0 },
  { id: 'npc5', n: '地牢之友', d: '累計和 5 位地牢裡的人物打交道', s: 6, chk: e => e.t === 'npc' && Meta.cnt('npcs') >= 5 },
  { id: 'weekly8', n: '每週挑戰者', d: '在每週挑戰抵達第 8 層', s: 8, chk: e => e.t === 'depth' && e.v >= 8 && G.weekly },
  { id: 'win', n: '深淵征服者', d: '擊敗深淵之王', s: 50, chk: e => e.t === 'win' },
];

const Meta = {
  m() { const M = Store.meta; M.ach = M.ach || {}; M.cnt = M.cnt || {}; M.codex = M.codex || { m: {}, i: {} }; M.clsDeep = M.clsDeep || {}; return M; },
  has(id) { return !!this.m().ach[id]; },
  cnt(k) { return this.m().cnt[k] || 0; },
  inc(k, n = 1) { const M = this.m(); M.cnt[k] = (M.cnt[k] || 0) + n; },
  itemOk(k) { const L = ITEMS[k].lock; return !L || this.has(L); },
  boonOk(k) { const B = BOONS[k]; return B && (!B.ach || this.has(B.ach)); },
  monCount() { return Object.keys(this.m().codex.m).length; },
  event(t, v) {
    if (!G || G.demo || G.dbgSkip) return;
    const M = this.m(), e = { t, v };
    if (t === 'depth') { M.clsDeep[G.cls] = Math.max(M.clsDeep[G.cls] || 0, v); }
    for (const A of ACH) {
      if (M.ach[A.id]) continue;
      let ok = false; try { ok = A.chk(e); } catch (err) { ok = false; }
      if (!ok) continue;
      M.ach[A.id] = new Date().toISOString().slice(0, 10);
      M.souls = (M.souls || 0) + A.s; M.totalSouls = (M.totalSouls || 0) + A.s;
      (G.newAch = G.newAch || []).push(A.id);
      msg('★ 達成成就「' + A.n + '」！獲得 ' + A.s + ' 靈魂石。' + (A.reward ? A.reward + '。' : ''), 'y');
      if (typeof UI !== 'undefined') UI.toast('成就達成', A.n, A.reward || A.d);
      Snd.play('level');
    }
    Store.saveMeta();
  },
  seeMon(k) { if (!G || G.demo || MON[k].npc) return; const c = this.m().codex.m; if (!c[k]) { c[k] = { k: 0 }; this.event('codex'); } },
  killMon(k) { if (!G || G.demo) return; const c = this.m().codex.m; c[k] = c[k] || { k: 0 }; c[k].k++; },
  knowItems() { if (!G || G.demo) return; const c = this.m().codex.i; let n = 0; for (const k in G.known) if (G.known[k] && !c[k]) { c[k] = 1; n++; } for (const it of G.P.inv) if (!c[it.k] && Game.isKnown(it)) { c[it.k] = 1; n++; } return n; },
};

// ---------- 遊戲規則的擴充 ----------
Object.assign(Game, {
  ascMult(kind) {
    const a = G.asc || 0;
    if (kind === 'mhp') return (a >= 1 ? 1.15 : 1) * (a >= 9 ? 1.15 : 1);
    if (kind === 'mdmg') return (a >= 4 ? 1.15 : 1) * (a >= 10 ? 1.15 : 1);
    return 1;
  },
  eliteChance() {
    let c = 0.05 + G.depth * 0.004;
    if (asc(2)) c += 0.05; if (asc(10)) c += 0.05;
    if (mod('elite')) c *= 3; if (G.boon === 'hunter') c *= 1.5;
    return Math.min(0.45, c);
  },
  makeElite(m, k) {
    const D = MON[m.k]; if (D.boss || D.npc || D.disguise || m.k === 'sporeling') return m;
    k = k || G.rng.pick(Object.keys(ELITES));
    if (k === 'flame' && D.fireImm) k = 'rage';
    m.elite = k;
    const mult = k === 'tough' ? 2.3 : 1.6;
    m.mhp = m.hp = Math.round(m.mhp * mult);
    return m;
  },
  monName(m) { return (m.elite ? ELITES[m.elite].n : '') + MON[m.k].n; },
  runeOf(slot) { const it = this.equipped(slot); return it && it.known && it.rune ? it.rune : null; },
  reson() {
    const w = this.runeOf('w'), a = this.runeOf('a'); if (!w || !a) return null;
    for (const k in RESON) if (RESON[k].w === w && RESON[k].a === a) return k;
    return null;
  },
  giveRune(it) {
    const K = ITEMS[it.k]; if (K.c !== 'weapon' && K.c !== 'armor') return false;
    it.rune = G.rng.pick(K.c === 'weapon' ? W_RUNES : A_RUNES); return true;
  },
  // 武器符文效果（命中之後）
  weaponProc(m, dmg) {
    const r = this.runeOf('w'); if (!r || m.hp <= 0 && r !== 'vamp') return;
    const D = MON[m.k], rs = this.reson(), fx = typeof FX !== 'undefined';
    if (r === 'fire' && m.hp > 0 && !D.fireImm && (rs === 'blaze' || G.rng.chance(0.35))) { m.st.burn = 3; if (fx) FX.burst(m.x, m.y, '#ff8a3a', 8); }
    if (r === 'frost' && m.hp > 0 && G.rng.chance(rs === 'rime' ? 0.4 : 0.2)) { m.st.freeze = D.boss ? 1 : 2; msg(this.monName(m) + '被凍住了！', 'g'); if (fx) FX.burst(m.x, m.y, '#9fe8ff', 10); }
    if (r === 'vamp') { const h = Math.max(1, Math.round(dmg * (rs === 'blood' ? 0.4 : 0.2))); this.healP(h); }
    if (r === 'thunder' && (rs === 'storm' || G.rng.chance(0.3))) {
      const o = this.hostiles().filter(x => x !== m && x.hp > 0 && cheb(x.x, x.y, m.x, m.y) <= 3)[0];
      if (o) { if (fx) FX.proj(m.x, m.y, o.x, o.y, 'bolt'); Snd.play('thunder'); this.damageMon(o, Math.max(1, Math.round(dmg * 0.6)), {}); msg('連鎖閃電擊中了' + this.monName(o) + '！', 'g'); }
    }
  },
  // ---------- 寶箱 ----------
  chestAt(x, y) { return (G.F.chests || []).find(c => c.x === x && c.y === y); },
  openChest(c) {
    if (c.open) { msg('寶箱已經空了。', 'm'); return false; }
    c.open = 1;
    Snd.play('chest'); Snd.play('gold');
    const d = G.depth, n = c.gold ? 3 : G.rng.int(1, 2);
    msg(c.gold ? '你打開了華麗的寶箱，金光四射！' : '你打開了寶箱。', 'y');
    for (let i = 0; i < n + (this.relic('coin') ? 1 : 0); i++) {
      const it = c.gold && i === 0 ? (G.rng.chance(0.35) ? this.relicItem() : this.goodItem(d + 3)) : this.randomItem(d + (c.gold ? 3 : 1));
      if (it.cursed && G.rng.chance(c.gold ? 1 : 0.5)) { it.ench = Math.abs(it.ench) || 1; it.cursed = false; }
      this.dropItem(it, c.x, c.y);
    }
    this.dropItem(this.goldItem(d, c.gold ? 4 : 1.5), c.x, c.y);
    if (typeof FX !== 'undefined') { FX.burst(c.x, c.y, '#ffd75a', 18); FX.ring(c.x, c.y, 0.6, '#ffd75a'); }
    G.stats.chests = (G.stats.chests || 0) + 1;
    Meta.inc('chests'); Meta.event('chest');
    this.endTurn();
    return true;
  },
  goodItem(depth) {
    const ks = Object.keys(ITEMS).filter(k => (ITEMS[k].c === 'weapon' || ITEMS[k].c === 'armor' || ITEMS[k].c === 'ring') && ITEMS[k].d <= depth + 2 && !ITEMS[k].bad && this.itemOk(k));
    const it = this.makeItem(G.rng.pick(ks));
    if (it.ench <= 0) { it.ench = G.rng.int(1, 2 + (depth / 6 | 0)); it.cursed = false; }
    if ((it.c === 'weapon' || it.c === 'armor') && !it.rune && G.rng.chance(0.45)) this.giveRune(it);
    return it;
  },
  itemOk(k) { return Meta.itemOk(k); },
  // ---------- 祭壇 ----------
  altarAt(x, y) { return (G.F.altars || []).find(a => a.x === x && a.y === y); },
  altarCost(a) { return a.k === 'blood' ? Math.ceil(G.P.mhp * 0.25) : a.k === 'gold' ? 40 + G.depth * 12 : 0; },
  useAltar(a) {
    if (!this.canAct() || a.used) return false;
    const P = G.P, fx = typeof FX !== 'undefined';
    switch (a.k) {
      case 'blood': {
        const c = this.altarCost(a);
        if (P.hp <= c) { msg('你的血不夠……祭壇需要 ' + c + ' 點 HP。', 'w'); return false; }
        P.hp -= c; if (fx) { FX.num(P.x, P.y, String(c), '#ff6b6b'); FX.burst(a.x, a.y, '#e83a4a', 20); FX.screen('200,20,40', 0.3); }
        msg('鮮血流進祭壇……一股力量灌注全身！', 'y'); Snd.play('holy');
        G.pendingPerks++; if (!G.perkChoices) this.rollPerks();
        break;
      }
      case 'gold': {
        const c = this.altarCost(a);
        if (P.gold < c) { msg('金幣不夠，祭壇需要 ' + c + ' 金幣。', 'w'); return false; }
        const it = this.equipped('w') || this.equipped('a');
        if (!it) { msg('你身上沒有可以強化的裝備。', 'w'); return false; }
        P.gold -= c; it.ench++; it.cursed = false; it.known = true;
        let extra = '';
        if (!it.rune && G.rng.chance(0.4)) { this.giveRune(it); extra = '並刻上了「' + RUNES[it.rune].n + '」符文'; }
        msg('金幣化為光芒，' + this.itemName(it) + '變得更強了' + (extra ? '，' + extra : '') + '！', 'y'); Snd.play('gold'); Snd.play('level');
        if (fx) { FX.burst(P.x, P.y, '#ffd75a', 24); FX.ring(P.x, P.y, 1, '#ffd75a'); }
        break;
      }
      case 'chaos': {
        const r = G.rng.next();
        if (fx) { FX.burst(a.x, a.y, '#b05cff', 22); FX.ring(a.x, a.y, 1.2, '#b05cff'); }
        Snd.play('magic');
        if (r < 0.28) { P.mhp += 5; this.healP(P.mhp); msg('混沌之光溫柔地包圍了你：HP 全滿，最大 HP +5！', 'g'); }
        else if (r < 0.48) { const k = G.rng.pick(['p_heal', 'p_str', 'p_life', 'p_xp', 'p_xheal']); const it = this.makeItem(k); G.known[k] = 1; this.dropItem(it, a.x, a.y); msg('祭壇上出現了一瓶' + ITEMS[k].n + '。', 'g'); }
        else if (r < 0.62) { this.dropItem(this.goldItem(G.depth, 4), a.x, a.y); msg('金幣從祭壇裡湧了出來！', 'g'); }
        else if (r < 0.78) {
          const eq = ['w', 'a'].map(s => this.equipped(s)).filter(Boolean);
          if (eq.length) { const it = G.rng.pick(eq); it.ench--; it.cursed = true; it.known = true; msg('一道黑光纏上了' + this.itemName(it, true) + '……它被詛咒了！', 'b'); Snd.play('curse'); }
          else { P.st.poison = (P.st.poison || 0) + 6; msg('祭壇噴出毒霧！', 'b'); }
        } else { const n = 2; for (let i = 0; i < n; i++) { const q = this.nearFree(a.x, a.y); if (q) { const m = this.makeElite(this.spawnAt(this.randomMonKind(), q[0], q[1], false)); m.mode = 'hunt'; m.tx = P.x; m.ty = P.y; } } msg('祭壇裂開，精英怪物爬了出來！', 'b'); Snd.play('summon'); }
        break;
      }
      case 'trial': {
        const n = G.depth >= 8 ? 3 : 2, ids = [];
        for (let i = 0; i < n; i++) { const q = this.nearFree(a.x, a.y, null, 3); if (q) { const m = this.makeElite(this.spawnAt(this.randomMonKind(), q[0], q[1], false)); m.mode = 'hunt'; m.tx = P.x; m.ty = P.y; m.trial = 1; ids.push(m.id); if (fx) FX.burst(q[0], q[1], '#ff8a3a', 14); } }
        G.F.trial = { x: a.x, y: a.y, ids };
        msg('試煉開始！擊敗所有精英守衛！', 'w'); Snd.play('roar'); if (fx) { FX.shake(5); FX.screen('255,140,60', 0.25); }
        break;
      }
    }
    a.used = 1;
    G.stats.altars = (G.stats.altars || 0) + 1;
    Meta.inc('altars'); Meta.event('altar');
    this.endTurn();
    return true;
  },
  checkTrial() {
    const T0 = G.F.trial; if (!T0 || T0.done) return;
    if (T0.ids.some(id => G.F.mons.some(m => m.id === id && m.hp > 0))) return;
    T0.done = 1;
    msg('試煉完成！祭壇獻上了獎賞。', 'y'); Snd.play('victory');
    for (let i = 0; i < 2; i++) this.dropItem(i === 0 && G.rng.chance(0.5) ? this.relicItem() : this.goodItem(G.depth + 2), T0.x, T0.y);
    this.dropItem(this.goldItem(G.depth, 4), T0.x, T0.y);
    if (typeof FX !== 'undefined') { FX.ring(T0.x, T0.y, 1.5, '#ffd75a'); FX.burst(T0.x, T0.y, '#ffd75a', 30); }
    G.stats.trials = (G.stats.trials || 0) + 1;
    Meta.inc('trials'); Meta.event('trial');
  },
  // 在 3×3 都能走的房間格子放東西，不會切斷通路
  placeBlock(F, rng, used, kind) {
    for (let i = 0; i < 200; i++) {
      const r = i < 80 && F.rooms.length ? rng.pick(F.rooms) : null; if (r && (r.kind === 'vault' || r.kind === 'shop')) continue;
      const x = r ? rng.int(r.x + 1, r.x + r.w - 2) : rng.int(2, F.w - 3), y = r ? rng.int(r.y + 1, r.y + r.h - 2) : rng.int(2, F.h - 3), k = y * F.w + x;
      if (!r && (Gen.inVault(F, k) || (F.shop && this.inRoom(F.shop, x, y)))) continue;
      if (F.t[k] !== T.FLOOR || used.has(k) || cheb(x, y, F.start[0], F.start[1]) < 3) continue;
      if (F.stairs && cheb(x, y, F.stairs[0], F.stairs[1]) < 2) continue;
      if (!DIRS8.every(([dx, dy]) => { const v = F.t[(y + dy) * F.w + x + dx]; return v === T.FLOOR || v === T.GRASS || v === T.RUBBLE || v === T.ICE; })) continue;
      if (DIRS8.some(([dx, dy]) => used.has((y + dy) * F.w + x + dx) && (F.t[(y + dy) * F.w + x + dx] === T.CHEST || F.t[(y + dy) * F.w + x + dx] === T.ALTAR))) continue;
      F.t[k] = kind; F.deco[k] = 0; used.add(k); return [x, y];
    }
    return null;
  },
  populateExtra(F, depth, rng, used) {
    F.chests = []; F.altars = [];
    if (F.arena) return;
    let nc = (rng.chance(0.5) ? 1 : 0) + (rng.chance(0.18) ? 1 : 0) + (mod('chests') ? 2 : 0);
    for (let i = 0; i < nc; i++) { const p = this.placeBlock(F, rng, used, T.CHEST); if (p) F.chests.push({ x: p[0], y: p[1], open: 0, gold: rng.chance(0.12) ? 1 : 0 }); }
    if (mod('chests')) for (let i = 0; i < 2; i++) { const p = this.placeBlock(F, rng, used, T.FLOOR); if (p) this.spawnAt('mimic', p[0], p[1], true, used); }
    if (depth >= 2 && !BOSS_FLOOR[depth] && rng.chance(0.42)) {
      const k = rng.weighted([[3, 'blood'], [3, 'gold'], [2, 'chaos'], [depth >= 3 ? 2 : 0, 'trial']]);
      const p = this.placeBlock(F, rng, used, T.ALTAR); if (p) F.altars.push({ x: p[0], y: p[1], k, used: 0 });
    }
  },
});
