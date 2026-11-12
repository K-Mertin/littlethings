// 反彈神射手：畫面、操作、存檔
(function () {
  'use strict';
  const Core = window.RicoCore, LEVELS = window.RICO_LEVELS, C = Core.C;
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  if (isTouch) document.documentElement.classList.add('touch');

  // ── 存檔：ricochet:v1 = { best: { "<關卡序號 0 起>": 星數 } } ──
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
    bounce(kind) { kind === 'mirror' ? tone(1400, 0.12, 'sine', 0.12, 1900) : tone(880, 0.07, 'triangle', 0.12, 660); },
    soft() { tone(200, 0.15, 'sine', 0.15, 90); },
    hit() { tone(300, 0.18, 'square', 0.1, 80); noise(0.1, 0.2, 1200); },
    boom() { noise(0.6, 0.6, 700); tone(120, 0.5, 'sawtooth', 0.12, 40); },
    tick() { tone(1200, 0.025, 'square', 0.03); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.12), i * 110)); },
    lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.1), i * 150)); },
  };

  // ── 遊戲狀態 ──
  let lvIdx = 0, world = null, def = null;
  let angle = 30;                // 世界角度（0° 朝右、逆時針為正）
  let state = null;              // { dead:Set, boom:Set }
  let shotsLeft = 0, shotsUsed = 0;
  let bullet = null, trail = [];
  let fx = [];                   // 特效
  let shake = 0, over = false, mode = 'menu';
  let enemyAnim = [];            // 每個敵人的倒下動畫時間
  let time = 0;

  // ── 畫面配置：場地 800×560 等比縮放；直式螢幕把場地轉 90°，讓它變高 ──
  let dpr = 1, vw = 0, vh = 0, s = 1, ox = 0, oy = 0, portrait = false;
  const TOP = 64, BOTTOM = isTouch ? 92 : 112;   // 桌機下面多留一行操作說明
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    vw = innerWidth; vh = innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    const aw = vw - 16, ah = vh - TOP - BOTTOM;
    portrait = ah > aw * 1.1;
    const ww = portrait ? C.H : C.W, wh = portrait ? C.W : C.H;
    s = Math.min(aw / ww, ah / wh);
    ox = (vw - ww * s) / 2; oy = TOP + (ah - wh * s) / 2;
  }
  function setWorldTransform(extraX, extraY) {
    const ex = extraX || 0, ey = extraY || 0;
    if (portrait) ctx.setTransform(0, -s * dpr, s * dpr, 0, (ox + ex) * dpr, (oy + C.W * s + ey) * dpr);
    else ctx.setTransform(s * dpr, 0, 0, s * dpr, (ox + ex) * dpr, (oy + ey) * dpr);
  }
  function toWorld(sx, sy) {
    return portrait ? { x: C.W - (sy - oy) / s, y: (sx - ox) / s } : { x: (sx - ox) / s, y: (sy - oy) / s };
  }
  // 畫面上看到的角度（直式時場地轉了 90°）
  const shownAngle = () => norm(angle + (portrait ? 90 : 0));
  const norm = a => ((a % 360) + 360) % 360;
  // 在世界座標某點畫「正立」的東西（直式時反轉回來）
  function upright(x, y, fn) { ctx.save(); ctx.translate(x, y); if (portrait) ctx.rotate(Math.PI / 2); fn(); ctx.restore(); }

  // ── 進關 ──
  function load(i) {
    lvIdx = i; def = LEVELS[i]; world = Core.build(def);
    state = { dead: new Set(), boom: new Set() };
    shotsLeft = def.shots; shotsUsed = 0; bullet = null; trail = []; fx = []; over = false; shake = 0;
    enemyAnim = world.enemies.map(() => -1);
    // 預設角度：朝場地中間
    angle = Math.round(norm(Math.atan2(-(C.H / 2 - world.player.y), C.W / 2 - world.player.x) * 180 / Math.PI) * 10) / 10;
    if (Math.abs(world.player.x - C.W / 2) < 60 && Math.abs(world.player.y - C.H / 2) < 60) angle = 90;
    mode = 'play';
    $('menu').hidden = true; $('result').hidden = true;
    $('hud').hidden = false; $('ctrl').hidden = false; $('hint').hidden = false;
    $('lvName').innerHTML = `<span class="t">第 ${i + 1} 關</span>${def.name}`;
    showTip(def.tip);
    refresh();
  }
  let tipTimer = 0;
  function showTip(t) {
    const el = $('tip'); clearTimeout(tipTimer);
    if (!t) { el.hidden = true; return; }
    el.textContent = t; el.hidden = false; el.classList.remove('fade');
    tipTimer = setTimeout(() => { el.classList.add('fade'); tipTimer = setTimeout(() => (el.hidden = true), 500); }, 5000);
  }
  function refresh() {
    $('angNum').textContent = shownAngle().toFixed(1) + '°';
    let h = '';
    for (let k = 0; k < def.shots; k++) h += `<span class="shell${k < shotsUsed ? ' used' : ''}"></span>`;
    $('ammo').innerHTML = h;
    $('fire').disabled = !!bullet || shotsLeft <= 0 || over;
    $('bMute').textContent = muted ? '🔇' : '🔊';
  }

  // ── 發射 ──
  function fire() {
    if (mode !== 'play' || bullet || shotsLeft <= 0 || over) return;
    audio();
    bullet = Core.makeBullet(world, angle);
    trail = [[bullet.x, bullet.y]];
    shotsLeft--; shotsUsed++;
    sfx.shoot();
    fx.push({ t: 'flash', x: world.player.x + bullet.vx * 34, y: world.player.y + bullet.vy * 34, life: 0.12, max: 0.12 });
    showTip(null);
    refresh();
  }
  function onEvent(type, d) {
    if (type === 'bounce') { sfx.bounce(d.kind); spark(d.x, d.y, d.kind === 'mirror' ? '#8fd3ff' : '#ffd46b', 8); }
    else if (type === 'stop') { if (d.soft) { sfx.soft(); spark(d.x, d.y, '#b99bff', 10); } else spark(d.x, d.y, '#999', 6); }
    else if (type === 'hit') { sfx.hit(); enemyAnim[d.i] = 0; spark(d.x, d.y, '#ff6b5e', 16); fx.push({ t: 'pop', x: d.x, y: d.y, life: 0.6, max: 0.6 }); }
    else if (type === 'barrel') { sfx.boom(); shake = Math.max(shake, 14); fx.push({ t: 'boom', x: d.x, y: d.y, life: 0.6, max: 0.6 }); spark(d.x, d.y, '#ffb347', 30, 420); }
  }
  function spark(x, y, color, n, sp) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = (sp || 220) * (0.3 + Math.random() * 0.7);
      fx.push({ t: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.3, max: 0.6, color });
    }
  }
  function afterShot() {
    const left = world.enemies.length - state.dead.size;
    if (left === 0) { over = true; setTimeout(() => finish(true), 650); }
    else if (shotsLeft <= 0) { over = true; setTimeout(() => finish(false), 750); }
    refresh();
  }
  function finish(win) {
    mode = 'result';
    const box = $('result');
    if (win) {
      const stars = shotsUsed <= def.par ? 3 : shotsUsed <= def.par + 1 ? 2 : 1;
      const prev = save.best[lvIdx] || 0;
      if (stars > prev) { save.best[lvIdx] = stars; persist(); }
      $('rTitle').textContent = stars === 3 ? '太神啦！' : '過關！';
      $('rStars').innerHTML = '★'.repeat(stars) + '<i>' + '★'.repeat(3 - stars) + '</i>';
      $('rText').textContent = stars === 3 ? `用 ${shotsUsed} 發子彈就清光了！`
        : `用了 ${shotsUsed} 發。${def.par} 發${def.par === 1 ? '就' : '內'}清光可以拿三顆星喔！`;
      $('rNext').hidden = lvIdx >= LEVELS.length - 1;
      sfx.win();
    } else {
      $('rTitle').textContent = '子彈用完了';
      $('rStars').innerHTML = '<i>★★★</i>';
      $('rText').textContent = `還剩 ${world.enemies.length - state.dead.size} 個敵人。換個角度再試試！`;
      $('rNext').hidden = true;
      sfx.lose();
    }
    $('rRetry').classList.toggle('main', !win);
    box.hidden = false;
  }

  // ── 選關畫面 ──
  function unlocked(i) { return i === 0 || (save.best[i - 1] || 0) > 0; }
  function showMenu() {
    mode = 'menu'; bullet = null;
    $('hud').hidden = true; $('ctrl').hidden = true; $('hint').hidden = true; $('tip').hidden = true; $('result').hidden = true;
    const g = $('grid'); g.innerHTML = '';
    let next = LEVELS.findIndex((_, i) => !save.best[i]);
    LEVELS.forEach((L, i) => {
      const b = document.createElement('button');
      const st = save.best[i] || 0, open = unlocked(i);
      b.className = 'lv' + (open ? '' : ' lock') + (i === next && open ? ' next' : '');
      b.innerHTML = `<div class="n">${i + 1}</div><div class="nm">${L.name}</div><div class="st">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></div>`;
      if (open) b.onclick = () => { audio(); load(i); };
      g.appendChild(b);
    });
    $('menu').hidden = false;
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
    if (mode !== 'play') return;
    dragging = true; cv.setPointerCapture(e.pointerId); aimAt(e.clientX, e.clientY);
  });
  cv.addEventListener('pointermove', e => { if (dragging && mode === 'play') aimAt(e.clientX, e.clientY); });
  const endDrag = () => { dragging = false; };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

  // 微調按鈕：點一下 0.2°，按住越轉越快
  function holdButton(el, dir) {
    let t1 = 0, t2 = 0, n = 0;
    const step = () => { n++; setAngle(angle + dir * (n > 25 ? 2 : n > 10 ? 1 : 0.2)); };
    const stop = () => { clearTimeout(t1); clearInterval(t2); el.classList.remove('on'); };
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); if (mode !== 'play') return; audio();
      n = 0; step(); el.classList.add('on');
      t1 = setTimeout(() => { t2 = setInterval(step, 70); }, 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => el.addEventListener(k, stop));
  }
  holdButton($('bCCW'), +1);
  holdButton($('bCW'), -1);
  $('fire').onclick = fire;
  $('bRetry').onclick = () => load(lvIdx);
  $('bMenu').onclick = showMenu;
  $('bMute').onclick = () => { muted = !muted; try { localStorage.setItem('ricochet:mute', muted ? '1' : '0'); } catch (e) {} refresh(); };
  $('rMenu').onclick = showMenu;
  $('rRetry').onclick = () => load(lvIdx);
  $('rNext').onclick = () => load(Math.min(lvIdx + 1, LEVELS.length - 1));

  addEventListener('keydown', e => {
    if (mode === 'menu') { if (e.key === 'Escape') location.href = '../index.html'; return; }
    if (mode === 'result') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (!$('rNext').hidden ? $('rNext') : $('rRetry')).click(); }
      else if (e.key === 'r' || e.key === 'R') load(lvIdx);
      else if (e.key === 'Escape') showMenu();
      return;
    }
    const fine = e.shiftKey ? 0.1 : 0.5;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); setAngle(angle + fine); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); setAngle(angle - fine); }
    else if (e.key === ' ' || e.key === 'Enter' || e.key === 'f' || e.key === 'F') { e.preventDefault(); fire(); }
    else if (e.key === 'r' || e.key === 'R') load(lvIdx);
    else if (e.key === 'Escape') showMenu();
  });
  addEventListener('resize', () => { layout(); if (world) refresh(); });

  // ── 更新 ──
  function update(dt) {
    time += dt;
    if (bullet) {
      Core.advance(world, bullet, C.SPEED * dt, state, onEvent);
      trail.push([bullet.x, bullet.y]);
      if (trail.length > 14) trail.shift();
      if (bullet.dead) { bullet = null; afterShot(); }
    } else if (trail.length) trail.shift();
    for (const f of fx) {
      f.life -= dt;
      if (f.t === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; }
    }
    fx = fx.filter(f => f.life > 0);
    for (let i = 0; i < enemyAnim.length; i++) if (enemyAnim[i] >= 0) enemyAnim[i] += dt;
    shake = Math.max(0, shake - dt * 40);
  }

  // ── 繪圖 ──
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#e9dfc8'; ctx.fillRect(0, 0, vw, vh);
    if (!world) return;
    const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0;
    // 場地陰影
    ctx.fillStyle = 'rgba(43,35,64,.18)';
    const aw = (portrait ? C.H : C.W) * s, ah = (portrait ? C.W : C.H) * s;
    roundRect(ox + 4, oy + 6, aw, ah, 10); ctx.fill();
    setWorldTransform(sx, sy);
    drawFloor();
    drawBorder();
    for (const p of world.polys) drawPoly(p);
    for (const r of world.barrels) if (!state.boom.has(r.i)) drawBarrel(r);
    for (const e of world.enemies) drawEnemy(e);
    if (mode === 'play' && !bullet && !over && shotsLeft > 0) drawAim();
    drawPlayer();
    drawTrail();
    if (bullet) drawBullet(bullet.x, bullet.y);
    drawFx();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawFloor() {
    ctx.fillStyle = '#fbf6ea'; ctx.fillRect(0, 0, C.W, C.H);
    ctx.lineWidth = 1;
    for (let x = 0; x <= C.W; x += 20) { ctx.strokeStyle = x % 100 ? 'rgba(74,157,255,.10)' : 'rgba(74,157,255,.22)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, C.H); ctx.stroke(); }
    for (let y = 0; y <= C.H; y += 20) { ctx.strokeStyle = y % 100 ? 'rgba(74,157,255,.10)' : 'rgba(74,157,255,.22)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(C.W, y); ctx.stroke(); }
  }
  function drawBorder() {
    const sb = def.softBorder || {};
    const side = (on, x1, y1, x2, y2) => {
      ctx.strokeStyle = on ? '#9b6bff' : '#2b2340'; ctx.lineWidth = on ? 10 : 8; ctx.lineCap = 'square';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (on) { ctx.fillStyle = 'rgba(255,255,255,.55)'; const L = Math.hypot(x2 - x1, y2 - y1); for (let d = 10; d < L; d += 22) { ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * d / L, y1 + (y2 - y1) * d / L, 2, 0, 7); ctx.fill(); } }
    };
    side(sb.top, 0, 0, C.W, 0); side(sb.bottom, 0, C.H, C.W, C.H); side(sb.left, 0, 0, 0, C.H); side(sb.right, C.W, 0, C.W, C.H);
  }
  function polyPath(P) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }
  function drawPoly(p) {
    const P = p.pts;
    if (p.kind === 'wall') {
      ctx.save(); ctx.translate(3, 4); polyPath(P); ctx.fillStyle = 'rgba(43,35,64,.18)'; ctx.fill(); ctx.restore();
      polyPath(P); ctx.fillStyle = '#3b3358'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#2b2340'; ctx.stroke();
      // 磚塊紋路
      ctx.save(); polyPath(P); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2;
      for (let y = 0; y < C.H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(C.W, y); ctx.stroke(); }
      ctx.restore();
    } else if (p.kind === 'soft') {
      polyPath(P); ctx.fillStyle = '#9b6bff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6f45d6'; ctx.stroke();
      ctx.save(); polyPath(P); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let y = 6; y < C.H; y += 16) for (let x = (y / 16 % 2) * 8 + 4; x < C.W; x += 16) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); }
      ctx.restore();
    } else if (p.kind === 'mirror') {
      polyPath(P);
      const g = ctx.createLinearGradient(P[0][0], P[0][1], P[3][0], P[3][1]);
      g.addColorStop(0, '#d8f2ff'); g.addColorStop(0.5, '#7cc7ff'); g.addColorStop(1, '#3d8fe0');
      ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#2a6fb8'; ctx.stroke();
      const mx = (P[0][0] + P[3][0]) / 2, my = (P[0][1] + P[3][1]) / 2, nx = (P[1][0] + P[2][0]) / 2, ny = (P[1][1] + P[2][1]) / 2;
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx + (nx - mx) * 0.15, my + (ny - my) * 0.15); ctx.lineTo(mx + (nx - mx) * 0.4, my + (ny - my) * 0.4); ctx.stroke();
    }
  }
  function drawBarrel(r) {
    upright(r.x, r.y, () => {
      const R = C.BARREL_R;
      ctx.fillStyle = 'rgba(43,35,64,.2)'; ctx.beginPath(); ctx.ellipse(2, R * 0.8, R, R * 0.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8473c'; roundRect(-R, -R, R * 2, R * 2, 6); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#8f231c'; ctx.stroke();
      ctx.fillStyle = '#ffc23d'; ctx.fillRect(-R, -5, R * 2, 10);
      ctx.fillStyle = '#2b2340'; ctx.font = '900 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 0.5);
    });
  }
  function drawEnemy(e) {
    const t = enemyAnim[e.i];
    if (t > 0.6) {               // 倒下後留一個小叉叉
      upright(e.x, e.y, () => { ctx.strokeStyle = 'rgba(43,35,64,.25)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, 8); ctx.moveTo(8, -8); ctx.lineTo(-8, 8); ctx.stroke(); });
      return;
    }
    const R = C.ENEMY_R, bob = t < 0 ? Math.sin(time * 4 + e.i * 1.7) * 2 : 0;
    const k = t < 0 ? 1 : 1 - t / 0.6;
    upright(e.x, e.y, () => {
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(43,35,64,.2)'; ctx.beginPath(); ctx.ellipse(2, R * 0.85, R * 0.95, R * 0.35, 0, 0, 7); ctx.fill();
      ctx.translate(0, bob); ctx.scale(k * 0.4 + 0.6, k * 0.4 + 0.6);
      // 身體（有角的小怪獸）
      ctx.fillStyle = '#5bc36a';
      ctx.beginPath(); ctx.moveTo(-R * 0.6, -R * 0.7); ctx.lineTo(-R * 0.45, -R * 1.25); ctx.lineTo(-R * 0.15, -R * 0.85); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(R * 0.6, -R * 0.7); ctx.lineTo(R * 0.45, -R * 1.25); ctx.lineTo(R * 0.15, -R * 0.85); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#2f7a3b'; ctx.stroke();
      // 眼睛＋眉毛
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-7, -3, 6, 0, 7); ctx.arc(7, -3, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b2340';
      const px = world.player.x - e.x, py = world.player.y - e.y, L = Math.hypot(px, py) || 1;
      let lx = px / L * 2.5, ly = py / L * 2.5;
      if (portrait) { const tx = lx; lx = ly; ly = -tx; }
      ctx.beginPath(); ctx.arc(-7 + lx, -3 + ly, 3, 0, 7); ctx.arc(7 + lx, -3 + ly, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-12, -11); ctx.lineTo(-3, -8); ctx.moveTo(12, -11); ctx.lineTo(3, -8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 9); ctx.lineTo(-2, 7); ctx.lineTo(2, 9); ctx.lineTo(6, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }
  function drawPlayer() {
    const p = world.player, a = -angle * Math.PI / 180;
    // 量角器
    if (mode === 'play') {
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.strokeStyle = 'rgba(43,35,64,.18)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 44, 0, 7); ctx.stroke();
      for (let d = 0; d < 360; d += 15) {
        const r = d % 90 === 0 ? 34 : d % 45 === 0 ? 37 : 40, q = -d * Math.PI / 180;
        ctx.strokeStyle = d % 90 === 0 ? 'rgba(43,35,64,.45)' : 'rgba(43,35,64,.22)';
        ctx.beginPath(); ctx.moveTo(Math.cos(q) * r, Math.sin(q) * r); ctx.lineTo(Math.cos(q) * 44, Math.sin(q) * 44); ctx.stroke();
      }
      // 從 0°（畫面的右邊）到目前角度的弧
      const base = portrait ? Math.PI / 2 : 0;   // 直式時畫面右邊 = 世界 -90°
      ctx.strokeStyle = 'rgba(239,75,63,.55)'; ctx.lineWidth = 4;
      const shown = shownAngle() * Math.PI / 180;
      ctx.beginPath(); ctx.arc(0, 0, 50, base, base - shown, true); ctx.stroke();
      ctx.restore();
    }
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(43,35,64,.2)'; ctx.beginPath(); ctx.ellipse(2, 5, 24, 22, 0, 0, 7); ctx.fill();
    // 槍
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = '#2b2340'; roundRect(8, -6, 32, 12, 4); ctx.fill();
    ctx.fillStyle = '#5a5277'; ctx.fillRect(30, -4, 10, 8);
    ctx.restore();
    // 身體
    ctx.fillStyle = '#4a9dff'; ctx.beginPath(); ctx.arc(0, 0, C.PLAYER_R, 0, 7); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#2a6fb8'; ctx.stroke();
    ctx.restore();
    upright(p.x, p.y, () => {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-7, -4, 5.5, 0, 7); ctx.arc(7, -4, 5.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b2340';
      let lx = Math.cos(a) * 2, ly = Math.sin(a) * 2;
      if (portrait) { const tx = lx; lx = ly; ly = -tx; }
      ctx.beginPath(); ctx.arc(-7 + lx, -4 + ly, 2.8, 0, 7); ctx.arc(7 + lx, -4 + ly, 2.8, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 6, 5, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = '#ffc23d'; ctx.fillRect(-16, -15, 32, 5);   // 頭帶
    });
  }
  function drawAim() {
    const r = Core.aimPath(world, angle, 1, 150);
    const P = r.pts;
    ctx.save(); ctx.lineCap = 'round';
    const total = [];
    let acc = 0;
    for (let i = 1; i < P.length; i++) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); total.push(acc); }
    const dash = 14, gap = 10, off = -(time * 60) % (dash + gap);
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      ctx.globalAlpha = i === 1 ? 0.9 : 0.45;
      ctx.strokeStyle = '#ef4b3f'; ctx.lineWidth = i === 1 ? 4 : 3;
      ctx.setLineDash([dash, gap]); ctx.lineDashOffset = off;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      if (i === 1 && P.length > 2) { ctx.setLineDash([]); ctx.fillStyle = '#ef4b3f'; ctx.beginPath(); ctx.arc(b[0], b[1], 6, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  function drawTrail() {
    if (trail.length < 2) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < trail.length; i++) {
      ctx.globalAlpha = i / trail.length * 0.7;
      ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2 + i / trail.length * 5;
      ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBullet(x, y) {
    ctx.fillStyle = '#ffde7a'; ctx.beginPath(); ctx.arc(x, y, C.BULLET_R + 2, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#c47a10'; ctx.stroke();
  }
  function drawFx() {
    for (const f of fx) {
      const k = f.life / f.max;
      if (f.t === 'p') { ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + 3 * k, 0, 7); ctx.fill(); }
      else if (f.t === 'boom') {
        ctx.globalAlpha = k; ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(f.x, f.y, C.BLAST_R * (1 - k * 0.6), 0, 7); ctx.fill();
        ctx.globalAlpha = k * 0.8; ctx.strokeStyle = '#ef4b3f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(f.x, f.y, C.BLAST_R * (1.1 - k * 0.5), 0, 7); ctx.stroke();
      } else if (f.t === 'pop') {
        ctx.globalAlpha = k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, 20 + (1 - k) * 30, 0, 7); ctx.stroke();
      } else if (f.t === 'flash') {
        ctx.globalAlpha = k; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(f.x, f.y, 14, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── 主迴圈 ──
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mode === 'play') update(dt); else time += dt;
    draw();
    requestAnimationFrame(frame);
  }
  layout();
  showMenu();
  // 網址帶 ?lv=3 直接進第 3 關（測試用）
  const q = new URLSearchParams(location.search).get('lv');
  if (q && LEVELS[+q - 1]) load(+q - 1);
  requestAnimationFrame(frame);

  // 給測試用
  window.__rico = { get angle() { return angle; }, setAngle: a => setAngle(a, true), fire, load, get mode() { return mode; }, get dead() { return state && state.dead.size; }, get shotsLeft() { return shotsLeft; } };
})();
