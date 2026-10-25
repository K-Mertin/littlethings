'use strict';
// 守塔奇兵：主迴圈、版面配置、輸入、遊戲流程
const cv = $('cv'), ctx = cv.getContext('2d'), app = $('app');
const isTouch = matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', isTouch);

const App = {
  scene: 'title', game: null, demo: null, demoBot: null, speed: 1, paused: false, time: 0, acc: 0,
  W: 0, H: 0, dpr: 1, Vplay: null, Vdemo: null, portrait: false, bot: null, shift: false,
  brief: { li: 0, diff: DIFFS[Store.data.diff] ? Store.data.diff : 'normal' },
  ui: null,
};
function newUi() { return { selTile: null, selTower: null, armed: null, pending: null, aiming: false, hover: null, ghost: null, banner: null, shake: 0, placing: false, preview: null, nextInfo: null, selHero: false }; }
App.ui = newUi();

// ───────── 掛勾 ─────────
let quiet = false;
Hook.sfx = n => { if (!quiet) Snd.sfx(n); };
Hook.shake = a => { if (!quiet) App.ui.shake = Math.max(App.ui.shake, a); };
Hook.fx = (n, g, a, b, c, d, e) => {
  FX.on(n, g, a, b, c, d, e);
  if (n === 'storm' && g === App.game && !quiet) { if (a) { UI.say('<b>沙暴來襲！</b>所有塔的射程暫時變成八成。', 3); Snd.sfx('blizzard'); } else UI.say('沙暴過去了。', 1.5); }
  if (g === App.game && !quiet) {
    if (n === 'weather') { const W = { clear: '天氣轉晴。', rain: '<b>暴雨！</b>塔的攻速變慢，冰霜塔更冷，毒池會被沖淡。', wind: '<b>狂風！</b>飛行敵人加速，箭塔、狙擊塔射程變短。', thunder: '<b>雷暴！</b>雷電會隨機劈中敵人，法師塔傷害 +35%。' }[a]; UI.say(W, 3); Snd.sfx(a === 'thunder' ? 'zap' : a === 'clear' ? 'click' : 'blizzard'); }
    if (n === 'phase') { App.ui.banner = { t: 0, big: a.phase >= 2 ? '最終形態！' : '第二形態！', small: a.d.name + ({ bossTortoise: ' · 龜殼碎了！', bossRaijin: a.phase === 1 ? ' · 乘雲飛起（只有能打空中的塔打得到）' : ' · 狂雷讓所有敵人加速！', bossEclipse: a.phase === 1 ? ' · 日蝕降臨，天色暗了下來' : ' · 狂暴！小心黑暗脈衝' }[a.k] || ''), boss: true, k: Beasts.BOX[a.k + (a.phase + 1)] ? a.k + (a.phase + 1) : Beasts.BOX[a.k + '2'] ? a.k + '2' : a.k }; Snd.play(9, 1); }
    if (n === 'bridge' && b === false && g.bridges.every(x => !x.open)) UI.say('吊橋都收起來了，敵人在橋頭排隊！', 2);
    if (n === 'dawn') UI.say('<b>黑夜散去了！</b>', 2.5);
  }
  if (g === App.game && !quiet) Ach.event(n, g, a);
};
Hook.banner = (G, boss) => {
  if (G !== App.game) return;
  App.ui.banner = boss
    ? { t: 0, big: '頭目來襲！', small: ENEMIES[boss].name, boss: true, k: boss }
    : { t: 0, big: `第 ${G.wave + 1} 波`, small: G.endless ? '無盡模式' + (G.mod ? ` · 詞綴「${ENDLESS_MODS[G.mod].name}」${ENDLESS_MODS[G.mod].desc}` : '') : (G.wave === G.nWaves - 1 ? '最後一波！' : `共 ${G.nWaves} 波`) };
  if (boss) Snd.play(9, 1);
};
Hook.ended = G => {
  if (G !== App.game) return;
  const rec = recordResult(G);
  App.ui.selTower = null; App.ui.selTile = null; App.ui.armed = null; App.ui.aiming = false;
  setTimeout(() => { if (App.game === G) { UI.showResult(G, rec); Snd.play(8, 0); } }, G.state === 'won' ? 1500 : 1100);
};

