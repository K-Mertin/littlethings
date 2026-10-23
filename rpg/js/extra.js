'use strict';
// 曉鐘傳說：耐玩要素——怪物圖鑑、成就、星之碎片、懸賞、賭場拉霸、星之迴廊（通關後迷宮）、二周目

// ───── 新增資料 ─────
Object.assign(MONS, {
  goldmush: { name: '黃金蹦蹦菇', tpl: 'mushroom', pal: { a: '#f2c14e', b: '#fff4d0', c: '#ffffff' }, hp: 24, atk: 22, def: 90, agi: 40, exp: 40, gold: 420, acts: ['atk', 1, 'flee', 3], rare: 1 },
  kingrat: { name: '鼠王 吱吱大帝', tpl: 'rat', pal: { a: '#c8a040', b: '#fff0c0', c: '#ff7a9a', e: '#c02020' }, art: {}, hp: 300, atk: 46, def: 26, agi: 26, exp: 420, gold: 300, acts: ['atk', 3, 'atk2', 2, 'call:rat', 1, 'steal', 0], rare: 1, size: 64 },
  sandworm: { name: '沙漠巨蟒', tpl: 'snake', pal: { a: '#b8783a', b: '#f0d090', e: '#ff3020' }, hp: 980, atk: 74, def: 44, agi: 26, exp: 1400, gold: 900, acts: ['atk', 3, 'poison:0.5', 2, 'breath:sand:30:40', 2], rare: 1, size: 72 },
  yetiking: { name: '雪怪王 雷布', tpl: 'yeti', pal: { a: '#e0f0ff', b: '#3a6ad8' }, hp: 1900, atk: 104, def: 62, agi: 20, exp: 2600, gold: 1500, acts: ['atk', 3, 'atk2', 2, 'roar', 1, 'breath:ice:40:50', 1], res: { ice: 0, fire: 1.5 }, rare: 1, size: 72, twice: 0.3 },
  starwisp: { name: '星靈', tpl: 'wisp', pal: { a: '#b08aff', b: '#fff0a0' }, hp: 620, atk: 130, def: 84, agi: 64, exp: 760, gold: 300, acts: ['atk', 2, 'spell:thunder2', 2, 'spell:sleep', 1], res: { thunder: 0 } },
  voidknight: { name: '虛空騎士', tpl: 'knight', pal: { a: '#1a1a2a', b: '#2a3a5a', c: '#40e0ff', e: '#40e0ff' }, hp: 880, atk: 156, def: 112, agi: 40, exp: 920, gold: 360, acts: ['atk', 3, 'atk2', 2, 'defend', 1] },
  nighteye: { name: '夢魘之眼', tpl: 'eye', pal: { a: '#3a5ad8', b: '#1a1a4a' }, hp: 700, atk: 120, def: 80, agi: 56, exp: 860, gold: 380, acts: ['atk', 2, 'spell:seal', 1, 'spell:darkstorm2', 2, 'spell:sleep', 1] },
  chaoshound: { name: '混沌獸', tpl: 'wolf', pal: { a: '#4a2a6a', b: '#8a5ab8', e: '#ff40c0' }, art: { fire: 1 }, hp: 820, atk: 150, def: 86, agi: 62, exp: 900, gold: 340, acts: ['atk', 3, 'breath:dark:54:66', 2], twice: 0.4 },
  eclipse: { name: '星蝕龍 艾克里斯', tpl: 'dragon', boss: 1, pal: { a: '#2a2440', b: '#141024', c: '#f2c14e', d: '#ffe080', e: '#ff3040' }, art: {}, hp: 8200, atk: 164, def: 104, agi: 58, exp: 26000, gold: 9000, acts: ['atk', 3, 'breath:fire:66:80', 2, 'breath:dark:58:70', 2, 'roar', 1, 'atk2', 2], twice: 0.5 },
  mirrornox: { name: '鏡之黯王', tpl: 'demonbeast', boss: 1, pal: { a: '#c8d0e8', b: '#5a6a9a', c: '#40e0ff' }, hp: 9000, atk: 168, def: 112, agi: 66, exp: 50000, gold: 20000, acts: ['atk', 3, 'spell:darkstorm2', 2, 'breath:ice:66:80', 2, 'dispel', 1, 'roar', 1, 'atk2', 2], twice: 0.5 },
});
for (const k in MONS) MONS[k].id = k;
Object.assign(ESPELLS, {
  thunder2: { name: '雷鳴', el: 'thunder', tgt: 'all', pow: [74, 90], anim: 'bolt' },
  darkstorm2: { name: '黯黑風暴', el: 'dark', tgt: 'all', pow: [70, 84], anim: 'dark' },
});
Object.assign(ITEMS, {
  shard: { name: '星之碎片', kind: 'key', desc: '藏在世界各地、閃著星光的小碎片。白帆港的星之收藏家在收集它們。' },
  token: { name: '賭場代幣', kind: 'key', desc: '砂金城賭場的代幣。可以玩拉霸或換取獎品。' },
  lifefruit: { name: '生命果實', kind: 'seed', stat: 'hp', amt: 20, price: 0, sell: 500, tgt: 'ally', desc: '吃了以後最大 HP 永久 +20。' },
  magicfruit: { name: '魔力果實', kind: 'seed', stat: 'mp', amt: 10, price: 0, sell: 500, tgt: 'ally', desc: '吃了以後最大 MP 永久 +10。' },
  powerfruit: { name: '力量果實', kind: 'seed', stat: 'str', amt: 4, price: 0, sell: 500, tgt: 'ally', desc: '吃了以後力量永久 +4。' },
  swiftfruit: { name: '疾風果實', kind: 'seed', stat: 'agi', amt: 4, price: 0, sell: 500, tgt: 'ally', desc: '吃了以後速度永久 +4。' },
});
Object.assign(EQUIP, {
  starring: { name: '星之戒指', slot: 'x', def: 8, agi: 8, int: 8, price: 0, sell: 2000, who: 'HLMB' },
  angelwing: { name: '天使之翼', slot: 'x', atk: 10, def: 10, agi: 12, int: 12, price: 0, sell: 5000, who: 'HLMB' },
  hunterbadge: { name: '獵人徽章', slot: 'x', atk: 8, def: 6, agi: 6, price: 0, sell: 1500, who: 'HLMB' },
  luckybangle: { name: '幸運手環', slot: 'x', agi: 14, def: 4, price: 0, sell: 1200, who: 'HLMB' },
  starsword: { name: '星辰之劍', slot: 'w', atk: 92, int: 12, price: 0, sell: 6000, who: 'H' },
  staraxe: { name: '星爆戰斧', slot: 'w', atk: 94, price: 0, sell: 6000, who: 'B' },
  starrod: { name: '星光權杖', slot: 'w', atk: 40, int: 40, price: 0, sell: 6000, who: 'LM' },
  starrobe: { name: '星紗法衣', slot: 'a', def: 44, int: 14, price: 0, sell: 5000, who: 'LM' },
  starmail: { name: '星辰鎧', slot: 'a', def: 66, price: 0, sell: 6000, who: 'HB' },
});
ZONES.d6 = { lv: 38, mons: ['starwisp', 'voidknight', 'nighteye', 'chaoshound'], w: [3, 3, 3, 3], n: [1, 3], bg: 'star' };
const RARES = { z1: ['goldmush', 1 / 40], z2: ['kingrat', 1 / 36], z2s: ['kingrat', 1 / 36], z3: ['sandworm', 1 / 36], z4: ['yetiking', 1 / 36] };
LTH.star = { floor: ['#2a2458', '#221c4a', '#3a3270'], top: '#0a0818', face: ['#4a3a8a', '#2e2460', '#6a5ab0'], bricks: 1, liquid: 'abyss' };

