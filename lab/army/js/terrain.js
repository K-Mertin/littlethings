// 戰場地形：山丘（高度）、河流（走得慢，淺灘和橋走得快）、樹林（走得慢、可以擋箭）
// 地圖：x −120～120、z −80～80；藍軍（玩家）在 +z（靠鏡頭），紅軍在 −z。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vec3, vec4, float, mix, smoothstep, positionWorld, normalWorld, mx_noise_float, time, sin, cos, uv, instancedArray, instanceIndex, positionGeometry, hash } from 'three/tsl';

export const MAP = { w: 240, h: 160 };

export class Terrain {
  constructor(def = {}) {
    this.hills = def.hills || [];
    this.river = def.river || null;      // { z, amp, f, w, fords: [x…], bridges: [x…] }
    this.forests = def.forests || [];    // [{ x, z, r }]
  }
  riverOff(x, z) { const r = this.river; return r ? z - (r.z + r.amp * Math.sin(x * r.f)) : 1e9; }
  inRiver(x, z) { return this.river && Math.abs(this.riverOff(x, z)) < this.river.w; }
  crossing(x) { const r = this.river; return r && [...(r.fords || []), ...(r.bridges || [])].some((fx) => Math.abs(x - fx) < 6); }
  height(x, z) {
    let y = 0;
    for (const h of this.hills) { const d2 = ((x - h.x) ** 2 + (z - h.z) ** 2) / (h.r * h.r); y += h.h * Math.exp(-d2 * 2.2); }
    y += Math.sin(x * 0.07 + 1.3) * Math.cos(z * 0.09) * 0.6 + Math.sin(x * 0.19 + z * 0.13) * 0.25;
    if (this.river) {
      const d = Math.abs(this.riverOff(x, z)), w = this.river.w;
      const ford = (this.river.fords || []).some((fx) => Math.abs(x - fx) < 7);
      const depth = ford ? 0.45 : 1.6;
      if (d < w + 4) y -= depth * (1 - smooth(w - 1, w + 4, d));
    }
    return y;
  }
  forestAt(x, z) { return this.forests.some((f) => (x - f.x) ** 2 + (z - f.z) ** 2 < f.r * f.r); }
  // 移動速度倍率
  speedAt(x, z) {
    let k = 1;
    if (this.inRiver(x, z) && !this.crossing(x)) k *= 0.45;
    if (this.forestAt(x, z)) k *= 0.7;
    return k;
  }

  build(scene, { high }) {
    const g = new THREE.PlaneGeometry(MAP.w + 120, MAP.h + 120, high ? 240 : 150, high ? 170 : 110);
    g.rotateX(-Math.PI / 2);
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) a.setY(i, this.height(a.getX(i), a.getZ(i)));
    g.computeVertexNormals();
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
    const wp = positionWorld, n = mx_noise_float(wp.mul(0.08)).mul(0.5).add(0.5), n2 = mx_noise_float(wp.mul(0.6)).mul(0.5).add(0.5);
    const n3 = mx_noise_float(wp.mul(0.025).add(vec3(7, 0, 3))).mul(0.5).add(0.5);
    const grass = mix(mix(vec3(0.3, 0.45, 0.16), vec3(0.46, 0.56, 0.2), n), vec3(0.55, 0.55, 0.28), smoothstep(0.6, 0.8, n3).mul(0.5)).mul(mix(0.85, 1.08, n2));
    const dirt = vec3(0.47, 0.38, 0.26), rock = vec3(0.45, 0.43, 0.4);
    const slope = normalWorld.y;
    let c = mix(rock, grass, smoothstep(0.8, 0.92, slope));
    c = mix(dirt, c, smoothstep(-1.3, -0.95, wp.y));   // 河岸是泥土
    // 邊緣暗一點，讓戰場範圍清楚
    const edge = smoothstep(MAP.w / 2 - 6, MAP.w / 2 + 25, wp.x.abs()).max(smoothstep(MAP.h / 2 - 6, MAP.h / 2 + 25, wp.z.abs()));
    m.colorNode = mix(c, mix(vec3(0.2, 0.26, 0.1), c.mul(0.6), 0.4), edge);
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; scene.add(mesh);
    this.mesh = mesh;

