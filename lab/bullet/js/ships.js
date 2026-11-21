// 飛船外形：玩家的戰機、各種敵人、三隻魔王。全部用簡單幾何拼，金屬機身＋發光的引擎和眼睛
import * as THREE from 'three';

const M = (color, o = {}) => new THREE.MeshStandardNodeMaterial({ color, roughness: 0.35, metalness: 0.7, ...o });
const glow = (color, k = 4) => { const m = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(color).multiplyScalar(k) }); return m; };
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
// 三角形的翅膀（平面形狀擠出薄薄一片）
function wing(pts, thick = 0.08) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], p[1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  g.rotateX(Math.PI / 2); g.translate(0, thick / 2, 0); return g;
}

// 玩家：銀白機身、藍色玻璃座艙、兩片後掠翼、兩個藍色引擎噴口（頭朝 −z）
export function playerShip() {
  const g = new THREE.Group();
  const hull = M(0xdfe6ee, { roughness: 0.25, metalness: 0.8 }), dark = M(0x2a3140), blue = glow(0x3fb4ff, 5);
  const body = mesh(new THREE.ConeGeometry(0.32, 2.2, 10), hull); body.rotation.x = -Math.PI / 2; body.scale.set(1, 1, 0.55); g.add(body);
  const cock = mesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshPhysicalNodeMaterial({ color: 0x1a5fa8, roughness: 0.05, metalness: 0.2, clearcoat: 1 }), 0, 0.12, -0.2); cock.scale.set(0.8, 0.6, 1.6); g.add(cock);
  for (const s of [-1, 1]) {
    const w = mesh(wing([[0, 0.3], [s * 1.25, 0.85], [s * 1.2, 1.05], [0, 0.95]]), hull); g.add(w);
    const tip = mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), M(0xff5a3c)); tip.position.set(s * 1.22, 0, 0.9); g.add(tip);
    const eng = mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.6, 10), dark, s * 0.32, 0, 0.85); eng.rotation.x = Math.PI / 2; g.add(eng);
    const fl = mesh(new THREE.ConeGeometry(0.12, 0.7, 10), blue, s * 0.32, 0, 1.45); fl.rotation.x = Math.PI / 2; g.add(fl); g.userData['flame' + s] = fl;
  }
  const fin = mesh(wing([[0, 0], [0.5, 0.7], [0, 0.75]], 0.05), hull); fin.rotation.z = Math.PI / 2; fin.position.set(0, 0.05, 0.3); g.add(fin);
  // 判定點：中間一顆白點（玩家看得到自己真正會被打到的地方）
  const core = mesh(new THREE.SphereGeometry(0.12, 12, 8), glow(0xffffff, 3), 0, 0.35, 0); g.add(core); g.userData.core = core;
  g.userData.anim = (t) => { for (const s of [-1, 1]) g.userData['flame' + s].scale.y = 0.8 + Math.sin(t * 40 + s) * 0.2; };
  return g;
}

