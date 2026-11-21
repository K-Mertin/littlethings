// 星塵彈幕：渲染、遊戲流程、玩家、敵人、魔王、道具、操作、介面
import * as THREE from 'three';
import { pass, uniform, vec3, smoothstep, uv, float } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { Bullets, FIELD, NE, PER } from './bullets.js';
import { Bursts, Space, Sprites } from './fx.js';
import { playerShip, enemyShip, bossShip } from './ships.js';
import { STAGES, ENEMIES, DIFFS } from './stages.js';
import { Sound } from './audio.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const step = async (k, m) => { $('loadBar').style.width = Math.round(k * 100) + '%'; if (m) $('loadMsg').textContent = m; await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); };

const SAVE_KEY = 'mwLabBullet.v1';
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
save.best = save.best || {}; save.cleared = save.cleared || 0; save.diff = save.diff ?? 1;
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { } };

// ---------------------------------------------------------------- 渲染器
await step(0.08, '啟動顯示卡…');
const canvas = $('view');
const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, powerPreference: 'high-performance', forceWebGL: params.has('gl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
await renderer.init();
const WEBGPU = !!renderer.backend.isWebGPUBackend;


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 1, 400);
scene.add(new THREE.HemisphereLight(0xb9c8ff, 0x201030, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-8, 20, 6); scene.add(sun);
const rim = new THREE.DirectionalLight(0xff6ab0, 1.2); rim.position.set(8, 6, -12); scene.add(rim);

await step(0.25, '準備星空和子彈…');
const space = new Space(scene);
const bullets = new Bullets(scene);
const bursts = new Bursts(scene);
// 玩家的雷射：細長的藍白光
const lasers = new Sprites(scene, 500, (r, q) => vec3(0.4, 0.85, 1).mul(smoothstep(1, 0.2, r)).mul(2.2).add(vec3(1).mul(smoothstep(0.35, 0, q.x.abs()).mul(smoothstep(1, 0.3, q.y.abs())))), { w: 0.22, h: 1.3 });
// 道具：星星（金）、火力（紅）、炸彈（綠）三個 Sprites
const itemS = [0xffd447, 0xff4a5a, 0x5aff8a].map((c) => { const col = new THREE.Color(c); return new Sprites(scene, 200, (r) => vec3(col.r, col.g, col.b).mul(smoothstep(1, 0.4, r)).mul(2.4).add(vec3(1).mul(smoothstep(0.35, 0, r))), { w: 0.8, h: 0.8, order: 8 }); });
const player = playerShip(); scene.add(player);
// 戰場的外框（橫的螢幕兩邊有空間時，看得出哪裡是邊界）
{ const X = FIELD.x + 0.4, Z = FIELD.z + 0.6, g = new THREE.BufferGeometry().setFromPoints([[-X, -Z], [X, -Z], [X, -Z], [X, Z], [X, Z], [-X, Z], [-X, Z], [-X, -Z]].map(([x, z]) => new THREE.Vector3(x, 0.1, z)));
  scene.add(new THREE.LineSegments(g, new THREE.LineBasicNodeMaterial({ color: new THREE.Color(0x8a6aff).multiplyScalar(0.9), transparent: true, opacity: 0.55 }))); }
// 擦彈時機身周圍的光圈
const grazeRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0x9fe8ff).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
grazeRing.rotation.x = -Math.PI / 2; scene.add(grazeRing);

// ---------------------------------------------------------------- 後製：泛光＋炸彈的閃光
await step(0.5, '編譯光影…');
const pipeline = new THREE.RenderPipeline(renderer);
const scenePass = pass(scene, camera);
const flashU = uniform(0);
{ const col = scenePass.getTextureNode(); pipeline.outputNode = col.add(bloom(col, 0.9, 0.45, 0.25)).add(vec3(1, 0.85, 1).mul(flashU)); }
const OFF = params.has('offscreen') ? new THREE.RenderTarget(1, 1) : null;
void uv; void float;

// 鏡頭：從上面斜斜往下看，整個戰場剛好放進畫面
function fitCamera() {
  // 慢慢把鏡頭拉遠，直到戰場四個角（加一點邊）都在畫面裡（透視：靠近鏡頭的下緣看起來比較寬）
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => new THREE.Vector3(sx * (FIELD.x + 0.6), 0, sz * (FIELD.z + 0.8)));
  let d = 20;
  for (let i = 0; i < 200; i++) {
    camera.position.set(0, d * 0.94, d * 0.34); camera.lookAt(0, 0, 0.6); camera.updateMatrixWorld();
    if (corners.every((c) => { const p = c.clone().project(camera); return Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.9; })) break;
    d *= 1.02;
  }
}
fitCamera();
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); fitCamera(); });

