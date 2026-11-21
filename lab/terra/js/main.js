// 造物主之島：渲染器、天空與光、工具（堆山、挖地、下雨、泉水）、鏡頭、任務、存檔
import * as THREE from 'three';
import { pass, vec3, mix, smoothstep, positionWorld, normalize, float, max, uniform } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { GpuSim } from './sim.js';
import { CpuSim } from './simcpu.js';
import { makeIsland, World, Trees } from './world.js';
import { Villages, VMAX } from './villages.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const step = async (k, m) => { $('loadBar').style.width = Math.round(k * 100) + '%'; if (m) $('loadMsg').textContent = m; await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); };
const SAVE_KEY = 'mwLabTerra.v1';
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
save.done = save.done || {}; save.seed = save.seed || 7;
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { } };

// ---------------------------------------------------------------- 渲染器
await step(0.08, '啟動顯示卡…');
const canvas = $('view');
const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance', forceWebGL: params.has('gl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
await renderer.init();
const WEBGPU = !!renderer.backend.isWebGPUBackend;
const HIGH = (params.get('q') || (WEBGPU && !isTouch ? 'high' : 'low')) === 'high';
const N = +(params.get('n') || (WEBGPU ? (HIGH ? 256 : 192) : 96));
$('engine').textContent = `${WEBGPU ? 'WebGPU' : '相容模式（CPU 模擬）'} · ${N}×${N} 格`;
renderer.shadowMap.enabled = HIGH;

const scene = new THREE.Scene();
// 天空：上深下淺的藍，地平線偏暖；也拿來當環境光（水面、反射）
const skyMat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
const gloom = uniform(0);   // 下雨時天空變灰
skyMat.colorNode = (() => { const d = normalize(positionWorld); const c = mix(mix(vec3(0.85, 0.78, 0.68), vec3(0.45, 0.66, 0.9), smoothstep(-0.02, 0.25, d.y)), vec3(0.18, 0.36, 0.7), smoothstep(0.25, 0.9, d.y)); return mix(c, vec3(0.5, 0.55, 0.6).mul(float(1).sub(d.y.mul(0.3))), gloom.mul(0.8)); })();
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), skyMat); scene.add(sky);
scene.fog = new THREE.Fog(0xa9c4d8, N * 1.2, N * 4);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.position.set(-N * 0.5, N * 0.6, N * 0.3); scene.add(sun, sun.target);
if (HIGH) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const c = sun.shadow.camera; c.left = c.bottom = -N * 0.6; c.right = c.top = N * 0.6; c.far = N * 3; sun.shadow.bias = -0.0008; }
scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x4a5a3a, 1.1));
{ const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(new THREE.Mesh(sky.geometry, skyMat)); scene.environment = pm.fromScene(es, 0.02).texture; scene.environmentIntensity = 0.6; }
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.5, 5000);

await step(0.3, '產生一座島…');
let sim, world, trees;
function build(seed) {
  const H = makeIsland(N, seed);
  if (world) { scene.remove(world.terrain, world.water); }
  sim = WEBGPU ? new GpuSim(renderer, N, H) : new CpuSim(N, H);
  world = new World(scene, N, sim.tex, { high: HIGH });
  if (!trees) trees = new Trees(scene, N, Math.round(N * N / 70));
  snap = { H: H.slice(), W: new Float32Array(N * N) }; H0 = H.slice();
  springs = []; sim.setSprings(springs); refreshSpringMarks();
  if (!villages) villages = new Villages(scene, N); villages.clear(); undoStack.length = 0; touched = new Uint8Array(N * N);
}
let villages = null, lastTapV = null, lastTapT = 0; const undoStack = [];
// 被工具直接改過的格子：三角洲、山谷任務只算「水和泥沙自己做出來的」，不算用工具堆的、挖的
let touched = new Uint8Array(N * N);
function markTouched(b) { const r = Math.ceil(b.r); for (let y = Math.max(0, Math.floor(b.y - r)); y <= Math.min(N - 1, b.y + r); y++) for (let x = Math.max(0, Math.floor(b.x - r)); x <= Math.min(N - 1, b.x + r); x++) if (Math.hypot(x - b.x, y - b.y) < b.r) touched[y * N + x] = 1; }
let snap = null, H0 = null, springs = [];
const springMarks = new THREE.Group(); scene.add(springMarks);
function refreshSpringMarks() {
  springMarks.clear();
  for (const s of springs) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 1.2, 12), new THREE.MeshStandardNodeMaterial({ color: 0x8fd8ff, emissive: 0x2a8acc, roughness: 0.3 })); m.userData.s = s; springMarks.add(m); }
}

await step(0.5, '編譯水流和沖刷的 compute shader…');
build(save.seed);
const pipeline = new THREE.RenderPipeline(renderer);
{ const sp = pass(scene, camera), col = sp.getTextureNode(); pipeline.outputNode = col.add(bloom(col, 0.12, 0.3, 0.85)); }
const OFF = params.has('offscreen') ? new THREE.RenderTarget(1, 1) : null;
void float; void max;

