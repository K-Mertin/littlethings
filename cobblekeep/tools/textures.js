// Cobble Keep surface textures, generated procedurally at build time (see bake-textures.cjs).
// Every texture is a height field plus colour, roughness and (rarely) glow, computed per texel in
// metres: floors and ceilings cover 1 x 1 m and tile both ways; walls cover 1 m wide x 1.25 m tall
// and tile sideways only. y runs from the top of the tile downward. Normal maps come from height.

/* ---------- noise (periodic in x so walls and floors tile) ---------- */
function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
const wrap = (a, P) => P ? ((a % P) + P) % P : a;
function vnoise(x, y, s, Px, Py) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const c = (i, j) => hash(wrap(xi + i, Px), wrap(yi + j, Py), s);
  return (c(0, 0) * (1 - u) + c(1, 0) * u) * (1 - v) + (c(0, 1) * (1 - u) + c(1, 1) * u) * v;
}
// fbm over metres; f = features per metre (rounded so the period fits the tile)
function fbm(T, x, y, f, s = 0, oct = 4) { let a = 0, w = .5, t = 0; for (let o = 0; o < oct; o++) { const F = Math.round(f * (1 << o)); a += vnoise(x * F, y * F, s + o * 17, Math.round(T.W * F), T.H === 1 ? Math.round(F) : 0) * w; t += w; w *= .5; } return a / t; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, mix = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const pick = (pal, t) => hex(pal[Math.min(pal.length - 1, Math.floor(t * pal.length))]);

/* ---------- layouts ---------- */
// running-bond blocks: rows per tile height, cols per tile width
function blocks(T, x, y, rows, cols, o = {}) {
  const bh = T.H / rows, r = Math.floor(y / bh), off = (r % 2) * (o.offset ?? .5), bw = T.W / cols, cx = x / bw + off, c = Math.floor(cx);
  const fx = cx - c, fy = y / bh - r, id = hash(wrap(c, cols), r, o.seed || 3), id2 = hash(wrap(c, cols), r, (o.seed || 3) + 9);
  const ex = Math.min(fx, 1 - fx) * bw, ey = Math.min(fy, 1 - fy) * bh;   // edge distance in metres
  return { r, c, fx, fy, id, id2, e: Math.min(ex, ey), bw, bh };
}
// jittered voronoi stones, S cells per metre
function stones(T, x, y, S, seed = 1, stretch = 1) {
  const X = x * S, Y = y * S, xi = Math.floor(X), yi = Math.floor(Y), PX = Math.round(T.W * S), PY = T.H === 1 ? Math.round(S) : 0;
  let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, hx = wrap(cx, PX), hy = wrap(cy, PY), px = cx + .15 + hash(hx, hy, seed) * .7, py = cy + .15 + hash(hx, hy, seed + 1) * .7;
    const d = Math.hypot((X - px) * stretch, Y - py);
    if (d < d1) { d2 = d1; d1 = d; id = hash(hx, hy, seed + 2); } else if (d < d2) d2 = d;
  }
  return { e: (d2 - d1) / S, d1: d1 / S, id };
}
// planks running along x (or y when vertical)
function planks(T, x, y, n, o = {}) {
  const along = o.vertical ? y : x, across = o.vertical ? x : y, span = o.vertical ? T.W : T.H, w = span / n, k = Math.floor(across / w), f = across / w - k;
  const len = o.len || 1, seg = Math.floor((along + hash(k, 0, 5) * len) / len), id = hash(k, seg, 7);
  const ends = (along + hash(k, 0, 5) * len) / len - seg;
  return { k, f, id, e: Math.min(Math.min(f, 1 - f) * w, o.len ? Math.min(ends, 1 - ends) * len : 9), w };
}
function woodGrain(T, x, y, id, vertical, s = 0) {
  const a = vertical ? x : y, b = vertical ? y : x, g = fbm(T, vertical ? x * 6 : x * 1.5, vertical ? y * 1.5 : y * 6, 3, 50 + s, 3);
  const rings = Math.sin((a * 70 + g * 8 + id * 20) * 2) * .5 + .5, streak = fbm(T, vertical ? x * 40 : x * 2, vertical ? y * 2 : y * 40, 2, 60 + s, 3);
  return { rings, streak, g };
}
const flat = c => ({ h: .5, c, r: .8 });

