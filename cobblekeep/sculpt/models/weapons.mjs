// The hero's kit, sculpted in the same frames the game's hand-held models use (so muzzles, glows
// and offsets line up): rune sword (blade along +y), arcane wand and fire staff (along -z),
// repeater crossbow (stock along z), plus the gloved hand and bracer. Glowing bits (runes, crystal,
// orb, flames, bowstring, fletching) stay as live shapes in the game.
import { V3, clamp, smin, smax, cone, ell, sph, box, noise, hexLin, lerp3, mul3, torusY, len, mix, cappedConeY } from '../sdf.mjs';

const one = [['base', null, V3(0, 0, 0)]], still = { bones: one, weights: () => [[0, 1]], meta: { HOLD: [0, 0, 0], HC: [0, 0, 0], HK: 1, J: { head: [0, 0, 0] } } };
const capX = (p, c, half, r) => cone(p, [c[0] - half, c[1], c[2]], [c[0] + half, c[1], c[2]], r, r);
const capZ = (p, z0, z1, r0, r1, x = 0, y = 0) => cone(p, [x, y, z0], [x, y, z1], r0, r1);
const rot = (p, c, ax, a) => { const s = Math.sin(a), co = Math.cos(a), q = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  if (ax === 'x') return [q[0] + c[0], q[1] * co - q[2] * s + c[1], q[1] * s + q[2] * co + c[2]]; if (ax === 'y') return [q[0] * co + q[2] * s + c[0], q[1] + c[1], -q[0] * s + q[2] * co + c[2]]; return [q[0] * co - q[1] * s + c[0], q[0] * s + q[1] * co + c[1], q[2] + c[2]]; };
const STEEL = hexLin('#d8dee8'), DSTEEL = hexLin('#6f7788'), GOLD = hexLin('#e8b85a'), SILVER = hexLin('#cfd6e6'), LEATHER = hexLin('#6b3f24'), GLOVE = hexLin('#6e4a34');
const metalPaint = C => p => mul3(C, .9 + noise(p[0] * 300, p[1] * 300, p[2] * 300) * .14);
const woodPaint = (axis, base = '#7a4e2a') => { const B = hexLin(base), D = hexLin('#3e2414'); return p => { const a = axis === 'y' ? p[1] : p[2], b = axis === 'y' ? Math.atan2(p[0], p[2]) : Math.atan2(p[0], p[1]); const g = noise(b * 3, a * 18, 0), ring = Math.sin(a * 140 + g * 9) * .5 + .5; return mul3(lerp3(B, D, clamp(ring * .3 + g * .22, 0, 1)), .92 + noise(p[0] * 200, p[1] * 200, p[2] * 200) * .14); }; };
const leatherPaint = C => p => mul3(C, .82 + noise(p[0] * 260, p[1] * 260, p[2] * 260) * .3);

export function wSword() {
  const W = y => y < .56 ? mix(.027, .022, (y - .1) / .46) : mix(.022, 0, (y - .56) / .1), Tk = y => .0085 * (1 - clamp((y - .5) / .16, 0, 1) * .6);
  function blade(p) {
    const y = p[1]; if (y < .095 || y > .665) return Math.max(.095 - y, y - .665, .001);
    const w = Math.max(W(y), .0005), t = Tk(y); let d = (Math.abs(p[0]) * t + Math.abs(p[2]) * w - w * t) / Math.hypot(w, t);   // lozenge cross-section, sharp edges
    d = Math.max(d, .1 - y);
    if (y > .14 && y < .5) d = smax(d, -box(p, [0, .32, 0], [.007, .18, .02], .004) + .0075, .001);   // fuller groove down both faces
    return d;
  }
  function guard(p) {
    const x = clamp(p[0], -.11, .11), y0 = .075 + (Math.abs(x) / .11) ** 2 * .02;
    let d = ell([p[0] - x, p[1] - y0, p[2]], [0, 0, 0], [.006, .011, .013]); d = Math.min(d, ell(p, [0, .078, 0], [.03, .018, .016]));
    for (const s of [-1, 1]) d = smin(d, sph(p, [.112 * s, .097, 0], .013), .008);   // curled ends
    d = smin(d, cone(p, [0, .085, 0], [0, .12, 0], .016, .004), .006);                 // langet up the blade
    return smax(d, -sph(p, [0, .092, .022], .011), .002);                              // socket for the gem
  }
  const grip = p => capZ([p[0], p[2], p[1]], -.05, .082, .0175, .0185) + Math.max(0, Math.sin((p[1] * 260 + Math.atan2(p[0], p[2]) * 1.4))) * .0015;
  const pommel = p => smin(sph(p, [0, -.062, 0], .026), torusY(p, [0, -.04, 0], .019, .006), .006);
  return { name: 'wSword', ...still, budget: .66, pieces: [
    { name: 'blade', mat: 'steel', sdf: blade, lo: [-.04, .09, -.02], hi: [.04, .67, .02], step: .0018, paint: metalPaint(STEEL) },
    { name: 'guard', mat: 'gold', sdf: p => Math.min(guard(p), pommel(p)), lo: [-.13, -.095, -.03], hi: [.13, .13, .04], step: .0016, paint: metalPaint(GOLD), ao: true },
    { name: 'grip', mat: 'leather', sdf: grip, lo: [-.025, -.055, -.025], hi: [.025, .09, .025], step: .0014, paint: leatherPaint(LEATHER), ao: true },
  ] };
}

