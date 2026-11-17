// 沙之實驗室：畫面、輸入、自由玩與關卡
import { createGPU } from './gpu.js';
import { CpuSim } from './cpu.js';
import { M, TOOLS, FREE_TOOLS } from './mats.js';
import { LEVELS, buildLevel, freeScene } from './levels.js';
import { Sound } from './audio.js';
const sound = new Sound();

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const stage = $('stage');

// ---------------------------------------------------------------- 存檔
const SAVE_KEY = 'mwLabSand.v1';
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
save.stars = save.stars || {};
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { } };

// ---------------------------------------------------------------- 引擎
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const cursor = document.createElement('canvas'); cursor.id = 'cursor';
stage.appendChild(cursor);
const cctx = cursor.getContext('2d');

// 載入畫面：每一步更新進度條和說明；中間讓瀏覽器有機會把畫面畫出來
const loadStep = async (k, msg) => {
  const b = $('loadBar'), m = $('loadMsg'); if (b) b.style.width = Math.round(k * 100) + '%'; if (m && msg) m.textContent = msg;
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
};
await loadStep(0.15, '啟動顯示卡…');
let sim = params.has('cpu') ? null : await createGPU(canvas, { offscreen: params.has('offscreen'), onStep: loadStep }).catch(() => null);
if (!sim) await loadStep(0.7, '這台裝置不支援 WebGPU，改用相容模式…');
if (!sim) { canvas.classList.add('cpu'); sim = new CpuSim(canvas); }
const GPU = sim.kind === 'gpu';
$('engine').textContent = GPU ? 'WebGPU' : '相容模式（CPU）';
$('engine').classList.toggle('gpu', GPU);
const PASSES = 4;

// ---------------------------------------------------------------- 狀態
let mode = 'free', level = null, L = null;      // L：目前關卡的執行狀態
let tool = save.tool && TOOLS[save.tool] ? save.tool : 'sand';
let size = save.size || 1;                      // 0 小 1 中 2 大
let paused = false;
let simTime = 0, frames = 0, lastCount = 0;

function gridFor(kind) {
  const r = stage.getBoundingClientRect();
  if (kind === 'level') return GPU ? [400, 250] : [240, 150];
  const target = GPU ? 260000 : 46000;
  const s = Math.max(GPU ? 2 : 3, Math.sqrt((r.width * r.height) / target));
  return [Math.max(80, Math.round(r.width / s)), Math.max(60, Math.round(r.height / s))];
}

// canvas 照格子比例放在舞台中間
function layout() {
  const r = stage.getBoundingClientRect();
  const k = Math.min(r.width / sim.w, r.height / sim.h);
  const cw = Math.floor(sim.w * k), ch = Math.floor(sim.h * k);
  for (const c of [canvas, cursor]) {
    c.style.width = cw + 'px'; c.style.height = ch + 'px';
    c.style.left = Math.floor((r.width - cw) / 2) + 'px'; c.style.top = Math.floor((r.height - ch) / 2) + 'px';
  }
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (GPU) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
  cursor.width = Math.round(cw * dpr); cursor.height = Math.round(ch * dpr);
}
addEventListener('resize', layout);

function brushR() { return [2, 4.5, 9][size] * Math.max(1, sim.w / 400); }

// ---------------------------------------------------------------- 工具列
function buildTools() {
  const list = mode === 'level' ? level.tools : FREE_TOOLS;
  if (!list.includes(tool)) tool = list[0];
  const f = $('tools'); f.innerHTML = '';
  list.forEach((id, i) => {
    const t = TOOLS[id], b = document.createElement('button');
    b.className = 'tool' + (id === tool ? ' on' : ''); b.dataset.id = id;
    b.innerHTML = `<b>${t.emoji}</b>${t.name}<span class="sw" style="background:linear-gradient(90deg, ${t.color}, ${t.color}aa, ${t.color})"></span>`;
    b.title = `${t.name}（${i + 1}）：${t.desc}`;
    b.onclick = () => { setTool(id); sound.start(); sound.click(); };
    f.appendChild(b);
  });
  const sep = document.createElement('span'); sep.className = 'sep'; f.appendChild(sep);
  const sz = document.createElement('div'); sz.className = 'sizes';
  [8, 14, 22].forEach((px, i) => {
    const b = document.createElement('button'); b.className = i === size ? 'on' : ''; b.title = ['小筆', '中筆', '大筆'][i];
    b.innerHTML = `<i style="width:${px}px;height:${px}px"></i>`;
    b.onclick = () => { size = i; save.size = i; persist(); buildTools(); };
    sz.appendChild(b);
  });
  f.appendChild(sz);
  const t = TOOLS[tool]; $('toolTip').innerHTML = `<b>${t.emoji} ${t.name}</b>　${t.desc}`;
}
function setTool(id) { tool = id; save.tool = id; persist(); buildTools(); }

