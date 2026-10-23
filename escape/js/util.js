'use strict';
// 八音盒謎屋：共用小工具與存檔
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = t => { t = Math.floor(t); const m = Math.floor(t / 60), s = t % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; };
const clone = o => JSON.parse(JSON.stringify(o));

const Store = {
  KEY: 'mw-escape-v1',
  data: { prog: {}, cases: {}, cur: null, memo: [], mute: false, seenIntro: false },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.KEY) || 'null');
      if (d && typeof d === 'object') Object.assign(this.data, d);
    } catch (e) { /* 無痕模式等情況：不存檔也能玩 */ }
    this.data.prog = this.data.prog || {}; this.data.cases = this.data.cases || {}; this.data.memo = this.data.memo || [];
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
