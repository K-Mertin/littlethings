// 深海探險隊：潛水艇、鏡頭、操作、圖鑑、垃圾、光線與霧
import * as THREE from 'three';
import { pass, uniform, vec3, vec4, mix, sin, time, uv, smoothstep, float, instancedArray, instanceIndex, positionGeometry, billboarding, normalView, positionView, positionWorld, mx_noise_float } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { buildWorld, floorY, HALF } from './world.js';
import { Fish } from './fish.js';
import { buildCreatures } from './creatures.js';
import { CODEX, TRASH_TOTAL } from './data.js';
import { Sound } from './audio.js';
import { buildSub } from './sub.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;

// ---------------------------------------------------------------- 存檔
const SAVE_KEY = 'mwLabDeep.v1';
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
save.found = save.found || []; save.trash = save.trash || [];
save.up = Object.assign({ eng: 0, lamp: 0, sonar: 0 }, save.up || {});   // 潛艇升級（舊存檔沒有，從 0 開始）
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { } };

// ---------------------------------------------------------------- 載入畫面
const step = (k, msg) => { $('loadBar').style.width = Math.round(k * 100) + '%'; if (msg) $('loadMsg').textContent = msg; };

const canvas = $('view');
const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, powerPreference: 'high-performance', forceWebGL: params.has('gl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
step(0.05, '啟動顯示卡…');
await renderer.init();
const WEBGPU = !!renderer.backend.isWebGPUBackend;
const HIGH = (params.get('q') || (WEBGPU && !isTouch ? 'high' : 'low')) === 'high';
$('gpuTag')?.remove();
renderer.shadowMap.enabled = HIGH;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b5a74, 0.018);
const fogCol = scene.fog.color;   // FogExp2 會複製一份顏色，要改它自己的
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 420);

const hemi = new THREE.HemisphereLight(0x9fe8ff, 0x1a2a2e, 1.4); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xdff6ff, 2.2); sun.position.set(20, 60, -10); scene.add(sun); scene.add(sun.target);

step(0.15, '建造海底…');
await new Promise((r) => setTimeout(r, 0));
const W = buildWorld(scene, { high: HIGH, webgpu: WEBGPU });
step(0.45, '放魚群…');
await new Promise((r) => setTimeout(r, 0));
const FISH_N = WEBGPU ? (HIGH ? 9000 : 3500) : 1500;
const fish = new Fish(scene, { count: FISH_N, webgpu: WEBGPU });
step(0.55, '叫醒海底的動物…');
const creatures = buildCreatures(scene, W, { high: HIGH });

