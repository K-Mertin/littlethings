// 士兵的外形與動畫（顯示卡）：每種兵一個 mesh、一次 draw call 畫完所有人（instancing）
// 動作不用骨架：每個頂點記住自己屬於哪個部位（身體、左腿、右腿、左手、右手）和那個部位的轉軸，
// 頂點 shader 依每個人的「跑步相位、攻擊進度、倒下進度」自己轉。CPU 每格只送位置和這幾個數字。
import * as THREE from 'three';
import {
  Fn, float, vec3, vec4, mix, select, sin, cos, clamp, max, min, abs, attribute, instancedArray, instanceIndex,
  positionGeometry, normalGeometry, normalLocal, smoothstep, PI, int, uniform, hash, step,
} from 'three/tsl';
import { T } from './sim.js';

// kind：0 隊伍色（衣服）1 皮膚 2 金屬 3 木頭 4 深色（褲子、靴子）5 馬 6 白（馬鬃、羽毛）7 深隊伍色（披風）8 金色（裝飾）
// part：0 不動 1 左腳 2 右腳 3 左手 4 右手（含武器）5 馬腳 A 6 馬腳 B 7 披風（跑起來往後飄）
class Kit {
  constructor() { this.pos = []; this.nrm = []; this.part = []; this.piv = []; this.kind = []; }
  add(geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, part = 0, piv = [0, 0, 0], kind = 0 }) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    g.scale(sx, sy, sz); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z);
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i)); this.nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      this.part.push(part); this.piv.push(...piv); this.kind.push(kind);
    }
    return this;
  }
  box(w, h, d, o) { return this.add(new THREE.BoxGeometry(w, h, d), o); }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('part', new THREE.Float32BufferAttribute(this.part, 1));
    g.setAttribute('pivot', new THREE.Float32BufferAttribute(this.piv, 3));
    g.setAttribute('kind', new THREE.Float32BufferAttribute(this.kind, 1));
    return g;
  }
}

