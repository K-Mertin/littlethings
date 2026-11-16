// 戰場地形：山丘（高度）、河流（走得慢，淺灘和橋走得快）、樹林（走得慢、可以擋箭）
// 地圖：x −120～120、z −80～80；藍軍（玩家）在 +z（靠鏡頭），紅軍在 −z。
import * as THREE from 'three';
import { vec3, mix, smoothstep, positionWorld, normalWorld, mx_noise_float, time, sin, uv } from 'three/tsl';

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
    const grass = mix(vec3(0.32, 0.47, 0.18), vec3(0.45, 0.56, 0.22), n).mul(mix(0.88, 1.08, n2));
    const dirt = vec3(0.47, 0.38, 0.26), rock = vec3(0.45, 0.43, 0.4);
    const slope = normalWorld.y;
    let c = mix(rock, grass, smoothstep(0.8, 0.92, slope));
    c = mix(dirt, c, smoothstep(-1.3, -0.95, wp.y));   // 河岸是泥土
    // 邊緣暗一點，讓戰場範圍清楚
    const edge = smoothstep(MAP.w / 2 - 6, MAP.w / 2 + 25, wp.x.abs()).max(smoothstep(MAP.h / 2 - 6, MAP.h / 2 + 25, wp.z.abs()));
    m.colorNode = mix(c, c.mul(0.55), edge);
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
      const crown = new THREE.ConeGeometry(1.7, 4.2, 7); crown.translate(0, 4, 0);
      const crown2 = new THREE.ConeGeometry(1.2, 3, 7); crown2.translate(0, 5.6, 0);
      const mk = (geo, color) => {
        const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardNodeMaterial({ color, roughness: 0.85 }), trees.length);
        const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
        trees.forEach((t, i) => { Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.x * 7.1); S.setScalar(t.s); M.compose(new THREE.Vector3(t.x, t.y, t.z), Q, S); im.setMatrixAt(i, M); });
        im.castShadow = true; im.receiveShadow = true; scene.add(im); return im;
      };
      mk(trunk, 0x6b4a2b); mk(crown, 0x2f6b34); mk(crown2, 0x3b7d3e);
    }
  }
}

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
void sin; void uv;