// ───────── 版面 ─────────
function layout() {
  const W = innerWidth, H = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, [2.5, 1.75, 1.25][App.q || 0]);
  const ps = getComputedStyle($('probe'));
  const sa = { t: parseFloat(ps.paddingTop) || 0, r: parseFloat(ps.paddingRight) || 0, b: parseFloat(ps.paddingBottom) || 0, l: parseFloat(ps.paddingLeft) || 0 };
  const portrait = H > W * 1.02;
  App.W = W; App.H = H; App.dpr = dpr; App.portrait = portrait;
  app.classList.toggle('portrait', portrait); app.classList.toggle('landscape', !portrait);
  const hud = $('hud').style, panel = $('panel').style;
  let s, ox, oy;
  if (portrait) {
    const hudH = 46 + sa.t, minPH = H < 700 ? 150 : 180;
    s = Math.min((W - 6 - sa.l - sa.r) / ROWS, (H - hudH - minPH - 6) / COLS);
    const mw = ROWS * s, mh = COLS * s;
    ox = (W - mw) / 2; oy = hudH + 2;
    const top = Math.round(oy + mh + 6);
    Object.assign(hud, { left: '0px', top: '0px', width: W + 'px', height: hudH + 'px', paddingLeft: (10 + sa.l) + 'px', paddingRight: (10 + sa.r) + 'px' });
    Object.assign(panel, { left: '0px', top: top + 'px', width: W + 'px', height: (H - top) + 'px' });
  } else {
    const PW = Math.round(clamp(W * 0.25, 236, 330)) + sa.r;
    const hudH = (H < 480 ? 42 : 50) + sa.t;
    const availW = W - PW - sa.l - 12, availH = H - hudH - 8 - sa.b;
    s = Math.min(availW / COLS, availH / ROWS);
    ox = sa.l + 6 + (availW - COLS * s) / 2; oy = hudH + (availH - ROWS * s) / 2;
    Object.assign(hud, { left: '0px', top: '0px', width: (W - PW) + 'px', height: hudH + 'px', paddingLeft: (10 + sa.l) + 'px', paddingRight: '10px' });
    Object.assign(panel, { left: (W - PW) + 'px', top: '0px', width: PW + 'px', height: H + 'px' });
  }
  App.Vplay = makeView(s, portrait, ox, oy);
  Render.setLow(isTouch || W * H < 520000 || App.q > 0, App.q || 0);
  // 標題畫面背景：地圖鋪滿整個螢幕
  const rot = portrait;
  const ds = Math.max(W / (rot ? ROWS : COLS), H / (rot ? COLS : ROWS));
  App.Vdemo = makeView(ds, rot, (W - (rot ? ROWS : COLS) * ds) / 2, (H - (rot ? COLS : ROWS) * ds) / 2);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  Render.invalidate();
}
addEventListener('resize', () => { layout(); if (!$('ovLevels').hidden && App.scene === 'levels') UI.levels(); });
addEventListener('orientationchange', () => setTimeout(layout, 150));

