'use strict';
/* ------------------------------ stages ------------------------------ */
/* Each area is a stretch of street. Waves inside an area come one after another;
   when the last wave is down, "GO →" opens the way to the next area. */
const STAGES = [{
  name: '第一關', title: '怪獸大鬧老街', theme: 'street', music: 'street', bossMusic: 'temple', bossLine: '廟口的大怪獸出現了！',
  areas: [
    { to: 1200, waves: [['boar', 'boar'], ['boar', 'boar:L', 'bat']], items: [['slipper', 700, 120]] },
    { to: 2400, waves: [['boar', 'monkey', 'boar:L'], ['bat', 'boar', 'monkey:L', 'bat']], items: [['stick', 1560, 90], ['milk', 2100, 40]] },
    { to: 3600, waves: [['bear', 'boar:L'], ['monkey', 'boar', 'bat:L', 'boar']], items: [['stone', 2780, 60], ['umbrella', 2900, 110], ['cracker', 3150, 40], ['juice', 3300, 80]] },
    { to: 4800, boss: true, waves: [['dragon', 'boar', 'boar:L']], items: [['chicken', 3800, 120], ['stick', 4100, 40], ['cracker', 4300, 90]], reinforce: ['boar', 'bat:L', 'boar', 'bat'] }
  ]
}, {
  name: '第二關', title: '夜市大混亂', theme: 'market', music: 'night', bossMusic: 'boss2', bossLine: '夜市的老大出來了！',
  areas: [
    { to: 1200, waves: [['cat', 'boar'], ['cat', 'boar:L', 'bat']], items: [['chicken', 800, 60]] },
    { to: 2400, waves: [['monkey', 'cat:L', 'boar'], ['bat', 'cat', 'boar:L', 'monkey']], items: [['slipper', 1500, 100], ['cracker', 2000, 50]] },
    { to: 3600, waves: [['bear', 'cat:L'], ['cat', 'cat:L', 'monkey', 'bat']], items: [['umbrella', 2700, 80], ['milk', 3200, 120]] },
    { to: 4800, boss: true, waves: [['raccoon', 'cat', 'boar:L']], items: [['chicken', 3900, 40], ['cracker', 4200, 110]], reinforce: ['cat', 'cat:L', 'bat'] }
  ]
}, {
  name: '第三關', title: '山上的茶園', theme: 'tea', music: 'mountain', bossMusic: 'boss2', bossLine: '茶園的主人生氣了！',
  areas: [
    { to: 1200, waves: [['monkey', 'magpie'], ['boar', 'monkey:L', 'magpie']], items: [['stick', 700, 80]] },
    { to: 2400, waves: [['cat', 'magpie', 'boar:L'], ['monkey', 'monkey:L', 'magpie', 'cat']], items: [['juice', 1700, 60], ['stone', 2100, 120]] },
    { to: 3600, waves: [['bear', 'magpie:L'], ['bear', 'cat', 'monkey:L']], items: [['milk', 2900, 80], ['umbrella', 3200, 40]] },
    { to: 4800, boss: true, waves: [['blackbear', 'boar', 'monkey:L']], items: [['chicken', 3800, 100], ['stick', 4100, 60]], reinforce: ['bear', 'magpie:L'] }
  ]
}, {
  name: '第四關', title: '漁港決戰', theme: 'harbor', music: 'harbor', bossMusic: 'boss2', bossLine: '海裡的大傢伙上岸了！',
  areas: [
    { to: 1200, waves: [['crab', 'crab:L'], ['crab', 'octopus', 'boar:L']], items: [['slipper', 800, 60]] },
    { to: 2400, waves: [['octopus', 'crab', 'magpie:L'], ['crab', 'crab:L', 'octopus', 'cat']], items: [['umbrella', 1600, 100], ['milk', 2100, 40]] },
    { to: 3600, waves: [['bear', 'crab:L', 'octopus'], ['crab', 'octopus:L', 'crab', 'magpie']], items: [['cracker', 2800, 80], ['chicken', 3300, 120]] },
    { to: 4800, boss: true, waves: [['bigocto', 'crab', 'crab:L']], items: [['juice', 3800, 60], ['umbrella', 4000, 120]], reinforce: ['octopus', 'octopus:L'] }
  ]
}];
/* Short scenes before and after each stage. who: 'hero' is 1P, 'buddy' is 2P (or a friend), others are monsters. */
const STORY = {
  intro0: [['hero', '怪獸跑進老街了！大家快來幫忙！'], ['boar', '噗嚕噗嚕！這條街的雞排好香喔！'], ['hero', '想吃東西要排隊，不可以搗蛋！']],
  outro0: [['dragon', '嗚嗚……我只是聽說夜市很好玩……'], ['dragon', '是夜市的狸貓大王叫大家一起來的！'], ['hero', '那我們去夜市找牠問清楚！']],
  intro1: [['hero', '晚上的夜市好熱鬧……咦，攤子都被弄亂了！'], ['cat', '喵嗚！這些小吃都是大王的！'], ['buddy', '小吃是大家的，一起排隊買啦！']],
  outro1: [['raccoon', '好啦好啦，我認輸！我只是肚子太餓了……'], ['raccoon', '山上的黑熊王說，牠的茶園也被弄得亂七八糟，大家只好跑下山找東西吃。'], ['hero', '我們去山上看看發生什麼事！']],
  intro2: [['hero', '茶園好漂亮，可是好多怪獸在亂跑。'], ['magpie', '嘎嘎！不准靠近黑熊王的茶園！']],
  outro2: [['blackbear', '吼……你們好厲害。'], ['blackbear', '其實是海邊的大章魚把河口堵住了，山上的溪水流不下去，茶樹都快乾掉了……'], ['buddy', '那就去漁港把事情解決吧！']],
  intro3: [['hero', '漁港到了！螃蟹和章魚把碼頭佔領了！'], ['crab', '橫著走！橫著走！不准過來！']],
  outro3: [['bigocto', '對不起……我一個人在海裡好無聊，想要大家陪我玩。'], ['hero', '想要朋友，可以直接說呀！'], ['bigocto', '那……我可以一起去逛夜市嗎？'], ['buddy', '當然可以！大家一起去吃雞排、喝珍奶吧！']]
};

