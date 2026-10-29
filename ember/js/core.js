// 燼燈 · 核心：常數、輸入、存檔、地形碰撞、主角
(() => {
'use strict';
const EM = window.EM;
const { T, TL } = EM;

EM.PHY = {
  RUN: 220, ACC_G: 2600, ACC_A: 1900, FRIC: 2800,
  G: 1500, G_FALL: 1900, G_CUT: 3400, MAXFALL: 720,
  JUMP: 520, DJUMP: 460, COYOTE: 0.09, BUFFER: 0.12,
  DASH_V: 640, DASH_T: 0.15,
  WALL_SLIDE: 110, WJ_VX: 250, WJ_VY: 520, WJ_LOCK: 0.13,
  SHROOM: 820, POGO: 450,
  W_G: 0.35, W_MAXFALL: 140, W_RUN: 0.65, W_SWIM: 330,
};
const P_W = 16, P_H = 26;

// ───────────── 輸入（鍵盤、手把、觸控共用） ─────────────
const IN = EM.IN = { left: false, right: false, up: false, down: false, jump: false, attack: false, dash: false, heal: false,
  pressed: {}, _prev: {} };
const KEYS = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', Space: 'jump', KeyX: 'attack', KeyJ: 'attack', KeyC: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash', KeyK: 'dash',
  KeyV: 'heal', KeyL: 'heal', KeyM: 'map', Tab: 'map', Escape: 'pause', KeyP: 'pause', Enter: 'ok',
};
const kb = {}, touch = {}, pad = {};
EM.touch = touch;
addEventListener('keydown', e => {
  const k = KEYS[e.code]; if (!k) return;
  e.preventDefault(); if (!e.repeat) kb[k] = true;
});
addEventListener('keyup', e => { const k = KEYS[e.code]; if (k) kb[k] = false; });
addEventListener('blur', () => { for (const k in kb) kb[k] = false; for (const k in touch) touch[k] = false; });
function pollPad() {
  for (const k in pad) pad[k] = false;
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gps) {
    if (!gp) continue;
    const b = i => gp.buttons[i] && gp.buttons[i].pressed;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    pad.left = pad.left || b(14) || ax < -0.4; pad.right = pad.right || b(15) || ax > 0.4;
    pad.up = pad.up || b(12) || ay < -0.5; pad.down = pad.down || b(13) || ay > 0.5;
    pad.jump = pad.jump || b(0); pad.attack = pad.attack || b(2); pad.dash = pad.dash || b(1) || b(5) || b(7);
    pad.heal = pad.heal || b(3) || b(4); pad.map = pad.map || b(8); pad.pause = pad.pause || b(9); pad.ok = pad.ok || b(0);
    EM.usingPad = EM.usingPad || gp.buttons.some(x => x.pressed);
  }
}
EM.pollInput = function () {
  pollPad();
  for (const k of ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash', 'heal', 'map', 'pause', 'ok']) {
    const v = !!(kb[k] || touch[k] || pad[k]);
    IN.pressed[k] = v && !IN._prev[k];
    IN._prev[k] = v;
    IN[k] = v;
  }
};

// ───────────── 存檔 ─────────────
const SAVE_KEY = 'ember.v1';
EM.newSave = () => ({ v: 1, bench: null, abil: { dash: false, wall: false, double: false }, maxHp: 5, maxFlask: 3,
  items: [], bosses: [], walls: [], visited: [], benches: [], sigils: 0, deaths: 0, time: 0, done: false, mute: false, read: [] });
EM.loadSave = () => {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) return Object.assign(EM.newSave(), s); } catch (e) {}
  return null;
};
EM.writeSave = s => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {} };
EM.clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} };

