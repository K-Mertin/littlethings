// 千軍突圍 — 共用常數、工具、存檔
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
};

// 永久強化
const UPGRADES = [
  { id: 'men',  name: '起始兵力', desc: lv => `開場多 ${lv * 2} 名士兵`, max: 10, cost: lv => 60 + lv * 45 },
  { id: 'dmg',  name: '火力訓練', desc: lv => `傷害 +${lv * 5}%`,        max: 10, cost: lv => 80 + lv * 60 },
  { id: 'rate', name: '射速訓練', desc: lv => `射速 +${lv * 4}%`,        max: 10, cost: lv => 80 + lv * 60 },
];

// 存檔
const SAVE_KEY = 'rush:v1';
const Save = {
  d: null,
  def() { return { stars: {}, coins: 0, up: { men: 0, dmg: 0, rate: 0 }, music: true, sfx: true, tips: {}, best: {}, plays: 0, dstars: {}, speed: 1 }; },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
    const def = this.def();
    if (!d || typeof d !== 'object') d = def;
    for (const k in def) if (d[k] === undefined) d[k] = def[k];
    for (const k in def.up) if (typeof d.up[k] !== 'number') d.up[k] = 0;
    this.d = d;
    return d;
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); } catch (e) { } },
  unlocked(s) { return s === 1 || (this.d.stars[s - 1] || 0) > 0; },
  dUnlocked(n) { return n === 1 || (this.d.dstars[n - 1] || 0) > 0; },
};

if (typeof module !== 'undefined') module.exports = { ROAD, PX_MAX, ZSPAWN, BULLET_V, BULLET_RANGE, MAX_SHOOTERS, VIS_CAP, MAX_N, clamp, lerp, rng, WEAPONS, WPN_ORDER, LV_MAX, lvMult, ENEMIES, UPGRADES, Save };
