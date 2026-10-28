// Formula, sculpted: an open-wheel single seater. 4.7 m long, 1.9 m wide over the tyres, 1.0 m tall at the airbox.
// A needle nose on a raised monocoque, sidepods with undercut intakes, an airbox over the driver's head, a halo,
// a wide front wing with endplates, a tall rear wing on a swan-neck pylon, and wishbones out to the exposed wheels.
// x across, y up, z forward; wheels at z = 1.6 / -1.5, y = 0.35, x = ±0.8.
import { loft, smin, smax, box, ell, sph, cone, hexLin, clamp } from './shape.mjs';

const WF = 1.6, WRZ = -1.5, WCY = 0.35, TRK = 0.8;

export function formula() {
  const tub = loft({
    z0: -2.0, z1: 2.42, end: 0.06,
    hw: [[-2.0, 0.16], [-1.6, 0.2], [-1.0, 0.3], [-0.4, 0.34], [0.3, 0.33], [0.9, 0.26], [1.5, 0.17], [2.1, 0.11], [2.42, 0.07]],
    yb: [[-2.0, 0.2], [-1.4, 0.13], [1.0, 0.13], [1.6, 0.2], [2.42, 0.24]],
    yt: [[-2.0, 0.48], [-1.4, 0.56], [-0.7, 0.66], [-0.2, 0.7], [0.3, 0.72], [0.9, 0.66], [1.5, 0.55], [2.1, 0.42], [2.42, 0.36]],
    n: 2.6, tb: 0.25,
  });
  // sidepods with an undercut, flowing back into the coke-bottle engine cover
  const pod = loft({ z0: -1.2, z1: 0.45, end: 0.18, hw: [[-1.2, 0.08], [-0.8, 0.17], [-0.2, 0.22], [0.25, 0.22], [0.45, 0.16]], yb: 0.16,
    yt: [[-1.2, 0.36], [-0.7, 0.5], [0.0, 0.56], [0.45, 0.54]], n: 3.2, tb: 0.35 });
  const pods = p => pod.sdf([Math.abs(p[0]) - 0.42, p[1], p[2]]);
  const airbox = loft({ z0: -1.7, z1: -0.25, end: 0.14, hw: [[-1.7, 0.05], [-1.1, 0.1], [-0.5, 0.15], [-0.25, 0.14]], yb: 0.55,
    yt: [[-1.7, 0.6], [-1.2, 0.82], [-0.6, 0.98], [-0.3, 1.0], [-0.25, 0.94]], n: 2.4, tb: 0.2 });
  const hull = p => smin(smin(tub.sdf(p), pods(p), 0.1), airbox.sdf(p), 0.08);
  // openings: cockpit, sidepod intakes, airbox mouth
  const cockpit = p => box(p, [0, 0.66, 0.15], [0.22, 0.2, 0.42], 0.12);
  const intakes = p => box([Math.abs(p[0]), p[1], p[2]], [0.44, 0.4, 0.46], [0.15, 0.1, 0.1], 0.05);
  const mouth = p => ell(p, [0, 0.9, -0.26], [0.09, 0.07, 0.08]);
  const carve = p => Math.min(intakes(p), mouth(p));
  const paintSdf = p => { let d = hull(p); d = smax(d, -carve(p), 0.01); return smax(d, -cockpit(p), 0.02); };
  // wings: a wide front wing with two elements and endplates, a rear wing with a DRS flap on a central pylon
  const fWing = p => {
    const x = Math.abs(p[0]);
    let d = Math.min(box(p, [0, 0.11, 2.22], [0.88, 0.012, 0.16], 0.008), box([p[0], p[1] - (p[2] - 2.0) * -0.35, p[2]], [0, 0.18, 2.06], [0.8, 0.01, 0.07], 0.006));
    d = Math.min(d, box([x, p[1], p[2]], [0.88, 0.17, 2.18], [0.008, 0.08, 0.2], 0.005));                 // endplates
    d = Math.min(d, box([x, p[1], p[2]], [0.07, 0.2, 2.25], [0.012, 0.1, 0.05], 0.006));                   // pylons to the nose
    return d;
  };
  const rWing = p => {
    const x = Math.abs(p[0]);
    let d = Math.min(box(p, [0, 0.86, -2.0], [0.5, 0.014, 0.17], 0.01), box([p[0], p[1] - (p[2] + 1.95) * -0.6, p[2]], [0, 0.95, -1.95], [0.49, 0.009, 0.09], 0.006));
    d = Math.min(d, box([x, p[1], p[2]], [0.5, 0.78, -2.0], [0.008, 0.22, 0.22], 0.005));                  // endplates
    d = Math.min(d, box(p, [0, 0.68, -1.92], [0.012, 0.2, 0.06], 0.008));                                  // pylon
    d = Math.min(d, box(p, [0, 0.5, -2.04], [0.4, 0.01, 0.1], 0.006));                                     // beam wing
    return d;
  };
  const diffuser = p => { let d = box(p, [0, 0.14, -1.85], [0.45, 0.01, 0.2], 0.006); for (const fx of [-0.3, -0.1, 0.1, 0.3]) d = Math.min(d, box(p, [fx, 0.2, -1.9], [0.004, 0.06, 0.14], 0.003)); return d; };
  const floor = p => box([Math.abs(p[0]), p[1], p[2]], [0, 0.12, -0.3], [0.62, 0.008, 1.05], 0.008);
  // wishbones and push rods out to the wheel uprights
  const arms = p => {
    const q = [Math.abs(p[0]), p[1], p[2]]; let d = 1;
    for (const [zw, zf, zr] of [[WF, WF + 0.3, WF - 0.35], [WRZ, WRZ + 0.35, WRZ - 0.25]]) {
      d = Math.min(d, cone(q, [0.2, 0.45, zf], [TRK - 0.12, 0.47, zw], 0.018, 0.016), cone(q, [0.2, 0.45, zr], [TRK - 0.12, 0.47, zw], 0.018, 0.016));
      d = Math.min(d, cone(q, [0.2, 0.22, zf], [TRK - 0.12, 0.24, zw], 0.018, 0.016), cone(q, [0.2, 0.22, zr], [TRK - 0.12, 0.24, zw], 0.018, 0.016));
      d = Math.min(d, cone(q, [0.24, 0.6, zw - 0.05], [TRK - 0.14, 0.26, zw], 0.014, 0.014));
    }
    return d;
  };
  // halo over the cockpit and the driver inside
  const halo = p => {
    const x = p[0], y = p[1] - 0.87 + Math.max(0, -p[2] - 0.1) * 0.25, z = p[2] - 0.04;
    const ring = Math.hypot((Math.hypot(x / 0.26, z / 0.4) - 1) * 0.26, y) - 0.022;
    const front = cone(p, [0, 0.7, 0.62], [0, 0.87, 0.44], 0.026, 0.022);
    return Math.min(ring, front);
  };
  const driver = p => {
    const h = sph(p, [0, 0.82, -0.02], 0.135), neck = cone(p, [0, 0.66, 0], [0, 0.76, -0.02], 0.07, 0.06);
    const wheel = box(p, [0, 0.7, 0.32], [0.12, 0.06, 0.015], 0.02);
    return Math.min(smin(h, neck, 0.03), wheel);
  };
  const driverCol = p => { if (p[1] > 0.72) { const vis = p[2] > 0.06 && Math.abs(p[1] - 0.83) < 0.04; return hexLin(vis ? '#141a24' : p[1] > 0.88 ? '#ffd23f' : '#f2f2f0'); } return hexLin('#1a1a1e'); };
  const rainLight = p => box(p, [0, 0.45, -2.12], [0.04, 0.025, 0.012], 0.006);
  const camera = p => box(p, [0, 1.03, -0.5], [0.03, 0.025, 0.06], 0.01);

  const lineAt = (v, w) => Math.exp(-(v * v) / (w * w));
  const split = (p, n) => {
    const depth = hull(p);
    if (intakes(p) < 0.006 || mouth(p) < 0.006) return 'black';
    if (depth < -0.02 || cockpit(p) < 0.01) return 'interior';
    if (p[1] < 0.18) return 'carbon';
    return 'paint';
  };
  const paintCol = (p, n) => {
    const s = split(p, n);
    if (s === 'paint') { const x = Math.abs(p[0]); const stripe = p[2] > 0.9 && x < 0.06 ? 0.15 : 0; const k = 1 - 0.85 * (lineAt(p[2] + 0.25, 0.006) * (p[1] > 0.6 ? 1 : 0)) - stripe; return [k, k, k]; }
    if (s === 'interior') return hexLin('#18181c');
    return hexLin('#141518');
  };
  const W = [1, 1, 1];
  const deck = Array.from({ length: 50 }, (_, i) => { const z = -2.45 + i * 0.1; let lo = 0.2, hi = 1.4; if (hull([0, hi, z]) < 0 || hull([0, lo, z]) > 0) return [+z.toFixed(2), 0.5]; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (hull([0, m, z]) < 0) lo = m; else hi = m; } return [+z.toFixed(2), +lo.toFixed(4)]; });
  const step = 0.0065;
  return {
    name: 'formula',
    meta: { L: 4.7, R: 0.35, TW: 0.34, wheels: [[TRK, WCY, WF], [TRK, WCY, WRZ]], deck, wing: 'builtin', door: [0.66, 0.45, -0.3], exh: [[0, 0.42, -2.08]] },
    pieces: [
      { name: 'body', sdf: paintSdf, lo: [-0.72, 0.1, -2.06], hi: [0.72, 1.04, 2.46], step, split, paint: paintCol, ao: true },
      { name: 'frontWing', sdf: fWing, lo: [-0.92, 0.08, 1.84], hi: [0.92, 0.32, 2.42], step: 0.0045, split: (p) => Math.abs(p[0]) > 0.86 ? 'paint' : 'carbon', paint: () => W },
      { name: 'rearWing', sdf: rWing, lo: [-0.54, 0.46, -2.24], hi: [0.54, 1.02, -1.74], step: 0.0045, split: (p) => p[1] > 0.83 && p[1] < 0.9 ? 'paint' : 'carbon', paint: () => W },
      { name: 'floor', mat: 'carbon', sdf: floor, lo: [-0.66, 0.1, -1.4], hi: [0.66, 0.14, 0.8], step: 0.008, paint: () => W },
      { name: 'diffuser', mat: 'carbon', sdf: diffuser, lo: [-0.5, 0.12, -2.1], hi: [0.5, 0.3, -1.6], step: 0.005, paint: () => W },
      { name: 'arms', mat: 'carbon', sdf: arms, lo: [-0.72, 0.18, -1.9], hi: [0.72, 0.64, 1.96], step: 0.005, paint: () => W },
      { name: 'halo', mat: 'black', sdf: halo, lo: [-0.32, 0.7, -0.4], hi: [0.32, 0.92, 0.66], step: 0.004, paint: () => hexLin('#202226') },
      { name: 'driver', mat: 'interior', sdf: driver, lo: [-0.2, 0.55, -0.2], hi: [0.2, 0.98, 0.4], step: 0.005, paint: driverCol, ao: true },
      { name: 'rainLight', mat: 'tailLed', sdf: rainLight, lo: [-0.06, 0.41, -2.14], hi: [0.06, 0.49, -2.1], step: 0.003, paint: () => W },
      { name: 'camera', mat: 'black', sdf: camera, lo: [-0.05, 0.99, -0.58], hi: [0.05, 1.07, -0.42], step: 0.004, paint: () => hexLin('#202226') },
    ],
  };
}