// ───────────── 世界執行狀態 ─────────────
let G = null;   // 目前的遊戲狀態
EM.initGame = function (save) {
  const Wd = EM.buildWorld();
  G = EM.G = {
    W: Wd, save, t: 0, crumbles: new Map(), brk: new Map(),
    sigilOpen: false, fight: null, roomIdx: Wd.spawn.room, lastRoom: -1,
    proj: [], fx: [], floats: [], shake: 0, flash: 0, banner: null, dialog: null, freeze: 0,
  };
  // 打破過的牆
  for (const k of save.walls) { Wd.grid[k] = TL.AIR; }
  // 已經拿過的東西
  Wd.items = Wd.items.filter(it => !save.items.includes(it.id));
  if (save.sigils >= 3) openSigil();
  EM.spawnActors();
  const b = save.bench && Wd.benches.find(x => x.id === save.bench);
  const sp = b || Wd.spawn;
  G.P = makePlayer(sp.x, sp.y);
  G.roomIdx = roomAtPx(G.P.x, G.P.y - 10);
  return G;
};
function openSigil() {
  const Wd = G.W;
  for (let i = 0; i < Wd.grid.length; i++) if (Wd.grid[i] === TL.SIGIL) Wd.grid[i] = TL.AIR;
  G.sigilOpen = true;
}
EM.openSigil = openSigil;

function makePlayer(x, y) {
  const s = G.save;
  return { x, y, w: P_W, h: P_H, vx: 0, vy: 0, face: 1, grounded: false, wall: 0, coyote: 0, buf: 0,
    dashT: 0, dashCd: 0, canDash: true, canDouble: true, wjLock: 0, atkT: 0, atkCd: 0, atkDir: 'side', atkHit: new Set(),
    hp: s.maxHp, energy: 0, inv: 0, hurtT: 0, healT: 0, dead: false, deadT: 0, safe: { x, y }, safeT: 0,
    hazardT: 0, inWater: false, swimCd: 0, onPlat: null, anim: 0, land: 0, dropT: 0, recoil: 0, interact: null };
}
EM.makePlayer = makePlayer;

// ───────────── 地形 ─────────────
const tileAt = (c, r) => {
  const Wd = G.W;
  if (c < 0 || r < 0 || c >= Wd.W || r >= Wd.H) return TL.ROCK;
  return Wd.grid[r * Wd.W + c];
};
EM.tileAt = tileAt;
function solidTile(c, r) {
  const t = tileAt(c, r);
  if (t === TL.ROCK || t === TL.BREAK || t === TL.SHROOM || t === TL.SIGIL) return true;
  if (t === TL.CRUMB) { const s = G.crumbles.get(r * G.W.W + c); return !s || s.state < 2; }
  if (t === TL.GATE) return gateSolid(c, r);
  return false;
}
EM.solidTile = solidTile;
function gateSolid(c, r) {
  for (const g of G.W.gates) {
    if (!g.tiles.some(([x, y]) => x === c && y === r)) continue;
    const boss = G.W.bosses.find(b => b.room === g.room);
    const defeated = boss && G.save.bosses.includes(boss.type);
    if (g.kind === 'exit') return !defeated;
    return !!(G.fight && G.fight.room === g.room);
  }
  return false;
}
function roomAtPx(x, y) {
  const Wd = G.W, c = Math.floor(x / T), r = Math.floor(y / T);
  if (c < 0 || r < 0 || c >= Wd.W || r >= Wd.H) return G.roomIdx;
  const i = Wd.roomOf[r * Wd.W + c];
  return i >= 0 ? i : G.roomIdx;
}
EM.roomAtPx = roomAtPx;

// 矩形和實心地形重疊的格子
function solidsIn(x, y, w, h) {
  const out = [];
  const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.001) / T), r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.001) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidTile(c, r)) out.push([c, r]);
  return out;
}
EM.solidsIn = solidsIn;
const hazardTile = t => t === TL.SPIKE || t === TL.LAVA;

