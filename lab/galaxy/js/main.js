// 銀河建造師：渲染、兩種模式（星系沙盒／軌道任務）、操作、介面
import * as THREE from 'three';
import { pass, uniform } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { afterImage } from 'three/addons/tsl/display/AfterImageNode.js';
import { Stars } from './stars.js';
import { Orbits } from './orbits.js';
import { PRESETS, MISSIONS, INFO, INFO_ORDER } from './data.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const step = (k, m) => { $('loadBar').style.width = Math.round(k * 100) + '%'; if (m) $('loadMsg').textContent = m; };

const SAVE_KEY = 'mwLabGalaxy.v1';
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
save.stars = save.stars || {};
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { } };

// ---------------------------------------------------------------- 渲染器
const canvas = $('view');
const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, powerPreference: 'high-performance', forceWebGL: params.has('gl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
step(0.1, '啟動顯示卡…');
await renderer.init();
const WEBGPU = !!renderer.backend.isWebGPUBackend;
const HIGH = (params.get('q') || (WEBGPU && !isTouch ? 'high' : 'low')) === 'high';
const N = +(params.get('n') || (WEBGPU ? (HIGH ? 240000 : 90000) : 24000));
$('engine').textContent = (WEBGPU ? 'WebGPU · ' : '相容模式 · ') + Math.round(N / 10000) + ' 萬顆星';

const scene = new THREE.Scene();
scene.background = starfield();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 4000);

step(0.3, '準備星星…');
const stars = new Stars(scene, renderer, N);
const orbits = new Orbits(scene);

// ---------------------------------------------------------------- 後製：泛光＋（可選）拖尾
const pipeline = new THREE.RenderPipeline(renderer);
const scenePass = pass(scene, camera);
const trailK = uniform(0.86);
let trailsOn = save.trails ?? false;
function buildPipe() {
  const col = scenePass.getTextureNode();
  let out = col.add(bloom(col, HIGH ? 0.6 : 0.5, 0.4, 0.62));
  if (trailsOn && mode === 'galaxy') out = afterImage(out, trailK);
  pipeline.outputNode = out; pipeline.needsUpdate = true;
}
const OFF = params.has('offscreen') ? new THREE.RenderTarget(1, 1) : null;

// ---------------------------------------------------------------- 狀態
let mode = 'galaxy', tool = 'look', speed = save.speed || 1, paused = false;
const cam = { yaw: 0.6, pitch: 0.85, dist: 160, target: new THREE.Vector3(), tgtSmooth: new THREE.Vector3(), idle: 0 };
let mission = null, tries = 0, missionIdx = 0;

// ---------------------------------------------------------------- 工具列
function dockGalaxy() {
  const d = $('dock'); d.innerHTML = '';
  const add = (html, title, on, fn, cls = 'db') => { const b = document.createElement('button'); b.className = cls + (on ? ' on' : ''); b.innerHTML = html; b.title = title; b.onclick = fn; d.appendChild(b); return b; };
  const sep = () => { const s = document.createElement('span'); s.className = 'sep'; d.appendChild(s); };
  PRESETS.forEach((p) => add(`<b>${p.icon}</b>${p.name.length > 5 ? p.name.slice(0, 5) : p.name}`, p.name, false, () => runPreset(p)));
  sep();
  for (const [id, ic, nm] of [['look', '👆', '轉視角'], ['galaxy', '🌀', '放星系'], ['hole', '🕳️', '放黑洞']]) add(`<b>${ic}</b>${nm}`, nm, tool === id, () => { tool = id; dockGalaxy(); if (id !== 'look') toast(isTouch ? '在畫面上按住、拖一下決定方向和速度' : '在畫面上按住、拖一下決定方向和速度（右鍵拖曳轉視角）'); });
  sep();
  for (const s of [0.5, 1, 2, 4]) add(`<b>${s === 0.5 ? '½' : s}×</b>速度`, '時間速度', speed === s, () => { speed = s; save.speed = s; persist(); dockGalaxy(); });
  add(`<b>✨</b>拖尾`, '星星拖尾', trailsOn, () => { trailsOn = !trailsOn; save.trails = trailsOn; persist(); buildPipe(); dockGalaxy(); });
  add(`<b>${paused ? '▶️' : '⏸'}</b>${paused ? '繼續' : '暫停'}`, '暫停', false, () => { paused = !paused; dockGalaxy(); });
  add(`<b>🗑️</b>清空`, '清空', false, () => { stars.clear(); toast('清空了，用 🌀 放一個星系吧！'); });
}
function dockOrbit() {
  const d = $('dock'); d.innerHTML = '';
  for (const s of [1, 2, 4]) {
    const b = document.createElement('button'); b.className = 'db' + (speed === s ? ' on' : ''); b.innerHTML = `<b>${s}×</b>速度`;
    b.onclick = () => { speed = s; save.speed = s; persist(); dockOrbit(); }; d.appendChild(b);
  }
}

