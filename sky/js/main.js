'use strict';
// 空戰：主迴圈、關卡流程、畫面、選單
const DIFF = {
  easy: { label: '簡單', lives: 5, bombs: 3, bs: 0.7, fr: 0.55, hp: 0.8, bossHp: 0.7, dens: 0.6, autoBomb: true, drop: 1, ext: 100000, hit: 2.2, shotChance: 0.35, beams: false },
  normal: { label: '普通', lives: 3, bombs: 3, bs: 1, fr: 1, hp: 1, bossHp: 1, dens: 1, autoBomb: false, drop: 2, ext: 200000, hit: 2.8, shotChance: 0.7, beams: true },
  hard: { label: '困難', lives: 3, bombs: 2, bs: 1.2, fr: 1.35, hp: 1.15, bossHp: 1.2, dens: 1.3, autoBomb: false, drop: 3, ext: 300000, hit: 3, shotChance: 1, beams: true },
};
const cv = document.getElementById('cv'), ctx = cv.getContext('2d'), stageEl = document.getElementById('stage');
const G = {
  state: 'title', paused: false, diff: 'normal', round: 1, stage: 0, score: 0, lives: 3, bombs: 3, cont: 0, t: 0, st: 0,
  scroll: 0, speed: 46, enemies: [], eb: [], pb: [], items: [], fx: [], decals: [], beams: [], queue: [], boss: null,
  phase: 'fight', seqI: 0, nextWave: 0, shake: 0, bombT: 0, flash: 0, extNext: 0, medals: 0, medalChain: 0, kills: 0, miss: 0,
  banner: null, d: DIFF.normal, warnT: 0, downT: 0, clearT: 0, bonus: 0, startFrom: 0,
};
let RS = 2;

function resize() {
  const ww = innerWidth, wh = innerHeight;
  let h = wh, w = h * W / H;
  if (w > ww) { w = ww; h = w * H / W; }
  stageEl.style.width = w + 'px'; stageEl.style.height = h + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  RS = Math.min(3, (w / W) * dpr);
  cv.width = Math.round(W * RS); cv.height = Math.round(H * RS);
  Art.setScale(RS); Terrain.setScale(Math.min(RS, 2.2));
  document.body.classList.toggle('wide', ww - w > 460);
  stageEl.style.setProperty('--u', (w / W) + 'px');
}

