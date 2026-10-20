'use strict';
/* 鬼抓人 — one player is "it" (鬼). Touch someone to pass it on. Whoever spends the
   least time as 鬼 wins. The new 鬼 must count to three before chasing, and you
   can't tag straight back. Playing alone, a little ghost chases you instead.
   小朋友: 鬼 runs faster, the game is shorter, few rocks. 大人: more rocks, longer. */
(() => {
  const X0 = 60, Y0 = 150, X1 = 1540, Y1 = 860;
  class Tag {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = this.kid ? 60 : 90;
      const n = ctx.players.length;
      this.es = ctx.players.map((p, i) => {
        const a = i * TAU / Math.max(1, n);
        return { p, x: 800 + Math.cos(a) * 420, y: 505 + Math.sin(a) * 250, vx: 0, vy: 0, face: a + Math.PI, r: 32, cd: 0, dash: 0, freeze: 0, safe: 0, itTime: 0, tags: 0, walk: 0, squash: 0 };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.solo = n === 1;
      if (this.solo) { this.npc = { x: 800, y: 505, vx: 0, vy: 0, face: 0, r: 34, freeze: 2.5, wob: 0 }; this.it = null; }
      else { this.it = this.es[rint(n)]; this.it.freeze = 2.5; }
      this.rocks = [];
      const want = this.kid ? 4 : 8;
      for (let k = 0; k < 60 && this.rocks.length < want; k++) {
        const r = rnd(40, 70), x = rnd(X0 + 120, X1 - 120), y = rnd(Y0 + 100, Y1 - 100);
        if (hyp(x - 800, y - 505) < 150) continue;
        if (this.rocks.some(o => hyp(o.x - x, o.y - y) < o.r + r + 90)) continue;
        if (this.es.some(e => hyp(e.x - x, e.y - y) < r + 80)) continue;
        this.rocks.push({ x, y, r, k: rint(3) });
      }
      this.leaves = []; for (let i = 0; i < 70; i++) this.leaves.push({ x: rnd(X0, X1), y: rnd(Y0, Y1), a: rnd(0, TAU), c: ['#ffd166', '#ffb4a2', '#cdeac0'][rint(3)] });
    }
    solid(o) {
      for (const r of this.rocks) { const dx = o.x - r.x, dy = o.y - r.y, d = hyp(dx, dy), m = r.r + o.r * 0.8; if (d < m && d > 0) { o.x = r.x + dx / d * m; o.y = r.y + dy / d * m; } }
      o.x = clamp(o.x, X0 + o.r, X1 - o.r); o.y = clamp(o.y, Y0 + o.r, Y1 - o.r);
    }
    move(e, ix, iy, sp, dt) {
      const k = 1 - Math.exp(-(e.dash > 0 ? 18 : 10) * dt);
      e.vx += (ix * sp - e.vx) * k; e.vy += (iy * sp - e.vy) * k;
      e.x += e.vx * dt; e.y += e.vy * dt; this.solid(e);
    }
    pass(from, to) {
      const ctx = this.ctx;
      this.it = to; to.freeze = this.kid ? 2 : 1.6; from.safe = 2; from.tags++;
      to.squash = 0.25; ctx.sfx('bonk', 0.6); ctx.buzz(to.p, 250); ctx.buzz(from.p, 60);
      Fx.burst(to.x, to.y, '#b48cff', 14, 300); Fx.pop(to.x, to.y - 72, '換你當鬼！', '#6a3fc7', 38);
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      for (const e of this.es) {
        e.cd -= dt; e.dash -= dt; e.safe -= dt; e.squash *= 0.85;
        const isIt = e === this.it;
        if (isIt) e.itTime += dt;
        if (e.freeze > 0) { e.freeze -= dt; e.vx *= 0.8; e.vy *= 0.8; if (isIt && Math.ceil(e.freeze) !== Math.ceil(e.freeze + dt)) ctx.sfx('tick'); continue; }
        const i = ctx.input(e.p);
        if (ctx.pressed(e.p, 0) && e.cd <= 0) { e.dash = 0.28; e.cd = 2.2; e.squash = -0.12; ctx.sfx('whoosh'); }
        let ix = i.x, iy = i.y; if (e.dash > 0 && !ix && !iy) { ix = Math.cos(e.face); iy = Math.sin(e.face); }
        const sp = (kid ? 310 : 340) * (isIt ? (kid ? 1.14 : 1.06) : 1) * (e.dash > 0 ? 2.1 : 1);
        if (ix || iy) { e.face = Math.atan2(iy, ix); e.walk += dt * 12; } else e.walk = 0;
        this.move(e, ix, iy, sp, dt);
      }
      if (this.it && this.it.freeze <= 0) {
        for (const o of this.es) if (o !== this.it && o.safe <= 0 && hyp(o.x - this.it.x, o.y - this.it.y) < o.r + this.it.r) { this.pass(this.it, o); break; }
      }
      // other players push apart a little
      for (let a = 0; a < this.es.length; a++) for (let b = a + 1; b < this.es.length; b++) {
        const A = this.es[a], B = this.es[b], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
        if (d < m && d > 0) { const o = (m - d) / 2; A.x -= dx / d * o; A.y -= dy / d * o; B.x += dx / d * o; B.y += dy / d * o; }
      }
      if (this.solo) {
        const g = this.npc, e = this.es[0]; g.wob += dt;
        if (g.freeze > 0) g.freeze -= dt;
        else {
          const dx = e.x - g.x, dy = e.y - g.y, d = hyp(dx, dy) || 1, sp = (kid ? 230 : 290) + this.t * (kid ? 1 : 2);
          this.move(g, dx / d, dy / d, sp, dt);
          if (d < g.r + e.r && e.safe <= 0) { e.itTime += 1; e.safe = 1.5; g.freeze = 1.5; ctx.sfx('bonk', 0.6); ctx.buzz(e.p, 250); Fx.pop(e.x, e.y - 70, '被抓到了！', '#6a3fc7', 36); Fx.burst(e.x, e.y, '#b48cff', 12, 300); }
        }
        if (hyp(g.vx, g.vy) > 20) g.face = Math.atan2(g.vy, g.vx);
      }
      if (this.t >= this.dur) this.over = true;
    }
    drawGhostNpc(g, n, t) {
      const x = n.x, y = n.y + Math.sin(t * 4) * 5;
      g.fillStyle = 'rgba(40,20,70,.2)'; g.beginPath(); g.ellipse(n.x, n.y + 30, 30, 9, 0, 0, TAU); g.fill();
      g.fillStyle = n.freeze > 0 ? 'rgba(255,255,255,.6)' : '#ffffff'; g.strokeStyle = '#8f6ad8'; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y - 8, 30, Math.PI, 0); g.lineTo(x + 30, y + 22);
      for (let k = 0; k < 4; k++) g.quadraticCurveTo(x + 22 - k * 15, y + 32, x + 15 - k * 15, y + 22);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#2b2340'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * 10, y - 10, 4, 7, 0, 0, TAU); g.fill(); }
      g.beginPath(); g.ellipse(x, y + 6, 6, 4, 0, 0, TAU); g.fill();
    }
    draw(g) {
      const t = this.t;
      g.fillStyle = '#7bc96a'; g.fillRect(-400, 0, W + 800, H);
      g.fillStyle = '#9fdc87'; g.beginPath(); g.roundRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20, 36); g.fill();
      for (const l of this.leaves) { g.save(); g.translate(l.x, l.y); g.rotate(l.a); g.fillStyle = l.c; g.beginPath(); g.ellipse(0, 0, 7, 3.5, 0, 0, TAU); g.fill(); g.restore(); }
      const things = [];
      for (const r of this.rocks) things.push({ y: r.y, f: () => {
        g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(r.x + 6, r.y + r.r * 0.55, r.r, r.r * 0.4, 0, 0, TAU); g.fill();
        if (r.k === 2) { // a bush
          g.fillStyle = '#3f9e4d'; for (const [dx, dy, k] of [[0, -0.2, 0.8], [-0.5, 0.1, 0.6], [0.5, 0.1, 0.6]]) { g.beginPath(); g.arc(r.x + dx * r.r, r.y + dy * r.r, r.r * k, 0, TAU); g.fill(); }
          g.fillStyle = '#ff6b8b'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(r.x + Math.cos(k * 1.9) * r.r * 0.5, r.y - r.r * 0.2 + Math.sin(k * 2.3) * r.r * 0.3, 5, 0, TAU); g.fill(); }
        } else {
          g.fillStyle = r.k ? '#a3a7b8' : '#b9b2a6'; g.strokeStyle = '#7b7f90'; g.lineWidth = 4;
          g.beginPath(); g.ellipse(r.x, r.y, r.r, r.r * 0.8, 0, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(r.x - r.r * 0.3, r.y - r.r * 0.3, r.r * 0.3, r.r * 0.16, -0.5, 0, TAU); g.fill();
        }
      } });
      for (const e of this.es) things.push({ y: e.y, f: () => {
        const isIt = e === this.it;
        if (isIt) { g.fillStyle = `rgba(155,92,255,${0.25 + 0.12 * Math.sin(t * 8)})`; g.beginPath(); g.arc(e.x, e.y, e.r + 22, 0, TAU); g.fill(); }
        if (e.dash > 0) { g.globalAlpha = 0.25; g.fillStyle = PARTY_COLORS[e.p.col].c; g.beginPath(); g.arc(e.x - e.vx * 0.05, e.y - e.vy * 0.05, e.r, 0, TAU); g.fill(); g.globalAlpha = 1; }
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: e.squash, hop: e.walk ? Math.abs(Math.sin(e.walk)) * 7 : 0, alpha: e.safe > 0 && (t * 10 | 0) % 2 ? 0.55 : 1, stun: isIt && e.freeze > 0 });
        drawTag(g, e.x, e.y - e.r - 28, e.p);
        if (isIt) {
          g.font = '34px system-ui'; g.textAlign = 'center'; g.fillText('👻', e.x, e.y - e.r - 66);
          if (e.freeze > 0) { g.font = '900 44px "Fredoka",system-ui'; g.fillStyle = '#6a3fc7'; g.strokeStyle = '#fff'; g.lineWidth = 7; const s = String(Math.ceil(e.freeze)); g.strokeText(s, e.x + 46, e.y - 10); g.fillText(s, e.x + 46, e.y - 10); }
        }
      } });
      if (this.solo) things.push({ y: this.npc.y, f: () => this.drawGhostNpc(g, this.npc, t) });
      things.sort((a, b) => a.y - b.y).forEach(o => o.f());
    }
    secs(e) { return Math.round(e.itTime); }
    chip(p) { const e = this.by.get(p); return (e === this.it ? '👻 ' : '') + (this.solo ? '被抓 ' : '當鬼 ') + this.secs(e) + (this.solo ? ' 次' : ' 秒'); }
    pad(p) {
      const e = this.by.get(p);
      if (this.solo) return '被抓到 ' + this.secs(e) + ' 次，快跑！';
      if (e === this.it) return e.freeze > 0 ? '👻 你是鬼！數到三…' : '👻 你是鬼！去抓人！';
      return '快跑！當鬼 ' + this.secs(e) + ' 秒';
    }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && e.freeze <= 0; }
    results() {
      if (this.solo) { const e = this.es[0]; return { rows: [{ p: e.p, key: e.itTime, line: `被抓到 ${this.secs(e)} 次` }], title: this.secs(e) === 0 ? '一次都沒被抓到！' : '練習完成！' }; }
      return { rows: this.es.slice().sort((a, b) => a.itTime - b.itTime).map(e => ({ p: e.p, key: this.secs(e), line: `當鬼 ${this.secs(e)} 秒・抓到 ${e.tags} 次` })) };
    }
  }
  GAMES.push({
    id: 'tag', name: '鬼抓人', icon: '👻', col: '#8f5cff', bg: '#7bc96a', kind: 'vs', players: '1–6 人',
    blurb: '被鬼碰到就換你當鬼，當鬼最短的人贏！',
    btn: { label: '衝刺', icon: '💨' },
    rules: kid => kid
      ? ['頭上有 👻 的人是鬼，鬼碰到誰，誰就變成鬼', '新的鬼要先數到三才能動，快跑開！', '按「衝刺」可以跑一下下很快', '60 秒後，當鬼時間最短的人贏']
      : ['頭上有 👻 的是鬼，碰到人就把鬼傳出去（不能馬上傳回來）', '新的鬼要數到三才能追，鬼跑得稍微快一點', '石頭和草叢擋路，繞著跑；「衝刺」2 秒才能用一次', '90 秒後，當鬼時間最短的人贏'],
    thumb(g) {
      g.fillStyle = '#9fdc87'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#b9b2a6'; g.beginPath(); g.ellipse(250, 130, 34, 26, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(155,92,255,.3)'; g.beginPath(); g.arc(110, 100, 44, 0, TAU); g.fill();
      drawCritter(g, 110, 100, 26, 4, 3, { face: 0 }); g.font = '28px system-ui'; g.textAlign = 'center'; g.fillText('👻', 110, 52);
      drawCritter(g, 205, 80, 22, 0, 2, { face: 0, hop: 6 }); drawCritter(g, 60, 150, 18, 2, 0, { face: -2 });
    },
    create: ctx => new Tag(ctx)
  });
})();