/* ---------- reusable surface makers ---------- */
function brickWall(T, x, y, o) {
  const B = blocks(T, x, y, o.rows, o.cols, o), n = fbm(T, x, y, 18, 5), chip = (fbm(T, x, y, 60, 9) - .5);
  const body = sstep(o.mortar * .5, o.mortar * 1.6, B.e + chip * o.mortar * .9);
  const grime = 1 - sstep(.35, .75, fbm(T, x, y, 2.5, 71)) * (o.grime ?? .2) - (o.floorGrime ? sstep(T.H * .7, T.H, y) * .25 : 0);
  const tilt = (B.fx - .5) * (B.id2 - .5) * .3 + (B.fy - .5) * (hash(B.c, B.r, 19) - .5) * .3;
  const base = pick(o.pal, B.id), k = (.8 + n * .3 + (B.id2 - .5) * .16) * grime;
  const brick = mul(base, k * (hash(B.c, B.r, 11) < (o.soot ?? .08) ? .62 : 1)), mortar = mul(hex(o.mortarC), (.7 + fbm(T, x, y, 40, 13) * .5) * grime);
  const pit = fbm(T, x, y, 120, 21) < .3 ? .07 : 0;
  return { h: body * (.72 + n * .35 - pit + tilt) + (1 - body) * (.1 + n * .1), c: mix3(mortar, brick, body), r: mix(.95, o.rough ?? .82, body), body, B, n };
}
function stoneFloor(T, x, y, o) {
  const S = stones(T, x, y, o.S, o.seed, o.stretch), n = fbm(T, x, y, 24, 7), body = sstep(o.gap * .3, o.gap * 1.4, S.e + (n - .5) * o.gap * .5), dome = Math.sqrt(clamp(S.e * o.S * (o.dome ?? 2.4), 0, 1));
  const k = (.55 + n * .6) * (1 - sstep(.3, .7, fbm(T, x, y, 3, 33)) * .3), base = pick(o.pal, S.id), dirt = mul(hex(o.dirtC), .75 + n * .45);
  return { h: body * (.4 + dome * .55 + n * .12) + (1 - body) * .1, c: mix3(dirt, mul(base, k), body), r: mix(.98, o.rough ?? .78, body), body, S, n };
}
function plankSurface(T, x, y, o) {
  const P = planks(T, x, y, o.n, o), G = woodGrain(T, x, y, P.id, o.vertical, o.seed || 0), body = sstep(.002, .007, P.e);
  const base = pick(o.pal, P.id), k = .66 + G.g * .35 + G.rings * .14 - G.streak * .12;
  const nail = o.nails && (() => { const along = o.vertical ? y : x, w = P.w; const nx = ((along + .05) % (o.len || 1)), d = Math.hypot(Math.min(nx, (o.len || 1) - nx) - .03, (P.f - .5) * w); return d < .006; })();
  let c = mul(base, k * mix(.35, 1, body)); if (nail) c = [60, 58, 60];
  return { h: body * (.7 + G.rings * .1 + G.g * .15) + (1 - body) * .08 - (nail ? -.15 : 0), c, r: mix(.95, o.rough ?? .72, body) - (nail ? .4 : 0), body, P, G };
}
function tilesSurface(T, x, y, o) {
  const n = o.n, gx = x * n / T.W, gy = y * n / T.H, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy, id = hash(wrap(ix, n), wrap(iy, n), o.seed || 2);
  const e = Math.min(Math.min(fx, 1 - fx) * T.W / n, Math.min(fy, 1 - fy) * T.H / n), nz = fbm(T, x, y, 20, 41), body = sstep(o.grout * .4, o.grout * 1.3, e + (fbm(T, x, y, 70, 43) - .5) * o.grout * .3);
  const chk = o.checker ? (ix + iy) % 2 : 0, base = o.checker ? hex(o.pal[chk]) : pick(o.pal, id);
  const crack = o.cracks && fbm(T, x, y, 9, 45 + ix * 3) > .58 && Math.abs(fbm(T, x, y, 30, 47 + iy) - .5) < .02;
  let c = mul(base, (.82 + nz * .3 + (id - .5) * .12)); if (crack) c = mul(c, .55);
  return { h: body * (.75 + nz * .1 - (crack ? .2 : 0)) + (1 - body) * .1, c: mix3(mul(hex(o.groutC), .8 + nz * .3), c, body), r: mix(.95, o.rough ?? .5, body), body, id, ix, iy, fx, fy, chk };
}
function veins(T, x, y, s) { const w = fbm(T, x, y, 3, s, 5); return 1 - sstep(.0, .025, Math.abs(Math.sin(w * 18 + x * 3) )); }

/* ---------- recipes ---------- */
const R = {};
// MEADOW
R.grass = T => (x, y) => { const n = fbm(T, x, y, 6, 1), blade = fbm(T, x * 3, y * 3, 40, 3, 2), clump = fbm(T, x, y, 14, 5); let c = mix3(hex('#4f8a2e'), hex('#8cc04a'), clamp(n * .8 + blade * .5 - .2, 0, 1)); c = mix3(c, hex('#3a6a22'), sstep(.55, .8, clump) * .5);
  const fl = hash(Math.floor(x * 40), Math.floor(y * 40), 9), flower = fl > .985 && Math.hypot((x * 40) % 1 - .5, (y * 40) % 1 - .5) < .3; if (flower) c = fl > .993 ? hex('#ffffff') : hex('#ffd84a'); return { h: blade * .6 + clump * .3, c, r: .9 }; };
R.path = T => (x, y) => { const S = stones(T, x, y, 22, 4), n = fbm(T, x, y, 10, 2), peb = S.e > .006 && hash(Math.floor(x * 22), Math.floor(y * 22), 5) > .7; let c = mix3(hex('#8a6a46'), hex('#b8956a'), n); if (peb) c = mix3(c, hex('#9a948a'), .8);
  return { h: n * .4 + (peb ? Math.sqrt(clamp(S.e * 40, 0, 1)) * .5 : 0), c, r: .92 }; };
