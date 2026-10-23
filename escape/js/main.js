'use strict';
// 主流程：標題、章節選擇、過關畫面、遊戲選單
const Main = {
  init() {
    Store.load();
    $('#defs').innerHTML = A.defs();
    bindEngine();
    Snd.applyMute();
    const ta = () => { const w = innerWidth / innerHeight >= 1.25; if (this._taw !== w) { this._taw = w; $('#titleArt').innerHTML = this.titleArt(w ? 690 : 500); } };
    ta(); addEventListener('resize', ta);
    $('#bStart').onclick = () => { Snd.init(); this.quickStart(); };
    $('#bChapters').onclick = () => { Snd.init(); this.showChapters('rooms'); };
    $('#bCases').onclick = () => { Snd.init(); this.showChapters('cases'); };
    $('#bChapBack').onclick = () => this.showTitle();
    $$('#chapTabs button').forEach(b => b.onclick = () => this.showChapters(b.dataset.tab));
    $('#bMenu').onclick = () => this.gameMenu();
    $('#bToChap').onclick = () => this.showChapters(this.lastKind === 'case' ? 'cases' : 'rooms');
    document.addEventListener('pointerdown', () => Snd.init(), { once: true });
    this.showTitle();
  },
  unlocked(kind, i) {
    if (i === 0) return true;
    const L = kind === 'rooms' ? ROOMS : CASES, P = kind === 'rooms' ? Store.data.prog : Store.data.cases;
    return !!(P[L[i - 1].id] && P[L[i - 1].id].done);
  },
  showTitle() {
    G.leave(); $$('.screen').forEach(e => e.hidden = true); $('#title').hidden = false; Music.set('title');
    const tot = ROOMS.reduce((a, r) => a + ((Store.data.prog[r.id] || {}).stars || 0), 0) + CASES.reduce((a, c) => a + ((Store.data.cases[c.id] || {}).stars || 0), 0);
    const cur = Store.data.cur;
    $('#bStart').textContent = cur ? '繼續解謎' : (Store.data.prog.r1 ? '繼續冒險' : '開始解謎');
    $('#tStars').innerHTML = tot ? `已收集 ★ ${tot} / ${(ROOMS.length + CASES.length) * 3}` : '一棟會唱歌的房子，八個房間，三件小鎮怪事。';
  },
  quickStart() {
    const cur = Store.data.cur;
    if (cur) { if (cur.kind === 'room') this.startRoom(cur.id); else this.startCase(cur.id); return; }
    let i = ROOMS.findIndex(r => !(Store.data.prog[r.id] || {}).done);
    if (i < 0) { this.showChapters('rooms'); return; }
    this.startRoom(ROOMS[i].id);
  },
  showChapters(tab) {
    G.leave(); $$('.screen').forEach(e => e.hidden = true); $('#chap').hidden = false; Music.set('title');
    $$('#chapTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const L = tab === 'rooms' ? ROOMS : CASES, P = tab === 'rooms' ? Store.data.prog : Store.data.cases, cur = Store.data.cur;
    $('#chapList').innerHTML = L.map((r, i) => {
      const p = P[r.id] || {}, un = this.unlocked(tab, i), res = cur && cur.id === r.id;
      let thumb = '';
      try { thumb = tab === 'rooms' ? r.views[r.thumb || r.walls[0]].draw(r.init(), {}) : r.thumb(); } catch (e) { thumb = ''; }
      return `<button class="ch${un ? '' : ' lock'}" data-id="${r.id}"><svg viewBox="0 0 1000 625">${thumb}</svg>${res ? '<span class="resume">進行中</span>' : ''}
        <div class="cb"><div class="cn">${tab === 'rooms' ? 'CHAPTER ' + r.no : 'CASE ' + r.no}</div><h4>${un ? r.name : '？？？'}</h4>
        <div class="cs"><span class="stars">${p.done ? starStr(p.stars) : '<i>★★★</i>'}</span><span>${p.done ? '最佳 ' + fmtTime(p.time) + ' · 提示 ' + p.hints : (un ? '尚未破關' : '')}</span></div></div>
        ${un ? '' : `<div class="lk">破了前一${tab === 'rooms' ? '章' : '件'}才能進來</div>`}</button>`;
    }).join('');
    $$('#chapList .ch').forEach(b => b.onclick = () => { Snd.init(); tab === 'rooms' ? this.startRoom(b.dataset.id) : this.startCase(b.dataset.id); });
  },
  startRoom(id, fresh) {
    const R = ROOMS.find(r => r.id === id); const cur = Store.data.cur;
    const resume = !fresh && cur && cur.kind === 'room' && cur.id === id ? cur : null;
    if (!resume && cur && cur.id !== id) Store.data.cur = null;
    const C = new RoomCtrl(R, resume);
    this.lastKind = 'room';
    if (R.prep) R.prep(C);
    G.enter(C); Music.set(R.mood || 'warm');
    if (!resume) { C.save(); G.dlg(R.intro || [], () => { }); }
  },
  startCase(id, fresh) {
    const D = CASES.find(c => c.id === id); const cur = Store.data.cur;
    const resume = !fresh && cur && cur.kind === 'case' && cur.id === id ? cur : null;
    if (!resume && cur && cur.id !== id) Store.data.cur = null;
    const C = new CaseCtrl(D, resume);
    this.lastKind = 'case';
    G.enter(C); Music.set('case');
    if (!resume) { C.save(); C.begin(); }
  },
  showClear(r) {
    G.leave(); $$('.screen').forEach(e => e.hidden = true); $('#clear').hidden = false; Music.set('title');
    const isRoom = r.kind === 'room', L = isRoom ? ROOMS : CASES, i = L.indexOf(r.def);
    $('#cLbl').textContent = isRoom ? 'CHAPTER CLEAR' : 'CASE CLOSED';
    $('#cName').textContent = r.def.name;
    $('#cStars').innerHTML = starStr(r.stars);
    $('#cStats').innerHTML = `<span><b>${fmtTime(r.time)}</b>用時</span><span><b>${r.hints}</b>看過的提示</span>${isRoom ? '' : `<span><b>${r.miss}</b>出示錯誤</span>`}`;
    const next = L[i + 1];
    let note = `三顆星：提示看 1 則以內、${Math.round(r.def.par / 60)} 分鐘內${isRoom ? '' : '、出示錯誤少於 3 次'}。`;
    if (isRoom && !next) note = '你解開了八音盒之家所有的謎題！要不要去「小鎮推理事件簿」再挑戰三件怪事？';
    if (!isRoom && !next) note = '三件事件全部破案！小鎮又恢復了平靜。';
    $('#cNote').textContent = note;
    const b = $('#bNextCh');
    if (next) { b.textContent = isRoom ? '下一章' : '下一件事件'; b.onclick = () => isRoom ? this.startRoom(next.id) : this.startCase(next.id); }
    else if (isRoom) { b.textContent = '推理事件簿'; b.onclick = () => this.showChapters('cases'); }
    else { b.textContent = '回標題'; b.onclick = () => this.showTitle(); }
  },
  gameMenu() {
    const C = G.ctrl; if (!C) return;
    const body = G.modal(`<h3>暫停</h3><p class="sub">${C.kind === 'room' ? '第 ' + C.room.no + ' 章 · ' + C.room.name : '事件 ' + C.def.no + ' · ' + C.def.name}　用時 ${fmtTime(C.time)}</p>
      <div class="col"><button class="ok" data-m="go">繼續</button><button class="sec" data-m="restart">重新開始這一${C.kind === 'room' ? '章' : '件'}</button><button class="sec" data-m="chap">章節選擇</button><button class="sec" data-m="title">回標題</button><a class="sec" style="text-align:center;text-decoration:none" href="../index.html">← 回遊戲大廳</a></div>
      <p class="sub" style="margin-top:10px">進度會自動存檔，下次可以從這裡繼續。</p>`, { w: 380 });
    body.onclick = e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const m = b.dataset.m;
      if (m === 'go') G.closeModal();
      if (m === 'restart') { $('#modal').hidden = true; Store.data.cur = null; Store.save(); const id = C.kind === 'room' ? C.room.id : C.def.id; G.active = false; G.ctrl = null; C.kind === 'room' ? this.startRoom(id, true) : this.startCase(id, true); }
      if (m === 'chap') { $('#modal').hidden = true; this.showChapters(C.kind === 'room' ? 'rooms' : 'cases'); }
      if (m === 'title') { $('#modal').hidden = true; this.showTitle(); }
    };
  },
  titleArt(hx = 500) {
    let s = `<rect width="1000" height="625" fill="url(#skyEve)"/>`;
    for (let i = 0; i < 40; i++) s += `<circle cx="${(i * 137) % 1000}" cy="${(i * 71) % 230}" r="${1 + (i % 3) * 0.8}" fill="#fff8d8" opacity="${0.4 + (i % 4) * 0.15}"/>`;
    s += `<circle cx="${hx === 500 ? 800 : 935}" cy="${hx === 500 ? 130 : 230}" r="46" fill="#fff3c8"/>`;
    s += `<path d="M0 470Q250 380 500 420T1000 400V625H0z" fill="#7a8fc8" opacity=".55"/><path d="M0 520Q300 420 560 470T1000 450V625H0z" fill="#5f7a9a"/>`;
    // 房子
    const hy = 470;
    s += `<g filter="url(#ds)"><path d="M${hx - 190} ${hy}V${hy - 190}H${hx + 190}V${hy}z" fill="#f3d9b0" ${SW}/><path d="M${hx - 215} ${hy - 186}L${hx} ${hy - 300}L${hx + 215} ${hy - 186}z" fill="#c4683f" ${SW}/>`;
    s += `<rect x="${hx + 70}" y="${hy - 330}" width="90" height="170" fill="#e8c890" ${SW}/><path d="M${hx + 58} ${hy - 330}L${hx + 115} ${hy - 400}L${hx + 172} ${hy - 330}z" fill="#3f6f8f" ${SW}/><circle cx="${hx + 115}" cy="${hy - 290}" r="26" fill="#fffaf0" ${SW}/><path d="M${hx + 115} ${hy - 290}v-16M${hx + 115} ${hy - 290}l11 6" ${SW}/>`;
    s += `<path d="M${hx - 140} ${hy - 330}v80h50v-56z" fill="#a8703f" ${SW}/><path d="M${hx - 26} ${hy - 330}q26-40 52 0z" fill="#3f6f8f" ${SW}/><rect x="${hx - 26}" y="${hy - 330}" width="52" height="60" fill="#e8c890" ${SW}/><path d="M${hx - 26} ${hy - 330}a26 26 0 0 1 52 0" fill="#ffe9a0" ${SW2}/>`;
    [[hx - 150, hy - 150], [hx - 70, hy - 150], [hx + 30, hy - 150], [hx + 110, hy - 150], [hx - 150, hy - 80], [hx + 110, hy - 80], [hx + 92, hy - 250]].forEach(([x, y]) => s += `<circle cx="${x + 20}" cy="${y + 25}" r="40" fill="url(#lampG)"/><rect x="${x}" y="${y}" width="40" height="50" rx="4" fill="#ffd77a" ${SW}/><path d="M${x + 20} ${y}v50M${x} ${y + 25}h40" ${SW2}/>`);
    s += `<rect x="${hx - 30}" y="${hy - 90}" width="60" height="90" rx="28" fill="#7a4a2a" ${SW}/><circle cx="${hx + 18}" cy="${hy - 44}" r="4" fill="url(#brass)"/></g>`;
    s += `<path d="M${hx - 40} ${hy}Q${hx - 80} 560 ${hx - 160} 625H${hx + 160}Q${hx + 80} 560 ${hx + 40} ${hy}z" fill="#e9c98f" opacity=".85"/>`;
    s += A.plant(hx - 250, 520, 1.3, '#d9774b', '#4f8a5a') + A.plant(hx + 260, 520, 1.1, '#4f9e9a', '#5f9e5a') + A.cat(hx + 70, 540, 0.7);
    for (let i = 0; i < 6; i++) s += `<g opacity=".85">${A.txt(150 + i * 140, 300 - (i % 2) * 60, i % 2 ? '♪' : '♫', 34, '#fff3c8')}</g>`;
    s += A.gear(110, 110, 44, 'url(#brass)', 12, 'opacity=".55"') + A.gear(170, 160, 26, 'url(#brass)', 9, 'opacity=".55"');
    return s + `<rect width="1000" height="625" fill="url(#vig)"/>`;
  },
};
addEventListener('load', () => Main.init());
