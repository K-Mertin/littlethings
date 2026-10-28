'use strict';
// 夜市小吃王：自動玩家（測試／平衡用）。照「藍圖」整齊擺設，按優先順序花錢，所有模式都能玩下去。
//   藍圖：第 0 排是廚師走道、第 1 排一整排攤位、第 2～3 排是排隊區，
//         下面一排一排桌椅（中間留走道），最左邊一欄和桌椅間的空格放裝飾，最右邊一欄留給人走。
const Bot = {
  // ---------- 藍圖 ----------
  seatRows(H) {
    const out = [];
    for (let y = H - 2; y >= 4; y -= 2) out.push(y);
    if (!out.length) out.push(H - 1);
    return out;
  },
  slots(cat) {
    const S = Game.S, W = S.W, H = S.H, out = [];
    if (cat === 'station') { for (let x = 1; x <= W - 2; x++) out.push([x, 1]); return out; }
    const rows = this.seatRows(H);
    if (cat === 'seat') {
      for (const y of rows) for (let x = 1; x <= W - 2; x++) if (x % 3 !== 0) out.push([x, y]);
      return out;
    }
    // 裝飾、遊戲攤：桌椅中間的空格 → 最左邊一欄 → 店門口
    for (const y of rows) for (let x = 3; x <= W - 2; x += 3) out.push([x, y]);
    for (let y = H - 1; y >= 1; y--) out.push([0, y]);
    out.push([0, 0]);
    if (H > 5) for (let x = 2; x <= W - 3; x += 4) out.push([x, H - 1]);
    return out;
  },
  // 找一個擺得下的格子；優先選旁邊有「還沒發現的組合」夥伴的位置，其次是任何組合夥伴
  spot(id) {
    const S = Game.S, G = Game, f = F[id], cat = f.cat === 'fun' ? 'decor' : f.cat;
    const cand = this.slots(cat).filter(([x, y]) => !G.itemAt(x, y));
    if (!cand.length) return null;
    cand.sort((p, q) => this.score(id, q[0], q[1]) - this.score(id, p[0], p[1]));
    for (const [x, y] of cand) if (!G.canPlace(id, x, y, true)) return [x, y];
    return null;
  },
  score(id, x, y) {
    const S = Game.S; let s = 0;
    for (const o of S.items) {
      if (Math.abs(o.x - x) > 1 || Math.abs(o.y - y) > 1) continue;
      const c = COMBOS.find(c => (c.a === id && c.b === o.id) || (c.b === id && c.a === o.id));
      if (c) s += S.combos[c.id] ? 2 : 10;
    }
    return s;
  },
  put(id, free, lv) {
    const p = this.spot(id); if (!p) return false;
    return !Game.place(id, p[0], p[1], free, lv);
  },
  // 全部收起來，照藍圖重新擺（擴建後、開局時）
  relayout() {
    const S = Game.S, G = Game, its = S.items.slice();
    S.items = []; G.rebuild();
    const order = { station: 0, seat: 1, decor: 2, fun: 3 };
    // 攤位：會組合的放在一起
    const stOrder = ['griddle', 'drink', 'fryer', 'steam', 'soup', 'ice', 'grill', 'wok'];
    its.sort((a, b) => (order[F[a.id].cat] - order[F[b.id].cat]) || (stOrder.indexOf(F[a.id].st) - stOrder.indexOf(F[b.id].st)) || (b.lv - a.lv));
    const left = [];
    for (const it of its) if (!this.put(it.id, true, it.lv)) left.push(it);
    // 擺不下的就賣掉
    for (const it of left) { const f = F[it.id]; if (f.price) S.money += Math.floor(f.price * 0.5); }
    S.bot = { W: S.W, H: S.H };
    for (const a of G.srt.values()) { G.releaseStaff(a); a.atStation = false; }
  },

  // ---------- 每週決策 ----------
  stations() { return Game.S.items.filter(i => F[i.id].cat === 'station'); },
  seats() { return Game.S.items.filter(i => F[i.id].cat === 'seat').reduce((a, i) => a + F[i.id].seats, 0); },
  wage() { return Game.S.staff.reduce((a, s) => a + s.sal, 0); },
  // 能用的攤位種類（店舖等級夠、菜單上有這攤的菜）
  wantedSt() {
    const S = Game.S, G = Game, set = new Set();
    for (const k of G.known()) if (G.sellable(k) && S.dishes[k].on) { const f = FAC.find(f => f.st === DISH[k].st); if (f.lv <= S.lv) set.add(DISH[k].st); }
    return [...set];
  },
  // 下一道要研發的菜：模式可以賣、攤位蓋得出來，越好吃越貴越優先
  nextDish(needIng) {
    const S = Game.S, G = Game;
    const ok = k => G.sellable(k) && !S.dishes[k] && !DISH[k].lim && FAC.find(f => f.st === DISH[k].st).lv <= S.lv;
    const get = x => G.canUse(x) || (needIng && ING[x] && ING[x].lv <= S.lv);
    const ks = Object.keys(DISH).filter(k => ok(k) && get(DISH[k].a) && get(DISH[k].b));
    ks.sort((a, b) => DISH[b].q * DISH[b].p - DISH[a].q * DISH[a].p);
    return ks;
  },
  week() {
    const S = Game.S, G = Game;
    if (!S.bot || S.bot.W !== S.W) this.relayout();
    const rent = G.rent(), wage = this.wage();
    const reserve = rent * 2 + wage * 2 + 2000;
    const nx = LEVELS[S.lv + 1];
    // 人氣快到了就開始存擴建的錢：這時只買「會賺錢」的東西
    const saving = nx && S.pop >= nx.pop * 0.85;
    const can = v => S.money - v > reserve + (saving ? nx.cost : 0); // 奢侈品（裝飾、地板、活動、分店）
    const canE = v => S.money - v > reserve;                         // 必要的開銷（攤位、廚師、食材、研發、秘方）
    // 擴建：要留三個月的新租金和薪水
    if (nx && !G.canExpand() && S.money > nx.cost + nx.rent * 3 + wage * 3) { G.expand(); this.relayout(); }
    // 菜單：不能賣的關掉，能賣的打開；價錢抓在建議價附近
    for (const k of G.known()) {
      const o = S.dishes[k]; o.on = G.sellable(k) && (!DISH[k].lim || G.limOn(k));
      const v = G.dishValue(k); o.price = Math.round(v * (S.lv >= 3 ? 1.05 : 1) / 5) * 5;
    }
    // 研發（每週一次）
    {
      const ks = this.nextDish(false);
      if (ks.length && S.idea >= G.ideaCost() && canE(G.moneyCost())) { const d = DISH[ks[0]]; G.research(d.a, d.b); }
    }
    // 進貨：下一批好菜缺的食材
    for (const k of this.nextDish(true).slice(0, 4)) {
      for (const g of [DISH[k].a, DISH[k].b]) if (ING[g] && !S.ings[g] && ING[g].lv <= S.lv && canE(ING[g].buy * 2)) G.buyIng(g);
    }
    // 攤位：每種有菜的攤位至少一台；人手大多拿來顧攤（留外場、攬客），排最長的那種再加一台
    const cap = LEVELS[S.lv].staff, maxSt = Math.min(S.W - 2, Math.max(2, cap - Math.ceil(cap / 6) - (S.lv >= 2 ? 1 : 0)));
    for (const st of this.wantedSt()) {
      if (G.hasStation(st) || this.stations().length >= maxSt) continue;
      const f = FAC.find(f => f.st === st);
      if (canE(f.price)) this.put(f.id);
    }
    if (this.stations().length < maxSt) {
      const rs = [...G.rts.values()].filter(r => F[r.it.id].cat === 'station' && r.queue.length >= 3).sort((a, b) => b.queue.length - a.queue.length);
      if (rs[0] && canE(F[rs[0].it.id].price * 2)) this.put(rs[0].it.id);
    }
    // 座位：大約每個攤位 2.5 個位子
    const ns = this.stations().length;
    if (this.seats() < ns * 2.6 + 2) {
      const seat = S.lv >= 4 && can(12000 * 3) ? 'booth' : S.lv >= 2 ? 'round' : S.lv >= 1 ? 'picnic' : 'stool';
      if (canE(F[seat].price)) this.put(seat);
    }
    // 機能設施：大冰箱、外帶窗口、休息室
    for (const [id, n, lv] of [['fridge', 2, 1], ['tkw', 1, 1], ['lounge', 1, 3]]) if (S.lv >= lv && S.items.filter(i => i.id === id).length < n && canE(F[id].price * 4)) { this.put(id); break; }
    // 員工：廚師 = 攤位數，外場 1/3，有空位再請攬客
    if (S.staff.length < cap && S.hire.length) {
      const cN = S.staff.filter(s => s.job === 'cook').length, sN = S.staff.filter(s => s.job === 'serve').length;
      const job = cN < ns ? 'cook' : sN < Math.max(1, Math.ceil(ns / 3)) ? 'serve' : 'tout';
      const key = { cook: 'cook', serve: 'serv', tout: 'charm' }[job];
      const i = S.hire.reduce((b, s, i) => (s[key] * 2 + s.cook + s.serv + s.charm > S.hire[b][key] * 2 + S.hire[b].cook + S.hire[b].serv + S.hire[b].charm ? i : b), 0);
      if (canE(S.hire[i].sal * 5) && (job !== 'tout' || canE(S.hire[i].sal * 8))) { if (!G.hire(i)) G.setJob(S.staff[S.staff.length - 1], job); }
    }
    // 裝飾：先找「擺下去就能湊出新組合」的，再補還沒擺過的種類（每種最多兩個）
    if (can(3000)) {
      const want = FAC.filter(f => (f.cat === 'decor' || f.cat === 'fun') && f.lv <= S.lv && (!f.unlock || (S.unlock[f.unlock] && !S.items.some(i => i.id === f.id))) && (f.unlock || can(f.price * 3)));
      let best = null, bs = -1;
      for (const f of want) {
        const p = this.spot(f.id); if (!p) continue;
        const n = S.items.filter(i => i.id === f.id).length;
        const sc = this.score(f.id, p[0], p[1]) + (f.unlock ? 20 : 0) + (n ? 0 : 3) - n * 4 + f.ap / Math.max(1, f.price / 1500);
        if (n < 2 || sc >= 10) if (sc > bs) { bs = sc; best = { f, p }; }
      }
      if (best) Game.place(best.f.id, best.p[0], best.p[1], !!best.f.unlock);
    }
    // 地板：有閒錢就把用餐區鋪起來
    if (can(20000) && S.lv >= 1) {
      const fl = S.lv >= 4 ? 'f_marble' : S.lv >= 2 ? 'f_tile' : 'f_wood';
      let n = 0;
      for (let y = 2; y < S.H && n < 12; y++) for (let x = 0; x < S.W && n < 12; x++) if (S.floor[x + ',' + y] !== fl && !G.place(fl, x, y)) n++;
    }
    // 改良、培訓、升級
    for (const k of G.known()) if (G.sellable(k) && S.dishes[k].lv < G.maxDishLv()) { const c = G.upCost(k); if (S.idea > c.idea * 1.5 + G.ideaCost() && canE(c.money * 3)) G.upgradeDish(k); }
    if (can(30000)) { const s = pick(S.staff); G.train(s, { cook: 'cook', serve: 'serv', tout: 'charm' }[s.job]); }
    for (const it of this.stations()) if (it.lv < G.maxStLv() && canE(G.upgradeCost(it) * 3) && Math.random() < 0.3) G.upgrade(it);
    if (!this.noNew) {
      for (const t of TECHS) { const c = G.techCost(t); if (G.tech(t.id) < 5 && S.idea >= c.idea * 1.5 && canE(c.money * 2)) { G.techUp(t.id); break; } }
      let br = false;
      for (const b of BRANCHES) { const c = G.branchCost(b); if (S.lv >= b.lv && (S.br[b.id] || 0) < 5 && can(c * 1.3)) { G.buyBranch(b.id); br = true; break; } }
      if (!br && !S.hostCD) { const e = HOSTEV.filter(e => e.lv <= S.lv && can(G.hostCost(e) * 4)).pop(); if (e && Math.random() < 0.2) G.host(e.id); }
    }
  },
};