// 敵人：頭朝 +z（往下飛、往玩家那邊）
export function enemyShip(type) {
  const g = new THREE.Group();
  const red = M(0x8a1f2b), steel = M(0x5b6170), gold = M(0xc9a040, { metalness: 0.9 });
  if (type === 'drone') {   // 小飛碟：扁圓、一圈發光、紅眼
    const disc = mesh(new THREE.SphereGeometry(0.6, 16, 8), steel); disc.scale.set(1, 0.32, 1); g.add(disc);
    const ring = mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 24), glow(0xff3b5c, 3)); ring.rotation.x = Math.PI / 2; g.add(ring);
    g.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(0xff2a2a, 5), 0, 0.12, 0.3));
    g.userData.anim = (t) => { g.rotation.y = t * 2; };
  } else if (type === 'fighter') {   // 紅色戰鬥機
    const b = mesh(new THREE.ConeGeometry(0.35, 1.8, 8), red); b.rotation.x = Math.PI / 2; b.scale.set(1, 1, 0.5); g.add(b);
    for (const s of [-1, 1]) g.add(mesh(wing([[0, -0.6], [s * 1.0, -0.9], [s * 0.9, -0.6], [0, 0.2]]), steel));
    g.add(mesh(new THREE.SphereGeometry(0.15, 10, 8), glow(0xffaa33, 4), 0, 0.1, 0.4));
    for (const s of [-1, 1]) { const f = mesh(new THREE.ConeGeometry(0.1, 0.5, 8), glow(0xff6a2a, 4), s * 0.2, 0, -1.0); f.rotation.x = -Math.PI / 2; g.add(f); }
  } else if (type === 'turret') {   // 六角形砲台：六根砲管會慢慢轉
    const hex = mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.5, 6), steel); g.add(hex);
    g.add(mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.35, 12), red, 0, 0.35, 0));
    g.add(mesh(new THREE.SphereGeometry(0.28, 14, 10), glow(0xff3a6a, 4), 0, 0.55, 0));
    const guns = new THREE.Group(); g.add(guns);
    for (let k = 0; k < 6; k++) { const c = mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), gold); c.rotation.z = Math.PI / 2; const a = k / 6 * Math.PI * 2; c.position.set(Math.cos(a) * 1.15, 0.1, Math.sin(a) * 1.15); c.rotation.y = -a; guns.add(c); }
    g.userData.anim = (t) => { guns.rotation.y = t * 0.8; };
  } else if (type === 'carrier') {   // 大型母艦：長長的船身、兩側引擎艙、一排發光的窗
    const hull = mesh(new THREE.BoxGeometry(2.2, 0.6, 3.6), steel); g.add(hull);
    const nose = mesh(new THREE.ConeGeometry(1.1, 1.4, 4), steel, 0, 0, 2.5); nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.scale.set(1, 1, 0.4); g.add(nose);
    for (const s of [-1, 1]) {
      const pod = mesh(new THREE.CylinderGeometry(0.45, 0.5, 2.6, 10), red, s * 1.55, 0, -0.2); pod.rotation.x = Math.PI / 2; g.add(pod);
      const fl = mesh(new THREE.ConeGeometry(0.4, 1.0, 10), glow(0xff7a2a, 4), s * 1.55, 0, -2.0); fl.rotation.x = -Math.PI / 2; g.add(fl);
    }
    for (let k = 0; k < 6; k++) g.add(mesh(new THREE.BoxGeometry(0.16, 0.05, 0.25), glow(0xffd36a, 3), (k % 2 ? 0.5 : -0.5), 0.32, -1.2 + Math.floor(k / 2) * 0.9));
    g.add(mesh(new THREE.SphereGeometry(0.35, 12, 8), glow(0xff2a5a, 5), 0, 0.4, 1.4));
  } else if (type === 'rock') {   // 小行星：凹凸不平的石頭，會自己轉
    const geo = new THREE.IcosahedronGeometry(1, 2); const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(0.8 + 0.35 * Math.abs(Math.sin(v.x * 3.1 + v.y * 2.3) * Math.cos(v.z * 2.7))); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    g.add(mesh(geo, new THREE.MeshStandardNodeMaterial({ color: 0x7c8a9e, roughness: 0.9, flatShading: true })));
    const ax = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
    g.userData.anim = (t) => { g.children[0].setRotationFromAxisAngle(ax, t * 0.9); };
  }
  return g;
}

