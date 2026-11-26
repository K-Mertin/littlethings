// 123 小島 第 7 段（84 起）：二位數除以一位數、混合運算、三位數、直式乘法、時鐘
// 用 index.html 的共用元件（simpleAsk、choose、blocksHTML、eqHTML…）和 lessons3.js 的 trickOpts、keypadHTML
'use strict';

/* ---------- 84–86：二位數除以一位數（積木平分：先分十，分不完拆開，再分一） ---------- */
function divBlocks(id, list) {
  return {
    plan: mkPlan(id, list, q => `${q.n}/${q.k}`), key: q => `${q.n}/${q.k}`,
    ask(q, c) {
      const { n, k } = q, r = n / k, my = c.my, t = tensOf(n);
      // 常見錯誤：十位、個位各自除，忘了把分不完的十拆開
      const wrong = t % k ? Math.floor(t / k) * 10 + Math.floor(onesOf(n) / k) : null;
      const pics = () => `<div class="dsrc">${blocksHTML(n, 'A')}</div><div class="dgrps">${range(1, k).map(() => `<div class="mgrp"><div class="blocks"><span class="ones"></span></div></div>`).join('')}</div>`;
      return simpleAsk(q, c, {
        main: `<div class="card story dvcard">${eqHTML(n, '÷', k)}<div class="pe dv">${pics()}</div></div>`,
        opts: trickOpts(r, wrong, 1, 99), r, side: false, ask: [P.eqQ(n, '÷', k)], ans: P.eqA(n, '÷', k, r),
        demo: async qa => {
          const src = qa.querySelector('.blocks.A'), sOnes = src.querySelector('.ones');
          const gs = [...qa.querySelectorAll('.dgrps .blocks')];
          await say(P.divTensL);
          const rods = [...src.querySelectorAll('.rod')];
          for (let i = 0; i + k <= rods.length; i += k) for (let g = 0; g < k; g++) {
            const rd = rods[i + g]; gs[g].insertBefore(rd, gs[g].querySelector('.ones')); rd.classList.add('pop'); await W(my, sleep(170));
          }
          const left = [...src.querySelectorAll('.rod')];
          if (left.length) {
            await say(P.breakTen);
            for (const rd of left) {
              rd.classList.add('bundle'); await W(my, sleep(350)); rd.remove();
              for (let i = 0; i < 10; i++) { const x = document.createElement('span'); x.className = 'cube pop'; x.innerHTML = '<span class="bd"></span>'; sOnes.prepend(x); }
              await W(my, sleep(300));
            }
          }
          const cubes = [...sOnes.querySelectorAll('.cube')];
          if (cubes.length) {
            await say(P.divOnesL);
            for (let i = 0; i < cubes.length; i++) { const g = gs[i % k].querySelector('.ones'); g.appendChild(cubes[i]); cubes[i].classList.add('pop'); await W(my, sleep(i < 2 * k ? 140 : 60)); }
          }
          await countBlocks(my, gs[0]);
          await say(P.eachPart(r));
        },
        undo: qa => { qa.querySelector('.pe.dv').innerHTML = pics(); },
      });
    },
  };
}
GEN[84] = divBlocks(84, LISTS.div10);
GEN[85] = divBlocks(85, LISTS.div21);
GEN[86] = divBlocks(86, LISTS.div21r);

