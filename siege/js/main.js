// 萬軍守城 — 選單、輸入、主迴圈
'use strict';

const $ = s => document.querySelector(s);
const UI = { mode: 'title', banner: 0, kb: 0, drag: null, fpsT: 0, fpsN: 0, toastT: 0, resultShown: false };

function show(id) {
  for (const el of document.querySelectorAll('.ov')) el.hidden = el.id !== id;
  const playing = id === null && G && !G.demo;
  $('#pauseBtn').hidden = !playing;
  $('#speedBtn').hidden = !playing;
  $('#dcard').hidden = !(playing && G.card);
  $('#giantBtn').hidden = !playing;
  if (playing) $('#giantBtn span').textContent = G.mode === 'clash' ? '衝鋒' : '大兵';
  syncSpeed();
}
// 遊戲速度
const SPEEDS = [0.5, 0.75, 1, 1.5, 2];
function syncSpeed() {
  const b = $('#speedBtn'); if (!b) return;
  const v = Save.d.speed || 1;
  b.textContent = (v === 0.75 ? '¾' : v === 0.5 ? '½' : v) + '×';
  b.classList.toggle('fast', v > 1); b.classList.toggle('slow', v < 1);
}
function cycleSpeed() {
  const i = SPEEDS.indexOf(Save.d.speed || 1);
  Save.d.speed = SPEEDS[(i + 1) % SPEEDS.length];
  Save.save(); syncSpeed();
  AU.sfx('click');
  toast(`遊戲速度 ${Save.d.speed}×`, 1);
}

function setCam(m) { if (R.camMode !== m) { R.camMode = m; resizeRender(); } }

// ---------- 標題畫面：砲台自己左右移動的展示 ----------
function demoGame() {
  setCam('defense');
  newDefense(1, {});
  G.demo = true; G.cardT = 1e9; G.castle = G.castleMax = 999; G.base.hp = G.base.max = 1e9;
}

// ---------- 大軍對決 ----------
function startClash(n) {
  AU.init();
  setCam('defense');
  newClash(n, { up: Save.d.up });
  UI.mode = 'play'; UI.banner = 0; UI.resultShown = false;
  show(null);
  AU.music(G.L.theme.bgm, false);
  Save.d.clast = n; Save.save();
  const el = $('#ruleBanner');
  el.querySelector('.rt').textContent = `大軍對決 ${n}`;
  el.querySelector('.rn').textContent = G.L.name;
  el.querySelector('.rd').textContent = (n === 1 ? '移動砲台把小兵送進兩邊走廊變多，再把紅軍的戰線推回去，推到敵方基地就贏！' : '') + (G.L.tip || '');
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  UI.ruleT = 3.4;
}
function nextClash() {
  for (let n = 1; n <= CSTAGES.length; n++) if (!Save.d.cstars[n]) return n;
  return Save.d.clast || CSTAGES.length;
}
function finishClash(win) {
  UI.mode = 'result';
  const d = Save.d, n = G.s;
  const kc = G.castle / G.castleMax;
  const st = win ? (kc >= 0.8 ? 3 : kc >= 0.45 ? 2 : 1) : 0;
  const prev = d.cstars[n] || 0;
  const coins = Math.round((win ? 40 + n * 12 + st * 12 + (prev === 0 ? 40 : 0) : 6 + n * 3) * coinK());
  if (win) d.cstars[n] = Math.max(prev, st);
  d.coins += coins; d.plays++; Save.save();
  AU.sfx(win ? 'win' : 'lose');
  const last = n >= CSTAGES.length;
  $('#resultBody').innerHTML = `<p class="eyebrow">大軍對決 ${n} · ${G.L.name}</p>
      <h2 class="big ${win ? 'ok' : 'bad'}">${win ? '紅軍被推回去了！' : '城被紅軍淹沒了'}</h2>
      ${win ? `<div class="stars">${[0, 1, 2].map(i => `<span class="st ${i < st ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.25}s">★</span>`).join('')}</div>` : ''}
      <div class="stats">
        <div><b>${Math.round(kc * 100)}%</b><span>城的血量</span></div>
        <div><b>${fmtNum(G.sent)}</b><span>射出小兵</span></div>
        <div><b>${fmtNum(G.kills)}</b><span>打倒紅軍</span></div>
        <div><b class="gold">+${coins}</b><span>金幣</span></div>
      </div>
      <p class="hint">${win ? (st < 3 ? '別讓紅軍碰到城牆，就能拿三顆星。' : '大獲全勝！') : '多走兩邊的走廊讓小兵變多；哪一路快被推到城牆，就趕快送人過去頂住。'}</p>
      <div class="row">
        ${win && !last ? '<button class="btn primary" data-act="next">下一關 →</button>' : `<button class="btn primary" data-act="retry">${win ? '再玩一次' : '再試一次'}</button>`}
        ${win && !last ? '<button class="btn" data-act="retry">再玩一次</button>' : ''}
        <button class="btn" data-act="shop">強化砲台</button>
        <button class="btn ghost" data-act="levels">選關</button>
      </div>`;
  show('result'); refreshCoins();
  if (win) for (let i = 0; i < st; i++) setTimeout(() => AU.sfx('star', i), 250 + i * 250);
}

