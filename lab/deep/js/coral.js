// 珊瑚：照真的珊瑚做形狀和花紋
// - 鹿角珊瑚：一層一層分岔、越往上越細，尖端是淡色的新芽（attribute tip：0 根部 → 1 尖端）
// - 腦珊瑚：半球上有彎彎曲曲的溝（CPU 先把溝壓進幾何，shader 再把溝畫暗）
// - 桌形珊瑚：一根短柄撐著一片平平的大盤子，邊緣比較淡
// - 指狀珊瑚：一叢圓圓的短指頭，頂端圓圓的
// 表面都有一顆一顆的珊瑚蟲小孔（worley 噪聲），顏色用比較自然的土黃、橄欖、粉褐、紫褐，少數鮮豔的
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, mix, smoothstep, vec3, float, positionLocal, positionWorld, mx_worley_noise_float, mx_noise_float, sin, abs, exp, vec2, positionView, normalView, faceDirection } from 'three/tsl';

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
let FINE = 0;   // 0 = 不加密（太密會讓幾百叢珊瑚的頂點數爆掉、變卡；小杯改在 shader 裡用凹凸法線做）
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
  const r = rngOf(seed), parts = [], MAXD = 3; FINE = 0;
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
  FINE = 0; return roughen(merge(parts), 0.012, 7);
}

// 鹿角珊瑚叢林：真的鹿角珊瑚會長成一大片（好幾公尺寬、密密麻麻的枝），而不是一棵一棵分開的小樹
// 底下很多根短主幹，各自分岔兩三層；邊緣矮、中間高，整片像一塊起伏的灌木叢
export function thicketGeo(seed = 41, R = 2.2) {
  const r = rngOf(seed), parts = [], MAXD = 2;
  const grow = (p, dir, len, rad, d) => {
    parts.push(limb(p, dir, len, rad, rad * 0.8, d / (MAXD + 1), (d + 1) / (MAXD + 1), 6));
    const end = p.clone().addScaledVector(dir, len);
    if (d >= MAXD) { parts.push(cap(end, rad * 0.8, 1)); return; }
    const kids = 2 + (r() < 0.45 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const nd = dir.clone().add(new THREE.Vector3(r() - 0.5, 0, r() - 0.5).multiplyScalar(1.4)).add(new THREE.Vector3(0, 0.35, 0)).normalize();
      grow(end, nd, len * (0.72 + r() * 0.2), rad * 0.78, d + 1);
    }
  };
  const N = Math.round(R * R * 5);
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R;
    const edge = 1 - (d / R) ** 2;                                  // 中間高、邊緣矮
    const p = new THREE.Vector3(Math.cos(a) * d, -0.15, Math.sin(a) * d);
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.25 + (1 - edge) * 0.6);
    grow(p, out.add(new THREE.Vector3((r() - 0.5) * 0.5, 1, (r() - 0.5) * 0.5)).normalize(), 0.35 + edge * 0.5 + r() * 0.15, 0.065 + r() * 0.02, 0);
  }
  return roughen(merge(parts), 0.008, 9);
}

// 層疊的葉狀／板狀珊瑚：一片一片薄薄的扇形盤子，高高低低疊在一起（像書架、像花瓣），邊緣淡色有波浪
export function plateTierGeo(seed = 53) {
  const r = rngOf(seed), parts = [];
  for (let i = 0; i < 9; i++) {
    const rad = 0.35 + r() * 0.45, th0 = r() * Math.PI * 2, thL = 1.8 + r() * 2.2;
    const g = new THREE.CylinderGeometry(rad, rad * 0.95, 0.035, 22, 1, false, th0, thL);
    const pa = g.attributes.position, tip = new Float32Array(pa.count), ph = r() * 6;
    for (let k = 0; k < pa.count; k++) {
      const x = pa.getX(k), z = pa.getZ(k), d = Math.hypot(x, z) / rad;
      pa.setY(k, pa.getY(k) + d * d * 0.16 + Math.sin(Math.atan2(z, x) * 6 + ph) * 0.03 * d);   // 往外翹、邊緣波浪
      tip[k] = 0.3 + d * 0.7;
    }
    g.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
    const ox = (r() - 0.5) * 0.5, oz = (r() - 0.5) * 0.5;
    g.translate(ox, 0.08 + i * 0.09 + r() * 0.05, oz); g.computeVertexNormals();
    parts.push(g);
  }
  parts.push(limb(new THREE.Vector3(0, -0.1, 0), UP, 0.6, 0.12, 0.08, 0, 0.3, 7));
  return roughen(merge(parts), 0.006, 10);
}