/* ---------- 87–89：混合運算（兩步：先算框起來的那一段，再算剩下的） ---------- */
function mixLesson(id, list) {
  const keyOf = q => (q.p || '') + q.t.join('');
  return {
    plan: mkPlan(id, list, keyOf), key: keyOf,
    async ask(q, c) {
      const { my } = c, [a, o1, b, o2, cc] = q.t;
      const [s1, s2] = M.mixSteps(q), v1 = calc(...s1), r = calc(...s2);
      const hi = o => o === '×' || o === '÷', first = q.p === 'L' ? 0 : q.p === 'R' ? 1 : hi(o2) && !hi(o1) ? 1 : 0;
      const rule = q.p ? P.parenFirst : (first === 1 ? P.mulFirst : P.leftFirst);
      const tok = (v, cls = '') => `<span class="mt ${cls}">${v}</span>`, opH = o => `<i>${OPS[o]}</i>`;
      const part1 = first === 0
        ? `<span class="mp">${q.p === 'L' ? tok('(', 'pa') : ''}${tok(a)}${opH(o1)}${tok(b)}${q.p === 'L' ? tok(')', 'pa') : ''}</span>${opH(o2)}${tok(cc)}`
        : `${tok(a)}${opH(o1)}<span class="mp">${q.p === 'R' ? tok('(', 'pa') : ''}${tok(b)}${opH(o2)}${tok(cc)}${q.p === 'R' ? tok(')', 'pa') : ''}</span>`;
      const line2 = first === 0 ? `<i>=</i>${tok(v1, 'nv')}${opH(o2)}${tok(cc)}` : `<i>=</i>${tok(a)}${opH(o1)}${tok(v1, 'nv')}`;
      const qa = frame({
        main: `<div class="card mixc"><div class="mline l1">${part1}</div><div class="mline l2 hide">${line2}</div><div class="mline l3 hide"><i>=</i><span class="mt qm" data-r>?</span></div></div>`,
        opts: opts3(v1, 0, Math.max(20, v1 + 6), 2),
      }, c.dots, false);
      const mp = qa.querySelector('.mp');
      preload(rule, P.eqQ(...s1), P.eqA(...s1, v1), P.eqQ(...s2), P.eqA(...s2, r), P.thenRest);
      if (c.intro) await W(my, say(c.intro));
      say(rule, P.eqQ(...s1));
      mp.classList.add('on');
      const ok1 = await choose(my, [...qa.querySelectorAll('.opts .num')], x => +x.dataset.v === v1,
        async () => { mp.classList.remove('on'); void mp.offsetWidth; mp.classList.add('on', 'pulse'); await say(rule, P.eqA(...s1, v1)); say(P.tapGlow); },
        async () => { await say(praise()); });
      live(my);
      mp.classList.remove('on', 'pulse'); mp.classList.add('done');
      qa.querySelector('.l2').classList.remove('hide');
      qa.querySelector('.opts').innerHTML = opts3(r, 0, Math.max(20, r + 6), 2);
      say(P.thenRest, P.eqQ(...s2));
      const ok2 = await choose(my, [...qa.querySelectorAll('.opts .num')], x => +x.dataset.v === r,
        async () => { qa.querySelector('.l2').classList.add('pulse'); await say(P.eqA(...s2, r)); qa.querySelector('.l2').classList.remove('pulse'); say(P.tapGlow); },
        async () => { const l3 = qa.querySelector('.l3'); l3.classList.remove('hide'); fillEq(l3, r); await say(praise(), P.eqA(...s2, r)); });
      return ok1 && ok2;
    },
  };
}
GEN[87] = mixLesson(87, LISTS.mix1);
GEN[88] = mixLesson(88, LISTS.mix2);
GEN[89] = mixLesson(89, LISTS.mix3);

