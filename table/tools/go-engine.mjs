// 圍棋死活題的規則引擎＋解題器（只給 tools/ 的驗證腳本用，不上線）
// 棋盤 9×9，index = r*9+c；0 空、1 黑、2 白。
export const N = 9, NN = 81;
export const NB = [];
for (let p = 0; p < NN; p++) {
  const r = (p / N) | 0, c = p % N, a = [];
  if (r > 0) a.push(p - N); if (r < N - 1) a.push(p + N); if (c > 0) a.push(p - 1); if (c < N - 1) a.push(p + 1);
  NB.push(a);
}
export const DIAG = [];
for (let p = 0; p < NN; p++) {
  const r = (p / N) | 0, c = p % N, a = [];
  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) a.push(rr * N + cc); }
  DIAG.push(a);
}
export function group(b, p) {
  const col = b[p], st = [p], seen = new Set([p]), libs = new Set();
  while (st.length) { const q = st.pop(); for (const n of NB[q]) { if (b[n] === 0) libs.add(n); else if (b[n] === col && !seen.has(n)) { seen.add(n); st.push(n); } } }
  return { stones: [...seen], libs: [...libs] };
}
// 落子：回傳 {b, ko, cap} 或 null（不合法）
export function play(b, ko, p, col) {
  if (p < 0) return { b: b.slice(), ko: -1, cap: 0 };          // 虛手
  if (b[p] !== 0 || p === ko) return null;
  const nb = b.slice(); nb[p] = col; const opp = 3 - col; let cap = 0, capAt = -1;
  for (const n of NB[p]) if (nb[n] === opp) { const g = group(nb, n); if (!g.libs.length) { for (const s of g.stones) nb[s] = 0; cap += g.stones.length; capAt = g.stones.length === 1 ? g.stones[0] : -1; } }
  const me = group(nb, p);
  if (!me.libs.length) return null;                              // 自殺
  const nko = cap === 1 && capAt >= 0 && me.stones.length === 1 && me.libs.length === 1 ? capAt : -1;
  return { b: nb, ko: nko, cap };
}
// 圍出的眼：只含空點、四周全是這塊棋（或邊）的區域。單點眼要是真眼。
export function eyes(b, anchor) {
  if (!b[anchor]) return 0;
  const col = b[anchor], g = group(b, anchor), seen = new Set(); let n = 0;
  // 眼的邊界可以是任何同色棋子（例如點在眼位裡、還沒連起來的自己的子）
  for (const s of g.stones) for (const e of NB[s]) {
    if (b[e] !== 0 || seen.has(e)) continue;
    const reg = [e], st = [e], loc = new Set([e]); let ok = true;
    while (st.length) { const q = st.pop(); for (const x of NB[q]) { if (b[x] === 0) { if (!loc.has(x)) { loc.add(x); reg.push(x); st.push(x); } } else if (b[x] !== col) ok = false; } }
    for (const x of loc) seen.add(x);
    if (!ok || reg.length > 7) continue;
    if (reg.length === 1) {
      const d = DIAG[e], bad = d.filter(x => b[x] === 3 - col).length, edge = d.length < 4;
      if (edge ? bad >= 1 : bad >= 2) continue;   // 假眼
    }
    n++;
  }
  return n;
}
// 題目：{ b, goal:'kill'|'live'|'capture'|'save', target, region:Set|null, k }
// 玩家永遠是黑（1）。kill/capture：吃掉 target（白）；live/save：保住 target（黑）。
export function makeCtx(pz) {
  const me = 1, opp = 2;
  const isAtk = pz.goal === 'kill' || pz.goal === 'capture';
  const tgtCol = isAtk ? opp : me;
  function alive(b) { return b[pz.target] === tgtCol; }
  // 「看得出來」的結果：殺棋＝還沒提掉但已經救不回來；做活＝對方先下也殺不死
  const capMemo = new Map();
  function canCap(b, ko, toMove, k, atk) {   // atk 方能不能在 k 手內提掉目標（目標做出兩眼就失敗）
    if (!alive(b)) return true;
    if (eyes(b, pz.target) >= 2) return false;
    if (toMove === atk && k <= 0) return false;
    const key = atk + b.join('') + toMove + ':' + ko + ':' + k;
    if (capMemo.has(key)) return capMemo.get(key);
    let res;
    if (toMove === atk) { res = false; for (const p of gen(b, atk)) { const r = play(b, ko, p, atk); if (r && canCap(r.b, r.ko, 3 - atk, k - 1, atk)) { res = true; break; } } }
    else { res = true; const ms = gen(b, 3 - atk); ms.push(-1); for (const p of ms) { const r = play(b, ko, p, 3 - atk); if (r && !canCap(r.b, r.ko, atk, k, atk)) { res = false; break; } } }
    capMemo.set(key, res); return res;
  }
  // 範圍內最大的一塊連在一起的空地（眼位）：還有大眼位就還不算「看得出來」死了
  function maxSpace(b) {
    const seen = new Set(); let best = 0;
    for (const p of pz.region) {
      if (b[p] !== 0 || seen.has(p)) continue;
      let n = 0; const st = [p]; seen.add(p);
      while (st.length) { const q = st.pop(); n++; for (const x of NB[q]) if (pz.region.has(x) && b[x] === 0 && !seen.has(x)) { seen.add(x); st.push(x); } }
      best = Math.max(best, n);
    }
    return best;
  }
  // 殺棋「看得出來」：已經提掉；或輪到白下、白棋沒有眼、剩下的眼位都很小（≤3 格），
  // 而且搜尋確認白棋先下也逃不過被提（雙方都正確應對）。所以大眼位要先擠、扳、縮小，才算殺完——可以出多步題。
  function goal(b, toMove) {
    if (pz.goal === 'kill') return !alive(b) || (toMove === opp && eyes(b, pz.target) === 0 && maxSpace(b) <= 3 && canCap(b, -1, opp, 14, me));
    // vis：多步做活題，要真的做出兩隻眼才算（不然第一手就「保證活」、題目只剩一步）
    if (pz.goal === 'live') return alive(b) && (eyes(b, pz.target) >= 2 || (!pz.vis && toMove === opp && !canCap(b, -1, opp, 12, opp)));
    if (pz.goal === 'capture') return !alive(b);
    return alive(b) && group(b, pz.target).libs.length >= 3;   // save：長到三口氣就算逃出
  }
  function fail(b) {
    if (pz.goal === 'kill') return alive(b) && eyes(b, pz.target) >= 2;
    if (pz.goal === 'capture') return alive(b) && group(b, pz.target).libs.length >= 4;
    return !alive(b);
  }
  function gen(b, col) {
    if (pz.region) return [...pz.region].filter(p => b[p] === 0);
    // 戰術題：以目標的氣為中心
    if (!alive(b)) return [];
    const g = group(b, pz.target), s = new Set(g.libs);
    const atk = col !== tgtCol;
    if (atk) { if (g.libs.length <= 3) for (const l of g.libs) for (const n of NB[l]) if (b[n] === 0) s.add(n); }
    else {
      // 防守：延氣、提掉相鄰的對方棋、或打吃相鄰的對方棋
      const seen = new Set();
      for (const st of g.stones) for (const n of NB[st]) if (b[n] === 3 - tgtCol && !seen.has(n)) {
        const og = group(b, n); og.stones.forEach(x => seen.add(x));
        if (og.libs.length <= 2) og.libs.forEach(l => s.add(l));
      }
      for (const l of g.libs) for (const n of NB[l]) if (b[n] === 0 && g.libs.length <= 2) s.add(n);
    }
    return [...s];
  }
  const memo = new Map();
  // 玩家（黑）能不能在 k 手內達成目標。toMove: 1 玩家、2 對方
  function win(b, ko, toMove, k) {
    if (goal(b, toMove)) return true;
    if (fail(b)) return false;
    if (toMove === me && k <= 0) return false;
    const key = b.join('') + toMove + ':' + ko + ':' + k;
    if (memo.has(key)) return memo.get(key);
    let res;
    if (toMove === me) {
      res = false;
      for (const p of gen(b, me)) { const r = play(b, ko, p, me); if (r && win(r.b, r.ko, opp, k - 1)) { res = true; break; } }
    } else {
      res = true;
      const moves = gen(b, opp); moves.push(-1);
      for (const p of moves) { const r = play(b, ko, p, opp); if (r && !win(r.b, r.ko, me, k)) { res = false; break; } }
    }
    memo.set(key, res); return res;
  }
  // 最少幾手可以達成（玩家手數），做不到回傳 Infinity
  function minK(b, ko, toMove, kmax) { for (let k = 0; k <= kmax; k++) if (win(b, ko, toMove, k)) return k; return Infinity; }
  return { win, minK, gen, goal, fail, alive, me, opp };
}
// 把題目擴展成「解答樹」：玩家每個節點列出所有最短的正解，以及錯手的反擊
export function buildTree(pz) {
  const C = makeCtx(pz);
  const k0 = C.minK(pz.b, -1, 1, pz.k);
  if (!isFinite(k0)) return { err: '在 ' + pz.k + ' 手內解不出來' };
  let nodes = 0;
  function pnode(b, ko, k) {
    nodes++; if (nodes > 4000) throw new Error('解答樹太大');
    const node = { ok: {}, bad: {} };
    const cand = new Set(C.gen(b, 1));
    if (pz.region == null) for (let p = 0; p < 81; p++) if (b[p] === 0) { const r = play(b, ko, p, 1); if (r) cand.add(p); }
    for (const p of cand) {
      const r = play(b, ko, p, 1); if (!r) continue;
      if (C.win(r.b, r.ko, 2, k - 1)) {
        if (C.goal(r.b, 2)) { node.ok[p] = { end: 1 }; continue; }
        // 對方選最頑強的應手（讓玩家需要最多手），同手數時避免虛手
        let best = null, bestK = -1;
        const moves = C.gen(r.b, 2); moves.push(-1);
        for (const q of moves) {
          const rr = play(r.b, r.ko, q, 2); if (!rr) continue;
          const kk = C.goal(rr.b, 1) ? 0 : C.minK(rr.b, rr.ko, 1, k - 1);
          if (kk > bestK || (kk === bestK && best === -1)) { best = q; bestK = kk; }
        }
        const rr = play(r.b, r.ko, best, 2);
        node.ok[p] = C.goal(rr.b, 1) ? { r: best, end: 1 } : { r: best, n: pnode(rr.b, rr.ko, k - 1) };
      } else if (C.gen(b, 1).includes(p)) {
        // 錯手：找一個對方的反擊（優先立刻成功的）
        let ref = null;
        const moves = C.gen(r.b, 2);
        for (const q of moves) { const rr = play(r.b, r.ko, q, 2); if (rr && C.fail(rr.b)) { ref = q; break; } }
        if (ref == null) for (const q of moves) { const rr = play(r.b, r.ko, q, 2); if (rr && !C.win(rr.b, rr.ko, 1, k - 1)) { ref = q; break; } }
        node.bad[p] = ref == null ? -1 : ref;
      }
    }
    return node;
  }
  const tree = pnode(pz.b, -1, k0);
  return { k: k0, tree, first: Object.keys(tree.ok).map(Number) };
}
