'use strict';
// 遊戲引擎：畫面配置、場景與熱點、道具欄、對話、視窗、提示、存檔、收集品、成就
const ROOMS = [], CASES = [], MEMO = {};
const VIEW_NAMES = { n: '北', e: '東', s: '南', w: '西' };

// ---------- 成就 ----------
const ACH = [
  { id: 'r1', n: '第一扇門', d: '逃出玄關。', ic: 'door' },
  { id: 'r8', n: '八音盒的新主人', d: '解開八音盒之家的全部八章。', ic: 'gift' },
  { id: 'bonus', n: '地底下的祕密', d: '破解番外篇的兩個房間。', ic: 'candle' },
  { id: 'cases', n: '小鎮名偵探', d: '破解推理事件簿的全部事件。', ic: 'lens' },
  { id: 'nohint', n: '自己想出來', d: '不看任何提示破一章。', ic: 'bulb' },
  { id: 'allStars', n: '滿天星斗', d: '所有謎屋章節都拿到三顆星。', ic: 'star' },
  { id: 'notes5', n: '聽見音符了', d: '找到 5 個隱藏音符。', ic: 'note' },
  { id: 'notesAll', n: '音符收藏家', d: '找到所有房間的隱藏音符。', ic: 'score' },
  { id: 'chal', n: '挑戰者', d: '完成一次挑戰模式。', ic: 'watch' },
  { id: 'gold', n: '閃電解謎王', d: '在挑戰模式拿到金牌。', ic: 'medal', ia: 3 },
  { id: 'perfectCase', n: '一針見血', d: '一次都沒出示錯誤就破案。', ic: 'bolt' },
  { id: 'cat', n: '麻糬的好朋友', d: '摸麻糬 15 次。', ic: 'cat' },
  { id: 'slide', n: '拼圖高手', d: '用 60 步以內拼好書房的畫。', ic: 'puzzle' },
  { id: 'replay', n: '換個謎題再來', d: '重玩一章（謎題的答案會改變）。', ic: 'replay' },
  { id: 'daily', n: '今天也來解謎', d: '完成一次「今日謎題」。', ic: 'cal' },
  { id: 'streak3', n: '三天打魚不曬網', d: '連續三天完成今日謎題。', ic: 'flame' },
  { id: 'c5', n: '絕對音感', d: '破解「音樂會的走音事件」。', ic: 'violin' },
  { id: 'secret', n: '鐘樓的祕密', d: '在標題畫面發現爺爺藏的小機關。', ic: 'sparkle', hide: 1 },
];

