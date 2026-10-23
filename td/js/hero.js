'use strict';
// 守塔奇兵：英雄的遊戲邏輯（不碰 DOM，可以在 Node 裡做平衡模擬）。
// 英雄站在道路上的「集結點」，自動攻擊、自動放技能；近戰英雄會擋住敵人。
// 點英雄 → 點道路 = 移動集結點。倒下後過一段時間在城堡重生。

function heroMul(lv) { return 1 + 0.09 * (lv - 1); }

function makeHero(G, opt) {
  const d = HEROES[opt.id];
  if (!d) return null;
  const L = heroLevel(opt.xp || 0);
  const o = { x: 0, y: 0 };
  const P = G.paths[0];
  pathPos(P, P.len * 0.5, o);
  const s = heroSnap(G, o.x, o.y) || { x: o.x, y: o.y };
  const H = {
    id: opt.id, d, xp: opt.xp || 0, xp0: opt.xp || 0, lv: L.lv,
    x: s.x, y: s.y, rx: s.x, ry: s.y, tx: s.x, ty: s.y, cmd: false, moving: false,
    hp: 0, maxHp: 0, dmg: 0, cd: 0.5, sk: d.skills.map(k => k.cd * 0.35), dead: false, respT: 0,
    atkT: 0, castT: 0, castK: null, hurtT: 0, lastHurt: -9, lvUp: 0, hold: [], pend: [],
    dmgDone: 0, kills: 0, deaths: 0, walkPh: 0, tgt: null, fdx: 1, fdy: 0,
  };
  heroStats(H);
  H.hp = H.maxHp;
  return H;
}
function heroStats(H) {
  const m = heroMul(H.lv);
  const f = H.maxHp ? H.hp / H.maxHp : 1;
  H.maxHp = Math.round(H.d.hp * m); H.hp = H.maxHp * f;
  H.dmg = H.d.dmg * m; H.sm = m;
  H.block = H.d.block + (H.d.block && H.lv >= 4 ? 1 : 0) + (H.d.block && H.lv >= 8 ? 1 : 0);
}
function heroSkillOn(H, i) { return H.lv >= H.d.skills[i].lv; }

// 把點擊位置吸附到最近的道路上（地圖內）
function heroSnap(G, wx, wy, maxD) {
  let best = null, bd = (maxD || 1e9) ** 2;
  for (const P of G.paths) for (const sg of P.seg) {
    if (sg.tp) continue;
    // 線段只取地圖內的部分
    const ax = sg.a.x, ay = sg.a.y, bx = sg.b.x, by = sg.b.y;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    let t = clamp(((wx - ax) * dx + (wy - ay) * dy) / l2, 0, 1);
    let px = ax + dx * t, py = ay + dy * t;
    px = clamp(px, 0.4, COLS - 0.4); py = clamp(py, 0.4, ROWS - 0.4);
    const dd = dist2(px, py, wx, wy);
    if (dd < bd) { bd = dd; best = { x: px, y: py }; }
  }
  return best;
}
function heroMove(G, wx, wy) {
  const H = G.hero;
  if (!H || H.dead) return null;
  const s = heroSnap(G, wx, wy, 1.8);
  if (!s) return null;
  H.rx = s.x; H.ry = s.y; H.tx = s.x; H.ty = s.y; H.cmd = true;
  heroRelease(H);
  Hook.fx('heroMove', G, H);
  return s;
}
function heroFace(H, x, y) { const dx = x - H.x, dy = y - H.y, l = Math.hypot(dx, dy); if (l > 0.03) { H.fdx = dx / l; H.fdy = dy / l; } }
function heroRelease(H) { for (const e of H.hold) e.held = false; H.hold.length = 0; }

function heroXp(G, H, n) {
  if (!H || n <= 0) return;
  H.xp += n;
  const L = heroLevel(H.xp);
  if (L.lv > H.lv) {
    H.lv = L.lv; heroStats(H); H.hp = H.maxHp; H.lvUp = 1.6;
    Hook.fx('heroLevel', G, H); Hook.sfx('spec');
    addText(G, H.x, H.y - 0.9, '英雄升級！Lv ' + H.lv, '#ffe27a', 1.2);
  }
}

