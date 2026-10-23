'use strict';
// 深淵地牢：介面（HUD、選單、背包、選擇目標、輸入）
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEYDIR = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0],
  KeyQ: [-1, -1], KeyE: [1, -1], KeyZ: [-1, 1], KeyC: [1, 1], Numpad8: [0, -1], Numpad2: [0, 1], Numpad4: [-1, 0], Numpad6: [1, 0],
  Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1], Home: [-1, -1], PageUp: [1, -1], End: [-1, 1], PageDown: [1, 1],
};
const UI = {
  touch: false, ov: null, travel: null, exploring: false, resting: 0, target: null, tgt: null, hover: null, dirtyLog: true, miniDirty: true,
  invSel: null, invMode: 'normal', stepT: 0, hold: null, holdT: 0, hudSig: '', state: 'title', newMode: 'normal', selCls: 'warrior', demoT: 0,

  init() {
    this.touch = matchMedia('(pointer: coarse)').matches;
    document.body.classList.toggle('touch', this.touch);
    document.body.classList.toggle('dpad', !!Store.set.dpad);
    // 標題
    $('tContinue').onclick = () => this.continueRun();
    $('tNew').onclick = () => this.openNew('normal');
    $('tDaily').onclick = () => this.openNew('daily');
    $('tAltar').onclick = () => this.openAltar();
    $('tRecords').onclick = () => this.openRecords();
    $('tHelp').onclick = () => this.show('ovHelp');
    for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { Snd.play('click'); this.back(b.dataset.back); };
    for (const b of document.querySelectorAll('.tog[data-opt]')) b.onclick = () => this.toggle(b.dataset.opt);
    $('newStart').onclick = () => this.startRun();
    // 遊戲中按鈕
    for (const b of document.querySelectorAll('#bar [data-a]')) b.onclick = e => { e.stopPropagation(); this.action(b.dataset.a); };
    $('bMenu').onclick = () => this.openMenu();
    $('bSound').onclick = () => { const on = !(Store.set.music || Store.set.sfx); Store.set.music = Store.set.sfx = on; Store.saveSet(); Snd.applyVol(); this.syncToggles(); };
    $('mini').onclick = () => this.openMap();
    $('log').onclick = () => this.openLog();
    $('tgtOk').onclick = () => this.confirmTarget();
    $('tgtNext').onclick = () => this.cycleTarget();
    $('tgtCancel').onclick = () => this.endTarget();
    for (const b of document.querySelectorAll('#dpad [data-d]')) {
      const [dx, dy] = b.dataset.d.split(',').map(Number);
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Snd.init(); this.stopAuto(); this.hold = [dx, dy]; this.doDir(dx, dy); this.holdT = now() + 0.32; });
      const up = () => { this.hold = null; };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    }
    // 選單
    $('mResume').onclick = () => this.closeOv();
    $('mHelp').onclick = () => this.show('ovHelp', 'ovMenu');
    $('mLog').onclick = () => this.openLog();
    $('mSave').onclick = () => { Game.save(); this.toTitle(); };
    $('mGiveUp').onclick = () => this.confirm('確定要放棄這次冒險嗎？角色會死亡，無法復原。', () => { this.closeOv(); Game.die('放棄了冒險'); });
    $('mHall').onclick = () => { Game.save(); location.href = '../index.html'; };
    $('endAgain').onclick = () => { const c = G.cls; this.openNew(G.daily ? 'daily' : 'normal'); this.selCls = c; this.renderClasses(); };
    $('endTitle').onclick = () => this.toTitle();
    $('endRec').onclick = () => this.openRecords('ovEnd');
    $('dlgOk').onclick = () => { const f = this.dlgFn; this.hideDlg(); if (f) f(); };
    $('dlgNo').onclick = () => this.hideDlg();
    $('ovMap').onclick = () => this.closeOv();
    // 輸入
    addEventListener('keydown', e => this.onKey(e));
    cv.addEventListener('pointerdown', e => this.onPtrDown(e));
    cv.addEventListener('pointerup', e => this.onPtrUp(e));
    cv.addEventListener('pointermove', e => this.onPtrMove(e));
    cv.addEventListener('pointerleave', () => { this.hover = null; this.tip(''); });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !this.touch) { this.touch = true; document.body.classList.add('touch'); this.layout(); } Snd.init(); }, true);
    addEventListener('keydown', () => Snd.init(), { once: true });
    this.syncToggles();
    this.toTitle();
  },

  // ---------- 畫面切換 ----------
  show(id, from) {
    for (const o of document.querySelectorAll('.ov')) o.hidden = o.id !== id;
    this.ov = id; this.ovFrom = from || null;
    this.stopAuto();
    if (id) Snd.play('click');
  },
  closeOv() { for (const o of document.querySelectorAll('.ov')) o.hidden = true; this.ov = null; this.tip(''); },
  back(to) {
    if (this.ovFrom) { const f = this.ovFrom; this.ovFrom = null; if (f === 'ovMenu') this.openMenu(); else this.show(f); return; }
    if (to === 'title') this.toTitle(); else if (to === 'play') this.closeOv(); else this.show(to);
  },
  toTitle() {
    this.state = 'title'; document.body.classList.remove('playing');
    this.endTarget(true);
    this.makeDemo();
    $('tContinue').hidden = !Store.hasRun();
    $('tSouls').textContent = Store.meta.souls || 0;
    const d = Store.meta.daily && Store.meta.daily[todayStr()];
    $('tDaily').querySelector('small').textContent = d ? '今日最佳 ' + d.score + ' 分' : '今天的地牢，每個人都一樣';
    this.show('ovTitle');
    this.layout();
    Music.play('title');
  },
  syncToggles() {
    for (const b of document.querySelectorAll('.tog[data-opt]')) { const k = b.dataset.opt, on = k === 'zoom' ? null : !!Store.set[k]; const s = b.querySelector('b'); if (k === 'zoom') s.textContent = ['遠', '中', '近'][clamp((Store.set.zoom | 0) + 1, 0, 2)]; else { s.textContent = on ? '開' : '關'; b.classList.toggle('on', on); } }
    $('bSound').classList.toggle('off', !(Store.set.music || Store.set.sfx));
    document.body.classList.toggle('dpad', !!Store.set.dpad);
  },
  toggle(k) {
    if (k === 'zoom') { Store.set.zoom = ((Store.set.zoom | 0) + 2) % 3 - 1; this.layout(); }
    else Store.set[k] = !Store.set[k];
    Store.saveSet(); Snd.init(); Snd.applyVol(); this.syncToggles(); this.layout(); Snd.play('select');
  },
  confirm(text, fn, okText = '確定') { $('dlgText').textContent = text; $('dlgOk').textContent = okText; this.dlgFn = fn; $('ovDlg').hidden = false; this.dlgOpen = true; },
  hideDlg() { $('ovDlg').hidden = true; this.dlgOpen = false; this.dlgFn = null; },

  // ---------- 標題背景：自動走動的英雄 ----------
  makeDemo() {
    const depth = 1 + ((Math.random() * 16) | 0);
    const rng = new RNG('demo' + Math.random());
    G = { demo: 1, depth, rng, nid: 1, looks: {}, known: {}, tried: {}, log: [], stats: {}, P: { id: 0, isP: 1, x: 0, y: 0, cls: CLASS_ORDER[(Math.random() * 3) | 0], lvl: 1, str: 0, st: {}, perks: {}, eq: {}, inv: [], hp: 1, mhp: 1 } };
    const F = Gen.make(depth, rng); F.seen = new Uint8Array(F.w * F.h); F.mons = []; F.items = []; F.traps = []; F.clouds = []; F.visited = {};
    G.F = F; [G.P.x, G.P.y] = F.start;
    for (let i = 0; i < 6; i++) { const p = Game.randomFree(5); const k = Game.randomMonKind(); const m = Game.makeMon(k, p[0], p[1]); if (!MON[k].disguise) F.mons.push(m); }
    for (let i = 0; i < 8; i++) { const p = Game.randomFree(3); F.items.push({ x: p[0], y: p[1], it: Game.randomItem(depth) }); }
    Art.buildTiles(F.biome); Game.updateFov(); Render.snapCam(); this.demoPath = null; this.demoT = now() + 40;
  },
  demoStep(t) {
    if (!G || !G.demo) return;
    if (t > this.demoT) { this.makeDemo(); return; }
    if (t < this.stepT) return;
    this.stepT = t + 0.38;
    if (!this.demoPath || !this.demoPath.length) {
      const p = Game.explorePath() || FOV.path(G.F, G.P.x, G.P.y, ...Game.randomFree(6), (x, y) => TP[Game.tile(x, y)].walk && Game.tile(x, y) !== T.LAVA);
      this.demoPath = p ? p.slice(0, 12) : null; if (!p) { this.makeDemo(); return; }
    }
    const [x, y] = this.demoPath.shift();
    if (Game.monAt(x, y) || !TP[Game.tile(x, y)].walk || Game.tile(x, y) === T.LAVA) { this.demoPath = null; return; }
    if (Game.tile(x, y) === T.DOOR) Game.setTile(x, y, T.ODOOR);
    G.P.x = x; G.P.y = y; G.F.items = G.F.items.filter(o => !(o.x === x && o.y === y));
    Game.updateFov();
  },

  // ---------- 開新局 ----------
  openNew(mode) {
    this.newMode = mode;
    $('newHead').textContent = mode === 'daily' ? '每日挑戰' : '新的冒險';
    const d = todayStr();
    $('dailyInfo').hidden = mode !== 'daily';
    $('seedRow').hidden = mode === 'daily';
    if (mode === 'daily') { const best = Store.meta.daily[d]; $('dailyInfo').innerHTML = '今天的種子：<b>D' + d + '</b>。今天每個人走進的都是同一座地牢。' + (best ? '<br>你今天的最佳紀錄：' + best.score + ' 分（第 ' + best.depth + ' 層）' : ''); }
    if (!Store.meta.unlocked[this.selCls]) this.selCls = 'warrior';
    this.renderClasses();
    this.show('ovNew', this.state === 'title' ? null : null);
  },
  renderClasses() {
    const el = $('clsList'); el.innerHTML = '';
    for (const k of CLASS_ORDER) {
      const C = CLASSES[k], un = !!Store.meta.unlocked[k];
      const b = document.createElement('button'); b.className = 'cls' + (k === this.selCls ? ' on' : '') + (un ? '' : ' locked');
      b.innerHTML = '<canvas width="16" height="16"></canvas><div><b>' + C.n + '</b><small>' + C.en + '</small><p>' + (un ? C.d : '未解鎖：' + C.lock) + '</p>' +
        (un ? '<em>HP ' + C.hp + ' · 技能：' + C.abil.map(a => ABIL[a].n).join('、') + '</em>' : '') + '</div>';
      b.querySelector('canvas').getContext('2d').drawImage(Art.sprite(C.spr).c, 0, 0);
      if (!un) b.querySelector('canvas').style.filter = 'brightness(0)';
      b.onclick = () => { if (!un) { Snd.play('warn'); return; } this.selCls = k; Snd.play('select'); this.renderClasses(); };
      el.appendChild(b);
    }
    const C = CLASSES[this.selCls];
    $('clsInfo').innerHTML = '<b>' + C.n + '</b>　' + C.tip + '<br>' + C.abil.map(a => '<span class="ab">' + ABIL[a].n + '</span>' + ABIL[a].d).join('<br>');
  },
  startRun() {
    Snd.init();
    let seed = this.newMode === 'daily' ? 'D' + todayStr() : ($('seedIn').value || '').trim().toUpperCase().slice(0, 16);
    const go = () => {
      Store.clearRun();
      this.state = 'play'; document.body.classList.add('playing');
      Game.newRun(this.selCls, seed || null, this.newMode === 'daily');
      Snd.play('start');
      this.closeOv(); this.layout(); Render.snapCam();
      this.dirtyLog = true;
    };
    if (Store.hasRun()) this.confirm('你還有一場進行中的冒險，開始新的冒險會覆蓋它。確定嗎？', go, '開始'); else go();
  },
  continueRun() {
    Snd.init();
    if (!Game.load()) { this.confirm('存檔讀取失敗。', null); $('tContinue').hidden = true; return; }
    this.state = 'play'; document.body.classList.add('playing');
    this.closeOv(); this.layout(); Render.snapCam(); this.dirtyLog = true;
  },

  // ---------- 靈魂祭壇 ----------
  openAltar() {
    const M = Store.meta, el = $('altarList'); el.innerHTML = '';
    $('altarSouls').textContent = M.souls || 0;
    for (const u of META_UPS) {
      const lv = M.ups[u.id] || 0, max = u.cost.length, cost = u.cost[lv];
      const row = document.createElement('div'); row.className = 'up';
      row.innerHTML = '<div><b>' + u.n + '</b> <span class="dots">' + '●'.repeat(lv) + '○'.repeat(max - lv) + '</span><p>' + u.d + '</p></div>';
      const b = document.createElement('button');
      if (lv >= max) { b.textContent = '已完成'; b.disabled = true; }
      else { b.innerHTML = '<span class="soul"></span>' + cost; b.disabled = (M.souls || 0) < cost; b.onclick = () => { M.souls -= cost; M.ups[u.id] = lv + 1; Store.saveMeta(); Snd.play('level'); this.openAltar(); }; }
      row.appendChild(b); el.appendChild(row);
    }
    const lockInfo = CLASS_ORDER.filter(k => CLASSES[k].lock).map(k => (Store.meta.unlocked[k] ? '✓ ' : '未解鎖 ') + CLASSES[k].n + '：' + CLASSES[k].lock).join('<br>');
    $('altarNote').innerHTML = '每次冒險結束都會依照深度、擊殺數與頭目獲得靈魂石。<br>' + lockInfo;
    if (this.ov !== 'ovAltar') this.show('ovAltar');
  },
  openRecords(from) {
    const M = Store.meta;
    $('recStats').innerHTML = [['冒險次數', M.runs || 0], ['勝利', M.wins || 0], ['最深', (M.deepest || 0) + ' 層'], ['總擊殺', M.kills || 0], ['頭目', M.bossKills || 0]].map(([a, b]) => '<div><small>' + a + '</small><b>' + b + '</b></div>').join('');
    const el = $('recList');
    if (!M.records || !M.records.length) el.innerHTML = '<p class="empty">還沒有任何紀錄。去地牢裡留下你的名字吧！</p>';
    else el.innerHTML = M.records.slice(0, 30).map((r, i) => '<div class="rec' + (r.win ? ' win' : '') + '"><span class="rk">' + (i + 1) + '</span><canvas data-c="' + r.cls + '" width="16" height="16"></canvas><div class="rb"><b>' + r.score + ' 分</b> · ' + CLASSES[r.cls].n + ' Lv' + r.lvl + ' · 第 ' + r.depth + ' 層' + (r.daily ? ' <span class="tag">每日</span>' : '') + '<p>' + esc(r.cause) + '</p><small>' + r.date + ' · ' + r.turns + ' 回合 · 種子 <button class="seed" data-s="' + esc(r.seed) + '">' + esc(r.seed) + '</button></small></div></div>').join('');
    for (const c of el.querySelectorAll('canvas')) c.getContext('2d').drawImage(Art.sprite(CLASSES[c.dataset.c].spr).c, 0, 0);
    for (const b of el.querySelectorAll('.seed')) b.onclick = () => { this.openNew('normal'); $('seedIn').value = b.dataset.s.startsWith('D') ? '' : b.dataset.s; if (b.dataset.s.startsWith('D')) $('seedIn').value = b.dataset.s; };
    this.show('ovRecords', from);
  },

  // ---------- 遊戲中選單 ----------
  openMenu() {
    if (!G || G.demo || G.over) return;
    $('menuInfo').innerHTML = CLASSES[G.cls].n + ' Lv' + G.P.lvl + ' · 第 ' + G.depth + ' 層 · ' + G.turn + ' 回合<br>種子 <b>' + esc(G.seed) + '</b>' + (G.daily ? '（每日挑戰）' : '');
    const P = G.P, perks = Object.keys(P.perks);
    $('menuPerks').innerHTML = perks.length ? '天賦：' + perks.map(k => PERKS[k].n + (P.perks[k] > 1 ? '×' + P.perks[k] : '')).join('、') : '';
    this.show('ovMenu');
  },
  openLog() {
    if (!G) return;
    $('logList').innerHTML = G.log.slice().reverse().map(l => '<p style="color:' + COL[l.c] + '">' + esc(l.t) + (l.x > 1 ? ' ×' + l.x : '') + '</p>').join('');
    this.show('ovLog', this.ov === 'ovMenu' ? 'ovMenu' : null);
  },
  openMap() {
    if (!G || G.demo) return;
    const c = $('bigmap'), F = G.F, s = Math.max(4, Math.floor(Math.min(innerWidth * 0.92 / F.w, innerHeight * 0.75 / F.h) * (window.devicePixelRatio || 1)));
    Render.minimap(c, s);
    c.style.width = Math.min(innerWidth * 0.92, F.w * s / (window.devicePixelRatio || 1)) + 'px';
    $('mapTitle').textContent = '第 ' + G.depth + ' 層 · ' + BIOMES[F.biome].n;
    this.show('ovMap');
  },

  // ---------- 升級天賦 ----------
  openPerk() {
    const el = $('perkList'); el.innerHTML = '';
    G.perkChoices.forEach((k, i) => {
      const p = PERKS[k], b = document.createElement('button'); b.className = 'perk';
      b.innerHTML = '<kbd>' + (i + 1) + '</kbd><b>' + p.n + '</b><p>' + p.d + '</p>' + (G.P.perks[k] ? '<small>目前 ' + G.P.perks[k] + ' / ' + p.max + '</small>' : '');
      b.onclick = () => this.pickPerk(k);
      el.appendChild(b);
    });
    $('perkLv').textContent = '升到 ' + G.P.lvl + ' 級！選擇一項天賦';
    this.show('ovPerk');
  },
  pickPerk(k) { Game.choosePerk(k); Snd.play('level'); this.closeOv(); },

  // ---------- 背包 ----------
  sortedInv(mode) {
    let list = G.P.inv.slice();
    list.sort((a, b) => CAT_ORDER.indexOf(a.c) - CAT_ORDER.indexOf(b.c) || (Game.isEquipped(b) - Game.isEquipped(a)) || a.k.localeCompare(b.k));
    if (mode === 'identify') list = list.filter(o => Game.needsId(o));
    if (mode === 'throw') list = list.filter(o => o.c === 'throw' || o.c === 'potion');
    return list;
  },
  openInv(mode = 'normal') {
    if (!G || G.demo || G.over) return;
    this.invMode = mode; this.invSel = null;
    this.renderInv();
    this.show('ovInv');
  },
  renderInv() {
    const P = G.P, list = this.sortedInv(this.invMode), el = $('invList');
    $('invHead').innerHTML = { normal: '背包', identify: '選擇要辨識的道具', throw: '選擇要投擲的東西' }[this.invMode] + ' <small>' + P.inv.length + ' / ' + P.invMax + ' · <span class="gold">' + P.gold + ' 金幣</span>' + (Game.inShop() ? ' · 商店中' : '') + '</small>';
    el.innerHTML = '';
    if (!list.length) el.innerHTML = '<p class="empty">' + (this.invMode === 'identify' ? '沒有需要辨識的道具。' : '什麼都沒有。') + '</p>';
    let lastC = null;
    list.forEach((it, i) => {
      if (it.c !== lastC) { lastC = it.c; const h = document.createElement('h4'); h.textContent = CAT_NAME[it.c]; el.appendChild(h); }
      const b = document.createElement('button'); b.className = 'it' + (this.invSel === it.id ? ' on' : '') + (Game.isEquipped(it) ? ' eq' : '');
      b.innerHTML = '<kbd>' + String.fromCharCode(97 + i) + '</kbd><canvas width="16" height="16"></canvas><span>' + esc(Game.itemName(it)) + '</span>' + (Game.isEquipped(it) ? '<em>裝備中</em>' : '');
      b.querySelector('canvas').getContext('2d').drawImage(Art.itemSprite(it).c, 0, 0);
      b.onclick = () => this.selectItem(it);
      el.appendChild(b);
    });
    this.renderDetail();
  },
  selectItem(it) {
    if (this.invMode === 'identify') { Game.finishIdentify(it); Snd.play('read'); this.closeOv(); return; }
    if (this.invMode === 'throw') { this.closeOv(); this.beginTarget({ kind: 'throw', it, range: 9 }); return; }
    this.invSel = it.id; Snd.play('select'); this.renderInv();
  },
  itemActions(it) {
    const K = ITEMS[it.k], acts = [], eq = Game.isEquipped(it);
    if (K.c === 'weapon' || K.c === 'armor' || K.c === 'ring') acts.push([eq ? '卸下' : '裝備', () => eq ? Game.unequip(it) : Game.equip(it)]);
    if (K.c === 'potion') acts.push(['喝下', () => Game.quaff(it)]);
    if (K.c === 'scroll') acts.push(['閱讀', () => { Game.read(it); if (G.pendingId) { this.openInv('identify'); return 'keep'; } }]);
    if (K.c === 'food') acts.push(['吃掉', () => Game.eat(it)]);
    if (K.c === 'wand') acts.push(['揮動', () => { this.closeOv(); this.beginTarget({ kind: 'zap', it, range: 9 }); return 'keep'; }]);
    if (K.c === 'throw' || K.c === 'potion') acts.push(['投擲', () => { this.closeOv(); this.beginTarget({ kind: 'throw', it, range: 9 }); return 'keep'; }]);
    if (Game.inShop() && !(eq && it.cursed)) acts.push(['賣出 ' + Game.sellValue(it) + '金', () => { Game.sell(it); this.renderInv(); return 'keep'; }]);
    acts.push(['丟下', () => Game.drop(it)]);
    return acts;
  },
  renderDetail() {
    const el = $('invDetail'), it = this.invSel != null ? Game.inv(this.invSel) : null;
    if (!it) { el.innerHTML = '<p class="hint">' + (this.touch ? '點一下道具查看說明。' : '按字母鍵選擇道具，再按數字鍵執行動作。') + '</p>'; return; }
    const K = ITEMS[it.k];
    let cmp = '';
    if (K.c === 'weapon' || K.c === 'armor') {
      const cur = Game.equipped(K.c === 'weapon' ? 'w' : 'a');
      if (cur && cur !== it) cmp = '<small class="cmp">目前裝備：' + esc(Game.itemName(cur)) + '（' + (K.c === 'weapon' ? '傷害 ' + ITEMS[cur.k].dmg.join('–') : '護甲 ' + ITEMS[cur.k].arm) + '）</small>';
    }
    el.innerHTML = '<div class="dh"><canvas width="16" height="16"></canvas><b>' + esc(Game.itemName(it)) + '</b></div><p>' + esc(Game.itemDesc(it)) + '</p>' + cmp + '<div class="acts"></div>';
    el.querySelector('canvas').getContext('2d').drawImage(Art.itemSprite(it).c, 0, 0);
    const box = el.querySelector('.acts');
    this.itemActions(it).forEach(([label, fn], i) => {
      const b = document.createElement('button'); b.innerHTML = '<kbd>' + (i + 1) + '</kbd>' + label;
      b.onclick = () => this.runItemAct(fn);
      box.appendChild(b);
    });
  },
  runItemAct(fn) {
    const r = fn();
    if (r === 'keep') return;
    if (G && !G.pendingId) this.closeOv(); else if (this.ov === 'ovInv') this.renderInv();
  },

  // ---------- 選擇目標 ----------
  beginTarget(o) {
    this.stopAuto();
    const P = G.P, cand = this.tgtCands(o);
    this.tgt = o;
    const first = cand[0];
    this.target = first ? { x: first.x, y: first.y } : { x: P.x + 1, y: P.y };
    this.validateTarget();
    const label = o.kind === 'abil' ? ABIL[o.abil].n : o.kind === 'zap' ? Game.itemName(o.it, true) : Game.itemName(o.it, true);
    $('tgtMsg').innerHTML = '<b>' + esc(label) + '</b>　' + (this.touch ? '點選目標，再點一次或按確定' : '方向鍵移動、Tab 切換、Enter 確定');
    $('tgtBar').hidden = false;
    document.body.classList.add('targeting');
  },
  tgtCands(o) {
    const P = G.P, r = o.range || 9;
    return Game.hostiles().filter(m => cheb(m.x, m.y, P.x, P.y) <= r).sort((a, b) => cheb(a.x, a.y, P.x, P.y) - cheb(b.x, b.y, P.x, P.y));
  },
  validateTarget() {
    const o = this.tgt, t = this.target, P = G.P; if (!o || !t) return;
    const d = cheb(t.x, t.y, P.x, P.y), m = Game.monAt(t.x, t.y);
    let ok = d > 0 && d <= (o.range || 9) && Game.inView(t.x, t.y);
    if (o.need === 'enemy') ok = ok && m && Game.monVisible(m) && !MON[m.k].npc && !m.disg;
    if (o.need === 'tile') { const v = Game.tile(t.x, t.y); ok = ok && TP[v].walk && v !== T.LAVA && !m; }
    t.ok = !!ok;
  },
  moveTarget(dx, dy) { if (!this.target) return; this.target.x += dx; this.target.y += dy; this.validateTarget(); this.tip(Game.describe(this.target.x, this.target.y)); },
  cycleTarget() {
    const c = this.tgtCands(this.tgt); if (!c.length) return;
    const i = c.findIndex(m => m.x === this.target.x && m.y === this.target.y);
    const m = c[(i + 1) % c.length]; this.target = { x: m.x, y: m.y }; this.validateTarget(); Snd.play('select');
  },
  confirmTarget() {
    const o = this.tgt, t = this.target; if (!o || !t) return;
    if (!t.ok) { Snd.play('warn'); msg('不能選擇那裡。', 'm'); return; }
    this.endTarget();
    if (o.kind === 'throw') Game.throwItem(o.it, t.x, t.y);
    else if (o.kind === 'zap') Game.zap(o.it, t.x, t.y);
    else if (o.kind === 'abil') Game.useAbility(o.abil, t.x, t.y);
  },
  endTarget() { this.tgt = null; this.target = null; $('tgtBar').hidden = true; document.body.classList.remove('targeting'); },

  // ---------- 行動 ----------
  stopAuto() { this.travel = null; this.exploring = false; this.resting = 0; },
  ready() { return this.state === 'play' && G && !G.demo && !G.over && !this.ov && !this.dlgOpen; },
  action(a) {
    Snd.init();
    if (!this.ready()) return;
    if (this.tgt && a !== 'cancel') this.endTarget();
    this.stopAuto();
    G.interrupt = false;
    switch (a) {
      case 'inv': this.openInv(); break;
      case 'ab0': case 'ab1': this.useAbil(CLASSES[G.cls].abil[a === 'ab0' ? 0 : 1]); break;
      case 'explore': this.startExplore(); break;
      case 'rest': this.startRest(); break;
      case 'wait': Game.wait(); break;
      case 'ctx': this.ctxAction(); break;
      case 'throw': this.openInv('throw'); break;
      case 'map': this.openMap(); break;
    }
  },
  useAbil(id) {
    const A = ABIL[id], P = G.P;
    if (P.cds[id] > 0) { msg(A.n + '還要 ' + P.cds[id] + ' 回合才能再用。', 'm'); Snd.play('warn'); return; }
    if (A.tgt === 'none') { Game.useAbility(id); return; }
    if (A.tgt === 'enemy') {
      const c = Game.abilityTargets(id);
      if (!c.length) { msg(A.range === 1 ? '身邊沒有可以攻擊的敵人。' : '附近沒有可以攻擊的目標。', 'm'); Snd.play('warn'); return; }
      if (c.length === 1 && A.range === 1) { Game.useAbility(id, c[0].x, c[0].y); return; }
      this.beginTarget({ kind: 'abil', abil: id, range: A.range, need: 'enemy' });
      return;
    }
    this.beginTarget({ kind: 'abil', abil: id, range: A.range, need: 'tile' });
  },
  ctxAction() {
    const P = G.P;
    if (Game.tile(P.x, P.y) === T.STAIRS) { Game.descend(); return; }
    const its = Game.itemsAt(P.x, P.y);
    if (its.length) {
      const r = Game.pickup(false);
      if (r.buy) this.confirm('要花 ' + r.buy.it.price + ' 金幣購買「' + Game.itemName(r.buy.it) + '」嗎？（你有 ' + P.gold + ' 金幣）', () => Game.pickup(true), '購買');
      return;
    }
    msg('這裡沒有東西可以撿。', 'm');
  },
  startExplore() {
    if (Game.dangerNear()) { msg('附近有敵人，不能自動探索。', 'w'); Snd.play('warn'); return; }
    this.exploring = true; G.interrupt = false;
  },
  startRest() {
    if (Game.dangerNear()) { msg('附近有敵人，不能休息。', 'w'); Snd.play('warn'); return; }
    this.resting = 30; this.restMin = G.P.hp >= G.P.mhp ? 10 : 0; G.interrupt = false;
    msg('你停下來休息並仔細搜尋四周……', 'm');
  },
  doDir(dx, dy) {
    if (!this.ready()) return;
    if (this.tgt) { this.moveTarget(dx, dy); return; }
    G.interrupt = false;
    Game.move(dx, dy);
  },
  travelTo(x, y) {
    const p = Game.travelPath(x, y);
    if (!p || !p.length) { msg('沒辦法走到那裡。', 'm'); return; }
    this.travel = p; G.interrupt = false;
  },
  update(t) {
    if (this.state === 'title') { this.demoStep(t); return; }
    if (!G || G.demo || G.over) return;
    this.hud();
    if (this.ov || this.dlgOpen) return;
    if (G.perkChoices) { this.openPerk(); return; }
    if (G.pendingId) { this.openInv('identify'); return; }
    if (t < this.stepT) return;
    const P = G.P;
    if (P.st.para > 0 || P.st.freeze > 0) { Game.wait(); this.stepT = t + 0.2; return; }
    if (this.hold && t > this.holdT) { this.holdT = t + 0.13; this.doDir(this.hold[0], this.hold[1]); return; }
    if (this.resting > 0) {
      if (G.interrupt || Game.dangerNear()) { this.resting = 0; return; }
      Game.rest(); this.resting--;
      if (this.restMin > 0) this.restMin--;
      else if (P.hp >= P.mhp && !P.st.poison) this.resting = 0;
      if (!this.resting) msg('休息結束。', 'm');
      this.stepT = t + 0.025; return;
    }
    if (this.travel) {
      if (G.interrupt || Game.dangerNear() && this.travel.length > 1) { this.travel = null; return; }
      const [x, y] = this.travel.shift();
      const ok = Game.move(x - P.x, y - P.y, { auto: 1 });
      if (!ok || (G.P.x !== x || G.P.y !== y)) this.travel = null;
      if (this.travel && !this.travel.length) this.travel = null;
      this.stepT = t + 0.07; return;
    }
    if (this.exploring) {
      if (G.interrupt || Game.dangerNear()) { this.exploring = false; if (Game.dangerNear()) msg('發現敵人！', 'w'); return; }
      let p = Game.explorePath();
      if (!p) {
        const F = G.F;
        if (F.stairs && F.seen[F.stairs[1] * F.w + F.stairs[0]] && !(P.x === F.stairs[0] && P.y === F.stairs[1])) { msg('這層已經探索完畢，前往樓梯。', 'i'); this.exploring = false; this.travelTo(F.stairs[0], F.stairs[1]); return; }
        this.exploring = false; msg(F.stairs && P.x === F.stairs[0] && P.y === F.stairs[1] ? '這層已經探索完畢。按「下樓」繼續。' : '找不到可以探索的地方了。也許有秘門？試試搜尋。', 'i'); return;
      }
      const [x, y] = p[0];
      const bm = Game.monAt(x, y);
      if (bm && Game.monVisible(bm) && !bm.disg) { this.exploring = false; msg(MON[bm.k].n + '擋住了去路。', 'w'); return; }
      const ok = Game.move(x - P.x, y - P.y, { auto: 1 });
      if (!ok) this.exploring = false;
      this.stepT = t + 0.06; return;
    }
  },

  // ---------- HUD ----------
  hud() {
    const P = G.P, st = Game.stats();
    const hungerTxt = P.hunger <= 0 ? '餓昏' : P.hunger < 100 ? '虛弱' : P.hunger < 300 ? '飢餓' : '';
    const abil = CLASSES[P.cls].abil;
    const chips = [];
    const S = P.st;
    if (hungerTxt) chips.push(['h', hungerTxt]);
    if (S.poison) chips.push(['p', '中毒 ' + S.poison]);
    if (S.burn) chips.push(['b', '燃燒']);
    if (S.haste) chips.push(['g', '加速']);
    if (S.slow) chips.push(['s', '遲緩']);
    if (S.conf) chips.push(['c', '混亂']);
    if (S.para) chips.push(['s', '麻痺']);
    if (S.invis) chips.push(['i', '隱形 ' + S.invis]);
    if (G.F.detect) chips.push(['i', '透視']);
    if (G.F.locked) chips.push(['h', '樓梯封印']);
    const here = Game.tile(P.x, P.y) === T.STAIRS ? 'stairs' : Game.itemsAt(P.x, P.y).length ? (Game.itemsAt(P.x, P.y)[0].it.price ? 'buy' : 'pick') : 'rest';
    const sig = [P.hp, P.mhp, P.xp, P.lvl, P.gold, G.depth, chips.join(), P.cds[abil[0]], P.cds[abil[1]], here, st.arm, st.dmin, st.dmax].join('|');
    if (sig !== this.hudSig) {
      this.hudSig = sig;
      $('hpFill').style.width = clamp(P.hp / P.mhp * 100, 0, 100) + '%';
      $('hpBar').classList.toggle('low', P.hp < P.mhp * 0.3);
      $('hpT').textContent = Math.max(0, P.hp) + ' / ' + P.mhp;
      $('xpFill').style.width = clamp(P.xp / XP_NEED(P.lvl) * 100, 0, 100) + '%';
      $('lvT').textContent = 'Lv' + P.lvl;
      $('depthT').innerHTML = '<b>B' + G.depth + '</b> ' + BIOMES[G.F.biome].n;
      $('goldT').textContent = P.gold;
      $('atkT').textContent = st.dmin + '–' + st.dmax; $('armT').textContent = st.arm;
      $('chips').innerHTML = chips.map(([c, t]) => '<span class="chip ' + c + '">' + t + '</span>').join('');
      abil.forEach((id, i) => {
        const b = $('ab' + i), cd = P.cds[id];
        b.querySelector('.nm').textContent = ABIL[id].n;
        b.querySelector('.cd').textContent = cd > 0 ? cd : '';
        b.classList.toggle('cool', cd > 0);
      });
      const cb = $('bCtx');
      cb.querySelector('.nm').textContent = { stairs: '下樓', buy: '購買', pick: '撿起', rest: '撿起' }[here];
      cb.classList.toggle('dim', here === 'rest');
      cb.classList.toggle('hot', here !== 'rest');
      cb.classList.toggle('lock', here === 'stairs' && !!G.F.locked);
      this.miniDirty = true;
    }
    if (this.dirtyLog) {
      this.dirtyLog = false;
      const L = G.log.slice(-5), el = $('log');
      el.innerHTML = L.map((l, i) => '<p style="color:' + COL[l.c] + ';opacity:' + (0.5 + 0.5 * (i + 1) / L.length) + '">' + esc(l.t) + (l.x > 1 ? ' <i>×' + l.x + '</i>' : '') + '</p>').join('');
    }
  },
  tip(s) { const el = $('tip'); if (!s) { el.hidden = true; return; } el.textContent = s; el.hidden = false; },

  // ---------- 結束畫面 ----------
  showEnd() {
    if (!G || !G.summary) return;
    const S = G.summary, win = G.over === 'win';
    $('endTitle2').textContent = win ? '征服深淵！' : '冒險結束';
    $('ovEnd').classList.toggle('win', win);
    $('endCause').textContent = G.cause;
    $('endStats').innerHTML = [['職業', CLASSES[S.cls].n + ' Lv' + S.lvl], ['深度', '第 ' + S.depth + ' 層'], ['回合', S.turns], ['擊殺', S.kills], ['金幣', S.gold], ['分數', S.score]].map(([a, b]) => '<div><small>' + a + '</small><b>' + b + '</b></div>').join('');
    $('endSouls').innerHTML = '獲得靈魂石 <span class="soul"></span><b>' + S.souls + '</b>　·　排行第 ' + S.rank + ' 名　·　種子 <b>' + esc(S.seed) + '</b>';
    $('endUnlock').hidden = !G.newUnlock;
    if (G.newUnlock) $('endUnlock').textContent = '★ 解鎖新職業：' + CLASSES[G.newUnlock].n + '！';
    $('endLog').innerHTML = G.log.slice(-6).map(l => '<p style="color:' + COL[l.c] + '">' + esc(l.t) + '</p>').join('');
    this.show('ovEnd');
    Music.play(win ? 'title' : 'b4');
  },

  // ---------- 鍵盤 ----------
  onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input,textarea')) { if (e.key === 'Enter' && this.ov === 'ovNew') this.startRun(); return; }
    const k = e.code;
    if (this.dlgOpen) { if (k === 'Enter' || k === 'Space') { $('dlgOk').click(); e.preventDefault(); } else if (k === 'Escape') this.hideDlg(); return; }
    if (this.ov) { this.ovKey(e); return; }
    if (this.state !== 'play' || !G || G.demo || G.over) return;
    if (KEYDIR[k] || k.startsWith('Arrow') || k === 'Space' || k === 'Tab') e.preventDefault();
    const wasAuto = this.travel || this.exploring || this.resting;
    this.stopAuto();
    if (this.tgt) {
      if (KEYDIR[k]) this.moveTarget(...KEYDIR[k]);
      else if (k === 'Tab') this.cycleTarget();
      else if (k === 'Enter' || k === 'Space' || k === 'KeyF' || k === 'NumpadEnter') this.confirmTarget();
      else if (k === 'Escape') this.endTarget();
      return;
    }
    if (wasAuto && !KEYDIR[k]) return;
    Snd.init();
    if (KEYDIR[k]) { this.doDir(...KEYDIR[k]); return; }
    switch (k) {
      case 'Space': case 'Period': case 'Numpad5': case 'NumpadDecimal': if (e.shiftKey && k === 'Period') this.action('ctx'); else this.action('wait'); break;
      case 'KeyR': this.action('rest'); break;
      case 'KeyX': this.action('explore'); break;
      case 'KeyI': case 'Tab': this.action('inv'); break;
      case 'KeyT': this.action('throw'); break;
      case 'Digit1': this.action('ab0'); break;
      case 'Digit2': this.action('ab1'); break;
      case 'KeyG': case 'Comma': case 'Enter': case 'NumpadEnter': this.action('ctx'); break;
      case 'KeyM': this.openMap(); break;
      case 'KeyL': this.openLog(); break;
      case 'KeyH': case 'Slash': this.show('ovHelp'); break;
      case 'Escape': this.openMenu(); break;
    }
  },
  ovKey(e) {
    const k = e.code, ov = this.ov;
    if (k === 'Escape') {
      e.preventDefault();
      if (ov === 'ovPerk' || ov === 'ovEnd' || ov === 'ovTitle') return;
      if (ov === 'ovInv' && this.invMode === 'identify') { Game.finishIdentify(null); this.closeOv(); return; }
      if (ov === 'ovInv' && this.invSel != null) { this.invSel = null; this.renderInv(); return; }
      const b = document.querySelector('#' + ov + ' [data-back]'); if (b) b.click(); else this.closeOv();
      return;
    }
    if (ov === 'ovPerk' && /^Digit[1-3]$/.test(k)) { const c = G.perkChoices[+k.slice(5) - 1]; if (c) this.pickPerk(c); return; }
    if (ov === 'ovInv') {
      if (k === 'KeyI' && this.invMode === 'normal' && this.invSel == null) { this.closeOv(); return; }
      if (/^Key[A-Z]$/.test(k)) { const i = k.charCodeAt(3) - 65, list = this.sortedInv(this.invMode); if (list[i]) this.selectItem(list[i]); return; }
      if (/^Digit[1-9]$/.test(k) && this.invSel != null) { const it = Game.inv(this.invSel); if (!it) return; const a = this.itemActions(it)[+k.slice(5) - 1]; if (a) this.runItemAct(a[1]); return; }
      return;
    }
    if (ov === 'ovTitle') { if (k === 'Enter') { if (!$('tContinue').hidden) this.continueRun(); else this.openNew('normal'); } if (k === 'KeyN') this.openNew('normal'); return; }
    if (ov === 'ovNew') { if (k === 'Enter') this.startRun(); const i = /^Digit[1-5]$/.test(k) ? +k.slice(5) - 1 : -1; if (i >= 0 && Store.meta.unlocked[CLASS_ORDER[i]]) { this.selCls = CLASS_ORDER[i]; this.renderClasses(); } if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') { const un = CLASS_ORDER.filter(c => Store.meta.unlocked[c]); const j = un.indexOf(this.selCls) + (k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1); this.selCls = un[(j + un.length) % un.length]; this.renderClasses(); Snd.play('select'); e.preventDefault(); } return; }
    if (ov === 'ovMap' && (k === 'KeyM' || k === 'Enter' || k === 'Space')) { this.closeOv(); return; }
    if (ov === 'ovLog' && k === 'KeyL') { this.back(); return; }
    if (ov === 'ovEnd' && k === 'Enter') { $('endAgain').click(); return; }
    if (ov === 'ovMenu' && k === 'Enter') this.closeOv();
  },

  // ---------- 觸控／滑鼠 ----------
  onPtrDown(e) {
    Snd.init();
    this.pd = { x: e.clientX, y: e.clientY, t: now(), id: e.pointerId, moved: false };
    clearTimeout(this.lpT);
    if (this.ready()) this.lpT = setTimeout(() => { if (this.pd && !this.pd.moved) { this.pd.long = 1; const [tx, ty] = Render.toTile(this.pd.x, this.pd.y); this.tip(Game.describe(tx, ty)); Snd.play('select'); } }, 430);
  },
  onPtrMove(e) {
    if (this.pd && Math.hypot(e.clientX - this.pd.x, e.clientY - this.pd.y) > 12) { this.pd.moved = true; clearTimeout(this.lpT); }
    if (e.pointerType === 'mouse' && this.ready()) {
      const p = Render.toTile(e.clientX, e.clientY);
      if (!this.hover || p[0] !== this.hover[0] || p[1] !== this.hover[1]) { this.hover = p; this.tip(Game.describe(p[0], p[1])); }
    }
  },
  onPtrUp(e) {
    clearTimeout(this.lpT);
    const pd = this.pd; this.pd = null;
    if (!pd || pd.long || pd.moved) { if (pd && pd.long) setTimeout(() => this.tip(''), 1800); return; }
    if (!this.ready()) return;
    if (e.pointerType !== 'mouse') this.tip('');
    const [tx, ty] = Render.toTile(e.clientX, e.clientY), P = G.P;
    if (this.tgt) {
      if (this.target && this.target.x === tx && this.target.y === ty) this.confirmTarget();
      else { this.target = { x: tx, y: ty }; this.validateTarget(); Snd.play('select'); }
      return;
    }
    const wasAuto = this.travel || this.exploring || this.resting;
    this.stopAuto();
    if (wasAuto) return;
    if (tx === P.x && ty === P.y) { this.action('ctx'); return; }
    const d = cheb(tx, ty, P.x, P.y);
    if (d === 1) { this.doDir(tx - P.x, ty - P.y); return; }
    const m = Game.monAt(tx, ty);
    if (m && Game.monVisible(m) && !MON[m.k].npc && !m.disg) {
      // 點遠方的敵人：往它靠近一步
      const p = Game.travelPath(tx, ty); if (p && p.length) Game.move(p[0][0] - P.x, p[0][1] - P.y);
      return;
    }
    this.travelTo(tx, ty);
  },

  // ---------- 版面 ----------
  layout() {
    const w = innerWidth, h = innerHeight, land = w > h * 1.15 && h < 560;
    document.body.classList.toggle('land', land);
    document.body.classList.toggle('wide', w >= 900 && h >= 560);
    const hud = $('hud').getBoundingClientRect(), bar = $('bar').getBoundingClientRect();
    if (this.state === 'play') {
      if (land) Render.inset = { t: hud.bottom, b: 0, l: 0, r: w - bar.left };
      else {
        let bt = bar.top;
        if (Store.set.dpad && this.touch) { const dp = $('dpad').getBoundingClientRect(); if (dp.height) bt = Math.min(bt, dp.top + dp.height * 0.4); }
        Render.inset = { t: hud.bottom, b: h - bt, l: 0, r: 0 };
      }
    } else {
      const lg = document.querySelector('#ovTitle .logo'), pn = document.querySelector('#ovTitle .panel');
      const a = lg ? lg.getBoundingClientRect() : null, b = pn ? pn.getBoundingClientRect() : null;
      if (a && b && b.top > a.bottom + 40 && !$('ovTitle').hidden) Render.inset = { t: a.bottom, b: h - b.top, l: 0, r: 0 };
      else Render.inset = { t: 0, b: 0, l: 0, r: 0 };
    }
    Render.resize();
  },
};