// ───── 星之迴廊（通關後的迷宮） ─────
Object.assign(MAP_ROWS, {
  star1: [
    '####################',
    '#........#.........#',
    '#.c....C.#..c....>.#',
    '#........#.........#',
    '#...O.........O....#',
    '#........#.........#',
    '####.#####.#####.###',
    '#........#.........#',
    '#..C.....#.....c...#',
    '#..................#',
    '#...O....S......O..#',
    '#........#.........#',
    '##########E#########',
    '####################',
  ],
  star2: [
    '####################',
    '#######..>..########',
    '#######.....########',
    '#######.....########',
    '####...........#####',
    '####.O.......O.#####',
    '####...........#####',
    '#########.##########',
    '#.......#.#.......##',
    '#.C.....#.#.....C.##',
    '#.................##',
    '#....c...<....c...##',
    '##################.#',
    '####################',
  ],
  star3: [
    '####################',
    '#######..ZZ..#######',
    '#######..RR..#######',
    '######...RR...######',
    '######.O.RR.O.######',
    '######...RR...######',
    '#########RR#########',
    '#####....RR....#####',
    '#####.H..RR..S.#####',
    '#####....RR....#####',
    '#####....<.....#####',
    '####################',
  ],
});
Object.assign(MAPS, {
  star1: { kind: 'dungeon', theme: 'star', name: '星之迴廊 第一層', short: '星之迴廊', music: 'tower', enc: 'd6', entry: [10, 11, 'up'], world: [44, 8], exits: [{ x: 17, y: 2, to: 'star2', tx: 9, ty: 11 }], chests: { '7,2': { item: 'starring' }, '3,8': { item: 'lifefruit' } } },
  star2: { kind: 'dungeon', theme: 'star', name: '星之迴廊 第二層', short: '星之迴廊', music: 'tower', enc: 'd6', world: [44, 8], exits: [{ x: 9, y: 11, to: 'star1', tx: 17, ty: 3 }, { x: 9, y: 1, to: 'star3', tx: 9, ty: 10 }], chests: { '2,9': { item: 'starrobe' }, '16,9': { item: 'staraxe' } }, npcs: [{ x: 9, y: 3, mon: 'eclipse', scale: 2.2, if: () => !F('eclipse'), talk: () => bossEclipse() }] },
  star3: { kind: 'dungeon', theme: 'star', name: '星之迴廊 鏡之間', short: '星之迴廊', music: 'castle', enc: null, world: [44, 8], exits: [{ x: 9, y: 10, to: 'star2', tx: 9, ty: 2 }], npcs: [{ x: 9, y: 2, mon: 'mirrornox', scale: 2.3, if: () => !F('mirror'), talk: () => bossMirror() }, { x: 10, y: 2, spr: 'collector', if: () => F('mirror'), talk: () => UI.say('（鏡子裡映出了另一個你，微笑著揮了揮手。）', '鏡中的聲音：「謝謝你，鐘守。不管是光還是影子，都是你的一部分。」') }] },
});
async function bossEclipse() {
  await UI.say('星空的裂縫中盤踞著一條吞噬星光的黑龍。', '星蝕龍：「……又一個想要追逐光的小東西。」', '星蝕龍：「每一顆星星，終究都會被黑暗吞沒。來吧，讓我看看你們能亮多久！」');
  if (await S.boss(['eclipse'], { bg: 'star', music: 'final' })) {
    G.flags.eclipse = true;
    await UI.say('星蝕龍：「這光……竟然沒有熄滅……」', '星蝕龍化成無數星屑，照亮了迴廊。');
    await S.get('starsword', 1, '星屑凝結成一把劍。\n得到了星辰之劍！');
    Extra.check();
  }
}
async function bossMirror() {
  await UI.say('巨大的鏡子裡，映出的不是洛恩，而是黯王的身影。', '鏡之黯王：「我是你們心中的黑夜。只要有光，就會有影子。」', '鏡之黯王：「打倒我吧——如果你們真的不怕自己的影子。」');
  if (await S.boss(['mirrornox'], { bg: 'star', music: 'final' })) {
    G.flags.mirror = true;
    await UI.say('鏡子碎裂，化成一道柔和的光。');
    await S.get('angelwing', 1, '得到了天使之翼！');
    Extra.check();
  }
}