// 敵人對英雄的每秒傷害
function enemyDps(G, e) {
  const d = e.d;
  if (d.boss) return 70 * G.D.hp;
  return (5 + (d.cost || 1) * 5) * Math.sqrt(e.hpMul) * G.D.hp;
}
function hurtHero(G, H, amt, magic) {
  if (H.dead) return;
  const red = magic ? H.d.mres : H.d.armor;
  H.hp -= amt * (1 - red);
  H.lastHurt = G.t; H.hurtT = 0.12;
  if (H.hp <= 0) {
    H.hp = 0; H.dead = true; H.respT = H.d.respawn; H.deaths++;
    heroRelease(H); H.pend.length = 0; H.atkT = 0; H.castT = 0;
    Hook.fx('heroDie', G, H); Hook.sfx('leak');
  }
}

function heroTargets(G, H, r, air) {
  const out = [];
  for (const e of G.enemies) {
    if (!e.alive || e.dist < 0.35 || (e.fly && !air) || e.under > 0) continue;
    if (dist2(H.x, H.y, e.x, e.y) <= r * r) out.push(e);
  }
  return out;
}

function updateHero(G, dt) {
  const H = G.hero; if (!H) return;
  if (H.lvUp > 0) H.lvUp -= dt;
  if (H.hurtT > 0) H.hurtT -= dt;
  if (H.atkT > 0) H.atkT -= dt;
  if (H.castT > 0) H.castT -= dt;
  if (H.dead) {
    H.respT -= dt;
    if (H.respT <= 0) {
      H.dead = false; H.hp = H.maxHp;
      const e = G.exitPt; H.x = e.x - e.dx * 0.6; H.y = e.y - e.dy * 0.6;
      H.x = clamp(H.x, 0.4, COLS - 0.4); H.y = clamp(H.y, 0.4, ROWS - 0.4);
      H.tx = H.rx; H.ty = H.ry; H.cmd = true;
      Hook.fx('heroRevive', G, H);
    }
    return;
  }
  for (let i = 0; i < H.sk.length; i++) if (H.sk[i] > 0) H.sk[i] -= dt;
  // 延遲效果（箭雨、雷霆）
  if (H.pend.length) {
    const keep = [];
    for (const p of H.pend) { p.t -= dt; if (p.t > 0) keep.push(p); else heroPendHit(G, H, p); }
    H.pend = keep;
  }
  // 脫戰回血
  if (G.t - H.lastHurt > 3 && H.hp < H.maxHp) H.hp = Math.min(H.maxHp, H.hp + H.maxHp * 0.04 * dt);

  const d = H.d;
  // 近戰：維持擋住的敵人
  if (d.block) {
    for (let i = H.hold.length - 1; i >= 0; i--) {
      const e = H.hold[i];
      if (!e.alive || dist2(e.x, e.y, H.x, H.y) > 1.1 * 1.1 || H.cmd) { e.held = false; H.hold.splice(i, 1); }
    }
    if (!H.cmd && H.hold.length < H.block) {
      let best = null, bd = 1e9;
      for (const e of G.enemies) {
        if (!e.alive || e.fly || e.boss || e.held || e.dist < 0.35 || e.under > 0) continue;
        const dr = dist2(e.x, e.y, H.rx, H.ry);
        if (dr > d.engage * d.engage) continue;
        const dh = dist2(e.x, e.y, H.x, H.y);
        if (dh < bd) { bd = dh; best = e; }
      }
      if (best) { best.held = true; H.hold.push(best); }
    }
  }
  // 移動目標
  let gx = H.tx, gy = H.ty;
  if (!H.cmd) {
    if (H.hold.length) { const e = H.hold[0]; const dd = Math.sqrt(dist2(e.x, e.y, H.x, H.y)) || 1; if (dd > 0.42) { gx = e.x + (H.x - e.x) / dd * 0.38; gy = e.y + (H.y - e.y) / dd * 0.38; } else { gx = H.x; gy = H.y; } }
    else { gx = H.rx; gy = H.ry; }
  }
  const dx = gx - H.x, dy = gy - H.y, l = Math.hypot(dx, dy);
  H.moving = l > 0.04;
  if (H.moving) {
    const mv = Math.min(l, d.spd * dt);
    H.x += dx / l * mv; H.y += dy / l * mv;
    H.walkPh += dt * d.spd * 5.5;
    H.fdx = dx / l; H.fdy = dy / l;
  } else if (H.cmd) H.cmd = false;

  // 敵人打英雄（近身的地面敵人）
  for (const e of G.enemies) {
    if (!e.alive || e.fly || e.frozenT > 0 || e.under > 0) continue;
    const r = 0.5 + (e.boss ? 0.3 : 0);
    if (!e.held && dist2(e.x, e.y, H.x, H.y) > r * r) continue;
    hurtHero(G, H, enemyDps(G, e) * dt, e.k === 'bossLich' || e.k === 'healer');
    if (H.dead) return;
  }
  if (H.cmd) return; // 被命令移動時不攻擊

  // 自動技能
  for (let i = 0; i < d.skills.length; i++) if (heroSkillOn(H, i) && H.sk[i] <= 0 && H.castT <= 0) { if (heroCast(G, i, true)) break; }

  // 普通攻擊
  H.cd -= dt;
  if (H.cd > 0 || H.castT > 0) return;
  let tg = null;
  if (d.atk === 'melee') {
    tg = H.hold.find(e => e.alive) || null;
    if (!tg) { let bd = d.range * d.range; for (const e of G.enemies) { if (!e.alive || e.fly) continue; const dd = dist2(e.x, e.y, H.x, H.y); if (dd < bd) { bd = dd; tg = e; } } }
  } else {
    let bs = -1e9;
    for (const e of heroTargets(G, H, d.range, d.air)) { const sc = e.dist / e.P.len + (e.boss ? 0.2 : 0); if (sc > bs) { bs = sc; tg = e; } }
  }
  if (!tg) { H.cd = 0.05; return; }
  H.cd = 1 / d.rate; H.atkT = 0.32; H.tgt = tg;
  heroFace(H, tg.x, tg.y);
  if (d.atk === 'melee') {
    hurt(G, tg, H.dmg, 'phys', { h: H });
    spark(G, tg.x, tg.y, 0.35, '#fff2c8', 4);
    Hook.fx('heroHit', G, H, tg); Hook.sfx('arrow');
  } else if (d.atk === 'arrow') {
    G.projs.push({ k: 'arrow', x: H.x, y: H.y, h: 0.55, tg, tx: tg.x, ty: tg.y, spd: 14, dmg: H.dmg, crit: false, src: { h: H }, life: 2, hero: true });
    Hook.sfx('arrow');
  } else {
    G.projs.push({ k: 'orb', x: H.x, y: H.y, h: 0.6, tg, tx: tg.x, ty: tg.y, spd: 8, dmg: H.dmg, splash: d.splash, src: { h: H }, life: 2.5, hero: true });
    Hook.sfx('magic');
  }
}

