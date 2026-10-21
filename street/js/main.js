// MW 大街：主程式（渲染、角色操作、鏡頭、互動、聲音）
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildWorld, L } from './world.js';
import { loadAvatar, Character } from './avatar.js';
import { GAMES, ZONES } from './games.js';
import { setAniso } from './kit.js';
import { Sound } from './sound.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('mwStreet.' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mwStreet.' + k, v); } catch { } },
  sget(k) { try { return sessionStorage.getItem('mwStreet.' + k); } catch { return null; } },
  sset(k, v) { try { sessionStorage.setItem('mwStreet.' + k, v); } catch { } },
};
const params = new URLSearchParams(location.search);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const quality = params.get('q') || store.get('quality', isTouch && Math.min(screen.width, screen.height) < 900 ? 'low' : 'high');
const HIGH = quality !== 'low';
const ENV_K = +(params.get('env') || 0.42);

// ------------------------------------------------------------------ renderer / scene
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !HIGH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, HIGH ? 1.75 : 1));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9d6e3, 60, 190);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);

// sun + sky
const sunDir = new THREE.Vector3(-0.38, 0.8, 0.46).normalize();
const sky = new Sky(); sky.scale.setScalar(1000); scene.add(sky);
sky.material.uniforms.turbidity.value = 3.2; sky.material.uniforms.rayleigh.value = 1.1;
sky.material.uniforms.mieCoefficient.value = 0.004; sky.material.uniforms.mieDirectionalG.value = 0.8;
sky.material.uniforms.sunPosition.value.copy(sunDir);
const sun = new THREE.DirectionalLight(0xfff0dc, 4.6);
sun.castShadow = true;
sun.shadow.mapSize.set(HIGH ? 2048 : 1024, HIGH ? 2048 : 1024);
const SH = HIGH ? 24 : 18;
Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 120 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x8a7a66, 0.35); scene.add(hemi);

// post
let composer = null, bloom = null;
if (HIGH) {
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.55, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
}
addEventListener('resize', resize);

// ------------------------------------------------------------------ loading
const bar = $('loadBar'), msg = $('loadMsg');
let prog = 0; const step = (p, m) => { prog = Math.max(prog, p); bar.style.width = (prog * 100).toFixed(0) + '%'; if (m) msg.textContent = m; };

const shots = {};
async function loadAll() {
  step(0.05, '載入字型');
  try { await Promise.all(['900 64px "Noto Sans TC"', '700 32px "Noto Sans TC"', '900 64px "Noto Serif TC"', '700 32px "Silkscreen"'].map((f) => document.fonts.load(f, '大街MW遊戲'))); } catch { }
  step(0.12, '載入天空與光線');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const hdr = await new RGBELoader().loadAsync('assets/sky.hdr');
  scene.environment = pmrem.fromEquirectangular(hdr).texture; hdr.dispose();
  step(0.25, '載入遊戲畫面');
  const tl = new THREE.TextureLoader();
  await Promise.all(GAMES.map((g) => new Promise((res) => tl.load(`../${g.id}/hall_shot.jpg`, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; shots[g.id] = t; res(); }, undefined, () => { shots[g.id] = new THREE.Texture(); res(); }))));
  step(0.35, '載入角色');
  const avs = await Promise.all(['boy', 'girl'].map((id) => loadAvatar(id, (e) => e.total && step(0.35 + 0.3 * e.loaded / e.total / 2))));
  step(0.7, '蓋房子');
  const world = await buildWorld(scene, { shots, quality });
  step(0.95, '準備好了');
  return { world, avs: { boy: avs[0], girl: avs[1] } };
}

// ------------------------------------------------------------------ state
let world, avatars, player, avatarId = store.get('avatar', 'boy');
const pos = new THREE.Vector3(), vel = new THREE.Vector3();
let heading = Math.PI, speedNow = 0;
let camYaw = 0, camPitch = 0.22, camDist = 4.4, camDistNow = 4.4, lastCamInput = -9;
let mode = 'title';           // title | play | launching
let auto = null;              // auto-walk { path:[Vector3], game }
let near = null;              // interactable in range
const npcs = [];
const sound = new Sound(store.get('sound', 'on') === 'on');

