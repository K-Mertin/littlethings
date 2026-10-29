// 彈彈球大冒險 · Bounce Quest
// 橫向捲軸闖關＋解謎。畫面全用 Canvas 2D 程式畫，關卡資料在 levels.js。
(() => {
'use strict';

const T = 40;                 // 一格 40px（世界座標）
const VIEW_H = 600;           // 畫面至少看得到 15 格高
const STEP = 1 / 120;         // 固定物理步長
const PHY = {
  G: 1800, ACC: 1500, AIR: 1050, FRIC: 1700,
  MAX: 260, BIG_MAX: 215, PUSH_MAX: 130,
  JUMP: 620, BIG_JUMP: 570, SPRING: 1050, STOMP: 480,
  COYOTE: 0.1, BUFFER: 0.13,
  ICE_ACC: 0.3, ICE_FRIC: 0.05,
  FAN_LIFT: 3600, FAN_MAXUP: 430, FAN_BIG: 1450,
};
const SIZE = { n: 17, b: 29 };                 // 球的半徑（碰撞用正方形半邊長）
const CH = { A: '#3f8cff', B: '#a46bff', C: '#2fbf71' };     // 機關顏色：藍、紫、綠
const GATE = { A: '|', B: '!', C: '%' };
const CHANS = ['A', 'B', 'C'];
const SOLID_CH = '#BIRQ';                      // 永遠是實心的格子
const LEVELS = window.BOUNCE_LEVELS || [];
const WORLDS = window.BOUNCE_WORLDS || [{ name: '世界', theme: 'grass', color: '#4cc35a' }];

// ───────────── 主題（4 個世界） ─────────────
const THEMES = {
  grass: {
    sky: ['#4fb0ff', '#a9dcff', '#e8f7ff'], sun: '#fff6c8', cloud: '#ffffff', cloudSh: '#d6ebff',
    g: { top: '#66cf5b', topHi: '#a4ec7a', topLo: '#3f9f45', body: '#c08450', bodyDk: '#7c4c2c', bodyLt: '#dba06a', edge: 'rgba(70,36,16,.35)', tuft: '#4fb54c', flower: ['#ff7aa8', '#fff27a', '#ffffff'] },
    brick: 'brick', water: [80, 170, 255], vignette: 0.18,
  },
  coast: {
    sky: ['#2fb2f0', '#9ee5f7', '#fff1d6'], sun: '#fff3c0', cloud: '#ffffff', cloudSh: '#cfeefa',
    g: { top: '#fbe4a6', topHi: '#fff6d6', topLo: '#e0b96b', body: '#e7bb73', bodyDk: '#a8763c', bodyLt: '#f6d699', edge: 'rgba(120,70,20,.3)', tuft: '#5fc27a', flower: ['#ff9d7a', '#ffffff', '#ffd1e0'] },
    brick: 'plank', water: [40, 175, 230], vignette: 0.15,
  },
  cave: {
    sky: ['#120d26', '#221a44', '#33265e'], sun: null, cloud: null,
    g: { top: '#46d6c4', topHi: '#a6fff1', topLo: '#23907f', body: '#4b4275', bodyDk: '#231d40', bodyLt: '#6a60a0', edge: 'rgba(10,5,30,.45)', tuft: '#3cc2b0', flower: ['#7af7ff', '#ff8af0', '#c3a6ff'] },
    brick: 'rock', water: [60, 140, 255], vignette: 0.35, dark: true,
  },
  castle: {
    sky: ['#24194a', '#7b3f86', '#ff9a6b'], sun: '#ffe3b5', cloud: '#ffd9e8', cloudSh: '#d9a3c4',
    g: { top: '#ebe6fa', topHi: '#ffffff', topLo: '#a9a2c9', body: '#8c86ad', bodyDk: '#4c4670', bodyLt: '#a9a3c8', edge: 'rgba(30,20,60,.4)', tuft: null, flower: null },
    brick: 'stone', water: [90, 150, 255], vignette: 0.25, bricks: true,
  },
};

// ───────────── 存檔 ─────────────
const SAVE_KEY = 'bounce.v1';
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s === 'object') return { unlocked: s.unlocked || 1, levels: s.levels || {}, mute: !!s.mute };
  } catch (e) {}
  return { unlocked: 1, levels: {}, mute: false };
}
const save = loadSave();
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// ───────────── 音效（WebAudio 合成） ─────────────
let actx = null, FAST = false;
function tone(f, d = 0.12, type = 'sine', v = 0.15, f2 = null, delay = 0) {
  if (save.mute || FAST) return;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime + delay;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
  } catch (e) {}
}
const SFX = {
  jump: () => tone(360, 0.14, 'square', 0.05, 700),
  ring: () => { tone(880, 0.1, 'sine', 0.14); tone(1320, 0.16, 'sine', 0.12, null, 0.07); },
  star: () => [988, 1319, 1568].forEach((f, i) => tone(f, 0.14, 'triangle', 0.12, null, i * 0.07)),
  die: () => tone(420, 0.45, 'sawtooth', 0.07, 80),
  spring: () => tone(260, 0.28, 'square', 0.05, 1100),
  stomp: () => tone(240, 0.14, 'square', 0.08, 100),
  grow: () => tone(240, 0.32, 'triangle', 0.13, 640),
  shrink: () => tone(640, 0.32, 'triangle', 0.13, 220),
  click: () => { tone(520, 0.06, 'square', 0.06); tone(780, 0.08, 'square', 0.05, null, 0.06); },
  check: () => { tone(660, 0.1, 'triangle', 0.1); tone(990, 0.16, 'triangle', 0.1, null, 0.08); },
  splash: () => tone(520, 0.22, 'sine', 0.06, 140),
  crumble: () => tone(160, 0.16, 'square', 0.04, 70),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.24, 'triangle', 0.12, null, i * 0.1)),
  no: () => tone(200, 0.15, 'square', 0.05, 160),
  sizzle: () => tone(900, 0.3, 'sawtooth', 0.04, 200),
};

// ───────────── 畫布 ─────────────
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, scale = 1, viewW = 0, viewH = 0;
const FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif';
function resize() {
  W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  // 矮螢幕（手機橫放）少看幾格，東西才不會太小
  const vh = H < VIEW_H ? Math.max(440, H) : VIEW_H;
  scale = Math.min(H / vh, W / 480);
  viewW = W / scale; viewH = H / scale;
}
addEventListener('resize', resize); resize();

