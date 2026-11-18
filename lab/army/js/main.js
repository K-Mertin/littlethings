// 萬軍對決 3D：渲染、鏡頭、選隊伍、下命令、戰役流程
import * as THREE from 'three';
import { pass, uniform, vec3, vec4, uv, smoothstep, mix, positionGeometry, sin, time, select, float, texture } from 'three/tsl';
import { Terrain } from './terrain.js';
import { Battle, T, STATS } from './sim.js';
import { UnitMeshes } from './units.js';
import { BATTLES, FREE_TERRAINS, freeBattle } from './battles.js';
import { Sound } from './audio.js';
import { Dust } from './dust.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const step = (k, m) => { $('loadBar').style.width = Math.round(k * 100) + '%'; if (m) $('loadMsg').textContent = m; };
const SAVE_KEY = 'mwLabArmy.v1';
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
save.stars = save.stars || {}; save.free = save.free || { blue: { sword: 3, archer: 2, cav: 1 }, red: { sword: 3, archer: 2, cav: 1 }, terrain: 'plain' };
for (const sd of ['blue', 'red']) if (save.free[sd].spear == null) save.free[sd].spear = 0;   // 舊存檔沒有長槍兵
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
renderer.shadowMap.enabled = WEBGPU || HIGH;   // 有影子才像真的（WebGPU 低畫質也開，貼圖小一點） renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9cde8);
scene.fog = new THREE.Fog(0xa9cde8, 170, 460);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.5, 1800);
scene.add(new THREE.HemisphereLight(0xd6e8ff, 0x4f5a38, 1.3));
const sun = new THREE.DirectionalLight(0xffe6c0, 3.4);   // 偏暖的午後陽光，斜一點影子比較長 sun.position.set(60, 120, 40); scene.add(sun, sun.target);
if (WEBGPU || HIGH) { sun.castShadow = true; sun.shadow.mapSize.set(HIGH ? 2048 : 1024, HIGH ? 2048 : 1024); const c = sun.shadow.camera; c.left = c.bottom = -90; c.right = c.top = 90; c.near = 10; c.far = 400; sun.shadow.bias = -0.0006; }

step(0.3, '打造士兵…');
const MAXU = 4000;
const meshes = new UnitMeshes(scene, MAXU, { high: HIGH, shadows: WEBGPU || HIGH });
const dust = new Dust(scene);
const pipeline = new THREE.RenderPipeline(renderer);
pipeline.outputNode = pass(scene, camera);
const OFF = params.has('offscreen') ? new THREE.RenderTarget(1, 1) : null;
const sound = new Sound(); if (save.soundOff) sound.setOn(false);