// ---------------------------------------------------------------- 潛水艇
const sub = buildSub(HIGH);
scene.add(sub);
const spot = new THREE.SpotLight(0xfff1d6, 160, 55, 0.5, 0.55, 1.4);
spot.position.set(0, -0.4, 1.3); sub.add(spot);
const spotTarget = new THREE.Object3D(); spotTarget.position.set(0, -2.5, 14); sub.add(spotTarget); spot.target = spotTarget;
if (HIGH) { spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.camera.near = 0.5; spot.shadow.camera.far = 55; spot.shadow.bias = -0.0005; }
const fill = new THREE.PointLight(0xbfefff, 3, 9, 1.5); fill.position.set(0, 1.5, 0); sub.add(fill);
// 探照燈的光束（看得到的光錐，加法混色）
const cone = (() => {
  const g = new THREE.ConeGeometry(4.6, 18, 32, 1, true); g.translate(0, -9, 0); g.rotateX(-Math.PI / 2 - 0.14);
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const along = uv().y;
  // 光束：邊緣淡掉（從後面看不會變成一個硬硬的圓盤），裡面有慢慢飄動的懸浮物明暗
  const soft = normalView.dot(positionView.normalize()).abs().pow(1.8);
  const murk = mx_noise_float(positionWorld.mul(0.6).add(vec3(0, time.mul(0.15), 0))).mul(0.35).add(0.8);
  m.colorNode = vec3(1, 0.95, 0.8).mul(0.08).mul(along.mul(along.oneMinus()).mul(4)).mul(soft).mul(murk);
  const c = new THREE.Mesh(g, m); c.position.set(0, -0.4, 1.25); c.renderOrder = 5; sub.add(c); return c;
})();
// 氣泡：從螺旋槳冒出來，往上飄、慢慢變大
const BN = 260, bub = { p: new Float32Array(BN * 4), v: [], i: 0, acc: 0 };
for (let i = 0; i < BN; i++) { bub.p[i * 4 + 1] = -999; bub.v.push(0); }
const BA = instancedArray(bub.p, 'vec4');
const bubMesh = (() => {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const d = BA.element(instanceIndex);
  m.positionNode = positionGeometry.add(d.xyz);   // billboarding 用幾何本身的大小（不能在 positionNode 裡縮放）
  m.vertexNode = billboarding();
  const r = uv().sub(0.5).length();
  m.colorNode = vec3(0.85, 0.95, 1);
  m.opacityNode = smoothstep(0.5, 0.42, r).mul(smoothstep(0.2, 0.42, r).mul(0.7).add(0.15)).mul(0.8);
  const me = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), m); me.count = BN; me.frustumCulled = false; scene.add(me); return me;
})();
function updateBubbles(dt) {
  const sp = S.vel.length() + Math.abs(input.vert) * 2;
  bub.acc += dt * (2 + sp * 5);
  const back = new THREE.Vector3(0, 0, -1.9).applyQuaternion(sub.quaternion).add(sub.position);
  while (bub.acc > 1) {
    bub.acc -= 1; const k = bub.i++ % BN, o = k * 4;
    bub.p[o] = back.x + (Math.random() - 0.5) * 0.5; bub.p[o + 1] = back.y + (Math.random() - 0.5) * 0.5; bub.p[o + 2] = back.z + (Math.random() - 0.5) * 0.5;
    bub.p[o + 3] = 0.05 + Math.random() * 0.1; bub.v[k] = 1 + Math.random() * 1.5;
  }
  for (let k = 0; k < BN; k++) {
    const o = k * 4; if (bub.p[o + 1] < -900) continue;
    bub.p[o + 1] += bub.v[k] * dt; bub.p[o] += Math.sin(S.t * 3 + k) * dt * 0.3; bub.p[o + 3] = Math.min(0.35, bub.p[o + 3] + dt * 0.03);
    if (bub.p[o + 1] > -0.3) bub.p[o + 1] = -999;
  }
  BA.value.needsUpdate = true;
}

// ---------------------------------------------------------------- 狀態
const S = {
  pos: new THREE.Vector3(0, -6, -150), vel: new THREE.Vector3(),
  yaw: 0, camYaw: 0, camPitch: 0.24, camDist: 10.5,
  light: !!save.light, t: 0,
};
S.pos.y = Math.max(floorY(S.pos.x, S.pos.z) + 6, -8);
const input = { fwd: 0, turn: 0, vert: 0 };
const keys = new Set();
const sound = new Sound();
if (save.soundOff) sound.setOn(false);

// 已經撿過的垃圾
W.trash.forEach((m, i) => { if (save.trash.includes(i)) { m.visible = false; } });

// ---------------------------------------------------------------- 後製：泛光（發光水母、熱泉、燈）
const pipeline = new THREE.RenderPipeline(renderer);
const scenePass = pass(scene, camera);
const col0 = scenePass.getTextureNode();
// 水會吸收光：紅色最先不見、接著綠色，藍色走最遠。離鏡頭越遠、潛得越深，紅色越少（真的水下照片就是這樣偏藍綠）
const camDepthU = uniform(0);
const dist = scenePass.getViewZNode().negate().min(45);
const absorb = vec3(0.075, 0.024, 0.01).mul(dist).add(vec3(0.012, 0.004, 0.0015).mul(camDepthU)).negate().exp();
const col = vec4(col0.rgb.mul(absorb), col0.a);
const lit = HIGH ? col.add(bloom(col, 0.5, 0.45, 0.85)) : col;
// 暗角＋水下的藍綠色調
const vig = smoothstep(0.35, 0.95, uv().sub(0.5).length().mul(1.25));
pipeline.outputNode = vec4(mix(lit.rgb, lit.rgb.mul(vec3(0.55, 0.7, 0.8)), vig), 1);
const OFF = params.has('offscreen') ? new THREE.RenderTarget(1, 1) : null;

// ---------------------------------------------------------------- 操作
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code); sound.start(); hideHelp();
  if (e.code === 'KeyF') toggleLight();
  if (e.code === 'KeyR') pingSonar();
  if (e.code === 'KeyB' || e.code === 'Tab') { e.preventDefault(); toggleCodex(); }
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