function setAvatar(id) {
  avatarId = id; store.set('avatar', id);
  if (player) scene.remove(player.root);
  player = new Character(avatars[id]);
  player.root.position.copy(pos); player.root.rotation.y = heading;
  player.onStep = () => sound.step(world.area(pos), speedNow);
  scene.add(player.root);
  document.querySelectorAll('[data-av]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.av === id));
  document.querySelectorAll('#segAv button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === id));
}

// ------------------------------------------------------------------ npcs
function makeNPCs() {
  const n = HIGH ? 5 : 2;
  const tints = [[0x8c3a3a, 0x2a1d14], [0x3d5a80, 0x1a1a1a], [0x6b8f4e, 0x3b2a1a], [0xd9a441, 0x1d1712], [0x7a5c99, 0x281d18], [0x2f6d6d, 0x0f0f0f]];
  for (let i = 0; i < n; i++) {
    const g = i % 2 ? avatars.girl : avatars.boy;
    const t = tints[i % tints.length]; const tint = new THREE.Color(t[0]); tint.hair = new THREE.Color(t[1]).multiplyScalar(2.2);
    const c = new Character(g, { tint });
    const inside = i === 4;
    const lane = [-4.2, 3.6, 5.6, -5.8][i % 4];
    const npc = { c, inside, x: inside ? 12.3 : lane, z: inside ? -10.5 : 14 + i * 9, dir: i % 2 ? 1 : -1, speed: 1.05 + (i % 3) * 0.12, pause: 0, heading: 0 };
    if (inside) { npc.heading = Math.PI / 2; }
    c.root.position.set(npc.x, 0, npc.z);
    scene.add(c.root); npcs.push(npc);
  }
}
function updateNPCs(dt) {
  for (const n of npcs) {
    if (n.inside) { n.c.setMotion(0); n.c.root.rotation.y = n.heading; n.c.update(dt); continue; }
    const dx = pos.x - n.x, dz = pos.z - n.z, d = Math.hypot(dx, dz);
    const blocked = d < 1.3 && Math.sign(dz) === n.dir;
    let sp = 0;
    if (n.pause > 0) n.pause -= dt;
    else if (!blocked) {
      sp = n.speed; n.z += n.dir * sp * dt;
      if (n.z > 58 || n.z < 9) { n.dir *= -1; n.pause = 1.5 + Math.random() * 2; n.z = THREE.MathUtils.clamp(n.z, 9, 58); }
    }
    const want = n.dir > 0 ? 0 : Math.PI;
    n.heading = angLerp(n.heading, want, Math.min(1, dt * 3));
    n.c.setMotion(sp);
    n.c.root.position.set(n.x, 0, n.z); n.c.root.rotation.y = n.heading;
    if (d < 45) n.c.update(dt);
  }
}

// ------------------------------------------------------------------ input
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.code);
  if (mode === 'play' && (e.code === 'KeyE' || e.code === 'Enter') && near) launch(near);
  if (mode === 'title' && e.code === 'Enter') startPlay();
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (auto && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) auto = null;
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const stick = { id: null, x0: 0, y0: 0, x: 0, y: 0, el: $('stick') };
const look = { id: null, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: false };
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  sound.unlock();
  canvas.focus();
  if (mode !== 'play') return;
  if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.45 && stick.id === null) {
    stick.id = e.pointerId; stick.x0 = e.clientX; stick.y0 = e.clientY; stick.x = stick.y = 0;
    Object.assign(stick.el.style, { display: 'block', left: e.clientX + 'px', top: e.clientY + 'px' }); stick.el.firstElementChild.style.transform = '';
    auto = null; hideTouchHelp();
  } else if (look.id === null) {
    look.id = e.pointerId; look.x = look.sx = e.clientX; look.y = look.sy = e.clientY; look.t = performance.now(); look.moved = false;
  }
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === stick.id) {
    let dx = e.clientX - stick.x0, dy = e.clientY - stick.y0; const m = Math.hypot(dx, dy), R = 56;
    if (m > R) { dx *= R / m; dy *= R / m; }
    stick.x = dx / R; stick.y = dy / R;
    stick.el.firstElementChild.style.transform = `translate(${dx}px, ${dy}px)`;
  } else if (e.pointerId === look.id) {
    const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY;
    if (Math.hypot(e.clientX - look.sx, e.clientY - look.sy) > 8) look.moved = true;
    if (look.moved) {
      const k = e.pointerType === 'touch' ? 0.0065 : 0.005;
      camYaw -= dx * k; camPitch = THREE.MathUtils.clamp(camPitch + dy * k * 0.8, -0.35, 1.1); lastCamInput = clock.elapsedTime;
    }
  }
});
const endPtr = (e) => {
  if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; stick.el.style.display = 'none'; }
  if (e.pointerId === look.id) {
    look.id = null;
    if (!look.moved && performance.now() - look.t < 400) tapAt(e.clientX, e.clientY);
  }
};
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => { camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.004, 1.8, 9); e.preventDefault(); }, { passive: false });
let pinch = null;

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function tapAt(x, y) {
  if (mode !== 'play') return;
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(world.interact.map((i) => i.screen), false);
  if (!hits.length) return;
  const it = world.interact.find((i) => i.screen === hits[0].object);
  if (near === it) launch(it); else goTo(it);
}

