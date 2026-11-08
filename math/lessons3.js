// 123 小島 第 6 段（65–83）：進位退位、直式、九九 6–9、除法、有餘數、二位數乘一位數、應用題、找錢
// 用 index.html 的共用元件（simpleAsk、choose、blocksHTML、eqHTML、opts3…）
'use strict';

// 選項：答案、常見錯誤、差一點的數
function trickOpts(r, wrong, lo = 0, hi = 100) {
  const set = new Set([r]);
  for (const w of [wrong, r + (Math.random() < .5 ? 1 : -1), r + 10, r - 10, r + 2, r - 1]) {
    if (set.size >= 3) break;
    if (w != null && w >= lo && w <= hi && !set.has(w)) set.add(w);
  }
  return [...set].sort((a, b) => a - b).map(v => numBtn(v)).join('');
}
const tensOf = n => Math.floor(n / 10), onesOf = n => n % 10;

/* ---------- 65–70：用積木做進位、退位 ---------- */
function regroupEq(id, list) {
  return {
    plan: mkPlan(id, list, q => `${q.a}${q.op}${q.b}`), key: q => `${q.a}${q.op}${q.b}`,
    ask(q, c) {
      const { a, b, op } = q, r = op === '+' ? a + b : a - b, my = c.my;
      // 常見錯誤：加法忘了進位（少 10）；減法個位「大減小」
      const wrong = op === '+' ? (onesOf(a) + onesOf(b) >= 10 ? r - 10 : null)
        : (onesOf(a) < onesOf(b) ? (tensOf(a) - tensOf(b)) * 10 + (onesOf(b) - onesOf(a)) : null);
      const pics = () => `<div class="pe rg">${blocksHTML(a, 'A')}${op === '+' ? `<i class="op">+</i>${blocksHTML(b, 'B')}` : ''}</div>`;
      return simpleAsk(q, c, {
        main: `<div class="card story">${eqHTML(a, op, b)}<div class="rghost">${pics()}</div></div>`,
        opts: trickOpts(r, wrong), r, side: false, ask: [P.eqQ(a, op, b)], ans: P.eqA(a, op, b, r),
        demo: async qa => {
          const A = qa.querySelector('.blocks.A'), onesA = A.querySelector('.ones');
          const cube = () => { const s = document.createElement('span'); s.className = 'cube'; s.innerHTML = '<span class="bd"></span>'; return s; };
          const rod = () => { const s = document.createElement('span'); s.className = 'rod pop'; s.innerHTML = '<i></i><span class="bd"></span>'; return s; };
          if (op === '+') {
            const B = qa.querySelector('.blocks.B');
            await say(P.addOnesL);
            for (const cb of [...B.querySelectorAll('.cube')]) { onesA.appendChild(cb); cb.classList.add('pop'); await W(my, sleep(160)); }
            if (onesA.querySelectorAll('.cube').length >= 10) {
              await say(P.trade);
              const ten = [...onesA.querySelectorAll('.cube')].slice(0, 10);
              ten.forEach(x => x.classList.add('bundle')); await W(my, sleep(500));
              ten.forEach(x => x.remove()); A.insertBefore(rod(), onesA); await W(my, sleep(300));
            }
            if (B.querySelector('.rod')) { await say(P.addTensL); for (const rd of [...B.querySelectorAll('.rod')]) { A.insertBefore(rd, onesA); rd.classList.add('pop'); await W(my, sleep(200)); } }
            B.remove(); qa.querySelector('.pe .op')?.remove();
          } else {
            await say(P.takeOnesL);
            if (onesA.querySelectorAll('.cube').length < onesOf(b)) {
              await say(P.breakTen);
              const rods = A.querySelectorAll('.rod'), last = rods[rods.length - 1];
              last.classList.add('bundle'); await W(my, sleep(400)); last.remove();
              for (let i = 0; i < 10; i++) { const x = cube(); x.classList.add('pop'); onesA.prepend(x); }
              await W(my, sleep(400));
            }
            for (const cb of [...onesA.querySelectorAll('.cube')].slice(-onesOf(b)).reverse()) { if (onesOf(b) === 0) break; cb.classList.add('gone'); await W(my, sleep(180)); }
            if (tensOf(b)) { await say(P.takeTensL); for (const rd of [...A.querySelectorAll('.rod:not(.gone)')].slice(-tensOf(b)).reverse()) { rd.classList.add('gone'); await W(my, sleep(220)); } }
          }
          await countBlocks(my, A);
        },
        undo: qa => { qa.querySelector('.rghost').innerHTML = pics(); },
      });
    },
  };
}
GEN[65] = regroupEq(65, LISTS.carry1);
GEN[66] = regroupEq(66, LISTS.borrow1);
GEN[67] = regroupEq(67, LISTS.add2);
GEN[68] = regroupEq(68, LISTS.add2c);
GEN[69] = regroupEq(69, LISTS.sub2);
GEN[70] = regroupEq(70, LISTS.sub2b);