// ───── 星之碎片（隱藏寶物） ─────
const SHARDS = [['maple', 26, 19], ['port', 3, 22], ['sand', 28, 22], ['snow', 26, 20], ['cave1', 3, 11], ['tower2', 16, 15], ['mine1', 23, 6], ['tomb2', 2, 13], ['ice2', 19, 10], ['castle1', 7, 8], ['world', 1, 30], ['world', 60, 3]];
const SHARD_REWARDS = [[2, 'lifefruit'], [4, 'magicfruit'], [6, 'starring'], [8, 'powerfruit'], [10, 'swiftfruit'], [12, 'starrod']];

// ───── 成就 ─────
const ACHS = [
  ['first', '初陣', '贏得第一場戰鬥', () => G.battles >= 1],
  ['b100', '身經百戰', '戰鬥 100 次', () => G.battles >= 100],
  ['crit10', '一擊必殺', '打出 10 次會心一擊', () => (G.stat.crit || 0) >= 10],
  ['metal', '水晶獵人', '打倒水晶鼴', () => Extra.kills('cmole') > 0],
  ['gold', '黃金菇菇', '打倒黃金蹦蹦菇', () => Extra.kills('goldmush') > 0],
  ['rich', '大富翁', '同時擁有 10000 金幣', () => G.gold >= 10000],
  ['lv30', '老練冒險者', '主角達到 30 級', () => G.party[0].lv >= 30],
  ['lv50', '傳說的鐘守', '主角達到 50 級', () => G.party[0].lv >= 50],
  ['book25', '怪物學者', '圖鑑記錄 25 種怪物', () => Extra.bookCount() >= 25],
  ['bookall', '怪物博士', '圖鑑全部記錄', () => Extra.bookCount() >= Extra.bookList().length],
  ['side', '熱心助人', '完成 4 個原本的支線', () => ['cat_done', 'watch_done', 'herb_done', 'sword'].every(F)],
  ['bounty', '賞金獵人', '完成所有懸賞', () => ['kingrat', 'sandworm', 'yetiking'].every(k => Extra.kills(k) > 0)],
  ['shard6', '星星收集者', '找到 6 個星之碎片', () => Extra.shards() >= 6],
  ['shard12', '摘星者', '找到全部 12 個星之碎片', () => Extra.shards() >= 12],
  ['jackpot', '大獎！', '拉霸拉出三個 7', () => !!G.stat.jackpot],
  ['clear', '曉鐘再響', '打倒黯王，讓太陽升起', () => F('nox') || (G.ng || 0) > 0],
  ['hard', '不屈的鐘守', '以困難難度打倒黯王', () => F('nox') && G.diff === 'hard'],
  ['eclipse', '吞星者', '打倒星蝕龍', () => F('eclipse')],
  ['mirror', '直視影子', '打倒鏡之黯王', () => F('mirror')],
  ['ng', '輪迴之鐘', '開始二周目', () => (G.ng || 0) > 0],
];

const Extra = {
  migrate(g) {
    g.book = g.book || {}; g.ach = g.ach || {}; g.stat = g.stat || {}; g.ng = g.ng || 0;
    for (const m of g.party) m.bonus = m.bonus || {};
    if (g.ngParty) for (const k in g.ngParty) g.ngParty[k].bonus = g.ngParty[k].bonus || {};
    g.v = 2;
    return g;
  },
  kills(id) { return (G.book[id] && G.book[id].k) || 0; },
  bookList() { return Object.keys(MONS).filter(k => !['nox1', 'nox2'].includes(k) || true); },
  bookCount() { return Object.keys(G.book).filter(k => G.book[k].k > 0).length; },
  shards() { return SHARDS.filter(([m, x, y]) => F(`s:${m}:${x},${y}`)).length; },
  seen(B) { for (const e of B.enemies) { const b = G.book[e.id] || (G.book[e.id] = { s: 0, k: 0 }); b.s++; } },
  won(B, rw) {
    for (const e of B.enemies) if (!e.alive && !e.fled) { const b = G.book[e.id] || (G.book[e.id] = { s: 1, k: 0 }); b.k++; }
    this.check();
  },
  check() {
    if (!G) return;
    for (const [id, name] of ACHS) {
      if (G.ach[id]) continue;
      let ok = false; try { ok = ACHS.find(a => a[0] === id)[3](); } catch (e) { ok = false; }
      if (ok) { G.ach[id] = Math.floor(G.time); UI.toast('🏆 成就解鎖：' + name, 3.2); Snd.play('chest'); }
    }
  },
  // 稀有怪物
  rare(z) { const r = RARES[z]; if (r && Math.random() < r[1]) return [r[0]]; return null; },
  ngMult() { const n = (G && G.ng) || 0; return { hp: 1 + n * 0.5, atk: 1 + n * 0.25, exp: 1 + n * 0.3 }; },
};

// 讓 Party.stats 計入果實的永久加成
{
  const base0 = Party.base.bind(Party);
  Party.base = function (m, k) { return base0(m, k) + ((m.bonus && m.bonus[k]) || 0); };
}