// ---------------------------------------------------------------- 狀態
let world = null, ter = null, b = null, def = null, defIdx = -1, phase = 'deploy', speed = 1, paused = false;
const sel = new Set();
let cmd = null;   // 'line'：按了「排隊形」，下一次在地上拖曳是畫線
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
  sel.clear(); phase = 'deploy'; paused = false; dust.clear(); miniBg = null; miniT = 0;
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
  x.fillText(['⚔️', '🏹', '🐎', '🔱'][type], 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const BADGES = [[0, 1, 2, 3].map((t) => badge(t, 0)), [0, 1, 2, 3].map((t) => badge(t, 1))];
// 軍旗的布：隊伍色＋金邊＋兵種圖示
function flagTex(type, team) {
  const c = document.createElement('canvas'); c.width = 192; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = team ? '#c62f30' : '#2a62cf'; x.fillRect(0, 0, 192, 128);
  x.fillStyle = team ? '#8f1f22' : '#1b438f'; for (let i = 0; i < 192; i += 32) x.fillRect(i, 0, 16, 128);
  x.strokeStyle = '#f2c94c'; x.lineWidth = 10; x.strokeRect(5, 5, 182, 118);
  x.beginPath(); x.arc(96, 64, 40, 0, Math.PI * 2); x.fillStyle = 'rgba(255,255,255,.92)'; x.fill();
  x.font = '50px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(['⚔️', '🏹', '🐎', '🔱'][type], 96, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const FLAGS = [[0, 1, 2, 3].map((t) => flagTex(t, 0)), [0, 1, 2, 3].map((t) => flagTex(t, 1))];
const poleMat = new THREE.MeshStandardNodeMaterial({ color: 0x6b4a2b, roughness: 0.8 });
const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 6.4, 6); poleGeo.translate(0, 3.2, 0);
const tipGeo = new THREE.ConeGeometry(0.18, 0.5, 6); tipGeo.translate(0, 6.6, 0);
const clothGeo = new THREE.PlaneGeometry(2.6, 1.7, 14, 2); clothGeo.translate(1.3, 5.35, 0);
function makeFlag(sq) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(poleGeo, poleMat); pole.castShadow = HIGH;
  const tip = new THREE.Mesh(tipGeo, new THREE.MeshStandardNodeMaterial({ color: 0xf2c94c, metalness: 0.7, roughness: 0.35 }));
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.85 });
  const ph = Math.random() * 6;
  // 旗子隨風飄：離旗桿越遠擺越大
  const along = positionGeometry.x.div(2.6);
  m.positionNode = positionGeometry.add(vec3(0, sin(time.mul(3.2).add(ph).sub(positionGeometry.x.mul(2.2))).mul(0.06).mul(along), sin(time.mul(4).add(ph).sub(positionGeometry.x.mul(2.4))).mul(0.32).mul(along)));
  m.colorNode = texture(FLAGS[sq.team][sq.type]).rgb;
  const cloth = new THREE.Mesh(clothGeo, m); cloth.castShadow = HIGH;
  // 血條：一直面向鏡頭的小長條
  const hp = uniform(1);
  const hm = new THREE.SpriteNodeMaterial({ depthTest: false, transparent: true });
  const u = uv(), edge = u.x.lessThan(0.03).or(u.x.greaterThan(0.97)).or(u.y.lessThan(0.12)).or(u.y.greaterThan(0.88));
  const fillC = mix(vec3(0.95, 0.25, 0.2), vec3(0.3, 0.9, 0.35), smoothstep(0.25, 0.6, hp));
  hm.colorNode = select(edge, vec3(0.08), select(u.x.lessThan(hp), fillC, vec3(0.2)));
  hm.opacityNode = float(0.92);
  const bar = new THREE.Sprite(hm); bar.center.set(0.5, 0); bar.renderOrder = 10;
  g.add(pole, tip, cloth, bar);
  scene.add(g);
  return { g, bar, hp, cloth };
}
function buildMarkers() {
  for (const m of markers) { scene.remove(m.spr, m.ring, m.flag.g); }
  markers = b.squads.map((sq) => {
    const spr = new THREE.Sprite(new THREE.SpriteNodeMaterial({ map: BADGES[sq.team][sq.type], depthTest: false, transparent: true }));
    spr.renderOrder = 10; spr.scale.setScalar(4.2); scene.add(spr);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicNodeMaterial({ color: 0xffe066, transparent: true, opacity: 0.85, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
    return { sq, spr, ring, flag: makeFlag(sq), fx: sq.cx, fz: sq.cz };
  });
}
function updMarkers(dt = 0.016) {
  const k = cam.dist / 120;
  for (const m of markers) {
    const sq = m.sq, show = sq.alive > 0;
    m.spr.visible = show && (k > 1.25 || sel.has(sq)); m.flag.g.visible = show; if (!show) { m.ring.visible = false; continue; }
    // 軍旗跟在隊伍中間（慢慢跟上，不會抖）；離很遠時只看得到小圖示
    const a = Math.min(1, dt * 3); m.fx += (sq.cx - m.fx) * a; m.fz += (sq.cz - m.fz) * a;
    const fs = Math.min(3, Math.max(1, k * 2)), gy = ter.height(m.fx, m.fz);
    m.flag.g.position.set(m.fx, gy, m.fz); m.flag.g.scale.setScalar(fs);
    m.flag.g.rotation.y = cam.yaw + 0.45;   // 旗面大致朝鏡頭（斜一點比較立體）
    m.flag.hp.value = sq.alive / sq.n0;
    m.flag.bar.position.set(0, 7.3, 0); m.flag.bar.scale.set(2.6, 0.38, 1);
    m.spr.position.set(sq.cx, gy + 9 * fs + 2, sq.cz); m.spr.scale.setScalar((sel.has(sq) ? 5.2 : 4) * Math.max(0.8, k));
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
  if (b.squads.some((sq) => sq.team === 0 && sq.type === T.SPEAR)) add('<b>🔱</b>只選槍兵', '選長槍兵', () => selType(T.SPEAR));
  add('<b>📏</b>排隊形', '先選隊伍，再按這個，然後在地上拖一條線：隊伍會沿著線排好（近戰在前、弓箭手在後）', () => {
    if (!sel.size) { sel.clear(); for (const sq of b.squads) if (sq.team === 0 && sq.alive) sel.add(sq); updSel(); }
    cmd = cmd === 'line' ? null : 'line'; dock(); updSel(); if (cmd) toast('在地上拖一條線，隊伍會沿著線排好');
  }, cmd === 'line' ? 'on' : '');
  if (phase === 'deploy') { add('<b>📯</b>開戰！', '開始戰鬥', fight, 'go'); return; }
  const s = document.createElement('span'); s.className = 'sep'; d.appendChild(s);
  add('<b>🚩</b>衝鋒', '選取的隊伍（沒選就是全軍）往最近的敵人衝', () => { for (const sq of targets()) { sq.mode = 'charge'; if (sq.order) sq.order.move = false; } toast('衝啊！'); });
  add('<b>✋</b>停下', '選取的隊伍停在原地', () => { for (const sq of targets()) { sq.mode = 'hold'; b.orderSquad(sq, sq.cx, sq.cz, sq.order.fx, sq.order.fz, sq.order.cols * STATS[sq.type].spacing); } toast('原地守住'); });
  add('<b>✖️</b>取消選取', '取消選取', () => { sel.clear(); cmd = null; updSel(); dock(); });
}
function selType(t) { sel.clear(); for (const sq of b.squads) if (sq.team === 0 && sq.alive && sq.type === t) sel.add(sq); updSel(); }
const targets = () => (sel.size ? [...sel] : b.squads.filter((sq) => sq.team === 0 && sq.alive));
function updSel() {
  const el = $('selInfo');
  if (!sel.size) { el.classList.add('hidden'); return; }
  const by = [0, 0, 0, 0], men = [0, 0, 0, 0];
  for (const sq of sel) { by[sq.type]++; men[sq.type] += sq.alive; }
  el.innerHTML = '已選：' + [0, 1, 2, 3].filter((t) => by[t]).map((t) => `${STATS[t].name} ${by[t]} 隊（${men[t]} 人）`).join('、') + `<br><span style="opacity:.75">${cmd === 'line' ? '📏 在地上拖一條線排隊形' : '點地面＝走過去 · 長按另一隊＝加選 · 📏＝畫線排隊形'}</span>`;
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
  for (const [k, nm] of [['sword', '劍盾兵（隊）'], ['spear', '長槍兵（隊）'], ['archer', '弓箭手（隊）'], ['cav', '騎兵（隊）']]) {
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
  drag = { kind: e.button === 2 ? 'rot' : 'tap', sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, g0: groundAt(e.clientX, e.clientY), shift: e.shiftKey, t0: performance.now() };
  // 長按自己的隊伍＝加選／取消（手機上一次選好幾隊）
  const d0 = drag;
  if (d0.kind === 'tap' && d0.g0) setTimeout(() => { if (drag === d0 && d0.kind === 'tap') { const sq = squadAt(d0.g0); if (sq) { d0.kind = 'done'; if (sel.has(sq)) sel.delete(sq); else sel.add(sq); updSel(); navigator.vibrate?.(20); toast(sel.has(sq) ? '加選一隊' : '取消這一隊'); } } }, 480);
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
  // 手指移動超過 14 px 就不算點一下：一般是移動畫面；只有按了「排隊形」才是畫線
  if (drag.kind === 'tap' && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 14) drag.kind = cmd === 'line' && sel.size && drag.g0 ? 'line' : 'pan';
  if (drag.kind === 'pan') {
    const k = cam.dist * 0.0016, c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
    cam.x -= (dx * c + dy * s) * k; cam.z -= (-dx * s + dy * c) * k;
  }
  if (drag.kind === 'line') {
    const g = groundAt(e.clientX, e.clientY); if (!g) return; drag.g1 = g;
    const a = preview.geometry.attributes.position; a.setXYZ(0, drag.g0.x, drag.g0.y + 0.5, drag.g0.z); a.setXYZ(1, g.x, g.y + 0.5, g.z); a.needsUpdate = true; preview.visible = true;
    const pl = planLine(drag.g0, g); if (pl) ghostPlan = pl;   // 一邊拉一邊看排好會長什麼樣子
  }
});
const endP = (e) => {
  ptrs.delete(e.pointerId);
  if (!drag) return;
  if (drag.kind === 'tap' && drag.g0 && performance.now() - drag.t0 < 600) tapAt(drag.g0, drag.shift);
  if (drag.kind === 'line') { if (drag.g1) lineOrder(drag.g0, drag.g1); cmd = null; dock(); }
  preview.visible = false; ghostPlan = null;
  drag = ptrs.size ? null : null;
};
canvas.addEventListener('pointerup', endP); canvas.addEventListener('pointercancel', endP);
canvas.addEventListener('wheel', (e) => { cam.dist = Math.min(320, Math.max(35, cam.dist * Math.exp(e.deltaY * 0.001))); }, { passive: true });
const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code); sound.start();
  if (e.code === 'Space') { e.preventDefault(); if (phase === 'deploy') fight(); else $('pauseBtn').click(); }
  if (e.code === 'Escape') { sel.clear(); cmd = null; updSel(); dock(); }
});
addEventListener('keyup', (e) => keys.delete(e.code));

