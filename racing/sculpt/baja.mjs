// Baja Truck, sculpted: a desert trophy truck. 4.7 m long, 2.1 m wide over the fibreglass fenders,
// 1.9 m tall. Short cab, open bed with a spare wheel, exposed tube roll cage over the bed, light bar
// on the roof, round spotlights on the bull bar, long-travel coil-over shocks in the fenders,
// skid plate under the nose. x across, y up, z forward; wheels at z = 1.5 / -1.45, y = 0.46, x = ±0.92.
import { loft, smin, smax, box, ell, sph, cone, hexLin, clamp, rpoly2 } from './shape.mjs';

const WF = 1.5, WRZ = -1.45, WCY = 0.46, ARCH = 0.53;

export function baja() {
  const tub = loft({
    z0: -2.3, z1: 2.3, end: 0.1,
    hw: [[-2.3, 0.88], [-1.8, 0.9], [0.4, 0.9], [1.9, 0.86], [2.3, 0.74]],
    yb: [[-2.3, 0.66], [-2.0, 0.56], [1.95, 0.56], [2.3, 0.7]],
    yt: [[-2.3, 1.22], [-0.6, 1.26], [0.3, 1.27], [1.0, 1.22], [1.8, 1.16], [2.15, 1.08], [2.3, 0.98]],
    n: [[-2.3, 6], [0, 8], [2.3, 5]], tb: 0.04,
  });
  // separate fibreglass fenders, flared well outboard of the body
  const fender = (p, zw, front) => { const x = Math.abs(p[0]); const q = [x, p[1], p[2]];
    const shellD = Math.abs(ell(q, [0.88, 0.62, zw + (front ? 0.05 : -0.05)], [0.27, 0.58, 0.86])) - 0.025;
    return Math.max(shellD, -(Math.hypot(p[1] - WCY, p[2] - zw) - ARCH), 0.5 - p[1]); };   // an arch: the shell, open round the wheel
  const fenders = p => Math.min(fender(p, WF, true), fender(p, WRZ, false));
  const cabS = loft({ z0: -0.75, z1: 0.62, end: 0.12, hw: [[-0.75, 0.84], [0.62, 0.8]], yb: 1.1,
    yt: [[-0.75, 1.86], [-0.2, 1.88], [0.3, 1.82], [0.62, 1.3]], n: 6, tb: 0.1 });
  const bed = p => box(p, [0, 1.08, -1.55], [0.82, 0.24, 0.72], 0.04);
  const hull = p => smax(smin(smin(tub.sdf(p), cabS.sdf(p), 0.05), fenders(p), 0.04), -bed(p), 0.03);
  const roof = z => cabS.sec(z).yt;
  const sideCut = p => Math.max(rpoly2(p[2], p[1], [[-0.62, 1.32], [0.42, 1.3], [0.24, 1.76], [-0.62, 1.78]], 0.02), p[1] - (roof(p[2]) - 0.08), 0.6 - Math.abs(p[0]));
  const shield = p => { const z = p[2], x = Math.abs(p[0]); return Math.max(x - 0.66, 1.32 - p[1], p[1] - 1.8, 0.28 - z, z - 0.64); };
  const rearW = p => Math.max(Math.abs(p[0]) - 0.58, 1.42 - p[1], p[1] - 1.76, -0.8 - p[2], p[2] + 0.66);
  const cut = p => Math.min(sideCut(p), shield(p), rearW(p));
  const cabin = p => box(p, [0, 1.3, -0.1], [0.74, 0.42, 0.56], 0.08);
  const grilleE = p => box(p, [0, 0.98, 2.28], [0.6, 0.12, 0.1], 0.03);
  const headE = p => { const x = Math.abs(p[0]); return box([x, p[1], p[2]], [0.68, 1.03, 2.22], [0.13, 0.06, 0.1], 0.03); };
  const tailE = p => { const x = Math.abs(p[0]); return box([x, p[1], p[2]], [0.74, 1.06, -2.29], [0.06, 0.12, 0.05], 0.02); };
  const arches = p => { const x = Math.abs(p[0]); let d = 1; for (const zw of [WF, WRZ]) d = Math.min(d, Math.max(Math.hypot(p[1] - WCY, p[2] - zw) - ARCH + 0.02, 0.45 - x)); return d; };
  const carve = p => Math.min(grilleE(p), headE(p), tailE(p), arches(p));
  const paintSdf = p => { let d = hull(p); d = smax(d, -carve(p), 0.01); d = smax(d, -cut(p), 0.006); return smax(d, -cabin(p), 0.02); };

  const split = (p, n) => {
    const depth = hull(p), y = p[1];
    if (grilleE(p) < 0.005) return 'black';
    if (arches(p) < 0.01 && fenders(p) > 0.005) return 'liner';
    if (headE(p) < 0.004) return 'housing';
    if (tailE(p) < 0.004) return 'tailHousing';
    if (fenders(p) < 0.005 && tub.sdf(p) > 0.01 && cabS.sdf(p) > 0.01) return 'fender';             // matte black fibreglass
    if (bed(p) < 0.02) return 'liner';
    if (depth < -0.02 || (cut(p) < 0.015 && depth < -0.008)) return 'interior';
    if (cut(p) < 0.03 && y > 1.3) return 'black';
    if (y < 0.7) return 'black';
    return 'paint';
  };
  const lineAt = (v, w) => Math.exp(-(v * v) / (w * w));
  const paintCol = (p, n) => { const s = split(p, n), x = Math.abs(p[0]);
    if (s === 'paint') { const k = 1 - 0.85 * Math.max(lineAt(p[2] - 0.6, 0.006) * (x > 0.6 && p[1] < 1.3 ? 1 : 0), lineAt(p[2] + 0.75, 0.006) * (x > 0.6 && p[1] < 1.8 ? 1 : 0)); return [k, k, k]; }
    if (s === 'fender') return hexLin('#1e1f22');
    if (s === 'interior') return hexLin('#202024'); if (s === 'liner') return hexLin('#2a2a2c');
    if (s === 'housing') return hexLin('#3a3e46'); if (s === 'tailHousing') return hexLin('#2a0a0d'); return hexLin('#17181b'); };
  const W = [1, 1, 1];
  const glassSdf = p => Math.max(Math.abs(hull(p) + 0.007) - 0.006, cut(p) + 0.006);
  const headLens = p => Math.max(Math.abs(hull(p) + 0.004) - 0.0045, headE(p) + 0.004);
  const tailLens = p => Math.max(Math.abs(hull(p) + 0.004) - 0.0045, tailE(p) + 0.004);
  // tube work: bull bar, bed cage, roof rack
  const tube = (p, a, b, r = 0.03) => cone(p, a, b, r, r);
  const cage = p => {
    const x = Math.abs(p[0]), q = [x, p[1], p[2]];
    let d = tube(q, [0.7, 1.82, -0.72], [0.66, 1.82, -2.2]);                        // bed rails from the cab roof back
    d = Math.min(d, tube(q, [0.66, 1.82, -2.2], [0.78, 1.2, -2.28]), tube(p, [-0.66, 1.82, -2.2], [0.66, 1.82, -2.2]), tube(q, [0.7, 1.82, -1.45], [0.84, 1.28, -1.45]));
    d = Math.min(d, tube(q, [0.62, 1.86, -0.7], [0.62, 1.86, 0.25], 0.022), tube(p, [-0.62, 1.88, 0.2], [0.62, 1.88, 0.2], 0.022));           // roof rack
    d = Math.min(d, tube(q, [0.62, 0.86, 2.42], [0.62, 1.22, 2.36], 0.035), tube(p, [-0.62, 1.2, 2.37], [0.62, 1.2, 2.37], 0.035), tube(p, [-0.66, 0.86, 2.42], [0.66, 0.86, 2.42], 0.035));   // bull bar
    return d;
  };
  const lightBar = p => box(p, [0, 1.94, 0.2], [0.62, 0.05, 0.05], 0.02);
  const lightBarLeds = p => { let d = 1; for (let k = -6; k <= 6; k++) d = Math.min(d, box(p, [k * 0.095, 1.94, 0.252], [0.035, 0.03, 0.006], 0.004)); return d; };
  const spots = p => { const x = Math.abs(p[0]); let d = 1; for (const cx of [0.22, 0.48]) d = Math.min(d, smax(sph([x, p[1], p[2]], [cx, 1.3, 2.39], 0.1), -(2.43 - p[2]), 0.01)); return d; };
  const spotLens = p => { const x = Math.abs(p[0]); let d = 1; for (const cx of [0.22, 0.48]) d = Math.min(d, Math.max(Math.hypot(x - cx, p[1] - 1.3) - 0.085, Math.abs(p[2] - 2.43) - 0.008)); return d; };
  const skid = p => box([p[0], p[1] - (p[2] - 2.2) * 0.45, p[2]], [0, 0.6, 2.2], [0.6, 0.012, 0.24], 0.01);
  const shocks = p => {                                                    // coil-over shocks: a shaft inside a ribbed spring
    const x = Math.abs(p[0]); let d = 1;
    for (const zw of [WF, WRZ]) {
      const a = [0.86, 0.6, zw], b = [0.66, 1.15, zw], q = [x, p[1], p[2]];
      const t = clamp((q[1] - a[1]) / (b[1] - a[1]), 0, 1);
      d = Math.min(d, tube(q, a, b, 0.03), Math.max(tube(q, [lerp(a[0], b[0], 0.2), lerp(a[1], b[1], 0.2), zw], [lerp(a[0], b[0], 0.8), lerp(a[1], b[1], 0.8), zw], 0.065), -(tube(q, a, b, 0.048)), Math.sin(t * 90) * 0.012));
    }
    return d;
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const spare = p => { const q = [p[0], p[1] - 1.18, p[2] + 1.65], r = Math.hypot(q[0], q[2]); return Math.max(Math.abs(r - 0.33) - 0.13, Math.abs(q[1]) - 0.15) - 0.02; };
  const mirrors = p => { const x = Math.abs(p[0]), q = [x, p[1], p[2]]; return smin(box(q, [1.0, 1.5, 0.5], [0.08, 0.09, 0.03], 0.02), tube(q, [0.84, 1.42, 0.5], [0.94, 1.48, 0.5], 0.015), 0.015); };
  const exhaust = p => { const r = Math.hypot(p[0] - 0.72, p[1] - 0.66); return Math.max(Math.abs(r - 0.05) - 0.008, Math.abs(p[2] + 2.3) - 0.1); };
  const seats = p => { let d = 1; for (const sx of [-1, 1]) { const q = [p[0] - sx * 0.34, p[1], p[2]]; d = Math.min(d, smin(box(q, [0, 1.18, -0.2], [0.2, 0.06, 0.22], 0.05), box([q[0], q[1] - 1.5, q[2] + 0.45 - (q[1] - 1.5) * 0.15], [0, 0, 0], [0.2, 0.32, 0.06], 0.06), 0.05)); }
    return Math.min(d, box(p, [0, 1.55, 0.42], [0.7, 0.07, 0.14], 0.05)); };

  const deck = Array.from({ length: 48 }, (_, i) => { const z = -2.35 + i * 0.1; let lo = 0.8, hi = 2.2; if (hull([0, hi, z]) < 0 || hull([0, lo, z]) > 0) return [+z.toFixed(2), 1.0]; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (hull([0, m, z]) < 0) lo = m; else hi = m; } return [+z.toFixed(2), +lo.toFixed(4)]; });
  const step = 0.0082;
  return {
    name: 'baja',
    meta: { L: 4.7, R: 0.46, TW: 0.38, wheels: [[0.92, WCY, WF], [0.92, WCY, WRZ]], deck, door: [0.905, 0.95, -0.05], exh: [[0.72, 0.66, -2.36]] },
    pieces: [
      { name: 'body', sdf: paintSdf, lo: [-1.24, 0.42, -2.4], hi: [1.24, 1.98, 2.4], step, split, paint: paintCol, ao: true },
      { name: 'glass', mat: 'glass', sdf: glassSdf, lo: [-0.88, 1.28, -0.84], hi: [0.88, 1.9, 0.66], step: 0.005, paint: () => W },
      { name: 'headLens', mat: 'lens', sdf: headLens, lo: [-0.86, 0.92, 2.1], hi: [0.86, 1.14, 2.34], step: 0.0035, paint: () => W },
      { name: 'tailLens', mat: 'tailLens', sdf: tailLens, lo: [-0.84, 0.9, -2.36], hi: [0.84, 1.22, -2.22], step: 0.0035, paint: () => W },
      { name: 'cage', mat: 'black', sdf: cage, lo: [-0.92, 0.78, -2.34], hi: [0.92, 1.95, 2.5], step: 0.006, paint: () => hexLin('#2a2b2f') },
      { name: 'lightBar', mat: 'black', sdf: lightBar, lo: [-0.7, 1.86, 0.12], hi: [0.7, 2.02, 0.28], step: 0.004, paint: () => hexLin('#1a1b1e') },
      { name: 'lightBarLeds', mat: 'led', sdf: lightBarLeds, lo: [-0.66, 1.9, 0.24], hi: [0.66, 1.98, 0.27], step: 0.003, paint: () => W },
      { name: 'spots', mat: 'black', sdf: spots, lo: [-0.6, 1.18, 2.27], hi: [0.6, 1.42, 2.45], step: 0.004, paint: () => hexLin('#1a1b1e') },
      { name: 'spotLens', mat: 'chrome', sdf: spotLens, lo: [-0.6, 1.2, 2.41], hi: [0.6, 1.4, 2.45], step: 0.003, paint: () => W },
      { name: 'skid', mat: 'housing', sdf: skid, lo: [-0.66, 0.5, 1.9], hi: [0.66, 0.76, 2.5], step: 0.005, paint: () => hexLin('#8a8e96') },
      { name: 'shocks', mat: 'caliper', sdf: shocks, lo: [-0.95, 0.48, -1.65], hi: [0.95, 1.22, 1.7], step: 0.005, paint: () => W },
      { name: 'spare', mat: 'rubber', sdf: spare, lo: [-0.5, 1.0, -2.15], hi: [0.5, 1.36, -1.15], step: 0.006, paint: () => hexLin('#1b1b1b'), ao: true },
      { name: 'mirrors', mat: 'black', sdf: mirrors, lo: [-1.1, 1.36, 0.44], hi: [1.1, 1.62, 0.56], step: 0.004, paint: () => hexLin('#1a1b1e') },
      { name: 'exhaust', mat: 'chrome', sdf: exhaust, lo: [0.64, 0.58, -2.42], hi: [0.8, 0.74, -2.18], step: 0.003, paint: () => W },
      { name: 'seats', mat: 'interior', sdf: seats, lo: [-0.75, 1.1, -0.55], hi: [0.75, 1.85, 0.6], step: 0.007, paint: p => hexLin(p[1] > 1.45 && p[2] > 0.3 ? '#16161a' : '#c83a2a'), ao: true },
    ],
  };
}
