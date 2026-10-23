'use strict';
// 夜市小吃王：經營模擬核心（地圖、客人、員工、經濟、日曆）

const SKINS = ['#f8d8b8', '#f4c8a0', '#e8b088', '#d89a70', '#c08060'];
const HAIRS = ['#2b1b16', '#3a2418', '#5a3a24', '#8a5a2b', '#1a1a2a', '#c8a060', '#e8e0d8', '#a83a2a'];
const SHIRTS = ['#e8473b', '#3a8ad8', '#3fa64a', '#ffd84a', '#ff8ad0', '#8a6ad8', '#ffffff', '#ff9a3a', '#5ad0c8', '#3a3a4a', '#f4e8c8'];
const PANTS = ['#2a3a6a', '#3a3a4a', '#6a4a2a', '#5a6a8a', '#2b1b26', '#8a8a9a'];
function makeLook(seed, kind, job) {
  const h = i => hash(seed, i, 99);
  const L = {
    skin: SKINS[(h(1) * SKINS.length) | 0], hair: HAIRS[(h(2) * 6) | 0], hs: (h(3) * 6) | 0,
    shirt: SHIRTS[(h(4) * SHIRTS.length) | 0], pants: PANTS[(h(5) * PANTS.length) | 0], skirt: h(6) < 0.25,
  };
  if (L.hs === 4) L.hs = 0;
  if (kind === 'elder') { L.hair = h(7) < .5 ? '#e8e0d8' : '#c8c8d0'; L.hs = h(8) < .5 ? 4 : 2; L.glasses = h(9) < .5; }
  if (kind === 'kid') { L.hat = h(7) < .4 ? 'cap' : (h(7) < .7 ? 'bow' : null); L.capc = SHIRTS[(h(10) * 6) | 0]; }
  if (kind === 'student' && h(7) < .3) { L.hat = 'cap'; L.capc = SHIRTS[(h(10) * 6) | 0]; }
  if (kind === 'worker') { L.shirt = h(7) < .5 ? '#ffffff' : '#8ab0d8'; L.pants = '#2a2a3a'; L.glasses = h(8) < .3; }
  if (kind === 'tourist') { L.hat = 'cap'; L.capc = '#f4e8c8'; L.shirt = pick(['#ff9a3a', '#5ad0c8', '#ffd84a']); L.hair = pick(HAIRS); }
  if (kind === 'influencer') { L.shirt = '#ff5ad0'; L.hair = '#ffd84a'; L.hs = 1; }
  if (kind === 'critic') { L.shirt = '#3a3a4a'; L.glasses = true; L.hair = '#5a5a5a'; L.hs = 0; }
  if (job === 'cook') { L.hat = 'chef'; L.apron = '#ffffff'; }
  if (job === 'serve') { L.apron = '#e8473b'; L.hat = null; }
  if (job === 'tout') { L.hat = 'band'; L.sign = true; }
  L.key = [L.skin, L.hair, L.hs, L.shirt, L.pants, L.skirt, L.hat, L.capc, L.apron, L.sign, L.glasses].join('|');
  return L;
}

