'use strict';
// 玩家、武器、敵人、頭目、子彈、道具、特效
const WEAPONS = ['red', 'blue', 'purple'];
const WNAME = { red: '火神砲', blue: '雷射', purple: '電漿', M: '飛彈', H: '追蹤飛彈' };
const P = { x: 180, y: 560, alive: true, inv: 0, dead: 0, w: 'red', lvl: 1, sub: null, sl: 0, ft: 0, st: 0, bank: 0, entering: 0, plasma: [], auto: 0, ctrl: true };

function turnTo(a, b, max) {
  let d = ((b - a + Math.PI * 3) % TAU) - Math.PI;
  return a + clamp(d, -max, max);
}
const aim = (x, y) => Math.atan2(P.y - y, P.x - x);

// ---------- 玩家 ----------
function playerEnter() {
  P.x = 180; P.y = H + 40; P.alive = true; P.dead = 0; P.entering = 0.9; P.inv = Math.max(P.inv, 1.2); P.ctrl = true; P.auto = 0;
}
function updatePlayer(dt) {
  if (!P.alive) {
    P.dead -= dt;
    if (P.dead <= 0) {
      if (G.lives > 0) { playerEnter(); P.inv = 3; }
      else if (G.state === 'play') showContinue();
    }
    return;
  }
  if (P.inv > 0) P.inv -= dt;
  if (P.auto) { // 過關時自動飛出畫面
    P.y -= P.auto * dt; P.auto += 400 * dt; P.bank *= 0.9;
    return;
  }
  if (P.entering > 0) {
    P.entering -= dt; P.y = lerp(P.y, 540, Math.min(1, dt * 5));
    if (P.entering > 0.35) return;
  }
  const k = Input.keys, pad = Input.pad;
  let dx = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0) + pad.x;
  let dy = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0) + pad.y;
  const focus = k.ShiftLeft || k.ShiftRight;
  const sp = focus ? 120 : 215;
  const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  let mvx = dx * sp * dt, mvy = dy * sp * dt;
  if (Input.ptr) { mvx += Input.ptr.dx * 1.35; mvy += Input.ptr.dy * 1.35; Input.ptr.dx = 0; Input.ptr.dy = 0; }
  const ox = P.x;
  P.x = clamp(P.x + mvx, 12, W - 12); P.y = clamp(P.y + mvy, 40, H - 18);
  P.bank = lerp(P.bank, clamp((P.x - ox) / (dt * 260 + 0.0001), -1, 1), Math.min(1, dt * 10));
  // 射擊
  const firing = Store.data.auto || k.KeyZ || k.KeyJ || k.Space || pad.fire || Input.ptr;
  P.ft -= dt; P.st -= dt;
  if (firing && G.phase !== 'clear' && G.phase !== 'down') { firePrimary(dt); fireSub(); } else P.plasma.length = 0;
  if (Input.hit('KeyX') || Input.hit('KeyK') || Input.bombTap || pad.bombEdge) useBomb();
}

function pbShot(x, y, a, kind, extra) {
  const s = kind === 'v' ? 780 : 1150;
  G.pb.push(Object.assign({ x, y, vx: Math.sin(a) * s, vy: -Math.cos(a) * s, kind, dmg: 1, a }, extra || {}));
}
function firePrimary(dt) {
  const L = P.lvl;
  if (P.w !== 'purple') P.plasma.length = 0;
  if (P.w === 'red') {
    if (P.ft > 0) return;
    P.ft = Math.max(P.ft, -0.03) + 0.085;
    const n = [2, 3, 4, 5, 5, 6, 7, 8][L - 1], spread = [0, 8, 13, 18, 24, 29, 35, 42][L - 1] * Math.PI / 180;
    if (n === 2 && !spread) { pbShot(P.x - 5, P.y - 14, 0, 'v'); pbShot(P.x + 5, P.y - 14, 0, 'v'); }
    else for (let i = 0; i < n; i++) { const a = -spread + 2 * spread * i / (n - 1); pbShot(P.x + Math.sin(a) * 8, P.y - 14, a, 'v'); }
    if (L >= 5) { pbShot(P.x - 4, P.y - 16, 0, 'v'); pbShot(P.x + 4, P.y - 16, 0, 'v'); }
    Snd.play('shot');
  } else if (P.w === 'blue') {
    if (P.ft > 0) return;
    P.ft = Math.max(P.ft, -0.03) + 0.05;
    pbShot(P.x, P.y - 22, 0, 'l', { w: 5 + L * 1.7, h: 64, dmg: 1.05 + L * 0.3 });
    Snd.play('laser');
  } else {
    // 電漿：會自己轉彎追敵人的閃電
    const nt = [1, 1, 2, 2, 3, 3, 4, 4][L - 1], dps = 12 + L * 1.3;
    const list = G.enemies.filter(e => !e.dead && !e.hidden && e.y > 0 && e.y < H && e.x > 0 && e.x < W && !e.inv)
      .sort((a, b) => d2(a.x, a.y, P.x, P.y) - d2(b.x, b.y, P.x, P.y));
    P.plasma.length = 0;
    for (let i = 0; i < nt; i++) {
      const e = list.length ? list[i % list.length] : null;
      if (e) { hurt(e, dps * dt * (list.length < nt && i >= list.length ? 0.6 : 1)); P.plasma.push({ e, x: e.x, y: e.y, side: i % 2 ? 1 : -1 }); }
      else P.plasma.push({ e: null, x: P.x + (i - (nt - 1) / 2) * 26, y: P.y - 170, side: i % 2 ? 1 : -1 });
    }
    if (list.length) Snd.play('plasma');
  }
}
function fireSub() {
  if (!P.sub || P.st > 0) return;
  const L = P.sl;
  if (P.sub === 'M') {
    P.st = [0.55, 0.45, 0.4, 0.32][L - 1];
    const offs = L >= 3 ? [-14, -7, 7, 14] : [-9, 9];
    for (const o of offs) G.pb.push({ x: P.x + o, y: P.y, vx: o * 2, vy: -140, kind: 'm', dmg: 4, a: 0 });
  } else {
    P.st = [0.6, 0.5, 0.45, 0.38][L - 1];
    const n = [2, 2, 3, 4][L - 1];
    for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.9; G.pb.push({ x: P.x, y: P.y, vx: Math.sin(a) * 260, vy: -Math.cos(a) * 160, kind: 'h', dmg: 3, a, life: 2.6 }); }
  }
  Snd.play('missile');
}
function useBomb() {
  if (!P.alive || G.bombs <= 0 || G.bombT > 0 || P.auto) return false;
  G.bombs--; G.bombT = 2.0; P.inv = Math.max(P.inv, 2.4); G.flash = 0.6; G.shake = 8;
  Snd.play('bomb');
  return true;
}
function playerHit() {
  if (!P.alive || P.inv > 0 || G.bombT > 0 || P.auto) return;
  if (G.d.autoBomb && G.bombs > 0) { useBomb(); popText(P.x, P.y - 30, '自動炸彈！', '#ffd23f'); return; }
  P.alive = false; P.dead = 1.8; G.lives--; G.miss++;
  boom(P.x, P.y, 2.2); Snd.play('die'); G.shake = 10;
  const drop = G.d.drop;
  if (P.lvl > 1) spawnItem('P', P.x, P.y, P.w);
  P.lvl = Math.max(1, P.lvl - drop);
  if (P.sub) { spawnItem('S', P.x, P.y, P.sub); P.sl--; if (P.sl <= 0) { P.sub = null; P.sl = 0; } }
  G.bombs = Math.max(G.bombs, G.d.bombs);
  P.plasma.length = 0;
  G.eb.length = 0;
}
function drawPlayer(ctx) {
  if (!P.alive) return;
  if (P.inv > 0 && !P.entering && Math.floor(G.t * 20) % 2 === 0) return;
  const sx = 1 - Math.abs(P.bank) * 0.22;
  // 尾焰
  const fl = 6 + Math.random() * 5 + (P.auto ? 12 : 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const ox of [-2.7, 2.7]) {
    const gr = ctx.createLinearGradient(0, P.y + 18, 0, P.y + 18 + fl);
    gr.addColorStop(0, 'rgba(255,255,220,.95)'); gr.addColorStop(0.4, 'rgba(255,170,60,.8)'); gr.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(P.x + ox * sx - 2, P.y + 18); ctx.lineTo(P.x + ox * sx + 2, P.y + 18); ctx.lineTo(P.x + ox * sx, P.y + 18 + fl); ctx.fill();
  }
  ctx.restore();
  Art.draw(ctx, 'player', P.x, P.y, 0, 1, sx, 1);
  if (P.inv > 0 && P.entering <= 0 && G.bombT <= 0) {
    ctx.strokeStyle = 'rgba(120,220,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P.x, P.y, 22, 0, TAU); ctx.stroke();
  }
}
function drawPlayerHitbox(ctx) {
  if (!P.alive || !(Input.keys.ShiftLeft || Input.keys.ShiftRight)) return;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ff3b6b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(P.x, P.y, 3.5, 0, TAU); ctx.fill(); ctx.stroke();
}

