'use strict';
/* ------------------------------ challenge modes and new items ------------------------------
   挑戰模式:
   - 無盡挑戰塔: floor after floor of monsters that keep getting tougher, a boss every fifth
     floor, a short rest between floors. The best floor is saved (and unlocks 阿棒 at 10).
   - 魔王連戰: the bosses of every cleared story stage, one after another, against the clock.
   Both run on the story-stage engine with a stage built on the fly (W.challenge says which).
   New items: 球棒 (a heavy weapon), 沖天炮 (flies straight and bursts), 芒果冰 (fills the
   gold ultimate meter). */

/* ---------------- items ---------------- */
Object.assign(ITEMS, {
  bbat: { name: '球棒', type: 'weapon', dur: 8, reach: 1.25, chip: '#d9a66a', power: 1.35 },
  rocket: { name: '沖天炮', type: 'throw', explode: true, speed: 12.5, vy: 1.2, rocket: true },
  mango: { name: '芒果冰', type: 'food', hp: 1.6, mp: 1.2, ult: 45, time: 50 }
});
BATTLE_ITEMS.push('bbat', 'rocket', 'mango');
{
  const _hit = applyHit;
  applyHit = function (att, v, A, dir, area) {
    if (att && att.hold && A.weapon && ITEMS[att.hold.kind] && ITEMS[att.hold.kind].power) { const k = ITEMS[att.hold.kind].power; A = Object.assign({}, A, { dmg: A.dmg * k, kb: (A.kb || 2) * 1.25 }); }
    return _hit(att, v, A, dir, area);
  };
  const _ui = updateItems;
  updateItems = function () {
    for (const it of W.items) if (it.kind === 'rocket' && it.fly) { it.vy += 0.19; if (W.t % 2 === 0) addPart('spark', it.x - sgn(it.vx) * 14, it.y, it.z, { col: pick(['#ffcc33', '#ff7a3d']), life: 8 }); }
    _ui();
    for (const it of W.items) if (it.kind === 'rocket' && it.fuse > 3) it.fuse = 3;   // bursts the moment it lands
  };
  const _up = Fighter.prototype.update;
  Fighter.prototype.update = function () {
    if (this.state === 'drink' && this.st === 0 && this.drinkKind && ITEMS[this.drinkKind].ult && HEROES.includes(this.id)) { this.ult = Math.min(ULT_MAX, this.ult + ITEMS[this.drinkKind].ult); this.flashUlt = 30; addPart('text', this.x, 100, this.z, { txt: '絕招 +', col: '#ffd34d', life: 40 }); }
    return _up.call(this);
  };
  const _di = drawItem;
  drawItem = function (c, it) {
    const T = ITEMS[it.kind]; if (!T || !(it.kind === 'bbat' || it.kind === 'rocket' || it.kind === 'mango')) return _di(c, it);
    const x = it.x, gy = FLOOR_TOP + it.z, y = gy - it.y;
    c.fillStyle = 'rgba(20,16,40,.25)'; c.beginPath(); c.ellipse(x, gy, 14, 4, 0, 0, TAU); c.fill();
    c.save(); c.translate(x, y - (it.y > 0 ? 0 : 4)); c.lineCap = 'round';
    if (it.kind === 'bbat') { c.rotate(it.fly ? it.spin : -0.1); seg(c, [P2(-24, 2), P2(-4, 0)], 4, '#c8945a'); seg(c, [P2(-6, 0), P2(24, -2)], 8, '#d9a66a'); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-2, -4, 22, 1.5); blob(c, -25, 2, 3, 3, '#2b2733'); }
    else if (it.kind === 'rocket') { c.rotate(it.fly ? Math.atan2(-it.vy, it.vx) * (it.vx < 0 ? 1 : 1) : -0.5); seg(c, [P2(-22, 0), P2(-4, 0)], 2, '#8a5a2f'); c.beginPath(); c.roundRect ? c.roundRect(-6, -5, 20, 10, 3) : c.rect(-6, -5, 20, 10); c.fillStyle = '#e8432f'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#ffcc33'; c.fillRect(0, -5, 4, 10); c.beginPath(); c.moveTo(14, -5); c.lineTo(20, 0); c.lineTo(14, 5); c.closePath(); c.fillStyle = '#ffcc33'; c.fill(); c.stroke(); }
    else if (it.kind === 'mango') { // 芒果冰: a bowl of shaved ice with mango cubes on top
      c.beginPath(); c.moveTo(-13, -10); c.lineTo(13, -10); c.lineTo(8, 0); c.lineTo(-8, 0); c.closePath(); c.fillStyle = '#5fb8ff'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.ellipse(0, -12, 13, 11, 0, Math.PI, 0); c.fillStyle = '#fff6e6'; c.fill(); c.stroke();
      c.fillStyle = '#ffb81c'; for (const [mx, my] of [[-6, -16], [1, -20], [6, -14], [-1, -13]]) { c.fillRect(mx - 2.5, my - 2.5, 5, 5); } c.strokeStyle = '#e8732a'; c.lineWidth = 1; for (const [mx, my] of [[-6, -16], [1, -20], [6, -14], [-1, -13]]) c.strokeRect(mx - 2.5, my - 2.5, 5, 5);
      c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(4, -22, 2, 0, TAU); c.fill(); }
    c.restore();
    if (!it.fly && !it.holder && it.y <= 0 && (W.t >> 4) & 1) { c.strokeStyle = 'rgba(255,230,120,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, gy, 18, 5, 0, 0, TAU); c.stroke(); }
  };
}
/* the new items show up along the second-part stages and in the arenas */
[[4, 1, ['bbat', 1800, 60]], [5, 2, ['mango', 3000, 130]], [6, 0, ['rocket', 900, 120]], [6, 3, ['bbat', 4200, 80]], [7, 1, ['rocket', 1700, 50]], [7, 3, ['mango', 4100, 80]]]
  .forEach(([s, a, item]) => STAGES[s] && STAGES[s].areas[a].items.push(item));
ARENAS.city.items.push('rocket', 'rocket', 'mango'); ARENAS.forest.items.push('bbat'); ARENAS.lake.items.push('mango'); ARENAS.jiufen.items.push('rocket', 'bbat');
ARENAS.park.items.push('bbat'); ARENAS.roof.items = ['stick', 'umbrella', 'stone', 'slipper', 'cracker', 'milk', 'juice', 'chicken', 'bbat', 'mango'];

/* ---------------- challenge stages ---------------- */
const TOWER_THEMES = ['street', 'market', 'tea', 'harbor', 'jiufen', 'lake', 'forest', 'city'];
const TOWER_MUSIC = { street: 'street', market: 'night', tea: 'mountain', harbor: 'harbor', jiufen: 'jiufen', lake: 'lake', forest: 'forest', city: 'city' };
const TOWER_BOSSES = ['dragon', 'raccoon', 'blackbear', 'bigocto', 'owl', 'bigfish', 'queen', 'leopard'];
const TOWER_POOLS = [['boar', 'bat', 'monkey'], ['cat', 'civet'], ['magpie', 'crab', 'egret'], ['octopus', 'squirrel', 'hornet'], ['bear', 'beetle']];
const FLOOR_W = 1400;
function towerFloor(n) { // n counts from 1
  const tier = Math.floor((n - 1) / 5), theme = TOWER_THEMES[tier % TOWER_THEMES.length], to = n * FLOOR_W;
  const pool = TOWER_POOLS.slice(0, Math.min(TOWER_POOLS.length, 2 + tier)).flat();
  const food = n % 2 ? pick(['milk', 'juice', 'chicken', 'mango']) : pick(['milk', 'chicken']);
  const items = [[food, to - FLOOR_W + 500, rnd(40, 130) | 0], [pick(['stick', 'slipper', 'stone', 'cracker', 'umbrella', 'bbat', 'rocket']), to - FLOOR_W + 760, rnd(30, 140) | 0]];
  if (n % 5 === 0) {
    const boss = TOWER_BOSSES[(n / 5 - 1) % TOWER_BOSSES.length];
    return { to, floor: n, theme, boss: true, waves: [[boss, pick(pool), pick(pool) + ':L']], items, reinforce: [pick(pool), pick(pool) + ':L'].concat(n >= 20 ? [pick(pool)] : []) };
  }
  const nw = n < 3 ? 1 : n < 9 ? 2 : 3, size = Math.min(5, 2 + Math.floor(n / 4)), waves = [];
  for (let w = 0; w < nw; w++) { const list = []; for (let k = 0; k < size - (w === 0 && n > 1 ? 1 : 0); k++) list.push(pick(pool) + (k % 3 === 2 ? ':L' : '')); waves.push(list); }
  return { to, floor: n, theme, waves, items, hazard: n > 5 ? { lake: 'wake', forest: 'logs', city: 'fireworks' }[theme] : undefined };
}
function challengeStage(kind) {
  if (kind === 'tower') return { name: '挑戰塔', title: '第 1 層', theme: 'street', music: 'street', bossMusic: 'boss2', bossLine: '守關的魔王出現了！', areas: [towerFloor(1), towerFloor(2)] };
  // boss rush: the boss of every cleared story stage (at least the first four)
  const cleared = store.get('cleared', []), list = STAGES.map((s, i) => i).filter(i => i < 4 || cleared.includes(i) || store.get('unlockAll', false));
  const areas = list.map((si, k) => {
    const S = STAGES[si], A = S.areas[S.areas.length - 1];
    return { to: (k + 1) * FLOOR_W, boss: true, stageI: si, theme: S.theme, bossMusic: S.bossMusic, waves: [A.waves[0].slice(0, 2)], items: [[pick(['milk', 'chicken', 'mango']), k * FLOOR_W + 500, 90]], reinforce: A.reinforce.slice(0, 2), bossLine: S.bossLine };
  });
  return { name: '魔王連戰', title: '', theme: areas[0].theme, music: 'boss2', bossMusic: areas[0].bossMusic, bossLine: areas[0].bossLine, areas };
}
const CHAL_INFO = {
  tower: { name: '無盡挑戰塔', desc: '一層一層往上打，怪獸越來越強，每 5 層有一個守關魔王。每過一層會補一點血。' },
  rush: { name: '魔王連戰', desc: '打過的魔王一個接一個上場，中間只補一點血，看看多快可以全部打完。' }
};
function rushUnlocked() { return store.get('cleared', []).includes(3) || store.get('unlockAll', false); }

{
  const _nm = newMatch;
  newMatch = function (o) {
    if (o.mode !== 'challenge') return _nm(o);
    _nm(Object.assign({}, o, { mode: 'stage', stage: 0 }));
    const S = challengeStage(o.chal === 'rush' ? 'rush' : 'tower');
    W.challenge = o.chal === 'rush' ? 'rush' : 'tower'; W.stage = S; W.stageN = W.challenge; W.theme = S.theme; W.maxX = S.areas[0].to; W.floor = 1; W.baseHp = W.hpScale; W.baseD = W.D;
    W.items = []; for (const a of S.areas) for (const [k, x, z] of a.items) spawnItem(k, x, z, false);
    message(S.name, W.challenge === 'tower' ? '第 1 層' : `一共 ${S.areas.length} 個魔王`, 120);
    Sound.startMusic(W.challenge === 'tower' ? 'street' : 'boss2');
    W.camX = 0;
  };
  /* the next floor / boss: new background and music, tougher monsters, a short rest */
  const enterArea = () => {
    const S = W.stage, A = S.areas[W.areaIdx];
    if (W.challenge === 'tower') {
      W.floor = A.floor; S.title = `第 ${A.floor} 層`;
      const n = A.floor; W.hpScale = W.baseHp * (1 + 0.06 * (n - 1)); W.D = Object.assign({}, W.baseD, { eDmg: W.baseD.eDmg * Math.min(1.9, 1 + 0.035 * (n - 1)), atkCd: Math.max(W.baseD.atkCd * 0.65, W.baseD.atkCd * (1 - 0.012 * (n - 1))) });
      S.bossMusic = 'boss2'; S.bossLine = `第 ${n} 層的守關魔王！`;
      if (S.areas.length - W.areaIdx < 3) { const m = S.areas[S.areas.length - 1].floor + 1; const F = towerFloor(m); S.areas.push(F); for (const [k, x, z] of F.items) spawnItem(k, x, z, false); }
      if (n > 1) message(`第 ${n} 層`, A.boss ? '守關魔王在這一層！' : '', 80);
    } else {
      S.bossMusic = A.bossMusic; S.bossLine = A.bossLine;
      if (W.areaIdx > 0) message(`第 ${W.areaIdx + 1} 個魔王`, `還剩 ${S.areas.length - W.areaIdx} 個`, 80);
    }
    if (A.theme !== W.theme) { W.theme = A.theme; W.flashT = 10; if (W.challenge === 'tower') Sound.startMusic(TOWER_MUSIC[A.theme] || 'street'); }
    W.boss = null; W.reinforced = false;
    if (W.areaIdx > 0) for (const p of W.players) if (!p.dead) { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * (W.challenge === 'tower' ? 0.22 : 0.3)); p.cap = Math.max(p.cap, p.hp); p.mp = Math.min(p.maxMp, p.mp + 120); addPart('text', p.x, 100, p.z, { txt: '+', col: '#ff6f9a', life: 40 }); }
  };
  const _sl = stageLogic;
  stageLogic = function () {
    if (W.challenge && W.enteredArea !== W.areaIdx) { W.enteredArea = W.areaIdx; enterArea(); }
    if (W.challenge === 'tower' && !W.over && !W.go) { // a cleared floor is recorded right away
      const A = W.stage.areas[W.areaIdx], foes = W.fighters.some(f => f.team !== 1 && !f.dead);
      if (!foes && W.waveIdx >= A.waves.length && W.waveDelay <= 0) W.towerCleared = Math.max(W.towerCleared || 0, A.floor);
    }
    _sl();
  };
}

