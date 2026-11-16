// 萬軍對決 3D：渲染、鏡頭、選隊伍、下命令、戰役流程
import * as THREE from 'three';
import { pass, uniform, vec3, uv, smoothstep, mix } from 'three/tsl';
import { Terrain } from './terrain.js';
import { Battle, T, STATS } from './sim.js';
import { UnitMeshes } from './units.js';
import { BATTLES, FREE_TERRAINS, freeBattle } from './battles.js';
import { Sound } from './audio.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const step = (k, m) => { $('loadBar').style.width = Math.round(k * 100) + '%'; if (m) $('loadMsg').textContent = m; };
const SAVE_KEY = 'mwLabArmy.v1';
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
save.stars = save.stars || {}; save.free = save.free || { blue: { sword: 3, archer: 2, cav: 1 }, red: { sword: 3, archer: 2, cav: 1 }, terrain: 'plain' };
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { } };

// ---------------------------------------------------------------- 渲染器
const canvas = $('view');
const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance', forceWebGL: params.has('gl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
step(0.1, '啟動顯示卡…');
await renderer.init();
const WEBGPU = !!renderer.backend.isWebGPUBackend;
const HIGH = (params.get('q') || (WEBGPU && !isTouch ? 'high' : 'low')) === 'high';
const SCALE = +(params.get('scale') || (WEBGPU ? (HIGH ? 1 : 0.6) : 0.4));   // 人數倍率
renderer.shadowMap.enabled = HIGH; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9cde8);
scene.fog = new THREE.Fog(0xa9cde8, 160, 420);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.5, 900);
scene.add(new THREE.HemisphereLight(0xdcefff, 0x56603e, 1.4));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.6); sun.position.set(60, 120, 40); scene.add(sun, sun.target);
if (HIGH) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const c = sun.shadow.camera; c.left = c.bottom = -90; c.right = c.top = 90; c.near = 10; c.far = 400; sun.shadow.bias = -0.0006; }

step(0.3, '打造士兵…');
const MAXU = 4000;
const meshes = new UnitMeshes(scene, MAXU, { high: HIGH });
const pipeline = new THREE.RenderPipeline(renderer);
pipeline.outputNode = pass(scene, camera);
const OFF = params.has('offscreen') ? new THREE.RenderTarget(1, 1) : null;
const sound = new Sound(); if (save.soundOff) sound.setOn(false);

// ---------------------------------------------------------------- 狀態
let world = null, ter = null, b = null, def = null, defIdx = -1, phase = 'deploy', speed = 1, paused = false;
const sel = new Set();
const cam = { x: 0, z: 30, yaw: 0, pitch: 0.95, dist: 120 };
let markers = [];

