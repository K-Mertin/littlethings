// 千軍突圍 — 選單、輸入、主迴圈
'use strict';

const $ = s => document.querySelector(s);
const UI = { mode: 'title', banner: 0, kb: 0, drag: null, fpsT: 0, fpsN: 0, toastT: 0, resultShown: false };

function show(id) {
  for (const el of document.querySelectorAll('.ov')) el.hidden = el.id !== id;
  $('#pauseBtn').hidden = id !== null;
}

// ---------- 標題畫面的展示部隊 ----------
function demoGame() {
  newGame(1, {});
  G.L = Object.assign({}, G.L, { ev: [], theme: THEMES[0] });
  G.N = 36; G.peak = 36;
  syncSoldiers(true);
  G.demo = true;
}

// ---------- 開始一關 ----------
function startStage(s) {
  AU.init();
  newGame(s, { up: Save.d.up });
  G.badgeBump = 0; G.badgeRed = 0;
  UI.mode = 'play'; UI.banner = 0; UI.resultShown = false;
  show(null);
  AU.music(G.L.theme.bgm, false);
  Save.d.last = s; Save.save();
  if (s === 1 && !Save.d.tips.move) toast('左右拖曳（或按 ← →），帶部隊穿過好的門！', 3.2);
  showRule(G.rule, `第 ${s} 關 · ${G.L.name}`);
}

// 關卡開始時的規則看板
function showRule(rule, title) {
  const r = RULES[rule];
  const el = $('#ruleBanner');
  if (!r || !el) return;
  el.querySelector('.rt').textContent = title;
  el.querySelector('.rn').textContent = r.name;
  el.querySelector('.rd').textContent = r.desc;
  el.hidden = false;
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  UI.ruleT = 2.8;
}

// 無盡模式／每日挑戰
function startMode(mode) {
  AU.init();
  const seed = mode === 'daily' ? todayKey() : (Date.now() % 100000) + 1;
  newGame(1, { mode, seed, up: Save.d.up });
  G.badgeBump = 0; G.badgeRed = 0;
  UI.mode = 'play'; UI.banner = 0; UI.resultShown = false;
  show(null);
  AU.music(G.L.theme.bgm, false);
  showRule(G.rule, mode === 'daily' ? `每日挑戰 · ${String(G.L.daily).replace(/(\d{4})(\d\d)(\d\d)/, '$1/$2/$3')}` : '無盡模式 · 第 1 段');
  if (mode === 'daily') toast('每日挑戰不使用強化，大家的條件都一樣', 2.6);
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
      case 'shot': AU.sfx('shot', a.wid); break;
      case 'gate':
        if (a.g.k === 'wpn' || a.g.k === 'lv') AU.sfx('gateWpn'); else AU.sfx(a.good ? 'gateGood' : 'gateBad');
        if (!a.good) { G.flash = 0.5; vibrate(30); }
        break;
      case 'gatebump': AU.sfx('bump', Math.abs(a.v)); break;
      case 'gateflip': AU.sfx('flip'); floatText(a.x, a.z, 3.1, '轉正！', '#7fd8ff', 0.8); break;
      case 'kill': AU.sfx('kill'); break;
      case 'hit': AU.sfx('hit'); vibrate(15); break;
      case 'boom': AU.sfx('boom'); vibrate(40); break;
      case 'rocket': AU.sfx('rocket'); break;
      case 'boss': AU.sfx('boss'); AU.music(G.L.theme.bgm, true); UI.banner = 2.2; break;
      case 'slam': AU.sfx('slam'); G.flash = 0.7; vibrate(50); break;
      case 'rage': AU.sfx('rage'); toast(BOSSES[a.k].name + '狂暴了！還叫來幫手！', 2); break;
      case 'bossdie': AU.sfx('bossdie'); AU.stop(); break;
      case 'lose': AU.sfx('lose'); AU.stop(); break;
      case 'count': if (a.d > 0) G.badgeBump = 1; else G.badgeRed = 0.35; break;
      case 'throw': AU.sfx('throw'); break;
      case 'land': AU.sfx('land'); break;
      case 'split': AU.sfx('split'); break;
      case 'wallbreak': AU.sfx('wallbreak'); vibrate(40); break;
      case 'wallhit': AU.sfx('slam'); G.flash = 0.7; vibrate(60); break;
      case 'crate': AU.sfx('crate'); break;
      case 'saw': AU.sfx('saw'); G.flash = 0.35; vibrate(15); break;
      case 'spike': AU.sfx('spike'); G.flash = 0.5; vibrate(30); break;
      case 'roul': if (a.z < 30) AU.sfx('tick'); break;
      case 'miss': AU.sfx('gateBad'); break;
      case 'strikewarn': AU.sfx('warn'); break;
      case 'strike': AU.sfx('slam'); vibrate(60); break;
      case 'legclear': toast(`打倒頭目！第 ${a.leg} 段完成`, 1.6); break;
      case 'legtheme': AU.music(G.L.theme.bgm, false); showRule(G.rule, `無盡模式 · 第 ${G.leg + 1} 段 · ${G.L.theme.name}`); break;
    }
  }
  G.q.length = 0;
}
function vibrate(ms) { try { if (navigator.vibrate && Save.d.sfx) navigator.vibrate(ms); } catch (e) { } }

