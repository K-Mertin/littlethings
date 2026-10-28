// Volt EV, sculpted: a low electric hypercar. 4.6 m long, 2.0 m wide, 1.15 m tall.
// A smooth teardrop cabin set forward, deep air channels through the front fenders, a full-width light blade at
// each end, flush door handles, aero wheel covers are the rims' job; no exhaust, a big diffuser instead.
// x across, y up, z forward; wheels at z = 1.42 / -1.45, y = 0.35, x = ±0.86.
import { loft, smin, smax, box, ell, cone, hexLin, clamp, rpoly2 } from './shape.mjs';

const WZ = [1.42, -1.45], WCY = 0.35, ARCH = 0.41;

export function volt() {
  const body = loft({
    z0: -2.3, z1: 2.3, end: 0.12,
    hw: [[-2.3, 0.86], [-2.0, 0.97], [-1.45, 1.0], [-0.6, 0.95], [0.3, 0.93], [1.0, 0.97], [1.5, 0.98], [2.0, 0.9], [2.3, 0.74]],
    yb: [[-2.3, 0.3], [-2.0, 0.2], [-1.6, 0.14], [1.8, 0.14], [2.15, 0.16], [2.3, 0.2]],
    yt: [[-2.3, 0.72], [-2.0, 0.86], [-1.5, 0.9], [-0.9, 0.86], [-0.2, 0.8], [0.6, 0.76], [1.2, 0.7], [1.8, 0.6], [2.15, 0.5], [2.3, 0.42]],
    n: [[-2.3, 3], [-1.6, 4.5], [1.6, 4.5], [2.3, 3.2]], tb: 0.2,
  });
  const fenders = p => { const x = Math.abs(p[0]); return Math.min(ell([x, p[1], p[2]], [0.78, 0.6, 1.42], [0.24, 0.24, 0.66]), ell([x, p[1], p[2]], [0.8, 0.66, -1.45], [0.26, 0.3, 0.78])); };
  const green = loft({
    z0: -1.55, z1: 0.95, end: 0.35,
    hw: [[-1.55, 0.42], [-1.0, 0.6], [-0.3, 0.68], [0.4, 0.66], [0.95, 0.5]],
    yb: 0.6,
    yt: [[-1.55, 0.88], [-1.05, 1.0], [-0.5, 1.12], [0.0, 1.15], [0.4, 1.08], [0.75, 0.9], [0.95, 0.78]],
    n: 3.6, tb: 0.42,
  });
  const hull = p => smin(smin(body.sdf(p), fenders(p), 0.14), green.sdf(p), 0.07);
  // the glass is one wraparound canopy with a painted roof spine
  const glassCut = p => { const x = Math.abs(p[0]); return Math.max(0.8 - p[1], -1.32 - p[2], p[2] - 0.86, 0.06 - x * (p[1] > 1.08 ? 1 : 10)); };
  const cabin = p => box(p, [0, 0.62, -0.2], [0.7, 0.3, 0.75], 0.1);
  const channel = p => { const x = Math.abs(p[0]); return box([x, p[1], p[2] - (p[1] - 0.55) * 0.6], [0.62, 0.58, 1.62], [0.12, 0.07, 0.42], 0.06); };   // air path through the fender
  const blade = p => box(p, [0, 0.43, 2.2], [0.62, 0.02, 0.14], 0.014);
  const tailE = p => box(p, [0, 0.72, -2.22], [0.72, 0.022, 0.12], 0.014);
  const lowIntake = p => box(p, [0, 0.28, 2.22], [0.6, 0.06, 0.12], 0.04);
  const arches = p => { const x = Math.abs(p[0]); let d = 1; for (const zw of WZ) d = Math.min(d, Math.max(Math.hypot(p[1] - WCY, p[2] - zw) - ARCH, 0.5 - x)); return d; };
  const carve = p => Math.min(channel(p), blade(p), tailE(p), lowIntake(p), arches(p));
  const paintSdf = p => { let d = hull(p); d = smax(d, -carve(p), 0.012); d = smax(d, -glassCut(p) - 0.004, 0.004); return smax(d, -cabin(p), 0.02); };

  const lineAt = (v, w) => Math.exp(-(v * v) / (w * w));
  const panelLines = p => { const x = Math.abs(p[0]), y = p[1], z = p[2]; let L = 0;
    if (y > 0.2 && y < 0.8 && x > 0.6) L = Math.max(L, lineAt(z - 0.8 + (y - 0.5) * 0.1, 0.006), lineAt(z + 0.9 - (y - 0.5) * 0.2, 0.006));
    if (Math.abs(z + 0.05) < 0.07 && Math.abs(y - 0.66) < 0.012 && x > 0.8) L = 1;      // flush handle
    return L; };
  const split = (p, n) => {
    const depth = hull(p);
    if (channel(p) < 0.006 || lowIntake(p) < 0.006) return 'black';
    if (blade(p) < 0.004) return 'housing';
    if (tailE(p) < 0.004) return 'tailHousing';
    if (arches(p) < 0.01 && depth < -0.012) return 'liner';
    if (depth < -0.02 || (glassCut(p) < 0.01 && depth < -0.008)) return 'interior';
    if (p[1] < 0.2) return 'carbon';
    return 'paint';
  };
  const paintCol = (p, n) => { const s = split(p, n), k = 1 - 0.85 * panelLines(p); if (s === 'paint') return [k, k, k]; if (s === 'interior') return hexLin('#1c1c22'); if (s === 'liner') return hexLin('#101012'); if (s === 'housing') return hexLin('#22262e'); if (s === 'tailHousing') return hexLin('#200608'); return hexLin('#141518'); };
  const W = [1, 1, 1];
  const glassSdf = p => Math.max(Math.abs(hull(p) + 0.007) - 0.006, glassCut(p) + 0.003);
  const bladeLed = p => Math.max(Math.abs(hull(p) + 0.006) - 0.005, blade(p) + 0.006);
  const tailLed = p => Math.max(Math.abs(hull(p) + 0.006) - 0.005, tailE(p) + 0.006);
  const diffuser = p => { let d = box(p, [0, 0.2, -2.0], [0.72, 0.01, 0.22], 0.008); for (const fx of [-0.54, -0.27, 0, 0.27, 0.54]) d = Math.min(d, box(p, [fx, 0.25, -2.08], [0.005, 0.05, 0.16], 0.004)); return d; };
  const splitter = p => box(p, [0, 0.12, 2.15], [0.85, 0.009, 0.14], 0.007);
  const cams = p => { const x = Math.abs(p[0]); return smin(ell([x, p[1], p[2]], [0.86, 0.86, 0.72], [0.09, 0.035, 0.06]), cone([x, p[1], p[2]], [0.7, 0.82, 0.74], [0.82, 0.85, 0.73], 0.012, 0.01), 0.012); };   // camera mirrors
  const seats = p => { const x = Math.abs(p[0]); return Math.min(box([x, p[1], p[2]], [0.34, 0.38, -0.3], [0.2, 0.06, 0.24], 0.05), box([x, p[1] - 0.66, p[2] + 0.6 - (p[1] - 0.66) * 0.35], [0.34, 0, 0], [0.2, 0.28, 0.06], 0.06), box(p, [0, 0.82, 0.55], [0.66, 0.06, 0.12], 0.05)); };

  const deck = Array.from({ length: 48 }, (_, i) => { const z = -2.35 + i * 0.1; let lo = 0.3, hi = 1.5; if (hull([0, hi, z]) < 0 || hull([0, lo, z]) > 0) return [+z.toFixed(2), 0.5]; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (hull([0, m, z]) < 0) lo = m; else hi = m; } return [+z.toFixed(2), +lo.toFixed(4)]; });
  const step = 0.0078;
  return {
    name: 'volt',
    meta: { L: 4.6, R: 0.35, TW: 0.3, wheels: [[0.86, WCY, WZ[0]], [0.86, WCY, WZ[1]]], deck, door: [+(body.sideX(-0.2, 0.5)).toFixed(4), 0.5, -0.2], exh: [] },
    pieces: [
      { name: 'body', sdf: paintSdf, lo: [-1.12, 0.08, -2.36], hi: [1.12, 1.2, 2.36], step, split, paint: paintCol, ao: true },
      { name: 'glass', mat: 'glass', sdf: glassSdf, lo: [-0.75, 0.76, -1.36], hi: [0.75, 1.18, 0.92], step: 0.005, paint: () => W },
      { name: 'blade', mat: 'led', sdf: bladeLed, lo: [-0.7, 0.36, 2.0], hi: [0.7, 0.5, 2.36], step: 0.003, paint: () => W },
      { name: 'tail', mat: 'tailLed', sdf: tailLed, lo: [-0.8, 0.66, -2.38], hi: [0.8, 0.78, -2.0], step: 0.003, paint: () => W },
      { name: 'diffuser', mat: 'carbon', sdf: diffuser, lo: [-0.8, 0.14, -2.34], hi: [0.8, 0.36, -1.76], step: 0.005, paint: () => W },
      { name: 'splitter', mat: 'carbon', sdf: splitter, lo: [-0.9, 0.1, 1.98], hi: [0.9, 0.14, 2.32], step: 0.006, paint: () => W },
      { name: 'cams', sdf: cams, lo: [-0.98, 0.78, 0.64], hi: [0.98, 0.92, 0.8], step: 0.004, split: () => 'paint', paint: () => W },
      { name: 'cabin', mat: 'interior', sdf: seats, lo: [-0.62, 0.3, -0.85], hi: [0.62, 0.95, 0.7], step: 0.009, paint: p => hexLin(p[1] > 0.75 && p[2] > 0.4 ? '#18181b' : '#2a3a5a'), ao: true },
    ],
  };
}