function loadBattle(d, idx) {
  def = d; defIdx = idx;
  if (world) { scene.remove(world); world.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  world = new THREE.Group(); scene.add(world);
  ter = new Terrain(d.terrain); ter.build(world, { high: HIGH });
  b = new Battle(ter, MAXU);
  for (const [team, list] of [[0, d.blue], [1, d.red]]) for (const s of list) {
    const sq = b.addSquad({ team, type: s.type, n: Math.max(12, Math.round(s.n * SCALE)), x: s.x, z: s.z, behavior: s.behavior || 'hold' });
    sq.waitT = s.waitT;
  }
  for (let i = 0; i < b.n; i++) b.y[i] = ter.height(b.x[i], b.z[i]);
  sel.clear(); phase = 'deploy'; paused = false;
  buildMarkers();
  cam.x = 0; cam.z = 10; cam.yaw = 0; cam.pitch = 0.85; cam.dist = d.id === 'grand' ? 130 : 88;
  $('bTitle').textContent = `${d.icon} ${d.name}`; $('bText').textContent = d.intro; $('brief').classList.remove('hidden');
  dock(); closeAll(); updSel();
}

// ---------------------------------------------------------------- 隊伍標記（頭上的旗子＋選取的地面圈）
function badge(type, team) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = team ? '#d8393a' : '#2f6fe0'; x.strokeStyle = '#fff'; x.lineWidth = 8;
  x.beginPath(); x.arc(64, 60, 50, 0, Math.PI * 2); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(44, 104); x.lineTo(64, 126); x.lineTo(84, 104); x.fillStyle = '#fff'; x.fill();
  x.font = '56px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(['⚔️', '🏹', '🐎'][type], 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const BADGES = [[0, 1, 2].map((t) => badge(t, 0)), [0, 1, 2].map((t) => badge(t, 1))];
function buildMarkers() {
  for (const m of markers) { scene.remove(m.spr, m.ring); }
  markers = b.squads.map((sq) => {
    const spr = new THREE.Sprite(new THREE.SpriteNodeMaterial({ map: BADGES[sq.team][sq.type], depthTest: false, transparent: true }));
    spr.renderOrder = 10; spr.scale.setScalar(4.2); scene.add(spr);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicNodeMaterial({ color: 0xffe066, transparent: true, opacity: 0.85, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
    return { sq, spr, ring };
  });
}
function updMarkers() {
  const k = cam.dist / 120;
  for (const m of markers) {
    const sq = m.sq, show = sq.alive > 0;
    m.spr.visible = show; if (!show) { m.ring.visible = false; continue; }
    m.spr.position.set(sq.cx, ter.height(sq.cx, sq.cz) + 5 + k * 3, sq.cz); m.spr.scale.setScalar((sel.has(sq) ? 5.2 : 4) * Math.max(0.8, k));
    m.ring.visible = sel.has(sq);
    if (m.ring.visible) { const r = Math.sqrt(sq.alive) * STATS[sq.type].spacing * 0.75 + 2; m.ring.scale.setScalar(r); m.ring.position.set(sq.cx, ter.height(sq.cx, sq.cz) + 0.3, sq.cz); }
  }
}

// ---------------------------------------------------------------- 下方按鈕
function dock() {
  const d = $('dock'); d.innerHTML = '';
  const add = (html, title, fn, cls = '') => { const x = document.createElement('button'); x.className = 'db ' + cls; x.innerHTML = html; x.title = title; x.onclick = fn; d.appendChild(x); return x; };
  add('<b>👥</b>全選', '選取全部藍軍', () => { sel.clear(); for (const sq of b.squads) if (sq.team === 0 && sq.alive) sel.add(sq); updSel(); });
  add('<b>⚔️</b>只選劍兵', '選劍盾兵', () => selType(T.SWORD));
  add('<b>🏹</b>只選弓兵', '選弓箭手', () => selType(T.ARCHER));
  add('<b>🐎</b>只選騎兵', '選騎兵', () => selType(T.CAV));
  if (phase === 'deploy') { add('<b>📯</b>開戰！', '開始戰鬥', fight, 'go'); return; }
  const s = document.createElement('span'); s.className = 'sep'; d.appendChild(s);
  add('<b>🚩</b>衝鋒', '選取的隊伍（沒選就是全軍）往最近的敵人衝', () => { for (const sq of targets()) { sq.mode = 'charge'; if (sq.order) sq.order.move = false; } toast('衝啊！'); });
  add('<b>✋</b>停下', '選取的隊伍停在原地', () => { for (const sq of targets()) { sq.mode = 'hold'; b.orderSquad(sq, sq.cx, sq.cz, sq.order.fx, sq.order.fz, sq.order.cols * STATS[sq.type].spacing); } toast('原地守住'); });
  add('<b>✖️</b>取消選取', '取消選取', () => { sel.clear(); updSel(); });
}
function selType(t) { sel.clear(); for (const sq of b.squads) if (sq.team === 0 && sq.alive && sq.type === t) sel.add(sq); updSel(); }
const targets = () => (sel.size ? [...sel] : b.squads.filter((sq) => sq.team === 0 && sq.alive));
function updSel() {
  const el = $('selInfo');
  if (!sel.size) { el.classList.add('hidden'); return; }
  const by = [0, 0, 0], men = [0, 0, 0];
  for (const sq of sel) { by[sq.type]++; men[sq.type] += sq.alive; }
  el.innerHTML = '已選：' + [0, 1, 2].filter((t) => by[t]).map((t) => `${STATS[t].name} ${by[t]} 隊（${men[t]} 人）`).join('、') + `<br><span style="opacity:.75">點地面＝走過去 · 拖一條線＝沿線排開</span>`;
  el.classList.remove('hidden');
}
function fight() {
  phase = 'fight'; b.t = 0; dock(); sound.start(); sound.horn();
  $('bText').textContent = def.tip || '加油！'; setTimeout(() => { if (phase === 'fight') $('brief').classList.add('hidden'); }, 7000);
}

let toastT;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1800); }

// ---------------------------------------------------------------- 選單
function closeAll() { $('menu').classList.add('hidden'); $('result').classList.add('hidden'); }
function showMenu() {
  const L = $('battleList'); L.innerHTML = '';
  BATTLES.forEach((d, i) => {
    const s = save.stars[d.id] || 0, x = document.createElement('button'); x.className = 'card';
    const nb = d.blue.reduce((a, s2) => a + s2.n, 0), nr = d.red.reduce((a, s2) => a + s2.n, 0);
    x.innerHTML = `<div class="h"><span>${d.icon}</span>${i + 1}. ${d.name}</div><p>藍 ${Math.round(nb * SCALE)} 人 vs 紅 ${Math.round(nr * SCALE)} 人</p><div class="st">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</div>`;
    x.onclick = () => loadBattle(d, i); L.appendChild(x);
  });
  // 自由對戰設定
  const F = save.free, f = $('free'); f.innerHTML = '<span></span><span class="hd b">藍軍（你）</span><span class="hd r">紅軍</span>';
  for (const [k, nm] of [['sword', '劍盾兵（隊）'], ['archer', '弓箭手（隊）'], ['cav', '騎兵（隊）']]) {
    f.insertAdjacentHTML('beforeend', `<span>${nm}</span>`);
    for (const side of ['blue', 'red']) {
      const w = document.createElement('span'); w.className = 'stp';
      w.innerHTML = `<button>−</button><b>${F[side][k]}</b><button>＋</button>`;
      const [m, v, p] = w.children;
      m.onclick = () => { F[side][k] = Math.max(0, F[side][k] - 1); v.textContent = F[side][k]; persist(); };
      p.onclick = () => { F[side][k] = Math.min(8, F[side][k] + 1); v.textContent = F[side][k]; persist(); };
      f.appendChild(w);
    }
  }
  const sel2 = $('freeTer'); sel2.innerHTML = Object.entries(FREE_TERRAINS).map(([k, v]) => `<option value="${k}"${k === F.terrain ? ' selected' : ''}>${v.name}</option>`).join('');
  sel2.onchange = () => { F.terrain = sel2.value; persist(); };
  $('menu').classList.remove('hidden');
}
$('freeGo').onclick = () => loadBattle(freeBattle(save.free), -1);
$('menuBtn').onclick = showMenu;
$('rMenu').onclick = showMenu;
$('rRetry').onclick = () => loadBattle(def, defIdx);
$('rNext').onclick = () => loadBattle(BATTLES[defIdx + 1], defIdx + 1);
$('speedBtn').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 0.5 : 1; $('speedBtn').textContent = (speed === 0.5 ? '½' : speed) + '×'; };
$('pauseBtn').onclick = () => { paused = !paused; $('pauseBtn').textContent = paused ? '▶️' : '⏸'; };
$('soundBtn').onclick = () => { sound.start(); sound.setOn(!sound.on); save.soundOff = !sound.on; persist(); $('soundBtn').textContent = sound.on ? '🔊' : '🔇'; };
$('soundBtn').textContent = sound.on ? '🔊' : '🔇';