// ---------- 玩家子彈 ----------
function updatePB(dt) {
  for (const b of G.pb) {
    if (b.kind === 'l') { b.x += (P.x - b.x) * Math.min(1, dt * 7); }
    else if (b.kind === 'm') { b.vy = Math.max(-650, b.vy - 1400 * dt); b.vx *= 0.9; }
    else if (b.kind === 'h') {
      b.life -= dt;
      if (!b.tg || b.tg.dead || b.tg.hidden) b.tg = nearestEnemy(b.x, b.y);
      const sp = 440;
      let a = Math.atan2(b.vy, b.vx);
      if (b.tg) a = turnTo(a, Math.atan2(b.tg.y - b.y, b.tg.x - b.x), 6.5 * dt);
      else a = turnTo(a, -Math.PI / 2, 3 * dt);
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      if (G.t % 0.05 < dt) fxP({ k: 's', x: b.x, y: b.y, vx: 0, vy: 20, r: 2.5, life: 0, max: 0.35, a: 0.25 });
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -70 || b.y > H + 20 || b.x < -20 || b.x > W + 20 || b.life < 0) { b.dead = true; continue; }
    for (const e of G.enemies) {
      if (e.dead || e.hidden || e.y < -10) continue;
      if (hitTest(e, b)) {
        hurt(e, b.dmg); b.dead = true;
        if (b.kind === 'v') fxP({ k: 'k', x: b.x, y: b.y, vx: rnd(-60, 60), vy: rnd(40, 120), life: 0, max: 0.12 });
        else if (b.kind === 'l') fxP({ k: 'f', x: b.x + rnd(-3, 3), y: b.y - 28, vx: 0, vy: 0, r: b.w * 0.45, life: 0, max: 0.1 });
        else { fxP({ k: 'f', x: b.x, y: b.y, vx: 0, vy: 0, r: 7, life: 0, max: 0.25 }); fxP({ k: 'k', x: b.x, y: b.y, vx: rnd(-90, 90), vy: rnd(-90, 90), life: 0, max: 0.2 }); }
        Snd.play('hit');
        break;
      }
    }
  }
  G.pb = G.pb.filter(b => !b.dead);
}
function hitCircles(e) {
  const T = ET[e.type];
  return T.hb ? T.hb.map(h => [e.x + h[0], e.y + h[1], h[2]]) : [[e.x, e.y, e.r]];
}
function hitTest(e, b) {
  const hw = b.kind === 'l' ? b.w / 2 : 3, hh = b.kind === 'l' ? b.h / 2 : 7, by = b.kind === 'l' ? b.y - b.h / 2 + 8 : b.y;
  for (const [cx, cy, r] of hitCircles(e)) {
    if (Math.abs(cx - b.x) < r + hw && Math.abs(cy - by) < r + hh) return true;
  }
  return false;
}
function nearestEnemy(x, y) {
  let best = null, bd = 1e12;
  for (const e of G.enemies) {
    if (e.dead || e.hidden || e.inv || e.y < 0 || e.y > H) continue;
    const d = d2(e.x, e.y, x, y); if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function drawPB(ctx) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const b of G.pb) {
    if (b.kind === 'v') Art.draw(ctx, 'pb', b.x, b.y, b.a);
    else if (b.kind === 'l') {
      ctx.fillStyle = 'rgba(60,160,255,.35)'; ctx.fillRect(b.x - b.w / 2 - 3, b.y - b.h / 2, b.w + 6, b.h);
      ctx.fillStyle = 'rgba(120,220,255,.8)'; ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      ctx.fillStyle = 'rgba(240,255,255,.95)'; ctx.fillRect(b.x - b.w / 5, b.y - b.h / 2, b.w / 2.5, b.h);
    }
  }
  ctx.restore();
  for (const b of G.pb) {
    if (b.kind === 'm' || b.kind === 'h') {
      const a = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,60,.8)';
      ctx.beginPath(); ctx.arc(b.x - Math.sin(a) * -9, b.y + Math.cos(a) * 9, 2.5 + Math.random() * 1.5, 0, TAU); ctx.fill(); ctx.restore();
      Art.draw(ctx, b.kind === 'm' ? 'mis' : 'hmis', b.x, b.y, a);
    }
  }
  // 電漿閃電
  if (P.plasma.length && P.alive) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const p of P.plasma) {
      const tx = p.e ? p.e.x : p.x, ty = p.e ? p.e.y : p.y;
      const sx = P.x, sy = P.y - 18;
      const cx = sx + p.side * 50 + (tx - sx) * 0.2, cy = sy - 70;
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, it = 1 - t;
        let x = it * it * sx + 2 * it * t * cx + t * t * tx, y = it * it * sy + 2 * it * t * cy + t * t * ty;
        if (i && i < 12) { x += rnd(-4, 4); y += rnd(-4, 4); }
        pts.push(x, y);
      }
      for (const [w, c] of [[9, 'rgba(170,60,255,.25)'], [4, 'rgba(210,130,255,.7)'], [1.6, 'rgba(255,240,255,.95)']]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.stroke();
      }
      if (p.e) { ctx.fillStyle = 'rgba(230,180,255,.6)'; ctx.beginPath(); ctx.arc(tx, ty, 6 + Math.random() * 4, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
}

// ---------- 敵方子彈 ----------
function canShoot(e) { return P.alive && !P.auto && e.y > 6 && e.y < H - 150 && e.x > 4 && e.x < W - 4 && G.phase !== 'down' && G.phase !== 'clear'; }
function eShot(x, y, a, spd, kind = 's') {
  if (G.eb.length > 520) return;
  const s = spd * G.d.bs;
  G.eb.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind, r: kind === 'b' ? 5.2 : kind === 'm' ? 4 : 3, t: 0 });
}
function fan(x, y, c, n, spread, spd, kind) {
  n = Math.max(1, Math.round(n * G.d.dens)); if (n % 2 === 0 && G.d.dens < 1) n++;
  for (let i = 0; i < n; i++) eShot(x, y, n > 1 ? c - spread / 2 + spread * i / (n - 1) : c, spd, kind);
  Snd.play('eshot');
}
function ring(x, y, n, spd, off = 0, kind) {
  n = Math.max(5, Math.round(n * G.d.dens));
  for (let i = 0; i < n; i++) eShot(x, y, off + i * TAU / n, spd, kind);
  Snd.play('eshot');
}
function updateEB(dt) {
  const hr = G.d.hit;
  for (const b of G.eb) {
    b.t += dt;
    if (b.kind === 'm' && b.t < 1.5 && P.alive) {
      const sp = Math.hypot(b.vx, b.vy), a = turnTo(Math.atan2(b.vy, b.vx), aim(b.x, b.y), 2.0 * dt);
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      if (G.t % 0.06 < dt) fxP({ k: 's', x: b.x, y: b.y, vx: 0, vy: 0, r: 2, life: 0, max: 0.3, a: 0.2 });
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < -20 || b.x > W + 20 || b.y < -30 || b.y > H + 20) { b.dead = true; continue; }
    if (P.alive && d2(b.x, b.y, P.x, P.y) < (b.r + hr) * (b.r + hr)) { b.dead = true; playerHit(); }
  }
  G.eb = G.eb.filter(b => !b.dead);
  // 頭目的雷射光柱
  for (const bm of G.beams) {
    bm.t += dt;
    if (bm.t > bm.warn && bm.t < bm.warn + bm.life && P.alive && Math.abs(P.x - bm.x) < bm.w / 2 - 3 && P.y > bm.y) playerHit();
  }
  G.beams = G.beams.filter(b => b.t < b.warn + b.life);
}
function drawEB(ctx) {
  for (const bm of G.beams) {
    if (bm.t < bm.warn) {
      const a = 0.35 + 0.35 * Math.sin(bm.t * 30);
      ctx.fillStyle = `rgba(255,60,60,${a})`; ctx.fillRect(bm.x - 1, bm.y, 2, H - bm.y);
      ctx.strokeStyle = `rgba(255,80,80,${a * 0.6})`; ctx.setLineDash([6, 6]); ctx.strokeRect(bm.x - bm.w / 2, bm.y, bm.w, H - bm.y); ctx.setLineDash([]);
    } else {
      const k = bm.t - bm.warn, w = bm.w * Math.min(1, k * 8) * (1 - Math.max(0, (k - bm.life + 0.15) / 0.15));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,60,90,.35)'; ctx.fillRect(bm.x - w / 2 - 6, bm.y, w + 12, H - bm.y);
      ctx.fillStyle = 'rgba(255,140,170,.85)'; ctx.fillRect(bm.x - w / 2, bm.y, w, H - bm.y);
      ctx.fillStyle = '#fff'; ctx.fillRect(bm.x - w / 6, bm.y, w / 3, H - bm.y);
      ctx.restore();
    }
  }
  for (const b of G.eb) {
    if (b.kind === 'b') Art.draw(ctx, 'ebB', b.x, b.y);
    else if (b.kind === 'm') Art.draw(ctx, 'emis', b.x, b.y, Math.atan2(b.vy, b.vx) - Math.PI / 2);
    else Art.draw(ctx, 'eb', b.x, b.y);
  }
}

