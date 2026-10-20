// Shared skeleton for the upright monsters (knight, mummy, frost giant): joint layout, bones,
// bone segments for skin weights, and a plain body (torso + limbs) to sculpt clothes or armour over.
import { V3, smin, cone, ell, mir, limbWeights, clamp } from '../sdf.mjs';

// o: { hipY, chestY, headY, shX, elbow:[x,y,z], wrist:[x,y,z], hipX, knee:[x,y,z], ankle:[x,y,z], toe:[x,y,z], S (uniform scale) }
export function biped(o) {
  const S = o.S || 1, P = a => [a[0] * S, a[1] * S, a[2] * S];
  const J = {
    hip: P([0, o.hipY, 0]), spine: P([0, (o.hipY + o.chestY) / 2, 0]), chest: P([0, o.chestY, -.005]), head: P([0, o.neckY, .01]),
    shL: P([o.shX, o.shY, -.01]), elL: P(o.elbow), wrL: P(o.wrist), hdL: P([o.wrist[0] + .01, o.wrist[1] - .07, o.wrist[2] + .02]),
    hpL: P([o.hipX, o.hipY - .015, 0]), knL: P(o.knee), anL: P(o.ankle), toL: P(o.toe),
  };
  for (const k of ['sh', 'el', 'wr', 'hd', 'hp', 'kn', 'an', 'to']) J[k + 'R'] = [-J[k + 'L'][0], J[k + 'L'][1], J[k + 'L'][2]];
  const bones = [
    ['hips', null, J.hip], ['spine', 'hips', J.spine], ['chest', 'spine', J.chest], ['head', 'chest', J.head],
    ['armL', 'chest', J.shL], ['foreL', 'armL', J.elL], ['handL', 'foreL', J.wrL],
    ['armR', 'chest', J.shR], ['foreR', 'armR', J.elR], ['handR', 'foreR', J.wrR],
    ['legL', 'hips', J.hpL], ['shinL', 'legL', J.knL], ['footL', 'shinL', J.anL],
    ['legR', 'hips', J.hpR], ['shinR', 'legR', J.knR], ['footR', 'shinR', J.anR],
  ];
  const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const segs = { hips: [J.hip, mid(J.hip, J.chest, .4)], spine: [mid(J.hip, J.chest, .4), mid(J.hip, J.chest, .85)], chest: [mid(J.hip, J.chest, .85), mid(J.chest, J.head, .7)],
    armL: [J.shL, J.elL, 1], foreL: [J.elL, J.wrL, 1], handL: [J.wrL, J.hdL, 1], armR: [J.shR, J.elR, -1], foreR: [J.elR, J.wrR, -1], handR: [J.wrR, J.hdR, -1],
    legL: [J.hpL, J.knL, 1], shinL: [J.knL, J.anL, 1], footL: [J.anL, J.toL, 1], legR: [J.hpR, J.knR, -1], shinR: [J.knR, J.anR, -1], footR: [J.anR, J.toR, -1] };
  // headTest(p) -> true when p belongs to the head
  const weights = (p, headTest, falloff = .0012 * S * S) => {
    if (headTest && headTest(p)) return [[3, 1]];
    return limbWeights(p, bones, segs, falloff);
  };
  // a plain body: r = { chest:[x,y,z], waist:[..], pelvis:[..], neck, upper:[r1,r2], fore:[r1,r2], hand:[x,y,z], thigh:[r1,r2], shin:[r1,r2], foot:[r1,r2] }
  function body(p, r) {
    const s = S;
    let d = ell(p, mid(J.chest, J.head, .0), r.chest.map(v => v * s));
    d = smin(d, ell(p, mid(J.hip, J.chest, .5), r.waist.map(v => v * s)), .05 * s);
    d = smin(d, ell(p, J.hip, r.pelvis.map(v => v * s)), .05 * s);
    d = smin(d, cone(p, mid(J.chest, J.head, .4), [J.head[0], J.head[1] + .05 * s, J.head[2] + .02 * s], r.neck * s, r.neck * .9 * s), .03 * s);
    for (const sd of [-1, 1]) {
      const L = k => sd > 0 ? J[k + 'L'] : J[k + 'R'];
      d = smin(d, ell(p, L('sh'), [r.upper[0] * 1.3 * s, r.upper[0] * 1.15 * s, r.upper[0] * 1.3 * s]), .03 * s);
      d = smin(d, cone(p, L('sh'), L('el'), r.upper[0] * s, r.upper[1] * s), .025 * s);
      d = smin(d, cone(p, L('el'), L('wr'), r.fore[0] * s, r.fore[1] * s), .02 * s);
      d = smin(d, ell(p, mid(L('wr'), L('hd'), .55), r.hand.map(v => v * s)), .015 * s);
      d = smin(d, cone(p, L('hp'), L('kn'), r.thigh[0] * s, r.thigh[1] * s), .03 * s);
      d = smin(d, cone(p, L('kn'), L('an'), r.shin[0] * s, r.shin[1] * s), .02 * s);
      d = smin(d, cone(p, [L('an')[0], L('an')[1] - .02 * s, L('an')[2] - .02 * s], L('to'), r.foot[0] * s, r.foot[1] * s), .02 * s);
    }
    return d;
  }
  return { J, bones, segs, weights, body, mid, S };
}
