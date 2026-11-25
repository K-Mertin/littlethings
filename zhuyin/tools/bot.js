// 自動上課機器人（測試用，不會部署）：先在 repo 根目錄 python3 -m http.server 8123，再
//   node zhuyin/tools/bot.js <tabletL|tabletP|phoneP|phoneL> <課...>
// 課：數字＝基礎課程、p1＝練習島、a1＝進階島、e1＝探險島、c1＝挑戰島。截圖存在環境變數 OUT 指的資料夾（預設 /tmp）。
// 策略：能算出答案的就直接點；算不出來就隨便點一個，答錯後正確答案會發亮（.glow）再點它。
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp';
const V = { tabletL: [1280, 800], tabletP: [800, 1280], phoneP: [390, 844], phoneL: [844, 390] };
(async () => {
  const name = process.argv[2]; const lessons = process.argv.slice(3);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: V[name][0], height: V[name][1] }, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0, 3).join(' / ')));
  await p.goto('http://localhost:8123/zhuyin/index.html');
  await p.evaluate(() => localStorage.setItem('zhuyin-v1', JSON.stringify({ lessons: 37, adv: 0, exp: 0, chal: 0, ai: false, rest: 0 })));
  await p.reload(); await p.click('#go'); await p.waitForTimeout(300);
  // 記下寫字板目前要寫的符號
  await p.evaluate(() => { const _wp = writePad; writePad = function (box, s, o) { window.__wp = { box, s }; return _wp.apply(this, arguments); }; const _w1 = SCREENS.writeOne; SCREENS.writeOne = function (s, o) { const r = _w1.apply(this, arguments); window.__wp = { box: document.querySelector('#wc').parentElement, s }; return r; }; });
  const shots = new Set(); const fails = [];
  for (const n of lessons) {
    const tr = { p: 'prac', a: 'adv', e: 'exp', c: 'chal' }[n[0]] || 'main';
    await p.evaluate(([num, tr]) => startLesson(num, tr), [+(n.replace(/^[a-z]/, '')), tr]);
    const t0 = Date.now(); let ok = false, last = '', same = 0;
    while (Date.now() - t0 < 300000) {
      await p.waitForTimeout(250);
      let st;
      try { st = await p.evaluate(STEP); } catch (e) { errs.push('evaluate ' + e.message.split('\n')[0]); break; }
      if (st.k === 'reward') { await p.screenshot({ path: `${OUT}/L-${name}-done-${n}.png` }); await p.evaluate(() => document.querySelector('#reward').remove()); ok = true; break; }
      if (st.tag && !shots.has(st.tag)) { shots.add(st.tag); await p.screenshot({ path: `${OUT}/L-${name}-${st.tag}.png` }); }
      const sig = JSON.stringify(st); same = sig === last ? same + 1 : 0; last = sig;
      if (st.k === 'click') { try { await p.click(st.sel, { timeout: 3000, force: true }); } catch (e) { } await p.waitForTimeout(150); }
      else if (st.k === 'draw') {
        for (const stroke of st.strokes) {
          const pt = ([x, y]) => [st.r.x + x / 100 * st.r.w, st.r.y + y / 100 * st.r.h];
          await p.mouse.move(...pt(stroke[0])); await p.mouse.down();
          for (let i = 1; i < stroke.length; i++) { const [a, c] = [stroke[i - 1], stroke[i]]; for (let k = 1; k <= 6; k++) await p.mouse.move(...pt([a[0] + (c[0] - a[0]) * k / 6, a[1] + (c[1] - a[1]) * k / 6])); }
          await p.mouse.up(); await p.waitForTimeout(120);
        }
        await p.waitForTimeout(400);
      }
      if (same > 160) { fails.push(`${n} 卡住：${sig.slice(0, 160)}`); break; }
    }
    console.log(`${name} ${n} ${ok ? 'done' : 'FAIL'} ${Math.round((Date.now() - t0) / 1000)}s`);
    if (!ok) { await p.screenshot({ path: `${OUT}/L-${name}-FAIL-${n}.png` }); if (!fails.some(f => f.startsWith(n + ' '))) fails.push(`${n} 逾時`); }
  }
  console.log(name, 'errors', JSON.stringify(errs.slice(0, 8)), 'fails', JSON.stringify(fails));
  await b.close();
})();

