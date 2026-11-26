// 自動上課機器人（測試用，不會部署）：先在 repo 根目錄 python3 -m http.server 8123，再
//   node math/tools/bot.js <tabletL|tabletP|phoneP|phoneL> <課或遊戲...>
// 課：數字（例如 84）；review＝複習（seedmiss 先把每課一題放進答錯過的題目）；小遊戲：g:<id>[:<程度>]（例如 g:flip:t69）；畫面：s:<名稱>（只截圖，例如 s:home）。
// 每課第一題故意先點錯一次（測示範），之後點正確答案（index.html 的 T.right）。截圖存在環境變數 OUT（預設 /tmp）。
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp';
const PORT = process.env.PORT || 8123;
const V = { tabletL: [1280, 800], tabletP: [800, 1280], phoneP: [390, 844], phoneL: [844, 390] };
(async () => {
  const name = process.argv[2], jobs = process.argv.slice(3);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: V[name][0], height: V[name][1] }, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0, 3).join(' / ')));
  // 本機沒有 /api/*，也不用等語音：音檔一律回 404，語音改用很短的假播放
  await p.route('**/api/**', r => r.fulfill({ status: 404, body: '' }));
  await p.addInitScript(() => { window.speechSynthesis && (speechSynthesis.speak = u => setTimeout(() => u.onend && u.onend(), 30)); });
  if (!process.env.AUDIO) await p.route('**/audio/*.mp3', r => r.fulfill({ status: 404, body: '' }));
  await p.goto(`http://localhost:${PORT}/math/index.html`);
  await p.evaluate(seed => localStorage.setItem('math-v1', seed), process.env.SEED || JSON.stringify({ rest: 0, ai: false }));
  await p.reload(); await p.click('#go'); await p.waitForTimeout(400);
  const fails = [];
  for (const job of jobs) {
    const t0 = Date.now(); let ok = false, wrongDone = false, lastSig = '', same = 0, clicks = 0;
    if (job.startsWith('s:')) {
      const [, sc, ...args] = job.split(':');
      await p.evaluate(([sc, args]) => window.__m.go(sc, ...args.map(a => isNaN(a) ? a : +a)), [sc, args]);
      await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/M-${name}-${job.replace(/:/g, '_')}.png` });
      console.log(`${name} ${job} shot`); continue;
    }
    if (job.startsWith('seedmiss')) {   // seedmiss:1-40：每一課出一題，當成答錯過的題目（測複習）
      const [lo, hi] = (job.split(':')[1] || '1-999').split('-').map(Number);
      const n = await p.evaluate(([lo, hi]) => { S.miss = []; for (const L of LESSONS) if (L.id >= lo && L.id <= hi) addMiss(L.id, 'x', GEN[L.id].plan(1)[0]); return S.miss.length; }, [lo, hi]);
      console.log(`${name} seedmiss ${n}`); continue;
    }
    if (job === 'review') await p.evaluate(() => window.__m.go('review'));
    else if (job.startsWith('g:')) {
      const [, id, lv] = job.split(':');
      await p.evaluate(([id, lv]) => { const S = window.__m.S(); S.glv = S.glv || {}; if (lv) S.glv[id] = lv; window.__m.go('game', id); }, [id, lv]);
    } else await p.evaluate(id => window.__m.go('lesson', id), +job);
    let shot = false;
    while (Date.now() - t0 < 240000) {
      await p.waitForTimeout(220);
      const st = await p.evaluate(wrongDone => {
        if (document.querySelector('#reward')) return { k: 'reward' };
        const rb = document.querySelector('#rest button'); if (rb) { rb.setAttribute('data-bot', 'x'); return { k: 'click', sel: '[data-bot=x]' }; }
        const T = window.__m.T;
        const vis = el => el && document.contains(el) && el.offsetParent !== null && getComputedStyle(el).pointerEvents !== 'none' && !el.disabled;
        const mark = el => { document.querySelectorAll('[data-bot]').forEach(e => e.removeAttribute('data-bot')); el.setAttribute('data-bot', '1'); return '[data-bot="1"]'; };
        const glow = document.querySelector('.glow'); if (vis(glow)) return { k: 'click', sel: mark(glow), why: 'glow' };
        if (!wrongDone && T.wrong) { const w = T.wrong(); if (vis(w)) return { k: 'click', sel: mark(w), wrong: 1 }; }
        if (T.right) { const r = T.right(); if (vis(r)) return { k: 'click', sel: mark(r), why: 'right', txt: (r.textContent || '').trim().slice(0, 12) }; }
        return { k: 'wait', b: document.querySelector('#bubble').textContent.slice(0, 30) };
      }, wrongDone).catch(e => ({ k: 'err', e: e.message }));
      if (st.k === 'err') { errs.push(st.e.split('\n')[0]); break; }
      if (st.k === 'reward') { await p.screenshot({ path: `${OUT}/M-${name}-done-${job.replace(/:/g, '_')}.png` }); await p.evaluate(() => document.querySelector('#reward').remove()); ok = true; break; }
      if (st.k === 'click' && (!shot || clicks < +(process.env.SHOTS || 0))) { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/M-${name}-${job.replace(/:/g, '_')}${shot ? '-' + clicks : ''}.png` }); shot = true; }
      const sig = JSON.stringify(st); same = sig === lastSig ? same + 1 : 0; lastSig = sig;
      if (st.k === 'click') {
        try { await p.$eval(st.sel, e => e.click()); clicks++; } catch (e) {}   // 直接對元素點，不會點到剛跳出來的貼紙畫面
        if (st.wrong) { wrongDone = true; await p.waitForTimeout(600); }
        await p.waitForTimeout(260);
      }
      if (same > 300) { fails.push(`${job} 卡住：${sig.slice(0, 140)}`); break; }
    }
    console.log(`${name} ${job} ${ok ? 'done' : 'FAIL'} ${Math.round((Date.now() - t0) / 1000)}s clicks=${clicks}`);
    if (!ok) { await p.screenshot({ path: `${OUT}/M-${name}-FAIL-${job.replace(/:/g, '_')}.png` }); if (!fails.some(f => f.startsWith(job + ' '))) fails.push(`${job} 逾時`); }
  }
  console.log(name, 'errors', JSON.stringify(errs.slice(0, 8)), 'fails', JSON.stringify(fails));
  await b.close();
  process.exit(errs.length || fails.length ? 1 : 0);
})();
