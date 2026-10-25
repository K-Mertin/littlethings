// Scenery sculpted like the monsters: a ribbed saguaro cactus for the desert.
import { V3, clamp, smin, cone, ell, sph, noise, hexLin, lerp3, mul3 } from '../sdf.mjs';

export function cactus() {
  const ribs = (p, c, r) => { const a = Math.atan2(p[0] - c[0], p[2] - c[2]); return r * (1 + Math.cos(a * 12) * .07); };
  const trunk = (p, a, b, r1, r2) => { const t = clamp((p[1] - a[1]) / (b[1] - a[1]), 0, 1), c = [a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t]; return cone(p, a, b, ribs(p, c, r1), ribs(p, c, r2)); };
  function sdf(p) {
    let d = trunk(p, V3(0, 0, 0), V3(0, .9, 0), .15, .12); d = smin(d, sph(p, V3(0, .9, 0), .12), .05);
    // two arms: out, then up
    for (const [s, y0, y1, out] of [[-1, .42, .74, .2], [1, .55, .82, .18]]) {
      const e = V3(out * s, y0 + .02, 0); d = smin(d, cone(p, V3(.05 * s, y0 - .04, 0), e, .065, .065), .04);
      d = smin(d, trunk(p, e, V3(out * s, y1, 0), .065, .055), .03); d = smin(d, sph(p, V3(out * s, y1, 0), .055), .03);
    }
    return d;
  }
  const G = hexLin('#5f9a5a'), GD = hexLin('#2e5a32'), SP = hexLin('#efe6c8'), FL = hexLin('#ff6a8a');
  const paint = (p, n) => { const a = Math.atan2(p[0], p[2]), groove = Math.cos(a * 12) < -.6; let c = lerp3(G, GD, clamp(.25 + (noise(p[0] * 10, p[1] * 10, p[2] * 10) - .5) * .7 + (groove ? .35 : 0), 0, 1));
    if (!groove && Math.cos(a * 12) > .9 && (p[1] * 60) % 1 < .18) c = SP;   // spine tufts along the ridges
    if (p[1] > .98) c = lerp3(c, FL, .8); return mul3(c, .92 + noise(p[0] * 60, p[1] * 60, p[2] * 60) * .16); };
  return { name: 'cactus', bones: [['base', null, V3(0, 0, 0)]], weights: () => [[0, 1]], budget: .25, errScale: 5, meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J: { head: [0, 0, 0] } },
    pieces: [{ name: 'cactus', mat: 'skin', sdf, lo: [-.3, -.01, -.2], hi: [.3, 1.04, .2], step: .005, paint, ao: true }] };
}

