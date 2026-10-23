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
    out.push({ x, y, s: s * (c.pad ? 1.35 : 1) + (c.near === 1 ? 0.5 : 0) + (c.pad ? 3 : 0) });
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
  for (const s of botSpotScores(G, r)) if (canBuild(G, s.x, s.y)) return s;
  return null;
}
const BOT_SEQ = {
  mix: ['arrow', 'cannon', 'arrow', 'frost', 'magic', 'cannon', 'mine', 'sniper', 'magic', 'arrow', 'banner', 'cannon', 'frost', 'magic', 'sniper', 'arrow', 'banner', 'cannon', 'magic'],
  arrow: ['arrow'],
  cannon: ['cannon', 'arrow'],
  magic: ['magic', 'arrow'],
};
function botThink(G, bot) {
  if (G.state === 'won' || G.state === 'lost') return;
  bot.i = bot.i || 0;
  const seq = (BOT_SEQ[bot.strat] || BOT_SEQ.mix).filter(k => G.towersAvail.includes(k));
  for (let guard = 0; guard < 4; guard++) {
    const want = 2 + Math.floor((G.wave + 1) * 0.7);
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
  if (G.hero && bot.hero !== false) botHero(G, bot);
  if (G.state === 'ready') callWave(G, false);
  if (bot.meteor && G.skills.meteor.on && G.skills.meteor.cd <= 0) {
    let best = null;
    for (const e of G.enemies) if (!best || e.dist > best.dist) best = e;
    if (best && G.enemies.length > 6) castMeteor(G, best.x, best.y);
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
