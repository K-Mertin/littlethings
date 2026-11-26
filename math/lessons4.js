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
