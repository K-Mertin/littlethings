// Prototype, sculpted: a closed Le Mans prototype. 4.8 m long, 1.98 m wide, 1.12 m tall.
// Low central tub, tall fender pods over all four wheels, a narrow bubble canopy with a driver,
// shark fin on the engine cover, side-pod intakes, roof scoop, slit headlights in the fender tops,
// a full-width LED tail bar and a deep diffuser. x across, y up, z forward;
// wheels at z = 1.5 / -1.55, y = 0.345, x = ±0.86.
import { loft, smin, smax, box, ell, sph, cone, hexLin, clamp } from './shape.mjs';

const WF = 1.5, WRZ = -1.55, WCY = 0.345, ARCH = 0.395;

export function proto() {
  const tub = loft({
    z0: -2.36, z1: 2.38, end: 0.08,
    hw: [[-2.36, 0.62], [-1.6, 0.62], [-0.6, 0.58], [0.6, 0.55], [1.6, 0.46], [2.2, 0.4], [2.38, 0.34]],
    yb: [[-2.36, 0.2], [-2.0, 0.13], [2.1, 0.12], [2.38, 0.16]],
    yt: [[-2.36, 0.74], [-1.6, 0.78], [-0.9, 0.72], [0.2, 0.62], [1.2, 0.54], [1.9, 0.44], [2.25, 0.34], [2.38, 0.28]],
    n: 3, tb: 0.15,
  });
  // fender pods: the same loft offset to each side
  const podF = loft({ z0: 0.95, z1: 2.36, end: 0.22, hw: [[0.95, 0.12], [1.2, 0.19], [1.5, 0.2], [2.0, 0.18], [2.36, 0.12]], yb: 0.16, yt: [[0.95, 0.46], [1.2, 0.7], [1.5, 0.76], [1.9, 0.66], [2.2, 0.48], [2.36, 0.36]], n: 3.4, tb: 0.3 });
  const podR = loft({ z0: -2.36, z1: -0.75, end: 0.2, hw: [[-2.36, 0.18], [-2.0, 0.23], [-1.55, 0.24], [-1.1, 0.2], [-0.75, 0.1]], yb: 0.14, yt: [[-2.36, 0.74], [-2.0, 0.84], [-1.55, 0.86], [-1.1, 0.78], [-0.75, 0.5]], n: 3.2, tb: 0.22 });
  const pods = p => { const q = [Math.abs(p[0]) - 0.78, p[1], p[2]]; return Math.min(podF.sdf(q), podR.sdf(q)); };
  const sidepod = p => box([Math.abs(p[0]), p[1], p[2]], [0.74, 0.34, -0.1], [0.2, 0.2, 0.86], 0.14);
  const canopy = loft({ z0: -0.95, z1: 0.95, end: 0.3, hw: [[-0.95, 0.36], [-0.3, 0.5], [0.3, 0.5], [0.95, 0.3]], yb: 0.5,
    yt: [[-0.95, 0.96], [-0.5, 1.08], [-0.1, 1.12], [0.3, 1.08], [0.7, 0.9], [0.95, 0.72]], n: 2.6, tb: 0.36 });
  const cover = loft({ z0: -2.3, z1: -0.6, end: 0.2, hw: [[-2.3, 0.36], [-1.4, 0.4], [-0.6, 0.42]], yb: 0.5, yt: [[-2.3, 0.82], [-1.4, 0.92], [-0.6, 1.04]], n: 3, tb: 0.3 });
  const fin = p => { const top = 1.12 - (-0.55 - p[2]) * 0.09; return Math.max(Math.abs(p[0]) - 0.012, p[1] - top, 0.7 - p[1], -2.2 - p[2], p[2] + 0.55) - 0.004; };   // shark fin
  const scoop = p => box(p, [0, 1.13, -0.48], [0.12, 0.06, 0.16], 0.05);
  const hull = p => {
    let d = smin(tub.sdf(p), pods(p), 0.14);
    d = smin(d, sidepod(p), 0.12);
    d = smin(d, smin(canopy.sdf(p), cover.sdf(p), 0.12), 0.1);
    d = smin(d, scoop(p), 0.04);
    return Math.min(d, fin(p));
  };
  // openings
  const glassCut = p => { const z = p[2], x = Math.abs(p[0]); return Math.max(0.7 - p[1], -0.62 - z, z - 0.86, 0.04 - x * (p[1] > 1.04 ? 1 : 10)); };   // canopy glass with a painted spine
  const cabin = p => box(p, [0, 0.62, 0.05], [0.4, 0.3, 0.7], 0.12);
  const arches = p => { const x = Math.abs(p[0]); let d = 1; for (const zw of [WF, WRZ]) d = Math.min(d, Math.max(Math.hypot(p[1] - WCY, p[2] - zw) - ARCH, 0.54 - x)); return d; };
  const podIntake = p => box([Math.abs(p[0]), p[1], p[2]], [0.74, 0.36, 0.78], [0.16, 0.13, 0.12], 0.06);
  const scoopMouth = p => box(p, [0, 1.13, -0.3], [0.09, 0.035, 0.06], 0.02);
  const headSlit = p => box([Math.abs(p[0]), p[1], p[2]], [0.78, 0.7, 2.0], [0.13, 0.025, 0.18], 0.02);
  const noseInlet = p => box(p, [0, 0.28, 2.32], [0.3, 0.07, 0.1], 0.04);
  const tailBand = p => box(p, [0, 0.66, -2.36], [0.95, 0.02, 0.06], 0.012);
  const carve = p => Math.min(arches(p), podIntake(p), scoopMouth(p), headSlit(p), noseInlet(p), tailBand(p));
  const paintSdf = p => { let d = hull(p); d = smax(d, -carve(p), 0.012); d = smax(d, -glassCut(p) - 0.004, 0.004); return smax(d, -cabin(p), 0.02); };

  const lineAt = (v, w) => Math.exp(-(v * v) / (w * w));
  const panelLines = p => { const x = Math.abs(p[0]), z = p[2], y = p[1]; let L = 0;
    if (y > 0.3) L = Math.max(L, lineAt(z - 0.95, 0.006) * (x > 0.5 ? 1 : 0), lineAt(z + 0.75, 0.006) * (x > 0.55 ? 1 : 0));
    if (Math.abs(x - 0.46) < 0.25 && y > 0.6 && z > 1.0) L = Math.max(L, lineAt(x - 0.56, 0.006));
    return L; };
  const split = (p, n) => {
    const depth = hull(p), y = p[1];
    if (podIntake(p) < 0.006 || scoopMouth(p) < 0.005 || noseInlet(p) < 0.006) return 'black';
    if (headSlit(p) < 0.004) return 'housing';
    if (tailBand(p) < 0.004) return 'tailHousing';
    if (arches(p) < 0.01 && depth < -0.012) return 'liner';
    if (depth < -0.02 || (glassCut(p) < 0.01 && depth < -0.008)) return 'interior';
    if (y < 0.26) return 'carbon';
    if (fin(p) < 0.004) return 'paint';
    return 'paint';
  };
  const paintCol = (p, n) => { const s = split(p, n), k = 1 - 0.85 * panelLines(p); if (s === 'paint') return [k, k, k]; if (s === 'interior') return hexLin('#1a1a1e'); if (s === 'liner') return hexLin('#101012'); if (s === 'housing') return hexLin('#2a2d33'); if (s === 'tailHousing') return hexLin('#200608'); return hexLin('#16171a'); };
  const W = [1, 1, 1];
  const glassSdf = p => Math.max(Math.abs(hull(p) + 0.007) - 0.006, glassCut(p) + 0.003);
  const headLens = p => Math.max(Math.abs(hull(p) + 0.004) - 0.0045, headSlit(p) + 0.004);
  const leds = p => { const x = Math.abs(p[0]); let d = 1; for (let k = 0; k < 4; k++) d = Math.min(d, box([x, p[1], p[2]], [0.69 + k * 0.06, 0.7, 2.06 - k * 0.05], [0.02, 0.012, 0.02], 0.008)); return d; };
  const tailBar = p => box(p, [0, 0.66, -2.395], [0.92, 0.008, 0.012], 0.006);
  const splitter = p => box(p, [0, 0.11, 2.2], [0.92, 0.01, 0.22], 0.008);
  const diffuser = p => { let d = box(p, [0, 0.18, -2.15], [0.8, 0.01, 0.25], 0.008); for (const fx of [-0.6, -0.3, 0, 0.3, 0.6]) d = Math.min(d, box(p, [fx, 0.27, -2.22], [0.005, 0.1, 0.18], 0.004)); return d; };
  const exhaust = p => { const r = Math.hypot(p[0], p[1] - 0.56); return Math.max(Math.abs(r - 0.05) - 0.008, Math.abs(p[2] + 2.36) - 0.07); };
  const mirrors = p => { const x = Math.abs(p[0]), q = [x, p[1], p[2]]; return smin(ell(q, [0.84, 0.86, 1.1], [0.08, 0.04, 0.07]), cone(q, [0.78, 0.76, 1.12], [0.83, 0.84, 1.1], 0.012, 0.01), 0.012); };
  const driver = p => {                                                    // a driver in a helmet, hands on the wheel
    const h = sph(p, [0, 0.98, -0.12], 0.135), torso = ell(p, [0, 0.72, -0.2], [0.2, 0.2, 0.14]);
    const arms = Math.min(cone([Math.abs(p[0]), p[1], p[2]], [0.16, 0.8, -0.12], [0.14, 0.76, 0.2], 0.045, 0.04));
    const wheel = Math.hypot(Math.hypot(p[0], (p[1] - 0.8) * 0.5 + (p[2] - 0.28) * 0.87) - 0.13, (p[1] - 0.8) * 0.87 - (p[2] - 0.28) * 0.5) - 0.014;
    return Math.min(smin(h, smin(torso, arms, 0.05), 0.04), wheel);
  };
  const driverCol = p => { if (p[1] > 0.88) { const vis = p[2] > -0.05 && Math.abs(p[1] - 0.99) < 0.04; return hexLin(vis ? '#151a22' : '#f2f2f0'); } return hexLin(p[1] > 0.6 ? '#2a5cc8' : '#1a1a1e'); };

  const deck = Array.from({ length: 50 }, (_, i) => { const z = -2.45 + i * 0.1; let lo = 0.3, hi = 1.6; if (hull([0, hi, z]) < 0 || hull([0, lo, z]) > 0) return [+z.toFixed(2), 0.5]; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (hull([0, m, z]) < 0) lo = m; else hi = m; } return [+z.toFixed(2), +lo.toFixed(4)]; });
  const step = 0.0078;
  return {
    name: 'proto',
    meta: { L: 4.8, R: 0.345, TW: 0.31, wheels: [[0.86, WCY, WF], [0.86, WCY, WRZ]], deck, door: [0.945, 0.45, -0.1], exh: [[0, 0.56, -2.42]] },
    pieces: [
      { name: 'body', sdf: paintSdf, lo: [-1.1, 0.06, -2.46], hi: [1.1, 1.24, 2.46], step, split, paint: paintCol, ao: true },
      { name: 'glass', mat: 'glass', sdf: glassSdf, lo: [-0.56, 0.66, -0.66], hi: [0.56, 1.16, 0.9], step: 0.005, paint: () => W },
      { name: 'headLens', mat: 'lens', sdf: headLens, lo: [-0.94, 0.64, 1.78], hi: [0.94, 0.78, 2.22], step: 0.0035, paint: () => W },
      { name: 'leds', mat: 'led', sdf: leds, lo: [-0.92, 0.66, 1.86], hi: [0.92, 0.74, 2.1], step: 0.003, paint: () => W },
      { name: 'tailBar', mat: 'tailLed', sdf: tailBar, lo: [-0.96, 0.64, -2.42], hi: [0.96, 0.68, -2.37], step: 0.003, paint: () => W },
      { name: 'splitter', mat: 'carbon', sdf: splitter, lo: [-0.96, 0.09, 1.96], hi: [0.96, 0.13, 2.44], step: 0.005, paint: () => W },
      { name: 'diffuser', mat: 'carbon', sdf: diffuser, lo: [-0.84, 0.16, -2.42], hi: [0.84, 0.38, -1.88], step: 0.004, paint: () => W },
      { name: 'exhaust', mat: 'chrome', sdf: exhaust, lo: [-0.08, 0.48, -2.45], hi: [0.08, 0.64, -2.27], step: 0.003, paint: () => W },
      { name: 'mirrors', sdf: mirrors, lo: [-0.94, 0.72, 1.0], hi: [0.94, 0.92, 1.2], step: 0.004, split: () => 'paint', paint: () => W },
      { name: 'driver', mat: 'interior', sdf: driver, lo: [-0.3, 0.5, -0.4], hi: [0.3, 1.14, 0.4], step: 0.006, paint: driverCol, ao: true },
    ],
  };
}