// 魔王：大、好幾個部位；userData.parts 給 main 知道砲口在哪裡
export function bossShip(kind) {
  const g = new THREE.Group();
  const steel = M(0x4a4f5c), red = M(0x8a1f2b), violet = M(0x4b2a7a);
  if (kind === 'crab') {   // 第一關：鋼鐵螃蟹，兩隻大鉗子會開合
    const shell = mesh(new THREE.SphereGeometry(2.2, 24, 14), red); shell.scale.set(1.3, 0.45, 1); g.add(shell);
    g.add(mesh(new THREE.SphereGeometry(0.5, 14, 10), glow(0xff2a2a, 5), 0, 0.6, 1.3));
    const claws = [-1, 1].map((s) => {
      const arm = new THREE.Group(); arm.position.set(s * 2.6, 0, 1.2);
      const up = mesh(new THREE.ConeGeometry(0.45, 2.0, 8), steel, 0, 0, 1.0); up.rotation.x = Math.PI / 2; up.rotation.z = s * 0.3; arm.add(up);
      const lo = mesh(new THREE.ConeGeometry(0.35, 1.6, 8), steel, s * -0.4, 0, 0.9); lo.rotation.x = Math.PI / 2; lo.rotation.z = -s * 0.3; arm.add(lo);
      g.add(arm); return { arm, up, lo, s };
    });
    for (let k = 0; k < 6; k++) { const s = k < 3 ? -1 : 1, leg = mesh(new THREE.CylinderGeometry(0.1, 0.06, 1.8, 6), steel, s * (2.2 + (k % 3) * 0.2), -0.2, -0.8 + (k % 3) * 0.7); leg.rotation.z = s * 1.2; g.add(leg); }
    g.userData.anim = (t) => { for (const c of claws) { const o = (Math.sin(t * 3) * 0.5 + 0.5) * 0.4; c.up.rotation.y = c.s * o; c.lo.rotation.y = -c.s * o; } };
    g.userData.guns = [[0, 1.6], [-2.6, 3.0], [2.6, 3.0]];
  } else if (kind === 'hydra') {   // 第二關：三頭冰龍艦，三個頭會左右擺
    const body = mesh(new THREE.CylinderGeometry(1.6, 2.4, 1.0, 8), M(0x2c5a7a)); g.add(body);
    g.add(mesh(new THREE.OctahedronGeometry(1.0), glow(0x6fe0ff, 3), 0, 0.6, 0));
    const heads = [-1, 0, 1].map((s) => {
      const neck = new THREE.Group(); neck.position.set(s * 1.6, 0, 1.2);
      const n = mesh(new THREE.CylinderGeometry(0.3, 0.45, 2.2, 8), M(0x3c7a9a), 0, 0, 1.0); n.rotation.x = Math.PI / 2; neck.add(n);
      const h = mesh(new THREE.ConeGeometry(0.55, 1.2, 6), M(0xbfe8ff, { metalness: 0.3, roughness: 0.2 }), 0, 0, 2.5); h.rotation.x = Math.PI / 2; neck.add(h);
      neck.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), glow(0x8ff6ff, 5), 0, 0.3, 2.3));
      g.add(neck); return { neck, s };
    });
    g.userData.anim = (t) => { for (const h of heads) h.neck.rotation.y = Math.sin(t * 1.3 + h.s * 1.7) * 0.35 + h.s * 0.25; };
    g.userData.guns = [[-1.6, 3.6], [0, 3.8], [1.6, 3.6]];
  } else {   // 第三關：日蝕——黑色的核心外面兩圈反著轉的環，環上有砲口
    g.add(mesh(new THREE.SphereGeometry(1.6, 24, 16), new THREE.MeshStandardNodeMaterial({ color: 0x080810, roughness: 0.15, metalness: 0.9 })));
    const halo = mesh(new THREE.TorusGeometry(1.75, 0.08, 8, 48), glow(0xc56bff, 6)); halo.rotation.x = Math.PI / 2; g.add(halo);
    const r1 = new THREE.Group(), r2 = new THREE.Group(); g.add(r1, r2);
    r1.add(mesh(new THREE.TorusGeometry(3.0, 0.22, 8, 48), violet)); r1.rotation.x = Math.PI / 2;
    r2.add(mesh(new THREE.TorusGeometry(3.9, 0.14, 8, 56), steel)); r2.rotation.x = Math.PI / 2;
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; r1.add(mesh(new THREE.SphereGeometry(0.28, 10, 8), glow(0xff5ad8, 4), Math.cos(a) * 3, Math.sin(a) * 3, 0)); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; r2.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), red, Math.cos(a) * 3.9, Math.sin(a) * 3.9, 0)); }
    g.userData.anim = (t) => { r1.rotation.z = t * 0.6; r2.rotation.z = -t * 0.35; halo.scale.setScalar(1 + Math.sin(t * 4) * 0.04); };
    g.userData.guns = [[0, 0]];
    void red;
  }
  return g;
}