function computeDiff() {
  const d = Object.assign({}, DIFF[G.diff]);
  if (G.round > 1) { d.bs *= 1.12; d.fr *= 1.2; d.dens *= 1.15; d.hp *= 1.2; d.bossHp *= 1.2; d.shotChance = 1; }
  return d;
}
function newGame(from = 0) {
  G.round = 1; G.d = computeDiff();
  G.score = 0; G.lives = G.d.lives; G.bombs = G.d.bombs; G.cont = 0; G.kills = 0; G.medals = 0; G.medalChain = 0; G.miss = 0; G.extNext = G.d.ext;
  P.w = 'red'; P.lvl = 1; P.sub = null; P.sl = 0; P.inv = 0;
  if (from > 0) { P.lvl = Math.min(LV_CAP[from] ?? 8, 1 + from * 2); P.sub = 'M'; P.sl = Math.min(4, from); }
  G.startFrom = from;
  G.state = 'play'; G.paused = false;
  showOv(null); document.body.classList.add('playing');
  startStage(from);
}
function startStage(n) {
  G.stage = n; Terrain.reset(n); G.scroll = 0; G.st = 0;
  G.enemies = []; G.eb = []; G.pb = []; G.items = []; G.fx = []; G.decals = []; G.beams = []; G.queue = [];
  G.phase = 'fight'; G.seqI = 0; G.nextWave = 2.6; G.boss = null; G.bombT = 0; G.intro = null; G.caution = null;
  G.stageKills = G.kills; G.stageMedals = G.medals; G.stageMiss = G.miss; G.bonusGiven = false; G.medalChain = 0;
  G.speed = STAGES[n].speed || 46;
  G.banner = { t: 0, big: 'STAGE ' + (n + 1) + (G.round > 1 ? '-2' : ''), small: STAGES[n].name, en: STAGES[n].en, extra: G.round === 1 && n > 0 && LV_CAP[n] > LV_CAP[n - 1] ? '武器等級上限提升到 Lv' + LV_CAP[n] : '' };
  if (STAGES[n].clouds) SkyClouds.init();
  G.amb = [];
  playerEnter(); P.inv = 1.6;
  Music.play('s' + n);
  if (n + 1 > Store.data.reached) { Store.data.reached = n + 1; Store.save(); }
  Terrain.ensure(0);
}
function addScore(n) {
  G.score += n;
  if (G.score >= G.extNext) { G.lives++; G.extNext += G.d.ext * 2; popText(P.x, P.y - 40, '1UP!', '#7dffb0'); Snd.play('1up'); }
}
function bossDown(e) {
  G.phase = 'down'; G.downT = 0; G.downX = e.x; G.downY = e.y; G.downAir = e.layer === 'air'; G.boss = null;
  for (const o of G.enemies) if (!o.dead && o !== e) { o.dead = true; boom(o.x, o.y, 1, o.layer === 'ground'); addScore(o.score); }
  G.eb.length = 0; G.beams.length = 0; G.queue.length = 0;
  G.flash = 0.9; G.shake = 14; P.inv = 99; Music.stop();
  if (!e.ground && e.layer === 'ground') G.decals.push({ x: e.x, y: e.y, r: 70 });
  const kills = G.kills - G.stageKills, medals = G.medals - G.stageMedals, nomiss = G.miss === G.stageMiss;
  G.tally = { kills, medals, nomiss, bonus: 10000 * (G.stage + 1) * G.round + medals * 1000 + (nomiss ? 30000 : 0) };
}
function runScript(dt) {
  if (G.queue.length) {
    const now = G.st, due = G.queue.filter(q => q.t <= now);
    if (due.length) { G.queue = G.queue.filter(q => q.t > now); due.forEach(q => q.fn()); }
  }
  const S = STAGES[G.stage];
  if (G.phase === 'fight') {
    if (G.seqI < S.seq.length && G.st >= G.nextWave) {
      const base = G.st, name = S.seq[G.seqI++];
      const d = WAVES[name]((t, fn) => G.queue.push({ t: base + t, fn }));
      G.nextWave = base + d + 0.3;
    } else if (G.seqI >= S.seq.length && G.st >= G.nextWave) {
      const left = G.enemies.some(e => !e.boss && e.layer === 'air' && e.y > -40);
      if (!left || G.st > G.nextWave + 6) { G.phase = 'warn'; G.warnT = 0; Terrain.statics = false; Music.stop(); }
    }
  } else if (G.phase === 'warn') {
    BossIntro.warnTick(dt);
  } else if (G.phase === 'down') {
    G.downT += dt;
    if (G.downT < 2.4 && Math.random() < dt * 14) boom(G.downX + rnd(-60, 60), G.downY + rnd(-50, 50), rnd(1, 2.2), !G.downAir);
    if (G.downT > 2.4 && G.downT - dt <= 2.4) { boom(G.downX, G.downY, 5, !G.downAir); G.flash = 1; G.shake = 16; for (let i = 0; i < 6; i++) spawnItem(i < 4 ? 'medal' : 'P', G.downX + rnd(-50, 50), G.downY + rnd(-30, 30)); }
    if (G.downT > 3.6) { G.phase = 'clear'; G.clearT = 0; Music.play('clear'); }
  } else if (G.phase === 'clear') {
    G.clearT += dt;
    if (G.clearT > 1.4 && !G.bonusGiven) { G.bonusGiven = true; addScore(G.tally.bonus); Snd.play('item'); }
    if (G.clearT > 4.2 && P.alive && !P.auto) { P.auto = 80; }
    if (G.clearT > 6) {
      if (G.stage < STAGES.length - 1) startStage(G.stage + 1);
      else showEnding();
    }
  }
}

