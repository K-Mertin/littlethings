// 魚群：每條魚的位置、速度都在顯示卡上算（boids：跟著魚群中心、和旁邊的魚保持距離、一起轉向、看到潛艇就散開）
// 為了快，每條魚只看緩衝區裡前後幾條「同一群」的鄰居（同一群的魚放在連續的位置）。
import * as THREE from 'three';
import {
  Fn, uniform, uniformArray, float, int, vec3, vec4, mix, smoothstep, sin, cos, normalize, cross, length, max, min, clamp, select, If,
  instancedArray, instanceIndex, positionGeometry, normalGeometry, normalLocal, deltaTime, time, hash,
} from 'three/tsl';
import { floorY, rng } from './world.js';

// 每一群：中心在哪附近晃、顏色、大小、身形（寬、高、長）、速度
export const SCHOOLS = [
  { id: 'sardine', share: 0.3, home: [18, -112], h: 7, R: 22, color: [0.78, 0.84, 0.9], belly: [0.95, 0.97, 1], size: 0.42, shape: [0.32, 0.38, 1], speed: 4.2, rad: 6, stripe: [0, 0, [0.3, 0.45, 0.6]] },
  { id: 'sardine', share: 0.18, home: [-22, 5], h: 9, R: 30, color: [0.7, 0.78, 0.86], belly: [0.95, 0.97, 1], size: 0.45, shape: [0.32, 0.38, 1], speed: 4.6, rad: 7, stripe: [0, 0, [0.3, 0.45, 0.6]] },
  { id: 'tang', share: 0.11, home: [-26, -128], h: 4, R: 14, color: [0.08, 0.32, 0.95], belly: [0.15, 0.45, 1], tail: [1, 0.85, 0.1], size: 0.55, shape: [0.28, 0.75, 0.9], speed: 2.6, rad: 5, stripe: [1.6, 0.8, [0.02, 0.04, 0.12]] },
  { id: 'yellow', share: 0.11, home: [30, -132], h: 4, R: 14, color: [1, 0.82, 0.08], belly: [1, 0.92, 0.45], size: 0.5, shape: [0.25, 0.85, 0.85], speed: 2.4, rad: 5, stripe: [0, 0, [1, 1, 1]] },
  { id: 'red', share: 0.08, home: [-45, -60], h: 5, R: 18, color: [0.92, 0.3, 0.25], belly: [1, 0.7, 0.6], size: 0.5, shape: [0.32, 0.5, 1], speed: 3, rad: 5, stripe: [7, 0.5, [1, 0.9, 0.85]] },
  { id: 'parrot', share: 0.07, home: [8, -88], h: 3, R: 16, color: [0.15, 0.75, 0.6], belly: [0.45, 0.9, 0.8], tail: [0.95, 0.4, 0.7], size: 0.85, shape: [0.36, 0.55, 1], speed: 2, rad: 6, stripe: [5, 0.6, [0.95, 0.45, 0.7]] },
  { id: 'jack', share: 0.05, home: [-8, -30], h: 10, R: 34, color: [0.62, 0.68, 0.75], belly: [0.92, 0.94, 0.97], tail: [0.95, 0.8, 0.3], size: 1.3, shape: [0.28, 0.48, 1], speed: 5.5, rad: 8, stripe: [0, 0, [1, 1, 1]] },
  { id: 'lantern', share: 0.1, home: [20, 95], h: 10, R: 26, color: [0.12, 0.14, 0.2], belly: [0.25, 0.3, 0.4], glow: [0.3, 0.8, 1], size: 0.4, shape: [0.3, 0.42, 1], speed: 3.2, rad: 7, stripe: [0, 0, [1, 1, 1]] },
];
const NB = [1, 2, 3, 5, 8];   // 看前後第幾條鄰居