// ───────── 遊戲流程 ─────────
function startLevel(li, diff, endless, chal, mode) {
  if (chal) { diff = chal === 'iron' ? 'easy' : 'normal'; endless = false; }
  const heroic = mode === 'heroic', weekly = mode === 'weekly' ? Weekly.rules() : null;
  if (heroic) { diff = 'normal'; endless = false; chal = null; }
  if (weekly) { li = weekly.li; diff = 'normal'; endless = true; chal = null; }
  // 英雄已移除（MK 2026-10-23：有英雄後難度降太多）。英雄相關程式保留但不再上場。
  App.game = newGame(li, diff, { endless, chal, heroic, weekly });
  App.ui = newUi(); App.speed = 1; App.paused = false; App.acc = 0; App.bot = null;
  App.scene = 'play';
  if (!chal && !heroic && !weekly) Store.data.diff = diff;
  Store.data.plays = (Store.data.plays || 0) + 1; Store.save();
  UI.resetPanel(); UI.show();
  app.classList.add('playing');
  Snd.play(THEMES[LEVELS[li].theme].music, 1);
  const modTxt = m => m.map(k => HEROIC_MODS[k].name).join('＋');
  App.ui.banner = { t: 0, intro: true, li, en: LEVELS[li].en, big: LEVELS[li].name, small: weekly ? `每週挑戰 · ${modTxt(weekly.mods)} · 撐越久分數越高` : heroic ? `菁英模式 · ${modTxt(LEVELS[li].heroic)} · 共 ${App.game.nWaves} 波` : chal ? `挑戰 · ${CHALLENGES[chal].name}（${CHALLENGES[chal].desc}）` : endless ? '無盡模式 · 準備好就按開始' : `${DIFFS[diff].name}難度 · 共 ${App.game.nWaves} 波` };
}
App.startLevel = (...a) => startLevel(...a);
function toScene(s) {
  App.scene = s;
  app.classList.toggle('playing', s === 'play');
  if (s !== 'play') { App.game = null; App.paused = false; }
  if (s === 'title') { $('tStars').textContent = `★ ${Prog.total()} / ${Prog.max()}`; UI.show('ovTitle'); Snd.play(8, 0); }
  if (s === 'levels') { UI.show('ovLevels'); UI.levels(); Snd.play(8, 0); }
  if (s === 'meta') { UI.meta(); UI.show('ovMeta'); }
}
function saveHero(G) {
  const H = G && G.hero; if (!H) return;
  Store.data.heroes[H.id] = Object.assign(HeroUI.rec(H.id), { xp: Math.max(HeroUI.rec(H.id).xp, H.xp) });
  if (H.lv >= 5) Ach.give('hero5');
  if (H.lv >= HERO_MAX) Ach.give('hero10');
}
function recordResult(G) {
  saveHero(G);
  const out = { gained: 0, unlock: null, endlessNew: false, cleared: 0, newBest: false, chalNew: false, heroicNew: false, score: 0, rank: -1 };
  if (G.weekly) {
    const allClear = G.wave >= 0 && !G.spawners.length && !G.enemies.some(e => e.alive) && G.lives > 0;
    out.cleared = Math.max(0, G.wave + (allClear ? 1 : 0));
    out.score = Weekly.score(G, out.cleared);
    out.rank = Weekly.record(out.score, out.cleared);
  } else if (G.heroic) {
    if (G.state === 'won') { if (!Store.data.heroic[G.li]) { Store.data.heroic[G.li] = 1; out.gained = 2; out.heroicNew = true; } }
  } else if (G.endless) {
    // 正在倒數下一波（這一波已經清光）時離開，這一波也算撐過
    const allClear = G.wave >= 0 && !G.spawners.length && !G.enemies.some(e => e.alive) && G.lives > 0;
    const cleared = Math.max(0, G.wave + (allClear ? 1 : 0));
    out.cleared = cleared;
    const before = Prog.endlessStars(G.li);
    if (cleared > (Store.data.endless[G.li] || 0)) { Store.data.endless[G.li] = cleared; out.newBest = true; }
    out.gained = Prog.endlessStars(G.li) - before;
  } else if (G.chal) {
    if (G.state === 'won') {
      const c = Store.data.chal[G.li] = Store.data.chal[G.li] || {};
      if (!c[G.chal]) { c[G.chal] = 1; out.gained = 1; out.chalNew = true; }
    }
  } else if (G.state === 'won') {
    const clearedBefore = Prog.cleared(), before = Prog.levelStars(G.li);
    const r = Store.data.levels[G.li] || { stars: 0, hard: false, best: {} };
    r.stars = Math.max(r.stars || 0, G.stars);
    r.best = r.best || {}; r.best[G.diff] = Math.max(r.best[G.diff] || 0, G.stars);
    if (G.diff === 'hard') r.hard = true;
    Store.data.levels[G.li] = r;
    out.gained = Prog.levelStars(G.li) - before;
    const clearedNow = Prog.cleared();
    if (clearedNow > clearedBefore) {
      const nt = TOWER_ORDER.find(k => TOWERS[k].unlock === clearedNow && TOWERS[k].unlock > clearedBefore);
      if (nt) out.unlock = nt;
      if (clearedBefore <= ENDLESS_UNLOCK && clearedNow > ENDLESS_UNLOCK) out.endlessNew = true;
    }
  }
  Store.save();
  Ach.ended(G, out);
  return out;
}
function setPaused(p) {
  if (App.scene !== 'play' || !App.game) return;
  if (App.game.state === 'won' || App.game.state === 'lost') return;
  App.paused = p;
  if (p) {
    const G = App.game;
    $('pInfo').textContent = `${G.L.name} · ${G.chal ? '挑戰「' + CHALLENGES[G.chal].name + '」' : G.endless ? '無盡模式' : DIFFS[G.diff].name} · 第 ${Math.max(1, G.wave + 1)} 波`;
    UI.syncToggles(); UI.show('ovPause');
  } else UI.show();
}

