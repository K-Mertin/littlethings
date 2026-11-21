// 村莊：放在平緩的陸地上，附近有河或湖（淡水）就會慢慢長大，只有海可以捕魚長得比較慢，
// 沒有水會慢慢變小；被水淹或被沖進海裡，房子就會被沖走。
// 用讀回來的高度和水深判斷（每半秒一次），房子是一個 InstancedMesh。
import * as THREE from 'three';

export const VMAX = 6, HOUSES = 14;
const NAMES = ['河畔村', '湖濱鎮', '山腳村', '綠谷村', '漁港', '泉水村', '松林鎮', '石橋村'];

export class Villages {
  constructor(scene, N) {
    this.N = N; this.list = []; this.nameK = 0;
    // 房子：牆（米白）和屋頂（每間房子不同顏色，用 instanceColor）分成兩個 InstancedMesh，位置一樣
    const wall = new THREE.BoxGeometry(1, 0.8, 1.2); wall.translate(0, 0.4, 0);
    const roof = new THREE.ConeGeometry(0.95, 0.7, 4); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 1.25); roof.translate(0, 1.15, 0);
    const M = VMAX * HOUSES;
    this.walls = new THREE.InstancedMesh(wall, new THREE.MeshStandardNodeMaterial({ color: 0xece0c8, roughness: 0.85 }), M);
    this.roofs = new THREE.InstancedMesh(roof, new THREE.MeshStandardNodeMaterial({ roughness: 0.7 }), M);
    for (const m of [this.walls, this.roofs]) { m.count = 0; m.castShadow = true; m.frustumCulled = false; scene.add(m); }
    this.roofs.setColorAt(0, new THREE.Color(1, 1, 1));
    // 村莊的旗子（看得出村莊在哪、遠遠也找得到）
    const pole = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5); pole.translate(0, 1.3, 0);
    const flag = new THREE.PlaneGeometry(1, 0.6); flag.translate(0.5, 2.25, 0);
    this.flags = new THREE.InstancedMesh(merge([pole, flag], [[0.4, 0.3, 0.2], [1, 0.84, 0.3]], [0, 0]), new THREE.MeshStandardNodeMaterial({ vertexColors: true, side: THREE.DoubleSide }), VMAX);
    this.flags.count = 0; this.flags.frustumCulled = false; scene.add(this.flags);
    this.M = new THREE.Matrix4(); this.Q = new THREE.Quaternion(); this.Y = new THREE.Vector3(0, 1, 0); this.C = new THREE.Color();
    this.events = [];   // 給畫面顯示的訊息（長大、淹水、被沖走）
  }
  // 能不能蓋在這裡：太低（海邊沙灘）、太高、太陡都不行
  canBuild(s, x, y) {
    const N = this.N, xi = Math.round(x), yi = Math.round(y);
    if (xi < 2 || yi < 2 || xi > N - 3 || yi > N - 3) return '太靠近邊邊了';
    const i = yi * N + xi, h = s.H[i];
    if (h < 0.8) return '這裡太低了，會被海水淹到';
    if (h > 24) return '這裡太高太冷了，沒有人想住';
    if (s.W[i] > 0.1) return '這裡有水，不能蓋房子';
    if (Math.hypot(s.H[i + 1] - s.H[i - 1], s.H[i + N] - s.H[i - N]) * 0.5 > 0.7) return '這裡太陡了';
    return null;
  }
  add(x, y) { if (this.list.length >= VMAX) return false; this.list.push({ x, y, pop: 2, acc: 0, name: NAMES[this.nameK++ % NAMES.length], wet: 0, need: 0, best: 2, seed: Math.random() * 6 }); return true; }
  removeNear(x, y) { const k = this.list.findIndex((v) => Math.hypot(v.x - x, v.y - y) < 5); if (k < 0) return null; return this.list.splice(k, 1)[0]; }
  clear() { this.list = []; this.walls.count = this.roofs.count = this.flags.count = 0; }
  // 每半秒：看看附近有沒有水、有沒有被淹
  update(s, dt) {
    const N = this.N;
    for (const v of [...this.list]) {
      const xi = Math.round(v.x), yi = Math.round(v.y), ci = yi * N + xi;
      if (s.H[ci] < 0.1) { this.list.splice(this.list.indexOf(v), 1); this.events.push(`🌊 ${v.name}被沖進海裡了…`); continue; }
      let fresh = 0, sea = 0, flood = 0, fn = 0;
      for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
        const x = xi + dx, y = yi + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue;
        const d2 = dx * dx + dy * dy; if (d2 > 196) continue;
        const i = y * N + x;
        if (s.H[i] < -0.2) { if (d2 < 100) sea++; } else if (s.W[i] > 0.12) fresh++;
        if (d2 <= 9) { flood += s.W[i]; fn++; }
      }
      flood /= fn;
      v.fresh = fresh; v.sea = sea;
      if (flood > 0.3) {   // 淹水：房子一間一間被沖走
        v.acc -= dt * 1.2;
        if (!v.wet) this.events.push(`🌊 ${v.name}淹水了！快把水引走`); v.wet = 1;
      } else {
        v.wet = 0;
        const rate = fresh > 6 ? 1 / 4 : sea > 4 ? 1 / 12 : -1 / 15;   // 每秒長幾間房子
        v.acc += dt * rate;
        if (rate < 0 && !v.need && v.pop > 1) { v.need = 1; this.events.push(`🏜️ ${v.name}附近沒有水，人慢慢搬走了`); }
        if (rate > 0) v.need = 0;
      }
      while (v.acc >= 1 && v.pop < HOUSES) { v.acc -= 1; v.pop++; if (v.pop > v.best) { v.best = v.pop; if (v.pop % 4 === 0) this.events.push(`🏘️ ${v.name}長大了，有 ${v.pop} 間房子`); } }
      while (v.acc <= -1 && v.pop > 0) { v.acc += 1; v.pop--; }
      v.acc = Math.max(-1, Math.min(1, v.acc));
      if (v.pop <= 0) { this.list.splice(this.list.indexOf(v), 1); this.events.push(`💨 ${v.name}的人都搬走了`); }
    }
    this.draw(s);
  }
  draw(s) {
    const N = this.N, half = (N - 1) / 2; let n = 0, f = 0;
    const ROOF = [0xc0392b, 0x2e6da4, 0xd4782a, 0x7a4a9a, 0x2f8f5b];
    for (const v of this.list) {
      for (let k = 0; k < v.pop; k++) {
        const a = k * 2.4 + v.seed, r = k ? 1.9 * Math.sqrt(k) : 0;
        const x = v.x + Math.cos(a) * r, y = v.y + Math.sin(a) * r, i = Math.round(y) * N + Math.round(x);
        if (i < 0 || i >= N * N) continue;
        this.Q.setFromAxisAngle(this.Y, a * 1.7);
        const sc = 0.85 + ((k * 7) % 5) * 0.08;
        this.M.compose(new THREE.Vector3(x - half, s.H[i] - 0.05, y - half), this.Q, new THREE.Vector3(sc, sc, sc));
        this.walls.setMatrixAt(n, this.M); this.roofs.setMatrixAt(n, this.M); this.roofs.setColorAt(n, this.C.set(ROOF[(k + v.seed * 3 | 0) % ROOF.length])); n++;
      }
      const i = Math.round(v.y) * N + Math.round(v.x);
      this.M.compose(new THREE.Vector3(v.x - half + 0.8, s.H[i], v.y - half + 0.8), this.Q.identity(), new THREE.Vector3(1, 1, 1));
      this.flags.setMatrixAt(f++, this.M);
    }
    for (const m of [this.walls, this.roofs]) { m.count = n; m.instanceMatrix.needsUpdate = true; }
    this.roofs.instanceColor.needsUpdate = true;
    this.flags.count = f; this.flags.instanceMatrix.needsUpdate = true;
  }
}

function merge(list, colors) {
  const pos = [], nor = [], col = [];
  list.forEach((g0, k) => { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); for (let i = 0; i < g.attributes.position.count; i++) col.push(...colors[k]); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
}
