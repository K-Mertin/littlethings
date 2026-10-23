'use strict';
// 深淵地牢：遊戲資料（地形、生態區、職業、怪物、道具、天賦）

// ---------- 地形 ----------
const T = { WALL: 0, FLOOR: 1, DOOR: 2, ODOOR: 3, SECRET: 4, STAIRS: 5, WATER: 6, LAVA: 7, GRASS: 8, FOUNTAIN: 9, RUBBLE: 10, PILLAR: 11, CARPET: 12, CRYSTAL: 13, BRIDGE: 14, DRYFOUNT: 15, ASH: 16, ICE: 17 };
const TP = [];
TP[T.WALL] = { walk: 0, op: 1, n: '石牆' };
TP[T.FLOOR] = { walk: 1, op: 0, n: '地板' };
TP[T.DOOR] = { walk: 1, op: 1, n: '木門', door: 1 };
TP[T.ODOOR] = { walk: 1, op: 0, n: '敞開的門', door: 1 };
TP[T.SECRET] = { walk: 0, op: 1, n: '石牆' };
TP[T.STAIRS] = { walk: 1, op: 0, n: '往下的樓梯' };
TP[T.WATER] = { walk: 1, op: 0, n: '淺水', liquid: 1 };
TP[T.LAVA] = { walk: 1, op: 0, n: '岩漿', liquid: 1, hurt: 1 };
TP[T.GRASS] = { walk: 1, op: 1, n: '高草', burn: 1 };
TP[T.FOUNTAIN] = { walk: 0, op: 0, n: '神秘泉水' };
TP[T.RUBBLE] = { walk: 1, op: 0, n: '碎石' };
TP[T.PILLAR] = { walk: 0, op: 1, n: '石柱' };
TP[T.CARPET] = { walk: 1, op: 0, n: '商店地毯' };
TP[T.CRYSTAL] = { walk: 0, op: 1, n: '冰晶' };
TP[T.BRIDGE] = { walk: 1, op: 0, n: '石橋' };
TP[T.DRYFOUNT] = { walk: 0, op: 0, n: '乾涸的泉水' };
TP[T.ASH] = { walk: 1, op: 0, n: '灰燼' };
TP[T.ICE] = { walk: 1, op: 0, n: '冰面' };

// ---------- 生態區 ----------
const BIOMES = [
  { n: '青苔地窖', en: 'MOSSY CELLAR', from: 1, to: 4, gen: 'rooms', flavor: '潮濕的石牆上長滿青苔，遠處傳來老鼠的吱吱聲。',
    pal: { bg: '#0b0a10', floor: '#4f5363', floor2: '#474b5a', line: '#3d4050', wall: '#2c2636', wallHi: '#4a4057', face: '#3a3247', faceLo: '#251f2e', deco: '#6aa85a', deco2: '#93cf6e', light: '#ffb560', water: '#2f6f8f', grass: '#4f8a3c' } },
  { n: '菇菌洞窟', en: 'FUNGAL GROTTO', from: 5, to: 8, gen: 'caves', flavor: '巨大的發光蘑菇照亮了潮濕的洞窟，空氣中飄著孢子。',
    pal: { bg: '#090a12', floor: '#3b3f52', floor2: '#35384a', line: '#2c2f40', wall: '#23233a', wallHi: '#3f3d62', face: '#2f2d4c', faceLo: '#1b1a2e', deco: '#b98cff', deco2: '#5fe0d0', light: '#b48cff', water: '#2a5f86', grass: '#3f7d6a' } },
  { n: '熔岩鍛爐', en: 'MAGMA FORGE', from: 9, to: 12, gen: 'lava', flavor: '灼熱的空氣讓人喘不過氣，岩漿在古老的鍛爐間流動。',
    pal: { bg: '#100806', floor: '#564240', floor2: '#4c3a38', line: '#3c2c2a', wall: '#2e1d1b', wallHi: '#5a3a33', face: '#432a25', faceLo: '#241412', deco: '#ff7a3a', deco2: '#ffc06a', light: '#ff8a3d', water: '#2f5f7f', grass: '#6b5a2a' } },
  { n: '冰晶神殿', en: 'CRYSTAL TEMPLE', from: 13, to: 16, gen: 'mixed', flavor: '寒氣刺骨，冰晶柱折射出幽藍的光芒。',
    pal: { bg: '#060b12', floor: '#4d6378', floor2: '#455a6e', line: '#3a4d60', wall: '#22344a', wallHi: '#4d6f91', face: '#2f4763', faceLo: '#182638', deco: '#8fe8ff', deco2: '#e4fbff', light: '#7fd8ff', water: '#3b7fb0', grass: '#5d8a8a' } },
  { n: '深淵王座', en: 'ABYSS THRONE', from: 17, to: 17, gen: 'arena', flavor: '一切光芒都被黑暗吞噬。深淵之王就在前方。',
    pal: { bg: '#07040c', floor: '#3b2f4a', floor2: '#342a42', line: '#281f34', wall: '#1d1428', wallHi: '#45305e', face: '#2d1f3e', faceLo: '#140d1e', deco: '#d05cff', deco2: '#ff6fb0', light: '#c060ff', water: '#3a2f7a', grass: '#4a3a5a' } },
];
const LAST_FLOOR = 17;
function biomeOf(depth) { for (let i = 0; i < BIOMES.length; i++) if (depth <= BIOMES[i].to) return i; return BIOMES.length - 1; }