export function wGlove() {
  function sdf(p) {
    let d = box(p, [.014, -.004, .03], [.035, .046, .033], .022);                         // back of the hand
    for (let i = 0; i < 4; i++) { const y = .036 - i * .025; d = smin(d, capX(p, [-.004, y, -.028], .03, .017), .008); d = smin(d, sph(p, [.03, y, -.012], .016), .012); }   // fingers round the grip, knuckles
    const q = rot(rot(p, [-.034, .03, .006], 'x', -.35), [-.034, .03, .006], 'z', -.45); d = smin(d, cone(q, [-.034, -.012, .006], [-.034, .066, .006], .018, .016), .01);   // thumb
    d = smin(d, box(p, [.016, -.05, .02], [.03, .02, .03], .02), .02);                     // wrist
    return d + Math.max(0, Math.sin(p[1] * 900) * Math.sin(p[0] * 900)) * .0006;
  }
  const paint = p => { let c = leatherPaint(GLOVE)(p); for (let i = 0; i < 4; i++) if (Math.abs(p[1] - (.036 - i * .025) - .0) < .0012 && p[2] < -.035) c = mul3(c, .55); return c; };
  return { name: 'wGlove', ...still, budget: .35, pieces: [{ name: 'glove', mat: 'leather', sdf, lo: [-.07, -.08, -.06], hi: [.07, .08, .075], step: .0016, paint, ao: true }] };
}
export function wBracer() {
  const cuff = p => { const y = p[1] + .04, r = mix(.052, .045, clamp((y + .05) / .1, 0, 1)); let d = Math.max(Math.abs(Math.hypot(p[0], p[2]) - r + .004) - .006, Math.abs(y) - .05);
    for (const yy of [-.025, .015]) d = smin(d, Math.max(Math.abs(Math.hypot(p[0], p[2]) - r - .002) - .004, Math.abs(y - yy) - .004), .002);   // stitched straps
    return d; };
  const trim = p => { let d = torusY(p, [0, .005, 0], .047, .0055); for (let i = 0; i < 3; i++) { const a = (i - 1) * .55; d = Math.min(d, sph(p, [Math.sin(a) * .052, -.04, Math.cos(a) * .052], .007)); } return d; };
  return { name: 'wBracer', ...still, budget: .3, pieces: [
    { name: 'cuff', mat: 'leather', sdf: cuff, lo: [-.065, -.1, -.065], hi: [.065, .02, .065], step: .0018, paint: leatherPaint(LEATHER), ao: true },
    { name: 'trim', mat: 'gold', sdf: trim, lo: [-.065, -.05, -.065], hi: [.065, .015, .065], step: .0015, paint: p => (p[1] > -.02 ? metalPaint(GOLD)(p) : metalPaint(SILVER)(p)) },
  ] };
}

export function wWand() {   // before the game's 1.6x scale
  const shaft = p => { const a = Math.atan2(p[0], p[1]); let d = capZ(p, .085, -.3, .017, .011); d += Math.max(0, Math.sin(a * 2 + p[2] * 160)) * .0012; return d; };   // spiral-carved wood
  function metal(p) {
    let d = 1e9;
    for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * Math.PI * 7, z = -.2 - t * .1; d = Math.min(d, sph(p, [Math.cos(a) * .0155, Math.sin(a) * .0155, z], .0035)); }   // silver wire wound up the tip
    d = Math.min(d, cone(p, [0, 0, -.185], [0, 0, -.195], .021, .021), cone(p, [0, 0, .055], [0, 0, .068], .02, .02), ell(p, [0, 0, .095], [.017, .017, .022]));
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2, c = [Math.cos(a), Math.sin(a)]; d = Math.min(d, cone(p, [c[0] * .012, c[1] * .012, -.3], [c[0] * .024, c[1] * .024, -.355], .005, .0015)); }   // prongs round the crystal
    return d;
  }
  return { name: 'wWand', ...still, budget: .66, pieces: [
    { name: 'shaft', mat: 'wood', sdf: shaft, lo: [-.022, -.022, -.31], hi: [.022, .022, .125], step: .0014, paint: woodPaint('z'), ao: true },
    { name: 'metal', mat: 'gold', sdf: metal, lo: [-.03, -.03, -.36], hi: [.03, .03, .12], step: .0012, paint: p => (p[2] > 0 ? metalPaint(GOLD)(p) : metalPaint(SILVER)(p)) },
  ] };
}

