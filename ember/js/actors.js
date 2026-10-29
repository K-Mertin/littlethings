// 燼燈 · 敵人、頭目、投射物、機關、互動
(() => {
'use strict';
const EM = window.EM;
const { T, TL } = EM;
const G = () => EM.G;
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pbox = P => ({ x: P.x - P.w / 2, y: P.y - P.h, w: P.w, h: P.h });
const rnd = (a, b) => a + Math.random() * (b - a);

const ENEMY = {
  crawler: { w: 26, h: 18, hp: 3 },
  moth: { w: 20, h: 18, hp: 2, fly: true },
  spitter: { w: 24, h: 24, hp: 3 },
  hopper: { w: 22, h: 20, hp: 3 },
  charger: { w: 34, h: 24, hp: 5 },
  shield: { w: 26, h: 30, hp: 5 },
  jelly: { w: 20, h: 20, hp: 2, fly: true },
};
const BOSS = {
  knight: { name: '守門騎士', sub: '永遠等候命令的人', w: 40, h: 56, hp: 26, gives: 'dash' },
  matriarch: { name: '菌后', sub: '在灰燼裡生長的母親', w: 66, h: 58, hp: 32, gives: 'wall' },
  jelly: { name: '深淵水母', sub: '沉沒水道的光', w: 64, h: 60, hp: 30, gives: 'double' },
  king: { name: '空殼之王', sub: '守著最後一口氣的王', w: 46, h: 82, hp: 54, gives: null },
};
EM.BOSS = BOSS;
const ABIL = {
  dash: { name: '影之衝刺', text: '按 C（或 Shift）向前衝刺。\n在空中也能衝一次，可以越過很寬的裂縫。' },
  wall: { name: '攀岩之爪', text: '在空中貼著牆按住方向鍵，會沿著牆滑下。\n這時按 Z 可以蹬牆跳，一路往上爬。' },
  double: { name: '燼之翼', text: '在空中再按一次 Z，可以再跳一次。' },
};
EM.ABIL = ABIL;

// ───────────── 產生 ─────────────
EM.spawnActors = function () {
  const g = G(), Wd = g.W;
  g.enemies = Wd.enemies.map(d => makeEnemy(d));
  g.bosses = Wd.bosses.filter(d => !g.save.bosses.includes(d.type)).map(d => makeBoss(d));
  for (const m of Wd.plats) { m.x = m.x0; m.y = m.y0; m.dir = 1; m.dx = m.dy = 0; const L = Math.hypot(m.x1 - m.x0, m.y1 - m.y0); m.len = L; m.p = 0; }
  for (const c of Wd.crushers) { c.cy = c.yTop; c.vy = 0; c.st = 'wait'; c.t = -c.delay; }
  g.proj = [];
};
function makeEnemy(d) {
  const s = ENEMY[d.type];
  return { def: d, type: d.type, x: d.x - s.w / 2, y: d.y - s.h, w: s.w, h: s.h, hp: s.hp, vx: 0, vy: 0, face: -1, st: 'idle', t: Math.random(), flash: 0,
    dead: false, deadT: 0, kb: 0, hx: d.x - s.w / 2, hy: d.y - s.h, fly: !!s.fly, room: d.room, ph: Math.random() * 6 };
}
function makeBoss(d) {
  const s = BOSS[d.type];
  return { def: d, type: d.type, x: d.x - s.w / 2, y: d.y - s.h, w: s.w, h: s.h, hp: s.hp, maxHp: s.hp, vx: 0, vy: 0, face: -1, st: 'sleep', t: 0, flash: 0,
    room: d.room, name: s.name, sub: s.sub, phase: 1, n: 0, grounded: false, dead: false, deadT: 0, ph: 0, hidden: false, spot: 1, hits: [] };
}
EM.resetEnemies = function () {
  const g = G();
  g.enemies = g.W.enemies.map(d => makeEnemy(d));
  g.bosses = g.W.bosses.filter(d => !g.save.bosses.includes(d.type)).map(d => makeBoss(d));
  g.fight = null; g.proj = [];
};

// ───────────── 每一步 ─────────────
EM.stepActors = function (dt) {
  const g = G(), P = g.P;
  // 移動平台
  for (const m of g.W.plats) {
    const sp = m.speed * dt / Math.max(1, m.len);
    m.p += sp * m.dir;
    if (m.p >= 1) { m.p = 1; m.dir = -1; } else if (m.p <= 0) { m.p = 0; m.dir = 1; }
    const nx = m.x0 + (m.x1 - m.x0) * m.p, ny = m.y0 + (m.y1 - m.y0) * m.p;
    m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
    if (P.onPlat === m && !P.dead) { P.x += m.dx; P.y = m.y; EM.pushOut(P); }
  }
  // 壓碎機
  for (const c of g.W.crushers) {
    c.t += dt;
    const prev = c.cy;
    if (c.st === 'wait' && c.t > 1.2) { c.st = 'shake'; c.t = 0; }
    else if (c.st === 'shake' && c.t > 0.35) { c.st = 'fall'; c.t = 0; c.vy = 0; }
    else if (c.st === 'fall') {
      c.vy = Math.min(c.vy + 2600 * dt, 900); c.cy += c.vy * dt;
      if (c.cy + c.h >= c.yBot) { c.cy = c.yBot - c.h; c.st = 'down'; c.t = 0; c.vy = 0; if (Math.abs(c.x - P.x) < 500) { g.shake = Math.max(g.shake, 0.15); EM.sfx('slam'); } }
    } else if (c.st === 'down' && c.t > 0.5) { c.st = 'rise'; c.t = 0; }
    else if (c.st === 'rise') { c.vy = -90; c.cy += c.vy * dt; if (c.cy <= c.yTop) { c.cy = c.yTop; c.st = 'wait'; c.t = 0; c.vy = 0; } }
    c.dy = c.cy - prev;
    if (P.onPlat === c) P.y = c.cy;
  }
  // 噴火口
  for (const j of g.W.jets) {
    const ph = ((g.t + j.offset) % j.period) / j.period;
    j.state = ph < 0.55 ? 'off' : ph < 0.7 ? 'warn' : 'on';
    if (j.state === 'on' && !P.dead) {
      const R = { x: j.x + 6, y: j.y - 3 * T + 8, w: T - 12, h: 3 * T };
      if (ov(pbox(P), R)) EM.hurtPlayer(1, j.x + 16);
    }
  }

  // 敵人
  const A = EM.attackBox();
  for (const e of g.enemies) {
    if (e.dead) { e.deadT += dt; continue; }
    if (e.room !== g.roomIdx && Math.abs(e.x - P.x) > 900) continue;   // 遠的先不動
    e.t += dt; e.flash = Math.max(0, e.flash - dt); e.ph += dt;
    stepEnemy(e, dt, P);
    // 被打
    if (A && !P.atkHit.has(e) && ov(A, e)) {
      P.atkHit.add(e);
      if (e.type === 'shield' && P.atkDir === 'side' && Math.sign(P.x - (e.x + e.w / 2)) === e.face) {
        EM.sfx('clang'); EM.burst(e.x + e.w / 2 + e.face * 12, e.y + 12, 8, '#fff2c0', 150);
        P.vx = -P.face * 260; P.recoil = 0.14;
      } else {
        e.hp--; e.flash = 0.12; EM.sfx('hit'); EM.attackRecoil();
        EM.burst(e.x + e.w / 2, e.y + e.h / 2, 6, '#ffffff', 140);
        if (!e.fly || e.type === 'moth') { e.kb = 0.15; e.vx = P.face * 220 * (P.atkDir === 'side' ? 1 : 0.3); }
        if (e.hp <= 0) { e.dead = true; e.deadT = 0; EM.sfx('kill'); EM.burst(e.x + e.w / 2, e.y + e.h / 2, 18, enemyColor(e), 200); g.freeze = 0.04; }
      }
    }
    // 碰到主角
    if (!e.dead && !P.dead && P.inv <= 0 && ov(pbox(P), { x: e.x + 2, y: e.y + 2, w: e.w - 4, h: e.h - 4 })) EM.hurtPlayer(1, e.x + e.w / 2);
  }

  // 頭目
  for (const b of g.bosses) {
    if (b.dead) { b.deadT += dt; continue; }
    stepBoss(b, dt, P);
    if (b.st === 'sleep') continue;
    b.flash = Math.max(0, b.flash - dt);
    if (A && !P.atkHit.has(b) && !b.hidden && ov(A, b)) {
      P.atkHit.add(b);
      b.hp--; b.flash = 0.1; EM.sfx('hitboss'); EM.attackRecoil();
      EM.burst(A.x + A.w / 2, A.y + A.h / 2, 7, '#ffffff', 160);
      if (b.hp <= 0) killBoss(b);
    }
    if (!b.dead && !b.hidden && !P.dead && P.inv <= 0 && ov(pbox(P), { x: b.x + 6, y: b.y + 6, w: b.w - 12, h: b.h - 8 })) EM.hurtPlayer(1, b.x + b.w / 2);
    for (const hb of b.hits) if (!P.dead && P.inv <= 0 && ov(pbox(P), hb)) EM.hurtPlayer(hb.dmg || 1, b.x + b.w / 2);
  }

  // 投射物
  for (const p of g.proj) {
    p.t += dt;
    if (p.t < 0) continue;   // 還沒輪到（延遲出現）
    if (p.home && !P.dead) { const dx = P.x - p.x, dy = P.y - 14 - p.y, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * p.home * dt; p.vy += dy / d * p.home * dt; const sp = Math.hypot(p.vx, p.vy); if (sp > p.max) { p.vx *= p.max / sp; p.vy *= p.max / sp; } }
    if (p.g) p.vy = (p.vy || 0) + p.g * dt;
    p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;   // 光環、火柱、記號沒有速度
    if (p.kind === 'wave') {
      // 沿著地面走的震波：前面是牆或腳下沒地就消失
      const c = Math.floor((p.x + Math.sign(p.vx) * 8) / T), r = Math.floor((p.y - 8) / T);
      if (EM.solidTile(c, r) || !EM.solidTile(Math.floor(p.x / T), Math.floor((p.y + 4) / T))) p.dead = true;
    } else if (p.kind !== 'ring' && p.kind !== 'pillar' && p.kind !== 'mark' && EM.solidTile(Math.floor(p.x / T), Math.floor(p.y / T))) { p.dead = true; EM.burst(p.x, p.y, 5, p.c || '#9fe', 80); }
    if (p.t > (p.life || 5)) p.dead = true;
    if (p.dead) continue;
    let hit = false;
    const PB = pbox(P);
    if (p.kind === 'ring') {
      const rad = p.r0 + (p.r1 - p.r0) * Math.min(1, p.t / p.dur);
      const d = Math.hypot(P.x - p.x, P.y - 14 - p.y);
      hit = p.t > 0.02 && Math.abs(d - rad) < 14;
      if (p.t > p.dur + 0.1) p.dead = true;
    } else if (p.kind === 'pillar') {
      p.on = p.t > p.warn && p.t < p.warn + 0.5;
      hit = p.on && ov(PB, { x: p.x - 16, y: p.y - 150, w: 32, h: 150 });
    } else if (p.kind === 'mark') {
      hit = false;
    } else {
      const R = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
      hit = ov(PB, R);
      // 用劍打掉
      if (A && p.breakable !== false && ov(A, R)) { p.dead = true; EM.burst(p.x, p.y, 6, '#fff', 120); EM.sfx('parry'); continue; }
    }
    if (hit && !P.dead && P.inv <= 0) { EM.hurtPlayer(p.dmg || 1, p.x); if (p.kind !== 'ring' && p.kind !== 'pillar') p.dead = true; }
  }
  g.proj = g.proj.filter(p => !p.dead);
};
EM.pushOut = function (P) {
  for (const [c, r] of EM.solidsIn(P.x - P.w / 2, P.y - P.h, P.w, P.h)) {
    const mid = c * T + T / 2; P.x = P.x < mid ? c * T - P.w / 2 : (c + 1) * T + P.w / 2;
  }
};
function enemyColor(e) { return { crawler: '#c9a0ff', moth: '#ffd6f0', spitter: '#8affc0', hopper: '#9fe8ff', charger: '#ffb07a', shield: '#d8dcef', jelly: '#8fd8ff' }[e.type] || '#fff'; }
EM.enemyColor = enemyColor;

function onGround(e) { return EM.solidTile(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h + 2) / T)) || EM.tileAt(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h + 2) / T)) === TL.PLAT; }
function edgeAhead(e) {
  const fx = e.face > 0 ? e.x + e.w + 3 : e.x - 3, fy = e.y + e.h + 4;
  const c = Math.floor(fx / T), r = Math.floor(fy / T);
  const t = EM.tileAt(c, r);
  return !(EM.solidTile(c, r) || t === TL.PLAT) || t === TL.SPIKE || t === TL.LAVA || EM.tileAt(c, Math.floor((e.y + e.h - 2) / T)) === TL.SPIKE;
}
function gravity(e, dt, g = 1500) { e.vy = Math.min(e.vy + g * dt, 800); }
function walk(e, dt, spd) {
  if (e.kb > 0) { e.kb -= dt; } else e.vx = e.face * spd;
  gravity(e, dt);
  const r = EM.bodyMove(e, e.vx * dt, e.vy * dt);
  if (r.landed) e.vy = 0;
  if (e.kb <= 0 && (r.hitX || (r.landed && edgeAhead(e)))) e.face = -e.face;
  return r;
}
function stepEnemy(e, dt, P) {
  const g = G();
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2, dx = P.x - cx, dy = (P.y - 13) - cy, dist = Math.hypot(dx, dy);
  const sameRoom = EM.roomAtPx(cx, cy) === g.roomIdx;
  switch (e.type) {
    case 'crawler': walk(e, dt, 55); break;
    case 'moth': {
      if (e.kb > 0) { e.kb -= dt; e.vx *= 0.9; e.vy *= 0.9; }
      else if (sameRoom && dist < 240 && !P.dead) { e.vx += dx / dist * 260 * dt; e.vy += dy / dist * 260 * dt; }
      else { e.vx += ((e.hx - e.x) * 0.8 - e.vx) * dt; e.vy += ((e.hy - e.y) * 0.8 + Math.sin(e.ph * 2) * 30 - e.vy) * dt; }
      const sp = Math.hypot(e.vx, e.vy); if (sp > 125) { e.vx *= 125 / sp; e.vy *= 125 / sp; }
      if (Math.abs(e.vx) > 5) e.face = Math.sign(e.vx);
      EM.bodyMove(e, e.vx * dt, e.vy * dt, false);
      break;
    }
    case 'jelly': {
      const inW = (x, y) => EM.tileAt(Math.floor(x / T), Math.floor(y / T)) === TL.WATER;
      let tx = e.hx + Math.sin(e.ph * 0.7) * 40, ty = e.hy + Math.sin(e.ph * 1.3) * 20;
      if (sameRoom && dist < 220 && !P.dead) { tx = P.x - e.w / 2; ty = P.y - 20; }
      e.vx += ((tx - e.x) * 1.2 - e.vx) * dt * 1.5; e.vy += ((ty - e.y) * 1.2 - e.vy) * dt * 1.5;
      const sp = Math.hypot(e.vx, e.vy); if (sp > 70) { e.vx *= 70 / sp; e.vy *= 70 / sp; }
      const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
      if (inW(nx + e.w / 2, ny + e.h / 2) && inW(nx + 2, ny + 2) && inW(nx + e.w - 2, ny + e.h - 2)) { e.x = nx; e.y = ny; } else { e.vx *= -0.5; e.vy *= -0.5; }
      break;
    }
    case 'spitter': {
      gravity(e, dt); const r = EM.bodyMove(e, 0, e.vy * dt); if (r.landed) e.vy = 0;
      e.face = dx > 0 ? 1 : -1;
      if (e.st === 'idle' && e.t > 2.2 && sameRoom && dist < 400 && !P.dead) { e.st = 'wind'; e.t = 0; }
      if (e.st === 'wind' && e.t > 0.4) {
        const tt = 0.9, gg = 900;
        const vx = Math.max(-380, Math.min(380, dx / tt)), vy = (dy - 0.5 * gg * tt * tt) / tt;
        g.proj.push({ kind: 'glob', x: cx, y: e.y + 4, vx, vy: Math.max(-650, vy), g: gg, r: 7, c: '#8affc0', life: 3, t: 0 });
        EM.sfx('spit'); e.st = 'idle'; e.t = 0;
      }
      break;
    }
    case 'hopper': {
      gravity(e, dt);
      const r = EM.bodyMove(e, e.vx * dt, e.vy * dt);
      if (r.landed) { e.vy = 0; if (e.st === 'air') { e.st = 'idle'; e.t = 0; e.vx = 0; } }
      if (r.hitX) e.vx = -e.vx * 0.5;
      if (e.st === 'idle' && e.t > 1.1 && sameRoom && dist < 300 && !P.dead && r.landed !== false) {
        e.face = dx > 0 ? 1 : -1; e.vx = e.face * rnd(130, 190); e.vy = -rnd(430, 520); e.st = 'air'; e.t = 0;
      }
      break;
    }
    case 'charger': {
      if (e.st === 'idle') {
        walk(e, dt, 40);
        if (sameRoom && Math.abs(dy) < 50 && Math.abs(dx) < 280 && Math.sign(dx) === e.face && !P.dead && e.t > 0.6) { e.st = 'wind'; e.t = 0; e.vx = 0; }
      } else if (e.st === 'wind') {
        gravity(e, dt); EM.bodyMove(e, 0, e.vy * dt);
        if (e.t > 0.45) { e.st = 'charge'; e.t = 0; EM.sfx('charge'); }
      } else if (e.st === 'charge') {
        e.vx = e.face * 340; gravity(e, dt);
        const r = EM.bodyMove(e, e.vx * dt, e.vy * dt); if (r.landed) e.vy = 0;
        if (r.hitX || (r.landed && edgeAhead(e)) || e.t > 1.4) { e.st = 'stun'; e.t = 0; if (r.hitX) { G().shake = Math.max(G().shake, 0.1); EM.sfx('thud'); } }
      } else if (e.st === 'stun') {
        gravity(e, dt); EM.bodyMove(e, 0, e.vy * dt);
        if (e.t > 0.7) { e.st = 'idle'; e.t = 0; e.face = -e.face; }
      }
      break;
    }
    case 'shield': {
      if (sameRoom && Math.abs(dx) < 320 && Math.abs(dy) < 80 && !P.dead) { if (e.kb <= 0) e.face = dx > 0 ? 1 : -1; walk(e, dt, 45); }
      else walk(e, dt, 25);
      break;
    }
  }
}

