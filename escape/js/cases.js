'use strict';
// 推理事件簿：調查現場 → 證詞找矛盾 → 指認犯人
function wrapText(t, n) { const out = []; let cur = ''; for (const ch of t) { if (ch === '\n') { out.push(cur); cur = ''; continue; } cur += ch; if (cur.length >= n && !'，。！？、」）'.includes(ch)) { out.push(cur); cur = ''; } } if (cur) out.push(cur); return out; }
const heartSvg = on => `<svg viewBox="0 0 24 24"><path d="M12 21C3 14 2 9 4.5 6.2 6.8 3.6 10.4 4.4 12 7c1.6-2.6 5.2-3.4 7.5-.8C22 9 21 14 12 21z" fill="${on ? '#f06a5a' : 'rgba(255,240,215,.15)'}" stroke="#2a1c15" stroke-width="1.5"/></svg>`;

function CaseCtrl(def, resume) {
  const D = def, C = this;
  C.kind = 'case'; C.def = D;
  if (resume) Object.assign(C, clone(resume));
  else { C.st = 0; C.ev = []; C.line = 0; C.hearts = 5; C.time = 0; C.hl = {}; C.hc = 0; C.miss = 0; C.s = {}; C.newI = {}; }
  C.newI = C.newI || {};
  const stage = () => D.stages[C.st];

  C.save = () => { Store.data.cur = { kind: 'case', id: D.id, st: C.st, ev: C.ev, line: C.line, hearts: C.hearts, time: C.time, hl: C.hl, hc: C.hc, miss: C.miss, s: C.s, newI: C.newI }; Store.save(); };
  C.has = id => C.ev.includes(id);
  C.addEv = (id, quiet) => { if (C.has(id)) return; C.ev.push(id); C.newI[id] = 1; if (!quiet) { Snd.play('pick'); G.toast(`證物「<b>${D.ev[id].n}</b>」記進了證物簿。`); } };
  C.begin = () => G.dlg(D.intro, () => { C.enterStage(); });
  C.enterStage = () => {
    const S = stage(); C.line = 0; G.held = null; C.save(); C.render();
    if (!S) return;
    if (S.type === 'test') { Music.set('tense'); G.dlg([{ big: 1, t: '〜 證詞 〜' }, { t: `<b>${S.title}</b>\n找出證詞和證物互相矛盾的地方，選好證物後按「出示證物」。\n不確定的時候，可以按「追問」多問一點。` }], () => C.render()); }
    else Music.set('case');
    if (S.type === 'grid') setTimeout(() => C.openGrid(), 300);
    if (S.type === 'accuse') setTimeout(() => C.openAccuse(), 300);
  };
  C.next = () => { C.st++; if (C.st >= D.stages.length) { C.finish(); return; } C.enterStage(); };

  C.render = () => {
    const S = stage() || D.stages[D.stages.length - 1];
    $('#rNo').textContent = `事件 ${D.no} · ${S.goal ? S.goal : ''}`;
    $('#rName').textContent = D.name;
    $('#clock').textContent = fmtTime(C.time);
    $('#hintN').textContent = C.hc;
    $('#bMemo').hidden = true; $('#bHint').hidden = false;
    $('#hearts').hidden = S.type !== 'test';
    $('#hearts').innerHTML = [0, 1, 2, 3, 4].map(i => heartSvg(i < C.hearts)).join('');
    $('#nL').hidden = $('#nR').hidden = $('#nB').hidden = true; $('#compass').innerHTML = '';
    $('#invTitle').textContent = '證物簿';
    const it = G.held && D.ev[G.held];
    if (S.type === 'inv') {
      const got = S.need.filter(C.has).length;
      $('#invTip').textContent = `已找到 ${got} / ${S.need.length}`;
      G.paint(D.scene.draw(C.s, C), D.scene.hot.map(h => Object.assign({}, h)));
      $('#tActs').hidden = true; $('#invInfo').hidden = false;
      $('#heldName').innerHTML = it ? `「<b>${esc(it.n)}</b>」：${it.d}` : '點現場的東西和人調查。找到的證物會記在這裡。';
      $('#bInspect').hidden = true;
    } else {
      $('#invTip').textContent = '';
      if (S.type === 'test') {
        const L = S.lines[C.line];
        let svg = D.scene.draw(C.s, C) + `<rect width="1000" height="625" fill="#1a1020" opacity=".62"/>` + `<svg x="330" y="50" width="340" height="408" viewBox="0 0 200 240">${Face.body(PEOPLE[S.who], C.s.face || 'n')}</svg>`;
        svg += `<rect x="40" y="30" width="250" height="44" rx="22" fill="#c4502c" ${SW}/>` + A.txt(165, 60, '證詞 ' + (C.line + 1) + ' / ' + S.lines.length, 20, '#fff3dc', 'middle', 900);
        svg += `<rect x="40" y="452" width="920" height="150" rx="18" fill="#fffaf0" stroke="#7a5638" stroke-width="5"/><rect x="60" y="432" width="${PEOPLE[S.who].n.length * 26 + 40}" height="40" rx="20" fill="#7a5638"/>` + A.txt(80, 460, PEOPLE[S.who].n, 22, '#fff3dc', 'start', 900);
        wrapText('「' + L.t + '」', 30).forEach((ln, i) => svg += A.txt(80, 512 + i * 40, esc(ln), 28, '#2f7d4f', 'start', 700));
        G.paint(svg, [{ id: 'stmt', r: [40, 452, 920, 150], on: () => C.press() }]);
        $('#tActs').hidden = false;
        $('#bPrev').disabled = C.line === 0; $('#bNext').textContent = C.line === S.lines.length - 1 ? '從頭 ↺' : '下一句 ›';
      } else {
        G.paint(D.scene.draw(C.s, C) + `<rect width="1000" height="625" fill="#1a1020" opacity=".45"/>` + A.txt(500, 300, S.type === 'grid' ? '整理大家的行蹤……' : '真相只有一個……', 40, '#fff3dc', 'middle', 900) , [{ id: 'reopen', r: [0, 0, 1000, 625], on: () => S.type === 'grid' ? C.openGrid() : C.openAccuse() }]);
        $('#tActs').hidden = true;
      }
      $('#invInfo').hidden = false;
      $('#heldName').innerHTML = it ? `已選擇「<b>${esc(it.n)}</b>」${S.type === 'test' ? '──按「出示證物」' : ''}` : (S.type === 'test' ? '先點一個證物選起來，再按「出示證物」。' : '點畫面繼續。');
      $('#bInspect').hidden = !it;
    }
    G.renderSlots(C.ev.map(id => ({ id, n: D.ev[id].n, ic: D.ev[id].ic(), isNew: C.newI[id] })), G.held, { min: 6 });
    document.body.classList.remove('held');
  };
  C.nav = () => { };
  C.hit = h => {
    if (h.ev) {
      if (!C.has(h.ev)) { C.addEv(h.ev, true); Snd.play('pick'); G.dlg([{ t: h.t + `\n<span class="g">▶ 證物「${D.ev[h.ev].n}」記進了證物簿。</span>` }], () => C.checkInv()); }
      else G.toast(h.t);
    } else if (h.talk) { G.dlg(h.talk, () => C.render()); }
    else if (h.on) h.on(C);
    else if (h.t) { Snd.play('tap'); G.toast(h.t); }
    C.save(); C.render();
  };
  C.checkInv = () => {
    const S = stage(); if (!S || S.type !== 'inv') return;
    if (S.need.every(C.has)) { C.save(); G.dlg(S.after || [], () => C.next()); }
    else C.render();
  };
  C.onSlot = id => {
    delete C.newI[id];
    if (G.held === id) { C.inspect(id); return; }
    G.held = id; Snd.play('select'); C.render();
  };
  C.inspect = id => { const E = D.ev[id]; Snd.play('page'); G.modal(`<h3>${esc(E.n)}</h3><div class="itemBig"><svg viewBox="0 0 100 100">${E.ic()}</svg><p>${E.d}</p></div>`, { w: 480 }); };
  // 證詞操作
  C.step = d => { const S = stage(); if (S.type !== 'test') return; C.line = d > 0 ? (C.line + 1) % S.lines.length : Math.max(0, C.line - 1); C.s.face = 'n'; Snd.play('tap'); C.render(); };
  C.press = () => {
    const S = stage(); if (S.type !== 'test') return;
    const L = S.lines[C.line];
    Snd.play('objection');
    G.dlg([{ big: 1, t: '請等一下！' }, ...(L.press || [{ w: S.who, t: '「……就是這樣，沒什麼好說的。」' }])], () => { if (L.pressFx) L.pressFx(C); C.render(); });
  };
  C.present = () => {
    const S = stage(); if (S.type !== 'test') return;
    if (!G.held) { G.toast('先在下方的證物簿點一個證物，再按「出示證物」。'); return; }
    const ev = G.held; G.held = null;
    if (C.line === S.hit[0] && ev === S.hit[1]) {
      Snd.play('objection'); C.s.face = 's';
      G.dlg([{ big: 1, t: '矛盾！' }, ...S.win], () => { C.s.face = 'n'; C.hearts = Math.min(5, C.hearts + 1); C.next(); });
    } else {
      C.miss++; C.hearts--; Snd.play('hurt');
      const bad = [{ w: S.who, e: 'a', t: S.wrong || '「這個東西，跟我剛剛說的話有什麼關係？」' }, `出示「${D.ev[ev].n}」好像不對……`];
      if (C.hearts <= 0) { C.hearts = 5; C.line = 0; bad.push('信用用光了！整理一下思緒，從頭再聽一次證詞吧。'); }
      G.dlg(bad, () => C.render());
    }
    C.save();
  };
  // 指認
  C.openAccuse = () => {
    const S = stage();
    const body = G.modal(`<h3>${S.ask}</h3><p class="sub">選出你認為的犯人。</p><div class="choices">${S.who.map(k => `<button class="choice" data-s="${k}">${Face.draw(k, 'n')}${PEOPLE[k].n}</button>`).join('')}</div><p class="msg"></p>`, { w: 600, noClose: false });
    body.onclick = e => {
      const b = e.target.closest('[data-s]'); if (!b) return;
      if (b.dataset.s !== S.ans) { C.miss++; W.fail(body, S.wrongWho || '再想想看，誰的話前後矛盾？'); return; }
      Snd.play('select');
      const b2 = G.modal(`<h3>${S.evAsk}</h3><p class="sub">從證物簿中選出決定性的證據。</p><div class="choices">${C.ev.map(id => `<button class="choice" data-e="${id}"><svg viewBox="0 0 100 100">${D.ev[id].ic()}</svg>${D.ev[id].n}</button>`).join('')}</div><p class="msg"></p>`, { w: 600 });
      b2.onclick = e2 => {
        const c = e2.target.closest('[data-e]'); if (!c) return;
        if (c.dataset.e !== S.ev) { C.miss++; W.fail(b2, '這個證物還不夠決定性……'); return; }
        $('#modal').hidden = true; G.onClose = null; Snd.play('objection');
        G.dlg([{ big: 1, t: '真相大白！' }, ...S.win], () => C.next());
      };
    };
  };
  // 推理表格（只有第 3 件用到）
  C.openGrid = () => {
    const S = stage(); const g = C.s.grid || (C.s.grid = S.rows.map(() => S.cols.map(() => 0)));
    const draw = () => `<table class="lgrid"><tr><th></th>${S.cols.map(c => `<th>${c}</th>`).join('')}</tr>${S.rows.map((r, i) => `<tr><th>${PEOPLE[r].n}</th>${S.cols.map((c, j) => `<td data-g="${i},${j}" class="${g[i][j] === 1 ? 'o' : g[i][j] === 2 ? 'x' : ''}">${g[i][j] === 1 ? '○' : g[i][j] === 2 ? '✕' : ''}</td>`).join('')}</tr>`).join('')}</table>`;
    const body = G.modal(`<h3>${S.title}</h3><p class="sub">${S.sub}</p><div class="paper" style="font-size:14px;line-height:1.7;margin-bottom:8px">${S.clues.map((c, i) => `${i + 1}. ${c}`).join('\n')}</div><div class="gw">${draw()}</div><p class="sub" style="text-align:center">點格子切換：空白 → ○（在這裡）→ ✕（不在這裡）</p><p class="msg"></p><div class="btnRow"><button class="ok" data-ok="1">確定</button></div>`, { w: 560 });
    body.onclick = e => {
      const td = e.target.closest('[data-g]');
      if (td) { const [i, j] = td.dataset.g.split(',').map(Number); g[i][j] = (g[i][j] + 1) % 3; Snd.play('tap'); body.querySelector('.gw').innerHTML = draw(); C.save(); return; }
      if (e.target.closest('[data-ok]')) {
        const ok = S.rows.every((r, i) => S.cols.every((c, j) => (g[i][j] === 1) === (S.ans[r] === c)));
        if (ok) { W.success(C, body, '行蹤整理好了！', () => { C.addEv(S.give, true); G.dlg(S.win, () => C.next()); }, 900); }
        else { C.miss++; W.fail(body, '好像有地方對不上。每個人只會在一個地方，每個地方也只有一個人。'); }
      }
    };
  };
  C.hint = () => {
    const k = C.st, S = stage(); if (!S) return;
    const draw = () => {
      const L = C.hl[k] || 0;
      let h = `<h3>偵探的提示</h3><p class="sub">目前：${S.goal}</p>`;
      for (let i = 0; i < L; i++) h += `<div class="hintBox${i === 2 ? ' ans' : ''}"><b>${i === 2 ? '答案' : '提示 ' + (i + 1)}</b>${S.h[i]}</div>`;
      if (L < 3) h += `<div class="btnRow"><button class="ok" id="moreHint">${L === 0 ? '給我一點提示' : L === 1 ? '再多一點' : '直接告訴我答案'}</button></div>`;
      const b = G.modal(h, { w: 520 });
      const mb = b.querySelector('#moreHint');
      if (mb) mb.onclick = () => { C.hl[k] = (C.hl[k] || 0) + 1; C.hc++; Snd.play('page'); C.save(); $('#hintN').textContent = C.hc; draw(); };
    };
    draw();
  };
  C.finish = () => {
    if (C.fin) return; C.fin = 1;
    G.active = false; G.held = null;
    const p = Store.data.cases[D.id] || {};
    const stars = starsFor(C.time, C.hc, D.par, C.miss);
    Store.data.cases[D.id] = { done: true, stars: Math.max(p.stars || 0, stars), time: p.time ? Math.min(p.time, C.time) : C.time, hints: p.done ? Math.min(p.hints, C.hc) : C.hc };
    Store.data.cur = null; Store.save();
    Snd.play('fanfare');
    G.dlg(D.outro || [], () => Main.showClear({ kind: 'case', def: D, stars, time: C.time, hints: C.hc, miss: C.miss }));
  };
}
function bindCase() {
  $('#bPrev').onclick = () => G.ctrl && G.ctrl.step && G.ctrl.step(-1);
  $('#bNext').onclick = () => G.ctrl && G.ctrl.step && G.ctrl.step(1);
  $('#bPress').onclick = () => { Snd.init(); G.ctrl && G.ctrl.press && G.ctrl.press(); };
  $('#bPresent').onclick = () => { Snd.init(); G.ctrl && G.ctrl.present && G.ctrl.present(); };
}
addEventListener('DOMContentLoaded', bindCase);
