// 星系沙盒：幾十萬顆星在顯示卡上被幾個「重的東西」（星系核心、黑洞）吸引
// 星星彼此不互相吸引（那要算 N² 次），只受重天體的重力；重天體彼此在 CPU 上做完整的 N-body。
// 這就是經典的「受限 N 體」星系碰撞模擬（Toomre 兄弟 1972 年用來解釋觸鬚星系的潮汐尾巴）。
import * as THREE from 'three';
import {
  Fn, uniform, uniformArray, float, int, vec2, vec3, vec4, mix, smoothstep, sin, cos, sqrt, log, max, min, clamp, select, If, Loop,
  instancedArray, instanceIndex, positionGeometry, billboarding, uv, hash, length, normalize, cross, dot, cameraPosition, time, atan,
} from 'three/tsl';

export const MAX_BODIES = 16;
const G_SOFT_BH = 0.6;

export class Stars {
  constructor(scene, renderer, N) {
    this.scene = scene; this.renderer = renderer; this.N = N;
    this.SLOTS = 4; this.slotN = Math.floor(N / this.SLOTS);
    this.slotOwner = new Array(this.SLOTS).fill(null);
    this.bodies = [];
    const P = this.P = instancedArray(N, 'vec4');   // xyz、活著（1）／死了（0）
    const V = this.V = instancedArray(N, 'vec4');   // 速度 xyz、顏色溫度
    this.B = uniformArray(Array.from({ length: MAX_BODIES }, () => new THREE.Vector4()), 'vec4');   // 位置、質量
    this.BP = uniformArray(Array.from({ length: MAX_BODIES }, () => new THREE.Vector4()), 'vec4');  // 軟化長度、種類（0 核心 1 黑洞）、吃掉半徑
    this.nB = uniform(0, 'int');
    this.dt = uniform(0.016);
    const B = this.B, BP = this.BP, nB = this.nB, dt = this.dt;

    // ---------------- 生出一團星星（寫在 [start, start+n)，其他保持原樣）
    const S = this.sp = {
      range: uniform(new THREE.Vector4()),     // start、n、seed、kind（0 旋臂星系 1 星雲 2 清掉）
      center: uniform(new THREE.Vector4()),    // xyz、質量
      vel: uniform(new THREE.Vector4()),       // xyz、軟化長度
      nrm: uniform(new THREE.Vector4()),       // 盤面法線 xyz、半徑
      arms: uniform(new THREE.Vector4(2, 3.2, 0.14, 0)),   // 旋臂數、捲緊程度、核球比例
    };
    this.spawnNode = Fn(() => {
      const i = instanceIndex, fi = float(i);
      const start = S.range.x, n = S.range.y, seed = S.range.z, kind = S.range.w;
      const inR = fi.greaterThanEqual(start).and(fi.lessThan(start.add(n)));
      const p = P.element(i), v = V.element(i);
      const np = p.toVar(), nv = v.toVar();
      If(inR, () => {
        const h = (k) => hash(fi.mul(1.618).add(seed.mul(97.3)).add(k * 13.17));
        const N3 = normalize(S.nrm.xyz);
        const U = normalize(cross(N3, select(abs1(N3.y).lessThan(0.9), vec3(0, 1, 0), vec3(1, 0, 0))));
        const W = cross(N3, U);
        const R = S.nrm.w, M = S.center.w, a = S.vel.w;
        const gauss = h(1).add(h(2)).add(h(3)).sub(1.5).mul(1.15);
        If(kind.lessThan(1.5), () => {
          const isBulge = h(4).lessThan(S.arms.z);
          // 半徑：指數盤；核球比較集中
          const rDisk = R.mul(log(float(1).sub(h(5).mul(0.96))).negate()).div(3.2).add(R.mul(0.02));
          const rBul = R.mul(0.16).mul(h(5).pow(0.6));
          const r = select(isBulge, rBul, rDisk).toVar();
          If(kind.greaterThan(0.5), () => { r.assign(R.mul(h(5).pow(0.5))); });   // 星雲：均勻的一大團
          // 角度：旋臂上（對數螺線）或散在盤面
          const arm = h(6).mul(S.arms.x).floor();
          const onArm = h(7).lessThan(0.72).and(kind.lessThan(0.5));
          const thArm = arm.mul(6.2832).div(S.arms.x).add(S.arms.y.mul(log(r.div(R).add(0.05)))).add(gauss.mul(0.32));
          const th = select(onArm, thArm, h(8).mul(6.2832));
          const thick = select(isBulge, r.mul(0.6), R.mul(0.025).add(r.mul(0.02))).mul(gauss);
          const thick2 = select(kind.greaterThan(0.5), r.mul(h(9).sub(0.5).mul(1.6)), thick);
          const dir = U.mul(cos(th)).add(W.mul(sin(th)));
          const pos = S.center.xyz.add(dir.mul(r)).add(N3.mul(thick2));
          // 速度：繞核心的圓周速度（Plummer 位能）
          const r2 = r.mul(r).add(a.mul(a));
          const vc = sqrt(M.mul(r.mul(r)).div(r2.mul(sqrt(r2))));
          const tang = U.mul(sin(th).negate()).add(W.mul(cos(th)));
          const disp = vec3(h(10).sub(0.5), h(11).sub(0.5), h(12).sub(0.5)).mul(select(isBulge, vc.mul(0.9), vc.mul(0.12)));
          const vk = select(kind.greaterThan(0.5), float(0.75), select(isBulge, float(0.35), float(1)));
          const vel = S.vel.xyz.add(tang.mul(vc.mul(vk))).add(disp);
          // 顏色：核球偏黃、旋臂偏藍白、少數粉紅色的星雲團
          const temp = select(isBulge, h(13).mul(0.25).add(0.12), select(onArm, h(13).mul(0.45).add(0.55), h(13).mul(0.4).add(0.3)));
          const pink = onArm.and(h(14).lessThan(0.05));
          // 顏色溫度＋4×種類（0 核球、1 盤面、2 旋臂、3 星雲），畫氣體和塵埃時用得到
          const cls = select(kind.greaterThan(0.5), float(3), select(isBulge, float(0), select(onArm, float(2), float(1))));
          // w：活著 = 1 + 生出來時離中心多遠（0～1），塵埃只畫在外圈
          np.assign(vec4(pos, float(1).add(clamp(r.div(R), 0, 1))));
          nv.assign(vec4(vel, select(pink, float(2), temp).add(cls.mul(4))));
        }).Else(() => { np.assign(vec4(0, -9999, 0, 0)); nv.assign(vec4(0)); });
      });
      P.element(i).assign(np); V.element(i).assign(nv);
    })().compute(N);

    // ---------------- 每一步：受重天體吸引、被黑洞吃掉
    this.stepNode = Fn(() => {
      const p = P.element(instanceIndex), v = V.element(instanceIndex);
      const pos = p.xyz.toVar(), vel = v.xyz.toVar(), alive = p.w.toVar();
      If(alive.greaterThan(0.5), () => {
        const acc = vec3(0).toVar();
        Loop(nB, ({ i }) => {
          const b = B.element(i), bp = BP.element(i);
          const d = b.xyz.sub(pos), r2 = dot(d, d);
          const s2 = r2.add(bp.x.mul(bp.x));
          acc.addAssign(d.mul(b.w.div(s2.mul(sqrt(s2)))));
          If(bp.y.greaterThan(0.5).and(r2.lessThan(bp.z.mul(bp.z))), () => { alive.assign(0); });
        });
        vel.addAssign(acc.mul(dt));
        pos.addAssign(vel.mul(dt));
      });
      P.element(instanceIndex).assign(vec4(pos, alive));
      V.element(instanceIndex).assign(vec4(vel, v.w));
    })().compute(N);

    // ---------------- 畫：加法混色的小光點
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const p = P.element(instanceIndex), v = V.element(instanceIndex);
    const bright = hash(instanceIndex.add(7)).pow(6);   // 少數幾顆特別亮
    const camD = length(cameraPosition.sub(p.xyz));
    const size = mix(0.16, 0.6, bright).mul(camD.mul(0.0045).add(0.35)).mul(p.w.greaterThan(0.5).select(1, 0));
    mat.positionNode = positionGeometry.mul(size).add(p.xyz);
    mat.vertexNode = billboarding();
    const t = v.w.mod(4);
    // 顏色鮮豔一點：核球金黃、旋臂藍、少數粉紅；星雲（種類 3）偏紫藍
    // 星星的顏色用「黑體輻射」：溫度 2800 K（紅）→ 6000 K（黃白，像太陽）→ 30000 K（藍白）。
    // 參考公開的星系渲染做法（density-wave galaxy renderer），溫度越高也越亮。
    const K = mix(float(2800), float(30000), clamp(t, 0, 1).pow(2.2)), k100 = K.div(100);
    const bbR = select(k100.lessThan(66), float(1), k100.sub(60).max(1).pow(-0.1332).mul(1.293));
    const bbG = select(k100.lessThan(66), k100.max(1).log().mul(0.39).sub(0.634), k100.sub(60).max(1).pow(-0.0755).mul(1.13));
    const bbB = select(k100.greaterThan(65.9), float(1), select(k100.lessThan(19), float(0), k100.sub(10).max(1).log().mul(0.543).sub(1.186)));
    const bb = vec3(bbR, bbG, bbB).clamp(0, 1);
    const c1 = bb, c2 = bb;
    const isNeb = v.w.greaterThan(11.5);
    const col0 = select(t.greaterThan(1.5), vec3(1, 0.2, 0.55), c1);
    const lumK = K.div(6000).pow(0.6).clamp(0.45, 2.2);   // 熱的星比較亮
    const col = select(isNeb, mix(col0, vec3(0.75, 0.45, 1), hash(instanceIndex.add(3)).mul(0.6)), col0);
    const fall = smoothstep(0.5, 0.0, uv().sub(0.5).length());
    // 星星越多每顆越暗，不然中間疊成一團白
    const kN = Math.min(1.3, Math.sqrt(70000 / N));
    const bulgeK = select(v.w.lessThan(4), float(0.32), float(1));   // 核球的星很密，暗一點才看得到金黃色而不是一團白
    // 靠近中心的星很密：越靠中間越暗、越偏金黃（真的星系照片中心是黃色的，不是一團白）
    const rr = p.w.sub(1).clamp(0, 1);
    const inner = smoothstep(0.45, 0.0, rr);
    const colR = mix(col, vec3(1, 0.62, 0.3), inner.mul(0.9));
    mat.colorNode = colR.mul(lumK).mul(mix(0.9, 3.6, bright)).mul(bulgeK).mul(mix(1, 0.12, inner)).mul(fall.pow(1.8)).mul(kN);
    mat.opacityNode = fall;
    const mesh = this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.count = N; mesh.frustumCulled = false;
    scene.add(mesh);

    // ---------------- 氣體雲：每隔幾顆星挑一顆，畫成很大、很淡的彩色光團（旋臂上的粉紅、藍色星雲）
    const pick = (count, off) => {
      const stride = Math.max(1, Math.floor(N / count));
      const j = instanceIndex.mul(stride).add(off % stride);
      return { n: Math.floor(N / stride), p: P.element(j), v: V.element(j), j };
    };
    {
      const g = pick(3200, 5), cls = g.v.w.div(4).floor(), hh = hash(g.j.add(11));
      const show = cls.greaterThan(1.5).and(g.p.w.greaterThan(1.2).or(cls.greaterThan(2.5)));   // 只有旋臂（不含中心附近）和星雲
      const gm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      gm.positionNode = positionGeometry.mul(select(show, mix(5, 12, hh), 0)).add(g.p.xyz);
      gm.vertexNode = billboarding();
      const f = smoothstep(0.5, 0.0, uv().sub(0.5).length());
      const gc = select(cls.greaterThan(2.5),
        mix(vec3(0.45, 0.2, 0.9), vec3(0.1, 0.55, 0.8), hh),            // 星雲：紫、青
        select(hh.lessThan(0.45), vec3(1, 0.18, 0.45), vec3(0.2, 0.4, 1)));   // 旋臂：粉紅（氫）或藍（反射星雲）
      gm.colorNode = gc.mul(f.pow(2.2)).mul(select(cls.greaterThan(2.5), float(0.03), float(0.08)));
      gm.opacityNode = f;
      const gas = this.gas = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), gm);
      gas.count = g.n; gas.frustumCulled = false; gas.renderOrder = 1;
      scene.add(gas);
    }
    // ---------------- 塵埃帶：暗暗的斑塊，用「乘法」把後面的星光變暗（旋臂內側那種黑黑的帶子）
    {
      const g = pick(2600, 9), cls = g.v.w.div(4).floor(), hh = hash(g.j.add(23));
      const show = cls.greaterThan(0.5).and(cls.lessThan(2.5)).and(g.p.w.greaterThan(1.22));   // 核心附近不放，不然中間會黑掉
      const dm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
      dm.blending = THREE.CustomBlending;
      dm.blendEquation = THREE.AddEquation; dm.blendSrc = THREE.ZeroFactor; dm.blendDst = THREE.SrcColorFactor;
      dm.blendEquationAlpha = THREE.AddEquation; dm.blendSrcAlpha = THREE.ZeroFactor; dm.blendDstAlpha = THREE.OneFactor;
      dm.positionNode = positionGeometry.mul(select(show, mix(3, 6.5, hh), 0)).add(g.p.xyz);
      dm.vertexNode = billboarding();
      const f = smoothstep(0.5, 0.05, uv().sub(0.5).length());
      dm.colorNode = mix(vec3(1), vec3(0.5, 0.38, 0.3), f.mul(0.42));   // 中間最暗，帶一點咖啡色
      dm.opacityNode = float(1);
      const dust = this.dust = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dm);
      dust.count = g.n; dust.frustumCulled = false; dust.renderOrder = 2;
      scene.add(dust);
    }
    this.group = new THREE.Group(); scene.add(this.group);
    this.kill(0, N);
  }

  // ---------------- 生成（GPU）
  _spawn(start, n, kind, o = {}) {
    const S = this.sp;
    S.range.value.set(start, n, Math.random() * 1000, kind);
    if (o.center) S.center.value.set(o.center.x, o.center.y, o.center.z, o.mass);
    if (o.vel) S.vel.value.set(o.vel.x, o.vel.y, o.vel.z, o.soft);
    if (o.normal) S.nrm.value.set(o.normal.x, o.normal.y, o.normal.z, o.radius);
    if (o.arms) S.arms.value.set(o.arms, o.wind ?? 3.2, o.bulge ?? 0.14, 0);
    this.renderer.compute(this.spawnNode);
  }
  kill(start, n) { this._spawn(start, n, 2); }

  // 找空的格子（slots 個連續）；滿了就回收最舊的星系
  _alloc(slots) {
    for (let s = 0; s + slots <= this.SLOTS; s++) {
      let ok = true; for (let k = 0; k < slots; k++) if (this.slotOwner[s + k]) ok = false;
      if (ok) return s;
    }
    // 回收：最舊的星系
    const old = this.bodies.filter((b) => b.slot != null).sort((a, b) => a.born - b.born)[0];
    if (old) { this.removeBody(old); return this._alloc(slots); }
    return 0;
  }

  addGalaxy({ pos, vel = new THREE.Vector3(), normal = new THREE.Vector3(0, 1, 0), mass = 2000, radius = 34, slots = 1, arms = 2, wind = 3.2, bulge = 0.14, kind = 0 }) {
    const s = this._alloc(slots);
    const body = this._body({ pos, vel, mass, soft: radius * 0.12, type: 0 });
    body.slot = s; body.slots = slots;
    for (let k = 0; k < slots; k++) this.slotOwner[s + k] = body;
    this._spawn(s * this.slotN, slots * this.slotN, kind, { center: pos, mass, vel, soft: body.soft, normal: normal.clone().normalize(), radius, arms, wind, bulge });
    return body;
  }
  addBlackHole({ pos, vel = new THREE.Vector3(), mass = 1200 }) {
    if (this.bodies.length >= MAX_BODIES) this.removeBody(this.bodies.find((b) => b.type === 1) || this.bodies[0]);
    return this._body({ pos, vel, mass, soft: G_SOFT_BH, type: 1 });
  }
  _body({ pos, vel, mass, soft, type }) {
    const b = { pos: pos.clone(), vel: vel.clone(), m: mass, soft, type, eat: type === 1 ? 1.4 + mass / 1500 : 0, born: performance.now() + Math.random(), slot: null };
    b.obj = type === 1 ? blackHoleMesh(mass) : coreMesh(mass);
    this.group.add(b.obj);
    this.bodies.push(b);
    return b;
  }
  removeBody(b) {
    if (b.slot != null) { this.kill(b.slot * this.slotN, b.slots * this.slotN); for (let k = 0; k < b.slots; k++) this.slotOwner[b.slot + k] = null; }
    this.group.remove(b.obj);
    this.bodies.splice(this.bodies.indexOf(b), 1);
  }
  clear() { for (const b of [...this.bodies]) this.removeBody(b); this.kill(0, this.N); this.slotOwner.fill(null); }

  // ---------------- 每一格：重天體 N-body（CPU），然後星星（GPU）
  step(dtSim, sub = 2) {
    const h = dtSim / sub, bs = this.bodies;
    for (let k = 0; k < sub; k++) {
      for (const a of bs) {
        const acc = new THREE.Vector3();
        for (const b of bs) {
          if (a === b) continue;
          const d = b.pos.clone().sub(a.pos), s = Math.max(a.soft, b.soft), r2 = d.lengthSq() + s * s;
          acc.addScaledVector(d, b.m / (r2 * Math.sqrt(r2)));
        }
        a.vel.addScaledVector(acc, h);
      }
      for (const a of bs) a.pos.addScaledVector(a.vel, h);
      // 黑洞碰到核心或另一個黑洞：合併（動量守恆）
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], b = bs[j];
        if ((a.type === 1 || b.type === 1) && a.pos.distanceTo(b.pos) < Math.max(a.eat, b.eat) * 0.8) {
          const keep = a.type === 1 ? a : b, gone = keep === a ? b : a;
          keep.vel.multiplyScalar(keep.m).addScaledVector(gone.vel, gone.m).divideScalar(keep.m + gone.m);
          keep.m += gone.m * 0.5; keep.eat = 1.4 + keep.m / 1500;
          if (gone.slot != null) { for (let k2 = 0; k2 < gone.slots; k2++) this.slotOwner[gone.slot + k2] = null; gone.slot = null; }   // 星星留著，繼續被吃
          this.group.remove(gone.obj); bs.splice(bs.indexOf(gone), 1);
          keep.obj.scale.setScalar(1 + keep.m / 3000);
        }
      }
    }
    // 上傳
    this.nB.value = bs.length;
    bs.forEach((b, i) => {
      this.B.array[i].set(b.pos.x, b.pos.y, b.pos.z, b.m);
      this.BP.array[i].set(b.soft, b.type, b.eat, 0);
      b.obj.position.copy(b.pos);
    });
    for (let k = 0; k < sub; k++) { this.dt.value = h; this.renderer.compute(this.stepNode); }
  }
}

