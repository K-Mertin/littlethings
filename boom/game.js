// 砰砰小隊 · 畫面、操作、選單、音效、存檔（規則在 core.js）
(function () {
'use strict';
const C = BoomCore, W = C.W, H = C.H, IT = C.IT;
const $ = id => document.getElementById(id);
const cv = $('cv'), c = cv.getContext('2d');

// ───────── 存檔 ─────────
const SAVE_KEY = 'boom:v1';
const save = Object.assign({ stars: [], kid: false, mute: false, music: true, bt: { h: 1, b: 3, l: 1, w: 2 } }, (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } })());
if (!Array.isArray(save.stars)) save.stars = [];
function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// ───────── 狀態 ─────────
const S = { scene: 'menu', G: null, paused: false, intro: 0, match: null, stage: 0, shownOver: false, fast: false };
window.__boom = S;
const COLORS = ['#ef4b3f', '#4a9dff', '#3fcf8e', '#ffc23d'], DARK = ['#b02a21', '#2767c2', '#22915f', '#c98a0f'], LIGHT = ['#ffd9d4', '#d9eaff', '#d5f7e6', '#fff0c4'];
const FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif';
const NAMES = ['阿砰', '小藍', '阿綠', '黃黃'];
const PAL = {
  grass: { out: '#dff0c2', f1: '#c3e596', f2: '#b6dc86', hard: '#a3adbf', top: '#c4ccda', sh: '#737e93', cr: '#d9a05f', crD: '#a8733b', crL: '#efc488' },
  snow: { out: '#e3f1fa', f1: '#f2f9fd', f2: '#e2f0f9', hard: '#6f8fb5', top: '#93b4d9', sh: '#4f6d91', cr: '#ffffff', crD: '#a5c5e0', crL: '#d9ecf9' },
  castle: { out: '#2a2540', f1: '#9089ad', f2: '#837ca1', hard: '#3f3860', top: '#5b5488', sh: '#262040', cr: '#bf8f5c', crD: '#7a5530', crL: '#dbb283' },
  lava: { out: '#3a2c33', f1: '#6d5863', f2: '#614d58', hard: '#35272e', top: '#4f3d46', sh: '#1e151a', cr: '#cf6f3e', crD: '#8f4322', crL: '#ec9862' },
};
let cw = 0, ch = 0, dpr = 1, ts = 40, ox = 0, oy = 0, hudH = 54, padH = 0, touch = matchMedia('(pointer:coarse)').matches;
let bg = null, bgDirty = true, tNow = 0, shake = 0;
const parts = [], floats = [], scorch = new Float32Array(C.N);
let hitStop = 0, lastSec = -1;

// ───────── 音效 ─────────
let ac = null;
function au() { if (save.mute) return null; try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { return null; } return ac; }
function tone(f, d, type, vol, slide, delay) {
  const a = au(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (delay || 0);
  o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(vol || .07, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
}
let nbuf = null, lastBoom = 0;
function noise(d, vol, lp) {
  const a = au(); if (!a) return;
  if (!nbuf) { nbuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch0 = nbuf.getChannelData(0); for (let i = 0; i < ch0.length; i++) ch0[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(), t = a.currentTime;
  s.buffer = nbuf; f.type = 'lowpass'; f.frequency.setValueAtTime(lp, t); f.frequency.exponentialRampToValueAtTime(120, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + d);
}
const sfx = {
  place() { tone(260, .07, 'triangle', .12, -80); },
  boom() { if (tNow - lastBoom < .06) return; lastBoom = tNow; noise(.45, .32, 1400); tone(95, .32, 'sine', .28, -55); },
  item() { tone(660, .07, 'square', .06); tone(990, .12, 'square', .06, 0, .07); },
  hurt() { tone(240, .28, 'sawtooth', .09, -150); },
  die() { tone(330, .5, 'sawtooth', .09, -260); },
  mdie() { tone(520, .1, 'square', .06, 200); tone(780, .12, 'square', .05, 0, .08); },
  kick() { tone(180, .08, 'square', .08, 120); },
  open() { [523, 659, 784].forEach((f, i) => tone(f, .14, 'triangle', .09, 0, i * .09)); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .1, 0, i * .12)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, .25, 'triangle', .09, 0, i * .16)); },
  go() { tone(784, .25, 'triangle', .1); },
  tick() { tone(440, .08, 'triangle', .07); },
  alarm() { tone(880, .14, 'square', .06); tone(660, .14, 'square', .06, 0, .16); },
  crush() { noise(.15, .18, 500); },
  freeze() { tone(1200, .3, 'sine', .08, -700); tone(1500, .25, 'triangle', .05, -900, .05); },
  curse() { tone(180, .35, 'sawtooth', .08, -90); },
  tp() { tone(500, .18, 'sine', .09, 700); },
  vent() { noise(.25, .14, 900); },
  ui() { tone(520, .05, 'triangle', .05); },
};

// ───────── 背景音樂（WebAudio 合成，每個世界一段 4 小節的旋律）─────────
const N_ = null;
const SONGS = {
  grass: { root: 72, wave: 'square', vol: .022, lead: [0, N_, 4, 7, 12, 7, 4, N_, 2, N_, 5, 9, 12, 9, 5, N_, 4, N_, 7, 11, 12, 11, 7, 4, 5, 7, 9, 7, 4, 2, 0, N_], bass: [0, 0, 5, 5, 4, 4, 5, 7] },
  snow: { root: 69, wave: 'triangle', vol: .04, lead: [0, 3, 7, N_, 12, N_, 7, 3, 5, 8, 12, N_, 8, N_, 5, N_, 3, 7, 10, N_, 7, N_, 3, N_, 2, 5, 8, 7, 5, 3, 2, N_], bass: [0, 0, 5, 5, 3, 3, -2, -2] },
  lava: { root: 74, wave: 'sawtooth', vol: .016, lead: [0, 0, 3, 0, 5, 0, 3, N_, 0, 0, 3, 0, 7, 5, 3, N_, -2, -2, 2, -2, 5, 2, -2, N_, 0, 3, 5, 7, 8, 7, 5, 3], bass: [0, 0, 0, 0, -2, -2, 0, 0] },
  castle: { root: 76, wave: 'triangle', vol: .04, lead: [0, N_, 7, N_, 6, N_, 3, N_, 0, 3, 7, N_, 10, N_, 7, N_, -1, N_, 5, N_, 3, N_, 2, N_, 0, 2, 3, 7, 6, 3, 2, N_], bass: [0, 0, 0, 0, -4, -4, -5, -5] },
};
const mus = { on: false, step: 0, next: 0 }; S.mus = mus;
function mnote(t, midi, d, type, vol) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .02);
}
function musTick(want, fast) {
  if (!want || save.mute || !save.music) { mus.on = false; return; }
  const a = au(); if (!a || a.state !== 'running') return;
  if (!mus.on) { mus.on = true; mus.next = a.currentTime + .08; mus.step = 0; }
  if (mus.next < a.currentTime - .5) mus.next = a.currentTime + .05;      // 分頁切走回來：不要補播
  const song = SONGS[S.G.world] || SONGS.grass, spb = 60 / (fast ? 168 : 132) / 2;
  while (mus.next < a.currentTime + .2) {
    const i = mus.step % 32, n = song.lead[i];
    if (n != null) mnote(mus.next, song.root + n, spb * .92, song.wave, song.vol);
    if (i % 4 === 0) mnote(mus.next, song.root - 24 + song.bass[i >> 2], spb * 3.6, 'triangle', .06);
    if (i % 4 === 2) mnote(mus.next, song.root - 12 + song.bass[i >> 2], spb * 1.2, 'triangle', .03);
    mus.step++; mus.next += spb;
  }
}

