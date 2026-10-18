'use strict';
/* ------------------------------ computer players ------------------------------ */
class AICtl {
  constructor() { this.inp = new Input(); this.tk = rnd(10, 40) | 0; this.plan = 'engage'; this.cd = rnd(30, 80); this.defT = 0; this.comboLeft = 0; this.hx = 0; this.zoff = rnd(-30, 30); this.side = 0; this.tgt = null; this.wait = 0; }
  poll() {
    const f = this.f, I = this.inp, L = W.D; I.mx = I.mz = 0; I.run = false; I.def = false;
    if (f.dead || f.dying || W.over) return;
    if (f.entering) { I.mx = f.x < W.minX + 30 ? 1 : -1; return; }
    this.cd--;
    if (this.defT > 0) { this.defT--; I.def = true; if (this.defT === 0 && Math.random() < L.combo * 0.6 && this.ready(this.tgt, true)) { I.atk = true; this.claim(this.tgt, 0); } return; }
    if (this.wait > 0) { this.wait--; }
    // continue a combo already started
    if (f.state === 'atk' && this.comboLeft > 0 && f.st > f.atk.on + 1) { I.atk = true; this.comboLeft--; return; }
    if (!f.canAct() && f.state !== 'defend') return;
    if (--this.tk <= 0) { this.tk = (L.react * rnd(0.7, 1.4)) | 0; this.decide(); }
    const g = this.tgt; if (!g || g.dead) { this.tgt = nearestFoe(f); if (!this.tgt && W.go) I.mx = 1; return; }
    const dx = g.x - f.x, dz = g.z - f.z, adx = Math.abs(dx);

    if (this.plan === 'pickup' && this.item && !this.item.holder && W.items.includes(this.item)) {
      const it = this.item; this.moveTo(it.x, it.z, 12, 6);
      if (Math.abs(it.x - f.x) < 18 && Math.abs(it.z - f.z) < 10) { I.atk = true; this.plan = 'engage'; }
      return;
    }
    if (this.plan === 'ranged') {
      const want = g.x - sgn(dx || 1) * 250;
      if (adx < 90) { this.moveTo(f.x - sgn(dx) * 200, g.z + this.zoff, 10, 8, true); if (adx < 40 && this.cd <= 0 && Math.abs(dz) < 12 && this.ready(g)) { this.face(dx); I.atk = true; this.cd = L.atkCd; this.claim(g, 0); } return; }
      this.moveTo(want, g.z, 40, 5);
      if (Math.abs(dz) < 9 && adx > 120 && adx < 460 && this.cd <= 0 && this.ready(g, true)) { this.face(dx); I.skill = 1; this.cd = L.atkCd * 2.4 * rnd(0.8, 1.3); this.claim(g, 10); }
      return;
    }
    if (this.plan === 'hover') {
      this.moveTo(g.x + this.side * this.hx, clamp(g.z + this.zoff, 10, FLOOR_D - 10), 20, 10);
      if (adx > 40) { if (Math.abs(f.x - (g.x + this.side * this.hx)) < 30) this.face(dx); }
      return;
    }
    // engage
    const side = this.side || sgn(f.x - g.x || 1);
    const tx = g.x + side * 30 * ((g.def.size || 1) + (f.def.size || 1)) / 2, tz = g.z;
    const near = Math.abs(f.x - tx) < 12 && Math.abs(dz) < 8;
    if (!near) {
      this.moveTo(tx, tz, 8, 5, adx > 240 && Math.abs(dz) < 30);
      if (adx < 70 && Math.abs(dz) < 10 && this.cd <= 0 && sgn(dx) === f.face && this.ready(g)) { I.atk = true; this.cd = L.atkCd * rnd(0.7, 1.3); this.comboLeft = Math.random() < L.combo ? this.maxCombo() : 0; this.claim(g, this.comboLeft * 16); }
    } else {
      this.face(dx);
      if (this.cd <= 0 && this.ready(g)) { I.atk = true; this.cd = L.atkCd * rnd(0.7, 1.4); this.comboLeft = Math.random() < L.combo ? this.maxCombo() : 0; this.claim(g, this.comboLeft * 16); }
    }
  }
  face(dx) { if (sgn(dx) !== this.f.face) this.inp.mx = sgn(dx) * 0.04; }
  /* Rhythm against a human: only one monster (or CPU) starts an attack on you at a time, with a
     gap between attacks, and each one pauses briefly (wind-up) before swinging so you can react. */
  ready(g, noWind) {
    if (!g || !(g.ctl && g.ctl.human)) return true;
    const L = W.D;
    if (W.t < (g.pressUntil || 0)) { if (!noWind) this.wind = Math.max(this.wind || 0, L.windup); return false; }
    if (noWind) return true;
    if (this.wind === undefined) this.wind = L.windup;
    if (this.wind > 0) { this.wind--; return false; }
    return true;
  }
  claim(g, extra) { if (g && g.ctl && g.ctl.human) { g.pressUntil = W.t + W.D.gap * (this.f.def.boss ? 0.8 : 1) + extra; } this.wind = W.D.windup; }
  maxCombo() { return this.f.def.boss ? Math.max(1, W.D.comboMax) : W.D.comboMax; }
  moveTo(tx, tz, ex, ez, run) {
    const f = this.f, I = this.inp, dx = tx - f.x, dz = tz - f.z;
    if (Math.abs(dx) > ex) I.mx = sgn(dx); if (Math.abs(dz) > ez) I.mz = clamp(dz / 20, -1, 1);
    if (run && Math.abs(dx) > 120) I.run = true;
  }
  decide() {
    const f = this.f, L = W.D, I = this.inp;
    const g = this.tgt = nearestFoe(f); if (!g) return;
    const dx = g.x - f.x, dz = g.z - f.z, adx = Math.abs(dx);
    // dodge or block something coming
    for (const p of W.projs) {
      if (p.team === f.team || Math.abs(p.z - f.z) > 16) continue;
      const toward = sgn(f.x - p.x) === sgn(p.vx), d = Math.abs(f.x - p.x);
      if (toward && d < 150 && Math.random() < L.dodge) {
        if (Math.random() < 0.5) { I.jmp = true; } else { this.defT = 22; this.face(p.x - f.x); }
        return;
      }
    }
    const busy = g.state === 'atk' || g.state === 'runAtk' || g.state === 'jumpAtk' || (g.state === 'skill' && g.st < 20);
    if (busy && adx < 80 && Math.abs(dz) < 18 && g.face === sgn(f.x - g.x) && Math.random() < L.block) { this.defT = 20 + (Math.random() * 14 | 0); this.face(dx); return; }
    // specials
    const sk = f.def.skills;
    if (sk.length && f.def.ranged) { this.plan = 'ranged'; return; }
    if (sk.length && Math.random() < L.skill * (f.def.boss ? 0.6 : 0.35)) {
      const can = n => sk[n - 1] && f.mp >= SKILLS[sk[n - 1]].cost;
      let n = 0;
      if (Math.abs(dz) < 10 && adx > 110 && adx < 380 && can(1)) n = 1;
      else if (adx < 90 && Math.abs(dz) < 18) n = can(2) && Math.random() < 0.5 ? 2 : can(3) ? 3 : 0;
      if (sk[2] === 'iron' && n === 3 && f.armorT > 0) n = 0;
      if (sk[1] === 'shadowstep' && adx > 150 && can(2) && Math.random() < 0.3) n = 2;
      if (f.def.boss && n === 1 && can(3) && Math.random() < 0.4) n = 3;
      if (n && this.ready(g, true)) { this.face(dx); I.skill = n; this.claim(g, 20); return; }
    }
    // grab a nearby weapon
    if (!f.hold && f.def.enemy && Math.random() < 0.3) {
      for (const it of W.items) if (!it.holder && !it.fly && it.y <= 0 && (it.kind === 'stick' || it.kind === 'stone') && Math.abs(it.x - f.x) < 140 && Math.abs(it.z - f.z) < 50) { this.plan = 'pickup'; this.item = it; return; }
    }
    // how many friends are already in the face of this target?
    let eng = 0; for (const o of W.fighters) if (o !== f && o.ctl instanceof AICtl && o.ctl.plan === 'engage' && o.ctl.tgt === g && !o.dead && o.team === f.team) eng++;
    if (eng < L.maxEng || f.def.boss) {
      this.plan = 'engage';
      if (!this.side || Math.random() < 0.15) this.side = sgn(f.x - g.x || 1);
      if (Math.random() < 0.15) this.side = -this.side;
    } else {
      this.plan = 'hover'; this.side = sgn(f.x - g.x || 1); this.hx = rnd(130, 220); this.zoff = rnd(-50, 50);
    }
    if (f.hold && f.hold.kind === 'stone' && Math.abs(dz) < 10 && adx > 80 && adx < 300 && this.ready(g, true)) { this.face(dx); I.atk = true; this.claim(g, 0); }
  }
}

