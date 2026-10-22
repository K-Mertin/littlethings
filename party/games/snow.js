'use strict';
/* 雪球大戰 — throw snowballs the way you're facing; every hit is a point.
   Snow walls block throws (and crack a little). Snowmen pop up too (a point each),
   so one player can play.
   小朋友: big snowballs that bend a little toward the nearest target, a hit only
   makes you shiver. 大人: small snowballs, a hit freezes you in an ice block for a moment. */
(() => {
  const X0 = 60, Y0 = 150, X1 = 1540, Y1 = 860;
  const WALL_H = 34, PRINTS = 170, NODASH = [], DASH = [20, 16];
  const HATS = ['#2b2340', '#ff4f58', '#2f8cff', '#22c26a', '#9b5cff', '#ffbf1f'];

  function steer(e, ix, iy, sp, dt, acc) {
    const tx = ix * sp, ty = iy * sp, moving = ix || iy;
    const rate = !moving ? 24 : (e.vx * tx + e.vy * ty < 0 ? 22 : (acc || 13));
    const k = 1 - Math.exp(-rate * dt);
    e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
    if (!moving && e.vx * e.vx + e.vy * e.vy < 300) { e.vx = 0; e.vy = 0; }
  }
  function spring(e, dt) { e.sqv += (-e.sq * 320 - e.sqv * 15) * dt; e.sq += e.sqv * dt; }
  function turn(e, a, dt, rate) { const d = Math.atan2(Math.sin(a - e.face), Math.cos(a - e.face)); e.face += d * (1 - Math.exp(-rate * dt)); }
  /* the same body transform drawCritter uses, so the winter clothes sit exactly on the critter */
  function bodyOn(g, x, y, r, hop, moving, step, rot, sq) {
    g.save(); g.translate(x, y - hop - (moving ? Math.abs(Math.sin(step)) * r * 0.06 : 0));
    if (rot) g.rotate(rot); g.scale(1 + sq, 1 - sq);
  }
  /* a knitted beanie with a folded cuff and a bouncy pompom (px, py: how far the pompom lags) */
  function beanie(g, r, col, px, py, frog) {
    g.save(); if (frog) { g.translate(0, -r * 0.62); g.scale(0.5, 0.5); }
    const lite = mixCol(col, 0.35), dk = mixCol(col, -0.25);
    g.fillStyle = col; g.strokeStyle = dk; g.lineWidth = r * 0.06;
    g.beginPath(); g.ellipse(0, -r * 0.42, r * 0.9, r * 0.7, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = lite; g.lineWidth = r * 0.05; g.beginPath();
    for (let k = -3; k <= 3; k++) { const bx = k * r * 0.22; g.moveTo(bx, -r * 0.46); g.quadraticCurveTo(bx * 0.9, -r * 0.8, bx * 0.5, -r * 1.05 + Math.abs(k) * r * 0.06); }
    g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(-r * 0.84, -r * 0.84, r * 1.68, r * 0.12, r * 0.06); g.fill();   // a white stripe
    g.fillStyle = lite; g.strokeStyle = dk; g.lineWidth = r * 0.05; g.beginPath(); g.roundRect(-r * 0.95, -r * 0.56, r * 1.9, r * 0.26, r * 0.12); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = r * 0.035; g.beginPath(); for (let k = -6; k <= 6; k++) { g.moveTo(k * r * 0.14, -r * 0.52); g.lineTo(k * r * 0.14, -r * 0.34); } g.stroke();
    const qx = px, qy = -r * 1.12 + py;
    g.strokeStyle = dk; g.lineWidth = r * 0.06; g.beginPath(); g.moveTo(0, -r * 1.06); g.lineTo(qx, qy); g.stroke();
    g.fillStyle = '#fffdf6'; g.strokeStyle = '#d7d2e4'; g.lineWidth = r * 0.04; g.beginPath(); g.arc(qx, qy, r * 0.26, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(200,195,220,.7)'; for (let k = 0; k < 5; k++) { const a = k * 1.3; g.beginPath(); g.arc(qx + Math.cos(a) * r * 0.13, qy + Math.sin(a) * r * 0.13, r * 0.045, 0, TAU); g.fill(); }
    g.restore();
  }
  /* a striped scarf round the neck, its end fluttering out behind when running */
  function scarf(g, r, col, face, vx, vy, t, wrap) {
    const lx = Math.cos(face), back = lx >= 0 ? -1 : 1, sp = Math.hypot(vx, vy);
    if (!wrap) {
    // the loose end, behind the body
    const fl = Math.min(1, sp / 300), ax = sp > 20 ? -vx / sp : back * 0.3, ay = sp > 20 ? -vy / sp : 1;
    const bx = back * r * 0.55, by = r * 0.62, L = r * (0.75 + fl * 0.6), wv = Math.sin(t * (6 + fl * 10)) * r * 0.12 * (0.4 + fl);
    const ex = bx + ax * L * fl + (1 - fl) * back * r * 0.42, ey = by + ay * L * fl * 0.6 + (1 - fl) * r * 0.22;
    g.strokeStyle = col; g.lineWidth = r * 0.24; g.lineCap = 'round';
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo((bx + ex) / 2 - ay * wv, (by + ey) / 2 + ax * wv, ex, ey); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = r * 0.24; g.setLineDash([r * 0.1, r * 0.22]);
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo((bx + ex) / 2 - ay * wv, (by + ey) / 2 + ax * wv, ex, ey); g.stroke(); g.setLineDash([]);
    g.fillStyle = col; for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(ex + k * r * 0.07, ey + r * 0.12, r * 0.04, 0, TAU); g.fill(); }
    return; }
    // the wrap round the neck
    g.save(); g.beginPath(); g.arc(0, 0, r * 1.03, 0, TAU); g.clip();
    g.fillStyle = col; g.fillRect(-r * 1.1, r * 0.5, r * 2.2, r * 0.2);
    g.fillStyle = '#ffffff'; for (let k = -4; k <= 4; k++) g.fillRect(k * r * 0.26 - r * 0.04, r * 0.5, r * 0.08, r * 0.2);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-r * 1.1, r * 0.66, r * 2.2, r * 0.04);
    g.restore();
  }
  /* a mitten (thumb pointing up), with a white cuff */
  function mitten(g, x, y, a, col) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = col; g.strokeStyle = mixCol(col, -0.3); g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(2, 0, 10, 8.5, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(1, -8, 4, 5, 0.4, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(-11, -7, 6, 14, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(4, -2, 4, 2, 0, 0, TAU); g.fill();
    g.restore();
  }
  function bgLayer(self, g, paint) {
    const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
    if (!self.bgCv || self.bgS !== s) {
      const c = self.bgCv || document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(H * s);
      const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 0, 0); paint(cg); self.bgCv = c; self.bgS = s;
    }
    g.drawImage(self.bgCv, 0, 0, W, H);
  }
  /* hats for snowmen: 0 top hat, 1 beanie, 2 bucket, 3 earmuffs */
  function drawHat(g, kind, col, x, y) {
    if (kind === 0) {
      g.fillStyle = '#2b2340'; g.fillRect(x - 15, y - 30, 30, 26); g.fillRect(x - 22, y - 6, 44, 6);
      g.fillStyle = col === '#2b2340' ? '#ff4f58' : col; g.fillRect(x - 15, y - 12, 30, 6);
    } else if (kind === 1) {
      g.fillStyle = col; g.beginPath(); g.arc(x, y - 2, 18, Math.PI, 0); g.fill();
      g.fillStyle = '#fff'; g.fillRect(x - 19, y - 6, 38, 7);
      g.beginPath(); g.arc(x, y - 22, 7, 0, TAU); g.fill();
    } else if (kind === 2) {
      g.fillStyle = col; g.beginPath(); g.moveTo(x - 18, y - 2); g.lineTo(x - 13, y - 26); g.lineTo(x + 13, y - 26); g.lineTo(x + 18, y - 2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 15, y - 12); g.lineTo(x + 15, y - 12); g.stroke();
    } else {
      g.strokeStyle = '#2b2340'; g.lineWidth = 4; g.beginPath(); g.arc(x, y + 14, 19, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.fillStyle = col; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 18, y + 18, 8, 0, TAU); g.fill(); }
    }
  }

  class Snow {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = 60; this.teams = !!ctx.teams; this.edge = '#cfe6f7';
      const n = ctx.players.length;
      this.es = ctx.players.map((p, i) => {
        const side = this.teams ? ctx.players.filter(q => q.team === p.team) : null;
        const left = this.teams ? p.team === 0 : i % 2 === 0, row = this.teams ? side.indexOf(p) : Math.floor(i / 2), rows = this.teams ? side.length : Math.ceil(n / 2);
        return { p, x: left ? 220 : 1380, y: Y0 + (Y1 - Y0) * (row + 1) / (rows + 1), vx: 0, vy: 0, face: left ? 0 : Math.PI, r: 32, cd: 0, cold: 0, inv: 0, hits: 0, hurt: 0,
          walk: 0, sq: 0, sqv: 0, wind: 0, arm: 0, stepT: 0, side: 1, aim: left ? 0 : Math.PI, want: left ? 0 : Math.PI, lean: 0,
          cheer: 0, breathT: rnd(0, 1), pox: 0, poy: 0, pvx: 0, pvy: 0,
          knit: this.teams ? TEAMS[p.team].c : PARTY_COLORS[(p.col + 3) % 6].c };
      });
      if (n === 1) this.es[0].x = 800;
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.balls = []; this.men = []; this.manT = 1; this.deb = []; this.splats = [];
      this.prints = []; for (let i = 0; i < PRINTS; i++) this.prints.push({ x: 0, y: 0, a: 0, t: 99 }); this.pi = 0;
      this.walls = [];
      const lay = this.kid ? [[800, 330, 0], [800, 690, 0], [520, 505, 1], [1080, 505, 1]] : [[800, 300, 0], [800, 710, 0], [500, 420, 1], [1100, 590, 1], [560, 720, 0], [1040, 290, 0]];
      for (const [x, y, v] of lay) {
        const w = v ? { x: x - 22, y: y - 80, w: 44, h: 160 } : { x: x - 90, y: y - 22, w: 180, h: 44 };
        w.dmg = 0; w.heal = 0; w.shk = 0; w.cracks = [];
        for (let c = 0; c < 5; c++) {   // crack lines, shown one by one as the wall takes hits
          const pts = []; let cx = rnd(w.x + 12, w.x + w.w - 12), cy = rnd(w.y - WALL_H + 8, w.y + w.h - 6);
          pts.push(cx, cy); const ang = rnd(0, TAU);
          for (let s = 0; s < 5; s++) { const a = ang + (s % 2 ? 0.7 : -0.7) + rnd(-0.3, 0.3); cx = clamp(cx + Math.cos(a) * rnd(10, 18), w.x + 4, w.x + w.w - 4); cy = clamp(cy + Math.sin(a) * rnd(10, 18), w.y - WALL_H + 4, w.y + w.h - 3); pts.push(cx, cy); }
          w.cracks.push(pts);
        }
        this.walls.push(w);
      }
      // three layers of falling snow (far ones small and slow)
      this.layers = [[40, 1.3, 2.2, 22, 38, 0.6], [26, 2.6, 3.6, 48, 70, 0.85], [10, 5, 7, 110, 150, 0.45]].map(([k, s0, s1, v0, v1, a]) => {
        const f = []; for (let i = 0; i < k; i++) f.push({ x: rnd(-60, W + 60), y: rnd(0, H), s: rnd(s0, s1), v: rnd(v0, v1), ph: rnd(0, TAU) });
        return { f, a };
      });
      this.drifts = []; for (let i = 0; i < 22; i++) this.drifts.push({ x: rnd(X0 + 60, X1 - 60), y: rnd(Y0 + 40, Y1 - 30), rx: rnd(50, 110), ry: rnd(12, 22) });
      this.sparks = []; for (let i = 0; i < 90; i++) this.sparks.push(rnd(X0, X1), rnd(Y0, Y1));
      // breath puffs (a fixed pool), the pond in the middle, cabins with chimneys, trees that drop snow
      this.puffs = []; for (let i = 0; i < 28; i++) this.puffs.push({ x: 0, y: 0, vx: 0, vy: 0, t: 9, life: 1 }); this.pfi = 0;
      this.pond = { x: 800, y: 505, rx: 150, ry: 64 };
      this.cabins = [[34, 132, 96, 1], [150, 126, 84, 0], [1376, 128, 88, 0], [1484, 134, 98, 1]];
      this.chims = this.cabins.map(([x, y, w, k]) => ({ x: x + (k ? w * 0.72 : w * 0.26), y: y - 46 - w * 0.36 }));
      this.trees = [[22, 220, 1], [12, 520, 1.2], [30, 800, 0.9], [1580, 260, 1.1], [1590, 560, 0.9], [1575, 820, 1.2], [-10, 380, 0.8], [1610, 420, 0.8]];
      this.clumps = this.trees.slice(0, 6).map(([x, y, s], i) => { const side = x < 800 ? 1 : -1; return { x: x + side * 46 * s, y: y + 22 * s, g: y + 52 * s, per: rnd(5, 8), off: rnd(0, 8), s }; });
      this.dl = []; this.dn = 0;
    }
    hitWall(x, y, r) { for (const w of this.walls) if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return w; return null; }
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
        const look = (x, y) => { const ang = Math.atan2(y - e.y, x - e.x), diff = Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a))); if (diff < bd && hyp(x - e.x, y - e.y) < 650) { bd = diff; best = ang; } };
        for (const o of this.es) if (o !== e && !(this.teams && o.p.team === e.p.team)) look(o.x, o.y);
        for (const m of this.men) if (m.st === 'up') look(m.x, m.y);
        if (best !== null) a = best;
      }
      const L = 0.95;
      this.balls.push({ x: e.x + Math.cos(a) * (e.r + 6), y: e.y + Math.sin(a) * (e.r + 6), z: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: br, from: e, life: L, L, spin: rnd(0, TAU) });
      e.cd = this.kid ? 0.5 : 0.7; e.arm = 0.22; e.sq = -0.16; e.sqv = 0; e.aim = a; ctx.sfx('whoosh');
    }
    /* a little cloud of breath in the cold air */
    breath(e) {
      const P = this.puffs[this.pfi = (this.pfi + 1) % this.puffs.length], lx = Math.cos(e.face), ly = Math.sin(e.face);
      P.x = e.x + lx * e.r * 0.5; P.y = e.y + e.r * 0.2 + ly * e.r * 0.1; P.vx = lx * 26 + e.vx * 0.3; P.vy = -16 + ly * 8 + e.vy * 0.2; P.t = 0; P.life = rnd(0.8, 1.1);
    }
    splat(x, y, r) {
      if (this.splats.length > 28) this.splats.shift();
      this.splats.push({ x, y, r, t: 0, a: rnd(0, TAU) });
    }
    hitMan(m, b) {
      const ctx = this.ctx;
      m.st = 'down'; m.t = 0; b.from.hits++; b.from.cheer = 0.7; ctx.sfx('coin'); ctx.sfx('pop');
      Fx.burst(m.x, m.y - 30, '#ffffff', 18, 340); Fx.ring(m.x, m.y - 30, '#bfe0ff', 90); Fx.shake(3);
      Fx.pop(m.x, m.y - 96, '+1', PARTY_COLORS[b.from.p.col].d, 44);
      const dir = Math.sign(b.vx) || 1;
      this.deb.push({ k: 0, hat: m.hat, col: m.col, x: m.x, y: m.y, z: 84 * m.s, vx: dir * rnd(80, 160), vy: rnd(-40, 40), vz: rnd(380, 480), rot: 0, vr: dir * rnd(8, 12), t: 0 });
      for (let k = 0; k < 3; k++) this.deb.push({ k: 1, r: [20, 15, 10][k] * m.s, x: m.x, y: m.y, z: [16, 48, 72][k] * m.s, vx: rnd(-220, 220), vy: rnd(-90, 90), vz: rnd(150, 320), rot: 0, vr: rnd(-8, 8), t: 0 });
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      for (const L of this.layers) for (const f of L.f) { f.y += f.v * dt; f.x += (Math.sin(this.t * 0.8 + f.ph) * 14 + 8) * dt; if (f.y > H + 10) { f.y = -10; f.x = rnd(-60, W + 60); } }
      for (const p of this.prints) p.t += dt;
      for (const s of this.splats) s.t += dt;
      for (const w of this.walls) { w.shk = Math.max(0, w.shk - dt * 4); if (w.dmg > 0 && (w.heal -= dt) <= 0) { w.dmg--; w.heal = 4; } }
      for (const P of this.puffs) if (P.t < P.life) { P.t += dt; P.x += P.vx * dt; P.y += P.vy * dt; P.vx *= 0.97; }
      for (const e of this.es) {
        e.cd -= dt; e.inv -= dt; e.hurt -= dt; e.cheer -= dt; e.arm = Math.max(0, e.arm - dt); spring(e, dt);
        // the pompom lags behind on a little spring
        e.pvx += (-e.pox * 260 - e.pvx * 9 - e.vx * 0.9) * dt; e.pvy += (-e.poy * 260 - e.pvy * 9 - e.vy * 0.5) * dt;
        e.pox = clamp(e.pox + e.pvx * dt, -12, 12); e.poy = clamp(e.poy + e.pvy * dt, -8, 8);
        if ((e.breathT -= dt) <= 0) { e.breathT = e.cold > 0 || e.hurt > 0 ? 0.35 : hyp(e.vx, e.vy) > 150 ? rnd(0.6, 0.9) : rnd(1.1, 1.6); this.breath(e); }
        if (e.cold > 0) {
          e.cold -= dt; e.vx *= 0.85; e.vy *= 0.85;
          if (e.cold <= 0) { Fx.burst(e.x, e.y, '#bfe6ff', 12, 260); ctx.sfx('pop'); e.sq = -0.2; }
          continue;
        }
        const i = ctx.input(e.p), sp = kid ? 320 : 350;
        steer(e, i.x, i.y, sp * (e.wind > 0 ? 0.5 : 1), dt, 15);
        if (i.x || i.y) { e.want = Math.atan2(i.y, i.x); turn(e, e.want, dt, 22); }
        e.lean += (clamp(e.vx / 2600, -0.14, 0.14) - e.lean) * (1 - Math.exp(-dt * 12));
        e.x += e.vx * dt; e.y += e.vy * dt; this.pushOut(e);
        const s = hyp(e.vx, e.vy);
        if (s > 30) e.walk += dt * (6 + s / 40);
        if (s > 60 && (e.stepT -= dt * s / 200) <= 0) {   // footprints in the snow
          e.stepT = 0.16; e.side = -e.side;
          const P = this.prints[this.pi = (this.pi + 1) % PRINTS], a = Math.atan2(e.vy, e.vx);
          P.x = e.x - Math.sin(a) * 10 * e.side; P.y = e.y + e.r * 0.72 + Math.cos(a) * 5 * e.side; P.a = a; P.t = 0;
        }
        Fx.walk(e, dt, 'rgba(255,255,255,.95)');
        if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) this.throwBall(e); }
        else if (ctx.pressed(e.p, 0) && e.cd <= 0) { e.wind = 0.08; e.sq = 0.14; e.sqv = 0; if (i.x || i.y) e.face = e.want; }   // a tiny wind-up, then the throw (exactly where the stick points)
      }
      for (let a = 0; a < this.es.length; a++) for (let b = a + 1; b < this.es.length; b++) {
        const A = this.es[a], B = this.es[b], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
        if (d < m && d > 0) { const o = (m - d) / 2; A.x -= dx / d * o; A.y -= dy / d * o; B.x += dx / d * o; B.y += dy / d * o; }
      }
      // snowmen keep popping up, each one dressed a little differently
      this.manT -= dt;
      const want = this.es.length === 1 ? 3 : 2;
      let up = 0; for (const m of this.men) if (m.st === 'up') up++;
      if (this.manT <= 0 && up < want) {
        this.manT = rnd(1.5, 3);
        for (let k = 0; k < 20; k++) {
          const x = rnd(X0 + 80, X1 - 80), y = rnd(Y0 + 110, Y1 - 50);
          if (this.hitWall(x, y, 60) || this.es.some(e => hyp(e.x - x, e.y - y) < 160) || this.men.some(m => hyp(m.x - x, m.y - y) < 120)) continue;
          this.men.push({ x, y, st: 'up', t: 0, hat: rint(4), col: HATS[rint(HATS.length)], scarf: PARTY_COLORS[rint(6)].c, s: rnd(0.92, 1.12), arm: rnd(-0.3, 0.3), smile: rint(2), ph: rnd(0, TAU) });
          Fx.burst(x, y, '#ffffff', 8, 160); for (let j = 0; j < 4; j++) Fx.dust(x, y + 4, 'rgba(255,255,255,.95)', 16);
          break;
        }
      }
      for (const m of this.men) m.t += dt;
      this.men = this.men.filter(m => m.st === 'up' || m.t < 0.5);
      for (const d of this.deb) {
        d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.vz -= 1300 * dt; d.rot += d.vr * dt;
        if (d.z <= 0) { d.z = 0; d.vz *= -0.35; d.vx *= 0.6; d.vy *= 0.6; d.vr *= 0.5; if (d.k === 1 && !d.landed) { d.landed = true; this.splat(d.x, d.y + 22, d.r * 1.2); } }
      }
      this.deb = this.deb.filter(d => d.t < 1.1);
      for (const b of this.balls) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.spin += dt * 14;
        const p = 1 - b.life / b.L; b.z = 4 * 44 * p * (1 - p) - 26 * p * p;   // a little arc: up from the hand, down to the snow
        if (b.life <= 0 || b.x < X0 || b.x > X1 || b.y < Y0 || b.y > Y1) { b.dead = true; Fx.burst(b.x, b.y - b.z, '#ffffff', 6, 140); this.splat(b.x, b.y + 26, b.r * 1.3); continue; }
        const w = this.hitWall(b.x, b.y, b.r * 0.6);
        if (w) {
          b.dead = true; w.dmg = Math.min(w.cracks.length, w.dmg + 1); w.heal = 5; w.shk = 1;
          Fx.burst(b.x, b.y - b.z, '#ffffff', 10, 220); Fx.burst(b.x, b.y - b.z, '#d8e9f8', 5, 160); ctx.sfx('splat');
          continue;
        }
        for (const m of this.men) if (m.st === 'up' && hyp(m.x - b.x, m.y - 26 - b.y) < 40 * m.s + b.r) { b.dead = true; this.hitMan(m, b); break; }
        if (b.dead) continue;
        for (const e of this.es) {
          if (e === b.from || e.inv > 0 || (this.teams && e.p.team === b.from.p.team) || hyp(e.x - b.x, e.y - b.y) > e.r + b.r) continue;
          b.dead = true; b.from.hits++; b.from.cheer = 0.7; e.hurt = 0.6; e.inv = 1.0; e.sq = 0.28; e.sqv = 0;
          e.vx += b.vx * 0.35; e.vy += b.vy * 0.35;
          if (!kid) { e.cold = 0.8; e.wind = 0; ctx.sfx('stun'); ctx.hitstop(0.035); Fx.shake(5); } else { ctx.sfx('bonk', 0.4); Fx.shake(3); }
          ctx.buzz(e.p, kid ? 80 : 200); ctx.buzz(b.from.p, 40);
          Fx.burst(b.x, b.y, '#ffffff', 16, 300); Fx.ring(e.x, e.y, '#bfe0ff', 80, 0.35);
          Fx.pop(b.from.x, b.from.y - 76, '+1', PARTY_COLORS[b.from.p.col].d, 42);
          Fx.pop(e.x + 34, e.y - 52, kid ? '好冰！' : '凍住了！', '#2f8cff', 32);
          break;
        }
      }
      this.balls = this.balls.filter(b => !b.dead);
      if (this.t >= this.dur) this.over = true;
    }

    /* ---------------- drawing ---------------- */
    paintBg(g) {
      g.fillStyle = '#cfe6f7'; g.fillRect(0, 0, W, H);
      // a winter evening sky over the village (the aurora is drawn live on top of it)
      const sky = g.createLinearGradient(0, 0, 0, 140); sky.addColorStop(0, '#2c3a78'); sky.addColorStop(0.5, '#6f86c8'); sky.addColorStop(1, '#cfe2f6');
      g.fillStyle = sky; g.fillRect(0, 0, W, 140);
      g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 40; i++) { const x = (i * 211 + 37) % W, y = 4 + (i * 53) % 52, z = i % 5 ? 1.5 : 2.5; g.fillRect(x, y, z, z); }
      g.fillStyle = '#fdf6dc'; g.beginPath(); g.arc(1540, 30, 16, 0, TAU); g.fill(); g.fillStyle = '#2c3a78'; g.beginPath(); g.arc(1548, 25, 14, 0, TAU); g.fill();
      // far mountains, then snowy hills
      g.fillStyle = '#a9bde3'; g.beginPath(); g.moveTo(0, 120); for (let x = 0, k = 0; x <= W + 100; x += 100, k++) g.lineTo(x, 120 - 30 - ((k * 37) % 40)); g.lineTo(W, 140); g.lineTo(0, 140); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); for (let x = 0, k = 0; x <= W + 100; x += 100, k++) { const py = 120 - 30 - ((k * 37) % 40); g.moveTo(x - 14, py + 12); g.lineTo(x, py); g.lineTo(x + 14, py + 12); } g.fill();
      for (let x = -60; x < W + 120; x += 150) { g.fillStyle = '#e4f0fb'; g.beginPath(); g.ellipse(x, 150, 120, 52, 0, Math.PI, 0); g.fill(); }
      // log cabins at the edge of the village, windows lit, snow on the roofs
      for (const [x, y, w, k] of this.cabins) {
        const h = w * 0.55, rh = w * 0.42;
        g.fillStyle = 'rgba(80,110,160,.25)'; g.beginPath(); g.ellipse(x + w / 2, y + 4, w * 0.62, 8, 0, 0, TAU); g.fill();
        g.fillStyle = '#9a5a32'; g.fillRect(x, y - h, w, h);
        g.strokeStyle = '#7a4222'; g.lineWidth = 2; g.beginPath(); for (let ly = y - h + 8; ly < y; ly += 8) { g.moveTo(x, ly); g.lineTo(x + w, ly); } g.stroke();
        g.fillStyle = '#b06a3a'; for (let ly = y - h + 4; ly < y; ly += 8) { g.beginPath(); g.arc(x, ly, 3.5, 0, TAU); g.arc(x + w, ly, 3.5, 0, TAU); g.fill(); }
        const cx = x + (k ? w * 0.72 : w * 0.26);
        g.fillStyle = '#7a6a6a'; g.fillRect(cx - 7, y - h - rh - 6, 14, rh);
        g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(cx - 9, y - h - rh - 10, 18, 7, 3); g.fill();
        g.fillStyle = '#5b3a2a'; g.beginPath(); g.moveTo(x - 10, y - h + 2); g.lineTo(x + w / 2, y - h - rh); g.lineTo(x + w + 10, y - h + 2); g.closePath(); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - 13, y - h - 3); g.lineTo(x + w / 2, y - h - rh - 4); g.lineTo(x + w + 13, y - h - 3);
        for (let j = 0; j < 6; j++) { const x2 = x + w + 13 - (j + 1) * (w + 26) / 6; g.quadraticCurveTo(x2 + (w + 26) / 12, y - h + 4, x2, y - h - 3); }
        g.closePath(); g.fill();
        g.fillStyle = '#e4f3ff'; for (let j = 0; j < 5; j++) { const ix = x + 6 + j * (w - 12) / 4; g.beginPath(); g.moveTo(ix - 3, y - h + 2); g.lineTo(ix + 3, y - h + 2); g.lineTo(ix, y - h + 10 + (j % 2) * 5); g.fill(); }
        const wx = x + (k ? w * 0.18 : w * 0.56), wy = y - h * 0.72, ww = w * 0.26, wh = h * 0.42;
        g.fillStyle = 'rgba(255,214,107,.35)'; g.beginPath(); g.ellipse(wx + ww / 2, wy + wh / 2, ww, wh, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffd66b'; g.fillRect(wx, wy, ww, wh); g.fillStyle = '#ffb347'; g.fillRect(wx, wy + wh * 0.6, ww, wh * 0.4);
        g.strokeStyle = '#5b3a2a'; g.lineWidth = 3; g.strokeRect(wx, wy, ww, wh); g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
        g.fillStyle = '#ffffff'; g.fillRect(wx - 3, wy + wh, ww + 6, 4);
        const dx = x + (k ? w * 0.6 : w * 0.12), dw = w * 0.22;
        g.fillStyle = '#6a3a1e'; g.beginPath(); g.roundRect(dx, y - h * 0.62, dw, h * 0.62, [6, 6, 0, 0]); g.fill();
        g.fillStyle = '#ffd66b'; g.beginPath(); g.arc(dx + dw * 0.78, y - h * 0.3, 2, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x + w / 2, y + 2, w * 0.6, 7, 0, Math.PI, 0); g.fill();
      }
      g.save(); g.beginPath(); g.roundRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20, 36); g.clip();
      g.fillStyle = '#f4f9ff'; g.fillRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20);
      if (this.teams) {   // each team's half tinted with its colour
        g.fillStyle = TEAMS[0].c; g.globalAlpha = 0.09; g.fillRect(X0 - 10, Y0 - 10, 800 - X0 + 10, Y1 - Y0 + 20);
        g.fillStyle = TEAMS[1].c; g.fillRect(800, Y0 - 10, X1 - 790, Y1 - Y0 + 20); g.globalAlpha = 1;
      }
      for (const d of this.drifts) {
        g.fillStyle = 'rgba(160,195,230,.16)'; g.beginPath(); g.ellipse(d.x, d.y + 4, d.rx, d.ry, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(d.x - 8, d.y - 1, d.rx * 0.8, d.ry * 0.6, 0, 0, TAU); g.fill();
      }
      g.fillStyle = '#bcd8f2'; for (let i = 0; i < this.sparks.length; i += 2) g.fillRect(this.sparks[i], this.sparks[i + 1], 3, 3);
      g.fillStyle = '#ffffff'; for (let i = 0; i < this.sparks.length; i += 6) { const x = this.sparks[i] + 30, y = this.sparks[i + 1] + 20; g.fillRect(x - 5, y - 1, 10, 2); g.fillRect(x - 1, y - 5, 2, 10); }
      // the frozen pond: a snowy bank, blue ice with shine and the penguin's skate marks
      const P = this.pond;
      g.fillStyle = 'rgba(120,160,210,.3)'; g.beginPath(); g.ellipse(P.x, P.y + 8, P.rx + 22, P.ry + 16, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(P.x, P.y, P.rx + 18, P.ry + 13, 0, 0, TAU); g.fill();
      const ice = g.createLinearGradient(P.x - P.rx, P.y - P.ry, P.x + P.rx, P.y + P.ry); ice.addColorStop(0, '#d8f1ff'); ice.addColorStop(0.5, '#a9dcf5'); ice.addColorStop(1, '#8cc8ea');
      g.fillStyle = ice; g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.fill();
      g.strokeStyle = '#7fb8de'; g.lineWidth = 3; g.stroke();
      g.save(); g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.clip();
      g.fillStyle = 'rgba(255,255,255,.55)'; for (const [ox, w] of [[-90, 26], [-50, 10], [40, 18], [80, 8]]) { g.beginPath(); g.moveTo(P.x + ox, P.y - P.ry); g.lineTo(P.x + ox + w, P.y - P.ry); g.lineTo(P.x + ox + w - 70, P.y + P.ry); g.lineTo(P.x + ox - 70, P.y + P.ry); g.closePath(); g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5; g.beginPath();
      for (let k = 0; k <= 64; k++) { const a = k / 64 * TAU, x = P.x + 105 * Math.sin(a), y = P.y + 36 * Math.sin(2 * a) + 14; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
      g.strokeStyle = 'rgba(90,150,200,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(P.x + 60, P.y - 30); g.lineTo(P.x + 40, P.y - 10); g.lineTo(P.x + 52, P.y + 6); g.moveTo(P.x + 40, P.y - 10); g.lineTo(P.x + 18, P.y - 6); g.stroke();
      g.restore();
      g.fillStyle = '#ffffff'; for (let k = 0; k < 14; k++) { const a = k * TAU / 14 + 0.2; g.beginPath(); g.ellipse(P.x + Math.cos(a) * (P.rx + 12), P.y + Math.sin(a) * (P.ry + 10), 22, 9, Math.atan2(Math.cos(a) * P.ry, -Math.sin(a) * P.rx), 0, TAU); g.fill(); }
      if (this.teams) {
        g.strokeStyle = 'rgba(120,150,190,.45)'; g.lineWidth = 5; g.setLineDash(DASH); g.beginPath(); g.moveTo(800, Y0); g.lineTo(800, Y1); g.stroke(); g.setLineDash(NODASH);
        g.font = '64px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = 0.35;
        g.fillText(TEAMS[0].icon, X0 + 70, Y1 - 60); g.fillText(TEAMS[1].icon, X1 - 70, Y1 - 60); g.globalAlpha = 1;
      }
      g.restore();
      g.strokeStyle = '#d3e5f5'; g.lineWidth = 6; g.beginPath(); g.roundRect(X0 - 10, Y0 - 10, X1 - X0 + 20, Y1 - Y0 + 20, 36); g.stroke();
      // pine trees round the edge
      for (const [x, y, s] of [[22, 220, 1], [12, 520, 1.2], [30, 800, 0.9], [1580, 260, 1.1], [1590, 560, 0.9], [1575, 820, 1.2], [-10, 380, 0.8], [1610, 420, 0.8]]) {
        g.fillStyle = 'rgba(80,120,170,.2)'; g.beginPath(); g.ellipse(x + 6, y + 50 * s, 40 * s, 12 * s, 0, 0, TAU); g.fill();
        g.fillStyle = '#7a4a22'; g.fillRect(x - 8 * s, y + 20 * s, 16 * s, 30 * s);
        for (let k = 0; k < 3; k++) {
          g.fillStyle = k % 2 ? '#2f8a5a' : '#3a9f69'; g.beginPath(); g.moveTo(x, y - 70 * s + k * 26 * s); g.lineTo(x + (40 + k * 10) * s, y + k * 24 * s); g.lineTo(x - (40 + k * 10) * s, y + k * 24 * s); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - (32 + k * 10) * s, y + k * 24 * s - 4 * s); g.quadraticCurveTo(x, y + k * 24 * s - 16 * s, x + (32 + k * 10) * s, y + k * 24 * s - 4 * s); g.lineTo(x + (40 + k * 10) * s, y + k * 24 * s); g.lineTo(x - (40 + k * 10) * s, y + k * 24 * s); g.fill();
        }
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - 70 * s); g.lineTo(x + 16 * s, y - 46 * s); g.lineTo(x - 16 * s, y - 46 * s); g.fill();
      }
    }
    flakes(g, L) {
      g.globalAlpha = L.a; g.fillStyle = '#ffffff'; g.beginPath();
      for (const f of L.f) { g.moveTo(f.x + f.s, f.y); g.arc(f.x, f.y, f.s, 0, TAU); }
      g.fill(); g.globalAlpha = 1;
    }
    drawWall(g, w, t) {
      const sx = w.shk > 0 ? Math.sin(t * 70) * 3 * w.shk : 0, x = w.x + sx, y = w.y, top = y - WALL_H;
      g.fillStyle = 'rgba(80,120,170,.22)'; g.beginPath(); g.roundRect(w.x + 8, y + 10, w.w, w.h, 14); g.fill();
      // front face (the part facing us) then the top
      g.fillStyle = '#dbe9f7'; g.beginPath(); g.roundRect(x, y + w.h - WALL_H - 4, w.w, WALL_H + 4, [0, 0, 14, 14]); g.fill();
      g.strokeStyle = '#b7d3ee'; g.lineWidth = 2;
      g.beginPath(); for (let bx = x + 26, row = 0; bx < x + w.w - 6; bx += 34, row++) { g.moveTo(bx, y + w.h - WALL_H); g.lineTo(bx, y + w.h - 2); } g.stroke();
      g.fillStyle = '#ffffff'; g.strokeStyle = '#b7d3ee'; g.lineWidth = 3; g.beginPath(); g.roundRect(x, top, w.w, w.h, 14); g.fill(); g.stroke();
      g.strokeStyle = '#d5e6f6'; g.lineWidth = 2; g.beginPath();
      if (w.w > w.h) for (let bx = x + 30; bx < x + w.w; bx += 30) { g.moveTo(bx, top + 4); g.lineTo(bx, top + w.h - 4); }
      else for (let by = top + 20; by < top + w.h; by += 30) { g.moveTo(x + 4, by); g.lineTo(x + w.w - 4, by); }
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(x + w.w * 0.3, top + 8, Math.min(30, w.w * 0.25), 5, 0, 0, TAU); g.fill();
      if (w.dmg > 0) {   // cracks
        g.strokeStyle = '#6f9cc8'; g.lineWidth = 2.5; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
        for (let c = 0; c < w.dmg; c++) { const p = w.cracks[c]; g.moveTo(p[0] + sx, p[1]); for (let j = 2; j < p.length; j += 2) g.lineTo(p[j] + sx, p[j + 1]); }
        g.stroke();
        if (w.dmg >= 3) { g.fillStyle = '#c9def2'; for (let c = 0; c < w.dmg - 2; c++) { const p = w.cracks[c]; g.beginPath(); g.arc(p[0] + sx, p[1], 5, 0, TAU); g.fill(); } }
      }
    }
    drawMan(g, m, t) {
      let kx = 1, ky = 1, a = 1;
      if (m.st === 'up') { const u = Math.min(1, m.t / 0.35), v = u - 1; ky = u < 1 ? Math.max(0.05, 1 + 2.7 * v * v * v + 1.7 * v * v) : 1 + Math.sin(m.t * 3 + m.ph) * 0.015; kx = clamp(1 / Math.sqrt(ky), 0.85, 1.25); }
      else { const u = m.t / 0.5; ky = Math.max(0.05, 0.4 * (1 - u)); kx = 1 + u * 0.6; a = 1 - u; }
      g.save(); g.translate(m.x, m.y); g.globalAlpha = a;
      g.fillStyle = 'rgba(80,120,170,.25)'; g.beginPath(); g.ellipse(0, 6, 34 * m.s, 10, 0, 0, TAU); g.fill();
      g.scale(kx * m.s, ky * m.s); g.rotate(Math.sin(t * 2 + m.ph) * 0.04);
      // stick arms
      g.strokeStyle = '#7a4a22'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath();
      g.moveTo(-22, -26); g.lineTo(-46, -46 + m.arm * 20); g.moveTo(-38, -40 + m.arm * 16); g.lineTo(-44, -54 + m.arm * 16);
      g.moveTo(22, -26); g.lineTo(46, -40 - m.arm * 20 + Math.sin(t * 5 + m.ph) * 4); g.stroke();
      g.fillStyle = '#fff'; g.strokeStyle = '#b7d3ee'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, -16, 28, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, -54, 20, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(170,200,230,.35)'; g.beginPath(); g.arc(6, -10, 22, 0.2, 1.8); g.fill();
      g.fillStyle = '#2b2340'; for (const by of [-24, -12, 0]) { g.beginPath(); g.arc(0, by, 3, 0, TAU); g.fill(); }
      g.beginPath(); g.arc(-7, -58, 3, 0, TAU); g.arc(7, -58, 3, 0, TAU); g.fill();
      if (m.smile) { g.strokeStyle = '#2b2340'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, -48, 7, 0.3, Math.PI - 0.3); g.stroke(); }
      else { for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(k * 4, -45 + Math.abs(k) * -1.5, 1.6, 0, TAU); g.fill(); } }
      g.fillStyle = '#ff8a1f'; g.beginPath(); g.moveTo(0, -54); g.lineTo(17, -51); g.lineTo(0, -48); g.fill();
      g.fillStyle = 'rgba(255,110,150,.4)'; g.beginPath(); g.arc(-12, -50, 4, 0, TAU); g.arc(12, -50, 4, 0, TAU); g.fill();
      // scarf
      g.fillStyle = m.scarf; g.beginPath(); g.roundRect(-20, -40, 40, 9, 4); g.fill();
      g.beginPath(); g.roundRect(8, -36, 9, 22 + Math.sin(t * 4 + m.ph) * 2, 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(-12, -40, 4, 9); g.fillRect(0, -40, 4, 9);
      drawHat(g, m.hat, m.col, 0, m.hat === 3 ? -74 : -70);
      g.restore(); g.globalAlpha = 1;
    }
    drawPlayer(g, e, t, at) {
      const C = PARTY_COLORS[e.p.col], s = hyp(e.vx, e.vy), m = Math.min(1, s / 220), bob = Math.abs(Math.sin(e.walk)), hop = e.cold > 0 ? 0 : bob * 7 * m, moving = s > 30 && e.cold <= 0;
      const sq = e.sq + (0.5 - bob) * 0.08 * m, shiver = e.cold > 0 ? Math.sin(t * 55) * 2.5 : e.hurt > 0 ? Math.sin(t * 60) * 3 * Math.min(1, e.hurt * 2) : 0;
      const x = e.x + shiver, cy = e.y - hop;
      // the throwing hand: wound back, swings through, rests behind holding the next snowball
      const ha = e.wind > 0 ? e.face + 2.2 + (1 - e.wind / 0.08) * 0.6 : e.arm > 0 ? e.aim - 0.4 + (e.arm / 0.22) * 3.2 : e.face + 2.2;
      const hx = x + Math.cos(ha) * (e.r + 4), hy = cy + Math.sin(ha) * (e.r + 4) * 0.7 + 4, behind = Math.sin(ha) < -0.2;
      const hand = () => {
        if (e.cold > 0) return;
        if (e.cd <= 0 || e.wind > 0) { g.fillStyle = '#fff'; g.strokeStyle = '#9fc3e6'; g.lineWidth = 2; g.beginPath(); g.arc(hx + Math.cos(ha) * 6, hy + Math.sin(ha) * 4 - 4, this.kid ? 10 : 8, 0, TAU); g.fill(); g.stroke(); }
        mitten(g, hx, hy, ha, e.knit);
      };
      if (e.arm > 0.08) {   // swoosh arc of the throw
        g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(x, cy, e.r + 14, e.aim - 0.4 + (e.arm / 0.22) * 1.5, e.aim + 1.2 + (e.arm / 0.22) * 1.5); g.stroke();
      }
      if (behind) hand();
      const rot = e.cold > 0 ? 0 : e.lean, frog = PARTY_ANIMALS[e.p.animal].id === 'frog', al = e.inv > 0 && e.cold <= 0 && (t * 10 | 0) % 2 ? 0.65 : 1;
      if (al < 1) g.globalAlpha = al;
      bodyOn(g, x, e.y, e.r, hop, moving, e.walk, rot, sq); scarf(g, e.r, e.knit, e.face, e.vx, e.vy, at, false); g.restore();
      g.globalAlpha = 1;
      drawCritter(g, x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: sq, hop, rot, step: e.walk, moving, stun: e.cold > 0, alpha: al, blink: (t + e.p.uid * 1.3) % 3.6 < 0.12, happy: e.cheer > 0 && e.cold <= 0 });
      if (al < 1) g.globalAlpha = al;
      bodyOn(g, x, e.y, e.r, hop, moving, e.walk, rot, sq);
      scarf(g, e.r, e.knit, e.face, e.vx, e.vy, at, true);
      beanie(g, e.r, e.knit, e.pox, e.poy, frog);
      g.restore(); g.globalAlpha = 1;
      if (!behind) hand();
      if (e.hurt > 0 && e.cold <= 0) {
        const k = Math.min(1, e.hurt * 2); g.globalAlpha = k * 0.4; g.fillStyle = '#9fd4ff'; g.beginPath(); g.arc(x, cy, e.r, 0, TAU); g.fill();
        g.globalAlpha = k; g.strokeStyle = '#6fb6ec'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();   // brrr: shiver lines
        for (const sd of [-1, 1]) for (let j = 0; j < 2; j++) { const bx = x + sd * (e.r + 10 + j * 8), by = cy - 8 + j * 12; g.moveTo(bx, by - 7); g.lineTo(bx + sd * 3, by - 2); g.lineTo(bx, by + 3); g.lineTo(bx + sd * 3, by + 8); }
        g.stroke(); g.globalAlpha = 1;
      }
      if (e.cold > 0) {   // an ice block, melting at the end
        const k = Math.min(1, e.cold / 0.15), w = (e.r + 14) * 2, h = (e.r + 16) * 2, bx = x - w / 2, by = e.y - e.r - 20;
        g.globalAlpha = 0.85 * k;
        g.fillStyle = 'rgba(120,195,250,.5)'; g.beginPath(); g.roundRect(bx, by, w, h, 12); g.fill();
        g.strokeStyle = '#6fb6ec'; g.lineWidth = 4; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2; g.beginPath(); g.roundRect(bx + 4, by + 4, w - 8, h - 8, 9); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(bx + 8, by + 10); g.lineTo(bx + 22, by + 10); g.lineTo(bx + 8, by + 34); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(bx + w - 10, by + h - 34); g.lineTo(bx + w - 10, by + h - 12); g.lineTo(bx + w - 22, by + h - 12); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(120,180,230,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx + w * 0.6, by); g.lineTo(bx + w * 0.5, by + 18); g.lineTo(bx + w * 0.64, by + 30); g.stroke();
        g.fillStyle = '#e8f6ff'; for (let j = 0; j < 3; j++) { g.beginPath(); g.moveTo(bx + 14 + j * 22, by + h); g.lineTo(bx + 20 + j * 22, by + h + 8); g.lineTo(bx + 26 + j * 22, by + h); g.fill(); }
        g.globalAlpha = 1;
        g.font = '24px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🥶', x + e.r + 6, by - 4 + Math.sin(t * 8) * 2);
      } else if (e.cd <= 0 && s < 30) {
        // little dots showing where the next snowball goes
        g.fillStyle = C.c;
        for (let k = 1; k <= 3; k++) { g.globalAlpha = 0.75 - k * 0.15; g.beginPath(); g.arc(e.x + Math.cos(e.face) * (e.r + 14 + k * 16), e.y + Math.sin(e.face) * (e.r + 14 + k * 16) - Math.sin(k / 4 * Math.PI) * 10, 5 - k * 0.6, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      if (e.cold <= 0) {
        g.fillStyle = C.c; g.save(); g.translate(e.x + Math.cos(e.face) * (e.r + 16), e.y + Math.sin(e.face) * (e.r + 16)); g.rotate(e.face);
        g.beginPath(); g.moveTo(11, 0); g.lineTo(-6, -8); g.lineTo(-6, 8); g.closePath(); g.fill(); g.restore();
      }
      drawTag(g, e.x, e.y - e.r - 40, e.p);
    }
    drawBall(g, b) {
      const y = b.y - b.z, tx = b.vx * 0.018, ty = b.vy * 0.018;
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(b.x - tx * 2, y - ty * 2, b.r * 0.7, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(b.x - tx, y - ty, b.r * 0.85, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.strokeStyle = '#9fc3e6'; g.lineWidth = 2; g.beginPath(); g.arc(b.x, y, b.r, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(150,190,230,.85)'; g.lineWidth = 2.5; g.beginPath(); g.arc(b.x, y, b.r * 0.6, b.spin, b.spin + 1.6); g.stroke();
      g.beginPath(); g.arc(b.x, y, b.r * 0.35, b.spin + Math.PI, b.spin + Math.PI + 1.4); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(b.x - b.r * 0.35, y - b.r * 0.35, b.r * 0.22, 0, TAU); g.fill();
    }
    drawDeb(g, d) {
      const a = d.t > 0.7 ? 1 - (d.t - 0.7) / 0.4 : 1; g.globalAlpha = Math.max(0, a);
      if (d.k === 1) {
        g.fillStyle = 'rgba(80,120,170,.2)'; g.beginPath(); g.ellipse(d.x, d.y + 22, d.r, d.r * 0.35, 0, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.strokeStyle = '#b7d3ee'; g.lineWidth = 2; g.beginPath(); g.arc(d.x, d.y - d.z, d.r, 0, TAU); g.fill(); g.stroke();
      } else { g.save(); g.translate(d.x, d.y - d.z); g.rotate(d.rot); drawHat(g, d.hat, d.col, 0, 10); g.restore(); }
      g.globalAlpha = 1;
    }
    add(y, k, o) { let it = this.dl[this.dn]; if (!it) it = this.dl[this.dn] = { y: 0, k: 0, o: null }; it.y = y; it.k = k; it.o = o; this.dn++; }
    /* the live bits of the sky and village: a shimmering aurora, chimney smoke */
    drawSky(g, at) {
      if (!this.auCv) {   // painted once at low resolution (soft for free), tiles left to right
        const c = this.auCv = document.createElement('canvas'); c.width = 400; c.height = 40; const cg = c.getContext('2d');
        for (let x = 0; x < 400; x += 2) {
          const u = x / 400 * TAU, top = 6 + Math.sin(u * 2) * 5 + Math.sin(u * 5 + 1) * 3, h = 16 + Math.sin(u * 3 + 2) * 8 + Math.sin(u * 7) * 3;
          const gr = cg.createLinearGradient(0, top, 0, top + h); gr.addColorStop(0, 'rgba(120,255,200,0)'); gr.addColorStop(0.35, 'rgba(120,255,200,.9)'); gr.addColorStop(0.75, 'rgba(110,200,255,.45)'); gr.addColorStop(1, 'rgba(160,120,255,0)');
          cg.fillStyle = gr; cg.fillRect(x, top, 2, h);
        }
      }
      const off = (at * 10) % W;
      g.globalAlpha = 0.42 + 0.14 * Math.sin(at * 0.7); g.drawImage(this.auCv, -off, 0, W, 72); g.drawImage(this.auCv, W - off, 0, W, 72);
      const off2 = (at * 6 + 500) % W;
      g.globalAlpha = 0.22 + 0.1 * Math.sin(at * 1.1 + 1); g.drawImage(this.auCv, off2 - W, 8, W, 56); g.drawImage(this.auCv, off2, 8, W, 56);
      g.fillStyle = '#eef2fa';
      for (let i = 0; i < this.chims.length; i++) {
        const c = this.chims[i];
        for (let k = 0; k < 5; k++) {
          const ph = (at * 0.32 + k / 5 + i * 0.13) % 1;
          g.globalAlpha = 0.6 * (1 - ph) * Math.min(1, ph * 6);
          g.beginPath(); g.arc(c.x + Math.sin(at * 0.9 + k * 2 + i) * 5 + ph * 26, c.y - ph * 80, 5 + ph * 13, 0, TAU); g.fill();
        }
      }
      g.globalAlpha = 1;
      // now and then a pine tree lets go of a clump of snow
      for (const c of this.clumps) {
        const tau = (at + c.off) % c.per; if (tau > 1) continue;
        g.fillStyle = '#ffffff';
        if (tau < 0.42) { const y = c.y + 0.5 * 1100 * tau * tau; g.beginPath(); g.arc(c.x, Math.min(y, c.g), 7 * c.s, 0, TAU); g.arc(c.x + 5, Math.min(y, c.g) - 4, 5 * c.s, 0, TAU); g.fill(); }
        else { const k = (tau - 0.42) / 0.58; g.globalAlpha = 1 - k; for (let j = -2; j <= 2; j++) { g.beginPath(); g.arc(c.x + j * 8 * (0.5 + k), c.g - Math.abs(j) * 2 - k * 10 * (1 - Math.abs(j) / 3), 4 * c.s, 0, TAU); g.fill(); } g.globalAlpha = 1; }
      }
    }
    /* a penguin skating figure-eights on the frozen pond */
    drawPenguin(g, at) {
      const P = this.pond, a = at * 0.85, x = P.x + 105 * Math.sin(a), y = P.y + 36 * Math.sin(2 * a), dx = Math.cos(a), dy = Math.cos(2 * a) * 0.69;
      const dir = dx >= 0 ? 1 : -1, lean = clamp(-dy * 0.35 * dir, -0.3, 0.3) + Math.sin(a * 4) * 0.05, glide = Math.sin(at * 6) * 1.5;
      g.fillStyle = 'rgba(70,120,170,.28)'; g.beginPath(); g.ellipse(x, y + 2, 22, 6, 0, 0, TAU); g.fill();
      g.save(); g.translate(x, y - glide * 0.3); g.rotate(lean); g.scale(dir * 1.35, 1.35);
      g.strokeStyle = '#9aa6b8'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-9, 1); g.lineTo(9, 1); g.stroke();   // skate blades
      g.fillStyle = '#ff9a2a'; g.beginPath(); g.ellipse(-4, -2, 5, 2.5, 0, 0, TAU); g.ellipse(5, -2, 5, 2.5, 0, 0, TAU); g.fill();
      g.fillStyle = '#2b2f45'; g.beginPath(); g.ellipse(0, -20, 13, 19, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(3, -17, 8, 14, 0, 0, TAU); g.fill();
      g.fillStyle = '#2b2f45'; g.beginPath(); g.ellipse(-12, -20 + glide, 4, 11, 0.9, 0, TAU); g.fill(); g.beginPath(); g.ellipse(10, -22 - glide, 4, 10, -0.9, 0, TAU); g.fill();   // flippers out for balance
      g.fillStyle = '#ff4f58'; g.beginPath(); g.roundRect(-11, -30, 22, 5, 2); g.fill(); g.fillRect(-9, -28, 5, 11);   // a little red scarf
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(5, -34, 3.2, 0, TAU); g.fill(); g.fillStyle = '#2b2340'; g.beginPath(); g.arc(6, -34, 1.7, 0, TAU); g.fill();
      g.fillStyle = '#ff9a2a'; g.beginPath(); g.moveTo(9, -32); g.lineTo(16, -30); g.lineTo(9, -28); g.fill();
      g.fillStyle = 'rgba(255,120,150,.5)'; g.beginPath(); g.arc(4, -28, 2.5, 0, TAU); g.fill();
      g.restore();
    }
    drawPuffs(g) {
      g.fillStyle = '#ffffff';
      for (const P of this.puffs) { if (P.t >= P.life) continue; const k = P.t / P.life; g.globalAlpha = 0.6 * (1 - k); g.beginPath(); g.arc(P.x, P.y, 4 + k * 11, 0, TAU); g.arc(P.x + 5 + k * 6, P.y - 2, 3 + k * 8, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    draw(g, clock) {
      const t = this.t, at = clock || t;
      bgLayer(this, g, cg => this.paintBg(cg));
      this.drawSky(g, at);
      // footprints and splats pressed into the snow
      g.fillStyle = '#a9c6e4';
      for (const p of this.prints) { if (p.t > 5) continue; g.globalAlpha = 0.5 * (1 - p.t / 5); g.beginPath(); g.ellipse(p.x, p.y, 7, 4.5, p.a, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      for (const s of this.splats) {
        const a = s.t < 2.5 ? 1 : Math.max(0, 1 - (s.t - 2.5) / 1.5); if (a <= 0) continue; g.globalAlpha = a;
        g.fillStyle = '#c8dcf0'; g.beginPath(); g.ellipse(s.x, s.y + 2, s.r * 1.25, s.r * 0.5, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(s.x, s.y, s.r, s.r * 0.4, 0, 0, TAU); g.fill();
        for (let k = 0; k < 4; k++) { const aa = s.a + k * 1.6; g.beginPath(); g.arc(s.x + Math.cos(aa) * s.r * 1.4, s.y + Math.sin(aa) * s.r * 0.6, s.r * 0.22, 0, TAU); g.fill(); }
      }
      g.globalAlpha = 1;
      Fx.ground(g);
      this.flakes(g, this.layers[0]);
      // snowball shadows sit on the snow, under everyone
      g.fillStyle = 'rgba(80,120,170,.25)';
      for (const b of this.balls) { const k = clamp(1 - (b.z + 26) / 130, 0.4, 1); g.beginPath(); g.ellipse(b.x, b.y + 26, b.r * k, b.r * 0.38 * k, 0, 0, TAU); g.fill(); }
      this.dn = 0;
      for (const w of this.walls) this.add(w.y + w.h, 0, w);
      for (const m of this.men) this.add(m.y, 1, m);
      for (const e of this.es) this.add(e.y, 2, e);
      this.add(this.pond.y + 36 * Math.sin(2 * at * 0.85), 3, null);
      const L = this.dl;
      for (let i = 1; i < this.dn; i++) { const it = L[i]; let j = i - 1; while (j >= 0 && L[j].y > it.y) { L[j + 1] = L[j]; j--; } L[j + 1] = it; }
      for (let i = 0; i < this.dn; i++) { const it = L[i]; if (it.k === 0) this.drawWall(g, it.o, t); else if (it.k === 1) this.drawMan(g, it.o, t); else if (it.k === 2) this.drawPlayer(g, it.o, t, at); else this.drawPenguin(g, at); }
      this.drawPuffs(g);
      for (const d of this.deb) this.drawDeb(g, d);
      for (const b of this.balls) this.drawBall(g, b);
      this.flakes(g, this.layers[1]); this.flakes(g, this.layers[2]);
    }
    chip(p) { return '❄ ' + this.by.get(p).hits; }
    pad(p) { const e = this.by.get(p); return '打中 ' + e.hits + ' 次' + (e.cold > 0 ? '　凍住了！' : ''); }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && e.cold <= 0; }
    teamScore(t) { return this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.hits, 0); }
    results() { return { teamScores: this.teams ? [this.teamScore(0), this.teamScore(1)] : null, rows: this.es.slice().sort((a, b) => b.hits - a.hits).map(e => ({ p: e.p, key: e.hits, line: `打中 ${e.hits} 次` })) }; }
  }
  GAMES.push({
    id: 'snow', name: '雪球大戰', icon: '⛄', col: '#2f8cff', bg: '#cfe6f7', kind: 'vs', teams: true, players: '1–6 人',
    blurb: '丟雪球打中別人和雪人，打中最多的人贏！',
    btn: { label: '丟雪球', icon: '❄️' },
    rules: kid => kid
      ? ['搖桿走路，箭頭指的方向就是雪球飛去的方向', '按「丟雪球」，打中別人或雪人都得 1 分', '雪球會自己稍微轉向最近的目標', '60 秒後，打中最多的人贏']
      : ['搖桿走路和瞄準，按「丟雪球」往前丟', '打中人或雪人得 1 分，被打中會凍成冰塊一下下', '雪牆可以躲，也會擋住雪球', '60 秒後，打中最多的人贏'],
    thumb(g) {
      g.fillStyle = '#f4f9ff'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#fff'; g.strokeStyle = '#b7d3ee'; g.lineWidth = 3; g.beginPath(); g.roundRect(140, 50, 30, 90, 10); g.fill(); g.stroke();
      drawCritter(g, 80, 100, 24, 1, 2, { face: 0 }); drawCritter(g, 240, 95, 24, 0, 1, { face: Math.PI, stun: true });
      g.fillStyle = 'rgba(170,220,255,.55)'; g.strokeStyle = '#fff'; g.beginPath(); g.roundRect(208, 62, 64, 66, 10); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.strokeStyle = '#9fc3e6'; g.beginPath(); g.arc(205, 70, 9, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.arc(115, 80, 9, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(285, 150, 14, 0, TAU); g.arc(285, 128, 10, 0, TAU); g.fill();
      drawHat(g, 1, '#ff4f58', 285, 120);
    },
    create: ctx => new Snow(ctx)
  });
})();
