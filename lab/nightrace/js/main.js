// 夜雨賽車：渲染（濕路反射＋泛光）、比賽流程、操作、鏡頭、介面
import * as THREE from 'three';
import { pass, mrt, output, normalView, emissive, uniform, vec2, vec3, vec4, metalness, roughness, screenUV, hash, floor, fract, smoothstep, float, time, atan, mix, select } from 'three/tsl';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { Track, TRACKS } from './track.js';
import { Car, carMesh, collideCars, CAR_COLORS } from './car.js';
import { FX } from './fx.js';
import { Sound } from './audio.js';
import { Skids } from './skid.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const step = (k, m) => { $('loadBar').style.width = Math.round(k * 100) + '%'; if (m) $('loadMsg').textContent = m; };
const SAVE_KEY = 'mwLabNight.v1';
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
save.opts = Object.assign({ mode: 'race', laps: 3, diff: 1, rain: 1, color: 0, track: 0 }, save.opts || {});
// 每條賽道的最快一圈：第 1 條沿用舊的 save.best，其他放在 save.bests[id]
save.bests = save.bests || {};
const getBest = (ti) => (ti === 0 ? save.best : save.bests[TRACKS[ti].id]);
const setBest = (ti, v) => { if (ti === 0) save.best = v; else save.bests[TRACKS[ti].id] = v; persist(); };
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
// 環境貼圖：程式畫的夜景（窗戶、霓虹、路燈），讓車漆、玻璃、濕路反射出城市的光
scene.environment = envTex(); scene.environmentIntensity = 0.55;
scene.fog = new THREE.FogExp2(0x1a1028, 0.008);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.2, 1200);
const hemi = new THREE.HemisphereLight(0x6a5aa8, 0x120c18, 0.35); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9fb4ff, 0.25); moon.position.set(-80, 120, 40); scene.add(moon);

step(0.25, '鋪路…');
const wetU = uniform(1);
let track = new Track(TRACKS[save.opts.track] || TRACKS[0], wetU), trackIdx = TRACKS.indexOf(track.def);
track.build(scene, { high: HIGH });
function useTrack(i) {
  if (i === trackIdx) return;
  scene.remove(track.group); track.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  track = new Track(TRACKS[i], wetU); trackIdx = i; track.build(scene, { high: HIGH });
  miniBounds();
}
// 路燈：只有離玩家最近的幾盞是真的燈
const LAMPS = HIGH ? 10 : 6;
const lampLights = Array.from({ length: LAMPS }, () => { const l = new THREE.PointLight(0xffd9a0, 70, 30, 1.5); scene.add(l); return l; });

step(0.45, '準備雨和水花…');
const NCARS = 6;
const fx = new FX(scene, renderer, { high: HIGH, webgpu: WEBGPU, cars: NCARS });
const skids = new Skids(scene, wetU);

// ---------------------------------------------------------------- 後製：濕路反射（SSR）＋泛光
const pipeline = new THREE.RenderPipeline(renderer);
const rainU = uniform(1), cockpitU = uniform(0);
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
  // 車內視角：擋風玻璃上的雨滴（會折射後面的畫面），雨刷每 2.4 秒刷一次，刷過的地方雨滴再慢慢冒出來
  const uvS = screenUV, asp = float(innerWidth / innerHeight);
  const grid = vec2(26, 15), cell = floor(uvS.mul(grid)), fr = fract(uvS.mul(grid));
  const hh = hash(cell.x.add(cell.y.mul(57.1)));
  const ctr = vec2(hash(cell.x.add(cell.y.mul(13.7)).add(3.1)), hash(cell.x.mul(7.3).add(cell.y).add(9.2))).mul(0.6).add(0.2);
  const rad = hh.mul(0.25).add(0.12);
  const dv = fr.sub(ctr).mul(vec2(1, grid.y.div(grid.x).mul(asp).reciprocal()));
  const inDrop = smoothstep(rad, rad.mul(0.75), dv.length());
  // 雨刷：以畫面下方中間為軸，從右掃到左；算這個像素上次被刷到是多久以前
  const P = float(2.4), ph = time.mod(P);
  const ang = atan(float(1.15).sub(uvS.y), uvS.x.sub(0.5).mul(asp));   // 軸在畫面正下方外面：0（右）→ π（左）
  const tw = ang.div(Math.PI).mul(0.7);                                                       // 這個角度被刷到的時刻（每輪內）
  const age = select(ph.greaterThan(tw), ph.sub(tw), ph.add(P).sub(tw));
  const show = smoothstep(hh.mul(P).mul(0.9), hh.mul(P).mul(0.9).add(0.15), age).mul(rainU).mul(cockpitU).mul(smoothstep(0.64, 0.56, uvS.y));   // 只在擋風玻璃（畫面上半部）
  const refr = sp.getTextureNode('output').sample(uvS.sub(dv.mul(0.06)));                      // 水滴像小透鏡，把後面的畫面倒過來一點
  const hl = smoothstep(rad.mul(0.35), 0.0, dv.sub(vec2(rad.mul(-0.35), rad.mul(-0.35))).length());   // 左上角一點反光
  const dropC = refr.rgb.mul(1.15).add(vec3(0.9, 0.92, 1).mul(hl).mul(0.35));
  const base = lit.add(glow);
  pipeline.outputNode = vec4(mix(base.rgb, dropC.add(glow.rgb.mul(0.5)), inDrop.mul(show).mul(0.85)), 1);
}
const OFF = params.has('offscreen') ? new THREE.RenderTarget(1, 1) : null;
const sound = new Sound(); if (save.soundOff) sound.setOn(false);

