// 燼燈 · 主流程：畫面切換、音效、篝火、對話、主迴圈
(() => {
'use strict';
const EM = window.EM;
const { T } = EM;
const $ = id => document.getElementById(id);
const STEP = 1 / 120;
let mode = 'title';   // title | play | map | pause | dialog | ending
let save = EM.loadSave();

// ───────────── 音效（WebAudio 合成） ─────────────
let ac = null, master = null, musicNodes = null;
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination); } catch (e) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}
function muted() { return EM.G ? EM.G.save.mute : (save && save.mute); }
function tone(f, d, type = 'sine', v = 0.12, f2 = null, delay = 0) {
  if (EM.FAST || muted() || !audio()) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.03);
}
function noise(d, v = 0.12, hp = 800, delay = 0) {
  if (EM.FAST || muted() || !audio()) return;
  const t = ac.currentTime + delay, n = Math.floor(ac.sampleRate * d), buf = ac.createBuffer(1, n, ac.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = v;
  s.connect(f).connect(g).connect(master); s.start(t);
}
const SFX = {
  jump: () => tone(300, 0.1, 'triangle', 0.06, 520), djump: () => { tone(420, 0.14, 'triangle', 0.07, 900); noise(0.1, 0.04, 3000); },
  walljump: () => { tone(260, 0.1, 'square', 0.04, 500); noise(0.06, 0.05, 2000); }, dash: () => noise(0.2, 0.1, 1200),
  land: () => noise(0.06, 0.05, 300), slash: () => noise(0.09, 0.07, 3500), hit: () => { tone(160, 0.08, 'square', 0.08, 80); noise(0.05, 0.08, 1500); },
  hitboss: () => { tone(120, 0.1, 'square', 0.09, 60); noise(0.06, 0.1, 1200); }, kill: () => { tone(90, 0.25, 'sawtooth', 0.07, 40); noise(0.2, 0.08, 600); },
  clang: () => { tone(1400, 0.12, 'square', 0.04, 900); tone(2100, 0.1, 'triangle', 0.03); }, parry: () => tone(1800, 0.08, 'triangle', 0.05, 2400),
  hurt: () => { tone(200, 0.25, 'sawtooth', 0.09, 70); noise(0.15, 0.1, 400); }, die: () => tone(300, 1.2, 'sine', 0.12, 40),
  heal: () => [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'sine', 0.06, null, i * 0.06)), pogo: () => tone(500, 0.08, 'triangle', 0.06, 800),
  bounce: () => tone(200, 0.25, 'sine', 0.1, 600), splash: () => noise(0.25, 0.08, 600), swim: () => noise(0.08, 0.03, 900),
  spit: () => tone(300, 0.12, 'sawtooth', 0.04, 600), charge: () => tone(120, 0.3, 'sawtooth', 0.06, 220), thud: () => { tone(70, 0.2, 'sine', 0.15, 40); noise(0.1, 0.08, 200); },
  crumble: () => noise(0.2, 0.06, 400), break: () => { noise(0.4, 0.12, 300); tone(80, 0.3, 'sine', 0.1, 40); },
  item: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.35, 'triangle', 0.06, null, i * 0.08)),
  ability: () => [262, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.6, 'triangle', 0.06, null, i * 0.1)),
  rest: () => [330, 392, 494].forEach((f, i) => tone(f, 0.8, 'sine', 0.05, null, i * 0.15)),
  bossintro: () => { tone(55, 1.4, 'sawtooth', 0.08, 50); noise(0.8, 0.05, 200); }, bossdie: () => { tone(80, 1.6, 'sawtooth', 0.1, 30); noise(1.2, 0.12, 200); },
  leap: () => noise(0.15, 0.06, 800), slam: () => { tone(60, 0.35, 'sine', 0.18, 30); noise(0.25, 0.12, 150); },
  bossdash: () => noise(0.3, 0.1, 900), bossslash: () => noise(0.12, 0.09, 2500), roar: () => tone(90, 0.7, 'sawtooth', 0.07, 60),
  summon: () => tone(600, 0.4, 'sine', 0.05, 300), burrow: () => noise(0.6, 0.06, 200), emerge: () => noise(0.4, 0.08, 300),
  orb: () => tone(700, 0.3, 'sine', 0.05, 1000), zap: () => { noise(0.3, 0.08, 3000); tone(1200, 0.25, 'square', 0.03, 300); },
  page: () => tone(800, 0.06, 'triangle', 0.04), ui: () => tone(660, 0.06, 'triangle', 0.04),
};
EM.sfx = k => { const f = SFX[k]; if (f) f(); };
// 環境音：每一區一組低音
const DRONE = { A: [55, 82.4], B: [61.7, 92.5], C: [49, 73.4], D: [41.2, 61.7], T: [46.2, 69.3] };
let curMusic = '';
EM.music = function (kind) {
  if (EM.FAST || !EM.G) return;
  const area = EM.G.W.rooms[EM.G.roomIdx].area;
  const key = kind === 'boss' ? 'boss' : area;
  if (key === curMusic) return;
  curMusic = key;
  if (!audio()) return;
  if (musicNodes) { const old = musicNodes; old.g.gain.setTargetAtTime(0, ac.currentTime, 0.6); setTimeout(() => old.oscs.forEach(o => { try { o.stop(); } catch (e) {} }), 3000); }
  if (muted()) { musicNodes = null; return; }
  const g = ac.createGain(); g.gain.value = 0; g.connect(master);
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'boss' ? 900 : 420; f.connect(g);
  const notes = kind === 'boss' ? [55, 58.3, 82.4] : DRONE[area];
  const oscs = notes.map((n, i) => { const o = ac.createOscillator(); o.type = i ? 'triangle' : 'sawtooth'; o.frequency.value = n; o.detune.value = (i - 1) * 6; o.connect(f); o.start(); return o; });
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = kind === 'boss' ? 2 : 0.07; lg.gain.value = kind === 'boss' ? 300 : 160; lfo.connect(lg).connect(f.frequency); lfo.start(); oscs.push(lfo);
  g.gain.setTargetAtTime(kind === 'boss' ? 0.11 : 0.07, ac.currentTime, 1.2);
  musicNodes = { g, oscs };
};
function stopMusic() { if (musicNodes && ac) { const old = musicNodes; old.g.gain.setTargetAtTime(0, ac.currentTime, 0.3); setTimeout(() => old.oscs.forEach(o => { try { o.stop(); } catch (e) {} }), 1500); } musicNodes = null; curMusic = ''; }

