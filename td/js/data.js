'use strict';
// 守塔奇兵：塔、敵人、關卡、天賦樹資料。要加新東西主要改這個檔案。
const COLS = 16, ROWS = 10;

// ───────── 防禦塔 ─────────
// tiers[0..2] = Lv1~Lv3；spec[0/1] = Lv4 的兩條專精路線
// 數值單位：dmg 每發傷害、rate 每秒發數、range 以格為單位、splash 爆炸半徑（格）
const TOWERS = {
  arrow: {
    name: '箭塔', en: 'ARROW', key: '1', color: '#e2a64a', air: true, dt: 'phys', unlock: 0,
    desc: '射得快又便宜，地面空中都能打。前期主力。',
    tiers: [
      { cost: 70, dmg: 7.5, rate: 1.6, range: 2.6 },
      { cost: 60, dmg: 11, rate: 1.8, range: 2.8 },
      { cost: 110, dmg: 15, rate: 2.0, range: 3.0 },
    ],
    spec: [
      { name: '連弩塔', cost: 230, dmg: 17, rate: 2.6, range: 3.0, multi: 3, desc: '一次射 3 支箭，同時打 3 個敵人。' },
      { name: '鷹眼塔', cost: 250, dmg: 47, rate: 1.5, range: 4.2, crit: 0.25, critX: 2.5, shred: 0.1, desc: '射程很遠會暴擊，命中會削弱護甲。' },
    ],
  },
  cannon: {
    name: '砲塔', en: 'CANNON', key: '2', color: '#7d8796', air: false, dt: 'phys', unlock: 0,
    desc: '砲彈落地爆炸，一次炸一群。打不到飛行敵人。',
    tiers: [
      { cost: 100, dmg: 20, rate: 0.6, range: 2.4, splash: 0.9 },
      { cost: 90, dmg: 31, rate: 0.65, range: 2.5, splash: 1.0 },
      { cost: 150, dmg: 47, rate: 0.7, range: 2.6, splash: 1.1 },
    ],
    spec: [
      { name: '巨砲堡', cost: 310, dmg: 117, rate: 0.5, range: 2.8, splash: 1.5, stun: 0.6, desc: '超大爆炸，還會把敵人震暈。' },
      { name: '集束飛彈', cost: 300, dmg: 39, rate: 0.9, range: 3.4, splash: 0.8, missiles: 3, air: true, desc: '每次發射 3 枚追蹤飛彈，也能打空中。' },
    ],
  },
  frost: {
    name: '冰霜塔', en: 'FROST', key: '3', color: '#6fd3ff', air: true, dt: 'magic', unlock: 1,
    desc: '冰晶讓敵人變慢，搭配其他塔效果最好。',
    tiers: [
      { cost: 80, dmg: 3.9, rate: 1.0, range: 2.4, slow: 0.35, slowT: 1.6, splash: 0.5 },
      { cost: 70, dmg: 6.5, rate: 1.0, range: 2.5, slow: 0.42, slowT: 1.8, splash: 0.6 },
      { cost: 120, dmg: 10, rate: 1.1, range: 2.6, slow: 0.5, slowT: 2.0, splash: 0.7 },
    ],
    spec: [
      { name: '暴風雪', cost: 270, dmg: 12, rate: 2.0, range: 2.8, slow: 0.58, slowT: 1.2, aura: true, desc: '範圍內所有敵人持續受傷又減速。' },
      { name: '冰晶尖塔', cost: 260, dmg: 34, rate: 1.1, range: 2.8, slow: 0.5, slowT: 2.0, splash: 0.7, freeze: 0.2, freezeT: 1.2, desc: '有機會把敵人凍住，被凍住的受到傷害加五成。' },
    ],
  },
  magic: {
    name: '法師塔', en: 'MAGE', key: '4', color: '#b06bff', air: true, dt: 'magic', unlock: 2,
    desc: '魔法傷害無視護甲，專門對付鐵甲蟲。',
    tiers: [
      { cost: 110, dmg: 22, rate: 0.8, range: 2.6 },
      { cost: 100, dmg: 36, rate: 0.8, range: 2.7 },
      { cost: 160, dmg: 55, rate: 0.85, range: 2.8 },
    ],
    spec: [
      { name: '雷電塔', cost: 320, dmg: 62, rate: 0.9, range: 2.9, chain: 5, desc: '閃電在敵人之間跳躍，最多連鎖 5 個。' },
      { name: '奧術稜鏡', cost: 340, dmg: 150, rate: 0.55, range: 3.1, beam: true, desc: '發射貫穿光束，直線上的敵人全部命中。' },
    ],
  },
  sniper: {
    name: '狙擊塔', en: 'SNIPER', key: '5', color: '#4f9a6a', air: true, dt: 'phys', unlock: 3, pierce: 0.5,
    desc: '射程超遠、單發超痛，可以無視一半護甲。',
    tiers: [
      { cost: 130, dmg: 62, rate: 0.35, range: 5.5 },
      { cost: 110, dmg: 98, rate: 0.36, range: 5.8 },
      { cost: 170, dmg: 150, rate: 0.4, range: 6.0 },
    ],
    spec: [
      { name: '神射手', cost: 340, dmg: 299, rate: 0.4, range: 6.5, headshot: 0.12, desc: '12% 機率爆頭直接擊倒（頭目受三倍傷害）。' },
      { name: '獵人印記', cost: 320, dmg: 195, rate: 0.55, range: 6.0, mark: 0.3, markT: 4, desc: '被標記的敵人受到所有傷害加三成。' },
    ],
  },
  banner: {
    name: '戰旗', en: 'BANNER', key: '6', color: '#ff6b5a', air: false, dt: 'none', unlock: 4, support: true,
    desc: '不會攻擊，但讓附近的塔變強。放在塔群中間。',
    tiers: [
      { cost: 120, range: 1.6, buffDmg: 0.15, buffRange: 0 },
      { cost: 100, range: 1.8, buffDmg: 0.2, buffRange: 0.06 },
      { cost: 150, range: 2.0, buffDmg: 0.25, buffRange: 0.1 },
    ],
    spec: [
      { name: '戰鼓', cost: 260, range: 2.2, buffDmg: 0.3, buffRange: 0.1, buffRate: 0.25, desc: '附近的塔攻擊速度加快 25%。' },
      { name: '瞭望塔', cost: 260, range: 2.4, buffDmg: 0.28, buffRange: 0.2, giveAir: true, desc: '射程大增，附近的砲塔也能打飛行敵人。' },
    ],
  },
  mine: {
    name: '金礦', en: 'GOLD MINE', key: '7', color: '#ffc94a', air: false, dt: 'none', unlock: 5, support: true,
    desc: '每一波開始時產出金幣。越早蓋越划算。',
    tiers: [
      { cost: 150, range: 0.6, gold: 25 },
      { cost: 120, range: 0.6, gold: 40 },
      { cost: 180, range: 0.6, gold: 60 },
    ],
    spec: [
      { name: '銀行', cost: 300, range: 0.6, gold: 75, interest: 0.04, desc: '每波再給目前金幣 4% 的利息（最多 80）。' },
      { name: '寶石礦坑', cost: 300, range: 0.6, gold: 115, desc: '每波穩定產出大量金幣。' },
    ],
  },
};
const TOWER_ORDER = ['arrow', 'cannon', 'frost', 'magic', 'sniper', 'banner', 'mine'];
const TARGET_MODES = [['first', '最前'], ['last', '最後'], ['strong', '最強'], ['close', '最近']];