// ---------- 職業與技能 ----------
const ABIL = {
  whirl: { n: '旋風斬', cd: 9, tgt: 'none', d: '攻擊身邊所有敵人，傷害 ×1.2。' },
  charge: { n: '衝鋒', cd: 13, tgt: 'enemy', range: 6, line: 1, d: '直線衝向 6 格內的敵人，重擊 ×1.5 並使其暈眩 2 回合。' },
  stealth: { n: '暗影潛行', cd: 22, tgt: 'none', d: '隱身 10 回合，怪物會失去你的蹤跡；下一擊必定偷襲。' },
  step: { n: '暗影步', cd: 12, tgt: 'tile', range: 6, d: '瞬間移動到視線內 6 格以內的空地。' },
  missile: { n: '魔法飛彈', cd: 2, tgt: 'enemy', range: 8, d: '射出必中的魔法飛彈，傷害隨等級成長。' },
  nova: { n: '冰霜新星', cd: 16, tgt: 'none', d: '冰凍 2 格內所有敵人 4 回合，並造成冰霜傷害。' },
  aim: { n: '精準射擊', cd: 2, tgt: 'enemy', range: 8, d: '用弓射擊遠方的敵人，命中很高。' },
  haste: { n: '疾風步', cd: 24, tgt: 'none', d: '加速 6 回合，動作變成兩倍快。' },
  heal: { n: '聖光治癒', cd: 28, tgt: 'none', d: '回復 45% 最大 HP，並解除中毒與燃燒。' },
  smite: { n: '制裁', cd: 9, tgt: 'enemy', range: 1, d: '對相鄰敵人必中的聖光一擊 ×2，暈眩 2 回合；對亡靈 ×3。' },
};
const CLASSES = {
  warrior: { n: '戰士', en: 'WARRIOR', spr: 'warrior', hp: 34, lvHp: 7, acc: 2, eva: 0, str: 1, abil: ['whirl', 'charge'], col: '#ff7a59',
    start: [['longsword', 1], ['leather', 1], ['ration', 1]], d: '耐打又能砍，適合第一次冒險。', tip: '血量最多，每級成長最高。' },
  rogue: { n: '盜賊', en: 'ROGUE', spr: 'rogue', hp: 28, lvHp: 6, acc: 4, eva: 4, str: 0, abil: ['stealth', 'step'], col: '#7fd36a',
    start: [['dagger', 1], ['leather', 1], ['knife', 8], ['ration', 1]], d: '偷襲睡著的敵人造成三倍傷害，容易找到陷阱與秘門。', tip: '偷襲 ×3、搜尋範圍更大、腳步更輕。' },
  mage: { n: '法師', en: 'MAGE', spr: 'mage', hp: 24, lvHp: 5, acc: 1, eva: 2, str: -1, abil: ['missile', 'nova'], col: '#7fb4ff',
    start: [['staff', 1], ['robe', 1], ['WAND', 1], ['ration', 1]], d: '遠距離魔法攻擊，魔杖一撿起就能辨識。', tip: '魔杖傷害 +50%，會慢慢自動充能。' },
  ranger: { n: '遊俠', en: 'RANGER', spr: 'ranger', hp: 28, lvHp: 5, acc: 5, eva: 3, str: 0, abil: ['aim', 'haste'], col: '#e8c15a',
    start: [['shortsword', 1], ['leather', 1], ['javelin', 4], ['ration', 1]], d: '弓箭不離身，投擲武器更準更痛。', tip: '投擲傷害 +40%，視野 +1。', lock: '抵達第 6 層後解鎖' },
  paladin: { n: '聖騎士', en: 'PALADIN', spr: 'paladin', hp: 32, lvHp: 6, acc: 2, eva: -1, str: 1, abil: ['heal', 'smite'], col: '#ffe08a',
    start: [['mace', 1], ['chain', 1], ['ration', 1], ['p_heal', 1]], d: '重甲與聖光，能自我治療，專剋亡靈。', tip: '起始穿著鎖子甲，對亡靈傷害加倍。', lock: '擊敗任一守層頭目後解鎖' },
};
const CLASS_ORDER = ['warrior', 'rogue', 'mage', 'ranger', 'paladin'];