// ---------- 開始一關 ----------
function startStage(n) {
  AU.init();
  setCam('defense');
  newDefense(n, { up: Save.d.up });
  UI.mode = 'play'; UI.banner = 0; UI.resultShown = false;
  show(null);
  AU.music(G.L.theme.bgm, false);
  Save.d.dlast = n; Save.save();
  const el = $('#ruleBanner');
  el.querySelector('.rt').textContent = `第 ${n} 關`;
  el.querySelector('.rn').textContent = G.L.name;
  el.querySelector('.rd').textContent = (n <= 2 ? '左右移動砲台，讓小兵穿過 ×2、+ 門變多，把敵方基地打爆！' : '') + (G.L.tip || '');
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  UI.ruleT = 2.8;
}
function featText(D) {
  return `${D.rows} 排門${D.slide ? '・會動' : ''}${D.roul ? '・轉盤' : ''}${D.red ? '・✕ 門' : ''}${D.wall ? '・牆' : ''}${D.bomb ? '・砲擊' : ''}${D.pow ? '・強化門' : ''}${D.gey ? '・火口' : ''}${D.gap ? '・斷橋' : ''}${D.wind ? '・強風' : ''}${D.bolt ? '・雷擊' : ''}`;
}
function buildLevels() {
  const box = $('#levelGrid');
  const clashRow = `<div class="themeRow"><h3>⚔️ 大軍對決</h3><div class="tiles">${CSTAGES.map((C, i) => {
    const n = i + 1, un = Save.cUnlocked(n), st = Save.d.cstars[n] || 0;
    return `<button class="tile t-${THEMES[C.theme].id}" data-clash="${n}" ${un ? '' : 'disabled'}>
      <span class="n">${un ? n : '🔒'}</span><span class="nm">${C.name}</span><span class="rl">推戰線${C.surge ? '・猛衝' : ''}${C.brute ? '・巨兵' : ''}${C.slide ? '・會動' : ''}${C.kill ? '・✕ 門' : ''}</span>
      <span class="ss">${[0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}">★</i>`).join('')}</span></button>`;
  }).join('')}</div></div>`;
  const groups = [];
  DSTAGES.forEach((D, i) => { const g = groups[groups.length - 1]; if (g && g.theme === D.theme) g.list.push(i + 1); else groups.push({ theme: D.theme, list: [i + 1] }); });
  box.innerHTML = clashRow + groups.map(gr => `<div class="themeRow"><h3>${THEMES[gr.theme].name}</h3><div class="tiles">${gr.list.map(n => {
    const D = DSTAGES[n - 1], un = Save.dUnlocked(n), st = Save.d.dstars[n] || 0;
    return `<button class="tile t-${THEMES[D.theme].id}" data-stage="${n}" ${un ? '' : 'disabled'}>
      <span class="n">${un ? n : '🔒'}</span><span class="nm">${D.name}</span><span class="rl">${featText(D)}</span>
      <span class="ss">${[0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}">★</i>`).join('')}</span></button>`;
  }).join('')}</div></div>`).join('');
  $('#starTotal').textContent = `★ ${totalStars()} / ${(DSTAGES.length + CSTAGES.length) * 3}`;
}
function totalStars() { return Object.values(Save.d.dstars).reduce((a, b) => a + b, 0) + Object.values(Save.d.cstars).reduce((a, b) => a + b, 0); }
function coinK() { return 1 + (Save.d.up.coin || 0) * 0.05; }

