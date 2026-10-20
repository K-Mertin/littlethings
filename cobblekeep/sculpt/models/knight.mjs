// Haunted knight: full plate over mail, a great helm with a glowing visor slit, a red tabard and
// plume. Sword and shield are added at load time. Facing +z, feet on y = 0.
import { V3, clamp, smin, smax, cone, ell, sph, box, noise, hexLin, lerp3, mul3, limbWeights, torusY, shell, mir, len } from '../sdf.mjs';
import { biped } from './humanoid.mjs';

export function knightModel({ name = 'knight', steel = '#c7cbd6', tabard = '#8e1a2e', plume = '#c0283a' } = {}) {
  const H = biped({ hipY: .5, chestY: .72, neckY: .84, shX: .17, shY: .78, elbow: [.25, .6, 0], wrist: [.28, .45, .05], hipX: .08, knee: [.09, .27, .03], ankle: [.09, .07, -.01], toe: [.095, .02, .11] });
  const { J, mid } = H, HC = V3(0, .91, .01);
  const R = { chest: [.15, .1, .1], waist: [.12, .08, .09], pelvis: [.12, .07, .09], neck: .05, upper: [.045, .038], fore: [.038, .032], hand: [.03, .035, .025], thigh: [.068, .05], shin: [.046, .036], foot: [.04, .03] };
  const mailSDF = p => H.body(p, R);
  const side = (k, s) => s > 0 ? J[k + 'L'] : J[k + 'R'];
  function helmSDF(p) {
    let d = ell(p, HC, V3(.096, .11, .104));
    d = smin(d, box(p, V3(0, .885, .05), V3(.085, .07, .06), .03), .03);         // flat-faced great helm
    d = smax(d, -box(p, V3(0, .915, .11), V3(.07, .009, .04)), .004);            // visor slit
    d = smax(d, -box(p, V3(0, .87, .12), V3(.006, .028, .04)), .003);            // breathing slot
    d = smin(d, box(p, V3(0, .985, .0), V3(.008, .02, .1), .006), .012);        // crest ridge
    d = smin(d, cone(p, V3(0, .8, 0), V3(0, .84, .005), .085, .09), .02);         // gorget
    return d;
  }
  function plateSDF(p) {
    const t = smin(ell(p, J.chest, V3(.158, .12, .112)), ell(p, mid(J.hip, J.chest, .5), V3(.13, .09, .1)), .05);
    let d = Math.max(shell(t, 0, .009), p[1] - .82, .585 - p[1]);
    d = smin(d, cone(p, V3(0, .63, .118), V3(0, .8, .12), .012, .012), .02);      // centre ridge
    for (let i = 0; i < 3; i++) { const y = .58 - i * .028, f = ell(p, V3(0, y, .005), V3(.135 + i * .006, .03, .102 + i * .004)); d = Math.min(d, Math.max(shell(f, 0, .006), y - .012 - p[1], p[1] - y - .014)); }   // fauld bands
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) { const cy = .815 - i * .03, c = V3((.165 + i * .012) * s, cy, -.01), f = ell(p, c, V3(.075 + i * .006, .05, .078)); d = Math.min(d, Math.max(shell(f, 0, .007), cy - .012 - p[1], .09 - p[0] * s)); }   // layered pauldrons
      d = Math.min(d, sph(p, side('el', s), .045));                                      // couter
      d = smin(d, cone(p, side('el', s), side('wr', s), .046, .04), .01);                  // vambrace
      const hd = mid(side('wr', s), side('hd', s), .5); d = Math.min(d, box(p, hd, V3(.034, .045, .034), .018));   // gauntlet
      d = Math.min(d, Math.max(shell(cone(p, side('hp', s), side('kn', s), .078, .06), 0, .008), .3 - p[1], p[1] - .5));   // cuisse
      d = Math.min(d, Math.max(shell(cone(p, [side('hp', s)[0] * 1.15, .54, .0], [side('hp', s)[0] * 1.3, .4, .01], .085, .09), 0, .007), .395 - p[1]));   // tasset
      const kn = side('kn', s); d = Math.min(d, ell(p, [kn[0], kn[1], kn[2] + .02], V3(.05, .045, .045)));   // poleyn
      d = smin(d, cone(p, [kn[0], kn[1] - .03, kn[2]], side('an', s), .056, .046), .01);   // greave
      d = smin(d, ell(p, [kn[0], kn[1] - .07, kn[2] - .02], V3(.05, .06, .045)), .02);   // calf of the greave
      d = Math.min(d, cone(p, [side('an', s)[0], .045, -.03], [side('to', s)[0], .035, .125], .048, .03));   // sabaton
    }
    return d + (noise(p[0] * 40, p[1] * 40, p[2] * 40) - .5) * .0015;
  }
  function goldSDF(p) {
    let d = torusY(p, V3(0, .6, .005), .14, .012);                                // belt
    for (const s of [-1, 1]) d = Math.min(d, Math.max(shell(ell(p, V3(.189 * s, .755, -.01), V3(.087, .05, .086)), 0, .008), Math.abs(p[1] - .745) - .008, .09 - p[0] * s));   // pauldron rim
    d = Math.min(d, box(p, V3(0, .6, .155), V3(.03, .025, .012), .008));           // buckle
    return d;
  }
  function tabardSDF(p) {
    const t = ell(p, V3(0, .47, 0), V3(.14, .1, .115)); let d = Math.max(Math.abs(t - .01) - .006, Math.abs(p[0]) - .075 - (.55 - p[1]) * .08, p[1] - .585, .26 - p[1], -Math.abs(p[2]) + .04);
    return d + (noise(p[0] * 30, p[1] * 8, 0) - .5) * .006;
  }
  function plumeSDF(p) {
    const C = [V3(0, 1.0, .02), V3(0, 1.04, -.06), V3(0, 1.0, -.15), V3(0, .92, -.2)]; let d = 1e9;
    for (let i = 0; i < 3; i++) d = smin(d, cone(p, C[i], C[i + 1], .03 - i * .006, .024 - i * .007), .02);
    return d + (noise(p[0] * 30, p[1] * 120, p[2] * 30) - .5) * .012;
  }
  const ST = hexLin(steel), MAIL = hexLin('#5d6270'), GOLD = hexLin('#e8b85a'), TB = hexLin(tabard), PL = hexLin(plume), DK = hexLin('#2a2a30');
  const paintSteel = (p, n) => { const s = .82 + noise(p[0] * 30, p[1] * 30, p[2] * 30) * .25 - (noise(p[0] * 9, p[1] * 9, p[2] * 9) > .68 ? .25 : 0); return mul3(ST, s); };
  const paintMail = p => mul3(MAIL, (Math.sin(p[1] * 900) * Math.sin(p[0] * 900 + p[2] * 900) > .2 ? 1.15 : .75));
  const star = (x, y) => { const a = Math.atan2(y, x), r = Math.hypot(x, y), k = Math.cos(5 * a) * .5 + .5; return r < .022 + k * .022; };
  const paintTabard = p => { let c = mul3(TB, .85 + noise(p[0] * 40, p[1] * 40, 0) * .25); if (Math.abs(Math.abs(p[0]) - .07 - (.55 - p[1]) * .08) < .008 || p[1] < .275) c = GOLD; return c; };
  const paintPlume = p => mul3(PL, .7 + noise(p[0] * 40, p[1] * 160, p[2] * 40) * .5);
  const headTest = p => p[1] > .8 && helmSDF(p) < .02 || p[1] > .9;
  return {
    name, bones: H.bones, budget: 1,
    weights: (p, piece) => piece === 'helm' || piece === 'plume' ? [[3, 1]] : piece === 'tabard' ? limbWeights(p, [H.bones[0], ...H.bones.slice(10)], H.segs, .003).map(([i, w]) => [i === 0 ? 0 : i + 9, w]) : H.weights(p, headTest),
    meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J, visor: [0, .915, .1] },
    pieces: [
      { name: 'mail', mat: 'metal', sdf: mailSDF, lo: [-.36, 0, -.16], hi: [.36, .86, .2], step: .007, paint: paintMail, ao: true },
      { name: 'plate', mat: 'steel', sdf: plateSDF, lo: [-.3, 0, -.16], hi: [.3, .88, .2], step: .0055, paint: paintSteel, ao: true },
      { name: 'helm', mat: 'steel', sdf: helmSDF, lo: [-.12, .76, -.12], hi: [.12, 1.02, .16], step: .004, paint: paintSteel, ao: true },
      { name: 'gold', mat: 'gold', sdf: goldSDF, lo: [-.3, .57, -.12], hi: [.3, .8, .2], step: .004, paint: () => GOLD },
      { name: 'tabard', mat: 'cloth', sdf: tabardSDF, lo: [-.16, .24, -.14], hi: [.16, .6, .14], step: .005, paint: paintTabard, ao: true },
      { name: 'plume', mat: 'cloth', sdf: plumeSDF, lo: [-.05, .88, -.25], hi: [.05, 1.08, .06], step: .004, paint: paintPlume, ao: true },
    ],
  };
}
export const knight = () => knightModel();