const G = {
  ctrl: null, held: null, active: false, timerOn: false, pan: null, panMax: 0,

  // ---------- 畫面配置 ----------
  layout() {
    const W = innerWidth, H = innerHeight, bar = H < 460 ? 42 : 48, avail = H - bar;
    const main = $('#main'), wrap = $('#sceneWrap');
    const ratio = 1.6;
    let sw, sh, vw, side = false;
    const port = W < H && W < 720;
    if (port) {
      // 手機直向：場景放大，左右拖曳看全景（熱點變大、好點）
      vw = Math.min(Math.round(W * 1.9), 1200); sh = Math.round(vw / ratio);
      const maxSh = avail - 270;
      if (sh > maxSh) { sh = Math.max(Math.round(W / ratio), maxSh); vw = Math.round(sh * ratio); }
      sw = W;
    } else {
      const invBelow = W < H ? 170 : 104;
      const w1 = Math.min(W, (avail - invBelow) * ratio);
      const sideW = W > 900 ? 190 : 150;
      const w2 = Math.min(W - sideW, avail * ratio);
      side = w2 > w1 * 1.04 && W > H;
      main.style.setProperty('--sideW', sideW + 'px');
      sw = Math.floor(side ? w2 : w1); sh = Math.floor(sw / ratio); vw = sw;
    }
    main.classList.toggle('side', side);
    wrap.style.width = sw + 'px'; wrap.style.height = sh + 'px';
    ['#scene', '#fxs'].forEach(q => { const e = $(q); e.style.width = vw + 'px'; e.style.height = sh + 'px'; });
    this.vw = vw; this.sw = sw; this.panMax = Math.max(0, vw - sw);
    wrap.classList.toggle('pannable', this.panMax > 0);
    this.setPan(this.pan == null ? this.panMax / 2 : this.pan, false);
    const cols = side ? 2 : clamp(Math.floor(W / 74), 5, 10);
    $('#slots').style.setProperty('--cols', cols);
    if (!side) $('#inv').style.maxWidth = Math.max(sw, Math.min(W, 640)) + 'px'; else $('#inv').style.maxWidth = '';
    $('#dlg').style.setProperty('--dlgH', (H < 460 ? 90 : 120) + 'px');
  },
  setPan(p, smooth) {
    this.pan = clamp(p, 0, this.panMax);
    const t = `translate3d(${-this.pan}px,0,0)`;
    ['#scene', '#fxs'].forEach(q => { const e = $(q); e.style.transition = smooth ? 'transform .35s ease' : 'none'; e.style.transform = t; });
    const pb = $('#panBar');
    if (pb) { pb.hidden = !this.panMax; if (this.panMax) { const f = this.sw / this.vw; pb.firstChild.style.width = (f * 100) + '%'; pb.firstChild.style.left = (this.pan / this.vw * 100) + '%'; } }
  },

  // ---------- 場景 ----------
  trans(kind, o) { this._tr = { kind, o }; },
  paint(svg, hots) {
    const art = $('#art');
    art.innerHTML = svg;
    $('#fxs').innerHTML = this.lift();
    A.enrich(art); A.enrich($('#fxs'));
    let h = '';
    this.hots = hots || [];
    this.hots.forEach((o, i) => {
      const id = esc(o.id || ('h' + i));
      if (o.c) h += `<circle data-hs="${id}" data-i="${i}" cx="${o.c[0]}" cy="${o.c[1]}" r="${o.c[2]}"/>`;
      else h += `<rect data-hs="${id}" data-i="${i}" x="${o.r[0]}" y="${o.r[1]}" width="${o.r[2]}" height="${o.r[3]}" rx="10"/>`;
    });
    $('#hs').innerHTML = h;
    const tr = this._tr; this._tr = null;
    if (tr) {
      const els = [art, $('#fxs')];
      els.forEach(e => { e.style.animation = 'none'; if (tr.o) e.style.transformOrigin = tr.o; else e.style.transformOrigin = ''; });
      void art.getBoundingClientRect();
      els.forEach(e => { e.style.animation = ''; e.setAttribute('class', 'tr-' + tr.kind); });
      clearTimeout(this._trT); this._trT = setTimeout(() => els.forEach(e => e.removeAttribute('class')), 500);
    }
  },
  // 把動畫層的每個東西拆成各自的小 SVG（各自一層），動畫就不會讓整個場景重畫，手機上才順
  LIFT: /^(mote|cloud|flick|twk|glowp|pend|sway|spin|spinr|steam|bob|fly|hnote|idle|metro|pidle|pidleB|tick|spk|tail|tail2|ear|blinkc|breathe|zz|flame|swing)\b/,
  lift() {
    const items = A._fx.filter(Boolean); A._fx = [];
    if (!items.length) return '';
    const m = $('#meas'); m.innerHTML = items.map(i => `<g>${i}</g>`).join('');
    let out = '';
    Array.from(m.children).forEach((g, k) => {
      let b; try { b = g.getBBox(); } catch (e) { b = null; }
      if (!b || !b.width && !b.height) return;
      let html = items[k], cls = '', st = '';
      const top = g.firstElementChild;
      if (g.children.length === 1 && top && top.getAttribute('class') && this.LIFT.test(top.getAttribute('class'))) {
        cls = top.getAttribute('class'); st = top.getAttribute('style') || '';
        top.removeAttribute('class'); top.removeAttribute('style'); html = top.outerHTML;
      }
      const pad = cls ? 2 : 34, x = b.x - pad, y = b.y - pad, w = b.width + pad * 2, h = b.height + pad * 2;
      out += `<svg class="fxi ${cls}" style="left:${x / 10}%;top:${y / 6.25}%;width:${w / 10}%;height:${h / 6.25}%;${st}" viewBox="${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" preserveAspectRatio="none">${html}</svg>`;
    });
    m.innerHTML = '';
    return out;
  },
  // 自動偵測（分兩段）：有點吃力（每秒不到約 45 格）→ 先關掉灰塵、星光等小粒子（mid）；
  // 還是很吃力（不到 25 格）→ 環境動畫全部停下（lo）。玩家在選單選「開」(hi) 就不再自動調整。
  fpsWatch() {
    const fx = Store.data.fx;
    if (this._fw || fx === 'hi' || fx === 'lo' || document.hidden) return; this._fw = 1;
    const t = []; let last = performance.now();
    const f = now => {
      t.push(now - last); last = now;
      if (t.length < 90) { requestAnimationFrame(f); return; }
      t.shift(); t.sort((a, b) => a - b); const med = t[t.length >> 1], p75 = t[(t.length * 0.75) | 0];
      this._fw = 0; this.lastFps = Math.round(1000 / med);
      if (document.hidden) return;
      if (med > 40) { Store.data.fx = 'lo'; Store.save(); this.applyFx(); }
      else if ((med > 22 || p75 > 30) && Store.data.fx !== 'mid') { Store.data.fx = 'mid'; Store.save(); this.applyFx(); setTimeout(() => this.fpsWatch(), 2500); }
    };
    setTimeout(() => requestAnimationFrame(f), 1500);
  },
  // 環境動畫的更新頻率：標題畫面固定 30 格；遊戲中「開」＝全速、自動＝30 格、精簡＝20 格
  ambRate() { const fx = Store.data.fx; if (!$('#title').hidden) return 30; return fx === 'hi' ? 0 : fx === 'mid' ? 20 : 30; },
  applyFx() { const fx = Store.data.fx; Amb.set(this.ambRate()); document.body.classList.toggle('lowfx', fx === 'lo' || matchMedia('(prefers-reduced-motion: reduce)').matches); document.body.classList.toggle('midfx', fx === 'mid'); },
  toast(t, ms = 3600) {
    const el = $('#toast'); el.innerHTML = t; el.hidden = false;
    const lg = $('#log'); if (lg) { const li = document.createElement('li'); li.innerHTML = t; lg.prepend(li); while (lg.children.length > 30) lg.lastChild.remove(); }
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(this._tt); this._tt = setTimeout(() => { el.hidden = true; }, ms);
  },
  say(t) { this.toast(t); },

  // ---------- 大字特效（矛盾！／請等一下！）----------
  bang(text, kind = 'red', cb) {
    const el = $('#bang');
    el.className = 'bang-' + kind; el.hidden = false;
    let rays = ''; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, a2 = a + 0.07; rays += `M500 312L${500 + Math.cos(a) * 900} ${312 + Math.sin(a) * 900}L${500 + Math.cos(a2) * 900} ${312 + Math.sin(a2) * 900}z`; }
    let bub = ''; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, r = i % 2 ? 230 : 300; bub += (i ? 'L' : 'M') + (500 + Math.cos(a) * r * 1.35).toFixed(0) + ' ' + (312 + Math.sin(a) * r * 0.62).toFixed(0); }
    el.innerHTML = `<svg viewBox="0 0 1000 625" preserveAspectRatio="xMidYMid ${innerWidth < innerHeight ? 'meet' : 'slice'}"><path d="${rays}" class="rays"/><g class="bub"><path d="${bub}z" class="bb"/><text x="500" y="350" text-anchor="middle" class="bt">${text}</text></g></svg>`;
    document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake');
    Snd.play(kind === 'blue' ? 'hold' : 'objection');
    let done = false;
    const end = () => { if (done) return; done = true; el.hidden = true; el.onclick = null; document.body.classList.remove('shake'); cb && cb(); };
    el.onclick = end; setTimeout(end, 1150);
  },

  // ---------- 對話 ----------
  dlg(lines, cb, opt = {}) {
    if (!lines || !lines.length) { cb && cb(); return; }
    const box = $('#dlg'); let i = 0, lastW = null;
    const show = () => {
      let L = lines[i]; if (typeof L === 'string') L = { t: L };
      if (L.bang) { box.hidden = true; this.dlgNext = null; this.bang(L.bang, L.kind || 'red', () => { box.hidden = false; this.dlgNext = next; next(true); }); return; }
      box.className = (L.l ? 'letter ' : '') + (L.big ? 'big' : '');
      const P = L.w && PEOPLE[L.w];
      $('#dlgWho').textContent = L.l ? (L.who || '字條') : (P ? P.n : (L.who || ''));
      $('#dlgText').innerHTML = L.t;
      const pic = $('#dlgPic');
      const staged = P && opt.stage && opt.stage(L.w, L.e || 'n');
      if (P && !L.nopic && !staged) {
        pic.innerHTML = Face.draw(L.w, L.e || 'n', true); A.enrich(pic, 'L');
        pic.className = (lastW !== L.w ? 'in ' : 'talk ') + ((L.e === 's' || L.e === 'a' || L.e === 'c') ? 'jolt' : '');
        void pic.offsetWidth;
      } else { pic.innerHTML = ''; pic.className = ''; }
      lastW = P ? L.w : null;
      if (L.sfx) Snd.play(L.sfx);
      if (P && L.w !== 'mochi' && !L.sfx) Snd.blip(L.w);
    };
    const next = (silent) => {
      i++;
      if (i >= lines.length) { box.hidden = true; this.dlgNext = null; $('#dlgPic').innerHTML = ''; opt.stage && opt.stage(null); cb && cb(); }
      else { if (!silent) Snd.play('tap'); show(); }
    };
    this.dlgNext = () => next();
    box.hidden = false; show();
  },

  // ---------- 特效卡片 ----------
  overlay(html, ms, cb, cls = '') {
    const el = $('#ovl'); el.className = cls; el.innerHTML = html; el.hidden = false;
    let done = false;
    const end = () => { if (done) return; done = true; el.hidden = true; el.innerHTML = ''; el.onclick = null; cb && cb(); };
    el.onclick = end; setTimeout(end, ms);
  },
  titleCard(R, cb) { // 章節開場卡
    const isCase = !R.walls;
    const no = isCase ? `CASE ${R.no}` : (R.bonus ? `EXTRA · ${R.no}` : `CHAPTER ${R.no}`);
    const orn = flip => `<svg class="tc-orn" viewBox="0 0 320 40" aria-hidden="true"${flip ? ' style="transform:scaleY(-1)"' : ''}><path d="M10 20H128M192 20H310" stroke="#e0b048" stroke-width="1.2" opacity=".8"/><path d="M128 20q-14-14-30-6q14 2 18 10M192 20q14-14 30-6q-14 2-18 10M100 20q-10 8-24 4M220 20q10 8 24 4" stroke="#e0b048" stroke-width="1.3" fill="none"/><circle cx="10" cy="20" r="2.4" fill="#e0b048"/><circle cx="310" cy="20" r="2.4" fill="#e0b048"/><g transform="translate(160 20)"><path d="${A.gearPath(0, 0, 13, 10, 0.4)}" fill="url(#brass)" fill-rule="evenodd" stroke="#6a3d10" stroke-width=".8"/><path d="M-26 0l6-4v8zM26 0l-6-4v8z" fill="#e0b048"/></g></svg>`;
    this.overlay(`<div class="tcard">${orn(0)}<small>${no}</small><h2>${esc(R.name)}</h2><p>${esc(R.en || (isCase ? '小鎮推理事件簿' : ''))}</p>${orn(1)}${this.ctrl && this.ctrl.daily ? `<b class="tc-chal daily">${ICO('cal')} 今日謎題 ${this.ctrl.daily.slice(5).replace('-', '/')}：不能看提示，今天大家的答案都一樣</b>` : this.ctrl && this.ctrl.chal ? `<b class="tc-chal">${ICO('watch')} 挑戰模式：不能看提示，謎題答案隨機</b>` : ''}</div>`, 1900, cb, 'tc');
  },
  gearGet(n, cb) {
    Snd.play('solve');
    this.overlay(`<div class="gget"><svg viewBox="-80 -80 160 160"><circle r="76" fill="url(#lampG)"/><g class="gspin"><g transform="translate(-50 -50)">${IC.gear(n)}</g></g></svg><small>音符齒輪</small><h3>${ROMAN[n - 1]}</h3><p>收集 ${n} / 8</p></div>`, 1700, cb, 'gg');
  },

  // ---------- 視窗 ----------
  modal(html, o = {}) {
    const m = $('#modal'); $('#panel').style.setProperty('--pw', (o.w || 560) + 'px');
    $('#panel').className = o.cls || '';
    const b = $('#mBody'); b.onclick = null; b.innerHTML = html; m.hidden = false; A.enrich(b, 'L');
    this.onClose = o.onClose || null;
    $('#mClose').hidden = !!o.noClose;
    return $('#mBody');
  },
  closeModal() {
    if ($('#modal').hidden) return;
    $('#modal').hidden = true; $('#mBody').innerHTML = '';
    const f = this.onClose; this.onClose = null; f && f();
    if (this.ctrl) this.ctrl.render();
  },
  read(title, text, cls = '') { // 閱讀紙條
    Snd.play('page');
    this.modal(`<h3>${title}</h3><div class="paper ${cls}">${text}</div>`, { w: 520 });
  },

  // ---------- 計時 ----------
  tick() {
    if (!this.ctrl || !this.active || document.hidden || !$('#dlg').hidden || !$('#ovl').hidden) return;
    this.ctrl.time = (this.ctrl.time || 0) + 1;
    $('#clock').textContent = fmtTime(this.ctrl.time);
    if (this.ctrl.time % 5 === 0) this.ctrl.save();
  },

  enter(ctrl) {
    $('#log').innerHTML = '';
    this.ctrl = ctrl; this.held = null; this.active = true; this.pan = null;
    $$('.screen').forEach(e => e.hidden = true); $('#play').hidden = false;
    document.body.classList.toggle('chal', !!ctrl.chal);
    this.layout(); ctrl.render(); Amb.set(this.ambRate()); this.fpsWatch();
  },
  leave() { if (this.ctrl) this.ctrl.save(); this.active = false; this.ctrl = null; this.held = null; $('#play').hidden = true; $('#modal').hidden = true; $('#dlg').hidden = true; $('#ovl').hidden = true; document.body.classList.remove('chal'); },

  // ---------- 道具欄 ----------
  renderSlots(list, sel, opt = {}) {
    let h = '';
    const n = Math.max(list.length, opt.min || 8);
    for (let i = 0; i < n; i++) {
      const it = list[i];
      if (!it) { h += '<div class="slot empty"></div>'; continue; }
      h += `<button class="slot${it.id === sel ? ' sel' : ''}${it.isNew ? ' new' : ''}" data-slot="${esc(it.id)}" aria-label="${esc(it.n)}"><svg viewBox="0 0 100 100">${it.ic}</svg><span class="nm">${esc(it.n)}</span></button>`;
    }
    $('#slots').innerHTML = h; A.enrich($('#slots'), 'L');
  },
  memoAdd(id, quiet) {
    if (!MEMO[id] || Store.data.memo.includes(id)) return;
    Store.data.memo.push(id); Store.save();
    $('#memoDot').hidden = false;
    if (!quiet) setTimeout(() => this.toast('手帳裡記下了一條關於 <b>X</b> 的線索。'), 900);
  },
  memoView(pick, cb) {
    $('#memoDot').hidden = true;
    const list = Store.data.memo.filter(id => MEMO[id]);
    const body = this.modal(`<h3>${pick ? '選出能證明的線索' : '偵探手帳'}</h3><p class="sub">${pick ? '點一條線索來出示。' : '關於神秘人 X 的線索都記在這裡。'}</p>` +
      (list.length ? `<ul class="memoList">${list.map(id => `<li class="${pick ? 'pick' : ''}" data-memo="${id}"><b>${MEMO[id].t}</b>${MEMO[id].d}</li>`).join('')}</ul>` : '<p class="paper">還沒有任何線索。</p>'), { w: 560 });
    if (pick) body.querySelectorAll('[data-memo]').forEach(li => li.onclick = () => { this.closeModal(); cb(li.dataset.memo); });
  },

  // ---------- 成就與收集 ----------
  ach(id) {
    const A0 = ACH.find(a => a.id === id); if (!A0 || Store.data.ach[id]) return;
    Store.data.ach[id] = Date.now(); Store.save();
    const el = $('#achT'); el.innerHTML = `<i>${ICO(A0.ic, '', A0.ia)}</i><span><small>解鎖成就</small><b>${esc(A0.n)}</b></span>`;
    el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(this._at); this._at = setTimeout(() => el.hidden = true, 3200);
    setTimeout(() => Snd.play('ach'), 120);
  },
  stat(k, n = 1) { Store.data.stat[k] = (Store.data.stat[k] || 0) + n; Store.save(); return Store.data.stat[k]; },
  petCat() { if (this.stat('cat') >= 15) this.ach('cat'); },
  checkMeta() {
    const P = Store.data.prog, main = ROOMS.filter(r => !r.bonus), bonus = ROOMS.filter(r => r.bonus);
    if (P.r1 && P.r1.done) this.ach('r1');
    if (main.every(r => P[r.id] && P[r.id].done)) this.ach('r8');
    if (bonus.length && bonus.every(r => P[r.id] && P[r.id].done)) this.ach('bonus');
    if (CASES.every(c => Store.data.cases[c.id] && Store.data.cases[c.id].done)) this.ach('cases');
    if (ROOMS.every(r => P[r.id] && P[r.id].stars >= 3)) this.ach('allStars');
    const nn = Object.keys(Store.data.notes).length;
    if (nn >= 5) this.ach('notes5');
    if (ROOMS.every(r => Store.data.notes[r.id])) this.ach('notesAll');
  },
};

