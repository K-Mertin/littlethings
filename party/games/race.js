'use strict';
/* 跑跑賽道 — a top-down cartoon go-kart race round a bean-shaped track.
   Point the stick where you want to go: the kart turns that way and speeds up.
   The one button is 加速: a boost meter fills over time and from ⭐ on the track.
   Laps are counted from progress along the track's centreline, so driving the
   wrong way (or backing over the line) never earns a lap.
   小朋友: wide track, a gentle auto-steer that nudges you along the road, grass only
           slows you a little, and if you wander far off a cloud carries you back. 2 laps.
   大人:   narrower track, grass is slow, harder bumps, 🍌 peels spin you out. 3 laps. */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', NUM = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const GRASS = '#7fcf5b', SEG = 6, R = 30;
  // the bean: control points of a closed Catmull-Rom loop, driven clockwise on screen
  const CTRL = [[300, 292], [585, 262], [800, 384], [1015, 262], [1300, 292], [1442, 515], [1292, 750], [800, 758], [308, 750], [158, 515]];
  const START = [470, 758], BX = 880;
  const CONF = ['#ff4f58', '#2f8cff', '#ffbf1f', '#22c26a', '#9b5cff', '#ff6fb7', '#ffffff'];
  const angDiff = (a, b) => ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const fmt = t => Math.floor(t / 60) + ':' + (t % 60).toFixed(1).padStart(4, '0');

  /* ---------------- the track centreline: built once, shared ---------------- */
  let TRACK = null;
  function track() {
    if (TRACK) return TRACK;
    const n = CTRL.length, dense = [];
    for (let i = 0; i < n; i++) {
      const p0 = CTRL[(i - 1 + n) % n], p1 = CTRL[i], p2 = CTRL[(i + 1) % n], p3 = CTRL[(i + 2) % n];
      for (let k = 0; k < 40; k++) {
        const t = k / 40, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    const cum = [0];
    for (let i = 1; i <= dense.length; i++) { const a = dense[i - 1], b = dense[i % dense.length]; cum.push(cum[i - 1] + hyp(b[0] - a[0], b[1] - a[1])); }
    const total = cum[dense.length], N = Math.round(total / SEG), seg = total / N;
    const xs = new Float32Array(N), ys = new Float32Array(N), tx = new Float32Array(N), ty = new Float32Array(N);
    let j = 0;
    for (let k = 0; k < N; k++) {
      const s = k * seg; while (cum[j + 1] < s) j++;
      const a = dense[j], b = dense[(j + 1) % dense.length], u = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
      xs[k] = a[0] + (b[0] - a[0]) * u; ys[k] = a[1] + (b[1] - a[1]) * u;
    }
    for (let k = 0; k < N; k++) {
      const dx = xs[(k + 1) % N] - xs[(k - 1 + N) % N], dy = ys[(k + 1) % N] - ys[(k - 1 + N) % N], m = hyp(dx, dy) || 1;
      tx[k] = dx / m; ty[k] = dy / m;
    }
    let s0 = 0, best = 1e9;
    for (let k = 0; k < N; k++) { const d = hyp(xs[k] - START[0], ys[k] - START[1]); if (d < best) { best = d; s0 = k; } }
    return TRACK = { xs, ys, tx, ty, N, seg, L: total, i0: s0 };
  }
  /* nearest point on the centreline, searching around a known index (or everywhere) */
  function nearest(T, x, y, from, win) {
    let bi = 0, bt = 0, bd = 1e18;
    const scan = i => {
      const i2 = (i + 1) % T.N, ax = T.xs[i], ay = T.ys[i], dx = T.xs[i2] - ax, dy = T.ys[i2] - ay, l2 = dx * dx + dy * dy || 1;
      const u = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1), px = ax + dx * u - x, py = ay + dy * u - y, d = px * px + py * py;
      if (d < bd) { bd = d; bi = i; bt = u; }
    };
    if (from == null) for (let i = 0; i < T.N; i++) scan(i);
    else for (let j = -win; j <= win; j++) scan(((from + j) % T.N + T.N) % T.N);
    const nx = -T.ty[bi], ny = T.tx[bi], px = T.xs[bi] + (T.xs[(bi + 1) % T.N] - T.xs[bi]) * bt, py = T.ys[bi] + (T.ys[(bi + 1) % T.N] - T.ys[bi]) * bt;
    return { i: bi, s: (bi + bt) * T.seg, d: Math.sqrt(bd), lat: (x - px) * nx + (y - py) * ny };
  }
  function bgLayer(self, g, paint) {
    const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
    if (!self.bgCv || self.bgS !== s) {
      const c = self.bgCv || document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(H * s);
      const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 0, 0); paint(cg); self.bgCv = c; self.bgS = s;
    }
    g.drawImage(self.bgCv, 0, 0, W, H);
  }
  function starPath(g, x, y, r, r2) {
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r2 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath();
  }
  function sprite(w, h, paint) { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const g = c.getContext('2d'); g.scale(2, 2); paint(g); return c; }
  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = {
      star: sprite(64, 64, g => {
        g.fillStyle = 'rgba(255,214,60,.28)'; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill();
        g.lineJoin = 'round'; starPath(g, 32, 32, 24, 11); g.fillStyle = '#ffd23f'; g.fill(); g.strokeStyle = '#e08a00'; g.lineWidth = 3.5; g.stroke();
        starPath(g, 30, 29, 13, 6); g.fillStyle = '#fff3a8'; g.fill();
        g.fillStyle = '#2b2340'; g.beginPath(); g.arc(27, 33, 2.4, 0, TAU); g.arc(37, 33, 2.4, 0, TAU); g.fill();
      }),
      banana: sprite(64, 64, g => {
        g.fillStyle = 'rgba(40,30,20,.28)'; g.beginPath(); g.ellipse(33, 48, 24, 8, 0, 0, TAU); g.fill();
        g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 3; g.strokeStyle = '#b07e00';
        // three floppy peel flaps
        for (const [ex, ey] of [[12, 46], [52, 48], [32, 54]]) {
          g.fillStyle = '#f5c42c'; g.beginPath(); g.moveTo(26, 34); g.quadraticCurveTo((26 + ex) / 2 - 6, ey - 2, ex, ey); g.quadraticCurveTo((38 + ex) / 2 + 4, ey - 8, 38, 34); g.closePath(); g.fill(); g.stroke();
        }
        // the banana standing up out of the peel
        g.fillStyle = '#ffe14d'; g.beginPath(); g.moveTo(25, 36); g.quadraticCurveTo(20, 16, 34, 8); g.quadraticCurveTo(40, 20, 39, 36); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#fff6b0'; g.beginPath(); g.moveTo(29, 32); g.quadraticCurveTo(26, 20, 32, 13); g.quadraticCurveTo(30, 22, 32, 32); g.closePath(); g.fill();
        g.fillStyle = '#6b4a12'; g.beginPath(); g.arc(34, 8, 3, 0, TAU); g.fill();
      })
    };
    return SPR;
  }

  class Race {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.teams = !!ctx.teams;
      this.dur = 150; this.laps = this.kid ? 2 : 3; this.edge = GRASS;
      this.T = track(); this.hw = this.kid ? 110 : 86;
      this.vmax = this.kid ? 310 : 410; this.finN = 0; this.winT = 0; this.endT = 0; this.finalAnn = false; this.started = false;
      const T = this.T, n = ctx.players.length;
      const order = this.teams ? ctx.players.slice().sort((a, b) => a.team - b.team) : ctx.players.slice();
      this.es = ctx.players.map(p => {
        const k = order.indexOf(p), back = 70 + (k >> 1) * 88, lat = (k % 2 ? 0.42 : -0.42) * this.hw * (n === 1 ? 0 : 1);
        const i = ((T.i0 - Math.round(back / T.seg)) % T.N + T.N) % T.N, nx = -T.ty[i], ny = T.tx[i];
        const x = T.xs[i] + nx * lat, y = T.ys[i] + ny * lat, a = Math.atan2(T.ty[i], T.tx[i]);
        const e = { p, x, y, a, v: 0, vx: 0, vy: 0, kx: 0, ky: 0, r: 20, idx: i, s: 0, d: 0, lat: 0, prog: 0, lapsDone: 0,
          meter: this.kid ? 0.67 : 0.34, boostT: 0, spinT: 0, spinVis: 0, inv: 0, st: 'run', stT: 0, fin: false, place: 0, time: 0,
          sq: 0, sqv: 0, steer: 0, pos: 1, bestPos: 9, passT: 0, offT: 0, flT: 0, puffT: 0, bump: new Map(), rx: 0, ry: 0, ra: 0, ri: 0, hop: 0 };
        this.locate(e, true); e.prog = this.wrap(e.s - T.i0 * T.seg);
        return e;
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.order = this.es.slice();
      this.fl = [];   // flame particles
      // ⭐: rows across the road at fixed spots; they come back a few seconds after being taken
      this.stars = [];
      const lanes = this.kid ? [-0.5, 0, 0.5] : [-0.45, 0.45];
      for (const f of [0.14, 0.31, 0.47, 0.63, 0.8]) {
        const i = (T.i0 + Math.round(f * T.N)) % T.N;
        for (const l of lanes) this.stars.push({ x: T.xs[i] - T.ty[i] * l * this.hw, y: T.ys[i] + T.tx[i] * l * this.hw, on: true, t: rnd(0, 3), back: 0 });
      }
      this.bananas = []; this.nanaT = 6;
      this.deco = this.makeDeco();
    }
    wrap(d) { const L = this.T.L; d %= L; if (d > L / 2) d -= L; if (d < -L / 2) d += L; return d; }
    locate(e, global) {
      const q = nearest(this.T, e.x, e.y, global ? null : e.idx, 22);
      const ds = global ? 0 : this.wrap(q.s - e.s);
      e.idx = q.i; e.s = q.s; e.d = q.d; e.lat = q.lat;
      return ds;
    }
    /* trees, tyre stacks, stands: placed where the road isn't */
    makeDeco() {
      const T = this.T, hw = this.hw, free = (x, y, m) => nearest(T, x, y).d > hw + m, D = { trees: [], tyres: [], flowers: [], tufts: [] };
      const R0 = Math.random; let seed = 7; Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      try {
        for (let k = 0; k < 400 && D.trees.length < 22; k++) {
          const x = rnd(30, W - 30), y = rnd(170, H - 20), r = rnd(30, 46);
          if (!free(x, y, r + 34) || (Math.abs(x - 800) < 130 && y < 260)) continue;
          if (x > 560 && x < 1200 && y > 450 && y < 670) continue;   // keep the leaderboard spot clear
          if (x > 330 && x < 610 && y > 470 && y < 680) continue;   // and the start lights
          if (D.trees.some(t => hyp(t.x - x, t.y - y) < t.r + r + 10)) continue;
          D.trees.push({ x, y, r, c: ['#3fa44a', '#4bb553', '#36994a'][rint(3)] });
        }
        for (let i = 0; i < T.N; i += 9) {
          const c = T.tx[(i + 6) % T.N] * T.ty[i] - T.ty[(i + 6) % T.N] * T.tx[i];   // tight bends get tyre walls on the outside
          if (Math.abs(c) < 0.06) continue;
          const side = c > 0 ? -1 : 1, x = T.xs[i] - T.ty[i] * side * (hw + 52), y = T.ys[i] + T.tx[i] * side * (hw + 52);
          if (y < 168 || y > H - 14 || x < 16 || x > W - 16 || !free(x, y, 40) || (Math.abs(x - 800) < 110 && y < 260)) continue;
          if (D.tyres.some(t => hyp(t.x - x, t.y - y) < 46)) continue;
          D.tyres.push({ x, y, c: D.tyres.length % 2 ? '#ff4f58' : '#ffffff' });
        }
        for (let k = 0; k < 160; k++) { const x = rnd(10, W - 10), y = rnd(150, H - 6); if (free(x, y, 40)) D.flowers.push({ x, y, c: ['#fff', '#ffe066', '#ff9fc4'][rint(3)], k: rnd(0.6, 1.1) }); }
        for (let k = 0; k < 140; k++) { const x = rnd(10, W - 10), y = rnd(150, H - 6); if (free(x, y, 34)) D.tufts.push({ x, y, k: rnd(0.7, 1.3) }); }
      } finally { Math.random = R0; }
      return D;
    }

    /* ---------------- update ---------------- */
    update(dt) {
      const ctx = this.ctx, kid = this.kid, T = this.T, L = T.L; this.t += dt;
      if (!this.started) {
        this.started = true; Fx.pops = Fx.pops.filter(p => p.text !== '開始！');
        Fx.announce('出發！', '#22c26a'); Fx.flash('#d9ffd0', 0.25); ctx.sfx('whoosh');
      }
      for (const e of this.es) {
        e.sqv += (-e.sq * 320 - e.sqv * 14) * dt; e.sq += e.sqv * dt;
        e.inv -= dt; e.passT -= dt;
        if (e.fin) { this.cruise(e, dt); continue; }
        if (e.st === 'lift' || e.st === 'drop') { this.cloud(e, dt); continue; }
        this.drive(e, dt);
      }
      this.bumps();
      for (const e of this.es) for (const [o, t] of e.bump) if (t <= this.t) e.bump.delete(o);
      this.items(dt);
      // flames
      for (const f of this.fl) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; }
      if (this.fl.length && this.fl[0].t > 0.5) this.fl = this.fl.filter(f => f.t < f.life);
      // positions: finishers by finish order, then by how far along the track
      this.order.sort((a, b) => (b.fin - a.fin) || (a.fin ? a.place - b.place : b.prog - a.prog));
      this.order.forEach((e, k) => {
        if (k + 1 < e.pos && this.t > 4 && !e.fin && e.passT <= 0 && this.es.length > 1) { e.passT = 2.5; Fx.pop(e.x, e.y - 90, '超車！', '#ff7a00', 34); }
        e.pos = k + 1;
      });
      if (this.winT && this.t < this.winT + 1.6 && Math.random() < dt * 10) {
        const i = T.i0, l = rnd(-1, 1) * this.hw; Fx.burst(T.xs[i] - T.ty[i] * l, T.ys[i] + T.tx[i] * l, CONF[rint(CONF.length)], 6, 340);
      }
      // the end: everyone home, or 15 s after the winner, or the time limit
      if (!this.endT && this.es.every(e => e.fin)) this.endT = this.t + 2.2;
      if (this.endT && this.t >= this.endT) { this.over = true; this.allDone = true; }
      if (this.winT && this.t >= this.winT + 15) this.over = true;
      if (this.t >= this.dur) this.over = true;
    }
    drive(e, dt) {
      const ctx = this.ctx, kid = this.kid, T = this.T, hw = this.hw;
      const i = ctx.input(e.p), m = hyp(i.x, i.y), td = Math.atan2(T.ty[e.idx], T.tx[e.idx]);
      e.spinT -= dt; e.boostT -= dt;
      e.meter = Math.min(1, e.meter + dt * (kid ? 0.11 : 0.075));
      if (ctx.pressed(e.p, 0) && e.meter >= 1 / 3 - 1e-6 && e.spinT <= 0) {
        e.meter -= 1 / 3; e.boostT = Math.min(2.4, Math.max(0, e.boostT) + (kid ? 1.2 : 1.1)); e.sq = -0.2; e.sqv = 0;
        ctx.sfx('whoosh'); Fx.shake(3); ctx.buzz(e.p, 40);
        Fx.ring(e.x - Math.cos(e.a) * 30, e.y - Math.sin(e.a) * 30, '#ffb21f', 70, 0.3);
      }
      let want = e.a, target = 0, da = 0;
      if (m > 0 && e.spinT <= 0) {
        want = Math.atan2(i.y, i.x);
        if (kid) {   // gentle helper: lean toward a point a little way down the road (only when already going roughly the right way)
          const j = (e.idx + 16) % T.N, aim = Math.atan2(T.ys[j] - e.y, T.xs[j] - e.x);
          if (Math.abs(angDiff(td, want)) < 1.7) want += angDiff(want, aim) * 0.4;
        }
        da = angDiff(e.a, want);
        const rate = (kid ? 4.4 : 3.9) * (0.55 + 0.45 * Math.min(1, e.v / 220)) * dt;
        e.a += clamp(da, -rate, rate);
        const al = Math.cos(da);
        target = this.vmax * Math.min(1, m * 1.15) * (al > 0 ? 0.55 + 0.45 * al : 0.4);
      }
      e.steer += (clamp(da, -1, 1) - e.steer) * Math.min(1, dt * 8);
      if (e.boostT > 0) target = this.vmax * 1.6;
      const off = e.d > hw;
      if (off) target *= kid ? 0.82 : (e.boostT > 0 ? 0.75 : 0.55);
      if (e.spinT > 0) { target = 0; e.spinVis += dt * 14; }
      else e.spinVis = 0;
      e.v += (target - e.v) * (1 - Math.exp(-(target > e.v ? (e.boostT > 0 ? 5 : 1.9) : (off ? 4 : 2.6)) * dt));
      const kd = Math.exp(-4.5 * dt); e.kx *= kd; e.ky *= kd;
      e.vx = Math.cos(e.a) * e.v + e.kx; e.vy = Math.sin(e.a) * e.v + e.ky;
      e.x = clamp(e.x + e.vx * dt, 24, W - 24); e.y = clamp(e.y + e.vy * dt, 152, H - 14);
      const ds = this.locate(e); this.progress(e, ds);
      // 小朋友: a soft pull back toward the road
      if (kid && e.d > hw + 16) {
        const k = Math.min(1, (e.d - hw - 16) * 3 * dt / e.d), nx = -T.ty[e.idx], ny = T.tx[e.idx];
        e.x -= nx * e.lat * k; e.y -= ny * e.lat * k;
      }
      // dust: grass puffs, tyre smoke on tight turns, exhaust when pulling away
      e.hop = off && e.v > 60 ? Math.abs(Math.sin(this.t * 30 + e.p.uid)) * 2.5 : 0;
      if (off) Fx.walk(e, dt, 'rgba(140,105,60,.55)');
      else if (Math.abs(da) > 0.7 && e.v > 220) Fx.walk(e, dt, 'rgba(235,235,240,.7)');
      e.puffT -= dt;
      if (m > 0 && e.v < 160 && e.puffT <= 0) { e.puffT = 0.12; Fx.dust(e.x - Math.cos(e.a) * 36, e.y - Math.sin(e.a) * 36, 'rgba(210,210,220,.7)', 7); }
      if (e.boostT > 0) {
        e.flT -= dt;
        while (e.flT <= 0) {
          e.flT += 0.018;
          const bx = e.x - Math.cos(e.a) * 38, by = e.y - Math.sin(e.a) * 38, sp = rnd(120, 260);
          this.fl.push({ x: bx + rnd(-6, 6), y: by + rnd(-6, 6), vx: -Math.cos(e.a) * sp + rnd(-40, 40), vy: -Math.sin(e.a) * sp + rnd(-40, 40), t: 0, life: rnd(0.22, 0.38), r: rnd(9, 15) });
        }
      }
      if (e.d > hw + (kid ? 90 : 150)) this.lift(e);
    }
    progress(e, ds) {
      const ctx = this.ctx, L = this.T.L, N = this.laps;
      e.prog += ds;
      const done = Math.floor(e.prog / L);
      if (done > e.lapsDone && done >= 1) {
        e.lapsDone = done;
        if (done >= N) return this.finishKart(e);
        ctx.sfx('coin'); ctx.buzz(e.p, 60);
        if (done === N - 1) {
          Fx.pop(e.x, e.y - 92, '最後一圈！', '#ff3b4a', 38);
          if (!this.finalAnn) { this.finalAnn = true; Fx.announce('最後一圈！', '#ff3b4a'); ctx.sfx('star'); }
        } else Fx.pop(e.x, e.y - 92, `第 ${done + 1} 圈`, '#2b2340', 38);
        Fx.ring(e.x, e.y, '#ffffff', 80, 0.4);
      }
    }
    finishKart(e) {
      const ctx = this.ctx;
      e.fin = true; e.place = ++this.finN; e.time = this.t; e.boostT = 0; e.spinT = 0; e.prog = this.laps * this.T.L;
      for (let k = 0; k < 5; k++) Fx.burst(e.x + rnd(-30, 30), e.y + rnd(-30, 30), CONF[rint(CONF.length)], 8, 380);
      Fx.ring(e.x, e.y, '#ffe066', 140, 0.6); ctx.buzz(e.p, 300);
      if (e.place === 1) {
        this.winT = this.t; ctx.sfx('win'); Fx.flash('#ffffff', 0.3); Fx.shake(6);
        Fx.announce('🏁 ' + e.p.name + ' 第 1 名！', '#e08a00');
      } else { ctx.sfx('star'); Fx.pop(e.x, e.y - 92, `第 ${e.place} 名！`, '#2b2340', 44); }
    }
    /* finished karts roll on slowly and spin for joy; they no longer bump anyone */
    cruise(e, dt) {
      const T = this.T, j = (e.idx + 14) % T.N, aim = Math.atan2(T.ys[j] - e.y, T.xs[j] - e.x);
      e.a += clamp(angDiff(e.a, aim), -3 * dt, 3 * dt);
      e.v += (110 - e.v) * (1 - Math.exp(-1.5 * dt));
      e.kx *= 0.9; e.ky *= 0.9;
      e.vx = Math.cos(e.a) * e.v + e.kx; e.vy = Math.sin(e.a) * e.v + e.ky;
      e.x = clamp(e.x + e.vx * dt, 24, W - 24); e.y = clamp(e.y + e.vy * dt, 152, H - 14);
      this.locate(e);
      e.spinVis += dt * (2 + 6 * Math.max(0, 1 - (this.t - e.time) / 3));
    }
    /* far off the road: a little cloud lifts you back on */
    lift(e) {
      e.st = 'lift'; e.stT = 0; e.v = 0; e.kx = e.ky = 0; e.boostT = 0;
      const T = this.T, ri = ((e.idx - 4) % T.N + T.N) % T.N;
      e.ri = ri; e.rx = T.xs[ri]; e.ry = T.ys[ri]; e.ra = Math.atan2(T.ty[ri], T.tx[ri]);
      this.ctx.sfx('pop'); this.ctx.buzz(e.p, 120);
      for (let k = 0; k < 6; k++) Fx.dust(e.x + rnd(-24, 24), e.y + rnd(-8, 16), 'rgba(255,255,255,.95)', 16);
      Fx.pop(e.x, e.y - 80, this.kid ? '回賽道囉！' : '迷路了！', '#2b2340', 34);
    }
    cloud(e, dt) {
      e.stT += dt;
      const up = this.kid ? 0.45 : 0.7;
      if (e.st === 'lift' && e.stT >= up) {
        e.st = 'drop'; e.stT = 0; e.x = e.rx; e.y = e.ry; e.a = e.ra;
        const ds = this.wrap(e.ri * this.T.seg - e.s); e.idx = e.ri; e.s = e.ri * this.T.seg; e.d = 0; e.lat = 0; this.progress(e, ds);
        for (let k = 0; k < 6; k++) Fx.dust(e.x + rnd(-24, 24), e.y + rnd(-8, 16), 'rgba(255,255,255,.95)', 16);
      } else if (e.st === 'drop' && e.stT >= 0.4) {
        e.st = 'run'; e.inv = 1; e.sq = 0.25; e.sqv = 0; this.ctx.sfx('pop');
        Fx.ring(e.x, e.y, '#ffffff', 70, 0.35);
      }
    }
    bumps() {
      const ctx = this.ctx, kid = this.kid, live = this.es.filter(e => !e.fin && e.st === 'run');
      for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
        const A = live[a], B = live[b], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), min = R * 2;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d, ov = (min - d) / 2;
        A.x -= nx * ov; A.y -= ny * ov; B.x += nx * ov; B.y += ny * ov;
        if (A.bump.has(B) || A.inv > 0 || B.inv > 0) continue;
        const ap = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;   // closing speed
        if (ap < 50) continue;
        const J = kid ? 50 + ap * 0.35 : 110 + ap * 0.75;
        A.kx -= nx * J; A.ky -= ny * J; B.kx += nx * J; B.ky += ny * J;
        A.v *= kid ? 0.9 : 0.78; B.v *= kid ? 0.95 : 0.88;
        A.bump.set(B, this.t + 0.3); B.bump.set(A, this.t + 0.3);
        A.sq = B.sq = Math.min(0.25, 0.08 + J / 1400); A.sqv = B.sqv = 0;
        const cx = A.x + nx * R, cy = A.y + ny * R;
        ctx.sfx('bonk', Math.min(1, J / 400)); Fx.burst(cx, cy, '#ffe066', kid ? 5 : 9, 260); Fx.ring(cx, cy, '#ffffff', 50 + J / 8, 0.3);
        Fx.shake(kid ? Math.min(3, J / 60) : Math.min(9, J / 40));
        if (!kid && J > 300) { Fx.pop(cx, cy - 40, '碰！', '#ff5a3d', 40); ctx.buzz(A.p, 60); ctx.buzz(B.p, 60); }
      }
    }
    items(dt) {
      const ctx = this.ctx, T = this.T;
      for (const s of this.stars) {
        s.t += dt;
        if (!s.on) { s.back -= dt; if (s.back <= 0) { s.on = true; s.t = 0; } continue; }
        for (const e of this.es) {
          if (e.fin || e.st !== 'run' || hyp(e.x - s.x, e.y - s.y) > 44) continue;
          s.on = false; s.back = 5;
          e.meter = Math.min(1, e.meter + (this.kid ? 0.4 : 0.34));
          ctx.sfx('coin'); ctx.buzz(e.p, 30);
          Fx.burst(s.x, s.y, '#ffd23f', 10, 240); Fx.pop(s.x, s.y - 40, '⚡+1', '#e08a00', 34);
          break;
        }
      }
      if (this.kid) return;
      this.nanaT -= dt;
      if (this.nanaT <= 0 && this.bananas.length < 5) {
        this.nanaT = rnd(3.5, 6.5);
        for (let tries = 0; tries < 8; tries++) {
          const i = rint(T.N), l = rnd(-0.6, 0.6) * this.hw, x = T.xs[i] - T.ty[i] * l, y = T.ys[i] + T.tx[i] * l;
          if (Math.abs(this.wrap((i - T.i0) * T.seg)) < 160) continue;   // not on the start line
          if (this.es.some(e => hyp(e.x - x, e.y - y) < 260) || this.stars.some(s => hyp(s.x - x, s.y - y) < 60)) continue;
          this.bananas.push({ x, y, a: rnd(0, TAU), t: 0 }); break;
        }
      }
      for (const b of this.bananas) {
        b.t += dt; if (b.t < 0.5) continue;
        for (const e of this.es) {
          if (e.fin || e.st !== 'run' || e.inv > 0 || e.spinT > 0 || hyp(e.x - b.x, e.y - b.y) > 38) continue;
          b.hit = true; e.spinT = 1.0; e.v *= 0.35; e.boostT = 0; e.inv = 1.4;
          ctx.sfx('stun'); ctx.buzz(e.p, 220); Fx.shake(6);
          Fx.burst(b.x, b.y, '#ffd84a', 10, 260); Fx.pop(e.x, e.y - 86, '滑倒！', '#ff3b4a', 42);
          break;
        }
      }
      if (this.bananas.some(b => b.hit)) this.bananas = this.bananas.filter(b => !b.hit);
    }

    /* ---------------- drawing ---------------- */
    roadPath(g) {
      const T = this.T; g.beginPath(); g.moveTo(T.xs[0], T.ys[0]);
      for (let i = 1; i < T.N; i++) g.lineTo(T.xs[i], T.ys[i]); g.closePath();
    }
    paintBg(g) {
      const T = this.T, hw = this.hw, D = this.deco;
      g.fillStyle = GRASS; g.fillRect(0, 0, W, H);
      g.fillStyle = '#88d763'; for (let x = -H; x < W; x += 120) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 60, H); g.lineTo(x + 60 + H * 0.5, 0); g.lineTo(x + H * 0.5, 0); g.closePath(); g.fill(); }
      for (const d of D.tufts) { g.strokeStyle = '#5fb84a'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(d.x - 6 * d.k, d.y); g.lineTo(d.x - 2 * d.k, d.y - 10 * d.k); g.moveTo(d.x, d.y); g.lineTo(d.x + 2 * d.k, d.y - 12 * d.k); g.moveTo(d.x + 6 * d.k, d.y); g.lineTo(d.x + 6 * d.k, d.y - 8 * d.k); g.stroke(); }
      for (const d of D.flowers) { g.fillStyle = d.c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(d.x + Math.cos(a) * 4 * d.k, d.y + Math.sin(a) * 4 * d.k, 3 * d.k, 0, TAU); g.fill(); } g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(d.x, d.y, 2.4 * d.k, 0, TAU); g.fill(); }
      g.lineJoin = 'round'; g.lineCap = 'round';
      // runoff, kerbs, tarmac, edge lines
      this.roadPath(g); g.strokeStyle = 'rgba(40,90,30,.18)'; g.lineWidth = hw * 2 + 70; g.stroke();
      this.roadPath(g); g.strokeStyle = '#ecdcab'; g.lineWidth = hw * 2 + 54; g.stroke();
      this.roadPath(g); g.strokeStyle = '#ffffff'; g.lineWidth = hw * 2 + 24; g.stroke();
      g.setLineDash([26, 26]); this.roadPath(g); g.strokeStyle = '#ff4f58'; g.lineCap = 'butt'; g.stroke(); g.setLineDash([]); g.lineCap = 'round';
      this.roadPath(g); g.strokeStyle = '#5b5d70'; g.lineWidth = hw * 2; g.stroke();
      this.roadPath(g); g.strokeStyle = '#eeeef4'; g.lineWidth = hw * 2 - 14; g.stroke();
      this.roadPath(g); g.strokeStyle = '#63657a'; g.lineWidth = hw * 2 - 22; g.stroke();
      this.roadPath(g); g.strokeStyle = '#6a6c82'; g.lineWidth = hw * 1.2; g.stroke();
      // speckles on the tarmac
      for (let k = 0; k < 900; k++) {
        const i = rint(T.N), l = rnd(-1, 1) * (hw - 14), x = T.xs[i] - T.ty[i] * l + rnd(-3, 3), y = T.ys[i] + T.tx[i] * l + rnd(-3, 3);
        g.fillStyle = k % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)'; g.fillRect(x, y, 3, 3);
      }
      g.setLineDash([34, 40]); this.roadPath(g); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 5; g.lineCap = 'butt'; g.stroke(); g.setLineDash([]);
      // painted arrows showing which way to drive
      g.fillStyle = 'rgba(255,255,255,.22)';
      for (let f = 0.07; f < 1; f += 0.125) {
        const i = (T.i0 + Math.round(f * T.N)) % T.N, a = Math.atan2(T.ty[i], T.tx[i]);
        for (const l of [-0.55, 0.55]) {
          g.save(); g.translate(T.xs[i] - T.ty[i] * l * hw, T.ys[i] + T.tx[i] * l * hw); g.rotate(a);
          g.beginPath(); g.moveTo(18, 0); g.lineTo(-10, -18); g.lineTo(-2, 0); g.lineTo(-10, 18); g.closePath(); g.fill(); g.restore();
        }
      }
      // start / finish: checkered band and grid boxes
      {
        const i = T.i0, a = Math.atan2(T.ty[i], T.tx[i]), q = (hw * 2) / Math.round(hw * 2 / 22);
        g.save(); g.translate(T.xs[i], T.ys[i]); g.rotate(a);
        for (let c = 0; c < 2; c++) for (let r = 0; r * q < hw * 2 - 1; r++) { g.fillStyle = (c + r) % 2 ? '#2b2340' : '#ffffff'; g.fillRect(-q + c * q, -hw + r * q, q + 0.5, q + 0.5); }
        g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.lineCap = 'round';
        for (let k = 0; k < 6; k++) {
          const bx = -(70 + (k >> 1) * 88) + 34, by = (k % 2 ? 0.42 : -0.42) * hw;
          g.beginPath(); g.moveTo(bx - 12, by - 26); g.lineTo(bx, by - 26); g.lineTo(bx, by + 26); g.lineTo(bx - 12, by + 26); g.stroke();
        }
        g.restore();
      }
      // tyre stacks on the outside of bends
      for (const t of D.tyres) {
        g.fillStyle = 'rgba(30,40,20,.25)'; g.beginPath(); g.ellipse(t.x + 4, t.y + 8, 22, 12, 0, 0, TAU); g.fill();
        g.fillStyle = '#2b2340'; g.beginPath(); g.arc(t.x, t.y, 19, 0, TAU); g.fill();
        g.strokeStyle = t.c; g.lineWidth = 5; g.beginPath(); g.arc(t.x, t.y, 13, 0, TAU); g.stroke();
        g.fillStyle = '#4a4a5c'; g.beginPath(); g.arc(t.x, t.y, 7, 0, TAU); g.fill();
      }
      // trees
      for (const t of D.trees) {
        g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(t.x + 10, t.y + t.r * 0.55, t.r * 0.95, t.r * 0.45, 0, 0, TAU); g.fill();
        g.fillStyle = '#8a5a2b'; g.fillRect(t.x - 6, t.y, 12, t.r * 0.5);
        g.fillStyle = t.c; g.beginPath(); g.arc(t.x, t.y - t.r * 0.2, t.r, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.arc(t.x - t.r * 0.3, t.y - t.r * 0.5, t.r * 0.45, 0, TAU); g.fill();
        g.fillStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.arc(t.x + t.r * 0.3, t.y + t.r * 0.05, t.r * 0.55, 0, TAU); g.fill();
      }
      // the grandstand in the dent at the top, with a cheering crowd
      this.paintStand(g, 800, 200, 150);
    }
    paintStand(g, cx, cy, w) {
      g.fillStyle = 'rgba(30,40,20,.25)'; g.beginPath(); g.roundRect(cx - w / 2 + 6, cy - 34, w, 84, 12); g.fill();
      g.fillStyle = '#8b93a7'; g.beginPath(); g.roundRect(cx - w / 2, cy - 42, w, 80, 12); g.fill();
      for (let r = 0; r < 3; r++) { g.fillStyle = r % 2 ? '#a6aec2' : '#9aa2b6'; g.fillRect(cx - w / 2 + 8, cy - 34 + r * 22, w - 16, 20); }
      for (let r = 0; r < 3; r++) for (let x = cx - w / 2 + 18; x < cx + w / 2 - 10; x += 20) {
        const c = CONF[(x * 7 + r * 13) % 6 | 0]; g.fillStyle = c; g.beginPath(); g.arc(x + (r % 2) * 8, cy - 24 + r * 22, 7, 0, TAU); g.fill();
        g.fillStyle = '#ffe0c4'; g.beginPath(); g.arc(x + (r % 2) * 8, cy - 30 + r * 22, 5, 0, TAU); g.fill();
      }
      g.fillStyle = '#ff4f58'; g.beginPath(); g.roundRect(cx - w / 2 - 6, cy - 54, w + 12, 18, 8); g.fill();
      g.fillStyle = '#fff'; for (let x = cx - w / 2 + 6; x < cx + w / 2; x += 28) g.fillRect(x, cy - 54, 12, 18);
    }
    drawLights(g) {
      const T = this.T, i = T.i0, side = this.hw + 74, x = T.xs[i] - T.ty[i] * side, y = T.ys[i] + T.tx[i] * side - 6;
      if (this.winT) {   // the checkered flag waves once someone has finished
        const t = this.t;
        g.fillStyle = 'rgba(30,40,20,.25)'; g.beginPath(); g.ellipse(x + 6, y + 40, 26, 9, 0, 0, TAU); g.fill();
        g.fillStyle = '#6b6f80'; g.fillRect(x - 4, y - 70, 8, 112);
        const fw = 120, fh = 72, cw = 8, ch = 5;
        for (let c = 0; c < cw; c++) for (let r = 0; r < ch; r++) {
          const u = c / cw, u2 = (c + 1) / cw, w1 = Math.sin(t * 7 - u * 5) * 9 * u, w2 = Math.sin(t * 7 - u2 * 5) * 9 * u2;
          const x0 = x + 4 + u * fw, x1 = x + 4 + u2 * fw, y0 = y - 70 + r * fh / ch, y1 = y0 + fh / ch;
          g.fillStyle = (c + r) % 2 ? '#2b2340' : '#ffffff';
          g.beginPath(); g.moveTo(x0, y0 + w1); g.lineTo(x1, y0 + w2); g.lineTo(x1, y1 + w2); g.lineTo(x0, y1 + w1); g.closePath(); g.fill();
        }
        return;
      }
      let lit = 0, green = false;
      if (Party.state === 'intro') { const k = Party.introT; lit = k > 3 ? 0 : 4 - Math.ceil(k); }
      else { green = this.t < 3; if (!green && this.t > 4) return; }
      const a = Party.state === 'play' && this.t > 3 ? Math.max(0, 1 - (this.t - 3)) : 1;
      g.globalAlpha = a;
      g.fillStyle = 'rgba(30,40,20,.25)'; g.beginPath(); g.roundRect(x - 84, y - 26, 176, 66, 18); g.fill();
      g.fillStyle = '#6b6f80'; g.fillRect(x - 5, y + 18, 10, 30);
      g.fillStyle = '#2b2340'; g.beginPath(); g.roundRect(x - 90, y - 34, 180, 64, 18); g.fill();
      for (let k = 0; k < 3; k++) {
        const lx = x - 56 + k * 56, on = green || k < lit, col = green ? '#3dff7a' : '#ff3b4a';
        if (on) { g.fillStyle = green ? 'rgba(61,255,122,.3)' : 'rgba(255,59,74,.3)'; g.beginPath(); g.arc(lx, y - 2, 30, 0, TAU); g.fill(); }
        g.fillStyle = on ? col : '#4a4458'; g.beginPath(); g.arc(lx, y - 2, 20, 0, TAU); g.fill();
        if (on) { g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(lx - 6, y - 8, 6, 0, TAU); g.fill(); }
      }
      g.globalAlpha = 1;
    }
    drawBoard(g) {
      const list = this.order, n = list.length, cw = 94, w = n * cw + 24, x0 = BX - w / 2, y = 548;
      g.fillStyle = 'rgba(30,40,20,.22)'; g.beginPath(); g.roundRect(x0 + 6, y - 46, w, 104, 22); g.fill();
      g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.roundRect(x0, y - 52, w, 104, 22); g.fill();
      g.strokeStyle = '#f59e0b'; g.lineWidth = 5; g.stroke();
      g.fillStyle = '#f59e0b'; g.beginPath(); g.roundRect(BX - 70, y - 70, 140, 34, 17); g.fill();
      g.fillStyle = '#fff'; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('🏁 名次', BX, y - 52);
      list.forEach((e, k) => {
        const cx = x0 + 12 + k * cw + cw / 2;
        this.badge(g, cx - 26, y - 8, k + 1, 16);
        drawCritter(g, cx + 12, y - 8, 20, e.p.col, e.p.animal, { noShadow: true, happy: e.fin, face: Math.PI / 2 });
        g.fillStyle = '#2b2340'; g.font = `900 21px ${NUM}`; g.textAlign = 'center';
        g.fillText(e.fin ? '🏁' : `${this.lapOf(e)}/${this.laps}`, cx, y + 30);
      });
    }
    badge(g, x, y, k, r) {
      const C = k === 1 ? ['#ffc83d', '#b07a00'] : k === 2 ? ['#d7dde8', '#7d8799'] : k === 3 ? ['#eba06a', '#9a5a28'] : ['#ffffff', '#8a8494'];
      g.fillStyle = C[0]; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = C[1]; g.lineWidth = r * 0.18; g.stroke();
      g.fillStyle = '#2b2340'; g.font = `900 ${Math.round(r * 1.25)}px ${NUM}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k, x, y + 1);
    }
    lapOf(e) { return clamp(Math.floor(e.prog / this.T.L) + 1, 1, this.laps); }
    drawKart(g, e, t) {
      const kid = this.kid, C = PARTY_COLORS[e.p.col], TC = this.teams ? TEAMS[e.p.team] : null;
      const body = TC ? TC.c : C.c, dark = TC ? TC.d : C.d;
      let lift = 0, alpha = 1;
      if (e.st === 'lift') { const k = Math.min(1, e.stT / (kid ? 0.45 : 0.7)); lift = k * 70; alpha = 1 - k * 0.8; }
      else if (e.st === 'drop') { const k = Math.min(1, e.stT / 0.4); lift = (1 - k) * 70; alpha = 0.3 + 0.7 * k; }
      const hop = lift + e.hop, x = e.x, y = e.y - hop;
      if (lift > 0) {   // the cloud under the kart
        g.fillStyle = 'rgba(30,40,20,.18)'; g.beginPath(); g.ellipse(e.x, e.y + 16, 44, 14, 0, 0, TAU); g.fill();
      } else { g.fillStyle = 'rgba(25,25,40,.28)'; g.beginPath(); g.ellipse(x + 5, e.y + 16, 42, 24, 0, 0, TAU); g.fill(); }
      g.globalAlpha = alpha * (e.inv > 0 && !e.fin && e.st === 'run' && e.spinT <= 0 && (t * 10 | 0) % 2 ? 0.55 : 1);
      const ang = e.a + e.spinVis;
      // speed lines while boosting
      if (e.boostT > 0) {
        g.save(); g.translate(x, y); g.rotate(e.a); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 4; g.lineCap = 'round';
        for (let k = 0; k < 4; k++) { const ly = -27 + k * 18, ph = (t * 9 + k * 0.37) % 1, l = 30 + ph * 50; g.beginPath(); g.moveTo(-44 - ph * 20, ly); g.lineTo(-44 - ph * 20 - l, ly); g.stroke(); }
        g.restore();
      }
      g.save(); g.translate(x, y); g.rotate(ang); g.scale(1 + e.sq, 1 - e.sq);
      // tyres
      g.fillStyle = '#2b2340';
      for (const [tx, ty] of [[-22, -24], [-22, 24], [22, -23], [22, 23]]) { g.beginPath(); g.roundRect(tx - 11, ty - 7, 22, 14, 5); g.fill(); }
      const sw = clamp(e.steer, -0.5, 0.5);
      g.fillStyle = '#4a4458'; for (const ty of [-23, 23]) { g.save(); g.translate(22, ty); g.rotate(sw); g.fillRect(-7, -2, 14, 4); g.restore(); }
      // body
      g.fillStyle = dark; g.beginPath(); g.roundRect(-36, -20, 74, 40, 14); g.fill();
      g.fillStyle = body; g.beginPath(); g.roundRect(-34, -19, 70, 35, 13); g.fill();
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(10, -4, 26, 8);   // racing stripe
      g.fillStyle = dark; g.beginPath(); g.roundRect(34, -16, 8, 32, 4); g.fill();   // front bumper
      g.fillStyle = '#9aa0b4'; for (const ty of [-11, 11]) { g.beginPath(); g.roundRect(-44, ty - 4, 10, 8, 3); g.fill(); }   // exhausts
      g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.roundRect(-28, -16, 50, 7, 4); g.fill();
      g.fillStyle = 'rgba(43,35,64,.55)'; g.beginPath(); g.ellipse(-6, 0, 17, 15, 0, 0, TAU); g.fill();   // seat
      g.restore();
      // the driver, upright, looking where the kart goes
      const happy = e.fin || e.boostT > 0, stun = e.spinT > 0;
      drawCritter(g, x - Math.cos(e.a) * 5, y - 12, 21, e.p.col, e.p.animal, { face: e.fin ? Math.PI / 2 : ang, noShadow: true, happy, stun, squash: e.sq * 0.6, rot: clamp(-e.steer * 0.25, -0.2, 0.2), blink: (t + e.p.uid * 1.3) % 3.6 < 0.12 });
      g.globalAlpha = 1;
      if (lift > 0) {
        g.fillStyle = 'rgba(255,255,255,.95)';
        for (const [dx, dy, r] of [[-26, 18, 16], [-8, 24, 19], [14, 22, 18], [30, 16, 14], [0, 12, 16]]) { g.beginPath(); g.arc(e.x + dx, e.y - lift + dy + 10, r, 0, TAU); g.fill(); }
      }
      if (stun) { g.font = '22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let k = 0; k < 3; k++) { const a = t * 6 + k * TAU / 3; g.fillText('⭐', x + Math.cos(a) * 32, y - 40 + Math.sin(a) * 9); } }
      if (this.es.length > 1) this.badge(g, x + 34, y - 34, e.pos, 15);
      drawTag(g, x, y - 66, e.p);
      if (e.fin) { g.font = '26px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏁', x - 38, y - 36); }
      else {   // boost meter pips under the kart
        const n = Math.floor(e.meter * 3 + 1e-6);
        for (let k = 0; k < 3; k++) {
          const px = x - 22 + k * 22, py = e.y + 40;
          g.fillStyle = k < n ? '#ffb21f' : 'rgba(43,35,64,.35)'; g.beginPath(); g.roundRect(px - 9, py - 5, 18, 10, 5); g.fill();
        }
      }
    }
    draw(g) {
      const t = this.t, S = sprites();
      if (Party.state === 'finish' && this.allDone && !this.popFixed) { this.popFixed = true; for (const p of Fx.pops) if (p.text === '時間到！') p.text = '🏁 比賽結束！'; }
      bgLayer(this, g, cg => this.paintBg(cg));
      Fx.ground(g);
      for (const s of this.stars) {
        if (!s.on) continue;
        const k = Math.min(1, s.t / 0.3), bob = Math.sin(t * 4 + s.x) * 4, sz = 48 * (0.4 + 0.6 * k) * (1 + Math.sin(t * 6 + s.y) * 0.06);
        g.drawImage(S.star, s.x - sz / 2, s.y - sz / 2 + bob, sz, sz);
      }
      for (const b of this.bananas) {
        const k = Math.min(1, b.t / 0.5), drop = (1 - k) * 60, sz = 58;
        g.save(); g.translate(b.x, b.y - drop); g.rotate(Math.sin(b.a) * 0.4 + (1 - k) * 4); g.drawImage(S.banana, -sz / 2, -sz / 2, sz, sz); g.restore();
      }
      for (const f of this.fl) {
        const k = f.t / f.life; if (k >= 1) continue;
        g.globalAlpha = 1 - k; g.fillStyle = k < 0.3 ? '#fff27a' : k < 0.6 ? '#ffae2b' : '#ff5a3d';
        g.beginPath(); g.arc(f.x, f.y, f.r * (1 - k * 0.6), 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      this.drawBoard(g);
      this.drawLights(g);
      const list = this.es.slice().sort((a, b) => a.y - b.y);
      for (const e of list) this.drawKart(g, e, t);
    }

    /* ---------------- scores for the HUD, phones and results ---------------- */
    lapsOf(e) { return e.fin ? this.laps : clamp(e.prog / this.T.L, 0, this.laps); }
    teamVal(t) { return Math.round(this.es.filter(e => e.p.team === t).reduce((s, e) => s + this.lapsOf(e), 0) * 10) / 10; }
    teamScore(t) { return this.teamVal(t).toFixed(1) + ' 圈'; }
    center() {
      if (this.winT) return `🏁 ${Math.max(0, Math.ceil(this.winT + 15 - this.t))} 秒內衝過終點！`;
      const L = this.order[0]; return L ? `${this.laps} 圈決勝負・領先第 ${this.lapOf(L)} 圈` : '';
    }
    chip(p) { const e = this.by.get(p); return e.fin ? `🏁 第${e.place}名` : `第${e.pos}名 圈${this.lapOf(e)}/${this.laps}`; }
    pad(p) {
      const e = this.by.get(p);
      if (e.fin) return `🏁 完成！第 ${e.place} 名・${fmt(e.time)}`;
      if (e.st !== 'run') return '☁️ 回到賽道…';
      if (e.spinT > 0) return '🍌 滑倒了！';
      const n = Math.floor(e.meter * 3 + 1e-6);
      return `第 ${e.pos} 名・第 ${this.lapOf(e)}/${this.laps} 圈・加速 ${n ? '⚡'.repeat(n) : '充電中'}`;
    }
    ready(p) { const e = this.by.get(p); return !e.fin && e.st === 'run' && e.spinT <= 0 && e.meter >= 1 / 3 - 1e-6; }
    results() {
      const list = this.es.slice().sort((a, b) => (b.fin - a.fin) || (a.fin ? a.place - b.place : b.prog - a.prog));
      const rows = list.map((e, k) => ({
        p: e.p, key: e.fin ? 'f' + e.place : 'p' + k,
        line: e.fin ? `第 ${e.place} 名・${fmt(e.time)}` : `第 ${k + 1} 名・跑到第 ${this.lapOf(e)}/${this.laps} 圈`
      }));
      if (this.teams) return { rows, teamScores: [this.teamVal(0), this.teamVal(1)], teamText: t => this.teamScore(t) };
      return { rows };
    }
  }

  GAMES.push({
    id: 'race', name: '跑跑賽道', icon: '🏁', col: '#f59e0b', bg: GRASS, kind: 'vs', teams: true, players: '1–6 人',
    blurb: '開小賽車繞賽道，加速衝第一！',
    btn: { label: '加速', icon: '🔥' },
    rules: kid => kid
      ? ['搖桿推向哪裡，小車就往哪裡開', '跟著地上的箭頭繞圈，跑完 2 圈就到終點', '吃到 ⭐ 會充電，按「加速」咻一下衝出去', '開太遠會有雲朵把你送回賽道，不用怕']
      : ['搖桿推向哪裡，車子就轉向那裡開；草地會變慢', '跑完 3 圈先衝過終點的人贏', '加速條會慢慢充電，吃 ⭐ 充更快，按「加速」衝刺', '小心 🍌 香蕉皮會讓你打滑，撞車也會被撞開'],
    thumb(g) {
      g.fillStyle = GRASS; g.fillRect(0, 0, 320, 180);
      g.lineJoin = 'round';
      const path = () => { g.beginPath(); g.roundRect(34, 30, 252, 122, 61); };
      path(); g.strokeStyle = '#ecdcab'; g.lineWidth = 50; g.stroke();
      path(); g.strokeStyle = '#fff'; g.lineWidth = 42; g.stroke();
      g.setLineDash([10, 10]); path(); g.strokeStyle = '#ff4f58'; g.stroke(); g.setLineDash([]);
      path(); g.strokeStyle = '#5b5d70'; g.lineWidth = 36; g.stroke();
      g.setLineDash([12, 14]); path(); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
      for (let c = 0; c < 2; c++) for (let r = 0; r < 6; r++) { g.fillStyle = (c + r) % 2 ? '#2b2340' : '#fff'; g.fillRect(150 + c * 6, 134 + r * 6, 6, 6); }
      g.fillStyle = '#4bb553'; for (const [x, y, r] of [[110, 90, 18], [210, 86, 22], [160, 96, 14]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      const kart = (x, y, a, col, an) => {
        g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#2b2340';
        for (const [tx, ty] of [[-10, -11], [-10, 11], [10, -11], [10, 11]]) g.fillRect(tx - 5, ty - 3, 10, 6);
        g.fillStyle = PARTY_COLORS[col].c; g.beginPath(); g.roundRect(-16, -9, 33, 18, 6); g.fill(); g.restore();
        drawCritter(g, x, y - 6, 10, col, an, { face: a, noShadow: true });
      };
      kart(120, 152, Math.PI, 0, 0); kart(82, 146, Math.PI + 0.3, 1, 2); kart(250, 34, 0, 3, 5);
      g.fillStyle = '#ffb21f'; for (let k = 0; k < 3; k++) { g.globalAlpha = 0.8 - k * 0.25; g.beginPath(); g.arc(140 + k * 9, 152 + (k % 2) * 3, 6 - k, 0, TAU); g.fill(); } g.globalAlpha = 1;
      g.save(); g.translate(200, 30); starPath(g, 0, 0, 10, 4.5); g.fillStyle = '#ffd23f'; g.fill(); g.restore();
    },
    create: ctx => new Race(ctx)
  });
})();
