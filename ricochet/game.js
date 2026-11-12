// 反彈神射手：畫面、操作、回合流程、存檔
(function () {
  'use strict';
  const Core = window.RicoCore, LEVELS = window.RICO_LEVELS, WORLDS = LEVELS.WORLDS, C = Core.C, Art = window.RicoArt;
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  if (isTouch) document.documentElement.classList.add('touch');

  // ── 存檔：ricochet:v1 = { best: { "<關卡序號 0 起>": 星數 } }（關卡只往後加，序號不變）──
  const SAVE_KEY = 'ricochet:v1';
  let save = { best: {} };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.best) save = s; } catch (e) {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
  let muted = false;
  try { muted = localStorage.getItem('ricochet:mute') === '1'; } catch (e) {}

  // ── 聲音（WebAudio 合成，不用音檔）──
  let ac = null;
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, slide) {
    if (muted) return; const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq) {
    if (muted) return; const a = audio(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass'; f.frequency.value = freq || 1800; g.gain.value = vol || 0.3;
    s.buffer = buf; s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    shoot() { noise(0.12, 0.35, 2600); tone(520, 0.1, 'square', 0.06, 180); },
    eshoot() { noise(0.1, 0.25, 1400); tone(300, 0.12, 'sawtooth', 0.06, 120); },
    bounce(kind) { kind === 'mirror' || kind === 'shield' ? tone(1400, 0.12, 'sine', 0.12, 1900) : tone(880, 0.07, 'triangle', 0.12, 660); },
    soft() { tone(200, 0.15, 'sine', 0.15, 90); },
    glass() { for (let k = 0; k < 4; k++) setTimeout(() => tone(2000 + Math.random() * 1500, 0.08, 'triangle', 0.06), k * 30); noise(0.15, 0.15, 6000); },
    portal() { tone(500, 0.18, 'sine', 0.1, 1500); },
    hit() { tone(300, 0.18, 'square', 0.1, 80); noise(0.1, 0.2, 1200); },
    hurt() { tone(220, 0.12, 'square', 0.1, 160); },
    ouch() { tone(400, 0.25, 'sawtooth', 0.1, 120); },
    boom() { noise(0.6, 0.6, 700); tone(120, 0.5, 'sawtooth', 0.12, 40); },
    step() { tone(160, 0.05, 'triangle', 0.08); },
    tick() { tone(1200, 0.025, 'square', 0.03); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.12), i * 110)); },
    lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.1), i * 150)); },
  };

  // ── 遊戲狀態 ──
  let lvIdx = 0, world = null, def = null;
  let angle = 30;                // 世界角度（0° 朝右、逆時針為正）
  let state = null;              // Core.newState
  let shotsLeft = 0, shotsUsed = 0;
  let phase = 'menu';            // 'aim' 瞄準 | 'shot' 玩家子彈在飛 | 'enemy' 敵人回合 | 'over' 結束 | 'menu' | 'result'
  let bullet = null, trail = [];
  let fx = [];
  let shake = 0, time = 0;
  let enemyAnim = [], knock = [], looks = [], hurtT = [], deadPos = [];
  let hostAnim = [];             // 人質被打到的時間
  let eq = [], moveT = 1, prevTurn = 0, eWait = 0;   // 敵人回合：開槍排隊、移動動畫、等待
  let hintAngle = null, hintUsed = false;
  const hero = { recoil: 0, mood: 'idle', moodT: 0 };
  const playing = () => phase === 'aim' || phase === 'shot' || phase === 'enemy' || phase === 'over';

  // ── 畫面配置：場地 800×560 等比縮放；直式螢幕把場地轉 90°，讓它變高 ──
  let dpr = 1, vw = 0, vh = 0, s = 1, ox = 0, oy = 0, portrait = false;
  const TOP = 64, BOTTOM = isTouch ? 92 : 112;   // 桌機下面多留一行操作說明
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    vw = innerWidth; vh = innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    const aw = vw - 16, ah = vh - TOP - BOTTOM;
    portrait = ah > aw * 1.1;
    const MG = Art.MARGIN;                                  // 外框寬度也要放得下
    const ww = (portrait ? C.H : C.W) + MG * 2, wh = (portrait ? C.W : C.H) + MG * 2;
    s = Math.min(aw / ww, ah / wh);
    ox = (vw - ww * s) / 2 + MG * s; oy = TOP + (ah - wh * s) / 2 + MG * s;
  }
  function setWorldTransform(ex, ey) {
    ex = ex || 0; ey = ey || 0;
    if (portrait) ctx.setTransform(0, -s * dpr, s * dpr, 0, (ox + ex) * dpr, (oy + C.W * s + ey) * dpr);
    else ctx.setTransform(s * dpr, 0, 0, s * dpr, (ox + ex) * dpr, (oy + ey) * dpr);
  }
  function toWorld(sx, sy) {
    return portrait ? { x: C.W - (sy - oy) / s, y: (sx - ox) / s } : { x: (sx - ox) / s, y: (sy - oy) / s };
  }
  const norm = a => ((a % 360) + 360) % 360;
  const toShown = a => norm(a + (portrait ? 90 : 0));        // 畫面上看到的角度（直式時場地轉了 90°）
  const shownAngle = () => toShown(angle);
  const worldOf = i => WORLDS.findIndex(w => i >= w.from && i <= w.to);

  // ── 進關 ──
  function load(i) {
    lvIdx = i; def = LEVELS[i]; world = Core.build(def);
    state = Core.newState(world);
    shotsLeft = def.shots; shotsUsed = 0; bullet = null; trail = []; fx = []; shake = 0;
    enemyAnim = world.enemies.map(() => -1);
    knock = world.enemies.map(() => [0, 0]);
    hurtT = world.enemies.map(() => -1);
    deadPos = world.enemies.map(() => null);
    looks = world.enemies.map(e => Art.enemyLook(e.i, i + 1, e.type));
    hostAnim = world.hostages.map(() => -1);
    eq = []; moveT = 1; prevTurn = 0; eWait = 0;
    hintAngle = null; hintUsed = false; hintId++;
    hero.recoil = 0; hero.mood = 'idle'; hero.moodT = 0;
    // 預設角度：朝場地中間
    angle = Math.round(norm(Math.atan2(-(C.H / 2 - world.player.y), C.W / 2 - world.player.x) * 180 / Math.PI) * 10) / 10;
    if (Math.abs(world.player.x - C.W / 2) < 60 && Math.abs(world.player.y - C.H / 2) < 60) angle = 90;
    phase = 'aim';
    $('menu').hidden = true; $('result').hidden = true;
    $('hud').hidden = false; $('ctrl').hidden = false; $('hint').hidden = false;
    const w = worldOf(i);
    $('lvName').innerHTML = `<span class="t">${w + 1}-${i - WORLDS[w].from + 1}</span>${def.name}`;
    showTip(def.tip);
    refresh();
  }
  let tipTimer = 0;
  function showTip(t, ms) {
    const el = $('tip'); clearTimeout(tipTimer);
    if (!t) { el.hidden = true; return; }
    el.textContent = t; el.hidden = false; el.classList.remove('fade');
    tipTimer = setTimeout(() => { el.classList.add('fade'); tipTimer = setTimeout(() => (el.hidden = true), 500); }, ms || 5000);
  }
  function refresh() {
    if (!def) return;
    $('angNum').textContent = shownAngle().toFixed(1) + '°';
    let h = '';
    for (let k = 0; k < def.shots; k++) h += `<span class="shell${k < shotsUsed ? ' used' : ''}"></span>`;
    $('ammo').innerHTML = h;
    const maxHp = def.hp || C.HP;
    let hh = '';
    if (innerWidth < 480) hh = `<span class="heart">❤</span><b style="color:var(--ink)">${state.hp}</b>`;
    else for (let k = 0; k < maxHp; k++) hh += `<span class="heart${k < state.hp ? '' : ' lost'}">❤</span>`;
    $('hearts').innerHTML = hh;
    $('fire').disabled = phase !== 'aim' || shotsLeft <= 0;
    $('bHint').disabled = phase !== 'aim';
    $('bMute').textContent = muted ? '🔇' : '🔊';
    $('mMute').textContent = muted ? '🔇 聲音關' : '🔊 聲音開';
  }

  // ── 發射 ──
  function fire() {
    if (phase !== 'aim' || shotsLeft <= 0) return;
    audio();
    bullet = Core.makeBullet(world, angle);
    trail = [[bullet.x, bullet.y]];
    shotsLeft--; shotsUsed++;
    phase = 'shot'; hintAngle = null;
    sfx.shoot(); hero.recoil = 1;
    fx.push({ t: 'flash', x: world.player.x + bullet.vx * 38, y: world.player.y + bullet.vy * 38, life: 0.14, max: 0.14 });
    for (let k = 0; k < 4; k++) fx.push({ t: 'smoke', x: world.player.x + bullet.vx * 40, y: world.player.y + bullet.vy * 40, r: 5 + k * 2, life: 0.5, max: 0.5 });
    showTip(null);
    refresh();
  }
  const HIT_WORDS = ['砰！', '咚！', '啪！', '中！', '耶！'];
  function onEvent(type, d) {
    if (type === 'bounce') {
      sfx.bounce(d.kind);
      const c = d.kind === 'mirror' || d.kind === 'shield' ? '#bfe8ff' : '#ffd46b';
      spark(d.x, d.y, c, 9); fx.push({ t: 'ring', x: d.x, y: d.y, r: 4, color: c, life: 0.3, max: 0.3 });
    } else if (type === 'stop') {
      if (d.soft) { sfx.soft(); spark(d.x, d.y, '#c9b0ff', 12); fx.push({ t: 'word', x: d.x, y: d.y, text: '噗', color: '#c9b0ff', life: 0.7, max: 0.7 }); }
      else if (!d.fizzle) spark(d.x, d.y, '#bbb', 8);
    } else if (type === 'glass') {
      sfx.glass();
      const g = world.glass[d.i];
      for (let k = 0; k < 18; k++) {
        const x = g.box[0] + Math.random() * g.box[2], y = g.box[1] + Math.random() * g.box[3], a = Math.random() * 6.283, v = 60 + Math.random() * 220;
        fx.push({ t: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, sz: 4 + Math.random() * 7, life: 0.7 + Math.random() * 0.4, max: 1.1 });
      }
      fx.push({ t: 'word', x: d.x, y: d.y, text: '鏘！', color: '#bfe8ff', life: 0.8, max: 0.8 });
    } else if (type === 'portal') {
      sfx.portal();
      fx.push({ t: 'ring', x: d.x, y: d.y, r: 14, color: portalColor(d.to >> 1), life: 0.4, max: 0.4 });
      const fp = d.from & 1 ? world.portals[d.from >> 1].b : world.portals[d.from >> 1].a;
      fx.push({ t: 'ring', x: fp[0], y: fp[1], r: 14, color: portalColor(d.from >> 1), life: 0.4, max: 0.4 });
    } else if (type === 'hit') {
      sfx.hit(); enemyAnim[d.i] = 0; deadPos[d.i] = [d.x, d.y];
      let vx = d.vx, vy = d.vy;
      if (!vx && !vy) { vx = d.x - world.player.x; vy = d.y - world.player.y; }
      const L = Math.hypot(vx, vy) || 1;
      knock[d.i] = [vx / L, vy / L];
      spark(d.x, d.y, '#7fdc7a', 14); spark(d.x, d.y, '#fff', 6);
      fx.push({ t: 'ring', x: d.x, y: d.y, r: 18, life: 0.45, max: 0.45 });
      const friendly = bullet && bullet.owner !== 'player';
      fx.push({ t: 'word', x: d.x, y: d.y - 24, text: friendly ? '打到自己人！' : world.enemies[d.i].type === 'boss' ? 'KO！' : HIT_WORDS[(d.i + shotsUsed) % HIT_WORDS.length], life: 1, max: 1 });
    } else if (type === 'hurt') {
      sfx.hurt(); hurtT[d.i] = 0; shake = Math.max(shake, 6);
      spark(d.x, d.y, '#fff', 10);
      fx.push({ t: 'word', x: d.x, y: d.y - 40, text: `剩 ${d.hp}！`, color: '#ff7a7a', life: 0.9, max: 0.9 });
    } else if (type === 'barrel') {
      sfx.boom(); shake = Math.max(shake, 16);
      fx.push({ t: 'boom', x: d.x, y: d.y, life: 0.7, max: 0.7 });
      fx.push({ t: 'word', x: d.x, y: d.y - 20, text: '轟！', color: '#ff7a3d', life: 1, max: 1 });
      spark(d.x, d.y, '#ffb347', 30, 420); spark(d.x, d.y, '#7a4a24', 12, 300);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; fx.push({ t: 'smoke', x: d.x + Math.cos(a) * 30, y: d.y + Math.sin(a) * 30, r: 12, life: 0.9, max: 0.9 }); }
      for (const e of world.enemies) if (enemyAnim[e.i] >= 0 && enemyAnim[e.i] < 0.05) {
        const [x, y] = Core.enemyPos(world, e, state.turn), L = Math.hypot(x - d.x, y - d.y) || 1; knock[e.i] = [(x - d.x) / L, (y - d.y) / L];
      }
    } else if (type === 'hostage') {
      hostAnim[d.i] = 0; sfx.ouch();
      fx.push({ t: 'word', x: d.x, y: d.y - 26, text: '哎呀！', color: '#ff9ec4', life: 1.2, max: 1.2 });
    } else if (type === 'ouch') {
      sfx.ouch(); hero.mood = 'ouch'; hero.moodT = 0.7; shake = Math.max(shake, 10);
      spark(d.x, d.y, '#ff6b6b', 16);
      fx.push({ t: 'word', x: d.x, y: d.y - 40, text: d.by === 'player' ? '打到自己了！' : '好痛！', color: '#ff7a7a', life: 1.1, max: 1.1 });
      refresh();
    }
  }
  function spark(x, y, color, n, sp) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = (sp || 220) * (0.3 + Math.random() * 0.7);
      fx.push({ t: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.3, max: 0.6, color });
    }
  }
  const PORTAL_COLORS = ['#ff8a3d', '#7b6bff', '#2fc6a0'];
  const portalColor = k => PORTAL_COLORS[k % PORTAL_COLORS.length];

  // 玩家子彈飛完
  function afterShot() {
    const r = Core.judge(world, state, shotsLeft);
    if (r !== 'next') return end(r === 'win');
    // 敵人回合：回合數 +1（會動的東西開始走），排隊開槍
    prevTurn = state.turn;
    eq = Core.enemyTurn(world, state);
    moveT = world.movers.length || world.enemies.some(e => e.path && !state.dead.has(e.i)) ? 0 : 1;
    if (moveT === 0) sfx.step();
    eWait = eq.length ? 0.35 : 0;
    phase = 'enemy';
    refresh();
  }
  function enemyStep(dt) {
    if (moveT < 1) { moveT = Math.min(1, moveT + dt / 0.45); return; }
    if (bullet) return;
    if (eWait > 0) { eWait -= dt; return; }
    if (state.hp <= 0 || state.hostage) return end(false);
    while (eq.length && state.dead.has(eq[0])) eq.shift();
    if (eq.length) {
      const i = eq.shift(), e = world.enemies[i];
      const from = Core.enemyPos(world, e, state.turn);
      bullet = Core.makeBullet(world, Core.enemyAim(world, state, i), from, i);
      trail = [[bullet.x, bullet.y]];
      sfx.eshoot();
      fx.push({ t: 'flash', x: from[0] + bullet.vx * 30, y: from[1] + bullet.vy * 30, life: 0.14, max: 0.14 });
      eWait = 0.25;
      return;
    }
    if (Core.allDead(world, state)) return end(true);
    phase = 'aim';
    refresh();
  }
  function end(win) {
    phase = 'over';
    hero.mood = win ? 'win' : 'sad'; hero.moodT = 0;
    setTimeout(() => finish(win), win ? 1100 : 1000);
    refresh();
  }
  function finish(win) {
    if (phase !== 'over') return;
    phase = 'result';
    if (win) {
      let stars = shotsUsed <= def.par ? 3 : shotsUsed <= def.par + 1 ? 2 : 1;
      if (hintUsed) stars = Math.min(stars, 2);
      const prev = save.best[lvIdx] || 0;
      if (stars > prev) { save.best[lvIdx] = stars; persist(); }
      $('rTitle').textContent = stars === 3 ? '太神啦！' : '過關！';
      $('rStars').innerHTML = '★'.repeat(stars) + '<i>' + '★'.repeat(3 - stars) + '</i>';
      $('rText').textContent = stars === 3 ? `用 ${shotsUsed} 發子彈就清光了！`
        : hintUsed && shotsUsed <= def.par ? '這次有用提示，自己想出來可以拿三顆星喔！'
        : `用了 ${shotsUsed} 發。${def.par} 發${def.par === 1 ? '就' : '內'}清光可以拿三顆星喔！`;
      $('rNext').hidden = lvIdx >= LEVELS.length - 1;
      sfx.win();
    } else {
      const left = world.enemies.length - state.dead.size;
      if (state.hostage) { $('rTitle').textContent = '打到小雪兔了'; $('rText').textContent = '小雪兔被打到會痛！換條路線繞過牠。'; }
      else if (state.hp <= 0) { $('rTitle').textContent = '愛心用完了'; $('rText').textContent = '小心反彈回來的子彈，還有敵人的反擊！'; }
      else { $('rTitle').textContent = '子彈用完了'; $('rText').textContent = `還剩 ${left} 個敵人。換個角度再試試！`; }
      $('rStars').innerHTML = '<i>★★★</i>';
      $('rNext').hidden = true;
      sfx.lose();
    }
    $('rRetry').classList.toggle('main', !win);
    $('result').hidden = false;
  }

  // ── 提示：用解題器找這個局面的下一發（在 Worker 裡算，畫面不會卡）──
  let hintWorker = null, hintId = 0;
  function hint() {
    if (phase !== 'aim') return;
    const id = ++hintId, lv = lvIdx, shots = shotsLeft;
    const st = { dead: [...state.dead], boom: [...state.boom], glass: [...state.glass], turn: state.turn, hp: state.hp, bossHp: state.bossHp.slice() };
    showTip('💡 想一想…', 20000);
    const done = plan => {
      if (id !== hintId || lv !== lvIdx || phase !== 'aim' || shots !== shotsLeft) return;   // 局面已經變了
      if (!plan.length) { showTip('這個局面好像過不了了，按 ↻ 重來吧！', 4000); return; }
      hintAngle = plan[0].at; hintUsed = true;
      showTip(`💡 試試看 ${toShown(hintAngle).toFixed(1)}°（金色虛線）。用提示這關最多兩顆星。`, 6000);
    };
    try {
      if (!hintWorker) { hintWorker = new Worker('hint-worker.js'); hintWorker.onmessage = e => hintCb[e.data.id] && hintCb[e.data.id](e.data.plan); }
      hintCb[id] = plan => { delete hintCb[id]; done(plan); };
      hintWorker.postMessage({ id, lv, st, shots });
    } catch (e) {                                    // 不支援 Worker：直接算
      setTimeout(() => { const s2 = Core.cloneState(state); done(Core.solve(world, s2, shots, { step: 0.25, minWin: 0.6, maxStates: 200 }).plan); }, 30);
    }
  }
  const hintCb = {};

  // ── 選關畫面 ──
  function unlocked(i) { return i === 0 || (save.best[i - 1] || 0) > 0; }
  function showMenu() {
    phase = 'menu'; bullet = null;
    $('hud').hidden = true; $('ctrl').hidden = true; $('hint').hidden = true; $('tip').hidden = true; $('result').hidden = true;
    const g = $('grid'); g.innerHTML = '';
    const next = LEVELS.findIndex((_, i) => !save.best[i]);
    WORLDS.forEach((W, wi) => {
      let got = 0; for (let i = W.from; i <= W.to; i++) got += save.best[i] || 0;
      const open = unlocked(W.from);
      const h = document.createElement('div');
      h.className = 'wh ' + W.theme + (open ? '' : ' lock');
      h.innerHTML = `<b>第 ${wi + 1} 世界</b>${W.name}<span>★ ${got} / ${(W.to - W.from + 1) * 3}</span>`;
      g.appendChild(h);
      for (let i = W.from; i <= W.to; i++) {
        const L = LEVELS[i], b = document.createElement('button');
        const st = save.best[i] || 0, op = unlocked(i);
        b.className = 'lv ' + W.theme + (op ? '' : ' lock') + (i === next && op ? ' next' : '');
        b.innerHTML = `<div class="n">${wi + 1}-${i - W.from + 1}</div><div class="nm">${L.name}</div><div class="st">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></div>`;
        if (op) b.onclick = () => { audio(); load(i); };
        g.appendChild(b);
      }
    });
    $('menu').hidden = false;
    $('mMute').textContent = muted ? '🔇 聲音關' : '🔊 聲音開';
    // 捲到下一關
    const nx = g.querySelector('.next');
    if (nx && nx.scrollIntoView) setTimeout(() => nx.scrollIntoView({ block: 'center' }), 0);
  }

  // ── 操作 ──
  function setAngle(a, quiet) {
    const na = Math.round(norm(a) * 10) / 10;
    if (na !== angle) { angle = na; if (!quiet) sfx.tick(); refresh(); }
  }
  function aimAt(sx, sy) {
    const p = toWorld(sx, sy);
    const dx = p.x - world.player.x, dy = p.y - world.player.y;
    if (dx * dx + dy * dy < 16) return;
    setAngle(Math.atan2(-dy, dx) * 180 / Math.PI, true);
  }
  let dragging = false;
  cv.addEventListener('pointerdown', e => {
    if (phase !== 'aim') return;
    dragging = true; cv.setPointerCapture(e.pointerId); aimAt(e.clientX, e.clientY);
  });
  cv.addEventListener('pointermove', e => { if (dragging && phase === 'aim') aimAt(e.clientX, e.clientY); });
  const endDrag = () => { dragging = false; };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

  // 微調按鈕：點一下 0.2°，按住越轉越快
  function holdButton(el, dir) {
    let t1 = 0, t2 = 0, n = 0;
    const step = () => { n++; setAngle(angle + dir * (n > 25 ? 2 : n > 10 ? 1 : 0.2)); };
    const stop = () => { clearTimeout(t1); clearInterval(t2); el.classList.remove('on'); };
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); if (phase !== 'aim') return; audio();
      n = 0; step(); el.classList.add('on');
      t1 = setTimeout(() => { t2 = setInterval(step, 70); }, 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => el.addEventListener(k, stop));
  }
  holdButton($('bCCW'), +1);
  holdButton($('bCW'), -1);
  $('fire').onclick = fire;
  $('bRetry').onclick = () => load(lvIdx);
  $('bHint').onclick = hint;
  $('bMenu').onclick = showMenu;
  $('bMute').onclick = $('mMute').onclick = () => { muted = !muted; try { localStorage.setItem('ricochet:mute', muted ? '1' : '0'); } catch (e) {} refresh(); $('mMute').textContent = muted ? '🔇 聲音關' : '🔊 聲音開'; };
  $('rMenu').onclick = showMenu;
  $('rRetry').onclick = () => load(lvIdx);
  $('rNext').onclick = () => load(Math.min(lvIdx + 1, LEVELS.length - 1));

  addEventListener('keydown', e => {
    if (phase === 'menu') { if (e.key === 'Escape') location.href = '../index.html'; return; }
    if (phase === 'result') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (!$('rNext').hidden ? $('rNext') : $('rRetry')).click(); }
      else if (e.key === 'r' || e.key === 'R') load(lvIdx);
      else if (e.key === 'Escape') showMenu();
      return;
    }
    const fine = e.shiftKey ? 0.1 : 0.5;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); if (phase === 'aim') setAngle(angle + fine); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); if (phase === 'aim') setAngle(angle - fine); }
    else if (e.key === ' ' || e.key === 'Enter' || e.key === 'f' || e.key === 'F') { e.preventDefault(); fire(); }
    else if (e.key === 'h' || e.key === 'H') hint();
    else if (e.key === 'r' || e.key === 'R') load(lvIdx);
    else if (e.key === 'Escape') showMenu();
  });
  addEventListener('resize', () => { layout(); refresh(); });

  // ── 更新 ──
  function update(dt) {
    if (bullet) {
      Core.advance(world, bullet, C.SPEED * dt, state, onEvent);
      trail.push([bullet.x, bullet.y]);
      if (trail.length > 14) trail.shift();
      // 傳送：軌跡斷開
      const P = bullet.path; if (P.length >= 2 && P[P.length - 2] === null) trail = [[bullet.x, bullet.y]];
      if (bullet.dead) {
        const mine = bullet.owner === 'player';
        bullet = null;
        if (mine && phase === 'shot') afterShot();
      }
    } else if (trail.length) trail.shift();
    if (phase === 'enemy') enemyStep(dt);
    for (const f of fx) {
      f.life -= dt;
      if (f.t === 'p' || f.t === 'shard') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; if (f.rot != null) f.rot += f.vr * dt; }
    }
    fx = fx.filter(f => f.life > 0);
    for (let i = 0; i < enemyAnim.length; i++) { if (enemyAnim[i] >= 0) enemyAnim[i] += dt; if (hurtT[i] >= 0) hurtT[i] += dt; }
    for (let i = 0; i < hostAnim.length; i++) if (hostAnim[i] >= 0) hostAnim[i] += dt;
    shake = Math.max(0, shake - dt * 40);
    hero.recoil = Math.max(0, hero.recoil - dt * 7);
    if (hero.mood === 'ouch') { hero.moodT -= dt; if (hero.moodT <= 0 && phase !== 'over') hero.mood = 'idle'; }
  }

  // ── 繪圖 ──
  let sceneCv = null, sceneKey = '', bgCv = null, bgKey = '';
  const forceTheme = new URLSearchParams(location.search).get('theme');   // 測試用：?theme=ice
  const themeOf = () => forceTheme || (def && def.theme) || 'camp';
  function ensureCaches() {
    const res = Math.min(3, Math.max(1, Math.ceil(s * dpr * 2) / 2));
    const sk = lvIdx + '|' + res + '|' + themeOf();
    if (sk !== sceneKey) { sceneKey = sk; sceneCv = Art.scene(def, world, themeOf(), res, lvIdx * 13 + 7); }
    const bk = vw + 'x' + vh + '|' + dpr + '|' + themeOf();
    if (bk !== bgKey) { bgKey = bk; bgCv = Art.backdrop(themeOf(), vw, vh, dpr, 11); }
  }
  const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  // 畫面上的位置（回合之間有移動動畫）
  function shownEnemyPos(e) {
    const b = Core.enemyPos(world, e, state.turn);
    if (moveT >= 1 || !e.path) return b;
    const a = Core.enemyPos(world, e, prevTurn), k = ease(moveT);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }
  function shownMoverBox(m) {
    const b = Core.moverBox(m, state.turn);
    if (moveT >= 1) return b;
    const a = Core.moverBox(m, prevTurn), k = ease(moveT);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, b[2], b[3]];
  }
  function shieldAt(e, x, y) {
    const P = Core.shieldPts(world, e, state.turn), [px, py] = Core.enemyPos(world, e, state.turn);
    return P.map(q => [q[0] + x - px, q[1] + y - py]);
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!world) { ctx.fillStyle = '#e9dfc8'; ctx.fillRect(0, 0, vw, vh); return; }
    ensureCaches();
    ctx.drawImage(bgCv, 0, 0, vw, vh);
    const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0;
    setWorldTransform(sx, sy);
    Art.use(ctx, portrait);
    const MG = Art.MARGIN, th = themeOf();
    ctx.fillStyle = 'rgba(20,10,30,.25)'; Art.rr(ctx, -MG + 6, -MG + 10, C.W + MG * 2, C.H + MG * 2, 14); ctx.fill();
    ctx.drawImage(sceneCv, -MG, -MG, C.W + MG * 2, C.H + MG * 2);
    const aiming = phase === 'aim';
    // 傳送門
    world.portals.forEach((p, k) => { Art.portal(p.a[0], p.a[1], portalColor(k), time, 0); Art.portal(p.b[0], p.b[1], portalColor(k), time, 1); });
    // 會動的牆（瞄準時顯示下一回合的位置）
    for (const m of world.movers) {
      if (aiming) Art.moverGhost(Core.moverBox(m, state.turn + 1));
      Art.mover(shownMoverBox(m), th, m.kind);
    }
    // 玻璃
    for (const g of world.glass) if (!state.glass.has(g.i)) Art.glass(g.box, time);
    for (const r of world.barrels) if (!state.boom.has(r.i)) Art.barrel(r.x, r.y, time + r.i);
    world.hostages.forEach(h => Art.hostage(h.x, h.y, { t: time + h.i, hurt: hostAnim[h.i], happy: phase === 'over' && hero.mood === 'win', scared: !!bullet }));
    // 敵人：先畫倒下的，再畫活著的
    const lp = world.player;
    for (const pass of [0, 1]) for (const e of world.enemies) {
      const t = enemyAnim[e.i];
      if ((t >= 0) !== (pass === 0)) continue;
      const [x, y] = t >= 0 ? (deadPos[e.i] || Core.enemyPos(world, e, state.turn)) : shownEnemyPos(e);
      if (pass === 1 && aiming && e.path) Art.walkGhost(Core.enemyPos(world, e, state.turn + 1), [x, y]);
      const kd = knock[e.i] || [0, 0];
      const L = Math.hypot(lp.x - x, lp.y - y) || 1;
      Art.enemy(x, y, looks[e.i], {
        t: time, dead: t, kx: kd[0], ky: kd[1], lookX: (lp.x - x) / L, lookY: (lp.y - y) / L, scared: !!bullet && bullet.owner === 'player',
        type: e.type, shield: e.face != null && t < 0 ? shieldAt(e, x, y) : null, hp: state.bossHp[e.i], maxHp: e.hp, hurt: hurtT[e.i], cd: e.every && t < 0 ? Core.turnsUntilFire(world, state, e.i) : 0, moving: moveT < 1 && !!e.path,
      });
    }
    // 射手的警告線：下一發就會開槍的
    if (aiming) for (const e of world.enemies) {
      if (state.dead.has(e.i) || !e.every || Core.turnsUntilFire(world, state, e.i) !== 1) continue;
      // 敵人是在「下一回合」開槍：用下一回合的位置和牆來預測
      const ns = Core.cloneState(state); ns.turn++;
      const from = Core.enemyPos(world, e, ns.turn);
      const r = Core.aimPath(world, Core.enemyAim(world, ns, e.i), 1, 120, ns, from, e.i);
      drawPath(r.segs, '#ff3b3b', 4, [8, 7], 0.8);
    }
    if (aiming && hintAngle != null) drawPath(Core.aimPath(world, hintAngle, 2, 120, state).segs, '#ffc23d', 5, [3, 9], 0.9);
    if (aiming) drawAim();
    if (aiming || phase === 'shot') Art.protractor(lp.x, lp.y, shownAngle(), portrait ? Math.PI / 2 : 0);
    Art.hero(lp.x, lp.y, shownAngle(), { t: time, recoil: hero.recoil, mood: hero.mood, blink: (time % 4.2) < 0.13 });
    drawTrail();
    if (bullet) drawBullet(bullet.x, bullet.y, bullet.owner !== 'player');
    drawFx();
  }
  function drawPath(segs, color, w, dash, alpha) {
    ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash(dash); ctx.lineDashOffset = -(time * 40) % (dash[0] + dash[1]);
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w;
    for (const P of segs) { if (P.length < 2) continue; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.stroke(); }
    ctx.restore();
  }
  function drawAim() {
    const segs = Core.aimPath(world, angle, 1, 150, state).segs;
    ctx.save(); ctx.lineCap = 'round';
    const dash = 14, gap = 10, off = -(time * 60) % (dash + gap);
    let n = 0;
    segs.forEach((P, si) => {
      for (let i = 1; i < P.length; i++, n++) {
        const a = P[i - 1], b = P[i], last = si === segs.length - 1 && i === P.length - 1 && n > 0;
        ctx.globalAlpha = last ? 0.5 : 0.95;
        ctx.setLineDash([dash, gap]); ctx.lineDashOffset = off;
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = last ? 6 : 8;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        ctx.strokeStyle = '#ef4b3f'; ctx.lineWidth = last ? 3 : 4;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        if (!last && (i < P.length - 1 || si === segs.length - 1)) {
          ctx.setLineDash([]); ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b[0], b[1], 8, 0, 7); ctx.fill();
          ctx.fillStyle = '#ef4b3f'; ctx.beginPath(); ctx.arc(b[0], b[1], 5, 0, 7); ctx.fill();
        }
      }
    });
    ctx.restore();
  }
  function drawTrail() {
    if (trail.length < 2) return;
    const enemy = bullet && bullet.owner !== 'player';
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < trail.length; i++) {
      const k = i / trail.length;
      ctx.globalAlpha = k * 0.35; ctx.strokeStyle = enemy ? '#ffb0b0' : '#fff3b0'; ctx.lineWidth = 4 + k * 12;
      ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
      ctx.globalAlpha = k * 0.9; ctx.strokeStyle = enemy ? '#e8473c' : '#ffab3d'; ctx.lineWidth = 2 + k * 5;
      ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBullet(x, y, enemy) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, 16);
    g.addColorStop(0, enemy ? 'rgba(255,150,150,.9)' : 'rgba(255,240,170,.9)'); g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill();
    ctx.fillStyle = enemy ? '#ff6b5e' : '#fff6cf'; ctx.beginPath(); ctx.arc(x, y, C.BULLET_R + 1.5, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = enemy ? '#8f1f17' : '#d0841a'; ctx.stroke();
  }
  function drawFx() {
    for (const f of fx) {
      const k = f.life / f.max;
      if (f.t === 'p') { ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, 1.5 + 3 * k, 0, 7); ctx.fill(); }
      else if (f.t === 'shard') {
        ctx.globalAlpha = Math.min(1, k * 1.6); ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
        ctx.fillStyle = 'rgba(210,240,255,.9)'; ctx.strokeStyle = 'rgba(90,170,220,.9)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -f.sz); ctx.lineTo(f.sz * 0.7, f.sz * 0.5); ctx.lineTo(-f.sz * 0.6, f.sz * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      else if (f.t === 'smoke') { ctx.globalAlpha = k * 0.5; ctx.fillStyle = '#6b6478'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.6 - k * 0.6), 0, 7); ctx.fill(); }
      else if (f.t === 'boom') {
        const q = 1 - k;
        ctx.globalAlpha = k; const g = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, C.BLAST_R * (0.5 + q * 0.6));
        g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ffb347'); g.addColorStop(0.8, 'rgba(239,75,63,.7)'); g.addColorStop(1, 'rgba(239,75,63,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, C.BLAST_R * (0.5 + q * 0.6), 0, 7); ctx.fill();
        ctx.globalAlpha = k * 0.9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5 * k + 1; ctx.beginPath(); ctx.arc(f.x, f.y, C.BLAST_R * (0.3 + q * 0.8), 0, 7); ctx.stroke();
      } else if (f.t === 'ring') {
        ctx.globalAlpha = k; ctx.strokeStyle = f.color || '#fff'; ctx.lineWidth = 4 * k + 1; ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 20) + (1 - k) * 26, 0, 7); ctx.stroke();
      } else if (f.t === 'flash') {
        ctx.globalAlpha = k; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(f.x, f.y, 16 * (0.6 + k), 0, 7); ctx.fill();
        ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(f.x, f.y, 8 * k + 2, 0, 7); ctx.fill();
      } else if (f.t === 'word') { ctx.globalAlpha = 1; Art.comic(f.x, f.y, f.text, 1 - k, f.color); }
      ctx.globalAlpha = 1;
    }
  }

  // 選關畫面上方的小橫幅：阿彈對上三隻哥布林
  const bcv = $('banner'), bctx = bcv.getContext('2d');
  const bLooks = [0, 1, 2].map(i => Art.enemyLook(i, 42));
  function drawBanner() {
    const k = Math.min(2, window.devicePixelRatio || 1);
    if (bcv.width !== 420 * k) { bcv.width = 420 * k; bcv.height = 120 * k; }
    bctx.setTransform(k, 0, 0, k, 0, 0); bctx.clearRect(0, 0, 420, 120);
    Art.use(bctx, false);
    const aim = 8 + Math.sin(time * 1.3) * 10;
    bctx.save(); bctx.setLineDash([8, 7]); bctx.lineDashOffset = -time * 40; bctx.strokeStyle = 'rgba(239,75,63,.6)'; bctx.lineWidth = 3;
    bctx.beginPath(); bctx.moveTo(95, 78); bctx.lineTo(215, 14); bctx.lineTo(330, 70); bctx.stroke(); bctx.restore();
    bctx.fillStyle = '#ef4b3f'; bctx.beginPath(); bctx.arc(215, 14, 4, 0, 7); bctx.fill();
    Art.hero(70, 82, aim, { t: time, recoil: 0, mood: 'idle', blink: (time % 4.2) < 0.13 });
    [[300, 84], [345, 66], [385, 90]].forEach(([x, y], i) => Art.enemy(x, y, bLooks[i], { t: time + i, dead: -1, lookX: -1, lookY: 0 }));
  }

  // ── 主迴圈 ──
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    time += dt;
    if (playing()) update(dt);
    else for (let i = 0; i < enemyAnim.length; i++) if (enemyAnim[i] >= 0) enemyAnim[i] += dt;
    if (phase === 'menu') drawBanner(); else draw();
    requestAnimationFrame(frame);
  }
  layout();
  showMenu();
  // 網址帶 ?lv=3 直接進第 3 關（測試用）
  const q = new URLSearchParams(location.search).get('lv');
  if (q && LEVELS[+q - 1]) load(+q - 1);
  requestAnimationFrame(frame);

  // 給測試用
  window.__rico = {
    get angle() { return angle; }, setAngle: a => setAngle(a, true), fire, load, hint,
    get phase() { return phase; }, get mode() { return phase === 'result' ? 'result' : phase === 'menu' ? 'menu' : 'play'; },
    get dead() { return state && state.dead.size; }, get shotsLeft() { return shotsLeft; }, get hp() { return state && state.hp; }, get hintAngle() { return hintAngle; },
  };
})();