let running = false, paused = false;
let menuState = {
  mode: 'stage', players: 1, heroes: store.get('heroes', [store.get('hero', 'rex'), 'yuki']), slotSel: 0, foes: 1, diff: store.get('diff', 1),
  team: 'ffa', lives: 1, time: 0, arena: store.get('arena', 'roof'), stage: 0
};
let Wv = 960, VHv = 540, scale = 1, dpr = 1, viewTop = 0, offY = 0, isTouch = false, portrait = false;
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const SLOT_COL = ['#ffcc33', '#3fa9ff', '#38d39f', '#ff7aa8'];
const STAGE_LIVES = [3, 2, 1];
/* battle arenas: theme picks the background; hazard (optional) runs every step */
const ARENAS = {
  roof: { name: '公寓頂樓', theme: 'roof', music: 'battle' },
  market: { name: '夜市', theme: 'market', music: 'temple', hazard: 'scooter', items: ['chicken', 'milk', 'cracker', 'slipper', 'stick', 'juice', 'chicken', 'cracker'] },
  park: { name: '公園', theme: 'park', music: 'street', items: ['slipper', 'umbrella', 'stick', 'stone', 'milk', 'juice', 'slipper'] },
  mrt: { name: '捷運站', theme: 'mrt', music: 'battle', hazard: 'train', items: ['umbrella', 'milk', 'juice', 'slipper', 'stick'] },
  beach: { name: '海邊', theme: 'beach', music: 'street', hazard: 'tide', items: ['stone', 'slipper', 'milk', 'juice', 'cracker', 'umbrella'] }
};
const BATTLE_ITEMS = ['stick', 'umbrella', 'stone', 'slipper', 'cracker', 'milk', 'juice', 'chicken', 'stick', 'milk'];
/* Arena hazards. Scooters ride through the night market (after a horn and a warning sign),
   the tide at the beach washes in from the back and pushes everyone forward, and at the
   MRT station a train comes and goes in the background. */