// A meadow flower: curved stem, two leaves, five cupped petals (white, tinted per flower in the game).
import { box as _box, torusY as _torus, frame, toFrame, ellLocal, smax } from '../sdf.mjs';
export function flower() {
  const stem = p => { const bend = .02 * Math.sin(p[1] * 6); return cone([p[0] - bend, p[1], p[2]], [0, 0, 0], [0, .3, 0], .008, .006); };
  const LEAVES = [[1, .1, .4], [-1, .17, -.6]].map(([s, y, a]) => ({ c: [s * .045 * Math.cos(a), y + .02, .045 * Math.sin(a)], F: frame([s * Math.cos(a), .45, Math.sin(a)]) }));
  const leaf = p => { let d = 1e9; for (const L of LEAVES) { const [a, b, c] = toFrame(p, L.c, L.F); d = Math.min(d, ellLocal([a, b, c + a * a * 3], [.045, .016, .003])); } return d; };
  const green = p => smin(stem(p), leaf(p), .01);
  const petals = p => { let d = 1e9; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, F = frame([Math.cos(a), .35, Math.sin(a)]), [u, w, v] = toFrame(p, [Math.cos(a) * .045, .315, Math.sin(a) * .045], F); d = Math.min(d, ellLocal([u, w, v - u * u * 4], [.042, .03, .004])); } return d; };
  const heart = p => sph(p, [0, .318, 0], .02) + (noise(p[0] * 400, p[1] * 400, p[2] * 400) - .5) * .003;
  const GR = hexLin('#4f8a3a'), GD = hexLin('#2e5a22'), WH = hexLin('#ffffff'), CEN = hexLin('#e8a83a');
  return { name: 'flower', bones: [['base', null, V3(0, 0, 0)]], weights: () => [[0, 1]], budget: .12, errScale: 4, meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J: { head: [0, 0, 0] } },
    pieces: [
      { name: 'green', mat: 'cloth', sdf: green, lo: [-.08, -.005, -.08], hi: [.08, .31, .08], step: .0025, paint: p => lerp3(GD, GR, clamp(p[1] * 3, 0, 1)), ao: true },
      { name: 'petals', mat: 'petal', sdf: petals, lo: [-.11, .27, -.11], hi: [.11, .36, .11], step: .0022, paint: p => lerp3(mul3(WH, .7), WH, clamp(Math.hypot(p[0], p[2]) / .08, 0, 1)), ao: true },
      { name: 'heart', mat: 'cloth', sdf: heart, lo: [-.025, .29, -.025], hi: [.025, .345, .025], step: .0015, paint: () => CEN },
    ] };
}
// A cursed amethyst cluster rising from a broken stone plinth.
export function cursedCrystal() {
  const hex6 = (q, r) => { const a = Math.abs(q[0]), b = Math.abs(q[2]); return Math.max(a * .866 + b * .5, b) - r; };
  const rotZ = (q, a) => [q[0] * Math.cos(a) + q[1] * Math.sin(a), -q[0] * Math.sin(a) + q[1] * Math.cos(a), q[2]];
  const crys = (p, c, h, r, a) => { const q = rotZ([p[0] - c[0], p[1] - c[1], p[2] - c[2]], a), tip = h * .72, rr = q[1] > tip ? r * (1 - (q[1] - tip) / (h - tip)) : r; return Math.max(hex6(q, Math.max(rr, 0)), -q[1], q[1] - h); };
  const amethyst = p => Math.min(crys(p, [0, .3, 0], .6, .075, .1), crys(p, [-.09, .3, .04], .34, .045, .5), crys(p, [.09, .3, -.03], .38, .05, -.45), crys(p, [.03, .3, .09], .22, .03, -.2));
  function stone(p) {
    const n = (noise(p[0] * 25, p[1] * 25, p[2] * 25) - .5) * .012;
    let d = _box(p, [0, .09, 0], [.19, .09, .19], .02);
    const q = [p[0] * Math.cos(.4) - p[2] * Math.sin(.4), p[1], p[0] * Math.sin(.4) + p[2] * Math.cos(.4)];
    d = Math.min(d, Math.max(_box(q, [.02, .25, 0], [.14, .07, .14], .015), p[1] - .3 + (q[0] + q[2]) * .25));   // broken upper block
    d = smax(d, -_box(p, [.19, .12, .05], [.04, .05, .03], .01), .01);   // chipped corner
    for (let i = 0; i < 3; i++) d = Math.min(d, ell(p, [Math.cos(i * 2.2) * .26, .025, Math.sin(i * 2.2) * .24], [.05, .03, .04]));   // rubble
    return d + n;
  }
  const ST = hexLin('#5a5466'), SD = hexLin('#2e2a38'), AM = hexLin('#b47bff'), AD = hexLin('#5a1aa8');
  return { name: 'cursedCrystal', bones: [['base', null, V3(0, 0, 0)]], weights: () => [[0, 1]], budget: .3, errScale: 3, meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J: { head: [0, 0, 0] } },
    pieces: [
      { name: 'stone', mat: 'rock', sdf: stone, lo: [-.32, -.01, -.3], hi: [.32, .34, .3], step: .004, paint: (p, n) => lerp3(ST, SD, clamp(.3 + (noise(p[0] * 20, p[1] * 20, p[2] * 20) - .5) * .9 - n[1] * .2, 0, 1)), ao: true },
      { name: 'amethyst', mat: 'amethyst', sdf: amethyst, lo: [-.2, .28, -.15], hi: [.2, .92, .17], step: .0035, paint: p => lerp3(AD, AM, clamp((p[1] - .3) * 1.8 + noise(p[0] * 30, p[1] * 30, p[2] * 30) * .3, 0, 1)) },
    ] };
}