/* ---------- 71、72：直式（數字鍵盤，先寫個位再寫十位） ---------- */
const keypadHTML = () => `<div class="kpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<button class="key" data-d="${d}">${d}</button>`).join('')}</div>`;
function vertical(id, list) {
  return {
    plan: mkPlan(id, list, q => `${q.a}${q.op}${q.b}`), key: q => `${q.a}${q.op}${q.b}`,
    async ask(q, c) {
      const { a, b, op } = q, my = c.my, add = op === '+';
      const o1 = onesOf(a), o2 = onesOf(b), t1 = tensOf(a), t2 = tensOf(b);
      const carry = add && o1 + o2 >= 10, borrow = !add && o1 < o2;
      const onesD = add ? (o1 + o2) % 10 : o1 + (borrow ? 10 : 0) - o2;
      const tensD = add ? t1 + t2 + (carry ? 1 : 0) : t1 - (borrow ? 1 : 0) - t2;
      const onesLine = add ? (o1 + o2 > 10 && o1 < o2 ? P.eqA(o2, '+', o1, o1 + o2) : P.eqA(o1, '+', o2, o1 + o2)) : P.eqA(o1 + (borrow ? 10 : 0), '-', o2, onesD);
      const tensLine = add ? P.eqA(t1, '+', t2, t1 + t2) : P.eqA(t1 - (borrow ? 1 : 0), '-', t2, tensD);
      const qa = frame({
        main: `<div class="card vert">
          <div class="vrow mark"><span class="vc"><b class="cm"></b></span><span class="vc"><b class="bm"></b></span></div>
          <div class="vrow"><span class="vop"></span><span class="vc ta">${t1}</span><span class="vc">${o1}</span></div>
          <div class="vrow"><span class="vop">${OPS[op]}</span><span class="vc">${t2}</span><span class="vc">${o2}</span></div>
          <div class="vline"></div>
          <div class="vrow"><span class="vop"></span><span class="vc box" data-s="1"></span><span class="vc box" data-s="0"></span></div></div>`,
        opts: keypadHTML(),
      }, c.dots);
      qa.querySelector('.opts').classList.add('kopts');
      const boxes = [qa.querySelector('[data-s="0"]'), qa.querySelector('[data-s="1"]')];
      const keys = [...qa.querySelectorAll('.key')];
      const showCarry = () => { if (carry) { qa.querySelector('.cm').textContent = '1'; qa.querySelector('.cm').classList.add('on'); } };
      const showBorrow = () => { if (borrow) { const ta = qa.querySelector('.ta'); ta.classList.add('crossed'); qa.querySelector('.cm').textContent = t1 - 1; qa.querySelector('.cm').classList.add('on'); qa.querySelector('.bm').textContent = '10'; qa.querySelector('.bm').classList.add('on'); } };
      const steps = [
        { want: onesD, box: boxes[0], start: [P.colOnes], help: () => { if (borrow) { showBorrow(); return [P.borrowNote, onesLine, P.onesWrite(onesD, 0)]; } return [onesLine, P.onesWrite(onesD, carry)]; },
          after: async () => { if (carry) { showCarry(); await W(my, say(P.carryNote)); } if (borrow) { showBorrow(); await W(my, say(P.minusBorrow)); } } },
        { want: tensD, box: boxes[1], start: [P.colTens], help: () => add && carry ? [tensLine, P.plusOne(tensD), P.tensWrite(tensD)] : [tensLine, P.tensWrite(tensD)], after: async () => {} },
      ];
      preload(P.eqQ(a, op, b), P.eqA(a, op, b, add ? a + b : a - b), onesLine, tensLine, P.colOnes, P.colTens);
      if (c.intro) await W(my, say(c.intro));
      await W(my, say(P.eqQ(a, op, b)));
      let first = true;
      const teach = TEACH;
      if (teach) await W(my, say(P.watchMe));
      for (const st of steps) {
        st.box.classList.add('cur');
        if (teach) {
          await W(my, say(...st.help()));
          const k = keys.find(x => +x.dataset.d === st.want); k.classList.add('glow'); await W(my, sleep(500)); k.classList.remove('glow');
          st.box.textContent = st.want; st.box.classList.remove('cur'); st.box.classList.add('fill'); chime(true);
          await st.after(); continue;
        }
        say(...st.start);
        T.right = () => keys.find(x => +x.dataset.d === st.want); T.wrong = () => keys.find(x => +x.dataset.d !== st.want);
        await new Promise((resolve, reject) => {
          let busy = false, missed = false;
          keys.forEach(k => k.onclick = async () => {
            if (busy) return;
            try {
              if (+k.dataset.d === st.want) {
                busy = true; chime(true); keys.forEach(x => x.classList.remove('glow'));
                st.box.textContent = st.want; st.box.classList.remove('cur', 'no'); st.box.classList.add('fill');
                await st.after(); resolve();
              } else {
                chime(false); st.box.textContent = k.dataset.d; st.box.classList.remove('no'); void st.box.offsetWidth; st.box.classList.add('no');
                if (missed) return;
                missed = true; first = false; busy = true;
                await W(my, say(...st.help()));
                st.box.textContent = ''; keys.find(x => +x.dataset.d === st.want).classList.add('glow'); busy = false;
              }
            } catch (e) { reject(e); }
          });
        });
        live(my);
      }
      keys.forEach(k => k.onclick = null);
      await W(my, say(...(teach ? [] : [praise()]), P.eqA(a, op, b, add ? a + b : a - b)));
      return first;
    },
  };
}
GEN[71] = vertical(71, [...LISTS.add2, ...LISTS.add2c, ...LISTS.add2c]);
GEN[72] = vertical(72, [...LISTS.sub2, ...LISTS.sub2b, ...LISTS.sub2b]);

/* ---------- 73–75：九九 ---------- */
GEN[73] = timesLesson(73, LISTS.t67);
GEN[74] = timesLesson(74, LISTS.t89);
GEN[75] = timesLesson(75, LISTS.tall);

/* 一排一排畫點、跳著數到 n（76–79 的示範） */
async function rowsDemo(my, box, k, rows, extra = 0) {
  const sz = Math.max(12, Math.min(28, Math.floor((Math.min(view.clientWidth, 900) - 140) / Math.max(k, 1) / 1.35)));
  box.innerHTML = range(1, rows).map(() => `<div class="drow" style="--d:${sz}px">${'<i></i>'.repeat(k)}<span class="sum"></span></div>`).join('')
    + (extra ? `<div class="drow left" style="--d:${sz}px">${'<i></i>'.repeat(extra)}<span class="sum"></span></div>` : '');
  const rs = [...box.querySelectorAll('.drow:not(.left)')];
  for (let i = 0; i < rs.length; i++) { rs[i].classList.add('cnt'); rs[i].querySelector('.sum').textContent = (i + 1) * k; stopAll(); await W(my, play(CN((i + 1) * k))); await W(my, sleep(200)); }
  return rs;
}
// 76：k × ? = n
GEN[76] = {
  plan: mkPlan(76, LISTS.tall, q => `${q.k}x?`), key: q => `${q.k}x?=${q.k * q.g}`,
  ask(q, c) {
    const { k, g } = q, n = k * g;
    return simpleAsk(q, c, {
      main: `<div class="card bigeq"><div class="eq"><span>${k}</span><i>×</i><span class="qm" data-r>?</span><i>=</i><span>${n}</span></div><div class="dgrid"></div></div>`,
      opts: opts3(g, 1, 9, 2), r: g, ask: [P.mulMissQ(k, n)], ans: P.eqA(k, '×', g, n),
      demo: qa => rowsDemo(c.my, qa.querySelector('.dgrid'), k, g),
      undo: qa => { qa.querySelector('.dgrid').innerHTML = ''; },
    });
  },
};
// 77、78：n ÷ k（77 旁邊寫著「k × ? = n」）
function divTable(id, hint) {
  return {
    plan: mkPlan(id, LISTS.divT, q => `${q.n}/${q.k}`), key: q => `${q.n}/${q.k}`,
    ask(q, c) {
      const { n, k, q: g } = q;
      return simpleAsk(q, c, {
        main: `<div class="card bigeq">${eqHTML(n, '÷', k)}${hint ? `<div class="think2">想想看：${k} × <b>?</b> = ${n}</div>` : ''}<div class="dgrid"></div></div>`,
        opts: opts3(g, 1, 9, 2), r: g, ask: hint ? [P.eqQ(n, '÷', k), P.mulMissQ(k, n)] : [P.eqQ(n, '÷', k)], ans: P.eqA(n, '÷', k, g),
        demo: async qa => { await say(P.mulMissQ(k, n)); await rowsDemo(c.my, qa.querySelector('.dgrid'), k, g); await say(P.eqA(k, '×', g, n)); },
        undo: qa => { qa.querySelector('.dgrid').innerHTML = ''; },
      });
    },
  };
}
GEN[77] = divTable(77, true);
GEN[78] = divTable(78, false);

/* 79：有餘數的除法（先問商，再問餘數） */
GEN[79] = {
  plan: mkPlan(79, LISTS.remD, q => `${q.n}/${q.k}`), key: q => `${q.n}/${q.k}`,
  async ask(q, c) {
    const { my } = c, { n, k, q: g, l } = q;
    const qa = frame({
      main: `<div class="card bigeq remq"><div class="eq"><span>${n}</span><i>÷</i><span>${k}</span><i>=</i><span class="qm" id="rq">?</span><small class="rr">餘</small><span class="qm" id="rl">?</span></div><div class="dgrid"></div></div>`,
      opts: opts3(g, 1, 9, 2),
    }, c.dots);
    const grid = qa.querySelector('.dgrid');
    const show = async talk => { if (talk) await rowsDemo(my, grid, k, g, l); else { await rowsDemo(my, grid, k, g, l).catch(() => {}); } };
    preload(P.remQ(n, k), P.remLeftQ, P.remA(n, k, g, l));
    if (c.intro) await W(my, say(c.intro));
    say(P.remQ(n, k));
    const set = (id, v) => { const x = qa.querySelector(id); x.textContent = v; x.classList.remove('qm'); };
    const ok1 = await choose(my, [...qa.querySelectorAll('.opts .num')], x => +x.dataset.v === g,
      async () => { await say(P.together); await rowsDemo(my, grid, k, g, l); say(P.tapGlow); },
      async () => { set('#rq', g); await say(praise()); });
    live(my); set('#rq', g);
    qa.querySelector('.opts').innerHTML = opts3(l, 0, Math.max(3, k - 1), 2);
    say(P.remLeftQ);
    const ok2 = await choose(my, [...qa.querySelectorAll('.opts .num')], x => +x.dataset.v === l,
      async () => { if (!grid.innerHTML) await rowsDemo(my, grid, k, g, l); grid.querySelector('.drow.left')?.classList.add('cnt'); await counter([...grid.querySelectorAll('.drow.left i')].map(i => { i.innerHTML = '<span class="bd"></span>'; i.classList.add('ob'); return i; })).demo(my).catch(e => { if (e === STOP) throw e; }); say(P.tapGlow); },
      async () => { set('#rl', l); await say(praise(), P.remA(n, k, g, l)); });
    return ok1 && ok2;
  },
};

/* 80：二位數乘一位數（幾組一樣的積木，先數十再數一） */
GEN[80] = {
  plan: mkPlan(80, LISTS.mul21, q => `${q.a}x${q.b}`), key: q => `${q.a}x${q.b}`,
  ask(q, c) {
    const { a, b } = q, r = a * b;
    return simpleAsk(q, c, {
      main: `<div class="card story">${eqHTML(a, '×', b)}<div class="pe mg">${range(1, b).map(() => `<div class="mgrp">${blocksHTML(a)}</div>`).join('')}</div></div>`,
      opts: trickOpts(r, tensOf(a) * 10 * b + onesOf(a)), r, side: false, ask: [P.eqQ(a, '×', b)], ans: P.eqA(a, '×', b, r),
      demo: async qa => {
        let t = 0;
        const all = [...qa.querySelectorAll('.mg .rod'), ...qa.querySelectorAll('.mg .cube')];
        for (const el of all) { t += el.classList.contains('rod') ? 10 : 1; el.classList.add('cnt'); el.querySelector('.bd').textContent = t; stopAll(); await W(c.my, play(CN(t))); await W(c.my, sleep(130)); }
      },
      undo: qa => qa.querySelectorAll('.cnt').forEach(e => e.classList.remove('cnt')),
    });
  },
};

/* ---------- 81、82：應用題（小白念故事，答錯才出現算式） ---------- */
const WPIC = { stick: '🌟', bird: '🐦', apple: '🍎', bus: '🚌', box: '🍬', legs: '🐶', share: '🍓', car: '🚗' };
function wordLesson(id, list) {
  return {
    plan: mkPlan(id, list, q => `${q.t}${q.a || q.k}${q.b || q.g || q.n}`), key: q => `${q.t}:${q.a || q.n || q.k}`,
    ask(q, c) {
      const eq = q.op ? [q.a, q.op, q.b] : q.g ? [q.k, '×', q.g] : [q.n, '÷', q.k];
      const r = calc(...eq);
      const wrongOp = q.op === '+' ? q.a - q.b : q.op === '-' ? q.a + q.b : q.g ? q.k + q.g : q.n - q.k;
      return simpleAsk(q, c, {
        main: `<div class="card wp"><div class="wpic">${WPIC[q.t]}</div><p class="wtxt">${P.wpQ(q)}</p><div class="weq hide">${eqHTML(...eq)}</div></div>`,
        opts: trickOpts(r, wrongOp, 0, 200), r, ask: [P.wpQ(q)], ans: P.eqA(...eq, r),
        demo: async qa => { qa.querySelector('.weq').classList.remove('hide'); await say(P.eqQ(...eq)); },
        good: async qa => qa.querySelector('.weq').classList.remove('hide'),
        undo: () => {},
      });
    },
  };
}
GEN[81] = wordLesson(81, LISTS.wp);
GEN[82] = wordLesson(82, LISTS.wpmd);

/* 83：找錢（從價錢往上數到付的錢） */
GEN[83] = {
  plan: mkPlan(83, LISTS.change, q => q.n), key: q => `${q.p}/${q.pay}`,
  ask(q, c) {
    const ch = q.pay - q.p;
    const stops = [q.p]; let x = q.p;
    if (x % 10) { x = Math.ceil(x / 10) * 10; stops.push(x); }
    while (x < q.pay) { x += 10; stops.push(x); }
    const money = q.pay === 100 ? `<span class="bill">100</span>` : coinHTML(50);
    return simpleAsk(q, c, {
      main: `<div class="card shop"><div class="goods">${q.e}<span class="price">${q.p} 元</span></div><div class="paidrow">付了 ${money}</div><div class="cup"></div></div>`,
      opts: trickOpts(ch, q.pay - q.p - 10 >= 0 ? ch - 10 : ch + 10, 0, 100), r: ch, ask: [P.changeQ(q)], ans: P.changeA(ch),
      demo: async qa => {
        await say(P.countUp);
        const cup = qa.querySelector('.cup');
        for (let i = 0; i < stops.length; i++) {
          cup.insertAdjacentHTML('beforeend', `${i ? `<i class="hop">+${stops[i] - stops[i - 1]}</i>` : ''}<b>${stops[i]}</b>`);
          stopAll(); await W(c.my, play(CN(stops[i]))); await W(c.my, sleep(200));
        }
        await say(P.eqA(q.pay, '-', q.p, ch));
      },
      undo: qa => { qa.querySelector('.cup').innerHTML = ''; },
    });
  },
};
