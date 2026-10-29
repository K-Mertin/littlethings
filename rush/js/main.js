// 千軍突圍 — 選單、輸入、主迴圈
'use strict';

const $ = s => document.querySelector(s);
const UI = { mode: 'title', banner: 0, kb: 0, drag: null, fpsT: 0, fpsN: 0, toastT: 0, resultShown: false };

function show(id) {
  for (const el of document.querySelectorAll('.ov')) el.hidden = el.id !== id;
  $('#pauseBtn').hidden = id !== null;
  $('#speedBtn').hidden = id !== null;
  const dc = $('#dcard'); if (dc) dc.hidden = !(id === null && G && G.mode === 'defense' && G.card && !G.demo);
  syncSpeed();
  $('#giantBtn').hidden = !(id === null && G && G.mode === 'defense');
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

// ---------- 標題畫面的展示部隊 ----------
function demoGame() {
  setCam('run');
  newGame(1, {});
  G.L = Object.assign({}, G.L, { ev: [], theme: THEMES[0] });
  G.N = 36; G.peak = 36;
  syncSoldiers(true);
  G.demo = true;
}

// ---------- 開始一關 ----------
function startStage(s) {
  AU.init();
  setCam('run');
  newGame(s, { up: Save.d.up, wpn: Save.d.wpn });
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

// 守城模式
function startDefense(n) {
  AU.init();
  setCam('defense');
  newDefense(n, { up: Save.d.up });
  UI.mode = 'play'; UI.banner = 0; UI.resultShown = false;
  show(null);
  AU.music(G.L.theme.bgm, false);
  Save.d.dlast = n; Save.save();
  const el = $('#ruleBanner');
  el.querySelector('.rt').textContent = `守城模式 · 第 ${n} 關`;
  el.querySelector('.rn').textContent = G.L.name;
  el.querySelector('.rd').textContent = (n <= 2 ? '左右移動砲台，讓小兵穿過 ×2、+ 門變多，把敵方基地打爆！' : '') + (G.L.tip || '');
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  UI.ruleT = 2.8;
}
function buildDLevels() {
  const box = $('#dlevelGrid');
  box.innerHTML = DSTAGES.map((D, i) => {
    const n = i + 1, un = Save.dUnlocked(n), st = Save.d.dstars[n] || 0;
    return `<button class="tile t-${THEMES[D.theme].id}" data-dstage="${n}" ${un ? '' : 'disabled'}>
      <span class="n">${un ? n : '🔒'}</span><span class="nm">${D.name}</span>
      <span class="rl">${D.rows} 排門${D.slide ? '・會動' : ''}${D.roul ? '・轉盤' : ''}${D.red ? '・✕ 門' : ''}${D.wall ? '・牆' : ''}${D.bomb ? '・砲擊' : ''}${D.pow ? '・強化門' : ''}${D.gey ? '・火口' : ''}</span>
      <span class="ss">${[0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}">★</i>`).join('')}</span></button>`;
  }).join('');
  const total = Object.values(Save.d.dstars).reduce((a, b) => a + b, 0);
  $('#dstarTotal').textContent = `★ ${total} / ${DSTAGES.length * 3}`;
}
function finishDefense(win) {
  const d = Save.d, n = G.s;
  const kc = G.castle / G.castleMax;
  const st = win ? (kc >= 0.8 ? 3 : kc >= 0.45 ? 2 : 1) : 0;
  const prev = d.dstars[n] || 0;
  let coins = Math.round((win ? 30 + n * 10 + st * 12 + (prev === 0 ? 30 : 0) : 5 + n * 2 + Math.floor(G.kills / 10)) * coinK());
  if (win) d.dstars[n] = Math.max(prev, st);
  d.coins += coins; d.plays++; Save.save();
  AU.sfx(win ? 'win' : 'lose');
  $('#resultBody').innerHTML = `<p class="eyebrow">守城模式 · 第 ${n} 關 · ${G.L.name}</p>
      <h2 class="big ${win ? 'ok' : 'bad'}">${win ? '基地攻破！' : '城被攻破了'}</h2>
      ${win ? `<div class="stars">${[0, 1, 2].map(i => `<span class="st ${i < st ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.25}s">★</span>`).join('')}</div>` : ''}
      <div class="stats">
        <div><b>${Math.round(kc * 100)}%</b><span>城的血量</span></div>
        <div><b>${G.sent}</b><span>射出小兵</span></div>
        <div><b>${G.kills}</b><span>打倒怪物</span></div>
        <div><b class="gold">+${coins}</b><span>金幣</span></div>
      </div>
      <p class="hint">${win ? (st < 3 ? '少讓怪物撞到城，就能拿三顆星。' : '完美守城！') : '先讓小兵穿過 ×2、×3 的門變多，怪物靠近時再移過去擋。'}</p>
      <div class="row">
        ${win && n < DSTAGES.length ? '<button class="btn primary" data-act="dnext">下一關 →</button>' : `<button class="btn primary" data-act="retry">${win ? '再玩一次' : '再試一次'}</button>`}
        ${win && n < DSTAGES.length ? '<button class="btn" data-act="retry">再玩一次</button>' : ''}
        <button class="btn" data-act="dlevels">守城關卡</button>
        <button class="btn ghost" data-act="title">回標題</button>
      </div>`;
  show('result'); refreshCoins();
}

// 無盡模式／每日挑戰
function startMode(mode) {
  AU.init();
  setCam('run');
  const seed = mode === 'daily' ? todayKey() : (Date.now() % 100000) + 1;
  newGame(1, { mode, seed, up: Save.d.up, wpn: Save.d.wpn });
  G.badgeBump = 0; G.badgeRed = 0;
  UI.mode = 'play'; UI.banner = 0; UI.resultShown = false;
  show(null);
  AU.music(G.L.theme.bgm, false);
  showRule(G.rule, mode === 'daily' ? `每日挑戰 · ${String(G.L.daily).replace(/(\d{4})(\d\d)(\d\d)/, '$1/$2/$3')}` : mode === 'boss' ? `頭目連戰 · 第 1 戰 · ${BOSSES[BR_BOSSES[0]].name}` : '無盡模式 · 第 1 段');
  if (mode === 'boss') toast('五個頭目一個接一個！中間的路上記得多拿士兵', 2.8);
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
      case 'dwave': break;
      case 'legclear': toast(G.mode === 'boss' ? `打倒頭目！還剩 ${BR_BOSSES.length - a.leg} 個` : `打倒頭目！第 ${a.leg} 段完成`, 1.6); break;
      case 'legtheme': AU.music(G.L.theme.bgm, false); showRule(G.rule, G.mode === 'boss' ? `頭目連戰 · 第 ${G.leg + 1} 戰 · ${BOSSES[BR_BOSSES[G.leg]].name}` : `無盡模式 · 第 ${G.leg + 1} 段 · ${G.L.theme.name}`); break;
      case 'spec': AU.sfx('gateWpn'); tipOnce('spec_' + a, `${SPEC[a].name}加入了：${SPEC[a].desc}`, 2.8); break;
      case 'buff': AU.sfx('buff'); break;
      case 'blocked': AU.sfx('blocked'); break;
      case 'heal': AU.sfx('heal'); break;
      case 'mortar': AU.sfx('mortar'); break;
      case 'shellboom': AU.sfx('rocket'); break;
      case 'lava': AU.sfx('lava'); vibrate(15); break;
      case 'geyser': AU.sfx('geyser'); break;
      case 'breath': AU.sfx('breath'); G.shake = Math.max(G.shake, 0.5); vibrate(40); break;
      case 'enheal': AU.sfx('heal'); break;
    }
  }
  G.q.length = 0;
}
function vibrate(ms) { try { if (navigator.vibrate && Save.d.sfx) navigator.vibrate(ms); } catch (e) { } }

// 第一關的教學提示
function defTips() {
  if (G.t > 0.5 && G.t < 1) tipOnce('dmove', '左右拖曳砲台：讓小兵穿過 ×2、+ 的門會變多！', 3.4);
  if (G.giant >= G.giantMax) tipOnce('dgiant', '能量滿了！按右下角的「大兵」放出金色大兵', 3);
  for (const o of G.objs) if (o.t === 'en' && o.z < 14) { tipOnce('denemy', '怪物快到城了！把砲台移過去擋住它', 3); break; }
  for (const o of G.objs) {
    if (o.t === 'gate' && o.k === 'pow') { tipOnce('dpow', '黃色的強化門：人數不變，但穿過的小兵會變成兩倍強！', 3.4); break; }
    if (o.t === 'geyser' && o.warn) { tipOnce('dgey', '火口冒煙就要噴火了，小兵和怪物經過都會被燒掉', 3.2); break; }
  }
}

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
    else if (o.t === 'boss' && o.breath) tipOnce('breath', '炎龍要往半邊噴火了！快跑到另一邊', 2.6);
    else if (o.t === 'lava' && o.z < 40) tipOnce('lava', '岩漿河！對準石橋走過去才不會被燙到', 3);
    else if (o.t === 'geyser' && o.z < 40) tipOnce('geyser', '火口冒煙就要噴火了，避開它；怪物走過去也會被燒', 3.2);
    else if (o.t === 'gate' && o.k === 'spec' && o.z < 45 && !o.pair.used) tipOnce('specgate', '紫色的兵種門：醫護兵會救人、砲兵會打砲、盾兵會擋傷害', 3.4);
    else if (o.t === 'gate' && o.k === 'buff' && o.z < 45 && !o.pair.used) tipOnce('buffgate', '粉紅色的加持門：無敵護罩或狂熱連射，只有幾秒鐘', 3.2);
    else if (o.t === 'en' && o.k === 'bat' && o.z < 30) tipOnce('bat', '火蝙蝠飛得快又左右亂飄，快對準打下來', 3);
    else if (o.t === 'en' && o.k === 'healer' && o.z < 32) tipOnce('healer', '治療巫師會幫怪物補血，先把它打倒！', 3);
    else if (o.t === 'en' && o.k === 'magma' && o.z < 30) tipOnce('magma', '熔岩怪倒下會留下一灘岩漿，別踩上去', 3);
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
  const coins = Math.round((Math.floor(dist / 15) + G.leg * 20 + Math.floor(G.kills / 10)) * coinK());
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
  coins = Math.round(coins * coinK());
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

function coinK() { return 1 + (Save.d.up.coin || 0) * 0.05; }
function finishBoss(win) {
  const d = Save.d, sec = Math.round(G.t);
  const st = win ? starsOf() : 0;
  const prev = d.bossBest || 0, rec = win && (!prev || sec < prev);
  if (rec) d.bossBest = sec;
  if (win) d.bossStars = Math.max(d.bossStars || 0, st);
  const beaten = win ? BR_BOSSES.length : G.leg;
  d.bossMost = Math.max(d.bossMost || 0, beaten);
  const coins = Math.round((win ? 160 + st * 30 + (d.bossWins ? 0 : 120) : 10 + G.leg * 30 + Math.floor(G.kills / 10)) * coinK());
  if (win) d.bossWins = (d.bossWins || 0) + 1;
  d.coins += coins; d.plays++; Save.save();
  AU.sfx(win ? 'win' : 'lose');
  const mm = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('#resultBody').innerHTML = `<p class="eyebrow">頭目連戰</p>
      <h2 class="big ${win ? 'ok' : 'bad'}">${win ? (rec ? '新紀錄！' : '五連勝！') : '部隊全滅'}</h2>
      ${win ? `<div class="stars">${[0, 1, 2].map(i => `<span class="st ${i < st ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.25}s">★</span>`).join('')}</div>` : ''}
      <div class="stats">
        <div><b>${beaten}/${BR_BOSSES.length}</b><span>打倒頭目</span></div>
        <div><b>${mm(sec)}</b><span>花的時間</span></div>
        <div><b>${win ? G.N : G.peak}</b><span>${win ? '存活士兵' : '最多兵力'}</span></div>
        <div><b class="gold">+${coins}</b><span>金幣</span></div>
      </div>
      <p class="hint">${win ? (prev ? `最快紀錄：${mm(d.bossBest)}` : '第一次全部打倒！') : '路上先拿兵種門：砲兵和醫護兵打頭目很有用。'}</p>
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
  if (G.mode === 'boss') return finishBoss(win);
  if (G.mode === 'defense') return finishDefense(win);
  if (G.mode === 'daily') return finishDaily(win);
  if (win) {
    const st = starsOf();
    const prev = d.stars[s] || 0;
    const coins = Math.round((25 + s * 8 + st * 12 + Math.min(80, Math.floor(G.N / 15)) + (prev === 0 ? 30 : 0)) * coinK());
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
    const coins = Math.round((5 + s * 2 + Math.floor(G.kills / 8)) * coinK());
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
  const own = Save.d.wpns;
  const armory = `<div class="upg armory"><div class="info"><b>武器庫・開場武器</b><span>買下來就能選開場拿哪一把槍（每日挑戰除外）</span>
      <div class="wrow">${WPN_ORDER.map(w => { const has = own.includes(w), on = Save.d.wpn === w;
        return `<button class="wbtn${on ? ' on' : ''}" data-wpn="${w}" ${!has && Save.d.coins < ARMORY[w] ? 'disabled' : ''}><canvas width="64" height="40" data-wicon="${w}"></canvas><span>${WEAPONS[w].name}</span><em>${on ? '使用中' : has ? '選用' : '🪙 ' + ARMORY[w]}</em></button>`; }).join('')}</div></div></div>`;
  box.innerHTML = armory + UPGRADES.map(u => {
    const lv = Save.d.up[u.id], max = lv >= u.max, cost = u.cost(lv);
    return `<div class="upg">
      <div class="info"><b>${u.name}</b><span>${lv ? u.desc(lv) : '還沒升級'}${max ? '' : ` → <em>${u.desc(lv + 1)}</em>`}</span>
        <div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>
      <button class="btn buy" data-up="${u.id}" ${max || Save.d.coins < cost ? 'disabled' : ''}>${max ? '已滿級' : `🪙 ${cost}`}</button>
    </div>`;
  }).join('');
  for (const c of box.querySelectorAll('canvas[data-wicon]')) { const g = c.getContext('2d'); drawWeaponIcon(g, c.dataset.wicon, 32, 20, 26, '#ffd34d', 'rgba(0,0,0,.7)'); }
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
  const dn = Object.values(Save.d.dstars).reduce((a, b) => a + b, 0);
  $('#defInfo').textContent = dn ? `守城星星 ★ ${dn} / ${DSTAGES.length * 3}` : '小兵穿過 ×2 門變多';
  $('#endInfo').textContent = Save.d.endBest ? `最遠 ${Save.d.endBest} 公尺` : '一直跑到全滅';
  const bOpen = bossOpen();
  $('#bossBtn').classList.toggle('locked', !bOpen);
  $('#bossInfo').textContent = !bOpen ? '🔒 過第 3 關開放' : Save.d.bossBest ? `最快 ${Math.floor(Save.d.bossBest / 60)}:${String(Save.d.bossBest % 60).padStart(2, '0')}` : Save.d.bossMost ? `最多打倒 ${Save.d.bossMost} 個` : '五個頭目連續挑戰';
  const dd = Save.d.daily;
  $('#dailyInfo').textContent = dd && dd.key === todayKey() && dd.best ? `今天最佳 ${dd.best} 人` : '今天還沒挑戰';
  refreshCoins();
  show('title');
}
function bossOpen() { return (Save.d.stars[3] || 0) > 0; }
function nextStage() {
  for (let s = 1; s <= STAGES.length; s++) if (!Save.d.stars[s]) return s;
  return Save.d.last || STAGES.length;
}

// 守城的強化卡
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

function onAct(act, el) {
  AU.init(); AU.sfx('click');
  if (AU.ctx && AU.ctx.state === 'suspended' && act !== 'pause') AU.ctx.resume();
  switch (act) {
    case 'start': startStage(nextStage()); break;
    case 'levels': if (G && G.mode === 'defense' && !G.demo) { onAct('dlevels'); break; } buildLevels(); if (!G || !G.demo) demoGame(); UI.mode = 'title'; AU.stop(); if (AU.ctx) AU.ctx.resume(); show('levels'); break;
    case 'shop': buildShop(); if (!G || !G.demo) demoGame(); UI.mode = 'title'; AU.stop(); if (AU.ctx) AU.ctx.resume(); show('shop'); break;
    case 'help': show('help'); break;
    case 'title': goTitle(); if (AU.ctx) AU.ctx.resume(); break;
    case 'resume': resume(); break;
    case 'restart': case 'retry':
      if (G && !G.demo && G.mode === 'defense') startDefense(G.s);
      else if (G && !G.demo && G.mode !== 'stage') startMode(G.mode);
      else startStage(G.s && !G.demo ? G.s : (Save.d.last || 1));
      break;
    case 'endless': startMode('endless'); break;
    case 'bossrush': if (bossOpen()) startMode('boss'); else toast('先通過第 3 關，就能挑戰頭目連戰！', 2.4); break;
    case 'dlevels': buildDLevels(); if (!G || !G.demo) demoGame(); UI.mode = 'title'; AU.stop(); if (AU.ctx) AU.ctx.resume(); show('dlevels'); break;
    case 'dnext': startDefense(Math.min(DSTAGES.length, G.s + 1)); break;
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
    const k = R.k0 * (G.mode === 'defense' ? 0.85 : 0.65) / R.dpr; // 每公尺幾個 CSS 像素（考慮鏡頭跟隨）
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
    else if ((e.key === ' ' || e.key === 'g' || e.key === 'G') && UI.mode === 'play' && G.mode === 'defense') { e.preventDefault(); defLaunchGiant(); }
    else if ((e.key === 'f' || e.key === 'F') && UI.mode === 'play') cycleSpeed();
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
    const dt2 = e.target.closest('[data-dstage]');
    if (dt2 && !dt2.disabled) { startDefense(+dt2.dataset.dstage); return; }
    const t = e.target.closest('[data-stage]');
    if (t && !t.disabled) { startStage(+t.dataset.stage); return; }
    const wb = e.target.closest('[data-wpn]');
    if (wb && !wb.disabled) {
      const w = wb.dataset.wpn, own = Save.d.wpns;
      if (!own.includes(w)) { if (Save.d.coins < ARMORY[w]) return; Save.d.coins -= ARMORY[w]; own.push(w); AU.init(); AU.sfx('buy'); }
      else { AU.init(); AU.sfx('click'); }
      Save.d.wpn = w; Save.save(); buildShop();
      return;
    }
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
  $('#giantBtn').addEventListener('click', e => { e.stopPropagation(); if (UI.mode === 'play' && G.mode === 'defense' && !defLaunchGiant()) AU.sfx('click'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('resize', () => { UI.pendResize = true; });
}

function gamepadX() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p) { const x = p.axes[0] || 0; const dl = p.buttons[14] && p.buttons[14].pressed, dr = p.buttons[15] && p.buttons[15].pressed; return Math.abs(x) > 0.2 ? x : dl ? -1 : dr ? 1 : 0; }
  return 0;
}

// ---------- 主迴圈 ----------
// 快遇到頭目時先把它的 3D 模型烤好
let _bossChk = 0;
function bossPrep(now) {
  if (now - _bossChk < 1000 || typeof Bake === 'undefined' || !Bake.ready || !G || G.demo || !G.L || !G.L.ev) return;
  _bossChk = now;
  for (let i = G.evI || 0; i < G.L.ev.length; i++) { const e = G.L.ev[i]; if (e.type === 'boss') { Bake.prepBoss(e.k); return; } }
  if (G.boss && !G.boss.dead) Bake.prepBoss(G.boss.k);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(1 / 30, Math.max(0, (now - (UI.last || now)) / 1000));
  UI.last = now;
  AU.tick();
  bossPrep(now);
  // 第一次開：在選單畫面顯示 3D 模型的進度（玩的時候不顯示、也不烤）
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
    // 依設定的速度推進（快的時候切成小步，避免東西穿過去）
    let rem = dt * (Save.d.speed || 1);
    for (let k = 0; k < 6 && rem > 1e-5; k++) {
      const d = Math.min(rem, 1 / 60);
      if (G.mode === 'defense') defStep(d, null); else step(d, null);
      rem -= d;
      if (G.st === 'win' || G.st === 'lost') break;
    }
    if (G.badgeBump > 0) G.badgeBump = Math.max(0, G.badgeBump - dt * 4);
    if (G.badgeRed > 0) G.badgeRed -= dt;
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.5);
    if (G.themeFade > 0) G.themeFade = Math.max(0, G.themeFade - dt * 1.2);
    if (UI.banner > 0) UI.banner -= dt;
    handleEvents();
    if (G.mode === 'defense') defTips(); else tutorial();
    if (G.st === 'win') finish(true);
    else if (G.st === 'lost') finish(false);
  } else if (UI.mode === 'title' && G.demo) {
    G.tx = Math.sin(now / 1600) * 2.2;
    step(dt, null);
    G.q.length = 0;
  } else if (UI.mode === 'result') {
    if (G.mode === 'defense') { defStep(dt, null); G.q.length = 0; } else stepFx(dt);
  }
  if (UI.pendResize) { UI.pendResize = false; resizeRender(); }
  if (G.mode === 'defense') {
    renderDef(G, now / 1000);
    if (UI.mode === 'play' || UI.mode === 'pause') drawDefHud(G);
    const gb = $('#giantBtn');
    if (!gb.hidden) { const p = Math.round(100 * G.giant / G.giantMax); gb.style.setProperty('--p', p); gb.classList.toggle('ready', p >= 100); }
  } else {
    render(G, now / 1000);
    if (UI.mode === 'play' || UI.mode === 'pause') { drawHud(G); if (UI.banner > 0 && G.boss) drawBossBanner(UI.banner); }
  }
  autoQuality(dt);
}

// 畫面太慢就自動降解析度
// 畫面太慢就自動降解析度。
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
  if (fps < 50 && !R.noTex) { R.noTex = true; UI.slowN = 0; } // 先關地面質感，不夠再降解析度
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
  requestAnimationFrame(frame);
  // 3D 模型在背景慢慢烤，烤好就換上
  setTimeout(() => Bake.init(), 60);
  // 字型載入後重畫快取
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { R.bgKey = ''; });
  window.__rush = { get G() { return G; }, UI, R, Save, startStage, startDefense, startMode, step, finish, Bake };
}
boot();