// 第一關的教學提示
function tutorial() {
  for (const o of G.objs) {
    if (o.t === 'lob' && o.z < 30) tipOnce('lob', '地上的紅圈是炸彈要掉下來的地方，快閃開！', 3);
    else if (o.t === 'crate' && o.z < 40) tipOnce('crate', '補給箱：對著它開槍，打開就拿到上面的獎勵', 3);
    else if (o.t === 'wall' && o.z < 45) tipOnce('wall', '把牆打破才拿得到獎勵；沒打破撞上去會少兵', 3.2);
    else if (o.t === 'saw' && o.z < 40) tipOnce('saw', '旋轉刀鋸打不壞，從旁邊閃過去', 3);
    else if (o.t === 'spike' && o.z < 40) tipOnce('spike', '尖刺會一下升起一下降下，趁降下去的時候通過', 3.2);
    else if (o.t === 'gate' && o.slide && o.z < 45) tipOnce('slide', '這扇門會左右移動，只有對準它才拿得到', 3);
    else if (o.t === 'gate' && o.roul && o.z < 45) tipOnce('roul', '轉盤門的數字會一直換，下面有寫下一個是什麼', 3.2);
    else if (o.t === 'en' && o.k === 'thrower' && o.z < 30) tipOnce('thrower', '丟丟鬼會停在前面丟炸彈，先移過去打倒它', 3);
    else if (o.t === 'en' && o.k === 'splitter' && o.z < 30) tipOnce('splitter', '史萊姆打倒後會分裂成三隻小的', 3);
    else if (o.t === 'boss' && o.strike) tipOnce('strike', '頭目要重擊了！快離開紅色長條', 2.5);
  }
  if (G.s !== 1 && G.s !== 2) return;
  for (const o of G.objs) {
    if (o.t === 'gate' && o.z < 46 && !o.pair.used) {
      if (o.k === 'add' && o.v < 0) tipOnce('red', '紅色的門會讓部隊變少！對著門開槍，數字會慢慢變大', 3.6);
      else if (o.k === 'add') tipOnce('blue', '藍色的門加兵力。對著門開槍，數字會變大！', 3.2);
      if (o.k === 'mul') tipOnce('mul', '×2 和 +多少，哪個比較多？快算一算！', 3.2);
      if (o.k === 'wpn') tipOnce('wpn', '黃色的門可以換武器，綠色的門讓火力升級', 3.2);
    }
    if (o.t === 'en' && o.z < 40) tipOnce('enemy', '士兵只往正前方開槍：把部隊移到怪物前面打！撞到會少兵', 3.4);
    if (o.t === 'bar' && o.z < 40) tipOnce('barrel', '打爆油桶，旁邊的怪物一起炸飛！', 3);
  }
  if (G.t > 3) Save.d.tips.move = 1;
}

