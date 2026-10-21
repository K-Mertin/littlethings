// 共用的小工具：公尺 UV 的方塊、合併幾何、畫布貼圖、PBR 材質
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const rand = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
export const pick = (a) => a[Math.floor(rand() * a.length)];

// Box with UVs measured in meters (so tiling textures keep a real-world scale)
export function mbox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]);
  }
  return g;
}
// plane (facing +z) with uv in meters
export function mplane(w, h, uvScale = true) {
  const g = new THREE.PlaneGeometry(w, h);
  if (uvScale) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); }
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function mat4(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

// Collects geometry per material and merges into as few meshes as possible
export class Batch {
  constructor() { this.groups = new Map(); }
  add(geo, mat, matrix, opts = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (matrix) g.applyMatrix4(matrix);
    const key = mat.uuid + (opts.noShadow ? ':ns' : '') + (opts.noCast ? ':nc' : '');
    if (!this.groups.has(key)) this.groups.set(key, { mat, geos: [], opts });
    this.groups.get(key).geos.push(g);
  }
  build(parent) {
    const meshes = [];
    for (const { mat, geos, opts } of this.groups.values()) {
      const m = new THREE.Mesh(mergeGeometries(geos), mat);
      m.castShadow = !opts.noShadow && !opts.noCast; m.receiveShadow = !opts.noShadow;
      m.matrixAutoUpdate = false; m.updateMatrix();
      parent.add(m); meshes.push(m);
    }
    this.groups.clear();
    return meshes;
  }
}

// ---------- textures
const loader = new THREE.TextureLoader();
const texCache = new Map();
let maxAniso = 4;
export function setAniso(a) { maxAniso = a; }
export function tex(url, { color = false, repeat = 1, rot = 0 } = {}) {
  const key = url + '|' + repeat + '|' + color;
  if (texCache.has(key)) return texCache.get(key);
  const t = loader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = maxAniso;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}
// PBR material from a texture set in assets/tex: name_c / name_n / name_orm. tile = meters per texture repeat
export function pbr(name, { tile = 2, color = 0xffffff, rough = 1, metal = 0, normal = 1, env = 0.7, side } = {}) {
  const r = 1 / tile, base = 'assets/tex/' + name;
  const m = new THREE.MeshStandardMaterial({
    map: tex(base + '_c.webp', { color: true, repeat: r }),
    normalMap: tex(base + '_n.webp', { repeat: r }),
    roughnessMap: tex(base + '_orm.webp', { repeat: r }),
    aoMap: tex(base + '_orm.webp', { repeat: r }),
    color, roughness: rough, metalness: metal, envMapIntensity: env,
  });
  m.normalScale.set(normal, normal);
  m.aoMapIntensity = 0.8;
  if (side) m.side = side;
  return m;
}
const stdCache = new Map();
export function std(color, rough = 0.8, metal = 0, extra = {}) {
  const key = JSON.stringify([color, rough, metal, extra]);
  if (!stdCache.has(key)) stdCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.7, ...extra }));
  return stdCache.get(key);
}

// canvas texture
export function canvasTex(w, h, draw, { repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
export const SERIF = '"Noto Serif TC", "Songti TC", serif';

export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function fitText(g, text, maxW, size, weight = 900, font = FONT) {
  let s = size;
  do { g.font = `${weight} ${s}px ${font}`; s -= 2; } while (g.measureText(text).width > maxW && s > 8);
  return s + 2;
}
