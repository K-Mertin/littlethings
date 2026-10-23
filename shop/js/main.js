'use strict';
// 夜市小吃王：主迴圈、輸入、存檔、標題畫面
const Main = {
  state: 'title', acc: 0, last: 0, saveT: 0, scen: 'std',
  init() {
    Prefs.load();
    Legacy.load();
    R.init($('#cv'));
    UI.init();
    Tut.init();
    addEventListener('resize', () => { R.resize(); UI.measure(); });
    R.resize();
    this.input();
    this.demo();
    this.title();
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') UI.save(UI.slot, false); });
    addEventListener('pagehide', () => { if (this.state === 'play') UI.save(UI.slot, false); });
    requestAnimationFrame(t => this.frame(t));
  },
  // 標題背景：一間熱鬧的示範小店
  demo() {
    Game.demoMode = true;
    Game.fresh('夜市小吃王', { noTut: true });
    const S = Game.S;
    S.lv = 2; S.W = 10; S.H = 7; S.items = []; S.pop = 800; S.money = 1e6; S.week = 30;
    const add = (id, x, y) => S.items.push({ uid: S.uid++, id, x, y, lv: 1, dirty: 0 });
    add('griddle', 1, 1); add('fryer', 3, 1); add('drink', 4, 1); add('ice', 6, 1); add('soup', 8, 1);
    add('lantern', 0, 0); add('lantern', 9, 0); add('neon', 5, 0); add('plant', 2, 0); add('vsign', 7, 0);
    add('stool', 1, 4); add('stool', 3, 4); add('wood', 6, 4); add('plant', 7, 4); add('round', 8, 4); add('goldfish', 0, 6); add('ring', 9, 6); add('banner', 0, 3);
    for (let x = 0; x < 10; x++) for (let y = 3; y < 6; y++) S.floor[x + ',' + y] = 'f_brick';
    for (const k of ['cutlet', 'bubble', 'milktea', 'spball', 'douhua', 'mangoice', 'lurou', 'beefnoodle']) S.dishes[k] = { lv: 1, price: DISH[k].p, on: true };
    S.staff = [S.staff[0]];
    for (let i = 0; i < 6; i++) S.staff.push(Game.newStaff({ name: '員工', job: i < 5 ? 'cook' : 'tout', cook: 10, serv: 10, charm: 10 }));
    Game.boot();
    S.t = WEEK_LEN * 0.72;
    for (let i = 0; i < 400; i++) Game.step(1 / 20);
    Game.pending = [];
  },
  title() {
    this.state = 'title';
    $('#title').hidden = false; $('#hud').hidden = true; $('#bar').hidden = true; $('#panel').hidden = true; $('#buildbar').hidden = true; $('#info').hidden = true;
    R.top = 0; R.bottom = 0; R.zoomMul = 1; R.pan.x = 0; R.pan.y = 0;
    const box = $('#slots'); let h = '';
    for (let i = 0; i < 3; i++) {
      const m = this.slotMeta(i);
      h += m ? `<button class="slotbtn" data-a2="cont" data-v="${i}"><b>繼續 ・ 存檔 ${i + 1}</b><small>${esc(m.shop)}・第${m.y}年${m.m}月・${money(m.money)}・第${m.rank}名</small></button>`
        : `<button class="slotbtn empty" data-a2="new" data-v="${i}"><b>新遊戲 ・ 存檔 ${i + 1}</b><small>空的欄位</small></button>`;
    }
    box.innerHTML = h;
    this.titleScen();
    const mb = document.querySelector('[data-a2="music"] b'); if (mb) mb.textContent = Prefs.d.music ? '開' : '關';
    Music.play('title');
  },
  titleScen() {
    const L = Legacy.d;
    let h = '<label>遊戲模式（開新遊戲時使用）</label><div class="scen">';
    for (const sc of SCENARIOS) {
      const open = Legacy.scenOpen(sc);
      if (!open && this.scen === sc.id) this.scen = 'std';
      h += `<button class="${this.scen === sc.id ? 'on' : ''} ${open ? '' : 'lock'}" data-a2="scen" data-v="${sc.id}"><b>${open ? '' : '🔒'}${sc.n}</b></button>`;
    }
    const cur = SCENARIOS.find(x => x.id === this.scen);
    h += `</div><small class="scd">${cur.d}</small>`;
    const any = L.pts > 0 || Object.keys(L.perks).length;
    h += `<button class="legbtn" data-a2="perks">傳承加成・點數 <b>${L.pts}</b>${Object.keys(L.ach).length ? `・成就 ${Object.keys(L.ach).length}/${ACHS.length}` : ''}</button>`;
    h += `<div class="perks" ${this.showPerks ? '' : 'hidden'}>${PERKS.map(p => { const lv = Legacy.perkLv(p.id), c = Legacy.perkCost(p); return `<div><b>${p.n} <span class="lv">${lv}/${p.max}</span></b><small>${p.d}（每級）</small><button class="btn ${lv < p.max && L.pts >= c ? 'go' : 'dis'}" data-a2="perk" data-v="${p.id}">${lv >= p.max ? '滿級' : c + ' 點'}</button></div>`; }).join('')}<small class="scd">${any ? '加成會套用在之後的新遊戲。' : '解鎖成就、看到結局或傳承都能得到點數。'}</small></div>`;
    $('#scenBox').innerHTML = h;
  },
  toTitle() { UI.closePanel(); UI.endBuild(); UI.closeInfo(); this.demo(); this.title(); },
  startNew(i, o = {}) {
    const n = o.name || ($('#shopName').value || '').trim().slice(0, 6) || '阿福小吃';
    const scen = o.scen || this.scen || 'std';
    Game.demoMode = false;
    UI.closePanel(); UI.closeInfo();
    Game.fresh(n, { scen, gen: o.gen || 1, perks: Legacy.d.perks, noTut: (o.gen || 1) > 1 || Prefs.d.tutDone && scen !== 'std' });
    UI.slot = i;
    this.enter();
    const sc = SCENARIOS.find(x => x.id === scen);
    if (o.gen > 1) Game.say('intro', { title: `第 ${o.gen} 代老闆`, big: n, text: `上一代把店交給你了！傳承加成已經生效。<br>從小攤車重新開始，看看這一代能走多遠吧！`, icon: 'star' });
    else if (scen !== 'std') Game.say('intro', { title: sc.n, big: n, text: sc.d, icon: 'star' });
    UI.save(i, false);
  },
  enter() {
    this.state = 'play';
    $('#title').hidden = true; $('#hud').hidden = false; $('#bar').hidden = false;
    R.zoomMul = 1; R.pan.x = 0; R.pan.y = 0;
    UI.setSpeed(1);
    UI.measure();
    this.seasonMusic();
    Snd.play('start');
  },
  seasonMusic() { if (this.state === 'play') Music.play(Game.season()); },
  slotMeta(i) {
    try { const m = JSON.parse(localStorage.getItem('shop.meta.' + i) || 'null'); return m; } catch (e) { return null; }
  },
  saveSlot(i) {
    try {
      const S = Game.S;
      localStorage.setItem('shop.save.' + i, JSON.stringify(S));
      localStorage.setItem('shop.meta.' + i, JSON.stringify({ shop: S.shop, y: Game.year(), m: Game.month(), money: S.money, rank: S.rank, at: Date.now() }));
      return true;
    } catch (e) { return false; }
  },
  loadSlot(i) {
    try {
      const S = JSON.parse(localStorage.getItem('shop.save.' + i) || 'null');
      if (!S || !S.items) return false;
      Game.demoMode = false;
      Game.load(S); UI.slot = i;
      Game.pending = [];
      this.enter();
      return true;
    } catch (e) { console.warn(e); return false; }
  },
  input() {
    const cv = $('#cv');
    const ptrs = new Map(); let drag = null, pinch = null;
    cv.addEventListener('pointerdown', e => {
      Snd.init();
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, px: R.pan.x, py: R.pan.y, moved: false, paint: UI.mode === 'build' && F[UI.sel]?.cat === 'floor', t: performance.now() };
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: R.zoomMul }; drag = null;
      }
    });
    cv.addEventListener('pointermove', e => {
      if (this.state !== 'play') return;
      const p = ptrs.get(e.pointerId);
      if (!p) { const [wx, wy] = R.toWorld(e.clientX, e.clientY); UI.hoverWorld(wx, wy); return; }
      p.x = e.clientX; p.y = e.clientY;
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        R.zoomMul = clamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, 0.6, 3.5);
        return;
      }
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.hypot(dx, dy) > 8) drag.moved = true;
        const [wx, wy] = R.toWorld(e.clientX, e.clientY);
        if (drag.paint) { if (drag.moved) { const k = Math.floor(wx / TILE) + ',' + Math.floor(wy / TILE); if (k !== drag.lastK) { drag.lastK = k; UI.tapWorld(wx, wy, true); } } return; }
        if (drag.moved) { R.pan.x = drag.px - dx * R.dpr / R.z; R.pan.y = drag.py - dy * R.dpr / R.z; }
        UI.hoverWorld(wx, wy);
      }
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; return; }
      if (drag && !drag.moved && this.state === 'play') { const [wx, wy] = R.toWorld(e.clientX, e.clientY); UI.tapWorld(wx, wy, false); }
      drag = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { if (this.state !== 'play') return; e.preventDefault(); R.zoomMul = clamp(R.zoomMul * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.6, 3.5); }, { passive: false });
    addEventListener('keydown', e => {
      if (this.state !== 'play' || e.target.closest('input')) return;
      if (e.code === 'Space') { e.preventDefault(); UI.setSpeed(UI.speed ? 0 : UI.lastSpeed); }
      if (/^Digit[0-3]$/.test(e.code)) UI.setSpeed(+e.code.slice(5));
      if (e.code === 'Escape') { if (UI.modal) return; if (UI.mode !== 'play') UI.endBuild(); else if (UI.panel) UI.closePanel(); else UI.closeInfo(); }
    });
    // 標題畫面按鈕
    $('#title').addEventListener('click', e => {
      const b = e.target.closest('[data-a2]'); if (!b) return;
      Snd.init();
      const i = +b.dataset.v;
      if (b.dataset.a2 === 'new') this.startNew(i);
      else if (b.dataset.a2 === 'cont') { if (!this.loadSlot(i)) UI.toast('讀取失敗', 'bad'); }
      else if (b.dataset.a2 === 'fresh') { const s = [0, 1, 2].find(k => !this.slotMeta(k)); this.startNew(s === undefined ? (Prefs.d.lastSlot + 1) % 3 : s); }
      else if (b.dataset.a2 === 'scen') { const sc = SCENARIOS.find(x => x.id === b.dataset.v); if (!Legacy.scenOpen(sc)) { Snd.play('bad'); $('#scenBox .scd').textContent = '通關一次（看到結局）或傳承後解鎖。'; return; } this.scen = sc.id; Snd.play('click'); this.titleScen(); }
      else if (b.dataset.a2 === 'perks') { this.showPerks = !this.showPerks; Snd.play('tab'); this.titleScen(); }
      else if (b.dataset.a2 === 'perk') { const r = Legacy.buy(b.dataset.v); Snd.play(r ? 'bad' : 'level'); this.titleScen(); }
      else if (b.dataset.a2 === 'music') { Prefs.d.music = !Prefs.d.music; Prefs.d.sfx = Prefs.d.music; Prefs.save(); Snd.applyVol(); b.querySelector('b').textContent = Prefs.d.music ? '開' : '關'; }
    });
  },
  frame(t) {
    const dt = Math.min(0.1, (t - (this.last || t)) / 1000); this.last = t;
    if (this.state === 'title') {
      Game.step(dt);
      Game.pending = [];
      R.top = 0; R.bottom = 0;
    } else {
      UI.checkPending();
      const sp = UI.modal ? 0 : SPEEDS[UI.speed];
      Music.paused = sp === 0 && !UI.modal;
      if (sp) {
        this.acc += dt * sp;
        let n = 0;
        while (this.acc >= 1 / 30 && n < 12) { Game.step(1 / 30); this.acc -= 1 / 30; n++; if (Game.pending.length) { this.acc = 0; break; } }
      }
      this.hudT = (this.hudT || 0) - dt;
      if (this.hudT <= 0) { this.hudT = 0.25; UI.refreshHud(); UI.measure(); Tut.update(); if (UI.info?.s && !UI.inf.hidden) UI.showStaff(Game.srt.get(UI.info.s.uid)); }
      this.saveT += dt;
      if (this.saveT > 60) { this.saveT = 0; UI.save(UI.slot, false); }
    }
    R.draw(dt);
    requestAnimationFrame(t2 => this.frame(t2));
  },
};