// ------------------------------------------------------------------ auto walk
function goTo(it) {
  const path = [];
  const inHall = pos.z < L.hallFront - 0.3;
  if (!inHall) {
    if (pos.z > L.shopZ0) { const lx = pos.x < 0 ? -3.1 : 3.1; path.push(new THREE.Vector3(lx, 0, pos.z)); path.push(new THREE.Vector3(lx, 0, L.shopZ0 - 1)); }
    if (pos.z > L.hallFront + 3) path.push(new THREE.Vector3(0, 0, L.hallFront + 2.5));
    path.push(new THREE.Vector3(0, 0, L.hallFront - 2.5));
  }
  else if (Math.abs(pos.x) > 4.8 && pos.z < -10) { path.push(new THREE.Vector3(pos.x, 0, -8.6)); path.push(new THREE.Vector3(0, 0, -8.6)); }
  if (Math.abs(it.spot.x) < 4) path.push(new THREE.Vector3(0, 0, it.spot.z));
  else path.push(new THREE.Vector3(0, 0, it.spot.z));
  path.push(it.spot.clone());
  auto = { path, it, stuck: 0 };
  toast(`前往：${it.game.title}`);
}

// ------------------------------------------------------------------ collisions
const R = 0.3;
function collide(p) {
  for (let iter = 0; iter < 2; iter++) {
    for (const c of world.colliders) {
      if (c.y0 > 1.5) continue;
      const cx = THREE.MathUtils.clamp(p.x, c.x0, c.x1), cz = THREE.MathUtils.clamp(p.z, c.z0, c.z1);
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < R * R) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (R - d) / d; p.x += dx * k; p.z += dz * k; }
        else { // center inside the box: push out along the smallest axis
          const ox = [c.x0 - R - p.x, c.x1 + R - p.x], oz = [c.z0 - R - p.z, c.z1 + R - p.z];
          const mx = Math.abs(ox[0]) < Math.abs(ox[1]) ? ox[0] : ox[1], mz = Math.abs(oz[0]) < Math.abs(oz[1]) ? oz[0] : oz[1];
          if (Math.abs(mx) < Math.abs(mz)) p.x += mx; else p.z += mz;
        }
      }
    }
    for (const n of npcs) {
      const dx = p.x - n.c.root.position.x, dz = p.z - n.c.root.position.z, d = Math.hypot(dx, dz);
      if (d < 0.6 && d > 1e-4) { p.x += dx / d * (0.6 - d); p.z += dz / d * (0.6 - d); }
    }
  }
  p.z = Math.min(p.z, L.endZ);
}
// camera vs buildings (ray from the head to the camera)
function camClamp(from, dir, maxD) {
  let best = maxD;
  for (const c of world.colliders) {
    if (!c.cam) continue;
    // slab test
    let t0 = 0, t1 = best;
    const b = [[c.x0 - .15, c.x1 + .15, from.x, dir.x], [c.y0, c.y1, from.y, dir.y], [c.z0 - .15, c.z1 + .15, from.z, dir.z]];
    let ok = true;
    for (const [lo, hi, o, d] of b) {
      if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { ok = false; break; } continue; }
      let a = (lo - o) / d, bb = (hi - o) / d; if (a > bb) [a, bb] = [bb, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, bb); if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 > 0.05 && t0 < best) best = t0;
  }
  return Math.max(0.6, best - 0.2);
}