const HAZARDS = {
  scooter(W) {
    const H = W.hz || (W.hz = { next: 540, warn: 0 });
    if (H.warn > 0) {
      if (--H.warn === 0) { W.hazEnts.push({ kind: 'scooter', x: H.dir > 0 ? W.camX - 90 : W.camX + Wv + 90, z: H.z, vx: H.dir * 9.5, hit: new Set(), col: pick(['#ff5a4a', '#3fa9ff', '#ffcc33', '#f4f1ea']) }); H.next = rnd(520, 900) | 0; }
      return;
    }
    if (--H.next <= 0) { H.dir = pick([-1, 1]); H.z = rnd(20, FLOOR_D - 20); H.warn = 80; Sound.play('honk'); }
  },
  train(W) {
    const T = W.train || (W.train = { x: null, ph: 'wait', t: 300, doors: 0 }), stop = W.arena / 2 - 690;
    T.t--;
    if (T.ph === 'wait' && T.t <= 0) { T.ph = 'in'; T.t = 140; T.x = stop + 1800; Sound.play('train'); }
    else if (T.ph === 'in') { T.x = stop + 1800 * Math.pow(T.t / 140, 2); if (T.t <= 0) { T.ph = 'stop'; T.t = 220; } }
    else if (T.ph === 'stop') { T.doors = Math.min(1, T.doors + 0.05) * (T.t > 30 ? 1 : T.t / 30); if (T.t <= 0) { T.ph = 'out'; T.t = 140; T.doors = 0; Sound.play('train', 0.6); } }
    else if (T.ph === 'out') { T.x = stop - 1800 * Math.pow(1 - T.t / 140, 2); if (T.t <= 0) { T.ph = 'wait'; T.t = rnd(600, 900) | 0; T.x = null; } }
  },
  tide(W) {
    const H = W.hz || (W.hz = { next: 600, t: 0 });
    if (H.t > 0) {
      H.t--; const k = H.t > 150 ? (240 - H.t) / 90 : H.t > 90 ? 1 : H.t / 90; W.tide = k;
      if (H.t > 90) for (const f of W.fighters) if (!f.dead && f.y < 20 && f.z < k * 75 + 6 && !f.def.fly) { f.z = Math.min(FLOOR_D - 6, f.z + 1.8); if (f.canAct() && f.state !== 'run') f.vx *= 0.6; }
      if (H.t === 0) { W.tide = 0; H.next = rnd(600, 900) | 0; }
      return;
    }
    if (--H.next <= 0) { H.t = 240; Sound.play('wave'); message('浪來了！', '', 50); }
  }
};
function updateHazards() {
  for (let i = W.hazEnts.length - 1; i >= 0; i--) {
    const h = W.hazEnts[i]; h.x += h.vx;
    for (const v of W.fighters) {
      if (v.dead || h.hit.has(v) || v.y > 30 || Math.abs(v.z - h.z) > 18 || Math.abs(v.x - h.x) > 34) continue;
      h.hit.add(v); applyHit(null, v, { dmg: 30, kb: 6, kbY: 6, launch: true, unblock: true, sfx: 'heavy' }, sgn(h.vx), true);
    }
    if (h.x < W.camX - 300 || h.x > W.camX + Wv + 300) W.hazEnts.splice(i, 1);
  }
}
function heroUnlocked(id) { return true; }