// ---------------------------------------------------------------- 狀態
const sound = new Sound(); if (save.soundOff) sound.setOn(false);
const G = {
  phase: 'menu', T: 0, stage: 0, diff: DIFFS[save.diff], score: 0, graze: 0, lives: 3, bombs: 3, power: 1,
  px: 0, pz: 12, inv: 0, fireT: 0, enemies: [], shots: [], items: [], boss: null, wave: 0, st: null, stT: 0, god: params.has('god'),
};
const enemyPool = {};
function getEnemyMesh(type) {
  const list = enemyPool[type] || (enemyPool[type] = []);
  const m = list.pop() || enemyShip(type);
  scene.add(m); return m;
}
function freeEnemyMesh(e) { scene.remove(e.mesh); (enemyPool[e.type] || (enemyPool[e.type] = [])).push(e.mesh); }

// ---------------------------------------------------------------- 彈幕：把關卡裡寫的招式變成發射器
function attack(o, a) {
  const d = G.diff, sp = (a.speed || 6) * d.speed, dens = (n) => (n > 2 ? Math.max(3, Math.round(n * d.density)) : n);
  const aim = Math.atan2(G.px - o.x, G.pz - o.z);
  const base = { x: o.x, z: o.z, vx: o.vx || 0, vz: o.vz || 0, speed: sp, accel: (a.accel || 0) * d.speed, color: a.color || 0, size: a.size ?? 1, curve: a.curve || 0 };
  const rep = a.rep || 1, interval = a.interval || 0.3;
  let id;
  if (a.pat === 'aim') id = bullets.fire({ ...base, ring: a.n || 1, spread: a.spread || 0.2, a0: aim, interval, t1: G.T + (rep - 1) * interval });
  else if (a.pat === 'ring' || a.pat === 'flower') id = bullets.fire({ ...base, ring: dens(a.n || 12), spread: 0, a0: Math.random() * 6.28, spin: a.spin || 0, interval: a.interval || 0.6, t1: G.T + (rep - 1) * (a.interval || 0.6) });
  else if (a.pat === 'spiral') { const iv = 0.09 / Math.max(0.6, d.density); id = bullets.fire({ ...base, ring: a.arms || 3, spread: 0, a0: Math.random() * 6.28, spin: (a.spin || 0.2) * iv / 0.09, interval: iv, t1: G.T + (a.dur || 4) }); }
  else if (a.pat === 'rain') id = bullets.fire({ ...base, ring: 1, a0: 0, interval, t1: G.T + (rep - 1) * interval });
  return id;
}

