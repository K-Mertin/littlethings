'use strict';
/* 搶果果 — fruit falls from the sky (watch the shadows); grab the most in 60 s.
   小朋友: big pick-up reach, no bombs, no stealing.
   大人: dash into someone to knock 2 fruit out of them, and bombs fall too. */
(() => {
  const X0 = 70, Y0 = 160, X1 = 1530, Y1 = 860;
  const KINDS = { apple: { pts: 1 }, orange: { pts: 1 }, grape: { pts: 1 }, star: { pts: 3 } };
  function drawFruit(g, kind, x, y, s) {
    s = s || 1;
    if (kind === 'apple') {
      g.fillStyle = '#ff4b4b'; g.beginPath(); g.arc(x - 6 * s, y, 13 * s, 0, TAU); g.arc(x + 6 * s, y, 13 * s, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x - 9 * s, y - 5 * s, 4 * s, 6 * s, -0.5, 0, TAU); g.fill();
      g.strokeStyle = '#7a4a1e'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x, y - 10 * s); g.lineTo(x + 2 * s, y - 19 * s); g.stroke();
      g.fillStyle = '#3fbf4a'; g.beginPath(); g.ellipse(x + 8 * s, y - 17 * s, 7 * s, 3.5 * s, -0.5, 0, TAU); g.fill();
    } else if (kind === 'orange') {
      g.fillStyle = '#ff9a1f'; g.beginPath(); g.arc(x, y, 16 * s, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(x - 6 * s, y - 6 * s, 4 * s, 6 * s, -0.6, 0, TAU); g.fill();
      g.fillStyle = '#3fbf4a'; g.beginPath(); g.ellipse(x + 5 * s, y - 15 * s, 7 * s, 3.5 * s, 0.4, 0, TAU); g.fill();
    } else if (kind === 'grape') {
      g.fillStyle = '#9b4dff';
      for (const [dx, dy] of [[-8, -8], [0, -9], [8, -8], [-4, 0], [4, 0], [0, 8]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, 7 * s, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(x - 9 * s, y - 10 * s, 2.5 * s, 0, TAU); g.fill();
      g.fillStyle = '#3fbf4a'; g.beginPath(); g.ellipse(x + 4 * s, y - 17 * s, 7 * s, 3 * s, 0.3, 0, TAU); g.fill();
    } else if (kind === 'star') {
      g.save(); g.translate(x, y); g.fillStyle = '#ffd21f'; g.strokeStyle = '#d18a00'; g.lineWidth = 3 * s; g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = (k % 2 ? 9 : 20) * s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(-5 * s, -5 * s, 3.5 * s, 0, TAU); g.fill(); g.restore();
    }
  }
  class Fruit {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.dur = 60; this.over = false;
      this.items = []; this.bombs = []; this.spawnAcc = 0; this.nextShower = 15;
      const n = ctx.players.length;
      this.es = ctx.players.map((p, i) => ({ p, x: X0 + (X1 - X0) * (i + 1) / (n + 1), y: (Y0 + Y1) / 2 + (i % 2 ? 80 : -80), vx: 0, vy: 0, face: Math.PI / 2, r: 34, cd: 0, dash: 0, stun: 0, inv: 0, score: 0, walk: 0, squash: 0 }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.tufts = []; for (let i = 0; i < 60; i++) this.tufts.push({ x: rnd(X0, X1), y: rnd(Y0, Y1), k: rnd(0.7, 1.3) });
      for (let i = 0; i < 4 + n; i++) this.drop(true);
    }
    drop(now) {
      const r = Math.random(), kind = r < 0.08 ? 'star' : ['apple', 'orange', 'grape'][rint(3)];
      this.items.push({ kind, x: rnd(X0 + 30, X1 - 30), y: rnd(Y0 + 30, Y1 - 30), h: now ? 0 : 520, vh: 0, st: now ? 'ground' : 'fall', lock: 0, vx: 0, vy: 0, age: 0 });
    }
    bomb() { this.bombs.push({ x: rnd(X0 + 60, X1 - 60), y: rnd(Y0 + 60, Y1 - 60), h: 560, st: 'fall', fuse: 1.7 }); }
    spill(e, n) {
      n = Math.min(n, e.score); if (n <= 0) return;
      e.score -= n;
      for (let k = 0; k < n; k++) { const a = rnd(0, TAU), s = rnd(260, 420); this.items.push({ kind: 'apple', x: e.x, y: e.y, h: 30, vh: 300, st: 'pop', lock: 0.6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0 }); }
      Fx.pop(e.x, e.y - 70, '-' + n, '#ff3b4a', 40);
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      const n = this.es.length, ground = this.items.filter(i => i.st === 'ground').length;
      this.spawnAcc += dt * ((kid ? 1.5 : 1.3) + 0.45 * n);
      while (this.spawnAcc >= 1) { this.spawnAcc--; if (ground < 34) this.drop(); if (!kid && this.t > 5 && Math.random() < 0.16) this.bomb(); }
      if (this.t >= this.nextShower) { this.nextShower += 15; for (let k = 0; k < 8 + n * 2; k++) this.drop(); Fx.pop(W / 2, 200, '水果雨！', '#ff7a1f', 64); ctx.sfx('star'); }
      for (const it of this.items) {
        it.age += dt; it.lock -= dt;
        if (it.st === 'fall') { it.vh -= 1600 * dt; it.h += it.vh * dt; if (it.h <= 0) { it.h = 0; it.st = 'ground'; it.vh = 0; } }
        else if (it.st === 'pop') {
          it.x = clamp(it.x + it.vx * dt, X0 + 20, X1 - 20); it.y = clamp(it.y + it.vy * dt, Y0 + 20, Y1 - 20); it.vx *= 0.9; it.vy *= 0.9;
          it.vh -= 1600 * dt; it.h = Math.max(0, it.h + it.vh * dt); if (it.h <= 0 && hyp(it.vx, it.vy) < 30) it.st = 'ground';
        }
      }
      for (const b of this.bombs) {
        if (b.st === 'fall') { b.h -= 700 * dt; if (b.h <= 0) { b.h = 0; b.st = 'fuse'; } continue; }
        b.fuse -= dt;
        if (b.fuse <= 0) {
          b.st = 'gone'; ctx.sfx('boom'); Fx.ring(b.x, b.y, '#ff7a1f', 150, 0.5); Fx.burst(b.x, b.y, '#ffb21f', 22, 420); Fx.burst(b.x, b.y, '#555', 10, 260);
          for (const e of this.es) if (e.inv <= 0 && hyp(e.x - b.x, e.y - b.y) < 125 + e.r * 0.4) { e.stun = 1.3; e.inv = 1.8; this.spill(e, 3); ctx.buzz(e.p, 300); }
        }
      }
      this.bombs = this.bombs.filter(b => b.st !== 'gone');
      for (const e of this.es) {
        e.cd -= dt; e.dash -= dt; e.inv -= dt; e.squash *= 0.85;
        if (e.stun > 0) { e.stun -= dt; e.vx *= 0.85; e.vy *= 0.85; e.x += e.vx * dt; e.y += e.vy * dt; continue; }
        const i = ctx.input(e.p);
        if (ctx.pressed(e.p, 0) && e.cd <= 0) { e.dash = 0.26; e.cd = kid ? 1.0 : 1.4; ctx.sfx('whoosh'); e.squash = -0.12; }
        const sp = (kid ? 330 : 360) * (e.dash > 0 ? 2.3 : 1);
        let dx = i.x, dy = i.y; if (e.dash > 0 && !dx && !dy) { dx = Math.cos(e.face); dy = Math.sin(e.face); }
        const k = 1 - Math.exp(-(e.dash > 0 ? 20 : 11) * dt);
        e.vx += (dx * sp - e.vx) * k; e.vy += (dy * sp - e.vy) * k;
        if (dx || dy) { e.face = Math.atan2(dy, dx); e.walk += dt * 12; } else e.walk = 0;
        e.x = clamp(e.x + e.vx * dt, X0 + e.r * 0.6, X1 - e.r * 0.6); e.y = clamp(e.y + e.vy * dt, Y0 + e.r * 0.6, Y1 - e.r * 0.6);
        const reach = e.r + (kid ? 30 : 14);
        for (const it of this.items) {
          if (it.st === 'gone' || it.lock > 0 || it.h > 40 || hyp(it.x - e.x, it.y - e.y) > reach) continue;
          it.st = 'gone'; const pts = KINDS[it.kind].pts; e.score += pts;
          Fx.pop(it.x, it.y - 30, '+' + pts, pts > 1 ? '#e09a00' : PARTY_COLORS[e.p.col].d, pts > 1 ? 46 : 32);
          ctx.sfx(pts > 1 ? 'star' : 'coin'); if (pts > 1) ctx.buzz(e.p, 60);
        }
      }
      this.items = this.items.filter(i => i.st !== 'gone');
      // bumping (grown-ups: a dash knocks fruit out of whoever you hit)
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
        const A = this.es[a], B = this.es[b], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
        if (d >= m || d === 0) continue;
        const o = (m - d) / 2; A.x -= dx / d * o; A.y -= dy / d * o; B.x += dx / d * o; B.y += dy / d * o;
        if (kid) continue;
        for (const [hit, vic] of [[A, B], [B, A]]) {
          if (hit.dash > 0 && vic.inv <= 0 && vic.dash <= 0) {
            vic.stun = 0.45; vic.inv = 1.0; vic.vx = (vic.x - hit.x) / d * 420; vic.vy = (vic.y - hit.y) / d * 420; hit.dash = 0;
            this.spill(vic, 2); ctx.sfx('bonk', 0.8); ctx.buzz(vic.p, 150); Fx.burst((A.x + B.x) / 2, (A.y + B.y) / 2, '#ffe066', 8, 260);
          }
        }
      }
      if (this.t >= this.dur) this.over = true;
    }
    draw(g) {
      const t = this.t;
      g.fillStyle = '#7cc95e'; g.fillRect(-400, 0, W + 800, H);
      g.fillStyle = '#9be07a'; g.beginPath(); g.roundRect(X0 - 20, Y0 - 20, X1 - X0 + 40, Y1 - Y0 + 40, 40); g.fill();
      g.fillStyle = '#a8e688'; for (let x = X0; x < X1; x += 120) g.fillRect(x, Y0 - 20, 60, Y1 - Y0 + 40);
      g.strokeStyle = '#6fb653'; g.lineWidth = 3;
      for (const u of this.tufts) { g.beginPath(); g.moveTo(u.x - 6 * u.k, u.y); g.lineTo(u.x - 2 * u.k, u.y - 10 * u.k); g.moveTo(u.x, u.y); g.lineTo(u.x + 2 * u.k, u.y - 12 * u.k); g.moveTo(u.x + 6 * u.k, u.y); g.lineTo(u.x + 6 * u.k, u.y - 8 * u.k); g.stroke(); }
      // trees peeking in at the sides
      for (const [x, y, s] of [[-30, 260, 1.2], [-10, 640, 1], [1630, 300, 1.1], [1615, 700, 1.25]]) {
        g.fillStyle = '#8a5a2b'; g.fillRect(x - 16 * s, y, 32 * s, 120 * s);
        g.fillStyle = '#3f9e4d'; g.beginPath(); g.arc(x, y, 100 * s, 0, TAU); g.fill();
        g.fillStyle = '#4cae55'; g.beginPath(); g.arc(x - 20 * s, y - 25 * s, 70 * s, 0, TAU); g.fill();
        for (let k = 0; k < 6; k++) { g.fillStyle = '#ff4b4b'; g.beginPath(); g.arc(x + Math.cos(k * 1.7) * 60 * s, y + Math.sin(k * 2.3) * 55 * s, 9 * s, 0, TAU); g.fill(); }
      }
      // shadows of things in the air (where it will land)
      for (const it of this.items) if (it.st === 'fall') { const k = 1 - it.h / 520; g.fillStyle = `rgba(30,60,20,${0.15 + k * 0.3})`; g.beginPath(); g.ellipse(it.x, it.y + 12, 6 + k * 16, 3 + k * 6, 0, 0, TAU); g.fill(); }
      for (const b of this.bombs) if (b.st === 'fall') { const k = 1 - b.h / 560; g.strokeStyle = `rgba(255,40,40,${0.3 + k * 0.6})`; g.lineWidth = 4; g.beginPath(); g.arc(b.x, b.y, 125, 0, TAU); g.stroke(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(b.x, b.y + 14, 8 + k * 16, 4 + k * 6, 0, 0, TAU); g.fill(); }
      const things = [];
      for (const it of this.items) things.push({ y: it.y, f: () => {
        if (it.st !== 'fall') { g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(it.x, it.y + 14, 16, 6, 0, 0, TAU); g.fill(); }
        const bob = it.st === 'ground' ? Math.sin(t * 4 + it.x) * 2 : 0;
        if (it.kind === 'star' && it.st === 'ground') { g.fillStyle = `rgba(255,230,80,${0.3 + 0.2 * Math.sin(t * 6)})`; g.beginPath(); g.arc(it.x, it.y, 30, 0, TAU); g.fill(); }
        drawFruit(g, it.kind, it.x, it.y - it.h + bob, it.kind === 'star' ? 1.1 : 1);
      } });
      for (const b of this.bombs) if (b.st === 'fuse') things.push({ y: b.y, f: () => {
        const flash = b.fuse < 0.7 && (t * 14 | 0) % 2;
        g.strokeStyle = `rgba(255,40,40,${0.35 + 0.4 * Math.sin(t * 16)})`; g.lineWidth = 4; g.beginPath(); g.arc(b.x, b.y, 125, 0, TAU); g.stroke();
        g.fillStyle = flash ? '#ff3b3b' : '#2b2b38'; g.beginPath(); g.arc(b.x, b.y, 24, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(b.x - 8, b.y - 8, 6, 0, TAU); g.fill();
        g.strokeStyle = '#8a5a2b'; g.lineWidth = 4; g.beginPath(); g.moveTo(b.x + 10, b.y - 20); g.quadraticCurveTo(b.x + 20, b.y - 36, b.x + 30, b.y - 30); g.stroke();
        g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(b.x + 30, b.y - 30, 5 + Math.random() * 4, 0, TAU); g.fill();
      } });
      for (const e of this.es) things.push({ y: e.y, f: () => {
        const C = PARTY_COLORS[e.p.col];
        if (e.dash > 0) { g.fillStyle = C.c; g.globalAlpha = 0.25; g.beginPath(); g.arc(e.x - e.vx * 0.05, e.y - e.vy * 0.05, e.r, 0, TAU); g.fill(); g.globalAlpha = 1; }
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: e.squash, hop: e.walk ? Math.abs(Math.sin(e.walk)) * 7 : 0, stun: e.stun > 0, alpha: e.inv > 0 && (t * 10 | 0) % 2 ? 0.5 : 1 });
        if (e.stun > 0) { g.fillStyle = '#ffd21f'; g.font = '22px system-ui'; g.textAlign = 'center'; for (let k = 0; k < 3; k++) { const a = t * 6 + k * TAU / 3; g.fillText('★', e.x + Math.cos(a) * 30, e.y - e.r - 6 + Math.sin(a) * 8); } }
        drawTag(g, e.x, e.y - e.r - 28, e.p);
      } });
      things.sort((a, b) => a.y - b.y).forEach(o => o.f());
      for (const it of this.items) if (it.st === 'fall') drawFruit(g, it.kind, it.x, it.y - it.h, 1);
      for (const b of this.bombs) if (b.st === 'fall') { g.fillStyle = '#2b2b38'; g.beginPath(); g.arc(b.x, b.y - b.h, 24, 0, TAU); g.fill(); }
    }
    chip(p) { return '🍎 ' + this.by.get(p).score; }
    pad(p) { const e = this.by.get(p); return '🍎 ' + e.score + ' 個' + (e.stun > 0 ? '　暈～' : ''); }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && e.stun <= 0; }
    results() { return { rows: this.es.slice().sort((a, b) => b.score - a.score).map(e => ({ p: e.p, key: e.score, line: `撿到 ${e.score} 個水果` })) }; }
  }
  GAMES.push({
    id: 'fruit', name: '搶果果', icon: '🍎', col: '#ff5a3d', bg: '#7cc95e', kind: 'vs', players: '1–6 人',
    blurb: '水果從天上掉下來，搶最多的人贏！',
    btn: { label: '衝刺', icon: '⚡' },
    rules: kid => kid
      ? ['水果會從天上掉下來，看地上的影子就知道掉在哪', '走過去就撿起來，金色星星果 3 分', '按「衝刺」跑得更快', '60 秒後，撿最多的人贏']
      : ['看影子搶水果，金色星星果 3 分', '「衝刺」撞到人，對方會掉 2 個水果', '小心炸彈！看到紅圈快跑，被炸到會暈倒、掉 3 個', '60 秒後最多的人贏'],
    thumb(g) {
      g.fillStyle = '#9be07a'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(250, 140, 20, 7, 0, 0, TAU); g.fill();
      drawFruit(g, 'apple', 250, 50, 1.2); drawFruit(g, 'star', 70, 60, 1.1); drawFruit(g, 'grape', 200, 130, 1); drawFruit(g, 'orange', 120, 150, 1);
      drawCritter(g, 110, 100, 24, 2, 1, { face: -2, hop: 4 }); drawCritter(g, 215, 92, 22, 5, 0, { face: 2 });
    },
    create: ctx => new Fruit(ctx)
  });
})();