// ───────── 敵人 ─────────
// armor：物理減傷、mres：魔法減傷、cost：出怪預算用的強度權重
const ENEMIES = {
  slime: { name: '史萊姆', hp: 30, spd: 1.0, bounty: 6, r: 0.26, cost: 1, desc: '最普通的小怪。' },
  runner: { name: '疾風狼', hp: 22, spd: 2.0, bounty: 6, r: 0.25, cost: 1.1, desc: '跑得很快，小心漏掉。' },
  beetle: { name: '鐵甲蟲', hp: 60, spd: 0.8, bounty: 10, r: 0.3, armor: 0.6, cost: 2.2, desc: '厚重護甲，物理攻擊只剩四成傷害。用魔法打牠！' },
  bat: { name: '蝙蝠', hp: 26, spd: 1.4, bounty: 7, r: 0.24, fly: true, cost: 1.3, desc: '會飛，直線飛向城堡。砲塔打不到。' },
  golem: { name: '石像', hp: 75, spd: 0.75, bounty: 10, r: 0.3, mres: 0.7, cost: 2.3, desc: '抗魔法，魔法只剩三成傷害。用箭和砲打！' },
  healer: { name: '祭司', hp: 55, spd: 0.85, bounty: 12, r: 0.27, heal: 0.12, cost: 2.6, desc: '每隔一陣子替附近的同伴補血。優先擊倒！' },
  shield: { name: '盾衛', hp: 55, spd: 0.8, bounty: 13, r: 0.3, armor: 0.2, shield: 70, cost: 3, desc: '護盾先吸收傷害，三秒沒被打就會回充。' },
  splitter: { name: '分裂膠', hp: 70, spd: 0.85, bounty: 7, r: 0.34, split: 'mini', splitN: 3, cost: 2.8, desc: '死掉會分裂成三隻小膠。' },
  mini: { name: '小膠', hp: 16, spd: 1.35, bounty: 3, r: 0.17, cost: 0.5, desc: '' },
  ogre: { name: '巨魔', hp: 280, spd: 0.58, bounty: 30, r: 0.42, armor: 0.3, lives: 3, cost: 8, desc: '血超厚，漏掉一隻扣 3 條命。' },
  gargoyle: { name: '石像鬼', hp: 95, spd: 1.0, bounty: 14, r: 0.32, fly: true, armor: 0.4, cost: 3.6, desc: '有護甲的飛行敵人。' },
  skeleton: { name: '骷髏兵', hp: 32, spd: 1.15, bounty: 2, r: 0.24, armor: 0.2, cost: 1, desc: '巫妖王召喚出來的小兵。' },
  bossGolem: { name: '岩石巨人王', hp: 3200, spd: 0.38, bounty: 300, r: 0.62, armor: 0.5, lives: 10, boss: true, stomp: 6, cost: 0, desc: '頭目！每 6 秒跺腳，震暈附近的塔。' },
  bossDragon: { name: '炎龍', hp: 2800, spd: 0.55, bounty: 350, r: 0.62, mres: 0.3, fly: true, lives: 10, boss: true, dash: 7, cost: 0, desc: '頭目！會飛，還會突然加速衝刺。' },
  bossLich: { name: '巫妖王', hp: 5200, spd: 0.4, bounty: 500, r: 0.6, mres: 0.55, armor: 0.2, lives: 15, boss: true, summon: 5, cost: 0, desc: '最終頭目！不斷召喚骷髏兵。' },
};

