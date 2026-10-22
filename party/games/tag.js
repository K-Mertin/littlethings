'use strict';
/* 鬼抓人 — one player is "it" (鬼). Touch someone to pass it on. Whoever spends the
   least time as 鬼 wins. The new 鬼 must count to three before chasing, and you
   can't tag straight back. Playing alone, a little ghost chases you instead.
   小朋友: 鬼 runs faster, the game is shorter, few rocks, a dashed line shows who
   the 鬼 is after. 大人: more rocks, longer. Tall grass hides you a little. */
(() => {
  const X0 = 60, Y0 = 150, X1 = 1540, Y1 = 860;
  const PURPLE = '#8f5cff', DEEP = '#6a3fc7', LILAC = '#b48cff';
  const DASH = [18, 14], NODASH = [];

  /* responsive steering: quick to start, quicker to stop, no sliding past the spot */
  function steer(e, ix, iy, sp, dt, acc) {
    const tx = ix * sp, ty = iy * sp, moving = ix || iy;
    const rate = !moving ? 26 : (e.vx * tx + e.vy * ty < 0 ? 24 : (acc || 14));
    const k = 1 - Math.exp(-rate * dt);
    e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
    if (!moving && e.vx * e.vx + e.vy * e.vy < 300) { e.vx = 0; e.vy = 0; }
  }
  /* a springy squash value: set e.sq for a squish, it wobbles back to 0 */
  function spring(e, dt) { e.sqv += (-e.sq * 320 - e.sqv * 15) * dt; e.sq += e.sqv * dt; }
  /* the background is painted once into an offscreen canvas at the screen's real scale */
  function bgLayer(self, g, paint) {
    const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
    if (!self.bgCv || self.bgS !== s) {
      const c = self.bgCv || document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(H * s);
      const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 0, 0); paint(cg); self.bgCv = c; self.bgS = s;
    }
    g.drawImage(self.bgCv, 0, 0, W, H);
  }
  /* a white sheet hood over the 鬼's head, the face peeking out */
  function ghostHood(g, x, y, r, sq, rot, t) {
    g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.scale(1 + sq, 1 - sq);
    const R = r * 1.17, hem = r * 0.74;
    g.beginPath();
    g.moveTo(-R, hem); g.lineTo(-R, -r * 0.08);
    g.arc(0, -r * 0.08, R, Math.PI, Math.PI * 1.36);
    g.quadraticCurveTo(-R * 0.1, -R * 1.5, R * 0.28, -R * 1.42);      // a little floppy tip
    g.quadraticCurveTo(R * 0.1, -R * 1.2, R * 0.34, -R * 1.02);
    g.arc(0, -r * 0.08, R, Math.PI * 1.6, 0);
    g.lineTo(R, hem);
    for (let k = 0; k < 4; k++) {
      const ex = R - (k + 1) * R / 2, cx = R - (k + 0.5) * R / 2;
      g.quadraticCurveTo(cx, hem + r * 0.34 + Math.sin(t * 7 + k * 1.7) * r * 0.1, ex, hem);
    }
    g.closePath();
    g.moveTo(r * 0.74, r * 0.04); g.ellipse(0, r * 0.04, r * 0.74, r * 0.56, 0, 0, TAU);
    g.fillStyle = 'rgba(255,255,255,.95)'; g.fill('evenodd');
    g.lineWidth = Math.max(2, r * 0.09); g.lineJoin = 'round'; g.strokeStyle = '#8f6ad8'; g.stroke();
    // soft purple shading on the sheet folds
    g.strokeStyle = 'rgba(143,106,216,.35)'; g.lineWidth = r * 0.07;
    g.beginPath(); g.moveTo(-R * 0.86, -r * 0.1); g.quadraticCurveTo(-R * 0.94, hem * 0.6, -R * 0.78, hem * 1.1); g.stroke();
    g.beginPath(); g.moveTo(R * 0.86, -r * 0.1); g.quadraticCurveTo(R * 0.94, hem * 0.6, R * 0.78, hem * 1.1); g.stroke();
    g.restore();
  }
  /* blades of tall grass in front of whoever stands in it */
  function grassFront(g, x, y, r, t) {
    for (let c = 0; c < 2; c++) {
      g.strokeStyle = c ? '#5cb552' : '#3e8a3a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath();
      for (let k = c; k < 11; k += 2) {
        const bx = x - r * 1.25 + k * r * 0.25, by = y + r * 0.95, h = r * (0.55 + ((k * 7) % 4) * 0.12), sw = Math.sin(t * 3 + k + x * 0.02) * 5;
        g.moveTo(bx, by); g.quadraticCurveTo(bx + sw * 0.4, by - h * 0.6, bx + sw + (k - 5) * 1.5, by - h);
      }
      g.stroke();
    }
  }

  class Tag {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = this.kid ? 60 : 90; this.edge = '#5fae52';
      const n = ctx.players.length;
      this.es = ctx.players.map((p, i) => {
        const a = i * TAU / Math.max(1, n);
        return { p, x: 800 + Math.cos(a) * 420, y: 505 + Math.sin(a) * 250, vx: 0, vy: 0, face: a + Math.PI, r: 32, cd: 0, dash: 0, freeze: 0, freeze0: 1, safe: 0, boost: 0,
          itTime: 0, tags: 0, walk: 0, sq: 0, sqv: 0, grass: null };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.solo = n === 1;
      if (this.solo) { this.npc = { x: 800, y: 505, vx: 0, vy: 0, face: 0, r: 34, freeze: 3, freeze0: 3, rest: 0, restT: rnd(7, 9), sx: 800, sy: 505, say: '', sayT: 0, sq: 0, sqv: 0, wob: 0 }; this.it = null; }
      else { this.it = this.es[rint(n)]; this.it.freeze = this.it.freeze0 = 3; }
      // obstacles: rocks, bushes and a tree stump or two
      this.obs = [];
      const kinds = this.kid ? [2, 0, 1, 0, 1] : [2, 0, 1, 0, 1, 2, 0, 1, 0];
      for (let k = 0; k < 120 && this.obs.length < kinds.length; k++) {
        const kind = kinds[this.obs.length], r = kind === 2 ? rnd(36, 44) : rnd(40, 64), x = rnd(X0 + 130, X1 - 130), y = rnd(Y0 + 110, Y1 - 100);
        if (hyp(x - 800, y - 505) < 160) continue;
        if (this.obs.some(o => hyp(o.x - x, o.y - y) < o.r + r + 100)) continue;
        if (this.es.some(e => hyp(e.x - x, e.y - y) < r + 80)) continue;
        const o = { x, y, r, kind, pts: [], dots: [] };
        for (let j = 0; j < 9; j++) { const a = j * TAU / 9 + rnd(-0.15, 0.15), rr = r * rnd(0.86, 1.06); o.pts.push(Math.cos(a) * rr, Math.sin(a) * rr * 0.8); }
        for (let j = 0; j < 6; j++) o.dots.push(rnd(-0.6, 0.6), rnd(-0.55, 0.25), rnd(0.75, 1.25));
        this.obs.push(o);
      }
      // tall grass patches (not solid, they just hide your feet)
      this.grass = [];
      for (let k = 0; k < 80 && this.grass.length < (this.kid ? 3 : 4); k++) {
        const rx = rnd(110, 150), ry = rnd(58, 78), x = rnd(X0 + rx + 20, X1 - rx - 20), y = rnd(Y0 + ry + 30, Y1 - ry - 20);
        if (this.obs.some(o => Math.abs(o.x - x) < o.r + rx + 10 && Math.abs(o.y - y) < o.r + ry + 10)) continue;
        if (this.grass.some(q => Math.abs(q.x - x) < q.rx + rx + 40 && Math.abs(q.y - y) < q.ry + ry + 40)) continue;
        const blades = []; for (let j = 0; j < 46; j++) { const a = rnd(0, TAU), d = Math.sqrt(Math.random()); blades.push(x + Math.cos(a) * d * rx * 0.92, y + Math.sin(a) * d * ry * 0.85, rnd(18, 34), rnd(-8, 8)); }
        this.grass.push({ x, y, rx, ry, blades });
      }
      this.leaves = []; for (let i = 0; i < 80; i++) this.leaves.push({ x: rnd(X0, X1), y: rnd(Y0, Y1), a: rnd(0, TAU), c: ['#ffd166', '#ffb4a2', '#cdeac0', '#ffffff'][rint(4)] });
      this.flowers = []; for (let i = 0; i < 26; i++) this.flowers.push({ x: rnd(X0 + 20, X1 - 20), y: rnd(Y0 + 20, Y1 - 20), c: ['#ffffff', '#ffe066', '#ff9fc4', '#b8a2ff'][rint(4)], k: rnd(0.7, 1.1) });
      this.dl = []; this.dn = 0; this.announced = false;
    }
    grassAt(e) {
      for (const q of this.grass) { const dx = (e.x - q.x) / q.rx, dy = (e.y + e.r * 0.5 - q.y) / q.ry; if (dx * dx + dy * dy < 1) return q; }
      return null;
    }
    solid(o) {
      for (const r of this.obs) { const dx = o.x - r.x, dy = o.y - r.y, d = hyp(dx, dy), m = r.r + o.r * 0.8; if (d < m && d > 0) { o.x = r.x + dx / d * m; o.y = r.y + dy / d * m; } }
      o.x = clamp(o.x, X0 + o.r, X1 - o.r); o.y = clamp(o.y, Y0 + o.r, Y1 - o.r);
    }
    pass(from, to) {
      const ctx = this.ctx;
      this.it = to; to.freeze = to.freeze0 = this.kid ? 3 : 2.5; to.vx = to.vy = 0; to.sq = 0.32; to.sqv = 0; to.dash = 0;
      from.safe = 2; from.tags++; from.boost = 1.1; from.sq = -0.2;
      ctx.sfx('bonk', 0.6); ctx.sfx('stun'); ctx.buzz(to.p, 250); ctx.buzz(from.p, 60); ctx.hitstop(0.05);
      Fx.burst(to.x, to.y, LILAC, 18, 320); Fx.ring(to.x, to.y, PURPLE, 150); Fx.shake(8); Fx.flash(LILAC, 0.22);
      Fx.announce('換 ' + to.p.name + ' 當鬼！', DEEP);
      Fx.pop(from.x, from.y - 80, '快溜！', '#1f9a52', 36);
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      if (!this.announced && this.t > 0.9) { this.announced = true; Fx.announce(this.it ? this.it.p.name + ' 先當鬼！' : '小幽靈要來抓你囉！', DEEP); }
      for (const e of this.es) {
        e.cd -= dt; e.dash -= dt; e.safe -= dt; e.boost -= dt; spring(e, dt);
        const isIt = e === this.it;
        if (isIt) e.itTime += dt;
        e.grass = this.grassAt(e);
        if (e.freeze > 0) {
          const before = Math.ceil(e.freeze); e.freeze -= dt; e.vx *= 0.8; e.vy *= 0.8;
          if (isIt && Math.ceil(e.freeze) !== before) {
            if (e.freeze > 0) { ctx.sfx('tick'); e.sq = 0.16; }
            else { ctx.sfx('go'); e.sq = -0.22; Fx.ring(e.x, e.y, PURPLE, 120); Fx.pop(e.x, e.y - 96, '來囉！', DEEP, 46); }
          }
          continue;
        }
        const i = ctx.input(e.p);
        if (ctx.pressed(e.p, 0) && e.cd <= 0) {
          e.dash = 0.28; e.cd = kid ? 1.8 : 2.2; e.sq = -0.22; e.sqv = 0; ctx.sfx('whoosh');
          for (let k = 0; k < 3; k++) Fx.dust(e.x, e.y + e.r * 0.7, 'rgba(235,245,215,.9)', 12);
        }
        let ix = i.x, iy = i.y; if (e.dash > 0 && !ix && !iy) { ix = Math.cos(e.face); iy = Math.sin(e.face); }
        const sp = (kid ? 310 : 340) * (isIt ? (kid ? 1.14 : 1.06) : 1) * (e.dash > 0 ? 2.1 : 1) * (e.boost > 0 ? 1.3 : 1) * (e.grass ? 0.9 : 1);
        if (ix || iy) e.face = Math.atan2(iy, ix);
        steer(e, ix, iy, sp, dt, e.dash > 0 ? 20 : 14);
        e.x += e.vx * dt; e.y += e.vy * dt; this.solid(e);
        const s = hyp(e.vx, e.vy); if (s > 30) e.walk += dt * (6 + s / 40);
        Fx.walk(e, dt, e.grass ? 'rgba(120,200,110,.7)' : 'rgba(235,245,215,.85)');
      }
      if (this.it && this.it.freeze <= 0) {
        for (const o of this.es) if (o !== this.it && o.safe <= 0 && hyp(o.x - this.it.x, o.y - this.it.y) < o.r + this.it.r) { this.pass(this.it, o); break; }
      }
      // players push apart a little
      for (let a = 0; a < this.es.length; a++) for (let b = a + 1; b < this.es.length; b++) {
        const A = this.es[a], B = this.es[b], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
        if (d < m && d > 0) { const o = (m - d) / 2; A.x -= dx / d * o; A.y -= dy / d * o; B.x += dx / d * o; B.y += dy / d * o; }
      }
      if (this.solo) this.npcStep(dt);
      if (this.t >= this.dur) this.over = true;
    }
    /* the little ghost: chases, rests now and then, loses you in tall grass, slides round rocks */
    npcStep(dt) {
      const ctx = this.ctx, kid = this.kid, n = this.npc, e = this.es[0];
      n.wob += dt; n.sayT -= dt; spring(n, dt);
      const d0 = hyp(e.x - n.x, e.y - n.y);
      if (n.freeze > 0) {
        const before = Math.ceil(n.freeze); n.freeze -= dt; n.vx *= 0.85; n.vy *= 0.85;
        if (Math.ceil(n.freeze) !== before) { if (n.freeze > 0) { ctx.sfx('tick'); n.sq = 0.15; } else { ctx.sfx('go'); n.sq = -0.2; Fx.ring(n.x, n.y, PURPLE, 110); n.say = '來囉！'; n.sayT = 1; } }
      } else if (n.rest > 0) {
        n.rest -= dt; n.vx *= 0.88; n.vy *= 0.88;
        if (n.rest <= 0) { n.say = '來囉！'; n.sayT = 1; n.sq = -0.2; }
      } else {
        n.restT -= dt;
        if (n.restT <= 0) { n.rest = kid ? 1.5 : 0.9; n.restT = rnd(6.5, 9); n.say = '呼…喘口氣'; n.sayT = n.rest; n.sq = 0.2; }
        // grass hides you when the ghost isn't right next to you
        const hidden = e.grass && d0 > 190;
        if (!hidden) { n.sx = e.x; n.sy = e.y; }
        let dx = n.sx - n.x, dy = n.sy - n.y; const d = hyp(dx, dy) || 1; dx /= d; dy /= d;
        if (hidden && d < 40) { dx = Math.cos(n.wob * 0.9); dy = Math.sin(n.wob * 1.3); if (n.sayT <= 0) { n.say = '咦？躲哪裡了？'; n.sayT = 1.6; } }
        for (const o of this.obs) {   // slide round rocks instead of getting stuck
          const ox = n.x - o.x, oy = n.y - o.y, od = hyp(ox, oy), m = o.r + n.r + 55;
          if (od >= m || od <= 0) continue;
          const w = clamp(1 - (od - o.r - n.r) / 55, 0, 1.2), tx = -oy / od, ty = ox / od, side = tx * dx + ty * dy >= 0 ? 1 : -1;
          dx += (ox / od * 0.5 + tx * side) * w; dy += (oy / od * 0.5 + ty * side) * w;
        }
        const m2 = hyp(dx, dy) || 1, sp = Math.min(kid ? 270 : 360, (kid ? 220 : 280) + this.t * (kid ? 0.8 : 1.6)) * (hidden ? 0.7 : 1);
        steer(n, dx / m2, dy / m2, sp, dt, 7);   // ghosts glide
        n.x += n.vx * dt; n.y += n.vy * dt; this.solid(n);
        if (d0 < n.r + e.r && e.safe <= 0) {
          e.itTime += 1; e.safe = 1.8; e.boost = 1.2; e.sq = 0.3; n.freeze = n.freeze0 = kid ? 2.5 : 2; n.sq = 0.3;
          ctx.sfx('bonk', 0.6); ctx.sfx('stun'); ctx.buzz(e.p, 250); ctx.hitstop(0.05);
          Fx.burst(e.x, e.y, LILAC, 16, 300); Fx.ring(e.x, e.y, PURPLE, 130); Fx.shake(7); Fx.flash(LILAC, 0.2);
          Fx.announce('被抓到了！快跑！', DEEP); n.say = '抓到你了！'; n.sayT = 1.3;
        }
      }
      if (hyp(n.vx, n.vy) > 20) n.face = Math.atan2(n.vy, n.vx);
    }

    /* ---------------- drawing ---------------- */
    paintBg(g) {
      g.fillStyle = '#5fae52'; g.fillRect(0, 0, W, H);
      // hedges along the top and bottom
      for (const hy of [128, 890]) for (let x = -20; x < W + 40; x += 44) {
        g.fillStyle = '#3f8f45'; g.beginPath(); g.arc(x, hy, 32 + (x * 7 % 9), 0, TAU); g.fill();
        g.fillStyle = '#4fa553'; g.beginPath(); g.arc(x - 6, hy - 8, 22, 0, TAU); g.fill();
      }
      g.save(); g.beginPath(); g.roundRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20, 36); g.clip();
      g.fillStyle = '#8fd178'; g.fillRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20);
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let x = X0 - 10, i = 0; x < X1 + 10; x += 110, i++) if (i % 2) g.fillRect(x, Y0 - 10, 110, Y1 - Y0 + 20);   // mowed stripes
      g.fillStyle = 'rgba(60,120,40,.08)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(X0 + (i * 397) % (X1 - X0), Y0 + (i * 211) % (Y1 - Y0), 120, 50, 0, 0, TAU); g.fill(); }
      for (const l of this.leaves) { g.fillStyle = l.c; g.beginPath(); g.ellipse(l.x, l.y, 7, 3.2, l.a, 0, TAU); g.fill(); }
      for (const f of this.flowers) {
        g.fillStyle = f.c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(f.x + Math.cos(a) * 5 * f.k, f.y + Math.sin(a) * 5 * f.k, 3.6 * f.k, 0, TAU); g.fill(); }
        g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(f.x, f.y, 2.8 * f.k, 0, TAU); g.fill();
      }
      // tall grass beds
      for (const q of this.grass) {
        g.fillStyle = 'rgba(40,110,40,.35)'; g.beginPath(); g.ellipse(q.x, q.y + 6, q.rx, q.ry, 0, 0, TAU); g.fill();
        g.fillStyle = '#5aa84c'; g.beginPath(); g.ellipse(q.x, q.y, q.rx * 0.97, q.ry * 0.95, 0, 0, TAU); g.fill();
        for (let c = 0; c < 2; c++) {
          g.strokeStyle = c ? '#7ccc5e' : '#3e8a3a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath();
          for (let j = c * 4; j < q.blades.length; j += 8) { const x = q.blades[j], y = q.blades[j + 1], h = q.blades[j + 2], l = q.blades[j + 3]; g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.3, y - h * 0.6, x + l, y - h); }
          g.stroke();
        }
      }
      // shadows under the obstacles
      for (const o of this.obs) { g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(o.x + 8, o.y + o.r * 0.55, o.r * 1.05, o.r * 0.42, 0, 0, TAU); g.fill(); }
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 5; g.setLineDash([22, 16]); g.beginPath(); g.roundRect(X0 - 4, Y0 - 4, X1 - X0 + 8, Y1 - Y0 + 8, 32); g.stroke(); g.setLineDash(NODASH);
    }
    drawObs(g, o, t) {
      const x = o.x, y = o.y, r = o.r, p = o.pts, d = o.dots;
      if (o.kind === 0) {   // rock
        g.fillStyle = '#7f8396'; g.beginPath(); g.moveTo(x + p[0], y + p[1] + 7); for (let j = 2; j < p.length; j += 2) g.lineTo(x + p[j], y + p[j + 1] + 7); g.closePath(); g.fill();
        g.fillStyle = '#aeb1c2'; g.beginPath(); g.moveTo(x + p[0], y + p[1]); for (let j = 2; j < p.length; j += 2) g.lineTo(x + p[j], y + p[j + 1]); g.closePath(); g.fill();
        g.strokeStyle = '#6f7386'; g.lineWidth = 4; g.lineJoin = 'round'; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.32, r * 0.32, r * 0.15, -0.5, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(80,84,100,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + r * 0.15, y - r * 0.2); g.lineTo(x + r * 0.32, y + r * 0.05); g.lineTo(x + r * 0.22, y + r * 0.3); g.stroke();
        g.fillStyle = '#7cc463'; g.beginPath(); g.ellipse(x + r * 0.2, y - r * 0.55, r * 0.26, r * 0.1, 0.2, 0, TAU); g.fill();   // a bit of moss
      } else if (o.kind === 1) {   // bush
        g.fillStyle = '#2f8040';
        for (let j = 0; j < d.length; j += 3) { g.beginPath(); g.arc(x + d[j] * r, y + d[j + 1] * r + 8, r * 0.48 * d[j + 2], 0, TAU); g.fill(); }
        g.fillStyle = '#43a352'; g.beginPath(); g.arc(x, y - r * 0.15, r * 0.78, 0, TAU); g.fill();
        for (let j = 0; j < d.length; j += 3) { g.beginPath(); g.arc(x + d[j] * r, y + d[j + 1] * r, r * 0.45 * d[j + 2], 0, TAU); g.fill(); }
        g.fillStyle = '#69c26d'; for (let j = 0; j < d.length; j += 3) { g.beginPath(); g.arc(x + d[j] * r - r * 0.12, y + d[j + 1] * r - r * 0.14, r * 0.2 * d[j + 2], 0, TAU); g.fill(); }
        g.fillStyle = '#ff5f87'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.9 + 0.4) * r * 0.55, y - r * 0.2 + Math.sin(k * 2.3) * r * 0.35, 5, 0, TAU); g.fill(); }
        g.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.9 + 0.4) * r * 0.55 - 1.5, y - r * 0.2 + Math.sin(k * 2.3) * r * 0.35 - 1.5, 1.6, 0, TAU); g.fill(); }
      } else {   // tree stump
        const h = 26, top = y - h;
        g.fillStyle = '#7a4a26'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * r * 0.95, y + 6, r * 0.32, r * 0.14, s * 0.4, 0, TAU); g.fill(); }
        g.fillStyle = '#8f5a30'; g.beginPath(); g.moveTo(x - r, top); g.lineTo(x - r, y); g.ellipse(x, y, r, r * 0.38, 0, Math.PI, 0, true); g.lineTo(x + r, top); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(70,40,15,.45)'; g.lineWidth = 3; g.beginPath();
        for (let k = -2; k <= 2; k++) { const bx = x + k * r * 0.38; g.moveTo(bx, top + 6); g.lineTo(bx + 2, y + r * 0.3 * Math.cos(k * 0.5) - 4); }
        g.stroke();
        g.fillStyle = '#e5b97f'; g.beginPath(); g.ellipse(x, top, r, r * 0.38, 0, 0, TAU); g.fill();
        g.strokeStyle = '#b8834c'; g.lineWidth = 2.5; for (const k of [0.75, 0.5, 0.25]) { g.beginPath(); g.ellipse(x + 2, top, r * k, r * 0.38 * k, 0, 0, TAU); g.stroke(); }
        g.strokeStyle = '#8f5a30'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, top, r, r * 0.38, 0, 0, TAU); g.stroke();
        // a tiny mushroom at the foot
        const mx = x + r * 0.75, my = y + r * 0.2;
        g.fillStyle = '#fff3e3'; g.fillRect(mx - 3, my - 10, 6, 12);
        g.fillStyle = '#ff4f58'; g.beginPath(); g.ellipse(mx, my - 10, 11, 8, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(mx - 4, my - 13, 2, 0, TAU); g.arc(mx + 4, my - 14, 1.6, 0, TAU); g.fill();
      }
    }
    drawRunner(g, e, t) {
      const isIt = e === this.it, C = PARTY_COLORS[e.p.col], s = hyp(e.vx, e.vy), m = Math.min(1, s / 220);
      const bob = Math.abs(Math.sin(e.walk)), hop = bob * 7 * m, sq = e.sq + (0.5 - bob) * 0.08 * m, rot = clamp(e.vx / 2600, -0.14, 0.14);
      if (isIt) {   // purple glow on the ground (layered, no blur)
        const pu = 0.5 + 0.5 * Math.sin(t * 6);
        g.fillStyle = 'rgba(143,92,255,.14)';
        for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.6, e.r * (1.3 + k * 0.3 + pu * 0.15), e.r * (0.55 + k * 0.14 + pu * 0.06), 0, 0, TAU); g.fill(); }
      }
      if (e.dash > 0 || e.boost > 0) {   // speed lines
        const a = Math.atan2(e.vy, e.vx), ca = Math.cos(a), sa = Math.sin(a);
        g.strokeStyle = e.boost > 0 ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.6)'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath();
        for (let k = -1; k <= 1; k++) { const bx = e.x - ca * (e.r + 6) - sa * k * 15, by = e.y - hop - sa * (e.r + 6) + ca * k * 15, L = 26 + (k ? 0 : 14) + Math.sin(t * 30 + k) * 6; g.moveTo(bx, by); g.lineTo(bx - ca * L, by - sa * L); }
        g.stroke();
      }
      if (e.dash > 0) { g.globalAlpha = 0.25; g.fillStyle = C.c; g.beginPath(); g.arc(e.x - e.vx * 0.05, e.y - e.vy * 0.05, e.r, 0, TAU); g.fill(); g.globalAlpha = 1; }
      drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: sq, hop, rot, stun: isIt && e.freeze > 0, blink: (t + e.p.uid * 1.3) % 3.6 < 0.12, happy: e.boost > 0 && !isIt });
      if (isIt) ghostHood(g, e.x, e.y - hop, e.r, sq, rot, t);
      if (e.safe > 0 && !isIt) {   // a soft bubble: can't be tagged right now
        g.globalAlpha = Math.min(1, e.safe * 2) * (0.55 + 0.2 * Math.sin(t * 14));
        g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.arc(e.x, e.y - hop, e.r + 12, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fill(); g.globalAlpha = 1;
      }
      if (e.grass) grassFront(g, e.x, e.y, e.r, t);
      drawTag(g, e.x, e.y - e.r - 30 - (isIt ? 8 : 0), e.p);
      if (isIt) { g.font = '42px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👻', e.x + Math.sin(t * 2.5) * 8, e.y - e.r - 80 + Math.sin(t * 4) * 6); }
    }
    drawNpc(g, n, t) {
      const fl = Math.sin(t * 4) * 6, x = n.x, y = n.y - 14 + fl, r = n.r, sx = 1 + n.sq, sy = 1 - n.sq;
      const pu = 0.5 + 0.5 * Math.sin(t * 6);
      g.fillStyle = 'rgba(143,92,255,.14)';
      for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x, n.y + 30, r * (1.1 + k * 0.3 + pu * 0.12), r * (0.42 + k * 0.12), 0, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(40,20,70,.22)'; g.beginPath(); g.ellipse(x, n.y + 30, 30 - fl, 9, 0, 0, TAU); g.fill();
      g.save(); g.translate(x, y); g.scale(sx, sy); g.rotate(clamp(n.vx / 1800, -0.2, 0.2));
      g.globalAlpha = n.freeze > 0 ? 0.75 : 1;
      g.fillStyle = '#ffffff'; g.strokeStyle = '#8f6ad8'; g.lineWidth = 3.5; g.lineJoin = 'round';
      g.beginPath(); g.arc(0, -8, r, Math.PI, 0); g.lineTo(r, 26);
      for (let k = 0; k < 4; k++) g.quadraticCurveTo(r * 0.75 - k * r / 2, 40 + Math.sin(t * 8 + k * 1.6) * 6, r / 2 - k * r / 2, 26);
      g.closePath(); g.fill(); g.stroke();
      // little arms waving
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * (r + 4), 6 + Math.sin(t * 6 + s) * 4, 9, 13, s * 0.6, 0, TAU); g.fill(); g.stroke(); }
      const lx = Math.cos(n.face) * 4, ly = Math.sin(n.face) * 3;
      g.fillStyle = '#2b2340';
      if (n.rest > 0) { g.lineWidth = 3; g.strokeStyle = '#2b2340'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 11 + lx, -10, 5, 0.2, Math.PI - 0.2); g.stroke(); } }
      else for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 11 + lx, -10 + ly, 5, 8, 0, 0, TAU); g.fill(); }
      g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 11 + lx - 1.5, -13 + ly, 1.8, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(255,110,150,.5)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 20 + lx, 4, 6, 4, 0, 0, TAU); g.fill(); }
      g.fillStyle = '#6a3fc7'; g.beginPath(); g.ellipse(lx, 8 + ly, 6, n.rest > 0 ? 3 : 6, 0, 0, TAU); g.fill();
      g.restore(); g.globalAlpha = 1;
      if (n.rest > 0) { g.font = '900 30px "Fredoka",system-ui'; g.fillStyle = '#6a3fc7'; g.textAlign = 'center'; g.fillText('z', x + 40, y - 46 - (t * 30 % 20)); g.font = '900 22px "Fredoka",system-ui'; g.fillText('z', x + 56, y - 66 - (t * 30 % 20)); }
      if (n.sayT > 0 && n.say) {
        g.font = '900 24px "Noto Sans TC",system-ui,sans-serif'; const w = g.measureText(n.say).width + 26, bx = clamp(x, X0 + w / 2, X1 - w / 2), by = Math.max(Y0 + 10, y - r - 58);
        g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(bx - w / 2, by - 20, w, 40, 18); g.fill();
        g.strokeStyle = PURPLE; g.lineWidth = 3; g.stroke();
        g.fillStyle = DEEP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n.say, bx, by + 1);
      }
    }
    /* big 3-2-1 over a 鬼 who is counting, with a ring running out */
    drawCount(g, x, y, r, f, f0, t) {
      const n = Math.ceil(f), frac = f - (n - 1), k = 1 + Math.max(0, frac - 0.75) * 2;
      g.globalAlpha = 0.9; g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 12; g.beginPath(); g.arc(x, y, r + 22, 0, TAU); g.stroke();
      g.strokeStyle = PURPLE; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r + 22, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(f / f0, 0, 1)); g.stroke();
      g.globalAlpha = 1;
      g.font = `900 ${Math.round(96 * k)}px "Fredoka","Noto Sans TC",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 14; g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.strokeText(String(n), x, y - 4); g.fillStyle = DEEP; g.fillText(String(n), x, y - 4);
    }
    /* 小朋友: a faint dashed line from the 鬼 to whoever it is closest to */
    drawChase(g, t) {
      let gx, gy, gr;
      if (this.solo) { const n = this.npc; if (n.freeze > 0 || n.rest > 0) return; gx = n.x; gy = n.y; gr = n.r; }
      else { const it = this.it; if (!it || it.freeze > 0) return; gx = it.x; gy = it.y; gr = it.r; }
      let best = null, bd = 1e9;
      for (const e of this.es) { if (e === this.it || e.safe > 0) continue; const d = hyp(e.x - gx, e.y - gy); if (d < bd) { bd = d; best = e; } }
      if (!best || bd < gr + best.r + 50) return;
      const ux = (best.x - gx) / bd, uy = (best.y - gy) / bd, sx = gx + ux * (gr + 14), sy = gy + uy * (gr + 14), ex = best.x - ux * (best.r + 20), ey = best.y - uy * (best.r + 20);
      g.globalAlpha = 0.42; g.strokeStyle = PURPLE; g.lineWidth = 6; g.lineCap = 'round';
      g.setLineDash(DASH); g.lineDashOffset = -t * 70; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.setLineDash(NODASH);
      g.fillStyle = PURPLE; g.beginPath(); g.moveTo(ex + ux * 14, ey + uy * 14); g.lineTo(ex - ux * 10 - uy * 13, ey - uy * 10 + ux * 13); g.lineTo(ex - ux * 10 + uy * 13, ey - uy * 10 - ux * 13); g.closePath(); g.fill();
      g.globalAlpha = 1;
    }
    add(y, k, o) { let it = this.dl[this.dn]; if (!it) it = this.dl[this.dn] = { y: 0, k: 0, o: null }; it.y = y; it.k = k; it.o = o; this.dn++; }
    draw(g) {
      const t = this.t;
      bgLayer(this, g, cg => this.paintBg(cg));
      Fx.ground(g);
      if (this.kid) this.drawChase(g, t);
      this.dn = 0;
      for (const o of this.obs) this.add(o.y, 0, o);
      for (const e of this.es) this.add(e.y, 1, e);
      if (this.solo) this.add(this.npc.y, 2, this.npc);
      const L = this.dl;
      for (let i = 1; i < this.dn; i++) { const it = L[i]; let j = i - 1; while (j >= 0 && L[j].y > it.y) { L[j + 1] = L[j]; j--; } L[j + 1] = it; }
      for (let i = 0; i < this.dn; i++) { const it = L[i]; if (it.k === 0) this.drawObs(g, it.o, t); else if (it.k === 1) this.drawRunner(g, it.o, t); else this.drawNpc(g, it.o, t); }
      if (this.it && this.it.freeze > 0) this.drawCount(g, this.it.x, this.it.y, this.it.r, this.it.freeze, this.it.freeze0, t);
      if (this.solo && this.npc.freeze > 0) this.drawCount(g, this.npc.x, this.npc.y - 10, this.npc.r, this.npc.freeze, this.npc.freeze0, t);
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
    id: 'tag', name: '鬼抓人', icon: '👻', col: '#8f5cff', bg: '#5fae52', kind: 'vs', players: '1–6 人',
    blurb: '被鬼碰到就換你當鬼，當鬼最短的人贏！',
    btn: { label: '衝刺', icon: '💨' },
    rules: kid => kid
      ? ['披著白床單、頭上有 👻 的人是鬼，鬼碰到誰，誰就變成鬼', '新的鬼要先數 3、2、1 才能動，快跑開！', '按「衝刺」跑一下下很快，躲進高高的草叢比較不會被看到', '60 秒後，當鬼時間最短的人贏']
      : ['披著白床單的是鬼，碰到人就把鬼傳出去（不能馬上傳回來）', '新的鬼要數到三才能追，鬼跑得稍微快一點', '石頭、草叢和樹樁擋路；高草叢可以躲；「衝刺」2 秒才能用一次', '90 秒後，當鬼時間最短的人贏'],
    thumb(g) {
      g.fillStyle = '#8fd178'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#5aa84c'; g.beginPath(); g.ellipse(70, 150, 70, 26, 0, 0, TAU); g.fill();
      g.fillStyle = '#aeb1c2'; g.beginPath(); g.ellipse(255, 132, 34, 24, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(155,92,255,.3)'; g.beginPath(); g.ellipse(110, 120, 46, 18, 0, 0, TAU); g.fill();
      drawCritter(g, 110, 100, 26, 4, 3, { face: 0 }); ghostHood(g, 110, 100, 26, 0, 0, 0);
      g.font = '28px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👻', 110, 46);
      drawCritter(g, 205, 80, 22, 0, 2, { face: 0, hop: 6, happy: true }); drawCritter(g, 60, 140, 18, 2, 0, { face: -2 });
    },
    create: ctx => new Tag(ctx)
  });
})();
