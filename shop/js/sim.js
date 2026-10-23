'use strict';
// 夜市小吃王：經營模擬核心（地圖、客人、員工、經濟、日曆）

const SKINS = ['#f8d8b8', '#f4c8a0', '#e8b088', '#d89a70', '#c08060'];
const HAIRS = ['#2b1b16', '#3a2418', '#5a3a24', '#8a5a2b', '#1a1a2a', '#c8a060', '#e8e0d8', '#a83a2a'];
const SHIRTS = ['#e8473b', '#3a8ad8', '#3fa64a', '#ffd84a', '#ff8ad0', '#8a6ad8', '#ffffff', '#ff9a3a', '#5ad0c8', '#3a3a4a', '#f4e8c8'];
const PANTS = ['#2a3a6a', '#3a3a4a', '#6a4a2a', '#5a6a8a', '#2b1b26', '#8a8a9a'];
function makeLook(seed, kind, job) {
  const h = i => hash(seed, i, 99);
  const pk = (arr, i) => arr[(h(i) * arr.length) | 0];
  const L = {
    skin: pk(SKINS, 1), hair: HAIRS[(h(2) * 6) | 0], hs: pk([0, 0, 1, 2, 3, 5, 6, 7], 3),
    shirt: pk(SHIRTS, 4), pants: pk(PANTS, 5), top: pk(['tee', 'tee', 'stripe', 'hoodie', 'polo', 'jacket'], 6), inner: pk(['#ffffff', '#f4e8c8', '#3a3a4a', '#ffd84a'], 11),
    shoe: pk(['#3a2a2a', '#ffffff', '#c8302a', '#3a3a4a', '#8a5a2b'], 12),
  };
  if (h(13) < 0.18) { L.top = 'dress'; }
  if (kind === 'student') { L.acc = h(7) < .6 ? 'bag' : (h(7) < .8 ? 'phone' : null); L.capc = pk(['#3a6ad8', '#e8473b', '#3fa64a', '#ff8ad0', '#ffd84a'], 10); if (h(8) < .3) L.hat = 'cap'; L.top = pk(['tee', 'hoodie', 'stripe', 'polo'], 14); }
  if (kind === 'worker') { L.top = h(7) < .55 ? 'suit' : 'polo'; L.shirt = L.top === 'suit' ? pk(['#3a3a4a', '#2a3a5a', '#4a4a5a'], 8) : pk(['#ffffff', '#8ab0d8', '#d8e4f0'], 8); L.inner = pk(['#c8302a', '#3a6ad8', '#ffd84a'], 10); L.pants = '#2a2a3a'; L.glasses = h(9) < .3; L.acc = h(15) < .5 ? 'brief' : 'phone'; L.hs = pk([0, 0, 3, 7, 6], 3); }
  if (kind === 'couple') { L.top = pk(['tee', 'dress', 'jacket', 'stripe'], 7); L.shirt = pk(['#ff8ad0', '#ffffff', '#ff9a3a', '#5ad0c8', '#e8473b'], 8); L.acc = h(9) < .4 ? 'phone' : null; }
  if (kind === 'elder') { L.hair = h(7) < .5 ? '#e8e0d8' : '#c8c8d0'; L.hs = pk([4, 2, 0, 7], 8); L.glasses = h(9) < .5; L.top = pk(['polo', 'jacket', 'tee'], 10); L.shirt = pk(['#8a6a5a', '#5a7a5a', '#c8a888', '#7a5a8a', '#e8d8c0'], 14); L.acc = h(15) < .4 ? 'cane' : null; L.pants = pk(['#5a4a3a', '#3a3a4a', '#6a6a7a'], 16); }
  if (kind === 'kid') { L.hat = h(7) < .35 ? 'cap' : (h(7) < .65 ? 'bow' : null); L.capc = SHIRTS[(h(10) * 6) | 0]; L.acc = h(8) < .35 ? 'bag' : null; L.hs = pk([0, 5, 6, 3, 7], 9); L.top = pk(['tee', 'stripe', 'dress', 'hoodie'], 14); L.balloon = h(16) < .3 ? pk(['#ff4a3a', '#ffd84a', '#5ad0ff', '#ff8ad0'], 17) : null; }
  if (kind === 'tourist') { L.hat = h(7) < .5 ? 'straw' : 'cap'; L.capc = '#f4e8c8'; L.shirt = pk(['#ff9a3a', '#5ad0c8', '#ffd84a', '#ff6fa8', '#8ad0ff'], 8); L.top = pk(['tee', 'stripe', 'polo'], 9); L.hair = pick(HAIRS); L.acc = 'camera'; L.inner = '#ffffff'; L.pants = pk(['#e8d8b0', '#5a6a8a', '#ffffff'], 10); }
  if (kind === 'influencer') { L.shirt = '#ff5ad0'; L.hair = '#ffd84a'; L.hs = 1; L.top = 'jacket'; L.inner = '#ffffff'; L.acc = 'phone'; L.glasses = false; }
  if (kind === 'critic') { L.shirt = '#3a3a4a'; L.top = 'suit'; L.inner = '#8a2a4a'; L.glasses = true; L.hair = '#5a5a5a'; L.hs = 0; L.acc = 'book'; }
  if (kind === 'asker') { L.hat = null; }
  if (kind === 'staff') { L.top = 'tee'; L.acc = null; L.balloon = null; L.shoe = '#3a2a2a'; }
  if (kind === 'rider') { L.hat = 'helmet'; L.capc = pk(['#ffffff', '#e8473b', '#ffd84a', '#3a3a4a', '#5ad0ff', '#ff8ad0'], 8); L.acc = null; }
  if (job === 'cook') { L.hat = 'chef'; L.apron = '#ffffff'; L.shirt = '#ffffff'; L.top = 'tee'; }
  if (job === 'serve') { L.apron = '#e8473b'; L.hat = null; L.shirt = pk(['#f4e8c8', '#ffffff', '#3a3a4a'], 18); L.top = 'polo'; }
  if (job === 'tout') { L.hat = 'band'; L.sign = true; L.shirt = '#e8473b'; L.top = 'tee'; }
  L.key = [L.skin, L.hair, L.hs, L.shirt, L.pants, L.top, L.inner, L.acc, L.hat, L.capc, L.apron, L.sign, L.glasses, L.shoe].join('|');
  return L;
}
// 客人外觀數量有上限，避免像素圖快取無限長大
const lookSeed = () => (Math.random() * 160) | 0;