let drag = null;
canvas.addEventListener('pointerdown', (e) => { sound.start(); hideHelp(); drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  S.camYaw -= (e.clientX - drag.x) * 0.0055; S.camPitch = Math.min(1.1, Math.max(-0.7, S.camPitch + (e.clientY - drag.y) * 0.004));
  drag.x = e.clientX; drag.y = e.clientY;
});
const endDrag = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => { S.camDist = Math.min(16, Math.max(4.5, S.camDist + e.deltaY * 0.01)); }, { passive: true });

// 觸控：左下搖桿、右下上浮／下潛
const touch = { stick: null, up: false, down: false };
if (isTouch) {
  $('touch').classList.remove('hidden');
  $('help').textContent = '左下搖桿移動 · 右邊按鈕上浮／下潛 · 拖曳畫面看四周';
  const st = $('stick'), knob = st.querySelector('i');
  st.addEventListener('pointerdown', (e) => { e.stopPropagation(); sound.start(); hideHelp(); touch.stick = { id: e.pointerId }; st.setPointerCapture(e.pointerId); moveStick(e); });
  st.addEventListener('pointermove', (e) => { if (touch.stick && touch.stick.id === e.pointerId) moveStick(e); });
  const end = () => { touch.stick = null; input.fwd = input.turn = 0; knob.style.transform = ''; };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  function moveStick(e) {
    const r = st.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
    const L = Math.hypot(dx, dy); if (L > 1) { dx /= L; dy /= L; }
    touch.sx = dx; touch.sy = dy;
    knob.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
  }
  const hold = (id, k) => {
    const b = $(id);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); sound.start(); touch[k] = true; b.setPointerCapture(e.pointerId); });
    const off = () => { touch[k] = false; };
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
  };
  hold('upBtn', 'up'); hold('downBtn', 'down');
}

function readInput() {
  const k = (c) => keys.has(c);
  let fwd = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
  let turn = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0);
  let vert = (k('Space') || k('KeyE') ? 1 : 0) - (k('ShiftLeft') || k('ShiftRight') || k('KeyQ') || k('KeyC') ? 1 : 0);
  if (touch.stick) { fwd = -touch.sy; turn = touch.sx; }
  if (touch.up) vert = 1; if (touch.down) vert = -1;
  input.fwd = Math.abs(fwd) < 0.15 ? 0 : fwd; input.turn = Math.abs(turn) < 0.15 ? 0 : turn; input.vert = vert;
}

function toggleLight(v) {
  S.light = typeof v === 'boolean' ? v : !S.light; save.light = S.light; persist();
  $('lightBtn').classList.toggle('on', S.light);
}
$('lightBtn').onclick = () => toggleLight();
$('sonarBtn').onclick = () => { sound.start(); pingSonar(); };
$('soundBtn').onclick = () => { sound.start(); sound.setOn(!sound.on); save.soundOff = !sound.on; persist(); $('soundBtn').textContent = sound.on ? '🔊' : '🔇'; };
$('soundBtn').textContent = sound.on ? '🔊' : '🔇';
let helpT = null;
function hideHelp() { if (helpT) return; helpT = setTimeout(() => { $('help').style.opacity = 0; }, 6000); }