// ---------- 敵人 ----------
function spawn(type, x, y, o = {}) {
  const T = ET[type];
  const e = { type, x, y, vx: 0, vy: 0, t: 0, hp: T.hp * (T.boss ? G.d.bossHp : G.d.hp), r: T.r, score: T.score, ground: !!T.ground,
    layer: T.layer || (T.ground ? 'ground' : 'air'), flash: 0, ft: rnd(0.4, 1.2), ang: 0, o, dead: false, boss: !!T.boss };
  e.maxhp = e.hp;
  if (T.init) T.init(e, o);
  G.enemies.push(e);
  return e;
}
function hurt(e, d) {
  if (e.inv || e.dead) return;
  e.hp -= d; e.flash = 0.05;
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  const T = ET[e.type];
  addScore(e.score);
  G.kills++;
  const sz = e.boss ? 3.5 : T.big ? 2.4 : e.r > 12 ? 1.4 : 1;
  boom(e.x, e.y, sz, e.layer === 'ground');
  if (e.layer === 'ground' && !e.boss) G.decals.push({ x: e.x, y: e.y, r: e.r * 1.2 });
  const drops = [].concat(e.o.drop || T.drop || []);
  drops.forEach((k, i) => spawnItem(k, e.x + i * 16 - (drops.length - 1) * 8, e.y));
  if (e.layer === 'ground' && !e.boss && !drops.length && Math.random() < (T.medal || 0.3)) spawnItem('medal', e.x, e.y);
  if (T.onDeath) T.onDeath(e);
}
function updateEnemies(dt) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.t += dt; if (e.flash > 0) e.flash -= dt;
    const T = ET[e.type];
    T.update(e, dt);
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.ground) e.y += G.speed * dt;
    if (!e.boss && e.t > 1 && (e.y > H + 90 || e.y < -280 || e.x < -120 || e.x > W + 120)) e.gone = true;
    // 撞到空中敵機
    if (e.layer === 'air' && !e.hidden && P.alive && !e.inv) {
      for (const [cx, cy, r] of hitCircles(e)) if (d2(cx, cy, P.x, P.y) < (r * 0.7 + 4) ** 2) { playerHit(); break; }
    }
  }
  G.enemies = G.enemies.filter(e => !e.dead && !e.gone);
}
function drawEnemies(ctx, layer) {
  for (const e of G.enemies) {
    if (e.layer !== layer || e.hidden) continue;
    ET[e.type].draw(ctx, e);
  }
}
function drawEnemyShadows(ctx) {
  for (const e of G.enemies) {
    if (e.layer !== 'air' || e.hidden) continue;
    const T = ET[e.type];
    if (T.shadow) T.shadow(ctx, e);
    else if (T.spr) Art.shadow(ctx, T.spr, e.x, e.y, e.ang);
  }
}
function spr(ctx, e, name, ang = e.ang, sx = 1, sy = 1) {
  Art.draw(ctx, name, e.x, e.y, ang, 1, sx, sy);
  if (e.flash > 0) Art.draw(ctx, name, e.x, e.y, ang, 1, sx, sy, 'w');
}
function rotor(ctx, x, y, r, t, n = 2) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,30,30,.12)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.rotate(t * 28); ctx.strokeStyle = 'rgba(25,25,25,.55)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) { ctx.rotate(Math.PI / n); ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke(); }
  ctx.restore();
}

