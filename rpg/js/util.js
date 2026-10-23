'use strict';
// 曉鐘傳說：共用工具、存檔、輸入
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[(Math.random() * a.length) | 0];
const sleep = ms => new Promise(r => setTimeout(r, ms / (window.__speed || 1)));

function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function seeded(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// 顏色工具
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1); }
function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
// 有色相偏移的亮部與暗部：亮部偏暖、暗部偏冷
function lighten(c, t) { return mix(mix(c, '#fff8e0', t), c, 0.15); }
function darken(c, t) { return mix(c, '#1a1038', t); }

// 設定（與存檔分開）
const Store = {
  data: { music: true, sfx: true, textSpeed: 1, lastSlot: 0 },
  load() { try { const d = JSON.parse(localStorage.getItem('dawnbell.cfg') || 'null'); if (d) Object.assign(this.data, d); } catch (e) { } },
  save() { try { localStorage.setItem('dawnbell.cfg', JSON.stringify(this.data)); } catch (e) { } },
};
const SaveIO = {
  key: n => 'dawnbell.slot' + n,
  read(n) { try { const s = localStorage.getItem(this.key(n)); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  write(n, obj) { try { localStorage.setItem(this.key(n), JSON.stringify(obj)); return true; } catch (e) { return false; } },
  remove(n) { try { localStorage.removeItem(this.key(n)); } catch (e) { } },
};

// 輸入：鍵盤 + 觸控 d-pad + A/B
const Input = {
  keys: Object.create(null), held: { up: 0, down: 0, left: 0, right: 0, ok: 0, cancel: 0 },
  touchHeld: { up: 0, down: 0, left: 0, right: 0, ok: 0, cancel: 0 },
  prev: {}, pressed: {}, latch: {}, rep: { t: 0, dir: null }, dirPress: null, dir: null, lastDirKey: null,
  taps: [], touchMode: false, anyKey: false,
  map: {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'ok', Enter: 'ok', Space: 'ok', NumpadEnter: 'ok', KeyX: 'cancel', Escape: 'cancel', Backspace: 'cancel',
  },
  init() {
    addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const a = this.map[e.code];
      if (a) { e.preventDefault(); if (!this.keys[e.code]) { this.latch[a] = 1; if ('up down left right'.includes(a)) this.lastDirKey = a; } this.keys[e.code] = 1; }
      if (e.code === 'KeyM') { Game.toggleMute(); }
      this.anyKey = true;
      if (this.touchMode && a) this.setTouch(false);
    });
    addEventListener('keyup', e => { this.keys[e.code] = 0; });
    addEventListener('blur', () => { this.keys = Object.create(null); for (const k in this.touchHeld) this.touchHeld[k] = 0; });
  },
  setTouch(on) { if (this.touchMode === on) return; this.touchMode = on; document.body.classList.toggle('touch', on); Game.resize(); },
  frame(dt) {
    const h = this.held;
    for (const k in h) h[k] = 0;
    for (const c in this.keys) if (this.keys[c]) h[this.map[c]] = 1;
    for (const k in this.touchHeld) if (this.touchHeld[k]) h[k] = 1;
    for (const k in h) { this.pressed[k] = (h[k] && !this.prev[k]) || !!this.latch[k]; this.prev[k] = h[k]; }
    for (const k in this.latch) { if (this.latch[k] && !h[k] && 'up down left right'.includes(k)) { h[k] = 1; } }
    // 目前方向（最後按下的優先）
    let d = null;
    if (this.lastDirKey && h[this.lastDirKey]) d = this.lastDirKey;
    else for (const k of ['up', 'down', 'left', 'right']) if (h[k]) { d = k; break; }
    if (!d) for (const k of ['up', 'down', 'left', 'right']) if (this.latch[k]) { d = k; break; }
    this.latch = {};
    this.dir = d;
    this.dirPress = null;
    if (d) {
      if (this.rep.dir !== d) { this.rep.dir = d; this.rep.t = 0.34; this.dirPress = d; }
      else { this.rep.t -= dt; if (this.rep.t <= 0) { this.rep.t = 0.085; this.dirPress = d; } }
    } else this.rep.dir = null;
  },
  consume() { for (const k in this.pressed) this.pressed[k] = false; this.dirPress = null; this.taps.length = 0; },
};

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