// ───────── 版面 ─────────
function layout() {
  dpr = Math.min(window.devicePixelRatio || 1, 2); cw = innerWidth; ch = innerHeight;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  const inGame = S.scene === 'play';
  hudH = inGame ? Math.round($('hud').getBoundingClientRect().bottom || 50) + 6 : 0;
  const portrait = ch > cw;
  padH = inGame && touch && portrait ? Math.min(240, Math.round(ch * .3)) : 0;
  ts = Math.max(12, Math.floor(Math.min(cw / W, (ch - hudH - padH - 4) / H)));
  ox = Math.floor((cw - ts * W) / 2); oy = hudH + Math.floor((ch - hudH - padH - ts * H) / 2);
  bgDirty = true; stickHome();
}
function duoTouch() { return touch && S.scene === 'play' && S.G && S.G.mode === 'battle' && S.match && S.match.humans > 1; }
function stickHome() {
  const dt = duoTouch(), narrow = cw < 700;
  document.body.classList.toggle('duo', !!dt);
  sticks.forEach((st, k) => {
    if (st.id != null) return;
    const x = k === 0 ? (dt ? (narrow ? 75 : 95) : Math.max(95, Math.min(ox / 2, 160))) : cw - (narrow ? 75 : 95);
    const y = padH ? ch - Math.min(padH / 2, dt && narrow ? 82 : 999) : ch - 115;
    st.el.style.left = x + 'px'; st.el.style.top = y + 'px'; st.el.firstElementChild.style.transform = '';
    st.el.classList.add('idle');
  });
}
addEventListener('resize', layout);

function rr(x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function buildBg(G) {
  if (!bg) bg = document.createElement('canvas');
  bg.width = W * ts * dpr; bg.height = H * ts * dpr;
  const b = bg.getContext('2d'), P = PAL[G.world]; b.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x * ts, py = y * ts, g = G.grid[y * W + x];
    b.fillStyle = (x + y) & 1 ? P.f1 : P.f2; b.fillRect(px, py, ts, ts);
    if (g === C.HARD) {
      b.fillStyle = P.sh; b.beginPath(); b.roundRect(px + .5, py + .5, ts - 1, ts - 1, ts * .16); b.fill();
      b.fillStyle = P.hard; b.beginPath(); b.roundRect(px + .5, py + .5, ts - 1, ts * .84, ts * .16); b.fill();
      b.fillStyle = P.top; b.beginPath(); b.roundRect(px + ts * .12, py + ts * .1, ts * .76, ts * .56, ts * .12); b.fill();
    } else if (G.grid[(y - 1) * W + x] === C.HARD) { b.fillStyle = 'rgba(0,0,0,.1)'; b.fillRect(px, py, ts, ts * .14); }
  }
  bgDirty = false;
}