// ───── 怪物圖鑑 ─────
function bookMenu() {
  const list = Extra.bookList();
  let i = 0;
  return new Promise(res => {
    const lay = { modal: true };
    lay.update = () => {
      const d = Input.dirPress;
      if (d === 'right' || d === 'down') { i = (i + 1) % list.length; Snd.play('cursor'); }
      if (d === 'left' || d === 'up') { i = (i - 1 + list.length) % list.length; Snd.play('cursor'); }
      if (Input.pressed.ok || Input.pressed.cancel) { UI.remove(lay); Snd.play('cancel'); res(); }
    };
    lay.draw = g => {
      const fs = L.FS, pad = L.pad, V = L.V;
      const w = Math.min(V.w - pad * 2, fs * 30), h = Math.min(V.h - pad * 2, fs * 20), x = V.x + (V.w - w) / 2, y = V.y + (V.h - h) / 2;
      UI.win(g, x, y, w, h);
      const id = list[i], m = MONS[id], b = G.book[id] || { s: 0, k: 0 }, known = b.s > 0;
      UI.text(g, `怪物圖鑑　${Extra.bookCount()} / ${list.length}`, x + pad * 1.4, y + pad, '#ffd76a', fs * 0.9, 'left', 'top', 700);
      UI.text(g, `◀ No.${String(i + 1).padStart(2, '0')} ▶`, x + w - pad * 1.4, y + pad, '#9aa6d8', fs * 0.85, 'right', 'top');
      const art = MonArt.get(m), as = Math.min(h * 0.55, w * (w > fs * 22 ? 0.4 : 0.8));
      const ax = x + pad * 1.5, ay = y + fs * 2.2;
      g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, ax, ay, as, as, fs * 0.3); g.fill();
      g.imageSmoothingEnabled = false;
      g.save(); g.globalAlpha = known ? 1 : 0.5; g.drawImage(known ? art.img : tinted(art.img, 'black'), ax + as * 0.06, ay + as * 0.06, as * 0.88, as * 0.88); g.restore();
      const side = w > fs * 22, tx = side ? ax + as + pad * 1.5 : ax, ty = side ? ay : ay + as + pad;
      UI.text(g, known ? m.name : '？？？', tx, ty, m.boss ? '#ff9a9a' : m.rare ? '#ffe070' : '#fff', fs * 1.15, 'left', 'top', 900);
      if (known) {
        const rows = [['HP', m.hp], ['攻擊', m.atk], ['防禦', m.def], ['速度', m.agi], ['經驗值', m.exp], ['金幣', m.gold], ['打倒次數', b.k]];
        rows.forEach(([a, v], j) => { const c = j % 2, r = (j / 2) | 0; UI.text(g, a, tx + c * fs * 7, ty + fs * 1.8 + r * fs * 1.35, '#9aa6d8', fs * 0.82); UI.text(g, b.k > 0 || j >= 6 ? String(v) : '？', tx + c * fs * 7 + fs * 6, ty + fs * 1.8 + r * fs * 1.35, '#fff', fs * 0.88, 'right', 'top', 700); });
        const res = m.res || {}, EL = { fire: '火', ice: '冰', thunder: '雷', holy: '光' };
        const weak = Object.keys(res).filter(k => res[k] > 1).map(k => EL[k]).filter(Boolean), resist = Object.keys(res).filter(k => res[k] < 1).map(k => EL[k] + (res[k] === 0 ? '（無效）' : '')).filter(Boolean);
        const info = (b.k > 0 ? `弱點：${weak.join('、') || '無'}　抗性：${resist.join('、') || '無'}` : '打倒後可以看到更多情報。') + (m.boss ? '　【頭目】' : m.rare ? '　【稀有】' : '') + (m.undead ? '　【不死】' : '');
        UI.wrap(g, info, (side ? x + w - tx - pad : w - pad * 3), fs * 0.8).forEach((ln, j) => UI.text(g, ln, tx, ty + fs * 7.4 + j * fs * 1.2, '#cfe0ff', fs * 0.8));
      } else UI.text(g, '還沒遇見過。', tx, ty + fs * 1.8, '#7a7f9a', fs * 0.88);
      UI.hit(x, y, w / 2, h, () => { i = (i - 1 + list.length) % list.length; Snd.play('cursor'); });
      UI.hit(x + w / 2, y, w / 2, h * 0.8, () => { i = (i + 1) % list.length; Snd.play('cursor'); });
      UI.hit(x + w / 2, y + h * 0.8, w / 2, h * 0.2, () => { UI.remove(lay); res(); });
      UI.text(g, '左右切換　點右下角關閉', x + w - pad * 1.4, y + h - pad - fs * 0.8, '#7a7f9a', fs * 0.72, 'right', 'top');
    };
    UI.push(lay);
  });
}
// ───── 成就清單 ─────
function achMenu() {
  return new Promise(res => {
    let scroll = 0;
    const lay = { modal: true };
    lay.update = () => {
      if (Input.dirPress === 'down') scroll++; if (Input.dirPress === 'up') scroll = Math.max(0, scroll - 1);
      if (Input.pressed.ok || Input.pressed.cancel || lay.tap) { UI.remove(lay); Snd.play('cancel'); res(); }
    };
    lay.draw = g => {
      const fs = L.FS, pad = L.pad, V = L.V;
      const w = Math.min(V.w - pad * 2, fs * 28), h = V.h - pad * 2, x = V.x + (V.w - w) / 2, y = V.y + pad;
      UI.win(g, x, y, w, h);
      const n = ACHS.filter(a => G.ach[a[0]]).length;
      UI.text(g, `成就　${n} / ${ACHS.length}`, x + pad * 1.4, y + pad, '#ffd76a', fs * 0.95, 'left', 'top', 700);
      const rh = fs * 2.3, vis = Math.floor((h - fs * 2.6) / rh); scroll = Math.min(scroll, Math.max(0, ACHS.length - vis));
      ACHS.slice(scroll, scroll + vis).forEach((a, j) => {
        const got = !!G.ach[a[0]], yy = y + fs * 2.3 + j * rh;
        g.fillStyle = got ? 'rgba(255,215,106,.12)' : 'rgba(0,0,0,.2)'; rr(g, x + pad, yy, w - pad * 2, rh - fs * 0.25, fs * 0.25); g.fill();
        UI.text(g, got ? '★' : '☆', x + pad * 1.8, yy + rh * 0.42, got ? '#ffd76a' : '#5a6080', fs * 1.1, 'left', 'middle', 900);
        UI.text(g, a[1], x + pad * 1.8 + fs * 1.6, yy + rh * 0.28, got ? '#fff' : '#8a90b0', fs * 0.9, 'left', 'middle', 700);
        UI.text(g, a[2], x + pad * 1.8 + fs * 1.6, yy + rh * 0.65, got ? '#cfe0ff' : '#6a7090', fs * 0.72, 'left', 'middle');
      });
      if (scroll + vis < ACHS.length) UI.cursor(g, x + w / 2, y + h - pad * 0.8, fs * 0.7, 'down');
      UI.hit(x, y, w, h, () => { lay.tap = true; });
    };
    UI.push(lay);
  });
}