// 在頁面裡判斷下一步
function STEP() {
  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
  const vis = el => el && !el.classList.contains('hide') && el.offsetParent !== null;
  if (q('#reward')) return { k: 'reward' };
  if (typeof speaking !== 'undefined' && speaking > 0) return { k: 'wait', why: 'speaking' };
  const hzs = el => el ? [...el.querySelectorAll('.hz')].map(e => e.textContent).join('') : '';
  const ALLW = ZY.WORDS.concat(ZY.THREE || []);
  const sc = screen;
  if (q('#sheet [data-a=close]') && sc !== 'lessonLearn') return { k: 'click', sel: '#sheet [data-a=close]' };
  if (q('#rest button')) return { k: 'click', sel: '#rest button' };
  if (sc === 'lessonIntro') return vis(q('#lgo')) ? { k: 'click', sel: '#lgo' } : { k: 'wait' };
  if (sc.startsWith('teach')) return vis(q('#tnext')) && !q('#tnext').disabled ? { k: 'click', sel: '#tnext', tag: 'teach-' + sc } : { k: 'wait' };
  if (sc === 'lessonLearn') { const b = q('.lsym:not(.seen)'); if (b) return { k: 'click', sel: `.lsym[data-s="${b.dataset.s}"]` }; return vis(q('#lnext')) ? { k: 'click', sel: '#lnext' } : { k: 'wait' }; }
  if (sc === 'comboL') { const b = qa('.combo').find(x => !x.classList.contains('seen') && !x.classList.contains('heard')); if (b) return { k: 'click', sel: `.combo[data-z="${b.dataset.z}"]` }; return vis(q('#lnext')) ? { k: 'click', sel: '#lnext' } : { k: 'wait' }; }
  if (vis(q('#lnext')) && !q('.lsym:not(.seen)')) return { k: 'click', sel: '#lnext' };
  // 寫字
  if ((sc === 'writeOne' || sc === 'writeWord') && window.__wp && document.contains(window.__wp.box)) {
    const tn = qa('#wtones .tonecard').filter(vis);
    if (!tn.length) { const r = window.__wp.box.querySelector('canvas').getBoundingClientRect(); if (r.width > 20) return { k: 'draw', strokes: ZY.strokesOf(window.__wp.s), r: { x: r.left, y: r.top, w: r.width, h: r.height }, tag: sc }; }
  }
  // 拼拼看
  if (sc === 'spell') {
    if (!q('.tilez:not([disabled]):not(.used)')) return { k: 'wait' };
    let w = (q('#pic .w') || {}).textContent; if (!ALLW.find(x => x.w === w)) { const m = ((lastLines || []).map(l => typeof l === 'object' ? l.text : l).join('').match(/我們來拼(.+?)。/) || [])[1]; if (m) window.__bw = m; w = window.__bw; }
    const x = ALLW.find(v => v.w === w); if (!x) return { k: 'wait' };
    const gi = qa('.sylgroup').findIndex(g => g.classList.contains('cur')); const parts = ZY.parseSyl(x.z.split(' ')[Math.max(0, gi)]).parts;
    const filled = qa(`.sylgroup[data-s="${Math.max(0, gi)}"] .slot.fill`).length;
    return filled < parts.length ? { k: 'click', sel: `.tilez:not(.used)[data-s="${parts[filled]}"]`, tag: 'spell' } : { k: 'wait' };
  }
  // 注音積木
  if (sc === 'blocks') {
    const w = (q('#pic .w') || {}).textContent; const x = ALLW.find(v => v.w === w); if (!x || !q('#tray .bk')) return { k: 'wait' };
    const trains = qa('#train .bktrain'); const si = trains.findIndex(t => [...t.querySelectorAll('.slot')].some(s => !s.classList.contains('fill')));
    const sy = ZY.parseSyl(x.z.split(' ')[Math.max(0, si)]);
    const tb = qa('#tray .bk'); if (tb[0] && tb[0].dataset.g === 't') return { k: 'click', sel: `#tray .bk[data-s="${sy.tone}"]`, tag: 'blocks-t' };
    const t = trains[Math.max(0, si)]; const slots = t ? [...t.querySelectorAll('.slot')].filter(x => x.dataset.j !== 't') : []; const j = slots.findIndex(s => !s.classList.contains('fill'));
    const want = sy.parts[j >= 0 ? +slots[j].dataset.j : 0]; return { k: 'click', sel: `#tray .bk[data-s="${want}"]`, tag: 'blocks' };
  }
  // 排句子
  if (sc === 'orderS') {
    if (!q('.otile:not([disabled]):not(.used)') || !q('.oslot.next')) return { k: 'wait' };
    const strip = t => t.replace(/[㄀-ㄯ˙ˊˇˋ]/g, '');
    const n = qa('.oslot.fill').length; const t = qa('.otile').map(b => strip(b.textContent));
    const all = ZY.ORDER_SENTS().concat(ZY.LONG_SENTS || []);
    const s = all.find(s => { const w = ZY.parseLine(s.t).filter(y => y.z).map(y => y.w); return w.length === t.length && w.slice().sort().join() === t.slice().sort().join(); });
    const want = ZY.parseLine(s.t).filter(y => y.z)[n].w; const b = qa('.otile:not(.used)').find(b => strip(b.textContent) === want);
    return { k: 'click', sel: `.otile[data-j="${b.dataset.j}"]`, tag: 'orderS' };
  }
  // 跟著讀：點亮起來的詞
  if (q('.sw.alnext')) return { k: 'click', sel: '.sw.alnext', tag: 'along' };
  if (vis(q('#rpgo'))) return { k: 'click', sel: '#rpgo', tag: 'readP' };
  // 一般選擇題：先點發亮的，算得出答案就點答案，否則隨便點一個
  const OPT = '.opt,.ropt,.tonecard,.hzopt,.zpopt,.rhopt,.swopt,.fbopt,.oppopt,.hzpopt,.qopt,.rsopt,.rpopt,.tfsyl,.phopt,.fo';
  const cands = qa(OPT).filter(b => vis(b) && !b.disabled && !b.classList.contains('ok') && !b.classList.contains('no') && b.tagName === 'BUTTON');
  if (cands.length) {
    const sel = b => { const k = [...document.querySelectorAll(OPT)].indexOf(b); b.setAttribute('data-bot', k); return `[data-bot="${k}"]`; };
    const glow = cands.find(b => b.classList.contains('glow') || b.classList.contains('hl'));
    if (glow) return { k: 'click', sel: sel(glow), tag: sc };
    // 幾個算得出答案的
    const ans = (() => {
      const bub = q('#bubble').textContent;
      if (sc === 'zyPick') { const w = ALLW.find(v => v.w === q('#pic .hzbig').textContent); return cands.find(b => b.dataset.z === w.z); }
      if (sc === 'hzPic') { const c = Array.from(q('#hzc').textContent)[0]; return cands.find(b => b.dataset.w === c); }
      if (sc === 'oppQ') { const a = hzs(q('#pic')); const pr = ZY.OPPOSITE.find(p => p.some(w => w.w === a)); return cands.find(b => b.dataset.w === pr.find(w => w.w !== a).w); }
      if (sc === 'swapQ') { const a = hzs(q('#pic')); const pr = ZY.SWAPS.find(p => p.some(w => w.w === a)); return cands.find(b => b.dataset.w === pr.find(w => w.w !== a).w); }
      if (sc === 'rhymeQ') { const a = ZY.ONE.find(w => w.w === hzs(q('#pic'))); return cands.find(b => { const w = ZY.ONE.find(v => v.w === b.dataset.w); return w && ZY.lastPart(w) === ZY.lastPart(a); }); }
      if (sc === 'listen') { const m = bub.match(/找出(.)/); return m && cands.find(b => b.dataset.s === m[1]); }
      return null;
    })();
    const pickB = ans || cands[Math.floor(Math.random() * cands.length)];
    return { k: 'click', sel: sel(pickB), tag: sc };
  }
  if (vis(q('#snext'))) return { k: 'click', sel: '#snext', tag: 'story' };
  return { k: 'wait', sc };
}