// ───────── 畫東西 ─────────
function drawCrate(px, py, P, world, burn) {
  const k = burn > 0 ? burn / C.BURN_T : 1, s = ts, m = s * .04 + (1 - k) * s * .18;
  c.fillStyle = P.crD; rr(px + m, py + m, s - 2 * m, s - 2 * m, s * .14); c.fill();
  c.fillStyle = P.cr; rr(px + m, py + m, s - 2 * m, (s - 2 * m) * .86, s * .14); c.fill();
  c.strokeStyle = P.crD; c.lineWidth = Math.max(1, s * .05);
  if (world === 'grass') {
    c.fillStyle = P.crL; rr(px + s * .16, py + s * .14, s * .68, s * .56, s * .06); c.fill();
    c.beginPath(); c.moveTo(px + s * .18, py + s * .16); c.lineTo(px + s * .82, py + s * .68); c.moveTo(px + s * .82, py + s * .16); c.lineTo(px + s * .18, py + s * .68); c.stroke();
  } else if (world === 'castle') {          // 木桶
    c.fillStyle = P.crL; rr(px + s * .2, py + s * .1, s * .6, s * .62, s * .1); c.fill();
    c.beginPath(); c.moveTo(px + s * .08, py + s * .26); c.lineTo(px + s * .92, py + s * .26); c.moveTo(px + s * .08, py + s * .58); c.lineTo(px + s * .92, py + s * .58); c.stroke();
  } else if (world === 'snow') {
    c.fillStyle = P.crL; rr(px + s * .16, py + s * .44, s * .68, s * .28, s * .08); c.fill();
    c.fillStyle = 'rgba(111,143,181,.5)'; c.beginPath(); c.arc(px + s * .3, py + s * .28, s * .05, 0, 7); c.arc(px + s * .66, py + s * .34, s * .035, 0, 7); c.fill();
  } else {
    c.fillStyle = P.crL; rr(px + s * .16, py + s * .13, s * .5, s * .2, s * .08); c.fill();
    c.beginPath(); c.moveTo(px + s * .3, py + s * .42); c.lineTo(px + s * .48, py + s * .56); c.lineTo(px + s * .42, py + s * .74); c.moveTo(px + s * .48, py + s * .56); c.lineTo(px + s * .7, py + s * .5); c.stroke();
  }
  if (burn > 0) { c.globalAlpha = .75 * (1 - k * .4); c.fillStyle = k > .5 ? '#fff3b0' : '#ff8a2a'; rr(px + m, py + m, s - 2 * m, s - 2 * m, s * .14); c.fill(); c.globalAlpha = 1; }
}
const ICON = { 1: '💣', 2: '🔥', 3: '👟', 4: '🥾', 5: '🛡️', 6: '❤️', 7: '🌟', 8: '❄️', 10: '💀' }, ICOL = { 1: '#2b2340', 2: '#ef4b3f', 3: '#4a9dff', 4: '#9b6bff', 5: '#3fcf8e', 6: '#ff7aa8', 7: '#ffc23d', 8: '#6fc3ff', 10: '#6d6787' };
const CURSE = { slow: '變慢了', rev: '方向相反', leak: '炸彈亂掉' };
function drawItem(px, py, it, i) {
  const bob = Math.sin(tNow * 4 + i) * ts * .03, s = ts;
  c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(px + s / 2, py + s * .86, s * .28, s * .07, 0, 0, 7); c.fill();
  c.fillStyle = '#fff'; rr(px + s * .14, py + s * .12 + bob, s * .72, s * .72, s * .2); c.fill();
  c.strokeStyle = ICOL[it]; c.lineWidth = Math.max(2, s * .07); c.stroke();
  c.font = `${Math.round(s * .44)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
  c.fillText(ICON[it], px + s / 2, py + s * .5 + bob);
}
function drawDoor(px, py, open) {
  const s = ts;
  c.fillStyle = '#4a3b2f'; rr(px + s * .1, py + s * .1, s * .8, s * .8, s * .14); c.fill();
  if (open) {
    const g = c.createRadialGradient(px + s / 2, py + s / 2, 1, px + s / 2, py + s / 2, s * .42);
    g.addColorStop(0, '#fff8c9'); g.addColorStop(.6, '#ffc23d'); g.addColorStop(1, '#ff8a2a');
    c.fillStyle = g; rr(px + s * .18, py + s * .18, s * .64, s * .64, s * .1); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(2, s * .05);
    c.beginPath(); c.arc(px + s / 2, py + s / 2, s * (.2 + .12 * ((tNow * 1.2) % 1)), 0, 7); c.stroke();
    c.globalAlpha = .35 + .25 * Math.sin(tNow * 6); c.strokeStyle = '#ffc23d'; c.lineWidth = s * .08; c.beginPath(); c.arc(px + s / 2, py + s / 2, s * .62, 0, 7); c.stroke(); c.globalAlpha = 1;
  } else {
    c.fillStyle = '#2e241c'; rr(px + s * .18, py + s * .18, s * .64, s * .64, s * .1); c.fill();
    c.fillStyle = '#6b5644'; for (let k = 0; k < 3; k++) c.fillRect(px + s * (.24 + k * .06), py + s * (.56 - k * .14), s * (.52 - k * .12), s * .08);
    c.font = `${Math.round(s * .3)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🔒', px + s * .68, py + s * .32);
  }
}
function drawPortal(px, py, pair) {
  const s = ts, cx = px + s / 2, cy = py + s / 2, col = pair ? ['#ff7ac8', '#ffd0ec'] : ['#4a9dff', '#cfe6ff'];
  c.fillStyle = 'rgba(43,35,64,.25)'; c.beginPath(); c.ellipse(cx, cy + s * .04, s * .42, s * .36, 0, 0, 7); c.fill();
  for (let k = 0; k < 3; k++) {
    c.strokeStyle = k & 1 ? col[1] : col[0]; c.lineWidth = Math.max(2, s * .07);
    const a = tNow * (2.4 - k * .5) + k * 2; c.beginPath(); c.ellipse(cx, cy, s * (.38 - k * .11), s * (.32 - k * .09), 0, a, a + 4.4); c.stroke();
  }
  c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, s * .05, 0, 7); c.fill();
}
function drawVent(v) {
  const s = ts, cx = ox + (v.i % W + .5) * s, cy = oy + (((v.i / W) | 0) + .5) * s, warn = v.t < 1.3 ? 1 - v.t / 1.3 : 0;
  c.fillStyle = '#1e151a'; c.beginPath(); c.ellipse(cx, cy, s * .36, s * .3, 0, 0, 7); c.fill();
  c.fillStyle = warn ? `rgba(255,${Math.round(150 - warn * 90)},40,${.5 + warn * .5})` : '#7a2f1c';
  c.beginPath(); c.ellipse(cx, cy, s * (.24 + warn * .08 * (1 + Math.sin(tNow * 30))), s * (.19 + warn * .06), 0, 0, 7); c.fill();
  if (warn) { c.fillStyle = '#fff3b0'; c.beginPath(); c.ellipse(cx, cy, s * .1 * warn, s * .08 * warn, 0, 0, 7); c.fill();
    c.fillStyle = '#ffc23d'; c.font = `900 ${Math.round(s * .4)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; if (Math.floor(tNow * 8) % 2) c.fillText('!', cx, cy - s * .5); }
}
function drawBomb(b) {
  const s = ts, px = ox + (b.tx + b.ox + .5) * s, py = oy + (b.ty + b.oy + .5) * s;
  const urgency = 1 - Math.max(0, b.t) / C.FUSE, pulse = 1 + Math.sin((tNow - b.born) * (8 + urgency * 14)) * (.05 + urgency * .05), r = s * .33 * pulse;
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(px, py + s * .34, s * .3, s * .09, 0, 0, 7); c.fill();
  c.fillStyle = urgency > .7 && Math.floor(tNow * 14) % 2 ? '#7a2c2c' : '#2b2340'; c.beginPath(); c.arc(px, py + s * .04, r, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(px - r * .35, py + s * .04 - r * .4, r * .28, r * .18, -.6, 0, 7); c.fill();
  c.fillStyle = COLORS[b.owner] || '#fff'; c.beginPath(); c.arc(px + r * .45, py + s * .04 + r * .4, r * .16, 0, 7); c.fill();
  c.strokeStyle = '#8a6a3c'; c.lineWidth = Math.max(2, s * .06); c.lineCap = 'round';
  c.beginPath(); c.moveTo(px + r * .3, py + s * .04 - r * .85); c.quadraticCurveTo(px + r * .7, py - r * 1.5, px + r * .95, py - r * 1.15); c.stroke();
  c.fillStyle = Math.floor(tNow * 20) % 2 ? '#ffd23d' : '#ff6a2a'; c.beginPath(); c.arc(px + r * .95, py - r * 1.15, s * (.07 + Math.random() * .04), 0, 7); c.fill();
}
function drawFlames(G) {
  const s = ts, lay = [['#ff6a1a', .78], ['#ffc23d', .5], ['#fff6c8', .24]];
  for (const [col, wd] of lay) {
    c.fillStyle = col;
    for (let i = 0; i < C.N; i++) {
      const t = G.flameT[i]; if (t <= 0) continue;
      const k = Math.min(1, t / C.FLAME_T * 2.2), th = s * wd * (.35 + .65 * k) * (1 + Math.sin(tNow * 30 + i) * .06), d = G.flameDir[i];
      const x = i % W, y = (i / W) | 0, px = ox + x * s, py = oy + y * s, cx = px + s / 2, cy = py + s / 2;
      const on = j => G.flameT[j] > 0;
      if (d & 1) { const l = on(i - 1) && (G.flameDir[i - 1] & 1) ? 0 : s * .14, r = on(i + 1) && (G.flameDir[i + 1] & 1) ? 0 : s * .14; rr(px + l - .5, cy - th / 2, s - l - r + 1, th, [l ? th / 2 : 0, r ? th / 2 : 0, r ? th / 2 : 0, l ? th / 2 : 0]); c.fill(); }
      if (d & 2) { const u = on(i - W) && (G.flameDir[i - W] & 2) ? 0 : s * .14, dn = on(i + W) && (G.flameDir[i + W] & 2) ? 0 : s * .14; rr(cx - th / 2, py + u - .5, th, s - u - dn + 1, [u ? th / 2 : 0, u ? th / 2 : 0, dn ? th / 2 : 0, dn ? th / 2 : 0]); c.fill(); }
    }
  }
}
function drawBuddy(p) {
  const s = ts, id = p.id; let px = ox + (p.x + .5) * s, py = oy + (p.y + .5) * s;
  c.save();
  if (!p.alive) { if (p.deadT > 1) { c.restore(); return; } c.globalAlpha = 1 - p.deadT; py -= p.deadT * s * .7; c.translate(px, py); c.rotate(p.deadT * 3); c.translate(-px, -py); }
  else if (p.inv > 0 && Math.floor(tNow * 14) % 2) c.globalAlpha = .4;
  const bob = p.moving ? Math.sin(tNow * 16) * s * .035 : 0, step = p.moving ? Math.sin(tNow * 16) : 0;
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(px, py + s * .38, s * .28, s * .08, 0, 0, 7); c.fill();
  c.fillStyle = DARK[id];
  c.beginPath(); c.ellipse(px - s * .14, py + s * .33 - Math.max(0, step) * s * .05, s * .1, s * .06, 0, 0, 7); c.ellipse(px + s * .14, py + s * .33 - Math.max(0, -step) * s * .05, s * .1, s * .06, 0, 0, 7); c.fill();
  // 耳朵
  c.fillStyle = COLORS[id]; c.beginPath(); c.arc(px - s * .23, py - s * .28 + bob, s * .11, 0, 7); c.arc(px + s * .23, py - s * .28 + bob, s * .11, 0, 7); c.fill();
  c.fillStyle = LIGHT[id]; c.beginPath(); c.arc(px - s * .23, py - s * .28 + bob, s * .055, 0, 7); c.arc(px + s * .23, py - s * .28 + bob, s * .055, 0, 7); c.fill();
  // 身體
  c.fillStyle = COLORS[id]; c.beginPath(); c.arc(px, py - s * .02 + bob, s * .33, 0, 7); c.fill();
  c.strokeStyle = DARK[id]; c.lineWidth = Math.max(1.5, s * .04); c.stroke();
  if (p.fy < 0) { c.fillStyle = LIGHT[id]; c.beginPath(); c.arc(px, py + s * .2 + bob, s * .07, 0, 7); c.fill(); }
  else {
    const fx = p.fx * s * .1, fy = p.fy * s * .03;
    c.fillStyle = LIGHT[id]; c.beginPath(); c.ellipse(px + fx * .6, py + s * .1 + bob, s * .2, s * .16, 0, 0, 7); c.fill();
    c.fillStyle = '#2b2340';
    if (p.alive) { c.beginPath(); c.ellipse(px + fx - s * .11, py - s * .07 + fy + bob, s * .045, s * .06, 0, 0, 7); c.ellipse(px + fx + s * .11, py - s * .07 + fy + bob, s * .045, s * .06, 0, 0, 7); c.fill(); }
    else { c.font = `900 ${Math.round(s * .2)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('× ×', px, py - s * .06); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(px + fx - s * .095, py - s * .09 + fy + bob, s * .016, 0, 7); c.arc(px + fx + s * .125, py - s * .09 + fy + bob, s * .016, 0, 7); c.fill();
    c.fillStyle = '#2b2340'; c.beginPath(); c.arc(px + fx, py + s * .06 + bob, s * .03, 0, Math.PI); c.fill();
  }
  if (p.frozen > 0) { c.fillStyle = 'rgba(140,205,255,.55)'; rr(px - s * .42, py - s * .44, s * .84, s * .88, s * .14); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, s * .04); c.stroke(); }
  if (p.curse && p.alive) { c.font = `${Math.round(s * .34)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText('💀', px, py - s * .56 + Math.sin(tNow * 8) * s * .03); }
  if (p.shield) { c.strokeStyle = 'rgba(63,207,142,.85)'; c.lineWidth = Math.max(2, s * .07); c.beginPath(); c.arc(px, py, s * (.46 + Math.sin(tNow * 6) * .015), 0, 7); c.stroke(); }
  c.restore();
}
function drawMon(m) {
  const s = ts * (m.type === 'boss' ? 1.3 : m.type === 'mini' ? .62 : m.type === 'split' ? 1.12 : 1), px = ox + (m.x + .5) * ts; let py = oy + (m.y + .5) * ts;
  c.save();
  if (!m.alive) { if (m.deadT > .4) { c.restore(); return; } const k = 1 - m.deadT / .4; c.globalAlpha = k; c.translate(px, py); c.scale(k, k); c.translate(-px, -py); }
  const frozen = m.alive && S.G && S.G.freezeT > 0, tSave = tNow; if (frozen) tNow = m.id;      // 凍住：動畫停格
  const flash = m.inv > 0 && Math.floor(tNow * 14) % 2, wob = Math.sin(tNow * 7 + m.id * 2);
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(px, oy + (m.y + .5) * ts + ts * .38, s * .28, s * .08, 0, 0, 7); c.fill();
  const eyes = (ey, sp, r, col) => {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(px - sp, ey, r, 0, 7); c.arc(px + sp, ey, r, 0, 7); c.fill();
    c.fillStyle = col || '#2b2340'; c.beginPath(); c.arc(px - sp + m.dx * r * .4, ey + m.dy * r * .4, r * .55, 0, 7); c.arc(px + sp + m.dx * r * .4, ey + m.dy * r * .4, r * .55, 0, 7); c.fill();
  };
  if (m.type === 'slime' || m.type === 'boss' || m.type === 'split' || m.type === 'mini') {
    const boss = m.type === 'boss', rx = s * .34 * (1 + wob * .06), ry = s * .3 * (1 - wob * .06), by = py + s * .32;
    const teal = m.type === 'split' || m.type === 'mini';
    const BC = { summon: ['#8a4fd6', '#5a2c9c'], dash: ['#5fb8f2', '#2a6fa8'], bomb: ['#f0673a', '#9c2f14'], blink: ['#4b4a8f', '#23225a'] }[m.boss] || ['#8a4fd6', '#5a2c9c'];
    c.fillStyle = flash ? '#fff' : boss ? BC[0] : teal ? '#35c2c9' : '#58c95a';
    c.beginPath(); c.moveTo(px - rx, by); c.bezierCurveTo(px - rx, by - ry * 2.3, px + rx, by - ry * 2.3, px + rx, by); c.closePath(); c.fill();
    c.strokeStyle = boss ? BC[1] : teal ? '#1b8088' : '#2f8f3a'; c.lineWidth = Math.max(1.5, s * .04); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(px - rx * .4, by - ry * 1.25, rx * .2, ry * .22, -.5, 0, 7); c.fill();
    eyes(by - ry * .75, rx * .36, s * .075);
    if (m.type === 'split') { c.strokeStyle = '#1b8088'; c.setLineDash([s * .06, s * .06]); c.beginPath(); c.moveTo(px, by - ry * 1.7); c.lineTo(px, by - ry * 1.05); c.stroke(); c.setLineDash([]); }
    if (boss) {
      c.fillStyle = '#ffc23d'; c.beginPath(); const cy = by - ry * 1.72;
      c.moveTo(px - s * .2, cy); c.lineTo(px - s * .2, cy - s * .2); c.lineTo(px - s * .1, cy - s * .1); c.lineTo(px, cy - s * .24); c.lineTo(px + s * .1, cy - s * .1); c.lineTo(px + s * .2, cy - s * .2); c.lineTo(px + s * .2, cy); c.closePath(); c.fill();
      c.strokeStyle = '#c98a0f'; c.stroke();
      c.strokeStyle = '#2b2340'; c.lineWidth = Math.max(2, s * .04); c.beginPath(); c.moveTo(px - rx * .6, by - ry * 1.12); c.lineTo(px - rx * .15, by - ry * .98); c.moveTo(px + rx * .6, by - ry * 1.12); c.lineTo(px + rx * .15, by - ry * .98); c.stroke();
      if (m.tele > 0 && Math.floor(tNow * 12) % 2) { c.fillStyle = '#ef4b3f'; c.font = `900 ${Math.round(ts * .6)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', px + m.dx * ts * .8, py + m.dy * ts * .8 - ts * .1); }
      for (let k = 0; k < m.maxHp; k++) { c.fillStyle = k < m.hp ? '#ef4b3f' : 'rgba(43,35,64,.25)'; c.beginPath(); c.arc(px + (k - (m.maxHp - 1) / 2) * ts * .2, py - s * .62, ts * .07, 0, 7); c.fill(); }
    }
  } else if (m.type === 'bomber') {       // 炸彈怪：長腳的小炸彈
    const hop = Math.abs(Math.sin(tNow * 9 + m.id)) * s * .04, soon = m.bombT < .8 && Math.floor(tNow * 10) % 2; py -= hop;
    c.fillStyle = '#5a3a2a'; c.beginPath(); c.ellipse(px - s * .13, py + s * .32 + hop, s * .09, s * .05, 0, 0, 7); c.ellipse(px + s * .13, py + s * .32 + hop, s * .09, s * .05, 0, 0, 7); c.fill();
    c.fillStyle = flash ? '#fff' : soon ? '#ff8a2a' : '#f2a03d'; c.beginPath(); c.arc(px, py + s * .04, s * .28, 0, 7); c.fill(); c.strokeStyle = '#a8601a'; c.lineWidth = Math.max(1.5, s * .04); c.stroke();
    c.strokeStyle = '#5a3a2a'; c.lineWidth = Math.max(2, s * .05); c.beginPath(); c.moveTo(px, py - s * .24); c.quadraticCurveTo(px + s * .12, py - s * .42, px + s * .2, py - s * .36); c.stroke();
    c.fillStyle = Math.floor(tNow * 16) % 2 ? '#ffd23d' : '#ff5a2a'; c.beginPath(); c.arc(px + s * .2, py - s * .36, s * .06, 0, 7); c.fill();
    eyes(py + s * .02, s * .1, s * .065);
    c.strokeStyle = '#2b2340'; c.lineWidth = Math.max(2, s * .04); c.beginPath(); c.moveTo(px - s * .18, py - s * .1); c.lineTo(px - s * .04, py - s * .05); c.moveTo(px + s * .18, py - s * .1); c.lineTo(px + s * .04, py - s * .05); c.stroke();
  } else if (m.type === 'bat') {
    const fl = Math.sin(tNow * 18 + m.id) * s * .14; py += Math.sin(tNow * 5 + m.id) * s * .04 - s * .04;
    c.fillStyle = flash ? '#fff' : '#7d5bd0';
    c.beginPath(); c.moveTo(px - s * .12, py); c.lineTo(px - s * .44, py - s * .12 + fl); c.lineTo(px - s * .34, py + s * .06); c.lineTo(px - s * .42, py + s * .16 + fl * .4); c.lineTo(px - s * .1, py + s * .14); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(px + s * .12, py); c.lineTo(px + s * .44, py - s * .12 + fl); c.lineTo(px + s * .34, py + s * .06); c.lineTo(px + s * .42, py + s * .16 + fl * .4); c.lineTo(px + s * .1, py + s * .14); c.closePath(); c.fill();
    c.beginPath(); c.arc(px, py + s * .02, s * .2, 0, 7); c.fill();
    c.beginPath(); c.moveTo(px - s * .17, py - s * .1); c.lineTo(px - s * .15, py - s * .3); c.lineTo(px - s * .04, py - s * .15); c.moveTo(px + s * .17, py - s * .1); c.lineTo(px + s * .15, py - s * .3); c.lineTo(px + s * .04, py - s * .15); c.fill();
    eyes(py, s * .08, s * .055, '#b02a21');
  } else if (m.type === 'ghost') {
    py += Math.sin(tNow * 3 + m.id) * s * .05; c.globalAlpha *= .88;
    c.fillStyle = flash ? '#ffd9d4' : '#f4f6ff'; c.strokeStyle = '#a9b3d6'; c.lineWidth = Math.max(1.5, s * .04);
    c.beginPath(); c.moveTo(px - s * .28, py + s * .3); c.lineTo(px - s * .28, py - s * .05); c.arc(px, py - s * .05, s * .28, Math.PI, 0); c.lineTo(px + s * .28, py + s * .3);
    for (let k = 0; k < 4; k++) c.quadraticCurveTo(px + s * (.21 - k * .14), py + s * (.18 + (k & 1 ? .04 : 0) + wob * .02), px + s * (.14 - k * .14), py + s * .3);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#2b2340'; c.beginPath(); c.ellipse(px - s * .1 + m.dx * s * .03, py - s * .06, s * .045, s * .07, 0, 0, 7); c.ellipse(px + s * .1 + m.dx * s * .03, py - s * .06, s * .045, s * .07, 0, 0, 7); c.ellipse(px + m.dx * s * .03, py + s * .1, s * .04, s * .05, 0, 0, 7); c.fill();
  } else {   // 小惡魔
    const hop = Math.abs(Math.sin(tNow * 10 + m.id)) * s * .05; py -= hop;
    c.fillStyle = flash ? '#fff' : '#e2504a';
    c.beginPath(); c.moveTo(px - s * .24, py - s * .16); c.lineTo(px - s * .3, py - s * .42); c.lineTo(px - s * .1, py - s * .26); c.moveTo(px + s * .24, py - s * .16); c.lineTo(px + s * .3, py - s * .42); c.lineTo(px + s * .1, py - s * .26); c.fill();
    c.beginPath(); c.arc(px, py + s * .02, s * .3, 0, 7); c.fill(); c.strokeStyle = '#8f231f'; c.lineWidth = Math.max(1.5, s * .04); c.stroke();
    eyes(py - s * .02, s * .11, s * .07);
    c.strokeStyle = '#2b2340'; c.lineWidth = Math.max(2, s * .045); c.beginPath(); c.moveTo(px - s * .2, py - s * .15); c.lineTo(px - s * .05, py - s * .08); c.moveTo(px + s * .2, py - s * .15); c.lineTo(px + s * .05, py - s * .08); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(px - s * .08, py + s * .14); c.lineTo(px - s * .04, py + s * .21); c.lineTo(px, py + s * .14); c.lineTo(px + s * .04, py + s * .21); c.lineTo(px + s * .08, py + s * .14); c.fill();
  }
  if (frozen) { tNow = tSave; const blink = S.G.freezeT < 1.2 && Math.floor(tNow * 10) % 2; if (!blink) { c.fillStyle = 'rgba(140,205,255,.5)'; rr(px - s * .42, oy + (m.y + .5) * ts - s * .46, s * .84, s * .9, s * .14); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, s * .04); c.stroke(); } }
  c.restore();
}
function puff(x, y, n, col, sp, size, life) {
  for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, v = (sp || 2) * (.3 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: (life || .5) * (.6 + Math.random() * .6), col, size: (size || .12) * (.6 + Math.random() * .8) }); }
}
function onEvents(G, quiet) {
  const P = PAL[G.world];
  for (const e of G.ev) {
    switch (e.t) {
      case 'place': if (!quiet) sfx.place(); break;
      case 'boom': puff(e.x, e.y, 6, 'rgba(90,80,90,.55)', 1.2, .2, .7); rings.push({ x: e.x, y: e.y, life: 0 }); shake = Math.min(.3, shake + .12); if (!quiet) sfx.boom(); break;
      case 'crate': puff(e.x, e.y, 7, P.crD, 3, .1, .5); puff(e.x, e.y, 4, P.cr, 2.5, .1, .5); break;
      case 'item': puff(e.x, e.y, 8, '#ffd23d', 2.5, .07, .45); floats.push({ x: e.x, y: e.y - .3, text: '+' + ICON[e.it], life: 0 }); if (!quiet) sfx.item(); break;
      case 'summon': puff(e.x, e.y, 10, '#c9a6ff', 3, .09, .5); if (!quiet) sfx.tp(); break;
      case 'tele': if (!quiet) sfx.alarm(); break;
      case 'freeze': banner(G.mode === 'adv' ? '❄️ 怪物被凍住了！' : '❄️ 冰凍！', 1.2); if (!quiet) sfx.freeze(); break;
      case 'curse': floats.push({ x: e.x, y: e.y - .5, text: '💀 ' + CURSE[e.type], life: -0.6 }); if (!quiet) sfx.curse(); break;
      case 'itemburn': puff(e.x, e.y, 5, '#888', 1.5, .08, .4); break;
      case 'hurt': puff(e.x, e.y, 8, '#ef4b3f', 3, .08, .4); shake = .3; hitStop = .09; if (!quiet) sfx.hurt(); break;
      case 'shield': puff(e.x, e.y, 10, '#3fcf8e', 3, .08, .5); if (!quiet) sfx.kick(); break;
      case 'die': puff(e.x, e.y, 14, COLORS[e.id], 3.5, .1, .7); shake = .35; hitStop = .12; if (!quiet) sfx.die(); break;
      case 'mdie': puff(e.x, e.y, 12, '#fff', 3, .1, .5); puff(e.x, e.y, 6, '#ffd23d', 2, .07, .6); if (!quiet) sfx.mdie(); break;
      case 'mhurt': puff(e.x, e.y, 8, '#fff', 3, .08, .4); if (!quiet) sfx.hurt(); break;
      case 'kick': if (!quiet) sfx.kick(); break;
      case 'door': puff(e.x, e.y, 10, '#ffc23d', 2, .07, .7); break;
      case 'open': puff(e.x, e.y, 14, '#ffc23d', 3, .08, .9); banner('出口打開了！', 1.6); if (!quiet) sfx.open(); break;
      case 'tp': puff(e.fx, e.fy, 8, '#cfe6ff', 2.5, .08, .4); puff(e.x, e.y, 10, '#fff', 3, .08, .5); if (!quiet) sfx.tp(); break;
      case 'vent': puff(e.x, e.y, 6, '#ff8a2a', 2.5, .1, .5); if (!quiet) sfx.vent(); break;
      case 'crush': puff(e.x, e.y, 5, P.sh, 2, .12, .4); shake = Math.min(.25, shake + .08); bgDirty = true; if (!quiet) sfx.crush(); break;
      case 'sudden': banner('⚠️ 場地開始縮小！', 2); if (!quiet) sfx.alarm(); break;
    }
  }
  G.ev.length = 0;
}
let bannerText = '', bannerT = 0;
const rings = [];
function banner(t, d) { if (S.scene !== 'play') return; bannerText = t; bannerT = d; }

