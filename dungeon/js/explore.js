'use strict';
// 深淵地牢：自動探索、旅行路徑、地形描述
Object.assign(Game, {
  knownPass(x, y) {
    const F = G.F, k = y * F.w + x; if (!F.seen[k]) return false;
    const v = F.t[k]; if (!TP[v].walk || v === T.LAVA) return false;
    if (F.mons.some(m => m.x === x && m.y === y && m.hp > 0 && MON[m.k].talk)) return false;
    if (!this._trapOk) { const tr = this.trapAt(x, y); if (tr && !tr.hid) return false; }
    return true;
  },
  travelPath(tx, ty) {
    let p = this._travelPath(tx, ty);
    if (!p) { this._trapOk = true; p = this._travelPath(tx, ty); this._trapOk = false; }
    return p;
  },
  explorePath() {
    let p = this._explorePath();
    if (!p) { this._trapOk = true; p = this._explorePath(); this._trapOk = false; }
    return p;
  },
  _travelPath(tx, ty) {
    const F = G.F, P = G.P;
    if (tx < 0 || ty < 0 || tx >= F.w || ty >= F.h || !F.seen[ty * F.w + tx]) return null;
    return FOV.path(F, P.x, P.y, tx, ty, (x, y, goal) => {
      if (goal) { const v = this.tile(x, y); return TP[v].walk || v === T.FOUNTAIN; }
      if (!this.knownPass(x, y)) return false;
      const m = this.monAt(x, y); if (m && this.monVisible(m) && !m.disg && m.k !== 'keeper') return false;
      return true;
    });
  },
  // 回傳往最近的未探索區域或道具的路徑；沒有則回傳 null
  _explorePath() {
    const F = G.F, P = G.P, W = F.w, N = W * F.h;
    const prev = new Int32Array(N).fill(-1), s = P.y * W + P.x, q = [s]; prev[s] = s;
    const isTarget = k => {
      if (k === s) return false;
      const x = k % W, y = (k / W) | 0;
      if (F.items.some(o => o.x === x && o.y === y && o.seen && !o.it.price && !o.skip)) return true;
      if (F.mons.some(m => m.disg === 1 && m.k === 'mimic' && m.x === x && m.y === y && F.seen[k])) return true;
      if (F.chests && F.chests.some(c => !c.open && cheb(c.x, c.y, x, y) === 1 && F.seen[c.y * W + c.x])) return true;
      for (const [dx, dy] of DIRS8) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < F.h && !F.seen[ny * W + nx]) return true; }
      return false;
    };
    const goal = G.exGoal && isTarget(G.exGoal[1] * W + G.exGoal[0]) ? G.exGoal[1] * W + G.exGoal[0] : -1;
    let first = -1;
    for (let h = 0; h < q.length; h++) {
      const k = q[h];
      if (first < 0 && isTarget(k)) { first = k; if (goal < 0) break; }
      if (k === goal) { first = k; break; }
      const x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= F.h) continue;
        const nk = ny * W + nx; if (prev[nk] >= 0) continue;
        if (!this.knownPass(nx, ny)) { continue; }
        if (dx && dy && (!TP[F.t[y * W + nx]].walk || !TP[F.t[ny * W + x]].walk)) continue;
        const m = this.monAt(nx, ny); if (m && MON[m.k].npc) continue;
        prev[nk] = k; q.push(nk);
      }
    }
    if (first < 0) { G.exGoal = null; return null; }
    G.exGoal = [first % W, (first / W) | 0];
    const out = []; let c = first; while (c !== s) { out.push([c % W, (c / W) | 0]); c = prev[c]; } return out.reverse();
  },
  // 身邊有還沒打開、看得到的寶箱
  adjChest() { const P = G.P, F = G.F; return (F.chests || []).find(c => !c.open && cheb(c.x, c.y, P.x, P.y) === 1 && F.seen[c.y * F.w + c.x]); },
  dangerNear() { const P = G.P; return this.hostiles().some(m => m.awake && !MON[m.k].npc && cheb(m.x, m.y, P.x, P.y) <= 7 && !(m.st.sleep > 0)); },
  describe(x, y) {
    const F = G.F; if (x < 0 || y < 0 || x >= F.w || y >= F.h) return '';
    const k = y * F.w + x; if (!F.seen[k]) return '尚未探索的地方';
    const out = [];
    if (x === G.P.x && y === G.P.y) out.push('你（' + CLASSES[G.P.cls].n + '）');
    const m = this.monAt(x, y);
    if (m && (this.monVisible(m) || m.disg) && this.inView(x, y)) {
      if (m.disg) out.push(m.k === 'mimic' ? '一個寶箱' : '一座石像');
      else { const D = MON[m.k]; out.push(D.n + (D.npc ? '' : '（HP ' + m.hp + '/' + m.mhp + (!m.awake || m.st.sleep ? '，睡著了' : m.mode === 'hunt' ? '，正在追你' : '') + '）') + (D.d2 ? ' · ' + D.d2 : '')); }
    }
    for (const o of F.items) if (o.x === x && o.y === y && (o.seen || F.detect)) out.push(this.itemName(o.it) + (o.it.price ? '（' + o.it.price + ' 金幣）' : ''));
    const tr = this.trapAt(x, y); if (tr && !tr.hid) out.push(TRAPS[tr.k].n);
    const c = F.clouds.find(o => o.x === x && o.y === y); if (c && this.inView(x, y)) out.push({ poison: '毒霧', conf: '混亂迷霧', para: '麻痺氣體', fire: '火焰' }[c.k]);
    const pp = F.t[k] === T.PROP && this.propAt(x, y); if (pp) { out.push(PROPS[pp.k].n + (PROPS[pp.k].deco ? ' · ' + PROPS[pp.k].d : pp.k === 'fire' ? (pp.used ? '（已熄滅）' : '（走過去可以休息一次）') : PROPS[pp.k].boom ? '（打破或用東西丟它會爆炸！）' : '（可以打破）')); return out.join('，'); }
    out.push(TP[F.t[k]].n + (F.t[k] === T.STAIRS && F.locked ? '（被封印）' : ''));
    return out.join('，');
  },
});