// ---------- 結束 ----------
function resultRow(primary) {
  return `<div class="row">
        <button class="btn primary" data-act="retry">${primary}</button>
        <button class="btn" data-act="shop">強化部隊</button>
        <button class="btn ghost" data-act="title">回標題</button>
      </div>`;
}
function finishEndless() {
  const d = Save.d, dist = Math.floor(G.dist);
  const prev = d.endBest || 0, rec = dist > prev;
  if (rec) d.endBest = dist;
  d.endLegs = Math.max(d.endLegs || 0, G.leg);
  const coins = Math.floor(dist / 15) + G.leg * 20 + Math.floor(G.kills / 10);
  d.coins += coins; d.plays++; Save.save();
  AU.sfx(rec ? 'win' : 'lose');
  $('#resultBody').innerHTML = `<p class="eyebrow">無盡模式</p>
      <h2 class="big ${rec ? 'ok' : 'bad'}">${rec ? '新紀錄！' : '部隊全滅'}</h2>
      <div class="bigNum"><b>${dist}</b> 公尺</div>
      <div class="stats">
        <div><b>${G.leg}</b><span>打倒頭目</span></div>
        <div><b>${G.peak}</b><span>最多兵力</span></div>
        <div><b>${G.kills}</b><span>打倒怪物</span></div>
        <div><b class="gold">+${coins}</b><span>金幣</span></div>
      </div>
      <p class="hint">${rec ? '比上次跑得更遠了！' : `最遠紀錄：${prev} 公尺`}</p>
      ${resultRow('再跑一次')}`;
  show('result'); refreshCoins();
}
function finishDaily(win) {
  const d = Save.d, key = G.L.daily;
  if (!d.daily || d.daily.key !== key) d.daily = { key, best: 0, stars: 0, tries: 0, paid: false };
  const r = d.daily;
  r.tries++;
  const st = win ? starsOf() : 0, score = win ? G.N : 0;
  const rec = win && score > r.best;
  if (win) { r.best = Math.max(r.best, score); r.stars = Math.max(r.stars, st); }
  let coins = 5 + Math.floor(G.kills / 8);
  if (win && !r.paid) { coins += 80 + st * 20; r.paid = true; }
  d.coins += coins; d.plays++; Save.save();
  AU.sfx(win ? 'win' : 'lose');
  $('#resultBody').innerHTML = `<p class="eyebrow">每日挑戰 · ${String(key).replace(/(\d{4})(\d\d)(\d\d)/, '$1/$2/$3')} · ${RULES[G.rule].name}</p>
      <h2 class="big ${win ? 'ok' : 'bad'}">${win ? (rec ? '今日新紀錄！' : '挑戰成功！') : '部隊全滅'}</h2>
      ${win ? `<div class="stars">${[0, 1, 2].map(i => `<span class="st ${i < st ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.25}s">★</span>`).join('')}</div>` : ''}
      <div class="stats">
        <div><b>${win ? G.N : Math.round(clamp(G.dist / G.L.len, 0, 1) * 100) + '%'}</b><span>${win ? '存活士兵' : '前進距離'}</span></div>
        <div><b>${r.best}</b><span>今天最佳</span></div>
        <div><b>${r.tries}</b><span>挑戰次數</span></div>
        <div><b class="gold">+${coins}</b><span>金幣</span></div>
      </div>
      <p class="hint">${win ? '存活的士兵越多分數越高。明天會換一關新的。' : '每日挑戰不使用強化，多試幾次找出最好的選門路線。'}</p>
      ${resultRow(win ? '再挑戰一次' : '再試一次')}`;
  show('result'); refreshCoins();
}

