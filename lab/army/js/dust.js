// 塵土：跑步（尤其騎兵）時腳下揚起的土、倒下時的一小團灰。CPU 粒子池，每格上傳到 GPU 畫成面向鏡頭的軟圓片。
import * as THREE from 'three';
import { instancedArray, instanceIndex, positionGeometry, uniform, uv, smoothstep, vec3, float } from 'three/tsl';

const MAX = 900;

export class Dust {
  constructor(scene) {
    this.P = new Float32Array(MAX * 8);   // x y z 大小｜透明度 壽命 年齡 上升速度
    this.n = 0; this.head = 0;
    this.A = instancedArray(new Float32Array(MAX * 4), 'vec4');   // x y z 大小
    this.B = instancedArray(new Float32Array(MAX * 4), 'vec4');   // 透明度、顏色變化
    this.right = uniform(new THREE.Vector3(1, 0, 0)); this.up = uniform(new THREE.Vector3(0, 1, 0));
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const a = this.A.element(instanceIndex), bb = this.B.element(instanceIndex);
    // 自己做面向鏡頭（billboarding() 不能每顆不同大小）
    m.positionNode = a.xyz.add(this.right.mul(positionGeometry.x.mul(a.w))).add(this.up.mul(positionGeometry.y.mul(a.w)));
    const f = smoothstep(0.5, 0.1, uv().sub(0.5).length());
    m.colorNode = vec3(0.62, 0.52, 0.38).mul(bb.y.mul(0.25).add(0.85));
    m.opacityNode = f.mul(bb.x).mul(float(0.55));
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    scene.add(this.mesh);
  }
  clear() { this.P.fill(0); this.dead = null; }
  puff(x, y, z, size = 1.2, life = 1.6) {
    const o = this.head * 8; this.head = (this.head + 1) % MAX;
    this.P[o] = x + (Math.random() - 0.5) * 0.6; this.P[o + 1] = y + 0.2; this.P[o + 2] = z + (Math.random() - 0.5) * 0.6; this.P[o + 3] = size;
    this.P[o + 4] = 1; this.P[o + 5] = life * (0.7 + Math.random() * 0.6); this.P[o + 6] = 0.0001; this.P[o + 7] = 0.3 + Math.random() * 0.5;
  }
  // 從模擬結果找會揚起塵土的人
  emit(b, dt) {
    if (!this.dead || this.dead.length < b.n) this.dead = new Uint8Array(b.MAX);
    for (let i = 0; i < b.n; i++) {
      if (!b.alive[i]) { if (!this.dead[i]) { this.dead[i] = 1; this.puff(b.x[i], b.y[i], b.z[i], 1.6, 1.2); } continue; }
      const sp2 = b.vx[i] * b.vx[i] + b.vz[i] * b.vz[i];
      if (sp2 < 9) continue;
      const rate = b.type[i] === 2 ? 4 : 0.6;   // 騎兵揚起比較多
      if (Math.random() < rate * dt) this.puff(b.x[i] - b.vx[i] * 0.1, b.y[i], b.z[i] - b.vz[i] * 0.1, b.type[i] === 2 ? 1.8 : 1.0, b.type[i] === 2 ? 2 : 1.2);
    }
  }
  update(dt, camera) {
    const P = this.P, A = this.A.value.array, B = this.B.value.array;
    let k = 0;
    for (let i = 0; i < MAX; i++) {
      const o = i * 8; if (P[o + 6] <= 0) continue;
      P[o + 6] += dt; const t = P[o + 6] / P[o + 5];
      if (t >= 1) { P[o + 6] = 0; continue; }
      P[o + 1] += P[o + 7] * dt; P[o + 3] += dt * 1.4;
      const q = k * 4; A[q] = P[o]; A[q + 1] = P[o + 1]; A[q + 2] = P[o + 2]; A[q + 3] = P[o + 3];
      B[q] = Math.min(1, t * 6) * (1 - t); B[q + 1] = (i % 7) / 7; k++;
    }
    this.mesh.count = k; this.A.value.needsUpdate = true; this.B.value.needsUpdate = true;
    const e = camera.matrixWorld.elements;
    this.right.value.set(e[0], e[1], e[2]); this.up.value.set(e[4], e[5], e[6]);
  }
}