// ------------------------------------------------------------------ UI
const ui = { place: $('placeName'), sub: $('placeSub'), prompt: $('prompt') };
let promptFor = null;
function showPrompt(it) {
  if (promptFor === it) return;
  promptFor = it;
  if (!it) { ui.prompt.classList.remove('show'); return; }
  const g = it.game;
  $('pImg').src = `../${g.id}/hall_shot.jpg`;
  $('pGenre').textContent = `${ZONES[g.zone].name} · ${g.genre}`;
  $('pTitle').textContent = g.title; $('pDesc').textContent = g.desc;
  $('pTags').innerHTML = g.tags.map((t) => `<span>${t}</span>`).join('');
  $('pPlay').innerHTML = isTouch ? '進入遊戲' : '進入遊戲<kbd>E</kbd>';
  ui.prompt.classList.add('show');
}
$('pPlay').addEventListener('click', () => near && launch(near));
let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1800); }
function hideTouchHelp() { const h = $('touchHelp'); h.style.opacity = 0; setTimeout(() => h.classList.add('hidden'), 1000); }

// menus
const openSheet = (id) => { $(id).classList.remove('hidden'); keys.clear(); };
document.querySelectorAll('.sheet').forEach((s) => s.addEventListener('click', (e) => { if (e.target === s || e.target.hasAttribute('data-close')) s.classList.add('hidden'); }));
$('btnGo').addEventListener('click', () => openSheet('goSheet'));
$('btnSet').addEventListener('click', () => openSheet('setSheet'));
function buildGoList() {
  const el = $('goList'); el.innerHTML = '';
  for (const [zid, z] of Object.entries(ZONES)) {
    const h = document.createElement('div'); h.className = 'zone-h'; h.textContent = z.name; h.style.color = z.color; el.appendChild(h);
    for (const g of GAMES.filter((x) => x.zone === zid)) {
      const b = document.createElement('button');
      b.innerHTML = `<img src="../${g.id}/hall_shot.jpg" alt=""><b>${g.title}</b><span>${g.genre}</span>`;
      b.addEventListener('click', () => { $('goSheet').classList.add('hidden'); goTo(world.interact.find((i) => i.game.id === g.id)); });
      el.appendChild(b);
    }
  }
}
function segInit(id, cur, fn) {
  const el = $(id);
  el.querySelectorAll('button').forEach((b) => { b.setAttribute('aria-pressed', b.dataset.v === cur); b.addEventListener('click', () => { el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); fn(b.dataset.v); }); });
}
segInit('segAv', avatarId, (v) => setAvatar(v));
segInit('segQ', quality, (v) => { if (v !== quality) { store.set('quality', v); location.reload(); } });
segInit('segS', sound.on ? 'on' : 'off', (v) => { sound.setOn(v === 'on'); store.set('sound', v); });
document.querySelectorAll('[data-av]').forEach((b) => b.addEventListener('click', () => setAvatar(b.dataset.av)));
$('goBtn').addEventListener('click', () => startPlay());

function startPlay() {
  if (mode !== 'title') return;
  sound.unlock();
  mode = 'play';
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden');
  camYaw = heading + Math.PI; camPitch = 0.2;
  if (isTouch) { $('touchHelp').classList.remove('hidden'); setTimeout(hideTouchHelp, 6000); }
}