// ---------------------------------------------------------------- 比賽
let cars = [], player = null, phase = 'menu', raceT = 0, countT = 0, opts = { ...save.opts }, camMode = 0, finishOrder = [], bestThisRace = Infinity;
const DIFF = [{ top: 0.8, grip: 12.5 }, { top: 0.88, grip: 14.5 }, { top: 0.95, grip: 16.5 }];
function startRace(o = opts) {
  opts = { ...o }; save.opts = opts; persist();
  useTrack(opts.track || 0);
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
  skids.clear(); rec = []; recT = 0; ghost = loadGhost(trackIdx);
  phase = 'count'; countT = 3; raceT = 0;
  closeAll(); $('count').textContent = '3'; sound.start(); sound.beep(false);
}
// ---------------------------------------------------------------- 幽靈車：記下自己最快那一圈的路線，計時賽時陪你跑
const GHOST_KEY = (ti) => 'mwLabNight.ghost.' + TRACKS[ti].id;
const loadGhost = (ti) => { try { return JSON.parse(localStorage.getItem(GHOST_KEY(ti))); } catch { return null; } };
let rec = [], recT = 0, ghost = null, ghostMesh = null;
function ghostShow(on) {
  if (!ghostMesh) { ghostMesh = carMesh(0x8fd0ff, { ghost: true }); scene.add(ghostMesh); }
  ghostMesh.visible = on;
}
function ghostUpdate() {
  if (!ghost || !player || player.lap < 0 || opts.mode !== 'tt') { ghostShow(false); return; }
  const t = (raceT - player.lapStart) / 0.1, i = Math.floor(t), a = ghost.p[i], b = ghost.p[i + 1];
  if (!a || !b) { ghostShow(false); return; }
  const f = t - i, d = Math.atan2(Math.sin(b[2] - a[2]), Math.cos(b[2] - a[2]));
  ghostShow(true);
  ghostMesh.position.set(a[0] + (b[0] - a[0]) * f, 0, a[1] + (b[1] - a[1]) * f); ghostMesh.rotation.set(0, a[2] + d * f, 0);
}
function recordPlayer() {
  if (!player || player.lap < 0 || phase !== 'race') return;
  const t = raceT - player.lapStart;
  while (recT <= t) { rec.push([+player.pos.x.toFixed(2), +player.pos.z.toFixed(2), +player.hd.toFixed(3)]); recT += 0.1; }
}

