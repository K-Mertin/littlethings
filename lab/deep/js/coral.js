// 珊瑚：照真的珊瑚做形狀和花紋
// - 鹿角珊瑚：一層一層分岔、越往上越細，尖端是淡色的新芽（attribute tip：0 根部 → 1 尖端）
// - 腦珊瑚：半球上有彎彎曲曲的溝（CPU 先把溝壓進幾何，shader 再把溝畫暗）
// - 桌形珊瑚：一根短柄撐著一片平平的大盤子，邊緣比較淡
// - 指狀珊瑚：一叢圓圓的短指頭，頂端圓圓的
// 表面都有一顆一顆的珊瑚蟲小孔（worley 噪聲），顏色用比較自然的土黃、橄欖、粉褐、紫褐，少數鮮豔的
import * as THREE from 'three';
import { attribute, mix, smoothstep, vec3, float, positionLocal, positionWorld, mx_worley_noise_float, mx_noise_float, sin, abs } from 'three/tsl';

function rngOf(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

// 把幾個幾何合在一起，保留 tip 屬性
function merge(list) {
  let n = 0; const gs = list.map((g) => { const ng = g.index ? g.toNonIndexed() : g; if (!ng.attributes.normal) ng.computeVertexNormals(); n += ng.attributes.position.count; return ng; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), tip = new Float32Array(n);
  let o = 0;
  for (const g of gs) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.tip) tip.set(g.attributes.tip.array, o); o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
  return out;
}
const UP = new THREE.Vector3(0, 1, 0);
// 一段樹枝：從 p 沿 dir 長 len，半徑 r0 → r1；tip 從 t0 漸變到 t1
function limb(p, dir, len, r0, r1, t0, t1, seg = 7) {
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true); g.translate(0, len / 2, 0);
  const tip = new Float32Array(g.attributes.position.count);
  for (let i = 0; i < tip.length; i++) tip[i] = t0 + (t1 - t0) * (g.attributes.position.getY(i) / len);
  g.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir)); g.translate(p.x, p.y, p.z);
  return g;
}
function cap(p, r, t) {
  const g = new THREE.SphereGeometry(r, 7, 5); g.translate(p.x, p.y, p.z);
  g.setAttribute('tip', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(t), 1));
  return g;
}

// 鹿角珊瑚
export function staghornGeo(seed = 7) {
  const r = rngOf(seed), parts = [], MAXD = 3;
  const grow = (p, dir, len, rad, d) => {
    const t0 = d / (MAXD + 1), t1 = (d + 1) / (MAXD + 1);
    parts.push(limb(p, dir, len, rad, rad * 0.8, t0, t1));
    const end = p.clone().addScaledVector(dir, len);
    if (d >= MAXD) { parts.push(cap(end, rad * 0.8, 1)); return; }
    const kids = d === 0 ? 3 : 2 + (r() < 0.4 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      // 往外分岔，但整體還是往上長
      const nd = dir.clone().add(new THREE.Vector3(r() - 0.5, 0, r() - 0.5).multiplyScalar(1.3)).add(new THREE.Vector3(0, 0.45, 0)).normalize();
      grow(end, nd, len * (0.7 + r() * 0.2), rad * 0.78, d + 1);
    }
  };
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + r();
    grow(new THREE.Vector3(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12), new THREE.Vector3(Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35).normalize(), 0.5, 0.11, 0);
  }
  return merge(parts);
}

// 腦珊瑚：用噪聲的等高線做出彎彎曲曲的溝，壓進球面
export function brainGeo() {
  const s = new THREE.SphereGeometry(1, 64, 40, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const a = s.attributes.position, tip = new Float32Array(a.count);
  const vn = (x, y, z) => Math.sin(x * 3.1 + Math.sin(z * 2.3 + y * 1.7) * 1.6) + Math.sin(z * 2.9 + Math.sin(x * 2.1) * 1.8) + Math.sin(y * 3.7 + x * 1.3);
  for (let i = 0; i < a.count; i++) {
    const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
    const groove = Math.abs(Math.sin(vn(x, y, z) * 3.2));      // 0 在溝底、1 在脊
    const k = 1 + 0.035 * groove + 0.04 * Math.sin(x * 4 + z * 3);
    a.setXYZ(i, x * k, y * k * 0.72, z * k);
    tip[i] = groove;
  }
  s.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
  s.computeVertexNormals(); return s;
}

// 桌形珊瑚
export function tableGeo(seed = 5) {
  const r = rngOf(seed), parts = [];
  parts.push(limb(new THREE.Vector3(), UP, 0.95, 0.2, 0.13, 0, 0.2, 9));
  const plate = new THREE.CylinderGeometry(1.05, 0.85, 0.14, 28, 1); plate.translate(0, 1.0, 0);
  const pa = plate.attributes.position, tip = new Float32Array(pa.count);
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), z = pa.getZ(i), d = Math.hypot(x, z);
    pa.setY(i, pa.getY(i) + d * d * 0.12 + Math.sin(Math.atan2(z, x) * 5 + r()) * 0.025 * d);   // 盤子邊緣微微往上翹、有波浪
    tip[i] = Math.min(1, d);
  }
  plate.setAttribute('tip', new THREE.BufferAttribute(tip, 1)); plate.computeVertexNormals();
  parts.push(plate);
  return merge(parts);
}

