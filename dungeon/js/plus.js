'use strict';
// 深淵地牢：第三輪——武僧（第六個職業）、更多遺物與羈絆、新的樓層事件（詛咒之月、流星雨、旅行商隊）

// ---------- 武僧 ----------
Object.assign(ABIL, {
  palm: { n: '震山掌', cd: 8, tgt: 'enemy', range: 1, d: '對相鄰敵人必中的一掌 ×1.6，把牠震飛 3 格；撞上牆或其他怪物會受傷並暈眩，被震進虛空裂谷就會掉下去。' },
  zen: { n: '金鐘罩', cd: 20, tgt: 'none', d: '6 回合內受到的傷害減半，被近戰打中時有 35% 機率反擊；同時解除混亂、遲緩與麻痺。' },
});
CLASSES.monk = { n: '武僧', en: 'MONK', spr: 'monk', hp: 31, lvHp: 6, acc: 3, eva: 3, str: 0, abil: ['palm', 'zen'], col: '#ff9a3a',
  start: [['wraps', 1], ['gi', 1], ['ration', 1], ['p_heal', 1]], d: '赤手空拳的修行者，掌力能把敵人震飛。', tip: '拳套或空手時：傷害隨等級成長，每次近戰有 25% 機率連擊。', lock: '抵達第 10 層後解鎖' };
CLASS_ORDER.push('monk');
CLASS_PERK_BIAS.monk = ['dodge', 'str', 'crit', 'vit', 'focus', 'regen'];
Object.assign(ITEMS, {
  wraps: { c: 'weapon', n: '拳套', spr: 'wraps', dmg: [2, 6], acc: 2, d: 1, w: 0, price: 40, fist: 1 },
  gi: { c: 'armor', n: '武道服', spr: 'armor', arm: 2, eva: 2, d: 1, w: 0, price: 50, tint: '#d8802a', look: 'leather' },
});
SPR.wraps = { p: { w: '#efe4cc', W: '#b8a888', r: '#d8443a', s: '#e8b88a' }, m: [
  '............', '....ssss....', '...swwwws...', '..swWwWwWs..', '..swwwwwws..', '..sWwWwWws..',
  '...wwwwww...', '...wWwWww...', '....wwww.r..', '.....ww..r..', '........r...', '............'] };
WPN_LOOK.wraps = 'wraps';
HERO_LOOK.monk = { skin: '#e8b88a', cloth: '#e07a2a', clothD: '#a04a1a', pants: '#5a3a2a', boot: '#3a2a1a', hair: '#2a1a12' };

// ---------- 新遺物與羈絆 ----------
Object.assign(RELICS, {
  pearl: { n: '潮汐珍珠', tag: 'tide', col: '#8fe8ff', d: '站在水裡時，近戰傷害 +25%，每 3 回合回復 1 HP。' },
  conch: { n: '海螺號角', tag: 'tide', col: '#f0c8b0', d: '被近戰打中時，有 20% 機率噴出水流，把對方擊退 2 格。' },
  meteor: { n: '墜星碎片', tag: 'cosmic', col: '#ffd98a', d: '每 15 回合，對視線內一隻敵人降下流星。' },
  orbit: { n: '星環', tag: 'cosmic', col: '#9ab8ff', d: '使用職業技能後，下一次近戰必定會心一擊。' },
  whet: { n: '磨刀石', tag: 'war', col: '#c8ccd8', d: '會心一擊的傷害更高（×2.3）。' },
  lantern: { n: '引魂提燈', tag: 'arcane', col: '#a8f0c8', d: '視野 +2，看得見隱形的怪物。' },
});
Object.assign(RSETS, {
  tide: { n: '怒濤', d: '擊退的撞擊傷害 +40% 並多暈眩 1 回合；站在水裡閃避 +3。' },
  cosmic: { n: '星墜', d: '流星每 8 回合落下一次，並且會暈眩命中的敵人。' },
});

