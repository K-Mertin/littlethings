// 珊瑚：照真的珊瑚做形狀和花紋
// - 鹿角珊瑚：一層一層分岔、越往上越細，尖端是淡色的新芽（attribute tip：0 根部 → 1 尖端）
// - 腦珊瑚：半球上有彎彎曲曲的溝（CPU 先把溝壓進幾何，shader 再把溝畫暗）
// - 桌形珊瑚：一根短柄撐著一片平平的大盤子，邊緣比較淡
// - 指狀珊瑚：一叢圓圓的短指頭，頂端圓圓的
// 表面都有一顆一顆的珊瑚蟲小孔（worley 噪聲），顏色用比較自然的土黃、橄欖、粉褐、紫褐，少數鮮豔的
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
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

// 表面變粗糙：一顆顆凸起的珊瑚蟲小杯（每格一個隨機點，離點越近越鼓、正中間凹一個小洞）＋細細的起伏
function cellBump(x, y, z, f) {
  const X = x * f, Y = y * f, Z = z * f, xi = Math.floor(X), yi = Math.floor(Y), zi = Math.floor(Z); let best = 9;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
    const h = h3(xi + a, yi + b, zi + c), px = xi + a + h, py = yi + b + h3(zi + c, xi + a, yi + b), pz = zi + c + h3(yi + b, zi + c, xi + a);
    const d = (X - px) ** 2 + (Y - py) ** 2 + (Z - pz) ** 2; if (d < best) best = d;
  }
  const d = Math.sqrt(best);
  return Math.exp(-(((d - 0.24) / 0.11) ** 2)) - (d < 0.13 ? 0.9 * (1 - d / 0.13) : 0) - 0.25;   // 每顆珊瑚蟲：一圈凸起的杯緣、中間一個小洞
}
function roughen(geo, amp, freq) {
  const g = mergeVertices(geo, 1e-4); g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i);
    const k = cellBump(v.x, v.y, v.z, freq) + n3(v.x * freq * 0.35, v.y * freq * 0.35, v.z * freq * 0.35) * 0.4;
    v.addScaledVector(nn, k * amp); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
const UP = new THREE.Vector3(0, 1, 0);
// 一段樹枝：從 p 沿 dir 長 len，半徑 r0 → r1；tip 從 t0 漸變到 t1
// FINE：要做粗糙表面的珊瑚用比較密的網格（凹凸才不會被網格吃掉）
let FINE = 0;
function limb(p, dir, len, r0, r1, t0, t1, seg = 9) {
  if (FINE) seg = Math.max(seg, FINE);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, Math.max(2, Math.round(len / (FINE ? 0.025 : 0.07))), true); g.translate(0, len / 2, 0);
  const tip = new Float32Array(g.attributes.position.count);
  for (let i = 0; i < tip.length; i++) tip[i] = t0 + (t1 - t0) * (g.attributes.position.getY(i) / len);
  g.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir)); g.translate(p.x, p.y, p.z);
  return g;
}
function cap(p, r, t) {
  const g = FINE ? new THREE.SphereGeometry(r, FINE, Math.ceil(FINE * 0.6)) : new THREE.SphereGeometry(r, 9, 6); g.translate(p.x, p.y, p.z);
  g.setAttribute('tip', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(t), 1));
  return g;
}

// 鹿角珊瑚
export function staghornGeo(seed = 7) {
  const r = rngOf(seed), parts = [], MAXD = 3; FINE = 14;
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
  FINE = 0; return roughen(merge(parts), 0.022, 24);
}

// 3D 數值噪聲（給腦珊瑚的迷宮紋路用）
function h3(x, y, z) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function n3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => h3(xi + dx, yi + dy, zi + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
// 腦珊瑚：噪聲先扭曲（domain warp）再取「接近 0 的地方」當溝 → 彎彎曲曲、互相連起來的迷宮，而不是一圈一圈的年輪
export function brainGeo() {
  const s = new THREE.SphereGeometry(1, 96, 60, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const a = s.attributes.position, tip = new Float32Array(a.count);
  const F = 3.2;
  for (let i = 0; i < a.count; i++) {
    const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
    const wx = x + 0.35 * n3(x * 2 + 11, y * 2, z * 2), wy = y + 0.35 * n3(x * 2, y * 2 + 23, z * 2), wz = z + 0.35 * n3(x * 2, y * 2, z * 2 + 37);
    const nn = n3(wx * F, wy * F, wz * F) + 0.5 * n3(wx * F * 2.1 + 5, wy * F * 2.1, wz * F * 2.1);
    const ridge = Math.min(1, Math.abs(Math.sin(nn * Math.PI * 1.6)) * 1.25);   // 0 在溝底、1 在脊上
    const k = 1 + 0.045 * ridge + 0.03 * n3(x * 1.5 + 3, y * 1.5, z * 1.5);
    a.setXYZ(i, x * k, y * k * 0.72, z * k);
    tip[i] = ridge;
  }
  s.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
  s.computeVertexNormals(); return s;
}

// 桌形珊瑚
export function tableGeo(seed = 5) {
  const r = rngOf(seed), parts = [];
  FINE = 18; parts.push(limb(new THREE.Vector3(), UP, 0.95, 0.2, 0.13, 0, 0.2, 9));
  const plate = new THREE.CylinderGeometry(1.05, 0.85, 0.14, 96, 4); plate.translate(0, 1.0, 0);
  const pa = plate.attributes.position, tip = new Float32Array(pa.count);
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), z = pa.getZ(i), d = Math.hypot(x, z);
    pa.setY(i, pa.getY(i) + d * d * 0.12 + Math.sin(Math.atan2(z, x) * 5 + r()) * 0.025 * d);   // 盤子邊緣微微往上翹、有波浪
    tip[i] = Math.min(1, d);
  }
  plate.setAttribute('tip', new THREE.BufferAttribute(tip, 1)); plate.computeVertexNormals();
  parts.push(plate);
  FINE = 0; return roughen(merge(parts), 0.022, 18);
}

// 指狀珊瑚
export function fingerGeo(seed = 3) {
  const r = rngOf(seed), parts = []; FINE = 16;
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.5, h = 0.25 + r() * 0.45;
    const p = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
    const dir = new THREE.Vector3(Math.cos(a) * d * 0.5, 1, Math.sin(a) * d * 0.5).normalize();
    const rad = 0.06 + r() * 0.03;
    parts.push(limb(p, dir, h, rad * 1.1, rad, 0, 0.9, 8));
    parts.push(cap(p.clone().addScaledVector(dir, h), rad, 1));
  }
  FINE = 0; return roughen(merge(parts), 0.024, 21);
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
