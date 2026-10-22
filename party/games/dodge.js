'use strict';
/* 躲躲球 — bouncy balls fly round the gym and more keep coming. Don't get hit!
   A dashed line shows where each new ball will go. The dash makes you slip through
   for a moment (and slipping through a ball earns a 「閃！」).
   小朋友: slow balls, getting hit only counts (fewest hits wins).
   大人: 3 hearts, faster balls, last one standing wins. */
(() => {
  const X0 = 60, Y0 = 150, X1 = 1540, Y1 = 860, CX = 800, CY = 505;
  const BALL_COLS = ['#ff5a5f', '#ffb21f', '#3d9bff', '#2fc46b', '#a066ff', '#ff7fb8'];
  const TRAIL = 8, DASH = [16, 12], NODASH = [];

  function steer(e, ix, iy, sp, dt, acc) {
    const tx = ix * sp, ty = iy * sp, moving = ix || iy;
    const rate = !moving ? 24 : (e.vx * tx + e.vy * ty < 0 ? 22 : (acc || 13));
    const k = 1 - Math.exp(-rate * dt);
    e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
    if (!moving && e.vx * e.vx + e.vy * e.vy < 300) { e.vx = 0; e.vy = 0; }
  }
  function spring(e, dt) { e.sqv += (-e.sq * 320 - e.sqv * 15) * dt; e.sq += e.sqv * dt; }
  function bgLayer(self, g, paint) {
    const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
    if (!self.bgCv || self.bgS !== s) {
      const c = self.bgCv || document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(H * s);
      const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 0, 0); paint(cg); self.bgCv = c; self.bgS = s;
    }
    g.drawImage(self.bgCv, 0, 0, W, H);
  }
  function heart(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x - s * 0.1, y + s * 0.2, x - s * 0.55, y - s * 0.05, x - s * 0.5, y - s * 0.3);
    g.bezierCurveTo(x - s * 0.45, y - s * 0.6, x - s * 0.05, y - s * 0.6, x, y - s * 0.3);
    g.bezierCurveTo(x + s * 0.05, y - s * 0.6, x + s * 0.45, y - s * 0.6, x + s * 0.5, y - s * 0.3);
    g.bezierCurveTo(x + s * 0.55, y - s * 0.05, x + s * 0.1, y + s * 0.2, x, y + s * 0.35);
    g.fill();
  }

  class Dodge {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = this.kid ? 60 : 120; this.outN = 0; this.teams = !!ctx.teams; this.edge = '#d9bb93';
      const n = ctx.players.length;
      this.es = ctx.players.map((p, i) => {
        const a = i * TAU / Math.max(1, n), ghosts = []; for (let k = 0; k < 4; k++) ghosts.push({ x: 0, y: 0, face: 0, a: 0 });
        return { p, x: CX + Math.cos(a) * (n > 1 ? 200 : 0), y: CY + Math.sin(a) * (n > 1 ? 140 : 0), vx: 0, vy: 0, face: a, r: 30, cd: 0, dash: 0, inv: 1.5, hits: 0, lives: 3, out: false, outAt: 0, outT: 0, alive: 0,
          walk: 0, sq: 0, sqv: 0, flashT: 0, stunT: 0, dodges: 0, dodgeB: null, dodgeT: 0, ghosts, gi: 0, gT: 0 };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.balls = []; this.warn = [];
      this.nextBall = 1.5; this.stage = 0; this.spd = this.target();
      this.max = (this.kid ? 4 : 6) + Math.min(4, n);
      this.grain = []; for (let i = 0; i < 70; i++) this.grain.push(rnd(X0, X1 - 120), rnd(Y0, Y1), rnd(40, 120));
      this.dl = []; this.dn = 0;
    }
    stageLen() { return this.kid ? 20 : 25; }
    target() { return (this.kid ? 210 : 290) + this.stage * (this.kid ? 30 : 45) + this.t * (this.kid ? 0.5 : 1); }
    /* where a new ball will roll: a straight line that bounces off the walls */
    path(x, y, a, r, len) {
      const pts = [x, y]; let px = x, py = y, dx = Math.cos(a), dy = Math.sin(a), left = len;
      for (let b = 0; b < 3 && left > 1; b++) {
        const tx = dx > 0 ? (X1 - r - px) / dx : dx < 0 ? (X0 + r - px) / dx : Infinity, ty = dy > 0 ? (Y1 - r - py) / dy : dy < 0 ? (Y0 + r - py) / dy : Infinity;
        const tt = Math.max(0, Math.min(tx, ty, left)); px += dx * tt; py += dy * tt; pts.push(px, py); left -= tt;
        if (tt === tx) dx = -dx; else if (tt === ty) dy = -dy;
      }
      return pts;
    }
    spawn() {
      const side = rint(4), r = rnd(22, 32);
      let x, y, a;
      if (side === 0) { x = X0 + r; y = rnd(Y0 + 60, Y1 - 60); a = rnd(-0.7, 0.7); }
      else if (side === 1) { x = X1 - r; y = rnd(Y0 + 60, Y1 - 60); a = Math.PI + rnd(-0.7, 0.7); }
      else if (side === 2) { x = rnd(X0 + 60, X1 - 60); y = Y0 + r; a = Math.PI / 2 + rnd(-0.7, 0.7); }
      else { x = rnd(X0 + 60, X1 - 60); y = Y1 - r; a = -Math.PI / 2 + rnd(-0.7, 0.7); }
      this.warn.push({ x, y, a, r, t: 0, dur: this.kid ? 1.5 : 1.2, col: BALL_COLS[rint(BALL_COLS.length)], pts: this.path(x, y, a, r, this.kid ? 900 : 650) });
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      // stages: the balls get faster / more of them, and everyone is told
      const st = Math.floor(this.t / this.stageLen());
      if (st > this.stage) {
        this.stage = st;
        if (this.t < this.dur - 12) { ctx.sfx('star'); Fx.announce(st % 2 ? '球變快了！' : '球變多了！', '#ff3b4a'); Fx.flash('#ffe9c2', 0.25); }
      }
      this.spd += (this.target() - this.spd) * Math.min(1, dt * 2);
      this.nextBall -= dt;
      const cap = Math.min(this.max, 2 + Math.floor(this.t / (kid ? 7 : 5)) + this.stage);
      if (this.nextBall <= 0 && this.balls.length + this.warn.length < cap) { this.spawn(); this.nextBall = Math.max(kid ? 1.6 : 1, (kid ? 3 : 2) - this.stage * (kid ? 0.4 : 0.25)); }
      for (const w of this.warn) {
        w.t += dt;
        if (w.t >= w.dur) {
          const s = this.spd, tr = new Float32Array(TRAIL * 2); for (let k = 0; k < TRAIL; k++) { tr[k * 2] = w.x; tr[k * 2 + 1] = w.y; }
          this.balls.push({ x: w.x, y: w.y, vx: Math.cos(w.a) * s, vy: Math.sin(w.a) * s, r: w.r, col: w.col, spin: 0, sq: 0.3, sax: Math.abs(Math.cos(w.a)) > 0.7 ? 1 : 0, tr, ti: 0 });
          ctx.sfx('pop'); Fx.ring(w.x, w.y, w.col, 70, 0.35); w.done = true;
        }
      }
      if (this.warn.some(w => w.done)) this.warn = this.warn.filter(w => !w.done);
      const want = this.spd;
      for (const b of this.balls) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * want / b.r * 0.5; b.sq = Math.max(0, b.sq - dt * 2.4);
        let bx = 0, by = 0;
        if (b.x < X0 + b.r) { b.x = X0 + b.r; b.vx = Math.abs(b.vx); bx = -1; }
        if (b.x > X1 - b.r) { b.x = X1 - b.r; b.vx = -Math.abs(b.vx); bx = 1; }
        if (b.y < Y0 + b.r) { b.y = Y0 + b.r; b.vy = Math.abs(b.vy); by = -1; }
        if (b.y > Y1 - b.r) { b.y = Y1 - b.r; b.vy = -Math.abs(b.vy); by = 1; }
        if (bx || by) { b.sq = 0.35; b.sax = bx ? 1 : 0; Fx.dust(b.x + bx * b.r, b.y + by * b.r, 'rgba(255,240,220,.85)', 10); }
        const m = hyp(b.vx, b.vy) || 1; b.vx *= want / m; b.vy *= want / m;
        b.ti = (b.ti + 1) % TRAIL; b.tr[b.ti * 2] = b.x; b.tr[b.ti * 2 + 1] = b.y;
      }
      for (const e of this.es) {
        if (e.out) { e.outT += dt; continue; }
        e.alive += dt; e.cd -= dt; e.dash -= dt; e.inv -= dt; e.flashT -= dt; e.stunT -= dt; e.dodgeT -= dt; spring(e, dt);
        for (const G of e.ghosts) G.a = Math.max(0, G.a - dt * 2.4);
        const i = ctx.input(e.p);
        if (ctx.pressed(e.p, 0) && e.cd <= 0) {
          e.dash = 0.32; e.cd = kid ? 1.2 : 1.6; e.sq = -0.22; e.sqv = 0; e.gT = 0; ctx.sfx('whoosh');
          for (let k = 0; k < 3; k++) Fx.dust(e.x, e.y + e.r * 0.7, 'rgba(255,240,220,.9)', 12);
        }
        let ix = i.x, iy = i.y; if (e.dash > 0 && !ix && !iy) { ix = Math.cos(e.face); iy = Math.sin(e.face); }
        steer(e, ix, iy, (kid ? 330 : 360) * (e.dash > 0 ? 2.2 : 1), dt, e.dash > 0 ? 20 : 13);
        if (ix || iy) e.face = Math.atan2(iy, ix);
        e.x = clamp(e.x + e.vx * dt, X0 + e.r, X1 - e.r); e.y = clamp(e.y + e.vy * dt, Y0 + e.r, Y1 - e.r);
        const s = hyp(e.vx, e.vy); if (s > 30) e.walk += dt * (6 + s / 40);
        Fx.walk(e, dt, 'rgba(255,240,220,.85)');
        if (e.dash > 0 && (e.gT -= dt) <= 0) {   // afterimages
          e.gT = 0.045; const G = e.ghosts[e.gi = (e.gi + 1) % e.ghosts.length]; G.x = e.x; G.y = e.y; G.face = e.face; G.a = 0.5;
        }
        for (const b of this.balls) {
          const dx = e.x - b.x, dy = e.y - b.y, d = hyp(dx, dy);
          if (d > e.r + b.r - 6) continue;
          if (e.dash > 0) {   // slipped right through it!
            if (b !== e.dodgeB) {
              e.dodges++; ctx.sfx('coin'); ctx.buzz(e.p, 30);
              Fx.pop(e.x, e.y - 78, '閃！', '#1f9a52', 48); Fx.ring(e.x, e.y, '#7dffb0', 90, 0.35);
            }
            e.dodgeB = b; e.dodgeT = 0.4; continue;
          }
          if (e.inv > 0 || (b === e.dodgeB && e.dodgeT > 0)) continue;
          e.hits++; e.inv = kid ? 1.5 : 1.3; e.sq = 0.3; e.sqv = 0; e.flashT = 0.3; e.stunT = 0.4;
          e.vx = dx / (d || 1) * 520; e.vy = dy / (d || 1) * 520;
          const bs = hyp(b.vx, b.vy); b.vx = -dx / (d || 1) * bs; b.vy = -dy / (d || 1) * bs; b.sq = 0.4; b.sax = Math.abs(dx) > Math.abs(dy) ? 1 : 0;
          ctx.sfx('bonk', 0.7); ctx.buzz(e.p, 200); Fx.burst(e.x, e.y, b.col, 12, 300); Fx.shake(kid ? 4 : 7);
          if (!kid) {
            e.lives--;
            const hx = e.x - e.lives * 12 + e.lives * 24, hy = e.y + e.r + 18;   // the heart that just went
            Fx.burst(hx, hy, '#ff8fa3', 8, 180); Fx.pop(hx, hy - 10, '💔', '#ff4f6d', 34);
            if (e.lives <= 0) {
              e.out = true; e.outAt = ++this.outN; e.outT = 0; ctx.hitstop(0.05); Fx.shake(11); Fx.flash('#ff4f6d', 0.18);
              Fx.burst(e.x, e.y, PARTY_COLORS[e.p.col].c, 20, 360); Fx.pop(e.x, e.y - 70, e.p.name + ' 出局', '#2b2340', 44); ctx.buzz(e.p, 400);
            } else Fx.pop(e.x + 40, e.y - 60, '♥ -1', '#ff4f6d', 34);
          } else Fx.pop(e.x, e.y - 74, '哎呀！', '#ff4f6d', 36);
          break;
        }
      }
      for (let a = 0; a < this.es.length; a++) for (let b = a + 1; b < this.es.length; b++) {
        const A = this.es[a], B = this.es[b]; if (A.out || B.out) continue;
        const dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
        if (d < m && d > 0) { const o = (m - d) / 2; A.x -= dx / d * o; A.y -= dy / d * o; B.x += dx / d * o; B.y += dy / d * o; }
      }
      if (this.t >= this.dur) this.over = true;
      if (!kid) {
        let a0 = 0, a1 = 0, al = 0; for (const e of this.es) if (!e.out) { al++; if (e.p.team) a1++; else a0++; }
        if (this.teams ? !(a0 && a1) : (this.es.length > 1 ? al <= 1 : al === 0)) this.over = true;
      }
    }

    /* ---------------- drawing ---------------- */
    paintBg(g) {
      g.fillStyle = '#d9bb93'; g.fillRect(0, 0, W, H);
      // gym wall: blue safety mats and a string of little flags
      g.fillStyle = '#c9a77c'; g.fillRect(0, 88, W, 8);
      for (let x = 4; x < W; x += 132) {
        g.fillStyle = '#3d6fd1'; g.beginPath(); g.roundRect(x, 96, 124, 48, 8); g.fill();
        g.fillStyle = '#5a8ae6'; g.beginPath(); g.roundRect(x + 6, 100, 112, 10, 5); g.fill();
      }
      for (const sx of [0, X1 + 16]) for (let y = 160; y < H; y += 120) {
        g.fillStyle = '#3d6fd1'; g.beginPath(); g.roundRect(sx + 4, y, 36, 112, 8); g.fill();
        g.fillStyle = '#5a8ae6'; g.fillRect(sx + 9, y + 6, 8, 100);
      }
      g.strokeStyle = 'rgba(80,50,30,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 96); for (let x = 0; x <= W; x += 80) g.quadraticCurveTo(x + 40, 112, x + 80, 96); g.stroke();
      for (let x = 0, k = 0; x < W; x += 40, k++) { g.fillStyle = BALL_COLS[k % BALL_COLS.length]; const yy = 97 + Math.sin((x % 80) / 80 * Math.PI) * 8; g.beginPath(); g.moveTo(x + 6, yy); g.lineTo(x + 26, yy); g.lineTo(x + 16, yy + 20); g.closePath(); g.fill(); }
      // wooden floor
      g.save(); g.beginPath(); g.roundRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20, 30); g.clip();
      for (let y = Y0 - 10, row = 0; y < Y1 + 10; y += 30, row++) {
        g.fillStyle = row % 3 === 0 ? '#f2c48a' : row % 3 === 1 ? '#efbf83' : '#f4c991'; g.fillRect(X0 - 10, y, X1 - X0 + 20, 30);
        g.fillStyle = 'rgba(150,90,40,.28)'; g.fillRect(X0 - 10, y + 29, X1 - X0 + 20, 1.5);
        for (let x = X0 - 10 + ((row * 173) % 260); x < X1 + 10; x += 260) g.fillRect(x, y, 1.5, 30);
      }
      g.strokeStyle = 'rgba(160,100,50,.13)'; g.lineWidth = 1.5; g.beginPath();
      for (let i = 0; i < this.grain.length; i += 3) { const x = this.grain[i], y = Math.round((this.grain[i + 1] - Y0) / 30) * 30 + Y0 + 8 + (i % 4) * 3, L = this.grain[i + 2]; g.moveTo(x, y); g.quadraticCurveTo(x + L / 2, y + 4, x + L, y); }
      g.stroke();
      const sh = g.createLinearGradient(0, Y0, 0, Y1); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(120,60,20,.08)');
      g.fillStyle = sh; g.fillRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20);
      if (this.teams) { g.globalAlpha = 0.08; g.fillStyle = TEAMS[0].c; g.fillRect(X0 - 10, Y0 - 10, CX - X0 + 10, Y1 - Y0 + 20); g.fillStyle = TEAMS[1].c; g.fillRect(CX, Y0 - 10, X1 - CX + 10, Y1 - Y0 + 20); g.globalAlpha = 1; }
      // painted court
      g.fillStyle = 'rgba(255,110,50,.16)';
      g.fillRect(X0, CY - 150, 230, 300); g.fillRect(X1 - 230, CY - 150, 230, 300);
      g.beginPath(); g.arc(CX, CY, 120, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(CX, Y0); g.lineTo(CX, Y1); g.stroke();
      g.beginPath(); g.arc(CX, CY, 120, 0, TAU); g.stroke(); g.beginPath(); g.arc(CX, CY, 34, 0, TAU); g.stroke();
      g.strokeRect(X0, CY - 150, 230, 300); g.strokeRect(X1 - 230, CY - 150, 230, 300);
      g.beginPath(); g.arc(X0 + 230, CY, 80, -Math.PI / 2, Math.PI / 2); g.stroke(); g.beginPath(); g.arc(X1 - 230, CY, 80, Math.PI / 2, Math.PI * 1.5); g.stroke();
      g.beginPath(); g.arc(X0, CY, 420, -Math.PI / 2, Math.PI / 2); g.stroke(); g.beginPath(); g.arc(X1, CY, 420, Math.PI / 2, Math.PI * 1.5); g.stroke();
      g.restore();
      g.strokeStyle = '#e8a35c'; g.lineWidth = 10; g.beginPath(); g.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 24); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.roundRect(X0 - 6, Y0 - 6, X1 - X0 + 12, Y1 - Y0 + 12, 28); g.stroke();
    }
    drawWarn(g, w, t) {
      const k = w.t / w.dur, P = w.pts, blink = (t * 8 | 0) % 2;
      g.globalAlpha = 0.25 + 0.55 * k; g.strokeStyle = w.col; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
      g.setLineDash(DASH); g.lineDashOffset = -t * 90; g.beginPath(); g.moveTo(P[0], P[1]); for (let j = 2; j < P.length; j += 2) g.lineTo(P[j], P[j + 1]); g.stroke(); g.setLineDash(NODASH);
      // arrow head at the end of the path
      const n = P.length, ex = P[n - 2], ey = P[n - 1], a = Math.atan2(ey - P[n - 3], ex - P[n - 4]);
      g.fillStyle = w.col; g.beginPath(); g.moveTo(ex + Math.cos(a) * 14, ey + Math.sin(a) * 14); g.lineTo(ex + Math.cos(a + 2.4) * 16, ey + Math.sin(a + 2.4) * 16); g.lineTo(ex + Math.cos(a - 2.4) * 16, ey + Math.sin(a - 2.4) * 16); g.closePath(); g.fill();
      // the ball about to arrive: an outline that fills in
      g.globalAlpha = 1; g.strokeStyle = w.col; g.lineWidth = 4; g.beginPath(); g.arc(w.x, w.y, w.r, 0, TAU); g.stroke();
      g.globalAlpha = 0.35; g.fillStyle = w.col; g.beginPath(); g.moveTo(w.x, w.y); g.arc(w.x, w.y, w.r, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.closePath(); g.fill();
      g.globalAlpha = 1;
      const bx = w.x, by = (w.y - w.r - 26 < Y0 + 10 ? w.y + w.r + 26 : w.y - w.r - 26) - (blink ? 3 : 0);
      g.fillStyle = '#ff3b4a'; g.beginPath(); g.arc(bx, by, 17, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.font = '900 26px "Fredoka",system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', bx, by + 1);
    }
    drawBall(g, b) {
      // motion trail
      g.fillStyle = b.col;
      for (let k = 1; k < TRAIL; k += 1) {
        const j = (b.ti - k * 1 + TRAIL * 2) % TRAIL, f = 1 - k / TRAIL;
        g.globalAlpha = 0.16 * f; g.beginPath(); g.arc(b.tr[j * 2], b.tr[j * 2 + 1], b.r * (0.5 + 0.45 * f), 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(120,70,20,.22)'; g.beginPath(); g.ellipse(b.x, b.y + b.r * 0.85, b.r * (1 + b.sq * 0.3), b.r * 0.35, 0, 0, TAU); g.fill();
      const sx = b.sax ? 1 - b.sq : 1 + b.sq * 0.6, sy = b.sax ? 1 + b.sq * 0.6 : 1 - b.sq;
      g.save(); g.translate(b.x, b.y); g.scale(sx, sy);
      g.fillStyle = b.col; g.beginPath(); g.arc(0, 0, b.r, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2.5; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = b.r * 0.2; g.lineCap = 'round';
      g.beginPath(); g.arc(0, 0, b.r * 0.62, b.spin, b.spin + 1.9); g.stroke();
      g.beginPath(); g.arc(0, 0, b.r * 0.62, b.spin + Math.PI, b.spin + Math.PI + 1.9); g.stroke();
      g.fillStyle = 'rgba(0,0,0,.1)'; g.beginPath(); g.arc(b.r * 0.12, b.r * 0.12, b.r * 0.86, 0.1, Math.PI * 0.9); g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-b.r * 0.36, -b.r * 0.38, b.r * 0.26, b.r * 0.17, -0.7, 0, TAU); g.fill();
      g.restore();
    }
    drawPlayer(g, e, t) {
      if (e.out) {   // floats up and fades away
        const k = Math.min(1, e.outT / 1.2);
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, stun: true, hop: k * 60, rot: Math.sin(t * 6) * 0.3, alpha: 1 - k, noShadow: true });
        return;
      }
      for (const G of e.ghosts) if (G.a > 0.02) drawCritter(g, G.x, G.y, e.r, e.p.col, e.p.animal, { face: G.face, alpha: G.a * 0.7, noShadow: true });
      const s = hyp(e.vx, e.vy), m = Math.min(1, s / 220), bob = Math.abs(Math.sin(e.walk)), hop = bob * 7 * m, sq = e.sq + (0.5 - bob) * 0.08 * m;
      const stun = e.stunT > 0;
      if (e.dash > 0) { g.strokeStyle = 'rgba(125,255,176,.8)'; g.lineWidth = 4; g.beginPath(); g.arc(e.x, e.y - hop, e.r + 9, 0, TAU); g.stroke(); }
      drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: sq, hop, rot: clamp(e.vx / 2600, -0.14, 0.14), stun,
        alpha: e.inv > 0 && !stun && (t * 10 | 0) % 2 ? 0.5 : 1, blink: (t + e.p.uid * 1.3) % 3.6 < 0.12, happy: e.dodgeT > 0 && e.dash <= 0 });
      if (e.flashT > 0) { g.globalAlpha = Math.min(1, e.flashT * 3.5) * 0.8; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(e.x, e.y - hop, e.r * 1.04, 0, TAU); g.fill(); g.globalAlpha = 1; }
      if (stun) { g.font = '22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let k = 0; k < 3; k++) { const a = t * 5 + k * TAU / 3; g.fillText('⭐', e.x + Math.cos(a) * 30, e.y - e.r - 6 - hop + Math.sin(a) * 9); } }
      drawTag(g, e.x, e.y - e.r - 30, e.p);
      if (!this.kid) { g.fillStyle = '#ff4f6d'; for (let h = 0; h < e.lives; h++) heart(g, e.x - (e.lives - 1) * 12 + h * 24, e.y + e.r + 20, 22); }
    }
    add(y, k, o) { let it = this.dl[this.dn]; if (!it) it = this.dl[this.dn] = { y: 0, k: 0, o: null }; it.y = y; it.k = k; it.o = o; this.dn++; }
    draw(g) {
      const t = this.t;
      bgLayer(this, g, cg => this.paintBg(cg));
      Fx.ground(g);
      for (const w of this.warn) this.drawWarn(g, w, t);
      this.dn = 0;
      for (const b of this.balls) this.add(b.y, 0, b);
      for (const e of this.es) if (!e.out || e.outT < 1.2) this.add(e.y, 1, e);
      const L = this.dl;
      for (let i = 1; i < this.dn; i++) { const it = L[i]; let j = i - 1; while (j >= 0 && L[j].y > it.y) { L[j + 1] = L[j]; j--; } L[j + 1] = it; }
      for (let i = 0; i < this.dn; i++) { const it = L[i]; if (it.k === 0) this.drawBall(g, it.o); else this.drawPlayer(g, it.o, t); }
    }
    chip(p) { const e = this.by.get(p); return this.kid ? '被打 ' + e.hits : e.out ? '出局' : '♥'.repeat(e.lives); }
    pad(p) { const e = this.by.get(p); return this.kid ? '被打到 ' + e.hits + ' 次' + (e.dodges ? '・閃過 ' + e.dodges : '') : e.out ? '出局了，看大家躲！' : '♥ × ' + e.lives + (e.dodges ? '　閃過 ' + e.dodges : ''); }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && !e.out; }
    teamScore(t) { const m = this.es.filter(e => e.p.team === t); return this.kid ? '被打 ' + m.reduce((s, e) => s + e.hits, 0) : '♥' + m.reduce((s, e) => s + (e.out ? 0 : e.lives), 0); }
    results() {
      const tv = t => this.es.filter(e => e.p.team === t).reduce((s, e) => s + (this.kid ? e.hits : (e.out ? 0 : e.lives)), 0);
      const team = this.teams ? { teamScores: [tv(0), tv(1)], lowWins: this.kid, teamText: t => this.teamScore(t) } : {};
      const dz = e => e.dodges ? `・閃過 ${e.dodges} 次` : '';
      if (this.kid) return { ...team, rows: this.es.slice().sort((a, b) => a.hits - b.hits).map(e => ({ p: e.p, key: e.hits, line: (e.hits ? `被打到 ${e.hits} 次` : '一次都沒被打到！') + dz(e) })) };
      return { ...team, rows: this.es.slice().sort((a, b) => (a.out - b.out) || (a.out ? b.outAt - a.outAt : b.lives - a.lives)).map(e => ({ p: e.p, key: e.out ? 'o' + e.outAt : 'l' + e.lives, line: (e.out ? `撐了 ${Math.round(e.alive)} 秒` : `剩 ${e.lives} 顆心`) + dz(e) })) };
    }
  }
  GAMES.push({
    id: 'dodge', name: '躲躲球', icon: '⚽', col: '#ff9a1f', bg: '#d9bb93', kind: 'vs', teams: true, players: '1–6 人',
    blurb: '彈來彈去的球越來越多，快躲開！',
    btn: { label: '閃開', icon: '💨' },
    rules: kid => kid
      ? ['球會從旁邊飛進來，虛線就是它要走的路，看到「!」要小心', '用搖桿跑開，不要被球打到', '按「閃開」衝一下，衝的時候球打不到你，穿過球還會「閃！」', '60 秒後，被打到最少的人贏']
      : ['球越來越多、越來越快，碰到就少一顆心；虛線是新球的路線', '每人 3 顆心，沒了就出局', '「閃開」衝刺的瞬間球打不到你（1.6 秒一次），穿過球會「閃！」', '最後還留著的人贏'],
    thumb(g) {
      g.fillStyle = '#f2c48a'; g.fillRect(0, 0, 320, 180);
      g.strokeStyle = 'rgba(150,90,40,.25)'; g.lineWidth = 1; for (let y = 15; y < 180; y += 15) { g.beginPath(); g.moveTo(0, y); g.lineTo(320, y); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(160, 90, 40, 0, TAU); g.stroke();
      g.strokeStyle = '#3d9bff'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(250, 60); g.lineTo(150, 20); g.stroke(); g.setLineDash([]);
      const ball = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, TAU); g.fill(); };
      g.globalAlpha = 0.25; ball(60, 62, 16, '#ff5a5f'); g.globalAlpha = 1;
      ball(70, 50, 18, '#ff5a5f'); ball(250, 60, 16, '#3d9bff'); ball(200, 140, 20, '#2fc46b'); ball(40, 140, 14, '#a066ff');
      g.globalAlpha = 0.35; drawCritter(g, 115, 105, 24, 5, 2, { face: 0.5, noShadow: true }); g.globalAlpha = 1;
      drawCritter(g, 140, 95, 24, 5, 2, { face: 0.5, squash: -0.1 }); drawCritter(g, 230, 100, 20, 2, 4, { face: 2, stun: true });
    },
    create: ctx => new Dodge(ctx)
  });
})();