// ───────────── 頭目 ─────────────
function roomRect(idx) { const R = G().W.rooms[idx]; return { x: R.x * T, y: R.y * T, w: R.w * T, h: R.h * T, R }; }
function startFight(b) {
  const g = G();
  b.st = 'intro'; b.t = 0; g.fight = { room: b.room, boss: b };
  g.banner = { title: b.name, sub: b.sub, t: 0, boss: true };
  EM.sfx('bossintro'); EM.music && EM.music('boss');
}
function killBoss(b) {
  const g = G();
  b.dead = true; b.deadT = 0; b.hits = [];
  g.fight = null; g.shake = 0.8; g.freeze = 0.25; g.flash = 0.4;
  EM.sfx('bossdie'); EM.burst(b.x + b.w / 2, b.y + b.h / 2, 60, '#ffd27a', 320);
  g.proj = [];
  g.save.bosses.push(b.type);
  if (b.type === 'king') { g.ending = { t: 0 }; EM.persist(); return; }
  g.save.sigils = g.save.bosses.filter(t => t !== 'king').length;
  const gives = BOSS[b.type].gives;
  const R = roomRect(b.room);
  // 能力的光球出現在房間地面上
  const cx = Math.max(R.x + 3 * T, Math.min(R.x + R.w - 3 * T, b.x + b.w / 2));
  let gy = b.y + b.h; for (let k = 0; k < 20 && !EM.solidTile(Math.floor(cx / T), Math.floor((gy + 2) / T)); k++) gy += T;
  g.W.items.push({ kind: 'ability', id: gives, x: cx, y: Math.floor((gy + 2) / T) * T - 30, room: b.room });
  EM.persist();
  EM.music && EM.music('area');
}
EM.killBoss = killBoss;

