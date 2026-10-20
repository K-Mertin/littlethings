// Bat (and the Bat Queen): a furry body, big ears and leathery wings stretched over finger bones.
// Facing +z; the game hovers it, so y = 0 is just the bottom of the model.
import { V3, clamp, smin, smax, cone, ell, sph, noise, hexLin, lerp3, mul3, limbWeights, segDist, len } from '../sdf.mjs';

export function batModel({ name = 'bat', fur = '#5e4886', furDk = '#2a1c40', wing = '#5a3658', wingBone = '#2a1828', S = 1, crown = false, mane = false } = {}) {
  const P = (x, y, z) => [x * S, y * S, z * S];
  const BODY = P(0, .15, 0), HEAD = P(0, .27, .035);
  // wing layout for the +x side, mirrored for -x
  const W = { sh: P(.07, .21, -.01), el: P(.2, .26, -.03), wr: P(.32, .28, -.04), tips: [P(.56, .37, -.05), P(.62, .2, -.05), P(.52, .05, -.04), P(.34, -.02, -.03)], root: P(.06, .07, -.01) };
  const mx = (p, s) => [p[0] * s, p[1], p[2]];
  const zc = x => -.03 * S - .35 * (Math.abs(x) / S - .07) ** 2 * S;   // the membrane arches back
  // 2D distance to the membrane outline (polygon with scalloped trailing edges)
  function membrane2D(x, y) {
    const pts = [W.sh, W.el, W.wr, ...W.tips, W.root].map(q => [q[0], q[1]]); let inside = false, dmin = 1e9;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      const ex = xj - xi, ey = yj - yi, t = clamp(((x - xi) * ex + (y - yi) * ey) / (ex * ex + ey * ey), 0, 1); dmin = Math.min(dmin, Math.hypot(x - xi - ex * t, y - yi - ey * t));
    }
    let d = inside ? -dmin : dmin;
    // scallops: bite circles out between the finger tips
    const T = [...W.tips, W.root];
    const cx0 = pts.reduce((q, v) => q + v[0], 0) / pts.length, cy0 = pts.reduce((q, v) => q + v[1], 0) / pts.length;
    for (let i = 0; i < T.length - 1; i++) {
      const a = T[i], b = T[i + 1], mx2 = (a[0] + b[0]) / 2, my2 = (a[1] + b[1]) / 2, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let nx = (b[1] - a[1]) / l, ny = -(b[0] - a[0]) / l; if (nx * (mx2 - cx0) + ny * (my2 - cy0) < 0) { nx = -nx; ny = -ny; }
      d = Math.max(d, -(Math.hypot(x - mx2 - nx * l * .55, y - my2 - ny * l * .55) - l * .63));
    }
    return d;
  }
  function wingSDF(p, s) {
    const q = mx(p, s); if (q[0] < .03 * S) return 1e9 + 0 * (q[0]);
    const plate = Math.max(Math.abs(q[2] - zc(q[0])) - .005 * S, membrane2D(q[0], q[1]));
    let bones = cone(q, W.sh, W.el, .022 * S, .016 * S); bones = smin(bones, cone(q, W.el, W.wr, .016 * S, .012 * S), .01);
    for (const t of W.tips) bones = Math.min(bones, cone(q, [W.wr[0], W.wr[1], zc(W.wr[0])], [t[0], t[1], zc(t[0])], .009 * S, .003 * S));
    bones = smin(bones, cone(q, [W.wr[0], W.wr[1], W.wr[2]], [W.wr[0] + .02 * S, W.wr[1] + .06 * S, W.wr[2]], .01 * S, .003 * S), .006);   // thumb claw
    return smin(plate, bones, .008 * S);
  }
  const wingsSDF = p => Math.min(wingSDF(p, 1), wingSDF(p, -1));
  const EARS = [-1, 1].map(s => [P(.035 * s, .31, .02), P(.085 * s, .44, -.01)]);
  function headSDF(p) {
    let d = ell(p, HEAD, P(.075, .07, .072));
    d = smin(d, ell(p, [HEAD[0], HEAD[1] - .02 * S, HEAD[2] + .055 * S], P(.042, .034, .04)), .025 * S);      // snout
    d = smin(d, cone(p, [0, HEAD[1] - .005 * S, HEAD[2] + .09 * S], [0, HEAD[1] + .03 * S, HEAD[2] + .085 * S], .012 * S, .004 * S), .008 * S);   // nose leaf
    for (const s of [-1, 1]) {
      const [a, b] = EARS[(s + 1) / 2]; let e = cone(p, a, b, .042 * S, .006 * S);
      e = smax(e, -cone(p, [a[0], a[1], a[2] + .022 * S], [b[0], b[1], b[2] + .012 * S], .03 * S, .001), .006 * S);   // hollow inner ear
      d = smin(d, e, .02 * S);
      d = smax(d, -sph(p, [.03 * s * S, HEAD[1] + .012 * S, HEAD[2] + .06 * S], .017 * S), .006 * S);           // eye sockets
      d = smin(d, cone(p, [.012 * s * S, HEAD[1] + .035 * S, HEAD[2] + .068 * S], [.05 * s * S, HEAD[1] + .03 * S, HEAD[2] + .05 * S], .009 * S, .007 * S), .01 * S);   // brows pulled down
    }
    return smax(d, -cone(p, [-.03 * S, HEAD[1] - .04 * S, HEAD[2] + .075 * S], [.03 * S, HEAD[1] - .04 * S, HEAD[2] + .075 * S], .007 * S, .007 * S), .005 * S);   // mouth
  }
  function bodySDF(p) {
    let d = ell(p, BODY, P(.085, .1, .075));
    d = smin(d, ell(p, P(0, .225, .01), P(.07, .05, .06)), .04 * S);                                           // chest ruff
    for (const s of [-1, 1]) {                                                                                  // little hind legs with hooked claws
      d = smin(d, cone(p, P(.035 * s, .07, -.01), P(.05 * s, -.0, -.03), .022 * S, .012 * S), .015 * S);
      for (const dx of [-.01, .01]) d = smin(d, cone(p, P((.05 + dx) * s, 0, -.03), P((.05 + dx) * s, -.03, -.005), .006 * S, .002 * S), .004 * S);
    }
    if (mane) d = smin(d, ell(p, P(0, .24, -.005), P(.11, .055, .09)), .05 * S);
    return d;
  }
  const furN = p => (noise(p[0] * 90 / S, p[1] * 40 / S, p[2] * 90 / S) - .5) * .007 * S;
  const furSDF = p => smin(headSDF(p), bodySDF(p), .03 * S) + furN(p);
  function crownSDF(p) {
    if (!crown) return 1e9; const c = [0, HEAD[1] + .065 * S, HEAD[2] - .005 * S], y = p[1] - c[1], a = Math.atan2(p[0], p[2] - c[2]);
    let d = Math.abs(Math.hypot(p[0], p[2] - c[2]) - .052 * S) - .007 * S; const top = .03 * S + Math.max(0, Math.cos(a * 5)) ** 3 * .035 * S;
    d = Math.max(d, -y, y - top); return d;
  }

  const F = hexLin(fur), FD = hexLin(furDk), WG = hexLin(wing), WB = hexLin(wingBone), PINK = hexLin('#c07a8a'), DK = hexLin('#140a14'), GOLD = hexLin('#e8b85a');
  const paintFur = (p, n) => { const v = noise(p[0] * 30 / S, p[1] * 80 / S, p[2] * 30 / S); let c = lerp3(F, FD, clamp(.3 + (v - .5) * 1.1 + (n[1] < 0 ? .2 : 0), 0, 1));
    for (const [a, b] of EARS) { if (segDist(p, a, b) < .05 * S && (p[2] - a[2]) > .008 * S) c = lerp3(c, PINK, .5); }
    if (p[2] > HEAD[2] + .07 * S && Math.abs(p[1] - HEAD[1] + .01 * S) < .03 * S) c = lerp3(c, DK, .6);    // dark nose
    if (p[1] < .01 * S) c = lerp3(c, DK, .7); return c; };
  const paintWing = (p, n) => { const q = [Math.abs(p[0]), p[1], p[2]]; let c = mul3(WG, .8 + noise(p[0] * 25 / S, p[1] * 25 / S, 0) * .4);
    let bd = Math.min(segDist(q, W.sh, W.el), segDist(q, W.el, W.wr)); for (const t of W.tips) bd = Math.min(bd, segDist(q, [W.wr[0], W.wr[1], zc(W.wr[0])], [t[0], t[1], zc(t[0])]));
    c = lerp3(c, WB, clamp(1 - bd / (.016 * S), 0, 1));
    const veins = Math.abs(Math.sin((Math.atan2(q[1] - W.wr[1], q[0] - W.wr[0])) * 18)) < .08 ? .75 : 1; return mul3(c, veins); };

  const bones = [['body', null, BODY], ['head', 'body', P(0, .24, .02)],
    ['wingL', 'body', W.sh], ['wingTipL', 'wingL', W.wr], ['wingR', 'body', mx(W.sh, -1)], ['wingTipR', 'wingR', mx(W.wr, -1)]];
  function weights(p, piece) {
    if (piece === 'crown') return [[1, 1]];
    if (piece === 'wings') { const s = p[0] > 0 ? 1 : -1, ax = Math.abs(p[0]), k = clamp((ax - .28 * S) / (.08 * S), 0, 1), [b1, b2] = s > 0 ? [2, 3] : [4, 5];
      if (ax < .1 * S) { const r = clamp((ax - .03 * S) / (.07 * S), 0, 1); return [[0, 1 - r], [b1, r]]; } return k <= 0 ? [[b1, 1]] : k >= 1 ? [[b2, 1]] : [[b1, 1 - k], [b2, k]]; }
    if (headSDF(p) < bodySDF(p) - .005 * S) return [[1, 1]];
    if (headSDF(p) < bodySDF(p) + .015 * S) return [[1, .5], [0, .5]];
    return [[0, 1]];
  }
  return {
    name, bones, weights, budget: crown ? .8 : .55,
    meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J: { head: P(0, .24, .02) }, eyes: [[.03 * S, HEAD[1] + .012 * S, HEAD[2] + .054 * S], [-.03 * S, HEAD[1] + .012 * S, HEAD[2] + .054 * S]], eyeR: .014 * S, mouth: [0, HEAD[1] - .045 * S, HEAD[2] + .075 * S] },
    pieces: [
      { name: 'fur', mat: 'cloth', sdf: furSDF, lo: P(-.15, -.05, -.12), hi: P(.15, .47, .15), step: .004 * S, paint: paintFur, ao: true },
      { name: 'wings', mat: 'leather', sdf: wingsSDF, lo: P(-.66, -.06, -.16), hi: P(.66, .42, .03), step: .005 * S, paint: paintWing, ao: true },
      ...(crown ? [{ name: 'crown', mat: 'gold', sdf: crownSDF, lo: P(-.07, .3, -.06), hi: P(.07, .42, .08), step: .003 * S, paint: () => GOLD }] : []),
    ],
  };
}
export const bat = () => batModel();
export const batQueen = () => batModel({ name: 'batQueen', fur: '#5a2238', furDk: '#22080e', wing: '#5a1a2e', wingBone: '#2a0a14', crown: true, mane: true });
