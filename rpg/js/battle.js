'use strict';
// 曉鐘傳說：回合制戰鬥（規則與演出分開，規則部分可在模擬中重複使用）
const BUFM = [0.6, 0.78, 1, 1.3, 1.6];
const bm = st => BUFM[clamp(st, -2, 2) + 2];
const LETTERS = 'ABCDEFG';

const Battle = {
  create(ids, o = {}) {
    const d = DIFFS[(G && G.diff) || 'normal'];
    const B = { enemies: [], party: G.party, boss: !!o.boss, noRun: !!(o.boss || o.noRun), bg: o.bg || 'field', over: null, runTries: 0, d, round: 0, o };
    for (const id of ids) this.addEnemy(B, id);
    for (const m of B.party) m.b = { buf: { atk: 0, def: 0, agi: 0 }, sleep: 0, seal: 0, stun: 0, defend: false, cover: false };
    return B;
  },
  addEnemy(B, id) {
    const m = MONS[id];
    const hp = Math.round(m.hp * (m.metal ? 1 : B.d.ehp));
    const e = { id, m, name: m.name, hp, mhp: hp, buf: { atk: 0, def: 0, agi: 0 }, sleep: 0, seal: 0, alive: true, vis: true, charged: false, defend: false, fx: { flash: 0, die: 0, lunge: 0, shake: 0, appear: 0 } };
    B.enemies.push(e); this.rename(B); return e;
  },
  rename(B) {
    const cnt = {}; for (const e of B.enemies) cnt[e.id] = (cnt[e.id] || 0) + 1;
    const seen = {};
    for (const e of B.enemies) { if (cnt[e.id] > 1) { const n = seen[e.id] = (seen[e.id] || 0) + 1; e.name = e.m.name + ' ' + LETTERS[n - 1]; } else e.name = e.m.name; }
  },
  liveE(B) { return B.enemies.filter(e => e.alive); },
  liveP(B) { return B.party.filter(m => m.hp > 0); },
  pstat(m) { const s = Party.stats(m); return { atk: s.atk * bm(m.b.buf.atk), def: s.def * bm(m.b.buf.def), agi: s.agi * bm(m.b.buf.agi), int: s.int, mhp: s.mhp, mmp: s.mmp }; },
  estat(e) { return { atk: e.m.atk * bm(e.buf.atk), def: e.m.def * bm(e.buf.def), agi: e.m.agi * bm(e.buf.agi) }; },
  phys(atk, def, mult = 1) {
    const raw = (atk - def * 0.5) * 0.5 * mult;
    if (raw < 2) return Math.random() < 0.55 ? ri(0, 2) : ri(1, Math.max(1, Math.round(atk / 14)));
    return Math.max(1, Math.round(raw * rnd(0.87, 1.13)));
  },
  canAct(m) { return m.hp > 0 && !m.b.sleep && !m.b.stun; },

  // ───── 回合 ─────
  order(B, acts) {
    const list = [];
    B.party.forEach((m, i) => { if (m.hp > 0) list.push({ who: m, side: 'p', act: acts[i], sp: this.pstat(m).agi * rnd(0.55, 1) + (acts[i] && acts[i].type === 'defend' ? 999 : 0) }); });
    for (const e of B.enemies) if (e.alive) {
      const sp = this.estat(e).agi * rnd(0.55, 1);
      list.push({ who: e, side: 'e', sp });
      if (e.m.twice && Math.random() < e.m.twice) list.push({ who: e, side: 'e', sp: sp * 0.5 });
    }
    list.sort((a, b) => b.sp - a.sp);
    return list;
  },
  // 執行一個行動，回傳演出事件
  act(B, ent) {
    const ev = [];
    if (B.over) return ev;
    if (ent.side === 'p') this.partyAct(B, ent.who, ent.act, ev);
    else this.enemyAct(B, ent.who, ev);
    this.checkOver(B);
    return ev;
  },
  checkOver(B) {
    if (B.over) return;
    if (!this.liveE(B).length) B.over = 'win';
    else if (!this.liveP(B).length) B.over = 'lose';
  },
  endRound(B) {
    const ev = [];
    for (const m of B.party) {
      if (m.hp <= 0) continue;
      m.b.defend = false; m.b.cover = false; if (m.b.stun) m.b.stun--;
      if (m.st.poison) {
        const s = Party.stats(m), d = Math.max(1, Math.round(s.mhp / 14));
        ev.push({ t: 'msg', text: `${Party.name(m)}受到毒的傷害！` }, { t: 'anim', kind: 'poison', target: m });
        this.hurtP(B, m, d, ev);
      }
    }
    for (const e of B.enemies) { e.defend = false; if (e.seal && Math.random() < 0.2) e.seal = 0; }
    this.checkOver(B);
    return ev;
  },

  hurtE(B, e, n, ev, opt = {}) {
    if (!e.alive) return;
    if (e.defend) n = Math.round(n / 2);
    e.hp -= n;
    ev.push({ t: 'dmgE', e, n, crit: opt.crit });
    if (n > 0 && e.sleep && Math.random() < 0.5) { e.sleep = 0; }
    if (e.hp <= 0) { e.hp = 0; e.alive = false; ev.push({ t: 'msg', text: `打倒了${e.name}！` }, { t: 'die', e }); }
  },
  hurtP(B, m, n, ev) {
    if (m.hp <= 0) return;
    m.hp = Math.max(0, m.hp - n);
    ev.push({ t: 'dmgP', m, n, hp: m.hp });
    if (m.b.sleep && n > 0 && Math.random() < 0.5) { m.b.sleep = 0; ev.push({ t: 'msg', text: `${Party.name(m)}醒過來了！` }); }
    if (m.hp <= 0) { m.st = {}; m.b.buf = { atk: 0, def: 0, agi: 0 }; m.b.sleep = 0; ev.push({ t: 'msg', text: `${Party.name(m)}倒下了……` }, { t: 'pdie', m }); }
  },
  healP(m, n, ev) {
    const s = Party.stats(m), before = m.hp; m.hp = Math.min(s.mhp, m.hp + n);
    ev && ev.push({ t: 'healP', m, n: m.hp - before, hp: m.hp });
    return m.hp - before;
  },
  pickTargetE(B, t) { if (t && t.alive) return t; const l = this.liveE(B); return l.length ? pick(l) : null; },

  partyAct(B, m, a, ev) {
    const nm = Party.name(m);
    if (m.b.sleep) {
      if (Math.random() < 0.4) { m.b.sleep = 0; ev.push({ t: 'msg', text: `${nm}醒過來了！` }); }
      else { ev.push({ t: 'msg', text: `${nm}正在呼呼大睡……` }); return; }
    }
    if (m.b.stun) { ev.push({ t: 'msg', text: `${nm}嚇得動不了！` }); return; }
    if (!a) a = { type: 'attack' };
    const ps = this.pstat(m);
    switch (a.type) {
      case 'attack': {
        const e = this.pickTargetE(B, a.target); if (!e) return;
        ev.push({ t: 'pact', m, kind: 'attack', target: e }, { t: 'msg', text: `${nm}的攻擊！` }, { t: 'anim', kind: 'slash', target: e, sfx: 'attack' });
        this.physHit(B, ps, e, 1, ev, { canCrit: true, acc: 0.97 });
        break;
      }
      case 'defend': m.b.defend = true; ev.push({ t: 'pact', m, kind: 'guard' }, { t: 'msg', text: `${nm}擺好架勢防禦。` }); break;
      case 'spell': this.castSpell(B, m, a.id, a.target, ev); break;
      case 'item': this.useItem(B, m, a.id, a.target, ev); break;
    }
  },
  physHit(B, ps, e, mult, ev, o = {}) {
    const es = this.estat(e);
    const missP = clamp(0.02 + (es.agi - ps.agi) / 500, 0.01, 0.12) + (1 - (o.acc || 1));
    if (Math.random() < missP) { ev.push({ t: 'miss', target: e }, { t: 'msg', text: `但是${e.name}躲開了！`, sfx: 'miss' }); return; }
    if (e.m.metal) {
      const crit = o.canCrit && Math.random() < 1 / 22;
      const n = crit ? ri(2, 4) : (Math.random() < 0.6 ? 1 : 0);
      if (crit) ev.push({ t: 'msg', text: '會心一擊！' }, { t: 'anim', kind: 'crit', target: e });
      ev.push({ t: 'msg', text: n ? `對${e.name}造成 ${n} 點傷害！` : `${e.name}毫髮無傷！` });
      this.hurtE(B, e, n, ev); return;
    }
    let n, crit = false;
    if (o.canCrit && Math.random() < 1 / 26) { crit = true; n = Math.round(ps.atk * rnd(0.82, 0.95) * mult); ev.push({ t: 'msg', text: '會心一擊！' }, { t: 'anim', kind: 'crit', target: e }); }
    else n = this.phys(ps.atk, es.def, mult);
    ev.push({ t: 'msg', text: n > 0 ? `對${e.name}造成 ${n} 點傷害！` : `${e.name}毫髮無傷！` });
    this.hurtE(B, e, n, ev, { crit });
  },
  spellPower(sp, int) { return rnd(sp.pow[0], sp.pow[1]) * (1 + int / 220); },
  castSpell(B, m, sid, target, ev) {
    const sp = SPELLS[sid], nm = Party.name(m), ps = this.pstat(m);
    if (m.b.seal && sp.kind !== 'phys' && sp.kind !== 'cover' && !(sp.kind === 'buff' && sp.tgt === 'self')) { ev.push({ t: 'msg', text: `${nm}想詠唱「${sp.name}」，但是法術被封印了！` }); return; }
    if (m.mp < sp.mp) { ev.push({ t: 'msg', text: `${nm}的 MP 不夠！` }); return; }
    m.mp -= sp.mp; ev.push({ t: 'mp', m });
    const isSkill = CHARS[m.id].magic === '特技';
    ev.push({ t: 'pact', m, kind: sp.kind === 'phys' ? 'attack' : 'cast', el: sp.el || sp.kind, target: sp.tgt === 'enemy' ? this.pickTargetE(B, target) : null, skill: isSkill });
    ev.push({ t: 'msg', text: isSkill ? `${nm}使出了「${sp.name}」！` : `${nm}詠唱了「${sp.name}」！` });
    const targetsE = sp.tgt === 'enemies' ? this.liveE(B) : sp.tgt === 'enemy' ? [this.pickTargetE(B, target)].filter(Boolean) : [];
    switch (sp.kind) {
      case 'dmg': {
        const anim = { fire: 'fire', ice: 'ice', thunder: 'bolt', holy: 'holy', none: 'meteor' }[sp.el];
        ev.push({ t: 'anim', kind: anim, target: sp.tgt === 'enemies' ? 'enemies' : targetsE[0], src: sp.tgt === 'enemy' ? m : null, big: sp.tgt === 'enemies', sfx: { fire: 'fire', ice: 'ice', thunder: 'thunder', holy: 'holy', none: 'thunder' }[sp.el] });
        for (const e of targetsE) {
          if (!e.alive) continue;
          if (e.m.metal) { ev.push({ t: 'msg', text: `${e.name}完全不受影響！` }); continue; }
          const r = (e.m.res && e.m.res[sp.el] !== undefined) ? e.m.res[sp.el] : 1;
          if (r === 0) { ev.push({ t: 'msg', text: `${e.name}完全不受影響！` }); continue; }
          const n = Math.max(1, Math.round(this.spellPower(sp, ps.int) * r));
          ev.push({ t: 'msg', text: `對${e.name}造成 ${n} 點傷害！${r > 1 ? '效果拔群！' : ''}` });
          this.hurtE(B, e, n, ev);
        }
        break;
      }
      case 'phys': {
        ev.push({ t: 'anim', kind: sp.tgt === 'enemies' ? 'whirl' : 'smash', target: sp.tgt === 'enemies' ? 'enemies' : targetsE[0], sfx: 'attack' });
        for (const e of targetsE) {
          if (!e.alive) continue;
          this.physHit(B, ps, e, sp.mult, ev, { acc: sp.acc, canCrit: false });
          if (sp.debuff && e.alive && !e.m.metal) { e.buf.def = Math.max(-2, e.buf.def - 1); ev.push({ t: 'msg', text: `${e.name}的防禦下降了！` }); }
        }
        break;
      }
      case 'heal': {
        const tg = sp.tgt === 'allies' ? this.liveP(B) : [target && target.hp > 0 ? target : m];
        ev.push({ t: 'anim', kind: 'heal', target: sp.tgt === 'allies' ? 'party' : tg[0], sfx: 'heal' });
        for (const t of tg) { const n = this.healP(t, Math.round(sp.pow[0] >= 999 ? 9999 : this.spellPower(sp, ps.int * 0.6)), ev); ev.push({ t: 'msg', text: `${Party.name(t)}的 HP 回復了 ${n} 點！` }); }
        break;
      }
      case 'cure': { const t = target || m; t.st.poison = 0; t.b.sleep = 0; ev.push({ t: 'anim', kind: 'heal', target: t, sfx: 'heal' }, { t: 'msg', text: `${Party.name(t)}的身體恢復正常了！` }); break; }
      case 'revive': {
        const t = target && target.hp <= 0 ? target : B.party.find(x => x.hp <= 0);
        if (!t) { ev.push({ t: 'msg', text: '但是什麼也沒有發生。' }); break; }
        const s = Party.stats(t); t.hp = Math.ceil(s.mhp / 2); t.b = { buf: { atk: 0, def: 0, agi: 0 }, sleep: 0, seal: 0, stun: 0 };
        ev.push({ t: 'anim', kind: 'holy', target: t, sfx: 'holy' }, { t: 'healP', m: t, n: t.hp, hp: t.hp }, { t: 'msg', text: `${Party.name(t)}復活了！` });
        break;
      }
      case 'buff': {
        const tg = sp.tgt === 'self' ? [m] : this.liveP(B);
        ev.push({ t: 'anim', kind: 'buff', target: sp.tgt === 'self' ? m : 'party', sfx: 'buff' });
        const lab = { atk: '攻擊力', def: '防禦力', agi: '速度' }[sp.stat];
        for (const t of tg) { t.b.buf[sp.stat] = Math.min(2, t.b.buf[sp.stat] + 1); }
        ev.push({ t: 'msg', text: sp.tgt === 'self' ? `${nm}的${lab}提升了！` : `大家的${lab}提升了！` });
        break;
      }
      case 'debuff': {
        ev.push({ t: 'anim', kind: 'debuff', target: 'enemies', sfx: 'debuff' });
        for (const e of targetsE) { if (e.m.metal) continue; e.buf.def = Math.max(-2, e.buf.def - 1); }
        ev.push({ t: 'msg', text: '敵人的防禦力下降了！' });
        break;
      }
      case 'status': {
        ev.push({ t: 'anim', kind: sp.st, target: 'enemies', sfx: sp.st === 'sleep' ? 'sleep' : 'debuff' });
        for (const e of targetsE) {
          const rate = sp.rate * (e.m.boss ? 0.25 : 1) * (e.m.metal ? 0.2 : 1);
          if (Math.random() < rate) { e[sp.st] = sp.st === 'sleep' ? 3 : 1; ev.push({ t: 'msg', text: sp.st === 'sleep' ? `${e.name}睡著了！` : `${e.name}的法術被封印了！` }); }
          else ev.push({ t: 'msg', text: `${e.name}沒有受到影響。` });
        }
        break;
      }
      case 'cover': m.b.cover = true; ev.push({ t: 'anim', kind: 'buff', target: m, sfx: 'buff' }, { t: 'msg', text: `${nm}站到夥伴前面！` }); break;
    }
  },
  useItem(B, m, id, target, ev) {
    const it = ITEMS[id], nm = Party.name(m);
    if (!Bag.has(id)) { ev.push({ t: 'msg', text: `${nm}找不到${it.name}了。` }); return; }
    ev.push({ t: 'pact', m, kind: 'item' }, { t: 'msg', text: `${nm}使用了${it.name}！` });
    Bag.remove(id);
    const t = target || m;
    switch (it.kind) {
      case 'heal': { if (t.hp <= 0) { ev.push({ t: 'msg', text: '但是沒有效果……' }); break; } ev.push({ t: 'anim', kind: 'heal', target: t, sfx: 'heal' }); const n = this.healP(t, ri(it.pow[0], it.pow[1]), ev); ev.push({ t: 'msg', text: `${Party.name(t)}的 HP 回復了 ${n} 點！` }); break; }
      case 'full': { if (t.hp <= 0) { ev.push({ t: 'msg', text: '但是沒有效果……' }); break; } ev.push({ t: 'anim', kind: 'heal', target: t, sfx: 'heal' }); this.healP(t, 9999, ev); t.st.poison = 0; ev.push({ t: 'msg', text: `${Party.name(t)}完全恢復了！` }); break; }
      case 'mp': { const s = Party.stats(t), b = t.mp; t.mp = Math.min(s.mmp, t.mp + ri(it.pow[0], it.pow[1])); ev.push({ t: 'anim', kind: 'heal', target: t, sfx: 'heal' }, { t: 'mp', m: t }, { t: 'msg', text: `${Party.name(t)}的 MP 回復了 ${t.mp - b} 點！` }); break; }
      case 'cure': t.st.poison = 0; if (t.b) t.b.sleep = 0; ev.push({ t: 'anim', kind: 'heal', target: t, sfx: 'heal' }, { t: 'msg', text: `${Party.name(t)}的毒解除了！` }); break;
      case 'revive': {
        if (t.hp > 0) { ev.push({ t: 'msg', text: '但是沒有效果……' }); break; }
        const s = Party.stats(t); t.hp = Math.ceil(s.mhp / 2); t.b = { buf: { atk: 0, def: 0, agi: 0 }, sleep: 0, seal: 0, stun: 0 };
        ev.push({ t: 'anim', kind: 'holy', target: t, sfx: 'holy' }, { t: 'healP', m: t, n: t.hp, hp: t.hp }, { t: 'msg', text: `${Party.name(t)}復活了！` }); break;
      }
      case 'smoke':
        if (B.noRun) { ev.push({ t: 'msg', text: '煙霧散去了……這場戰鬥逃不掉！' }); break; }
        ev.push({ t: 'msg', text: '白煙瀰漫，大家趁機逃走了！', sfx: 'run' }); B.over = 'run'; break;
      default: ev.push({ t: 'msg', text: '但是什麼也沒有發生。' });
    }
  },
  tryRun(B) {
    const ev = [];
    ev.push({ t: 'msg', text: `${Party.name(this.liveP(B)[0])}他們想要逃跑……` });
    if (B.noRun) { ev.push({ t: 'msg', text: '無法逃跑！' }); return ev; }
    const pa = this.liveP(B).reduce((s, m) => s + this.pstat(m).agi, 0) / this.liveP(B).length;
    const ea = Math.max(...this.liveE(B).map(e => e.m.agi));
    const p = clamp(0.5 + (pa - ea) / (ea * 2 + 24) + B.runTries * 0.18, 0.25, 0.95);
    if (Math.random() < p) { ev.push({ t: 'msg', text: '成功逃跑了！', sfx: 'run' }); B.over = 'run'; }
    else { B.runTries++; ev.push({ t: 'msg', text: '但是被包圍了！' }); }
    return ev;
  },

  // ───── 怪物行動 ─────
  pickVictim(B) {
    const al = this.liveP(B); if (!al.length) return null;
    const w = al.map(m => [5, 4, 3, 3][B.party.indexOf(m)] || 2);
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < al.length; i++) { r -= w[i]; if (r < 0) return al[i]; }
    return al[0];
  },
  chooseEnemyAct(B, e) {
    const acts = e.m.acts, opts = [];
    for (let i = 0; i < acts.length; i += 2) {
      const a = acts[i]; let w = acts[i + 1];
      if (a === 'heal') { const low = this.liveE(B).some(x => x.hp < x.mhp * 0.5); if (!low) w = 0; else w *= 2; }
      if (a.startsWith('call:') && this.liveE(B).length >= 4) w = 0;
      if (a.startsWith('spell:') && e.seal) w = 0;
      if (a === 'charge' && e.charged) w = 0;
      if (a === 'dispel' && !B.party.some(m => m.b && (m.b.buf.atk > 0 || m.b.buf.def > 0 || m.b.buf.agi > 0))) w = 0;
      if (w > 0) opts.push([a, w]);
    }
    if (!opts.length) return 'atk';
    let r = Math.random() * opts.reduce((s, o) => s + o[1], 0);
    for (const [a, w] of opts) { r -= w; if (r < 0) return a; }
    return opts[0][0];
  },
  enemyAct(B, e, ev) {
    if (!e.alive) return;
    if (e.sleep) { e.sleep--; if (e.sleep > 0 && Math.random() > 0.35) { ev.push({ t: 'msg', text: `${e.name}正在睡覺。` }); return; } e.sleep = 0; ev.push({ t: 'msg', text: `${e.name}醒過來了！` }); }
    const es = this.estat(e), D = B.d;
    if (e.charged) {
      e.charged = false;
      const v = this.cover(B, this.pickVictim(B), ev); if (!v) return;
      ev.push({ t: 'msg', text: `${e.name}釋放出蓄積的力量！` }, { t: 'lunge', e }, { t: 'anim', kind: 'claw', target: v, sfx: 'phit' });
      const n = Math.round(this.phys(es.atk, this.pstat(v).def, 2.2) * D.edmg * (v.b.defend ? 0.5 : 1));
      ev.push({ t: 'msg', text: `${Party.name(v)}受到 ${n} 點傷害！` }); this.hurtP(B, v, n, ev); return;
    }
    const a = this.chooseEnemyAct(B, e), [kind, p1, p2, p3] = a.split(':');
    const hitOne = (mult, verb) => {
      const v = this.cover(B, this.pickVictim(B), ev); if (!v) return;
      ev.push({ t: 'msg', text: verb || `${e.name}的攻擊！` }, { t: 'lunge', e });
      const vs = this.pstat(v);
      if (Math.random() < clamp(0.03 + (vs.agi - es.agi) / 450, 0.01, 0.1)) { ev.push({ t: 'miss', target: v }, { t: 'msg', text: `${Party.name(v)}閃開了！`, sfx: 'miss' }); return; }
      let n;
      if (Math.random() < 1 / 48 && !e.m.boss) { n = Math.round(es.atk * 0.75 * mult); ev.push({ t: 'msg', text: '痛恨的一擊！' }); }
      else n = this.phys(es.atk, vs.def, mult);
      n = Math.round(n * D.edmg * (v.b.defend ? 0.5 : 1));
      ev.push({ t: 'anim', kind: 'claw', target: v, sfx: 'phit' }, { t: 'msg', text: n > 0 ? `${Party.name(v)}受到 ${n} 點傷害！` : `${Party.name(v)}沒有受傷！` });
      this.hurtP(B, v, n, ev);
      return { v, n };
    };
    switch (kind) {
      case 'atk': hitOne(1); break;
      case 'atk2': hitOne(1.55, `${e.name}使出猛烈的一擊！`); break;
      case 'multi': { const k = ri(2, 3); ev.push({ t: 'msg', text: `${e.name}射出一大把尖刺！` }); for (let i = 0; i < k && this.liveP(B).length; i++) { const v = this.pickVictim(B); const n = Math.round(this.phys(es.atk, this.pstat(v).def, 0.65) * D.edmg * (v.b.defend ? 0.5 : 1)); ev.push({ t: 'anim', kind: 'claw', target: v, sfx: 'phit' }, { t: 'msg', text: `${Party.name(v)}受到 ${n} 點傷害！` }); this.hurtP(B, v, n, ev); } break; }
      case 'drain': { const r = hitOne(1, `${e.name}咬了過來！`); if (r && r.n > 0) { const h = Math.min(e.mhp - e.hp, r.n); e.hp += h; ev.push({ t: 'msg', text: `${e.name}吸取了 ${r.n} 點 HP！` }); } break; }
      case 'poison': { const r = hitOne(1, `${e.name}的毒牙攻擊！`); if (r && r.v.hp > 0 && Math.random() < +p1) { r.v.st.poison = 1; ev.push({ t: 'anim', kind: 'poison', target: r.v, sfx: 'poison' }, { t: 'msg', text: `${Party.name(r.v)}中毒了！` }); } break; }
      case 'sleepgas': {
        ev.push({ t: 'msg', text: `${e.name}噴出了甜甜的霧氣……` }, { t: 'anim', kind: 'sleepP', target: 'party', sfx: 'sleep' });
        for (const v of this.liveP(B)) { if (Math.random() < +p1) { v.b.sleep = 1; ev.push({ t: 'msg', text: `${Party.name(v)}睡著了！` }); } }
        break;
      }
      case 'breath': {
        const el = p1, lo = +p2, hi = +p3;
        const nm = { fire: '吐出熊熊烈焰！', ice: '吐出刺骨寒氣！', wind: '捲起一陣狂風！', poison: '吐出劇毒的氣息！', sand: '掀起漫天沙暴！', dark: '吐出漆黑的氣息！' }[el];
        ev.push({ t: 'msg', text: `${e.name}${nm}` }, { t: 'lunge', e }, { t: 'anim', kind: 'breath', el, target: 'party', src: e, sfx: el === 'wind' || el === 'sand' ? 'wind' : 'breath' });
        for (const v of this.liveP(B)) {
          const n = Math.round(ri(lo, hi) * D.edmg * (v.b.defend ? 0.5 : 1));
          ev.push({ t: 'msg', text: `${Party.name(v)}受到 ${n} 點傷害！` }); this.hurtP(B, v, n, ev);
          if (el === 'poison' && v.hp > 0 && Math.random() < 0.4) { v.st.poison = 1; ev.push({ t: 'msg', text: `${Party.name(v)}中毒了！` }); }
        }
        break;
      }
      case 'spell': {
        const sp = ESPELLS[p1];
        ev.push({ t: 'msg', text: `${e.name}詠唱了「${sp.name}」！` }, { t: 'lunge', e });
        if (sp.heal) { const low = this.liveE(B).sort((a, b) => a.hp / a.mhp - b.hp / b.mhp)[0]; const n = Math.min(low.mhp - low.hp, ri(sp.heal[0], sp.heal[1])); low.hp += n; ev.push({ t: 'anim', kind: 'healE', target: low, sfx: 'heal' }, { t: 'msg', text: `${low.name}的 HP 回復了 ${n} 點！` }); break; }
        if (sp.st) {
          ev.push({ t: 'anim', kind: sp.st === 'sleep' ? 'sleepP' : 'sealP', target: 'party', sfx: sp.st === 'sleep' ? 'sleep' : 'debuff' });
          for (const v of this.liveP(B)) { if (Math.random() < sp.rate) { v.b[sp.st] = 1; ev.push({ t: 'msg', text: sp.st === 'sleep' ? `${Party.name(v)}睡著了！` : `${Party.name(v)}的法術被封印了！` }); } else ev.push({ t: 'msg', text: `${Party.name(v)}沒有受到影響。` }); }
          break;
        }
        const tg = sp.tgt === 'all' ? this.liveP(B) : [this.cover(B, this.pickVictim(B), ev)].filter(Boolean);
        ev.push({ t: 'anim', kind: sp.anim + 'P', target: sp.tgt === 'all' ? 'party' : tg[0], src: sp.tgt === 'all' ? null : e, big: sp.tgt === 'all', sfx: { fire: 'fire', ice: 'ice', bolt: 'thunder', dark: 'breath' }[sp.anim] });
        for (const v of tg) { const n = Math.round(ri(sp.pow[0], sp.pow[1]) * D.edmg * (v.b.defend ? 0.6 : 1)); ev.push({ t: 'msg', text: `${Party.name(v)}受到 ${n} 點傷害！` }); this.hurtP(B, v, n, ev); }
        break;
      }
      case 'heal': {
        const low = this.liveE(B).sort((a, b) => a.hp / a.mhp - b.hp / b.mhp)[0];
        const amt = e.m.boss ? Math.round(e.mhp * 0.07) : Math.round(low.mhp * 0.35);
        const n = Math.min(low.mhp - low.hp, amt); low.hp += n;
        ev.push({ t: 'msg', text: `${e.name}詠唱了「治癒」！` }, { t: 'anim', kind: 'healE', target: low, sfx: 'heal' }, { t: 'msg', text: `${low.name}的 HP 回復了 ${n} 點！` });
        break;
      }
      case 'call': {
        if (B.enemies.filter(x => x.alive).length >= 5) { ev.push({ t: 'msg', text: `${e.name}呼叫同伴，但是沒有人來。` }); break; }
        const ne = this.addEnemy(B, p1); ne.fx.appear = 1; ne.vis = false;
        ev.push({ t: 'msg', text: `${e.name}呼叫了同伴！` }, { t: 'add', e: ne }, { t: 'msg', text: `${ne.name}出現了！` });
        break;
      }
      case 'flee': e.alive = false; e.fled = true; ev.push({ t: 'msg', text: `${e.name}逃走了！`, sfx: 'run' }, { t: 'flee', e }); break;
      case 'charge': e.charged = true; ev.push({ t: 'msg', text: `${e.name}正在蓄積力量……` }, { t: 'anim', kind: 'buffE', target: e, sfx: 'buff' }); break;
      case 'defend': e.defend = true; ev.push({ t: 'msg', text: `${e.name}縮起身子防禦。` }); break;
      case 'steal': {
        const n = Math.min(G.gold, ri(8, 20) * Math.ceil(e.m.exp / 20));
        G.gold -= n;
        ev.push({ t: 'msg', text: `${e.name}伸手摸了摸口袋……` }, { t: 'msg', text: n ? `被偷走了 ${n} 金幣！${e.name}逃走了！` : `${e.name}什麼也沒偷到，逃走了！`, sfx: 'run' });
        e.alive = false; e.fled = true; ev.push({ t: 'flee', e });
        break;
      }
      case 'roar': {
        ev.push({ t: 'msg', text: `${e.name}發出震耳欲聾的咆哮！` }, { t: 'anim', kind: 'roar', target: e, sfx: 'roar' });
        for (const v of this.liveP(B)) if (Math.random() < 0.35) { v.b.stun = 1; ev.push({ t: 'msg', text: `${Party.name(v)}嚇得愣住了！` }); }
        break;
      }
      case 'dispel': {
        ev.push({ t: 'msg', text: `${e.name}揮出黑暗的波動！` }, { t: 'anim', kind: 'darkP', target: 'party', sfx: 'debuff' });
        for (const v of B.party) if (v.b) v.b.buf = { atk: 0, def: 0, agi: 0 };
        ev.push({ t: 'msg', text: '大家身上的增益效果都消失了！' });
        break;
      }
      default: hitOne(1);
    }
  },
  cover(B, v, ev) {
    if (!v) return v;
    const b = B.party.find(m => m.hp > 0 && m.b.cover && m !== v && !m.b.sleep);
    if (b) { ev.push({ t: 'msg', text: `${Party.name(b)}挺身擋在${Party.name(v)}前面！` }); return b; }
    return v;
  },

  // 自動戰鬥（玩家選「自動」與平衡模擬都用這個）
  auto(B, m, o = {}) {
    const sp = Party.spells(m).filter(s => SPELLS[s].mp <= m.mp && !SPELLS[s].nobattle && (!m.b.seal || SPELLS[s].kind === 'phys'));
    const has = s => sp.includes(s);
    const party = this.liveP(B), dead = B.party.filter(x => x.hp <= 0), E = this.liveE(B);
    const ratio = x => x.hp / Party.stats(x).mhp;
    const mmp = Party.stats(m).mmp;
    if (dead.length && has('revive')) return { type: 'spell', id: 'revive', target: dead[0] };
    const low = party.filter(x => ratio(x) < 0.45).sort((a, b) => ratio(a) - ratio(b));
    if (low.length) {
      if (low.length >= 2 && has('healall')) return { type: 'spell', id: 'healall' };
      const t = low[0], miss = Party.stats(t).mhp - t.hp;
      if (miss > 220 && has('fullheal')) return { type: 'spell', id: 'fullheal', target: t };
      if (miss > 70 && has('heal2')) return { type: 'spell', id: 'heal2', target: t };
      if (has('heal')) return { type: 'spell', id: 'heal', target: t };
      if (ratio(m) < 0.3 && o.items !== false) { const it = ['herb3', 'herb2', 'herb'].find(i => Bag.has(i)); if (it) return { type: 'item', id: it, target: m }; }
    }
    if (m.st.poison && has('antidote') && ratio(m) < 0.7) return { type: 'spell', id: 'antidote', target: m };
    const weakest = E.slice().sort((a, b) => a.hp - b.hp)[0];
    const strongest = E.slice().sort((a, b) => b.hp - a.hp)[0];
    const big = B.boss || E.some(e => e.m.boss);
    const metal = E.some(e => e.m.metal);
    if (!metal) {
      const allSp = ['meteor', 'inferno', 'blizzard', 'thunder', 'holy', 'firestorm', 'whirl'].filter(has);
      const oneSp = ['holyslash', 'mighty', 'ice', 'zap', 'armorbreak', 'smash', 'fire'].filter(has);
      const resOk = (s, e) => { const el = SPELLS[s].el; return !el || !e.m.res || e.m.res[el] === undefined || e.m.res[el] >= 1; };
      if (big) {
        if (m.id === 'lia' && has('guard') && party.some(x => x.b.buf.def < 1) && Math.random() < 0.5) return { type: 'spell', id: 'guard' };
        if (m.id === 'lia' && has('bless') && party.some(x => x.b.buf.atk < 1) && Math.random() < 0.5) return { type: 'spell', id: 'bless' };
        if (m.id === 'mira' && has('weaken') && strongest.buf.def > -2 && Math.random() < 0.4) return { type: 'spell', id: 'weaken' };
        if (m.id === 'balk' && has('warcry') && m.b.buf.atk < 2 && Math.random() < 0.4) return { type: 'spell', id: 'warcry', target: m };
        if (m.mp > mmp * 0.15) { const s = oneSp.concat(allSp).find(s => resOk(s, strongest)); if (s) return { type: 'spell', id: s, target: strongest }; }
      } else if (E.length >= 3 && m.mp > mmp * 0.35) {
        const s = allSp.find(s => E.every(e => resOk(s, e))); if (s) return { type: 'spell', id: s };
      } else if (m.id === 'mira' && m.mp > mmp * 0.55 && E.length >= 2) {
        const s = allSp.find(s => E.every(e => resOk(s, e))); if (s) return { type: 'spell', id: s };
      }
    }
    return { type: 'attack', target: weakest };
  },

  // 戰利品
  rewards(B) {
    const dead = B.enemies.filter(e => !e.alive && !e.fled);
    let exp = 0, gold = 0; const drops = [];
    for (const e of dead) { exp += e.m.exp; gold += e.m.gold; if (Math.random() < (e.m.boss ? 0 : 1 / 14)) drops.push(e.m.exp > 150 ? 'herb2' : 'herb'); }
    return { exp: Math.round(exp * B.d.exp), gold: Math.round(gold * B.d.gold * rnd(0.9, 1.1)), drops };
  },
};