R.tileFloor = T => (x, y) => tilesSurface(T, x, y, { n: 3, grout: .006, pal: ['#b0583a', '#a24e32', '#bc6644', '#985032'], groutC: '#8a7a68', rough: .6, cracks: true });
R.planksFloor = T => (x, y) => plankSurface(T, x, y, { n: 6, len: .9, pal: ['#a0703e', '#8e6234', '#b07c46', '#7e5630'], nails: true });
R.ceilWood = T => (x, y) => { const s = plankSurface(T, x, y, { n: 5, len: 1.2, pal: ['#7e5630', '#6e4a28', '#8a5e36'] }); const beam = Math.abs(((x + .5) % 1) - .5) < .07; if (beam) { const g = woodGrain(T, x, y, .3, true, 9); s.c = mul(hex('#4a3420'), .7 + g.g * .5); s.h = .95 + g.rings * .05; } else s.h *= .6; return s; };
R.hedge = T => (x, y) => { let best = 0, col = [40, 80, 30];
  for (let l = 0; l < 3; l++) { const S = stones(T, x + l * .37, y + l * .21, 26 + l * 6, 11 + l), leaf = 1 - clamp(S.d1 * (26 + l * 6) * 1.6, 0, 1); const h = leaf * (.55 + l * .2) + hash(Math.floor(S.id * 1e4), l, 3) * .1; if (h > best) { best = h; col = mix3(hex('#2e6a24'), hex('#7ab846'), clamp(S.id * .9 + l * .15, 0, 1)); } }
  const fl = hash(Math.floor(x * 30), Math.floor(y * 30), 77) > .992; if (fl) col = hex('#f2f0e8'); return { h: best, c: mul(col, .45 + best * .65), r: .85 }; };
R.log = T => (x, y) => { const rows = 6, rh = T.H / rows, r = Math.floor(y / rh), f = y / rh - r, prof = Math.sqrt(clamp(1 - (2 * f - 1) ** 2, 0, 1)), id = hash(r, 0, 4);
  const bark = fbm(T, x * 1, y * 4, 20, 8 + r, 4), crack = Math.abs(fbm(T, x * .5, y * 6, 30, 12 + r) - .5) < .03; let c = mul(mix3(hex('#6a4426'), hex('#9a6a3e'), bark), (.4 + prof * .7) * (crack ? .6 : 1));
  const knot = Math.hypot(((x * 3 + id * 7) % 1) - .5, (f - .5) * .6) < .07 && hash(Math.floor(x * 3 + id * 7), r, 6) > .6; if (knot) c = mul(c, .6);
  return { h: prof * .8 + bark * .15 - (crack ? .1 : 0), c, r: .85 }; };
R.cobble = T => (x, y) => { const s = stoneFloor(T, x, y, { S: 9, gap: .02, pal: ['#8c867c', '#7a736a', '#9a9284', '#6e665e', '#857a6c'], dirtC: '#4a443a', dome: 2.8 }); return s; };
R.mossStone = T => (x, y) => { const s = stoneFloor(T, x, y, { S: 6.5, gap: .025, pal: ['#8a8478', '#76706a', '#9a9284', '#6a645e'], dirtC: '#3a3a30', dome: 3, stretch: 1.3, seed: 5 });
  const moss = sstep(.45, .7, fbm(T, x, y, 6, 81)) * sstep(.6, 0, y / T.H) + sstep(.6, .8, fbm(T, x, y, 18, 83)) * .4; s.c = mix3(s.c, mul(hex('#5a8a32'), .7 + fbm(T, x, y, 50, 85) * .5), clamp(moss, 0, 1) * s.body); s.h += moss * .05; return s; };
R.timber = T => (x, y) => plankSurface(T, x, y, { n: 4, vertical: true, len: T.H, pal: ['#9a6a3e', '#8a5e34', '#a87444', '#7a5230'], nails: true, seed: 3 });
R.bookshelf = T => (x, y) => { // a wooden frame around two shelves of books
  const wood = plankSurface(T, x, y, { n: 3, len: 2, pal: ['#6e4a28', '#7a5230'] }), fr = .06, inside = x > fr && x < 1 - fr && y > fr && y < T.H - fr;
  if (!inside) return { ...wood, h: .9 };
  const shelfH = (T.H - fr * 2) / 2, k = Math.floor((y - fr) / shelfH), fy = (y - fr) / shelfH - k;
  if (fy < .07) return { ...wood, h: .95, c: mul(wood.c, .9) };
  const bx = x - fr, bi = Math.floor(bx * 26 + hash(k, 0, 3) * 5), bid = hash(bi, k, 9), top = .12 + bid * .25, fb = bx * 26 + hash(k, 0, 3) * 5 - bi;
  if (fy < top) return { h: .1, c: mul(hex('#2a1c12'), .6), r: .9 };
  const col = pick(['#7a1e24', '#1e3a6a', '#2a5a2a', '#6a4a1a', '#4a2a5a', '#8a6a2a', '#1e4a4a'], bid), band = Math.abs(fy - (top + .15)) < .03 || Math.abs(fy - .88) < .025;
  const roundSpine = Math.sin(fb * Math.PI);
  return { h: .4 + roundSpine * .35, c: band ? hex('#c9a050') : mul(col, .6 + roundSpine * .5), r: band ? .4 : .7 }; };
