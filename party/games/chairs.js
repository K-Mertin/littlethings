'use strict';
/* 搶椅子 — musical chairs in a cosy party living room.
   The music plays and everyone walks round the ring of cushions (坐墊); when it stops
   (suddenly!) everyone freezes for a beat with a ‼ and then scrambles for a free cushion.
   One button: 衝刺 (a short dash; in 大人 mode it also bumps people out of the way).
   大人: one cushion fewer than players; whoever is left standing is out and cheers from
         the sofa; one cushion goes each round; the last one sitting wins. The cushions
         slowly turn while the music plays and dawdlers freeze longer, so keep walking.
   小朋友: nobody is out; fewer cushions than players, every sit earns a ⭐, a glowing
         arrow shows the way to the nearest free cushion; 6 rounds, most ⭐ wins.
   Alone: practice rounds with one cushion — how fast can you sit down? */
(() => {
  const CX = 800, CY = 548;
  const PRX = 410, PRY = 240;            // the walking path round the cushions
  const KRX = 292, KRY = 172;            // keep-out round the cushions while the music plays
  const CRX = 196, CRY = 108;            // the ring the cushions sit on
  const BX0 = 78, BX1 = 1522, BY0 = 262, BY1 = 872;
  const PINK = '#e879f9', DEEP = '#a21caf';
  const FONT = '"Noto Sans TC",system-ui,sans-serif';
  const CUSH = [['#ff8fab', '#e05780', '#ffc2d1'], ['#7dd3fc', '#2b8fd1', '#c4ecff'], ['#fde047', '#c99a06', '#fff3a6'], ['#86efac', '#2fa860', '#c9f8d9'], ['#c4b5fd', '#7c5cd6', '#e4dcff'], ['#fdba74', '#d9711d', '#ffe0c2']];
  const SOFAS = [{ x0: 66, x1: 352, c: '#8b8ffb', d: '#5b5fd6' }, { x0: 1248, x1: 1534, c: '#f58ab9', d: '#c9548a' }];
  const SOFA_Y = 744;                    // standing players stay above the sofas
  const SEATS = [[118, 812], [1482, 812], [209, 812], [1391, 812], [300, 812], [1300, 812]];
  const DASH = [16, 14], NODASH = [];
  const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };

  function steer(e, ix, iy, sp, dt, acc) {
    const tx = ix * sp, ty = iy * sp, moving = ix || iy;
    const rate = !moving ? 22 : (e.vx * tx + e.vy * ty < 0 ? 22 : (acc || 13));
    const k = 1 - Math.exp(-rate * dt);
    e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
    if (!moving && e.vx * e.vx + e.vy * e.vy < 300) { e.vx = 0; e.vy = 0; }
  }
  function spring(e, dt) { e.sqv += (-e.sq * 320 - e.sqv * 14) * dt; e.sq += e.sqv * dt; }
  function bgLayer(self, g, paint) {
    const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
    if (!self.bgCv || self.bgS !== s) {
      const c = self.bgCv || document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(H * s);
      const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 0, 0); paint(cg); self.bgCv = c; self.bgS = s;
    }
    g.drawImage(self.bgCv, 0, 0, W, H);
  }
  function bubble(g, x, y, text, col, size) {
    size = size || 24;
    g.font = `900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width + 26, h = size + 18, bx = clamp(x, 20 + w / 2, W - 20 - w / 2);
    g.fillStyle = 'rgba(255,255,255,.96)'; g.beginPath(); g.roundRect(bx - w / 2, y - h / 2, w, h, h / 2); g.fill();
    g.beginPath(); g.moveTo(x - 9, y + h / 2 - 2); g.lineTo(x, y + h / 2 + 12); g.lineTo(x + 9, y + h / 2 - 2); g.fill();
    g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.roundRect(bx - w / 2, y - h / 2, w, h, h / 2); g.stroke();
    g.fillStyle = col; g.fillText(text, bx, y + 1);
  }
  /* a puffy round floor cushion, seen a little from above */
  function drawCushion(g, x, y, ci, sq, s) {
    const C = CUSH[ci % CUSH.length], rx = 50 * (s || 1) * (1 + sq * 0.6), ry = 34 * (s || 1) * (1 - sq * 0.5);
    g.fillStyle = 'rgba(80,40,60,.2)'; g.beginPath(); g.ellipse(x + 4, y + ry * 0.55, rx * 1.02, ry * 0.75, 0, 0, TAU); g.fill();
    g.fillStyle = C[1]; g.beginPath(); g.ellipse(x, y + 6, rx, ry, 0, 0, TAU); g.fill();
    g.fillStyle = C[0]; g.beginPath(); g.ellipse(x, y, rx * 0.97, ry * 0.9, 0, 0, TAU); g.fill();
    g.fillStyle = C[2]; g.beginPath(); g.ellipse(x - rx * 0.22, y - ry * 0.3, rx * 0.45, ry * 0.28, -0.2, 0, TAU); g.fill();
    // tufts: four dimples and a button in the middle
    g.fillStyle = C[1];
    for (const [u, v] of [[-0.48, 0], [0.48, 0], [0, -0.5], [0, 0.5]]) { g.beginPath(); g.ellipse(x + u * rx, y + v * ry, 3.2, 2.4, 0, 0, TAU); g.fill(); }
    g.beginPath(); g.ellipse(x, y, 7, 5.2, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(x - 1.5, y - 1.5, 2.6, 1.8, 0, 0, TAU); g.fill();
    // little tassels at the sides
    g.fillStyle = '#ffd36b'; for (const s2 of [-1, 1]) { g.beginPath(); g.arc(x + s2 * rx * 0.98, y + 2, 5, 0, TAU); g.fill(); }
  }
  /* a big two-tone ‼ that wobbles above a frozen character */
  function bangMark(g, x, y, t, a) {
    g.save(); g.translate(x + Math.sin(t * 60) * 2.5, y); g.rotate(Math.sin(t * 40) * 0.08); g.globalAlpha = a;
    g.font = `900 52px "Fredoka",${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.strokeText('‼', 0, 0); g.fillStyle = '#ff3b4a'; g.fillText('‼', 0, 0);
    g.restore(); g.globalAlpha = 1;
  }

  class Chairs {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = null; this.edge = '#c98f5a';
      this.music = true;
      const n = ctx.players.length;
      this.solo = n === 1;
      this.rounds = this.solo ? (this.kid ? 6 : 5) : (this.kid ? 6 : 0);   // 大人 with friends: until one is left
      this.round = 1; this.outN = 0;
      this.es = ctx.players.map((p, i) => {
        const a = -Math.PI / 2 + i * TAU / n + (n > 1 ? 0 : 0.6);
        const x = CX + Math.cos(a) * PRX, y = CY + Math.sin(a) * PRY;
        return { p, x, y, vx: 0, vy: 0, kx: 0, ky: 0, face: a + Math.PI / 2, r: 32, walk: 0, sq: 0, sqv: 0, st: 'walk', seat: null,
          cd: 0, dash: 0, dx: 0, dy: 0, freeze: 0, freeze0: 0, fhop: 0, frot: 0, stun: 0, th: Math.atan2((y - CY) / PRY, (x - CX) / PRX), av: 0, idle: 0, lazy: false,
          snap: 1, sx0: 0, sy0: 0, stars: 0, sits: 0, best: null, outAt: 0, sad: 0, sofa: -1, onSofa: false, cheer: 0, say: '', sayT: 0, hopT: 0, hopV: 0, hop: 0, missT: 0 };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      const k = this.solo ? 1 : Math.max(1, n - 1);
      this.cush = []; for (let i = 0; i < k; i++) this.cush.push({ a: i * TAU / k, ta: i * TAU / k, ci: i, who: null, sq: 0, sqv: 0, x: 0, y: 0, gone: 0 });
      this.spin = -Math.PI / 2;
      this.phase = 'walk'; this.pt = rnd(5, 9); this.rt = 0; this.rushT = 0; this.removed = false;
      this.notes = []; this.noteT = 0; this.scratchT = 0; this.discA = 0; this.armA = 1;
      this.confetti = [];
      this.dl = []; this.dn = 0;
      this.place();
      this.announced = false;
    }
    alive() { return this.es.filter(e => e.st !== 'out'); }
    free() { return this.cush.filter(c => !c.who && !c.gone); }
    place() {
      for (const c of this.cush) { c.x = CX + Math.cos(c.a + this.spin) * CRX; c.y = CY + Math.sin(c.a + this.spin) * CRY; }
    }
    respace() {
      const live = this.cush.filter(c => !c.gone), k = live.length;
      // keep each cushion near where it is, just even out the gaps
      live.sort((a, b) => ((a.a % TAU) + TAU) % TAU - ((b.a % TAU) + TAU) % TAU);
      const base = live.length ? live[0].a : 0;
      live.forEach((c, i) => { c.ta = base + i * TAU / k; });
    }
    scratch() {
      // a record scratch: a fast falling squeal plus a burst of noise
      if (!Sfx.on || !Sfx.ctx || Sfx.ctx.state !== 'running') return;
      Sfx.tone(1100, 0.12, 'sawtooth', 0.07, 260); Sfx.tone(700, 0.16, 'sawtooth', 0.06, 1400, 0.1); Sfx.tone(900, 0.22, 'sawtooth', 0.05, 120, 0.24);
      Sfx.noise(0.35, 0.18, 2200, 1.2);
    }
    say(e, text, T) { e.say = text; e.sayT = T || 1.2; }
    hopUp(e, v) { e.hopV = v || 420; if (e.hop <= 0) e.hop = 0.01; }

    /* ---------------- phases ---------------- */
    startWalk() {
      const ctx = this.ctx;
      this.phase = 'walk'; this.pt = rnd(5, 11); this.music = true; this.round++;
      for (const e of this.es) {
        if (e.st === 'sit') { e.st = 'walk'; e.seat = null; e.sq = -0.25; e.sqv = 0; this.hopUp(e, 460); }
        e.idle = 0; e.lazy = false; e.freeze = 0; e.stun = 0; e.kx = e.ky = 0;
      }
      for (const c of this.cush) c.who = null;
      Fx.announce('第 ' + this.round + ' 輪！音樂開始～', DEEP); ctx.sfx('go');
    }
    stopMusic() {
      const ctx = this.ctx, kid = this.kid;
      this.phase = 'rush'; this.music = false; this.rt = 0; this.rushT = 0.45 + (kid ? 4.2 : 3.5); this.scratchT = 0.8;
      Fx.flash('#fff', 0.55); Fx.shake(12); Fx.announce('音樂停了！快坐下！', '#c026d3'); this.scratch(); ctx.hitstop(0.1);
      for (const e of this.alive()) {
        const s = hyp(e.vx, e.vy), m = Math.min(1, s / 220), bob = Math.abs(Math.sin(e.walk));
        e.fhop = bob * 9 * m + 4; e.frot = clamp(e.vx / 1600, -0.22, 0.22) + rnd(-0.08, 0.08);
        e.freeze = e.freeze0 = 0.45 + (e.lazy && !kid ? 0.5 : 0); e.vx = e.vy = 0; e.dash = 0;
        if (e.lazy && !kid) { this.say(e, '咦？發呆了！', 1); }
        ctx.buzz(e.p, 220);
      }
    }
    sit(e, c) {
      const ctx = this.ctx;
      e.st = 'sit'; e.seat = c; c.who = e; e.snap = 0; e.sx0 = e.x; e.sy0 = e.y; e.vx = e.vy = e.kx = e.ky = 0; e.dash = 0;
      e.sits++; c.sq = 0.42; c.sqv = 0; e.sq = 0.3; e.sqv = 0;
      const tm = this.rt;
      if (this.solo) { if (e.best == null || tm < e.best) { e.best = tm; } }
      if (this.kid) { e.stars++; ctx.sfx('star'); Fx.pop(c.x, c.y - 96, '⭐+1', '#d48a00', 46); }
      else { ctx.sfx('coin'); Fx.pop(c.x, c.y - 96, this.solo ? tm.toFixed(2) + ' 秒' : '坐到了！', DEEP, 40); }
      ctx.sfx('pop'); ctx.buzz(e.p, 70);
      Fx.burst(c.x, c.y, CUSH[c.ci % CUSH.length][0], 14, 300); Fx.ring(c.x, c.y, '#ffffff', 90, 0.4);
      for (const o of this.es) if (o.onSofa && o.sad <= 0) this.hopUp(o, 380);
    }
    endRush(timeout) {
      const ctx = this.ctx;
      this.phase = 'res'; this.pt = 2.7; this.removed = false;
      const standing = this.alive().filter(e => e.st !== 'sit');
      if (!this.kid && !this.solo && timeout) {
        // the last free cushions go to whoever is closest — exactly one person stays standing
        for (const c of this.free()) {
          let best = null, bd = 1e9;
          for (const e of standing) { if (e.st === 'sit') continue; const d = hyp(e.x - c.x, e.y - c.y); if (d < bd) { bd = d; best = e; } }
          if (best) { this.sit(best, c); Fx.pop(c.x, c.y - 140, '滑壘！', '#ff7a1f', 36); }
        }
      }
      const left = this.alive().filter(e => e.st !== 'sit');
      if (this.solo) {
        if (left.length) { this.say(left[0], '太慢了～', 1.6); ctx.sfx('stun'); Fx.announce('差一點點！', '#2b2340'); }
        else Fx.announce(this.es[0].best === this.rt ? '新紀錄！' : '坐好了！', DEEP);
        return;
      }
      if (this.kid) {
        for (const e of left) { this.say(e, '下次加油！', 1.8); e.sq = 0.2; }
        Fx.announce('坐到的人拿 ⭐！', '#d48a00');
        return;
      }
      for (const e of left) {
        e.st = 'out'; e.outAt = ++this.outN; e.sad = 1.8; e.sofa = this.outN - 1; e.onSofa = false; e.freeze = 0; e.stun = 0;
        this.say(e, '嗚…沒位子了', 1.6); ctx.buzz(e.p, 400);
        Fx.burst(e.x, e.y, '#9aa3c7', 10, 200);
      }
      ctx.sfx('stun');
      if (left.length) Fx.announce(left.map(e => e.p.name).join('、') + ' 出局！', '#2b2340');
    }
    nextAfterRes() {
      const ctx = this.ctx;
      if (!this.kid && !this.solo) {
        const al = this.alive();
        if (al.length <= 1) {
          this.phase = 'win'; this.pt = 3; this.music = true; this.winner = al[0] || null;
          if (this.winner) { Fx.announce(this.winner.p.name + ' 贏了！', DEEP); this.hopUp(this.winner, 520); }
          ctx.sfx('win'); Fx.flash(PINK, 0.25);
          for (let i = 0; i < 70; i++) this.confetti.push({ x: rnd(200, 1400), y: rnd(-200, 120), vx: rnd(-90, 90), vy: rnd(40, 220), a: rnd(0, TAU), va: rnd(-8, 8), c: CUSH[rint(6)][0], life: rnd(2.5, 3.5) });
          return;
        }
      } else if (this.round >= this.rounds) { this.over = true; return; }
      this.startWalk();
    }
    removeCushion() {
      // 大人: one fewer cushion than people still in
      const need = Math.max(1, this.alive().length - 1), live = this.cush.filter(c => !c.gone);
      if (live.length <= need) return;
      const c = live[rint(live.length)];
      if (c.who) { c.who.st = 'walk'; c.who.seat = null; this.hopUp(c.who, 400); c.who = null; }
      c.gone = 1; Fx.burst(c.x, c.y, CUSH[c.ci % CUSH.length][0], 22, 360); Fx.ring(c.x, c.y, '#ffffff', 120, 0.5); Fx.pop(c.x, c.y - 60, '少一個！', '#2b2340', 40);
      this.ctx.sfx('pop');
      this.cush = this.cush.filter(q => q !== c); this.respace();
    }

    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      if (!this.announced) { this.announced = true; Fx.announce('音樂開始，繞著走！', DEEP); }
      this.pt -= dt;
      // the cushions slowly turn while the music plays (faster for grown-ups)
      if (this.phase === 'walk') this.spin += dt * (kid ? 0.14 : 0.34);
      for (const c of this.cush) { c.a += wrap(c.ta - c.a) * Math.min(1, dt * 3); spring(c, dt); }
      this.place();
      if (this.phase === 'walk' && this.pt <= 0) this.stopMusic();
      else if (this.phase === 'rush') {
        this.rt += dt; this.rushT -= dt;
        if (!this.free().length) this.endRush(false);
        else if (this.rushT <= 0) this.endRush(true);
      } else if (this.phase === 'res') {
        if (!kid && !this.solo && !this.removed && this.pt < 1.5) { this.removed = true; this.removeCushion(); }
        if (this.pt <= 0) this.nextAfterRes();
      } else if (this.phase === 'win') {
        if (this.pt <= 0) this.over = true;
      }
      // the record player
      this.armA += ((this.music ? 1 : 0) - this.armA) * Math.min(1, dt * 8);
      if (this.music) { this.discA += dt * 5; this.noteT -= dt; if (this.noteT <= 0) { this.noteT = rnd(0.35, 0.6); this.notes.push({ x: 1290 + rnd(-10, 10), y: 150, vx: rnd(-40, 30), t: 0, s: rnd(0.8, 1.2), c: CUSH[rint(6)][1], ch: Math.random() < 0.5 ? '♪' : '♫' }); } }
      for (const q of this.notes) { q.t += dt; q.x += (q.vx + Math.sin(q.t * 4) * 30) * dt; q.y -= 46 * dt; }
      this.notes = this.notes.filter(q => q.t < 1.8);
      this.scratchT -= dt;
      for (const c of this.confetti) if (c.life > 0) { c.life -= dt; c.vy += 260 * dt; c.vx *= 0.99; c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt; }

      for (const e of this.es) this.step(e, dt);
      this.collide();
    }
    step(e, dt) {
      const ctx = this.ctx, kid = this.kid, ph = this.phase;
      spring(e, dt); e.sayT -= dt; e.cd -= dt;
      if (e.hop > 0 || e.hopV > 0) { e.hopV -= 1800 * dt; e.hop = Math.max(0, e.hop + e.hopV * dt); if (e.hop <= 0) { if (e.hopV < -200) e.sq = 0.18; e.hopV = 0; } }
      if (e.st !== 'walk') ctx.pressed(e.p, 0);   // presses while sitting don't pile up
      if (e.st === 'out') {
        // walk over to the sofa, be sad for a moment, then cheer everyone on
        e.sad -= dt;
        const [sx, sy] = SEATS[e.sofa % SEATS.length];
        if (!e.onSofa) {
          const dx = sx - e.x, dy = sy - e.y, d = hyp(dx, dy);
          if (d < 12) { e.onSofa = true; e.x = sx; e.y = sy; e.vx = e.vy = 0; e.sq = 0.25; ctx.sfx('pop'); Fx.dust(e.x, e.y + 26, 'rgba(255,255,255,.8)', 12); }
          else { const sp = 280; steer(e, dx / d, dy / d, Math.min(sp, d * 6), dt, 10); e.x += e.vx * dt; e.y += e.vy * dt; e.face = Math.atan2(dy, dx); e.walk += dt * (6 + hyp(e.vx, e.vy) / 40); Fx.walk(e, dt, 'rgba(255,240,220,.85)'); }
        } else {
          e.face = Math.atan2(CY - e.y, CX - e.x);
          if (e.sad <= 0) {
            e.cheer -= dt;
            if (e.cheer <= 0) { e.cheer = rnd(1.4, 3.2); this.hopUp(e, rnd(300, 420)); if (Math.random() < 0.4) this.say(e, ['加油！', '快坐快坐！', '衝啊～', '好緊張！'][rint(4)], 1.1); }
          }
        }
        return;
      }
      if (e.st === 'sit') {
        if (e.snap < 1) e.snap = Math.min(1, e.snap + dt / 0.16);
        const c = e.seat; if (c) { e.x = c.x; e.y = c.y; }
        if (this.phase === 'win' && e === this.winner) { e.cheer -= dt; if (e.cheer <= 0) { e.cheer = 0.55; this.hopUp(e, 460); } }
        return;
      }
      // standing
      if (e.freeze > 0) {
        e.freeze -= dt; e.vx = e.vy = 0;
        if (e.freeze <= 0) { e.sq = -0.25; e.sqv = 0; for (let k = 0; k < 3; k++) Fx.dust(e.x, e.y + e.r * 0.7, 'rgba(255,240,220,.9)', 11); }
        return;
      }
      if (e.stun > 0) { e.stun -= dt; }
      const i = e.stun > 0 ? { x: 0, y: 0 } : ctx.input(e.p);
      if (ctx.pressed(e.p, 0) && e.cd <= 0 && e.stun <= 0) {
        let dx = i.x, dy = i.y; if (!dx && !dy) { dx = Math.cos(e.face); dy = Math.sin(e.face); }
        const m = hyp(dx, dy) || 1; e.dx = dx / m; e.dy = dy / m; e.dash = 0.22; e.cd = kid ? 0.9 : 1.2; e.sq = -0.22; e.sqv = 0;
        ctx.sfx('whoosh'); for (let k = 0; k < 3; k++) Fx.dust(e.x - e.dx * 18, e.y + e.r * 0.7, 'rgba(255,240,220,.9)', 12);
      }
      e.dash -= dt;
      let ix = i.x, iy = i.y; if (e.dash > 0) { ix = e.dx; iy = e.dy; }
      const sp = (kid ? 300 : 335) * (e.dash > 0 ? 2.3 : 1);
      if (ix || iy) e.face = Math.atan2(iy, ix);
      steer(e, ix, iy, sp, dt, e.dash > 0 ? 24 : 13);
      const kf = Math.exp(-5 * dt); e.kx *= kf; e.ky *= kf;
      e.x += (e.vx + e.kx) * dt; e.y += (e.vy + e.ky) * dt;
      // while the music plays, the cushion circle is off limits: walk round it
      if (ph === 'walk') {
        const qx = (e.x - CX) / KRX, qy = (e.y - CY) / KRY, q = hyp(qx, qy);
        if (q < 1) {
          const ux = q > 0.01 ? qx / q : 0, uy = q > 0.01 ? qy / q : -1, tx = CX + ux * KRX, ty = CY + uy * KRY, k = Math.min(1, dt * 12);
          e.x += (tx - e.x) * k; e.y += (ty - e.y) * k;
        }
        // are we going round? (angular speed along the path)
        const th = Math.atan2((e.y - CY) / PRY, (e.x - CX) / PRX), dth = wrap(th - e.th); e.th = th;
        e.av += (dth / dt - e.av) * Math.min(1, dt * 3);
        if (Math.abs(e.av) < 0.3) e.idle += dt; else e.idle = Math.max(0, e.idle - dt * 2);
        const was = e.lazy; e.lazy = e.idle > (kid ? 2.5 : 1.6);
        if (e.lazy && !was) this.say(e, kid ? '跟著箭頭繞圈圈～' : '要繞著走喔！', 1.6);
      } else { e.th = Math.atan2((e.y - CY) / PRY, (e.x - CX) / PRX); e.lazy = false; e.idle = 0; }
      e.x = clamp(e.x, BX0, BX1); e.y = clamp(e.y, BY0, BY1);
      for (const s of SOFAS) if (e.x > s.x0 - 20 && e.x < s.x1 + 20 && e.y > SOFA_Y) e.y = SOFA_Y;
      const s = hyp(e.vx, e.vy); if (s > 30) e.walk += dt * (6 + s / 40);
      Fx.walk(e, dt, 'rgba(255,240,220,.85)');
      // touch a free cushion to sit on it
      if (ph === 'rush') {
        for (const c of this.cush) {
          const d = hyp(e.x - c.x, (e.y - c.y) * 1.25);
          if (d < 52) { if (!c.who) { this.sit(e, c); break; } else if (e.missT <= 0) { e.missT = 0.8; Fx.pop(c.x, c.y - 70, '有人了！', '#2b2340', 28); } }
        }
        e.missT -= dt;
      }
    }
    collide() {
      const ctx = this.ctx, kid = this.kid, st = this.es.filter(e => e.st === 'walk');
      for (let a = 0; a < st.length; a++) for (let b = a + 1; b < st.length; b++) {
        const A = st[a], B = st[b], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
        if (d >= m || d <= 0) continue;
        const nx = dx / d, ny = dy / d, ov = (m - d) / 2;
        A.x -= nx * ov; A.y -= ny * ov; B.x += nx * ov; B.y += ny * ov;
        // 大人: a dash bumps the other one aside
        if (!kid && this.phase !== 'walk' && (A.dash > 0) !== (B.dash > 0) && A.freeze <= 0 && B.freeze <= 0) {
          const [P, Q, s] = A.dash > 0 ? [A, B, 1] : [B, A, -1];
          if (Q.stun > 0) continue;
          Q.kx += nx * s * 560; Q.ky += ny * s * 560; Q.stun = 0.35; Q.sq = 0.3; P.dash = 0; P.vx *= 0.3; P.vy *= 0.3; P.sq = -0.2;
          ctx.sfx('bonk', 0.7); ctx.buzz(Q.p, 120); ctx.hitstop(0.04);
          const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2;
          Fx.burst(cx, cy, '#ffe066', 10, 280); Fx.ring(cx, cy, '#fff', 80, 0.3); Fx.shake(7); Fx.pop(cx, cy - 50, '碰！', '#ff5a3d', 40);
        }
      }
      // people sitting are solid
      for (const e of st) for (const c of this.cush) {
        if (!c.who) continue;
        const dx = e.x - c.x, dy = e.y - c.y, d = hyp(dx, dy), m = e.r + 34;
        if (d < m && d > 0) { e.x = c.x + dx / d * m; e.y = c.y + dy / d * m; }
      }
    }

    /* ---------------- drawing ---------------- */
    paintBg(g) {
      // back wall with striped wallpaper
      g.fillStyle = '#ffe7d1'; g.fillRect(0, 0, W, 214);
      g.fillStyle = '#ffdcbf'; for (let x = 0; x < W; x += 56) g.fillRect(x, 0, 24, 214);
      g.fillStyle = 'rgba(255,255,255,.5)'; for (let x = 28; x < W; x += 56) for (let y = 120; y < 214; y += 34) { g.beginPath(); g.arc(x + 12, y, 3, 0, TAU); g.fill(); }
      // window with curtains
      g.fillStyle = '#c98f5a'; g.beginPath(); g.roundRect(140, 104, 250, 96, 10); g.fill();
      const sky = g.createLinearGradient(0, 110, 0, 196); sky.addColorStop(0, '#8fd6ff'); sky.addColorStop(1, '#d4f1ff');
      g.fillStyle = sky; g.fillRect(150, 112, 230, 80);
      g.fillStyle = '#fff'; for (const [x, y, r] of [[200, 150, 16], [220, 142, 20], [242, 152, 14], [320, 136, 12], [336, 130, 15]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      g.fillStyle = '#c98f5a'; g.fillRect(262, 112, 8, 80);
      g.fillStyle = '#f472b6'; for (const s of [-1, 1]) { const x = s < 0 ? 128 : 362; g.beginPath(); g.moveTo(x, 98); g.lineTo(x + 40, 98); g.quadraticCurveTo(x + 20 + s * 4, 160, x + 34 - (s < 0 ? 0 : 6), 206); g.lineTo(x + 6, 206); g.quadraticCurveTo(x - 4, 150, x, 98); g.fill(); }
      g.fillStyle = '#be4b8b'; g.fillRect(118, 94, 296, 8);
      // picture frames
      for (const [x, y, w, h, c] of [[460, 150, 56, 44, '#86efac'], [1090, 150, 56, 44, '#7dd3fc']]) {
        g.fillStyle = '#a0683a'; g.beginPath(); g.roundRect(x - 6, y - 6, w + 12, h + 12, 6); g.fill();
        g.fillStyle = c; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x + w * 0.5, y + h * 0.48, Math.min(w, h) * 0.22, 0, TAU); g.fill();
      }
      // party bunting across the wall
      g.strokeStyle = '#a0683a'; g.lineWidth = 3; g.beginPath(); g.moveTo(540, 146); g.quadraticCurveTo(800, 206, 1060, 146); g.stroke();
      for (let i = 0; i < 15; i++) {
        const k = (i + 0.5) / 15, x = 540 + (1060 - 540) * k, y = 146 + 4 * k * (1 - k) * 30, c = CUSH[i % 6][0];
        g.fillStyle = c; g.beginPath(); g.moveTo(x - 14, y - 2); g.lineTo(x + 14, y - 2); g.lineTo(x, y + 24); g.closePath(); g.fill();
      }
      // skirting board
      g.fillStyle = '#e0a979'; g.fillRect(0, 206, W, 16); g.fillStyle = '#c98f5a'; g.fillRect(0, 220, W, 4);
      // wooden floor
      g.fillStyle = '#e9b981'; g.fillRect(0, 224, W, H - 224);
      for (let r = 0, y = 224; y < H; y += 44, r++) {
        g.fillStyle = r % 2 ? '#e4b179' : '#edbf88'; g.fillRect(0, y, W, 44);
        g.fillStyle = 'rgba(150,90,40,.28)'; g.fillRect(0, y + 42, W, 2);
        for (let x = (r * 173) % 260 - 260; x < W; x += 260) g.fillRect(x, y, 2, 44);
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y + 4, W, 6);
      }
      // the big round rug
      g.fillStyle = 'rgba(120,60,40,.18)'; g.beginPath(); g.ellipse(CX + 8, CY + 14, 512, 318, 0, 0, TAU); g.fill();
      g.fillStyle = '#c084fc'; g.beginPath(); g.ellipse(CX, CY, 508, 312, 0, 0, TAU); g.fill();
      g.fillStyle = '#f5d0fe'; g.beginPath(); g.ellipse(CX, CY, 492, 298, 0, 0, TAU); g.fill();
      // fringe
      g.strokeStyle = '#fff4fd'; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i < 120; i++) { const a = i * TAU / 120, x = CX + Math.cos(a) * 508, y = CY + Math.sin(a) * 312; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 9); }
      g.stroke();
      // the walking path: a soft lighter band
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 104; g.beginPath(); g.ellipse(CX, CY, PRX, PRY, 0, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(232,121,249,.35)'; g.lineWidth = 4; for (const k of [-52, 52]) { g.beginPath(); g.ellipse(CX, CY, PRX + k, PRY + k * 0.6, 0, 0, TAU); g.stroke(); }
      // the cushion circle: a round mat with a star pattern
      g.fillStyle = '#f0abfc'; g.beginPath(); g.ellipse(CX, CY, KRX - 12, KRY - 10, 0, 0, TAU); g.fill();
      g.fillStyle = '#fbe4ff'; g.beginPath(); g.ellipse(CX, CY, KRX - 26, KRY - 22, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(232,121,249,.35)';
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + 0.3, x = CX + Math.cos(a) * 96, y = CY + Math.sin(a) * 56; this.star(g, x, y, 10); }
      this.star(g, CX, CY, 22);
      // corner decorations: a potted plant, a lamp, presents and balloons
      this.plant(g, 110, 300); this.lamp(g, 1490, 300);
      this.gifts(g, 1150, 250);
      for (const [x, y, c] of [[40, 70, '#ff8fab'], [72, 52, '#7dd3fc'], [96, 82, '#fde047'], [1520, 64, '#86efac'], [1556, 46, '#c4b5fd'], [1576, 84, '#fdba74']]) {
        g.strokeStyle = 'rgba(80,60,60,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 34); g.quadraticCurveTo(x + 6, y + 80, x - 2, y + 140); g.stroke();
        g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 26, 32, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x - 9, y - 11, 6, 10, -0.4, 0, TAU); g.fill();
        g.fillStyle = c; g.beginPath(); g.moveTo(x - 5, y + 36); g.lineTo(x + 5, y + 36); g.lineTo(x, y + 30); g.fill();
      }
      // record player cabinet
      g.fillStyle = 'rgba(80,40,20,.2)'; g.beginPath(); g.ellipse(1300, 252, 110, 14, 0, 0, TAU); g.fill();
      g.fillStyle = '#a0683a'; g.beginPath(); g.roundRect(1200, 176, 200, 74, 10); g.fill();
      g.fillStyle = '#b97b47'; g.beginPath(); g.roundRect(1210, 196, 85, 46, 6); g.fill(); g.beginPath(); g.roundRect(1305, 196, 85, 46, 6); g.fill();
      g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(1285, 219, 4, 0, TAU); g.arc(1315, 219, 4, 0, TAU); g.fill();
      g.fillStyle = '#e05780'; g.beginPath(); g.roundRect(1214, 136, 172, 46, 10); g.fill();
      g.fillStyle = '#ff8fab'; g.beginPath(); g.roundRect(1214, 136, 172, 36, 10); g.fill();
      // sofas (the seat fronts are drawn over the spectators later)
      for (const s of SOFAS) {
        g.fillStyle = 'rgba(80,40,20,.22)'; g.beginPath(); g.ellipse((s.x0 + s.x1) / 2, 876, (s.x1 - s.x0) / 2 + 16, 16, 0, 0, TAU); g.fill();
        g.fillStyle = s.d; g.beginPath(); g.roundRect(s.x0 + 10, 752, s.x1 - s.x0 - 20, 70, 22); g.fill();
        g.fillStyle = s.c; g.beginPath(); g.roundRect(s.x0 + 16, 756, s.x1 - s.x0 - 32, 58, 18); g.fill();
        g.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 3; k++) { const w = (s.x1 - s.x0 - 60) / 3; g.beginPath(); g.roundRect(s.x0 + 30 + k * w, 764, w - 8, 40, 12); g.fill(); }
        g.fillStyle = s.d; g.beginPath(); g.roundRect(s.x0 + 8, 806, s.x1 - s.x0 - 16, 44, 14); g.fill();
      }
    }
    star(g, x, y, r) {
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7); }
      g.closePath(); g.fill();
    }
    plant(g, x, y) {
      g.fillStyle = 'rgba(80,40,20,.2)'; g.beginPath(); g.ellipse(x, y + 40, 44, 12, 0, 0, TAU); g.fill();
      for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.42; g.fillStyle = k % 2 ? '#3fae4a' : '#4fc25a'; g.beginPath(); g.ellipse(x + Math.cos(a) * 34, y - 34 + Math.sin(a) * 30, 30, 12, a, 0, TAU); g.fill(); }
      g.fillStyle = '#e07b4a'; g.beginPath(); g.moveTo(x - 32, y - 10); g.lineTo(x + 32, y - 10); g.lineTo(x + 24, y + 40); g.lineTo(x - 24, y + 40); g.closePath(); g.fill();
      g.fillStyle = '#f39a6a'; g.fillRect(x - 36, y - 16, 72, 12);
    }
    lamp(g, x, y) {
      g.fillStyle = 'rgba(80,40,20,.2)'; g.beginPath(); g.ellipse(x, y + 40, 34, 10, 0, 0, TAU); g.fill();
      g.fillStyle = '#7c5cd6'; g.beginPath(); g.ellipse(x, y + 36, 28, 9, 0, 0, TAU); g.fill();
      g.fillStyle = '#5b3fb0'; g.fillRect(x - 4, y - 70, 8, 106);
      g.fillStyle = 'rgba(255,240,170,.25)'; g.beginPath(); g.ellipse(x, y - 60, 70, 46, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.moveTo(x - 26, y - 116); g.lineTo(x + 26, y - 116); g.lineTo(x + 42, y - 64); g.lineTo(x - 42, y - 64); g.closePath(); g.fill();
      g.fillStyle = '#ffd36b'; g.fillRect(x - 42, y - 68, 84, 6);
    }
    gifts(g, x, y) {
      for (const [dx, dy, w, h, c, r] of [[-40, 6, 52, 44, '#7dd3fc', '#ff8fab'], [14, 10, 44, 38, '#fde047', '#7c5cd6'], [-14, -28, 38, 34, '#86efac', '#e05780']]) {
        g.fillStyle = 'rgba(80,40,20,.18)'; g.fillRect(x + dx + 4, y + dy + h - 4, w, 8);
        g.fillStyle = c; g.fillRect(x + dx, y + dy, w, h);
        g.fillStyle = r; g.fillRect(x + dx + w / 2 - 4, y + dy, 8, h); g.fillRect(x + dx, y + dy + h / 2 - 4, w, 8);
        g.beginPath(); g.ellipse(x + dx + w / 2 - 9, y + dy - 4, 9, 6, -0.5, 0, TAU); g.ellipse(x + dx + w / 2 + 9, y + dy - 4, 9, 6, 0.5, 0, TAU); g.fill();
      }
    }
    drawPath(g, t) {
      // chevrons marching round the path, showing which way to go
      const on = this.phase === 'walk', n = 18, off = (this.spin * 0.8 + t * 0.12) % (TAU / n);
      g.globalAlpha = on ? 0.85 : 0.25; g.strokeStyle = on ? PINK : '#d8a0e6'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n + off, x = CX + Math.cos(a) * PRX, y = CY + Math.sin(a) * PRY;
        let tx = -Math.sin(a) * PRX, ty = Math.cos(a) * PRY; const m = hyp(tx, ty); tx /= m; ty /= m;
        const nx = -ty, ny = tx, L = 14;
        g.moveTo(x - tx * L + nx * L, y - ty * L + ny * L); g.lineTo(x, y); g.lineTo(x - tx * L - nx * L, y - ty * L - ny * L);
      }
      g.stroke(); g.globalAlpha = 1;
    }
    drawRecord(g, t) {
      const x = 1300, y = 150;
      g.fillStyle = '#2b2340'; g.beginPath(); g.ellipse(x - 14, y, 58, 20, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2;
      for (const k of [0.75, 0.55]) { g.beginPath(); g.ellipse(x - 14, y, 58 * k, 20 * k, 0, 0, TAU); g.stroke(); }
      const a = this.discA; g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x - 14, y, 48, 16, 0, a, a + 0.8); g.stroke();
      g.fillStyle = PINK; g.beginPath(); g.ellipse(x - 14, y, 14, 5, 0, 0, TAU); g.fill();
      // tone arm: down on the record while the music plays, lifted when it stops
      const lift = 1 - this.armA, ang = -2.3 + this.armA * 0.5 - lift * 0.15;
      g.strokeStyle = '#cfd3e6'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x + 58, y - 6); const ex = x + 58 + Math.cos(ang) * 64, ey = y - 6 + Math.sin(ang) * 22 - lift * 16; g.lineTo(ex, ey); g.stroke();
      g.fillStyle = '#8f93ad'; g.beginPath(); g.arc(x + 58, y - 6, 8, 0, TAU); g.fill();
      for (const q of this.notes) {
        g.globalAlpha = q.t < 0.2 ? q.t / 0.2 : 1 - Math.max(0, q.t - 1.2) / 0.6;
        g.font = `900 ${Math.round(34 * q.s)}px "Fredoka",system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 6; g.strokeStyle = '#fff'; g.strokeText(q.ch, q.x, q.y); g.fillStyle = q.c; g.fillText(q.ch, q.x, q.y);
      }
      g.globalAlpha = 1;
      if (this.scratchT > 0) {   // ZZZRT: zigzag scratch lines
        g.strokeStyle = '#ff3b4a'; g.lineWidth = 5; g.globalAlpha = Math.min(1, this.scratchT * 2);
        for (const s of [-1, 1]) { g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(x - 14 + s * (66 + k * 9), y - 20 + (k % 2 ? 10 : -10)); g.stroke(); }
        g.globalAlpha = 1;
      }
    }
    drawCushions(g, t) {
      const rush = this.phase === 'rush';
      for (const c of this.cush) {
        if (rush && !c.who) {   // free cushions glow while everyone scrambles
          const pu = 0.5 + 0.5 * Math.sin(t * 12);
          g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 14; g.beginPath(); g.ellipse(c.x, c.y + 2, 66 + pu * 6, 46 + pu * 4, 0, 0, TAU); g.stroke();
          g.strokeStyle = PINK; g.lineWidth = 5; g.beginPath(); g.ellipse(c.x, c.y + 2, 66 + pu * 6, 46 + pu * 4, 0, 0, TAU); g.stroke();
        }
        drawCushion(g, c.x, c.y, c.ci, c.sq);
      }
    }
    drawHelp(g, t) {
      // 小朋友: a glowing arrow from each standing player to the nearest free cushion
      const free = this.free(); if (!free.length) return;
      for (const e of this.es) {
        if (e.st !== 'walk') continue;
        let best = null, bd = 1e9; for (const c of free) { const d = hyp(c.x - e.x, c.y - e.y); if (d < bd) { bd = d; best = c; } }
        if (!best || bd < 70) continue;
        const ux = (best.x - e.x) / bd, uy = (best.y - e.y) / bd, sx = e.x + ux * 40, sy = e.y + uy * 40, ex = best.x - ux * 56, ey = best.y - uy * 56;
        const col = PARTY_COLORS[e.p.col].c, pu = 0.6 + 0.4 * Math.sin(t * 10);
        g.lineCap = 'round'; g.setLineDash(DASH); g.lineDashOffset = -t * 90;
        for (const [w, c, a] of [[22, '#ffffff', 0.35 * pu], [12, col, 0.45], [6, '#ffffff', 0.95]]) {
          g.globalAlpha = a; g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
        }
        g.setLineDash(NODASH);
        g.globalAlpha = 1; g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(ex + ux * 22, ey + uy * 22); g.lineTo(ex - ux * 10 - uy * 18, ey - uy * 10 + ux * 18); g.lineTo(ex - ux * 10 + uy * 18, ey - uy * 10 - ux * 18); g.closePath(); g.fill(); g.stroke();
      }
      g.globalAlpha = 1;
    }
    drawWalker(g, e, t) {
      const C = PARTY_COLORS[e.p.col], s = hyp(e.vx, e.vy), m = Math.min(1, s / 220), bob = Math.abs(Math.sin(e.walk));
      let hop = bob * 9 * m + e.hop, sq = e.sq + (0.5 - bob) * 0.08 * m, rot = clamp(e.vx / 2600, -0.14, 0.14);
      const frozen = e.freeze > 0;
      if (frozen) { hop = e.fhop + e.hop; rot = e.frot; sq = -0.04; }
      if (e.dash > 0) {
        g.globalAlpha = 0.28; g.fillStyle = C.c;
        for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(e.x - e.dx * k * 15, e.y - hop - e.dy * k * 15, e.r * (1 - k * 0.12), 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      const sad = e.st === 'out' && e.sad > 0, happy = (e.st === 'out' && !sad && e.hop > 0) || (this.phase === 'res' && e.st === 'sit');
      drawCritter(g, e.x + (frozen ? Math.sin(t * 70) * 1.5 : 0), e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: sq, hop, rot, stun: e.stun > 0 || sad, blink: !frozen && (t + e.p.uid * 1.3) % 3.6 < 0.12, happy });
      if (sad) {   // a little tear
        const k = (t * 1.6) % 1; g.fillStyle = '#7fd0ff'; g.globalAlpha = 1 - k;
        g.beginPath(); g.ellipse(e.x + e.r * 0.42, e.y - hop + k * 22, 4.5, 7, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
      if (e.lazy && this.phase === 'walk' && !this.kid) {   // dawdling: a little ! ring
        g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 10); g.strokeStyle = '#ff7a1f'; g.lineWidth = 4; g.setLineDash([10, 8]);
        g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.75, e.r * 1.1, e.r * 0.36, 0, 0, TAU); g.stroke(); g.setLineDash(NODASH); g.globalAlpha = 1;
      }
    }
    drawSitter(g, e, t) {
      const c = e.seat, k = e.snap, x = c ? (e.sx0 + (c.x - e.sx0) * k) : e.x, y0 = c ? (e.sy0 + (c.y - e.sy0) * k) : e.y;
      const hop = Math.sin(k * Math.PI) * 46 + e.hop + 14;
      drawCritter(g, x, y0, e.r, e.p.col, e.p.animal, { face: Math.PI / 2, squash: 0.08 + e.sq, hop, happy: true, noShadow: true });
    }
    add(y, k, o) { let it = this.dl[this.dn]; if (!it) it = this.dl[this.dn] = { y: 0, k: 0, o: null }; it.y = y; it.k = k; it.o = o; this.dn++; }
    draw(g) {
      const t = this.t;
      bgLayer(this, g, cg => this.paintBg(cg));
      Fx.ground(g);
      this.drawPath(g, t);
      this.drawCushions(g, t);
      if (this.kid && this.phase === 'rush') this.drawHelp(g, t);
      // everyone sorted by depth (spectators on the sofa come after, with the sofa front over their legs)
      this.dn = 0;
      for (const e of this.es) { if (e.st === 'out' && e.onSofa) continue; this.add(e.y, e.st === 'sit' ? 1 : 0, e); }
      const L = this.dl;
      for (let i = 1; i < this.dn; i++) { const it = L[i]; let j = i - 1; while (j >= 0 && L[j].y > it.y) { L[j + 1] = L[j]; j--; } L[j + 1] = it; }
      for (let i = 0; i < this.dn; i++) { const it = L[i]; if (it.k === 1) this.drawSitter(g, it.o, t); else this.drawWalker(g, it.o, t); }
      for (const e of this.es) if (e.st === 'out' && e.onSofa) this.drawWalker(g, e, t);
      for (const s of SOFAS) {
        if (!this.es.some(e => e.onSofa)) break;
        g.fillStyle = s.d; g.beginPath(); g.roundRect(s.x0 + 8, 822, s.x1 - s.x0 - 16, 30, 14); g.fill();
        g.fillStyle = s.c; g.beginPath(); g.roundRect(s.x0 + 14, 822, s.x1 - s.x0 - 28, 20, 10); g.fill();
        for (const sx of [s.x0, s.x1]) { g.fillStyle = s.d; g.beginPath(); g.roundRect(sx - 12, 772, 28, 84, 14); g.fill(); g.fillStyle = s.c; g.beginPath(); g.roundRect(sx - 8, 776, 20, 30, 10); g.fill(); }
      }
      if (!this.es.some(e => e.onSofa)) for (const s of SOFAS) for (const sx of [s.x0, s.x1]) { g.fillStyle = s.d; g.beginPath(); g.roundRect(sx - 12, 772, 28, 84, 14); g.fill(); g.fillStyle = s.c; g.beginPath(); g.roundRect(sx - 8, 776, 20, 30, 10); g.fill(); }
      this.drawRecord(g, t);
      // name tags, then the ‼ and speech bubbles on top
      for (const e of this.es) {
        const sit = e.st === 'sit', hop = sit ? Math.sin(e.snap * Math.PI) * 46 + e.hop + 14 : e.hop + (e.freeze > 0 ? e.fhop : 0);
        const x = sit && e.seat ? e.seat.x : e.x, y = sit && e.seat ? e.seat.y : e.y;
        drawTag(g, x, y - e.r - 30 - hop, e.p);
        if (this.kid && e.stars) { g.font = `900 20px "Fredoka",${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = '#fff'; const s2 = '⭐' + e.stars; g.strokeText(s2, x, y + e.r + 16); g.fillStyle = '#b07000'; g.fillText(s2, x, y + e.r + 16); }
        if (e.freeze > 0) bangMark(g, x + 30, y - e.r - 74 - hop, t, Math.min(1, e.freeze * 4));
        if (e.sayT > 0 && e.say) bubble(g, x, y - e.r - 84 - hop - (e.freeze > 0 ? 30 : 0), e.say, e.st === 'out' ? '#6a5a8a' : DEEP, 22);
      }
      if (this.phase === 'win') {
        const w = this.winner;
        if (w && w.seat) { g.font = '54px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👑', w.seat.x, w.seat.y - w.r - 96 - w.hop - Math.sin(t * 6) * 6); }
        for (const c of this.confetti) { if (c.life <= 0) continue; g.save(); g.translate(c.x, c.y); g.rotate(c.a); g.fillStyle = c.c; g.fillRect(-7, -4, 14, 8); g.restore(); }
      }
      if (this.phase === 'rush' && this.rt > 0.45) {   // a shrinking ring of time on the record player side
        const k = clamp(this.rushT / ((this.kid ? 4.2 : 3.5)), 0, 1);
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(CX, CY, 34, 0, TAU); g.fill();
        g.strokeStyle = k < 0.35 ? '#ff3b4a' : PINK; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.arc(CX, CY, 34, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
        g.font = `900 30px "Fredoka",${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2b2340'; g.fillText(String(Math.ceil(this.rushT)), CX, CY + 1);
      }
    }

    center() {
      const k = this.cush.length;
      if (this.solo) return `練習 第 ${Math.min(this.round, this.rounds)} / ${this.rounds} 輪・最快 ${this.es[0].best != null ? this.es[0].best.toFixed(2) + ' 秒' : '—'}`;
      if (this.kid) return `第 ${Math.min(this.round, this.rounds)} / ${this.rounds} 輪・🪑 坐墊 ${k} 個`;
      if (this.phase === 'win') return '🏆 最後坐著的人！';
      return `第 ${this.round} 輪・還有 ${this.alive().length} 人・🪑 坐墊 ${k} 個`;
    }
    chip(p) {
      const e = this.by.get(p);
      if (this.solo) return e.best != null ? '⏱ ' + e.best.toFixed(2) : '⏱ —';
      if (this.kid) return '⭐ ' + e.stars;
      if (e.st === 'out') return '出局';
      return e.st === 'sit' ? '🪑 坐到了' : '🎵 在場';
    }
    pad(p) {
      const e = this.by.get(p), ph = this.phase;
      if (e.st === 'out') return '出局了，在沙發上幫大家加油！';
      if (ph === 'win') return e === this.winner ? '🏆 你贏了！' : '比賽結束！';
      if (e.st === 'sit') return this.solo && e.best != null ? `你坐到了！最快 ${e.best.toFixed(2)} 秒` : '你坐到了！🎉';
      if (ph === 'walk') return e.lazy ? '要繞著走喔！🎵' : '🎵 繞著走～音樂停了就搶坐墊';
      if (ph === 'rush') return e.freeze > 0 ? '‼ 音樂停了！' : '音樂停了！快坐！按衝刺 💨';
      return this.kid ? '下一輪再加油！' : '等下一輪…';
    }
    ready(p) { const e = this.by.get(p); return e.st === 'walk' && e.cd <= 0 && e.freeze <= 0 && e.stun <= 0; }
    results() {
      const es = this.es;
      if (this.solo) {
        const e = es[0];
        return { rows: [{ p: e.p, key: 0, line: e.best != null ? `最快 ${e.best.toFixed(2)} 秒・坐到 ${e.sits} 次` : `坐到 ${e.sits} 次` }], title: e.best != null ? `最快 ${e.best.toFixed(2)} 秒就坐下！` : '練習完成！' };
      }
      if (this.kid) return { rows: es.slice().sort((a, b) => b.stars - a.stars).map(e => ({ p: e.p, key: e.stars, line: `坐到 ${e.stars} 次 ⭐` })) };
      const al = this.alive().length;
      const rows = es.slice().sort((a, b) => ((a.st === 'out') - (b.st === 'out')) || (b.outAt - a.outAt) || (b.sits - a.sits)).map(e => e.st === 'out'
        ? { p: e.p, key: 'o' + e.outAt, line: `第 ${e.outAt} 個出局・坐到 ${e.sits} 次` }
        : { p: e.p, key: 'alive', line: (al === 1 ? '最後坐著的人！' : '還沒出局') + `・坐到 ${e.sits} 次` });
      return { rows };
    }
  }

  GAMES.push({
    id: 'chairs', name: '搶椅子', icon: '🪑', col: '#e879f9', bg: '#c98f5a', kind: 'vs', players: '1–6 人',
    blurb: '音樂一停，快搶坐墊坐下！',
    btn: { label: '衝刺', icon: '💨' },
    rules: kid => kid
      ? ['音樂響的時候，跟著箭頭繞著坐墊走', '音樂一停，快跑去坐空的坐墊！發光的箭頭會帶路', '坐到就得到一顆 ⭐，沒坐到也不會出局', '玩 6 輪，⭐ 最多的人贏']
      : ['音樂響時繞圈走，坐墊會慢慢轉，站著不動會發呆', '音樂一停就搶坐墊，一個坐墊只能坐一個人', '「衝刺」可以衝過去，還能把別人撞開', '沒坐到的人出局，每輪少一個坐墊，最後坐著的人贏'],
    thumb(g) {
      g.fillStyle = '#e9b981'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = 'rgba(150,90,40,.25)'; for (let y = 22; y < 180; y += 22) g.fillRect(0, y, 320, 2);
      g.fillStyle = '#ffe7d1'; g.fillRect(0, 0, 320, 34);
      g.fillStyle = '#c084fc'; g.beginPath(); g.ellipse(160, 110, 150, 66, 0, 0, TAU); g.fill();
      g.fillStyle = '#f5d0fe'; g.beginPath(); g.ellipse(160, 110, 143, 60, 0, 0, TAU); g.fill();
      g.save(); g.translate(160, 110); g.scale(0.62, 0.62);
      drawCushion(g, -120, 4, 0, 0); drawCushion(g, 0, -40, 1, 0); drawCushion(g, 120, 4, 2, 0);
      g.restore();
      drawCritter(g, 86, 98, 20, 3, 0, { happy: true, hop: 8, noShadow: true });
      drawCritter(g, 160, 72, 20, 1, 2, { happy: true, hop: 8, noShadow: true });
      drawCritter(g, 250, 140, 20, 0, 3, { face: Math.PI, hop: 4 });
      g.font = '900 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = '#fff'; g.strokeText('‼', 276, 104); g.fillStyle = '#ff3b4a'; g.fillText('‼', 276, 104);
      g.fillStyle = '#a21caf'; g.font = '900 26px system-ui'; g.fillText('♪', 40, 52); g.fillText('♫', 286, 44);
    },
    create: ctx => new Chairs(ctx)
  });
})();
