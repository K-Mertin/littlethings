// Build step for Sunny Circuit's sculpted cars: meshes each distance-field piece with surface nets,
// takes normals from the field's gradient (smooth highlights on paint), bakes colour + occlusion into the
// vertices, splits a piece into materials by its `split` function (paint, trim, interior...), simplifies to
// two detail levels and writes racing/assets/cars/<name>.<lod>.bin in Cobble Keep's SCK1 format.
//   node racing/sculpt/bake.mjs [name ...]      (needs: npm i meshoptimizer)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';
import { surfaceNets, len, clamp } from './shape.mjs';
import { gt, wheelSplit } from './gt.mjs';
import { muscle } from './muscle.mjs';
import { hatch } from './hatch.mjs';
import { proto } from './proto.mjs';
import { roadster } from './roadster.mjs';
import { baja } from './baja.mjs';
import { formula } from './formula.mjs';
import { volt } from './volt.mjs';

const MODELS = { gt, wheelSplit, muscle, hatch, proto, roadster, baja, formula, volt };
const LODS = { hi: { budget: 90000, min: 200, err: .004 }, lo: { budget: 16000, min: 60, err: .02 } };
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'cars');

const COARSE = +process.env.SCULPT_COARSE || 1, ONLY = process.env.SCULPT_PIECES ? process.env.SCULPT_PIECES.split(',') : null;   // quick previews
function buildPiece(pc) {
  const step = pc.step * COARSE, f = pc.sdf, { pos, idx } = surfaceNets(f, pc.lo, pc.hi, step), N = pos.length / 3, e = step * 0.25;
  const nor = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let v = 0; v < N; v++) {
    const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
    let g = [f([p[0] + e, p[1], p[2]]) - f([p[0] - e, p[1], p[2]]), f([p[0], p[1] + e, p[2]]) - f([p[0], p[1] - e, p[2]]), f([p[0], p[1], p[2] + e]) - f([p[0], p[1], p[2] - e])];
    const gl = len(g) || 1; g = g.map(x => x / gl); nor.set(g, v * 3);
    let ao = 1; if (pc.ao) { let o = 0; for (let s = 1; s <= 5; s++) { const h = s * .02; o += (h - f([p[0] + g[0] * h, p[1] + g[1] * h, p[2] + g[2] * h])) / (1 << s); } ao = clamp(1 - o * 6, .3, 1); }
    const c = pc.paint(p, g); col.set([c[0] * ao, c[1] * ao, c[2] * ao], v * 3);
  }
  // split triangles by material (decided at the triangle centre)
  const groups = {};
  for (let t = 0; t < idx.length; t += 3) {
    let m = pc.mat || 'paint';
    if (pc.split) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const p = [(pos[a] + pos[b] + pos[c]) / 3, (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3, (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3];
      m = pc.split(p, [nor[a] + nor[b] + nor[c], nor[a + 1] + nor[b + 1] + nor[c + 1], nor[a + 2] + nor[b + 2] + nor[c + 2]].map(x => x / 3));
    }
    (groups[m] ||= []).push(idx[t], idx[t + 1], idx[t + 2]);
  }
  return { pos: new Float32Array(pos), nor, col, N, groups: Object.entries(groups).map(([m, ix]) => [m, new Uint32Array(ix)]) };
}

