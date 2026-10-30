// 隨機產生「多步死活」候選（只在開發時用）：角上或邊上的一塊棋，眼位 5～8 格，要 2～3 手才殺／活
//   node table/tools/gen-ld.mjs <seed> <kill|live> <k> <count>
import { N, group, buildTree, makeCtx, play } from './go-engine.mjs';
const COLS = 'ABCDEFGHJ', name = p => p < 0 ? 'pass' : COLS[p % N] + (N - ((p / N) | 0));
let seed = +(process.argv[2] || 1); const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
const goalArg = process.argv[3] || 'kill', want = +(process.argv[4] || 2), count = +(process.argv[5] || 5);
const IN = goalArg === 'kill' ? 2 : 1, OUT = 3 - IN;   // 裡面那塊的顏色
let found = 0, tries = 0; const sigs = new Set();
while (found < count && tries < 400000) {
  tries++;
  // 1) 眼位：從角或邊出發長出 5～8 格
  const corner = rnd() < .55, size = 5 + ((rnd() * 4) | 0);
  const R = new Set(); let start = corner ? 0 : (2 + ((rnd() * 3) | 0)); R.add(start);
  while (R.size < size) { const a = [...R], p = a[(rnd() * a.length) | 0], n = [p - N, p + N, p - 1, p + 1].filter(x => x >= 0 && x < 81 && Math.abs((x % N) - (p % N)) <= 1); const q = n[(rnd() * n.length) | 0]; if (q != null && ((q / N) | 0) <= 2 && q % N <= 6) R.add(q); }
  const b = new Array(81).fill(0);
  const near = (set) => { const s = new Set(); for (const p of set) for (const x of [p - N, p + N, p - 1, p + 1]) if (x >= 0 && x < 81 && Math.abs((x % N) - (p % N)) <= 1 && !set.has(x)) s.add(x); return s; };
  const W = near(R); for (const p of W) b[p] = IN;
  const all = new Set([...R, ...W]); const B = near(all); for (const p of B) b[p] = OUT;
  // 2) 變化：眼位裡放 0～2 顆子、外圍挖 0～2 個缺口（讓黑可以扳、擠）
  const Ra = [...R];
  for (let i = (rnd() * 3) | 0; i > 0; i--) { const p = Ra[(rnd() * Ra.length) | 0]; b[p] = rnd() < .5 ? IN : OUT; }
  const Wa = [...W];
  for (let i = (rnd() * 3) | 0; i > 0; i--) { const p = Wa[(rnd() * Wa.length) | 0]; b[p] = rnd() < .5 ? 0 : OUT; }
  // 3) 檢查：每塊棋都有氣、裡面的棋連成一塊、外圍那塊不能太弱
  let ok = true; for (let p = 0; p < 81; p++) if (b[p] && !group(b, p).libs.length) { ok = false; break; } if (!ok) continue;
  const inStones = []; for (let p = 0; p < 81; p++) if (b[p] === IN) inStones.push(p);
  if (!inStones.length) continue;
  const tg = group(b, inStones[0]); if (tg.stones.length !== inStones.length) continue;
  let outOk = true; for (let p = 0; p < 81; p++) if (b[p] === OUT && group(b, p).libs.length < 3) { outOk = false; break; } if (!outOk) continue;
  const region = new Set(); for (const p of all) if (b[p] === 0 || b[p] === IN || b[p] === OUT) { if (b[p] === 0) region.add(p); }
  for (const p of all) if (b[p] === 0) region.add(p);
  if (region.size < 4) continue;
  const target = inStones[0];
  const pz = { b, goal: goalArg, target, region, k: want, vis: goalArg === 'live' };
  const C = makeCtx(pz); if (C.goal(b, 1)) continue;
  let res; try { res = buildTree(pz); } catch (e) { continue; }
  if (res.err || res.k !== want || res.first.length > 1 || Object.keys(res.tree.bad).length < 2) continue;
  // 主變化不能有虛手
  let hasPass = false, nn = res.tree, line = []; while (nn) { const m = Object.keys(nn.ok)[0]; if (m == null) break; const v = nn.ok[m]; if (v.r === -1) hasPass = true; line.push(name(+m) + (v.r != null ? '>' + name(v.r) : '')); nn = v.n; } if (hasPass) continue;
  const rows = []; for (let r = 0; r < 5; r++) { let s = ''; for (let c = 0; c < 9; c++) { const v = b[r * N + c]; s += v === 1 ? 'X' : v === 2 ? 'O' : '.'; } rows.push(s); }
  const sig = rows.join('/'); if (sigs.has(sig)) continue; sigs.add(sig);
  // 範圍寫成 [r0,c0,r1,c1] 不好表示任意形狀，改輸出 reg 點列表
  found++;
  console.log(JSON.stringify({ s: rows, t: [(target / N) | 0, target % N], g: goalArg, k: want, ...(goalArg === 'live' ? { vis: 1 } : {}), rp: [...region].map(p => [(p / N) | 0, p % N]) }), '//', line.join(' '));
}
console.error('tries', tries);
