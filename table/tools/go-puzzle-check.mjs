// 驗證圍棋死活題題庫，並產生 table/go-puzzles.js（含解答樹）。
//   node table/tools/go-puzzle-check.mjs          驗證＋寫檔
//   node table/tools/go-puzzle-check.mjs --dry    只驗證
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { N, group, buildTree, makeCtx, play } from './go-engine.mjs';
import { SETS } from './go-puzzle-src.mjs';

const COLS = 'ABCDEFGHJ';
const name = p => COLS[p % N] + (N - ((p / N) | 0));
const dry = process.argv.includes('--dry');
const only = process.argv.find(a => a.startsWith('--only='));
let bad = 0, total = 0;
const out = [];
for (const [si, set] of SETS.entries()) {
  const list = [];
  for (const [pi, z] of set.list.entries()) {
    total++;
    const id = set.name + ' ' + (pi + 1);
    if (only && only.slice(7) !== si + '-' + pi) continue;
    const b = new Array(81).fill(0);
        const M = c => z.m ? N - 1 - c : c;   // m: 左右翻到右上角
    z.s.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'X' || ch === 'O') b[r * N + M(c)] = ch === 'X' ? 1 : 2; }));
    const errs = [];
    // 初始局面合法：每塊棋都要有氣
    for (let p = 0; p < 81; p++) if (b[p] && !group(b, p).libs.length) errs.push('初始局面有沒氣的棋 ' + name(p));
    const target = z.t[0] * N + M(z.t[1]);
    const want = (z.g === 'kill' || z.g === 'capture') ? 2 : 1;
    if (b[target] !== want) errs.push('目標棋子顏色不對');
    let region = null;
    if (z.reg) { region = new Set(); const [r0, c0, r1, c1] = z.reg; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) region.add(r * N + M(c)); }
    const pz = { b, goal: z.g, target, region, k: z.k || 3 };
    let res = null;
    if (!errs.length) { try { res = buildTree(pz); if (res.err) errs.push(res.err); } catch (e) { errs.push(String(e.message || e)); } }
    if (res && !res.err) {
      const C = makeCtx(pz);
      if (C.goal(b, 1)) errs.push('一開始就已經達成目標');
      const C2 = C;
      if (res.first.length > 2) errs.push('正解太多：' + res.first.map(name).join(' '));
      if (z.a && !res.first.map(name).includes(z.a)) errs.push('預期解 ' + z.a + ' 不是正解；引擎說 ' + res.first.map(name).join(' '));
      if (!Object.keys(res.tree.bad).length && z.g !== 'capture' && z.g !== 'save') errs.push('沒有任何錯手可以示範');
      // 檢查樹裡每一手都合法
      (function walk(node, bb, ko) {
        for (const [m, v] of Object.entries(node.ok)) {
          const r1 = play(bb, ko, +m, 1); if (!r1) { errs.push('樹中有不合法的手 ' + name(+m)); continue; }
          if (v.r != null) { const r2 = play(r1.b, r1.ko, v.r, 2); if (!r2) { errs.push('應手不合法'); continue; } if (v.n) walk(v.n, r2.b, r2.ko); else if (!C2.goal(r2.b, 1)) errs.push('樹的終點沒達成目標'); }
          else if (!C2.goal(r1.b, 2)) errs.push('樹的終點沒達成目標');
        }
      })(res.tree, b, -1);
    }
    if (errs.length) { bad++; console.log('✗', id, errs.join('；')); }
    else console.log('✓', id, z.g, res.k + ' 手', '正解 ' + res.first.map(name).join('/'), '錯手示範 ' + Object.keys(res.tree.bad).length);
    if (res && !res.err) {
      // 顯示範圍：有棋子的地方再往外一格，至少 6×6，貼著棋盤角
      let r1 = 0, cmin = 8, cmax = 0;
      for (let p = 0; p < 81; p++) if (b[p] || (region && region.has(p))) { r1 = Math.max(r1, (p / N) | 0); cmin = Math.min(cmin, p % N); cmax = Math.max(cmax, p % N); }
      r1 = Math.min(8, Math.max(5, r1 + 1));
      let c0, c1; if (z.m) { c1 = 8; c0 = Math.max(0, Math.min(3, cmin - 1)); } else { c0 = 0; c1 = Math.min(8, Math.max(5, cmax + 1)); }
      const DEF = { kill: '找出白棋眼形的要點，讓它做不出兩隻眼。', live: '找出能分成兩隻眼的要點。', save: '黑棋快被吃了：往外長、或吃掉旁邊的白子。' };
      const hint = z.h || DEF[z.g] || (res.k === 1 ? '數一數白棋還剩幾口氣。' : '想一想從哪一邊叫吃，白棋才逃不掉。');
      list.push({ b: b.join(''), g: z.g, t: target, k: res.k, h: hint, v: [r1, c0, c1], tr: res.tree });
    }
  }
  out.push({ name: set.name, desc: set.desc, list });
}
console.log(`\n${total - bad} / ${total} 題通過`);
if (bad) process.exitCode = 1;
if (!dry && !bad && !only) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
  writeFileSync(join(dir, 'go-puzzles.js'), '// 由 tools/go-puzzle-check.mjs 產生，不要手改。\n// b: 81 字元（0 空 1 黑 2 白）；g: 目標；t: 目標棋子；k: 手數；v: 顯示範圍 [最下列, 最左行, 最右行]；tr: 解答樹 {ok:{手:{r:應手,n:下一層|end}}, bad:{錯手:反擊}}\nconst GOP = ' + JSON.stringify(out) + ';\n');
  console.log('已寫入 go-puzzles.js');
}