/* ---------------- menu ---------------- */
Object.assign(BUDDY, { shi: 'ling', ling: 'shi', slugger: 'rex' });   // who talks back in the story scenes
{
  const modeRow = $('modeRow'), stageBtn = modeRow.querySelector('[data-mode="battle"]');
  const b = document.createElement('button'); b.className = 'opt'; b.dataset.mode = 'challenge'; b.setAttribute('aria-pressed', 'false'); b.textContent = '挑戰模式';
  modeRow.insertBefore(b, stageBtn);
  const box = document.createElement('div'); box.id = 'challengeOpts'; box.hidden = true;
  box.innerHTML = `<h3>挑戰</h3><div class="row" id="chalRow"><button class="opt" data-c="tower">無盡挑戰塔</button><button class="opt" data-c="rush">魔王連戰</button></div><p class="note" id="chalNote"></p>`;
  $('stageOpts').after(box);
  menuState.chal = store.get('chal', 'tower');
  document.querySelectorAll('#chalRow .opt').forEach(o => o.onclick = () => { if (o.disabled) return; menuState.chal = o.dataset.c; store.set('chal', menuState.chal); syncMenu(); });
  modeRow.querySelectorAll('.opt').forEach(o => o.onclick = () => { menuState.mode = o.dataset.mode; syncMenu(); });
  const _sync = syncMenu;
  syncMenu = function () {
    const M = menuState;
    if (M.chal === 'rush' && !rushUnlocked()) M.chal = 'tower';
    _sync();
    $('challengeOpts').hidden = M.mode !== 'challenge';
    document.querySelectorAll('#chalRow .opt').forEach(o => { o.setAttribute('aria-pressed', o.dataset.c === M.chal); if (o.dataset.c === 'rush') { o.disabled = !rushUnlocked(); o.title = o.disabled ? '先打通第四關' : ''; } });
    const fmt = s => `${(s / 60) | 0}:${String(s % 60).padStart(2, '0')}`;
    const best = M.chal === 'tower' ? store.get('tower.' + M.diff, 0) : store.get('rush.' + M.diff, null);
    $('chalNote').textContent = CHAL_INFO[M.chal].desc + (M.chal === 'tower' ? (best ? `（這個難度最高：第 ${best} 層）` : '') : (best ? `（這個難度最快：${fmt(best.t)}，${best.n} 個魔王）` : '')) + (!rushUnlocked() ? '　魔王連戰：打通第四關後開放。' : '');
  };
  syncMenu();
}