function endBattle(win) {
  phase = 'done'; dock();
  const left = b.count(0) / b.start[0];
  let s = 0;
  if (win) { s = left >= 0.6 ? 3 : left >= 0.35 ? 2 : 1; if (def.id !== 'free') { save.stars[def.id] = Math.max(save.stars[def.id] || 0, s); persist(); } }
  $('rTitle').textContent = win ? '勝利！🎉' : '戰敗了…';
  $('rStars').textContent = win ? '★'.repeat(s) + '☆'.repeat(3 - s) : '';
  $('rText').textContent = win ? `藍軍還剩 ${b.count(0)} 人（${Math.round(left * 100)}%）。剩越多星星越多。` : `敵人還有 ${b.count(1)} 人。${def.tip || ''}`;
  $('rNext').classList.toggle('hidden', !win || defIdx < 0 || defIdx >= BATTLES.length - 1);
  sound.fanfare(win);
  setTimeout(() => $('result').classList.remove('hidden'), 1200);
}

// ---------------------------------------------------------------- 指標
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function groundAt(cx, cy) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (ter && ter.mesh) { const h = ray.intersectObject(ter.mesh, false)[0]; if (h) return h.point; }
  return ray.ray.intersectPlane(ground, new THREE.Vector3());
}
const ptrs = new Map(); let drag = null;
const preview = (() => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const l = new THREE.Line(g, new THREE.LineBasicNodeMaterial({ color: 0xffe066, depthTest: false })); l.renderOrder = 11; l.visible = false; l.frustumCulled = false; scene.add(l); return l;
})();
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  sound.start();
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; drag = { kind: 'two', d0: Math.hypot(p1.x - p2.x, p1.y - p2.y), a0: Math.atan2(p2.y - p1.y, p2.x - p1.x), dist0: cam.dist, yaw0: cam.yaw }; preview.visible = false; return; }
  drag = { kind: e.button === 2 ? 'rot' : 'tap', sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, g0: groundAt(e.clientX, e.clientY), shift: e.shiftKey };
});
canvas.addEventListener('pointermove', (e) => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!drag) return;
  if (drag.kind === 'two') {
    if (ptrs.size < 2) return; const [p1, p2] = [...ptrs.values()];
    cam.dist = Math.min(320, Math.max(35, drag.dist0 * drag.d0 / Math.max(20, Math.hypot(p1.x - p2.x, p1.y - p2.y))));
    cam.yaw = drag.yaw0 - (Math.atan2(p2.y - p1.y, p2.x - p1.x) - drag.a0); return;
  }
  const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly; drag.lx = e.clientX; drag.ly = e.clientY;
  if (drag.kind === 'rot') { cam.yaw -= dx * 0.005; cam.pitch = Math.min(1.45, Math.max(0.35, cam.pitch + dy * 0.004)); return; }
  if (drag.kind === 'tap' && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 10) drag.kind = sel.size && drag.g0 ? 'line' : 'pan';
  if (drag.kind === 'pan') {
    const k = cam.dist * 0.0016, c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
    cam.x -= (dx * c + dy * s) * k; cam.z -= (-dx * s + dy * c) * k;
  }
  if (drag.kind === 'line') {
    const g = groundAt(e.clientX, e.clientY); if (!g) return; drag.g1 = g;
    const a = preview.geometry.attributes.position; a.setXYZ(0, drag.g0.x, drag.g0.y + 0.5, drag.g0.z); a.setXYZ(1, g.x, g.y + 0.5, g.z); a.needsUpdate = true; preview.visible = true;
  }
});
const endP = (e) => {
  ptrs.delete(e.pointerId);
  if (!drag) return;
  if (drag.kind === 'tap' && drag.g0) tapAt(drag.g0, drag.shift);
  if (drag.kind === 'line' && drag.g1) lineOrder(drag.g0, drag.g1);
  preview.visible = false;
  drag = ptrs.size ? null : null;
};
canvas.addEventListener('pointerup', endP); canvas.addEventListener('pointercancel', endP);
canvas.addEventListener('wheel', (e) => { cam.dist = Math.min(320, Math.max(35, cam.dist * Math.exp(e.deltaY * 0.001))); }, { passive: true });
const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code); sound.start();
  if (e.code === 'Space') { e.preventDefault(); if (phase === 'deploy') fight(); else $('pauseBtn').click(); }
  if (e.code === 'Escape') { sel.clear(); updSel(); }
});
addEventListener('keyup', (e) => keys.delete(e.code));