function finish(win) {
  if (UI.resultShown) return;
  UI.resultShown = true;
  if (G.mode === 'clash') return finishClash(win);
  UI.mode = 'result';
  const d = Save.d, n = G.s;
  const kc = G.castle / G.castleMax;
  const st = win ? (kc >= 0.8 ? 3 : kc >= 0.45 ? 2 : 1) : 0;
  const prev = d.dstars[n] || 0;
  const coins = Math.round((win ? 30 + n * 10 + st * 12 + (prev === 0 ? 30 : 0) : 5 + n * 2 + Math.floor(G.kills / 10)) * coinK());
  if (win) d.dstars[n] = Math.max(prev, st);
  d.coins += coins; d.plays++; Save.save();
  AU.sfx(win ? 'win' : 'lose');
  const last = n >= DSTAGES.length;
  $('#resultBody').innerHTML = `<p class="eyebrow">第 ${n} 關 · ${G.L.name}</p>
      <h2 class="big ${win ? 'ok' : 'bad'}">${win ? '基地攻破！' : '城被攻破了'}</h2>
      ${win ? `<div class="stars">${[0, 1, 2].map(i => `<span class="st ${i < st ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.25}s">★</span>`).join('')}</div>` : ''}
      <div class="stats">
        <div><b>${Math.round(kc * 100)}%</b><span>城的血量</span></div>
        <div><b>${G.sent}</b><span>射出小兵</span></div>
        <div><b>${G.kills}</b><span>打倒怪物</span></div>
        <div><b class="gold">+${coins}</b><span>金幣</span></div>
      </div>
      <p class="hint">${win ? (st < 3 ? '少讓怪物撞到城，就能拿三顆星。' : '完美守城！') : '先讓小兵穿過 ×2、×3 的門變多，怪物靠近時再移過去擋；也可以到「強化砲台」升級。'}</p>
      <div class="row">
        ${win && !last ? '<button class="btn primary" data-act="next">下一關 →</button>' : `<button class="btn primary" data-act="retry">${win ? '再玩一次' : '再試一次'}</button>`}
        ${win && !last ? '<button class="btn" data-act="retry">再玩一次</button>' : ''}
        <button class="btn" data-act="shop">強化砲台</button>
        <button class="btn ghost" data-act="levels">選關</button>
      </div>`;
  show('result'); refreshCoins();
  if (win) for (let i = 0; i < st; i++) setTimeout(() => AU.sfx('star', i), 250 + i * 250);
}

function toast(text, sec) {
  const el = $('#toast');
  el.textContent = text; el.hidden = false;
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  UI.toastT = sec || 2.5;
}
function tipOnce(key, text, sec) {
  if (Save.d.tips[key]) return;
  Save.d.tips[key] = 1; Save.save();
  toast(text, sec || 3.4);
}