// ───────── 地圖主題 ─────────
const THEMES = {
  meadow: { g1: '#86d45e', g2: '#7cca55', edge: '#4f9a3b', path: '#efd49a', pathE: '#b9935a', deco: ['tree', 'tree', 'bush', 'rock', 'tree'], flower: ['#fff3a8', '#ff9ec7', '#ffffff'], bg: '#2f6b2f', music: 0 },
  forest: { g1: '#5fb556', g2: '#56aa4e', edge: '#2e6d35', path: '#d8b98a', pathE: '#8f6b45', deco: ['pine', 'pine', 'tree', 'mush', 'pine'], flower: ['#ffe066', '#c9f2ff'], bg: '#1e4a2a', music: 1 },
  desert: { g1: '#f0cf86', g2: '#e9c57a', edge: '#c39a55', path: '#fbe9c4', pathE: '#c79f62', deco: ['cactus', 'rock', 'cactus', 'palm'], flower: ['#ffb36b'], bg: '#9b6f37', music: 2, water: '#4cc7e8' },
  snow: { g1: '#eef6fb', g2: '#e3eef6', edge: '#a9c3d6', path: '#c6d6e4', pathE: '#7f9db6', deco: ['spine', 'spine', 'rock', 'spine'], flower: ['#ffffff'], bg: '#5c7d97', music: 3 },
  swamp: { g1: '#87a95a', g2: '#7d9e52', edge: '#4c6a35', path: '#b39a6b', pathE: '#6f5a3a', deco: ['mush', 'dead', 'bush', 'mush'], flower: ['#d7ff8a', '#b9a6ff'], bg: '#2f4228', music: 4, water: '#5f8f6a' },
  volcano: { g1: '#6b5a52', g2: '#63524b', edge: '#3a2c27', path: '#a58b74', pathE: '#55392b', deco: ['rock', 'dead', 'rock', 'crystal'], flower: ['#ff8a3a'], bg: '#2a1814', music: 5, water: '#ff7a2a', lava: true },
  coast: { g1: '#8fdc6a', g2: '#84d160', edge: '#5a9c41', path: '#f7e2ae', pathE: '#c9a462', deco: ['palm', 'tree', 'rock', 'palm'], flower: ['#ffffff', '#ffd1e6'], bg: '#1d6f9a', music: 6, water: '#3fb6e6' },
  autumn: { g1: '#c8a24a', g2: '#bf9842', edge: '#8a6a2a', path: '#e2c690', pathE: '#a8824e', deco: ['tree', 'tree', 'bush', 'rock', 'mush', 'tree'], flower: ['#ff8a3a', '#ffd36b', '#ffffff'], bg: '#5a3a1e', music: 1, water: '#5ab8d0' },
  canyon: { g1: '#d88a5a', g2: '#cf8050', edge: '#8a4a2a', path: '#f0c89a', pathE: '#b07848', deco: ['rock', 'cactus', 'dead', 'rock', 'crystal'], flower: ['#ffd36b'], bg: '#6a2e1a', music: 5, water: '#4cc7e8' },
  night: { g1: '#4b5a86', g2: '#45537d', edge: '#262e4f', path: '#8f8aa8', pathE: '#4c4766', deco: ['crystal', 'dead', 'rock', 'grave'], flower: ['#9ef0ff', '#d7a8ff'], bg: '#151a33', music: 7 },
};