function draw(G, dim) {
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const P = PAL[G.world];
  c.fillStyle = P.out; c.fillRect(0, 0, cw, ch);
  if (bgDirty) buildBg(G);
  const sx = shake > 0 ? (Math.random() - .5) * shake * ts * .5 : 0, sy = shake > 0 ? (Math.random() - .5) * shake * ts * .5 : 0;
  c.save(); c.translate(sx, sy);
  c.fillStyle = 'rgba(0,0,0,.18)'; rr(ox - 3, oy - 1, ts * W + 6, ts * H + 8, ts * .2); c.fill();
  c.drawImage(bg, ox, oy, ts * W, ts * H);
  for (let i = 0; i < C.N; i++) if (scorch[i] > 0 && G.grid[i] === C.FLOOR) { c.fillStyle = `rgba(30,20,25,${(.28 * Math.min(1, scorch[i])).toFixed(3)})`; c.beginPath(); c.ellipse(ox + (i % W + .5) * ts, oy + (((i / W) | 0) + .5) * ts, ts * .4, ts * .34, 0, 0, 7); c.fill(); }
  for (const v of G.vents) if (G.grid[v.i] === C.FLOOR) drawVent(v);
  G.portals.forEach((pr, k) => { for (const i of pr) if (G.grid[i] === C.FLOOR) drawPortal(ox + (i % W) * ts, oy + ((i / W) | 0) * ts, k); });
  for (let i = 0; i < C.N; i++) {
    const x = i % W, y = (i / W) | 0, px = ox + x * ts, py = oy + y * ts;
    if (G.items[i] === IT.DOOR) drawDoor(px, py, G.doorOpen);
    else if (G.items[i]) drawItem(px, py, G.items[i], i);
    if (G.grid[i] === C.SOFT) {
      drawCrate(px, py, P, G.world, G.burnT[i]);
      if (G.doorOpen && !G.doorShown && i === G.doorI) {      // 怪物清光了還沒找到門：提示在哪個箱子
        c.fillStyle = '#ffc23d'; c.font = `${Math.round(ts * .4)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.globalAlpha = .6 + .4 * Math.sin(tNow * 6); c.fillText('✨', px + ts / 2, py + ts * .42); c.globalAlpha = 1;
      }
    }
  }
  for (const b of G.bombs) drawBomb(b);
  drawFlames(G);
  for (const m of G.mons) drawMon(m);
  for (const p of G.players.slice().sort((a, b) => a.y - b.y)) drawBuddy(p);
  for (const p of parts) { const k = 1 - p.life / p.max; c.globalAlpha = k; c.fillStyle = p.col; c.beginPath(); c.arc(ox + (p.x + .5) * ts, oy + (p.y + .5) * ts, p.size * ts * (.5 + k * .5), 0, 7); c.fill(); }
  for (const r of rings) { const k = r.life / .3; c.globalAlpha = (1 - k) * .7; c.strokeStyle = '#fff'; c.lineWidth = ts * .1 * (1 - k); c.beginPath(); c.arc(ox + (r.x + .5) * ts, oy + (r.y + .5) * ts, ts * (.3 + k * .9), 0, 7); c.stroke(); }
  c.globalAlpha = 1;
  c.font = `900 ${Math.round(ts * .42)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const f of floats) { c.globalAlpha = Math.min(1, 1 - f.life / .9); c.fillStyle = '#000'; c.fillText(f.text, ox + (f.x + .5) * ts, oy + (f.y + .5 - f.life * .8) * ts); }
  c.globalAlpha = 1; c.restore();
  if (dim) return;
  // 兩人對戰：頭上標 1P／2P
  if (G.mode === 'battle' && S.match && G.time < 4) for (const p of G.players) if (p.alive) {
    const label = p.human ? (S.match.humans > 1 ? (p.id + 1) + 'P' : '你') : '';
    if (!label) continue;
    c.font = `900 ${Math.round(ts * .34)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const px = ox + (p.x + .5) * ts, py = oy + (p.y - .25) * ts - Math.abs(Math.sin(tNow * 5)) * ts * .1;
    c.fillStyle = COLORS[p.id]; rr(px - ts * .32, py - ts * .22, ts * .64, ts * .44, ts * .14); c.fill(); c.fillStyle = '#fff'; c.fillText(label, px, py + 1);
  }
  let text = '';
  if (S.intro > 0) text = S.intro > .45 ? '預備…' : '開始！';
  else if (bannerT > 0) text = bannerText;
  else if (S.fast) text = '電腦們還在打…（快轉中）';
  if (text) {
    const fs = Math.round(Math.min(ts * .9, cw * .075));
    c.font = `900 ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(text).width + fs * 1.2, y = oy + ts * H * .5;
    c.fillStyle = 'rgba(43,35,64,.82)'; rr(cw / 2 - w / 2, y - fs * .85, w, fs * 1.7, fs * .5); c.fill();
    c.fillStyle = '#fff'; c.fillText(text, cw / 2, y + 2);
  }
}

// ───────── HUD ─────────
const hudCache = {};
function setHtml(id, html) { if (hudCache[id] !== html) { hudCache[id] = html; $(id).innerHTML = html; } }
function fmt(t) { t = Math.max(0, Math.ceil(t)); return ((t / 60) | 0) + ':' + String(t % 60).padStart(2, '0'); }
function updateHud(G) {
  if (G.mode === 'adv') {
    const p = G.players[0], w = (S.stage / C.PER_WORLD) | 0, max = G.kid ? 5 : 3;
    setHtml('cTitle', `<span class="t">${C.WORLDS[w].name}</span>${w + 1}-${S.stage % C.PER_WORLD + 1}`);
    let h = ''; for (let k = 0; k < Math.max(max, p.hearts); k++) h += k < p.hearts ? '♥' : '<span class="lost">♥</span>';
    setHtml('cHearts', h);
    setHtml('cKit', `<span>💣${p.bombsMax}</span><span>🔥${p.range}</span><i class="${p.shoes ? 'on' : ''}">👟${p.shoes || ''}</i><i class="${p.kick ? 'on' : ''}">🥾</i><i class="${p.shield ? 'on' : ''}">🛡️</i>${p.pierce ? '<span>🌟</span>' : ''}`);
    const left = G.mons.filter(m => m.alive).length;
    setHtml('cTime', (left ? `👾 ${left}　` : '🚪　') + '⏱ ' + (G.timeLeft === Infinity ? fmt(G.time) : fmt(G.timeLeft)));
    $('cTime').classList.toggle('low', G.timeLeft < 30);
  } else {
    const M = S.match;
    setHtml('cTitle', `<span class="t">先贏 ${M.target} 回合</span>第 ${M.round} 回合`);
    setHtml('cScore', G.players.map(p => `<span class="${p.alive ? '' : 'out'}"><b style="background:${COLORS[p.id]}"></b>${M.wins[p.id]}</span>`).join(''));
    const left = G.sd.start - G.time;
    setHtml('cTime', left > 0 ? '⏱ ' + fmt(left) : '⚠️ 縮小中');
    $('cTime').classList.toggle('low', left < 10);
  }
}

// ───────── 操作 ─────────
const stacks = [[], []], DV = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
const SOLO = { ArrowUp: [0, 'u'], ArrowDown: [0, 'd'], ArrowLeft: [0, 'l'], ArrowRight: [0, 'r'], KeyW: [0, 'u'], KeyS: [0, 'd'], KeyA: [0, 'l'], KeyD: [0, 'r'] };
const DUO = { ArrowUp: [1, 'u'], ArrowDown: [1, 'd'], ArrowLeft: [1, 'l'], ArrowRight: [1, 'r'], KeyW: [0, 'u'], KeyS: [0, 'd'], KeyA: [0, 'l'], KeyD: [0, 'r'] };
const BOMB_SOLO = { Space: 0, Enter: 0, NumpadEnter: 0, KeyX: 0, KeyJ: 0 }, BOMB_DUO = { Space: 0, KeyF: 0, Enter: 1, NumpadEnter: 1, Slash: 1, Period: 1, ShiftRight: 1 };
const sticks = [{ id: null, o: null, dir: null, el: $('stick') }, { id: null, o: null, dir: null, el: $('stick2') }];
function duo() { return S.G && S.G.mode === 'battle' && S.match && S.match.humans > 1; }
function wantBomb(i) { const G = S.G; if (!G || S.scene !== 'play' || S.paused || S.intro > 0) return; const p = G.players[i]; if (p && p.human && p.alive) p.wantBomb = true; }
addEventListener('keydown', e => {
  if (S.scene !== 'play') { if (e.code === 'Escape') { const b = document.querySelector('.scr:not([hidden]) [data-back]'); if (b) b.click(); else if (!$('sTitle').hidden) location.href = '../index.html'; } return; }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (!$('dlg').hidden && !S.paused) return; togglePause(); e.preventDefault(); return; }
  const m = (duo() ? DUO : SOLO)[e.code];
  if (m) { const st = stacks[m[0]]; if (!st.includes(m[1])) st.push(m[1]); e.preventDefault(); return; }
  const b = (duo() ? BOMB_DUO : BOMB_SOLO)[e.code];
  if (b != null) { if (!e.repeat) wantBomb(b); e.preventDefault(); }
});
addEventListener('keyup', e => { for (const map of [SOLO, DUO]) { const m = map[e.code]; if (m) { const st = stacks[m[0]], k = st.indexOf(m[1]); if (k >= 0) st.splice(k, 1); } } });
addEventListener('blur', () => { stacks[0].length = stacks[1].length = 0; });
function showTouch() {
  const on = touch && S.scene === 'play', dt = on && duoTouch();
  $('stick').hidden = !on; $('bBomb').hidden = !on; $('stick2').hidden = !dt; $('bBomb2').hidden = !dt;
}
cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' && !touch) { touch = true; layout(); showTouch(); }
  if (S.scene !== 'play' || !touch) return;
  au();
  // 一個人：左半邊是搖桿、右半邊點一下放炸彈。兩個人：左半邊 1P、右半邊 2P，各有自己的炸彈鈕
  const k = duoTouch() ? (e.clientX < cw / 2 ? 0 : 1) : (e.clientX < cw * .55 ? 0 : -1);
  if (k < 0) { wantBomb(0); return; }
  const st = sticks[k]; if (st.id != null) return;
  st.id = e.pointerId; st.o = { x: e.clientX, y: e.clientY }; st.dir = null;
  st.el.style.left = e.clientX + 'px'; st.el.style.top = e.clientY + 'px'; st.el.classList.remove('idle');
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
});
cv.addEventListener('pointermove', e => {
  const st = sticks.find(q => q.id === e.pointerId); if (!st) return;
  const dx = e.clientX - st.o.x, dy = e.clientY - st.o.y, d = Math.hypot(dx, dy);
  // 手指滑太遠時底座跟著走，換方向不用把手指拉回來
  if (d > 60) { st.o.x += dx * (d - 60) / d; st.o.y += dy * (d - 60) / d; st.el.style.left = st.o.x + 'px'; st.el.style.top = st.o.y + 'px'; }
  st.dir = d < 14 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
  const k = Math.min(1, 42 / (d || 1));
  st.el.firstElementChild.style.transform = `translate(${dx * k}px,${dy * k}px)`;
});
function stickUp(e) { const st = sticks.find(q => q.id === e.pointerId); if (!st) return; st.id = null; st.dir = null; stickHome(); }
cv.addEventListener('pointerup', stickUp); cv.addEventListener('pointercancel', stickUp);
[['bBomb', 0], ['bBomb2', 1]].forEach(([id, k]) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); wantBomb(k); $(id).classList.add('on'); setTimeout(() => $(id).classList.remove('on'), 120); au(); }));
addEventListener('contextmenu', e => e.preventDefault());
function applyInput(G) {
  for (const p of G.players) {
    if (!p.human || p.bot) continue;
    let d = stacks[p.id] && stacks[p.id][stacks[p.id].length - 1];
    if (sticks[p.id] && sticks[p.id].dir) d = sticks[p.id].dir;
    const v = d ? DV[d] : [0, 0]; p.ix = v[0]; p.iy = v[1];
  }
}

