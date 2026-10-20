// Build step: meshes every sculpted model, bakes colour + occlusion + skin weights into the vertices,
// simplifies to two detail levels (hi for desktops, lo for phones) and writes compact binary files to
// assets/cast/<name>.<lod>.bin. Phones never run the sculpting maths; they just download vertices.
//   node cobblekeep/sculpt/bake.mjs [name ...]
// Needs: npm i meshoptimizer
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';
import { surfaceNets, len, clamp } from './sdf.mjs';
import * as goblins from './models/goblin.mjs';
import * as imps from './models/imp.mjs';
import * as bats from './models/bat.mjs';
import * as knights from './models/knight.mjs';
import * as wisps from './models/wisp.mjs';
import * as bosses from './models/bosses.mjs';
import * as props from './models/props.mjs';

const MODELS = { goblin: goblins.goblin, goblinChief: goblins.goblinChief, imp: imps.imp, darkWizard: imps.darkWizard, bat: bats.bat, batQueen: bats.batQueen, knight: knights.knight, wisp: wisps.wisp, totem: wisps.totem, mummy: bosses.mummy, giant: bosses.giant, cactus: props.cactus };
// triangle budgets per model, shared between its pieces by size
const LODS = { hi: { budget: 18000, min: 300, err: .01 }, lo: { budget: 5000, min: 120, err: .04 } };
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'cast');

function buildPiece(model, pc) {
  const f = pc.sdf, { pos, idx } = surfaceNets(f, pc.lo, pc.hi, pc.step), N = pos.length / 3, e = .0015;
  const nor = new Float32Array(N * 3), col = new Float32Array(N * 3), si = new Uint8Array(N * 4), sw = new Uint8Array(N * 4);
  for (let v = 0; v < N; v++) {
    const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
    let g = [f([p[0] + e, p[1], p[2]]) - f([p[0] - e, p[1], p[2]]), f([p[0], p[1] + e, p[2]]) - f([p[0], p[1] - e, p[2]]), f([p[0], p[1], p[2] + e]) - f([p[0], p[1], p[2] - e])];
    const gl = len(g) || 1; g = g.map(x => x / gl); nor.set(g, v * 3);
    let ao = 1; if (pc.ao) { let o = 0; for (let s = 1; s <= 5; s++) { const h = s * .012; o += (h - f([p[0] + g[0] * h, p[1] + g[1] * h, p[2] + g[2] * h])) / (1 << s); } ao = clamp(1 - o * 9, .35, 1); }
    const c = pc.paint(p, g); col.set([c[0] * ao, c[1] * ao, c[2] * ao], v * 3);
    const w = model.weights(p, pc.name); let tot = 0; const q = [0, 0, 0, 0];
    w.forEach(([b, x], k) => { si[v * 4 + k] = b; q[k] = Math.round(x * 255); tot += q[k]; });
    q[0] += 255 - tot; sw.set(q, v * 4);   // quantised weights must still sum to exactly 255
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx), nor, col, si, sw, N };
}

function simplify(P, lod, share, errScale = 1) {
  const target = Math.max(lod.min, Math.round(lod.budget * share)) * 3;
  const attr = new Float32Array(P.N * 6); for (let v = 0; v < P.N; v++) { attr.set(P.nor.subarray(v * 3, v * 3 + 3), v * 6); attr.set(P.col.subarray(v * 3, v * 3 + 3).map(x => x * 2), v * 6 + 3); }
  const [ix] = target < P.idx.length ? MeshoptSimplifier.simplifyWithAttributes(P.idx, P.pos, 3, attr, 6, [.6, .6, .6, 1, 1, 1], null, target, lod.err * errScale) : [P.idx];
  // keep only the vertices still in use
  const map = new Int32Array(P.N).fill(-1), keep = []; const idx = new Uint32Array(ix.length);
  for (let i = 0; i < ix.length; i++) { let m = map[ix[i]]; if (m < 0) { m = map[ix[i]] = keep.length; keep.push(ix[i]); } idx[i] = m; }
  const pick = (a, n, T) => { const o = new T(keep.length * n); keep.forEach((v, i) => { for (let k = 0; k < n; k++) o[i * n + k] = a[v * n + k]; }); return o; };
  return { pos: pick(P.pos, 3, Float32Array), nor: pick(P.nor, 3, Float32Array), col: pick(P.col, 3, Float32Array), si: pick(P.si, 4, Uint8Array), sw: pick(P.sw, 4, Uint8Array), idx, N: keep.length };
}

