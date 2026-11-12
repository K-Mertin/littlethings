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
  let enemyAnim = [];            // 每個敵人的倒下動畫時間（-1 = 活著）
  let knock = [], looks = [];    // 被打飛的方向、每隻敵人的外觀
  const hero = { recoil: 0, mood: 'idle', moodT: 0 };
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
    const MG = window.RicoArt ? window.RicoArt.MARGIN : 30;   // 外框寬度也要放得下
    const ww = (portrait ? C.H : C.W) + MG * 2, wh = (portrait ? C.W : C.H) + MG * 2;
    s = Math.min(aw / ww, ah / wh);
    ox = (vw - ww * s) / 2 + MG * s; oy = TOP + (ah - wh * s) / 2 + MG * s;
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

  // ── 進關 ──
  function load(i) {
    lvIdx = i; def = LEVELS[i]; world = Core.build(def);
    state = { dead: new Set(), boom: new Set() };
    shotsLeft = def.shots; shotsUsed = 0; bullet = null; trail = []; fx = []; over = false; shake = 0;
    enemyAnim = world.enemies.map(() => -1);
    knock = world.enemies.map(() => [0, 0]);
    looks = world.enemies.map(e => window.RicoArt.enemyLook(e.i, i + 1));
    hero.recoil = 0; hero.mood = 'idle';
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
    sfx.shoot(); hero.recoil = 1;
    fx.push({ t: 'flash', x: world.player.x + bullet.vx * 38, y: world.player.y + bullet.vy * 38, life: 0.14, max: 0.14 });
    for (let k = 0; k < 4; k++) fx.push({ t: 'smoke', x: world.player.x + bullet.vx * 40, y: world.player.y + bullet.vy * 40, r: 5 + k * 2, life: 0.5, max: 0.5 });
    showTip(null);
    refresh();
  }
  const HIT_WORDS = ['砰！', '咚！', '啪！', '中！', '耶！'];
  function onEvent(type, d) {
    if (type === 'bounce') { sfx.bounce(d.kind); spark(d.x, d.y, d.kind === 'mirror' ? '#bfe8ff' : '#ffd46b', 9); fx.push({ t: 'ring', x: d.x, y: d.y, r: 4, color: d.kind === 'mirror' ? '#bfe8ff' : '#fff3b0', life: 0.3, max: 0.3 }); }
    else if (type === 'stop') { if (d.soft) { sfx.soft(); spark(d.x, d.y, '#c9b0ff', 12); fx.push({ t: 'word', x: d.x, y: d.y, text: '噗', color: '#c9b0ff', life: 0.7, max: 0.7 }); } else spark(d.x, d.y, '#bbb', 8); }
    else if (type === 'hit') {
      sfx.hit(); enemyAnim[d.i] = 0;
      const vx = bullet ? bullet.vx : d.x - world.player.x, vy = bullet ? bullet.vy : d.y - world.player.y, L = Math.hypot(vx, vy) || 1;
      knock[d.i] = [vx / L, vy / L];
      spark(d.x, d.y, '#7fdc7a', 14); spark(d.x, d.y, '#fff', 6);
      fx.push({ t: 'ring', x: d.x, y: d.y, r: 18, life: 0.45, max: 0.45 });
      fx.push({ t: 'word', x: d.x, y: d.y - 24, text: HIT_WORDS[(d.i + shotsUsed) % HIT_WORDS.length], life: 0.9, max: 0.9 });
    }
    else if (type === 'barrel') {
      sfx.boom(); shake = Math.max(shake, 16);
      fx.push({ t: 'boom', x: d.x, y: d.y, life: 0.7, max: 0.7 });
      fx.push({ t: 'word', x: d.x, y: d.y - 20, text: '轟！', color: '#ff7a3d', life: 1, max: 1 });
      spark(d.x, d.y, '#ffb347', 30, 420); spark(d.x, d.y, '#7a4a24', 12, 300);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; fx.push({ t: 'smoke', x: d.x + Math.cos(a) * 30, y: d.y + Math.sin(a) * 30, r: 12, life: 0.9, max: 0.9 }); }
      // 爆炸的方向：從炸藥桶往外
      for (const e of world.enemies) if (enemyAnim[e.i] < 0.05 && enemyAnim[e.i] >= 0) { const L = Math.hypot(e.x - d.x, e.y - d.y) || 1; knock[e.i] = [(e.x - d.x) / L, (e.y - d.y) / L]; }
    }
  }
  function spark(x, y, color, n, sp) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = (sp || 220) * (0.3 + Math.random() * 0.7);
      fx.push({ t: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.3, max: 0.6, color });
    }
  }
  function afterShot() {
    const left = world.enemies.length - state.dead.size;
    if (left === 0) { over = true; hero.mood = 'win'; setTimeout(() => finish(true), 1100); }
    else if (shotsLeft <= 0) { over = true; hero.mood = 'sad'; setTimeout(() => finish(false), 1000); }
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
    hero.recoil = Math.max(0, hero.recoil - dt * 7);
  }

  // ── 繪圖 ──
  const Art = window.RicoArt;
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
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!world) { ctx.fillStyle = '#e9dfc8'; ctx.fillRect(0, 0, vw, vh); return; }
    ensureCaches();
    ctx.drawImage(bgCv, 0, 0, vw, vh);
    const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0;
    setWorldTransform(sx, sy);
    Art.use(ctx, portrait);
    // 場地陰影＋預先畫好的場景
    const MG = Art.MARGIN;
    ctx.fillStyle = 'rgba(20,10,30,.25)'; Art.rr(ctx, -MG + 6, -MG + 10, C.W + MG * 2, C.H + MG * 2, 14); ctx.fill();
    ctx.drawImage(sceneCv, -MG, -MG, C.W + MG * 2, C.H + MG * 2);
    for (const r of world.barrels) if (!state.boom.has(r.i)) Art.barrel(r.x, r.y, time + r.i);
    // 先畫倒下的，再畫活著的（活著的在上面）
    for (const pass of [0, 1]) for (const e of world.enemies) {
      const t = enemyAnim[e.i];
      if ((t >= 0) !== (pass === 0)) continue;
      const kd = knock[e.i] || [0, 0];
      const lx = world.player.x - e.x, ly = world.player.y - e.y, L = Math.hypot(lx, ly) || 1;
      Art.enemy(e.x, e.y, looks[e.i], { t: time, dead: t, kx: kd[0], ky: kd[1], lookX: lx / L, lookY: ly / L, scared: !!bullet && !over });
    }
    const aiming = mode === 'play' && !bullet && !over && shotsLeft > 0;
    if (aiming) drawAim();
    if (mode === 'play' || mode === 'result') Art.protractor(world.player.x, world.player.y, shownAngle(), portrait ? Math.PI / 2 : 0);
    Art.hero(world.player.x, world.player.y, shownAngle(), { t: time, recoil: hero.recoil, mood: hero.mood, blink: (time % 4.2) < 0.13 });
    drawTrail();
    if (bullet) drawBullet(bullet.x, bullet.y);
    drawFx();
  }
  function drawAim() {
    const r = Core.aimPath(world, angle, 1, 150);
    const P = r.pts;
    ctx.save(); ctx.lineCap = 'round';
    const dash = 14, gap = 10, off = -(time * 60) % (dash + gap);
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      ctx.globalAlpha = i === 1 ? 0.95 : 0.5;
      ctx.setLineDash([dash, gap]); ctx.lineDashOffset = off;
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = i === 1 ? 8 : 6;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.strokeStyle = '#ef4b3f'; ctx.lineWidth = i === 1 ? 4 : 3;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      if (i === 1 && P.length > 2) {
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b[0], b[1], 8, 0, 7); ctx.fill();
        ctx.fillStyle = '#ef4b3f'; ctx.beginPath(); ctx.arc(b[0], b[1], 5, 0, 7); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawTrail() {
    if (trail.length < 2) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < trail.length; i++) {
      const k = i / trail.length;
      ctx.globalAlpha = k * 0.35; ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 4 + k * 12;
      ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
      ctx.globalAlpha = k * 0.9; ctx.strokeStyle = '#ffab3d'; ctx.lineWidth = 2 + k * 5;
      ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBullet(x, y) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, 16);
    g.addColorStop(0, 'rgba(255,240,170,.9)'); g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff6cf'; ctx.beginPath(); ctx.arc(x, y, C.BULLET_R + 1.5, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#d0841a'; ctx.stroke();
  }
  function drawFx() {
    for (const f of fx) {
      const k = f.life / f.max;
      if (f.t === 'p') { ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, 1.5 + 3 * k, 0, 7); ctx.fill(); }
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
  const bLooks = [0, 1, 2].map(i => window.RicoArt.enemyLook(i, 42));
  function drawBanner() {
    const k = Math.min(2, window.devicePixelRatio || 1);
    if (bcv.width !== 420 * k) { bcv.width = 420 * k; bcv.height = 120 * k; }
    bctx.setTransform(k, 0, 0, k, 0, 0); bctx.clearRect(0, 0, 420, 120);
    window.RicoArt.use(bctx, false);
    const aim = 8 + Math.sin(time * 1.3) * 10;
    // 子彈的虛線軌跡（撞頂端反彈）
    bctx.save(); bctx.setLineDash([8, 7]); bctx.lineDashOffset = -time * 40; bctx.strokeStyle = 'rgba(239,75,63,.6)'; bctx.lineWidth = 3;
    bctx.beginPath(); bctx.moveTo(95, 78); bctx.lineTo(215, 14); bctx.lineTo(330, 70); bctx.stroke(); bctx.restore();
    bctx.fillStyle = '#ef4b3f'; bctx.beginPath(); bctx.arc(215, 14, 4, 0, 7); bctx.fill();
    window.RicoArt.hero(70, 82, aim, { t: time, recoil: 0, mood: 'idle', blink: (time % 4.2) < 0.13 });
    [[300, 84], [345, 66], [385, 90]].forEach(([x, y], i) => window.RicoArt.enemy(x, y, bLooks[i], { t: time + i, dead: -1, lookX: -1, lookY: 0 }));
  }

  // ── 主迴圈 ──
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mode === 'play') update(dt); else { time += dt; for (let i = 0; i < enemyAnim.length; i++) if (enemyAnim[i] >= 0) enemyAnim[i] += dt; }
    if (mode === 'menu') drawBanner(); else draw();
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