// ───────── 關卡 ─────────
// paths：每條路線是格子座標的轉折點（-1 或 16/10 代表地圖外）
// entries：每個入口可以走哪幾條路線（同入口多條路線 = 岔路，敵人隨機選）
// pool：[敵人, 從第幾波開始出現, 權重]
const LEVELS = [
  {
    name: '青青草原', en: 'GREEN MEADOW', theme: 'meadow', seed: 11, waves: 10, gold: 260,
    paths: [[[-1, 2], [3, 2], [3, 7], [8, 7], [8, 3], [12, 3], [12, 6], [16, 6]]],
    entries: [[0]],
    pool: [['slime', 0, 5], ['runner', 3, 2], ['beetle', 6, 2]],
    b0: 7, bg: 1.2, hp0: 1, hpg: 0.05, story: '史萊姆大軍從森林那頭冒出來了！在路邊蓋箭塔和砲塔，守住城堡。',
    limit: ['arrow', 'cannon'],
  },
  {
    name: '迷霧森林', en: 'MISTY WOODS', theme: 'forest', seed: 23, waves: 12, gold: 270,
    paths: [[[-1, 1], [13, 1], [13, 4], [2, 4], [2, 7], [16, 7]]],
    entries: [[0]],
    pool: [['slime', 0, 4], ['runner', 1, 3], ['bat', 3, 2], ['beetle', 5, 2]],
    b0: 8, bg: 1.19, hp0: 1.05, hpg: 0.055, story: '森林裡的路彎彎曲曲。新的冰霜塔可以讓跑很快的疾風狼慢下來。',
    limit: ['arrow', 'frost'],
  },
  {
    name: '沙丘綠洲', en: 'DUNE OASIS', theme: 'desert', seed: 37, waves: 12, gold: 300,
    paths: [
      [[-1, 2], [5, 2], [5, 5], [10, 5], [10, 1], [14, 1], [14, 7], [16, 7]],
      [[-1, 8], [5, 8], [5, 5], [10, 5], [10, 1], [14, 1], [14, 7], [16, 7]],
    ],
    entries: [[0], [1]],
    water: [[7, 7, 3, 2]],
    pool: [['slime', 0, 3], ['runner', 0, 2], ['beetle', 1, 3], ['golem', 4, 2], ['healer', 6, 2], ['bat', 3, 1]],
    b0: 9, bg: 1.19, hp0: 1.1, hpg: 0.06, story: '兩個入口同時進攻！鐵甲蟲很硬，用新的法師塔打穿牠的殼。',
    limit: ['cannon', 'frost', 'magic'],
  },
  {
    name: '冰封雪原', en: 'FROZEN FIELD', theme: 'snow', seed: 41, waves: 14, gold: 320,
    paths: [[[7, -1], [7, 7], [3, 7], [3, 4], [12, 4], [12, 8], [16, 8]]],
    entries: [[0]],
    pool: [['slime', 0, 3], ['runner', 0, 2], ['beetle', 1, 2], ['golem', 2, 2], ['bat', 2, 2], ['shield', 5, 3], ['healer', 6, 1], ['ogre', 8, 1]],
    boss: 'bossGolem',
    b0: 9, bg: 1.17, hp0: 1.15, hpg: 0.065, story: '道路在中間交叉，砲塔放在十字路口附近效果加倍。最後一波，岩石巨人王會來！',
    limit: ['arrow', 'magic', 'sniper'],
  },
  {
    name: '沼澤濕地', en: 'MURKY SWAMP', theme: 'swamp', seed: 53, waves: 15, gold: 340,
    paths: [
      [[-1, 1], [6, 1], [6, 3], [11, 3], [11, 5], [16, 5]],
      [[-1, 8], [4, 8], [4, 6], [9, 6], [9, 8], [14, 8], [14, 5], [16, 5]],
    ],
    entries: [[0], [1]],
    water: [[0, 4, 2, 2], [12, 0, 2, 2]],
    pool: [['slime', 0, 2], ['runner', 0, 2], ['splitter', 1, 3], ['beetle', 2, 2], ['golem', 3, 2], ['bat', 2, 2], ['gargoyle', 6, 2], ['shield', 4, 2], ['healer', 5, 2], ['ogre', 9, 1]],
    b0: 10, bg: 1.17, hp0: 1.2, hpg: 0.065, story: '分裂膠被打爆會變成三隻小膠。戰旗可以讓附近的塔都變強。',
    limit: ['cannon', 'magic', 'banner'],
  },
  {
    name: '熔岩火山', en: 'LAVA PEAK', theme: 'volcano', seed: 67, waves: 15, gold: 360,
    paths: [
      [[-1, 5], [3, 5], [3, 1], [11, 1], [11, 5], [16, 5]],
      [[-1, 5], [3, 5], [3, 8], [11, 8], [11, 5], [16, 5]],
    ],
    entries: [[0, 1]],
    water: [[13, 1, 2, 2], [13, 7, 2, 2]],
    pool: [['slime', 0, 2], ['runner', 0, 2], ['beetle', 0, 2], ['golem', 1, 2], ['bat', 1, 2], ['shield', 2, 2], ['splitter', 3, 2], ['healer', 4, 2], ['gargoyle', 5, 2], ['ogre', 6, 1]],
    boss: 'bossDragon',
    b0: 10, bg: 1.17, hp0: 1.3, hpg: 0.065, story: '路在火山口分成兩條，中間的島是兵家必爭之地。金礦能幫你存錢。炎龍在最後等著。',
    limit: ['arrow', 'frost', 'sniper'],
  },
  {
    name: '海岸峭壁', en: 'CLIFF COAST', theme: 'coast', seed: 79, waves: 16, gold: 380,
    paths: [
      [[16, 2], [11, 2], [11, 6], [6, 6], [6, 3], [2, 3], [2, 10]],
      [[16, 8], [9, 8], [9, 6], [6, 6], [6, 3], [2, 3], [2, 10]],
    ],
    entries: [[0], [1]],
    water: [[0, 0, 16, 1], [13, 4, 3, 2]],
    pool: [['slime', 0, 2], ['runner', 0, 2], ['beetle', 0, 2], ['golem', 0, 2], ['bat', 1, 2], ['shield', 1, 2], ['splitter', 2, 2], ['healer', 3, 2], ['gargoyle', 3, 2], ['ogre', 5, 2]],
    boss: 'bossGolem',
    b0: 10, bg: 1.165, hp0: 1.4, hpg: 0.065, story: '敵人從海上登陸，兩路在中間會合。善用所有的塔！',
    limit: ['cannon', 'magic', 'sniper'],
  },
  {
    name: '暗影城堡', en: 'SHADOW KEEP', theme: 'night', seed: 97, waves: 20, gold: 450,
    paths: [
      [[-1, 1], [4, 1], [4, 7], [8, 7], [8, 3], [12, 3], [12, 5], [16, 5]],
      [[6, 10], [6, 5], [12, 5], [16, 5]],
    ],
    entries: [[0], [1]],
    pool: [['slime', 0, 1], ['runner', 0, 2], ['beetle', 0, 2], ['golem', 0, 2], ['bat', 0, 2], ['shield', 1, 2], ['splitter', 1, 2], ['healer', 2, 2], ['gargoyle', 2, 2], ['ogre', 4, 2]],
    boss: 'bossLich', midBoss: [14, 'bossDragon', 0.65],
    b0: 9, bg: 1.14, hp0: 1.2, hpg: 0.058, story: '最後的決戰。兩條路交叉兩次，巫妖王會帶著骷髏大軍出現。',
    limit: ['arrow', 'cannon', 'magic'],
  },
  {
    name: '楓紅山谷', en: 'AUTUMN VALE', theme: 'autumn', seed: 113, waves: 18, gold: 480,
    paths: [
      [[-1, 4], [3, 4], [3, 1], [8, 1], [8, 8], [13, 8], [13, 3], [16, 3]],
      [[-1, 4], [3, 4], [3, 8], [8, 8], [13, 8], [13, 3], [16, 3]],
    ],
    entries: [[0, 1]],
    water: [[10, 4, 2, 2]],
    pool: [['slime', 0, 1], ['runner', 0, 2], ['beetle', 0, 2], ['golem', 0, 2], ['bat', 0, 2], ['shield', 1, 2], ['splitter', 1, 2], ['healer', 2, 2], ['gargoyle', 2, 2], ['ogre', 3, 2], ['skeleton', 4, 2]],
    boss: 'bossDragon', midBoss: [9, 'bossGolem', 0.6],
    b0: 10, bg: 1.16, hp0: 1.6, hpg: 0.062, story: '秋天的山谷，岔路在山腳分開又會合。骷髏兵也來湊熱鬧，最後炎龍會飛越整座山谷。',
    limit: ['arrow', 'magic', 'banner'],
  },
  {
    name: '赤岩峽谷', en: 'RED CANYON', theme: 'canyon', seed: 131, waves: 22, gold: 520,
    paths: [
      [[-1, 2], [5, 2], [5, 7], [10, 7], [10, 2], [16, 2]],
      [[7, 10], [7, 4], [13, 4], [13, 2], [16, 2]],
    ],
    entries: [[0], [1]],
    water: [[1, 5, 2, 3]],
    pool: [['slime', 0, 1], ['runner', 0, 2], ['beetle', 0, 2], ['golem', 0, 2], ['bat', 0, 2], ['shield', 0, 2], ['splitter', 1, 2], ['healer', 1, 2], ['gargoyle', 2, 2], ['ogre', 3, 2], ['skeleton', 3, 1]],
    boss: 'bossLich', midBoss: [11, 'bossGolem', 0.7],
    b0: 10, bg: 1.15, hp0: 1.5, hpg: 0.06, story: '峽谷裡兩條路交叉成井字，到處都是火力交會點。這是王國最後的防線！',
    limit: ['cannon', 'frost', 'sniper'],
  },
];