// ---------------------------------------------------------------- 鏡頭：cam 是現在的樣子，goal 是要去的樣子（慢慢靠過去，轉動和縮放比較滑順）
const cam = { yaw: 0.6, pitch: 0.75, dist: N * 1.25, tx: 0, tz: 0, ty: 0 };
const goal = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, tx: 0, tz: 0 };
const HOME = { ...goal };
const DMIN = N * 0.1, DMAX = N * 2.4, PMIN = 0.18, PMAX = 1.5;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
function groundH(x, z) { const half = (N - 1) / 2, i = Math.round(clampN(z + half, 0, N - 1)) * N + Math.round(clampN(x + half, 0, N - 1)); return Math.max(0, snap.H[i] || 0); }
function updateCamera(dt) {
  const k = dt == null ? 1 : 1 - Math.exp(-dt * 14);
  for (const key of ['yaw', 'pitch', 'dist', 'tx', 'tz']) cam[key] += (goal[key] - cam[key]) * k;
  // 看的那一點跟著地面高度走（拉近山頂的時候不會鑽進山裡）
  cam.ty += (groundH(cam.tx, cam.tz) * 0.85 - cam.ty) * (dt == null ? 1 : 1 - Math.exp(-dt * 3));
  const cp = Math.cos(cam.pitch);
  camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, cam.ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist);
  const floorY = groundH(camera.position.x, camera.position.z) + 2.5;   // 鏡頭不要鑽到山裡
  if (camera.position.y < floorY) camera.position.y = floorY;
  camera.lookAt(cam.tx, cam.ty, cam.tz);
  camera.updateMatrixWorld();
}
function clampCam() { const L = N * 0.6; for (const o of [cam, goal]) { o.tx = clampN(o.tx, -L, L); o.tz = clampN(o.tz, -L, L); } goal.dist = clampN(goal.dist, DMIN, DMAX); goal.pitch = clampN(goal.pitch, PMIN, PMAX); }
addEventListener('resize', () => { if (typeof dock === 'function' && villages) dock(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });
camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();

// 螢幕上的一點，對到「看的那一點同高的水平面」上的哪裡（拿來抓著地面平移、對著手指縮放）
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), _pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function planeAt(cx, cy) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  _pl.constant = -cam.ty; const p = ray.ray.intersectPlane(_pl, new THREE.Vector3());
  if (!p || p.distanceTo(camera.position) > cam.dist * 6) return null; return p;
}
// 抓著地面拖：手指底下的那塊地跟著手指走（直接動，不等滑順）
const fling = { x: 0, z: 0 };
function grabPan(x0, y0, x1, y1, dt) {
  const a = planeAt(x0, y0), b = planeAt(x1, y1); if (!a || !b) return;
  let dx = a.x - b.x, dz = a.z - b.z; const m = Math.hypot(dx, dz), lim = cam.dist * 0.4; if (m > lim) { dx *= lim / m; dz *= lim / m; }
  cam.tx += dx; cam.tz += dz; goal.tx += dx; goal.tz += dz; clampCam(); updateCamera();
  if (dt) { fling.x = fling.x * 0.5 + dx / dt * 0.5; fling.z = fling.z * 0.5 + dz / dt * 0.5; }
}
// 縮放：對著手指（或滑鼠）那一點拉近拉遠
function zoomAt(cx, cy, f, direct) {
  const nd = clampN(goal.dist * f, DMIN, DMAX); f = nd / goal.dist;
  const p = cx == null ? null : planeAt(cx, cy);
  goal.dist = nd; if (direct) cam.dist = clampN(cam.dist * f, DMIN, DMAX);
  if (p) { const ox = (p.x - goal.tx) * (1 - f), oz = (p.z - goal.tz) * (1 - f); goal.tx += ox; goal.tz += oz; if (direct) { cam.tx += ox; cam.tz += oz; } clampCam(); }
}
function rotateBy(dyaw, dpitch, direct) { goal.yaw += dyaw; goal.pitch = clampN(goal.pitch + dpitch, PMIN, PMAX); if (direct) { cam.yaw += dyaw; cam.pitch = clampN(cam.pitch + dpitch, PMIN, PMAX); } }

// ---------------------------------------------------------------- 點到島上的哪一格（用讀回來的高度，沿著視線一步步走）
function pick(cx, cy) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction, half = (N - 1) / 2, p = new THREE.Vector3();
  const stepL = Math.max(0.25, cam.dist / 500);
  for (let t = 0; t < cam.dist * 4; t += stepL) {
    p.copy(o).addScaledVector(d, t);
    const x = p.x + half, y = p.z + half;
    if (x < 0 || y < 0 || x > N - 1 || y > N - 1) { if (p.y < 0) return null; continue; }
    const i = Math.round(y) * N + Math.round(x);
    if (p.y <= Math.max(snap.H[i], 0)) return { x, y, p };
  }
  return null;
}