// ---------------------------------------------------------------- 敵人
function spawn(w) {
  const def = ENEMIES[w.type];
  const e = { ...w, hp: def.hp * (G.diff === DIFFS[2] ? 1.2 : 1), r: def.r, score: def.score, age: 0, x: w.x, z: -19, emit: [], fired: new Set(), mesh: getEnemyMesh(w.type), flash: 0 };
  if (w.path === 'cross') { e.side = w.x < 0 ? -1 : 1; e.x = e.side * 15; e.z = w.z ?? -11; }
  G.enemies.push(e);
}
function pathAt(e, age) {
  const sp = e.speed || 5;
  if (e.path === 'down') return [e.x0 ?? e.x, -19 + sp * age];
  if (e.path === 'sine') return [(e.x0 ?? e.x) + (e.amp || 3) * Math.sin(age * 1.6), -19 + sp * age];
  if (e.path === 'cross') return [e.side * 15 - e.side * sp * age, e.z0 ?? e.z];
  if (e.path === 'stop') {
    const k = Math.min(1, age / 1.6), ease = 1 - (1 - k) ** 3;
    let z = -19 + ((e.stopZ ?? -9) + 19) * ease;
    const out = age - 1.6 - (e.hold || 6); if (out > 0) z -= out * out * 3;   // 時間到了往上飛走
    return [e.x0 ?? e.x, z];
  }
  return [e.x, e.z];
}
function updateEnemies(dt) {
  for (const e of G.enemies) {
    if (e.x0 === undefined) { e.x0 = e.x; e.z0 = e.z; }
    e.age += dt;
    const [x, z] = pathAt(e, e.age), [x2, z2] = pathAt(e, e.age + 0.02);
    e.x = x; e.z = z; const vx = (x2 - x) / 0.02, vz = (z2 - z) / 0.02;
    for (const a of e.atk || []) {
      if (e.fired.has(a) || e.age < a.at) continue;
      e.fired.add(a);
      if (Math.abs(e.x) < FIELD.x && e.z > -FIELD.z && e.z < FIELD.z - 4) { const id = attack({ x, z, vx, vz }, a); if (id != null) e.emit.push(id); }
    }
    e.mesh.position.set(x, 0, z); e.mesh.userData.anim?.(G.T + e.x0);
    e.flash = Math.max(0, e.flash - dt * 6);
    e.mesh.scale.setScalar(1 + e.flash * 0.08);
    if (e.age > 3 && (Math.abs(x) > 17 || z > 21 || z < -21)) e.dead = 'gone';
  }
  for (const e of G.enemies.filter((q) => q.dead)) {
    if (e.dead === 'gone') for (const id of e.emit) bullets.stop(id);
    freeEnemyMesh(e);
  }
  G.enemies = G.enemies.filter((q) => !q.dead);
}
function killEnemy(e) {
  e.dead = 'kill'; for (const id of e.emit) bullets.stop(id);
  G.score += e.score;
  const big = e.type === 'carrier' || e.type === 'turret';
  bursts.add(e.x, e.z, G.T, { kind: 0, speed: big ? 16 : 10, size: big ? 0.6 : 0.4, life: big ? 1.0 : 0.6 });
  if (big) bursts.add(e.x, e.z, G.T + 0.12, { kind: 3, speed: 9, size: 0.45, life: 0.8 });
  sound.kill(false);
  // 掉道具
  const n = big ? 8 : e.type === 'rock' ? 2 : 1;
  for (let i = 0; i < n; i++) dropItem(e.x + (Math.random() - 0.5) * e.r, e.z + (Math.random() - 0.5) * e.r, 0);
  if (Math.random() < (big ? 0.9 : 0.08)) dropItem(e.x, e.z, 1);
  if (big && Math.random() < 0.25) dropItem(e.x, e.z, 2);
}
function dropItem(x, z, kind) { G.items.push({ x, z, vx: (Math.random() - 0.5) * 3, vz: -5 - Math.random() * 3, kind, mag: false }); }