// ---------------------------------------------------------------- 潛艇升級：用發現生物和撿垃圾得到的貝殼買
// 貝殼不另外存：賺到的（發現數 × 3 + 垃圾數 × 2）減掉已經花掉的（目前等級的價錢加總）
const UPS = [
  { k: 'eng', emoji: '🚀', name: '推進器', desc: (l) => `速度 ×${(1 + 0.2 * l).toFixed(1)}`, cost: [6, 10, 16] },
  { k: 'lamp', emoji: '🔦', name: '探照燈', desc: (l) => ['照 55 公尺', '照 72 公尺、更亮', '照 90 公尺、最亮最寬'][l], cost: [8, 14] },
  { k: 'sonar', emoji: '📡', name: '聲納', desc: (l) => ['每 4 秒一次', '每 2.5 秒一次', '每 1.5 秒一次，還會說是什麼生物'][l], cost: [6, 12] },
];
const shells = () => save.found.length * 3 + save.trash.length * 2 - UPS.reduce((a, u) => a + u.cost.slice(0, save.up[u.k]).reduce((x, y) => x + y, 0), 0);
function applyUps() {
  const l = save.up.lamp;
  spot.distance = [55, 72, 90][l]; spot.intensity = [160, 210, 260][l]; spot.angle = [0.5, 0.55, 0.62][l];
  if (HIGH) spot.shadow.camera.far = spot.distance;
  cone.scale.setScalar([1, 1.2, 1.45][l]);   // 看得到的光束也跟著變長
}
function renderUps() {
  $('shellN').textContent = `🐚 ${shells()}`;
  $('ups').innerHTML = UPS.map((u) => {
    const l = save.up[u.k], max = u.cost.length, c = u.cost[l];
    return `<div class="card"><div class="h"><span>${u.emoji}</span>${u.name} <span class="lv">${'●'.repeat(l)}${'○'.repeat(max - l)}</span></div><p>${u.desc(l)}${l < max ? ` → 升級後：${u.desc(l + 1)}` : '（已經最強了）'}</p>${l < max ? `<button data-k="${u.k}" ${shells() < c ? 'disabled' : ''}>升級 🐚 ${c}</button>` : ''}</div>`;
  }).join('');
}
$('ups').onclick = (e) => {
  const k = e.target.dataset && e.target.dataset.k; if (!k) return;
  const u = UPS.find((x) => x.k === k), l = save.up[k];
  if (l >= u.cost.length || shells() < u.cost[l]) return;
  save.up[k] = l + 1; persist(); applyUps(); sound.ping(); renderUps();
  msg(`${u.emoji} ${u.name}升級了！`);
};
applyUps();
// 貝殼夠買新的升級時提醒一次（每次開遊戲最多提醒一次）
let upHinted = false;
function upHint() {
  if (upHinted) return;
  if (UPS.some((u) => save.up[u.k] < u.cost.length && shells() >= u.cost[save.up[u.k]])) { upHinted = true; setTimeout(() => msg('🐚 貝殼夠了！打開 📖 圖鑑，到「潛艇工廠」升級潛水艇'), 2600); }
}

// ---------------------------------------------------------------- 圖鑑
$('codexT').textContent = CODEX.length;
function renderCodex() {
  $('codexN').textContent = save.found.length;
  $('trashN').textContent = save.trash.length;
  $('codexSub').textContent = `找到 ${save.found.length} / ${CODEX.length} 種 · 撿了 ${save.trash.length} / ${TRASH_TOTAL} 個垃圾` + (save.found.length === CODEX.length ? ' · 🏅 圖鑑全部完成！' : '');
  $('cards').innerHTML = CODEX.map((c) => {
    const ok = save.found.includes(c.id);
    return `<div class="card${ok ? '' : ' lock'}"><div class="h"><span>${c.emoji}</span>${ok ? c.name : '？？？'}</div><p>${ok ? c.fact : '在「' + c.zone + '」附近找找看。'}</p></div>`;
  }).join('');
  renderUps();
}
function toggleCodex(v) {
  const el = $('codex'), show = typeof v === 'boolean' ? v : el.classList.contains('hidden');
  el.classList.toggle('hidden', !show); if (show) renderCodex();
}
$('codexBtn').onclick = () => toggleCodex(true);
$('closeCodex').onclick = () => toggleCodex(false);
$('resetBtn').onclick = () => {
  if (!confirm('要清掉圖鑑和撿垃圾的紀錄，重新開始嗎？')) return;
  save.found = []; save.trash = []; save.up = { eng: 0, lamp: 0, sonar: 0 }; persist(); applyUps();
  W.trash.forEach((m) => { m.visible = true; });
  renderCodex();
};

let toastT = null; const toastQ = [];
function showToast(c) {
  toastQ.push(c);
  if (toastT) return;
  const next = () => {
    const x = toastQ.shift(); if (!x) { toastT = null; $('toast').classList.remove('show'); return; }
    $('tEm').textContent = x.emoji; $('tName').textContent = x.title || ('發現：' + x.name); $('tFact').textContent = x.fact;
    $('toast').classList.add('show');
    toastT = setTimeout(() => { $('toast').classList.remove('show'); toastT = setTimeout(next, 450); }, 6500);
  };
  next();
}
let msgT;
function msg(t) { const el = $('msg'); el.textContent = t; el.classList.add('show'); clearTimeout(msgT); msgT = setTimeout(() => el.classList.remove('show'), 2200); }