// 地毯：殼狀珊瑚和軟珊瑚、群體海葵鋪成的一大片，矮矮的、一團一團鼓起來，邊緣不規則
export function carpetGeo(seed = 61) {
  const r = rngOf(seed), off = r() * 50, n = 30;
  const g = new THREE.PlaneGeometry(2, 2, n, n); g.rotateX(-Math.PI / 2);
  const pa = g.attributes.position, tip = new Float32Array(pa.count);
  for (let k = 0; k < pa.count; k++) {
    const x = pa.getX(k), z = pa.getZ(k), ang = Math.atan2(z, x);
    const edge = 0.72 + 0.22 * n3(Math.cos(ang) * 1.5 + off, Math.sin(ang) * 1.5, off);   // 不規則的邊
    const d = Math.hypot(x, z) / edge;
    const lump = 0.5 + 0.5 * n3(x * 5 + off, z * 5, 3) + 0.3 * n3(x * 13, z * 13 + off, 7);
    let y = Math.max(0, 1 - d ** 4) * (0.04 + lump * 0.15);
    if (d > 1) { const k2 = 1 / d; pa.setX(k, x * k2); pa.setZ(k, z * k2); y = -0.03; }   // 外面的點收到邊上、壓進沙裡
    pa.setY(k, y - 0.02);
    tip[k] = Math.min(1, lump * 0.8);
  }
  g.setAttribute('tip', new THREE.BufferAttribute(tip, 1)); g.computeVertexNormals();
  return g;
}

// 皮革珊瑚（軟珊瑚）：一根粗短的柄，上面一個大大的、邊緣捲起來皺皺的帽子
export function leatherGeo(seed = 71) {
  const r = rngOf(seed), parts = [];
  parts.push(limb(new THREE.Vector3(0, -0.1, 0), UP, 0.45, 0.16, 0.13, 0, 0.4, 10));
  const cap2 = new THREE.CylinderGeometry(0.5, 0.18, 0.12, 44, 3); cap2.translate(0, 0.42, 0);
  const pa = cap2.attributes.position, tip = new Float32Array(pa.count), ph = r() * 6;
  for (let k = 0; k < pa.count; k++) {
    const x = pa.getX(k), z = pa.getZ(k), d = Math.hypot(x, z) / 0.5, a = Math.atan2(z, x);
    pa.setY(k, pa.getY(k) + d * d * (0.1 + Math.sin(a * 7 + ph) * 0.09 + Math.sin(a * 3 + ph * 2) * 0.05));   // 皺褶
    tip[k] = 0.5 + d * 0.5;
  }
  cap2.setAttribute('tip', new THREE.BufferAttribute(tip, 1)); cap2.computeVertexNormals();
  parts.push(cap2);
  return merge(parts);
}

// 把一堆擺好位置的珊瑚合成一個大網格，每個頂點的高度跟著地形走（大片的珊瑚叢和地毯才會貼著起伏的海底）
export function bake(items, floorY) {
  const out = [], col = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), nn = new THREE.Vector3();
  let n = 0;
  for (const it of items) {
    const g = it.geo.index ? it.geo.toNonIndexed() : it.geo;
    n += g.attributes.position.count; out.push([g, it]);
  }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), tip = new Float32Array(n), clr = new Float32Array(n * 3);
  let o = 0;
  for (const [g, it] of out) {
    q.setFromEuler(e.set(0, it.ry, 0)); col.set(it.color);
    const p = g.attributes.position, nr = g.attributes.normal, tp = g.attributes.tip;
    for (let i = 0; i < p.count; i++, o++) {
      v.fromBufferAttribute(p, i).multiplyScalar(it.s); if (it.sy) v.y *= it.sy; v.applyQuaternion(q);
      const x = v.x + it.x, z = v.z + it.z;
      pos[o * 3] = x; pos[o * 3 + 1] = v.y + floorY(x, z); pos[o * 3 + 2] = z;
      nn.fromBufferAttribute(nr, i).applyQuaternion(q); nor[o * 3] = nn.x; nor[o * 3 + 1] = nn.y; nor[o * 3 + 2] = nn.z;
      tip[o] = tp ? tp.getX(i) : 0.5;
      const k = it.vary ? 0.85 + 0.3 * h3(Math.floor(x * 1.3), 0, Math.floor(z * 1.3)) : 1;   // 同一片裡顏色也有一塊一塊的深淺
      clr[o * 3] = col.r * k; clr[o * 3 + 1] = col.g * k; clr[o * 3 + 2] = col.b * k;
    }
  }
  const b = new THREE.BufferGeometry();
  b.setAttribute('position', new THREE.BufferAttribute(pos, 3)); b.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  b.setAttribute('tip', new THREE.BufferAttribute(tip, 1)); b.setAttribute('color', new THREE.BufferAttribute(clr, 3));
  return b;
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
  FINE = 0; parts.push(limb(new THREE.Vector3(), UP, 0.95, 0.2, 0.13, 0, 0.2, 9));
  const plate = new THREE.CylinderGeometry(1.05, 0.85, 0.14, 40, 2); plate.translate(0, 1.0, 0);
  const pa = plate.attributes.position, tip = new Float32Array(pa.count);
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), z = pa.getZ(i), d = Math.hypot(x, z);
    pa.setY(i, pa.getY(i) + d * d * 0.12 + Math.sin(Math.atan2(z, x) * 5 + r()) * 0.025 * d);   // 盤子邊緣微微往上翹、有波浪
    tip[i] = Math.min(1, d);
  }
  plate.setAttribute('tip', new THREE.BufferAttribute(tip, 1)); plate.computeVertexNormals();
  parts.push(plate);
  FINE = 0; return roughen(merge(parts), 0.012, 6);
}