function simplify(P, ix, lod, share, errScale = 1) {
  const target = Math.max(lod.min, Math.round(lod.budget * share)) * 3;
  const attr = new Float32Array(P.N * 6); for (let v = 0; v < P.N; v++) { attr.set(P.nor.subarray(v * 3, v * 3 + 3), v * 6); attr.set(P.col.subarray(v * 3, v * 3 + 3).map(x => x * 2), v * 6 + 3); }
  const [out] = target < ix.length ? MeshoptSimplifier.simplifyWithAttributes(ix, P.pos, 3, attr, 6, [.8, .8, .8, 1.5, 1.5, 1.5], null, target, lod.err * errScale, ['LockBorder']) : [ix];
  const map = new Int32Array(P.N).fill(-1), keep = [], idx = new Uint32Array(out.length);
  for (let i = 0; i < out.length; i++) { let m = map[out[i]]; if (m < 0) { m = map[out[i]] = keep.length; keep.push(out[i]); } idx[i] = m; }
  const pick = (a, n) => { const o = new Float32Array(keep.length * n); keep.forEach((v, i) => { for (let k = 0; k < n; k++) o[i * n + k] = a[v * n + k]; }); return o; };
  return { pos: pick(P.pos, 3), nor: pick(P.nor, 3), col: pick(P.col, 3), idx, N: keep.length };
}

// file: "SCK1" | u32 json length | json | padding | buffers (4-byte aligned); no skin data for cars
function pack(model, meshes) {
  const bufs = [], json = { name: model.name, bones: [], meta: model.meta, meshes: [] }; let off = 0;
  const put = a => { const b = Buffer.from(a.buffer, a.byteOffset, a.byteLength), pad = (4 - (b.length % 4)) % 4; bufs.push(b, Buffer.alloc(pad)); const o = off; off += b.length + pad; return o; };
  for (const [name, mat, extra, M] of meshes) {
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < M.N; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], M.pos[i * 3 + k]); hi[k] = Math.max(hi[k], M.pos[i * 3 + k]); }
    const qp = new Uint16Array(M.N * 4), qn = new Int8Array(M.N * 4), qc = new Uint8Array(M.N * 4);
    for (let i = 0; i < M.N; i++) for (let k = 0; k < 3; k++) {
      qp[i * 4 + k] = Math.round((M.pos[i * 3 + k] - lo[k]) / ((hi[k] - lo[k]) || 1) * 65535);
      qn[i * 4 + k] = Math.round(clamp(M.nor[i * 3 + k], -1, 1) * 127);
      qc[i * 4 + k] = Math.round(clamp(Math.pow(clamp(M.col[i * 3 + k], 0, 1), 1 / 2.2), 0, 1) * 255);
    }
    const big = M.N > 65535, ix = big ? M.idx : Uint16Array.from(M.idx);
    json.meshes.push({ name, mat, ...extra, count: M.N, tris: M.idx.length / 3, lo, hi, big, pos: put(qp), nor: put(qn), col: put(qc), idx: put(ix), idxLen: M.idx.length });
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
  const t0 = Date.now(), model = make();
  const raw = model.pieces.filter(pc => !ONLY || ONLY.includes(pc.name)).map(pc => { const t = Date.now(), P = buildPiece(pc); console.log(`  ${pc.name}: ${P.groups.map(([m, ix]) => m + ' ' + ix.length / 3).join(', ')} (${Date.now() - t} ms)`); return [pc, P]; });
  const total = raw.reduce((a, [, P]) => a + P.groups.reduce((b, [, ix]) => b + ix.length / 3, 0), 0), report = [];
  for (const [lodName, lod] of Object.entries(LODS)) {
    const meshes = [];
    for (const [pc, P] of raw) for (const [m, ix] of P.groups) meshes.push([pc.name + (P.groups.length > 1 ? ':' + m : ''), m, pc.static ? { static: true } : {}, simplify(P, ix, lod, ix.length / 3 / total * (model.lodScale?.[lodName] ?? 1), model.errScale)]);
    const buf = pack(model, meshes);
    writeFileSync(join(OUT, `${model.name}.${lodName}.bin`), buf);
    report.push(`${lodName}: ${meshes.reduce((a, m) => a + m[3].idx.length / 3, 0)} tris, ${(buf.length / 1024).toFixed(0)} KB`);
  }
  console.log(`${model.name}  raw ${total} tris  ${report.join('  ')}  (${Date.now() - t0} ms)`);
}