// ───────── 難度 ─────────
const DIFFS = {
  easy: { name: '簡單', hp: 0.72, spd: 0.95, bounty: 1.15, lives: 25, gold: 60, note: '敵人血比較少、錢比較多。適合先熟悉。' },
  normal: { name: '普通', hp: 1, spd: 1, bounty: 1, lives: 20, gold: 0, note: '標準挑戰。' },
  hard: { name: '困難', hp: 1.32, spd: 1.07, bounty: 0.92, lives: 12, gold: 0, note: '敵人更硬更快。過關另外得 2 顆星！' },
};

// ───────── 天賦樹（用星星購買的永久加成） ─────────
// cost：每一階的星星價格；req：[前置天賦, 階數]
const META = [
  // 經濟
  { id: 'gold', col: 0, name: '充足軍費', desc: n => `開場金幣 +${n * 30}`, cost: [1, 2, 3] },
  { id: 'bounty', col: 0, name: '戰利品', desc: n => `擊倒敵人的金幣 +${n * 8}%`, cost: [2, 3, 4], req: ['gold', 1] },
  { id: 'cheap', col: 0, name: '工匠公會', desc: n => `蓋塔與升級便宜 ${n * 5}%`, cost: [2, 3, 4], req: ['bounty', 1] },
  { id: 'refund', col: 0, name: '回收工法', desc: n => `賣塔退款 ${70 + n * 10}%`, cost: [1, 2], req: ['gold', 1] },
  { id: 'early', col: 0, name: '急行軍', desc: n => `提早叫下一波的獎金 +${n * 50}%`, cost: [1, 2] },
  // 防禦
  { id: 'lives', col: 1, name: '城牆加固', desc: n => `生命 +${n * 3}`, cost: [1, 2, 3] },
  { id: 'range', col: 1, name: '鷹巢', desc: n => `所有塔射程 +${n * 5}%`, cost: [2, 3], req: ['lives', 1] },
  { id: 'arrow', col: 1, name: '精鋼箭頭', desc: n => `箭塔傷害 +${n * 12}%`, cost: [1, 2] },
  { id: 'cannon', col: 1, name: '高爆火藥', desc: n => `砲塔傷害 +${n * 8}%、爆炸範圍 +${n * 12}%`, cost: [1, 2] },
  { id: 'frost', col: 1, name: '永凍核心', desc: n => `冰霜塔減速時間 +${n * 25}%、傷害 +${n * 15}%`, cost: [1, 2] },
  { id: 'magic', col: 2, name: '奧術共鳴', desc: n => `法師塔傷害 +${n * 12}%`, cost: [1, 2] },
  { id: 'sniper', col: 2, name: '精密瞄準鏡', desc: n => `狙擊塔傷害 +${n * 12}%`, cost: [1, 2] },
  { id: 'banner', col: 2, name: '軍樂隊', desc: n => `戰旗加成額外 +${n * 5}%`, cost: [1, 2] },
  { id: 'mine', col: 2, name: '深層礦脈', desc: n => `金礦產量 +${n * 15}%`, cost: [1, 2] },
  // 技能
  { id: 'meteor', col: 3, name: '烈焰隕石', desc: n => `隕石傷害 +${n * 35}%`, cost: [1, 2, 3] },
  { id: 'meteorCd', col: 3, name: '星辰召喚', desc: n => `隕石冷卻 -${n * 15}%`, cost: [2, 3], req: ['meteor', 1] },
  { id: 'freeze', col: 3, name: '絕對零度', desc: n => `冰封時間 +${n}秒`, cost: [2, 3] },
  { id: 'freezeCd', col: 3, name: '寒冰之心', desc: n => `冰封冷卻 -${n * 15}%`, cost: [2, 3], req: ['freeze', 1] },
];
const META_COLS = ['經濟', '防禦', '強化', '技能'];

