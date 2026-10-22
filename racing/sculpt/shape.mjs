// Car shaping helpers on top of Cobble Keep's distance-field toolkit.
// A body is a loft: at each position z along the car a rounded cross-section (superellipse with
// tumblehome) is described by its half width, floor and top height. The distance it returns is
// approximate but its gradient is exact enough for normals, which is what shading needs.
export * from '../../cobblekeep/sculpt/sdf.mjs';
import { clamp } from '../../cobblekeep/sculpt/sdf.mjs';

// smooth curve through [t, value] keys (Catmull-Rom, clamped at the ends): C1, so reflections stay clean
export function curve(keys) {
  const n = keys.length;
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (keys[i + 1][0] < t) i++;
    const [t1, p1] = keys[i], [t2, p2] = keys[i + 1];
    const [t0, p0] = keys[i - 1] || [t1 - (t2 - t1), p1 - (p2 - p1)], [t3, p3] = keys[i + 2] || [t2 + (t2 - t1), p2 + (p2 - p1)];
    const m1 = ((p2 - p1) / (t2 - t1) + (p1 - p0) / (t1 - t0)) / 2 * (t2 - t1), m2 = ((p3 - p2) / (t3 - t2) + (p2 - p1) / (t2 - t1)) / 2 * (t2 - t1);
    const s = (t - t1) / (t2 - t1), s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p1 + (s3 - 2 * s2 + s) * m1 + (-2 * s3 + 3 * s2) * p2 + (s3 - s2) * m2;
  };
}
export const keysOf = v => typeof v === 'number' ? () => v : curve(v);

// loft along z: o = { z0, z1, hw, yb, yt, n, tb, end } (curves of z); returns sdf(p) and section(z)
export function loft(o) {
  const hw = keysOf(o.hw), yb = keysOf(o.yb), yt = keysOf(o.yt), n = keysOf(o.n ?? 4), tb = keysOf(o.tb ?? 0.1), end = o.end ?? 0.1;
  const sec = z => { const b = yb(z), t = yt(z); return { hw: hw(z), yb: b, yt: t, yc: (b + t) / 2, hh: (t - b) / 2, n: n(z), tb: tb(z) }; };
  const sdf = p => {
    const z = clamp(p[2], o.z0, o.z1), s = sec(z);
    const Y = (p[1] - s.yc) / s.hh, Yt = clamp(Y, 0, 1), hwe = s.hw * (1 - s.tb * Yt * Yt);   // tumblehome stops at the top so far points stay outside
    const X = Math.abs(p[0]) / Math.max(hwe, 1e-3), Ya = Math.abs(Y);
    const r = Math.pow(Math.pow(X, s.n) + Math.pow(Ya, s.n), 1 / s.n);
    const d2 = (r - 1) * Math.min(hwe, s.hh) * 0.95;
    const dz = Math.max(p[2] - o.z1, o.z0 - p[2]);
    // round the ends in plan and profile (rounded intersection of the section and the end planes)
    return Math.min(-end, Math.max(d2, dz)) + Math.hypot(Math.max(d2 + end, 0), Math.max(dz + end, 0));
  };
  // half width of the surface at height y (for pillars and trim)
  const sideX = (z, y) => { const s = sec(clamp(z, o.z0, o.z1)), Y = clamp((y - s.yc) / s.hh, -1, 1), hwe = s.hw * (1 - s.tb * Math.max(0, Y) * Math.max(0, Y)); return hwe * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(Y), s.n)), 1 / s.n); };
  return { sdf, sec, sideX };
}

// distance in the (a, b) plane to a convex polygon given as [[a, b], ...] counter-clockwise (negative inside)
export function poly2(a, b, P) {
  let d = Infinity, inside = true;
  for (let i = 0; i < P.length; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length], ex = x2 - x1, ey = y2 - y1, wx = a - x1, wy = b - y1;
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1), dx = wx - ex * t, dy = wy - ey * t;
    d = Math.min(d, Math.hypot(dx, dy));
    if (ex * wy - ey * wx < 0) inside = false;
  }
  return inside ? -d : d;
}
// rounded version: shrink by r then add r back
export const rpoly2 = (a, b, P, r) => poly2(a, b, P) - r;
