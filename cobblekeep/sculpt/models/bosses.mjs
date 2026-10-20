// Mummy King and Frost Giant, both on the shared biped skeleton. Facing +z, feet on y = 0.
import { V3, clamp, smin, smax, cone, ell, sph, box, noise, hexLin, lerp3, mul3, limbWeights, torusY, shell, len, mix } from '../sdf.mjs';
import { biped } from './humanoid.mjs';

export function mummyModel() {
  const S = 1.0, H = biped({ S, hipY: .5, chestY: .72, neckY: .84, shX: .15, shY: .78, elbow: [.22, .62, .03], wrist: [.25, .48, .08], hipX: .07, knee: [.08, .27, .03], ankle: [.08, .07, -.01], toe: [.085, .02, .1] });
  const { J } = H, P = (x, y, z) => [x * S, y * S, z * S], HC = P(0, .93, .015);
  const R = { chest: [.13, .095, .085], waist: [.095, .075, .07], pelvis: [.105, .065, .075], neck: .04, upper: [.038, .032], fore: [.032, .025], hand: [.027, .04, .02], thigh: [.052, .038], shin: [.038, .028], foot: [.034, .024] };
  const wraps = p => Math.sin((p[1] + p[0] * .35 + p[2] * .2) * 150 / S) * .0025 * S + (noise(p[0] * 60, p[1] * 60, p[2] * 60) - .5) * .003 * S;
  function headSDF(p) {
    let d = ell(p, HC, P(.08, .095, .085));
    d = smin(d, cone(p, P(0, .92, .05), P(0, .855, .07), .06 * S, .025 * S), .03 * S);         // gaunt jaw
    d = smax(d, -box(p, P(0, .935, .085), P(.065, .014, .03), .006 * S), .008 * S);           // dark gap across the eyes
    return d;
  }
  const strips = p => {   // loose bandage ends hanging from the arms and hips
    let d = 1e9; for (const [x, y, z, l, s] of [[.24, .55, .06, .12, 1], [-.21, .6, .05, .1, -1], [.09, .44, .07, .14, 1], [-.08, .42, -.06, .12, -1]]) { const c = P(x, y - l / 2, z), wav = Math.sin((p[1] / S) * 40) * .008 * S; d = Math.min(d, box([p[0] - wav * s, p[1], p[2]], c, P(.012, l / 2, .002), .001)); }
    return d;
  };
  const wrapSDF = p => Math.min(smin(H.body(p, R), headSDF(p), .025 * S) + wraps(p), strips(p));
  function nemesSDF(p) {   // striped royal headdress with lappets falling over the shoulders
    let d = Math.max(shell(ell(p, [HC[0], HC[1] + .01 * S, HC[2] - .01 * S], P(.098, .11, .104)), 0, .006 * S), (.8 * S + Math.max(0, p[2] + .02 * S) * 1.5) - p[1]);
    d = Math.max(d, p[2] - .03 * S - (p[1] - HC[1]) * .8);   // open at the face
    for (const s of [-1, 1]) d = smin(d, box(p, P(.085 * s, .82, .045), P(.022, .085, .008), .004 * S), .02 * S);
    d = smin(d, cone(p, P(0, .99, .085), P(0, 1.02, .1), .012 * S, .006 * S), .006 * S);       // cobra crest
    return d;
  }
  const collarSDF = p => Math.max(shell(ell(p, P(0, .8, .0), P(.19, .065, .14)), 0, .007 * S), P(0, .79, 0)[1] - p[1] - (Math.abs(p[0]) / S) * .0, p[1] - P(0, .835, 0)[1]);
  const kiltSDF = p => { const t = ell(p, J.hip, P(.112, .085, .084)); return Math.max(shell(t, .006 * S, .005 * S), p[1] - P(0, .56, 0)[1], P(0, .38, 0)[1] - p[1] - (Math.abs(p[0]) < .03 * S && p[2] > 0 ? .06 * S : 0)); };
  const BD = hexLin('#d9cfb0'), DIRT = hexLin('#7a6a4a'), GOLD = hexLin('#f2c14e'), LAPIS = hexLin('#2b4fb8'), DK = hexLin('#140c08');
  const paintWrap = (p, n) => { let c = mul3(BD, .78 + (Math.sin((p[1] + p[0] * .35 + p[2] * .2) * 150 / S) * .5 + .5) * .2 + noise(p[0] * 20, p[1] * 20, p[2] * 20) * .15); c = lerp3(c, DIRT, clamp((noise(p[0] * 6, p[1] * 6, p[2] * 6) - .45) * 2, 0, 1) * .5 + (p[1] < .12 * S ? .25 : 0));
    if (Math.abs(p[1] - P(0, .935, 0)[1]) < .016 * S && p[2] > HC[2] + .04 * S) c = DK; return c; };
  const stripes = (p, a, b) => (Math.floor(p[1] / S * 60) % 2 ? a : b);
  const paintNemes = p => stripes(p, GOLD, LAPIS);
  const paintCollar = p => { const r = Math.hypot(p[0] / 1.35, p[2]) / S; return Math.floor(r * 90) % 3 === 0 ? LAPIS : GOLD; };
  const paintKilt = p => (p[1] > P(0, .54, 0)[1] ? GOLD : mul3(hexLin('#efe6cc'), .85 + noise(p[0] * 30, p[1] * 90, 0) * .2));
  const headTest = p => p[1] > P(0, .86, 0)[1] && headSDF(p) < .02 * S;
  return {
    name: 'mummy', bones: H.bones,
    weights: (p, piece) => piece === 'nemes' ? [[3, 1]] : piece === 'collar' ? [[2, 1]] : H.weights(p, headTest),
    meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J, eyes: [[.032 * S, .935 * S, .085 * S], [-.032 * S, .935 * S, .085 * S]], eyeR: .013 * S },
    pieces: [
      { name: 'wraps', mat: 'cloth', sdf: wrapSDF, lo: P(-.34, -.01, -.16), hi: P(.34, 1.04, .2), step: .0065, paint: paintWrap, ao: true },
      { name: 'nemes', mat: 'gold', sdf: nemesSDF, lo: P(-.13, .72, -.14), hi: P(.13, 1.05, .14), step: .005, paint: paintNemes, ao: true },
      { name: 'collar', mat: 'gold', sdf: collarSDF, lo: P(-.22, .76, -.17), hi: P(.22, .85, .17), step: .005, paint: paintCollar },
      { name: 'kilt', mat: 'cloth', sdf: kiltSDF, lo: P(-.14, .36, -.12), hi: P(.14, .58, .12), step: .005, paint: paintKilt, ao: true },
    ],
  };
}