const Game = {
  S: null,
  cust: [], peds: [], rts: new Map(), srt: new Map(), fx: [], floats: [], cars: [],
  occ: null, combos: [], satMap: null, decMap: null, spdMap: new Map(), effTot: { cust: 0, pop: 0 }, appeal: 0,
  dbg: { spawn: 0, cap: 0, price: 0, full: 0, impatient: 0, served: 0, nomenu: 0 },
  spawnAcc: 0, pedAcc: 0, carAcc: 0, notes: [], pending: [], dirtyGrid: true,
  ui: null, // 介面回呼

  // ---------- 開新遊戲 ----------
  fresh(name) {
    const S = {
      v: 1, shop: name || '阿福小吃', money: 12000, pop: 5, idea: 12, week: 0, t: 0,
      lv: 0, W: 6, H: 5, items: [], floor: {}, staff: [], dishes: {}, ings: {}, combos: {}, goals: {}, unlock: {},
      st: { cust: 0, sales: 0, ysales: 0, msales: 0, mcost: 0, wsales: 0, wcust: 0, satS: 0, satN: 0, ysat: 0, yn: 0, hist: [], best: 99, wins: 0, research: 0 },
      awards: [], ended: false, uid: 1, hire: [], ev: [], hints: {}, log: [], rank: 0, contestY: 0, festNote: 0, seed: (Math.random() * 1e9) | 0,
    };
    for (const k in ING) if (!ING[k].buy) S.ings[k] = 1;
    S.dishes.pancake = { lv: 1, price: DISH.pancake.p, on: true };
    S.dishes.blacktea = { lv: 1, price: DISH.blacktea.p, on: true };
    this.S = S;
    const add = (id, x, y) => S.items.push({ uid: S.uid++, id, x, y, lv: 1, dirty: 0 });
    add('griddle', 1, 1); add('drink', 3, 1); add('stool', 1, 3); add('stool', 4, 3); add('lantern', 5, 0);
    S.staff.push(this.newStaff({ name: '阿福', title: '老闆', cook: 8, serv: 5, charm: 5, job: 'cook', owner: true }));
    S.staff.push(this.newStaff({ name: '阿珠', cook: 5, serv: 6, charm: 4, job: 'cook' }));
    this.rollHire();
    this.boot();
  },
  newStaff(o) {
    const S = this.S, seed = (Math.random() * 1e9) | 0;
    const s = Object.assign({ uid: S.uid++, name: '', title: '', lv: 1, exp: 0, cook: 5, serv: 5, charm: 5, job: 'cook', tr: 0, seed, sal: 0 }, o);
    s.sal = s.owner ? 0 : this.salaryOf(s);
    return s;
  },
  salaryOf(s) { return Math.round((600 + (s.cook + s.serv + s.charm) * 18 + s.lv * 60) / 10) * 10; },
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
    this.computeCombos();
    for (const a of this.cust) a.repath = true;
    for (const a of this.srt.values()) a.repath = true;
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
      this.say('discover', { title: '發現擺設組合！', big: c.n, text: this.effText(c.eff), icon: 'star' });
      this.sparkle((a.x + b.x) / 2 * TILE + 8, (a.y + b.y) / 2 * TILE + 4, 18);
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
  upgradeCost(it) { return Math.round(F[it.id].price * 1.6 * it.lv); },
  upgrade(it) {
    const c = this.upgradeCost(it);
    if (it.lv >= 3 || this.S.money < c) return false;
    this.S.money -= c; this.S.st.mcost += c; it.lv++;
    this.sparkle(it.x * TILE + 8, it.y * TILE, 10); Snd.play('level');
    return true;
  },

  // ---------- 員工 ----------
  spawnStaff(s) {
    const S = this.S;
    const a = { kind: 's', s, x: (S.W / 2) * TILE, y: S.H * TILE + 10, path: [], spd: 34, dir: 0, anim: 0, stam: this.maxStam(s), st: null, task: null, wait: 0, tile: [Math.floor(S.W / 2), S.H], bub: null, bubT: 0, repath: false };
    a.look = makeLook(s.seed, 'staff', s.job);
    this.srt.set(s.uid, a);
  },
  maxStam(s) { return 70 + s.lv * 5; },
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
    s.exp += n;
    const need = this.expNeed(s);
    if (s.exp >= need && s.lv < 99) {
      s.exp -= need; s.lv++;
      const main = { cook: 'cook', serve: 'serv', tout: 'charm' }[s.job];
      s[main] += irnd(1, 3); for (const k of ['cook', 'serv', 'charm']) if (k !== main && Math.random() < .4) s[k]++;
      if (!s.owner) s.sal = this.salaryOf(s);
      const a = this.srt.get(s.uid);
      if (a) { this.float(a.x, a.y - 22, 'Lv UP!', '#7affb0'); this.sparkle(a.x, a.y - 10, 8); }
      Snd.play('level');
      if (s.lv % 5 === 0) this.toast(`${s.name} 升到 ${s.lv} 級了！`);
      this.checkGoals();
    }
  },
  expNeed(s) { return 25 + s.lv * s.lv * 5; },

  // ---------- 菜單 ----------
  known() { return Object.keys(this.S.dishes); },
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
  menu() { return this.known().filter(k => this.S.dishes[k].on && this.hasStation(DISH[k].st)); },
  ideaCost() { return Math.min(60, 10 + this.S.st.research * 2); },
  moneyCost() { return Math.min(12000, 200 + this.S.st.research * this.S.st.research * 12 + this.S.st.research * 60); },
  canUse(k) { return !!(this.S.ings[k] || this.S.dishes[k]); },
  research(a, b) {
    const S = this.S;
    if (!a || !b) return { err: '請選兩樣材料' };
    if (a === b) return { err: '要選兩種不同的材料' };
    const hit = Object.keys(DISH).find(k => (DISH[k].a === a && DISH[k].b === b) || (DISH[k].a === b && DISH[k].b === a));
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
    const cand = Object.keys(DISH).filter(k => !S.dishes[k] && (DISH[k].a === a || DISH[k].b === a || DISH[k].a === b || DISH[k].b === b));
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
    this.say('expand', { title: '擴建完成！', big: n.n, text: `店面變成 ${n.W}×${n.H} 格，可以雇用 ${n.staff} 位員工，也解鎖了新的設施和食材。`, icon: 'star' });
    return true;
  },

  // ---------- 客人 ----------
  spawnRate() {
    const S = this.S;
    let tout = 0;
    for (const a of this.srt.values()) if (a.s.job === 'tout' && a.atPost) tout += a.s.charm * (a.stam > 0 ? 1 : 0.5);
    let r = 0.32 + 0.06 * Math.sqrt(S.pop) + this.appeal * 0.004 + tout * 0.012;
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
    const list = Object.entries(CTYPES).filter(([, t]) => t.lv <= S.lv);
    let tot = 0; const ws = list.map(([k, t]) => { let w = t.w; if (k === 'tourist' && fest && fest.tourist) w *= fest.tourist; tot += w; return w; });
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
      kind: 'c', type, look: makeLook((Math.random() * 1e9) | 0, type), x: x0 * TILE + 8, y: S.H * TILE + 10, tile: [x0, S.H], path: [],
      spd: rnd(34, 42) * (type === 'elder' ? 0.7 : type === 'kid' ? 1.2 : 1), dir: 2, anim: rnd(10), state: 'in', wait: 0, pat: 30 * T.pat, greet: false,
      want: null, dish: null, st: null, seat: null, sat: 0, bub: null, bubT: 0, repath: false, vip: T.vip || 0,
    };
    // 想吃什麼
    const prefs = T.pref, wcat = Math.random() < 0.6 ? prefs[0] : pick(prefs);
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
      return w;
    });
    let tot = ws.reduce((a, b) => a + b, 0), r = Math.random() * tot, dish = opts[0];
    for (let i = 0; i < opts.length; i++) { r -= ws[i]; if (r <= 0) { dish = opts[i]; break; } }
    c.dish = dish;
    const price = S.dishes[dish].price, val = this.dishValue(dish) * T.b;
    c.price = price;
    c.qty = Math.max(1, Math.floor(T.qty + Math.random()));
    if (price > val * 1.9) { this.dbg.price++; if (this.peds.length < 8 + S.lv * 2 && Math.random() < 0.5) { c.state = 'pass'; c.refuse = true; c.x = (left ? -5 : S.W + 4) * TILE + 8; c.passDir = left ? 1 : -1; this.peds.push(c); } return; }
    // 選人最少的攤位
    const sts = [...this.rts.values()].filter(rt => F[rt.it.id].st === DISH[dish].st && rt.front);
    if (!sts.length) return;
    sts.sort((a, b) => a.queue.length - b.queue.length);
    const rt = sts[0];
    if (rt.queue.length >= 6) { this.dbg.full++; if (this.peds.length < 8 + S.lv * 2 && Math.random() < 0.15) { c.state = 'pass'; c.full = true; c.x = (left ? -5 : S.W + 4) * TILE + 8; c.passDir = left ? 1 : -1; this.peds.push(c); } return; }
    c.st = rt.it.uid; rt.queue.push(c);
    c.state = 'walk';
    c.path = this.path(c.tile[0], c.tile[1], rt.front[0], rt.front[1]) || [];
    c.bub = wcat; c.bubT = 3;
    this.cust.push(c);
  },
  spawnPed() {
    const S = this.S, left = Math.random() < 0.5, x0 = left ? -5 : S.W + 4;
    const type = this.pickType();
    const c = { kind: 'c', type, look: makeLook((Math.random() * 1e9) | 0, type), x: x0 * TILE + 8, y: S.H * TILE + 10 + rnd(-2, 3), tile: [x0, S.H], path: [], spd: rnd(22, 32), dir: 2, anim: rnd(10), state: 'pass', passDir: left ? 1 : -1 };
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
      c.bub = 'angry'; c.bubT = 3;
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
    this.float(c.x, c.y - 22, '+' + pay, '#ffe070');
    Snd.play('coin');
    c.state = 'carry';
    // 找座位
    let best = null, bd = 1e9;
    for (const s of this.rts.values()) {
      if (F[s.it.id].cat !== 'seat') continue;
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
    const val = this.dishValue(c.dish) * T.b, ratio = c.price / val;
    sat += clamp((1.1 - ratio) * 32, -28, 12);
    sat -= Math.max(0, c.wait - 10) * 1.1;
    if (c.greet) sat += 5;
    if (c.takeout) sat -= c.type === 'elder' ? 9 : 4;
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
    c.bub = 'f' + stars; c.bubT = 3;
    S.st.satS += sat; S.st.satN++; S.st.ysat += sat; S.st.yn++;
    const dp = (sat - 52) / 22 * (c.vip || 1);
    S.pop = Math.max(0, S.pop + dp);
    if (sat >= 68 && (c.vip || Math.random() < 0.6)) S.idea += c.vip ? 6 : 1;
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
        if (Math.random() < 0.7 - near * 0.2) srt.it.dirty = Math.min(srt.seats.length, srt.it.dirty + 1);
      }
      c.seat = null;
    }
    c.state = 'done';
    this.custLeaveQuiet(c);
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
    S.t += dt;
    if (S.t >= WEEK_LEN) { S.t -= WEEK_LEN; this.endWeek(); }
    // 生客人
    if (this.burst) { this.burst.t -= dt; if (this.burst.t <= 0) { this.burst.t = 0.5; this.spawnCustomer(this.burst.type); if (--this.burst.n <= 0) this.burst = null; } }
    const cap = this.capacity();
    this.inside = 0; for (const c of this.cust) if (c.state !== 'leave') this.inside++;
    this.spawnAcc += this.spawnRate() * dt;
    while (this.spawnAcc >= 1) { this.spawnAcc -= 1; this.dbg.spawn++; if (this.inside < cap) { this.spawnCustomer(); this.inside++; } else this.dbg.cap++; }
    this.pedAcc += dt * (0.35 + S.lv * 0.08);
    if (this.pedAcc >= 1) { this.pedAcc = 0; if (this.peds.length < 5 + S.lv * 2) this.spawnPed(); }
    this.carAcc += dt;
    if (this.carAcc > 3.5) { this.carAcc = rnd(-3, 0); this.cars.push({ x: Math.random() < .5 ? -6 * TILE : (S.W + 6) * TILE, y: (S.H + 1) * TILE + 6, v: 0, col: pick(['#e8473b', '#3a8ad8', '#ffd84a', '#f4f4f4', '#3fa64a', '#ff8ad0']), rider: makeLook((Math.random() * 1e9) | 0, 'worker') }); const c = this.cars[this.cars.length - 1]; c.v = c.x < 0 ? rnd(50, 70) : -rnd(50, 70); c.y += c.v > 0 ? 8 : 0; }
    for (const c of this.cars) c.x += c.v * dt;
    this.cars = this.cars.filter(c => c.x > -8 * TILE && c.x < (S.W + 8) * TILE);
    // 攤位
    for (const rt of this.rts.values()) if (F[rt.it.id].cat === 'station') this.stepStation(rt, dt);
    for (const c of this.cust) this.stepCust(c, dt);
    this.cust = this.cust.filter(c => c.state !== 'gone');
    for (const p of this.peds) this.stepPed(p, dt);
    this.peds = this.peds.filter(c => c.state !== 'gone');
    for (const a of this.srt.values()) this.stepStaff(a, dt);
    for (const f of this.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.g || 0) * dt; }
    this.fx = this.fx.filter(f => f.t < f.life);
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter(f => f.t < 1.4);
    // 節慶旗幟每週提醒在 endWeek
  },
  moveAgent(a, dt) {
    if (!a.path || !a.path.length) return true;
    const [tx, ty] = a.path[0];
    const gx = tx * TILE + 8, gy = ty * TILE + 10;
    const dx = gx - a.x, dy = gy - a.y, d = Math.hypot(dx, dy), sp = a.spd * dt * (a.tired ? 0.7 : 1);
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
    let sp = (1 + s.cook * 0.03) * (1 + (it.lv - 1) * 0.3) * (1 + (this.spdMap.get(it.uid) || 0) / 100);
    if (ca.stam <= 0) sp *= 0.55;
    rt.prog += dt * sp / (d.t * 0.6 * (1 + 0.4 * (head.qty - 1)));
    rt.cooking = true;
    ca.stam -= dt * 2.2;
    if (Math.random() < dt * 3) this.steam(it.x * TILE + 8 + rnd(-4, 4), it.y * TILE + 2);
    if (rt.prog >= 1) {
      rt.prog = 0;
      head.cookSkill = s.cook;
      this.gainExp(s, Math.ceil(d.q / 2));
      this.served(head, rt);
    }
  },
  queuePos(rt, i) {
    const [fx, fy] = rt.front, it = rt.it;
    const dx = fx - it.x, dy = fy - it.y;
    const bx = fx * TILE + 8, by = fy * TILE + 10;
    if (i === 0) return [bx, by];
    // 排隊往外延伸，碰到牆就轉彎
    const ox = dy !== 0 ? ((i % 2) ? 5 : -5) * Math.ceil(i / 2) * 0.6 : dx * 6 * i;
    const oy = dy !== 0 ? dy * 4 * i : ((i % 2) ? 4 : -4) * Math.ceil(i / 2);
    return [bx + ox, by + oy];
  },
  stepCust(c, dt) {
    const S = this.S;
    if (c.bubT > 0) c.bubT -= dt;
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
      const dx = qx - c.x, dy = qy - c.y, d = Math.hypot(dx, dy);
      c._mv = d > 0.5;
      if (d > 0.5) { const sp = Math.min(d, 20 * dt); c.x += dx / d * sp; c.y += dy / d * sp; c.anim += dt * 6; }
      // 面向攤位
      const it = rt.it; c.dir = it.y < rt.front[1] ? 1 : it.y > rt.front[1] ? 0 : 2; c.flip = it.x < rt.front[0];
      if (c.wait > 8 && c.bubT <= 0 && Math.random() < dt * 0.3) { c.bub = 'wait'; c.bubT = 2; }
    } else if (c.state === 'toSeat') {
      if (this.moveAgent(c, dt)) {
        const srt = this.rts.get(c.seat?.uid);
        if (!srt) { c.takeout = true; this.finishEat(c); return; }
        c.state = 'eat'; c.eatT = rnd(4, 6.5);
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
    a.tired = a.stam <= 0;
    if (a.repath) {
      a.repath = false;
      if (a.path && a.path.length) { const dest = a.path[a.path.length - 1]; a.path = this.path(a.tile[0], a.tile[1], dest[0], dest[1]) || []; if (!a.path.length) { this.releaseStaff(a); a.atStation = false; a.atPost = false; } }
      if (a.st) { const rt = this.rts.get(a.st); if (!rt || !rt.back) this.releaseStaff(a); else if (a.atStation && (a.tile[0] !== rt.back[0] || a.tile[1] !== rt.back[1])) { a.atStation = false; a.path = this.path(a.tile[0], a.tile[1], rt.back[0], rt.back[1]) || []; } }
    }
    if (a.tired && a.bubT <= 0 && Math.random() < dt * 0.4) { a.bub = 'zzz'; a.bubT = 2; }
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
          const other = [...this.rts.values()].find(o => F[o.it.id].cat === 'station' && !o.cook && o.queue.filter(c => c.state === 'queue').length >= need && o.back);
          if (other && !rt.cooking) { this.releaseStaff(a); a.atStation = false; }
        }
      } else {
        a.atStation = false;
        const free = [...this.rts.values()].filter(o => F[o.it.id].cat === 'station' && !o.cook && o.back);
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
            t.time -= dt * (1 + s.serv * 0.05) * (a.tired ? 0.6 : 1); a.anim += dt * 6;
            if (Math.random() < dt * 6) this.fx.push({ x: t.rt.it.x * TILE + 8 + rnd(-5, 5), y: t.rt.it.y * TILE + 6, vx: rnd(-8, 8), vy: -rnd(8, 18), t: 0, life: 0.5, col: '#dff4ff', s: 1 });
            if (t.time <= 0) { t.rt.it.dirty = 0; t.rt.cleaner = null; a.task = null; this.gainExp(s, 2); a.stam -= 3; Snd.play('clean'); }
          } else if (t.k === 'greet') {
            if (t.c.state === 'queue' || t.c.state === 'walk') { t.c.greet = true; t.c.pat += 6; a.bub = 'note'; a.bubT = 1.2; this.gainExp(s, 1); a.stam -= 1; }
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
    if (inc) { inc = Math.round(inc); S.money += inc; st.msales += inc; st.ysales += inc; st.sales += inc; }
    for (const a of this.srt.values()) a.stam = this.maxStam(a.s);
    S.ev = S.ev.filter(e => --e.w > 0);
    st.wsales = 0; st.wcust = 0;
    const wasMonthEnd = this.wk() === 4;
    S.week++;
    this.computeRank();
    if (wasMonthEnd) this.endMonth();
    if (this.wk() === 1 && this.month() === 1 && S.week > 0) { /* 新年 */ }
    // 小吃大賽：10 月第 2 週
    if (this.month() === 10 && this.wk() === 2 && S.contestY !== this.year() && this.menuAll().length) { S.contestY = this.year(); this.pending.push({ k: 'contest' }); }
    else if (Math.random() < 0.16 && S.week > 3) this.rollEvent();
    this.checkGoals();
    this.ui && this.ui.week && this.ui.week();
  },
  menuAll() { return this.known(); },
  endMonth() {
    const S = this.S, st = S.st;
    const sal = S.staff.reduce((a, s) => a + s.sal, 0), rent = LEVELS[S.lv].rent;
    S.money -= sal + rent;
    const profit = st.msales - st.mcost - sal - rent;
    st.hist.push({ s: Math.round(st.msales), p: Math.round(profit), sal, rent, c: Math.round(st.mcost) });
    if (st.hist.length > 24) st.hist.shift();
    this.toast(`月結：營業額 ${money(st.msales)}，薪水 ${money(sal)}，租金 ${money(rent)}`);
    st.msales = 0; st.mcost = 0;
    this.rollHire();
    if (this.month() === 1) this.endYear();
    const f = FESTIVALS[this.month()];
    if (f) this.toast(`${this.month()} 月：${f.n}！${f.mul > 1.15 ? '人潮變多了' : ''}`, 'fest');
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
  },
  applyAward(p) {
    const S = this.S, a = p.a;
    S.money += a.m; S.pop += a.p;
    if (a.u && !S.unlock[a.u]) { S.unlock[a.u] = 1; p.newU = F[a.u].n; }
    if (!S.ended && (p.rank === 1 || p.y >= 10)) { S.ended = true; this.pending.push({ k: 'ending', y: p.y, rank: p.rank }); }
  },
  rivalScore(i, yf = this.yearF()) {
    const b = RIVALS[i][1];
    return b * (1 + 0.55 * yf) * (1 + hash(i, 3, this.S.seed) * 0.15 * Math.sin(yf * 3 + i));
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
        const cand = Object.keys(DISH).filter(k => !S.dishes[k] && !S.hints[k] && this.canUse(DISH[k].a) && this.canUse(DISH[k].b));
        if (cand.length) {
          const d = pick(cand); S.hints[d] = 1;
          const nm = x => ING[x] ? ING[x].n : DISH[x].n;
          E('神秘的老饕', `一位老先生吃完說：「把${nm(DISH[d].a)}跟${nm(DISH[d].b)}放在一起試試看。」（研發頁面會記下來）`);
        } else { S.idea += 10; E('神秘的老饕', '老先生吃得很開心，留下一句：「年輕人，繼續加油。」靈感 +10'); }
        break;
      }
    }
  },
  // ---------- 目標 ----------
  goalVal(k) {
    const S = this.S;
    switch (k) {
      case 'cust': return S.st.cust; case 'dishes': return this.known().length; case 'combos': return Object.keys(S.combos).length;
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
  },
  rewardText(r) { return [r.money ? money(r.money) : '', r.idea ? '靈感 +' + r.idea : '', r.pop ? '人氣 +' + r.pop : ''].filter(Boolean).join('、'); },

  // ---------- 特效 ----------
  float(x, y, t, col) { this.floats.push({ x, y, t: 0, txt: t, col }); },
  steam(x, y) { this.fx.push({ x, y, vx: rnd(-3, 3), vy: -rnd(10, 16), t: 0, life: 1.1, col: 'rgba(255,255,255,.7)', s: 2, steam: 1 }); },
  sparkle(x, y, n) { for (let i = 0; i < n; i++) { const a = rnd(TAU), v = rnd(15, 45); this.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15, g: 40, t: 0, life: rnd(0.6, 1.1), col: pick(['#ffe070', '#ffffff', '#ff8ad0', '#7affb0']), s: 1, star: 1 }); } },
  poof(x, y) { for (let i = 0; i < 10; i++) { const a = rnd(TAU), v = rnd(10, 30); this.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, t: 0, life: 0.5, col: '#ffffff', s: 2 }); } },
  toast(t, k) { this.ui && this.ui.toast ? this.ui.toast(t, k) : this.notes.push(t); },
  say(k, o) { this.pending.push(Object.assign({ k: 'msg', kind: k }, o)); },
};