// 測試/除錯用
window.__shop = {
  Game, UI, Main, R,
  run(weeks, auto) {
    for (let w = 0; w < weeks; w++) {
      const target = Game.S.week + 1;
      let guard = 0;
      while (Game.S.week < target && guard++ < 2000) {
        Game.step(1 / 15);
        while (Game.pending.length) { const p = Game.pending.shift(); if (p.k === 'contest') Game.runContest(Game.known().sort((a, b) => Game.contestScore(b) - Game.contestScore(a))[0]); if (p.k === 'award') Game.applyAward(p); if (p.k === 'quest' && auto) Game.acceptQuest(p.q); }
      }
      if (auto) this.bot();
    }
    return this.stat();
  },
  stat() { const S = Game.S; return { y: Game.year(), m: Game.month(), money: Math.round(S.money), pop: Math.round(S.pop), idea: S.idea, rank: S.rank, lv: S.lv, staff: S.staff.length, dishes: Game.known().length, combos: Object.keys(S.combos).length, items: S.items.length, cust: S.st.cust, sat: S.st.satN ? Math.round(S.st.satS / S.st.satN) : 0, rate: +Game.spawnRate().toFixed(2) }; },
  // 簡單的自動玩家：模擬一般玩家的決策
  bot() {
    const S = Game.S, G = Game;
    const free = () => { const out = []; for (let y = 0; y < S.H - 1; y++) for (let x = 0; x < S.W; x++) if (!G.itemAt(x, y)) out.push([x, y]); return shuffle(out); };
    const tryPlace = id => { for (const [x, y] of free()) if (!G.place(id, x, y)) return true; return false; };
    if (!G.canExpand() && S.money > LEVELS[S.lv + 1].cost + G.rent() * 4 + S.staff.reduce((a, s) => a + s.sal, 0) * 3) G.expand();
    const nx = LEVELS[S.lv + 1], saving = nx && S.pop >= nx.pop;
    const spend = v => !saving || S.money - v > nx.cost;
    // 研發
    for (let k = 0; k < (S.week % 2 ? 1 : 0); k++) {
      const cand = Object.keys(DISH).filter(d => !S.dishes[d] && G.canUse(DISH[d].a) && G.canUse(DISH[d].b));
      if (cand.length && S.idea >= G.ideaCost() && S.money > G.moneyCost() * 3) { const d = cand[0]; G.research(DISH[d].a, DISH[d].b); }
      else if (S.idea >= G.ideaCost() * 2 && S.money > G.moneyCost() * 3) { const ks = Object.keys(ING).filter(k => S.ings[k]); G.research(pick(ks), pick(ks)); }
    }
    for (const k in ING) if (!S.ings[k] && ING[k].lv <= S.lv && S.money > ING[k].buy * 4) G.buyIng(k);
    // 攤位
    const nst0 = S.items.filter(i => F[i.id].cat === 'station').length, cooksN0 = S.staff.filter(s => s.job === 'cook').length;
    for (const st of Object.keys(STN)) { const f = FAC.find(f => f.st === st); if (cooksN0 >= nst0 && !G.hasStation(st) && f.lv <= S.lv && S.money > f.price * 2 && G.known().some(k => DISH[k].st === st)) tryPlace(f.id); }
    const nst = S.items.filter(i => F[i.id].cat === 'station').length, nseat = S.items.filter(i => F[i.id].cat === 'seat').reduce((a, i) => a + F[i.id].seats, 0);
    const busy = [...G.rts.values()].some(r => r.queue.length >= 4);
    const cooksN = S.staff.filter(s => s.job === 'cook').length;
    if (busy && S.money > 15000 && cooksN > nst) { const r = [...G.rts.values()].filter(r => F[r.it.id].cat === 'station').sort((a, b) => b.queue.length - a.queue.length)[0]; if (r) tryPlace(r.it.id); }
    if (nseat < nst * 2.5 && S.money > 3000) tryPlace(S.lv >= 2 ? 'round' : S.lv >= 1 ? 'wood' : 'stool');
    // 員工
    const cooks = S.staff.filter(s => s.job === 'cook').length, servs = S.staff.filter(s => s.job === 'serve').length;
    if (S.staff.length < LEVELS[S.lv].staff && S.hire.length && S.money > S.hire[0].sal * 6) {
      const i = S.hire.reduce((b, s, i) => (s.cook + s.serv + s.charm > S.hire[b].cook + S.hire[b].serv + S.hire[b].charm ? i : b), 0);
      G.hire(i); const s = S.staff[S.staff.length - 1];
      G.setJob(s, cooks < nst + 1 ? 'cook' : servs < Math.max(1, nst / 3) ? 'serve' : 'tout');
    }
    // 裝飾
    if (S.money > 20000 && Math.random() < 0.5 && spend(20000)) { const opts = FAC.filter(f => (f.cat === 'decor' || f.cat === 'fun') && f.lv <= S.lv && !f.unlock && f.price < S.money / 6); if (opts.length) tryPlace(pick(opts).id); }
    // 改良
    for (const k of G.known()) if (S.dishes[k].lv < 10 && S.idea > G.upCost(k).idea * 2 && S.money > G.upCost(k).money * 4 && spend(G.upCost(k).money)) G.upgradeDish(k);
    if (S.money > 30000 && spend(5000)) { const s = pick(S.staff); G.train(s, { cook: 'cook', serve: 'serv', tout: 'charm' }[s.job]); }
    // 新系統：秘方、活動、分店（有閒錢才用）
    if (!this.noNew) {
      for (const t of TECHS) { const c = G.techCost(t); if (G.tech(t.id) < 5 && S.idea >= c.idea * 1.5 && S.money > c.money * 3 && spend(c.money)) { G.techUp(t.id); break; } }
      if (!S.hostCD) { const e = HOSTEV.filter(e => e.lv <= S.lv && S.money > G.hostCost(e) * 4 && spend(G.hostCost(e))).pop(); if (e && Math.random() < 0.3) G.host(e.id); }
      for (const b of BRANCHES) { const c = G.branchCost(b); if (S.lv >= b.lv && (S.br[b.id] || 0) < 5 && S.money > c * 2.5 && spend(c)) { G.buyBranch(b.id); break; } }
    }
    for (const it of S.items) if (F[it.id].cat === 'station' && it.lv < G.maxStLv() && S.money > G.upgradeCost(it) * 5 && spend(G.upgradeCost(it)) && Math.random() < 0.3) G.upgrade(it);
  },
};
addEventListener('DOMContentLoaded', () => Main.init());
