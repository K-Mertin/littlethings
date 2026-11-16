// 夜雨賽車：渲染（濕路反射＋泛光）、比賽流程、操作、鏡頭、介面
import * as THREE from 'three';
import { pass, mrt, output, normalView, emissive, uniform, vec2, metalness, roughness } from 'three/tsl';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { Track } from './track.js';
import { Car, carMesh, collideCars, CAR_COLORS } from './car.js';
import { FX } from './fx.js';
import { Sound } from './audio.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const step = (k, m) => { $('loadBar').style.width = Math.round(k * 100) + '%'; if (m) $('loadMsg').textContent = m; };
const SAVE_KEY = 'mwLabNight.v1';
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
save.opts = Object.assign({ mode: 'race', laps: 3, diff: 1, rain: 1, color: 0 }, save.opts || {});
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { } };

// ---------------------------------------------------------------- 渲染器
const canvas = $('view');
const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, powerPreference: 'high-performance', forceWebGL: params.has('gl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.4 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
step(0.1, '啟動顯示卡…');
await renderer.init();
const WEBGPU = !!renderer.backend.isWebGPUBackend;
const HIGH = (params.get('q') || (WEBGPU && !isTouch ? 'high' : 'low')) === 'high';
renderer.shadowMap.enabled = HIGH;

const scene = new THREE.Scene();
scene.background = skyTex();
scene.fog = new THREE.FogExp2(0x1a1028, 0.008);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.2, 1200);
const hemi = new THREE.HemisphereLight(0x6a5aa8, 0x120c18, 0.35); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9fb4ff, 0.25); moon.position.set(-80, 120, 40); scene.add(moon);

step(0.25, '鋪路…');
const track = new Track();
track.build(scene, { high: HIGH });
// 路燈：只有離玩家最近的幾盞是真的燈
const LAMPS = HIGH ? 10 : 6;
const lampLights = Array.from({ length: LAMPS }, () => { const l = new THREE.PointLight(0xffd9a0, 70, 30, 1.5); scene.add(l); return l; });

step(0.45, '準備雨和水花…');
const NCARS = 6;
const fx = new FX(scene, renderer, { high: HIGH, webgpu: WEBGPU, cars: NCARS });

// ---------------------------------------------------------------- 後製：濕路反射（SSR）＋泛光
const pipeline = new THREE.RenderPipeline(renderer);
const USE_SSR = HIGH && WEBGPU;
{
  const sp = pass(scene, camera, { samples: HIGH ? 4 : 0 });
  const outs = { output, normal: normalView, emissive };
  if (USE_SSR) outs.metalrough = vec2(metalness, roughness);
  sp.setMRT(mrt(outs));
  const color = sp.getTextureNode('output');
  let lit = color;
  if (USE_SSR) {
    const mr = sp.getTextureNode('metalrough');
    const r = ssr(color, sp.getTextureNode('depth'), sp.getTextureNode('normal'), { metalnessNode: mr.r, roughnessNode: mr.g });
    r.resolutionScale = 0.5; r.maxDistance.value = 60; r.thickness.value = 0.15;
    lit = lit.add(r.rgb.mul(0.9));
  }
  const glow = bloom(sp.getTextureNode('emissive'), 0.75, 0.4, 0.1);
  pipeline.outputNode = lit.add(glow);
}
const OFF = params.has('offscreen') ? new THREE.RenderTarget(1, 1) : null;
const sound = new Sound(); if (save.soundOff) sound.setOn(false);