function enemyCenter() { let x = 0, z = 0, n = 0; for (const sq of b.squads) if (sq.team === 1 && sq.alive) { x += sq.cx * sq.alive; z += sq.cz * sq.alive; n += sq.alive; } return n ? { x: x / n, z: z / n } : { x: 0, z: -40 }; }
function clampDeploy(p) { if (phase === 'deploy') { p.z = Math.max(10, Math.min(76, p.z)); p.x = Math.max(-115, Math.min(115, p.x)); } return p; }
function tapAt(g, shift) {
  // 點到自己的隊伍：選取
  let best = null, bd = Infinity;
  for (const sq of b.squads) {
    if (sq.team !== 0 || !sq.alive) continue;
    const r = Math.sqrt(sq.alive) * STATS[sq.type].spacing * 0.7 + 3, d = Math.hypot(sq.cx - g.x, sq.cz - g.z);
    if (d < r && d < bd) { bd = d; best = sq; }
  }
  if (best) {
    // 一般：只選這一隊（再點一次取消）；按住 Shift 或觸控：加選／取消這一隊
    if (shift || isTouch) { if (sel.has(best)) sel.delete(best); else sel.add(best); }
    else if (sel.has(best) && sel.size === 1) sel.clear();
    else { sel.clear(); sel.add(best); }
    updSel(); return;
  }
  if (!sel.size) return;
  // 點地面：選到的隊伍走過去（多隊就左右排開）
  const p = clampDeploy(g.clone()), list = [...sel].sort((a, c) => a.cx - c.cx);
  const e = enemyCenter(); let fx = e.x - p.x, fz = e.z - p.z; const L = Math.hypot(fx, fz) || 1; fx /= L; fz /= L;
  const widths = list.map((sq) => sq.order.cols * STATS[sq.type].spacing), total = widths.reduce((a, w) => a + w + 3, -3);
  let off = -total / 2;
  list.forEach((sq, i) => {
    const c = off + widths[i] / 2; off += widths[i] + 3;
    const x = p.x - fz * c, z = p.z + fx * c;
    sq.mode = 'hold'; b.orderSquad(sq, x, z, fx, fz, widths[i], phase !== 'deploy');
    if (phase === 'deploy') snapSquad(sq);
  });
  toast(list.length > 1 ? `${list.length} 隊出發` : '出發！');
}
function lineOrder(a, c) {
  const A = clampDeploy(a.clone()), C = clampDeploy(c.clone());
  let dx = C.x - A.x, dz = C.z - A.z; const L = Math.hypot(dx, dz); if (L < 3) return;
  dx /= L; dz /= L;
  // 面向：垂直於線、朝向敵人那一邊
  const e = enemyCenter(); let fx = -dz, fz = dx;
  const mx = (A.x + C.x) / 2, mz = (A.z + C.z) / 2;
  if (fx * (e.x - mx) + fz * (e.z - mz) < 0) { fx = -fx; fz = -fz; }
  const list = [...sel].sort((p, q) => ((p.cx - A.x) * dx + (p.cz - A.z) * dz) - ((q.cx - A.x) * dx + (q.cz - A.z) * dz));
  const seg = L / list.length;
  list.forEach((sq, i) => {
    const t = seg * (i + 0.5);
    sq.mode = 'hold'; b.orderSquad(sq, A.x + dx * t, A.z + dz * t, fx, fz, Math.max(seg - 2, 4), phase !== 'deploy');
    if (phase === 'deploy') snapSquad(sq);
  });
  toast('沿著線排開！');
}
// 佈陣時直接把人放到位置上
function snapSquad(sq) {
  for (const i of sq.units) { if (!b.alive[i]) continue; const s = b.slotPos(sq, b.slot[i]); b.x[i] = s.x; b.z[i] = s.z; b.y[i] = ter.height(s.x, s.z); b.vx[i] = b.vz[i] = 0; b.hd[i] = Math.atan2(sq.order.fx, sq.order.fz); }
  sq.cx = sq.order.x; sq.cz = sq.order.z;
}

