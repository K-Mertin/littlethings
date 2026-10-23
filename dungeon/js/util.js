'use strict';
// 深淵地牢：共用工具（亂數、幾何、存檔）
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const DIRS8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const DIRS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const fx_rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a); // 只用在畫面特效

function hashStr(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// sfc32：可序列化的亂數產生器（存檔時記下狀態）
class RNG {
  constructor(seed) {
    if (Array.isArray(seed)) { this.s = seed.slice(); return; }
    const n = typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed));
    this.s = [n ^ 0x9e3779b9, n * 7 + 0x243f6a88 | 0, n ^ 0xb7e15162, (n << 7) ^ 0x1337beef];
    for (let i = 0; i < 16; i++) this.next();
  }
  next() {
    let [a, b, c, d] = this.s;
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0;
    this.s = [a, b, c, d];
    return (t >>> 0) / 4294967296;
  }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  range(a, b) { return a + this.next() * (b - a); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  weighted(list) { // [[weight, value], ...]
    let tot = 0; for (const e of list) tot += e[0];
    let r = this.next() * tot;
    for (const e of list) { r -= e[0]; if (r < 0) return e[1]; }
    return list[list.length - 1][1];
  }
}

// Bresenham 直線（不含起點）
function lineTo(x0, y0, x1, y1) {
  const pts = []; let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, x = x0, y = y0;
  for (let i = 0; i < 200; i++) {
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
    pts.push([x, y]);
  }
  return pts;
}
// 延伸射線：從 (x0,y0) 朝 (x1,y1) 方向走 len 格
function rayTo(x0, y0, x1, y1, len) {
  if (x0 === x1 && y0 === y1) return [];
  const k = Math.ceil(len / Math.max(1, cheb(x0, y0, x1, y1))) + 1;
  return lineTo(x0, y0, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k).slice(0, len);
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}
function randomSeedStr() {
  const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
  for (let i = 0; i < 6; i++) s += cs[(Math.random() * cs.length) | 0];
  return s;
}

const Store = {
  meta: null, set: null,
  defMeta() {
    return {
      v: 1, souls: 0, totalSouls: 0, runs: 0, wins: 0, deepest: 0, kills: 0, bossKills: 0,
      unlocked: { warrior: true, rogue: true, mage: true }, ups: {}, records: [], daily: {}, seen: {},
    };
  },
  load() {
    this.meta = this.defMeta();
    this.set = { music: true, sfx: true, dpad: false, zoom: 0 };
    try {
      const m = JSON.parse(localStorage.getItem('dungeon.meta.v1') || 'null');
      if (m) { Object.assign(this.meta, m); this.meta.unlocked = Object.assign({ warrior: true, rogue: true, mage: true }, m.unlocked || {}); }
      const s = JSON.parse(localStorage.getItem('dungeon.set.v1') || 'null');
      if (s) Object.assign(this.set, s);
    } catch (e) { /* 私密模式時沒有存檔也能玩 */ }
  },
  saveMeta() { try { localStorage.setItem('dungeon.meta.v1', JSON.stringify(this.meta)); } catch (e) { } },
  saveSet() { try { localStorage.setItem('dungeon.set.v1', JSON.stringify(this.set)); } catch (e) { } },
  saveRun(obj) { try { localStorage.setItem('dungeon.run.v1', JSON.stringify(obj)); return true; } catch (e) { return false; } },
  loadRun() { try { return JSON.parse(localStorage.getItem('dungeon.run.v1') || 'null'); } catch (e) { return null; } },
  hasRun() { try { return !!localStorage.getItem('dungeon.run.v1'); } catch (e) { return false; } },
  clearRun() { try { localStorage.removeItem('dungeon.run.v1'); } catch (e) { } },
};
