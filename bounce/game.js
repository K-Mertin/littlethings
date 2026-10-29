// 彈彈球大冒險 · Bounce Quest
// 橫向捲軸闖關＋解謎。畫面全用 Canvas 2D 形狀畫，關卡資料在 levels.js。
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
};
const SIZE = { n: 17, b: 29 };      // 球的半徑（碰撞用正方形半邊長）
const CH = { A: '#4a9dff', B: '#9b6bff' };  // 機關顏色：藍、紫
const THEMES = {
  day:  { sky: ['#6fc0ff', '#d6f1ff'], far: '#a8dcb0', near: '#7fcb88', dirt: '#c0814f', dirt2: '#a86b3e', grass: '#5bc35a', grass2: '#47a847', cloud: '#ffffff' },
  dusk: { sky: ['#ff9a76', '#ffe2b3'], far: '#e3a9c8', near: '#c98bb8', dirt: '#b7774f', dirt2: '#9a603c', grass: '#7fc25a', grass2: '#64a646', cloud: '#fff3e6' },
  sea:  { sky: ['#5fd0ea', '#dcfbff'], far: '#9fe0d0', near: '#6ccab3', dirt: '#d2a26a', dirt2: '#b98a54', grass: '#4fc79a', grass2: '#3aa982', cloud: '#ffffff' },
};
const LEVELS = window.BOUNCE_LEVELS || [];

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
let actx = null;
function tone(f, d = 0.12, type = 'sine', v = 0.15, f2 = null, delay = 0) {
  if (save.mute) return;
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
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, null, i * 0.11)),
  no: () => tone(200, 0.15, 'square', 0.05, 160),
};

// ───────────── 畫布 ─────────────
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, scale = 1, viewW = 0, viewH = 0;
function resize() {
  W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  scale = Math.min(H / VIEW_H, W / 480);
  viewW = W / scale; viewH = H / scale;
}
addEventListener('resize', resize); resize();

// ───────────── 關卡建立 ─────────────
let L = null;   // 目前關卡的執行狀態
let B = null;   // 球
const cam = { x: 0, y: 0 };
let state = 'menu';   // menu | play | win
let paused = false;

function buildLevel(idx) {
  const def = LEVELS[idx];
  const rows = def.map.map(s => s.split(''));
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  rows.forEach(r => { while (r.length < w) r.push('.'); });
  const lv = {
    idx, def, w, h, grid: rows, water: new Uint8Array(w * h),
    rings: [], stars: [], springs: [], pumps: [], signs: [], checks: [], switches: [], plates: [],
    boxes: [], enemies: [], plats: [], spikes: [], crumbles: new Map(),
    door: null, start: null, respawn: null,
    switchOn: { A: false, B: false }, gateSolid: { A: true, B: true }, gateAnim: { A: 0, B: 0 },
    particles: [], floats: [], t: 0, time: 0, deaths: 0, won: false, winT: 0,
  };
  const KEEP = new Set(['#', 'B', '^', 'v', ':', '|', '!']);
  const raw = rows.map(r => r.slice());
  const isW = (c, r) => r >= 0 && r < h && c >= 0 && c < w && raw[r][c] === '~';
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const ch = rows[r][c];
    const x = c * T, y = r * T;
    if (ch === '~') lv.water[r * w + c] = 1;
    else if (ch !== '.' && !KEEP.has(ch)) {
      // 放在水裡的物件：周圍有兩格以上是水，這格也算水
      const n = isW(c, r - 1) + isW(c - 1, r) + isW(c + 1, r) + isW(c, r + 1);
      if (n >= 2) lv.water[r * w + c] = 1;
    }
    switch (ch) {
      case 'P': lv.start = { x: x + T / 2, bottom: y + T, size: 'n' }; break;
      case 'E': lv.door = { x, y: y - T, w: T, h: 2 * T, open: 0 }; break;
      case 'C': lv.checks.push({ x, y, on: false, raise: 0 }); break;
      case 'o': lv.rings.push({ x: x + 20, y: y + 20, got: false, ph: Math.random() * 6 }); break;
      case '*': lv.stars.push({ x: x + 20, y: y + 20, got: false, ph: Math.random() * 6 }); break;
      case '^': lv.spikes.push({ x: x + 4, y: y + 18, w: 32, h: 22 }); break;
      case 'v': lv.spikes.push({ x: x + 4, y, w: 32, h: 22 }); break;
      case 'S': lv.springs.push({ x, y, sq: 0 }); break;
      case '+': case '-': lv.pumps.push({ x, y, type: ch, ph: Math.random() * 6 }); break;
      case 'k': case 'K': lv.switches.push({ x, y, ch: ch === 'k' ? 'A' : 'B', on: false }); break;
      case '_': case ',': lv.plates.push({ x, y, ch: ch === '_' ? 'A' : 'B', pressed: false, sq: 0 }); break;
      case 'X': lv.boxes.push({ x, y, w: T, h: T, vy: 0, home: { x, y } }); break;
      case 'e': case 'w': lv.enemies.push({ x: x + 4, y: y + 12, w: 32, h: 28, vy: 0, dir: -1, type: ch, alive: true, deadT: 0, ph: Math.random() * 6 }); break;
      case ':': lv.crumbles.set(r * w + c, { state: 0, t: 0 }); break;
      case '=': {
        if (c > 0 && raw[r][c - 1] === '=') break;
        let n = 0; while (c + n < w && raw[r][c + n] === '=') n++;
        lv.plats.push({ x, y, w: n * T, h: 16, vx: 100, dx: 0 });
        break;
      }
      default:
        if (ch >= '1' && ch <= '9') lv.signs.push({ x, y, text: (def.hints && def.hints[ch]) || '' });
    }
    if (!KEEP.has(ch)) rows[r][c] = '.';
  }
  if (!lv.start) lv.start = { x: T * 1.5, bottom: (h - 3) * T, size: 'n' };
  lv.respawn = { ...lv.start };
  return lv;
}