let tipT;
function tip(t, ms = 9000) { const el = $('tip'); el.textContent = t; el.classList.remove('hidden'); el.style.opacity = 1; clearTimeout(tipT); tipT = setTimeout(() => { el.style.opacity = 0; }, ms); }
let toastT;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }

// ---------------------------------------------------------------- 模式
function setMode(m) {
  mode = m;
  for (const b of $('modeSeg').children) b.classList.toggle('on', b.dataset.v === m);
  stars.mesh.visible = stars.group.visible = m === 'galaxy';
  orbits.group.visible = m === 'orbit';
  $('mhud').classList.toggle('hidden', m !== 'orbit');
  $('tip').classList.toggle('hidden', m !== 'galaxy');
  buildPipe();
  if (m === 'galaxy') dockGalaxy(); else dockOrbit();
}
$('modeSeg').onclick = (e) => {
  const v = e.target.dataset && e.target.dataset.v; if (!v) return;
  if (v === 'orbit') showMissions(); else { closeAll(); setMode('galaxy'); }
};
function runPreset(p) {
  stars.clear(); p.run(stars);
  cam.dist = p.cam.dist; cam.pitch = p.cam.pitch; cam.target.set(0, 0, 0); cam.tgtSmooth.set(0, 0, 0);
  tip(`${p.icon} ${p.name}：${p.tip}`);
}