const ET = {
  fighter: { hp: 2, r: 10, score: 100, spr: 'fighter',
    init(e, o) {
      e.path = o.path || 'down'; e.x0 = e.x; e.dir = o.dir || 1;
      if (e.path === 'down') { e.vy = o.vy || 170; e.vx = o.vx || 0; }
      if (e.path === 'dive') { e.stop = o.stop || 160; }
      e.ang = 0;
    },
    update(e, dt) {
      const o = e.o;
      if (e.path === 'sine') { e.vy = 130; e.vx = Math.cos(e.t * 2.6) * (o.amp || 45) * 2.6; }
      else if (e.path === 'swoop') { e.vx = e.dir * (50 + e.t * 135); e.vy = 230 - e.t * 175; }
      else if (e.path === 'dive') {
        if (e.st === undefined) { e.vy = Math.max(25, (e.stop - e.y) * 3); if (e.y >= e.stop - 4) e.st = 0; }
        else {
          e.st += dt;
          if (e.st < 0.55) { e.vy = 0; e.ang = turnTo(e.ang, aim(e.x, e.y) - Math.PI / 2, 4 * dt); }
          else {
            if (!e.fired) { e.fired = true; if (canShoot(e)) fan(e.x, e.y, aim(e.x, e.y), 3, 0.42, 150); e.vx = clamp((P.x - e.x) * 0.9, -170, 170); }
            e.vy = Math.min(400, e.vy + 520 * dt);
          }
        }
      }
      if (Math.abs(e.vx) + Math.abs(e.vy) > 20) e.ang = turnTo(e.ang, Math.atan2(e.vy, e.vx) - Math.PI / 2, 8 * dt);
      if (e.path !== 'dive' && !e.fired && e.t > (o.fireAt || 0.75)) { e.fired = true; if (canShoot(e) && Math.random() < G.d.shotChance) eShot(e.x, e.y + 8, aim(e.x, e.y), 165); }
    },
    draw(ctx, e) { spr(ctx, e, 'fighter'); },
  },
  jet: { hp: 3, r: 10, score: 250, spr: 'jet',
    init(e) { e.warn = 0.9; e.hidden = true; },
    update(e, dt) {
      if (e.warn > 0) { e.warn -= dt; if (e.warn <= 0) { e.hidden = false; e.vy = -430; } return; }
      if (e.t < 1.4) e.vx = clamp((P.x - e.x) * 0.6, -90, 90) * 0.5;
      e.ang = Math.atan2(e.vy, e.vx) + Math.PI / 2;
    },
    draw(ctx, e) { spr(ctx, e, 'jet'); },
  },
  drone: { hp: 1, r: 9, score: 60, spr: 'drone',
    init(e, o) { e.x0 = e.x; e.amp = o.amp ?? 70; e.ph = o.ph || 0; e.vy = o.sp || 125; },
    update(e, dt) {
      e.x = e.x0 + Math.sin(e.t * 2.4 + e.ph) * e.amp;
      e.ang = e.t * 4;
      if (G.d.dens > 1 && !e.fired && e.t > 1.1) { e.fired = true; if (canShoot(e)) eShot(e.x, e.y, aim(e.x, e.y), 150); }
    },
    draw(ctx, e) { spr(ctx, e, 'drone'); },
  },
  chopper: { hp: 9, r: 13, score: 300,
    init(e, o) { e.stop = o.stop || rnd(110, 230); e.vy = 140; e.leave = o.leave || 4.6; },
    update(e, dt) {
      if (e.st === undefined) { e.vy = Math.max(15, (e.stop - e.y) * 2.2); if (e.y >= e.stop - 3) e.st = 0; }
      else {
        e.st += dt; e.vy = e.st > e.leave ? (e.st - e.leave) * 170 : 0; e.vx = Math.sin(e.st * 1.3) * 22;
        e.ft -= dt * G.d.fr;
        if (e.ft <= 0 && e.st < e.leave) { e.ft = 1.5; if (canShoot(e)) fan(e.x, e.y + 10, aim(e.x, e.y), 3, 0.45, 140); }
      }
      e.ang = clamp(-e.vx / 120, -0.3, 0.3);
    },
    shadow(ctx, e) { Art.shadow(ctx, 'chopper', e.x, e.y, e.ang); },
    draw(ctx, e) { spr(ctx, e, 'chopper'); rotor(ctx, e.x, e.y - 1, 17, e.t); },
  },
  carrier: { hp: 10, r: 14, score: 500,
    init(e) { e.vy = 55; e.x0 = e.x; },
    update(e) { e.x = e.x0 + Math.sin(e.t * 1.1) * 40; e.ang = Math.cos(e.t * 1.1) * -0.2; },
    shadow(ctx, e) { Art.shadow(ctx, 'carrier', e.x, e.y, e.ang); },
    draw(ctx, e) {
      spr(ctx, e, 'carrier'); rotor(ctx, e.x, e.y + 1, 18, e.t, 3);
      if (Math.floor(e.t * 4) % 2) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(e.x, e.y + 14, 2, 0, TAU); ctx.fill(); }
    },
  },
  bomber: { hp: 70, r: 30, score: 5000, big: 1, hb: [[0, 0, 24], [-40, -14, 14], [40, -14, 14]], spr: 'bomber', drop: ['P', 'B'],
    init(e) { e.vy = 70; e.x0 = e.x; e.pat = 0; e.ft = 1.5; },
    update(e, dt) {
      if (e.st === undefined) { e.vy = Math.max(12, (115 - e.y) * 1.4); if (e.y >= 112) e.st = 0; return; }
      e.st += dt; e.vy = e.st > 16 ? -70 : 0;
      e.x = e.x0 + Math.sin(e.st * 0.6) * 70;
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0 && e.st < 16) {
        e.ft = 2.2; e.pat++;
        if (!canShoot(e)) return;
        if (e.pat % 2) ring(e.x, e.y + 10, 14, 110, e.st);
        else { fan(e.x - 40, e.y, aim(e.x - 40, e.y), 3, 0.4, 150); fan(e.x + 40, e.y, aim(e.x + 40, e.y), 3, 0.4, 150); }
      }
    },
    draw(ctx, e) {
      spr(ctx, e, 'bomber');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const x of [-42, -24, 24, 42]) { ctx.fillStyle = 'rgba(255,170,60,.5)'; ctx.beginPath(); ctx.arc(e.x + x, e.y - 30, 3 + Math.random() * 2, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
  },
  tank: { hp: 7, r: 12, score: 200, ground: true,
    init(e, o) { e.vx = o.vx || 0; e.vy = o.vy ?? 14; e.body = (e.vx || e.vy) ? Math.atan2(e.vy, e.vx) - Math.PI / 2 : 0; e.tur = Math.PI / 2; },
    update(e, dt) {
      e.tur = turnTo(e.tur, aim(e.x, e.y), 2.4 * dt);
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = rnd(2.1, 2.9); if (canShoot(e)) eShot(e.x + Math.cos(e.tur) * 13, e.y + Math.sin(e.tur) * 13, e.tur, 130); }
    },
    draw(ctx, e) { spr(ctx, e, 'tank', e.body); spr(ctx, e, 'tankTur', e.tur - Math.PI / 2); },
  },
  turret: { hp: 12, r: 14, score: 400, ground: true, medal: 0.5,
    init(e) { e.tur = Math.PI / 2; e.ft = rnd(0.8, 1.8); },
    update(e, dt) {
      e.tur = turnTo(e.tur, aim(e.x, e.y), 2 * dt);
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) {
        e.ft = 2.3; if (!canShoot(e)) return;
        const bx = e.x + Math.cos(e.tur) * 14, by = e.y + Math.sin(e.tur) * 14;
        eShot(bx, by, e.tur, 140); G.queue.push({ t: G.st + 0.15, fn: () => { if (!e.dead && canShoot(e)) eShot(e.x + Math.cos(e.tur) * 14, e.y + Math.sin(e.tur) * 14, e.tur, 140); } });
      }
    },
    draw(ctx, e) { Art.draw(ctx, 'pad', e.x, e.y); spr(ctx, e, 'gunTur', e.tur - Math.PI / 2); },
  },
  truck: { hp: 3, r: 8, score: 150, ground: true, medal: 0.9,
    init(e) { e.vy = 38; },
    update() { },
    draw(ctx, e) { spr(ctx, e, 'truck', 0); },
  },
  boat: { hp: 9, r: 12, score: 300, ground: true, medal: 0.4,
    init(e) { e.vy = -26; e.tur = Math.PI / 2; },
    update(e, dt) {
      e.tur = turnTo(e.tur, aim(e.x, e.y), 2 * dt);
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 2.3; if (canShoot(e)) fan(e.x, e.y - 10, aim(e.x, e.y - 10), 2, 0.2, 135); }
    },
    draw(ctx, e) { wake(ctx, e.x, e.y + 20, 9, e.t); spr(ctx, e, 'boat', 0); },
  },
  cruiser: { hp: 60, r: 24, score: 3000, ground: true, big: 1, hb: [[0, -55, 18], [0, -15, 22], [0, 30, 22], [0, 65, 16]], drop: 'P',
    init(e) { e.vy = -18; e.tur = [Math.PI / 2, Math.PI / 2, Math.PI / 2]; e.ti = 0; },
    update(e, dt) {
      const offs = [-52, -30, 42];
      e.tur = e.tur.map((a, i) => turnTo(a, aim(e.x, e.y + offs[i]), 1.8 * dt));
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) {
        e.ft = 0.75; e.ti = (e.ti + 1) % 3;
        const i = e.ti, ty = e.y + offs[i];
        if (canShoot(e) && ty > 10) fan(e.x, ty, e.tur[i], 3, 0.32, 140);
      }
    },
    draw(ctx, e) {
      wake(ctx, e.x, e.y + 86, 26, e.t);
      spr(ctx, e, 'cruiser', 0);
      [-52, -30, 42].forEach((o, i) => Art.draw(ctx, 'gunTur', e.x, e.y + o, e.tur[i] - Math.PI / 2, 1, 1.15, 1.15));
    },
  },
};
function wake(ctx, x, y, w, t) {
  ctx.save(); ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#e8f6ff';
  ctx.beginPath(); ctx.moveTo(x - w * 0.6, y - 6); ctx.lineTo(x - w * 2.2, y + w * 4); ctx.lineTo(x - w * 1.4, y + w * 4); ctx.lineTo(x, y + 2); ctx.lineTo(x + w * 1.4, y + w * 4); ctx.lineTo(x + w * 2.2, y + w * 4); ctx.lineTo(x + w * 0.6, y - 6); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.35; ctx.fillRect(x - w * 0.5, y - 4, w, w * 3);
  ctx.restore();
}

