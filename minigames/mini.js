// 噗噗的遊戲小屋 — tiny shared helpers for every mini game (no libraries)
'use strict';
const MG = (() => {
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
    bar.innerHTML = `<a class="back" href="index.html">← 遊戲區</a><h1></h1>` +
      list.map(s => `<span class="stat" data-s="${s}"></span>`).join('') +
      `<button type="button" class="mute" aria-label="音效開關"></button>`;
    bar.querySelector('h1').textContent = title;
    document.body.prepend(bar);
    list.forEach(s => stats[s] = bar.querySelector(`[data-s="${s}"]`));
    const mb = bar.querySelector('.mute');
    const showMute = () => mb.textContent = muted ? '🔇' : '🔊';
    mb.onclick = () => { muted = !muted; store.set('muted', muted); showMute(); };
    showMute();
    // remember the game was played (the hub shows a "玩過" mark)
    const seen = store.get('seen', {}); seen[id] = Date.now(); store.set('seen', seen);
    document.title = title + ' · 噗噗的遊戲小屋';
  }
  function stat(name, text) { if (stats[name]) stats[name].textContent = text; }

  // ---------- canvas fit ----------
  const BORDER = 3, MAX_PIX = 2.1e6;   // about 1800×1170 real pixels
  // w,h can be numbers, or w can be a function(stageW, stageH) returning [w, h] so the game can pick a layout
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
    doFit();
    canvas.logical = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left - BORDER) * w / (r.width - BORDER * 2), y: (e.clientY - r.top - BORDER) * h / (r.height - BORDER * 2) };
    };
    return doFit;
  }

  // ---------- start / result panel ----------
  let over;
  function panel({ title, html = '', buttons = [], keys = '' }) {
    if (!over) { over = document.createElement('div'); over.className = 'mg-over'; document.body.append(over); }
    over.innerHTML = `<div class="mg-card" role="dialog" aria-modal="true"><h2></h2><div class="mg-body">${html}</div><div class="mg-btns"></div>` +
      (keys ? `<div class="mg-keys">${keys}</div>` : '') + `</div>`;
    over.querySelector('h2').textContent = title;
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
  function sfx(name, arg) { if (SFX[name]) SFX[name](arg); }

  // ---------- short feedback words: English + emoji so kids who can't read Chinese yet still get them ----------
  // praise(level): 1 Good → 5 Fantastic ; JUDGE: rhythm-style hit words
  const PRAISE = ['Good! 👍', 'Great! ✨', 'Super! ⭐', 'Amazing! 🌟', 'Fantastic! 🎉'];
  function praise(level = 1) { return PRAISE[Math.max(0, Math.min(PRAISE.length - 1, level - 1))]; }
  const WORDS = { perfect: 'Perfect! 🌟', great: 'Great! ✨', good: 'Good! 👍', miss: 'Miss 💨', oops: 'Oops! 🙈', tryAgain: 'Try again! 🔁', yes: 'Yes! ✅', no: 'No ❌', combo: n => `Combo ×${n} 🔥`, chain: n => `Chain ×${n} ⚡`, bonus: n => `+${n} ⭐`, levelUp: 'Level up! 🚀', clear: 'Clear! 🎉', wait: 'Wait… ⏳', full: 'Full! 🈵', hint: '💡', stuck: 'No moves 🔄' };

  // ---------- toast ----------
  let toastEl, toastT;
  function toast(text, ms = 1200) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'mg-toast'; document.body.append(toastEl); }
    toastEl.textContent = text; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
  }

  // ---------- main loop (dt in seconds, paused while the tab is hidden) ----------
  function loop(fn) {
    let last = performance.now(), running = true;
    const tick = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!paused) fn(dt, now / 1000);   // frozen while the pause menu is open
      requestAnimationFrame(tick);
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
  function puPu(ctx, cx, cy, r, mood = 'happy', squash = 0, opts = {}) {
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
    const picks = {};
    for (const pk of o.picks || []) { let v = store.get(o.id + '.pick.' + pk.key, pk.def || pk.options[0].id); if (!pk.options.some(q => q.id === v)) v = pk.options[0].id; picks[pk.key] = v; }
    const html = (o.html || '') +
      (o.picks || []).map(pk => `<p class="mg-pick-h">${pk.title}</p><div class="mg-pick">${pk.options.map(q => `<button type="button" class="mg-opt" data-pk="${pk.key}" data-pv="${q.id}">${q.label}<small>${q.sub || ''}</small></button>`).join('')}</div>`).join('') +
      (o.modes ? `${o.picks ? `<p class="mg-pick-h">${o.modesTitle || '要不要計時？'}</p>` : ''}<div class="mg-pick">${o.modes.map(m => `<button type="button" class="mg-opt" data-mode="${m.id}">${m.label}<small>${m.sub || ''}</small></button>`).join('')}</div>` : '') +
      (o.levels ? `<p class="mg-pick-h">${o.levelsTitle || '從哪一關開始？'}</p><div class="mg-levels">${Array.from({ length: o.levels.count }, (_, i) => i + 1).map(n => `<button type="button" class="mg-lv" data-lv="${n}" ${n > o.levels.max ? 'disabled' : ''}>${n > o.levels.max ? '🔒' : lvLabel(n)}</button>`).join('')}</div>` : '');
    panel({ title: o.title, html, keys: o.keys, buttons: [{ label: isPause ? '重新開始' : '開始', alt: !!isPause, on: () => { store.set(o.id + '.pickMode', mode); store.set(o.id + '.pickLevel', lvl); for (const k in picks) store.set(o.id + '.pick.' + k, picks[k]); o.start(mode, lvl, picks); } }, ...(o.extra || [])] });
    const sync = () => {
      over.querySelectorAll('.mg-opt[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
      over.querySelectorAll('.mg-opt[data-pk]').forEach(b => b.setAttribute('aria-pressed', picks[b.dataset.pk] === b.dataset.pv));
      over.querySelectorAll('.mg-lv').forEach(b => b.setAttribute('aria-pressed', +b.dataset.lv === lvl));
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

  return { praise, WORDS, choose, pauseMenu, resume, barButton, init, stat, fit, panel, hide, panelOpen, best, record, sfx, toast, loop, rand, randi, pick, shuffle, store, puPu, fx, unlock, JELLY };
})();