// 圖鑑要怎麼「找到」：每一種的位置和距離
const DEEP_NEED_LIGHT = new Set(['jelly', 'angler', 'tubeworm', 'dumbo']);
const targets = () => {
  const out = [];
  for (const id of ['sardine', 'tang', 'yellow', 'parrot', 'jack']) { const c = fish.center(id); if (c) out.push({ id, p: c, r: c.w + 7 }); }
  out.push({ id: 'coral', ...W.poi.coral }, { id: 'kelp', ...W.poi.kelp }, { id: 'anemone', ...W.poi.anemone }, { id: 'tubeworm', ...W.poi.vent });
  for (const s of W.poi.starfish) out.push({ id: 'starfish', ...s });
  for (const c of creatures) out.push({ id: c.id, p: c.obj.position, r: c.r });
  return out;
};
let darkHintT = 0;
function checkDiscover() {
  for (const t of targets()) {
    if (save.found.includes(t.id)) continue;
    const d = Math.hypot(t.p.x - S.pos.x, t.p.y - S.pos.y, t.p.z - S.pos.z);
    if (d > t.r) continue;
    if (DEEP_NEED_LIGHT.has(t.id) && !S.light) { if (S.t > darkHintT) { msg('這裡好暗…打開探照燈 💡 才看得清楚'); darkHintT = S.t + 8; } continue; }
    save.found.push(t.id); persist(); upHint();
    const c = CODEX.find((x) => x.id === t.id);
    showToast(c); sound.ping(); renderCodex();
    if (save.found.length === CODEX.length) setTimeout(() => { showToast({ emoji: '🏅', title: '海洋圖鑑全部完成！', fact: '你是真正的深海探險家！' }); sound.fanfare(); }, 7200);
  }
}
function checkTrash() {
  W.trash.forEach((m, i) => {
    if (!m.visible) return;
    if (m.position.distanceTo(S.pos) < 3) {
      m.visible = false; save.trash.push(i); persist(); sound.bubble(); renderCodex(); upHint();
      const left = TRASH_TOTAL - save.trash.length;
      if (left > 0) msg(`撿起垃圾！還剩 ${left} 個`);
      else { showToast({ emoji: '🪸', title: '海底變乾淨了！', fact: '20 個垃圾都撿完了。海龜不會再誤吃塑膠袋，珊瑚也能好好長大，謝謝你！' }); sound.fanfare(); }
    }
  });
}