// ---------------------------------------------------------------- 每一格
function updateCamera(dt) {
  const k = cam.dist * 0.6 * dt, c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
  const mx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const mz = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  cam.x += (mx * c + mz * s) * k; cam.z += (-mx * s + mz * c) * k;
  if (keys.has('KeyQ')) cam.yaw += dt * 1.2; if (keys.has('KeyE')) cam.yaw -= dt * 1.2;
  cam.x = Math.max(-130, Math.min(130, cam.x)); cam.z = Math.max(-90, Math.min(90, cam.z));
  const y0 = ter ? ter.height(cam.x, cam.z) : 0, cp = Math.cos(cam.pitch);
  camera.position.set(cam.x + Math.sin(cam.yaw) * cp * cam.dist, y0 + Math.sin(cam.pitch) * cam.dist, cam.z + Math.cos(cam.yaw) * cp * cam.dist);
  camera.lookAt(cam.x, y0, cam.z);
  sun.position.set(cam.x + 60, 120, cam.z + 40); sun.target.position.set(cam.x, 0, cam.z);
}
let checkT = 0;
function update(dt) {
  if (phase === 'fight' && !paused) {
    const h = dt * speed, n = Math.ceil(h / 0.034);
    for (let i = 0; i < n; i++) b.step(h / n);
    checkT -= dt;
    if (checkT <= 0) {
      checkT = 0.5;
      if (b.count(1) <= b.start[1] * 0.08) endBattle(true);
      else if (b.count(0) <= b.start[0] * 0.08) endBattle(false);
    }
  } else if (phase === 'done' && !paused) { b.step(dt * 0.5); }
  for (const sq of [...sel]) if (!sq.alive) { sel.delete(sq); updSel(); }
  meshes.sync(b);
  updMarkers();
  updateCamera(dt);
  const c0 = b.count(0), c1 = b.count(1);
  $('sb').textContent = c0; $('sr').textContent = c1;
  $('tb').style.width = (c0 / Math.max(1, c0 + c1) * 100) + '%'; $('tr').style.width = (c1 / Math.max(1, c0 + c1) * 100) + '%';
  sound.update(dt, b.events, phase === 'fight' && !paused);
}
function render() {
  if (OFF) { OFF.setSize(Math.round(innerWidth * renderer.getPixelRatio()), Math.round(innerHeight * renderer.getPixelRatio())); renderer.setRenderTarget(OFF); }
  pipeline.render();
  if (OFF) renderer.setRenderTarget(null);
}
let last = performance.now();
function frame() { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); }
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });

