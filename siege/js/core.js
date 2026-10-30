// 萬軍守城（複製自千軍突圍 rush/js）— 共用常數、工具、存檔
'use strict';

const ROAD = 4.2;          // 路面半寬（公尺）
const PX_MAX = ROAD - 0.55; // 部隊中心可移動範圍
const ZSPAWN = 100;        // 物件從多遠出現（俯瞰鏡頭看得比較遠）
const BULLET_V = 38;       // 子彈速度
const BULLET_RANGE = 58;   // 子彈射程
const MAX_SHOOTERS = 24;   // 畫面上實際開槍的士兵數（傷害依總人數放大）
const VIS_CAP = 64;        // 畫面上最多畫幾個士兵
const MAX_N = 99999;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 武器：rate = 每位士兵每秒發數，dmg = 每發傷害
const WEAPONS = {
  rifle:   { name: '步槍',   rate: 2.2, dmg: 1.00, n: 1, spread: 0.000, pierce: 0, splash: 0,   col: '#ffc21f', len: 0.7, eff: 1.00 },
  smg:     { name: '衝鋒槍', rate: 4.4, dmg: 0.62, n: 1, spread: 0.035, pierce: 0, splash: 0,   col: '#ffd84a', len: 0.55, eff: 1.18 },
  shotgun: { name: '霰彈槍', rate: 1.3, dmg: 0.78, n: 3, spread: 0.13,  pierce: 0, splash: 0,   col: '#ff9a2a', len: 0.45, eff: 1.22 },
  rocket:  { name: '火箭筒', rate: 0.72, dmg: 3.6, n: 1, spread: 0.000, pierce: 0, splash: 1.8, col: '#ff8a3d', len: 1.1, eff: 1.38 },
  laser:   { name: '雷射槍', rate: 1.5, dmg: 1.62, n: 1, spread: 0.000, pierce: 3, splash: 0,   col: '#7df9ff', len: 2.4, eff: 1.30 },
};
const WPN_ORDER = ['rifle', 'smg', 'shotgun', 'laser', 'rocket'];
const LV_MAX = 5;
const lvMult = lv => 1 + 0.3 * (lv - 1);

// 敵人種類
const ENEMIES = {
  grunt:  { name: '小魔怪', r: 0.46, h: 1.25, spd: 2.2, home: 1.0, hpK: 1.0,  mass: 1.0 },
  runner: { name: '飛毛鬼', r: 0.36, h: 1.0,  spd: 5.2, home: 1.7, hpK: 0.55, mass: 1.1 },
  brute:  { name: '大胖魔', r: 0.95, h: 2.2,  spd: 1.15, home: 0.55, hpK: 6.0, mass: 0.9 },
  shield: { name: '盾牌兵', r: 0.55, h: 1.45, spd: 1.6, home: 0.8, hpK: 2.0,  mass: 0.9 },
  thrower: { name: '丟丟鬼', r: 0.5, h: 1.35, spd: 1.8, home: 0.5, hpK: 1.6,  mass: 0.8 },
  splitter: { name: '分裂史萊姆', r: 0.6, h: 1.2, spd: 1.5, home: 0.8, hpK: 1.6, mass: 0.8 },
  mini:   { name: '小史萊姆', r: 0.34, h: 0.75, spd: 2.8, home: 1.4, hpK: 0.3, mass: 1.0, art: 'splitter' },
  bat:    { name: '火蝙蝠', r: 0.42, h: 1.0, spd: 3.6, home: 0.5, hpK: 0.5, mass: 1.0, fly: 1 },
  healer: { name: '治療巫師', r: 0.5, h: 1.55, spd: 1.6, home: 0.35, hpK: 2.0, mass: 0.8 },
  magma:  { name: '熔岩怪', r: 0.62, h: 1.5, spd: 1.5, home: 0.8, hpK: 2.4, mass: 1.0 },
};

