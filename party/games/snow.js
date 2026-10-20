'use strict';
/* 雪球大戰 — throw snowballs the way you're facing; every hit is a point.
   Snow walls block throws. Snowmen pop up too (a point each), so one player can play.
   小朋友: big snowballs that bend a little toward the nearest target, a hit only
   makes you shiver. 大人: small snowballs, a hit freezes you for a moment. */
(() => {
  const X0 = 60, Y0 = 150, X1 = 1540, Y1 = 860;
  class Snow {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = 60;
      const n = ctx.players.length;
      this.es = ctx.players.map((p, i) => {
        const left = i % 2 === 0, row = Math.floor(i / 2), rows = Math.ceil(n / 2);
        return { p, x: left ? 220 : 1380, y: Y0 + (Y1 - Y0) * (row + 1) / (rows + 1), vx: 0, vy: 0, face: left ? 0 : Math.PI, r: 32, cd: 0, cold: 0, inv: 0, hits: 0, hurt: 0, walk: 0, squash: 0 };
      });
      if (n === 1) this.es[0].x = 800;
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.balls = []; this.men = []; this.manT = 1;
      this.walls = [];
      const lay = this.kid ? [[800, 330, 0], [800, 690, 0], [520, 505, 1], [1080, 505, 1]] : [[800, 300, 0], [800, 710, 0], [500, 420, 1], [1100, 590, 1], [560, 720, 0], [1040, 290, 0]];
      for (const [x, y, v] of lay) this.walls.push(v ? { x: x - 22, y: y - 80, w: 44, h: 160 } : { x: x - 90, y: y - 22, w: 180, h: 44 });
      this.flakes = []; for (let i = 0; i < 70; i++) this.flakes.push({ x: rnd(-200, 1800), y: rnd(0, 900), s: rnd(1.5, 4), v: rnd(20, 60) });
    }
    hitWall(x, y, r) { return this.walls.some(w => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h); }
    pushOut(e) {
      for (const w of this.walls) {
        const cx = clamp(e.x, w.x, w.x + w.w), cy = clamp(e.y, w.y, w.y + w.h), dx = e.x - cx, dy = e.y - cy, d = hyp(dx, dy);
        if (d < e.r) { if (d > 0) { e.x = cx + dx / d * e.r; e.y = cy + dy / d * e.r; } else e.y = w.y - e.r; }
      }
      e.x = clamp(e.x, X0 + e.r, X1 - e.r); e.y = clamp(e.y, Y0 + e.r, Y1 - e.r);
    }
    throwBall(e) {
      const ctx = this.ctx, br = this.kid ? 16 : 11, sp = this.kid ? 640 : 760;
      let a = e.face;
      if (this.kid) {   // a gentle nudge toward the nearest target in front
        let best = null, bd = 0.45;
        const targets = this.es.filter(o => o !== e).map(o => ({ x: o.x, y: o.y })).concat(this.men.filter(m => m.st === 'up'));
        for (const o of targets) { const ang = Math.atan2(o.y - e.y, o.x - e.x), diff = Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a))); if (diff < bd && hyp(o.x - e.x, o.y - e.y) < 650) { bd = diff; best = ang; } }
        if (best !== null) a = best;
      }
      this.balls.push({ x: e.x + Math.cos(a) * (e.r + 6), y: e.y + Math.sin(a) * (e.r + 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: br, from: e, life: 0.95 });
      e.cd = this.kid ? 0.5 : 0.7; e.squash = 0.12; ctx.sfx('whoosh');
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      for (const f of this.flakes) { f.y += f.v * dt; f.x += Math.sin(this.t + f.s) * 10 * dt; if (f.y > 900) { f.y = -10; f.x = rnd(-200, 1800); } }
      for (const e of this.es) {
        e.cd -= dt; e.inv -= dt; e.hurt -= dt; e.squash *= 0.85;
        if (e.cold > 0) { e.cold -= dt; e.vx *= 0.85; e.vy *= 0.85; continue; }
        const i = ctx.input(e.p), sp = kid ? 320 : 350, k = 1 - Math.exp(-10 * dt);
        e.vx += (i.x * sp - e.vx) * k; e.vy += (i.y * sp - e.vy) * k;
        if (i.x || i.y) { e.face = Math.atan2(i.y, i.x); e.walk += dt * 12; } else e.walk = 0;
        e.x += e.vx * dt; e.y += e.vy * dt; this.pushOut(e);
        if (ctx.pressed(e.p, 0) && e.cd <= 0) this.throwBall(e);
      }
      for (let a = 0; a < this.es.length; a++) for (let b = a + 1; b < this.es.length; b++) {
        const A = this.es[a], B = this.es[b], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
        if (d < m && d > 0) { const o = (m - d) / 2; A.x -= dx / d * o; A.y -= dy / d * o; B.x += dx / d * o; B.y += dy / d * o; }
      }
      // snowmen keep popping up
      this.manT -= dt;
      const want = this.es.length === 1 ? 3 : 2;
      if (this.manT <= 0 && this.men.filter(m => m.st === 'up').length < want) {
        this.manT = rnd(1.5, 3);
        for (let k = 0; k < 20; k++) {
          const x = rnd(X0 + 80, X1 - 80), y = rnd(Y0 + 80, Y1 - 60);
          if (this.hitWall(x, y, 60) || this.es.some(e => hyp(e.x - x, e.y - y) < 160)) continue;
          this.men.push({ x, y, st: 'up', t: 0 }); break;
        }
      }
      for (const m of this.men) m.t += dt;
      this.men = this.men.filter(m => m.st === 'up' || m.t < 0.6);
      for (const b of this.balls) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < X0 || b.x > X1 || b.y < Y0 || b.y > Y1 || this.hitWall(b.x, b.y, b.r * 0.6)) { b.dead = true; Fx.burst(b.x, b.y, '#ffffff', 6, 160); continue; }
        for (const m of this.men) if (m.st === 'up' && hyp(m.x - b.x, m.y - 26 - b.y) < 40 + b.r) {
          m.st = 'down'; m.t = 0; b.dead = true; b.from.hits++; ctx.sfx('coin');
          Fx.burst(m.x, m.y - 20, '#ffffff', 16, 320); Fx.pop(m.x, m.y - 70, '+1', PARTY_COLORS[b.from.p.col].d, 40); break;
        }
        if (b.dead) continue;
        for (const e of this.es) {
          if (e === b.from || e.inv > 0 || hyp(e.x - b.x, e.y - b.y) > e.r + b.r) continue;
          b.dead = true; b.from.hits++; e.hurt = 0.5; e.inv = 1.0;
          e.vx += b.vx * 0.35; e.vy += b.vy * 0.35;
          if (!kid) { e.cold = 0.8; ctx.sfx('stun'); } else ctx.sfx('bonk', 0.4);
          ctx.buzz(e.p, kid ? 80 : 200); ctx.buzz(b.from.p, 40);
          Fx.burst(b.x, b.y, '#ffffff', 14, 280); Fx.pop(b.from.x, b.from.y - 70, '+1', PARTY_COLORS[b.from.p.col].d, 40);
          Fx.pop(e.x + 30, e.y - 50, kid ? '好冰！' : '凍住了！', '#2f8cff', 30);
          break;
        }
      }
      this.balls = this.balls.filter(b => !b.dead);
      if (this.t >= this.dur) this.over = true;
    }
    draw(g) {
      const t = this.t;
      g.fillStyle = '#cfe6f7'; g.fillRect(-400, 0, W + 800, H);
      g.fillStyle = '#f4f9ff'; g.beginPath(); g.roundRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20, 36); g.fill();
      g.fillStyle = 'rgba(170,200,230,.35)'; for (let k = 0; k < 18; k++) { g.beginPath(); g.ellipse(X0 + 80 + (k * 211) % (X1 - X0 - 160), Y0 + 60 + (k * 137) % (Y1 - Y0 - 120), 60, 14, 0, 0, TAU); g.fill(); }
      // pine trees round the edge
      for (const [x, y, s] of [[20, 220, 1], [10, 520, 1.2], [30, 800, 0.9], [1585, 260, 1.1], [1590, 560, 0.9], [1575, 820, 1.2]]) {
        g.fillStyle = '#7a4a22'; g.fillRect(x - 8 * s, y + 20 * s, 16 * s, 30 * s);
        for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? '#2f8a5a' : '#3a9f69'; g.beginPath(); g.moveTo(x, y - 70 * s + k * 26 * s); g.lineTo(x + (40 + k * 10) * s, y + k * 24 * s); g.lineTo(x - (40 + k * 10) * s, y + k * 24 * s); g.fill(); }
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - 70 * s); g.lineTo(x + 16 * s, y - 46 * s); g.lineTo(x - 16 * s, y - 46 * s); g.fill();
      }
      const things = [];
      for (const w of this.walls) things.push({ y: w.y + w.h, f: () => {
        g.fillStyle = 'rgba(80,120,170,.2)'; g.beginPath(); g.roundRect(w.x + 6, w.y + 10, w.w, w.h, 14); g.fill();
        g.fillStyle = '#ffffff'; g.strokeStyle = '#b7d3ee'; g.lineWidth = 3; g.beginPath(); g.roundRect(w.x, w.y - 10, w.w, w.h + 10, 14); g.fill(); g.stroke();
        g.strokeStyle = '#d5e6f6'; g.lineWidth = 2;
        if (w.w > w.h) for (let x = w.x + 30; x < w.x + w.w; x += 30) { g.beginPath(); g.moveTo(x, w.y - 8); g.lineTo(x, w.y + w.h - 2); g.stroke(); }
        else for (let y = w.y + 20; y < w.y + w.h; y += 30) { g.beginPath(); g.moveTo(w.x + 2, y); g.lineTo(w.x + w.w - 2, y); g.stroke(); }
      } });
      for (const m of this.men) things.push({ y: m.y, f: () => {
        const k = m.st === 'up' ? Math.min(1, m.t * 4) : 1 - m.t / 0.6;
        g.save(); g.translate(m.x, m.y); g.scale(k, k); g.globalAlpha = Math.max(0, k);
        g.fillStyle = 'rgba(80,120,170,.25)'; g.beginPath(); g.ellipse(0, 6, 30, 9, 0, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.strokeStyle = '#b7d3ee'; g.lineWidth = 3;
        g.beginPath(); g.arc(0, -14, 26, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.arc(0, -52, 19, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#2b2340'; g.beginPath(); g.arc(-6, -55, 3, 0, TAU); g.arc(6, -55, 3, 0, TAU); g.fill();
        g.fillStyle = '#ff8a1f'; g.beginPath(); g.moveTo(0, -50); g.lineTo(16, -47); g.lineTo(0, -45); g.fill();
        g.fillStyle = '#ff4f58'; g.fillRect(-18, -38, 36, 7);
        g.fillStyle = '#2b2340'; g.fillRect(-14, -84, 28, 16); g.fillRect(-20, -70, 40, 5);
        g.restore();
      } });
      for (const e of this.es) things.push({ y: e.y, f: () => {
        if (e.cold > 0) { g.fillStyle = 'rgba(150,210,255,.55)'; g.beginPath(); g.roundRect(e.x - e.r - 8, e.y - e.r - 10, (e.r + 8) * 2, (e.r + 10) * 2, 16); g.fill(); }
        drawCritter(g, e.x + (e.hurt > 0 ? Math.sin(t * 60) * 3 : 0), e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: e.squash, hop: e.walk ? Math.abs(Math.sin(e.walk)) * 7 : 0, stun: e.cold > 0, alpha: e.inv > 0 && (t * 10 | 0) % 2 ? 0.6 : 1 });
        // little arrow showing where the next snowball goes
        g.fillStyle = PARTY_COLORS[e.p.col].c; g.save(); g.translate(e.x + Math.cos(e.face) * (e.r + 16), e.y + Math.sin(e.face) * (e.r + 16)); g.rotate(e.face);
        g.beginPath(); g.moveTo(10, 0); g.lineTo(-6, -8); g.lineTo(-6, 8); g.closePath(); g.fill(); g.restore();
        drawTag(g, e.x, e.y - e.r - 28, e.p);
      } });
      things.sort((a, b) => a.y - b.y).forEach(o => o.f());
      for (const b of this.balls) {
        g.fillStyle = 'rgba(80,120,170,.25)'; g.beginPath(); g.ellipse(b.x, b.y + 22, b.r, b.r * 0.4, 0, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.strokeStyle = '#9fc3e6'; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,.85)'; for (const f of this.flakes) { g.beginPath(); g.arc(f.x, f.y, f.s, 0, TAU); g.fill(); }
    }
    chip(p) { return '❄ ' + this.by.get(p).hits; }
    pad(p) { const e = this.by.get(p); return '打中 ' + e.hits + ' 次' + (e.cold > 0 ? '　凍住了！' : ''); }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && e.cold <= 0; }
    results() { return { rows: this.es.slice().sort((a, b) => b.hits - a.hits).map(e => ({ p: e.p, key: e.hits, line: `打中 ${e.hits} 次` })) }; }
  }
  GAMES.push({
    id: 'snow', name: '雪球大戰', icon: '⛄', col: '#2f8cff', bg: '#cfe6f7', kind: 'vs', players: '1–6 人',
    blurb: '丟雪球打中別人和雪人，打中最多的人贏！',
    btn: { label: '丟雪球', icon: '❄️' },
    rules: kid => kid
      ? ['搖桿走路，箭頭指的方向就是雪球飛去的方向', '按「丟雪球」，打中別人或雪人都得 1 分', '雪球會自己稍微轉向最近的目標', '60 秒後，打中最多的人贏']
      : ['搖桿走路和瞄準，按「丟雪球」往前丟', '打中人或雪人得 1 分，被打中會凍住一下', '雪牆可以躲，也會擋住雪球', '60 秒後，打中最多的人贏'],
    thumb(g) {
      g.fillStyle = '#f4f9ff'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#fff'; g.strokeStyle = '#b7d3ee'; g.lineWidth = 3; g.beginPath(); g.roundRect(140, 50, 30, 90, 10); g.fill(); g.stroke();
      drawCritter(g, 80, 100, 24, 1, 2, { face: 0 }); drawCritter(g, 240, 95, 24, 0, 1, { face: Math.PI, stun: true });
      g.fillStyle = '#fff'; g.strokeStyle = '#9fc3e6'; g.beginPath(); g.arc(205, 88, 9, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.arc(115, 96, 9, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(270, 150, 14, 0, TAU); g.arc(270, 128, 10, 0, TAU); g.fill();
    },
    create: ctx => new Snow(ctx)
  });
})();
