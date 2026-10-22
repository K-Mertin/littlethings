'use strict';
/* 碰碰島 — push everyone off a wide oval island.
   Your own walking stops right where you let go; only bumps make you slide.
   小朋友: you can't walk off by yourself — only a bump can knock you in; you swim back
           with a float ring, and every push-off scores a point (60 s).
   大人:   3 lives, the edge is slippery (but slows you as you get close), the island
           shrinks after 30 s, last one standing wins. */
(() => {
  const CX = 800, CY = 505;
  const ease = k => k * k * (3 - 2 * k);
  class Bumper {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.teams = !!ctx.teams;
      this.dur = this.kid ? 60 : 120; this.outN = 0;
      this.RX0 = this.kid ? 640 : 615; this.RY0 = this.kid ? 335 : 322; this.RX = this.RX0; this.RY = this.RY0;
      const n = ctx.players.length, order = this.teams ? ctx.players.slice().sort((a, b) => a.team - b.team) : ctx.players;
      this.es = ctx.players.map((p, i) => {
        const mates = order.filter(q => q.team === p.team);
        const a = this.teams ? (p.team ? 0 : Math.PI) + (mates.indexOf(p) - (mates.length - 1) / 2) * 0.55 : -Math.PI / 2 + i * TAU / n;
        const k = n === 1 ? 0 : 0.55;
        return { p, x: CX + Math.cos(a) * this.RX0 * k, y: CY + Math.sin(a) * this.RY0 * k, mvx: 0, mvy: 0, kx: 0, ky: 0, vx: 0, vy: 0,
          face: a + Math.PI, r: 38, cd: 0, dashT: 0, dx: 0, dy: 0, st: 'ok', stT: 0, inv: 1, hitBy: null, hitT: -9, credit: null,
          score: 0, falls: 0, lives: 3, out: false, outAt: 0, squash: 0, teeter: 0, trail: [], bump: new Map(), sx: 0, sy: 0, tx: 0, ty: 0 };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      // island details live in unit-circle coordinates so they shrink with the island
      this.deco = []; for (let i = 0; i < 90; i++) { const a = rnd(0, TAU), d = Math.sqrt(Math.random()) * 0.9; this.deco.push({ u: Math.cos(a) * d, v: Math.sin(a) * d, k: rnd(0.7, 1.3), c: ['#fff', '#ffe066', '#ff9fc4', '#9fd0ff'][rint(4)], tuft: Math.random() < 0.45 }); }
      this.shells = []; for (let i = 0; i < 26; i++) { const a = rnd(0, TAU); this.shells.push({ a, d: rnd(1.0, 1.04), c: ['#fff4e0', '#ffc9b5', '#ffe3f0'][rint(3)], s: rnd(0.7, 1.2) }); }
      this.duck = { x: 140, y: 820, a: 0 };
      this.bg = this.makeBg();
      this.warned = false;
    }
    /* how far out a point is: 1 = on the edge of the grass */
    q(x, y) { return Math.hypot((x - CX) / this.RX, (y - CY) / this.RY); }
    normal(x, y) { const nx = (x - CX) / (this.RX * this.RX), ny = (y - CY) / (this.RY * this.RY), m = Math.hypot(nx, ny) || 1; return [nx / m, ny / m]; }
    edgePoint(x, y, k) { const a = Math.atan2((y - CY) / this.RY, (x - CX) / this.RX); return [CX + Math.cos(a) * this.RX * k, CY + Math.sin(a) * this.RY * k]; }
    makeBg() {
      const c = document.createElement('canvas'); c.width = W + 800; c.height = H; const g = c.getContext('2d'); g.translate(400, 0);
      const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#5cc9f2'); grd.addColorStop(1, '#2fa7dc');
      g.fillStyle = grd; g.fillRect(-400, 0, W + 800, H);
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(rnd(-400, W + 400), rnd(0, H), rnd(60, 160), rnd(10, 26), 0, 0, TAU); g.fill(); }
      // little islets with palm trees
      for (const [x, y, s] of [[70, 215, 1], [1530, 790, 1.15], [1545, 205, 0.8], [55, 800, 0.85]]) {
        g.fillStyle = 'rgba(20,90,140,.25)'; g.beginPath(); g.ellipse(x + 6, y + 30 * s, 92 * s, 30 * s, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffe3a1'; g.beginPath(); g.ellipse(x, y + 22 * s, 84 * s, 26 * s, 0, 0, TAU); g.fill();
        g.strokeStyle = '#8a5a2b'; g.lineWidth = 12 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y + 20 * s); g.quadraticCurveTo(x - 10 * s, y - 40 * s, x + 12 * s, y - 92 * s); g.stroke();
        for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; g.fillStyle = k % 2 ? '#3fae4a' : '#4fc25a'; g.beginPath(); g.ellipse(x + 12 * s + Math.cos(a) * 44 * s, y - 92 * s + Math.sin(a) * 18 * s + 12 * s, 48 * s, 13 * s, a, 0, TAU); g.fill(); }
        g.fillStyle = '#8a5a2b'; for (const dx of [-8, 8]) { g.beginPath(); g.arc(x + 12 * s + dx * s, y - 84 * s, 8 * s, 0, TAU); g.fill(); }
      }
      return c;
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      if (!kid) {
        if (this.t > 26 && !this.warned) { this.warned = true; Fx.announce('小島要變小了！', '#ff3b4a'); ctx.sfx('howl'); }
        if (this.t > 30) { const k = Math.max(0.55, 1 - (this.t - 30) / 45 * 0.45); this.RX = this.RX0 * k; this.RY = this.RY0 * k; if (Math.random() < dt * 6) { const [ex, ey] = this.edgePoint(rnd(0, W), rnd(0, H), 1.02); Fx.dust(ex, ey, 'rgba(255,227,161,.9)', 10); } }
      }
      const speed = kid ? 330 : 370;
      for (const e of this.es) {
        if (e.out) continue;
        e.cd -= dt; e.inv -= dt; e.squash *= 0.86;
        if (e.st === 'fall') { this.falling(e, dt); continue; }
        if (e.st === 'swim') { this.swimming(e, dt); continue; }
        const i = ctx.input(e.p);
        if (i.x || i.y) e.face = Math.atan2(i.y, i.x);
        // walking: get to the stick's speed fast, stop fast — no drifting
        const rate = 1 - Math.exp(-16 * dt);
        e.mvx += (i.x * speed - e.mvx) * rate; e.mvy += (i.y * speed - e.mvy) * rate;
        if (ctx.pressed(e.p, 0) && e.cd <= 0) {
          let dx = i.x, dy = i.y; if (!dx && !dy) { dx = Math.cos(e.face); dy = Math.sin(e.face); }
          const m = Math.hypot(dx, dy) || 1; e.dx = dx / m; e.dy = dy / m; e.dashT = 0.22; e.cd = kid ? 0.85 : 1.05; e.squash = -0.16;
          ctx.sfx('whoosh'); for (let k = 0; k < 4; k++) Fx.dust(e.x - e.dx * 20, e.y + e.r * 0.7, 'rgba(255,255,255,.9)', 12);
        }
        if (e.dashT > 0) { e.dashT -= dt; const s = speed * 2.7 * (0.5 + 0.5 * ease(Math.max(0, e.dashT) / 0.22)); e.mvx = e.dx * s; e.mvy = e.dy * s; }
        // close to the edge: kids can't walk off; grown-ups slow down (but can still go over)
        const q = this.q(e.x, e.y);
        if (q > 0.88) {
          const [nx, ny] = this.normal(e.x, e.y), out = e.mvx * nx + e.mvy * ny;
          if (out > 0) { const k = clamp((q - 0.88) / 0.1, 0, 1) * (kid ? 1 : 0.6); e.mvx -= nx * out * k; e.mvy -= ny * out * k; }
        }
        // knock-back slides and fades; pushing the stick against it helps you brake
        const km = Math.hypot(e.kx, e.ky);
        let decay = kid ? 3.2 : 2.8;
        if (km > 1 && (i.x || i.y)) { const against = -(i.x * e.kx + i.y * e.ky) / km; if (against > 0) decay += 3 * against; }
        const f = Math.exp(-decay * dt); e.kx *= f; e.ky *= f;
        e.vx = e.mvx + e.kx; e.vy = e.mvy + e.ky;
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (km > 260) { e.trail.unshift({ x: e.x, y: e.y }); if (e.trail.length > 6) e.trail.pop(); if (Math.random() < dt * 20) Fx.dust(e.x, e.y + e.r * 0.7, 'rgba(255,255,255,.85)', 11); }
        else if (e.trail.length) e.trail.pop();
        Fx.walk(e, dt);
        const q2 = this.q(e.x, e.y);
        e.teeter = q2 > 0.94 ? e.teeter + dt : 0;
        if (q2 > 1 + 0.35 * e.r / this.RX) this.startFall(e);
      }
      this.bumps(dt);
      for (const e of this.es) for (const [o, t] of e.bump) if (t <= this.t) e.bump.delete(o);
      this.duck.a += dt; this.duck.x += Math.cos(this.duck.a * 0.3) * 12 * dt; this.duck.y += Math.sin(this.duck.a * 0.4) * 6 * dt;
      const alive = this.es.filter(e => !e.out);
      if (this.t >= this.dur) this.over = true;
      if (!kid && (this.teams ? new Set(alive.map(e => e.p.team)).size <= 1 : (this.es.length > 1 ? alive.length <= 1 : alive.length === 0))) this.over = true;
    }
    bumps() {
      const ctx = this.ctx, kid = this.kid, live = this.es.filter(e => !e.out && e.st === 'ok');
      for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
        const A = live[a], B = live[b];
        if (A.inv > 0 || B.inv > 0) continue;
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = A.r + B.r;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d, ma = A.dashT > 0 ? 2.2 : 1, mb = B.dashT > 0 ? 2.2 : 1, ov = min - d;
        A.x -= nx * ov * mb / (ma + mb); A.y -= ny * ov * mb / (ma + mb); B.x += nx * ov * ma / (ma + mb); B.y += ny * ov * ma / (ma + mb);
        if (A.bump.has(B) || B.bump.has(A)) continue;   // one shove per contact
        const pa = Math.max(0, A.vx * nx + A.vy * ny), pb = Math.max(0, -(B.vx * nx + B.vy * ny));
        if (pa + pb < 60 && A.dashT <= 0 && B.dashT <= 0) continue;
        const mate = this.teams && A.p.team === B.p.team, mult = (kid ? 1.0 : 1.1) * (mate ? 0.45 : 1), db = kid ? 1.25 : 1.4;
        const ka = pa * mult * (A.dashT > 0 ? db : 1) + 80, kb = pb * mult * (B.dashT > 0 ? db : 1) + 80;
        B.kx += nx * ka; B.ky += ny * ka; A.kx -= nx * kb; A.ky -= ny * kb;
        A.mvx *= 0.25; A.mvy *= 0.25; B.mvx *= 0.25; B.mvy *= 0.25; A.dashT = Math.min(A.dashT, 0.02); B.dashT = Math.min(B.dashT, 0.02);
        A.bump.set(B, this.t + 0.22); B.bump.set(A, this.t + 0.22);
        if (!mate) { A.hitBy = B.p; A.hitT = this.t; B.hitBy = A.p; B.hitT = this.t; }
        const s = ka + kb, cx = A.x + nx * A.r, cy = A.y + ny * A.r;
        A.squash = B.squash = Math.min(0.28, 0.08 + s / 3000);
        ctx.sfx('bonk', Math.min(1, s / 900));
        Fx.burst(cx, cy, '#ffe066', Math.min(14, 4 + (s / 90 | 0)), 300); Fx.ring(cx, cy, '#ffffff', 60 + s / 12, 0.3);
        Fx.shake(Math.min(14, s / 70));
        if (s > 700) { ctx.hitstop(0.05); Fx.pop(cx, cy - 40, '碰！', '#ff5a3d', 46); }
        if (s > 350) { ctx.buzz(A.p, 50); ctx.buzz(B.p, 50); }
      }
    }
    startFall(e) {
      e.st = 'fall'; e.stT = 0; e.sx = e.x; e.sy = e.y;
      e.credit = e.hitBy && this.t - e.hitT < 3 && e.hitBy !== e.p ? e.hitBy : null;
      this.ctx.buzz(e.p, 200); e.trail = [];
    }
    falling(e, dt) {
      const was = e.stT; e.stT += dt;
      const [nx, ny] = this.normal(e.sx, e.sy); e.x += nx * 90 * dt; e.y += ny * 90 * dt;
      if (was < 0.42 && e.stT >= 0.42) {
        this.ctx.sfx('splash'); Fx.ring(e.x, e.y, '#ffffff', 110, 0.7); Fx.burst(e.x, e.y, '#d8f4ff', 16, 260); Fx.shake(5);
        e.falls++;
        const by = e.credit && this.by.get(e.credit);
        if (by) { by.score++; Fx.pop(by.x, by.y - 76, '+1', PARTY_COLORS[by.p.col].d, 50); this.ctx.sfx('coin'); this.ctx.buzz(by.p, 60); }
        if (!this.kid) {
          e.lives--;
          if (e.lives <= 0) { e.out = true; e.outAt = ++this.outN; Fx.announce(e.p.name + ' 出局', '#2b2340'); this.ctx.buzz(e.p, 400); return; }
          Fx.pop(e.x, e.y - 60, '♥ -1', '#ff4f6d', 40);
        }
        // swim back with a float ring
        e.st = 'swim'; e.stT = 0; e.sx = e.x; e.sy = e.y;
        const [tx, ty] = this.edgePoint(e.x, e.y, 1.07); e.tx = tx; e.ty = ty;
        e.kx = e.ky = e.mvx = e.mvy = 0;
      }
    }
    swimming(e, dt) {
      e.stT += dt; const T = 1.5, H = 0.4;
      if (e.stT < T) {
        const k = ease(e.stT / T); e.x = e.sx + (e.tx - e.sx) * k; e.y = e.sy + (e.ty - e.sy) * k;
        e.face = Math.atan2(e.ty - e.sy, e.tx - e.sx);
        if (Math.random() < dt * 8) Fx.ring(e.x, e.y + 10, 'rgba(255,255,255,.7)', 40, 0.5);
      } else {
        // hop up onto the sand
        const k = Math.min(1, (e.stT - T) / H), [lx, ly] = this.edgePoint(e.tx, e.ty, 0.86);
        e.x = e.tx + (lx - e.tx) * k; e.y = e.ty + (ly - e.ty) * k;
        if (k >= 1) { e.st = 'ok'; e.inv = 1.2; e.hitBy = null; e.squash = 0.2; this.ctx.sfx('pop'); Fx.dust(e.x, e.y + e.r * 0.7, 'rgba(255,255,255,.9)', 14); }
      }
    }
    draw(g) {
      const t = this.t, RX = this.RX, RY = this.RY;
      g.drawImage(this.bg, -400, 0);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4;
      for (let i = 0; i < 30; i++) {
        const x = ((i * 233 + t * 14) % 2000) - 200, y = 120 + ((i * 137) % 760) + Math.sin(t + i) * 6;
        if (this.q(x, y) < 1.15) continue;
        g.beginPath(); g.arc(x, y, 20, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      }
      // the duck
      const dk = this.duck; g.fillStyle = '#ffd21f'; g.beginPath(); g.ellipse(dk.x, dk.y, 22, 14, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(dk.x + 14, dk.y - 14, 10, 0, TAU); g.fill();
      g.fillStyle = '#ff8a1f'; g.beginPath(); g.moveTo(dk.x + 22, dk.y - 16); g.lineTo(dk.x + 32, dk.y - 13); g.lineTo(dk.x + 22, dk.y - 10); g.fill(); g.fillStyle = '#2b2340'; g.beginPath(); g.arc(dk.x + 16, dk.y - 17, 2.2, 0, TAU); g.fill();
      // swimmers are in the water, under the island
      // island: shadow, foam, sand, grass
      g.fillStyle = 'rgba(20,90,140,.28)'; g.beginPath(); g.ellipse(CX + 12, CY + 22, RX + 34, RY + 30, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(CX, CY, RX + 34 + Math.sin(t * 2) * 5, RY + 30 + Math.sin(t * 2) * 4, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffe3a1'; g.beginPath(); g.ellipse(CX, CY, RX + 24, RY + 20, 0, 0, TAU); g.fill();
      for (const s of this.shells) { const x = CX + Math.cos(s.a) * (RX + 12) * s.d, y = CY + Math.sin(s.a) * (RY + 10) * s.d; g.fillStyle = s.c; g.beginPath(); g.ellipse(x, y, 6 * s.s, 4 * s.s, s.a, 0, TAU); g.fill(); }
      g.fillStyle = '#74cf5c'; g.beginPath(); g.ellipse(CX, CY, RX, RY, 0, 0, TAU); g.fill();
      g.fillStyle = '#86d96c'; g.beginPath(); g.ellipse(CX - RX * 0.05, CY - RY * 0.07, RX * 0.86, RY * 0.82, 0, 0, TAU); g.fill();
      g.fillStyle = '#93e078'; g.beginPath(); g.ellipse(CX - RX * 0.1, CY - RY * 0.12, RX * 0.55, RY * 0.5, 0, 0, TAU); g.fill();
      for (const d of this.deco) {
        const x = CX + d.u * RX, y = CY + d.v * RY;
        if (d.tuft) { g.strokeStyle = '#5fb84a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 6 * d.k, y); g.lineTo(x - 2 * d.k, y - 10 * d.k); g.moveTo(x, y); g.lineTo(x + 2 * d.k, y - 12 * d.k); g.moveTo(x + 6 * d.k, y); g.lineTo(x + 6 * d.k, y - 8 * d.k); g.stroke(); continue; }
        g.fillStyle = d.c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 5 * d.k, y + Math.sin(a) * 5 * d.k, 3.6 * d.k, 0, TAU); g.fill(); }
        g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(x, y, 3 * d.k, 0, TAU); g.fill();
      }
      // danger edge
      g.setLineDash([18, 14]); g.lineDashOffset = -t * 30; g.lineWidth = 5;
      g.strokeStyle = !this.kid && t > 26 ? `rgba(255,59,74,${0.55 + 0.35 * Math.sin(t * 10)})` : 'rgba(255,255,255,.55)';
      g.beginPath(); g.ellipse(CX, CY, RX - 6, RY - 6, 0, 0, TAU); g.stroke(); g.setLineDash([]);
      Fx.ground(g);
      for (const e of this.es) if (!e.out && e.st === 'swim') this.drawSwimmer(g, e, t, e.stT >= 1.5);
      // falling ones
      for (const e of this.es) {
        if (e.out || e.st !== 'fall') continue;
        const k = Math.min(1, e.stT / 0.42);
        drawCritter(g, e.x, e.y + k * 24, e.r * (1 - k * 0.45), e.p.col, e.p.animal, { face: e.face, stun: true, rot: e.stT * 9, alpha: 1 - k * 0.3, noShadow: true });
      }
      const list = this.es.filter(e => !e.out && e.st === 'ok').sort((a, b) => a.y - b.y);
      for (const e of list) {
        const C = PARTY_COLORS[e.p.col];
        e.trail.forEach((q, i) => { g.globalAlpha = 0.22 - i * 0.035; g.fillStyle = C.c; g.beginPath(); g.arc(q.x, q.y, e.r * (1 - i * 0.07), 0, TAU); g.fill(); });
        g.globalAlpha = 1;
        const tt = e.teeter > 0, wob = tt ? Math.sin(t * 22) * 0.18 : 0;
        if (e.dashT > 0) { g.globalAlpha = 0.3; g.fillStyle = C.c; for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(e.x - e.dx * k * 16, e.y - e.dy * k * 16, e.r * (1 - k * 0.12), 0, TAU); g.fill(); } g.globalAlpha = 1; }
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: e.squash, rot: wob, stun: tt && e.teeter > 0.25, alpha: e.inv > 0 && (t * 10 | 0) % 2 ? 0.5 : 1, blink: (t + e.p.uid) % 3.5 < 0.12, hop: Math.hypot(e.mvx, e.mvy) > 60 ? Math.abs(Math.sin(t * 14 + e.p.uid)) * 5 : 0 });
        if (tt) {   // whoa — right on the edge
          g.fillStyle = '#ff3b4a'; g.font = '900 34px "Fredoka",system-ui'; g.textAlign = 'center'; g.fillText('!', e.x + e.r * 0.9, e.y - e.r - 6);
          g.fillStyle = '#7fd0ff'; g.beginPath(); g.ellipse(e.x - e.r * 0.85, e.y - e.r * 0.5, 5, 8, -0.3, 0, TAU); g.fill();
        }
        drawTag(g, e.x, e.y - e.r - 28, e.p);
        if (!this.kid) for (let h = 0; h < e.lives; h++) { g.fillStyle = '#ff4f6d'; g.font = '20px system-ui'; g.textAlign = 'center'; g.fillText('♥', e.x - (e.lives - 1) * 11 + h * 22, e.y + e.r + 18); }
        // dash ready glow under feet
        if (e.cd <= 0 && e.dashT <= 0) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.82, e.r * 0.85, e.r * 0.28, 0, 0, TAU); g.stroke(); }
      }
    }
    drawSwimmer(g, e, t, hop) {
      if (hop) {   // jumping back up onto the island
        const k = Math.min(1, (e.stT - 1.5) / 0.4);
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, hop: Math.sin(k * Math.PI) * 50, happy: true });
        return;
      }
      const bob = Math.sin(t * 8 + e.p.uid) * 3, r = e.r * 0.9;
      g.fillStyle = 'rgba(20,90,140,.35)'; g.beginPath(); g.ellipse(e.x, e.y + 14 + bob, r * 1.2, r * 0.4, 0, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.rect(e.x - 80, e.y - 140, 160, 152 + bob); g.clip();
      drawCritter(g, e.x, e.y + bob - r * 0.25, r, e.p.col, e.p.animal, { face: Math.PI / 2, noShadow: true, happy: (t * 2 | 0) % 2 === 0 });
      g.restore();
      g.lineWidth = 11; g.strokeStyle = '#ff5a5f'; g.beginPath(); g.ellipse(e.x, e.y + 12 + bob, r * 1.15, r * 0.4, 0, 0, TAU); g.stroke();
      g.strokeStyle = '#fff'; g.setLineDash([12, 12]); g.beginPath(); g.ellipse(e.x, e.y + 12 + bob, r * 1.15, r * 0.4, 0, 0, TAU); g.stroke(); g.setLineDash([]);
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, e.y + 12, r * 1.6, r * 0.55, 0, 0, TAU); g.stroke();
      drawTag(g, e.x, e.y - r * 1.25 - 24, e.p);
    }
    chip(p) { const e = this.by.get(p); return this.kid ? '撞下 ' + e.score : e.out ? '出局' : '♥'.repeat(e.lives) + ' ' + e.score; }
    pad(p) {
      const e = this.by.get(p);
      if (e.st === 'swim') return '游回去囉！🏊';
      if (this.kid) return '撞下 ' + e.score + ' 人';
      return e.out ? '出局了，看大家打！' : '♥ × ' + e.lives + '　撞下 ' + e.score + ' 人';
    }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && e.st === 'ok' && !e.out; }
    teamScore(t) { const m = this.es.filter(e => e.p.team === t); return this.kid ? m.reduce((s, e) => s + e.score, 0) : '♥' + m.reduce((s, e) => s + (e.out ? 0 : e.lives), 0); }
    results() {
      let rows;
      if (this.kid) rows = this.es.slice().sort((a, b) => b.score - a.score || a.falls - b.falls).map(e => ({ p: e.p, key: e.score + '/' + e.falls, line: `撞下 ${e.score} 人・掉水 ${e.falls} 次` }));
      else rows = this.es.slice().sort((a, b) => (a.out - b.out) || (a.out ? b.outAt - a.outAt : (b.lives - a.lives || b.score - a.score))).map(e => ({ p: e.p, key: e.out ? 'o' + e.outAt : e.lives + '/' + e.score, line: e.out ? `出局・撞下 ${e.score} 人` : `剩 ${e.lives} 條命・撞下 ${e.score} 人` }));
      if (this.teams) { const v = t => this.es.filter(e => e.p.team === t).reduce((s, e) => s + (this.kid ? e.score : (e.out ? 0 : e.lives)), 0); return { rows, teamScores: [v(0), v(1)], teamText: t => this.teamScore(t) }; }
      return { rows };
    }
  }
  GAMES.push({
    id: 'bumper', name: '碰碰島', icon: '💥', col: '#ff7a45', bg: '#45bde8', kind: 'vs', teams: true, players: '1–6 人',
    blurb: '用力衝撞，把大家擠下小島！',
    btn: { label: '衝！', icon: '💨' },
    rules: kid => kid
      ? ['左手搖桿走路，右手按「衝！」往前撞', '自己走不會掉下去，只有被撞才會飛出去', '把別人撞下水就得 1 分，掉下水會套游泳圈游回來', '60 秒後，撞下最多人的贏']
      : ['搖桿移動，「衝！」衝刺撞人；被撞時往反方向推搖桿可以煞車', '每人 3 條命，掉下水少一條', '靠近邊邊會變慢，但還是可能滑下去！30 秒後小島開始變小', '最後留在島上的人贏'],
    thumb(g) {
      g.fillStyle = '#45bde8'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#ffe3a1'; g.beginPath(); g.ellipse(160, 96, 132, 70, 0, 0, TAU); g.fill(); g.fillStyle = '#74cf5c'; g.beginPath(); g.ellipse(160, 96, 122, 62, 0, 0, TAU); g.fill();
      drawCritter(g, 120, 96, 22, 0, 0, { face: 0 }); drawCritter(g, 186, 86, 22, 1, 3, { face: Math.PI, squash: 0.15 });
      g.lineWidth = 6; g.strokeStyle = '#ff5a5f'; g.beginPath(); g.ellipse(296, 150, 18, 7, 0, 0, TAU); g.stroke();
      drawCritter(g, 296, 142, 14, 2, 2, { noShadow: true, happy: true });
      g.fillStyle = '#ffe066'; for (const [x, y] of [[156, 80], [150, 98], [162, 104]]) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
    },
    create: ctx => new Bumper(ctx)
  });
})();