// launch a game
function launch(it) {
  if (mode !== 'play') return;
  mode = 'launching';
  auto = null; showPrompt(null);
  store.sset('last', it.game.id); store.sset('avatar', avatarId);
  sound.coin();
  const from = camera.position.clone(), fromQ = camera.quaternion.clone();
  const to = it.focus.clone().addScaledVector(it.normal, it.game.kind === 'party' ? 3.2 : 0.75);
  const m = new THREE.Matrix4().lookAt(to, it.focus, new THREE.Vector3(0, 1, 0));
  const toQ = new THREE.Quaternion().setFromRotationMatrix(m);
  const t0 = clock.elapsedTime;
  launchAnim = (t) => {
    const k = Math.min(1, (t - t0) / 1.1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    camera.position.lerpVectors(from, to, e); camera.quaternion.slerpQuaternions(fromQ, toQ, e);
    if (k > 0.55) $('fade').classList.add('on');
    if (k >= 1 && !launchAnim.done) { launchAnim.done = true; setTimeout(() => { location.href = '../' + it.game.path; }, 250); }
  };
}
let launchAnim = null;
// coming back from a game with the browser back button (bfcache)
addEventListener('pageshow', (e) => { if (e.persisted && mode === 'launching') { $('fade').classList.remove('on'); mode = 'play'; launchAnim = null; } });

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
const tmp = new THREE.Vector3(), head = new THREE.Vector3(), camWant = new THREE.Vector3();
function angLerp(a, b, k) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; }

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (mode === 'play') updatePlayer(dt, t);
  else if (mode === 'title') {
    camYaw += dt * 0.12;
    player.setMotion(0);
  }
  player.update(dt);
  updateNPCs(dt);
  world.update(dt, t, pos);
  sound.update(dt, world.area(pos), pos);
  if (mode === 'launching' && launchAnim) launchAnim(t);
  else updateCamera(dt, t);
  // shadow camera follows the player (snapped to texels to avoid shimmering)
  const tx = SH * 2 / sun.shadow.mapSize.x;
  tmp.set(Math.round(pos.x / tx) * tx, 0, Math.round(pos.z / tx) * tx);
  sun.target.position.copy(tmp); sun.position.copy(tmp).addScaledVector(sunDir, 60);
  if (composer) composer.render(); else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function updatePlayer(dt, t) {
  // input vector in camera space
  let ix = 0, iz = 0, run = keys.has('ShiftLeft') || keys.has('ShiftRight');
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iz -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (stick.id !== null) { ix += stick.x; iz -= stick.y; if (Math.hypot(stick.x, stick.y) > 0.85) run = true; }
  let mag = Math.min(1, Math.hypot(ix, iz));
  const fwd = tmp.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
  let mx = fwd.x * iz + (-fwd.z) * ix, mz = fwd.z * iz + fwd.x * ix;
  if (mag > 0.05) { const l = Math.hypot(mx, mz); mx /= l; mz /= l; }
  // auto walk
  if (auto && mag < 0.05) {
    const target = auto.path[0];
    const dx = target.x - pos.x, dz = target.z - pos.z, d = Math.hypot(dx, dz);
    if (d < (auto.path.length > 1 ? 0.6 : 0.12)) {
      auto.path.shift();
      if (!auto.path.length) { heading = auto.it.face; const it = auto.it; auto = null; camYaw = angLerp(camYaw, heading + Math.PI, 1); lastCamInput = -9; }
    } else { mx = dx / d; mz = dz / d; mag = Math.min(1, d / 0.5 + 0.2); run = d > 3; }
  }
  const sp = mag < 0.05 ? 0 : (run ? 5.2 : 2.7) * Math.max(0.35, mag);
  speedNow += (sp - speedNow) * Math.min(1, dt * (sp > speedNow ? 6 : 9));
  if (mag > 0.05) heading = angLerp(heading, Math.atan2(mx, mz), Math.min(1, dt * 10));
  const dir = mag > 0.05 ? tmp.set(mx, 0, mz) : tmp.set(Math.sin(heading), 0, Math.cos(heading));
  const before = pos.clone();
  pos.x += dir.x * speedNow * dt; pos.z += dir.z * speedNow * dt;
  collide(pos);
  // actual speed (so we don't moonwalk against walls)
  const real = before.distanceTo(pos) / Math.max(dt, 1e-4);
  if (auto) { auto.stuck = real < 0.25 ? auto.stuck + dt : 0; if (auto.stuck > 1.2) { auto = null; toast('前面被擋住了，換個方向走走看'); } }
  player.setMotion(Math.min(speedNow, real + 0.3));
  player.root.position.copy(pos); player.root.rotation.y = heading;
  // camera auto follow while moving
  if (speedNow > 0.4 && t - lastCamInput > 1.4) {
    const want = heading + Math.PI;
    const diff = Math.abs(((want - camYaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
    if (diff < 2.0) camYaw = angLerp(camYaw, want, Math.min(1, dt * (auto ? 2.2 : 1.1)));
  }
  // nearest interactable
  let best = null, bd = 1e9;
  for (const it of world.interact) {
    const d = Math.hypot(it.spot.x - pos.x, it.spot.z - pos.z);
    const facing = Math.cos(heading - it.face) > -0.2 || speedNow < 0.2;
    if (d < it.radius && d < bd && facing) { best = it; bd = d; }
  }
  near = best; showPrompt(best);
  // place label
  const area = world.area(pos);
  let name = 'MW 大街', sub = '';
  if (area === 'plaza') { name = 'MW 遊戲大廳'; sub = '門口'; }
  if (area === 'hall') {
    name = 'MW 遊戲大廳';
    if (pos.z > -8.5) sub = '大廳';
    else { let zb = null, zd = 1e9; for (const it of world.interact) { const d = it.spot.distanceTo(pos); if (d < zd) { zd = d; zb = it.game.zone; } } sub = ZONES[zb].name; }
  }
  if (area === 'street') sub = pos.z > L.gateZ ? '入口' : '商店街';
  if (ui.place.textContent !== name) ui.place.textContent = name;
  if (ui.sub.textContent !== sub) ui.sub.textContent = sub;
}

function updateCamera(dt, t) {
  const inHall = pos.z < L.hallFront - 0.4;
  head.set(pos.x, (player.height || 1.6) * 0.9, pos.z);
  const maxD = mode === 'title' ? 5.2 : camDist;
  const dir = camWant.set(Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch));
  let d = camClamp(head, dir, maxD);
  if (inHall) { const yMax = L.hallCeil - 0.35; if (head.y + dir.y * d > yMax) d = Math.min(d, (yMax - head.y) / Math.max(dir.y, 1e-3)); }
  if (head.y + dir.y * d < 0.25) d = Math.min(d, (head.y - 0.25) / Math.max(-dir.y, 1e-3));
  camDistNow += (d - camDistNow) * Math.min(1, dt * (d < camDistNow ? 14 : 3));
  camera.position.copy(head).addScaledVector(dir, camDistNow);
  const lookAt = tmp.copy(head); lookAt.y += mode === 'title' ? -0.15 : 0.05;
  camera.lookAt(lookAt);
}

// ------------------------------------------------------------------ boot
(async () => {
  try {
    const r = await loadAll();
    world = r.world; avatars = r.avs;
    const last = store.sget('last');
    const back = last && world.interact.find((i) => i.game.id === last);
    if (back) { pos.copy(back.spot); heading = back.face; avatarId = store.sget('avatar') || avatarId; }
    else { pos.set(world.spawn.x, 0, world.spawn.z); heading = world.spawn.heading; }
    setAvatar(avatarId);
    makeNPCs();
    // the HDRI is bright and even: keep it for reflections/fill but let the sun draw shadows
    const seen = new Set();
    scene.traverse((o) => { if (!o.isMesh) return; for (const m of [].concat(o.material)) if (!seen.has(m)) { seen.add(m); if ('envMapIntensity' in m) m.envMapIntensity *= ENV_K; } });
    buildGoList();
    camYaw = heading + Math.PI + (back ? 0 : 0.6);
    step(1);
    // warm up shaders
    renderer.compile(scene, camera);
    $('loading').style.opacity = 0; setTimeout(() => $('loading').classList.add('hidden'), 600);
    if (back) { mode = 'title'; startPlay(); toast('歡迎回來！'); }
    else { $('title').classList.remove('hidden'); $('titleHint').textContent = isTouch ? '左邊拖曳走路，右邊拖曳轉視角' : 'W A S D 走路 · Shift 跑步 · 滑鼠拖曳轉視角'; }
    document.title = 'MW 大街';
    window.__ready = true;
    requestAnimationFrame(frame);
  } catch (err) {
    console.error(err);
    msg.textContent = '載入失敗，請重新整理：' + err.message;
  }
})();

// debug hooks for automated screenshots
window.__street = {
  get pos() { return pos; }, setPos(x, z, h) { pos.set(x, 0, z); if (h !== undefined) heading = h; player.root.position.copy(pos); },
  cam(yaw, pitch, dist) { camYaw = yaw; camPitch = pitch; camDist = camDistNow = dist; lastCamInput = clock.elapsedTime + 1e6; },
  sim(sec) { for (let i = 0; i < sec * 30; i++) { clock.elapsedTime += 1 / 30; if (mode === 'play') updatePlayer(1 / 30, clock.elapsedTime); player.update(1 / 30); updateNPCs(1 / 30); world.update(1 / 30, clock.elapsedTime, pos); } return [pos.x.toFixed(2), pos.z.toFixed(2), near && near.game.id, !!auto].join(); },
  key(code, on) { if (on) keys.add(code); else keys.delete(code); },
  launch: () => near && launch(near),
  start: () => startPlay(), goTo: (id) => goTo(world.interact.find((i) => i.game.id === id)),
  get mode() { return mode; }, renderer, scene, camera,
};