function update(dt) {
  Input.pollPad();
  if (G.state === 'title') {
    G.t += dt; G.scroll += 28 * dt; Terrain.ensure(G.scroll); Terrain.work(3);
    if (Input.hit('Enter') || Input.pad.startEdge) startFromTitle();
    return;
  }
  if (G.state === 'play') {
    if (Input.hit('KeyP') || Input.hit('Escape') || Input.pad.startEdge) { setPause(!G.paused); }
    if (G.paused) return;
    G.t += dt; G.st += dt;
    G.scroll += G.speed * dt; Terrain.ensure(G.scroll); Terrain.work(3);
    for (const s of Terrain.takeStatics(G.scroll)) spawn(s.type, s.x, s.y);
    if (STAGES[G.stage].clouds) SkyClouds.update(dt, G.speed);
    if (STAGES[G.stage].amb) ambUpdate(dt);
    runScript(dt);
    updatePlayer(dt); updatePB(dt); updateEnemies(dt); updateEB(dt); updateItems(dt);
    if (G.bombT > 0) bombTick(dt);
    if (G.banner) G.banner.t += dt;
    BossIntro.update(dt);
  } else {
    G.t += dt; G.scroll += G.speed * 0.5 * dt; Terrain.ensure(G.scroll);
  }
  updateFX(dt);
  G.shake *= Math.pow(0.02, dt); if (G.shake < 0.2) G.shake = 0;
  G.flash = Math.max(0, G.flash - dt * 1.6);
}
function bombTick(dt) {
  G.bombT -= dt;
  for (const e of G.enemies) if (!e.dead && !e.hidden && e.y > -20 && e.y < H + 20) hurt(e, 45 * dt);
  if (G.eb.length) {
    for (const b of G.eb) fxP({ k: 'c', x: b.x, y: b.y, vx: 0, vy: -40, life: 0, max: 0.35 });
    addScore(G.eb.length * 10); G.eb.length = 0;
  }
  G.beams.length = 0;
  if (G.bombT > 0.5 && Math.random() < dt * 30) {
    const a = rnd(TAU), r = rnd(30, 260) * Math.min(1, (2 - G.bombT) * 2);
    fxP({ k: 'f', x: P.x + Math.cos(a) * r, y: P.y - 120 + Math.sin(a) * r, vx: 0, vy: 0, r: rnd(14, 28), life: 0, max: rnd(0.4, 0.7) });
  }
}