R.water = T => (x, y) => { const n = fbm(T, x, y, 4, 1), rip = Math.sin((x * 9 + fbm(T, x, y, 3, 2) * 4) * 6.283) * .5 + .5; return { h: n * .5 + rip * .3, c: mix3(hex('#2a7ac8'), hex('#5ab4f0'), clamp(n * .7 + rip * .4, 0, 1)), r: .1 }; };

// CASTLE
R.stoneBrick = T => (x, y) => brickWall(T, x, y, { rows: 5, cols: 2, mortar: .012, pal: ['#bcb6a8', '#aea89c', '#c8c2b2', '#a49e90', '#b4ac9a'], mortarC: '#7a7468', grime: .18, floorGrime: true, rough: .85 });
R.tapestry = T => { const f = R.stoneBrick(T); return (x, y) => { const s = f(x, y), cx = .5, top = .14, bot = 1.0, w = .3;
  const inBan = Math.abs(x - cx) < w && y > top && y < bot;
  const tail = y > bot - .14 && (y - (bot - .14)) / .14 > 1 - Math.abs(x - cx) / w;   // swallowtail point
  if (Math.abs(y - top + .015) < .012 && Math.abs(x - cx) < w + .04) return { h: .95, c: hex('#3a2a1a'), r: .6 };   // rod
  if (!inBan || tail) return s;
  const fold = Math.sin((x - cx) * 40) * .5 + .5, weave = (Math.sin(x * 900) * Math.sin(y * 900) > 0 ? 1.06 : .94);
  let c = mul(hex('#8e1a2e'), (.7 + fold * .4) * weave); const ex = Math.abs(x - cx), border = ex > w - .03 || Math.abs(y - top - .03) < .015;
  // crest: a gold shield with a crown
  const sy = (y - .42) / .26, sx = ex / .14, shield = sy > -1 && sy < 1 && sx < 1 - Math.max(0, sy) ** 2 * .6, inner = sy > -.8 && sy < .8 && sx < .78 - Math.max(0, sy) ** 2 * .5;
  if (border || (shield && !inner)) c = mul(hex('#e8b85a'), .8 + fold * .3);
  if (inner) c = mul(hex('#c42a3a'), .8 + fold * .3);
  const star = (() => { const dx = x - cx, dy = y - .42, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy); return r < .03 + (Math.cos(5 * a) * .5 + .5) * .035; })(); if (star) c = hex('#f0c860');
  return { h: .55 + fold * .25 + (border || shield ? .08 : 0), c, r: border || star ? .45 : .9 }; }; };
R.marble = T => (x, y) => { const s = tilesSurface(T, x, y, { n: 2, grout: .003, pal: ['#ece8e0', '#6e6a78'], checker: true, groutC: '#5a5660', rough: .15 }); const v = veins(T, x, y, 31 + s.chk * 7) * (s.chk ? .5 : .7);
  s.c = mix3(s.c, s.chk ? hex('#a8a4b8') : hex('#8a8494'), v * .6); s.c = mul(s.c, .92 + fbm(T, x, y, 8, 37) * .14); return s; };
R.royalCarpet = T => (x, y) => { const weave = (Math.sin(x * 1100) * Math.sin(y * 1100) > 0 ? 1.06 : .94), n = fbm(T, x, y, 30, 3), gx = ((x * 4) % 1) - .5, gy = ((y * 4) % 1) - .5, dia = Math.abs(gx) + Math.abs(gy);
  let c = mul(hex('#8e1a2e'), (.8 + n * .3) * weave); const gold = Math.abs(dia - .32) < .035 || dia < .06; if (gold) c = mul(hex('#e8b85a'), .85 + n * .2); const wear = fbm(T, x, y, 3, 9); c = mix3(c, mul(c, .8), sstep(.6, .8, wear));
  return { h: .5 + n * .2 + (gold ? .1 : 0), c, r: gold ? .6 : .95 }; };
R.ceilVault = T => (x, y) => { const s = brickWall(T, x, y, { rows: 4, cols: 2, mortar: .01, pal: ['#968e84', '#8a8278', '#a09888'], mortarC: '#5a544a', rough: .9 }); s.c = mul(s.c, .85);
  const beam = Math.min(Math.abs(((x + .5) % 1) - .5), Math.abs(((y + .5) % 1) - .5)) < .08; if (beam) { const g = woodGrain(T, x, y, .4, Math.abs(((x + .5) % 1) - .5) < .08, 3); return { h: 1, c: mul(hex('#4a3424'), .7 + g.g * .5 + g.rings * .1), r: .8 }; } s.h *= .7; return s; };