// ───────── 操作 ─────────
function deselect() { const u = App.ui; u.selTile = null; u.selTower = null; u.pending = null; u.preview = null; u.selHero = false; }
function tryBuild(k, x, y) {
  const G = App.game;
  if (!G.towersAvail.includes(k)) return false;
  const c = tierCost(G, k, 0);
  if (G.gold < c) { Snd.sfx('deny'); UI.say(`<span class="warn">金幣不夠！${TOWERS[k].name}需要 ${c}。</span>`); return false; }
  const t = buildTower(G, k, x, y);
  if (t) { deselect(); App.ui.armed = App.shift && !isTouch ? k : null; return true; }
  return false;
}
App.shopTap = k => {
  Snd.init();
  const G = App.game, ui = App.ui; if (!G) return;
  if (!G.towersAvail.includes(k)) { Snd.sfx('deny'); UI.say(`${TOWERS[k].name}會在打贏第 ${TOWERS[k].unlock} 關之後解鎖。`); return; }
  Snd.sfx('click');
  ui.aiming = false;
  if (ui.selTile) {
    if (ui.pending === k) tryBuild(k, ui.selTile.x, ui.selTile.y);
    else ui.pending = k;
  } else {
    ui.armed = ui.armed === k ? null : k;
  }
};
App.shopHover = k => { App.ui.hoverShop = k; };
function selectTower(t) {
  const ui = App.ui;
  if (ui.selTower === t) { deselect(); return; }
  deselect(); ui.armed = null; ui.selTower = t;
  Snd.sfx('click');
}
function handleTap(sx, sy) {
  const G = App.game, ui = App.ui, V = App.Vplay;
  if (!G || App.paused) return;
  const [wx, wy] = V.U(sx, sy);
  const inside = wx >= 0 && wy >= 0 && wx < COLS && wy < ROWS;
  if (ui.aiming) {
    if (inside && castMeteor(G, wx, wy)) ui.aiming = false;
    else ui.aiming = false;
    return;
  }
  // 點英雄 = 選取／取消
  const H = G.hero;
  if (H && !H.dead) {
    const [ha, hb] = V.P(H.x, H.y), s = V.s;
    if (Math.abs(sx - ha) < s * 0.48 && sy > hb - s * 1.05 && sy < hb + s * 0.3) { toggleHero(); return; }
  }
  if (ui.selHero && H) {
    const tx0 = Math.floor(wx), ty0 = Math.floor(wy);
    if (inside && G.grid[ty0][tx0].tower) { selectTower(G.grid[ty0][tx0].tower); return; }
    const mv = inside ? heroMove(G, wx, wy) : null;
    if (mv) { ui.selHero = false; Snd.sfx('click'); }
    else { Snd.sfx('deny'); UI.say('英雄只能走在<b>道路</b>上，點靠近道路的地方。'); }
    return;
  }
  // 點入口的骷髏 = 叫下一波
  if (ui.nextInfo && canCallWave(G)) {
    for (const ei of ui.nextInfo.ents) {
      const ep = G.entryPts[ei];
      if (ep && dist2(wx, wy, clamp(ep.x, 0.5, COLS - 0.5), clamp(ep.y, 0.5, ROWS - 0.5)) < 0.5 * 0.5) { doCallWave(); return; }
    }
  }
  const tx = Math.floor(wx), ty = Math.floor(wy);
  if (!inside) { deselect(); ui.armed = null; return; }
  const cell = G.grid[ty][tx];
  // 選著兵營時點道路＝移動集結點
  if (ui.selTower && TOWERS[ui.selTower.k].troops && cell.path) {
    const t = ui.selTower;
    if (dist2(wx, wy, t.cx, t.cy) <= (t.st.range + 0.3) ** 2 && setRally(G, t, wx, wy)) { Snd.sfx('click'); UI.say('士兵往新的集結點移動。', 1.5); return; }
    Snd.sfx('deny'); UI.say(`集結點要在兵營 <b>${t.st.range.toFixed(1)} 格</b>以內的道路上（河道、地道不行）。`); return;
  }
  if (cell.tower) { selectTower(cell.tower); return; }
  if (canBuild(G, tx, ty)) {
    if (ui.armed) { tryBuild(ui.armed, tx, ty); return; }
    if (ui.selTile && ui.selTile.x === tx && ui.selTile.y === ty && ui.pending) { tryBuild(ui.pending, tx, ty); return; }
    deselect(); ui.selTile = { x: tx, y: ty }; Snd.sfx('click');
    return;
  }
  deselect(); ui.armed = null;
}
function toggleHero() {
  const G = App.game, ui = App.ui; if (!G || !G.hero) return;
  Snd.init();
  if (G.hero.dead) { Snd.sfx('deny'); UI.say(`${G.hero.d.name}正在城堡休養，${Math.ceil(G.hero.respT)} 秒後回來。`); return; }
  const was = ui.selHero;
  deselect(); ui.armed = null; ui.aiming = false;
  ui.selHero = !was;
  Snd.sfx('click');
}
App.toggleHero = toggleHero;
function doCallWave() {
  const G = App.game; if (!G) return;
  Snd.init();
  if (callWave(G, true)) { /* 有音效 */ }
}
function doUpgrade(spec) {
  const G = App.game, t = App.ui.selTower; if (!G || !t) return;
  if (t.tier >= 3) return;
  const c = upCost(G, t, spec < 0 ? 0 : spec);
  if (G.gold < c) { Snd.sfx('deny'); UI.say(`<span class="warn">金幣不夠！需要 ${c}。</span>`); return; }
  upgradeTower(G, t, t.tier === 2 ? (spec < 0 ? 0 : spec) : undefined);
  App.ui.preview = null;
}
function doSell() {
  const G = App.game, t = App.ui.selTower; if (!G || !t) return;
  sellTower(G, t); deselect();
}
function cycleMode() {
  const t = App.ui.selTower; if (!t || TOWERS[t.k].support) return;
  const i = TARGET_MODES.findIndex(m => m[0] === t.mode);
  t.mode = TARGET_MODES[(i + 1) % TARGET_MODES.length][0]; Snd.sfx('click');
}
function skill(k) {
  const G = App.game; if (!G) return;
  Snd.init();
  const s = G.skills[k];
  if (!s.on) { Snd.sfx('deny'); UI.say(`${SKILLS[k].name}會在打贏第 ${SKILLS[k].unlock} 關之後解鎖。`); return; }
  if (G.state !== 'run') { Snd.sfx('deny'); UI.say('第一波開始後才能使用技能。'); return; }
  if (s.cd > 0) { Snd.sfx('deny'); return; }
  if (k === 'meteor') { App.ui.aiming = !App.ui.aiming; deselect(); App.ui.armed = null; }
  else castFreeze(G);
}