const Game = {
  S: null,
  cust: [], peds: [], rts: new Map(), srt: new Map(), fx: [], floats: [], cars: [],
  occ: null, combos: [], satMap: null, decMap: null, spdMap: new Map(), effTot: { cust: 0, pop: 0 }, appeal: 0,
  dbg: { spawn: 0, cap: 0, price: 0, full: 0, impatient: 0, served: 0, nomenu: 0 },
  spawnAcc: 0, pedAcc: 0, carAcc: 0, notes: [], pending: [], dirtyGrid: true,
  ui: null, // 介面回呼

  // ---------- 開新遊戲 ----------
  fresh(name, opt = {}) {
    const scen = opt.scen || 'std', P = opt.perks || {};
    const S = {
      v: 2, shop: name || '阿福小吃', money: 12000, pop: 5, idea: 12, week: 0, t: 0,
      lv: 0, W: 6, H: 5, items: [], floor: {}, staff: [], dishes: {}, ings: {}, combos: {}, goals: {}, unlock: {},
      st: { cust: 0, sales: 0, ysales: 0, msales: 0, mcost: 0, wsales: 0, wcust: 0, satS: 0, satN: 0, ysat: 0, yn: 0, hist: [], best: 99, wins: 0, research: 0, dsold: {}, ctype: {}, five: 0, storm: 0, hosted: 0 },
      awards: [], ended: false, uid: 1, hire: [], ev: [], hints: {}, log: [], rank: 0, contestY: 0, festNote: 0, seed: (Math.random() * 1e9) | 0,
      scen, gen: opt.gen || 1, tut: { step: opt.noTut ? -1 : 0 }, tech: {}, br: {}, ach: {}, q: null, qdone: 0, qcd: 2, hostCD: 0, fq: null, ptsGiven: 0,
    };
    for (const k in ING) if (!ING[k].buy) S.ings[k] = 1;
    if (scen === 'sweet') {
      S.dishes.eggcake = { lv: 1, price: DISH.eggcake.p, on: true };
      S.dishes.blacktea = { lv: 1, price: DISH.blacktea.p, on: true };
    } else {
      S.dishes.pancake = { lv: 1, price: DISH.pancake.p, on: true };
      S.dishes.blacktea = { lv: 1, price: DISH.blacktea.p, on: true };
    }
    if (scen === 'hard') { S.money = 5000; }
    if (scen === 'sweet') S.ings.milk = 1;
    S.money += (P.money || 0) * 5000; S.pop += (P.fans || 0) * 30; S.idea += (P.idea || 0) * 20;
    // 祖傳秘方：多會幾道簡單的菜
    const easy = ['eggcrepe', 'eggcake', 'milktea', 'teaegg', 'cutlet', 'popcorn'].filter(k => !S.dishes[k] && (scen !== 'sweet' || ['sweet', 'drink'].includes(DISH[k].cat)) && this.canUseIn(S, k));
    for (let i = 0; i < (P.recipe || 0) && i < easy.length; i++) S.dishes[easy[i]] = { lv: 1, price: DISH[easy[i]].p, on: true };
    this.S = S;
    const add = (id, x, y) => S.items.push({ uid: S.uid++, id, x, y, lv: 1, dirty: 0 });
    add(scen === 'sweet' ? 'griddle' : 'griddle', 1, 1); add('drink', 3, 1); add('stool', 1, 3); add('stool', 4, 3); add('lantern', 5, 0);
    const ch = (P.chef || 0) * 3;
    S.staff.push(this.newStaff({ name: '阿福', title: '老闆', cook: 8 + ch, serv: 5 + ch, charm: 5 + ch, job: 'cook', owner: true, trait: 'learner' }));
    S.staff.push(this.newStaff({ name: '阿珠', cook: 5 + ch, serv: 6 + ch, charm: 4 + ch, job: 'cook', trait: 'smile' }));
    this.rollHire();
    this.boot();
  },
  canUseIn(S, k) { const d = DISH[k]; const ok = x => S.ings[x] || S.dishes[x]; return ok(d.a) && ok(d.b); },
  newStaff(o) {
    const S = this.S, seed = (Math.random() * 1e9) | 0;
    const s = Object.assign({ uid: S.uid++, name: '', title: '', lv: 1, exp: 0, cook: 5, serv: 5, charm: 5, job: 'cook', tr: 0, seed, sal: 0, trait: this.rollTrait() }, o);
    s.sal = s.owner ? 0 : this.salaryOf(s);
    return s;
  },
  salaryOf(s) { return Math.round((600 + (s.cook + s.serv + s.charm) * 18 + s.lv * 60) * (s.trait === 'slow' ? 0.8 : 1) / 10) * 10; },
  rollTrait(rare) {
    const ks = Object.keys(TRAITS).filter(k => !TRAITS[k].rare);
    if (rare || Math.random() < 0.06) return pick(['genius', 'star']);
    return Math.random() < 0.82 ? pick(ks) : '';
  },
  tr(s, k) { return s && s.trait === k; },
  tech(k) { return (this.S.tech && this.S.tech[k]) || 0; },
  rollHire() {
    const S = this.S, y = this.year(), n = 3 + (S.lv >= 2 ? 1 : 0);
    S.hire = [];
    for (let i = 0; i < n; i++) {
      const rare = Math.random() < 0.08 + y * 0.01;
      const base = 3 + Math.min(y, 10) * 1.2 + S.lv * 1.5;
      const st = () => Math.max(1, Math.round(base + rnd(-3, 4) + (rare ? rnd(4, 9) : 0)));
      const name = Math.random() < 0.55 ? pick(NAMES1) + pick(NAMES2) : pick(SURN) + pick(NAMES2) + (Math.random() < .3 ? pick(NAMES2) : '');
      const c = { name, cook: st(), serv: st(), charm: st() };
      const best = ['cook', 'serv', 'charm'][irnd(0, 2)]; c[best] += irnd(2, 5);
      c.title = rare ? pick(['料理達人', '服務之星', '夜市老手', '傳說的新人', '天才少年', '歸國廚師']) : '';
      c.job = c.cook >= c.serv && c.cook >= c.charm ? 'cook' : (c.serv >= c.charm ? 'serve' : 'tout');
      if (rare && Math.random() < 0.5) c.trait = this.rollTrait(true);
      const s = this.newStaff(c); S.uid--; delete s.uid;
      S.hire.push(s);
    }
  },
  load(S) { this.S = S; this.migrate(); this.boot(); },
  migrate() {
    const S = this.S;
    S.ev = S.ev || []; S.hints = S.hints || {}; S.log = S.log || []; S.unlock = S.unlock || {};
    for (const it of S.items) if (!F[it.id]) it.dead = true;
    S.items = S.items.filter(i => !i.dead);
    for (const k in S.dishes) if (!DISH[k]) delete S.dishes[k];
    // v1 → v2：新系統的欄位
    if (!S.v || S.v < 2) {
      S.tut = { step: S.week > 0 ? -1 : 0 };
      for (const s of S.staff) if (s.trait === undefined) s.trait = s.owner ? 'learner' : this.rollTrait();
    }
    S.v = 2;
    S.scen = S.scen || 'std'; S.gen = S.gen || 1; S.tut = S.tut || { step: -1 };
    S.tech = S.tech || {}; S.br = S.br || {}; S.ach = S.ach || {}; S.q = S.q || null; S.qdone = S.qdone || 0; S.qcd = S.qcd ?? 2; S.hostCD = S.hostCD || 0; S.fq = S.fq || null; S.ptsGiven = S.ptsGiven || 0;
    const st = S.st; st.dsold = st.dsold || {}; st.ctype = st.ctype || {}; st.five = st.five || 0; st.storm = st.storm || 0; st.hosted = st.hosted || 0;
    for (const s of S.staff) if (s.trait === undefined) s.trait = '';
    for (const s of S.hire || []) if (s.trait === undefined) s.trait = this.rollTrait();
  },
  boot() {
    this.cust = []; this.peds = []; this.rts = new Map(); this.srt = new Map(); this.fx = []; this.floats = []; this.cars = [];
    this.rebuild();
    for (const s of this.S.staff) this.spawnStaff(s);
    this.computeRank();
  },

  // ---------- 日曆 ----------
  year(w = this.S.week) { return Math.floor(w / 48) + 1; },
  month(w = this.S.week) { return Math.floor((w % 48) / 4) + 1; },
  wk(w = this.S.week) { return (w % 4) + 1; },
  yearF() { return (this.S.week + this.S.t / WEEK_LEN) / 48; },
  hour() { return 17 + 6.5 * (this.S.t / WEEK_LEN); },
  season() { const m = this.month(); return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; },

  // ---------- 地圖 ----------
  inPlot(x, y) { return x >= 0 && y >= 0 && x < this.S.W && y < this.S.H; },
  itemAt(x, y) { return this.occ && this.inPlot(x, y) ? this.occ[y * this.S.W + x] : null; },
  walkable(x, y) {
    const S = this.S;
    if (y === S.H) return x >= -5 && x < S.W + 5;
    if (!this.inPlot(x, y)) return false;
    return !this.occ[y * S.W + x];
  },
  rebuild() {
    const S = this.S, W = S.W, H = S.H;
    this.occ = new Array(W * H).fill(null);
    for (const it of S.items) if (this.inPlot(it.x, it.y)) this.occ[it.y * W + it.x] = it;
    // 攤位/座位執行時資料
    const old = this.rts; this.rts = new Map();
    for (const it of S.items) {
      const f = F[it.id];
      if (f.cat !== 'station' && f.cat !== 'seat') continue;
      const rt = old.get(it.uid) || { queue: [], cook: null, prog: 0, seats: [], idle: 0, cleaner: null };
      rt.it = it;
      if (f.cat === 'seat') { if (rt.seats.length !== f.seats) rt.seats = new Array(f.seats).fill(null); }
      const nb = this.neighbors(it.x, it.y);
      rt.nb = nb;
      if (f.cat === 'station') {
        const pref = [[0, 1], [-1, 0], [1, 0], [0, -1]];
        const fr = pref.map(([dx, dy]) => [it.x + dx, it.y + dy]).filter(([x, y]) => this.walkable(x, y));
        rt.front = fr[0] || null;
        const bk = [[0, -1], [1, 0], [-1, 0], [0, 1]].map(([dx, dy]) => [it.x + dx, it.y + dy]).filter(([x, y]) => this.walkable(x, y) && y < S.H);
        rt.back = bk.find(b => !rt.front || b[0] !== rt.front[0] || b[1] !== rt.front[1]) || rt.front;
      }
      this.rts.set(it.uid, rt);
    }
    // 移除不存在的攤位上的客人
    for (const [uid, rt] of old) if (!this.rts.has(uid)) {
      for (const c of rt.queue) this.custLeave(c, -5, '攤位不見了');
      for (const c of rt.seats) if (c) { c.seat = null; }
      if (rt.cook) { const s = this.srt.get(rt.cook); if (s) s.st = null; }
    }
    // 攤位、座位的清單（每一步都要用，先排好）
    this.stList = []; this.seatList = [];
    for (const rt of this.rts.values()) { rt.cat = F[rt.it.id].cat; (rt.cat === 'station' ? this.stList : this.seatList).push(rt); rt.st = F[rt.it.id].st; }
    this.computeQueues();
    this.computeCombos();
    for (const a of this.cust) a.repath = true;
    for (const a of this.srt.values()) a.repath = true;
  },
  // 每個攤位的排隊格子：從攤位前面往外排成一條線，不同攤位的隊伍不會重疊
  computeQueues() {
    const S = this.S, used = new Set(), res = new Set(), K = (x, y) => x + ',' + y;
    const sts = [...this.rts.values()].filter(rt => F[rt.it.id].cat === 'station');
    for (const rt of sts) { if (rt.front) res.add(K(rt.front[0], rt.front[1])); if (rt.back) res.add(K(rt.back[0], rt.back[1])); }
    // 座位旁邊的格子盡量不要排隊
    const soft = new Set();
    for (const rt of this.rts.values()) if (F[rt.it.id].cat === 'seat') for (const n of rt.nb) soft.add(K(n[0], n[1]));
    const ok = (x, y, strict) => {
      if (y > S.H || y < 0) return false;
      if (y === S.H ? (x < -1 || x > S.W) : !this.inPlot(x, y)) return false;
      if (!this.walkable(x, y)) return false;
      const k = K(x, y); if (used.has(k) || res.has(k)) return false;
      if (strict && soft.has(k)) return false;
      return true;
    };
    sts.sort((a, b) => (a.it.y - b.it.y) || (a.it.x - b.it.x));
    for (const rt of sts) {
      rt.qt = []; rt.qs = [];
      if (!rt.front) continue;
      const tiles = [rt.front], dirs = [[rt.front[0] - rt.it.x, rt.front[1] - rt.it.y]];
      used.add(K(rt.front[0], rt.front[1]));
      while (tiles.length < 3) {
        const [cx, cy] = tiles[tiles.length - 1], [dx, dy] = dirs[dirs.length - 1];
        const cand = [[dx, dy], [0, 1], [dy, dx], [-dy, -dx], [1, 0], [-1, 0]];
        let nxt = null;
        for (const strict of [true, false]) { for (const [ex, ey] of cand) if (!(ex === -dx && ey === -dy) && ok(cx + ex, cy + ey, strict)) { nxt = [ex, ey]; break; } if (nxt) break; }
        if (!nxt) break;
        const t = [cx + nxt[0], cy + nxt[1]]; tiles.push(t); dirs.push(nxt); used.add(K(t[0], t[1]));
      }
      rt.qt = tiles;
      for (let i = 0; i < 6; i++) {
        let ti = i >> 1, extra = 0;
        if (ti >= tiles.length) { extra = ti - tiles.length + 1; ti = tiles.length - 1; }
        const [tx, ty] = tiles[ti], [dx, dy] = dirs[ti];
        const cx = tx * TILE + 8, cy = ty * TILE + 10;
        const along = (i & 1 ? 4 : -4) + extra * 2;
        const side = extra ? (i & 1 ? 5 : -5) : 0;
        rt.qs.push([cx + dx * along - dy * side, cy + dy * along * 0.8 + dx * side * 0.6]);
      }
    }
  },
  neighbors(x, y) {
    const out = [];
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) if (this.walkable(x + dx, y + dy)) out.push([x + dx, y + dy]);
    return out;
  },
  // 從人行道出發能不能走到所有空地、每個攤位/座位旁邊
  connected(extra) {
    const S = this.S, W = S.W, H = S.H, OX = 5, GW = W + 10;
    const blocked = (x, y) => (extra && extra.x === x && extra.y === y) || !this.walkable(x, y);
    const seen = new Uint8Array(GW * (H + 1)), q = [];
    for (let x = -5; x < W + 5; x++) { seen[H * GW + x + OX] = 1; q.push([x, H]); }
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (ny < 0 || ny > H || nx < -5 || nx >= W + 5) continue;
        const k = ny * GW + nx + OX;
        if (seen[k] || blocked(nx, ny)) continue;
        seen[k] = 1; q.push([nx, ny]);
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!blocked(x, y) && !seen[y * GW + x + OX]) return false;
    const list = S.items.slice(); if (extra) list.push(extra);
    for (const it of list) {
      const c = F[it.id].cat;
      if (c !== 'station' && c !== 'seat') continue;
      let ok = false;
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const nx = it.x + dx, ny = it.y + dy;
        if (ny < 0 || ny > H || nx < -5 || nx >= W + 5) continue;
        if (!blocked(nx, ny) && seen[ny * GW + nx + OX]) { ok = true; break; }
      }
      if (!ok) return false;
    }
    return true;
  },
  path(sx, sy, tx, ty) {
    const S = this.S, W = S.W, H = S.H, OX = 5, GW = W + 10;
    if (sx === tx && sy === ty) return [];
    const prev = new Int32Array(GW * (H + 1)).fill(-1), k0 = sy * GW + sx + OX;
    if (sy < 0 || sy > H) return null;
    prev[k0] = k0; const q = [k0]; let qi = 0, found = false;
    const tk = ty * GW + tx + OX;
    while (qi < q.length) {
      const k = q[qi++]; if (k === tk) { found = true; break; }
      const x = (k % GW) - OX, y = (k / GW) | 0;
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (ny < 0 || ny > H || nx < -5 || nx >= W + 5) continue;
        const nk = ny * GW + nx + OX;
        if (prev[nk] !== -1) continue;
        if (!(nx === tx && ny === ty) && !this.walkable(nx, ny)) continue;
        prev[nk] = k; q.push(nk);
      }
    }
    if (!found) return null;
    const out = []; let k = tk;
    while (k !== k0) { out.push([(k % GW) - OX, (k / GW) | 0]); k = prev[k]; }
    return out.reverse();
  },

  // ---------- 組合 / 魅力 ----------
  computeCombos() {
    const S = this.S, W = S.W, H = S.H, found = [];
    const its = S.items;
    for (let i = 0; i < its.length; i++) for (let j = i + 1; j < its.length; j++) {
      const a = its[i], b = its[j];
      if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) continue;
      for (const c of COMBOS) if ((c.a === a.id && c.b === b.id) || (c.a === b.id && c.b === a.id)) found.push({ c, a, b });
    }
    this.combos = found;
    this.satMap = new Float32Array(W * H); this.decMap = new Float32Array(W * H); this.spdMap = new Map();
    this.effTot = { cust: 0, pop: 0 };
    const area = (x0, y0, r, arr, v) => { for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) if (this.inPlot(x, y)) arr[y * W + x] += v; };
    let ap = 0;
    for (const it of its) {
      const f = F[it.id]; ap += f.ap;
      if (f.cat === 'decor' || f.cat === 'fun') area(it.x, it.y, 2, this.decMap, f.ap);
    }
    for (const k in S.floor) ap += (F[S.floor[k]]?.ap || 0);
    // 同一種組合疊太多效果會遞減
    const cnt = {};
    for (const { c, a, b } of found) {
      const n = cnt[c.id] = (cnt[c.id] || 0) + 1, m = 1 / Math.sqrt(n);
      const e = c.eff;
      if (e.sat) { area(a.x, a.y, 2, this.satMap, e.sat * m); area(b.x, b.y, 2, this.satMap, e.sat * m); }
      if (e.cust) this.effTot.cust += e.cust * m;
      if (e.pop) this.effTot.pop += e.pop * m;
      if (e.spd) for (const it of [a, b]) if (F[it.id].cat === 'station') this.spdMap.set(it.uid, (this.spdMap.get(it.uid) || 0) + e.spd * m);
      ap += 2;
    }
    this.effTot.cust = Math.min(this.effTot.cust, 60);
    this.appeal = ap;
  },
  checkNewCombos() {
    const S = this.S;
    for (const { c, a, b } of this.combos) if (!S.combos[c.id]) {
      S.combos[c.id] = 1;
      this.say('discover', { title: '發現擺設組合！', big: c.n, text: this.effText(c.eff), icon: 'star', combo: c.id });
      const cx = (a.x + b.x) / 2 * TILE + 8, cy = (a.y + b.y) / 2 * TILE + 4;
      this.sparkle(cx, cy, 24); this.confetti(cx, cy - 6, 40); this.ring(cx, cy, '#ffe070'); this.flash = 1;
    }
  },
  effText(e) {
    const p = [];
    if (e.sat) p.push('附近座位滿意度 +' + e.sat);
    if (e.cust) p.push('來客數 +' + e.cust + '%');
    if (e.pop) p.push('每週人氣 +' + e.pop);
    if (e.spd) p.push('料理速度 +' + e.spd + '%');
    return p.join('，');
  },

  // ---------- 放置 ----------
  canPlace(id, x, y, free) {
    const S = this.S, f = F[id];
    if (!this.inPlot(x, y)) return '超出店面範圍';
    if (f.cat === 'floor') { if ((S.floor[x + ',' + y] || 'f_none') === id) return '已經是這種地板'; if (!free && S.money < f.price) return '錢不夠'; return ''; }
    if (this.occ[y * S.W + x]) return '這格已經有東西了';
    if (f.lv > S.lv) return '店舖等級不夠';
    if (f.unlock && !S.unlock[f.unlock]) return '還沒得到';
    if (f.unlock && S.items.some(i => i.id === id) && !free) return '只有一個';
    if (!free && S.money < f.price) return '錢不夠';
    if (!this.connected({ id, x, y })) return '會把通道擋住';
    return '';
  },
  place(id, x, y, free, lv = 1) {
    const S = this.S, f = F[id];
    const why = this.canPlace(id, x, y, free);
    if (why) return why;
    if (f.cat === 'floor') {
      if (id === 'f_none') delete S.floor[x + ',' + y]; else S.floor[x + ',' + y] = id;
      if (!free) S.money -= f.price;
      this.computeCombos();
      return '';
    }
    if (!free) { S.money -= f.price; S.st.mcost += f.price; }
    S.items.push({ uid: S.uid++, id, x, y, lv, dirty: 0 });
    this.rebuild();
    this.checkNewCombos();
    this.poof(x * TILE + 8, y * TILE + 8);
    if (!free && f.price) this.float(x * TILE + 8, y * TILE, '-' + money(f.price), '#ff8a7a');
    this.checkGoals();
    return '';
  },
  remove(it, sell = true) {
    const S = this.S, f = F[it.id];
    S.items = S.items.filter(i => i !== it);
    if (sell && f.price) { const v = Math.floor(f.price * 0.5 * (1 + (it.lv - 1) * 0.5)); S.money += v; this.float(it.x * TILE + 8, it.y * TILE, '+' + money(v), '#ffe070'); }
    this.rebuild();
  },
  maxStLv() { return 3 + (this.S.lv >= 4 ? 1 : 0) + (this.S.lv >= 5 ? 1 : 0); },
  upgradeCost(it) { return Math.round(F[it.id].price * 1.6 * it.lv * (it.lv >= 3 ? 6 : 1)); },
  upgrade(it) {
    const c = this.upgradeCost(it);
    if (it.lv >= (F[it.id].cat === 'station' ? this.maxStLv() : 3) || this.S.money < c) return false;
    this.S.money -= c; this.S.st.mcost += c; it.lv++;
    this.sparkle(it.x * TILE + 8, it.y * TILE, 14); this.ring(it.x * TILE + 8, it.y * TILE + 10, '#ffe070'); Snd.play('level');
    return true;
  },

  // ---------- 員工 ----------
  spawnStaff(s) {
    const S = this.S;
    const a = { kind: 's', s, x: (S.W / 2) * TILE, y: S.H * TILE + 10, path: [], spd: 34, dir: 0, anim: 0, stam: this.maxStam(s), st: null, task: null, wait: 0, tile: [Math.floor(S.W / 2), S.H], bub: null, bubT: 0, repath: false };
    a.look = makeLook(s.seed, 'staff', s.job);
    this.srt.set(s.uid, a);
  },
  maxStam(s) { return 70 + s.lv * 5 + (s.trait === 'tough' ? 40 : 0) + this.tech('meal') * 10; },
  setJob(s, job) {
    s.job = job; const a = this.srt.get(s.uid);
    if (a) { this.releaseStaff(a); a.look = makeLook(s.seed, 'staff', job); }
  },
  releaseStaff(a) {
    if (a.st) { const rt = this.rts.get(a.st); if (rt && rt.cook === a.s.uid) rt.cook = null; a.st = null; }
    if (a.task && a.task.rt && a.task.rt.cleaner === a.s.uid) a.task.rt.cleaner = null;
    a.task = null; a.path = [];
  },
  hire(i) {
    const S = this.S, c = S.hire[i];
    if (!c) return '沒有這個人';
    if (S.staff.length >= LEVELS[S.lv].staff) return '員工人數已滿（擴建可以請更多人）';
    const fee = c.sal * 2;
    if (S.money < fee) return '錢不夠';
    S.money -= fee; S.st.mcost += fee;
    c.uid = S.uid++;
    S.staff.push(c); S.hire.splice(i, 1);
    this.spawnStaff(c);
    Snd.play('hire');
    this.checkGoals();
    return '';
  },
  fire(s) {
    if (s.owner) return;
    const a = this.srt.get(s.uid); if (a) this.releaseStaff(a);
    this.srt.delete(s.uid);
    this.S.staff = this.S.staff.filter(x => x !== s);
  },
  trainCost(s) { return Math.round((600 + s.tr * 500 + s.lv * 150) / 10) * 10; },
  train(s, stat) {
    const c = this.trainCost(s);
    if (this.S.money < c) return '錢不夠';
    if (s.tr >= 10 + s.lv) return '先累積經驗升級吧';
    this.S.money -= c; this.S.st.mcost += c; s.tr++;
    const g = irnd(2, 4); s[stat] += g;
    if (!s.owner) s.sal = this.salaryOf(s);
    Snd.play('level');
    return '+' + g;
  },
  gainExp(s, n) {
    s.exp += n * (s.trait === 'learner' ? 1.4 : 1) * (1 + this.tech('school') * 0.15);
    const need = this.expNeed(s);
    if (s.exp >= need && s.lv < 99) {
      s.exp -= need; s.lv++;
      const main = { cook: 'cook', serve: 'serv', tout: 'charm' }[s.job];
      s[main] += irnd(1, 3); for (const k of ['cook', 'serv', 'charm']) if (k !== main && Math.random() < .4) s[k]++;
      if (!s.owner) s.sal = this.salaryOf(s);
      const a = this.srt.get(s.uid);
      if (a) { this.float(a.x, a.y - 26, 'LV UP!', '#7affb0', true); this.sparkle(a.x, a.y - 12, 14); this.ring(a.x, a.y - 10, '#7affb0'); this.confetti(a.x, a.y - 18, 16); a.jumpT = 1.1; a.bub = 'say'; a.say = pick(['升級了！', '我變強了！', '耶～！', '交給我吧！']); a.bubT = 1.6; }
      Snd.play('level');
      if (this.ui && this.ui.lvCard && !this.demoMode) this.ui.lvCard(s, main, a);
      this.checkGoals();
    }
  },
  expNeed(s) { return 25 + s.lv * s.lv * 5; },

  // ---------- 菜單 ----------
  known() { return Object.keys(this.S.dishes); },
  nKnown() { let n = 0; for (const k in this.S.dishes) if (DISH[k] && !DISH[k].lim) n++; return n; },
  hasStation(st) { return this.S.items.some(i => F[i.id].st === st); },
  dishQ(id) { const d = DISH[id], o = this.S.dishes[id]; return d.q * (1 + 0.15 * ((o ? o.lv : 1) - 1)); },
  dishValue(id) { const d = DISH[id], o = this.S.dishes[id]; return d.p * (1 + 0.12 * ((o ? o.lv : 1) - 1)); },
  costOf(id) {
    const m = this.ingMul();
    const c = k => ING[k] ? ING[k].c * this.seasonMul(k) * m : (DISH[k] ? c(DISH[k].a) + c(DISH[k].b) : 0);
    return c(id) * 0.9;
  },
  seasonMul(k) {
    const s = ING[k].season; if (!s) return 1;
    return s.includes(this.month()) ? 0.7 : 1.8;
  },
  ingMul() { let m = 1; for (const e of this.S.ev) if (e.ing) m *= e.ing; return m; },
  menu() {
    if (this._menu && this._menuS === this.S) return this._menu;
    const has = {}; for (const i of this.S.items) { const st = F[i.id].st; if (st) has[st] = 1; }
    this._menuS = this.S;
    return (this._menu = this.known().filter(k => this.S.dishes[k].on && has[DISH[k].st] && this.sellable(k) && (!DISH[k].lim || this.limOn(k))));
  },
  budgetMul() { const s = this.S.scen; return s === 'sweet' ? 1.15 : s === 'tour' ? 1.2 : s === 'veg' ? 1.05 : 1; },
  sellable(k) { const s = this.S.scen; return s === 'sweet' ? DISH[k].cat === 'sweet' || DISH[k].cat === 'drink' : s === 'veg' ? isVeg(k) : true; },
  ideaCost() { return Math.min(60, 10 + this.S.st.research * 2); },
  moneyCost() { return Math.min(12000, 200 + this.S.st.research * this.S.st.research * 12 + this.S.st.research * 60); },
  canUse(k) { return !!(this.S.ings[k] || this.S.dishes[k]); },
  research(a, b) {
    const S = this.S;
    if (!a || !b) return { err: '請選兩樣材料' };
    if (a === b) return { err: '要選兩種不同的材料' };
    const hit = DISH_ALL.find(k => (DISH[k].a === a && DISH[k].b === b) || (DISH[k].a === b && DISH[k].b === a));
    if (hit && S.dishes[hit]) return { err: '這個組合已經研發過「' + DISH[hit].n + '」了' };
    const ic = this.ideaCost(), mc = this.moneyCost();
    if (S.idea < ic) return { err: '靈感不夠（需要 ' + ic + '）' };
    if (S.money < mc) return { err: '錢不夠（需要 ' + money(mc) + '）' };
    S.money -= mc; S.st.mcost += mc;
    if (hit) {
      S.idea -= ic; S.st.research++;
      S.dishes[hit] = { lv: 1, price: DISH[hit].p, on: true };
      delete S.hints[hit];
      this.checkGoals();
      return { ok: hit };
    }
    S.idea -= Math.ceil(ic / 2);
    // 失敗時給一點方向
    const cand = DISH_ALL.filter(k => !S.dishes[k] && (DISH[k].a === a || DISH[k].b === a || DISH[k].a === b || DISH[k].b === b));
    let hint = '';
    if (cand.length) {
      const k = pick(cand), d = DISH[k], ok = this.canUse(d.a) && this.canUse(d.b);
      const nm = x => ING[x] ? ING[x].n : DISH[x].n;
      const mine = d.a === a || d.a === b ? d.a : d.b;
      hint = ok ? `「${nm(mine)}」好像可以跟其他手邊的東西搭配看看…` : `「${nm(mine)}」好像要配上還沒進貨的食材…`;
    }
    return { fail: true, hint };
  },
  upCost(id) { const o = this.S.dishes[id]; return { idea: 5 + o.lv * o.lv * 3, money: Math.round(DISH[id].p * o.lv * 25 / 10) * 10 }; },
  upgradeDish(id) {
    const o = this.S.dishes[id], c = this.upCost(id);
    if (o.lv >= 10) return '已經是最高等級';
    if (this.S.idea < c.idea) return '靈感不夠';
    if (this.S.money < c.money) return '錢不夠';
    this.S.idea -= c.idea; this.S.money -= c.money; this.S.st.mcost += c.money;
    const oldV = this.dishValue(id);
    o.lv++;
    o.price = Math.round(o.price * this.dishValue(id) / oldV);
    Snd.play('level');
    return '';
  },
  buyIng(k) {
    const S = this.S, g = ING[k];
    if (S.ings[k]) return '已經有了';
    if (S.scen === 'veg' && MEAT.includes(k)) return '素食小館不用肉和海鮮';
    if (g.lv > S.lv) return '店舖等級不夠';
    if (S.money < g.buy) return '錢不夠';
    S.money -= g.buy; S.st.mcost += g.buy; S.ings[k] = 1;
    Snd.play('cash');
    return '';
  },

  // ---------- 擴建 ----------
  canExpand() {
    const S = this.S, n = LEVELS[S.lv + 1];
    if (!n) return '已經是最大的店了';
    if (S.pop < n.pop) return '人氣要 ' + num(n.pop);
    if (S.money < n.cost) return '需要 ' + money(n.cost);
    return '';
  },
  expand() {
    const S = this.S;
    if (this.canExpand()) return false;
    const n = LEVELS[S.lv + 1], dH = n.H - S.H;
    S.money -= n.cost; S.st.mcost += n.cost; S.lv++;
    S.W = n.W; S.H = n.H;
    for (const it of S.items) it.y += dH;
    const fl = {}; for (const k in S.floor) { const [x, y] = k.split(',').map(Number); fl[x + ',' + (y + dH)] = S.floor[k]; } S.floor = fl;
    for (const a of [...this.cust, ...this.peds, ...this.srt.values()]) { a.y += dH * TILE; if (a.tile) a.tile[1] += dH; a.path = (a.path || []).map(([x, y]) => [x, y + dH]); a.repath = true; }
    for (const c of this.cars) c.y += dH * TILE;
    this.rebuild();
    this.rollHire();
    this.checkGoals();
    Snd.play('fanfare');
    this.confetti(S.W * TILE / 2, S.H * TILE / 2, 70); this.flash = 1;
    this.say('expand', { title: '擴建完成！', big: n.n, text: `店面變成 ${n.W}×${n.H} 格，可以雇用 ${n.staff} 位員工，也解鎖了新的設施和食材。`, icon: 'star' });
    return true;
  },

  // ---------- 客人 ----------
  spawnRate() {
    const S = this.S;
    let tout = 0;
    let star = 0;
    for (const a of this.srt.values()) { if (a.s.job === 'tout' && a.atPost) tout += a.s.charm * (a.stam > 0 ? 1 : 0.5) * (a.s.trait === 'loud' ? 1.5 : 1); if (a.s.trait === 'star') star++; }
    let r = 0.32 + 0.06 * Math.sqrt(S.pop) + this.appeal * 0.004 + tout * 0.012 + star * 0.05;
    r *= 1 + this.tech('ad') * 0.06;
    if (S.scen === 'sweet') r *= 1.15; else if (S.scen === 'veg') r *= 1.1;
    const fest = FESTIVALS[this.month()]; if (fest) r *= fest.mul;
    for (const e of S.ev) if (e.mul) r *= e.mul;
    r *= 1 + this.effTot.cust / 100;
    const ph = S.t / WEEK_LEN;
    r *= 0.75 + 0.5 * Math.sin(Math.PI * ph);
    return r;
  },
  capacity() {
    let n = 3;
    for (const rt of this.rts.values()) n += F[rt.it.id].cat === 'station' ? 5 : rt.seats.length;
    return n;
  },
  pickType() {
    const S = this.S, fest = FESTIVALS[this.month()];
    const sc = S.scen, list = Object.entries(CTYPES).filter(([k, t]) => t.lv <= S.lv || (sc === 'tour' && k === 'tourist'));
    let tot = 0; const ws = list.map(([k, t]) => { let w = t.w; if (k === 'tourist' && fest && fest.tourist) w *= fest.tourist; if (sc === 'tour' && k === 'tourist') w *= 3; if (sc === 'veg' && (k === 'elder' || k === 'worker')) w *= k === 'elder' ? 1.8 : 1.3; tot += w; return w; });
    let r = Math.random() * tot;
    for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i][0]; }
    return 'student';
  },
  spawnCustomer(type) {
    const S = this.S;
    type = type || this.pickType();
    const T = CTYPES[type];
    const left = Math.random() < 0.5, x0 = left ? -3 : S.W + 2;
    const c = {
      kind: 'c', type, look: makeLook(lookSeed(), type), x: x0 * TILE + 8, y: S.H * TILE + 10, tile: [x0, S.H], path: [], ox: 0, oy: 0,
      spd: rnd(34, 42) * (type === 'elder' ? 0.7 : type === 'kid' ? 1.2 : 1), dir: 2, anim: rnd(10), state: 'in', wait: 0, pat: 30 * T.pat * (1 + this.tech('line') * 0.12), greet: false,
      want: null, dish: null, st: null, seat: null, sat: 0, bub: null, bubT: 0, repath: false, vip: T.vip || 0,
    };
    // 想吃什麼
    const prefs = T.pref;
    let wcat = Math.random() < 0.6 ? prefs[0] : pick(prefs);
    if (S.scen === 'sweet' && wcat !== 'sweet' && wcat !== 'drink' && Math.random() < 0.75) wcat = Math.random() < 0.6 ? 'sweet' : 'drink';
    c.want = wcat;
    const menu = this.menu();
    if (!menu.length) return;
    let opts = menu.filter(k => DISH[k].cat === wcat);
    c.match = opts.length > 0;
    if (!opts.length) opts = menu;
    // 加權：好吃、划算、節慶加成
    const fest = FESTIVALS[this.month()];
    const ws = opts.map(k => {
      const o = S.dishes[k], val = this.dishValue(k) * T.b;
      let w = (1 + this.dishQ(k)) * clamp(1.6 - o.price / val * 0.6, 0.1, 1.4);
      const bst = fest && fest.boost && fest.boost[DISH[k].st]; if (bst) w *= bst;
      for (const e of S.ev) if (e.boost && e.boost[DISH[k].st]) w *= e.boost[DISH[k].st];
      if (type === 'tourist' || c.vip) w *= 1 + o.lv * 0.3;
      if (DISH[k].lim) w *= 1.8;
      return w;
    });
    let tot = ws.reduce((a, b) => a + b, 0), r = Math.random() * tot, dish = opts[0];
    for (let i = 0; i < opts.length; i++) { r -= ws[i]; if (r <= 0) { dish = opts[i]; break; } }
    c.dish = dish;
    const price = S.dishes[dish].price, val = this.dishValue(dish) * T.b * this.budgetMul();
    c.price = price;
    c.qty = Math.max(1, Math.floor(T.qty + Math.random()));
    if (price > val * 1.9) { this.dbg.price++; if (this.peds.length < this.pedCap() + 2 && Math.random() < 0.5) { c.state = 'pass'; c.refuse = true; c.x = (left ? -5 : S.W + 4) * TILE + 8; c.passDir = left ? 1 : -1; this.peds.push(c); } return; }
    // 選人最少的攤位
    const want = DISH[dish].st, sts = this.stList.filter(rt => rt.st === want && rt.front);
    if (!sts.length) return;
    sts.sort((a, b) => a.queue.length - b.queue.length);
    const rt = sts[0];
    if (rt.queue.length >= 6) { this.dbg.full++; if (this.peds.length < this.pedCap() + 2 && Math.random() < 0.15) { c.state = 'pass'; c.full = true; c.x = (left ? -5 : S.W + 4) * TILE + 8; c.passDir = left ? 1 : -1; this.peds.push(c); } return; }
    c.st = rt.it.uid; rt.queue.push(c);
    c.state = 'walk';
    const qt = this.queueTile(rt, rt.queue.length - 1);
    c.path = this.path(c.tile[0], c.tile[1], qt[0], qt[1]) || [];
    c.bub = wcat; c.bubT = 1.6;
    this.cust.push(c);
  },
  // 人行道上的路人上限：店越大可以越多，但店裡客人很多時就少放一點，畫面才不會擠成一團
  pedCap() { const S = this.S; return Math.max(3, Math.min(4 + S.lv * 2, Math.round(S.W * 0.9)) - (this.cust.length > 40 ? 3 : this.cust.length > 20 ? 1 : 0)); },
  spawnPed() {
    const S = this.S, left = Math.random() < 0.5, x0 = left ? -5 : S.W + 4;
    const type = this.pickType();
    const c = { kind: 'c', type, look: makeLook(lookSeed(), type), x: x0 * TILE + 8, y: S.H * TILE + 10 + rnd(-2, 3), tile: [x0, S.H], path: [], spd: rnd(22, 32), dir: 2, anim: rnd(10), state: 'pass', passDir: left ? 1 : -1 };
    this.peds.push(c);
  },
  custLeave(c, dsat, why) {
    if (c.state === 'leave' || c.state === 'gone') return;
    const rt = this.rts.get(c.st);
    if (rt) { const i = rt.queue.indexOf(c); if (i >= 0) rt.queue.splice(i, 1); }
    if (c.seat) { const srt = this.rts.get(c.seat.uid); if (srt) srt.seats[c.seat.i] = null; c.seat = null; }
    c.state = 'leave';
    if (dsat !== undefined) {
      this.S.pop = Math.max(0, this.S.pop + dsat * 0.05 * (c.vip ? c.vip : 1));
      c.bub = 'angry'; c.bubT = 2; c.face = 'angry';
      if (why && Math.random() < 0.35) this.review(c, 1, why);
    }
    const S = this.S, ex = c.x < (S.W / 2) * TILE ? -5 : S.W + 4;
    c.path = this.path(c.tile[0], c.tile[1], ex, S.H) || [[ex, S.H]];
  },
  served(c, rt) {
    const S = this.S, d = DISH[c.dish];
    const i = rt.queue.indexOf(c); if (i >= 0) rt.queue.splice(i, 1);
    const pay = c.price * c.qty;
    S.money += pay; S.st.sales += pay; S.st.ysales += pay; S.st.msales += pay; S.st.wsales += pay;
    const cost = this.costOf(c.dish) * c.qty; S.money -= cost; S.st.mcost += cost;
    S.st.cust++; S.st.wcust++;
    S.st.dsold[c.dish] = (S.st.dsold[c.dish] || 0) + c.qty;
    if (DISH[c.dish].lim && !S.ach.season && DISH_LIM.filter(k => S.st.dsold[k]).length >= 5) this.achFlag('season');
    S.st.ctype[c.type] = (S.st.ctype[c.type] || 0) + 1;
    if (S.ev.some(e => e.n === '颱風')) S.st.storm += c.qty;
    const it = rt.it;
    this.coin(it.x * TILE + 8, (it.y + 1) * TILE - 18, pay);
    c.look = this.withDish(c.look, CATCOL[d.cat]);
    Snd.play('coin');
    c.state = 'carry';
    // 找座位
    let best = null, bd = 1e9;
    for (const s of this.seatList) {
      const fi = s.seats.indexOf(null); if (fi < 0) continue;
      if (s.it.dirty >= s.seats.length) continue;
      const dd = Math.abs(s.it.x - c.tile[0]) + Math.abs(s.it.y - c.tile[1]) + (s.it.dirty ? 3 : 0);
      if (dd < bd && s.nb.length) { bd = dd; best = { s, fi }; }
    }
    if (best) {
      best.s.seats[best.fi] = c; c.seat = { uid: best.s.it.uid, i: best.fi };
      const n = best.s.nb[best.fi % best.s.nb.length];
      c.state = 'toSeat'; c.path = this.path(c.tile[0], c.tile[1], n[0], n[1]) || [];
    } else {
      c.takeout = true; this.finishEat(c);
    }
  },
  finishEat(c) {
    const S = this.S, T = CTYPES[c.type], d = DISH[c.dish];
    let sat = 46;
    sat += Math.min(32, this.dishQ(c.dish) * 2.6 * (1 + (c.cookSkill || 0) * 0.012));
    sat += c.match ? 6 : -8;
    const val = this.dishValue(c.dish) * T.b * this.budgetMul(), ratio = c.price / val;
    sat += clamp((1.1 - ratio) * 32, -28, 12);
    sat -= Math.max(0, c.wait - 10) * 1.1;
    if (c.greet) sat += 5;
    sat += this.tech('sauce') * 2.5;
    if (c.takeout) sat -= (c.type === 'elder' ? 9 : 4) - this.tech('pack') * 3;
    else if (c.seat) {
      const it = this.rts.get(c.seat.uid)?.it;
      if (it) {
        const k = it.y * S.W + it.x;
        sat += 5 + Math.min(16, this.decMap[k] * 0.7 * (T.decor || 1)) + Math.min(18, this.satMap[k]);
        sat += F[it.id].ap * 0.8;
        if (c.dirtySeat) sat -= 9;
      }
    }
    sat += Math.min(8, this.appeal / (S.W * S.H) * 2);
    if (c.vip) sat -= 6 + S.lv * 2;
    sat = clamp(sat + rnd(-6, 6), 0, 100);
    c.sat = sat;
    const stars = sat >= 85 ? 5 : sat >= 70 ? 4 : sat >= 50 ? 3 : sat >= 30 ? 2 : 1;
    c.face = stars >= 4 ? 'happy' : stars <= 2 ? 'sad' : '';
    this.emote(c.x, c.y - 22, stars >= 5 ? 'heart2' : stars >= 4 ? 'heart' : stars <= 1 ? 'angry' : stars <= 2 ? 'sweat' : 'note');
    if (stars >= 5) { S.st.five++; if (c.type === 'critic') this.achFlag('critic'); }
    if (c.vip) this.ring(c.x, c.y - 10, stars >= 4 ? '#ffe070' : '#ff6a6a');
    S.st.satS += sat; S.st.satN++; S.st.ysat += sat; S.st.yn++;
    const dp = (sat - 52) / 22 * (c.vip || 1);
    S.pop = Math.max(0, S.pop + dp);
    // 靈感存太多時，新的靈感會比較少（避免後期靈感多到沒意義）
    if (sat >= 68 && (c.vip || Math.random() < 0.6 / (1 + S.idea / 1500))) S.idea += c.vip ? 6 : 1;
    if (c.vip || Math.random() < 0.06) this.review(c, stars);
    if (stars >= 4) Snd.play('happy'); else if (stars <= 2) Snd.play('sad');
    if (c.vip && stars >= 4) this.toast(`${CTYPES[c.type].n}大推！人氣 +${Math.round(dp)}`);
    if (c.vip && stars <= 2) this.toast(`${CTYPES[c.type].n}給了負評…人氣 ${Math.round(dp)}`);
    // 用過的桌子變髒
    if (c.seat) {
      const srt = this.rts.get(c.seat.uid);
      if (srt) {
        srt.seats[c.seat.i] = null;
        const near = this.nearClean(srt.it);
        if (Math.random() < (0.7 - near * 0.2) * (1 - this.tech('clean') * 0.12)) srt.it.dirty = Math.min(srt.seats.length, srt.it.dirty + 1);
      }
      c.seat = null;
    }
    c.state = 'done';
    this.custLeaveQuiet(c);
  },
  // 菜色的反應：依攤位和口味不同
  tasteReact(c) {
    const d = DISH[c.dish]; if (!d) return;
    const T = { griddle: ['酥酥脆脆！', '好香的蛋～'], fryer: ['外酥內嫩！', '卡滋卡滋！'], soup: ['湯頭好濃！', '暖到心裡～'], ice: ['透心涼～', '冰冰涼涼！'], drink: ['好解渴！', 'Q彈好喝！'], steam: ['爆汁了！', '皮好Q！'], grill: ['炭香十足！', '好香啊！'] }[d.st];
    let say = pick(T), emo = 'heart';
    if (d.cat === 'spicy') { say = pick(['好辣！！', '辣得過癮！', '嘶～哈～']); c.spicy = 1; emo = 'sweat'; }
    else if (d.cat === 'sweet') emo = 'heart2';
    else if (d.st === 'ice') emo = 'note';
    if (DISH[c.dish].lim) say = pick(['季節限定的！', '這個月才吃得到！']);
    c.yum = d.cat === 'spicy' ? 'wow' : 'happy';
    if (Math.random() < 0.5 || c.vip || d.lim) { c.bub = 'say'; c.say = say; c.bubT = 1.5; c.react = 1; }
    else this.emote(c.x, c.y - 20, emo);
  },
  nearClean(it) {
    let n = 0;
    for (const o of this.S.items) if (F[o.id].fx === 'clean' && Math.abs(o.x - it.x) <= 2 && Math.abs(o.y - it.y) <= 2) n++;
    return Math.min(n, 2);
  },
  custLeaveQuiet(c) {
    const S = this.S, ex = c.x < (S.W / 2) * TILE ? -5 : S.W + 4;
    c.state = 'leave';
    c.path = this.path(c.tile[0], c.tile[1], ex, S.H) || [[ex, S.H]];
  },
  review(c, stars, why) {
    const d = DISH[c.dish]?.n || '東西';
    const T = CTYPES[c.type].n;
    const good = [`${d}好好吃！還會再來`, `${d}超讚，推推`, `老闆人很好，${d}也很好吃`, `排隊也值得！`, `這家${d}是我心中第一名`, `氣氛很棒，下次帶朋友來`, `${d}香到隔壁都聞得到`];
    const mid = [`${d}還不錯啦`, `普普通通，價錢還可以`, `可以再多一點座位`, { salty: `${d}有一點點太鹹`, spicy: `${d}不夠辣`, sweet: `${d}有點太甜`, drink: `${d}冰塊太多了` }[DISH[c.dish]?.cat] || '還可以'];
    const bad = [`等好久…`, `${d}有點貴`, `桌子好髒`, `沒有我想吃的`, `下次不來了`, `站著吃好累`];
    let txt = why || (stars >= 4 ? pick(good) : stars >= 3 ? pick(mid) : pick(bad));
    if (!why && stars <= 2) { if (c.wait > 14) txt = '等好久…'; else if (c.price > this.dishValue(c.dish) * CTYPES[c.type].b * 1.2) txt = `${d}有點貴`; else if (c.dirtySeat) txt = '桌子好髒'; else if (c.takeout) txt = '沒有位子坐…'; else if (!c.match) txt = '沒有我想吃的' + CAT[c.want]; }
    const S = this.S;
    S.log.unshift({ t: T, s: stars, txt, w: S.week });
    if (S.log.length > 30) S.log.length = 30;
    this.ui && this.ui.review && this.ui.review(S.log[0]);
  },

  // ---------- 每一格時間 ----------
  step(dt) {
    const S = this.S;
    if (this.pending.length) return;
    this._menu = null;
    S.t += dt;
    if (S.t >= WEEK_LEN) { S.t -= WEEK_LEN; this.endWeek(); }
    // 生客人
    if (this.burst) { this.burst.t -= dt; if (this.burst.t <= 0) { this.burst.t = 0.5; this.spawnCustomer(this.burst.type); if (--this.burst.n <= 0) this.burst = null; } }
    const cap = this.capacity();
    this.inside = 0; for (const c of this.cust) if (c.state !== 'leave') this.inside++;
    this.spawnAcc += this.spawnRate() * dt;
    while (this.spawnAcc >= 1) { this.spawnAcc -= 1; this.dbg.spawn++; if (this.inside < cap) { this.spawnCustomer(); this.inside++; } else this.dbg.cap++; }
    this.pedAcc += dt * (0.35 + S.lv * 0.08);
    if (this.pedAcc >= 1) { this.pedAcc = 0; if (this.peds.length < this.pedCap()) this.spawnPed(); }
    this.carAcc += dt;
    if (this.carAcc > 3.5) { this.carAcc = rnd(-3, 0); this.cars.push({ x: Math.random() < .5 ? -6 * TILE : (S.W + 6) * TILE, y: (S.H + 1) * TILE + 6, v: 0, col: pick(['#e8473b', '#3a8ad8', '#ffd84a', '#f4f4f4', '#3fa64a', '#ff8ad0']), rider: makeLook(lookSeed(), 'rider') }); const c = this.cars[this.cars.length - 1]; c.v = c.x < 0 ? rnd(50, 70) : -rnd(50, 70); c.y += c.v > 0 ? 8 : 0; }
    for (const c of this.cars) c.x += c.v * dt;
    this.cars = this.cars.filter(c => c.x > -8 * TILE && c.x < (S.W + 8) * TILE);
    // 攤位
    for (const rt of this.stList) this.stepStation(rt, dt);
    for (const c of this.cust) this.stepCust(c, dt);
    this.cust = this.cust.filter(c => c.state !== 'gone');
    for (const p of this.peds) this.stepPed(p, dt);
    this.peds = this.peds.filter(c => c.state !== 'gone');
    for (const a of this.srt.values()) this.stepStaff(a, dt);
    // 人群互推每兩步算一次就夠了
    if ((this._sepN = (this._sepN || 0) + 1) & 1) this.separate(dt * 2);
    for (const f of this.fx) {
      f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.g || 0) * dt;
      if (f.drag) { const k = Math.max(0, 1 - f.drag * dt); f.vx *= k; f.vy = f.vy * k + 0; }
      if (f.coin && f.y > f.floor && f.vy > 0) { f.y = f.floor; f.vy *= -0.35; f.vx *= 0.6; }
    }
    this.fx = this.fx.filter(f => f.t < f.life);
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter(f => f.t < 1.4);
    // 節慶旗幟每週提醒在 endWeek
  },
  moveAgent(a, dt) {
    if (!a.path || !a.path.length) return true;
    const [tx, ty] = a.path[0];
    const gx = tx * TILE + 8, gy = ty * TILE + 10;
    const dx = gx - a.x, dy = gy - a.y, d = Math.sqrt(dx * dx + dy * dy), sp = a.spd * dt * (a.tired ? 0.7 : 1) * (a.s && a.s.trait === 'slow' ? 0.85 : 1);
    if (Math.abs(dx) > Math.abs(dy)) { a.dir = 2; a.flip = dx < 0; } else a.dir = dy < 0 ? 1 : 0;
    a.anim += dt * 8;
    if (d <= sp) { a.x = gx; a.y = gy; a.tile = [tx, ty]; a.path.shift(); return !a.path.length; }
    a.x += dx / d * sp; a.y += dy / d * sp;
    return false;
  },
  stepStation(rt, dt) {
    const it = rt.it, q = rt.queue;
    rt.cooking = false;
    if (!q.length) { rt.idle += dt; rt.prog = 0; return; }
    rt.idle = 0;
    const head = q.find(c => c.state === 'queue');
    if (!head) return;
    const ca = rt.cook ? this.srt.get(rt.cook) : null;
    if (!ca || !ca.atStation) return;
    const s = ca.s, d = DISH[head.dish];
    let sp = (1 + s.cook * 0.03) * (1 + (it.lv - 1) * 0.3) * (1 + (this.spdMap.get(it.uid) || 0) / 100) * (1 + this.tech('fast') * 0.08);
    if (s.trait === 'quick') sp *= 1.2; else if (s.trait === 'slow') sp *= 0.85;
    if (ca.stam <= 0) sp *= 0.55;
    rt.prog += dt * sp / (d.t * 0.6 * (1 + 0.4 * (head.qty - 1)));
    rt.cooking = true;
    ca.stam -= dt * 2.2;
    if (Math.random() < dt * 4) this.steam(it.x * TILE + 8 + rnd(-5, 5), (it.y + 1) * TILE - 17, F[it.id].st);
    if (rt.prog >= 1) {
      rt.prog = 0;
      head.cookSkill = s.cook * (s.trait === 'genius' ? 1.6 : 1) + (s.trait === 'genius' ? 8 : 0);
      this.gainExp(s, Math.ceil(d.q / 2));
      this.served(head, rt);
    }
  },
  queuePos(rt, i) {
    if (rt.qs && rt.qs.length) return rt.qs[Math.min(i, rt.qs.length - 1)];
    const [fx, fy] = rt.front; return [fx * TILE + 8, fy * TILE + 10];
  },
  queueTile(rt, i) { return rt.qt && rt.qt.length ? rt.qt[Math.min(i >> 1, rt.qt.length - 1)] : rt.front; },
  // 走路的人互相推開一點點（只影響畫面位置），不會疊在一起
  separate(dt) {
    // 數字當格子的 key、重複使用同一個 Map，避免每一步產生大量字串
    const bins = this._bins || (this._bins = new Map()), all = this._all || (this._all = []);
    for (const b of bins.values()) b.length = 0;
    all.length = 0;
    const add = a => { const k = ((a.x / 12) | 0) * 4096 + ((a.y / 10) | 0) + 2048; let b = bins.get(k); if (!b) bins.set(k, b = []); b.push(a); all.push(a); };
    for (const c of this.cust) if (!c.sitting) add(c);
    for (const p of this.peds) add(p);
    for (const a of this.srt.values()) add(a);
    const S = this.S, m = Math.min(1, dt * 5);
    for (const a of all) {
      if (a.ox === undefined) { a.ox = 0; a.oy = 0; }
      if (a.state === 'queue' || a.atStation) { a.ox *= 0.8; a.oy *= 0.8; continue; }
      let px = 0, py = 0;
      const bx = (a.x / 12) | 0, by = (a.y / 10) | 0, ax = a.x + a.ox, ay = a.y + a.oy;
      for (let xx = bx - 1; xx <= bx + 1; xx++) for (let yy = by - 1; yy <= by + 1; yy++) {
        const b = bins.get(xx * 4096 + yy + 2048); if (!b || !b.length) continue;
        for (let i = 0; i < b.length; i++) {
          const o = b[i]; if (o === a) continue;
          const dx = ax - (o.x + (o.ox || 0)), dy = (ay - (o.y + (o.oy || 0))) * 1.4, d2 = dx * dx + dy * dy;
          if (d2 < 81) { const d = Math.sqrt(d2), k = (9 - d) / 9; if (d < 0.01) { px += (a.anim % 2 > 1 ? 1 : -1) * k; } else { px += dx / d * k; py += dy / d * k * 0.5; } }
        }
      }
      const tx = clamp(px * 4, -5, 5), ty = clamp(py * 3, -3, 3);
      a.ox += (tx - a.ox) * m; a.oy += (ty - a.oy) * m;
      // 推到東西上就算了
      const gx = Math.floor((a.x + a.ox) / TILE), gy = Math.floor((a.y + a.oy - 4) / TILE);
      if (gy >= 0 && gy < S.H && gx >= 0 && gx < S.W && this.occ[gy * S.W + gx]) { a.ox *= 0.3; a.oy *= 0.3; }
    }
  },
  stepCust(c, dt) {
    const S = this.S;
    if (c.bubT > 0) { c.bubT -= dt; if (c.bubT <= 0) c.react = 0; }
    if (c.spicy > 0) c.spicy -= dt * 0.5;
    if (c.repath && c.path && c.path.length) {
      c.repath = false;
      const dest = c.path[c.path.length - 1];
      const p = this.path(c.tile[0], c.tile[1], dest[0], dest[1]);
      if (p) c.path = p; else if (c.state !== 'leave') { this.custLeave(c); return; }
    }
    c.repath = false;
    if (c.state === 'walk' || c.state === 'queue') {
      c.wait += dt * (c.state === 'queue' ? 1 : 0.3);
      const pr = c.greet ? 0.6 : 1;
      if (c.state === 'queue') c.pat -= dt * pr;
      if (c.pat <= 0) { this.dbg.impatient++; this.custLeave(c, -4, '等太久了，不吃了'); return; }
    }
    if (c.state === 'walk') {
      if (this.moveAgent(c, dt)) c.state = 'queue';
    } else if (c.state === 'queue') {
      const rt = this.rts.get(c.st);
      if (!rt || !rt.front) { this.custLeave(c); return; }
      const i = rt.queue.indexOf(c);
      const [qx, qy] = this.queuePos(rt, i);
      const dx = qx - c.x, dy = qy - c.y, d = Math.sqrt(dx * dx + dy * dy);
      c._mv = d > 0.5;
      if (d > 0.5) { const sp = Math.min(d, 20 * dt); c.x += dx / d * sp; c.y += dy / d * sp; c.anim += dt * 6; }
      // 面向攤位
      const it = rt.it; c.dir = it.y < rt.front[1] ? 1 : it.y > rt.front[1] ? 0 : 2; c.flip = it.x < rt.front[0];
      if (c.wait > 14 && c.bubT <= 0 && Math.random() < dt * 0.08) { c.bub = 'wait'; c.bubT = 1.5; }
    } else if (c.state === 'toSeat') {
      if (this.moveAgent(c, dt)) {
        const srt = this.rts.get(c.seat?.uid);
        if (!srt) { c.takeout = true; this.finishEat(c); return; }
        c.state = 'eat'; c.eatT = c.eat0 = rnd(4, 6.5); c.sip = DISH[c.dish].cat === 'drink';
        c.dirtySeat = srt.it.dirty > 0;
        const it = srt.it, n = srt.seats.length;
        // 座位的位置
        const sx = it.x * TILE, sy = it.y * TILE;
        const pos = n === 2 ? [[sx + 2, sy + 11], [sx + 14, sy + 11]] : [[sx + 1, sy + 10], [sx + 15, sy + 10], [sx + 8, sy + 3], [sx + 8, sy + 16]];
        const p = pos[c.seat.i % pos.length];
        c.x = p[0]; c.y = p[1]; c.dir = c.seat.i === 2 ? 0 : c.seat.i === 3 ? 1 : 2; c.flip = c.seat.i === 1;
        c.sitting = true;
      }
    } else if (c.state === 'eat') {
      c.eatT -= dt; c.anim += dt * 3;
      // 吃到一半的小反應：辣的會冒火、冰的會發抖、好吃的會「哇」
      if (!c.reacted && c.eatT < c.eat0 * 0.55) { c.reacted = 1; this.tasteReact(c); }
      if (c.eatT <= 0) {
        c.sitting = false;
        const srt = this.rts.get(c.seat?.uid);
        if (srt) { const nb = srt.nb[c.seat.i % srt.nb.length] || srt.nb[0]; if (nb) { c.x = nb[0] * TILE + 8; c.y = nb[1] * TILE + 10; c.tile = [nb[0], nb[1]]; } }
        this.finishEat(c);
      }
    } else if (c.state === 'leave') {
      if (this.moveAgent(c, dt)) c.state = 'gone';
    } else if (c.state === 'carry') { /* 立刻轉換 */ }
  },
  stepPed(p, dt) {
    if (p.bubT > 0) p.bubT -= dt;
    if (p.refuse && !p.bub) { p.bub = 'angry'; p.bubT = 1.6; }
    if (p.full && !p.bub) { p.bub = 'wait'; p.bubT = 1.6; }
    p.dir = 2; p.flip = p.passDir < 0;
    p.x += p.passDir * p.spd * dt; p.anim += dt * 8;
    const S = this.S;
    if (p.x < -6 * TILE || p.x > (S.W + 6) * TILE) p.state = 'gone';
  },
  stepStaff(a, dt) {
    const S = this.S, s = a.s;
    if (a.bubT > 0) a.bubT -= dt;
    if (a.jumpT > 0) a.jumpT -= dt;
    a.tired = a.stam <= 0;
    if (a.repath) {
      a.repath = false;
      if (a.path && a.path.length) { const dest = a.path[a.path.length - 1]; a.path = this.path(a.tile[0], a.tile[1], dest[0], dest[1]) || []; if (!a.path.length) { this.releaseStaff(a); a.atStation = false; a.atPost = false; } }
      if (a.st) { const rt = this.rts.get(a.st); if (!rt || !rt.back) this.releaseStaff(a); else if (a.atStation && (a.tile[0] !== rt.back[0] || a.tile[1] !== rt.back[1])) { a.atStation = false; a.path = this.path(a.tile[0], a.tile[1], rt.back[0], rt.back[1]) || []; } }
    }
    if (a.tired && a.bubT <= 0 && Math.random() < dt * 0.4) { a.bub = 'zzz'; a.bubT = 2; }
    if (a.poseT > 0) { a.poseT -= dt; if (a.poseT <= 0) a.poseK = null; }
    const moving = a.path && a.path.length;
    if (moving) { this.moveAgent(a, dt); }
    if (s.job === 'cook') {
      if (a.st) {
        const rt = this.rts.get(a.st);
        if (!rt) { this.releaseStaff(a); return; }
        if (!moving && rt.back && a.tile[0] === rt.back[0] && a.tile[1] === rt.back[1]) {
          a.atStation = true;
          a.dir = rt.it.y < a.tile[1] ? 1 : rt.it.y > a.tile[1] ? 0 : 2; a.flip = rt.it.x < a.tile[0];
          if (rt.cooking) a.anim += dt * 4;
        } else if (!moving) { a.path = this.path(a.tile[0], a.tile[1], rt.back[0], rt.back[1]) || []; if (!a.path.length && !(a.tile[0] === rt.back[0] && a.tile[1] === rt.back[1])) this.releaseStaff(a); }
        // 這攤沒人了，別攤在排隊又沒廚師 → 換過去
        if (rt.idle > 4 || rt.queue.length <= 1) {
          const need = rt.idle > 4 ? 1 : 3;
          const other = this.stList.find(o => !o.cook && o.back && o.queue.length >= need && o.queue.filter(c => c.state === 'queue').length >= need);
          if (other && !rt.cooking) { this.releaseStaff(a); a.atStation = false; }
        }
      } else {
        a.atStation = false;
        const free = this.stList.filter(o => !o.cook && o.back);
        if (free.length) {
          free.sort((p, q) => (q.queue.length - p.queue.length) || (Math.abs(p.it.x - a.tile[0]) + Math.abs(p.it.y - a.tile[1]) - Math.abs(q.it.x - a.tile[0]) - Math.abs(q.it.y - a.tile[1])));
          const rt = free[0];
          const p = this.path(a.tile[0], a.tile[1], rt.back[0], rt.back[1]);
          if (p) { rt.cook = s.uid; a.st = rt.it.uid; a.path = p; }
        } else if (!moving) this.wander(a, dt);
      }
    } else if (s.job === 'serve') {
      if (a.task) {
        const t = a.task;
        if (!moving) {
          if (t.k === 'clean') {
            if (!this.rts.has(t.rt.it.uid)) { a.task = null; return; }
            t.time -= dt * (1 + s.serv * 0.05) * (a.tired ? 0.6 : 1) * (s.trait === 'neat' ? 1.7 : 1); a.anim += dt * 6; a.poseK = 'wipe'; a.poseT = 0.2;
            if (Math.random() < dt * 6) this.fx.push({ x: t.rt.it.x * TILE + 8 + rnd(-5, 5), y: t.rt.it.y * TILE + 6, vx: rnd(-8, 8), vy: -rnd(8, 18), t: 0, life: 0.5, col: '#dff4ff', s: 1 });
            if (t.time <= 0) { t.rt.it.dirty = 0; t.rt.cleaner = null; a.task = null; this.gainExp(s, 2); a.stam -= 3; Snd.play('clean'); a.poseK = 'carry'; a.poseT = 3.5; a.look = this.withDish(a.look, '#f8f8f8'); this.sparkle(t.rt.it.x * TILE + 8, t.rt.it.y * TILE + 6, 5); }
          } else if (t.k === 'greet') {
            if (t.c.state === 'queue' || t.c.state === 'walk') { t.c.greet = true; t.c.pat += s.trait === 'smile' ? 12 : 6; a.bub = 'say'; a.say = pick(['歡迎光臨！', '馬上好喔～', '請稍等一下！', '謝謝等候！']); a.bubT = 1.4; a.poseT = 1.2; a.poseK = 'call'; this.emote(t.c.x, t.c.y - 22, 'note'); this.gainExp(s, 1); a.stam -= 1; }
            a.task = null;
          }
        }
      } else if (!moving) {
        // 找髒桌子
        let best = null, bd = 1e9;
        for (const rt of this.rts.values()) {
          if (F[rt.it.id].cat !== 'seat' || !rt.it.dirty || rt.cleaner || !rt.nb.length) continue;
          const d = Math.abs(rt.it.x - a.tile[0]) + Math.abs(rt.it.y - a.tile[1]);
          if (d < bd) { bd = d; best = rt; }
        }
        if (best) {
          const n = best.nb[0], p = this.path(a.tile[0], a.tile[1], n[0], n[1]);
          if (p) { best.cleaner = s.uid; a.task = { k: 'clean', rt: best, time: 2.2 }; a.path = p; return; }
        }
        // 招呼排隊的客人
        const c = this.cust.find(c => c.state === 'queue' && !c.greet && !c.greeting);
        if (c) {
          const t = c.tile, p = this.path(a.tile[0], a.tile[1], t[0], Math.min(t[1], S.H));
          if (p) { c.greeting = true; a.task = { k: 'greet', c }; a.path = p; return; }
        }
        this.wander(a, dt);
      }
    } else if (s.job === 'tout') {
      if (!a.post || a.post[1] !== S.H || a.post[0] >= S.W) a.post = [irnd(0, S.W - 1), S.H];
      if (!moving && (a.tile[0] !== a.post[0] || a.tile[1] !== a.post[1])) { a.path = this.path(a.tile[0], a.tile[1], a.post[0], a.post[1]) || []; a.atPost = false; }
      else if (!moving) {
        a.atPost = true; a.dir = 0; a.anim += dt * 2;
        a.shout = (a.shout || 0) - dt;
        if (a.shout <= 0) { a.shout = rnd(3, 6); a.bub = 'say'; a.say = pick(['好吃喔～', '來喔來喔！', '現做的喔！', '買一送一！', '人氣第一！', '快來吃！']); a.bubT = 1.8; this.gainExp(s, 1); a.stam -= 2; }
      }
    }
  },
  wander(a, dt) {
    a.wt = (a.wt || 0) - dt;
    if (a.wt > 0) return;
    a.wt = rnd(2, 5);
    const S = this.S;
    for (let k = 0; k < 8; k++) {
      const x = irnd(0, S.W - 1), y = irnd(0, S.H - 1);
      if (this.walkable(x, y)) { a.path = this.path(a.tile[0], a.tile[1], x, y) || []; break; }
    }
  },

  // ---------- 週 / 月 / 年 ----------
  endWeek() {
    const S = this.S, st = S.st;
    // 每週人氣
    S.pop = Math.max(0, S.pop * 0.99 + this.effTot.pop);
    // 遊戲攤、招財貓收入
    let inc = 0;
    for (const it of S.items) { const f = F[it.id]; if (f.inc) inc += f.inc * (1 + st.wcust / 30); if (f.fx === 'money') inc += 200 + S.pop * 0.25; }
    const bi = this.branchInc(); inc += bi.inc; S.pop += bi.pop;
    for (const s of S.staff) if (s.trait === 'star') S.pop += 2;
    if (inc) { inc = Math.round(inc); S.money += inc; st.msales += inc; st.ysales += inc; st.sales += inc; }
    if (S.hostCD > 0) S.hostCD--;
    for (const a of this.srt.values()) a.stam = this.maxStam(a.s);
    S.ev = S.ev.filter(e => --e.w > 0);
    // 最近四週的成績（對手挑戰書用來定目標）
    st.wk = st.wk || []; st.wk.push({ c: st.wcust, s: Math.round(st.wsales) }); if (st.wk.length > 4) st.wk.shift();
    st.wsales = 0; st.wcust = 0;
    if (S.rhit) for (const k in S.rhit) { S.rhit[k] = Math.min(1, S.rhit[k] + 0.01); if (S.rhit[k] >= 1) delete S.rhit[k]; }
    this.duelWeek();
    const wasMonthEnd = this.wk() === 4;
    S.week++;
    this.computeRank();
    if (wasMonthEnd) this.endMonth();
    if (this.wk() === 1 && this.month() === 1 && S.week > 0) { /* 新年 */ }
    // 小吃大賽：10 月第 2 週
    if (this.month() === 10 && this.wk() === 2 && S.contestY !== this.year() && this.menuAll().length) { S.contestY = this.year(); this.pending.push({ k: 'contest' }); }
    else if (Math.random() < 0.16 && S.week > 3) this.rollEvent();
    else if (!S.duel && S.lv >= 1 && S.week > 16 && S.week >= (S.duelCD || 0) && !(S.tut && S.tut.step >= 0) && Math.random() < 0.1) this.offerDuel();
    this.weekQuest();
    this.checkGoals();
    this.checkScenario();
    this.ui && this.ui.week && this.ui.week();
  },
  menuAll() { return this.known(); },
  // 端著／吃著的菜換顏色：外觀的 key 也要跟著變，圖才不會用錯
  withDish(L, col) { const base = L.key.split('~')[0]; return Object.assign({}, L, { dishc: col, key: base + '~' + col, _spr: null, _sk: null }); },
  limOn(k) { const d = DISH[k]; return !!(d && d.lim && d.lim.includes(this.month())); },
  endMonth() {
    const S = this.S, st = S.st;
    const sal = S.staff.reduce((a, s) => a + s.sal, 0), rent = this.rent();
    S.money -= sal + rent;
    const profit = st.msales - st.mcost - sal - rent;
    st.hist.push({ s: Math.round(st.msales), p: Math.round(profit), sal, rent, c: Math.round(st.mcost) });
    if (st.hist.length > 24) st.hist.shift();
    this.toast(`月結：營業額 ${money(st.msales)}，薪水 ${money(sal)}，租金 ${money(rent)}`);
    st.msales = 0; st.mcost = 0;
    this.rollHire();
    if (this.month() === 1) this.endYear();
    this.seasonCheck();
    const f = FESTIVALS[this.month()];
    if (f) this.toast(`${this.month()} 月：${f.n}！${f.mul > 1.15 ? '人潮變多了' : ''}`, 'fest');
    this.festQuest();
    if (S.money < 0) this.toast('現金是負的！快想辦法賺錢，或賣掉一些東西', 'bad');
    this.ui && this.ui.autosave && this.ui.autosave();
  },
  endYear() {
    const S = this.S, y = this.year() - 1;
    const rank = S.rank;
    let a;
    if (rank === 1) a = { t: '年度夜市之王', m: 300000 + y * 50000, p: 500, u: 'tG', medal: 'G' };
    else if (rank <= 3) a = { t: '年度人氣大賞・銀賞', m: 80000 + y * 15000, p: 200, u: 'tS', medal: 'S' };
    else if (rank <= 10) a = { t: '年度優秀店家・銅賞', m: 25000 + y * 5000, p: 80, medal: 'B' };
    else if (rank <= 20) a = { t: '年度新星獎', m: 8000 + y * 2000, p: 30 };
    else a = { t: '年度努力獎', m: 2000, p: 10 };
    const sat = S.st.yn ? Math.round(S.st.ysat / S.st.yn) : 0;
    S.awards.push({ y, rank, t: a.t, sales: S.st.ysales, sat });
    this.pending.push({ k: 'award', y, rank, a, sales: S.st.ysales, sat });
    S.st.ysales = 0; S.st.ysat = 0; S.st.yn = 0;
    // 年度故事：阿德伯的一段話＋今年的目標
    const prev = S.yg, done = prev && this.ygDone(prev);
    if (done) { this.giveReward(prev.r); S.ygN = (S.ygN || 0) + 1; if (S.ygN >= 5) this.achFlag('story'); }
    S.yg = this.makeYearGoal();
    if (!this.demoMode) this.pending.push({ k: 'story', y: y + 1, prev, done, g: S.yg });
  },
  // ---------- 年度目標 ----------
  makeYearGoal() {
    const S = this.S, y = this.year(), lv = S.lv, opts = [];
    const wk = S.st.wk || [], lastC = S.st.yc0 !== undefined ? S.st.cust - S.st.yc0 : wk.length ? wk.reduce((a, w) => a + w.c, 0) / wk.length * 48 : 0;
    S.st.yc0 = S.st.cust;
    opts.push({ k: 'cust', n: Math.max(300, Math.round(lastC * 1.15 / 50) * 50), t: '今年招待 {n} 位客人' });
    if (S.rank > 1) opts.push({ k: 'rank', n: Math.max(1, S.rank - (S.rank > 10 ? 4 : 2)), t: '年底排行榜第 {n} 名以內' });
    const left = DISH_ALL.filter(k => !S.dishes[k] && this.sellable(k)).length;
    if (left >= 3) opts.push({ k: 'dish', n: Math.min(left, 3 + (y % 3)), base: this.nKnown(), t: '今年研發 {n} 道新菜' });
    const cl = COMBOS.length - Object.keys(S.combos).length;
    if (cl >= 2) opts.push({ k: 'combo', n: 2, base: Object.keys(S.combos).length, t: '今年發現 {n} 個新的擺設組合' });
    opts.push({ k: 'contest', n: 3, t: '今年的小吃大賽拿到前 {n} 名' });
    if (LEVELS[lv + 1] && S.pop > LEVELS[lv + 1].pop * 0.5) opts.push({ k: 'lv', n: lv + 1, t: '今年擴建成「' + LEVELS[lv + 1].n + '」' });
    const g = opts[(S.seed + y * 7) % opts.length];
    g.title = g.t.replace('{n}', num(g.n)); g.y = y;
    const m = Math.round((3000 + lv * lv * 6000 + y * 2500) / 100) * 100;
    g.r = { money: m, pop: 15 + lv * 12, idea: 10 + lv * 5 };
    return g;
  },
  ygProg(g) {
    const S = this.S;
    switch (g.k) {
      case 'cust': return [S.st.cust - (S.st.yc0 || 0), g.n];
      case 'rank': return [S.rank <= g.n ? 1 : 0, 1];
      case 'dish': return [this.nKnown() - g.base, g.n];
      case 'combo': return [Object.keys(S.combos).length - g.base, g.n];
      case 'contest': return [S.st.cy === g.y && S.st.cplace <= g.n ? 1 : 0, 1];
      case 'lv': return [S.lv >= g.n ? 1 : 0, 1];
    }
    return [0, 1];
  },
  ygDone(g) { const p = this.ygProg(g); return p[0] >= p[1]; },
  // ---------- 對手的挑戰書 ----------
  offerDuel() {
    const S = this.S, L = this.ladder(), mi = L.findIndex(r => r.me);
    const tgt = L[mi > 0 ? mi - 1 : mi + 1]; if (!tgt) return;
    const i = RIVALS.findIndex(r => r[0] === tgt.n); if (i < 0) return;
    const wk = S.st.wk || [], avgC = wk.length ? wk.reduce((a, w) => a + w.c, 0) / wk.length : 20, avgS = wk.length ? wk.reduce((a, w) => a + w.s, 0) / wk.length : 2000;
    const kind = pick(['cust', 'sales', 'cat']);
    const d = { i, n: tgt.n, k: kind, w: 2 };
    if (kind === 'cust') { d.goal = Math.max(20, Math.round(avgC * 2 * 1.12 / 5) * 5); d.base = S.st.cust; d.title = `兩週內招待 ${num(d.goal)} 位客人`; }
    else if (kind === 'sales') { d.goal = Math.max(2000, Math.round(avgS * 2 * 1.12 / 100) * 100); d.base = S.st.sales; d.title = `兩週內營業額 ${money(d.goal)}`; }
    else {
      const cats = Object.keys(CAT).filter(c => this.menu().some(m => DISH[m].cat === c)); if (!cats.length) return;
      d.cat = pick(cats); const share = Math.max(0.15, this.menu().filter(m => DISH[m].cat === d.cat).length / Math.max(1, this.menu().length));
      d.goal = Math.max(10, Math.round(avgC * 2 * share * 1.2 / 5) * 5); d.base = this.catSold(d.cat); d.title = `兩週內賣出 ${num(d.goal)} 份${CAT[d.cat]}菜`;
    }
    d.bet = clamp(Math.round(S.money * 0.08 / 1000) * 1000, 2000, 500000);
    d.pop = Math.round(10 + S.pop * 0.025);
    this.pending.push({ k: 'duel', d });
  },
  acceptDuel(d) {
    const S = this.S;
    if (S.money < d.bet) return '錢不夠下注';
    S.money -= d.bet; S.duel = d; d.acc = 1;
    if (d.k === 'cust') d.base = S.st.cust; else if (d.k === 'sales') d.base = S.st.sales; else d.base = this.catSold(d.cat);
    return '';
  },
  declineDuel(d) { const S = this.S, p = Math.round(S.pop * 0.01); S.pop -= p; S.duelCD = S.week + 8; this.toast(`拒絕了${d.n}的挑戰…街坊有點議論，人氣 -${p}`, 'bad'); },
  duelProg(d) { const S = this.S; return [d.k === 'cust' ? S.st.cust - d.base : d.k === 'sales' ? Math.round(S.st.sales - d.base) : this.catSold(d.cat) - d.base, d.goal]; },
  duelWeek() {
    const S = this.S, d = S.duel; if (!d) return;
    if (--d.w > 0) return;
    const p = this.duelProg(d), win = p[0] >= p[1];
    S.duel = null; S.duelCD = S.week + irnd(14, 22);
    if (win) {
      S.money += d.bet * 2; S.pop += d.pop; S.rhit = S.rhit || {}; S.rhit[d.i] = 0.85; S.st.duelW = (S.st.duelW || 0) + 1;
      if (S.st.duelW >= 3) this.achFlag('duel3');
      Snd.play('fanfare'); this.confetti(S.W * TILE / 2, S.H * TILE * 0.4, 50); this.flash = 0.6;
    } else { S.pop = Math.max(0, S.pop - Math.round(d.pop * 0.7)); Snd.play('fail'); }
    this.computeRank();
    this.pending.push({ k: 'duelEnd', d, win, p });
  },
  // ---------- 季節限定菜色 ----------
  seasonCheck() {
    const S = this.S; if (this.demoMode || S.week < 2) return;
    const got = [];
    for (const k of DISH_LIM) {
      const d = DISH[k];
      if (!this.limOn(k) || S.dishes[k] || S.lv < d.lv || !this.sellable(k)) continue;
      S.dishes[k] = { lv: 1, price: d.p, on: true }; got.push(k);
    }
    if (got.length) this.say('season', { title: '季節限定菜單上架！', big: got.map(k => DISH[k].n).join('、'), text: `只有這個月才賣，客人會特別想吃！${got.some(k => !this.hasStation(DISH[k].st)) ? '<br>（要有「' + got.filter(k => !this.hasStation(DISH[k].st)).map(k => FAC.find(f => f.st === DISH[k].st).n).join('、') + '」才能賣）' : ''}`, icon: 'star', dishes: got });
  },
  applyAward(p) {
    const S = this.S, a = p.a;
    S.money += a.m; S.pop += a.p;
    if (a.u && !S.unlock[a.u]) { S.unlock[a.u] = 1; p.newU = F[a.u].n; }
    if (!S.ended && (p.rank === 1 || p.y >= 10)) { S.ended = true; this.pending.push({ k: 'ending', y: p.y, rank: p.rank }); if (!S.ptsGiven) { S.ptsGiven = 1; Legacy.add(5); Legacy.d.clear = 1; Legacy.save(); } }
    else if (S.ended) { const pt = p.rank === 1 ? 2 : p.rank <= 3 ? 1 : 0; if (pt) { Legacy.add(pt); p.legacy = pt; } }
  },
  rivalScore(i, yf = this.yearF()) {
    const b = RIVALS[i][1], sc = this.S.scen, g = sc === 'hard' ? 0.7 : sc === 'rush' ? 0.62 : sc === 'tour' ? 0.66 : 0.55, m = sc === 'rush' ? 1.12 : sc === 'tour' ? 1.1 : 1;
    const hit = this.S.rhit && this.S.rhit[i] ? this.S.rhit[i] : 1;
    return b * m * hit * (1 + g * yf) * (1 + hash(i, 3, this.S.seed) * 0.15 * Math.sin(yf * 3 + i));
  },
  computeRank() {
    const S = this.S, me = S.pop;
    let r = 1;
    for (let i = 0; i < RIVALS.length; i++) if (this.rivalScore(i) > me) r++;
    S.rank = r;
    if (r < S.st.best) {
      if (S.st.best !== 99 && S.week > 0) this.toast(`排行榜升到第 ${r} 名！`, 'good');
      S.st.best = r;
    }
  },
  ladder() {
    const S = this.S, out = RIVALS.map((r, i) => ({ n: r[0], s: this.rivalScore(i) }));
    out.push({ n: S.shop, s: S.pop, me: true });
    out.sort((a, b) => b.s - a.s);
    return out;
  },
  // ---------- 小吃大賽 ----------
  contestScore(id) {
    const best = Math.max(...this.S.staff.map(s => s.cook));
    return this.dishQ(id) * 10 * (1 + best * 0.02);
  },
  runContest(id) {
    const S = this.S, y = this.year();
    const me = this.contestScore(id) * rnd(0.88, 1.12);
    const base = 40 + y * 16 + y * y * 1.2;
    const near = shuffle(RIVALS.map((r, i) => i).filter(i => Math.abs(i - (RIVALS.length - S.rank)) < 8)).slice(0, 4);
    while (near.length < 4) near.push(irnd(0, RIVALS.length - 1));
    const rows = near.map(i => ({ n: RIVALS[i][0], dish: DISH[pick(Object.keys(DISH))].n, s: base * rnd(0.75, 1.2) * (0.9 + i / RIVALS.length * 0.3) }));
    rows.push({ n: S.shop, dish: DISH[id].n, s: me, me: true });
    rows.sort((a, b) => b.s - a.s);
    const place = rows.findIndex(r => r.me) + 1;
    const prize = [0, 15000 + y * 6000, 6000 + y * 2500, 2500 + y * 1000][place] || 500;
    const pop = [0, 60 + y * 25, 25 + y * 10, 10 + y * 4][place] || 3;
    S.money += prize; S.pop += pop;
    let unlock = '';
    S.st.cplace = place; S.st.cy = y;
    if (place === 1) { S.st.wins++; if (!S.unlock.tB) { S.unlock.tB = 1; unlock = F.tB.n; } }
    this.checkGoals();
    return { rows, place, prize, pop, unlock };
  },
  // ---------- 隨機事件 ----------
  rollEvent() {
    const S = this.S, m = this.month();
    const list = [
      ['tv', 3], ['rain', 3], ['sale', 2], ['pricey', 1.5], ['inspect', 2], ['idea', 2], ['busk', 2], ['rival', 1.2],
      ...(m >= 7 && m <= 9 ? [['typhoon', 3]] : []), ...(m === 12 || m <= 2 ? [['cold', 3]] : []), ...(m >= 6 && m <= 8 ? [['heat', 3]] : []),
      ...(S.lv >= 1 ? [['tour', 2], ['elder', 2]] : []), ...(S.lv >= 2 ? [['influencer', 1.5]] : []),
    ];
    let tot = list.reduce((a, b) => a + b[1], 0), r = Math.random() * tot, k = list[0][0];
    for (const [id, w] of list) { r -= w; if (r <= 0) { k = id; break; } }
    const E = (t, txt, e) => { if (e) S.ev.push(e); this.say('event', { title: t, text: txt, icon: 'cal' }); };
    switch (k) {
      case 'tv': { const p = Math.round(15 + S.pop * 0.05); S.pop += p; E('美食節目來採訪！', `電視播出後大家都知道這家店了。人氣 +${p}`); break; }
      case 'rain': E('午後雷陣雨', '這週下大雨，客人變少了…', { w: 1, mul: 0.6, n: '下雨' }); break;
      case 'typhoon': E('颱風來襲！', '颱風天大家都待在家，這週幾乎沒有客人。', { w: 1, mul: 0.2, n: '颱風' }); break;
      case 'cold': E('寒流來了', '好冷！熱呼呼的湯品特別好賣。', { w: 2, boost: { soup: 2, steam: 1.5 }, n: '寒流' }); break;
      case 'heat': E('熱浪來襲', '熱到不行，冰品和飲料大賣！', { w: 2, boost: { ice: 2, drink: 1.6 }, mul: 1.1, n: '熱浪' }); break;
      case 'sale': E('食材大特價', '批發市場大特價，兩週內食材成本減半！', { w: 2, ing: 0.5, n: '食材特價' }); break;
      case 'pricey': E('菜價上漲', '天氣不好，兩週內食材成本變貴了。', { w: 2, ing: 1.5, n: '菜價上漲' }); break;
      case 'idea': { const n = 10 + S.lv * 6; S.idea += n; E('靈光一閃！', `老闆半夜做夢夢到新菜色。靈感 +${n}`); break; }
      case 'busk': E('街頭藝人表演', '門口有人在表演，吸引了很多人潮！', { w: 1, mul: 1.35, n: '街頭表演' }); break;
      case 'rival': E('對面開了新店', '對手削價競爭，兩週內客人少了一點。', { w: 2, mul: 0.85, n: '削價競爭' }); break;
      case 'tour': { E('觀光團來了！', '一整團觀光客湧進夜市！'); this.burst = { type: 'tourist', n: 6 + S.lv * 2, t: 0 }; break; }
      case 'influencer': { E('網紅來訪', '有名的美食網紅正在附近逛，好好招待吧！'); this.spawnCustomer('influencer'); break; }
      case 'inspect': {
        const dirty = S.items.filter(i => i.dirty).length, clean = S.items.filter(i => F[i.id].fx === 'clean').length;
        if (dirty <= 1 && clean > 0) { S.pop += 20; E('衛生稽查：優良！', '環境乾淨整潔，拿到衛生優良標章。人氣 +20'); }
        else if (dirty <= 2) E('衛生稽查：合格', '還算乾淨。多放垃圾桶、洗手台，請外場員工清桌子會更好。');
        else { const p = Math.round(S.pop * 0.05); S.pop -= p; E('衛生稽查：要改善', `髒桌子太多了！人氣 -${p}。請外場員工清潔。`); }
        break;
      }
      case 'elder': {
        const cand = DISH_ALL.filter(k => !S.dishes[k] && !S.hints[k] && this.canUse(DISH[k].a) && this.canUse(DISH[k].b));
        if (cand.length) {
          const d = pick(cand); S.hints[d] = 1;
          const nm = x => ING[x] ? ING[x].n : DISH[x].n;
          E('神秘的老饕', `一位老先生吃完說：「把${nm(DISH[d].a)}跟${nm(DISH[d].b)}放在一起試試看。」（研發頁面會記下來）`);
        } else { S.idea += 10; E('神秘的老饕', '老先生吃得很開心，留下一句：「年輕人，繼續加油。」靈感 +10'); }
        break;
      }
    }
  },
  // ---------- 經營擴張：租金、分店、活動、秘方 ----------
  rent() { const s = this.S.scen; return LEVELS[this.S.lv].rent * (s === 'hard' ? 2 : s === 'tour' ? 1.5 : 1); },
  branchInc() {
    let inc = 0, pop = 0;
    const m = 0.8 + Math.min(0.6, this.S.pop / 30000);
    for (const b of BRANCHES) { const lv = this.S.br[b.id] || 0; if (lv) { inc += b.inc * lv * m; pop += b.pop * lv; } }
    return { inc, pop };
  },
  branchCost(b) { const lv = this.S.br[b.id] || 0; return lv ? Math.round(b.cost * 0.7 * lv / 1000) * 1000 : b.cost; },
  buyBranch(id) {
    const S = this.S, b = BRANCHES.find(b => b.id === id); if (!b) return '沒有這家店';
    const lv = S.br[id] || 0;
    if (S.lv < b.lv) return `要先擴建成「${LEVELS[b.lv].n}」`;
    if (lv >= 5) return '已經是最高等級';
    const c = this.branchCost(b);
    if (S.money < c) return '錢不夠';
    S.money -= c; S.st.mcost += c; S.br[id] = lv + 1;
    Snd.play('fanfare');
    this.toast(lv ? `${b.n} 升到 ${lv + 1} 級！` : `${b.n} 開幕了！`, 'good');
    this.checkGoals();
    return '';
  },
  hostCost(e) { return Math.round(e.cost * (1 + Math.max(0, this.year() - 5) * 0.08) / 1000) * 1000; },
  host(id) {
    const S = this.S, e = HOSTEV.find(e => e.id === id); if (!e) return '沒有這個活動';
    if (S.lv < e.lv) return `要先擴建成「${LEVELS[e.lv].n}」`;
    if (S.hostCD > 0) return `籌備中，還要 ${S.hostCD} 週才能再辦活動`;
    if (S.ev.some(x => x.host)) return '活動正在進行中';
    const c = this.hostCost(e);
    if (S.money < c) return '錢不夠';
    S.money -= c; S.st.mcost += c; S.hostCD = 6; S.st.hosted++;
    S.ev.push({ w: e.w + 1, mul: e.mul, n: e.n, host: e.id });
    S.pop += e.pop;
    if (e.tour) this.burst = { type: 'tourist', n: e.tour, t: 0 };
    if (e.vip) { this.burst = { type: 'tourist', n: 12, t: 0 }; this.spawnCustomer('critic'); this.spawnCustomer('influencer'); }
    if (e.fx === 'fireworks') this.achFlag('fire');
    this.achFlag('host');
    this.confetti(S.W * TILE / 2, S.H * TILE / 2, 50); this.flash = 0.7;
    Snd.play('fanfare');
    return '';
  },
  techCost(t) { const lv = this.tech(t.id); return { idea: t.idea * (lv + 1) * (lv + 1), money: t.money * (lv + 1) * (lv + 1) }; },
  techUp(id) {
    const S = this.S, t = TECHS.find(t => t.id === id); if (!t) return '沒有這個秘方';
    const lv = this.tech(id); if (lv >= 5) return '已經研究到最高等級';
    const c = this.techCost(t);
    if (S.idea < c.idea) return '靈感不夠';
    if (S.money < c.money) return '錢不夠';
    S.idea -= c.idea; S.money -= c.money; S.st.mcost += c.money; S.tech[id] = lv + 1;
    if (id === 'meal' || id === 'school') for (const a of this.srt.values()) a.stam = Math.max(a.stam, 0);
    Snd.play('level');
    this.checkGoals();
    return '';
  },

  // ---------- 客人委託 ----------
  catSold(cat, st) { let n = 0; const d = this.S.st.dsold; for (const k in d) { const x = DISH[k]; if (x && (!cat || x.cat === cat) && (!st || x.st === st)) n += d[k]; } return n; },
  weekQuest() {
    const S = this.S;
    if (S.q) { S.q.w--; if (S.q.w <= 0 && !this.questDone(S.q)) { this.toast(`委託「${S.q.title}」時間到了，沒有完成…`, 'bad'); S.q = null; S.qcd = irnd(1, 3); } return; }
    if (S.tut && S.tut.step >= 0) return;
    if (S.week < 4 || --S.qcd > 0) return;
    if (Math.random() < 0.55) { const q = this.makeQuest(); if (q) { this.pending.push({ k: 'quest', q }); this.spawnAsker(q); } }
    else S.qcd = 1;
  },
  makeQuest() {
    const S = this.S, lv = S.lv, who = pick(ASKERS), seed = lookSeed();
    const types = ['serve', 'sell', 'sat'];
    const want = DISH_ALL.filter(k => this.sellable(k) && this.hasStation(DISH[k].st) && (!S.dishes[k] || !S.dishes[k].on) && this.canUse(DISH[k].a) && this.canUse(DISH[k].b));
    if (want.length) types.push('dish', 'dish');
    const decs = FAC.filter(f => (f.cat === 'decor' || f.cat === 'fun') && !f.unlock && f.lv <= lv && f.price <= Math.max(3000, S.money * 0.3));
    if (decs.length) types.push('decor');
    const k = pick(types), q = { k, who, seed, w: 6, r: {} };
    const mBase = 1500 + lv * lv * 2500 + this.year() * 600;
    if (k === 'dish') {
      const d = pick(want); q.d = d; q.n = 6 + lv * 2; q.base = S.st.dsold[d] || 0; q.w = 8;
      q.title = `想吃${DISH[d].n}`; q.txt = `「好想吃${DISH[d].n}喔…你們店可以賣嗎？」${S.dishes[d] ? '' : '（要先研發出來）'}`;
      q.goal = `賣出 ${q.n} 份${DISH[d].n}`; q.r = { money: Math.round(mBase * 1.5 / 100) * 100, idea: 15 + lv * 6, pop: 10 + lv * 6 };
    } else if (k === 'serve') {
      const ts = Object.keys(CTYPES).filter(t => CTYPES[t].lv <= lv && !CTYPES[t].vip);
      const t = pick(ts); q.t = t; q.n = 8 + lv * 5; q.base = S.st.ctype[t] || 0; q.w = 5;
      q.title = `招待${CTYPES[t].n}`; q.txt = `「我們${CTYPES[t].n}最近都在找好吃的店，可以多照顧一下嗎？」`;
      q.goal = `招待 ${q.n} 位${CTYPES[t].n}`; q.r = { money: Math.round(mBase / 100) * 100, idea: 10 + lv * 4, pop: 8 + lv * 4 };
    } else if (k === 'sell') {
      const cats = Object.keys(CAT).filter(c => this.menu().some(m => DISH[m].cat === c));
      if (!cats.length) return null;
      const c = pick(cats); q.cat = c; q.n = 20 + lv * 18; q.base = this.catSold(c); q.w = 5;
      q.title = `${CAT[c]}大胃王`; q.txt = `「我們辦公室要團購${CAT[c]}東西，幫忙準備多一點！」`;
      q.goal = `賣出 ${q.n} 份${CAT[c]}菜`; q.r = { money: Math.round(mBase * 1.2 / 100) * 100, idea: 12 + lv * 4 };
    } else if (k === 'sat') {
      q.n = 40 + lv * 10; q.need = Math.min(82, 70 + lv * 2); q.bs = S.st.satS; q.bn = S.st.satN; q.w = 5;
      q.title = '口碑調查'; q.txt = `「我在寫美食部落格，接下來的客人如果都很滿意，我就幫你們寫一篇！」`;
      q.goal = `接下來 ${q.n} 位客人平均滿意度 ${q.need} 以上`; q.r = { money: Math.round(mBase * 0.8 / 100) * 100, pop: 25 + lv * 12, idea: 10 };
    } else if (k === 'decor') {
      const f = pick(decs), have = S.items.filter(i => i.id === f.id).length; q.f = f.id; q.n = have + (f.price > 5000 ? 1 : 2); q.w = 6;
      q.title = `想看${f.n}`; q.txt = `「如果店裡多放幾個${f.n}，我每天都會來！」`;
      q.goal = `店裡擺出 ${q.n} 個${f.n}`; q.r = { money: Math.round((mBase * 0.6 + f.price * 1.2) / 100) * 100, pop: 10 + lv * 5 };
    }
    return q;
  },
  questProg(q) {
    const S = this.S;
    switch (q.k) {
      case 'dish': return [(S.st.dsold[q.d] || 0) - q.base, q.n];
      case 'serve': return [(S.st.ctype[q.t] || 0) - q.base, q.n];
      case 'sell': return [this.catSold(q.cat) - q.base, q.n];
      case 'decor': return [S.items.filter(i => i.id === q.f).length, q.n];
      case 'sat': { const n = S.st.satN - q.bn; return [Math.min(n, q.n), q.n, n ? Math.round((S.st.satS - q.bs) / n) : 0]; }
      case 'fest': return [(q.cat ? this.catSold(q.cat) : this.catSold(null, q.st)) - q.base, q.n];
    }
    return [0, 1];
  },
  questDone(q) { const p = this.questProg(q); return q.k === 'sat' ? (p[0] >= p[1] && p[2] >= q.need) : p[0] >= p[1]; },
  checkQuest() {
    const S = this.S;
    if (S.q && S.q.acc) {
      const q = S.q, p = this.questProg(q);
      if (q.k === 'sat' && p[0] >= p[1] && p[2] < q.need) { this.toast(`委託「${q.title}」失敗了：平均只有 ${p[2]} 分`, 'bad'); S.q = null; S.qcd = irnd(2, 3); }
      else if (this.questDone(q)) { this.giveReward(q.r); S.qdone++; this.toast(`完成委託「${q.title}」！ ${this.rewardText(q.r)}`, 'goal'); Snd.play('fanfare'); this.thanks(q); S.q = null; S.qcd = irnd(2, 4); }
    }
    if (S.fq && this.month() !== S.fq.m) { S.fq = null; }
    if (S.fq && !S.fq.done && this.questDone(S.fq)) { S.fq.done = 1; this.giveReward(S.fq.r); this.toast(`節慶挑戰達成！ ${this.rewardText(S.fq.r)}`, 'goal'); Snd.play('fanfare'); this.confetti(S.W * TILE / 2, S.H * TILE * 0.4, 40); }
  },
  festQuest() {
    const S = this.S, m = this.month(), f = FESTIVALS[m];
    if (!f || !f.q || S.week < 4) { S.fq = null; return; }
    const lv = S.lv, n = Math.round(f.q.n * (1 + lv * 0.7));
    const fq = { k: 'fest', m, cat: f.q.cat, st: f.q.st, n, title: f.n + '限定挑戰' };
    fq.base = fq.cat ? this.catSold(fq.cat) : this.catSold(null, fq.st);
    fq.goal = `這個月賣出 ${n} 份${fq.cat ? CAT[fq.cat] + '菜' : STN[fq.st] + '的菜'}`;
    fq.r = { money: Math.round(n * 60 * (1 + lv * 0.5) / 100) * 100, pop: 15 + lv * 10, idea: 10 + lv * 3 };
    S.fq = fq;
  },
  giveReward(r) { const S = this.S; if (r.money) S.money += r.money; if (r.idea) S.idea += r.idea; if (r.pop) S.pop += r.pop; },
  acceptQuest(q) { q.acc = 1; this.S.q = q; if (q.k === 'sat') { q.bs = this.S.st.satS; q.bn = this.S.st.satN; } },
  spawnAsker(q) {
    const S = this.S, left = Math.random() < 0.5, x0 = left ? -5 : S.W + 4;
    const look = makeLook(q.seed, 'asker');
    this.peds.push({ kind: 'c', type: 'asker', look, x: x0 * TILE + 8, y: S.H * TILE + 11, tile: [x0, S.H], path: [], spd: 22, dir: 2, anim: 0, state: 'pass', passDir: left ? 1 : -1, bub: 'excl', bubT: 99, asker: 1 });
  },
  thanks(q) {
    const S = this.S, look = makeLook(q.seed, 'asker');
    const x0 = Math.random() < 0.5 ? -4 : S.W + 3;
    this.peds.push({ kind: 'c', type: 'asker', look, x: x0 * TILE + 8, y: S.H * TILE + 11, tile: [x0, S.H], path: [], spd: 20, dir: 2, anim: 0, state: 'pass', passDir: x0 < 0 ? 1 : -1, bub: 'heart2', bubT: 99, face: 'happy', asker: 1 });
  },

  // ---------- 模式 ----------
  checkScenario() {
    const S = this.S, y = this.year();
    if (S.scen === 'rush' && !S.rushEnd) {
      if (S.rank === 1) { S.rushEnd = 1; this.achFlag('rush'); this.say('event', { title: '限時挑戰成功！', big: `第 ${y} 年登上第 1 名`, text: '太厲害了！你在期限內成為夜市之王。（得到傳承點數）', icon: 'star' }); }
      else if (y > 5) { S.rushEnd = 2; this.say('event', { title: '限時挑戰結束', big: `最後名次：第 ${S.rank} 名`, text: '5 年的期限到了。你可以繼續經營這家店，或是到選單「傳承」重新挑戰！', icon: 'cal' }); }
    }
    if (S.scen === 'sweet' && S.lv >= 3) this.achFlag('sweet');
    if (S.scen === 'hard' && S.rank <= 10) this.achFlag('hard');
    if (S.scen === 'veg' && S.lv >= 2) this.achFlag('veg');
    if (S.scen === 'tour' && S.rank <= 3) this.achFlag('tour');
  },

  // ---------- 成就 ----------
  achFlag(id) {
    const S = this.S;
    if (S.ach[id] || this.demoMode) return;
    S.ach[id] = 1;
    const a = ACHS.find(a => a.id === id); if (!a) return;
    const isNew = Legacy.unlock(id, a.pt);
    if (this.ui && this.ui.achToast) this.ui.achToast(a, isNew);
  },
  checkAch() {
    const S = this.S, st = S.st, n = Object.keys(S.combos).length, d = this.nKnown();
    const C = (c, id) => { if (c && !S.ach[id]) this.achFlag(id); };
    C(st.cust >= 1, 'first'); C(st.cust >= 1000, 'c1k'); C(st.cust >= 50000, 'c50k');
    C(st.five >= 30, 'five'); C(n >= 10, 'combo10'); C(n >= COMBOS.length, 'comboall');
    C(d >= 30, 'd30'); C(d >= DISH_ALL.length, 'dall'); C(S.rank === 1, 'king'); C(st.wins >= 3, 'cup3');
    const nb = BRANCHES.filter(b => S.br[b.id]).length; C(nb >= 1, 'branch'); C(nb >= BRANCHES.length, 'branchall');
    C(TECHS.some(t => this.tech(t.id) >= 5), 'tech'); C(S.qdone >= 10, 'quest10'); C(S.staff.length >= 16, 'staff16');
    C(S.money >= 1e8, 'rich'); C(st.storm >= 20, 'storm'); C(S.lv >= 5, 'legend');
    if (!S.ach.full) { let seats = 0, full = 0; for (const rt of this.rts.values()) if (rt.seats && rt.seats.length) { seats += rt.seats.length; full += rt.seats.filter(Boolean).length; } C(seats >= 8 && full >= seats, 'full'); }
  },
  // 傳承：把店交給下一代
  retirePts() {
    const S = this.S;
    return 3 + (S.rank <= 1 ? 5 : S.rank <= 3 ? 3 : S.rank <= 10 ? 1 : 0) + Math.floor(this.known().length / 10) + S.lv + Math.min(5, Math.floor((this.year() - 1) / 3));
  },

  // ---------- 目標 ----------
  goalVal(k) {
    const S = this.S;
    switch (k) {
      case 'cust': return S.st.cust; case 'dishes': return this.nKnown(); case 'combos': return Object.keys(S.combos).length;
      case 'staff': return S.staff.length; case 'lv': return S.lv; case 'sales': return S.st.sales; case 'rank': return S.rank;
      case 'slv': return Math.max(...S.staff.map(s => s.lv)); case 'contest': return S.st.wins; case 'year': return this.year();
    }
    return 0;
  },
  goalDone(g) { const v = this.goalVal(g.k); return g.k === 'rank' ? v <= g.v : v >= g.v; },
  checkGoals() {
    const S = this.S;
    for (const g of GOALS) {
      if (S.goals[g.id] || !this.goalDone(g)) continue;
      S.goals[g.id] = 1;
      const r = g.r; if (r.money) S.money += r.money; if (r.idea) S.idea += r.idea; if (r.pop) S.pop += r.pop;
      this.toast(`達成目標「${g.n}」！ ${this.rewardText(r)}`, 'goal');
      Snd.play('fanfare');
    }
    this.checkQuest();
    this.checkAch();
  },
  rewardText(r) { return [r.money ? money(r.money) : '', r.idea ? '靈感 +' + r.idea : '', r.pop ? '人氣 +' + r.pop : ''].filter(Boolean).join('、'); },

  // ---------- 特效 ----------
  float(x, y, t, col, big) { this.floats.push({ x, y, t: 0, txt: t, col, big }); if (this.floats.length > 40) this.floats.shift(); },
  // 收錢：金幣跳出來，附近同時間的金額會合併
  coin(x, y, v) {
    for (let i = 0; i < Math.min(3, 1 + (v / 120 | 0)); i++) this.fx.push({ x: x + rnd(-2, 2), y, vx: rnd(-14, 14), vy: -rnd(38, 55), g: 150, t: 0, life: 0.75, coin: 1, s: 1, floor: y + 6 });
    const f = this.floats.find(f => f.money && f.t < 0.35 && Math.abs(f.x - x) < 8 && Math.abs(f.y - y) < 8);
    if (f) { f.v += v; f.txt = '+' + f.v; f.t = Math.min(f.t, 0.1); }
    else this.floats.push({ x, y: y - 6, t: 0, txt: '+' + v, col: '#ffe070', money: 1, v });
  },
  emote(x, y, icon) { if (this.fx.length > 260) return; this.fx.push({ x, y, vx: rnd(-3, 3), vy: -16, t: 0, life: 1.1, emo: icon, s: 1 }); },
  ring(x, y, col) { this.fx.push({ x, y, vx: 0, vy: 0, t: 0, life: 0.55, ring: 1, col, s: 1 }); },
  steam(x, y, st) {
    if (this.fx.length > 260) return;
    const smoke = st === 'grill' || st === 'fryer';
    this.fx.push({ x, y, vx: rnd(-3, 3), vy: -rnd(9, 15), t: 0, life: rnd(1.0, 1.5), col: smoke ? 'rgba(230,225,235,.55)' : 'rgba(255,255,255,.75)', s: 2, steam: 1 });
    if (st === 'grill' && Math.random() < 0.4) this.fx.push({ x: x + rnd(-3, 3), y: y + 6, vx: rnd(-6, 6), vy: -rnd(14, 24), g: -4, t: 0, life: 0.6, col: pick(['#ffd040', '#ff8a2a']), s: 1, ember: 1 });
  },
  sparkle(x, y, n) { for (let i = 0; i < n; i++) { const a = rnd(TAU), v = rnd(15, 45); this.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15, g: 40, t: 0, life: rnd(0.6, 1.1), col: pick(['#ffe070', '#ffffff', '#ff8ad0', '#7affb0']), s: 1, star: 1 }); } },
  confetti(x, y, n) { for (let i = 0; i < n; i++) { const a = rnd(-Math.PI * 0.9, -Math.PI * 0.1), v = rnd(40, 90); this.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 70, drag: 1.6, t: 0, life: rnd(1.3, 2.2), col: pick(['#ff4a6a', '#ffd040', '#5ad0ff', '#7affb0', '#ff8ad0', '#ffffff']), s: 2, conf: 1, rot: rnd(TAU) }); } },
  poof(x, y) { for (let i = 0; i < 12; i++) { const a = rnd(TAU), v = rnd(10, 30); this.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, t: 0, life: 0.55, col: '#ffffff', s: 3, puff: 1 }); } },
  toast(t, k) { this.ui && this.ui.toast ? this.ui.toast(t, k) : this.notes.push(t); },
  say(k, o) { this.pending.push(Object.assign({ k: 'msg', kind: k }, o)); },
};