// ---------- 遊戲事件 → 聲音、畫面 ----------
function handleEvents() {
  for (const [n, a] of G.q) {
    switch (n) {
      case 'kill': AU.sfx('kill'); break;
      case 'land': AU.sfx('land'); break;
      case 'wallbreak': AU.sfx('wallbreak'); vibrate(40); break;
      case 'bossdie': AU.sfx('bossdie'); AU.stop(); break;
      case 'lose': AU.sfx('lose'); AU.stop(); break;
      case 'dshot': AU.sfx('shot', 'rifle'); break;
      case 'dcard': showCards(a); break;
      case 'dpick': AU.sfx('gateWpn'); toast(DCARDS[a].ico + ' ' + DCARDS[a].name + '！', 1.4); break;
      case 'dbomb': AU.sfx('warn'); tipOnce('dbomb', '基地要砲擊了！紅圈裡的小兵會被炸掉，快移開', 3); break;
      case 'mult': AU.sfx('bump', 20); break;
      case 'castlehit': AU.sfx('hit'); vibrate(25); break;
      case 'basehit': if (a.giant) { AU.sfx('boom'); G.shake = Math.max(G.shake, 0.6); } else AU.sfx('kill'); break;
      case 'baserage': AU.sfx('rage'); toast('敵方基地生氣了！怪物變多了', 2.2); break;
      case 'giant': AU.sfx('gateWpn'); toast('金色大兵出動！', 1.4); break;
      case 'dboss': AU.sfx('boss'); toast('巨魔兵出現了！集中火力擋住它', 2.2); break;
      case 'geyser': AU.sfx('geyser'); break;
      case 'csurge': AU.sfx('warn'); tipOnce('csurge', '紅色箭頭那一路要猛衝了！快把小兵送過去頂住', 3); break;
      case 'cbrute': AU.sfx('boss'); G.shake = Math.max(G.shake, 0.4); tipOnce('cbrute', '紅軍巨兵！那一路會被壓下去，多送點人過去', 3); break;
      case 'charge': AU.sfx('gateWpn'); toast('⚡ 全軍衝鋒！', 1.4); vibrate(30); break;
      case 'cjoin': AU.sfx('bump', 30); break;
      case 'gustwarn': AU.sfx('warn'); tipOnce('dgust', '強風要來了！小兵會被吹歪，砲台要往反方向修正', 3); break;
      case 'gust': AU.sfx('gust'); break;
      case 'boltwarn': tipOnce('dbolt', '藍圈會被雷劈！小兵和怪物都會被劈到——把怪物引進去', 3); break;
      case 'zap': AU.sfx('zap'); G.shake = Math.max(G.shake, 0.25); break;
      case 'fall': AU.sfx('fall'); break;
      case 'enheal': AU.sfx('heal'); break;
    }
  }
  G.q.length = 0;
}
function vibrate(ms) { try { if (navigator.vibrate && Save.d.sfx) navigator.vibrate(ms); } catch (e) { } }

// 教學提示（每個只出現一次）
function tips() {
  if (G.mode === 'clash') {
    if (G.t > 0.5 && G.t < 1) tipOnce('cmove', '把砲台移到兩邊的走廊：小兵穿過一整排門會變超多！', 3.6);
    if (G.t > 9 && G.t < 9.5) tipOnce('cfront', '紅軍推到哪，走廊的門就只拿得到哪；把戰線往上推，後面的門才會亮起來', 4);
    if (G.giant >= G.giantMax) tipOnce('ccharge', '能量滿了！按右下角的「衝鋒」，全軍 5 秒變兩倍強', 3);
    if (G.L.C.kill && G.t > 3) tipOnce('ckill', '走廊裡的 ✕ 門一開一關，關著的時候走進去會整隊消失', 3.4);
    return;
  }
  if (G.t > 0.5 && G.t < 1) tipOnce('dmove', '左右拖曳砲台：讓小兵穿過 ×2、+ 的門會變多！', 3.4);
  if (G.giant >= G.giantMax) tipOnce('dgiant', '能量滿了！按右下角的「大兵」放出金色大兵', 3);
  for (const o of G.objs) if (o.t === 'en' && o.z < 14) { tipOnce('denemy', '怪物快到城了！把砲台移過去擋住它', 3); break; }
  for (const o of G.objs) {
    if (o.t === 'gate' && o.k === 'pow') { tipOnce('dpow', '黃色的強化門：人數不變，但穿過的小兵會變成兩倍強！', 3.4); break; }
    if (o.t === 'gate' && o.roul) { tipOnce('droul', '轉盤門的數字會一直換，下面有寫下一個是什麼', 3.2); break; }
    if (o.t === 'en' && o.k === 'eagle') { tipOnce('deagle', '疾風鷹飛很快！砲台的機槍會優先打會飛的怪', 3); break; }
    if (o.t === 'dgap') { tipOnce('dgap', '雲海上只有木板橋，小兵沒走在橋上會掉下去', 3.2); break; }
    if (o.t === 'dwall') { tipOnce('dwall', '中間有一道牆，要打破才能過去', 3); break; }
    if (o.t === 'geyser' && o.warn) { tipOnce('dgey', '火口冒煙就要噴火了，小兵和怪物經過都會被燒掉', 3.2); break; }
  }
}

// ---------- 選單 ----------
function refreshCoins() { for (const el of document.querySelectorAll('.coins b')) el.textContent = Save.d.coins; }

