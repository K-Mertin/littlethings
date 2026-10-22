'use strict';
/* 塗塗樂 — paint the floor in your colour; most floor after 60 s wins.
   小朋友: big brush, the splash just paints. 大人: faster on your own colour,
   slower on others', and a splash stuns anyone caught in it.
   Pick-ups (both modes): 🪣 大刷子 makes your brush huge for a while, 👟 快跑鞋 makes you fast. */
(() => {
  const X0 = 70, Y0 = 158, FW = 1460, FH = 680, CS = 20, GW = FW / CS, GH = FH / CS;
  const FLOOR = '#fffaf0', BIG_T = 5, FAST_T = 4.5;
  const FONT = '"Noto Sans TC",system-ui,sans-serif';

  /* colour helpers: k > 0 mixes toward white, k < 0 toward black */
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), f = v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k));
    return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`;
  }
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }

  /* one irregular paint splat as a single path: a core, lumpy lobes, tapered streaks with a bead
     at the end, and a few loose flecks. Every sub-shape winds the same way so they all add up. */
  function splatPath(g, x, y, r, spikes, flecks) {
    g.beginPath();
    g.moveTo(x + r * 0.74, y); g.arc(x, y, r * 0.74, 0, TAU);
    const n = 7 + rint(4);
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU + rnd(-0.3, 0.3), d = r * rnd(0.5, 0.78), s = r * rnd(0.22, 0.4), cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
      g.moveTo(cx + s, cy); g.arc(cx, cy, s, 0, TAU);
    }
    for (let k = 0; k < spikes; k++) {
      const a = rnd(0, TAU), L = r * rnd(1.05, 1.55), w = r * rnd(0.06, 0.11), ca = Math.cos(a), sa = Math.sin(a);
      const bx = x + ca * r * 0.55, by = y + sa * r * 0.55, ex = x + ca * L, ey = y + sa * L;
      g.moveTo(bx + sa * w * 1.8, by - ca * w * 1.8); g.lineTo(ex + sa * w, ey - ca * w); g.lineTo(ex - sa * w, ey + ca * w); g.lineTo(bx - sa * w * 1.8, by + ca * w * 1.8); g.closePath();
      const b = w * 1.6; g.moveTo(ex + b, ey); g.arc(ex, ey, b, 0, TAU);
    }
    for (let k = 0; k < flecks; k++) {
      const a = rnd(0, TAU), d = r * rnd(1.15, 1.8), s = rnd(2.5, Math.max(3, r * 0.07)), cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
      g.moveTo(cx + s, cy); g.arc(cx, cy, s, 0, TAU);
    }
  }

  /* pick-up pictures */
  function drawBucket(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#5a4a6a';
    g.beginPath(); g.ellipse(0, -18, 18, 22, 0, Math.PI, TAU); g.stroke();                      // handle
    g.fillStyle = '#c9d3e0'; g.beginPath(); g.moveTo(-19, -14); g.lineTo(19, -14); g.lineTo(15, 18); g.quadraticCurveTo(0, 23, -15, 18); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#eef3f8'; g.fillRect(-12, -10, 5, 22);
    const cols = ['#ff4f58', '#ffbf1f', '#22c26a', '#2f8cff', '#9b5cff'];
    for (let k = 0; k < 5; k++) { g.fillStyle = cols[k]; g.beginPath(); g.ellipse(-12 + k * 6, -14, 5, 4, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#ff6fb7'; g.beginPath(); g.moveTo(10, -14); g.quadraticCurveTo(14, -2, 11, 4); g.arc(11, 4, 3.4, 0, Math.PI); g.quadraticCurveTo(7, -4, 4, -14); g.fill();   // a drip down the side
    g.restore();
  }
  function drawShoe(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#7a1f2a';
    g.fillStyle = '#ff4f58'; g.beginPath(); g.moveTo(-18, -14); g.lineTo(-4, -14); g.quadraticCurveTo(2, -2, 16, 0); g.quadraticCurveTo(24, 2, 22, 10); g.lineTo(-20, 10); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(-21, 8, 44, 6); g.strokeRect(-21, 8, 44, 6);
    g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-8, -6); g.lineTo(2, -3); g.moveTo(-6, 0); g.lineTo(6, 2); g.stroke();
    g.fillStyle = '#ffe066'; g.strokeStyle = '#c99a00'; g.lineWidth = 2;   // a little wing
    g.beginPath(); g.moveTo(-20, -8); g.quadraticCurveTo(-34, -22, -30, -4); g.quadraticCurveTo(-36, -8, -32, 2); g.quadraticCurveTo(-26, 4, -20, 0); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  function drawCrown(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#ffd21f'; g.strokeStyle = '#b87900'; g.lineWidth = 2.5; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-16, 8); g.lineTo(-18, -8); g.lineTo(-8, 0); g.lineTo(0, -12); g.lineTo(8, 0); g.lineTo(18, -8); g.lineTo(16, 8); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff4f6d'; g.beginPath(); g.arc(0, 3, 3, 0, TAU); g.fill();
    g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(-10, 2, 2, 0, TAU); g.arc(10, 2, 2, 0, TAU); g.fill();
    g.restore();
  }
  const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * k; };

  class Paint {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.dur = 60; this.over = false; this.teams = !!ctx.teams;
      this.edge = '#d9b98a';
      this.own = new Int8Array(GW * GH).fill(-1); this.painter = new Int8Array(GW * GH).fill(-1); this.total = GW * GH;
      const n = ctx.players.length, order = this.teams ? ctx.players.slice().sort((a, b) => a.team - b.team) : ctx.players;
      this.es = ctx.players.map((p, i) => {
        const j = order.indexOf(p), mates = order.filter(q => q.team === p.team);
        const a = this.teams ? (p.team ? 0 : Math.PI) + (mates.indexOf(p) - (mates.length - 1) / 2) * 0.7 : -Math.PI / 2 + j * TAU / n + Math.PI / n, rr = n === 1 ? 0 : 1;
        const x = X0 + FW / 2 + Math.cos(a) * FW * 0.36 * rr, y = Y0 + FH / 2 + Math.sin(a) * FH * 0.34 * rr;
        return { p, i, x, y, px: x, py: y, vx: 0, vy: 0, face: a + Math.PI, r: 32, cd: 0, stun: 0, mine: 0, squash: 0, walk: 0, moving: false,
          big: 0, fast: 0, edgeAcc: 0, happy: 0, oid: this.teams ? p.team : i };
      });
      this.cnt = new Array(this.teams ? 2 : n).fill(0);
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.order = this.es.slice();
      // paint colours, with a lighter and darker tint for a mottled, real-paint look
      this.cols = this.cnt.map((_, o) => { const c = this.teams ? TEAMS[o].c : PARTY_COLORS[this.es[o].p.col].c; return { c, lt: shade(c, 0.22), dk: shade(c, -0.14), soft: rgba(c, 0.55) }; });
      this.drops = []; this.pick = []; this.pickT = this.kid ? 5 : 7; this.lead = null; this.leadT = 0;
      this.makeLayer(); this.makeBg();
    }
    /* the floor that gets painted on (clipped once, so paint never leaves the rounded field) */
    makeLayer() {
      const c = this.layer = document.createElement('canvas'); c.width = FW; c.height = FH;
      const g = this.lg = c.getContext('2d');
      g.beginPath(); g.roundRect(0, 0, FW, FH, 26); g.clip();
      g.fillStyle = FLOOR; g.fillRect(0, 0, FW, FH);
      g.strokeStyle = 'rgba(200,175,130,.22)'; g.lineWidth = 2; g.beginPath();
      for (let x = 80; x < FW; x += 80) { g.moveTo(x, 0); g.lineTo(x, FH); }
      for (let y = 80; y < FH; y += 80) { g.moveTo(0, y); g.lineTo(FW, y); }
      g.stroke();
      g.fillStyle = 'rgba(200,175,130,.3)';
      for (let y = 40; y < FH; y += 80) for (let x = 40; x < FW; x += 80) { g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill(); }
      g.lineCap = 'round'; g.lineJoin = 'round';
    }
    /* everything around the field never changes: draw it once */
    makeBg() {
      const c = this.bg = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      // studio floor: warm wooden planks
      g.fillStyle = '#e3c493'; g.fillRect(0, 0, W, H);
      for (let y = 0, row = 0; y < H; y += 46, row++) {
        g.fillStyle = row % 2 ? '#dcbb87' : '#e6c99a'; g.fillRect(0, y, W, 44);
        g.fillStyle = 'rgba(120,80,40,.18)'; g.fillRect(0, y + 44, W, 2);
        for (let x = (row % 3) * 130 - 60; x < W; x += 390) g.fillRect(x, y, 2, 44);
      }
      // old paint drips on the studio floor
      const pal = ['#ff4f58', '#2f8cff', '#ffbf1f', '#22c26a', '#9b5cff', '#ff6fb7'];
      g.globalAlpha = 0.5;
      for (const [x, y, r] of [[24, 220, 26], [1572, 420, 30], [30, 640, 22], [1574, 760, 20], [210, 878, 18], [1390, 880, 22], [700, 886, 14], [1040, 132, 12], [560, 138, 10]]) { g.fillStyle = pal[rint(6)]; splatPath(g, x, y, r, 3, 3); g.fill(); }
      g.globalAlpha = 1;
      // the canvas frame: soft drop shadow, wooden frame, thin white inner edge
      g.fillStyle = 'rgba(70,40,10,.22)'; g.beginPath(); g.roundRect(X0 - 12, Y0 - 4, FW + 24, FH + 24, 34); g.fill();
      g.fillStyle = '#b07a3e'; g.beginPath(); g.roundRect(X0 - 14, Y0 - 14, FW + 28, FH + 28, 36); g.fill();
      g.fillStyle = '#c99257'; g.beginPath(); g.roundRect(X0 - 10, Y0 - 10, FW + 20, FH + 20, 32); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.roundRect(X0 - 12, Y0 - 12, FW + 24, FH + 24, 34); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(X0 - 3, Y0 - 3, FW + 6, FH + 6, 28); g.fill();
      // colour dots on the frame, like a painter's palette
      for (let k = 0; k < 14; k++) { const x = X0 + 60 + k * (FW - 120) / 13; g.fillStyle = pal[k % 6]; g.beginPath(); g.arc(x, Y0 + FH + 8, 4, 0, TAU); g.fill(); }
      // paint pots peeking in at the bottom corners
      for (const [x, col] of [[34, '#ff4f58'], [1566, '#2f8cff']]) {
        g.fillStyle = '#9aa7b8'; g.beginPath(); g.roundRect(x - 24, 852, 48, 50, 8); g.fill();
        g.fillStyle = '#c9d3e0'; g.beginPath(); g.ellipse(x, 852, 24, 9, 0, 0, TAU); g.fill();
        g.fillStyle = col; g.beginPath(); g.ellipse(x, 853, 19, 6, 0, 0, TAU); g.fill();
        g.fillStyle = col; g.beginPath(); g.roundRect(x - 26, 868, 52, 12, 4); g.fill();
      }
    }
    colOf(oid) { return this.cols[oid].c; }
    brush(e) { return (this.kid ? 44 : 36) * (e.big > 0 ? 1.65 : 1); }
    /* take cells inside a circle (the score), without drawing */
    claim(e, x, y, r) {
      const lx = x - X0, ly = y - Y0;
      const c0 = Math.max(0, Math.floor((lx - r) / CS)), c1 = Math.min(GW - 1, Math.floor((lx + r) / CS));
      const r0 = Math.max(0, Math.floor((ly - r) / CS)), r1 = Math.min(GH - 1, Math.floor((ly + r) / CS)), rr = r * r;
      for (let cy = r0; cy <= r1; cy++) {
        const dy = cy * CS + CS / 2 - ly;
        for (let cx = c0; cx <= c1; cx++) {
          const dx = cx * CS + CS / 2 - lx; if (dx * dx + dy * dy > rr) continue;
          const k = cy * GW + cx, o = this.own[k];
          if (o === e.oid) continue;
          if (o >= 0) this.cnt[o]--;
          this.own[k] = e.oid; this.painter[k] = e.i; this.cnt[e.oid]++;
        }
      }
    }
    /* a roller stroke from where you were to where you are, with lumpy edges and the odd fleck */
    roll(e, x0, y0, x1, y1, r) {
      const g = this.lg, C = this.cols[e.oid], ax = x0 - X0, ay = y0 - Y0, bx = x1 - X0, by = y1 - Y0, d = hyp(bx - ax, by - ay);
      g.fillStyle = C.c; g.strokeStyle = C.c;
      if (d < 0.5) { g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill(); }
      else { g.lineWidth = r * 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
      this.claim(e, x1, y1, r);
      e.edgeAcc += d;
      if (e.edgeAcc < 15) return;
      e.edgeAcc = 0;
      const nx = d ? -(by - ay) / d : 1, ny = d ? (bx - ax) / d : 0;
      for (const s of [-1, 1]) {
        const off = r * rnd(0.82, 0.98), br = r * rnd(0.12, 0.26);
        g.fillStyle = Math.random() < 0.3 ? C.dk : C.c; g.beginPath(); g.arc(bx + nx * s * off, by + ny * s * off, br, 0, TAU); g.fill();
      }
      if (Math.random() < 0.35) { const s = Math.random() < 0.5 ? -1 : 1, off = r * rnd(1.15, 1.5); g.fillStyle = C.c; g.beginPath(); g.arc(bx + nx * s * off, by + ny * s * off, rnd(2.5, 5), 0, TAU); g.fill(); }
      if (Math.random() < 0.25) { g.fillStyle = C.lt; g.beginPath(); g.ellipse(bx + rnd(-r, r) * 0.5, by + rnd(-r, r) * 0.5, r * 0.3, r * 0.12, Math.atan2(by - ay, bx - ax), 0, TAU); g.fill(); }
    }
    /* a big splat on the floor (for the splash and flying drops) */
    splat(e, x, y, r, spikes, flecks) {
      const C = this.cols[e.oid], g = this.lg;
      g.save(); g.translate(-X0, -Y0);
      g.fillStyle = C.c; splatPath(g, x, y, r, spikes, flecks); g.fill();
      if (r > 30) { g.fillStyle = C.lt; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.25, r * 0.32, r * 0.16, -0.5, 0, TAU); g.fill(); g.globalAlpha = 1; }
      g.restore();
      this.claim(e, x, y, r * 0.86);
    }
    under(x, y) { const cx = Math.floor((x - X0) / CS), cy = Math.floor((y - Y0) / CS); return cx < 0 || cy < 0 || cx >= GW || cy >= GH ? -1 : this.own[cy * GW + cx]; }
    leader() {
      let best = null, tie = false;
      for (const e of this.es) { const c = this.cnt[e.oid]; if (!best || c > this.cnt[best.oid]) { best = e; tie = false; } else if (c === this.cnt[best.oid]) tie = true; }
      return best && !tie && this.cnt[best.oid] > 0 ? best : null;
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      for (const e of this.es) {
        e.cd -= dt; e.big -= dt; e.fast -= dt; e.happy -= dt; e.squash *= Math.exp(-9 * dt);
        e.px = e.x; e.py = e.y;
        if (e.stun > 0) {
          e.stun -= dt; e.vx *= 0.8; e.vy *= 0.8; e.moving = false;
          e.x = clamp(e.x + e.vx * dt, X0 + e.r * 0.6, X0 + FW - e.r * 0.6); e.y = clamp(e.y + e.vy * dt, Y0 + e.r * 0.6, Y0 + FH - e.r * 0.6);
          continue;
        }
        const i = ctx.input(e.p), mv = !!(i.x || i.y);
        let sp = kid ? 340 : 330;
        if (!kid) { const o = this.under(e.x, e.y); sp *= o === e.oid ? 1.25 : o >= 0 ? 0.78 : 1; }
        if (e.fast > 0) sp *= 1.45;
        // snappy start, quick stop: no sliding past where you meant to go
        const turn = mv && (e.vx * i.x + e.vy * i.y) < 0 ? 1.6 : 1, k = 1 - Math.exp(-(mv ? 13 * turn : 22) * dt);
        e.vx += (i.x * sp - e.vx) * k; e.vy += (i.y * sp - e.vy) * k;
        if (mv && !e.moving) e.squash = -0.1;           // stretch as you set off
        if (!mv && e.moving) e.squash = 0.12;           // squash as you stop
        e.moving = mv;
        if (mv) { e.face = angLerp(e.face, Math.atan2(i.y, i.x), 1 - Math.exp(-16 * dt)); e.walk += dt * (9 + hyp(e.vx, e.vy) / 45); }
        else e.walk = 0;
        e.x = clamp(e.x + e.vx * dt, X0 + e.r * 0.6, X0 + FW - e.r * 0.6); e.y = clamp(e.y + e.vy * dt, Y0 + e.r * 0.6, Y0 + FH - e.r * 0.6);
        Fx.walk(e, dt, this.cols[e.oid].soft);
        if (ctx.pressed(e.p, 0) && e.cd <= 0) this.splash(e);
      }
      if (!kid) {   // grown-ups bump into each other
        for (let a = 0; a < this.es.length; a++) for (let b = a + 1; b < this.es.length; b++) {
          const A = this.es[a], B = this.es[b], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r;
          if (d < m && d > 0) { const o = (m - d) / 2; A.x -= dx / d * o; A.y -= dy / d * o; B.x += dx / d * o; B.y += dy / d * o; }
        }
      }
      for (const e of this.es) if (e.stun <= 0) this.roll(e, e.px, e.py + 6, e.x, e.y + 6, this.brush(e));
      // flying paint drops land as little splats
      for (const d of this.drops) d.t += dt;
      this.drops = this.drops.filter(d => { if (d.t < d.T) return true; this.splat(d.e, d.x, d.y, d.r, 2, 2); return false; });
      this.pickups(dt);
      // who's ahead (solo): a little cheer when the lead changes hands
      if (!this.teams && this.es.length > 1) {
        const L = this.leader(); this.leadT -= dt;
        if (L && L !== this.lead && this.leadT <= 0 && this.t > 3) { Fx.pop(L.x, L.y - L.r - 90, '領先！', '#e09a00', 34); this.leadT = 2.5; }
        this.lead = L;
      }
      if (this.t >= this.dur) this.over = true;
    }
    pickups(dt) {
      const ctx = this.ctx;
      this.pickT -= dt;
      if (this.pickT <= 0 && this.t < this.dur - 4) {
        this.pickT = this.kid ? rnd(6, 8) : rnd(7, 10);
        if (this.pick.length < 2) {
          // somewhere away from everyone, so it is a little race to get it
          let best = null, bd = -1;
          for (let k = 0; k < 10; k++) {
            const x = rnd(X0 + 90, X0 + FW - 90), y = rnd(Y0 + 90, Y0 + FH - 70);
            let d = 9999; for (const e of this.es) d = Math.min(d, hyp(e.x - x, e.y - y)); for (const q of this.pick) d = Math.min(d, hyp(q.x - x, q.y - y));
            if (d > bd) { bd = d; best = { x, y }; }
          }
          const kind = this.pick.some(q => q.kind === 'bucket') ? 'shoe' : this.pick.some(q => q.kind === 'shoe') ? 'bucket' : Math.random() < 0.55 ? 'bucket' : 'shoe';
          this.pick.push({ kind, x: best.x, y: best.y, h: 420, vh: 0, land: 0, t: 0 });
          ctx.sfx('whoosh');
        }
      }
      for (const q of this.pick) {
        q.t += dt; q.land -= dt;
        if (q.h > 0 || q.vh > 0) {
          q.vh -= 1500 * dt; q.h += q.vh * dt;
          if (q.h <= 0) { q.h = 0; if (q.vh < -250) { q.vh = -q.vh * 0.38; q.land = 0.25; Fx.dust(q.x - 14, q.y + 12, null, 10); Fx.dust(q.x + 14, q.y + 12, null, 10); } else q.vh = 0; }
        }
        if (q.h > 12) continue;
        for (const e of this.es) {
          if (e.stun > 0 || hyp(e.x - q.x, e.y - q.y) > e.r + 30) continue;
          q.gone = true; e.happy = 0.8; e.squash = -0.16;
          const col = this.colOf(e.oid);
          if (q.kind === 'bucket') { e.big = BIG_T; Fx.pop(q.x, q.y - 50, '大刷子！', col, 44); }
          else { e.fast = FAST_T; Fx.pop(q.x, q.y - 50, '快跑鞋！', col, 44); }
          Fx.ring(q.x, q.y, col, 110, 0.5); Fx.burst(q.x, q.y, '#ffe066', 12, 300);
          ctx.sfx('star'); ctx.buzz(e.p, 80);
          break;
        }
      }
      this.pick = this.pick.filter(q => !q.gone);
    }
    splash(e) {
      const ctx = this.ctx, R = (this.kid ? 125 : 108) * (e.big > 0 ? 1.25 : 1), col = this.colOf(e.oid);
      e.cd = this.kid ? 3 : 4.5; e.squash = 0.28;
      this.splat(e, e.x, e.y + 6, R * 0.82, 7 + rint(4), 6);
      for (let k = 0; k < 11; k++) {
        const a = rnd(0, TAU), d = rnd(R * 0.75, R * 1.3);
        this.drops.push({ e, x: e.x + Math.cos(a) * d, y: e.y + 6 + Math.sin(a) * d, r: rnd(13, 26), t: 0, T: rnd(0.12, 0.32), sx: e.x, sy: e.y - 10 });
      }
      Fx.ring(e.x, e.y, col, R * 1.25, 0.45); Fx.ring(e.x, e.y, '#ffffff', R * 0.8, 0.3);
      Fx.burst(e.x, e.y, col, 16, 420); Fx.burst(e.x, e.y, '#ffffff', 6, 260);
      Fx.pop(e.x, e.y - e.r - 60, '啪！', col, 46);
      Fx.shake(this.kid ? 7 : 9);
      ctx.sfx('splat'); ctx.buzz(e.p, 50);
      if (!this.kid) {
        let hit = false;
        for (const o of this.es) {
          if (o === e || o.stun > 0 || (this.teams && o.p.team === e.p.team)) continue;
          if (hyp(o.x - e.x, o.y - e.y) < R + o.r * 0.5) {
            hit = true; o.stun = 1.0; o.squash = 0.3; ctx.buzz(o.p, 220);
            const d = hyp(o.x - e.x, o.y - e.y) || 1; o.vx = (o.x - e.x) / d * 260; o.vy = (o.y - e.y) / d * 260;
            Fx.pop(o.x, o.y - 70, '暈～', '#2b2340', 34); ctx.sfx('stun');
          }
        }
        if (hit) { ctx.hitstop(0.05); Fx.shake(14); Fx.flash(col, 0.18); }
      }
    }
    pct(e) { return Math.round(this.cnt[e.oid] / this.total * 100); }
    teamScore(t) { return Math.round(this.cnt[t] / this.total * 100) + '%'; }
    center() {
      if (this.teams || this.es.length < 2) return '';
      const L = this.lead; return L ? '👑 領先：' + L.p.name + '　' + this.pct(L) + '%' : this.t > 3 ? '不相上下，加油！' : '快去塗顏色！';
    }
    draw(g, clock) {
      const t = this.t, tt = clock || t;
      g.fillStyle = this.edge; g.fillRect(-400, 0, W + 800, H);
      g.drawImage(this.bg, 0, 0);
      g.drawImage(this.layer, X0, Y0);
      // pick-ups: a shadow, a glowing pad and a gentle bob
      for (const q of this.pick) {
        const bob = q.h > 0 ? 0 : Math.sin(tt * 4 + q.x) * 4, k = Math.min(1, q.h / 420), pulse = 0.5 + 0.5 * Math.sin(tt * 6);
        g.fillStyle = 'rgba(40,25,60,.2)'; g.beginPath(); g.ellipse(q.x, q.y + 20, 24 * (1 - k * 0.5), 8 * (1 - k * 0.5), 0, 0, TAU); g.fill();
        if (q.h <= 0) { g.fillStyle = `rgba(255,236,120,${0.25 + pulse * 0.2})`; g.beginPath(); g.arc(q.x, q.y + 4, 36 + pulse * 6, 0, TAU); g.fill(); }
        const sq = q.land > 0 ? q.land * 1.2 : 0;
        g.save(); g.translate(q.x, q.y - q.h + bob); g.scale(1 + sq, 1 - sq);
        if (q.kind === 'bucket') drawBucket(g, 0, 0, 1.2); else drawShoe(g, 0, 0, 1.2);
        g.restore();
        if (q.h <= 0) {
          g.font = `900 20px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = '#fff'; g.fillStyle = '#5a3a8a';
          const s = q.kind === 'bucket' ? '大刷子' : '快跑鞋'; g.strokeText(s, q.x, q.y + 44); g.fillText(s, q.x, q.y + 44);
        }
      }
      Fx.ground(g);
      // paint drops in flight
      for (const d of this.drops) {
        const k = d.t / d.T, x = d.sx + (d.x - d.sx) * k, y = d.sy + (d.y - d.sy) * k - Math.sin(k * Math.PI) * 70, a = Math.atan2(d.y - d.sy, d.x - d.sx);
        g.fillStyle = this.colOf(d.e.oid); g.beginPath(); g.ellipse(x, y, 13, 8, a, 0, TAU); g.fill();
      }
      const list = this.order; list.sort((a, b) => a.y - b.y);
      for (const e of list) {
        const C = this.cols[e.oid], s = e.moving ? Math.abs(Math.sin(e.walk)) : 0;
        const hop = s * 7, sq = e.squash + (e.moving ? Math.pow(1 - s, 3) * 0.07 - s * 0.03 : 0);
        // your paint colour on the ground under you, and the splash cooldown around it
        g.fillStyle = C.dk; g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.8, e.r * 1.12, e.r * 0.42, 0, 0, TAU); g.fill();
        if (e.cd > 0 && e.stun <= 0) {
          const full = this.kid ? 3 : 4.5;
          g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 5; g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.8, e.r * 1.3, e.r * 0.52, 0, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - e.cd / full)); g.stroke();
        }
        if (e.fast > 0 && e.moving) {   // speed lines
          const m = hyp(e.vx, e.vy) || 1, ux = e.vx / m, uy = e.vy / m;
          g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; g.beginPath();
          for (let k = -1; k <= 1; k++) { const ox = -uy * k * 16, oy = ux * k * 14, L = 28 + ((tt * 9 + k) % 1) * 18; g.moveTo(e.x - ux * (e.r + 4) + ox, e.y - uy * (e.r + 4) + oy); g.lineTo(e.x - ux * (e.r + 4 + L) + ox, e.y - uy * (e.r + 4 + L) + oy); }
          g.stroke();
        }
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: sq, hop, stun: e.stun > 0, happy: e.happy > 0, blink: (tt + e.p.uid * 1.3) % 3.6 < 0.12, rot: e.stun > 0 ? Math.sin(t * 20) * 0.2 : (e.moving ? Math.cos(e.face) * 0.08 : 0) });
        if (e.stun > 0) { g.fillStyle = '#ffd21f'; g.font = '22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let k = 0; k < 3; k++) { const a = t * 6 + k * TAU / 3; g.fillText('★', e.x + Math.cos(a) * 30, e.y - e.r - 6 + Math.sin(a) * 8); } }
        // power-ups: an icon with a shrinking ring beside the head
        let ix = e.x + e.r + 14;
        for (const [v, full, fn] of [[e.big, BIG_T, drawBucket], [e.fast, FAST_T, drawShoe]]) {
          if (v <= 0) continue;
          const y = e.y - e.r - 4;
          g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(ix, y, 19, 0, TAU); g.fill();
          g.strokeStyle = v < 1.2 && (tt * 8 | 0) % 2 ? '#ff3b4a' : C.c; g.lineWidth = 4; g.beginPath(); g.arc(ix, y, 19, -Math.PI / 2, -Math.PI / 2 + TAU * v / full); g.stroke();
          fn(g, ix, y + 1, 0.55); ix += 40;
        }
        drawTag(g, e.x, e.y - e.r - 28 - hop * 0.5, e.p);
        if (e === this.lead) drawCrown(g, e.x, e.y - e.r - 58 - hop * 0.5 + Math.sin(tt * 4) * 3, 1);
      }
      this.drawBar(g);
    }
    /* territory bar along the bottom, biggest first, with the percentages */
    drawBar(g) {
      const bx = X0 + 220, bw = FW - 440, by = Y0 + FH + 12, bh = 26;
      g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(bx - 6, by - 4, bw + 12, bh + 8, 17); g.fill();
      g.save(); g.beginPath(); g.roundRect(bx, by, bw, bh, 13); g.clip();
      g.fillStyle = '#efe6d6'; g.fillRect(bx, by, bw, bh);
      let x = bx;
      g.font = `900 17px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let o = 0; o < this.cnt.length; o++) {
        const w = bw * this.cnt[o] / this.total; if (w <= 0) continue;
        g.fillStyle = this.cols[o].c; g.fillRect(x, by, w, bh);
        g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x, by + 3, w, 6);
        if (w > 44) { g.fillStyle = '#fff'; g.fillText(Math.round(this.cnt[o] / this.total * 100) + '%', x + w / 2, by + bh / 2 + 1); }
        x += w;
      }
      g.restore();
    }
    chip(p) { return this.pct(this.by.get(p)) + '%'; }
    pad(p) {
      const e = this.by.get(p);
      return (this.teams ? '你們隊塗了 ' : '塗了 ') + this.pct(e) + '%' + (e.stun > 0 ? '　暈～' : e.big > 0 ? '　🪣 大刷子！' : e.fast > 0 ? '　👟 快跑鞋！' : '');
    }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && e.stun <= 0; }
    results() {
      if (this.teams) {
        // each player's share of their team's floor: the cells they were the last to paint
        for (const e of this.es) e.mine = 0;
        for (let k = 0; k < this.total; k++) { const w = this.painter[k]; if (w >= 0) this.es[w].mine++; }
        return { teamScores: [this.cnt[0], this.cnt[1]], teamText: t => this.teamScore(t), rows: this.es.slice().sort((a, b) => b.mine - a.mine).map(e => ({ p: e.p, key: e.mine, line: `幫忙塗了 ${Math.round(e.mine / this.total * 100)}%` })) };
      }
      return { rows: this.es.slice().sort((a, b) => this.cnt[b.oid] - this.cnt[a.oid]).map(e => ({ p: e.p, key: this.cnt[e.oid], line: `塗了 ${this.pct(e)}%` })) };
    }
  }
  GAMES.push({
    id: 'paint', name: '塗塗樂', icon: '🎨', col: '#9b5cff', bg: '#d9b98a', kind: 'vs', teams: true, players: '1–6 人',
    blurb: '走到哪塗到哪，顏色最多的人贏！',
    btn: { label: '噴漆', icon: '💦' },
    rules: kid => kid
      ? ['走過的地方會塗上你的顏色', '按「噴漆」可以一次噴一大片', '撿到🪣大刷子會塗得更大片，👟快跑鞋跑得更快', '60 秒後，顏色最多的人贏']
      : ['走過的地方塗上你的顏色，60 秒後最多的人贏', '在自己的顏色上跑得快，在別人的顏色上會變慢', '「噴漆」會把附近的人噴暈 1 秒（4.5 秒才能再噴）', '搶🪣大刷子和👟快跑鞋，會互相擋路'],
    thumb(g) {
      g.fillStyle = FLOOR; g.fillRect(0, 0, 320, 180);
      const blob = (c, x, y, r) => { g.fillStyle = c; splatPath(g, x, y, r, 4, 3); g.fill(); };
      blob('#ff4f58', 60, 60, 46); blob('#ff4f58', 108, 88, 26);
      blob('#2f8cff', 258, 70, 48); blob('#2f8cff', 236, 132, 30);
      blob('#22c26a', 150, 150, 34);
      drawBucket(g, 290, 150, 0.8);
      drawCritter(g, 110, 92, 22, 0, 4, { face: 0.3 }); drawCritter(g, 230, 92, 22, 1, 5, { face: Math.PI }); drawCritter(g, 165, 140, 18, 3, 1, { face: -1 });
    },
    create: ctx => new Paint(ctx)
  });
})();