export function wCrossbow() {   // before the game's 1.1x scale
  function stock(p) {
    let d = box(p, [0, 0, -.04], [.022, .025, .22], .012);                                // tiller
    d = smin(d, box(rot(p, [0, -.025, .2], 'x', .12), [0, -.025, .2], [.027, .045, .06], .02), .03);   // butt
    d = smin(d, box(rot(p, [0, -.07, .08], 'x', .35), [0, -.07, .08], [.018, .045, .022], .012), .015);   // pistol grip
    d = smin(d, box(p, [0, .052, -.06], [.022, .022, .08], .01), .01);                   // magazine
    d = smax(d, -box(p, [0, .03, -.17], [.006, .006, .1]), .002);                         // bolt groove
    d = Math.min(d, Math.max(Math.abs(cone(p, [0, -.035, .04], [0, -.035, -.01], .025, .025)) - .004, p[1] + .035, Math.abs(p[0]) - .005));   // trigger guard
    return d;
  }
  function steel(p) {
    let d = box(p, [0, .01, -.25], [.03, .02, .025], .008);                               // nose block
    for (const s of [-1, 1]) { const P = [[0, .01, -.25], [s * .1, .012, -.24], [s * .19, .01, -.2], [s * .23, .008, -.15]]; for (let i = 0; i < 3; i++) d = smin(d, cone(p, P[i], P[i + 1], .013 - i * .002, .011 - i * .002), .006); d = Math.min(d, sph(p, P[3], .012)); }   // recurved prod
    for (const z of [-.12, 0]) d = Math.min(d, box(p, [0, .055, z], [.027, .03, .006], .003));   // bands
    d = Math.min(d, cone(p, [0, .03, -.29], [0, .03, -.33], .011, .001));                  // bolt head
    d = Math.min(d, box(p, [0, -.04, .02], [.004, .02, .006], .002));                     // trigger
    return d;
  }
  const bolt = p => capZ(p, -.04, -.29, .005, .005, 0, .03);
  return { name: 'wCrossbow', ...still, budget: .66, pieces: [
    { name: 'stock', mat: 'wood', sdf: stock, lo: [-.045, -.14, -.28], hi: [.045, .1, .31], step: .0018, paint: woodPaint('z', '#8a5a32'), ao: true },
    { name: 'steel', mat: 'steel', sdf: steel, lo: [-.25, -.07, -.34], hi: [.25, .09, .03], step: .0016, paint: p => (Math.abs(p[0]) < .03 && p[1] > .02 && p[2] > -.13 ? metalPaint(GOLD)(p) : metalPaint(DSTEEL)(p)), ao: true },
    { name: 'bolt', mat: 'wood', sdf: bolt, lo: [-.008, .02, -.3], hi: [.008, .04, -.03], step: .0012, paint: woodPaint('z', '#b08a5a') },
  ] };
}

export function wStaff() {   // before the game's 1.1x scale
  const shaft = p => capZ(p, .24, -.37, .02, .016) + (noise(p[0] * 90, p[1] * 90, p[2] * 25) - .5) * .004;
  function knots(p) { let d = 1e9; for (const [z, a] of [[-.05, .5], [.15, 2.6], [-.22, 4.1]]) d = Math.min(d, ell(p, [Math.cos(a) * .017, Math.sin(a) * .017, z], [.012, .012, .02])); return d; }
  function gold(p) {
    let d = 1e9; for (const z of [-.33, .1, .2]) d = Math.min(d, cone(p, [0, 0, z - .008], [0, 0, z + .008], .023, .023));
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, c = [Math.cos(a), Math.sin(a)], P = [[c[0] * .015, c[1] * .015, -.36], [c[0] * .06, c[1] * .06, -.42], [c[0] * .055, c[1] * .055, -.48], [c[0] * .02, c[1] * .02, -.51]];
      for (let k = 0; k < 3; k++) d = smin(d, cone(p, P[k], P[k + 1], .009 - k * .002, .007 - k * .002), .004); }   // claws cradling the orb
    return d;
  }
  return { name: 'wStaff', ...still, budget: .66, pieces: [
    { name: 'shaft', mat: 'wood', sdf: p => smin(shaft(p), knots(p), .01), lo: [-.045, -.045, -.4], hi: [.045, .045, .29], step: .0018, paint: woodPaint('z', '#6a4024'), ao: true },
    { name: 'gold', mat: 'gold', sdf: gold, lo: [-.08, -.08, -.53], hi: [.08, .08, .22], step: .0016, paint: metalPaint(GOLD), ao: true },
  ] };
}