function buildShop() {
  const box = $('#shopList');
  box.innerHTML = UPGRADES.map(u => {
    const lv = Save.d.up[u.id], max = lv >= u.max, cost = u.cost(lv);
    return `<div class="upg">
      <div class="info"><b>${u.name}</b><span>${lv ? u.desc(lv) : '還沒升級'}${max ? '' : ` → <em>${u.desc(lv + 1)}</em>`}</span>
        <div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>
      <button class="btn buy" data-up="${u.id}" ${max || Save.d.coins < cost ? 'disabled' : ''}>${max ? '已滿級' : `🪙 ${cost}`}</button>
    </div>`;
  }).join('');
  refreshCoins();
}

function syncToggles() {
  for (const el of document.querySelectorAll('[data-toggle]')) {
    const k = el.dataset.toggle;
    el.classList.toggle('off', !Save.d[k]);
    el.textContent = (k === 'music' ? '🎵 音樂 ' : '🔊 音效 ') + (Save.d[k] ? '開' : '關');
  }
}

function nextStage() {
  for (let n = 1; n <= DSTAGES.length; n++) if (!Save.d.dstars[n]) return n;
  return Save.d.dlast || DSTAGES.length;
}
function goTitle() {
  UI.mode = 'title';
  demoGame();
  AU.stop();
  const next = nextStage();
  $('#startBtn').textContent = next === 1 && !Save.d.dstars[1] ? '開始遊戲' : `繼續：第 ${next} 關`;
  const ts = totalStars();
  $('#starInfo').textContent = `★ ${ts} / ${(DSTAGES.length + CSTAGES.length) * 3}`;
  const cs = Object.values(Save.d.cstars).reduce((a, b) => a + b, 0);
  $('#clashInfo').textContent = cs ? `第 ${nextClash()} 關 · ★ ${cs} / ${CSTAGES.length * 3}` : '新玩法：推戰線';
  refreshCoins();
  show('title');
}
function toMenu(id, build) {
  if (build) build();
  if (!G || !G.demo) demoGame();
  UI.mode = 'title'; AU.stop(); if (AU.ctx) AU.ctx.resume();
  show(id);
}

// 強化卡
function showCards(ks) {
  const box = $('#dcard'), list = box.querySelector('.dcs');
  list.innerHTML = ks.map((k, i) => `<button data-card="${k}"><i>${DCARDS[k].ico}</i><b>${DCARDS[k].name}</b><span>${DCARDS[k].desc}</span><kbd>${i + 1}</kbd></button>`).join('');
  box.hidden = false;
  AU.sfx('gateGood');
}
function pickCard(k) {
  if (!G || !G.card || UI.mode !== 'play') return;
  if (defPickCard(k)) $('#dcard').hidden = true;
}
function pause() {
  if (UI.mode !== 'play') return;
  UI.mode = 'pause';
  syncToggles();
  show('pause');
  $('#dcard').hidden = true;
  if (AU.ctx) AU.ctx.suspend();
}
function resume() {
  if (UI.mode !== 'pause') return;
  UI.mode = 'play';
  show(null);
  if (AU.ctx) AU.ctx.resume();
  UI.last = performance.now();
}

function onAct(act) {
  AU.init(); AU.sfx('click');
  if (AU.ctx && AU.ctx.state === 'suspended' && act !== 'pause') AU.ctx.resume();
  switch (act) {
    case 'start': startStage(nextStage()); break;
    case 'clash': startClash(nextClash()); break;
    case 'levels': toMenu('levels', buildLevels); break;
    case 'shop': toMenu('shop', buildShop); break;
    case 'help': show('help'); break;
    case 'title': case 'quit': goTitle(); if (AU.ctx) AU.ctx.resume(); break;
    case 'resume': resume(); break;
    case 'restart': case 'retry': if (G && G.mode === 'clash') startClash(G.s); else startStage(G && !G.demo ? G.s : (Save.d.dlast || 1)); break;
    case 'next': if (G && G.mode === 'clash') startClash(Math.min(CSTAGES.length, G.s + 1)); else startStage(Math.min(DSTAGES.length, G.s + 1)); break;
  }
}