// ---------------------------------------------------------------- 工具
const TOOLS = [
  { k: 'look', emoji: '✋', name: '移動', tip: isTouch ? '拖曳移動地圖。兩根手指：捏合縮放、轉一轉轉向、一起上下推改變角度。' : '拖曳移動地圖。滾輪縮放、右鍵拖曳轉向，也可以用 WASD 和 Q／E。' },
  { k: 'raise', emoji: '⛰️', name: '堆山', mode: 1, amt: 14, r: 9, tip: '按住拖曳，地面會慢慢長高。' },
  { k: 'dig', emoji: '⛏️', name: '挖地', mode: 2, amt: 12, r: 6, tip: '按住拖曳，挖出河道或湖。挖到海平面以下，海水就會灌進來。' },
  { k: 'rain', emoji: '🌧️', name: '下雨', mode: 3, amt: 2.2, r: 12, tip: '按住拖曳，那裡會下大雨。雨水會往低處流，匯成小河。' },
  { k: 'spring', emoji: '💧', name: '泉水', tip: '點一下放一個泉水（最多 8 個），會一直冒水。點泉水旁邊可以拿掉。' },
  { k: 'smooth', emoji: '🧹', name: '整平', mode: 4, amt: 8, r: 7, tip: '按住拖曳，把尖尖的山和小坑磨平，適合蓋村莊或修河堤。' },
  { k: 'volcano', emoji: '🌋', name: '火山', mode: 5, amt: 12, r: 13, tip: '按住不放，長出一座有火山口的山。下雨後火山口會變成湖。' },
  { k: 'village', emoji: '🏘️', name: '村莊', tip: `點一下蓋村莊（最多 ${VMAX} 個）。附近有河或湖會長大，被淹到房子會被沖走。點村莊可以拿掉。` },
];
const SIZES = [['小', 0.55], ['中', 1], ['大', 1.7]];
let tool = 'raise', globalRain = false, speed = 1, brush = null, sizeK = save.size ?? 1;
const curTool = () => TOOLS.find((q) => q.k === tool);
function dock() {
  const d = $('dock'); d.innerHTML = '';
  const add = (html, title, fn, on) => { const b = document.createElement('button'); b.className = 'db' + (on ? ' on' : ''); b.innerHTML = html; b.title = title; b.onclick = fn; d.appendChild(b); return b; };
  for (const t of TOOLS) add(`<b>${t.emoji}</b>${t.name}`, t.tip, () => { tool = t.k; dock(); toast(t.tip); }, tool === t.k);
  const sep = document.createElement('span'); sep.className = 'sep'; d.appendChild(sep);
  add(`<b>${globalRain ? '☔' : '☀️'}</b>${globalRain ? '全島下雨' : '晴天'}`, '整座島一起下雨', () => { globalRain = !globalRain; dock(); toast(globalRain ? '☔ 整座島都在下雨，看看河流會怎麼長出來' : '☀️ 雨停了，水會慢慢流走、蒸發'); }, globalRain);
  add('<b>↩️</b>復原', '回到上一筆之前的地形', undo).disabled = !undoStack.length;
  add('<b>🔄</b>新的島', '換一座新的島（會清掉現在的地形）', () => { if (!confirm('要換一座新的島嗎？現在的地形會不見。')) return; save.seed = (save.seed * 31 + 17) % 9973; persist(); build(save.seed); toast('🏝️ 新的島出現了'); });
  // 筆刷大小：只有用筆刷的工具才出現
  const sb = $('sizeBar'), t = curTool();
  sb.classList.toggle('hidden', !t.mode);
  sb.innerHTML = '<span>筆刷</span>' + SIZES.map(([n, k], i) => `<button data-i="${i}" class="${sizeK === i ? 'on' : ''}">${n}</button>`).join('');
  sb.querySelectorAll('button').forEach((b) => { b.onclick = () => { sizeK = +b.dataset.i; save.size = sizeK; persist(); dock(); }; });
  // 工具列可能換行（手機）：訊息、說明、筆刷大小都放在工具列上面
  const r = d.getBoundingClientRect(); document.documentElement.style.setProperty('--dockH', Math.round(innerHeight - r.top) + 'px');
}
// 復原：每一筆開始畫之前記下地形（最多 10 筆）
function pushUndo() { undoStack.push({ H: snap.H.slice(), springs: springs.map((q) => ({ ...q })) }); if (undoStack.length > 10) undoStack.shift(); if (undoStack.length === 1) dock(); }
function undo() {
  const u = undoStack.pop(); if (!u) return;
  sim.setH(u.H); snap = { H: u.H, W: snap.W }; springs = u.springs; sim.setSprings(springs); refreshSpringMarks();
  toast('↩️ 回到上一步'); dock();
}
let toastT;
// 訊息：一次一則；很多則一起來（村莊、任務）就排隊，不會一閃就被蓋掉
const toastQ = [];
function toast(t, wait) {
  if (wait && toastT) { if (toastQ.length < 4) toastQ.push(t); return; }
  const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => { el.classList.remove('show'); toastT = null; if (toastQ.length) setTimeout(() => toast(toastQ.shift()), 300); }, 2600);
}

// ---------------------------------------------------------------- 操作
// 不讓瀏覽器把整個網頁放大（按鈕和文字跟著變大）：兩根手指、觸控板捏合、連點兩下都只動鏡頭
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
let gScale = 1;
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => {
  e.preventDefault();
  // Safari 電腦版：觸控板捏合只有 gesture 事件（手機的捏合交給 pointer 事件處理）
  if (isTouch) return;
  if (ev === 'gesturestart') gScale = 1; else if (ev === 'gesturechange') { zoomAt(e.clientX, e.clientY, gScale / e.scale); gScale = e.scale; }
}, { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault());
addEventListener('wheel', (e) => {
  const onCanvas = e.target === canvas;
  if (!onCanvas && !e.ctrlKey) return;          // 任務清單之類的面板照常捲動
  e.preventDefault();                           // ctrl＋滾輪（觸控板捏合）不要放大整個網頁
  const d = e.deltaY * (e.deltaMode === 1 ? 30 : 1);
  zoomAt(e.clientX, e.clientY, Math.exp(clampN(d, -120, 120) * (e.ctrlKey ? 0.01 : 0.0015)));
}, { passive: false });