// ---------------------------------------------------------------- 魔王
function spawnBoss() {
  const st = G.st;
  const mesh = bossShip(st.boss); scene.add(mesh);
  const hp = st.bossHp * (G.diff === DIFFS[0] ? 0.7 : G.diff === DIFFS[2] ? 1.25 : 1);
  G.boss = { mesh, hp, max: hp, ph: 0, cyc: 0, age: 0, x: 0, z: -24, inv: 3, fired: new Set(), last: 0 };
  $('boss').classList.remove('hidden'); $('bossName').textContent = st.bossName; sound.warn();
  banner('⚠ 魔王來了', st.bossName);
}
function updateBoss(dt) {
  const B = G.boss; if (!B) return;
  B.age += dt; B.inv = Math.max(0, B.inv - dt);
  const ent = Math.min(1, B.age / 3);
  B.x = Math.sin(B.age * 0.45) * 6 * ent; B.z = -24 + 13.5 * (1 - (1 - ent) ** 3) + Math.sin(B.age * 0.8) * 0.8;
  B.mesh.position.set(B.x, 0, B.z); B.mesh.userData.anim?.(G.T);
  if (B.age < 3) return;
  if (G.show) {
    // 展示：每 0.25 秒開一個發射器，一秒鐘灑 512 顆慢慢飛的子彈（一次大約 4 個發射器在灑），畫面上會累積到一萬多顆
    B.hp = B.max; B.showT = (B.showT || 0) + dt;
    if (B.showT >= 0.32) {
      B.showT -= 0.32; B.k = (B.k || 0) + 1; const k = B.k, sg = k % 2 ? 1 : -1, style = Math.floor(k / 24) % 3;
      bullets.fire({ x: B.x, z: B.z, vx: Math.cos(B.age * 0.45) * 2.7, vz: 0, ring: style === 2 ? 32 : 16, spread: 0, a0: k * 0.37, spin: sg * (style === 1 ? 0.21 : 0.07), interval: style === 2 ? 0.06 : 0.03, t1: G.T + 0.95,
        speed: 2.2 + (k % 3) * 0.6, curve: style === 0 ? sg * 0.15 : style === 1 ? 0 : sg * 0.3, accel: style === 1 ? 0.3 : 0, color: [4, 0, 1, 2, 3, 6][k % 6], size: k % 7 === 0 ? 1 : 0 });
    }
    $('bossHp').style.width = '100%'; $('bossPh').textContent = `子彈 ${(bullets.live || 0).toLocaleString()} 顆`;
    return;
  }
  const ph = G.st.phases[B.ph];
  const prev = B.cyc; B.cyc += dt;
  if (B.cyc >= ph.cycle) { B.cyc -= ph.cycle; B.fired.clear(); }
  for (const a of ph.atk) {
    if (B.fired.has(a) || B.cyc < a.at || (prev > a.at && B.cyc > prev)) continue;
    B.fired.add(a);
    const g = B.mesh.userData.guns[a.gun || 0] || [0, 0];
    attack({ x: B.x + g[0], z: B.z + g[1], vx: Math.cos(B.age * 0.45) * 6 * 0.45, vz: 0 }, a);
  }
  $('bossHp').style.width = (B.hp / B.max * 100).toFixed(1) + '%';
  $('bossPh').textContent = `第 ${B.ph + 1} / ${G.st.phases.length} 段`;
}
function hurtBoss(dmg) {
  const B = G.boss; if (!B || B.inv > 0 || B.age < 3 || G.show) return;
  B.hp -= dmg; G.score += 2;
  const ph = G.st.phases[B.ph];
  if (B.hp <= B.max * ph.until) {
    if (B.ph < G.st.phases.length - 1) {
      // 換招式：畫面上的子彈全部變成星星
      B.ph++; B.cyc = 0; B.fired.clear(); B.inv = 1.5; clearBulletsToStars();
      bursts.add(B.x, B.z, G.T, { kind: 2, speed: 18, size: 0.6, life: 1.0 }); sound.kill(false);
    } else bossDown();
  }
}
function bossDown() {
  const B = G.boss;
  clearBulletsToStars();
  for (let i = 0; i < 6; i++) setTimeout(() => { bursts.add(B.x + (Math.random() - 0.5) * 5, B.z + (Math.random() - 0.5) * 4, G.T, { kind: i % 2 ? 2 : 0, speed: 20, size: 0.8, life: 1.2 }); sound.kill(i === 5); }, i * 180);
  G.score += 20000 * (1 + G.lives * 0.25) | 0;
  setTimeout(() => { scene.remove(B.mesh); }, 1100);
  G.boss = null; $('boss').classList.add('hidden');
  G.phase = 'clear'; G.clearT = 3.5;
  banner('🎉 過關！', `${G.st.bossName}被打倒了`);
}
// 炸彈、魔王換招：子彈消失，變成會自己飛過來的小星星
function clearBulletsToStars() {
  const p = { x: 0, z: 0, r: 0 }; let n = 0;
  for (const id of bullets.used) {
    const v1 = bullets.E[id * 4 + 1], ring = Math.max(1, v1.w);
    const shots = Math.min(Math.floor((Math.min(G.T, v1.y) - v1.x) / v1.z) + 1, Math.floor(PER / ring));
    for (let k = 0; k < shots * ring && n < 160; k += 3) if (bullets.pos(id, k, p)) { G.items.push({ x: p.x, z: p.z, vx: 0, vz: 0, kind: 0, mag: true, small: true }); n++; }
  }
  bullets.cancelAll();
}