function onLap(car) {
  if (car.isPlayer) { var lapRec = rec; rec = []; recT = 0; }
  if (car.lap === 0) { car.lapStart = raceT; car.lapTimes = []; return; }   // 剛起跑過線
  const lt = car.lapTimes[car.lapTimes.length - 1];
  if (car.isPlayer && lapRec && lapRec.length > 20 && (!ghost || lt < ghost.t)) {
    ghost = { t: lt, p: lapRec };
    try { localStorage.setItem(GHOST_KEY(trackIdx), JSON.stringify(ghost)); } catch { }
    if (opts.mode === 'tt') setTimeout(() => flash('👻 幽靈車更新了：下一圈和自己比！'), 2300);
  }
  if (car.isPlayer) {
    if (lt < bestThisRace) bestThisRace = lt;
    if (!getBest(trackIdx) || lt < getBest(trackIdx)) { setBest(trackIdx, lt); if (car.lap >= 1) flash(`🏆 最快一圈 ${fmt(lt)}！`); }
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
  $('rText').textContent = `總時間 ${fmt(player.finishT)} · 這場最快一圈 ${fmt(bestThisRace)} · 歷史最快 ${fmt(getBest(trackIdx))}`;
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
segInit('oMode', 'mode'); segInit('oLaps', 'laps', Number); segInit('oDiff', 'diff', Number); segInit('oRain', 'rain', Number); segInit('oTrack', 'track', Number);
$('oColor').innerHTML = CAR_COLORS.map((c, i) => `<button data-i="${i}" style="background:#${c.toString(16).padStart(6, '0')}"></button>`).join('');
const paintCol = () => [...$('oColor').children].forEach((b, i) => b.classList.toggle('on', i === opts.color));
$('oColor').onclick = (e) => { const i = e.target.dataset && e.target.dataset.i; if (i == null) return; opts.color = +i; paintCol(); };
paintCol();
function showMenu() {
  $('best').textContent = TRACKS.map((t, i) => `${t.name} ${fmt(getBest(i))}`).join(' · ');
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
  if (e.code === 'KeyC') nextCam();
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
const CAM_NAMES = ['追車視角', '車頭視角', '車內視角'];
function nextCam() { camMode = (camMode + 1) % 3; flash('🎥 ' + CAM_NAMES[camMode]); }
$('camBtn').onclick = nextCam;
function resetCar(c) {
  const i = track.nearest(c.pos, c.idx), p = track.P[i];
  c.pos.set(p.x, 0, p.z); c.vel.set(0, 0, 0); c.hd = Math.atan2(track.Tn[i].x, track.Tn[i].z); c.idx = i; c.place();
}

// ---------------------------------------------------------------- 每一格
const camPos = new THREE.Vector3(0, 5, -10), camLook = new THREE.Vector3();
let lampT = 0, lastHit = 0, boltT = 6, flashSeq = null, flashAge = 0;
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
    recordPlayer();
    if (player.hit > 0.2 && raceT - lastHit > 0.4) { sound.hit(player.hit); lastHit = raceT; }
  } else if (player) { player.place(); }
  // 鏡頭
  if (player) {
    const fwd = new THREE.Vector3(Math.sin(player.hd), 0, Math.cos(player.hd));
    const v = Math.abs(player.speed);
    if (camMode === 0) {
      const want = player.pos.clone().addScaledVector(fwd, -7.2 - v * 0.03).add(new THREE.Vector3(0, 2.5, 0));
      camPos.lerp(want, Math.min(1, dt * 6)); camLook.lerp(player.pos.clone().addScaledVector(fwd, 5).add(new THREE.Vector3(0, 1, 0)), Math.min(1, dt * 10));
    } else if (camMode === 1) {
      camPos.copy(player.pos).addScaledVector(fwd, 0.6).add(new THREE.Vector3(0, 1.15, 0)); camLook.copy(player.pos).addScaledVector(fwd, 20).add(new THREE.Vector3(0, 0.9, 0));
    } else {
      // 車內：駕駛座的位置，看得到儀表板和方向盤
      player.mesh.updateMatrixWorld();
      camPos.copy(player.mesh.localToWorld(new THREE.Vector3(-0.38, 1.13, -0.2)));
      camLook.copy(player.mesh.localToWorld(new THREE.Vector3(-0.38, 0.75, 20)));
    }
    camera.position.copy(camPos); camera.lookAt(camLook);
    camera.fov = (camMode === 2 ? 66 : 62) + Math.min(14, v * 0.25); camera.updateProjectionMatrix();
    player.mesh.visible = camMode !== 1;
    if (player.mesh.userData.inner) player.mesh.userData.inner.visible = camMode === 2;
    cockpitU.value = camMode === 2 ? 1 : 0; rainU.value = opts.rain;
    // 路燈：每 0.25 秒換成最近的幾盞
    lampT -= dt;
    if (lampT <= 0) {
      lampT = 0.25;
      const near = track.lamps.map((l) => ({ l, d: l.light.distanceToSquared(player.pos) })).sort((a, b) => a.d - b.d).slice(0, LAMPS);
      near.forEach((x, i) => lampLights[i].position.copy(x.l.light));
    }
    // 輪胎痕：側滑、手煞車、急煞
    if (racing) cars.forEach((c, ci) => {
      const sp = Math.abs(c.speed);
      const k = sp < 4 ? 0 : Math.min(1, Math.max(0, (c.slip - 3.5) / 5) + (c.input.hand ? 0.6 : 0) + (c.input.brake && sp > 20 ? 0.35 : 0));
      [-0.9, 0.9].forEach((x, wi) => skids.mark(ci * 2 + wi, c.mesh.localToWorld(new THREE.Vector3(x, 0, -1.35)), k));
    });
    skids.update();
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
  // 閃電：大雨時偶爾天空一亮（閃兩下），過一下才聽到雷聲
  if (opts.rain >= 1 && phase !== 'menu') {
    boltT -= dt;
    if (boltT <= 0) { boltT = 9 + Math.random() * 14; flashSeq = [0, 0.12, 0.22]; flashAge = 0; const d = 0.5 + Math.random() * 1.8; setTimeout(() => sound.thunder(1.4 - d * 0.4), d * 1000); }
  }
  if (flashSeq) {
    flashAge += dt; let f = 0;
    for (const s0 of flashSeq) { const a = flashAge - s0; if (a >= 0) f = Math.max(f, Math.exp(-a * 14)); }
    hemi.intensity = 0.35 + f * 4; moon.intensity = 0.25 + f * 5; scene.backgroundIntensity = 1 + f * 6;
    if (flashAge > 1) { flashSeq = null; hemi.intensity = 0.35; moon.intensity = 0.25; scene.backgroundIntensity = 1; }
  }
  ghostUpdate();
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
let bx0, bx1, bz0, bz1, msc;
function miniBounds() {
  bx0 = Infinity; bx1 = -Infinity; bz0 = Infinity; bz1 = -Infinity;
  for (const p of track.P) { bx0 = Math.min(bx0, p.x); bx1 = Math.max(bx1, p.x); bz0 = Math.min(bz0, p.z); bz1 = Math.max(bz1, p.z); }
  msc = 150 / Math.max(bx1 - bx0, bz1 - bz0);
}
miniBounds();
const mp = (p) => [10 + (bx1 - p.x) * msc, 10 + (bz1 - p.z) * msc];
function drawMini() {
  mx.clearRect(0, 0, 170, 170);
  mx.strokeStyle = 'rgba(255,255,255,.55)'; mx.lineWidth = 4; mx.beginPath();
  track.P.forEach((p, i) => { const [x, y] = mp(p); if (i) mx.lineTo(x, y); else mx.moveTo(x, y); }); mx.closePath(); mx.stroke();
  if (ghostMesh && ghostMesh.visible) { const [x, y] = mp(ghostMesh.position); mx.fillStyle = 'rgba(143,208,255,.8)'; mx.beginPath(); mx.arc(x, y, 4, 0, Math.PI * 2); mx.fill(); }
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

function envTex() {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#05040a'); g.addColorStop(0.45, '#1c1230'); g.addColorStop(0.52, '#2a1838'); g.addColorStop(0.6, '#0c0a12'); g.addColorStop(1, '#050507');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // 地平線上的大樓與亮窗
  let r = 7; const R = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let bx = 0; bx < W; bx += 14 + R() * 30) {
    const bw = 12 + R() * 34, bh = 30 + R() * 120, top = H * 0.53 - bh;
    x.fillStyle = '#0d0c14'; x.fillRect(bx, top, bw, bh);
    for (let wy = top + 4; wy < H * 0.53 - 3; wy += 6) for (let wx = bx + 3; wx < bx + bw - 3; wx += 5) if (R() < 0.45) { x.fillStyle = R() < 0.8 ? '#ffcf8a' : '#cfe4ff'; x.fillRect(wx, wy, 2.5, 3); }
  }
  // 霓虹條和路燈
  const neon = ['#ff4fd8', '#3fe0ff', '#ffd23f', '#7dff6a', '#ff6a3d'];
  for (let i = 0; i < 26; i++) { x.fillStyle = neon[i % neon.length]; x.fillRect(R() * W, H * (0.38 + R() * 0.14), 18 + R() * 40, 3 + R() * 4); }
  for (let i = 0; i < 16; i++) { const lx = R() * W, ly = H * (0.2 + R() * 0.12); const rg = x.createRadialGradient(lx, ly, 0, lx, ly, 26); rg.addColorStop(0, 'rgba(255,225,170,1)'); rg.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = rg; x.fillRect(lx - 26, ly - 26, 52, 52); }
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 自動測試用
window.__night = {
  get track() { return track; }, renderer, WEBGPU, HIGH, fx, get cars() { return cars; }, get player() { return player; }, get phase() { return phase; }, skids,
  start: (o) => startRace({ ...opts, ...o }), go() { phase = 'race'; countT = 0; $('count').textContent = ''; },
  setCam(m) { camMode = m; },
  bolt() { boltT = 0; }, get ghost() { return ghost; }, get ghostMesh() { return ghostMesh; },
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