// ---------- 頭目 ----------
function bossEnter(e, dt, ty, sp = 55) {
  if (!e.inv) return false;
  e.y += Math.max(18, (ty - e.y) * 1.2, sp * (e.y < ty - 60 ? 1 : 0.4)) * dt;
  if (e.y >= ty) { e.y = ty; e.inv = false; e.mt = 0; e.x0 = e.x; }
  return true;
}
function bossBase(e) { e.inv = true; e.mt = 0; e.p2 = false; e.ta = 1; e.tb = 2; e.tc = 0; e.sa = 0; e.pat = 0; }
function phase2(e) {
  if (!e.p2 && e.hp < e.maxhp * 0.5) { e.p2 = true; boom(e.x + rnd(-30, 30), e.y + rnd(-20, 20), 1.6); popText(e.x, e.y - 40, '怒氣全開！', '#ff5a4e'); G.shake = 6; }
  return e.p2;
}
function bossSmoke(e) {
  if (e.p2 && Math.random() < 0.25) fxP({ k: 's', x: e.x + rnd(-40, 40), y: e.y + rnd(-30, 30), vx: rnd(-10, 10), vy: e.layer === 'air' ? -40 : -20, r: rnd(4, 8), life: 0, max: 1, a: 0.4 });
}

ET.boss1 = { name: '鋼鐵巨獸', en: 'IRON BEHEMOTH', hp: 650, r: 46, score: 50000, boss: true, layer: 'ground', hb: [[0, -10, 46], [0, 40, 30]],
  init(e) { bossBase(e); e.tur = Math.PI / 2; e.gl = Math.PI / 2; e.gr = Math.PI / 2; },
  update(e, dt) {
    e.tur = turnTo(e.tur, aim(e.x, e.y), 1.4 * dt);
    e.gl = turnTo(e.gl, aim(e.x - 42, e.y + 34), 3 * dt); e.gr = turnTo(e.gr, aim(e.x + 42, e.y + 34), 3 * dt);
    if (bossEnter(e, dt, 160)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.45) * 72; e.y = 160 + Math.sin(e.mt * 0.8) * 10;
    const p2 = phase2(e); bossSmoke(e);
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    e.ta -= f;
    if (e.ta <= 0) { e.ta = p2 ? 1.25 : 1.7; fan(e.x - 42, e.y + 34, e.gl, 3, 0.3, 150); fan(e.x + 42, e.y + 34, e.gr, 3, 0.3, 150); }
    e.tb -= f;
    if (!p2) { if (e.tb <= 0) { e.tb = 2.8; ring(e.x, e.y - 6, 14, 100, rnd(TAU), 'b'); } }
    else {
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.12; e.sa += 0.27; eShot(e.x, e.y - 6, e.sa, 112); eShot(e.x, e.y - 6, e.sa + Math.PI, 112); }
      if (e.tb <= 0) { e.tb = 3.2; fan(e.x + Math.cos(e.tur) * 40, e.y + Math.sin(e.tur) * 40, e.tur, 5, 0.6, 165, 'b'); }
    }
  },
  draw(ctx, e) {
    const x = e.x, y = e.y, tr = (G.scroll * 1.0 + e.t * 30) % 6;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-64 + 6, -78 + 8, 128, 160);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const tx = sx * 54 - 12, ty = sy * 42 - 32;
      ctx.fillStyle = '#26251f'; ctx.fillRect(tx, ty, 24, 64);
      ctx.strokeStyle = '#4a483e'; ctx.lineWidth = 1.5;
      for (let k = -6 + tr; k < 64; k += 6) { ctx.beginPath(); ctx.moveTo(tx + 1, ty + k); ctx.lineTo(tx + 23, ty + k); ctx.stroke(); }
    }
    ctx.fillStyle = lin(ctx, -46, 0, 46, 0, ['#55542f', '#8e8b55', '#a7a467', '#8e8b55', '#55542f']);
    ctx.beginPath(); ctx.moveTo(-44, -72); ctx.lineTo(44, -72); ctx.lineTo(46, 52); ctx.lineTo(30, 76); ctx.lineTo(-30, 76); ctx.lineTo(-46, 52); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(-44, -40); ctx.lineTo(44, -40); ctx.moveTo(-46, 30); ctx.lineTo(46, 30); ctx.moveTo(-20, -72); ctx.lineTo(-20, -40); ctx.moveTo(20, -72); ctx.lineTo(20, -40); ctx.stroke();
    ctx.fillStyle = '#3a3922'; for (let k = 0; k < 5; k++) ctx.fillRect(-30 + k * 13, -66, 8, 18);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; for (const [rx, ry] of [[-38, -36], [38, -36], [-38, 26], [38, 26], [-38, 48], [38, 48]]) { ctx.beginPath(); ctx.arc(rx, ry, 1.6, 0, TAU); ctx.fill(); }
    if (Math.floor(e.t * 3) % 2 && e.p2) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(-34, -60, 3, 0, TAU); ctx.arc(34, -60, 3, 0, TAU); ctx.fill(); }
    ctx.restore();
    Art.draw(ctx, 'gunTur', x - 42, y + 34, e.gl - Math.PI / 2, 1, 1.25, 1.25);
    Art.draw(ctx, 'gunTur', x + 42, y + 34, e.gr - Math.PI / 2, 1, 1.25, 1.25);
    ctx.save(); ctx.translate(x, y - 6); ctx.rotate(e.tur - Math.PI / 2);
    ctx.fillStyle = '#3a3922'; ctx.fillRect(-9, 10, 6, 40); ctx.fillRect(3, 10, 6, 40);
    ctx.fillStyle = '#26251f'; ctx.fillRect(-10, 46, 8, 6); ctx.fillRect(2, 46, 8, 6);
    ctx.fillStyle = rad(ctx, -6, -6, 30, ['#c4c085', '#8e8b55', '#4f4e2c']); ctx.beginPath(); ctx.arc(0, 0, 25, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#4f4e2c'; ctx.fillRect(-8, -14, 16, 10);
    ctx.restore();
    if (e.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x, y - 6, 46, 0, TAU); ctx.fill(); ctx.restore(); }
  },
};