// ---------------------------------------------------------------- 玩家
const keys = new Set();
const touch = { id: null, lx: 0, ly: 0, n: 0 };
function bomb() {
  if (G.phase !== 'play' || G.bombs <= 0 || G.dying) return;
  G.bombs--; G.inv = Math.max(G.inv, 3); flashU.value = 0.9; sound.bomb();
  clearBulletsToStars();
  for (const e of G.enemies) { e.hp -= 30; e.flash = 1; if (e.hp <= 0) killEnemy(e); }
  if (G.boss) hurtBoss(60);
  for (let i = 0; i < 4; i++) bursts.add(G.px + Math.cos(i * 1.57) * 3, G.pz + Math.sin(i * 1.57) * 3, G.T + i * 0.06, { kind: 1, speed: 22, size: 0.7, life: 0.9 });
  hud();
}
function playerHit() {
  if (G.god) return;
  G.lives--; G.inv = 3.2; G.power = Math.max(1, G.power - 1); flashU.value = 0.6;
  bursts.add(G.px, G.pz, G.T, { kind: 1, speed: 18, size: 0.6, life: 1.1 }); sound.hit();
  clearBulletsToStars();
  if (G.lives < 0) { G.phase = 'over'; setTimeout(gameOver, 900); }
  hud();
}
function updatePlayer(dt) {
  const slow = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.n >= 2;
  const sp = slow ? 5 : 12;
  let mx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
  let mz = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
  const L = Math.hypot(mx, mz); if (L > 1) { mx /= L; mz /= L; }
  G.px += mx * sp * dt; G.pz += mz * sp * dt;
  G.px = Math.max(-FIELD.x + 0.8, Math.min(FIELD.x - 0.8, G.px)); G.pz = Math.max(-FIELD.z + 1, Math.min(FIELD.z - 1, G.pz));
  G.inv = Math.max(0, G.inv - dt);
  player.position.set(G.px, 0.3, G.pz);
  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -mx * 0.45 - (touch.vx || 0) * 0.4, Math.min(1, dt * 10));
  player.visible = G.inv <= 0 || Math.floor(G.inv * 12) % 2 === 0;
  player.userData.anim(G.T);
  player.userData.core.visible = slow || isTouch;
  // 自動射擊
  G.fireT -= dt;
  if (G.fireT <= 0 && G.phase === 'play') {
    G.fireT = 0.075;
    const pw = G.power, streams = pw === 1 ? [[-0.3, 0], [0.3, 0]] : pw === 2 ? [[-0.4, 0], [0, 0], [0.4, 0]] : pw === 3 ? [[-0.5, -0.06], [-0.2, 0], [0.2, 0], [0.5, 0.06]] : [[-0.7, -0.12], [-0.4, -0.04], [0, 0], [0.4, 0.04], [0.7, 0.12]];
    for (const [ox, ang] of streams) G.shots.push({ x: G.px + ox, z: G.pz - 1.2, vx: Math.sin(ang) * 42 * (slow ? 0.3 : 1), vz: -42 });
    sound.shot();
  }
}
function updateShots(dt) {
  lasers.begin();
  for (const s of G.shots) {
    s.x += s.vx * dt; s.z += s.vz * dt;
    if (s.z < -FIELD.z - 2) { s.dead = true; continue; }
    for (const e of G.enemies) {
      if ((e.x - s.x) ** 2 + (e.z - s.z) ** 2 < e.r * e.r) { s.dead = true; e.hp -= 1; e.flash = 1; if (e.hp <= 0 && !e.dead) killEnemy(e); break; }
    }
    const B = G.boss;
    if (!s.dead && B && (B.x - s.x) ** 2 + (B.z - s.z) ** 2 < 9) { s.dead = true; hurtBoss(1); if (Math.random() < 0.15) bursts.add(s.x, s.z, G.T, { kind: 3, speed: 5, size: 0.2, life: 0.25 }); }
    if (!s.dead) lasers.put(s.x, s.z, Math.atan2(s.vx, s.vz) + Math.PI);
  }
  G.shots = G.shots.filter((s) => !s.dead);
  lasers.end();
}
function updateItems(dt) {
  for (const s of itemS) s.begin();
  for (const it of G.items) {
    const dx = G.px - it.x, dz = G.pz - it.z, d = Math.hypot(dx, dz);
    if (d < 3.2 || G.pz < -8 || it.mag) it.mag = true;
    if (it.mag) { const k = 24 / Math.max(d, 0.3); it.vx = dx * k * 0.5; it.vz = dz * k * 0.5; }
    else { it.vz = Math.min(it.vz + 9 * dt, 4); it.vx *= 0.98; }
    it.x += it.vx * dt; it.z += it.vz * dt;
    if (d < 1.0) {
      it.dead = true;
      if (it.kind === 0) G.score += it.small ? 20 : 100 + G.graze;
      else if (it.kind === 1) { if (G.power < 4) G.power++; else G.score += 1000; }
      else G.bombs = Math.min(6, G.bombs + 1);
      sound.item();
    } else if (it.z > FIELD.z + 2) it.dead = true;
    else itemS[it.kind].put(it.x, it.z, G.T * 2, it.small ? 0.45 : 1);
  }
  G.items = G.items.filter((i) => !i.dead);
  for (const s of itemS) s.end();
}

