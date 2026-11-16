// 單獨的大動物：海龜、鬼蝠魟、鯨鯊、章魚、小丑魚、發光水母、鮟鱇魚
// 全部用簡單幾何拼出來，動作用 CPU 算（數量少）或頂點 shader（翅膀拍動、尾巴擺動）
import * as THREE from 'three';
import { Fn, float, vec3, mix, smoothstep, sin, cos, abs, time, positionLocal, positionGeometry, normalLocal, mx_worley_noise_float, mx_noise_float, uniform, hash, instanceIndex } from 'three/tsl';
import { floorY, rng, VENT } from './world.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, o = {}) => new THREE.MeshStandardNodeMaterial({ color, roughness: 0.6, ...o });
const shadow = (o, on) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = on; m.receiveShadow = true; } }); return o; };

// 沿著水平的橢圓路線游，頭朝前進方向
function pathPose(obj, cx, cz, rx, rz, w, t, y, ph = 0) {
  const a = t * w + ph;
  const x = cx + Math.cos(a) * rx, z = cz + Math.sin(a) * rz;
  const dx = -Math.sin(a) * rx * w, dz = Math.cos(a) * rz * w;
  obj.position.set(x, y, z);
  obj.rotation.y = Math.atan2(dx, dz);
}

// 粗細漸變的管子（章魚的腳）：先做等粗的 TubeGeometry，再把每一圈往中心縮
function taperTube(curve, segs, r0, r1, radial = 8) {
  const g = new THREE.TubeGeometry(curve, segs, r0, radial, false);
  const p = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, r = r0 + (r1 - r0) * Math.pow(t, 0.8);
    curve.getPointAt(t, c);
    for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r / r0).add(c); p.setXYZ(k, v.x, v.y, v.z); }
  }
  g.computeVertexNormals(); return g;
}
// 把球面沿法線推一推（皺皺的皮膚）
function bumpy(geo, amp, freq, seed = 0) {
  const p = geo.attributes.position, n = geo.attributes.normal, v = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i);
    const k = Math.sin(v.x * freq + seed) * Math.sin(v.y * freq * 1.3 + 1.7) * Math.sin(v.z * freq * 0.9 + 2.3) + 0.5 * Math.sin(v.x * freq * 2.7 + v.z * freq * 2.1);
    v.addScaledVector(nn, k * amp); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals(); return geo;
}