// 人：身高約 1.8 m，臉朝 +z
function body(k, { shield = false, helmet = 'round', weapon = 'sword', y0 = 0, legs = true }) {
  const HIP = [0, y0 + 0.92, 0], SH_L = [0.3, y0 + 1.42, 0], SH_R = [-0.3, y0 + 1.42, 0];
  if (legs) {
    // 圓圓的手腳（膠囊），比方塊像真的人
    k.add(new THREE.CapsuleGeometry(0.085, 0.72, 2, 7), { x: 0.12, y: y0 + 0.5, part: 1, piv: HIP, kind: 4 });
    k.add(new THREE.CapsuleGeometry(0.085, 0.72, 2, 7), { x: -0.12, y: y0 + 0.5, part: 2, piv: HIP, kind: 4 });
  }
  k.add(new THREE.CylinderGeometry(0.23, 0.2, 0.6, 10), { y: y0 + 1.2, sz: 0.68, kind: 0 });   // 上衣（肩膀寬、腰細）
  k.add(new THREE.SphereGeometry(0.075, 8, 6), { y: y0 + 1.5, kind: 1 });                        // 脖子
  if (legs) k.add(new THREE.CylinderGeometry(0.25, 0.3, 0.26, 8), { y: y0 + 0.8, kind: 0 });   // 下襬
  k.box(0.5, 0.12, 0.32, { y: y0 + 0.93, kind: 3 });                // 腰帶
  k.box(0.1, 0.09, 0.04, { y: y0 + 0.93, z: 0.17, kind: 8 });       // 腰帶扣
  if (legs) for (const sx of [0.12, -0.12]) k.add(new THREE.CapsuleGeometry(0.09, 0.14, 2, 7), { x: sx, y: y0 + 0.08, z: 0.05, rx: Math.PI / 2, part: sx > 0 ? 1 : 2, piv: HIP, kind: 4 });   // 靴子
  // 披風：掛在肩膀後面，跑起來往後飄
  k.box(0.46, 0.78, 0.035, { y: y0 + 1.04, z: -0.215, part: 7, piv: [0, y0 + 1.43, -0.2], kind: 7 });
  // 眼睛
  for (const ex of [0.06, -0.06]) k.box(0.035, 0.035, 0.03, { x: ex, y: y0 + 1.68, z: 0.168, kind: 4 });
  k.add(new THREE.SphereGeometry(0.17, 10, 8), { y: y0 + 1.66, kind: 1 });   // 頭
  if (helmet === 'round') {
    k.add(new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), { y: y0 + 1.7, kind: 2 });
    k.box(0.04, 0.16, 0.06, { y: y0 + 1.62, z: 0.17, kind: 2 });   // 護鼻
    for (const sx of [0.3, -0.3]) k.add(new THREE.SphereGeometry(0.13, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), { x: sx, y: y0 + 1.42, kind: 2 });   // 肩甲
  }
  if (helmet === 'hood') k.add(new THREE.ConeGeometry(0.2, 0.32, 8), { y: y0 + 1.84, kind: 0 });
  if (helmet === 'plume') { k.add(new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), { y: y0 + 1.7, kind: 2 }); k.box(0.05, 0.22, 0.3, { y: y0 + 1.92, z: -0.04, kind: 0 }); }
  // 左手（拿盾或弓）
  k.add(new THREE.CapsuleGeometry(0.062, 0.48, 2, 7), { x: 0.3, y: y0 + 1.14, part: 3, piv: SH_L, kind: 0 });
  k.add(new THREE.SphereGeometry(0.06, 7, 5), { x: 0.3, y: y0 + 0.84, part: 3, piv: SH_L, kind: 1 });   // 左手掌
  if (shield) k.add(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 14), { x: 0.44, y: y0 + 1.1, z: 0.12, rz: Math.PI / 2, part: 3, piv: SH_L, kind: 2 });
  if (weapon === 'bow') {   // 背上的箭袋
    k.add(new THREE.CylinderGeometry(0.08, 0.07, 0.6, 7), { x: -0.12, y: y0 + 1.3, z: -0.24, rz: 0.35, kind: 3 });
    for (const ax of [-0.02, -0.08, -0.14]) k.box(0.05, 0.08, 0.05, { x: ax - 0.12, y: y0 + 1.62, z: -0.24, kind: 6 });
  }
  if (weapon === 'bow') k.add(new THREE.TorusGeometry(0.42, 0.025, 4, 12, Math.PI), { x: 0.38, y: y0 + 1.0, z: 0.25, ry: Math.PI / 2, rz: Math.PI / 2, part: 3, piv: SH_L, kind: 3 });
  // 右手（拿劍或長槍）
  k.add(new THREE.CapsuleGeometry(0.062, 0.48, 2, 7), { x: -0.3, y: y0 + 1.14, part: 4, piv: SH_R, kind: 0 });
  k.add(new THREE.SphereGeometry(0.06, 7, 5), { x: -0.3, y: y0 + 0.84, part: 4, piv: SH_R, kind: 1 });   // 右手掌
  if (weapon === 'sword') {
    k.box(0.06, 0.85, 0.04, { x: -0.36, y: y0 + 1.15, z: 0.35, rx: Math.PI / 2 - 0.4, part: 4, piv: SH_R, kind: 2 });
    k.box(0.24, 0.05, 0.06, { x: -0.36, y: y0 + 0.97, z: 0.06, rx: Math.PI / 2 - 0.4, part: 4, piv: SH_R, kind: 8 });   // 護手
  }
  if (shield) k.add(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), { x: 0.48, y: y0 + 1.1, z: 0.12, rz: Math.PI / 2, part: 3, piv: SH_L, kind: 8 });   // 盾心
  if (weapon === 'lance') k.add(new THREE.CylinderGeometry(0.03, 0.04, 3.2, 5), { x: -0.38, y: y0 + 1.0, z: 0.9, rx: Math.PI / 2 - 0.12, part: 4, piv: SH_R, kind: 3 });
  return k;
}
function horse(k) {
  const L = [[0.22, 0.75], [-0.22, -0.75]], R = [[-0.22, 0.75], [0.22, -0.75]];
  // 馬腳：上粗下細的圓柱＋深色的蹄
  for (const [x, z] of L) { k.add(new THREE.CylinderGeometry(0.09, 0.055, 0.82, 7), { x, y: 0.48, z, part: 5, piv: [x, 0.88, z], kind: 5 }); k.add(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 7), { x, y: 0.05, z, part: 5, piv: [x, 0.88, z], kind: 4 }); }
  for (const [x, z] of R) { k.add(new THREE.CylinderGeometry(0.09, 0.055, 0.82, 7), { x, y: 0.48, z, part: 6, piv: [x, 0.88, z], kind: 5 }); k.add(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 7), { x, y: 0.05, z, part: 6, piv: [x, 0.88, z], kind: 4 }); }
  k.add(new THREE.CapsuleGeometry(0.3, 1.1, 4, 12), { y: 1.12, rx: Math.PI / 2, sx: 0.95, kind: 5 });   // 身體（圓桶狀）
  k.add(new THREE.CylinderGeometry(0.13, 0.2, 0.8, 9), { y: 1.55, z: 0.95, rx: 0.55, kind: 5 });   // 脖子
  k.add(new THREE.CapsuleGeometry(0.12, 0.38, 4, 9), { y: 1.82, z: 1.22, rx: Math.PI / 2 + 0.35, kind: 5 });   // 頭（長長的馬臉）
  k.box(0.07, 0.75, 0.12, { y: 1.62, z: 0.86, rx: 0.55, kind: 6 });               // 鬃毛（沿著脖子後面）
  k.add(new THREE.ConeGeometry(0.09, 0.7, 6), { y: 0.95, z: -0.98, rx: -2.7, kind: 6 });   // 尾巴（垂下來）
  k.box(0.6, 0.1, 0.7, { y: 1.42, kind: 0 });                                     // 馬鞍布（隊伍色）
  for (const sx of [0.31, -0.31]) k.box(0.03, 0.38, 0.9, { x: sx, y: 1.18, kind: 7 });   // 馬衣（兩側垂下來）
  k.box(0.3, 0.06, 0.3, { y: 1.87, z: 1.25, kind: 4 });                          // 韁繩
  for (const ex of [0.14, -0.14]) k.box(0.02, 0.05, 0.05, { x: ex, y: 1.92, z: 1.3, kind: 4 });   // 眼睛
  for (const ex of [0.08, -0.08]) k.box(0.06, 0.14, 0.06, { x: ex, y: 2.05, z: 1.05, kind: 5 });  // 耳朵
  return k;
}

