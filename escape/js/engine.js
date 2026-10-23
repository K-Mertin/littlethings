'use strict';
// 遊戲引擎：畫面配置、場景與熱點、道具欄、對話、視窗、提示、存檔
const ROOMS = [], CASES = [], MEMO = {};
const VIEW_NAMES = { n: '北', e: '東', s: '南', w: '西' };

const G = {
  ctrl: null, held: null, active: false, timerOn: false,

  // ---------- 畫面配置 ----------
  layout() {
    const W = innerWidth, H = innerHeight, bar = H < 460 ? 42 : 48, avail = H - bar;
    const main = $('#main'), wrap = $('#sceneWrap');
    const ratio = 1.6;
    // 方案一：道具欄在下方
    const invBelow = W < H ? 170 : 104;
    const w1 = Math.min(W, (avail - invBelow) * ratio);
    // 方案二：道具欄在右側
    const sideW = W > 900 ? 190 : 150;
    const w2 = Math.min(W - sideW, avail * ratio);
    const side = w2 > w1 * 1.04 && W > H;
    main.classList.toggle('side', side);
    const sw = Math.floor(side ? w2 : w1), sh = Math.floor(sw / ratio);
    wrap.style.width = sw + 'px'; wrap.style.height = sh + 'px';
    main.style.setProperty('--sideW', sideW + 'px');
    const cols = side ? 2 : clamp(Math.floor(W / 74), 5, 10);
    $('#slots').style.setProperty('--cols', cols);
    if (!side) $('#inv').style.maxWidth = Math.max(sw, Math.min(W, 640)) + 'px'; else $('#inv').style.maxWidth = '';
    $('#dlg').style.setProperty('--dlgH', (H < 460 ? 90 : 120) + 'px');
  },

  // ---------- 場景 ----------
  paint(svg, hots) {
    $('#art').innerHTML = svg;
    let h = '';
    this.hots = hots || [];
    this.hots.forEach((o, i) => {
      const id = esc(o.id || ('h' + i));
      if (o.c) h += `<circle data-hs="${id}" data-i="${i}" cx="${o.c[0]}" cy="${o.c[1]}" r="${o.c[2]}"/>`;
      else h += `<rect data-hs="${id}" data-i="${i}" x="${o.r[0]}" y="${o.r[1]}" width="${o.r[2]}" height="${o.r[3]}" rx="10"/>`;
    });
    $('#hs').innerHTML = h;
  },
  toast(t, ms = 3600) {
    const el = $('#toast'); el.innerHTML = t; el.hidden = false;
    const lg = $('#log'); if (lg) { const li = document.createElement('li'); li.innerHTML = t; lg.prepend(li); while (lg.children.length > 30) lg.lastChild.remove(); }
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(this._tt); this._tt = setTimeout(() => { el.hidden = true; }, ms);
  },
  say(t) { this.toast(t); },

  // ---------- 對話 ----------
  dlg(lines, cb) {
    if (!lines || !lines.length) { cb && cb(); return; }
    const box = $('#dlg'); let i = 0;
    const show = () => {
      let L = lines[i]; if (typeof L === 'string') L = { t: L };
      box.className = (L.l ? 'letter ' : '') + (L.big ? 'big' : '');
      const P = L.w && PEOPLE[L.w];
      $('#dlgWho').textContent = L.l ? (L.who || '字條') : (P ? P.n : (L.who || ''));
      $('#dlgText').innerHTML = L.t;
      $('#dlgPic').innerHTML = P && !L.nopic ? Face.draw(L.w, L.e || 'n') : '';
      if (L.sfx) Snd.play(L.sfx);
    };
    this.dlgNext = () => {
      i++;
      if (i >= lines.length) { box.hidden = true; this.dlgNext = null; $('#dlgPic').innerHTML = ''; cb && cb(); }
      else { Snd.play('tap'); show(); }
    };
    box.hidden = false; show();
  },

  // ---------- 視窗 ----------
  modal(html, o = {}) {
    const m = $('#modal'); $('#panel').style.setProperty('--pw', (o.w || 560) + 'px');
    const b = $('#mBody'); b.onclick = null; b.innerHTML = html; m.hidden = false;
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
    if (!this.ctrl || !this.active || document.hidden || !$('#dlg').hidden) return;
    this.ctrl.time = (this.ctrl.time || 0) + 1;
    $('#clock').textContent = fmtTime(this.ctrl.time);
    if (this.ctrl.time % 5 === 0) this.ctrl.save();
  },

  enter(ctrl) {
    $('#log').innerHTML = '';
    this.ctrl = ctrl; this.held = null; this.active = true;
    $$('.screen').forEach(e => e.hidden = true); $('#play').hidden = false;
    this.layout(); ctrl.render();
  },
  leave() { if (this.ctrl) this.ctrl.save(); this.active = false; this.ctrl = null; this.held = null; $('#play').hidden = true; $('#modal').hidden = true; $('#dlg').hidden = true; },

  // ---------- 道具欄 ----------
  renderSlots(list, sel, opt = {}) {
    let h = '';
    const n = Math.max(list.length, opt.min || 8);
    for (let i = 0; i < n; i++) {
      const it = list[i];
      if (!it) { h += '<div class="slot empty"></div>'; continue; }
      h += `<button class="slot${it.id === sel ? ' sel' : ''}${it.isNew ? ' new' : ''}" data-slot="${esc(it.id)}" aria-label="${esc(it.n)}"><svg viewBox="0 0 100 100">${it.ic}</svg><span class="nm">${esc(it.n)}</span></button>`;
    }
    $('#slots').innerHTML = h;
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
};

// ---------- 房間控制 ----------
function RoomCtrl(room, resume) {
  const R = room, C = this;
  C.kind = 'room'; C.room = R;
  if (resume) { Object.assign(C, clone(resume)); }
  else { C.s = R.init(); C.inv = []; C.view = R.walls[0]; C.time = 0; C.hl = {}; C.hc = 0; C.newI = {}; }
  C.newI = C.newI || {};

  C.save = () => {
    Store.data.cur = { kind: 'room', id: R.id, s: C.s, inv: C.inv, view: C.view, time: C.time, hl: C.hl, hc: C.hc, newI: C.newI };
    Store.save();
  };
  C.has = id => C.inv.includes(id);
  C.give = (id, quiet) => {
    if (!C.has(id)) C.inv.push(id);
    C.newI[id] = 1;
    if (!quiet) { Snd.play('pick'); G.toast(`得到了「<b>${ITEMS[id].n}</b>」`); }
  };
  C.take = id => { C.inv = C.inv.filter(x => x !== id); if (G.held === id) G.held = null; };
  C.go = v => { C.view = v; Snd.play(R.views[v].back ? 'step' : 'turn'); C.render(); };

  C.render = () => {
    const v = R.views[C.view];
    G.paint(v.draw(C.s, C), v.hot(C.s, C));
    $('#rNo').textContent = `第 ${R.no} 章 · ${R.en}`;
    $('#rName').textContent = R.name + (v.title ? '　' + v.title : '');
    $('#clock').textContent = fmtTime(C.time);
    $('#hintN').textContent = C.hc;
    $('#hearts').hidden = true; $('#bMemo').hidden = false; $('#bHint').hidden = false;
    const isWall = R.walls.includes(C.view);
    $('#nL').hidden = $('#nR').hidden = !isWall || !!v.noNav;
    $('#nB').hidden = isWall;
    $('#compass').innerHTML = isWall ? R.walls.map(w => `<i class="${w === C.view ? 'on' : ''}"></i>`).join('') : '';
    $('#invTitle').textContent = '道具';
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
    if (it) {
      if (h.use && h.use[it]) { G.held = null; h.use[it](C, it); }
      else if (h.use && h.use['*']) { G.held = null; h.use['*'](C, it); }
      else if (h.go) { C.go(h.go); return; }
      else { G.held = null; Snd.play('wrong'); G.toast(`「${ITEMS[it].n}」在這裡好像派不上用場。`); }
    } else if (h.go) { C.go(h.go); return; }
    else if (h.on) h.on(C);
    else if (h.t) { Snd.play('tap'); G.toast(h.t); }
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
    const k = C.stepIdx(), st = R.steps[k];
    if (!st) { G.modal('<h3>提示</h3><p class="paper">這一章的謎題都解開了！</p>'); return; }
    const lv = C.hl[k] || 0;
    const draw = () => {
      const L = C.hl[k] || 0;
      let h = `<h3>X 的提示紙條</h3><p class="sub">第 ${k + 1} / ${R.steps.length} 步：${st.goal}</p>`;
      for (let i = 0; i < L; i++) h += `<div class="hintBox${i === 2 ? ' ans' : ''}"><b>${i === 2 ? '答案' : '提示 ' + (i + 1)}</b>${st.h[i]}</div>`;
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
    Store.data.cur = null; Store.save();
    Snd.play('fanfare');
    G.dlg(R.outro || [], () => Main.showClear({ kind: 'room', def: R, stars, time: C.time, hints: C.hc, first }));
  };
  C.win = () => { setTimeout(() => C.finish(), 500); };
}

// 按鈕事件
function bindEngine() {
  $('#hs').addEventListener('click', e => {
    const el = e.target.closest('[data-i]'); if (!el || !G.ctrl) return;
    Snd.init();
    const h = G.hots[+el.dataset.i]; if (!h) return;
    el.classList.remove('flash'); void el.getBBox; el.classList.add('flash');
    G.ctrl.hit(h);
  });
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