export function buildCreatures(scene, W, { high }) {
  const list = [];
  const R = rng(4242);

  // ---------------- 綠蠵龜：盾片一塊一塊的殼、鳥嘴般的頭、長長的槳狀前鰭，皮膚有淡色鱗紋
  {
    const g = new THREE.Group();
    const shellM = new THREE.MeshStandardNodeMaterial({ roughness: 0.45 });
    shellM.colorNode = Fn(() => {
      const p = positionLocal.mul(vec3(1, 1, 0.8));
      const w = mx_worley_noise_float(p.mul(1.6));
      const seam = smoothstep(0.42, 0.62, w);                                 // 盾片之間的縫（暗）
      const streak = mx_noise_float(p.mul(vec3(9, 2, 9))).mul(0.5).add(0.5); // 每片上放射狀的紋路
      const base = mix(vec3(0.24, 0.19, 0.09), vec3(0.47, 0.37, 0.17), streak);
      return mix(base, vec3(0.1, 0.08, 0.04), seam.mul(0.8));
    })();
    const shellG = bumpy(new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), 0.025, 5);
    const shell = new THREE.Mesh(shellG, shellM); shell.scale.set(1, 0.4, 1.3);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), std(0xd8c690, { roughness: 0.7 })); belly.scale.set(0.97, 0.45, 1.27); belly.position.y = 0.17;
    const skin = new THREE.MeshStandardNodeMaterial({ roughness: 0.6 });
    skin.colorNode = Fn(() => {
      const w = mx_worley_noise_float(positionLocal.mul(9));
      return mix(vec3(0.2, 0.21, 0.14), vec3(0.45, 0.43, 0.32), smoothstep(0.45, 0.7, w));   // 深色皮膚、淡色鱗片邊
    })();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), skin); head.position.set(0, 0.04, 1.55); head.scale.set(0.95, 0.85, 1.35);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.45, 12), skin); neck.rotation.x = Math.PI / 2; neck.position.set(0, 0.02, 1.2);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 10), std(0x3a3426, { roughness: 0.4 })); beak.rotation.x = Math.PI / 2 + 0.5; beak.position.set(0, -0.06, 1.93);
    const eyes = [-1, 1].map((s2) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), std(0x0d0d0d, { roughness: 0.15 })); e.position.set(s2 * 0.2, 0.1, 1.75); return e; });
    const fl = (x, z, len, wid, front) => {
      const pivot = new THREE.Group(); pivot.position.set(x, 0.05, z);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8), skin);
      f.scale.set(len, 0.07, wid); f.position.x = Math.sign(x) * len * 0.45;
      f.rotation.y = Math.sign(x) * (front ? -0.45 : 0.5);
      pivot.add(f); g.add(pivot); return pivot;
    };
    const fins = [fl(0.8, 0.75, 1.9, 0.5, true), fl(-0.8, 0.75, 1.9, 0.5, true), fl(0.6, -0.95, 0.8, 0.38, false), fl(-0.6, -0.95, 0.8, 0.38, false)];
    const tailT = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), skin); tailT.rotation.x = -Math.PI / 2; tailT.position.set(0, 0, -1.35);
    g.add(shell, belly, neck, head, beak, ...eyes, tailT); shadow(g, high); g.scale.setScalar(1.15); scene.add(g);
    const c = W.reef;
    list.push({
      id: 'turtle', obj: g, r: 9,
      update(t) {
        pathPose(g, c.x + 6, c.z + 4, 30, 22, 0.05, t, 0, 1);
        g.position.y = Math.max(floorY(g.position.x, g.position.z) + 6, -18) + Math.sin(t * 0.4) * 1.2;
        const s = Math.sin(t * 1.6);
        fins[0].rotation.z = 0.15 + s * 0.45; fins[1].rotation.z = -0.15 - s * 0.45;
        fins[2].rotation.z = 0.1 + s * 0.15; fins[3].rotation.z = -0.1 - s * 0.15;
        g.rotation.z = Math.sin(t * 0.3) * 0.08;
      },
    });
  }

  // ---------------- 鬼蝠魟：扁平的菱形，翅膀用頂點 shader 拍動
  {
    const sh = new THREE.Shape();
    sh.moveTo(0, 1.6); sh.quadraticCurveTo(1.2, 1.0, 3.2, -0.2); sh.quadraticCurveTo(1.3, -0.6, 0.5, -1.4);
    sh.lineTo(-0.5, -1.4); sh.quadraticCurveTo(-1.3, -0.6, -3.2, -0.2); sh.quadraticCurveTo(-1.2, 1.0, 0, 1.6);
    const geo = new THREE.ShapeGeometry(sh, 16); geo.rotateX(-Math.PI / 2);   // 形狀的 +y → 世界的 −z？轉一下讓頭朝 +z
    geo.rotateY(Math.PI);
    // 身體中間加厚一點
    const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.55 });
    m.positionNode = Fn(() => {
      const p = positionLocal.toVar(), ax = abs(p.x);
      p.y.addAssign(sin(time.mul(1.4).sub(ax.mul(0.55))).mul(ax.mul(ax)).mul(0.09));
      p.y.addAssign(ax.mul(-1.3).exp().mul(0.3).mul(smoothstep(1.6, 0.2, p.z.abs())));   // 身體中間比較厚，往翅膀邊緣變薄
      return p;
    })();
    // 背上黑色、肩膀兩塊白斑（真的鬼蝠魟背上就有）
    m.colorNode = Fn(() => {
      const p = positionLocal;
      const patch = smoothstep(0.7, 0.1, vec3(p.x.abs().sub(1.05), 0, p.z.sub(0.55).mul(1.5)).length()).mul(mx_noise_float(p.mul(3)).mul(0.3).add(0.7));
      return mix(vec3(0.07, 0.08, 0.11), vec3(0.55, 0.57, 0.58), patch.mul(0.75));
    })();
    const ray = new THREE.Mesh(geo, m);
    // 肚子是白的：同一片形狀往下一點點、只畫背面
    const bm = new THREE.MeshStandardNodeMaterial({ side: THREE.BackSide, roughness: 0.6, color: 0xeef0f4 });
    bm.positionNode = m.positionNode;
    const belly = new THREE.Mesh(geo, bm); belly.position.y = -0.025;
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 8), std(0x1e2230)); back.scale.set(0.8, 0.28, 1.6); back.position.z = 0.1;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 2.6, 5), std(0x1e2230)); tail.rotation.x = Math.PI / 2; tail.position.z = -2.6;
    const horns = [-0.42, 0.42].map((x) => { const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), std(0x1e2230)); h.rotation.set(Math.PI / 2 + 0.25, 0, 0); h.scale.set(1.7, 1, 0.6); h.position.set(x, -0.02, 1.75); h.rotation.y = -x * 0.3; return h; });   // 頭鰭：往前伸、稍微往下彎的扁片
    const g = new THREE.Group(); g.add(ray, belly, tail, ...horns); void back; g.scale.setScalar(1.5); shadow(g, high); scene.add(g);
    list.push({
      id: 'manta', obj: g, r: 12,
      update(t) {
        pathPose(g, 10, -20, 45, 30, 0.035, t, 0);
        g.position.y = Math.max(floorY(g.position.x, g.position.z) + 9, -40) + Math.sin(t * 0.5) * 2;
        g.rotation.z = Math.sin(t * 0.035) * 0.25;
      },
    });
  }

  // ---------------- 鯨鯊：大大的身體、白色斑點
  {
    const g = new THREE.Group();
    const bm = new THREE.MeshStandardNodeMaterial({ roughness: 0.55 });
    bm.colorNode = Fn(() => {
      const w = mx_worley_noise_float(positionGeometry.mul(vec3(2.4, 2.4, 1.6)));
      const top = mix(vec3(0.85, 0.87, 0.9), vec3(0.16, 0.22, 0.3), smoothstep(-0.35, 0.1, positionGeometry.y));
      return mix(top, vec3(0.9, 0.92, 0.95), smoothstep(0.17, 0.08, w).mul(smoothstep(-0.1, 0.2, positionGeometry.y)));
    })();
    bm.positionNode = Fn(() => {
      const p = positionLocal.toVar();
      const back = smoothstep(0.3, -1, p.z);
      p.x.addAssign(sin(time.mul(1.3).add(p.z.mul(0.9))).mul(back).mul(0.35));
      return p;
    })();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), bm); body.scale.set(1.15, 1, 4.4);
    const tailG = new THREE.BufferGeometry();
    tailG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -3.8, 0, 2.2, -5.8, 0, 0, -4.4, 0, 0, -3.8, 0, 0, -4.4, 0, -1.4, -5.4], 3));
    tailG.computeVertexNormals();
    const fin = std(0x223040, { side: THREE.DoubleSide });
    const tail = new THREE.Mesh(tailG, fin);
    const dors = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 3), fin); dors.position.set(0, 1.25, -0.6); dors.scale.z = 0.25; dors.rotation.x = -0.3;
    const pecs = [-1, 1].map((s) => { const p = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.8, 3), fin); p.position.set(s * 1.3, -0.4, 1.0); p.rotation.set(0.5, 0, s * 1.9); p.scale.z = 0.25; return p; });
    g.add(body, tail, dors, ...pecs); g.scale.setScalar(1.6); shadow(g, high); scene.add(g);
    list.push({
      id: 'whaleshark', obj: g, r: 18,
      update(t) {
        pathPose(g, -5, -15, 50, 34, 0.028, t, 0, 2);
        g.position.y = Math.max(floorY(g.position.x, g.position.z) + 10, -30) + Math.sin(t * 0.3) * 2;
        tail.rotation.y = Math.sin(t * 1.3) * 0.3;
      },
    });
  }

  // ---------------- 章魚：皺皺的外套膜、斑駁會變色的皮膚、八隻由粗變細又捲起來的腳（底下有吸盤）
  {
    const g = new THREE.Group();
    const shift = sin(time.mul(0.35)).mul(0.5).add(0.5);   // 慢慢變色（偽裝）
    const skinCol = Fn(() => {
      const p = positionLocal;
      const mott = mx_noise_float(p.mul(3.2)).mul(0.5).add(0.5);
      const spots = smoothstep(0.18, 0.05, mx_worley_noise_float(p.mul(7)));       // 小白點（皮膚上的突起）
      const base = mix(mix(vec3(0.55, 0.16, 0.1), vec3(0.32, 0.12, 0.12), mott), mix(vec3(0.5, 0.36, 0.25), vec3(0.3, 0.24, 0.2), mott), shift);
      return mix(base, vec3(0.85, 0.7, 0.6), spots.mul(0.55));
    });
    const mm = new THREE.MeshStandardNodeMaterial({ roughness: 0.42 });
    mm.colorNode = skinCol();
    const mantle = new THREE.Mesh(bumpy(new THREE.SphereGeometry(0.62, 36, 24), 0.03, 9, 1), mm);
    mantle.scale.set(1, 1.4, 1.15); mantle.position.set(0, 1.0, -0.25); mantle.rotation.x = -0.55;
    const headB = new THREE.Mesh(bumpy(new THREE.SphereGeometry(0.42, 28, 18), 0.02, 11, 2), mm); headB.position.set(0, 0.42, 0.12);
    // 眼睛：金色、橫的瞳孔
    const eyes = [-1, 1].map((s2) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), std(0xc9a640, { roughness: 0.2 })); e.position.set(s2 * 0.33, 0.62, 0.22);
      const pu = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.03), std(0x080808)); pu.position.set(0, 0, 0.1); e.add(pu); e.lookAt(e.position.clone().multiplyScalar(3).setY(0.7));
      return e;
    });
    g.add(mantle, headB, ...eyes);
    const am = new THREE.MeshStandardNodeMaterial({ roughness: 0.45 });
    const down = smoothstep(0.1, -0.6, normalLocal.y);
    const sucker = smoothstep(0.22, 0.08, mx_worley_noise_float(positionLocal.mul(14))).mul(down);
    am.colorNode = mix(skinCol(), vec3(0.95, 0.78, 0.72), sucker.mul(0.8).add(down.mul(0.25)));
    am.positionNode = Fn(() => {
      const p = positionLocal.toVar(), d = p.xz.length();
      p.y.addAssign(sin(time.mul(1.6).add(d.mul(2.4)).add(p.x.mul(0.8))).mul(d.mul(0.08)));
      p.x.addAssign(sin(time.mul(1.1).add(d.mul(1.7)).add(p.z)).mul(d.mul(0.05)));
      return p;
    })();
    const RR = rng(77);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + 0.2, pts = [], curl = 0.6 + RR() * 0.8, len = 2.0 + RR() * 0.8;
      for (let s2 = 0; s2 <= 12; s2++) {
        const t = s2 / 12, d = 0.25 + t * len;
        const aa = a + Math.sin(t * 3 + k) * 0.25;
        // 腳沿著石頭往下垂，尖端捲起來
        const y = 0.25 - t * 0.55 + (t > 0.7 ? Math.sin((t - 0.7) / 0.3 * Math.PI) * 0.35 * curl : 0);
        const dd = t > 0.75 ? d - Math.sin((t - 0.75) / 0.25 * Math.PI) * 0.25 * curl : d;
        pts.push(V(Math.cos(aa) * dd, y, Math.sin(aa) * dd));
      }
      g.add(new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts), 40, 0.21, 0.015, 9), am));
    }
    g.position.copy(W.poi.octopusRock); shadow(g, high); scene.add(g);
    list.push({ id: 'octopus', obj: g, r: 8, update(t) { g.rotation.y = Math.sin(t * 0.2) * 0.6; mantle.scale.y = 1.4 + Math.sin(t * 1.4) * 0.05; } });
  }

  // ---------------- 小丑魚（繞著海葵）
  {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.4 });
    const z = positionGeometry.z;
    const stripe = smoothstep(0.05, 0.0, abs(z.sub(0.22))).add(smoothstep(0.05, 0.0, abs(z.add(0.05)))).add(smoothstep(0.04, 0.0, abs(z.add(0.33))));
    m.colorNode = mix(vec3(1, 0.42, 0.05), vec3(1, 1, 1), stripe.clamp(0, 1));
    const fishes = [];
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), m); f.scale.set(0.32, 0.45, 1);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 3), m); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.55; tail.scale.set(0.4, 1, 1);
      const o = new THREE.Group(); o.add(f, tail); o.scale.setScalar(0.55); g.add(o); fishes.push(o);
    }
    g.position.copy(W.anem); scene.add(g);
    list.push({
      id: 'clown', obj: g, r: 7,
      update(t) {
        fishes.forEach((o, i) => {
          const a = t * (0.6 + i * 0.12) + i * 1.6, r = 0.9 + Math.sin(t * 0.7 + i) * 0.35;
          o.position.set(Math.cos(a) * r, 1.4 + Math.sin(t * 1.1 + i) * 0.35, Math.sin(a) * r);
          o.rotation.y = -a; o.rotation.z = Math.sin(t * 8 + i) * 0.1;
        });
      },
    });
  }

  // ---------------- 發光水母（深海，一群）
  {
    const JN = 16, JC = V(26, 0, 92);
    const bellG = new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const tenG = new THREE.CylinderGeometry(0.015, 0.005, 3.2, 3, 8); tenG.translate(0, -1.6, 0);
    const jellies = [];
    for (let i = 0; i < JN; i++) {
      const hue = [0xff6ad5, 0x6ae4ff, 0xb38bff, 0x7dffb0][i % 4];
      const bm = new THREE.MeshStandardNodeMaterial({ color: hue, transparent: true, opacity: 0.55, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false });
      const pulse = sin(time.mul(1.8).add(i * 0.7)).mul(0.5).add(0.5);
      bm.emissiveNode = vec3(...new THREE.Color(hue).toArray()).mul(pulse.mul(0.9).add(0.4));
      const tm = new THREE.MeshBasicNodeMaterial({ color: hue, transparent: true, opacity: 0.45, depthWrite: false });
      tm.positionNode = Fn(() => {
        const p = positionLocal.toVar();
        p.x.addAssign(sin(time.mul(1.5).add(p.y.mul(1.6)).add(i)).mul(p.y.mul(p.y)).mul(0.04));
        return p;
      })();
      const j = new THREE.Group();
      const bell = new THREE.Mesh(bellG, bm); j.add(bell);
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const tt = new THREE.Mesh(tenG, tm); tt.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); tt.scale.y = 0.7 + R() * 0.6; j.add(tt); }
      const x = JC.x + (R() - 0.5) * 30, z = JC.z + (R() - 0.5) * 30;
      j.userData = { x, z, y0: floorY(x, z) + 6 + R() * 14, ph: R() * 6.28 };
      j.scale.setScalar(0.6 + R() * 0.7);
      scene.add(j); jellies.push(j);
    }
    const lamp = new THREE.PointLight(0xb38bff, 10, 26, 1.5); lamp.position.copy(JC).setY(floorY(JC.x, JC.z) + 14); scene.add(lamp);
    const center = V(JC.x, floorY(JC.x, JC.z) + 12, JC.z);
    list.push({
      id: 'jelly', obj: { position: center }, r: 18,
      update(t) {
        jellies.forEach((j) => {
          const u = j.userData, k = Math.sin(t * 1.8 + u.ph);
          j.position.set(u.x + Math.sin(t * 0.1 + u.ph) * 3, u.y0 + Math.sin(t * 0.25 + u.ph) * 3 + Math.max(0, k) * 0.2, u.z + Math.cos(t * 0.08 + u.ph) * 3);
          j.children[0].scale.set(1 + k * 0.12, 1 - k * 0.15, 1 + k * 0.12);
        });
      },
    });
  }

  // ---------------- 鮟鱇魚（深海海底，頭上一盞小燈）
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), std(0x2b2a33, { roughness: 0.8 })); body.scale.set(1.15, 0.95, 1.4);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0x1b1a22)); jaw.position.set(0, -0.1, 0.8); jaw.scale.set(1.2, 0.9, 0.8);
    const teethM = std(0xeeeeee, { roughness: 0.3 });
    for (let k = 0; k < 10; k++) { const a = (k / 9 - 0.5) * 2.2; const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 4), teethM); t.position.set(Math.sin(a) * 0.85, -0.05, 0.8 + Math.cos(a) * 0.55); t.rotation.x = Math.PI; g.add(t); }
    const eye = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), std(0xd8f0ff, { emissive: 0x335566 })); e.position.set(s * 0.55, 0.5, 0.95); return e; });
    const rodPts = [V(0, 0.9, 0.5), V(0, 1.7, 0.9), V(0, 1.85, 1.6), V(0, 1.55, 2.1)];
    const rod = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rodPts), 16, 0.03, 5), std(0x3a3944));
    const lureM = new THREE.MeshStandardNodeMaterial({ color: 0xfff2b0 });
    lureM.emissiveNode = vec3(1, 0.9, 0.5).mul(sin(time.mul(2.4)).mul(0.6).add(2.2));
    const lure = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), lureM); lure.position.copy(rodPts[3]);
    const light = new THREE.PointLight(0xffe6a0, 6, 9, 1.6); light.position.copy(rodPts[3]);
    g.add(body, jaw, ...eye, rod, lure, light);
    const P0 = V(-48, 0, 118); P0.y = floorY(P0.x, P0.z) + 2.2;
    g.position.copy(P0); g.scale.setScalar(1.4); shadow(g, high); scene.add(g);
    list.push({
      id: 'angler', obj: g, r: 10,
      update(t) { g.position.set(P0.x + Math.sin(t * 0.07) * 6, P0.y + Math.sin(t * 0.6) * 0.3, P0.z + Math.cos(t * 0.05) * 4); g.rotation.y = Math.sin(t * 0.07) * 1.2 + 0.4; jaw.rotation.x = Math.max(0, Math.sin(t * 0.5)) * 0.25; },
    });
  }

  void hash; void instanceIndex; void cos; void float; void VENT;
  return list;
}