// 畫布輸入
let down = null;
cv.addEventListener('pointerdown', e => {
  Snd.init();
  down = { x: e.clientX, y: e.clientY, id: e.pointerId, t: performance.now() };
});
cv.addEventListener('pointerup', e => {
  if (!down || down.id !== e.pointerId) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 14) return;
  if (App.scene === 'play') handleTap(e.clientX, e.clientY);
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || !App.Vplay) return;
  const [wx, wy] = App.Vplay.U(e.clientX, e.clientY);
  App.ui.hover = { wx, wy, tx: Math.floor(wx), ty: Math.floor(wy) };
});
cv.addEventListener('pointerleave', () => { App.ui.hover = null; });
cv.addEventListener('contextmenu', e => { e.preventDefault(); deselect(); App.ui.armed = null; App.ui.aiming = false; });

// 面板按鈕
$('info').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'close') { deselect(); Snd.sfx('click'); }
  else if (a === 'up') doUpgrade(+b.dataset.spec);
  else if (a === 'sell') doSell();
  else if (a === 'mode') { const t = App.ui.selTower; if (t) { t.mode = b.dataset.mode; Snd.sfx('click'); } }
  else if (a === 'hcast') { const G = App.game; if (G && heroCast(G, +b.dataset.i, false)) Snd.sfx('click'); else { Snd.sfx('deny'); UI.say('附近沒有可以打的敵人，或技能還在冷卻。'); } }
});
$('info').addEventListener('pointerover', e => {
  const b = e.target.closest('.up'); const t = App.ui.selTower;
  if (!b || !t) { App.ui.preview = null; return; }
  const d = TOWERS[t.k], sp = +b.dataset.spec;
  const nx = t.tier < 2 ? d.tiers[t.tier + 1] : d.spec[sp < 0 ? 0 : sp];
  App.ui.preview = { range: nx.range * App.game.M.range * (1 + t.buff.range) };
});
$('info').addEventListener('pointerleave', () => { App.ui.preview = null; });
$('pv').addEventListener('click', e => {
  const s = e.target.closest('.en'); if (!s) return;
  const d = ENEMIES[s.dataset.k];
  UI.say(`<b>${d.name}</b>：${esc(d.desc)}`, 4);
});
$('bNext').addEventListener('click', doCallWave);
$('bSpeed').addEventListener('click', () => { Snd.init(); App.speed = App.speed % 3 + 1; Snd.sfx('click'); });
$('bPause').addEventListener('click', () => { Snd.init(); Snd.sfx('click'); setPaused(true); });
$('skMeteor').addEventListener('click', () => skill('meteor'));
$('skFreeze').addEventListener('click', () => skill('freeze'));
$('skHero').addEventListener('click', () => toggleHero());

// 選單
function bindClick(id, fn) { $(id).addEventListener('click', () => { Snd.init(); Snd.sfx('click'); fn(); }); }
bindClick('tPlay', () => toScene('levels'));
bindClick('tMeta', () => { App.metaBack = 'title'; toScene('meta'); });
bindClick('tHelp', () => UI.help());
bindClick('tCodex', () => Codex.open(() => toScene('title')));
bindClick('lCodex', () => Codex.open(() => { UI.show('ovLevels'); UI.levels(); }));
for (const b of document.querySelectorAll('[data-go]')) b.addEventListener('click', () => { Snd.init(); Snd.sfx('click'); if (b.dataset.go === 'meta') App.metaBack = 'levels'; toScene(b.dataset.go); });
bindClick('mBack', () => toScene(App.metaBack || 'title'));
bindClick('mReset', () => { if (Prog.spent() === 0) return; if (confirm('要重置天賦樹，把星星全部退回嗎？')) { Store.data.meta = {}; Store.save(); UI.meta(); } });
for (const b of $('bDiff').children) b.addEventListener('click', () => { Snd.init(); Snd.sfx('click'); App.brief.diff = b.dataset.d; UI.syncDiff(); });
bindClick('bGo', () => startLevel(App.brief.li, App.brief.diff, false));
bindClick('bEndless', () => startLevel(App.brief.li, App.brief.diff, true));
bindClick('bHeroic', () => startLevel(App.brief.li, 'normal', false, null, 'heroic'));
bindClick('lWeekly', () => UI.weekly());
for (const b of $('lActs').children) b.addEventListener('click', () => { Snd.init(); const a = +b.dataset.a; if (!Prog.actOpen(a)) { Snd.sfx('deny'); } else Snd.sfx('click'); UI.setAct(a); });
bindClick('wGo', () => startLevel(0, 'normal', true, null, 'weekly'));
bindClick('wBack', () => { UI.show('ovLevels'); UI.levels(); });
bindClick('bBack', () => { UI.show('ovLevels'); UI.levels(); });
bindClick('pResume', () => setPaused(false));
const modeOf = G => G.weekly ? 'weekly' : G.heroic ? 'heroic' : undefined;
bindClick('pRestart', () => { const G = App.game; saveHero(G); startLevel(G.li, G.diff, G.endless, G.chal, modeOf(G)); });
bindClick('pQuit', () => {
  const G = App.game;
  if (G && G.endless && G.wave >= 0) { G.state = 'lost'; recordResult(G); } else saveHero(G);
  if (G && G.weekly) { toScene('levels'); UI.weekly(); return; }
  toScene('levels');
});
bindClick('pHelp', () => UI.help(() => UI.show('ovPause')));
bindClick('rRetry', () => { const G = App.game; startLevel(G.li, G.diff, G.endless, G.chal, modeOf(G)); });
bindClick('rLevels', () => { const G = App.game; toScene('levels'); if (G && G.weekly) UI.weekly(); });
bindClick('rNext', () => { const G = App.game; toScene('levels'); UI.brief(G.li + 1); });
for (const b of document.querySelectorAll('.tog')) b.addEventListener('click', () => {
  Snd.init();
  const k = b.dataset.opt; Store.data[k] = !Store.data[k]; Store.save();
  if (k === 'music') Snd.setMusic(Store.data.music); else Snd.setSfx(Store.data.sfx);
  Snd.sfx('click'); UI.syncToggles();
});