// ---------- 輸入 ----------
function setupInput() {
  const cv = R.cv;
  cv.addEventListener('pointerdown', e => {
    AU.init();
    if (UI.mode !== 'play') return;
    UI.drag = { id: e.pointerId, x: e.clientX, tx: G.tx };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { }
  });
  cv.addEventListener('pointermove', e => {
    const d = UI.drag;
    if (!d || d.id !== e.pointerId || UI.mode !== 'play') return;
    const k = R.k0 * 0.85 / R.dpr; // 每公尺幾個 CSS 像素
    G.tx = clamp(d.tx + (e.clientX - d.x) / k, -PX_MAX, PX_MAX);
  });
  const end = e => { if (UI.drag && UI.drag.id === e.pointerId) UI.drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  $('#dcard').addEventListener('click', e => { const b = e.target.closest('[data-card]'); if (b) { e.stopPropagation(); pickCard(b.dataset.card); } });
  $('#dcard').addEventListener('pointerdown', e => e.stopPropagation());
  addEventListener('keydown', e => {
    if (G && G.card && UI.mode === 'play' && e.key >= '1' && e.key <= '3') { const k = G.card[+e.key - 1]; if (k) { e.preventDefault(); pickCard(k); return; } }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { UI.kbL = 1; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { UI.kbR = 1; e.preventDefault(); }
    else if ((e.key === ' ' || e.key === 'g' || e.key === 'G') && UI.mode === 'play') { e.preventDefault(); if (G.mode === 'clash') clLaunchCharge(); else defLaunchGiant(); }
    else if ((e.key === 'f' || e.key === 'F') && UI.mode === 'play') cycleSpeed();
    else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (UI.mode === 'play') pause(); else if (UI.mode === 'pause') resume(); }
    else if (e.key === 'Enter') {
      const vis = document.querySelector('.ov:not([hidden]) .btn.primary');
      if (vis && document.activeElement === document.body) { e.preventDefault(); vis.click(); }
    }
  });
  addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') UI.kbL = 0;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') UI.kbR = 0;
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (b) { onAct(b.dataset.act); return; }
    const t = e.target.closest('[data-stage]');
    if (t && !t.disabled) { startStage(+t.dataset.stage); return; }
    const tc = e.target.closest('[data-clash]');
    if (tc && !tc.disabled) { startClash(+tc.dataset.clash); return; }
    const u = e.target.closest('[data-up]');
    if (u && !u.disabled) {
      const U = UPGRADES.find(x => x.id === u.dataset.up);
      const lv = Save.d.up[U.id], cost = U.cost(lv);
      if (lv < U.max && Save.d.coins >= cost) { Save.d.coins -= cost; Save.d.up[U.id]++; Save.save(); AU.init(); AU.sfx('buy'); buildShop(); }
      return;
    }
    const tg = e.target.closest('[data-toggle]');
    if (tg) { const k = tg.dataset.toggle; Save.d[k] = !Save.d[k]; Save.save(); AU.init(); AU.set(k, Save.d[k]); syncToggles(); }
  });
  $('#pauseBtn').addEventListener('click', e => { e.stopPropagation(); pause(); });
  $('#speedBtn').addEventListener('click', e => { e.stopPropagation(); cycleSpeed(); });
  $('#giantBtn').addEventListener('click', e => { e.stopPropagation(); if (UI.mode === 'play' && !(G.mode === 'clash' ? clLaunchCharge() : defLaunchGiant())) AU.sfx('click'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('resize', () => { UI.pendResize = true; });
}

function gamepadX() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p) { const x = p.axes[0] || 0; const dl = p.buttons[14] && p.buttons[14].pressed, dr = p.buttons[15] && p.buttons[15].pressed; return Math.abs(x) > 0.2 ? x : dl ? -1 : dr ? 1 : 0; }
  return 0;
}

