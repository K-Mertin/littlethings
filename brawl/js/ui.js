'use strict';
function bar(c, x, y, w, h, v, lag, col, back, cap) {
  c.fillStyle = back || 'rgba(0,0,0,.45)'; c.fillRect(x, y, w, h);
  if (cap) { c.fillStyle = '#7a2032'; c.fillRect(x, y, w * cap, h); }
  if (lag !== null && lag > v) { c.fillStyle = '#fff'; c.fillRect(x, y, w * lag, h); }
  c.fillStyle = col; c.fillRect(x, y, w * v, h);
  c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, y, w, h);
}
function drawPanel(c, f, x, y, size) {
  const big = size === 'big', mid = size === 'mid', w = big ? 290 : mid ? 232 : 190, h = big || mid ? 62 : 40;
  c.fillStyle = 'rgba(28,26,46,.78)'; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 12) : c.rect(x, y, w, h); c.fill();
  if (f.human) { c.strokeStyle = SLOT_COL[f.slot]; c.lineWidth = 2.5; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 12) : c.rect(x, y, w, h); c.stroke(); }
  c.save(); c.beginPath(); c.arc(x + h / 2, y + h / 2, h / 2 - 5, 0, TAU); c.fillStyle = isOut(f) ? '#555' : '#fff6e6'; c.fill(); c.clip(); drawPortrait(c, f.look, x + h / 2 + 2, y + h / 2 + 4, h > 50 ? 1.45 : 0.95); c.restore();
  const bx = x + h + 2, bw = w - h - 12, large = h > 50;
  c.font = `700 ${large ? 15 : 12}px "Noto Sans TC",sans-serif`; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = '#fff6e6';
  let nx = bx;
  if (f.human) { const tag = (f.slot + 1) + 'P'; c.font = `900 ${large ? 13 : 11}px "Noto Sans TC",sans-serif`; const tw = c.measureText(tag).width + 10; c.fillStyle = SLOT_COL[f.slot]; c.beginPath(); c.roundRect ? c.roundRect(bx, y + (large ? 5 : 3), tw, large ? 16 : 13, 6) : c.rect(bx, y + 5, tw, 16); c.fill(); c.fillStyle = INK; c.fillText(tag, bx + 5, y + (large ? 18 : 14)); nx += tw + 5; c.font = `700 ${large ? 15 : 12}px "Noto Sans TC",sans-serif`; c.fillStyle = '#fff6e6'; }
  else if (f.ally) { c.fillStyle = '#38d39f'; c.fillText('隊友', nx, y + (large ? 18 : 14)); nx += 30; c.fillStyle = '#fff6e6'; }
  c.fillText(f.def.name, nx, y + (large ? 18 : 14));
  // lives (hearts) on the right of the name line
  if ((W.mode === 'battle' && (f.lives > 1 || W.livesRule > 1)) || (W.mode === 'stage' && f.human)) {
    const n = Math.max(0, f.lives || 0); c.textAlign = 'right'; c.fillStyle = '#ff5a7a'; c.font = `700 ${large ? 13 : 11}px "Noto Sans TC",sans-serif`;
    c.fillText(n > 4 ? '♥×' + n : '♥'.repeat(n), x + w - 10, y + (large ? 18 : 14)); c.textAlign = 'left';
  } else if (big) { c.textAlign = 'right'; c.font = '700 12px "Noto Sans TC",sans-serif'; c.fillStyle = '#a9a6c2'; c.fillText(Math.ceil(f.hp) + ' / ' + f.maxHp, x + w - 10, y + 18); c.textAlign = 'left'; }
  bar(c, bx, y + (large ? 24 : 19), bw, large ? 12 : 8, f.hp / f.maxHp, f.hpLag / f.maxHp, f.hp / f.maxHp < 0.3 ? '#ff7a3d' : '#ff4d3d', null, f.def.enemy ? 0 : f.cap / f.maxHp);
  bar(c, bx, y + (large ? 42 : 30), bw, large ? 9 : 5, f.mp / f.maxMp, null, f.flashMp > 0 && (f.flashMp >> 2) & 1 ? '#ffffff' : '#3fa9ff');
  if (large) { // skill cost ticks on the MP bar
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1;
    f.def.skills.forEach(id => { if (!id) return; const tx = bx + bw * SKILLS[id].cost / f.maxMp; c.beginPath(); c.moveTo(tx, y + 42); c.lineTo(tx, y + 51); c.stroke(); });
  }
  if (f.dead && f.respawnT > 0) { c.fillStyle = 'rgba(28,26,46,.7)'; c.fillRect(x, y, w, h); c.fillStyle = '#fff6e6'; c.textAlign = 'center'; c.font = `900 ${large ? 16 : 12}px "Noto Sans TC",sans-serif`; c.fillText('復活中…', x + w / 2, y + h / 2 + 5); c.textAlign = 'left'; }
  else if (isOut(f)) { c.fillStyle = 'rgba(28,26,46,.6)'; c.fillRect(x, y, w, h); c.fillStyle = '#a9a6c2'; c.textAlign = 'center'; c.font = `900 ${large ? 16 : 12}px "Noto Sans TC",sans-serif`; c.fillText('出局', x + w / 2, y + h / 2 + 5); c.textAlign = 'left'; }
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
  if (W.players.length > 1) { // two players on one keyboard: one compact line each
    let y = VHv - offY - 70;
    const rows = [
      ['1P', [['WASD', '移動'], ['J', '攻'], ['K', '跳'], ['L', '防'], ['U I O', '必殺']]],
      ['2P', [['方向鍵', '移動'], ['. 或 1', '攻'], ['/ 或 2', '跳'], [', 或 3', '防'], ['4 5 6', '必殺']]]
    ];
    rows.forEach(([tag, list], r) => {
      let x = 12; c.fillStyle = SLOT_COL[r]; c.font = '900 14px "Noto Sans TC",sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.lineWidth = 3; c.strokeStyle = INK; c.strokeText(tag, x, y + 15); c.fillText(tag, x, y + 15); x += 26;
      for (const [k, l] of list) x += chip(c, x, y, k, l, '', true) + 5;
      y += 32;
    });
    return;
  }
  const p = W.player, pad = lastDevice === 'pad';
  const keys = pad ? ['Y', 'RB', 'LB'] : ['U', 'I', 'O'], cmds = ['防・左右・攻', '防・上・攻', '防・下・攻'];
  let y = VHv - offY - 76, x = 12;
  p.def.skills.forEach((id, i) => {
    if (!id) return; const S = SKILLS[id], ok = p.mp >= S.cost;
    x += chip(c, x, y, keys[i], S.name, '氣' + S.cost + (pad ? '' : '　' + cmds[i]), ok) + 8;
  });
  y += 34; x = 12;
  const basic = pad
    ? [['左搖桿', '移動'], ['推到底', '跑'], ['X', '攻擊'], ['A', '跳'], ['B', '防禦'], ['Start', '暫停']]
    : [['WASD', '移動'], ['連按兩下', '跑'], ['J', '攻擊'], ['K', '跳'], ['L', '防禦'], ['Esc', '暫停'], ['H', '隱藏提示']];
  for (const [k, l] of basic) x += chip(c, x, y, k, l, '', true) + 6;
}
function drawHUD(c) {
  const top = 8, two = W.players.length > 1, size = two ? 'mid' : 'big', pw = two ? 232 : 290;
  const btnW = 104 / scale;                       // room for the pause / sound buttons in the top-right corner
  drawPanel(c, W.players[0], 10, top, size);
  if (two) drawPanel(c, W.players[1], Wv - pw - 10 - btnW, top, size);
  for (let i = 2; i < W.players.length; i++) drawPanel(c, W.players[i], i === 2 ? 10 : Wv - 200 - btnW, top + 70, 'small');
  c.font = '700 13px "Noto Sans TC",sans-serif'; c.fillStyle = '#fff6e6'; c.textAlign = 'left'; c.lineWidth = 3; c.strokeStyle = INK; c.textBaseline = 'alphabetic';
  const sc = W.mode === 'stage' ? '分數 ' + W.score + '　擊倒 ' + W.kos : '';
  if (sc) { c.strokeText(sc, 14, top + 86); c.fillText(sc, 14, top + 86); }
  if (W.mode === 'battle') {
    let i = 0; const y0 = top + (two ? 74 : 54);
    for (const f of W.fighters) if (!f.human) { drawPanel(c, f, Wv - 200 - (two ? btnW : 0), y0 + i * 46, 'small'); i++; }
  } else {
    const A = W.stage.areas, info = `${W.stage.name}・${W.stage.title}　${W.areaIdx + 1} / ${A.length}`;
    c.font = '700 14px "Noto Sans TC",sans-serif';
    if (Wv < 760 || two) { c.textAlign = 'left'; c.strokeText(info, 14, top + 106); c.fillText(info, 14, top + 106); }
    else { c.textAlign = 'center'; c.strokeText(info, Wv / 2 + 40, top + 20); c.fillText(info, Wv / 2 + 40, top + 20); }
    if (W.boss && !W.boss.dead) {
      const bw = Math.min(420, Wv - 120), bx = (Wv - bw) / 2, by = top + 120;
      c.font = '900 15px "Noto Sans TC",sans-serif'; c.fillStyle = '#ffcc33'; c.textAlign = 'left'; c.strokeText(W.boss.def.name, bx, by - 4); c.fillText(W.boss.def.name, bx, by - 4);
      bar(c, bx, by, bw, 12, W.boss.hp / W.boss.maxHp, W.boss.hpLag / W.boss.maxHp, '#ff4d3d');
    }
    if (W.go && (W.t >> 4) & 1) {
      c.font = '64px Bangers, sans-serif'; c.textAlign = 'right'; c.lineWidth = 6; c.strokeText('GO →', Wv - 30, 250); c.fillStyle = '#ffcc33'; c.fillText('GO →', Wv - 30, 250);
    }
  }
  if (W.mode === 'battle') {
    const sec = W.timeLeft > 0 ? Math.ceil(W.timeLeft / 60) : (W.t / 60) | 0, ts = `${(sec / 60) | 0}:${String(sec % 60).padStart(2, '0')}`;
    c.textAlign = 'center'; c.font = W.timeLeft > 0 ? '900 22px "Noto Sans TC",sans-serif' : '700 14px "Noto Sans TC",sans-serif';
    c.fillStyle = W.timeLeft > 0 && W.timeLeft < 600 && (W.t >> 4) & 1 ? '#ff5a4a' : '#fff6e6'; c.lineWidth = 4;
    const tx = two ? Wv / 2 - btnW / 2 : Wv / 2; c.strokeText(ts, tx, top + 24); c.fillText(ts, tx, top + 24);
  }
  if (!isTouch && showKeys) drawKeyHint(c);
  if (W.msg) {
    const m = W.msg, a = Math.min(1, m.t / 10, (m.dur - m.t) / 15), s = 1 + Math.max(0, 1 - m.t / 10) * 0.4;
    c.save(); c.globalAlpha = Math.max(0, a); c.translate(Wv / 2, 200); c.scale(s, s); c.textAlign = 'center';
    c.font = '900 54px "Noto Sans TC",sans-serif'; c.lineWidth = 8; c.strokeStyle = INK; c.strokeText(m.txt, 0, 0); c.fillStyle = '#ffcc33'; c.fillText(m.txt, 0, 0);
    if (m.sub) { c.font = '700 20px "Noto Sans TC",sans-serif'; c.lineWidth = 5; c.strokeText(m.sub, 0, 40); c.fillStyle = '#fff6e6'; c.fillText(m.sub, 0, 40); }
    c.restore();
  }
}

