'use strict';
/* 碰碰島 — push everyone off a little island.
   小朋友: 60 s, falling in is fine (you swim back), every push-off scores a point.
   大人: 3 lives, the island shrinks after 30 s, last one standing wins. */
(() => {
  const CX = 800, CY = 500;
  class Bumper {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false;
      this.dur = this.kid ? 60 : 120; this.R0 = this.kid ? 365 : 350; this.R = this.R0; this.outN = 0;
      const n = ctx.players.length;
      this.es = ctx.players.map((p, i) => {
        const a = -Math.PI / 2 + i * TAU / n, rr = n === 1 ? 0 : this.R0 * 0.58;
        return { p, x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr, vx: 0, vy: 0, face: a + Math.PI, r: 38, cd: 0, dash: 0, fall: 0, inv: 0,
          hitBy: null, hitT: -9, credit: null, score: 0, falls: 0, lives: 3, out: false, outAt: 0, squash: 0, trail: [] };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.deco = []; for (let i = 0; i < 70; i++) this.deco.push({ a: rnd(0, TAU), d: Math.sqrt(Math.random()) * 0.9, k: rnd(0.7, 1.3), c: ['#fff', '#ffe066', '#ff9fc4', '#9fd0ff'][rint(4)] });
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      if (!kid && this.t > 30) this.R = Math.max(170, this.R0 - (this.t - 30) * 4);
      for (const e of this.es) {
        if (e.out) continue;
        e.trail.unshift({ x: e.x, y: e.y }); if (e.trail.length > 6) e.trail.pop();
        if (e.fall > 0) {
          const was = e.fall; e.fall += dt; e.x += e.vx * dt * 0.35; e.y += e.vy * dt * 0.35;
          if (was < 0.45 && e.fall >= 0.45) { ctx.sfx('splash'); Fx.ring(e.x, e.y, '#ffffff', 90, 0.6); Fx.burst(e.x, e.y, '#d8f4ff', 12, 220); }
          if (e.fall > 1.1) this.landed(e);
          continue;
        }
        const i = ctx.input(e.p), acc = kid ? 1150 : 1500;
        e.vx += i.x * acc * dt; e.vy += i.y * acc * dt;
        const k = Math.exp(-(e.dash > 0 ? 1.2 : 3.2) * dt); e.vx *= k; e.vy *= k;
        if (i.x || i.y) e.face = Math.atan2(i.y, i.x);
        e.cd -= dt; e.dash -= dt; e.inv -= dt; e.squash *= 0.86;
        if (ctx.pressed(e.p, 0) && e.cd <= 0) {
          let dx = i.x, dy = i.y; if (!dx && !dy) { dx = Math.cos(e.face); dy = Math.sin(e.face); }
          const m = hyp(dx, dy) || 1, imp = kid ? 620 : 760;
          e.vx += dx / m * imp; e.vy += dy / m * imp; e.dash = 0.3; e.cd = kid ? 0.9 : 1.1; e.squash = -0.12;
          ctx.sfx('whoosh');
        }
        e.x += e.vx * dt; e.y += e.vy * dt;
      }
      // bumping
      const live = this.es.filter(e => !e.out && e.fall <= 0);
      for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
        const A = live[a], B = live[b];
        if (A.inv > 0 || B.inv > 0) continue;
        const dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), min = A.r + B.r;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d, ma = A.dash > 0 ? 2.4 : 1, mb = B.dash > 0 ? 2.4 : 1, ov = min - d;
        A.x -= nx * ov * mb / (ma + mb); A.y -= ny * ov * mb / (ma + mb); B.x += nx * ov * ma / (ma + mb); B.y += ny * ov * ma / (ma + mb);
        const rv = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
        if (rv > 0) {
          const j = (1 + (kid ? 1.0 : 1.15)) * rv / (1 / ma + 1 / mb);
          A.vx -= j / ma * nx; A.vy -= j / ma * ny; B.vx += j / mb * nx; B.vy += j / mb * ny;
          A.hitBy = B.p; A.hitT = this.t; B.hitBy = A.p; B.hitT = this.t;
          if (rv > 120) {
            ctx.sfx('bonk', Math.min(1, rv / 600)); A.squash = B.squash = 0.16;
            Fx.burst(A.x + nx * A.r, A.y + ny * A.r, '#ffe066', Math.min(10, 3 + rv / 80 | 0), 240);
            if (rv > 380) { ctx.buzz(A.p, 40); ctx.buzz(B.p, 40); }
          }
        }
      }
      // off the edge?
      for (const e of live) {
        if (hyp(e.x - CX, e.y - CY) > this.R + e.r * 0.15) {
          e.fall = 0.001; e.credit = e.hitBy && this.t - e.hitT < 3 && e.hitBy !== e.p ? e.hitBy : null;
          ctx.buzz(e.p, 180);
        }
      }
      const alive = this.es.filter(e => !e.out);
      if (this.t >= this.dur) this.over = true;
      if (!kid && (this.es.length > 1 ? alive.length <= 1 : alive.length === 0)) this.over = true;
    }
    landed(e) {
      const ctx = this.ctx; e.falls++;
      const by = e.credit && this.by.get(e.credit);
      if (by) { by.score++; Fx.pop(by.x, by.y - 70, '+1', PARTY_COLORS[by.p.col].d, 44); ctx.sfx('coin'); }
      if (!this.kid) {
        e.lives--;
        if (e.lives <= 0) { e.out = true; e.outAt = ++this.outN; Fx.pop(CX, CY - 40, e.p.name + ' 出局', '#2b2340', 52); ctx.buzz(e.p, 400); return; }
      }
      // swim back to a free spot near the middle
      let best = null, bd = -1;
      for (let k = 0; k < 12; k++) {
        const a = rnd(0, TAU), rr = rnd(0, this.R * 0.45), x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr;
        const d = Math.min(9999, ...this.es.filter(o => o !== e && !o.out && o.fall <= 0).map(o => hyp(o.x - x, o.y - y)));
        if (d > bd) { bd = d; best = { x, y }; }
      }
      e.x = best.x; e.y = best.y; e.vx = e.vy = 0; e.fall = 0; e.inv = 1.5; e.hitBy = null; e.trail = [];
      Fx.ring(e.x, e.y, PARTY_COLORS[e.p.col].c, 70); ctx.sfx('pop');
    }
    draw(g) {
      const t = this.t;
      g.fillStyle = '#45bde8'; g.fillRect(-400, 0, W + 800, H);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4;
      for (let i = 0; i < 26; i++) {
        const x = ((i * 233) % 1900) - 150 + Math.sin(t * 0.7 + i) * 20, y = 120 + ((i * 137) % 760);
        g.beginPath(); g.arc(x, y, 22, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      }
      const R = this.R;
      g.fillStyle = 'rgba(20,90,140,.25)'; g.beginPath(); g.arc(CX + 10, CY + 18, R + 26, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(CX, CY, R + 26 + Math.sin(t * 2) * 4, 0, TAU); g.fill();
      g.fillStyle = '#ffe3a1'; g.beginPath(); g.arc(CX, CY, R + 18, 0, TAU); g.fill();
      g.fillStyle = '#7fd667'; g.beginPath(); g.arc(CX, CY, R, 0, TAU); g.fill();
      g.fillStyle = '#92e07a'; g.beginPath(); g.arc(CX - R * 0.08, CY - R * 0.08, R * 0.82, 0, TAU); g.fill();
      for (const d of this.deco) {
        const x = CX + Math.cos(d.a) * d.d * R, y = CY + Math.sin(d.a) * d.d * R;
        g.fillStyle = d.c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 5 * d.k, y + Math.sin(a) * 5 * d.k, 3.6 * d.k, 0, TAU); g.fill(); }
        g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(x, y, 3 * d.k, 0, TAU); g.fill();
      }
      if (!this.kid && t > 26 && R > 170) {
        g.setLineDash([18, 14]); g.lineDashOffset = -t * 40; g.strokeStyle = t < 30 ? `rgba(255,59,74,${0.5 + 0.5 * Math.sin(t * 12)})` : 'rgba(255,59,74,.75)'; g.lineWidth = 6;
        g.beginPath(); g.arc(CX, CY, R - 4, 0, TAU); g.stroke(); g.setLineDash([]);
        if (t < 30) { g.fillStyle = '#ff3b4a'; g.font = '900 40px "Noto Sans TC",system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('小島要變小了！', CX, CY - R - 40); }
      }
      // falling ones (under the others)
      for (const e of this.es) {
        if (e.out || e.fall <= 0) continue;
        const k = Math.min(1, e.fall / 0.45);
        g.save(); g.globalAlpha = 1 - Math.max(0, (e.fall - 0.45) / 0.65);
        drawCritter(g, e.x, e.y + k * 20, e.r * (1 - k * 0.45), e.p.col, e.p.animal, { face: e.face, stun: true, rot: e.fall * 6, noShadow: true });
        g.restore();
      }
      const list = this.es.filter(e => !e.out && e.fall <= 0).sort((a, b) => a.y - b.y);
      for (const e of list) {
        const C = PARTY_COLORS[e.p.col];
        if (e.dash > 0) e.trail.forEach((q, i) => { g.globalAlpha = 0.25 - i * 0.04; g.fillStyle = C.c; g.beginPath(); g.arc(q.x, q.y, e.r * (1 - i * 0.08), 0, TAU); g.fill(); });
        g.globalAlpha = 1;
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: e.squash, alpha: e.inv > 0 && (t * 10 | 0) % 2 ? 0.45 : 1, blink: (t + e.p.uid) % 3.5 < 0.12 });
        drawTag(g, e.x, e.y - e.r - 26, e.p);
        if (!this.kid) for (let h = 0; h < e.lives; h++) { g.fillStyle = '#ff4f6d'; g.font = '20px system-ui'; g.textAlign = 'center'; g.fillText('♥', e.x - (e.lives - 1) * 11 + h * 22, e.y + e.r + 18); }
      }
    }
    chip(p) { const e = this.by.get(p); return this.kid ? '撞下 ' + e.score : e.out ? '出局' : '♥'.repeat(e.lives) + ' ' + e.score; }
    pad(p) { const e = this.by.get(p); if (this.kid) return '撞下 ' + e.score + ' 人'; return e.out ? '出局了，看大家打！' : '♥ × ' + e.lives + '　撞下 ' + e.score + ' 人'; }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && e.fall <= 0 && !e.out; }
    results() {
      let rows;
      if (this.kid) rows = this.es.slice().sort((a, b) => b.score - a.score || a.falls - b.falls).map(e => ({ p: e.p, key: e.score + '/' + e.falls, line: `撞下 ${e.score} 人・掉水 ${e.falls} 次` }));
      else rows = this.es.slice().sort((a, b) => (a.out - b.out) || (a.out ? b.outAt - a.outAt : (b.lives - a.lives || b.score - a.score))).map(e => ({ p: e.p, key: e.out ? 'o' + e.outAt : e.lives + '/' + e.score, line: e.out ? `出局・撞下 ${e.score} 人` : `剩 ${e.lives} 條命・撞下 ${e.score} 人` }));
      return { rows };
    }
  }
  GAMES.push({
    id: 'bumper', name: '碰碰島', icon: '💥', col: '#ff7a45', bg: '#45bde8', kind: 'vs', players: '1–6 人',
    blurb: '用力衝撞，把大家擠下小島！',
    btn: { label: '衝！', icon: '💨' },
    rules: kid => kid
      ? ['左手搖桿走路，右手按「衝！」往前撞', '把別人撞下水就得 1 分', '掉下水沒關係，會游回來繼續玩', '60 秒後，撞下最多人的贏']
      : ['搖桿移動，「衝！」衝刺撞人（衝刺時比較重）', '每人 3 條命，掉下水少一條', '30 秒後小島開始變小', '最後留在島上的人贏'],
    thumb(g) {
      g.fillStyle = '#45bde8'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#ffe3a1'; g.beginPath(); g.arc(160, 98, 78, 0, TAU); g.fill(); g.fillStyle = '#7fd667'; g.beginPath(); g.arc(160, 98, 70, 0, TAU); g.fill();
      drawCritter(g, 130, 96, 22, 0, 0, { face: 0 }); drawCritter(g, 196, 86, 22, 1, 3, { face: Math.PI, squash: 0.15 });
      drawCritter(g, 262, 140, 18, 2, 2, { stun: true, rot: 0.8, noShadow: true });
      g.fillStyle = '#ffe066'; for (const [x, y] of [[168, 80], [160, 98], [172, 104]]) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
    },
    create: ctx => new Bumper(ctx)
  });
})();