function starsOf() { return G.N >= G.peak * 0.75 ? 3 : G.N >= G.peak * 0.45 ? 2 : 1; }
function finish(win) {
  if (UI.resultShown) return;
  UI.resultShown = true;
  UI.mode = 'result';
  const s = G.s, d = Save.d;
  let html = '';
  if (G.mode === 'endless') return finishEndless();
  if (G.mode === 'daily') return finishDaily(win);
  if (win) {
    const st = starsOf();
    const prev = d.stars[s] || 0;
    const coins = 25 + s * 8 + st * 12 + Math.min(80, Math.floor(G.N / 15)) + (prev === 0 ? 30 : 0);
    d.stars[s] = Math.max(prev, st);
    d.coins += coins; d.plays++;
    d.best[s] = Math.max(d.best[s] || 0, G.N);
    Save.save();
    AU.sfx('win');
    html = `<p class="eyebrow">第 ${s} 關 · ${G.L.name}</p>
      <h2 class="big ok">突圍成功！</h2>
      <div class="stars">${[0, 1, 2].map(i => `<span class="st ${i < st ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.25}s">★</span>`).join('')}</div>
      <div class="stats">
        <div><b>${G.N}</b><span>存活士兵</span></div>
        <div><b>${G.peak}</b><span>最多兵力</span></div>
        <div><b>${G.kills}</b><span>打倒怪物</span></div>
        <div><b class="gold">+${coins}</b><span>金幣</span></div>
      </div>
      <p class="hint">${st < 3 ? '更快打倒頭目、少被撞到，就能拿到三顆星。' : '完美！部隊幾乎沒有損失。'}</p>
      <div class="row">
        ${s < STAGES.length ? '<button class="btn primary" data-act="next">下一關 →</button>' : '<button class="btn primary" data-act="levels">全部破關！選關卡</button>'}
        <button class="btn" data-act="retry">再玩一次</button>
        <button class="btn" data-act="shop">強化部隊</button>
        <button class="btn ghost" data-act="levels">選關</button>
      </div>`;
  } else {
    const coins = 5 + s * 2 + Math.floor(G.kills / 8);
    d.coins += coins; d.plays++; Save.save();
    const tips = [
      '看清楚門上的數字：×2 不一定比 +30 多，要看你現在有幾個人。',
      '對著藍色的門開槍，數字會變大；紅色的門打到 0 以上也會轉正。',
      '先閃開前面一大群怪，再選門也來得及。',
      '油桶打爆可以一次炸掉一群怪物。',
      '到「強化部隊」用金幣升級起始兵力和火力，會好打很多。',
    ];
    html = `<p class="eyebrow">第 ${s} 關 · ${G.L.name}</p>
      <h2 class="big bad">部隊全滅</h2>
      <div class="stats">
        <div><b>${Math.round(clamp(G.dist / G.L.len, 0, 1) * 100)}%</b><span>前進距離</span></div>
        <div><b>${G.peak}</b><span>最多兵力</span></div>
        <div><b>${G.kills}</b><span>打倒怪物</span></div>
        <div><b class="gold">+${coins}</b><span>金幣</span></div>
      </div>
      <p class="hint">💡 ${tips[(d.plays + s) % tips.length]}</p>
      <div class="row">
        <button class="btn primary" data-act="retry">再試一次</button>
        <button class="btn" data-act="shop">強化部隊</button>
        <button class="btn ghost" data-act="levels">選關</button>
      </div>`;
  }
  $('#resultBody').innerHTML = html;
  show('result');
  if (win) setTimeout(() => { for (let i = 0; i < starsOf(); i++) setTimeout(() => AU.sfx('star', i), 250 + i * 250); }, 0);
  refreshCoins();
}

// ---------- 選單 ----------
function refreshCoins() { for (const el of document.querySelectorAll('.coins b')) el.textContent = Save.d.coins; }

function buildLevels() {
  const box = $('#levelGrid');
  let html = '';
  THEMES.forEach((th, ti) => {
    html += `<div class="themeRow"><h3>${th.name}</h3><div class="tiles">`;
    for (let k = 0; k < 3; k++) {
      const s = ti * 3 + k + 1;
      const un = Save.unlocked(s), st = Save.d.stars[s] || 0;
      html += `<button class="tile t-${th.id}" data-stage="${s}" ${un ? '' : 'disabled'}>
        <span class="n">${un ? s : '🔒'}</span><span class="nm">${STAGES[s - 1].name}</span><span class="rl">${RULES[STAGES[s - 1].rule].name}</span>
        <span class="ss">${[0, 1, 2].map(i => `<i class="${i < st ? 'on' : ''}">★</i>`).join('')}</span>
        ${k === 2 ? `<span class="bossTag">頭目 ${BOSSES[STAGES[s - 1].boss].name}</span>` : ''}</button>`;
    }
    html += '</div></div>';
  });
  box.innerHTML = html;
  const total = Object.values(Save.d.stars).reduce((a, b) => a + b, 0);
  $('#starTotal').textContent = `★ ${total} / ${STAGES.length * 3}`;
}

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

function goTitle() {
  UI.mode = 'title';
  demoGame();
  AU.stop();
  const next = nextStage();
  $('#startBtn').textContent = next === 1 && !Save.d.stars[1] ? '開始遊戲' : `繼續：第 ${next} 關`;
  $('#endInfo').textContent = Save.d.endBest ? `最遠 ${Save.d.endBest} 公尺` : '一直跑到全滅';
  const dd = Save.d.daily;
  $('#dailyInfo').textContent = dd && dd.key === todayKey() && dd.best ? `今天最佳 ${dd.best} 人` : '今天還沒挑戰';
  refreshCoins();
  show('title');
}
function nextStage() {
  for (let s = 1; s <= STAGES.length; s++) if (!Save.d.stars[s]) return s;
  return Save.d.last || STAGES.length;
}

function pause() {
  if (UI.mode !== 'play') return;
  UI.mode = 'pause';
  syncToggles();
  show('pause');
  if (AU.ctx) AU.ctx.suspend();
}
function resume() {
  if (UI.mode !== 'pause') return;
  UI.mode = 'play';
  show(null);
  if (AU.ctx) AU.ctx.resume();
  UI.last = performance.now();
}

