// 單獨的大動物：海龜、鬼蝠魟、鯨鯊、章魚、小丑魚、發光水母、鮟鱇魚
// 全部用簡單幾何拼出來，動作用 CPU 算（數量少）或頂點 shader（翅膀拍動、尾巴擺動）
import * as THREE from 'three';
import { Fn, float, vec3, mix, smoothstep, sin, cos, abs, time, positionLocal, positionGeometry, normalLocal, mx_worley_noise_float, mx_noise_float, uniform, hash, instanceIndex, uv, vec2, atan, normalView, positionView, select } from 'three/tsl';
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
    // 殼的盾片照真的海龜排：中間一排 5 片椎盾、兩邊各 4 片肋盾、最外圈一圈小緣盾；
    // 每片之間有淺色的縫，每片上有從中心往外放射的深淺紋路（像真的龜殼那種「玳瑁紋」）
    shellM.colorNode = Fn(() => {
      const p = positionLocal, ax = p.x.abs(), z = p.z, rr = vec2(p.x, p.z).length();
      const marg = smoothstep(0.86, 0.9, rr);
      const zi = z.add(1).mul(2.5);                                   // 椎盾：5 片
      const vert = ax.lessThan(0.27);
      const cz = select(vert, zi.floor().add(0.5).div(2.5).sub(1), z.add(0.95).mul(2.1).floor().add(0.5).div(2.1).sub(0.95));
      const cx = select(vert, float(0), p.x.sign().mul(0.55));
      const segF = select(vert, zi.fract(), z.add(0.95).mul(2.1).fract());
      const seamV = smoothstep(0.06, 0.0, segF.min(float(1).sub(segF)));
      const seamX = smoothstep(0.03, 0.0, ax.sub(0.27).abs());
      const ang = atan(p.z.sub(cz), p.x.sub(cx)), dc = vec2(p.x.sub(cx), p.z.sub(cz)).length();
      const rays = sin(ang.mul(9).add(dc.mul(14))).mul(0.5).add(0.5);
      const tort = mx_noise_float(vec3(ang.mul(1.5), dc.mul(6), cz.mul(3))).mul(0.5).add(0.5);
      const scuteCol = mix(vec3(0.16, 0.11, 0.05), vec3(0.55, 0.4, 0.17), tort.mul(0.7).add(rays.mul(0.3)));
      const margCol = mix(vec3(0.2, 0.15, 0.07), vec3(0.45, 0.33, 0.15), sin(atan(p.z, p.x).mul(28)).mul(0.5).add(0.5));
      const seam = seamV.mul(float(1).sub(marg)).max(seamX.mul(float(1).sub(marg))).max(smoothstep(0.02, 0.0, rr.sub(0.88).abs()));
      return mix(mix(scuteCol, margCol, marg), vec3(0.62, 0.55, 0.38), seam.mul(0.7));
    })();
    const shellG = bumpy(new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), 0.025, 5);
    // 殼是拱起來的（中間最高、前面稍高、往後收），中間有一條縱向的脊
    { const p = shellG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const ridge = Math.exp(-x * x * 40) * 0.08 * y; p.setY(i, y * (1 + 0.15 * z) + ridge); } shellG.computeVertexNormals(); }
    const shell = new THREE.Mesh(shellG, shellM); shell.scale.set(1, 0.62, 1.3);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), std(0xd8c690, { roughness: 0.7 })); belly.scale.set(0.97, 0.55, 1.27); belly.position.y = 0.12;
    const skin = new THREE.MeshStandardNodeMaterial({ roughness: 0.6 });
    skin.colorNode = Fn(() => {
      const w = mx_worley_noise_float(positionLocal.mul(9));
      return mix(vec3(0.2, 0.21, 0.14), vec3(0.45, 0.43, 0.32), smoothstep(0.45, 0.7, w));   // 深色皮膚、淡色鱗片邊
    })();
    const head = new THREE.Mesh(bumpy(new THREE.SphereGeometry(0.34, 22, 16), 0.012, 14, 3), skin); head.position.set(0, 0.06, 1.6); head.scale.set(0.95, 0.85, 1.3);   // 頭大一點
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.45, 12), skin); neck.rotation.x = Math.PI / 2; neck.position.set(0, 0.02, 1.2);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 10), std(0x3a3426, { roughness: 0.4 })); beak.rotation.x = Math.PI / 2 + 0.5; beak.position.set(0, -0.06, 1.93);
    const eyes = [-1, 1].map((s2) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), std(0x0d0d0d, { roughness: 0.1 })); e.position.set(s2 * 0.25, 0.14, 1.82); const lid = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), skin); lid.position.copy(e.position).add(V(0, 0.015, 0)); g.add(lid); return e; });
    const fl = (x, z, len, wid, front) => {
      const pivot = new THREE.Group(); pivot.position.set(x, 0.05, z);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8), skin);
      f.scale.set(len, 0.14, wid);   // 鰭有厚度 f.position.x = Math.sign(x) * len * 0.45;
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

  // ---------------- 鯨鯊：又寬又扁的頭、嘴巴在最前面、身體兩側有稜脊、上大下小的新月形尾鰭；
  //                  背上深灰藍色，白點加淡色直條紋排成棋盤格，肚子白色
  {
    const g = new THREE.Group();
    const prof = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28, z = -4.2 + t * 8.4;                // 尾柄 → 吻端
      const r = t < 0.6 ? 0.12 + 0.98 * Math.pow(Math.sin(t / 0.6 * Math.PI / 2), 1.3) : 1.1 * Math.pow(Math.cos((t - 0.6) / 0.4 * Math.PI / 2), 0.35);
      prof.push(new THREE.Vector2(Math.max(0.01, r), z));
    }
    const geo = new THREE.LatheGeometry(prof, 32); geo.rotateX(Math.PI / 2);
    {
      // 頭部壓扁變寬（越前面越扁），身體兩側加三條稜脊
      const p = geo.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const front = Math.min(1, Math.max(0, (v.z - 1.2) / 3));
        v.y *= 1 - 0.42 * front; v.x *= 1 + 0.28 * front;
        const ang = Math.atan2(v.y, v.x), rr = Math.hypot(v.x, v.y);
        const ridge = [0.35, 0.6, -0.15].reduce((acc, a0) => acc + Math.exp(-Math.pow((Math.abs(ang) - Math.abs(a0) - (a0 < 0 ? 0 : 0)) / 0.05, 2)), 0) * 0.04 * (v.z < 2.5 ? 1 : 0);
        const k = (rr + ridge) / Math.max(1e-4, rr); v.x *= k; v.y *= k;
        p.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
    }
    const bm = new THREE.MeshStandardNodeMaterial({ roughness: 0.6 });
    bm.colorNode = Fn(() => {
      const p = positionGeometry;
      const up = smoothstep(-0.45, 0.05, p.y.div(p.xy.length().max(0.01)));      // 背 → 肚
      const back = mix(vec3(0.85, 0.87, 0.88), vec3(0.17, 0.22, 0.28), up);
      // 棋盤格：直條紋＋條紋之間的白點
      const band = smoothstep(0.1, 0.0, sin(p.z.mul(3.4)).abs()).mul(0.7);
      const dots = smoothstep(0.2, 0.08, mx_worley_noise_float(p.mul(vec3(3.2, 3.2, 2.6))));
      const head = smoothstep(2.6, 3.6, p.z);
      const pat = band.max(dots).mul(up).mul(float(1).sub(head.mul(0.5)));
      // 嘴巴：最前面一條橫的暗線
      const mouth = smoothstep(0.06, 0.0, p.y.add(0.12).abs()).mul(smoothstep(3.6, 4.1, p.z));
      const gills = smoothstep(0.04, 0.0, sin(p.z.mul(11)).abs()).mul(smoothstep(1.6, 1.9, p.z)).mul(smoothstep(2.6, 2.3, p.z)).mul(smoothstep(0.5, 0.8, p.x.abs())).mul(0.6);
      return mix(back, vec3(0.86, 0.88, 0.9), pat).mul(float(1).sub(mouth.mul(0.85)).sub(gills));
    })();
    bm.positionNode = Fn(() => {
      const p = positionLocal.toVar();
      const back = smoothstep(1, -4, p.z);
      p.x.addAssign(sin(time.mul(1.1).add(p.z.mul(0.7))).mul(back.mul(back)).mul(0.55));
      return p;
    })();
    const body = new THREE.Mesh(geo, bm);
    const fin = std(0x1f2a36, { side: THREE.DoubleSide, roughness: 0.6 });
    // 新月形尾鰭（上半片比較大）
    const ts = new THREE.Shape();
    ts.moveTo(0, 0); ts.quadraticCurveTo(-0.6, 1.3, -1.4, 2.7); ts.quadraticCurveTo(-0.9, 1.2, -0.5, 0.2);
    ts.quadraticCurveTo(-0.8, -0.6, -1.1, -1.6); ts.quadraticCurveTo(-0.4, -0.7, 0, 0);
    const tailG = new THREE.ShapeGeometry(ts, 10); tailG.rotateY(-Math.PI / 2);
    const tail = new THREE.Mesh(tailG, fin); tail.position.set(0, 0, -4.1);
    const finShape = (h, len) => { const f = new THREE.Shape(); f.moveTo(0, 0); f.quadraticCurveTo(-0.15 * len, h * 0.7, -0.55 * len, h); f.quadraticCurveTo(-0.6 * len, h * 0.4, -len, 0); f.lineTo(0, 0); const sg = new THREE.ShapeGeometry(f, 8); sg.rotateY(-Math.PI / 2); return sg; };
    const dors = new THREE.Mesh(finShape(1.2, 1.4), fin); dors.position.set(0, 0.9, -0.2);
    const dors2 = new THREE.Mesh(finShape(0.45, 0.6), fin); dors2.position.set(0, 0.45, -2.6);
    const pecs = [-1, 1].map((sx) => { const pf = new THREE.Mesh(finShape(1.9, 1.1), fin); pf.rotation.set(0, 0, sx * 1.85); pf.position.set(sx * 0.85, -0.55, 1.4); return pf; });
    g.add(body, tail, dors, dors2, ...pecs); g.scale.setScalar(1.45); shadow(g, high); scene.add(g);
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
      p.y.addAssign(sin(time.mul(1.6).add(d.mul(2.4)).add(p.x.mul(0.8))).mul(d.mul(0.02)));   // 擺動小一點，吸盤才跟得上
      p.x.addAssign(sin(time.mul(1.1).add(d.mul(1.7)).add(p.z)).mul(d.mul(0.012)));
      return p;
    })();
    const RR = rng(77);
    const suckerPos = [];
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + 0.2, pts = [], curl = 0.7 + RR() * 0.7, len = 2.1 + RR() * 0.8;
      for (let s2 = 0; s2 <= 16; s2++) {
        const t = s2 / 16, d = 0.25 + t * len;
        const aa = a + Math.sin(t * 3 + k) * 0.22;
        // 腳沿著石頭往下垂，最後三成捲成一圈圈的螺旋（不是鉤子）
        const ct = Math.max(0, (t - 0.68) / 0.32), spin = ct * ct * Math.PI * 1.6 * curl;
        const y = 0.25 - t * 0.5 + Math.sin(spin) * 0.22 * ct;
        const dd = d - (1 - Math.cos(spin)) * 0.22 * ct;
        pts.push(V(Math.cos(aa) * dd, y, Math.sin(aa) * dd));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      g.add(new THREE.Mesh(taperTube(curve, 56, 0.2, 0.006, 10), am));
      // 吸盤：沿著腳的下面兩排，越往尖端越小
      for (let i = 2; i < 34; i++) {
        const t = i / 40, c = curve.getPointAt(t), tg = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(tg, V(0, 1, 0)).normalize();
        const r = (0.2 + (0.006 - 0.2) * Math.pow(t, 0.8));
        for (const sd of [-1, 1]) suckerPos.push({ p: c.clone().addScaledVector(side, sd * r * 0.45).add(V(0, -r * 0.85, 0)), s: r * 0.42 });
      }
    }
    // 腳和腳之間的蹼（膜）：連到腳的前三成
    const webG = new THREE.CylinderGeometry(0.28, 0.95, 0.35, 32, 1, true); webG.translate(0, 0.12, 0);
    { const p = webG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); if (y < 0.1) { const ang = Math.atan2(z, x) - 0.2, sc = 0.82 + 0.18 * Math.abs(Math.cos(ang * 4)); p.setXYZ(i, x * sc, y + (1 - sc) * 0.6, z * sc); } } webG.computeVertexNormals(); }
    const webM = am.clone(); webM.side = THREE.DoubleSide; webM.positionNode = null;
    g.add(new THREE.Mesh(webG, webM));
    const sk = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), std(0xe8c4b8, { roughness: 0.5 }), suckerPos.length);
    { const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI); suckerPos.forEach((o, i) => { M4.compose(o.p, Q, V(o.s, o.s * 0.5, o.s)); sk.setMatrixAt(i, M4); }); }
    g.add(sk);
    g.position.copy(W.poi.octopusRock); shadow(g, high); scene.add(g);
    list.push({ id: 'octopus', obj: g, r: 8, update(t) { g.rotation.y = Math.sin(t * 0.2) * 0.6; mantle.scale.y = 1.4 + Math.sin(t * 1.4) * 0.05; } });
  }

  // ---------------- 小丑魚（公子小丑）：圓胖的橘色身體、三條白色寬帶（邊上有細黑線）、
  //                  圓圓的鰭（鰭的邊是黑的）、黑眼睛；繞著海葵游
  {
    const g = new THREE.Group();
    const prof = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18, y = -0.5 + t;
      // 尾柄細 → 身體最高在中間偏前 → 頭是圓鈍的（不是尖的）
      const r = t < 0.15 ? 0.1 + t * 1.3 : t < 0.6 ? 0.29 + 0.21 * Math.sin((t - 0.15) / 0.45 * Math.PI / 2) : 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.6) / 0.4, 2.2)));
      prof.push(new THREE.Vector2(Math.max(0.01, r), y));
    }
    prof[prof.length - 1].x = 0.001;
    const bodyG = new THREE.LatheGeometry(prof, 16); bodyG.rotateX(Math.PI / 2);
    const bm = new THREE.MeshStandardNodeMaterial({ roughness: 0.32 });
    const pz = positionGeometry.z, py = positionGeometry.y;
    const band = (c, w) => smoothstep(w, w - 0.03, pz.sub(c).abs());
    const edge = (c, w) => smoothstep(w + 0.03, w + 0.012, pz.sub(c).abs()).mul(smoothstep(w - 0.005, w + 0.01, pz.sub(c).abs()));
    // 頭帶往前彎（沿著鰓蓋）
    const c1 = py.mul(py).mul(-0.5).add(0.2), c2 = py.mul(py).mul(-0.4).add(-0.04), c3 = float(-0.37);   // 頭帶、中間帶往前彎成弧形
    const white = band(c1, 0.055).max(band(c2, 0.05)).max(band(c3, 0.03));
    const black = edge(c1, 0.055).max(edge(c2, 0.05)).max(edge(c3, 0.03));
    const eyeD = vec2(py.sub(0.07), pz.sub(0.375)).length();
    const eye = smoothstep(0.072, 0.06, eyeD).mul(smoothstep(0.1, 0.18, positionGeometry.x.abs()));
    bm.colorNode = mix(mix(mix(vec3(1, 0.34, 0.0), vec3(1, 0.98, 0.95), white), vec3(0.03), black.mul(0.9)), vec3(0.02), eye);
    const finM = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.4 });
    const fu = uv();
    finM.colorNode = mix(vec3(1, 0.42, 0.06), vec3(0.04), smoothstep(0.82, 0.95, fu.y));   // 鰭的外緣黑色
    const fin = (pts) => { const sh = new THREE.Shape(); pts.forEach(([a, b], i) => (i ? sh.lineTo(a, b) : sh.moveTo(a, b))); const sg = new THREE.ShapeGeometry(sh, 6);
      const p = sg.attributes.position, u2 = sg.attributes.uv; let mx = 0; for (let i = 0; i < p.count; i++) mx = Math.max(mx, Math.hypot(p.getX(i), p.getY(i)));
      for (let i = 0; i < p.count; i++) u2.setXY(i, 0, Math.hypot(p.getX(i), p.getY(i)) / mx); return sg; };
    // 尾鰭（圓扇形）、背鰭、臀鰭；形狀在 (z, y) 平面
    const arc = (cx, cy, r, a0, a1, n = 10) => { const out = [[cx, cy]]; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out; };
    const tailG = fin(arc(0, 0, 0.32, Math.PI * 0.62, Math.PI * 1.38)); tailG.rotateY(-Math.PI / 2); tailG.translate(0, 0, -0.42);
    const dorsG = fin([[0, 0], [0.2, 0.18], [0.05, 0.14], [-0.1, 0.22], [-0.3, 0.16], [-0.38, 0]]); dorsG.rotateY(-Math.PI / 2); dorsG.translate(0, 0.38, 0.05);
    const analG = fin([[0, 0], [-0.08, -0.18], [-0.25, -0.15], [-0.3, 0]]); analG.rotateY(-Math.PI / 2); analG.translate(0, -0.36, -0.05);
    const pecG = fin(arc(0, 0, 0.2, -0.6, 0.6, 6));
    const fishes = [];
    for (let i = 0; i < 4; i++) {
      const o = new THREE.Group();
      const tail = new THREE.Mesh(tailG, finM);
      const pecs = [-1, 1].map((sx) => { const m = new THREE.Mesh(pecG, finM); m.position.set(sx * 0.27, -0.06, 0.12); m.rotation.set(0, sx * -2.2, 0.3 * sx); return m; });
      o.add(new THREE.Mesh(bodyG, bm), tail, new THREE.Mesh(dorsG, finM), new THREE.Mesh(analG, finM), ...pecs);
      o.scale.set(0.42, 0.5, 0.78).multiplyScalar(0.62); g.add(o); fishes.push({ o, tail, pecs });   // 比較長、側扁
    }
    g.position.copy(W.anem); scene.add(g);
    list.push({
      id: 'clown', obj: g, r: 7,
      update(t) {
        fishes.forEach(({ o, tail, pecs }, i) => {
          const a = t * (0.6 + i * 0.12) + i * 1.6, r = 0.9 + Math.sin(t * 0.7 + i) * 0.35;
          o.position.set(Math.cos(a) * r, 1.4 + Math.sin(t * 1.1 + i) * 0.35, Math.sin(a) * r);
          o.rotation.y = -a; o.rotation.z = Math.sin(t * 8 + i) * 0.06;
          tail.rotation.y = Math.sin(t * 9 + i) * 0.35;                               // 尾巴擺
          pecs.forEach((pf, k) => { pf.rotation.x = Math.sin(t * 12 + i + k * 3) * 0.5; });   // 胸鰭一直搧（小丑魚游泳就是這樣）
        });
      },
    });
  }

  // ---------------- 發光水母（深海，一群）
  {
    const JN = 16, JC = V(26, 0, 92);
    // 真實的水母：透明的傘（邊緣有一瓣一瓣的缺刻），從側面看邊緣最亮（菲涅耳）；傘裡看得到放射狀的水管和四個馬蹄形的生殖腺；
    // 傘緣一圈會一閃一閃的生物光；中間垂下四條皺皺的口腕；傘緣垂下很多細長的觸手。傘一縮一放地游（頂點 shader）
    const prof = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(Math.sin(t * Math.PI / 2) * 1.0, Math.cos(t * Math.PI / 2) * 0.75 * (1 - 0.15 * t))); }
    prof.push(new THREE.Vector2(0.92, -0.06));
    const bellG = new THREE.LatheGeometry(prof.reverse(), 40);
    const fres = float(1).sub(normalView.dot(positionView.normalize().negate()).abs()).pow(1.6);
    const armPts = (k) => { const pts = []; const a0 = k / 4 * Math.PI * 2 + 0.4; for (let s2 = 0; s2 <= 10; s2++) { const t = s2 / 10; pts.push(V(Math.cos(a0) * (0.12 + t * 0.18), -0.05 - t * 1.6, Math.sin(a0) * (0.12 + t * 0.18))); } return pts; };
    const armG = Array.from({ length: 4 }, (_, k) => { const g2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(armPts(k)), 30, 0.09, 6, false); const p = g2.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); const w = 1 + 0.6 * Math.sin(y * 18 + i * 0.7); p.setX(i, p.getX(i) * (1 + 0.15 * w)); p.setZ(i, p.getZ(i) * (1 + 0.15 * w)); } g2.computeVertexNormals(); return g2; });
    const tenG = new THREE.CylinderGeometry(0.008, 0.003, 4.5, 3, 16); tenG.translate(0, -2.25, 0);
    const jellies = [];
    for (let i = 0; i < JN; i++) {
      const hue = new THREE.Color([0xff8ad8, 0x8ae8ff, 0xc5a6ff, 0x9dffc8][i % 4]);
      const hv = vec3(hue.r, hue.g, hue.b), ph = i * 0.7;
      const pulse = sin(time.mul(1.8).add(ph));                                   // 收縮節奏
      const bm = new THREE.MeshStandardNodeMaterial({ transparent: true, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false });
      bm.positionNode = Fn(() => {
        const p = positionLocal.toVar(), rim = smoothstep(0.2, 0.75, p.y.negate().add(0.75));   // 越靠傘緣收縮越大
        const sq = pulse.max(0).mul(0.16).mul(rim);
        p.x.mulAssign(float(1).sub(sq)); p.z.mulAssign(float(1).sub(sq)); p.y.addAssign(pulse.max(0).mul(0.06).mul(rim));
        return p;
      })();
      const lp = positionLocal;
      const theta = atan(lp.z, lp.x);
      const canals = smoothstep(0.06, 0.0, sin(theta.mul(8)).abs()).mul(0.35);                              // 8 條放射水管
      const gon = smoothstep(0.08, 0.0, vec2(lp.xz.length().sub(0.42), sin(theta.mul(2)).mul(0.2)).length()).mul(0.6);   // 四個馬蹄形生殖腺
      const margin = smoothstep(0.12, 0.0, lp.y.add(0.02).abs());                                            // 傘緣
      bm.colorNode = hv.mul(0.35).add(hv.mul(canals.add(gon)));
      bm.opacityNode = float(0.12).add(fres.mul(0.55)).add(gon.mul(0.4)).add(canals.mul(0.3)).clamp(0, 0.9);
      bm.emissiveNode = hv.mul(fres.mul(0.5).add(gon.mul(0.8))).add(hv.mul(margin.mul(sin(time.mul(3).add(theta.mul(4)).add(ph)).mul(0.5).add(0.5)).mul(2.2)));
      const om = new THREE.MeshStandardNodeMaterial({ transparent: true, roughness: 0.3, depthWrite: false, side: THREE.DoubleSide });
      om.colorNode = hv.mul(0.6); om.opacityNode = float(0.35).add(fres.mul(0.4)); om.emissiveNode = hv.mul(0.35);
      om.positionNode = Fn(() => { const p = positionLocal.toVar(); p.x.addAssign(sin(time.mul(1.2).add(p.y.mul(2.5)).add(ph)).mul(p.y.mul(p.y)).mul(0.05)); return p; })();
      const tm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
      tm.colorNode = hv; tm.opacityNode = float(0.35);
      tm.positionNode = Fn(() => {
        const p = positionLocal.toVar();
        p.x.addAssign(sin(time.mul(1.5).add(p.y.mul(1.6)).add(ph)).mul(p.y.mul(p.y)).mul(0.03));
        p.z.addAssign(cos(time.mul(1.1).add(p.y.mul(1.3)).add(ph)).mul(p.y.mul(p.y)).mul(0.02));
        return p;
      })();
      const j = new THREE.Group();
      const bell = new THREE.Mesh(bellG, bm); j.add(bell);
      for (const ag of armG) j.add(new THREE.Mesh(ag, om));
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; const tt = new THREE.Mesh(tenG, tm); tt.position.set(Math.cos(a) * 0.9, -0.05, Math.sin(a) * 0.9); tt.scale.y = 0.6 + R() * 0.7; j.add(tt); }
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
        });
      },
    });
  }

  // ---------------- 鮟鱇魚（黑角鮟鱇）：圓滾滾的深褐色身體、往上斜的大嘴（下巴突出）、上下顎一排排細長半透明往內彎的尖牙、
  //                  很小的眼睛、頭上一根釣竿、尖端的誘餌發藍綠色的光；尾巴是扇形，鰭上有一條條鰭條
  {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardNodeMaterial({ roughness: 0.85 });
    skin.colorNode = Fn(() => {
      const p = positionLocal;
      const mott = mx_noise_float(p.mul(3)).mul(0.5).add(0.5);
      const pores = smoothstep(0.12, 0.05, mx_worley_noise_float(p.mul(11))).mul(0.25);
      return mix(vec3(0.07, 0.05, 0.05), vec3(0.17, 0.12, 0.1), mott).add(vec3(0.2, 0.18, 0.15).mul(pores));
    })();
    const bodyG = bumpy(new THREE.SphereGeometry(1, 40, 28), 0.025, 6, 4);
    const body = new THREE.Mesh(bodyG, skin); body.scale.set(0.95, 1, 1.0); body.position.z = -0.32;   // 身體往後一點，嘴巴才會突出來
    // 嘴：前面一大片暗紅色的口腔，上下兩片嘴唇（下巴比較大、往前突）
    const mouthIn = new THREE.Mesh(new THREE.SphereGeometry(0.72, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), std(0x2a0608, { roughness: 0.6, side: THREE.DoubleSide }));
    mouthIn.rotation.x = Math.PI / 2; mouthIn.position.set(0, -0.05, 0.55); mouthIn.scale.set(0.9, 0.62, 0.55);
    const lipU = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.07, 8, 28, Math.PI), skin); lipU.position.set(0, 0.22, 0.45); lipU.rotation.x = Math.PI / 2 - 0.45;   // 上唇：水平的弧，往前
    const jaw = new THREE.Group(); jaw.position.set(0, -0.3, 0.55);
    const lipL = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.09, 8, 28, Math.PI), skin); lipL.rotation.x = Math.PI / 2 + 0.3; lipL.position.set(0, 0.0, -0.05);   // 下唇：比較大、往前突
    jaw.add(lipL);
    // 牙齒：細長、半透明、往嘴裡彎
    const toothM = new THREE.MeshStandardNodeMaterial({ color: 0xf2efe6, roughness: 0.25, transparent: true, opacity: 0.85 });
    const toothG = new THREE.ConeGeometry(0.025, 0.36, 5); toothG.translate(0, -0.18, 0);
    const addTeeth = (parent, R0, y, z, n, up, tilt) => {
      for (let k = 0; k < n; k++) {
        const a = (k + 0.5) / n * Math.PI, len = 0.6 + 0.6 * Math.sin(a) * (0.6 + 0.4 * ((k * 7) % 3) / 2);
        const t = new THREE.Mesh(toothG, toothM);
        t.position.set(Math.cos(a) * R0, y, z + Math.sin(a) * R0);
        t.scale.set(1, len, 1); t.rotation.set(up ? Math.PI + tilt : tilt, 0, 0); t.rotateZ((Math.cos(a)) * 0.25);
        parent.add(t);
      }
    };
    addTeeth(g, 0.62, 0.2, 0.42, 13, false, 0.35);       // 上顎：往下
    addTeeth(jaw, 0.72, 0.06, -0.08, 15, true, -0.35);   // 下顎：往上
    // 小眼睛
    const eyes = [-1, 1].map((s2) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), std(0x0a0c10, { roughness: 0.1 })); e.position.set(s2 * 0.42, 0.62, 0.72); return e; });
    // 釣竿與誘餌
    const rodPts = [V(0, 0.95, 0.45), V(0, 1.55, 0.6), V(0, 1.85, 1.15), V(0, 1.65, 1.75)];
    const rod = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(rodPts), 24, 0.045, 0.018, 6), skin);
    const lureM = new THREE.MeshStandardNodeMaterial({ color: 0xbfe8e0, roughness: 0.2 });
    lureM.emissiveNode = vec3(0.45, 1, 0.85).mul(sin(time.mul(2.4)).mul(0.8).add(2.4));
    const lure = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), lureM); lure.position.copy(rodPts[3]); lure.scale.set(1, 1.3, 1);
    const fil = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.25, 5), lureM); fil.position.copy(rodPts[3]).add(V(0, -0.22, 0)); fil.rotation.x = Math.PI;
    const light = new THREE.PointLight(0x8fffe0, 6, 9, 1.6); light.position.copy(rodPts[3]);
    // 鰭：扇形尾鰭、胸鰭、背鰭（半透明、有鰭條）
    const finM = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, transparent: true, roughness: 0.6, depthWrite: false });
    const fv = uv();
    finM.colorNode = vec3(0.12, 0.09, 0.08); finM.opacityNode = float(0.55).add(smoothstep(0.88, 1, sin(atan(fv.y.sub(0.5), fv.x).mul(14)).abs()).mul(0.4));
    const fan = (r, a0, a1) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); for (let i = 0; i <= 12; i++) { const a = a0 + (a1 - a0) * i / 12; sh.lineTo(Math.cos(a) * r * (1 + 0.08 * Math.sin(i * 2.7)), Math.sin(a) * r); } sh.lineTo(0, 0); return new THREE.ShapeGeometry(sh, 4); };
    const tailG = fan(0.7, Math.PI * 0.72, Math.PI * 1.28); tailG.rotateY(-Math.PI / 2);
    const tail = new THREE.Mesh(tailG, finM); tail.position.set(0, 0.05, -1.05);
    const pecs = [-1, 1].map((s2) => { const pg = fan(0.35, -0.7, 0.7); const m = new THREE.Mesh(pg, finM); m.position.set(s2 * 0.88, -0.15, -0.15); m.rotation.set(0, s2 > 0 ? -2.4 : -0.7, 0); return m; });
    const dorsG = fan(0.38, Math.PI * 0.55, Math.PI * 0.95); dorsG.rotateY(-Math.PI / 2);
    const dors = new THREE.Mesh(dorsG, finM); dors.position.set(0, 0.75, -0.65);
    g.add(body, mouthIn, lipU, jaw, ...eyes, rod, lure, fil, light, tail, ...pecs, dors);
    const P0 = V(-48, 0, 118); P0.y = floorY(P0.x, P0.z) + 2.2;
    g.position.copy(P0); g.scale.setScalar(1.4); shadow(g, high); scene.add(g);
    list.push({
      id: 'angler', obj: g, r: 10,
      update(t) { g.position.set(P0.x + Math.sin(t * 0.07) * 6, P0.y + Math.sin(t * 0.6) * 0.3, P0.z + Math.cos(t * 0.05) * 4); g.rotation.y = Math.sin(t * 0.07) * 1.2 + 0.4; jaw.rotation.x = Math.max(0, Math.sin(t * 0.5)) * 0.3; tail.rotation.y = Math.sin(t * 2) * 0.25; },
    });
  }

  void hash; void instanceIndex; void cos; void float; void VENT;
  return list;
}