// ───── 星之收藏家 ─────
async function collectorTalk() {
  const n = Extra.shards(), got = G.flags.shardgot || 0;
  await UI.say('星之收藏家：「呵呵……你身上有星星的味道。」', '星之收藏家：「世界各地藏著 12 個「星之碎片」。走近的時候，地上會一閃一閃的。」');
  let gave = false;
  for (const [need, item] of SHARD_REWARDS) {
    if (n >= need && got < need) { G.flags.shardgot = need; gave = true; await S.get(item, 1, `星之收藏家：「${need} 個碎片！這是給你的獎勵。」\n得到了${itemInfo(item).name}！`); }
  }
  const nx = SHARD_REWARDS.find(([need]) => need > (G.flags.shardgot || 0));
  await UI.say(`（目前找到 ${n} / 12 個碎片。）` + (nx ? `\n星之收藏家：「集滿 ${nx[0]} 個，我就送你${itemInfo(nx[1]).name}。」` : '\n星之收藏家：「全部集齊了！你真是了不起的摘星者。」'));
  if (!gave) Extra.check();
}
function shardAt(map, x, y) { return SHARDS.find(s => s[0] === map && s[1] === x && s[2] === y && !F(`s:${map}:${x},${y}`)); }
async function pickShard(s) {
  G.flags[`s:${s[0]}:${s[1]},${s[2]}`] = true; Bag.add('shard', 0);
  Snd.play('holy'); Game.flashWhite = 0.4;
  await S.get('shard', 0, `地上有什麼東西在發光……\n得到了星之碎片！（${Extra.shards()} / 12）`);
  delete G.items.shard;
  Extra.check();
}

// ───── 懸賞 ─────
async function bountyTalk() {
  const list = [['kingrat', '鼠王 吱吱大帝', '楓葉村到白帆港一帶的草原', 800, 'herb2'], ['sandworm', '沙漠巨蟒', '東方大陸的沙漠', 2000, 'ether'], ['yetiking', '雪怪王 雷布', '北方的雪原', 4000, 'hunterbadge']];
  await UI.say('懸賞官：「這裡是冒險者懸賞處。最近有幾隻罕見的大傢伙在外面作亂。」');
  for (const [id, name, where, gold, item] of list) {
    const k = 'bounty_' + id;
    if (G.flags[k]) continue;
    if (Extra.kills(id) > 0) { G.flags[k] = true; G.gold += gold; Snd.play('coin'); await S.get(item, 1, `懸賞官：「你打倒了${name}！這是賞金 ${gold} 金幣，還有這個。」\n得到了${itemInfo(item).name}！`); }
    else await UI.say(`懸賞官：「目標：${name}。出沒在${where}，很少出現，遇到了可別放過！」`);
  }
  if (list.every(l => G.flags['bounty_' + l[0]])) await UI.say('懸賞官：「所有懸賞都完成了！你是港口最有名的賞金獵人。」');
  Extra.check();
}