function drawHazard(c, h) {
  const gy = FLOOR_TOP + h.z;
  c.fillStyle = 'rgba(20,16,40,.28)'; c.beginPath(); c.ellipse(h.x, gy, 34, 7, 0, 0, TAU); c.fill();
  c.save(); c.translate(h.x, gy); c.scale(1.5, 1.5);
  drawScooter(c, 0, 0, h.col, sgn(h.vx));
  // rider: a little helmeted grown-up
  c.scale(sgn(h.vx), 1);
  blob(c, -4, -40, 9, 9, '#f2c49c'); c.beginPath(); c.arc(-4, -42, 10, Math.PI, 0); c.fillStyle = '#ff5a4a'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  blob(c, -6, -26, 8, 9, '#3a8f5c'); blob(c, 10, -32, 3.5, 3.5, '#f2c49c');
  for (let k = 0; k < 2; k++) { c.fillStyle = 'rgba(230,225,245,.6)'; c.beginPath(); c.arc(-30 - k * 10 - (W.t % 6), -6, 4 + k * 2, 0, TAU); c.fill(); }
  c.restore();
}
function drawWarning(c, H) {
  const x = H.dir > 0 ? W.camX + 40 : W.camX + Wv - 40, y = FLOOR_TOP + H.z - 30;
  c.beginPath(); c.moveTo(x, y - 26); c.lineTo(x + 24, y + 16); c.lineTo(x - 24, y + 16); c.closePath(); c.fillStyle = '#ffcc33'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  c.fillStyle = INK; c.font = '900 24px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', x, y + 2);
  c.font = '900 14px "Noto Sans TC",sans-serif'; c.lineWidth = 4; c.strokeStyle = INK; c.fillStyle = '#fff6e6'; c.strokeText('機車來了', x + (H.dir > 0 ? 40 : -40), y - 24); c.fillText('機車來了', x + (H.dir > 0 ? 40 : -40), y - 24);
}
function render() {
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1b1f3a'; c.fillRect(0, 0, cv.width, cv.height);
  if (!W) return;
  const k = dpr * scale;
  const sx = W.shake ? (Math.random() - 0.5) * W.shake : 0, sy = W.shake ? (Math.random() - 0.5) * W.shake * 0.6 : 0;
  c.setTransform(k, 0, 0, k, (-W.camX + sx) * k, (-viewTop + offY + sy) * k);
  (THEMES[W.theme] || drawRoof)(c);
  // depth-sorted entities
  const list = [];
  for (const it of W.items) if (!it.holder) list.push([it.z, 0, it]);
  for (const f of W.fighters) list.push([f.z + (f.state === 'lying' || f.state === 'dead' ? -0.5 : 0), 1, f]);
  for (const p of W.projs) list.push([p.z + 0.1, 2, p]);
  for (const h of W.hazEnts) list.push([h.z, 3, h]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, t, o] of list) t === 0 ? drawItem(c, o) : t === 1 ? drawFighter(c, o) : t === 2 ? drawProj(c, o) : drawHazard(c, o);
  if (W.hz && W.hz.warn > 0 && (W.t >> 3) & 1) drawWarning(c, W.hz);
  // player marker and small enemy bars
  for (const f of W.fighters) {
    if (f.dead) continue; const s = f.def.size || 1, hy = FLOOR_TOP + f.z - f.y - 92 * s;
    if (f.human && W.fighters.length > 1) {
      c.fillStyle = SLOT_COL[f.slot]; c.beginPath(); c.moveTo(f.x - 7, hy - 8); c.lineTo(f.x + 7, hy - 8); c.lineTo(f.x, hy); c.closePath(); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      if (W.players.length > 1) { c.font = '900 12px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineWidth = 3; c.strokeText((f.slot + 1) + 'P', f.x, hy - 11); c.fillText((f.slot + 1) + 'P', f.x, hy - 11); }
    }
    else if (f.ally) { c.fillStyle = '#38d39f'; c.beginPath(); c.arc(f.x, hy - 4, 4, 0, TAU); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); if (f.hp < f.maxHp) bar(c, f.x - 18, hy + 4, 36, 5, f.hp / f.maxHp, null, '#38d39f'); }
    else if (!f.def.boss && f.hp < f.maxHp && f.state !== 'lying') bar(c, f.x - 18, hy + 4, 36, 5, f.hp / f.maxHp, null, '#ff4d3d');
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
  if (running && W) $('twoRotate').hidden = !(isTouch && portrait && W.players.length > 1);
}
addEventListener('resize', resize);