// ---------- 房間控制 ----------
function RoomCtrl(room, resume, opt = {}) {
  const R = room, C = this;
  C.kind = 'room'; C.room = R;
  if (resume) { Object.assign(C, clone(resume)); }
  else {
    C.s = R.init(); C.inv = []; C.view = R.walls[0]; C.time = 0; C.hl = {}; C.hc = 0; C.newI = {};
    C.chal = !!opt.chal || !!opt.daily; C.daily = opt.daily || null;
    // 重玩或挑戰模式：謎題答案隨機變化（第一次玩是固定的標準答案）；每日謎題用日期當種子，大家同一天拿到一樣的題目
    const replay = !!(Store.data.prog[R.id] && Store.data.prog[R.id].done);
    if (R.vary && (C.chal || replay)) { C.s.v = R.vary(makeRng(C.daily ? Daily.seed(C.daily, R.id) : (Math.random() * 1e9) | 0)); }
    C.replay = replay;
  }
  C.newI = C.newI || {};
  if (R.migrate) R.migrate(C);

  C.save = () => {
    if (C.fin) return;
    Store.data.cur = { kind: 'room', id: R.id, s: C.s, inv: C.inv, view: C.view, time: C.time, hl: C.hl, hc: C.hc, newI: C.newI, chal: C.chal, replay: C.replay, daily: C.daily };
    Store.save();
  };
  C.has = id => C.inv.includes(id);
  C.give = (id, quiet) => {
    if (!C.has(id)) C.inv.push(id);
    C.newI[id] = 1;
    const m = /^g(\d)$/.exec(id);
    if (m && !C.s['gg' + m[1]]) { C.s['gg' + m[1]] = 1; G._gearAt = Date.now(); setTimeout(() => G.gearGet(+m[1]), quiet ? 350 : 50); }
    if (!quiet) { Snd.play('pick'); G.toast(`得到了「<b>${ITEMS[id].n}</b>」`); }
  };
  C.take = id => { C.inv = C.inv.filter(x => x !== id); if (G.held === id) G.held = null; };
  C.go = (v, h) => {
    const from = C.view, isWall = x => R.walls.includes(x);
    if (isWall(from) && isWall(v)) { const i = R.walls.indexOf(from), j = R.walls.indexOf(v), n = R.walls.length; G.trans((j - i + n) % n === 1 ? 'r' : 'l'); }
    else if (R.views[v].back === from || (h && !isWall(v))) { const o = h ? (h.c ? `${h.c[0]}px ${h.c[1]}px` : `${h.r[0] + h.r[2] / 2}px ${h.r[1] + h.r[3] / 2}px`) : '500px 312px'; G.trans('in', o); }
    else G.trans('out', '500px 312px');
    C.view = v; G.pan = G.panMax / 2; G.setPan(G.pan, false);
    Snd.play(R.views[v].back ? 'step' : 'turn'); C.render();
  };

  C.V = () => C.s.v || R.canon || {};
  C.render = () => {
    const v = R.views[C.view];
    const hots = v.hot(C.s, C).slice();
    A.setKey(R, C.view);
    let svg = v.draw(C.s, C);
    if (R.deco) svg = svg.replace('<!--DECO-->', R.deco(C.view, C.s) || '');
    if (R.note && R.note.v === C.view && !Store.data.notes[R.id] && (!R.note.cond || R.note.cond(C.s))) {
      A.hiddenNote(R.note.x, R.note.y, R.note.s || 1);
      hots.push({ id: 'hnote', c: [R.note.x, R.note.y, 30], note: 1 });
    }
    if (R.amb) A.fx(R.amb(C.view, C.s) || '');
    G.paint(svg, hots);
    $('#rNo').textContent = `${R.bonus ? '番外' : '第 ' + R.no + ' 章'} · ${R.en}${C.daily ? ' · 今日謎題' : C.chal ? ' · 挑戰' : ''}`;
    $('#rName').textContent = R.name + (v.title ? '　' + v.title : '');
    $('#clock').textContent = fmtTime(C.time);
    $('#hintN').textContent = C.chal ? '✕' : C.hc;
    $('#hearts').hidden = true; $('#bMemo').hidden = false; $('#bHint').hidden = false;
    const isWall = R.walls.includes(C.view);
    $('#nL').hidden = $('#nR').hidden = !isWall || !!v.noNav;
    $('#nB').hidden = isWall;
    $('#compass').innerHTML = isWall ? R.walls.map(w => `<i class="${w === C.view ? 'on' : ''}">${VIEW_NAMES[w]}</i>`).join('') : '';
    $('#invTitle').textContent = '道具';
    $('#invTip').textContent = Store.data.notes[R.id] ? '♪ 已找到隱藏音符' : '';
    $('#tActs').hidden = true; $('#invInfo').hidden = false;
    G.renderSlots(C.inv.map(id => ({ id, n: ITEMS[id].n, ic: ITEMS[id].ic(C.s), isNew: C.newI[id] })), G.held, { min: 8 });
    const it = G.held && ITEMS[G.held];
    $('#heldName').innerHTML = it ? `手上拿著「<b>${esc(it.n)}</b>」，點畫面上的東西使用，或點另一個道具組合。` : (C.inv.length ? '點一下道具拿在手上；再點一次可以仔細查看。' : '找到的道具會放在這裡。');
    $('#bInspect').hidden = !it;
    document.body.classList.toggle('held', !!it);
  };
  C.nav = d => {
    if (d === 'B') { const v = R.views[C.view]; C.go(v.back); return; }
    const i = R.walls.indexOf(C.view), n = R.walls.length;
    C.go(R.walls[(i + (d === 'L' ? n - 1 : 1)) % n]);
  };
  C.hit = h => {
    const it = G.held;
    if (h.note) { Store.data.notes[R.id] = 1; Store.save(); Snd.play('note'); G.toast(`找到了藏起來的<b>小音符</b>！（${Object.keys(Store.data.notes).length} / ${ROOMS.length}）`); G.checkMeta(); C.render(); return; }
    if (it) {
      if (h.use && h.use[it]) { G.held = null; h.use[it](C, it); }
      else if (h.use && h.use['*']) { G.held = null; h.use['*'](C, it); }
      else if (h.go) { C.go(h.go, h); return; }
      else { G.held = null; Snd.play('wrong'); G.toast(`「${ITEMS[it].n}」在這裡好像派不上用場。`); }
    } else if (h.go) { C.go(h.go, h); return; }
    else if (h.on) h.on(C);
    else if (h.t) { Snd.play('tap'); G.toast(h.t); }
    if (h.id === 'cat' || /^cat/.test(h.id || '')) G.petCat();
    C.save(); C.render(); C.checkStep();
  };
  C.onSlot = id => {
    delete C.newI[id];
    if (G.held === id) { C.inspect(id); return; }
    if (G.held) {
      const a = G.held, b = id;
      const cb = (R.combos || []).find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
      G.held = null;
      if (cb) { Snd.play('combine'); cb.f(C); C.save(); }
      else { Snd.play('wrong'); G.toast('這兩樣東西沒辦法組合在一起。'); }
      C.render(); C.checkStep(); return;
    }
    G.held = id; Snd.play('select'); C.render();
  };
  C.inspect = id => {
    const I = ITEMS[id];
    G.held = null;
    if (I.insp) { I.insp(C); C.render(); return; }
    Snd.play('page');
    G.modal(`<h3>${esc(I.n)}</h3><div class="itemBig"><svg viewBox="0 0 100 100">${I.ic(C.s)}</svg><p>${typeof I.d === 'function' ? I.d(C.s) : I.d}</p></div>`, { w: 480 });
    C.render();
  };
  C.stepIdx = () => { const st = R.steps; for (let i = 0; i < st.length; i++) if (!st[i].done(C.s, C)) return i; return st.length; };
  C.checkStep = () => { };
  C.hint = () => {
    if (C.chal) { G.modal(`<h3>${C.daily ? '今日謎題' : '挑戰模式'}</h3><p class="paper">${C.daily ? '今日謎題' : '挑戰模式'}不能看提示喔！\n想看提示的話，可以從選單離開，用一般模式重玩這一章。</p>`, { w: 440 }); return; }
    const k = C.stepIdx(), st = R.steps[k];
    if (!st) { G.modal('<h3>提示</h3><p class="paper">這一章的謎題都解開了！</p>'); return; }
    const draw = () => {
      const L = C.hl[k] || 0;
      let h = `<h3>X 的提示紙條</h3><p class="sub">第 ${k + 1} / ${R.steps.length} 步：${st.goal}</p>`;
      for (let i = 0; i < L; i++) h += `<div class="hintBox${i === 2 ? ' ans' : ''}"><b>${i === 2 ? '答案' : '提示 ' + (i + 1)}</b>${hv(st.h[i], C.s)}</div>`;
      if (L < 3) h += `<div class="btnRow"><button class="ok" id="moreHint">${L === 0 ? '給我一點提示' : L === 1 ? '再多一點' : '直接告訴我答案'}</button></div><p class="sub" style="text-align:center;margin-top:8px">看提示會影響這一章的星星數。</p>`;
      const b = G.modal(h, { w: 520 });
      const mb = b.querySelector('#moreHint');
      if (mb) mb.onclick = () => { C.hl[k] = (C.hl[k] || 0) + 1; C.hc++; Snd.play('page'); C.save(); $('#hintN').textContent = C.hc; draw(); };
    };
    draw();
  };
  C.finish = () => {
    if (C.fin) return; C.fin = 1;
    G.active = false; G.held = null;
    const p = Store.data.prog[R.id] || {};
    const stars = starsFor(C.time, C.hc, R.par, 0);
    const first = !p.done;
    Store.data.prog[R.id] = { done: true, stars: Math.max(p.stars || 0, stars), time: p.time ? Math.min(p.time, C.time) : C.time, hints: p.done ? Math.min(p.hints, C.hc) : C.hc };
    let medal = null;
    let daily = null;
    if (C.daily) {
      medal = C.time <= R.par * 0.6 ? 3 : C.time <= R.par ? 2 : 1;
      const D = Daily.rec(), h = D.hist[C.daily] || {}, first = !h.done;
      D.hist[C.daily] = { id: R.id, done: 1, time: h.time ? Math.min(h.time, C.time) : C.time, medal: Math.max(h.medal || 0, medal) };
      if (first) { D.streak = D.last === Daily.shift(C.daily, -1) ? (D.streak || 0) + 1 : D.last === C.daily ? D.streak : 1; D.last = C.daily; D.best = Math.max(D.best || 0, D.streak); }
      const keys = Object.keys(D.hist).sort(); while (keys.length > 60) delete D.hist[keys.shift()];
      daily = { streak: D.streak, first };
      G.ach('daily'); if (D.streak >= 3) G.ach('streak3');
    } else if (C.chal) {
      medal = C.time <= R.par * 0.6 ? 3 : C.time <= R.par ? 2 : 1;
      const ch = Store.data.chal[R.id] || {};
      Store.data.chal[R.id] = { best: ch.best ? Math.min(ch.best, C.time) : C.time, medal: Math.max(ch.medal || 0, medal) };
      G.ach('chal'); if (medal === 3) G.ach('gold');
    }
    if (C.hc === 0) G.ach('nohint');
    if (C.replay) G.ach('replay');
    Store.data.cur = null; Store.save();
    G.checkMeta();
    Snd.play('fanfare');
    G.dlg(first || !C.replay ? (R.outro || []) : (R.outro || []).slice(0, 2), () => Main.showClear({ kind: 'room', def: R, stars, time: C.time, hints: C.hc, first, chal: C.chal, medal, daily }));
  };
  C.win = () => { setTimeout(() => C.finish(), 500); };
}

