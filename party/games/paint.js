'use strict';
/* 塗塗樂 — paint the floor in your colour; most floor after 60 s wins.
   小朋友: big brush, the splash just paints. 大人: faster on your own colour,
   slower on others', and a splash stuns anyone caught in it. */
(() => {
  const X0 = 60, Y0 = 150, FW = 1480, FH = 700, CS = 20, GW = FW / CS, GH = FH / CS;
  class Paint {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.dur = 60; this.over = false;
      this.own = new Int8Array(GW * GH).fill(-1); this.total = GW * GH;
      this.layer = document.createElement('canvas'); this.layer.width = FW; this.layer.height = FH;
      this.lg = this.layer.getContext('2d'); this.lg.fillStyle = '#fffaf0'; this.lg.fillRect(0, 0, FW, FH);
      this.lg.fillStyle = 'rgba(200,180,140,.35)';
      for (let y = CS / 2; y < FH; y += CS * 2) for (let x = CS / 2; x < FW; x += CS * 2) { this.lg.beginPath(); this.lg.arc(x, y, 2.2, 0, TAU); this.lg.fill(); }
      const n = ctx.players.length;
      this.es = ctx.players.map((p, i) => {
        const a = -Math.PI / 2 + i * TAU / n + Math.PI / n, rr = n === 1 ? 0 : 1;
        return { p, i, x: X0 + FW / 2 + Math.cos(a) * FW * 0.36 * rr, y: Y0 + FH / 2 + Math.sin(a) * FH * 0.34 * rr, vx: 0, vy: 0, face: a + Math.PI, r: 32, cd: 0, stun: 0, cnt: 0, squash: 0, walk: 0 };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.drops = [];
    }
    circle(e, x, y, r) {
      const C = PARTY_COLORS[e.p.col], lx = x - X0, ly = y - Y0;
      this.lg.fillStyle = C.c; this.lg.beginPath(); this.lg.arc(lx, ly, r, 0, TAU); this.lg.fill();
      const c0 = Math.max(0, Math.floor((lx - r) / CS)), c1 = Math.min(GW - 1, Math.floor((lx + r) / CS));
      const r0 = Math.max(0, Math.floor((ly - r) / CS)), r1 = Math.min(GH - 1, Math.floor((ly + r) / CS));
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
        if (hyp(cx * CS + CS / 2 - lx, cy * CS + CS / 2 - ly) > r) continue;
        const k = cy * GW + cx, o = this.own[k];
        if (o === e.i) continue;
        if (o >= 0) this.es[o].cnt--;
        this.own[k] = e.i; e.cnt++;
      }
    }
    under(x, y) { const cx = Math.floor((x - X0) / CS), cy = Math.floor((y - Y0) / CS); return cx < 0 || cy < 0 || cx >= GW || cy >= GH ? -1 : this.own[cy * GW + cx]; }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      for (const e of this.es) {
        e.cd -= dt; e.squash *= 0.85;
        if (e.stun > 0) { e.stun -= dt; e.vx *= 0.8; e.vy *= 0.8; continue; }
        const i = ctx.input(e.p);
        let sp = kid ? 340 : 330;
        if (!kid) { const o = this.under(e.x, e.y); sp *= o === e.i ? 1.25 : o >= 0 ? 0.78 : 1; }
        const k = 1 - Math.exp(-10 * dt);
        e.vx += (i.x * sp - e.vx) * k; e.vy += (i.y * sp - e.vy) * k;
        if (i.x || i.y) { e.face = Math.atan2(i.y, i.x); e.walk += dt * 12; } else e.walk = 0;
        e.x = clamp(e.x + e.vx * dt, X0 + e.r * 0.6, X0 + FW - e.r * 0.6); e.y = clamp(e.y + e.vy * dt, Y0 + e.r * 0.6, Y0 + FH - e.r * 0.6);
        this.circle(e, e.x, e.y + 6, kid ? 44 : 36);
        if (ctx.pressed(e.p, 0) && e.cd <= 0) this.splash(e);
      }
      if (!kid) {   // grown-ups bump into each other
        for (let a = 0; a < this.es.length; a++) for (let b = a + 1; b < this.es.length; b++) {
          const A = this.es[a], B = this.es[b], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
          if (d < m && d > 0) { const o = (m - d) / 2; A.x -= dx / d * o; A.y -= dy / d * o; B.x += dx / d * o; B.y += dy / d * o; }
        }
      }
      for (const d of this.drops) { d.t += dt; }
      this.drops = this.drops.filter(d => {
        if (d.t < d.T) return true;
        this.circle(d.e, d.x, d.y, d.r); return false;
      });
      if (this.t >= this.dur) this.over = true;
    }
    splash(e) {
      const ctx = this.ctx, R = this.kid ? 125 : 108, C = PARTY_COLORS[e.p.col];
      e.cd = this.kid ? 3 : 4.5; e.squash = 0.2;
      this.circle(e, e.x, e.y, R * 0.75);
      for (let k = 0; k < 10; k++) { const a = rnd(0, TAU), d = rnd(R * 0.6, R * 1.15); this.drops.push({ e, x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d, r: rnd(14, 30), t: 0, T: rnd(0.05, 0.25), sx: e.x, sy: e.y }); }
      Fx.ring(e.x, e.y, C.c, R * 1.2, 0.5); Fx.burst(e.x, e.y, C.c, 14, 380);
      ctx.sfx('splat');
      if (!this.kid) for (const o of this.es) {
        if (o === e || o.stun > 0) continue;
        if (hyp(o.x - e.x, o.y - e.y) < R + o.r * 0.5) { o.stun = 1.0; ctx.buzz(o.p, 220); Fx.pop(o.x, o.y - 60, '暈～', '#2b2340', 34); ctx.sfx('stun'); }
      }
    }
    pct(e) { return Math.round(e.cnt / this.total * 100); }
    draw(g) {
      const t = this.t;
      g.fillStyle = '#f2e3c4'; g.fillRect(-400, 0, W + 800, H);
      g.fillStyle = '#e5cf9f'; for (let x = -400; x < W + 400; x += 80) g.fillRect(x, 0, 40, H);
      g.fillStyle = 'rgba(80,50,20,.18)'; g.beginPath(); g.roundRect(X0 - 4, Y0 + 6, FW + 16, FH + 16, 28); g.fill();
      g.save(); g.beginPath(); g.roundRect(X0, Y0, FW, FH, 24); g.clip();
      g.drawImage(this.layer, X0, Y0);
      for (const d of this.drops) { const k = d.t / d.T; g.fillStyle = PARTY_COLORS[d.e.p.col].c; g.beginPath(); g.arc(d.sx + (d.x - d.sx) * k, d.sy + (d.y - d.sy) * k - Math.sin(k * Math.PI) * 60, 9, 0, TAU); g.fill(); }
      g.restore();
      g.strokeStyle = '#c9a66a'; g.lineWidth = 8; g.beginPath(); g.roundRect(X0, Y0, FW, FH, 24); g.stroke();
      const list = this.es.slice().sort((a, b) => a.y - b.y);
      for (const e of list) {
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: e.squash, hop: e.walk ? Math.abs(Math.sin(e.walk)) * 7 : 0, stun: e.stun > 0, rot: e.stun > 0 ? Math.sin(t * 20) * 0.2 : 0 });
        if (e.stun > 0) { g.fillStyle = '#ffd21f'; for (let k = 0; k < 3; k++) { const a = t * 6 + k * TAU / 3; g.font = '22px system-ui'; g.textAlign = 'center'; g.fillText('★', e.x + Math.cos(a) * 30, e.y - e.r - 6 + Math.sin(a) * 8); } }
        drawTag(g, e.x, e.y - e.r - 28, e.p);
      }
      // territory bar along the bottom
      const bx = X0 + 200, bw = FW - 400, by = Y0 + FH + 4;
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(bx - 6, by - 2, bw + 12, 30, 15); g.fill();
      let x = bx; for (const e of this.es) { const w = bw * e.cnt / this.total; g.fillStyle = PARTY_COLORS[e.p.col].c; g.fillRect(x, by + 4, w, 18); x += w; }
      void t;
    }
    chip(p) { return this.pct(this.by.get(p)) + '%'; }
    pad(p) { const e = this.by.get(p); return '塗了 ' + this.pct(e) + '%' + (e.stun > 0 ? '　暈～' : ''); }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && e.stun <= 0; }
    results() {
      return { rows: this.es.slice().sort((a, b) => b.cnt - a.cnt).map(e => ({ p: e.p, key: e.cnt, line: `塗了 ${this.pct(e)}%` })) };
    }
  }
  GAMES.push({
    id: 'paint', name: '塗塗樂', icon: '🎨', col: '#9b5cff', bg: '#f2e3c4', kind: 'vs', players: '1–6 人',
    blurb: '走到哪塗到哪，顏色最多的人贏！',
    btn: { label: '噴漆', icon: '💦' },
    rules: kid => kid
      ? ['走過的地方會塗上你的顏色', '按「噴漆」可以一次噴一大片', '別人的顏色也可以塗掉喔', '60 秒後，顏色最多的人贏']
      : ['走過的地方塗上你的顏色，60 秒後最多的人贏', '在自己的顏色上跑得快，在別人的顏色上會變慢', '「噴漆」會把附近的人噴暈 1 秒（4.5 秒才能再噴）', '會互相擋路，搶地盤吧'],
    thumb(g) {
      g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 320, 180);
      const blob = (c, pts) => { g.fillStyle = c; for (const [x, y, r] of pts) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } };
      blob('#ff4f58', [[40, 40, 40], [80, 60, 34], [60, 110, 30], [110, 90, 22]]);
      blob('#2f8cff', [[260, 50, 44], [220, 80, 30], [290, 120, 36], [240, 150, 26]]);
      blob('#22c26a', [[150, 150, 34], [190, 160, 24], [120, 168, 22]]);
      drawCritter(g, 110, 92, 22, 0, 4, { face: 0.3 }); drawCritter(g, 230, 92, 22, 1, 5, { face: Math.PI }); drawCritter(g, 165, 140, 18, 3, 1, { face: -1 });
    },
    create: ctx => new Paint(ctx)
  });
})();
