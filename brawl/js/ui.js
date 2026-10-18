'use strict';
function bar(c, x, y, w, h, v, lag, col, back, cap) {
  c.fillStyle = back || 'rgba(0,0,0,.45)'; c.fillRect(x, y, w, h);
  if (cap) { c.fillStyle = '#7a2032'; c.fillRect(x, y, w * cap, h); }
  if (lag !== null && lag > v) { c.fillStyle = '#fff'; c.fillRect(x, y, w * lag, h); }
  c.fillStyle = col; c.fillRect(x, y, w * v, h);
  c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, y, w, h);
}
function drawPanel(c, f, x, y, big) {
  const w = big ? 290 : 190, h = big ? 62 : 40;
  c.fillStyle = 'rgba(28,26,46,.78)'; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 12) : c.rect(x, y, w, h); c.fill();
  c.save(); c.beginPath(); c.arc(x + h / 2, y + h / 2, h / 2 - 5, 0, TAU); c.fillStyle = f.dead ? '#555' : '#fff6e6'; c.fill(); c.clip(); drawPortrait(c, f.look, x + h / 2 + 2, y + h / 2 + 4, big ? 1.45 : 0.95); c.restore();
  const bx = x + h + 2, bw = w - h - 12;
  c.font = `${big ? 700 : 700} ${big ? 15 : 12}px "Noto Sans TC",sans-serif`; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = '#fff6e6';
  c.fillText(f.def.name + (f.ctl && f.ctl.human ? '' : big ? '' : ''), bx, y + (big ? 18 : 14));
  if (big) { c.textAlign = 'right'; c.font = '700 12px "Noto Sans TC",sans-serif'; c.fillStyle = '#a9a6c2'; c.fillText(Math.ceil(f.hp) + ' / ' + f.maxHp, x + w - 10, y + 18); c.textAlign = 'left'; }
  bar(c, bx, y + (big ? 24 : 19), bw, big ? 12 : 8, f.hp / f.maxHp, f.hpLag / f.maxHp, f.hp / f.maxHp < 0.3 ? '#ff7a3d' : '#ff4d3d', null, f.def.enemy ? 0 : f.cap / f.maxHp);
  bar(c, bx, y + (big ? 42 : 30), bw, big ? 9 : 5, f.mp / f.maxMp, null, W.flashMp > 0 && f === W.player && (W.flashMp >> 2) & 1 ? '#ffffff' : '#3fa9ff');
  if (big) { // skill cost ticks on the MP bar
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1;
    f.def.skills.forEach(id => { const tx = bx + bw * SKILLS[id].cost / f.maxMp; c.beginPath(); c.moveTo(tx, y + 42); c.lineTo(tx, y + 51); c.stroke(); });
  }
}
/* On-screen key guide for keyboard and gamepad players (touch players have buttons). H hides it. */
let showKeys = store.get('keys', true);
function chip(c, x, y, key, label, sub, on) {
  c.font = '700 13px "Noto Sans TC",sans-serif'; const kw = Math.max(22, c.measureText(key).width + 12);
  c.font = '700 14px "Noto Sans TC",sans-serif'; const lw = c.measureText(label).width;
  c.font = '700 11px "Noto Sans TC",sans-serif'; const sw = sub ? c.measureText(sub).width + 6 : 0;
  const w = kw + lw + sw + 18;
  c.globalAlpha = on ? 1 : 0.5;
  c.fillStyle = 'rgba(28,26,46,.78)'; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, 28, 9) : c.rect(x, y, w, 28); c.fill();
  c.fillStyle = on ? '#ffcc33' : '#a9a6c2'; c.beginPath(); c.roundRect ? c.roundRect(x + 4, y + 4, kw, 20, 6) : c.rect(x + 4, y + 4, kw, 20); c.fill();
  c.fillStyle = INK; c.font = '900 13px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(key, x + 4 + kw / 2, y + 15);
  c.textAlign = 'left'; c.fillStyle = '#fff6e6'; c.font = '700 14px "Noto Sans TC",sans-serif'; c.fillText(label, x + kw + 10, y + 15);
  if (sub) { c.fillStyle = on ? '#8fd0ff' : '#a9a6c2'; c.font = '700 11px "Noto Sans TC",sans-serif'; c.fillText(sub, x + kw + 14 + lw, y + 15.5); }
  c.globalAlpha = 1;
  return w;
}
function drawKeyHint(c) {
  const p = W.player, pad = lastDevice === 'pad';
  const keys = pad ? ['Y', 'RB', 'LB'] : ['U', 'I', 'O'], cmds = ['防・左右・攻', '防・上・攻', '防・下・攻'];
  let y = VHv - offY - 76, x = 12;
  p.def.skills.forEach((id, i) => {
    const S = SKILLS[id], ok = p.mp >= S.cost;
    x += chip(c, x, y, keys[i], S.name, '氣' + S.cost + (pad ? '' : '　' + cmds[i]), ok) + 8;
  });
  y += 34; x = 12;
  const basic = pad
    ? [['左搖桿', '移動'], ['推到底', '跑'], ['X', '攻擊'], ['A', '跳'], ['B', '防禦'], ['Start', '暫停']]
    : [['WASD', '移動'], ['連按兩下', '跑'], ['J', '攻擊'], ['K', '跳'], ['L', '防禦'], ['Esc', '暫停'], ['H', '隱藏提示']];
  for (const [k, l] of basic) x += chip(c, x, y, k, l, '', true) + 6;
}
function drawHUD(c) {
  const p = W.player, top = 8 + (portrait ? 0 : 0);
  drawPanel(c, p, 10, top, true);
  c.font = '700 13px "Noto Sans TC",sans-serif'; c.fillStyle = '#fff6e6'; c.textAlign = 'left'; c.lineWidth = 3; c.strokeStyle = INK;
  const sc = '分數 ' + W.score + (W.mode === 'stage' ? '　擊倒 ' + W.kos : '');
  c.strokeText(sc, 14, top + 86); c.fillText(sc, 14, top + 86);
  if (W.mode === 'battle') {
    let i = 0; for (const f of W.fighters) if (f !== p) { drawPanel(c, f, Wv - 200 - 104 * 0, top + 54 + i * 46, false); i++; }
  } else {
    const A = W.stage.areas, info = `${W.stage.name}・${W.stage.title}　${W.areaIdx + 1} / ${A.length}`;
    c.font = '700 14px "Noto Sans TC",sans-serif';
    if (Wv < 760) { c.textAlign = 'left'; c.strokeText(info, 14, top + 106); c.fillText(info, 14, top + 106); }
    else { c.textAlign = 'center'; c.strokeText(info, Wv / 2 + 40, top + 20); c.fillText(info, Wv / 2 + 40, top + 20); }
    if (W.boss && !W.boss.dead) {
      const bw = Math.min(420, Wv - 120), bx = (Wv - bw) / 2, by = top + 92;
      c.font = '900 15px "Noto Sans TC",sans-serif'; c.fillStyle = '#ffcc33'; c.textAlign = 'left'; c.strokeText(W.boss.def.name, bx, by - 4); c.fillText(W.boss.def.name, bx, by - 4);
      bar(c, bx, by, bw, 12, W.boss.hp / W.boss.maxHp, W.boss.hpLag / W.boss.maxHp, '#ff4d3d');
    }
    if (W.go && (W.t >> 4) & 1) {
      c.font = '64px Bangers, sans-serif'; c.textAlign = 'right'; c.lineWidth = 6; c.strokeText('GO →', Wv - 30, 250); c.fillStyle = '#ffcc33'; c.fillText('GO →', Wv - 30, 250);
    }
  }
  const tsec = (W.t / 60) | 0, ts = `${(tsec / 60) | 0}:${String(tsec % 60).padStart(2, '0')}`;
  c.textAlign = 'center'; c.font = '700 14px "Noto Sans TC",sans-serif'; c.fillStyle = '#fff6e6'; c.lineWidth = 3;
  if (W.mode === 'battle') { c.strokeText(ts, Wv / 2, top + 20); c.fillText(ts, Wv / 2, top + 20); }
  if (!isTouch && showKeys) drawKeyHint(c);
  if (W.msg) {
    const m = W.msg, a = Math.min(1, m.t / 10, (m.dur - m.t) / 15), s = 1 + Math.max(0, 1 - m.t / 10) * 0.4;
    c.save(); c.globalAlpha = Math.max(0, a); c.translate(Wv / 2, 200); c.scale(s, s); c.textAlign = 'center';
    c.font = '900 54px "Noto Sans TC",sans-serif'; c.lineWidth = 8; c.strokeStyle = INK; c.strokeText(m.txt, 0, 0); c.fillStyle = '#ffcc33'; c.fillText(m.txt, 0, 0);
    if (m.sub) { c.font = '700 20px "Noto Sans TC",sans-serif'; c.lineWidth = 5; c.strokeText(m.sub, 0, 40); c.fillStyle = '#fff6e6'; c.fillText(m.sub, 0, 40); }
    c.restore();
  }
}