// ───────────── 小工具 ─────────────
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a, b, k) { const A = hex(a), B2 = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B2[i] - v) * k)).join(',')})`; }
function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
function star5(g, x, y, R, r, rot = 0) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + rot + i * Math.PI / 5, q = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath();
}

// ───────────── 關卡建立 ─────────────
let L = null;   // 目前關卡的執行狀態
let B = null;   // 球
const cam = { x: 0, y: 0, shake: 0 };
let state = 'menu';   // menu | play | win
let paused = false;
const fx = { iris: null };

function buildLevel(idx) {
  const def = LEVELS[idx];
  const rows = def.map.map(s => s.split(''));
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  rows.forEach(r => { while (r.length < w) r.push('.'); });
  const world = WORLDS[def.world || 0] || WORLDS[0];
  const lv = {
    idx, def, w, h, grid: rows, world, theme: world.theme,
    water: new Uint8Array(w * h), lava: new Uint8Array(w * h), depth: new Uint8Array(w * h),
    rings: [], stars: [], springs: [], pumps: [], signs: [], checks: [], switches: [], plates: [],
    boxes: [], enemies: [], plats: [], spikes: [], fans: [], bars: [], crumbles: new Map(),
    door: null, start: null, respawn: null,
    switchOn: { A: false, B: false, C: false }, gateSolid: { A: true, B: true, C: true }, gateAnim: { A: 0, B: 0, C: 0 },
    particles: [], floats: [], t: 0, time: 0, deaths: 0, won: false, winT: 0,
  };
  const KEEP = new Set(['#', 'B', 'I', 'R', 'Q', '^', 'v', ':', '|', '!', '%']);
  const raw = rows.map(r => r.slice());
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const ch = rows[r][c];
    const x = c * T, y = r * T;
    if (ch === '~') lv.water[r * w + c] = 1;
    else if (ch === 'L') lv.lava[r * w + c] = 1;
    switch (ch) {
      case 'P': lv.start = { x: x + T / 2, bottom: y + T, size: 'n' }; break;
      case 'E': lv.door = { x, y: y - T, w: T, h: 2 * T, open: 0 }; break;
      case 'C': lv.checks.push({ x, y, on: false, raise: 0 }); break;
      case 'o': lv.rings.push({ x: x + 20, y: y + 20, got: false, ph: hash(c, r) * 6 }); break;
      case '*': lv.stars.push({ x: x + 20, y: y + 20, got: false, ph: hash(c, r) * 6 }); break;
      case '^': lv.spikes.push({ x: x + 4, y: y + 18, w: 32, h: 22 }); break;
      case 'v': lv.spikes.push({ x: x + 4, y, w: 32, h: 22 }); break;
      case 'S': lv.springs.push({ x, y, sq: 0 }); break;
      case '+': case '-': lv.pumps.push({ x, y, type: ch, ph: hash(c, r) * 6 }); break;
      case 'k': case 'K': case 'y': lv.switches.push({ x, y, ch: ch === 'k' ? 'A' : ch === 'K' ? 'B' : 'C', on: false }); break;
      case '_': case ',': case ';': lv.plates.push({ x, y, ch: ch === '_' ? 'A' : ch === ',' ? 'B' : 'C', pressed: false }); break;
      case 'X': lv.boxes.push({ x, y, w: T, h: T, vy: 0, home: { x, y } }); break;
      case 'e': case 'w': lv.enemies.push({ x: x + 4, y: y + 12, w: 32, h: 28, vy: 0, dir: -1, type: ch, alive: true, deadT: 0, ph: hash(c, r) * 6 }); break;
      case 'b': lv.enemies.push({ x: x + 4, y: y + 9, w: 32, h: 22, vy: 0, dir: -1, type: 'b', alive: true, deadT: 0, ph: hash(c, r) * 6, baseY: y + 9, x0: x + 4 }); break;
      case ':': lv.crumbles.set(r * w + c, { state: 0, t: 0 }); break;
      case 'F': lv.fans.push({ c, r, x, y, spin: 0 }); break;
      case 'R': case 'Q': {
        const long = ch === 'Q';
        lv.bars.push({ cx: x + 20, cy: y + 20, n: long ? 8 : 5, ang: hash(c, r) * 6.28, spd: (c % 2 ? 1 : -1) * (long ? 1.15 : 1.7) });
        break;
      }
      case '=': case 'H': {
        if (c > 0 && raw[r][c - 1] === ch) break;
        let n = 0; while (c + n < w && raw[r][c + n] === ch) n++;
        lv.plats.push({ x, y, w: n * T, h: 16, vx: ch === '=' ? 100 : 0, vy: ch === 'H' ? -75 : 0, dx: 0, dy: 0, vert: ch === 'H' });
        break;
      }
      default:
        if (ch >= '1' && ch <= '9') lv.signs.push({ x, y, text: (def.hints && def.hints[ch]) || '' });
    }
    if (!KEEP.has(ch)) rows[r][c] = '.';
  }
  // 放在水／岩漿裡的物件（平台、圈圈、＋…）：那格也算液體。
  // 規則：周圍兩格以上是液體，或下面是液體而且左右有一邊是液體（重複幾次，連續的物件也能補滿）
  for (const arr of [lv.water, lv.lava]) {
    const at = (c, r) => c >= 0 && c < w && r >= 0 && r < h && arr[r * w + c] === 1;
    for (let pass = 0; pass < 4; pass++) for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const ch = raw[r][c];
      if (ch === '.' || ch === '~' || ch === 'L' || KEEP.has(ch) || at(c, r)) continue;
      const n = at(c, r - 1) + at(c - 1, r) + at(c + 1, r) + at(c, r + 1);
      if (n >= 2 || (at(c, r + 1) && (at(c - 1, r) || at(c + 1, r)))) arr[r * w + c] = 1;
    }
  }
  // 風柱：從風扇往上吹到碰到實心格（最多 7 格）
  for (const f of lv.fans) {
    let top = f.r;
    while (top - 1 >= 0 && f.r - top < 7 && !SOLID_CH.includes(rows[top - 1][f.c])) top--;
    f.y0 = top * T; f.y1 = (f.r + 1) * T;
  }
  // 土的深度（畫地面漸層用）
  for (let c = 0; c < w; c++) { let d = 0; for (let r = 0; r < h; r++) { d = rows[r][c] === '#' ? d + 1 : 0; lv.depth[r * w + c] = Math.min(d, 6); } }
  if (!lv.start) lv.start = { x: T * 1.5, bottom: (h - 3) * T, size: 'n' };
  lv.respawn = { ...lv.start };
  return lv;
}

function makeBall(sp) {
  const hh = SIZE[sp.size];
  return { x: sp.x, y: sp.bottom - hh, h: hh, size: sp.size, vx: 0, vy: 0, grounded: false, coyote: 0, buffer: 0,
    onPlat: null, angle: 0, sq: 0, face: 1, dead: false, deadT: 0, inWater: false, pushing: false, prevBottom: 0,
    blink: 0, groundCh: '.', launched: false, warned: null };
}

// ───────────── 碰撞工具 ─────────────
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const ballRect = (shrink = 0) => ({ x: B.x - B.h + shrink, y: B.y - B.h + shrink, w: 2 * (B.h - shrink), h: 2 * (B.h - shrink) });
function circleRect(cx, cy, r, R) {
  const nx = Math.max(R.x, Math.min(cx, R.x + R.w)), ny = Math.max(R.y, Math.min(cy, R.y + R.h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}
function tileSolid(c, r) {
  if (c < 0 || c >= L.w) return true;
  if (r < 0 || r >= L.h) return false;
  const ch = L.grid[r][c];
  if (ch === '.') return false;
  if (SOLID_CH.includes(ch)) return true;
  if (ch === '|') return L.gateSolid.A;
  if (ch === '!') return L.gateSolid.B;
  if (ch === '%') return L.gateSolid.C;
  if (ch === ':') return L.crumbles.get(r * L.w + c).state < 2;
  return false;
}
function solids(x, y, w, h, withBoxes, self) {
  const out = [];
  const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.001) / T);
  const r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.001) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++)
    if (tileSolid(c, r)) out.push({ x: c * T, y: r * T, w: T, h: T, c, r });
  if (withBoxes) for (const b of L.boxes) if (b !== self && ov({ x, y, w, h }, b)) out.push({ x: b.x, y: b.y, w: b.w, h: b.h, box: b });
  return out;
}
function liquidAt(arr, x, y) {
  const c = Math.floor(x / T); let r = Math.floor(y / T);
  if (c < 0 || c >= L.w || r < 0) return false;
  if (r >= L.h) r = L.h - 1;   // 水池通到地圖底：下面也算水
  return arr[r * L.w + c] === 1;
}
const isWater = (x, y) => liquidAt(L.water, x, y);
function waterFrac() {
  let n = 0; const N = 6;
  for (let i = 0; i < N; i++) if (isWater(B.x, B.y - B.h + (i + 0.5) * (2 * B.h / N))) n++;
  return n / N;
}

// 一般物體（箱子、怪獸）移動
function bodyMoveX(b, dx) {
  b.x += dx;
  let hit = false;
  for (const rc of solids(b.x, b.y, b.w, b.h, true, b)) {
    if (!ov(b, rc)) continue;
    b.x = dx > 0 ? rc.x - b.w : rc.x + rc.w; hit = true;
  }
  return hit;
}
function bodyMoveY(b, dy) {
  b.y += dy;
  let hit = false;
  for (const rc of solids(b.x, b.y, b.w, b.h, true, b)) {
    if (!ov(b, rc)) continue;
    b.y = dy > 0 ? rc.y - b.h : rc.y + rc.h; hit = true;
  }
  return hit;
}

// 球的移動（會推箱子、可以爬上小台階）
function ballMoveX(dx) {
  if (!dx) return;
  B.x += dx;
  for (const rc of solids(B.x - B.h, B.y - B.h, 2 * B.h, 2 * B.h, true)) {
    const br = ballRect();
    const cur = rc.box ? rc.box : rc;
    if (!ov(br, cur)) continue;
    const vOver = Math.min(br.y + br.h, cur.y + cur.h) - Math.max(br.y, cur.y);
    if (rc.box && vOver > 8) {
      const need = dx > 0 ? br.x + br.w - cur.x : br.x - (cur.x + cur.w);
      bodyMoveX(rc.box, need);
      B.pushing = true;
      B.x = dx > 0 ? Math.min(B.x, rc.box.x - B.h) : Math.max(B.x, rc.box.x + rc.box.w + B.h);
      continue;
    }
    const lift = br.y + br.h - cur.y;
    if (lift > 0 && lift <= 10 && B.vy >= -10 && !solids(B.x - B.h, cur.y - 2 * B.h, 2 * B.h, 2 * B.h, true).length) {
      B.y = cur.y - B.h; continue;
    }
    B.x = dx > 0 ? cur.x - B.h : cur.x + cur.w + B.h;
    B.vx = 0;
  }
}
function ballMoveY(dy) {
  const prevBottom = B.y + B.h;
  B.y += dy;
  for (const rc of solids(B.x - B.h, B.y - B.h, 2 * B.h, 2 * B.h, true)) {
    const br = ballRect();
    if (!ov(br, rc)) continue;
    if (dy > 0) { B.y = rc.y - B.h; landed(rc); }
    else { B.y = rc.y + rc.h + B.h; if (B.vy < 0) B.vy = 0; }
  }
  if (dy > 0) for (const p of L.plats) {
    if (prevBottom <= p.y + 0.5 && B.y + B.h >= p.y && B.x + B.h > p.x && B.x - B.h < p.x + p.w) {
      B.y = p.y - B.h; landed(null); B.onPlat = p;
    }
  }
}
function landed(rc) {
  if (B.vy > 420) { B.sq = Math.min(1, B.vy / 1100); puff(B.x, B.y + B.h, 5, 'rgba(255,255,255,.9)', 90); }
  B.vy = 0; B.grounded = true;
  B.groundCh = rc && rc.c !== undefined ? L.grid[rc.r][rc.c] : '.';
  if (B.groundCh === ':') {
    const s = L.crumbles.get(rc.r * L.w + rc.c);
    if (s.state === 0) { s.state = 1; s.t = 0; }
  }
}

function setSize(sz) {
  if (B.size === sz) return true;
  const nh = SIZE[sz], bottom = B.y + B.h, ny = bottom - nh, d = Math.abs(nh - B.h);
  for (const ox of [0, -d, d, -2 * d, 2 * d]) {
    if (!solids(B.x + ox - nh, ny - nh, 2 * nh, 2 * nh, true).length) {
      B.x += ox; B.y = ny; B.h = nh; B.size = sz; return true;
    }
  }
  return false;
}

// ───────────── 特效 ─────────────
function puff(x, y, n, color, spd = 120, g = 300) {
  if (FAST) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random() * 0.8);
    L.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5 + Math.random() * 0.35, t: 0, color, r: 2.5 + Math.random() * 3, g });
  }
}
function floatText(x, y, text, color = '#2b2340') { if (!FAST) L.floats.push({ x, y, text, color, t: 0 }); }

// ───────────── 遊戲流程 ─────────────
function startLevel(idx) {
  L = buildLevel(idx);
  B = makeBall(L.respawn);
  snapCam();
  state = 'play'; paused = false; document.body.classList.add('playing');
  show('menu', false); show('win', false); show('pause', false); show('hud', true);
  $('hudName').textContent = `${levelCode(L.def)} · ${L.def.name}`;
  fx.iris = { t: 0, dir: 1 };
  updateHud();
}
function levelCode(def) {
  const w = def.world || 0;
  const n = LEVELS.filter(l => (l.world || 0) === w).indexOf(def) + 1;
  return `${w + 1}-${n}`;
}
function restartLevel() { if (L) startLevel(L.idx); }
function die() {
  if (B.dead || L.won) return;
  B.dead = true; B.deadT = 0; L.deaths++;
  puff(B.x, B.y, 22, B.size === 'b' ? '#ff8a3d' : '#ef4b3f', 240);
  cam.shake = 0.35;
  SFX.die();
}
function respawn() {
  B = makeBall(L.respawn);
  for (const s of L.crumbles.values()) { s.state = 0; s.t = 0; }
}
function winLevel() {
  L.won = true; L.winT = 0; SFX.win();
  puff(L.door.x + 20, L.door.y + 40, 36, '#ffd84a', 280);
  if (FAST) return;
  const id = L.def.id, got = L.stars.filter(s => s.got).length;
  const prev = save.levels[id] || {};
  save.levels[id] = { stars: Math.max(prev.stars || 0, got), time: Math.min(prev.time || 1e9, Math.round(L.time * 10) / 10) };
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, L.idx + 2));
  writeSave();
}
function showWin() {
  state = 'win'; document.body.classList.remove('playing');
  const got = L.stars.filter(s => s.got).length;
  $('winStars').innerHTML = [0, 1, 2].map(i => i < got ? '<span class="on">★</span>' : '<span class="no">★</span>').join('');
  $('winStats').innerHTML = `<span>⏱ ${fmtTime(L.time)}</span><span>💥 ${L.deaths} 次</span>`;
  $('winTitle').textContent = L.idx === LEVELS.length - 1 ? '全部破關！' : '過關！';
  $('wNext').hidden = L.idx >= LEVELS.length - 1;
  show('win', true);
}
const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ───────────── 每一步物理 ─────────────
const keys = { left: false, right: false, jump: false };
function jumpPress() { if (B) B.buffer = PHY.BUFFER; }

function step(dt) {
  L.t += dt;
  if (!L.won) L.time += dt;

  // 機關：壓板、柵欄
  for (const ch of CHANS) {
    let want = L.switchOn[ch];
    for (const p of L.plates) {
      if (p.ch !== ch) continue;
      const zone = { x: p.x + 2, y: p.y + 28, w: 36, h: 12 };
      p.pressed = (!B.dead && ov(ballRect(), zone)) || L.boxes.some(b => ov(b, zone));
      if (p.pressed) want = true;
    }
    if (want) L.gateSolid[ch] = false;
    else if (!L.gateSolid[ch]) {
      // 有東西卡在柵欄裡就先不要關
      const gch = GATE[ch];
      const inGate = R => {
        for (let r = Math.max(0, Math.floor(R.y / T)); r <= Math.min(L.h - 1, Math.floor((R.y + R.h - 0.01) / T)); r++)
          for (let c = Math.floor(R.x / T); c <= Math.floor((R.x + R.w - 0.01) / T); c++) if (L.grid[r][c] === gch) return true;
        return false;
      };
      if (!(!B.dead && inGate(ballRect(1))) && !L.boxes.some(inGate)) L.gateSolid[ch] = true;
    }
    L.gateAnim[ch] += ((L.gateSolid[ch] ? 0 : 1) - L.gateAnim[ch]) * Math.min(1, dt * 8);
  }

  // 會掉的磚
  for (const [key, s] of L.crumbles) {
    if (s.state === 1) { s.t += dt; if (s.t > 0.45) { s.state = 2; s.t = 0; const c = key % L.w, r = (key / L.w) | 0; puff(c * T + 20, r * T + 10, 8, '#c9965e', 90); SFX.crumble(); } }
    else if (s.state === 2) {
      s.t += dt;
      const c = key % L.w, r = (key / L.w) | 0;
      if (s.t > 3.2 && (B.dead || !ov(ballRect(), { x: c * T, y: r * T, w: T, h: T }))) { s.state = 0; s.t = 0; }
    }
  }

  // 箱子
  for (const b of L.boxes) {
    const inW = isWater(b.x + b.w / 2, b.y + b.h / 2);
    b.vy = Math.min(b.vy + PHY.G * dt, inW ? 90 : 900);
    if (bodyMoveY(b, b.vy * dt)) b.vy = 0;
    if (b.y > L.h * T + 200 || liquidAt(L.lava, b.x + 20, b.y + 30)) {
      puff(b.x + 20, b.y + 20, 10, '#d9a35f', 120);
      b.x = b.home.x; b.y = b.home.y; b.vy = 0;
    }
  }

  // 移動平台（載著球走）
  for (const p of L.plats) {
    p.dx = p.dy = 0;
    if (!p.vert) {
      const nx = p.x + p.vx * dt;
      if (solids(nx, p.y, p.w, p.h, false).length) p.vx = -p.vx; else { p.dx = nx - p.x; p.x = nx; }
    } else {
      const ny = p.y + p.vy * dt;
      // 往上時如果載著球、球頭上卡住了，就提早折返（不會把球擠掉）
      const squash = p.vy < 0 && !B.dead && B.onPlat === p && solids(B.x - B.h, B.y - B.h + (ny - p.y) - 1, 2 * B.h, 2 * B.h, true).length;
      if (ny < 0 || ny + p.h > L.h * T || squash || solids(p.x, ny, p.w, p.h, false).length) p.vy = -p.vy; else { p.dy = ny - p.y; p.y = ny; }
    }
    if (!B.dead && B.onPlat === p) { ballMoveX(p.dx); if (p.dy) ballMoveY(p.dy); }
  }

  // 火焰棒、風扇
  for (const b of L.bars) b.ang += b.spd * dt;
  for (const f of L.fans) f.spin += dt * 18;

  // 怪獸
  for (const e of L.enemies) {
    e.ph += dt * (e.type === 'b' ? 3 : 6);
    if (!e.alive) { e.deadT += dt; continue; }
    if (e.type === 'b') {
      // 蝙蝠在出生點左右 3 格內來回飛
      if (bodyMoveX(e, e.dir * 70 * dt) || Math.abs(e.x - e.x0) > 3 * T && Math.sign(e.x - e.x0) === e.dir) e.dir = -e.dir;
      e.y = e.baseY + Math.sin(e.ph) * 18;
      continue;
    }
    e.vy = Math.min(e.vy + PHY.G * dt, 900);
    const landedE = bodyMoveY(e, e.vy * dt);
    if (landedE) e.vy = 0;
    const spd = e.type === 'w' ? 55 : 65;
    if (bodyMoveX(e, e.dir * spd * dt)) e.dir = -e.dir;
    else if (landedE) {
      const fx2 = e.dir > 0 ? e.x + e.w + 2 : e.x - 2, fy = e.y + e.h + 4;
      if (!tileSolid(Math.floor(fx2 / T), Math.floor(fy / T)) && !L.boxes.some(b => fx2 > b.x && fx2 < b.x + b.w && fy > b.y && fy < b.y + b.h)) e.dir = -e.dir;
    }
    if (e.y > L.h * T + 100 || liquidAt(L.lava, e.x + 16, e.y + e.h)) e.alive = false;
  }

  // 特效
  if (!FAST) {
    for (const p of L.particles) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    L.particles = L.particles.filter(p => p.t < p.life);
    for (const f of L.floats) f.t += dt;
    L.floats = L.floats.filter(f => f.t < 1.4);
  }
  for (const s of L.springs) s.sq = Math.max(0, s.sq - dt * 4);
  for (const c of L.checks) if (c.on) c.raise = Math.min(1, c.raise + dt * 3);
  if (L.door) L.door.open += ((ringsLeft() === 0 ? 1 : 0) - L.door.open) * Math.min(1, dt * 5);

  if (L.won) { L.winT += dt; B.sq *= 0.9; if (L.winT > 1.1 && state === 'play' && !FAST) showWin(); return; }
  if (B.dead) { B.deadT += dt; if (B.deadT > 0.9) respawn(); return; }
  stepBall(dt);
}

function ringsLeft() { let n = 0; for (const r of L.rings) if (!r.got) n++; return n; }

function stepBall(dt) {
  const big = B.size === 'b';
  B.prevBottom = B.y + B.h;
  const f = waterFrac();
  const sunk = !big && f > 0.4;
  if ((f > 0.3) !== B.inWater) {
    B.inWater = f > 0.3;
    if (B.inWater && B.vy > 150 && !FAST) { SFX.splash(); for (let i = 0; i < 10; i++) L.particles.push({ x: B.x + (Math.random() - 0.5) * B.h * 2, y: B.y, vx: (Math.random() - 0.5) * 140, vy: -160 - Math.random() * 160, life: 0.6, t: 0, color: 'rgba(220,245,255,.95)', r: 2.5 + Math.random() * 2.5, g: 900 }); }
  }
  const onIce = B.grounded && B.groundCh === 'I';

  // 左右
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let max = big ? PHY.BIG_MAX : PHY.MAX;
  if (sunk) max *= 0.6;
  if (B.pushing) max = Math.min(max, PHY.PUSH_MAX * (big ? 1.3 : 1));
  const acc = (B.grounded ? PHY.ACC : PHY.AIR) * (onIce ? PHY.ICE_ACC : 1);
  if (dir) {
    B.vx += dir * acc * dt * (B.vx * dir < 0 ? 1.6 : 1);
    B.face = dir;
  } else if (B.grounded) {
    const d = PHY.FRIC * dt * (onIce ? PHY.ICE_FRIC : 1); B.vx = Math.abs(B.vx) <= d ? 0 : B.vx - Math.sign(B.vx) * d;
  } else B.vx *= 1 - (f > 0.3 ? 3 : 0.6) * dt;   // 水裡阻力比較大
  B.vx = Math.max(-max, Math.min(max, B.vx));

  // 跳
  B.buffer -= dt;
  B.coyote = B.grounded ? PHY.COYOTE : B.coyote - dt;
  if (B.buffer > 0) {
    if (big && f > 0.12 && f < 0.85 && !B.grounded) {
      B.vy = -PHY.BIG_JUMP * 0.95; B.buffer = 0; B.coyote = 0; SFX.jump();
    } else if (B.coyote > 0) {
      B.vy = -(big ? PHY.BIG_JUMP : PHY.JUMP) * (sunk ? 0.55 : 1);
      B.buffer = 0; B.coyote = 0; B.sq = -0.35; SFX.jump();
    }
  }

  // 重力、水、風
  let g = PHY.G;
  if (B.vy >= 0) B.launched = false;
  if (!keys.jump && B.vy < 0 && f === 0 && !B.launched) g *= 2.3;   // 放開跳鍵跳得比較矮（彈簧彈起來不算）
  if (sunk) g = PHY.G * 0.4;
  if (big && f > 0) g = PHY.G * (1 - 2.3 * f);        // 大球有浮力
  let inFan = false;
  for (const fn of L.fans) if (B.x > fn.x + 2 && B.x < fn.x + T - 2 && B.y + B.h > fn.y0 && B.y - B.h < fn.y1) inFan = true;
  if (inFan) { g -= big ? PHY.FAN_BIG : PHY.FAN_LIFT; B.launched = true; }
  B.vy += g * dt;
  if (inFan && !big) B.vy = Math.max(B.vy, -PHY.FAN_MAXUP);
  if (f > 0) B.vy *= 1 - (big ? 2.4 : 1.6) * dt;
  if (sunk) B.vy = Math.min(B.vy, 170);
  B.vy = Math.min(B.vy, 950);

  B.grounded = false; B.onPlat = null; B.pushing = false;
  ballMoveX(B.vx * dt);
  ballMoveY(B.vy * dt);
  B.angle += B.vx * dt / B.h;
  B.sq += (0 - B.sq) * Math.min(1, dt * 10);
  if (!FAST) {
    if (sunk && Math.random() < dt * 4) L.particles.push({ x: B.x + (Math.random() - 0.5) * 10, y: B.y - B.h, vx: 0, vy: -60, life: 0.8, t: 0, color: 'rgba(255,255,255,.8)', r: 2 + Math.random() * 2, g: -60 });
    if (inFan && Math.random() < dt * 10) L.particles.push({ x: B.x + (Math.random() - 0.5) * 30, y: B.y + B.h, vx: 0, vy: -200, life: 0.4, t: 0, color: 'rgba(255,255,255,.7)', r: 1.5, g: 0 });
    if (onIce && Math.abs(B.vx) > 150 && Math.random() < dt * 20) L.particles.push({ x: B.x, y: B.y + B.h, vx: -B.vx * 0.2, vy: -30, life: 0.35, t: 0, color: 'rgba(220,250,255,.9)', r: 2, g: 200 });
  }

  triggers();
  if (B.y - B.h > L.h * T + 60) die();
}

function triggers() {
  const br = ballRect();
  // 刺
  for (const s of L.spikes) if (circleRect(B.x, B.y, B.h - 3, s)) return die();
  // 岩漿
  for (let r = Math.floor((B.y - B.h) / T); r <= Math.floor((B.y + B.h) / T); r++)
    for (let c = Math.floor((B.x - B.h) / T); c <= Math.floor((B.x + B.h) / T); c++) {
      if (c < 0 || c >= L.w || r < 0) continue;
      const rr2 = Math.min(r, L.h - 1);
      if (L.lava[rr2 * L.w + c] && circleRect(B.x, B.y, B.h - 2, { x: c * T, y: r * T + 14, w: T, h: T - 14 })) { SFX.sizzle(); puff(B.x, B.y + B.h, 14, '#ffb03a', 160); return die(); }
    }
  // 火焰棒
  for (const b of L.bars) {
    const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
    for (let i = 1; i < b.n; i++) {
      const fx2 = b.cx + ca * i * 15, fy = b.cy + sa * i * 15;
      if ((B.x - fx2) ** 2 + (B.y - fy) ** 2 < (B.h + 6) ** 2) return die();
    }
  }
  // 怪獸
  for (const e of L.enemies) {
    if (!e.alive || !circleRect(B.x, B.y, B.h - 1, e)) continue;
    if (e.type !== 'w' && B.vy > 40 && B.prevBottom <= e.y + 14) {
      e.alive = false; e.deadT = 0;
      B.vy = -(keys.jump ? PHY.JUMP * 0.9 : PHY.STOMP); B.launched = true;
      SFX.stomp(); puff(e.x + e.w / 2, e.y + e.h / 2, 12, e.type === 'b' ? '#5d4a8a' : '#9b6bff');
    } else return die();
  }
  // 彈簧
  for (const s of L.springs) {
    if (B.vy >= 0 && ov(br, { x: s.x + 4, y: s.y + 22, w: 32, h: 18 })) {
      B.vy = -PHY.SPRING; B.launched = true; B.coyote = 0; B.buffer = 0; s.sq = 1; B.sq = -0.5; SFX.spring();
    }
  }
  // 變大變小
  for (const p of L.pumps) {
    if (!ov(br, { x: p.x + 4, y: p.y + 4, w: 32, h: 32 })) { if (B.warned === p) B.warned = null; continue; }
    const want = p.type === '+' ? 'b' : 'n';
    if (B.size === want) continue;
    if (setSize(want)) {
      (want === 'b' ? SFX.grow : SFX.shrink)();
      puff(B.x, B.y, 14, want === 'b' ? '#3fcf8e' : '#4a9dff', 170);
      floatText(B.x, B.y - B.h - 10, want === 'b' ? '變大！' : '變小！');
    } else if (B.warned !== p) { B.warned = p; floatText(B.x, B.y - B.h - 10, '這裡太窄了'); SFX.no(); }
  }
  // 圈圈、星星
  for (const r of L.rings) if (!r.got && (B.x - r.x) ** 2 + (B.y - r.y) ** 2 < (B.h + 12) ** 2) {
    r.got = true; SFX.ring(); puff(r.x, r.y, 12, '#ffd23d', 160);
    const left = ringsLeft(); floatText(r.x, r.y - 24, left ? `還差 ${left} 個` : '門打開了！', '#c98a00'); if (!FAST) updateHud();
  }
  for (const s of L.stars) if (!s.got && (B.x - s.x) ** 2 + (B.y - s.y) ** 2 < (B.h + 14) ** 2) {
    s.got = true; SFX.star(); puff(s.x, s.y, 16, '#fff27a', 190); if (!FAST) updateHud();
  }
  // 存檔旗
  for (const c of L.checks) if (!c.on && ov(br, { x: c.x + 6, y: c.y - T, w: 28, h: 2 * T })) {
    c.on = true; L.respawn = { x: c.x + T / 2, bottom: c.y + T, size: B.size }; SFX.check(); floatText(c.x + 20, c.y - 50, '存檔！', '#2f9e5f');
    puff(c.x + 26, c.y - 20, 10, '#7dffb5', 120);
  }
  // 開關
  for (const s of L.switches) if (!s.on && ov(br, { x: s.x + 4, y: s.y + 6, w: 32, h: 34 })) {
    s.on = true; L.switchOn[s.ch] = true; SFX.click(); floatText(s.x + 20, s.y - 16, '喀！柵欄打開了', CH[s.ch]);
  }
  // 門
  if (L.door && ov(br, { x: L.door.x + 6, y: L.door.y + 6, w: 28, h: 74 })) {
    if (ringsLeft() === 0) winLevel();
    else if (!L.doorMsgT || L.t - L.doorMsgT > 2) { L.doorMsgT = L.t; floatText(L.door.x + 20, L.door.y - 10, `還差 ${ringsLeft()} 個圈圈`, '#c98a00'); SFX.no(); }
  }
}

// ───────────── 攝影機 ─────────────
function camTarget() {
  const tx = B.x - viewW * 0.42 + B.vx * 0.25;
  const ty = B.y - viewH * 0.56;
  return clampCam(tx, ty);
}
// 觸控時畫面底下和左右下角有按鈕，讓攝影機可以多退一點，球才不會被按鈕蓋住
function camPad() {
  const t = state === 'play' && document.body.classList.contains('touch');
  return t ? { l: 150 / scale, r: 150 / scale, b: 120 / scale } : { l: 0, r: 0, b: 0 };
}
function clampCam(tx, ty) {
  const pd = camPad();
  const minX = -pd.l, maxX = L.w * T - viewW + pd.r, maxY = L.h * T - viewH + pd.b;
  tx = maxX <= minX ? (minX + maxX) / 2 : Math.max(minX, Math.min(maxX, tx));
  ty = Math.max(Math.min(0, maxY), Math.min(maxY, ty));
  return [tx, ty];
}
function snapCam() { [cam.x, cam.y] = camTarget(); }

// ───────────── 地形貼圖（預先畫好、快取） ─────────────
const RES = 2, PADT = 14;
const spriteCache = new Map();
function tileSprite(th, ch, mask, depth, v) {
  const key = `${L.theme}|${ch}|${mask}|${depth}|${v}`;
  let cvs = spriteCache.get(key);
  if (cvs) return cvs;
  cvs = document.createElement('canvas');
  cvs.width = (T + 4) * RES; cvs.height = (T + PADT + 2) * RES;
  const g = cvs.getContext('2d');
  g.scale(RES, RES); g.translate(2, PADT);
  const U = mask & 1, D = mask & 2, Lf = mask & 4, R = mask & 8;
  const rnd = rng(v * 7919 + ch.charCodeAt(0) * 31 + mask * 101 + depth + 1);
  if (ch === '#') drawGround(g, th, U, D, Lf, R, depth, v, rnd);
  else if (ch === 'B') drawBrick(g, th, U, D, Lf, R, v, rnd);
  else if (ch === 'I') drawIce(g, U, D, Lf, R, rnd);
  else if (ch === 'R' || ch === 'Q') drawBarBlock(g);
  else if (ch === '^' || ch === 'v') drawSpikes(g, ch === 'v');
  spriteCache.set(key, cvs);
  return cvs;
}
function drawGround(g, th, U, D, Lf, R, depth, v, rnd) {
  const P = th.g;
  const grd = g.createLinearGradient(0, 0, 0, T);
  const k0 = Math.max(0, depth - 1) / 6, k1 = depth / 6;
  grd.addColorStop(0, mix(P.body, P.bodyDk, k0 * 0.75)); grd.addColorStop(1, mix(P.body, P.bodyDk, k1 * 0.75));
  // 跟旁邊的格子重疊一點點，縮放時才不會出現細縫
  g.fillStyle = grd; g.fillRect(Lf ? -1.5 : 0, 0, T + (Lf ? 1.5 : 0) + (R ? 1.5 : 0), T + (D ? 1.5 : 0));
  if (th.bricks) {
    // 城堡：石磚
    g.strokeStyle = 'rgba(40,30,70,.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, 20); g.lineTo(T, 20);
    const o = v % 2 ? 10 : 30; g.moveTo(o, 0); g.lineTo(o, 20); g.moveTo((o + 20) % 40, 20); g.lineTo((o + 20) % 40, 40); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(0, 21.5); g.lineTo(T, 21.5); g.stroke();
  } else {
    for (let i = 0; i < 5; i++) {
      g.fillStyle = rnd() < 0.5 ? P.bodyDk : P.bodyLt; g.globalAlpha = 0.35 + rnd() * 0.3;
      g.beginPath(); g.ellipse(4 + rnd() * 32, 6 + rnd() * 30, 1.6 + rnd() * 2.6, 1.2 + rnd() * 1.8, rnd() * 3, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    if (L.theme === 'cave' && v === 1) {   // 洞窟：小水晶
      g.fillStyle = P.flower[(rnd() * 3) | 0]; g.globalAlpha = 0.85;
      const x = 8 + rnd() * 24, y = 12 + rnd() * 20;
      g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 3, y); g.lineTo(x, y + 4); g.lineTo(x - 3, y); g.fill(); g.globalAlpha = 1;
    }
  }
  if (!Lf) { g.fillStyle = P.edge; g.fillRect(0, 0, 3, T); }
  if (!R) { g.fillStyle = P.edge; g.fillRect(T - 3, 0, 3, T); }
  if (!D) { g.fillStyle = P.edge; g.fillRect(0, T - 4, T, 4); }
  if (!U) {
    const x0 = Lf ? 0 : -1.5, x1 = R ? T : T + 1.5;
    const rl = Lf ? 0 : 8, rr3 = R ? 0 : 8;
    g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, x0, 6, x1 - x0, 12, [0, 0, 6, 6]); g.fill();
    g.fillStyle = P.topLo; rr(g, x0, -3, x1 - x0, 17, [rl, rr3, 5, 5]); g.fill();
    g.fillStyle = P.top; rr(g, x0, -4, x1 - x0, 14, [rl, rr3, 6, 6]); g.fill();
    // 下緣波浪
    g.fillStyle = P.top;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(5 + i * 10, 9.5, 5, 0, Math.PI); g.fill(); }
    g.fillStyle = P.topHi; g.globalAlpha = 0.85; rr(g, x0 + (Lf ? 0 : 4), -3, x1 - x0 - (Lf ? 0 : 4) - (R ? 0 : 4), 3.5, 2); g.fill(); g.globalAlpha = 1;
    if (P.tuft) {
      g.fillStyle = P.tuft;
      const n = 2 + (rnd() * 2 | 0);
      for (let i = 0; i < n; i++) {
        const x = 4 + rnd() * 32, hgt = 4 + rnd() * 5;
        g.beginPath(); g.moveTo(x - 2.5, -3); g.lineTo(x - 1, -3 - hgt); g.lineTo(x + 0.5, -3); g.lineTo(x + 2, -3 - hgt * 0.7); g.lineTo(x + 3, -3); g.fill();
      }
      if (v === 0 && P.flower) {
        const x = 8 + rnd() * 24, col = P.flower[(rnd() * P.flower.length) | 0];
        g.strokeStyle = P.tuft; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, -3); g.lineTo(x, -9); g.stroke();
        g.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k * 1.256; g.beginPath(); g.arc(x + Math.cos(a) * 2.2, -10 + Math.sin(a) * 2.2, 1.7, 0, 7); g.fill(); }
        g.fillStyle = '#ffd23d'; g.beginPath(); g.arc(x, -10, 1.3, 0, 7); g.fill();
      }
    } else if (th.bricks) {
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x0 + 2, 6, x1 - x0 - 4, 1.5);
    }
  }
}
function bevel(g, x, y, w, h, hi, lo, s = 2.5) {
  g.fillStyle = hi; g.fillRect(x, y, w, s); g.fillRect(x, y, s, h);
  g.fillStyle = lo; g.fillRect(x, y + h - s, w, s); g.fillRect(x + w - s, y, s, h);
}
function drawBrick(g, th, U, D, Lf, R, v, rnd) {
  const kind = th.brick;
  if (kind === 'brick') {
    g.fillStyle = '#b8562c'; g.fillRect(0, 0, T, T);
    const rows2 = [[0, 0, 20], [20, 0, 20], [0, 20, 10], [10, 20, 20], [30, 20, 10]];
    for (const [x, y, w] of rows2) {
      const grd = g.createLinearGradient(0, y, 0, y + 20); grd.addColorStop(0, '#f09a5c'); grd.addColorStop(1, '#d6743d');
      g.fillStyle = grd; g.fillRect(x + 1, y + 1, w - 2, 18);
      bevel(g, x + 1, y + 1, w - 2, 18, 'rgba(255,220,180,.55)', 'rgba(110,40,10,.35)', 1.8);
    }
  } else if (kind === 'plank') {
    g.fillStyle = '#7a4a26'; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 3; i++) {
      const y = 1 + i * 13;
      const grd = g.createLinearGradient(0, y, 0, y + 12); grd.addColorStop(0, '#d39a5e'); grd.addColorStop(1, '#a86d3b');
      g.fillStyle = grd; g.fillRect(1, y, T - 2, 12);
      g.strokeStyle = 'rgba(90,50,20,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(4, y + 4 + rnd() * 4); g.bezierCurveTo(14, y + 2, 26, y + 9, 36, y + 5); g.stroke();
      g.fillStyle = '#5a3a20'; g.beginPath(); g.arc(5, y + 6, 1.3, 0, 7); g.arc(35, y + 6, 1.3, 0, 7); g.fill();
    }
  } else if (kind === 'rock') {
    const grd = g.createLinearGradient(0, 0, T, T); grd.addColorStop(0, '#5a4f8a'); grd.addColorStop(1, '#2e2752');
    g.fillStyle = grd; g.fillRect(0, 0, T, T);
    g.strokeStyle = 'rgba(15,8,35,.55)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, 14 + rnd() * 8); g.lineTo(18 + rnd() * 6, 18 + rnd() * 6); g.lineTo(T, 12 + rnd() * 10); g.moveTo(20, 20); g.lineTo(14 + rnd() * 10, T); g.stroke();
    g.fillStyle = 'rgba(160,140,255,.25)'; g.beginPath(); g.moveTo(2, 2); g.lineTo(16, 2); g.lineTo(2, 12); g.fill();
    if (v === 2) { g.fillStyle = '#9ff6ff'; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(28, 26); g.lineTo(32, 18); g.lineTo(35, 27); g.lineTo(31, 33); g.fill(); g.globalAlpha = 1; }
  } else {
    const grd = g.createLinearGradient(0, 0, 0, T); grd.addColorStop(0, '#6f6a92'); grd.addColorStop(1, '#4b4670');
    g.fillStyle = '#35304f'; g.fillRect(0, 0, T, T);
    g.fillStyle = grd; g.fillRect(1, 1, T - 2, T - 2);
    bevel(g, 1, 1, T - 2, T - 2, 'rgba(255,255,255,.22)', 'rgba(10,5,30,.4)', 3);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(8, 10, 10, 3);
  }
  if (!U) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, T, 2); }
  if (!D) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, T - 2, T, 2); }
}
function drawIce(g, U, D, Lf, R, rnd) {
  const grd = g.createLinearGradient(0, 0, T, T); grd.addColorStop(0, '#d9fbff'); grd.addColorStop(1, '#7fd0f0');
  g.fillStyle = grd; g.fillRect(0, 0, T, T);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(6, 0); g.lineTo(16, 0); g.lineTo(0, 16); g.lineTo(0, 6); g.fill();
  g.beginPath(); g.moveTo(26, 0); g.lineTo(30, 0); g.lineTo(0, 30); g.lineTo(0, 26); g.fill();
  g.strokeStyle = 'rgba(70,150,200,.45)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(20 + rnd() * 10, 14); g.lineTo(28, 24); g.lineTo(24 + rnd() * 8, 36); g.stroke();
  if (!U) { g.fillStyle = '#ffffff'; rr(g, Lf ? 0 : -1, -2, T + (Lf ? 0 : 1) + (R ? 0 : 1), 5, 2); g.fill(); }
  if (!D) { g.fillStyle = 'rgba(40,110,160,.35)'; g.fillRect(0, T - 3, T, 3); }
  if (!Lf) { g.fillStyle = 'rgba(40,110,160,.25)'; g.fillRect(0, 0, 2, T); }
  if (!R) { g.fillStyle = 'rgba(40,110,160,.25)'; g.fillRect(T - 2, 0, 2, T); }
}
function drawBarBlock(g) {
  g.fillStyle = '#3c3148'; g.fillRect(0, 0, T, T);
  const grd = g.createLinearGradient(0, 0, 0, T); grd.addColorStop(0, '#7b6a80'); grd.addColorStop(1, '#4b3f55');
  g.fillStyle = grd; g.fillRect(2, 2, T - 4, T - 4);
  bevel(g, 2, 2, T - 4, T - 4, 'rgba(255,255,255,.2)', 'rgba(0,0,0,.35)', 3);
  g.fillStyle = '#ff9a3a'; g.beginPath(); g.arc(20, 20, 6, 0, 7); g.fill();
  g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(20, 20, 3, 0, 7); g.fill();
}
function drawSpikes(g, down) {
  if (down) { g.translate(0, T); g.scale(1, -1); }
  g.fillStyle = '#6c7287'; rr(g, 1, T - 5, T - 2, 5, 2); g.fill();
  for (let i = 0; i < 3; i++) {
    const bx = 1 + i * 12.7;
    const grd = g.createLinearGradient(bx, 0, bx + 12.7, 0); grd.addColorStop(0, '#f4f6fb'); grd.addColorStop(0.5, '#c3c9d8'); grd.addColorStop(1, '#7d8599');
    g.fillStyle = grd; g.beginPath(); g.moveTo(bx, T - 4); g.lineTo(bx + 6.3, 15); g.lineTo(bx + 12.7, T - 4); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(60,64,84,.6)'; g.lineWidth = 1; g.stroke();
  }
}
function maskAt(c, r) {
  const s = (cc, r2) => {
    if (cc < 0 || cc >= L.w) return true;
    if (r2 < 0) return false;
    if (r2 >= L.h) return SOLID_CH.includes(L.grid[L.h - 1][cc]) && L.grid[L.h - 1][cc] !== '.';
    const ch = L.grid[r2][cc]; return ch !== '.' && SOLID_CH.includes(ch);
  };
  return (s(c, r - 1) ? 1 : 0) | (s(c, r + 1) ? 2 : 0) | (s(c - 1, r) ? 4 : 0) | (s(c + 1, r) ? 8 : 0);
}

// ───────────── 背景 ─────────────
function drawBackground(th) {
  const s = scale * DPR;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, cv.height);
  g.addColorStop(0, th.sky[0]); g.addColorStop(0.55, th.sky[1]); g.addColorStop(1, th.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(s, 0, 0, s, 0, 0);
  const groundY = (L.h - 2.5) * T;
  const by = k => groundY - cam.y * (0.55 + k * 0.45);   // 每層的地平線（越近的層移動越接近地面）
  const t = L.t;
  const theme = L.theme;

  // 太陽／月亮
  if (th.sun) {
    const sx = viewW * 0.78 - cam.x * 0.02, sy = 110 + (by(0) - groundY) * 0.2;
    const rg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 160);
    rg.addColorStop(0, 'rgba(255,250,220,.95)'); rg.addColorStop(0.25, 'rgba(255,240,190,.45)'); rg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = rg; ctx.fillRect(sx - 160, sy - 160, 320, 320);
    ctx.fillStyle = th.sun; ctx.beginPath(); ctx.arc(sx, sy, theme === 'castle' ? 34 : 40, 0, 7); ctx.fill();
    if (theme === 'castle') { ctx.fillStyle = th.sky[1]; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(sx + 14, sy - 8, 30, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  }
  if (theme === 'castle' || theme === 'cave') {
    // 星星／發光微塵
    for (let i = 0; i < 60; i++) {
      const x = ((hash(i, 1) * 2000 - cam.x * 0.05) % viewW + viewW) % viewW, y = hash(i, 2) * viewH * (theme === 'cave' ? 1 : 0.55);
      ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * (0.5 + hash(i, 3)) + i));
      ctx.fillStyle = theme === 'cave' ? (i % 3 ? '#7af7ff' : '#ff9af0') : '#fff';
      ctx.beginPath(); ctx.arc(x, y + (theme === 'cave' ? Math.sin(t * 0.6 + i) * 8 : 0), theme === 'cave' ? 1.6 : 1.2, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 雲
  if (th.cloud) {
    for (let i = 0; i < 7; i++) {
      const span = viewW + 500;
      const x = ((i * 397 + t * (6 + i) - cam.x * (0.06 + i * 0.01)) % span + span) % span - 250;
      const y = 50 + (i * 83 % 200) + (by(0) - groundY) * 0.3;
      const sc = 0.7 + (i % 3) * 0.25;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.fillStyle = th.cloudSh; ctx.beginPath(); ctx.ellipse(40, 14, 70, 18, 0, 0, 7); ctx.fill();
      ctx.fillStyle = th.cloud; ctx.beginPath();
      ctx.arc(0, 4, 26, 0, 7); ctx.arc(34, -12, 34, 0, 7); ctx.arc(72, 2, 26, 0, 7); ctx.arc(52, 8, 22, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  const layer = (k, gap, fn) => {
    const ox = -cam.x * k;
    const i0 = Math.floor(-ox / gap) - 2, i1 = i0 + Math.ceil(viewW / gap) + 4;
    for (let i = i0; i <= i1; i++) fn(ox + i * gap, i, by(k));
  };
  if (theme === 'grass') {
    // 遠山
    layer(0.1, 340, (x, i, y) => {
      const hh = 170 + hash(i, 5) * 120;
      ctx.fillStyle = '#9fc9ec'; ctx.beginPath(); ctx.moveTo(x - 220, y + 30); ctx.lineTo(x, y - hh); ctx.lineTo(x + 220, y + 30); ctx.fill();
      const k = 50 / 220;
      ctx.fillStyle = '#f4fbff'; ctx.beginPath(); ctx.moveTo(x - 50, y - hh + hh * k + 4); ctx.lineTo(x, y - hh); ctx.lineTo(x + 50, y - hh + hh * k + 4); ctx.lineTo(x + 20, y - hh + hh * k - 6); ctx.lineTo(x, y - hh + hh * k + 6); ctx.lineTo(x - 22, y - hh + hh * k - 4); ctx.fill();
    });
    ctx.fillStyle = '#9fc9ec'; ctx.fillRect(0, by(0.1) + 29, viewW, viewH);
    // 中間的丘陵＋樹
    layer(0.3, 260, (x, i, y) => {
      const r = 120 + hash(i, 7) * 70;
      ctx.fillStyle = '#8fd48a'; ctx.beginPath(); ctx.arc(x, y + 40, r, Math.PI, 0); ctx.fill();
      for (let k = 0; k < 3; k++) {
        const tx = x - r * 0.6 + k * r * 0.6 + hash(i, k) * 20, ty = y + 40 - Math.sqrt(Math.max(0, r * r - (tx - x) ** 2)) + 6;
        ctx.fillStyle = '#5f9e5a'; ctx.fillRect(tx - 2, ty - 18, 4, 18);
        ctx.fillStyle = '#6fbf68'; ctx.beginPath(); ctx.arc(tx, ty - 26, 14 + hash(i, k + 9) * 6, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(tx - 5, ty - 31, 6, 0, 7); ctx.fill();
      }
    });
    ctx.fillStyle = '#8fd48a'; ctx.fillRect(0, by(0.3) + 40, viewW, viewH);
    layer(0.55, 180, (x, i, y) => { ctx.fillStyle = '#62b562'; ctx.beginPath(); ctx.arc(x, y + 80, 34 + hash(i, 3) * 20, 0, 7); ctx.arc(x + 40, y + 86, 26, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#62b562'; ctx.fillRect(0, by(0.55) + 90, viewW, viewH);
  } else if (theme === 'coast') {
    const sy = by(0.08);
    ctx.fillStyle = '#3fb0d8'; ctx.fillRect(0, sy - 20, viewW, viewH);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 26; i++) { const x = ((hash(i, 4) * 3000 - cam.x * 0.08 + Math.sin(t + i) * 6) % viewW + viewW) % viewW; ctx.fillRect(x, sy - 12 + hash(i, 6) * 60, 18 + hash(i, 8) * 30, 2); }
    layer(0.16, 520, (x, i, y) => { if (hash(i, 2) < 0.5) return; ctx.fillStyle = '#62c3a0'; ctx.beginPath(); ctx.ellipse(x, y - 16, 90, 30, 0, Math.PI, 0); ctx.fill(); palm(x + 10, y - 40, 0.6, '#3e9d7c'); });
    layer(0.4, 300, (x, i, y) => { ctx.fillStyle = '#f3dca4'; ctx.beginPath(); ctx.ellipse(x, y + 70, 200, 60, 0, Math.PI, 0); ctx.fill(); if (hash(i, 9) < 0.6) palm(x + 40, y + 20, 1, '#2f8e62'); });
    ctx.fillStyle = '#f3dca4'; ctx.fillRect(0, by(0.4) + 68, viewW, viewH);
  } else if (theme === 'cave') {
    // 遠處岩壁＋鐘乳石
    layer(0.15, 140, (x, i, y) => {
      ctx.fillStyle = '#2a2150';
      const hh = 80 + hash(i, 1) * 140;
      ctx.beginPath(); ctx.moveTo(x - 50, -10); ctx.lineTo(x, hh); ctx.lineTo(x + 50, -10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y + 60); ctx.lineTo(x + 70, y - 40 - hash(i, 2) * 100); ctx.lineTo(x + 140, y + 60); ctx.fill();
    });
    ctx.fillStyle = '#2a2150'; ctx.fillRect(0, by(0.15) + 58, viewW, viewH);
    // 發光水晶
    layer(0.35, 230, (x, i, y) => {
      if (hash(i, 4) < 0.35) return;
      const col = hash(i, 5) < 0.5 ? '122,247,255' : '255,138,240';
      const cx = x, cy = y + 30;
      const rg = ctx.createRadialGradient(cx, cy - 20, 4, cx, cy - 20, 90);
      rg.addColorStop(0, `rgba(${col},.35)`); rg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = rg; ctx.fillRect(cx - 90, cy - 110, 180, 180);
      for (let k = -1; k <= 1; k++) {
        const hh = 40 + hash(i, k + 6) * 40;
        ctx.fillStyle = `rgba(${col},.75)`; ctx.beginPath(); ctx.moveTo(cx + k * 16 - 8, cy); ctx.lineTo(cx + k * 16 + k * 6, cy - hh); ctx.lineTo(cx + k * 16 + 8, cy); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(cx + k * 16 - 3, cy); ctx.lineTo(cx + k * 16 + k * 6, cy - hh); ctx.lineTo(cx + k * 16, cy); ctx.fill();
      }
    });
    layer(0.5, 170, (x, i, y) => { ctx.fillStyle = '#1b1538'; ctx.beginPath(); ctx.moveTo(x - 60, y + 120); ctx.lineTo(x - 10, y + 40 - hash(i, 3) * 60); ctx.lineTo(x + 40, y + 120); ctx.fill(); });
    ctx.fillStyle = '#1b1538'; ctx.fillRect(0, by(0.5) + 118, viewW, viewH);
  } else {
    // 城堡剪影
    layer(0.1, 420, (x, i, y) => {
      ctx.fillStyle = '#4a2f6e';
      const base = y + 20, tw = 34;
      ctx.fillRect(x - 120, base - 90, 240, 200);
      for (const [dx, hh] of [[-120, 170], [-40, 230], [50, 200], [120, 150]]) {
        ctx.fillRect(x + dx - tw / 2, base - hh, tw, hh);
        ctx.beginPath(); ctx.moveTo(x + dx - tw / 2 - 6, base - hh); ctx.lineTo(x + dx, base - hh - 42); ctx.lineTo(x + dx + tw / 2 + 6, base - hh); ctx.fill();
        ctx.fillStyle = `rgba(255,214,140,${0.6 + 0.3 * Math.sin(t * 2 + dx)})`; ctx.fillRect(x + dx - 4, base - hh + 24, 8, 12); ctx.fillStyle = '#4a2f6e';
      }
      for (let k = 0; k < 8; k++) ctx.fillRect(x - 120 + k * 32, base - 102, 16, 14);
    });
    ctx.fillStyle = '#4a2f6e'; ctx.fillRect(0, by(0.1) + 110, viewW, viewH);
    // 雲海
    layer(0.3, 200, (x, i, y) => { ctx.fillStyle = '#c98bb4'; ctx.beginPath(); ctx.arc(x, y + 60, 60 + hash(i, 2) * 30, 0, 7); ctx.arc(x + 70, y + 76, 50, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#c98bb4'; ctx.fillRect(0, by(0.3) + 80, viewW, viewH);
    layer(0.55, 160, (x, i, y) => { ctx.fillStyle = '#f2b6cf'; ctx.beginPath(); ctx.arc(x, y + 110, 46 + hash(i, 4) * 24, 0, 7); ctx.arc(x + 54, y + 122, 40, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#f2b6cf'; ctx.fillRect(0, by(0.55) + 126, viewW, viewH);
  }
}
function palm(x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#9c7448'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 60); ctx.quadraticCurveTo(-8, 30, 4, 0); ctx.stroke();
  ctx.fillStyle = col;
  for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; ctx.beginPath(); ctx.ellipse(4 + Math.cos(a) * 22, Math.sin(a) * 12 + 6, 26, 6, a, 0, 7); ctx.fill(); }
  ctx.restore();
}

// ───────────── 物件繪圖 ─────────────
function drawBall(x0, y0, r, big, sq, angle, face, blinkK = 1) {
  const sx = 1 + sq * 0.22, sy = 1 - sq * 0.22;
  ctx.save();
  ctx.translate(x0, y0 + r); ctx.scale(sx, sy); ctx.translate(0, -r);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.08, 0, 0, r * 1.05);
  if (big) { g.addColorStop(0, '#ffd0a0'); g.addColorStop(0.35, '#ff9a4a'); g.addColorStop(0.85, '#e0661f'); g.addColorStop(1, '#a8460f'); }
  else { g.addColorStop(0, '#ffb0a6'); g.addColorStop(0.35, '#ff5a4c'); g.addColorStop(0.85, '#d3352a'); g.addColorStop(1, '#8f1f18'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 0.5, 0, 7); ctx.clip();
  ctx.strokeStyle = 'rgba(255,240,230,.55)'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.66, angle, angle + 1.0); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.66, angle + Math.PI, angle + Math.PI + 1.0); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.5, r * 0.32, r * 0.18, -0.6, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(r * 0.1, r * 0.95, r * 0.7, Math.PI * 1.15, Math.PI * 1.85); ctx.fill();
  ctx.restore();
  const ex = face * r * 0.22;
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex + s * r * 0.3, -r * 0.12, r * 0.2, r * 0.27 * blinkK, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.ellipse(ex + s * r * 0.3 + face * r * 0.07, -r * 0.09, r * 0.1, r * 0.15 * blinkK, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + s * r * 0.3 + face * r * 0.04, -r * 0.18, r * 0.04, 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,140,.45)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(ex + s * r * 0.48, r * 0.18, r * 0.12, r * 0.07, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
function ballShadow() {
  const c = Math.floor(B.x / T);
  for (let r = Math.floor((B.y + B.h) / T); r < Math.min(L.h, Math.floor((B.y + B.h) / T) + 6); r++) {
    if (r >= 0 && tileSolid(c, r)) {
      const gy = r * T, d = gy - (B.y + B.h);
      const k = Math.max(0, 1 - d / 200);
      ctx.fillStyle = `rgba(20,10,40,${0.25 * k})`;
      ctx.beginPath(); ctx.ellipse(B.x, gy + 1, B.h * (0.6 + 0.4 * k), 4 * k + 1, 0, 0, 7); ctx.fill();
      return;
    }
  }
}
function drawEnemy(e) {
  const cx = e.x + e.w / 2, by2 = e.y + e.h;
  if (!e.alive) {
    if (e.deadT > 0.6) return;
    ctx.globalAlpha = 1 - e.deadT / 0.6;
    ctx.fillStyle = e.type === 'e' ? '#9b6bff' : e.type === 'b' ? '#5d4a8a' : '#9a6a44';
    ctx.beginPath(); ctx.ellipse(cx, by2 - 4, 18, 5, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; return;
  }
  const wob = Math.sin(e.ph) * 2;
  if (e.type !== 'b') { ctx.fillStyle = 'rgba(20,10,40,.2)'; ctx.beginPath(); ctx.ellipse(cx, by2, 16, 3.5, 0, 0, 7); ctx.fill(); }
  if (e.type === 'e') {
    const g = ctx.createRadialGradient(cx - 6, by2 - 20, 2, cx, by2 - 10, 26);
    g.addColorStop(0, '#d9c2ff'); g.addColorStop(0.5, '#9b6bff'); g.addColorStop(1, '#5e35c4');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, by2 - 1, 17 + wob * 0.5, 24 - wob, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(cx - 7, by2 - 17 + wob, 4.5, 2.8, -0.5, 0, 7); ctx.fill();
  } else if (e.type === 'w') {
    ctx.fillStyle = '#5a3c26';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i + 0.5) * Math.PI / 7;
      ctx.moveTo(cx + Math.cos(a - 0.22) * 15, by2 - 4 + Math.sin(a - 0.22) * 15);
      ctx.lineTo(cx + Math.cos(a) * 28, by2 - 4 + Math.sin(a) * 28);
      ctx.lineTo(cx + Math.cos(a + 0.22) * 15, by2 - 4 + Math.sin(a + 0.22) * 15);
    }
    ctx.fill();
    const g = ctx.createLinearGradient(0, by2 - 20, 0, by2); g.addColorStop(0, '#b07a4f'); g.addColorStop(1, '#7c5234');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, by2 - 4, 17, 15, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2d6b3'; ctx.beginPath(); ctx.ellipse(cx + e.dir * 9, by2 - 8, 8, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.arc(cx + e.dir * 17, by2 - 8, 2.5, 0, 7); ctx.fill();
  } else {
    // 蝙蝠
    const cy = e.y + 11, flap = Math.sin(L.t * 16 + e.ph) * 0.8;
    ctx.fillStyle = '#4a3a78';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + s * 6, cy);
      ctx.quadraticCurveTo(cx + s * 18, cy - 14 * flap - 4, cx + s * 26, cy - 6 * flap);
      ctx.quadraticCurveTo(cx + s * 20, cy + 2, cx + s * 16, cy + 6); ctx.quadraticCurveTo(cx + s * 12, cy + 2, cx + s * 6, cy + 6); ctx.fill();
    }
    const g = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, 12); g.addColorStop(0, '#8a78c4'); g.addColorStop(1, '#3d2f66');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 8, cy - 6); ctx.lineTo(cx - 6, cy - 15); ctx.lineTo(cx - 2, cy - 8); ctx.moveTo(cx + 8, cy - 6); ctx.lineTo(cx + 6, cy - 15); ctx.lineTo(cx + 2, cy - 8); ctx.fill();
    ctx.fillStyle = '#ffde59'; ctx.beginPath(); ctx.arc(cx - 4 + e.dir, cy - 1, 2.6, 0, 7); ctx.arc(cx + 4 + e.dir, cy - 1, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - 3, cy + 5); ctx.lineTo(cx - 1.5, cy + 9); ctx.lineTo(cx, cy + 5); ctx.moveTo(cx + 3, cy + 5); ctx.lineTo(cx + 1.5, cy + 9); ctx.lineTo(cx, cy + 5); ctx.fill();
    return;
  }
  const ey = e.type === 'e' ? by2 - 14 + wob : by2 - 12;
  const ex = e.type === 'e' ? cx + e.dir * 3 : cx + e.dir * 8;
  for (const s of e.type === 'e' ? [-6, 6] : [0]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + s, ey, 4.8, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.arc(ex + s + e.dir * 1.5, ey + 0.5, 2.4, 0, 7); ctx.fill();
  }
  if (e.type === 'e') { ctx.strokeStyle = '#3d1f8a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(ex, ey + 6, 3, 0.2, Math.PI - 0.2); ctx.stroke(); }
}

let bubbleCache = { text: '', lines: [], w: 0 };
function drawBubble(x, y, text, view) {
  ctx.font = `700 16px ${FONT}`;
  if (bubbleCache.text !== text) {
    const maxW = 300, lines = []; let cur = '';
    for (const chr of text) { if (ctx.measureText(cur + chr).width > maxW && cur && !'，。！？、：；）」』…'.includes(chr)) { lines.push(cur); cur = chr; } else cur += chr; }
    if (cur) lines.push(cur);
    bubbleCache = { text, lines, w: Math.max(...lines.map(l => ctx.measureText(l).width)) };
  }
  const { lines } = bubbleCache;
  const w = bubbleCache.w + 30, h = lines.length * 23 + 20;
  const bx = Math.max(view.x + 8, Math.min(view.x + view.w - w - 8, x - w / 2));
  const by2 = Math.max(view.y + 62, y - h - 14);
  ctx.fillStyle = 'rgba(30,20,60,.18)'; rr(ctx, bx + 2, by2 + 4, w, h, 14); ctx.fill();
  ctx.fillStyle = '#fffdf5'; rr(ctx, bx, by2, w, h, 14); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 9, by2 + h - 1); ctx.lineTo(x, by2 + h + 11); ctx.lineTo(x + 9, by2 + h - 1); ctx.fill();
  ctx.strokeStyle = '#e8c08a'; ctx.lineWidth = 2; rr(ctx, bx, by2, w, h, 14); ctx.stroke();
  ctx.fillStyle = '#2b2340'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, bx + 15, by2 + 11 + i * 23));
}

function render(dt) {
  if (!L) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#7cc7ff'; ctx.fillRect(0, 0, cv.width, cv.height); return; }
  const th = THEMES[L.theme] || THEMES.grass;
  drawBackground(th);
  const s = scale * DPR;
  let shx = 0, shy = 0;
  if (cam.shake > 0) { cam.shake = Math.max(0, cam.shake - dt); const k = cam.shake * 18; shx = (Math.random() - 0.5) * k; shy = (Math.random() - 0.5) * k; }
  const cx = Math.round((cam.x + shx) * s) / s, cy = Math.round((cam.y + shy) * s) / s;
  ctx.setTransform(s, 0, 0, s, -cx * s, -cy * s);
  const view = { x: cx, y: cy, w: viewW, h: viewH };
  const c0 = Math.max(0, Math.floor(cx / T) - 1), c1 = Math.min(L.w - 1, Math.ceil((cx + viewW) / T) + 1);
  const r0 = Math.max(0, Math.floor(cy / T) - 1), r1 = Math.min(L.h - 1, Math.ceil((cy + viewH) / T) + 1);
  const vis = (x, w = T) => x + w > cx - T && x < cx + viewW + T;
  const t = L.t;
  const P = th.g;

  // 地圖外：左右是土牆，最底下是土或深淵
  ctx.fillStyle = P.bodyDk;
  if (cx < 0) ctx.fillRect(cx - 2, cy - 2, -cx + 2, viewH + 4);
  if (cx + viewW > L.w * T) ctx.fillRect(L.w * T, cy - 2, cx + viewW - L.w * T + 2, viewH + 4);
  if (cy + viewH > L.h * T) for (let c = c0; c <= c1; c++) {
    if (L.water[(L.h - 1) * L.w + c] || L.lava[(L.h - 1) * L.w + c]) continue;
    const ch = L.grid[L.h - 1][c];
    ctx.fillStyle = ch === '#' ? mix(P.body, P.bodyDk, 0.75) : ch !== '.' && SOLID_CH.includes(ch) ? '#3a3352' : 'rgba(20,10,40,.6)';
    ctx.fillRect(c * T, L.h * T, T + 0.5, cy + viewH - L.h * T + 2);
  }
  {
    const gy = L.h * T - 90;
    const gr = ctx.createLinearGradient(0, gy, 0, L.h * T);
    gr.addColorStop(0, 'rgba(20,10,40,0)'); gr.addColorStop(1, 'rgba(20,10,40,.55)');
    ctx.fillStyle = gr;
    for (let c = c0; c <= c1; c++) if (L.grid[L.h - 1][c] === '.' && !L.water[(L.h - 1) * L.w + c] && !L.lava[(L.h - 1) * L.w + c]) ctx.fillRect(c * T, gy, T + 0.5, 90);
  }

  // 風柱
  for (const f of L.fans) {
    if (!vis(f.x)) continue;
    const gr = ctx.createLinearGradient(0, f.y1, 0, f.y0);
    gr.addColorStop(0, 'rgba(220,245,255,.28)'); gr.addColorStop(1, 'rgba(220,245,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(f.x + 3, f.y0, T - 6, f.y1 - f.y0 - 10);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const len = f.y1 - f.y0, p = ((t * 260 + i * len / 4 + f.c * 37) % len);
      const yy = f.y1 - 12 - p, xx = f.x + 8 + ((i * 9 + f.c * 5) % 24);
      ctx.globalAlpha = Math.min(1, p / 40) * Math.max(0, 1 - p / len);
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + Math.sin(yy * 0.05) * 3, yy - 18); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  }
  // 告示牌
  for (const sg of L.signs) {
    if (!vis(sg.x)) continue;
    ctx.fillStyle = '#8a5a36'; ctx.fillRect(sg.x + 17, sg.y + 14, 6, 26);
    const gr = ctx.createLinearGradient(0, sg.y - 4, 0, sg.y + 20); gr.addColorStop(0, '#f2cf98'); gr.addColorStop(1, '#d9a866');
    ctx.fillStyle = gr; rr(ctx, sg.x + 2, sg.y - 4, 36, 24, 5); ctx.fill();
    ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#6b4a30'; ctx.font = `900 16px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', sg.x + 20, sg.y + 9); ctx.textAlign = 'left';
  }
  // 存檔旗
  for (const c of L.checks) {
    if (!vis(c.x)) continue;
    ctx.fillStyle = '#6d7186'; rr(ctx, c.x + 10, c.y + 34, 20, 6, 3); ctx.fill();
    const gr = ctx.createLinearGradient(c.x + 17, 0, c.x + 22, 0); gr.addColorStop(0, '#e6e9f2'); gr.addColorStop(1, '#8a8fa3');
    ctx.fillStyle = gr; ctx.fillRect(c.x + 17, c.y - 36, 5, 72);
    ctx.fillStyle = c.on ? '#ffd23d' : '#c8ccd8'; ctx.beginPath(); ctx.arc(c.x + 19.5, c.y - 38, 4.5, 0, 7); ctx.fill();
    const fy = c.y + 14 - c.raise * 46;
    ctx.fillStyle = c.on ? '#35c97f' : '#d6d9e3';
    ctx.beginPath(); ctx.moveTo(c.x + 22, fy);
    for (let i = 0; i <= 6; i++) ctx.lineTo(c.x + 22 + i * 4.5, fy + 2 + Math.sin(t * 6 + i * 0.8) * 2 * (i / 6) + i * 0.6);
    for (let i = 6; i >= 0; i--) ctx.lineTo(c.x + 22 + i * 4.5, fy + 18 - i * 0.9 + Math.sin(t * 6 + i * 0.8) * 2 * (i / 6));
    ctx.fill();
  }
  // 門
  if (L.door && vis(L.door.x - 20, 80)) {
    const d = L.door;
    ctx.fillStyle = '#5c5470'; rr(ctx, d.x - 5, d.y - 6, 50, 86, [25, 25, 2, 2]); ctx.fill();
    ctx.fillStyle = '#8f87a6'; rr(ctx, d.x - 2, d.y - 3, 44, 83, [22, 22, 2, 2]); ctx.fill();
    ctx.fillStyle = '#a9a2c0'; rr(ctx, d.x + 14, d.y - 7, 12, 9, 2); ctx.fill();
    if (d.open > 0.5) {
      const g = ctx.createRadialGradient(d.x + 20, d.y + 48, 2, d.x + 20, d.y + 44, 34);
      g.addColorStop(0, '#fff7c2'); g.addColorStop(0.5, '#ffd25a'); g.addColorStop(1, '#ff8a3d');
      ctx.fillStyle = g; rr(ctx, d.x + 4, d.y + 4, 32, 76, [16, 16, 0, 0]); ctx.fill();
      ctx.save(); ctx.translate(d.x + 20, d.y + 46); ctx.rotate(t * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, 8 + k * 6, k, k + 2); ctx.stroke(); }
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(d.x + 20, d.y + 44, 10, d.x + 20, d.y + 44, 80);
      gl.addColorStop(0, `rgba(255,200,90,${0.35 * d.open})`); gl.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = gl; ctx.fillRect(d.x - 60, d.y - 40, 160, 160); ctx.restore();
    } else {
      const g = ctx.createLinearGradient(d.x, 0, d.x + 40, 0); g.addColorStop(0, '#9a6236'); g.addColorStop(1, '#c58750');
      ctx.fillStyle = g; rr(ctx, d.x + 4, d.y + 4, 32, 76, [16, 16, 0, 0]); ctx.fill();
      ctx.strokeStyle = 'rgba(80,40,15,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(d.x + 14.5, d.y + 8); ctx.lineTo(d.x + 14.5, d.y + 80); ctx.moveTo(d.x + 25.5, d.y + 8); ctx.lineTo(d.x + 25.5, d.y + 80); ctx.stroke();
      ctx.fillStyle = '#ffc23d'; rr(ctx, d.x + 11, d.y + 40, 18, 14, 3); ctx.fill();
      ctx.strokeStyle = '#ffc23d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(d.x + 20, d.y + 40, 5.5, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#7a4a10'; ctx.beginPath(); ctx.arc(d.x + 20, d.y + 46, 2, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `900 15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(60,30,10,.6)'; ctx.strokeText(ringsLeft(), d.x + 20, d.y + 24); ctx.fillText(ringsLeft(), d.x + 20, d.y + 24); ctx.textAlign = 'left';
    }
  }
  // 地圖格子
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const ch = L.grid[r][c];
    if (ch === '.') continue;
    const x = c * T, y = r * T;
    if (ch === '#' || ch === 'B' || ch === 'I' || ch === 'R' || ch === 'Q' || ch === '^' || ch === 'v') {
      const m = ch === '^' || ch === 'v' || ch === 'R' || ch === 'Q' ? 0 : maskAt(c, r);
      const spr = tileSprite(th, ch, m, ch === '#' ? L.depth[r * L.w + c] : 0, (hash(c, r) * 3) | 0);
      ctx.drawImage(spr, x - 2, y - PADT, T + 4, T + PADT + 2);
    } else if (ch === ':') {
      const st = L.crumbles.get(r * L.w + c);
      if (st.state === 2) {
        if (st.t > 2.6) { ctx.globalAlpha = 0.3; ctx.strokeStyle = '#a5713f'; ctx.setLineDash([4, 4]); ctx.strokeRect(x + 2, y + 2, T - 4, 18); ctx.setLineDash([]); ctx.globalAlpha = 1; }
        continue;
      }
      const sh = st.state === 1 ? Math.sin(t * 70) * 2 : 0;
      const gr = ctx.createLinearGradient(0, y, 0, y + 22); gr.addColorStop(0, '#f2c58e'); gr.addColorStop(1, '#c98f55');
      ctx.fillStyle = gr; rr(ctx, x + 1 + sh, y + 1, T - 2, 21, 5); ctx.fill();
      ctx.strokeStyle = '#8f5f30'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 12 + sh, y + 3); ctx.lineTo(x + 18 + sh, y + 12); ctx.lineTo(x + 14 + sh, y + 20); ctx.moveTo(x + 28 + sh, y + 4); ctx.lineTo(x + 25 + sh, y + 14); ctx.stroke();
    } else if (ch === '|' || ch === '!' || ch === '%') {
      const k = ch === '|' ? 'A' : ch === '!' ? 'B' : 'C', open = L.gateAnim[k];
      const up = r > 0 ? L.grid[r - 1][c] : '.';
      const hh = T * (1 - open);
      if (up !== ch) { ctx.fillStyle = '#4b4f63'; ctx.fillRect(x + 1, y, T - 2, 6); ctx.fillStyle = CH[k]; ctx.beginPath(); ctx.arc(x + 20, y + 3, 2.5, 0, 7); ctx.fill(); }
      if (hh < 1) continue;
      for (let i = 0; i < 3; i++) {
        const bx = x + 6 + i * 11;
        const gr = ctx.createLinearGradient(bx, 0, bx + 7, 0); gr.addColorStop(0, mix(CH[k], '#ffffff', 0.45)); gr.addColorStop(1, mix(CH[k], '#000000', 0.25));
        ctx.fillStyle = gr; ctx.fillRect(bx, y + (up !== ch ? 6 : 0), 7, hh + 0.5 - (up !== ch ? 6 : 0));
      }
    }
  }
  // 火焰棒
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const b of L.bars) {
    if (!vis(b.cx - b.n * 15, b.n * 30)) continue;
    const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
    for (let i = 1; i < b.n; i++) {
      const fx2 = b.cx + ca * i * 15, fy = b.cy + sa * i * 15;
      const gr = ctx.createRadialGradient(fx2, fy, 1, fx2, fy, 14);
      gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.35, '#ffb02e'); gr.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(fx2, fy, 14, 0, 7); ctx.fill();
    }
  }
  ctx.restore();
  // 風扇
  for (const f of L.fans) {
    if (!vis(f.x)) continue;
    ctx.fillStyle = '#5b6178'; rr(ctx, f.x + 2, f.y + 26, 36, 14, 4); ctx.fill();
    ctx.fillStyle = '#8a91aa'; rr(ctx, f.x + 4, f.y + 24, 32, 6, 3); ctx.fill();
    const w2 = Math.abs(Math.cos(f.spin)) * 14 + 2;
    ctx.fillStyle = '#dfe6f5'; ctx.beginPath(); ctx.ellipse(f.x + 20, f.y + 26, w2, 3, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(f.x + 20, f.y + 26, 18 - w2, 3, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  // 彈簧
  for (const sp of L.springs) {
    if (!vis(sp.x)) continue;
    const hh = 16 - sp.sq * 9;
    ctx.fillStyle = '#5b6178'; rr(ctx, sp.x + 5, sp.y + 34, 30, 6, 2); ctx.fill();
    ctx.strokeStyle = '#c9cfdf'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 4; i++) ctx.lineTo(sp.x + (i % 2 ? 29 : 11), sp.y + 34 - i * hh / 4);
    ctx.stroke();
    const gr = ctx.createLinearGradient(0, sp.y + 34 - hh - 8, 0, sp.y + 34 - hh); gr.addColorStop(0, '#ff8a7a'); gr.addColorStop(1, '#d4302a');
    ctx.fillStyle = gr; rr(ctx, sp.x + 3, sp.y + 34 - hh - 8, 34, 9, 4); ctx.fill();
  }
  // 打氣、洩氣
  for (const p of L.pumps) {
    if (!vis(p.x)) continue;
    const pulse = 1 + Math.sin(t * 4 + p.ph) * 0.06, col = p.type === '+' ? [63, 207, 142] : [74, 157, 255];
    const gl = ctx.createRadialGradient(p.x + 20, p.y + 20, 4, p.x + 20, p.y + 20, 28 * pulse);
    gl.addColorStop(0, `rgba(${col},.5)`); gl.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gl; ctx.fillRect(p.x - 10, p.y - 10, 60, 60);
    const gr = ctx.createRadialGradient(p.x + 15, p.y + 14, 2, p.x + 20, p.y + 20, 16);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, `rgb(${col})`); gr.addColorStop(1, `rgb(${col.map(v => v * 0.6 | 0)})`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x + 20, p.y + 20, 15 * pulse, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(p.x + 13, p.y + 20); ctx.lineTo(p.x + 27, p.y + 20);
    if (p.type === '+') { ctx.moveTo(p.x + 20, p.y + 13); ctx.lineTo(p.x + 20, p.y + 27); }
    ctx.stroke(); ctx.lineCap = 'butt';
  }
  // 開關
  for (const sw of L.switches) {
    if (!vis(sw.x)) continue;
    ctx.fillStyle = '#5b6178'; rr(ctx, sw.x + 7, sw.y + 30, 26, 10, 4); ctx.fill();
    ctx.save(); ctx.translate(sw.x + 20, sw.y + 32); ctx.rotate(sw.on ? 0.7 : -0.7);
    ctx.fillStyle = '#b8bfd2'; ctx.fillRect(-2, -22, 4, 22);
    const gr = ctx.createRadialGradient(-2, -24, 1, 0, -22, 8); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, CH[sw.ch]); gr.addColorStop(1, mix(CH[sw.ch], '#000000', 0.35));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -22, 7, 0, 7); ctx.fill();
    ctx.restore();
  }
  // 壓板
  for (const p of L.plates) {
    if (!vis(p.x)) continue;
    ctx.fillStyle = '#5b6178'; rr(ctx, p.x + 1, p.y + 35, 38, 5, 2); ctx.fill();
    ctx.fillStyle = CH[p.ch]; rr(ctx, p.x + 5, p.y + (p.pressed ? 32 : 28), 30, p.pressed ? 4 : 8, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(p.x + 8, p.y + (p.pressed ? 32 : 28), 24, 1.5);
  }
  // 平台
  for (const p of L.plats) {
    if (!vis(p.x, p.w)) continue;
    const gr = ctx.createLinearGradient(0, p.y, 0, p.y + p.h); gr.addColorStop(0, '#a9b6ff'); gr.addColorStop(1, '#5a68ad');
    ctx.fillStyle = 'rgba(20,10,40,.2)'; rr(ctx, p.x + 2, p.y + 4, p.w, p.h, 6); ctx.fill();
    ctx.fillStyle = gr; rr(ctx, p.x, p.y, p.w, p.h, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(ctx, p.x + 4, p.y + 2, p.w - 8, 3, 2); ctx.fill();
    ctx.fillStyle = '#3f4a85';
    for (let i = 0; i < p.w / T; i++) { ctx.beginPath(); ctx.arc(p.x + 20 + i * T, p.y + 10, 2.3, 0, 7); ctx.fill(); }
    if (p.vert) {
      ctx.fillStyle = '#ffd23d'; const ax = p.x + p.w / 2, ay = p.y + 9, d = p.vy < 0 ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(ax - 5, ay - d * 2); ctx.lineTo(ax, ay + d * 4); ctx.lineTo(ax + 5, ay - d * 2); ctx.fill();
    }
  }
  // 箱子
  for (const b of L.boxes) {
    if (!vis(b.x)) continue;
    const gr = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); gr.addColorStop(0, '#e9b878'); gr.addColorStop(1, '#c28648');
    ctx.fillStyle = '#7a4f28'; rr(ctx, b.x, b.y, b.w, b.h, 4); ctx.fill();
    ctx.fillStyle = gr; rr(ctx, b.x + 3, b.y + 3, b.w - 6, b.h - 6, 2); ctx.fill();
    ctx.strokeStyle = '#8c5a2e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x + 7, b.y + 7); ctx.lineTo(b.x + b.w - 7, b.y + b.h - 7); ctx.moveTo(b.x + b.w - 7, b.y + 7); ctx.lineTo(b.x + 7, b.y + b.h - 7); ctx.stroke();
    ctx.fillStyle = '#c9cfdf'; for (const [ox, oy] of [[5, 5], [35, 5], [5, 35], [35, 35]]) { ctx.beginPath(); ctx.arc(b.x + ox, b.y + oy, 2, 0, 7); ctx.fill(); }
  }
  for (const e of L.enemies) if (vis(e.x)) drawEnemy(e);
  // 圈圈
  for (const r of L.rings) {
    if (r.got || !vis(r.x - 20)) continue;
    const rx = 4 + Math.abs(Math.cos(t * 2.2 + r.ph)) * 11;
    ctx.strokeStyle = '#b27a00'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(r.x, r.y + 1, rx, 15, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.ellipse(r.x, r.y, rx, 15, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(r.x, r.y, rx, 15, 0, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
    if (Math.sin(t * 3 + r.ph * 3) > 0.9) { ctx.fillStyle = '#fff'; star5(ctx, r.x + 8, r.y - 12, 5, 1.5); ctx.fill(); }
  }
  // 星星
  for (const st of L.stars) {
    if (st.got || !vis(st.x - 20)) continue;
    const y = st.y + Math.sin(t * 3 + st.ph) * 3;
    const gl = ctx.createRadialGradient(st.x, y, 2, st.x, y, 30); gl.addColorStop(0, 'rgba(255,240,140,.55)'); gl.addColorStop(1, 'rgba(255,240,140,0)');
    ctx.fillStyle = gl; ctx.fillRect(st.x - 30, y - 30, 60, 60);
    const gr = ctx.createLinearGradient(0, y - 15, 0, y + 15); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(1, '#ffb800');
    ctx.fillStyle = gr; ctx.strokeStyle = '#d18a00'; ctx.lineWidth = 2.2;
    star5(ctx, st.x, y, 15, 7, Math.sin(t * 2 + st.ph) * 0.15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(st.x - 4, y - 5, 3, 1.8, -0.6, 0, 7); ctx.fill();
  }
  // 球
  if (B && !B.dead && state !== 'menu') {
    ballShadow();
    B.blink = (B.blink + 1) % 400;
    drawBall(B.x, B.y, B.h, B.size === 'b', B.sq, B.angle, B.face, B.blink < 8 ? 0.15 : 1);
  }
  drawLiquids(th, c0, c1, r0, r1, t);
  // 粒子
  for (const p of L.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 洞窟：黑暗，只有球附近亮
  if (th.dark && B && state !== 'menu') {
    const gr = ctx.createRadialGradient(B.x, B.y, 90, B.x, B.y, 420);
    gr.addColorStop(0, 'rgba(8,4,24,0)'); gr.addColorStop(1, 'rgba(8,4,24,.6)');
    ctx.fillStyle = gr; ctx.fillRect(cx, cy, viewW, viewH);
  }
  // 飄字
  ctx.font = `900 18px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of L.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, 2.5 - f.t * 1.8));
    ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(f.text, f.x, f.y - f.t * 30);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - f.t * 30);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
  // 告示牌說明
  if (state === 'play' && B && !B.dead) {
    for (const sg of L.signs) {
      if (Math.abs(B.x - (sg.x + 20)) < 46 && Math.abs(B.y - (sg.y + 20)) < 70 && sg.text) { drawBubble(sg.x + 20, sg.y - 6, sg.text, view); break; }
    }
  }
  // 畫面四周暗角＋轉場
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (th.vignette) {
    const vg = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * 0.45, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * 0.75);
    vg.addColorStop(0, 'rgba(20,10,40,0)'); vg.addColorStop(1, `rgba(20,10,40,${th.vignette})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, cv.width, cv.height);
  }
  drawIris(dt, s, cx, cy);
}

function drawLiquids(th, c0, c1, r0, r1, t) {
  for (const kind of ['water', 'lava']) {
    const arr = L[kind];
    const lava = kind === 'lava';
    const wave = x => Math.sin(t * (lava ? 1.6 : 3) + x * 0.08) * (lava ? 2 : 3);
    const path = new Path2D(), surfs = [];
    let any = false;
    for (let c = c0; c <= c1; c++) {
      let r = r0;
      while (r <= r1) {
        if (!arr[r * L.w + c]) { r++; continue; }
        const top = r, surf = r === 0 || !arr[(r - 1) * L.w + c];
        while (r <= r1 && arr[r * L.w + c]) r++;
        const x = c * T, y = top * T, bot = r * T + (r >= L.h ? viewH : 0);
        any = true;
        if (surf) {
          path.moveTo(x, bot);
          for (let i = 0; i <= 8; i++) path.lineTo(x + i * 5, y + 5 + wave(x + i * 5));
          path.lineTo(x + T, bot); path.closePath();
          surfs.push([x, y]);
        } else path.rect(x, y, T, bot - y);
      }
    }
    if (!any) continue;
    if (!lava) {
      const [R, G2, B2] = th.water;
      ctx.fillStyle = `rgba(${R},${G2},${B2},.48)`; ctx.fill(path);
      ctx.save(); ctx.clip(path);
      ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2;
      for (let c = c0; c <= c1; c += 2) for (let r = r0; r <= r1; r++) {
        if (!arr[r * L.w + c]) continue;
        const x = c * T, y = r * T;
        ctx.beginPath(); ctx.moveTo(x, y + 20 + Math.sin(t * 1.5 + c + r) * 6); ctx.quadraticCurveTo(x + 30, y + 10 + Math.cos(t * 1.3 + r) * 8, x + 80, y + 24 + Math.sin(t + c) * 6); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.2;
    } else {
      ctx.save();
      const gr = ctx.createLinearGradient(0, cam.y, 0, cam.y + viewH);
      gr.addColorStop(0, '#ff9a2e'); gr.addColorStop(1, '#c2280f');
      ctx.fillStyle = gr; ctx.fill(path);
      ctx.clip(path);
      ctx.fillStyle = 'rgba(255,230,120,.5)';
      for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
        if (!arr[r * L.w + c] || hash(c, r) < 0.5) continue;
        const p = ((t * 0.6 + hash(c, r + 9)) % 1);
        ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(c * T + 10 + hash(r, c) * 20, r * T + 34 - p * 30, 2 + p * 4, 0, 7); ctx.fill();
      }
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [x, y] of surfs) {
        const gl = ctx.createLinearGradient(0, y - 40, 0, y + 10); gl.addColorStop(0, 'rgba(255,120,40,0)'); gl.addColorStop(1, 'rgba(255,140,40,.35)');
        ctx.fillStyle = gl; ctx.fillRect(x, y - 40, T, 50);
      }
      ctx.restore();
      ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2.5;
    }
    for (const [x, y] of surfs) { ctx.beginPath(); for (let i = 0; i <= 8; i++) ctx.lineTo(x + i * 5, y + 5 + wave(x + i * 5)); ctx.stroke(); }
  }
}

function drawIris(dt, s, cx, cy) {
  const ir = fx.iris;
  if (!ir) return;
  ir.t += dt;
  const dur = 0.55;
  let k = Math.min(1, ir.t / dur);
  if (ir.dir < 0) k = 1 - k;
  const ex = ir.x != null ? ir.x : B.x, ey = ir.y != null ? ir.y : B.y;
  const px = (ex - cx) * s, py = (ey - cy) * s;
  const maxR = Math.hypot(Math.max(px, cv.width - px), Math.max(py, cv.height - py));
  const rad = maxR * (k * k);
  ctx.fillStyle = '#1d1636';
  ctx.beginPath(); ctx.rect(0, 0, cv.width, cv.height); ctx.arc(px, py, Math.max(0, rad), 0, Math.PI * 2, true); ctx.fill();
  if (ir.dir > 0 && ir.t > dur) fx.iris = null;
}

// ───────────── HUD 與畫面 ─────────────
const $ = id => document.getElementById(id);
function show(id, on) { $(id).hidden = !on; }
function updateHud() {
  const total = L.rings.length;
  $('hudRings').hidden = total === 0;
  $('ringTxt').textContent = `${total - ringsLeft()}/${total}`;
  $('starTxt').textContent = `${L.stars.filter(s => s.got).length}/${L.stars.length}`;
}
function buildMenu() {
  const box = $('levels'); box.innerHTML = '';
  let totalStars = 0;
  WORLDS.forEach((wd, wi) => {
    const col = document.createElement('div'); col.className = 'world'; col.style.setProperty('--wc', wd.color);
    col.innerHTML = `<div class="wh"><b>${wi + 1}</b><span>${wd.name}<small>${wd.en || ''}</small></span></div>`;
    LEVELS.forEach((lv, i) => {
      if ((lv.world || 0) !== wi) return;
      const locked = i + 1 > save.unlocked;
      const got = (save.levels[lv.id] || {}).stars || 0; totalStars += got;
      const b = document.createElement('button');
      b.className = 'lv' + (locked ? ' lock' : '') + (i + 1 === save.unlocked ? ' cur' : '');
      b.innerHTML = `<b>${locked ? '🔒' : levelCode(lv)}</b><span>${lv.name}</span><i>${[0, 1, 2].map(k => k < got ? '★' : '<span class="no">★</span>').join('')}</i>`;
      b.onclick = () => { if (locked) { SFX.no(); return; } SFX.click(); startLevel(i); };
      col.appendChild(b);
    });
    box.appendChild(col);
  });
  $('totalStars').textContent = `★ ${totalStars} / ${LEVELS.length * 3}`;
}
function goMenu() {
  state = 'menu'; paused = false; document.body.classList.remove('playing');
  show('hud', false); show('win', false); show('pause', false); show('menu', true);
  buildMenu();
  const bg = Math.max(0, Math.min(LEVELS.length - 1, save.unlocked - 1));
  L = buildLevel(bg); B = makeBall(L.start); B.dead = true; L.signs = [];
  cam.x = 0; cam.y = clampCam(0, 1e9)[1]; fx.iris = null;
}
function setPause(on) {
  if (state !== 'play') return;
  paused = on; show('pause', on);
  if (on) { keys.left = keys.right = keys.jump = false; document.querySelectorAll('.tb.on').forEach(b => b.classList.remove('on')); }
}
function syncSound() { $('bSound').textContent = save.mute ? '🔇' : '🔊'; }

$('bRestart').onclick = () => { restartLevel(); };
$('bPause').onclick = () => setPause(!paused);
$('bSound').onclick = () => { save.mute = !save.mute; writeSave(); syncSound(); };
$('pResume').onclick = () => setPause(false);
$('pRestart').onclick = () => restartLevel();
$('pMenu').onclick = () => goMenu();
$('wMenu').onclick = () => goMenu();
$('wAgain').onclick = () => restartLevel();
$('wNext').onclick = () => { if (L.idx < LEVELS.length - 1) startLevel(L.idx + 1); };
syncSound();

// ───────────── 輸入 ─────────────
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyK: 'jump' };
addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (k) {
    e.preventDefault();
    if (state === 'play' && !paused) { if (k === 'jump' && !keys.jump) jumpPress(); keys[k] = true; }
    return;
  }
  if (e.code === 'KeyR' && state === 'play') restartLevel();
  else if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'play') setPause(!paused); }
  else if (e.code === 'Enter') {
    if (state === 'menu') startLevel(Math.min(LEVELS.length, save.unlocked) - 1);
    else if (state === 'win') (L.idx < LEVELS.length - 1 ? startLevel(L.idx + 1) : goMenu());
    else if (paused) setPause(false);
  }
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => { keys.left = keys.right = keys.jump = false; if (state === 'play') setPause(true); });

const markTouch = () => document.body.classList.add('touch');
if (matchMedia('(pointer: coarse)').matches) markTouch();
addEventListener('touchstart', markTouch, { passive: true });
document.querySelectorAll('.tb').forEach(btn => {
  const k = btn.dataset.k;
  const down = e => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (err) {} if (state !== 'play' || paused) return; if (k === 'jump' && !keys.jump) jumpPress(); keys[k] = true; btn.classList.add('on'); };
  const up = e => { e.preventDefault(); keys[k] = false; btn.classList.remove('on'); };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
  btn.addEventListener('contextmenu', e => e.preventDefault());
});

// ───────────── 主迴圈 ─────────────
let last = performance.now(), accT = 0, testHold = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play' && !paused && !testHold) {
    accT += dt;
    while (accT >= STEP) { step(STEP); accT -= STEP; }
    if (!B.dead) {
      const [tx, ty] = camTarget(); const k = Math.min(1, dt * 6);
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    }
    if (L.won && !fx.iris && L.winT > 0.4) fx.iris = { t: 0, dir: -1, x: L.door.x + 20, y: L.door.y + 44 };
  } else if (state === 'menu' && L) {
    L.t += dt;
    for (const b of L.bars) b.ang += b.spd * dt;
    for (const f of L.fans) f.spin += dt * 18;
    const span = Math.max(1, L.w * T - viewW);
    const p = (L.t * 25) % (span * 2);
    cam.x = p < span ? p : span * 2 - p;
  } else if (state === 'win' && L) { L.t += dt; }
  if (fx.iris && fx.iris.dir < 0 && state !== 'play') fx.iris = null;
  render(dt);
  requestAnimationFrame(frame);
}

// ───────────── 給測試／求解器用的小把手 ─────────────
function snapshot() {
  return {
    B: { ...B, onPlat: B.onPlat ? L.plats.indexOf(B.onPlat) : -1, warned: B.warned ? L.pumps.indexOf(B.warned) : -1 },
    rings: L.rings.map(r => r.got), stars: L.stars.map(s => s.got),
    boxes: L.boxes.map(b => [b.x, b.y, b.vy]),
    enemies: L.enemies.map(e => [e.x, e.y, e.vy, e.dir, e.alive, e.deadT, e.ph]),
    plats: L.plats.map(p => [p.x, p.y, p.vx, p.vy, p.dx, p.dy]),
    crumbles: [...L.crumbles.values()].map(s => [s.state, s.t]),
    bars: L.bars.map(b => b.ang),
    sw: { ...L.switchOn }, gs: { ...L.gateSolid }, checks: L.checks.map(c => c.on), respawn: { ...L.respawn },
    t: L.t, won: L.won, deaths: L.deaths,
  };
}
function restore(s) {
  B = { ...s.B, onPlat: s.B.onPlat >= 0 ? L.plats[s.B.onPlat] : null, warned: s.B.warned >= 0 ? L.pumps[s.B.warned] : null };
  s.rings.forEach((g, i) => { L.rings[i].got = g; }); s.stars.forEach((g, i) => { L.stars[i].got = g; });
  s.boxes.forEach(([x, y, vy], i) => Object.assign(L.boxes[i], { x, y, vy }));
  s.enemies.forEach(([x, y, vy, dir, alive, deadT, ph], i) => Object.assign(L.enemies[i], { x, y, vy, dir, alive, deadT, ph }));
  s.plats.forEach(([x, y, vx, vy, dx, dy], i) => Object.assign(L.plats[i], { x, y, vx, vy, dx, dy }));
  let i = 0; for (const c of L.crumbles.values()) { [c.state, c.t] = s.crumbles[i++]; }
  s.bars.forEach((a, k) => { L.bars[k].ang = a; });
  L.switchOn = { ...s.sw }; L.gateSolid = { ...s.gs }; s.checks.forEach((o, k) => { L.checks[k].on = o; }); L.respawn = { ...s.respawn };
  L.t = s.t; L.won = s.won; L.deaths = s.deaths;
}
window.__bounce = {
  get L() { return L; }, get B() { return B; }, get state() { return state; }, keys, start: startLevel,
  step: n => { for (let i = 0; i < n; i++) step(STEP); }, jump: jumpPress, save,
  set hold(v) { testHold = v; }, set fast(v) { FAST = v; }, snap: () => snapCam(), snapshot, restore, STEP,
};

goMenu();
requestAnimationFrame(frame);
})();