ET.boss2 = { name: '海上要塞', en: 'SEA FORTRESS', hp: 900, r: 40, score: 80000, boss: true, layer: 'ground', hb: [[0, -95, 26], [0, -40, 34], [0, 20, 34], [0, 80, 30]],
  init(e) { bossBase(e); e.y = -200; e.tur = [1, 1, 1, 1].map(() => Math.PI / 2); e.ti = 0; },
  offs: [[0, -112], [0, -84], [0, 70], [0, 100]],
  update(e, dt) {
    const offs = ET.boss2.offs;
    e.tur = e.tur.map((a, i) => turnTo(a, aim(e.x + offs[i][0], e.y + offs[i][1]), 2 * dt));
    if (bossEnter(e, dt, 190, 70)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.35) * 42; e.y = 190 + Math.sin(e.mt * 0.5) * 10;
    const p2 = phase2(e); bossSmoke(e);
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    e.ta -= f;
    if (e.ta <= 0) {
      e.ta = p2 ? 0.42 : 0.6; e.ti = (e.ti + 1) % 4;
      const [ox, oy] = offs[e.ti], bx = e.x + ox, by = e.y + oy;
      if (by > 10) fan(bx + Math.cos(e.tur[e.ti]) * 16, by + Math.sin(e.tur[e.ti]) * 16, e.tur[e.ti], 3, 0.34, 150);
    }
    e.tb -= f;
    if (e.tb <= 0) { e.tb = 3.2; ring(e.x, e.y - 20, 16, 95, e.mt, 'b'); }
    if (p2) {
      e.tc -= f;
      if (e.tc <= 0) { e.tc = 3.6; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) eShot(e.x + s * 34, e.y + k * 20 - 10, Math.PI / 2 + s * (0.9 + k * 0.25), 120, 'm'); Snd.play('missile'); }
    }
  },
  draw(ctx, e) {
    const x = e.x, y = e.y;
    wake(ctx, x, y + 150, 22, e.t);
    ctx.save(); ctx.translate(x, y);
    const hull = () => { ctx.beginPath(); ctx.moveTo(0, -158); ctx.bezierCurveTo(42, -110, 52, -40, 52, 40); ctx.bezierCurveTo(52, 100, 44, 140, 32, 152); ctx.lineTo(-32, 152); ctx.bezierCurveTo(-44, 140, -52, 100, -52, 40); ctx.bezierCurveTo(-52, -40, -42, -110, 0, -158); ctx.closePath(); };
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.moveTo(0, -170); ctx.lineTo(30, -130); ctx.lineTo(-30, -130); ctx.fill();
    hull(); ctx.fillStyle = lin(ctx, -52, 0, 52, 0, ['#3f4a52', '#8e9ba4', '#a9b5bd', '#5a666e']); ctx.fill(); ctx.strokeStyle = '#2b3338'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.scale(0.86, 0.94); hull(); ctx.restore(); ctx.fillStyle = '#8a8676'; ctx.fill();
    ctx.strokeStyle = 'rgba(50,45,35,.3)'; ctx.lineWidth = 0.7;
    for (let k = -140; k < 140; k += 5) { ctx.beginPath(); ctx.moveTo(-40, k); ctx.lineTo(40, k); ctx.stroke(); }
    ctx.fillStyle = lin(ctx, -24, 0, 24, 0, ['#8a949a', '#d5dbde', '#8a949a']); ctx.fillRect(-24, -55, 48, 90);
    ctx.fillStyle = '#c3cacd'; ctx.fillRect(-16, -48, 32, 30); ctx.fillStyle = '#2d3a40'; ctx.fillRect(-12, -44, 24, 5);
    ctx.fillStyle = '#6a7378'; ctx.beginPath(); ctx.arc(0, -5, 10, 0, TAU); ctx.fill(); ctx.fillStyle = '#3a4246'; ctx.beginPath(); ctx.arc(0, -5, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a6268'; ctx.fillRect(-4, 10, 8, 22);
    ctx.strokeStyle = '#efe8cc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 128, 13, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#efe8cc'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', 0, 129);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.fillStyle = '#4b5358'; ctx.fillRect(s * 34 - 4, k * 20 - 16, 8, 12); ctx.fillStyle = e.p2 ? '#ff5a4e' : '#222'; ctx.fillRect(s * 34 - 2, k * 20 - 14, 4, 3); }
    ctx.restore();
    ET.boss2.offs.forEach(([ox, oy], i) => Art.draw(ctx, 'gunTur', x + ox, y + oy, e.tur[i] - Math.PI / 2, 1, 1.5, 1.5));
    if (e.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(x, y, 44, 140, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  },
};

ET.boss3 = { name: '黑鷹重裝機', en: 'BLACK HAWK', hp: 1000, r: 40, score: 100000, boss: true, layer: 'air', hb: [[0, 0, 34], [-56, -8, 20], [56, -8, 20]],
  init(e) { bossBase(e); e.y = -110; e.st = 0; },
  update(e, dt) {
    if (bossEnter(e, dt, 140, 80)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.6) * 95; e.y = 140 + Math.sin(e.mt * 1.1) * 14;
    const p2 = phase2(e); bossSmoke(e);
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    e.st += f;
    const cyc = 4.6, ci = Math.floor(e.st / cyc), k = ci % 3, ph = e.st % cyc;
    if (e.lastCyc !== ci) { e.lastCyc = ci; e.done = 0; }
    const once = (bit, at) => { if (ph > at && !(e.done & bit)) { e.done |= bit; return true; } return false; };
    if (k === 0 && ph < 1.8) {
      e.ta -= f; if (e.ta <= 0) { e.ta = 0.09; for (const s of [-1, 1]) { const gx = e.x + s * 20, gy = e.y + 34; eShot(gx, gy, aim(gx, gy) + rnd(-0.08, 0.08), 210); } Snd.play('eshot'); }
    } else if (k === 1) {
      if (once(1, 0.3)) fan(e.x, e.y + 30, Math.PI / 2, 9, 1.4, 130, 'b');
      if (once(2, 1.5)) fan(e.x, e.y + 30, Math.PI / 2, 8, 1.3, 130, 'b');
    } else if (k === 2) {
      if (once(4, 0.3)) {
        for (let i = 0; i < 4; i++) G.queue.push({ t: G.st + i * 0.25, fn: () => { if (!e.dead) spawn('drone', e.x + (i % 2 ? 50 : -50), e.y, { amp: 60, ph: i, sp: 150 }); } });
        ring(e.x, e.y, 12, 100, e.mt);
      }
    }
    if (p2) { e.tc -= f; if (e.tc <= 0) { e.tc = 0.17; e.sa += 0.38; for (let a = 0; a < 3; a++) eShot(e.x, e.y, e.sa + a * TAU / 3, 95); } }
  },
  shadow(ctx, e) { ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x + 16, e.y + 30, 70, 40, 0, 0, TAU); ctx.fill(); ctx.restore(); },
  draw(ctx, e) {
    const x = e.x, y = e.y;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#2b3036'; ctx.fillRect(-4, -70, 8, 40); ctx.fillRect(-16, -74, 32, 6);
    ctx.fillStyle = lin(ctx, -70, 0, 70, 0, ['#2a2f36', '#4d5560', '#2a2f36']); ctx.beginPath(); ctx.roundRect(-70, -16, 140, 14, 5); ctx.fill();
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#3c434c'; ctx.beginPath(); ctx.ellipse(s * 56, -8, 13, 22, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#20242a'; ctx.beginPath(); ctx.ellipse(s * 56, -24, 7, 4, 0, 0, TAU); ctx.fill();
      for (let k = 0; k < 3; k++) { ctx.fillStyle = '#c9ced4'; ctx.fillRect(s * 36 - 3 + k * s * 6, 0, 3, 12); ctx.fillStyle = '#d8322b'; ctx.fillRect(s * 36 - 3 + k * s * 6, 10, 3, 3); }
    }
    ctx.fillStyle = lin(ctx, -26, 0, 26, 0, ['#23272d', '#59626e', '#23272d']); ctx.beginPath(); ctx.ellipse(0, 4, 26, 42, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = lin(ctx, 0, 20, 0, 44, ['#ffe08a', '#d1781a']); ctx.beginPath(); ctx.ellipse(0, 30, 12, 11, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#16191d'; ctx.fillRect(-23, 30, 6, 12); ctx.fillRect(17, 30, 6, 12);
    ctx.fillStyle = e.p2 && Math.floor(e.t * 6) % 2 ? '#ff3b3b' : '#ffcc33'; ctx.beginPath(); ctx.arc(0, -10, 4, 0, TAU); ctx.fill();
    ctx.restore();
    rotor(ctx, x - 56, y - 8, 40, e.t, 3); rotor(ctx, x + 56, y - 8, 40, -e.t, 3);
    if (e.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 30, 44, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  },
};

ET.boss4 = { name: '沙暴巨砲', en: 'SANDSTORM CANNON', hp: 1200, r: 60, score: 120000, boss: true, layer: 'ground', hb: [[0, 0, 56], [-86, -52, 18], [86, -52, 18], [-86, 52, 18], [86, 52, 18]],
  corners: [[-86, -52], [86, -52], [-86, 52], [86, 52]],
  init(e) { bossBase(e); e.y = -130; e.tur = Math.PI / 2; e.ct = [0, 0, 0, 0].map(() => Math.PI / 2); e.ci = 0; },
  update(e, dt) {
    const C = ET.boss4.corners;
    e.ct = e.ct.map((a, i) => turnTo(a, aim(e.x + C[i][0], e.y + C[i][1]), 2.5 * dt));
    e.tur = turnTo(e.tur, aim(e.x, e.y), 1.2 * dt);
    if (bossEnter(e, dt, 150, 60)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.3) * 30; e.y = 150 + Math.sin(e.mt * 0.6) * 8;
    const p2 = phase2(e); bossSmoke(e);
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    e.ta -= f;
    if (e.ta <= 0) {
      e.ta = p2 ? 1.1 : 1.5; e.ci = (e.ci + 1) % 2;
      for (const i of e.ci ? [0, 3] : [1, 2]) { const cx = e.x + C[i][0], cy = e.y + C[i][1]; if (e.ci) ring(cx, cy, 8, 105, e.mt); else fan(cx, cy, e.ct[i], 3, 0.3, 150); }
    }
    e.tb -= f;
    if (e.tb <= 0) {
      e.tb = p2 ? 4 : 5;
      if (G.d.beams) {
        const xs = p2 ? [P.x - 60, P.x + 60] : [P.x];
        for (const bx of xs) G.beams.push({ x: clamp(bx, 20, W - 20), y: e.y + 50, w: 26, t: 0, warn: 1.0, life: 0.7 });
        Snd.play('warn');
      } else fan(e.x, e.y + 40, e.tur, 7, 0.9, 140, 'b');
    }
    if (p2) { e.tc -= f; if (e.tc <= 0) { e.tc = 0.13; e.sa -= 0.31; eShot(e.x, e.y, e.sa, 105); eShot(e.x, e.y, e.sa + Math.PI, 105); } }
  },
  draw(ctx, e) {
    const x = e.x, y = e.y, tr = (G.scroll + e.t * 20) % 7;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-112, -76, 232, 164);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#2d2a22'; ctx.fillRect(s * 104 - 12, -80, 24, 160);
      ctx.strokeStyle = '#4e4838'; ctx.lineWidth = 2; for (let k = -7 + tr; k < 160; k += 7) { ctx.beginPath(); ctx.moveTo(s * 104 - 11, -80 + k); ctx.lineTo(s * 104 + 11, -80 + k); ctx.stroke(); }
    }
    const oct = (r1, r2) => { ctx.beginPath(); ctx.moveTo(-r1 + 26, -r2); ctx.lineTo(r1 - 26, -r2); ctx.lineTo(r1, -r2 + 26); ctx.lineTo(r1, r2 - 26); ctx.lineTo(r1 - 26, r2); ctx.lineTo(-r1 + 26, r2); ctx.lineTo(-r1, r2 - 26); ctx.lineTo(-r1, -r2 + 26); ctx.closePath(); };
    oct(98, 72); ctx.fillStyle = lin(ctx, 0, -72, 0, 72, ['#c9b68a', '#a8946a', '#7d6c4b']); ctx.fill(); ctx.strokeStyle = '#5a4d35'; ctx.lineWidth = 2; ctx.stroke();
    oct(80, 56); ctx.fillStyle = lin(ctx, -80, -56, 80, 56, ['#b9a679', '#8f7d57']); ctx.fill();
    ctx.fillStyle = '#e0b030'; for (let k = -76; k < 76; k += 14) { ctx.fillRect(k, -70, 7, 4); ctx.fillRect(k + 7, 66, 7, 4); }
    ctx.fillStyle = '#6a5a3e'; for (let k = 0; k < 4; k++) ctx.fillRect(-64 + k * 36, -46, 20, 8);
    ctx.restore();
    ET.boss4.corners.forEach(([ox, oy], i) => { Art.draw(ctx, 'pad', x + ox, y + oy, 0, 1, 1.1, 1.1); Art.draw(ctx, 'gunTur', x + ox, y + oy, e.ct[i] - Math.PI / 2, 1, 1.3, 1.3); });
    ctx.save(); ctx.translate(x, y); ctx.rotate(e.tur - Math.PI / 2);
    ctx.fillStyle = '#3d3628'; ctx.fillRect(-7, 14, 14, 50); ctx.fillStyle = '#26221a'; ctx.fillRect(-9, 58, 18, 8);
    ctx.fillStyle = rad(ctx, -8, -8, 40, ['#e1d2a6', '#a38f62', '#5e5036']); ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    const glow = G.beams.some(b => b.t < b.warn);
    ctx.fillStyle = glow ? `rgba(255,${80 + Math.random() * 100 | 0},80,1)` : '#4a3f2c'; ctx.beginPath(); ctx.arc(0, 10, 8, 0, TAU); ctx.fill();
    ctx.restore();
    if (e.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - 98, y - 72, 196, 144); ctx.restore(); }
  },
};