// ───────────── 篝火、對話 ─────────────
EM.rest = function (bn) {
  const g = EM.G, s = g.save;
  s.bench = bn.id; if (!s.benches.includes(bn.id)) s.benches.push(bn.id);
  g.P.hp = s.maxHp;
  EM.resetEnemies();
  EM.sfx('rest'); EM.burst(bn.x, bn.y - 20, 24, '#ffb84a', 120);
  EM.float(bn.x, bn.y - 70, '休息了・已存檔');
  EM.persist();
};
let dialogQueue = [];
EM.showDialog = function (text, title = '') {
  if (EM.FAST) return;
  dialogQueue.push({ text, title });
  if (mode === 'play') nextDialog();
};
function nextDialog() {
  const d = dialogQueue.shift();
  if (!d) { $('dialog').hidden = true; mode = 'play'; return; }
  $('dTitle').textContent = d.title; $('dTitle').hidden = !d.title;
  $('dText').textContent = d.text;
  $('dialog').hidden = false; mode = 'dialog'; dialogT = 0;
  EM.sfx('page');
}
let dialogT = 0;
EM.totalItems = () => 6;

// ───────────── 開始、重生 ─────────────
function computeOpenings(Wd) {
  const solid = (x, y) => { if (x < 0 || y < 0 || x >= Wd.W || y >= Wd.H) return true; const t = Wd.grid[y * Wd.W + x]; return t === EM.TL.ROCK || t === EM.TL.SIGIL; };
  for (const R of Wd.rooms) {
    R.openings = [];
    for (let x = R.x; x < R.x + R.w; x++) {
      if (!solid(x, R.y) && !solid(x, R.y - 1)) R.openings.push([x, R.y, true]);
      if (!solid(x, R.y + R.h - 1) && !solid(x, R.y + R.h)) R.openings.push([x, R.y + R.h, true]);
    }
    for (let y = R.y; y < R.y + R.h; y++) {
      if (!solid(R.x, y) && !solid(R.x - 1, y)) R.openings.push([R.x, y, false]);
      if (!solid(R.x + R.w - 1, y) && !solid(R.x + R.w, y)) R.openings.push([R.x + R.w, y, false]);
    }
  }
}
function startGame(s) {
  save = s;
  const g = EM.initGame(s);
  computeOpenings(g.W);
  g.lastArea = g.W.rooms[g.roomIdx].area;
  if (!s.visited.includes(g.W.rooms[g.roomIdx].id)) s.visited.push(g.W.rooms[g.roomIdx].id);
  EM.snapCam();
  mode = 'play';
  showScreen(null);
  document.body.classList.add('playing');
  const A = EM.AREAS[g.lastArea];
  g.banner = { title: A.name, sub: A.en, t: 0 };
  EM.music('area');
  if (!s.bench && !EM.FAST) EM.showDialog('灰燼城的火還在地底燃燒。\n帶著燼燈往下走，找到火的心臟。', '燼燈');
}
function respawn() {
  const g = EM.G, s = g.save;
  s.deaths++;
  const bn = s.bench && g.W.benches.find(b => b.id === s.bench);
  const sp = bn || g.W.spawn;
  g.P = EM.makePlayer(sp.x, sp.y);
  g.roomIdx = EM.roomAtPx(sp.x, sp.y - 10);
  g.crumbles.clear();
  EM.resetEnemies();
  EM.snapCam();
  EM.persist();
  curMusic = ''; EM.music('area');
}