function enemyCenter() { let x = 0, z = 0, n = 0; for (const sq of b.squads) if (sq.team === 1 && sq.alive) { x += sq.cx * sq.alive; z += sq.cz * sq.alive; n += sq.alive; } return n ? { x: x / n, z: z / n } : { x: 0, z: -40 }; }
function clampDeploy(p) { if (phase === 'deploy') { p.z = Math.max(10, Math.min(76, p.z)); p.x = Math.max(-115, Math.min(115, p.x)); } return p; }
function squadAt(g) {
  let best = null, bd = Infinity;
  for (const sq of b.squads) {
    if (sq.team !== 0 || !sq.alive) continue;
    const r = Math.sqrt(sq.alive) * STATS[sq.type].spacing * 0.7 + 3, d = Math.hypot(sq.cx - g.x, sq.cz - g.z);
    if (d < r && d < bd) { bd = d; best = sq; }
  }
  return best;
}
function tapAt(g, shift) {
  const best = squadAt(g);
  if (best) {
    // 點一隊＝只選這一隊；再點一次取消；Shift 或長按＝加選
    if (shift) { if (sel.has(best)) sel.delete(best); else sel.add(best); }
    else if (sel.has(best) && sel.size === 1) sel.clear();
    else { sel.clear(); sel.add(best); }
    updSel(); return;
  }
  if (!sel.size) return;
  const p = clampDeploy(g.clone()), e = enemyCenter();
  let fx = e.x - p.x, fz = e.z - p.z; const L = Math.hypot(fx, fz) || 1; fx /= L; fz /= L;
  applyPlan(planAt(p, fx, fz));
  toast(sel.size > 1 ? `${sel.size} 隊出發（近戰在前、弓箭手在後、騎兵在兩邊）` : '出發！');
}
// 一隊排成寬 w 時有幾列、幾排、多深
const colsFor = (sq, w) => Math.max(3, Math.round(w / STATS[sq.type].spacing));
const depthOf = (sq, w) => Math.ceil(Math.max(1, sq.alive) / colsFor(sq, w)) * STATS[sq.type].spacing;
const defWidth = (sq) => sq.order.cols * STATS[sq.type].spacing;
// 自動隊形：劍盾兵、長槍兵排前面（長槍兵放中間），弓箭手排在後面，騎兵在兩邊
// 中心 c、面向 f、前排總寬 front（沒給就用每隊原本的寬度）
function arrange(list, cx, cz, fx, fz, front) {
  const rx = -fz, rz = fx, out = [];
  const melee = list.filter((q) => q.type === T.SWORD || q.type === T.SPEAR).sort((a, c) => (a.type === T.SPEAR) - (c.type === T.SPEAR));
  // 長槍兵放中間：把排序後的槍兵插到中間
  const sw = melee.filter((q) => q.type === T.SWORD), sp = melee.filter((q) => q.type === T.SPEAR);
  const mid = Math.ceil(sw.length / 2), frontRow = [...sw.slice(0, mid), ...sp, ...sw.slice(mid)];
  const arch = list.filter((q) => q.type === T.ARCHER), cav = list.filter((q) => q.type === T.CAV);
  const row = (squads, offBack, total) => {
    if (!squads.length) return 0;
    let ws = squads.map(defWidth);
    if (total) { const sum = ws.reduce((x, y) => x + y, 0), gaps = 3 * (squads.length - 1); ws = ws.map((w) => Math.max(5, w * (total - gaps) / sum)); }
    const W = ws.reduce((x, y) => x + y + 3, -3);
    let off = -W / 2, depth = 0;
    squads.forEach((q, i) => { const c = off + ws[i] / 2; off += ws[i] + 3; const d = depthOf(q, ws[i]); depth = Math.max(depth, d); out.push({ sq: q, x: cx + rx * c - fx * (offBack + d / 2), z: cz + rz * c - fz * (offBack + d / 2), fx, fz, w: ws[i] }); });
    return depth;
  };
  // 沒有近戰兵：選到的全部排成一排
  if (!frontRow.length) { row(arch.length ? arch : cav, 0, front); if (arch.length && cav.length) placeCav(cav, out, cx, cz, fx, fz, (front || arch.reduce((a, q) => a + defWidth(q) + 3, -3)) / 2, 0); return out; }
  const d1 = row(frontRow, 0, front);
  if (arch.length) row(arch, d1 + 5, front ? Math.min(front, arch.reduce((a, q) => a + defWidth(q) + 3, -3) * 1.3) : 0);
  const half = (front || frontRow.reduce((a, q) => a + defWidth(q) + 3, -3)) / 2;
  placeCav(cav, out, cx, cz, fx, fz, half, d1 * 0.5);
  return out;
}
function placeCav(cav, out, cx, cz, fx, fz, half, back) {
  const rx = -fz, rz = fx;
  cav.forEach((q, i) => {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), w = defWidth(q), c = side * (half + 6 + w / 2 + k * (w + 4));
    out.push({ sq: q, x: cx + rx * c - fx * back, z: cz + rz * c - fz * back, fx, fz, w });
  });
}
function planAt(p, fx, fz) { return arrange([...sel], p.x, p.z, fx, fz, 0); }
function planLine(a, c) {
  const A = clampDeploy(a.clone()), C = clampDeploy(c.clone());
  let dx = C.x - A.x, dz = C.z - A.z; const L = Math.hypot(dx, dz); if (L < 3) return null;
  dx /= L; dz /= L;
  // 面向：垂直於線、朝向敵人那一邊
  const e = enemyCenter(); let fx = -dz, fz = dx;
  const mx = (A.x + C.x) / 2, mz = (A.z + C.z) / 2;
  if (fx * (e.x - mx) + fz * (e.z - mz) < 0) { fx = -fx; fz = -fz; }
  return arrange([...sel], mx, mz, fx, fz, L);
}
function applyPlan(plan) {
  for (const o of plan) {
    o.sq.mode = 'hold'; b.orderSquad(o.sq, o.x, o.z, o.fx, o.fz, o.w, phase !== 'deploy');
    if (phase === 'deploy') snapSquad(o.sq);
  }
  ghostFlash = 1.2; ghostLast = plan;
}
function lineOrder(a, c) {
  const pl = planLine(a, c); if (!pl) return;
  applyPlan(pl); toast('照著線排好隊形！');
}
// ---------------------------------------------------------------- 隊形預覽：每一隊要站的方框＋面向的小箭頭
let ghostPlan = null, ghostFlash = 0, ghostLast = null;
const ghost = (() => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 7 * 2 * 3), 3)); g.setDrawRange(0, 0);
  const m = new THREE.LineBasicNodeMaterial({ color: 0xffe066, depthTest: false, transparent: true, opacity: 0.9 });
  const l = new THREE.LineSegments(g, m); l.renderOrder = 11; l.frustumCulled = false; scene.add(l); return l;
})();
function drawGhost(dt) {
  ghostFlash = Math.max(0, ghostFlash - dt);
  // 拉線時：預覽；剛下完命令：閃一下目的地；平常：選到的隊伍還在走的話，顯示要去的地方
  let list = ghostPlan || (ghostFlash > 0 ? ghostLast : null);
  if (!list) list = [...sel].filter((q) => q.alive && q.mode !== 'charge' && Math.hypot(q.cx - q.order.x, q.cz - q.order.z) > 4).map((q) => ({ sq: q, x: q.order.x, z: q.order.z, fx: q.order.fx, fz: q.order.fz, w: q.order.cols * STATS[q.type].spacing }));
  const a = ghost.geometry.attributes.position; let n = 0;
  const put = (x, z) => { a.setXYZ(n++, x, ter.height(x, z) + 0.4, z); };
  for (const o of list.slice(0, 64)) {
    const hw = o.w / 2, hd = depthOf(o.sq, o.w) / 2, rx = -o.fz, rz = o.fx;
    const P = (u, v) => [o.x + rx * u + o.fx * v, o.z + rz * u + o.fz * v];
    const c = [P(-hw, hd), P(hw, hd), P(hw, -hd), P(-hw, -hd)];
    for (let k = 0; k < 4; k++) { put(...c[k]); put(...c[(k + 1) % 4]); }
    const tip = P(0, hd + 3.5), l1 = P(-1.5, hd + 1.5), r1 = P(1.5, hd + 1.5);
    put(...l1); put(...tip); put(...r1); put(...tip); put(...P(0, hd)); put(...tip);
  }
  a.needsUpdate = true; ghost.geometry.setDrawRange(0, n); ghost.visible = n > 0;
  ghost.material.opacity = ghostPlan ? 0.95 : ghostFlash > 0 ? 0.5 + ghostFlash * 0.4 : 0.45;
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
  scene.fog.near = cam.dist + 60; scene.fog.far = cam.dist + 380;   // 拉遠時霧也跟著退，不會整片白
  sun.position.set(cam.x + 80, 95, cam.z + 55); sun.target.position.set(cam.x, 0, cam.z);
}
// ---------------------------------------------------------------- 小地圖
const mini = $('mini'), mctx = mini.getContext('2d');
let miniBg = null, miniT = 0;
const MW = 240, MH = 160;   // 地圖範圍 x −120～120、z −80～80
function miniSize() { const r = mini.getBoundingClientRect(), d = Math.min(2, devicePixelRatio); mini.width = Math.round(r.width * d); mini.height = Math.round(r.height * d); miniBg = null; }
function miniBgDraw() {
  const W = mini.width, H = mini.height, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), sx = W / MW, sz = H / MH;
  x.fillStyle = '#5f7f3a'; x.fillRect(0, 0, W, H);
  // 山丘：顏色深淺
  for (let j = 0; j < H; j += 3) for (let i = 0; i < W; i += 3) {
    const h = ter.height(i / sx - MW / 2, j / sz - MH / 2);
    if (h > 0.8) { x.fillStyle = `rgba(230,220,160,${Math.min(0.35, (h - 0.8) * 0.06)})`; x.fillRect(i, j, 3, 3); }
  }
  if (ter.river) {
    const r = ter.river; x.strokeStyle = '#4b97c6'; x.lineWidth = r.w * 2 * sz; x.beginPath();
    for (let X = -MW / 2; X <= MW / 2; X += 2) { const Z = r.z + r.amp * Math.sin(X * r.f); X === -MW / 2 ? x.moveTo((X + MW / 2) * sx, (Z + MH / 2) * sz) : x.lineTo((X + MW / 2) * sx, (Z + MH / 2) * sz); }
    x.stroke();
    x.fillStyle = '#9b7444';
    for (const bx of r.bridges || []) { const Z = r.z + r.amp * Math.sin(bx * r.f); x.fillRect((bx - 4.5 + MW / 2) * sx, (Z - r.w - 2 + MH / 2) * sz, 9 * sx, (r.w * 2 + 4) * sz); }
  }
  x.fillStyle = '#2f5a2c';
  for (const f of ter.forests) { x.beginPath(); x.ellipse((f.x + MW / 2) * sx, (f.z + MH / 2) * sz, f.r * sx, f.r * sz, 0, 0, Math.PI * 2); x.fill(); }
  miniBg = c;
}
function drawMini() {
  if (!mini.width) miniSize();
  if (!miniBg) miniBgDraw();
  const W = mini.width, H = mini.height, sx = W / MW, sz = H / MH, x = mctx;
  x.drawImage(miniBg, 0, 0);
  const d = Math.max(1.5, W / 120);
  for (let i = 0; i < b.n; i++) {
    if (!b.alive[i]) continue;
    x.fillStyle = b.team[i] ? '#ff5a4f' : '#5fa0ff';
    x.fillRect((b.x[i] + MW / 2) * sx - d / 2, (b.z[i] + MH / 2) * sz - d / 2, d, d);
  }
  for (const sq of sel) { x.strokeStyle = '#ffe066'; x.lineWidth = 1.5; x.beginPath(); x.arc((sq.cx + MW / 2) * sx, (sq.cz + MH / 2) * sz, 5, 0, Math.PI * 2); x.stroke(); }
  // 鏡頭看到的範圍（螢幕四個角投到地面）
  const pts = [[0, 0], [innerWidth, 0], [innerWidth, innerHeight], [0, innerHeight]].map(([px, py]) => {
    ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const p = ray.ray.intersectPlane(ground, new THREE.Vector3());
    if (!p || p.distanceTo(camera.position) > 600) { const dir = ray.ray.direction.clone().setY(0).normalize().multiplyScalar(400); return camera.position.clone().add(dir); }
    return p;
  });
  x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1.5; x.beginPath();
  pts.forEach((p, i) => { const X = (p.x + MW / 2) * sx, Y = (p.z + MH / 2) * sz; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); x.stroke();
}
let miniDrag = false;
const miniGo = (e) => { const r = mini.getBoundingClientRect(); cam.x = (e.clientX - r.left) / r.width * MW - MW / 2; cam.z = (e.clientY - r.top) / r.height * MH - MH / 2; };
mini.addEventListener('pointerdown', (e) => { miniDrag = true; mini.setPointerCapture(e.pointerId); miniGo(e); });
mini.addEventListener('pointermove', (e) => { if (miniDrag) miniGo(e); });
mini.addEventListener('pointerup', () => { miniDrag = false; });
addEventListener('resize', miniSize);

let checkT = 0;
function update(dt) {
  if (phase === 'fight' && !paused) {
    const h = dt * speed, n = Math.ceil(h / 0.034);
    for (let i = 0; i < n; i++) b.step(h / n);
    dust.emit(b, h);
    checkT -= dt;
    if (checkT <= 0) {
      checkT = 0.5;
      if (b.count(1) <= b.start[1] * 0.08) endBattle(true);
      else if (b.count(0) <= b.start[0] * 0.08) endBattle(false);
    }
  } else if (phase === 'done' && !paused) { b.step(dt * 0.5); }
  for (const sq of [...sel]) if (!sq.alive) { sel.delete(sq); updSel(); }
  meshes.sync(b);
  updMarkers(dt);
  drawGhost(dt);
  updateCamera(dt);
  dust.update(paused ? 0 : dt * speed, camera);
  miniT -= dt; if (miniT <= 0) { miniT = 0.12; drawMini(); }
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
  get b() { return b; }, cam, sel, sun, renderer, scene, BATTLES, WEBGPU, HIGH, SCALE,
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
