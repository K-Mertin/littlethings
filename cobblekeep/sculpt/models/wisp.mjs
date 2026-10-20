// Fire wisp: a cracked ember of charcoal rock with molten light showing through the cracks, eyes
// and mouth burned right through. The flames on top are added at load time and flicker.
// Crystal totem: a carved stone guardian with glowing rune inlays; the crystal it holds is added at load time.
import { V3, clamp, smin, smax, cone, ell, sph, box, noise, hash, hexLin, lerp3, mul3, torusY, len } from '../sdf.mjs';

function voronoi(p, f) {   // distance to the nearest cell edge (F2 - F1) and the cell id
  const x = p[0] * f, y = p[1] * f, z = p[2] * f, xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let d1 = 9, d2 = 9, id = 0;
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, cz = zi + k, px = cx + hash(cx, cy, cz), py = cy + hash(cx + 7, cy, cz), pz = cz + hash(cx, cy + 3, cz + 5), d = Math.hypot(x - px, y - py, z - pz);
    if (d < d1) { d2 = d1; d1 = d; id = hash(cx + 11, cy + 13, cz + 17); } else if (d < d2) d2 = d;
  }
  return [(d2 - d1) / f, id];
}

export function wispModel({ name = 'wisp' } = {}) {
  const C = V3(0, .16, 0), Rr = .15;
  const EYES = [V3(.055, .185, .125), V3(-.055, .185, .125)];
  function rockSDF(p) {
    const [edge, id] = voronoi(p, 14), r = Rr + (id - .5) * .016 + (noise(p[0] * 30, p[1] * 30, p[2] * 30) - .5) * .008;
    let d = Math.max(sph(p, C, r), -sph(p, C, r - .035));
    d = Math.max(d, .006 - edge);                                                   // the cracks between plates
    for (const e of EYES) d = smax(d, -ell(p, e, V3(.03, .02, .05)), .008);          // eyes burned through
    d = smin(d, Math.max(cone(p, V3(-.085, .225, .12), V3(.085, .225, .12), .022, .022), -sph(p, C, Rr - .02)), .01);   // heavy brow
    d = smax(d, -box(p, V3(0, .1, .14), V3(.05, .012 + Math.abs(Math.sin(p[0] * 120)) * .008, .04)), .006);   // jagged mouth
    return d;
  }
  const magmaSDF = p => sph(p, C, Rr - .03);
  const RK = hexLin('#1c1614'), RL = hexLin('#3e322e'), MG = hexLin('#ffb040'), MH = hexLin('#fff2b0'), MR = hexLin('#ff4a10');
  const paintRock = (p, n) => { const v = noise(p[0] * 40, p[1] * 40, p[2] * 40); let c = lerp3(RK, RL, clamp(v * .8 + n[1] * .2, 0, 1)); const [edge] = voronoi(p, 14); c = lerp3(c, MR, clamp(1 - (edge - .006) / .004, 0, 1) * .9); return c; };
  const paintMagma = p => lerp3(MG, MH, clamp(noise(p[0] * 25, p[1] * 25, p[2] * 25) * 1.2 - .2, 0, 1));
  return {
    name, bones: [['core', null, C]], weights: () => [[0, 1]], budget: .5, errScale: 4,
    meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J: { head: C }, C },
    pieces: [
      { name: 'rock', mat: 'rock', sdf: rockSDF, lo: [-.2, -.02, -.2], hi: [.2, .35, .22], step: .004, paint: paintRock, ao: true },
      { name: 'magma', mat: 'glow', sdf: magmaSDF, lo: [-.14, .02, -.14], hi: [.14, .3, .14], step: .008, paint: paintMagma },
    ],
  };
}