/* ---------- 90–92：三位數（一大片是一百） ---------- */
const blocks3HTML = n => `<div class="blocks b3">${range(1, Math.floor(n / 100)).map(() => `<span class="flat"><span class="bd"></span></span>`).join('')}${range(1, Math.floor(n / 10) % 10).map(() => `<span class="rod"><i></i><span class="bd"></span></span>`).join('')}<span class="ones">${range(1, n % 10).map(() => `<span class="cube"><span class="bd"></span></span>`).join('')}</span></div>`;
async function countBlocks3(my, root) {
  let t = 0;
  for (const el of root.querySelectorAll('.flat, .rod, .cube')) {
    t += el.classList.contains('flat') ? 100 : el.classList.contains('rod') ? 10 : 1;
    el.classList.add('cnt'); el.querySelector('.bd').textContent = t; stopAll(); await W(my, play(CN(t))); await W(my, sleep(140));
  }
}
const digitsOf = n => [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
// 選項：答案、位數弄反（十位和個位對調）、差一百
function placeOpts(n) {
  const [h, t, o] = digitsOf(n), set = new Set([n]);
  for (const w of [h * 100 + o * 10 + t, n + 100, n - 100, n + 10, n - 10]) if (set.size < 3 && w >= 100 && w <= 999 && !set.has(w)) set.add(w);
  return [...set].sort((a, b) => a - b).map(v => numBtn(v)).join('');
}
GEN[90] = {
  plan: mkPlan(90, LISTS.h3.map(n => ({ n })), q => q.n), key: q => q.n,
  ask(q, c) {
    return simpleAsk(q, c, {
      main: `<div class="card">${blocks3HTML(q.n)}</div>`, opts: placeOpts(q.n), r: q.n, ask: [P.tensQ], ans: P.thisIs(q.n), after: qa => qa.querySelector('.opts').classList.add('o3'),
      demo: async qa => { if (q.n >= 100 && (S.rounds[90] || 0) < 3) await say(P.tenTens); await countBlocks3(c.my, qa); },
      undo: qa => qa.querySelectorAll('.cnt').forEach(e => e.classList.remove('cnt')),
    });
  },
};
GEN[91] = {
  plan: n => planPairs(91, n, LISTS.cmp3, q => `${q.a}:${q.b}`).map(q => ({ ...q, t: rand(2) ? 'big' : 'small' })),
  key: q => `${q.a}:${q.b}`, again: q => ({ ...q, a: q.b, b: q.a }),
  async ask(q, c) {
    const { my } = c, { a, b, t } = q, r = t === 'big' ? Math.max(a, b) : Math.min(a, b);
    const [da, db] = [digitsOf(a), digitsOf(b)], at = da.findIndex((d, i) => d !== db[i]);
    const card = v => `<button class="num cmp3" data-v="${v}">${digitsOf(v).map((d, i) => `<span class="dg d${i}">${d}</span>`).join('')}</button>`;
    const qa = frame({ main: `<div class="pvhead"><span>百</span><span>十</span><span>一</span></div>`, opts: card(a) + card(b) }, c.dots, false);
    qa.querySelector('.opts').classList.add('o3');
    const btns = [...qa.querySelectorAll('.cmp3')];
    const LN = [P.cmpHund, P.cmpTens3, P.cmpOnes3];
    preload(t === 'big' ? P.bigQ : P.smallQ, ...LN.slice(0, at + 1), P.bigger(Math.max(a, b), Math.min(a, b)));
    if (c.intro) await W(my, say(c.intro));
    say(t === 'big' ? P.bigQ : P.smallQ);
    const clear = () => qa.querySelectorAll('.dg.on').forEach(e => e.classList.remove('on'));
    return choose(my, btns, x => +x.dataset.v === r,
      async () => {
        for (let i = 0; i <= at; i++) { clear(); btns.forEach(x => x.querySelector('.d' + i).classList.add('on')); await say(LN[i]); await W(my, sleep(300)); }
        await say(P.bigger(Math.max(a, b), Math.min(a, b))); clear(); say(P.tapGlow);
      },
      async () => { await say(praise(), P.bigger(Math.max(a, b), Math.min(a, b))); });
  },
};
GEN[92] = {
  plan: mkPlan(92, LISTS.hadd, q => `${q.a}${q.op}${q.b}`), key: q => `${q.a}${q.op}${q.b}`,
  ask(q, c) {
    const { a, b, op } = q, r = calc(a, op, b), parts = M.colParts(q);
    const wrong = b < 100 ? calc(a, op, b * 10) : calc(a, op, b / 10);
    const row = (v, o = '') => `<tr><td class="po">${o}</td>${digitsOf(v).map((d, i) => `<td class="c${i}">${i === 0 || v >= 10 ** (2 - i) ? d : ''}</td>`).join('')}</tr>`;
    return simpleAsk(q, c, {
      after: qa => qa.querySelector('.opts').classList.add('o3'),
      main: `<div class="card story eq3">${eqHTML(a, op, b)}<table class="pvt"><tr><td></td><th>百</th><th>十</th><th>一</th></tr>${row(a)}${row(b, OPS[op])}</table></div>`,
      opts: (() => { const set = new Set([r]); for (const w of [wrong, r + 100, r - 100, r + 10]) if (set.size < 3 && w >= 0 && w <= 999 && !set.has(w)) set.add(w); return [...set].sort((x, y) => x - y).map(v => numBtn(v)).join(''); })(),
      r, side: false, ask: [P.eqQ(a, op, b)], ans: P.eqA(a, op, b, r),
      demo: async qa => {
        for (const pt of parts) { const ci = pt[0] === '百位' ? 0 : 1; qa.querySelectorAll('.pvt .c' + ci).forEach(e => e.classList.add('on')); await say(P.colSay(...pt)); }
      },
      undo: qa => qa.querySelectorAll('.pvt .on').forEach(e => e.classList.remove('on')),
    });
  },
};

/* ---------- 93：直式乘法（二位數 × 一位數，數字鍵盤，先個位再十位） ---------- */
GEN[93] = {
  plan: mkPlan(93, LISTS.vmul, q => `${q.a}x${q.b}`), key: q => `${q.a}x${q.b}`,
  async ask(q, c) {
    const { a, b } = q, my = c.my, o = onesOf(a), t = tensOf(a), p = o * b, cr = Math.floor(p / 10), y = t * b + cr;
    const qa = frame({
      main: `<div class="card vert">
        <div class="vrow mark"><span class="vc"><b class="cm"></b></span><span class="vc"><b class="bm"></b></span></div>
        <div class="vrow"><span class="vop"></span><span class="vc">${t}</span><span class="vc">${o}</span></div>
        <div class="vrow"><span class="vop">×</span><span class="vc"></span><span class="vc">${b}</span></div>
        <div class="vline"></div>
        <div class="vrow"><span class="vop"></span><span class="vc box" data-s="1"></span><span class="vc box" data-s="0"></span></div></div>`,
      opts: keypadHTML(),
    }, c.dots);
    qa.querySelector('.opts').classList.add('kopts');
    const boxes = [qa.querySelector('[data-s="0"]'), qa.querySelector('[data-s="1"]')];
    const keys = [...qa.querySelectorAll('.key')];
    const onesW = cr > 1 ? P.onesWriteC(p % 10, cr) : P.onesWrite(p % 10, cr);
    const steps = [
      { want: p % 10, box: boxes[0], start: [P.colOnes], help: () => [P.eqA(o, '×', b, p), onesW],
        after: async () => { if (cr) { const cm = qa.querySelector('.cm'); cm.textContent = cr; cm.classList.add('on'); await W(my, say(cr > 1 ? P.carryN(cr) : P.carryNote)); } } },
      { want: y, box: boxes[1], start: [P.colTens], help: () => cr ? [P.eqA(t, '×', b, t * b), P.plusCarry(cr, y), P.tensWrite(y)] : [P.eqA(t, '×', b, t * b), P.tensWrite(y)], after: async () => {} },
    ];
    preload(P.eqQ(a, '×', b), P.eqA(a, '×', b, a * b), P.colOnes, P.colTens, ...steps[0].help(), ...steps[1].help());
    if (c.intro) await W(my, say(c.intro));
    await W(my, say(P.eqQ(a, '×', b)));
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
    await W(my, say(...(teach ? [] : [praise()]), P.eqA(a, '×', b, a * b)));
    return first;
  },
};

/* ---------- 94、95：半點、幾點幾分（長針會轉） ---------- */
function clockAt(h, m) {
  const w = h12 => ((h12 - 1 + 12) % 12) + 1;
  return clockHTML(w(h)).replace('<g class="mh">', `<g class="mh" style="transform:rotate(${m * 6}deg)">`)
    .replace(/<g class="hh" style="transform:rotate\([^)]*\)">/, `<g class="hh" style="transform:rotate(${(h % 12) * 30 + m / 2}deg)">`);
}
const tLabel = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
function timeLesson(id, list, half) {
  return {
    plan: n => planPairs(id, n, list, q => tLabel(q.h, q.m)), key: q => tLabel(q.h, q.m),
    async ask(q, c) {
      const { my } = c, { h, m } = q, nh = h % 12 + 1;
      const ans = m === 0 ? P.clockA(h) : m === 30 && half ? P.halfA(h) : P.timeA(h, m);
      const lab = (hh, mm) => half ? (mm === 30 ? `${hh} 點半` : `${hh} 點`) : tLabel(hh, mm);
      // 選項：答案、短針看成下一個數、（幾分）長針指的數字當成分
      const cands = half ? [[h, m], [nh, m], [h, m === 30 ? 0 : 30], [nh, 0]] : [[h, m], [nh, m], [h, m / 5], [h, (m + 30) % 60]];
      const seen = new Set(), opts = [];
      for (const [hh, mm] of cands) { const k = lab(hh, mm); if (!seen.has(k) && opts.length < 3) { seen.add(k); opts.push([k, hh === h && mm === m]); } }
      const qa = frame({ main: clockAt(h, m), opts: shuffle(opts).map(([k, ok]) => `<button class="num tbtn" data-v="${k}" data-ok="${ok ? 1 : ''}">${k}</button>`).join('') }, c.dots);
      const right = lab(h, m), mh = qa.querySelector('.mh'), hh = qa.querySelector('.hh'), cn = [...qa.querySelectorAll('.cn')];
      preload(P.clockQ, ans, half ? P.halfHint : P.fiveHint);
      if (c.intro) await W(my, say(c.intro));
      say(P.clockQ);
      return choose(my, [...qa.querySelectorAll('.opts .num')], x => x.dataset.v === right,
        async () => {
          if (half || m === 0) { mh.classList.add('hl'); await say(m === 30 ? P.halfHint : P.clockHint); }
          else {
            mh.classList.add('hl'); await say(P.fiveHint);
            for (let i = 1; i <= m / 5; i++) { cn[i - 1].classList.add('on'); stopAll(); await W(my, play(CN(i * 5))); await W(my, sleep(150)); }
          }
          mh.classList.remove('hl'); hh.classList.add('hl'); if (m >= 30) await say(P.shortPast); await say(ans);
          hh.classList.remove('hl'); cn.forEach(x => x.classList.remove('on')); say(P.tapGlow);
        },
        async () => { await say(praise(), ans); });
    },
  };
}
GEN[94] = timeLesson(94, [...range(1, 12).map(h => ({ h, m: 30 })), ...[3, 6, 9, 12].map(h => ({ h, m: 0 }))], true);
GEN[95] = timeLesson(95, range(1, 12).flatMap(h => [5, 10, 15, 20, 25, 35, 40, 45, 50, 55].filter((m, i) => (h + i) % 3 === 0).map(m => ({ h, m }))), false);