step(0.6, '佈置戰場…');
loadBattle(BATTLES[0], 0);
update(0.016);
try { await renderer.compileAsync(scene, camera); } catch { }
step(1, '完成');
$('loading').style.opacity = 0; setTimeout(() => $('loading').classList.add('hidden'), 600);
if (!params.has('paused')) renderer.setAnimationLoop(frame);
if (!params.has('paused') && !params.has('nomenu')) showMenu();

// 自動測試用
window.__army = {
  get b() { return b; }, cam, sel, BATTLES, WEBGPU, HIGH, SCALE,
  load: (i) => loadBattle(BATTLES[i], i), fight, tapAt: (x, z) => tapAt(new THREE.Vector3(x, 0, z)), lineOrder: (x0, z0, x1, z1) => lineOrder(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 0, z1)),
  get phase() { return phase; },
  sim(sec) { for (let i = 0; i < sec * 30; i++) update(1 / 30); },
  async snap(sec = 0) {
    renderer.setAnimationLoop(null);
    await renderer.backend.device?.queue.onSubmittedWorkDone?.();
    if (sec) this.sim(sec); else update(1 / 30);
    const rt = OFF || new THREE.RenderTarget(Math.round(innerWidth), Math.round(innerHeight));
    if (!OFF) { renderer.setRenderTarget(rt); pipeline.render(); renderer.setRenderTarget(null); } else render();
    const w = rt.width, h = rt.height, px = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.putImageData(new ImageData(new Uint8ClampedArray(px.buffer, px.byteOffset, w * h * 4), w, h), 0, 0);
    if (!WEBGPU) { x.save(); x.scale(1, -1); x.drawImage(c, 0, -h); x.restore(); }
    if (!params.has('paused')) renderer.setAnimationLoop(frame);
    return c.toDataURL('image/jpeg', 0.85);
  },
};
window.__ready = true;
void uniform; void vec3; void uv; void smoothstep; void mix;
