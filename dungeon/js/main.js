'use strict';
// 深淵地牢：啟動、主迴圈、存檔時機、除錯介面
Store.load();
Render.initQ();
UI.init();
UI.layout();
addEventListener('resize', () => UI.layout());
addEventListener('orientationchange', () => setTimeout(() => UI.layout(), 200));
const saveNow = () => { if (G && !G.demo && !G.over && UI.state === 'play') Game.save(); };
addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => UI.layout());

function frame() {
  const t = now();
  try { UI.update(t); Render.draw(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- 除錯／自動測試用 ----------
const Bot = {
  // 簡單的機器人：會打怪、喝藥、吃東西、探索、下樓
  act() {
    if (!G || G.over) return false;
    const P = G.P, F = G.F;
    if (G.perkChoices) { Game.choosePerk(G.perkChoices[0]); return true; }
    if (G.relicChoices) { Game.chooseRelic(G.relicChoices[0]); return true; }
    if (G.deepChoice) { Game.chooseDeep(!!window.__botDeep); return true; }
    if (G.pendingId) { const u = P.inv.find(o => Game.needsId(o)); Game.finishIdentify(u || null); return true; }
    if (P.st.para > 0 || P.st.freeze > 0) { Game.wait(); return true; }
    const cl = F.clouds.find(c => c.x === P.x && c.y === P.y);
    if (cl) { for (const [dx, dy] of DIRS8) { const x = P.x + dx, y = P.y + dy; if (Game.knownPass(x, y) && !Game.monAt(x, y) && !F.clouds.some(c => c.x === x && c.y === y)) return Game.move(dx, dy, { force: 1 }); } }
    const adj = Game.adjHostiles().filter(m => !m.disg);
    const vis = Game.hostiles().filter(m => (m.awake || cheb(m.x, m.y, P.x, P.y) <= 2) && !((m.k === 'thief' || m.gold || m.st.fear > 0) && cheb(m.x, m.y, P.x, P.y) > 1)); // 不追逃跑的怪物（小偷精會一直跑）
    const hpF = P.hp / P.mhp;
    if (hpF < 0.4 && (adj.length || vis.length)) {
      const heal = P.inv.find(o => (o.k === 'p_heal' || o.k === 'p_xheal') && G.known[o.k]);
      if (heal) return Game.quaff(heal);
      const C = CLASSES[P.cls];
      if (C.abil.includes('heal') && !P.cds.heal) return Game.useAbility('heal');
      const unk = P.inv.find(o => o.c === 'potion' && !G.known[o.k]);
      if (unk) return Game.quaff(unk);
      const tele = P.inv.find(o => o.k === 's_tele' && G.known[o.k]);
      if (tele && hpF < 0.25) return Game.read(tele);
      // 盜賊：用暗影步拉開距離
      if (P.cls === 'rogue' && !P.cds.step && adj.length && hpF < 0.3) { const t = this.stepSpot(vis, true); if (t) return Game.useAbility('step', t[0], t[1]); }
    }
    if (P.hunger < 250) { const f = P.inv.find(o => o.c === 'food'); if (f) return Game.eat(f); }
    // 盜賊：潛行、暗影步偷襲
    if (P.cls === 'rogue') {
      const boss = vis.find(m => MON[m.k].boss && m.awake);
      if (!P.cds.stealth && !P.st.invis && ((boss && cheb(boss.x, boss.y, P.x, P.y) <= 3) || adj.length >= 2 || (adj.length && hpF < 0.5))) return Game.useAbility('stealth');
      if ((P.st.invis || P.sneakNext) && adj.length) { const m = adj.find(o => MON[o.k].boss) || adj.sort((a, b) => b.hp - a.hp)[0]; return Game.move(m.x - P.x, m.y - P.y); }
      if (!P.cds.step && hpF > 0.45 && !adj.length) { const t = this.stepSpot(vis, false); if (t) return Game.useAbility('step', t[0], t[1]); }
    }
    // 技能
    const ab = CLASSES[P.cls].abil;
    for (const id of ab) {
      if (P.cds[id] > 0) continue;
      const A = ABIL[id];
      if (id === 'whirl' && adj.length >= 2) return Game.useAbility(id);
      if (id === 'nova' && adj.length >= 1) return Game.useAbility(id);
      if (A.tgt === 'enemy' && id !== 'charge') { const c = Game.abilityTargets(id).filter(m => m.awake || A.range === 1); if (c.length) return Game.useAbility(id, c[0].x, c[0].y); }
      if (id === 'haste' && vis.length >= 2) return Game.useAbility(id);
      if (id === 'zen' && adj.length && (hpF < 0.6 || adj.length >= 2)) return Game.useAbility(id);
      if (id === 'stealth' && (adj.some(m => MON[m.k].boss) || (adj.length && hpF < 0.5))) return Game.useAbility(id);
    }
    if (adj.length) { const m = adj.sort((a, b) => a.hp - b.hp)[0]; return Game.move(m.x - P.x, m.y - P.y); }
    if (vis.length) {
      const m = vis.sort((a, b) => cheb(a.x, a.y, P.x, P.y) - cheb(b.x, b.y, P.x, P.y))[0];
      const thr = P.inv.find(o => o.c === 'throw');
      if (thr && cheb(m.x, m.y, P.x, P.y) <= 6 && FOV.clear(F, P.x, P.y, m.x, m.y)) return Game.throwItem(thr, m.x, m.y);
      const p = FOV.path(F, P.x, P.y, m.x, m.y, (x, y, g) => g || Game.knownPass(x, y) && !Game.monAt(x, y));
      if (p && p.length) return Game.move(p[0][0] - P.x, p[0][1] - P.y);
    }
    // 裝備
    for (const it of P.inv) {
      if (Game.isEquipped(it) || (it.known && it.cursed)) continue;
      if (it.c === 'weapon') { const c = Game.equipped('w'); if (!c || ITEMS[it.k].dmg[1] > ITEMS[c.k].dmg[1] + 1 && !c.cursed) return Game.equip(it); }
      if (it.c === 'armor') { const c = Game.equipped('a'); if (!c || ITEMS[it.k].arm > ITEMS[c.k].arm && !c.cursed) return Game.equip(it); }
      if (it.c === 'ring' && (!P.eq.r1 || !P.eq.r2)) return Game.equip(it);
    }
    const sc = P.inv.find(o => o.c === 'scroll' && (!G.known[o.k] || ['s_ew', 's_ea', 's_uncurse', 's_map', 's_charge'].includes(o.k)));
    if (sc) return Game.read(sc);
    if (hpF < 0.6) return Game.rest();
    // 商店：食物不夠時買乾糧／蘋果
    if (F.shop && P.inv.filter(o => o.c === 'food').reduce((n, o) => n + o.n, 0) < 2) {
      const fo = F.items.find(o => o.it.price && o.it.c === 'food' && o.it.price <= P.gold && F.seen[o.y * F.w + o.x]);
      if (fo) {
        if (P.x === fo.x && P.y === fo.y) { const r = Game.pickup(true); if (r.ok) return true; }
        else { const p = FOV.path(F, P.x, P.y, fo.x, fo.y, (x, y, g) => g || Game.knownPass(x, y) && !(Game.monAt(x, y) && MON[Game.monAt(x, y).k].talk)); if (p && p.length) return Game.move(p[0][0] - P.x, p[0][1] - P.y, { auto: 1 }); }
      }
    }
    // 寶箱
    const ch = Game.adjChest(); if (ch) return Game.move(ch.x - P.x, ch.y - P.y);
    // 探索
    const ep = Game.explorePath();
    if (ep && ep.length) return Game.move(ep[0][0] - P.x, ep[0][1] - P.y, { auto: 1, force: !!Game.trapAt(ep[0][0], ep[0][1]) });
    if (F.locked && F.bossId) {
      const b = F.mons.find(m => m.id === F.bossId);
      if (b) { const p = FOV.path(F, P.x, P.y, b.x, b.y, (x, y, g) => g || TP[Game.tile(x, y)].walk && Game.tile(x, y) !== T.LAVA && !(Game.monAt(x, y) && MON[Game.monAt(x, y).k].talk)); if (p && p.length) return Game.move(p[0][0] - P.x, p[0][1] - P.y, { force: 1 }); }
    }
    // 秘境裂口：體力夠就進去打守護者
    if (F.portal && !F.portal.used && !window.__noBranch && hpF > 0.9) {
      if (P.x === F.portal.x && P.y === F.portal.y) return Game.descend();
      const p = FOV.path(F, P.x, P.y, F.portal.x, F.portal.y, (x, y, g) => g || TP[Game.tile(x, y)].walk && Game.tile(x, y) !== T.LAVA && !(Game.monAt(x, y) && MON[Game.monAt(x, y).k].talk));
      if (p && p.length) return Game.move(p[0][0] - P.x, p[0][1] - P.y, { force: 1 });
    }
    if (F.stairs) {
      if (P.x === F.stairs[0] && P.y === F.stairs[1]) return Game.descend();
      const p = FOV.path(F, P.x, P.y, F.stairs[0], F.stairs[1], (x, y, g) => g || TP[Game.tile(x, y)].walk && Game.tile(x, y) !== T.LAVA && !(Game.monAt(x, y) && MON[Game.monAt(x, y).k].talk));
      if (p && p.length) return Game.move(p[0][0] - P.x, p[0][1] - P.y, { force: 1 });
    }
    if (F.arena) { const b = F.mons.find(m => MON[m.k].boss && m.hp > 0); if (b) { const p = FOV.path(F, P.x, P.y, b.x, b.y, (x, y, g) => g || TP[Game.tile(x, y)].walk && Game.tile(x, y) !== T.LAVA && !(Game.monAt(x, y) && MON[Game.monAt(x, y).k].talk)); if (p && p.length) return Game.move(p[0][0] - P.x, p[0][1] - P.y, { force: 1 }); } }
    Game.rest();
    return true;
  },
  // 暗影步的落點：flee=true 時找離敵人最遠的空地，否則找最強敵人旁邊的空地
  stepSpot(vis, flee) {
    const P = G.P, ok = (x, y) => { const v = Game.tile(x, y); return Game.inView(x, y) && TP[v].walk && v !== T.LAVA && !Game.monAt(x, y) && !Game.trapAt(x, y) && cheb(x, y, P.x, P.y) <= 6 && cheb(x, y, P.x, P.y) > 0; };
    if (flee) {
      let best = null, bd = 2;
      for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) { const x = P.x + i, y = P.y + j; if (!ok(x, y)) continue; const d = Math.min(...vis.map(m => cheb(m.x, m.y, x, y))); if (d > bd) { bd = d; best = [x, y]; } }
      return best;
    }
    const tg = vis.filter(m => m.awake && !MON[m.k].npc && cheb(m.x, m.y, P.x, P.y) >= 2 && cheb(m.x, m.y, P.x, P.y) <= 7).sort((a, b) => (MON[b.k].boss ? 99 : 0) + b.hp - (MON[a.k].boss ? 99 : 0) - a.hp)[0];
    if (!tg) return null;
    for (const [dx, dy] of DIRS8) { const x = tg.x + dx, y = tg.y + dy; if (ok(x, y)) return [x, y]; }
    return null;
  },
  run(n, god) {
    let i = 0;
    for (; i < n && G && !G.over; i++) {
      if (god) { G.P.hp = G.P.mhp; G.P.hunger = Math.max(G.P.hunger, 500); }
      const t0 = G.turn; const ok = this.act();
      if (!ok && G.turn === t0) Game.rest();
    }
    return { steps: i, depth: G.depth, turn: G.turn, over: G.over, cause: G.cause, lvl: G.P.lvl, hp: G.P.hp };
  },
};
window.__dg = {
  get G() { return G; }, Game, Gen, Bot, UI, Render, Store,
  start(cls = 'warrior', seed = 'TEST') { Store.clearRun(); UI.state = 'play'; document.body.classList.add('playing'); Game.newRun(cls, seed, false); UI.closeOv(); UI.layout(); Render.snapCam(); return true; },
  // 產生多層樓並檢查連通性
  genTest(n = 50, seed = 'G') {
    const out = { ok: 0, fail: [], avgFloor: 0 };
    for (let i = 0; i < n; i++) {
      const depth = 1 + (i % DEEP_LAST), rng = new RNG(seed + i);
      try {
        const F = Gen.make(depth, rng);
        const pass = v => TP[v].walk && v !== T.LAVA;
        const d = Gen.bfs(F, F.start, pass);
        let fl = 0, un = 0;
        for (let k = 0; k < F.t.length; k++) if (pass(F.t[k]) && !Gen.inVault(F, k)) { fl++; if (d[k] < 0) un++; }
        const sOk = F.arena || (F.stairs && d[F.stairs[1] * F.w + F.stairs[0]] >= 0);
        out.avgFloor += fl / n;
        if (sOk && !un) out.ok++; else out.fail.push({ i, depth, sOk, un });
      } catch (e) { out.fail.push({ i, depth, err: String(e) }); }
    }
    return out;
  },
};
