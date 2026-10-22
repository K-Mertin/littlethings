'use strict';
/* 搶果果 — the orchard trees fling fruit onto the grass (watch the shadows); grab the most in 60 s.
   Every 15 s there is a 水果雨 (fruit shower) straight from the sky.
   小朋友: big pick-up reach, no bombs, no stealing.
   大人: dash into someone to knock 2 fruit out of their basket, and bombs fall too. */
(() => {
  const X0 = 100, Y0 = 172, X1 = 1500, Y1 = 852;
  const KINDS = { apple: { pts: 1 }, orange: { pts: 1 }, grape: { pts: 1 }, star: { pts: 3 } };
  const GRAV = 1600, BAG_MAX = 10, BOMB_R = 125;
  const FONT = '"Noto Sans TC",system-ui,sans-serif';
  // trees around the orchard: [x, y, size]; the side ones peek in from off screen
  const TREES = [[-4, 300, 1], [-14, 560, 1.12], [-2, 810, 0.95], [1604, 300, 1], [1614, 560, 1.12], [1602, 810, 0.95],
    [250, 132, 0.78], [560, 120, 0.72], [1040, 120, 0.72], [1350, 132, 0.78], [420, 940, 0.85], [1180, 940, 0.85]];

  function drawFruit(g, kind, x, y, s) {
    s = s || 1;
    if (kind === 'apple') {
      g.fillStyle = '#ff4b4b'; g.beginPath(); g.arc(x - 6 * s, y, 13 * s, 0, TAU); g.arc(x + 6 * s, y, 13 * s, 0, TAU); g.fill();
      g.fillStyle = '#d9303a'; g.beginPath(); g.ellipse(x + 4 * s, y + 6 * s, 12 * s, 6 * s, 0, 0, Math.PI); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x - 9 * s, y - 5 * s, 4 * s, 6 * s, -0.5, 0, TAU); g.fill();
      g.strokeStyle = '#7a4a1e'; g.lineWidth = 3 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y - 10 * s); g.lineTo(x + 2 * s, y - 19 * s); g.stroke();
      g.fillStyle = '#3fbf4a'; g.beginPath(); g.ellipse(x + 8 * s, y - 17 * s, 7 * s, 3.5 * s, -0.5, 0, TAU); g.fill();
    } else if (kind === 'orange') {
      g.fillStyle = '#ff9a1f'; g.beginPath(); g.arc(x, y, 16 * s, 0, TAU); g.fill();
      g.fillStyle = '#e57a00'; g.beginPath(); g.arc(x, y, 16 * s, 0.2, Math.PI - 0.2); g.fill();
      g.fillStyle = '#ff9a1f'; g.beginPath(); g.ellipse(x - 1 * s, y - 1 * s, 15 * s, 13 * s, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x - 6 * s, y - 6 * s, 4 * s, 6 * s, -0.6, 0, TAU); g.fill();
      g.fillStyle = '#3fbf4a'; g.beginPath(); g.ellipse(x + 5 * s, y - 15 * s, 7 * s, 3.5 * s, 0.4, 0, TAU); g.fill();
    } else if (kind === 'grape') {
      for (const [dx, dy] of [[-8, -8], [0, -9], [8, -8], [-4, 0], [4, 0], [0, 8]]) {
        g.fillStyle = '#7a32d6'; g.beginPath(); g.arc(x + dx * s, y + dy * s, 7 * s, 0, TAU); g.fill();
        g.fillStyle = '#a565ff'; g.beginPath(); g.arc(x + (dx - 1) * s, y + (dy - 1) * s, 5.5 * s, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - 9 * s, y - 10 * s, 2.5 * s, 0, TAU); g.fill();
      g.fillStyle = '#3fbf4a'; g.beginPath(); g.ellipse(x + 4 * s, y - 17 * s, 7 * s, 3 * s, 0.3, 0, TAU); g.fill();
    } else if (kind === 'star') {
      g.save(); g.translate(x, y); g.fillStyle = '#ffd21f'; g.strokeStyle = '#d18a00'; g.lineWidth = 3 * s; g.lineJoin = 'round'; g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = (k % 2 ? 9 : 20) * s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(-5 * s, -5 * s, 3.5 * s, 0, TAU); g.fill();
      g.fillStyle = '#2b2340'; g.beginPath(); g.arc(-4 * s, 1 * s, 1.8 * s, 0, TAU); g.arc(4 * s, 1 * s, 1.8 * s, 0, TAU); g.fill();
      g.restore();
    }
  }
  /* fruit pictures are drawn once into little canvases, then stamped (cheap on a TV) */
  const SS = 1.6, SZ = 80, OX = 40, OY = 46, sprites = {};
  function sprite(kind) {
    if (sprites[kind]) return sprites[kind];
    const c = document.createElement('canvas'); c.width = SZ; c.height = SZ;
    drawFruit(c.getContext('2d'), kind, OX, OY, SS);
    return sprites[kind] = c;
  }
  function stamp(g, kind, x, y, s) { const k = s / SS; g.drawImage(sprite(kind), x - OX * k, y - OY * k, SZ * k, SZ * k); }
  let canopy = null;
  function canopySprite() {
    if (canopy) return canopy;
    const c = canopy = document.createElement('canvas'); c.width = 260; c.height = 260;
    const g = c.getContext('2d'), cx = 130, cy = 130;
    g.fillStyle = '#2f8a3f'; g.beginPath(); g.arc(cx, cy + 6, 104, 0, TAU); g.fill();
    g.fillStyle = '#3f9e4d';
    for (const [dx, dy, r] of [[0, 0, 96], [-50, -30, 56], [44, -40, 58], [-60, 30, 50], [58, 28, 52], [0, -62, 50], [0, 52, 50]]) { g.beginPath(); g.arc(cx + dx, cy + dy, r, 0, TAU); g.fill(); }
    g.fillStyle = '#4fb35a';
    for (const [dx, dy, r] of [[-30, -40, 46], [24, -56, 36], [-62, -4, 34], [10, -20, 40]]) { g.beginPath(); g.arc(cx + dx, cy + dy, r, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(cx - 34, cy - 52, 34, 18, -0.5, 0, TAU); g.fill();
    for (const [dx, dy, k] of [[-46, 10, 'apple'], [30, -10, 'orange'], [60, 50, 'apple'], [-20, 60, 'orange'], [6, -70, 'apple'], [-70, -40, 'apple'], [70, -30, 'orange'], [20, 40, 'apple']]) drawFruit(g, k, cx + dx, cy + dy, 0.7);
    return c;
  }
  /* a woven basket with the fruit you've caught piled on top */
  const PILE = [[-18, -2], [-6, -3], [6, -3], [18, -2], [-12, -13], [0, -14], [12, -13], [-6, -24], [6, -24], [0, -34]];
  function drawBasket(g, x, y, bag, sq, sc) {
    sc = sc || 1; g.save(); g.translate(x, y); g.scale(sc * (1 + (sq || 0)), sc * (1 - (sq || 0)));
    for (let k = 0; k < bag.length && k < PILE.length; k++) stamp(g, bag[k], PILE[k][0], PILE[k][1] - 4, 0.6);
    g.fillStyle = '#c8873e'; g.strokeStyle = '#7d4a1a'; g.lineWidth = 2.5; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.lineTo(20, 20); g.quadraticCurveTo(0, 24, -20, 20); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(125,74,26,.55)'; g.lineWidth = 2; g.beginPath();
    for (let k = -18; k <= 18; k += 9) { g.moveTo(k, 2); g.lineTo(k * 0.8, 20); }
    g.moveTo(-23, 10); g.lineTo(23, 10); g.stroke();
    g.fillStyle = '#e0a45c'; g.strokeStyle = '#7d4a1a'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(-28, -4, 56, 8, 4); g.fill(); g.stroke();
    g.restore();
  }
  const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * k; };

  class Fruit {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.dur = 60; this.over = false; this.teams = !!ctx.teams;
      this.edge = '#6dbd52';
      this.items = []; this.bombs = []; this.flyers = []; this.scorch = []; this.spawnAcc = 0; this.nextShower = 15; this.rain = 0; this.rainAcc = 0; this.sparkT = 0;
      this.trees = TREES.map(([x, y, s]) => ({ x, y, s, sh: 0, ph: rnd(0, TAU) }));
      const n = ctx.players.length;
      this.es = ctx.players.map((p, i) => ({ p, x: X0 + (X1 - X0) * (i + 1) / (n + 1), y: (Y0 + Y1) / 2 + (i % 2 ? 80 : -80), vx: 0, vy: 0, face: Math.PI / 2, r: 34,
        cd: 0, dash: 0, stun: 0, inv: 0, score: 0, walk: 0, squash: 0, moving: false, happy: 0, bag: [], bsq: 0, trail: [] }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.order = this.es.slice();
      this.lead = null;
      this.makeBg();
      for (let i = 0; i < 4 + n; i++) this.dropGround();
    }
    makeBg() {
      const c = this.bg = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = this.edge; g.fillRect(0, 0, W, H);
      // darker grass texture all over
      g.strokeStyle = '#5aa843'; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath();
      for (let i = 0; i < 260; i++) { const x = rnd(0, W), y = rnd(0, H), k = rnd(0.7, 1.3); g.moveTo(x - 5 * k, y); g.lineTo(x - 2 * k, y - 9 * k); g.moveTo(x, y); g.lineTo(x + 1 * k, y - 11 * k); g.moveTo(x + 5 * k, y); g.lineTo(x + 5 * k, y - 7 * k); }
      g.stroke();
      // tree trunks and their shadows (canopies are drawn live so they can shake)
      for (const [x, y, s] of TREES) {
        g.fillStyle = 'rgba(20,60,15,.25)'; g.beginPath(); g.ellipse(x + 10 * s, y + 92 * s, 90 * s, 26 * s, 0, 0, TAU); g.fill();
        g.fillStyle = '#7a4a22'; g.beginPath(); g.roundRect(x - 15 * s, y + 20 * s, 30 * s, 76 * s, 8 * s); g.fill();
        g.fillStyle = '#93602f'; g.fillRect(x - 9 * s, y + 24 * s, 7 * s, 66 * s);
      }
      // the mowed field: soft edge, stripes, tufts, clover and tiny flowers
      g.fillStyle = 'rgba(30,80,20,.18)'; g.beginPath(); g.roundRect(X0 - 22, Y0 - 14, X1 - X0 + 44, Y1 - Y0 + 40, 46); g.fill();
      g.fillStyle = '#9be07a'; g.beginPath(); g.roundRect(X0 - 24, Y0 - 24, X1 - X0 + 48, Y1 - Y0 + 48, 44); g.fill();
      g.save(); g.beginPath(); g.roundRect(X0 - 24, Y0 - 24, X1 - X0 + 48, Y1 - Y0 + 48, 44); g.clip();
      g.fillStyle = '#a6e687'; for (let x = X0 - 24; x < X1 + 24; x += 140) g.fillRect(x, Y0 - 24, 70, Y1 - Y0 + 48);
      g.strokeStyle = '#7cc95e'; g.lineWidth = 2.5; g.beginPath();
      for (let i = 0; i < 170; i++) { const x = rnd(X0, X1), y = rnd(Y0, Y1), k = rnd(0.7, 1.3); g.moveTo(x - 6 * k, y); g.lineTo(x - 2 * k, y - 10 * k); g.moveTo(x, y); g.lineTo(x + 2 * k, y - 12 * k); g.moveTo(x + 6 * k, y); g.lineTo(x + 6 * k, y - 8 * k); }
      g.stroke();
      g.fillStyle = 'rgba(70,150,50,.35)';
      for (let i = 0; i < 40; i++) { const x = rnd(X0, X1), y = rnd(Y0, Y1); for (let k = 0; k < 3; k++) { const a = k * TAU / 3 - Math.PI / 2; g.beginPath(); g.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4.5, 0, TAU); g.fill(); } }
      for (let i = 0; i < 46; i++) {
        const x = rnd(X0, X1), y = rnd(Y0, Y1), c = ['#ffffff', '#ffe066', '#ff9fc4'][rint(3)];
        g.fillStyle = c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 0, TAU); g.fill(); }
        g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
      }
      g.restore();
      // a little border of flowers round the field
      g.strokeStyle = '#6fb653'; g.lineWidth = 4; g.beginPath(); g.roundRect(X0 - 24, Y0 - 24, X1 - X0 + 48, Y1 - Y0 + 48, 44); g.stroke();
    }
    /* trees fling fruit onto the grass */
    nearestTree(x, y) { let best = this.trees[0], bd = 1e9; for (const tr of this.trees) { const d = hyp(tr.x - x, tr.y - y) + rnd(0, 260); if (d < bd) { bd = d; best = tr; } } return best; }
    pickKind(star) { return Math.random() < star ? 'star' : ['apple', 'orange', 'grape'][rint(3)]; }
    dropGround() { this.items.push({ kind: this.pickKind(0.08), x: rnd(X0 + 30, X1 - 30), y: rnd(Y0 + 30, Y1 - 30), h: 0, vh: 0, st: 'ground', lock: 0, vx: 0, vy: 0, age: rnd(0, 5), sq: 0 }); }
    fling() {
      const tx = rnd(X0 + 40, X1 - 40), ty = rnd(Y0 + 40, Y1 - 30), tr = this.nearestTree(tx, ty);
      const sx = clamp(tr.x, X0 - 40, X1 + 40), sy = clamp(tr.y + 60 * tr.s, Y0 - 20, Y1 + 30), d = hyp(tx - sx, ty - sy);
      tr.sh = 1; Fx.burst(clamp(tr.x, 10, W - 10), clamp(tr.y, 110, H - 10), '#4fb35a', 4, 180);
      this.items.push({ kind: this.pickKind(0.08), x: sx, y: sy, sx, sy, tx, ty, T: 0.75 + d / 1400, peak: 160 + d * 0.22, h0: 100 * tr.s, h: 100 * tr.s, vh: 0, st: 'fly', lock: 0, vx: 0, vy: 0, age: 0, sq: 0 });
    }
    skyDrop() { this.items.push({ kind: this.pickKind(0.16), x: rnd(X0 + 30, X1 - 30), y: rnd(Y0 + 30, Y1 - 30), h: rnd(520, 700), vh: 0, st: 'fall', lock: 0, vx: 0, vy: 0, age: 0, sq: 0 }); }
    bomb() { this.bombs.push({ x: rnd(X0 + 60, X1 - 60), y: rnd(Y0 + 60, Y1 - 60), h: 620, vh: -120, st: 'fall', fuse: 1.7, age: 0 }); }
    land(it, big) {
      it.sq = big ? 0.4 : 0.22;
      if (big) { Fx.dust(it.x - 10, it.y + 12, 'rgba(255,255,255,.8)', 8); Fx.dust(it.x + 10, it.y + 12, 'rgba(255,255,255,.8)', 8); if (it.kind === 'star') { Fx.burst(it.x, it.y, '#ffe066', 8, 200); this.ctx.sfx('pop'); } }
    }
    spill(e, n) {
      n = Math.min(n, e.score); if (n <= 0) return;
      e.score -= n;
      for (let k = 0; k < n; k++) {
        let kind = e.bag.pop() || ['apple', 'orange', 'grape'][rint(3)]; if (kind === 'star') kind = 'orange';   // a spilt fruit is always worth 1
        const a = rnd(0, TAU), s = rnd(260, 420);
        this.items.push({ kind, x: e.x, y: e.y, h: 70, vh: 420, st: 'pop', lock: 0.6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, sq: 0 });
      }
      while (e.bag.length > Math.min(e.score, BAG_MAX)) e.bag.shift();
      e.bsq = 0.4;
      Fx.pop(e.x, e.y - 110, '-' + n, '#ff3b4a', 44);
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      const n = this.es.length;
      let ground = 0; for (const it of this.items) if (it.st !== 'gone') ground++;
      this.spawnAcc += dt * ((kid ? 1.5 : 1.3) + 0.45 * n);
      while (this.spawnAcc >= 1) { this.spawnAcc--; if (ground < 34) { this.fling(); ground++; } if (!kid && this.t > 5 && Math.random() < 0.16) this.bomb(); }
      if (this.t >= this.nextShower && this.t < this.dur - 3) {
        this.nextShower += 15; this.rain = 2.4; this.rainAcc = 0; this.rainN = 8 + n * 2;
        Fx.announce('水果雨！', '#ff7a1f'); ctx.sfx('star'); Fx.shake(6);
        for (const tr of this.trees) tr.sh = 1.4;
      }
      if (this.rain > 0) {
        this.rain -= dt; this.rainAcc += dt * this.rainN / 2.4;
        while (this.rainAcc >= 1) { this.rainAcc--; this.skyDrop(); }
      }
      for (const tr of this.trees) tr.sh = Math.max(0, tr.sh - dt * 2.2);
      for (const it of this.items) {
        it.age += dt; it.lock -= dt; it.sq *= Math.exp(-10 * dt);
        if (it.st === 'fly') {
          const k = Math.min(1, it.age / it.T);
          it.x = it.sx + (it.tx - it.sx) * k; it.y = it.sy + (it.ty - it.sy) * k; it.h = it.h0 * (1 - k) + it.peak * 4 * k * (1 - k);
          if (k >= 1) { it.h = 0; it.vh = 230; it.st = 'air'; this.land(it, true); }
        } else if (it.st === 'fall') {
          it.vh -= GRAV * dt; it.h += it.vh * dt;
          if (it.h <= 0) { it.h = 0; it.vh = Math.min(320, -it.vh * 0.3); it.st = 'air'; this.land(it, true); }
        } else if (it.st === 'air') {
          it.vh -= GRAV * dt; it.h += it.vh * dt;
          if (it.h <= 0) { it.h = 0; if (it.vh < -170) { it.vh = -it.vh * 0.4; this.land(it, false); } else { it.vh = 0; it.st = 'ground'; it.sq = Math.max(it.sq, 0.15); } }
        } else if (it.st === 'pop') {
          it.x = clamp(it.x + it.vx * dt, X0 + 20, X1 - 20); it.y = clamp(it.y + it.vy * dt, Y0 + 20, Y1 - 20); it.vx *= 0.9; it.vy *= 0.9;
          it.vh -= GRAV * dt; it.h = Math.max(0, it.h + it.vh * dt);
          if (it.h <= 0) { if (it.vh < -200) { it.vh = -it.vh * 0.35; this.land(it, false); } else if (hyp(it.vx, it.vy) < 30) { it.st = 'ground'; it.vh = 0; } }
        }
      }
      // golden stars twinkle now and then
      this.sparkT -= dt;
      if (this.sparkT <= 0) { this.sparkT = 0.35; for (const it of this.items) if (it.kind === 'star' && it.st === 'ground') Fx.burst(it.x + rnd(-14, 14), it.y - 10 + rnd(-14, 6), '#fff3a0', 1, 70); }
      for (const b of this.bombs) {
        b.age += dt;
        if (b.st === 'fall') { b.vh -= 900 * dt; b.h += b.vh * dt; if (b.h <= 0) { b.h = 0; b.st = 'fuse'; b.sq = 0.4; Fx.dust(b.x - 14, b.y + 16, null, 12); Fx.dust(b.x + 14, b.y + 16, null, 12); ctx.sfx('bonk', 0.1); } continue; }
        b.sq = (b.sq || 0) * Math.exp(-10 * dt);
        b.fuse -= dt;
        if (b.fuse <= 0) {
          b.st = 'gone'; ctx.sfx('boom');
          Fx.ring(b.x, b.y, '#ff7a1f', BOMB_R * 1.3, 0.5); Fx.ring(b.x, b.y, '#fff3c0', BOMB_R * 0.8, 0.35);
          Fx.burst(b.x, b.y, '#ffb21f', 22, 460); Fx.burst(b.x, b.y, '#ff5a3d', 10, 340); Fx.burst(b.x, b.y, '#6b6b78', 12, 220);
          Fx.shake(16); Fx.flash('#fff3c0', 0.3);
          this.scorch.push({ x: b.x, y: b.y, t: 0 });
          let hit = false;
          for (const e of this.es) if (e.inv <= 0 && hyp(e.x - b.x, e.y - b.y) < BOMB_R + e.r * 0.4) {
            hit = true; e.stun = 1.3; e.inv = 1.8; e.squash = 0.3;
            const d = hyp(e.x - b.x, e.y - b.y) || 1; e.vx = (e.x - b.x) / d * 380; e.vy = (e.y - b.y) / d * 380;
            this.spill(e, 3); ctx.buzz(e.p, 300);
          }
          if (hit) ctx.hitstop(0.06);
        }
      }
      this.bombs = this.bombs.filter(b => b.st !== 'gone');
      for (const s of this.scorch) s.t += dt; if (this.scorch.length && this.scorch[0].t > 5) this.scorch.shift();
      for (const e of this.es) {
        e.cd -= dt; e.dash -= dt; e.inv -= dt; e.happy -= dt; e.squash *= Math.exp(-9 * dt); e.bsq *= Math.exp(-9 * dt);
        e.trail.unshift(e.x, e.y); if (e.trail.length > 10) e.trail.length = 10;
        if (e.stun > 0) {
          e.stun -= dt; e.vx *= 0.88; e.vy *= 0.88; e.moving = false;
          e.x = clamp(e.x + e.vx * dt, X0 + e.r * 0.6, X1 - e.r * 0.6); e.y = clamp(e.y + e.vy * dt, Y0 + e.r * 0.6, Y1 - e.r * 0.6);
          continue;
        }
        const i = ctx.input(e.p);
        if (ctx.pressed(e.p, 0) && e.cd <= 0) {
          e.dash = 0.26; e.cd = kid ? 1.0 : 1.4; ctx.sfx('whoosh'); e.squash = -0.16;
          Fx.dust(e.x, e.y + e.r * 0.75, null, 12); Fx.dust(e.x, e.y + e.r * 0.75, null, 10);
        }
        const sp = (kid ? 330 : 360) * (e.dash > 0 ? 2.3 : 1);
        let dx = i.x, dy = i.y; if (e.dash > 0 && !dx && !dy) { dx = Math.cos(e.face); dy = Math.sin(e.face); }
        const mv = !!(dx || dy), turn = mv && (e.vx * dx + e.vy * dy) < 0 ? 1.6 : 1;
        const k = 1 - Math.exp(-(e.dash > 0 ? 20 : mv ? 13 * turn : 22) * dt);
        e.vx += (dx * sp - e.vx) * k; e.vy += (dy * sp - e.vy) * k;
        if (mv && !e.moving) e.squash = Math.min(e.squash, -0.1);
        if (!mv && e.moving) e.squash = 0.12;
        e.moving = mv;
        if (mv) { e.face = angLerp(e.face, Math.atan2(dy, dx), 1 - Math.exp(-16 * dt)); e.walk += dt * (9 + hyp(e.vx, e.vy) / 45); } else e.walk = 0;
        e.x = clamp(e.x + e.vx * dt, X0 + e.r * 0.6, X1 - e.r * 0.6); e.y = clamp(e.y + e.vy * dt, Y0 + e.r * 0.6, Y1 - e.r * 0.6);
        Fx.walk(e, dt, 'rgba(255,255,255,.8)');
        const reach = e.r + (kid ? 30 : 14);
        for (const it of this.items) {
          if (it.st === 'gone' || it.st === 'fly' || it.st === 'fall' || it.lock > 0 || it.h > 40 || hyp(it.x - e.x, it.y - e.y) > reach) continue;
          it.st = 'gone'; const pts = KINDS[it.kind].pts; e.score += pts; e.happy = 0.5;
          this.flyers.push({ kind: it.kind, x: it.x, y: it.y - it.h, e, t: 0 });
          Fx.pop(it.x, it.y - 40, '+' + pts, pts > 1 ? '#e09a00' : PARTY_COLORS[e.p.col].d, pts > 1 ? 50 : 32);
          if (pts > 1) { ctx.sfx('star'); ctx.buzz(e.p, 60); Fx.ring(it.x, it.y, '#ffd21f', 80, 0.4); Fx.burst(it.x, it.y, '#ffe066', 10, 260); }
          else ctx.sfx('coin');
        }
      }
      this.items = this.items.filter(i => i.st !== 'gone');
      // caught fruit hops up into the basket on your head
      for (const f of this.flyers) {
        f.t += dt;
        if (f.t >= 0.32) {
          const e = f.e; f.done = true; e.bag.push(f.kind); e.bsq = 0.35;
          while (e.bag.length > Math.min(e.score, BAG_MAX)) e.bag.shift();
        }
      }
      this.flyers = this.flyers.filter(f => !f.done);
      // bumping (grown-ups: a dash knocks fruit out of whoever you hit)
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
        const A = this.es[a], B = this.es[b], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
        if (d >= m || d === 0) continue;
        const o = (m - d) / 2; A.x -= dx / d * o; A.y -= dy / d * o; B.x += dx / d * o; B.y += dy / d * o;
        if (kid) continue;
        for (const [hit, vic] of [[A, B], [B, A]]) {
          if (hit.dash > 0 && vic.inv <= 0 && vic.dash <= 0 && !(this.teams && hit.p.team === vic.p.team)) {
            vic.stun = 0.45; vic.inv = 1.0; vic.vx = (vic.x - hit.x) / d * 420; vic.vy = (vic.y - hit.y) / d * 420; hit.dash = 0;
            vic.squash = 0.25; hit.squash = 0.15;
            this.spill(vic, 2); ctx.sfx('bonk', 0.8); ctx.buzz(vic.p, 150); Fx.burst((A.x + B.x) / 2, (A.y + B.y) / 2, '#ffe066', 10, 300);
            Fx.ring((A.x + B.x) / 2, (A.y + B.y) / 2, '#ffffff', 70, 0.3); Fx.shake(7); ctx.hitstop(0.03);
          }
        }
      }
      if (!this.teams && n > 1) {
        let best = null, tie = false;
        for (const e of this.es) { if (!best || e.score > best.score) { best = e; tie = false; } else if (e.score === best.score) tie = true; }
        this.lead = best && !tie && best.score > 0 ? best : null;
      }
      if (this.t >= this.dur) this.over = true;
    }
    basketY(e, hop) { return e.y - e.r * 1.75 - 14 - hop; }
    draw(g, clock) {
      const t = this.t, tt = clock || t;
      g.fillStyle = this.edge; g.fillRect(-400, 0, W + 800, H);
      g.drawImage(this.bg, 0, 0);
      for (const s of this.scorch) {
        const a = Math.min(1, (5 - s.t) / 1.5); g.fillStyle = '#5a4a24';
        g.globalAlpha = a * 0.16; g.beginPath(); g.ellipse(s.x, s.y + 6, 80, 36, 0, 0, TAU); g.fill();
        g.globalAlpha = a * 0.3; g.beginPath(); g.ellipse(s.x, s.y + 6, 44, 20, 0, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      // tree tops sway, and shake when they throw fruit
      const cs = canopySprite();
      for (const tr of this.trees) {
        const sw = Math.sin(tt * 1.3 + tr.ph) * 2 + Math.sin(tt * 42 + tr.ph) * tr.sh * 8, S = 260 * tr.s * (1 + tr.sh * 0.03);
        g.drawImage(cs, tr.x - S / 2 + sw, tr.y - S / 2 - tr.sh * 3, S, S);
      }
      // where things will land: shadows and a little target ring
      for (const it of this.items) {
        if (it.st === 'fly' || it.st === 'fall') {
          const tx = it.st === 'fly' ? it.tx : it.x, ty = it.st === 'fly' ? it.ty : it.y, k = it.st === 'fly' ? Math.min(1, it.age / it.T) : 1 - Math.min(1, it.h / 600);
          g.strokeStyle = `rgba(255,255,255,${0.25 + k * 0.5})`; g.lineWidth = 3; g.beginPath(); g.ellipse(tx, ty + 12, 22 - k * 6, 9 - k * 2, 0, 0, TAU); g.stroke();
          g.fillStyle = `rgba(30,60,20,${0.12 + k * 0.25})`; g.beginPath(); g.ellipse(it.x, it.y + 12, 6 + k * 14, 3 + k * 5, 0, 0, TAU); g.fill();
        } else {
          const k = Math.min(1, it.h / 200); g.fillStyle = `rgba(30,60,20,${0.28 - k * 0.12})`; g.beginPath(); g.ellipse(it.x, it.y + 14, 16 - k * 6, 6 - k * 2, 0, 0, TAU); g.fill();
        }
      }
      // bomb danger zones
      for (const b of this.bombs) {
        const k = b.st === 'fall' ? 1 - Math.min(1, b.h / 620) : 1, urgent = b.st === 'fuse' ? 1 - b.fuse / 1.7 : 0;
        const pulse = 0.5 + 0.5 * Math.sin(tt * (10 + urgent * 20));
        g.fillStyle = `rgba(255,70,90,${0.06 + k * 0.05 + urgent * 0.16 * pulse})`; g.beginPath(); g.arc(b.x, b.y, BOMB_R * (0.6 + k * 0.4), 0, TAU); g.fill();
        g.strokeStyle = `rgba(255,255,255,${0.35 + 0.3 * pulse})`; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, BOMB_R * (0.6 + k * 0.4) - 9, 0, TAU); g.stroke();
        g.setLineDash([16, 12]); g.lineDashOffset = -tt * 60; g.strokeStyle = `rgba(235,20,40,${0.55 + 0.45 * pulse})`; g.lineWidth = 6;
        g.beginPath(); g.arc(b.x, b.y, BOMB_R * (0.6 + k * 0.4), 0, TAU); g.stroke(); g.setLineDash([]);
        if (b.st === 'fall') {
          g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(b.x, b.y + 14, 8 + k * 18, 4 + k * 7, 0, 0, TAU); g.fill();
          g.font = `900 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#fff'; g.fillStyle = '#ff3b3b';
          g.strokeText('!', b.x, b.y - 4); g.fillText('!', b.x, b.y - 4);
        }
      }
      Fx.ground(g);
      // fruit on the grass (a gentle wobble, a squash when it lands, stars glow)
      for (const it of this.items) {
        if (it.st === 'fly' || it.st === 'fall') continue;
        const star = it.kind === 'star', bob = it.st === 'ground' ? Math.sin(tt * 4 + it.x) * 2 : 0, y = it.y - it.h + bob;
        if (star) {
          const p = 0.5 + 0.5 * Math.sin(tt * 6 + it.x);
          g.fillStyle = `rgba(255,236,110,${0.22 + p * 0.2})`; g.beginPath(); g.arc(it.x, y, 30 + p * 6, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,250,200,.45)'; g.beginPath(); g.arc(it.x, y, 22, 0, TAU); g.fill();
        }
        g.save(); g.translate(it.x, y + 12); g.scale(1 + it.sq, 1 - it.sq);
        if (star) g.rotate(Math.sin(tt * 3 + it.x) * 0.25);
        stamp(g, it.kind, 0, -12, star ? 1.15 : 1);
        g.restore();
        if (star) {   // two little twinkles circling it
          g.fillStyle = '#fffbe0';
          for (let k = 0; k < 2; k++) {
            const a = tt * 2.4 + k * Math.PI + it.x, px = it.x + Math.cos(a) * 30, py = y + Math.sin(a) * 18, s = 5 + 3 * Math.sin(tt * 9 + k * 2);
            g.beginPath(); g.moveTo(px, py - s * 1.6); g.lineTo(px + s * 0.4, py - s * 0.4); g.lineTo(px + s * 1.6, py); g.lineTo(px + s * 0.4, py + s * 0.4); g.lineTo(px, py + s * 1.6); g.lineTo(px - s * 0.4, py + s * 0.4); g.lineTo(px - s * 1.6, py); g.lineTo(px - s * 0.4, py - s * 0.4); g.closePath(); g.fill();
          }
        }
      }
      // bombs on the ground: they swell and flash faster as the fuse burns down
      for (const b of this.bombs) {
        if (b.st !== 'fuse') continue;
        const u = 1 - b.fuse / 1.7, flash = (tt * (6 + u * 18) | 0) % 2, sw = 1 + u * 0.18 + (b.fuse < 0.5 ? Math.sin(tt * 50) * 0.05 : 0), sq = b.sq || 0;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(b.x, b.y + 22, 24, 8, 0, 0, TAU); g.fill();
        g.save(); g.translate(b.x, b.y); g.scale(sw * (1 + sq), sw * (1 - sq));
        g.fillStyle = flash ? '#ff3b3b' : '#2b2b38'; g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-8, -8, 6, 0, TAU); g.fill();
        g.fillStyle = '#555'; g.fillRect(-7, -28, 14, 7);
        const fl = 1 - u * 0.7;   // the fuse gets shorter
        g.strokeStyle = '#8a5a2b'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -27); g.quadraticCurveTo(6 * fl, -40 * fl - 4, 18 * fl, -36 * fl - 2); g.stroke();
        g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(18 * fl, -36 * fl - 2, 5 + Math.random() * 4, 0, TAU); g.fill();
        g.fillStyle = '#ff7a1f'; g.beginPath(); g.arc(18 * fl, -36 * fl - 2, 3, 0, TAU); g.fill();
        g.restore();
      }
      // the critters, back to front, each with a basket on its head
      const list = this.order; list.sort((a, b) => a.y - b.y);
      for (const e of list) {
        const C = PARTY_COLORS[e.p.col], s = e.moving ? Math.abs(Math.sin(e.walk)) : 0, hop = s * 7;
        const sq = e.squash + (e.moving ? Math.pow(1 - s, 3) * 0.07 - s * 0.03 : 0);
        if (e.dash > 0) for (let k = 2; k < e.trail.length; k += 2) { g.globalAlpha = 0.28 - k * 0.025; g.fillStyle = C.c; g.beginPath(); g.arc(e.trail[k], e.trail[k + 1], e.r * (1 - k * 0.04), 0, TAU); g.fill(); }
        g.globalAlpha = 1;
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: sq, hop, stun: e.stun > 0, happy: e.happy > 0, blink: (tt + e.p.uid * 1.3) % 3.6 < 0.12,
          rot: e.stun > 0 ? Math.sin(t * 20) * 0.2 : (e.moving ? Math.cos(e.face) * 0.08 : 0), alpha: e.inv > 0 && (t * 10 | 0) % 2 ? 0.5 : 1 });
        const by = this.basketY(e, hop);
        drawBasket(g, e.x, by, e.bag, e.bsq, 1.3);
        if (e.score > 0) {
          const bx = e.x + 44, cy = by + 10;
          g.fillStyle = e === this.lead ? '#ffb000' : C.d; g.beginPath(); g.arc(bx, cy, 16, 0, TAU); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
          g.fillStyle = '#fff'; g.font = `900 ${e.score > 99 ? 14 : 18}px "Fredoka",${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e.score, bx, cy + 1);
        }
        if (e.stun > 0) { g.fillStyle = '#ffd21f'; g.font = '22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let k = 0; k < 3; k++) { const a = t * 6 + k * TAU / 3; g.fillText('★', e.x + Math.cos(a) * 34, e.y - e.r * 0.6 + Math.sin(a) * 8); } }
        drawTag(g, e.x, e.y + e.r + 24, e.p);
      }
      // things in the air go over everything
      for (const it of this.items) {
        if (it.st !== 'fly' && it.st !== 'fall') continue;
        g.save(); g.translate(it.x, it.y - it.h); g.rotate(it.age * (it.st === 'fly' ? 7 : 3)); stamp(g, it.kind, 0, 0, it.kind === 'star' ? 1.15 : 1); g.restore();
      }
      for (const b of this.bombs) if (b.st === 'fall') {
        g.fillStyle = '#2b2b38'; g.beginPath(); g.arc(b.x, b.y - b.h, 24, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(b.x - 8, b.y - b.h - 8, 6, 0, TAU); g.fill();
        g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(b.x + 14, b.y - b.h - 26, 4 + Math.random() * 3, 0, TAU); g.fill();
      }
      for (const f of this.flyers) {
        const e = f.e, k = Math.min(1, f.t / 0.32), ex = e.x, ey = this.basketY(e, 0) - 14;
        const x = f.x + (ex - f.x) * k, y = f.y + (ey - f.y) * k - Math.sin(k * Math.PI) * 70;
        stamp(g, f.kind, x, y, 1 - k * 0.45);
      }
    }
    center() {
      if (this.teams || this.es.length < 2) return '';
      const L = this.lead; return L ? '👑 領先：' + L.p.name + '　🍎 ' + L.score : this.es.some(e => e.score > 0) ? '不相上下，加油！' : '快去撿水果！';
    }
    chip(p) { return '🍎 ' + this.by.get(p).score; }
    pad(p) { const e = this.by.get(p); return '🍎 ' + e.score + ' 個' + (e.stun > 0 ? '　暈～' : ''); }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && e.stun <= 0; }
    teamScore(t) { return this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.score, 0); }
    results() { return { teamScores: this.teams ? [this.teamScore(0), this.teamScore(1)] : null, rows: this.es.slice().sort((a, b) => b.score - a.score).map(e => ({ p: e.p, key: e.score, line: `撿到 ${e.score} 個水果` })) }; }
  }
  GAMES.push({
    id: 'fruit', name: '搶果果', icon: '🍎', col: '#ff5a3d', bg: '#6dbd52', kind: 'vs', teams: true, players: '1–6 人',
    blurb: '水果從天上掉下來，搶最多的人贏！',
    btn: { label: '衝刺', icon: '⚡' },
    rules: kid => kid
      ? ['果樹會把水果丟到草地上，看地上的影子就知道掉在哪', '走過去就撿起來，放進頭上的籃子，金色星星果 3 分', '按「衝刺」跑得更快，「水果雨」來了要快搶！', '60 秒後，撿最多的人贏']
      : ['看影子搶水果，金色星星果 3 分', '「衝刺」撞到人，對方籃子會掉 2 個水果', '小心炸彈！看到紅圈快跑，被炸到會暈倒、掉 3 個', '60 秒後最多的人贏'],
    thumb(g) {
      g.fillStyle = '#9be07a'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#a6e687'; for (let x = 0; x < 320; x += 60) g.fillRect(x, 0, 30, 180);
      g.drawImage(canopySprite(), -60, -50, 150, 150); g.drawImage(canopySprite(), 250, -40, 130, 130);
      g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(250, 140, 20, 7, 0, 0, TAU); g.fill();
      drawFruit(g, 'apple', 250, 70, 1.2); drawFruit(g, 'star', 60, 140, 1.1); drawFruit(g, 'grape', 200, 140, 1); drawFruit(g, 'orange', 140, 160, 1);
      drawCritter(g, 110, 108, 24, 2, 1, { face: -2, hop: 4 }); drawBasket(g, 110, 62, ['apple', 'orange', 'grape', 'apple', 'star'], 0);
      drawCritter(g, 215, 100, 22, 5, 0, { face: 2 });
    },
    create: ctx => new Fruit(ctx)
  });
})();
