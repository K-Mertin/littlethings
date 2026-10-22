// Rally Hatch, sculpted: a boxy hot hatch built for gravel stages. 4.05 m long, 1.88 m wide over the
// flared arches, 1.44 m tall. Tall glasshouse running almost to the tail, flat roof, wraparound
// headlights, bonnet vents, box-flared arches, upright tail lights beside the hatch.
// x across, y up, z forward; wheels at z = 1.25 / -1.27, y = 0.33, x = ±0.8.
import { loft, smin, smax, box, ell, cone, hexLin, clamp, rpoly2 } from './shape.mjs';

const WF = 1.25, WRZ = -1.27, WCY = 0.33, ARCH = 0.395;

export function hatch() {
  const body = loft({
    z0: -2.0, z1: 2.0, end: 0.09,
    hw: [[-2.0, 0.82], [-1.85, 0.86], [-1.3, 0.87], [-0.4, 0.85], [0.5, 0.85], [1.3, 0.86], [1.75, 0.83], [2.0, 0.74]],
    yb: [[-2.0, 0.33], [-1.85, 0.25], [1.8, 0.25], [2.0, 0.33]],
    yt: [[-2.0, 0.95], [-1.9, 0.99], [-1.0, 0.985], [0.0, 0.96], [0.7, 0.93], [1.2, 0.88], [1.7, 0.8], [2.0, 0.66]],
    n: [[-2.0, 4.6], [0, 5.5], [2.0, 4]], tb: 0.08,
  });
  // box flares over all four wheels
  const flares = p => { const x = Math.abs(p[0]); let d = 1; for (const zw of [WF, WRZ]) d = Math.min(d, box([x, p[1], p[2]], [0.79, 0.55, zw], [0.15, 0.17, 0.5], 0.12)); return d; };
  const green = loft({
    z0: -1.94, z1: 0.86, end: 0.12,
    hw: [[-1.94, 0.72], [-1.6, 0.77], [-0.6, 0.79], [0.4, 0.78], [0.86, 0.7]],
    yb: 0.62,
    yt: [[-1.94, 1.36], [-1.75, 1.42], [-1.0, 1.44], [0.1, 1.44], [0.42, 1.36], [0.7, 1.12], [0.86, 0.92]],
    n: [[-1.94, 5], [-1.0, 7], [0.4, 7], [0.86, 5]], tb: 0.2,
  });
  const hull = p => smin(smin(body.sdf(p), flares(p), 0.06), green.sdf(p), 0.04);
  const roof = z => green.sec(z).yt;
  const sideCut = p => {
    const z = p[2], y = p[1];
    const front = rpoly2(z, y, [[-0.38, 0.97], [0.66, 0.95], [0.38, 1.34], [-0.38, 1.36]], 0.02);
    const rearW = rpoly2(z, y, [[-1.62, 0.98], [-0.48, 0.97], [-0.48, 1.36], [-1.45, 1.36]], 0.02);
    return Math.max(Math.min(front, rearW), y - (roof(z) - 0.07), 0.55 - Math.abs(p[0]));
  };
  const shield = p => { const z = p[2], x = Math.abs(p[0]); return Math.max(x - (0.6 + clamp((z - 0.42) / 0.4, 0, 1) * 0.08), 0.93 - p[1], 0.42 - z, z - 0.82); };
  const hatchW = p => { const z = p[2], x = Math.abs(p[0]); return Math.max(x - 0.58, 1.04 - p[1], p[1] - 1.38, -1.99 - z, z + 1.84); };
  const cut = p => Math.min(sideCut(p), shield(p), hatchW(p));
  const cabin = p => box(p, [0, 0.66, -0.5], [0.76, 0.36, 1.1], 0.1);
  const headE = p => { const x = Math.abs(p[0]); return box([x, p[1], p[2]], [0.57, 0.72, 1.98], [0.21, 0.065, 0.12], 0.035); };
  const grilleE = p => box(p, [0, 0.68, 2.0], [0.32, 0.06, 0.1], 0.03);
  const lowerE = p => box(p, [0, 0.4, 2.02], [0.55, 0.08, 0.12], 0.04);
  const tailE = p => { const x = Math.abs(p[0]); return box([x, p[1], p[2]], [0.72, 1.12, -1.98], [0.08, 0.17, 0.08], 0.025); };
  const bonnetVents = p => { const x = Math.abs(p[0]); return box([x, p[1] - 0.86, p[2]], [0.3, 0.02, 1.35], [0.12, 0.03, 0.14], 0.02); };
  const arches = p => { const x = Math.abs(p[0]); let d = 1; for (const zw of [WF, WRZ]) d = Math.min(d, Math.max(Math.hypot(p[1] - WCY, p[2] - zw) - ARCH, 0.5 - x)); return d; };
  const carve = p => Math.min(headE(p), grilleE(p), lowerE(p), tailE(p), bonnetVents(p), arches(p));
  const paintSdf = p => { let d = hull(p); d = smax(d, -carve(p), 0.01); d = smax(d, -cut(p), 0.006); return smax(d, -cabin(p), 0.02); };

  const lineAt = (v, w) => Math.exp(-(v * v) / (w * w));
  const panelLines = p => {
    const x = Math.abs(p[0]), y = p[1], z = p[2]; let L = 0;
    if (y > 0.3 && y < 0.95 && x > 0.6) L = Math.max(L, lineAt(z - 0.72, 0.006), lineAt(z + 0.43, 0.006), lineAt(z + 1.55, 0.006) * (y > 0.5 ? 1 : 0));
    if (y > 0.8 && z > 0.85) L = Math.max(L, lineAt(z - 0.88, 0.006) * (x < 0.75 ? 1 : 0), x < 0.82 ? lineAt(x - 0.74, 0.006) : 0);
    if (z < -1.9 && y > 0.6) L = Math.max(L, lineAt(y - 0.62, 0.006) * (x < 0.68 ? 1 : 0), lineAt(x - 0.66, 0.006) * (y > 0.62 ? 1 : 0));
    return L;
  };
  const split = (p, n) => {
    const depth = hull(p), x = Math.abs(p[0]);
    if (headE(p) < 0.004) return 'housing';
    if (grilleE(p) < 0.005 || lowerE(p) < 0.005 || bonnetVents(p) < 0.004) return 'black';
    if (tailE(p) < 0.005) return 'tailHousing';
    if (arches(p) < 0.01 && depth < -0.012) return 'liner';
    if (depth < -0.02 || (cut(p) < 0.015 && depth < -0.008)) return 'interior';
    if (cut(p) < 0.03 && p[1] > 0.9) return 'black';
    if (p[1] < 0.42 && (Math.abs(p[2]) > 1.8 || flares(p) < 0.01 || x > 0.84)) return 'black';     // unpainted bumpers, sills and flare edges
    if (p[1] > 1.42 && x < 0.62 && n[1] > 0.8) return 'roof';                                   // contrast roof
    return 'paint';
  };
  const paintCol = (p, n) => {
    const s = split(p, n), k = 1 - 0.85 * panelLines(p);
    if (s === 'paint' || s === 'roof') return [k, k, k];
    if (s === 'interior') return hexLin(p[1] > 1.2 ? '#4a4a4e' : '#1b1b1f');
    if (s === 'liner') return hexLin('#121214');
    if (s === 'housing') return hexLin('#3a3e46');
    if (s === 'tailHousing') return hexLin('#2a0a0d');
    return hexLin('#1c1d21');
  };
  const W = [1, 1, 1];
  const glassSdf = p => Math.max(Math.abs(hull(p) + 0.007) - 0.006, cut(p) + 0.006);
  const headLens = p => Math.max(Math.abs(hull(p) + 0.004) - 0.0045, headE(p) + 0.004);
  const headLamps = p => { const x = Math.abs(p[0]); let d = 1; for (const cx of [0.47, 0.66]) { const r = Math.hypot(x - cx, p[1] - 0.72); d = Math.min(d, Math.max(r - 0.045, Math.abs(p[2] - 1.89) - 0.025), Math.max(Math.abs(r - 0.055) - 0.005, Math.abs(p[2] - 1.87) - 0.01)); } return d; };
  const tailLens = p => Math.max(Math.abs(hull(p) + 0.004) - 0.0045, tailE(p) + 0.004);
  const grille = p => { let d = box(p, [0, 0.68, 1.95], [0.32, 0.06, 0.005], 0.004); for (let k = -5; k <= 5; k++) d = Math.min(d, box(p, [k * 0.055, 0.68, 1.99], [0.006, 0.06, 0.04], 0.003)); return Math.max(d, grilleE(p) - 0.002); };
  const lower = p => { let d = box(p, [0, 0.4, 1.96], [0.55, 0.08, 0.005], 0.004); const x = Math.abs(p[0]); for (const cx of [0.4]) d = Math.min(d, Math.max(Math.hypot(x - cx, p[1] - 0.4) - 0.05, Math.abs(p[2] - 2.0) - 0.03)); return Math.max(d, lowerE(p) - 0.002); };
  const spoiler = p => { const q = [p[0], p[1] - 1.44 + (p[2] + 1.9) * 0.18, p[2]]; return Math.min(box(q, [0, 0, -1.92], [0.7, 0.02, 0.13], 0.015), box([Math.abs(p[0]), q[1] + 0.04, p[2]], [0.69, 0, -1.92], [0.012, 0.06, 0.13], 0.01)); };
  const tip = p => { const r = Math.hypot(p[0] - 0.5, p[1] - 0.3); return Math.max(Math.abs(r - 0.045) - 0.007, Math.abs(p[2] + 2.02) - 0.08); };
  const mirrors = p => { const x = Math.abs(p[0]), q = [x, p[1], p[2]]; return smin(smax(ell([q[0], q[1], q[2]], [0.92, 1.03, 0.68], [0.09, 0.07, 0.07]), q[2] - 0.72, 0.02), cone(q, [0.8, 1.0, 0.72], [0.88, 1.02, 0.7], 0.018, 0.014), 0.015); };
  const mirrorGlass = p => Math.max(ell([Math.abs(p[0]), p[1], p[2]], [0.93, 1.03, 0.62], [0.075, 0.055, 0.01]), 0.615 - p[2]);
  const wipers = p => Math.min(cone(p, [-0.62, 0.95, 0.83], [0.0, 0.95, 0.85], 0.008, 0.008), cone(p, [0.06, 0.95, 0.84], [0.62, 0.95, 0.8], 0.008, 0.008), cone(p, [0, 1.06, -1.99], [0.4, 1.12, -1.99], 0.007, 0.007));
  const cage = p => {                                                     // roll cage: hoops behind the seats and over the doors
    const x = Math.abs(p[0]), q = [x, p[1], p[2]];
    let d = cone(q, [0.66, 0.7, -0.75], [0.62, 1.32, -0.75], 0.025, 0.025);
    d = Math.min(d, cone([p[0], p[1], p[2]], [-0.62, 1.32, -0.75], [0.62, 1.32, -0.75], 0.025, 0.025), cone(q, [0.62, 1.32, -0.75], [0.62, 1.3, 0.3], 0.022, 0.022), cone(q, [0.62, 1.3, 0.3], [0.68, 0.88, 0.55], 0.022, 0.022));
    d = Math.min(d, cone([p[0], p[1], p[2]], [-0.62, 1.3, -0.75], [0.62, 0.72, -0.75], 0.022, 0.022));
    return d;
  };
  const cabinParts = p => {
    let d = 1;
    for (const sx of [-1, 1]) { const q = [p[0] - sx * 0.36, p[1], p[2]]; d = Math.min(d, smin(box(q, [0, 0.4, -0.25], [0.21, 0.07, 0.24], 0.05), box([q[0], q[1] - 0.76, q[2] + 0.52 - (q[1] - 0.76) * 0.22], [0, 0, 0], [0.21, 0.33, 0.07], 0.06), 0.05), box([Math.abs(q[0]), q[1] - 0.74, q[2] + 0.5 - (q[1] - 0.74) * 0.22], [0.19, 0, 0], [0.04, 0.3, 0.1], 0.035)); }
    d = Math.min(d, box(p, [0, 0.88, 0.62], [0.74, 0.07, 0.15], 0.05), box(p, [0, 0.45, 0.1], [0.11, 0.13, 0.42], 0.04));
    const sw = [p[0] - 0.36, p[1] - 0.92, p[2] - 0.4], c = Math.cos(1.0), s = Math.sin(1.0), r = [sw[0], sw[1] * c - sw[2] * s, sw[1] * s + sw[2] * c];
    return Math.min(d, Math.hypot(Math.hypot(r[0], r[2]) - 0.17, r[1]) - 0.016, box(r, [0, 0, 0], [0.13, 0.012, 0.028], 0.006));
  };
  const cabinCol = p => hexLin(Math.abs(Math.abs(p[0]) - 0.36) < 0.07 && p[1] > 0.35 && p[2] < 0 ? '#2a5cc8' : '#202024');     // blue bucket seats

  const deck = Array.from({ length: 42 }, (_, i) => { const z = -2.05 + i * 0.1; let lo = 0.45, hi = 1.8; if (hull([0, hi, z]) < 0 || hull([0, lo, z]) > 0) return [+z.toFixed(2), 0.6]; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (hull([0, m, z]) < 0) lo = m; else hi = m; } return [+z.toFixed(2), +lo.toFixed(4)]; });
  const step = 0.0072;
  return {
    name: 'hatch',
    meta: { L: 4.05, R: 0.33, TW: 0.25, wheels: [[0.8, WCY, WF], [0.8, WCY, WRZ]], deck, door: [+(body.sideX(0.15, 0.55) + 0.01).toFixed(4), 0.55, 0.15], exh: [[0.5, 0.3, -2.06]], wing: 'roof' },
    pieces: [
      { name: 'body', sdf: paintSdf, lo: [-1.0, 0.18, -2.08], hi: [1.0, 1.5, 2.08], step, split, paint: paintCol, ao: true },
      { name: 'glass', mat: 'glass', sdf: glassSdf, lo: [-0.82, 0.9, -2.02], hi: [0.82, 1.46, 0.9], step: 0.005, paint: () => W },
      { name: 'headLens', mat: 'lens', sdf: headLens, lo: [-0.82, 0.64, 1.86], hi: [0.82, 0.8, 2.1], step: 0.0035, paint: () => W },
      { name: 'headLamps', mat: 'chrome', sdf: headLamps, lo: [-0.75, 0.64, 1.84], hi: [0.75, 0.8, 1.94], step: 0.003, paint: () => W },
      { name: 'tailLens', mat: 'tailLens', sdf: tailLens, lo: [-0.84, 0.92, -2.08], hi: [0.84, 1.32, -1.88], step: 0.0035, paint: () => W },
      { name: 'grille', mat: 'black', sdf: grille, lo: [-0.36, 0.6, 1.92], hi: [0.36, 0.76, 2.06], step: 0.003, paint: p => hexLin(p[2] > 1.97 ? '#2a2c31' : '#0c0d0f') },
      { name: 'lower', mat: 'black', sdf: lower, lo: [-0.6, 0.3, 1.92], hi: [0.6, 0.5, 2.08], step: 0.0035, paint: p => hexLin(Math.hypot(Math.abs(p[0]) - 0.4, p[1] - 0.4) < 0.05 ? '#e8e8e0' : '#0c0d0f') },
      { name: 'spoiler', sdf: spoiler, lo: [-0.74, 1.38, -2.06], hi: [0.74, 1.49, -1.74], step: 0.004, split: () => 'paint', paint: () => W },
      { name: 'tip', mat: 'chrome', sdf: tip, lo: [0.43, 0.23, -2.12], hi: [0.57, 0.37, -1.92], step: 0.003, paint: () => W },
      { name: 'mirrors', sdf: mirrors, lo: [-1.04, 0.94, 0.6], hi: [1.04, 1.12, 0.76], step: 0.005, split: () => 'paint', paint: () => W },
      { name: 'mirrorGlass', mat: 'chrome', sdf: mirrorGlass, lo: [-1.02, 0.97, 0.6], hi: [1.02, 1.09, 0.63], step: 0.003, paint: () => W },
      { name: 'wipers', mat: 'black', sdf: wipers, lo: [-0.66, 0.92, -2.02], hi: [0.66, 1.15, 0.9], step: 0.005, paint: () => hexLin('#111111') },
      { name: 'cage', mat: 'chrome', sdf: cage, lo: [-0.72, 0.66, -0.8], hi: [0.72, 1.36, 0.6], step: 0.005, paint: () => W },
      { name: 'cabin', mat: 'interior', sdf: cabinParts, lo: [-0.75, 0.3, -1.0], hi: [0.75, 1.15, 0.8], step: 0.008, paint: cabinCol, ao: true },
    ],
  };
}