// ---------- 怪物 ----------
// d: 出現深度下限, dx: 上限; ai 旗標決定行為
const MON = {
  rat: { n: '巨鼠', spr: 'rat', hp: 7, atk: [1, 3], acc: 0, eva: 2, arm: 0, spd: 100, xp: 2, d: 1, dx: 5, verb: '咬', pack: [2, 3], d2: '成群出沒的大老鼠。' },
  bat: { n: '吸血蝙蝠', spr: 'bat', hp: 6, atk: [1, 3], acc: 1, eva: 7, arm: 0, spd: 200, xp: 3, d: 1, dx: 7, verb: '咬', erratic: 1, fly: 1, d2: '飛得很快，亂飛亂撞。' },
  slime: { n: '綠史萊姆', spr: 'slime', hp: 16, atk: [1, 4], acc: 0, eva: 0, arm: 0, spd: 75, xp: 3, d: 2, dx: 7, verb: '黏', split: 1, d2: '被打中會分裂成兩隻。' },
  kobold: { n: '狗頭人', spr: 'kobold', hp: 10, atk: [2, 4], acc: 1, eva: 2, arm: 0, spd: 100, xp: 4, d: 2, dx: 7, verb: '砍', pack: [2, 4], d2: '成群行動的小傢伙。' },
  archer: { n: '哥布林弓手', spr: 'archer', hp: 11, atk: [1, 3], acc: 2, eva: 3, arm: 0, spd: 100, xp: 5, d: 3, dx: 9, verb: '踢', ranged: { r: 6, dmg: [2, 5], k: 'arrow', v: '射出一箭' }, kite: 1, flee: 0.25, d2: '會保持距離射箭。' },
  mimic: { n: '寶箱怪', spr: 'mimic', hp: 30, atk: [4, 9], acc: 3, eva: 0, arm: 2, spd: 100, xp: 12, d: 4, dx: 17, verb: '咬', disguise: 'chest', rare: 1, d2: '偽裝成寶箱的怪物。' },
  spider: { n: '洞穴蜘蛛', spr: 'spider', hp: 16, atk: [2, 5], acc: 2, eva: 4, arm: 0, spd: 150, xp: 7, d: 5, dx: 10, verb: '咬', poison: 3, d2: '動作快，咬人帶毒。' },
  shroom: { n: '毒菇人', spr: 'shroom', hp: 24, atk: [3, 6], acc: 1, eva: 0, arm: 1, spd: 50, xp: 8, d: 5, dx: 10, verb: '撞', spores: 1, sleepy: 0.8, d2: '被打會噴出讓人混亂的孢子。' },
  wisp: { n: '鬼火', spr: 'wisp', hp: 12, atk: [3, 6], acc: 3, eva: 6, arm: 0, spd: 100, xp: 9, d: 6, dx: 11, verb: '灼燒', invis: 1, fly: 1, d2: '平常看不見，貼近時才會現形。' },
  thief: { n: '小偷精', spr: 'thief', hp: 14, atk: [1, 3], acc: 4, eva: 6, arm: 0, spd: 150, xp: 6, d: 5, dx: 12, verb: '抓', steal: 1, d2: '偷走金幣就逃跑。' },
  shaman: { n: '哥布林薩滿', spr: 'shaman', hp: 16, atk: [1, 3], acc: 2, eva: 2, arm: 0, spd: 100, xp: 10, d: 6, dx: 11, verb: '敲', ranged: { r: 5, dmg: [3, 6], k: 'bolt', v: '施放閃電', cd: 2 }, healer: 1, kite: 1, flee: 0.3, d2: '會替同伴治療，並放閃電。' },
  imp: { n: '火焰小鬼', spr: 'imp', hp: 22, atk: [2, 5], acc: 3, eva: 5, arm: 0, spd: 100, xp: 14, d: 9, dx: 14, verb: '抓', ranged: { r: 6, dmg: [4, 8], k: 'fire', v: '丟出火球', burn: 1, cd: 2 }, kite: 1, fireImm: 1, fly: 1, d2: '丟火球的小惡魔。' },
  orc: { n: '獸人狂戰士', spr: 'orc', hp: 34, atk: [4, 10], acc: 3, eva: 1, arm: 2, spd: 100, xp: 16, d: 9, dx: 15, verb: '砍', pack: [1, 2], berserk: 1, d2: '受傷後會陷入狂暴。' },
  necro: { n: '死靈法師', spr: 'necro', hp: 26, atk: [2, 4], acc: 3, eva: 3, arm: 1, spd: 100, xp: 22, d: 10, dx: 16, verb: '敲', ranged: { r: 6, dmg: [3, 7], k: 'void', v: '射出暗影箭', cd: 3 }, summon: { t: 'skeleton', n: 2, cd: 12 }, kite: 1, d2: '會從地底召喚骷髏兵。' },
  skeleton: { n: '骷髏兵', spr: 'skeleton', hp: 20, atk: [4, 8], acc: 2, eva: 1, arm: 2, spd: 100, xp: 6, d: 9, dx: 16, verb: '砍', undead: 1, d2: '不怕痛的亡靈士兵。' },
  salamander: { n: '熔岩蠑螈', spr: 'salamander', hp: 34, atk: [5, 10], acc: 3, eva: 3, arm: 2, spd: 100, xp: 18, d: 10, dx: 15, verb: '咬', burn: 1, fireImm: 1, lavaWalk: 1, sleepy: 0.6, d2: '在岩漿裡游泳，咬人會著火。' },
  golem: { n: '冰晶魔像', spr: 'golem', hp: 72, atk: [8, 16], acc: 3, eva: -2, arm: 5, spd: 50, xp: 30, d: 13, dx: 17, verb: '重擊', d2: '又慢又硬，打人非常痛。' },
  wolf: { n: '霜狼', spr: 'wolf', hp: 28, atk: [4, 9], acc: 4, eva: 4, arm: 1, spd: 150, xp: 18, d: 13, dx: 17, verb: '咬', pack: [2, 3], d2: '成群狩獵的白狼。' },
  shade: { n: '幽影刺客', spr: 'shade', hp: 34, atk: [8, 14], acc: 6, eva: 6, arm: 1, spd: 100, xp: 32, d: 14, dx: 17, verb: '刺', invis: 1, d2: '隱形的殺手。' },
  gargoyle: { n: '石像鬼', spr: 'gargoyle', hp: 46, atk: [7, 13], acc: 4, eva: 2, arm: 4, spd: 100, xp: 30, d: 13, dx: 17, verb: '抓', disguise: 'statue', fly: 1, d2: '偽裝成石像，靠近才會動。' },
  frostmage: { n: '冰霜術士', spr: 'frostmage', hp: 32, atk: [3, 6], acc: 4, eva: 4, arm: 1, spd: 100, xp: 32, d: 14, dx: 17, verb: '敲', ranged: { r: 6, dmg: [6, 11], k: 'frost', v: '射出冰錐', slow: 1, cd: 2 }, blink: 1, kite: 1, d2: '冰錐會讓人變慢，被貼身就瞬移。' },
  sporeling: { n: '小孢子', spr: 'sporeling', hp: 8, atk: [2, 4], acc: 1, eva: 2, arm: 0, spd: 100, xp: 1, d: 99, verb: '撞', d2: '菇母生出來的小蘑菇。' },
  // 守層頭目
  ratking: { n: '鼠王', spr: 'ratking', hp: 70, atk: [3, 7], acc: 3, eva: 3, arm: 1, spd: 100, xp: 45, d: 99, verb: '咬', boss: 1, summon: { t: 'rat', n: 2, cd: 7 }, d2: '戴著破王冠的巨鼠，會呼叫鼠群。' },
  mother: { n: '菇母', spr: 'mother', hp: 130, atk: [5, 10], acc: 3, eva: 0, arm: 2, spd: 75, xp: 90, d: 99, verb: '撞', boss: 1, summon: { t: 'sporeling', n: 2, cd: 6 }, spores: 1, ranged: { r: 5, dmg: [4, 8], k: 'spore', v: '噴出毒孢子', poisonHit: 3, cd: 3 }, d2: '巨大的蘑菇之母。' },
  forge: { n: '熔爐巨像', spr: 'forge', hp: 170, atk: [8, 15], acc: 4, eva: -2, arm: 5, spd: 75, xp: 150, d: 99, verb: '重擊', boss: 1, ranged: { r: 6, dmg: [6, 11], k: 'fire', v: '噴出熔岩', burn: 1, aoe: 1, cd: 3 }, fireImm: 1, lavaWalk: 1, d2: '古代鍛爐醒來的守衛。' },
  witch: { n: '冰霜女巫', spr: 'witch', hp: 210, atk: [6, 11], acc: 5, eva: 5, arm: 2, spd: 100, xp: 220, d: 99, verb: '敲', boss: 1, ranged: { r: 7, dmg: [8, 14], k: 'frost', v: '射出寒冰', slow: 1, cd: 2 }, summon: { t: 'wolf', n: 2, cd: 11 }, blink: 1, kite: 1, d2: '統治冰晶神殿的女巫。' },
  lord: { n: '深淵之王', spr: 'lord', hp: 300, atk: [10, 18], acc: 6, eva: 3, arm: 4, spd: 100, xp: 0, d: 99, verb: '撕裂', boss: 1, final: 1, ranged: { r: 7, dmg: [8, 15], k: 'void', v: '釋放虛空之矛', cd: 3 }, summon: { t: 'shade', n: 1, cd: 9 }, blink: 1, d2: '一切黑暗的源頭。' },
  keeper: { n: '商人', spr: 'keeper', hp: 999, atk: [0, 0], acc: 0, eva: 0, arm: 99, spd: 100, xp: 0, d: 99, verb: '', npc: 1 },
};
const BOSS_FLOOR = { 4: 'ratking', 8: 'mother', 12: 'forge', 16: 'witch', 17: 'lord' };