function makeBall(sp) {
  const hh = SIZE[sp.size];
  return { x: sp.x, y: sp.bottom - hh, h: hh, size: sp.size, vx: 0, vy: 0, grounded: false, coyote: 0, buffer: 0,
    onPlat: null, angle: 0, sq: 0, face: 1, dead: false, deadT: 0, inWater: false, pushing: false, prevBottom: 0, blink: 0 };
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
  if (ch === '#' || ch === 'B') return true;
  if (ch === '|') return L.gateSolid.A;
  if (ch === '!') return L.gateSolid.B;
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
function isWater(x, y) {
  const c = Math.floor(x / T); let r = Math.floor(y / T);
  if (c < 0 || c >= L.w || r < 0) return false;
  if (r >= L.h) r = L.h - 1;   // 水池通到地圖底：下面也算水
  return L.water[r * L.w + c] === 1;
}
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
  if (B.vy > 420) { B.sq = Math.min(1, B.vy / 1100); puff(B.x, B.y + B.h, 4, '#ffffff'); }
  B.vy = 0; B.grounded = true;
  if (rc && rc.c !== undefined && L.grid[rc.r][rc.c] === ':') {
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
function puff(x, y, n, color, spd = 120) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random() * 0.8);
    L.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5 + Math.random() * 0.3, t: 0, color, r: 3 + Math.random() * 3, g: 300 });
  }
}
function floatText(x, y, text, color = '#2b2340') { L.floats.push({ x, y, text, color, t: 0 }); }

// ───────────── 遊戲流程 ─────────────
function startLevel(idx) {
  L = buildLevel(idx);
  B = makeBall(L.respawn);
  snapCam();
  state = 'play'; paused = false; document.body.classList.add('playing');
  show('menu', false); show('win', false); show('pause', false); show('hud', true);
  document.getElementById('hudName').textContent = `第 ${L.def.id} 關 · ${L.def.name}`;
  updateHud();
}
function restartLevel() { if (L) startLevel(L.idx); }
function die() {
  if (B.dead || L.won) return;
  B.dead = true; B.deadT = 0; L.deaths++;
  puff(B.x, B.y, 18, B.size === 'b' ? '#ff8a3d' : '#ef4b3f', 220);
  SFX.die();
}
function respawn() {
  B = makeBall(L.respawn);
  for (const s of L.crumbles.values()) { s.state = 0; s.t = 0; }
}
function winLevel() {
  L.won = true; L.winT = 0; SFX.win();
  puff(L.door.x + 20, L.door.y + 40, 30, '#ffc23d', 260);
  const id = L.def.id, got = L.stars.filter(s => s.got).length;
  const prev = save.levels[id] || {};
  save.levels[id] = { stars: Math.max(prev.stars || 0, got), time: Math.min(prev.time || 1e9, Math.round(L.time * 10) / 10) };
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, L.idx + 2));
  writeSave();
}
function showWin() {
  state = 'win'; document.body.classList.remove('playing');
  const got = L.stars.filter(s => s.got).length;
  document.getElementById('winStars').innerHTML = [0, 1, 2].map(i => i < got ? '★' : '<span class="no">★</span>').join('');
  const m = Math.floor(L.time / 60), s = Math.floor(L.time % 60);
  document.getElementById('winStats').innerHTML = `<span>⏱ ${m}:${String(s).padStart(2, '0')}</span><span>💥 ${L.deaths} 次</span>`;
  document.getElementById('wNext').hidden = L.idx >= LEVELS.length - 1;
  show('win', true);
}

// ───────────── 每一步物理 ─────────────
const keys = { left: false, right: false, jump: false };
function jumpPress() { if (B) B.buffer = PHY.BUFFER; }

