// 隨機產生「手筋」戰術題候選並分類（只在開發時用）
//   node table/tools/gen-tac.mjs <seed> <motif> <count>
//   motif: ladder 征子 / snap 倒撲 / nocon 接不歸 / net 枷 / double 雙叫吃
import { N, NB, group, buildTree, play } from './go-engine.mjs';
const COLS = 'ABCDEFGHJ', name = p => p < 0 ? 'pass' : COLS[p % N] + (N - ((p / N) | 0));
let seed = +(process.argv[2] || 1); const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
const motif = process.argv[3] || 'snap', count = +(process.argv[4] || 3);
const R = motif === 'ladder' ? 9 : 6, C = motif === 'ladder' ? 9 : 7;
const KMAX = { ladder: 6, snap: 2, nocon: 3, net: 3, double: 2 }[motif];
let found = 0, tries = 0; const sigs = new Set();
// 主變化（每層取第一個正解、對方最頑強的應手）
function mainLine(b0, tree) { const out = []; let b = b0, ko = -1, n = tree; while (n) { const m = +Object.keys(n.ok)[0]; if (Number.isNaN(m)) break; const v = n.ok[m]; const r1 = play(b, ko, m, 1); out.push({ m, by: 1, before: b, after: r1.b, cap: r1.cap }); b = r1.b; ko = r1.ko; if (v.r != null) { const r2 = play(b, ko, v.r, 2); out.push({ m: v.r, by: 2, before: b, after: r2.b, cap: r2.cap }); b = r2.b; ko = r2.ko; } n = v.n; } return out; }
function classify(b, t, res) {
  const L = mainLine(b, res.tree); if (!L.length || L.some(x => x.m < 0)) return null;
  const libsAfter = x => x.after[t] === 2 ? group(x.after, t).libs.length : 0;
  const blacks = L.filter(x => x.by === 1), whites = L.filter(x => x.by === 2);
  if (motif === 'ladder') { // 每一手黑都叫吃，白長出去，至少 3 次
    if (blacks.length < 4) return null;
    for (const x of blacks.slice(0, -1)) if (libsAfter(x) !== 1) return null;
    if (whites.some(w => w.cap)) return null;
    return true;
  }
  if (motif === 'snap') { // 黑先送吃（白提一子），再提回更多
    if (blacks.length !== 2) return null;
    const g0 = group(blacks[0].after, blacks[0].m); if (g0.stones.length !== 1 || g0.libs.length !== 1) return null;   // 第一手是送吃（撲）
    // 白如果提掉那顆子，黑馬上在同一點提回更多（倒撲）
    const lib = g0.libs[0], rw = play(blacks[0].after, -1, lib, 2);
    if (!rw || rw.cap !== 1) return null;
    const rb = play(rw.b, rw.ko, blacks[0].m, 1); if (!rb || rb.cap < 2) return null;
    return true;
  }
  if (motif === 'nocon') { // 黑叫吃，白接上還是只有一口氣，被提
    if (blacks.length < 2 || libsAfter(blacks[0]) !== 1 || !whites[0] || whites[0].cap) return null;
    const w = whites[0]; if (w.after[t] !== 2 || group(w.after, t).libs.length !== 1) return null;
    { const tg = new Set(group(w.before, t).stones); if (!NB[w.m].some(x => w.before[x] === 2 && !tg.has(x))) return null; }  // 白是「接」到另一塊白棋
    return true;
  }
  if (motif === 'net') { // 第一手不是叫吃（還有兩口氣以上），但白逃不掉
    if (libsAfter(blacks[0]) < 2) return null;
    if (NB[blacks[0].m].some(x => b[x] === 2 && group(b, x).stones.includes(t))) return null; // 不貼著目標
    return true;
  }
  if (motif === 'double') { // 第一手同時叫吃兩塊白棋
    const a = blacks[0].after; const seen = new Set(); let n = 0;
    for (const x of NB[blacks[0].m]) if (a[x] === 2) { const g = group(a, x); if (g.stones.some(s => seen.has(s))) continue; g.stones.forEach(s => seen.add(s)); if (g.libs.length === 1) n++; }
    return n >= 2 || null;
  }
}
while (found < count && tries < 300000) {
  tries++;
  const b = new Array(81).fill(0);
  const place = (col, n, r0 = 0, c0 = 0, rr = R, cc = C) => { let p = (r0 + ((rnd() * rr) | 0)) * N + (c0 + ((rnd() * cc) | 0)); for (let i = 0; i < n; i++) { if (b[p] === 0) b[p] = col; const r = (p / N) | 0, c = p % N, d = [[0, 1], [1, 0], [0, -1], [-1, 0]][(rnd() * 4) | 0]; const r2 = r + d[0], c2 = c + d[1]; if (r2 >= r0 && r2 < r0 + rr && c2 >= c0 && c2 < c0 + cc) p = r2 * N + c2; } };
  if (motif === 'ladder') { place(2, 1 + ((rnd() * 2) | 0), 2, 2, 5, 5); place(1, 2 + ((rnd() * 2) | 0), 2, 2, 5, 5); place(1, 1 + ((rnd() * 2) | 0), 2, 2, 5, 5); if (rnd() < .5) place(2, 1, 0, 0, 9, 9); if (rnd() < .5) place(1, 1, 0, 0, 9, 9); }
  else if (motif === 'snap' || motif === 'nocon') { const rr = 3 + ((rnd() * 2) | 0), cc = 4 + ((rnd() * 3) | 0); for (let r = 0; r < rr; r++) for (let c = 0; c < cc; c++) { const x = rnd(); b[r * N + c] = x < .38 ? 1 : x < .7 ? 2 : 0; } }
  else { place(2, 2 + ((rnd() * 3) | 0)); place(1, 2 + ((rnd() * 3) | 0)); place(1, 2 + ((rnd() * 3) | 0)); place(2, 1 + ((rnd() * 3) | 0)); if (rnd() < .6) place(1, 2 + ((rnd() * 2) | 0)); if (rnd() < .5) place(2, 1 + ((rnd() * 2) | 0)); }
  let okb = true; for (let p = 0; p < 81; p++) if (b[p] && group(b, p).libs.length < 2) { okb = false; break; } if (!okb) continue;
  const cands = []; for (let p = 0; p < 81; p++) if (b[p] === 2) { const g = group(b, p); if (Math.min(...g.stones) === p && g.libs.length >= 2 && g.libs.length <= 3) cands.push(p); }
  if (!cands.length) continue;
  const t = cands[(rnd() * cands.length) | 0];
  let res; try { res = buildTree({ b, goal: 'capture', target: t, region: null, k: KMAX }); } catch (e) { continue; }
  if (res.err || res.k < 2 || res.first.length !== 1 || Object.keys(res.tree.bad).length < 2) continue;
  if (!classify(b, t, res)) continue;
  // 刪掉無關的棋（拿掉後答案不變、而且還是同一種手筋就刪）
  const sig0 = r => r.k + ':' + r.first.join(',');
  const s0 = sig0(res);
  for (let p = 0; p < 81; p++) { if (!b[p]) continue; const g = group(b, p); if (g.stones.includes(t)) continue;
    const save = g.stones.map(x => [x, b[x]]); g.stones.forEach(x => b[x] = 0);
    let r2 = null; try { r2 = buildTree({ b, goal: 'capture', target: t, region: null, k: KMAX }); } catch (e) { }
    if (!r2 || r2.err || sig0(r2) !== s0 || r2.first.length !== 1 || Object.keys(r2.tree.bad).length < 2 || !classify(b, t, r2)) save.forEach(([x, v]) => b[x] = v); else res = r2; }
  let stones = 0; for (let p = 0; p < 81; p++) if (b[p]) stones++; if (stones < 5) continue;
  let r1 = 0, c1 = 0; for (let p = 0; p < 81; p++) if (b[p]) { r1 = Math.max(r1, (p / N) | 0); c1 = Math.max(c1, p % N); }
  const rows = []; for (let r = 0; r <= r1; r++) { let s = ''; for (let c = 0; c <= c1; c++) { const v = b[r * N + c]; s += v === 1 ? 'X' : v === 2 ? 'O' : '.'; } rows.push(s); }
  const sig = rows.join('/'); if (sigs.has(sig)) continue; sigs.add(sig);
  found++;
  const line = mainLine(b, res.tree).map(x => (x.by === 1 ? '●' : '○') + name(x.m)).join(' ');
  console.log(JSON.stringify({ s: rows, t: [(t / N) | 0, t % N], g: 'capture', k: res.k, tag: motif }), '//', line);
}
console.error('tries', tries);