const SKILLS = {
  meteor: { name: '隕石', cd: 40, dmg: 110, r: 1.15, unlock: 0, desc: '點地圖上的位置，召喚三顆隕石。' },
  freeze: { name: '冰封', cd: 60, dur: 2.5, unlock: 2, desc: '凍住全場敵人（頭目只會變慢）。' },
};
// 每關的挑戰（各得 1 顆星；限定塔種、無技能是普通難度，鐵人是簡單難度但只有 1 條命）
const CHALLENGES = {
  limit: { name: '限定塔種', desc: '只能使用指定的幾種塔' },
  noskill: { name: '無技能', desc: '不能使用隕石和冰封' },
  iron: { name: '鐵人', desc: '只有 1 條命（敵人強度同簡單）' },
};
const CHAL_ORDER = ['limit', 'noskill', 'iron'];
// 無盡模式的詞綴：每 5 波換一次
const ENDLESS_MODS = {
  swift: { name: '疾風', desc: '敵人速度 +15%' },
  armored: { name: '鐵壁', desc: '敵人護甲 +20%' },
  regen: { name: '再生', desc: '敵人每秒回復 2% 生命' },
  swarm: { name: '蜂群', desc: '敵人數量多五成、血量少三成' },
  sky: { name: '天空之怒', desc: '每波多一隊飛行敵人' },
  rich: { name: '豐收', desc: '擊倒金幣 +30%' },
};
// 成就
const ACHIEVEMENTS = [
  { id: 'win1', name: '初次勝利', desc: '打贏任何一關' },
  { id: 'stars3', name: '完美防守', desc: '任何一關拿到 3 顆星' },
  { id: 'noleak', name: '滴水不漏', desc: '一條命都沒掉就過關' },
  { id: 'hard', name: '硬漢', desc: '用困難難度過關' },
  { id: 'half', name: '王國英雄', desc: '打贏前 5 關' },
  { id: 'all', name: '王國守護者', desc: '打贏所有關卡' },
  { id: 'bossGolem', name: '撼動大地', desc: '擊倒岩石巨人王' },
  { id: 'bossDragon', name: '屠龍者', desc: '擊倒炎龍' },
  { id: 'bossLich', name: '驅散黑暗', desc: '擊倒巫妖王' },
  { id: 'k1000', name: '千人斬', desc: '累計擊倒 1000 個敵人' },
  { id: 'k10000', name: '萬夫莫敵', desc: '累計擊倒 10000 個敵人' },
  { id: 'b100', name: '建築大師', desc: '累計蓋 100 座塔' },
  { id: 'specs', name: '全能工匠', desc: '每一種專精塔都蓋過' },
  { id: 'rich', name: '大富翁', desc: '同時擁有 2000 金幣' },
  { id: 'e20', name: '無盡之路', desc: '無盡模式撐過 20 波' },
  { id: 'e40', name: '永不陷落', desc: '無盡模式撐過 40 波' },
  { id: 'chal1', name: '挑戰者', desc: '完成任何一個關卡挑戰' },
  { id: 'iron', name: '鐵人', desc: '完成任何一關的鐵人挑戰' },
  { id: 'chal10', name: '挑戰大師', desc: '完成 10 個關卡挑戰' },
  { id: 'meta', name: '學以致用', desc: '在天賦樹學會 10 階天賦' },
];
const ENDLESS_UNLOCK = 3; // 打贏第 4 關後解鎖無盡模式
const WAVE_GAP = 14; // 一波出完之後到下一波的秒數
