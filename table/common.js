/* 棋牌桌遊專區 · 共用工具（全域 TB） */
(function () {
  'use strict';
  const NS = 'tb:';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) {} },
  };

  // ---- 音效（WebAudio 合成，不需要音檔） ----
  let ac = null, muted = store.get('muted', false);
  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, dur, type, vol, when, slide) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, when, hp) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + (when || 0);
    const b = a.createBuffer(1, Math.max(1, a.sampleRate * dur | 0), a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const s = a.createBufferSource(); s.buffer = b;
    const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800;
    const g = a.createGain(); g.gain.value = vol || 0.3;
    s.connect(f).connect(g).connect(a.destination); s.start(t);
  }
  const SFX = {
    place() { noise(0.06, 0.5, 0, 1500); tone(180, 0.08, 'sine', 0.25); },      // 落子（木頭聲）
    capture() { noise(0.09, 0.6, 0, 900); tone(140, 0.12, 'triangle', 0.3); },
    flip() { noise(0.04, 0.35, 0, 2500); },                                      // 翻牌/翻棋
    deal() { noise(0.035, 0.25, 0, 3000); },
    click() { tone(900, 0.03, 'square', 0.05); },
    select() { tone(660, 0.05, 'sine', 0.12); },
    bad() { tone(200, 0.12, 'square', 0.08, 0, 150); },
    check() { tone(880, 0.1, 'triangle', 0.18); tone(1175, 0.15, 'triangle', 0.18, 0.1); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, i * 0.11)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'sine', 0.16, i * 0.15)); },
    draw() { tone(523, 0.2, 'sine', 0.15); tone(523, 0.3, 'sine', 0.15, 0.2); },
    boom() { noise(0.5, 0.8, 0, 120); tone(90, 0.5, 'sawtooth', 0.25, 0, 40); },
  };
  function sfx(n) { if (muted) return; try { SFX[n] && SFX[n](); } catch (e) {} }

  // ---- 對話框 ----
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  let openDlg = null;
  function closeDialog() { if (openDlg) { openDlg.remove(); openDlg = null; } }
  /** dialog({title, html, buttons:[{label, primary, value, onClick}], dismiss:true}) → Promise(value) */
  function dialog(o) {
    closeDialog();
    return new Promise(res => {
      const over = document.createElement('div'); over.className = 'tb-over';
      const dlg = document.createElement('div'); dlg.className = 'tb-dlg'; dlg.setAttribute('role', 'dialog');
      dlg.innerHTML = (o.title ? '<h3>' + esc(o.title) + '</h3>' : '') + (o.html || '') + '<div class="tb-acts"></div>';
      const acts = dlg.querySelector('.tb-acts');
      (o.buttons || [{ label: '好', primary: true }]).forEach(b => {
        const el = document.createElement('button'); el.className = 'tb-btn' + (b.primary ? ' primary' : '');
        el.textContent = b.label;
        el.onclick = () => { sfx('click'); if (b.onClick && b.onClick(dlg) === false) return; closeDialog(); res(b.value !== undefined ? b.value : b.label); };
        acts.appendChild(el);
      });
      // 分段選擇按鈕
      dlg.querySelectorAll('.tb-seg').forEach(seg => seg.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); sfx('click');
      }));
      if (o.dismiss !== false) over.addEventListener('click', e => { if (e.target === over) { closeDialog(); res(null); } });
      over.appendChild(dlg); document.body.appendChild(over); openDlg = over;
      const p = acts.querySelector('.primary'); if (p) p.focus({ preventScroll: true });
    });
  }
  /** seg('名稱', 'key', [[value,label],...], current) → HTML 字串；讀值用 segVal(dlg,'key') */
  function seg(label, key, opts, cur) {
    return '<div class="tb-field"><label>' + esc(label) + '</label><div class="tb-seg" data-key="' + key + '">' +
      opts.map(([v, l]) => '<button type="button" data-v="' + esc(v) + '" aria-pressed="' + (String(v) === String(cur)) + '">' + esc(l) + '</button>').join('') + '</div></div>';
  }
  function segVal(dlg, key) { const b = dlg.querySelector('.tb-seg[data-key="' + key + '"] button[aria-pressed=true]'); return b ? b.dataset.v : null; }

  let toastT = 0;
  function toast(msg, ms) {
    document.querySelectorAll('.tb-toast').forEach(x => x.remove());
    const t = document.createElement('div'); t.className = 'tb-toast'; t.textContent = msg; document.body.appendChild(t);
    clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms || 1800);
  }

  // ---- 戰績 ----
  function stats(game) { return store.get('stats:' + game, {}); }
  function bump(game, key, n) { const s = stats(game); s[key] = (s[key] || 0) + (n == null ? 1 : n); store.set('stats:' + game, s); checkBadges(); return s; }
  function statsHtml(items) { return '<div class="tb-stats">' + items.map(([l, v]) => '<div><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>').join('') + '</div>'; }

  // ---- 成就徽章：戰績有變動時，延遲載入 badges.js 檢查，新取得的跳出通知 ----
  const BADGE_SRC = (() => { try { const c = document.currentScript; return c && c.src ? c.src.replace(/common\.js(\?.*)?$/, 'badges.js') : 'badges.js'; } catch (e) { return 'badges.js'; } })();
  let badgeLoad = null, badgeT = 0;
  function loadBadges() {
    if (window.TBBadges) return Promise.resolve(window.TBBadges);
    if (!badgeLoad) badgeLoad = new Promise(res => {
      const sc = document.createElement('script'); sc.src = BADGE_SRC; sc.async = true;
      sc.onload = () => res(window.TBBadges || null); sc.onerror = () => res(null);
      document.head.appendChild(sc);
    });
    return badgeLoad;
  }
  function badgeToast(b) {
    try {
      const t = document.createElement('div'); t.className = 'tb-badge-toast';
      t.innerHTML = '<span class="i">' + esc(b.i) + '</span><span><small>獲得成就</small><b>' + esc(b.n) + '</b></span>';
      t.onclick = () => { location.href = BADGE_SRC.replace(/badges\.js$/, 'badges.html'); };
      document.body.appendChild(t); sfx('win');
      setTimeout(() => t.classList.add('out'), 3600); setTimeout(() => t.remove(), 4200);
    } catch (e) { }
  }
  function checkBadges() {
    clearTimeout(badgeT);
    badgeT = setTimeout(() => {
      loadBadges().then(B => {
        if (!B) return;
        const { fresh } = B.evaluate();
        fresh.slice(0, 3).forEach((b, i) => setTimeout(() => badgeToast(b), 600 + i * 1500));
      }).catch(() => { });
    }, 400);
  }
  // 第一次用到這個功能時，先把已經達成的徽章默默記下，之後新達成的才跳通知
  try {
    if (localStorage.getItem('tb:badges') == null) {
      const prime = () => loadBadges().then(B => { if (B) B.primeSilently(); }).catch(() => { });
      (window.requestIdleCallback || (f => setTimeout(f, 1500)))(prime);
    }
  } catch (e) { }

  // ---- 等級分（跟電腦下棋的天梯）----
  // 每個電腦強度有固定分數（最弱 600、最強 1900），用 Elo 公式更新自己的等級分。
  const TITLES = [[0, '新手'], [700, '見習棋士'], [850, '三級棋士'], [1000, '二級棋士'], [1150, '一級棋士'], [1300, '初段'], [1450, '二段'], [1600, '三段'], [1750, '四段'], [1900, '五段']];
  const eloTitle = r => { let t = TITLES[0][1]; for (const [m, n] of TITLES) if (r >= m) t = n; return t; };
  const eloOpp = (i, n) => Math.round(600 + 1300 * (n > 1 ? i / (n - 1) : 0));
  const elo = {
    get(game) { return store.get('elo:' + game, null); },
    title: eloTitle,
    /** lv：0 起算的電腦強度；n：強度數；score：1 贏 / 0.5 和 / 0 輸 */
    update(game, lv, n, score) {
      const o = store.get('elo:' + game, { r: 800, n: 0, best: 800 }), opp = eloOpp(lv, n);
      const exp = 1 / (1 + Math.pow(10, (opp - o.r) / 400)), K = o.n < 10 ? 48 : 28;
      const before = eloTitle(o.r), d = Math.round(K * (score - exp));
      o.r = Math.max(100, o.r + d); o.n++; o.best = Math.max(o.best || 0, o.r);
      store.set('elo:' + game, o);
      const t = eloTitle(o.r);
      return { r: o.r, d, title: t, promoted: t !== before && d > 0, demoted: t !== before && d < 0 };
    },
    html(res) {
      return '<div class="tb-elo"><span>等級分</span><b>' + res.r + '</b><em class="' + (res.d >= 0 ? 'up' : 'dn') + '">' + (res.d >= 0 ? '+' : '') + res.d + '</em><span>· ' + esc(res.title) + '</span></div>' +
        (res.promoted ? '<p class="tb-elo-up">🎉 升級了！現在是「' + esc(res.title) + '」</p>' : '');
    },
    /** 新局對話框裡的建議 */
    hint(game, names) {
      const o = store.get('elo:' + game, null);
      if (!o) return '<p class="tb-elo-hint">跟電腦下完一盤就會有<b>等級分</b>，贏強的電腦加比較多分。</p>';
      let best = 0, bd = 1e9; names.forEach((_, i) => { const d = Math.abs(eloOpp(i, names.length) - (o.r + 60)); if (d < bd) { bd = d; best = i; } });
      return '<p class="tb-elo-hint">你的等級分 <b>' + o.r + '</b>（' + esc(eloTitle(o.r)) + '），建議挑戰「<b>' + esc(names[best]) + '</b>」。</p>';
    },
    stat(game) { const o = store.get('elo:' + game, null); return o ? [['等級分', o.r], ['稱號', eloTitle(o.r)], ['最高', o.best || o.r]] : []; },
  };

  // ---- 把一個函式放進 Web Worker（電腦思考不卡畫面）----
  /** worker(fn) — fn(self) 會在 worker 內執行並自行設定 onmessage。回傳 {ask(msg)→Promise, kill()} */
  function worker(fn) {
    let w = null, seq = 0; const pend = new Map();
    function make() {
      const src = '(' + fn.toString() + ')(self);\n' +
        'const __h=self.onmessage;self.onmessage=async e=>{const{id,msg}=e.data;try{const r=await __h({data:msg});self.postMessage({id,r})}catch(err){self.postMessage({id,err:String(err)})}};';
      try {
        w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
        w.onmessage = e => { const p = pend.get(e.data.id); if (!p) return; pend.delete(e.data.id); e.data.err ? p.rej(e.data.err) : p.res(e.data.r); };
      } catch (e) { w = null; }
    }
    make();
    return {
      ask(msg) {
        if (!w) { // 不支援 worker 時退回主執行緒
          const scope = {}; fn(scope); return Promise.resolve(scope.onmessage({ data: msg }));
        }
        return new Promise((res, rej) => { const id = ++seq; pend.set(id, { res, rej }); w.postMessage({ id, msg }); });
      },
      kill() { if (w) w.terminate(); pend.clear(); make(); },
    };
  }

  // ---- 工具列：靜音按鈕 ----
  function wireBar() {
    const m = document.getElementById('tb-mute');
    if (m) {
      const upd = () => { m.textContent = muted ? '🔇' : '🔊'; m.title = muted ? '開啟音效' : '關閉音效'; };
      upd(); m.onclick = () => { muted = !muted; store.set('muted', muted); upd(); if (!muted) sfx('click'); };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireBar); else wireBar();
  // 網址列收合/展開時，看得到的高度會變：通知各遊戲重新排版
  // --appH = 實際看得到的高度（舊版瀏覽器不支援 dvh 時也正確）
  const setAppH = () => { try { document.documentElement.style.setProperty('--appH', Math.round(window.innerHeight) + 'px'); } catch (e) {} };
  setAppH();
  addEventListener('resize', setAppH);
  addEventListener('orientationchange', () => setTimeout(() => { setAppH(); dispatchEvent(new Event('resize')); }, 250));
  if (window.visualViewport) {
    let vvH = visualViewport.height, vvT = 0;
    visualViewport.addEventListener('resize', () => {
      if (Math.abs(visualViewport.height - vvH) < 2) return; vvH = visualViewport.height;
      clearTimeout(vvT); vvT = setTimeout(() => { setAppH(); dispatchEvent(new Event('resize')); }, 60);
    });
  }
  // 第一次互動時解鎖音效（iOS）
  addEventListener('pointerdown', () => ctx(), { once: true });

  window.TB = { store, sfx, dialog, closeDialog, seg, segVal, toast, stats, bump, statsHtml, worker, esc, elo, checkBadges,
    get muted() { return muted; } };
})();
