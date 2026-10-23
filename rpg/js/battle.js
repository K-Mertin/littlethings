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
        ev.push({ t: 'msg', text: `${nm}的攻擊！` }, { t: 'anim', kind: 'slash', target: e, sfx: 'attack' });
        this.physHit(B, ps, e, 1, ev, { canCrit: true, acc: 0.97 });
        break;
      }
      case 'defend': m.b.defend = true; ev.push({ t: 'msg', text: `${nm}擺好架勢防禦。` }); break;
      case 'spell': this.castSpell(B, m, a.id, a.target, ev); break;
      case 'item': this.useItem(B, m, a.id, a.target, ev); break;
    }
  },
  physHit(B, ps, e, mult, ev, o = {}) {
    const es = this.estat(e);
    const missP = clamp(0.02 + (es.agi - ps.agi) / 500, 0.01, 0.12) + (1 - (o.acc || 1));
    if (Math.random() < missP) { ev.push({ t: 'msg', text: `但是${e.name}躲開了！`, sfx: 'miss' }); return; }
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
    ev.push({ t: 'msg', text: isSkill ? `${nm}使出了「${sp.name}」！` : `${nm}詠唱了「${sp.name}」！` });
    const targetsE = sp.tgt === 'enemies' ? this.liveE(B) : sp.tgt === 'enemy' ? [this.pickTargetE(B, target)].filter(Boolean) : [];
    switch (sp.kind) {
      case 'dmg': {
        const anim = { fire: 'fire', ice: 'ice', thunder: 'bolt', holy: 'holy', none: 'meteor' }[sp.el];
        ev.push({ t: 'anim', kind: anim, target: sp.tgt === 'enemies' ? 'enemies' : targetsE[0], sfx: { fire: 'fire', ice: 'ice', thunder: 'thunder', holy: 'holy', none: 'thunder' }[sp.el] });
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
    ev.push({ t: 'msg', text: `${nm}使用了${it.name}！` });
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
      if (Math.random() < clamp(0.03 + (vs.agi - es.agi) / 450, 0.01, 0.1)) { ev.push({ t: 'msg', text: `${Party.name(v)}閃開了！`, sfx: 'miss' }); return; }
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
        ev.push({ t: 'msg', text: `${e.name}${nm}` }, { t: 'lunge', e }, { t: 'anim', kind: 'breath', el, target: 'party', sfx: el === 'wind' || el === 'sand' ? 'wind' : 'breath' });
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
        ev.push({ t: 'anim', kind: sp.anim + 'P', target: sp.tgt === 'all' ? 'party' : tg[0], sfx: { fire: 'fire', ice: 'ice', bolt: 'thunder', dark: 'breath' }[sp.anim] });
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
        ev.push({ t: 'msg', text: `${e.name}發出震耳欲聾的咆哮！` }, { t: 'anim', kind: 'roar', target: 'party', sfx: 'roar' });
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

// ───── 戰鬥畫面 ─────
const BScene = {
  B: null, lines: [], fx: [], nums: [], shake: 0, t: 0, sel: null, actor: null, auto: false, pflash: new Map(), ref: {},
  layout() {
    const V = L.V, fs = L.FS, pad = L.pad;
    const sh = fs * 3.9;
    const status = { x: V.x + pad, y: V.y + pad, w: V.w - pad * 2, h: sh };
    let mh = fs * 1.5 * 4 + pad * 1.8;
    const top = status.y + sh + pad * 0.6, aw = V.w - pad * 2;
    let ah = V.y + V.h - mh - pad - top - pad * 0.6;
    const cap = aw * 0.78;
    if (ah > cap) { mh += ah - cap; ah = cap; }
    const msg = { x: V.x + pad, y: V.y + V.h - mh - pad, w: V.w - pad * 2, h: mh };
    const area = { x: V.x + pad, y: top, w: aw, h: ah };
    return { status, msg, area };
  },
  placeEnemies() {
    const B = this.B, lay = this.layout(), a = lay.area, list = B.enemies.filter(e => e.vis || e.fx.die > 0);
    if (!list.length) return;
    const arts = list.map(e => MonArt.get(e.m));
    const hasBoss = list.some(e => e.m.boss);
    let s = Math.min(a.h * (hasBoss ? 0.86 : 0.62) / (hasBoss ? 84 : 48), L.k * 1.5);
    const gap = L.FS * 0.4;
    const tw = arts.reduce((t, r) => t + r.w, 0);
    s = Math.min(s, (a.w * 0.96 - gap * (list.length - 1)) / tw);
    s = Math.max(0.5, Math.floor(s * 4) / 4);
    let x = a.x + (a.w - (tw * s + gap * (list.length - 1))) / 2;
    const base = a.y + a.h * 0.93;
    list.forEach((e, i) => { const r = arts[i]; e.px = x; e.pw = r.w * s; e.ph = r.h * s; e.py = base - e.ph; e.cx = x + e.pw / 2; e.cy = e.py + e.ph * 0.5; x += r.w * s + gap; });
  },
  memberBox(m) {
    const lay = this.layout(), st = lay.status, n = this.B.party.length, gap = L.pad * 0.6, w = Math.min(L.FS * 9, (st.w - gap * (n - 1)) / n), i = this.B.party.indexOf(m);
    const x0 = st.x + (st.w - (w * n + gap * (n - 1))) / 2;
    return { x: x0 + i * (w + gap), y: st.y, w, h: st.h };
  },
  say(text) { this.lines.push(text); if (this.lines.length > 4) this.lines.shift(); },
  clear() { this.lines = []; },
  waitMs(base) { return sleep(base * [1.45, 1, 0.55][Store.data.textSpeed ?? 1]); },
  fxAt(target) {
    if (target === 'enemies') return this.B.enemies.filter(e => e.vis || e.fx.die > 0).map(e => ({ x: e.cx, y: e.cy, w: e.pw, h: e.ph }));
    if (target === 'party') return this.B.party.map(m => { const b = this.memberBox(m); return { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h, p: true }; });
    if (!target) return [];
    if (target.m && target.mhp !== undefined) return [{ x: target.cx, y: target.cy, w: target.pw, h: target.ph }];
    const b = this.memberBox(target); return [{ x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h, p: true }];
  },
  async play(evs) {
    for (const ev of evs) {
      if (ev.sfx && ev.t !== 'anim') Snd.play(ev.sfx);
      switch (ev.t) {
        case 'msg': this.say(ev.text); await this.waitMs(ev.text.length > 14 ? 520 : 430); break;
        case 'anim': {
          if (ev.sfx) Snd.play(ev.sfx);
          const dur = { slash: 0.3, crit: 0.45, smash: 0.4, whirl: 0.5, fire: 0.6, ice: 0.6, bolt: 0.55, holy: 0.7, meteor: 0.9, heal: 0.6, buff: 0.5, debuff: 0.5, sleep: 0.5, seal: 0.5, claw: 0.3, poison: 0.5, breath: 0.8, healE: 0.5, buffE: 0.5, roar: 0.6 }[ev.kind] || 0.55;
          const pos = this.fxAt(ev.target);
          for (const p of pos) this.fx.push({ kind: ev.kind, el: ev.el, x: p.x, y: p.y, w: p.w, h: p.h, p: p.p, t: 0, dur });
          if (ev.kind === 'breath' || ev.kind.endsWith('P') || ev.kind === 'roar') this.fx.push({ kind: 'screen', el: ev.el || ev.kind, t: 0, dur });
          if (ev.kind === 'claw' || ev.kind === 'breath' || ev.kind === 'roar' || (ev.kind.endsWith('P') && ev.kind !== 'sleepP' && ev.kind !== 'sealP')) this.shake = 0.3;
          await sleep(dur * 1000 * 0.85);
          break;
        }
        case 'dmgE': ev.e.fx.flash = 0.35; ev.e.fx.shake = 0.3; Snd.play(ev.crit ? 'crit' : 'hit'); if (ev.n > 0 || true) this.nums.push({ text: String(ev.n), x: ev.e.cx, y: ev.e.py + ev.e.ph * 0.3, t: 0, col: ev.crit ? '#ffe040' : '#ffffff' }); await sleep(140); break;
        case 'dmgP': ev.m.vhp = ev.hp; this.pflash.set(ev.m, 0.5); { const b = this.memberBox(ev.m); this.nums.push({ text: String(ev.n), x: b.x + b.w / 2, y: b.y + b.h * 0.6, t: 0, col: '#ff7a5a' }); } await sleep(120); break;
        case 'healP': ev.m.vhp = ev.hp; { const b = this.memberBox(ev.m); this.nums.push({ text: '+' + ev.n, x: b.x + b.w / 2, y: b.y + b.h * 0.6, t: 0, col: '#7dffb0' }); } break;
        case 'mp': break;
        case 'die': ev.e.fx.die = 1; ev.e.vis = false; Snd.play('kill'); await sleep(420); break;
        case 'flee': ev.e.fx.die = 1; ev.e.fx.flee = true; ev.e.vis = false; await sleep(300); break;
        case 'pdie': Snd.play('phit'); await sleep(250); break;
        case 'add': ev.e.vis = true; this.placeEnemies(); ev.e.fx.appear = 1; await sleep(350); break;
        case 'lunge': ev.e.fx.lunge = 0.3; await sleep(180); break;
      }
    }
  },
  update(dt) {
    this.t += dt;
    if (!this.B) return;
    for (const e of this.B.enemies) {
      const f = e.fx;
      f.flash = Math.max(0, f.flash - dt); f.shake = Math.max(0, f.shake - dt); f.lunge = Math.max(0, f.lunge - dt);
      if (f.die > 0) f.die = Math.max(0, f.die - dt * 2.2);
      if (f.appear > 0) f.appear = Math.max(0, f.appear - dt * 2);
    }
    this.fx = this.fx.filter(f => (f.t += dt) < f.dur);
    this.nums = this.nums.filter(n => (n.t += dt) < 1.1);
    this.shake = Math.max(0, this.shake - dt);
    for (const [m, v] of this.pflash) { if (v - dt <= 0) this.pflash.delete(m); else this.pflash.set(m, v - dt); }
  },
  draw(g) {
    const B = this.B; if (!B) return;
    const lay = this.layout(), V = L.V, fs = L.FS, pad = L.pad;
    g.save();
    if (this.shake > 0) g.translate(Math.sin(this.t * 90) * fs * 0.25 * (this.shake / 0.3), Math.cos(this.t * 70) * fs * 0.12);
    g.fillStyle = '#05060f'; g.fillRect(V.x - 20, V.y - 20, V.w + 40, V.h + 40);
    // 背景
    const a = lay.area, bg = BattleBG.get(B.bg);
    g.save(); rr(g, a.x, a.y, a.w, a.h, fs * 0.4); g.clip();
    const sc = Math.max(a.w / bg.width, a.h / bg.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(bg, a.x + (a.w - bg.width * sc) / 2, a.y + a.h - bg.height * sc, bg.width * sc, bg.height * sc);
    const vg = g.createRadialGradient(a.x + a.w / 2, a.y + a.h / 2, a.h * 0.3, a.x + a.w / 2, a.y + a.h / 2, a.w * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(a.x, a.y, a.w, a.h);
    // 怪物
    this.placeEnemies();
    for (const e of B.enemies) {
      if (!e.vis && e.fx.die <= 0) continue;
      const art = MonArt.get(e.m), f = e.fx;
      let x = e.px, y = e.py, w = e.pw, h = e.ph;
      if (f.shake > 0) x += Math.sin(f.shake * 80) * fs * 0.3;
      if (f.lunge > 0) { const k = Math.sin(f.lunge / 0.3 * Math.PI) * 0.08; x -= w * k / 2; y -= h * k; w *= 1 + k; h *= 1 + k; }
      // 影子
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(e.cx, e.py + e.ph * 0.98, e.pw * 0.38, e.pw * 0.07, 0, 0, TAU); g.fill();
      g.save();
      if (!e.vis) {
        g.globalAlpha = f.die;
        if (f.flee) x += (1 - f.die) * w * 0.8;
        else { const cut = (1 - f.die) * h; g.beginPath(); g.rect(x - w, y + cut * 0.0, w * 3, h - cut); g.clip(); y += cut * 0.3; }
      }
      if (f.appear > 0) g.globalAlpha = 1 - f.appear;
      if (e.sleep) g.filter = 'saturate(.5) brightness(.85)';
      const blink = f.flash > 0 && Math.floor(f.flash * 30) % 2 === 0;
      g.drawImage(blink ? art.white : art.img, x, y, w, h);
      if (!e.vis && f.die > 0 && !f.flee) { g.globalAlpha = f.die * 0.6; g.drawImage(art.red, x, y, w, h); }
      g.restore();
      if (e.sleep && e.alive) UI.text(g, 'Zz', e.px + e.pw * 0.8, e.py + Math.sin(this.t * 3) * fs * 0.2, '#cfe6ff', fs, 'left', 'top', 700);
      if (this.sel === e && e.alive && Math.sin(this.t * 10) > -0.4) {
        g.fillStyle = '#fff'; const cx = e.cx, cy = e.py - fs * 0.2;
        g.beginPath(); g.moveTo(cx - fs * 0.5, cy - fs * 0.7); g.lineTo(cx + fs * 0.5, cy - fs * 0.7); g.lineTo(cx, cy); g.fill();
      }
      if (this.selecting && e.alive) UI.hit(e.px, e.py, e.pw, e.ph, () => { const i = this.selList.indexOf(e); if (i >= 0 && this.ref.pick) this.ref.pick(i); });
    }
    // 特效（在怪物上）
    for (const f of this.fx) if (!f.p && f.kind !== 'screen') drawFx(g, f, fs);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = Math.max(1, fs * 0.08); rr(g, a.x, a.y, a.w, a.h, fs * 0.4); g.stroke();
    // 隊伍狀態
    for (const m of B.party) {
      const b = this.memberBox(m), s = Party.stats(m), hp = m.vhp ?? m.hp;
      const act = this.actor === m;
      UI.win(g, b.x, b.y - (act ? fs * 0.25 : 0), b.w, b.h, { border: act ? '#ffd76a' : (m.hp <= 0 ? '#8a6a7a' : hp < s.mhp / 4 ? '#ff9a6a' : '#f4f2ff'), bg: this.pflash.has(m) ? '#5a1020' : '#0b1030' });
      const by = b.y - (act ? fs * 0.25 : 0), ix = b.x + pad * 0.9, iw = b.w - pad * 1.8;
      const sm = fs * (b.w < fs * 6 ? 0.78 : 0.88);
      const nameCol = m.hp <= 0 ? '#ff7a8a' : m.st.poison ? '#c08aff' : hp < s.mhp / 4 ? '#ffb070' : '#fff';
      UI.text(g, Party.name(m), ix, by + pad * 0.7, nameCol, sm, 'left', 'top', 700);
      const tag = m.hp <= 0 ? '倒下' : (m.b && m.b.sleep) ? '睡眠' : m.st.poison ? '中毒' : (m.b && m.b.seal) ? '封印' : 'Lv' + m.lv;
      UI.text(g, tag, ix + iw, by + pad * 0.75, tag.startsWith('Lv') ? '#9aa6d8' : '#ffb0c0', sm * 0.82, 'right', 'top');
      const r1 = by + pad * 0.7 + sm * 1.35;
      UI.text(g, 'HP', ix, r1, '#9aa6d8', sm * 0.78, 'left', 'top', 700);
      UI.text(g, String(hp), ix + iw, r1 - sm * 0.05, '#fff', sm, 'right', 'top', 700);
      bar(g, ix, r1 + sm * 1.05, iw, Math.max(2, fs * 0.13), hp / s.mhp, hp < s.mhp / 4 ? '#ff7a4a' : '#5ae07a');
      const r2 = r1 + sm * 1.3;
      UI.text(g, 'MP', ix, r2, '#9aa6d8', sm * 0.78, 'left', 'top', 700);
      UI.text(g, String(m.mp), ix + iw, r2 - sm * 0.05, '#cfe0ff', sm, 'right', 'top', 700);
      if (this.selectingAlly && (this.allyList || []).includes(m)) UI.hit(b.x, b.y, b.w, b.h, () => { const i = this.allyList.indexOf(m); if (this.ref.pick) this.ref.pick(i); });
    }
    for (const f of this.fx) if (f.p) drawFx(g, f, fs);
    for (const f of this.fx) if (f.kind === 'screen') drawScreenFx(g, f, V);
    // 訊息
    const ms = lay.msg;
    UI.win(g, ms.x, ms.y, ms.w, ms.h);
    this.lines.forEach((ln, i) => UI.text(g, ln, ms.x + pad * 1.4, ms.y + pad * 0.9 + i * fs * 1.5, '#fff', fs));
    if (this.auto) UI.text(g, '自動戰鬥中（按 B 取消）', ms.x + ms.w - pad, ms.y - fs * 1.2, '#ffd76a', fs * 0.8, 'right', 'top', 700);
    // 傷害數字
    for (const n of this.nums) {
      const k = n.t / 1.1, y = n.y - Math.sin(Math.min(1, n.t * 4) * Math.PI / 2) * fs * 1.2;
      g.globalAlpha = 1 - Math.max(0, k - 0.7) / 0.3;
      g.font = `900 ${fs * 1.35}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = fs * 0.2; g.strokeStyle = '#140a1e'; g.strokeText(n.text, n.x, y); g.fillStyle = n.col; g.fillText(n.text, n.x, y);
      g.globalAlpha = 1;
    }
    g.restore();
  },
};

// 特效繪製
function drawFx(g, f, fs) {
  const k = f.t / f.dur, x = f.x, y = f.y, s = Math.min(f.w, f.h);
  g.save();
  switch (f.kind) {
    case 'slash': case 'crit': case 'smash': {
      const n = f.kind === 'crit' ? 3 : f.kind === 'smash' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const kk = clamp(k * 1.8 - i * 0.25, 0, 1); if (kk <= 0) continue;
        const ang = -0.8 + i * 0.5, len = s * 0.9;
        g.strokeStyle = f.kind === 'crit' ? '#ffe060' : '#ffffff'; g.lineWidth = fs * (0.35 - kk * 0.25); g.globalAlpha = 1 - kk * 0.6;
        g.beginPath(); const ox = x - Math.cos(ang) * len / 2, oy = y - Math.sin(ang) * len / 2 - s * 0.1 + i * fs * 0.4;
        g.moveTo(ox, oy); g.lineTo(ox + Math.cos(ang) * len * kk, oy + Math.sin(ang) * len * kk); g.stroke();
      }
      if (f.kind === 'crit' && k < 0.3) { g.globalAlpha = 0.5 * (1 - k / 0.3); g.fillStyle = '#fff'; g.fillRect(x - f.w, y - f.h, f.w * 2, f.h * 2); }
      break;
    }
    case 'whirl': { g.strokeStyle = '#fff'; g.lineWidth = fs * 0.25; g.globalAlpha = 1 - k; g.beginPath(); g.arc(x, y, s * 0.45, k * 8, k * 8 + 2.5); g.stroke(); break; }
    case 'claw': {
      g.strokeStyle = '#ff5a5a'; g.lineWidth = fs * 0.18; g.globalAlpha = 1 - k;
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x - fs + i * fs * 0.6, y - fs * 1.1); g.lineTo(x + fs * 0.6 + i * fs * 0.6, y + fs * 0.9 * Math.min(1, k * 3)); g.stroke(); }
      break;
    }
    case 'fire': case 'fireP': {
      const r = seeded(Math.floor(f.x + f.y));
      for (let i = 0; i < 16; i++) { const a = r() * TAU, d = s * 0.45 * k * (0.4 + r()), sz = fs * (0.9 - k * 0.6) * (0.5 + r()); g.fillStyle = i % 3 ? '#ff8a20' : '#ffe060'; g.globalAlpha = 1 - k; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d - k * s * 0.3, sz, 0, TAU); g.fill(); }
      break;
    }
    case 'ice': case 'iceP': {
      g.globalAlpha = 1 - k * 0.7;
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + k, d = s * 0.38 * (1 - k * 0.5); const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, z = Math.max(fs, s * 0.09); g.fillStyle = i % 2 ? '#c8f0ff' : '#ffffff'; g.strokeStyle = '#3a7ac8'; g.lineWidth = Math.max(1, fs * 0.08); g.beginPath(); g.moveTo(px, py - z * 1.1); g.lineTo(px + z * 0.4, py); g.lineTo(px, py + z * 1.1); g.lineTo(px - z * 0.4, py); g.closePath(); g.fill(); g.stroke(); }
      break;
    }
    case 'bolt': case 'boltP': {
      if (Math.floor(k * 10) % 2 === 0) {
        g.strokeStyle = '#fff8a0'; g.lineWidth = fs * 0.3; g.beginPath(); let px = x, py = y - f.h * 1.2; g.moveTo(px, py);
        const r = seeded(Math.floor(k * 6) + 3); while (py < y + f.h * 0.3) { px += (r() - 0.5) * fs * 2; py += fs * 0.9; g.lineTo(px, py); } g.stroke();
        g.globalAlpha = 0.25; g.fillStyle = '#fff8c0'; g.fillRect(x - f.w, y - f.h, f.w * 2, f.h * 2);
      }
      break;
    }
    case 'holy': { g.globalAlpha = Math.sin(k * Math.PI); const gr = g.createLinearGradient(x - s * 0.3, 0, x + s * 0.3, 0); gr.addColorStop(0, 'rgba(255,240,160,0)'); gr.addColorStop(0.5, 'rgba(255,255,230,.95)'); gr.addColorStop(1, 'rgba(255,240,160,0)'); g.fillStyle = gr; g.fillRect(x - s * 0.3, y - f.h, s * 0.6, f.h * 2); for (let i = 0; i < 6; i++) { g.fillStyle = '#fff'; g.fillRect(x + Math.sin(i * 2 + k * 6) * s * 0.4, y + f.h * 0.5 - k * f.h - i * fs * 0.6, fs * 0.25, fs * 0.25); } break; }
    case 'meteor': { for (let i = 0; i < 5; i++) { const kk = clamp(k * 1.6 - i * 0.12, 0, 1); const px = x + (i - 2) * s * 0.2 - (1 - kk) * s, py = y - (1 - kk) * s * 1.5; g.fillStyle = '#ffb040'; g.globalAlpha = kk < 1 ? 1 : 0; g.beginPath(); g.arc(px, py, fs * 0.7, 0, TAU); g.fill(); g.strokeStyle = '#ffe080'; g.lineWidth = fs * 0.3; g.beginPath(); g.moveTo(px, py); g.lineTo(px - s * 0.4, py - s * 0.6); g.stroke(); } break; }
    case 'heal': case 'healE': { for (let i = 0; i < 10; i++) { const px = x + Math.sin(i * 2.4) * f.w * 0.35, py = y + f.h * 0.4 - k * f.h * 0.9 - (i % 3) * fs * 0.4; g.globalAlpha = 1 - k; g.fillStyle = i % 2 ? '#7dffb0' : '#d0ffe0'; g.fillRect(px, py, fs * 0.3, fs * 0.3); g.fillRect(px - fs * 0.15, py + fs * 0.1, fs * 0.6, fs * 0.1); } break; }
    case 'buff': case 'buffE': { g.globalAlpha = 1 - k; g.fillStyle = '#ffd76a'; for (let i = 0; i < 3; i++) { const px = x + (i - 1) * fs * 1.2, py = y + f.h * 0.3 - k * f.h * 0.6; g.beginPath(); g.moveTo(px, py - fs * 0.6); g.lineTo(px + fs * 0.5, py); g.lineTo(px - fs * 0.5, py); g.fill(); g.fillRect(px - fs * 0.18, py, fs * 0.36, fs * 0.5); } break; }
    case 'debuff': case 'seal': case 'sealP': { g.globalAlpha = 1 - k; g.fillStyle = f.kind === 'debuff' ? '#8ab0ff' : '#c08aff'; for (let i = 0; i < 3; i++) { const px = x + (i - 1) * fs * 1.2, py = y - f.h * 0.3 + k * f.h * 0.6; g.beginPath(); g.moveTo(px, py + fs * 0.6); g.lineTo(px + fs * 0.5, py); g.lineTo(px - fs * 0.5, py); g.fill(); g.fillRect(px - fs * 0.18, py - fs * 0.5, fs * 0.36, fs * 0.5); } break; }
    case 'sleep': case 'sleepP': { g.globalAlpha = 1 - k; for (let i = 0; i < 3; i++) UI.text(g, 'z', x + i * fs * 0.6, y - k * fs * 2 - i * fs * 0.6, '#cfe6ff', fs * (0.8 + i * 0.3), 'center', 'middle', 900); break; }
    case 'poison': { g.globalAlpha = 1 - k; for (let i = 0; i < 6; i++) { g.fillStyle = '#b070e0'; g.beginPath(); g.arc(x + Math.sin(i * 3) * f.w * 0.3, y + f.h * 0.3 - k * f.h * 0.6 - i * fs * 0.2, fs * 0.25, 0, TAU); g.fill(); } break; }
    case 'darkP': case 'dark': { g.globalAlpha = (1 - k) * 0.8; g.fillStyle = '#2a0a3a'; g.beginPath(); g.arc(x, y, s * 0.6 * k + fs, 0, TAU); g.fill(); break; }
  }
  g.restore();
}
function drawScreenFx(g, f, V) {
  const k = f.t / f.dur;
  const col = { fire: '255,120,40', ice: '160,220,255', wind: '220,255,240', poison: '160,80,200', sand: '230,190,110', dark: '40,0,60', fireP: '255,120,40', iceP: '160,220,255', boltP: '255,250,180', darkP: '40,0,60', sleepP: '160,180,255', sealP: '190,140,255', roar: '255,255,255', breath: '255,255,255' }[f.el] || '255,255,255';
  g.save();
  g.globalAlpha = Math.sin(k * Math.PI) * 0.4;
  g.fillStyle = `rgb(${col})`; g.fillRect(V.x, V.y, V.w, V.h);
  if (f.el === 'wind' || f.el === 'sand' || f.el === 'ice' || f.el === 'fire' || f.el === 'poison' || f.el === 'dark') {
    g.globalAlpha = Math.sin(k * Math.PI) * 0.7; g.strokeStyle = `rgb(${col})`; g.lineWidth = L.FS * 0.25;
    for (let i = 0; i < 8; i++) { const y = V.y + V.h * (i + 0.5) / 8, x = V.x + V.w * ((k * 1.6 + i * 0.37) % 1.2 - 0.1); g.beginPath(); g.moveTo(x, y); g.lineTo(x + V.w * 0.25, y + Math.sin(i) * L.FS); g.stroke(); }
  }
  g.restore();
}

// ───── 戰鬥流程 ─────
async function runBattle(ids, o = {}) {
  const B = Battle.create(ids, o);
  const S = BScene;
  S.B = B; S.lines = []; S.fx = []; S.nums = []; S.sel = null; S.actor = null; S.auto = !!window.__autoBattle; S.selecting = false;
  for (const m of B.party) m.vhp = m.hp;
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
    if (!o.noFanfare) Music.jingle('victory', null);
    S.say(o.winText || '打倒了所有的敵人！');
    const alive = Battle.liveP(B);
    await S.waitMs(500);
    if (rw.exp) { S.say(`每個人得到了 ${rw.exp} 點經驗值。`); await S.waitMs(500); }
    if (rw.gold) { G.gold += rw.gold; S.say(`得到了 ${rw.gold} 金幣。`); await S.waitMs(500); }
    for (const it of rw.drops) { Bag.add(it); S.say(`怪物掉下了${ITEMS[it].name}！`); await S.waitMs(500); }
    let lvMsgs = [];
    for (const m of alive) lvMsgs = lvMsgs.concat(Party.gainExp(m, rw.exp));
    if (lvMsgs.length) {
      await waitOk();
      Music.jingle('levelup', null);
      for (const lm of lvMsgs) { S.clear(); S.say(lm.text); if (lm.gains) S.say(lm.gains); for (const m of B.party) m.vhp = m.hp; await waitOk(); }
    } else await waitOk();
    G.battles++;
  } else if (result === 'lose') {
    S.clear(); Music.jingle('gameover', null);
    S.say('大家都倒下了……'); await S.waitMs(900); S.say('眼前一片漆黑……'); await waitOk();
  } else { await S.waitMs(300); }
  for (const m of B.party) { delete m.b; delete m.vhp; }
  S.B = null;
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
