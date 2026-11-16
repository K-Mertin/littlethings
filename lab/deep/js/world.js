// 海底世界：地形、珊瑚礁、昆布、海面、光束、海雪、熱泉
// 座標：x 左右、z 往前越來越深（z −170 珊瑚礁淺海 → z +170 深海海溝），y 是高度（海面 0，往下是負的）
import * as THREE from 'three';
import { staghornGeo, brainGeo, tableGeo, fingerGeo, seaFanGeo, coralMaterial, CORAL_COLORS } from './coral.js';
import {
  Fn, uniform, float, vec2, vec3, vec4, mix, smoothstep, pow, sin, cos, abs, exp, max, min, clamp, time, hash, uv, atan,
  positionWorld, positionLocal, positionGeometry, normalWorld, instanceIndex, instancedArray, billboarding, mx_worley_noise_float, mx_noise_float, fract, length, cameraPosition,
} from 'three/tsl';

// ---------------------------------------------------------------- 地形高度（CPU；碰撞、擺東西都用這個）
function hash2(x, z) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; } return s; }
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const SIZE = 360, HALF = SIZE / 2;
export const VENT = new THREE.Vector3(-18, 0, 140);
export function floorY(x, z) {
  const f = sstep(-40, 75, z);
  let y = -15 + (-90 + 15) * f;
  y += (fbm(x * 0.018 + 7, z * 0.018) - 0.5) * 12 + (fbm(x * 0.08, z * 0.08 + 3) - 0.5) * 2.6;
  // 珊瑚礁的小丘
  y += sstep(-20, -60, z) * Math.max(0, fbm(x * 0.05 + 11, z * 0.05 - 4) - 0.45) * 14;
  // 海溝
  const tx = x - VENT.x - 12 * Math.sin(z * 0.025);
  y -= sstep(85, 125, z) * (1 - sstep(18, 55, Math.abs(tx))) * 24;
  // 四周邊界往上翹，看起來像海盆
  const edge = Math.max(Math.abs(x), Math.abs(z));
  y += sstep(HALF - 40, HALF, edge) * 30;
  return y;
}
export const isReef = (x, z) => z < -30 && floorY(x, z) > -32;

// 固定種子的亂數（每次擺的位置一樣）
export function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------------------------------------------------------------- 水底光紋
export const causticNode = Fn(([p]) => {
  const q = vec3(p.x.mul(0.21), p.z.mul(0.21), time.mul(0.32));
  const a = mx_worley_noise_float(q);
  const b = mx_worley_noise_float(q.mul(1.63).add(vec3(3.1, 1.7, time.mul(0.13))));
  return pow(smoothstep(0.32, 0.95, a), 2.2).mul(0.75).add(pow(smoothstep(0.32, 0.95, b), 2.2).mul(0.45));
});
// 越深陽光越弱
export const sunAt = Fn(([y]) => exp(y.div(15)));

