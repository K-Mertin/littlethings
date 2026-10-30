// 找「倒撲」題候選（只在開發時用）：先用便宜的檢查找有倒撲形的局面，再交給解題器確認
import { N, group, buildTree, play } from './go-engine.mjs';
const COLS = 'ABCDEFGHJ', name = p => p < 0 ? 'pass' : COLS[p % N] + (N - ((p / N) | 0));
let seed = +(process.argv[2] || 1); const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
const count = +(process.argv[3] || 4); let found = 0, tries = 0; const sigs = new Set();
while (found < count && tries < 3e6) {
  tries++;
  const b = new Array(81).fill(0), rr = 3 + ((rnd() * 2) | 0), cc = 4 + ((rnd() * 3) | 0);
  for (let r = 0; r < rr; r++) for (let c = 0; c < cc; c++) { const x = rnd(); b[r * N + c] = x < .4 ? 1 : x < .75 ? 2 : 0; }
  let ok = true; for (let p = 0; p < 81; p++) if (b[p] && group(b, p).libs.length < (b[p] === 2 ? 2 : 1)) { ok = false; break; } if (!ok) continue;
  let hit = -1, tgt = -1;
  for (let m = 0; m < 81 && hit < 0; m++) {
    if (b[m]) continue; const r1 = play(b, -1, m, 1); if (!r1 || r1.cap) continue;
    const g = group(r1.b, m); if (g.stones.length !== 1 || g.libs.length !== 1) continue;
    const rw = play(r1.b, r1.ko, g.libs[0], 2); if (!rw || rw.cap < 1) continue;
    const rb = play(rw.b, rw.ko, m, 1); if (!rb || rb.cap < 3) continue;
    hit = m; tgt = g.libs[0];
  }
  if (hit < 0) continue; globalThis.H = (globalThis.H || 0) + 1;
  // 目標：倒撲時被提走的白棋
  const r1 = play(b, -1, hit, 1), rw = play(r1.b, r1.ko, tgt, 2), rb = play(rw.b, rw.ko, hit, 1);
  let t = -1; for (let p = 0; p < 81; p++) if (rw.b[p] === 2 && rb.b[p] === 0) { t = p; break; }
  if (t < 0 || b[t] !== 2) continue;
  let res; try { res = buildTree({ b, goal: 'capture', target: t, region: null, k: 2 }); } catch (e) { continue; }
  if (res.err || res.k !== 2 || !res.first.includes(hit) || res.first.length > 1 || Object.keys(res.tree.bad).length < 1) continue;
  // 刪掉無關的棋：拿掉後還是同一手倒撲、解答一樣才刪
  const snapOK = bb => { const a = play(bb, -1, hit, 1); if (!a) return false; const g = group(a.b, hit); if (g.stones.length !== 1 || g.libs.length !== 1) return false; const w = play(a.b, a.ko, g.libs[0], 2); if (!w || w.cap < 1) return false; const c = play(w.b, w.ko, hit, 1); return !!c && c.cap >= 3 && c.b[t] === 0; };
  for (let p = 0; p < 81; p++) { if (!b[p]) continue; const g = group(b, p); if (g.stones.includes(t)) continue;
    const save = g.stones.map(x => [x, b[x]]); g.stones.forEach(x => b[x] = 0);
    let r2 = null; try { r2 = buildTree({ b, goal: 'capture', target: t, region: null, k: 2 }); } catch (e) { }
    if (!r2 || r2.err || r2.k !== 2 || r2.first.length !== 1 || +r2.first[0] !== hit || !snapOK(b)) save.forEach(([x, v]) => b[x] = v); else res = r2; }
  let R1 = 0, C1 = 0; for (let p = 0; p < 81; p++) if (b[p]) { R1 = Math.max(R1, (p / N) | 0); C1 = Math.max(C1, p % N); }
  const rows = []; for (let r = 0; r <= R1; r++) { let s = ''; for (let c = 0; c <= C1; c++) { const v = b[r * N + c]; s += v === 1 ? 'X' : v === 2 ? 'O' : '.'; } rows.push(s); }
  const sig = rows.join('/'); if (sigs.has(sig)) continue; sigs.add(sig); found++;
  console.log(JSON.stringify({ s: rows, t: [(t / N) | 0, t % N], g: 'capture', k: 2, tag: 'snap' }), '// 撲', name(hit), 'first', res.first.map(name).join('/'));
}
console.error('tries', tries, 'hits', globalThis.H);
