'use strict';
/* 趕羊羊 — everyone together herds the sheep into the pen on the right.
   Sheep shy away from you; the button makes your animal call out and startles
   nearby sheep. 大人: more and faster sheep, a narrower gate, and a wolf that
   scatters the flock until someone chases it off. */
(() => {
  const X0 = 50, Y0 = 150, X1 = 1550, Y1 = 870;
  const PX0 = 1250, PX1 = 1510, PY0 = 330, PY1 = 690;
  class Sheep {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.ok = false;
      const n = ctx.players.length, kid = this.kid;
      this.dur = kid ? 150 : 120;
      const gh = kid ? 170 : 120, gc = (PY0 + PY1) / 2; this.g0 = gc - gh / 2; this.g1 = gc + gh / 2;
      this.segs = [[PX0, PY0, PX1, PY0], [PX0, PY1, PX1, PY1], [PX1, PY0, PX1, PY1], [PX0, PY0, PX0, this.g0], [PX0, this.g1, PX0, PY1]];
      this.es = ctx.players.map((p, i) => ({ p, x: 200 + (i % 2) * 90, y: Y0 + (Y1 - Y0) * (i + 1) / (n + 1), vx: 0, vy: 0, face: 0, r: 32, cd: 0, walk: 0, herd: 0, say: 0, squash: 0 }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      const count = kid ? Math.min(10, 5 + n) : Math.min(18, 8 + n * 2);
      this.sheep = [];
      for (let k = 0; k < count; k++) {
        let x, y, tries = 0;
        do { x = rnd(420, 1100); y = rnd(Y0 + 60, Y1 - 60); tries++; } while (tries < 30 && this.sheep.some(s => hyp(s.x - x, s.y - y) < 70));
        this.sheep.push({ x, y, vx: 0, vy: 0, wa: rnd(0, TAU), in: false, panic: 0, by: null, r: 26, face: rnd(0, TAU), hop: rnd(0, TAU), heart: 0 });
      }
      this.total = count; this.inN = 0;
      this.wolf = kid ? null : { st: 'away', t: 22, x: -80, y: 500, vx: 0, vy: 0, target: null, pause: 0, face: 0 };
      this.flowers = []; for (let i = 0; i < 80; i++) this.flowers.push({ x: rnd(X0, X1), y: rnd(Y0, Y1), c: ['#fff', '#ffe066', '#ff9fc4'][rint(3)], k: rnd(0.6, 1.1) });
      this.barks = [];
    }
    /* push a circle out of the fence */
    fence(o, r, inside) {
      for (const [ax, ay, bx, by] of this.segs) {
        const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, u = clamp(((o.x - ax) * dx + (o.y - ay) * dy) / L, 0, 1);
        const cx = ax + dx * u, cy = ay + dy * u, ex = o.x - cx, ey = o.y - cy, d = hyp(ex, ey);
        if (d < r && d > 0) { o.x = cx + ex / d * r; o.y = cy + ey / d * r; const vn = o.vx * ex / d + o.vy * ey / d; if (vn < 0) { o.vx -= vn * ex / d; o.vy -= vn * ey / d; } }
      }
      if (inside) { o.x = clamp(o.x, PX0 + r + 4, PX1 - r); o.y = clamp(o.y, PY0 + r, PY1 - r); }
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      // players
      for (const e of this.es) {
        e.cd -= dt; e.say -= dt; e.squash *= 0.85;
        const i = ctx.input(e.p), sp = kid ? 340 : 380, k = 1 - Math.exp(-11 * dt);
        e.vx += (i.x * sp - e.vx) * k; e.vy += (i.y * sp - e.vy) * k;
        if (i.x || i.y) { e.face = Math.atan2(i.y, i.x); e.walk += dt * 12; } else e.walk = 0;
        e.x = clamp(e.x + e.vx * dt, X0 + e.r, X1 - e.r); e.y = clamp(e.y + e.vy * dt, Y0 + e.r, Y1 - e.r);
        this.fence(e, e.r);
        if (ctx.pressed(e.p, 0) && e.cd <= 0) {
          e.cd = 1.5; e.say = 0.8; e.squash = 0.2; ctx.sfx('say', e.p.animal);
          this.barks.push({ x: e.x, y: e.y, t: 0, col: PARTY_COLORS[e.p.col].c });
          Fx.ring(e.x, e.y, PARTY_COLORS[e.p.col].c, 300, 0.5);
          for (const s of this.sheep) {
            if (s.in) continue; const dx = s.x - e.x, dy = s.y - e.y, d = hyp(dx, dy);
            if (d < 300 && d > 0) { const f = (kid ? 360 : 420) * (1 - d / 300) + 120; s.vx += dx / d * f; s.vy += dy / d * f; s.panic = 0.6; s.by = e.p; }
          }
          const w = this.wolf; if (w && w.st === 'hunt' && hyp(w.x - e.x, w.y - e.y) < 340) this.scareWolf(e);
        }
      }
      for (const b of this.barks) b.t += dt; this.barks = this.barks.filter(b => b.t < 0.7);
      // sheep
      const R = kid ? 210 : 190, vmax = kid ? 190 : 245;
      for (const s of this.sheep) {
        s.panic -= dt; s.heart -= dt;
        let fx = 0, fy = 0;
        if (s.in) {
          s.wa += rnd(-1, 1) * dt * 2; fx += Math.cos(s.wa) * 30; fy += Math.sin(s.wa) * 30;
          for (const o of this.sheep) if (o !== s && o.in) { const dx = s.x - o.x, dy = s.y - o.y, d = hyp(dx, dy); if (d < 52 && d > 0) { fx += dx / d * 160; fy += dy / d * 160; } }
          s.vx += fx * dt; s.vy += fy * dt; const k = Math.exp(-3 * dt); s.vx *= k; s.vy *= k;
          const m = hyp(s.vx, s.vy); if (m > 60) { s.vx *= 60 / m; s.vy *= 60 / m; }
          s.x += s.vx * dt; s.y += s.vy * dt; this.fence(s, s.r, true);
          if (m > 8) s.face = Math.atan2(s.vy, s.vx);
          continue;
        }
        s.wa += rnd(-1, 1) * dt * 3; fx += Math.cos(s.wa) * 40; fy += Math.sin(s.wa) * 40;
        let near = Infinity;
        for (const e of this.es) {
          const dx = s.x - e.x, dy = s.y - e.y, d = hyp(dx, dy);
          if (d < R && d > 0) { const f = (1 - d / R) * 1100; fx += dx / d * f; fy += dy / d * f; if (d < near) { near = d; s.by = e.p; } }
        }
        const w = this.wolf;
        if (w && w.st === 'hunt') { const dx = s.x - w.x, dy = s.y - w.y, d = hyp(dx, dy); if (d < 230 && d > 0) { fx += dx / d * (1 - d / 230) * 1400; fy += dy / d * (1 - d / 230) * 1400; } }
        let cx = 0, cy = 0, cn = 0;
        for (const o of this.sheep) {
          if (o === s || o.in) continue; const dx = s.x - o.x, dy = s.y - o.y, d = hyp(dx, dy);
          if (d < 56 && d > 0) { fx += dx / d * 220; fy += dy / d * 220; }
          if (d < 170) { cx += o.x; cy += o.y; cn++; }
        }
        if (cn && near > R) { fx += (cx / cn - s.x) * 0.5; fy += (cy / cn - s.y) * 0.5; }
        const m0 = 70; if (s.x < X0 + m0) fx += 300; if (s.x > X1 - m0) fx -= 300; if (s.y < Y0 + m0) fy += 300; if (s.y > Y1 - m0) fy -= 300;
        s.vx += fx * dt; s.vy += fy * dt;
        const k = Math.exp(-(s.panic > 0 ? 1.2 : 2.4) * dt); s.vx *= k; s.vy *= k;
        const cap = s.panic > 0 ? vmax * 1.6 : vmax, m = hyp(s.vx, s.vy); if (m > cap) { s.vx *= cap / m; s.vy *= cap / m; }
        s.x = clamp(s.x + s.vx * dt, X0 + s.r, X1 - s.r); s.y = clamp(s.y + s.vy * dt, Y0 + s.r, Y1 - s.r);
        this.fence(s, s.r);
        if (m > 12) s.face = Math.atan2(s.vy, s.vx);
        s.hop += m * dt * 0.05;
        if (Math.random() < dt * 0.06) ctx.sfx('baa');
        if (s.x > PX0 + s.r + 6 && s.x < PX1 && s.y > PY0 && s.y < PY1) {
          s.in = true; s.heart = 1.2; this.inN++; s.vx *= 0.3; s.vy *= 0.3;
          const e = s.by && this.by.get(s.by); if (e) { e.herd++; ctx.buzz(e.p, 60); }
          ctx.sfx('coin'); Fx.pop(s.x, s.y - 50, '♥', '#ff4f6d', 46);
          if (this.inN === this.total) { this.ok = true; this.over = true; }
        }
      }
      this.wolfTick(dt);
      if (this.t >= this.dur) this.over = true;
    }
    scareWolf(e) {
      const w = this.wolf; w.st = 'flee'; w.pause = 0;
      Fx.pop(w.x, w.y - 70, '嗚～', '#555', 40); if (e) Fx.pop(e.x, e.y - 70, '走開！', PARTY_COLORS[e.p.col].d, 36);
    }
    wolfTick(dt) {
      const w = this.wolf; if (!w) return;
      if (w.st === 'away') {
        w.t -= dt;
        if (w.t <= 0 && this.inN < this.total) { w.st = 'hunt'; w.x = -60; w.y = rnd(Y0 + 120, Y1 - 120); this.ctx.sfx('howl'); Fx.pop(220, w.y - 80, '大野狼來了！', '#c0392b', 46); }
        return;
      }
      if (w.st === 'flee') {
        const sp = 460; w.vx = -sp; w.vy *= 0.9; w.x += w.vx * dt; w.y += w.vy * dt; w.face = Math.PI;
        if (w.x < -100) { w.st = 'away'; w.t = 15; }
        return;
      }
      // hunting: chase the nearest loose sheep
      for (const e of this.es) if (hyp(e.x - w.x, e.y - w.y) < 105) { this.scareWolf(e); return; }
      w.pause -= dt;
      let best = null, bd = Infinity;
      for (const s of this.sheep) if (!s.in) { const d = hyp(s.x - w.x, s.y - w.y); if (d < bd) { bd = d; best = s; } }
      if (!best) { this.scareWolf(null); return; }
      if (w.pause <= 0) {
        const dx = best.x - w.x, dy = best.y - w.y, d = hyp(dx, dy) || 1;
        w.vx += (dx / d * 215 - w.vx) * (1 - Math.exp(-4 * dt)); w.vy += (dy / d * 215 - w.vy) * (1 - Math.exp(-4 * dt));
        if (d < best.r + 30) {
          w.pause = 1.1; best.panic = 1.4; const a = rnd(0, TAU); best.vx = Math.cos(a) * 380; best.vy = Math.sin(a) * 380; best.by = null;
          this.ctx.sfx('baa'); Fx.burst(best.x, best.y, '#ffffff', 10, 260);
        }
      } else { w.vx *= 0.9; w.vy *= 0.9; }
      w.x += w.vx * dt; w.y += w.vy * dt; w.x = Math.min(w.x, X1 - 40); w.y = clamp(w.y, Y0 + 30, Y1 - 30);
      if (w.y > PY0 - 30 && w.y < PY1 + 30) w.x = Math.min(w.x, PX0 - 40);   // the wolf never goes into the pen
      if (hyp(w.vx, w.vy) > 20) w.face = Math.atan2(w.vy, w.vx);
    }
    drawSheep(g, s, t) {
      const bob = Math.abs(Math.sin(s.hop)) * 4, x = s.x, y = s.y - bob, fx = Math.cos(s.face), fy = Math.sin(s.face);
      g.fillStyle = 'rgba(30,60,20,.22)'; g.beginPath(); g.ellipse(s.x, s.y + 22, 28, 9, 0, 0, TAU); g.fill();
      g.fillStyle = '#3a3346'; for (const [lx, ly] of [[-12, 16], [12, 16], [-6, 20], [6, 20]]) g.fillRect(x + lx - 3, y + ly - 6, 6, 12);
      g.fillStyle = '#ffffff'; g.strokeStyle = '#d9d4e6'; g.lineWidth = 2;
      for (const [dx, dy, r] of [[0, 0, 20], [-14, -4, 14], [14, -4, 14], [-8, -14, 13], [8, -14, 13], [-12, 8, 12], [12, 8, 12]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); g.stroke(); }
      const hx = x + fx * 20, hy = y + fy * 10 - 4;
      g.fillStyle = '#3a3346'; g.beginPath(); g.ellipse(hx, hy, 12, 14, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(hx - 12, hy - 6, 7, 4, -0.4, 0, TAU); g.ellipse(hx + 12, hy - 6, 7, 4, 0.4, 0, TAU); g.fill();
      g.fillStyle = '#fff'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(hx + sx * 5 + fx * 2, hy - 3, 3.4, 0, TAU); g.fill(); }
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(hx, hy - 12, 7, 0, TAU); g.fill();
      if (s.panic > 0 && !s.in) { g.fillStyle = '#7fd0ff'; g.beginPath(); g.ellipse(x + 22, y - 26, 4, 7, 0.3, 0, TAU); g.fill(); }
      if (s.heart > 0) { g.globalAlpha = Math.min(1, s.heart); g.fillStyle = '#ff4f6d'; g.font = '26px system-ui'; g.textAlign = 'center'; g.fillText('♥', x, y - 34 - (1.2 - s.heart) * 30); g.globalAlpha = 1; }
      void t;
    }
    drawWolf(g, w, t) {
      if (!w || w.st === 'away') return;
      const x = w.x, y = w.y - Math.abs(Math.sin(t * 12)) * 4, f = Math.cos(w.face) >= 0 ? 1 : -1;
      g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(w.x, w.y + 28, 40, 10, 0, 0, TAU); g.fill();
      g.save(); g.translate(x, y); g.scale(f, 1);
      g.fillStyle = '#6d6f7d'; g.strokeStyle = '#43444f'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(-30, -4, 22, 9, -0.6, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, 4, 34, 24, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.arc(26, -14, 22, 0, TAU); g.fill(); g.stroke();
      for (const ex of [14, 32]) { g.beginPath(); g.moveTo(ex - 8, -28); g.lineTo(ex, -48); g.lineTo(ex + 8, -28); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle = '#d8d9e2'; g.beginPath(); g.ellipse(40, -8, 13, 9, 0, 0, TAU); g.fill();
      g.fillStyle = '#2b2340'; g.beginPath(); g.arc(50, -11, 4, 0, TAU); g.fill();
      g.fillStyle = '#ffe066'; for (const ex of [20, 32]) { g.beginPath(); g.arc(ex, -20, 4.5, 0, TAU); g.fill(); }
      g.strokeStyle = '#2b2340'; g.lineWidth = 3; g.beginPath(); g.moveTo(14, -28); g.lineTo(24, -25); g.moveTo(38, -28); g.lineTo(29, -25); g.stroke();
      g.restore();
      if (w.st === 'flee') { g.fillStyle = '#7fd0ff'; g.beginPath(); g.ellipse(x + 30, y - 40, 5, 8, 0.3, 0, TAU); g.fill(); }
    }
    draw(g) {
      const t = this.t;
      g.fillStyle = '#86cf68'; g.fillRect(-400, 0, W + 800, H);
      g.fillStyle = '#a6e389'; g.beginPath(); g.roundRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20, 36); g.fill();
      for (const f of this.flowers) { g.fillStyle = f.c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(f.x + Math.cos(a) * 4 * f.k, f.y + Math.sin(a) * 4 * f.k, 3 * f.k, 0, TAU); g.fill(); } }
      // pen
      g.fillStyle = '#ecd59b'; g.fillRect(PX0, PY0, PX1 - PX0, PY1 - PY0);
      g.strokeStyle = 'rgba(190,150,80,.5)'; g.lineWidth = 3;
      for (let k = 0; k < 26; k++) { const x = PX0 + 20 + (k * 53) % (PX1 - PX0 - 40), y = PY0 + 20 + (k * 97) % (PY1 - PY0 - 40); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y - 6); g.stroke(); }
      const sheepIn = this.sheep.filter(s => s.in), sheepOut = this.sheep.filter(s => !s.in);
      // gate arrows
      const gy = (this.g0 + this.g1) / 2, pulse = Math.sin(t * 5) * 8;
      g.fillStyle = 'rgba(255,255,255,.8)';
      for (const k of [0, 1]) { const ax = PX0 - 120 + k * 50 + pulse; g.beginPath(); g.moveTo(ax, gy - 22); g.lineTo(ax + 26, gy); g.lineTo(ax, gy + 22); g.closePath(); g.fill(); }
      const things = [];
      for (const s of sheepOut.concat(sheepIn)) things.push({ y: s.y, f: () => this.drawSheep(g, s, t) });
      for (const e of this.es) things.push({ y: e.y, f: () => {
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: e.squash, hop: e.walk ? Math.abs(Math.sin(e.walk)) * 7 : 0, happy: e.say > 0 });
        drawTag(g, e.x, e.y - e.r - 28, e.p);
        if (e.say > 0) { g.fillStyle = '#fff'; g.beginPath(); g.roundRect(e.x + 30, e.y - 92, 76, 42, 16); g.fill(); g.fillStyle = '#2b2340'; g.font = '900 24px "Noto Sans TC",system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(PARTY_ANIMALS[e.p.animal].say, e.x + 68, e.y - 70); }
      } });
      if (this.wolf && this.wolf.st !== 'away') things.push({ y: this.wolf.y, f: () => this.drawWolf(g, this.wolf, t) });
      things.sort((a, b) => a.y - b.y).forEach(o => o.f());
      // fence on top
      g.strokeStyle = '#a8703c'; g.lineWidth = 10; g.lineCap = 'round';
      for (const [ax, ay, bx, by] of this.segs) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
      g.fillStyle = '#7a4a22';
      for (const [ax, ay, bx, by] of this.segs) { const L = hyp(bx - ax, by - ay), n = Math.max(1, Math.round(L / 60)); for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; g.beginPath(); g.roundRect(x - 8, y - 14, 16, 26, 4); g.fill(); } }
      g.fillStyle = '#ff5a5f'; g.beginPath(); g.moveTo(PX0, this.g0 - 12); g.lineTo(PX0, this.g0 - 60); g.lineTo(PX0 + 40, this.g0 - 48); g.lineTo(PX0, this.g0 - 36); g.fill();
      g.fillStyle = '#fff8e6'; g.beginPath(); g.roundRect(PX0 + 50, PY0 - 64, 160, 46, 12); g.fill(); g.strokeStyle = '#a8703c'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#7a4a22'; g.font = '900 28px "Noto Sans TC",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('羊羊的家', PX0 + 130, PY0 - 40);
    }
    center() { return '🐑 回家 ' + this.inN + ' / ' + this.total; }
    chip(p) { return '🐑 ' + this.by.get(p).herd; }
    pad(p) { return '🐑 ' + this.inN + '/' + this.total + ' 回家　你趕回 ' + this.by.get(p).herd + ' 隻'; }
    ready(p) { return this.by.get(p).cd <= 0; }
    results() {
      const left = Math.max(0, Math.ceil(this.dur - this.t));
      const stars = this.ok ? (left >= this.dur * 0.35 ? 3 : 2) : (this.inN >= this.total / 2 ? 1 : 0);
      return {
        team: true, ok: this.ok, stars,
        title: this.ok ? '羊羊全部回家了！' : '時間到！',
        sub: this.ok ? `${this.total} 隻都回家，還剩 ${left} 秒` : `還有羊羊在外面・回家 ${this.inN} / ${this.total} 隻`,
        rows: this.es.slice().sort((a, b) => b.herd - a.herd).map(e => ({ p: e.p, key: e.herd, line: `趕回 ${e.herd} 隻` }))
      };
    }
  }
  GAMES.push({
    id: 'sheep', name: '趕羊羊', icon: '🐑', col: '#2fae5f', bg: '#86cf68', kind: 'team', players: '1–6 人',
    blurb: '大家合作，把羊羊趕回家！',
    btn: (p) => ({ label: '叫一聲', icon: PARTY_ANIMALS[p.animal].say }),
    rules: kid => kid
      ? ['大家一起把羊羊趕回右邊的「羊羊的家」', '羊羊會躲開你，從羊羊後面慢慢推', '按按鈕叫一聲，附近的羊羊會嚇一跳跑開', '2 分半內全部趕回家就成功']
      : ['合作把所有羊趕進羊圈，門比較窄、羊比較快', '大野狼會來搗蛋：靠近牠，或對牠叫一聲，牠就會逃走', '叫一聲會讓附近的羊嚇一跳（1.5 秒叫一次）', '2 分鐘內全部趕回家'],
    thumb(g) {
      g.fillStyle = '#a6e389'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#ecd59b'; g.fillRect(230, 40, 80, 110); g.strokeStyle = '#a8703c'; g.lineWidth = 6; g.beginPath(); g.moveTo(230, 70); g.lineTo(230, 40); g.lineTo(310, 40); g.lineTo(310, 150); g.lineTo(230, 150); g.lineTo(230, 120); g.stroke();
      const sh = (x, y) => { g.fillStyle = '#fff'; for (const [dx, dy, r] of [[0, 0, 13], [-9, -3, 9], [9, -3, 9], [0, -9, 9]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); } g.fillStyle = '#3a3346'; g.beginPath(); g.ellipse(x + 12, y - 2, 7, 8, 0, 0, TAU); g.fill(); };
      sh(150, 80); sh(180, 110); sh(160, 135); sh(270, 95);
      drawCritter(g, 70, 100, 24, 1, 1, { face: 0, happy: true }); drawCritter(g, 100, 150, 18, 0, 0, { face: -0.3 });
    },
    create: ctx => new Sheep(ctx)
  });
})();
