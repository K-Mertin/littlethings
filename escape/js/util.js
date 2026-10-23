'use strict';
// 八音盒謎屋：共用小工具與存檔
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = t => { t = Math.floor(t); const m = Math.floor(t / 60), s = t % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; };
const clone = o => JSON.parse(JSON.stringify(o));
// 可重現的亂數（重玩時的謎題變化用）
function makeRng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rInt = (r, a, b) => a + Math.floor(r() * (b - a + 1));
function shuffle(arr, r = Math.random) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const hv = (h, s) => typeof h === 'function' ? h(s) : h; // 提示可以是固定文字或依謎題變化的函式

// 每日謎題：同一天大家拿到同一間房、同一組答案
const Daily = {
  today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  shift(day, n) { const [y, m, d] = day.split('-').map(Number), t = new Date(y, m - 1, d + n); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); },
  seed(day, salt = '') { let h = 2166136261; for (const ch of day + '|' + salt) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; },
  // 從已經破關的房間裡挑一間（第一次玩以前沒有每日謎題）
  pick(day = this.today()) { const h = this.rec().hist[day], fix = h && ROOMS.find(r => r.id === h.id); if (fix) return { day, room: fix }; const done = ROOMS.filter(r => r.vary && (Store.data.prog[r.id] || {}).done); if (!done.length) return null; return { day, room: done[this.seed(day, 'room') % done.length] }; },
  rec() { const d = Store.data.daily; return d && typeof d === 'object' ? d : (Store.data.daily = { streak: 0, best: 0, last: '', hist: {} }); },
};

const Store = {
  KEY: 'mw-escape-v1',
  data: { prog: {}, cases: {}, cur: null, memo: [], mute: false, seenIntro: false, notes: {}, ach: {}, chal: {}, stat: {}, ver: 2 },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.KEY) || 'null');
      if (d && typeof d === 'object') Object.assign(this.data, d);
    } catch (e) { /* 無痕模式等情況：不存檔也能玩 */ }
    const D = this.data;
    ['prog', 'cases', 'notes', 'ach', 'chal', 'stat'].forEach(k => { if (!D[k] || typeof D[k] !== 'object' || Array.isArray(D[k])) D[k] = {}; });
    if (!Array.isArray(D.memo)) D.memo = [];
    D.ver = 2;
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { } },
};

// 星等：提示越少、時間越短越好
function starsFor(time, hints, par, miss) {
  let st = 3;
  if (hints >= 2) st--;
  if (hints >= 5) st--;
  if (time > par) st--;
  if (miss >= 3) st--;
  return clamp(st, 1, 3);
}
function starStr(n) { let s = ''; for (let i = 0; i < 3; i++) s += i < n ? '★' : '<i>★</i>'; return s; }

// 環境動畫節拍器：把背景小動畫（星光、灰塵、齒輪、貓尾巴……）改成每秒更新固定幾次，而且同一格一起更新。
// 這樣瀏覽器每秒只要重畫少少幾次，手機（和沒有顯示卡的電腦）就不會因為一堆小動畫而卡頓。fps=0 表示交給瀏覽器全速播放。
const Amb = {
  fps: 0, _iv: 0, _last: 0, sel: '.fxi',
  set(fps) {
    if (fps === this.fps) return; this.fps = fps;
    clearInterval(this._iv); this._iv = 0;
    const list = () => { try { return document.getAnimations().filter(a => { const t = a.effect && a.effect.target; return t && t.closest && t.closest(this.sel); }); } catch (e) { return []; } };
    if (!fps) { list().forEach(a => { if (a.playState === 'paused' && a._amb) { a._amb = 0; a.play(); } }); return; }
    this._last = performance.now();
    this._iv = setInterval(() => {
      const now = performance.now(), dt = Math.min(250, now - this._last); this._last = now;
      if (document.hidden) return;
      list().forEach(a => {
        if (!a._amb) { if (a.playState !== 'running') return; a.pause(); a._amb = 1; return; }
        if (a.playState === 'paused') a.currentTime = (a.currentTime || 0) + dt;
      });
    }, 1000 / fps);
  },
};
