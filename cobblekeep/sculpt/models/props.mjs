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