function abs1(x) { return x.abs(); }

// 星系核心：一團暖白色的光
function coreMesh(mass) {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const f = smoothstep(0.5, 0.0, uv().sub(0.5).length());
  m.colorNode = vec3(1, 0.68, 0.36).mul(f.pow(3).mul(0.07));   // 核心：小一點、暖黃色，不要過曝成一團白
  m.opacityNode = f;
  m.vertexNode = billboarding();
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
  s.scale.setScalar(3 + mass / 1100);
  s.renderOrder = 3;   // 畫在塵埃後面，核心才不會被塵埃蓋暗
  return s;
}
// 黑洞：黑色的球＋發光的吸積盤
function blackHoleMesh(mass) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicNodeMaterial({ color: 0x000000 }));
  const rm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const r = uv().sub(0.5).length().mul(2);
  const q = uv().sub(0.5);
  const swirl = sin(atan(q.y, q.x).mul(5).add(time.mul(4)).add(r.mul(12))).mul(0.25).add(0.75);
  rm.colorNode = mix(vec3(1, 0.85, 0.5), vec3(1, 0.35, 0.08), smoothstep(0.35, 1, r)).mul(smoothstep(1, 0.75, r)).mul(smoothstep(0.3, 0.42, r)).mul(swirl).mul(4);
  rm.opacityNode = smoothstep(1, 0.7, r).mul(smoothstep(0.28, 0.42, r));
  const disk = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), rm); disk.rotation.x = -Math.PI / 2 + 0.25;
  const halo = coreMesh(0); halo.material = halo.material.clone();
  halo.material.colorNode = vec3(1, 0.6, 0.3).mul(smoothstep(0.5, 0.0, uv().sub(0.5).length()).pow(3).mul(1.5));
  halo.scale.setScalar(8);
  disk.renderOrder = 3; ball.renderOrder = 3;
  g.add(halo, disk, ball);
  g.scale.setScalar(1 + mass / 3000);
  return g;
}
void int; void max; void min; void vec2;