function step(dt) {
  L.t += dt;
  if (!L.won) L.time += dt;

  // 機關：壓板、柵欄
  for (const ch of ['A', 'B']) {
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
      const gch = ch === 'A' ? '|' : '!';
      let blocked = false;
      const br = ballRect(1);
      for (let r = Math.max(0, Math.floor(br.y / T)); r <= Math.min(L.h - 1, Math.floor((br.y + br.h) / T)); r++)
        for (let c = Math.floor(br.x / T); c <= Math.floor((br.x + br.w) / T); c++)
          if (L.grid[r] && L.grid[r][c] === gch) blocked = true;
      for (const b of L.boxes) {
        const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - 1) / T), r0 = Math.floor(b.y / T), r1 = Math.floor((b.y + b.h - 1) / T);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (L.grid[r] && L.grid[r][c] === gch) blocked = true;
      }
      if (!blocked) L.gateSolid[ch] = true;
    }
    L.gateAnim[ch] += ((L.gateSolid[ch] ? 0 : 1) - L.gateAnim[ch]) * Math.min(1, dt * 8);
  }

  // 會掉的磚
  for (const [key, s] of L.crumbles) {
    if (s.state === 1) { s.t += dt; if (s.t > 0.45) { s.state = 2; s.t = 0; const c = key % L.w, r = (key / L.w) | 0; puff(c * T + 20, r * T + 20, 6, '#b5835a', 90); SFX.crumble(); } }
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
    if (b.y > L.h * T + 200) { b.x = b.home.x; b.y = b.home.y; b.vy = 0; }
  }

  // 移動平台（載著球走）
  for (const p of L.plats) {
    const nx = p.x + p.vx * dt;
    if (solids(nx, p.y, p.w, p.h, false).length) { p.vx = -p.vx; p.dx = 0; }
    else { p.dx = nx - p.x; p.x = nx; }
    if (!B.dead && B.onPlat === p) ballMoveX(p.dx);
  }

  // 怪獸
  for (const e of L.enemies) {
    e.ph += dt * 6;
    if (!e.alive) { e.deadT += dt; continue; }
    e.vy = Math.min(e.vy + PHY.G * dt, 900);
    const landedE = bodyMoveY(e, e.vy * dt);
    if (landedE) e.vy = 0;
    const spd = e.type === 'w' ? 50 : 60;
    if (bodyMoveX(e, e.dir * spd * dt)) e.dir = -e.dir;
    else if (landedE) {
      const fx = e.dir > 0 ? e.x + e.w + 2 : e.x - 2, fy = e.y + e.h + 4;
      if (!tileSolid(Math.floor(fx / T), Math.floor(fy / T)) && !L.boxes.some(b => fx > b.x && fx < b.x + b.w && fy > b.y && fy < b.y + b.h)) e.dir = -e.dir;
    }
    if (e.y > L.h * T + 100) e.alive = false;
  }

  // 特效
  for (const p of L.particles) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  L.particles = L.particles.filter(p => p.t < p.life);
  for (const f of L.floats) f.t += dt;
  L.floats = L.floats.filter(f => f.t < 1.4);
  for (const s of L.springs) s.sq = Math.max(0, s.sq - dt * 4);
  for (const c of L.checks) if (c.on) c.raise = Math.min(1, c.raise + dt * 3);
  if (L.door) L.door.open += ((ringsLeft() === 0 ? 1 : 0) - L.door.open) * Math.min(1, dt * 5);

  if (L.won) { L.winT += dt; B.sq *= 0.9; if (L.winT > 0.9 && state === 'play') showWin(); return; }
  if (B.dead) { B.deadT += dt; if (B.deadT > 0.9) respawn(); return; }
  stepBall(dt);
}

function ringsLeft() { return L.rings.reduce((n, r) => n + (r.got ? 0 : 1), 0); }

