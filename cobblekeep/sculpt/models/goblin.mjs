// Goblin (and the heavier Goblin Chief): 1.0 tall, facing +z, feet on y = 0.
// The head is sculpted in its own space (HOLD) and placed on the body at HC scaled by HK, so its
// proportion to the body can be tuned with one number.
import { V3, sub, dot, clamp, smin, smax, cone, ell, ellLocal, sph, mir, noise, frame, toFrame, hexLin, lerp3, mul3, limbWeights } from '../sdf.mjs';

export function goblinModel({ name = 'goblin', bulk = 1, belly = 1, skin = '#6c963c', skinDk = '#3d5f22', skinLt = '#a3bf68', hk = .72 } = {}) {
  const B = bulk, J = {
    hip: V3(0, .47, 0), spine: V3(0, .56, 0), chest: V3(0, .67, -.005), head: V3(0, .77, .02),
    shL: V3(.135 * (1 + (B - 1) * .6), .715, -.01), elL: V3(.205 * (1 + (B - 1) * .6), .545, -.012), wrL: V3(.245 * (1 + (B - 1) * .5), .395, .03), hdL: V3(.255 * (1 + (B - 1) * .5), .33, .045),
    hpL: V3(.068 * B, .455, 0), knL: V3(.08 * B, .26, .03), anL: V3(.078 * B, .065, -.01), toL: V3(.085 * B, .025, .1),
  };
  for (const k of ['sh', 'el', 'wr', 'hd', 'hp', 'kn', 'an', 'to']) J[k + 'R'] = [-J[k + 'L'][0], J[k + 'L'][1], J[k + 'L'][2]];
  const HOLD = V3(0, .8, .04), HC = V3(0, .858, .05), HK = hk;
  const toHead = p => [(p[0] - HC[0]) / HK + HOLD[0], (p[1] - HC[1]) / HK + HOLD[1], (p[2] - HC[2]) / HK + HOLD[2]];
  const EAR = [-1, 1].map(s => { const F = frame([s, .16, -.34]); if (F.v[2] < 0) F.v = F.v.map(x => -x); const L = .12, base = V3(.122 * s, .82, -.005); return { ...F, L, c: [base[0] + F.u[0] * L * .85, base[1] + F.u[1] * L * .85, base[2] + F.u[2] * L * .85] }; });
  // flat, leaf-shaped ears that taper to a point and droop a little, with a scooped hollow on the front
  function earSDF(q) {
    let best = 1e9, inner = 1e9;
    for (const E of EAR) {
      const [a, b0, c0] = toFrame(q, E.c, E), t = clamp((a + E.L) / (2 * E.L), 0, 1), b = b0 + t * t * .03, c = c0 + t * t * .012;
      const W = .055 * (1 - .72 * Math.pow(t, 1.3)) + .004, T = .02 * (1 - .4 * t) + .008;
      const hol = ellLocal([a - .012, b + .004, c - T * .9], [E.L * .78, W * .62, T * .6]);
      const e = smax(ellLocal([a, b, c], [E.L, W, T]), -hol, .006); if (e < best) { best = e; inner = hol; }
    }
    return [best, inner];
  }
  const MOUTH = [V3(-.068, .715, .12), V3(.068, .715, .12)];
  function headOld(q) {
    let d = ell(q, V3(0, .815, 0), V3(.14, .13, .15));                             // cranium, long at the back
    d = smin(d, cone(q, V3(0, .79, .05), V3(0, .695, .105), .11, .035), .05);      // jaw tapering to a pointed chin
    for (const s of [-1, 1]) {
      d = smin(d, ell(q, V3(.085 * s, .785, .085), V3(.05, .04, .045)), .035);    // cheekbones
      d = smax(d, -sph(q, V3(.054 * s, .805, .132), .033), .012);                 // eye sockets
      d = smin(d, cone(q, V3(.01 * s, .832, .14), V3(.09 * s, .872, .11), .022, .02), .025);   // brows angled down into a scowl
    }
    d = smin(d, cone(q, V3(0, .815, .14), V3(0, .757, .21), .027, .011), .02);    // hooked nose
    d = smin(d, sph(q, V3(0, .76, .195), .016), .02);
    d = smax(d, -cone(q, MOUTH[0], MOUTH[1], .012, .012), .008);                  // wide mouth slit
    d = smin(d, cone(q, V3(-.045, .703, .12), V3(.045, .703, .12), .011, .011), .015);   // lower lip
    return smin(d, earSDF(q)[0], .02);
  }
  const headSDF = p => headOld(toHead(p)) * HK;
  const torsoSDF = p => {
    let d = ell(p, V3(0, .665, -.01), V3(.125 * B, .085, .076 * B));               // chest, flatter at the front
    d = smin(d, ell(p, V3(0, .575, .012 + (belly - 1) * .03), V3(.102 * B * belly, .075 * belly, .08 * B * belly)), .06);   // waist and belly
    return smin(d, ell(p, V3(0, .478, 0), V3(.1 * B, .062, .076 * B)), .05);       // pelvis
  };
  function bodySDF(p) {
    let d = torsoSDF(p);
    d = smin(d, cone(p, V3(0, .72, -.008), V3(0, .8, .03), .04 * B, .033 * B), .035);   // neck, leaning forward
    for (const s of [-1, 1]) {
      const sh = J.shL, el = J.elL, wr = J.wrL;
      d = smin(d, cone(p, V3(0, .75, -.012), mir(V3(sh[0] - .015, .72, -.012), s), .032 * B, .03 * B), .04);   // trapezius
      d = smin(d, ell(p, mir(V3(sh[0] - .01, .708, -.01), s), V3(.046 * B, .04 * B, .046 * B)), .035);        // shoulder
      d = smin(d, cone(p, mir(sh, s), mir(el, s), .034 * B, .026 * B), .025);                                   // upper arm
      d = smin(d, ell(p, mir(V3((sh[0] + el[0]) / 2, .625, .005), s), V3(.03 * B, .05, .03 * B)), .02);       // biceps
      d = smin(d, cone(p, mir(el, s), mir(wr, s), .029 * B, .02 * B), .02);                                    // forearm
      d = smin(d, ell(p, mir(V3(el[0] + .01, .505, -.002), s), V3(.03 * B, .045, .03 * B)), .02);             // forearm muscle
      const hx = J.hdL[0] - .003;
      if (s > 0) {   // open clawed left hand
        d = smin(d, ell(p, V3(hx, .362, .04), V3(.024 * B, .034, .021 * B)), .018);
        for (const dx of [-.012, 0, .012]) d = smin(d, cone(p, V3(hx + dx, .345, .05), V3(hx + .006 + dx * 1.2, .305, .068), .009, .004), .007);
      } else {       // right fist wrapped round the club: knuckles and thumb
        d = smin(d, ell(p, V3(-hx, .36, .043), V3(.027 * B, .03, .027 * B)), .018);
        for (let k = 0; k < 4; k++) d = smin(d, sph(p, V3(-hx - .01, .345, .022 + k * .013), .011 * B), .008);
        d = smin(d, cone(p, V3(-hx + .017, .37, .05), V3(-hx + .014, .352, .068), .01, .008), .006);
      }
      d = smin(d, cone(p, mir(J.hpL, s), mir(J.knL, s), .05 * B, .034 * B), .035);                            // thigh
      d = smin(d, cone(p, mir(J.knL, s), mir(J.anL, s), .033 * B, .021 * B), .02);                            // shin
      d = smin(d, ell(p, mir(V3(J.knL[0], .2, -.006), s), V3(.03 * B, .055, .03 * B)), .02);                  // calf
      d = smin(d, cone(p, mir(V3(J.anL[0], .04, -.025), s), mir(J.toL, s), .033 * B, .02 * B), .022);         // long foot
    }
    return d;
  }
  const skinSDF = p => smin(headSDF(p), bodySDF(p), .02) + (noise(p[0] * 38, p[1] * 38, p[2] * 38) - .5) * .0035;
  // clothes: a leather bandolier and a pauldron of three overlapping plates
  function gearSDF(p) {
    const t = torsoSDF(p);
    let band = Math.max(Math.abs(t - .006) - .006, Math.abs((p[0] - p[1] + .6) * .7071) - .02);
    band = Math.max(band, .46 - p[1], p[1] - .75);
    let guard = 1e9;
    for (let i = 0; i < 3; i++) { const cy = .728 - i * .024, sh = ell(p, V3(J.shL[0] + .003 + i * .01, cy, -.01), V3((.058 + i * .007) * B, .034, (.06 + i * .004) * B)); guard = Math.min(guard, Math.max(Math.abs(sh - .006) - .0045, cy - .006 - p[1], .085 * B - p[0])); }
    return Math.min(band, guard);
  }
  function wrapSDF(p) {   // a ragged loincloth
    let t = ell(p, V3(0, .478, 0), V3(.104 * B, .066, .08 * B));
    for (const s of [-1, 1]) t = smin(t, cone(p, mir(J.hpL, s), mir(V3(J.hpL[0] + .006, .38, .015), s), .054 * B, .048 * B), .03);
    const hem = .385 + (noise(p[0] * 30, 0, p[2] * 30) - .5) * .045 - (Math.abs(p[0]) < .05 && Math.abs(p[2]) > .03 ? .06 : 0);
    return Math.max(Math.abs(t - .006) - .006, p[1] - .52, hem - p[1]);
  }
  const beltSDF = p => { const t = ell(p, V3(0, .515, .006), V3(.104 * B * Math.max(1, belly * .95), .09, .085 * B * Math.max(1, belly * .95))); return Math.max(Math.abs(t - .015) - .008, Math.abs(p[1] - .515) - .015); };

  const SK = hexLin(skin), SD = hexLin(skinDk), SL = hexLin(skinLt), MOUTHC = hexLin('#2a1210'), EARC = hexLin('#c47a6a'), NAIL = hexLin('#2a2018');
  function paintSkin(p, n) {
    const v = noise(p[0] * 14, p[1] * 14, p[2] * 14), fine = noise(p[0] * 60, p[1] * 60, p[2] * 60);
    let c = lerp3(SK, SD, clamp(.25 + (v - .5) * .9 + (n[1] > .5 ? .15 : 0) - (n[2] > .4 ? .12 : 0), 0, 1));
    c = lerp3(c, SL, clamp((n[2] - .3) * .8, 0, 1) * clamp(1 - Math.abs(p[1] - .58) / .08, 0, 1) * .35);   // paler belly
    if (p[1] > .76) {
      const q = toHead(p), m = cone(q, MOUTH[0], MOUTH[1], .012, .012);
      if (m < .012 && q[2] > .1) c = lerp3(c, MOUTHC, clamp(1 - m / .012, 0, 1) * .85);
      const inner = earSDF(q)[1]; if (inner < .006) c = lerp3(c, EARC, clamp(1 - inner / .006, 0, 1) * .55);
    }
    if ((p[1] < .345 && p[1] > .29 && p[0] > .2) || (p[1] < .045 && p[2] > .085)) c = lerp3(c, NAIL, .55);   // claws and toenails
    return mul3(c, .92 + fine * .16);
  }
  const flat = (h, vary = .12) => { const C = hexLin(h); return p => mul3(C, 1 - vary / 2 + noise(p[0] * 30, p[1] * 30, p[2] * 30) * vary); };

  const bones = [
    ['hips', null, J.hip], ['spine', 'hips', J.spine], ['chest', 'spine', J.chest], ['head', 'chest', J.head],
    ['armL', 'chest', J.shL], ['foreL', 'armL', J.elL], ['handL', 'foreL', J.wrL],
    ['armR', 'chest', J.shR], ['foreR', 'armR', J.elR], ['handR', 'foreR', J.wrR],
    ['legL', 'hips', J.hpL], ['shinL', 'legL', J.knL], ['footL', 'shinL', J.anL],
    ['legR', 'hips', J.hpR], ['shinR', 'legR', J.knR], ['footR', 'shinR', J.anR],
  ];
  const segs = { hips: [J.hip, V3(0, .53, 0)], spine: [V3(0, .53, 0), V3(0, .62, 0)], chest: [V3(0, .62, 0), V3(0, .76, 0)],
    armL: [J.shL, J.elL, 1], foreL: [J.elL, J.wrL, 1], handL: [J.wrL, J.hdL, 1], armR: [J.shR, J.elR, -1], foreR: [J.elR, J.wrR, -1], handR: [J.wrR, J.hdR, -1],
    legL: [J.hpL, J.knL, 1], shinL: [J.knL, J.anL, 1], footL: [J.anL, J.toL, 1], legR: [J.hpR, J.knR, -1], shinR: [J.knR, J.anR, -1], footR: [J.anR, J.toR, -1] };
  function weights(p) {
    // whatever is closer to the head shape than the body belongs to the head; the neck seam blends into the chest
    if (p[1] > .7) { const hd = headSDF(p), bd = bodySDF(p); if (hd < bd + .012) { const wh = clamp((bd - hd + .012) / .024, 0, 1); return wh >= 1 ? [[3, 1]] : [[3, wh], [2, 1 - wh]]; } }
    return limbWeights(p, bones, segs);
  }
  const W = .34 * B;
  return {
    name, bones, weights,
    meta: { HOLD, HC, HK, J },
    pieces: [
      { name: 'skin', mat: 'skin', sdf: skinSDF, lo: [-W, 0, -.18], hi: [W, 1.0, .23], step: .006, paint: paintSkin, ao: true },
      { name: 'gear', mat: 'leather', sdf: gearSDF, lo: [-.16 * B, .44, -.12 * B], hi: [.2 * B, .77, .13 * B], step: .005, paint: flat('#5a3820', .3), ao: true },
      { name: 'wrap', mat: 'cloth', sdf: wrapSDF, lo: [-.15 * B, .33, -.11 * B], hi: [.15 * B, .54, .12 * B], step: .005, paint: flat('#4a3c34', .35), ao: true },
      { name: 'belt', mat: 'leather', sdf: beltSDF, lo: [-.15 * B * belly, .49, -.13 * B * belly], hi: [.15 * B * belly, .54, .14 * B * belly], step: .004, paint: flat('#3a2414', .15), ao: true },
    ],
  };
}
export const goblin = () => goblinModel();
export const goblinChief = () => goblinModel({ name: 'goblinChief', bulk: 1.28, belly: 1.15, skin: '#5f8436', skinDk: '#33501c', skinLt: '#93b05c', hk: .7 });
