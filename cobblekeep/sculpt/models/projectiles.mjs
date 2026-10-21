// Solid hearts of the monsters' attacks, centred on the origin and flying toward +z. The light
// around them (halos, flame tails, rings, trails) stays as glow effects in the game.
import { V3, clamp, smin, smax, cone, ell, sph, box, noise, hash, hexLin, lerp3, mul3, len } from '../sdf.mjs';

const still = { bones: [['base', null, V3(0, 0, 0)]], weights: () => [[0, 1]], meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J: { head: [0, 0, 0] } }, budget: .15, errScale: 3 };
function cells(p, f) {   // voronoi edge distance and id, for cracked shells
  const x = p[0] * f, y = p[1] * f, z = p[2] * f, xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let d1 = 9, d2 = 9, id = 0;
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const cx = xi + i, cy = yi + j, cz = zi + k, d = Math.hypot(x - cx - hash(cx, cy, cz), y - cy - hash(cx + 7, cy, cz), z - cz - hash(cx, cy + 3, cz + 5)); if (d < d1) { d2 = d1; d1 = d; id = hash(cx + 11, cy, cz); } else if (d < d2) d2 = d; }
  return [(d2 - d1) / f, id];
}
const hex6z = (q, r) => { const a = Math.abs(q[0]), b = Math.abs(q[1]); return Math.max(a * .866 + b * .5, b) - r; };   // hexagonal prism along z
const shard = (p, c, L, r, tipBack = .35) => { const q = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], t = q[2] > 0 ? q[2] / L : -q[2] / (L * tipBack), rr = r * (1 - clamp(t - .2, 0, 1) / .8); return Math.max(hex6z(q, Math.max(rr, 0)), q[2] - L, -q[2] - L * tipBack); };

export function prRock() {   // a craggy boulder chipped off the Goblin Chief's club
  const sdf = p => { let d = ell(p, [0, 0, 0], [.12, .1, .11]); d += (noise(p[0] * 18 + 3, p[1] * 18, p[2] * 18) - .5) * .05; const [e] = cells(p, 16); d = Math.max(d, Math.min(.004 - e, -d - .01)); /* shallow cracks */ return Math.min(d, sph(p, [.1, -.06, -.07], .03) + (noise(p[0] * 50, p[1] * 50, p[2] * 50) - .5) * .015); };
  const R = hexLin('#8f7a62'), D = hexLin('#4e4234');
  return { name: 'prRock', ...still, pieces: [{ name: 'rock', mat: 'rock', sdf, lo: [-.16, -.14, -.15], hi: [.16, .14, .15], step: .003, paint: (p, n) => lerp3(D, R, clamp(.5 + n[1] * .3 + (noise(p[0] * 30, p[1] * 30, p[2] * 30) - .5) * .6, 0, 1)), ao: true }] };
}
export function prShard() {   // the totem's amethyst bolt
  const sdf = p => Math.min(shard(p, [0, 0, 0], .17, .045), shard(p, [.055, .02, -.05], .07, .018), shard(p, [-.055, -.02, -.05], .07, .018));
  return { name: 'prShard', ...still, pieces: [{ name: 'shard', mat: 'amethyst', sdf, lo: [-.09, -.06, -.12], hi: [.09, .06, .19], step: .0022, paint: p => lerp3(hexLin('#6a2ad0'), hexLin('#f0dcff'), clamp(.5 + p[2] * 3, 0, 1)) }] };
}
export function prIcicle() {   // the Frost Giant's spear of ice
  const sdf = p => { let d = shard(p, [0, 0, -.06], .26, .045, .3); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; d = Math.min(d, shard(p, [Math.cos(a) * .04, Math.sin(a) * .04, -.1], .08, .016, .4)); } return d + Math.max(0, Math.sin(p[2] * 120)) * .002; };
  return { name: 'prIcicle', ...still, pieces: [{ name: 'ice', mat: 'ice', sdf, lo: [-.08, -.08, -.17], hi: [.08, .08, .22], step: .002, paint: p => lerp3(hexLin('#6ab8e8'), hexLin('#f0fbff'), clamp(.5 + p[2] * 3, 0, 1)) }] };
}
export function prScarab() {   // the Mummy King's golden scarab
  function gold(p) {
    let d = ell(p, [0, 0, -.005], [.032, .02, .042]);                                  // wing cases
    d = smax(d, -box(p, [0, .02, -.01], [.0012, .01, .04]), .002);                       // split down the back
    d = smin(d, ell(p, [0, -.002, .038], [.022, .014, .014]), .006);                     // head
    for (const s of [-1, 1]) { for (const z of [-.02, 0, .02]) d = Math.min(d, cone(p, [s * .025, -.012, z], [s * .05, -.02, z + .008], .004, .002)); d = Math.min(d, cone(p, [s * .008, 0, .05], [s * .02, .004, .068], .003, .0015)); }   // legs and horns
    return d;
  }
  const lapis = p => smax(ell(p, [0, .006, -.005], [.03, .02, .04]), -(Math.abs(p[0]) - .002), .001) + .003;
  return { name: 'prScarab', ...still, pieces: [
    { name: 'gold', mat: 'gold', sdf: gold, lo: [-.06, -.03, -.06], hi: [.06, .03, .08], step: .0012, paint: () => hexLin('#f2c14e'), ao: true },
    { name: 'lapis', mat: 'steel', sdf: p => Math.max(lapis(p), -p[1] + .008), lo: [-.04, 0, -.05], hi: [.04, .035, .04], step: .0012, paint: () => hexLin('#2b4fb8') },
  ] };
}
function crackedCore(name, R, shellC, coreC, f) {   // a dark shell broken into plates with light showing through
  const shellS = p => { const [e, id] = cells(p, f), r = R + (id - .5) * R * .1; return Math.max(Math.max(sph(p, [0, 0, 0], r), -sph(p, [0, 0, 0], r - R * .22)), .004 * R / .085 - e); };
  return { name, ...still, pieces: [
    { name: 'shell', mat: 'rock', sdf: shellS, lo: [-R * 1.2, -R * 1.2, -R * 1.2], hi: [R * 1.2, R * 1.2, R * 1.2], step: R / 40, paint: (p, n) => mul3(hexLin(shellC), .7 + noise(p[0] * 300 / R, p[1] * 30 / R, p[2] * 30 / R) * .5), ao: true },
    { name: 'core', mat: 'glow', sdf: p => sph(p, [0, 0, 0], R * .8), lo: [-R, -R, -R], hi: [R, R, R], step: R / 16, paint: () => hexLin(coreC) },
  ] };
}
export const prObsidian = () => crackedCore('prObsidian', .085, '#16051f', '#ff7ae0', 22);   // the Dark Wizard's void orb
export const prEmber = () => crackedCore('prEmber', .05, '#2a1a14', '#ffd25a', 40);           // fireball core (wisp, fire staff)
export function prRune() {   // the imp's violet star crystal
  const sdf = p => { const a = Math.atan2(p[1], p[0]), r = Math.hypot(p[0], p[1]), k = Math.cos(5 * a) * .5 + .5, R = .025 + k * .03; return Math.max(r - R, Math.abs(p[2]) - .012 * (1 - r / .06) - .004); };
  return { name: 'prRune', ...still, pieces: [{ name: 'star', mat: 'amethyst', sdf, lo: [-.07, -.07, -.025], hi: [.07, .07, .025], step: .0015, paint: p => lerp3(hexLin('#8a4dff'), hexLin('#f6eeff'), clamp(1 - Math.hypot(p[0], p[1]) / .05, 0, 1)) }] };
}