function stepBoss(b, dt, P) {
  const g = G(), R = roomRect(b.room);
  b.t += dt; b.ph += dt; b.hits = [];
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, dx = P.x - cx;
  if (b.st === 'sleep') {
    const pr = EM.roomAtPx(P.x, P.y - 10);
    if (pr !== b.room || P.dead) return;
    const rel = { x: P.x - R.x, y: P.y - R.y };
    const go = b.type === 'knight' ? rel.x > 6 * T : b.type === 'matriarch' ? rel.y > 14 * T : b.type === 'jelly' ? rel.y > 9 * T : rel.x > 19 * T;
    if (go) startFight(b);
    return;
  }
  if (P.dead) return;
  const ph2 = b.hp <= b.maxHp * 0.5, ph3 = b.hp <= b.maxHp * 0.25;
  b.phase = ph3 ? 3 : ph2 ? 2 : 1;
  const spd = b.phase === 1 ? 1 : b.phase === 2 ? 1.2 : 1.35;
  if (b.type === 'knight' || b.type === 'king') groundBoss(b, dt, P, R, spd);
  else if (b.type === 'matriarch') matriarch(b, dt, P, R, spd);
  else if (b.type === 'jelly') jellyBoss(b, dt, P, R, spd);
}
function bossPhys(b, dt) {
  b.vy = Math.min(b.vy + 1600 * dt, 900);
  const r = EM.bodyMove(b, b.vx * dt, b.vy * dt, true);
  if (r.landed) b.vy = 0;
  b.grounded = r.landed;
  return r;
}
function waves(b, n, spd) {
  const g = G(), gy = b.y + b.h;
  for (let k = 0; k < n; k++) for (const s of [-1, 1]) g.proj.push({ kind: 'wave', x: b.x + b.w / 2 + s * (20 + k * 2), y: gy - 2, vx: s * spd * (1 - k * 0.25), vy: 0, r: 12, life: 3, t: -k * 0.25, c: '#ffd27a', breakable: false });
}
function groundBoss(b, dt, P, R, spd) {
  const g = G(), king = b.type === 'king';
  const cx = b.x + b.w / 2, dx = P.x - cx, adx = Math.abs(dx);
  const r = bossPhys(b, dt);
  switch (b.st) {
    case 'intro': b.vx = 0; if (b.t > 1.4) { b.st = 'idle'; b.t = 0; } break;
    case 'idle': {
      b.vx = 0; b.face = dx > 0 ? 1 : -1;
      if (b.t > (king ? 0.55 : 0.75) / spd) {
        b.n++;
        const opts = [];
        if (adx > 160) opts.push('dashwind', 'leap'); else opts.push('swipe', 'leap', 'swipe');
        if (king) { opts.push('pillars'); if (b.phase >= 2) opts.push('rain'); }
        b.st = opts[(Math.random() * opts.length) | 0]; b.t = 0; b.k = 0;
        if (b.st === 'leap') { const tt = 0.95; b.vy = -760; b.vx = Math.max(-450, Math.min(450, dx / tt)); EM.sfx('leap'); }
        if (b.st === 'rain') EM.sfx('roar');
      }
      break;
    }
    case 'dashwind': b.vx = 0; if (b.t > 0.55 / spd) { b.st = 'dash'; b.t = 0; EM.sfx('bossdash'); } break;
    case 'dash': {
      b.vx = b.face * (king ? 620 : 520) * Math.min(spd, 1.2);
      b.hits.push({ x: b.face > 0 ? b.x + b.w - 6 : b.x - 30, y: b.y + 10, w: 36, h: b.h - 14 });
      if (r.hitX || b.t > 1.1) { b.st = 'recover'; b.t = 0; b.vx = 0; if (r.hitX) { g.shake = 0.2; EM.sfx('thud'); } }
      break;
    }
    case 'leap': {
      if (b.t > 0.15 && r.landed) {
        b.vx = 0; g.shake = 0.35; EM.sfx('slam');
        waves(b, b.phase >= 2 ? 2 : 1, king ? 340 : 300);
        if (king && b.phase >= 3) for (let k = 1; k <= 3; k++) for (const s of [-1, 1]) g.proj.push({ kind: 'pillar', x: b.x + b.w / 2 + s * k * 110, y: b.y + b.h, warn: 0.35 + k * 0.12, t: 0, life: 1.6 });
        b.st = 'recover'; b.t = 0;
      }
      break;
    }
    case 'swipe': {
      const cyc = 0.36 / spd, k = Math.floor(b.t / cyc), f = (b.t % cyc) / cyc;
      if (k >= (king ? 4 : 3)) { b.st = 'recover'; b.t = 0; b.vx = 0; break; }
      if (f < 0.4) { b.vx = b.face * 90; b.face = dx > 0 ? 1 : -1; } else b.vx = 0;
      if (f > 0.45 && f < 0.7) {
        b.hits.push({ x: b.face > 0 ? b.x + b.w - 4 : b.x - 56, y: b.y + 4, w: 60, h: b.h - 4 });
        if (b.k !== k) { b.k = k; EM.sfx('bossslash'); }
      }
      break;
    }
    case 'pillars': {
      b.vx = 0;
      if (b.k === 0 && b.t > 0.3) {
        b.k = 1; EM.sfx('roar');
        const n = b.phase >= 2 ? 5 : 4;
        for (let i = 0; i < n; i++) {
          const x = P.x + (i - (n - 1) / 2) * 120 + (Math.random() - 0.5) * 30;
          const gx = Math.max(R.x + 18 * T, Math.min(R.x + R.w - 2 * T, x));
          g.proj.push({ kind: 'pillar', x: gx, y: R.y + 12 * T, warn: 0.7 + i * 0.12, t: 0, life: 1.6 });
        }
      }
      if (b.t > 1.6) { b.st = 'recover'; b.t = 0; }
      break;
    }
    case 'rain': {
      b.vx = 0;
      if (b.t < 1.6 && Math.random() < dt * 9) {
        const x = R.x + 18 * T + Math.random() * (R.w - 20 * T);
        g.proj.push({ kind: 'ember', x, y: R.y + 1.5 * T, vx: 0, vy: 160, g: 300, r: 7, life: 4, t: 0, c: '#ff8a4a', breakable: true });
      }
      if (b.t > 1.9) { b.st = 'recover'; b.t = 0; }
      break;
    }
    case 'recover': b.vx = 0; if (b.t > 0.5 / spd) { b.st = 'idle'; b.t = 0; } break;
  }
  // 不要離開競技場
  const minX = R.x + (king ? 17 : 1) * T, maxX = R.x + R.w - T - b.w;
  if (b.x < minX) { b.x = minX; if (b.st === 'dash') { b.st = 'recover'; b.t = 0; } }
  if (b.x > maxX) { b.x = maxX; if (b.st === 'dash') { b.st = 'recover'; b.t = 0; } }
}
function matriarch(b, dt, P, R, spd) {
  const g = G();
  const spots = [{ x: R.x + 3.5 * T, y: R.y + 26 * T }, { x: R.x + 12 * T, y: R.y + 26 * T }, { x: R.x + 20.5 * T, y: R.y + 26 * T }, { x: R.x + 12 * T, y: R.y + 17 * T }];
  const place = i => { const s = spots[i]; b.x = s.x - b.w / 2; b.y = s.y - b.h; b.spot = i; };
  const cx = b.x + b.w / 2, cy = b.y + b.h * 0.35;
  switch (b.st) {
    case 'intro': b.hidden = false; if (b.t > 1.4) { b.st = 'attack'; b.t = 0; b.k = 0; } break;
    case 'attack': {
      if (b.k === 0) {
        const opts = ['spores', 'spores', 'rain'];
        if (g.enemies.filter(e => e.summoned && !e.dead).length < 2) opts.push('summon');
        b.atk = opts[(Math.random() * opts.length) | 0]; b.k = 1; b.t = 0;
      }
      if (b.atk === 'spores' && b.t > 0.5 && b.k === 1) {
        b.k = 2; EM.sfx('spit');
        const n = b.phase >= 2 ? 7 : 5, base = Math.atan2(P.y - 20 - cy, P.x - cx);
        for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.22; g.proj.push({ kind: 'spore', x: cx, y: cy, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, g: 80, r: 7, life: 4, t: 0, c: '#9affd8' }); }
      }
      if (b.atk === 'rain' && b.k === 1) {
        b.k = 2; EM.sfx('roar');
        const n = b.phase >= 2 ? 10 : 7;
        for (let i = 0; i < n; i++) {
          const x = R.x + (1.5 + Math.random() * 21) * T;
          g.proj.push({ kind: 'mark', x, y: R.y + 26 * T, t: -i * 0.12, life: 0.8, c: '#9affd8' });
          g.proj.push({ kind: 'spore', x, y: R.y + 14 * T, vx: 0, vy: 0, g: 700, r: 8, life: 4, t: -0.6 - i * 0.12, c: '#9affd8', delay: true });
        }
      }
      if (b.atk === 'summon' && b.k === 1 && b.t > 0.5) {
        b.k = 2; EM.sfx('summon');
        for (const s of [-1, 1]) { const e = makeEnemy({ type: 'moth', x: cx + s * 50, y: b.y, room: b.room }); e.summoned = true; e.hp = 1; g.enemies.push(e); }
      }
      if (b.t > (b.atk === 'rain' ? 2.2 : 1.4) / spd) {
        b.n = (b.n || 0) + 1;
        if (b.n % 2 === 0) { b.st = 'burrow'; b.t = 0; EM.sfx('burrow'); } else { b.k = 0; b.t = 0; }
      }
      break;
    }
    case 'burrow': if (b.t > 0.7) { b.hidden = true; b.st = 'hidden'; b.t = 0; } break;
    case 'hidden': {
      if (b.t > 0.8 / spd) {
        let i; do { i = (Math.random() * spots.length) | 0; } while (i === b.spot);
        place(i); b.hidden = false; b.st = 'emerge'; b.t = 0; EM.sfx('emerge'); g.shake = 0.2;
      }
      break;
    }
    case 'emerge': if (b.t > 0.6) { b.st = 'attack'; b.t = 0; b.k = 0; } break;
  }
}
function jellyBoss(b, dt, P, R, spd) {
  const g = G();
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const clampIn = () => {
    b.x = Math.max(R.x + 1.5 * T, Math.min(R.x + R.w - 1.5 * T - b.w, b.x));
    b.y = Math.max(R.y + 8 * T, Math.min(R.y + 21 * T - b.h, b.y));
  };
  switch (b.st) {
    case 'intro': if (b.t > 1.4) { b.st = 'drift'; b.t = 0; } break;
    case 'drift': {
      const tx = P.x - b.w / 2 + Math.sin(b.ph * 0.8) * 120, ty = Math.min(P.y - 120, R.y + 18 * T) + Math.sin(b.ph * 1.7) * 26;
      b.vx += ((tx - b.x) * 0.9 - b.vx) * dt * 1.4; b.vy += ((ty - b.y) * 0.9 - b.vy) * dt * 1.4;
      const sp = Math.hypot(b.vx, b.vy), mx = 90 * spd; if (sp > mx) { b.vx *= mx / sp; b.vy *= mx / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt; clampIn();
      if (b.t > 1.6 / spd) {
        const opts = ['orbs', 'ring', 'dive', 'ring'];
        b.st = opts[(Math.random() * opts.length) | 0]; b.t = 0; b.k = 0;
      }
      break;
    }
    case 'orbs': {
      b.vx *= 0.9; b.vy *= 0.9;
      if (b.k === 0 && b.t > 0.5) {
        b.k = 1; EM.sfx('orb');
        const n = b.phase >= 2 ? 5 : 3;
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.7; g.proj.push({ kind: 'orb', x: cx, y: cy, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, home: 140, max: 115, r: 9, life: 4.5, t: 0, c: '#8fd8ff' }); }
      }
      if (b.t > 1.2) { b.st = 'drift'; b.t = 0; }
      break;
    }
    case 'ring': {
      b.vx *= 0.9; b.vy *= 0.9;
      if (b.k === 0 && b.t > 0.8 / spd) { b.k = 1; EM.sfx('zap'); g.proj.push({ kind: 'ring', x: cx, y: cy, r0: 20, r1: 200, dur: 0.65, t: 0, life: 1 }); }
      if (b.phase >= 2 && b.k === 1 && b.t > 1.3 / spd) { b.k = 2; EM.sfx('zap'); g.proj.push({ kind: 'ring', x: cx, y: cy, r0: 20, r1: 200, dur: 0.65, t: 0, life: 1 }); }
      if (b.t > (b.phase >= 2 ? 2.1 : 1.6) / spd) { b.st = 'drift'; b.t = 0; }
      break;
    }
    case 'dive': {
      if (b.k === 0) { b.k = 1; const d = Math.hypot(P.x - cx, P.y - 14 - cy) || 1; b.dvx = (P.x - cx) / d * 340 * spd; b.dvy = (P.y - 14 - cy) / d * 340 * spd; }
      if (b.t < 0.45) { b.vx = -b.dvx * 0.15; b.vy = -b.dvy * 0.15; }
      else if (b.t < 1.1) { b.vx = b.dvx; b.vy = b.dvy; }
      else { b.vx *= 0.9; b.vy *= 0.9; }
      b.x += b.vx * dt; b.y += b.vy * dt; clampIn();
      if (b.t > 1.9) { b.st = 'drift'; b.t = 0; }   // 衝完會在低處喘一下：反擊的機會
      break;
    }
  }
}