// ───── 賭場：幸運拉霸 ─────
const SLOT_SYM = ['7', 'bell', 'star', 'cherry', 'mush', 'stone'];
const SLOT_PAY = { '7': 100, bell: 30, star: 20, cherry: 8, mush: 5, stone: 12 };
function slotIcon(k) {
  return LSpr.get('slot' + k, 16, 16, p => {
    switch (k) {
      case '7': for (let x = 3; x < 13; x++) p.P(x, 3, '#ff3a4a'); p.R(3, 3, 10, 2, '#ff3a4a'); for (let i = 0; i < 9; i++) p.R(11 - i * 0.7, 5 + i, 3, 1, '#d02030'); p.R(3, 3, 10, 1, '#ffb0b0'); break;
      case 'bell': p.E(8, 8, 5, 5.5, (x, y) => (y > 12 ? null : y < 6 ? '#fff0a0' : '#f2c14e')); p.R(3, 12, 10, 2, '#d8a030'); p.R(7, 14, 2, 1, '#8a6a20'); p.R(7, 1, 2, 2, '#c08020'); break;
      case 'star': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const dx = x - 7.5, dy = y - 8, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy), R = 4 + 3.5 * Math.pow(Math.abs(Math.cos(a * 2.5 + 0.3)), 3); if (r < R) p.P(x, y, r < R - 2 ? '#ffe880' : '#f0b020'); } break;
      case 'cherry': p.E(5, 11, 3, 3, '#e83040'); p.E(11, 11, 3, 3, '#e83040'); p.P(4, 10, '#ffb0b0'); p.P(10, 10, '#ffb0b0'); p.L(5, 8, 9, 2, '#3a8a3a'); p.L(11, 8, 9, 2, '#3a8a3a'); p.R(9, 1, 4, 2, '#4aa850'); break;
      case 'mush': p.E(8, 7, 6, 4.5, (x, y) => (y > 8 ? null : '#e0503a')); p.R(5, 9, 6, 5, '#f6e6c6'); p.P(5, 5, '#ffffff'); p.P(10, 4, '#ffffff'); p.P(6, 11, '#1a1020'); p.P(9, 11, '#1a1020'); break;
      case 'stone': p.E(8, 8, 5, 6, (x, y, nx, ny) => (nx + ny < -0.5 ? '#c8f0ff' : nx + ny > 0.6 ? '#3a7ad8' : '#7ac0f0')); p.P(6, 5, '#ffffff'); break;
    }
  });
}
async function casino() {
  const tokens = () => G.items.token || 0;
  await UI.say('賭場老闆：「歡迎來到砂金城的「黃金沙漏」賭場！」', '賭場老闆：「代幣一枚 20 金幣。拉霸三個一樣就中獎，三個 7 是大獎喔！」');
  for (;;) {
    const i = await UI.menu({ items: [{ t: '玩拉霸', r: `代幣 ${tokens()}` }, { t: '買代幣', r: '20G' }, { t: '兌換獎品' }, { t: '離開' }], pos: mpos(), title: '黃金沙漏賭場' });
    if (i < 0 || i === 3) break;
    if (i === 1) { const max = Math.floor(G.gold / 20); if (!max) { await UI.say('金幣不夠喔。'); continue; } const n = await qtyPick('代幣', 20); if (n) { G.gold -= n * 20; G.items.token = tokens() + n; Snd.play('buy'); await UI.say(`買了 ${n} 枚代幣。`); } }
    if (i === 0) { if (!tokens()) { await UI.say('沒有代幣了。'); continue; } await slotMachine(); }
    if (i === 2) {
      const prizes = [['ether', 60], ['elixir', 150], ['luckybangle', 600], ['powerfruit', 900], ['lifefruit', 900], ['starmail', 3000]];
      const k = await UI.menu({ items: prizes.map(([id, c]) => ({ t: itemInfo(id).name, r: c + '枚', dis: tokens() < c })), title: `兌換獎品（代幣 ${tokens()}）`, pos: mpos(L.FS * 3, L.FS * 2), allowDis: true });
      if (k < 0) continue;
      const [id, c] = prizes[k];
      if (tokens() < c) { await UI.say('代幣不夠喔。'); continue; }
      if (await UI.yesno(`要用 ${c} 枚代幣兌換${itemInfo(id).name}嗎？`)) { G.items.token -= c; Bag.add(id); Music.jingle('item'); await UI.say(`換到了${itemInfo(id).name}！`); }
    }
  }
  await UI.say('賭場老闆：「祝你好運！」');
}
function slotMachine() {
  return new Promise(res => {
    const reels = [0, 1, 2].map(() => ({ pos: Math.random() * 6, spin: false, v: 0, stop: null }));
    let bet = 1, state = 'idle', msg = '按 A 投入代幣開始！', win = 0, t = 0, glowT = 0;
    const strip = [0, 3, 2, 4, 1, 5, 3, 4, 2, 0, 5, 4, 1, 3, 4, 2].map(i => SLOT_SYM[i]);
    const lay = { modal: true };
    const start = () => {
      const tk = G.items.token || 0; if (tk < bet) { msg = '代幣不夠！'; Snd.play('bump'); return; }
      G.items.token = tk - bet; state = 'spin'; win = 0; msg = '按 A 停止轉輪'; Snd.play('ok');
      for (const r of reels) { r.spin = true; r.v = 22 + Math.random() * 6; r.stop = null; }
    };
    const stopNext = () => { const r = reels.find(r => r.spin && r.stop === null); if (r) { r.stop = Math.ceil(r.pos) + 2; Snd.play('cursor'); } };
    const judge = () => {
      const s = reels.map(r => strip[((Math.round(r.pos) % strip.length) + strip.length) % strip.length]);
      if (s[0] === s[1] && s[1] === s[2]) { win = SLOT_PAY[s[0]] * bet; if (s[0] === '7') { G.stat.jackpot = 1; Extra.check(); } Music.jingle(s[0] === '7' ? 'levelup' : 'item'); glowT = 2; msg = s[0] === '7' ? `大獎！！得到 ${win} 枚代幣！` : `中獎！得到 ${win} 枚代幣！`; }
      else if (s[0] === s[1] || s[1] === s[2]) { win = bet; Snd.play('coin'); msg = `兩個一樣，退回 ${win} 枚。`; }
      else { msg = '可惜……再試一次？'; Snd.play('cancel'); }
      G.items.token = (G.items.token || 0) + win; state = 'idle';
    };
    lay.update = dt => {
      t += dt; glowT = Math.max(0, glowT - dt);
      for (const r of reels) if (r.spin) {
        r.pos += r.v * dt;
        if (r.stop !== null && r.pos >= r.stop) { r.pos = r.stop; r.spin = false; Snd.play('hit'); if (!reels.some(q => q.spin)) judge(); }
      }
      if (window.__autoMsg) { UI.remove(lay); res(); return; }
      if (state === 'idle') {
        if (Input.dirPress === 'up' || Input.dirPress === 'right') { bet = bet === 1 ? 3 : bet === 3 ? 5 : 1; Snd.play('cursor'); }
        if (Input.dirPress === 'down' || Input.dirPress === 'left') { bet = bet === 5 ? 3 : bet === 3 ? 1 : 5; Snd.play('cursor'); }
        if (Input.pressed.ok || lay.tapA) { lay.tapA = false; start(); }
        if (Input.pressed.cancel || lay.tapB) { UI.remove(lay); Snd.play('cancel'); res(); }
      } else if (Input.pressed.ok || lay.tapA) { lay.tapA = false; stopNext(); }
    };
    lay.draw = g => {
      const fs = L.FS, pad = L.pad, V = L.V;
      const w = Math.min(V.w - pad * 2, fs * 22), h = Math.min(V.h - pad * 2, fs * 19), x = V.x + (V.w - w) / 2, y = V.y + (V.h - h) / 2;
      UI.win(g, x, y, w, h, { glow: glowT > 0 });
      UI.banner(g, '幸運拉霸', x + w / 2, y, fs);
      const rw = (w - pad * 6) / 3, rh = Math.min(rw * 1.4, h - fs * 9.6), ry = y + fs * 1.9;
      reels.forEach((r, k) => {
        const rx = x + pad * 2 + k * (rw + pad);
        g.fillStyle = '#f8f0e0'; rr(g, rx, ry, rw, rh, fs * 0.3); g.fill();
        g.save(); rr(g, rx, ry, rw, rh, fs * 0.3); g.clip();
        const ic = rw * 0.7, step = rh / 2;
        for (let j = -2; j <= 2; j++) {
          const idx = Math.floor(r.pos) + j, frac = r.pos - Math.floor(r.pos);
          const sym = strip[((idx % strip.length) + strip.length) % strip.length];
          const cy = ry + rh / 2 + (j - frac) * step;
          g.imageSmoothingEnabled = false; g.drawImage(slotIcon(sym), rx + (rw - ic) / 2, cy - ic / 2, ic, ic);
        }
        const gr = g.createLinearGradient(0, ry, 0, ry + rh); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
        g.restore();
        g.strokeStyle = '#c8a040'; g.lineWidth = fs * 0.12; rr(g, rx, ry, rw, rh, fs * 0.3); g.stroke();
      });
      g.strokeStyle = glowT > 0 && Math.sin(t * 20) > 0 ? '#ffffff' : '#ff4a5a'; g.lineWidth = fs * 0.1; g.beginPath(); g.moveTo(x + pad, ry + rh / 2); g.lineTo(x + w - pad, ry + rh / 2); g.stroke();
      const by = ry + rh + pad;
      UI.text(g, `代幣 ${G.items.token || 0}`, x + pad * 2, by, '#ffe9a8', fs, 'left', 'top', 700);
      UI.text(g, `押注 ◀ ${bet} ▶`, x + w - pad * 2, by, '#bfe8ff', fs, 'right', 'top', 700);
      UI.text(g, msg, x + w / 2, by + fs * 1.7, '#fff', fs * 0.9, 'center', 'top', 700);
      UI.text(g, '7=100倍　鐘=30　星=20　石=12　櫻桃=8　菇=5', x + w / 2, by + fs * 3.1, '#9aa6d8', fs * 0.7, 'center', 'top');
      const bw = (w - pad * 5) / 2, bh = fs * 2, bty = y + h - bh - pad;
      UI.win(g, x + pad * 2, bty, bw, bh, { border: '#ffd76a' }); UI.text(g, state === 'spin' ? '停止' : '拉！', x + pad * 2 + bw / 2, bty + bh / 2, '#ffe070', fs, 'center', 'middle', 900);
      UI.win(g, x + pad * 3 + bw, bty, bw, bh); UI.text(g, '離開', x + pad * 3 + bw * 1.5, bty + bh / 2, '#fff', fs, 'center', 'middle', 700);
      UI.hit(x + pad * 2, bty, bw, bh, () => { lay.tapA = true; });
      UI.hit(x + pad * 3 + bw, bty, bw, bh, () => { if (state === 'idle') lay.tapB = true; });
      UI.hit(x + w * 0.6, by - fs * 0.3, w * 0.4, fs * 1.6, () => { if (state === 'idle') { bet = bet === 1 ? 3 : bet === 3 ? 5 : 1; Snd.play('cursor'); } });
    };
    UI.push(lay);
  });
}

