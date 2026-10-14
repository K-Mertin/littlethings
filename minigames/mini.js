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
  const BORDER = 3;
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
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = Math.max(1, Math.round(s * dpr));
      canvas.width = w * px; canvas.height = h * px;
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
  function hide() { if (over) over.hidden = true; }
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
    clear: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.09, 'square', 0.07, i * 0.06)); },
    over: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.16, 'triangle', 0.13, i * 0.14)); },
    win: () => { [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.12, 'square', 0.07, i * 0.1)); },
  };
  function sfx(name) { if (SFX[name]) SFX[name](); }

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
      fn(dt, now / 1000);
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

  // Draw the mascot 噗噗 (a round green jelly with a leaf) at x,y with radius r
  function puPu(x, ctx, cx, cy, r, mood = 'happy', squash = 0) {
    ctx = x || ctx;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + squash, 1 - squash);
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(0, r * 0.95, r * 0.95, r * 0.22, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
    g.addColorStop(0, '#9ff0a8'); g.addColorStop(0.6, '#4cc96a'); g.addColorStop(1, '#2e9a4c');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(-r, r * 0.75); ctx.bezierCurveTo(-r * 1.08, -r * 0.2, -r * 0.6, -r * 0.95, 0, -r * 0.95);
    ctx.bezierCurveTo(r * 0.6, -r * 0.95, r * 1.08, -r * 0.2, r, r * 0.75); ctx.quadraticCurveTo(0, r * 1.05, -r, r * 0.75); ctx.fill();
    ctx.strokeStyle = '#237a3b'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke();
    // leaf
    ctx.fillStyle = '#ffb72b'; ctx.strokeStyle = '#c47c00'; ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath(); ctx.ellipse(r * 0.18, -r * 1.08, r * 0.28, r * 0.13, -0.5, 0, 7); ctx.fill(); ctx.stroke();
    // shine
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.45, r * 0.16, r * 0.1, -0.7, 0, 7); ctx.fill();
    // face
    ctx.fillStyle = '#1f2a1f';
    if (mood === 'ouch') {
      ctx.lineWidth = Math.max(1.2, r * 0.09); ctx.strokeStyle = '#1f2a1f';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.42, -r * 0.2); ctx.lineTo(s * r * 0.22, -r * 0.08); ctx.lineTo(s * r * 0.42, r * 0.04); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, r * 0.32, r * 0.14, r * 0.11, 0, 0, 7); ctx.fill();
    } else {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.32, -r * 0.08, r * 0.1, r * 0.15, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#fff'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.32 - r * 0.03, -r * 0.14, r * 0.04, 0, 7); ctx.fill(); }
      ctx.strokeStyle = '#1f2a1f'; ctx.lineWidth = Math.max(1.2, r * 0.08); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, r * 0.18, r * 0.18, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,140,.45)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.58, r * 0.16, r * 0.13, r * 0.08, 0, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }

  return { init, stat, fit, panel, hide, panelOpen, best, record, sfx, toast, loop, rand, randi, pick, shuffle, store, puPu: (ctx, cx, cy, r, mood, sq) => puPu(ctx, null, cx, cy, r, mood, sq), unlock };
})();