// 施放技能。auto=true 時只有「值得放」才放；回傳是否施放
function heroCast(G, i, auto) {
  const H = G.hero; if (!H || H.dead || !heroSkillOn(H, i) || H.sk[i] > 0 || G.state !== 'run') return false;
  const sk = H.d.skills[i], m = H.sm;
  let ok = false;
  switch (sk.id) {
    case 'whirl': {
      const list = heroTargets(G, H, sk.r, false);
      const big = list.some(e => e.hp > 220 || e.boss);
      if (!list.length || (auto && list.length < 2 && !big)) return false;
      for (const e of list) hurt(G, e, sk.dmg * m, 'phys', { h: H });
      ring(G, H.x, H.y, 0.2, sk.r, 0.35, '#ffffff');
      ok = true; break;
    }
    case 'wall': {
      const list = heroTargets(G, H, sk.r, false);
      if (!list.length || (auto && list.length < 3 && H.hp > H.maxHp * 0.45)) return false;
      for (const e of list) { const T = e.boss ? sk.stun * 0.25 : sk.stun; if (e.frozenT < T) { e.frozenT = T; e.stunFx = T; e.brittle = false; } }
      H.hp = Math.min(H.maxHp, H.hp + H.maxHp * sk.heal);
      ring(G, H.x, H.y, 0.3, sk.r, 0.5, '#ffe27a');
      ok = true; break;
    }
    case 'rain': {
      const list = heroTargets(G, H, H.d.range + 0.4, true);
      let best = null, bn = 0;
      for (const e of list) { let n = 0; for (const o of list) if (dist2(o.x, o.y, e.x, e.y) < sk.r * sk.r) n++; if (n > bn) { bn = n; best = e; } }
      if (!best || (auto && bn < 3)) return false;
      const lead = best.frozenT > 0 || best.held ? 0 : best.spd * 0.5;
      const o = { x: 0, y: 0 }; pathPos(best.P, Math.min(best.P.len, best.dist + lead), o);
      for (let k = 0; k < sk.n; k++) H.pend.push({ k: 'rain', t: 0.25 + k * 0.16, x: o.x + (G.rnd() - 0.5) * 0.4, y: o.y + (G.rnd() - 0.5) * 0.4, r: sk.r * 0.75, dmg: sk.dmg * m, T: 0.25 + k * 0.16 });
      heroFace(H, o.x, o.y);
      ok = true; break;
    }
    case 'pierce': {
      const list = heroTargets(G, H, H.d.range * 1.3, true);
      let tg = null;
      for (const e of list) if (!tg || e.hp + e.shield > tg.hp + tg.shield) tg = e;
      if (!tg || (auto && tg.hp + tg.shield < 140 && !tg.boss)) return false;
      const dx = tg.x - H.x, dy = tg.y - H.y, l = Math.hypot(dx, dy) || 1, L = H.d.range * 1.3 + 1;
      const bx = H.x + dx / l * L, by = H.y + dy / l * L;
      for (const e of G.enemies) if (e.alive && segDist2(e.x, e.y, H.x, H.y, bx, by) < (0.3 + e.r * 0.5) ** 2) hurt(G, e, sk.dmg * m, 'phys', { h: H, pierce: 0.5 });
      G.bolts.push({ pts: [{ x: H.x, y: H.y, h: 0.55 }, { x: bx, y: by, h: 0.4 }], life: 0.35, max: 0.35, c: '#ffe9a0', w: 2, beam: true });
      heroFace(H, tg.x, tg.y);
      ok = true; break;
    }
    case 'nova': {
      const list = heroTargets(G, H, sk.r, true);
      if (!list.length || (auto && list.length < 3 && H.hp > H.maxHp * 0.5)) return false;
      for (const e of list) { hurt(G, e, sk.dmg * m, 'magic', { h: H }); if (e.alive) { const T = e.boss ? sk.freeze * 0.25 : sk.freeze; if (e.frozenT < T) { e.frozenT = T; e.brittle = false; e.stunFx = 0; } } }
      ring(G, H.x, H.y, 0.2, sk.r, 0.45, '#bdefff');
      ok = true; break;
    }
    case 'storm': {
      const list = heroTargets(G, H, H.d.range + 0.7, true).sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield)).slice(0, sk.n);
      if (!list.length || (auto && list.length < 2 && !list[0].boss)) return false;
      list.forEach((e, k) => H.pend.push({ k: 'storm', t: 0.2 + k * 0.12, e, x: e.x, y: e.y, dmg: sk.dmg * m }));
      ok = true; break;
    }
  }
  if (!ok) return false;
  H.sk[i] = sk.cd; H.castT = 0.55; H.castK = sk.id; H.atkT = 0;
  Hook.fx('heroSkill', G, H, sk.id); Hook.sfx(sk.id === 'storm' || sk.id === 'pierce' ? 'beam' : sk.id === 'nova' ? 'freeze' : sk.id === 'rain' ? 'missile' : 'stomp');
  return true;
}
function heroPendHit(G, H, p) {
  if (p.k === 'rain') {
    explode(G, p.x, p.y, p.r, p.dmg, 'phys', { h: H }, { air: true });
    Hook.fx('rainHit', G, p.x, p.y, p.r);
  } else if (p.k === 'storm') {
    const e = p.e && p.e.alive ? p.e : null;
    const x = e ? e.x : p.x, y = e ? e.y : p.y;
    if (e) hurt(G, e, p.dmg, 'magic', { h: H });
    G.bolts.push({ pts: [{ x: x + 0.3, y: y - 0.2, h: 6 }, { x, y, h: e && e.fly ? 0.75 : 0.25 }], life: 0.3, max: 0.3, c: '#bfe0ff', w: 1 });
    Hook.fx('stormHit', G, x, y); Hook.sfx('zap');
  }
}
