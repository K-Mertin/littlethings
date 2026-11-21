// 特效：爆炸火花（也是公式算的，和子彈一樣不用一顆一顆存）、捲動的星空與星雲背景、道具、玩家的雷射
import * as THREE from 'three';
import { Fn, uniformArray, uniform, instanceIndex, positionGeometry, vec3, vec2, float, int, sin, cos, floor, select, smoothstep, uv, mix, max, exp, hash, fract, mx_fractal_noise_float, time, positionWorld, abs, varyingProperty } from 'three/tsl';
import { FIELD } from './bullets.js';

// ---------------------------------------------------------------- 爆炸：每次爆炸 192 顆火花，往四面八方噴、越飛越慢、變小變暗
const NB = 64, PB = 192;
export class Bursts {
  constructor(scene) {
    this.B = Array.from({ length: NB * 2 }, () => new THREE.Vector4(0, 0, -99, 0));
    this.i = 0; this.now = uniform(0);
    const B = uniformArray(this.B, 'vec4'), now = this.now;
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const life = varyingProperty('float', 'vLife'), colK = varyingProperty('float', 'vColK'), hot = varyingProperty('float', 'vHot');
    mat.positionNode = Fn(() => {
      const bf = floor(float(instanceIndex).div(PB)), j = float(instanceIndex).sub(bf.mul(PB)), b2 = int(bf).mul(2);
      const p0 = B.element(b2), p1 = B.element(b2.add(1));
      const a = now.sub(p0.z), jf = j.add(bf.mul(0.37));
      const ang = hash(jf.mul(1.31)).mul(6.2832), sp = hash(jf.mul(2.17).add(5)).pow(0.6).mul(p1.x);
      const L = p1.z.add(hash(jf.mul(3.7)).mul(0.5));   // 每顆火花活多久不太一樣
      const d = sp.mul(float(1).sub(exp(a.mul(-2.6)))).div(2.6);
      life.assign(max(float(1).sub(a.div(L)), 0).mul(select(a.greaterThanEqual(0), float(1), float(0))));
      colK.assign(p0.w); hot.assign(hash(jf.mul(9.1)));
      const sz = p1.y.mul(life).mul(hash(jf.mul(4.3)).mul(0.7).add(0.5));
      return vec3(p0.x.add(sin(ang).mul(d)).add(positionGeometry.x.mul(sz)), 0.4 + 0.0, p0.y.add(cos(ang).mul(d)).add(positionGeometry.y.mul(sz)));
    })();
    const r = uv().sub(0.5).length().mul(2);
    // 顏色：剛爆的時候白熱，慢慢變成橘紅（或隊伍顏色）
    const base = select(colK.lessThan(0.5), vec3(1, 0.45, 0.12), select(colK.lessThan(1.5), vec3(0.35, 0.7, 1), select(colK.lessThan(2.5), vec3(0.8, 0.45, 1), vec3(1, 0.9, 0.4))));
    mat.colorNode = mix(base, vec3(1, 0.95, 0.85), life.mul(life).mul(hot.mul(0.6).add(0.4))).mul(smoothstep(1, 0, r)).mul(life.mul(2.2));
    mat.opacityNode = smoothstep(1, 0, r);
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, NB * PB); m.frustumCulled = false; m.renderOrder = 6;
    this.mesh = m; scene.add(m);
  }
  // kind：0 橘（敵人）1 藍（玩家）2 紫（魔王）3 金（道具）
  add(x, z, t, { kind = 0, speed = 9, size = 0.35, life = 0.7 } = {}) {
    const k = (this.i++ % NB) * 2;
    this.B[k].set(x, z, t, kind); this.B[k + 1].set(speed, size, life, 0);
  }
  update(t) { this.now.value = t; }
}