function newMatch(o) {
  const nH = o.players;
  W = {
    mode: o.mode, D: DIFF[o.diff], diffN: o.diff, fighters: [], projs: [], items: [], parts: [], camX: 0, minX: 0, maxX: 1200, shake: 0, t: 0,
    score: 0, kos: 0, over: false, overT: 0, msg: null, go: false, areaIdx: 0, waveIdx: 0, waveDelay: 0, result: null, itemT: 600,
    players: [], hazEnts: [], tide: 0, hpScale: 1 + 0.4 * (nH - 1), team: o.team, livesRule: o.lives, timeLeft: o.mode === 'battle' && o.time ? o.time * 60 : 0
  };
  if (!o.remoteCtls) Touch.setup(nH);
  for (let i = 0; i < nH; i++) {
    const ctl = o.remoteCtls ? o.remoteCtls[i] : new HumanCtl(i, localSources(i, nH));
    const team = o.mode === 'battle' && o.team === 'ffa' ? 1 + i : 1;
    const f = new Fighter(o.heroes[i] || 'rex', team, 140 + i * 50, 70 + i * 40, ctl);
    f.slot = i; f.human = true; f.lives = o.mode === 'battle' ? o.lives : STAGE_LIVES[o.diff];
    W.players.push(f); W.fighters.push(f);
  }
  W.player = W.players[0];
  if (o.mode === 'stage') {
    W.stageN = o.stage || 0; W.stage = STAGES[W.stageN]; W.theme = W.stage.theme; W.maxX = W.stage.areas[0].to;
    for (const a of W.stage.areas) for (const [k, x, z] of a.items) spawnItem(k, x, z, false);
    message(W.stage.name, W.stage.title, 120);
    W.waveDelay = 70;
    Sound.startMusic(W.stage.music || 'street');
  } else {
    const A = ARENAS[o.arena === 'random' ? pick(Object.keys(ARENAS)) : o.arena] || ARENAS.roof;
    W.arenaDef = A; W.theme = A.theme; W.arena = Math.max(A.width || 1400, Wv + 100); W.maxX = W.arena;
    W.players.forEach((p, i) => { p.x = W.arena / 2 - 240 + i * 90; p.z = 50 + i * 50; p.face = 1; });
    // computer fighters
    const used = new Set(o.heroes.slice(0, nH));
    const pool = HEROES.filter(h => !used.has(h) && heroUnlocked(h)).sort(() => Math.random() - 0.5);
    const allPool = HEROES.filter(heroUnlocked);
    let foes = o.foes; if (foes === 0 && (nH === 1 || o.team === 'team')) foes = 1;
    for (let i = 0; i < foes; i++) {
      let team = o.team === 'ffa' ? 10 + i : 2;
      if (o.team === 'team' && nH === 1 && foes >= 2 && i === 0) team = 1;     // a computer buddy for a lone player
      const id = pool.length ? pool[i % pool.length] : pick(allPool);
      const f = new Fighter(id, team, W.arena / 2 + 160 + i * 70, 30 + i * 45, new AICtl());
      if (team === 1) { f.x = W.arena / 2 - 300; f.ally = true; }
      f.face = team === 1 ? 1 : -1; f.mp = 200; f.lives = o.lives; W.fighters.push(f);
    }
    message(o.team === 'team' ? '組隊對戰' : '大亂鬥', o.lives > 1 ? `每人 ${o.lives} 條命，最後留下的獲勝！` : '最後站著的人獲勝！', 110);
    Sound.startMusic(A.music || 'battle');
  }
  W.camX = clamp(humanCenter() - Wv / 2, 0, Math.max(0, W.maxX - Wv));
}
function message(txt, sub, dur) { W.msg = { txt, sub, t: 0, dur }; }
function aliveHumans() { return W.players.filter(p => !p.dead); }
function humanCenter() { const a = aliveHumans(), l = a.length ? a : W.players; return l.reduce((s, p) => s + p.x, 0) / l.length; }
const isOut = f => f.dead && !(f.lives > 0);