// ---------------------------------------------------------------- 輸入
const ptr = { down: false, x: 0, y: 0, lx: 0, ly: 0, over: false, id: null };
function toCell(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * sim.w, (e.clientY - r.top) / r.height * sim.h];
}
canvas.addEventListener('pointerdown', (e) => {
  if (ptr.down) return;
  canvas.setPointerCapture(e.pointerId);
  ptr.down = true; ptr.id = e.pointerId;
  sound.start(); sound.pour(tool); hideHint();
  [ptr.x, ptr.y] = toCell(e); ptr.lx = ptr.x; ptr.ly = ptr.y;
});
canvas.addEventListener('pointermove', (e) => { [ptr.x, ptr.y] = toCell(e); ptr.over = true; });
canvas.addEventListener('pointerleave', () => { ptr.over = false; });
const up = (e) => { if (e.pointerId === ptr.id) { ptr.down = false; ptr.id = null; sound.stop(); } };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const list = mode === 'level' ? level.tools : FREE_TOOLS;
  if (/^[1-9]$/.test(e.key) && list[+e.key - 1]) setTool(list[+e.key - 1]);
  else if (e.key === ' ') { e.preventDefault(); togglePause(); }
  else if (e.key === '[') { size = Math.max(0, size - 1); buildTools(); }
  else if (e.key === ']') { size = Math.min(2, size + 1); buildTools(); }
});

// 這一格要送給 GPU 的筆刷（玩家＋水龍頭＋排水孔）
function stampsNow() {
  const out = [];
  if (ptr.down) {
    const t = TOOLS[tool];
    let ok = true;
    if (mode === 'level' && L.inkMax > 0 && (tool === 'wall' || tool === 'wood')) {
      const len = Math.hypot(ptr.x - ptr.lx, ptr.y - ptr.ly) + 0.6;
      const cost = len * brushR() / (sim.w * 4.5);   // 中筆畫一條和畫面一樣寬的牆 ＝ 1
      if (L.ink + cost > L.inkMax) { ok = false; if (!L.inkWarned) { toast('石牆用完了！可以用橡皮擦擦掉重畫。'); L.inkWarned = true; } }
      else L.ink += cost;
    }
    if (ok) out.push({ x0: ptr.lx, y0: ptr.ly, x1: ptr.x, y1: ptr.y, r: brushR(), mat: t.mat, prob: t.prob, mode: t.mode });
    ptr.lx = ptr.x; ptr.ly = ptr.y;
  }
  if (mode === 'level') {
    for (const em of level.emit) {
      if (em.until && simTime > em.until) continue;
      const x = em.x * sim.w, y = em.y * sim.h;
      out.push({ x0: x, y0: y, x1: x, y1: y, r: em.r * sim.w, mat: em.mat, prob: em.prob, mode: em.mode || 0 });
    }
    for (const d of level.drain) out.push({ x0: d.x0 * sim.w, y0: (d.y0 + d.y1) / 2 * sim.h, x1: d.x1 * sim.w, y1: (d.y0 + d.y1) / 2 * sim.h, r: (d.y1 - d.y0) / 2 * sim.h, mat: 0, prob: 1, mode: 3 });
  }
  return out;
}

// ---------------------------------------------------------------- 模式
function startFree() {
  mode = 'free'; level = null; L = null;
  $('hud').classList.add('hidden');
  buildTools();
  const [w, h] = gridFor('free');
  sim.resize(w, h); layout();
  sim.load(freeScene(w, h));
  simTime = 0;
  $('hud').classList.add('hidden');
  segMode('free'); buildTools();
}