export function buildWorld(scene, { high, webgpu }) {
  const W = { poi: {}, update: null, trash: [], solid: [] };
  const R = rng(20261116);

  // ---------------- 地形
  const segs = high ? 260 : 170;
  const g = new THREE.PlaneGeometry(SIZE, SIZE, segs, segs);
  g.rotateX(-Math.PI / 2);
  const pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) pa.setY(i, floorY(pa.getX(i), pa.getZ(i)));
  g.computeVertexNormals();
  const tm = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
  const wp = positionWorld;
  const slope = normalWorld.y;
  const n = mx_noise_float(wp.mul(0.35)).mul(0.5).add(0.5);
  // 沙紋：海流在沙上推出一條一條的波紋，加上細小的顆粒
  const n2 = mx_noise_float(wp.mul(2.4)).mul(0.5).add(0.5);
  const sandWave = sin(wp.x.mul(1.7).add(wp.z.mul(0.6)).add(mx_noise_float(wp.mul(0.12)).mul(4))).mul(0.5).add(0.5);
  const sand = mix(vec3(0.5, 0.46, 0.36), vec3(0.62, 0.57, 0.44), n).mul(mix(0.86, 1.04, sandWave)).mul(mix(0.92, 1.05, n2));
  const rock = mix(vec3(0.33, 0.32, 0.31), vec3(0.42, 0.4, 0.37), n);
  const mud = vec3(0.24, 0.24, 0.26);
  tm.colorNode = mix(mud, mix(rock, sand, smoothstep(0.78, 0.93, slope)), smoothstep(-85, -38, wp.y));
  tm.emissiveNode = vec3(0.5, 0.82, 1).mul(causticNode(wp)).mul(sunAt(wp.y)).mul(smoothstep(0.5, 0.9, slope)).mul(0.5);
  const terrain = new THREE.Mesh(g, tm);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ---------------- 擺東西的工具
  const place = (filter, tries = 60) => {
    for (let k = 0; k < tries; k++) {
      const x = (R() - 0.5) * (SIZE - 70), z = (R() - 0.5) * (SIZE - 70);
      if (filter(x, z)) return new THREE.Vector3(x, floorY(x, z), z);
    }
    return null;
  };
  const near = (cx, cz, r) => { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r; const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; return new THREE.Vector3(x, floorY(x, z), z); };
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), E = new THREE.Euler(), C = new THREE.Color();
  const inst = (geo, mat, list, colors) => {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((o, i) => {
      E.set(o.rx || 0, o.ry || 0, o.rz || 0); Q.setFromEuler(E); S.setScalar(o.s || 1); if (o.sv) S.copy(o.sv);
      M4.compose(o.p, Q, S); m.setMatrixAt(i, M4);
      if (colors) m.setColorAt(i, C.set(colors[i % colors.length]).offsetHSL((R() - 0.5) * 0.04, 0, (R() - 0.5) * 0.08));
    });
    m.castShadow = high; m.receiveShadow = true;
    scene.add(m); return m;
  };

  // ---------------- 珊瑚礁中心
  const REEF = new THREE.Vector3(-10, 0, -112); REEF.y = floorY(REEF.x, REEF.z);
  W.poi.coral = { p: REEF.clone().add(new THREE.Vector3(0, 3, 0)), r: 18 };

  // 珊瑚：形狀、花紋、顏色在 coral.js
  const stagGeo = staghornGeo(7), stagGeo2 = staghornGeo(19), brGeo = brainGeo(), tabGeo = tableGeo(5), fingGeo = fingerGeo(3);
  const stagMat = coralMaterial({ tipPale: 0.6, pores: 14 }), brainMat = coralMaterial({ brain: true, pores: 6 }), tableMat = coralMaterial({ tipPale: 0.35, pores: 18 }), fingMat = coralMaterial({ tipPale: 0.45, pores: 16 });
  const cnt = high ? 1 : 0.6;
  const reefPick = () => { const p = near(REEF.x, REEF.z, 55); return isReef(p.x, p.z) ? p : null; };
  // 珊瑚長成一叢一叢的（真的珊瑚礁是一塊一塊密密的，中間有沙地）
  const clusters = Array.from({ length: 46 }, () => reefPick()).filter(Boolean);
  const clusterPick = () => { const c = clusters[Math.floor(R() * clusters.length)]; const a = R() * 6.28, d = Math.sqrt(R()) * 6.5; const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d; return isReef(x, z) ? new THREE.Vector3(x, floorY(x, z) - 0.05, z) : null; };
  const listOf = (n, sMin, sMax) => { const out = []; for (let i = 0; i < n * cnt; i++) { const p = R() < 0.8 ? clusterPick() : reefPick(); if (p) out.push({ p, ry: R() * 6.28, s: sMin + R() * (sMax - sMin) }); } return out; };
  inst(stagGeo, stagMat, listOf(230, 0.9, 2.2), CORAL_COLORS.stag);
  inst(stagGeo2, stagMat, listOf(210, 0.9, 2.2), CORAL_COLORS.stag.slice().reverse());
  inst(brGeo, brainMat, listOf(200, 0.5, 1.5), CORAL_COLORS.brain);
  inst(tabGeo, tableMat, listOf(55, 0.7, 1.4), CORAL_COLORS.table);
  inst(fingGeo, fingMat, listOf(220, 0.7, 1.5), CORAL_COLORS.finger);

  // 石頭：到處都有
  const rockGeo = (() => {
    const s = new THREE.SphereGeometry(1, 14, 10); const a = s.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
      const k = 0.82 + 0.3 * vnoise(x * 1.7 + 5, z * 1.7 + y * 1.3);
      a.setXYZ(i, x * k, y * k * 0.7, z * k);
    }
    s.computeVertexNormals(); return s;
  })();
  const rocks = [];
  for (let i = 0; i < 260 * cnt; i++) { const p = place(() => true); if (p) rocks.push({ p: p.clone().add(new THREE.Vector3(0, -0.3, 0)), ry: R() * 6, rx: R() * 0.3, s: 0.6 + R() * R() * 3.5 }); }
  inst(rockGeo, new THREE.MeshStandardNodeMaterial({ roughness: 0.9, color: 0x8a847a }), rocks);

  // 章魚的大石頭
  const OCTO = new THREE.Vector3(28, 0, -95); OCTO.y = floorY(OCTO.x, OCTO.z);
  const bigRock = new THREE.Mesh(rockGeo, new THREE.MeshStandardNodeMaterial({ roughness: 0.9, color: 0x8a847a }));
  bigRock.position.copy(OCTO).add(new THREE.Vector3(0, 0.6, 0)); bigRock.scale.set(3.4, 3, 3.2); bigRock.castShadow = bigRock.receiveShadow = true;
  scene.add(bigRock);
  W.poi.octopusRock = OCTO.clone().add(new THREE.Vector3(0, 2.7, 0));
  W.solid.push({ p: bigRock.position.clone(), r: 3.2 });

  // ---------------- 昆布森林
  const KELP = new THREE.Vector3(-62, 0, -78); KELP.y = floorY(KELP.x, KELP.z);
  W.poi.kelp = { p: KELP.clone().add(new THREE.Vector3(0, 6, 0)), r: 16 };
  // 自己做 instancing（每棵的位置、高度、方向放在 storage buffer），這樣頂點 shader 可以直接拿到「這一棵的第幾公分」來擺動
  // （InstancedMesh 的 positionNode 在 three 0.187 會跳過每棵的矩陣）
  const sway = ({ geo, mat, data, amp, speed, narrow = 0, lean = null }) => {
    const D = instancedArray(new Float32Array(data.flatMap((d) => [d.x, d.y, d.z, d.h])), 'vec4');
    const E2 = instancedArray(new Float32Array(data.flatMap((d) => [d.yaw, d.lx || 0, d.lz || 0, 0])), 'vec4');
    mat.positionNode = Fn(() => {
      const d = D.element(instanceIndex), e = E2.element(instanceIndex);
      const g = positionGeometry, h = g.y, ph = hash(instanceIndex).mul(6.28), k = h.mul(h);
      const lx = g.x.mul(mix(1, 1 - narrow, h)).toVar(), lz = g.z.toVar();
      const c = cos(e.x), s = sin(e.x);
      const rx = lx.mul(c).add(lz.mul(s)), rz = lz.mul(c).sub(lx.mul(s));
      const sx = sin(time.mul(speed).add(ph).add(h.mul(2.2))).mul(k).mul(amp).add(e.y.mul(h));
      const sz = cos(time.mul(speed * 0.8).add(ph).add(h.mul(1.7))).mul(k).mul(amp * 0.7).add(e.z.mul(h));
      return vec3(rx.add(sx), h.mul(d.w), rz.add(sz)).add(d.xyz);
    })();
    const m = new THREE.Mesh(geo, mat); m.count = data.length; m.frustumCulled = false; m.receiveShadow = true;
    scene.add(m); return m;
  };
  const kelpGeo = new THREE.PlaneGeometry(0.7, 1, 1, 14); kelpGeo.translate(0, 0.5, 0);
  const kelpMat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.7 });
  kelpMat.colorNode = mix(vec3(0.28, 0.24, 0.07), vec3(0.45, 0.55, 0.12), uv().y);
  const kelps = [];
  for (let i = 0; i < 260 * cnt; i++) { const p = near(KELP.x, KELP.z, 20); kelps.push({ x: p.x, y: p.y, z: p.z, h: 7 + R() * 9, yaw: R() * 6.28 }); }
  sway({ geo: kelpGeo, mat: kelpMat, data: kelps, amp: 2.2, speed: 0.9, narrow: 0.45 });

  // ---------------- 海葵（小丑魚的家）
  const ANEM = new THREE.Vector3(6, 0, -128); ANEM.y = floorY(ANEM.x, ANEM.z);
  W.poi.anemone = { p: ANEM.clone().add(new THREE.Vector3(0, 1, 0)), r: 7 };
  {
    const tg = new THREE.CylinderGeometry(0.035, 0.06, 1, 5, 6); tg.translate(0, 0.5, 0);
    const am = new THREE.MeshStandardNodeMaterial({ roughness: 0.6 });
    am.colorNode = mix(vec3(0.85, 0.5, 0.65), vec3(1, 0.85, 0.95), uv().y);
    am.emissiveNode = vec3(0.6, 0.2, 0.5).mul(uv().y.pow(4)).mul(0.25);
    const list = [];
    for (let i = 0; i < 160; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 1.1;
      list.push({ x: ANEM.x + Math.cos(a) * d, y: ANEM.y + 0.3, z: ANEM.z + Math.sin(a) * d, h: 0.8 + R() * 0.7, yaw: 0, lx: Math.cos(a) * d * 0.45, lz: Math.sin(a) * d * 0.45 });
    }
    sway({ geo: tg, mat: am, data: list, amp: 0.25, speed: 1.6 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.5, 20), new THREE.MeshStandardNodeMaterial({ color: 0x8e4a6a, roughness: 0.7 }));
    base.position.copy(ANEM).add(new THREE.Vector3(0, 0.15, 0)); scene.add(base);
  }

  // ---------------- 海草地毯：沙地上一叢一叢會擺動的短草
  {
    const g = new THREE.PlaneGeometry(0.12, 1, 1, 4); g.translate(0, 0.5, 0);
    const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.8 });
    m.colorNode = mix(vec3(0.18, 0.32, 0.1), vec3(0.42, 0.62, 0.2), uv().y);
    const blades = [];
    const patches = high ? 70 : 40;
    for (let k = 0; k < patches; k++) {
      const c = place((x, z) => z > -165 && z < 30 && floorY(x, z) > -45);
      if (!c) continue;
      const n = 30 + Math.floor(R() * 40);
      for (let i = 0; i < n * cnt; i++) {
        const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 3.2, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
        blades.push({ x, y: floorY(x, z), z, h: 0.5 + R() * 0.9, yaw: R() * 6.28 });
      }
    }
    sway({ geo: g, mat: m, data: blades, amp: 0.25, speed: 1.4, narrow: 0.7 });
  }
  // ---------------- 柳珊瑚（海扇）：平面上一直分岔的細枝
  {
    const g = seaFanGeo(11), g2 = seaFanGeo(29);
    const m = coralMaterial({ tipPale: 0.15, pores: 30 });
    const fans = [];
    for (let i = 0; i < 70 * cnt; i++) { const p = reefPick(); if (p) fans.push({ p, ry: R() * 6.28, s: 1.4 + R() * 1.6 }); }
    const half = Math.floor(fans.length / 2);
    inst(g, m, fans.slice(0, half), CORAL_COLORS.fan).castShadow = false;
    inst(g2, m, fans.slice(half), CORAL_COLORS.fan.slice().reverse()).castShadow = false;
  }
  // ---------------- 貝殼、海膽
  {
    const shell = new THREE.SphereGeometry(0.25, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); shell.scale(1, 0.5, 1.2);
    const urch = new THREE.IcosahedronGeometry(0.22, 0);
    const spikes = [];
    for (let i = 0; i < 14; i++) { const c = new THREE.ConeGeometry(0.03, 0.4, 3); const d = new THREE.Vector3().randomDirection(); d.y = Math.abs(d.y) * 0.8 + 0.1; d.normalize(); c.translate(0, 0.2, 0); c.lookAt(d); c.rotateX(Math.PI / 2); spikes.push(c); }
    const urchin = mergeGeos([urch, ...spikes]);
    const sl = [], ul = [];
    for (let i = 0; i < 160 * cnt; i++) { const p = place((x, z) => z < 40 && floorY(x, z) > -60); if (p) sl.push({ p: p.add(new THREE.Vector3(0, 0.05, 0)), ry: R() * 6, s: 0.6 + R() * 0.9 }); }
    for (let i = 0; i < 90 * cnt; i++) { const p = reefPick(); if (p) ul.push({ p: p.add(new THREE.Vector3(0, 0.1, 0)), ry: R() * 6, s: 0.8 + R() * 0.6 }); }
    inst(shell, new THREE.MeshStandardNodeMaterial({ roughness: 0.4 }), sl, ['#f4e3d0', '#f7c6b5', '#e8d7a8', '#fff3e6']);
    inst(urchin, new THREE.MeshStandardNodeMaterial({ roughness: 0.6 }), ul, ['#2b1a3a', '#4a1f4f', '#1d1d2b']);
  }

  // ---------------- 海星
  const starGeo = (() => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? 0.22 : 0.6; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    const e = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 });
    e.rotateX(-Math.PI / 2); return e;
  })();
  const stars = [];
  for (let i = 0; i < 26; i++) { const p = place((x, z) => z > -150 && z < 40 && floorY(x, z) > -55); if (p) stars.push({ p: p.add(new THREE.Vector3(0, 0.05, 0)), ry: R() * 6, s: 0.7 + R() * 0.6 }); }
  inst(starGeo, new THREE.MeshStandardNodeMaterial({ roughness: 0.7 }), stars, ['#ff7a3d', '#e84393', '#fdcb6e', '#a55eea']);
  W.poi.starfish = stars.slice(0, 26).map((o) => ({ p: o.p, r: 4 }));

  // ---------------- 熱泉＋管蟲（最深的海溝）
  VENT.y = floorY(VENT.x, VENT.z);
  W.poi.vent = { p: VENT.clone().add(new THREE.Vector3(0, 3, 0)), r: 12 };
  {
    const rockM = new THREE.MeshStandardNodeMaterial({ color: 0x2a2624, roughness: 0.95 });
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5 + i * 0.1, 1.4 - i * 0.2, 2.2, 10), rockM);
      c.position.copy(VENT).add(new THREE.Vector3((R() - 0.5) * 0.4, 1.1 + i * 2, (R() - 0.5) * 0.4)); c.castShadow = true; scene.add(c);
    }
    W.solid.push({ p: VENT.clone().add(new THREE.Vector3(0, 3, 0)), r: 1.8 });
    const tubes = [], plumes = [];
    for (let i = 0; i < 70; i++) {
      const a = R() * Math.PI * 2, d = 2.2 + R() * 5, h = 0.8 + R() * 2.2;
      const x = VENT.x + Math.cos(a) * d, z = VENT.z + Math.sin(a) * d, y = floorY(x, z);
      tubes.push({ p: new THREE.Vector3(x, y, z), sv: new THREE.Vector3(1, h, 1), rx: (R() - 0.5) * 0.2, rz: (R() - 0.5) * 0.2 });
      plumes.push({ p: new THREE.Vector3(x, y + h, z), s: 0.9 + R() * 0.4 });
    }
    const tg = new THREE.CylinderGeometry(0.07, 0.09, 1, 6); tg.translate(0, 0.5, 0);
    inst(tg, new THREE.MeshStandardNodeMaterial({ color: 0xe8e2d6, roughness: 0.6 }), tubes);
    const pg = new THREE.ConeGeometry(0.16, 0.36, 7); pg.translate(0, 0.16, 0);
    const pm = new THREE.MeshStandardNodeMaterial({ color: 0xd8282e, roughness: 0.5 });
    pm.emissiveNode = vec3(0.45, 0.02, 0.02).mul(sin(time.mul(1.5).add(hash(instanceIndex).mul(6))).mul(0.3).add(0.7));
    inst(pg, pm, plumes);
    const glow = new THREE.PointLight(0xff7a2a, 40, 30, 1.6); glow.position.copy(VENT).add(new THREE.Vector3(0, 5, 0)); scene.add(glow);
    // 熱水煙：一直往上冒的黑煙
    const N = 500, sm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const life = fract(time.mul(0.18).add(hash(instanceIndex)));
    const off = vec3(hash(instanceIndex.add(3)).sub(0.5).mul(life.mul(5).add(0.3)), life.mul(26).add(7.5), hash(instanceIndex.add(7)).sub(0.5).mul(life.mul(5).add(0.3)));
    sm.positionNode = positionGeometry.mul(life.mul(3).add(0.6)).add(vec3(VENT.x, VENT.y, VENT.z)).add(off);
    sm.vertexNode = billboarding();
    sm.colorNode = mix(vec3(0.6, 0.25, 0.1), vec3(0.06, 0.06, 0.07), smoothstep(0, 0.2, life));
    sm.opacityNode = smoothstep(0.5, 0.0, uv().sub(0.5).length()).mul(float(1).sub(life)).mul(0.5);
    const smoke = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sm); smoke.count = N; smoke.frustumCulled = false; scene.add(smoke);
  }

  // ---------------- 垃圾
  {
    const bottleG = mergeGeos([new THREE.CylinderGeometry(0.16, 0.16, 0.6, 10).translate(0, 0.3, 0), new THREE.CylinderGeometry(0.06, 0.16, 0.25, 10).translate(0, 0.72, 0)]);
    bottleG.rotateZ(Math.PI / 2);
    const canG = new THREE.CylinderGeometry(0.13, 0.13, 0.4, 12); canG.rotateZ(Math.PI / 2);
    const bagG = (() => { const s = new THREE.SphereGeometry(0.45, 10, 8); const a = s.attributes.position, r = rng(5); for (let i = 0; i < a.count; i++) { const k = 0.7 + r() * 0.5; a.setXYZ(i, a.getX(i) * k, a.getY(i) * k * 0.5, a.getZ(i) * k); } s.computeVertexNormals(); return s; })();
    const kinds = [
      [bottleG, new THREE.MeshStandardNodeMaterial({ color: 0x3fae6a, roughness: 0.2, transparent: true, opacity: 0.8 })],
      [canG, new THREE.MeshStandardNodeMaterial({ color: 0xd63031, roughness: 0.4, metalness: 0.6 })],
      [bagG, new THREE.MeshStandardNodeMaterial({ color: 0xf1f2f6, roughness: 0.6, transparent: true, opacity: 0.75 })],
    ];
    for (let i = 0; i < 20; i++) {
      const p = place((x, z) => z < 50 && floorY(x, z) > -60 && Math.hypot(x, z + 135) > 12);
      if (!p) continue;
      const [geo, mat] = kinds[i % 3];
      const m = new THREE.Mesh(geo, mat); m.position.copy(p).add(new THREE.Vector3(0, 0.2, 0)); m.rotation.set(R() * 0.5, R() * 6, R() * 0.5);
      m.castShadow = true; scene.add(m);
      W.trash.push(m);
    }
  }

  // ---------------- 海面（從下面往上看）
  const surfM = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false });
  const sp = positionWorld;
  const ripple = causticNode(sp.mul(0.8));
  // 斯涅耳窗：從水裡往上看，只有頭頂一個圓（約 97° 寬）看得到天空，又亮又會晃；
  // 圓外面是「全反射」，看起來是暗暗的、反射水下的藍綠色。圓的邊緣有一圈亮亮的彩色光。
  const vdir = sp.sub(cameraPosition).normalize();
  const cosA = vdir.y;                                                   // 往上看 = 1
  const wobble = ripple.sub(0.5).mul(0.06);
  const inWin = smoothstep(0.62, 0.7, cosA.add(wobble));
  const rim = smoothstep(0.06, 0.0, cosA.add(wobble).sub(0.66).abs());
  const skyC = mix(vec3(0.55, 0.85, 0.95), vec3(1, 1, 1), ripple.mul(0.9)).mul(1.35);
  const tirC = mix(vec3(0.03, 0.2, 0.26), vec3(0.12, 0.42, 0.5), ripple.mul(0.7));
  surfM.colorNode = mix(tirC, skyC, inWin).add(vec3(0.9, 0.95, 1).mul(rim).mul(0.5));
  W.surfFade = uniform(1);
  surfM.opacityNode = W.surfFade.mul(0.92);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 1.5, SIZE * 1.5), surfM);
  surf.rotation.x = Math.PI / 2; surf.position.y = 0; scene.add(surf);

  // ---------------- 背景：一顆包住鏡頭的大球，經過同樣的霧，遠方和霧色完全一樣
  // 往上越亮（光從海面來）、往下越暗；水平方向剛好等於霧的顏色，和遠方接得起來
  const domeM = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
  W.fogU = uniform(new THREE.Color(0x0b5a74));
  const dy = positionWorld.sub(cameraPosition).normalize().y;
  domeM.colorNode = W.fogU.mul(mix(mix(float(0.35), float(1), smoothstep(-0.7, 0, dy)), float(1.9), smoothstep(0, 0.9, dy)));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(360, 32, 16), domeM);
  dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);
  W.dome = dome;

  // ---------------- 陽光光束：幾片疊加的長條，跟著鏡頭轉
  const rayK = uniform(1);
  const rayM = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const ru = uv();
  rayM.colorNode = vec3(0.55, 0.85, 1);
  rayM.opacityNode = pow(float(1).sub(abs(ru.x.sub(0.5)).mul(2)), 2.5).mul(smoothstep(0, 0.7, ru.y)).mul(rayK).mul(0.09)
    .mul(sin(time.mul(0.6).add(hash(instanceIndex).mul(6))).mul(0.35).add(0.65));
  const RN = 26;
  const rays = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), rayM, RN); rays.frustumCulled = false;
  const rayData = Array.from({ length: RN }, () => ({ x: (R() - 0.5) * 90, z: (R() - 0.5) * 90, w: 2 + R() * 6, tilt: (R() - 0.5) * 0.25 }));
  scene.add(rays);

  // ---------------- 海雪（漂浮的小顆粒），跟著鏡頭循環
  const camU = uniform(new THREE.Vector3());
  const SN = high ? 4000 : 1800, BOX = 36;
  const snowM = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const seed = vec3(hash(instanceIndex), hash(instanceIndex.add(17)), hash(instanceIndex.add(41)));
  const drift = vec3(sin(time.mul(0.1).add(seed.x.mul(9))).mul(0.02), time.mul(-0.006), cos(time.mul(0.08).add(seed.z.mul(9))).mul(0.02));
  const rel = fract(seed.add(drift).sub(camU.div(BOX))).sub(0.5).mul(BOX);
  snowM.positionNode = positionGeometry.add(camU).add(rel);
  snowM.vertexNode = billboarding();
  snowM.colorNode = vec3(0.8, 0.9, 0.95);
  snowM.opacityNode = smoothstep(0.5, 0.1, uv().sub(0.5).length()).mul(smoothstep(BOX * 0.5, BOX * 0.2, length(rel))).mul(0.55);
  const snow = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.035), snowM); snow.count = SN; snow.frustumCulled = false; scene.add(snow);

  W.reef = REEF; W.kelp = KELP; W.anem = ANEM; W.octo = OCTO;
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  W.update = (camera, depth) => {
    camU.value.copy(camera.position);
    dome.position.copy(camera.position);
    rayK.value = Math.max(0, 1 - depth / 55);
    W.surfFade.value = Math.max(0, 1 - depth / 70);
    rays.visible = rayK.value > 0.01;
    if (rays.visible) {
      const cx = camera.position.x, cz = camera.position.z;
      rayData.forEach((r, i) => {
        // 光束圍著鏡頭附近的格子循環
        const x = cx + ((((r.x - cx) % 90) + 135) % 90) - 45, z = cz + ((((r.z - cz) % 90) + 135) % 90) - 45;
        const yaw = Math.atan2(camera.position.x - x, camera.position.z - z);
        q.setFromAxisAngle(up, yaw); const tq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), r.tilt); q.multiply(tq);
        s3.set(r.w, 60, 1);
        M.compose(new THREE.Vector3(x, -30, z), q, s3); rays.setMatrixAt(i, M);
      });
      rays.instanceMatrix.needsUpdate = true;
    }
  };
  return W;
}

// 合併幾個幾何（只留 position、normal）
export function mergeGeos(list) {
  let n = 0; const geos = list.map((g) => { const ng = g.index ? g.toNonIndexed() : g; n += ng.attributes.position.count; return ng; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}
