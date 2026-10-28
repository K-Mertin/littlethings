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
    $('tWeekly').onclick = () => this.openNew('weekly');
    $('tRush').onclick = () => { if (!(Store.meta.bossKills > 0)) { this.toast('頭目連戰', '尚未解鎖', '打倒任一守層頭目後解鎖。'); Snd.play('warn'); return; } this.openNew('rush'); };
    $('talkBye').onclick = () => { $('ovTalk').hidden = true; this.dlgOpen = false; Snd.play('click'); };
    $('tAltar').onclick = () => this.openAltar();
    $('tRecords').onclick = () => this.openRecords();
    $('tHelp').onclick = () => this.show('ovHelp');
    $('tCodex').onclick = () => this.openCodex('m');
    $('tAch').onclick = () => this.openAch();
    $('cxMon').onclick = () => this.openCodex('m');
    $('cxItem').onclick = () => this.openCodex('i');
    $('cxRelic').onclick = () => this.openCodex('r');
    $('ascDn').onclick = () => { this.asc = Math.max(0, (this.asc || 0) - 1); Snd.play('select'); this.renderOpts(); };
    $('ascUp').onclick = () => { this.asc = Math.min(Store.meta.ascMax || 0, (this.asc || 0) + 1); Snd.play('select'); this.renderOpts(); };
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
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Snd.init(); this.stopAuto(); this.hold = [dx, dy]; this.holdKey = null; this.doDir(dx, dy); this.holdT = now() + this.HOLD_FIRST; });
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
    $('endAgain').onclick = () => { const c = G.cls; this.openNew(G.daily ? 'daily' : G.rush ? 'rush' : 'normal'); this.selCls = c; this.renderClasses(); };
    $('endTitle').onclick = () => this.toTitle();
    $('endRec').onclick = () => this.openRecords('ovEnd');
    $('dlgOk').onclick = () => { const f = this.dlgFn; this.hideDlg(); if (f) f(); };
    $('dlgNo').onclick = () => this.hideDlg();
    $('ovMap').onclick = () => this.closeOv();
    // 輸入
    addEventListener('keydown', e => this.onKey(e));
    // 按住方向鍵：自己控制連續移動的節奏，不靠作業系統的按鍵重複（那個先停半秒、之後又太快）
    addEventListener('keyup', e => { if (this.holdKey && e.code === this.holdKey) { this.hold = null; this.holdKey = null; } });
    addEventListener('blur', () => { this.hold = null; this.holdKey = null; });
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
    $('tDaily').querySelector('small').textContent = d ? '今日最佳 ' + d.score : '今天的地牢';
    const wk = (Store.meta.weekly || {})[Weekly.key()];
    $('tWeekly').querySelector('small').textContent = wk ? '本週最佳 ' + wk.score : '固定職業開局';
    $('tRush').querySelector('small').textContent = !(Store.meta.bossKills > 0) ? '打倒頭目後解鎖' : Store.meta.rushBest ? '最佳 ' + Store.meta.rushBest + ' 戰' : '連續挑戰頭目';
    $('tRush').classList.toggle('dim', !(Store.meta.bossKills > 0));
    this.show('ovTitle');
    this.layout();
    Music.play('title');
  },
  syncToggles() {
    for (const b of document.querySelectorAll('.tog[data-opt]')) { const k = b.dataset.opt, on = k === 'zoom' ? null : !!Store.set[k]; const s = b.querySelector('b'); if (k === 'gfx') s.textContent = { auto: '自動', high: '高', low: '省電' }[Store.set.gfx || 'auto']; else if (k === 'zoom') s.textContent = ['遠', '中', '近'][clamp((Store.set.zoom | 0) + 1, 0, 2)]; else { s.textContent = on ? '開' : '關'; b.classList.toggle('on', on); } }
    $('bSound').classList.toggle('off', !(Store.set.music || Store.set.sfx));
    document.body.classList.toggle('dpad', !!Store.set.dpad);
  },
  toggle(k) {
    if (k === 'zoom') { Store.set.zoom = ((Store.set.zoom | 0) + 2) % 3 - 1; this.layout(); }
    else if (k === 'gfx') { const L = ['auto', 'high', 'low']; Store.set.gfx = L[(L.indexOf(Store.set.gfx || 'auto') + 1) % 3]; Render.initQ(); }
    else Store.set[k] = !Store.set[k];
    Store.saveSet(); Snd.init(); Snd.applyVol(); this.syncToggles(); this.layout(); Snd.play('select');
  },
  confirm(text, fn, okText = '確定') { $('dlgText').textContent = text; $('dlgOk').textContent = okText; this.dlgFn = fn; $('ovDlg').hidden = false; this.dlgOpen = true; },
  hideDlg() { $('ovDlg').hidden = true; this.dlgOpen = false; this.dlgFn = null; },


  // ---------- 精靈圖畫到小畫布上 ----------
  drawSpr(cv, s, scale = 1) {
    const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false;
    const S = scale, ax = cv.width / 2, ay = cv.height - 2;
    x.drawImage(s.c, Math.round(ax - s.ax * S), Math.round(ay - s.ay * S), s.c.width * S, s.c.height * S);
  },
  drawSil(cv, s, col = '#2a2438') {
    this.drawSpr(cv, s); const x = cv.getContext('2d'); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, cv.width, cv.height); x.globalCompositeOperation = 'source-over';
  },
  heroGear(cls) { const C = CLASSES[cls], w = C.start.find(s => ITEMS[s[0]] && ITEMS[s[0]].c === 'weapon'), a = C.start.find(s => ITEMS[s[0]] && ITEMS[s[0]].c === 'armor'); return { w: w ? WPN_LOOK[w[0]] : 'fist', a: a ? a[0] : 'none', t: a ? ITEMS[a[0]].tint : '' }; },
  // 選職業畫面的動態頭像
  animCls(t) {
    if (this.ov === 'ovTitle') {
      if (t - (this.luT || 0) < 0.1) return; this.luT = t;
      const cv = $('lineup'), x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false;
      x.save(); x.translate(100, 33); x.scale(1, 0.12); const g = x.createRadialGradient(0, 0, 4, 0, 0, 100); g.addColorStop(0, 'rgba(255,170,80,.35)'); g.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = g; x.fillRect(-100, -100, 200, 200); x.restore();
      CLASS_ORDER.forEach((k, i) => {
        const ph = ((t * 1.6 + i * 0.37) | 0) % 2, swing = ((t * 0.5 + i * 0.9) % 6) < 0.35;
        const s = Spr.hero(k, swing ? (((t * 10) | 0) % 2 ? FR.atk1 : FR.atk0) : ph ? FR.idle1 : FR.idle0, this.heroGear(k));
        const X = 20 + i * 40, Y = 34;
        x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(X, Y - 1, 7, 2, 0, 0, TAU); x.fill();
        x.save(); if (i > 2) { x.translate(X * 2, 0); x.scale(-1, 1); }
        if (Store.meta.unlocked[k]) x.drawImage(s.c, X - s.ax, Y - s.ay); else { const c = document.createElement('canvas'); c.width = s.c.width; c.height = s.c.height; this.drawSil(c, { c: s.c, ax: s.c.width / 2, ay: s.c.height - 2 }, '#120e1c'); x.drawImage(c, X - s.ax, Y - s.ay); }
        x.restore();
      });
      return;
    }
    if (this.ov !== 'ovNew') return;
    if (t - (this.clsT || 0) < 0.12) return; this.clsT = t;
    const seq = [FR.idle0, FR.idle1, FR.idle0, FR.idle1, FR.walk0, FR.walk1, FR.walk0, FR.walk1, FR.atk0, FR.atk1, FR.atk1, FR.idle0];
    for (const cv of document.querySelectorAll('#clsList canvas')) {
      const k = cv.dataset.c, un = !!Store.meta.unlocked[k], on = k === this.selCls;
      const f = on ? seq[((t / 0.16) | 0) % seq.length] : (((t * 1.5 + k.length) | 0) % 2 ? FR.idle1 : FR.idle0);
      const s = Spr.hero(k, f, this.heroGear(k));
      if (un) this.drawSpr(cv, s); else this.drawSil(cv, s, '#14101e');
    }
  },
  // ---------- 成就通知、頭目橫幅 ----------
  toast(head, name, desc) {
    const box = $('toasts'); while (box.children.length >= 2) box.firstChild.remove();
    const el = document.createElement('div'); el.className = 'toast';
    el.innerHTML = '<span class="ic">★</span><div><small>' + esc(head) + '</small><b>' + esc(name) + '</b>' + (desc ? '<p>' + esc(desc) + '</p>' : '') + '</div>';
    $('toasts').appendChild(el); setTimeout(() => el.remove(), 4000);
  },
  banner(sub, name, desc, rage) {
    const b = $('banner'); b.hidden = true; b.classList.toggle('rage', !!rage);
    $('banSub').textContent = sub; $('banName').textContent = name; $('banDesc').textContent = desc || '';
    void b.offsetWidth; b.hidden = false;
    clearTimeout(this.banT); this.banT = setTimeout(() => { b.hidden = true; }, 2800);
  },
  bossIntro(m) { const D = MON[m.k]; this.stopAuto(); this.banner(D.final ? 'FINAL BOSS' : D.mini ? '秘境守護者 · GUARDIAN' : '守層頭目 · BOSS', D.n, D.d2); if (typeof FX !== 'undefined') FX.shake(6); },
  bossPhase(m) { const D = MON[m.k]; this.banner('第二階段', D.n + '・狂怒', D.final ? '黑暗變得更加狂暴！' : '攻擊變得更加猛烈！', 1); },
  askAltar(a) {
    const A = ALTARS[a.k], c = Game.altarCost(a);
    const cost = a.k === 'blood' ? '（需要 ' + c + ' HP，你有 ' + G.P.hp + '）' : a.k === 'gold' ? '（需要 ' + c + ' 金幣，你有 ' + G.P.gold + '）' : '';
    this.stopAuto();
    this.confirm(A.n + '：' + A.d + cost, () => Game.useAltar(a), a.k === 'trial' ? '開始試煉' : '獻祭');
  },
  // ---------- 深淵等級與開局祝福 ----------
  renderOpts() {
    const M = Store.meta, mx = M.ascMax || 0, daily = this.newMode === 'daily' || this.newMode === 'rush';
    $('ascBox').hidden = daily || mx <= 0; $('boonBox').hidden = daily;
    this.asc = clamp(this.asc == null ? (M.ascSel || 0) : this.asc, 0, mx);
    $('ascN').textContent = ASC[this.asc].n;
    $('ascD').textContent = this.asc ? ASC.slice(1, this.asc + 1).map(a => a.d).join(' ') : '原本的深淵。打倒任一守層頭目後解鎖下一級。';
    $('ascBonus').textContent = this.asc ? '靈魂石 +' + this.asc * 20 + '%' : '';
    $('ascDn').disabled = this.asc <= 0; $('ascUp').disabled = this.asc >= mx;
    const el = $('boonList'); el.innerHTML = '';
    if (!Meta.boonOk(this.boon || 'none')) this.boon = 'none';
    for (const k in BOONS) {
      const B = BOONS[k], ok = Meta.boonOk(k), b = document.createElement('button');
      b.className = 'boon' + (k === (this.boon || 'none') ? ' on' : '') + (ok ? '' : ' locked');
      b.textContent = (ok ? '' : '◇ ') + B.n;
      b.onclick = () => { if (!ok) { $('boonDesc').textContent = '未解鎖：' + (ACH.find(a => a.id === B.ach) || {}).n + '（' + (ACH.find(a => a.id === B.ach) || {}).d + '）'; Snd.play('warn'); return; } this.boon = k; Snd.play('select'); this.renderOpts(); };
      el.appendChild(b);
    }
    $('boonDesc').textContent = BOONS[this.boon || 'none'].d;
  },
  // ---------- 圖鑑 ----------
  openCodex(tab) {
    this.cxTab = tab || this.cxTab || 'm';
    $('cxMon').classList.toggle('on', this.cxTab === 'm'); $('cxItem').classList.toggle('on', this.cxTab === 'i'); $('cxRelic').classList.toggle('on', this.cxTab === 'r');
    const C = Meta.m().codex, el = $('codexList'); el.innerHTML = '';
    if (this.cxTab === 'r') {
      const R = C.r || {}, ks = Object.keys(RELICS);
      $('codexCnt').textContent = ks.filter(k => R[k]).length + ' / ' + ks.length;
      for (const k of ks) {
        const e = R[k], d = document.createElement('div'); d.className = 'cx' + (e ? '' : ' unk');
        d.innerHTML = '<canvas width="32" height="32"></canvas><div><b>' + (e ? RELICS[k].n : '？？？') + '</b><small>' + (e ? esc(RELICS[k].d) + '<br>羈絆「' + RSETS[RELICS[k].tag].n + '」' : '尚未取得') + '</small></div>';
        const x = d.querySelector('canvas').getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(Art.itemSprite({ k: 'relic', c: 'relic', relic: k }).c, 0, 0, 32, 32);
        if (!e) { x.globalCompositeOperation = 'source-in'; x.fillStyle = '#2a2438'; x.fillRect(0, 0, 32, 32); }
        el.appendChild(d);
      }
    } else if (this.cxTab === 'm') {
      const ks = Object.keys(MON).filter(k => !MON[k].npc);
      $('codexCnt').textContent = Object.keys(C.m).filter(k => MON[k]).length + ' / ' + ks.length;
      for (const k of ks) {
        const D = MON[k], e = C.m[k], d = document.createElement('div');
        d.className = 'cx' + (e ? '' : ' unk') + (D.boss ? ' boss' : '');
        d.innerHTML = '<canvas width="40" height="36"></canvas><div><b>' + (e ? D.n : '？？？') + '</b><small>' + (e ? esc(D.d2 || '') + '<br>擊敗 ' + (e.k || 0) + ' 次' : (D.boss ? '守層頭目' : '尚未遇見')) + '</small></div>';
        const s = Spr.mon(k, FR.idle0), cv = d.querySelector('canvas'), sc = D.boss ? 0.8 : 1;
        if (D.boss) { cv.width = 56; cv.height = 50; }
        if (e) this.drawSpr(cv, s, sc); else this.drawSil(cv, s);
        el.appendChild(d);
      }
    } else {
      const ks = Object.keys(ITEMS).filter(k => ITEMS[k].c !== 'gold' && ITEMS[k].c !== 'relic');
      const known = k => C.i[k] || !(['potion', 'scroll', 'ring', 'wand'].includes(ITEMS[k].c)) && C.i[k];
      $('codexCnt').textContent = ks.filter(k => C.i[k]).length + ' / ' + ks.length;
      for (const k of ks) {
        const K = ITEMS[k], e = known(k), d = document.createElement('div'), lock = K.lock && !Meta.has(K.lock);
        d.className = 'cx' + (e ? '' : ' unk');
        d.innerHTML = '<canvas width="32" height="32"></canvas><div><b>' + (e ? K.n : lock ? '◇ ？？？' : '？？？') + '</b><small>' + CAT_NAME[K.c] + (e && K.desc ? '・' + esc(K.desc) : lock ? '・需要成就「' + (ACH.find(a => a.id === K.lock) || {}).n + '」' : '') + '</small></div>';
        const cv = d.querySelector('canvas'), x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
        const s = Art.itemSprite({ k, c: K.c, n: 1 });
        if (e) x.drawImage(s.c, 0, 0, 32, 32); else { x.drawImage(s.c, 0, 0, 32, 32); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#2a2438'; x.fillRect(0, 0, 32, 32); }
        el.appendChild(d);
      }
    }
    if (this.ov !== 'ovCodex') this.show('ovCodex');
  },
  openAch() {
    const M = Meta.m(), el = $('achList'); el.innerHTML = '';
    $('achCnt').textContent = Object.keys(M.ach).filter(k => ACH.some(a => a.id === k)).length + ' / ' + ACH.length;
    for (const A of ACH) {
      const on = !!M.ach[A.id], d = document.createElement('div'); d.className = 'ach' + (on ? ' on' : '');
      d.innerHTML = '<span class="ic">' + (on ? '★' : '☆') + '</span><div><b>' + A.n + '</b><p>' + A.d + (on ? '　<small>' + M.ach[A.id] + '</small>' : '') + '</p>' + (A.reward ? '<em>獎勵：' + A.reward + '</em>' : '') + '</div><span class="sv"><span class="soul"></span>' + A.s + '</span>';
      el.appendChild(d);
    }
    this.show('ovAch');
  },

  // ---------- 標題背景：自動走動的英雄 ----------
  makeDemo() {
    const depth = Store.meta.deepOpen && Math.random() < 0.3 ? 18 + ((Math.random() * 7) | 0) : 1 + ((Math.random() * 16) | 0);
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
    $('newHead').textContent = mode === 'daily' ? '每日挑戰' : mode === 'weekly' ? '每週挑戰' : mode === 'rush' ? '頭目連戰' : '新的冒險';
    const d = todayStr();
    $('dailyInfo').hidden = mode !== 'daily' && mode !== 'weekly' && mode !== 'rush';
    $('seedRow').hidden = mode === 'daily' || mode === 'weekly' || mode === 'rush';
    if (mode === 'rush') { const n = Game.rushList().length; $('dailyInfo').innerHTML = '在頭目競技場裡連續挑戰 <b>' + n + ' 位頭目</b>：' + Game.rushList().map(k => MON[k].n).join('→') + '。<br>每一戰開始前會回滿 HP、提升到該戰的標準等級並得到補給；打倒頭目後挑選遺物。死掉就結束。' + (Store.meta.rushBest ? '<br>你的最佳紀錄：連勝 ' + Store.meta.rushBest + ' 戰' + (Store.meta.rushWins ? '（全勝 ' + Store.meta.rushWins + ' 次）' : '') + '。' : ''); }
    if (mode === 'weekly') {
      const W = Weekly.info(), top = ((Store.meta.seedTop || {})[W.seed] || []);
      this.selCls = W.cls;
      $('dailyInfo').innerHTML = '本週種子：<b>' + W.seed + '</b>（每週一更新）。職業固定為<b>' + CLASSES[W.cls].n + '</b>，深淵等級 ' + W.asc + '。<br>本週變化「' + DMODS[W.mod].n + '」：' + DMODS[W.mod].d + '<br>開局遺物「' + RELICS[W.relic].n + '」：' + RELICS[W.relic].d +
        (top.length ? '<div class="wkTop">' + top.map((e, i) => '<span>' + (i + 1) + '. ' + e.score + ' 分 · ' + CLASSES[e.cls].n + ' · 第 ' + e.depth + ' 層' + (e.win ? ' ★' : '') + '</span>').join('') + '</div>' : '<br>本週還沒有紀錄。');
    }
    if (mode === 'daily') { const best = Store.meta.daily[d], mk = Object.keys(DMODS)[hashStr('D' + d) % Object.keys(DMODS).length]; $('dailyInfo').innerHTML = '今天的種子：<b>D' + d + '</b>。今天每個人走進的都是同一座地牢。<br>今日變化「' + DMODS[mk].n + '」：' + DMODS[mk].d + (best ? '<br>你今天的最佳紀錄：' + best.score + ' 分（第 ' + best.depth + ' 層）' : ''); }
    this.asc = null; this.boon = Store.meta.boonSel || 'none';
    this.renderOpts();
    if (!Store.meta.unlocked[this.selCls] && mode !== 'weekly') this.selCls = 'warrior';
    this.renderClasses();
    this.show('ovNew', this.state === 'title' ? null : null);
  },
  renderClasses() {
    const el = $('clsList'); el.innerHTML = '';
    for (const k of CLASS_ORDER) {
      const C = CLASSES[k], un = !!Store.meta.unlocked[k];
      const b = document.createElement('button'); b.className = 'cls' + (k === this.selCls ? ' on' : '') + (un ? '' : ' locked');
      b.innerHTML = '<canvas width="36" height="30" data-c="' + k + '"></canvas><div><b>' + C.n + '</b><small>' + C.en + '</small><p>' + (un ? C.d : '未解鎖：' + C.lock) + '</p>' +
        (un ? '<em>HP ' + C.hp + ' · 技能：' + C.abil.map(a => ABIL[a].n).join('、') + '</em>' : '') + '</div>';
      if (this.newMode === 'weekly' && k !== this.selCls) { b.classList.add('locked'); b.style.opacity = '.4'; }
      b.onclick = () => { if (!un || this.newMode === 'weekly') { Snd.play('warn'); return; } this.selCls = k; Snd.play('select'); this.renderClasses(); };
      el.appendChild(b);
    }
    const C = CLASSES[this.selCls];
    this.clsT = 0; this.animCls(now());
    $('clsInfo').innerHTML = '<b>' + C.n + '</b>　' + C.tip + '<br>' + C.abil.map(a => '<span class="ab">' + ABIL[a].n + '</span>' + ABIL[a].d).join('<br>');
  },
  startRun() {
    Snd.init();
    let seed = this.newMode === 'daily' ? 'D' + todayStr() : this.newMode === 'weekly' ? Weekly.seed() : this.newMode === 'rush' ? 'R' + randomSeedStr() : ($('seedIn').value || '').trim().toUpperCase().slice(0, 16);
    if (this.newMode === 'weekly') this.selCls = Weekly.info(seed).cls;
    const go = () => {
      Store.clearRun();
      this.state = 'play'; document.body.classList.add('playing');
      Store.meta.ascSel = this.asc || 0; Store.meta.boonSel = this.boon || 'none'; Store.saveMeta();
      Game.newRun(this.selCls, seed || null, this.newMode === 'daily', { asc: this.newMode === 'rush' ? 0 : this.asc || 0, boon: this.newMode === 'rush' ? 'none' : this.boon || 'none', weekly: this.newMode === 'weekly', rush: this.newMode === 'rush' });
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
    else el.innerHTML = M.records.slice(0, 30).map((r, i) => '<div class="rec' + (r.win ? ' win' : '') + '"><span class="rk">' + (i + 1) + '</span><canvas data-c="' + r.cls + '" width="36" height="30"></canvas><div class="rb"><b>' + r.score + ' 分</b> · ' + CLASSES[r.cls].n + ' Lv' + r.lvl + ' · 第 ' + r.depth + ' 層' + (r.rushRun ? ' <span class="tag" style="color:#ffb35a;background:rgba(255,160,60,.15)">連戰 ' + r.rush + '</span>' : r.daily ? ' <span class="tag">每日</span>' : r.weekly ? ' <span class="tag" style="color:#c8a0ff;background:rgba(180,140,255,.15)">每週</span>' : '') + (r.asc ? ' <span class="tag" style="color:#ff9ac8;background:rgba(255,90,170,.15)">深淵 ' + r.asc + '</span>' : '') + '<p>' + esc(r.cause) + '</p><small>' + r.date + ' · ' + r.turns + ' 回合 · 種子 <button class="seed" data-s="' + esc(r.seed) + '">' + esc(r.seed) + '</button></small></div></div>').join('');
    for (const c of el.querySelectorAll('canvas')) this.drawSpr(c, Spr.hero(c.dataset.c, FR.idle0, this.heroGear(c.dataset.c)));
    for (const b of el.querySelectorAll('.seed')) b.onclick = () => { this.openNew('normal'); $('seedIn').value = b.dataset.s.startsWith('D') ? '' : b.dataset.s; if (b.dataset.s.startsWith('D')) $('seedIn').value = b.dataset.s; };
    this.show('ovRecords', from);
  },

  // ---------- 頭目遺物三選一 ----------
  openRelic() {
    const el = $('relicList'); el.innerHTML = '';
    for (const k of G.relicChoices) {
      const R = RELICS[k], on = (G.P.relics || []).some(o => RELICS[o].tag === R.tag), b = document.createElement('button'); b.className = 'relic';
      b.innerHTML = '<canvas width="16" height="16"></canvas><div><b>' + R.n + '</b><p>' + R.d + '</p><em class="' + (on ? 'on' : '') + '">' + (on ? '★ 可湊成羈絆「' : '羈絆「') + RSETS[R.tag].n + '」：' + RSETS[R.tag].d + '</em></div>';
      const x = b.querySelector('canvas').getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(Art.itemSprite({ k: 'relic', c: 'relic', relic: k }).c, 0, 0);
      b.onclick = () => { Game.chooseRelic(k); this.closeOv(); };
      el.appendChild(b);
    }
    this.show('ovRelic');
  },
  // ---------- 和地牢裡的人物對話 ----------
  npcTalk(m) {
    const D = MON[m.k];
    this.choice(D.n, Game.npcLine(m), Spr.mon(m.k, FR.idle0), Game.npcOptions(m));
    if (!m.greeted) { m.greeted = 1; Snd.play('secret'); }
  },
  // 有選項的對話框（人物、擊敗深淵之王後的抉擇）
  choice(name, text, spr, opts, noBye) {
    this.stopAuto();
    $('talkName').textContent = name; $('talkText').textContent = text;
    this.drawSpr($('talkFace'), spr);
    const box = $('talkOpts'); box.innerHTML = '';
    for (const o of opts) {
      const b = document.createElement('button'); b.className = 'btn' + (o.main ? ' main' : ''); b.textContent = o.t; b.disabled = !!o.dis;
      b.onclick = () => { $('ovTalk').hidden = true; this.dlgOpen = false; Snd.play('select'); o.fn(); };
      box.appendChild(b);
    }
    $('talkBye').hidden = !!noBye;
    $('ovTalk').hidden = false; this.dlgOpen = true;
  },
  openDeepChoice() {
    this.choice('深淵裂隙', '深淵之王倒下了，王座後方裂開一道通往更深處的裂隙。你可以帶著勝利凱旋歸來，或是踏進裂隙，挑戰深淵下層（第 18–25 層）。', Spr.hero(G.P.cls, FR.idle0, Spr.gearOf(G.P)), [
      { t: '踏進裂隙，繼續深入（回復一半 HP，並獲得遺物三選一）', fn: () => Game.chooseDeep(1) },
      { t: '凱旋歸來（結束這次冒險，記為勝利）', fn: () => Game.chooseDeep(0) },
    ], true);
  },
  // ---------- 遊戲中選單 ----------
  openMenu() {
    if (!G || G.demo || G.over) return;
    $('menuInfo').innerHTML = CLASSES[G.cls].n + ' Lv' + G.P.lvl + ' · 第 ' + G.depth + ' 層 · ' + G.turn + ' 回合<br>種子 <b>' + esc(G.seed) + '</b>' + (G.daily ? '（每日挑戰）' : '');
    const P = G.P, perks = Object.keys(P.perks);
    const R = P.relics || [];
    $('menuRelics').innerHTML = R.length ? '遺物：' + R.map(k => RELICS[k].n).join('、') + (Game.activeSets().length ? '<br>羈絆：' + Game.activeSets().map(t => '<i>' + RSETS[t].n + '</i>（' + RSETS[t].d + '）').join('、') : '') : '';
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
    $('mapTitle').textContent = '第 ' + G.depth + ' 層 · ' + Game.areaName();
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
      const nc = it.known && it.cursed ? 'nmc' : it.known && it.rune ? 'nmu' : it.known && it.ench > 0 ? 'nmr' : '';
      b.innerHTML = '<kbd>' + String.fromCharCode(97 + i) + '</kbd><canvas width="16" height="16"></canvas><span class="' + nc + '">' + esc(Game.itemName(it)) + '</span>' + (Game.isEquipped(it) ? '<em>裝備中</em>' : '');
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
      const en = o => o && o.known ? o.ench : 0;
      const row = (n, a, b, fmt = v => v) => { const d = a - b; return '<span>' + n + '</span><b>' + fmt(a) + (cur && cur !== it && d ? ' <i class="' + (d > 0 ? 'up' : 'dn') + '">' + (d > 0 ? '▲' : '▼') + Math.abs(Math.round(d * 10) / 10) + '</i>' : '') + '</b><small>' + (cur && cur !== it ? '目前 ' + fmt(b) : '') + '</small>'; };
      if (K.c === 'weapon') {
        const C = cur ? ITEMS[cur.k] : { dmg: [1, 3], acc: 0 };
        cmp = '<div class="cmpT">' + row('平均傷害', (K.dmg[0] + K.dmg[1]) / 2 + en(it), (C.dmg[0] + C.dmg[1]) / 2 + en(cur)) + row('命中', (K.acc || 0) + en(it), (C.acc || 0) + en(cur)) + '</div>';
      } else {
        const C = cur ? ITEMS[cur.k] : { arm: 0, eva: 0 };
        cmp = '<div class="cmpT">' + row('護甲', K.arm + en(it), C.arm + en(cur)) + row('閃避', K.eva || 0, C.eva || 0) + '</div>';
      }
      if (it.known && it.rune) {
        const R = RUNES[it.rune], other = Game.runeOf(K.c === 'weapon' ? 'a' : 'w');
        const rk = Object.keys(RESON).find(k => RESON[k][K.c === 'weapon' ? 'w' : 'a'] === it.rune && RESON[k][K.c === 'weapon' ? 'a' : 'w'] === other);
        cmp = (rk ? ' <span class="rn" style="color:#ffd75a">' + (Game.isEquipped(it) ? '共鳴中：' : '裝備後觸發：') + RESON[rk].n + '——' + RESON[rk].d + '</span>' : '') + cmp;
      }
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
    if (Game.tile(P.x, P.y) === T.STAIRS || Game.tile(P.x, P.y) === T.PORTAL) { Game.descend(); return; }
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
  // 走路節奏（秒／格）：單步、按住連走、點地圖自動走、自動探索
  STEP_ONE: 0.12, STEP_HOLD: 0.14, STEP_TRAVEL: 0.09, STEP_EXPLORE: 0.08, HOLD_FIRST: 0.2,
  // 下一拍：照固定節拍往後排（不受畫格時間誤差累積影響）；落後太多就從現在重新起算
  nextBeat(prev, t, step) { const n = prev + step; return n < t || n > t + step ? t + step : n; },
  doDir(dx, dy, cont) {
    if (!this.ready()) return;
    if (this.tgt) { this.moveTarget(dx, dy); return; }
    G.interrupt = false;
    Render.setMove(cont ? this.STEP_HOLD : this.STEP_ONE, cont);
    Game.move(dx, dy);
  },
  travelTo(x, y) {
    const p = Game.travelPath(x, y);
    if (!p || !p.length) { msg('沒辦法走到那裡。', 'm'); return; }
    this.travel = p; G.interrupt = false;
  },
  update(t) {
    this.animCls(t);
    if (this.state === 'title') { this.demoStep(t); return; }
    if (!G || G.demo || G.over) return;
    this.hud();
    if (this.ov || this.dlgOpen) return;
    if (G.perkChoices) { this.openPerk(); return; }
    if (G.relicChoices) { this.openRelic(); return; }
    if (G.deepChoice) { this.openDeepChoice(); return; }
    if (G.pendingId) { this.openInv('identify'); return; }
    if (t < this.stepT) return;
    const P = G.P;
    if (P.st.para > 0 || P.st.freeze > 0) { Game.wait(); this.stepT = t + 0.2; return; }
    if (this.hold && t >= this.holdT) {
      this.holdT = this.nextBeat(this.holdT, t, this.STEP_HOLD);
      this.doDir(this.hold[0], this.hold[1], true);
      // 發現敵人、踩到陷阱等狀況時停下，避免一路衝過去
      if (G.interrupt) { this.hold = null; this.holdKey = null; }
      return;
    }
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
      Render.setMove(this.STEP_TRAVEL, 1);
      const ok = Game.move(x - P.x, y - P.y, { auto: 1, force: !!Game.trapAt(x, y) && Game.tile(x, y) !== T.LAVA });
      if (!ok || (G.P.x !== x || G.P.y !== y)) this.travel = null;
      if (this.travel && !this.travel.length) this.travel = null;
      this.stepT = this.nextBeat(this.stepT, t, this.STEP_TRAVEL); return;
    }
    if (this.exploring) {
      if (G.interrupt || Game.dangerNear()) { this.exploring = false; if (Game.dangerNear()) msg('發現敵人！', 'w'); return; }
      const ch = Game.adjChest();
      if (ch) { Render.setMove(this.STEP_ONE, 0); Game.move(ch.x - P.x, ch.y - P.y); this.stepT = t + 0.25; return; }
      let p = Game.explorePath();
      if (!p) {
        const F = G.F;
        if (F.stairs && F.seen[F.stairs[1] * F.w + F.stairs[0]] && !(P.x === F.stairs[0] && P.y === F.stairs[1])) { msg('這層已經探索完畢，前往樓梯。', 'i'); this.exploring = false; this.travelTo(F.stairs[0], F.stairs[1]); return; }
        this.exploring = false; msg(F.stairs && P.x === F.stairs[0] && P.y === F.stairs[1] ? '這層已經探索完畢。按「下樓」繼續。' : '找不到可以探索的地方了。也許有秘門？試試搜尋。', 'i'); return;
      }
      const [x, y] = p[0];
      const bm = Game.monAt(x, y);
      if (bm && Game.monVisible(bm) && !bm.disg && bm.k !== 'keeper') { this.exploring = false; msg(MON[bm.k].n + '擋住了去路。', 'w'); return; }
      Render.setMove(this.STEP_EXPLORE, 1);
      // 唯一的路經過已知的陷阱時，直接小心跨過去，不用再按一次
      const ok = Game.move(x - P.x, y - P.y, { auto: 1, force: !!Game.trapAt(x, y) && Game.tile(x, y) !== T.LAVA });
      if (!ok) this.exploring = false;
      this.stepT = this.nextBeat(this.stepT, t, this.STEP_EXPLORE); return;
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
    if (S.zen) chips.push(['g', '金鐘罩 ' + S.zen]);
    if (G.F.detect) chips.push(['i', '透視']);
    if (G.F.locked) chips.push(['h', G.F.branch ? '出口封印' : '樓梯封印']);
    const rs = Game.reson(); if (rs) chips.push(['r', RESON[rs].n]);
    for (const t of Game.activeSets()) chips.push(['r', RSETS[t].n]);
    if (G.F.event) chips.push(['h', FEVENTS[G.F.event].n]);
    if (G.asc) chips.push(['c', '深淵 ' + G.asc]);
    if (G.mod) chips.push(['h', DMODS[G.mod].n]);
    const tv = Game.tile(P.x, P.y), here = tv === T.STAIRS ? 'stairs' : tv === T.PORTAL ? (G.F.branch ? 'leave' : 'enter') : Game.itemsAt(P.x, P.y).length ? (Game.itemsAt(P.x, P.y)[0].it.price ? 'buy' : 'pick') : 'rest';
    const sig = [P.hp, P.mhp, P.xp, P.lvl, P.gold, G.depth, chips.join(), (P.relics || []).length, P.cds[abil[0]], P.cds[abil[1]], here, st.arm, st.dmin, st.dmax].join('|');
    if (sig !== this.hudSig) {
      this.hudSig = sig;
      $('hpFill').style.width = clamp(P.hp / P.mhp * 100, 0, 100) + '%';
      $('hpBar').classList.toggle('low', P.hp < P.mhp * 0.3);
      $('hpT').textContent = Math.max(0, P.hp) + ' / ' + P.mhp;
      $('xpFill').style.width = clamp(P.xp / XP_NEED(P.lvl) * 100, 0, 100) + '%';
      $('lvT').textContent = 'Lv' + P.lvl;
      $('depthT').innerHTML = G.rush ? '<b>第 ' + (G.rushStage + 1) + ' 戰</b> 頭目連戰' : '<b>B' + G.depth + '</b> ' + Game.areaName();
      $('goldT').textContent = P.gold;
      $('atkT').textContent = st.dmin + '–' + st.dmax; $('armT').textContent = st.arm;
      this.relicUrl = this.relicUrl || {};
      const ri = (P.relics || []).map(k => { if (!this.relicUrl[k]) this.relicUrl[k] = Art.itemSprite({ k: 'relic', c: 'relic', relic: k }).c.toDataURL(); return '<img class="ri" title="' + esc(RELICS[k].n) + '" src="' + this.relicUrl[k] + '">'; }).join('');
      $('chips').innerHTML = ri + chips.map(([c, t]) => '<span class="chip ' + c + '">' + t + '</span>').join('');
      abil.forEach((id, i) => {
        const b = $('ab' + i), cd = P.cds[id];
        b.querySelector('.nm').textContent = ABIL[id].n;
        b.querySelector('.cd').textContent = cd > 0 ? cd : '';
        b.classList.toggle('cool', cd > 0);
      });
      const cb = $('bCtx');
      cb.querySelector('.nm').textContent = { stairs: G.rush ? '下一戰' : '下樓', enter: '進入', leave: '離開', buy: '購買', pick: '撿起', rest: '撿起' }[here];
      cb.classList.toggle('dim', here === 'rest');
      cb.classList.toggle('hot', here !== 'rest');
      cb.classList.toggle('lock', (here === 'stairs' || here === 'leave' && G.F.stairs && P.x === G.F.stairs[0] && P.y === G.F.stairs[1]) && !!G.F.locked);
      this.miniDirty = true;
    }
    // 頭像（每 0.3 秒換一格待機動作）
    const pt = (now() * 3.3) | 0;
    if (pt !== this.ptT || sig !== this.ptSig) { this.ptT = pt; this.ptSig = sig; this.drawSpr($('portrait'), Spr.hero(P.cls, pt % 2 ? FR.idle1 : FR.idle0, Spr.gearOf(P))); $('portrait').style.borderColor = CLASSES[P.cls].col; }
    // 頭目血條
    const boss = G.F.mons.find(m => m.hp > 0 && MON[m.k].boss && Game.monVisible(m));
    const bb = $('bossBar');
    if (boss) { if (bb.hidden) bb.hidden = false; const nm = MON[boss.k].n + (boss.enraged ? '・狂怒' : ''); if ($('bossName').dataset.n !== nm) { $('bossName').dataset.n = nm; $('bossName').innerHTML = esc(nm) + '<small>' + boss.hp + '</small>'; } $('bossName').querySelector('small').textContent = Math.max(0, boss.hp) + ' / ' + boss.mhp; $('bossFill').style.width = clamp(boss.hp / boss.mhp * 100, 0, 100) + '%'; bb.classList.toggle('rage', !!boss.enraged); }
    else if (!bb.hidden) bb.hidden = true;
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
    $('endTitle2').textContent = win ? (G.depth >= DEEP_LAST ? '抵達深淵盡頭！' : '征服深淵！') : G.lordSlain ? '倒在深淵下層' : '冒險結束';
    $('ovEnd').classList.toggle('win', win);
    $('endCause').textContent = G.cause;
    this.drawSpr($('endHero'), Spr.hero(S.cls, win ? FR.atk1 : FR.idle0, Spr.gearOf(G.P)));
    const kc = $('endKiller'); kc.hidden = $('endVs').hidden = !S.killer;
    if (S.killer) { const D = MON[S.killer]; if (D.boss) { kc.width = 56; kc.height = 50; } else { kc.width = 36; kc.height = 30; } const s = Spr.mon(S.killer, FR.atk1); const x = kc.getContext('2d'); this.drawSpr(kc, s, D.boss ? 0.8 : 1); x.save(); x.translate(kc.width, 0); x.scale(-1, 1); const tmp = document.createElement('canvas'); tmp.width = kc.width; tmp.height = kc.height; tmp.getContext('2d').drawImage(kc, 0, 0); x.clearRect(0, 0, kc.width, kc.height); x.drawImage(tmp, 0, 0); x.restore(); }
    // 深度條
    const bcol = ['#6aa85a', '#b98cff', '#ff7a3a', '#8fe8ff', '#d05cff', '#5fd0b0', '#ffd98a', '#ff5a6a'];
    if (G.rush) $('endDepth').innerHTML = Game.rushList().map((k, i) => '<i class="' + (i < (G.stats.rush || 0) ? 'on' : '') + (i === G.rushStage ? ' at' : '') + ' boss" style="background:' + bcol[biomeOf(RUSH_D[k])] + ';color:' + bcol[biomeOf(RUSH_D[k])] + '" title="' + MON[k].n + '"></i>').join('');
    else $('endDepth').innerHTML = Array.from({ length: G.lordSlain || S.depth > LAST_FLOOR ? DEEP_LAST : LAST_FLOOR }, (_, i) => { const d = i + 1; return '<i class="' + (d <= S.depth ? 'on' : '') + (d === S.depth ? ' at' : '') + (BOSS_FLOOR[d] ? ' boss' : '') + '" style="background:' + bcol[biomeOf(d)] + ';color:' + bcol[biomeOf(d)] + '" title="第 ' + d + ' 層"></i>'; }).join('');
    $('endStats').innerHTML = [['職業', CLASSES[S.cls].n + ' Lv' + S.lvl], G.rush ? ['連戰', (G.stats.rush || 0) + ' / ' + Game.rushList().length + ' 戰'] : ['深度', '第 ' + S.depth + ' 層'], ['回合', S.turns], ['擊殺', S.kills], ['精英', S.elites], ['寶箱', S.chests], ['金幣', S.gold], ['分數', S.score]].map(([a, b]) => '<div><small>' + a + '</small><b>' + b + '</b></div>').join('');
    $('endSouls').innerHTML = '獲得靈魂石 <span class="soul"></span><b>' + S.souls + '</b>　·　排行第 ' + S.rank + ' 名　·　種子 <b>' + esc(S.seed) + '</b>' + (S.seedRank && S.seedRank.n > 1 ? '（這個種子的第 ' + S.seedRank.rank + ' / ' + S.seedRank.n + ' 名）' : '') + (S.relics ? '　·　遺物 ' + S.relics + ' 件' : '');
    $('endSoulDet').textContent = (S.asc ? '基本 ' + S.soulBase + ' × 深淵 ' + S.asc + ' 加成 +' + S.asc * 20 + '%' : '') + (G.mod ? (S.asc ? '　·　' : '') + '今日變化：' + DMODS[G.mod].n : '');
    $('endUnlock').hidden = !G.newUnlock;
    if (G.newUnlock) $('endUnlock').textContent = '★ 解鎖新職業：' + CLASSES[G.newUnlock].n + '！';
    $('endAch').innerHTML = (S.ach || []).map(id => { const A = ACH.find(a => a.id === id); return '<div class="ach on"><span class="ic">★</span><div><b>' + A.n + '</b><p>' + A.d + (A.reward ? '　<em>' + A.reward + '</em>' : '') + '</p></div><span class="sv"><span class="soul"></span>' + A.s + '</span></div>'; }).join('');
    $('endLog').innerHTML = G.log.slice(-5).map(l => '<p style="color:' + COL[l.c] + '">' + esc(l.t) + '</p>').join('');
    this.show('ovEnd');
    Music.play(win ? 'title' : 'b4');
  },

  // ---------- 鍵盤 ----------
  onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input,textarea')) { if (e.key === 'Enter' && this.ov === 'ovNew') this.startRun(); return; }
    const k = e.code;
    if (this.dlgOpen && !$('ovTalk').hidden) { if (k === 'Escape' && !$('talkBye').hidden) $('talkBye').click(); else if (/^Digit[1-9]$/.test(k)) { const b = $('talkOpts').children[+k.slice(5) - 1]; if (b && !b.disabled) b.click(); } return; }
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
    if (KEYDIR[k]) {
      if (e.repeat) { if (!this.hold) { this.hold = KEYDIR[k]; this.holdKey = k; this.holdT = now(); } return; }
      this.hold = KEYDIR[k]; this.holdKey = k; this.holdT = now() + this.HOLD_FIRST;
      this.doDir(...KEYDIR[k]); return;
    }
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
      if (ov === 'ovPerk' || ov === 'ovRelic' || ov === 'ovEnd' || ov === 'ovTitle') return;
      if (ov === 'ovInv' && this.invMode === 'identify') { Game.finishIdentify(null); this.closeOv(); return; }
      if (ov === 'ovInv' && this.invSel != null) { this.invSel = null; this.renderInv(); return; }
      const b = document.querySelector('#' + ov + ' [data-back]'); if (b) b.click(); else this.closeOv();
      return;
    }
    if (ov === 'ovPerk' && /^Digit[1-3]$/.test(k)) { const c = G.perkChoices[+k.slice(5) - 1]; if (c) this.pickPerk(c); return; }
    if (ov === 'ovRelic' && /^Digit[1-3]$/.test(k)) { const c = G.relicChoices && G.relicChoices[+k.slice(5) - 1]; if (c) { Game.chooseRelic(c); this.closeOv(); } return; }
    if (ov === 'ovInv') {
      if (k === 'KeyI' && this.invMode === 'normal' && this.invSel == null) { this.closeOv(); return; }
      if (/^Key[A-Z]$/.test(k)) { const i = k.charCodeAt(3) - 65, list = this.sortedInv(this.invMode); if (list[i]) this.selectItem(list[i]); return; }
      if (/^Digit[1-9]$/.test(k) && this.invSel != null) { const it = Game.inv(this.invSel); if (!it) return; const a = this.itemActions(it)[+k.slice(5) - 1]; if (a) this.runItemAct(a[1]); return; }
      return;
    }
    if (ov === 'ovTitle') { if (k === 'Enter') { if (!$('tContinue').hidden) this.continueRun(); else this.openNew('normal'); } if (k === 'KeyN') this.openNew('normal'); return; }
    if (ov === 'ovNew') { if (k === 'Enter') this.startRun(); const i = /^Digit[1-6]$/.test(k) ? +k.slice(5) - 1 : -1; if (i >= 0 && Store.meta.unlocked[CLASS_ORDER[i]]) { this.selCls = CLASS_ORDER[i]; this.renderClasses(); } if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') { const un = CLASS_ORDER.filter(c => Store.meta.unlocked[c]); const j = un.indexOf(this.selCls) + (k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1); this.selCls = un[(j + un.length) % un.length]; this.renderClasses(); Snd.play('select'); e.preventDefault(); } return; }
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