const TEAM = [new THREE.Color(0x2c55a8), new THREE.Color(0xb3302e)];   // 比較像布料染色的藍和紅（不要螢光）

export class UnitMeshes {
  constructor(scene, maxN, { high, shadows = high }) {
    this.max = maxN;
    const defs = [
      body(new Kit(), { shield: true, helmet: 'round', weapon: 'sword' }).geo(),
      body(new Kit(), { helmet: 'hood', weapon: 'bow' }).geo(),
      body(horse(new Kit()), { helmet: 'plume', weapon: 'lance', y0: 0.62, legs: false }).geo(),
    ];
    this.types = defs.map((geo, ty) => {
      const A = instancedArray(new Float32Array(maxN * 4), 'vec4');   // x y z 方向
      const B = instancedArray(new Float32Array(maxN * 4), 'vec4');   // 跑步相位、攻擊、倒下、隊伍
      const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.7 });
      const a = A.element(instanceIndex), b = B.element(instanceIndex);
      // 插值後的浮點數不一定剛好是整數（4.9999…），先四捨五入再比較，不然顏色會一點一點跳錯
      const part = attribute('part', 'float').add(0.5).floor(), piv = attribute('pivot', 'vec3'), kind = attribute('kind', 'float').add(0.5).floor();
      const rotX = (v, c, s) => vec3(v.x, v.y.mul(c).sub(v.z.mul(s)), v.y.mul(s).add(v.z.mul(c)));
      const run = clamp(b.y.mul(0).add(1), 0, 1);
      mat.positionNode = Fn(() => {
        const ph = b.x, atk = b.y, dth = b.z;
        const sw = sin(ph), swing = sin(atk.mul(PI));
        // 每個部位的角度（繞 x 軸）
        let ang = float(0).toVar();
        ang.assign(select(part.equal(1), sw.mul(0.75), ang));
        ang.assign(select(part.equal(2), sw.mul(-0.75), ang));
        ang.assign(select(part.equal(3), ty === T.ARCHER ? mix(sw.mul(-0.5), float(-1.45), smoothstep(0.05, 0.3, atk)) : sw.mul(-0.5).sub(0.35), ang));
        ang.assign(select(part.equal(4), ty === T.ARCHER ? mix(sw.mul(0.5), float(-1.3), smoothstep(0.05, 0.3, atk)) : sw.mul(0.45).sub(swing.mul(1.9)), ang));
        ang.assign(select(part.equal(5), sw.mul(0.6), ang));
        ang.assign(select(part.equal(6), sw.mul(-0.6), ang));
        ang.assign(select(part.equal(7), sin(ph.mul(2)).mul(0.08).add(ty === T.CAV ? 0.55 : 0.18).add(abs(sw).mul(0.15)), ang));
        void run;
        const c = cos(ang), s = sin(ang);
        const lp = rotX(positionGeometry.sub(piv), c, s).add(piv).toVar();
        const ln = rotX(normalGeometry, c, s).toVar();
        // 倒下：往後倒（繞腳底），倒完慢慢沉進地面
        const fall = clamp(dth, 0, 1).mul(1.45);
        const fc = cos(fall), fs = sin(fall.negate());
        lp.assign(rotX(lp, fc, fs)); ln.assign(rotX(ln, fc, fs));
        lp.y.subAssign(max(dth.sub(1), 0).mul(1.6));
        // 騎兵跑起來上下晃
        if (ty === T.CAV) lp.y.addAssign(abs(sin(ph)).mul(0.12));
        // 轉向、放到位置
        const hc = cos(a.w), hs = sin(a.w);
        lp.mulAssign(hash(b.w.div(2).floor().add(17)).mul(0.16).add(0.92));   // 每個人高矮胖瘦不太一樣
        const wp = vec3(lp.x.mul(hc).add(lp.z.mul(hs)), lp.y, lp.z.mul(hc).sub(lp.x.mul(hs)));
        normalLocal.assign(vec3(ln.x.mul(hc).add(ln.z.mul(hs)), ln.y, ln.z.mul(hc).sub(ln.x.mul(hs))));
        return wp.add(a.xyz);
      })();
      const team = b.w.mod(2), uid = b.w.div(2).floor();
      // 制服是手工染的：每個人的顏色深淺有一點差；膚色也各不相同
      const tc = mix(vec3(...TEAM[0].toArray()), vec3(...TEAM[1].toArray()), team).mul(hash(uid.add(3)).mul(0.22).add(0.88));
      const skin = mix(mix(vec3(0.96, 0.8, 0.66), vec3(0.78, 0.56, 0.4), hash(uid.add(5))), vec3(0.45, 0.3, 0.2), step(0.85, hash(uid.add(9))));
      const dead = clamp(b.z, 0, 1);
      const pal = [tc, skin, vec3(0.72, 0.74, 0.78), vec3(0.45, 0.3, 0.16), vec3(0.2, 0.18, 0.17), vec3(0.42, 0.28, 0.17), vec3(0.92, 0.9, 0.86), tc.mul(0.55), vec3(0.95, 0.75, 0.25)];
      let col = pal[0];
      for (let k2 = 1; k2 < pal.length; k2++) col = select(kind.equal(k2), pal[k2], col);
      mat.colorNode = mix(col, col.mul(0.55), dead);   // 倒下的變暗
      mat.metalnessNode = select(kind.equal(2).or(kind.equal(8)), float(0.6), float(0));
      mat.roughnessNode = select(kind.equal(2).or(kind.equal(8)), float(0.35), float(0.75));
      const mesh = new THREE.Mesh(geo, mat); mesh.count = 0; mesh.frustumCulled = false;
      mesh.castShadow = shadows; mesh.receiveShadow = shadows;
      scene.add(mesh);
      // 腳下的接觸陰影：一個淡淡的黑色圓（讓人「站」在地上；倒下的人也有）
      const bm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
      const lx = positionGeometry.x.mul(ty === T.CAV ? 1.3 : 0.8), lz = positionGeometry.z.mul(ty === T.CAV ? 2.4 : 0.8);
      const hc = cos(a.w), hs = sin(a.w);
      bm.positionNode = vec3(lx.mul(hc).add(lz.mul(hs)), 0.06, lz.mul(hc).sub(lx.mul(hs))).add(a.xyz);
      bm.colorNode = vec3(0);
      bm.opacityNode = smoothstep(0.5, 0.1, positionGeometry.xz.length()).mul(0.45);
      const bg = new THREE.PlaneGeometry(1, 1); bg.rotateX(-Math.PI / 2);
      const blob = new THREE.Mesh(bg, bm); blob.count = 0; blob.frustumCulled = false; blob.renderOrder = 1;
      scene.add(blob);
      return { mesh, A, B, blob };
    });

    // 箭：細長的棍子，沿速度方向
    const AR = instancedArray(new Float32Array(4000 * 4), 'vec4'), AD = instancedArray(new Float32Array(4000 * 4), 'vec4');
    const ag = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 4); ag.rotateX(Math.PI / 2);
    const am = new THREE.MeshStandardNodeMaterial({ color: 0x5a4632, roughness: 0.8 });
    am.positionNode = Fn(() => {
      const p = AR.element(instanceIndex), d = AD.element(instanceIndex);
      const f = d.xyz.normalize(), r = vec3(0, 1, 0).cross(f).normalize(), u = f.cross(r);
      const g = positionGeometry;
      return r.mul(g.x).add(u.mul(g.y)).add(f.mul(g.z)).add(p.xyz);
    })();
    this.arrows = new THREE.Mesh(ag, am); this.arrows.count = 0; this.arrows.frustumCulled = false; scene.add(this.arrows);
    this.AR = AR; this.AD = AD;
    void int; void uniform; void vec4; void min;
  }

  // 把模擬結果寫進 GPU 緩衝區
  sync(b) {
    const cnt = [0, 0, 0];
    const arrs = this.types.map((t) => [t.A.value.array, t.B.value.array]);
    for (let i = 0; i < b.n; i++) {
      if (!b.alive[i] && b.death[i] >= 2.2) continue;   // 沉下去了，不畫
      const ty = b.type[i], k = cnt[ty]++, [A, B] = arrs[ty], o = k * 4;
      A[o] = b.x[i]; A[o + 1] = b.y[i]; A[o + 2] = b.z[i]; A[o + 3] = b.hd[i];
      B[o] = b.ph[i]; B[o + 1] = b.atk[i]; B[o + 2] = b.alive[i] ? 0 : b.death[i]; B[o + 3] = b.team[i] + 2 * (i % 4096);   // 隊伍（0/1）＋每個人固定的編號（給長相變化用）
    }
    this.types.forEach((t, ty) => { t.mesh.count = t.blob.count = cnt[ty]; t.A.value.needsUpdate = true; t.B.value.needsUpdate = true; });
    const P = this.AR.value.array, D = this.AD.value.array;
    let n = 0;
    for (const a of b.arrows) {
      if (n >= 4000) break;
      const o = n * 4; P[o] = a.x; P[o + 1] = a.y; P[o + 2] = a.z; P[o + 3] = 1;
      D[o] = a.vx || 0.001; D[o + 1] = a.vy; D[o + 2] = a.vz || 0.001; n++;
    }
    this.arrows.count = n; this.AR.value.needsUpdate = true; this.AD.value.needsUpdate = true;
  }
}
