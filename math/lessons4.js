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