function render() {
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1b1f3a'; c.fillRect(0, 0, cv.width, cv.height);
  if (!W) return;
  const k = dpr * scale;
  const sx = W.shake ? (Math.random() - 0.5) * W.shake : 0, sy = W.shake ? (Math.random() - 0.5) * W.shake * 0.6 : 0;
  c.setTransform(k, 0, 0, k, (-W.camX + sx) * k, (-viewTop + offY + sy) * k);
  if (W.theme === 'street') drawStreet(c); else drawRoof(c);
  // depth-sorted entities
  const list = [];
  for (const it of W.items) if (!it.holder) list.push([it.z, 0, it]);
  for (const f of W.fighters) list.push([f.z + (f.state === 'lying' || f.state === 'dead' ? -0.5 : 0), 1, f]);
  for (const p of W.projs) list.push([p.z + 0.1, 2, p]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, t, o] of list) t === 0 ? drawItem(c, o) : t === 1 ? drawFighter(c, o) : drawProj(c, o);
  // player marker and small enemy bars
  for (const f of W.fighters) {
    if (f.dead) continue; const s = f.def.size || 1, hy = FLOOR_TOP + f.z - f.y - 92 * s;
    if (f === W.player && W.fighters.length > 1) { c.fillStyle = '#ffcc33'; c.beginPath(); c.moveTo(f.x - 7, hy - 8); c.lineTo(f.x + 7, hy - 8); c.lineTo(f.x, hy); c.closePath(); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); }
    else if (f !== W.player && !f.def.boss && f.hp < f.maxHp && f.state !== 'lying') bar(c, f.x - 18, hy + 4, 36, 5, f.hp / f.maxHp, null, '#ff4d3d');
  }
  for (const p of W.parts) drawPart(c, p);
  c.fillStyle = '#1b1f3a'; c.fillRect(W.camX - 20, VH, Wv + 40, 4000);
  if (portrait) { c.fillStyle = 'rgba(255,246,230,.45)'; c.font = '700 13px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('把手機轉成橫的，畫面會更大', W.camX + Wv / 2, VH + 22); }
  // HUD in screen space
  c.setTransform(k, 0, 0, k, 0, offY * k);
  drawHUD(c);
}