// 鍵盤
addEventListener('keydown', e => {
  if (e.key === 'Shift') App.shift = true;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  Snd.init();
  const k = e.key.toLowerCase();
  if (App.scene === 'title' && (k === 'enter' || k === ' ')) { toScene('levels'); e.preventDefault(); return; }
  if (App.scene !== 'play' || !App.game) {
    if (k === 'escape') { if (!$('ovHelp').hidden) $('ovHelp').hidden = true; else if (!$('ovBrief').hidden) UI.show('ovLevels'); else if (App.scene !== 'title') toScene('title'); }
    return;
  }
  const G = App.game;
  if (App.paused) { if (k === 'escape' || k === ' ' || k === 'p') { setPaused(false); e.preventDefault(); } return; }
  if (G.state === 'won' || G.state === 'lost') return;
  const ti = TOWER_ORDER.findIndex(t => TOWERS[t].key === k);
  if (ti >= 0) { App.shopTap(TOWER_ORDER[ti]); return; }
  switch (k) {
    case 'escape':
      if (App.ui.aiming || App.ui.armed || App.ui.selTile || App.ui.selTower || App.ui.selHero) { deselect(); App.ui.armed = null; App.ui.aiming = false; }
      else setPaused(true);
      break;
    case ' ': case 'p': setPaused(true); e.preventDefault(); break;
    case 'n': case 'enter': doCallWave(); e.preventDefault(); break;
    case 'f': App.speed = App.speed % 3 + 1; break;
    case 'u': doUpgrade(0); break;
    case 'i': doUpgrade(1); break;
    case 's': case 'delete': case 'backspace': doSell(); break;
    case 't': cycleMode(); break;
    case 'q': skill('meteor'); break;
    case 'w': skill('freeze'); break;
    case 'h': toggleHero(); break;
    case 'e': if (G.hero) heroCast(G, 0, false); break;
    case 'r': if (G.hero) heroCast(G, 1, false); break;
    case 'm': {
      const on = !(Store.data.music || Store.data.sfx);
      Store.data.music = on; Store.data.sfx = on; Store.save(); Snd.setMusic(on); Snd.setSfx(on);
      UI.say(on ? '聲音開啟' : '已靜音', 1.5);
      break;
    }
  }
});
addEventListener('keyup', e => { if (e.key === 'Shift') App.shift = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && App.scene === 'play' && App.game && App.game.state === 'run') setPaused(true); });
// 第一次互動時啟動音效
addEventListener('pointerdown', () => { const was = Snd.ready; Snd.init(); if (!was && Snd.ready) { Snd.setMusic(Store.data.music); Snd.setSfx(Store.data.sfx); Snd.resumeCur(); } }, { capture: true });
addEventListener('keydown', () => { const was = Snd.ready; Snd.init(); if (!was && Snd.ready) { Snd.setMusic(Store.data.music); Snd.setSfx(Store.data.sfx); Snd.resumeCur(); } }, { capture: true });

// ───────── 標題畫面的示範戰鬥 ─────────
function newDemo() {
  const li = Math.floor(Math.random() * LEVELS.length);
  const G = newGame(li, 'easy', { meta: { gold: 3, cheap: 3, bounty: 3, range: 2 }, avail: LEVELS[li].act ? 19 : 7, seed: (Math.random() * 1e6) | 0 });
  G.gold += 300;
  App.demo = G; App.demoBot = { strat: LEVELS[li].act ? 'mix2' : 'mix', seed: 1, meteor: true };
  App.demoT = 0;
}

