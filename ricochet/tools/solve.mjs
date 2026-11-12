// 關卡解題器：每 0.05° 試射一發，算出最少幾發能清光、建議的 par（三星標準）是否合理。
// 用法：node ricochet/tools/solve.mjs [關卡編號…]   （不帶參數 = 全部檢查，有問題 exit 1）
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const Core = require(path.join(dir, 'core.js'));
const LEVELS = require(path.join(dir, 'levels.js'));

const STEP = 0.05;          // 試射的角度間隔
const MIN_WIN = 0.3;        // 一個解法的角度窗至少要這麼寬（玩家才調得出來）

function analyse(def) {
  const w = Core.build(def);
  const probs = [];
  if (Core.insideSolid(w, w.player.x, w.player.y)) probs.push('角色在牆裡');
  for (const e of w.enemies) if (Core.insideSolid(w, e.x, e.y)) probs.push(`敵人 ${e.i} 在牆裡`);
  for (const e of w.barrels) if (Core.insideSolid(w, e.x, e.y)) probs.push(`炸藥桶 ${e.i} 在牆裡`);
  const N = Math.round(360 / STEP);
  const masks = new Array(N);
  for (let k = 0; k < N; k++) {
    const r = Core.simulate(w, k * STEP);
    let m = 0; for (const i of r.state.dead) m |= 1 << i;
    masks[k] = m;
  }
  // 連續同一個結果的角度窗
  const wins = new Map(); // mask -> [{from, width}]
  let k0 = 0;
  for (let k = 1; k <= N; k++) {
    if (k === N || masks[k] !== masks[k0]) {
      const width = (k - k0) * STEP;
      if (masks[k0]) { if (!wins.has(masks[k0])) wins.set(masks[k0], []); wins.get(masks[k0]).push({ from: k0 * STEP, width }); }
      k0 = k;
    }
  }
  const all = (1 << w.enemies.length) - 1;
  const good = [...wins].filter(([, ws]) => ws.some(x => x.width >= MIN_WIN)).map(([m]) => m);
  // BFS：最少幾發
  const dist = new Map([[0, 0]]); const q = [0]; const from = new Map();
  while (q.length) {
    const s = q.shift(); if (s === all) break;
    for (const m of good) { const t = s | m; if (!dist.has(t)) { dist.set(t, dist.get(s) + 1); from.set(t, [s, m]); q.push(t); } }
  }
  const min = dist.has(all) ? dist.get(all) : Infinity;
  const plan = [];
  if (min < Infinity) { let s = all; while (s) { const [p, m] = from.get(s); const best = wins.get(m).sort((a, b) => b.width - a.width)[0]; plan.unshift({ mask: m, at: +(best.from + best.width / 2).toFixed(2), width: +best.width.toFixed(2) }); s = p; } }
  // 每個敵人能被打到的角度總寬
  const per = w.enemies.map(e => { let s = 0; for (const [m, ws] of wins) if (m & (1 << e.i)) for (const x of ws) s += x.width; return +s.toFixed(1); });
  const oneShot = (wins.get(all) || []).reduce((s, x) => s + x.width, 0);
  if (min === Infinity) probs.push('打不完');
  else if (min > def.shots) probs.push(`最少要 ${min} 發，但只給 ${def.shots} 發`);
  if (def.par < min) probs.push(`par ${def.par} 比最少發數 ${min} 還少`);
  if (def.par > def.shots) probs.push(`par ${def.par} 比子彈數 ${def.shots} 多`);
  return { min, plan, per, oneShot: +oneShot.toFixed(2), probs };
}

const pick = process.argv.slice(2).map(Number);
let bad = 0;
LEVELS.forEach((def, i) => {
  if (pick.length && !pick.includes(i + 1)) return;
  const r = analyse(def);
  const tag = r.probs.length ? '✗' : '✓';
  if (r.probs.length) bad++;
  console.log(`${tag} ${String(i + 1).padStart(2)} ${def.name.padEnd(8, '　')} 敵 ${def.enemies.length} 發 ${def.shots} par ${def.par} | 最少 ${r.min} 發，一發清光角度寬 ${r.oneShot}° | 各敵可打角度 ${r.per.join(' / ')}`);
  console.log(`      解法：${r.plan.map(p => `${p.at}°(寬${p.width}°,打${p.mask.toString(2)})`).join('  ')}`);
  if (r.probs.length) console.log('      問題：' + r.probs.join('；'));
});
process.exit(bad ? 1 : 0);