// ---------------------------------------------------------------- 遊戲流程
// 彈幕展示：無敵、密度很高，魔王輪流用三關全部的招式（看顯示卡一次能畫多少顆子彈）
const SHOW = { name: '展示', speed: 1, density: 3.2, lives: 9, hitR: 0 };
function startShow() { G.show = true; bullets.gain.value = 0.42; G.diff = SHOW; startStage(2, true); G.god = true; G.wave = G.st.waves.length; G.stT = G.st.end + 1; banner('🎆 彈幕展示', '無敵模式：魔王一直灑子彈，看看顯示卡一次能畫幾顆！右上角有現在的子彈數。'); }
function startStage(i, fresh) {
  for (const e of G.enemies) freeEnemyMesh(e);
  if (G.boss) scene.remove(G.boss.mesh);
  bullets.clear(); G.enemies = []; G.shots = []; G.items = []; G.boss = null;
  G.stage = i; G.st = STAGES[i]; G.stT = 0; G.wave = 0; G.phase = 'play'; G.dying = false;
  if (fresh) { G.score = 0; G.graze = 0; G.lives = G.diff.lives; G.bombs = 3; G.power = 1; }
  G.px = 0; G.pz = 12; G.inv = 2;
  space.setStage(G.st.tint[0], G.st.tint[1]);
  $('boss').classList.add('hidden');
  closeAll();
  banner(`第 ${i + 1} 關 · ${G.st.name}`, G.st.intro);
  sound.start(); sound.music([55, 49, 41.2][i]);
  if (isTouch) { $('bombBtn').classList.remove('hidden'); $('touchHint').classList.remove('hidden'); $('touchHint').style.opacity = 1; setTimeout(() => { $('touchHint').style.opacity = 0; }, 6000); }
  hud();
}
function updateStage(dt) {
  if (G.phase === 'clear') {
    G.clearT -= dt;
    if (G.clearT <= 0) {
      save.cleared = Math.max(save.cleared, G.stage + 1); recordBest(); persist();
      if (G.stage < STAGES.length - 1) startStage(G.stage + 1, false);
      else { G.phase = 'done'; showResult(true); }
    }
    return;
  }
  if (G.phase !== 'play') return;
  G.stT += dt;
  const W = G.st.waves;
  while (G.wave < W.length && W[G.wave].t <= G.stT) spawn(W[G.wave++]);
  if (!G.boss && G.wave >= W.length && G.stT > G.st.end && G.enemies.length === 0) spawnBoss();
}
function recordBest() { const k = `${save.diff}`; save.best[k] = Math.max(save.best[k] || 0, G.score); }
function gameOver() {
  recordBest(); persist();
  $('rTitle').textContent = '被擊墜了…'; $('rScore').textContent = G.score.toLocaleString();
  $('rText').textContent = `在第 ${G.stage + 1} 關「${G.st.name}」。接關的話分數會歸零，從這一關重新開始。`;
  $('rGo').textContent = '接關（這一關重來）'; $('rGo').onclick = () => startStage(G.stage, true);
  $('result').classList.remove('hidden'); sound.stopMusic(); $('bombBtn').classList.add('hidden');
}
function showResult() {
  $('rTitle').textContent = `🏆 全部過關！（${G.diff.name}）`; $('rScore').textContent = G.score.toLocaleString();
  $('rText').textContent = `擦彈 ${G.graze} 次。${save.diff < 2 ? '試試看更難的難度吧！' : '你是真正的彈幕高手！'}`;
  $('rGo').textContent = '再玩一次'; $('rGo').onclick = () => startStage(0, true);
  $('result').classList.remove('hidden'); sound.stopMusic(); $('bombBtn').classList.add('hidden');
}
let bannerT;
function banner(t, p) { $('bnT').textContent = t; $('bnP').textContent = p || ''; $('banner').style.opacity = 1; clearTimeout(bannerT); bannerT = setTimeout(() => { $('banner').style.opacity = 0; }, 3800); }
let hudCache = '', liveT = 0;
function hud() {
  liveT -= 1 / 60;
  if (liveT <= 0) { liveT = 0.25; $('bcount').textContent = `${WEBGPU ? 'WebGPU' : '相容模式'} · 子彈 ${(bullets.live || 0).toLocaleString()} 顆`; }
  const s = `${G.score}|${G.graze}|${G.lives}|${G.bombs}|${G.power}`; if (s === hudCache) return; hudCache = s;
  $('score').textContent = G.score.toLocaleString(); $('grazeN').textContent = G.graze;
  $('lives').textContent = G.lives >= 0 ? '❤️'.repeat(Math.min(G.lives, 6)) || '—' : '—'; $('bombs').textContent = '💣'.repeat(G.bombs) || '—'; $('power').textContent = G.power === 4 ? 'MAX' : G.power;
}

