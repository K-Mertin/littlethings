// GT Coupe, sculpted: front-engined 2-door GT, 4.5 m long, 1.9 m wide, 1.27 m tall, 2.72 m wheelbase.
// x across the car, y up, z forward. Wheel centres at z = ±1.36, y = 0.345.
import { loft, curve, smin, smax, box, ell, sph, cone, torusY, hexLin, mix, clamp, sstep, rpoly2, len, fbm3 } from './shape.mjs';

const WZ = [1.36, -1.36], WR = 0.345, WCY = 0.345, ARCH = 0.405;

export function gt() {
  // ---------- main body (below the windows) ----------
  const body = loft({
    z0: -2.24, z1: 2.24, end: 0.1,
    hw: [[-2.24, 0.8], [-2.1, 0.88], [-1.85, 0.915], [-1.4, 0.93], [-0.9, 0.925], [-0.3, 0.905], [0.4, 0.9], [1.0, 0.905], [1.55, 0.895], [1.95, 0.85], [2.12, 0.79], [2.24, 0.7]],
    yb: [[-2.24, 0.34], [-2.12, 0.24], [-1.9, 0.18], [-1.5, 0.15], [1.7, 0.15], [2.0, 0.15], [2.16, 0.17], [2.24, 0.22]],
    yt: [[-2.24, 0.78], [-2.17, 0.9], [-2.05, 0.95], [-1.8, 0.945], [-1.3, 0.93], [-0.6, 0.905], [0.3, 0.885], [0.75, 0.87], [1.2, 0.83], [1.65, 0.77], [2.0, 0.69], [2.18, 0.62], [2.24, 0.56]],
    n: [[-2.24, 3], [-1.9, 4.2], [1.8, 4.4], [2.24, 3.6]], tb: 0.16,
  });
  // haunches over the rear wheels and front fenders that stand above the bonnet
  const fenders = p => {
    const x = Math.abs(p[0]);
    const fr = ell([x, p[1], p[2]], [0.7, 0.6, 1.33], [0.22, 0.24, 0.62]);
    const rr = ell([x, p[1], p[2]], [0.72, 0.62, -1.38], [0.24, 0.28, 0.75]);
    return Math.min(fr, rr);
  };
  // ---------- glasshouse ----------
  const green = loft({
    z0: -1.62, z1: 0.68, end: 0.3,
    hw: [[-1.62, 0.6], [-1.1, 0.71], [-0.4, 0.755], [0.3, 0.75], [0.68, 0.73]],
    yb: 0.62,
    yt: [[-1.62, 0.93], [-1.25, 1.0], [-0.8, 1.13], [-0.4, 1.235], [-0.05, 1.27], [0.15, 1.255], [0.38, 1.13], [0.58, 0.97], [0.68, 0.88]],
    n: [[-1.62, 4], [-0.9, 5.5], [0.3, 5.5], [0.68, 4]], tb: 0.34,
  });
  const hull = p => smin(smin(body.sdf(p), fenders(p), 0.12), green.sdf(p), 0.05);

  // ---------- openings ----------
  const belt = z => clamp(0.905 + (z < -0.6 ? (-0.6 - z) * 0.03 : 0), 0.9, 0.94);
  const roof = z => green.sec(z).yt;
  // side window (one big frameless glass with a small quarter light behind a thin B pillar)
  const sideCut = p => {
    const z = p[2], y = p[1];
    const d = Math.max(rpoly2(z, y, [[-1.14, 0.95], [0.52, 0.93], [0.02, 1.3], [-0.62, 1.3]], 0.025), y - (roof(z) - 0.07), 0.52 - Math.abs(p[0]));
    const bPillar = Math.max(Math.abs(z + 0.66) - 0.028, 0.55 - Math.abs(p[0]));
    return smax(d, -bPillar, 0.004);
  };
  const shield = p => {          // windscreen
    const z = p[2], y = p[1], x = Math.abs(p[0]);
    const xA = 0.5 + clamp((z - 0.09) / 0.55, 0, 1) * 0.12;             // A pillars in plan view
    return Math.max(x - xA, 0.915 - y, 0.09 - z, z - 0.8);
  };
  const rear = p => {           // rear window on the fastback
    const z = p[2], y = p[1], x = Math.abs(p[0]);
    const xC = 0.44 + clamp((-0.86 - z) / 0.6, 0, 1) * 0.06;            // C pillars in plan view
    return Math.max(x - xC, 0.965 - y, -1.5 - z, z + 0.86);
  };
  const cut = p => Math.min(sideCut(p), shield(p), rear(p));
  const cabin = p => box(p, [0, 0.62, -0.18], [0.78, 0.33, 0.78], 0.1);
  // ---------- lights, intakes, arches ----------
  const headE = p => { const x = Math.abs(p[0]); return ell([x, p[1] - (p[2] - 1.98) * 0.18, p[2]], [0.61, 0.69, 2.0], [0.25, 0.062, 0.3]); };
  const tailE = p => Math.min(box(p, [0, 0.86, -2.2], [0.7, 0.02, 0.12], 0.015), box([Math.abs(p[0]), p[1], p[2]], [0.68, 0.835, -2.17], [0.15, 0.045, 0.12], 0.03));
  const grilleE = p => { const x = Math.abs(p[0]); return box([x, p[1] - x * 0.06, p[2]], [0, 0.32, 2.2], [0.47, 0.075, 0.14], 0.05); };
  const sideIntake = p => box([Math.abs(p[0]), p[1], p[2]], [0.7, 0.27, 2.1], [0.13, 0.06, 0.16], 0.03);
  const arches = p => { const x = Math.abs(p[0]); let d = 1; for (const zw of WZ) d = Math.min(d, Math.max(Math.hypot(p[1] - WCY, p[2] - zw) - ARCH, 0.46 - x)); return d; };
  const exhaust = p => { let d = 1; for (const sx of [-1, 1]) d = Math.min(d, cone(p, [sx * 0.42, 0.25, -2.0], [sx * 0.42, 0.25, -2.4], 0.052, 0.052)); return d; };
  const vent = p => box([Math.abs(p[0]), p[1], p[2]], [0.9, 0.55, 0.78], [0.1, 0.035, 0.12], 0.02);      // fender vent behind the front wheel
  const carve = p => Math.min(headE(p), tailE(p), grilleE(p), sideIntake(p), arches(p), exhaust(p), vent(p));

  const paintSdf = p => {
    let d = hull(p);
    d = smax(d, -carve(p), 0.012);
    d = smax(d, -cut(p), 0.006);
    d = smax(d, -cabin(p), 0.02);
    return d;
  };

  // ---------- colour: panel lines, shading and which surfaces are trim ----------
  const W = hexLin('#ffffff');
  const lineAt = (v, w) => Math.exp(-(v * v) / (w * w));
  const panelLines = p => {
    const x = Math.abs(p[0]), y = p[1], z = p[2];
    let L = 0;
    if (y > 0.2 && y < 0.92 && x > 0.6) {                                   // doors
      L = Math.max(L, lineAt(z - 0.62 + (y - 0.5) * 0.05, 0.006), lineAt(z + 0.76 - (y - 0.5) * 0.12, 0.006));
      if (z > -0.78 && z < 0.64) L = Math.max(L, lineAt(y - 0.205, 0.006) * 0.6);
    }
    if (z > 0.8 && y > 0.6) L = Math.max(L, lineAt(z - 0.8, 0.006) * (x < 0.7 ? 1 : 0), x > 0.5 && x < 0.75 ? lineAt(x - 0.66 + (z - 1.5) * 0.06, 0.006) : 0);   // bonnet
    if (z < -1.62 && y > 0.85) L = Math.max(L, lineAt(z + 1.66, 0.006) * (x < 0.72 ? 1 : 0));                                                        // boot lid
    return L;
  };
  const split = (p, n) => {
    const x = Math.abs(p[0]), y = p[1], z = p[2], depth = hull(p);
    if (headE(p) < 0.004) return 'housing';
    if (tailE(p) < 0.006) return 'tailHousing';
    if (grilleE(p) < 0.006 || sideIntake(p) < 0.006 || vent(p) < 0.004) return 'black';
    if (exhaust(p) < 0.006) return 'black';
    if (arches(p) < 0.01 && depth < -0.012) return 'liner';
    if (depth < -0.02 || (cut(p) < 0.015 && depth < -0.008)) return 'interior';
    if (cut(p) < 0.03 && y > 0.88) return 'black';           // window surrounds
    if (y < 0.19 || (z < -1.98 && y < 0.34) || (z > 2.05 && y < 0.2)) return 'black';
    return 'paint';
  };
  const paintCol = (p, n) => {
    const s = split(p, n);
    if (s === 'paint') { const k = 1 - 0.85 * panelLines(p); return [k, k, k]; }
    if (s === 'interior') return hexLin(p[1] > 1.1 ? '#3a3a3e' : '#1d1d21');
    if (s === 'liner') return hexLin('#121214');
    if (s === 'housing') return hexLin('#4a4e56');
    if (s === 'tailHousing') return hexLin('#2a0a0d');
    return hexLin('#1a1b1f');
  };

  // ---------- glass: a thin shell on the hull inside the openings ----------
  const glassSdf = p => Math.max(Math.abs(hull(p) + 0.007) - 0.006, cut(p) + 0.006);
  // lenses sit flush with the body surface over the light recesses
  const headLens = p => Math.max(Math.abs(hull(p) + 0.004) - 0.0045, headE(p) + 0.004);
  const tailLens = p => Math.max(Math.abs(hull(p) + 0.004) - 0.0045, tailE(p) + 0.003);
  // inside the headlamps: two projector lenses and an L-shaped daytime running light
  const lampInner = p => {
    const x = Math.abs(p[0]); const q = [x, p[1], p[2]];
    let d = 1;                                                    // two projector barrels with a reflector ring each
    for (const [cx, cy, cz] of [[0.52, 0.672, 2.03], [0.665, 0.678, 1.965]]) {
      const r = Math.hypot(q[0] - cx, q[1] - cy);
      d = Math.min(d, Math.max(r - 0.03, Math.abs(q[2] - cz) - 0.03), Math.max(Math.abs(r - 0.045) - 0.006, Math.abs(q[2] - cz + 0.02) - 0.012));
    }
    return d;
  };
  const drl = p => {
    const x = Math.abs(p[0]); const q = [x, p[1], p[2]];
    return Math.min(cone(q, [0.4, 0.648, 2.12], [0.76, 0.66, 1.9], 0.009, 0.009), cone(q, [0.76, 0.66, 1.9], [0.8, 0.71, 1.82], 0.009, 0.009));
  };
  const tailBar = p => box(p, [0, 0.862, -2.236], [0.74, 0.007, 0.012], 0.005);
  // grille slats, splitter, diffuser fins, exhaust tips
  const grille = p => {                                          // thin slats and a mesh behind them, inside the opening
    const x = Math.abs(p[0]), q = [x, p[1] - x * 0.06, p[2]];
    let d = box(q, [0, 0.32, 2.1], [0.46, 0.074, 0.006], 0.004);                                   // backing mesh
    for (let k = -3; k <= 3; k++) d = Math.min(d, box(q, [0, 0.32 + k * 0.02, 2.16], [0.45, 0.003, 0.05], 0.002));
    return Math.max(d, grilleE(p) - 0.002);
  };
  const splitter = p => box(p, [0, 0.13, 2.13], [0.76, 0.008, 0.08], 0.006);
  const diffuser = p => { let d = box(p, [0, 0.19, -2.06], [0.6, 0.008, 0.15], 0.006); for (const fx of [-0.3, -0.1, 0.1, 0.3]) d = Math.min(d, box(p, [fx, 0.22, -2.1], [0.004, 0.035, 0.11], 0.003)); return d; };
  const tips = p => { let d = 1; for (const sx of [-1, 1]) { const c = [sx * 0.42, 0.25]; const r = Math.hypot(p[0] - c[0], p[1] - c[1]); d = Math.min(d, Math.max(Math.abs(r - 0.045) - 0.006, Math.abs(p[2] + 2.16) - 0.08)); } return d; };
  // mirrors on short stalks, with the glass on the back
  const mirrors = p => {
    const x = Math.abs(p[0]), q = [x, p[1], p[2]];
    const head = smax(ell([q[0], q[1] - (q[2] - 0.42) * 0.25, q[2]], [0.97, 0.99, 0.42], [0.1, 0.05, 0.08]), p[2] - 0.45, 0.025);
    const stalk = cone(q, [0.86, 0.945, 0.47], [0.93, 0.975, 0.44], 0.018, 0.012);
    return smin(head, stalk, 0.02);
  };
  const mirrorGlass = p => { const x = Math.abs(p[0]); return Math.max(ell([x, p[1], p[2]], [0.975, 0.99, 0.39], [0.088, 0.04, 0.012]), 0.383 - p[2]); };
  const fin = p => smax(ell(p, [0, 1.275, -0.42], [0.022, 0.035, 0.12]), 1.26 - p[1], 0.01);
  const wipers = p => Math.min(cone(p, [-0.62, 0.9, 0.7], [0.0, 0.9, 0.72], 0.008, 0.008), cone(p, [0.06, 0.9, 0.71], [0.62, 0.9, 0.66], 0.008, 0.008));
  // ---------- cabin ----------
  const seat = (p, sx) => {
    const q = [p[0] - sx * 0.37, p[1], p[2]];
    const base = box(q, [0, 0.36, -0.2], [0.22, 0.06, 0.26], 0.05);
    const back = box([q[0], q[1] - 0.68, q[2] + 0.5 - (q[1] - 0.68) * 0.28], [0, 0, 0], [0.22, 0.3, 0.06], 0.06);
    const bolsters = Math.min(box([Math.abs(q[0]), q[1] - 0.66, q[2] + 0.48 - (q[1] - 0.66) * 0.28], [0.2, 0, 0], [0.04, 0.26, 0.09], 0.035), box([Math.abs(q[0]), q[1], q[2]], [0.2, 0.42, -0.2], [0.04, 0.05, 0.24], 0.035));
    return smin(smin(base, back, 0.05), bolsters, 0.03);
  };
  const cabinParts = p => {
    let d = Math.min(seat(p, 1), seat(p, -1));
    d = Math.min(d, box(p, [0, 0.84, 0.48], [0.72, 0.07, 0.16], 0.06));                         // dashboard
    d = Math.min(d, box(p, [0, 0.42, 0.05], [0.1, 0.12, 0.45], 0.04));                          // console
    const sw = [p[0] - 0.37, p[1] - 0.86, p[2] - 0.3], c = Math.cos(1.1), s = Math.sin(1.1);
    const swr = [sw[0], sw[1] * c - sw[2] * s, sw[1] * s + sw[2] * c];
    d = Math.min(d, Math.hypot(Math.hypot(swr[0], swr[2]) - 0.17, swr[1]) - 0.016);               // steering wheel rim
    d = Math.min(d, box(swr, [0, 0, 0], [0.13, 0.012, 0.03], 0.008), sph(swr, [0, 0, 0], 0.05));
    return d;
  };
  const cabinCol = p => { const x = Math.abs(p[0]); if (p[1] > 0.75 && p[2] > 0.3) return hexLin('#18181b'); if (Math.abs(x - 0.37) < 0.06 && p[1] > 0.3) return hexLin('#7a2a22'); return hexLin('#2b2b30'); };

  const step = 0.0075, all = { lo: [-1.02, 0.08, -2.32], hi: [1.02, 1.32, 2.32] };
  const sideLo = { lo: [0.8, 0.85, 0.3], hi: [1.12, 1.07, 0.56] };
  const mirrorBox = { lo: [-1.12, 0.85, 0.3], hi: [1.12, 1.07, 0.56] };
  return {
    name: 'gt',
    meta: { L: 4.5, wheels: [[0.83, WCY, 1.36], [0.83, WCY, -1.36]], R: WR,
      // for parts and decals placed in the game: top of the body along the centre line, door panel side, exhaust tips
      deck: Array.from({ length: 46 }, (_, i) => { const z = -2.25 + i * 0.1; let lo = 0.45, hi = 1.6; if (hull([0, hi, z]) < 0 || hull([0, lo, z]) > 0) return [+z.toFixed(2), 0.5]; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (hull([0, m, z]) < 0) lo = m; else hi = m; } return [+z.toFixed(2), +lo.toFixed(4)]; }),
      door: [+(body.sideX(-0.1, 0.56)).toFixed(4), 0.56, -0.1], exh: [[-0.42, 0.25, -2.2], [0.42, 0.25, -2.2]] },
    pieces: [
      { name: 'body', sdf: paintSdf, ...all, step, split, paint: paintCol, ao: true },
      { name: 'glass', mat: 'glass', sdf: glassSdf, lo: [-0.8, 0.88, -1.56], hi: [0.8, 1.29, 0.82], step: 0.005, paint: () => W },
      { name: 'headLens', mat: 'lens', sdf: headLens, lo: [-0.9, 0.58, 1.7], hi: [0.9, 0.78, 2.3], step: 0.0035, paint: () => W },
      { name: 'lamps', mat: 'chrome', sdf: lampInner, lo: [-0.75, 0.6, 1.9], hi: [0.75, 0.75, 2.12], step: 0.004, paint: () => W },
      { name: 'drl', mat: 'led', sdf: drl, lo: [-0.85, 0.62, 1.78], hi: [0.85, 0.74, 2.16], step: 0.004, paint: () => W },
      { name: 'tailLens', mat: 'tailLens', sdf: tailLens, lo: [-0.86, 0.77, -2.3], hi: [0.86, 0.9, -1.98], step: 0.0035, paint: () => W },
      { name: 'tailBar', mat: 'tailLed', sdf: tailBar, lo: [-0.78, 0.84, -2.26], hi: [0.78, 0.88, -2.2], step: 0.004, paint: () => W },
      { name: 'grille', mat: 'black', sdf: grille, lo: [-0.5, 0.2, 2.06], hi: [0.5, 0.45, 2.26], step: 0.003, paint: p => hexLin(p[2] > 2.12 ? '#2a2c31' : '#0c0d0f') },
      { name: 'splitter', mat: 'carbon', sdf: splitter, lo: [-0.86, 0.1, 1.94], hi: [0.86, 0.15, 2.3], step: 0.006, paint: () => W },
      { name: 'diffuser', mat: 'carbon', sdf: diffuser, lo: [-0.66, 0.15, -2.3], hi: [0.66, 0.26, -1.82], step: 0.005, paint: () => W },
      { name: 'tips', mat: 'chrome', sdf: tips, lo: [-0.5, 0.18, -2.26], hi: [0.5, 0.32, -2.06], step: 0.003, paint: () => W },
      { name: 'mirrors', sdf: mirrors, ...mirrorBox, step: 0.006, split: () => 'paint', paint: () => W },
      { name: 'mirrorGlass', mat: 'chrome', sdf: mirrorGlass, lo: [-1.1, 0.92, 0.36], hi: [1.1, 1.05, 0.44], step: 0.004, paint: () => W },
      { name: 'fin', sdf: fin, lo: [-0.05, 1.22, -0.58], hi: [0.05, 1.33, -0.28], step: 0.004, split: () => 'paint', paint: () => W },
      { name: 'wipers', mat: 'black', sdf: wipers, lo: [-0.66, 0.88, 0.62], hi: [0.66, 0.92, 0.76], step: 0.004, paint: () => hexLin('#111111') },
      { name: 'cabin', mat: 'interior', sdf: cabinParts, lo: [-0.75, 0.24, -0.8], hi: [0.75, 1.05, 0.68], step: 0.008, paint: cabinCol, ao: true },
    ],
  };
}

