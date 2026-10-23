'use strict';
// 深淵地牢：啟動、主迴圈、存檔時機、除錯介面
Store.load();
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
    if (G.pendingId) { const u = P.inv.find(o => Game.needsId(o)); Game.finishIdentify(u || null); return true; }
    if (P.st.para > 0 || P.st.freeze > 0) { Game.wait(); return true; }
    const cl = F.clouds.find(c => c.x === P.x && c.y === P.y);
    if (cl) { for (const [dx, dy] of DIRS8) { const x = P.x + dx, y = P.y + dy; if (Game.knownPass(x, y) && !Game.monAt(x, y) && !F.clouds.some(c => c.x === x && c.y === y)) return Game.move(dx, dy, { force: 1 }); } }
    const adj = Game.adjHostiles().filter(m => !m.disg);
    const vis = Game.hostiles().filter(m => m.awake || cheb(m.x, m.y, P.x, P.y) <= 2);
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
    }
    if (P.hunger < 250) { const f = P.inv.find(o => o.c === 'food'); if (f) return Game.eat(f); }
    // 技能
    const ab = CLASSES[P.cls].abil;
    for (const id of ab) {
      if (P.cds[id] > 0) continue;
      const A = ABIL[id];
      if (id === 'whirl' && adj.length >= 2) return Game.useAbility(id);
      if (id === 'nova' && adj.length >= 1) return Game.useAbility(id);
      if (A.tgt === 'enemy' && id !== 'charge') { const c = Game.abilityTargets(id).filter(m => m.awake || A.range === 1); if (c.length) return Game.useAbility(id, c[0].x, c[0].y); }
      if (id === 'haste' && vis.length >= 2) return Game.useAbility(id);
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
    // 寶箱
    const ch = Game.adjChest(); if (ch) return Game.move(ch.x - P.x, ch.y - P.y);
    // 探索
    const ep = Game.explorePath();
    if (ep && ep.length) return Game.move(ep[0][0] - P.x, ep[0][1] - P.y, { auto: 1, force: !!Game.trapAt(ep[0][0], ep[0][1]) });
    if (F.locked && F.bossId) {
      const b = F.mons.find(m => m.id === F.bossId);
      if (b) { const p = FOV.path(F, P.x, P.y, b.x, b.y, (x, y, g) => g || TP[Game.tile(x, y)].walk && Game.tile(x, y) !== T.LAVA && !(Game.monAt(x, y) && MON[Game.monAt(x, y).k].npc)); if (p && p.length) return Game.move(p[0][0] - P.x, p[0][1] - P.y, { force: 1 }); }
    }
    if (F.stairs) {
      if (P.x === F.stairs[0] && P.y === F.stairs[1]) return Game.descend();
      const p = FOV.path(F, P.x, P.y, F.stairs[0], F.stairs[1], (x, y, g) => g || TP[Game.tile(x, y)].walk && Game.tile(x, y) !== T.LAVA && !(Game.monAt(x, y) && MON[Game.monAt(x, y).k].npc));
      if (p && p.length) return Game.move(p[0][0] - P.x, p[0][1] - P.y, { force: 1 });
    }
    if (F.arena) { const b = F.mons.find(m => MON[m.k].final); if (b) { const p = FOV.path(F, P.x, P.y, b.x, b.y, (x, y, g) => g || TP[Game.tile(x, y)].walk && Game.tile(x, y) !== T.LAVA && !(Game.monAt(x, y) && MON[Game.monAt(x, y).k].npc)); if (p && p.length) return Game.move(p[0][0] - P.x, p[0][1] - P.y, { force: 1 }); } }
    Game.rest();
    return true;
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
      const depth = 1 + (i % LAST_FLOOR), rng = new RNG(seed + i);
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
