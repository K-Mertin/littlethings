// 輪胎痕：打滑或拉手煞車時，後輪在路面留下黑色的痕跡（環狀緩衝區，舊的會被新的蓋掉）
import * as THREE from 'three';
import { attribute, vec3, mix } from 'three/tsl';

const MAX = 3000;   // 最多幾段
const W = 0.22;     // 痕跡寬度

export class Skids {
  constructor(scene, wet) {
    this.pos = new Float32Array(MAX * 4 * 3); this.alpha = new Float32Array(MAX * 4);
    const idx = new Uint32Array(MAX * 6);
    for (let i = 0; i < MAX; i++) { const o = i * 4; idx.set([o, o + 1, o + 2, o + 1, o + 3, o + 2], i * 6); }
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('a', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    // 乾路：黑色胎痕；濕路：輪胎把水擠開，留下比較亮、比較不反光的痕跡
    m.colorNode = mix(vec3(0.012, 0.012, 0.014), vec3(0.16, 0.16, 0.17), wet);
    m.opacityNode = attribute('a', 'float').mul(0.7);
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;
    scene.add(this.mesh);
    this.head = 0; this.last = new Map(); this.dirty = false;
  }
  clear() { this.pos.fill(0); this.alpha.fill(0); this.last.clear(); this.dirty = true; }
  // key：哪台車哪個輪子；p：輪子落地點；k：痕跡深淺（0 就不畫、斷開）
  mark(key, p, k) {
    const prev = this.last.get(key);
    if (k <= 0.05) { this.last.delete(key); return; }
    if (!prev) { this.last.set(key, { x: p.x, z: p.z, k }); return; }
    const dx = p.x - prev.x, dz = p.z - prev.z, L = Math.hypot(dx, dz);
    if (L < 0.35) return;
    if (L > 4) { this.last.set(key, { x: p.x, z: p.z, k }); return; }   // 跳太遠（回賽道）就斷開
    const nx = -dz / L * W, nz = dx / L * W, o = this.head * 12, y = 0.025;
    this.pos.set([prev.x - nx, y, prev.z - nz, prev.x + nx, y, prev.z + nz, p.x - nx, y, p.z - nz, p.x + nx, y, p.z + nz], o);
    this.alpha.set([prev.k, prev.k, k, k], this.head * 4);
    this.head = (this.head + 1) % MAX; this.dirty = true;
    this.last.set(key, { x: p.x, z: p.z, k });
  }
  update() {
    if (!this.dirty) return;
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.a.needsUpdate = true; this.dirty = false;
  }
}