// ---------- 道具 ----------
const ITEMS = {
  // 武器
  dagger: { c: 'weapon', n: '匕首', spr: 'dagger', dmg: [2, 5], acc: 3, d: 1, w: 8, price: 30 },
  shortsword: { c: 'weapon', n: '短劍', spr: 'sword', dmg: [2, 6], acc: 1, d: 1, w: 10, price: 45 },
  longsword: { c: 'weapon', n: '長劍', spr: 'sword', dmg: [3, 8], acc: 0, d: 2, w: 9, price: 80 },
  spear: { c: 'weapon', n: '長槍', spr: 'spear', dmg: [3, 9], acc: 0, d: 3, w: 6, price: 90, pierce: 1 },
  axe: { c: 'weapon', n: '戰斧', spr: 'axe', dmg: [4, 10], acc: -1, d: 4, w: 7, price: 110, cleave: 1 },
  mace: { c: 'weapon', n: '戰鎚', spr: 'mace', dmg: [4, 9], acc: 0, d: 3, w: 7, price: 100, stun: 1 },
  staff: { c: 'weapon', n: '法杖', spr: 'staff', dmg: [2, 5], acc: 1, d: 1, w: 4, price: 60, magic: 1 },
  greatsword: { c: 'weapon', n: '巨劍', spr: 'greatsword', dmg: [6, 15], acc: -2, d: 8, w: 5, price: 220 },
  warhammer: { c: 'weapon', n: '雷神戰鎚', spr: 'mace', dmg: [7, 16], acc: -2, d: 11, w: 3, price: 300, stun: 1 },
  // 護甲
  cloth: { c: 'armor', n: '布衣', spr: 'armor', arm: 1, eva: 0, d: 1, w: 5, price: 20, tint: '#b49a7a' },
  robe: { c: 'armor', n: '法袍', spr: 'robe', arm: 1, eva: 1, d: 1, w: 3, price: 60, tint: '#5a6fd0', cdr: 1 },
  leather: { c: 'armor', n: '皮甲', spr: 'armor', arm: 2, eva: 0, d: 1, w: 9, price: 50, tint: '#9a6a3e' },
  scale: { c: 'armor', n: '鱗甲', spr: 'armor', arm: 3, eva: -1, d: 3, w: 7, price: 100, tint: '#6f8a6a' },
  chain: { c: 'armor', n: '鎖子甲', spr: 'armor', arm: 4, eva: -2, d: 5, w: 6, price: 150, tint: '#a8b2c0' },
  plate: { c: 'armor', n: '板甲', spr: 'armor', arm: 6, eva: -4, d: 9, w: 4, price: 260, tint: '#d8dee8' },
  // 戒指
  r_str: { c: 'ring', n: '力量之戒', d: 2, w: 3, price: 150, desc: '提升攻擊傷害。' },
  r_prot: { c: 'ring', n: '守護之戒', d: 2, w: 3, price: 150, desc: '提升護甲。' },
  r_regen: { c: 'ring', n: '再生之戒', d: 3, w: 3, price: 170, desc: '加快 HP 回復速度。' },
  r_stealth: { c: 'ring', n: '隱匿之戒', d: 2, w: 2, price: 120, desc: '腳步更輕，怪物不容易醒來。' },
  r_sight: { c: 'ring', n: '洞察之戒', d: 3, w: 2, price: 140, desc: '看得見隱形的怪物，更容易發現陷阱與秘門。' },
  r_evade: { c: 'ring', n: '閃避之戒', d: 2, w: 3, price: 150, desc: '提升閃避。' },
  r_sust: { c: 'ring', n: '飽足之戒', d: 2, w: 2, price: 120, desc: '肚子餓得比較慢。' },
  r_tele: { c: 'ring', n: '躁動之戒', d: 2, w: 2, price: 30, desc: '戴著時會不定時被傳送到別的地方。', bad: 1 },
  // 藥水
  p_heal: { c: 'potion', n: '治療藥水', d: 1, w: 22, price: 50, desc: '回復大量 HP，解除中毒。' },
  p_xheal: { c: 'potion', n: '強效治療藥水', d: 5, w: 7, price: 120, desc: '完全回復 HP，並提升最大 HP。' },
  p_str: { c: 'potion', n: '力量藥水', d: 2, w: 4, price: 200, desc: '永久提升力量（傷害 +1）。' },
  p_life: { c: 'potion', n: '生命藥水', d: 3, w: 3, price: 250, desc: '永久提升最大 HP。' },
  p_haste: { c: 'potion', n: '加速藥水', d: 2, w: 7, price: 80, desc: '一段時間內動作加快。' },
  p_detect: { c: 'potion', n: '透視藥水', d: 1, w: 8, price: 60, desc: '感知整層的怪物與道具位置。' },
  p_xp: { c: 'potion', n: '經驗藥水', d: 4, w: 3, price: 220, desc: '立刻提升一個等級。' },
  p_poison: { c: 'potion', n: '毒藥水', d: 1, w: 9, price: 15, desc: '喝了會中毒；丟出去會散開毒霧。', bad: 1 },
  p_conf: { c: 'potion', n: '混亂藥水', d: 1, w: 7, price: 15, desc: '喝了會頭昏腦脹；丟出去讓敵人混亂。', bad: 1 },
  p_fire: { c: 'potion', n: '烈焰藥水', d: 2, w: 7, price: 30, desc: '喝了會著火；丟出去會燃起大火。', bad: 1 },
  p_para: { c: 'potion', n: '麻痺藥水', d: 3, w: 6, price: 30, desc: '喝了會全身僵硬；丟出去讓敵人動彈不得。', bad: 1 },
  // 卷軸
  s_id: { c: 'scroll', n: '辨識卷軸', d: 1, w: 24, price: 40, desc: '辨識一件未知的道具。' },
  s_tele: { c: 'scroll', n: '傳送卷軸', d: 1, w: 10, price: 50, desc: '把你傳送到這層的某個地方。' },
  s_map: { c: 'scroll', n: '地圖卷軸', d: 1, w: 9, price: 70, desc: '顯示整層的地圖與秘門。' },
  s_uncurse: { c: 'scroll', n: '解咒卷軸', d: 2, w: 7, price: 60, desc: '解除身上裝備的詛咒。' },
  s_ew: { c: 'scroll', n: '武器強化卷軸', d: 1, w: 8, price: 120, desc: '裝備中的武器 +1。' },
  s_ea: { c: 'scroll', n: '護甲強化卷軸', d: 1, w: 8, price: 120, desc: '裝備中的護甲 +1。' },
  s_fear: { c: 'scroll', n: '恐懼卷軸', d: 2, w: 6, price: 60, desc: '讓看得見你的怪物嚇得逃跑。' },
  s_summon: { c: 'scroll', n: '召喚卷軸', d: 2, w: 6, price: 10, desc: '會在你身邊召喚出怪物！', bad: 1 },
  s_charge: { c: 'scroll', n: '充能卷軸', d: 3, w: 5, price: 90, desc: '替所有魔杖補充能量。' },
  s_noise: { c: 'scroll', n: '喧囂卷軸', d: 2, w: 6, price: 10, desc: '發出巨響，吵醒整層的怪物。', bad: 1 },
  // 魔杖
  w_bolt: { c: 'wand', n: '閃電魔杖', d: 1, w: 8, price: 120, ch: [3, 6], desc: '射出貫穿的閃電。' },
  w_fire: { c: 'wand', n: '火球魔杖', d: 2, w: 7, price: 140, ch: [3, 5], desc: '發射會爆炸的火球。' },
  w_frost: { c: 'wand', n: '冰凍魔杖', d: 2, w: 6, price: 110, ch: [3, 6], desc: '冰凍目標數回合。' },
  w_slow: { c: 'wand', n: '遲緩魔杖', d: 1, w: 6, price: 80, ch: [3, 6], desc: '讓目標變慢。' },
  w_tele: { c: 'wand', n: '放逐魔杖', d: 3, w: 5, price: 130, ch: [2, 4], desc: '把目標傳送到遠方。' },
  w_sleep: { c: 'wand', n: '沉睡魔杖', d: 1, w: 6, price: 90, ch: [3, 6], desc: '讓目標陷入沉睡。' },
  w_dig: { c: 'wand', n: '挖掘魔杖', d: 2, w: 4, price: 90, ch: [4, 7], desc: '在牆壁上挖出隧道。' },
  // 投擲
  knife: { c: 'throw', n: '飛刀', spr: 'knife', dmg: [2, 5], d: 1, w: 10, price: 6, stack: [3, 7] },
  javelin: { c: 'throw', n: '標槍', spr: 'javelin', dmg: [4, 9], d: 3, w: 6, price: 14, stack: [2, 4] },
  dart: { c: 'throw', n: '毒鏢', spr: 'dart', dmg: [1, 3], d: 2, w: 6, price: 8, stack: [4, 8], poison: 4 },
  // 食物
  ration: { c: 'food', n: '乾糧', spr: 'ration', food: 1100, d: 1, w: 0, price: 35 },
  apple: { c: 'food', n: '蘋果', spr: 'apple', food: 380, d: 1, w: 0, price: 12 },
  gold: { c: 'gold', n: '金幣', spr: 'gold', d: 1, w: 0 },
};
const CAT_NAME = { weapon: '武器', armor: '護甲', ring: '戒指', potion: '藥水', scroll: '卷軸', wand: '魔杖', throw: '投擲', food: '食物', gold: '金幣' };
const CAT_ORDER = ['weapon', 'armor', 'ring', 'wand', 'potion', 'scroll', 'throw', 'food'];
const CAT_W = { potion: 27, scroll: 23, weapon: 8, armor: 7, ring: 4, wand: 7, throw: 9 };

