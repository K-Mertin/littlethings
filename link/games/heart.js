'use strict';
/* 心臟病 — slap game. Everyone has a face-down pile on their own phone. In turn each player flips their top card onto
   the middle while the count goes up (1, 2, 3 …). When the card matches the number being called, everybody slaps
   their own phone: the LAST one (or anyone who didn't slap) takes the whole middle pile. Run out of cards and
   survive until your next turn to win.
   Host owns every deck and the pile; slap order is decided on the host clock, never by the phones.
   Card: { r: rank 1–10 (kid) / 1–13, s: suit 0–3 }
   Messages: {flip:1} {slap:1} */
(() => {
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUIT_A = [['♠', '#1f2346'], ['♥', '#e5304f'], ['♦', '#e5304f'], ['♣', '#1f2346']];
  const SUIT_K = [['🍓', '#ff5d73', '#fff0f2'], ['🍋', '#e9a400', '#fff8dc'], ['🍀', '#16a34a', '#eafbef'], ['🫐', '#2f6fff', '#eaf1ff']];
  const CALL = (kid, n) => kid ? String(n) : RANK[n];
  const WHY = { num: '數到一樣', pair: '連續兩張一樣', sand: '夾心（中間夾一張）', ten: '加起來 10' };
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); };

  function cardHTML(c, kid, cls) {
    if (!c) return `<div class="ht-card back ${cls || ''}"><i></i></div>`;
    if (kid) {
      const S = SUIT_K[c.s];
      const pips = Array.from({ length: c.r }, () => `<i>${S[0]}</i>`).join('');
      return `<div class="ht-card kid ${cls || ''}" style="--sc:${S[1]};--sb:${S[2]}"><b class="ht-cn">${c.r}</b><div class="ht-pips n${c.r}">${pips}</div><b class="ht-cn2">${c.r}</b></div>`;
    }
    const S = SUIT_A[c.s], face = c.r > 10 || c.r === 1;
    const mid = face ? `<span class="ht-face">${RANK[c.r]}<small>${c.r === 11 ? '🗡️' : c.r === 12 ? '👑' : c.r === 13 ? '🦁' : S[0]}</small></span>` : `<span class="ht-big">${S[0]}</span>`;
    return `<div class="ht-card ${cls || ''}" style="--sc:${S[1]}"><span class="ht-ix">${RANK[c.r]}<small>${S[0]}</small></span>${mid}<span class="ht-ix b">${RANK[c.r]}<small>${S[0]}</small></span></div>`;
  }

  LGAMES.push({
    id: 'heart', name: '心臟病', icon: '💓', col: '#e5304f', cat: 'table',
    blurb: '輪流翻牌一起數數，數到一樣快拍手機！最慢的收牌', players: [2, 6],
    opts: kid => [
      { k: 'rule', n: '要拍的時候', o: kid ? [['num', '數到一樣'], ['pair', '＋兩張一樣']] : [['num', '數到一樣'], ['pair', '＋兩張一樣'], ['all', '＋夾心、加起來 10']], d: kid ? 'num' : 'pair' },
      { k: 'spd', n: '翻牌速度', o: [['slow', '慢慢來'], ['mid', '普通'], ['fast', '超快']], d: kid ? 'slow' : 'mid' },
      { k: 'len', n: '時間', o: [[3, '3 分鐘'], [5, '5 分鐘'], [8, '8 分鐘']], d: kid ? 3 : 5 }
    ],
    rules: kid => kid ? [
      '🃏 每人一疊蓋著的牌，輪到你就按「翻牌」',
      '🔢 大家一起數：1、2、3……10，再從 1 開始',
      '👋 翻出來的數字跟數到的一樣，就快拍手機！最慢拍的人要把中間的牌全部收走',
      '🙈 沒有一樣就拍？要收 2 張牌喔',
      '🏆 牌先出完、再輪到你時還是沒有牌，就贏了！'
    ] : [
      '輪流翻自己的牌到中間，同時從 A 數到 K（A、2…10、J、Q、K）再循環',
      '翻出的牌跟喊的數一樣就拍（設定可加：連續兩張同點數、A-B-A 夾心、與上一張加起來 10）',
      '最後一個拍、或沒拍的人收走整疊；亂拍的人也要收整疊',
      '收牌的人從 A 重新開始數並先翻；手機會自己判斷誰快誰慢',
      '出完牌、一輪後還是沒牌就贏；時間到時牌最少的贏'
    ],

    host(ctx) {
      const kid = ctx.kid, O = ctx.opt || {}, ids = ctx.players.map(p => p.id), N = ids.length, now = () => ctx.now();
      const MAXR = kid ? 10 : 13, rule = O.rule || 'num';
      const FLIP_T = { slow: kid ? 7 : 5, mid: kid ? 5 : 3.2, fast: kid ? 3.4 : 2 }[O.spd] || 4;
      const WIN_T = kid ? 3.2 : 2.2;
      const END_T = (O.len || 5) * 60;
      const deck = [];
      const nd = kid && N <= 3 ? 1 : (!kid && N >= 5 ? 2 : 1);
      for (let k = 0; k < nd; k++) for (let s = 0; s < 4; s++) for (let r = 1; r <= MAXR; r++) deck.push({ r, s });
      if (kid && N >= 4) for (let s = 0; s < 4; s++) for (let r = 1; r <= MAXR; r++) deck.push({ r, s });
      shuffle(deck);
      const decks = {}; ids.forEach(id => decks[id] = []);
      deck.forEach((c, i) => decks[ids[i % N]].push(c));
      const order = shuffle(ids.slice());
      let pile = [], ti = 0, cnt = 1, ph = 'flip', T = now() + FLIP_T + 1.5, slaps = [], why = '', loser = null, lastTake = null, over = false;
      let flipN = 0, gameEnd = now() + END_T, winner = null, endWhy = '', took = {}, wrong = {}, fast = {}, lock = {};
      const cur = () => order[ti];
      const push = () => ctx.push();
      ids.forEach(id => { took[id] = 0; wrong[id] = 0; fast[id] = 0; });

      function match() {
        const n = pile.length, c = pile[n - 1]; if (!c) return '';
        if (c.r === c.call) return 'num';
        if (rule !== 'num' && n >= 2 && pile[n - 2].r === c.r) return 'pair';
        if (rule === 'all' && n >= 3 && pile[n - 3].r === c.r) return 'sand';
        if (rule === 'all' && n >= 2 && pile[n - 2].r + c.r === 10) return 'ten';
        return '';
      }
      function nextTurn() {
        ti = (ti + 1) % N;
        if (!decks[cur()].length) return finish(cur(), 'out');
        ph = 'flip'; T = now() + FLIP_T; push();
      }
      function flip(id) {
        if (ph !== 'flip' || id !== cur()) return;
        const c = decks[id].pop(); if (!c) return nextTurn();
        c.call = cnt; c.by = id; pile.push(c); flipN++;
        cnt = cnt % MAXR + 1;
        ctx.sound('*', 'flip');
        const m = match();
        if (m) { ph = 'slap'; why = m; slaps = []; T = now() + WIN_T; push(); return; }
        nextTurn();
      }
      function take(id, kind) {
        const n = pile.length;
        if (kind === 'wrong' && kid) {           // kids only lose two cards for a mistake
          const k = Math.min(2, n), got = pile.splice(0, k);
          decks[id].unshift(...shuffle(got)); took[id] += k;
          lastTake = { id, n: k, kind, t: now() }; ctx.sound(id, 'wrong'); push(); return;
        }
        decks[id].unshift(...shuffle(pile)); took[id] += n; pile = [];
        lastTake = { id, n, kind, t: now() };
        ph = 'take'; loser = id; T = now() + 2.2;
        ctx.sound('*', kind === 'wrong' ? 'buzz' : 'boom');
        push();
      }
      function resolve() {
        const live = ids.filter(id => ctx.online(id));
        const miss = live.filter(id => !slaps.some(s => s.id === id));
        let who;
        if (miss.length) who = miss[rint(miss.length)];
        else who = slaps.length ? slaps[slaps.length - 1].id : cur();
        if (slaps.length) fast[slaps[0].id]++;
        take(who, miss.length ? 'miss' : 'slow');
      }
      function finish(w, y) { if (ph === 'end') return; winner = w; endWhy = y; ph = 'end'; T = now() + 3.5; ctx.sound('*', 'win'); push(); }

      return {
        get over() { return over; },
        tick() {
          const t = now();
          if (ph === 'end') { if (t >= T) over = true; return; }
          if (t >= gameEnd && ph === 'flip') return finish(null, 'time');
          if (ph === 'flip') {
            const c = cur();
            if (t >= T || (!ctx.online(c) && t >= T - FLIP_T + 1.2)) flip(c);
          } else if (ph === 'slap') {
            const live = ids.filter(id => ctx.online(id));
            if (t >= T || live.every(id => slaps.some(s => s.id === id))) resolve();
          } else if (ph === 'take') {
            if (t >= T) {
              cnt = 1; ti = order.indexOf(loser); loser = null; why = ''; slaps = [];
              ph = 'flip'; T = now() + FLIP_T + 0.6;
              if (!decks[cur()].length) return nextTurn();
              push();
            }
          }
        },
        msg(id, d) {
          if (!d || !ids.includes(id)) return;
          if (d.flip) { flip(id); return; }
          if (d.slap) {
            const t = now();
            if (lock[id] && t < lock[id]) return;
            if (ph === 'slap') {
              if (slaps.some(s => s.id === id)) return;
              slaps.push({ id, dt: Math.round((t - (T - WIN_T)) * 100) / 100 });
              ctx.sound(id, 'pop'); push(); return;
            }
            if (ph === 'flip' && pile.length) {
              // a slap within a moment of the take/resolve is just a late slap, not a mistake
              if (lastTake && t - lastTake.t < 0.6) return;
              wrong[id]++; lock[id] = t + 1.2;
              ctx.toast(id, kid ? '還沒有一樣喔！收 2 張 🙈' : '亂拍！整疊收走 😱');
              take(id, 'wrong');
            }
          }
        },
        leave() { push(); }, back() { push(); },
        view(id) {
          const me = id && ids.includes(id) ? id : null, t = now();
          const top = pile.slice(-3).map(c => ({ r: c.r, s: c.s, call: c.call, by: c.by }));
          const v = {
            ph, order, cur: cur(), cnt, top, pn: pile.length, n: {}, sl: slaps, why, lt: lastTake && t - lastTake.t < 2.6 ? lastTake : null,
            tl: Math.max(0, Math.round((T - t) * 10) / 10), tt: ph === 'flip' ? FLIP_T : WIN_T, gl: Math.max(0, Math.round(gameEnd - t)), rule, kid, fl: flipN
          };
          ids.forEach(x => v.n[x] = decks[x].length);
          if (ph === 'end') v.win = winner;
          if (me) v.lk = lock[me] && lock[me] > t ? 1 : 0;
          return v;
        },
        results() {
          const rows = ids.map(id => ({ id, key: id === winner ? -1 : decks[id].length, line: id === winner ? '🏆 牌出完了！' : `剩 ${decks[id].length} 張 · 收過 ${took[id]} 張 · 最快 ${fast[id]} 次${wrong[id] ? ' · 亂拍 ' + wrong[id] : ''}` }));
          return { rows, lowWins: true, sub: endWhy === 'time' ? '時間到！手上牌最少的贏' : '' };
        }
      };
    },

    client(root, api) {
      if (!document.getElementById('ht-style')) { const st = document.createElement('style'); st.id = 'ht-style'; st.textContent = CSS; document.head.appendChild(st); }
      const kid = api.kid, me = api.me, tv = api.isTable;
      root.innerHTML = `<div class="ht ${kid ? 'ht-kid' : ''} ${tv ? 'ht-tv' : ''} ${me ? '' : 'ht-pub'}">
        <div class="ht-top"><span class="ht-gl"></span><span class="ht-rule"></span></div>
        <div class="ht-seats"></div>
        <div class="ht-mid"><div class="ht-call"></div><div class="ht-pile"></div><div class="ht-msg"></div></div>
        <div class="ht-ctl">${me ? '<button class="ht-deck"></button><button class="ht-slap"><span>👋</span><b>拍！</b></button>' : ''}</div>
        <div class="ht-flash" hidden></div>
      </div>`;
      const Q = s => root.querySelector(s);
      const wrap = Q('.ht'), elGl = Q('.ht-gl'), elRule = Q('.ht-rule'), elSeats = Q('.ht-seats'), elCall = Q('.ht-call'), elPile = Q('.ht-pile'),
        elMsg = Q('.ht-msg'), elDeck = Q('.ht-deck'), elSlap = Q('.ht-slap'), elFlash = Q('.ht-flash');
      const P = id => api.player(id) || { name: '?', col: 0, animal: 0 };
      const set = (el, key, html) => { if (!el || el._k === key) return false; el._k = key; el.innerHTML = html; return true; };
      let V = null, lastFl = -1, lastPh = '', lastLt = null, raf = 0, tEnd = 0, myTurn = false;
      const ro = new ResizeObserver(() => wrap.classList.toggle('ht-wide', root.clientWidth > root.clientHeight * 1.25));
      ro.observe(root);

      const doSlap = e => {
        if (e) e.preventDefault();
        if (!V || V.ph === 'end') return;
        elSlap.classList.remove('hit'); void elSlap.offsetWidth; elSlap.classList.add('hit');
        api.vibrate(30); api.sfx('pop'); api.send({ slap: 1 });
      };
      if (elSlap) elSlap.addEventListener('pointerdown', doSlap);
      if (elDeck) elDeck.addEventListener('pointerdown', e => { e.preventDefault(); if (V && V.ph === 'flip' && V.cur === me) { api.send({ flip: 1 }); elDeck.classList.add('go'); } });
      const onKey = e => { if (!me) return; if (e.code === 'Space') { doSlap(e); } else if (e.code === 'Enter' && V && V.cur === me) api.send({ flip: 1 }); };
      addEventListener('keydown', onKey);

      function loop() {
        raf = requestAnimationFrame(loop);
        if (!V) return;
        const left = Math.max(0, tEnd - performance.now() / 1000);
        const bar = root.querySelector('.ht-tbar i');
        if (bar) bar.style.transform = `scaleX(${cl(left / V.tt, 0, 1)})`;
      }
      raf = requestAnimationFrame(loop);

      function flash(html, cls) {
        elFlash.className = 'ht-flash ' + (cls || ''); elFlash.innerHTML = html; elFlash.hidden = false;
        clearTimeout(flash.t); flash.t = setTimeout(() => { elFlash.hidden = true; }, 1300);
      }

      function draw() {
        const v = V;
        tEnd = performance.now() / 1000 + v.tl;
        elGl.textContent = `⏱ ${fmtT(v.gl)}`;
        elRule.textContent = v.rule === 'num' ? (kid ? '數到一樣就拍' : '數到一樣就拍') : v.rule === 'pair' ? '數到一樣・兩張一樣' : '數到一樣・兩張一樣・夾心・湊 10';
        // seats
        const key = JSON.stringify([v.order, v.n, v.cur, v.sl, v.ph, api.players().map(p => p.online), v.win]);
        set(elSeats, key, v.order.map(id => {
          const p = P(id), si = v.sl.findIndex(s => s.id === id), cur = id === v.cur && (v.ph === 'flip');
          return `<div class="ht-seat ${cur ? 'cur' : ''} ${id === me ? 'me' : ''} ${p.online === false ? 'off' : ''} ${si >= 0 ? 'slapped' : ''} ${v.win === id ? 'win' : ''}">
            <div class="ht-av"><img alt="" src="${api.avatar(p, tv ? 128 : 80)}">${si >= 0 ? `<span class="ht-sb">👋${si + 1}</span>` : ''}</div>
            <div class="ht-nm">${esc(p.name)}</div><div class="ht-n">🂠 ${v.n[id]}</div></div>`;
        }).join(''));
        // call bubble: what the NEXT flip will be called, or what was called on the top card
        const top = v.top[v.top.length - 1];
        if (v.ph === 'slap' || v.ph === 'take') set(elCall, 'c' + v.ph + (top ? top.call : '') + v.why, top ? `<span class="ht-cl">喊「<b>${CALL(kid, top.call)}</b>」</span>` : '');
        else set(elCall, 'n' + v.cnt + v.cur + v.ph, v.ph === 'end' ? '' : `<span class="ht-cl">${v.cur === me ? '你要喊' : esc(P(v.cur).name) + ' 要喊'}「<b>${CALL(kid, v.cnt)}</b>」</span><div class="ht-tbar"><i></i></div>`);
        // pile
        set(elPile, JSON.stringify([v.top, v.pn]), v.pn ? v.top.map((c, i) => cardHTML(c, kid, 'p' + (v.top.length - 1 - i) + (i === v.top.length - 1 && v.fl !== lastFl ? ' new' : ''))).join('') + `<span class="ht-pn">${v.pn} 張</span>` : `<div class="ht-empty">${kid ? '中間還沒有牌' : '牌堆是空的'}</div>`);
        // message
        let msg = '';
        if (v.ph === 'slap') msg = `<b class="ht-go">👋 快拍！</b><small>${WHY[v.why] || ''}</small>`;
        else if (v.ph === 'take' && v.lt) msg = `${v.lt.id === me ? '<b>你</b>' : `<b>${esc(P(v.lt.id).name)}</b>`} ${v.lt.kind === 'wrong' ? '亂拍，' : v.lt.kind === 'miss' ? '沒拍到，' : '最慢，'}收走 ${v.lt.n} 張！`;
        else if (v.ph === 'end') msg = v.win ? `🏆 <b>${esc(P(v.win).name)}</b> 的牌出完了！` : '⏰ 時間到！';
        else if (v.cur === me) msg = '輪到你翻牌！';
        else msg = `等 ${esc(P(v.cur).name)} 翻牌…`;
        set(elMsg, msg, msg);
        // controls
        if (elDeck) {
          myTurn = v.ph === 'flip' && v.cur === me;
          set(elDeck, [v.n[me], myTurn].join(), `<span class="ht-stack">${v.n[me] ? cardHTML(null, kid, 's2') + cardHTML(null, kid, 's1') + cardHTML(null, kid, 's0') : '<span class="ht-none">沒牌了！</span>'}</span><span class="ht-dl">${myTurn ? '👆 翻牌' : `我的牌 ${v.n[me]} 張`}</span>`);
          elDeck.classList.toggle('mine', myTurn); if (!myTurn) elDeck.classList.remove('go');
          elSlap.classList.toggle('hot', v.ph === 'slap' && !v.sl.some(s => s.id === me));
          elSlap.classList.toggle('done', v.sl.some(s => s.id === me));
          elSlap.classList.toggle('lock', !!v.lk);
        }
        // one-shot effects
        if (v.fl !== lastFl) { lastFl = v.fl; if (v.ph === 'slap') { flash(`<b>👋</b>`, 'go'); api.vibrate(60); } }
        if (v.ph === 'flip' && lastPh !== 'flip' && v.cur === me) { api.sfx('turn'); api.vibrate(25); }
        const ltk = v.lt ? v.lt.t + v.lt.id : null;
        if (ltk && ltk !== lastLt) { lastLt = ltk; if (v.lt.id === me) { api.vibrate(120); flash(`<b>😱</b><span>+${v.lt.n}</span>`, 'bad'); } }
        lastPh = v.ph;
      }

      return {
        view(v) { if (!v) return; V = v; draw(); },
        destroy() { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keydown', onKey); }
      };
    },

    bot(v, api) {
      const me = api.me; if (!v || !me) return;
      if (v.ph === 'flip' && v.cur === me && Math.random() < 0.6) api.send({ flip: 1 });
      if (v.ph === 'slap' && !v.sl.some(s => s.id === me) && Math.random() < 0.55) api.send({ slap: 1 });
      if (v.ph === 'flip' && v.pn && Math.random() < 0.01) api.send({ slap: 1 });
    }
  });

  const CSS = `
.ht{position:absolute;inset:0;display:grid;grid-template-rows:auto auto 1fr auto;gap:6px;padding:8px 10px calc(10px + env(safe-area-inset-bottom,0px));
  background:radial-gradient(circle at 50% 45%,#3a9a5e 0,#1f6b3e 60%,#164d2d 100%);color:#fff;overflow:hidden;font-family:var(--sans);touch-action:manipulation}
.ht-top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:900;font-size:13px}
.ht-top span{background:rgba(0,0,0,.25);border-radius:999px;padding:4px 10px}
.ht-seats{display:flex;justify-content:center;gap:6px;flex-wrap:wrap}
.ht-seat{display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,.12);border-radius:14px;padding:4px 6px;min-width:58px;border:2px solid transparent;transition:transform .15s}
.ht-seat.cur{border-color:#ffd166;background:rgba(255,209,102,.22);transform:translateY(-2px)}
.ht-seat.me .ht-nm{color:#ffd166}
.ht-seat.off{opacity:.45}
.ht-seat.win{background:#ffd166;color:#1f2346}
.ht-av{position:relative;width:38px;height:38px}.ht-av img{width:100%;height:100%}
.ht-sb{position:absolute;right:-12px;top:-6px;background:#fff;color:#1f2346;border-radius:999px;font-size:11px;font-weight:900;padding:1px 4px;animation:htPop .25s}
.ht-nm{font-size:12px;font-weight:900;max-width:70px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ht-n{font-size:12px;font-weight:700;opacity:.9}
.ht-mid{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:0}
.ht-call{display:flex;flex-direction:column;align-items:center;gap:4px}
.ht-cl{background:#fff;color:#1f2346;border-radius:999px;padding:5px 16px;font-weight:900;font-size:16px;box-shadow:0 4px 0 rgba(0,0,0,.2)}
.ht-cl b{font-family:var(--round);font-size:26px;color:#e5304f;margin:0 2px}
.ht-tbar{width:150px;height:6px;border-radius:9px;background:rgba(0,0,0,.25);overflow:hidden}.ht-tbar i{display:block;height:100%;background:#ffd166;transform-origin:left}
.ht-pile{position:relative;width:min(40vw,150px);aspect-ratio:2/3;flex:none}
.ht-kid .ht-pile{width:min(42vw,160px)}
.ht-pile .ht-card{position:absolute;inset:0;width:100%}
.ht-pile .p2{transform:rotate(-12deg) translate(-14%,4%);filter:brightness(.85)}
.ht-pile .p1{transform:rotate(9deg) translate(10%,2%);filter:brightness(.92)}
.ht-pile .p0{transform:rotate(-2deg)}
.ht-pile .new{animation:htIn .28s cubic-bezier(.2,.9,.3,1.3)}
.ht-pn{position:absolute;right:-8px;bottom:-8px;background:#1f2346;color:#fff;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:900;z-index:3}
.ht-empty{position:absolute;inset:0;border:3px dashed rgba(255,255,255,.4);border-radius:14px;display:grid;place-items:center;font-weight:900;font-size:14px;color:rgba(255,255,255,.75);text-align:center;padding:8px}
.ht-msg{font-weight:900;font-size:17px;text-align:center;min-height:2.6em;display:flex;flex-direction:column;align-items:center;justify-content:center;text-shadow:0 2px 0 rgba(0,0,0,.25)}
.ht-msg small{font-size:13px;opacity:.9}
.ht-go{font-size:30px;color:#ffd166;animation:htShake .3s infinite}
.ht-card{width:100%;aspect-ratio:2/3;border-radius:12px;background:#fff;color:var(--sc);box-shadow:0 6px 14px rgba(0,0,0,.3);position:relative;display:grid;place-items:center;border:3px solid #fff;overflow:hidden}
.ht-ix{position:absolute;left:7px;top:4px;font-family:var(--round);font-weight:700;font-size:clamp(18px,5vw,26px);line-height:1;display:flex;flex-direction:column;align-items:center}
.ht-ix small{font-size:.8em}
.ht-ix.b{left:auto;top:auto;right:7px;bottom:4px;transform:rotate(180deg)}
.ht-big{font-size:clamp(54px,16vw,80px);line-height:1}
.ht-face{font-family:var(--round);font-weight:700;font-size:clamp(46px,13vw,66px);display:flex;flex-direction:column;align-items:center;line-height:1}.ht-face small{font-size:.5em}
.ht-card.kid{background:var(--sb);border-color:var(--sc)}
.ht-cn,.ht-cn2{position:absolute;font-family:var(--round);font-weight:700;color:var(--sc);font-size:clamp(22px,6vw,30px);line-height:1;left:8px;top:5px}
.ht-cn2{left:auto;top:auto;right:8px;bottom:5px;transform:rotate(180deg)}
.ht-pips{display:grid;grid-template-columns:repeat(2,1fr);gap:0 4px;font-size:clamp(14px,4.3vw,22px);line-height:1.15;justify-items:center}
.ht-pips.n1{font-size:clamp(40px,12vw,60px)}.ht-pips.n1,.ht-pips.n2,.ht-pips.n3{grid-template-columns:1fr}
.ht-pips.n2,.ht-pips.n3{font-size:clamp(22px,7vw,34px)}
.ht-card.back{background:repeating-linear-gradient(45deg,#e5304f 0 8px,#c51f3c 8px 16px);border-color:#fff}
.ht-card.back i{width:46%;aspect-ratio:1;border-radius:50%;background:#fff;display:grid;place-items:center}
.ht-card.back i::after{content:'💓';font-size:clamp(16px,5vw,26px);font-style:normal}
.ht-kid .ht-card.back{background:repeating-linear-gradient(45deg,#5b5bf7 0 8px,#4646d8 8px 16px)}
.ht-kid .ht-card.back i::after{content:'⭐'}
.ht-ctl{display:grid;grid-template-columns:1fr 1.3fr;gap:10px;align-items:stretch}
.ht-pub .ht-ctl{display:none}
.ht-deck{background:rgba(0,0,0,.22);border-radius:18px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;color:#fff;border:3px solid transparent;min-height:110px}
.ht-deck.mine{border-color:#ffd166;background:rgba(255,209,102,.25);animation:htGlow 1s infinite}
.ht-deck.go{transform:scale(.96)}
.ht-stack{position:relative;width:52px;height:78px}
.ht-stack .ht-card{position:absolute;inset:0;border-width:2px;border-radius:8px}
.ht-stack .s1{transform:translate(3px,-3px)}.ht-stack .s2{transform:translate(6px,-6px)}
.ht-none{display:grid;place-items:center;height:100%;font-weight:900;font-size:13px}
.ht-dl{font-weight:900;font-size:15px}
.ht-slap{border-radius:22px;background:linear-gradient(#ff6b81,#e5304f);box-shadow:0 7px 0 #9e1730;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:110px;touch-action:none}
.ht-slap span{font-size:46px;line-height:1}.ht-slap b{font-size:26px;font-weight:900}
.ht-slap.hit{animation:htHit .18s}
.ht-slap.hot{animation:htHot .35s infinite;background:linear-gradient(#ffd166,#ff8a1f);box-shadow:0 7px 0 #b55f00}
.ht-slap.done{filter:saturate(.4);box-shadow:0 2px 0 #9e1730;transform:translateY(5px)}
.ht-slap.lock{opacity:.45}
.ht-flash{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;pointer-events:none;z-index:9;font-weight:900}
.ht-flash b{font-size:120px;animation:htBoom .5s ease-out both}
.ht-flash span{font-family:var(--round);font-size:60px;color:#ffd166;text-shadow:0 4px 0 #9e1730}
.ht-flash.bad{background:rgba(229,48,79,.25)}
.ht-wide{grid-template-columns:1fr 300px;grid-template-rows:auto auto 1fr}
.ht-wide .ht-top{grid-column:1/-1}
.ht-wide .ht-seats{grid-column:1/-1}
.ht-wide .ht-mid{grid-column:1;grid-row:3}
.ht-wide .ht-ctl{grid-column:2;grid-row:3;grid-template-columns:1fr;grid-template-rows:auto 1fr}
.ht-wide.ht-pub{grid-template-columns:1fr}
.ht-wide .ht-pile{width:auto;height:min(46vh,240px)}
.ht-wide .ht-mid{gap:4px}
.ht-tv .ht-pile{height:46vh}
.ht-tv .ht-seat{min-width:110px;padding:8px 12px}.ht-tv .ht-av{width:72px;height:72px}.ht-tv .ht-nm,.ht-tv .ht-n{font-size:20px}
.ht-tv .ht-cl{font-size:30px}.ht-tv .ht-cl b{font-size:50px}.ht-tv .ht-msg{font-size:32px}
@media (max-height:460px){.ht{gap:4px;padding-top:4px}.ht-seat{flex-direction:row;gap:4px;padding:2px 6px}.ht-av{width:28px;height:28px}.ht-nm{max-width:50px}
  .ht-wide .ht-pile{height:min(38vh,150px)}.ht-deck{min-height:0;flex-direction:row;justify-content:center;gap:14px}.ht-stack{width:36px;height:54px;margin-right:6px}.ht-slap{min-height:0}.ht-slap span{font-size:34px}.ht-msg{min-height:0;font-size:15px}.ht-cl{font-size:14px;padding:3px 12px}.ht-cl b{font-size:20px}}
@keyframes htIn{0%{transform:translateY(-60%) rotate(-20deg) scale(1.2);opacity:0}100%{transform:rotate(-2deg)}}
@keyframes htPop{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes htShake{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg) scale(1.08)}}
@keyframes htGlow{50%{box-shadow:0 0 0 6px rgba(255,209,102,.35)}}
@keyframes htHit{50%{transform:scale(.92)}}
@keyframes htHot{50%{transform:scale(1.05)}}
@keyframes htBoom{0%{transform:scale(.3);opacity:0}40%{transform:scale(1.15);opacity:1}100%{transform:scale(1);opacity:0}}
`;
})();
