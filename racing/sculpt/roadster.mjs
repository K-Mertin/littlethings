// Roadster, sculpted: a 1950s British open two-seater. 4.15 m long, 1.66 m wide, 1.1 m to the
// screen top. Long bonnet with a power bulge, round headlamps faired into the wings, oval grille,
// a low chrome-framed windscreen, two leather seats with headrests, a driver in an open helmet and
// goggles, wire wheels, chrome bumper overriders and round tail lamps on the rear wings.
// x across, y up, z forward; wheels at z = ±1.3, y = 0.335, x = ±0.78.
import { loft, smin, smax, box, ell, sph, cone, hexLin, clamp } from './shape.mjs';

const WZ = [1.3, -1.3], WCY = 0.335, ARCH = 0.385;

export function roadster() {
  const body = loft({
    z0: -2.06, z1: 2.06, end: 0.18,
    hw: [[-2.06, 0.6], [-1.8, 0.72], [-1.3, 0.78], [-0.6, 0.73], [0.4, 0.72], [1.0, 0.75], [1.5, 0.74], [1.9, 0.62], [2.06, 0.46]],
    yb: [[-2.06, 0.4], [-1.85, 0.28], [1.85, 0.28], [2.06, 0.4]],
    yt: [[-2.06, 0.7], [-1.85, 0.8], [-1.4, 0.84], [-0.7, 0.82], [0.2, 0.82], [1.0, 0.8], [1.6, 0.74], [1.95, 0.64], [2.06, 0.56]],
    n: [[-2.06, 2.8], [0, 3.2], [2.06, 2.6]], tb: 0.08,
  });
  // separate flowing wings over each wheel, like a 1950s sports car
  const wings = p => { const x = Math.abs(p[0]); let d = 1; for (const zw of WZ) d = Math.min(d, ell([x, p[1], p[2]], [0.62, 0.6, zw + (zw > 0 ? 0.08 : -0.05)], [0.22, 0.28, 0.78])); return d; };
  const bulge = p => ell(p, [0, 0.8, 1.0], [0.26, 0.08, 0.8]);
  const hull = p => smin(smin(body.sdf(p), wings(p), 0.16), bulge(p), 0.1);
  // the open cockpit with a rolled padded rim
  const tubShape = p => box(p, [0, 0.82, -0.28], [0.58, 0.4, 0.62], 0.22);
  const arches = p => { const x = Math.abs(p[0]); let d = 1; for (const zw of WZ) d = Math.min(d, Math.max(Math.hypot(p[1] - WCY, p[2] - zw) - ARCH, 0.48 - x)); return d; };
  const grilleE = p => ell(p, [0, 0.5, 2.06], [0.26, 0.13, 0.12]);
  const headE = p => { const x = Math.abs(p[0]); return sph([x, p[1], p[2]], [0.56, 0.68, 1.98], 0.1); };
  const tailE = p => { const x = Math.abs(p[0]); return sph([x, p[1], p[2]], [0.58, 0.66, -2.0], 0.05); };
  const louvres = p => { const x = Math.abs(p[0]); if (x < 0.3 || x > 0.5 || p[2] < 0.5 || p[2] > 1.3) return 1; const k = Math.round((p[2] - 0.55) / 0.07); return box([x, p[1], p[2]], [0.4, 0.82, 0.55 + k * 0.07], [0.08, 0.04, 0.006], 0.004); };
  const carve = p => Math.min(arches(p), grilleE(p), headE(p), tailE(p), louvres(p));
  const paintSdf = p => { let d = hull(p); d = smax(d, -carve(p), 0.012); return smax(d, -tubShape(p), 0.05); };

  const lineAt = (v, w) => Math.exp(-(v * v) / (w * w));
  const panelLines = p => { const x = Math.abs(p[0]), y = p[1], z = p[2]; let L = 0;
    if (x > 0.6 && y > 0.32 && y < 0.8) L = Math.max(L, lineAt(z - 0.32, 0.006), lineAt(z + 0.5, 0.006));
    if (y > 0.72 && z > 0.38) L = Math.max(L, lineAt(z - 0.4, 0.006) * (x < 0.55 ? 1 : 0));
    if (y > 0.72 && z < -1.05) L = Math.max(L, lineAt(z + 1.08, 0.006) * (x < 0.5 ? 1 : 0));
    return L; };
  const split = (p, n) => {
    const depth = hull(p);
    if (grilleE(p) < 0.006 || louvres(p) < 0.003) return 'black';
    if (headE(p) < 0.004 || tailE(p) < 0.004) return 'housing';
    if (arches(p) < 0.01 && depth < -0.012) return 'liner';
    if (tubShape(p) < 0.05 && p[1] > 0.7 && depth > -0.04 && n[1] > -0.2 && Math.abs(depth) < 0.03 && tubShape(p) > 0.0) return 'leather';      // padded cockpit rim
    if (depth < -0.02) return 'leatherDark';
    if (p[1] < 0.3) return 'black';
    return 'paint';
  };
  const paintCol = (p, n) => { const s = split(p, n), k = 1 - 0.85 * panelLines(p);
    if (s === 'paint') return [k, k, k];
    if (s === 'leather') return hexLin('#6a3a20');
    if (s === 'leatherDark') return hexLin('#3a2416');
    if (s === 'liner') return hexLin('#121214'); if (s === 'housing') return hexLin('#d0d4da'); return hexLin('#141518'); };
  const W = [1, 1, 1];
  const headLens = p => { const x = Math.abs(p[0]); return Math.max(sph([x, p[1], p[2]], [0.56, 0.68, 1.95], 0.09), -(p[2] - 1.98)); };
  const bezels = p => { const x = Math.abs(p[0]); const r = Math.hypot(x - 0.56, p[1] - 0.68); return Math.max(Math.abs(r - 0.098) - 0.012, Math.abs(p[2] - 2.0) - 0.025); };
  const grilleBars = p => { if (grilleE(p) > 0.01) return 1; let d = 1; for (let k = -6; k <= 6; k++) d = Math.min(d, box(p, [k * 0.038, 0.5, 2.04], [0.004, 0.13, 0.03], 0.002)); return Math.min(Math.max(d, grilleE(p) - 0.003), Math.max(Math.abs(grilleE(p)) - 0.008, -(p[2] - 2.03))); };
  const tailLens = p => { const x = Math.abs(p[0]); return Math.max(sph([x, p[1], p[2]], [0.58, 0.66, -1.97], 0.046), p[2] + 1.99); };
  const bumpers = p => { const x = Math.abs(p[0]); const bend = z0 => box([x, p[1] - 0.4, p[2] - z0 + Math.sign(z0) * Math.max(0, x - 0.3) ** 2 * 0.7], [0, 0, 0], [0.62, 0.022, 0.03], 0.02);
    const over = z0 => box([x, p[1] - 0.44, p[2] - z0], [0.32, 0, 0], [0.02, 0.09, 0.03], 0.018);
    return Math.min(bend(2.1), bend(-2.1), over(2.12), over(-2.12)); };
  const screen = p => { const q = [p[0], p[1] - 0.86, p[2] - 0.32 + (p[1] - 0.86) * 0.45]; return box(q, [0, 0.12, 0], [0.56, 0.12, 0.005], 0.004); };
  const screenFrame = p => { const q = [p[0], p[1] - 0.86, p[2] - 0.32 + (p[1] - 0.86) * 0.45]; const outer = box(q, [0, 0.12, 0], [0.58, 0.135, 0.012], 0.01), inner = box(q, [0, 0.12, 0], [0.555, 0.115, 0.03], 0.006); return smax(outer, -inner, 0.002); };
  const seats = p => { let d = 1; for (const sx of [-1, 1]) { const q = [p[0] - sx * 0.3, p[1], p[2]];
    d = Math.min(d, smin(box(q, [0, 0.42, -0.2], [0.2, 0.08, 0.23], 0.07), box([q[0], q[1] - 0.72, q[2] + 0.48 - (q[1] - 0.72) * 0.2], [0, 0, 0], [0.2, 0.24, 0.07], 0.08), 0.06), ell(q, [0, 1.02, -0.62], [0.13, 0.12, 0.06])); }
    return d; };
  const dash = p => Math.min(box(p, [0, 0.78, 0.24], [0.58, 0.07, 0.06], 0.04), (() => { const sw = [p[0] - 0.3, p[1] - 0.86, p[2] - 0.1], c = Math.cos(1.2), s = Math.sin(1.2), r = [sw[0], sw[1] * c - sw[2] * s, sw[1] * s + sw[2] * c]; return Math.min(Math.hypot(Math.hypot(r[0], r[2]) - 0.2, r[1]) - 0.012, box(r, [0, 0, 0], [0.17, 0.006, 0.012], 0.004)); })());
  const driver = p => { const q = [p[0] - 0.3, p[1], p[2]];
    const head = sph(q, [0, 1.12, -0.12], 0.115), torso = ell(q, [0, 0.82, -0.2], [0.19, 0.22, 0.13]);
    const arms = Math.min(cone([Math.abs(q[0]), q[1], q[2]], [0.15, 0.92, -0.14], [0.13, 0.88, 0.08], 0.045, 0.038));
    return smin(smin(head, torso, 0.06), arms, 0.04); };
  const driverCol = p => { const q = [p[0] - 0.3, p[1], p[2]]; if (q[1] > 1.03) { if (q[2] > -0.03 && Math.abs(q[1] - 1.13) < 0.03) return hexLin('#8fb0c8'); return hexLin(q[1] > 1.15 || q[2] < -0.12 ? '#f0ece2' : '#e8b896'); } return hexLin('#2b4a7a'); };
  const tips = p => { const r = Math.hypot(Math.abs(p[0]) - 0.0 - (p[0] > 0 ? 0.42 : 99), p[1] - 0.3); return Math.max(Math.abs(r - 0.035) - 0.006, Math.abs(p[2] + 2.08) - 0.08); };
  const mirror = p => smin(ell(p, [-0.0, 1.16, 0.28], [0.08, 0.035, 0.02]), cone(p, [0, 1.1, 0.29], [0, 1.15, 0.285], 0.008, 0.008), 0.01);

  const deck = Array.from({ length: 44 }, (_, i) => { const z = -2.15 + i * 0.1; let lo = 0.4, hi = 1.4; if (hull([0, hi, z]) < 0 || hull([0, lo, z]) > 0) return [+z.toFixed(2), 0.6]; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (hull([0, m, z]) < 0) lo = m; else hi = m; } return [+z.toFixed(2), +lo.toFixed(4)]; });
  const step = 0.0072;
  return {
    name: 'roadster',
    meta: { L: 4.15, R: 0.335, TW: 0.22, wheels: [[0.78, WCY, 1.3], [0.78, WCY, -1.3]], deck, door: [+(body.sideX(0.0, 0.55) + 0.005).toFixed(4), 0.55, 0.0], exh: [[0.42, 0.3, -2.12]] },
    pieces: [
      { name: 'body', sdf: paintSdf, lo: [-0.92, 0.18, -2.16], hi: [0.92, 1.0, 2.16], step, split, paint: paintCol, ao: true },
      { name: 'headLens', mat: 'lens', sdf: headLens, lo: [-0.68, 0.56, 1.95], hi: [0.68, 0.8, 2.08], step: 0.0035, paint: () => W },
      { name: 'reflectors', mat: 'chrome', sdf: p => sph([Math.abs(p[0]), p[1], p[2]], [0.56, 0.68, 1.92], 0.088), lo: [-0.66, 0.58, 1.9], hi: [0.66, 0.78, 2.02], step: 0.0035, paint: () => W },
      { name: 'bezels', mat: 'chrome', sdf: bezels, lo: [-0.69, 0.55, 1.96], hi: [0.69, 0.81, 2.04], step: 0.003, paint: () => W },
      { name: 'grille', mat: 'chrome', sdf: grilleBars, lo: [-0.3, 0.35, 1.96], hi: [0.3, 0.65, 2.12], step: 0.003, paint: () => W },
      { name: 'tailLens', mat: 'tailLens', sdf: tailLens, lo: [-0.65, 0.6, -2.06], hi: [0.65, 0.72, -1.94], step: 0.003, paint: () => W },
      { name: 'bumpers', mat: 'chrome', sdf: bumpers, lo: [-0.72, 0.32, -2.2], hi: [0.72, 0.56, 2.2], step: 0.004, paint: () => W },
      { name: 'screen', mat: 'glass', sdf: screen, lo: [-0.6, 0.84, 0.18], hi: [0.6, 1.14, 0.36], step: 0.004, paint: () => W },
      { name: 'screenFrame', mat: 'chrome', sdf: screenFrame, lo: [-0.62, 0.82, 0.17], hi: [0.62, 1.16, 0.37], step: 0.0035, paint: () => W },
      { name: 'mirror', mat: 'chrome', sdf: mirror, lo: [-0.1, 1.08, 0.24], hi: [0.1, 1.21, 0.32], step: 0.003, paint: () => W },
      { name: 'tips', mat: 'chrome', sdf: tips, lo: [0.35, 0.24, -2.18], hi: [0.49, 0.36, -1.98], step: 0.003, paint: () => W },
      { name: 'seats', mat: 'interior', sdf: seats, lo: [-0.55, 0.3, -0.72], hi: [0.55, 1.16, 0.05], step: 0.006, paint: p => hexLin('#7a4426'), ao: true },
      { name: 'dash', mat: 'interior', sdf: dash, lo: [-0.66, 0.68, -0.02], hi: [0.66, 1.08, 0.32], step: 0.005, paint: p => hexLin(p[1] > 0.84 ? '#2a2a2a' : '#5a3a22'), ao: true },
      { name: 'driver', mat: 'interior', sdf: driver, lo: [0.05, 0.56, -0.38], hi: [0.55, 1.26, 0.14], step: 0.006, paint: driverCol, ao: true },
    ],
  };
}