// ---------- 樓層事件與旅行商人 ----------
Object.assign(FEVENTS, {
  curse: { n: '詛咒之月', d: '血色的月光讓怪物更兇暴（傷害 +20%），但打倒牠們得到的經驗 +50%。', col: '#ff5a6a' },
  meteor: { n: '流星雨', d: '星星不斷墜落！地上出現紅色標記時快躲開，流星砸過的地方會留下金幣。', col: '#ffd98a' },
  caravan: { n: '旅行商隊', d: '一位旅行商人在這層擺攤，帶著遺物與稀有的貨物。', col: '#7dffa0' },
});
MON.trader = { n: '旅行商人', spr: 'trader', hp: 999, atk: [0, 0], acc: 0, eva: 0, arm: 99, spd: 100, xp: 0, d: 99, verb: '', npc: 1, talk: 1, d2: '背著大背包四處旅行的商人。' };
Object.assign(MSPR, {
  trader(P, f) {
    biped(P, { size: 'med', body: '#5a7a3a', leg: '#4a3a2a', boot: '#3a2a1a', skin: '#f0c090', arm: '#5a7a3a', belt: '#c8a040', wpn: 'staff', wo: { orb: '#7dffa0' },
      back(P, ux, uy) { P.r(3 + ux, 8 + uy, 8, 10, '#8a5a2a'); P.r(3 + ux, 8 + uy, 8, 2, '#a8703a'); P.r(4 + ux, 12 + uy, 6, 1, '#5a3a1a'); P.e(7 + ux, 6 + uy, 3, 2, '#c84a3a'); P.p(6 + ux, 15 + uy, '#ffd040'); },
      head(P, x, y) { P.e(x + 3.5, y + 3.6, 3.6, 3.6, '#f0c090'); P.p(x + 5, y + 3, '#20162a'); P.r(x + 3, y + 5, 4, 1, '#8a5a3a'); P.e(x + 3.5, y + 0.8, 5, 2.2, '#c8a040'); P.r(x - 2, y + 1, 11, 1, '#8a6a2a'); },
    }, f);
  },
});

// ---------- 規則 ----------
Object.assign(Game, {
  isFist() { const w = this.equipped('w'); return !w || !!ITEMS[w.k].fist; },
  // 武僧的拳頭：傷害隨等級成長
  fistBonus() { return G.P.cls === 'monk' && this.isFist() ? 1 + Math.floor(G.P.lvl * 0.5) : 0; },
  // 每回合的追加效果：珍珠回血、墜星碎片、流星雨
  tickPlus() {
    const P = G.P, F = G.F, fx = typeof FX !== 'undefined';
    if (this.relic('pearl') && G.turn % 3 === 0 && this.isWetAt(P.x, P.y) && P.hp < P.mhp) P.hp++;
    if (this.relic('meteor') && G.turn % (this.rset('cosmic') ? 8 : 15) === 0) {
      const tg = this.hostiles().filter(m => m.awake && cheb(m.x, m.y, P.x, P.y) <= 8);
      if (tg.length) {
        const m = G.rng.pick(tg), dmg = 8 + G.depth;
        if (fx) { FX.pillar(m.x, m.y, '255,215,140', 0.6); FX.boom(m.x, m.y, 0.8, '255,215,140'); }
        Snd.play('boom'); msg('一顆流星砸中了' + this.monName(m) + '！', 'g');
        this.damageMon(m, dmg, {});
        if (m.hp > 0 && this.rset('cosmic')) m.st.stun = Math.max(m.st.stun || 0, 2);
      }
    }
    if (F.event === 'meteor' && !F.arena && G.turn % 7 === 0) {
      for (let i = 0; i < 12; i++) {
        const x = P.x + G.rng.int(-4, 4), y = P.y + G.rng.int(-4, 4), v = this.tile(x, y);
        if (!TP[v].walk || v === T.LAVA || v === T.STAIRS || !this.inView(x, y) || (F.marks || []).some(o => o.x === x && o.y === y)) continue;
        this.addMark(x, y, 2, 4 + Math.round(G.depth * 0.6), '流星', 0); F.marks[F.marks.length - 1].gold = 1; G.interrupt = true;
        break;
      }
    }
  },
  // 武僧的震山掌
  palm(m) {
    const P = G.P, dx = Math.sign(m.x - P.x), dy = Math.sign(m.y - P.y), fx = typeof FX !== 'undefined';
    if (fx) { FX.ring(m.x, m.y, 0.8, '#ffd0a0'); FX.add('shock', { x: m.x + 0.5, y: m.y + 0.8, r: 0.9, col: '#ffe0b0', dur: 0.35, flat: 1 }); FX.shake(5); }
    Snd.play('charge');
    msg('震山掌！', 'y');
    const hp0 = m.hp;
    this.meleeAttack(m, { mult: 1.6, sure: true, noSpecial: 1, noCombo: 1 });
    if (m.hp > 0) this.knock(m, dx, dy, 3, { slam: Math.max(4, Math.round((hp0 - m.hp) * 0.6)) });
  },
});