const ptrs = new Map(); let drag = null;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  try { canvas.setPointerCapture(e.pointerId); } catch { }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  $('help').style.opacity = 0; fling.x = fling.z = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; drag = { kind: 'two', a: { ...a }, b: { ...b }, mode: null, acc: 0 }; brush = null; cursor.visible = false; return; }
  if (ptrs.size > 2) return;
  // 右鍵轉向；中鍵、按著空白鍵或用「移動」工具＝拖曳平移；其他＝用工具
  const kind = e.button === 2 ? 'rot' : (e.button === 1 || keys.has(' ') || tool === 'look') ? 'pan' : 'tool';
  drag = { kind, lx: e.clientX, ly: e.clientY, t: performance.now() };
  if (kind === 'tool') useTool(e.clientX, e.clientY, true);
});
canvas.addEventListener('pointermove', (e) => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!drag) { hoverAt(e.clientX, e.clientY); return; }
  if (drag.kind === 'two') {
    if (ptrs.size < 2) return; const [a, b] = [...ptrs.values()], la = drag.a, lb = drag.b;
    const pd = Math.hypot(la.x - lb.x, la.y - lb.y), nd = Math.hypot(a.x - b.x, a.y - b.y);
    const pmx = (la.x + lb.x) / 2, pmy = (la.y + lb.y) / 2, nmx = (a.x + b.x) / 2, nmy = (a.y + b.y) / 2;
    // 一開始先看手勢：兩根手指一起上下推＝改變俯視角度；其他＝平移＋縮放＋轉向
    if (!drag.mode) {
      drag.acc += Math.abs(a.y - la.y) + Math.abs(b.y - lb.y) + Math.abs(a.x - la.x) + Math.abs(b.x - lb.x);
      drag.sy = (drag.sy || 0) + (a.y - la.y) + (b.y - lb.y); drag.sd = (drag.sd || 0) + Math.abs(nd - pd); drag.sx = (drag.sx || 0) + Math.abs(nmx - pmx);
      if (drag.acc > 24) drag.mode = Math.sign(a.y - la.y || 1) === Math.sign(b.y - lb.y || 1) && Math.abs(drag.sy) > drag.sd * 3 + drag.sx * 2 && Math.abs(drag.sy) > 18 ? 'tilt' : 'free';
    }
    if (drag.mode === 'tilt') rotateBy(0, (nmy - pmy) * 0.006, true);
    else if (drag.mode === 'free') {
      grabPan(pmx, pmy, nmx, nmy);
      if (nd > 10 && pd > 10) zoomAt(nmx, nmy, pd / nd, true);
      let da = Math.atan2(b.y - a.y, b.x - a.x) - Math.atan2(lb.y - la.y, lb.x - la.x); da = Math.atan2(Math.sin(da), Math.cos(da));
      if (nd > 60) rotateBy(-da, 0, true);
      updateCamera();
    }
    drag.a = { ...a }; drag.b = { ...b }; return;
  }
  const now = performance.now(), dt = Math.max(0.004, (now - drag.t) / 1000); drag.t = now;
  const lx = drag.lx, ly = drag.ly; drag.lx = e.clientX; drag.ly = e.clientY;
  if (drag.kind === 'rot') { rotateBy(-(e.clientX - lx) * 0.006, (e.clientY - ly) * 0.004, false); return; }
  if (drag.kind === 'pan') { grabPan(lx, ly, e.clientX, e.clientY, dt); return; }
  useTool(e.clientX, e.clientY, false);
});
const endP = (e) => {
  ptrs.delete(e.pointerId);
  if (drag && drag.kind === 'pan' && performance.now() - drag.t > 80) fling.x = fling.z = 0;   // 停住才放手就不要滑
  if (!ptrs.size) { if (!drag || drag.kind !== 'pan') fling.x = fling.z = 0; drag = null; brush = null; return; }
  // 兩根手指放掉一根：用「移動」工具時接著平移，用其他工具時不要突然開始畫
  if (drag && drag.kind === 'two') { const [p] = [...ptrs.values()]; drag = tool === 'look' ? { kind: 'pan', lx: p.x, ly: p.y, t: performance.now() } : { kind: 'wait' }; }
};
canvas.addEventListener('pointerup', endP); canvas.addEventListener('pointercancel', endP);

// 鍵盤：WASD／方向鍵移動、Q E 轉向、R F 俯仰、＋－縮放、Home 回到全島
const keys = new Set();
addEventListener('keydown', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys.add(k); if (k === 'Home' || k === '0') resetView(); if (k === ' ' || k.startsWith('Arrow')) e.preventDefault(); });
addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys.delete(k); });
addEventListener('blur', () => keys.clear());
const held = new Set();   // 畫面右邊的鏡頭按鈕（按住會一直動）
function moveInput(dt) {
  const has = (...ks) => ks.some((k) => keys.has(k) || held.has(k));
  let f = 0, s = 0;
  if (has('w', 'ArrowUp')) f += 1; if (has('s', 'ArrowDown')) f -= 1; if (has('d', 'ArrowRight')) s += 1; if (has('a', 'ArrowLeft')) s -= 1;
  if (f || s) { const v = goal.dist * 0.9 * dt, fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw); goal.tx += (fx * f + -fz * s) * v; goal.tz += (fz * f + fx * s) * v; clampCam(); }
  if (has('q', 'rotL')) rotateBy(1.6 * dt, 0); if (has('e', 'rotR')) rotateBy(-1.6 * dt, 0);
  if (has('r', 'tiltUp')) rotateBy(0, 1 * dt); if (has('f', 'tiltDn')) rotateBy(0, -1 * dt);
  if (has('=', '+', 'zin')) zoomAt(null, null, Math.exp(-1.6 * dt)); if (has('-', '_', 'zout')) zoomAt(null, null, Math.exp(1.6 * dt));
  // 放手後地圖還會滑一下
  if (fling.x || fling.z) { goal.tx += fling.x * dt; goal.tz += fling.z * dt; cam.tx += fling.x * dt; cam.tz += fling.z * dt; clampCam(); const k = Math.exp(-dt * 5); fling.x *= k; fling.z *= k; if (Math.hypot(fling.x, fling.z) < 0.5) fling.x = fling.z = 0; }
}
function resetView() { Object.assign(goal, HOME); goal.yaw = cam.yaw + Math.atan2(Math.sin(HOME.yaw - cam.yaw), Math.cos(HOME.yaw - cam.yaw)); fling.x = fling.z = 0; }
for (const b of document.querySelectorAll('#camPad button')) {
  const a = b.dataset.a;
  if (a === 'home') { b.onclick = resetView; continue; }
  if (a === 'top') { b.onclick = () => { goal.pitch = goal.pitch > 1.2 ? 0.75 : 1.45; }; continue; }
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); held.add(a); b.setPointerCapture(e.pointerId); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => held.delete(a));
}