// ───────────── 每一步 ─────────────
function step(dt) {
  const g = EM.G;
  if (g.freeze > 0) { g.freeze -= dt; return; }
  g.t += dt; g.save.time += dt;
  EM.stepPlayer(dt);
  EM.hitTerrain();
  EM.stepActors(dt);
  EM.stepCrumbles(dt);
  EM.stepInteract(dt);
  for (const f of g.fx) { f.t += dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.k === 'spark' ? 0 : 200) * dt; } }
  if (g.fx.length) g.fx = g.fx.filter(f => f.t < f.life);
  for (const f of g.floats) f.t += dt;
  if (g.floats.length) g.floats = g.floats.filter(f => f.t < 1.2);
  if (g.banner) { g.banner.t += dt; if (g.banner.t > 3.4) g.banner = null; }
  g.shake = Math.max(0, g.shake - dt * 1.5); g.flash = Math.max(0, g.flash - dt * 2);
  if (g.P.dead && g.P.deadT > 2.2) respawn();
  if (g.ending) { g.ending.t += dt; if (g.ending.t > 3.5 && mode === 'play' && !EM.FAST) showEnding(); }
}

// ───────────── 畫面 ─────────────
function showScreen(id) { for (const s of ['title', 'pause', 'help', 'ending']) $(s).hidden = s !== id; }
function fmt(t) { const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = Math.floor(t % 60); return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(s).padStart(2, '0'); }
function buildTitle() {
  save = EM.loadSave();
  $('tContinue').hidden = !save || save.done && !save.bench;
  $('tInfo').textContent = save ? `${save.visited.length} 個房間・${save.items.length} / ${EM.totalItems()} 收集・印記 ${save.sigils} / 3・${fmt(save.time)}${save.done ? '・已通關' : ''}` : '';
  if (matchMedia('(pointer: coarse)').matches && innerHeight > innerWidth) $('tInfo').textContent += (save ? '\n' : '') + '把手機橫過來玩，視野比較大';
  showScreen('title'); mode = 'title'; document.body.classList.remove('playing');
}
function showEnding() {
  const g = EM.G, s = g.save;
  s.done = true; EM.persist();
  const rooms = g.W.rooms.length;
  $('eStats').innerHTML = `<span>時間 ${fmt(s.time)}</span><span>倒下 ${s.deaths} 次</span><span>收集 ${s.items.length} / ${EM.totalItems()}</span><span>探索 ${Math.round(s.visited.length / rooms * 100)}%</span>`;
  showScreen('ending'); mode = 'ending'; stopMusic();
}
function setPause(on) {
  if (on && mode === 'play') { mode = 'pause'; showScreen('pause'); $('pInfo').textContent = `${EM.AREAS[EM.G.W.rooms[EM.G.roomIdx].area].name}・收集 ${EM.G.save.items.length} / ${EM.totalItems()}・印記 ${EM.G.save.sigils} / 3・${fmt(EM.G.save.time)}`; syncMute(); }
  else if (!on && mode === 'pause') { mode = 'play'; showScreen(null); }
}
function syncMute() { const m = EM.G ? EM.G.save.mute : save && save.mute; $('pMute').textContent = m ? '聲音：關' : '聲音：開'; }