// ---------- 主迴圈 ----------
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(1 / 30, Math.max(0, (now - (UI.last || now)) / 1000));
  UI.last = now;
  AU.tick();
  // 第一次開：在主選單顯示 3D 模型的進度（玩的時候不顯示、也不烤）
  if (now - (UI.bakeT || 0) > 400) {
    UI.bakeT = now;
    const tip = $('#bakeTip'), on = Bake.baking && Bake.total > 0 && !$('#title').hidden;
    if (tip.hidden !== !on) tip.hidden = !on;
    if (on) tip.textContent = `立體模型準備中 ${Math.round(100 * Bake.done / Bake.total)}%（只有第一次）`;
  }
  if (UI.toastT > 0) { UI.toastT -= dt; if (UI.toastT <= 0) $('#toast').hidden = true; }
  if (UI.ruleT > 0) { UI.ruleT -= dt; if (UI.ruleT <= 0 || UI.mode !== 'play') { UI.ruleT = 0; $('#ruleBanner').hidden = true; } }
  if (!G) return;
  if (UI.mode === 'play') {
    const ax = (UI.kbR || 0) - (UI.kbL || 0) + gamepadX();
    if (ax) G.tx = clamp(G.tx + ax * 9 * dt, -PX_MAX, PX_MAX);
    // 依設定的速度推進（快的時候切成小步）
    let rem = dt * (Save.d.speed || 1);
    for (let k = 0; k < 6 && rem > 1e-5; k++) {
      const d = Math.min(rem, 1 / 60);
      if (G.mode === 'clash') clashStep(d, null); else defStep(d, null);
      rem -= d;
      if (G.st === 'win' || G.st === 'lost') break;
    }
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.5);
    handleEvents();
    tips();
    if (G.st === 'win') finish(true);
    else if (G.st === 'lost') finish(false);
  } else if (UI.mode === 'title' && G.demo) {
    // 展示：砲台自己左右擋怪
    G.tx = Math.sin(now / 1700) * 2.6;
    defStep(dt, null);
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.5);
    G.q.length = 0;
    if (G.t > 60) demoGame();
  } else if (UI.mode === 'result') {
    if (G.mode === 'clash') clashStep(dt, null); else defStep(dt, null);
    G.q.length = 0;
  }
  if (UI.pendResize) { UI.pendResize = false; resizeRender(); }
  if (G.mode === 'clash') { renderClash(G, now / 1000); if (UI.mode === 'play' || UI.mode === 'pause') drawClashHud(G); }
  else { renderDef(G, now / 1000); if (UI.mode === 'play' || UI.mode === 'pause') drawDefHud(G); }
  const gb = $('#giantBtn');
  if (!gb.hidden) { const p = Math.round(100 * G.giant / G.giantMax); gb.style.setProperty('--p', p); gb.classList.toggle('ready', p >= 100); }
  autoQuality(dt);
}

// 畫面太慢就先關地面質感，再降解析度。
// 只在畫之前改尺寸（改畫布大小會清空畫面，畫完才改會閃一下），
// 而且要連續好幾次都很順才會調回來，避免一直上上下下。
function autoQuality(dt) {
  if (UI.mode !== 'play') { UI.fpsT = 0; UI.fpsN = 0; return; }
  UI.fpsT += dt; UI.fpsN++;
  if (UI.fpsT < 3) return;
  const fps = UI.fpsN / UI.fpsT;
  UI.fpsT = 0; UI.fpsN = 0;
  UI.slowN = fps < 42 ? (UI.slowN || 0) + 1 : 0;
  UI.fastN = fps > 57 ? (UI.fastN || 0) + 1 : 0;
  if (fps < 50 && !R.noTex) { R.noTex = true; UI.slowN = 0; }
  else if (UI.slowN >= 2 && R.q > 0.55) { R.q = Math.max(0.55, R.q - 0.15); UI.slowN = 0; UI.drops = (UI.drops || 0) + 1; UI.pendResize = true; }
  else if (UI.fastN >= 5 && R.q < 1 && (UI.drops || 0) < 2) { R.q = Math.min(1, R.q + 0.15); UI.fastN = 0; UI.pendResize = true; }
}

function boot() {
  Save.load();
  AU.on.sfx = Save.d.sfx; AU.on.music = Save.d.music;
  R.cv = $('#cv'); R.g = R.cv.getContext('2d');
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;height:env(safe-area-inset-top,0px);width:1px;visibility:hidden';
  document.body.appendChild(probe);
  R.safeTop = probe.offsetHeight || 0;
  probe.remove();
  resizeRender();
  buildArt();
  setupInput();
  syncToggles();
  goTitle();
  if (Save.d.migrated && !Save.d.tips.migrated) { Save.d.tips.migrated = 1; Save.save(); toast(`守城搬家了！帶來 ★ ${Save.d.migrated} 顆星，送你 ${Save.d.migrated * 40} 金幣`, 4); }
  requestAnimationFrame(frame);
  // 3D 模型在背景慢慢烤，烤好就換上
  setTimeout(() => Bake.init(), 60);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { R.bgKey = ''; });
  window.__siege = { get G() { return G; }, UI, R, Save, startStage, startClash, finish, Bake };
}
boot();