// ───── 二周目 ─────
async function startNGPlus() {
  if (!await UI.yesno('曉鐘的聲音在心中迴盪……要帶著現在的力量，從頭開始新的旅程嗎？（二周目：敵人更強，獎勵更多）')) return;
  const old = G, n = (old.ng || 0) + 1;
  const g = newGameState(old.diff);
  const hero = JSON.parse(JSON.stringify(old.party.find(m => m.id === 'hero')));
  g.party = [hero];
  g.ngParty = {}; for (const m of old.party) if (m.id !== 'hero') g.ngParty[m.id] = JSON.parse(JSON.stringify(m));
  g.items = {}; for (const k in old.items) if (!ITEMS[k] || ITEMS[k].kind !== 'key' || k === 'token') g.items[k] = old.items[k];
  g.gold = old.gold; g.book = old.book; g.ach = old.ach; g.stat = old.stat; g.ng = n; g.battles = old.battles; g.time = old.time;
  for (const k in old.flags) if (k.startsWith('s:') || k === 'shardgot' || k.startsWith('bounty_')) g.flags[k] = old.flags[k];
  g.slot = old.slot;
  for (const m of [hero, ...Object.values(g.ngParty)]) { const s = Party.stats(m); m.hp = s.mhp; m.mp = s.mmp; m.st = {}; }
  Extra.migrate(g);
  await Game.fadeOut(1);
  G = g;
  Field.load('maple', 4, 3, 'left', { quiet: true });
  Extra.check();
  Game.save(G.slot);
}

