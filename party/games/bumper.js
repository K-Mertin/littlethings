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
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const IW = 720, IH = 420;                 // half-size of the cached island picture (base size)
  /* a cached picture, re-rendered only when the screen scale changes */
  function layer(self, key, g, w, h, ox, oy, paint) {
    const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
    let L = self[key];
    if (!L || L.s !== s) {
      const c = (L && L.c) || document.createElement('canvas'); c.width = Math.ceil(w * s); c.height = Math.ceil(h * s);
      const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, ox * s, oy * s); paint(cg); L = self[key] = { c, s };
    }
    return L;
  }
  /* swim goggles pushed up on the forehead (same transform as drawCritter) */
  function goggles(g, x, y, r, hop, rot, sq, col, frog) {
    g.save(); g.translate(x, y - hop); if (rot) g.rotate(rot); g.scale(1 + sq, 1 - sq);
    const ly = frog ? -r * 0.72 : -r * 0.66, lx = frog ? r * 0.44 : r * 0.3, lr = frog ? r * 0.25 : r * 0.17;
    g.save(); g.beginPath(); g.arc(0, 0, r * 1.01, 0, TAU); if (frog) g.rect(-r * 1.1, -r * 1.2, r * 2.2, r * 0.6); g.clip();
    g.strokeStyle = '#2b2340'; g.lineWidth = r * 0.11; g.beginPath(); g.moveTo(-r * 1.05, ly + r * 0.12); g.quadraticCurveTo(0, ly - r * 0.12, r * 1.05, ly + r * 0.12); g.stroke();
    g.restore();
    for (const s of [-1, 1]) {
      g.fillStyle = frog ? 'rgba(120,220,255,.35)' : '#7fe0ff'; g.strokeStyle = col; g.lineWidth = r * 0.08;
      g.beginPath(); g.ellipse(s * lx, ly, lr, lr * 0.85, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(s * lx - lr * 0.35, ly - lr * 0.3, lr * 0.3, lr * 0.18, -0.5, 0, TAU); g.fill();
    }
    g.fillStyle = col; g.fillRect(-lx + lr * 0.8, ly - r * 0.035, (lx - lr * 0.8) * 2, r * 0.07);
    g.restore();
  }
  /* a swimming ring in the player's colour with white stripes */
  function floatRing(g, x, y, rx, ry, col, front) {
    g.lineWidth = ry * 0.62; g.strokeStyle = col; g.beginPath();
    if (front) g.ellipse(x, y, rx, ry, 0, 0, Math.PI); else g.ellipse(x, y, rx, ry, 0, Math.PI, TAU);
    g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = ry * 0.64;
    for (let k = 0; k < 4; k++) {
      const a0 = (front ? 0 : Math.PI) + (k + 0.3) * Math.PI / 4;
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, a0, a0 + 0.22); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = ry * 0.14; g.beginPath();
    if (front) g.ellipse(x, y - ry * 0.12, rx * 0.98, ry * 0.9, 0, 0.3, Math.PI - 0.3); else g.ellipse(x, y - ry * 0.12, rx * 0.98, ry * 0.9, 0, Math.PI + 0.3, TAU - 0.3);
    g.stroke();
  }
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
          face: a + Math.PI, want: a + Math.PI, step: 0, r: 38, cd: 0, dashT: 0, dx: 0, dy: 0, st: 'ok', stT: 0, inv: 1, hitBy: null, hitT: -9, credit: null,
          score: 0, falls: 0, lives: 3, out: false, outAt: 0, squash: 0, teeter: 0, trail: [], bump: new Map(), sx: 0, sy: 0, tx: 0, ty: 0 };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      // island details live in unit-circle coordinates so they shrink with the island
      this.deco = []; for (let i = 0; i < 90; i++) { const a = rnd(0, TAU), d = Math.sqrt(Math.random()) * 0.9; this.deco.push({ u: Math.cos(a) * d, v: Math.sin(a) * d, k: rnd(0.7, 1.3), c: ['#fff', '#ffe066', '#ff9fc4', '#9fd0ff'][rint(4)], tuft: Math.random() < 0.45 }); }
      this.shells = []; for (let i = 0; i < 26; i++) { const a = rnd(0, TAU); this.shells.push({ a, d: rnd(1.0, 1.04), c: ['#fff4e0', '#ffc9b5', '#ffe3f0'][rint(3)], s: rnd(0.7, 1.2) }); }
      this.duck = { x: 140, y: 820, a: 0 };
      this.warned = false;
      // life on the water: twinkles, seagulls, jumping fish, foam
      this.spark = []; while (this.spark.length < 26) { const x = rnd(-380, W + 380), y = rnd(30, H - 20); if (this.q(x, y) > 1.25) this.spark.push({ x, y, ph: rnd(0, TAU), sp: rnd(1.5, 3.2), s: rnd(0.7, 1.3) }); }
      this.gulls = []; for (let i = 0; i < 3; i++) this.gulls.push({ x: rnd(-300, W + 300), y: rnd(90, 760), vx: rnd(55, 90) * (Math.random() < 0.5 ? -1 : 1), ph: rnd(0, TAU), s: rnd(1.25, 1.6) });
      this.fish = []; this.fishT = rnd(1, 3);
      this.foam = []; for (let i = 0; i < 56; i++) this.foam.push({ a: i / 56 * TAU + rnd(-0.03, 0.03), r: rnd(7, 13), ph: rnd(0, TAU) });
      this.toys = [
        { k: 'ball', u: 0.98, a: 2.55 }, { k: 'bucket', u: 1.0, a: 0.55 }, { k: 'star', u: 1.0, a: -2.2 }, { k: 'castle', u: 0.99, a: -0.95 },
        { k: 'star', u: 1.0, a: 1.62 }, { k: 'flops', u: 1.0, a: 3.6 }
      ];
    }
    /* how far out a point is: 1 = on the edge of the grass */
    q(x, y) { return Math.hypot((x - CX) / this.RX, (y - CY) / this.RY); }
    normal(x, y) { const nx = (x - CX) / (this.RX * this.RX), ny = (y - CY) / (this.RY * this.RY), m = Math.hypot(nx, ny) || 1; return [nx / m, ny / m]; }
    edgePoint(x, y, k) { const a = Math.atan2((y - CY) / this.RY, (x - CX) / this.RX); return [CX + Math.cos(a) * this.RX * k, CY + Math.sin(a) * this.RY * k]; }
    paintWater(g) {
      const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#5cc9f2'); grd.addColorStop(1, '#2fa7dc');
      g.fillStyle = grd; g.fillRect(-400, 0, W + 800, H);
      // deeper water far from the island, shallow turquoise near it
      const rg = g.createRadialGradient(CX, CY, 300, CX, CY, 1100); rg.addColorStop(0, 'rgba(120,235,230,.45)'); rg.addColorStop(0.45, 'rgba(120,235,230,0)'); rg.addColorStop(1, 'rgba(20,90,170,.35)');
      g.fillStyle = rg; g.fillRect(-400, 0, W + 800, H);
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(rnd(-400, W + 400), rnd(0, H), rnd(60, 160), rnd(10, 26), 0, 0, TAU); g.fill(); }
      // caustic squiggles on the sea floor
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 70; i++) { const x = rnd(-400, W + 400), y = rnd(0, H); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 10, x + 28, y); g.quadraticCurveTo(x + 42, y + 10, x + 56, y); g.stroke(); }
      // little islets with palm trees (and someone's beach day)
      for (const [x, y, s, extra] of [[70, 215, 1, 'brella'], [1530, 790, 1.15, 'castle'], [1545, 205, 0.8, 'towel'], [55, 800, 0.85, 'crab']]) {
        g.fillStyle = 'rgba(20,90,140,.25)'; g.beginPath(); g.ellipse(x + 6, y + 30 * s, 92 * s, 30 * s, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x, y + 24 * s, 90 * s, 30 * s, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffe3a1'; g.beginPath(); g.ellipse(x, y + 22 * s, 84 * s, 26 * s, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffeec4'; g.beginPath(); g.ellipse(x - 12 * s, y + 16 * s, 50 * s, 12 * s, 0, 0, TAU); g.fill();
        if (extra === 'towel') { g.save(); g.translate(x - 40 * s, y + 24 * s); g.rotate(-0.15); g.fillStyle = '#ff6fb7'; g.fillRect(-22 * s, -9 * s, 44 * s, 18 * s); g.fillStyle = '#fff'; for (let k = 0; k < 3; k++) g.fillRect((-16 + k * 12) * s, -9 * s, 5 * s, 18 * s); g.restore(); }
        if (extra === 'crab') { g.fillStyle = '#ff5a3d'; g.beginPath(); g.ellipse(x - 44 * s, y + 26 * s, 11 * s, 7 * s, 0, 0, TAU); g.fill(); for (const d of [-1, 1]) { g.beginPath(); g.arc(x - 44 * s + d * 13 * s, y + 20 * s, 4 * s, 0, TAU); g.fill(); } g.fillStyle = '#2b2340'; for (const d of [-1, 1]) { g.beginPath(); g.arc(x - 44 * s + d * 4 * s, y + 21 * s, 1.6 * s, 0, TAU); g.fill(); } }
        g.strokeStyle = '#8a5a2b'; g.lineWidth = 12 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y + 20 * s); g.quadraticCurveTo(x - 10 * s, y - 40 * s, x + 12 * s, y - 92 * s); g.stroke();
        g.strokeStyle = '#6e4520'; g.lineWidth = 2; for (let k = 1; k < 6; k++) { const ky = y + 20 * s - k * 18 * s; g.beginPath(); g.moveTo(x - 6 * s - (k > 3 ? 2 : 0) * s, ky); g.lineTo(x + 5 * s, ky - 3 * s); g.stroke(); }
        for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; g.fillStyle = k % 2 ? '#3fae4a' : '#4fc25a'; g.beginPath(); g.ellipse(x + 12 * s + Math.cos(a) * 44 * s, y - 92 * s + Math.sin(a) * 18 * s + 12 * s, 48 * s, 13 * s, a, 0, TAU); g.fill(); }
        g.fillStyle = '#8a5a2b'; for (const dx of [-8, 8]) { g.beginPath(); g.arc(x + 12 * s + dx * s, y - 84 * s, 8 * s, 0, TAU); g.fill(); }
        if (extra === 'brella') {
          const ux = x + 50 * s, uy = y - 10 * s;
          g.strokeStyle = '#ffffff'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(ux, uy); g.lineTo(ux - 6 * s, y + 30 * s); g.stroke();
          for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#ff4f58'; g.beginPath(); g.moveTo(ux, uy - 4 * s); g.arc(ux, uy - 4 * s, 34 * s, Math.PI + k * Math.PI / 6, Math.PI + (k + 1) * Math.PI / 6); g.closePath(); g.fill(); }
        }
        if (extra === 'castle') {
          const cx = x - 46 * s, cy = y + 20 * s; g.fillStyle = '#e8c27a';
          g.fillRect(cx - 20 * s, cy - 18 * s, 40 * s, 18 * s); g.fillRect(cx - 9 * s, cy - 32 * s, 18 * s, 14 * s);
          for (let k = 0; k < 3; k++) g.fillRect(cx - 20 * s + k * 15 * s, cy - 23 * s, 9 * s, 5 * s);
          g.fillStyle = '#ff4f58'; g.beginPath(); g.moveTo(cx, cy - 32 * s); g.lineTo(cx, cy - 46 * s); g.lineTo(cx + 12 * s, cy - 42 * s); g.lineTo(cx, cy - 38 * s); g.fill();
        }
      }
    }
    /* the island at its full size, centred on (0,0); drawn scaled as it shrinks */
    paintIsland(g) {
      const RX = this.RX0, RY = this.RY0;
      g.fillStyle = 'rgba(20,90,140,.28)'; g.beginPath(); g.ellipse(12, 22, RX + 34, RY + 30, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffe3a1'; g.beginPath(); g.ellipse(0, 0, RX + 24, RY + 20, 0, 0, TAU); g.fill();
      g.strokeStyle = '#f0c878'; g.lineWidth = 6; g.beginPath(); g.ellipse(0, 2, RX + 21, RY + 17, 0, 0.1, Math.PI - 0.1); g.stroke();   // wet sand
      g.fillStyle = 'rgba(200,150,80,.25)'; for (let i = 0; i < 160; i++) { const a = rnd(0, TAU), d = rnd(1.0, 1.06); g.fillRect(Math.cos(a) * (RX + 10) * d, Math.sin(a) * (RY + 8) * d, 2, 2); }
      for (const s of this.shells) { const x = Math.cos(s.a) * (RX + 12) * s.d, y = Math.sin(s.a) * (RY + 10) * s.d; g.fillStyle = s.c; g.beginPath(); g.ellipse(x, y, 6 * s.s, 4 * s.s, s.a, 0, TAU); g.fill(); g.strokeStyle = 'rgba(180,120,90,.4)'; g.lineWidth = 1; g.stroke(); }
      g.fillStyle = '#5cb84a'; g.beginPath(); g.ellipse(0, 3, RX + 3, RY + 3, 0, 0, TAU); g.fill();
      g.fillStyle = '#74cf5c'; g.beginPath(); g.ellipse(0, 0, RX, RY, 0, 0, TAU); g.fill();
      g.fillStyle = '#86d96c'; g.beginPath(); g.ellipse(-RX * 0.05, -RY * 0.07, RX * 0.86, RY * 0.82, 0, 0, TAU); g.fill();
      g.fillStyle = '#93e078'; g.beginPath(); g.ellipse(-RX * 0.1, -RY * 0.12, RX * 0.55, RY * 0.5, 0, 0, TAU); g.fill();
      // mown stripes
      g.save(); g.beginPath(); g.ellipse(0, 0, RX - 4, RY - 4, 0, 0, TAU); g.clip();
      g.fillStyle = 'rgba(255,255,255,.05)'; for (let x = -RX; x < RX; x += 120) g.fillRect(x, -RY, 60, RY * 2);
      g.restore();
      for (const d of this.deco) {
        const x = d.u * RX, y = d.v * RY;
        if (d.tuft) { g.strokeStyle = '#5fb84a'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 6 * d.k, y); g.lineTo(x - 2 * d.k, y - 10 * d.k); g.moveTo(x, y); g.lineTo(x + 2 * d.k, y - 12 * d.k); g.moveTo(x + 6 * d.k, y); g.lineTo(x + 6 * d.k, y - 8 * d.k); g.stroke(); continue; }
        g.fillStyle = d.c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 5 * d.k, y + Math.sin(a) * 5 * d.k, 3.6 * d.k, 0, TAU); g.fill(); }
        g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(x, y, 3 * d.k, 0, TAU); g.fill();
      }
      // beach toys left on the sand
      for (const o of this.toys) {
        const x = Math.cos(o.a) * (RX + 12) * o.u, y = Math.sin(o.a) * (RY + 10) * o.u;
        g.save(); g.translate(x, y);
        if (o.k === 'ball') {
          g.fillStyle = 'rgba(120,80,30,.25)'; g.beginPath(); g.ellipse(3, 12, 15, 5, 0, 0, TAU); g.fill();
          const C = ['#ff4f58', '#ffffff', '#2f8cff', '#ffffff', '#ffbf1f', '#ffffff'];
          for (let k = 0; k < 6; k++) { g.fillStyle = C[k]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 15, k * TAU / 6, (k + 1) * TAU / 6); g.closePath(); g.fill(); }
          g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-5, -6, 5, 3, -0.6, 0, TAU); g.fill();
        } else if (o.k === 'bucket') {
          g.fillStyle = 'rgba(120,80,30,.25)'; g.beginPath(); g.ellipse(3, 12, 15, 5, 0, 0, TAU); g.fill();
          g.fillStyle = '#2f8cff'; g.beginPath(); g.moveTo(-12, -10); g.lineTo(12, -10); g.lineTo(9, 12); g.lineTo(-9, 12); g.closePath(); g.fill();
          g.fillStyle = '#7fc0ff'; g.beginPath(); g.ellipse(0, -10, 12, 4, 0, 0, TAU); g.fill();
          g.strokeStyle = '#1658b5'; g.lineWidth = 2; g.beginPath(); g.arc(0, -10, 12, Math.PI, TAU); g.stroke();
          g.strokeStyle = '#ffbf1f'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(16, 10); g.lineTo(26, -10); g.stroke();
          g.fillStyle = '#ffbf1f'; g.beginPath(); g.ellipse(27, -14, 5, 7, 0.45, 0, TAU); g.fill();
        } else if (o.k === 'star') {
          g.fillStyle = '#ff8a5c'; g.beginPath();
          for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5 + o.a, rr = k % 2 ? 4 : 10; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          g.closePath(); g.fill(); g.fillStyle = '#ffd2b8'; g.beginPath(); g.arc(0, 0, 2, 0, TAU); g.fill();
        } else if (o.k === 'castle') {
          g.fillStyle = 'rgba(120,80,30,.2)'; g.beginPath(); g.ellipse(2, 10, 20, 5, 0, 0, TAU); g.fill();
          g.fillStyle = '#e8c27a'; g.fillRect(-16, -6, 32, 16); g.fillRect(-7, -18, 14, 12);
          for (let k = 0; k < 3; k++) g.fillRect(-16 + k * 12, -10, 7, 4);
          g.fillStyle = '#c99a50'; g.fillRect(-3, 2, 6, 8);
          g.strokeStyle = '#8a5a2b'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -18); g.lineTo(0, -30); g.stroke();
          g.fillStyle = '#22c26a'; g.beginPath(); g.moveTo(0, -30); g.lineTo(10, -27); g.lineTo(0, -24); g.fill();
        } else if (o.k === 'flops') {
          for (const d of [-1, 1]) { g.fillStyle = d < 0 ? '#22c26a' : '#9b5cff'; g.beginPath(); g.ellipse(d * 8, d * 2, 5, 10, 0.2, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(d * 8 - 4, d * 2 - 2); g.lineTo(d * 8, d * 2 - 6); g.lineTo(d * 8 + 4, d * 2 - 2); g.stroke(); }
        }
        g.restore();
      }
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
        if (i.x || i.y) e.want = Math.atan2(i.y, i.x);
        e.face = wrapA(e.face + wrapA(e.want - e.face) * (1 - Math.exp(-14 * dt)));   // turn smoothly, never snap
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
        e.x += e.vx * dt; e.y += e.vy * dt; e.step += Math.hypot(e.vx, e.vy) * dt / (e.r * 0.5);
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
      for (const s of this.gulls) { s.x += s.vx * dt; s.ph += dt; if (s.x > W + 420) { s.x = -420; s.y = rnd(90, 760); } if (s.x < -420) { s.x = W + 420; s.y = rnd(90, 760); } }
      // now and then a fish jumps out of the water
      this.fishT -= dt;
      if (this.fishT <= 0 && this.fish.length < 2) {
        this.fishT = rnd(1.6, 3.6);
        for (let k = 0; k < 6; k++) {
          const x = rnd(40, W - 40), y = rnd(150, H - 40);
          if (this.q(x, y) < 1.3) continue;
          const f = { x, y, dir: Math.random() < 0.5 ? -1 : 1, t: 0, c: ['#ff8a1f', '#ffd21f', '#ff6fb7', '#7fd0ff'][rint(4)], splashed: false };
          this.fish.push(f); Fx.ring(x, y, 'rgba(255,255,255,.8)', 34, 0.45); break;
        }
      }
      for (const f of this.fish) {
        f.t += dt;
        if (!f.splashed && f.t >= 0.9) { f.splashed = true; Fx.ring(f.x + f.dir * 110, f.y, 'rgba(255,255,255,.85)', 40, 0.5); Fx.burst(f.x + f.dir * 110, f.y - 4, '#e6f8ff', 5, 140); }
      }
      for (let k = this.fish.length - 1; k >= 0; k--) if (this.fish[k].t > 1.0) this.fish.splice(k, 1);
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
      const t = this.t, RX = this.RX, RY = this.RY, ks = RX / this.RX0;
      const Wl = layer(this, 'waterL', g, W + 800, H, 400, 0, cg => this.paintWater(cg));
      g.drawImage(Wl.c, -400, 0, W + 800, H);
      // twinkles on the water
      g.fillStyle = '#ffffff';
      for (const s of this.spark) {
        const v = Math.sin(t * s.sp + s.ph); if (v < 0.55) continue;
        const a = (v - 0.55) / 0.45, R = 9 * s.s * a;
        g.globalAlpha = a * 0.9; g.beginPath(); g.moveTo(s.x - R, s.y); g.lineTo(s.x, s.y - R * 0.22); g.lineTo(s.x + R, s.y); g.lineTo(s.x, s.y + R * 0.22); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(s.x, s.y - R * 0.7); g.lineTo(s.x + R * 0.18, s.y); g.lineTo(s.x, s.y + R * 0.7); g.lineTo(s.x - R * 0.18, s.y); g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
      // rolling wave crests
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4; g.lineCap = 'round';
      for (let i = 0; i < 30; i++) {
        const x = ((i * 233 + t * 14) % 2000) - 200, y = 120 + ((i * 137) % 760) + Math.sin(t + i) * 6;
        if (this.q(x, y) < 1.15) continue;
        g.beginPath(); g.arc(x, y, 20, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      }
      // swells that roll in toward the beach
      for (let k = 0; k < 3; k++) {
        const ph = ((t * 0.22 + k / 3) % 1), grow = 1.32 - ph * 0.22;
        g.globalAlpha = Math.sin(ph * Math.PI) * 0.35; g.strokeStyle = '#ffffff'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(CX, CY + 6, (RX + 34) * grow, (RY + 30) * grow, 0, 0, TAU); g.stroke();
      }
      g.globalAlpha = 1;
      // fish leaping
      for (const f of this.fish) {
        const k = Math.min(1, f.t / 0.9), x = f.x + f.dir * 110 * k, y = f.y - Math.sin(k * Math.PI) * 78, ang = Math.atan2(-Math.cos(k * Math.PI) * 78 * Math.PI, f.dir * 110);
        if (k >= 1) continue;
        g.save(); g.translate(x, y); g.rotate(ang); if (f.dir < 0) g.scale(1, -1);
        g.fillStyle = f.c; g.beginPath(); g.ellipse(0, 0, 16, 8, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(-12, 0); g.lineTo(-24, -8); g.lineTo(-24, 8); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(2, -3, 8, 2.5, 0, 0, TAU); g.fill();
        g.fillStyle = '#2b2340'; g.beginPath(); g.arc(9, -2, 1.8, 0, TAU); g.fill();
        g.restore();
        if (k < 0.15 || k > 0.85) { g.fillStyle = 'rgba(255,255,255,.7)'; for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x + rnd(-8, 8), y + rnd(0, 8), 3, 0, TAU); g.fill(); } }
      }
      // the duck
      const dk = this.duck; g.fillStyle = 'rgba(20,90,140,.25)'; g.beginPath(); g.ellipse(dk.x + 2, dk.y + 12, 26, 7, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffd21f'; g.beginPath(); g.ellipse(dk.x, dk.y, 22, 14, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(dk.x + 14, dk.y - 14, 10, 0, TAU); g.fill();
      g.fillStyle = '#ffe680'; g.beginPath(); g.ellipse(dk.x - 4, dk.y - 3, 10, 5, -0.2, 0, TAU); g.fill();
      g.fillStyle = '#ff8a1f'; g.beginPath(); g.moveTo(dk.x + 22, dk.y - 16); g.lineTo(dk.x + 32, dk.y - 13); g.lineTo(dk.x + 22, dk.y - 10); g.fill(); g.fillStyle = '#2b2340'; g.beginPath(); g.arc(dk.x + 16, dk.y - 17, 2.2, 0, TAU); g.fill();
      // foam round the shore: a soft ring plus bubbly blobs that come and go
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(CX, CY, RX + 34 + Math.sin(t * 2) * 5, RY + 30 + Math.sin(t * 2) * 4, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (const f of this.foam) {
        const w = Math.sin(t * 2 + f.ph), x = CX + Math.cos(f.a) * (RX + 30 + w * 4), y = CY + Math.sin(f.a) * (RY + 26 + w * 3);
        g.beginPath(); g.arc(x, y, f.r * (0.75 + 0.25 * Math.sin(t * 3 + f.ph * 2)) * ks, 0, TAU); g.fill();
      }
      // the island (cached; drawn smaller as it shrinks)
      const Il = layer(this, 'islandL', g, IW * 2, IH * 2, IW, IH, cg => this.paintIsland(cg));
      g.drawImage(Il.c, CX - IW * ks, CY - IH * ks, IW * 2 * ks, IH * 2 * ks);
      // sunlight dapples drifting over the grass
      g.fillStyle = 'rgba(255,255,220,.08)';
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(CX + Math.sin(t * 0.3 + k * 1.7) * RX * 0.5, CY + Math.cos(t * 0.25 + k * 2.1) * RY * 0.45, 120 * ks, 60 * ks, 0, 0, TAU); g.fill(); }
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
        drawCritter(g, e.x, e.y + k * 24, e.r * (1 - k * 0.45), e.p.col, e.p.animal, { face: e.face, stun: true, rot: e.stT * 9, alpha: 1 - k * 0.3, noShadow: true, step: 0, moving: false });
      }
      const list = this.es.filter(e => !e.out && e.st === 'ok').sort((a, b) => a.y - b.y);
      for (const e of list) {
        const C = PARTY_COLORS[e.p.col];
        e.trail.forEach((q, i) => { g.globalAlpha = 0.22 - i * 0.035; g.fillStyle = C.c; g.beginPath(); g.arc(q.x, q.y, e.r * (1 - i * 0.07), 0, TAU); g.fill(); });
        g.globalAlpha = 1;
        // dash ready glow under feet
        if (e.cd <= 0 && e.dashT <= 0) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.82, e.r * 0.9, e.r * 0.3, 0, 0, TAU); g.stroke(); }
        if (this.teams) { g.strokeStyle = TEAMS[e.p.team].c; g.lineWidth = 4; g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.82, e.r * 1.02, e.r * 0.36, 0, 0, TAU); g.stroke(); }
        const tt = e.teeter > 0, wob = tt ? Math.sin(t * 22) * 0.18 : 0;
        if (e.dashT > 0) { g.globalAlpha = 0.3; g.fillStyle = C.c; for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(e.x - e.dx * k * 16, e.y - e.dy * k * 16, e.r * (1 - k * 0.12), 0, TAU); g.fill(); } g.globalAlpha = 1; }
        const moving = Math.hypot(e.mvx, e.mvy) > 30, hop = moving ? Math.abs(Math.sin(e.step * 0.5)) * 5 : 0, sq = e.squash;
        const alpha = e.inv > 0 && (t * 10 | 0) % 2 ? 0.5 : 1;
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: sq, rot: wob, stun: tt && e.teeter > 0.25, alpha, blink: (t + e.p.uid) % 3.5 < 0.12, hop, step: e.step, moving });
        g.globalAlpha = alpha;
        goggles(g, e.x, e.y, e.r, hop + (moving ? Math.abs(Math.sin(e.step)) * e.r * 0.06 : 0), wob, sq, C.c, e.p.animal === 5);
        g.globalAlpha = 1;
        if (tt) {   // whoa — right on the edge
          g.fillStyle = '#ff3b4a'; g.font = '900 34px "Fredoka",system-ui'; g.textAlign = 'center'; g.fillText('!', e.x + e.r * 0.9, e.y - e.r - 6);
          g.fillStyle = '#7fd0ff'; g.beginPath(); g.ellipse(e.x - e.r * 0.85, e.y - e.r * 0.5, 5, 8, -0.3, 0, TAU); g.fill();
        }
        drawTag(g, e.x, e.y - e.r - 28, e.p);
        if (!this.kid) for (let h = 0; h < e.lives; h++) { g.fillStyle = '#ff4f6d'; g.font = '20px system-ui'; g.textAlign = 'center'; g.fillText('♥', e.x - (e.lives - 1) * 11 + h * 22, e.y + e.r + 18); }
      }
      // seagulls glide over everything (their shadows on the water)
      for (const s of this.gulls) {
        const fl = Math.sin(s.ph * 7) * 0.6, d = s.vx > 0 ? 1 : -1, sc = s.s;
        g.fillStyle = 'rgba(20,70,110,.18)'; g.beginPath(); g.ellipse(s.x + 20, s.y + 90, 22 * sc, 6 * sc, 0, 0, TAU); g.fill();
        g.strokeStyle = '#ffffff'; g.lineWidth = 5 * sc; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(s.x - 26 * sc, s.y - 10 * sc * fl - 4); g.quadraticCurveTo(s.x - 12 * sc, s.y - 14 * sc * fl - 8, s.x, s.y); g.quadraticCurveTo(s.x + 12 * sc, s.y - 14 * sc * fl - 8, s.x + 26 * sc, s.y - 10 * sc * fl - 4); g.stroke();
        g.strokeStyle = '#6b7a8f'; g.lineWidth = 2.5 * sc;
        g.beginPath(); g.moveTo(s.x - 26 * sc, s.y - 10 * sc * fl - 4); g.lineTo(s.x - 20 * sc, s.y - 12 * sc * fl - 6); g.moveTo(s.x + 26 * sc, s.y - 10 * sc * fl - 4); g.lineTo(s.x + 20 * sc, s.y - 12 * sc * fl - 6); g.stroke();
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(s.x, s.y + 1, 9 * sc, 5 * sc, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffb21f'; g.beginPath(); g.moveTo(s.x + d * 8 * sc, s.y); g.lineTo(s.x + d * 14 * sc, s.y + 1.5); g.lineTo(s.x + d * 8 * sc, s.y + 3); g.fill();
      }
    }
    drawSwimmer(g, e, t, hop) {
      const C = PARTY_COLORS[e.p.col];
      if (hop) {   // jumping back up onto the island
        const k = Math.min(1, (e.stT - 1.5) / 0.4), hh = Math.sin(k * Math.PI) * 50;
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, hop: hh, happy: true, step: 0, moving: false });
        goggles(g, e.x, e.y, e.r, hh, 0, 0, C.c, e.p.animal === 5);
        return;
      }
      const bob = Math.sin(t * 8 + e.p.uid) * 3, r = e.r * 0.9, ry = e.y + 12 + bob;
      g.fillStyle = 'rgba(20,90,140,.35)'; g.beginPath(); g.ellipse(e.x, e.y + 14 + bob, r * 1.25, r * 0.42, 0, 0, TAU); g.fill();
      floatRing(g, e.x, ry, r * 1.15, r * 0.4, C.c, false);
      g.save(); g.beginPath(); g.rect(e.x - 80, e.y - 140, 160, 152 + bob); g.clip();
      drawCritter(g, e.x, e.y + bob - r * 0.25, r, e.p.col, e.p.animal, { face: Math.PI / 2, noShadow: true, happy: (t * 2 | 0) % 2 === 0, step: 0, moving: false });
      goggles(g, e.x, e.y + bob - r * 0.25, r, 0, 0, 0, C.c, e.p.animal === 5);
      g.restore();
      floatRing(g, e.x, ry, r * 1.15, r * 0.4, C.c, true);
      // little paddling splashes and a wake
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, e.y + 12, r * 1.6, r * 0.55, 0, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.8)';
      for (const s of [-1, 1]) { const k = (t * 4 + (s > 0 ? 0.5 : 0)) % 1; g.globalAlpha = 1 - k; g.beginPath(); g.arc(e.x + s * r * 1.35, ry - k * 14, 4 + k * 3, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
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
