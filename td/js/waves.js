'use strict';
// 守塔奇兵：出怪表產生器。每關用固定亂數種子，所以每次玩到的波次都一樣。
// 一波 = 幾個「隊伍」，每隊 = 同一種敵人連續出場。

function groupGap(k) {
  const d = ENEMIES[k];
  if (d.boss) return 1;
  if (k === 'ogre') return 2.4;
  if (k === 'mini') return 0.3;
  if (k === 'goblin') return 0.42;
  if (k === 'imp') return 0.4;
  return clamp(0.95 / Math.sqrt(d.spd), 0.5, 1.2) * (d.cost >= 2.5 ? 1.35 : 1);
}

function makeGroup(k, n, entry, delay, hpMul) {
  return { k, n, gap: groupGap(k), entry, delay, hp: hpMul };
}

function genWaves(L) {
  const rng = mkRng(L.seed * 7919 + 1);
  const out = [];
  const N = L.waves, E = L.entries.length;
  for (let w = 0; w < N; w++) {
    const budget = L.b0 * Math.pow(L.bg, w);
    const hpMul = L.hp0 * (1 + L.hpg * w);
    const avail = L.pool.filter(p => p[1] <= w);
    const fresh = L.pool.filter(p => p[1] === w && w > 0);
    const groups = [];
    let nG = 1 + (w >= 2 ? 1 : 0) + (w >= 7 && rng() < 0.55 ? 1 : 0);
    if (E > 1 && w >= 1) nG = Math.max(nG, 2);
    let delay = 0;
    const picks = [];
    if (fresh.length) picks.push(fresh[0][0]); // 新敵人登場那一波，一定有它
    while (picks.length < nG) {
      let tot = 0; for (const p of avail) tot += p[2];
      let r = rng() * tot, pick = avail[0][0];
      for (const p of avail) { r -= p[2]; if (r <= 0) { pick = p[0]; break; } }
      if (picks.includes(pick) && avail.length > picks.length && rng() < 0.7) continue;
      picks.push(pick);
    }
    picks.forEach((k, i) => {
      const share = budget / picks.length * (fresh.length && i === 0 ? 0.8 : 1);
      const n = clamp(Math.round(share / ENEMIES[k].cost), k === 'ogre' ? 1 : 2, 36);
      const entry = E > 1 ? (i + w) % E : 0;
      groups.push(makeGroup(k, n, entry, delay, hpMul));
      // 下一隊稍微重疊出場
      delay += n * groupGap(k) * (E > 1 ? 0.35 : 0.7) + 1;
    });
    if (L.midBoss && w === L.midBoss[0]) groups.push(makeGroup(L.midBoss[1], 1, 0, delay + 2, L.midBoss[2] || 1));
    if (L.boss && w === N - 1) {
      groups.push(makeGroup(L.boss, 1, 0, delay + 3, 1));
      if (L.boss === 'bossLich' && E > 1) groups.push(makeGroup('bossGolem', 1, 1, delay + 10, 0.8));
    }
    out.push({ groups });
  }
  return out;
}

// 無盡模式：一波一波往上堆，每 10 波一個頭目
function genEndlessWave(L, w) {
  const rng = mkRng(L.seed * 104729 + w * 31);
  const E = L.entries.length;
  const all = L.act === 2 ? ['imp', 'goblin', 'runner', 'moth', 'clock', 'beetle', 'yeti', 'frostmage', 'raven', 'paladin', 'brute', 'shaman', 'gargoyle', 'ogre']
    : L.act ? ['goblin', 'runner', 'beetle', 'raven', 'brute', 'healer', 'shade', 'balloon', 'mole', 'paladin', 'shaman', 'gargoyle', 'crawler', 'ogre']
    : ['slime', 'runner', 'beetle', 'bat', 'golem', 'healer', 'shield', 'splitter', 'crab', 'wisp', 'gargoyle', 'mummy', 'crawler', 'ogre'];
  const unlocked = all.slice(0, clamp(3 + w, 3, all.length));
  const budget = 10 * Math.pow(1.13, Math.min(w, 40)) * (1 + Math.max(0, w - 40) * 0.08);
  const hpMul = 1.2 * (1 + 0.075 * w) * (w > 15 ? Math.pow(1.1, w - 15) : 1);
  const nG = clamp(2 + Math.floor(w / 8), 2, 4);
  const groups = [];
  let delay = 0;
  for (let i = 0; i < nG; i++) {
    const k = unlocked[Math.floor(rng() * unlocked.length)];
    const n = clamp(Math.round(budget / nG / ENEMIES[k].cost), k === 'ogre' ? 1 : 3, 40);
    const entry = E > 1 ? (i + w) % E : 0;
    groups.push(makeGroup(k, n, entry, delay, hpMul));
    delay += n * groupGap(k) * (E > 1 ? 0.35 : 0.6) + 1;
  }
  // 詞綴：第 6 波起每 5 波換一次
  const mods = Object.keys(ENDLESS_MODS);
  const mod = w >= 5 ? mods[Math.floor(mkRng(L.seed * 7 + Math.floor(w / 5) * 101)() * mods.length)] : null;
  if (mod === 'swarm') for (const g of groups) { g.n = Math.min(60, Math.round(g.n * 1.5)); g.hp *= 0.7; g.gap *= 0.75; }
  if (mod === 'sky') { const fk = w >= 12 && rng() < 0.5 ? 'gargoyle' : 'bat'; groups.push(makeGroup(fk, clamp(Math.round(budget / 3 / ENEMIES[fk].cost), 3, 30), (E > 1 ? 1 : 0), delay * 0.5, hpMul)); }
  // 精英：每 5 波（不是頭目波）一隊巨魔
  if ((w + 1) % 5 === 0 && (w + 1) % 10 !== 0) groups.push(makeGroup('ogre', 1 + Math.floor(w / 10), 0, delay + 1, hpMul));
  if ((w + 1) % 10 === 0) {
    const bosses = L.act === 2 ? ['bossYeti', 'bossColossus', 'bossWyrm', 'bossTortoise', 'bossRaijin', 'bossKraken', 'bossEclipse', 'bossPharaoh'] : L.act ? ['bossTortoise', 'bossRoc', 'bossRaijin', 'bossPharaoh', 'bossLich', 'bossKraken', 'bossEclipse'] : ['bossGolem', 'bossDragon', 'bossLich', 'bossRoc', 'bossWorm', 'bossPharaoh', 'bossKraken'];
    const b = bosses[Math.floor((w + 1) / 10 - 1) % bosses.length];
    groups.push(makeGroup(b, 1 + Math.floor(w / 30), 0, delay + 2, (1 + 0.06 * w) * 0.9));
    // 第 20 波之後頭目會帶一個不同的頭目副手
    if (w >= 19) groups.push(makeGroup(bosses[(Math.floor((w + 1) / 10)) % bosses.length], 1, E > 1 ? 1 : 0, delay + 8, (1 + 0.06 * w) * 0.55));
  }
  return { groups, mod };
}

function waveSummary(wave) {
  const m = {};
  for (const g of wave.groups) m[g.k] = (m[g.k] || 0) + g.n;
  return m;
}