function spawnWave(list) {
  for (const s of list) {
    const [id, side] = s.split(':'), left = side === 'L';
    const x = left ? W.camX - 40 - rnd(60) : W.camX + Wv + 40 + rnd(80);
    const f = new Fighter(id, 2, x, rnd(20, FLOOR_D - 20), new AICtl()); f.entering = true; if (f.def.fly) f.y = 40; f.face = left ? 1 : -1;
    W.fighters.push(f);
    if (CHARS[id].boss) { W.boss = f; Sound.startMusic(W.stage.bossMusic || 'temple'); Sound.play('gong'); message(CHARS[id].name, W.stage.bossLine || '大怪獸出現了！', 100); }
  }
}

function stageLogic() {
  const S = W.stage, A = S.areas[W.areaIdx];
  const foes = W.fighters.filter(f => f.team !== 1 && !f.dead);
  if (A.reinforce && W.boss && !W.reinforced && W.boss.hp < W.boss.maxHp * 0.5) { W.reinforced = true; spawnWave(A.reinforce); }
  if (W.go) {
    const lead = Math.max(...aliveHumans().map(p => p.x));
    if (lead > A.to - Wv * 0.55 && W.areaIdx < S.areas.length - 1) { W.go = false; W.areaIdx++; W.waveIdx = 0; W.waveDelay = 30; }
    return;
  }
  if (foes.length) return;
  if (W.waveDelay > 0) { if (--W.waveDelay === 0) { spawnWave(A.waves[W.waveIdx]); W.waveIdx++; } return; }
  if (W.waveIdx < A.waves.length) { W.waveDelay = 40; return; }
  if (W.areaIdx < S.areas.length - 1) { W.go = true; W.maxX = S.areas[W.areaIdx + 1].to; Sound.play('go'); }
  else if (!W.over) finish(true);
}
/* team standing for the time-out tiebreak: lives left first, then health */
function teamScore(team) { return W.fighters.filter(f => f.team === team).reduce((s, f) => s + (isOut(f) ? 0 : (f.lives || 1) * 1000 + Math.max(0, f.hp)), 0); }
function battleLogic() {
  if (W.over) return;
  const teams = [...new Set(W.fighters.filter(f => !isOut(f) && !(f.dying && !f.dead && (f.lives || 0) <= 1)).map(f => f.team))];
  if (W.timeLeft > 0 && --W.timeLeft === 0) {
    const all = [...new Set(W.fighters.map(f => f.team))].sort((a, b) => teamScore(b) - teamScore(a));
    return endBattle(teamScore(all[0]) === teamScore(all[1]) ? null : all[0], true);
  }
  if (teams.length <= 1) return endBattle(teams[0] ?? null, false);
  if (--W.itemT <= 0) { W.itemT = rnd(600, 1000) | 0; spawnItem(pick(W.arenaDef.items || BATTLE_ITEMS), rnd(W.camX + 80, W.camX + Wv - 80), rnd(20, FLOOR_D - 20), true); }
  if (W.arenaDef.hazard) HAZARDS[W.arenaDef.hazard](W);
}
function endBattle(team, timeUp) {
  W.winTeam = team;
  const winners = W.fighters.filter(f => f.team === team);
  const humanWin = winners.some(f => f.human);
  let label;
  if (team === null) label = '平手！';
  else if (W.players.length > 1 && W.team === 'ffa') { const h = winners.find(f => f.human); label = h ? `${h.slot + 1}P 勝利！` : '電腦獲勝'; }
  else label = humanWin ? '勝利！' : '戰敗…';
  finish(humanWin || team === null, label, timeUp ? '時間到！' : '');
}
function finish(win, label, sub) {
  W.over = true; W.overT = 0; W.win = win; W.label = label || (win ? (W.mode === 'stage' ? '過關！' : '勝利！') : '倒下了…');
  if (win) for (const p of W.fighters) if (!p.dead && (W.mode === 'stage' ? p.human : p.team === W.winTeam)) p.pendingWin = true;
  Sound.jingle(win ? 'win' : 'lose'); message(W.label, sub || '', 150);
}
function respawn(f) {
  f.dead = false; f.dying = false; f.invisible = false; f.hp = f.cap = f.hpLag = f.maxHp; f.mp = Math.max(f.mp, 200); f.fallMeter = 0; f.hold = null;
  const others = aliveHumans().filter(p => p !== f);
  f.x = W.mode === 'stage' && others.length ? others[0].x : clamp(W.camX + Wv * rnd(0.3, 0.7), W.minX + 40, W.maxX - 40);
  f.z = rnd(30, FLOOR_D - 30); f.y = 320; f.vy = 0; f.vx = 0; f.set('jump'); f.didAirAtk = true; f.invul = 160;
  addPart('text', f.x, 100, f.z, { txt: f.human ? (f.slot + 1) + 'P' : '', col: SLOT_COL[f.slot || 0], life: 60 });
}