// ---------- wheel: 245/35 R19 tyre, split five-spoke rim, drilled disc, four-pot caliper ----------
// axis along x, outer face toward +x
export function wheelSplit() {
  const R = WR, TW = 0.25, RIM = 0.242;
  const tyre = p => {
    const r = Math.hypot(p[1], p[2]), x = p[0];
    let d = box([x, r - 0.29, 0], [0, 0, 0], [TW / 2, 0.055, 1], 0.045);
    d = Math.max(d, -box([x, r - 0.24, 0], [0, 0, 0], [TW / 2 + 0.02, 0.012, 1], 0.004));
    for (const gx of [-0.065, 0, 0.065]) d = smax(d, -(Math.hypot(x - gx, r - R) - 0.007), 0.002);     // tread grooves
    d = Math.min(d, Math.hypot(x - TW / 2 + 0.002, r - 0.3) - 0.006);                                  // sidewall rib
    return d;
  };
  const rim = p => {
    const r = Math.hypot(p[1], p[2]), x = p[0], a = Math.atan2(p[1], p[2]);
    const barrel = Math.max(Math.abs(r - (RIM - 0.008)) - 0.008, Math.abs(x + 0.005) - 0.115);
    const lip = Math.hypot(x - 0.11, r - RIM) - 0.012;
    const dish = x - (0.035 + 0.06 * clamp((r - 0.07) / 0.16, 0, 1));                 // concave face
    let sp = 1;
    for (let k = 0; k < 5; k++) for (const off of [-0.075, 0.075]) {
      const ang = k / 5 * Math.PI * 2 + off, ca = Math.cos(ang), sa = Math.sin(ang);
      const u = p[1] * sa + p[2] * ca, v = -p[1] * ca + p[2] * sa;   // u along the spoke, v across
      const w = 0.013 + 0.008 * (1 - clamp((u - 0.06) / 0.17, 0, 1));
      sp = Math.min(sp, Math.max(Math.abs(v) - w, Math.abs(u - 0.15) - 0.095, Math.abs(dish) - 0.014));
    }
    const hub = Math.max(Math.hypot(p[1], p[2]) - 0.075, Math.abs(x - 0.045) - 0.025);
    let nuts = 1; for (let k = 0; k < 5; k++) { const ang = k / 5 * Math.PI * 2 + Math.PI / 5; nuts = Math.min(nuts, Math.max(Math.hypot(p[1] - Math.sin(ang) * 0.05, p[2] - Math.cos(ang) * 0.05) - 0.011, Math.abs(x - 0.075) - 0.008)); }
    const cap = Math.max(Math.hypot(p[1], p[2]) - 0.028, Math.abs(x - 0.077) - 0.006);
    return Math.min(barrel, lip, smin(sp, hub, 0.012), nuts, cap);
  };
  const disc = p => {
    const r = Math.hypot(p[1], p[2]), x = p[0];
    let d = Math.max(Math.abs(r - 0.135) - 0.055, Math.abs(x + 0.03) - 0.014);
    d = Math.min(d, Math.max(Math.abs(r - 0.06) - 0.03, Math.abs(x + 0.005) - 0.025));      // hat
    const a = Math.atan2(p[1], p[2]);
    for (let ring = 0; ring < 2; ring++) { const rr = 0.115 + ring * 0.035, n = 24, aa = Math.round((a / (Math.PI * 2)) * n + ring * 0.5) / n * Math.PI * 2 - ring * Math.PI / n; d = Math.max(d, -(Math.hypot(p[1] - Math.sin(aa) * rr, p[2] - Math.cos(aa) * rr) - 0.0045)); }
    return d;
  };
  const caliper = p => {
    const r = Math.hypot(p[1], p[2]), a = Math.atan2(p[2], p[1]);
    return Math.max(Math.abs(r - 0.17) - 0.035, Math.abs(p[0] + 0.03) - 0.04, Math.abs(a - 0.55) - 0.42) - 0.008;
  };
  const tyreCol = p => { const r = Math.hypot(p[1], p[2]); return hexLin(r > 0.335 ? '#161616' : Math.abs(r - 0.3) < 0.008 && p[0] > 0.1 ? '#2a2a2a' : '#1c1c1c'); };
  return {
    name: 'wheelSplit', meta: { R, TW }, lodScale: { hi: 0.17, lo: 0.2 }, errScale: 4,   // four of these per car
    pieces: [
      { name: 'tyre', mat: 'rubber', sdf: tyre, lo: [-0.15, -0.36, -0.36], hi: [0.15, 0.36, 0.36], step: 0.0045, paint: tyreCol, ao: true },
      { name: 'rim', mat: 'rim', sdf: rim, lo: [-0.13, -0.26, -0.26], hi: [0.14, 0.26, 0.26], step: 0.0035, paint: () => [1, 1, 1], ao: true },
      { name: 'disc', mat: 'disc', sdf: disc, lo: [-0.06, -0.2, -0.2], hi: [0.03, 0.2, 0.2], step: 0.003, paint: () => [1, 1, 1] },
      { name: 'caliper', mat: 'caliper', static: true, sdf: caliper, lo: [-0.09, -0.06, -0.22], hi: [0.02, 0.22, 0.22], step: 0.004, paint: () => [1, 1, 1] },
    ],
  };
}
