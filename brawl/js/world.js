'use strict';
/* ------------------------------ stages ------------------------------ */
/* Each area is a stretch of street. Waves inside an area come one after another;
   when the last wave is down, "GO →" opens the way to the next area. */
const STAGES = [{
  name: '第一關', title: '怪獸大鬧老街', theme: 'street',
  areas: [
    { to: 1200, waves: [['boar', 'boar'], ['boar', 'boar:L', 'bat']], items: [] },
    { to: 2400, waves: [['boar', 'monkey', 'boar:L'], ['bat', 'boar', 'monkey:L', 'bat']], items: [['stick', 1560, 90], ['milk', 2100, 40]] },
    { to: 3600, waves: [['bear', 'boar:L'], ['monkey', 'boar', 'bat:L', 'boar']], items: [['stone', 2780, 60], ['stone', 2840, 110], ['juice', 3300, 80]] },
    { to: 4800, boss: true, waves: [['dragon', 'boar', 'boar:L']], items: [['milk', 3800, 120], ['stick', 4100, 40]], reinforce: ['boar', 'bat:L', 'boar', 'bat'] }
  ]
}];

let running = false, paused = false;
let menuState = { mode: 'stage', hero: store.get('hero', 'rex'), foes: 1, diff: store.get('diff', 1) };
let Wv = 960, VHv = 540, scale = 1, dpr = 1, viewTop = 0, offY = 0, isTouch = false, portrait = false;
const cv = document.getElementById('game'), ctx = cv.getContext('2d');

function newMatch(o) {
  W = {
    mode: o.mode, D: DIFF[o.diff], diffN: o.diff, fighters: [], projs: [], items: [], parts: [], camX: 0, minX: 0, maxX: 1200, shake: 0, t: 0,
    score: 0, kos: 0, over: false, overT: 0, msg: null, go: false, areaIdx: 0, waveIdx: 0, waveDelay: 0, flashMp: 0, result: null, itemT: 600
  };
  const ctl = new LocalCtl(); ctl.human = true;
  const p = new Fighter(o.hero, 1, 140, 90, ctl); W.player = p; W.fighters.push(p);
  if (o.mode === 'stage') {
    W.stage = STAGES[0]; W.theme = W.stage.theme; W.maxX = W.stage.areas[0].to;
    for (const a of W.stage.areas) for (const [k, x, z] of a.items) spawnItem(k, x, z, false);
    message(W.stage.name, W.stage.title, 120);
    W.waveDelay = 70;
  } else {
    W.theme = 'roof'; W.arena = Math.max(1400, Wv + 100); W.maxX = W.arena; p.x = W.arena / 2 - 220;
    const pool = HEROES.filter(h => h !== o.hero).sort(() => Math.random() - 0.5);
    for (let i = 0; i < o.foes; i++) {
      const f = new Fighter(pool[i % pool.length], 2 + i, W.arena / 2 + 140 + i * 70, 40 + i * 45, new AICtl());
      f.face = -1; f.mp = 200; W.fighters.push(f);
    }
    message('大亂鬥', '最後站著的人獲勝！', 110);
  }
  W.camX = clamp(p.x - Wv / 2, 0, Math.max(0, W.maxX - Wv));
  Sound.startMusic(o.mode === 'stage' ? 'street' : 'battle');
}
function message(txt, sub, dur) { W.msg = { txt, sub, t: 0, dur }; }

function spawnWave(list) {
  for (const s of list) {
    const [id, side] = s.split(':'), left = side === 'L';
    const x = left ? W.camX - 40 - rnd(60) : W.camX + Wv + 40 + rnd(80);
    const f = new Fighter(id, 2, x, rnd(20, FLOOR_D - 20), new AICtl()); f.entering = true; if (f.def.fly) f.y = 40; f.face = left ? 1 : -1;
    W.fighters.push(f);
    if (CHARS[id].boss) { W.boss = f; Sound.startMusic('temple'); Sound.play('gong'); message(CHARS[id].name, '廟口的大怪獸出現了！', 100); }
  }
}