function stepBall(dt) {
  const big = B.size === 'b';
  B.prevBottom = B.y + B.h;
  const f = waterFrac();
  const sunk = !big && f > 0.4;
  if ((f > 0.3) !== B.inWater) {
    B.inWater = f > 0.3;
    if (B.inWater && B.vy > 150) { SFX.splash(); for (let i = 0; i < 8; i++) L.particles.push({ x: B.x + (Math.random() - 0.5) * B.h * 2, y: B.y, vx: (Math.random() - 0.5) * 120, vy: -150 - Math.random() * 150, life: 0.6, t: 0, color: '#d6f3ff', r: 3 + Math.random() * 2, g: 900 }); }
  }

  // 左右
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let max = big ? PHY.BIG_MAX : PHY.MAX;
  if (sunk) max *= 0.6;
  if (B.pushing) max = Math.min(max, PHY.PUSH_MAX * (big ? 1.3 : 1));
  const acc = B.grounded ? PHY.ACC : PHY.AIR;
  if (dir) {
    B.vx += dir * acc * dt * (B.vx * dir < 0 ? 1.6 : 1);
    B.face = dir;
  } else if (B.grounded) {
    const d = PHY.FRIC * dt; B.vx = Math.abs(B.vx) <= d ? 0 : B.vx - Math.sign(B.vx) * d;
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

  // 重力、水
  let g = PHY.G;
  if (B.vy >= 0) B.launched = false;
  if (!keys.jump && B.vy < 0 && f === 0 && !B.launched) g *= 2.3;   // 放開跳鍵跳得比較矮（彈簧彈起來不算）
  if (sunk) g = PHY.G * 0.4;
  if (big && f > 0) g = PHY.G * (1 - 2.3 * f);        // 大球有浮力
  B.vy += g * dt;
  if (f > 0) B.vy *= 1 - (big ? 2.4 : 1.6) * dt;
  if (sunk) B.vy = Math.min(B.vy, 170);
  B.vy = Math.min(B.vy, 950);

  B.grounded = false; B.onPlat = null; B.pushing = false;
  ballMoveX(B.vx * dt);
  ballMoveY(B.vy * dt);
  B.angle += B.vx * dt / B.h;
  B.sq += (0 - B.sq) * Math.min(1, dt * 10);
  if (sunk && Math.random() < dt * 4) L.particles.push({ x: B.x + (Math.random() - 0.5) * 10, y: B.y - B.h, vx: 0, vy: -60, life: 0.8, t: 0, color: 'rgba(255,255,255,.8)', r: 2 + Math.random() * 2, g: -60 });

  triggers();
  if (B.y - B.h > L.h * T + 60) die();
}

function triggers() {
  const br = ballRect();
  // 刺
  for (const s of L.spikes) if (circleRect(B.x, B.y, B.h - 3, s)) return die();
  // 怪獸
  for (const e of L.enemies) {
    if (!e.alive || !circleRect(B.x, B.y, B.h - 1, e)) continue;
    if (e.type === 'e' && B.vy > 40 && B.prevBottom <= e.y + 14) {
      e.alive = false; e.deadT = 0;
      B.vy = -(keys.jump ? PHY.JUMP * 0.9 : PHY.STOMP); B.launched = true;
      SFX.stomp(); puff(e.x + e.w / 2, e.y + e.h / 2, 10, '#9b6bff');
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
    if (!ov(br, { x: p.x + 4, y: p.y + 4, w: 32, h: 32 })) continue;
    const want = p.type === '+' ? 'b' : 'n';
    if (B.size === want) continue;
    if (setSize(want)) {
      (want === 'b' ? SFX.grow : SFX.shrink)();
      puff(B.x, B.y, 12, want === 'b' ? '#3fcf8e' : '#4a9dff', 160);
      floatText(B.x, B.y - B.h - 10, want === 'b' ? '變大！' : '變小！');
    } else if (!p.warned) { p.warned = true; floatText(B.x, B.y - B.h - 10, '這裡太窄了'); SFX.no(); }
  }
  // 圈圈、星星
  for (const r of L.rings) if (!r.got && Math.hypot(B.x - r.x, B.y - r.y) < B.h + 12) {
    r.got = true; SFX.ring(); puff(r.x, r.y, 10, '#ffc23d', 150);
    const left = ringsLeft(); floatText(r.x, r.y - 24, left ? `還差 ${left} 個` : '門打開了！', '#c98a00'); updateHud();
  }
  for (const s of L.stars) if (!s.got && Math.hypot(B.x - s.x, B.y - s.y) < B.h + 14) {
    s.got = true; SFX.star(); puff(s.x, s.y, 14, '#fff27a', 180); updateHud();
  }
  // 存檔旗
  for (const c of L.checks) if (!c.on && ov(br, { x: c.x + 6, y: c.y - T, w: 28, h: 2 * T })) {
    for (const o of L.checks) o.on = o === c ? true : o.on;
    c.on = true; L.respawn = { x: c.x + T / 2, bottom: c.y + T, size: B.size }; SFX.check(); floatText(c.x + 20, c.y - 50, '存檔！', '#2f9e5f');
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

// ───────────── 繪圖 ─────────────
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function star5(x, y, R, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath();
}
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

function drawBackground(th) {
  const g = ctx.createLinearGradient(0, 0, 0, H * DPR);
  g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  const s = scale * DPR;
  const groundY = (L.h - 2.5) * T;
  // 雲
  ctx.fillStyle = th.cloud; ctx.globalAlpha = 0.85;
  for (let i = 0; i < 8; i++) {
    const span = viewW + 400;
    const x = ((i * 337 + L.t * 8 - cam.x * 0.1) % span + span) % span - 200;
    const y = 60 + (i * 97 % 180) + (groundY - 14 * T) * 0.4 - cam.y * 0.4 + 60;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.arc(x + 30, y - 12, 32, 0, 7); ctx.arc(x + 62, y, 24, 0, 7); ctx.rect(x, y, 62, 24); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 遠山、近山
  for (const [k, col, rad, gap, yoff] of [[0.2, th.far, 190, 360, 40], [0.45, th.near, 130, 260, 70]]) {
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = col;
    const ox = -cam.x * k, baseY = groundY - cam.y * (0.5 + k) + yoff - (L.h * T - viewH - cam.y) * (0.5 - k) * 0;
    const i0 = Math.floor(-ox / gap) - 1, i1 = i0 + Math.ceil(viewW / gap) + 3;
    ctx.beginPath();
    for (let i = i0; i <= i1; i++) {
      const r = rad * (0.7 + hash(i, k * 10 | 0) * 0.6);
      ctx.moveTo(ox + i * gap + r, baseY); ctx.arc(ox + i * gap, baseY, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillRect(0, baseY, viewW, viewH * 2);
  }
}

function drawTile(c, r, th) {
  const ch = L.grid[r][c], x = c * T, y = r * T;
  const up = r > 0 ? L.grid[r - 1][c] : '.';
  if (ch === '#') {
    ctx.fillStyle = th.dirt; ctx.fillRect(x, y, T + 0.5, T + 0.5);
    ctx.fillStyle = th.dirt2;
    const h1 = hash(c, r);
    ctx.beginPath(); ctx.arc(x + 10 + h1 * 18, y + 14 + h1 * 12, 3.5, 0, 7); ctx.arc(x + 28 - h1 * 10, y + 30, 2.5, 0, 7); ctx.fill();
    if (up !== '#') {
      const lE = c > 0 && L.grid[r][c - 1] === '#' && (r === 0 || L.grid[r - 1][c - 1] !== '#');
      const rE = c < L.w - 1 && L.grid[r][c + 1] === '#' && (r === 0 || L.grid[r - 1][c + 1] !== '#');
      ctx.fillStyle = th.grass;
      rr(x - (lE ? 0 : 2), y - 3, T + (lE ? 0 : 2) + (rE ? 0.5 : 2), 14, [lE ? 0 : 7, rE ? 0 : 7, 6, 6]); ctx.fill();
      ctx.fillStyle = th.grass2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 7 + i * 13, y + 11, 4.5, 0, Math.PI); ctx.fill(); }
    }
  } else if (ch === 'B') {
    ctx.fillStyle = '#d9824a'; ctx.fillRect(x, y, T + 0.5, T + 0.5);
    ctx.strokeStyle = '#a95c2e'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 20); ctx.lineTo(x + T, y + 20);
    ctx.moveTo(x + 20, y); ctx.lineTo(x + 20, y + 20);
    ctx.moveTo(x + (r % 2 ? 6 : 34), y + 20); ctx.lineTo(x + (r % 2 ? 6 : 34), y + 40);
    ctx.stroke();
    ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
  } else if (ch === '^' || ch === 'v') {
    ctx.fillStyle = '#c5cbd8'; ctx.strokeStyle = '#7d8599'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const bx = x + 2 + i * 12;
      if (ch === '^') { ctx.moveTo(bx, y + T); ctx.lineTo(bx + 6, y + 16); ctx.lineTo(bx + 12, y + T); }
      else { ctx.moveTo(bx, y); ctx.lineTo(bx + 6, y + 24); ctx.lineTo(bx + 12, y); }
    }
    ctx.fill(); ctx.stroke();
  } else if (ch === ':') {
    const s = L.crumbles.get(r * L.w + c);
    if (s.state === 2) {
      if (s.t > 2.6) { ctx.globalAlpha = 0.25; ctx.strokeStyle = '#a5713f'; ctx.setLineDash([4, 4]); ctx.strokeRect(x + 2, y + 2, T - 4, 16); ctx.setLineDash([]); ctx.globalAlpha = 1; }
      return;
    }
    const sh = s.state === 1 ? Math.sin(L.t * 70) * 2 : 0;
    ctx.fillStyle = '#e6b07a'; rr(x + 1 + sh, y + 1, T - 2, 20, 5); ctx.fill();
    ctx.strokeStyle = '#a5713f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 12 + sh, y + 3); ctx.lineTo(x + 18 + sh, y + 12); ctx.lineTo(x + 14 + sh, y + 19); ctx.moveTo(x + 28 + sh, y + 4); ctx.lineTo(x + 25 + sh, y + 14); ctx.stroke();
  } else if (ch === '|' || ch === '!') {
    const k = ch === '|' ? 'A' : 'B', open = L.gateAnim[k];
    const hh = T * (1 - open);
    if (hh < 1) return;
    ctx.fillStyle = CH[k];
    const startTop = up !== ch;
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 5 + i * 11, y, 7, hh + 0.5);
    if (startTop) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 2, y, T - 4, 5); }
  }
}

