// Imp mage (and the Dark Wizard, a taller variant): a sly little caster in a flared robe and a
// crooked hat, floating just above the ground. Facing +z; robe hem at y = 0.
import { V3, clamp, smin, smax, cone, ell, ellLocal, sph, mir, noise, frame, toFrame, hexLin, lerp3, mul3, limbWeights, torusY, len } from '../sdf.mjs';

export function impModel({ name = 'imp', robe = '#2f3f8f', robeDk = '#141a46', hat = '#3f2a7a', skin = '#9b62cf', skinDk = '#5e3488', trim = '#e8b85a', tall = 1, beard = false } = {}) {
  const T = tall, Y = y => y * T;   // the Dark Wizard stretches the robe, not the head
  const H = V3(0, Y(.6) + .08, .02), hy = H[1];
  const J = { hip: V3(0, Y(.2), 0), spine: V3(0, Y(.38), 0), chest: V3(0, Y(.52), 0), head: V3(0, hy - .07, .01),
    shL: V3(.1, Y(.53), 0), elL: V3(.17, Y(.44), .06), wrL: V3(.2, Y(.37), .1), shR: V3(-.1, Y(.53), 0), elR: V3(-.18, Y(.44), .04), wrR: V3(-.22, Y(.37), .07) };
  // a leaf-shaped ear swept up and back
  const EAR = [-1, 1].map(s => { const F = frame([s, .5, -.32]); if (F.v[2] < 0) F.v = F.v.map(x => -x); const L = .085, b = V3(.085 * s, hy + .005, -.005); return { ...F, L, c: [b[0] + F.u[0] * L * .85, b[1] + F.u[1] * L * .85, b[2] + F.u[2] * L * .85] }; });
  function ear(p) { let best = 1e9, inner = 1e9; for (const E of EAR) { const [a, b0, c0] = toFrame(p, E.c, E), t = clamp((a + E.L) / (2 * E.L), 0, 1), b = b0 - t * t * .015, c = c0 + t * t * .01, W = .04 * (1 - .75 * Math.pow(t, 1.2)) + .003, Th = .012 * (1 - .4 * t) + .006; const hol = ellLocal([a - .008, b, c - Th * .9], [E.L * .75, W * .6, Th * .6]); const e = smax(ellLocal([a, b, c], [E.L, W, Th]), -hol, .005); if (e < best) { best = e; inner = hol; } } return [best, inner]; }
  const MOUTH = [V3(-.032, hy - .055, .088), V3(.038, hy - .047, .085)];
  function headSDF(p) {
    let d = ell(p, V3(0, hy + .012, 0), V3(.095, .1, .098));                       // cranium
    d = smin(d, cone(p, V3(0, hy - .01, .035), V3(0, hy - .095, .072), .072, .018), .04);   // narrow jaw, pointed chin
    for (const s of [-1, 1]) {
      d = smin(d, ell(p, V3(.055 * s, hy - .025, .058), V3(.034, .028, .03)), .025); // cheekbones
      d = smax(d, -sph(p, V3(.04 * s, hy + .005, .09), .025), .01);                 // eye sockets
      d = smin(d, cone(p, V3(.012 * s, hy + .025, .093), V3(.072 * s, hy + .045, .07), .012, .01), .016);   // brows rising outward: scheming
      d = smin(d, cone(p, V3(.045 * s, hy + .085, .03), V3(.062 * s, hy + .135, -.005), .017, .004), .012); // horn nubs
    }
    d = smin(d, cone(p, V3(0, hy + .005, .095), V3(0, hy - .022, .125), .016, .006), .012);   // small pointed nose
    d = smax(d, -cone(p, MOUTH[0], MOUTH[1], .006, .006), .005);                    // a sideways smirk
    d = smin(d, ear(p)[0], .014);
    d = smin(d, cone(p, V3(0, hy - .1, -.005), V3(0, hy - .05, .01), .034, .034), .02);   // neck
    return d;
  }
  // hands: the right holds the staff, the left is a clawed casting hand
  function handsSDF(p) {
    let d = ell(p, J.wrR, V3(.026, .03, .026));
    for (let k = 0; k < 4; k++) d = smin(d, sph(p, V3(J.wrR[0] - .012, J.wrR[1] - .012, J.wrR[2] - .02 + k * .013), .01), .007);
    let l = ell(p, J.wrL, V3(.024, .03, .022));
    for (const dx of [-.012, 0, .012]) l = smin(l, cone(p, V3(J.wrL[0] + dx, J.wrL[1] - .01, J.wrL[2] + .01), V3(J.wrL[0] + dx * 1.3, J.wrL[1] - .055, J.wrL[2] + .03), .008, .003), .006);
    return Math.min(d, l);
  }
  function tailSDF(p) {
    const P = [V3(0, Y(.12), -.2), V3(0, Y(.1), -.32), V3(.07, Y(.16), -.42), V3(.11, Y(.29), -.41)];
    let d = 1e9; for (let i = 0; i < 3; i++) d = smin(d, cone(p, P[i], P[i + 1], .016 - i * .003, .013 - i * .003), .01);
    const F = frame([.2, 1, .1]); return smin(d, ellLocal(toFrame(p, V3(.12, Y(.33), -.41), F), [.038, .05, .009]), .01);   // spade tip
  }
  const skinSDF = p => Math.min(headSDF(p), handsSDF(p), tailSDF(p)) + (noise(p[0] * 50, p[1] * 50, p[2] * 50) - .5) * .002;
  const rR = y => .25 - .2 * clamp(y / Y(.52), 0, 1) ** .8 + .012 * Math.max(0, 1 - y / Y(.15));
  function robeSDF(p) {
    const a = Math.atan2(p[0], p[2]), y = p[1], fold = .012 * Math.sin(a * 9 + Math.sin(a * 3) * .8) * (1 - clamp(y / Y(.55), 0, 1));
    const hem = (noise(a * 3, 0, 0) - .5) * .02;
    let d = (Math.hypot(p[0], p[2] * 1.08) - rR(y) - fold) * .85; d = Math.max(d, hem - y, y - Y(.56));
    d = smin(d, ell(p, V3(0, Y(.52), 0), V3(.12, .06, .1)), .04);                   // shoulders
    for (const s of [-1, 1]) {                                                      // wide sleeves
      const sh = mir(J.shL, 1), el = s > 0 ? J.elL : J.elR, wr = s > 0 ? J.wrL : J.wrR;
      d = smin(d, cone(p, V3(.085 * s, Y(.53), 0), el, .038, .042), .03);
      let sl = cone(p, el, [wr[0] * .92, wr[1] + .02, wr[2] * .85], .042, .058);
      sl = smax(sl, -cone(p, [wr[0] * .9, wr[1] + .02, wr[2] * .82], [wr[0] * 1.05, wr[1] + .01, wr[2] * 1.2], .044, .05), .006);   // open cuff
      d = smin(d, sl, .015);
    }
    return d;
  }
  function hatSDF(p) {
    const tilt = [0, -.01, -.025], b = [H[0], hy + .095, H[2] - .012];
    let d = ellLocal([p[0] - b[0], (p[1] - b[1]) + (p[2] - b[2]) * .12, p[2] - b[2]], [.2, .011, .19]);   // wide brim, tipped back a little
    const C = [b, [0, hy + .2, -.045], [.02, hy + .3, -.1], [.075, hy + .36, -.16], [.13, hy + .36, -.2]], R = [.098, .07, .045, .022, .008];
    for (let i = 0; i < 4; i++) d = smin(d, cone(p, C[i], C[i + 1], R[i], R[i + 1]), .02);   // crooked, bent crown
    return d + (noise(p[0] * 40, p[1] * 40, p[2] * 40) - .5) * .003;
  }
  const trimSDF = p => Math.min(torusY(p, V3(0, .03, 0), rR(.03) + .002, .012), torusY(p, V3(0, Y(.54), 0), .1, .013), torusY(p, V3(0, hy + .112, -.015), .1, .011));
  function beardSDF(p) {   // a full beard from the cheeks, parting into two long points
    if (!beard) return 1e9;
    let d = ell(p, V3(0, hy - .065, .07), V3(.075, .05, .045));
    for (const s of [-1, 1]) d = smin(d, cone(p, V3(.03 * s, hy - .09, .08), V3(.045 * s, hy - .26, .1), .045, .01), .03);
    d = smax(d, -ell(p, V3(0, hy - .04, .115), V3(.04, .018, .03)), .01);   // clear the mouth
    return d + (noise(p[0] * 70, p[1] * 18, p[2] * 70) - .5) * .01;
  }
  function collarSDF(p) {   // a tall, flared collar standing behind the head
    if (!beard) return 1e9;
    const y = p[1] - (hy - .12), r = .1 + y * .55, a = Math.atan2(p[0], p[2]);
    let d = Math.abs(Math.hypot(p[0], p[2] + .01) - r) - .008; d = Math.max(d, -y, y - .2 + Math.cos(a * 2) * .02, Math.cos(a) - .15);
    return d;
  }

  const SK = hexLin(skin), SD = hexLin(skinDk), HORN = hexLin('#2d1c3d'), MO = hexLin('#2a0c22'), EARC = hexLin('#e08ab8');
  function paintSkin(p, n) {
    const v = noise(p[0] * 16, p[1] * 16, p[2] * 16); let c = lerp3(SK, SD, clamp(.25 + (v - .5) * .8 + (n[1] < -.3 ? .2 : 0) - (n[2] > .5 ? .12 : 0), 0, 1));
    if (p[1] > hy + .08 && Math.abs(p[0]) > .035 && Math.abs(p[0]) < .075 && p[2] > -.02) c = lerp3(c, HORN, clamp((p[1] - hy - .08) / .04, 0, 1));
    if (len([p[0], p[1] - hy, p[2]]) < .2) { const m = cone(p, MOUTH[0], MOUTH[1], .006, .006); if (m < .008) c = lerp3(c, MO, clamp(1 - m / .008, 0, 1) * .85); const inn = ear(p)[1]; if (inn < .005) c = lerp3(c, EARC, clamp(1 - inn / .005, 0, 1) * .45); }
    if (p[2] < -.3) c = lerp3(c, HORN, clamp((-p[2] - .3) * 6, 0, 1) * .7);           // tail darkens to the tip
    if (len([p[0] - J.wrL[0], p[1] - J.wrL[1] + .05, p[2] - J.wrL[2] - .025]) < .02) c = lerp3(c, HORN, .7);   // claws
    return mul3(c, .92 + noise(p[0] * 70, p[1] * 70, p[2] * 70) * .16);
  }
  const RB = hexLin(robe), RD = hexLin(robeDk);
  const paintRobe = (p, n) => mul3(lerp3(RB, RD, clamp(.2 + (noise(p[0] * 12, p[1] * 12, p[2] * 12) - .5) * .6 + (1 - p[1] / Y(.56)) * .25, 0, 1)), .9 + noise(p[0] * 90, p[1] * 90, p[2] * 90) * .2);
  const HT = hexLin(hat), paintHat = p => mul3(HT, .78 + noise(p[0] * 18, p[1] * 18, p[2] * 18) * .4);
  const TR = hexLin(trim), paintTrim = p => mul3(TR, .85 + noise(p[0] * 60, p[1] * 60, p[2] * 60) * .3);
  const BE = hexLin('#dfe4ee'), paintBeard = p => mul3(BE, .75 + noise(p[0] * 80, p[1] * 30, p[2] * 80) * .35);

  const bones = [['hips', null, J.hip], ['spine', 'hips', J.spine], ['chest', 'spine', J.chest], ['head', 'chest', J.head],
    ['armL', 'chest', J.shL], ['foreL', 'armL', J.elL], ['handL', 'foreL', J.wrL], ['armR', 'chest', J.shR], ['foreR', 'armR', J.elR], ['handR', 'foreR', J.wrR],
    ['tail', 'hips', V3(0, Y(.12), -.2)], ['tailTip', 'tail', V3(0, Y(.1), -.33)]];
  const segs = { hips: [V3(0, 0, 0), V3(0, Y(.3), 0)], spine: [V3(0, Y(.3), 0), V3(0, Y(.45), 0)], chest: [V3(0, Y(.45), 0), V3(0, Y(.58), 0)],
    armL: [J.shL, J.elL, 1], foreL: [J.elL, J.wrL, 1], handL: [J.wrL, [J.wrL[0], J.wrL[1] - .06, J.wrL[2] + .03], 1], armR: [J.shR, J.elR, -1], foreR: [J.elR, J.wrR, -1], handR: [J.wrR, [J.wrR[0], J.wrR[1] - .03, J.wrR[2]], -1],
    tail: [V3(0, Y(.12), -.2), V3(0, Y(.1), -.32)], tailTip: [V3(0, Y(.1), -.32), V3(.11, Y(.3), -.41)] };
  function weights(p, piece) {
    if (piece === 'hat' || piece === 'beard' || piece === 'collar') return [[3, 1]];
    if (piece === 'trim' && p[1] > hy) return [[3, 1]];
    if (p[1] > hy - .12 && headSDF(p) < .02 && p[2] > -.15) return [[3, 1]];
    if ((piece === 'robe' || piece === 'trim') && p[1] < Y(.45)) return limbWeights(p, bones.slice(0, 3), segs, .004);   // the skirt follows the body, never the hands
    return limbWeights(p, bones, segs, .0016);
  }
  const R = .3;
  return {
    name, bones, weights, meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J, eyes: [[.04, hy + .005, .082], [-.04, hy + .005, .082]], eyeR: .021 },
    pieces: [
      { name: 'skin', mat: 'skin', sdf: skinSDF, lo: [-.24, 0, -.46], hi: [.24, hy + .16, .15], step: .005, paint: paintSkin, ao: true },
      { name: 'robe', mat: 'cloth', sdf: robeSDF, lo: [-R, -.02, -R], hi: [R, Y(.6), R], step: .006, paint: paintRobe, ao: true },
      { name: 'hat', mat: 'cloth', sdf: hatSDF, lo: [-.22, hy + .07, -.24], hi: [.22, hy + .4, .2], step: .005, paint: paintHat, ao: true },
      { name: 'trim', mat: 'gold', sdf: trimSDF, lo: [-R, 0, -R], hi: [R, hy + .14, R], step: .005, paint: paintTrim },
      ...(beard ? [{ name: 'collar', mat: 'cloth', sdf: collarSDF, lo: [-.24, hy - .14, -.24], hi: [.24, hy + .12, .12], step: .005, paint: p => mul3(hexLin('#3d2358'), .8 + noise(p[0] * 30, p[1] * 30, p[2] * 30) * .3), ao: true }, { name: 'beard', mat: 'cloth', sdf: beardSDF, lo: [-.09, hy - .3, .02], hi: [.09, hy - .02, .14], step: .005, paint: paintBeard, ao: true }] : []),
    ],
  };
}
export const imp = () => impModel();
export const darkWizard = () => impModel({ name: 'darkWizard', robe: '#2a1a3e', robeDk: '#0b0614', hat: '#1c1028', skin: '#c9d2e6', skinDk: '#7d86a6', trim: '#c9a2ff', tall: 1.25, beard: true });