function startLevel(i) {
  level = LEVELS[i]; mode = 'level'; $('hint').classList.add('hidden');
  buildTools();
  const [w, h] = GPU ? [400, 250] : [240, 150];
  sim.resize(w, h); layout();
  sim.load(buildLevel(level, w, h));
  const win = level.win(level);
  L = { i, win, ink: 0, inkMax: level.ink * 1, held: 0, start: null, best: 1, done: false, inkWarned: false, prog: 0, inkBase: null };
  // 關卡一開始就有的石牆、木頭不算玩家的用量：先數一次當基準
  if (L.inkMax) { const L0 = L; const tryBase = () => { const q = sim.count([{ x0: 0, y0: 0, x1: sim.w, y1: sim.h, mats: [M.WALL, M.WOOD] }]); if (!q) { setTimeout(tryBase, 30); return; } q.then((n) => { if (L === L0 && n) L0.inkBase = n[0]; else if (L === L0) setTimeout(tryBase, 30); }); }; tryBase(); }
  simTime = 0; frames = 0; lastCount = 0;
  $('goal').textContent = `第 ${i + 1} 關 ${level.icon} ${level.name}：${level.goal}`;
  $('hud').classList.remove('hidden');
  $('inkWrap').style.display = $('inkBar').style.display = level.ink ? '' : 'none';
  $('progLbl').textContent = win.kind === 'survive' ? '小屋' : '目標';
  segMode('level'); buildTools(); hideOverlays(); paused = false; $('pauseBtn').textContent = '⏸';
}

function segMode(v) { for (const b of $('modeSeg').children) b.classList.toggle('on', b.dataset.v === v); }
$('modeSeg').onclick = (e) => {
  const v = e.target.dataset && e.target.dataset.v; if (!v) return;
  if (v === 'free') { hideOverlays(); if (mode !== 'free') startFree(); }
  else showLevels();
};
$('clearBtn').onclick = () => {
  if (mode === 'level') { startLevel(L.i); return; }
  sim.load(new Uint32Array(sim.w * sim.h)); toast('清空了');
};
function togglePause() { paused = !paused; $('pauseBtn').textContent = paused ? '▶️' : '⏸'; toast(paused ? '暫停（還是可以畫）' : '繼續'); }
$('pauseBtn').onclick = togglePause;

function hideOverlays() { $('levelPick').classList.add('hidden'); $('result').classList.add('hidden'); }
function showLevels() {
  const list = $('levelList'); list.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const s = save.stars[lv.id] || 0, b = document.createElement('button');
    b.className = 'lv';
    b.innerHTML = `<span class="em">${lv.icon}</span><span><span class="n">第 ${i + 1} 關 · ${lv.tools.map((k) => TOOLS[k].emoji).join('')}</span><br><span class="t">${lv.name}</span><br><span class="st">${'★'.repeat(s)}${'<i>☆</i>'.repeat(3 - s)}</span></span>`;
    b.onclick = () => startLevel(i);
    list.appendChild(b);
  });
  $('levelPick').classList.remove('hidden');
}
$('levelPick').querySelector('[data-close]').onclick = () => { hideOverlays(); if (mode !== 'free') startFree(); else segMode('free'); };
$('resRetry').onclick = () => startLevel(L.i);
$('resList').onclick = () => { hideOverlays(); showLevels(); };
$('resNext').onclick = () => startLevel(Math.min(L.i + 1, LEVELS.length - 1));

let toastT;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1800); }