// 小地圖：看得到整座島、鏡頭在哪裡、朝哪邊看；點一下（或拖曳）就飛過去
const mini = $('mini'), mctx = mini.getContext('2d'), MS = Math.min(N, 128);
const mbase = document.createElement('canvas'); mbase.width = mbase.height = MS; const mbctx = mbase.getContext('2d'), mimg = mbctx.createImageData(MS, MS);
function drawMiniBase(s) {
  const d = mimg.data;
  for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) {
    const i = Math.floor(y * N / MS) * N + Math.floor(x * N / MS), h = s.H[i], w = s.W[i], o = (y * MS + x) * 4;
    let r, g, b;
    if (h < 0) { const k = clampN(-h / 10, 0, 1); r = 40 - 25 * k; g = 120 - 60 * k; b = 170 - 50 * k; }
    else if (w > 0.05) { r = 60; g = 150; b = 210; }
    else if (h < 1.5) { r = 210; g = 190; b = 130; }
    else if (h < 22) { const k = h / 22; r = 70 + 60 * k; g = 130 - 20 * k; b = 50 + 30 * k; }
    else if (h < 32) { r = 135; g = 128; b = 120; } else { r = 240; g = 240; b = 245; }
    d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
  }
  mbctx.putImageData(mimg, 0, 0);
}
function drawMini() {
  const W = mini.width, k = W / N, half = (N - 1) / 2;
  mctx.imageSmoothingEnabled = true; mctx.drawImage(mbase, 0, 0, W, W);
  const cx = (cam.tx + half) * k, cy = (cam.tz + half) * k;
  // 看得到的範圍（大概）：一個跟著鏡頭轉的扇形
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), r = Math.min(W, cam.dist * k * 0.9), sp = 0.6;
  const px = (camera.position.x + half) * k, py = (camera.position.z + half) * k;
  mctx.fillStyle = 'rgba(255,230,120,.22)'; mctx.strokeStyle = 'rgba(255,230,120,.9)'; mctx.lineWidth = 1.5;
  mctx.beginPath(); mctx.moveTo(px, py);
  const ang = Math.atan2(fz, fx); mctx.arc(px, py, Math.hypot(cx - px, cy - py) + r * 0.5, ang - sp, ang + sp); mctx.closePath(); mctx.fill(); mctx.stroke();
  mctx.fillStyle = '#ffd76a'; mctx.beginPath(); mctx.arc(cx, cy, 3.5, 0, 7); mctx.fill();
  for (const s of springs) { mctx.fillStyle = '#8fe0ff'; mctx.fillRect(s.x * k - 2, s.y * k - 2, 4, 4); }
  for (const v of villages.list) { mctx.fillStyle = '#ff7a5a'; mctx.fillRect(v.x * k - 3, v.y * k - 3, 6, 6); }
}
{
  let down = false;
  const go = (e) => { const r = mini.getBoundingClientRect(), half = (N - 1) / 2; goal.tx = (e.clientX - r.left) / r.width * N - half; goal.tz = (e.clientY - r.top) / r.height * N - half; fling.x = fling.z = 0; clampCam(); };
  mini.addEventListener('pointerdown', (e) => { down = true; mini.setPointerCapture(e.pointerId); go(e); });
  mini.addEventListener('pointermove', (e) => { if (down) go(e); });
  for (const ev of ['pointerup', 'pointercancel']) mini.addEventListener(ev, () => { down = false; });
}