// ---------------------------------------------------------------- 選單
function closeAll() { for (const id of ['menu', 'pause', 'result']) $(id).classList.add('hidden'); }
function showMenu() {
  G.phase = 'menu'; sound.stopMusic(); closeAll(); $('menu').classList.remove('hidden'); $('bombBtn').classList.add('hidden'); $('boss').classList.add('hidden');
  const seg = $('diffSeg'); for (const b of seg.children) b.classList.toggle('on', +b.dataset.v === save.diff);
  const L = $('stageList'); L.innerHTML = '';
  STAGES.forEach((st, i) => {
    const b = document.createElement('button'); b.className = 'card'; b.disabled = i > save.cleared;
    b.innerHTML = `<div class="h">${i + 1}. ${st.name}</div><p>魔王：${i <= save.cleared ? st.bossName : '？？？'}</p>`;
    b.onclick = () => { G.show = false; bullets.gain.value = 1; G.diff = DIFFS[save.diff]; G.god = params.has('god'); startStage(i, true); }; L.appendChild(b);
  });
  const sb = document.createElement('button'); sb.className = 'card';
  sb.innerHTML = `<div class="h">🎆 彈幕展示</div><p>無敵、超高密度：看顯示卡同時畫上萬顆子彈</p>`;
  sb.onclick = startShow; L.appendChild(sb);
  $('bestTxt').textContent = DIFFS.map((d, i) => `${d.name}最高分 ${(save.best[i] || 0).toLocaleString()}`).join(' · ');
}
$('diffSeg').onclick = (e) => { const v = e.target.dataset && e.target.dataset.v; if (v == null) return; save.diff = +v; G.diff = DIFFS[save.diff]; persist(); showMenu(); };
function pause(v) {
  if (G.phase !== 'play' && G.phase !== 'paused' && G.phase !== 'clear') return;
  if (v && G.phase !== 'paused') { G.prevPhase = G.phase; G.phase = 'paused'; $('pause').classList.remove('hidden'); }
  else if (!v && G.phase === 'paused') { G.phase = G.prevPhase; $('pause').classList.add('hidden'); }
}
$('pauseBtn').onclick = () => pause(G.phase !== 'paused');
$('resumeBtn').onclick = () => pause(false);
$('quitBtn').onclick = () => { recordBest(); persist(); showMenu(); };
$('rMenu').onclick = showMenu;
$('bombBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); bomb(); });
$('soundBtn').onclick = () => { sound.start(); sound.setOn(!sound.on); save.soundOff = !sound.on; persist(); $('soundBtn').textContent = sound.on ? '🔊' : '🔇'; };
$('soundBtn').textContent = sound.on ? '🔊' : '🔇';
addEventListener('keydown', (e) => {
  keys.add(e.code); sound.start();
  if (e.code === 'KeyX' || e.code === 'Space' || e.code === 'KeyK') { e.preventDefault(); bomb(); }
  if (e.code === 'Escape' || e.code === 'KeyP') pause(G.phase !== 'paused');
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); pause(true); });
// 觸控：手指在任何地方拖曳，戰機照著手指移動的距離走（不會被手指擋住）
const ptrs = new Map();
canvas.addEventListener('pointerdown', (e) => { sound.start(); canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); touch.n = ptrs.size; });
canvas.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p || G.phase !== 'play') { if (p) { p.x = e.clientX; p.y = e.clientY; } return; }
  if ([...ptrs.keys()][0] !== e.pointerId) { p.x = e.clientX; p.y = e.clientY; return; }   // 只看第一根手指
  const k = (FIELD.z * 2 + 3) / innerHeight * 1.35 * (ptrs.size >= 2 ? 0.45 : 1);
  const dx = (e.clientX - p.x) * k, dz = (e.clientY - p.y) * k; p.x = e.clientX; p.y = e.clientY;
  G.px = Math.max(-FIELD.x + 0.8, Math.min(FIELD.x - 0.8, G.px + dx)); G.pz = Math.max(-FIELD.z + 1, Math.min(FIELD.z - 1, G.pz + dz));
  touch.vx = Math.max(-1, Math.min(1, dx * 3));
});
const endP = (e) => { ptrs.delete(e.pointerId); touch.n = ptrs.size; touch.vx = 0; };
canvas.addEventListener('pointerup', endP); canvas.addEventListener('pointercancel', endP);