// 兵種（穿過紫色的兵種門就會加入，整關都有效）
const SPEC = {
  medic:  { name: '醫護兵', icon: '✚', col: '#ff5a6e', desc: '把受傷的士兵救回來' },
  mortar: { name: '砲兵',   icon: '💣', col: '#ffb020', desc: '自動往怪最多的地方打砲' },
  guard:  { name: '盾兵',   icon: '🛡', col: '#5fb6ff', desc: '每個盾兵讓損失少 7%' },
};
const SPEC_ORDER = ['medic', 'mortar', 'guard'];
const SPEC_MAX = 4;
// 限時加持（粉紅色的加持門）
const BUFF = {
  shield: { name: '無敵護罩', dur: 6, col: '#7fe8ff' },
  fury:   { name: '狂熱連射', dur: 7, col: '#ff7ad9' },
};

// 永久強化（萬軍守城專用）
const UPGRADES = [
  { id: 'rate',  name: '砲台射速', desc: lv => `射速 +${lv * 5}%`,             max: 8, cost: lv => 70 + lv * 55 },
  { id: 'wall',  name: '城牆加厚', desc: lv => `城的血量 +${lv * 2}`,          max: 6, cost: lv => 60 + lv * 50 },
  { id: 'power', name: '小兵訓練', desc: lv => `小兵變強 +${lv * 6}%`,         max: 8, cost: lv => 80 + lv * 60 },
  { id: 'giant', name: '大兵充能', desc: lv => `大兵能量快 ${lv * 6}%`,        max: 6, cost: lv => 90 + lv * 70 },
  { id: 'card',  name: '戰術指揮', desc: lv => `第一張強化卡提早 ${lv * 3} 秒`, max: 4, cost: lv => 120 + lv * 100 },
  { id: 'coin',  name: '戰利品',   desc: lv => `金幣多拿 ${lv * 5}%`,         max: 6, cost: lv => 100 + lv * 70 },
];
// 武器庫：買下來之後可以選開場武器
const ARMORY = { rifle: 0, smg: 300, shotgun: 450, laser: 700, rocket: 900 };

// 存檔（萬軍守城自己一份；第一次開的時候把千軍突圍守城模式的星星搬過來）
const SAVE_KEY = 'siege:v1';
const Save = {
  d: null,
  def() { return { coins: 0, up: { rate: 0, wall: 0, power: 0, giant: 0, card: 0, coin: 0 }, music: true, sfx: true, tips: {}, plays: 0, dstars: {}, speed: 1, dlast: 0 }; },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
    const def = this.def();
    if (!d || typeof d !== 'object') { d = def; this.migrate(d); }
    for (const k in def) if (d[k] === undefined) d[k] = def[k];
    if (!d.up || typeof d.up !== 'object') d.up = def.up;
    for (const k in def.up) if (typeof d.up[k] !== 'number') d.up[k] = 0;
    if (!d.dstars || typeof d.dstars !== 'object') d.dstars = {};
    this.d = d;
    this.save();
    return d;
  },
  // 從千軍突圍搬：守城星星、音樂音效、速度；每顆星送 40 金幣當開張禮
  migrate(d) {
    let r = null;
    try { r = JSON.parse(localStorage.getItem('rush:v1') || 'null'); } catch (e) { r = null; }
    if (!r || typeof r !== 'object') return;
    if (r.dstars && typeof r.dstars === 'object') for (const k in r.dstars) if (+r.dstars[k] > 0) d.dstars[k] = Math.min(3, +r.dstars[k]);
    if (typeof r.music === 'boolean') d.music = r.music;
    if (typeof r.sfx === 'boolean') d.sfx = r.sfx;
    if (typeof r.speed === 'number') d.speed = r.speed;
    for (const k in (r.tips || {})) if (k[0] === 'd') d.tips[k] = 1;
    const stars = Object.values(d.dstars).reduce((a, b) => a + b, 0);
    d.coins = stars * 40; d.migrated = stars;
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); } catch (e) { } },
  unlocked() { return true; },
  dUnlocked(n) { return n === 1 || (this.d.dstars[n - 1] || 0) > 0; },
};

if (typeof module !== 'undefined') module.exports = { SPEC, BUFF, ARMORY, ROAD, PX_MAX, ZSPAWN, BULLET_V, BULLET_RANGE, MAX_SHOOTERS, VIS_CAP, MAX_N, clamp, lerp, rng, WEAPONS, WPN_ORDER, LV_MAX, lvMult, ENEMIES, UPGRADES, Save };