// 筆刷游標：地上一個圈
const cursor = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: 0xffe27a, transparent: true, opacity: 0.85, depthTest: false }));
cursor.renderOrder = 9; cursor.visible = false; scene.add(cursor);
const radius = (t) => (t.r || 2) * (t.mode ? SIZES[sizeK][1] : 1);
function hoverAt(cx, cy) {
  const t = curTool();
  if (!t.mode && tool !== 'spring' && tool !== 'village') { cursor.visible = false; return; }
  const h = pick(cx, cy); if (!h) { cursor.visible = false; return; }
  cursor.visible = true; cursor.position.set(h.p.x, h.p.y + 0.3, h.p.z); cursor.scale.setScalar(radius(t));
}
function useTool(cx, cy, first) {
  const t = curTool(), h = pick(cx, cy);
  hoverAt(cx, cy);
  if (!h) { brush = null; return; }
  if (t.mode) { if (first && t.mode !== 3) pushUndo(); brush = { x: h.x, y: h.y, r: radius(t), mode: t.mode, amt: t.amt }; if (first && tool === 'rain') sound.rain(true); return; }
  if (tool === 'village' && first) {
    const near = villages.list.find((v) => Math.hypot(v.x - h.x, v.y - h.y) < 5);
    if (near) {
      // 點一下看村莊的狀況；很快再點一次才拿掉（不會一不小心就把村莊拆了）
      if (near === lastTapV && performance.now() - lastTapT < 2500) { villages.removeNear(h.x, h.y); villages.draw(snap); toast(`拿掉了${near.name}`); lastTapV = null; return; }
      lastTapV = near; lastTapT = performance.now();
      toast(`${near.name}：${near.pop} 間房子，${near.wet ? '淹水了！' : near.fresh > 6 ? '附近有河或湖 👍' : near.sea > 4 ? '靠海捕魚，長得慢' : '附近沒有水 😢'}（再點一次拿掉）`); return;
    }
    const why = villages.canBuild(snap, h.x, h.y);
    if (why) { toast('🏘️ ' + why); return; }
    if (!villages.add(h.x, h.y)) { toast(`村莊最多 ${VMAX} 個`); return; }
    villages.draw(snap); toast(`🏘️ 蓋了${villages.list[villages.list.length - 1].name}！附近要有河或湖才會長大`); sound.ding(); return;
  }
  if (tool === 'spring' && first) {
    pushUndo();
    const near = springs.findIndex((s) => Math.hypot(s.x - h.x, s.y - h.y) < 4);
    if (near >= 0) { springs.splice(near, 1); toast('拿掉一個泉水'); }
    else if (springs.length >= 8) toast('泉水最多 8 個');
    else { springs.push({ x: h.x, y: h.y, r: 2.2, rate: 2.5 }); toast('💧 放了一個泉水'); }
    sim.setSprings(springs); refreshSpringMarks();
  }
}

// ---------------------------------------------------------------- 任務：看讀回來的高度和水深
const GOALS = [
  { id: 'river', t: '🌊 放一個泉水，讓河流流到海裡', check(s) {
    if (!springs.length) return 0;
    // 從泉水開始，沿著「有水的格子」往外找，看能不能走到海
    const seen = new Uint8Array(N * N), q = [];
    for (const sp of springs) { const i = Math.round(sp.y) * N + Math.round(sp.x); if (s.W[i] > 0.01) { seen[i] = 1; q.push(i); } }
    let far = 0;
    while (q.length) { const i = q.pop(); if (s.H[i] < -0.2) return 1; const x = i % N, y = (i / N) | 0; for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, y > 0 ? i - N : -1, y < N - 1 ? i + N : -1]) if (j >= 0 && !seen[j] && s.W[j] > 0.01) { seen[j] = 1; q.push(j); far++; } }
    return Math.min(0.95, far / 600);
  } },
  { id: 'lake', t: '🏞️ 在陸地上做一個湖（積水很深的地方）', check(s) { let n = 0; for (let i = 0; i < N * N; i++) if (H0[i] > 0.3 && s.W[i] > 0.8) n++; return Math.min(1, n / (N * N / 450)); } },
  { id: 'peak', t: '🏔️ 堆一座 45 公尺高的山', check(s) { let m = 0; for (let i = 0; i < N * N; i++) m = Math.max(m, s.H[i]); return Math.min(1, Math.max(0, (m - 25) / 20)); } },
  { id: 'canyon', t: '🏜️ 讓雨水和河流沖刷出山谷', check(s) { let e = 0; for (let i = 0; i < N * N; i++) if (!touched[i] && H0[i] > 1 && s.H[i] < H0[i] && s.H[i] > H0[i] - 6) e += H0[i] - s.H[i]; return Math.min(1, e / (N * N / 70)); } },
  { id: 'delta', t: '🏖️ 泥沙在河口堆出新的陸地（三角洲）', check(s) { let n = 0; for (let i = 0; i < N * N; i++) if (!touched[i] && H0[i] < -0.2 && s.H[i] > -0.05) n++; return Math.min(1, n / (N * N / 1200)); } },
  { id: 'village', t: '🏘️ 讓一個村莊長到 10 間房子（要靠近河或湖）', check() { return Math.min(1, Math.max(0, ...villages.list.map((v) => v.pop)) / 10); } },
  { id: 'crater', t: '🌋 火山口變成湖（高山上的湖）', check(s) { let n = 0; for (let i = 0; i < N * N; i++) if (s.H[i] > 14 && s.W[i] > 0.6) n++; return Math.min(1, n / (N * N / 3000)); } },
  { id: 'falls', t: '🏞️ 做出一道瀑布（水從很陡的地方沖下來）', check(s) {
    let n = 0;
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const i = y * N + x; if (s.W[i] > 0.1 && s.H[i] > 0.5 && Math.hypot(s.H[i + 1] - s.H[i - 1], s.H[i + N] - s.H[i - N]) * 0.5 > 1.0) n++; }
    return Math.min(1, n / (N * N / 3000));
  } },
  { id: 'isle', t: '🏝️ 在海上堆出一座新的小島', check(s) {
    // 找出所有陸地塊；原本是海的格子佔八成以上、夠大的那塊就是新的小島
    const seen = new Uint8Array(N * N), q = []; let best = 0;
    for (let st = 0; st < N * N; st++) {
      if (seen[st] || s.H[st] <= 0.05) continue;
      let size = 0, was = 0; q.push(st); seen[st] = 1;
      while (q.length) { const i = q.pop(); size++; if (H0[i] < -0.2) was++; const x = i % N; for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, i - N, i + N]) if (j >= 0 && j < N * N && !seen[j] && s.H[j] > 0.05) { seen[j] = 1; q.push(j); } }
      if (was > size * 0.8) best = Math.max(best, size);
    }
    return Math.min(1, best / (N * N / 2500));
  } },
];
let goalsOpen = innerWidth > 640;   // 手機上先收起來，不要擋住島
$('goalsToggle').textContent = goalsOpen ? '收起' : '打開';
$('goalsToggle').onclick = () => { goalsOpen = !goalsOpen; $('goalsToggle').textContent = goalsOpen ? '收起' : '打開'; renderGoals(); };
const prog = {};
function renderGoals() {
  const L = $('goalList');
  $('goalCount').textContent = `${GOALS.filter((g) => save.done[g.id]).length}/${GOALS.length}`;
  L.innerHTML = !goalsOpen ? '' : GOALS.map((g) => { const d = save.done[g.id], p = d ? 1 : prog[g.id] || 0; return `<li class="${d ? 'done' : ''}">${d ? '✅' : '⬜'} ${g.t}${d ? '' : `<div class="bar2"><i style="width:${Math.round(p * 100)}%"></i></div>`}</li>`; }).join('');
}
function checkGoals() {
  for (const g of GOALS) {
    if (save.done[g.id]) continue;
    const p = g.check(snap); prog[g.id] = p;
    if (p >= 1) { save.done[g.id] = true; persist(); toast(`✅ 任務完成：${g.t}`, true); sound.ding(); }
  }
  renderGoals();
}