// DESERT
R.sandstone = T => (x, y) => { const s = brickWall(T, x, y, { rows: 4, cols: 1.5, mortar: .008, pal: ['#e8d09c', '#dec490', '#eed8a8', '#d8bc88'], mortarC: '#c4a678', grime: .1, soot: 0, rough: .9 }); const strata = Math.sin((y + fbm(T, x, y, 2, 61) * .2) * 80) * .5 + .5; s.c = mul(s.c, .9 + strata * .12); s.h += strata * .04 * s.body; return s; };
R.chiseled = T => { const f = R.sandstone(T); return (x, y) => { const s = f(x, y), px = (x - .5) / .38, py = (y - .62) / .48, inP = Math.abs(px) < 1 && Math.abs(py) < 1;
  if (!inP) return s; const frame = Math.max(Math.abs(px), Math.abs(py)) > .88;
  // an eye glyph: brow, almond eye with a lapis pupil, and the hanging spiral below
  const ex = px / .62, ey = (py + .25) / .26, eye = ex * ex + (ey * 1.6) ** 2 < 1 && ex * ex + (ey * 1.6) ** 2 > .62, pupil = Math.hypot(px, (py + .25) * 1.1) < .14;
  const brow = Math.abs(py + .58 + px * px * .15) < .05 && Math.abs(px) < .7, tear = Math.abs(px + .1 + (py - .1) * .3) < .05 && py > -.05 && py < .5, curl = Math.abs(Math.hypot(px - .25, py - .45) - .18) < .045 && py > .4;
  const cut = frame || eye || brow || tear || curl; if (pupil) return { h: s.h - .05, c: hex('#2a5ac8'), r: .3 };
  if (cut) return { h: s.h - .22, c: mul(s.c, .62), r: .95 }; return { ...s, h: s.h + .03 }; }; };
R.ochrePlaster = T => (x, y) => { const n = fbm(T, x, y, 14, 3), f = fbm(T, x, y, 60, 5), crack = Math.abs(fbm(T, x, y, 10, 9, 5) - .5) < .003; const flake = sstep(.68, .7, fbm(T, x, y, 12, 11));
  let c = mul(mix3(hex('#b89a5e'), hex('#d0b47a'), n), .85 + f * .25); if (flake) c = mix3(c, hex('#9a7a4a'), .7); if (crack) c = mul(c, .55); c = mul(c, 1 - sstep(T.H * .85, T.H, y) * .3);
  return { h: .6 + n * .1 + f * .08 - (crack ? .2 : 0) - flake * .12, c, r: .92 }; };
R.sandTile = T => (x, y) => { const s = tilesSurface(T, x, y, { n: 2, grout: .005, pal: ['#e4c890', '#dcc088', '#e8cc96'], groutC: '#b09060', rough: .8, cracks: true }); s.c = mix3(s.c, hex('#f0dcb0'), sstep(.6, .8, fbm(T, x, y, 5, 51)) * .4); return s; };
R.sandTile2 = T => (x, y) => tilesSurface(T, x, y, { n: 4, grout: .004, pal: ['#e0c48a', '#d4b67c', '#e8cc96', '#cca870'], groutC: '#a88a5a', rough: .8, seed: 5 });
R.sand = T => (x, y) => { const rip = Math.sin((y * 14 + fbm(T, x, y, 2, 3) * 3 + x * 2) * 6.283) * .5 + .5, n = fbm(T, x, y, 30, 5); return { h: rip * .5 + n * .15, c: mul(mix3(hex('#e0c088'), hex('#f2dcaa'), rip * .6 + n * .4), .92 + (hash(Math.floor(x * 300), Math.floor(y * 300), 3) > .97 ? .15 : 0)), r: .95 }; };
R.sandPath = T => (x, y) => { const s = stoneFloor(T, x, y, { S: 7, gap: .03, pal: ['#d8bc86', '#ccae78', '#e2c690'], dirtC: '#c8a874', dome: 1.4, rough: .85 }); s.c = mix3(s.c, hex('#e8d2a2'), (1 - s.body) * .6); return s; };
R.ceilSand = T => (x, y) => { const s = brickWall(T, x, y, { rows: 3, cols: 1, mortar: .01, pal: ['#c8a870', '#bc9c66', '#d0b07a'], mortarC: '#8a6a44', soot: .05 }); s.c = mul(s.c, .85); return s; };

// ICE
R.ice = T => (x, y) => { const B = blocks(T, x, y, 3, 1.5, { seed: 8 }), n = fbm(T, x, y, 4, 3), deep = fbm(T, x, y, 2, 9), body = sstep(.004, .016, B.e + (n - .5) * .006);
  const crack = Math.abs(fbm(T, x, y, 3, 13 + B.r, 5) - .5) < .006, bub = hash(Math.floor(x * 90), Math.floor(y * 90), 5) > .985;
  let c = mix3(hex('#6ab0e0'), hex('#d8f2ff'), clamp(deep * .7 + n * .4 + (1 - body) * .5, 0, 1)); if (crack || bub) c = mix3(c, [255, 255, 255], .7);
  return { h: body * (.8 + n * .1) + (1 - body) * .2 - (crack ? .1 : 0), c, r: crack ? .4 : .08, e: mul(hex('#2a6ac0'), deep * .25) }; };
