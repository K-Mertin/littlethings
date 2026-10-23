'use strict';
// 夜市小吃王：共用工具
const TILE = 16, TAU = Math.PI * 2;
const WEEK_LEN = 24;             // 1 倍速時，一週 = 24 秒
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[(Math.random() * a.length) | 0];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function hash(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// 金額：小的照實寫，大的用「萬」「億」
function money(n) {
  n = Math.round(n); const neg = n < 0; n = Math.abs(n);
  let s;
  if (n >= 1e8) s = (n / 1e8).toFixed(n >= 1e9 ? 1 : 2).replace(/\.?0+$/, '') + '億';
  else if (n >= 1e5) s = (n / 1e4).toFixed(n >= 1e6 ? 0 : 1).replace(/\.0$/, '') + '萬';
  else s = n.toLocaleString('en-US');
  return (neg ? '-' : '') + '$' + s;
}
function num(n) {
  n = Math.round(n);
  if (n >= 1e5) return (n / 1e4).toFixed(n >= 1e6 ? 0 : 1).replace(/\.0$/, '') + '萬';
  return n.toLocaleString('en-US');
}
function shade(hex, f) {
  const p = parseInt(hex.slice(1), 16);
  let r = p >> 16, g = (p >> 8) & 255, b = p & 255;
  if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1);
}

// 設定（音樂/音效開關），跟存檔分開放
const Prefs = {
  d: { music: true, sfx: true, lastSlot: 0 },
  load() { try { const v = JSON.parse(localStorage.getItem('shop.prefs') || 'null'); if (v) Object.assign(this.d, v); } catch (e) { } },
  save() { try { localStorage.setItem('shop.prefs', JSON.stringify(this.d)); } catch (e) { } },
};