// 每局隨機外觀
const POTION_LOOKS = [
  ['紅寶石色', '#e8394d'], ['翡翠色', '#2fcf7a'], ['琥珀色', '#f0a030'], ['天藍色', '#4fb8ff'], ['紫水晶色', '#a565ff'], ['乳白色', '#eae4d8'],
  ['墨黑色', '#3a3448'], ['金黃色', '#ffd94a'], ['粉紅色', '#ff7ab8'], ['銀灰色', '#a8b0bc'], ['橘紅色', '#ff6a2a'], ['冒泡的綠色', '#9ae04a'],
  ['混濁的棕色', '#8a6040'], ['閃亮的青色', '#3fe8e0'], ['冰藍色', '#b8e6ff'],
];
const RING_LOOKS = [
  ['紅寶石', '#ff4a5a'], ['藍寶石', '#3f7fff'], ['翡翠', '#2fd07a'], ['黃玉', '#ffd040'], ['紫晶', '#b065ff'], ['珍珠', '#f2ede2'],
  ['黑曜石', '#2a2433'], ['蛋白石', '#9ff0e8'], ['月光石', '#c8d8ff'], ['石榴石', '#b0203a'],
];
const WAND_LOOKS = [
  ['橡木', '#9a6a3a'], ['白樺', '#e8dcc0'], ['烏木', '#2e2430'], ['骨製', '#efe6cf'], ['水晶', '#9fe8ff'], ['黃銅', '#d6a640'],
  ['紫杉', '#7a3a2a'], ['柳木', '#b8b070'], ['鐵製', '#7a828e'], ['珊瑚', '#ff7a6a'],
];
const SCROLL_SYL = ['阿', '卡', '魯', '薩', '瑪', '奇', '多', '泰', '雷', '伊', '歐', '巴', '索', '納', '夫', '茲', '克', '米', '洛', '希', '烏', '庫', '蘭', '迪', '貝', '莫'];

