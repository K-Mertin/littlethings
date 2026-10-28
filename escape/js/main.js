'use strict';
// 主流程：標題、章節選擇、收藏與成就、過關畫面、遊戲選單
const Main = {
  init() {
    Store.load();
    $('#defs').innerHTML = A.defs();
    bindEngine();
    Snd.applyMute(); G.applyFx();
    const ta = () => {
      const w = innerWidth / innerHeight >= 1.25; if (this._taw !== w) { this._taw = w; $('#titleArt').innerHTML = this.titleArt(w ? 690 : 500); $('#titleFx').innerHTML = this._tfx; A.enrich($('#titleArt'), 'R'); }
      const sc = Math.max(innerWidth / 1000, innerHeight / 625), tf = $('#titleFx').style; // 跟著 slice 的縮放對齊
      tf.width = 1000 * sc + 'px'; tf.height = 625 * sc + 'px'; tf.left = (innerWidth - 1000 * sc) / 2 + 'px'; tf.top = (innerHeight - 625 * sc) / 2 + 'px';
    };
    ta(); addEventListener('resize', ta);
    $('#bStart').onclick = () => { Snd.init(); this.quickStart(); };
    $('#bChapters').onclick = () => { Snd.init(); this.showChapters('rooms'); };
    $('#bCases').onclick = () => { Snd.init(); this.showChapters('cases'); };
    $('#bAlbum').onclick = () => { Snd.init(); this.showAlbum(); };
    $('#bDaily').onclick = () => { Snd.init(); const p = Daily.pick(); if (p) this.startRoom(p.room.id, true, false, p.day); };
    // 小祕密：連點標題畫面上的鐘樓五下
    $('#titleArt').addEventListener('click', e => {
      const r = $('#titleArt').getBoundingClientRect(), sc = Math.max(r.width / 1000, r.height / 625), x = (e.clientX - r.left - (r.width - 1000 * sc) / 2) / sc, y = (e.clientY - r.top - (r.height - 625 * sc) / 2) / sc, hx = this._taw ? 690 : 500;
      if (Math.abs(x - (hx + 115)) > 60 || y < 60 || y > 340) { this._bell = 0; return; }
      Snd.init(); this._bell = (this._bell || 0) + 1; Snd.bell(NOTE([72, 76, 79, 84, 88][(this._bell - 1) % 5]), 0, 0.12, 1);
      if (this._bell >= 5) { this._bell = 0; [0, 1, 2, 3, 4, 5, 6].forEach((k, i) => setTimeout(() => Snd.bell(NOTE([79, 76, 76, 77, 74, 74, 72][k]), 0, 0.12, 1.2), 200 + i * 260)); if (!Store.data.ach.secret) setTimeout(() => G.ach('secret'), 2100); }
    });
    $('#bChapBack').onclick = () => this.showTitle();
    $('#bAlbBack').onclick = () => this.showTitle();
    $$('#chapTabs button').forEach(b => b.onclick = () => this.showChapters(b.dataset.tab));
    $('#bMenu').onclick = () => this.gameMenu();
    $('#bToChap').onclick = () => this.showChapters(this.lastKind === 'case' ? 'cases' : this.lastKind === 'ladder' ? 'ladder' : 'rooms');
    document.addEventListener('pointerdown', () => Snd.init(), { once: true });
    G.checkMeta();
    this.showTitle();
  },
  unlocked(kind, i) {
    if (i === 0) return true;
    const L = kind === 'rooms' ? ROOMS : CASES, P = kind === 'rooms' ? Store.data.prog : Store.data.cases;
    return !!(P[L[i - 1].id] && P[L[i - 1].id].done);
  },
  screen(id) { G.leave(); $$('.screen').forEach(e => e.hidden = true); $(id).hidden = false; Music.set('title'); },
  showTitle() {
    this.screen('#title'); Amb.set(G.ambRate()); G.fpsWatch();
    const tot = ROOMS.reduce((a, r) => a + ((Store.data.prog[r.id] || {}).stars || 0), 0) + CASES.reduce((a, c) => a + ((Store.data.cases[c.id] || {}).stars || 0), 0);
    const cur = Store.data.cur;
    $('#bStart').textContent = cur ? '繼續解謎' : (Store.data.prog.r1 ? '繼續冒險' : '開始解謎');
    const nn = Object.keys(Store.data.notes).length, na = Object.keys(Store.data.ach).length;
    const dp = Daily.pick(), dh = dp && Daily.rec().hist[dp.day];
    $('#bDaily').hidden = !dp;
    if (dp) $('#bDaily').innerHTML = `${ICO('cal', 'in')} 今日謎題${dh && dh.done ? ` <small>${ICO('medal', 'in', dh.medal)}${fmtTime(dh.time)}</small>` : `<small>${esc(dp.room.name)}</small>`}`;
    $('#tStars').innerHTML = tot ? `★ ${tot} / ${(ROOMS.length + CASES.length) * 3}　♪ ${nn} / ${ROOMS.length}　${ICO('medal', 'in', 3)} ${na} / ${ACH.length}` : '一棟會唱歌的房子、一趟火車旅行、十四個房間、七件小鎮怪事。';
  },
  quickStart() {
    const cur = Store.data.cur;
    if (cur) { if (cur.kind === 'room') this.startRoom(cur.id); else this.startCase(cur.id); return; }
    let i = ROOMS.findIndex(r => !(Store.data.prog[r.id] || {}).done);
    if (i < 0) { this.showChapters('rooms'); return; }
    this.startRoom(ROOMS[i].id);
  },
  thumb(r, tab) {
    let t = '';
    try { if (tab === 'rooms') { const st = r.init(), vw = r.thumb || r.walls[0]; A.setKey(r, vw); t = r.views[vw].draw(st, { s: st }); if (r.deco) t = t.replace('<!--DECO-->', r.deco(vw, st) || ''); } else t = r.thumb(); t += A.still(); } catch (e) { A.flush(); t = ''; }
    return t;
  },
  showChapters(tab) {
    this.screen('#chap');
    $$('#chapTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    if (tab === 'ladder') { this.showLadder(); return; }
    const L = tab === 'rooms' ? ROOMS : CASES, P = tab === 'rooms' ? Store.data.prog : Store.data.cases, cur = Store.data.cur;
    let html = '';
    L.forEach((r, i) => {
      if (tab === 'rooms' && i === 0) html += '<div class="chSec">本篇　八音盒之家</div>';
      if (tab === 'rooms' && r.bonus && !L[i - 1].bonus) html += '<div class="chSec">番外篇　地底下的祕密</div>';
      if (tab === 'rooms' && r.arc && !L[i - 1].arc) html += '<div class="chSec">第二部　海港鐘塔之旅</div>';
      const p = P[r.id] || {}, un = this.unlocked(tab, i), res = cur && cur.id === r.id;
      const ch = Store.data.chal[r.id];
      const meta = tab === 'rooms' && un ? `<div class="meta"><span class="${Store.data.notes[r.id] ? 'on' : ''}">♪ ${Store.data.notes[r.id] ? '已找到' : '隱藏音符'}</span>${ch ? `<span class="on">${ICO('medal', 'in', ch.medal)} 挑戰 ${fmtTime(ch.best)}</span>` : ''}</div>` : '';
      const acts = tab === 'rooms' && p.done ? `<div class="acts"><span data-a="play">重玩（新謎題）</span><span class="chalB" data-a="chal">${ICO('watch', 'in')} 挑戰</span></div>` : '';
      html += `<button class="ch${un ? '' : ' lock'}" data-id="${r.id}"><svg viewBox="0 0 1000 625">${un ? this.thumb(r, tab) : this.thumb(r, tab)}</svg><span class="cnum">${r.bonus ? '番' : r.arc ? r.ch : r.no}</span>${res ? '<span class="resume">進行中</span>' : ''}
        <div class="cb"><div class="cn">${tab === 'rooms' ? (r.bonus ? 'EXTRA ' + r.no : r.arc ? 'PART II · CHAPTER ' + r.ch : 'CHAPTER ' + r.no) : 'CASE ' + r.no}</div><h4>${un ? r.name : '？？？'}</h4>
        <div class="cs"><span class="stars">${p.done ? starStr(p.stars) : '<i>★★★</i>'}</span><span>${p.done ? '最佳 ' + fmtTime(p.time) + ' · 提示 ' + p.hints : (un ? '尚未破關' : '')}</span></div>${meta}${acts}</div>
        ${un ? '' : `<div class="lk">${r.bonus && i > 0 && !L[i - 1].bonus ? '破完本篇八章才能進來' : r.arc && !L[i - 1].arc ? '破完番外篇才能出發' : `破了前一${tab === 'rooms' ? '章' : '件'}才能進來`}</div>`}</button>`;
    });
    $('#chapList').innerHTML = html;
    $$('#chapList .ch').forEach(b => b.onclick = e => {
      Snd.init();
      const a = e.target.closest('[data-a]');
      if (tab === 'rooms') this.startRoom(b.dataset.id, !!a, a && a.dataset.a === 'chal');
      else this.startCase(b.dataset.id);
    });
  },
  showAlbum() {
    this.screen('#album');
    const N = Store.data.notes, AC = Store.data.ach, st = Store.data.stat;
    let h = `<h3 class="albH">隱藏音符　${Object.keys(N).length} / ${ROOMS.length}</h3><p class="sub" style="color:#c9b29a;margin:0 4px 8px;font-size:13px">每個房間都藏著一個小小的金色音符，仔細看看角落吧！</p><div class="notesRow">`;
    ROOMS.forEach(r => h += `<div class="noteC${N[r.id] ? ' on' : ''}"><b>${N[r.id] ? '♪' : '？'}</b>${this.unlocked('rooms', ROOMS.indexOf(r)) ? esc(r.name) : '？？？'}</div>`);
    h += `</div><h3 class="albH">成就　${Object.keys(AC).length} / ${ACH.length}</h3><div class="achGrid">`;
    ACH.forEach(a => { const hid = a.hide && !AC[a.id]; h += `<div class="achC${AC[a.id] ? ' on' : ''}"><i>${ICO(hid ? 'lock' : a.ic, '', a.ia)}</i><div><b>${hid ? '？？？' : esc(a.n)}</b><small>${hid ? '隱藏成就：好像跟標題畫面有關……' : esc(a.d)}</small></div></div>`; });
    const chal = Object.entries(Store.data.chal);
    h += `</div><h3 class="albH">挑戰紀錄</h3><div class="statRow">${chal.length ? chal.map(([id, c]) => { const r = ROOMS.find(x => x.id === id); return r ? `<span>${ICO('medal', 'in', c.medal)} ${esc(r.name)}　${fmtTime(c.best)}</span>` : ''; }).join('') : '<span>破關後，可以在章節選擇按「挑戰」：不能看提示、謎題答案隨機。</span>'}</div>`;
    const DR = Daily.rec(), dd = Object.values(DR.hist).filter(x => x.done);
    h += `<h3 class="albH">今日謎題</h3><div class="statRow">${dd.length ? `<span>${ICO('flame', 'in')} 連續 ${DR.last === Daily.today() || DR.last === Daily.shift(Daily.today(), -1) ? DR.streak : 0} 天</span><span>最長連續 ${DR.best || 0} 天</span><span>一共完成 ${dd.length} 天</span><span>${ICO('medal', 'in', 3)} 金牌 ${dd.filter(x => x.medal === 3).length} 次</span>` : '<span>破完第一章以後，標題畫面會出現「今日謎題」：每天換一間房間和一組答案，不能看提示。</span>'}</div>`;
    h += `<h3 class="albH">小統計</h3><div class="statRow"><span>摸了麻糬 ${st.cat || 0} 次</span><span>破關章節 ${ROOMS.filter(r => (Store.data.prog[r.id] || {}).done).length} / ${ROOMS.length}</span><span>破案 ${CASES.filter(c => (Store.data.cases[c.id] || {}).done).length} / ${CASES.length}</span></div>`;
    $('#albBody').innerHTML = h;
  },
  // ---------- 計時連關：隨機挑幾間破過的房間，一間接一間解，時間累計 ----------
  LADDER: [3, 5],
  ladderPool() { return ROOMS.filter(r => r.vary && (Store.data.prog[r.id] || {}).done); },
  ladderPar(ids) { return ids.reduce((a, id) => a + ROOMS.find(r => r.id === id).par, 0); },
  showLadder() {
    const pool = this.ladderPool(), rec = Store.data.ladder || {};
    let h = `<div class="ldW"><div class="ldIntro"><i>${ICO('flag')}</i><div><h4>計時連關</h4><p>從你破過的房間裡隨機挑幾間，一間接一間解，<b>時間一直累計</b>。不能看提示、謎題答案每次都不一樣。總時間越短，獎牌越好！</p></div></div>`;
    if (pool.length < 3) h += `<p class="ldLock">${ICO('lock')} 再破 ${3 - pool.length} 個房間就能挑戰（目前 ${pool.length} / 3）。</p>`;
    else h += `<div class="ldBtns">${this.LADDER.filter(n => n <= pool.length).map(n => { const r = rec[n]; return `<button class="ldB" data-n="${n}"><b>${n} 關連續</b><small>${r ? `${ICO('medal', 'in', r.medal)} 最佳 ${fmtTime(r.best)}` : '還沒有紀錄'}</small><small>每一關挑戰金牌時間加起來以內＝金牌</small></button>`; }).join('')}</div>`;
    const hist = (rec.hist || []).slice(-5).reverse();
    if (hist.length) h += `<h3 class="albH">最近的紀錄</h3><div class="statRow">${hist.map(x => `<span>${ICO('medal', 'in', x.medal)} ${x.n} 關　${fmtTime(x.total)}　${x.ids.map(id => (ROOMS.find(r => r.id === id) || {}).name).join('→')}</span>`).join('')}</div>`;
    $('#chapList').innerHTML = h + '</div>';
    $$('#chapList .ldB').forEach(b => b.onclick = () => { Snd.init(); this.ladderStart(+b.dataset.n); });
  },
  ladderStart(n) {
    const ids = shuffle(this.ladderPool().map(r => r.id)).slice(0, n);
    Store.data.cur = null;
    this.startRoom(ids[0], true, true, null, { ids, i: 0, total: 0, times: [] });
  },
  ladderNext(L) {
    if (L.i < L.ids.length) {
      const R = ROOMS.find(r => r.id === L.ids[L.i]);
      G.overlay(`<div class="tcard"><small>${ICO('flag')} 第 ${L.i} / ${L.ids.length} 關完成</small><h2>累計 ${fmtTime(L.total)}</h2><p>下一關：${esc(R.name)}</p></div>`, 1700, () => this.startRoom(R.id, true, true, null, L), 'tc');
      return;
    }
    const par = this.ladderPar(L.ids), medal = L.total <= par * 0.6 ? 3 : L.total <= par ? 2 : 1, n = L.ids.length;
    const rec = Store.data.ladder || (Store.data.ladder = {}), r = rec[n] || {};
    const best = !r.best || L.total < r.best;
    rec[n] = { best: r.best ? Math.min(r.best, L.total) : L.total, medal: Math.max(r.medal || 0, medal) };
    (rec.hist = rec.hist || []).push({ n, total: L.total, medal, ids: L.ids }); while (rec.hist.length > 20) rec.hist.shift();
    Store.save(); G.ach('ladder'); if (medal === 3) G.ach('ladderGold');
    this.showClear({ kind: 'room', def: ROOMS.find(x => x.id === L.ids[n - 1]), stars: medal, time: L.total, hints: 0, ladder: L, medal, best, par });
  },
  startRoom(id, fresh, chal, daily, ladder) {
    const R = ROOMS.find(r => r.id === id); const cur = Store.data.cur;
    const resume = !fresh && cur && cur.kind === 'room' && cur.id === id ? cur : null;
    if (!resume && cur && (cur.id !== id || fresh)) Store.data.cur = null;
    const C = new RoomCtrl(R, resume, { chal, daily, ladder });
    this.lastKind = ladder || (resume && resume.ladder) ? 'ladder' : 'room';
    if (R.prep) R.prep(C);
    G.enter(C); Music.set(R.mood || 'warm');
    if (!resume) {
      C.save();
      G.active = false;
      G.titleCard(R, () => { G.active = true; G.dlg(C.ladder ? [] : C.replay ? (R.intro || []).filter(l => typeof l === 'string' || !l.l).slice(0, 2) : (R.intro || []), () => { }); });
    }
  },
  startCase(id, fresh) {
    const D = CASES.find(c => c.id === id); const cur = Store.data.cur;
    const resume = !fresh && cur && cur.kind === 'case' && cur.id === id ? cur : null;
    if (!resume && cur && cur.id !== id) Store.data.cur = null;
    const C = new CaseCtrl(D, resume);
    this.lastKind = 'case';
    G.enter(C); Music.set('case');
    if (!resume) { C.save(); G.active = false; G.titleCard(D, () => { G.active = true; C.begin(); }); }
  },
  showClear(r) {
    this.screen('#clear');
    if (r.ladder) return this.showLadderClear(r);
    const isRoom = r.kind === 'room', L = isRoom ? ROOMS : CASES, i = L.indexOf(r.def);
    $('#cLbl').textContent = isRoom ? (r.daily ? 'DAILY PUZZLE CLEAR' : r.chal ? 'CHALLENGE CLEAR' : 'CHAPTER CLEAR') : 'CASE CLOSED';
    $('#cName').textContent = r.def.name;
    $('#clearArt').innerHTML = this.thumb(r.def, isRoom ? 'rooms' : 'cases'); A.enrich($('#clearArt'));
    $('#cStars').innerHTML = [0, 1, 2].map(k => k < r.stars ? '<b>★</b>' : '<i>★</i>').join('');
    $('#cStats').innerHTML = `<span><b>${fmtTime(r.time)}</b>用時</span><span><b>${r.chal ? '—' : r.hints}</b>看過的提示</span>${isRoom ? '' : `<span><b>${r.miss}</b>出示錯誤</span>`}`;
    $('#cExtra').innerHTML = isRoom ? `<span class="${Store.data.notes[r.def.id] ? 'on' : ''}">♪ 隱藏音符${Store.data.notes[r.def.id] ? '找到了！' : '還沒找到'}</span>${r.chal ? `<span class="on"><i class="medal">${ICO('medal', '', r.medal)}</i> ${ICO.medalName[r.medal]}</span>` : ''}` : '';
    const next = L[i + 1];
    let note = `三顆星：提示看 1 則以內、${Math.round(r.def.par / 60)} 分鐘內${isRoom ? '' : '、出示錯誤少於 3 次'}。`;
    if (r.chal) note = `挑戰模式：${fmtTime(Math.round(r.def.par * 0.6))} 內金牌、${fmtTime(r.def.par)} 內銀牌。`;
    if (isRoom && r.def.id === 'r8') note = '你解開了八音盒之家所有的謎題！番外篇「地底下的祕密」解鎖了，「小鎮推理事件簿」也還有怪事在等你。';
    if (isRoom && r.def.id === 'r10') note = '番外篇也全部破解！第二部「海港鐘塔之旅」解鎖了──帶著那張 10:45 的車票出發吧。';
    if (isRoom && !next) note = '第二部也全部破解！重玩任何一章，謎題的答案都會變得不一樣；也可以試試章節選擇裡的「計時連關」。';
    if (!isRoom && !next) note = '全部事件都破案了！小鎮又恢復了平靜。';
    if (r.daily) note = `今日謎題完成！已經連續 ${r.daily.streak} 天。明天會換一間房間、一組新的答案喔。`;
    $('#cNote').textContent = note;
    const b = $('#bNextCh');
    if (next) { b.textContent = isRoom ? (next.bonus && !r.def.bonus ? '番外篇' : next.arc && !r.def.arc ? '第二部' : '下一章') : '下一件事件'; b.onclick = () => isRoom ? this.startRoom(next.id) : this.startCase(next.id); }
    else if (isRoom) { b.textContent = '推理事件簿'; b.onclick = () => this.showChapters('cases'); }
    else { b.textContent = '回標題'; b.onclick = () => this.showTitle(); }
  },
  showLadderClear(r) {
    const L = r.ladder;
    $('#cLbl').textContent = 'TIME ATTACK CLEAR';
    $('#cName').textContent = `計時連關 ${L.ids.length} 關`;
    $('#clearArt').innerHTML = this.thumb(r.def, 'rooms'); A.enrich($('#clearArt'));
    $('#cStars').innerHTML = `<i class="medal big">${ICO('medal', '', r.medal)}</i>`;
    $('#cStats').innerHTML = `<span><b>${fmtTime(L.total)}</b>總時間</span>` + L.ids.map((id, i) => `<span><b>${fmtTime(L.times[i])}</b>${esc(ROOMS.find(x => x.id === id).name)}</span>`).join('');
    $('#cExtra').innerHTML = `<span class="on"><i class="medal">${ICO('medal', '', r.medal)}</i> ${ICO.medalName[r.medal]}</span>${r.best ? '<span class="on">新紀錄！</span>' : ''}`;
    $('#cNote').textContent = `金牌：${fmtTime(Math.round(r.par * 0.6))} 內；銀牌：${fmtTime(r.par)} 內。每次挑到的房間和答案都不一樣喔。`;
    const b = $('#bNextCh'); b.textContent = '再挑戰一次'; b.onclick = () => this.ladderStart(L.ids.length);
    this.lastKind = 'ladder';
  },
  gameMenu() {
    const C = G.ctrl; if (!C) return;
    const body = G.modal(`<h3>暫停</h3><p class="sub">${C.kind === 'room' ? G.rLabel(C.room) + ' · ' + C.room.name : '事件 ' + C.def.no + ' · ' + C.def.name}　用時 ${fmtTime(C.time)}</p>
      <div class="col"><button class="ok" data-m="go">繼續</button><button class="sec" data-m="restart">重新開始這一${C.kind === 'room' ? '章' : '件'}</button><button class="sec" data-m="chap">章節選擇</button><button class="sec" data-m="title">回標題</button><button class="sec" data-m="fx">環境動畫：${this.fxLabel()}</button><a class="sec" style="text-align:center;text-decoration:none" href="../index.html">← 回遊戲大廳</a></div>
      <p class="sub" style="margin-top:10px">進度會自動存檔，下次可以從這裡繼續。</p>`, { w: 380 });
    body.onclick = e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const m = b.dataset.m;
      if (m === 'go') G.closeModal();
      if (m === 'restart') { $('#modal').hidden = true; Store.data.cur = null; Store.save(); const id = C.kind === 'room' ? C.room.id : C.def.id, ch = C.chal && !C.daily, dl = C.daily; G.active = false; G.ctrl = null; C.kind === 'room' ? this.startRoom(id, true, ch, dl, C.ladder) : this.startCase(id, true); }
      if (m === 'chap') { $('#modal').hidden = true; this.showChapters(C.kind === 'room' ? 'rooms' : 'cases'); }
      if (m === 'title') { $('#modal').hidden = true; this.showTitle(); }
      if (m === 'fx') { Store.data.fx = document.body.classList.contains('lowfx') ? 'hi' : 'lo'; Store.save(); G.applyFx(); b.textContent = '環境動畫：' + this.fxLabel(); }
    };
  },
  fxLabel() { return document.body.classList.contains('lowfx') ? '關（省電）' : document.body.classList.contains('midfx') ? '精簡（自動省電）' : '開'; },
  titleArt(hx = 500) {
    let s = `<rect width="1000" height="625" fill="url(#skyEve)"/>`;
    for (let i = 0; i < 46; i++) { const x = (i * 137) % 1000, y = (i * 71) % 250; s += `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.7}" fill="#fff8d8" opacity="${0.35 + (i % 4) * 0.15}"/>`; if (i % 9 === 0) A.twinkle(x, y, 2.4); }
    const mx = hx === 500 ? 800 : 935, my = hx === 500 ? 120 : 210;
    s += `<circle cx="${mx}" cy="${my}" r="90" fill="#fff3c8" opacity=".15"/><circle cx="${mx}" cy="${my}" r="46" fill="#fff3c8"/><circle cx="${mx - 14}" cy="${my - 8}" r="8" fill="#f0dca0" opacity=".6"/><circle cx="${mx + 12}" cy="${my + 14}" r="6" fill="#f0dca0" opacity=".5"/>`;
    A.fx(`<g class="cloud" style="animation-duration:60s"><path d="M120 150h120a18 18 0 0 0-10-30a26 26 0 0 0-46-8a20 20 0 0 0-50 22z" fill="#fff" opacity=".35"/></g>`);
    s += `<path d="M0 450Q200 370 420 410T1000 380V625H0z" fill="#8a7ab8" opacity=".5"/><path d="M0 470Q250 390 500 430T1000 410V625H0z" fill="#7a8fc8" opacity=".55"/><path d="M0 520Q300 420 560 470T1000 450V625H0z" fill="#5f7a9a"/>`;
    for (let i = 0; i < 9; i++) { const tx = 40 + i * 118 + (i % 2) * 30, ty = 470 + (i % 3) * 14; if (Math.abs(tx - hx) < 230) continue; s += `<path d="M${tx} ${ty}l-26 50h52z" fill="#3f5a6a" opacity=".85"/><path d="M${tx} ${ty - 26}l-20 40h40z" fill="#4a6a74" opacity=".85"/>`; }
    // 房子
    const hy = 470;
    s += `<g filter="url(#ds)"><path d="M${hx - 190} ${hy}V${hy - 190}H${hx + 190}V${hy}z" fill="#f3d9b0" ${SW}/><path d="M${hx - 190} ${hy}V${hy - 190}H${hx + 190}V${hy}z" fill="url(#p-brick)" opacity=".5"/><path d="M${hx - 190} ${hy - 190}h380v30H${hx - 190}z" fill="#1e0d04" opacity=".15"/><path d="M${hx - 215} ${hy - 186}L${hx} ${hy - 300}L${hx + 215} ${hy - 186}z" fill="#c4683f" ${SW}/>`;
    for (let k = 0; k < 5; k++) s += `<path d="M${hx - 180 + k * 10} ${hy - 192 - k * 21}H${hx + 180 - k * 10}" stroke="#a8502a" stroke-width="3" opacity=".6"/>`;
    s += `<rect x="${hx + 70}" y="${hy - 330}" width="90" height="170" fill="#e8c890" ${SW}/><path d="M${hx + 58} ${hy - 330}L${hx + 115} ${hy - 400}L${hx + 172} ${hy - 330}z" fill="#3f6f8f" ${SW}/><circle cx="${hx + 115}" cy="${hy - 290}" r="26" fill="#fffaf0" ${SW}/><path d="M${hx + 115} ${hy - 290}v-16" ${SW}/><path d="M${hx + 115} ${hy - 290}l11 6" ${SW}/>`;
    s += `<path d="M${hx - 140} ${hy - 330}v80h50v-56z" fill="#a8703f" ${SW}/><path d="M${hx - 26} ${hy - 330}q26-40 52 0z" fill="#3f6f8f" ${SW}/><rect x="${hx - 26}" y="${hy - 330}" width="52" height="60" fill="#e8c890" ${SW}/><path d="M${hx - 26} ${hy - 330}a26 26 0 0 1 52 0" fill="#ffe9a0" ${SW2}/>`;
    A.fx(`<g class="steam" style="animation-duration:4s"><circle cx="${hx - 115}" cy="${hy - 340}" r="12" fill="#fff" opacity=".5"/></g>`); A.fx(`<g class="steam" style="animation-duration:4s;animation-delay:-2s"><circle cx="${hx - 112}" cy="${hy - 345}" r="9" fill="#fff" opacity=".5"/></g>`);
    [[hx - 150, hy - 150], [hx - 70, hy - 150], [hx + 30, hy - 150], [hx + 110, hy - 150], [hx - 150, hy - 80], [hx + 110, hy - 80], [hx + 92, hy - 250]].forEach(([x, y], i) => { s += `<circle cx="${x + 20}" cy="${y + 25}" r="46" fill="url(#lampG)"/><rect x="${x}" y="${y}" width="40" height="50" rx="4" fill="#ffd77a" ${SW}/><rect x="${x}" y="${y}" width="40" height="50" rx="4" fill="url(#glass)"/><path d="M${x + 20} ${y}v50M${x} ${y + 25}h40" ${SW2}/>`; });
    // 屋瓦（魚鱗瓦）、屋簷線板、百葉窗、花台、門框、台階、牆角石、常春藤
    { let tl = ''; for (let k = 0; k < 5; k++) { const y = hy - 196 - k * 21, x0 = hx - 176 + k * 36, x1 = hx + 176 - k * 36; for (let x = x0; x < x1 - 4; x += 16) { if ((x > hx + 54 && x < hx + 162) || (y < hy - 246 && x > hx - 42 && x < hx + 28)) continue; tl += `M${x} ${y}q8 9 16 0`; } } s += `<path d="${tl}" stroke="#8a3a1a" stroke-width="1.1" fill="none" opacity=".75"/>`; }
    s += `<path d="M${hx - 196} ${hy - 188}H${hx + 70}M${hx + 160} ${hy - 188}H${hx + 196}" stroke="#fffaf0" stroke-width="5"/><path d="M${hx - 196} ${hy - 184}H${hx + 70}M${hx + 160} ${hy - 184}H${hx + 196}" stroke="#c9a87f" stroke-width="1.4"/>`;
    [[hx - 150, hy - 150], [hx - 70, hy - 150], [hx + 30, hy - 150], [hx + 110, hy - 150], [hx - 150, hy - 80], [hx + 110, hy - 80]].forEach(([x, y], i) => { s += `<rect x="${x - 13}" y="${y - 2}" width="11" height="54" rx="2" fill="#5f8a7a" ${SW2}/><rect x="${x + 42}" y="${y - 2}" width="11" height="54" rx="2" fill="#5f8a7a" ${SW2}/><path d="M${x - 11} ${y + 8}h7M${x - 11} ${y + 18}h7M${x - 11} ${y + 28}h7M${x - 11} ${y + 38}h7M${x + 44} ${y + 8}h7M${x + 44} ${y + 18}h7M${x + 44} ${y + 28}h7M${x + 44} ${y + 38}h7" stroke="#3f6a5a" stroke-width="1"/><rect x="${x - 4}" y="${y + 50}" width="48" height="9" rx="2" fill="#a8703f" ${SW2}/>${[0, 1, 2, 3].map(k => `<circle cx="${x + 3 + k * 11}" cy="${y + 49}" r="3.6" fill="${['#e57aa8', '#f2c232', '#e0504a', '#fffaf0'][(k + i) % 4]}" stroke="#4a3222" stroke-width=".6"/>`).join('')}`; });
    s += `<path d="M${hx - 44} ${hy}v-62q0-40 44-40t44 40v62" fill="#e8c890" ${SW}/><path d="M${hx - 36} ${hy}v-60q0-32 36-32t36 32v60" fill="none" stroke="#c9a87f" stroke-width="1.2"/><path d="M${hx - 60} ${hy}h120v8h-120zM${hx - 50} ${hy + 8}h100v8h-100z" fill="#d9c8a8" ${SW2}/>`;
    s += [[hx - 190, 1], [hx + 190, -1]].map(([x, d]) => [0, 1, 2, 3, 4, 5].map(k => `<rect x="${d > 0 ? x : x - 16}" y="${hy - 30 - k * 30}" width="${k % 2 ? 12 : 16}" height="28" fill="#e2c49a" stroke="#b8946a" stroke-width=".8"/>`).join('')).join('');
    { let iv = ''; for (let k = 0; k < 14; k++) { const x = hx - 186 + (k % 3) * 8 + Math.sin(k) * 6, y = hy - 10 - k * 9; iv += `<path d="M${x.toFixed(1)} ${y}q5-7 10-1q-4 6-10 1z" fill="${k % 2 ? '#4f8a4a' : '#5f9e5a'}" stroke="#2f5a2e" stroke-width=".6"/>`; } s += `<path d="M${hx - 184} ${hy}q10-60-2-130" stroke="#3f6a3a" stroke-width="1.6" fill="none"/>` + iv; }
    s += `<path d="M${hx + 115} ${hy - 400}v-14" stroke="#c9a14a" stroke-width="2.4"/><circle cx="${hx + 115}" cy="${hy - 416}" r="3.5" fill="url(#brass)"/>${[...Array(12)].map((_, k) => { const a = k * Math.PI / 6; return `<circle cx="${(hx + 115 + Math.sin(a) * 21).toFixed(1)}" cy="${(hy - 290 - Math.cos(a) * 21).toFixed(1)}" r="${k % 3 ? 0.9 : 1.6}" fill="#4a3222"/>`; }).join('')}<circle cx="${hx + 115}" cy="${hy - 290}" r="29" fill="none" stroke="url(#brass)" stroke-width="3"/>`;
    s += `<rect x="${hx - 30}" y="${hy - 90}" width="60" height="90" rx="28" fill="#7a4a2a" ${SW}/><rect x="${hx - 30}" y="${hy - 90}" width="60" height="90" rx="28" fill="url(#p-grainV)"/><path d="M${hx} ${hy - 88}v86" stroke="#4a2a1a" stroke-width="1.2"/><circle cx="${hx}" cy="${hy - 66}" r="8" fill="#ffe9a0" ${SW2}/><circle cx="${hx + 18}" cy="${hy - 44}" r="4" fill="url(#brass)"/></g>`;
    // 門邊的路燈
    s += `<path d="M${hx - 90} ${hy + 10}V${hy - 70}" stroke="#2a2a32" stroke-width="5"/><path d="M${hx - 100} ${hy - 70}h20l-4-20h-12z" fill="#ffe9a0" ${SW2}/><path d="M${hx - 102} ${hy - 90}h24l-12-8z" fill="#2a2a32"/><circle cx="${hx - 90}" cy="${hy - 80}" r="40" fill="url(#lampG)"/><rect x="${hx - 98}" y="${hy + 6}" width="16" height="6" rx="2" fill="#2a2a32"/>`;
    s += `<path d="M${hx - 40} ${hy}Q${hx - 80} 560 ${hx - 160} 625H${hx + 160}Q${hx + 80} 560 ${hx + 40} ${hy}z" fill="#e9c98f" opacity=".85"/>`;
    s += A.plant(hx - 250, 520, 1.3, '#d9774b', '#4f8a5a') + A.plant(hx + 260, 520, 1.1, '#4f9e9a', '#5f9e5a') + A.cat(hx + 70, 540, 0.7);
    for (let i = 0; i < 6; i += 2) A.fx(`<g class="bob" style="animation-delay:-${i * 0.5}s;opacity:.85">${A.txt(150 + i * 140, 300 - (i % 2) * 60, i % 2 ? '♪' : '♫', 34, '#fff3c8')}</g>`);
    for (let i = 0; i < 7; i += 2) A.fx(`<g class="fly" style="animation-delay:-${i}s;animation-duration:${6 + i % 3}s"><circle cx="${60 + i * 140}" cy="${520 + (i % 3) * 25}" r="9" fill="url(#lampG)"/><circle cx="${60 + i * 140}" cy="${520 + (i % 3) * 25}" r="3.5" fill="#fff6a0"/></g>`);
    A.fx(`<g class="spin" style="animation-duration:24s">${A.gear(110, 110, 44, 'url(#brass)', 12, 'opacity=".55"')}</g>`); A.fx(`<g class="spinr" style="animation-duration:15s">${A.gear(170, 160, 26, 'url(#brass)', 9, 'opacity=".55"')}</g>`);
    this._tfx = G.lift();
    return s + `<rect width="1000" height="625" fill="url(#vig)"/>`;
  },
};
addEventListener('load', () => Main.init());