// ---------------------------------------------------------------- 比賽
let cars = [], player = null, phase = 'menu', raceT = 0, countT = 0, opts = { ...save.opts }, camMode = 0, finishOrder = [], bestThisRace = Infinity;
const DIFF = [{ top: 0.8, grip: 12.5 }, { top: 0.88, grip: 14.5 }, { top: 0.95, grip: 16.5 }];
function startRace(o = opts) {
  opts = { ...o }; save.opts = opts; persist();
  for (const c of cars) scene.remove(c.mesh);
  cars = []; finishOrder = []; bestThisRace = Infinity;
  const n = track.n, rivals = opts.mode === 'race' ? NCARS - 1 : 0;
  const slot = (k) => ({ idx: (n - 6 - Math.floor(k / 2) * 6) % n, lane: k % 2 ? -3.2 : 3.2 });
  // 玩家排最後面（起跑後追上去比較好玩）
  const total = rivals + 1;
  for (let k = 0; k < total; k++) {
    const isP = k === total - 1, s = slot(k);
    const col = isP ? CAR_COLORS[opts.color] : CAR_COLORS[(opts.color + 1 + k) % CAR_COLORS.length];
    const d = DIFF[opts.diff];
    const car = new Car(track, carMesh(col, { lights: isP }), isP ? {} : { ai: { top: d.top * (0.97 + Math.random() * 0.05), grip: d.grip * (0.96 + Math.random() * 0.06) }, startIdx: s.idx, lane: s.lane });
    if (isP) { const p = track.ahead(s.idx, 0, s.lane); car.pos.set(p.x, 0, p.z); car.idx = s.idx; car.place(); }
    car.isPlayer = isP; car.name = isP ? '你' : ['小紅', '阿藍', '綠綠', '橘子', '紫晶'][k % 5];
    car.onLap = onLap;
    // 一開始在起跑線後面：還沒過線
    car.lap = 0; car.halfway = true; car.prevS = track.S[car.idx];
    if (isP && car.mesh.userData.spot) { car.mesh.userData.spot.castShadow = HIGH; if (HIGH) { car.mesh.userData.spot.shadow.mapSize.set(1024, 1024); car.mesh.userData.spot.shadow.camera.far = 70; } }
    scene.add(car.mesh); cars.push(car);
  }
  player = cars[cars.length - 1];
  for (const c of cars) c.lap = -1;   // 第一次過起跑線算「開始第 1 圈」
  track.wet.value = Math.max(0.55, opts.rain);
  scene.fog.density = 0.006 + opts.rain * 0.007;
  phase = 'count'; countT = 3; raceT = 0;
  closeAll(); $('count').textContent = '3'; sound.start(); sound.beep(false);
}
function onLap(car) {
  if (car.lap === 0) { car.lapStart = raceT; car.lapTimes = []; return; }   // 剛起跑過線
  const lt = car.lapTimes[car.lapTimes.length - 1];
  if (car.isPlayer) {
    if (lt < bestThisRace) bestThisRace = lt;
    if (!save.best || lt < save.best) { save.best = lt; persist(); if (car.lap >= 1) flash(`🏆 最快一圈 ${fmt(lt)}！`); }
    else flash(`第 ${car.lap} 圈 ${fmt(lt)}`);
    if (car.lap === opts.laps - 1) setTimeout(() => flash('🔔 最後一圈！'), 1300);
  }
  if (car.lap >= opts.laps && !car.finished) {
    car.finished = true; car.finishT = raceT; finishOrder.push(car);
    if (car.ai) { car.input.gas = 0.4; }
    if (car.isPlayer) { phase = 'done'; setTimeout(showResult, 2200); sound.fanfare(); }
  }
}
function showResult() {
  // 還沒跑完的電腦：用剩下的距離估計
  const rest = cars.filter((c) => !c.finished).map((c) => {
    const left = opts.laps * track.length - c.progress, v = Math.max(20, Math.abs(c.speed) * 0.9 + 10);
    return { c, t: raceT + left / v };
  }).sort((a, b) => a.t - b.t);
  const rows = finishOrder.map((c) => ({ c, t: c.finishT })).concat(rest);
  const me = rows.findIndex((r) => r.c.isPlayer) + 1;
  $('rTitle').textContent = opts.mode === 'tt' ? '計時賽完成！' : me === 1 ? '🏆 冠軍！' : `第 ${me} 名`;
  $('rText').textContent = `總時間 ${fmt(player.finishT)} · 這場最快一圈 ${fmt(bestThisRace)} · 歷史最快 ${fmt(save.best)}`;
  $('rTable').innerHTML = rows.map((r, i) => `<tr class="${r.c.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td>${r.c.name}</td><td style="text-align:right">${fmt(r.t)}</td></tr>`).join('');
  $('result').classList.remove('hidden');
}
const fmt = (t) => (t == null || !isFinite(t)) ? '—' : `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
let flashT;
function flash(t) { const el = $('msg'); el.textContent = t; el.classList.add('show'); clearTimeout(flashT); flashT = setTimeout(() => el.classList.remove('show'), 2000); }

// ---------------------------------------------------------------- 選單
function segInit(id, key, cast = (v) => v) {
  const el = $(id);
  const paint = () => { for (const b of el.children) b.classList.toggle('on', String(opts[key]) === b.dataset.v); };
  el.onclick = (e) => { const v = e.target.dataset && e.target.dataset.v; if (v == null) return; opts[key] = cast(v); paint(); };
  paint();
}
segInit('oMode', 'mode'); segInit('oLaps', 'laps', Number); segInit('oDiff', 'diff', Number); segInit('oRain', 'rain', Number);
$('oColor').innerHTML = CAR_COLORS.map((c, i) => `<button data-i="${i}" style="background:#${c.toString(16).padStart(6, '0')}"></button>`).join('');
const paintCol = () => [...$('oColor').children].forEach((b, i) => b.classList.toggle('on', i === opts.color));
$('oColor').onclick = (e) => { const i = e.target.dataset && e.target.dataset.i; if (i == null) return; opts.color = +i; paintCol(); };
paintCol();
function showMenu() {
  $('best').textContent = fmt(save.best);
  $('resume').classList.toggle('hidden', !(phase === 'race' || phase === 'count'));
  $('menu').classList.remove('hidden');
  if (phase === 'race' || phase === 'count') { pausedPhase = phase; phase = 'paused'; }
}
let pausedPhase = null;
function closeAll() { $('menu').classList.add('hidden'); $('result').classList.add('hidden'); }
$('go').onclick = () => startRace(opts);
$('resume').onclick = () => { closeAll(); if (phase === 'paused') phase = pausedPhase; };
$('menuBtn').onclick = showMenu;
$('rMenu').onclick = () => { closeAll(); showMenu(); };
$('rAgain').onclick = () => startRace(opts);
$('soundBtn').onclick = () => { sound.start(); sound.setOn(!sound.on); save.soundOff = !sound.on; persist(); $('soundBtn').textContent = sound.on ? '🔊' : '🔇'; };
$('soundBtn').textContent = sound.on ? '🔊' : '🔇';

// ---------------------------------------------------------------- 操作
const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code); sound.start();
  if (e.code === 'Escape' || e.code === 'KeyP') { if ($('menu').classList.contains('hidden')) showMenu(); else $('resume').click(); }
  if (e.code === 'KeyR' && player) resetCar(player);
  if (e.code === 'KeyC') camMode = (camMode + 1) % 2;
  if (e.code === 'Enter' && !$('menu').classList.contains('hidden')) startRace(opts);
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const touch = { L: false, R: false, G: false, B: false, H: false };
if (isTouch) {
  $('touch').classList.remove('hidden'); document.body.classList.add('touch');
  for (const [id, k] of [['tL', 'L'], ['tR', 'R'], ['tG', 'G'], ['tB', 'B'], ['tH', 'H']]) {
    const b = $(id);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); sound.start(); touch[k] = true; b.classList.add('on'); b.setPointerCapture(e.pointerId); });
    const off = () => { touch[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
  }
}
function readInput() {
  const k = (c) => keys.has(c);
  const inp = player.input;
  inp.gas = (k('ArrowUp') || k('KeyW') || touch.G) ? 1 : 0;
  inp.brake = (k('ArrowDown') || k('KeyS') || touch.B) ? 1 : 0;
  inp.steer = ((k('ArrowRight') || k('KeyD') || touch.R) ? 1 : 0) - ((k('ArrowLeft') || k('KeyA') || touch.L) ? 1 : 0);
  inp.hand = (k('Space') || k('ShiftLeft') || touch.H) ? 1 : 0;
}
function resetCar(c) {
  const i = track.nearest(c.pos, c.idx), p = track.P[i];
  c.pos.set(p.x, 0, p.z); c.vel.set(0, 0, 0); c.hd = Math.atan2(track.Tn[i].x, track.Tn[i].z); c.idx = i; c.place();
}

// ---------------------------------------------------------------- 每一格
const camPos = new THREE.Vector3(0, 5, -10), camLook = new THREE.Vector3();
let lampT = 0, lastHit = 0;
function update(dt) {
  const racing = phase === 'race' || phase === 'done';
  if (phase === 'count') {
    countT -= dt;
    const c = Math.ceil(countT);
    if (String(c) !== $('count').textContent && c > 0) { $('count').textContent = c; sound.beep(false); }
    if (countT <= 0) { phase = 'race'; $('count').textContent = 'GO!'; sound.beep(true); setTimeout(() => { $('count').textContent = ''; }, 700); }
  }
  if (racing) {
    raceT += dt;
    if (phase === 'race') readInput(); else { player.input.gas = 0.3; player.input.steer = 0; player.input.brake = 0; player.input.hand = 0; player.ai = player.ai || { top: 0.6, grip: 12 }; }
    // 追趕機制：電腦落後太多加一點速度、領先太多慢一點
    for (const c of cars) if (c.ai && !c.isPlayer) { const gap = c.progress - player.progress; c.vmax = 56 * (gap < -90 ? 1.07 : gap > 110 ? 0.93 : 1); }
    const sub = 2;
    for (let s = 0; s < sub; s++) { for (const c of cars) c.update(dt / sub, track.wet.value, (p) => track.puddleAt(p, c.idx), raceT); collideCars(cars); }
    if (player.hit > 0.2 && raceT - lastHit > 0.4) { sound.hit(player.hit); lastHit = raceT; }
  } else if (player) { player.place(); }
  // 鏡頭
  if (player) {
    const fwd = new THREE.Vector3(Math.sin(player.hd), 0, Math.cos(player.hd));
    const v = Math.abs(player.speed);
    if (camMode === 0) {
      const want = player.pos.clone().addScaledVector(fwd, -7.2 - v * 0.03).add(new THREE.Vector3(0, 2.5, 0));
      camPos.lerp(want, Math.min(1, dt * 6)); camLook.lerp(player.pos.clone().addScaledVector(fwd, 5).add(new THREE.Vector3(0, 1, 0)), Math.min(1, dt * 10));
    } else {
      camPos.copy(player.pos).addScaledVector(fwd, 0.6).add(new THREE.Vector3(0, 1.15, 0)); camLook.copy(player.pos).addScaledVector(fwd, 20).add(new THREE.Vector3(0, 0.9, 0));
    }
    camera.position.copy(camPos); camera.lookAt(camLook);
    camera.fov = 62 + Math.min(14, v * 0.25); camera.updateProjectionMatrix();
    player.mesh.visible = camMode === 0;
    // 路燈：每 0.25 秒換成最近的幾盞
    lampT -= dt;
    if (lampT <= 0) {
      lampT = 0.25;
      const near = track.lamps.map((l) => ({ l, d: l.light.distanceToSquared(player.pos) })).sort((a, b) => a.d - b.d).slice(0, LAMPS);
      near.forEach((x, i) => lampLights[i].position.copy(x.l.light));
    }
    // 水花噴口
    const em = [];
    for (const c of cars) {
      const k = Math.min(1, Math.max(0, (Math.abs(c.speed) - 4) / 26)) * (0.25 + 0.55 * track.wet.value) + Math.min(0.4, c.slip * 0.04) + c.inPuddle * 0.35 * Math.min(1, Math.abs(c.speed) / 10);
      for (const x of [-0.92, 0.92]) em.push({ pos: c.mesh.localToWorld(new THREE.Vector3(x, 0.15, -1.45)), vel: c.vel, k: Math.min(0.4, k * 0.35) });
    }
    while (em.length < NCARS * 2) em.push({ pos: new THREE.Vector3(0, -50, 0), vel: new THREE.Vector3(), k: 0 });
    fx.setEmitters(em);
    // 介面
    $('kmh').textContent = Math.round(Math.abs(player.speed) * 3.6);
    const order = [...cars].sort((a, b) => b.progress - a.progress);
    $('pos').textContent = opts.mode === 'race' ? `${order.indexOf(player) + 1}/${cars.length}` : '—';
    $('lap').textContent = `${Math.min(opts.laps, Math.max(1, player.lap + 1))}/${opts.laps}`;
    $('time').textContent = fmt(raceT);
    sound.update({ speed: player.speed, gas: player.input.gas, slip: player.slip, rain: opts.rain, racing });
  }
  fx.update(camera, opts.rain, dt);
  drawMini();
}
function render() {
  if (OFF) { OFF.setSize(Math.round(innerWidth * renderer.getPixelRatio()), Math.round(innerHeight * renderer.getPixelRatio())); renderer.setRenderTarget(OFF); }
  pipeline.render();
  if (OFF) renderer.setRenderTarget(null);
}
let last = performance.now();
function frame() { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; if (phase !== 'paused') update(dt); render(); }
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });

// ---------------------------------------------------------------- 小地圖
const mini = $('mini'), mx = mini.getContext('2d');
let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
for (const p of track.P) { bx0 = Math.min(bx0, p.x); bx1 = Math.max(bx1, p.x); bz0 = Math.min(bz0, p.z); bz1 = Math.max(bz1, p.z); }
const msc = 150 / Math.max(bx1 - bx0, bz1 - bz0);
const mp = (p) => [10 + (bx1 - p.x) * msc, 10 + (bz1 - p.z) * msc];
function drawMini() {
  mx.clearRect(0, 0, 170, 170);
  mx.strokeStyle = 'rgba(255,255,255,.55)'; mx.lineWidth = 4; mx.beginPath();
  track.P.forEach((p, i) => { const [x, y] = mp(p); if (i) mx.lineTo(x, y); else mx.moveTo(x, y); }); mx.closePath(); mx.stroke();
  for (const c of cars) { const [x, y] = mp(c.pos); mx.fillStyle = c.isPlayer ? '#ffd23f' : '#ff4fd8'; mx.beginPath(); mx.arc(x, y, c.isPlayer ? 5 : 3.5, 0, Math.PI * 2); mx.fill(); }
}

// ---------------------------------------------------------------- 開始
step(0.7, '暖車…');
startRace(opts); phase = 'menu';
update(0.016);
try { await renderer.compileAsync(scene, camera); } catch { }
step(1, WEBGPU ? '完成' : '完成（相容模式）');
$('loading').style.opacity = 0; setTimeout(() => $('loading').classList.add('hidden'), 600);
if (!params.has('paused')) { renderer.setAnimationLoop(frame); showMenu(); }

// 背景：深紫到黑的夜空，下面一點城市的光暈
function skyTex() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#05030a'); g.addColorStop(0.42, '#140c24'); g.addColorStop(0.5, '#3a1d3f'); g.addColorStop(0.56, '#1a1028'); g.addColorStop(1, '#0a0612');
  x.fillStyle = g; x.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 自動測試用
window.__night = {
  track, renderer, WEBGPU, HIGH, fx, get cars() { return cars; }, get player() { return player; }, get phase() { return phase; },
  start: (o) => startRace({ ...opts, ...o }), go() { phase = 'race'; countT = 0; $('count').textContent = ''; },
  autopilot() { player.ai = { top: 0.9, grip: 15 }; },
  finish() { player.finished = true; player.finishT = raceT; finishOrder.push(player); phase = 'done'; showResult(); },
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
};
window.__ready = true;
void uniform;