ET.boss5 = { name: '天穹要塞', en: 'SKY CITADEL', hp: 2000, r: 46, score: 200000, boss: true, layer: 'air', hb: [[0, 0, 42], [-100, 0, 24], [100, 0, 24], [-140, -12, 16], [140, -12, 16]],
  init(e) { bossBase(e); e.y = -140; e.wi = 0; e.dt = 0; },
  update(e, dt) {
    if (bossEnter(e, dt, 135, 70)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.4) * 36; e.y = 135 + Math.sin(e.mt * 0.9) * 12;
    const p2 = phase2(e); bossSmoke(e);
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    if (!p2) {
      e.ta -= f; if (e.ta <= 0) { e.ta = 0.8; e.wi ^= 1; const wx = e.x + (e.wi ? 100 : -100), wy = e.y + 14; fan(wx, wy, aim(wx, wy), 3, 0.36, 160); }
      e.tb -= f; if (e.tb <= 0) { e.tb = 2.4; ring(e.x, e.y + 10, 16, 100, e.mt, 'b'); }
      e.dt -= f; if (e.dt <= 0) { e.dt = 7; for (let i = 0; i < 4; i++) G.queue.push({ t: G.st + i * 0.3, fn: () => { if (!e.dead) spawn('drone', e.x + (i % 2 ? 140 : -140), e.y, { amp: 40, ph: i, sp: 140 }); } }); }
    } else {
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.1; e.sa += 0.21; for (let a = 0; a < 4; a++) eShot(e.x, e.y + 8, e.sa + a * TAU / 4, 100); }
      e.ta -= f; if (e.ta <= 0) { e.ta = 2.2; fan(e.x, e.y + 20, aim(e.x, e.y + 20), 5, 0.55, 170, 'b'); }
      e.tb -= f; if (e.tb <= 0) { e.tb = 4; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) eShot(e.x + s * 140, e.y - 10, Math.PI / 2 + s * (0.4 + k * 0.3), 115, 'm'); Snd.play('missile'); }
    }
  },
  shadow(ctx, e) { ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(e.x + 16, e.y + 100); ctx.lineTo(e.x + 186, e.y + 10); ctx.lineTo(e.x - 154, e.y + 10); ctx.fill(); ctx.restore(); },
  draw(ctx, e) {
    const x = e.x, y = e.y;
    ctx.save(); ctx.translate(x, y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const ex of [-120, -60, 60, 120]) { const r = 6 + Math.random() * 3; ctx.fillStyle = rad(ctx, ex, -44, r * 2, ['rgba(160,230,255,.95)', 'rgba(60,140,255,.5)', 'rgba(0,60,255,0)']); ctx.beginPath(); ctx.arc(ex, -44, r * 2, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(0, 72); ctx.lineTo(170, -14); ctx.lineTo(166, -30); ctx.lineTo(60, -40); ctx.lineTo(0, -60); ctx.lineTo(-60, -40); ctx.lineTo(-166, -30); ctx.lineTo(-170, -14); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -60, 0, 72, ['#2a3554', '#4a5a86', '#24304d']); ctx.fill(); ctx.strokeStyle = '#141b2e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(160,190,255,.25)'; ctx.lineWidth = 1;
    for (let k = -150; k <= 150; k += 30) { ctx.beginPath(); ctx.moveTo(k, -30 + Math.abs(k) * 0.02); ctx.lineTo(k * 0.5, 30 - Math.abs(k) * 0.15); ctx.stroke(); }
    for (const ex of [-120, -60, 60, 120]) { ctx.fillStyle = '#1a2136'; ctx.fillRect(ex - 9, -46, 18, 20); }
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#5b6b98'; ctx.beginPath(); ctx.arc(s * 100, 0, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = '#222b44'; ctx.beginPath(); ctx.arc(s * 100, 0, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7a88b8'; ctx.fillRect(s * 140 - 5, -20, 10, 18);
    }
    const core = e.p2 ? 0.6 + 0.4 * Math.sin(e.t * 10) : 0.3;
    ctx.fillStyle = rad(ctx, 0, 6, 30, [`rgba(255,${e.p2 ? 90 : 200},${e.p2 ? 90 : 255},${core})`, 'rgba(120,60,200,.6)', 'rgba(30,30,80,1)']);
    ctx.beginPath(); ctx.arc(0, 6, 26, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#9fb0e0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-2, 34, 4, 22);
    ctx.restore();
    if (e.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(x, y + 6, 40, 0, TAU); ctx.fill(); ctx.restore(); }
  },
};
for (const k of ['boss1', 'boss2', 'boss3', 'boss4', 'boss5']) ET[k].onDeath = e => bossDown(e);