function drawBall() {
  if (B.dead) return;
  const big = B.size === 'b';
  const sq = B.sq;
  const sx = 1 + sq * 0.22, sy = 1 - sq * 0.22;
  ctx.save();
  ctx.translate(B.x, B.y + B.h);
  ctx.scale(sx, sy);
  ctx.translate(0, -B.h);
  const r = B.h;
  // 影子
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, big ? '#ffc08a' : '#ff8d82'); g.addColorStop(0.5, big ? '#ff8a3d' : '#ef4b3f'); g.addColorStop(1, big ? '#d9601e' : '#b8322a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  // 滾動花紋
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, B.angle, B.angle + 1.1); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, B.angle + Math.PI, B.angle + Math.PI + 1.1); ctx.stroke();
  // 眼睛（不跟著轉）
  const ex = B.face * r * 0.22;
  B.blink = (B.blink + 1) % 400;
  const eh = B.blink < 8 ? 0.15 : 1;
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex + s * r * 0.3, -r * 0.15, r * 0.2, r * 0.27 * eh, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.ellipse(ex + s * r * 0.3 + B.face * r * 0.07, -r * 0.12, r * 0.1, r * 0.14 * eh, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawEnemy(e) {
  const cx = e.x + e.w / 2, by = e.y + e.h;
  if (!e.alive) {
    if (e.deadT > 0.6) return;
    ctx.globalAlpha = 1 - e.deadT / 0.6;
    ctx.fillStyle = e.type === 'e' ? '#9b6bff' : '#9a6a44';
    ctx.beginPath(); ctx.ellipse(cx, by - 4, 18, 5, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; return;
  }
  const wob = Math.sin(e.ph) * 2;
  if (e.type === 'e') {
    ctx.fillStyle = '#9b6bff';
    ctx.beginPath(); ctx.ellipse(cx, by - 2, 17 + wob * 0.5, 24 - wob, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c7aaff'; ctx.beginPath(); ctx.ellipse(cx - 6, by - 17 + wob, 5, 3, -0.5, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#6b4a30';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i + 0.5) * Math.PI / 7;
      ctx.moveTo(cx + Math.cos(a - 0.2) * 15, by - 4 + Math.sin(a - 0.2) * 15);
      ctx.lineTo(cx + Math.cos(a) * 27, by - 4 + Math.sin(a) * 27);
      ctx.lineTo(cx + Math.cos(a + 0.2) * 15, by - 4 + Math.sin(a + 0.2) * 15);
    }
    ctx.fill();
    ctx.fillStyle = '#9a6a44'; ctx.beginPath(); ctx.ellipse(cx, by - 4, 17, 15, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2d6b3'; ctx.beginPath(); ctx.ellipse(cx + e.dir * 9, by - 8, 8, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.arc(cx + e.dir * 17, by - 8, 2.5, 0, 7); ctx.fill();
  }
  // 眼睛
  const ey = e.type === 'e' ? by - 14 + wob : by - 12;
  const ex = e.type === 'e' ? cx + e.dir * 3 : cx + e.dir * 8;
  for (const s of e.type === 'e' ? [-6, 6] : [0]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + s, ey, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.arc(ex + s + e.dir * 1.5, ey, 2.2, 0, 7); ctx.fill();
  }
}

function drawBubble(x, y, text, view) {
  ctx.font = '700 16px ' + getComputedStyle(document.body).fontFamily;
  const maxW = 290, lines = [];
  let cur = '';
  for (const chr of text) { if (ctx.measureText(cur + chr).width > maxW) { lines.push(cur); cur = chr; } else cur += chr; }
  if (cur) lines.push(cur);
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 28, h = lines.length * 22 + 18;
  let bx = Math.max(view.x + 8, Math.min(view.x + view.w - w - 8, x - w / 2));
  let by = Math.max(view.y + 60, y - h - 14);
  ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.strokeStyle = 'rgba(43,35,64,.2)'; ctx.lineWidth = 2;
  rr(bx, by, w, h, 14); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 8, by + h - 1); ctx.lineTo(x, by + h + 10); ctx.lineTo(x + 8, by + h - 1); ctx.fill();
  ctx.fillStyle = '#2b2340'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + 14, by + 10 + i * 22));
}

