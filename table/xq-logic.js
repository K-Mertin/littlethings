// 象棋規則＋電腦（象棋、象棋殘局、象棋教室共用）
// ======================================================================
// LOGIC：規則 + 電腦。整個函式自給自足，同一份程式碼在主執行緒（判斷合法步）
// 和 Web Worker（電腦思考）都會跑。
// 棋盤 90 格：index = row*9 + col，row 0 = 黑方底線（上），row 9 = 紅方底線（下）。
// 棋子：紅 1..7（帥仕相馬車炮兵），黑 = 紅 + 8。
// 著法：from<<7 | to
// ======================================================================
function XQLOGIC(self) {
  const K = 1, A = 2, B = 3, N = 4, R = 5, C = 6, P = 7;
  const MAT = [0, 0, 120, 120, 270, 600, 285, 30];
  const T = s => s.trim().split(/\s+/).map(Number);
  // 位置分（紅方視角，row 0 在上）
  const PST = [];
  PST[P] = T(`0 3 6 9 12 9 6 3 0  18 36 56 80 120 80 56 36 18  14 26 42 60 80 60 42 26 14  10 20 30 34 40 34 30 20 10
    6 12 18 18 20 18 18 12 6  2 0 8 0 8 0 8 0 2  0 0 -2 0 4 0 -2 0 0  0 0 0 0 0 0 0 0 0  0 0 0 0 0 0 0 0 0  0 0 0 0 0 0 0 0 0`);
  PST[R] = T(`14 14 12 18 16 18 12 14 14  16 20 18 24 26 24 18 20 16  12 12 12 18 18 18 12 12 12  12 18 16 22 22 22 16 18 12
    12 14 12 18 18 18 12 14 12  12 16 14 20 20 20 14 16 12  6 10 8 14 14 14 8 10 6  4 8 6 14 12 14 6 8 4
    8 4 8 16 8 16 8 4 8  -2 10 6 14 12 14 6 10 -2`);
  PST[N] = T(`4 8 16 12 4 12 16 8 4  4 10 28 16 8 16 28 10 4  12 14 16 20 18 20 16 14 12  8 24 18 24 20 24 18 24 8
    6 16 14 18 16 18 14 16 6  4 12 16 14 12 14 16 12 4  2 6 8 6 10 6 8 6 2  4 2 8 8 4 8 8 2 4
    0 2 4 4 -2 4 4 2 0  0 -4 0 0 0 0 0 -4 0`);
  PST[C] = T(`6 4 0 -10 -12 -10 0 4 6  2 2 0 -4 -14 -4 0 2 2  2 2 0 -10 -8 -10 0 2 2  0 0 -2 4 10 4 -2 0 0
    0 0 0 2 8 2 0 0 0  -2 0 4 2 6 2 4 0 -2  0 0 0 2 4 2 0 0 0  4 0 8 6 10 6 8 0 4
    0 2 4 6 6 6 4 2 0  0 0 2 6 6 6 2 0 0`);
  PST[A] = new Array(90).fill(0); PST[A][8 * 9 + 4] = 3; PST[A][9 * 9 + 3] = PST[A][9 * 9 + 5] = 0;
  PST[B] = new Array(90).fill(0); PST[B][7 * 9 + 4] = 3; PST[B][5 * 9 + 2] = PST[B][5 * 9 + 6] = -2;
  PST[K] = new Array(90).fill(0); PST[K][8 * 9 + 4] = -8; PST[K][7 * 9 + 4] = -15; PST[K][9 * 9 + 3] = PST[K][9 * 9 + 5] = -5;
  PST[K][8 * 9 + 3] = PST[K][8 * 9 + 5] = -10; PST[K][7 * 9 + 3] = PST[K][7 * 9 + 5] = -18;

  const board = new Int8Array(90);
  let side = 0, score = 0, h1 = 0, h2 = 0;
  const kpos = [0, 0];
  // Zobrist（固定種子，主執行緒和 worker 算出來一樣）
  let seed = 0x2545F491;
  function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
  const Z1 = new Int32Array(16 * 90), Z2 = new Int32Array(16 * 90);
  for (let i = 0; i < Z1.length; i++) { Z1[i] = rnd(); Z2[i] = rnd(); }
  const ZS1 = rnd(), ZS2 = rnd();

  function pval(p, sq) {
    const t = p & 7, red = p < 8, r = (sq / 9) | 0, c = sq % 9;
    const v = MAT[t] + PST[t][red ? sq : (9 - r) * 9 + c];
    return red ? v : -v;
  }
  function init(arr, s) {
    side = s; score = 0; h1 = 0; h2 = 0;
    for (let i = 0; i < 90; i++) {
      const p = board[i] = arr[i];
      if (p) { score += pval(p, i); h1 ^= Z1[p * 90 + i]; h2 ^= Z2[p * 90 + i]; if ((p & 7) === K) kpos[p < 8 ? 0 : 1] = i; }
    }
    if (side) { h1 ^= ZS1; h2 ^= ZS2; }
    up = 0;
  }
  const isMine = (q, s) => q !== 0 && ((q >= 8) === (s === 1));
  const inPal = (r, c, s) => c >= 3 && c <= 5 && (s === 0 ? r >= 7 && r <= 9 : r >= 0 && r <= 2);
  const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]], DX = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ND = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];

  function gen(out, capsOnly) {
    const me = side;
    for (let sq = 0; sq < 90; sq++) {
      const p = board[sq]; if (!p || !isMine(p, me)) continue;
      const t = p & 7, r = (sq / 9) | 0, c = sq % 9;
      const add = (nr, nc) => {
        const to = nr * 9 + nc, q = board[to];
        if (q && isMine(q, me)) return; if (capsOnly && !q) return;
        out.push(sq << 7 | to);
      };
      if (t === K) { for (const [dr, dc] of D4) { const nr = r + dr, nc = c + dc; if (inPal(nr, nc, me)) add(nr, nc); } }
      else if (t === A) { for (const [dr, dc] of DX) { const nr = r + dr, nc = c + dc; if (inPal(nr, nc, me)) add(nr, nc); } }
      else if (t === B) {
        for (const [dr, dc] of DX) {
          const nr = r + 2 * dr, nc = c + 2 * dc;
          if (nr < 0 || nr > 9 || nc < 0 || nc > 8) continue;
          if (me === 0 ? nr < 5 : nr > 4) continue;
          if (board[(r + dr) * 9 + c + dc]) continue; // 塞象眼
          add(nr, nc);
        }
      } else if (t === N) {
        for (const [dr, dc] of ND) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr > 9 || nc < 0 || nc > 8) continue;
          const leg = Math.abs(dr) === 2 ? (r + dr / 2) * 9 + c : r * 9 + c + dc / 2;
          if (board[leg]) continue; // 蹩馬腳
          add(nr, nc);
        }
      } else if (t === R) {
        for (const [dr, dc] of D4) {
          let nr = r + dr, nc = c + dc;
          while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
            const q = board[nr * 9 + nc];
            if (!q) { if (!capsOnly) out.push(sq << 7 | (nr * 9 + nc)); }
            else { if (!isMine(q, me)) out.push(sq << 7 | (nr * 9 + nc)); break; }
            nr += dr; nc += dc;
          }
        }
      } else if (t === C) {
        for (const [dr, dc] of D4) {
          let nr = r + dr, nc = c + dc, screen = false;
          while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
            const q = board[nr * 9 + nc];
            if (!screen) { if (!q) { if (!capsOnly) out.push(sq << 7 | (nr * 9 + nc)); } else screen = true; }
            else if (q) { if (!isMine(q, me)) out.push(sq << 7 | (nr * 9 + nc)); break; }
            nr += dr; nc += dc;
          }
        }
      } else if (t === P) {
        const f = me === 0 ? -1 : 1, nr = r + f;
        if (nr >= 0 && nr <= 9) add(nr, c);
        if (me === 0 ? r <= 4 : r >= 5) { if (c > 0) add(r, c - 1); if (c < 8) add(r, c + 1); }
      }
    }
    return out;
  }

  // s 方的帥/將是否被攻擊（含將帥照面）
  function inCheck(s) {
    const ks = kpos[s], kr = (ks / 9) | 0, kc = ks % 9, o = s === 0 ? 8 : 0;
    for (const [dr, dc] of D4) {
      let r = kr + dr, c = kc + dc, screen = false;
      while (r >= 0 && r < 10 && c >= 0 && c < 9) {
        const q = board[r * 9 + c];
        if (q) {
          if (!screen) { if (q === R + o || (dc === 0 && q === K + o)) return true; screen = true; }
          else { if (q === C + o) return true; break; }
        }
        r += dr; c += dc;
      }
    }
    for (const [dr, dc] of ND) { // 馬從 (kr-dr, kc-dc) 跳到帥
      const nr = kr - dr, nc = kc - dc;
      if (nr < 0 || nr > 9 || nc < 0 || nc > 8) continue;
      if (board[nr * 9 + nc] !== N + o) continue;
      const leg = Math.abs(dr) === 2 ? (nr + dr / 2) * 9 + nc : nr * 9 + nc + dc / 2;
      if (!board[leg]) return true;
    }
    const f = s === 0 ? -1 : 1; // 敵方兵從對面來
    if (kr + f >= 0 && kr + f <= 9 && board[(kr + f) * 9 + kc] === P + o) return true;
    if (kc > 0 && board[kr * 9 + kc - 1] === P + o) return true;
    if (kc < 8 && board[kr * 9 + kc + 1] === P + o) return true;
    return false;
  }

  const UQ = new Int8Array(1024), US = new Int32Array(1024), UH1 = new Int32Array(1024), UH2 = new Int32Array(1024), UM = new Int32Array(1024);
  let up = 0;
  function make(m) {
    const from = m >> 7, to = m & 127, p = board[from], q = board[to];
    UQ[up] = q; US[up] = score; UH1[up] = h1; UH2[up] = h2; UM[up] = m; up++;
    score += pval(p, to) - pval(p, from);
    h1 ^= Z1[p * 90 + from] ^ Z1[p * 90 + to] ^ ZS1; h2 ^= Z2[p * 90 + from] ^ Z2[p * 90 + to] ^ ZS2;
    if (q) { score -= pval(q, to); h1 ^= Z1[q * 90 + to]; h2 ^= Z2[q * 90 + to]; }
    board[to] = p; board[from] = 0;
    if ((p & 7) === K) kpos[side] = to;
    side ^= 1;
  }
  function unmake() {
    up--; const m = UM[up], from = m >> 7, to = m & 127, p = board[to];
    side ^= 1;
    board[from] = p; board[to] = UQ[up];
    if ((p & 7) === K) kpos[side] = from;
    score = US[up]; h1 = UH1[up]; h2 = UH2[up];
  }
  function legal() {
    const out = [], ps = gen([], false);
    for (const m of ps) { make(m); if (!inCheck(side ^ 1)) out.push(m); unmake(); }
    return out;
  }

  // -------------------- 搜尋 --------------------
  const MATE = 30000, INF = 32000;
  let TTK, TTS, TTD, TTF, TTM; const TTN = 1 << 20, TMASK = TTN - 1;
  const killers = new Int32Array(256), hist = new Int32Array(1 << 14);
  const HH1 = new Int32Array(2048), HH2 = new Int32Array(2048); let hp = 0;
  let nodes = 0, stop = false, deadline = 0;
  const evalSide = () => side === 0 ? score : -score;

  function quiesce(alpha, beta, qd) {
    nodes++;
    if ((nodes & 2047) === 0 && Date.now() > deadline) stop = true;
    if (stop) return 0;
    const stand = evalSide();
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (qd >= 8) return stand;
    const mv = gen([], true);
    const key = mv.map(m => MAT[board[m & 127] & 7] * 16 - MAT[board[m >> 7] & 7]);
    const idx = mv.map((_, i) => i).sort((a, b) => key[b] - key[a]);
    for (const i of idx) {
      const m = mv[i];
      make(m);
      if (inCheck(side ^ 1)) { unmake(); continue; }
      const s = -quiesce(-beta, -alpha, qd + 1);
      unmake();
      if (stop) return 0;
      if (s >= beta) return s;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }

  function search(depth, alpha, beta, ply) {
    // 重複局面當和棋
    for (let i = hp - 4, lim = Math.max(0, hp - 120); i >= lim; i -= 2) if (HH1[i] === h1 && HH2[i] === h2) return 0;
    const inC = inCheck(side);
    if (inC) depth++;
    if (depth <= 0) return quiesce(alpha, beta, 0);
    nodes++;
    if ((nodes & 2047) === 0 && Date.now() > deadline) stop = true;
    if (stop) return 0;
    const ti = h1 & TMASK; let ttMove = 0;
    if (TTK[ti] === h2) {
      ttMove = TTM[ti];
      if (TTD[ti] >= depth) {
        const s = TTS[ti], f = TTF[ti];
        if (f === 0 || (f === 1 && s >= beta) || (f === 2 && s <= alpha)) return s;
      }
    }
    HH1[hp] = h1; HH2[hp] = h2; hp++;
    const mv = gen([], false);
    const k1 = killers[ply * 2], k2 = killers[ply * 2 + 1];
    const key = mv.map(m => {
      if (m === ttMove) return 1e9;
      const q = board[m & 127];
      if (q) return 1e7 + MAT[q & 7] * 16 - MAT[board[m >> 7] & 7];
      if (m === k1) return 9e6; if (m === k2) return 8e6;
      return hist[m];
    });
    const order = mv.map((_, i) => i).sort((a, b) => key[b] - key[a]);
    let best = -INF, bestMove = 0, legalN = 0, flag = 2;
    for (const i of order) {
      const m = mv[i], cap = board[m & 127];
      make(m);
      if (inCheck(side ^ 1)) { unmake(); continue; }
      legalN++;
      let s;
      if (legalN === 1) s = -search(depth - 1, -beta, -alpha, ply + 1);
      else {
        let red = 0;
        if (depth >= 3 && !cap && !inC && legalN > 4) red = 1;
        s = -search(depth - 1 - red, -alpha - 1, -alpha, ply + 1);
        if (!stop && s > alpha && (red || s < beta)) s = -search(depth - 1, -beta, -alpha, ply + 1);
      }
      unmake();
      if (stop) { hp--; return 0; }
      if (s > best) { best = s; bestMove = m; }
      if (s > alpha) { alpha = s; flag = 0; }
      if (alpha >= beta) {
        flag = 1;
        if (!cap) { if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; } hist[m] += depth * depth; }
        break;
      }
    }
    hp--;
    if (!legalN) return -MATE + ply; // 將死或困斃都算輸
    TTK[ti] = h2; TTS[ti] = best; TTD[ti] = depth; TTF[ti] = flag; TTM[ti] = bestMove;
    return best;
  }

  function think(o) {
    if (!TTK) { TTK = new Int32Array(TTN); TTS = new Int16Array(TTN); TTD = new Int8Array(TTN); TTF = new Uint8Array(TTN); TTM = new Int32Array(TTN); }
    killers.fill(0); for (let i = 0; i < hist.length; i++) hist[i] >>= 2;
    const t0 = Date.now(); deadline = t0 + (o.time || 1e9); stop = false; nodes = 0;
    hp = 0; for (const [a, b] of (o.hist || [])) { HH1[hp] = a; HH2[hp] = b; hp++; if (hp > 1900) break; }
    let moves = legal();
    if (!moves.length) return { move: 0 };
    // 避開會讓自己因長將／長捉判負的步（全部都要避開時就照常）
    if (o.avoid && o.avoid.length) { const f = moves.filter(m => !o.avoid.includes(m)); if (f.length) moves = f; }
    if (moves.length === 1) return { move: moves[0], score: 0, depth: 0 };
    HH1[hp] = h1; HH2[hp] = h2; hp++;
    if (o.noise) { // 低等級：每一步都評分後加上隨機誤差
      let best = moves[0], bs = -1e9;
      for (const m of moves) {
        make(m); const s = -search(o.depth - 1, -INF, INF, 1); unmake();
        const v = s + (Math.random() * 2 - 1) * o.noise;
        if (v > bs) { bs = v; best = m; }
      }
      return { move: best, score: bs, depth: o.depth };
    }
    let best = moves[0], bestScore = 0, done = 0;
    let order = moves.slice();
    for (let d = 1; d <= o.depth; d++) {
      let alpha = -INF, bS = -INF, bM = 0;
      for (let i = 0; i < order.length; i++) {
        const m = order[i]; make(m);
        let s;
        if (i === 0) s = -search(d - 1, -INF, -alpha, 1);
        else { s = -search(d - 1, -alpha - 1, -alpha, 1); if (!stop && s > alpha) s = -search(d - 1, -INF, -alpha, 1); }
        unmake();
        if (stop) break;
        if (s > bS) { bS = s; bM = m; if (s > alpha) alpha = s; }
      }
      if (stop) { if (bM) best = bM; break; }
      best = bM; bestScore = bS; done = d;
      order = [bM].concat(order.filter(m => m !== bM));
      if (Math.abs(bS) > MATE - 200) break;
      if (Date.now() - t0 > (o.time || 1e9) * 0.45) break;
    }
    return { move: best, score: bestScore, depth: done, nodes };
  }

  // -------------------- 長將／長捉判定用 --------------------
  // classify(m)：目前輪到走的一方走 m 之後，是否將軍、以及「捉」了對方哪些子。
  // 捉（簡化規則）：走動的那顆子（不含帥將、兵卒）走完後可以吃到對方某個子（不含帥將），
  // 而且那個子價值比捉子者高，或沒有被保護（吃了之後對方不能吃回來）。
  // 回傳 { check, chase: [被捉子的代碼...] }。不改變局面。
  function classify(m) {
    const mover = side, to = m & 127, p = board[m >> 7];
    make(m);
    const check = inCheck(side);
    const chase = [];
    const at = p & 7;
    {
      if (at !== K && at !== P) {
        // 讓走子方再走一次，看它從 to 能吃到什麼
        const opp = side; side = mover;
        const caps = gen([], true).filter(c => (c >> 7) === to);
        for (const c of caps) {
          const sq = c & 127, q = board[sq], qt = q & 7;
          if (qt === K) continue;
          if (qt === P && (q < 8 ? ((sq / 9) | 0) > 4 : ((sq / 9) | 0) < 5)) continue; // 沒過河的兵卒不算
          make(c);
          if (inCheck(side ^ 1)) { unmake(); continue; } // 吃了會被將，不算能吃
          let prot = false;
          if (MAT[qt] <= MAT[at]) { for (const r of legal()) if ((r & 127) === sq) { prot = true; break; } }
          unmake();
          if (MAT[qt] > MAT[at] || !prot) chase.push(q);
        }
        side = opp;
      }
    }
    unmake();
    return { check, chase };
  }

  // -------------------- 連將殺解題 --------------------
  // 攻方每一步都必須將軍；守方沒有合法步（將死或困斃）就算攻方贏。
  // mateAtt(n)：輪到攻方，能不能在 n 步內殺；mateDef(n)：輪到守方，是否怎麼走都會在 n 步內被殺。
  let mcache = new Map(), mnodes = 0, mlimit = 0, mstop = false;
  function mkey(n) { return h1 + ':' + h2 + ':' + n; }
  function checksList() {
    const out = [], ps = gen([], false);
    for (const m of ps) { make(m); if (!inCheck(side ^ 1) && inCheck(side)) out.push(m); unmake(); }
    return out;
  }
  function mateAtt(n) {
    if (n <= 0) return false;
    if (mstop || (mlimit && ++mnodes > mlimit)) { mstop = true; return false; }
    const k = mkey(n); const c = mcache.get(k); if (c !== undefined) return c;
    let ok = false;
    for (const m of checksList()) { make(m); const r = mateDef(n - 1); unmake(); if (r) { ok = true; break; } }
    if (!mstop) mcache.set(k, ok);
    return ok;
  }
  function mateDef(n) {
    const lm = legal();
    if (!lm.length) return true;
    if (n <= 0) return false;
    for (const m of lm) { make(m); const r = mateAtt(n); unmake(); if (!r) return false; }
    return true;
  }
  /** 回傳攻方在 n 步內能連將殺的所有第一步 */
  function mateFirst(n, limit) {
    mcache = new Map(); mnodes = 0; mlimit = limit || 0; mstop = false;
    const res = [];
    for (const m of checksList()) { make(m); const r = mateDef(n - 1); unmake(); if (r) res.push(m); }
    return { moves: res, aborted: mstop };
  }
  /** 最短連將殺步數（找不到回傳 0） */
  function mateLen(maxN, limit) {
    for (let n = 1; n <= maxN; n++) { const r = mateFirst(n, limit); if (r.aborted) return -1; if (r.moves.length) return n; }
    return 0;
  }
  /** 守方：選一步撐最久的（n = 攻方還剩幾步） */
  function defend(n) {
    mcache = new Map(); mnodes = 0; mlimit = 0; mstop = false;
    const lm = legal(); let best = lm[0] || 0, bestK = -1;
    for (const m of lm) {
      make(m);
      let k = 1; while (k <= n && !mateAtt(k)) k++;
      unmake();
      if (k > bestK) { bestK = k; best = m; }
    }
    return { move: best, len: bestK };
  }

  self.X = {
    K, A, B, N, R, C, P, board, init, legal, make, unmake, inCheck, gen,
    get side() { return side; }, hash: () => [h1, h2], think, classify, mateFirst, mateLen, defend,
  };
  self.onmessage = e => {
    const d = e.data; init(d.board, d.side);
    if (d.cmd === 'mate') return mateFirst(d.n, d.limit);
    if (d.cmd === 'defend') return defend(d.n);
    return think(d);
  };
}