R.snowBrick = T => (x, y) => { const s = brickWall(T, x, y, { rows: 6, cols: 2.5, mortar: .01, pal: ['#8a94a4', '#7a8494', '#96a0b0'], mortarC: '#5a6474', grime: .15, soot: 0 }); const snow = sstep(.15, .45, s.B ? (1 - s.B.fy) * .4 + fbm(T, x, y, 12, 41) * .6 : 0) * s.body;
  const topSnow = sstep(.45, .6, fbm(T, x, y, 3, 45) + (1 - y / T.H) * .2); s.c = mix3(s.c, mul(hex('#f4f8ff'), .9 + fbm(T, x, y, 40, 47) * .1), clamp(snow * .8 + topSnow * .6, 0, 1)); s.h += snow * .1; s.r = mix(s.r, .5, snow); return s; };
R.spruce = T => (x, y) => plankSurface(T, x, y, { n: 5, vertical: true, len: T.H, pal: ['#6a4a30', '#5e4028', '#745236', '#563a24'], seed: 7, nails: true });
R.iceFloor = T => (x, y) => { const s = tilesSurface(T, x, y, { n: 2, grout: .005, pal: ['#bfe2f6', '#aed8f0', '#c8e8fa'], groutC: '#7aa8c8', rough: .08 }); const crack = Math.abs(fbm(T, x, y, 3, 17, 5) - .5) < .005; if (crack) s.c = mix3(s.c, [255, 255, 255], .6); const frost = sstep(.55, .75, fbm(T, x, y, 6, 19)); s.c = mix3(s.c, hex('#f0faff'), frost * .5); s.r = mix(s.r, .5, frost); return s; };
R.spruceFloor = T => (x, y) => plankSurface(T, x, y, { n: 6, len: .8, pal: ['#6a4a30', '#5e4028', '#745236'], seed: 2 });
R.snow = T => (x, y) => { const n = fbm(T, x, y, 5, 1), f = fbm(T, x, y, 40, 3), sp = hash(Math.floor(x * 400), Math.floor(y * 400), 7) > .993; return { h: n * .5 + f * .15, c: sp ? [255, 255, 255] : mix3(hex('#d8e6f4'), hex('#f8fcff'), n * .7 + f * .3), r: sp ? .1 : .7 }; };
R.ceilIce = T => (x, y) => { const s = R.ice(T)(x, y); s.c = mul(s.c, .8); return s; };
R.ceilSpruce = T => (x, y) => { const s = plankSurface(T, x, y, { n: 5, len: 1.4, pal: ['#5e4028', '#563a24'] }); s.c = mul(s.c, .85); return s; };

// CURSED CAPITAL
R.darkBrick = T => (x, y) => brickWall(T, x, y, { rows: 9, cols: 3, mortar: .008, pal: ['#68443c', '#5a3a34', '#74504a', '#4e322e', '#604040'], mortarC: '#2e2224', grime: .4, floorGrime: true, soot: .2 });
R.cursedWall = T => (x, y) => { const s = brickWall(T, x, y, { rows: 5, cols: 2, mortar: .01, pal: ['#685e7c', '#5e5470', '#726888', '#544a66'], mortarC: '#2c2638', grime: .35, floorGrime: true });
  const w = fbm(T, x * .7, y, 4, 91, 5), crack = Math.abs(w - .5) < .004 * sstep(.45, .7, fbm(T, x, y, 2, 93)); if (crack) { s.c = hex('#c46bff'); s.h -= .2; s.r = .3; s.e = hex('#b050ff'); } else s.e = [0, 0, 0]; return s; };