// 指狀珊瑚
export function fingerGeo(seed = 3) {
  const r = rngOf(seed), parts = []; FINE = 0;
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.5, h = 0.25 + r() * 0.45;
    const p = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
    const dir = new THREE.Vector3(Math.cos(a) * d * 0.5, 1, Math.sin(a) * d * 0.5).normalize();
    const rad = 0.06 + r() * 0.03;
    parts.push(limb(p, dir, h, rad * 1.1, rad, 0, 0.9, 8));
    parts.push(cap(p.clone().addScaledVector(dir, h), rad, 1));
  }
  FINE = 0; return roughen(merge(parts), 0.012, 8);
}

// 柳珊瑚（海扇）：在同一個平面上一直分岔的細枝，像一張網
export function seaFanGeo(seed = 11) {
  // 真的海扇：很短的柄，往上長出很多幾乎平行、慢慢分岔的細枝，枝和枝之間還會互相長在一起變成一張網；
  // 整體外形是寬寬的扇形或橢圓，而不是一棵樹
  const r = rngOf(seed), parts = [], MAXD = 5, nodes = [];
  const grow = (p, ang, len, rad, d) => {
    const dir = new THREE.Vector3(Math.sin(ang), Math.cos(ang), (r() - 0.5) * 0.06).normalize();
    parts.push(limb(p, dir, len, rad, rad * 0.85, 0.2 + d * 0.13, 0.33 + d * 0.13, 4));
    const end = p.clone().addScaledVector(dir, len);
    nodes.push(end);
    if (d >= MAXD) return;
    const na = ang * 0.82 + (r() - 0.5) * 0.14;                  // 越往上越直，但有一點彎彎曲曲
    const sp = 0.12 + r() * 0.1;
    if (r() < 0.75) { grow(end, na - sp, len * 0.95, rad * 0.85, d + 1); grow(end, na + sp, len * 0.95, rad * 0.85, d + 1); }
    else grow(end, na + (r() - 0.5) * 0.1, len, rad * 0.9, d + 1);
  };
  parts.push(limb(new THREE.Vector3(0, -0.05, 0), UP, 0.14, 0.04, 0.035, 0, 0.15, 5));
  for (let i = 0; i < 6; i++) { const a = -1.15 + i * 0.46 + (r() - 0.5) * 0.15; grow(new THREE.Vector3(Math.sin(a) * 0.03, 0.1, 0), a, 0.17 + r() * 0.04, 0.022, 0); }
  // 網：相鄰的枝之間接上細細的橫枝
  let links = 0;
  for (let i = 0; i < nodes.length && links < 90; i++) for (let j = i + 1; j < nodes.length; j++) {
    const d = nodes[i].distanceTo(nodes[j]);
    if (d > 0.04 && d < 0.11 && r() < 0.18) { const dir = nodes[j].clone().sub(nodes[i]).normalize(); parts.push(limb(nodes[i], dir, d, 0.007, 0.007, 0.8, 0.8, 3)); links++; break; }
  }
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
  // 珊瑚蟲小杯的凹凸：每顆是一圈凸起的杯緣、中間一個小洞。不加頂點，改用螢幕空間導數算凹凸法線
  // （Mikkelsen「Bump Mapping Unparametrized Surfaces on the GPU」，three.js 的 bumpMap 也是這個做法）
  const cupH = exp(pore.sub(0.24).div(0.11).pow(2).negate()).sub(smoothstep(0.13, 0.0, pore).mul(0.9)).mul(brain ? 0.5 : 1);
  const dH = vec2(cupH.dFdx(), cupH.dFdy()).mul(brain ? 0.6 : 1.1);
  const sX = positionView.dFdx().normalize(), sY = positionView.dFdy().normalize(), N = normalView;
  const R1 = sY.cross(N), R2 = N.cross(sX), det = sX.dot(R1).mul(faceDirection);
  m.normalNode = det.abs().mul(N).sub(det.sign().mul(dH.x.mul(R1).add(dH.y.mul(R2)))).normalize();
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
  thicket: ['#c9a26b', '#b98c6a', '#a58a5a', '#9c7aa0', '#c98b8b', '#8a9a5b'],
  plate: ['#a9a874', '#8a6a8f', '#b9a77d', '#6f7f5a', '#c4a184'],
  carpet: ['#6f8a5a', '#8a7a9a', '#a08a5a', '#5f8f7f', '#b07a6a', '#7f6f4f', '#8f9f6a'],
  leather: ['#c9c08a', '#b8b49a', '#d6c79a', '#a9b48a', '#c7a98a'],
};