// ---------- 陷阱 ----------
const TRAPS = {
  spike: { n: '尖刺陷阱', col: '#c9ccd6', d: 1 },
  poison: { n: '毒氣陷阱', col: '#7be04a', d: 2 },
  tele: { n: '傳送陷阱', col: '#b48cff', d: 2 },
  alarm: { n: '警報陷阱', col: '#ffd24a', d: 1 },
  pit: { n: '落穴', col: '#6a5a4a', d: 3 },
  fire: { n: '火焰陷阱', col: '#ff6a2a', d: 4 },
};

// ---------- 天賦 ----------
const PERKS = {
  str: { n: '臂力', d: '近戰傷害 +2', max: 3 },
  tough: { n: '鐵皮', d: '護甲 +1', max: 3 },
  vit: { n: '強韌', d: '最大 HP +12', max: 4 },
  dodge: { n: '靈巧', d: '閃避 +3', max: 3 },
  acc: { n: '精準', d: '命中 +3', max: 2 },
  crit: { n: '要害', d: '爆擊率 +7%', max: 3 },
  regen: { n: '再生', d: 'HP 回復速度 +50%', max: 2 },
  vamp: { n: '嗜血', d: '每擊倒一隻怪物回復 HP', max: 1 },
  focus: { n: '專注', d: '技能冷卻時間 -25%', max: 2 },
  eye: { n: '鷹眼', d: '視野 +2，投擲與遠程命中 +3', max: 1 },
  belly: { n: '鐵胃', d: '飢餓速度 -35%', max: 1 },
  greed: { n: '尋寶', d: '撿到的金幣 +50%，搜尋範圍 +1', max: 1 },
  thrower: { n: '投擲大師', d: '投擲傷害 +60%，命中 +5', max: 1 },
  arcane: { n: '魔力共鳴', d: '魔杖與法術傷害 +40%，魔杖有機會不耗能量', max: 1 },
  assassin: { n: '暗殺', d: '偷襲傷害再加一倍', max: 1 },
  thorns: { n: '荊棘', d: '被近戰命中時反彈 40% 傷害', max: 1 },
  resist: { n: '抗性', d: '免疫中毒，燃燒傷害減半', max: 1 },
  fury: { n: '背水一戰', d: 'HP 低於 35% 時傷害 +50%', max: 1 },
  alch: { n: '鍊金術', d: '治療類藥水效果 +50%', max: 1 },
};
const CLASS_PERK_BIAS = {
  warrior: ['str', 'tough', 'vit', 'fury', 'thorns', 'vamp'],
  rogue: ['crit', 'dodge', 'assassin', 'thrower', 'greed', 'acc'],
  mage: ['arcane', 'focus', 'vit', 'regen', 'eye', 'alch'],
  ranger: ['thrower', 'eye', 'acc', 'dodge', 'crit', 'focus'],
  paladin: ['tough', 'vit', 'regen', 'alch', 'str', 'resist'],
};

// ---------- 靈魂祭壇（永久強化） ----------
const META_UPS = [
  { id: 'hp', n: '先祖之血', d: '最大 HP +4', cost: [12, 28, 50] },
  { id: 'heal', n: '急救包', d: '開局多帶一瓶已辨識的治療藥水', cost: [10] },
  { id: 'food', n: '行囊', d: '開局多帶一份乾糧', cost: [8] },
  { id: 'gold', n: '盤纏', d: '開局多帶 60 金幣', cost: [8, 20] },
  { id: 'idscroll', n: '學者的筆記', d: '開局多帶兩張已辨識的辨識卷軸', cost: [16] },
  { id: 'lore', n: '鍊金知識', d: '開局就認得治療藥水與辨識卷軸', cost: [22] },
  { id: 'pack', n: '大背包', d: '背包容量 +4', cost: [18] },
  { id: 'knives', n: '備用飛刀', d: '開局多帶 6 把飛刀', cost: [10] },
];