// ───────── 成就 ─────────
const Ach = {
  dirty: false,
  give(id) {
    if (Store.data.ach[id]) return;
    Store.data.ach[id] = Date.now(); Store.save();
    UI.achToast(id); Snd.sfx('spec');
  },
  event(n, G, a) {
    const T = Store.data.tot;
    if (n === 'kill') { T.kills = (T.kills || 0) + 1; this.dirty = true; if (a.boss) this.give(a.k); if (a._pk) { T.pk = (T.pk || 0) + 1; if (T.pk >= 300) this.give('plague'); } }
    else if (n === 'block') { T.blocks = (T.blocks || 0) + 1; this.dirty = true; if (T.blocks >= 300) this.give('hold300'); }
    else if (n === 'build') { T.built = (T.built || 0) + 1; this.dirty = true; }
    else if (n === 'upgrade' && a.tier === 3) { Store.data.specs[a.k + a.spec] = 1; this.dirty = true; }
  },
  tick(G) {
    const T = Store.data.tot;
    if (G.gold >= 2000) this.give('rich');
    if ((T.kills || 0) >= 1000) this.give('k1000');
    if ((T.kills || 0) >= 10000) this.give('k10000');
    if ((T.built || 0) >= 100) this.give('b100');
    if (Object.keys(Store.data.specs).length >= TOWER_ORDER.length * 2) this.give('specs');
    if (G.endless && !G.weekly && G.wave >= 20 && G.nextT !== null) this.give('e20');
    if (G.endless && !G.weekly && G.wave >= 40 && G.nextT !== null) this.give('e40');
  },
  ended(G, out) {
    if (G.weekly) { if (out.cleared >= 10) this.give('weekly10'); if (out.cleared >= 30) this.give('weekly30'); return; }
    if (G.endless) { if (out.cleared >= 20) this.give('e20'); if (out.cleared >= 40) this.give('e40'); return; }
    if (G.state !== 'won') return;
    this.give('win1');
    if (G.heroic) { this.give('heroic1'); if (Object.keys(Store.data.heroic).length >= 10) this.give('heroic10'); return; }
    if (G.chal) {
      this.give('chal1'); if (G.chal === 'iron') this.give('iron');
      let n = 0; for (const k in Store.data.chal) n += Object.keys(Store.data.chal[k]).length;
      if (n >= 10) this.give('chal10');
      return;
    }
    if (G.stars === 3) this.give('stars3');
    if (G.lives >= G.maxLives) this.give('noleak');
    if (G.diff === 'hard') this.give('hard');
    if (Prog.cleared() >= 5) this.give('half');
    if (Prog.cleared() >= 10) this.give('ten');
    if (Prog.cleared() >= 14) this.give('all');
    if (Prog.cleared() >= 15) this.give('act2');
    if (Prog.cleared() >= LEVELS.length) this.give('all20');
    if (G.L.fog && G.lives >= G.maxLives) this.give('dawn');
  },
  meta() { let n = 0; for (const k in Store.data.meta) n += Store.data.meta[k]; if (n >= 10) this.give('meta'); },
};

// 圖鑑：記錄遇過的敵人
let seenT = 0;
function markSeen(G, dt) {
  if ((seenT -= dt) > 0) return;
  seenT = 0.5;
  let ch = false;
  for (const e of G.enemies) if (!Store.data.seen[e.k]) { Store.data.seen[e.k] = 1; ch = true; }
  if (Ach.dirty) { Ach.dirty = false; ch = true; }
  Ach.tick(G);
  if (ch) Store.save();
}