// ---------------------------------------------------------------- 關卡判定（每 0.3 秒數一次格子）
function checkLevel() {
  if (mode !== 'level' || L.done || simTime - lastCount < 0.3) return;
  lastCount = simTime;
  const w = L.win;
  const regs = [{ ...w.region, mats: w.mats }];
  if (w.region2) regs.push({ ...w.region2, mats: w.mats });
  // 有石牆額度的關卡：順便數整張圖有幾格石牆＋木頭，用「實際還在畫面上的」算用量 → 擦掉、燒掉都會還回來
  const inkIdx = L.inkMax ? regs.push({ x0: 0, y0: 0, x1: sim.w, y1: sim.h, mats: [M.WALL, M.WOOD] }) - 1 : -1;
  const p = sim.count(regs);
  if (!p) return;
  const t0 = simTime;
  p.then((n) => {
    if (!n || mode !== 'level' || L.done) return;
    if (inkIdx >= 0 && L.inkBase != null && !ptr.down) {
      L.ink = Math.max(0, n[inkIdx] - L.inkBase) / (sim.w * 9);   // 一個單位的筆畫大約是 9 × 寬 格
      if (L.ink < L.inkMax * 0.98) L.inkWarned = false;
    }
    if (w.kind === 'fill') {
      const area = (r) => Math.max(1, (r.x1 - r.x0) * (r.y1 - r.y0));
      const k = Math.min(...n.map((v, i) => v / area(regs[i]) / w.need));
      L.prog = Math.min(1, k);
      if (k >= 1) { L.held += 0.3; if (L.held >= 1) finish(true); } else L.held = 0;
    } else {
      if (L.start === null && t0 > 0.2) L.start = n[0];
      if (L.start) {
        const k = n[0] / L.start; L.prog = k; L.best = k;
        if (k < w.keep) finish(false);
        else if (t0 >= w.time) finish(true);
      }
    }
  });
}

function starsFor() {
  const w = L.win;
  if (w.kind === 'survive') return L.best >= 0.97 ? 3 : L.best >= 0.92 ? 2 : 1;
  if (L.inkMax > 0) { const k = L.ink / L.inkMax; return k <= 0.5 ? 3 : k <= 0.75 ? 2 : 1; }
  return simTime < 30 ? 3 : simTime < 60 ? 2 : 1;
}

function finish(ok) {
  L.done = true;
  const lv = LEVELS[L.i];
  if (ok) {
    const s = starsFor();
    save.stars[lv.id] = Math.max(save.stars[lv.id] || 0, s); persist();
    $('resTitle').textContent = '過關！🎉';
    $('resStars').textContent = '★'.repeat(s) + '☆'.repeat(3 - s);
    $('resText').textContent = L.win.kind === 'survive' ? `小屋保住了 ${Math.round(L.best * 100)}%。` : L.inkMax ? `用了 ${Math.round(L.ink / L.inkMax * 100)}% 的石牆。用越少星星越多。` : `花了 ${Math.round(simTime)} 秒。`;
    $('resNext').style.display = L.i < LEVELS.length - 1 ? '' : 'none';
    sound.win(); confetti();
  } else {
    $('resTitle').textContent = '小屋燒起來了 😢';
    $('resStars').textContent = '';
    $('resText').textContent = '再想想看：' + (lv.hint || '換個方法試試看！');
    $('resNext').style.display = 'none';
    sound.lose();
  }
  setTimeout(() => $('result').classList.remove('hidden'), ok ? 500 : 900);
}

// 過關的彩紙
function confetti() {
  const box = $('confetti'); box.innerHTML = '';
  const em = ['🎉', '✨', '⭐', '🌟', '💛', '💎'];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('span'); s.textContent = em[i % em.length];
    s.style.left = Math.random() * 100 + '%'; s.style.animationDelay = Math.random() * 0.6 + 's'; s.style.fontSize = 16 + Math.random() * 20 + 'px';
    s.style.setProperty('--dx', (Math.random() - 0.5) * 200 + 'px');
    box.appendChild(s);
  }
  setTimeout(() => { box.innerHTML = ''; }, 3200);
}
// 第一次玩的提示
// 第一次進來的提示：開始倒東西、或過 9 秒就自動收起來
function showHint() { if (save.hinted) return; $('hint').classList.remove('hidden'); setTimeout(hideHint, 9000); }
function hideHint() { if (!$('hint').classList.contains('hidden')) { $('hint').classList.add('hidden'); save.hinted = 1; persist(); } }

function updateHud() {
  if (mode !== 'level') return;
  $('prog').style.width = Math.round(L.prog * 100) + '%';
  $('prog').style.background = L.win.kind === 'survive' ? (L.prog < 0.92 ? 'var(--bad)' : 'var(--good)') : 'var(--good)';
  if (L.inkMax) $('ink').style.width = Math.max(0, 100 - L.ink / L.inkMax * 100) + '%';
  $('timer').textContent = L.win.kind === 'survive' ? `${Math.max(0, Math.ceil(L.win.time - simTime))} 秒` : '';
}