export function giantModel() {
  const S = 1.04, H = biped({ S, hipY: .46, chestY: .7, neckY: .82, shX: .21, shY: .76, elbow: [.3, .56, .02], wrist: [.33, .38, .07], hipX: .1, knee: [.11, .24, .04], ankle: [.11, .06, -.01], toe: [.12, .02, .12] });
  const { J } = H, P = (x, y, z) => [x * S, y * S, z * S], HC = P(0, .9, .04);
  const R = { chest: [.2, .13, .13], waist: [.16, .1, .12], pelvis: [.15, .08, .1], neck: .07, upper: [.07, .055], fore: [.062, .05], hand: [.05, .055, .045], thigh: [.085, .065], shin: [.065, .05], foot: [.06, .04] };
  function headSDF(p) {
    let d = ell(p, HC, P(.085, .085, .085));
    d = smin(d, box(p, P(0, .86, .07), P(.07, .045, .04), .03 * S), .03 * S);                 // square jaw
    d = smin(d, cone(p, P(-.07, .93, .105), P(.07, .93, .105), .022 * S, .022 * S), .02 * S); // heavy brow
    for (const s of [-1, 1]) d = smax(d, -sph(p, P(.035 * s, .912, .113), .017 * S), .006 * S);
    d = smin(d, cone(p, P(0, .92, .115), P(0, .875, .14), .022 * S, .026 * S), .012 * S);    // broad nose
    for (const s of [-1, 1]) d = smin(d, cone(p, P(.07 * s, .9, .02), P(.1 * s, .92, -.0), .022 * S, .008 * S), .01 * S);   // small pointed ears
    return d;
  }
  const muscles = p => { let d = 1e9; for (const s of [-1, 1]) { d = Math.min(d, ell(p, P(.08 * s, .73, .09), P(.08, .055, .04))); d = Math.min(d, ell(p, P(.25 * s, .66, .03), P(.06, .08, .06))); d = Math.min(d, ell(p, P(.3 * s, .5, .06), P(.055, .07, .055))); } return d; };
  const skinSDF = p => smin(smin(H.body(p, R), muscles(p), .04 * S), headSDF(p), .03 * S) + (noise(p[0] * 30, p[1] * 30, p[2] * 30) - .5) * .004 * S;
  const furN = p => (noise(p[0] * 70 / S, p[1] * 25 / S, p[2] * 70 / S) - .5) * .02 * S;
  function furSDF(p) {   // white fur kilt, boots and a mantle over the shoulders
    let d = Math.max(shell(ell(p, J.hip, P(.17, .12, .12)), .01 * S, .016 * S), p[1] - P(0, .55, 0)[1], P(0, .3, 0)[1] - p[1] - (noise(p[0] * 20, 0, p[2] * 20) - .5) * .04 * S);
    for (const s of [-1, 1]) d = Math.min(d, Math.max(cone(p, P(.11 * s, .12, -.01), P(.115 * s, .02, .02), .085 * S, .09 * S), p[1] - P(0, .15, 0)[1]));
    d = Math.min(d, Math.max(shell(ell(p, P(0, .76, -.01), P(.27, .1, .17)), 0, .03 * S), P(0, .72, 0)[1] - p[1]));
    return d + furN(p);
  }
  function hairSDF(p) {   // a frozen beard of icicle locks and a mane down the back
    let d = 1e9;
    for (let i = 0; i < 7; i++) { const x = (i - 3) * .022, y0 = .865 - Math.abs(i - 3) * .006; d = smin(d, cone(p, P(x, y0, .105 - Math.abs(i - 3) * .012), P(x * 1.15, y0 - .12 + Math.abs(i - 3) * .025, .12 - Math.abs(i - 3) * .01), .02 * S, .004 * S), .015 * S); }
    d = smin(d, Math.max(shell(ell(p, [HC[0], HC[1] + .01 * S, HC[2] - .012 * S], P(.09, .09, .09)), 0, .012 * S), (HC[1] - .02 * S) - p[1] - Math.max(0, -p[2] + HC[2]) * 2, p[2] - HC[2] - .04 * S), .02 * S);
    return d + (noise(p[0] * 60, p[1] * 20, p[2] * 60) - .5) * .008 * S;
  }
  const bandSDF = p => { let d = 1e9; for (const s of [-1, 1]) { d = Math.min(d, Math.max(shell(cone(p, P(.31 * s, .47, .05), P(.33 * s, .4, .07), .065 * S, .056 * S), 0, .008 * S), Math.abs(p[1] - P(0, .44, 0)[1]) - .025 * S)); } d = Math.min(d, torusY(p, P(0, .555, 0), .17 * S, .012 * S)); return d; };
  const SK = hexLin('#9cc8e8'), SD = hexLin('#5e8ab0'), FUR = hexLin('#e8eef5'), FD = hexLin('#a8b8c8'), ICE = hexLin('#d8f4ff'), ICED = hexLin('#6ab8e8'), IRON = hexLin('#8a96a8');
  const paintSkin = (p, n) => mul3(lerp3(SK, SD, clamp(.25 + (noise(p[0] * 12, p[1] * 12, p[2] * 12) - .5) * .8 + (n[1] < -.2 ? .2 : 0), 0, 1)), .92 + noise(p[0] * 70, p[1] * 70, p[2] * 70) * .16);
  const paintFur = (p, n) => lerp3(FUR, FD, clamp(noise(p[0] * 50, p[1] * 18, p[2] * 50) * .9 - .2 + (n[1] < 0 ? .25 : 0), 0, 1));
  const paintHair = p => lerp3(ICE, ICED, clamp((HC[1] - p[1]) / (.15 * S), 0, 1) * .7 + noise(p[0] * 40, p[1] * 40, p[2] * 40) * .2);
  const headTest = p => p[1] > P(0, .8, 0)[1] && headSDF(p) < .03 * S && p[2] > -.12 * S;
  return {
    name: 'giant', bones: H.bones,
    weights: (p, piece) => piece === 'hair' ? [[3, 1]] : piece === 'fur' && p[1] > P(0, .65, 0)[1] ? limbWeights(p, H.bones.slice(0, 10), H.segs, .004 * S * S) : H.weights(p, headTest, .002 * S * S),
    meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J, eyes: [[.035 * S, .912 * S, .106 * S], [-.035 * S, .912 * S, .106 * S]], eyeR: .013 * S },
    pieces: [
      { name: 'skin', mat: 'skin', sdf: skinSDF, lo: P(-.42, -.01, -.18), hi: P(.42, 1.0, .24), step: .0075, paint: paintSkin, ao: true },
      { name: 'fur', mat: 'cloth', sdf: furSDF, lo: P(-.32, -.01, -.22), hi: P(.32, .86, .22), step: .0075, paint: paintFur, ao: true },
      { name: 'hair', mat: 'ice', sdf: hairSDF, lo: P(-.12, .72, -.08), hi: P(.12, 1.0, .16), step: .005, paint: paintHair, ao: true },
      { name: 'bands', mat: 'metal', sdf: bandSDF, lo: P(-.4, .38, -.16), hi: P(.4, .6, .18), step: .006, paint: () => IRON },
    ],
  };
}
export const mummy = () => mummyModel();
export const giant = () => giantModel();