// ───── 戰鬥畫面（側面視角：怪物在左，夥伴在右） ─────
const FLYERS = new Set(['bat', 'bird', 'wisp', 'eye', 'lantern', 'shadow']);
const BScene = {
  B: null, lines: [], nums: [], shake: 0, t: 0, sel: null, actor: null, auto: false, ref: {}, hs: new Map(), stage: { x: 0, y: 0, w: 1, h: 1 },
  flashCol: '255,255,255', flashA: 0, zoom: 0, victory: null, intro: 0,
  flash(col, a) { this.flashCol = col; this.flashA = Math.max(this.flashA, a); },
  layout() {
    const V = L.V, fs = L.FS, pad = L.pad, wide = V.w > V.h * 1.05;
    let msg, status;
    if (wide) {
      const ph = fs * 1.5 * 4 + pad * 2;
      const mw = Math.min(fs * 22, (V.w - pad * 3) * 0.46);
      msg = { x: V.x + pad, y: V.y + V.h - ph - pad, w: mw, h: ph };
      status = { x: msg.x + mw + pad, y: msg.y, w: V.w - pad * 3 - mw, h: ph };
    } else {
      const sh = fs * 3.3 * 2 + pad * 1.6, mh = fs * 1.6 * 3 + fs * 1.5 + pad * 1.9;
      status = { x: V.x + pad, y: V.y + V.h - sh - pad, w: V.w - pad * 2, h: sh };
      msg = { x: V.x + pad, y: status.y - mh - pad * 0.6, w: V.w - pad * 2, h: mh };
    }
    const stage = { x: V.x, y: V.y, w: V.w, h: msg.y - V.y - pad * 0.5 };
    this.stage = stage;
    BFX.u = Math.max(1, stage.h / 110);
    return { status, msg, stage, area: stage, wide };
  },
  // 夥伴在舞台上的位置（腳底）
  heroScale() { const st = this.stage; return Math.max(1, Math.round(Math.min(st.h * 0.27 / 24, st.w * 0.115 / 16) * 2) / 2); },
  heroPos(m) {
    const st = this.stage, n = this.B.party.length, i = this.B.party.indexOf(m), s = this.heroScale();
    const tall = st.h > st.w * 0.8;
    const span = Math.min(st.h * (tall ? 0.42 : 0.4), s * 24 * (tall ? 0.8 : 0.55) * Math.max(1, n - 1));
    const y = st.y + st.h * (tall ? 0.86 : 0.94) - span + (n > 1 ? i * span / (n - 1) : span * 0.5);
    const x = st.x + st.w * (st.w > st.h ? 0.74 : 0.66) + i * st.w * (st.w > st.h ? 0.035 : 0.045) - s * 6;
    const h = this.hs.get(m) || {};
    return { x: x + (h.dx || 0), y, s, w: 28 * s, h: 28 * s, cx: x + (h.dx || 0) + 14 * s, cy: y - 14 * s };
  },
  hstate(m) { let h = this.hs.get(m); if (!h) { h = { dx: 0, tdx: 0, pose: null, hurt: 0, flash: 0, ph: Math.random() * 6, dead: m.hp <= 0 ? 1 : 0 }; this.hs.set(m, h); } return h; },
  placeEnemies() {
    const B = this.B, st = this.stage, list = B.enemies.filter(e => !e.gone);
    if (!list.length) return;
    const arts = list.map(e => MonArt.get(e.m));
    const hasBoss = list.some(e => e.m.boss);
    const tall = st.h > st.w * 0.8, aw = st.w * (st.w > st.h ? 0.66 : 0.64), ax = st.x + st.w * 0.03, base = st.y + st.h * (tall ? 0.8 : 0.88);
    const two = !hasBoss && list.length >= 4;
    let s = Math.min(st.h * (hasBoss ? 0.82 : 0.5) / (hasBoss ? 84 : 48), L.k * (hasBoss ? 1.8 : 1.5));
    const gap = L.FS * 0.3;
    const row = list.map((e, i) => (two && i % 2 === 1 ? 1 : 0));
    const widthOf = r => list.reduce((t, e, i) => t + (row[i] === r ? arts[i].w : 0), 0);
    const cnt = r => row.filter(x => x === r).length;
    const tw = Math.max(widthOf(0), widthOf(1) * 0.85);
    s = Math.min(s, (aw * 0.96 - gap * (Math.max(cnt(0), cnt(1)) - 1)) / Math.max(1, tw));
    s = Math.max(0.5, Math.floor(s * 4) / 4);
    for (const r of [1, 0]) {
      const rs = r ? s * 0.85 : s, ids = list.map((e, i) => i).filter(i => row[i] === r);
      const w = ids.reduce((t, i) => t + arts[i].w * rs, 0) + gap * (ids.length - 1);
      let x = ax + (aw - w) / 2 + (r ? aw * 0.08 : 0);
      const b = r ? base - st.h * (tall ? 0.2 : 0.16) : base;
      for (const i of ids) { const e = list[i], a = arts[i]; e.px = x; e.pw = a.w * rs; e.ph = a.h * rs; e.py = b - e.ph; e.cx = x + e.pw / 2; e.cy = e.py + e.ph * 0.5; e.row = r; x += a.w * rs + gap; }
    }
  },
  memberBox(m) { const p = this.heroPos(m); return { x: p.x + p.w * 0.15, y: p.y - p.h * 0.85, w: p.w * 0.7, h: p.h * 0.85 }; },
  say(text) { this.lines.push(text); if (this.lines.length > 4) this.lines.shift(); },
  clear() { this.lines = []; },
  waitMs(base) { return sleep(base * [1.45, 1, 0.55][Store.data.textSpeed ?? 1]); },
  posOf(t) {
    if (t && t.m && t.mhp !== undefined) return { x: t.cx, y: t.cy, w: t.pw, h: t.ph };
    if (t && t.id && CHARS[t.id]) { const p = this.heroPos(t); return { x: p.cx - p.w * 0.05, y: p.cy + p.h * 0.1, w: p.w * 0.7, h: p.h * 0.8, p: true }; }
    return null;
  },
  fxAt(target) {
    if (target === 'enemies') return this.B.enemies.filter(e => e.vis || e.fx.die > 0).map(e => this.posOf(e));
    if (target === 'party') return this.B.party.map(m => this.posOf(m));
    const p = this.posOf(target); return p ? [p] : [];
  },
  num(x, y, text, col, o = {}) { this.nums.push({ text: String(text), x, y, t: 0, col, big: o.big, small: o.small }); },
  async play(evs) {
    let actor = null;
    for (const ev of evs) {
      if (ev.sfx && ev.t !== 'anim') Snd.play(ev.sfx);
      switch (ev.t) {
        case 'msg': this.say(ev.text); await this.waitMs(ev.text.length > 14 ? 480 : 400); break;
        case 'pact': {
          actor = ev.m; const h = this.hstate(ev.m), p0 = this.heroPos(ev.m);
          if (ev.kind === 'attack' && ev.target && ev.target.alive !== false) {
            const tp = this.posOf(ev.target);
            if (tp) { h.tdx = (tp.x + tp.w * 0.45) - (p0.x - h.dx) ; h.tdx = Math.min(0, h.tdx); }
            h.pose = 'ready'; await sleep(230);
            h.pose = 'atk0'; Snd.play('attack'); await sleep(110); h.pose = 'atk1'; await sleep(60); h.pose = 'atk2';
          } else if (ev.kind === 'cast') {
            h.tdx = -this.stage.w * 0.05; h.pose = 'cast0';
            const col = { fire: '255,140,60', ice: '140,210,255', thunder: '255,240,140', holy: '255,245,200', none: '255,180,120', heal: '120,255,170', buff: '255,215,110', status: '200,140,255', debuff: '140,170,255', revive: '255,245,200', cure: '120,255,170', cover: '255,215,110' }[ev.el] || '200,200,255';
            const pp = this.heroPos(ev.m);
            BFX.ring(pp.cx, pp.y - pp.s, pp.w * 0.2, pp.w * 0.75, `rgba(${col},.9)`, 0.6, 1.2, true);
            for (let i = 0; i < 14; i++) BFX.P({ x: pp.cx + (Math.random() - 0.5) * pp.w * 0.8, y: pp.y, vy: -(40 + Math.random() * 60) * BFX.u / 4, life: 0.6, size: 1, col: `rgb(${col})`, shape: 'star' });
            Snd.play('spell'); await sleep(320); h.pose = 'cast1'; await sleep(120);
          } else if (ev.kind === 'item') { h.tdx = -this.stage.w * 0.04; h.pose = 'item'; await sleep(300); }
          else if (ev.kind === 'guard') { h.pose = 'guard'; await sleep(150); }
          break;
        }
        case 'anim': {
          if (ev.sfx) Snd.play(ev.sfx);
          const pos = this.fxAt(ev.target);
          let dur = 0.4;
          if (ev.kind === 'breath') { const src = ev.src ? this.posOf(ev.src) : { x: this.stage.x + this.stage.w * 0.35, y: this.stage.y + this.stage.h * 0.5 }; dur = BFX.breath(src, pos, ev.el); this.flash({ fire: '255,120,40', ice: '160,220,255', wind: '220,255,240', poison: '160,80,200', sand: '230,190,110', dark: '40,0,60' }[ev.el] || '255,255,255', 0.2); this.shake = 0.5; }
          else if (ev.kind === 'meteor') { const xs = pos.map(q => q.x), ys = pos.map(q => q.y); const box = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: ys.reduce((a, b) => a + b, 0) / ys.length, w: Math.max(...xs) - Math.min(...xs) + (pos[0] ? pos[0].w : 40), h: pos[0] ? pos[0].h : 40 }; dur = BFX.play('meteor', box); }
          else { const src = ev.src ? this.posOf(ev.src) : null; for (const q of pos) dur = Math.max(dur, BFX.play(ev.kind, q, { src: src && pos.length === 1 ? src : null, big: ev.big })); }
          if (ev.kind === 'claw' || ev.kind.endsWith('P')) this.shake = Math.max(this.shake, 0.22);
          await sleep(dur * 1000 * 0.85);
          break;
        }
        case 'dmgE': ev.e.fx.flash = 0.35; ev.e.fx.shake = 0.3; Snd.play(ev.crit ? 'crit' : 'hit'); this.num(ev.e.cx, ev.e.py + ev.e.ph * 0.25, ev.n, ev.crit ? '#ffe040' : '#ffffff', { big: ev.crit }); await sleep(140); break;
        case 'dmgP': { ev.m.vhp = ev.hp; const h = this.hstate(ev.m); if (ev.n > 0) { h.hurt = 0.45; h.flash = 0.3; } const p = this.heroPos(ev.m); this.num(p.cx, p.y - p.h * 0.75, ev.n, '#ff8a6a'); if (ev.n > 0) this.flash('255,40,40', 0.12); await sleep(130); break; }
        case 'healP': { ev.m.vhp = ev.hp; const p = this.heroPos(ev.m); this.num(p.cx, p.y - p.h * 0.75, '+' + ev.n, '#7dffb0'); break; }
        case 'miss': { const q = this.posOf(ev.target); if (q) this.num(q.x, q.y - q.h * 0.3, 'MISS', '#cfe6ff', { small: true }); break; }
        case 'mp': break;
        case 'die': this.dissolve(ev.e); ev.e.fx.die = 1; ev.e.vis = false; Snd.play('kill'); await sleep(420); break;
        case 'flee': ev.e.fx.die = 1; ev.e.fx.flee = true; ev.e.vis = false; await sleep(300); break;
        case 'pdie': { Snd.play('phit'); const h = this.hstate(ev.m); h.pose = null; await sleep(250); break; }
        case 'add': ev.e.vis = true; this.placeEnemies(); ev.e.fx.appear = 1; BFX.play('appear', this.posOf(ev.e)); await sleep(350); break;
        case 'lunge': ev.e.fx.lunge = 0.36; await sleep(200); break;
      }
    }
    if (actor) { const h = this.hstate(actor); h.tdx = 0; if (h.pose && h.pose !== 'guard') h.pose = 'back'; setTimeout(() => { if (h.pose === 'back') h.pose = null; }, 260 / (window.__speed || 1)); }
  },
  // 怪物倒下時碎成像素
  dissolve(e) {
    const art = MonArt.get(e.m);
    if (!art.px) { const g = art.img.getContext('2d'), d = g.getImageData(0, 0, art.w, art.h).data; art.px = []; for (let i = 0; i < art.w * art.h; i += 1) if (d[i * 4 + 3] > 0 && ((i * 7919) % 5 === 0)) art.px.push([i % art.w, (i / art.w) | 0, rgbToHex(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])]); }
    const sx = e.pw / art.w, n = Math.min(120, art.px.length);
    for (let k = 0; k < n; k++) {
      const [x, y, c] = art.px[(Math.random() * art.px.length) | 0];
      BFX.P({ x: e.px + x * sx, y: e.py + y * sx, vx: (Math.random() - 0.5) * 40 * BFX.u / 4, vy: -(20 + Math.random() * 70) * BFX.u / 4, drag: 0.02, life: 0.6 + Math.random() * 0.6, size: Math.max(0.6, sx / BFX.u), size2: 0.1, col: c, add: false, delay: 0 });
    }
    BFX.glow(e.cx, e.cy, e.pw * 0.5, '255,230,200', 0.3, 0.4);
  },
  update(dt) {
    this.t += dt;
    BFX.update(dt);
    if (!this.B) return;
    for (const e of this.B.enemies) {
      const f = e.fx;
      f.flash = Math.max(0, f.flash - dt); f.shake = Math.max(0, f.shake - dt); f.lunge = Math.max(0, f.lunge - dt);
      if (f.die > 0) f.die = Math.max(0, f.die - dt * 2.2);
      if (f.appear > 0) f.appear = Math.max(0, f.appear - dt * 2);
    }
    for (const m of this.B.party) {
      const h = this.hstate(m);
      const target = this.actor === m ? -this.stage.w * 0.035 : h.tdx;
      h.dx += (target - h.dx) * Math.min(1, dt * 14);
      h.hurt = Math.max(0, h.hurt - dt); h.flash = Math.max(0, h.flash - dt);
      h.dead = m.hp <= 0 ? Math.min(1, h.dead + dt * 3) : Math.max(0, h.dead - dt * 3);
      if (m.vhpD === undefined) m.vhpD = m.hp;
      const tv = m.vhp ?? m.hp; m.vhpD += (tv - m.vhpD) * Math.min(1, dt * 8); if (Math.abs(tv - m.vhpD) < 0.5) m.vhpD = tv;
    }
    this.nums = this.nums.filter(n => (n.t += dt) < 1.2);
    this.shake = Math.max(0, this.shake - dt); this.flashA = Math.max(0, this.flashA - dt * 2.2); this.zoom = Math.max(0, this.zoom - dt * 0.25);
    if (this.intro > 0) this.intro = Math.max(0, this.intro - dt * 1.6);
  },
  heroPose(m, h) {
    if (m.hp <= 0) return 'hurt';
    if (h.hurt > 0) return 'hurt';
    if (this.victory) return Math.floor(this.t * 3 + h.ph) % 2 ? 'win0' : 'win1';
    if (h.pose && h.pose !== 'back') return h.pose;
    if (h.pose === 'back') return 'ready';
    if (m.b && m.b.sleep) return 'sleep';
    if (m.b && m.b.defend) return 'guard';
    if (this.actor === m) return 'ready';
    const s = Party.stats(m);
    if (m.hp < s.mhp / 4) return 'kneel';
    return Math.floor(this.t * 1.7 + h.ph) % 2 ? 'idle1' : 'idle0';
  },
  draw(g) {
    const B = this.B; if (!B) return;
    const lay = this.layout(), V = L.V, fs = L.FS, pad = L.pad, st = lay.stage, t = this.t;
    g.save();
    g.beginPath(); g.rect(V.x, V.y, V.w, V.h); g.clip();
    g.fillStyle = '#05060f'; g.fillRect(V.x, V.y, V.w, V.h);
    // 舞台（震動與縮放）
    g.save();
    g.beginPath(); g.rect(st.x, st.y, st.w, st.h); g.clip();
    const sh = this.shake > 0 ? fs * 0.3 * Math.min(1, this.shake / 0.3) : 0;
    const z = 1 + this.zoom + this.intro * 0.25;
    g.translate(st.x + st.w / 2 + Math.sin(t * 90) * sh, st.y + st.h / 2 + Math.cos(t * 73) * sh * 0.6); g.scale(z, z); g.translate(-(st.x + st.w / 2), -(st.y + st.h / 2));
    const bgi = BBG.draw(g, B.bg, st, t);
    // 頭目背後的光暈
    const boss = B.enemies.find(e => e.m.boss && (e.vis || e.fx.die > 0));
    this.placeEnemies();
    if (boss) { const a = 0.35 + Math.sin(t * 2) * 0.1; const gr = g.createRadialGradient(boss.cx, boss.cy, 0, boss.cx, boss.cy, boss.pw * 0.8); const c = boss.m.pal.c && boss.m.pal.c.length === 7 ? hexToRgb(boss.m.pal.c).join(',') : '120,40,160'; gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(boss.cx - boss.pw, boss.cy - boss.pw, boss.pw * 2, boss.pw * 2); if (Math.random() < 0.5 && boss.vis) BFX.P({ x: boss.px + Math.random() * boss.pw, y: boss.py + boss.ph * (0.5 + Math.random() * 0.5), vy: -30 * BFX.u / 4, life: 1.2, size: 1, col: `rgb(${c})`, add: true }); }
    BFX.draw(g, true);
    // 影子
    for (const e of B.enemies) if (e.vis || e.fx.die > 0) { const fly = FLYERS.has(e.m.tpl); g.fillStyle = `rgba(0,0,0,${fly ? 0.18 : 0.3})`; g.beginPath(); g.ellipse(e.cx, e.py + e.ph * 0.98 + (fly ? e.ph * 0.06 : 0), e.pw * (fly ? 0.28 : 0.38), e.pw * 0.07, 0, 0, TAU); g.fill(); }
    // 怪物
    const drawEnemy = e => {
      if (!e.vis && e.fx.die <= 0) return;
      const art = MonArt.get(e.m), f = e.fx, fly = FLYERS.has(e.m.tpl), ph = (e.px || 0) * 0.01;
      let x = e.px, y = e.py, w = e.pw, h = e.ph;
      const br = Math.sin(t * (e.m.boss ? 1.6 : 2.4) + ph) * 0.022;
      if (!fly) { y -= h * br; h *= 1 + br; } else y += Math.sin(t * 3 + ph) * h * 0.05 - h * 0.06;
      if (f.shake > 0) x += Math.sin(f.shake * 80) * fs * 0.3;
      if (f.lunge > 0) { const k = Math.sin(f.lunge / 0.36 * Math.PI); x += w * 0.28 * k; y -= h * 0.04 * k; w *= 1 + k * 0.08; h *= 1 + k * 0.08; }
      g.save();
      if (!e.vis) { g.globalAlpha = f.flee ? f.die : f.die * f.die; if (f.flee) x += (1 - f.die) * w * 0.8; }
      if (f.appear > 0) { g.globalAlpha = 1 - f.appear; }
      if (e.sleep) g.filter = 'saturate(.5) brightness(.85)';
      if (e.charged) { g.globalAlpha *= 1; const gr = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 0.7); gr.addColorStop(0, `rgba(255,60,40,${0.3 + Math.sin(t * 8) * 0.15})`); gr.addColorStop(1, 'rgba(255,60,40,0)'); g.fillStyle = gr; g.fillRect(x - w * 0.2, y - h * 0.2, w * 1.4, h * 1.4); }
      const blink = f.flash > 0 && Math.floor(f.flash * 30) % 2 === 0;
      g.drawImage(blink ? art.white : art.img, x, y, w, h);
      if (!e.vis && f.die > 0 && !f.flee) { g.globalAlpha = f.die * f.die * 0.45; g.drawImage(art.red, x, y, w, h); }
      g.restore();
      if (e.sleep && e.alive) UI.text(g, 'Zz', e.px + e.pw * 0.8, e.py + Math.sin(t * 3) * fs * 0.2, '#cfe6ff', fs, 'left', 'top', 700);
      if (this.sel === e && e.alive) { const cy = e.py - fs * 0.3 + Math.sin(t * 8) * fs * 0.15; UI.cursor(g, e.cx - fs * 0.25, cy, fs * 1.2, 'down'); }
      if (this.selecting && e.alive) UI.hit(e.px, e.py, e.pw, e.ph, () => { const i = this.selList.indexOf(e); if (i >= 0 && this.ref.pick) this.ref.pick(i); });
    };
    B.enemies.filter(e => e.row === 1).forEach(drawEnemy);
    B.enemies.filter(e => e.row !== 1).forEach(drawEnemy);
    // 夥伴
    for (const m of B.party) {
      const h = this.hstate(m), p = this.heroPos(m), spr = battleSprites(m.id), pose = this.heroPose(m, h);
      const img = (h.flash > 0 && Math.floor(h.flash * 30) % 2 === 0) ? spr.white[pose] : spr[pose];
      let x = p.x + (h.hurt > 0 ? Math.sin(h.hurt * 40) * p.s * 0.8 + p.s * 2 : 0), y = p.y - p.h;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(p.x + p.w * 0.5, p.y - p.s * 0.5, p.w * 0.3, p.s * 1.6, 0, 0, TAU); g.fill();
      if (this.actor === m) { const gr = g.createRadialGradient(p.cx, p.y - p.s, 0, p.cx, p.y - p.s, p.w * 0.55); gr.addColorStop(0, 'rgba(255,215,106,.45)'); gr.addColorStop(1, 'rgba(255,215,106,0)'); g.fillStyle = gr; g.fillRect(p.x, p.y - p.w * 0.5, p.w, p.w * 0.6); }
      g.save();
      if (m.hp <= 0) {
        g.globalAlpha = 0.75; g.filter = 'grayscale(.7) brightness(.8)';
        g.translate(p.x + p.w / 2, p.y - p.s * 5); g.rotate(-Math.PI / 2 * h.dead); g.drawImage(img, -p.w / 2, -p.h / 2 + p.s * 5 * (1 - h.dead), p.w, p.h);
      } else {
        if (m.st.poison) g.filter = 'hue-rotate(40deg) saturate(1.2)';
        g.drawImage(img, x, y, p.w, p.h);
      }
      g.restore();
      if (m.b && m.b.sleep && m.hp > 0) UI.text(g, 'Zz', p.x + p.w * 0.7, y + Math.sin(t * 3) * fs * 0.2, '#cfe6ff', fs * 0.9, 'left', 'top', 700);
      if (this.actor === m) UI.cursor(g, p.cx - fs * 0.25, y + p.s * 2 + Math.sin(t * 8) * fs * 0.15, fs * 1.1, 'down');
      if (this.selectingAlly && (this.allyList || []).includes(m)) {
        if (this.actorHint === m) UI.cursor(g, p.cx - fs * 0.25, y + p.s * 2 + Math.sin(t * 8) * fs * 0.15, fs * 1.1, 'down');
        UI.hit(p.x, y, p.w, p.h, () => { const i = this.allyList.indexOf(m); if (this.ref.pick) this.ref.pick(i); });
      }
    }
    BFX.draw(g, false);
    BBG.drawFg(g, bgi, st, t);
    // 傷害數字
    for (const n of this.nums) {
      const sz = fs * (n.big ? 1.9 : n.small ? 1.1 : 1.45);
      g.font = `900 ${sz}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const chars = n.text.split(''), cw = sz * 0.6, x0 = n.x - (chars.length - 1) * cw / 2;
      chars.forEach((ch, i) => {
        const tt = n.t - i * 0.04; if (tt < 0) return;
        const bounce = tt < 0.35 ? Math.abs(Math.sin(tt / 0.35 * Math.PI)) * fs * 1.1 * (1 - tt) : 0;
        const y = n.y - bounce - Math.max(0, tt - 0.8) * fs * 1.5;
        g.globalAlpha = 1 - Math.max(0, n.t - 0.9) / 0.3;
        g.lineWidth = sz * 0.2; g.strokeStyle = '#140a1e'; g.strokeText(ch, x0 + i * cw, y); g.fillStyle = n.col; g.fillText(ch, x0 + i * cw, y);
      });
      g.globalAlpha = 1;
    }
    if (this.flashA > 0) { g.fillStyle = `rgba(${this.flashCol},${Math.min(0.8, this.flashA)})`; g.fillRect(st.x, st.y, st.w, st.h); }
    g.restore();
    // 舞台邊框
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(st.x, st.y + st.h - 2, st.w, 2);
    // 訊息窗
    const ms = lay.msg;
    UI.win(g, ms.x, ms.y, ms.w, ms.h);
    const showN = Math.max(1, Math.floor((ms.h - pad * 1.6) / (fs * 1.5)));
    this.lines.slice(-showN).forEach((ln, i) => UI.text(g, ln, ms.x + pad * 1.4, ms.y + pad * 0.85 + i * fs * 1.5, '#fff', fs));
    if (this.auto) UI.text(g, '自動戰鬥中（按 B 取消）', ms.x + ms.w - pad, ms.y - fs * 1.1, '#ffd76a', fs * 0.78, 'right', 'top', 700);
    // 隊伍狀態
    this.drawStatus(g, lay);
    if (this.victory) this.drawVictory(g, lay);
    g.restore();
  },
  drawStatus(g, lay) {
    const st = lay.status, fs = L.FS, pad = L.pad, B = this.B, n = B.party.length;
    UI.win(g, st.x, st.y, st.w, st.h);
    const cols = lay.wide ? 1 : 2, rows = lay.wide ? 4 : 2;
    const cw = (st.w - pad * 1.6) / cols, rh = (st.h - pad * 1.2) / rows;
    B.party.forEach((m, i) => {
      const c = lay.wide ? 0 : i % 2, r = lay.wide ? i : (i / 2) | 0;
      const x = st.x + pad * 0.8 + c * cw, y = st.y + pad * 0.6 + r * rh, s = Party.stats(m), hp = Math.round(m.vhpD ?? m.hp);
      if (this.actor === m) { g.fillStyle = 'rgba(255,215,106,.16)'; rr(g, x, y + rh * 0.05, cw - pad * 0.3, rh * 0.9, fs * 0.25); g.fill(); g.strokeStyle = 'rgba(255,215,106,.6)'; g.lineWidth = Math.max(1, fs * 0.06); g.stroke(); }
      const sm = fs * (cw < fs * 9 ? 0.82 : 0.9);
      const nameCol = m.hp <= 0 ? '#ff7a8a' : m.st.poison ? '#c08aff' : hp < s.mhp / 4 ? '#ffb070' : '#fff';
      const tag = m.hp <= 0 ? '倒下' : (m.b && m.b.sleep) ? '睡眠' : m.st.poison ? '中毒' : (m.b && m.b.seal) ? '封印' : 'Lv' + m.lv;
      if (lay.wide) {
        const nw = cw * 0.33, bw = (cw - nw - pad) / 2 - pad * 0.6, cy = y + rh / 2;
        UI.text(g, Party.name(m), x + pad * 0.5, cy - sm * 0.1, nameCol, sm, 'left', 'middle', 700);
        UI.text(g, tag, x + nw, cy - sm * 0.05, tag.startsWith('Lv') ? '#9aa6d8' : '#ffb0c0', sm * 0.75, 'right', 'middle');
        this.gauge(g, x + nw + pad * 0.8, cy, bw, 'HP', hp, s.mhp, sm, hp < s.mhp / 4 ? ['#ff8a5a', '#d8402a'] : ['#7aff9a', '#2aa850']);
        this.gauge(g, x + nw + pad * 1.6 + bw, cy, bw * 0.85, 'MP', m.mp, s.mmp, sm, ['#8ac8ff', '#3a6ad8']);
      } else {
        UI.text(g, Party.name(m), x + pad * 0.5, y + rh * 0.24, nameCol, sm, 'left', 'middle', 700);
        g.font = `700 ${sm}px ${FONT}`; const nwid = g.measureText(Party.name(m)).width;
        UI.text(g, tag, x + pad * 0.9 + nwid, y + rh * 0.26, tag.startsWith('Lv') ? '#9aa6d8' : '#ffb0c0', sm * 0.7, 'left', 'middle');
        const gw = cw - pad * 1.4;
        this.gauge(g, x + pad * 0.5, y + rh * 0.53, gw, 'HP', hp, s.mhp, sm * 0.9, hp < s.mhp / 4 ? ['#ff8a5a', '#d8402a'] : ['#7aff9a', '#2aa850']);
        this.gauge(g, x + pad * 0.5, y + rh * 0.84, gw, 'MP', m.mp, s.mmp, sm * 0.9, ['#8ac8ff', '#3a6ad8']);
      }
      if (this.selectingAlly && (this.allyList || []).includes(m)) UI.hit(x, y, cw, rh, () => { const k = this.allyList.indexOf(m); if (this.ref.pick) this.ref.pick(k); });
    });
  },
  gauge(g, x, cy, w, lab, v, max, sm, cols) {
    const fs = L.FS, bh = Math.max(3, fs * 0.22);
    UI.text(g, lab, x, cy - sm * 0.35, '#9aa6d8', sm * 0.62, 'left', 'middle', 700);
    UI.text(g, String(v), x + w, cy - sm * 0.42, '#fff', sm * 0.92, 'right', 'middle', 700);
    const by = cy + sm * 0.32;
    g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, x, by, w, bh, bh / 2); g.fill();
    const k = clamp(v / Math.max(1, max), 0, 1);
    if (k > 0) { const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); g.fillStyle = gr; rr(g, x, by, Math.max(bh, w * k), bh, bh / 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + bh / 2, by + 1, Math.max(0, w * k - bh), Math.max(1, bh * 0.25)); }
  },
  drawVictory(g, lay) {
    const v = this.victory, fs = L.FS, pad = L.pad, st = lay.stage;
    const k = Math.min(1, v.t * 3);
    v.t += 1 / 60;
    const w = Math.min(st.w - pad * 2, fs * 20), h = fs * (5.2 + v.rows.length * 1.45), x = st.x + (st.w - w) / 2, y = st.y + Math.max(pad, st.h * 0.12);
    g.globalAlpha = k;
    UI.win(g, x, y, w, h, { glow: 1 });
    UI.banner(g, '勝　利', x + w / 2, y, fs * 1.1);
    let yy = y + fs * 2.2;
    const cnt = (n, d) => Math.round(n * clamp((v.t - d) * 1.6, 0, 1));
    UI.text(g, '經驗值', x + pad * 2, yy, '#9aa6d8', fs * 0.95); UI.text(g, '+' + cnt(v.exp, 0.3).toLocaleString(), x + w - pad * 2, yy, '#bfe8ff', fs * 1.05, 'right', 'top', 900); yy += fs * 1.5;
    UI.text(g, '金幣', x + pad * 2, yy, '#9aa6d8', fs * 0.95); UI.text(g, '+' + cnt(v.gold, 0.45).toLocaleString() + ' G', x + w - pad * 2, yy, '#ffe9a8', fs * 1.05, 'right', 'top', 900); yy += fs * 1.6;
    for (const r of v.rows) { if (v.t > r.d) UI.text(g, r.text, x + pad * 2, yy, r.col || '#fff', fs * 0.9, 'left', 'top', r.bold ? 900 : 500); yy += fs * 1.45; }
    g.globalAlpha = 1;
  },
};

// ───── 戰鬥流程 ─────
async function runBattle(ids, o = {}) {
  const B = Battle.create(ids, o);
  const S = BScene;
  S.B = B; S.lines = []; S.nums = []; S.sel = null; S.actor = null; S.auto = !!window.__autoBattle; S.selecting = false; S.selectingAlly = false;
  S.hs = new Map(); S.victory = null; S.intro = o.boss ? 1 : 0.5; S.shake = 0; S.flashA = 0; S.zoom = 0; BFX.reset();
  for (const m of B.party) { m.vhp = m.hp; m.vhpD = m.hp; }
  if (typeof Extra !== "undefined") Extra.seen(B);
  Game.scene = 'battle'; document.body.classList.add('inbattle');
  const prevMusic = Music.name;
  Music.play(o.music || (o.boss ? 'boss' : 'battle'), true);
  S.placeEnemies();
  for (const e of B.enemies) e.fx.appear = 1;
  // 出場訊息
  const names = {}; for (const e of B.enemies) names[e.m.name] = (names[e.m.name] || 0) + 1;
  for (const n in names) S.say(names[n] > 1 ? `${n}等 ${names[n]} 隻出現了！` : `${n}出現了！`);
  await S.waitMs(700);
  let first = o.boss ? null : (Math.random() < 1 / 14 ? 'p' : Math.random() < 1 / 22 ? 'e' : null);
  if (first === 'p') { S.say('敵人還沒有發現我們！'); await S.waitMs(600); }
  if (first === 'e') { S.say('敵人突然發動攻擊！'); await S.waitMs(600); }
  let result = null;
  while (!B.over) {
    B.round++;
    let acts = [];
    if (first !== 'e') {
      const r = await chooseCommands(B);
      if (r.run) { S.clear(); await S.play(Battle.tryRun(B)); if (B.over) break; acts = []; first = 'e'; }
      else acts = r.acts;
    }
    S.actor = null;
    let order = Battle.order(B, acts);
    if (first === 'p') order = order.filter(x => x.side === 'p');
    if (first === 'e') order = order.filter(x => x.side === 'e');
    first = null;
    for (const ent of order) {
      if (B.over) break;
      if (ent.side === 'p' && ent.who.hp <= 0) continue;
      if (ent.side === 'e' && !ent.who.alive) continue;
      S.clear();
      const ev = Battle.act(B, ent);
      await S.play(ev);
      await S.waitMs(220);
    }
    if (!B.over) { const ev = Battle.endRound(B); if (ev.length) { S.clear(); await S.play(ev); } }
  }
  S.actor = null;
  result = B.over;
  if (result === 'win') {
    const rw = Battle.rewards(B);
    S.clear();
    if (typeof Extra !== "undefined") Extra.won(B, rw);
    if (!o.noFanfare) Music.jingle('victory', null);
    S.say(o.winText || '打倒了所有的敵人！');
    const alive = Battle.liveP(B);
    await S.waitMs(450);
    G.gold += rw.gold;
    for (const it of rw.drops) Bag.add(it);
    let lvMsgs = [];
    const before = alive.map(m => m.lv);
    for (const m of alive) lvMsgs = lvMsgs.concat(Party.gainExp(m, rw.exp).map(x => Object.assign(x, { m })));
    const rows = [];
    let d = 0.7;
    for (const it of rw.drops) { rows.push({ text: `得到了 ${itemInfo(it).name}！`, col: '#bfe8ff', d }); d += 0.15; }
    for (const lm of lvMsgs) { rows.push({ text: lm.gains ? `${lm.text}` : lm.text, col: lm.gains ? '#ffe070' : '#9affc0', bold: !!lm.gains, d }); d += 0.15; }
    S.victory = { t: 0, exp: rw.exp, gold: rw.gold, rows };
    alive.forEach((m, i) => { if (m.lv > before[i]) { const p = S.heroPos(m); BFX.P({ x: p.cx, y: p.y - p.h * 0.9, vy: -18 * BFX.u / 4, life: 1.6, size: 1.5, col: '#ffe070', shape: 'text', txt: 'LEVEL UP!' }); BFX.burst(p.cx, p.y - p.h * 0.5, 20, ['#ffe070', '#ffffff'], { sp: 90, life: 0.8, shape: 'star' }); } });
    for (const m of B.party) m.vhp = m.hp;
    if (lvMsgs.length) setTimeout(() => Music.jingle('levelup', null), 1300);
    await S.waitMs(700);
    await waitOk();
    if (lvMsgs.some(x => x.gains)) {
      for (const lm of lvMsgs.filter(x => x.gains)) { S.clear(); S.say(lm.text); S.say(lm.gains); }
    }
    S.victory = null;
    G.battles++;
  } else if (result === 'lose') {
    S.clear(); Music.jingle('gameover', null);
    S.say('大家都倒下了……'); await S.waitMs(900); S.say('眼前一片漆黑……'); await waitOk();
  } else { await S.waitMs(300); }
  for (const m of B.party) { delete m.b; delete m.vhp; delete m.vhpD; }
  S.B = null; BFX.reset();
  Game.scene = 'field'; document.body.classList.remove('inbattle');
  if (result !== 'lose' && !o.keepMusic) Music.play(prevMusic || Field.musicName(), true);
  return result;
}
function waitOk() {
  return new Promise(res => {
    const lay = { modal: true, update() { if (Input.pressed.ok || Input.pressed.cancel || lay.tap) { UI.remove(lay); res(); } }, draw() { UI.hit(L.V.x, L.V.y, L.V.w, L.V.h, () => { lay.tap = true; }); } };
    if (window.__autoBattle || window.__autoMsg) { setTimeout(res, 30); return; }
    UI.push(lay);
  });
}
async function chooseCommands(B) {
  const S = BScene, acts = [];
  const actable = B.party.map((m, i) => Battle.canAct(m) ? i : -1).filter(i => i >= 0);
  let k = 0;
  while (k < actable.length) {
    const i = actable[k], m = B.party[i];
    if (S.auto || window.__autoBattle) {
      if (!window.__autoBattle && Input.held.cancel) { S.auto = false; continue; }
      acts[i] = Battle.auto(B, m); k++; continue;
    }
    S.actor = m; S.clear();
    const r = await commandMenu(B, m, k > 0);
    if (r === 'back') { k = Math.max(0, k - 1); continue; }
    if (r === 'stay') continue;
    if (r.type === 'run') return { run: true };
    if (r.type === 'auto') { S.auto = true; acts[i] = Battle.auto(B, m); k++; continue; }
    acts[i] = r; k++;
  }
  S.actor = null;
  return { acts };
}
async function commandMenu(B, m, canBack) {
  const S = BScene, fs = L.FS, pad = L.pad;
  const lay = S.layout();
  const C = CHARS[m.id];
  const items = [{ t: '攻擊' }, { t: C.magic }, { t: '道具' }, { t: '防禦' }, { t: '逃跑', dis: B.noRun }, { t: '自動' }];
  if (!Party.spells(m).filter(s => !SPELLS[s].nobattle).length) items[1].dis = true;
  const pos = () => ({ x: lay.msg.x, y: lay.msg.y });
  S.cmdIndex = S.cmdIndex || {};
  const sel = await UI.menu({ items, pos, title: Party.name(m), cols: 2, index: S.cmdIndex[m.id] || 0, keep: true, keepCursor: true, allowDis: false });
  if (sel < 0) { UI.clearGhosts(); return canBack ? 'back' : 'stay'; }
  S.cmdIndex[m.id] = sel;
  const ret = async () => {
    const cmd = items[sel].t;
    if (cmd === '攻擊') { const t = await pickEnemy(B); return t ? { type: 'attack', target: t } : null; }
    if (cmd === '防禦') return { type: 'defend' };
    if (cmd === '逃跑') return { type: 'run' };
    if (cmd === '自動') return { type: 'auto' };
    if (cmd === C.magic) {
      const list = Party.spells(m).filter(s => !SPELLS[s].nobattle);
      const its = list.map(s => ({ t: SPELLS[s].name, r: String(SPELLS[s].mp), dis: SPELLS[s].mp > m.mp }));
      let desc = '';
      const pl = UI.panel(g => { if (!desc) return; const w = Math.min(L.V.w - pad * 2, fs * 24), h = fs * 2.2, x = L.V.x + L.V.w - w - pad, y = lay.area.y + pad * 0.3; UI.win(g, x, y, w, h, { alpha: 0.9 }); UI.text(g, desc, x + pad, y + h / 2, '#dfe6ff', fs * 0.85, 'left', 'middle'); });
      const si = await UI.menu({ items: its, title: `${C.magic}（MP ${m.mp}）`, cols: list.length > 4 && L.V.w > fs * 22 ? 2 : 1, pos: () => ({ right: lay.msg.x + lay.msg.w, y: lay.msg.y }), onMove: i => { desc = SPELLS[list[i]].desc; } });
      UI.remove(pl);
      if (si < 0) return null;
      const sid = list[si], sp = SPELLS[sid];
      if (sp.tgt === 'enemy') { const t = await pickEnemy(B); return t ? { type: 'spell', id: sid, target: t } : null; }
      if (sp.tgt === 'ally') { const t = await pickAlly(B, false); return t ? { type: 'spell', id: sid, target: t } : null; }
      if (sp.tgt === 'dead') { const t = await pickAlly(B, true); return t ? { type: 'spell', id: sid, target: t } : null; }
      return { type: 'spell', id: sid };
    }
    if (cmd === '道具') {
      const list = Bag.list(id => ITEMS[id] && ITEMS[id].kind !== 'key' && !ITEMS[id].nobattle);
      if (!list.length) { S.say('沒有可以使用的道具。'); await S.waitMs(500); return null; }
      const ii = await UI.menu({ items: list.map(id => ({ t: ITEMS[id].name, r: '×' + Bag.count(id) })), title: '道具', pos: () => ({ right: lay.msg.x + lay.msg.w, y: lay.msg.y }) });
      if (ii < 0) return null;
      const id = list[ii], it = ITEMS[id];
      if (it.tgt === 'ally') { const t = await pickAlly(B, false, true); return t ? { type: 'item', id, target: t } : null; }
      if (it.tgt === 'dead') { const t = await pickAlly(B, true); return t ? { type: 'item', id, target: t } : null; }
      return { type: 'item', id };
    }
    return null;
  };
  const r = await ret();
  UI.clearGhosts();
  return r || 'stay';
}
async function pickEnemy(B) {
  const S = BScene, list = Battle.liveE(B);
  S.selList = list; S.selecting = true; S.ref = {};
  const lay = S.layout();
  const i = await UI.menu({ items: list.map(e => ({ t: e.name })), title: '攻擊目標', ref: S.ref, onMove: k => { S.sel = list[k]; }, pos: () => ({ right: lay.msg.x + lay.msg.w, y: lay.msg.y }) });
  S.sel = null; S.selecting = false;
  return i < 0 ? null : list[i];
}
async function pickAlly(B, dead, any) {
  const S = BScene, list = B.party.filter(m => dead ? m.hp <= 0 : (any ? true : m.hp > 0));
  if (!list.length) { S.say(dead ? '沒有倒下的夥伴。' : '沒有目標。'); await S.waitMs(400); return null; }
  S.allyList = list; S.selectingAlly = true; S.ref = {};
  const lay = S.layout();
  const i = await UI.menu({ items: list.map(m => ({ t: Party.name(m), r: m.hp + '/' + Party.stats(m).mhp })), title: '對誰使用？', ref: S.ref, onMove: k => { S.actorHint = list[k]; }, pos: () => ({ right: lay.msg.x + lay.msg.w, y: lay.msg.y }) });
  S.selectingAlly = false;
  return i < 0 ? null : list[i];
}