export class Fish {
  constructor(scene, { count, webgpu }) {
    this.scene = scene; this.N = count;
    const S = SCHOOLS.length, R = rng(99);
    // 分配：每群一段連續的編號
    let start = 0; this.ranges = SCHOOLS.map((s, i) => { const n = i === S - 1 ? count - start : Math.round(count * s.share); const r = [start, n]; start += n; return r; });
    this.centers = SCHOOLS.map((s) => new THREE.Vector4(s.home[0], floorY(s.home[0], s.home[1]) + s.h, s.home[1], s.rad));
    this.flee = SCHOOLS.map(() => new THREE.Vector3());
    const p0 = new Float32Array(count * 4), v0 = new Float32Array(count * 4);
    this.ranges.forEach(([a, n], s) => {
      const c = this.centers[s];
      for (let i = a; i < a + n; i++) {
        p0.set([c.x + (R() - 0.5) * 12, c.y + (R() - 0.5) * 5, c.z + (R() - 0.5) * 12, s], i * 4);
        v0.set([(R() - 0.5), 0, (R() - 0.5), R() * 6.28], i * 4);
      }
    });
    const P = this.P = instancedArray(p0, 'vec4');
    const V = this.V = instancedArray(v0, 'vec4');
    const C = this.C = uniformArray(this.centers, 'vec4');
    const PR = uniformArray(SCHOOLS.map((s, k) => new THREE.Vector4(s.speed, s.size, this.ranges[k][0], this.ranges[k][0] + this.ranges[k][1] - 1)), 'vec4');
    const sub = this.sub = uniform(new THREE.Vector3(0, -10, -130));

    this.step = Fn(() => {
      const i = int(instanceIndex), p = P.element(i), v = V.element(i);
      const s = int(p.w), c = C.element(s), prm = PR.element(s);
      const dt = min(deltaTime, 0.05);
      const pos = p.xyz.toVar(), vel = v.xyz.toVar();
      const acc = vec3(0).toVar();
      // 1. 往魚群中心靠（在半徑內就不太拉）
      const toC = c.xyz.sub(pos), dc = length(toC);
      acc.addAssign(toC.div(max(dc, 0.01)).mul(max(dc.sub(c.w.mul(0.6)), 0).mul(0.55)));
      acc.addAssign(toC.mul(0.04));
      // 2. 鄰居：分開＋對齊
      const avg = vec3(0).toVar(), nn = float(0).toVar();
      const a0 = int(prm.z), a1 = int(prm.w);
      for (const k of NB) {
        for (const sg of [1, -1]) {
          const j = clamp(i.add(k * sg), a0, a1);
          const q = P.element(j), w = V.element(j);
          const d = pos.sub(q.xyz), d2 = d.dot(d);
          If(d2.lessThan(0.6).and(d2.greaterThan(1e-5)), () => { acc.addAssign(d.div(d2).mul(0.35)); });
          avg.addAssign(w.xyz); nn.addAssign(1);
        }
      }
      acc.addAssign(avg.div(nn).sub(vel).mul(0.9));
      // 3. 潛艇靠近就散開
      const ds = pos.sub(sub), ls = length(ds);
      If(ls.lessThan(9), () => { acc.addAssign(ds.div(max(ls, 0.1)).mul(float(9).sub(ls).mul(4.5))); });
      // 4. 一點點亂游
      const h = hash(float(instanceIndex).add(time.mul(0.7).floor().mul(7.919)));
      acc.addAssign(vec3(sin(h.mul(40)), sin(h.mul(23)).mul(0.3), cos(h.mul(31))).mul(0.8));
      // 不要游出海面
      acc.y.addAssign(smoothstep(-3, -0.5, pos.y).mul(-8));
      vel.addAssign(acc.mul(dt));
      const sp = length(vel);
      const spd = clamp(sp, prm.x.mul(0.45), prm.x.mul(2.4));
      vel.assign(vel.div(max(sp, 0.001)).mul(spd));
      pos.addAssign(vel.mul(dt));
      pos.y.assign(min(pos.y, -0.6));
      P.element(i).assign(vec4(pos, p.w));
      V.element(i).assign(vec4(vel, v.w.add(dt.mul(spd.mul(2.2).add(3)))));
    })().compute(count);

    // ---------------- 外形：橢圓身體＋尾鰭（往 +z 是頭）
    const body = new THREE.SphereGeometry(0.5, 10, 7); body.deleteAttribute('uv');
    const tail = new THREE.BufferGeometry();
    tail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.38, 0, 0.32, -0.78, 0, -0.32, -0.78], 3));
    tail.setAttribute('normal', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
    const geo = mergeTwo(body.toNonIndexed(), tail);
    const SH = uniformArray(SCHOOLS.map((s) => new THREE.Vector4(...s.shape, 0)), 'vec4');
    const COL = uniformArray(SCHOOLS.map((s) => new THREE.Vector3(...s.color)), 'vec3');
    const BEL = uniformArray(SCHOOLS.map((s) => new THREE.Vector3(...s.belly)), 'vec3');
    const TAIL = uniformArray(SCHOOLS.map((s) => new THREE.Vector3(...(s.tail || s.color))), 'vec3');
    const GLOW = uniformArray(SCHOOLS.map((s) => new THREE.Vector3(...(s.glow || [0, 0, 0]))), 'vec3');
    const STR = uniformArray(SCHOOLS.map((s) => new THREE.Vector4(s.stripe[0], s.stripe[1], 0, 0)), 'vec4');   // 條紋：密度、深淺
    const STC = uniformArray(SCHOOLS.map((s) => new THREE.Vector3(...s.stripe[2])), 'vec3');
    const mat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.35, metalness: 0.25 });
    const p = P.element(instanceIndex), v = V.element(instanceIndex), si = int(p.w);
    mat.positionNode = Fn(() => {
      const sh = SH.element(si), size = PR.element(si).y;
      const l = positionGeometry.mul(sh.xyz).toVar();
      // 尾巴擺動：越後面擺越大
      const back = smoothstep(0.2, -0.75, positionGeometry.z);
      l.x.addAssign(sin(v.w.add(positionGeometry.z.mul(3.5))).mul(back).mul(0.22));
      const f = normalize(v.xyz.add(vec3(0, 0, 1e-4)));
      const r = normalize(cross(vec3(0, 1, 0), f)), u = cross(f, r);
      normalLocal.assign(normalize(r.mul(normalGeometry.x).add(u.mul(normalGeometry.y)).add(f.mul(normalGeometry.z))));
      return r.mul(l.x).add(u.mul(l.y)).add(f.mul(l.z)).mul(size).add(p.xyz);
    })();
    const isTail = smoothstep(-0.36, -0.42, positionGeometry.z);
    const base = mix(mix(BEL.element(si), COL.element(si), smoothstep(-0.25, 0.15, positionGeometry.y)), TAIL.element(si), isTail);
    const st = STR.element(si);
    const band = smoothstep(0.55, 0.75, sin(positionGeometry.z.mul(st.x).mul(6.28).add(positionGeometry.y.mul(2))).mul(0.5).add(0.5)).mul(st.y).mul(float(1).sub(isTail));
    mat.colorNode = mix(base, STC.element(si), band);
    // 燈籠魚：身上一排發光點
    const dots = smoothstep(0.82, 0.95, sin(positionGeometry.z.mul(40)).mul(0.5).add(0.5)).mul(smoothstep(-0.05, -0.2, positionGeometry.y));
    mat.emissiveNode = GLOW.element(si).mul(dots.mul(2.5));
    const mesh = this.mesh = new THREE.Mesh(geo, mat);
    mesh.count = count; mesh.frustumCulled = false;
    scene.add(mesh);
    this.webgpu = webgpu;
  }

  // CPU：移動每群的中心（在家附近繞），潛艇靠太近就整群躲開一下
  update(renderer, t, dt, subPos) {
    this.sub.value.copy(subPos);
    SCHOOLS.forEach((s, i) => {
      const c = this.centers[i], f = this.flee[i];
      const x = s.home[0] + Math.sin(t * 0.05 + i * 1.7) * s.R + Math.sin(t * 0.13 + i) * s.R * 0.25;
      const z = s.home[1] + Math.cos(t * 0.043 + i * 2.3) * s.R * 0.8;
      const d = new THREE.Vector3(c.x - subPos.x, c.y - subPos.y, c.z - subPos.z), L = d.length();
      if (L < 12) f.addScaledVector(d.normalize(), (12 - L) * dt * 1.6);
      f.multiplyScalar(Math.exp(-dt * 0.25));
      if (f.length() > 25) f.setLength(25);
      const fx = x + f.x, fz = z + f.z;
      const y = Math.min(-3, floorY(fx, fz) + s.h + Math.sin(t * 0.2 + i) * 2 + f.y * 0.3);
      c.set(fx, y, fz, s.rad);
    });
    renderer.compute(this.step);
  }
  center(id) { const i = SCHOOLS.findIndex((s) => s.id === id); return i < 0 ? null : this.centers[i]; }
}

function mergeTwo(a, b) {
  const n1 = a.attributes.position.count, n2 = b.attributes.position.count;
  const pos = new Float32Array((n1 + n2) * 3), nor = new Float32Array((n1 + n2) * 3);
  pos.set(a.attributes.position.array); pos.set(b.attributes.position.array, n1 * 3);
  nor.set(a.attributes.normal.array); nor.set(b.attributes.normal.array, n1 * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}
