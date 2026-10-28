'use strict';
/* 心有靈犀 — co-op hidden-number game (in the spirit of The Mind). Everyone holds secret numbers on their own phone.
   Without saying any number, the whole team must play ALL cards into one pile in rising order. You can only play
   your lowest card, whenever you feel the moment is right. Play too early (someone still held a lower number) and the
   team loses a heart. Level n deals n cards each. A ⭐ (everyone agrees) makes each player show and drop their lowest card.
   Host keeps all hands; a phone only ever sees its own numbers.
   Messages: {rd:1} ready for the level · {play:1} play my lowest · {star:1} toggle star vote */
(() => {
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const SKIN = ['🐣', '🐥', '🐤', '🐔', '🦚', '🦜', '🦢', '🦉', '🦅', '🐉'];

  LGAMES.push({
    id: 'mind', name: '心有靈犀', icon: '🔮', col: '#9b5cff', cat: 'coop',
    blurb: '手上的數字不能說！大家憑默契由小到大出牌', players: [2, 6],
    opts: kid => kid ? [
      { k: 'n', n: '數字範圍', o: [[30, '1–30'], [50, '1–50']], d: 30 },
      { k: 'lv', n: '關卡', o: [[4, '4 關'], [6, '6 關'], [8, '8 關']], d: 6 },
      { k: 'see', n: '看得到', o: [['all', '別人剩幾張'], ['none', '什麼都看不到']], d: 'all' }
    ] : [
      { k: 'n', n: '數字範圍', o: [[100, '1–100'], [60, '1–60']], d: 100 },
      { k: 'lv', n: '關卡', o: [['std', '標準（依人數）'], [6, '6 關']], d: 'std' },
      { k: 'see', n: '看得到', o: [['all', '別人剩幾張'], ['none', '盲眼挑戰']], d: 'all' }
    ],
    rules: kid => kid ? [
      '🔢 每個人手機上有祕密數字，不可以說出來！',
      '👆 大家要從小到大，一張一張出到中間',
      '⏳ 你的數字很小就早點出，很大就等一等',
      '💔 出太早（別人還有更小的）就少一顆愛心',
      '⭐ 大家都按星星，每個人最小的那張會被丟掉',
      '🎉 每過一關，手上的牌會多一張！'
    ] : [
      '每關每人拿到 n 張祕密數字（第 n 關），不能說數字、不能打暗號，只能靠時間默契',
      '隨時可以出自己「最小」的一張；全隊要把牌照遞增順序全部出完才過關',
      '有人手上還有比剛出的更小的數 → 失去一顆 ❤️，那些較小的牌會被丟棄',
      '⭐ 全員同意：每人丟掉自己最小的牌（會公開）',
      '每關開始前大家先按「準備好了」；第 2、5、8 關過關給 ⭐，第 3、6、9 關給 ❤️'
    ],

    host(ctx) {
      const kid = ctx.kid, O = ctx.opt || {}, ids = ctx.players.map(p => p.id), N = ids.length, now = () => ctx.now();
      const MAXN = O.n || (kid ? 30 : 100);
      const LVMAX = typeof O.lv === 'number' ? O.lv : (N <= 2 ? 12 : N === 3 ? 10 : 8);
      const see = O.see !== 'none';
      let lives = Math.min(5, N + (kid ? 1 : 0)), stars = 1, lv = 0, ph = 'ready', T = 0, over = false, won = false;
      let hands = {}, pile = [], dropped = [], oops = null, sv = new Set(), ready = new Set(), starShow = null, reward = '', misses = 0, offT = {};
      const push = () => ctx.push();

      function deal() {
        lv++; ph = 'ready'; ready.clear(); sv.clear(); pile = []; dropped = []; oops = null; starShow = null;
        const nums = shuffle(Array.from({ length: MAXN }, (_, i) => i + 1));
        ids.forEach(id => { hands[id] = nums.splice(0, lv).sort((a, b) => a - b); });
        ctx.sound('*', 'deal'); push();
      }
      const left = () => ids.reduce((a, id) => a + hands[id].length, 0);
      function checkClear() {
        if (left() > 0) return;
        if (lv >= LVMAX) { won = true; ph = 'end'; T = now() + 3.5; ctx.sound('*', 'win'); push(); return; }
        reward = '';
        if ([2, 5, 8].includes(lv) && stars < 3) { stars++; reward = '⭐'; }
        if ([3, 6, 9].includes(lv) && lives < 5) { lives++; reward = '❤️'; }
        ph = 'clear'; T = now() + 3; ctx.sound('*', 'star'); push();
      }
      function play(id) {
        if (ph !== 'play' || !hands[id].length) return;
        const v = hands[id].shift(); pile.push({ v, by: id });
        const lower = [];
        ids.forEach(o => { const l = hands[o].filter(x => x < v); if (l.length) { lower.push({ id: o, v: l }); hands[o] = hands[o].filter(x => x > v); } });
        if (lower.length) {
          lives--; misses++;
          lower.forEach(l => l.v.forEach(x => dropped.push({ v: x, by: l.id })));
          oops = { by: id, v, lower }; ph = 'oops'; T = now() + 3.2;
          ctx.sound('*', 'wrong'); push(); return;
        }
        ctx.sound('*', 'card'); push();
        checkClear();
      }
      function useStar() {
        stars--; sv.clear();
        starShow = [];
        ids.forEach(id => { if (hands[id].length) { const v = hands[id].shift(); starShow.push({ id, v }); dropped.push({ v, by: id, st: 1 }); } });
        ph = 'star'; T = now() + 3; ctx.sound('*', 'star'); push();
      }

      deal();
      return {
        get over() { return over; },
        tick() {
          const t = now();
          if (ph === 'ready') { if (ids.every(id => ready.has(id) || !ctx.online(id))) { ph = 'play'; ctx.sound('*', 'go'); push(); } }
          else if (ph === 'oops') { if (t >= T) { if (lives <= 0) { ph = 'end'; T = now() + 3.5; ctx.sound('*', 'boom'); push(); } else { ph = 'play'; oops = null; push(); checkClear(); } } }
          else if (ph === 'star') { if (t >= T) { ph = 'play'; starShow = null; push(); checkClear(); } }
          else if (ph === 'clear') { if (t >= T) deal(); }
          else if (ph === 'end') { if (t >= T) over = true; }
          if (ph === 'play') {
            // somebody gone for a long time: drop their cards so the team isn't stuck
            ids.forEach(id => {
              if (ctx.online(id)) { offT[id] = 0; return; }
              offT[id] = (offT[id] || t); if (t - offT[id] > 20 && hands[id].length) { hands[id].forEach(v => dropped.push({ v, by: id })); hands[id] = []; push(); checkClear(); }
            });
          }
        },
        msg(id, d) {
          if (!d || !ids.includes(id)) return;
          if (d.rd && ph === 'ready') { ready.add(id); ctx.sound('*', 'pop'); push(); return; }
          if (d.play) { play(id); return; }
          if (d.star && ph === 'play' && stars > 0) {
            if (sv.has(id)) sv.delete(id); else sv.add(id);
            const need = ids.filter(x => hands[x].length && ctx.online(x));
            if (need.length && need.every(x => sv.has(x))) useStar(); else push();
          }
        },
        leave() { push(); }, back() { push(); },
        view(id) {
          const me = id && ids.includes(id) ? id : null;
          const v = { ph, lv, lvMax: LVMAX, lives, stars, max: MAXN, pile: pile.slice(-12), pn: pile.length, dr: dropped, sv: [...sv], rd: [...ready], see, rw: reward, won };
          v.top = pile.length ? pile[pile.length - 1] : null;
          v.n = {}; ids.forEach(x => v.n[x] = see || ph === 'end' || x === me ? hands[x].length : -1);
          v.tot = left();
          if (oops) v.oops = oops;
          if (starShow) v.ss = starShow;
          if (me) v.my = hands[me];
          if (ph === 'end') v.left = ids.map(x => ({ id: x, v: hands[x] }));
          return v;
        },
        results() {
          const cleared = won ? LVMAX : lv - 1;
          const pts = {}; ids.forEach(x => pts[x] = won ? 3 : Math.floor(cleared / LVMAX * 3));
          return {
            rows: ids.map(x => ({ id: x, key: cleared, line: won ? '🔮 全部過關！' : `一起闖過 ${cleared} 關` })), pts,
            title: won ? '心有靈犀！全部過關 🎉' : `闖到第 ${lv} 關！`, sub: `${LVMAX} 關 · 1–${MAXN} · 失誤 ${misses} 次`
          };
        }
      };
    },

    client(root, api) {
      if (!document.getElementById('md-style')) { const st = document.createElement('style'); st.id = 'md-style'; st.textContent = CSS; document.head.appendChild(st); }
      const kid = api.kid, me = api.me, tv = api.isTable;
      root.innerHTML = `<div class="md ${kid ? 'md-kid' : ''} ${tv ? 'md-tv' : ''} ${me ? '' : 'md-pub'}">
        <div class="md-top"><span class="md-lv"></span><span class="md-hp"></span><span class="md-st"></span></div>
        <div class="md-seats"></div>
        <div class="md-mid"><div class="md-pile"></div><div class="md-msg"></div></div>
        <div class="md-line"><div class="md-ln"></div></div>
        ${me ? '<div class="md-hand"></div><div class="md-act"><button class="btn md-star" data-star></button><button class="btn acc md-play" data-play></button></div>' : ''}
        <div class="md-ov" hidden></div>
      </div>`;
      const Q = s => root.querySelector(s);
      const wrap = Q('.md'), elLv = Q('.md-lv'), elHp = Q('.md-hp'), elSt = Q('.md-st'), elSeats = Q('.md-seats'), elPile = Q('.md-pile'), elMsg = Q('.md-msg'),
        elLn = Q('.md-ln'), elHand = Q('.md-hand'), elStar = Q('[data-star]'), elPlay = Q('[data-play]'), elOv = Q('.md-ov');
      const P = id => api.player(id) || { name: '?', col: 0, animal: 0 };
      const set = (el, key, html) => { if (!el || el._k === key) return false; el._k = key; el.innerHTML = html; return true; };
      let V = null, lastPn = -1, lastPh = '', hold = 0;
      const ro = new ResizeObserver(() => wrap.classList.toggle('md-wide', root.clientWidth > root.clientHeight * 1.25));
      ro.observe(root);
      if (elPlay) elPlay.onclick = () => {
        if (!V) return;
        if (V.ph === 'ready') { api.send({ rd: 1 }); api.sfx('pop'); return; }
        if (V.ph === 'play' && V.my && V.my.length) { api.send({ play: 1 }); api.vibrate(25); }
      };
      if (elStar) elStar.onclick = () => { if (V && V.ph === 'play' && V.stars > 0) { api.send({ star: 1 }); api.sfx('tick'); } };

      function ov(html, cls) { elOv.className = 'md-ov ' + (cls || ''); elOv.innerHTML = html; elOv.hidden = false; }
      function draw() {
        const v = V;
        elLv.textContent = `第 ${v.lv}/${v.lvMax} 關`;
        elHp.innerHTML = '❤️'.repeat(Math.max(0, v.lives)) || '<i>沒有愛心</i>';
        elSt.innerHTML = '⭐'.repeat(v.stars) || '<i>沒有星星</i>';
        set(elSeats, JSON.stringify([v.n, v.sv, v.rd, v.ph, v.top && v.top.by, api.players().map(p => p.online)]), api.players().map(p => {
          const id = p.id, n = v.n[id];
          return `<div class="md-seat ${id === me ? 'me' : ''} ${p.online === false ? 'off' : ''} ${v.top && v.top.by === id && v.ph === 'play' ? 'last' : ''}">
            <img alt="" src="${api.avatar(p, tv ? 128 : 72)}"><span class="md-nm">${esc(p.name)}</span>
            <span class="md-c">${v.ph === 'ready' ? (v.rd.includes(id) ? '✋ 好了' : '…') : n < 0 ? '🂠 ?' : n ? '🂠'.repeat(Math.min(n, 5)) + (n > 5 ? '+' : '') : '✔ 出完'}</span>
            ${v.sv.includes(id) ? '<span class="md-vs">⭐</span>' : ''}</div>`;
        }).join(''));
        // pile
        const top = v.top;
        set(elPile, (top ? top.v + top.by : '') + v.pn, top ? `<div class="md-card top ${v.pn !== lastPn ? 'new' : ''}"><b>${top.v}</b><small>${esc(P(top.by).name)}</small></div><span class="md-pn">已出 ${v.pn} 張 · 還剩 ${v.tot} 張</span>` : `<div class="md-card empty">${kid ? '從最小的開始！' : '等第一張'}</div><span class="md-pn">全隊共 ${v.tot} 張</span>`);
        // message
        let m = '';
        if (v.ph === 'ready') m = kid ? '大家準備好就開始，<b>不能說數字喔 🤫</b>' : '全員按「準備好了」就開始。<b>不能說數字</b>';
        else if (v.ph === 'play') m = v.sv.length ? `⭐ ${v.sv.length} 人想用星星` : (kid ? '覺得輪到你了就出牌 👆' : '靠感覺，時間就是暗號');
        else if (v.ph === 'end') m = v.won ? '🎉 全部過關！' : '💔 愛心用完了';
        set(elMsg, m, m);
        // number line: everything played this level + dropped, my numbers marked
        const pct = x => ((x - 1) / (v.max - 1) * 100).toFixed(2) + '%';
        set(elLn, JSON.stringify([v.pile, v.dr, v.my, v.max]), `<i class="md-tk" style="left:0">1</i><i class="md-tk" style="left:100%">${v.max}</i>` +
          v.dr.map(d => `<span class="md-dot dr" style="left:${pct(d.v)}" title="${d.v}"></span>`).join('') +
          v.pile.map((d, i) => `<span class="md-dot pl ${i === v.pile.length - 1 ? 'top' : ''}" style="left:${pct(d.v)}"><em>${d.v}</em></span>`).join('') +
          (v.my || []).map((x, i) => `<span class="md-dot my ${i === 0 ? 'lo' : ''}" style="left:${pct(x)}"><em>${x}</em></span>`).join(''));
        // hand + buttons
        if (elHand) {
          set(elHand, JSON.stringify([v.my, v.ph]), v.my && v.my.length ? v.my.map((x, i) => `<div class="md-card mine ${i === 0 ? 'lo' : ''}"><b>${x}</b></div>`).join('') : `<div class="md-none">${v.ph === 'ready' ? '' : '🎉 你的牌出完了，看大家的！'}</div>`);
          const lo = v.my && v.my[0];
          if (v.ph === 'ready') { elPlay.innerHTML = v.rd.includes(me) ? '✋ 等其他人…' : '✋ 準備好了'; elPlay.disabled = v.rd.includes(me); }
          else { elPlay.innerHTML = lo ? `出 <b>${lo}</b>` : '沒牌了'; elPlay.disabled = !(v.ph === 'play' && lo); }
          elStar.innerHTML = `⭐ ${v.sv.includes(me) ? '取消' : '用星星'}<small>${v.sv.length}/${Object.keys(v.n).filter(x => v.n[x] !== 0).length}</small>`;
          elStar.disabled = !(v.ph === 'play' && v.stars > 0 && lo);
          elStar.classList.toggle('on', v.sv.includes(me));
        }
        // overlays
        if (v.ph === 'oops' && v.oops) {
          const o = v.oops;
          ov(`<div class="md-ovb"><div class="md-big">💔</div><h3>${esc(P(o.by).name)} 出了 <b>${o.v}</b>，太早了！</h3>${o.lower.map(l => `<div class="md-lw"><img alt="" src="${api.avatar(P(l.id), 64)}">${esc(P(l.id).name)} 還有 ${l.v.map(x => `<b>${x}</b>`).join(' ')}</div>`).join('')}<small>這些牌丟掉，繼續！</small></div>`, 'bad');
        } else if (v.ph === 'star' && v.ss) {
          ov(`<div class="md-ovb"><div class="md-big">⭐</div><h3>大家丟掉最小的牌</h3>${v.ss.map(s => `<div class="md-lw"><img alt="" src="${api.avatar(P(s.id), 64)}">${esc(P(s.id).name)} <b>${s.v}</b></div>`).join('')}</div>`, 'star');
        } else if (v.ph === 'clear') {
          ov(`<div class="md-ovb"><div class="md-big">${SKIN[Math.min(SKIN.length - 1, v.lv - 1)]}</div><h3>第 ${v.lv} 關過關！</h3>${v.rw ? `<p>獎勵 ${v.rw}！</p>` : ''}<small>下一關每人 ${v.lv + 1} 張</small></div>`, 'ok');
        } else if (v.ph === 'end') {
          ov(`<div class="md-ovb"><div class="md-big">${v.won ? '🔮' : '💔'}</div><h3>${v.won ? '心有靈犀！全部過關' : `停在第 ${v.lv} 關`}</h3>${(v.left || []).filter(l => l.v.length).map(l => `<div class="md-lw"><img alt="" src="${api.avatar(P(l.id), 64)}">${esc(P(l.id).name)} 還有 ${l.v.map(x => `<b>${x}</b>`).join(' ')}</div>`).join('')}</div>`, v.won ? 'ok' : 'bad');
        } else elOv.hidden = true;
        if (v.pn !== lastPn) { if (lastPn >= 0 && v.pn > lastPn) api.sfx('card'); lastPn = v.pn; }
        if (v.ph !== lastPh) { if (v.ph === 'oops') api.vibrate(150); lastPh = v.ph; }
      }
      return { view(v) { if (!v) return; V = v; draw(); }, destroy() { ro.disconnect(); } };
    },

    bot(v, api) {
      const me = api.me; if (!v || !me) return;
      if (v.ph === 'ready' && !v.rd.includes(me) && Math.random() < 0.5) api.send({ rd: 1 });
      if (v.ph === 'play' && v.my && v.my.length) {
        const top = v.top ? v.top.v : 0, gap = (v.my[0] - top) / v.max;
        if (Math.random() < 0.02 + 0.5 * Math.pow(1 - gap, 8)) api.send({ play: 1 });
        else if (v.stars && !v.sv.includes(me) && v.sv.length && Math.random() < 0.3) api.send({ star: 1 });
      }
    }
  });

  const CSS = `
.md{position:absolute;inset:0;display:flex;flex-direction:column;gap:8px;padding:8px 10px calc(10px + env(safe-area-inset-bottom,0px));
  background:radial-gradient(900px 500px at 50% 0,#4b2f8f 0,#2a1c5c 55%,#170f38 100%);color:#fff;font-family:var(--sans);overflow:hidden}
.md-top{display:flex;gap:8px;align-items:center;justify-content:space-between;font-weight:900}
.md-top span{background:rgba(255,255,255,.12);border-radius:999px;padding:4px 10px;font-size:14px;white-space:nowrap}
.md-top i{font-style:normal;opacity:.6;font-size:12px}
.md-seats{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.md-seat{position:relative;display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,.1);border-radius:14px;padding:4px 8px;min-width:60px;border:2px solid transparent}
.md-seat img{width:34px;height:34px}
.md-seat.me{border-color:#c9a8ff}
.md-seat.last{background:rgba(255,215,102,.25)}
.md-seat.off{opacity:.4}
.md-nm{font-size:12px;font-weight:900;max-width:70px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.md-c{font-size:11px;letter-spacing:-2px;color:#e8dcff;white-space:nowrap}
.md-vs{position:absolute;right:-6px;top:-8px;font-size:16px;animation:mdPop .25s}
.md-mid{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.md-pile{display:flex;flex-direction:column;align-items:center;gap:6px}
.md-card{width:110px;aspect-ratio:3/4;border-radius:16px;background:linear-gradient(160deg,#fff,#efe6ff);color:#3b1f86;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.35);border:3px solid #fff}
.md-card b{font-family:var(--round);font-size:54px;line-height:1}
.md-card small{font-size:12px;font-weight:900;color:#7a64b8;max-width:96%;overflow:hidden;white-space:nowrap}
.md-card.empty{background:transparent;border:3px dashed rgba(255,255,255,.35);color:rgba(255,255,255,.75);font-weight:900;font-size:14px;text-align:center;padding:8px;box-shadow:none}
.md-card.new{animation:mdIn .3s cubic-bezier(.2,.9,.3,1.3)}
.md-pn{font-size:13px;font-weight:700;opacity:.85}
.md-msg{font-size:14.5px;font-weight:700;text-align:center;opacity:.95;min-height:1.4em}
.md-msg b{color:#ffd166}
.md-line{padding:14px 16px 18px;background:rgba(255,255,255,.08);border-radius:16px}
.md-ln{position:relative;height:6px;border-radius:9px;background:linear-gradient(90deg,#7ee0ff,#c9a8ff,#ff9ecf)}
.md-tk{position:absolute;top:10px;transform:translateX(-50%);font-style:normal;font-size:11px;opacity:.7;font-weight:700}
.md-dot{position:absolute;top:50%;width:10px;height:10px;border-radius:50%;transform:translate(-50%,-50%);background:#fff}
.md-dot em{position:absolute;left:50%;transform:translateX(-50%);font-style:normal;font-size:10px;font-weight:900;white-space:nowrap}
.md-dot.pl em{bottom:10px;opacity:.75}
.md-dot.pl.top{width:16px;height:16px;background:#ffd166;box-shadow:0 0 0 4px rgba(255,209,102,.35)}
.md-dot.pl.top em{opacity:1;color:#ffd166;font-size:12px}
.md-dot.dr{background:#ff6b81;width:7px;height:7px;opacity:.8}
.md-dot.my{background:#7ee0ff;border:2px solid #fff;width:12px;height:12px}
.md-dot.my em{top:10px;color:#7ee0ff}
.md-dot.my.lo{background:#22c26a;width:16px;height:16px}
.md-hand{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;min-height:60px}
.md-hand .md-card{width:46px;border-radius:10px;border-width:2px;box-shadow:0 3px 8px rgba(0,0,0,.3)}
.md-hand .md-card b{font-size:22px}
.md-hand .md-card.lo{transform:translateY(-6px);background:linear-gradient(160deg,#eafff2,#b7f5cf);color:#0f6b38;box-shadow:0 0 0 3px #22c26a}
.md-none{font-weight:900;opacity:.85;align-self:center}
.md-act{display:grid;grid-template-columns:1fr 1.6fr;gap:10px}
.md-act .btn{min-height:62px;font-size:20px}
.md-play b{font-family:var(--round);font-size:30px;margin-left:6px}
.md-star{background:#2e2366;color:#ffd166;box-shadow:0 5px 0 #120c33;font-size:16px!important;flex-direction:column;gap:0}
.md-star small{font-size:11px;color:#c9b6ff}
.md-star.on{background:#ffd166;color:#3b1f86}
.md-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;z-index:5;background:rgba(10,6,30,.55);animation:mdFade .2s}
.md-ovb{background:#fff;color:#1f2346;border-radius:22px;padding:16px 20px;text-align:center;max-width:360px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.4)}
.md-ov.bad .md-ovb{box-shadow:0 0 0 4px #ff6b81,0 20px 50px rgba(0,0,0,.4)}
.md-ov.ok .md-ovb{box-shadow:0 0 0 4px #22c26a,0 20px 50px rgba(0,0,0,.4)}
.md-big{font-size:60px;line-height:1.1}
.md-ovb h3{margin:6px 0;font-size:20px}.md-ovb h3 b{color:#e5304f;font-family:var(--round);font-size:28px}
.md-lw{display:flex;align-items:center;gap:6px;justify-content:center;font-weight:700;margin:4px 0}.md-lw img{width:30px;height:30px}.md-lw b{font-family:var(--round);font-size:20px;color:#5b5bf7}
.md-ovb small{color:var(--mute);font-weight:700}
.md-wide{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto auto 1fr auto;column-gap:14px}
.md-wide .md-top,.md-wide .md-seats{grid-column:1/-1}
.md-wide .md-mid{grid-column:1;grid-row:3}
.md-wide .md-line{grid-column:1;grid-row:4}
.md-wide .md-hand{grid-column:2;grid-row:3;align-content:center}
.md-wide .md-act{grid-column:2;grid-row:4}
.md-wide.md-pub{grid-template-columns:1fr}
.md-tv .md-card{width:220px}.md-tv .md-card b{font-size:110px}.md-tv .md-seat img{width:70px;height:70px}.md-tv .md-nm{font-size:20px;max-width:150px}.md-tv .md-c{font-size:18px}
.md-tv .md-top span{font-size:24px}.md-tv .md-msg{font-size:26px}.md-tv .md-dot em{font-size:16px}
@media (max-height:460px){.md{gap:4px;padding-top:4px}.md-seat{flex-direction:row;gap:4px;padding:2px 6px}.md-seat img{width:24px;height:24px}.md-card{width:76px}.md-card b{font-size:36px}
  .md-hand .md-card{width:38px}.md-hand .md-card b{font-size:18px}.md-act .btn{min-height:48px}.md-line{padding:10px 14px 14px}.md-msg{display:none}}
@keyframes mdIn{0%{transform:translateY(40px) scale(.6);opacity:0}100%{transform:none;opacity:1}}
@keyframes mdPop{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes mdFade{0%{opacity:0}}
`;
})();
