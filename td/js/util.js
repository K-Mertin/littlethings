'use strict';
// 守塔奇兵：共用小工具（不碰 DOM，方便在 Node 裡做平衡模擬）
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
function mkRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 點到線段距離平方
function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
  t = clamp(t, 0, 1);
  return dist2(px, py, ax + dx * t, ay + dy * t);
}

// 事件掛勾：模擬層只呼叫這些，畫面與音效層自己接上
const Hook = { sfx() {}, shake() {}, banner() {}, ended() {}, unlocked() {}, fx() {} }; // fx：只給畫面特效用，不影響邏輯

// 存檔
const Store = {
  KEY: 'td.keepers.save.v1',
  data: null,
  blank() {
    return { v: 1, levels: {}, meta: {}, endless: {}, seen: {}, diff: 'normal', music: true, sfx: true, seenHelp: false, plays: 0 };
  },
  load() {
    let d = null;
    try { const raw = localStorage.getItem(this.KEY); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
    this.data = Object.assign(this.blank(), d && typeof d === 'object' ? d : {});
    for (const k of ['levels', 'meta', 'endless', 'seen']) if (!this.data[k] || typeof this.data[k] !== 'object') this.data[k] = {};
    return this.data;
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* 私密模式等情況就算了 */ }
  },
};
Store.load();
