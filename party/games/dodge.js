'use strict';
/* 躲躲球 — bouncy balls fly round the yard and more keep coming. Don't get hit!
   The dash makes you slip through for a moment.
   小朋友: slow balls, getting hit only counts (fewest hits wins).
   大人: 3 hearts, faster balls, last one standing wins. */
(() => {
  const X0 = 60, Y0 = 150, X1 = 1540, Y1 = 860;
  const BALL_COLS = ['#ff5a5f', '#ffb21f', '#3d9bff', '#2fc46b', '#a066ff', '#ff7fb8'];
  class Dodge {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = this.kid ? 60 : 120; this.outN = 0;
      const n = ctx.players.length;
      this.es = ctx.players.map((p, i) => {
        const a = i * TAU / Math.max(1, n);
        return { p, x: 800 + Math.cos(a) * (n > 1 ? 200 : 0), y: 505 + Math.sin(a) * (n > 1 ? 140 : 0), vx: 0, vy: 0, face: a, r: 30, cd: 0, dash: 0, inv: 1.5, hits: 0, lives: 3, out: false, outAt: 0, alive: 0, walk: 0, squash: 0 };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.balls = []; this.warn = [];
      this.nextBall = 1.5;
      this.max = (this.kid ? 4 : 6) + Math.min(4, n);
    }
    speed() { return (this.kid ? 210 : 290) + this.t * (this.kid ? 1.5 : 3); }
    spawn() {
      const side = rint(4), r = rnd(22, 32);
      let x, y, a;
      if (side === 0) { x = X0 + r; y = rnd(Y0 + 60, Y1 - 60); a = rnd(-0.7, 0.7); }
      else if (side === 1) { x = X1 - r; y = rnd(Y0 + 60, Y1 - 60); a = Math.PI + rnd(-0.7, 0.7); }
      else if (side === 2) { x = rnd(X0 + 60, X1 - 60); y = Y0 + r; a = Math.PI / 2 + rnd(-0.7, 0.7); }
      else { x = rnd(X0 + 60, X1 - 60); y = Y1 - r; a = -Math.PI / 2 + rnd(-0.7, 0.7); }
      this.warn.push({ x, y, a, r, t: 0, col: BALL_COLS[rint(BALL_COLS.length)] });
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      this.nextBall -= dt;
      if (this.nextBall <= 0 && this.balls.length + this.warn.length < Math.min(this.max, 2 + Math.floor(this.t / (kid ? 7 : 5)))) { this.spawn(); this.nextBall = kid ? 3 : 2; }
      for (const w of this.warn) {
        w.t += dt;
        if (w.t >= 1.2) { const s = this.speed(); this.balls.push({ x: w.x, y: w.y, vx: Math.cos(w.a) * s, vy: Math.sin(w.a) * s, r: w.r, col: w.col, spin: 0 }); ctx.sfx('pop'); w.done = true; }
      }
      this.warn = this.warn.filter(w => !w.done);
      const want = this.speed();
      for (const b of this.balls) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 6;
        if (b.x < X0 + b.r) { b.x = X0 + b.r; b.vx = Math.abs(b.vx); }
        if (b.x > X1 - b.r) { b.x = X1 - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y < Y0 + b.r) { b.y = Y0 + b.r; b.vy = Math.abs(b.vy); }
        if (b.y > Y1 - b.r) { b.y = Y1 - b.r; b.vy = -Math.abs(b.vy); }
        const m = hyp(b.vx, b.vy) || 1; b.vx *= want / m; b.vy *= want / m;
      }
      for (const e of this.es) {
        if (e.out) continue;
        e.alive += dt; e.cd -= dt; e.dash -= dt; e.inv -= dt; e.squash *= 0.85;
        const i = ctx.input(e.p);
        if (ctx.pressed(e.p, 0) && e.cd <= 0) { e.dash = 0.3; e.cd = kid ? 1.2 : 1.6; e.squash = -0.14; ctx.sfx('whoosh'); }
        let ix = i.x, iy = i.y; if (e.dash > 0 && !ix && !iy) { ix = Math.cos(e.face); iy = Math.sin(e.face); }
        const sp = (kid ? 330 : 360) * (e.dash > 0 ? 2.2 : 1), k = 1 - Math.exp(-(e.dash > 0 ? 18 : 11) * dt);
        e.vx += (ix * sp - e.vx) * k; e.vy += (iy * sp - e.vy) * k;
        if (ix || iy) { e.face = Math.atan2(iy, ix); e.walk += dt * 12; } else e.walk = 0;
        e.x = clamp(e.x + e.vx * dt, X0 + e.r, X1 - e.r); e.y = clamp(e.y + e.vy * dt, Y0 + e.r, Y1 - e.r);
        if (e.inv > 0 || e.dash > 0) continue;
        for (const b of this.balls) {
          const dx = e.x - b.x, dy = e.y - b.y, d = hyp(dx, dy);
          if (d > e.r + b.r - 6) continue;
          e.hits++; e.inv = kid ? 1.5 : 1.3; e.squash = 0.25; e.vx = dx / (d || 1) * 500; e.vy = dy / (d || 1) * 500;
          b.vx = -dx / (d || 1) * hyp(b.vx, b.vy); b.vy = -dy / (d || 1) * hyp(b.vx, b.vy);
          ctx.sfx('bonk', 0.7); ctx.buzz(e.p, 200); Fx.burst(e.x, e.y, b.col, 12, 300);
          if (!kid) {
            e.lives--;
            if (e.lives <= 0) { e.out = true; e.outAt = ++this.outN; Fx.pop(e.x, e.y - 60, e.p.name + ' 出局', '#2b2340', 40); ctx.buzz(e.p, 400); }
            else Fx.pop(e.x, e.y - 70, '♥ -1', '#ff4f6d', 36);
          } else Fx.pop(e.x, e.y - 70, '哎呀！', '#ff4f6d', 34);
          break;
        }
      }
      for (let a = 0; a < this.es.length; a++) for (let b = a + 1; b < this.es.length; b++) {
        const A = this.es[a], B = this.es[b]; if (A.out || B.out) continue;
        const dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
        if (d < m && d > 0) { const o = (m - d) / 2; A.x -= dx / d * o; A.y -= dy / d * o; B.x += dx / d * o; B.y += dy / d * o; }
      }
      const alive = this.es.filter(e => !e.out);
      if (this.t >= this.dur) this.over = true;
      if (!kid && (this.es.length > 1 ? alive.length <= 1 : alive.length === 0)) this.over = true;
    }
    draw(g) {
      const t = this.t;
      g.fillStyle = '#ffd9a8'; g.fillRect(-400, 0, W + 800, H);
      g.fillStyle = '#ffeacc'; g.beginPath(); g.roundRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20, 30); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(800, Y0); g.lineTo(800, Y1); g.stroke(); g.beginPath(); g.arc(800, 505, 120, 0, TAU); g.stroke();
      g.strokeStyle = '#e8a35c'; g.lineWidth = 10; g.beginPath(); g.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 24); g.stroke();
      for (const w of this.warn) {
        const k = w.t / 1.2, blink = (t * 10 | 0) % 2;
        g.save(); g.translate(w.x, w.y); g.rotate(w.a);
        g.globalAlpha = 0.5 + 0.5 * blink; g.fillStyle = w.col;
        g.beginPath(); g.moveTo(20 + k * 30, 0); g.lineTo(-6, -18); g.lineTo(-6, 18); g.closePath(); g.fill();
        g.restore(); g.globalAlpha = 1;
        g.font = '900 28px system-ui'; g.fillStyle = '#ff3b4a'; g.textAlign = 'center'; g.fillText('!', w.x, w.y + 10);
      }
      const things = [];
      for (const b of this.balls) things.push({ y: b.y, f: () => {
        g.fillStyle = 'rgba(120,70,20,.2)'; g.beginPath(); g.ellipse(b.x, b.y + b.r * 0.85, b.r, b.r * 0.35, 0, 0, TAU); g.fill();
        g.fillStyle = b.col; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 4; g.beginPath(); g.arc(b.x, b.y, b.r * 0.65, b.spin, b.spin + 2); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.22, 0, TAU); g.fill();
      } });
      for (const e of this.es) if (!e.out) things.push({ y: e.y, f: () => {
        if (e.dash > 0) { g.globalAlpha = 0.3; g.fillStyle = PARTY_COLORS[e.p.col].c; g.beginPath(); g.arc(e.x - e.vx * 0.05, e.y - e.vy * 0.05, e.r, 0, TAU); g.fill(); g.globalAlpha = 1; }
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: e.squash, hop: e.walk ? Math.abs(Math.sin(e.walk)) * 7 : 0, alpha: (e.inv > 0 && (t * 10 | 0) % 2) || e.dash > 0 ? 0.55 : 1, stun: e.inv > (this.kid ? 1.1 : 0.9) });
        drawTag(g, e.x, e.y - e.r - 28, e.p);
        if (!this.kid) { g.fillStyle = '#ff4f6d'; g.font = '20px system-ui'; g.textAlign = 'center'; for (let h = 0; h < e.lives; h++) g.fillText('♥', e.x - (e.lives - 1) * 11 + h * 22, e.y + e.r + 18); }
      } });
      things.sort((a, b) => a.y - b.y).forEach(o => o.f());
    }
    chip(p) { const e = this.by.get(p); return this.kid ? '被打 ' + e.hits : e.out ? '出局' : '♥'.repeat(e.lives); }
    pad(p) { const e = this.by.get(p); return this.kid ? '被打到 ' + e.hits + ' 次' : e.out ? '出局了，看大家躲！' : '♥ × ' + e.lives; }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && !e.out; }
    results() {
      if (this.kid) return { rows: this.es.slice().sort((a, b) => a.hits - b.hits).map(e => ({ p: e.p, key: e.hits, line: e.hits ? `被打到 ${e.hits} 次` : '一次都沒被打到！' })) };
      return { rows: this.es.slice().sort((a, b) => (a.out - b.out) || (a.out ? b.outAt - a.outAt : b.lives - a.lives)).map(e => ({ p: e.p, key: e.out ? 'o' + e.outAt : 'l' + e.lives, line: e.out ? `撐了 ${Math.round(e.alive)} 秒` : `剩 ${e.lives} 顆心` })) };
    }
  }
  GAMES.push({
    id: 'dodge', name: '躲躲球', icon: '⚽', col: '#ff9a1f', bg: '#ffd9a8', kind: 'vs', players: '1–6 人',
    blurb: '彈來彈去的球越來越多，快躲開！',
    btn: { label: '閃開', icon: '💨' },
    rules: kid => kid
      ? ['球會從旁邊飛進來，看到「!」就要小心', '用搖桿跑開，不要被球打到', '按「閃開」衝一下，衝的時候球打不到你', '60 秒後，被打到最少的人贏']
      : ['球越來越多、越來越快，碰到就少一顆心', '每人 3 顆心，沒了就出局', '「閃開」衝刺的瞬間球打不到你（1.6 秒一次）', '最後還留著的人贏'],
    thumb(g) {
      g.fillStyle = '#ffeacc'; g.fillRect(0, 0, 320, 180);
      const ball = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, TAU); g.fill(); };
      ball(70, 50, 18, '#ff5a5f'); ball(250, 60, 16, '#3d9bff'); ball(200, 140, 20, '#2fc46b'); ball(40, 140, 14, '#a066ff');
      drawCritter(g, 140, 95, 24, 5, 2, { face: 0.5, squash: -0.1 }); drawCritter(g, 230, 100, 20, 2, 4, { face: 2, stun: true });
    },
    create: ctx => new Dodge(ctx)
  });
})();