/* ------------------------------ layout ------------------------------ */
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const iw = innerWidth, ih = innerHeight;
  portrait = ih > iw * 1.05; document.body.classList.toggle('portrait', portrait);
  if (portrait) { viewTop = 64; scale = iw / 480; offY = Math.min(40, Math.max(0, (ih / scale - (VH - viewTop)) * 0.1)); }
  else { viewTop = isTouch ? 70 : 0; scale = Math.min(ih / (VH - viewTop), iw / 640); offY = 0; }
  Wv = iw / scale; VHv = ih / scale;
  cv.width = Math.round(iw * dpr); cv.height = Math.round(ih * dpr);
  if (W && W.mode === 'battle') W.arena = Math.max(W.arena, Wv + 100);
}
addEventListener('resize', resize);

/* ------------------------------ menus ------------------------------ */
const $ = id => document.getElementById(id);
function buildMenu() {
  const box = $('heroes'); box.innerHTML = '';
  for (const id of HEROES) {
    const d = CHARS[id], b = document.createElement('button'); b.className = 'hero'; b.dataset.hero = id;
    b.innerHTML = `<canvas width="300" height="192"></canvas><b>${d.name} <span style="font-family:Bangers;font-weight:400;letter-spacing:.06em;opacity:.7">${d.en}</span></b><small>${d.blurb}</small>
      <span class="stat">力 ${'●'.repeat(d.stats[0])}${'○'.repeat(4 - d.stats[0])}　速 ${'●'.repeat(d.stats[1])}${'○'.repeat(4 - d.stats[1])}　耐 ${'●'.repeat(d.stats[2])}${'○'.repeat(4 - d.stats[2])}</span>`;
    b.onclick = () => { menuState.hero = id; store.set('hero', id); syncMenu(); };
    box.appendChild(b);
  }
  document.querySelectorAll('#modeRow .opt').forEach(b => b.onclick = () => { menuState.mode = b.dataset.mode; syncMenu(); });
  document.querySelectorAll('#foeRow .opt').forEach(b => b.onclick = () => { menuState.foes = +b.dataset.n; syncMenu(); });
  document.querySelectorAll('#diffRow .opt').forEach(b => b.onclick = () => { menuState.diff = +b.dataset.d; store.set('diff', menuState.diff); syncMenu(); });
  $('helpBtn').onclick = () => { $('help').hidden = !$('help').hidden; };
  $('startBtn').onclick = startGame;
  $('resumeBtn').onclick = () => togglePause(false);
  $('restartBtn').onclick = () => { $('pause').hidden = true; startGame(); };
  $('quitBtn').onclick = toMenu; $('menuBtn').onclick = toMenu; $('againBtn').onclick = () => { $('result').hidden = true; startGame(); };
  $('pauseBtn').onclick = () => togglePause(true);
  $('muteBtn').onclick = () => { Sound.init(); Sound.setMuted(!Sound.muted); $('muteBtn').style.opacity = Sound.muted ? 0.45 : 1; };
  $('muteBtn').style.opacity = Sound.muted ? 0.45 : 1;
  syncMenu(); animateCards();
}
function syncMenu() {
  document.querySelectorAll('#modeRow .opt').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === menuState.mode));
  document.querySelectorAll('#foeRow .opt').forEach(b => b.setAttribute('aria-pressed', +b.dataset.n === menuState.foes));
  document.querySelectorAll('#diffRow .opt').forEach(b => b.setAttribute('aria-pressed', +b.dataset.d === menuState.diff));
  document.querySelectorAll('.hero').forEach(b => b.setAttribute('aria-pressed', b.dataset.hero === menuState.hero));
  $('battleOpts').hidden = menuState.mode !== 'battle';
  const d = CHARS[menuState.hero], cmds = ['防 → 左右 → 攻', '防 → 上 → 攻', '防 → 下 → 攻'], keys = ['U', 'I', 'O'];
  $('skillInfo').innerHTML = `<b>${d.name}的必殺技</b>（用藍色的氣）<br>` + d.skills.map((id, i) => `<b>${SKILLS[id].name}</b>　氣 ${SKILLS[id].cost}　<kbd>${cmds[i]}</kbd> 或 <kbd>${keys[i]}</kbd>`).join('<br>');
}
function animateCards() {
  const t0 = performance.now();
  const loop = () => {
    if ($('menu').hidden) { requestAnimationFrame(loop); return; }
    document.querySelectorAll('.hero').forEach(b => {
      const cvs = b.querySelector('canvas'), c = cvs.getContext('2d'), id = b.dataset.hero, sel = id === menuState.hero;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cvs.width, cvs.height);
      const g = c.createLinearGradient(0, 0, 0, 192); g.addColorStop(0, sel ? 'rgba(255,204,51,.25)' : 'rgba(255,255,255,.04)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 300, 192);
      const fake = { clock: (performance.now() - t0) / 16.7, state: sel ? 'win' : 'idle', st: (performance.now() - t0) / 16.7, look: CHARS[id].look, def: CHARS[id], face: 1, hold: null, vy: 0 };
      c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(75, 88, 26, 6, 0, 0, TAU); c.fill();
      c.translate(75, 92); c.scale(CHARS[id].look.build === 'big' ? 0.98 : 1.05, CHARS[id].look.build === 'big' ? 0.98 : 1.05); drawBody(c, CHARS[id].look, pose(fake), fake);
    });
    requestAnimationFrame(loop);
  };
  loop();
}
function startGame() {
  Sound.init();
  $('menu').hidden = true; $('result').hidden = true; $('pause').hidden = true; $('hallLink').hidden = true; $('topBtns').hidden = false;
  $('touch').hidden = !isTouch; resize();
  newMatch(menuState); running = true; paused = false; acc = 0; last = performance.now();
  updateSkillButtons(true);
}
function toMenu() {
  running = false; paused = false; Sound.stopMusic(); Sound.startMusic('menu'); W = null;
  ['pause', 'result', 'touch', 'topBtns'].forEach(id => $(id).hidden = true); $('menu').hidden = false; $('hallLink').hidden = false;
}
function togglePause(v) {
  if (!running || (W && W.over && W.overT > 160)) return;
  paused = v === undefined ? !paused : v; $('pause').hidden = !paused;
  if (paused) setTimeout(() => $('resumeBtn').focus(), 0);
}
function showResult() {
  running = false; $('touch').hidden = true; $('topBtns').hidden = true;
  const tsec = (W.t / 60) | 0, ts = `${(tsec / 60) | 0}:${String(tsec % 60).padStart(2, '0')}`;
  let rows = [];
  if (W.mode === 'stage') {
    const bonus = W.win ? Math.round(W.player.hp * 2 + Math.max(0, 300 - tsec) * 5) : 0; W.score += bonus;
    const key = 'best.' + W.diffN; const best = store.get(key, null);
    let nb = false; if (W.win && (!best || tsec < best)) { store.set(key, tsec); nb = true; }
    rows = [['時間', ts + (nb ? ' 新紀錄！' : '')], ['擊倒', W.kos], ['過關獎勵', bonus], ['分數', W.score]];
    if (best && !nb) rows.splice(1, 0, ['最快紀錄', `${(best / 60) | 0}:${String(best % 60).padStart(2, '0')}`]);
    $('resTitle').textContent = W.win ? '過關！' : '倒下了…';
  } else {
    rows = [['時間', ts], ['擊倒', W.player.kos], ['造成傷害', Math.round(W.player.dmgDone)]];
    $('resTitle').textContent = W.win ? '勝利！' : '戰敗…';
  }
  $('resStats').innerHTML = rows.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('');
  $('result').hidden = false; setTimeout(() => $('againBtn').focus(), 0);
}
let skillSig = '';
function updateSkillButtons(force) {
  if (!W || !isTouch) return;
  const f = W.player, sig = f.def.skills.map(id => f.mp >= SKILLS[id].cost ? 1 : 0).join('') + f.id;
  if (sig === skillSig && !force) return; skillSig = sig;
  f.def.skills.forEach((id, i) => { const b = document.querySelector(`.tb[data-b="s${i + 1}"]`); b.innerHTML = `${SKILLS[id].name}<small>${SKILLS[id].cost}</small>`; b.classList.toggle('off', f.mp < SKILLS[id].cost); });
}

