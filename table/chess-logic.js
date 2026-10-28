// 西洋棋規則＋電腦＋殺棋解題（西洋棋、西洋棋殘局共用）
function CHLOGIC(self) {
  // 0x88 棋盤：sq = rank*16 + file，rank 0 = 第 1 橫列（白方底線）
  // 棋子：白 1..6（兵馬象車后王），黑 = 白 + 8
  const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  const VAL = [0, 100, 320, 330, 500, 900, 0];
  const T = s => s.trim().split(/[\s,]+/).map(Number);
  const PST = [];
  PST[P] = T(`0 0 0 0 0 0 0 0  50 50 50 50 50 50 50 50  10 10 20 30 30 20 10 10  5 5 10 25 25 10 5 5
    0 0 0 20 20 0 0 0  5 -5 -10 0 0 -10 -5 5  5 10 10 -20 -20 10 10 5  0 0 0 0 0 0 0 0`);
  PST[N] = T(`-50 -40 -30 -30 -30 -30 -40 -50  -40 -20 0 0 0 0 -20 -40  -30 0 10 15 15 10 0 -30  -30 5 15 20 20 15 5 -30
    -30 0 15 20 20 15 0 -30  -30 5 10 15 15 10 5 -30  -40 -20 0 5 5 0 -20 -40  -50 -40 -30 -30 -30 -30 -40 -50`);
  PST[B] = T(`-20 -10 -10 -10 -10 -10 -10 -20  -10 0 0 0 0 0 0 -10  -10 0 5 10 10 5 0 -10  -10 5 5 10 10 5 5 -10
    -10 0 10 10 10 10 0 -10  -10 10 10 10 10 10 10 -10  -10 5 0 0 0 0 5 -10  -20 -10 -10 -10 -10 -10 -10 -20`);
  PST[R] = T(`0 0 0 0 0 0 0 0  5 10 10 10 10 10 10 5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5
    -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  0 0 0 5 5 0 0 0`);
  PST[Q] = T(`-20 -10 -10 -5 -5 -10 -10 -20  -10 0 0 0 0 0 0 -10  -10 0 5 5 5 5 0 -10  -5 0 5 5 5 5 0 -5
    0 0 5 5 5 5 0 -5  -10 5 5 5 5 5 0 -10  -10 0 5 0 0 0 0 -10  -20 -10 -10 -5 -5 -10 -10 -20`);
  PST[K] = T(`-30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30
    -20 -30 -30 -40 -40 -30 -30 -20  -10 -20 -20 -20 -20 -20 -20 -10  20 20 0 0 0 0 20 20  20 30 10 0 0 10 30 20`);
  const KEG = T(`-50 -40 -30 -20 -20 -30 -40 -50  -30 -20 -10 0 0 -10 -20 -30  -30 -10 20 30 30 20 -10 -30  -30 -10 30 40 40 30 -10 -30
    -30 -10 30 40 40 30 -10 -30  -30 -10 20 30 30 20 -10 -30  -30 -30 0 0 0 0 -30 -30  -50 -30 -30 -30 -30 -30 -30 -50`);
  const PH = [0, 0, 1, 1, 2, 4, 0];

  const board = new Int8Array(128);
  let side = 0, castle = 0, ep = -1, half = 0, h1 = 0, h2 = 0;
  const ksq = [4, 116];
  let seed = 0x1F2E3D4C;
  function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
  const Z1 = new Int32Array(16 * 128), Z2 = new Int32Array(16 * 128);
  for (let i = 0; i < Z1.length; i++) { Z1[i] = rnd(); Z2[i] = rnd(); }
  const ZS1 = rnd(), ZS2 = rnd();
  const ZC1 = new Int32Array(16), ZC2 = new Int32Array(16); for (let i = 0; i < 16; i++) { ZC1[i] = rnd(); ZC2[i] = rnd(); }
  const ZE1 = new Int32Array(8), ZE2 = new Int32Array(8); for (let i = 0; i < 8; i++) { ZE1[i] = rnd(); ZE2[i] = rnd(); }
  const CR = new Int8Array(128).fill(15); CR[0] = 13; CR[7] = 14; CR[4] = 12; CR[112] = 7; CR[119] = 11; CR[116] = 3;
  const KN = [33, 31, 18, 14, -33, -31, -18, -14], KG = [1, -1, 16, -16, 15, 17, -15, -17];
  const BD = [15, 17, -15, -17], RD = [1, -1, 16, -16];

  // 吃過路兵只有在真的能吃時才算進局面（重複局面判斷用）
  function epKey() {
    if (ep < 0) return -1;
    const pw = side * 8 + P, back = side ? 16 : -16; // 能吃的兵站在 ep 的後面一排左右
    const a = ep + back - 1, b = ep + back + 1;
    if ((!(a & 0x88) && board[a] === pw) || (!(b & 0x88) && board[b] === pw)) return ep & 7;
    return -1;
  }
  function rehash() {
    h1 = 0; h2 = 0;
    for (let sq = 0; sq < 128; sq++) { if (sq & 0x88) continue; const p = board[sq]; if (p) { h1 ^= Z1[p * 128 + sq]; h2 ^= Z2[p * 128 + sq]; } }
    if (side) { h1 ^= ZS1; h2 ^= ZS2; }
    h1 ^= ZC1[castle]; h2 ^= ZC2[castle];
    const e = epKey(); if (e >= 0) { h1 ^= ZE1[e]; h2 ^= ZE2[e]; }
  }
  function init(o) {
    board.fill(0);
    for (let i = 0; i < 64; i++) board[(i >> 3) * 16 + (i & 7)] = o.board[i];
    side = o.side; castle = o.castle; ep = o.ep; half = o.half || 0;
    for (let sq = 0; sq < 128; sq++) if (!(sq & 0x88) && (board[sq] & 7) === K) ksq[board[sq] >> 3] = sq;
    rehash(); up = 0;
  }
  function attacked(sq, by) {
    if (by === 0) { if ((!((sq - 15) & 0x88) && board[sq - 15] === 1) || (!((sq - 17) & 0x88) && board[sq - 17] === 1)) return true; }
    else { if ((!((sq + 15) & 0x88) && board[sq + 15] === 9) || (!((sq + 17) & 0x88) && board[sq + 17] === 9)) return true; }
    const kn = by * 8 + N, kg = by * 8 + K, bq = by * 8 + Q, bb = by * 8 + B, br = by * 8 + R;
    for (const d of KN) { const t = sq + d; if (!(t & 0x88) && board[t] === kn) return true; }
    for (const d of KG) { const t = sq + d; if (!(t & 0x88) && board[t] === kg) return true; }
    for (const d of BD) { let t = sq + d; while (!(t & 0x88)) { const q = board[t]; if (q) { if (q === bb || q === bq) return true; break; } t += d; } }
    for (const d of RD) { let t = sq + d; while (!(t & 0x88)) { const q = board[t]; if (q) { if (q === br || q === bq) return true; break; } t += d; } }
    return false;
  }
  const inCheck = c => attacked(ksq[c], c ^ 1);
  const mv = (f, t, pr) => f | (t << 7) | ((pr || 0) << 14);
  function gen(list, caps) {
    const me = side;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = board[sq]; if (!p || (p >> 3) !== me) continue;
      const t = p & 7;
      if (t === P) {
        const dir = me ? -16 : 16, last = me ? 0 : 7, start = me ? 6 : 1;
        const one = sq + dir;
        if (!(one & 0x88) && !board[one]) {
          if ((one >> 4) === last) { list.push(mv(sq, one, Q)); if (!caps) { list.push(mv(sq, one, R)); list.push(mv(sq, one, B)); list.push(mv(sq, one, N)); } }
          else if (!caps) { list.push(mv(sq, one)); const two = one + dir; if ((sq >> 4) === start && !board[two]) list.push(mv(sq, two)); }
        }
        for (const d of [dir - 1, dir + 1]) {
          const to = sq + d; if (to & 0x88) continue;
          const q = board[to];
          if ((q && (q >> 3) !== me) || to === ep) {
            if ((to >> 4) === last) { list.push(mv(sq, to, Q)); if (!caps) { list.push(mv(sq, to, R)); list.push(mv(sq, to, B)); list.push(mv(sq, to, N)); } }
            else list.push(mv(sq, to));
          }
        }
      } else if (t === N || t === K) {
        for (const d of (t === N ? KN : KG)) {
          const to = sq + d; if (to & 0x88) continue;
          const q = board[to];
          if (q ? (q >> 3) !== me : !caps) list.push(mv(sq, to));
        }
        if (t === K && !caps) {
          const o = me ? 112 : 0, en = me ^ 1;
          if (sq === o + 4) {
            if ((castle & (me ? 4 : 1)) && !board[o + 5] && !board[o + 6] && board[o + 7] === me * 8 + R && !attacked(o + 4, en) && !attacked(o + 5, en) && !attacked(o + 6, en)) list.push(mv(sq, o + 6));
            if ((castle & (me ? 8 : 2)) && !board[o + 3] && !board[o + 2] && !board[o + 1] && board[o] === me * 8 + R && !attacked(o + 4, en) && !attacked(o + 3, en) && !attacked(o + 2, en)) list.push(mv(sq, o + 2));
          }
        }
      } else {
        const ds = t === B ? BD : t === R ? RD : KG;
        for (const d of ds) {
          let to = sq + d;
          while (!(to & 0x88)) {
            const q = board[to];
            if (q) { if ((q >> 3) !== me) list.push(mv(sq, to)); break; }
            if (!caps) list.push(mv(sq, to));
            to += d;
          }
        }
      }
    }
    return list;
  }
  // 復原用的堆疊
  const U = []; let up = 0;
  function make(m) {
    const f = m & 127, to = (m >> 7) & 127, pr = m >> 14, p = board[f], t = p & 7;
    let cap = board[to], csq = to;
    if (t === P && to === ep && !cap) { csq = to + (side ? 16 : -16); cap = board[csq]; }
    U[up++] = [m, cap, csq, castle, ep, half, h1, h2];
    const oe = epKey();
    if (oe >= 0) { h1 ^= ZE1[oe]; h2 ^= ZE2[oe]; }
    h1 ^= ZC1[castle]; h2 ^= ZC2[castle];
    if (cap) { board[csq] = 0; h1 ^= Z1[cap * 128 + csq]; h2 ^= Z2[cap * 128 + csq]; }
    board[f] = 0; h1 ^= Z1[p * 128 + f]; h2 ^= Z2[p * 128 + f];
    const np = pr ? side * 8 + pr : p;
    board[to] = np; h1 ^= Z1[np * 128 + to]; h2 ^= Z2[np * 128 + to];
    if (t === K) {
      ksq[side] = to;
      if (to - f === 2 || f - to === 2) {
        const rf = to > f ? f + 3 : f - 4, rt = to > f ? f + 1 : f - 1, rp = side * 8 + R;
        board[rf] = 0; board[rt] = rp;
        h1 ^= Z1[rp * 128 + rf] ^ Z1[rp * 128 + rt]; h2 ^= Z2[rp * 128 + rf] ^ Z2[rp * 128 + rt];
      }
    }
    castle &= CR[f] & CR[to];
    ep = (t === P && (to - f === 32 || f - to === 32)) ? (f + to) >> 1 : -1;
    half = (t === P || cap) ? 0 : half + 1;
    side ^= 1; h1 ^= ZS1; h2 ^= ZS2;
    h1 ^= ZC1[castle]; h2 ^= ZC2[castle];
    const ne = epKey(); if (ne >= 0) { h1 ^= ZE1[ne]; h2 ^= ZE2[ne]; }
  }
  function unmake() {
    const [m, cap, csq, c0, e0, hf, a, b] = U[--up];
    side ^= 1;
    const f = m & 127, to = (m >> 7) & 127, pr = m >> 14;
    const np = board[to], p = pr ? side * 8 + P : np;
    board[f] = p; board[to] = 0;
    if (cap) board[csq] = cap;
    if ((p & 7) === K) {
      ksq[side] = f;
      if (to - f === 2 || f - to === 2) {
        const rf = to > f ? f + 3 : f - 4, rt = to > f ? f + 1 : f - 1;
        board[rf] = board[rt]; board[rt] = 0;
      }
    }
    castle = c0; ep = e0; half = hf; h1 = a; h2 = b;
  }
  function legal() {
    const out = [], l = gen([], false);
    for (const m of l) { make(m); if (!inCheck(side ^ 1)) out.push(m); unmake(); }
    return out;
  }
  function perft(d) {
    if (!d) return 1;
    const l = gen([], false); let n = 0;
    for (const m of l) { make(m); if (!inCheck(side ^ 1)) n += perft(d - 1); unmake(); }
    return n;
  }
  function insufficient() {
    const pcs = [];
    for (let sq = 0; sq < 128; sq++) { if (sq & 0x88) continue; const p = board[sq]; if (p && (p & 7) !== K) pcs.push([p, sq]); }
    if (!pcs.length) return true;
    if (pcs.some(([p]) => [P, R, Q].includes(p & 7))) return false;
    if (pcs.length === 1) return true; // 王＋單馬或單象
    // 只剩同色格的象
    if (pcs.every(([p]) => (p & 7) === B)) { const c = pcs.map(([, sq]) => ((sq >> 4) + (sq & 7)) & 1); return c.every(x => x === c[0]); }
    return false;
  }

  // ---------------- 評估 ----------------
  function evaluate() {
    let mg = 0, ph = 0, kw = 0, kb = 0;
    let s = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = board[sq]; if (!p) continue;
      const t = p & 7, c = p >> 3, r = sq >> 4, f = sq & 7;
      const i = c ? r * 8 + f : (7 - r) * 8 + f;
      ph += PH[t];
      if (t === K) { if (c) kb = i; else kw = i; continue; }
      const v = VAL[t] + PST[t][i];
      s += c ? -v : v;
    }
    const pp = Math.min(24, ph);
    const kv = i => (PST[K][i] * pp + KEG[i] * (24 - pp)) / 24;
    s += kv(kw) - kv(kb);
    return (side ? -s : s) + 10;
  }

  // ---------------- 搜尋 ----------------
  const MATE = 30000, INF = 32000;
  const TTN = 1 << 20; let TTK, TTS, TTD, TTF, TTM;
  const killers = new Int32Array(256), hist = new Int32Array(1 << 14);
  const HH1 = new Int32Array(1200), HH2 = new Int32Array(1200); let hp = 0;
  let stop = false, deadline = 0, nodes = 0;
  const hidx = m => (m & 127) << 7 | ((m >> 7) & 127);
  function quiesce(alpha, beta, ply) {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) stop = true;
    if (stop) return 0;
    const sp = evaluate();
    if (sp >= beta) return sp;
    if (sp > alpha) alpha = sp;
    if (ply > 60) return sp;
    const l = gen([], true);
    const key = l.map(m => { const q = board[(m >> 7) & 127]; return (q ? VAL[q & 7] * 10 : 800) - VAL[board[m & 127] & 7] / 10 + (m >> 14 ? 9000 : 0); });
    const ord = l.map((_, i) => i).sort((a, b) => key[b] - key[a]);
    for (const i of ord) {
      const m = l[i]; make(m);
      if (inCheck(side ^ 1)) { unmake(); continue; }
      const s = -quiesce(-beta, -alpha, ply + 1); unmake();
      if (stop) return 0;
      if (s >= beta) return s;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }
  function search(depth, alpha, beta, ply) {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) stop = true;
    if (stop) return 0;
    if (ply && half >= 100) return 0;
    if (ply) { for (let i = hp - 2; i >= 0 && i >= hp - half - 1; i -= 2) if (HH1[i] === h1 && HH2[i] === h2) return 0; }
    const inC = inCheck(side);
    if (inC) depth++;
    if (depth <= 0) return quiesce(alpha, beta, ply);
    const ti = h1 & (TTN - 1);
    let ttMove = 0;
    if (TTK[ti] === h2) {
      ttMove = TTM[ti];
      if (ply && TTD[ti] >= depth) {
        const s = TTS[ti], f = TTF[ti];
        if (f === 0 || (f === 1 && s >= beta) || (f === 2 && s <= alpha)) return s;
      }
    }
    // 空著裁剪
    if (ply && !inC && depth >= 3 && beta < MATE - 300) {
      let big = false; for (let sq = 0; sq < 128 && !big; sq++) { if (sq & 0x88) continue; const p = board[sq]; if (p && (p >> 3) === side && (p & 7) > P && (p & 7) < K) big = true; }
      if (big && evaluate() >= beta) {
        const oe = ep, oh1 = h1, oh2 = h2, ek = epKey();
        if (ek >= 0) { h1 ^= ZE1[ek]; h2 ^= ZE2[ek]; }
        ep = -1; side ^= 1; h1 ^= ZS1; h2 ^= ZS2;
        HH1[hp] = h1; HH2[hp] = h2; hp++;
        const s = -search(depth - 3, -beta, -beta + 1, ply + 1);
        hp--; side ^= 1; ep = oe; h1 = oh1; h2 = oh2;
        if (stop) return 0;
        if (s >= beta) return s;
      }
    }
    HH1[hp] = h1; HH2[hp] = h2; hp++;
    const l = gen([], false);
    const k1 = killers[ply * 2], k2 = killers[ply * 2 + 1];
    const key = l.map(m => {
      if (m === ttMove) return 1e9;
      const q = board[(m >> 7) & 127];
      if (q) return 1e7 + VAL[q & 7] * 16 - VAL[board[m & 127] & 7];
      if (m >> 14) return 1e7 + 5000;
      if (m === k1) return 9e6; if (m === k2) return 8e6;
      return hist[hidx(m)];
    });
    const ord = l.map((_, i) => i).sort((a, b) => key[b] - key[a]);
    let best = -INF, bestMove = 0, n = 0, flag = 2;
    for (const i of ord) {
      const m = l[i], cap = board[(m >> 7) & 127];
      make(m);
      if (inCheck(side ^ 1)) { unmake(); continue; }
      n++;
      let s;
      if (n === 1) s = -search(depth - 1, -beta, -alpha, ply + 1);
      else {
        let red = 0;
        if (depth >= 3 && !cap && !(m >> 14) && !inC && n > 4) red = n > 10 ? 2 : 1;
        s = -search(depth - 1 - red, -alpha - 1, -alpha, ply + 1);
        if (!stop && s > alpha && (red || s < beta)) s = -search(depth - 1, -beta, -alpha, ply + 1);
      }
      unmake();
      if (stop) { hp--; return 0; }
      if (s > best) { best = s; bestMove = m; }
      if (s > alpha) { alpha = s; flag = 0; }
      if (alpha >= beta) {
        flag = 1;
        if (!cap) { if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; } hist[hidx(m)] += depth * depth; }
        break;
      }
    }
    hp--;
    if (!n) return inC ? -MATE + ply : 0;
    TTK[ti] = h2; TTS[ti] = best; TTD[ti] = depth; TTF[ti] = flag; TTM[ti] = bestMove;
    return best;
  }
  function think(o) {
    if (!TTK) { TTK = new Int32Array(TTN); TTS = new Int16Array(TTN); TTD = new Int8Array(TTN); TTF = new Uint8Array(TTN); TTM = new Int32Array(TTN); }
    killers.fill(0); for (let i = 0; i < hist.length; i++) hist[i] >>= 2;
    const t0 = Date.now(); deadline = t0 + (o.time || 1e9); stop = false; nodes = 0;
    hp = 0; for (const [a, b] of (o.hist || [])) { if (hp > 1000) break; HH1[hp] = a; HH2[hp] = b; hp++; }
    const moves = legal();
    if (!moves.length) return { move: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0, depth: 0 };
    HH1[hp] = h1; HH2[hp] = h2; hp++;
    if (o.noise) {
      let best = moves[0], bs = -1e9;
      for (const m of moves) {
        make(m); const s = -search(o.depth - 1, -INF, INF, 1); unmake();
        const v = s + (Math.random() * 2 - 1) * o.noise;
        if (v > bs) { bs = v; best = m; }
      }
      return { move: best, score: bs, depth: o.depth };
    }
    let best = moves[0], bestScore = 0, done = 0, order = moves.slice();
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
      if (Date.now() - t0 > (o.time || 1e9) * 0.5) break;
    }
    return { move: best, score: bestScore, depth: done, nodes };
  }
  function fen(str) {
    const [pos, s, c, e, hf] = str.split(' ');
    const arr = new Array(64).fill(0); let r = 7, f = 0;
    for (const ch of pos) {
      if (ch === '/') { r--; f = 0; continue; }
      if (/\d/.test(ch)) { f += +ch; continue; }
      const t = 'pnbrqk'.indexOf(ch.toLowerCase()) + 1;
      arr[r * 8 + f] = t + (ch === ch.toLowerCase() ? 8 : 0); f++;
    }
    let cs = 0; if (c.includes('K')) cs |= 1; if (c.includes('Q')) cs |= 2; if (c.includes('k')) cs |= 4; if (c.includes('q')) cs |= 8;
    const eps = e === '-' ? -1 : (+e[1] - 1) * 16 + (e.charCodeAt(0) - 97);
    return { board: arr, side: s === 'w' ? 0 : 1, castle: cs, ep: eps, half: +hf || 0 };
  }
  self.X = {
    P, N, B, R, Q, K, board, init, legal, make, unmake, inCheck, attacked, perft, insufficient, fen, evaluate,
    get side() { return side; }, get castle() { return castle; }, get ep() { return ep; }, get half() { return half; },
    hash: () => [h1, h2], think, mateFirst, defend,
    state() { const a = new Array(64); for (let i = 0; i < 64; i++) a[i] = board[(i >> 3) * 16 + (i & 7)]; return { board: a, side, castle, ep, half }; },
  };
  // -------------------- 殺棋解題 --------------------
  // mateAtt(n)：輪到攻方，n 步內能不能將死（最後一步一定要將軍；co = 只考慮將軍的走法）
  let mcache = new Map(), mnodes = 0, mlimit = 0, mstop = false, mco = false;
  function attMoves(n) {
    const out = [], ps = gen([], false);
    for (const m of ps) { make(m); if (!inCheck(side ^ 1)) { if ((n > 1 && !mco) || inCheck(side)) out.push(m); } unmake(); }
    return out;
  }
  function mateAtt(n) {
    if (n <= 0) return false;
    if (mstop || (mlimit && ++mnodes > mlimit)) { mstop = true; return false; }
    const k = h1 + ':' + h2 + ':' + n, c = mcache.get(k); if (c !== undefined) return c;
    let ok = false;
    for (const m of attMoves(n)) { make(m); const r = mateDef(n - 1); unmake(); if (r) { ok = true; break; } }
    if (!mstop) mcache.set(k, ok);
    return ok;
  }
  function mateDef(n) {
    const lm = legal();
    if (!lm.length) return inCheck(side); // 將死才算，逼和不算
    if (n <= 0) return false;
    for (const m of lm) { make(m); const r = mateAtt(n); unmake(); if (!r) return false; }
    return true;
  }
  function mateFirst(n, limit, checksOnly) {
    mcache = new Map(); mnodes = 0; mlimit = limit || 0; mstop = false; mco = !!checksOnly;
    const res = [];
    for (const m of attMoves(n)) { make(m); const r = mateDef(n - 1); unmake(); if (r) res.push(m); if (mstop) break; }
    return { moves: res, aborted: mstop };
  }
  function defend(n) {
    mcache = new Map(); mnodes = 0; mlimit = 0; mstop = false; mco = false;
    const lm = legal(); let best = lm[0] || 0, bestK = -1;
    for (const m of lm) {
      make(m);
      let k = 1; while (k <= n && !mateAtt(k)) k++;
      unmake();
      if (k > bestK) { bestK = k; best = m; }
    }
    return { move: best, len: bestK };
  }
  self.onmessage = e => {
    const d = e.data; init(d);
    if (d.cmd === 'mate') return mateFirst(d.n, d.limit, d.co);
    if (d.cmd === 'defend') return defend(d.n);
    return think(d);
  };
}
