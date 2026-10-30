// 檢查西洋棋教室每一課每一題：局面合法、正解存在且合法、錯誤答案會被判錯
// 用法：node table/tools/chess-lessons-check.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'chess-logic.js'), 'utf8') + '\n;this.CHLOGIC=CHLOGIC;', ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'chess-lessons.js'), 'utf8'), ctx);
const { CHL, chlSq, chlName, chlParse, chlGoalOk, chlUci } = ctx.module.exports;
const L = {}; ctx.CHLOGIC(L); const X = L.X;
let errs = 0, nq = 0, nl = 0;
const bad = (id, i, msg) => { errs++; console.log('✗', id, '#' + i, msg); };
for (const ch of CHL) for (const l of ch.lessons) {
  nl++;
  l.steps.forEach((st, i) => {
    const o = chlParse(st, X.fen);
    // 合法局面：雙方各一個國王、不輪到的一方沒有被將軍
    const kw = o.board.filter(p => p === 6).length, kb = o.board.filter(p => p === 14).length;
    if (kw !== 1 || kb !== 1) return bad(l.id, i, '國王數量不對');
    X.init(o);
    if (X.inCheck(X.side ^ 1)) return bad(l.id, i, '不輪到的一方正在被將軍');
    const sqs = [].concat(st.marks || [], st.ans && st.t === 'tap' ? st.ans : [], (st.arrows || []).flat(), st.sq ? [st.sq] : []);
    for (const a of sqs) if (!/^[a-h][1-8]$/.test(a)) bad(l.id, i, '格子名稱錯誤 ' + a);
    if (st.t === 'text') return;
    nq++;
    if (st.t === 'tap') return;
    const legal = X.legal();
    if (st.t === 'targets') {
      const sq = chlSq(st.sq), p = X.board[sq];
      if (!p || (p >> 3) !== X.side) return bad(l.id, i, '目標格沒有輪到那方的棋子');
      const n = new Set(legal.filter(m => (m & 127) === sq).map(m => (m >> 7) & 127)).size;
      if (!n) bad(l.id, i, '這顆棋子沒有走法');
      console.log('  ', l.id, '#' + i, 'targets', st.sq, '=', n);
      return;
    }
    if (st.t === 'move') {
      const good = legal.filter(m => chlGoalOk(X, st, m)), wrong = legal.filter(m => !chlGoalOk(X, st, m));
      if (!good.length) return bad(l.id, i, '沒有符合目標的走法');
      if (!wrong.length && !st.any) bad(l.id, i, '所有走法都算對（錯誤答案不會被判錯）');
      if (st.goal === 'exact') for (const u of st.ans) if (!legal.some(m => chlUci(m).startsWith(u))) bad(l.id, i, '正解不合法 ' + u);
      console.log('  ', l.id, '#' + i, 'move', st.goal, '正解', [...new Set(good.map(m => chlUci(m).slice(0, 4)))].join(','), '／錯誤', wrong.length);
      return;
    }
    if (st.t === 'mate') {
      const r = X.mateFirst(st.n, 0, false);
      if (!r.moves.length) return bad(l.id, i, st.n + ' 步內殺不死');
      if (r.moves.length === legal.length) bad(l.id, i, '所有走法都能將死');
      if (st.n > 1) { const r1 = X.mateFirst(st.n - 1, 0, false); if (r1.moves.length) bad(l.id, i, '其實 ' + (st.n - 1) + ' 步就能殺'); }
      // 一步殺：確認真的將死
      if (st.n === 1) for (const m of r.moves) { X.make(m); const ok = !X.legal().length && X.inCheck(X.side); X.unmake(); if (!ok) bad(l.id, i, '正解不是將死 ' + chlUci(m)); }
      console.log('  ', l.id, '#' + i, 'mate' + st.n, '正解', r.moves.map(chlUci).join(','));
      return;
    }
    if (st.t === 'line') {
      for (const u of st.moves) {
        const m = X.legal().find(m => chlUci(m).startsWith(u));
        if (!m) return bad(l.id, i, '棋譜不合法 ' + u);
        X.make(m);
      }
      console.log('  ', l.id, '#' + i, 'line', st.moves.length, '步 ok');
      return;
    }
    bad(l.id, i, '未知步驟 ' + st.t);
  });
}
console.log(errs ? `✗ ${errs} 個錯誤` : `✓ 全部通過：${nl} 課、${nq} 題`);
process.exit(errs ? 1 : 0);