// ---------------------------------------------------------------- 任務
function showMissions() {
  const L = $('missionList'); L.innerHTML = '';
  MISSIONS.forEach((m, i) => {
    const s = save.stars[m.id] || 0, b = document.createElement('button'); b.className = 'card';
    b.innerHTML = `<div class="h"><span>${m.icon}</span>${i + 1}. ${m.name}</div><p>${m.goal}</p><div class="st">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</div>`;
    b.onclick = () => startMission(i); L.appendChild(b);
  });
  $('missionPick').classList.remove('hidden');
}
function startMission(i) {
  closeAll(); missionIdx = i; mission = MISSIONS[i]; tries = 0;
  setMode('orbit'); orbits.load(mission);
  $('mTitle').textContent = `${mission.icon} 任務 ${i + 1}：${mission.name}`; $('mGoal').textContent = mission.goal;
  updMHud();
}
function updMHud() {
  $('mTries').textContent = `發射了 ${tries} 次`;
  $('mTime').textContent = mission && mission.time && orbits.phase === 'fly' ? `${Math.max(0, Math.ceil(mission.time - orbits.t))} 秒` : '';
}
$('mHint').onclick = () => toast(mission.hint);
$('mReset').onclick = () => { orbits.reset(); updMHud(); };
$('mList').onclick = showMissions;
$('rRetry').onclick = () => { closeAll(); orbits.reset(); updMHud(); };
$('rList').onclick = () => { closeAll(); showMissions(); };
$('rNext').onclick = () => startMission(Math.min(MISSIONS.length - 1, missionIdx + 1));
function finish(res) {
  const ok = !!res.win;
  $('rTitle').textContent = ok ? '任務成功！🎉' : '再試一次！';
  let s = 0;
  if (ok) { s = tries <= 1 ? 3 : tries <= 3 ? 2 : 1; save.stars[mission.id] = Math.max(save.stars[mission.id] || 0, s); persist(); }
  $('rStars').textContent = ok ? '★'.repeat(s) + '☆'.repeat(3 - s) : '';
  $('rText').textContent = (ok ? res.win : res.lose) + (ok ? `（發射 ${tries} 次）` : '');
  const inf = INFO[mission.info];
  $('rInfo').innerHTML = `<div class="h"><span>${inf.e}</span>${inf.t}</div><p>${inf.d}</p>`;
  $('rInfo').classList.toggle('hidden', !ok);
  $('rNext').classList.toggle('hidden', !ok || missionIdx >= MISSIONS.length - 1);
  setTimeout(() => $('result').classList.remove('hidden'), ok ? 700 : 500);
}
function closeAll() { for (const id of ['missionPick', 'result', 'info']) $(id).classList.add('hidden'); }
document.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => { closeAll(); if (b.closest('#missionPick') && mode !== 'orbit') setMode('galaxy'); }; });
$('infoBtn').onclick = () => {
  $('infoList').innerHTML = INFO_ORDER.map((k) => { const x = INFO[k]; return `<div class="card"><div class="h"><span>${x.e}</span>${x.t}</div><p>${x.d}</p></div>`; }).join('');
  $('info').classList.remove('hidden');
};

// ---------------------------------------------------------------- 指標：轉視角、放東西、拉彈弓
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2();
const ptrs = new Map();
let drag = null;
const arrow = (() => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const l = new THREE.Line(g, new THREE.LineBasicNodeMaterial({ color: 0xffd447 })); l.visible = false; l.frustumCulled = false; scene.add(l); return l;
})();
function planeAt(e) {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(plane, new THREE.Vector3());
}
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  cam.idle = 0;
  if (ptrs.size === 2) { drag = { kind: 'pinch', d0: pinchD(), dist0: cam.dist }; arrow.visible = false; return; }
  const p = planeAt(e);
  if (mode === 'orbit') {
    if (orbits.phase === 'aim' && p && p.distanceTo(orbits.p) < (isTouch ? 9 : 6)) { drag = { kind: 'sling' }; return; }
    drag = null; return;
  }
  if ((tool === 'galaxy' || tool === 'hole') && e.button === 0 && p) { drag = { kind: 'place', p0: p, p1: p.clone() }; return; }
  drag = { kind: 'look', x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointermove', (e) => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!drag) return;
  if (drag.kind === 'pinch') { if (ptrs.size === 2) cam.dist = clampDist(drag.dist0 * drag.d0 / Math.max(10, pinchD())); return; }
  if (drag.kind === 'look') {
    cam.yaw -= (e.clientX - drag.x) * 0.005; cam.pitch = Math.min(1.5, Math.max(0.05, cam.pitch + (e.clientY - drag.y) * 0.004));
    drag.x = e.clientX; drag.y = e.clientY; return;
  }
  const p = planeAt(e); if (!p) return;
  if (drag.kind === 'place') {
    drag.p1 = p; const a = arrow.geometry.attributes.position;
    a.setXYZ(0, drag.p0.x, 0.2, drag.p0.z); a.setXYZ(1, p.x, 0.2, p.z); a.needsUpdate = true; arrow.visible = true;
  }
  if (drag.kind === 'sling') {
    const sp = orbits.aim(p.clone().sub(orbits.p).setY(0));
    const L = $('speedLbl'); L.classList.remove('hidden'); L.style.left = (e.clientX + 16) + 'px'; L.style.top = (e.clientY - 28) + 'px';
    L.textContent = `速度 ${sp.toFixed(1)}${sp >= mission.player.max - 0.01 ? '（最大）' : ''}`;
  }
});
const endPtr = (e) => {
  ptrs.delete(e.pointerId);
  if (!drag) return;
  if (drag.kind === 'place') {
    arrow.visible = false;
    const v = drag.p1.clone().sub(drag.p0).multiplyScalar(0.08); if (v.length() > 7) v.setLength(7);
    const p0 = drag.p0.clone();
    if (tool === 'galaxy') {
      const n = new THREE.Vector3((Math.random() - 0.5) * 0.9, 1, (Math.random() - 0.5) * 0.9).normalize();
      stars.addGalaxy({ pos: p0, vel: v, normal: n, mass: 1600, radius: 28, slots: 1, arms: 2 + (Math.random() < 0.3 ? 1 : 0) });
      toast('🌀 放了一個星系');
    } else { stars.addBlackHole({ pos: p0, vel: v, mass: 1200 }); toast('🕳️ 放了一個黑洞'); }
  }
  if (drag.kind === 'sling') {
    $('speedLbl').classList.add('hidden');
    if (orbits.launch()) { tries++; updMHud(); }
  }
  drag = null;
};
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => { if (mode === 'galaxy') cam.dist = clampDist(cam.dist * Math.exp(e.deltaY * 0.001)); }, { passive: true });
const pinchD = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
const clampDist = (d) => Math.min(700, Math.max(30, d));
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); paused = !paused; if (mode === 'galaxy') dockGalaxy(); }
  if (mode === 'galaxy' && /^Digit[1-5]$/.test(e.code)) runPreset(PRESETS[+e.code.slice(5) - 1]);
  if (mode === 'orbit' && e.code === 'KeyR') { orbits.reset(); updMHud(); }
});

