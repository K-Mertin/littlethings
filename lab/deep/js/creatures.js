// 單獨的大動物：海龜、鬼蝠魟、鯨鯊、章魚、小丑魚、發光水母、鮟鱇魚
// 全部用簡單幾何拼出來，動作用 CPU 算（數量少）或頂點 shader（翅膀拍動、尾巴擺動）
import * as THREE from 'three';
import { Fn, float, vec3, mix, smoothstep, sin, cos, abs, time, positionLocal, positionGeometry, mx_worley_noise_float, uniform, hash, instanceIndex } from 'three/tsl';
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

export function buildCreatures(scene, W, { high }) {
  const list = [];
  const R = rng(4242);

  // ---------------- 綠蠵龜
  {
    const g = new THREE.Group();
    const shellM = std(0x6b6a35, { roughness: 0.5 });
    shellM.colorNode = Fn(() => {
      const w = mx_worley_noise_float(positionLocal.mul(2.2));
      return mix(vec3(0.28, 0.24, 0.1), vec3(0.5, 0.45, 0.2), smoothstep(0.15, 0.55, w));
    })();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), shellM);
    shell.scale.set(1, 0.42, 1.3);
    const belly = new THREE.Mesh(new THREE.CircleGeometry(1, 22), std(0xd8c690)); belly.rotation.x = Math.PI / 2; belly.scale.set(0.98, 1.28, 1);
    const skin = std(0x7d8a5a);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), skin); head.position.set(0, 0.05, 1.5); head.scale.set(1, 0.85, 1.25);
    const fl = (x, z, len, front) => {
      const pivot = new THREE.Group(); pivot.position.set(x, 0, z);
      const f = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, front ? 0.5 : 0.35), skin);
      f.position.x = Math.sign(x) * len / 2; f.rotation.y = Math.sign(x) * (front ? -0.35 : 0.4);
      pivot.add(f); g.add(pivot); return pivot;
    };
    const fins = [fl(0.85, 0.7, 1.4, true), fl(-0.85, 0.7, 1.4, true), fl(0.65, -0.95, 0.6, false), fl(-0.65, -0.95, 0.6, false)];
    g.add(shell, belly, head); shadow(g, high); g.scale.setScalar(1.15); scene.add(g);
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
      return p;
    })();
    m.color.set(0x1e2533);
    const ray = new THREE.Mesh(geo, m);
    // 肚子是白的：同一片形狀往下一點點、只畫背面
    const bm = new THREE.MeshStandardNodeMaterial({ side: THREE.BackSide, roughness: 0.6, color: 0xeef0f4 });
    bm.positionNode = m.positionNode;
    const belly = new THREE.Mesh(geo, bm); belly.position.y = -0.025;
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 8), std(0x1e2230)); back.scale.set(0.8, 0.28, 1.6); back.position.z = 0.1;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 2.6, 5), std(0x1e2230)); tail.rotation.x = Math.PI / 2; tail.position.z = -2.6;
    const horns = [-0.45, 0.45].map((x) => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.6), std(0x1e2230)); h.position.set(x, 0, 1.75); return h; });
    const g = new THREE.Group(); g.add(ray, belly, back, tail, ...horns); g.scale.setScalar(1.5); shadow(g, high); scene.add(g);
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

  // ---------------- 章魚（在大石頭上，顏色會變）
  {
    const g = new THREE.Group();
    const col = uniform(new THREE.Color(0xd2553b));
    const mm = new THREE.MeshStandardNodeMaterial({ roughness: 0.5 });
    mm.colorNode = mix(vec3(0.85, 0.3, 0.2), vec3(0.55, 0.35, 0.6), sin(time.mul(0.5)).mul(0.5).add(0.5)).mul(0.85);
    const tm = new THREE.MeshStandardNodeMaterial({ roughness: 0.5 });
    tm.colorNode = mm.colorNode;
    tm.positionNode = Fn(() => {
      const p = positionLocal.toVar(), d = p.xz.length();
      p.y.addAssign(sin(time.mul(2).add(d.mul(2.2)).add(p.x.mul(0.7))).mul(d).mul(0.12));
      return p;
    })();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 12), mm); head.scale.set(1, 1.25, 1.05); head.position.y = 0.85; head.rotation.x = -0.35;
    const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), std(0xf5f0d0)); e.position.set(s * 0.38, 0.65, 0.5); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std(0x111111)); pu.position.set(0, 0, 0.09); e.add(pu); return e; });
    g.add(head, ...eyes);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, pts = [];
      for (let s = 0; s <= 8; s++) { const d = 0.3 + s * 0.28; pts.push(V(Math.cos(a) * d, 0.35 - Math.sin(s * 0.45) * 0.3 + (s > 5 ? (s - 5) * 0.1 : 0), Math.sin(a) * d)); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.11, 6), tm);
      g.add(tube);
    }
    void col;
    g.position.copy(W.poi.octopusRock); shadow(g, high); scene.add(g);
    list.push({ id: 'octopus', obj: g, r: 8, update(t) { g.rotation.y = Math.sin(t * 0.2) * 0.6; head.scale.y = 1.25 + Math.sin(t * 1.4) * 0.05; } });
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