/* ------------------------------ menus ------------------------------ */
const $ = id => document.getElementById(id);
function buildMenu() {
  const box = $('heroes'); box.innerHTML = '';
  for (const id of HEROES) {
    const d = CHARS[id], b = document.createElement('button'); b.className = 'hero'; b.dataset.hero = id;
    b.innerHTML = `<canvas width="300" height="192"></canvas><span class="badges"></span><b>${d.name} <span style="font-family:Bangers;font-weight:400;letter-spacing:.06em;opacity:.7">${d.en}</span></b><small>${d.blurb}</small>
      <span class="stat">力 ${'●'.repeat(d.stats[0])}${'○'.repeat(4 - d.stats[0])}　速 ${'●'.repeat(d.stats[1])}${'○'.repeat(4 - d.stats[1])}　耐 ${'●'.repeat(d.stats[2])}${'○'.repeat(4 - d.stats[2])}</span><span class="lock" hidden></span>`;
    b.onclick = () => {
      if (!heroUnlocked(id)) return;
      const n = menuState.players === 2 ? 2 : 1;
      menuState.heroes[menuState.slotSel] = id; store.set('heroes', menuState.heroes);
      if (n === 2) menuState.slotSel = (menuState.slotSel + 1) % 2;
      syncMenu();
    };
    box.appendChild(b);
  }
  const bind = (row, key, conv, after) => document.querySelectorAll(`#${row} .opt`).forEach(b => b.onclick = () => { if (b.disabled) return; menuState[key] = conv(b); if (after) after(); syncMenu(); });
  bind('modeRow', 'mode', b => b.dataset.mode);
  bind('playersRow', 'players', b => b.dataset.p === 'phone' ? 'phone' : +b.dataset.p, () => { menuState.slotSel = 0; });
  bind('foeRow', 'foes', b => +b.dataset.n);
  bind('diffRow', 'diff', b => +b.dataset.d, () => store.set('diff', menuState.diff));
  bind('teamRow', 'team', b => b.dataset.t);
  bind('livesRow', 'lives', b => +b.dataset.l);
  bind('timeRow', 'time', b => +b.dataset.s);
  const ar = $('arenaRow'); ar.innerHTML = Object.entries(ARENAS).map(([k, a]) => `<button class="opt" data-a="${k}">${a.name}</button>`).join('') + '<button class="opt" data-a="random">隨機</button>';
  bind('arenaRow', 'arena', b => b.dataset.a, () => store.set('arena', menuState.arena));
  buildStageRow();
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
function buildStageRow() {
  const r = $('stageRow'); if (!r) return;
  r.innerHTML = STAGES.map((st, i) => `<button class="opt" data-st="${i}">${st.name}・${st.title}</button>`).join('');
  r.querySelectorAll('.opt').forEach(b => b.onclick = () => { if (b.disabled) return; menuState.stage = +b.dataset.st; syncMenu(); });
}
function syncMenu() {
  const M = menuState, two = M.players === 2;
  if (!heroUnlocked(M.heroes[0])) M.heroes[0] = 'rex';
  if (!heroUnlocked(M.heroes[1])) M.heroes[1] = 'yuki';
  const press = (row, test) => document.querySelectorAll(`#${row} .opt`).forEach(b => b.setAttribute('aria-pressed', !!test(b)));
  press('modeRow', b => b.dataset.mode === M.mode);
  press('playersRow', b => (b.dataset.p === 'phone' ? 'phone' : +b.dataset.p) === M.players);
  press('foeRow', b => +b.dataset.n === M.foes);
  press('diffRow', b => +b.dataset.d === M.diff);
  press('teamRow', b => b.dataset.t === M.team);
  press('livesRow', b => +b.dataset.l === M.lives);
  press('timeRow', b => +b.dataset.s === M.time);
  press('arenaRow', b => b.dataset.a === M.arena);
  press('stageRow', b => +b.dataset.st === M.stage);
  document.querySelectorAll('#stageRow .opt').forEach(b => { b.disabled = !stageUnlocked(+b.dataset.st); if (b.disabled) b.title = '先打通前一關'; });
  if (!stageUnlocked(M.stage)) M.stage = 0;
  // 0 computer fighters only makes sense when two people fight each other
  const zero = document.querySelector('#foeRow .opt[data-n="0"]'); zero.disabled = !(two && M.team === 'ffa'); if (zero.disabled && M.foes === 0) { M.foes = 1; return syncMenu(); }
  // heroes
  document.querySelectorAll('.hero').forEach(b => {
    const id = b.dataset.hero, locked = !heroUnlocked(id);
    b.setAttribute('aria-pressed', !two && M.heroes[0] === id);
    b.classList.toggle('locked', locked);
    const lk = b.querySelector('.lock'); lk.hidden = !locked; if (locked) lk.textContent = '🔒 ' + (CHARS[id].unlock || '');
    const bad = b.querySelector('.badges'); bad.innerHTML = two ? [0, 1].filter(i => M.heroes[i] === id).map(i => `<i style="background:${SLOT_COL[i]}">${i + 1}P</i>`).join('') : '';
    b.style.borderColor = two ? ([0, 1].find(i => M.heroes[i] === id) !== undefined ? SLOT_COL[[0, 1].find(i => M.heroes[i] === id)] : '') : '';
  });
  const sr = $('slotRow'); sr.hidden = !two;
  if (two) {
    sr.innerHTML = [0, 1].map(i => `<button class="opt" data-slot="${i}" aria-pressed="${M.slotSel === i}"><i style="background:${SLOT_COL[i]}">${i + 1}P</i>${CHARS[M.heroes[i]].name}</button>`).join('') + '<span class="note" style="margin:auto 4px">先點 1P 或 2P，再點角色</span>';
    sr.querySelectorAll('.opt').forEach(b => b.onclick = () => { M.slotSel = +b.dataset.slot; syncMenu(); });
  }
  $('battleOpts').hidden = M.mode !== 'battle';
  $('stageOpts').hidden = M.mode !== 'stage' || STAGES.length < 2;
  $('playersNote').hidden = !two;
  $('playersNote').textContent = two ? (isTouch ? '平板橫放：1P 用左半邊，2P 用右半邊。' : '鍵盤：1P 用 WASD＋J K L（U I O 必殺），2P 用方向鍵＋數字鍵 1 2 3（4 5 6 必殺），沒有數字鍵可用 . / ,。插兩支手把也可以。') : '';
  const sel = M.heroes[two ? M.slotSel : 0], d = CHARS[sel], cmds = ['防 → 左右 → 攻', '防 → 上 → 攻', '防 → 下 → 攻'], keys = two ? (M.slotSel ? ['4', '5', '6'] : ['U', 'I', 'O']) : ['U', 'I', 'O'];
  $('skillInfo').innerHTML = `<b>${two ? (M.slotSel + 1) + 'P・' : ''}${d.name}的必殺技</b>（用藍色的氣）<br>` + d.skills.map((id, i) => id ? `<b>${SKILLS[id].name}</b>　氣 ${SKILLS[id].cost}　<kbd>${cmds[i]}</kbd> 或 <kbd>${keys[i]}</kbd>` : '').filter(Boolean).join('<br>');
}
function stageUnlocked(i) { return i === 0 || (store.get('cleared', [])).includes(i - 1); }
function animateCards() {
  const t0 = performance.now();
  const loop = () => {
    if ($('menu').hidden) { requestAnimationFrame(loop); return; }
    document.querySelectorAll('.hero').forEach(b => {
      const cvs = b.querySelector('canvas'), c = cvs.getContext('2d'), id = b.dataset.hero, sel = menuState.heroes.slice(0, menuState.players === 2 ? 2 : 1).includes(id);
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
  const M = menuState;
  if (M.players === 'phone') return openLobby();
  $('menu').hidden = true; $('result').hidden = true; $('pause').hidden = true; $('hallLink').hidden = true; $('topBtns').hidden = false;
  resize();
  newMatch({ mode: M.mode, players: M.players, heroes: M.heroes, foes: M.foes, diff: M.diff, team: M.team, lives: M.lives, time: M.time, arena: M.arena, stage: M.stage });
  $('touch').hidden = !isTouch;
  $('twoRotate').hidden = !(isTouch && portrait && W.players.length > 1);
  running = true; paused = false; acc = 0; last = performance.now();
  updateSkillButtons(true);
  if (W.mode === 'stage') showStory(STORY['intro' + W.stageN]);
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
  running = false; $('touch').hidden = true; $('topBtns').hidden = true; $('twoRotate').hidden = true;
  const tsec = (W.t / 60) | 0, ts = `${(tsec / 60) | 0}:${String(tsec % 60).padStart(2, '0')}`, two = W.players.length > 1;
  let rows = [];
  if (W.mode === 'stage') {
    const bonus = W.win ? Math.round(W.players.reduce((s, p) => s + Math.max(0, p.hp), 0) * 2 / W.players.length + Math.max(0, 300 - tsec) * 5) : 0; W.score += bonus;
    const key = `best.${W.stageN}.${W.diffN}`; const best = store.get(key, null);
    let nb = false; if (W.win && (!best || tsec < best)) { store.set(key, tsec); nb = true; }
    if (W.win) { const c = store.get('cleared', []); if (!c.includes(W.stageN)) { c.push(W.stageN); store.set('cleared', c); } }
    rows = [['時間', ts + (nb ? ' 新紀錄！' : '')], ['擊倒', W.kos], ['過關獎勵', bonus], ['分數', W.score]];
    if (best && !nb) rows.splice(1, 0, ['最快紀錄', `${(best / 60) | 0}:${String(best % 60).padStart(2, '0')}`]);
    if (two) W.players.forEach(p => rows.push([`${p.slot + 1}P ${p.def.name}`, `擊倒 ${p.kos}`]));
  } else {
    rows = [['時間', ts]];
    for (const p of W.players) rows.push([two ? `${p.slot + 1}P ${p.def.name}` : '擊倒', two ? `擊倒 ${p.kos}・傷害 ${Math.round(p.dmgDone)}` : p.kos]);
    if (!two) rows.push(['造成傷害', Math.round(W.player.dmgDone)]);
  }
  const hasNext = W.mode === 'stage' && W.win && W.stageN < STAGES.length - 1;
  $('nextBtn').hidden = !hasNext;
  $('nextBtn').onclick = () => { $('result').hidden = true; menuState.stage = W.stageN + 1; startGame(); };
  if (W.mode === 'stage' && W.win && W.stageN === STAGES.length - 1) { W.label = '全部過關！'; rows.push(['', '怪獸們都變成好朋友了！']); }
  $('resTitle').textContent = W.label || (W.win ? '勝利！' : '戰敗…');
  $('resStats').innerHTML = rows.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('');
  if (W.onResult) W.onResult(rows);
  $('result').hidden = false; setTimeout(() => (hasNext ? $('nextBtn') : $('againBtn')).focus(), 0);
}
let skillSig = '';
function updateSkillButtons(force) {
  if (!W || !isTouch) return;
  const sig = W.players.map(f => f.id + f.def.skills.map(id => id && f.mp >= SKILLS[id].cost ? 1 : 0).join('')).join('|');
  if (sig === skillSig && !force) return; skillSig = sig;
  Touch.pads.forEach((pad, i) => { if (W.players[i]) pad.setSkills(W.players[i]); });
}

/* ------------------------------ story scenes ------------------------------ */
let storyQ = null;
const BUDDY = { rex: 'yuki', yuki: 'rex', gan: 'kite', kite: 'gan' };
function speaker(who) {
  if (who === 'hero') return W.players[0].id;
  if (who === 'buddy') return W.players[1] ? W.players[1].id : (BUDDY[W.players[0].id] || 'yuki');
  return who;
}
function showStory(lines, done) {
  if (!lines || !lines.length) { done && done(); return; }
  storyQ = { lines, i: 0, done }; $('story').hidden = false; drawStoryLine();
}
function drawStoryLine() {
  const [who, text] = storyQ.lines[storyQ.i], id = speaker(who), d = CHARS[id];
  $('storyName').textContent = d.name; $('storyText').textContent = text;
  const cvs = $('storyFace'), c = cvs.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 180, 180);
  const custom = d.draw || (d.fly ? 'bat' : null);
  const fake = { def: d, look: d.look, clock: 10, state: 'idle', st: 0, face: 1, hold: null, vy: 0, inkT: 0, atk: null };
  if (custom) { c.translate(90, 150); const k = 2.6 / Math.max(1, (d.size || 1) * 0.6); c.scale(k, k); if (d.fly) c.translate(0, -10); DRAWERS[custom](c, fake); }
  else drawPortrait(c, d.look, 90, 98, 4.6);
}
function advanceStory() {
  if (!storyQ) return; storyQ.i++;
  if (storyQ.i >= storyQ.lines.length) { const d = storyQ.done; storyQ = null; $('story').hidden = true; acc = 0; last = performance.now(); d && d(); }
  else drawStoryLine();
}
$('story').addEventListener('pointerdown', e => { if (e.target.id === 'storySkip') return; e.preventDefault(); advanceStory(); });
$('storySkip').addEventListener('click', () => { if (!storyQ) return; storyQ.i = storyQ.lines.length - 1; advanceStory(); });
addEventListener('keydown', e => { if (storyQ && ['Space', 'Enter', 'KeyJ', 'KeyK', 'Numpad1', 'Period', 'Escape'].includes(e.code)) { e.preventDefault(); if (e.code === 'Escape') { storyQ.i = storyQ.lines.length - 1; } advanceStory(); } }, true);

/* ------------------------------ main loop ------------------------------ */
let acc = 0, last = performance.now();
function frame(now) {
  const dt = Math.min(100, now - last); last = now;
  if (running && !paused && W && !storyQ) {
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
  const set = () => { if (!isTouch) { isTouch = true; resize(); if ($('heroes').children.length) syncMenu(); if (running) { $('touch').hidden = false; updateSkillButtons(true); } } };
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
Keyboard.init(); detectTouch(); resize(); buildMenu();
requestAnimationFrame(frame);
/* hook for automated tests */
window.__tf = { get W() { return W; }, startGame, menuState, step, CHARS, SKILLS, AICtl, setAuto(on, all) { if (!W) return; (all ? W.players : [W.player]).forEach(p => { if (on) { const c = new AICtl(); c.human = true; c.f = p; p.ctl = c; } else p.ctl = new HumanCtl(p.slot, localSources(p.slot, W.players.length)); }); } };

function openLobby() { menuState.players = 1; syncMenu(); startGame(); }
