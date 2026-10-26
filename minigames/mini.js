// 噗噗的遊戲小屋 — tiny shared helpers for every mini game (no libraries)
'use strict';
const MG = (() => {
  // 版號：每次合併更新時一起改（修正 → 第三碼 +1；新遊戲／新功能 → 第二碼 +1）
  const VERSION = '1.40.0', BUILT = '2026/10/26';
  const LS = 'puputown.';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch {} },
  };

  // ---------- top bar ----------
  const stats = {};
  function init({ id, title, stats: list = [] }) {
    document.body.classList.add('game');
    const bar = document.createElement('header');
    bar.className = 'mg-bar';
    bar.innerHTML = `<a class="back" href="index.html" aria-label="回遊戲小屋" title="回遊戲小屋"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3.5 11.2 12 4l8.5 7.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9.2c0 .5.4.8.8.8H10v-5.2h4V20h3.2c.4 0 .8-.3.8-.8V10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg></a><h1></h1>` +
      list.map(s => `<span class="stat" data-s="${s}"></span>`).join('') +
      `<button type="button" class="bigb" aria-label="大字模式" title="👓 大字模式">👓</button><button type="button" class="mute" aria-label="音效開關"></button>`;
    bar.querySelector('h1').textContent = heroText(title);
    document.body.prepend(bar);
    list.forEach(s => stats[s] = bar.querySelector(`[data-s="${s}"]`));
    const mb = bar.querySelector('.mute');
    const showMute = () => mb.textContent = muted ? '🔇' : '🔊';
    mb.onclick = () => { muted = !muted; store.set('muted', muted); showMute(); };
    showMute();
    const bb = bar.querySelector('.bigb'), showBig = () => bb.setAttribute('aria-pressed', big);
    bb.onclick = () => { setBig(!big); showBig(); sfx('click'); toast(big ? '👓 大字模式' : '大字模式關閉'); };
    addEventListener('mg-big', showBig); showBig();
    // remember the game was played (the hub shows a "玩過" mark)
    const seen = store.get('seen', {}); seen[id] = Date.now(); store.set('seen', seen);
    // how many times each game was opened (the hub dresses 噗噗 from this)
    const plays = store.get('plays', {}); plays[id] = (plays[id] || 0) + 1; store.set('plays', plays);
    document.title = heroText(title + ' · 噗噗的遊戲小屋');
  }
  // 第 8 關 → 🚩 8 (a big number reads better than words, esp. in 大字模式)
  function stat(name, text) {
    if (!stats[name]) return;
    const m = /^第\s*(\d+)\s*(關|天)$/.exec(String(text).trim());
    stats[name].textContent = m ? `${m[2] === '天' ? '☀️' : '🚩'} ${m[1]}` : text;
    if (m) stats[name].setAttribute('aria-label', text);
  }

  // ---------- canvas fit ----------
  const BORDER = 3, MAX_PIX = 2.1e6;   // about 1800×1170 real pixels
  // w,h can be numbers, or w can be a function(stageW, stageH) returning [w, h] so the game can pick a layout
  const FITTED = new Set();
  // …and every frame, before the game draws, put the base scale back if anything changed it
  function guardCanvases() {
    for (const c of FITTED) {
      const g = c.getContext('2d'), px = c._mgScale; if (!g || !px || !g.getTransform) continue;
      const m = g.getTransform();
      if (Math.abs(m.a - px) > 1e-3 || Math.abs(m.d - px) > 1e-3 || m.b || m.c || Math.abs(m.e) > 1e-3 || Math.abs(m.f) > 1e-3) g.setTransform(px, 0, 0, px, 0, 0);
      if (c.width !== Math.round(c.lw * px)) { const r = c._mgRefit; if (r) r(); }
    }
  }
  function fit(canvas, w0, h0) {
    const stage = canvas.parentElement;
    let w = w0, h = h0;
    const doFit = () => {
      if (typeof w0 === 'function') { [w, h] = w0(stage.clientWidth, stage.clientHeight); }
      canvas.lw = w; canvas.lh = h;
      const cs = getComputedStyle(stage);
      const aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - BORDER * 2;
      const ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - BORDER * 2;
      const s = Math.max(0.1, Math.min(aw / w, ah / h));
      canvas.style.width = Math.floor(w * s) + 'px';
      canvas.style.height = Math.floor(h * s) + 'px';
      // backing store: match the screen's real pixels, but cap the total so big tablets stay smooth
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      let px = s * dpr;
      if (w * h * px * px > MAX_PIX) px = Math.sqrt(MAX_PIX / (w * h));
      px = Math.max(1, Math.min(px, s * dpr), Math.min(s, 1.5));
      px = Math.round(px * 100) / 100;
      canvas.width = Math.round(w * px); canvas.height = Math.round(h * px);
      canvas.getContext('2d').setTransform(px, 0, 0, px, 0, 0);
      canvas._mgScale = px;
      if (canvas.onfit) canvas.onfit();
    };
    addEventListener('resize', doFit);
    addEventListener('orientationchange', () => setTimeout(doFit, 120));
    // iPad Safari can throw away a canvas's drawing state (memory pressure, coming back from another app):
    // the scale is lost and the whole game shrinks into the top-left corner. Re-fit when that happens…
    canvas.addEventListener('contextrestored', doFit);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(doFit, 60); });
    addEventListener('pageshow', () => setTimeout(doFit, 60));
    FITTED.add(canvas);
    doFit();
    canvas._mgRefit = doFit;
    canvas.logical = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left - BORDER) * w / (r.width - BORDER * 2), y: (e.clientY - r.top - BORDER) * h / (r.height - BORDER * 2) };
    };
    return doFit;
  }

  // ---------- start / result panel ----------
  let over;
  // ---------- menu size: bigger on tablets, plus the kid/parent's A− A＋ choice ----------
  const ZS = [0.85, 1, 1.15, 1.3, 1.5];
  let zi = Math.max(0, Math.min(ZS.length - 1, store.get('uiZoom', 1) | 0));
  // 👓 大字模式 (for grandparents / weaker eyes): bigger words and buttons everywhere, stronger contrast, calmer motion
  let HERO = store.get('hero', 'pupu') === 'niu' ? 'niu' : 'pupu';
  let big = !!store.get('bigMode', false);
  function applyUI() {
    const m = Math.min(innerWidth, innerHeight), auto = Math.max(1, Math.min(1.3, m / 680));
    document.documentElement.style.setProperty('--ui', (auto * ZS[zi] * (big ? 1.3 : 1)).toFixed(3));
    document.documentElement.classList.toggle('mg-big', big);
    document.documentElement.classList.toggle('hero-niu', HERO === 'niu');
  }
  function setBig(v) { big = !!v; store.set('bigMode', big); applyUI(); dispatchEvent(new Event('mg-big')); dispatchEvent(new Event('resize')); }
  applyUI(); addEventListener('resize', applyUI);
  // offline: a service worker keeps a copy of every page so the games also work without internet (sw.js)
  const swReady = ('serviceWorker' in navigator) && (location.protocol === 'https:' || location.hostname === 'localhost')
    ? navigator.serviceWorker.register(new URL('sw.js', document.currentScript ? document.currentScript.src : location.href).href).catch(() => null) : Promise.resolve(null);
  function zoomRow() {
    const row = document.createElement('div'); row.className = 'mg-zoom';
    row.innerHTML = '<span>字的大小</span><button type="button" data-z="-1" aria-label="字變小">A−</button><button type="button" data-z="1" aria-label="字變大">A＋</button>';
    const sync = () => { row.querySelector('[data-z="-1"]').disabled = zi === 0; row.querySelector('[data-z="1"]').disabled = zi === ZS.length - 1; };
    row.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      { zi = Math.max(0, Math.min(ZS.length - 1, zi + +b.dataset.z)); store.set('uiZoom', zi); applyUI(); }
      sync(); sfx('click');
    };
    sync(); row.insertAdjacentHTML('beforeend', `<span class="mg-ver">v${VERSION}</span>`); return row;
  }
  function panel({ title, html = '', buttons = [], keys = '' }) {
    // a fresh overlay every time it reopens: some tablets (iPad Safari) keep a stale, unscrollable layer for an overlay that was hidden and shown again
    if (over && over.hidden) { over.remove(); over = null; }
    if (!over) { over = document.createElement('div'); over.className = 'mg-over'; document.body.append(over); }
    over.innerHTML = `<div class="mg-card" role="dialog" aria-modal="true"><h2></h2><div class="mg-body">${heroText(html)}</div><div class="mg-btns"></div>` +
      (keys ? `<div class="mg-keys">${keys}</div>` : '') + `</div>`;
    over.querySelector('h2').textContent = heroText(title);
    over.querySelector('.mg-card').append(zoomRow());
    const box = over.querySelector('.mg-btns');
    buttons.forEach((b, i) => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'mg-btn' + (b.alt ? ' alt' : ''); el.textContent = b.label;
      el.onclick = () => { sfx('click'); unlock(); b.on(); };
      box.append(el);
      if (i === 0) setTimeout(() => el.focus({ preventScroll: true }), 30);
    });
    over.hidden = false;
  }
  function hide() { if (over) over.hidden = true; paused = null; }
  const panelOpen = () => over && !over.hidden;

  // ---------- finger scrolling fallback for the menu ----------
  // after a game some tablets stop scrolling the menu natively (the game's touch handling / pointer capture leaves the page "locked").
  // We watch one-finger drags on the overlay; if the browser didn't move it, we move it ourselves.
  {
    let ts = null;
    const opt = { passive: true, capture: true };
    addEventListener('touchstart', e => {
      const o = e.target.closest && e.target.closest('.mg-over');
      ts = o && e.touches.length === 1 ? { o, y: e.touches[0].clientY, st: o.scrollTop, on: false } : null;
    }, opt);
    addEventListener('touchmove', e => {
      if (!ts || e.touches.length !== 1) { ts = null; return; }
      const dy = e.touches[0].clientY - ts.y;
      if (!ts.on && Math.abs(dy) < 8) return;
      ts.on = true;
      const o = ts.o, max = Math.max(0, o.scrollHeight - o.clientHeight), want = Math.max(0, Math.min(max, ts.st - dy));
      requestAnimationFrame(() => { if (ts && ts.o === o && Math.abs(o.scrollTop - want) > 24) o.scrollTop = want; });
    }, opt);
    const end = () => { ts = null; };
    addEventListener('touchend', end, opt); addEventListener('touchcancel', end, opt);
  }

  // ---------- taps on menu buttons while another finger rests on the screen ----------
  // touch screens make no 'click' when a second finger is down (a kid's other hand on the piano, the board…),
  // so the menu looked frozen. A short touch on a menu / top-bar button clicks it right away; the late native click is dropped.
  let tapDown = null, synth = null;
  const tapTarget = el => el && el.closest && el.closest('.mg-over button, .mg-bar button, .mg-bar a');
  addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; const b = tapTarget(e.target); if (b) tapDown = { b, id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; }, true);
  addEventListener('pointercancel', e => { if (tapDown && tapDown.id === e.pointerId) tapDown = null; }, true);
  addEventListener('pointerup', e => {
    if (!tapDown || tapDown.id !== e.pointerId) return;
    const d = tapDown; tapDown = null;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14 || performance.now() - d.t > 900) return;   // a scroll or a long press, not a tap
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!d.b.isConnected || d.b.disabled || tapTarget(under) !== d.b) return;
    synth = { b: d.b, t: performance.now() };
    d.b.click();
  }, true);
  addEventListener('click', e => {
    if (!synth || !e.isTrusted) return;
    if (performance.now() - synth.t < 800 && (e.target === synth.b || synth.b.contains(e.target) || tapTarget(e.target) === synth.b || !synth.b.isConnected)) { e.preventDefault(); e.stopImmediatePropagation(); }
    synth = null;
  }, true);

  // ---------- best scores ----------
  function best(id) { return store.get('best.' + id, null); }
  function record(id, score, lowerIsBetter = false) {
    const old = best(id);
    const isNew = old == null || (lowerIsBetter ? score < old : score > old);
    if (isNew) store.set('best.' + id, score);
    return { best: isNew ? score : old, isNew, old };
  }

  // ---------- sounds (WebAudio blips) ----------
  let ac = null, muted = store.get('muted', false);
  function unlock() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  addEventListener('pointerdown', unlock, { once: true });
  addEventListener('keydown', unlock, { once: true });
  function tone(f0, f1, dur, type = 'square', vol = 0.12, delay = 0) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const SFX = {
    click: () => tone(660, 880, 0.06, 'square', 0.06),
    pop: () => tone(520, 1040, 0.09, 'square', 0.09),
    good: () => { tone(660, 660, 0.08, 'square', 0.08); tone(990, 990, 0.12, 'square', 0.08, 0.08); },
    bad: () => tone(220, 90, 0.25, 'sawtooth', 0.1),
    hit: () => tone(180, 60, 0.12, 'square', 0.12),
    jump: () => tone(300, 700, 0.12, 'triangle', 0.14),
    step: () => tone(240, 200, 0.04, 'triangle', 0.08),
    flip: () => tone(420, 520, 0.05, 'triangle', 0.1),
    place: () => tone(300, 240, 0.06, 'triangle', 0.12),
    tick: () => tone(900, 900, 0.025, 'triangle', 0.04),
    clear: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.09, 'square', 0.07, i * 0.06)); },
    over: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.16, 'triangle', 0.13, i * 0.14)); },
    win: () => { [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.12, 'square', 0.07, i * 0.1)); },
    // --- softer, "juicier" sounds for matches and rewards (n = combo / chain size, bigger = higher & richer) ---
    match: (n = 1) => { const k = Math.min(n, 8), base = 660 * Math.pow(2, (k - 1) / 12 * 2); [0, 4, 7, 12].forEach((st, i) => bell(base * Math.pow(2, st / 12), 0.35, 0.09, i * 0.045)); if (k >= 3) sparkle(0.16); },
    combo: (n = 2) => { const k = Math.min(n, 10); for (let i = 0; i < Math.min(k, 6); i++) bell(523 * Math.pow(2, (i * 2 + k) / 12), 0.22, 0.07, i * 0.05); },
    sparkle: () => sparkle(0),
    coin: () => { tone(988, 988, 0.07, 'square', 0.05); tone(1319, 1319, 0.22, 'square', 0.05, 0.07); },
    boing: () => { if (!ac || muted) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.08); o.frequency.exponentialRampToValueAtTime(260, t + 0.22); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.3); },
    whoosh: () => noise(0.25, 400, 3000, 0.08),
    yay: () => { [523, 659, 784, 1046, 1319].forEach((f, i) => bell(f, 0.5, 0.08, i * 0.07)); noise(0.35, 2000, 6000, 0.03, 0.3); },
    perfect: () => { bell(1046, 0.3, 0.08); bell(1568, 0.3, 0.06, 0.03); },
    miss: () => tone(200, 150, 0.12, 'sine', 0.08),
  };
  // a soft bell: sine + quiet octave partial with a fast attack and long-ish decay
  function bell(f, dur = 0.3, vol = 0.08, delay = 0) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    for (const [mul, v] of [[1, 1], [2, 0.35], [3.01, 0.12]]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * mul, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    }
  }
  let noiseBuf = null;
  function noise(dur, f0, f1, vol = 0.06, delay = 0) {
    if (!ac || muted) return;
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ac.currentTime + delay, src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(bp).connect(g).connect(ac.destination); src.start(t); src.stop(t + dur + 0.02);
  }
  function sparkle(delay = 0) { for (let i = 0; i < 5; i++) bell(1800 + Math.random() * 1600, 0.18, 0.025, delay + i * 0.035); }
  // 牛牛's bell: a soft 叮噹 on top of every jump
  function sfx(name, arg) { if (SFX[name]) SFX[name](arg); if (HERO === 'niu' && name === 'jump') { tone(1568, 1568, 0.18, 'sine', 0.05, 0.02); tone(1175, 1175, 0.22, 'sine', 0.045, 0.12); } }

  // ---------- short feedback words: English + emoji so kids who can't read Chinese yet still get them ----------
  // praise(level): 1 Good → 5 Fantastic ; JUDGE: rhythm-style hit words
  const PRAISE = ['Good! 👍', 'Great! ✨', 'Super! ⭐', 'Amazing! 🌟', 'Fantastic! 🎉'];
  function praise(level = 1) { if (HERO === 'niu' && level >= 3 && Math.random() < 0.3) return 'Moo! 🐮'; return PRAISE[Math.max(0, Math.min(PRAISE.length - 1, level - 1))]; }
  const WORDS = { perfect: 'Perfect! 🌟', great: 'Great! ✨', good: 'Good! 👍', miss: 'Miss 💨', oops: 'Oops! 🙈', tryAgain: 'Try again! 🔁', yes: 'Yes! ✅', no: 'No ❌', combo: n => `Combo ×${n} 🔥`, chain: n => `Chain ×${n} ⚡`, bonus: n => `+${n} ⭐`, levelUp: 'Level up! 🚀', clear: 'Clear! 🎉', wait: 'Wait… ⏳', full: 'Full! 🈵', hint: '💡', stuck: 'No moves 🔄' };

  // ---------- toast ----------
  let toastEl, toastT;
  function toast(text, ms = 1200) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'mg-toast'; document.body.append(toastEl); }
    toastEl.textContent = heroText(text); toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
  }

  // ---------- main loop (dt in seconds, paused while the tab is hidden) ----------
  function loop(fn) {
    let last = performance.now(), running = true;
    const tick = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      requestAnimationFrame(tick);         // keep going even if one frame throws
      if (paused) return;                  // frozen while the pause menu is open
      try { guardCanvases(); } catch {}
      try { fn(dt, now / 1000); } catch (err) { if (!loop.warned) { loop.warned = true; console.error(err); } }
    };
    document.addEventListener('visibilitychange', () => { last = performance.now(); });
    requestAnimationFrame(tick);
    return { stop() { running = false; } };
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // Jelly colour palettes: [highlight, light, mid, dark, outline]
  const JELLY = {
    green: ['#c8ffc9', '#6fdc83', '#3cb85a', '#2a9447', '#1f6e35'],
    pink: ['#ffe0ec', '#ff9cc2', '#f06a9e', '#cf4a80', '#9a2f5d'],
    blue: ['#dff1ff', '#8fcaff', '#4c9cf0', '#2f78cf', '#1d4f9e'],
    yellow: ['#fff8cf', '#ffe36b', '#ffc93a', '#e8a400', '#a87400'],
    purple: ['#efe2ff', '#c3a2ff', '#9a72f0', '#7a52d0', '#4f2f9a'],
    orange: ['#ffe9d4', '#ffb877', '#ff8c3a', '#e06a1c', '#a04510'],
    red: ['#ffe0dc', '#ff8f84', '#f2564a', '#d03a30', '#8e2018'],
    mint: ['#e0fff6', '#8ff0d6', '#3fd2b0', '#22ad8e', '#147a62'],
  };

  // Draw the mascot 噗噗 — a glossy green jelly with a leaf on top.
  // mood: 'happy' | 'ouch' | 'wow' | 'sleep'; squash: >0 flattens, <0 stretches; opts.look: -1..1 eye direction, opts.arms

  // ---------- 主角：噗噗 or 牛牛 (picked on the 遊戲小屋 hub; every game follows) ----------
  const heroName = () => HERO === 'niu' ? '牛牛' : '噗噗';
  // 噗噗 → 牛牛 in names and menus (the pink friend stays 粉紅噗噗; 「綠色噗噗」 is just 牛牛 now)
  const heroText = t => HERO === 'niu' && typeof t === 'string' ? t.replace(/綠色噗噗/g, '牛牛').replace(/(粉紅|粉紅色|電腦)?噗噗/g, (m, pre) => pre ? m : '牛牛') : t;
  // 牛牛 mode: words drawn on canvases and written into the page follow the hero too
  if (HERO === 'niu') {
    for (const k of ['fillText', 'strokeText', 'measureText']) {
      const orig = CanvasRenderingContext2D.prototype[k];
      CanvasRenderingContext2D.prototype[k] = function (t, ...a) { return orig.call(this, typeof t === 'string' && t.includes('噗噗') ? heroText(t) : t, ...a); };
    }
    const fix = n => { const el = n.nodeType === 3 ? n.parentElement : n; if (el && el.closest && el.closest('[data-keep]')) return; if (n.nodeType === 3) { if (n.data.includes('噗噗')) { const v = heroText(n.data); if (v !== n.data) n.data = v; } } else if (n.nodeType === 1 && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE') { for (const c of n.childNodes) fix(c); for (const at of ['aria-label', 'title', 'alt']) { const v = n.getAttribute(at); if (v && v.includes('噗噗') && heroText(v) !== v) n.setAttribute(at, heroText(v)); } } };
    const start = () => { fix(document.body); new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') fix(m.target); else m.addedNodes.forEach(fix); } }).observe(document.body, { childList: true, subtree: true, characterData: true }); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }
  function setHero(v) { HERO = v === 'niu' ? 'niu' : 'pupu'; store.set('hero', HERO); applyUI(); }
  // 牛牛, drawn from one shape list (SVG coords 0..200 × 0..220, ground at y≈194) so the hub's SVGs and the games' canvas match
  const NIU_C = { body: '#fffbf3', spot: '#dba06c', line: '#6b4a35', pink: '#ffc2cf', horn: '#fff0c4', hornL: '#c9a058', ink: '#2a1f1a', snout: '#ffe1dc', snoutL: '#e7a9a4', nos: '#c97f86', ribbon: '#ff5d7a', bell: '#ffc83d', bellL: '#b07a00' };
  const NIU_BODY = 'M22 168 C12 140 16 92 46 74 C64 63 82 60 100 60 C118 60 136 63 154 74 C184 92 188 140 178 168 C170 188 130 194 100 194 C70 194 30 188 22 168Z';
  const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
  const C = NIU_C;
  const NIU_BACK = [
    { d: 'M178 156 Q196 150 192 128', s: C.line, w: 4 },
    { d: 'M192 128 q-8 -4 -6 -12 q6 2 8 -2 q4 8 -2 14z', f: C.spot, s: C.line, w: 2.5 },
    { d: 'M48 82 C38 72 16 70 6 82 C10 98 32 102 48 94 Z', f: C.body, s: C.line, w: 4 },
    { d: 'M42 85 C34 79 20 78 14 85 C18 93 32 95 42 91 Z', f: C.pink },
    { d: 'M152 82 C162 72 184 70 194 82 C190 98 168 102 152 94 Z', f: C.body, s: C.line, w: 4 },
    { d: 'M158 85 C166 79 180 78 186 85 C182 93 168 95 158 91 Z', f: C.pink },
    { d: 'M64 70 C61 58 63 46 72 44 C81 43 84 55 82 66 Z', f: C.horn, s: C.hornL, w: 3.5, horn: 1 },
    { d: ell(70, 52, 3, 4), f: 'rgba(255,255,255,.85)', horn: 1 },
    { d: 'M136 70 C139 58 137 46 128 44 C119 43 116 55 118 66 Z', f: C.horn, s: C.hornL, w: 3.5, horn: 1 },
    { d: ell(126, 52, 3, 4), f: 'rgba(255,255,255,.85)', horn: 1 },
  ];
  const NIU_SPOTS = [ell(152, 90, 22, 22), 'M48 160 C39 154 36 147 41 143.5 C44.5 141.5 47.5 143.5 48 146 C48.5 143.5 51.5 141.5 55 143.5 C60 147 57 154 48 160Z', ell(160, 150, 6, 6)];
  const NIU_FRONT = [
    { d: NIU_BODY, s: C.line, w: 4 },
    { d: 'M92 62 C90 50 104 46 106 54 C108 60 100 62 100 57', s: C.line, w: 3.5 },
    { d: ell(54, 132, 10, 6), f: 'rgba(255,120,150,.4)' }, { d: ell(146, 132, 10, 6), f: 'rgba(255,120,150,.4)' },
  ];
  const NIU_MUZZLE = [
    { d: 'M62 138 C62 128 80 125 100 125 C120 125 138 128 138 138 C138 146 120 149 100 149 C80 149 62 146 62 138Z', f: C.snout, s: C.snoutL, w: 3 },
    { d: 'M78.6 134.2 q2.6 -1 3.2 2.6 q0.4 3.4 -2.2 3.8 q-2.4 0 -2.4 -3 q0 -2.6 1.4 -3.4z', f: C.nos },
    { d: 'M121.4 134.2 q-2.6 -1 -3.2 2.6 q-0.4 3.4 2.2 3.8 q2.4 0 2.4 -3 q0 -2.6 -1.4 -3.4z', f: C.nos },
  ];
  const NIU_RIBBON = [
    { d: 'M34 170 Q100 192 166 170', s: C.ribbon, w: 8 },
    { d: ell(100, 184, 9, 9), f: C.bell, s: C.bellL, w: 3 },
    { d: 'M95 186 h10', s: '#8a5a00', w: 2.5 }, { d: ell(100, 189.5, 1.8, 1.8), f: '#8a5a00' },
  ];
  function niuFace(mood, ex = 0, blink = false) {
    const I = C.ink, out = [];
    const openEyes = () => { for (const x0 of [77, 123]) { out.push({ d: ell(x0 + ex, 108, 9, 12), f: I }, { d: ell(x0 + 3 + ex, 103, 3.6, 3.6), f: '#fff' }, { d: ell(x0 - 2.5 + ex, 113, 1.7, 1.7), f: '#fff' }); } };
    const arcs = up => out.push({ d: up ? `M${68 + ex} 108 Q${78 + ex} 96 ${88 + ex} 108 M${112 + ex} 108 Q${122 + ex} 96 ${132 + ex} 108` : `M${68 + ex} 106 Q${78 + ex} 114 ${88 + ex} 106 M${112 + ex} 106 Q${122 + ex} 114 ${132 + ex} 106`, s: I, w: 4 });
    let mouth = 'smile';
    if (mood === 'wow') { for (const x0 of [78, 122]) out.push({ d: ell(x0 + ex, 104, 11, 11), f: '#fff', s: I, w: 3 }, { d: ell(x0 + ex + (x0 < 100 ? 1 : -1), 105, 6, 6), f: I }); mouth = 'open'; }
    else if (mood === 'ouch') { out.push({ d: 'M70 98 L84 106 L70 114 M130 98 L116 106 L130 114', s: I, w: 4 }); mouth = 'wavy'; }
    else if (mood === 'love') { out.push({ d: 'M78 116 C64 106 66 94 74 94 C77 94 78 97 78 99 C78 97 79 94 82 94 C90 94 92 106 78 116Z', f: '#ff4d7a' }, { d: 'M122 116 C108 106 110 94 118 94 C121 94 122 97 122 99 C122 97 123 94 126 94 C134 94 136 106 122 116Z', f: '#ff4d7a' }); }
    else if (mood === 'sleep') arcs(false);
    else if (mood === 'proud' || mood === 'yay') { arcs(true); mouth = 'grin'; }
    else if (mood === 'wink') { out.push({ d: ell(77 + ex, 108, 9, 12), f: I }, { d: ell(80 + ex, 103, 3.6, 3.6), f: '#fff' }, { d: `M${112 + ex} 108 Q${122 + ex} 96 ${132 + ex} 108`, s: I, w: 4 }); mouth = 'grin'; }
    else if (blink) arcs(true);
    else { openEyes(); if (mood === 'grin') mouth = 'grin'; else if (mood === 'open') mouth = 'open'; }
    if (mood === 'tongue') mouth = 'tongue';
    const M = { smile: [{ d: 'M92 158 Q100 165 108 158', s: C.line, w: 3 }], open: [{ d: ell(100, 161, 5, 4.5), f: '#8a2f45' }], wavy: [{ d: 'M90 160 q3 -3 6 0 q3 3 6 0 q3 -3 6 0', s: C.line, w: 3 }],
      grin: [{ d: 'M89 156 Q100 169 111 156 Z', f: '#8a2f45', s: C.line, w: 2.5 }], tongue: [{ d: 'M92 158 Q100 165 108 158', s: C.line, w: 3 }, { d: 'M97 161 q3 8 6 0z', f: '#ff6f8a' }] };
    return { eyes: out, mouth: M[mouth] };
  }
  // SVG markup of 牛牛 in its 200×220 box (the hub's banner, 我的牛牛 and thumbnails use this)
  function niuSVG(mood = 'happy', o = {}) {
    const sh = x => `<path d="${x.d}"${x.f ? ` fill="${x.f}"` : ' fill="none"'}${x.s ? ` stroke="${x.s}" stroke-width="${x.w}" stroke-linecap="round" stroke-linejoin="round"` : ''}/>`;
    const id = 'nb' + Math.random().toString(36).slice(2, 7), face = niuFace(mood, o.ex || 0, false);
    return (o.noShadow ? '' : `<ellipse cx="100" cy="200" rx="74" ry="9" fill="rgba(60,40,30,.15)"/>`) + NIU_BACK.filter(x => !(o.noHorns && x.horn)).map(sh).join('') +
      `<defs><clipPath id="${id}"><path d="${NIU_BODY}"/></clipPath><radialGradient id="${id}g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${C.body}"/></radialGradient></defs>` +
      `<path d="${NIU_BODY}" fill="url(#${id}g)"/><g clip-path="url(#${id})">${NIU_SPOTS.map(d => `<path d="${d}" fill="${C.spot}"/>`).join('')}</g>` +
      NIU_FRONT.map(sh).join('') + `<ellipse cx="62" cy="86" rx="13" ry="6" fill="rgba(255,255,255,.85)" transform="rotate(-28 62 86)"/>` +
      face.eyes.map(sh).join('') + NIU_MUZZLE.map(sh).join('') + face.mouth.map(sh).join('') + (o.noRibbon ? '' : NIU_RIBBON.map(sh).join(''));
  }
  const P2D = new Map(); const p2 = d => { let q = P2D.get(d); if (!q) { q = new Path2D(d); P2D.set(d, q); } return q; };
  // canvas 牛牛 with MG.puPu's signature: (cx, cy) centre, r ≈ half width, squash, opts.look / arms / noLeaf (= hat on: hide the horns)
  function niuDraw(ctx, cx, cy, r, mood = 'happy', squash = 0, opts = {}) {
    const now = performance.now() / 1000, seed = (cx * 7.3 + cy * 3.1) % 5;
    const blink = (mood === 'happy' || !mood) && ((now + seed) % 3.6) < 0.12;
    const k = r / 84, ex = (opts.look ?? 0) * 6;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(60,40,30,.16)'; ctx.beginPath(); ctx.ellipse(0, r * 0.98, r * (0.95 + squash * 0.4), r * 0.2, 0, 0, 7); ctx.fill();
    ctx.translate(0, r * 0.9); ctx.scale(1 + squash, 1 - squash); ctx.translate(0, -r * 0.9);
    ctx.translate(0, r * 0.97); ctx.scale(k, k); ctx.translate(-100, -194);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const SP = opts.spot || C.spot;
    const draw = x => { const q = p2(x.d); if (x.f) { ctx.fillStyle = x.f === C.spot ? SP : x.f; ctx.fill(q); } if (x.s) { ctx.strokeStyle = x.s; ctx.lineWidth = x.w; ctx.stroke(q); } };
    if (opts.arms) for (const sd of [-1, 1]) { const up = opts.arms === 'up'; ctx.save(); ctx.translate(100 + sd * 82, up ? 112 : 150); ctx.rotate(sd * (up ? -0.9 : 0.4)); ctx.beginPath(); ctx.ellipse(0, 0, 16, 12, 0, 0, 7); ctx.fillStyle = C.body; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); }
    for (const x of NIU_BACK) if (!(opts.hideHorns && x.horn)) draw(x);
    const g = ctx.createRadialGradient(70, 90, 4, 100, 130, 110); g.addColorStop(0, '#ffffff'); g.addColorStop(1, C.body);
    ctx.fillStyle = g; ctx.fill(p2(NIU_BODY));
    ctx.save(); ctx.clip(p2(NIU_BODY)); ctx.fillStyle = SP; for (const d of NIU_SPOTS) ctx.fill(p2(d)); ctx.restore();
    for (const x of NIU_FRONT) draw(x);
    ctx.save(); ctx.translate(62, 86); ctx.rotate(-0.49); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, 7); ctx.fill(); ctx.restore();
    const face = niuFace(mood, ex, blink);
    for (const x of face.eyes) draw(x);
    for (const x of NIU_MUZZLE) draw(x);
    for (const x of face.mouth) draw(x);
    if (!opts.noRibbon) for (const x of NIU_RIBBON) draw(x);
    if (mood === 'ouch') { ctx.fillStyle = 'rgba(120,200,255,.9)'; ctx.beginPath(); ctx.moveTo(156, 92); ctx.quadraticCurveTo(166, 110, 156, 116); ctx.quadraticCurveTo(146, 110, 156, 92); ctx.fill(); }
    if (mood === 'sleep') { ctx.fillStyle = '#7a8ce0'; ctx.font = '900 20px sans-serif'; ctx.fillText('z', 150, 58); ctx.font = '900 15px sans-serif'; ctx.fillText('z', 164, 42); }
    ctx.restore();
  }
  function puPu(ctx, cx, cy, r, mood = 'happy', squash = 0, opts = {}) {
    if (HERO === 'niu' && !opts.jelly && (!opts.pal || opts.pal === JELLY.green)) return niuDraw(ctx, cx, cy, r, mood, squash, opts);
    const now = performance.now() / 1000, seed = (cx * 7.3 + cy * 3.1) % 5;
    const blink = mood === 'happy' && ((now + seed) % 3.6) < 0.12;
    const look = opts.look ?? 0, pal = opts.pal || JELLY.green;
    ctx.save(); ctx.translate(cx, cy);
    // ground shadow (not squashed)
    ctx.fillStyle = 'rgba(30,40,20,.18)'; ctx.beginPath(); ctx.ellipse(0, r * 0.98, r * (0.95 + squash * 0.4), r * 0.2, 0, 0, 7); ctx.fill();
    ctx.translate(0, r * 0.9); ctx.scale(1 + squash, 1 - squash); ctx.translate(0, -r * 0.9);
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.98, r * 0.62);
      ctx.bezierCurveTo(-r * 1.1, -r * 0.25, -r * 0.62, -r * 0.98, 0, -r * 0.98);
      ctx.bezierCurveTo(r * 0.62, -r * 0.98, r * 1.1, -r * 0.25, r * 0.98, r * 0.62);
      ctx.bezierCurveTo(r * 0.98, r * 0.92, r * 0.6, r * 0.98, 0, r * 0.97);
      ctx.bezierCurveTo(-r * 0.6, r * 0.98, -r * 0.98, r * 0.92, -r * 0.98, r * 0.62);
      ctx.closePath();
    };
    // stubby arms behind the body
    if (opts.arms) {
      ctx.fillStyle = pal[2]; ctx.strokeStyle = pal[4]; ctx.lineWidth = Math.max(1, r * 0.07);
      for (const sd of [-1, 1]) { const up = opts.arms === 'up'; ctx.beginPath(); ctx.ellipse(sd * r * 0.98, up ? -r * 0.15 : r * 0.35, r * 0.22, r * 0.16, sd * (up ? -1.1 : 0.5), 0, 7); ctx.fill(); ctx.stroke(); }
    }
    // body gradient + outline
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.08, 0, r * 0.1, r * 1.15);
    g.addColorStop(0, pal[0]); g.addColorStop(0.35, pal[1]); g.addColorStop(0.8, pal[2]); g.addColorStop(1, pal[3]);
    ctx.fillStyle = g; body(); ctx.fill();
    // inner belly glow + translucent lower part (jelly look)
    ctx.save(); body(); ctx.clip();
    const bg = ctx.createRadialGradient(0, r * 0.55, r * 0.05, 0, r * 0.55, r * 0.7); bg.addColorStop(0, 'rgba(220,255,200,.55)'); bg.addColorStop(1, 'rgba(220,255,200,0)');
    ctx.fillStyle = bg; ctx.fillRect(-r, 0, r * 2, r);
    ctx.fillStyle = 'rgba(20,90,40,.18)'; ctx.beginPath(); ctx.ellipse(r * 0.5, r * 0.55, r * 0.7, r * 0.5, 0, 0, 7); ctx.fill();   // core shade
    for (const [bx, by, br] of [[-r * 0.45, r * 0.45, r * 0.06], [r * 0.15, r * 0.65, r * 0.045], [r * 0.55, r * 0.25, r * 0.035]]) {   // bubbles
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = pal[4]; ctx.lineWidth = Math.max(1.2, r * 0.075); body(); ctx.stroke();
    // rim light on the right edge
    ctx.strokeStyle = 'rgba(230,255,220,.55)'; ctx.lineWidth = Math.max(1, r * 0.06); ctx.beginPath(); ctx.arc(0, r * 0.05, r * 0.85, -0.6, 0.6); ctx.stroke();
    if (!opts.noLeaf) {
    // leaf with stem and vein
    ctx.strokeStyle = '#7a5520'; ctx.lineWidth = Math.max(1, r * 0.06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.95); ctx.quadraticCurveTo(r * 0.02, -r * 1.12, r * 0.08, -r * 1.16); ctx.stroke();
    ctx.save(); ctx.translate(r * 0.22, -r * 1.16); ctx.rotate(-0.45 + Math.sin(now * 2.2 + seed) * 0.08);
    const lg = ctx.createLinearGradient(0, -r * 0.14, 0, r * 0.14); lg.addColorStop(0, opts.leaf ? opts.leaf : '#ffd25a'); lg.addColorStop(1, opts.leaf ? opts.leaf : '#f39a12');
    ctx.fillStyle = lg; ctx.strokeStyle = '#b86d00'; ctx.lineWidth = Math.max(0.8, r * 0.05);
    ctx.beginPath(); ctx.moveTo(-r * 0.16, 0); ctx.quadraticCurveTo(r * 0.02, -r * 0.2, r * 0.2, 0); ctx.quadraticCurveTo(r * 0.02, r * 0.2, -r * 0.16, 0); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(184,109,0,.7)'; ctx.beginPath(); ctx.moveTo(-r * 0.12, 0); ctx.lineTo(r * 0.15, 0); ctx.stroke();
    ctx.restore();
    }
    // big glossy highlight
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-r * 0.47, -r * 0.48, r * 0.17, r * 0.1, -0.75, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.66, r * 0.05, 0, 7); ctx.fill();
    // face
    const ink = '#18261a', lw = Math.max(1.2, r * 0.08), ex = look * r * 0.06;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (mood === 'ouch') {
      ctx.strokeStyle = ink; ctx.lineWidth = lw;
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * r * 0.44, -r * 0.2); ctx.lineTo(sd * r * 0.24, -r * 0.08); ctx.lineTo(sd * r * 0.44, r * 0.04); ctx.stroke(); }
      ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(0, r * 0.32, r * 0.13, r * 0.11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff8aa0'; ctx.beginPath(); ctx.ellipse(0, r * 0.37, r * 0.07, r * 0.04, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(120,200,255,.9)'; ctx.beginPath(); ctx.moveTo(r * 0.62, -r * 0.45); ctx.quadraticCurveTo(r * 0.72, -r * 0.28, r * 0.62, -r * 0.22); ctx.quadraticCurveTo(r * 0.52, -r * 0.28, r * 0.62, -r * 0.45); ctx.fill();   // sweat drop
    } else if (mood === 'wink' || mood === 'love' || mood === 'tongue') {
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = lw;
      if (mood === 'love') for (const sd of [-1, 1]) {
        const hx = sd * r * 0.32 + ex, hy = -r * 0.08, hs = r * 0.15;
        ctx.fillStyle = '#ff4f7a'; ctx.beginPath(); ctx.moveTo(hx, hy + hs * 0.9);
        ctx.bezierCurveTo(hx - hs * 1.4, hy - hs * 0.2, hx - hs * 0.6, hy - hs * 1.3, hx, hy - hs * 0.4);
        ctx.bezierCurveTo(hx + hs * 0.6, hy - hs * 1.3, hx + hs * 1.4, hy - hs * 0.2, hx, hy + hs * 0.9); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(hx - hs * 0.45, hy - hs * 0.45, hs * 0.22, 0, 7); ctx.fill();
      } else {
        // left eye open, right eye closed (wink) or both open (tongue)
        ctx.beginPath(); ctx.ellipse(-r * 0.32 + ex, -r * 0.08, r * 0.11, r * 0.16, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.32 + ex - r * 0.035, -r * 0.15, r * 0.05, 0, 7); ctx.fill(); ctx.fillStyle = ink;
        if (mood === 'wink') { ctx.beginPath(); ctx.moveTo(r * 0.2 + ex, -r * 0.06); ctx.quadraticCurveTo(r * 0.32 + ex, -r * 0.18, r * 0.44 + ex, -r * 0.06); ctx.stroke(); }
        else { ctx.beginPath(); ctx.ellipse(r * 0.32 + ex, -r * 0.08, r * 0.11, r * 0.16, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.32 + ex - r * 0.035, -r * 0.15, r * 0.05, 0, 7); ctx.fill(); }
      }
      ctx.strokeStyle = ink; ctx.lineWidth = lw;
      if (mood === 'tongue') {
        ctx.beginPath(); ctx.moveTo(-r * 0.18, r * 0.2); ctx.lineTo(r * 0.18, r * 0.2); ctx.stroke();
        ctx.fillStyle = '#ff6f8a'; ctx.beginPath(); ctx.moveTo(-r * 0.09, r * 0.2); ctx.lineTo(r * 0.09, r * 0.2); ctx.quadraticCurveTo(r * 0.1, r * 0.4, 0, r * 0.4); ctx.quadraticCurveTo(-r * 0.1, r * 0.4, -r * 0.09, r * 0.2); ctx.fill();
        ctx.strokeStyle = '#d04a66'; ctx.lineWidth = Math.max(0.8, lw * 0.5); ctx.beginPath(); ctx.moveTo(0, r * 0.24); ctx.lineTo(0, r * 0.34); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(-r * 0.16, r * 0.17); ctx.quadraticCurveTo(0, r * 0.38, r * 0.16, r * 0.17); ctx.closePath(); ctx.fillStyle = '#7a2a33'; ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,110,140,.5)'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * r * 0.6 + ex * 0.5, r * 0.14, r * 0.14, r * 0.08, 0, 0, 7); ctx.fill(); }
    } else if (mood === 'sleep') {
      ctx.strokeStyle = ink; ctx.lineWidth = lw;
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * r * 0.32, -r * 0.08, r * 0.11, 0.2, Math.PI - 0.2); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, r * 0.26, r * 0.06, r * 0.05, 0, 0, 7); ctx.stroke();
    } else {
      if (blink) { ctx.strokeStyle = ink; ctx.lineWidth = lw; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * r * 0.32 + ex, -r * 0.04, r * 0.11, Math.PI + 0.3, -0.3); ctx.stroke(); } }
      else for (const sd of [-1, 1]) {
        const ey = -r * 0.08, big = mood === 'wow' ? 1.25 : 1;
        ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(sd * r * 0.32 + ex, ey, r * 0.11 * big, r * 0.16 * big, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sd * r * 0.32 + ex - r * 0.035, ey - r * 0.07, r * 0.05 * big, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(sd * r * 0.32 + ex + r * 0.04, ey + r * 0.06, r * 0.022, 0, 7); ctx.fill();
      }
      ctx.strokeStyle = ink; ctx.lineWidth = lw;
      if (mood === 'wow') { ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.1, r * 0.13, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ff8aa0'; ctx.beginPath(); ctx.ellipse(0, r * 0.36, r * 0.06, r * 0.05, 0, 0, 7); ctx.fill(); }
      else {
        ctx.beginPath(); ctx.moveTo(-r * 0.16, r * 0.17); ctx.quadraticCurveTo(0, r * 0.38, r * 0.16, r * 0.17); ctx.closePath();
        ctx.fillStyle = '#7a2a33'; ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff8aa0'; ctx.beginPath(); ctx.ellipse(0, r * 0.27, r * 0.07, r * 0.035, 0, 0, 7); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,110,140,.45)'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * r * 0.6 + ex * 0.5, r * 0.14, r * 0.14, r * 0.08, 0, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }

  // Simple particle pool: MG.fx.burst(x, y, {n, colors, speed, up, size, life, grav, shape}); MG.fx.step(dt); MG.fx.draw(ctx)
  const fx = (() => {
    let ps = [];
    return {
      burst(px, py, o = {}) {
        const n = o.n ?? 10, cols = o.colors ?? ['#fff'];
        for (let i = 0; i < n; i++) {
          const a = o.angle != null ? o.angle + rand(-(o.spread ?? 3.2) / 2, (o.spread ?? 3.2) / 2) : rand(0, Math.PI * 2), sp = rand(0.4, 1) * (o.speed ?? 160);
          ps.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up ?? 60), g: o.grav ?? 500, life: rand(0.6, 1) * (o.life ?? 0.7), max: o.life ?? 0.7,
            s: rand(0.6, 1) * (o.size ?? 4), col: pick(cols), shape: o.shape ?? 'dot', rot: rand(0, 6), vr: rand(-8, 8) });
        }
      },
      step(dt) { for (const p of ps) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= Math.pow(0.4, dt); p.rot += p.vr * dt; p.life -= dt; } ps = ps.filter(p => p.life > 0); },
      draw(ctx) {
        for (const p of ps) {
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.6)); ctx.fillStyle = p.col;
          if (p.shape === 'star') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? p.s * 0.45 : p.s; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.fill(); ctx.restore(); }
          else if (p.shape === 'sq') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); }
          else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); }
        }
        ctx.globalAlpha = 1;
      },
      clear() { ps = []; },
    };
  })();

  // ---------- pause menu: a "選關" button in the bar that works in the middle of a game ----------
  // paused = the function that puts the game back exactly as it was (null when not paused)
  let paused = null;
  function resume() { const r = paused; if (!r) return; paused = null; hide(); r(); }
  // o = { label, playing() → true while a round is running, open(isPause) → shows the menu panel, returns an optional restore fn,
  //       onPause() → optional, called right when a running game gets paused (e.g. to suspend its music) }
  function addResume() {
    const card = over && !over.hidden && over.querySelector('.mg-card');
    if (!card || card.querySelector('.mg-resume')) return;
    const h = card.querySelector('h2');
    h.insertAdjacentHTML('afterend', '<p class="mg-paused">— 遊戲暫停中 —</p>');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mg-btn mg-resume'; b.textContent = '▶ 繼續玩';
    b.onclick = () => { sfx('click'); resume(); };
    h.nextElementSibling.after(b);
    setTimeout(() => b.focus({ preventScroll: true }), 40);
  }
  function pauseMenu(o) {
    const btn = barButton(o.label || '☰ 選關', () => {
      if (paused) return resume();                 // second tap = keep playing
      const was = !!o.playing();
      if (was) paused = () => {};                  // freeze first, so the menu can see we're paused
      if (was && o.onPause) o.onPause();
      const restore = o.open(was);
      if (!was) return;
      if (typeof restore === 'function') paused = restore;
      addResume();
    });
    const [ic, ...rest] = (o.label || '☰ 選關').split(' ');
    btn.el.innerHTML = `${ic}<span class="mg-bl"> ${rest.join(' ')}</span>`;
    btn.el.setAttribute('aria-label', rest.join(' ') || ic);
    btn.el.classList.add('mg-menu');
    btn.show(true);
    return btn;
  }
  // while paused the game must not see keys or touches (key-ups still go through so held keys get released)
  addEventListener('keydown', e => {
    if (!paused) return;
    if (e.key === 'Escape') { e.preventDefault(); resume(); }
    e.stopImmediatePropagation();
  }, true);
  for (const t of ['pointerdown', 'pointermove']) addEventListener(t, e => { if (paused && !(e.target.closest && e.target.closest('.mg-over,.mg-bar'))) e.stopImmediatePropagation(); }, true);

  // ---------- start screen with a mode choice and (optionally) a level choice ----------
  // o = { id, title, html, keys, modes: [{ id, label, sub }], picks: [{ key, title, options: [{ id, label, sub }] }],
  //       levels: { count, max, label? }, start(mode, level, picks), playing?, restore?, onPause? }
  let chooseMenu = null;
  function choose(o) {
    const isPause = !!paused;
    if (o.playing && !chooseMenu) chooseMenu = pauseMenu({ label: o.menuLabel || (o.levels ? '☰ 選關' : '☰ 換模式'), playing: o.playing, onPause: o.onPause, open: () => { choose(o); return o.restore; } });
    let mode = store.get(o.id + '.pickMode', o.modes ? o.modes[0].id : null);
    if (o.modes && !o.modes.some(m => m.id === mode)) mode = o.modes[0].id;
    let lvl = Math.min(store.get(o.id + '.pickLevel', 1), o.levels ? Math.max(1, o.levels.max) : 1);
    const lvLabel = (o.levels && o.levels.label) || (n => `第 ${n} 關`);
    // many levels: a compact grid of small buttons (number or a short name) and one line underneath that spells out the chosen level
    const plain = h => String(h).replace(/<[^>]*>/g, '').trim();
    const many = o.levels && o.levels.count > 12;
    const lvShort = n => o.levels.short ? o.levels.short(n) : o.levels.label && plain(lvLabel(n)).length <= 6 ? lvLabel(n) : String(n);
    const lvGrid = () => {
      const N = Array.from({ length: o.levels.count }, (_, i) => i + 1);
      if (!many) return `<div class="mg-levels">${N.map(n => `<button type="button" class="mg-lv" data-lv="${n}" ${n > o.levels.max ? 'disabled' : ''}>${n > o.levels.max ? '🔒' : lvLabel(n)}</button>`).join('')}</div>`;
      const w = Math.max(...N.map(n => [...plain(lvShort(n))].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 1 : 0.6), 0)));
      return `<div class="mg-levels mg-lvgrid" style="--lvw:${Math.max(3, w + 1.4).toFixed(1)}em">${N.map(n => `<button type="button" class="mg-lv" data-lv="${n}" ${n > o.levels.max ? 'disabled' : ''}>${n > o.levels.max ? '🔒' : lvShort(n)}</button>`).join('')}</div><p class="mg-lvsel" aria-live="polite"></p>`;
    };
    const picks = {};
    for (const pk of o.picks || []) { let v = store.get(o.id + '.pick.' + pk.key, pk.def || pk.options[0].id); if (!pk.options.some(q => q.id === v)) v = pk.options[0].id; picks[pk.key] = v; }
    // a mode can say it needs no level list (noLevels) or hide some picks (hide: ['pace', …]); then the mode question comes first
    const modeOf = id => (o.modes || []).find(m => m.id === id) || {};
    const modesFirst = o.modesFirst || (o.modes || []).some(m => m.noLevels || m.hide);
    const picksHtml = (o.picks || []).map(pk => `<div class="mg-pkwrap" data-pkwrap="${pk.key}"><p class="mg-pick-h">${pk.title}</p><div class="mg-pick">${pk.options.map(q => `<button type="button" class="mg-opt" data-pk="${pk.key}" data-pv="${q.id}">${q.label}<small>${q.sub || ''}</small></button>`).join('')}</div></div>`).join('');
    const modesHtml = o.modes ? `${o.picks ? `<p class="mg-pick-h">${o.modesTitle || '要不要計時？'}</p>` : ''}<div class="mg-pick">${o.modes.map(m => `<button type="button" class="mg-opt" data-mode="${m.id}">${m.label}<small>${m.sub || ''}</small></button>`).join('')}</div>` : '';
    const html = (o.html || '') + (modesFirst ? modesHtml + picksHtml : picksHtml + modesHtml) +
      (o.levels ? `<div class="mg-lvwrap"><p class="mg-pick-h">${o.levelsTitle || '從哪一關開始？'}</p>` + lvGrid() + '</div>' : '');
    panel({ title: o.title, html, keys: o.keys, buttons: [{ label: isPause ? '重新開始' : '開始', alt: !!isPause, on: () => { store.set(o.id + '.pickMode', mode); store.set(o.id + '.pickLevel', lvl); for (const k in picks) store.set(o.id + '.pick.' + k, picks[k]); o.start(mode, lvl, picks); } }, ...(o.extra || [])] });
    const sync = () => {
      const mo = modeOf(mode), lw = over.querySelector('.mg-lvwrap');
      if (lw) lw.hidden = !!mo.noLevels;
      over.querySelectorAll('.mg-pkwrap').forEach(w => { w.hidden = !!(mo.hide && mo.hide.includes(w.dataset.pkwrap)); });
      over.querySelectorAll('.mg-opt[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
      over.querySelectorAll('.mg-opt[data-pk]').forEach(b => b.setAttribute('aria-pressed', picks[b.dataset.pk] === b.dataset.pv));
      over.querySelectorAll('.mg-lv').forEach(b => b.setAttribute('aria-pressed', +b.dataset.lv === lvl));
      const sel = over.querySelector('.mg-lvsel'); if (sel) { const full = lvLabel(lvl), shown = plain(lvShort(lvl)); sel.innerHTML = !o.levels.label || plain(full) === String(lvl) ? `第 ${lvl} 關` : plain(full).startsWith(String(lvl)) ? `第 ${lvl} 關 ${String(full).replace(String(lvl), '').trim()}` : `${lvl}. ${full}`; void shown; }
    };
    over.querySelectorAll('.mg-opt[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; sfx('click'); unlock(); sync(); });
    over.querySelectorAll('.mg-opt[data-pk]').forEach(b => b.onclick = () => { picks[b.dataset.pk] = b.dataset.pv; sfx('click'); unlock(); sync(); });
    over.querySelectorAll('.mg-lv').forEach(b => b.onclick = () => { lvl = +b.dataset.lv; sfx('click'); unlock(); sync(); });
    sync();
    if (paused) addResume();
  }
  // extra button in the top bar (e.g. "休息一下" to end an untimed round)
  function barButton(label, onClick) {
    const bar = document.querySelector('.mg-bar'), b = document.createElement('button');
    b.type = 'button'; b.className = 'mg-barbtn'; b.textContent = label; b.hidden = true;
    b.onclick = () => { sfx('click'); onClick(); };
    bar.insertBefore(b, bar.querySelector('.mute'));
    return { show(v) { b.hidden = !v; }, el: b };
  }

  // how far (× r) a hat drawn for 噗噗's taller head has to come down to sit on 牛牛
  return { swReady, get hatDrop() { return HERO === 'niu' ? 0.34 : 0; }, get hero() { return HERO; }, get heroName() { return heroName(); }, heroText, setHero, niuSVG, niuDraw, VERSION, BUILT, get big() { return big; }, setBig, get textScale() { return big ? 1.3 : 1; }, praise, WORDS, choose, pauseMenu, resume, barButton, init, stat, fit, panel, hide, panelOpen, best, record, sfx, toast, loop, rand, randi, pick, shuffle, store, puPu, fx, unlock, JELLY };
})();
