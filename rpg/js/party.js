'use strict';
// 曉鐘傳說：隊伍成員、能力值、升級、道具欄
const Party = {
  make(id, lv = 1) {
    const m = { id, lv: 1, exp: 0, hp: 1, mp: 0, eq: { w: null, a: null, s: null, h: null, x: null }, st: {} };
    m.exp = EXP_TABLE[lv] || 0; m.lv = lv;
    const s = this.stats(m); m.hp = s.mhp; m.mp = s.mmp;
    return m;
  },
  base(m, k) { const C = CHARS[m.id]; return Math.floor(C.base[k] + C.gr[k] * (m.lv - 1) + (k === 'hp' ? m.lv * m.lv * 0.035 : 0)); },
  stats(m) {
    const s = { mhp: this.base(m, 'hp'), mmp: this.base(m, 'mp'), str: this.base(m, 'str'), def: this.base(m, 'def'), agi: this.base(m, 'agi'), int: this.base(m, 'int') };
    s.atk = s.str;
    for (const sl in m.eq) { const e = EQUIP[m.eq[sl]]; if (!e) continue; s.atk += e.atk || 0; s.def += e.def || 0; s.agi += e.agi || 0; s.int += e.int || 0; }
    return s;
  },
  name(m) { return CHARS[m.id].name; },
  spells(m) { return CHARS[m.id].learn.filter(l => l[0] <= m.lv).map(l => l[1]); },
  canEquip(m, id) { const e = EQUIP[id]; return !!e && e.who.includes(CHARS[m.id].eqMask); },
  alive(m) { return m.hp > 0; },
  // 加經驗，回傳升級訊息
  gainExp(m, n) {
    const msgs = [];
    if (m.hp <= 0 || m.lv >= MAXLV) return msgs;
    m.exp += n;
    while (m.lv < MAXLV && m.exp >= EXP_TABLE[m.lv + 1]) {
      const before = this.stats(m), oldSp = this.spells(m);
      m.lv++;
      const after = this.stats(m);
      m.hp += after.mhp - before.mhp; m.mp += after.mmp - before.mmp;
      const gains = [];
      if (after.str > before.str) gains.push('力量 +' + (after.str - before.str));
      if (after.def - before.def > 0) gains.push('防禦 +' + (after.def - before.def));
      if (after.agi > before.agi) gains.push('速度 +' + (after.agi - before.agi));
      gains.push('HP +' + (after.mhp - before.mhp));
      if (after.mmp > before.mmp) gains.push('MP +' + (after.mmp - before.mmp));
      msgs.push({ lv: m.lv, text: `${this.name(m)}升到了第 ${m.lv} 級！`, gains: gains.join('　') });
      for (const sp of this.spells(m)) if (!oldSp.includes(sp)) msgs.push({ text: `${this.name(m)}學會了「${SPELLS[sp].name}」！` });
    }
    return msgs;
  },
  toNext(m) { return m.lv >= MAXLV ? 0 : EXP_TABLE[m.lv + 1] - m.exp; },
};

// 道具欄
const Bag = {
  count(id) { return G.items[id] || 0; },
  add(id, n = 1) { G.items[id] = (G.items[id] || 0) + n; },
  remove(id, n = 1) { G.items[id] = Math.max(0, (G.items[id] || 0) - n); if (!G.items[id]) delete G.items[id]; },
  has(id) { return (G.items[id] || 0) > 0; },
  list(filter) { return Object.keys(G.items).filter(id => G.items[id] > 0 && (!filter || filter(id))); },
};

// 新遊戲資料
function newGameState(diff) {
  const hero = Party.make('hero', 1);
  hero.eq.w = 'club'; hero.eq.a = 'cloth';
  const s = Party.stats(hero); hero.hp = s.mhp; hero.mp = s.mmp;
  return {
    v: 1, diff, party: [hero], gold: 60, items: { herb: 3 }, flags: {}, map: 'maple', x: 4, y: 4, dir: 'down',
    steps: 0, time: 0, towns: ['maple'], save: { map: 'maple', x: 13, y: 15 }, repel: 0, battles: 0, cleared: false,
  };
}