/* --------------------------- one simulation step --------------------------- */
function step() {
  W.t++;
  for (const f of W.fighters) { if (f.ctl) f.ctl.poll(); }
  for (const f of W.fighters) { f.update(); if (f.ctl) f.ctl.inp.clearEdges(); if (f.flashMp > 0) f.flashMp--; }
  // fighters push each other apart a little so crowds don't stack
  const fs = W.fighters;
  for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
    const a = fs[i], b = fs[j]; if (a.dead || b.dead || a.y > 10 || b.y > 10 || a.state === 'lying' || b.state === 'lying') continue;
    const dx = b.x - a.x, dz = b.z - a.z; if (Math.abs(dz) > 8 || Math.abs(dx) > 18) continue;
    const push = (18 - Math.abs(dx)) * 0.08 * sgn(dx || 1); if (!a.entering) a.x -= push; if (!b.entering) b.x += push;
  }
  updateProjs(); updateItems(); updateParts(); updateHazards();
  // knocked-out fighters with lives left come back; the rest are cleared away after a while
  for (const f of fs) if (f.dead && f.respawnT > 0 && --f.respawnT === 0 && !W.over) respawn(f);
  for (let i = fs.length - 1; i >= 0; i--) if (fs[i].dead && !fs[i].human && !(fs[i].lives > 0) && fs[i].st > 110) fs.splice(i, 1);
  if (W.mode === 'stage') stageLogic(); else battleLogic();
  if (!W.over && W.players.every(isOut)) {
    if (W.mode === 'stage') finish(false);
    else { const rest = W.fighters.find(f => !isOut(f)); endBattle(rest ? rest.team : null, false); }
  }
  if (W.over && ++W.overT === 170) {
    if (W.mode === 'stage' && W.win && STORY['outro' + W.stageN] && !W.outroDone) { W.outroDone = true; showStory(STORY['outro' + W.stageN], showResult); }
    else showResult();
  }
  // camera follows the players (the middle of them when two play)
  const tgt = humanCenter() - Wv * (W.mode === 'stage' ? 0.42 : 0.5);
  if (W.mode === 'stage') {
    const A = W.stage.areas, camMin = W.areaIdx > 0 ? A[W.areaIdx - 1].to - Wv * 0.5 : 0;
    W.camX = Math.max(camMin, Math.min(lerp(W.camX, tgt, 0.1), W.maxX - Wv));
    W.minX = W.camX; W.maxX = W.go ? A[Math.min(W.areaIdx + 1, A.length - 1)].to : A[W.areaIdx].to;
  } else {
    W.camX = clamp(lerp(W.camX, tgt, 0.1), 0, Math.max(0, W.arena - Wv)); W.minX = 0; W.maxX = W.arena;
  }
  if (W.shake > 0) W.shake *= 0.85; if (W.shake < 0.3) W.shake = 0;
  if (W.msg && ++W.msg.t > W.msg.dur) W.msg = null;
}
/* players (and in stage mode everyone who has walked in) stay inside the visible window */
const _upd = Fighter.prototype.update;
Fighter.prototype.update = function () {
  _upd.call(this);
  if (this.entering) return;
  if (W.mode === 'stage' || (this.human && W.players.length > 1)) this.x = clamp(this.x, W.camX + 14, Math.min(W.maxX, W.camX + Wv) - 14);
};