// ───────────── 互動：篝火、石碑、道具、房間 ─────────────
EM.stepInteract = function (dt) {
  const g = G(), P = g.P, s = g.save;
  if (P.dead) return;
  const PB = pbox(P);
  P.interact = null;
  for (const bn of g.W.benches) if (Math.abs(P.x - bn.x) < 36 && Math.abs(P.y - bn.y) < 20) P.interact = { kind: 'bench', ref: bn };
  for (const tb of g.W.tablets) if (Math.abs(P.x - tb.x) < 30 && Math.abs(P.y - tb.y) < 20) P.interact = { kind: 'tablet', ref: tb };
  if (P.interact && IN_UP() && P.grounded) {
    if (P.interact.kind === 'bench') EM.rest(P.interact.ref);
    else { EM.showDialog(P.interact.ref.text, '石碑'); if (!s.read.includes(P.interact.ref.text.slice(0, 8))) { s.read.push(P.interact.ref.text.slice(0, 8)); EM.persist(); } }
  }
  // 道具
  for (const it of g.W.items) {
    if (it.got) continue;
    if (Math.hypot(P.x - it.x, P.y - 13 - it.y) < 26) {
      it.got = true;
      if (it.kind === 'life') { s.maxHp++; P.hp = s.maxHp; s.items.push(it.id); EM.sfx('item'); EM.showDialog('生命增加了。\n最大生命 +1。', '燼之心'); }
      else if (it.kind === 'flask') { s.maxFlask++; s.items.push(it.id); EM.sfx('item'); EM.showDialog('可以儲存更多的燼。\n回復次數上限 +1。', '燼瓶'); }
      else if (it.kind === 'ability') {
        s.abil[it.id] = true; EM.sfx('ability'); g.flash = 0.6;
        const A = ABIL[it.id];
        EM.showDialog(A.text + `\n\n得到了印記（${s.sigils} / 3）。`, A.name);
      }
      EM.burst(it.x, it.y, 30, '#ffe2a8', 220);
      EM.persist();
    }
  }
  g.W.items = g.W.items.filter(it => !it.got);
  // 王座之門
  if (!g.sigilOpen && s.sigils >= 3) {
    for (let i = 0; i < g.W.grid.length; i++) if (g.W.grid[i] === TL.SIGIL) {
      const c = i % g.W.W, r = (i / g.W.W) | 0;
      if (Math.abs(c * T + 16 - P.x) < 80 && Math.abs(r * T - P.y) < 80) { EM.openSigil(); EM.sfx('ability'); g.shake = 0.5; EM.showDialog('三個印記一起發出光。\n王座之門打開了。', '王座之門'); break; }
    }
  }
  // 房間
  const ri = EM.roomAtPx(P.x, P.y - 13);
  if (ri !== g.roomIdx) {
    g.roomIdx = ri;
    const Rm = g.W.rooms[ri];
    if (!s.visited.includes(Rm.id)) { s.visited.push(Rm.id); EM.persist(); }
    const prevArea = g.lastArea;
    if (Rm.area !== prevArea) { g.lastArea = Rm.area; const A = EM.AREAS[Rm.area]; if (prevArea) g.banner = { title: A.name, sub: A.en, t: 0 }; EM.music && EM.music('area'); }
    // 離開頭目房：頭目重置
    if (g.fight && g.fight.room !== ri) { const b = g.fight.boss; Object.assign(b, makeBoss(b.def)); g.fight = null; g.proj = []; EM.music && EM.music('area'); }
  }
};
function IN_UP() { return EM.IN.pressed.up; }
})();