// ---------------------------------------------------------------- 主迴圈（固定 1/60 秒一步）
let grazeGlow = 0;
function update(dt) {
  if (G.phase === 'play' || G.phase === 'clear' || G.phase === 'over') {
    G.T += dt;
    updateStage(dt);
    if (G.phase !== 'over') updatePlayer(dt);
    updateEnemies(dt); updateBoss(dt); updateShots(dt); updateItems(dt);
    const r = bullets.update(G.T, G.px, G.pz, G.diff.hitR, 1.0);
    if (G.phase === 'play' && r.hit && G.inv <= 0) playerHit();
    if (r.grazed && G.phase === 'play') { G.graze += r.grazed; G.score += 10 * r.grazed; grazeGlow = 1; sound.graze(); }
    // 敵人撞到玩家
    for (const e of G.enemies) if (G.inv <= 0 && G.phase === 'play' && (e.x - G.px) ** 2 + (e.z - G.pz) ** 2 < (e.r * 0.7) ** 2) playerHit();
    hud();
  } else if (G.phase === 'menu') { G.T += dt * 0.3; bullets.update(G.T, 99, 99, 0, 0); }
  space.scroll.value += dt * (G.phase === 'paused' ? 0 : 6);
  bursts.update(G.T);
  flashU.value = Math.max(0, flashU.value - dt * 1.8);
  grazeGlow = Math.max(0, grazeGlow - dt * 4);
  grazeRing.position.set(G.px, 0.25, G.pz); grazeRing.material.opacity = grazeGlow * 0.8;
}
function render() {
  if (OFF) { OFF.setSize(Math.round(innerWidth * renderer.getPixelRatio()), Math.round(innerHeight * renderer.getPixelRatio())); renderer.setRenderTarget(OFF); }
  pipeline.render();
  if (OFF) renderer.setRenderTarget(null);
}
let last = performance.now(), acc = 0;
function frame() {
  const now = performance.now(); acc += Math.min(0.1, (now - last) / 1000); last = now;
  let n = 0; while (acc >= 1 / 60 && n < 4) { if (G.phase !== 'paused') update(1 / 60); acc -= 1 / 60; n++; }
  render();
}

await step(0.8, '暖機…');
showMenu();
await step(1, '好了！');
{ const el = $('loading'); el.style.opacity = 0; setTimeout(() => el.remove(), 600); }
if (!params.has('paused')) renderer.setAnimationLoop(frame);
window.__ready = true;

// ---------------------------------------------------------------- 測試掛勾
window.__bh = {
  G, bullets, renderer, WEBGPU, NE, PER,
  start(i = 0, d = 1) { save.diff = d; G.diff = DIFFS[d]; G.show = false; bullets.gain.value = 1; startStage(i, true); },
  show: () => startShow(),
  sim(sec) { for (let i = 0; i < sec * 60; i++) if (G.phase !== 'paused') update(1 / 60); },
  boss() { G.wave = G.st.waves.length; G.stT = G.st.end + 1; for (const e of G.enemies) e.dead = 'gone'; },
  async snap(sec = 0) {
    renderer.setAnimationLoop(null);
    if (sec) this.sim(sec);
    const rt = OFF || new THREE.RenderTarget(innerWidth, innerHeight);
    if (!OFF) { renderer.setRenderTarget(rt); pipeline.render(); renderer.setRenderTarget(null); } else render();
    const w = rt.width, h = rt.height, px = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const xx = c.getContext('2d'); xx.putImageData(new ImageData(new Uint8ClampedArray(px.buffer, px.byteOffset, w * h * 4), w, h), 0, 0);
    if (!WEBGPU) { xx.save(); xx.scale(1, -1); xx.drawImage(c, 0, -h); xx.restore(); }
    if (!params.has('paused')) renderer.setAnimationLoop(frame);
    return c.toDataURL('image/jpeg', 0.85);
  },
};