// 按鈕事件
function bindEngine() {
  $('#hs').addEventListener('click', e => {
    if (G._dragged) return;
    const el = e.target.closest('[data-i]'); if (!el || !G.ctrl) return;
    Snd.init();
    const h = G.hots[+el.dataset.i]; if (!h) return;
    el.classList.remove('flash'); void el.getBBox; el.classList.add('flash');
    G.ctrl.hit(h);
  });
  // 直向手機：左右拖曳場景
  const wrap = $('#sceneWrap'); let ds = null;
  wrap.addEventListener('pointerdown', e => { if (!G.panMax || e.target.closest('.nav')) return; ds = { x: e.clientX, y: e.clientY, p: G.pan, drag: false, id: e.pointerId }; });
  wrap.addEventListener('pointermove', e => {
    if (!ds || e.pointerId !== ds.id) return;
    const dx = e.clientX - ds.x;
    if (!ds.drag && Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(e.clientY - ds.y)) { ds.drag = true; try { wrap.setPointerCapture(e.pointerId); } catch (er) { } }
    if (ds.drag) { G.setPan(ds.p - dx, false); Store.data.stat.panned = 1; }
  });
  const up = () => { if (ds && ds.drag) { G._dragged = true; setTimeout(() => G._dragged = false, 80); } ds = null; };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
  $('#slots').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (b && G.ctrl) { Snd.init(); G.ctrl.onSlot(b.dataset.slot); } });
  $('#bInspect').onclick = () => { if (G.ctrl && G.held && G.ctrl.inspect) G.ctrl.inspect(G.held); };
  $('#nL').onclick = () => G.ctrl && G.ctrl.nav('L');
  $('#nR').onclick = () => G.ctrl && G.ctrl.nav('R');
  $('#nB').onclick = () => G.ctrl && G.ctrl.nav('B');
  $('#bHint').onclick = () => { Snd.init(); G.ctrl && G.ctrl.hint(); };
  $('#bMemo').onclick = () => { Snd.init(); G.memoView(); };
  $('#mClose').onclick = () => G.closeModal();
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !$('#mClose').hidden) G.closeModal(); });
  $('#dlg').addEventListener('click', () => G.dlgNext && G.dlgNext());
  $('#toast').addEventListener('click', () => $('#toast').hidden = true);
  $$('.mute').forEach(b => b.onclick = () => { Snd.toggle(); });
  addEventListener('keydown', e => {
    if (!$('#ovl').hidden && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); $('#ovl').click(); return; }
    if (!$('#bang').hidden && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); $('#bang').click(); return; }
    if (!$('#dlg').hidden && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); G.dlgNext && G.dlgNext(); return; }
    if (e.key === 'Escape') { if (!$('#modal').hidden) G.closeModal(); else if (G.held && G.ctrl) { G.held = null; G.ctrl.render(); } }
    if ($('#modal').hidden && $('#dlg').hidden && G.ctrl && G.active) {
      if (e.key === 'ArrowLeft' && !$('#nL').hidden) G.ctrl.nav('L');
      if (e.key === 'ArrowRight' && !$('#nR').hidden) G.ctrl.nav('R');
      if (e.key === 'ArrowDown' && !$('#nB').hidden) G.ctrl.nav('B');
    }
  });
  addEventListener('resize', () => G.layout());
  setInterval(() => G.tick(), 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.ctrl) G.ctrl.save(); });
}