// ───────── 流程 ─────────
function show(id) { for (const s of document.querySelectorAll('.scr')) s.hidden = s.id !== id; }
function dlg(title, body, btns) {
  $('dT').textContent = title; $('dB').innerHTML = body || ''; const box = $('dBtn'); box.innerHTML = '';
  for (const b of btns) { const el = document.createElement('button'); el.className = 'big' + (b.pri ? ' pri' : ''); el.textContent = b.label; el.onclick = () => { sfx.ui(); $('dlg').hidden = true; b.fn(); }; box.appendChild(el); }
  $('dlg').hidden = false;
}
function enterPlay(G) {
  S.G = G; S.scene = 'play'; S.paused = false; S.intro = 1.3; S.shownOver = false; S.fast = false; parts.length = 0; floats.length = 0; rings.length = 0; scorch.fill(0); hitStop = 0; lastSec = -1; bannerT = 0; shake = 0;
  stacks[0].length = stacks[1].length = 0; sticks.forEach(st => { st.id = null; st.dir = null; });
  show(''); $('hud').hidden = false; $('dlg').hidden = true;
  const adv = G.mode === 'adv'; $('cHearts').hidden = !adv; $('cKit').hidden = !adv; $('cScore').hidden = adv;
  updateHud(G); showTouch(); layout(); requestAnimationFrame(layout);
}
function toMenu(screen) {
  S.scene = 'menu'; S.paused = false; $('hud').hidden = true; $('dlg').hidden = true; showTouch();
  S.G = C.newBattle({ humans: 0, bots: 4, level: 1 }); parts.length = 0; floats.length = 0;
  show(screen || 'sTitle'); layout();
  if (screen === 'sStages') renderStages();
}
function startStage(i) {
  S.stage = i; S.match = null;
  const G = C.newAdventure(i, { kid: save.kid });
  if (/[?&]auto=1/.test(location.search)) { G.players[0].bot = C.mkBot(2); }
  enterPlay(G);
}
function startMatch() {
  const b = save.bt, humans = b.h, bots = Math.min(b.b, 4 - humans);
  S.match = { humans, bots, level: b.l, target: b.w, wins: [0, 0, 0, 0], round: 0 };
  nextRound();
}
function nextRound() { const M = S.match; M.round++; enterPlay(C.newBattle({ humans: M.humans, bots: M.bots, level: M.level })); }
function togglePause() {
  if (S.scene !== 'play' || (S.G && S.G.over)) return;
  if (S.paused) { S.paused = false; $('dlg').hidden = true; return; }
  S.paused = true; stacks[0].length = stacks[1].length = 0;
  const adv = S.G.mode === 'adv';
  dlg('暫停', '', [
    { label: '繼續', pri: true, fn: () => { S.paused = false; } },
    { label: '重新開始', fn: () => adv ? startStage(S.stage) : startMatch() },
    { label: adv ? '回選關' : '回對戰設定', fn: () => toMenu(adv ? 'sStages' : 'sBattle') },
  ]);
}
$('bPause').onclick = togglePause;
function starsHtml(n) { return '★'.repeat(n) + '<i>' + '★'.repeat(3 - n) + '</i>'; }
function onOver(G) {
  if (G.mode === 'adv') {
    const o = G.over;
    if (o.win) {
      sfx.win();
      const best = Math.max(save.stars[S.stage] || 0, o.stars); save.stars[S.stage] = best; store();
      const last = S.stage === C.STAGES.length - 1;
      const btns = [];
      if (!last) btns.push({ label: '下一關 →', pri: true, fn: () => startStage(S.stage + 1) });
      btns.push({ label: '再玩一次', pri: last, fn: () => startStage(S.stage) }, { label: '回選關', fn: () => toMenu('sStages') });
      dlg(last ? '全部過關！🎉' : '過關！', `<div class="stars">${starsHtml(o.stars)}</div>${o.lost === 0 ? '<b>✓ 沒有受傷</b>' : '✗ 沒有受傷'}<br>${o.time <= G.par ? '<b>✓' : '✗'} ${G.par} 秒內過關${o.time <= G.par ? '</b>' : ''}（你用了 ${Math.round(o.time)} 秒）`, btns);
    } else {
      sfx.lose();
      dlg(o.timeout ? '時間到了' : '被打倒了', o.timeout ? '下次動作快一點！' : '放完炸彈記得躲到轉角後面。', [
        { label: '再試一次', pri: true, fn: () => startStage(S.stage) }, { label: '回選關', fn: () => toMenu('sStages') }]);
    }
  } else {
    const M = S.match, w = G.over.winner;
    if (w >= 0) M.wins[w]++;
    const human = w >= 0 && G.players[w].human;
    const who = w < 0 ? '平手！' : (M.humans > 1 ? (human ? `${w + 1}P 贏了！` : `${NAMES[w]}（電腦）贏了`) : (human ? '你贏了！' : `${NAMES[w]}贏了`));
    const sc = '<div class="sc">' + G.players.map(p => `<span><b style="background:${COLORS[p.id]}"></b>${M.wins[p.id]}</span>`).join('') + '</div>';
    const done = w >= 0 && M.wins[w] >= M.target;
    if (human) sfx.win(); else sfx.lose();
    if (done) dlg((human ? '🏆 ' : '') + who, sc + (human ? '拿下這場對戰！' : '這場對戰輸了，再來一次？'), [
      { label: '再打一場', pri: true, fn: startMatch }, { label: '回對戰設定', fn: () => toMenu('sBattle') }, { label: '回主選單', fn: () => toMenu() }]);
    else dlg(who, sc + `先贏 ${M.target} 回合的人獲勝`, [{ label: '下一回合', pri: true, fn: nextRound }, { label: '結束對戰', fn: () => toMenu('sBattle') }]);
  }
}

