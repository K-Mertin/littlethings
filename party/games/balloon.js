'use strict';
/* 吹氣球 — push-your-luck. Everybody has a balloon on a pump. HOLD the button to pump, let go to tie it off.
   The bigger your tied balloon, the more points — but every round all balloons share one secret size
   where they POP. When somebody pops, everyone else knows the limit is close…
   小朋友: 5 rounds; a balloon getting near the limit wobbles and turns shiny red, so you can see it coming;
           a popped balloon still gets 3 points for trying.
   大人:   6 rounds; the limits jump about more, the warning is a tiny shiver at the very end;
           the biggest balloon of each round gets +20. */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', RFONT = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const COL = '#ef4444', BASE_Y = 760, MIN = 18;
  const BAL_COLS = ['#ff5a6e', '#4dabf7', '#ffd43b', '#51cf66', '#b197fc', '#ff8cc6'];

  class Balloon {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = null; this.teams = !!ctx.teams; this.edge = '#ffd9a8';
      this.es = ctx.players.map((p, i) => ({ p, score: 0, best: 0, pops: 0, ties: 0, size: MIN, state: 'idle', pumpT: 0, flyY: 0, wob: 0, hop: 0, vy: 0, cover: 0, add: 0, held: false }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.rounds = this.kid ? 5 : 6; this.round = 0; this.flags = []; for (let x = -380; x < W + 400; x += 52) this.flags.push({ x });
      this.bits = []; this.sky = []; for (let i = 0; i < 10; i++) this.sky.push({ x: rnd(-300, W + 300), y: rnd(150, 520), c: BAL_COLS[rint(6)], v: rnd(10, 26), ph: rnd(0, TAU) });
      this.nextRound();
    }
    nextRound() {
      this.round++;
      if (this.round > this.rounds) { this.over = true; return; }
      // the secret limit for this round (in 公分)
      this.limit = this.kid ? rnd(58, 96) : (Math.random() < 0.25 ? rnd(42, 60) : rnd(60, 128));
      this.phase = 'ready'; this.pt = 2; this.rt = 0; this.maxT = this.kid ? 14 : 12;
      for (const e of this.es) { e.size = MIN; e.state = 'idle'; e.pumpT = 0; e.flyY = 0; e.add = 0; e.wob = 0; }
      Fx.announce('第 ' + this.round + ' 回合', COL, 380); this.ctx.sfx('pop');
    }
    stationX(i) { const n = this.es.length; return 800 - (n - 1) * Math.min(250, 1400 / n) / 2 + i * Math.min(250, 1400 / n); }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      for (const s of this.sky) { s.x += s.v * dt; if (s.x > W + 320) s.x = -320; }
      for (const b of this.bits) { b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt; b.t += dt; }
      this.bits = this.bits.filter(b => b.t < 1.6);
      for (const e of this.es) {
        if (e.hop > 0 || e.vy) { e.vy -= 1700 * dt; e.hop = Math.max(0, e.hop + e.vy * dt); if (e.hop <= 0) e.vy = 0; }
        e.cover = Math.max(0, e.cover - dt); e.wob += dt;
        if (e.state === 'tied') e.flyY = Math.min(e.flyY + dt * 30, 30);
      }
      if (this.phase === 'ready') { this.pt -= dt; for (const e of this.es) ctx.pressed(e.p, 0); if (this.pt <= 0) { this.phase = 'pump'; ctx.sfx('go'); } return; }
      if (this.phase === 'done') { this.pt -= dt; if (this.pt <= 0) this.nextRound(); return; }
      this.rt += dt;
      const rate = kid ? 15 : 19;
      for (const e of this.es) {
        if (e.state === 'popped' || e.state === 'tied') continue;
        const hold = ctx.held(e.p, 0);
        if (hold) {
          if (e.state === 'idle') e.state = 'pump';
          e.pumpT += dt; e.size += rate * dt * (1 + Math.min(0.5, e.pumpT * 0.06));
          if (Math.random() < dt * 6) ctx.sfx('whoosh');
          if (e.size >= this.limit) this.pop(e);
        } else if (e.state === 'pump') {
          if (e.size < MIN + 6) { e.state = 'idle'; continue; }   // a tiny tap: not started yet
          this.tie(e);
        }
      }
      const live = this.es.filter(e => e.state === 'idle' || e.state === 'pump');
      if (this.rt >= this.maxT) for (const e of live) { if (e.state === 'pump') this.tie(e); else { e.state = 'tied'; e.ties++; } }
      if (this.es.every(e => e.state === 'popped' || e.state === 'tied')) this.endRound();
    }
    pop(e) {
      const ctx = this.ctx, i = this.es.indexOf(e), x = this.stationX(i), y = this.balY(e);
      e.state = 'popped'; e.pops++; e.cover = 1.2;
      ctx.sfx('boom'); ctx.buzz(e.p, 300); Fx.shake(9); Fx.flash('#ffffff', 0.25);
      for (let k = 0; k < 18; k++) this.bits.push({ x: x + rnd(-e.size * 0.6, e.size * 0.6), y: y + rnd(-e.size * 0.6, e.size * 0.6), vx: rnd(-420, 420), vy: rnd(-520, 80), r: rnd(0, TAU), vr: rnd(-10, 10), c: BAL_COLS[e.p.col % 6], t: 0 });
      Fx.pop(x, y - 40, '砰！', '#2b2340', 70);
      for (const o of this.es) if (o !== e) { o.cover = 0.8; }
    }
    tie(e) {
      e.state = 'tied'; e.ties++; this.ctx.sfx('pop'); this.ctx.buzz(e.p, 50); e.hop = 1; e.vy = 360;
      Fx.pop(this.stationX(this.es.indexOf(e)), this.balY(e) - e.size - 20, '綁好了！', '#2b2340', 30);
    }
    endRound() {
      const ctx = this.ctx; this.phase = 'done'; this.pt = 3.4;
      let big = null;
      for (const e of this.es) {
        e.add = e.state === 'tied' ? Math.round(e.size) : (this.kid ? 3 : 0);
        if (e.state === 'tied' && (!big || e.size > big.size)) big = e;
      }
      this.bigE = big;
      if (big && !this.kid && this.es.length > 1) { big.add += 20; Fx.pop(this.stationX(this.es.indexOf(big)), 260, '最大顆 +20', '#ffb400', 44); }
      for (const e of this.es) { e.score += e.add; if (e.state === 'tied') e.best = Math.max(e.best, Math.round(e.size)); }
      if (big) { big.hop = 1; big.vy = 520; ctx.sfx('star'); }
      Fx.pop(800, 330, '這回合 ' + Math.round(this.limit) + ' 公分會破', '#2b2340', 40);
    }
    rad(e) { return e.size * (this.es.length >= 5 ? 0.8 : 1); }
    balY(e) { return BASE_Y - 230 - this.rad(e) * 0.9 - e.flyY; }

    /* ---------------- drawing ---------------- */
    paintBg(g) {
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#ffe2b8'); sky.addColorStop(1, '#ffc58f'); g.fillStyle = sky; g.fillRect(-400, 0, W + 800, H);
      // a carnival tent behind
      for (let x = -400, k = 0; x < W + 400; x += 100, k++) { g.fillStyle = k % 2 ? '#ff6b6b' : '#fff3e0'; g.beginPath(); g.moveTo(x, 120); g.lineTo(x + 100, 120); g.lineTo(x + 100, 150); g.quadraticCurveTo(x + 50, 190, x, 150); g.fill(); }
      g.fillStyle = '#c0392b'; g.fillRect(-400, 112, W + 800, 12);
      // counter + floor
      g.fillStyle = '#d4a373'; g.fillRect(-400, BASE_Y + 40, W + 800, H - BASE_Y);
      g.fillStyle = '#b5835a'; for (let x = -400; x < W + 400; x += 80) g.fillRect(x, BASE_Y + 40, 3, H);
      g.fillStyle = '#8c5a3c'; g.fillRect(-400, BASE_Y - 4, W + 800, 46); g.fillStyle = '#a86f4c'; g.fillRect(-400, BASE_Y - 4, W + 800, 10);
      g.fillStyle = '#fff'; g.font = '900 30px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🎈 吹氣球大賽 🎈', 800, BASE_Y + 22);
    }
    bgLayer(g) {
      const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
      if (!this.bgCv || this.bgS !== s) { const c = this.bgCv || document.createElement('canvas'); c.width = Math.ceil((W + 800) * s); c.height = Math.ceil(H * s); const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 400 * s, 0); this.paintBg(cg); this.bgCv = c; this.bgS = s; }
      g.drawImage(this.bgCv, -400, 0, W + 800, H);
    }
    balloon(g, x, y, r, col, k, at, shine) {
      // k: 0..1 how close to popping (only shown in 小朋友 mode / at the very end for 大人)
      const sh = k > 0 ? Math.sin(at * (30 + k * 30)) * k * (this.kid ? 6 : 3) : 0;
      x += sh;
      g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x + 8, y + 10, r * 0.92, r * 1.05, 0, 0, TAU); g.fill();
      const c = k > 0.5 && this.kid ? '#ff2d3a' : col;
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, c); gr.addColorStop(1, mixCol(col, -0.25));
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 0.92, r * 1.05, 0, 0, TAU); g.fill();
      g.fillStyle = mixCol(col, -0.2); g.beginPath(); g.moveTo(x - 7, y + r * 1.05 - 2); g.lineTo(x + 7, y + r * 1.05 - 2); g.lineTo(x, y + r * 1.05 + 10); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.45, r * 0.16, r * 0.26, -0.5, 0, TAU); g.fill();
      if (shine) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * 1.2 + Math.sin(at * 8) * 4, 0, TAU); g.stroke(); }
    }
    draw(g, clock) {
      const at = clock || this.t;
      this.bgLayer(g);
      for (const s of this.sky) { g.globalAlpha = 0.35; this.balloon(g, s.x, s.y + Math.sin(at + s.ph) * 10, 22, s.c, 0, at); g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(s.x, s.y + 32); g.lineTo(s.x + 4, s.y + 80); g.stroke(); g.globalAlpha = 1; }
      // bunting
      g.strokeStyle = '#8c5a3c'; g.lineWidth = 2; g.beginPath(); g.moveTo(-400, 200); for (let x = -400; x <= W + 400; x += 52) g.lineTo(x, 200 + Math.sin(x * 0.03) * 8); g.stroke();
      this.flags.forEach((f, k) => { const y = 200 + Math.sin(f.x * 0.03) * 8; g.fillStyle = BAL_COLS[k % 6]; g.beginPath(); g.moveTo(f.x + 4, y); g.lineTo(f.x + 44, y); g.lineTo(f.x + 24, y + 30); g.fill(); });
      // round dots
      for (let k = 0; k < this.rounds; k++) { g.fillStyle = k < this.round - 1 || (k === this.round - 1 && this.phase === 'done') ? '#ff6b6b' : 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(800 - (this.rounds - 1) * 18 + k * 36, 252, 11, 0, TAU); g.fill(); }
      if (this.phase === 'pump') {
        const k = Math.max(0, 1 - this.rt / this.maxT);
        g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.roundRect(600, 280, 400, 12, 6); g.fill();
        g.fillStyle = k < 0.25 ? '#ff3b4a' : '#2b2340'; g.beginPath(); g.roundRect(600, 280, 400 * k, 12, 6); g.fill();
      }
      this.es.forEach((e, i) => {
        const x = this.stationX(i), r = this.rad(e), near = clamp((e.size / this.limit - (this.kid ? 0.72 : 0.93)) / (this.kid ? 0.28 : 0.07), 0, 1);
        // the pump
        g.fillStyle = '#5c6b7a'; g.fillRect(x - 70, BASE_Y - 90, 22, 90); g.fillStyle = '#7d8ea0'; g.fillRect(x - 74, BASE_Y - 94, 30, 10);
        const pushK = e.state === 'pump' ? Math.abs(Math.sin(at * 9)) : 0;
        g.fillStyle = '#333'; g.fillRect(x - 62, BASE_Y - 130 + pushK * 30, 6, 40); g.fillRect(x - 80, BASE_Y - 134 + pushK * 30, 42, 8);
        g.strokeStyle = '#333'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 59, BASE_Y - 10); g.quadraticCurveTo(x - 20, BASE_Y + 10, x, BASE_Y - 200); g.stroke();
        const by = this.balY(e);
        if (e.state !== 'popped') {
          g.strokeStyle = 'rgba(60,40,30,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, by + r * 1.05 + 10); g.quadraticCurveTo(x + 10, (by + BASE_Y - 200) / 2 + 30, x, BASE_Y - 200); g.stroke();
          this.balloon(g, x, by, r, this.phase === 'done' && e === this.bigE && !this.kid ? '#ffd23f' : BAL_COLS[e.p.col % 6], e.state === 'tied' ? 0 : near, at, this.phase === 'done' && e.state === 'tied');
          if (e.state === 'tied') { g.font = '900 26px ' + RFONT; g.fillStyle = '#2b2340'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Math.round(e.size) + ' 公分', x, by); }
        } else {
          g.font = '40px system-ui'; g.textAlign = 'center'; g.fillText('💥', x, BASE_Y - 220);
        }
        drawCritter(g, x + 30, BASE_Y - 34, 34, e.p.col, e.p.animal, { hop: e.hop, happy: e.state === 'tied' && this.phase === 'done' && e.add > 3, stun: e.state === 'popped', face: -Math.PI / 2 + (e.cover > 0 ? 0 : 0.3), blink: e.cover > 0 || (at + i) % 3.2 < 0.12, squash: e.state === 'pump' ? Math.sin(at * 18) * 0.05 : 0 });
        if (e.cover > 0) { g.fillStyle = PARTY_COLORS[e.p.col].c; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + 30 + s * 30, BASE_Y - 52 - e.hop, 11, 0, TAU); g.fill(); } }
        drawTag(g, x + 30, BASE_Y + 64 + 20, e.p);
        if (this.phase === 'done') { g.font = '900 30px ' + RFONT; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = '#fff'; const s = '+' + e.add; g.strokeText(s, x, BASE_Y - 160); g.fillStyle = e.add > 3 ? '#16a34a' : '#7a6f8f'; g.fillText(s, x, BASE_Y - 160); }
      });
      for (const b of this.bits) { g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.globalAlpha = 1 - b.t / 1.6; g.fillStyle = b.c; g.beginPath(); g.moveTo(-10, -6); g.lineTo(12, -2); g.lineTo(4, 8); g.closePath(); g.fill(); g.restore(); }
      g.globalAlpha = 1;
      if (this.phase === 'ready') { g.font = '900 44px ' + FONT; g.fillStyle = '#2b2340'; g.textAlign = 'center'; g.fillText('準備…按住手機的按鈕打氣！', 800, 330); }
    }
    center() { return this.phase === 'pump' ? '按住打氣・放開就綁起來' : '第 ' + this.round + ' / ' + this.rounds + ' 回合'; }
    teamScore(t) { return this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.score, 0) + ' 分'; }
    chip(p) { return this.by.get(p).score + ' 分'; }
    pad(p) { const e = this.by.get(p); return e.state === 'popped' ? '破了！等下一回合' : e.state === 'tied' ? '綁好了：' + Math.round(e.size) + ' 公分' : e.state === 'pump' ? Math.round(e.size) + ' 公分…' : '總共 ' + e.score + ' 分'; }
    ready(p) { const e = this.by.get(p); return this.phase === 'pump' && (e.state === 'idle' || e.state === 'pump'); }
    padLayout(p) {
      const e = this.by.get(p);
      if (this.phase !== 'pump' || e.state === 'tied' || e.state === 'popped') return { type: 'tap', prompt: e.state === 'popped' ? '💥 破掉了！看看別人吹多大' : e.state === 'tied' ? '綁好了！看大家的氣球' : '準備！按住按鈕打氣，放開就綁起來', btn: { icon: '🎈', label: '按住打氣' } };
      return { type: 'tap', prompt: '按住打氣・放開就綁起來（太大會破！）', btn: { icon: '🎈', label: '按住打氣' } };
    }
    results() {
      const team = this.teams ? { teamScores: [0, 1].map(t => this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.score, 0)), teamText: t => this.teamScore(t) } : {};
      return { ...team, rows: this.es.slice().sort((a, b) => b.score - a.score).map(e => ({ p: e.p, key: e.score, line: `${e.score} 分・` + (e.best ? `最大 ${e.best} 公分・破了 ${e.pops} 次` : '每次都吹破了！') })) };
    }
  }
  GAMES.push({
    id: 'balloon', name: '吹氣球', icon: '🎈', col: COL, bg: '#ffc58f', kind: 'vs', teams: true, players: '1–6 人',
    blurb: '按住打氣，放開就綁起來——吹太大會破！',
    btn: { label: '按住打氣', icon: '🎈' },
    rules: kid => kid
      ? ['按住手機的按鈕，氣球就會變大', '放開手，氣球就綁起來，越大分數越多', '吹太大會「砰！」破掉；快破的時候氣球會發抖變紅', '一共 5 回合，破掉也有 3 分']
      : ['按住打氣、放開綁起來；氣球越大分數越多', '每回合所有氣球的「破掉大小」都一樣，但每回合不同', '看到別人破了，就知道上限快到了', '每回合最大顆 +20，共 6 回合；破掉 0 分'],
    thumb(g) {
      g.fillStyle = '#ffd9a8'; g.fillRect(0, 0, 320, 180); g.fillStyle = '#8c5a3c'; g.fillRect(0, 150, 320, 30);
      const b = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r * 0.9, r, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.4, r * 0.15, r * 0.25, -0.5, 0, TAU); g.fill(); g.strokeStyle = '#555'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y + r); g.lineTo(x, 150); g.stroke(); };
      b(80, 80, 40, '#ff5a6e'); b(170, 95, 26, '#4dabf7'); b(250, 70, 50, '#ffd43b');
      g.font = '28px system-ui'; g.textAlign = 'center'; g.fillText('💥', 290, 30);
      drawCritter(g, 120, 150, 16, 3, 1, { noShadow: true, still: true, happy: true }); drawCritter(g, 210, 150, 16, 4, 4, { noShadow: true, still: true, stun: true });
    },
    create: ctx => new Balloon(ctx)
  });
})();
