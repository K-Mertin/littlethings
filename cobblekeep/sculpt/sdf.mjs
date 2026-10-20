// Sculpting toolkit for Cobble Keep's monsters: shapes are written as signed distance fields
// ("digital clay"), blended with smooth unions, carved with smooth subtractions and meshed with
// surface nets. Pure math, no Three.js, so it runs in Node at build time (see bake.mjs).

export const V3 = (x, y, z) => [x, y, z];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const norm3 = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const mix = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const mir = (p, s) => [p[0] * s, p[1], p[2]];

/* ---------- blends ---------- */
export const smin = (a, b, k) => { const h = clamp(.5 + .5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };
export const smax = (a, b, k) => -smin(-a, -b, k);

/* ---------- primitives ---------- */
// capsule whose radius tapers from r1 (at a) to r2 (at b)
export function cone(p, a, b, r1, r2) { const ba = sub(b, a), pa = sub(p, a), h = clamp(dot(pa, ba) / dot(ba, ba), 0, 1); return len([pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h]) - (r1 + (r2 - r1) * h); }
export function ellLocal(q, r) { const k0 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]), k1 = Math.hypot(q[0] / (r[0] * r[0]), q[1] / (r[1] * r[1]), q[2] / (r[2] * r[2])); return k1 === 0 ? -Math.min(...r) : k0 * (k0 - 1) / k1; }
export const ell = (p, c, r) => ellLocal(sub(p, c), r);
export const sph = (p, c, r) => len(sub(p, c)) - r;
export function box(p, c, h, r = 0) { const q = sub(p, c).map((v, i) => Math.abs(v) - h[i] + r); return len(q.map(v => Math.max(v, 0))) + Math.min(Math.max(q[0], q[1], q[2]), 0) - r; }
// a cone with flat ends standing on the y axis at (cx, cz), radius r0 at y0 and r1 at y1 (exact)
export function cappedConeY(p, c, y0, y1, r0, r1) {
  const h = (y1 - y0) / 2, qx = Math.hypot(p[0] - c[0], p[2] - c[2]), qy = p[1] - (y0 + y1) / 2;
  const k1x = r1, k1y = h, k2x = r1 - r0, k2y = 2 * h, cax = qx - Math.min(qx, qy < 0 ? r0 : r1), cay = Math.abs(qy) - h;
  const t = clamp(((k1x - qx) * k2x + (k1y - qy) * k2y) / (k2x * k2x + k2y * k2y), 0, 1), cbx = qx - k1x + k2x * t, cby = qy - k1y + k2y * t;
  const s = cbx < 0 && cay < 0 ? -1 : 1; return s * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby));
}
export const torusY = (p, c, R, r) => { const q = sub(p, c); return Math.hypot(Math.hypot(q[0], q[2]) - R, q[1]) - r; };
export const shell = (d, off, th) => Math.abs(d - off) - th;
// a frame for oriented parts: u along the part, w across it (closest to `up`), v through it
export function frame(dir, up = [0, 1, 0]) { const u = norm3(dir), k = dot(u, up), w = norm3([up[0] - u[0] * k, up[1] - u[1] * k, up[2] - u[2] * k]); return { u, w, v: cross(u, w) }; }
export const toFrame = (p, c, F) => { const d = sub(p, c); return [dot(d, F.u), dot(d, F.w), dot(d, F.v)]; };

/* ---------- noise ---------- */
export function hash(x, y, z) { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
export function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, s = t => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const L = (a, b, t) => a + (b - a) * t, c = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
export const fbm3 = (p, f, oct = 3) => { let a = 0, w = .5, t = 0; for (let o = 0; o < oct; o++) { a += noise(p[0] * f, p[1] * f, p[2] * f + o * 7.1) * w; t += w; w *= .5; f *= 2; } return a / t; };

/* ---------- colour (sRGB hex in, linear out, as Three.js vertex colours expect) ---------- */
const toLin = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
export const hexLin = h => [1, 3, 5].map(i => toLin(parseInt(h.slice(i, i + 2), 16) / 255));
export const lerp3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
export const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

/* ---------- skin weights from bone segments ---------- */
export function segDist(p, a, b) { const ba = sub(b, a), pa = sub(p, a), h = clamp(dot(pa, ba) / dot(ba, ba), 0, 1); return len([pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h]); }
// segs: {boneName: [a, b, side]} where side (+1 / -1 / 0) keeps limbs from grabbing the other side
export function limbWeights(p, bones, segs, falloff = .0009) {
  const w = [];
  bones.forEach(([n], i) => { const s = segs[n]; if (!s) return; let d = segDist(p, s[0], s[1]); if (s[2] && Math.sign(p[0] || 1e-9) !== s[2]) d += .2; w.push([i, Math.exp(-(d * d) / falloff)]); });
  w.sort((a, b) => b[1] - a[1]); const top = w.slice(0, 4), t = top.reduce((a, b) => a + b[1], 0) || 1; return top.map(([i, v]) => [i, v / t]);
}

/* ---------- surface nets ---------- */
export function surfaceNets(f, lo, hi, n) {
  const nx = Math.ceil((hi[0] - lo[0]) / n) + 1, ny = Math.ceil((hi[1] - lo[1]) / n) + 1, nz = Math.ceil((hi[2] - lo[2]) / n) + 1;
  const F = new Float32Array(nx * ny * nz), I = (i, j, k) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[I(i, j, k)] = f([lo[0] + i * n, lo[1] + j * n, lo[2] + k * n]);
  const vid = new Int32Array(nx * ny * nz).fill(-1), pos = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const c = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let m = 0; for (let q = 0; q < 8; q++) { const v = F[I(i + (q & 1), j + ((q >> 1) & 1), k + (q >> 2))]; c[q] = v; if (v < 0) m |= 1 << q; }
    if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [a, b] of E) { if ((c[a] < 0) === (c[b] < 0)) continue; const t = c[a] / (c[a] - c[b]); sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; sz += (a >> 2) + ((b >> 2) - (a >> 2)) * t; cnt++; }
    vid[I(i, j, k)] = pos.length / 3; pos.push(lo[0] + (i + sx / cnt) * n, lo[1] + (j + sy / cnt) * n, lo[2] + (k + sz / cnt) * n);
  }
  const idx = [];
  const quad = (a, b, c2, d, flip) => { if (a < 0 || b < 0 || c2 < 0 || d < 0) return; if (flip) idx.push(a, c2, b, a, d, c2); else idx.push(a, b, c2, a, c2, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = F[I(i, j, k)] < 0;
    if (v0 !== (F[I(i + 1, j, k)] < 0)) quad(vid[I(i, j - 1, k - 1)], vid[I(i, j, k - 1)], vid[I(i, j, k)], vid[I(i, j - 1, k)], !v0);
    if (v0 !== (F[I(i, j + 1, k)] < 0)) quad(vid[I(i - 1, j, k - 1)], vid[I(i - 1, j, k)], vid[I(i, j, k)], vid[I(i, j, k - 1)], !v0);
    if (v0 !== (F[I(i, j, k + 1)] < 0)) quad(vid[I(i - 1, j - 1, k)], vid[I(i, j - 1, k)], vid[I(i, j, k)], vid[I(i - 1, j, k)], !v0);
  }
  return { pos, idx };
}