// ---------------------------------------------------------------- 鏡頭
const VIEW = { orbit: [0, 0, 95], moon: [0, 0, 100], comet: [-22, 18, 170], assist: [8, 0, 160], binary: [0, 0, 120] };
function updateCamera(dt) {
  if (mode === 'galaxy') {
    // 跟著重天體的質心（慢慢移過去），沒人操作時慢慢自轉
    const bs = stars.bodies;
    if (bs.length) {
      const c = new THREE.Vector3(); let m = 0;
      for (const b of bs) if (b.pos.length() < 400) { c.addScaledVector(b.pos, b.m); m += b.m; }
      if (m) cam.target.copy(c.divideScalar(m));
    }
    cam.tgtSmooth.lerp(cam.target, Math.min(1, dt * 0.8));
    cam.idle += dt; if (cam.idle > 6 && !paused) cam.yaw += dt * 0.03;
    const cp = Math.cos(cam.pitch);
    camera.position.set(cam.tgtSmooth.x + Math.sin(cam.yaw) * cp * cam.dist, cam.tgtSmooth.y + Math.sin(cam.pitch) * cam.dist, cam.tgtSmooth.z + Math.cos(cam.yaw) * cp * cam.dist);
    camera.up.set(0, 1, 0); camera.lookAt(cam.tgtSmooth);
  } else {
    const [cx, cz, H0] = VIEW[mission.id];
    const H = H0 * Math.max(1, 1.25 / camera.aspect);
    camera.position.set(cx, H, cz); camera.up.set(0, 0, -1); camera.lookAt(cx, 0, cz);
  }
}

// ---------------------------------------------------------------- 主迴圈
let last = performance.now();
function update(dt) {
  if (mode === 'galaxy') { if (!paused) stars.step(dt * 2 * speed, speed >= 2 ? 3 : 2); }
  else if (mission) {
    if (!paused) {
      const res = orbits.update(dt * 3 * speed);
      if (res) finish(res);
    }
    updMHud();
  }
  updateCamera(dt);
}
function render() {
  if (OFF) { OFF.setSize(Math.round(innerWidth * renderer.getPixelRatio()), Math.round(innerHeight * renderer.getPixelRatio())); renderer.setRenderTarget(OFF); }
  pipeline.render();
  if (OFF) renderer.setRenderTarget(null);
}
function frame() { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); }
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });

step(0.7, '捏一個星系…');
setMode('galaxy');
runPreset(PRESETS[0]);
update(0.016);
try { await renderer.compileAsync(scene, camera); } catch { }
step(1, '完成');
$('loading').style.opacity = 0; setTimeout(() => $('loading').classList.add('hidden'), 600);
if (!params.has('paused')) renderer.setAnimationLoop(frame);
tip(`${PRESETS[0].icon} ${PRESETS[0].name}：${PRESETS[0].tip} 下面的按鈕可以換場景，或用 🌀 自己放星系。`, 12000);

// 背景：程式畫的星空（等距長方投影貼圖）
function starfield() {
  const W = 2048, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#04030b'; x.fillRect(0, 0, W, H);
  // 淡淡的銀河帶
  const g = x.createLinearGradient(0, H * 0.35, 0, H * 0.65);
  g.addColorStop(0, 'rgba(60,40,110,0)'); g.addColorStop(0.5, 'rgba(70,55,120,0.22)'); g.addColorStop(1, 'rgba(60,40,110,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    const cx = Math.random() * W, cy = H * (0.3 + Math.random() * 0.4), r = 80 + Math.random() * 220;
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    const hue = [270, 220, 320, 200][i % 4];
    rg.addColorStop(0, `hsla(${hue},60%,45%,0.12)`); rg.addColorStop(1, `hsla(${hue},60%,30%,0)`);
    x.fillStyle = rg; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  for (let i = 0; i < 7000; i++) {
    const s = Math.random() ** 4 * 1.1 + 0.25, a = 0.25 + Math.random() * 0.6;
    x.fillStyle = `rgba(${220 + Math.random() * 35},${215 + Math.random() * 40},255,${a})`;
    x.beginPath(); x.arc(Math.random() * W, Math.random() * H, s, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 自動測試用
window.__gal = {
  stars, orbits, renderer, cam, WEBGPU, HIGH, N, MISSIONS, PRESETS,
  get mode() { return mode; }, runPreset: (i) => runPreset(PRESETS[i]), startMission, setMode,
  sim(sec) { for (let i = 0; i < sec * 30; i++) update(1 / 30); },
  async snap(sec = 0) {
    renderer.setAnimationLoop(null);
    await renderer.backend.device?.queue.onSubmittedWorkDone?.();
    if (sec) this.sim(sec); else update(1 / 30);
    const rt = OFF || new THREE.RenderTarget(Math.round(innerWidth), Math.round(innerHeight));
    if (!OFF) { renderer.setRenderTarget(rt); pipeline.render(); renderer.setRenderTarget(null); } else render();
    const w = rt.width, h = rt.height, px = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const xx = c.getContext('2d'); xx.putImageData(new ImageData(new Uint8ClampedArray(px.buffer, px.byteOffset, w * h * 4), w, h), 0, 0);
    if (!WEBGPU) { xx.save(); xx.scale(1, -1); xx.drawImage(c, 0, -h); xx.restore(); }
    if (!params.has('paused')) renderer.setAnimationLoop(frame);
    return c.toDataURL('image/jpeg', 0.85);
  },
  // 任務測試：用某個速度發射，跑到結束
  tryLaunch(vx, vz, maxSec = 80) {
    orbits.reset(); const v = new THREE.Vector3(vx, 0, vz); orbits.aim(v.clone().multiplyScalar(-1 / 0.32)); orbits.launch(); tries++;
    let res = null; for (let i = 0; i < maxSec * 30 && !res; i++) res = orbits.update(1 / 30 * 3);
    return { res, info: orbits.info() };
  },
};
window.__ready = true;