export function totemModel({ name = 'totem' } = {}) {
  const taper = p => [p[0] * (1 + (p[1] - .36) * .35), p[1], p[2] * (1 + (p[1] - .36) * .35)];
  const EYES = [V3(.05, .43, .135), V3(-.05, .43, .135)];
  const RUNES = [];   // grooves on the three other faces: zig-zags and bars
  for (const [ax, sg] of [[0, 1], [0, -1], [2, -1]]) for (let i = 0; i < 4; i++) { const y0 = .22 + i * .075, pts = [[-.07, y0], [-.03, y0 + .04], [.01, y0], [.05, y0 + .04], [.075, y0 + .015]]; for (let k = 0; k < pts.length - 1; k++) RUNES.push({ ax, sg, a: pts[k], b: pts[k + 1] }); }
  const runeP = (R, t) => { const [u, y] = [R.a[0] + (R.b[0] - R.a[0]) * t, R.a[1] + (R.b[1] - R.a[1]) * t]; const f = .131 / (1 + (y - .36) * .35); return R.ax === 0 ? [R.sg * f, y, u] : [u, y, R.sg * f]; };
  function runeDist(p) { let d = 1e9; for (const R of RUNES) d = Math.min(d, cone(p, runeP(R, 0), runeP(R, 1), .007, .007)); return d; }
  function stoneSDF(p) {
    const n = (noise(p[0] * 22, p[1] * 22, p[2] * 22) - .5) * .012;
    let d = box(p, V3(0, .06, 0), V3(.23, .06, .23), .02);                        // plinth
    d = Math.min(d, box(p, V3(0, .14, 0), V3(.18, .03, .18), .015));
    d = Math.min(d, box(taper(p), V3(0, .36, 0), V3(.13, .2, .13), .025));        // tapered pillar
    d = smin(d, box(p, V3(0, .475, .13), V3(.13, .022, .035), .01), .01);          // brow slab
    d = smin(d, cone(p, V3(0, .45, .14), V3(0, .37, .175), .02, .03), .01);       // wedge nose
    for (const s of [-1, 1]) { d = smin(d, box(p, V3(.085 * s, .37, .135), V3(.035, .03, .02), .01), .012); d = Math.min(d, box(p, V3(.165 * s, .4, 0), V3(.03, .11, .07), .012)); }   // cheeks, side wings
    for (const e of EYES) d = smax(d, -sph(p, e, .026), .006);                      // deep eye sockets
    d = smax(d, -box(p, V3(0, .3, .15), V3(.065, .012, .04)), .005);              // slot mouth
    d = Math.max(d, .007 - runeDist(p));                                           // carved rune grooves
    d = smin(d, torusY(p, V3(0, .575, 0), .13, .035), .015);   // cap ring
    d = smin(d, Math.max(ell(p, V3(0, .6, 0), V3(.2, .05, .2)), -ell(p, V3(0, .64, 0), V3(.16, .05, .16))), .02);   // flared bowl
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, c = [Math.cos(a), 0, Math.sin(a)]; d = smin(d, cone(p, [c[0] * .17, .62, c[2] * .17], [c[0] * .07, .76, c[2] * .07], .025, .008), .015); }   // claws holding the crystal
    return d + n;
  }
  const glowSDF = p => Math.min(runeDist(p) - .005, ...EYES.map(e => sph(p, [e[0], e[1], e[2] - .012], .018)));
  const ST = hexLin('#7c7488'), SD = hexLin('#3e384a'), MOSS = hexLin('#3c5232'), RU = hexLin('#c79bff');
  const paintStone = (p, n) => { const v = noise(p[0] * 18, p[1] * 18, p[2] * 18); let c = lerp3(ST, SD, clamp(.3 + (v - .5) * .9 - n[1] * .15, 0, 1)); if (p[1] < .14 && noise(p[0] * 9, p[1] * 9, p[2] * 9) > .55) c = lerp3(c, MOSS, .6); return mul3(c, .9 + noise(p[0] * 80, p[1] * 80, p[2] * 80) * .2); };
  return {
    name, bones: [['base', null, V3(0, 0, 0)]], weights: () => [[0, 1]], budget: .7,
    meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J: { head: [0, 0, 0] }, crystal: [0, .82, 0] },
    pieces: [
      { name: 'stone', mat: 'rock', sdf: stoneSDF, lo: [-.26, -.01, -.26], hi: [.26, .8, .26], step: .005, paint: paintStone, ao: true },
      { name: 'runes', mat: 'glow', sdf: glowSDF, lo: [-.15, .18, -.15], hi: [.15, .5, .17], step: .003, paint: () => RU },
    ],
  };
}
export const wisp = () => wispModel();
export const totem = () => totemModel();