function render() {
  if (!L) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#7cc7ff'; ctx.fillRect(0, 0, cv.width, cv.height); return; }
  const th = THEMES[L.def.theme] || THEMES.day;
  drawBackground(th);
  const s = scale * DPR;
  const cx = Math.round(cam.x * s) / s, cy = Math.round(cam.y * s) / s;
  ctx.setTransform(s, 0, 0, s, -cx * s, -cy * s);
  const view = { x: cx, y: cy, w: viewW, h: viewH };
  const c0 = Math.max(0, Math.floor(cx / T) - 1), c1 = Math.min(L.w - 1, Math.ceil((cx + viewW) / T) + 1);
  const r0 = Math.max(0, Math.floor(cy / T) - 1), r1 = Math.min(L.h - 1, Math.ceil((cy + viewH) / T) + 1);
  const vis = (x, w = T) => x + w > cx - T && x < cx + viewW + T;
  const t = L.t;

  // 告示牌
  for (const sg of L.signs) {
    if (!vis(sg.x)) continue;
    ctx.fillStyle = '#9a6a44'; ctx.fillRect(sg.x + 17, sg.y + 14, 6, 26);
    ctx.fillStyle = '#e8c08a'; rr(sg.x + 3, sg.y - 2, 34, 22, 5); ctx.fill();
    ctx.strokeStyle = '#9a6a44'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#6b4a30'; ctx.font = '900 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', sg.x + 20, sg.y + 10); ctx.textAlign = 'left';
  }
  // 存檔旗
  for (const c of L.checks) {
    if (!vis(c.x)) continue;
    ctx.fillStyle = '#8a8fa3'; ctx.fillRect(c.x + 17, c.y - 34, 4, 74);
    ctx.fillStyle = '#6d7186'; rr(c.x + 11, c.y + 34, 16, 6, 3); ctx.fill();
    const fy = c.y + 14 - c.raise * 46;
    ctx.fillStyle = c.on ? '#3fcf8e' : '#d6d9e3';
    ctx.beginPath(); ctx.moveTo(c.x + 21, fy); ctx.lineTo(c.x + 21 + 22 + Math.sin(t * 6) * 2, fy + 8); ctx.lineTo(c.x + 21, fy + 16); ctx.fill();
  }
  // 門
  if (L.door && vis(L.door.x)) {
    const d = L.door;
    ctx.fillStyle = '#7a4f30'; rr(d.x + 1, d.y + 2, 38, 78, [19, 19, 2, 2]); ctx.fill();
    ctx.fillStyle = d.open > 0.5 ? '#2b2340' : '#b97a4a'; rr(d.x + 6, d.y + 8, 28, 72, [14, 14, 0, 0]); ctx.fill();
    if (d.open > 0.5) {
      const g = ctx.createRadialGradient(d.x + 20, d.y + 50, 2, d.x + 20, d.y + 50, 34);
      g.addColorStop(0, `rgba(255,230,140,${0.7 * d.open})`); g.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = g; ctx.fillRect(d.x - 10, d.y, 60, 80);
      ctx.fillStyle = '#ffc23d'; star5(d.x + 20, d.y - 10 + Math.sin(t * 3) * 2, 9, 4); ctx.fill();
    } else {
      ctx.fillStyle = '#ffc23d'; rr(d.x + 12, d.y + 38, 16, 13, 3); ctx.fill();
      ctx.strokeStyle = '#ffc23d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(d.x + 20, d.y + 38, 5, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '900 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ringsLeft(), d.x + 20, d.y + 24); ctx.textAlign = 'left';
    }
  }
  // 地圖外：左右是土牆，最底下是土或深淵
  ctx.fillStyle = th.dirt;
  if (cx < 0) ctx.fillRect(cx - 2, cy - 2, -cx + 2, viewH + 4);
  if (cx + viewW > L.w * T) ctx.fillRect(L.w * T, cy - 2, cx + viewW - L.w * T + 2, viewH + 4);
  if (cy + viewH > L.h * T) for (let c = c0; c <= c1; c++) {
    if (L.water[(L.h - 1) * L.w + c]) continue;
    const ch = L.grid[L.h - 1][c];
    ctx.fillStyle = ch === '#' || ch === 'B' ? th.dirt : 'rgba(43,35,64,.55)';
    ctx.fillRect(c * T, L.h * T, T + 0.5, cy + viewH - L.h * T + 2);
  }
  // 地圖格子
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (L.grid[r][c] !== '.') drawTile(c, r, th);
  // 彈簧
  for (const sp of L.springs) {
    if (!vis(sp.x)) continue;
    const h = 16 - sp.sq * 9;
    ctx.fillStyle = '#7d8599'; rr(sp.x + 6, sp.y + 34, 28, 6, 2); ctx.fill();
    ctx.strokeStyle = '#9aa1b5'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 4; i++) ctx.lineTo(sp.x + (i % 2 ? 28 : 12), sp.y + 34 - i * h / 4);
    ctx.stroke();
    ctx.fillStyle = '#ef4b3f'; rr(sp.x + 4, sp.y + 34 - h - 7, 32, 8, 4); ctx.fill();
  }
  // 打氣、洩氣
  for (const p of L.pumps) {
    if (!vis(p.x)) continue;
    const pulse = 1 + Math.sin(t * 4 + p.ph) * 0.06;
    ctx.fillStyle = p.type === '+' ? '#3fcf8e' : '#4a9dff';
    ctx.beginPath(); ctx.arc(p.x + 20, p.y + 20, 15 * pulse, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x + 20, p.y + 20, 18 * pulse, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(p.x + 13, p.y + 20); ctx.lineTo(p.x + 27, p.y + 20);
    if (p.type === '+') { ctx.moveTo(p.x + 20, p.y + 13); ctx.lineTo(p.x + 20, p.y + 27); }
    ctx.stroke(); ctx.lineCap = 'butt';
  }
  // 開關
  for (const sw of L.switches) {
    if (!vis(sw.x)) continue;
    ctx.fillStyle = '#6d7186'; rr(sw.x + 8, sw.y + 30, 24, 10, 4); ctx.fill();
    ctx.save(); ctx.translate(sw.x + 20, sw.y + 32); ctx.rotate(sw.on ? 0.7 : -0.7);
    ctx.fillStyle = '#9aa1b5'; ctx.fillRect(-2, -22, 4, 22);
    ctx.fillStyle = CH[sw.ch]; ctx.beginPath(); ctx.arc(0, -22, 7, 0, 7); ctx.fill();
    ctx.restore();
  }
  // 壓板
  for (const p of L.plates) {
    if (!vis(p.x)) continue;
    ctx.fillStyle = '#6d7186'; ctx.fillRect(p.x + 2, p.y + 36, 36, 4);
    ctx.fillStyle = CH[p.ch]; rr(p.x + 5, p.y + (p.pressed ? 33 : 29), 30, p.pressed ? 4 : 8, 3); ctx.fill();
  }
  // 平台
  for (const p of L.plats) {
    if (!vis(p.x, p.w)) continue;
    ctx.fillStyle = '#7a8bd6'; rr(p.x, p.y, p.w, p.h, 6); ctx.fill();
    ctx.fillStyle = '#a9b6ff'; rr(p.x + 3, p.y + 2, p.w - 6, 5, 3); ctx.fill();
    ctx.fillStyle = '#5a68ad'; for (let i = 0; i < p.w / T; i++) { ctx.beginPath(); ctx.arc(p.x + 20 + i * T, p.y + 11, 2.5, 0, 7); ctx.fill(); }
  }
  // 箱子
  for (const b of L.boxes) {
    if (!vis(b.x)) continue;
    ctx.fillStyle = '#d9a35f'; rr(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 4); ctx.fill();
    ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x + 6, b.y + 6); ctx.lineTo(b.x + b.w - 6, b.y + b.h - 6); ctx.moveTo(b.x + b.w - 6, b.y + 6); ctx.lineTo(b.x + 6, b.y + b.h - 6); ctx.stroke();
  }
  for (const e of L.enemies) if (vis(e.x)) drawEnemy(e);
  // 圈圈
  for (const r of L.rings) {
    if (r.got || !vis(r.x - 20)) continue;
    const rx = 4 + Math.abs(Math.cos(t * 2.2 + r.ph)) * 11;
    ctx.strokeStyle = '#ffc23d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(r.x, r.y, rx, 15, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(r.x, r.y, rx, 15, 0, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
  }
  // 星星
  for (const st of L.stars) {
    if (st.got || !vis(st.x - 20)) continue;
    const y = st.y + Math.sin(t * 3 + st.ph) * 3;
    ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#e0a400'; ctx.lineWidth = 2.5;
    star5(st.x, y, 15, 7); ctx.fill(); ctx.stroke();
  }
  drawBall();
  // 水（蓋在最上面，半透明）
  // 同一欄連續的水合成一塊畫，整片一次填色才不會有格線
  const wave = x => Math.sin(t * 3 + x * 0.08) * 3;
  const surfs = [];
  ctx.beginPath();
  for (let c = c0; c <= c1; c++) {
    let r = r0;
    while (r <= r1) {
      if (!L.water[r * L.w + c]) { r++; continue; }
      const top = r, surf = r === 0 || !L.water[(r - 1) * L.w + c];
      while (r <= r1 && L.water[r * L.w + c]) r++;
      const x = c * T, y = top * T, bot = r * T + (r >= L.h ? viewH : 0);
      if (surf) {
        ctx.moveTo(x, bot);
        for (let i = 0; i <= 8; i++) ctx.lineTo(x + i * 5, y + 4 + wave(x + i * 5));
        ctx.lineTo(x + T, bot); ctx.closePath();
        surfs.push([x, y]);
      } else ctx.rect(x, y, T, bot - y);
    }
  }
  ctx.fillStyle = 'rgba(64,156,255,.45)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
  for (const [x, y] of surfs) { ctx.beginPath(); for (let i = 0; i <= 8; i++) ctx.lineTo(x + i * 5, y + 4 + wave(x + i * 5)); ctx.stroke(); }
  // 粒子
  for (const p of L.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 飄字
  ctx.font = '900 18px ' + getComputedStyle(document.body).fontFamily; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of L.floats) {
    ctx.globalAlpha = Math.min(1, 2.5 - f.t * 1.8);
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
  LEVELS.forEach((lv, i) => {
    const locked = i + 1 > save.unlocked;
    const got = (save.levels[lv.id] || {}).stars || 0;
    const b = document.createElement('button');
    b.className = 'lv' + (locked ? ' lock' : '');
    b.innerHTML = `<b>${locked ? '🔒' : lv.id}</b><span>${lv.name}</span><i>${[0, 1, 2].map(k => k < got ? '★' : '<span class="no">★</span>').join('')}</i>`;
    b.onclick = () => { if (locked) { SFX.no(); return; } SFX.click(); startLevel(i); };
    box.appendChild(b);
  });
}
function goMenu() {
  state = 'menu'; paused = false; document.body.classList.remove('playing');
  show('hud', false); show('win', false); show('pause', false); show('menu', true);
  buildMenu();
  L = buildLevel(0); B = makeBall(L.start); B.dead = true; L.signs = [];
  cam.x = 0; cam.y = clampCam(0, 1e9)[1];
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
  } else if (state === 'menu' && L) {
    L.t += dt;
    const span = Math.max(1, L.w * T - viewW);
    const p = (L.t * 25) % (span * 2);
    cam.x = p < span ? p : span * 2 - p;
  } else if (state === 'win' && L) { L.t += dt; }
  render();
  requestAnimationFrame(frame);
}

// 給測試用的小把手
window.__bounce = { get L() { return L; }, get B() { return B; }, get state() { return state; }, keys, start: startLevel, step: n => { for (let i = 0; i < n; i++) step(STEP); }, jump: jumpPress, save, set hold(v) { testHold = v; }, snap: () => snapCam() };

goMenu();
requestAnimationFrame(frame);
})();
