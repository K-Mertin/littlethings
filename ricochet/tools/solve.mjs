// 關卡解題器：在每個局面每 STEP 度試射一發，用廣度優先搜尋找出最少幾發能過關。
// 會照遊戲的回合規則算（會動的牆、走路怪、射手反擊、玻璃、傳送門、人質、生命），所以解出來的角度在遊戲裡一定打得到。
// 用法：node ricochet/tools/solve.mjs [關卡編號…]   （不帶參數 = 全部檢查，有問題 exit 1）
//       MIN_WIN=0.8 node ricochet/tools/solve.mjs   改「角度窗至少多寬才算玩家調得出來」
//       JSON=1 node ricochet/tools/solve.mjs        輸出每關解法（測試腳本用）
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const Core = require(path.join(dir, 'core.js'));
const LEVELS = require(path.join(dir, 'levels.js'));

const STEP = +(process.env.STEP || 0.1);
const MIN_WIN = +(process.env.MIN_WIN || 0.6);

function analyse(def) {
  const w = Core.build(def);
  const probs = [];
  if (Core.insideSolid(w, w.player.x, w.player.y)) probs.push('角色在牆裡');
  w.enemies.forEach(e => { for (let t = 0; t < w.period; t++) { const [x, y] = Core.enemyPos(w, e, t); if (Core.insideSolid(w, x, y)) { probs.push(`敵人 ${e.i} 在牆裡（第 ${t} 回合）`); break; } } });
  for (const e of w.barrels) if (Core.insideSolid(w, e.x, e.y)) probs.push(`炸藥桶 ${e.i} 在牆裡`);
  for (const e of w.hostages) if (Core.insideSolid(w, e.x, e.y)) probs.push(`人質 ${e.i} 在牆裡`);
  const r = Core.solve(w, Core.newState(w), def.shots, { step: STEP, minWin: MIN_WIN });
  if (r.capped) probs.push('局面太多，搜尋提早停止');
  const min = r.min;
  if (min === Infinity) probs.push('打不完');
  if (def.par < min) probs.push(`par ${def.par} 比最少發數 ${min} 還少`);
  if (def.par > def.shots) probs.push(`par ${def.par} 比子彈數 ${def.shots} 多`);
  return { min, plan: r.plan, oneShot: +r.oneShot.toFixed(1), probs, states: r.states };
}

const pick = process.argv.slice(2).map(Number);
let bad = 0;
const t0 = Date.now();
const out = [];
LEVELS.forEach((def, i) => {
  if (pick.length && !pick.includes(i + 1)) return;
  const t = Date.now();
  const r = analyse(def);
  if (r.probs.length) bad++;
  out.push({ lv: i + 1, plan: r.plan.map(p => p.at), ok: !r.probs.length });
  if (process.env.JSON) return;
  console.log(`${r.probs.length ? '✗' : '✓'} ${String(i + 1).padStart(2)} ${def.name.padEnd(8, '　')} 敵 ${def.enemies.length} 發 ${def.shots} par ${def.par} | 最少 ${r.min} 發，一發過關角度寬 ${r.oneShot}° | 局面 ${r.states} | ${Date.now() - t}ms`);
  console.log(`      解法：${r.plan.map(p => `${p.at}°(寬${p.width}°)`).join('  ')}`);
  if (r.probs.length) console.log('      問題：' + r.probs.join('；'));
});
if (process.env.JSON) console.log(JSON.stringify(out));
else console.log(`共 ${((Date.now() - t0) / 1000).toFixed(1)} 秒`);
process.exit(bad ? 1 : 0);
