// 造物主之島：渲染器、天空與光、工具（堆山、挖地、下雨、泉水）、鏡頭、任務、存檔
import * as THREE from 'three';
import { pass, vec3, mix, smoothstep, positionWorld, normalize, float, max } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { GpuSim } from './sim.js';
import { CpuSim } from './simcpu.js';
import { makeIsland, World, Trees } from './world.js';

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
skyMat.colorNode = (() => { const d = normalize(positionWorld); return mix(mix(vec3(0.85, 0.78, 0.68), vec3(0.45, 0.66, 0.9), smoothstep(-0.02, 0.25, d.y)), vec3(0.18, 0.36, 0.7), smoothstep(0.25, 0.9, d.y)); })();
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
}
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

// ---------------------------------------------------------------- 鏡頭
const cam = { yaw: 0.6, pitch: 0.75, dist: N * 1.25, tx: 0, tz: 0 };
function updateCamera() {
  const cp = Math.cos(cam.pitch);
  camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist);
  camera.lookAt(cam.tx, 0, cam.tz);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });
camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();

// ---------------------------------------------------------------- 點到島上的哪一格（用讀回來的高度，沿著視線一步步走）
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(cx, cy) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction, half = (N - 1) / 2, p = new THREE.Vector3();
  for (let t = 0; t < cam.dist * 4; t += 0.5) {
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
  { k: 'look', emoji: '👀', name: '看', tip: '拖曳轉鏡頭、兩根手指縮放和平移。' },
  { k: 'raise', emoji: '⛰️', name: '堆山', mode: 1, amt: 9, r: 9, tip: '按住拖曳，地面會慢慢長高。' },
  { k: 'dig', emoji: '⛏️', name: '挖地', mode: 2, amt: 9, r: 6, tip: '按住拖曳，挖出河道或湖。挖到海平面以下，海水就會灌進來。' },
  { k: 'rain', emoji: '🌧️', name: '下雨', mode: 3, amt: 2.2, r: 12, tip: '按住拖曳，那裡會下大雨。雨水會往低處流，匯成小河。' },
  { k: 'spring', emoji: '💧', name: '泉水', tip: '點一下放一個泉水（最多 8 個），會一直冒水。點泉水旁邊可以拿掉。' },
];
let tool = 'raise', globalRain = false, speed = 1, brush = null;
function dock() {
  const d = $('dock'); d.innerHTML = '';
  const add = (html, title, fn, on) => { const b = document.createElement('button'); b.className = 'db' + (on ? ' on' : ''); b.innerHTML = html; b.title = title; b.onclick = fn; d.appendChild(b); };
  for (const t of TOOLS) add(`<b>${t.emoji}</b>${t.name}`, t.tip, () => { tool = t.k; dock(); toast(t.tip); }, tool === t.k);
  const sep = document.createElement('span'); sep.className = 'sep'; d.appendChild(sep);
  add(`<b>${globalRain ? '☔' : '☀️'}</b>${globalRain ? '全島下雨' : '晴天'}`, '整座島一起下雨', () => { globalRain = !globalRain; dock(); toast(globalRain ? '☔ 整座島都在下雨，看看河流會怎麼長出來' : '☀️ 雨停了，水會慢慢流走、蒸發'); }, globalRain);
  add('<b>🔄</b>新的島', '換一座新的島（會清掉現在的地形）', () => { if (!confirm('要換一座新的島嗎？現在的地形會不見。')) return; save.seed = (save.seed * 31 + 17) % 9973; persist(); build(save.seed); toast('🏝️ 新的島出現了'); });
}
let toastT;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }

// ---------------------------------------------------------------- 操作
const ptrs = new Map(); let drag = null;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  $('help').style.opacity = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; drag = { kind: 'two', d0: Math.hypot(a.x - b.x, a.y - b.y), dist0: cam.dist, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, a0: Math.atan2(b.y - a.y, b.x - a.x), yaw0: cam.yaw }; brush = null; return; }
  const rot = e.button === 2 || tool === 'look';
  drag = { kind: rot ? 'rot' : 'tool', lx: e.clientX, ly: e.clientY };
  if (!rot) useTool(e.clientX, e.clientY, true);
});
canvas.addEventListener('pointermove', (e) => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!drag) { hoverAt(e.clientX, e.clientY); return; }
  if (drag.kind === 'two') {
    if (ptrs.size < 2) return; const [a, b] = [...ptrs.values()];
    cam.dist = Math.min(N * 3, Math.max(N * 0.25, drag.dist0 * drag.d0 / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y))));
    cam.yaw = drag.yaw0 - (Math.atan2(b.y - a.y, b.x - a.x) - drag.a0);   // 兩根手指轉一轉＝轉鏡頭
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, k = cam.dist * 0.0018, c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
    const dx = mx - drag.mx, dy = my - drag.my; drag.mx = mx; drag.my = my;
    cam.tx -= (dx * c + dy * s) * k; cam.tz -= (-dx * s + dy * c) * k; clampCam(); return;
  }
  const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly; drag.lx = e.clientX; drag.ly = e.clientY;
  if (drag.kind === 'rot') { cam.yaw -= dx * 0.005; cam.pitch = Math.min(1.45, Math.max(0.2, cam.pitch + dy * 0.004)); return; }
  useTool(e.clientX, e.clientY, false);
});
const endP = (e) => { ptrs.delete(e.pointerId); if (!ptrs.size) { drag = null; brush = null; } };
canvas.addEventListener('pointerup', endP); canvas.addEventListener('pointercancel', endP);
canvas.addEventListener('wheel', (e) => { cam.dist = Math.min(N * 3, Math.max(N * 0.25, cam.dist * Math.exp(e.deltaY * 0.001))); }, { passive: true });
function clampCam() { const L = N * 0.55; cam.tx = Math.max(-L, Math.min(L, cam.tx)); cam.tz = Math.max(-L, Math.min(L, cam.tz)); }
// 筆刷游標：地上一個圈
const cursor = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: 0xffe27a, transparent: true, opacity: 0.85, depthTest: false }));
cursor.renderOrder = 9; cursor.visible = false; scene.add(cursor);
function hoverAt(cx, cy) {
  const t = TOOLS.find((q) => q.k === tool);
  if (!t.mode && tool !== 'spring') { cursor.visible = false; return; }
  const h = pick(cx, cy); if (!h) { cursor.visible = false; return; }
  cursor.visible = true; cursor.position.set(h.p.x, h.p.y + 0.3, h.p.z); cursor.scale.setScalar(t.r || 2);
}
function useTool(cx, cy, first) {
  const t = TOOLS.find((q) => q.k === tool), h = pick(cx, cy);
  hoverAt(cx, cy);
  if (!h) { brush = null; return; }
  if (t.mode) { brush = { x: h.x, y: h.y, r: t.r, mode: t.mode, amt: t.amt }; if (first && tool === 'rain') sound.rain(true); return; }
  if (tool === 'spring' && first) {
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
  { id: 'canyon', t: '🏜️ 讓雨水和河流沖刷出山谷', check(s) { let e = 0; for (let i = 0; i < N * N; i++) if (H0[i] > 1 && s.H[i] < H0[i] && s.H[i] > H0[i] - 6) e += H0[i] - s.H[i]; return Math.min(1, e / (N * N / 70)); } },
  { id: 'delta', t: '🏖️ 泥沙在河口堆出新的陸地（三角洲）', check(s) { let n = 0; for (let i = 0; i < N * N; i++) if (H0[i] < -0.2 && s.H[i] > -0.05) n++; return Math.min(1, n / (N * N / 1200)); } },
];
let goalsOpen = innerWidth > 640;   // 手機上先收起來，不要擋住島
$('goalsToggle').textContent = goalsOpen ? '收起' : '打開';
$('goalsToggle').onclick = () => { goalsOpen = !goalsOpen; $('goalsToggle').textContent = goalsOpen ? '收起' : '打開'; renderGoals(); };
const prog = {};
function renderGoals() {
  const L = $('goalList');
  L.innerHTML = !goalsOpen ? '' : GOALS.map((g) => { const d = save.done[g.id], p = d ? 1 : prog[g.id] || 0; return `<li class="${d ? 'done' : ''}">${d ? '✅' : '⬜'} ${g.t}${d ? '' : `<div class="bar2"><i style="width:${Math.round(p * 100)}%"></i></div>`}</li>`; }).join('');
}
function checkGoals() {
  for (const g of GOALS) {
    if (save.done[g.id]) continue;
    const p = g.check(snap); prog[g.id] = p;
    if (p >= 1) { save.done[g.id] = true; persist(); toast(`✅ 任務完成：${g.t}`); sound.ding(); }
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

// ---------------------------------------------------------------- 主迴圈
let reading = false, readT = 0, treeT = 0, last = performance.now();
const STEPS = WEBGPU ? 3 : 1, DT = 0.05;
function update(dt) {
  const n = STEPS * speed;
  for (let k = 0; k < n; k++) sim.step(DT, { rain: globalRain ? 0.035 : 0, brush });
  readT -= dt; treeT += dt;
  if (readT <= 0 && !reading) {
    readT = 0.5; reading = true;
    sim.read().then((s) => { snap = s; reading = false; checkGoals(); trees.update(s.H, s.W, treeT); treeT = 0; }).catch(() => { reading = false; });
  }
  // 泉水標記跟著地面
  for (const m of springMarks.children) { const s = m.userData.s, i = Math.round(s.y) * N + Math.round(s.x); m.position.set(s.x - (N - 1) / 2, (snap.H[i] || 0) + (snap.W[i] || 0) + 0.4, s.y - (N - 1) / 2); }
  sound.update(brush && brush.mode === 3 ? 0.12 : globalRain ? 0.08 : 0);
  updateCamera();
}
function render() {
  if (OFF) { OFF.setSize(Math.round(innerWidth * renderer.getPixelRatio()), Math.round(innerHeight * renderer.getPixelRatio())); renderer.setRenderTarget(OFF); }
  pipeline.render();
  if (OFF) renderer.setRenderTarget(null);
}
function frame() { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); }

dock(); renderGoals(); updateCamera();
await step(0.85, '暖機…');
sim.step(DT, { rain: 0 }); render();
await step(1, '好了！');
{ const el = $('loading'); el.style.opacity = 0; setTimeout(() => el.remove(), 600); }
setTimeout(() => { $('help').style.opacity = 0; }, 12000);
if (!params.has('paused')) renderer.setAnimationLoop(frame);
window.__ready = true;

// ---------------------------------------------------------------- 測試掛勾
window.__terra = {
  get sim() { return sim; }, get snap() { return snap; }, get world() { return world; }, cam, WEBGPU, N, renderer,
  rain(v) { globalRain = v; },
  spring(x, y) { springs.push({ x, y, r: 2.2, rate: 2.5 }); sim.setSprings(springs); refreshSpringMarks(); },
  brush(b) { brush = b; },
  async sim2(sec) { for (let i = 0; i < sec * 20; i++) { sim.step(DT, { rain: globalRain ? 0.035 : 0, brush }); if (i % 40 === 39) await new Promise((r) => setTimeout(r, 0)); } snap = await sim.read(); checkGoals(); trees.update(snap.H, snap.W, sec); return GOALS.map((g) => [g.id, +(prog[g.id] || 0).toFixed(2), !!save.done[g.id]]); },
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