/* ---------- scenery ---------- */
export function lampPost() {
  function iron(p) {
    let d = capZ([p[0], p[2], p[1]], .06, .9, .022, .018);                               // post
    d = smin(d, cappedConeY(p, [0, 0, 0], 0, .07, .1, .03), .03);                       // flared foot
    d = smin(d, torusY(p, [0, .07, 0], .035, .01), .01); d = smin(d, torusY(p, [0, .5, 0], .026, .008), .006);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .3, c = [Math.cos(a), Math.sin(a)]; d = smin(d, cone(p, [c[0] * .02, .04, c[1] * .02], [c[0] * .085, .005, c[1] * .085], .012, .008), .01); }   // feet
    d = Math.min(d, torusY(p, [0, .93, 0], .085, .012), cappedConeY(p, [0, 0, 0], .88, .935, .03, .095));   // lantern floor
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; d = Math.min(d, cone(p, [Math.cos(a) * .085, .93, Math.sin(a) * .085], [Math.cos(a) * .09, 1.13, Math.sin(a) * .09], .008, .008)); }   // cage bars
    d = Math.min(d, Math.max(cappedConeY(p, [0, 0, 0], 1.12, 1.25, .14, .02), -cappedConeY(p, [0, 0, 0], 1.1, 1.235, .125, .005)));   // roof
    d = Math.min(d, Math.max(Math.abs(Math.hypot(p[0], p[1] - 1.29) - .03) - .007, Math.abs(p[2]) - .007));   // hanging ring
    return d + (noise(p[0] * 150, p[1] * 150, p[2] * 150) - .5) * .0015;
  }
  const IRON = hexLin('#2e2a30'), RUST = hexLin('#5a3a2a');
  return { name: 'lampPost', ...still, budget: .3, errScale: 3, pieces: [{ name: 'iron', mat: 'metal', sdf: iron, lo: [-.16, -.01, -.16], hi: [.16, 1.33, .16], step: .003, paint: p => mul3(lerp3(IRON, RUST, clamp((noise(p[0] * 40, p[1] * 40, p[2] * 40) - .55) * 3, 0, 1)), .9 + noise(p[0] * 200, p[1] * 200, p[2] * 200) * .2), ao: true }] };
}
export function frostCrystal() {
  const hex6 = (q, r) => { const a = Math.abs(q[0]), b = Math.abs(q[2]); return Math.max(a * .866 + b * .5, b) - r; };
  function crystal(p, c, h, r, rx, rz) {
    let q = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; q = rot(rot(q, [0, 0, 0], 'x', -rx), [0, 0, 0], 'z', -rz);
    const tip = h * .78, rr = q[1] > tip ? r * (1 - (q[1] - tip) / (h - tip)) : r; return Math.max(hex6(q, Math.max(rr, 0)), -q[1], q[1] - h);
  }
  const SET = [[0, 0, 1, 0, 0], [-.14, .06, .6, .4, .1], [.13, -.05, .7, -.35, -.1], [.05, .14, .45, -.2, .4], [-.06, -.13, .5, .2, -.4], [.16, .1, .35, -.6, .3]];
  const ice = p => { let d = 1e9; for (const [x, z, s, rz, rx] of SET) d = Math.min(d, crystal(p, [x, .06, z], .62 * s, .07 * s, rx, rz)); return d; };
  const snow = p => smin(ell(p, [0, .02, 0], [.3, .07, .24]), ell(p, [.08, .03, .06], [.16, .07, .14]), .05) + (noise(p[0] * 30, p[1] * 30, p[2] * 30) - .5) * .01;
  const IC = hexLin('#c8f0ff'), ID = hexLin('#5ab0e8'), SN = hexLin('#eef4fc');
  return { name: 'frostCrystal', ...still, budget: .3, errScale: 3, pieces: [
    { name: 'ice', mat: 'ice', sdf: ice, lo: [-.32, 0, -.3], hi: [.32, .72, .3], step: .004, paint: p => lerp3(ID, IC, clamp(p[1] * 1.6 + noise(p[0] * 30, p[1] * 30, p[2] * 30) * .3, 0, 1)) },
    { name: 'snow', mat: 'cloth', sdf: snow, lo: [-.34, -.06, -.28], hi: [.34, .12, .28], step: .005, paint: p => mul3(SN, .9 + noise(p[0] * 80, p[1] * 80, p[2] * 80) * .1), ao: true },
  ] };
}