// ---------- 道具 ----------
function spawnItem(kind, x, y, forced) {
  const it = { kind, x: clamp(x, 16, W - 16), y: clamp(y, 10, H - 40), vx: (Math.random() < 0.5 ? -1 : 1) * rnd(30, 55), vy: -70, t: 0, c0: 0 };
  if (kind === 'P') it.c0 = forced ? WEAPONS.indexOf(forced) : (WEAPONS.indexOf(P.w) + 1 + (Math.random() * 2 | 0)) % 3;
  if (kind === 'S') it.c0 = forced ? (forced === 'M' ? 0 : 1) : (Math.random() * 2) | 0;
  G.items.push(it);
}
function itemLook(it) {
  if (it.kind === 'P') return WEAPONS[(it.c0 + Math.floor(it.t / 2.6)) % 3];
  if (it.kind === 'S') return ['M', 'H'][(it.c0 + Math.floor(it.t / 3)) % 2];
  return it.kind;
}
function updateItems(dt) {
  for (const it of G.items) {
    it.t += dt;
    if (it.kind === 'medal') { it.y += G.speed * dt; it.vy = 0; }
    else {
      it.vy = lerp(it.vy, 40, Math.min(1, dt * 1.6));
      it.x += it.vx * dt; it.y += it.vy * dt;
      if (it.x < 14 || it.x > W - 14) { it.vx = -it.vx; it.x = clamp(it.x, 14, W - 14); }
      if (it.t < 7 && it.y > H - 40) it.vy = -90;
      if (it.y < 30 && it.vy < 0) it.vy = 10;
    }
    if (it.y > H + 30) it.dead = true;
    if (P.alive && !P.auto && d2(it.x, it.y, P.x, P.y) < 22 * 22) { it.dead = true; collect(it); }
  }
  G.items = G.items.filter(i => !i.dead);
}
function collect(it) {
  const k = itemLook(it);
  if (it.kind === 'P') {
    if (k === P.w) {
      if (P.lvl >= 8) { addScore(10000); popText(P.x, P.y - 26, '10000', '#ffd23f'); }
      else { P.lvl++; popText(P.x, P.y - 26, P.lvl >= 8 ? '火力全滿！' : '火力 UP', '#fff'); }
    } else { P.w = k; P.lvl = Math.min(8, P.lvl + 1); popText(P.x, P.y - 26, WNAME[k] + '！', ITEM_COL[k][0]); }
    Snd.play('power');
  } else if (it.kind === 'S') {
    if (P.sub === k) { if (P.sl >= 4) addScore(5000); P.sl = Math.min(4, P.sl + 1); } else { P.sub = k; P.sl = Math.min(4, Math.max(1, P.sl + 1)); }
    popText(P.x, P.y - 26, WNAME[k] + (P.sl > 1 ? ' Lv' + P.sl : ''), ITEM_COL[k][0]); Snd.play('power');
  } else if (it.kind === 'B') { G.bombs = Math.min(7, G.bombs + 1); popText(P.x, P.y - 26, '炸彈 +1', ITEM_COL.B[0]); Snd.play('item'); }
  else if (it.kind === 'medal') { G.medals++; addScore(500 + Math.min(G.medalChain++, 10) * 100); popText(it.x, it.y - 10, String(500 + Math.min(G.medalChain - 1, 10) * 100), '#ffd23f'); Snd.play('medal'); }
  else if (it.kind === '1up') { G.lives++; popText(P.x, P.y - 26, '1UP!', '#7dffb0'); Snd.play('1up'); }
}
function drawItems(ctx) {
  for (const it of G.items) {
    const k = itemLook(it), blink = it.t > 6 && it.kind !== 'medal' && Math.floor(it.t * 8) % 2;
    if (blink) continue;
    if (it.kind === 'medal') { Art.draw(ctx, 'medal', it.x, it.y, 0, 1, Math.cos(it.t * 5), 1); continue; }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const col = it.kind === '1up' ? '#7dffb0' : ITEM_COL[k][0];
    ctx.fillStyle = col; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(it.t * 8);
    ctx.beginPath(); ctx.arc(it.x, it.y, 15, 0, TAU); ctx.fill(); ctx.restore();
    Art.draw(ctx, it.kind === '1up' ? 'oneup' : 'it_' + k, it.x, it.y);
  }
}

// ---------- 特效 ----------
function fxP(o) { if (G.fx.length < 700) G.fx.push(o); }
function boom(x, y, s = 1, ground = false) {
  if (s >= 2) Snd.play('bigboom'); else Snd.play('boom');
  const n = Math.round(6 * s);
  for (let i = 0; i < n; i++) fxP({ k: 's', x: x + rnd(-8, 8) * s, y: y + rnd(-8, 8) * s, vx: rnd(-25, 25) * s, vy: rnd(-25, 25) * s, r: rnd(5, 10) * s, life: -rnd(0, 0.15), max: rnd(0.6, 1.0) + s * 0.1, a: 0.45, g: ground });
  for (let i = 0; i < n; i++) fxP({ k: 'f', x: x + rnd(-6, 6) * s, y: y + rnd(-6, 6) * s, vx: rnd(-45, 45) * s, vy: rnd(-45, 45) * s, r: rnd(4, 8) * s, life: -rnd(0, 0.12) * s, max: rnd(0.3, 0.55) + s * 0.06, g: ground });
  for (let i = 0; i < n * 1.5; i++) { const a = rnd(TAU), v = rnd(80, 240) * Math.sqrt(s); fxP({ k: 'k', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rnd(0.25, 0.5), g: ground }); }
  fxP({ k: 'r', x, y, r: 4, R: 26 * s, life: 0, max: 0.35, g: ground });
  G.shake = Math.max(G.shake, s * 2.2);
}
function popText(x, y, text, color = '#fff') { fxP({ k: 't', x: clamp(x, 40, W - 40), y, vx: 0, vy: -30, life: 0, max: 1.1, text, color }); }
function updateFX(dt) {
  for (const p of G.fx) {
    p.life += dt;
    if (p.life < 0) continue;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.g) p.y += G.speed * dt;
    if (p.k === 'f' || p.k === 's') { p.vx *= 0.94; p.vy *= 0.94; }
    if (p.k === 'k') { p.vx *= 0.92; p.vy *= 0.92; }
  }
  G.fx = G.fx.filter(p => p.life < p.max);
  for (const d of G.decals) d.y += G.speed * dt;
  G.decals = G.decals.filter(d => d.y < H + 40).slice(-60);
}
function drawDecals(ctx) {
  for (const d of G.decals) {
    ctx.fillStyle = rad(ctx, d.x, d.y, d.r * 1.4, ['rgba(20,12,6,.7)', 'rgba(40,25,10,.45)', 'rgba(40,25,10,0)']);
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 1.4, 0, TAU); ctx.fill();
  }
}
function drawFX(ctx, ground) {
  for (const p of G.fx) {
    if (p.life < 0 || !!p.g !== ground || p.k !== 's') continue;
    const t = p.life / p.max;
    ctx.fillStyle = `rgba(70,66,62,${p.a * (1 - t)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.8 + t * 1.4), 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of G.fx) {
    if (p.life < 0 || !!p.g !== ground) continue;
    const t = p.life / p.max;
    if (p.k === 'f') {
      const r = p.r * (0.6 + t * 1.3);
      const hue = 52 - t * 45, light = 92 - t * 50;
      ctx.fillStyle = `hsla(${hue},100%,${light}%,${1 - t})`; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    } else if (p.k === 'k') {
      ctx.strokeStyle = `rgba(255,${200 - t * 120 | 0},90,${1 - t})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
    } else if (p.k === 'r') {
      ctx.strokeStyle = `rgba(255,220,160,${0.8 * (1 - t)})`; ctx.lineWidth = 3 * (1 - t) + 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.r, p.R, Math.sqrt(t)), 0, TAU); ctx.stroke();
    } else if (p.k === 'c') {
      ctx.fillStyle = `rgba(255,230,140,${1 - t})`; ctx.beginPath(); ctx.arc(p.x, p.y, 3 * (1 - t) + 1, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
  if (ground) return;
  for (const p of G.fx) {
    if (p.k !== 't' || p.life < 0) continue;
    const t = p.life / p.max;
    ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
    ctx.font = '700 13px "Noto Sans TC","PingFang TC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
    ctx.globalAlpha = 1;
  }
}
