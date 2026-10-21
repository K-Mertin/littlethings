// Pickups, centred on the origin (they float and spin in the game). Tinted parts are painted white
// and coloured per pickup in the game (red heart / gold heart, red / blue / yellow keys, potions).
import { V3, clamp, smin, smax, cone, ell, sph, box, noise, hexLin, lerp3, mul3, torusY, cappedConeY, len } from '../sdf.mjs';

const still = { bones: [['base', null, V3(0, 0, 0)]], weights: () => [[0, 1]], meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J: { head: [0, 0, 0] } }, budget: .2, errScale: 2 };
const WH = hexLin('#ffffff'), shade = (lo = .75) => (p, n) => mul3(WH, lo + (1 - lo) * clamp(n[1] * .5 + .5, 0, 1) * (.92 + noise(p[0] * 200, p[1] * 200, p[2] * 200) * .08));
const metal = h => { const C = hexLin(h); return p => mul3(C, .9 + noise(p[0] * 300, p[1] * 300, p[2] * 300) * .14); };
const rotZ = (q, a) => [q[0] * Math.cos(a) + q[1] * Math.sin(a), -q[0] * Math.sin(a) + q[1] * Math.cos(a), q[2]];

export function pHeart() {   // a plump, rounded heart
  const sdf = p => { let d = 1e9; for (const s of [-1, 1]) d = smin(d, ell(p, [s * .06, .035, 0], [.068, .066, .048]), .012); d = smin(d, cone([p[0], p[1], p[2] * 1.7], [0, .0, 0], [0, -.11, 0], .085, .006) / 1.3, .045);   // flattened point
    return smax(d, -ell(p, [0, .105, 0], [.018, .035, .08]), .02); };   // two round lobes, a cleft, a point
  return { name: 'pHeart', ...still, pieces: [{ name: 'heart', mat: 'tint', sdf, lo: [-.15, -.14, -.09], hi: [.15, .12, .09], step: .0025, paint: shade(.7), ao: true }] };
}
export function pWard() {   // a small heater shield: silver rim and boss, enamel face
  const outline = (x, y) => { const w = .12 - Math.max(0, -y - .02) ** 1.6 * 1.2; return Math.max(Math.abs(x) - Math.max(w, 0), y - .14, -y - .19); };
  const body = p => { const d2 = outline(p[0], p[1]), bulge = .012 * (1 - (p[0] / .12) ** 2); return Math.max(d2, Math.abs(p[2]) - .012 - bulge); };
  const rim = p => Math.max(outline(p[0], p[1]), -(outline(p[0], p[1]) + .016), Math.abs(p[2]) - .02);
  const face = p => Math.max(outline(p[0], p[1]) + .014, p[2] - .019, .005 - p[2]);
  return { name: 'pWard', ...still, pieces: [
    { name: 'rim', mat: 'steel', sdf: p => Math.min(rim(p), Math.max(body(p), p[2])), lo: [-.14, -.21, -.03], hi: [.14, .16, .03], step: .002, paint: metal('#cfd6e6'), ao: true },
    { name: 'face', mat: 'cloth', sdf: face, lo: [-.13, -.2, 0], hi: [.13, .15, .03], step: .002, paint: p => mul3(hexLin('#2f5fd0'), .8 + noise(p[0] * 60, p[1] * 60, 0) * .3) },
  ] };
}
function bottle(name, prof, liquidTop, cork) {   // prof: [[r, y]...] outer radius profile
  const R = y => { for (let i = 0; i < prof.length - 1; i++) { const [r0, y0] = prof[i], [r1, y1] = prof[i + 1]; if (y >= y0 && y <= y1 && y1 > y0) { const t = (y - y0) / (y1 - y0); return r0 + (r1 - r0) * t * t * (3 - 2 * t); } } return 0; };
  const y0 = prof[0][1], y1 = prof[prof.length - 1][1];
  const glass = p => { const r = Math.hypot(p[0], p[2]), d = (r - R(clamp(p[1], y0, y1))) * .8; return Math.max(Math.abs(d) - .004, y0 - p[1], p[1] - y1); };
  const liquid = p => { const r = Math.hypot(p[0], p[2]); return Math.max((r - R(clamp(p[1], y0, y1)) + .008) * .8, y0 + .006 - p[1], p[1] - liquidTop); };
  const corkS = p => cappedConeY(p, [0, 0, 0], y1 - .01, y1 + cork[1], cork[0], cork[0] * .9);
  const twine = p => torusY(p, [0, y1 - .02, 0], prof[prof.length - 1][0] + .002, .004);
  return { name, ...still, errScale: 1, pieces: [
    { name: 'glass', mat: 'glass', sdf: glass, lo: [-.13, y0 - .01, -.13], hi: [.13, y1 + .01, .13], step: .0022, paint: () => WH },
    { name: 'liquid', mat: 'tintGlow', sdf: liquid, lo: [-.12, y0, -.12], hi: [.12, liquidTop + .01, .12], step: .0025, paint: (p, n) => mul3(WH, .8 + clamp(n[1], 0, 1) * .2) },
    { name: 'cork', mat: 'wood', sdf: p => Math.min(corkS(p), twine(p)), lo: [-.06, y1 - .04, -.06], hi: [.06, y1 + cork[1] + .01, .06], step: .0015, paint: p => (p[1] < y1 - .01 ? hexLin('#c8b48a') : mul3(hexLin('#a87a4a'), .85 + noise(p[0] * 300, p[1] * 300, p[2] * 300) * .3)), ao: true },
  ] };
}
export const pPotion = () => bottle('pPotion', [[.0, -.1], [.07, -.1], [.09, -.07], [.09, 0], [.05, .05], [.025, .07], [.025, .12]], .035, [.03, .04]);
export const pElixir = () => bottle('pElixir', [[.0, -.1], [.08, -.1], [.1, -.05], [.1, 0], [.04, .06], [.03, .12]], .03, [.035, .05]);
export function pQuiver() {   // a leather quiver of bolts
  const tilt = p => rotZ(p, -.25);
  const body = p => { const q = tilt(p); let d = Math.max(Math.abs(cappedConeY(q, [0, 0, 0], -.12, .12, .06, .07)) - .006, q[1] - .12); d = smin(d, cappedConeY(q, [0, 0, 0], -.125, -.11, .062, .062), .004);
    for (const y of [-.06, .04]) d = Math.min(d, Math.max(Math.abs(Math.hypot(q[0], q[2]) - .068) - .004, Math.abs(q[1] - y) - .01)); return d; };   // straps
  const rim = p => torusY(tilt(p), [0, .115, 0], .07, .007);
  const bolts = p => { const q = tilt(p); let d = 1e9; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, x = Math.cos(a) * .035, z = Math.sin(a) * .035; d = Math.min(d, cappedConeY(q, [x, 0, z], 0, .28, .006, .006)); } return d; };
  return { name: 'pQuiver', ...still, pieces: [
    { name: 'body', mat: 'leather', sdf: body, lo: [-.13, -.16, -.09], hi: [.13, .16, .09], step: .002, paint: (p, n) => mul3(hexLin('#6b3f24'), .8 + noise(p[0] * 200, p[1] * 200, p[2] * 200) * .3), ao: true },
    { name: 'rim', mat: 'gold', sdf: rim, lo: [-.12, .02, -.09], hi: [.12, .17, .09], step: .0018, paint: metal('#e8b85a') },
    { name: 'bolts', mat: 'wood', sdf: bolts, lo: [-.1, -.02, -.06], hi: [.16, .3, .06], step: .0018, paint: () => hexLin('#b08a5a') },
  ] };
}
export function pEmbers() {   // three faceted ember crystals
  const hex6 = (q, r) => { const a = Math.abs(q[0]), b = Math.abs(q[2]); return Math.max(a * .866 + b * .5, b) - r; };
  const crys = (p, c, h, r, a) => { const q = rotZ([p[0] - c[0], p[1] - c[1], p[2] - c[2]], a), t = Math.abs(q[1]) / h, rr = r * (1 - Math.max(0, t - .45) / .55); return Math.max(hex6(q, Math.max(rr, 0)), Math.abs(q[1]) - h); };
  const sdf = p => Math.min(crys(p, [-.07, -.02, 0], .08, .04, .3), crys(p, [.06, 0, 0], .08, .04, -.25), crys(p, [0, .06, 0], .09, .045, 0));
  return { name: 'pEmbers', ...still, pieces: [{ name: 'ember', mat: 'ember', sdf, lo: [-.14, -.12, -.06], hi: [.14, .16, .06], step: .002, paint: p => lerp3(hexLin('#ff5a10'), hexLin('#ffe08a'), clamp(.5 + p[1] * 3 + noise(p[0] * 60, p[1] * 60, p[2] * 60) * .3 - .2, 0, 1)) }] };
}
export function pKey() {   // an ornate key: trefoil bow, collar, shaft and a toothed bit
  function sdf(p) {
    let d = Math.max(Math.abs(Math.hypot(p[0] + .1, p[1]) - .055) - .011, Math.abs(p[2]) - .012);     // bow ring
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + Math.PI, c = [-.1 + Math.cos(a) * .06, Math.sin(a) * .06]; d = smin(d, Math.max(Math.abs(Math.hypot(p[0] - c[0], p[1] - c[1]) - .022) - .008, Math.abs(p[2]) - .01), .006); }   // trefoil lobes
    d = smin(d, cone(p, [-.04, 0, 0], [.17, 0, 0], .014, .011), .008);                                     // shaft
    d = smin(d, torusY([p[1], p[0] + .03, p[2]], [0, 0, 0], .016, .007), .004);                            // collar
    d = Math.min(d, box(p, [.12, -.035, 0], [.008, .03, .009], .002), box(p, [.15, -.045, 0], [.008, .04, .009], .002), box(p, [.135, -.06, 0], [.022, .01, .009], .002));   // bit
    return d;
  }
  return { name: 'pKey', ...still, pieces: [{ name: 'key', mat: 'tintMetal', sdf, lo: [-.18, -.12, -.03], hi: [.19, .08, .03], step: .0018, paint: shade(.8), ao: true }] };
}