// ---------------------------------------------------------------- 背景：遠方的星雲（噪聲）＋三層不同速度捲動的星星
export class Space {
  constructor(scene) {
    this.tint = uniform(new THREE.Color(0.9, 0.3, 0.6)); this.tint2 = uniform(new THREE.Color(0.2, 0.3, 0.9));
    this.scroll = uniform(0);
    const neb = new THREE.MeshBasicNodeMaterial({ depthWrite: false });
    neb.colorNode = Fn(() => {
      const p = positionWorld.xz.mul(0.035).add(vec2(0, this.scroll.mul(-0.01)));
      const n1 = mx_fractal_noise_float(vec3(p.x, p.y, 0.3), 5, 2, 0.5).mul(0.5).add(0.5);
      const n2 = mx_fractal_noise_float(vec3(p.x.mul(2.3).add(7), p.y.mul(2.3), 1.7), 4, 2, 0.55).mul(0.5).add(0.5);
      const cloud = smoothstep(0.45, 0.85, n1).mul(0.32), wisp = smoothstep(0.5, 0.9, n2).mul(0.2);   // 星雲暗一點，子彈才看得清楚
      const dust = smoothstep(0.55, 0.75, mx_fractal_noise_float(vec3(p.x.mul(4), p.y.mul(4), 3.3), 3, 2, 0.5).mul(0.5).add(0.5));
      return vec3(this.tint).mul(cloud).add(vec3(this.tint2).mul(wisp)).mul(float(1).sub(dust.mul(0.6))).add(vec3(0.01, 0.012, 0.03));
    })();
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), neb); plane.rotation.x = -Math.PI / 2; plane.position.y = -30; plane.renderOrder = -2;
    scene.add(plane);
    // 星星：每層一個 InstancedMesh，位置用編號的亂數，z 跟著時間往下捲、超出就從上面回來
    const NS = 2400;
    const sm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const tw = varyingProperty('float', 'vTw');
    sm.positionNode = Fn(() => {
      const id = float(instanceIndex), layer = floor(hash(id.mul(0.71)).mul(3));
      const spd = layer.mul(layer).mul(2.2).add(0.8), y = layer.mul(-9).sub(4);
      const W = float(70), H = float(90);
      const x = hash(id.mul(1.37)).sub(0.5).mul(W), z0 = hash(id.mul(2.91)).mul(H);
      const z = fract(z0.add(this.scroll.mul(spd)).div(H)).mul(H).sub(H.mul(0.5));
      const sz = layer.mul(0.05).add(0.06).mul(hash(id.mul(5.3)).mul(1.2).add(0.4));
      tw.assign(sin(time.mul(hash(id).mul(4).add(1)).add(id)).mul(0.3).add(0.7).mul(layer.mul(0.25).add(0.4)));
      return vec3(x.add(positionGeometry.x.mul(sz)), y, z.add(positionGeometry.y.mul(sz)));
    })();
    const r = uv().sub(0.5).length().mul(2);
    sm.colorNode = vec3(0.85, 0.9, 1).mul(smoothstep(1, 0, r)).mul(tw).mul(2);
    const stars = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(0), sm, NS); stars.frustumCulled = false; stars.renderOrder = -1;
    stars.rotation.x = 0; scene.add(stars);
    void abs; void cos; void FIELD;
  }
  setStage(a, b) { this.tint.value.set(a); this.tint2.value.set(b); }
}

// ---------------------------------------------------------------- 很多小東西（玩家雷射、道具、敵人的小子彈頭）：CPU 給位置，用 InstancedMesh 畫
export class Sprites {
  constructor(scene, max, colorFn, { w = 0.25, h = 1.0, order = 7 } = {}) {
    this.max = max; this.n = 0;
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const q = uv().sub(0.5).mul(2), r = vec2(q.x.mul(1), q.y).length();
    mat.colorNode = colorFn(r, q);
    mat.opacityNode = smoothstep(1, 0.2, r);
    const g = new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(g, mat, max); this.mesh.frustumCulled = false; this.mesh.renderOrder = order; this.mesh.count = 0;
    scene.add(this.mesh); this.M = new THREE.Matrix4(); this.Q = new THREE.Quaternion(); this.S = new THREE.Vector3(1, 1, 1); this.P = new THREE.Vector3(); this.Y = new THREE.Vector3(0, 1, 0);
  }
  begin() { this.n = 0; }
  put(x, z, rotY = 0, s = 1) {
    if (this.n >= this.max) return;
    this.P.set(x, 0.3, z); this.Q.setFromAxisAngle(this.Y, rotY); this.S.setScalar(s);
    this.M.compose(this.P, this.Q, this.S); this.mesh.setMatrixAt(this.n++, this.M);
  }
  end() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; }
}