// ---------------------------------------------------------------- 探險任務：一個完成換下一個
const MISSIONS = [
  { t: '發現 3 種海洋生物', p: () => [save.found.length, 3] },
  { t: '撿起 5 個垃圾', p: () => [save.trash.length, 5] },
  { t: '潛到 40 公尺深', p: () => [Math.min(40, save.maxDepth || 0), 40] },
  { t: '找到昆布森林和海葵', p: () => [['kelp', 'anemone'].filter((x) => save.found.includes(x)).length, 2] },
  { t: '打開探照燈 💡，找到發光水母', p: () => [save.found.includes('jelly') ? 1 : 0, 1] },
  { t: '潛到最深的海溝（100 公尺）', p: () => [Math.min(100, save.maxDepth || 0), 100] },
  { t: '找到海溝裡的管蟲熱泉', p: () => [save.found.includes('tubeworm') ? 1 : 0, 1] },
  { t: '撿完全部 20 個垃圾', p: () => [save.trash.length, TRASH_TOTAL] },
  { t: '完成整本海洋圖鑑', p: () => [save.found.length, CODEX.length] },
];
let missionShown = -1;
function updateMission() {
  let i = save.mission || 0;
  while (i < MISSIONS.length) { const [a, b] = MISSIONS[i].p(); if (a >= b) { i++; if (i > (save.mission || 0)) { save.mission = i; persist(); if (missionShown >= 0) { sound.ping(); msg(`✅ 任務完成！${MISSIONS[i - 1].t}`); } } } else break; }
  const el = $('mission');
  if (i >= MISSIONS.length) { el.innerHTML = '🏅 所有探險任務都完成了！'; missionShown = i; return; }
  const [a, b] = MISSIONS[i].p();
  el.innerHTML = `<small>任務 ${i + 1}/${MISSIONS.length}</small> ${MISSIONS[i].t} <b>${a}/${b}</b>`;
  missionShown = i;
}
// ---------------------------------------------------------------- 區域名稱
let zoneNow = '';
function updateZone() {
  const d = -S.pos.y, z = S.pos.z;
  const name = z > 95 && d > 80 ? '🌋 海溝' : d > 70 ? '🌑 深海平原' : z > -40 ? '⛰️ 大斜坡' : Math.hypot(S.pos.x - W.kelp.x, z - W.kelp.z) < 25 ? '🌿 昆布森林' : '🪸 珊瑚礁淺海';
  if (name !== zoneNow) { zoneNow = name; const el = $('zone'); el.textContent = name; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2600); }
}
// ---------------------------------------------------------------- 聲納：指出最近還沒找到的生物
let sonar = { t: 0, cd: 0, target: null };
function pingSonar() {
  if (sonar.cd > 0) return;
  sonar.cd = [4, 2.5, 1.5][save.up.sonar];
  let best = null, bd = Infinity;
  for (const t of targets()) { if (save.found.includes(t.id)) continue; const d = Math.hypot(t.p.x - S.pos.x, t.p.y - S.pos.y, t.p.z - S.pos.z); if (d < bd) { bd = d; best = t; } }   // 魚群中心是一般物件（不是 Vector3），不能用 distanceTo
  sound.ping();
  if (!best) { msg('圖鑑都找齊了！'); return; }
  sonar.target = best; sonar.t = 7;
  if (save.up.sonar >= 2) { const c = CODEX.find((x) => x.id === best.id); if (c) msg(`📡 最近的是：${c.emoji} ${c.name}`); }
}
function updateSonar(dt) {
  sonar.cd = Math.max(0, sonar.cd - dt); sonar.t = Math.max(0, sonar.t - dt);
  const el = $('sonar');
  $('sonarBtn').classList.toggle('cool', sonar.cd > 0);
  if (!sonar.target || sonar.t <= 0) { el.classList.add('hidden'); return; }
  const fc = fish.center(sonar.target.id); if (fc) sonar.target.p = fc;   // 魚群會游走，每一格重新抓牠們的中心
  const tp = sonar.target.p, dx = tp.x - S.pos.x, dz = tp.z - S.pos.z;
  const ang = Math.atan2(dx, dz) - S.camYaw;   // 相對鏡頭的方向（0 ＝ 正前方）
  const dist = Math.round(Math.hypot(dx, tp.y - S.pos.y, dz)), dy = tp.y - S.pos.y;
  el.classList.remove('hidden');
  el.querySelector('i').style.transform = `rotate(${-ang}rad)`;
  el.querySelector('span').textContent = `${dist} m ${dy > 4 ? '⬆️' : dy < -4 ? '⬇️' : ''}`;
  if (save.found.includes(sonar.target.id)) sonar.t = 0;
}