// ---------------------------------------------------------------- 筆刷游標
function drawCursor() {
  const W = cursor.width, H = cursor.height;
  cctx.clearRect(0, 0, W, H);
  const k = W / sim.w;
  // 關卡目標範圍：虛線框
  if (mode === 'level' && !L.done) {
    const w = L.win, dpr = W / cursor.clientWidth;
    cctx.save(); cctx.setLineDash([6 * dpr, 5 * dpr]); cctx.lineWidth = 1.5 * dpr;
    cctx.strokeStyle = w.kind === 'survive' ? 'rgba(255,190,90,.55)' : 'rgba(120,255,170,.7)';
    for (const r of [w.region, w.region2].filter(Boolean)) {
      cctx.strokeRect(r.x0 * k, r.y0 * k, (r.x1 - r.x0) * k, (r.y1 - r.y0) * k);
    }
    cctx.restore();
  }
  if (!ptr.over && !ptr.down) return;
  cctx.strokeStyle = 'rgba(255,255,255,.7)'; cctx.lineWidth = 1.5;
  cctx.beginPath(); cctx.arc(ptr.x * k, ptr.y * k, brushR() * k, 0, Math.PI * 2); cctx.stroke();
}

// ---------------------------------------------------------------- 主迴圈（物理固定 60 格／秒）
let last = 0;
function step(passesOverride) {
  const stamps = stampsNow();
  const passes = paused ? 0 : (passesOverride ?? PASSES);
  sim.frame({ stamps, passes, time: performance.now() / 1000, glow: 1 });
  if (!paused) { simTime += 1 / 60; frames++; }
  checkLevel(); updateHud();
}
function loop(t) {
  requestAnimationFrame(loop);
  if (t - last < 1000 / 62) return;
  last = t;
  step(); drawCursor(); if (ptr.down) sound.tick();
}


await loadStep(0.9, '鋪沙子…');
startFree();
await loadStep(1, '好了！');
{ const el = $('loading'); el.style.opacity = 0; setTimeout(() => el.remove(), 400); }
setTool(tool); showHint();
$('soundBtn').onclick = () => { sound.start(); sound.setOn(!sound.on); save.soundOff = !sound.on; persist(); $('soundBtn').textContent = sound.on ? '🔊' : '🔇'; };
if (save.soundOff) sound.setOn(false); $('soundBtn').textContent = sound.on ? '🔊' : '🔇';
if (!params.has('paused')) requestAnimationFrame(loop);

// 自動測試用
window.__sand = {
  sim, GPU, LEVELS,
  get mode() { return mode; }, get L() { return L; }, get simTime() { return simTime; },
  startLevel, startFree, setTool,
  // 用比例座標畫一筆（下一格生效）
  paint(x0, y0, x1, y1, id = tool, sz = size) {
    const t = TOOLS[id], r = [2, 4.5, 9][sz] * Math.max(1, sim.w / 400);
    const s = { x0: x0 * sim.w, y0: y0 * sim.h, x1: x1 * sim.w, y1: y1 * sim.h, r, mat: t.mat, prob: t.prob, mode: t.mode };
    if (mode === 'level' && L.inkMax && (id === 'wall' || id === 'wood')) L.ink += (Math.hypot(s.x1 - s.x0, s.y1 - s.y0) + 0.6) * r / (sim.w * 4.5);
    sim.frame({ stamps: [s], passes: 0, time: 0 });
  },
  async run(sec) { for (let i = 0; i < sec * 60; i++) { step(); if (i % 30 === 29) await new Promise((r) => setTimeout(r, 0)); } await sim.count([{ x0: 0, y0: 0, x1: 1, y1: 1, mats: [0] }]); },
  async snap() {
    const img = await sim.snapshot();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    c.getContext('2d').putImageData(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.85);
  },
  async census() { const a = await sim.readCells(); const n = {}; for (const v of a) { const t = v & 255; n[t] = (n[t] || 0) + 1; } return n; },
};
window.__ready = true;
