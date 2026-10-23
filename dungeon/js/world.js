'use strict';
// 深淵地牢：戰鬥、怪物 AI、回合推進、技能、投擲、魔杖、陷阱、死亡
const hitCh = (acc, eva) => clamp(0.72 + 0.04 * (acc - eva), 0.12, 0.97);
const RANGED_DEATH = { arrow: '射死', bolt: '電死', fire: '燒死', frost: '凍死', void: '吞噬', spore: '毒死' };
const WVERB = { sword: '砍中', dagger: '刺中', spear: '刺中', axe: '劈中', mace: '敲中', staff: '敲中', greatsword: '斬中' };
const fxOn = () => typeof FX !== 'undefined';

Object.assign(Game, {
  mname(m) { return MON[m.k].n; },
  monAcc(m) { return MON[m.k].acc + Math.floor(m.lv * 0.4); },
  monDmg(m) { const D = MON[m.k]; let d = G.rng.int(D.atk[0], D.atk[1]) + Math.floor(m.lv * 0.5); if (m.st.berserk) d = Math.round(d * 1.5); if (m.enraged) d = Math.round(d * 1.2); if (m.elite === 'rage') d = Math.round(d * 1.4); if (G.asc) d = Math.round(d * this.ascMult('mdmg')); return d; },
  unaware(m) { return !m.awake || m.st.sleep > 0 || m.st.para > 0 || m.st.freeze > 0 || G.P.sneakNext > 0 || G.P.st.invis > 0; },
  spellMult() { const P = G.P, w = this.equipped('w'); return (P.cls === 'mage' ? 1.5 : 1) * (P.perks.arcane ? 1.4 : 1) * (w && ITEMS[w.k].magic ? 1.25 : 1) * (G.mod === 'arcane' ? 1.3 : 1); },

  // ---------- 玩家近戰 ----------
  meleeAttack(m, o = {}) {
    const P = G.P, st = this.stats(), D = MON[m.k], w = this.equipped('w'), W = w ? ITEMS[w.k] : null;
    if (fxOn()) { FX.bump(P, m.x - P.x, m.y - P.y); FX.slash(m.x, m.y, m.x - P.x, m.y - P.y, '#ffe8c0', W && (W.spr === 'greatsword' || W.spr === 'axe' || W.sweep)); }
    const sneak = this.unaware(m) && (!D.boss || (P.cls === 'rogue' && (P.st.invis > 0 || P.sneakNext > 0)));
    if (!o.sure && !sneak && !G.rng.chance(hitCh(st.acc, D.eva))) {
      msg('你沒打中' + D.n + '。', 'm'); Snd.play('miss'); if (fxOn()) FX.text(m.x, m.y, 'MISS', '#9aa3b2');
      this.noise(m.x, m.y, 4); return false;
    }
    let dmg = G.rng.int(st.dmin, st.dmax), mult = (o.mult || 1) * st.fury;
    const crit = G.rng.chance(st.crit);
    let tag = '';
    if (sneak) { const sm = (P.cls === 'rogue' ? 3 : 2) + (W && W.spr === 'dagger' ? 1 : 0) + (P.perks.assassin ? 1 : 0); mult *= sm * (this.reson() === 'hunt' ? 1.5 : 1) * (D.boss ? 0.5 : 1); tag = '偷襲！'; }
    if (this.runeOf('w') === 'slayer' && (D.boss || D.undead)) mult *= 1.5 * (this.reson() === 'holy' && D.boss ? 1.2 : 1);
    if (G.mod === 'glass') mult *= 1.5;
    if (crit) { mult *= 1.8; tag += '會心一擊！'; }
    if (P.cls === 'paladin' && D.undead) mult *= 1.5;
    dmg = Math.round(dmg * mult);
    if (!crit) dmg = Math.max(1, dmg - G.rng.int(0, D.arm));
    const verb = W ? (WVERB[W.spr] || '打中') : '揍中';
    msg(tag + '你' + verb + '了' + D.n + '。', crit || sneak ? 'y' : 'n');
    Snd.play(crit || sneak ? 'crit' : 'hit');
    if (P.st.invis || P.sneakNext) { if (P.st.invis) msg('你從暗影中現身。', 'm'); P.st.invis = 0; P.sneakNext = 0; }
    this.damageMon(m, dmg, { melee: 1, crit: crit || sneak });
    if (fxOn()) FX.spark(m.x, m.y, crit || sneak ? '#ffd75a' : '#fff6d0', crit || sneak ? 10 : 6);
    this.weaponProc(m, dmg);
    // 武器特性
    if (W && !o.noSpecial) {
      if (W.sweep) for (const b of this.adjHostiles().filter(x => x !== m && x.hp > 0)) this.damageMon(b, Math.max(1, Math.round(dmg * 0.5)), { melee: 1 });
      if (W.pierce) { const bx = m.x + Math.sign(m.x - P.x), by = m.y + Math.sign(m.y - P.y), b = this.monAt(bx, by); if (b && !MON[b.k].npc) { this.damageMon(b, Math.max(1, Math.round(dmg * 0.6)), { melee: 1 }); msg('長槍刺穿到後面的' + MON[b.k].n + '！', 'n'); } }
      if (W.cleave) { const adj = this.adjHostiles().filter(x => x !== m && x.hp > 0); if (adj.length) { const b = G.rng.pick(adj); this.damageMon(b, Math.max(1, Math.round(dmg * 0.5)), { melee: 1 }); } }
      if (W.stun && m.hp > 0 && G.rng.chance(0.15)) { m.st.stun = 2; msg(D.n + '被打暈了！', 'g'); }
    }
    this.noise(m.x, m.y, 5);
    return true;
  },
  adjHostiles() { const P = G.P, out = []; for (const [dx, dy] of DIRS8) { const m = this.monAt(P.x + dx, P.y + dy); if (m && !MON[m.k].npc) out.push(m); } return out; },
  noise(x, y, r) {
    for (const m of G.F.mons) if (!m.awake && !MON[m.k].npc && cheb(m.x, m.y, x, y) <= r && G.rng.chance(0.25)) { m.awake = true; m.mode = 'hunt'; m.tx = G.P.x; m.ty = G.P.y; }
  },
  damageMon(m, n, o = {}) {
    if (m.hp <= 0) return;
    const D = MON[m.k];
    if (D.npc) return;
    if (m.elite === 'tough') n = Math.max(1, n - 2);
    m.hp -= n; G.stats.dmg += n;
    if (m.disg) this.reveal(m);
    if (fxOn()) { FX.num(m.x, m.y, String(n), o.crit ? '#ffd75a' : '#ffffff', o.crit); FX.flash(m); FX.burst(m.x, m.y, D.undead ? '#d8d0c0' : D.k === 'slime' ? '#5fd06a' : '#ff5a5a', o.crit ? 10 : 5); if (o.crit) FX.shake(4); }
    m.st.sleep = 0;
    if (!m.awake || m.mode !== 'hunt') { m.awake = true; m.mode = 'hunt'; m.tx = G.P.x; m.ty = G.P.y; }
    if (D.invis) m.st.revealed = 3;
    if (m.hp <= 0) { this.killMon(m, o); return; }
    if (D.split && m.hp >= 4 && (m.gen || 0) < 3) {
      const q = this.nearFree(m.x, m.y);
      if (q) { const c = this.makeMon(m.k, q[0], q[1]); c.hp = Math.floor(m.hp / 2); m.hp -= c.hp; c.mhp = m.mhp; c.gen = (m.gen || 0) + 1; m.gen = c.gen; c.awake = true; c.mode = 'hunt'; G.F.mons.push(c); msg(D.n + '分裂了！', 'w'); if (fxOn()) FX.burst(q[0], q[1], '#5fd06a', 8); }
    }
    if (D.berserk && !m.st.berserk && m.hp < m.mhp * 0.5) { m.st.berserk = 999; msg(D.n + '陷入狂暴！', 'w'); Snd.play('roar'); }
    if (D.spores && o.melee && cheb(m.x, m.y, G.P.x, G.P.y) <= 1 && G.rng.chance(0.3)) { G.P.st.conf = Math.max(G.P.st.conf || 0, 3); msg(D.n + '噴出孢子，你頭昏眼花！', 'b'); if (fxOn()) FX.burst(m.x, m.y, '#e0a0ff', 14); }
    if (D.boss && !m.enraged && m.hp < m.mhp * 0.5) { m.enraged = 1; msg(D.final ? '深淵之王發出震天怒吼，黑暗變得更加狂暴！' : D.n + '陷入狂怒！攻擊變得更加猛烈！', 'w'); Snd.play('roar'); if (fxOn()) { FX.shake(10); FX.screen('255,40,90', 0.35); FX.ring(m.x, m.y, 2, '#ff4a8a'); } if (typeof UI !== 'undefined') UI.bossPhase(m); }
  },
  killMon(m, o = {}) {
    const D = MON[m.k], P = G.P;
    m.hp = 0;
    msg((o.melee ? '你打倒了' : '') + this.monName(m) + (o.melee ? '！' : '倒下了。'), 'g');
    Meta.killMon(m.k);
    Snd.play(D.boss ? 'bigdie' : 'mdie');
    if (fxOn()) { FX.die(m); FX.burst(m.x, m.y, D.boss ? '#ffd75a' : D.undead ? '#e8e0d0' : '#ff6a5a', D.boss ? 40 : 14); if (D.boss) { FX.shake(12); FX.screen('255,240,200', 0.5); } FX.corpse(m); }
    G.stats.kills++;
    const xp = Math.round(D.xp * (1 + m.lv * 0.08) * Math.pow(0.5, m.gen || 0) * (m.elite ? 2.5 : 1));
    if (m.elite) {
      G.stats.elites = (G.stats.elites || 0) + 1; Meta.inc('elites'); Meta.event('elite');
      const nd = 1 + (G.boon === 'hunter' ? 1 : 0) + (G.mod === 'elite' && G.rng.chance(0.5) ? 1 : 0);
      for (let i = 0; i < nd; i++) this.dropItem(G.rng.chance(0.6) ? this.goodItem(G.depth) : this.randomItem(G.depth + 2), m.x, m.y);
    }
    if (P.perks.vamp) this.healP(3 + Math.floor(P.lvl / 3));
    if (m.gold) { this.dropItem({ id: G.nid++, k: 'gold', c: 'gold', n: m.gold }, m.x, m.y); }
    else if (!D.boss && m.k !== 'sporeling' && m.k !== 'skeleton' && G.rng.chance(0.1)) this.dropItem(G.rng.chance(0.4) ? this.goldItem(G.depth, 1) : this.randomItem(G.depth), m.x, m.y);
    if (m.k === 'mimic') { for (let i = 0; i < 2; i++) this.dropItem(this.randomItem(G.depth + 2), m.x, m.y); this.dropItem(this.goldItem(G.depth, 2), m.x, m.y); }
    if (D.boss) {
      G.stats.bosses++;
      Meta.event('boss', m.k);
      if ((G.asc || 0) >= (Store.meta.ascMax || 0) && (G.asc || 0) < ASC.length - 1 && !G.daily) { Store.meta.ascMax = (G.asc || 0) + 1; msg('解鎖了深淵等級 ' + Store.meta.ascMax + '！在開新冒險時可以選擇。', 'y'); }
      Store.meta.bossKills = (Store.meta.bossKills || 0) + 1;
      if (!D.final) {
        for (let i = 0; i < 3; i++) { const it = i === 0 ? this.makeItem(G.rng.pick(['p_life', 'p_str', 'p_xheal'])) : this.randomItem(G.depth + 3); if (it.ench < 0) { it.ench = 1; it.cursed = false; } this.dropItem(it, m.x, m.y); }
        this.dropItem(this.goldItem(G.depth, 5), m.x, m.y);
        if (G.F.locked) { G.F.locked = false; msg('樓梯的封印解除了！', 'y'); }
        if (!Store.meta.unlocked.paladin) { Store.meta.unlocked.paladin = true; G.newUnlock = 'paladin'; msg('解鎖了新職業：聖騎士！', 'y'); }
        Store.saveMeta();
      }
      // 召喚出來的小怪一起消失
      for (const o2 of G.F.mons) if (o2.summoner === m.id && o2.hp > 0) { o2.hp = 0; if (fxOn()) FX.burst(o2.x, o2.y, '#b48cff', 8); }
    }
    if (m.trial) this.checkTrial();
    this.gainXp(xp);
    if (D.final) this.win();
  },
  reveal(m) {
    if (!m.disg) return;
    m.disg = 0; m.awake = true; m.mode = 'hunt'; m.tx = G.P.x; m.ty = G.P.y;
    msg(m.k === 'mimic' ? '寶箱突然張開了血盆大口！是寶箱怪！' : '石像突然動了起來！是石像鬼！', 'b');
    Snd.play('roar'); if (fxOn()) { FX.shake(5); FX.flash(m); }
    G.interrupt = true;
  },

  // ---------- 玩家受傷 ----------
  hurtP(n, cause, o = {}) {
    const P = G.P; if (G.over) return;
    P.hp -= n;
    if (fxOn()) { FX.num(P.x, P.y, String(n), '#ff6b6b', n >= P.mhp * 0.2); FX.flash(P); FX.shake(Math.min(9, 2 + n * 0.6)); FX.hurt(Math.min(1, n / P.mhp * 3)); }
    Snd.play('hurt');
    G.interrupt = true;
    G.lastCause = cause;
    if (P.hp <= 0) this.die(cause);
  },
  monMelee(m) {
    const P = G.P, D = MON[m.k], st = this.stats();
    if (fxOn()) FX.bump(m, P.x - m.x, P.y - m.y);
    if (P.st.invis && G.rng.chance(0.5)) { msg(D.n + '朝空氣亂揮了一下。', 'm'); return; }
    if (!G.rng.chance(hitCh(this.monAcc(m), st.eva))) { msg(D.n + '沒打中你。', 'm'); Snd.play('miss'); if (fxOn()) FX.text(P.x, P.y, 'MISS', '#9aa3b2'); return; }
    let dmg = Math.max(1, this.monDmg(m) - G.rng.int(0, st.arm));
    msg(this.monName(m) + D.verb + '了你。', 'b');
    if (fxOn()) FX.slash(P.x, P.y, P.x - m.x, P.y - m.y, '#ff8a7a');
    const cause = '被' + D.n + (D.verb.length > 1 ? D.verb + '致死' : D.verb + '死');
    if (P.perks.thorns) { const r = Math.max(1, Math.round(dmg * 0.4)); this.damageMon(m, r, {}); }
    if (this.runeOf('a') === 'thorn' && m.hp > 0) { const r = Math.max(1, Math.round(dmg * 0.3 * (this.reson() === 'holy' ? 2 : 1))); this.damageMon(m, r, {}); }
    if (m.elite === 'vamp' && m.hp > 0) { m.hp = Math.min(m.mhp, m.hp + Math.ceil(dmg * 0.6)); if (fxOn()) FX.burst(m.x, m.y, '#ff4a8a', 6); }
    if (m.elite === 'flame' && G.rng.chance(0.5)) this.igniteP(this.monName(m));
    this.hurtP(dmg, cause);
    if (G.over) return;
    if (D.poison && !P.perks.resist && G.rng.chance(0.5)) { P.st.poison = (P.st.poison || 0) + D.poison; P.poisonSrc = D.n; msg('你中毒了！', 'b'); }
    if (D.burn && G.rng.chance(0.35)) this.igniteP(D.n);
    if (D.steal && P.gold > 0 && !m.gold) {
      const amt = Math.min(P.gold, G.rng.int(15, 40 + G.depth * 10)); P.gold -= amt; m.gold = amt; m.st.fear = 30; m.fleeT = 0;
      msg(D.n + '偷走了 ' + amt + ' 金幣！', 'b'); Snd.play('gold');
    }
  },
  burnRes() { const a = this.equipped('a'); return (this.runeOf('a') === 'fireward' || (a && ITEMS[a.k].fireRes)) ? 0.5 : 1; },
  igniteP(src) { const P = G.P; if (this.tile(P.x, P.y) === T.WATER || this.reson() === 'blaze') return; if (!P.st.burn) msg('你著火了！', 'b'); P.st.burn = 3 + G.rng.int(0, 2); P.burnSrc = src; },
  lavaBurn(P) { const n = Math.max(1, Math.round(G.rng.int(8, 14) * this.burnRes())); msg('滾燙的岩漿燒傷了你！', 'b'); this.igniteP('岩漿'); this.hurtP(n, '在岩漿中被燒死'); },

  // ---------- 投射物 ----------
  // 從 (x0,y0) 往 (tx,ty) 飛，回傳 { path, hit(生物), end:[x,y] }
  shoot(x0, y0, tx, ty, range, o = {}) {
    const ray = rayTo(x0, y0, tx, ty, range), path = [];
    let hit = null, end = [x0, y0];
    for (const [x, y] of ray) {
      const v = this.tile(x, y);
      if (v === T.WALL || v === T.SECRET || v === T.PILLAR || v === T.CRYSTAL || v === T.DOOR) break;
      path.push([x, y]); end = [x, y];
      const m = this.monAt(x, y);
      if (m && !MON[m.k].npc) { hit = m; break; }
      if (x === G.P.x && y === G.P.y && !o.fromP) { hit = G.P; break; }
      if (o.stopAt && x === tx && y === ty) break;
    }
    return { path, hit, end };
  },

  // ---------- 投擲 ----------
  throwItem(it, tx, ty) {
    if (!this.canAct()) return false;
    const P = G.P, K = ITEMS[it.k];
    if (this.isEquipped(it)) { if (it.cursed) { msg('它被詛咒了，丟不掉！', 'b'); return false; } this.unequip(it, true); }
    const one = Object.assign({}, it, { id: G.nid++, n: 1 });
    this.removeInv(it, 1);
    const r = this.shoot(P.x, P.y, tx, ty, 9, { fromP: 1, stopAt: K.c !== 'potion' });
    Snd.play('throw');
    if (fxOn()) FX.proj(P.x, P.y, r.end[0], r.end[1], K.c === 'potion' ? 'potion' : 'knife', K.c === 'potion' ? POTION_LOOKS[this.look(it.k)][1] : null);
    if (K.c === 'potion') { this.shatter(one, r.end[0], r.end[1], r.hit); this.endTurn(); return true; }
    if (r.hit && r.hit !== P) {
      const m = r.hit, D = MON[m.k], st = this.stats();
      const acc = st.acc + (P.perks.thrower ? 5 : 0) + (P.perks.eye ? 3 : 0) + (P.cls === 'ranger' ? 3 : 0);
      if (this.unaware(m) || G.rng.chance(hitCh(acc, D.eva))) {
        let dmg = K.dmg ? G.rng.int(K.dmg[0], K.dmg[1]) : G.rng.int(1, 2);
        dmg = Math.round(dmg * (P.perks.thrower ? 1.6 : 1) * (P.cls === 'ranger' ? 1.4 : 1) * (this.unaware(m) ? 2 : 1));
        dmg = Math.max(1, dmg - G.rng.int(0, D.arm >> 1));
        msg(this.itemName(one, true) + '命中了' + D.n + '。', 'n');
        Snd.play('hit');
        this.damageMon(m, dmg, {});
        if (K.poison && m.hp > 0 && !D.undead) { m.st.poison = (m.st.poison || 0) + K.poison; }
      } else msg(this.itemName(one, true) + '沒有命中' + D.n + '。', 'm');
    }
    if (!(it.k === 'knife' && G.rng.chance(0.12))) this.dropItem(one, r.end[0], r.end[1]);
    this.endTurn();
    return true;
  },
  shatter(it, x, y, hit) {
    const k = it.k, was = G.known[k];
    msg('藥水瓶碎了。', 'm'); Snd.play('shatter');
    if (fxOn()) FX.burst(x, y, POTION_LOOKS[this.look(k)][1], 16);
    let seen = this.inView(x, y);
    const m = hit && hit !== G.P ? hit : null;
    switch (k) {
      case 'p_poison': this.cloudArea(x, y, 1, 'poison', 8, '毒霧'); break;
      case 'p_conf': this.cloudArea(x, y, 1, 'conf', 8); break;
      case 'p_para': this.cloudArea(x, y, 1, 'para', 4); break;
      case 'p_fire': this.cloudArea(x, y, 1, 'fire', 5, '烈焰藥水的火'); Snd.play('fire'); break;
      case 'p_heal': case 'p_xheal': if (m) { m.hp = Math.min(m.mhp, m.hp + 20); msg(MON[m.k].n + '的傷口癒合了。', 'w'); } else seen = false; break;
      case 'p_haste': if (m) { m.st.haste = 10; msg(MON[m.k].n + '的動作變快了！', 'w'); } else seen = false; break;
      default: seen = false; msg('什麼事也沒發生。', 'm');
    }
    if (seen && !was) { G.known[k] = 1; msg('原來是' + ITEMS[k].n + '。', 'i'); }
    else if (!was) G.tried[k] = 1;
  },
  cloudArea(x, y, r, k, t, src) {
    const F = G.F;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const nx = x + i, ny = y + j, v = this.tile(nx, ny);
      if (!TP[v].walk && v !== T.FOUNTAIN) continue;
      if (k === 'fire' && v === T.WATER) continue;
      if ((i || j) && !FOV.clear(F, x, y, nx, ny)) continue;
      this.addCloud(nx, ny, k, t, src);
    }
  },
  addCloud(x, y, k, t, src) {
    const F = G.F, c = F.clouds.find(o => o.x === x && o.y === y);
    if (c) { if (c.k === k) c.t = Math.max(c.t, t); else { c.k = k; c.t = t; } if (src) c.src = src; } else F.clouds.push({ x, y, k, t, src });
  },

  // ---------- 魔杖 ----------
  zap(it, tx, ty) {
    if (!this.canAct()) return false;
    const P = G.P, k = it.k, was = !!G.known[k];
    Snd.play('zap');
    if (it.ch <= 0) { msg('你揮動魔杖，但它已經沒有能量了。', 'm'); it.known = true; this.endTurn(); return true; }
    if (!(P.perks.arcane && G.rng.chance(0.25))) it.ch--;
    const mult = this.spellMult();
    let seen = false;
    if (k === 'w_dig') {
      const ray = rayTo(P.x, P.y, tx, ty, 9); let n = 0;
      for (const [x, y] of ray) {
        if (x <= 0 || y <= 0 || x >= G.F.w - 1 || y >= G.F.h - 1) break;
        const v = this.tile(x, y);
        if (v === T.WALL || v === T.SECRET || v === T.CRYSTAL || v === T.PILLAR || v === T.DOOR) { this.setTile(x, y, T.RUBBLE); n++; if (fxOn()) FX.burst(x, y, '#c8b8a0', 6); }
      }
      if (fxOn()) { FX.proj(P.x, P.y, ray.length ? ray[ray.length - 1][0] : tx, ray.length ? ray[ray.length - 1][1] : ty, 'dig'); FX.shake(3); }
      seen = n > 0; if (n) msg('魔杖在牆上挖出了一條隧道！', 'g'); else msg('一道光芒射了出去。', 'm');
    } else if (k === 'w_bolt') {
      const ray = rayTo(P.x, P.y, tx, ty, 9); let last = [P.x, P.y];
      const hitList = [];
      for (const [x, y] of ray) { const v = this.tile(x, y); if (v === T.WALL || v === T.SECRET || v === T.PILLAR || v === T.CRYSTAL || v === T.DOOR) break; last = [x, y]; const m = this.monAt(x, y); if (m && !MON[m.k].npc) hitList.push(m); }
      if (fxOn()) FX.proj(P.x, P.y, last[0], last[1], 'bolt');
      Snd.play('thunder');
      for (const m of hitList) { const d = Math.round(G.rng.int(5, 10 + G.depth / 2) * mult); msg('閃電擊中了' + MON[m.k].n + '！', 'g'); this.damageMon(m, d, {}); }
      seen = true;
    } else {
      const r = this.shoot(P.x, P.y, tx, ty, 9, { fromP: 1 });
      const kind = { w_fire: 'fire', w_frost: 'frost', w_slow: 'slow', w_tele: 'tele', w_sleep: 'sleep' }[k];
      if (fxOn()) FX.proj(P.x, P.y, r.end[0], r.end[1], kind);
      const m = r.hit && r.hit !== P ? r.hit : null;
      if (k === 'w_fire') {
        Snd.play('fire'); seen = true;
        const [ex, ey] = r.end;
        msg('火球爆炸了！', 'g');
        for (const o of G.F.mons.slice()) if (o.hp > 0 && cheb(o.x, o.y, ex, ey) <= 1 && !MON[o.k].npc) { const d = MON[o.k].fireImm ? 1 : Math.round(G.rng.int(6, 11 + G.depth / 2) * mult); this.damageMon(o, d, {}); if (o.hp > 0 && !MON[o.k].fireImm) o.st.burn = 3; }
        if (cheb(P.x, P.y, ex, ey) <= 1) { this.hurtP(G.rng.int(3, 7), '被自己的火球燒死'); }
        this.cloudArea(ex, ey, 1, 'fire', 3, '火球');
        if (fxOn()) FX.shake(5);
      } else if (m) {
        seen = true; const D = MON[m.k];
        if (k === 'w_frost') { m.st.freeze = D.boss ? 2 : 5; this.damageMon(m, Math.round(G.rng.int(2, 5) * mult), {}); msg(D.n + '被凍成了冰塊！', 'g'); Snd.play('ice'); }
        if (k === 'w_slow') { m.st.slow = 14; msg(D.n + '的動作變慢了。', 'g'); }
        if (k === 'w_sleep') { if (D.boss) msg(D.n + '打了個呵欠，但沒有睡著。', 'm'); else { m.st.sleep = 12; m.mode = 'sleep'; msg(D.n + '睡著了。', 'g'); } }
        if (k === 'w_tele') { if (D.final) msg('深淵之王抵抗了魔法！', 'w'); else { const p = this.randomFree(12); if (fxOn()) FX.burst(m.x, m.y, '#b48cff', 12); m.x = p[0]; m.y = p[1]; m.mode = 'wander'; msg(D.n + '被傳送到遠方了！', 'g'); Snd.play('tele'); } }
      } else msg('魔杖射出一道光芒，但沒有擊中任何東西。', 'm');
    }
    if (seen && !was) { G.known[k] = 1; msg('原來是' + ITEMS[k].n + '！', 'i'); }
    else if (!seen && !was) G.tried[k] = 1;
    if (seen) it.known = it.known || G.cls === 'mage';
    this.endTurn();
    return true;
  },

  // ---------- 職業技能 ----------
  abilCd(id) {
    const P = G.P, a = this.equipped('a');
    return Math.max(1, Math.round(ABIL[id].cd * Math.pow(0.75, P.perks.focus || 0) * (a && ITEMS[a.k].cdr ? 0.85 : 1)));
  },
  abilityTargets(id) {
    const A = ABIL[id], P = G.P;
    if (A.tgt === 'enemy') return this.hostiles().filter(m => cheb(m.x, m.y, P.x, P.y) <= A.range && (A.range === 1 || FOV.clear(G.F, P.x, P.y, m.x, m.y)));
    return [];
  },
  useAbility(id, tx, ty) {
    if (!this.canAct()) return false;
    const P = G.P, A = ABIL[id];
    if (P.cds[id] > 0) { msg(A.n + '還要 ' + P.cds[id] + ' 回合才能再用。', 'm'); return false; }
    const lvl = P.lvl;
    switch (id) {
      case 'whirl': {
        const adj = this.adjHostiles(); if (!adj.length) { msg('身邊沒有敵人。', 'm'); return false; }
        if (fxOn()) FX.ring(P.x, P.y, 1, '#ffd0a0'); Snd.play('whirl');
        msg('你使出旋風斬！', 'y');
        for (const m of adj) if (m.hp > 0) this.meleeAttack(m, { mult: 1.2, noSpecial: 1 });
        break;
      }
      case 'charge': {
        const m = this.monAt(tx, ty); if (!m) return false;
        const line = lineTo(P.x, P.y, m.x, m.y); line.pop();
        for (const [x, y] of line) { const v = this.tile(x, y); if (!TP[v].walk || v === T.LAVA || this.monAt(x, y)) { msg('衝鋒的路線被擋住了。', 'm'); return false; } }
        if (line.length) { const [x, y] = line[line.length - 1]; P.x = x; P.y = y; if (v_doorOpen(x, y)) { } }
        if (fxOn()) { FX.dash(P); FX.shake(5); } Snd.play('charge');
        msg('你衝向' + MON[m.k].n + '！', 'y');
        this.meleeAttack(m, { mult: 1.5, sure: true, noSpecial: 1 });
        if (m.hp > 0) m.st.stun = 2;
        break;
      }
      case 'stealth': {
        P.st.invis = 10; P.sneakNext = 1;
        for (const m of G.F.mons) if (m.mode === 'hunt') { m.mode = 'wander'; m.wt = [m.tx, m.ty]; }
        msg('你融入了陰影之中。', 'y'); Snd.play('stealth'); if (fxOn()) FX.burst(P.x, P.y, '#6a5a8a', 18);
        break;
      }
      case 'step': {
        const v = this.tile(tx, ty);
        if (!this.inView(tx, ty) || !TP[v].walk || v === T.LAVA || this.monAt(tx, ty) || cheb(tx, ty, P.x, P.y) > A.range) { msg('不能瞬移到那裡。', 'm'); return false; }
        if (fxOn()) FX.burst(P.x, P.y, '#8a6acf', 14);
        P.x = tx; P.y = ty; Snd.play('tele');
        if (fxOn()) { FX.burst(P.x, P.y, '#8a6acf', 14); }
        this.onEnter({ auto: 1 });
        break;
      }
      case 'missile': case 'aim': {
        const m = this.monAt(tx, ty); if (!m || !this.monVisible(m)) return false;
        if (fxOn()) FX.proj(P.x, P.y, m.x, m.y, id === 'missile' ? 'magic' : 'arrow');
        Snd.play(id === 'missile' ? 'magic' : 'bow');
        if (id === 'missile') { const d = Math.round((G.rng.int(3, 6) + Math.floor(lvl * 0.8)) * (P.perks.arcane ? 1.4 : 1) * (this.equipped('w') && ITEMS[this.equipped('w').k].magic ? 1.15 : 1)); this.damageMon(m, d, {}); msg('魔法飛彈擊中了' + MON[m.k].n + '。', 'n'); }
        else {
          const st = this.stats();
          if (this.unaware(m) || G.rng.chance(hitCh(st.acc + 4 + (P.perks.eye ? 3 : 0), MON[m.k].eva))) { const d = Math.max(1, Math.round((G.rng.int(3, 7) + Math.floor(lvl * 0.7)) * (this.unaware(m) ? 2 : 1)) - G.rng.int(0, MON[m.k].arm >> 1)); this.damageMon(m, d, {}); msg('箭矢射中了' + MON[m.k].n + '。', 'n'); }
          else msg('箭矢射偏了。', 'm');
          if (P.st.invis) { P.st.invis = 0; P.sneakNext = 0; }
        }
        break;
      }
      case 'nova': {
        let n = 0;
        for (const m of G.F.mons.slice()) if (m.hp > 0 && !MON[m.k].npc && cheb(m.x, m.y, P.x, P.y) <= 2) { m.st.freeze = MON[m.k].boss ? 2 : 4; this.damageMon(m, Math.round((G.rng.int(2, 5) + (lvl >> 1)) * (P.perks.arcane ? 1.4 : 1)), {}); n++; }
        if (fxOn()) FX.ring(P.x, P.y, 2, '#9fe8ff'); Snd.play('ice');
        msg(n ? '冰霜新星凍住了周圍的敵人！' : '一陣寒氣擴散開來。', 'y');
        break;
      }
      case 'haste': P.st.haste = 6; msg('你的腳步輕如疾風！', 'y'); Snd.play('haste'); if (fxOn()) FX.burst(P.x, P.y, '#e8c15a', 14); break;
      case 'heal': { this.healP(Math.round(P.mhp * 0.45 * (P.perks.alch ? 1.5 : 1))); P.st.poison = 0; P.st.burn = 0; msg('聖光治癒了你的傷口。', 'g'); Snd.play('holy'); if (fxOn()) FX.burst(P.x, P.y, '#ffe08a', 20); break; }
      case 'smite': {
        const m = this.monAt(tx, ty); if (!m || cheb(m.x, m.y, P.x, P.y) > 1) { msg('制裁只能對相鄰的敵人使用。', 'm'); return false; }
        Snd.play('holy'); if (fxOn()) FX.burst(m.x, m.y, '#ffe08a', 18);
        msg('聖光制裁！', 'y');
        this.meleeAttack(m, { mult: MON[m.k].undead ? 3 : 2, sure: true, noSpecial: 1 });
        if (m.hp > 0) m.st.stun = 2;
        break;
      }
    }
    P.cds[id] = this.abilCd(id);
    this.endTurn();
    return true;
  },

  // ---------- 陷阱 ----------
  triggerTrap(tr) {
    const P = G.P, K = TRAPS[tr.k];
    tr.hid = 0;
    msg('你踩到了' + K.n + '！', 'b'); Snd.play('trap');
    G.interrupt = true;
    switch (tr.k) {
      case 'spike': this.hurtP(G.rng.int(3, 6) + (G.depth >> 1), '被尖刺陷阱刺死'); break;
      case 'poison': this.cloudArea(P.x, P.y, 1, 'poison', 7, '毒氣陷阱'); break;
      case 'tele': this.teleportP(); break;
      case 'alarm': for (const m of G.F.mons) if (!MON[m.k].npc && !m.disg) { m.awake = true; m.mode = 'hunt'; m.tx = P.x; m.ty = P.y; } msg('刺耳的警報聲響徹整層樓！', 'b'); Snd.play('alarm'); break;
      case 'pit':
        if (G.depth >= LAST_FLOOR - 1 || BOSS_FLOOR[G.depth]) { this.hurtP(4, '摔死在坑洞裡'); break; }
        msg('你掉進了坑洞，摔到下一層！', 'b');
        this.hurtP(G.rng.int(3, 6), '摔死在坑洞裡');
        if (!G.over) this.enterFloor(G.depth + 1, 'fall');
        break;
      case 'fire': this.cloudArea(P.x, P.y, 1, 'fire', 3, '火焰陷阱'); this.igniteP('火焰陷阱'); Snd.play('fire'); break;
    }
  },

  // ---------- 回合推進 ----------
  monPass(m, x, y) {
    const v = this.tile(x, y), D = MON[m.k];
    if (!TP[v].walk) return false;
    if (v === T.LAVA && !(D.lavaWalk || D.fly || D.fireImm)) return false;
    if (v === T.STAIRS && D.boss && !D.final) return true;
    return true;
  },
  endTurn() {
    const P = G.P, F = G.F;
    if (G.over) return;
    P.energy -= 100;
    G.pmap = FOV.distMap(F, P.x, P.y, (x, y) => { const v = F.t[y * F.w + x]; return TP[v].walk && v !== T.LAVA; });
    let guard = 0;
    while (P.energy < 100 && !G.over && guard++ < 40) {
      this.tick();
      if (G.F !== F) break;
    }
    if (G.over) return;
    for (const id in P.cds) if (P.cds[id] > 0) P.cds[id]--;
    this.updateFov();
    if (G.turn % 5 === 0) { if (Meta.knowItems()) Meta.event('id'); if (G.P.gold >= 500) Meta.event('gold', G.P.gold); if (this.reson()) Meta.event('reson'); }
    if (G.turn - (G.lastSave || 0) >= 20) { G.lastSave = G.turn; this.save(); }
  },
  tick() {
    const P = G.P, F = G.F;
    G.turn++;
    // 飢餓
    const hr = (this.hasRing('r_sust') ? 0.5 : 1) * (P.perks.belly ? 0.65 : 1) * (asc(3) ? 1.2 : 1);
    const oldH = P.hunger; P.hunger -= hr;
    if (oldH >= 300 && P.hunger < 300) { msg('你肚子餓了。', 'w'); Snd.play('warn'); }
    if (oldH >= 100 && P.hunger < 100) { msg('你餓得頭暈眼花，快點吃東西！', 'b'); Snd.play('warn'); }
    if (P.hunger <= 0) { P.hunger = 0; if (G.turn % 4 === 0) this.hurtP(1, '餓死'); }
    // 回復
    if (P.hunger > 0 && !P.st.poison) {
      P.regen += P.mhp / 240 * (1 + 0.5 * (P.perks.regen || 0)) * (1 + Math.max(0, this.ringEnch('r_regen')) * 0.9) * (this.runeOf('a') === 'regen' ? 1.6 : 1);
      if (P.regen >= 1) { const n = Math.floor(P.regen); P.regen -= n; P.hp = Math.min(P.mhp, P.hp + n); }
    }
    if (P.st.poison > 0) { if (P.perks.resist) P.st.poison = 0; else this.hurtP(1, '因' + (P.poisonSrc || '毒') + '的毒素身亡'); }
    if (G.over) return;
    if (P.st.burn > 0) { if (this.tile(P.x, P.y) === T.WATER) P.st.burn = 0; else this.hurtP(P.perks.resist || this.burnRes() < 1 ? 1 : G.rng.int(1, 3), '被' + (P.burnSrc || '火焰') + '燒死'); }
    if (G.over) return;
    if (this.tile(P.x, P.y) === T.LAVA) { this.lavaBurn(P); if (G.over) return; }
    for (const k in P.st) if (P.st[k] > 0 && k !== 'poison' && k !== 'burn') {
      P.st[k]--;
      if (P.st[k] === 0) { const t = { haste: '你的速度恢復正常了。', slow: '你不再遲緩了。', conf: '你的頭腦清醒了。', para: '你又能動了。', invis: '你的身影重新出現了。', freeze: '你身上的冰融化了。' }[k]; if (t) msg(t, 'm'); }
    }
    if (P.st.poison > 0) P.st.poison--;
    if (P.st.burn > 0) P.st.burn--;
    if (P.sneakNext && !P.st.invis) P.sneakNext = 0;
    if (this.hasRing('r_tele') && G.rng.chance(1 / 110)) { G.known.r_tele = 1; msg('戒指發出怪異的光芒，把你傳送走了！', 'w'); this.teleportP(); }
    if (P.cls === 'mage' && G.turn % 150 === 0) { const ws = P.inv.filter(o => o.c === 'wand' && o.ch < ITEMS[o.k].ch[1]); if (ws.length) { G.rng.pick(ws).ch++; } }
    // 雲霧
    if (F.clouds.length) this.cloudTick();
    if (G.over) return;
    // 遊蕩怪物
    if (!F.arena && G.rng.chance(1 / 260) && F.mons.length < 30) {
      const p = this.randomFree(14);
      if (!this.inView(p[0], p[1])) { const m = this.spawnAt(this.randomMonKind(), p[0], p[1], false); m.mode = 'wander'; }
    }
    // 怪物行動
    for (const m of F.mons.slice()) {
      if (m.hp <= 0 || G.over || G.F !== F) continue;
      this.monStatus(m);
      if (m.hp <= 0) continue;
      const D = MON[m.k];
      let sp = D.spd; if (m.st.haste) sp *= 2; if (m.st.slow) sp /= 2; if (m.enraged && D.final) sp *= 1.5; if (m.elite === 'fast') sp *= 1.5;
      m.energy += sp;
      let g = 0;
      while (m.energy >= 100 && m.hp > 0 && !G.over && G.F === F && g++ < 4) { m.energy -= 100; this.monAct(m); }
    }
    F.mons = F.mons.filter(m => m.hp > 0 && !m.gone);
    P.energy += this.pSpeed();
  },
  cloudTick() {
    const F = G.F, P = G.P, add = [];
    for (const c of F.clouds) {
      const occ = c.x === P.x && c.y === P.y ? P : this.monAt(c.x, c.y);
      if (occ) this.cloudHit(occ, c);
      if (G.over) return;
      if (c.k === 'fire') {
        if (this.tile(c.x, c.y) === T.GRASS) this.setTile(c.x, c.y, T.ASH);
        for (const [dx, dy] of DIRS4) if (this.tile(c.x + dx, c.y + dy) === T.GRASS && G.rng.chance(0.3)) add.push([c.x + dx, c.y + dy]);
      }
      c.t--;
    }
    F.clouds = F.clouds.filter(c => c.t > 0);
    for (const [x, y] of add) this.addCloud(x, y, 'fire', 3, '野火');
  },
  cloudHit(o, c) {
    const isP = o === G.P, D = isP ? null : MON[o.k];
    if (D && D.npc) return;
    switch (c.k) {
      case 'poison': if (isP && G.P.perks.resist) break; if (D && D.undead) break; o.st.poison = Math.min(14, (o.st.poison || 0) + 2); if (isP) { G.P.poisonSrc = c.src || '毒霧'; } break;
      case 'conf': o.st.conf = Math.max(o.st.conf || 0, 3); break;
      case 'para': o.st.para = Math.max(o.st.para || 0, 2); break;
      case 'fire':
        if (D && D.fireImm) break;
        if (isP) { this.hurtP(G.rng.int(2, 5), '被' + (c.src || '火焰') + '燒死'); if (!G.over) this.igniteP(c.src || '火焰'); }
        else { this.damageMon(o, G.rng.int(3, 6), {}); if (o.hp > 0) o.st.burn = 3; }
        break;
    }
  },
  monStatus(m) {
    const D = MON[m.k];
    if (m.st.poison > 0) { this.damageMon(m, 1, {}); m.st.poison--; if (m.hp <= 0) return; }
    if (m.st.burn > 0) { if (D.fireImm || this.tile(m.x, m.y) === T.WATER) m.st.burn = 0; else { this.damageMon(m, G.rng.int(1, 3), {}); m.st.burn--; if (m.hp <= 0) return; } }
    if (this.tile(m.x, m.y) === T.LAVA && !(D.lavaWalk || D.fly || D.fireImm)) { this.damageMon(m, G.rng.int(8, 14), {}); if (m.hp <= 0) return; }
    if (m.elite === 'regen' && m.hp < m.mhp) m.hp = Math.min(m.mhp, m.hp + Math.max(1, Math.round(m.mhp * 0.03)));
    for (const k of ['haste', 'slow', 'conf', 'para', 'freeze', 'stun', 'sleep', 'fear', 'revealed']) if (m.st[k] > 0) m.st[k]--;
    for (const k in m.cd) if (m.cd[k] > 0) m.cd[k]--;
  },

  // ---------- 怪物 AI ----------
  stealthMult() {
    const P = G.P; let s = 1;
    if (P.cls === 'rogue') s *= 0.5;
    const e = this.ringEnch('r_stealth'); if (e > 0) s *= Math.pow(0.55, e); else if (e < 0) s *= 1.5;
    if (P.st.invis) s *= 0.1;
    if (this.runeOf('a') === 'shadow') s *= 0.6;
    const a = this.equipped('a'); if (a && ITEMS[a.k].sneak) s *= 0.7;
    return s;
  },
  monAct(m) {
    const P = G.P, D = MON[m.k], F = G.F;
    if (D.npc) return;
    if (m.st.para > 0 || m.st.freeze > 0 || m.st.stun > 0 || m.st.sleep > 0) return;
    const d = cheb(m.x, m.y, P.x, P.y);
    const inV = G.vis && G.vis[m.y * F.w + m.x];
    if (m.disg) { if (d <= 1) this.reveal(m); return; }
    if (!m.awake) {
      if (inV && d <= 7 && G.rng.chance(0.05 * this.stealthMult() * (d <= 2 ? 3 : 1) * (D.boss ? 3 : 1))) {
        m.awake = true; m.mode = 'hunt'; m.tx = P.x; m.ty = P.y; if (fxOn()) FX.text(m.x, m.y, '!', '#ffd75a');
      }
      return;
    }
    let sees = inV && d <= 9 && (!P.st.invis || d <= 1);
    if (sees && m.mode !== 'hunt') {
      if (G.rng.chance(d <= 1 ? 1 : 0.5 * this.stealthMult() + 0.15)) { m.mode = 'hunt'; if (fxOn() && this.monVisible(m)) FX.text(m.x, m.y, '!', '#ffd75a'); }
      else sees = false;
    }
    if (sees) { m.tx = P.x; m.ty = P.y; m.lost = 0; }
    // 混亂：亂走
    if (m.st.conf > 0 && G.rng.chance(0.6)) { this.monRandomStep(m); return; }
    // 逃跑
    const fleeing = m.st.fear > 0 || (D.flee && m.hp < m.mhp * D.flee && !D.boss) || (D.steal && m.gold);
    if (fleeing) {
      if (D.steal && m.gold) { m.fleeT = (m.fleeT || 0) + 1; if (m.fleeT > 6 && !sees) { m.gone = 1; m.hp = 0; msg('你聽到遠處傳來竊笑聲……小偷精帶著你的金幣溜走了。', 'w'); return; } }
      if (!this.monFlee(m) && d <= 1) this.monMelee(m);
      return;
    }
    if (m.mode === 'hunt' && sees) {
      // 召喚
      if (D.summon && !(m.cd.sum > 0)) {
        const mine = F.mons.filter(o => o.summoner === m.id && o.hp > 0).length;
        if (mine < (D.boss ? 6 : 4) && G.rng.chance(0.6)) {
          let n = 0;
          for (let i = 0; i < D.summon.n + (m.enraged ? 1 : 0); i++) { const q = this.nearFree(m.x, m.y); if (q) { const s = this.spawnAt(D.summon.t, q[0], q[1], false); s.mode = 'hunt'; s.tx = P.x; s.ty = P.y; s.summoner = m.id; s.energy = 0; n++; if (fxOn()) FX.burst(q[0], q[1], '#b48cff', 10); } }
          m.cd.sum = Math.round(D.summon.cd * (m.enraged ? 0.7 : 1));
          if (n) { msg(D.n + (D.summon.t === 'skeleton' ? '從地底召喚出骷髏兵！' : D.summon.t === 'rat' ? '發出尖叫，鼠群湧了過來！' : D.summon.t === 'sporeling' ? '噴出了小孢子！' : '召喚了幫手！'), 'w'); Snd.play('summon'); return; }
        }
      }
      // 治療同伴
      if (D.healer && !(m.cd.heal > 0)) {
        const hurt = F.mons.find(o => o !== m && o.hp > 0 && o.hp < o.mhp * 0.7 && !MON[o.k].npc && cheb(o.x, o.y, m.x, m.y) <= 5);
        if (hurt) { const n = 6 + m.lv; hurt.hp = Math.min(hurt.mhp, hurt.hp + n); m.cd.heal = 4; if (this.monVisible(m)) msg(D.n + '替' + MON[hurt.k].n + '治療傷口。', 'w'); if (fxOn()) FX.burst(hurt.x, hurt.y, '#7dffa0', 10); return; }
      }
      // 瞬移
      if (D.blink && d <= 1 && !(m.cd.blink > 0) && G.rng.chance(0.4)) {
        const c = [];
        for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) { const x = P.x + i, y = P.y + j, dd = cheb(x, y, P.x, P.y); if (dd >= 4 && dd <= 7 && this.inView(x, y) && this.monPass(m, x, y) && this.tile(x, y) !== T.LAVA && !this.monAt(x, y)) c.push([x, y]); }
        if (c.length) { const p = G.rng.pick(c); if (fxOn()) FX.burst(m.x, m.y, '#b48cff', 10); m.x = p[0]; m.y = p[1]; m.cd.blink = 6; if (fxOn()) FX.burst(m.x, m.y, '#b48cff', 10); msg(D.n + '瞬間移動了！', 'w'); Snd.play('tele'); return; }
      }
      // 遠程攻擊
      if (D.ranged && d > 1 && d <= D.ranged.r && !(m.cd.rng > 0) && G.rng.chance(D.boss ? 0.65 : 0.75)) {
        const r = this.shoot(m.x, m.y, P.x, P.y, D.ranged.r + 1, {});
        if (r.hit === P) { this.monRanged(m, r); return; }
      }
      // 保持距離
      if (D.kite && d <= 2 && (m.kiteN || 0) < 3 && G.rng.chance(0.55)) { if (this.monFlee(m)) { m.kiteN = (m.kiteN || 0) + 1; return; } }
      if (d > 2 && m.kiteN > 0 && G.rng.chance(0.3)) m.kiteN--;
      if (d <= 1) { this.monMelee(m); return; }
      this.monApproach(m);
      return;
    }
    if (m.mode === 'hunt') {
      // 追蹤最後看到的位置
      if (m.x === m.tx && m.y === m.ty || (m.lost = (m.lost || 0) + 1) > 20) { m.mode = 'wander'; m.wt = null; return; }
      if (P.st.invis && d <= 1 && G.rng.chance(0.3)) { this.monMelee(m); return; }
      this.monPathTo(m, m.tx, m.ty);
      return;
    }
    // 遊蕩
    if (D.erratic && G.rng.chance(0.5)) { this.monRandomStep(m); return; }
    if (!m.wt || (m.x === m.wt[0] && m.y === m.wt[1]) || G.rng.chance(0.02)) {
      const r = F.rooms.length && G.rng.chance(0.7) ? G.rng.pick(F.rooms) : null;
      m.wt = r ? [r.x + (r.w >> 1), r.y + (r.h >> 1)] : this.randomFree(0);
      if (!TP[this.tile(m.wt[0], m.wt[1])].walk) m.wt = this.randomFree(0);
    }
    if (!this.monPathTo(m, m.wt[0], m.wt[1])) m.wt = null;
  },
  monRanged(m, r) {
    const P = G.P, D = MON[m.k], R = D.ranged;
    m.cd.rng = R.cd || 0;
    if (fxOn()) FX.proj(m.x, m.y, P.x, P.y, R.k);
    Snd.play({ arrow: 'bow', bolt: 'thunder', fire: 'fire', frost: 'ice', void: 'magic', spore: 'shatter' }[R.k] || 'magic');
    const st = this.stats();
    const sure = R.k !== 'arrow';
    if (!sure && !G.rng.chance(hitCh(this.monAcc(m), st.eva + (P.perks.dodge ? 2 : 0)))) { msg(D.n + R.v + '，但沒有射中你。', 'm'); return; }
    if (sure && !D.boss && G.rng.chance(clamp(0.05 + st.eva * 0.02, 0.05, 0.3))) { msg(D.n + R.v + '，你閃開了！', 'm'); return; }
    let dmg = G.rng.int(R.dmg[0], R.dmg[1]) + Math.floor(m.lv * 0.4);
    if (R.k === 'arrow') dmg = Math.max(1, dmg - G.rng.int(0, st.arm));
    else dmg = Math.max(1, Math.round((dmg - G.rng.int(0, st.arm >> 1)) * (this.runeOf('a') === 'ward' ? 0.65 : 1)));
    if (R.k === 'fire') dmg = Math.max(1, Math.round(dmg * (this.burnRes() < 1 ? 0.75 : 1)));
    msg(D.n + R.v + '，擊中了你！', 'b');
    this.hurtP(dmg, '被' + D.n + (RANGED_DEATH[R.k] || '殺死'));
    if (G.over) return;
    if (R.burn && G.rng.chance(0.5)) this.igniteP(D.n);
    if (R.slow) { P.st.slow = Math.max(P.st.slow || 0, 3); msg('寒氣讓你的動作變慢了。', 'b'); }
    if (R.poisonHit && !P.perks.resist) { P.st.poison = (P.st.poison || 0) + R.poisonHit; P.poisonSrc = D.n; }
    if (R.aoe) this.cloudArea(P.x, P.y, 1, 'fire', 2, D.n + '的熔岩');
  },
  monStepTo(m, x, y) {
    if (this.tile(x, y) === T.DOOR) this.setTile(x, y, T.ODOOR);
    m.x = x; m.y = y;
  },
  monCan(m, x, y) {
    if (!this.monPass(m, x, y)) return false;
    if (x === G.P.x && y === G.P.y) return false;
    if (this.monAt(x, y)) return false;
    const dx = x - m.x, dy = y - m.y;
    if (dx && dy && (!TP[this.tile(m.x + dx, m.y)].walk || !TP[this.tile(m.x, m.y + dy)].walk)) return false;
    return true;
  },
  monApproach(m) {
    const pm = G.pmap, F = G.F, cur = pm ? pm[m.y * F.w + m.x] : 32767;
    if (cur === 32767 || !pm) return this.monPathTo(m, G.P.x, G.P.y);
    let best = null, bv = cur;
    for (const [dx, dy] of G.rng.shuffle(DIRS8.slice())) {
      const x = m.x + dx, y = m.y + dy; if (!this.monCan(m, x, y)) continue;
      const v = pm[y * F.w + x]; if (v < bv) { bv = v; best = [x, y]; }
    }
    if (!best) { // 被擋住：試著繞路
      for (const [dx, dy] of G.rng.shuffle(DIRS8.slice())) { const x = m.x + dx, y = m.y + dy; if (this.monCan(m, x, y) && pm[y * F.w + x] <= cur) { best = [x, y]; break; } }
    }
    if (best) { this.monStepTo(m, best[0], best[1]); return true; }
    return false;
  },
  monFlee(m) {
    const pm = G.pmap, F = G.F, cur = pm ? pm[m.y * F.w + m.x] : 0;
    let best = null, bv = cur;
    for (const [dx, dy] of DIRS8) {
      const x = m.x + dx, y = m.y + dy; if (!this.monCan(m, x, y)) continue;
      let v = pm ? pm[y * F.w + x] : cheb(x, y, G.P.x, G.P.y); if (v === 32767) v = 0;
      if (v > bv) { bv = v; best = [x, y]; }
    }
    if (best) { this.monStepTo(m, best[0], best[1]); return true; }
    return false;
  },
  monRandomStep(m) {
    const opts = DIRS8.map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => this.monCan(m, x, y));
    if (opts.length) { const [x, y] = G.rng.pick(opts); this.monStepTo(m, x, y); return true; }
    return false;
  },
  monPathTo(m, tx, ty) {
    if (m.x === tx && m.y === ty) return false;
    const F = G.F;
    const p = FOV.path(F, m.x, m.y, tx, ty, (x, y, goal) => this.monPass(m, x, y) && (goal || !this.monAt(x, y)) && !(x === G.P.x && y === G.P.y && !goal), 1500);
    if (!p || !p.length) return false;
    const [x, y] = p[0];
    if (x === G.P.x && y === G.P.y) { this.monMelee(m); return true; }
    if (!this.monCan(m, x, y)) return false;
    this.monStepTo(m, x, y); return true;
  },

  // ---------- 結束 ----------
  score() {
    const s = G.stats, P = G.P;
    return Math.round((G.depth * 100 + P.lvl * 25 + s.kills * 3 + (s.elites || 0) * 15 + Math.floor((P.gold + s.gold) / 6) + s.bosses * 300 + (G.over === 'win' ? 5000 : 0)) * (1 + (G.asc || 0) * 0.1));
  },
  die(cause) {
    if (G.over) return;
    G.over = 'dead'; G.cause = '在第 ' + G.depth + ' 層' + cause;
    G.P.hp = 0;
    msg('你死了……' + cause + '。', 'b');
    Snd.play('death');
    this.finishRun();
  },
  win() {
    if (G.over) return;
    G.over = 'win'; G.cause = '擊敗深淵之王，征服了地牢';
    msg('深淵之王化為塵土……你征服了深淵地牢！', 'y');
    Snd.play('victory');
    Store.meta.wins = (Store.meta.wins || 0) + 1;
    Meta.event('win');
    this.finishRun();
  },
  finishRun() {
    Store.clearRun();
    const M = Store.meta, s = G.stats, P = G.P;
    const score = this.score();
    Meta.knowItems();
    const soulBase = G.depth * 2 + Math.floor(s.kills / 4) + s.bosses * 8 + (s.elites || 0) + (G.over === 'win' ? 40 : 0);
    const souls = Math.round(soulBase * (1 + (G.asc || 0) * 0.2));
    M.souls = (M.souls || 0) + souls; M.totalSouls = (M.totalSouls || 0) + souls;
    M.kills = (M.kills || 0) + s.kills;
    const killer = Object.keys(MON).filter(k => G.cause.includes(MON[k].n)).sort((a, b) => MON[b].n.length - MON[a].n.length)[0] || null;
    const rec = { cls: P.cls, lvl: P.lvl, depth: G.depth, score, cause: G.cause, win: G.over === 'win', seed: G.seed, daily: G.daily, date: new Date().toISOString().slice(0, 10), turns: G.turn, kills: s.kills, gold: P.gold, asc: G.asc || 0, killer };
    M.records = (M.records || []).concat([rec]).sort((a, b) => b.score - a.score).slice(0, 40);
    if (G.daily) { const d = todayStr(); if (!M.daily[d] || M.daily[d].score < score) M.daily[d] = rec; }
    Store.saveMeta();
    G.summary = Object.assign({ souls, soulBase, elites: s.elites || 0, chests: s.chests || 0, altars: s.altars || 0, ach: (G.newAch || []).slice(), rank: M.records.indexOf(M.records.find(r => r === rec)) + 1 }, rec);
    if (typeof UI !== 'undefined') setTimeout(() => UI.showEnd(), G.over === 'win' ? 1600 : 1300);
  },
});
function v_doorOpen(x, y) { if (Game.tile(x, y) === T.DOOR) { Game.setTile(x, y, T.ODOOR); return true; } return false; }