$('tNew').onclick = () => {
  if (save && !confirmNew()) return;
  EM.clearSave(); audio(); startGame(EM.newSave());
};
function confirmNew() { return $('tNew').dataset.sure === '1' || (($('tNew').dataset.sure = '1'), ($('tNew').textContent = '再按一次：清除存檔重新開始'), false); }
$('tContinue').onclick = () => { audio(); startGame(EM.loadSave()); };
$('tHelp').onclick = () => { showScreen('help'); helpFrom = 'title'; };
$('pResume').onclick = () => setPause(false);
$('pMap').onclick = () => { mode = 'map'; showScreen(null); };
$('pHelp').onclick = () => { showScreen('help'); helpFrom = 'pause'; };
$('pMute').onclick = () => { const s = EM.G.save; s.mute = !s.mute; EM.persist(); syncMute(); if (s.mute) stopMusic(); else { curMusic = ''; EM.music('area'); } };
$('pTitle').onclick = () => { stopMusic(); buildTitle(); };
$('hBack').onclick = () => { if (helpFrom === 'title') showScreen('title'); else showScreen('pause'); };
$('eTitle').onclick = () => buildTitle();
$('dialog').addEventListener('pointerdown', e => { e.preventDefault(); if (dialogT > 0.25) nextDialog(); });
let helpFrom = 'title';

// 觸控按鈕
const markTouch = () => document.body.classList.add('touch');
if (matchMedia('(pointer: coarse)').matches) markTouch();
addEventListener('touchstart', markTouch, { passive: true });
document.querySelectorAll('[data-k]').forEach(btn => {
  const k = btn.dataset.k;
  const down = e => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (err) {} EM.touch[k] = true; btn.classList.add('on'); audio(); };
  const up = e => { e.preventDefault(); EM.touch[k] = false; btn.classList.remove('on'); };
  btn.addEventListener('pointerdown', down); btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('lostpointercapture', up);
  btn.addEventListener('contextmenu', e => e.preventDefault());
});