// ───────── 選單 ─────────
let curWorld = 0;
function unlocked(i) { return i === 0 || (save.stars[i - 1] || 0) > 0; }
function renderStages() {
  const tabs = $('wTabs'); tabs.innerHTML = '';
  C.WORLDS.forEach((w, k) => {
    const b = document.createElement('button'); b.className = 'tab' + (k === curWorld ? ' on' : ''); b.textContent = (unlocked(k * C.PER_WORLD) ? '' : '🔒 ') + w.name;
    b.disabled = !unlocked(k * C.PER_WORLD); b.onclick = () => { sfx.ui(); curWorld = k; renderStages(); }; tabs.appendChild(b);
  });
  const g = $('stGrid'); g.innerHTML = '';
  for (let k = 0; k < C.PER_WORLD; k++) {
    const i = curWorld * C.PER_WORLD + k, b = document.createElement('button'), ok = unlocked(i), st = save.stars[i] || 0;
    b.className = 'st' + (C.STAGES[i].boss ? ' boss' : ''); b.disabled = !ok;
    b.innerHTML = ok ? `${C.STAGES[i].boss ? '👑' : k + 1}<small>${starsHtml(st)}</small>` : '🔒';
    b.onclick = () => { sfx.ui(); startStage(i); }; g.appendChild(b);
  }
  $('starTotal').textContent = '★ ' + save.stars.reduce((a, b) => a + (b || 0), 0) + ' / ' + C.STAGES.length * 3;
}
function seg(id, key, after) {
  const el = $(id);
  const paint = () => { for (const b of el.children) b.classList.toggle('on', +b.dataset.v === save.bt[key]); };
  for (const b of el.children) b.onclick = () => { sfx.ui(); save.bt[key] = +b.dataset.v; store(); paint(); if (after) after(); };
  paint(); return paint;
}
function fixBots() {
  const b = save.bt, max = 4 - b.h, min = b.h === 1 ? 1 : 0;
  b.b = Math.max(min, Math.min(max, b.b));
  for (const el of $('oB').children) { const v = +el.dataset.v; el.disabled = v > max || v < min; el.classList.toggle('on', v === b.b); }
  for (const el of $('oL').children) el.disabled = b.b === 0;
}
seg('oH', 'h', fixBots); seg('oB', 'b', fixBots); seg('oL', 'l'); seg('oW', 'w'); fixBots();
$('mAdv').onclick = () => { sfx.ui(); let i = 0; while (i < C.STAGES.length - 1 && (save.stars[i] || 0) > 0) i++; curWorld = (i / C.PER_WORLD) | 0; show('sStages'); renderStages(); };
$('mBat').onclick = () => { sfx.ui(); show('sBattle'); };
$('mHelp').onclick = () => { sfx.ui(); show('sHelp'); };
$('bGo').onclick = () => { sfx.ui(); startMatch(); };
for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { sfx.ui(); show('sTitle'); };
function paintKid() { $('mKid').classList.toggle('on', save.kid); }
$('mKid').onclick = () => { save.kid = !save.kid; store(); paintKid(); sfx.ui(); }; paintKid();
// 聲音鈕輪流切：全部 → 只有音效 → 靜音
function paintMute() { $('bMute').textContent = save.mute ? '🔇' : save.music ? '🔊' : '🔈'; $('mMusic').classList.toggle('on', save.music && !save.mute); }
$('bMute').onclick = () => { if (save.mute) { save.mute = false; save.music = true; } else if (save.music) save.music = false; else save.mute = true; store(); paintMute(); };
$('mMusic').onclick = () => { if (save.mute) { save.mute = false; save.music = true; } else save.music = !save.music; store(); paintMute(); sfx.ui(); };
paintMute();
document.addEventListener('visibilitychange', () => { if (document.hidden && S.scene === 'play' && !S.paused && S.G && !S.G.over) togglePause(); });

