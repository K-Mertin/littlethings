// Muscle, sculpted: a 1960s-style American fastback. 4.8 m long, 1.95 m wide, 1.26 m tall.
// Long flat bonnet with a scoop, quad round headlights in a full-width grille, chrome bumpers,
// coke-bottle hips over the rear wheels, twin racing stripes, three-segment tail lights.
// x across, y up, z forward; wheel centres z = 1.45 / -1.5, y = 0.355, x = ±0.86.
import { loft, smin, smax, box, ell, sph, cone, hexLin, clamp, rpoly2 } from './shape.mjs';

const WF = 1.45, WRZ = -1.5, WCY = 0.355, ARCH = 0.415;

export function muscle() {
  const body = loft({
    z0: -2.38, z1: 2.38, end: 0.07,
    hw: [[-2.38, 0.9], [-2.25, 0.95], [-1.9, 0.975], [-1.5, 0.985], [-0.9, 0.955], [-0.2, 0.945], [0.6, 0.95], [1.3, 0.96], [1.9, 0.955], [2.25, 0.93], [2.38, 0.88]],
    yb: [[-2.38, 0.36], [-2.25, 0.27], [-2.0, 0.21], [1.95, 0.21], [2.25, 0.27], [2.38, 0.34]],
    yt: [[-2.38, 0.86], [-2.28, 0.92], [-2.0, 0.93], [-1.6, 0.92], [-1.1, 0.915], [-0.4, 0.9], [0.4, 0.89], [1.2, 0.875], [1.9, 0.86], [2.25, 0.83], [2.38, 0.77]],
    n: [[-2.38, 5], [-1.8, 6.5], [1.8, 6.5], [2.38, 5.5]], tb: 0.06,
  });
  // hips: the body swells over the rear wheels (coke bottle) and a crisp crease runs along the side
  const hips = p => { const x = Math.abs(p[0]); return ell([x, p[1], p[2]], [0.78, 0.66, -1.5], [0.24, 0.26, 0.85]); };
  const green = loft({
    z0: -1.3, z1: 0.55, end: 0.22,
    hw: [[-1.3, 0.62], [-0.9, 0.72], [-0.2, 0.75], [0.3, 0.74], [0.55, 0.7]],
    yb: 0.6,
    yt: [[-1.3, 0.92], [-0.95, 1.05], [-0.55, 1.18], [-0.2, 1.245], [0.12, 1.255], [0.32, 1.17], [0.48, 1.0], [0.55, 0.9]],
    n: [[-1.3, 5], [-0.6, 7], [0.2, 7], [0.55, 5]], tb: 0.26,
  });
  const scoop = p => smax(box([p[0], p[1] - 0.86, p[2] - 1.0], [0, 0, 0], [0.24, 0.06, 0.42], 0.05), -(p[2] - 0.56), 0.04);
  const hull = p => smin(smin(smin(body.sdf(p), hips(p), 0.1), green.sdf(p), 0.04), scoop(p), 0.04);

  // openings
  const roof = z => green.sec(z).yt;
  const sideCut = p => Math.max(rpoly2(p[2], p[1], [[-0.98, 0.95], [0.42, 0.93], [0.08, 1.22], [-0.42, 1.22]], 0.02), p[1] - (roof(p[2]) - 0.06), 0.52 - Math.abs(p[0]));
  const shield = p => { const z = p[2], x = Math.abs(p[0]); return Math.max(x - (0.52 + clamp((z - 0.14) / 0.4, 0, 1) * 0.12), 0.915 - p[1], 0.14 - z, z - 0.56); };
  const rear = p => { const z = p[2], x = Math.abs(p[0]); return Math.max(x - 0.5, 0.94 - p[1], -1.25 - z, z + 0.62); };
  const cut = p => Math.min(sideCut(p), shield(p), rear(p));
  const cabin = p => box(p, [0, 0.6, -0.3], [0.8, 0.32, 0.72], 0.1);
  const grilleE = p => box(p, [0, 0.62, 2.36], [0.86, 0.1, 0.12], 0.03);
  const scoopMouth = p => box(p, [0, 0.9, 1.43], [0.2, 0.025, 0.08], 0.02);
  const tailE = p => box(p, [0, 0.66, -2.37], [0.84, 0.065, 0.1], 0.02);
  const arches = p => { const x = Math.abs(p[0]); let d = 1; for (const zw of [WF, WRZ]) d = Math.min(d, Math.max(Math.hypot(p[1] - WCY, p[2] - zw) - ARCH, 0.5 - x)); return d; };
  const sideVent = p => box([Math.abs(p[0]), p[1], p[2]], [0.98, 0.55, -0.98], [0.08, 0.06, 0.12], 0.02);
  const carve = p => Math.min(grilleE(p), scoopMouth(p), tailE(p), arches(p), sideVent(p));
  const paintSdf = p => { let d = hull(p); d = smax(d, -carve(p), 0.012); d = smax(d, -cut(p), 0.006); return smax(d, -cabin(p), 0.02); };

  const lineAt = (v, w) => Math.exp(-(v * v) / (w * w));
  const panelLines = p => {
    const x = Math.abs(p[0]), y = p[1], z = p[2]; let L = 0;
    if (y > 0.24 && y < 0.92 && x > 0.6) { L = Math.max(L, lineAt(z - 0.5, 0.006), lineAt(z + 0.82, 0.006)); }
    if (y > 0.84 && z > 0.6) L = Math.max(L, lineAt(z - 0.62, 0.006) * (x < 0.8 ? 1 : 0), x < 0.85 ? lineAt(x - 0.8, 0.006) * (z > 0.6 ? 1 : 0) : 0);
    if (y > 0.86 && z < -1.3) L = Math.max(L, lineAt(z + 1.32, 0.006) * (x < 0.8 ? 1 : 0));
    if (x > 0.85 && Math.abs(y - 0.74) < 0.012) L = Math.max(L, 0.45);                      // shoulder crease
    return L;
  };
  const stripe = (p, n) => { const x = Math.abs(p[0]); return n[1] > 0.35 && x > 0.08 && x < 0.27 && p[2] > -2.37 && cut(p) > 0.02; };
  const split = (p, n) => {
    const depth = hull(p);
    if (grilleE(p) < 0.005 || scoopMouth(p) < 0.005 || sideVent(p) < 0.004) return 'black';
    if (tailE(p) < 0.006) return 'tailHousing';
    if (arches(p) < 0.01 && depth < -0.012) return 'liner';
    if (depth < -0.02 || (cut(p) < 0.015 && depth < -0.008)) return 'interior';
    if (cut(p) < 0.025 && p[1] > 0.88) return 'chromeTrim';                                // bright window surrounds
    if (p[1] < 0.24) return 'black';
    if (stripe(p, n)) return 'stripe';
    return 'paint';
  };
  const paintCol = (p, n) => {
    const s = split(p, n), k = 1 - 0.85 * panelLines(p);
    if (s === 'paint' || s === 'stripe') return [k, k, k];
    if (s === 'interior') return hexLin(p[1] > 1.1 ? '#2e2a26' : '#1a1816');
    if (s === 'liner') return hexLin('#121214');
    if (s === 'tailHousing') return hexLin('#141416');
    if (s === 'chromeTrim') return [1, 1, 1];
    return hexLin('#141518');
  };
  const W = [1, 1, 1];
  const glassSdf = p => Math.max(Math.abs(hull(p) + 0.007) - 0.006, cut(p) + 0.006);
  // quad round headlights with chrome bezels, set in the grille
  const heads = p => { const x = Math.abs(p[0]); let d = 1; for (const cx of [0.56, 0.74]) { const r = Math.hypot(x - cx, p[1] - 0.63); d = Math.min(d, Math.max(r - 0.075, Math.abs(p[2] - 2.32) - 0.03)); } return d; };
  const bezels = p => { const x = Math.abs(p[0]); let d = 1; for (const cx of [0.56, 0.74]) { const r = Math.hypot(x - cx, p[1] - 0.63); d = Math.min(d, Math.max(Math.abs(r - 0.085) - 0.012, Math.abs(p[2] - 2.34) - 0.02)); } return d; };
  const grilleBars = p => { let d = box(p, [0, 0.62, 2.28], [0.84, 0.09, 0.006], 0.004); for (let k = -6; k <= 6; k++) d = Math.min(d, box(p, [k * 0.035, 0.62, 2.33], [0.004, 0.09, 0.04], 0.002)); return Math.max(d, -(Math.min(...[0.56, 0.74].map(cx => Math.hypot(Math.abs(p[0]) - cx, p[1] - 0.63) - 0.09)))); };
  const tailLens = p => { const x = Math.abs(p[0]); let d = 1; for (const cx of [0.18, 0.44, 0.7]) d = Math.min(d, box([x, p[1], p[2]], [cx, 0.665, -2.43], [0.11, 0.045, 0.012], 0.012)); return d; };
  const tips = p => { let d = 1; for (const sx of [-1, 1]) { const r = Math.hypot(p[0] - sx * 0.62, p[1] - 0.3); d = Math.min(d, Math.max(Math.abs(r - 0.05) - 0.008, Math.abs(p[2] + 2.42) - 0.09)); } return d; };
  const mirrors = p => { const x = Math.abs(p[0]), q = [x, p[1], p[2]]; return smin(ell(q, [1.0, 0.99, 0.5], [0.075, 0.05, 0.06]), cone(q, [0.9, 0.94, 0.5], [0.98, 0.98, 0.5], 0.016, 0.012), 0.015); };
  const mirrorGlass = p => Math.max(ell([Math.abs(p[0]), p[1], p[2]], [1.0, 0.99, 0.448], [0.065, 0.04, 0.01]), 0.442 - p[2]);
  const wipers = p => Math.min(cone(p, [-0.6, 0.91, 0.62], [0.0, 0.91, 0.64], 0.008, 0.008), cone(p, [0.06, 0.91, 0.63], [0.6, 0.91, 0.6], 0.008, 0.008));
  const cabinParts = p => {
    let d = 1;
    for (const sx of [-1, 1]) { const q = [p[0] - sx * 0.38, p[1], p[2]]; d = Math.min(d, smin(box(q, [0, 0.36, -0.3], [0.22, 0.06, 0.25], 0.05), box([q[0], q[1] - 0.66, q[2] + 0.62 - (q[1] - 0.66) * 0.25], [0, 0, 0], [0.22, 0.28, 0.06], 0.06), 0.05)); }
    d = Math.min(d, box(p, [0, 0.83, 0.38], [0.76, 0.07, 0.14], 0.05), box(p, [0, 0.42, -0.05], [0.12, 0.13, 0.42], 0.04));
    const sw = [p[0] - 0.38, p[1] - 0.86, p[2] - 0.2], c = Math.cos(1.1), s = Math.sin(1.1), r = [sw[0], sw[1] * c - sw[2] * s, sw[1] * s + sw[2] * c];
    return Math.min(d, Math.hypot(Math.hypot(r[0], r[2]) - 0.19, r[1]) - 0.014, box(r, [0, 0, 0], [0.15, 0.01, 0.025], 0.006));
  };
  const cabinCol = p => hexLin(p[1] > 0.75 && p[2] > 0.25 ? '#1a1816' : Math.abs(Math.abs(p[0]) - 0.38) < 0.07 && p[1] > 0.3 ? '#5a3a24' : '#2a2622');

  // body pieces placed in the game
  const deck = Array.from({ length: 50 }, (_, i) => { const z = -2.45 + i * 0.1; let lo = 0.45, hi = 1.6; if (hull([0, hi, z]) < 0 || hull([0, lo, z]) > 0) return [+z.toFixed(2), 0.5]; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (hull([0, m, z]) < 0) lo = m; else hi = m; } return [+z.toFixed(2), +lo.toFixed(4)]; });
  const step = 0.0078;
  return {
    name: 'muscle',
    meta: { L: 4.8, R: 0.355, TW: 0.31, wheels: [[0.86, WCY, WF], [0.86, WCY, WRZ]], deck, door: [+body.sideX(-0.2, 0.55).toFixed(4), 0.55, -0.2], exh: [[-0.62, 0.3, -2.46], [0.62, 0.3, -2.46]] },
    pieces: [
      { name: 'body', sdf: paintSdf, lo: [-1.06, 0.14, -2.46], hi: [1.06, 1.3, 2.46], step, split, paint: paintCol, ao: true },
      { name: 'glass', mat: 'glass', sdf: glassSdf, lo: [-0.82, 0.88, -1.3], hi: [0.82, 1.28, 0.6], step: 0.005, paint: () => W },
      { name: 'heads', mat: 'lens', sdf: heads, lo: [-0.86, 0.52, 2.25], hi: [0.86, 0.74, 2.38], step: 0.0035, paint: () => W },
      { name: 'reflectors', mat: 'chrome', sdf: p => { const x = Math.abs(p[0]); let d = 1; for (const cx of [0.56, 0.74]) d = Math.min(d, Math.max(Math.hypot(x - cx, p[1] - 0.63) - 0.07, Math.abs(p[2] - 2.27) - 0.012)); return d; }, lo: [-0.86, 0.54, 2.24], hi: [0.86, 0.72, 2.3], step: 0.0035, paint: () => W },
      { name: 'bezels', mat: 'chrome', sdf: bezels, lo: [-0.86, 0.52, 2.3], hi: [0.86, 0.74, 2.38], step: 0.003, paint: () => W },
      { name: 'grille', mat: 'black', sdf: grilleBars, lo: [-0.88, 0.5, 2.24], hi: [0.88, 0.74, 2.4], step: 0.0035, paint: p => hexLin(p[2] > 2.31 ? '#3a3c40' : '#0c0d0f') },
      { name: 'bumpers', mat: 'chrome', sdf: p => {          // blade bumpers that wrap round the corners
        const x = Math.abs(p[0]), blade = (y0, z0, sz) => { const bend = Math.max(0, x - 0.62) ** 2 * 0.9 * sz; return box([x, p[1] - y0, p[2] - z0 + bend], [0, 0, 0], [0.9, 0.032, 0.04], 0.028); };
        return Math.min(blade(0.42, 2.4, 1), blade(0.44, -2.41, -1)); }, lo: [-1.04, 0.34, -2.5], hi: [1.04, 0.52, 2.5], step: 0.005, paint: () => W },
      { name: 'tailLens', mat: 'tailLens', sdf: tailLens, lo: [-0.84, 0.6, -2.46], hi: [0.84, 0.73, -2.4], step: 0.003, paint: () => W },
      { name: 'tips', mat: 'chrome', sdf: tips, lo: [-0.7, 0.22, -2.53], hi: [0.7, 0.38, -2.3], step: 0.003, paint: () => W },
      { name: 'mirrors', mat: 'chrome', sdf: mirrors, lo: [-1.1, 0.9, 0.42], hi: [1.1, 1.05, 0.58], step: 0.005, paint: () => W },
      { name: 'mirrorGlass', mat: 'chrome', sdf: mirrorGlass, lo: [-1.08, 0.94, 0.43], hi: [1.08, 1.04, 0.46], step: 0.003, paint: () => W },
      { name: 'wipers', mat: 'black', sdf: wipers, lo: [-0.64, 0.89, 0.55], hi: [0.64, 0.93, 0.68], step: 0.004, paint: () => hexLin('#111111') },
      { name: 'cabin', mat: 'interior', sdf: cabinParts, lo: [-0.75, 0.24, -1.0], hi: [0.75, 1.05, 0.56], step: 0.008, paint: cabinCol, ao: true },
    ],
  };
}