function onAct(act, el) {
  AU.init(); AU.sfx('click');
  if (AU.ctx && AU.ctx.state === 'suspended' && act !== 'pause') AU.ctx.resume();
  switch (act) {
    case 'start': startStage(nextStage()); break;
    case 'levels': buildLevels(); if (!G || !G.demo) demoGame(); UI.mode = 'title'; AU.stop(); if (AU.ctx) AU.ctx.resume(); show('levels'); break;
    case 'shop': buildShop(); if (!G || !G.demo) demoGame(); UI.mode = 'title'; AU.stop(); if (AU.ctx) AU.ctx.resume(); show('shop'); break;
    case 'help': show('help'); break;
    case 'title': goTitle(); if (AU.ctx) AU.ctx.resume(); break;
    case 'resume': resume(); break;
    case 'restart': case 'retry':
      if (G && !G.demo && G.mode !== 'stage') startMode(G.mode);
      else startStage(G.s && !G.demo ? G.s : (Save.d.last || 1));
      break;
    case 'endless': startMode('endless'); break;
    case 'daily': startMode('daily'); break;
    case 'next': startStage(Math.min(STAGES.length, G.s + 1)); break;
    case 'quit': goTitle(); if (AU.ctx) AU.ctx.resume(); break;
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
    const k = R.k0 * 0.65 / R.dpr; // 每公尺幾個 CSS 像素（考慮鏡頭跟隨）
    G.tx = clamp(d.tx + (e.clientX - d.x) / k, -PX_MAX, PX_MAX);
  });
  const end = e => { if (UI.drag && UI.drag.id === e.pointerId) UI.drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { UI.kbL = 1; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { UI.kbR = 1; e.preventDefault(); }
    else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (UI.mode === 'play') pause(); else if (UI.mode === 'pause') resume(); }
    else if (e.key === 'Enter' || e.key === ' ') {
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
    if (b) { onAct(b.dataset.act, b); return; }
    const t = e.target.closest('[data-stage]');
    if (t && !t.disabled) { startStage(+t.dataset.stage); return; }
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('resize', () => resizeRender());
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
  if (UI.toastT > 0) { UI.toastT -= dt; if (UI.toastT <= 0) $('#toast').hidden = true; }
  if (UI.ruleT > 0) { UI.ruleT -= dt; if (UI.ruleT <= 0 || UI.mode !== 'play') { UI.ruleT = 0; $('#ruleBanner').hidden = true; } }
  if (!G) return;
  if (UI.mode === 'play') {
    const ax = (UI.kbR || 0) - (UI.kbL || 0) + gamepadX();
    if (ax) G.tx = clamp(G.tx + ax * 9 * dt, -PX_MAX, PX_MAX);
    step(dt, null);
    if (G.badgeBump > 0) G.badgeBump = Math.max(0, G.badgeBump - dt * 4);
    if (G.badgeRed > 0) G.badgeRed -= dt;
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.5);
    if (G.themeFade > 0) G.themeFade = Math.max(0, G.themeFade - dt * 1.2);
    if (UI.banner > 0) UI.banner -= dt;
    handleEvents();
    tutorial();
    if (G.st === 'win') finish(true);
    else if (G.st === 'lost') finish(false);
  } else if (UI.mode === 'title' && G.demo) {
    G.tx = Math.sin(now / 1600) * 2.2;
    step(dt, null);
    G.q.length = 0;
  } else if (UI.mode === 'result') {
    stepFx(dt);
  }
  render(G, now / 1000);
  if (UI.mode === 'play' || UI.mode === 'pause') { drawHud(G); if (UI.banner > 0 && G.boss) drawBossBanner(UI.banner); }
  autoQuality(dt);
}

// 畫面太慢就自動降解析度
function autoQuality(dt) {
  if (UI.mode !== 'play') { UI.fpsT = 0; UI.fpsN = 0; return; }
  UI.fpsT += dt; UI.fpsN++;
  if (UI.fpsT >= 2.5) {
    const fps = UI.fpsN / UI.fpsT;
    UI.fpsT = 0; UI.fpsN = 0;
    if (fps < 45 && R.q > 0.55) { R.q = Math.max(0.55, R.q - 0.15); resizeRender(); }
    else if (fps > 58 && R.q < 1) { R.q = Math.min(1, R.q + 0.05); resizeRender(); }
  }
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
  requestAnimationFrame(frame);
  // 字型載入後重畫快取
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { R.bgKey = ''; });
  window.__rush = { get G() { return G; }, UI, R, Save, startStage, step, finish };
}
boot();