// ---------- 畫面 ----------
function draw() {
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  ctx.fillStyle = '#0b0d10'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (G.shake) ctx.translate(rnd(-G.shake, G.shake) * 0.6, rnd(-G.shake, G.shake) * 0.6);
  Terrain.draw(ctx, G.scroll);
  if (G.state !== 'title') {
    drawDecals(ctx);
    drawEnemies(ctx, 'ground');
    drawFX(ctx, true);
    if (STAGES[G.stage].under) STAGES[G.stage].under(ctx);
    if (STAGES[G.stage].clouds) SkyClouds.draw(ctx);
    drawEnemyShadows(ctx);
    if (P.alive) Art.shadow(ctx, P.spr || 'player', P.x, P.y, 0, 0.7);
    drawItems(ctx);
    drawEnemies(ctx, 'air');
    drawPB(ctx);
    drawPlayer(ctx);
    drawFX(ctx, false);
    if (STAGES[G.stage].amb) ambDraw(ctx);
    drawEB(ctx);
    drawPlayerHitbox(ctx);
    drawJetWarn(ctx);
    if (G.bombT > 0) drawBomb(ctx);
  } else {
    ctx.fillStyle = 'rgba(5,10,20,.35)'; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,250,235,${Math.min(0.85, G.flash)})`; ctx.fillRect(0, 0, W, H); }
  if (G.state !== 'title') drawHUD(ctx);
}
function drawBomb(c) {
  const k = 2 - G.bombT;
  c.save(); c.globalCompositeOperation = 'lighter';
  const r = Math.min(1, k / 0.7) * 460;
  c.strokeStyle = `rgba(255,220,140,${Math.max(0, 0.8 - k * 0.5)})`; c.lineWidth = 18 * (1 - Math.min(1, k / 1.2)) + 2;
  c.beginPath(); c.arc(P.x, P.y - 40, r, 0, TAU); c.stroke();
  c.fillStyle = `rgba(255,140,40,${0.22 * Math.max(0, 1 - k / 2)})`; c.fillRect(0, 0, W, H);
  c.restore();
}
function drawJetWarn(c) {
  for (const e of G.enemies) {
    if (e.type !== 'jet' || e.warn <= 0) continue;
    if (Math.floor(e.warn * 10) % 2) continue;
    c.fillStyle = '#ff3b3b'; c.beginPath(); c.moveTo(e.x, H - 44); c.lineTo(e.x - 12, H - 22); c.lineTo(e.x + 12, H - 22); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.font = '700 13px Silkscreen,monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', e.x, H - 29);
  }
}
const pad8 = n => String(Math.floor(n)).padStart(8, '0');
function txt(c, s, x, y, size, color = '#fff', align = 'left', font = 'Silkscreen,ui-monospace,monospace', weight = 400) {
  c.font = `${weight} ${size}px ${font}`; c.textAlign = align; c.textBaseline = 'middle';
  c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(s, x, y);
  c.fillStyle = color; c.fillText(s, x, y);
}
const CJK = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
function drawHUD(c) {
  const gr = c.createLinearGradient(0, 0, 0, 30); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.fillRect(0, 0, W, 30);
  const hi = Math.max(Store.data.hi[G.diff] || 0, G.score);
  txt(c, '1P', 8, 11, 9, '#ff8a6a'); txt(c, pad8(G.score), 26, 11, 12);
  txt(c, 'HI', 168, 11, 9, '#ffd23f', 'right'); txt(c, pad8(hi), 172, 11, 12, '#ffe9a8');
  txt(c, 'ST' + (G.stage + 1), W - 8, 11, 10, '#8fd0ff', 'right');
  // 頭目血條
  BossIntro.drawBar(c);
  // 殘機與炸彈
  for (let i = 0; i < Math.min(G.lives, 7); i++) Art.draw(c, 'lifeIcon', 12 + i * 14, H - 14);
  if (G.lives > 7) txt(c, '×' + G.lives, 12 + 7 * 14, H - 14, 9);
  for (let i = 0; i < G.bombs; i++) {
    const x = 12 + i * 14, y = H - 32;
    c.fillStyle = '#ff9a3a'; c.beginPath(); c.arc(x, y, 5.5, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
    txt(c, 'B', x, y + 0.5, 7, '#fff', 'center');
  }
  // 武器
  const col = ITEM_COL[P.w][0];
  c.fillStyle = col; c.beginPath(); c.arc(12, H - 50, 5, 0, TAU); c.fill();
  const cap = wCap();
  const odc = window.odCap ? odCap() : 0, np = 8 + odc;
  for (let i = 0; i < np; i++) {
    if (i >= 8) { c.fillStyle = i - 8 < (P.od || 0) ? '#ffd84a' : 'rgba(255,216,74,.28)'; c.beginPath(); c.moveTo(23 + i * 6, H - 54); c.lineTo(26 + i * 6, H - 50); c.lineTo(23 + i * 6, H - 46); c.lineTo(20 + i * 6, H - 50); c.fill(); continue; }
    c.fillStyle = i < P.lvl ? col : i < cap ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.06)'; c.fillRect(21 + i * 6, H - 53, 4.5, 6); if (i >= cap) { c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(21 + i * 6, H - 50.5, 4.5, 1); }
  }
  if (P.sub) txt(c, P.sub + P.sl, 26 + np * 6, H - 50, 9, ITEM_COL[P.sub][0]);
  if (G.round > 1) txt(c, '第二輪', W - 8, 26, 9, '#ff8a6a', 'right', CJK, 700);
  // 標題橫幅
  const bn = G.banner;
  if (bn && bn.t < 3.2 && G.phase === 'fight') {
    const a = bn.t < 0.3 ? bn.t / 0.3 : bn.t > 2.6 ? (3.2 - bn.t) / 0.6 : 1;
    c.globalAlpha = Math.max(0, a);
    c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 230, W, 96);
    txt(c, bn.big, W / 2, 256, 22, '#ffd23f', 'center');
    txt(c, bn.small, W / 2, 288, 22, '#fff', 'center', CJK, 900);
    txt(c, bn.en, W / 2, 312, 9, '#9fc4e8', 'center');
    if (bn.extra) txt(c, bn.extra, W / 2, 342, 13, '#7dffb0', 'center', CJK, 700);
    c.globalAlpha = 1;
  }
  if (G.phase === 'warn') BossIntro.drawWarn(c);
  BossIntro.drawPlate(c); BossIntro.drawCaution(c); BossIntro.drawDown(c);
  if (G.phase === 'clear' && G.clearT > 0.3 && G.clearT < 5.6) {
    const T = G.tally;
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(30, 200, W - 60, 190);
    c.strokeStyle = 'rgba(255,210,63,.6)'; c.strokeRect(30.5, 200.5, W - 61, 189);
    txt(c, 'STAGE CLEAR', W / 2, 226, 20, '#ffd23f', 'center');
    txt(c, '第 ' + (G.stage + 1) + ' 關完成！', W / 2, 254, 15, '#fff', 'center', CJK, 700);
    const rows = [['擊落敵機', T.kills + ' 架'], ['收集獎章', T.medals + ' 個'], ['沒有被打下', T.nomiss ? '+30000' : '—'], ['過關獎勵', String(T.bonus)]];
    rows.forEach(([a, v], i) => {
      if (G.clearT < 0.6 + i * 0.25) return;
      txt(c, a, 60, 286 + i * 24, 13, '#cfe3f7', 'left', CJK, 500);
      txt(c, v, W - 60, 286 + i * 24, 12, i === 3 ? '#ffd23f' : '#fff', 'right', /\d/.test(v) && !/[架個]/.test(v) ? 'Silkscreen,monospace' : CJK, 700);
    });
  }
  if (G.d.autoBomb && G.state === 'play' && G.st < 6 && G.stage === G.startFrom && G.round === 1) {
    txt(c, '簡單模式：被打到會自動放炸彈保護你', W / 2, H - 80, 11, '#ffe9a8', 'center', CJK, 500);
  }
}

// ---------- 選單 ----------
const $ = id => document.getElementById(id);
function showOv(id) {
  for (const el of document.querySelectorAll('.ov')) el.hidden = el.id !== id;
  document.body.classList.toggle('menu', !!id);
}
function refreshTitle() {
  const d = Store.data;
  for (const b of document.querySelectorAll('[data-diff]')) b.classList.toggle('on', b.dataset.diff === G.diff);
  $('diffNote').textContent = { easy: '給小朋友：子彈比較慢、比較少，被打到會自動放炸彈。5 架飛機。', normal: '一般難度。3 架飛機，被打下來火力會掉兩級。', hard: '子彈又快又多，頭目更硬。給高手挑戰。' }[G.diff];
  const st = $('stages'); st.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const b = document.createElement('button');
    b.className = 'stg' + (G.startFrom === i ? ' on' : ''); b.textContent = i + 1; b.title = STAGES[i].name;
    b.disabled = i + 1 > d.reached;
    b.onclick = () => { G.startFrom = i; Snd.init(); Snd.play('select'); refreshTitle(); };
    st.appendChild(b);
  }
  $('stageName').textContent = '第 ' + (G.startFrom + 1) + ' 關 · ' + STAGES[G.startFrom].name;
  $('hiList').innerHTML = ['easy', 'normal', 'hard'].map(k => `<span>${DIFF[k].label}<b>${(d.hi[k] || 0).toLocaleString()}</b></span>`).join('');
  syncToggles();
}
function syncToggles() {
  for (const b of document.querySelectorAll('[data-opt]')) {
    const k = b.dataset.opt, on = !!Store.data[k];
    b.classList.toggle('on', on);
    b.querySelector('b').textContent = on ? '開' : '關';
  }
}
function startFromTitle() {
  Snd.init(); Snd.play('start');
  newGame(G.startFrom);
}
function setPause(on) {
  if (G.state !== 'play') return;
  G.paused = on;
  showOv(on ? 'pause' : null);
  if (on) $('pauseInfo').textContent = '第 ' + (G.stage + 1) + ' 關 · ' + STAGES[G.stage].name + '　分數 ' + G.score.toLocaleString();
}
let contTimer = null;
function showContinue() {
  G.state = 'continue'; saveHi();
  showOv('cont'); Music.play('title');
  let n = 9; $('contN').textContent = n;
  $('contScore').textContent = G.score.toLocaleString();
  clearInterval(contTimer);
  contTimer = setInterval(() => { n--; $('contN').textContent = Math.max(0, n); if (n < 0) { clearInterval(contTimer); gameOver(); } }, 1000);
}
function doContinue() {
  clearInterval(contTimer);
  G.cont++; G.lives = G.d.lives; G.bombs = G.d.bombs; G.state = 'play';
  showOv(null); playerEnter(); P.inv = 3;
  Music.play(G.phase === 'boss' ? (STAGES[G.stage].bossSong || 'boss') : 's' + G.stage);
}
function gameOver() {
  clearInterval(contTimer);
  G.state = 'over'; saveHi();
  $('overScore').textContent = G.score.toLocaleString();
  $('overStage').textContent = '到達第 ' + (G.stage + 1) + ' 關 · ' + STAGES[G.stage].name;
  showOv('over'); document.body.classList.remove('playing');
}
function showEnding() {
  G.state = 'ending'; saveHi();
  $('endScore').textContent = G.score.toLocaleString();
  $('endNote').textContent = G.round > 1 ? '第二輪也打完了！你是真正的王牌飛行員。' : (G.cont ? '接關 ' + G.cont + ' 次。下次試試不接關打完！' : '一次都沒接關，太厲害了！');
  showOv('end'); Music.play('ending'); document.body.classList.remove('playing');
}
function nextRound() {
  G.round = 2; G.d = computeDiff(); G.state = 'play'; showOv(null); document.body.classList.add('playing');
  startStage(0);
}
function toTitle() {
  clearInterval(contTimer);
  saveHi();
  G.state = 'title'; G.paused = false; G.stage = 0; Terrain.reset(0); G.scroll = 0; G.fx = []; G.flash = 0;
  document.body.classList.remove('playing');
  showOv('title'); refreshTitle(); Music.play('title');
}
function saveHi() {
  if (G.score > (Store.data.hi[G.diff] || 0)) { Store.data.hi[G.diff] = G.score; Store.save(); }
}

function bindUI() {
  for (const b of document.querySelectorAll('[data-diff]')) b.onclick = () => { G.diff = b.dataset.diff; Snd.init(); Snd.play('select'); refreshTitle(); };
  for (const b of document.querySelectorAll('[data-opt]')) b.onclick = () => {
    const k = b.dataset.opt; Store.data[k] = !Store.data[k]; Store.save(); Snd.init(); Snd.applyVol(); syncToggles(); Snd.play('select');
  };
  $('btnStart').onclick = startFromTitle;
  $('btnResume').onclick = () => setPause(false);
  $('btnRestart').onclick = () => { setPause(false); newGame(G.startFrom); };
  $('btnQuit').onclick = toTitle;
  $('btnCont').onclick = doContinue;
  $('btnGiveUp').onclick = gameOver;
  $('btnOverTitle').onclick = toTitle;
  $('btnRound2').onclick = nextRound;
  $('btnEndTitle').onclick = toTitle;
  $('btnPause').onclick = () => setPause(true);
  const bomb = $('btnBomb');
  bomb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Input.setTouchUI(true); if (G.state === 'play' && !G.paused) useBomb(); });
  addEventListener('pointerdown', () => Snd.init(), { once: true });
  addEventListener('keydown', () => Snd.init(), { once: true });
  addEventListener('touchstart', e => { if (e.touches.length > 1 && G.state === 'play') e.preventDefault(); }, { passive: false });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play' && !G.paused) setPause(true); });
  addEventListener('keydown', e => {
    if (G.state === 'title' && (e.code === 'Space' || e.code === 'KeyZ')) { e.preventDefault(); startFromTitle(); }
    if (G.state === 'continue' && (e.code === 'Enter' || e.code === 'KeyZ' || e.code === 'Space')) { e.preventDefault(); doContinue(); }
  });
}

let last = 0;
function frame(ts) {
  const dt = Math.min(0.034, (ts - last) / 1000 || 0.016); last = ts;
  if (!window.__freeze) update(dt);
  if (G.state !== 'play' || G.paused) Snd.humAll(0);
  draw();
  if (G.state === 'play') $('bombN').textContent = G.bombs;
  Input.endFrame();
  requestAnimationFrame(frame);
}

Store.load();
Input.init(document.body);
if (matchMedia('(pointer: coarse)').matches) Input.setTouchUI(true);
bindUI();
addEventListener('resize', resize);
resize();
Bake.init(Math.min(3, Math.max(2, Math.ceil(RS))));
Terrain.reset(0);
refreshTitle(); showOv('title');
Music.play('title');
requestAnimationFrame(frame);
// 測試用
window.__sky = { G, P, STAGES, startStage, spawn: (...a) => spawn(...a), newGame: (...a) => newGame(...a), Bake, ET, step: (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) { update(dt); Input.endFrame(); } } };