// ---------------------------------------------------------------- 每一格
const tmpV = new THREE.Vector3(), lookAt = new THREE.Vector3();
const SHALLOW = new THREE.Color(0x0e6a86), MID = new THREE.Color(0x032a40), DEEP = new THREE.Color(0x000306);
function update(dt) {
  S.t += dt;
  readInput();
  // 轉向（鍵盤 A/D、搖桿左右）
  S.camYaw -= input.turn * 1.7 * dt;
  const dir = tmpV.set(Math.sin(S.camYaw), 0, Math.cos(S.camYaw));
  const acc = new THREE.Vector3().addScaledVector(dir, input.fwd * 11 * (1 + 0.2 * save.up.eng)).add(new THREE.Vector3(0, input.vert * 7, 0));
  S.vel.addScaledVector(acc, dt).multiplyScalar(Math.exp(-dt * 1.5));
  if (S.vel.length() > 9) S.vel.setLength(9);
  S.pos.addScaledVector(S.vel, dt);
  // 碰撞：海底、海面、邊界、大石頭
  const fy = floorY(S.pos.x, S.pos.z) + 1.4;
  if (S.pos.y < fy) { S.pos.y = fy; if (S.vel.y < 0) S.vel.y = 0; }
  if (S.pos.y > -1.0) { S.pos.y = -1.0; if (S.vel.y > 0) S.vel.y = 0; }
  const lim = HALF - 32;
  S.pos.x = Math.max(-lim, Math.min(lim, S.pos.x)); S.pos.z = Math.max(-lim, Math.min(lim, S.pos.z));
  for (const s of W.solid) { const d = S.pos.clone().sub(s.p); const L = d.length(), r = s.r + 1.2; if (L < r) S.pos.addScaledVector(d.normalize(), r - L); }
  // 潛艇外觀：船頭轉向前進方向、上下時抬頭低頭
  const hv = Math.hypot(S.vel.x, S.vel.z);
  const want = input.fwd < 0 ? S.camYaw : hv > 0.6 ? Math.atan2(S.vel.x, S.vel.z) : S.yaw;
  let dy = ((want - S.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  S.yaw += dy * Math.min(1, dt * 3);
  sub.position.copy(S.pos);
  sub.rotation.set(0, 0, 0); sub.rotateY(S.yaw); sub.rotateX(-Math.max(-0.5, Math.min(0.5, S.vel.y * 0.08))); sub.rotateZ(-dy * 0.4);
  sub.position.y += Math.sin(S.t * 1.3) * 0.06;
  sub.userData.prop.rotation.z += dt * (3 + S.vel.length() * 4);
  sub.userData.strobe.value = (S.t % 1.6) < 0.08 ? 4 : 0.3;   // 頂上的閃燈
  // 鏡頭
  const cp = Math.cos(S.camPitch), d = S.camDist;
  camera.position.set(S.pos.x - Math.sin(S.camYaw) * cp * d, S.pos.y + Math.sin(S.camPitch) * d + 1.2, S.pos.z - Math.cos(S.camYaw) * cp * d);
  const cf = floorY(camera.position.x, camera.position.z) + 2.2;   // 高一點，比較不會鑽進珊瑚裡
  if (camera.position.y < cf) camera.position.y = cf;
  if (camera.position.y > -0.4) camera.position.y = -0.4;
  camera.lookAt(lookAt.copy(S.pos).add(new THREE.Vector3(0, 0.8, 0)));
  if (S.peek) { camera.position.copy(S.peek[0]); camera.lookAt(S.peek[1]); }   // 測試用：指定鏡頭位置看近照

  // 深度 → 霧、光、顏色
  const depth = -camera.position.y;
  camDepthU.value = Math.max(0, depth);
  const k1 = Math.min(1, depth / 38), k2 = Math.min(1, Math.max(0, (depth - 32) / 45));
  fogCol.copy(SHALLOW).lerp(MID, k1).lerp(DEEP, k2);
  W.fogU.value.copy(fogCol);   // 背景球用同一個顏色
  scene.fog.density = 0.017 + depth * 0.00011;
  hemi.intensity = 1.15 * Math.exp(-depth / 32) + 0.025;
  sun.intensity = 1.7 * Math.exp(-depth / 24);
  sun.position.set(camera.position.x + 20, 60, camera.position.z - 10); sun.target.position.set(camera.position.x, -40, camera.position.z);
  renderer.toneMappingExposure = 1.0 + Math.min(0.25, depth / 200);
  spot.visible = S.light; fill.intensity = S.light ? 3 : 0.4;
  sub.userData.lampOn.value = S.light ? 1 : 0;
  // 讓海雪知道燈在哪裡、往哪裡照（回散射）
  W.lampK.value = S.light ? 1 : 0;
  sub.updateMatrixWorld(); W.lampPos.value.set(0, -0.4, 1.4).applyMatrix4(sub.matrixWorld);
  W.lampDir.value.set(0, -0.14, 1).normalize().transformDirection(sub.matrixWorld);

  W.update(camera, depth);
  cone.visible = S.light; updateBubbles(dt); updateMission(); updateZone(); updateSonar(dt);
  save.maxDepth = Math.max(save.maxDepth || 0, Math.round(-S.pos.y));
  fish.update(renderer, S.t, dt, S.pos);
  for (const c of creatures) c.update(S.t, dt);
  checkDiscover(); checkTrash();
  sound.update(S.vel.length(), -S.pos.y);

  // HUD
  const sd = Math.round(-S.pos.y);
  $('depth').textContent = sd;
  const k = Math.min(1, sd / 115);
  $('depthMark').style.top = `calc(${k * 100}% - 2px)`; $('depthLbl').style.top = (k * 100) + '%'; $('depthLbl').textContent = sd + ' m';
}

function render() {
  if (OFF) { OFF.setSize(Math.round(innerWidth * renderer.getPixelRatio()), Math.round(innerHeight * renderer.getPixelRatio())); renderer.setRenderTarget(OFF); }
  pipeline.render();
  if (OFF) renderer.setRenderTarget(null);
}

let last = performance.now();
function frame() {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); render();
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });

// ---------------------------------------------------------------- 開始
step(0.7, '準備光影…');
toggleLight(S.light);
renderCodex();
update(0.016);
try { await renderer.compileAsync(scene, camera); } catch { }
step(1, WEBGPU ? '完成（WebGPU）' : '完成（相容模式，效果比較簡單）');
function begin() {
  $('loading').style.opacity = 0; setTimeout(() => $('loading').classList.add('hidden'), 600);
  sound.start(); last = performance.now();
  if (!params.has('paused')) renderer.setAnimationLoop(frame);
  if (!save.found.length) setTimeout(() => showToast({ emoji: '🚤', title: '出發囉！', fact: '靠近海底生物就會記進圖鑑。前面是珊瑚礁，越往前越深，深海很暗要開探照燈。順便把海底的垃圾撿起來！' }), 800);
}
if (params.has('paused')) begin();
else { $('startBtn').classList.remove('hidden'); $('startBtn').onclick = begin; }

// 自動測試用
window.__deep = {
  S, W, fish, creatures, renderer, scene, camera, WEBGPU, HIGH, save, sub, bubMesh, cone,
  set(x, y, z, yaw = 0, pitch = 0.2) { S.pos.set(x, y, z); S.camYaw = S.yaw = yaw; S.camPitch = pitch; S.vel.set(0, 0, 0); },
  light: toggleLight,
  // 測試：鏡頭放在 (x,y,z) 看著 (tx,ty,tz)；obj 是某個物件時看著它（距離 d、方位 a）
  peek(o, d = 2, a = 0, h = 0) { if (!o) { S.peek = null; return; } const p = o.isObject3D ? o.getWorldPosition(new THREE.Vector3()) : o; S.peek = [p.clone().add(new THREE.Vector3(Math.sin(a) * d, h, Math.cos(a) * d)), p.clone()]; },
  // 測試：把潛艇放在某隻動物旁邊、面向牠
  look(id, dist = 7, side = 1.2) {
    const c = creatures.find((x) => x.id === id); const o = c.obj.position;
    const x = o.x + Math.sin(side) * dist, z = o.z + Math.cos(side) * dist;
    this.set(x, o.y + 0.5, z, Math.atan2(o.x - x, o.z - z), 0.05); S.camDist = 3;
  },
  sim(sec) { for (let i = 0; i < sec * 30; i++) update(1 / 30); },
  async snap(sec = 0) {
    renderer.setAnimationLoop(null);
    await renderer.backend.device?.queue.onSubmittedWorkDone?.();
    if (sec) this.sim(sec); else update(1 / 30);
    const rt = OFF || new THREE.RenderTarget(Math.round(innerWidth), Math.round(innerHeight));
    if (!OFF) { renderer.setRenderTarget(rt); pipeline.render(); renderer.setRenderTarget(null); } else render();
    const w = rt.width, h = rt.height, px = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const arr = px instanceof Uint8Array || px instanceof Uint8ClampedArray ? new Uint8ClampedArray(px.buffer, px.byteOffset, w * h * 4) : toBytes(px, w * h * 4);
    const x = c.getContext('2d'); x.putImageData(new ImageData(arr, w, h), 0, 0);
    if (!WEBGPU) { x.save(); x.scale(1, -1); x.drawImage(c, 0, -h); x.restore(); }
    if (!params.has('paused')) renderer.setAnimationLoop(frame);
    return c.toDataURL('image/jpeg', 0.85);
  },
};
// 半精度讀回來的轉成 0–255（粗略的 sRGB）
function toBytes(px, n) {
  const out = new Uint8ClampedArray(n), f = new DataView(px.buffer, px.byteOffset, px.byteLength);
  const half = (h) => { const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 31, m = h & 1023; return e === 0 ? s * 6.1e-5 * (m / 1024) : e === 31 ? 65504 : s * Math.pow(2, e - 15) * (1 + m / 1024); };
  for (let i = 0; i < n; i++) { const v = px.BYTES_PER_ELEMENT === 2 ? half(f.getUint16(i * 2, true)) : px[i]; out[i] = i % 4 === 3 ? 255 : Math.pow(Math.max(0, v), 1 / 2.2) * 255; }
  return out;
}
window.__ready = true;
void mix; void sin; void time;
