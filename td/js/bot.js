'use strict';
// 守塔奇兵：簡單的電腦玩家。標題畫面的示範戰鬥和平衡測試會用到。
function botSpotScores(G, r) {
  G._spotCache = G._spotCache || {};
  if (G._spotCache[r]) return G._spotCache[r];
  const samples = [], o = { x: 0, y: 0 };
  G.paths.forEach(P => { for (let d = 0.5; d < P.len; d += 0.5) { if (P.hasTp && P.seg.some(sg => sg.tp && d > sg.s && d < sg.s + sg.l)) continue; pathPos(P, d, o); samples.push({ x: o.x, y: o.y, w: 0.6 + 0.4 * d / P.len }); } });
  G.fpaths.forEach(P => { for (let d = 0.5; d < P.len; d += 0.5) { pathPos(P, d, o); samples.push({ x: o.x, y: o.y, w: 0.5 }); } });
  const out = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const c = G.grid[y][x];
    if (c.path || c.block) continue;
    let s = 0;
    for (const p of samples) if (dist2(p.x, p.y, x + 0.5, y + 0.5) <= r * r) s += p.w;
    const warm = G.braziers && G.braziers.some(b => dist2(b.x, b.y, x + 0.5, y + 0.5) <= 2.25 * 2.25);
    out.push({ x, y, s: s * (c.pad ? 1.35 : 1) * (warm ? 1.3 : 1) + (c.near === 1 ? 0.5 : 0) + (c.pad ? 3 : 0) + (c.anv ? 2 : 0) });
  }
  out.sort((a, b) => b.s - a.s);
  G._spotCache[r] = out;
  return out;
}
function botBestSpot(G, k) {
  if (k === 'mine') {
    const all = botSpotScores(G, 2.6).filter(s => canBuild(G, s.x, s.y));
    return all[all.length - 1] || null; // 金礦放在最不重要的位置
  }
  if (k === 'banner') {
    let best = null, bs = -1;
    for (const s of botSpotScores(G, 2.6)) {
      if (!canBuild(G, s.x, s.y)) continue;
      let n = 0;
      for (const t of G.towers) if (!TOWERS[t.k].support && dist2(t.cx, t.cy, s.x + 0.5, s.y + 0.5) <= 1.6 * 1.6 + 0.01) n++;
      if (n > bs) { bs = n; best = s; }
    }
    return bs >= 3 ? best : null;
  }
  const r = TOWERS[k].tiers[0].range;
  if (k === 'barracks') {
    // 兵營：緊貼道路、而且附近有一段可以擋人的路
    const fake = { cx: 0, cy: 0, st: { range: r } };
    for (const s of botSpotScores(G, 2.2)) { if (!canBuild(G, s.x, s.y) || G.grid[s.y][s.x].near !== 1) continue; fake.cx = s.x + 0.5; fake.cy = s.y + 0.5; const rp = rallyPoint(G, fake); if (rp && rp.f > 0.2 && rp.f < 0.8) return s; }
    return null;
  }
  for (const s of botSpotScores(G, r)) if (canBuild(G, s.x, s.y)) return s;
  return null;
}
const BOT_SEQ = {
  mix: ['arrow', 'cannon', 'arrow', 'frost', 'magic', 'cannon', 'mine', 'sniper', 'magic', 'arrow', 'banner', 'cannon', 'frost', 'magic', 'sniper', 'arrow', 'banner', 'cannon', 'magic'],
  mix2: ['arrow', 'cannon', 'barracks', 'arrow', 'frost', 'magic', 'alchemy', 'mine', 'sniper', 'magic', 'arrow', 'banner', 'alchemy', 'cannon', 'frost', 'magic', 'barracks', 'sniper', 'arrow', 'banner', 'magic'],
  arrow: ['arrow'],
  cannon: ['cannon', 'arrow'],
  magic: ['magic', 'arrow'],
};
function botThink(G, bot) {
  if (G.state === 'won' || G.state === 'lost') return;
  bot.i = bot.i || 0;
  const seq = (BOT_SEQ[bot.strat] || BOT_SEQ.mix).filter(k => G.towersAvail.includes(k));
  for (let guard = 0; guard < 4; guard++) {
    const want = G.rush ? 5 + Math.floor((G.wave + 1) * 1.6) : 2 + Math.floor((G.wave + 1) * 0.7);
    const attackers = G.towers.filter(t => !TOWERS[t.k].support).length;
    let did = false;
    if (G.towers.length < want || attackers < 2) {
      let k = seq[bot.i % seq.length];
      const spot = botBestSpot(G, k);
      if (!spot) { bot.i++; continue; }
      if (G.gold >= tierCost(G, k, 0)) { if (buildTower(G, k, spot.x, spot.y)) { bot.i++; did = true; } }
    } else {
      // 升級：先升最便宜、傷害最高的
      let best = null, bc = 1e9;
      for (const t of G.towers) {
        if (t.tier >= 3) continue;
        const spec = (t.id + (bot.seed || 0)) % 2;
        const c = upCost(G, t, spec);
        const pr = c * (TOWERS[t.k].support ? 1.4 : 1);
        if (pr < bc) { bc = pr; best = { t, spec, c }; }
      }
      if (best && G.gold >= best.c) { upgradeTower(G, best.t, best.spec); did = true; }
      else if (!best) {
        const k = seq[bot.i % seq.length], spot = botBestSpot(G, k);
        if (spot && G.gold >= tierCost(G, k, 0)) { buildTower(G, k, spot.x, spot.y); bot.i++; did = true; }
        else if (!spot) bot.i++;
      }
    }
    if (!did) break;
  }
  botMech3(G, bot);
  if (G.hero && bot.hero !== false) botHero(G, bot);
  if (G.state === 'ready') callWave(G, false);
  if (bot.meteor && G.skills.meteor.on && G.skills.meteor.cd <= 0) {
    let best = null;
    for (const e of G.enemies) if (!best || e.dist > best.dist) best = e;
    if (best && G.enemies.length > 6) castMeteor(G, best.x, best.y);
  }
}
// 第三章的機制：雪崩陷阱（砸一群或砸頭目）、輸送帶（路上敵人多時反轉）、清碎石（錢有剩時清最好的位置）
function botMech3(G, bot) {
  if (G.state !== 'run') return;
  for (const tr of G.traps) {
    if (tr.cd > 0) continue;
    let n = 0, big = false;
    for (const e of G.enemies) if (e.alive && !e.fly && !e.inT && dist2(e.x, e.y, tr.tx, tr.ty) < TRAP.r * TRAP.r) { n++; if (e.boss || e.d.lives > 1) big = true; }
    if (n >= 4 || big) triggerTrap(G, tr);
  }
  if (G.belt && G.belt.cd <= 0) {
    let n = 0;
    for (const e of G.enemies) if (e.alive && !e.fly) { const bx = Math.floor(e.x), by = Math.floor(e.y); if (inMap(bx, by) && G.grid[by][bx].belt) n += e.boss ? 6 : 1; }
    if (n >= 6) activateBelt(G);
  }
  if (G.L.rubble && G.wave >= 1 && G.gold >= RUB_COST + 70) {
    // 碎石的位置值不值得清：跟現有最好的空地比
    let best = null, bs = -1;
    const r = 2.6, o = { x: 0, y: 0 };
    const score = (x, y) => { let s = 0; for (const P of G.paths) for (let d = 0.5; d < P.len; d += 0.5) { pathPos(P, d, o); if (dist2(o.x, o.y, x + 0.5, y + 0.5) <= r * r) s += 0.6 + 0.4 * d / P.len; } return s * (G.grid[y][x].anv ? 1.3 : 1); };
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = G.grid[y][x]; if (c.rub) { const s = score(x, y); if (s > bs) { bs = s; best = [x, y]; } } }
    const fs = botSpotScores(G, 2.6).find(s => canBuild(G, s.x, s.y));
    if (best && (!fs || bs >= fs.s * 0.9)) clearRubble(G, best[0], best[1]);
  }
}
// 英雄：站在塔火力最集中的道路上（塔有變化時重新找位置）
function botHero(G, bot) {
  const H = G.hero; if (!H || H.dead) return;
  let key = G.towers.length * 100; for (const t of G.towers) key += t.tier;
  if (bot.hk === key) return;
  bot.hk = key;
  const o = { x: 0, y: 0 };
  let best = null, bs = -1;
  for (const P of G.paths) for (let d = 0.5; d < P.len; d += 0.5) {
    if (P.hasTp && P.seg.some(sg => sg.tp && d > sg.s && d < sg.s + sg.l)) continue;
    pathPos(P, d, o);
    if (o.x < 0.5 || o.y < 0.5 || o.x > COLS - 0.5 || o.y > ROWS - 0.5) continue;
    let sc = 0;
    for (const t of G.towers) { if (!t.st || TOWERS[t.k].support || !t.st.rate) continue; if (dist2(t.cx, t.cy, o.x, o.y) <= t.st.range * t.st.range) sc += 1 + t.tier; }
    sc *= 0.5 + d / P.len;
    if (sc > bs) { bs = sc; best = { x: o.x, y: o.y }; }
  }
  if (best && dist2(best.x, best.y, H.rx, H.ry) > 0.5) heroMove(G, best.x, best.y);
}