// 一般物體（敵人）用的移動：b.x,b.y 是左上角
EM.bodyMove = function (b, dx, dy, oneway = true) {
  let hitX = false, hitY = false, landed = false;
  if (dx) {
    b.x += dx;
    for (const [c, r] of solidsIn(b.x, b.y, b.w, b.h)) { b.x = dx > 0 ? Math.min(b.x, c * T - b.w) : Math.max(b.x, (c + 1) * T); hitX = true; }
  }
  if (dy) {
    const prevB = b.y + b.h - dy;
    b.y += dy;
    for (const [c, r] of solidsIn(b.x, b.y, b.w, b.h)) {
      if (dy > 0) { b.y = Math.min(b.y, r * T - b.h); landed = true; } else b.y = Math.max(b.y, (r + 1) * T);
      hitY = true;
    }
    if (dy > 0 && oneway) {
      const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - 0.001) / T), r = Math.floor((b.y + b.h) / T);
      for (let c = c0; c <= c1; c++) if (tileAt(c, r) === TL.PLAT && prevB <= r * T + 0.5 && b.y + b.h > r * T) { b.y = r * T - b.h; landed = true; hitY = true; }
    }
  }
  return { hitX, hitY, landed };
};

// ───────────── 主角 ─────────────
EM.stepPlayer = function (dt) {
  const P = G.P, s = G.save, PH = EM.PHY;
  if (P.dead) { P.deadT += dt; return; }
  if (P.hazardT > 0) {   // 碰到刺：短暫停住後回到安全地點
    P.hazardT -= dt;
    if (P.hazardT <= 0) { P.x = P.safe.x; P.y = P.safe.y; P.vx = P.vy = 0; P.inv = Math.max(P.inv, 0.8); }
    return;
  }
  P.inv = Math.max(0, P.inv - dt); P.hurtT = Math.max(0, P.hurtT - dt);
  P.atkCd -= dt; P.atkT -= dt; P.dashCd -= dt; P.wjLock -= dt; P.swimCd -= dt; P.dropT -= dt; P.recoil -= dt;
  P.anim += dt;

  // 水
  const midC = Math.floor((P.x) / T), midR = Math.floor((P.y - P.h * 0.5) / T);
  const wasWater = P.inWater;
  P.inWater = tileAt(midC, midR) === TL.WATER;
  if (P.inWater && !wasWater) { EM.sfx('splash'); EM.burst(P.x, P.y - P.h * 0.5, 10, 'rgba(160,210,255,.9)', 140); P.vy *= 0.35; }

  // 回復：站在地上長按
  if (IN.heal && P.grounded && !P.dashT && P.energy >= 33 && P.hp < s.maxHp) {
    P.healT += dt; P.vx *= 0.8;
    if (P.healT >= 0.9) { P.healT = 0; P.energy -= 33; P.hp++; EM.sfx('heal'); EM.burst(P.x, P.y - 14, 16, '#ffd27a', 120); }
  } else P.healT = 0;
  const healing = P.healT > 0;

  // 左右
  let dir = (IN.right ? 1 : 0) - (IN.left ? 1 : 0);
  if (P.wjLock > 0 || healing) dir = 0;
  if (P.dashT > 0) {
    P.dashT -= dt;
    P.vx = P.face * PH.DASH_V; P.vy = 0;
    if (Math.random() < 0.7) G.fx.push({ k: 'ghost', x: P.x, y: P.y, face: P.face, t: 0, life: 0.22 });
    if (P.dashT <= 0) { P.vx = P.face * PH.RUN; P.dashCd = 0.25; }
  } else {
    const max = PH.RUN * (P.inWater ? PH.W_RUN : 1);
    const acc = P.grounded ? PH.ACC_G : PH.ACC_A;
    if (dir) { P.vx += dir * acc * dt; if (P.wjLock <= 0 && P.recoil <= 0) P.face = dir; }
    else if (P.grounded || P.inWater) { const d = PH.FRIC * dt; P.vx = Math.abs(P.vx) <= d ? 0 : P.vx - Math.sign(P.vx) * d; }
    else P.vx *= 1 - 3 * dt;
    if (P.wjLock <= 0 && P.recoil <= 0) P.vx = Math.max(-max, Math.min(max, P.vx));
  }

  // 牆：貼牆滑落（有蹬牆跳的能力才會抓牆）
  P.wall = 0;
  if (s.abil.wall && !P.grounded && P.dashT <= 0 && !P.inWater) {
    const probe = side => solidsIn(side > 0 ? P.x + P.w / 2 : P.x - P.w / 2 - 2, P.y - P.h + 4, 2, P.h - 8).some(([c, r]) => tileAt(c, r) === TL.ROCK || tileAt(c, r) === TL.BREAK);
    if (dir > 0 && probe(1)) P.wall = 1; else if (dir < 0 && probe(-1)) P.wall = -1;
  }

  // 跳
  P.buf -= dt;
  if (IN.pressed.jump) P.buf = PH.BUFFER;
  P.coyote = P.grounded ? PH.COYOTE : P.coyote - dt;
  if (P.grounded || P.wall) { P.canDouble = true; }
  if (P.grounded) P.canDash = true;
  if (P.buf > 0 && !healing) {
    if (P.inWater) {
      if (P.swimCd <= 0) { P.vy = -PH.W_SWIM; P.swimCd = 0.22; P.buf = 0; EM.sfx('swim'); }
      // 游到水面附近可以直接跳出去
      if (tileAt(midC, Math.floor((P.y - P.h - 6) / T)) !== TL.WATER) { P.vy = -PH.JUMP * 0.9; P.buf = 0; }
    } else if (IN.down && P.grounded && standingOnPlat(P)) {
      P.dropT = 0.22; P.buf = 0; P.y += 2; P.grounded = false;
    } else if (P.coyote > 0) {
      P.vy = -PH.JUMP; P.coyote = 0; P.buf = 0; P.land = -0.4; EM.sfx('jump');
    } else if (P.wall) {
      P.vy = -PH.WJ_VY; P.vx = -P.wall * PH.WJ_VX; P.face = -P.wall; P.wjLock = PH.WJ_LOCK; P.buf = 0; P.canDash = true; EM.sfx('walljump');
      EM.burst(P.x + P.wall * 8, P.y - 10, 6, 'rgba(255,255,255,.7)', 80);
    } else if (s.abil.double && P.canDouble) {
      P.vy = -PH.DJUMP; P.canDouble = false; P.buf = 0; EM.sfx('djump');
      for (let i = 0; i < 10; i++) G.fx.push({ k: 'spark', x: P.x + (Math.random() - 0.5) * 16, y: P.y, vx: (Math.random() - 0.5) * 80, vy: 60 + Math.random() * 60, t: 0, life: 0.4, c: '#ffd27a' });
    }
  }

  // 衝刺
  if (IN.pressed.dash && s.abil.dash && P.canDash && P.dashCd <= 0 && P.dashT <= 0 && !healing) {
    if (P.wall) P.face = -P.wall;
    else if (dir) P.face = dir;
    P.dashT = PH.DASH_T; P.canDash = false; P.vy = 0; EM.sfx('dash');
  }

  // 攻擊
  if (IN.pressed.attack && P.atkCd <= 0 && !healing) {
    P.atkDir = IN.up ? 'up' : (IN.down && !P.grounded ? 'down' : 'side');
    P.atkT = 0.2; P.atkCd = 0.32; P.atkHit = new Set(); EM.sfx('slash');
  }

  // 重力
  if (P.dashT <= 0) {
    let g = P.vy > 0 ? PH.G_FALL : PH.G;
    if (P.vy < 0 && !IN.jump && !P.launched) g = PH.G_CUT;
    if (P.inWater) g = PH.G * PH.W_G;
    P.vy += g * dt;
    let maxf = P.inWater ? PH.W_MAXFALL : PH.MAXFALL;
    if (P.wall && P.vy > PH.WALL_SLIDE) maxf = PH.WALL_SLIDE;
    P.vy = Math.min(P.vy, maxf);
    if (P.vy >= 0) P.launched = false;
  }

  // 移動＋碰撞（P.x 是腳底中心，P.y 是腳底）
  const prevBottom = P.y;
  P.grounded = false;
  const box = () => ({ x: P.x - P.w / 2, y: P.y - P.h, w: P.w, h: P.h });
  // 水平
  P.x += P.vx * dt;
  for (const [c, r] of solidsIn(P.x - P.w / 2, P.y - P.h, P.w, P.h)) {
    if (P.vx > 0) P.x = Math.min(P.x, c * T - P.w / 2); else if (P.vx < 0) P.x = Math.max(P.x, (c + 1) * T + P.w / 2);
    else { const mid = c * T + T / 2; P.x = P.x < mid ? c * T - P.w / 2 : (c + 1) * T + P.w / 2; }
    if (P.dashT > 0) { P.dashT = 0; P.dashCd = 0.15; }
    P.vx = 0;
  }
  // 垂直
  P.y += P.vy * dt;
  let groundTile = null;
  for (const [c, r] of solidsIn(P.x - P.w / 2, P.y - P.h, P.w, P.h)) {
    if (P.vy > 0) { P.y = Math.min(P.y, r * T); groundTile = groundTile || [c, r]; }
    else if (P.vy < 0) { P.y = Math.max(P.y, (r + 1) * T + P.h); P.vy = 0; }
  }
  if (groundTile) landOn(groundTile);
  // 單向平台
  if (P.vy >= 0 && P.dropT <= 0) {
    const r = Math.floor(P.y / T);
    const c0 = Math.floor((P.x - P.w / 2) / T), c1 = Math.floor((P.x + P.w / 2 - 0.001) / T);
    for (let c = c0; c <= c1; c++) if (tileAt(c, r) === TL.PLAT && prevBottom <= r * T + 0.5 && P.y >= r * T) { P.y = r * T; if (!P.grounded) landOn(null); }
  }
  // 移動平台
  P.onPlat = null;
  if (P.vy >= 0) for (const m of G.W.plats) {
    if (prevBottom <= m.y + 0.5 && P.y >= m.y && P.x + P.w / 2 > m.x && P.x - P.w / 2 < m.x + m.w) { P.y = m.y; landOn(null); P.onPlat = m; }
  }
  // 壓碎機（上面可以站）
  for (const cr of G.W.crushers) {
    const R = { x: cr.x, y: cr.cy, w: cr.w, h: cr.h };
    const B = box();
    if (B.x < R.x + R.w && B.x + B.w > R.x && B.y < R.y + R.h && B.y + B.h > R.y) {
      if (prevBottom <= R.y + 2 && P.vy >= 0) { P.y = R.y; landOn(null); P.onPlat = cr; }
      else if (cr.vy > 0 && B.y < R.y + R.h && B.y > R.y + R.h - 20) { hurtPlayer(1, cr.x + cr.w / 2, true); return; }
      else { P.x = P.x < R.x + R.w / 2 ? R.x - P.w / 2 : R.x + R.w + P.w / 2; P.vx = 0; }
    }
  }
  P.land += (0 - P.land) * Math.min(1, dt * 10);

  // 危險地形
  const B = box();
  const hz = { x: B.x + 3, y: B.y + 4, w: B.w - 6, h: B.h - 4 };
  const c0 = Math.floor(hz.x / T), c1 = Math.floor((hz.x + hz.w) / T), r0 = Math.floor(hz.y / T), r1 = Math.floor((hz.y + hz.h) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const t = tileAt(c, r);
    if (!hazardTile(t)) continue;
    const inset = t === TL.SPIKE ? 7 : 10;
    const tr = { x: c * T + 3, y: r * T + inset, w: T - 6, h: T - inset };
    if (t === TL.SPIKE) { // 刺的方向：貼著哪邊的實心格
      if (solidTile(c, r - 1) && !solidTile(c, r + 1)) { tr.y = r * T; tr.h = T - inset; }
      else if (solidTile(c - 1, r) && !solidTile(c, r + 1)) { tr.x = c * T; tr.w = T - inset; tr.y = r * T + 3; tr.h = T - 6; }
      else if (solidTile(c + 1, r) && !solidTile(c, r + 1)) { tr.x = c * T + inset; tr.w = T - inset; tr.y = r * T + 3; tr.h = T - 6; }
    }
    if (hz.x < tr.x + tr.w && hz.x + hz.w > tr.x && hz.y < tr.y + tr.h && hz.y + hz.h > tr.y) {
      // 下劈刺：彈起來不受傷
      if (P.atkT > 0.05 && P.atkDir === 'down' && t === TL.SPIKE && P.vy > 0) { pogo(); return; }
      if (t === TL.LAVA) EM.burst(P.x, P.y - 6, 18, '#ffb04a', 200);
      hurtPlayer(1, P.x, true); return;
    }
  }
  // 記住安全地點（站在實心地上，附近沒有危險）
  if (P.grounded && !P.onPlat) {
    P.safeT += dt;
    if (P.safeT > 0.25) {
      const cc = Math.floor(P.x / T), rr = Math.floor(P.y / T);
      let ok = solidTile(cc, rr) && tileAt(cc, rr) !== TL.CRUMB;
      for (let dc = -1; dc <= 1 && ok; dc++) for (let dr = -1; dr <= 1; dr++) if (hazardTile(tileAt(cc + dc, rr + dr - 1))) ok = false;
      if (ok) P.safe = { x: P.x, y: P.y };
    }
  } else P.safeT = 0;

  // 掉出地圖（保險）
  if (P.y > G.W.H * T + 200) hurtPlayer(1, P.x, true);
};
function standingOnPlat(P) {
  const r = Math.floor(P.y / T);
  const c0 = Math.floor((P.x - P.w / 2) / T), c1 = Math.floor((P.x + P.w / 2 - 0.001) / T);
  let plat = false, solid = false;
  for (let c = c0; c <= c1; c++) { if (tileAt(c, r) === TL.PLAT) plat = true; if (solidTile(c, r)) solid = true; }
  return plat && !solid;
}
function landOn(tile) {
  const P = G.P;
  if (P.vy > 500) { P.land = Math.min(1, P.vy / 900); EM.burst(P.x, P.y, 5, 'rgba(200,210,230,.5)', 60); EM.sfx('land'); }
  P.grounded = true;
  if (tile) {
    const [c, r] = tile, t = tileAt(c, r);
    if (t === TL.SHROOM && !IN.down) {
      P.vy = -EM.PHY.SHROOM; P.grounded = false; P.launched = true; P.canDouble = true; P.canDash = true;
      G.fx.push({ k: 'shroom', c, r, t: 0, life: 0.3 }); EM.sfx('bounce'); return;
    }
    if (t === TL.CRUMB) {
      const key = r * G.W.W + c; const s = G.crumbles.get(key) || { state: 0, t: 0 };
      if (s.state === 0) { s.state = 1; s.t = 0; G.crumbles.set(key, s); }
    }
  }
  P.vy = 0;
}
function pogo() {
  const P = G.P;
  P.vy = -EM.PHY.POGO; P.launched = true; P.canDash = true; P.canDouble = true; P.atkT = 0; EM.sfx('pogo');
  EM.burst(P.x, P.y + 4, 8, '#fff', 120);
}
EM.pogo = pogo;
function hurtPlayer(dmg, srcX, hazard = false) {
  const P = G.P;
  if (P.dead || P.hazardT > 0) return;
  if (!hazard && P.inv > 0) return;
  P.hp -= dmg; P.inv = 1.1; P.hurtT = 0.3; P.healT = 0; P.dashT = 0;
  G.shake = Math.max(G.shake, 0.3); G.flash = 0.15; G.freeze = 0.08;
  EM.sfx('hurt');
  EM.burst(P.x, P.y - 14, 14, '#ff6a5e', 160);
  if (P.hp <= 0) { P.hp = 0; P.dead = true; P.deadT = 0; EM.sfx('die'); EM.burst(P.x, P.y - 14, 40, '#ffd27a', 260); return; }
  if (hazard) { P.hazardT = 0.45; P.vx = P.vy = 0; return; }
  P.vx = (P.x < srcX ? -1 : 1) * 260; P.vy = -300; P.recoil = 0.18; P.launched = true;
}
EM.hurtPlayer = hurtPlayer;