// ---------------------------------------------------------------- 聲音：雨聲、水聲（很簡單的白噪音）
const sound = {
  ctx: null, on: !save.soundOff,
  start() { if (this.ctx) return; try { this.ctx = new AudioContext(); } catch { return; } const c = this.ctx, len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.src = c.createBufferSource(); this.src.buffer = b; this.src.loop = true; this.f = c.createBiquadFilter(); this.f.type = 'bandpass'; this.f.frequency.value = 1400; this.g = c.createGain(); this.g.gain.value = 0;
    this.src.connect(this.f).connect(this.g).connect(c.destination); this.src.start(); },
  rain(v) { if (!this.ctx) this.start(); this.target = v; },
  update(r) { if (!this.g) return; this.g.gain.value += ((this.on ? r : 0) - this.g.gain.value) * 0.05; },
  ding() { if (!this.ctx || !this.on) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(660, c.currentTime); o.frequency.setValueAtTime(990, c.currentTime + 0.12); g.gain.setValueAtTime(0.15, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.6); },
};
$('soundBtn').textContent = sound.on ? '🔊' : '🔇';
$('soundBtn').onclick = () => { sound.start(); sound.on = !sound.on; save.soundOff = !sound.on; persist(); $('soundBtn').textContent = sound.on ? '🔊' : '🔇'; };
$('speedBtn').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('speedBtn').textContent = `⏩ ×${speed}`; };
addEventListener('pointerdown', () => sound.start(), { once: true });

// ---------------------------------------------------------------- 雨滴（看得到在下雨）、下雨時天變暗；村莊頭上的名牌
const DROPS = 1400, rainPos = new Float32Array(DROPS * 6), rainSeed = Float32Array.from({ length: DROPS * 3 }, Math.random);
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainLines = new THREE.LineSegments(rainGeo, new THREE.LineBasicNodeMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.45, depthWrite: false }));
rainLines.frustumCulled = false; rainLines.visible = false; scene.add(rainLines);
let rainT = 0, weather = 0;
function updateRain(dt) {
  rainT += dt; weather += ((globalRain ? 1 : 0) - weather) * (1 - Math.exp(-dt * 1.5));
  gloom.value = weather; sun.intensity = 2.6 - weather * 1.6; renderer.toneMappingExposure = 0.95 - weather * 0.12;
  // 雨下在哪裡：全島下雨＝鏡頭看的地方附近；🌧️ 筆刷＝筆刷底下
  const half = (N - 1) / 2, br = brush && brush.mode === 3 ? brush : null;
  const n = br ? Math.min(DROPS, Math.round(br.r * br.r * 4)) : globalRain ? DROPS : 0;
  rainLines.visible = n > 0; if (!n) return;
  const cx = br ? br.x - half : cam.tx, cz = br ? br.y - half : cam.tz, R = br ? br.r : Math.min(cam.dist * 0.7, N * 0.6), top = 26;
  for (let k = 0; k < n; k++) {
    const a = rainSeed[k * 3] * 6.283, r = Math.sqrt(rainSeed[k * 3 + 1]) * R, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const g = groundH(x, z), y = g + top - ((rainT * 38 + rainSeed[k * 3 + 2] * top) % top), o = k * 6;
    rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z; rainPos[o + 3] = x + 0.15; rainPos[o + 4] = y + 1.4; rainPos[o + 5] = z;
  }
  rainGeo.setDrawRange(0, n * 2); rainGeo.attributes.position.needsUpdate = true;
}
const vlabels = $('vlabels'), _vp = new THREE.Vector3();
function updateLabels() {
  const L = villages.list, half = (N - 1) / 2;
  while (vlabels.children.length < L.length) { const d = document.createElement('div'); d.className = 'vlabel'; vlabels.appendChild(d); }
  [...vlabels.children].forEach((el, k) => {
    const v = L[k]; if (!v) { el.style.display = 'none'; return; }
    const i = Math.round(v.y) * N + Math.round(v.x);
    _vp.set(v.x - half, (snap.H[i] || 0) + 3.5, v.y - half).project(camera);
    if (_vp.z > 1 || Math.abs(_vp.x) > 1.1 || Math.abs(_vp.y) > 1.1) { el.style.display = 'none'; return; }
    el.style.display = ''; el.style.left = ((_vp.x + 1) / 2 * innerWidth).toFixed(0) + 'px'; el.style.top = ((1 - _vp.y) / 2 * innerHeight).toFixed(0) + 'px';
    const txt = `${v.wet ? '🌊' : '🏘️'} ${v.name} ${v.pop}`; if (el.textContent !== txt) el.textContent = txt;
    el.className = 'vlabel' + (v.wet ? ' wet' : v.need ? ' dry' : '');
  });
}