// 指狀珊瑚
export function fingerGeo(seed = 3) {
  const r = rngOf(seed), parts = [];
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.5, h = 0.25 + r() * 0.45;
    const p = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
    const dir = new THREE.Vector3(Math.cos(a) * d * 0.5, 1, Math.sin(a) * d * 0.5).normalize();
    const rad = 0.06 + r() * 0.03;
    parts.push(limb(p, dir, h, rad * 1.1, rad, 0, 0.9, 8));
    parts.push(cap(p.clone().addScaledVector(dir, h), rad, 1));
  }
  return merge(parts);
}

// 柳珊瑚（海扇）：在同一個平面上一直分岔的細枝，像一張網
export function seaFanGeo(seed = 11) {
  const r = rngOf(seed), parts = [], MAXD = 6;
  const grow = (p, ang, len, rad, d) => {
    const dir = new THREE.Vector3(Math.sin(ang), Math.cos(ang), (r() - 0.5) * 0.08).normalize();
    parts.push(limb(p, dir, len, rad, rad * 0.8, d / (MAXD + 1), (d + 1) / (MAXD + 1), 4));
    if (d >= MAXD) return;
    const end = p.clone().addScaledVector(dir, len);
    const spread = 0.28 + r() * 0.25;
    grow(end, ang - spread + (r() - 0.5) * 0.15, len * (0.8 + r() * 0.15), rad * 0.78, d + 1);
    grow(end, ang + spread + (r() - 0.5) * 0.15, len * (0.8 + r() * 0.15), rad * 0.78, d + 1);
  };
  grow(new THREE.Vector3(), 0, 0.35, 0.045, 0);
  for (const a of [-0.9, 0.9]) grow(new THREE.Vector3(0, 0.15, 0), a, 0.3, 0.032, 1);
  return merge(parts);
}

// 共用的珊瑚材質：instance 顏色當底色；根部深一點、尖端淡一點；表面一顆一顆的珊瑚蟲孔
export function coralMaterial({ tipPale = 0.55, pores = 9, brain = false } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.92, metalness: 0 });
  const tip = attribute('tip', 'float');
  const p = positionLocal;
  const pore = mx_worley_noise_float(p.mul(pores));                       // 0 在孔中心
  const poreK = smoothstep(0.05, 0.35, pore);                             // 孔裡面暗
  const mottled = mx_noise_float(positionWorld.mul(1.3)).mul(0.5).add(0.5);
  let shade;
  if (brain) shade = mix(float(0.42), float(1.05), smoothstep(0.05, 0.6, tip)).mul(mix(0.9, 1.05, mottled));   // 溝底暗、脊亮
  else shade = mix(float(0.62), float(1), smoothstep(0, 0.6, tip)).mul(mix(0.78, 1, poreK)).mul(mix(0.88, 1.06, mottled));
  // 尖端的新芽偏白（鹿角珊瑚、指狀珊瑚都這樣）
  const pale = smoothstep(0.75, 1, tip).mul(tipPale);
  m.colorNode = mix(vec3(1).mul(shade), vec3(1.6, 1.55, 1.45), pale);    // 乘上 instance 顏色後：底色 × 明暗，尖端泛白
  void sin; void abs;
  return m;
}

// 自然一點的珊瑚顏色（大部分是土黃、橄欖、粉褐、紫褐；少數鮮豔）
export const CORAL_COLORS = {
  stag: ['#c9a26b', '#b98c6a', '#9c7aa0', '#c98b8b', '#8a9a5b', '#d6b98a', '#b06ab3', '#e08a4b'],
  brain: ['#a8925f', '#8f9a62', '#b88f6f', '#9fa58a', '#c2a77a', '#7f8f6a'],
  table: ['#a9a874', '#b9a77d', '#9a9a70', '#c4a184', '#a88f7a'],
  fan: ['#c45a96', '#e0607a', '#e8904c', '#a86ac0', '#f0b84e'],
  finger: ['#c9b48a', '#d29a7e', '#8db0a6', '#b98fb6', '#e3c27a'],
};