// 攻擊判定框
EM.attackBox = function () {
  const P = G.P;
  if (P.atkT <= 0.06) return null;
  if (P.atkDir === 'up') return { x: P.x - 18, y: P.y - P.h - 40, w: 36, h: 44 };
  if (P.atkDir === 'down') return { x: P.x - 18, y: P.y - 6, w: 36, h: 42 };
  return P.face > 0 ? { x: P.x, y: P.y - P.h - 6, w: 46, h: 34 } : { x: P.x - 46, y: P.y - P.h - 6, w: 46, h: 34 };
};
// 打到東西時的回饋：側面往後退、下劈彈起
EM.attackRecoil = function (kind) {
  const P = G.P;
  if (P.atkDir === 'down') pogo();
  else if (P.atkDir === 'side' && kind !== 'soft') { P.vx = -P.face * 160; P.recoil = 0.08; }
  P.energy = Math.min(33 * G.save.maxFlask, P.energy + 8);
};

// 可以打破的牆
EM.hitTerrain = function () {
  const P = G.P, A = EM.attackBox();
  if (!A || P.atkHit.has('terrain')) return;
  const c0 = Math.floor(A.x / T), c1 = Math.floor((A.x + A.w) / T), r0 = Math.floor(A.y / T), r1 = Math.floor((A.y + A.h) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const t = tileAt(c, r);
    if (t === TL.BREAK) {
      P.atkHit.add('terrain');
      const key = r * G.W.W + c; const n = (G.brk.get(key) || 0) + 1; G.brk.set(key, n);
      EM.burst(c * T + 16, r * T + 16, 8, '#9aa3b8', 140); EM.sfx('clang'); G.shake = Math.max(G.shake, 0.1);
      if (n >= 3) {
        // 整面牆一起倒
        const stack = [[c, r]], seen = new Set();
        while (stack.length) {
          const [x, y] = stack.pop(); const k = y * G.W.W + x;
          if (seen.has(k) || tileAt(x, y) !== TL.BREAK) continue; seen.add(k);
          G.W.grid[k] = TL.AIR; G.save.walls.push(k);
          EM.burst(x * T + 16, y * T + 16, 14, '#7a8296', 200);
          stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        EM.sfx('break'); EM.persist();
      }
      if (P.atkDir === 'side') { P.vx = -P.face * 120; P.recoil = 0.06; }
      return;
    }
    if ((t === TL.SPIKE) && P.atkDir === 'down' && P.vy >= 0) { P.atkHit.add('terrain'); pogo(); return; }
  }
};

// 會掉的磚
EM.stepCrumbles = function (dt) {
  for (const [key, s] of G.crumbles) {
    s.t += dt;
    if (s.state === 1 && s.t > 0.5) { s.state = 2; s.t = 0; const c = key % G.W.W, r = (key / G.W.W) | 0; EM.burst(c * T + 16, r * T + 10, 8, '#8a7a6a', 90); EM.sfx('crumble'); }
    else if (s.state === 2 && s.t > 3) {
      const c = key % G.W.W, r = (key / G.W.W) | 0, P = G.P;
      const inside = P.x + P.w / 2 > c * T && P.x - P.w / 2 < (c + 1) * T && P.y > r * T && P.y - P.h < (r + 1) * T;
      if (!inside) G.crumbles.delete(key);
    }
  }
};

// 特效
EM.burst = function (x, y, n, color, spd = 120) {
  if (EM.FAST) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.8);
    G.fx.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0, life: 0.4 + Math.random() * 0.4, c: color, r: 1.5 + Math.random() * 2.5 });
  }
};
EM.float = function (x, y, text, color = '#ffe2a8') { if (!EM.FAST) G.floats.push({ x, y, text, color, t: 0 }); };
EM.persist = function () { if (!EM.FAST && !EM.NOSAVE) EM.writeSave(G.save); };
})();