// 職業技能：武僧
{
  const use0 = Game.useAbility;
  Game.useAbility = function (id, tx, ty) {
    if (id !== 'palm' && id !== 'zen') { const ok = use0.call(this, id, tx, ty); if (ok && this.relic('orbit')) G.P.orbitNext = 1; return ok; }
    if (!this.canAct()) return false;
    const P = G.P, A = ABIL[id];
    if (P.cds[id] > 0) { msg(A.n + '還要 ' + P.cds[id] + ' 回合才能再用。', 'm'); return false; }
    if (id === 'palm') {
      const m = this.monAt(tx, ty); if (!m || MON[m.k].npc || cheb(m.x, m.y, P.x, P.y) > 1) { msg('震山掌只能對相鄰的敵人使用。', 'm'); return false; }
      if (m.disg) this.reveal(m);
      this.palm(m);
    } else {
      P.st.zen = 6; P.st.conf = 0; P.st.slow = 0; P.st.para = 0;
      msg('你運起金鐘罩，全身泛起金光！', 'y'); Snd.play('holy');
      if (typeof FX !== 'undefined') { FX.ring(P.x, P.y, 1, '#ffd75a'); FX.pillar(P.x, P.y, '255,215,90', 0.6); FX.burst(P.x, P.y, '#ffd75a', 16); }
    }
    P.cds[id] = this.abilCd(id);
    if (this.relic('orbit')) P.orbitNext = 1;
    this.endTurn();
    return true;
  };
}

// 旅行商人
{
  const opt0 = Game.npcOptions, line0 = Game.npcLine;
  Game.npcOptions = function (m) {
    if (m.k !== 'trader') return opt0.call(this, m);
    const P = G.P, d = G.depth, out = [];
    m.stock = m.stock || { relic: this.relicPool(1)[0] || null, n: 0 };
    const buy = (price, fn) => () => { P.gold -= price; fn(); Snd.play('gold'); m.stock.n++; if (m.stock.n >= 3) { msg('旅行商人：「貨都賣光啦！祝你好運。」', 'y'); this.npcLeave(m); } else if (typeof UI !== 'undefined') UI.npcTalk(m); };
    const rp = 140 + d * 12, hp = 80 + d * 6, sp = 90 + d * 6, ep = 120 + d * 8;
    if (m.stock.relic) out.push({ t: '遺物「' + RELICS[m.stock.relic].n + '」（' + rp + ' 金）', dis: P.gold < rp, fn: buy(rp, () => { const k = m.stock.relic; m.stock.relic = null; this.gainRelic(k); }) });
    out.push({ t: '強效治療藥水（' + hp + ' 金）', dis: P.gold < hp, fn: buy(hp, () => { const it = this.makeItem('p_xheal'); G.known.p_xheal = 1; if (!this.addInv(it)) this.dropItem(it, P.x, P.y); }) });
    out.push({ t: '符文卷軸（' + sp + ' 金）', dis: P.gold < sp, fn: buy(sp, () => { const it = this.makeItem('s_rune'); G.known.s_rune = 1; if (!this.addInv(it)) this.dropItem(it, P.x, P.y); }) });
    out.push({ t: '精良裝備（' + ep + ' 金）', dis: P.gold < ep, fn: buy(ep, () => { const it = this.goodItem(d + 2); it.known = true; this.dropItem(it, P.x, P.y); msg('商人遞給你一件' + this.itemName(it) + '。', 'g'); }) });
    return out;
  };
  Game.npcLine = function (m) { return m.k === 'trader' ? '「遠道而來的稀有貨物，錯過就沒囉！」' : line0.call(this, m); };
}

// 新的樓層事件：商隊需要擺一位商人
{
  const pop0 = Game.populateMore;
  Game.populateMore = function (F, depth, used) {
    pop0.call(this, F, depth, used);
    if (F.event !== 'caravan') return;
    const rng = new RNG('caravan:' + G.seed + ':' + depth), pass = v => TP[v].walk && v !== T.LAVA;
    for (let tries = 0; tries < 120; tries++) {
      const r = rng.pick(F.rooms); if (!r || r.kind !== 'room' || r.start) continue;
      const x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1), k = y * F.w + x;
      if (F.t[k] !== T.FLOOR || used.has(k) || this.monAt(x, y) || cheb(x, y, F.start[0], F.start[1]) < 4 || !Gen.safeBlock(F, x, y, pass)) continue;
      used.add(k); const m = this.makeMon('trader', x, y); F.mons.push(m); return;
    }
    F.event = null;
  };
}

// ---------- 成就 ----------
ACH.push(
  { id: 'monk10', n: '拳意', d: '用武僧抵達第 10 層', s: 8, chk: e => e.t === 'depth' && e.v >= 10 && G.cls === 'monk' },
  { id: 'fall5', n: '推落深淵', d: '累計把 5 隻怪物推進虛空裂谷', s: 10, chk: e => e.t === 'fall' && Meta.cnt('falls') >= 5 },
);