// file: "SCK1" | u32 json length | json | padding to 4 | buffers (each 4-byte aligned)
function pack(model, meshes) {
  const bufs = [], json = { name: model.name, bones: model.bones, meta: model.meta, meshes: [] }; let off = 0;
  const put = a => { const b = Buffer.from(a.buffer, a.byteOffset, a.byteLength), pad = (4 - (b.length % 4)) % 4; bufs.push(b, Buffer.alloc(pad)); const o = off; off += b.length + pad; return o; };
  for (const [pc, M] of meshes) {
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < M.N; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], M.pos[i * 3 + k]); hi[k] = Math.max(hi[k], M.pos[i * 3 + k]); }
    const qp = new Uint16Array(M.N * 4), qn = new Int8Array(M.N * 4), qc = new Uint8Array(M.N * 4);
    for (let i = 0; i < M.N; i++) for (let k = 0; k < 3; k++) {
      qp[i * 4 + k] = Math.round((M.pos[i * 3 + k] - lo[k]) / ((hi[k] - lo[k]) || 1) * 65535);
      qn[i * 4 + k] = Math.round(clamp(M.nor[i * 3 + k], -1, 1) * 127);
      qc[i * 4 + k] = Math.round(clamp(Math.pow(clamp(M.col[i * 3 + k], 0, 1), 1 / 2.2), 0, 1) * 255);   // gamma-coded for precision; decoded at load
    }
    const big = M.N > 65535, ix = big ? M.idx : Uint16Array.from(M.idx);
    json.meshes.push({ name: pc.name, mat: pc.mat, count: M.N, tris: M.idx.length / 3, lo, hi, big, pos: put(qp), nor: put(qn), col: put(qc), si: put(M.si), sw: put(M.sw), idx: put(ix), idxLen: M.idx.length });
  }
  const js = Buffer.from(JSON.stringify(json)), head = Buffer.alloc(8); head.write('SCK1', 0); head.writeUInt32LE(js.length, 4);
  const pad = Buffer.alloc((4 - ((8 + js.length) % 4)) % 4);
  return Buffer.concat([head, js, pad, ...bufs]);
}

await MeshoptSimplifier.ready;
mkdirSync(OUT, { recursive: true });
const want = process.argv.slice(2);
for (const [key, make] of Object.entries(MODELS)) {
  if (want.length && !want.includes(key)) continue;
  const t0 = Date.now(), model = make(), raw = model.pieces.map(pc => [pc, buildPiece(model, pc)]);
  const report = [];
  for (const [lodName, lod] of Object.entries(LODS)) {
    const total = raw.reduce((a, [, P]) => a + P.idx.length / 3, 0), meshes = raw.map(([pc, P]) => [pc, simplify(P, lod, P.idx.length / 3 / total * (model.budget || 1), model.errScale)]), buf = pack(model, meshes);
    writeFileSync(join(OUT, `${model.name}.${lodName}.bin`), buf);
    report.push(`${lodName}: ${meshes.reduce((a, [, m]) => a + m.idx.length / 3, 0)} tris, ${(buf.length / 1024).toFixed(0)} KB`);
  }
  console.log(`${model.name}  raw ${raw.reduce((a, [, P]) => a + P.idx.length / 3, 0)} tris  ${report.join('  ')}  (${Date.now() - t0} ms)`);
}