// ───────── 主迴圈 ─────────
let lastT = performance.now() / 1000;
// 自動畫質：連續一段時間掉到 40fps 以下，就降低解析度與特效（只降不升，避免忽高忽低）
const Perf = { ema: 1 / 60, bad: 0, n: 0 };
function perfWatch(raw) {
  if (document.hidden || raw > 1.2 || App.scene !== 'play') return; // 太久沒畫（切到別的分頁）就不算
  raw = Math.min(raw, 0.2);
  Perf.ema += (raw - Perf.ema) * Math.min(0.5, raw * 3); Perf.n += raw;
  if (Perf.n < 1.5) return; // 開頭 1.5 秒不算（載入、快取暖身）
  if (Perf.ema > 1 / 40) Perf.bad += raw; else Perf.bad = Math.max(0, Perf.bad - raw * 0.5);
  if (Perf.bad > 2.5 && (App.q || 0) < 2) { App.q = (App.q || 0) + 1; Perf.bad = 0; Perf.n = 0; Perf.ema = 1 / 60; layout(); }
}
function loop(now) {
  const t = now / 1000, raw = t - lastT; let dt = Math.min(0.05, raw); lastT = t;
  perfWatch(raw);
  App.time += dt;
  ctx.setTransform(App.dpr, 0, 0, App.dpr, 0, 0);
  const ui = App.ui;
  if (App.scene === 'play' && App.game) {
    const G = App.game;
    if (!App.paused) {
      App.acc += dt * App.speed;
      let n = 0;
      while (App.acc >= STEP && n < 12 * App.speed) {
        step(G, STEP); App.acc -= STEP; n++;
        if (App.bot && (App._bt = (App._bt || 0) + 1) % 15 === 0) botThink(G, App.bot);
      }
      if (App.acc > STEP * 4) App.acc = 0;
      if (ui.banner) ui.banner.t += dt;
      if (G.bossOn === null && App._boss) { App._boss = false; Snd.play(THEMES[G.L.theme].music, 1); }
      if (G.bossOn) App._boss = true;
    }
    if (ui.selTower && !G.towers.includes(ui.selTower)) ui.selTower = null;
    ui.shake = Math.max(0, ui.shake - dt * 2.2);
    // 預覽
    ui.ghost = null;
    if (ui.pending && ui.selTile) ui.ghost = { k: ui.pending, x: ui.selTile.x, y: ui.selTile.y };
    else if (ui.armed && ui.hover && inMap(ui.hover.tx, ui.hover.ty)) ui.ghost = { k: ui.armed, x: ui.hover.tx, y: ui.hover.ty };
    else if (ui.hoverShop && ui.hover && !isTouch && inMap(ui.hover.tx, ui.hover.ty) && false) ui.ghost = null;
    ui.placing = !!(ui.armed || ui.selTile);
    Render.setView(App.Vplay);
    Render.ensureBg(G, App.W, App.H, App.dpr);
    Render.frame(ctx, G, ui, App.time, App.W, App.H, App.paused ? 0 : dt * App.speed);
    UI.tick(G, dt);
    markSeen(G, dt);
  } else {
    if (!App.demo || (App.demo.state !== 'run' && App.demo.state !== 'ready') && (App.demoT += dt) > 3) newDemo();
    const G = App.demo;
    quiet = true;
    for (let i = 0; i < 2; i++) { step(G, STEP); if ((G._bt = (G._bt || 0) + 1) % 20 === 0) botThink(G, App.demoBot); }
    quiet = false;
    Render.setView(App.Vdemo);
    Render.ensureBg(G, App.W, App.H, App.dpr);
    Render.frame(ctx, G, { nextInfo: null, shake: 0 }, App.time, App.W, App.H, dt * 2);
    // 讓背景暗一點、不搶戲
    ctx.fillStyle = 'rgba(12,14,30,.12)'; ctx.fillRect(0, 0, App.W, App.H);
  }
  requestAnimationFrame(loop);
}

// ───────── 啟動 ─────────
function boot() {
  layout();
  UI.buildShop();
  Codex.init();
  $('skMeteor').querySelector('img').src = UI.skillIcon('meteor');
  $('skFreeze').querySelector('img').src = UI.skillIcon('freeze');
  UI.syncToggles();
  Snd.setMusic(Store.data.music); Snd.setSfx(Store.data.sfx);
  newDemo();
  toScene('title');
  requestAnimationFrame(loop);
}
// 字型載好再畫（圖示裡有文字）
if (document.fonts && document.fonts.ready) { let done = false; const go = () => { if (!done) { done = true; boot(); } }; document.fonts.ready.then(go); setTimeout(go, 1500); }
else boot();

// ───────── 測試用掛勾 ─────────
window.__td = {
  get G() { return App.game; }, App, Store, Prog, Perf,
  quality(q) { App.q = q; layout(); },
  start(li, diff, endless, chal, mode) { startLevel(li || 0, diff || 'normal', !!endless, chal, mode); return App.game; },
  weekly() { return Weekly.rules(); },
  rally(t, x, y) { return setRally(App.game, t, x, y); },
  Ach: () => Ach,
  build(k, x, y) { return buildTower(App.game, k, x, y); },
  upgrade(t, spec) { return upgradeTower(App.game, t, spec); },
  sell(t) { return sellTower(App.game, t); },
  wave() { return callWave(App.game, true); },
  speed(n) { App.speed = n; },
  bot(on, hero) { App.bot = on ? { strat: App.game && App.game.L.act ? 'mix2' : 'mix', seed: 1, meteor: true, hero: hero !== false } : null; },
  heroMove(x, y) { return heroMove(App.game, x, y); },
  heroCast(i) { return heroCast(App.game, i, false); },
  selHero() { toggleHero(); },
  ff(sec) { const G = App.game; const n = Math.round(sec / STEP); for (let i = 0; i < n && G.state !== 'won' && G.state !== 'lost'; i++) { step(G, STEP); if (App.bot && i % 15 === 0) botThink(G, App.bot); } return G.state; },
  spots(k) { return botBestSpot(App.game, k || 'arrow'); },
  tap(wx, wy) { const [sx, sy] = App.Vplay.P(wx, wy); handleTap(sx, sy); },
  scene: toScene,
};