    // 河水
    if (this.river) {
      const r = this.river;
      const wg = new THREE.PlaneGeometry(MAP.w + 120, r.w * 2 + 8, 200, 1); wg.rotateX(-Math.PI / 2);
      const wa = wg.attributes.position;
      for (let i = 0; i < wa.count; i++) { const x = wa.getX(i); wa.setZ(i, wa.getZ(i) + r.z + r.amp * Math.sin(x * r.f)); wa.setY(i, -0.35); }
      const wm = new THREE.MeshStandardNodeMaterial({ color: 0x3a7fa8, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.82 });
      wm.colorNode = mix(vec3(0.16, 0.42, 0.6), vec3(0.4, 0.68, 0.82), mx_noise_float(positionWorld.mul(0.15).add(vec3(time.mul(0.3), 0, 0))).mul(0.5).add(0.5));
      const water = new THREE.Mesh(wg, wm); scene.add(water);
      // 橋
      for (const bx of r.bridges || []) {
        const bz = r.z + r.amp * Math.sin(bx * r.f);
        const wood = new THREE.MeshStandardNodeMaterial({ color: 0x8a6238, roughness: 0.8 });
        const deck = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, r.w * 2 + 6), wood); deck.position.set(bx, 0.15, bz); deck.castShadow = deck.receiveShadow = true; scene.add(deck);
        for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, r.w * 2 + 6), wood); rail.position.set(bx + s * 4.4, 0.7, bz); scene.add(rail); }
      }
    }

    this.buildGrass(scene, high);
    this.buildBackdrop(scene);

    // 樹林：InstancedMesh（樹幹＋兩層樹冠）
    const trees = [];
    for (const f of this.forests) {
      const n2 = Math.round(f.r * f.r * 0.12);
      for (let i = 0; i < n2; i++) {
        const ang = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * f.r;
        const x = f.x + Math.cos(ang) * d, z = f.z + Math.sin(ang) * d;
        trees.push({ x, z, y: this.height(x, z), s: 0.8 + Math.random() * 0.6 });
      }
    }
    if (trees.length) {
      const trunk = new THREE.CylinderGeometry(0.22, 0.3, 2.4, 6); trunk.translate(0, 1.2, 0);
      // 樹冠：幾顆凹凸不平的球疊在一起（闊葉樹），比圓錐像真的樹
      const blob = (r, x, y, z, seed) => { const g = new THREE.IcosahedronGeometry(r, 2); const p = g.attributes.position, v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + 0.18 * Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 2) * Math.sin(v.z * 3.3 + 1); v.multiplyScalar(k); p.setXYZ(i, v.x + x, v.y + y, v.z + z); }
        g.computeVertexNormals(); return g; };
      const crown = mergeGeometries([blob(1.7, 0, 3.6, 0, 1), blob(1.2, 0.9, 4.3, 0.3, 2), blob(1.25, -0.8, 4.4, -0.4, 3)].map((g) => g.toNonIndexed()));
      const crown2 = mergeGeometries([blob(1.05, 0.2, 5.3, 0.2, 4), blob(0.9, -0.5, 3.4, 1.0, 5)].map((g) => g.toNonIndexed()));
      const mk = (geo, color) => {
        const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardNodeMaterial({ color, roughness: 0.85 }), trees.length);
        const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
        trees.forEach((t, i) => { Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.x * 7.1); S.setScalar(t.s); M.compose(new THREE.Vector3(t.x, t.y, t.z), Q, S); im.setMatrixAt(i, M); });
        im.castShadow = true; im.receiveShadow = true; scene.add(im); return im;
      };
      mk(trunk, 0x5a3f27); mk(crown, 0x2d5a28); mk(crown2, 0x3f6e31);
    }
  }
}