/* ------------------------------ main loop ------------------------------ */
let acc = 0, last = performance.now();
function frame(now) {
  const dt = Math.min(100, now - last); last = now;
  if (running && !paused && W) {
    acc += dt; let n = 0;
    while (acc >= 1000 / 60 && n < 5) { step(); acc -= 1000 / 60; n++; }
    if (n === 5) acc = 0;
    updateSkillButtons();
  } else if (W && !paused && W.over) { /* frozen on result */ }
  render();
  requestAnimationFrame(frame);
}
addEventListener('keydown', e => {
  if ((e.code === 'Escape' || e.code === 'KeyP') && running) { e.preventDefault(); togglePause(); }
  if (e.code === 'KeyH' && running) { showKeys = !showKeys; store.set('keys', showKeys); }
  if (e.code === 'KeyM') { Sound.init(); Sound.setMuted(!Sound.muted); $('muteBtn').style.opacity = Sound.muted ? 0.45 : 1; }
  if (e.code === 'Enter' && !$('menu').hidden && document.activeElement && !document.activeElement.classList.contains('opt') && !document.activeElement.classList.contains('hero')) { e.preventDefault(); startGame(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) togglePause(true); });
function detectTouch() {
  const set = () => { if (!isTouch) { isTouch = true; resize(); if (running) { $('touch').hidden = false; updateSkillButtons(true); } } };
  if (matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0 && matchMedia('(hover:none)').matches) set();
  addEventListener('touchstart', set, { passive: true });
}
/* gamepad hint so pad users know it was found */
addEventListener('gamepadconnected', e => { const h = $('gpHint'); h.textContent = '已連接手把：X 攻擊、A 跳、B 防禦、Y / RB / LB 必殺技'; h.hidden = false; h.style.opacity = 1; setTimeout(() => h.style.opacity = 0, 3500); setTimeout(() => h.hidden = true, 4000); });
/* menu navigation with a gamepad: A starts */
setInterval(() => {
  if (running || $('menu').hidden && $('result').hidden) return;
  const p = navigator.getGamepads && [...navigator.getGamepads()].find(Boolean); if (!p) return;
  if (p.buttons[0] && p.buttons[0].pressed || p.buttons[9] && p.buttons[9].pressed) { if (!window._gpLatch) { window._gpLatch = true; if (!$('result').hidden) { $('result').hidden = true; startGame(); } else startGame(); } }
  else window._gpLatch = false;
}, 100);

$('pauseHelp').innerHTML = $('help').innerHTML;
addEventListener('pointerdown', () => { if (!running && !Sound.music) { Sound.init(); Sound.startMusic('menu'); } }, { once: false });
addEventListener('keydown', () => { if (!running && !Sound.music) { Sound.init(); Sound.startMusic('menu'); } });
Keyboard.init(); Touch.init(); detectTouch(); resize(); buildMenu();
requestAnimationFrame(frame);
/* hook for automated tests */
window.__tf = { get W() { return W; }, startGame, menuState, step, CHARS, SKILLS, AICtl, setAuto(on) { if (W) { const c = new AICtl(); c.human = true; c.f = W.player; W.player.ctl = on ? c : (() => { const l = new LocalCtl(); l.human = true; return l; })(); } } };
