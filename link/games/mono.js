'use strict';
/* 大富翁小鎮 — a short Monopoly-style board game. Everyone sees the same town board on their own phone, rolls the dice
   from their own phone when it's their turn, buys places and collects tolls. Chance squares give secret cards that only
   their owner sees (再擲一次 / 免過路費 / 交換位置 …), played from the owner's phone. After the chosen number of rounds
   (or when someone goes broke) the richest player (cash + places) wins.
   Messages: {roll:1} · {buy:1|0} · {use:'again'|'swap', to?} */
(() => {
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  // board: [kind, name, emoji, price, group]   kinds: s start · p place · c chance · t tax · r rest
  const BOARD_A = [
    ['s', '起點', '🏁'], ['p', '九份', '🏮', 60, 0], ['c', '機會', '❓'], ['p', '淡水', '🌅', 60, 0], ['p', '墾丁', '🏖️', 100, 1], ['t', '停車費', '🅿️', 50],
    ['p', '日月潭', '🛶', 100, 1], ['p', '阿里山', '🚂', 120, 1], ['r', '休息站', '☕'], ['p', '台南', '🏯', 140, 2], ['c', '機會', '❓'], ['p', '高雄', '🚢', 160, 2],
    ['p', '花蓮', '⛰️', 180, 3], ['p', '綠島', '🐠', 180, 3], ['c', '機會', '❓'], ['p', '太魯閣', '🏞️', 200, 3], ['p', '台中', '🎡', 220, 4], ['t', '繳稅', '💸', 100],
    ['p', '新竹', '🎐', 240, 4], ['p', '台北101', '🏙️', 300, 4]
  ];
  const BOARD_K = [
    ['s', '起點', '🏁'], ['p', '冰淇淋店', '🍦', 40, 0], ['c', '驚喜', '🎁'], ['p', '甜甜圈店', '🍩', 40, 0], ['p', '氣球店', '🎈', 60, 1], ['r', '公園', '🛝'],
    ['p', '披薩店', '🍕', 60, 1], ['p', '玩具店', '🧸', 80, 1], ['c', '驚喜', '🎁'], ['p', '旋轉木馬', '🎠', 80, 2], ['p', '糖果屋', '🍭', 100, 2], ['r', '大樹下', '🌳'],
    ['p', '小火車', '🚂', 100, 3], ['c', '驚喜', '🎁'], ['p', '城堡', '🏰', 120, 3], ['p', '獨角獸樂園', '🦄', 150, 3]
  ];
  const GCOL = ['#ff8fab', '#ffb347', '#7bd389', '#6fb7ff', '#b98bff'];
  const CARD = { again: ['🚀', '再擲一次', '這回合走完可以再擲一次'], shield: ['🛡️', '免過路費', '下次要付過路費時自動用掉'], swap: ['🔀', '交換位置', '擲骰前和一位玩家交換位置'] };
  const LV_MULT = [1, 3, 6];

  // perimeter cell index → [row, col] on an S×S grid, start at bottom-right, going left along the bottom
  function cellRC(i, S) {
    const L = S - 1;
    if (i < L) return [L, L - i];
    if (i < 2 * L) return [L - (i - L), 0];
    if (i < 3 * L) return [0, i - 2 * L];
    return [i - 3 * L, L];
  }

  LGAMES.push({
    id: 'mono', name: '大富翁小鎮', icon: '🎲', col: '#f59e0b', cat: 'table',
    blurb: '擲骰子逛小鎮、買地收過路費，祕密機會卡只有自己看得到', players: [2, 6],
    opts: kid => [
      { k: 'r', n: '回合數', o: kid ? [[6, '6 輪'], [10, '10 輪'], [14, '14 輪']] : [[8, '8 輪'], [12, '12 輪'], [16, '16 輪']], d: kid ? 8 : 12 },
      { k: 'cash', n: '起始金錢', o: kid ? [[300, '$300'], [500, '$500']] : [[800, '$800'], [1200, '$1200']], d: kid ? 500 : 1200 }
    ],
    rules: kid => kid ? [
      '🎲 輪到你就在手機上按「擲骰子」',
      '🏠 走到沒人買的店，可以買下來',
      '💰 別人走到你的店，要付你過路費！',
      '🎁 驚喜格會拿到祕密卡片或零用錢，卡片只有你看得到',
      '🏆 回合結束時，錢加上店的價錢最多的人贏'
    ] : [
      '輪到你時擲兩顆骰子；經過起點領 $150',
      '空地可以買；再走到自己的地可以加蓋（最多 2 次，過路費 ×3、×6）',
      '同一顏色的地全部買下，過路費加倍',
      '機會格：立即事件或祕密卡（🚀 再擲一次、🛡️ 免過路費、🔀 交換位置），卡只有你看得到',
      '錢不夠會自動半價賣地；賣完還不夠就破產。回合結束時總資產（現金＋地價＋加蓋）最高的人贏'
    ],

    host(ctx) {
      const kid = ctx.kid, O = ctx.opt || {}, ids = ctx.players.map(p => p.id), N = ids.length, now = () => ctx.now();
      const B = kid ? BOARD_K : BOARD_A, NB = B.length, RMAX = O.r || (kid ? 8 : 12), PASS = kid ? 50 : 150;
      const ROLL_T = kid ? 25 : 18, BUY_T = kid ? 20 : 15;
      const own = B.map(() => null), lv = B.map(() => 0);
      const cash = {}, pos = {}, cards = {}, broke = {}, earned = {};
      ids.forEach(id => { cash[id] = O.cash || (kid ? 500 : 1200); pos[id] = 0; cards[id] = []; broke[id] = false; earned[id] = 0; });
      const order = shuffle(ids.slice());
      let ti = 0, rnd = 1, ph = 'roll', T = now() + ROLL_T + 1, dice = [0, 0], again = false, steps = 0, offer = null, over = false, log = [], seq = 0, ev = null, endWhy = '';
      const cur = () => order[ti];
      const nm = id => { const p = ctx.players.find(q => q.id === id); return p ? p.name : '?'; };
      const push = () => ctx.push();
      const say = (t, k) => { log.push({ t, k: k || '', n: ++seq }); if (log.length > 6) log.shift(); };
      const placeVal = i => B[i][3] + (kid ? 0 : Math.round(B[i][3] / 2) * lv[i]);
      const worth = id => cash[id] + B.reduce((a, b, i) => a + (own[i] === id ? placeVal(i) : 0), 0);
      const groupAll = (g, id) => B.every((b, i) => b[0] !== 'p' || b[4] !== g || own[i] === id);
      const rent = i => { const b = B[i]; let r = kid ? Math.round(b[3] / 2) : Math.round(b[3] / 5) * LV_MULT[lv[i]]; if (groupAll(b[4], own[i])) r *= 2; return r; };

      function pay(from, amt, to) {
        cash[from] -= amt; if (to) { cash[to] += amt; earned[to] += amt; }
        if (cash[from] >= 0) return;
        // sell places at half price, cheapest first
        const mine = B.map((b, i) => i).filter(i => own[i] === from).sort((a, b) => placeVal(a) - placeVal(b));
        for (const i of mine) { if (cash[from] >= 0) break; const v = Math.round(placeVal(i) / 2); cash[from] += v; own[i] = null; lv[i] = 0; say(`${nm(from)} 賣掉了 ${B[i][1]}（+$${v}）`, 'bad'); }
        if (cash[from] < 0) { broke[from] = true; cash[from] = 0; say(`${nm(from)} 破產了 😵`, 'bad'); ctx.sound('*', 'boom'); }
      }
      function nextTurn() {
        if (again && !broke[cur()]) { again = false; ph = 'roll'; T = now() + ROLL_T; say(`🚀 ${nm(cur())} 再擲一次！`); push(); return; }
        again = false;
        const alive = order.filter(id => !broke[id]);
        if (alive.length <= 1) return finish('broke');
        do {
          ti++;
          if (ti >= N) { ti = 0; rnd++; if (rnd > RMAX) return finish('rounds'); }
        } while (broke[cur()]);
        ph = 'roll'; T = now() + ROLL_T; ctx.sound(cur(), 'turn'); push();
      }
      function finish(w) { endWhy = w; ph = 'end'; T = now() + 3.5; ctx.sound('*', 'win'); push(); }
      function roll() {
        const id = cur();
        dice = kid ? [1 + rint(6), 0] : [1 + rint(6), 1 + rint(6)];
        steps = dice[0] + dice[1]; ph = 'move'; T = now() + 0.7;
        ctx.sound('*', 'deal'); push();
      }
      function land() {
        const id = cur(), i = pos[id], b = B[i];
        if (b[0] === 'p') {
          if (own[i] == null) {
            if (cash[id] >= b[3]) { offer = { i, price: b[3], up: false }; ph = 'buy'; T = now() + BUY_T; push(); return; }
            say(`${nm(id)} 想買 ${b[1]}，可是錢不夠`);
          } else if (own[i] === id) {
            if (!kid && lv[i] < 2 && cash[id] >= Math.round(b[3] / 2)) { offer = { i, price: Math.round(b[3] / 2), up: true }; ph = 'buy'; T = now() + BUY_T; push(); return; }
            say(`${nm(id)} 回到自己的 ${b[1]} ${b[2]}`);
          } else if (!broke[own[i]]) {
            const r = rent(i), sh = cards[id].indexOf('shield');
            if (sh >= 0) { cards[id].splice(sh, 1); say(`🛡️ ${nm(id)} 用了免過路費，不用付 ${nm(own[i])} $${r}`, 'good'); ctx.sound(id, 'star'); }
            else { pay(id, r, own[i]); say(`${nm(id)} 付給 ${nm(own[i])} 過路費 $${r}`, 'bad'); ctx.sound(own[i], 'coin'); ctx.sound(id, 'wrong'); }
          }
        } else if (b[0] === 'c') { if (chance(id)) return; }
        else if (b[0] === 't') { pay(id, b[3]); say(`${nm(id)} ${b[1]} −$${b[3]}`, 'bad'); ctx.sound(id, 'wrong'); }
        else if (b[0] === 'r') say(`${nm(id)} 在${b[1]}休息一下 ${b[2]}`);
        ph = 'show'; T = now() + 1.6; push();
      }
      function chance(id) {
        const k = Math.random();
        const deck = kid
          ? [['card', 'again'], ['card', 'shield'], ['cash', 30], ['cash', 50], ['cash', -20], ['start']]
          : [['card', 'again'], ['card', 'shield'], ['card', 'swap'], ['cash', 100], ['cash', -80], ['all', 30], ['back', 3], ['start']];
        const c = deck[Math.floor(k * deck.length)];
        if (c[0] === 'card') {
          if (cards[id].length >= 3) { cash[id] += 50; say(`${B[pos[id]][2]} ${nm(id)} 卡片滿了，改拿 $50`, 'good'); ev = { id, t: '$50' }; }
          else { cards[id].push(c[1]); say(`${B[pos[id]][2]} ${nm(id)} 拿到一張祕密卡 🤫`, 'good'); ctx.toast(id, `拿到 ${CARD[c[1]][0]} ${CARD[c[1]][1]}！`); ev = { id, t: '🤫 祕密卡' }; }
          ctx.sound(id, 'star');
        } else if (c[0] === 'cash') {
          if (c[1] > 0) { cash[id] += c[1]; say(`${B[pos[id]][2]} ${nm(id)} ${kid ? '撿到零用錢' : '中了發票'} +$${c[1]}`, 'good'); ctx.sound(id, 'coin'); }
          else { pay(id, -c[1]); say(`${B[pos[id]][2]} ${nm(id)} ${kid ? '冰淇淋掉了，再買一支' : '收到罰單'} −$${-c[1]}`, 'bad'); ctx.sound(id, 'wrong'); }
          ev = { id, t: (c[1] > 0 ? '+$' : '−$') + Math.abs(c[1]) };
        } else if (c[0] === 'all') {
          ids.forEach(o => { if (o !== id && !broke[o]) pay(o, c[1], id); });
          say(`🎂 ${nm(id)} 生日！每人送 $${c[1]}`, 'good'); ctx.sound('*', 'coin'); ev = { id, t: '🎂' };
        } else if (c[0] === 'back') {
          pos[id] = (pos[id] - c[1] + NB) % NB; say(`⬅️ ${nm(id)} 後退 ${c[1]} 格`); ev = { id, t: '⬅️3' };
          if (B[pos[id]][0] !== 'c') { land(); return true; }
        } else if (c[0] === 'start') {
          pos[id] = 0; cash[id] += PASS; say(`🏁 ${nm(id)} 直接回到起點 +$${PASS}`, 'good'); ctx.sound(id, 'coin'); ev = { id, t: '🏁' };
        }
      }

      return {
        get over() { return over; },
        tick() {
          const t = now(), id = cur();
          if (ph === 'end') { if (t >= T) over = true; return; }
          if (ph === 'roll') { if (t >= T || (!ctx.online(id) && t >= T - ROLL_T + 2.5)) roll(); }
          else if (ph === 'move') {
            if (t >= T) {
              if (steps > 0) {
                pos[id] = (pos[id] + 1) % NB; steps--;
                if (pos[id] === 0) { cash[id] += PASS; say(`🏁 ${nm(id)} 經過起點 +$${PASS}`, 'good'); ctx.sound(id, 'coin'); }
                ctx.sound('*', 'tick'); T = t + 0.22; push();
              } else { ev = null; land(); }
            }
          } else if (ph === 'buy') { if (t >= T || !ctx.online(id)) { this.msg(id, { buy: kid && ctx.online(id) ? 1 : 0 }); } }
          else if (ph === 'show') { if (t >= T) nextTurn(); }
        },
        msg(id, d) {
          if (!d || !ids.includes(id) || id !== cur()) return;
          if (d.roll && ph === 'roll') { roll(); return; }
          if (d.buy != null && ph === 'buy' && offer) {
            const o = offer, b = B[o.i]; offer = null;
            if (d.buy && cash[id] >= o.price) {
              cash[id] -= o.price;
              if (o.up) { lv[o.i]++; say(`🏗️ ${nm(id)} 在 ${b[1]} 加蓋（−$${o.price}）`, 'good'); }
              else { own[o.i] = id; say(`🏠 ${nm(id)} 買下 ${b[1]} ${b[2]}（−$${o.price}）`, 'good'); }
              ctx.sound('*', 'coin');
            } else say(`${nm(id)} 沒有買 ${b[1]}`);
            ph = 'show'; T = now() + 1.2; push(); return;
          }
          if (d.use && ph === 'roll') {
            const k = cards[id].indexOf(d.use); if (k < 0) return;
            if (d.use === 'again') { cards[id].splice(k, 1); again = true; say(`🚀 ${nm(id)} 用了再擲一次！`, 'good'); ctx.sound('*', 'star'); push(); return; }
            if (d.use === 'swap' && ids.includes(d.to) && d.to !== id && !broke[d.to]) {
              cards[id].splice(k, 1); const p = pos[id]; pos[id] = pos[d.to]; pos[d.to] = p;
              say(`🔀 ${nm(id)} 和 ${nm(d.to)} 交換位置！`, 'good'); ctx.sound('*', 'whoosh'); push(); return;
            }
          }
        },
        leave() { push(); }, back() { push(); },
        view(id) {
          const me = id && ids.includes(id) ? id : null;
          const v = {
            ph, cur: cur(), order, rnd, rmax: RMAX, dice, pos, cash, own, lv, log, ag: again, br: Object.keys(broke).filter(x => broke[x]),
            cn: {}, tl: Math.max(0, Math.round((T - now()) * 10) / 10), kid, ev
          };
          ids.forEach(x => v.cn[x] = cards[x].length);
          if (ph === 'buy' && offer) v.offer = offer;
          if (me) v.my = cards[me];
          if (ph === 'end') { v.worth = {}; ids.forEach(x => v.worth[x] = worth(x)); }
          return v;
        },
        results() {
          const rows = ids.map(id => ({ id, key: broke[id] ? -1 : worth(id), line: broke[id] ? '破產 😵' : `總資產 $${worth(id)} · 現金 $${cash[id]} · ${own.filter(o => o === id).length} 塊地 · 收過路費 $${earned[id]}` }));
          return { rows, sub: endWhy === 'broke' ? '只剩一位沒有破產！' : `${RMAX} 輪結束，比總資產` };
        }
      };
    },

    client(root, api) {
      if (!document.getElementById('mn-style')) { const st = document.createElement('style'); st.id = 'mn-style'; st.textContent = CSS; document.head.appendChild(st); }
      const kid = api.kid, me = api.me, tv = api.isTable;
      const B = kid ? BOARD_K : BOARD_A, NB = B.length, S = NB / 4 + 1;
      root.innerHTML = `<div class="mn ${kid ? 'mn-kid' : ''} ${tv ? 'mn-tv' : ''} ${me ? '' : 'mn-pub'}">
        <div class="mn-top"><span class="mn-rd"></span><span class="mn-turn"></span><span class="mn-tm"></span></div>
        <div class="mn-main"><div class="mn-bw"><div class="mn-board" style="--S:${S}"></div></div>
        <div class="mn-side"><div class="mn-pls"></div>${me ? '<div class="mn-act"></div><div class="mn-cards"></div>' : ''}</div></div>
      </div>`;
      const Q = s => root.querySelector(s);
      const wrap = Q('.mn'), elRd = Q('.mn-rd'), elTurn = Q('.mn-turn'), elTm = Q('.mn-tm'), elBoard = Q('.mn-board'), bw = Q('.mn-bw'), elPls = Q('.mn-pls'), elAct = Q('.mn-act'), elCards = Q('.mn-cards');
      const P = id => api.player(id) || { name: '?', col: 0, animal: 0 };
      const set = (el, key, html) => { if (!el || el._k === key) return false; el._k = key; el.innerHTML = html; return true; };
      let V = null, tEnd = 0, raf = 0, swapPick = false, lastCash = null, lastPh = '';
      // static cells + center
      elBoard.innerHTML = B.map((b, i) => {
        const [r, c] = cellRC(i, S);
        return `<div class="mn-c k-${b[0]}" data-i="${i}" style="grid-row:${r + 1};grid-column:${c + 1};${b[0] === 'p' ? `--g:${GCOL[b[4]]}` : ''}"><span class="mn-ce">${b[2]}</span><span class="mn-cn">${esc(b[1])}</span>${b[0] === 'p' ? `<span class="mn-cp">$${b[3]}</span>` : ''}<span class="mn-own"></span><span class="mn-tok"></span></div>`;
      }).join('') + `<div class="mn-ctr" style="grid-row:2/${S};grid-column:2/${S}"><div class="mn-dice"></div><div class="mn-log"></div></div>`;
      const cells = [...elBoard.querySelectorAll('.mn-c')], elDice = Q('.mn-dice'), elLog = Q('.mn-log');
      const fit = () => {
        const w = bw.clientWidth, h = bw.clientHeight; if (!w || !h) return;
        const s = Math.floor(Math.min(w, h)); elBoard.style.width = elBoard.style.height = s + 'px';
        elBoard.style.setProperty('--cs', (s / S) + 'px');
      };
      const ro = new ResizeObserver(() => { wrap.classList.toggle('mn-wide', root.clientWidth > root.clientHeight * 1.1); fit(); });
      ro.observe(root); ro.observe(bw);
      function loop() { raf = requestAnimationFrame(loop); if (!V) return; const left = Math.max(0, tEnd - performance.now() / 1000); elTm.textContent = (V.ph === 'roll' || V.ph === 'buy') ? Math.ceil(left) + ' 秒' : ''; }
      raf = requestAnimationFrame(loop);
      const DF = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

      function draw() {
        const v = V; tEnd = performance.now() / 1000 + v.tl;
        elRd.textContent = v.ph === 'end' ? '結束' : `第 ${v.rnd}/${v.rmax} 輪`;
        elTurn.innerHTML = v.ph === 'end' ? '🏁 遊戲結束' : `<img alt="" src="${api.avatar(P(v.cur), 48)}">${v.cur === me ? '輪到你！' : esc(P(v.cur).name) + ' 的回合'}`;
        // board ownership + tokens
        cells.forEach((el, i) => {
          const o = v.own[i], ow = el.querySelector('.mn-own'), tk = el.querySelector('.mn-tok');
          const oh = o ? `<img alt="" src="${api.avatar(P(o), 40)}">${'🏠'.repeat(v.lv[i])}` : '';
          if (ow._h !== oh) { ow._h = oh; ow.innerHTML = oh; el.classList.toggle('owned', !!o); el.style.setProperty('--oc', o ? api.color(P(o)).c : 'transparent'); }
          const here = v.order.filter(id => v.pos[id] === i && !v.br.includes(id));
          const th = here.map(id => `<img class="${id === v.cur ? 'cur' : ''}" alt="" src="${api.avatar(P(id), 48)}">`).join('');
          if (tk._h !== th) { tk._h = th; tk.innerHTML = th; }
          el.classList.toggle('hl', v.offer && v.offer.i === i);
        });
        set(elDice, JSON.stringify([v.dice, v.ph === 'move']), v.dice[0] ? `<span class="${v.ph === 'move' ? 'roll' : ''}">${DF[v.dice[0]]}</span>${v.dice[1] ? `<span class="${v.ph === 'move' ? 'roll' : ''}">${DF[v.dice[1]]}</span>` : ''}<b>${v.dice[0] + v.dice[1]}</b>` : '<span>🎲</span>');
        set(elLog, JSON.stringify(v.log), v.log.slice(-4).map((l, i, a) => `<div class="mn-l ${l.k} ${i === a.length - 1 ? 'new' : ''}">${esc(l.t)}</div>`).join(''));
        // players
        set(elPls, JSON.stringify([v.cash, v.cur, v.cn, v.br, v.worth, api.players().map(p => p.online)]), v.order.map(id => {
          const p = P(id), np = v.own.filter(o => o === id).length;
          return `<div class="mn-p ${id === v.cur ? 'cur' : ''} ${id === me ? 'me' : ''} ${v.br.includes(id) ? 'broke' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${api.color(p).c}"><img alt="" src="${api.avatar(p, 64)}"><span class="mn-pn">${esc(p.name)}</span><span class="mn-pm">$${v.cash[id]}</span><span class="mn-px">🏠${np}${v.cn[id] ? ` 🃏${v.cn[id]}` : ''}</span>${v.worth ? `<span class="mn-pw">總 $${v.worth[id]}</span>` : ''}</div>`;
        }).join(''));
        // my actions
        if (elAct) {
          const my = v.cur === me;
          let h = '', key = v.ph + my + JSON.stringify(v.offer) + v.ag + swapPick + JSON.stringify(v.my);
          if (my && v.ph === 'roll') {
            if (swapPick) h = `<div class="mn-q">要和誰交換位置？</div><div class="mn-sw">${v.order.filter(x => x !== me && !v.br.includes(x)).map(x => `<button class="btn ghost small" data-to="${x}"><img alt="" src="${api.avatar(P(x), 40)}">${esc(P(x).name)}</button>`).join('')}<button class="btn ghost small" data-cx>取消</button></div>`;
            else h = `<button class="btn acc wide mn-roll" data-roll>🎲 擲骰子${v.ag ? '（還會再擲一次）' : ''}</button>`;
          } else if (my && v.ph === 'buy' && v.offer) {
            const b = B[v.offer.i];
            h = `<div class="mn-q">${v.offer.up ? `要在 ${b[2]} ${esc(b[1])} 加蓋嗎？` : `要買 ${b[2]} ${esc(b[1])} 嗎？`}<small>${v.offer.up ? '過路費會變更多' : kid ? '別人走到這裡要付你錢' : `過路費 $${Math.round(b[3] / 5)} 起`}</small></div><div class="row" style="flex-wrap:nowrap"><button class="btn acc" data-buy="1" style="flex:1">${v.offer.up ? '加蓋' : '買下'} $${v.offer.price}</button><button class="btn ghost" data-buy="0">不要</button></div>`;
          } else if (v.ph === 'end') h = '';
          else h = `<div class="mn-wait">${my ? '…' : `等 ${esc(P(v.cur).name)}…`}</div>`;
          if (set(elAct, key, h)) {
            elAct.querySelectorAll('[data-roll]').forEach(b => b.onclick = () => { api.send({ roll: 1 }); api.sfx('deal'); api.vibrate(30); });
            elAct.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { api.send({ buy: +b.dataset.buy }); api.sfx('pop'); });
            elAct.querySelectorAll('[data-to]').forEach(b => b.onclick = () => { api.send({ use: 'swap', to: b.dataset.to }); swapPick = false; api.sfx('whoosh'); });
            elAct.querySelectorAll('[data-cx]').forEach(b => b.onclick = () => { swapPick = false; draw(); });
          }
          const canUse = my && v.ph === 'roll';
          set(elCards, JSON.stringify([v.my, canUse, v.ag]), v.my && v.my.length ? `<div class="mn-ch">🤫 我的祕密卡</div><div class="mn-cl">${v.my.map(k => `<button class="mn-card" data-use="${k}" ${canUse && k !== 'shield' && !(k === 'again' && v.ag) ? '' : 'disabled'}><span>${CARD[k][0]}</span><b>${CARD[k][1]}</b><small>${CARD[k][2]}</small></button>`).join('')}</div>` : `<div class="mn-ch">${kid ? '走到 🎁 會拿到祕密卡' : '走到 ❓ 機會格可能拿到祕密卡'}</div>`);
          elCards.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { if (b.dataset.use === 'swap') { swapPick = true; draw(); return; } api.send({ use: b.dataset.use }); api.sfx('star'); });
          if (v.ph === 'roll' && my && lastPh !== 'roll') api.vibrate(40);
          if (lastCash != null && v.cash[me] > lastCash) api.sfx('coin');
          lastCash = v.cash[me];
        }
        lastPh = v.ph + v.cur;
      }
      return { view(v) { if (!v) return; V = v; if (v.ph !== 'roll') swapPick = false; draw(); }, destroy() { cancelAnimationFrame(raf); ro.disconnect(); } };
    },

    bot(v, api) {
      const me = api.me; if (!v || !me || v.cur !== me) return;
      if (v.ph === 'roll' && Math.random() < 0.5) {
        if (v.my && v.my.includes('again') && !v.ag && Math.random() < 0.3) { api.send({ use: 'again' }); return; }
        if (v.my && v.my.includes('swap') && Math.random() < 0.3) { const o = v.order.filter(x => x !== me && !v.br.includes(x)); if (o.length) { api.send({ use: 'swap', to: o[rint(o.length)] }); return; } }
        api.send({ roll: 1 });
      }
      if (v.ph === 'buy' && Math.random() < 0.5) api.send({ buy: Math.random() < 0.75 ? 1 : 0 });
    }
  });

  const CSS = `
.mn{position:absolute;inset:0;display:flex;flex-direction:column;gap:6px;padding:8px 8px calc(8px + env(safe-area-inset-bottom,0px));background:linear-gradient(180deg,#fff6e3,#ffe9d2);font-family:var(--sans);overflow:hidden}
.mn-top{display:flex;gap:6px;align-items:center}
.mn-top span{background:#fff;border-radius:999px;padding:4px 10px;font-weight:900;font-size:13.5px;box-shadow:0 2px 0 #f0d4b0;white-space:nowrap;display:flex;align-items:center;gap:4px}
.mn-turn{flex:1;min-width:0;justify-content:center;overflow:hidden}
.mn-turn img{width:24px;height:24px}
.mn-tm:empty{display:none}
.mn-main{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px}
.mn-bw{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center}
.mn-board{display:grid;grid-template-columns:repeat(var(--S),1fr);grid-template-rows:repeat(var(--S),1fr);gap:2px;background:#a8763e;border-radius:14px;padding:3px;box-shadow:0 6px 0 #7a5228;--cs:60px}
.mn-c{position:relative;background:#fffaf0;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border-top:calc(var(--cs)*.09) solid var(--g,transparent);min-width:0;min-height:0}
.mn-c.k-s{background:#dcfce7}.mn-c.k-c{background:#fef3c7}.mn-c.k-t{background:#fee2e2}.mn-c.k-r{background:#e0f2fe}
.mn-c.owned{box-shadow:inset 0 0 0 3px var(--oc)}
.mn-c.hl{animation:mnHl .6s infinite alternate}
.mn-ce{font-size:calc(var(--cs)*.34);line-height:1}
.mn-cn{font-size:calc(var(--cs)*.155);font-weight:900;line-height:1.1;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:clip}
.mn-cp{font-size:calc(var(--cs)*.14);color:#8a6a40;font-weight:700;line-height:1}
.mn-own{position:absolute;right:1px;top:1px;display:flex;align-items:center;font-size:calc(var(--cs)*.14)}
.mn-own img{width:calc(var(--cs)*.28);height:calc(var(--cs)*.28)}
.mn-tok{position:absolute;inset:auto 0 0 0;display:flex;justify-content:center;flex-wrap:wrap}
.mn-tok img{width:calc(var(--cs)*.42);height:calc(var(--cs)*.42);margin:0 calc(var(--cs)*-.08);filter:drop-shadow(0 2px 1px rgba(0,0,0,.35));transition:transform .2s}
.mn-tok img.cur{transform:translateY(-14%) scale(1.15);z-index:2}
.mn-ctr{background:#fff3df;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px;min-height:0;overflow:hidden}
.mn-dice{display:flex;gap:6px;align-items:center;font-size:calc(var(--cs)*.75);line-height:1}
.mn-dice b{font-family:var(--round);font-size:calc(var(--cs)*.42);color:#c2410c;margin-left:4px}
.mn-dice .roll{animation:mnRoll .35s}
.mn-log{display:flex;flex-direction:column;gap:2px;width:100%;align-items:center}
.mn-l{font-size:calc(var(--cs)*.2);font-weight:700;color:#6b4f2a;text-align:center;line-height:1.25;opacity:.7}
.mn-l.new{opacity:1;font-weight:900;color:#1f2346}
.mn-l.good.new{color:#12924f}.mn-l.bad.new{color:#dc2626}
.mn-side{display:flex;flex-direction:column;gap:6px;flex:none}
.mn-pls{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
.mn-p{display:grid;grid-template-columns:auto auto;grid-template-rows:auto auto;column-gap:4px;align-items:center;background:#fff;border-radius:12px;padding:3px 8px 3px 3px;box-shadow:0 2px 0 #f0d4b0;border:2px solid transparent;font-size:12px}
.mn-p img{width:30px;height:30px;grid-row:1/3}
.mn-p.cur{border-color:var(--pc)}.mn-p.me .mn-pn{color:var(--pri)}
.mn-p.broke{opacity:.4;filter:grayscale(1)}.mn-p.off{opacity:.5}
.mn-pn{font-weight:900;max-width:60px;overflow:hidden;white-space:nowrap}
.mn-pm{font-family:var(--round);font-weight:700;color:#c2410c;font-size:14px}
.mn-px{font-size:11px;color:var(--mute);grid-column:2}
.mn-pw{grid-column:1/-1;font-weight:900;color:#12924f;font-size:12px;text-align:center}
.mn-act{min-height:52px;display:flex;flex-direction:column;gap:6px;justify-content:center}
.mn-roll{font-size:22px;min-height:58px}
.mn-q{font-weight:900;font-size:17px;text-align:center;display:flex;flex-direction:column}.mn-q small{font-size:12px;color:var(--mute)}
.mn-sw{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}.mn-sw img{width:24px;height:24px}
.mn-wait{text-align:center;color:var(--mute);font-weight:700}
.mn-ch{font-size:12px;font-weight:900;color:var(--mute);text-align:center}
.mn-cl{display:flex;gap:6px;justify-content:center}
.mn-card{background:linear-gradient(160deg,#fff,#fff1d6);border:2px solid #f5b400;border-radius:12px;padding:5px 6px;display:flex;flex-direction:column;align-items:center;width:96px;box-shadow:0 3px 0 #d39a00}
.mn-card span{font-size:24px;line-height:1}.mn-card b{font-size:13px}.mn-card small{font-size:10px;color:var(--mute);line-height:1.2}
.mn-card:disabled{opacity:.6;box-shadow:none}
.mn-wide .mn-main{flex-direction:row}
.mn-wide .mn-side{width:min(42%,340px);justify-content:center}
.mn-tv .mn-p{font-size:18px}.mn-tv .mn-p img{width:52px;height:52px}.mn-tv .mn-pm{font-size:22px}.mn-tv .mn-top span{font-size:20px}
@media (max-height:460px){.mn{gap:4px;padding-top:4px}.mn-p img{width:24px;height:24px}.mn-roll{min-height:46px;font-size:18px}.mn-card{width:84px;padding:3px}.mn-card small{display:none}.mn-act{min-height:0}}
@keyframes mnHl{to{box-shadow:inset 0 0 0 4px #f59e0b,0 0 12px #f59e0b}}
@keyframes mnRoll{0%{transform:rotate(-200deg) scale(.4)}100%{transform:none}}
`;
})();
