'use strict';
/* 拔河比賽 — ☀️ 太陽隊 vs 🌙 月亮隊 on one long rope over a mud pit. The phone is one giant 「拉！」 button.
   Each team's pull is the AVERAGE of its players' tapping, so 1 vs 2 is still a fair fight.
   Drag the red ribbon over your own chalk line to win the round; best of 3 rounds.
   Halfway through every round comes 「⚡ 大力時間」: every pull counts double for a few seconds.
   小朋友: every tap pulls; a round lasts 25 s at most.
   大人:   taps on the 「嘿咻」 beat pull much harder (and build a combo); mashing too fast makes you slip.
   One player alone pulls against the 大熊隊 (two computer bears). */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', RFONT = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const COL = '#e8590c', CX = 800, ROPE_Y = 560, LINE = 250, GAP = 170, STEP = 116;
  const BEAT = 0.62;   // seconds between 「嘿咻」 beats (大人)

  class Tug {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = null; this.edge = '#5aa346';
      this.solo = !ctx.teams; this.teams = !!ctx.teams;
      this.es = ctx.players.map(p => ({ p, side: this.solo ? 0 : ctx.teamOf(p), pow: 0, taps: 0, beats: 0, combo: 0, best: 0, slip: 0, rate: 0, lean: 0, heave: 0, say: 0, sayT: '', cpu: false, r: 34 }));
      if (this.solo) {   // the 大熊隊: two big computer bears
        for (let k = 0; k < 2; k++) this.es.push({ p: { name: '大熊' + (k ? '二' : '一'), col: 2 + k * 3, animal: 3, uid: -1 - k, team: 1, online: true }, side: 1, pow: 0, taps: 0, beats: 0, combo: 0, best: 0, slip: 0, rate: 0, lean: 0, heave: 0, say: 0, sayT: '', cpu: true, r: 40, cpuT: rnd(0, 0.3) });
      }
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.wins = [0, 0]; this.round = 0; this.pos = 0; this.vel = 0; this.phase = 'ready'; this.pt = 2.2; this.rt = 0;
      this.limit = this.kid ? 25 : 30; this.power = 0; this.powerDone = false; this.beatT = 0; this.beatN = 0; this.flash = [0, 0];
      this.bubbles = []; this.splash = [];
      this.clouds = []; for (let i = 0; i < 6; i++) this.clouds.push({ x: rnd(0, W), y: rnd(40, 170), s: rnd(0.6, 1.2), v: rnd(6, 16) });
      this.flowers = []; for (let i = 0; i < 70; i++) { const y = rnd(330, 880); if (Math.abs(y - ROPE_Y) < 60) continue; this.flowers.push({ x: rnd(0, W), y, c: ['#fff', '#ffe066', '#ff9fc4', '#b9a6ff'][rint(4)], k: rnd(0.6, 1.1) }); }
      this.crowd = []; for (let x = 30; x < W; x += rnd(36, 50)) this.crowd.push({ x, y: rnd(286, 300), c: rint(6), a: rint(6), ph: rnd(0, TAU), side: x < CX ? 0 : 1 });
      this.cheer = [0, 0];
      this.newRound();
    }
    newRound() {
      this.round++; this.pos = 0; this.vel = 0; this.rt = 0; this.power = 0; this.powerDone = false; this.beatT = 0;
      this.phase = 'ready'; this.pt = this.round === 1 ? 1.6 : 2.4;
      for (const e of this.es) { e.pow = 0; e.combo = 0; e.slip = 0; e.rate = 0; }
      Fx.announce('第 ' + this.round + ' 回合！', COL, 380);
    }
    teamOf(e) { return e.side; }
    members(s) { return this.es.filter(e => e.side === s); }
    /* how hard one tap pulls */
    tap(e, n) {
      const kid = this.kid, ctx = this.ctx;
      for (let i = 0; i < n; i++) {
        e.taps++; e.rate += 1;
        if (!kid && e.rate > 9.5 && !e.cpu) {   // mashing too fast: slip!
          if (e.slip <= 0) { e.slip = 0.9; e.combo = 0; e.say = 0.9; e.sayT = '滑倒了！'; ctx.sfx('stun'); ctx.buzz(e.p, 160); Fx.dust(this.ex(e), ROPE_Y + 40, 'rgba(120,80,40,.7)', 16); }
          continue;
        }
        if (e.slip > 0) continue;
        let v = 1;
        if (!kid) {
          const ph = this.beatT / BEAT, d = Math.min(ph, 1 - ph) * BEAT;   // distance to the nearest beat (s)
          if (d < 0.13) { e.combo++; e.beats++; e.best = Math.max(e.best, e.combo); v = 1.9 + Math.min(0.6, e.combo * 0.06); e.heave = 1; if (!e.cpu) { e.say = 0.5; e.sayT = e.combo >= 5 ? '嘿咻 ×' + e.combo : '嘿咻！'; } }
          else { v = 0.55; e.combo = 0; }
        } else { e.heave = 0.7; if (e.taps % 6 === 0 && !e.cpu) { e.say = 0.5; e.sayT = ['嘿！', '拉！', '加油！'][rint(3)]; } }
        if (this.power > 0) v *= 2;
        e.pow += v;
        if (!e.cpu) Fx.dust(this.ex(e) + (e.side ? 18 : -18), ROPE_Y + e.r * 0.9, 'rgba(255,255,255,.75)', 8);
      }
    }
    ex(e) {
      const M = this.members(e.side), i = M.indexOf(e), s = e.side ? 1 : -1;
      return CX + this.pos + s * (GAP + i * STEP * Math.min(1, 5 / Math.max(5, M.length)));
    }
    force(s) { const M = this.members(s); if (!M.length) return 0; return M.reduce((a, e) => a + e.pow, 0) / M.length; }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      for (const c of this.clouds) { c.x += c.v * dt; if (c.x > W + 120) c.x = -120; }
      for (const e of this.es) { e.say = Math.max(0, e.say - dt); e.heave = Math.max(0, e.heave - dt * 3); e.slip -= dt; e.rate *= Math.exp(-dt * 1.0); }
      this.cheer[0] = Math.max(0, this.cheer[0] - dt); this.cheer[1] = Math.max(0, this.cheer[1] - dt);
      this.flash[0] = Math.max(0, this.flash[0] - dt * 2); this.flash[1] = Math.max(0, this.flash[1] - dt * 2);
      // mud bubbles
      if (Math.random() < dt * 3) this.bubbles.push({ x: CX + rnd(-80, 80), y: ROPE_Y + rnd(18, 70), t: 0, r: rnd(4, 9) });
      for (const b of this.bubbles) b.t += dt; this.bubbles = this.bubbles.filter(b => b.t < 1.2);
      if (this.phase === 'ready') {
        this.pt -= dt;
        for (const e of this.es) if (!e.cpu) this.drain(e);
        if (this.pt <= 0) { this.phase = 'pull'; ctx.sfx('go'); Fx.pop(CX, 330, '拉！', COL, 110); }
        return;
      }
      if (this.phase === 'won') {
        this.pt -= dt; this.pos += this.vel * dt; this.vel *= Math.exp(-dt * 3);
        for (const e of this.es) if (!e.cpu) this.drain(e);
        if (this.pt <= 0) { if (Math.max(...this.wins) >= 2) { this.over = true; this.endText = (this.winner === 0 ? TEAMS[0].icon : this.solo ? '🐻' : TEAMS[1].icon) + ' 贏了！'; } else this.newRound(); }
        return;
      }
      // pulling
      this.rt += dt; this.beatT += dt;
      if (this.beatT >= BEAT) { this.beatT -= BEAT; this.beatN++; if (!kid) ctx.sfx('tick'); }
      if (!this.powerDone && this.rt > this.limit * 0.45) { this.powerDone = true; this.power = 4; Fx.announce('⚡ 大力時間！', '#ffd23f', 380); ctx.sfx('star'); Fx.flash('#fff6c2', 0.3); }
      this.power = Math.max(0, this.power - dt);
      for (const e of this.es) {
        if (e.cpu) {   // the bears pull at a steady pace, a little faster each round
          e.cpuT -= dt;
          if (e.cpuT <= 0) {
            const rate = (kid ? 3.0 : 2.9) + this.round * 0.35 + Math.sin(this.rt * 0.7 + e.p.uid) * 0.6;
            e.cpuT = 1 / rate;
            if (!kid) { const ph = this.beatT / BEAT; if (Math.random() < 0.55 && ph > 0.2 && ph < 0.8) { e.cpuT = BEAT - this.beatT + rnd(-0.03, 0.05); continue; } }
            this.tap(e, 1);
          }
        } else { const n = this.drain(e); if (n) this.tap(e, n); }
        e.pow *= Math.exp(-dt / 0.7);
        e.lean += ((0.18 + Math.min(0.3, e.pow * 0.05)) - e.lean) * Math.min(1, dt * 6);
      }
      const F0 = this.force(0), F1 = this.force(1), d = F1 - F0;
      this.vel += d * 46 * dt; this.vel *= Math.exp(-dt * 2.4);
      this.pos += this.vel * dt;
      if (Math.abs(d) > 0.6) this.cheer[d > 0 ? 1 : 0] = 0.6;
      if (Math.abs(this.vel) > 60 && Math.random() < dt * 8) { const s = this.vel > 0 ? 1 : -1; for (const e of this.members(s > 0 ? 0 : 1)) Fx.dust(this.ex(e), ROPE_Y + e.r * 0.9, 'rgba(120,80,40,.55)', 12); }
      // a round ends when the ribbon crosses a line (or time runs out)
      let win = -1;
      if (this.pos <= -LINE) win = 0; else if (this.pos >= LINE) win = 1;
      else if (this.rt >= this.limit) win = Math.abs(this.pos) < 8 ? -2 : this.pos < 0 ? 0 : 1;
      if (win !== -1) this.endRound(win);
    }
    drain(e) { const p = e.p; if (!p.inp) return 0; const n = Math.max(0, Math.min(4, p.inp.c[0] - p.seen[0])); if (p.inp.c[0] > p.seen[0]) p.seen[0] = p.inp.c[0]; return n; }
    endRound(win) {
      const ctx = this.ctx;
      this.phase = 'won'; this.pt = 3;
      if (win === -2) { Fx.announce('平手！再來一次', '#2b2340', 380); ctx.sfx('end'); this.round--; this.winner = -1; return; }
      this.wins[win]++; this.winner = win; this.flash[win] = 1; this.cheer[win] = 3;
      // the losers tumble into the mud
      const losers = this.members(1 - win);
      for (const e of losers) { e.say = 1.6; e.sayT = '哇啊～'; }
      this.vel = (win ? 1 : -1) * 260;
      for (let k = 0; k < 26; k++) Fx.burst(CX + this.pos + rnd(-40, 40), ROPE_Y + 30, k % 2 ? '#7a4a22' : '#5c3515', 1, 340);
      ctx.sfx('splash'); Fx.shake(9); ctx.hitstop(0.06);
      const name = win === 0 ? (this.solo ? (this.es[0].p.name) : TEAMS[0].icon + ' ' + TEAMS[0].n) : this.solo ? '🐻 大熊隊' : TEAMS[1].icon + ' ' + TEAMS[1].n;
      Fx.announce(name + ' 拿下這回合！', win ? (this.solo ? '#8a5a2b' : TEAMS[1].c) : TEAMS[0].c, 380);
      ctx.sfx('win');
      for (const e of this.es) if (!e.cpu) ctx.buzz(e.p, e.side === win ? 80 : 250);
    }

    /* ---------------- drawing ---------------- */
    paintBg(g) {
      const sky = g.createLinearGradient(0, 0, 0, 320); sky.addColorStop(0, '#79c7ff'); sky.addColorStop(1, '#d8f1ff');
      g.fillStyle = sky; g.fillRect(-400, 0, W + 800, 320);
      // far hills
      g.fillStyle = '#9ed37e'; g.beginPath(); g.moveTo(-400, 300); for (let x = -400; x <= W + 400; x += 80) g.lineTo(x, 250 + Math.sin(x * 0.006) * 30 + Math.sin(x * 0.017) * 12); g.lineTo(W + 400, 320); g.lineTo(-400, 320); g.fill();
      g.fillStyle = '#86c766'; g.beginPath(); g.moveTo(-400, 310); for (let x = -400; x <= W + 400; x += 60) g.lineTo(x, 286 + Math.sin(x * 0.009 + 2) * 18); g.lineTo(W + 400, 330); g.lineTo(-400, 330); g.fill();
      // field with mowed stripes
      g.fillStyle = '#6bbf4e'; g.fillRect(-400, 310, W + 800, H - 310);
      for (let x = -400, k = 0; x < W + 400; x += 120, k++) if (k % 2) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x, 310, 120, H - 310); }
      // mud pit in the middle
      const mud = g.createRadialGradient(CX, ROPE_Y + 40, 20, CX, ROPE_Y + 40, 170); mud.addColorStop(0, '#6b4220'); mud.addColorStop(1, '#8a5a2b');
      g.fillStyle = '#5b8f3c'; g.beginPath(); g.ellipse(CX, ROPE_Y + 44, 180, 76, 0, 0, TAU); g.fill();
      g.fillStyle = mud; g.beginPath(); g.ellipse(CX, ROPE_Y + 40, 168, 66, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(CX - 40, ROPE_Y + 20, 70, 14, -0.1, 0, TAU); g.fill();
      // chalk lines: drag the ribbon over YOUR line
      for (const s of [-1, 1]) {
        const x = CX + s * LINE, T = TEAMS[s < 0 ? 0 : 1];
        g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 8; g.setLineDash([22, 14]); g.beginPath(); g.moveTo(x, 360); g.lineTo(x, 860); g.stroke(); g.setLineDash([]);
        g.fillStyle = this.solo && s > 0 ? '#8a5a2b' : T.c; g.beginPath(); g.roundRect(x - 60, 820, 120, 46, 23); g.fill();
        g.fillStyle = '#fff'; g.font = '900 24px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(this.solo && s > 0 ? '🐻 終點' : T.icon + ' 終點', x, 844);
      }
      // flags at both ends
      for (const s of [-1, 1]) {
        const x = s < 0 ? 70 : W - 70, c = s < 0 ? TEAMS[0].c : this.solo ? '#8a5a2b' : TEAMS[1].c;
        g.fillStyle = '#6b4a2a'; g.fillRect(x - 5, 330, 10, 230);
        g.fillStyle = c; g.beginPath(); g.moveTo(x + 5 * -s, 336); g.lineTo(x - s * 110, 366); g.lineTo(x + 5 * -s, 396); g.fill();
        g.font = '30px system-ui'; g.textAlign = 'center'; g.fillText(s < 0 ? '☀️' : this.solo ? '🐻' : '🌙', x - s * 46, 368);
      }
      for (const f of this.flowers) { g.fillStyle = f.c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(f.x + Math.cos(a) * 4 * f.k, f.y + Math.sin(a) * 4 * f.k, 3 * f.k, 0, TAU); g.fill(); } g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(f.x, f.y, 2.4 * f.k, 0, TAU); g.fill(); }
      // banner arch
      g.fillStyle = '#c0392b'; g.fillRect(CX - 300, 150, 600, 70); g.fillStyle = '#e74c3c'; g.fillRect(CX - 300, 150, 600, 8);
      g.fillStyle = '#6b4a2a'; g.fillRect(CX - 310, 150, 14, 160); g.fillRect(CX + 296, 150, 14, 160);
      g.fillStyle = '#fff'; g.font = '900 44px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🪢 拔河大賽', CX, 188);
    }
    bgLayer(g) {
      const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
      if (!this.bgCv || this.bgS !== s) {
        const c = this.bgCv || document.createElement('canvas'); c.width = Math.ceil((W + 800) * s); c.height = Math.ceil(H * s);
        const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 400 * s, 0); this.paintBg(cg); this.bgCv = c; this.bgS = s;
      }
      g.drawImage(this.bgCv, -400, 0, W + 800, H);
    }
    drawCrowd(g, at) {
      for (const f of this.crowd) {
        const ch = this.cheer[f.side], b = Math.max(0, Math.sin(at * (5 + ch * 6) + f.ph)) * (3 + ch * 14);
        drawCritter(g, f.x, f.y - b, 13, f.c, f.a, { noShadow: true, still: true, happy: ch > 0.3, face: Math.PI / 2 });
      }
    }
    drawRope(g, at) {
      const x0 = 110 + this.pos, x1 = W - 110 + this.pos, tens = Math.min(1, Math.abs(this.force(0) + this.force(1)) * 0.15);
      const sag = 16 * (1 - tens) + Math.sin(at * 30) * tens * 1.5;
      const yAt = x => ROPE_Y + sag * (1 - Math.pow((x - (x0 + x1) / 2) / ((x1 - x0) / 2), 2));
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 16; g.beginPath(); for (let x = x0; x <= x1; x += 40) g.lineTo(x, yAt(x) + 34); g.stroke();
      g.strokeStyle = '#a0712f'; g.lineWidth = 15; g.beginPath(); for (let x = x0; x <= x1; x += 20) g.lineTo(x, yAt(x)); g.stroke();
      g.strokeStyle = '#d9a95b'; g.lineWidth = 4; g.beginPath();
      for (let x = x0; x < x1; x += 14) { const y = yAt(x); g.moveTo(x, y - 6); g.lineTo(x + 8, y + 6); } g.stroke();
      // the red ribbon in the middle
      const rx = CX + this.pos, ry = yAt(rx);
      g.fillStyle = '#ff3b4a'; g.beginPath(); g.moveTo(rx - 6, ry); g.lineTo(rx + 6, ry); g.lineTo(rx + 16 + Math.sin(at * 9) * 4, ry + 52); g.lineTo(rx, ry + 40); g.lineTo(rx - 16 + Math.sin(at * 9 + 1) * 4, ry + 52); g.closePath(); g.fill();
      g.fillStyle = '#c81e2c'; g.beginPath(); g.arc(rx, ry, 11, 0, TAU); g.fill();
      return yAt;
    }
    drawTeam(g, at, yAt) {
      for (const s of [0, 1]) {
        const M = this.members(s);
        // back to front: the anchor (farthest) first
        for (let i = M.length - 1; i >= 0; i--) {
          const e = M[i], x = this.ex(e), sd = s ? 1 : -1, y = ROPE_Y + 6;
          const lost = this.phase === 'won' && this.winner >= 0 && this.winner !== s, won = this.phase === 'won' && this.winner === s;
          const lean = (lost ? -0.5 : e.lean + e.heave * 0.12) * sd, hop = won ? Math.abs(Math.sin(at * 8 + i)) * 26 : e.heave * 6;
          const sl = e.slip > 0 ? Math.sin(at * 30) * 6 : 0;
          drawCritter(g, x + sl, y, e.r, e.p.col, e.p.animal, { face: s ? Math.PI : 0, rot: lean, hop, squash: e.heave * 0.08, happy: won, stun: e.slip > 0 || lost, still: true, blink: (at + i * 1.3) % 3.4 < 0.12 });
          // hands on the rope
          const hx = x - sd * e.r * 0.85, hy = yAt(hx);
          g.fillStyle = PARTY_COLORS[e.p.col].c; g.strokeStyle = PARTY_COLORS[e.p.col].d; g.lineWidth = 3;
          for (const k of [-1, 1]) { g.beginPath(); g.arc(hx + k * 12, hy, 9, 0, TAU); g.fill(); g.stroke(); }
          if (this.solo || !e.cpu) drawTag(g, x, y - e.r - 40 - hop, e.p);
          if (!this.kid && e.combo >= 3 && !e.cpu) { g.font = '900 22px ' + RFONT; g.fillStyle = '#ffd23f'; g.strokeStyle = '#2b2340'; g.lineWidth = 5; g.textAlign = 'center'; g.strokeText('×' + e.combo, x, y + e.r + 30); g.fillText('×' + e.combo, x, y + e.r + 30); }
          if (e.say > 0) {
            g.font = '900 26px ' + FONT; const w = g.measureText(e.sayT).width + 24, bx = x, by = y - e.r - 84 - hop;
            g.globalAlpha = Math.min(1, e.say * 4); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(bx - w / 2, by - 20, w, 40, 16); g.fill();
            g.fillStyle = '#2b2340'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e.sayT, bx, by + 1); g.globalAlpha = 1;
          }
        }
      }
    }
    drawBeat(g, at) {
      if (this.kid || this.phase !== 'pull') return;
      const ph = this.beatT / BEAT, k = Math.max(0, 1 - ph * 3), x = CX, y = 770;
      g.fillStyle = 'rgba(43,35,64,.75)'; g.beginPath(); g.roundRect(x - 120, y - 32, 240, 64, 32); g.fill();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.arc(x - 76, y, 18 + k * 8, 0, TAU); g.stroke();
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x - 76, y, 10 + k * 6, 0, TAU); g.fill();
      // a ring that shrinks onto the beat
      g.strokeStyle = 'rgba(255,210,63,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(x - 76, y, 18 + (1 - ph) * 30, 0, TAU); g.stroke();
      g.font = `900 ${30 + k * 8}px ${FONT}`; g.fillStyle = k > 0.2 ? '#ffd23f' : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(this.beatN % 2 ? '咻！' : '嘿～', x + 26, y + 2);
    }
    draw(g, clock) {
      const at = clock || this.t;
      this.bgLayer(g);
      for (const c of this.clouds) { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(c.x, c.y, 60 * c.s, 22 * c.s, 0, 0, TAU); g.ellipse(c.x + 34 * c.s, c.y - 12 * c.s, 34 * c.s, 22 * c.s, 0, 0, TAU); g.ellipse(c.x - 30 * c.s, c.y - 6 * c.s, 28 * c.s, 18 * c.s, 0, 0, TAU); g.fill(); }
      this.drawCrowd(g, at);
      for (const b of this.bubbles) { const k = b.t / 1.2; g.strokeStyle = `rgba(60,35,15,${0.6 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, b.r * (0.5 + k), 0, TAU); g.stroke(); }
      for (const s of [0, 1]) if (this.flash[s] > 0) { g.globalAlpha = this.flash[s] * 0.25; g.fillStyle = s ? TEAMS[1].c : TEAMS[0].c; g.fillRect(s ? CX : -400, 320, W / 2 + 400, H - 320); g.globalAlpha = 1; }
      Fx.ground(g);
      const yAt = this.drawRope(g, at);
      this.drawTeam(g, at, yAt);
      this.drawBeat(g, at);
      if (this.power > 0) { g.globalAlpha = 0.6 + Math.sin(at * 20) * 0.3; g.font = '900 34px ' + FONT; g.fillStyle = '#ffd23f'; g.strokeStyle = '#2b2340'; g.lineWidth = 6; g.textAlign = 'center'; g.strokeText('⚡ 每一下都算兩倍！⚡', CX, 334); g.fillText('⚡ 每一下都算兩倍！⚡', CX, 334); g.globalAlpha = 1; }
      // round dots
      for (const s of [0, 1]) for (let k = 0; k < 2; k++) {
        const x = CX + (s ? 330 + k * 40 : -330 - k * 40), y = 185, on = this.wins[s] > k;
        g.fillStyle = on ? '#ffd23f' : 'rgba(255,255,255,.35)'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); g.stroke();
      }
      if (this.phase === 'pull') {   // time left in this round
        const left = Math.max(0, this.limit - this.rt), w = 300 * left / this.limit;
        g.fillStyle = 'rgba(43,35,64,.35)'; g.beginPath(); g.roundRect(CX - 150, 232 - (this.kid ? 0 : 0), 300, 8, 4); g.fill();
        g.fillStyle = left < 5 ? '#ff3b4a' : '#fff'; g.beginPath(); g.roundRect(CX - 150, 232, w, 8, 4); g.fill();
      }
    }
    center() { return '第 ' + this.round + ' 回合・先贏 2 回合'; }
    teamScore(t) { return this.wins[t] + ' 勝'; }
    chip(p) { const e = this.by.get(p); return '💪 ' + e.taps; }
    pad(p) {
      const e = this.by.get(p);
      if (this.phase === 'ready') return '準備！第 ' + this.round + ' 回合';
      if (e.slip > 0) return '滑倒了！慢一點，跟節拍';
      return (this.kid ? '用力一直按！' : '跟著「嘿咻」按・連擊 ' + e.combo) + '　💪' + e.taps;
    }
    ready(p) { const e = this.by.get(p); return this.phase === 'pull' && e.slip <= 0; }
    padLayout() { return { type: 'tap', prompt: this.kid ? '一直按！一起用力拉！' : '跟著大螢幕「嘿～咻！」的節拍按，按太快會滑倒', btn: { icon: '💪', label: '拉！' } }; }
    results() {
      const humans = this.es.filter(e => !e.cpu);
      const line = e => `拉了 ${e.taps} 下` + (this.kid ? '' : `・嘿咻 ${e.beats} 次・最多連擊 ${e.best}`);
      if (this.solo) {
        const won = this.wins[0] > this.wins[1];
        return { title: won ? '🎉 你贏了大熊隊！' : '🐻 大熊隊贏了，再挑戰一次！', rows: humans.map(e => ({ p: e.p, key: e.taps, line: `回合 ${this.wins[0]} : ${this.wins[1]}・` + line(e) })) };
      }
      return { teamScores: this.wins.slice(), teamText: t => this.wins[t] + ' 勝', rows: humans.slice().sort((a, b) => b.taps - a.taps).map(e => ({ p: e.p, key: e.taps, line: line(e) })) };
    }
  }
  GAMES.push({
    id: 'tug', name: '拔河比賽', icon: '🪢', col: COL, bg: '#5aa346', kind: 'vs', teams: true, forceTeams: true, players: '1–6 人',
    blurb: '☀️ 對 🌙 一起拉繩子，把紅布條拉過來！',
    btn: { label: '拉！', icon: '💪' },
    rules: kid => kid
      ? ['分成 ☀️ 太陽隊和 🌙 月亮隊，一起拉一條大繩子', '手機變成一個大按鈕，一直按就是用力拉', '把中間的紅布條拉過自己這邊的白線就贏這回合', '先贏 2 回合的隊伍獲勝；中途有「⚡ 大力時間」，每下算兩倍']
      : ['☀️ 對 🌙 拔河，每隊的力氣是隊員按的「平均」，人少也不吃虧', '跟著大螢幕「嘿～咻！」的節拍按，力氣大很多，還能連擊', '按太快會滑倒一下，要有節奏！', '把紅布條拉過自己的白線就贏一回合，先贏 2 回合獲勝；一個人玩就挑戰大熊隊'],
    thumb(g) {
      g.fillStyle = '#9fdcff'; g.fillRect(0, 0, 320, 70); g.fillStyle = '#6bbf4e'; g.fillRect(0, 60, 320, 120);
      g.fillStyle = '#8a5a2b'; g.beginPath(); g.ellipse(160, 120, 50, 20, 0, 0, TAU); g.fill();
      g.strokeStyle = '#a0712f'; g.lineWidth = 6; g.beginPath(); g.moveTo(20, 110); g.quadraticCurveTo(160, 116, 300, 110); g.stroke();
      g.fillStyle = '#ff3b4a'; g.beginPath(); g.moveTo(156, 112); g.lineTo(164, 112); g.lineTo(168, 132); g.lineTo(152, 132); g.fill();
      drawCritter(g, 90, 112, 20, 0, 0, { face: Math.PI, rot: -0.3, noShadow: true, still: true }); drawCritter(g, 50, 112, 20, 2, 1, { face: Math.PI, rot: -0.3, noShadow: true, still: true });
      drawCritter(g, 230, 112, 20, 1, 3, { face: 0, rot: 0.3, noShadow: true, still: true }); drawCritter(g, 270, 112, 20, 4, 5, { face: 0, rot: 0.3, noShadow: true, still: true });
      g.font = '900 20px "Noto Sans TC",system-ui'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('嘿咻！', 160, 40);
    },
    create: ctx => new Tug(ctx)
  });
})();