function stageLogic() {
  const S = W.stage, A = S.areas[W.areaIdx], p = W.player;
  const foes = W.fighters.filter(f => f.team !== 1 && !f.dead);
  if (A.reinforce && W.boss && !W.reinforced && W.boss.hp < W.boss.maxHp * 0.5) { W.reinforced = true; spawnWave(A.reinforce); }
  if (W.go) {
    if (p.x > A.to - Wv * 0.55 && W.areaIdx < S.areas.length - 1) { W.go = false; W.areaIdx++; W.waveIdx = 0; W.waveDelay = 30; }
    return;
  }
  if (foes.length) return;
  if (W.waveDelay > 0) { if (--W.waveDelay === 0) { spawnWave(A.waves[W.waveIdx]); W.waveIdx++; } return; }
  if (W.waveIdx < A.waves.length) { W.waveDelay = 40; return; }
  if (W.areaIdx < S.areas.length - 1) { W.go = true; W.maxX = S.areas[W.areaIdx + 1].to; Sound.play('go'); }
  else if (!W.over) finish(true);
}
function battleLogic() {
  const alive = W.fighters.filter(f => !f.dead && !f.dying);
  if (!W.over && W.player.dead === false && alive.length === 1 && alive[0] === W.player) finish(true);
  if (--W.itemT <= 0) { W.itemT = rnd(700, 1100) | 0; spawnItem(pick(['stick', 'stone', 'milk', 'juice', 'stick', 'milk']), rnd(W.camX + 80, W.camX + Wv - 80), rnd(20, FLOOR_D - 20), true); }
}
function finish(win) {
  W.over = true; W.overT = 0; W.win = win;
  if (win) { W.player.pendingWin = true; Sound.jingle('win'); message(W.mode === 'stage' ? '過關！' : '勝利！', '', 150); }
  else { Sound.jingle('lose'); message('倒下了…', '', 150); }
}

/* --------------------------- one simulation step --------------------------- */
function step() {
  W.t++;
  for (const f of W.fighters) { if (f.ctl) f.ctl.poll(); }
  for (const f of W.fighters) { f.update(); if (f.ctl) f.ctl.inp.clearEdges(); }
  // fighters push each other apart a little so crowds don't stack
  const fs = W.fighters;
  for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
    const a = fs[i], b = fs[j]; if (a.dead || b.dead || a.y > 10 || b.y > 10 || a.state === 'lying' || b.state === 'lying') continue;
    const dx = b.x - a.x, dz = b.z - a.z; if (Math.abs(dz) > 8 || Math.abs(dx) > 18) continue;
    const push = (18 - Math.abs(dx)) * 0.08 * sgn(dx || 1); if (!a.entering) a.x -= push; if (!b.entering) b.x += push;
  }
  updateProjs(); updateItems(); updateParts();
  // remove fallen enemies after a while
  for (let i = fs.length - 1; i >= 0; i--) if (fs[i].dead && fs[i] !== W.player && fs[i].st > 110) fs.splice(i, 1);
  if (W.mode === 'stage') stageLogic(); else battleLogic();
  if (!W.over && (W.player.dead)) finish(false);
  if (W.over && ++W.overT === 170) showResult();
  // camera
  const p = W.player;
  const tgt = p.x - Wv * (W.mode === 'stage' ? 0.42 : 0.5);
  if (W.mode === 'stage') {
    const A = W.stage.areas, camMin = W.areaIdx > 0 ? A[W.areaIdx - 1].to - Wv * 0.5 : 0;
    W.camX = Math.max(camMin, Math.min(lerp(W.camX, tgt, 0.1), W.maxX - Wv));
    W.minX = W.camX; W.maxX = W.go ? A[Math.min(W.areaIdx + 1, A.length - 1)].to : A[W.areaIdx].to;
    W.maxXv = Math.min(W.maxX, W.camX + Wv);
  } else {
    W.camX = clamp(lerp(W.camX, tgt, 0.1), 0, Math.max(0, W.arena - Wv)); W.minX = 0; W.maxX = W.arena;
  }
  if (W.shake > 0) W.shake *= 0.85; if (W.shake < 0.3) W.shake = 0;
  if (W.msg && ++W.msg.t > W.msg.dur) W.msg = null;
  if (W.flashMp > 0) W.flashMp--;
}
/* in stage mode fighters (not entering) stay inside the visible window */
const _upd = Fighter.prototype.update;
Fighter.prototype.update = function () {
  _upd.call(this);
  if (W.mode === 'stage' && !this.entering) this.x = clamp(this.x, W.camX + 14, Math.min(W.maxX, W.camX + Wv) - 14);
};