// ---------------------------------------------------------------- 主迴圈
let reading = false, readT = 0, treeT = 0, simT = 0, last = performance.now();
const STEPS = WEBGPU ? 3 : 1, DT = 0.05;
function update(dt) {
  const n = STEPS * speed;
  // 堆山、挖地、火山、整平：速度用「每一秒真實時間」算（不管顯示卡一秒跑幾步、有沒有快轉，手感都一樣）
  const b = brush && brush.mode !== 3 ? { ...brush, amt: brush.amt * dt / (n * DT) } : brush;
  if (b && b.mode !== 3) markTouched(b);
  for (let k = 0; k < n; k++) sim.step(DT, { rain: globalRain ? 0.035 : 0, brush: b });
  readT -= dt; treeT += dt; simT += dt * speed;
  if (readT <= 0 && !reading) {
    readT = 0.5; reading = true;
    sim.read().then((s) => { snap = s; reading = false; villages.update(s, simT); simT = 0; while (villages.events.length) toast(villages.events.shift(), true); checkGoals(); drawMiniBase(s); trees.update(s.H, s.W, treeT); treeT = 0; }).catch(() => { reading = false; });
  }
  // 泉水標記跟著地面
  for (const m of springMarks.children) { const s = m.userData.s, i = Math.round(s.y) * N + Math.round(s.x); m.position.set(s.x - (N - 1) / 2, (snap.H[i] || 0) + (snap.W[i] || 0) + 0.4, s.y - (N - 1) / 2); }
  sound.update(brush && brush.mode === 3 ? 0.12 : globalRain ? 0.08 : 0);
  moveInput(dt); updateCamera(dt); drawMini(); updateRain(dt); updateLabels();
}
function render() {
  if (OFF) { OFF.setSize(Math.round(innerWidth * renderer.getPixelRatio()), Math.round(innerHeight * renderer.getPixelRatio())); renderer.setRenderTarget(OFF); }
  pipeline.render();
  if (OFF) renderer.setRenderTarget(null);
}
function frame() { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); }

$('help').innerHTML = isTouch
  ? '選一個工具，用一根手指在島上畫：⛰️ 堆山、⛏️ 挖地、🌧️ 下雨、🌋 火山、🏘️ 蓋村莊…<br>兩根手指＝移動鏡頭（捏合縮放、轉一轉轉向、一起上下推改變角度）。右上小地圖點一下就飛過去。'
  : '選一個工具，在島上按住拖曳：⛰️ 堆山、⛏️ 挖地、🌧️ 下雨、🌋 火山、🏘️ 蓋村莊…<br>滾輪縮放、右鍵拖曳轉向、中鍵或空白鍵＋拖曳移動，也可以用 WASD／Q E。右上小地圖點一下就飛過去。';
dock(); renderGoals(); updateCamera(); drawMiniBase(snap); drawMini();
await step(0.85, '暖機…');
sim.step(DT, { rain: 0 }); render();
await step(1, '好了！');
{ const el = $('loading'); el.style.opacity = 0; setTimeout(() => el.remove(), 600); }
setTimeout(() => { $('help').style.opacity = 0; }, 12000);
if (!params.has('paused')) renderer.setAnimationLoop(frame);
window.__ready = true;

// ---------------------------------------------------------------- 測試掛勾
window.__terra = {
  get sim() { return sim; }, get snap() { return snap; }, get world() { return world; }, cam, goal, WEBGPU, N, renderer, zoomAt, grabPan, planeAt,
  rain(v) { globalRain = v; },
  get villages() { return villages; }, updateRain, updateLabels, undo, pushUndo, setTool(k) { tool = k; dock(); }, useTool,
  spring(x, y) { springs.push({ x, y, r: 2.2, rate: 2.5 }); sim.setSprings(springs); refreshSpringMarks(); },
  brush(b) { brush = b; },
  async sim2(sec) { if (brush && brush.mode !== 3) markTouched(brush); for (let i = 0; i < sec * 20; i++) { sim.step(DT, { rain: globalRain ? 0.035 : 0, brush }); if (i % 40 === 39) await new Promise((r) => setTimeout(r, 0)); } snap = await sim.read(); villages.update(snap, sec); checkGoals(); trees.update(snap.H, snap.W, sec); return GOALS.map((g) => [g.id, +(prog[g.id] || 0).toFixed(2), !!save.done[g.id]]); },
  async snapImg() {
    updateCamera();
    const rt = OFF || new THREE.RenderTarget(innerWidth, innerHeight);
    if (!OFF) { renderer.setRenderTarget(rt); pipeline.render(); renderer.setRenderTarget(null); } else render();
    const w = rt.width, h = rt.height, px = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const xx = c.getContext('2d'); xx.putImageData(new ImageData(new Uint8ClampedArray(px.buffer, px.byteOffset, w * h * 4), w, h), 0, 0);
    if (!WEBGPU) { xx.save(); xx.scale(1, -1); xx.drawImage(c, 0, -h); xx.restore(); }
    return c.toDataURL('image/jpeg', 0.85);
  },
};