R.halfTimber = T => (x, y) => { const pl = { h: .6 + fbm(T, x, y, 40, 3) * .08, c: mul(mix3(hex('#a2957f'), hex('#c4b9a6'), fbm(T, x, y, 6, 5)), 1 - sstep(.6, .8, fbm(T, x, y, 3, 7)) * .25), r: .92 };
  const H = T.H, beams = [[[0, .07], [1, .07]], [[0, .5], [1, .5]], [[0, H - .06], [1, H - .06]], [[.07, 0], [.07, H]], [[.93, 0], [.93, H]], [[.07, .5], [.5, .07]], [[.5, .07], [.93, .5]], [[.07, H - .06], [.5, .5]], [[.5, .5], [.93, H - .06]]];
  let best = 9, along = 0; for (const [a, b] of beams) { const ex = b[0] - a[0], ey = b[1] - a[1], t = clamp(((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey), 0, 1), d = Math.hypot(x - a[0] - ex * t, y - a[1] - ey * t); if (d < best) { best = d; along = t * Math.hypot(ex, ey); } }
  if (best < .055) { const g = fbm(T, along * 3, best * 20, 4, 9, 3), prof = Math.cos(best / .055 * Math.PI / 2); return { h: .8 + prof * .15 + g * .05, c: mul(hex('#3a2a1e'), .7 + g * .5), r: .8 }; } return pl; };
R.slateWall = T => (x, y) => { const rows = 9, rh = T.H / rows, r = Math.floor(y / rh), off = (r % 2) * .5 / 5, cx = (x + off) * 5, c = Math.floor(cx), fx = cx - c, fy = y / rh - r, id = hash(wrap(c, 5), r, 3);
  const round = Math.hypot((fx - .5) * 1.1, Math.max(0, fy - .5) * 1.4) < .55, body = round && fy > .05; const n = fbm(T, x, y, 30, 5);
  return { h: body ? .4 + fy * .5 + n * .1 : .1, c: body ? mul(pick(['#3a4258', '#323a4e', '#424a62', '#2c3446'], id), .75 + n * .4 + fy * .2) : hex('#1a1e28'), r: .55 }; };
R.cursedBanner = T => { const f = R.darkBrick(T); return (x, y) => { const s = f(x, y), cx = .5, w = .27, top = .1, bot = .95;
  if (Math.abs(y - top + .02) < .012 && Math.abs(x - cx) < w + .05) return { h: .95, c: hex('#1e1622'), r: .5 };
  const rag = bot - (hash(Math.floor(x * 30), 0, 5) * .08), inBan = Math.abs(x - cx) < w && y > top && y < rag; if (!inBan) return { ...s, e: [0, 0, 0] };
  const fold = Math.sin((x - cx) * 40) * .5 + .5; let c = mul(hex('#3e1a56'), .7 + fold * .4), e = [0, 0, 0]; const ex = Math.abs(x - cx), border = ex > w - .03;
  const dy = y - .45, eye = (x - cx) ** 2 / .016 + dy * dy / .004 < 1, pupil = (x - cx) ** 2 / .0012 + dy * dy / .0035 < 1;
  if (border) c = mul(hex('#7a4a9a'), .9); if (eye) { c = hex('#d47bff'); e = hex('#c060ff'); } if (pupil) { c = hex('#1a0a24'); e = [0, 0, 0]; }
  return { h: .55 + fold * .25, c, r: .9, e }; }; };
R.deadGrass = T => (x, y) => { const n = fbm(T, x, y, 6, 1), blade = fbm(T, x * 3, y * 3, 40, 3, 2); return { h: blade * .6 + n * .2, c: mix3(hex('#4e4a3c'), hex('#7a7462'), clamp(n * .7 + blade * .5 - .1, 0, 1)), r: .95 }; };
R.cobbleRoad = T => (x, y) => stoneFloor(T, x, y, { S: 8, gap: .02, pal: ['#68666e', '#5a5862', '#74727c', '#504e58'], dirtC: '#2a282e', dome: 2.6, rough: .7 });
R.darkMarble = T => (x, y) => { const s = tilesSurface(T, x, y, { n: 2, grout: .003, pal: ['#5c5268', '#3a3244'], checker: true, groutC: '#221c28', rough: .18 }); const v = veins(T, x, y, 51 + s.chk * 3); s.c = mix3(s.c, hex('#c8a0e6'), v * .45); return s; };
R.darkTile = T => (x, y) => tilesSurface(T, x, y, { n: 4, grout: .005, pal: ['#605466', '#564a5c', '#6a5e70'], groutC: '#2a242e', rough: .6, cracks: true });
R.ceilDark = T => (x, y) => { const s = plankSurface(T, x, y, { n: 4, len: 1.3, pal: ['#544046', '#4a383e', '#5e484e'] }); s.c = mul(s.c, .85); return s; };
R.cursedPool = T => (x, y) => { const n = fbm(T, x, y, 4, 1), rip = Math.sin((x * 9 + fbm(T, x, y, 3, 2) * 4) * 6.283) * .5 + .5; return { h: n * .5 + rip * .3, c: mix3(hex('#4a1070'), hex('#9a40d0'), clamp(n * .7 + rip * .4, 0, 1)), r: .12, e: mul(hex('#8a30d0'), .3 + rip * .3) }; };

// DOORS AND THE GOAL
const doorBase = (T, x, y, accent) => { const fr = .06, inside = x > fr && x < 1 - fr && y > fr * .7;
  if (!inside) { const s = brickWall(T, x, y, { rows: 10, cols: 4, mortar: .006, pal: ['#4a4650', '#3e3a44'], mortarC: '#222028' }); if (accent) s.c = mix3(s.c, hex(accent), .55); return { ...s, h: s.h * .5 + .5 }; }
  const p = plankSurface(T, x, y, { n: 5, vertical: true, len: T.H, pal: ['#6a4426', '#5e3c22', '#74492a'], seed: 11 });
  const band = [.22, T.H - .25].some(b => Math.abs(y - b) < .035) && x > fr && x < 1 - fr;
  if (band) { const n = fbm(T, x, y, 40, 9); return { h: .9, c: mul(hex('#3a3a42'), .8 + n * .3), r: .45 }; }
  const ring = Math.abs(Math.hypot(x - .78, y - .7) - .04) < .008; if (ring) return { h: .95, c: hex('#2a2a30'), r: .35 };
  return p; };
const keyDoor = (gem, gemE, frame) => T => (x, y) => { const d = doorBase(T, x, y, frame); const g = Math.hypot((x - .5) * 1, (y - .55) * 1); if (g < .055) { const k = 1 - g / .055; return { h: .8 + k * .2, c: mix3(hex(gem), [255, 255, 255], k * .4), r: .15, e: mul(hex(gemE), .4 + k * .4) }; } if (g < .075) return { h: .85, c: hex('#c9a050'), r: .3 }; return { ...d, e: [0, 0, 0] }; };
R.door = T => (x, y) => doorBase(T, x, y, null);
R.door1 = keyDoor('#ff4a5a', '#ff2030', '#d02838');
R.door2 = keyDoor('#4a8aff', '#2060ff', '#2858c8');
R.door3 = keyDoor('#ffd23a', '#ffb000', '#d0a020');
const goal = on => T => (x, y) => { const s = brickWall(T, x, y, { rows: 5, cols: 2, mortar: .01, pal: ['#8a8478', '#7a746a'], mortarC: '#4a443a' }); const dx = x - .5, dy = y - .62, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  const ringO = Math.abs(r - .36) < .03, ringI = Math.abs(r - .29) < .012;
  const triD = Math.max(Math.abs(dx) * .866 + dy * .5, -dy) - .12, triLine = Math.abs(triD) < .012, dot = r < .045, rune = r > .3 && r < .35 && Math.abs(Math.sin(a * 6)) < .25;
  const glowC = on ? hex('#fff0b0') : hex('#b890ff'), gl = on ? hex('#ffe070') : hex('#9a60ff');
  if (r < .4) { const disc = mul(hex(on ? '#5a4a30' : '#2e2440'), .9 + fbm(T, x, y, 30, 3) * .2); if (ringO || ringI || triLine || dot || rune) return { h: .85, c: glowC, r: .3, e: mul(gl, on ? 1 : .55) }; return { h: .7, c: disc, r: .5, e: [0, 0, 0] }; }
  return { ...s, e: [0, 0, 0] }; };
R.goalOff = goal(false); R.goalOn = goal(true);

// which textures are walls (1 x 1.25 m), and how strong their relief is
export const WALLS = new Set(['hedge', 'log', 'cobble', 'bookshelf', 'sandstone', 'chiseled', 'ice', 'snowBrick', 'spruce', 'door', 'door1', 'door2', 'door3', 'goalOff', 'goalOn', 'mossStone', 'stoneBrick', 'timber', 'tapestry', 'cursedWall', 'halfTimber', 'darkBrick', 'slateWall', 'ochrePlaster', 'cursedBanner']);
export const STRENGTH = { grass: 3, snow: 2, sand: 3, water: 2, cursedPool: 2, marble: 2, darkMarble: 2, iceFloor: 2, ice: 3, royalCarpet: 2, hedge: 7, cobble: 8, mossStone: 8, cobbleRoad: 8 };
export const NAMES = Object.keys(R);

// render one texture at N x N; returns canvases for colour, normal, roughness and (if any) glow
export function render(name, N) {
  const T = { W: 1, H: WALLS.has(name) ? 1.25 : 1 }, f = R[name](T), Hh = new Float32Array(N * N), C = new Uint8ClampedArray(N * N * 4), Rg = new Uint8ClampedArray(N * N * 4), E = new Uint8ClampedArray(N * N * 4); let hasE = false;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const s = f((i + .5) / N * T.W, (j + .5) / N * T.H), k = j * N + i; Hh[k] = s.h; C.set([s.c[0], s.c[1], s.c[2], 255], k * 4); const r = clamp(s.r, 0, 1) * 255; Rg.set([r, r, r, 255], k * 4);
    if (s.e && (s.e[0] + s.e[1] + s.e[2]) > 0) { hasE = true; E.set([s.e[0], s.e[1], s.e[2], 255], k * 4); } else E.set([0, 0, 0, 255], k * 4);
  }
  const wrapI = (i) => ((i % N) + N) % N, Hs = (i, j) => Hh[clamp(j, 0, N - 1) * N + wrapI(i)], st = (STRENGTH[name] || 3.5) * N / 1024, Nm = new Uint8ClampedArray(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, dx = (Hs(i + 1, j) - Hs(i - 1, j)) * st * 4, dy = (Hs(i, j + 1) - Hs(i, j - 1)) * st * 4, l = Math.hypot(dx, dy, 1);
    Nm.set([(-dx / l * .5 + .5) * 255, (dy / l * .5 + .5) * 255, (1 / l * .5 + .5) * 255, 255], k * 4);
    let avg = 0; const o = Math.max(2, Math.round(N / 170)); for (const [a, b] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, o], [-o, o], [o, -o]]) avg += Hs(i + a, j + b); avg /= 8;
    const ao = clamp(1 - (avg - Hh[k]) * 2.2, .45, 1); C[k * 4] *= ao; C[k * 4 + 1] *= ao; C[k * 4 + 2] *= ao;   // cavity shading baked into colour
  }
  const cv = d => { const c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d').putImageData(new ImageData(d, N, N), 0, 0); return c; };
  return { c: cv(C), n: cv(Nm), r: cv(Rg), e: hasE ? cv(E) : null, wall: T.H !== 1 };
}