/* ---------- breakables and treasure ---------- */
import { cappedConeY as _ccone } from '../sdf.mjs';
const one = { bones: [['base', null, V3(0, 0, 0)]], weights: () => [[0, 1]], meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J: { head: [0, 0, 0] } }, errScale: 3 };
const staves = (p, base, dark) => { const a = Math.atan2(p[0], p[2]), k = Math.abs(((a / (Math.PI * 2) * 16) % 1 + 1) % 1 - .5) < .03; const g = noise(a * 8, p[1] * 40, 0); return mul3(lerp3(hexLin(base), hexLin(dark), clamp(g * .6 + (k ? .5 : 0), 0, 1)), .9 + noise(p[0] * 200, p[1] * 200, p[2] * 200) * .15); };
function barrelSDF(p, H = .5, R = .17) { const y = clamp(p[1] / H, 0, 1), r = R + Math.sin(y * Math.PI) * .035; return Math.max(Math.hypot(p[0], p[2]) - r - Math.abs(Math.sin(Math.atan2(p[0], p[2]) * 8)) * .002, -p[1], p[1] - H) + (noise(p[0] * 60, p[1] * 60, p[2] * 60) - .5) * .002; }
const hoops = (p, H = .5, R = .17) => { let d = 1e9; for (const y of [.05, .17, .33, .45]) { const r = R + Math.sin(y / H * Math.PI) * .035 + .004; d = Math.min(d, Math.max(Math.abs(Math.hypot(p[0], p[2]) - r) - .006, Math.abs(p[1] - y) - .014)); } return d; };
export function barrel() {
  return { name: 'barrel', ...one, budget: .2, pieces: [
    { name: 'wood', mat: 'wood', sdf: p => smin(barrelSDF(p), Math.max(_box(p, [0, .5, 0], [.15, .006, .15]), Math.hypot(p[0], p[2]) - .17), .004), lo: [-.23, -.01, -.23], hi: [.23, .52, .23], step: .004, paint: p => staves(p, '#a0703e', '#5e3c20'), ao: true },
    { name: 'hoops', mat: 'metal', sdf: p => hoops(p), lo: [-.23, .02, -.23], hi: [.23, .48, .23], step: .003, paint: () => hexLin('#4a4650') },
  ] };
}
export function keg() {   // a red powder keg with a fuse: it explodes when broken
  const mark = p => { const q = [p[0], p[1] - .25]; return p[2] > .1 && Math.hypot(q[0], q[1]) < .055; };
  return { name: 'keg', ...one, budget: .2, pieces: [
    { name: 'wood', mat: 'wood', sdf: p => barrelSDF(p, .46, .16), lo: [-.22, -.01, -.22], hi: [.22, .48, .22], step: .004, paint: p => mark(p) ? hexLin('#f0e0b0') : staves(p, '#b8382a', '#5a1410'), ao: true },
    { name: 'hoops', mat: 'metal', sdf: p => Math.min(hoops(p, .46, .16), cone(p, [0, .46, 0], [.03, .55, .02], .008, .005)), lo: [-.22, .02, -.22], hi: [.22, .57, .22], step: .003, paint: (p) => p[1] > .47 ? hexLin('#3a2a1a') : hexLin('#2e2a30') },
  ] };
}
export function chestBody() {
  const body = p => _box(p, [0, .14, 0], [.24, .14, .16], .015);
  const trim = p => { let d = 1e9; for (const x of [-.18, .18]) d = Math.min(d, _box(p, [x, .14, 0], [.022, .145, .165], .004)); d = Math.min(d, _box(p, [0, .25, .163], [.04, .045, .008], .004)); return d; };   // straps and the lock plate
  return { name: 'chestBody', ...one, budget: .25, pieces: [
    { name: 'wood', mat: 'wood', sdf: body, lo: [-.27, -.01, -.19], hi: [.27, .3, .19], step: .004, paint: p => mul3(lerp3(hexLin('#8a5a32'), hexLin('#4e301a'), clamp(noise(p[0] * 6, p[1] * 60, p[2] * 6) * .7 + (Math.abs(((p[1] * 12) % 1) - .5) > .46 ? .5 : 0), 0, 1)), 1), ao: true },
    { name: 'trim', mat: 'gold', sdf: trim, lo: [-.22, -.01, -.19], hi: [.22, .3, .19], step: .003, paint: () => hexLin('#e8b85a') },
  ] };
}
export function chestLid() {   // hinge on the x axis at the back top edge (origin), lid extends toward +z
  const lid = p => Math.max(Math.hypot(p[1], p[2] - .16) - .16, -p[1], Math.abs(p[0]) - .24);
  const trim = p => { let d = 1e9; for (const x of [-.18, .18]) d = Math.min(d, Math.max(Math.abs(Math.hypot(p[1], p[2] - .16) - .16) - .006, -p[1], Math.abs(p[0] - x) - .022)); return d; };
  return { name: 'chestLid', ...one, budget: .2, pieces: [
    { name: 'wood', mat: 'wood', sdf: lid, lo: [-.26, -.01, -.02], hi: [.26, .18, .34], step: .004, paint: p => mul3(lerp3(hexLin('#8a5a32'), hexLin('#4e301a'), noise(p[0] * 60, p[1] * 6, p[2] * 6) * .7), 1), ao: true },
    { name: 'trim', mat: 'gold', sdf: trim, lo: [-.22, -.01, -.02], hi: [.22, .18, .34], step: .003, paint: () => hexLin('#e8b85a') },
  ] };
}