// 草叢、小花（自己做 instancing：位置放在 instancedArray，positionNode 加上去並隨風擺）
Terrain.prototype.buildGrass = function (scene, high) {
  const N = high ? 90000 : 32000, data = new Float32Array(N * 4);
  let n = 0;
  for (let tries = 0; n < N && tries < N * 3; tries++) {
    const x = (Math.random() - 0.5) * (MAP.w + 70), z = (Math.random() - 0.5) * (MAP.h + 70);
    const y = this.height(x, z);
    if (y < -0.55 || this.forestAt(x, z) && Math.random() < 0.6) continue;   // 河裡不長
    data.set([x, y, z, Math.random() * 6.28], n * 4); n++;
  }
  const D = instancedArray(data, 'vec4');
  // 一叢 = 3 片交叉的細三角形
  const pos = [];
  for (let k = 0; k < 5; k++) {
    const a = k * 1.26, c = Math.cos(a), s = Math.sin(a), w = 0.05, h = 0.32 + (k % 3) * 0.1;
    const ox = Math.cos(k * 2.4) * 0.12, oz = Math.sin(k * 2.4) * 0.12, lean = 0.12;
    pos.push(-w * c + ox, 0, -w * s + oz, w * c + ox, 0, w * s + oz, ox + lean * Math.cos(k * 2.4), h, oz + lean * Math.sin(k * 2.4));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const m = new THREE.MeshLambertNodeMaterial({ side: THREE.DoubleSide });
  const d = D.element(instanceIndex), hh = hash(instanceIndex), sz = hh.mul(0.8).add(0.7);
  const lp = positionGeometry.mul(sz), ca = cos(d.w), sa = sin(d.w);
  const wind = sin(time.mul(1.7).add(d.x.mul(0.15)).add(d.z.mul(0.1))).mul(0.12).add(0.06).mul(lp.y);
  m.positionNode = vec3(lp.x.mul(ca).sub(lp.z.mul(sa)).add(wind), lp.y, lp.x.mul(sa).add(lp.z.mul(ca)).add(wind.mul(0.5))).add(d.xyz);
  const tip = positionGeometry.y.div(0.5).clamp(0, 1);
  const base = mix(vec3(0.3, 0.44, 0.15), vec3(0.45, 0.56, 0.2), hh);
  // 少數是小花：頂端變成白、黃、紫
  const flower = hash(instanceIndex.add(77)).lessThan(0.04);
  const fc = mix(mix(vec3(1, 0.95, 0.85), vec3(1, 0.85, 0.2), hash(instanceIndex.add(5)).step(0.5)), vec3(0.75, 0.5, 1), hash(instanceIndex.add(9)).step(0.75));
  m.colorNode = flower.select(mix(base, fc, tip.pow(4)), mix(base.mul(0.75), base.mul(1.25).add(vec3(0.04, 0.03, 0)), tip));
  const mesh = new THREE.Mesh(g, m); mesh.count = n; mesh.frustumCulled = false; mesh.receiveShadow = true;
  scene.add(mesh);
  // 石頭
  const rocks = [];
  for (let i = 0; i < 160; i++) {
    const x = (Math.random() - 0.5) * (MAP.w + 60), z = (Math.random() - 0.5) * (MAP.h + 60);
    if (this.inRiver(x, z)) continue;
    rocks.push([x, this.height(x, z), z, 0.3 + Math.random() ** 3 * 1.4]);
  }
  const rg = new THREE.DodecahedronGeometry(1, 0);
  const rm = new THREE.InstancedMesh(rg, new THREE.MeshStandardNodeMaterial({ color: 0x8a8580, roughness: 0.95, flatShading: true }), rocks.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  rocks.forEach(([x, y, z, s2], i) => { E.set(Math.random(), Math.random() * 6, Math.random()); Q.setFromEuler(E); M.compose(new THREE.Vector3(x, y + s2 * 0.2, z), Q, new THREE.Vector3(s2, s2 * 0.6, s2 * 0.9)); rm.setMatrixAt(i, M); });
  rm.castShadow = rm.receiveShadow = true; scene.add(rm);
  void vec4; void float;
};

// 背景：天空漸層、遠方的山、幾朵雲
Terrain.prototype.buildBackdrop = function (scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, fog: false, depthWrite: false }));
  const dy = positionWorld.sub(vec3(0, 0, 0)).normalize().y;
  sky.material.colorNode = mix(vec3(0.66, 0.8, 0.9), vec3(0.28, 0.5, 0.82), smoothstep(0.0, 0.5, dy));
  scene.add(sky);
  // 地圖外面的大草原（接到遠山，拉遠時才不會看到地面的邊）
  const om = new THREE.MeshStandardNodeMaterial({ roughness: 1 });
  om.colorNode = mix(vec3(0.17, 0.24, 0.08), vec3(0.24, 0.29, 0.11), mx_noise_float(positionWorld.mul(0.02)).mul(0.5).add(0.5));
  const outer = new THREE.Mesh(new THREE.CircleGeometry(345, 48), om);
  outer.rotation.x = -Math.PI / 2; outer.position.y = -1.2; scene.add(outer);
  // 遠山：一圈鋸齒狀的環，半徑 330，被霧蓋成藍灰色
  const seg = 160, pos = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const a = i / seg * Math.PI * 2, R = 330;
    const h = 22 + Math.sin(a * 5) * 10 + Math.sin(a * 13 + 1) * 7 + Math.sin(a * 31) * 3;
    pos.push(Math.cos(a) * R, -5, Math.sin(a) * R, Math.cos(a) * R, h, Math.sin(a) * R);
    if (i < seg) { const o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setIndex(idx); mg.computeVertexNormals();
  const mm = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  mm.colorNode = mix(vec3(0.35, 0.45, 0.4), vec3(0.55, 0.62, 0.7), positionWorld.y.div(35).clamp(0, 1));
  scene.add(new THREE.Mesh(mg, mm));
  // 雲：很大的淡白色光團
  const cm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false });
  const f = smoothstep(0.5, 0.1, uv().sub(0.5).length());
  cm.colorNode = vec3(1); cm.opacityNode = f.mul(0.55);
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, R = 260 + Math.random() * 200;
    for (let k = 0; k < 4; k++) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cm);
      c.position.set(Math.cos(a) * R + (Math.random() - 0.5) * 50, 90 + Math.random() * 40, Math.sin(a) * R + (Math.random() - 0.5) * 50);
      c.scale.set(60 + Math.random() * 50, 25 + Math.random() * 15, 1); c.lookAt(0, c.position.y, 0);
      scene.add(c);
    }
  }
};

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
void sin; void uv;