// 掛勾到既有系統
{
  // 野外互動：撿起星之碎片
  const interact0 = Field.interact.bind(Field);
  Field.interact = function () {
    const p = this.leader(), [dx, dy] = DIRS[p.dir];
    const s = shardAt(this.id, p.x, p.y) || shardAt(this.id, p.x + dx, p.y + dy);
    if (s) { this.run(() => pickShard(s)); return; }
    const c = this.tile(p.x + dx, p.y + dy);
    if (c === 'Q' && F('nox') && this.id === 'maple') { this.run(async () => { await UI.say('曉鐘閃耀著五顆音石的光芒。'); await startNGPlus(); }); return; }
    return interact0();
  };
  // 稀有怪物出現
  const roll0 = rollFormation;
  window.rollFormationRare = (Z, z) => Extra.rare(z) || roll0(Z);
  // 二周目敵人加強
  const create0 = Battle.create.bind(Battle);
  Battle.create = function (ids, o) {
    const B = create0(ids, o), m = Extra.ngMult();
    if (m.hp > 1) for (const e of B.enemies) { e.hp = e.mhp = Math.round(e.mhp * m.hp); }
    return B;
  };
  const add0 = Battle.addEnemy.bind(Battle);
  Battle.addEnemy = function (B, id) { const e = add0(B, id), m = Extra.ngMult(); if (m.hp > 1 && B.round > 0) e.hp = e.mhp = Math.round(e.mhp * m.hp); return e; };
  const estat0 = Battle.estat.bind(Battle);
  Battle.estat = function (e) { const s = estat0(e), m = Extra.ngMult(); if (m.atk > 1) s.atk *= m.atk; return s; };
  const rw0 = Battle.rewards.bind(Battle);
  Battle.rewards = function (B) { const r = rw0(B), m = Extra.ngMult(); r.exp = Math.round(r.exp * m.exp); r.gold = Math.round(r.gold * m.exp); if (B.enemies.some(e => e.m.rare && !e.alive && !e.fled)) r.drops.push(pick(['lifefruit', 'magicfruit', 'powerfruit', 'swiftfruit'])); return r; };
  // 會心一擊次數
  const hurtE0 = Battle.hurtE.bind(Battle);
  Battle.hurtE = function (B, e, n, ev, opt = {}) { if (opt.crit && G && G.stat) G.stat.crit = (G.stat.crit || 0) + 1; return hurtE0(B, e, n, ev, opt); };
  // 二周目夥伴保留原本的等級與裝備
  const join0 = S.join.bind(S);
  S.join = async function (id) {
    if (G.ngParty && G.ngParty[id]) {
      const m = G.ngParty[id]; delete G.ngParty[id];
      const s = Party.stats(m); m.hp = s.mhp; m.mp = s.mmp;
      G.party.push(m);
      const L0 = Field.leader(); Field.party.push({ x: L0.x, y: L0.y, fx: L0.x, fy: L0.y, dir: L0.dir, t: 1 });
      Music.jingle('join'); await UI.say(`${CHARS[id].name}加入了隊伍！（保留了上一輪的力量）`);
      return;
    }
    return join0(id);
  };
  // 果實：在野外使用
  const use0 = fieldUseItem;
  window.fieldUseItemX = async (id, user) => {
    const it = ITEMS[id];
    if (it && it.kind === 'seed') {
      const t = await pickMember('給誰吃？'); if (!t) return false;
      Bag.remove(id); t.bonus = t.bonus || {}; t.bonus[it.stat] = (t.bonus[it.stat] || 0) + it.amt;
      Snd.play('heal'); await UI.say(`${Party.name(t)}吃下了${it.name}！\n${{ hp: '最大 HP', mp: '最大 MP', str: '力量', agi: '速度' }[it.stat]}提升了 ${it.amt}！`);
      return true;
    }
    return use0(id, user);
  };
}
// NPC
MAPS.port.npcs.push({ x: 22, y: 10, spr: 'collector', dir: 'down', talk: collectorTalk }, { x: 8, y: 10, spr: 'soldier', dir: 'down', talk: bountyTalk });
MAPS.sand.npcs.push({ x: 21, y: 15, spr: 'gambler', dir: 'down', talk: casino });
MAPS.snow.npcs.push({ x: 19, y: 19, spr: 'bard', wander: 1, talk: () => UI.say('吟遊詩人：「聽說，星之祭壇在黯王倒下以後，會指向星空的另一端……」', '吟遊詩人：「世界各地也藏著會發光的星之碎片。白帆港有個怪人在收集呢。」') });
MAPS.maple.npcs.push({ x: 12, y: 8, spr: 'scholar', dir: 'down', if: () => true, talk: () => UI.say(`研究員：「我在研究這片大陸的魔物。打開選單裡的「手冊」，就能看到你的怪物圖鑑喔。」`, `研究員：「目前你記錄了 ${Extra.bookCount()} 種。全部記錄的話一定很了不起！」`) });
for (const k of ['lifefruit', 'magicfruit', 'powerfruit', 'swiftfruit']) ITEMS[k].nobattle = 1;
// 星之祭壇：通關後通往星之迴廊
{
  const altar0 = altarEvent;
  altarEvent = async function () {
    if (F('nox')) {
      await UI.say('四顆音石的光從祭壇射向夜空，一道星光階梯出現了。');
      if (await UI.yesno('要沿著星光階梯，前往「星之迴廊」嗎？')) { Snd.play('warp'); await Game.go('star1', 10, 11, 'up', { from: 'world' }); }
      return;
    }
    return altar0();
  };
}