// ───────────── 主迴圈 ─────────────
let last = performance.now(), acc = 0, hold = false;
const pend = {};
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  EM.pollInput();
  const IN = EM.IN;
  if (mode === 'play') {
    if (IN.pressed.pause) setPause(true);
    else if (IN.pressed.map) mode = 'map';
    else if (!hold) {
      acc += dt;
      // 按鍵「剛按下」要留到下一次物理步驟才用掉（高更新率螢幕一幀可能沒有步驟）
      for (const k in IN.pressed) if (IN.pressed[k]) pend[k] = true;
      while (acc >= STEP) {
        for (const k in IN.pressed) IN.pressed[k] = !!pend[k];
        step(STEP); acc -= STEP;
        for (const k in pend) pend[k] = false;
        if (mode !== 'play') break;
      }
      EM.stepCam(dt);
    }
  } else if (mode === 'map') {
    if (IN.pressed.map || IN.pressed.pause || IN.pressed.attack) mode = 'play';
  } else if (mode === 'dialog') {
    dialogT += dt;
    if (dialogT > 0.25 && (IN.pressed.jump || IN.pressed.attack || IN.pressed.up || IN.pressed.ok)) nextDialog();
  } else if (mode === 'pause') {
    if (IN.pressed.pause) setPause(false);
  } else if (mode === 'title') {
    if (IN.pressed.ok || IN.pressed.jump) { if (!$('tContinue').hidden) $('tContinue').click(); else $('tNew').click(); }
  }
  if (EM.G && mode !== 'title') {
    EM.render(dt);
    if (mode === 'map') EM.drawMap();
  } else EM.renderTitle(dt);
  requestAnimationFrame(frame);
}

// 標題背景：慢慢飄的燼
const tcv = document.getElementById('cv'), tctx = tcv.getContext('2d');
let tt = 0;
EM.renderTitle = function (dt) {
  tt += dt;
  const w = tcv.width, h = tcv.height;
  tctx.setTransform(1, 0, 0, 1, 0, 0);
  const gr = tctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05040a'); gr.addColorStop(1, '#1a0d10');
  tctx.fillStyle = gr; tctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.62;
  const glow = tctx.createRadialGradient(cx, cy, 4, cx, cy, Math.min(w, h) * 0.5);
  glow.addColorStop(0, `rgba(255,170,80,${0.32 + 0.04 * Math.sin(tt * 3)})`); glow.addColorStop(1, 'rgba(255,120,40,0)');
  tctx.fillStyle = glow; tctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 80; i++) {
    const s = (i * 9301 + 49297) % 233280 / 233280, s2 = (i * 4271 + 1231) % 9973 / 9973;
    const x = (s * w + Math.sin(tt * 0.5 + i) * 30) % w, y = h - ((tt * (20 + s2 * 40) + s2 * h) % h);
    tctx.fillStyle = `rgba(255,${140 + (i % 5) * 20},60,${0.3 + 0.4 * s})`; tctx.fillRect(x, y, 2 * (window.devicePixelRatio || 1), 2 * (window.devicePixelRatio || 1));
  }
};

// ───────────── 測試用的小把手 ─────────────
window.__ember = {
  get G() { return EM.G; }, get mode() { return mode; }, IN: EM.IN, touch: EM.touch,
  set hold(v) { hold = v; }, set fast(v) { EM.FAST = v; },
  start: (s) => { EM.NOSAVE = true; startGame(Object.assign(EM.newSave(), s || {})); },
  step: n => { for (let i = 0; i < n; i++) step(STEP); }, STEP,
  press: (k, v) => { EM.touch[k] = v; }, poll: () => EM.pollInput(),
  snap: () => EM.snapCam(), closeDialog: () => { dialogQueue = []; $('dialog').hidden = true; mode = 'play'; },
  goto: (roomId, x, y) => { const g = EM.G, R = g.W.rooms.find(r => r.id === roomId); g.P.x = (R.x + x) * T + T / 2; g.P.y = (R.y + y + 1) * T; g.P.vx = g.P.vy = 0; g.roomIdx = R.idx; EM.snapCam(); },
};

buildTitle();
requestAnimationFrame(frame);
})();