// ───────── 主迴圈 ─────────
let last = 0, acc = 0;
const DT = 1 / 60;
function frame(ms) {
  requestAnimationFrame(frame);
  const t = ms / 1000; let d = Math.min(.1, t - last); last = t; tNow = t;
  const G = S.G; if (!G) return;
  const menu = S.scene === 'menu';
  if (!S.paused) {
    if (S.intro > 0 && !menu) { const was = S.intro; S.intro -= d; if (was > .45 && S.intro <= .45) sfx.go(); }
    else if (hitStop > 0) hitStop -= d;
    else {
      acc += d; let n = 0;
      S.fast = !menu && G.mode === 'battle' && !G.over && G.players.every(p => !p.human || !p.alive);
      const per = S.fast ? 4 : 1;
      while (acc >= DT && n++ < 6) {
        acc -= DT;
        for (let k = 0; k < per && !G.over; k++) { applyInput(G); C.step(G, DT); onEvents(G, menu || (S.fast && k > 0)); }
      }
      if (acc > DT * 6) acc = 0;
    }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += d; p.x += p.vx * d; p.y += p.vy * d; p.vx *= .92; p.vy *= .92; if (p.life >= p.max) parts.splice(i, 1); }
    for (let i = floats.length - 1; i >= 0; i--) { floats[i].life += d; if (floats[i].life >= .9) floats.splice(i, 1); }
    if (shake > 0) shake = Math.max(0, shake - d);
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].life += d; if (rings[i].life >= .3) rings.splice(i, 1); }
    for (let i = 0; i < C.N; i++) { if (G.flameT[i] > 0) scorch[i] = 1.6; else if (scorch[i] > 0) scorch[i] -= d * .5; }
    if (bannerT > 0) bannerT -= d;
  }
  if (menu) { mus.on = false; if (G.over) { S.G = C.newBattle({ humans: 0, bots: 4, level: 1 }); bgDirty = true; } draw(S.G, true); return; }
  const low = G.mode === 'adv' ? G.timeLeft < 30 : G.time > G.sd.start;
  musTick(!S.paused && !G.over && S.intro <= 0, low);
  if (G.mode === 'adv' && G.timeLeft < 10 && !G.over && !S.paused) { const sec = Math.ceil(G.timeLeft); if (sec !== lastSec) { lastSec = sec; sfx.tick(); } }
  updateHud(G); draw(G, false);
  if (G.over && !S.shownOver) { S.shownOver = true; setTimeout(() => onOver(G), 500); }
}
S.dev = { stage: startStage, battle: startMatch, menu: toMenu };
toMenu();
requestAnimationFrame(frame);
})();
