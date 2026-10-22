'use strict';
/* 趕羊羊 — everyone together herds the sheep into the pen on the right.
   Sheep shy away from you (the soft ring under you shows how far); the button makes
   your animal call out and startles nearby sheep. 大人: more and faster sheep, a
   narrower gate, and a wolf that scatters the flock until someone chases it off.
   The meadow has rounded, bushy corners and the pockets beside the pen nudge sheep
   back out, so nobody gets wedged anywhere. */
(() => {
  const X0 = 50, Y0 = 150, X1 = 1550, Y1 = 870;
  const PX0 = 1270, PX1 = X1, PY0 = 330, PY1 = 690, GC = (PY0 + PY1) / 2;
  const RC = 150;   // radius of the bushy rounded corners
  /* concave corners [x, y, sx, sy]: (sx, sy) points from the rounding circle's centre toward the corner */
  const CORNERS = [[X0, Y0, -1, -1], [X0, Y1, -1, 1], [X1, Y0, 1, -1], [X1, PY0, 1, 1], [X1, PY1, 1, -1], [X1, Y1, 1, 1]];
  const LEGX = [-13, 9, -7, 15], LEGY = [10, 10, 14, 14];
  const WOOL = [[0, 0, 21], [-15, -3, 14], [15, -3, 14], [-8, -14, 13], [8, -14, 13], [-13, 8, 12], [13, 8, 12], [0, -6, 15]];
  const WLEG = [-22, -10, 14, 26];
  const CONF = ['#ff4f58', '#2f8cff', '#ffbf1f', '#22c26a', '#9b5cff', '#ff6fb7'];
  const FONT = '"Noto Sans TC",system-ui,sans-serif';
  let BG = null, WOOLC = null; const FENCE = {};

  /* keep a circle inside the meadow, sliding round the bushy corners */
  function bound(o, r) {
    if (o.x < X0 + r) { o.x = X0 + r; if (o.vx < 0) o.vx = 0; } else if (o.x > X1 - r) { o.x = X1 - r; if (o.vx > 0) o.vx = 0; }
    if (o.y < Y0 + r) { o.y = Y0 + r; if (o.vy < 0) o.vy = 0; } else if (o.y > Y1 - r) { o.y = Y1 - r; if (o.vy > 0) o.vy = 0; }
    for (const c of CORNERS) {
      const cx = c[0] - c[2] * RC, cy = c[1] - c[3] * RC;
      if ((o.x - cx) * c[2] <= 0 || (o.y - cy) * c[3] <= 0 || (c[1] - o.y) * c[3] < -4) continue;
      const dx = o.x - cx, dy = o.y - cy, d = hyp(dx, dy), lim = RC - r;
      if (d > lim) {
        o.x = cx + dx / d * lim; o.y = cy + dy / d * lim;
        const vn = (o.vx * dx + o.vy * dy) / d; if (vn > 0) { o.vx -= vn * dx / d; o.vy -= vn * dy / d; }
      }
    }
  }
  function heart(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x - s * 1.1, y - s * 0.3, x - s * 0.5, y - s * 1.05, x, y - s * 0.45);
    g.bezierCurveTo(x + s * 0.5, y - s * 1.05, x + s * 1.1, y - s * 0.3, x, y + s * 0.35); g.fill();
  }
  function bubble(g, x, y, text, size, col) {
    g.font = `900 ${size}px ${FONT}`; const w = g.measureText(text).width + size * 0.9, h = size * 1.55;
    g.fillStyle = '#fff'; g.strokeStyle = col || 'rgba(43,35,64,.25)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(x - w / 2, y - h, w, h, h / 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x - 8, y - 2); g.lineTo(x - 2, y + 12); g.lineTo(x + 8, y - 2); g.fill();
    g.fillStyle = '#2b2340'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - h / 2 + 1);
  }
  function bush(g, x, y, s) {
    g.fillStyle = 'rgba(30,70,20,.25)'; g.beginPath(); g.ellipse(x + 6 * s, y + 30 * s, 52 * s, 16 * s, 0, 0, TAU); g.fill();
    for (const [dx, dy, r, c] of [[-26, 6, 30, '#3f9a3c'], [24, 8, 30, '#3f9a3c'], [0, -8, 36, '#4fae48'], [-18, -14, 22, '#5cbd52'], [16, -20, 20, '#6ccb5e']]) {
      g.fillStyle = c; g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x - 8 * s, y - 24 * s, 9 * s, 0, TAU); g.fill();
    for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? '#ff6f8f' : '#fff'; g.beginPath(); g.arc(x + (k * 23 - 22) * s, y + (k % 2 ? -6 : 10) * s, 4 * s, 0, TAU); g.fill(); }
  }
  function tree(g, x, y, s) {
    g.fillStyle = 'rgba(30,70,20,.25)'; g.beginPath(); g.ellipse(x + 10 * s, y + 6 * s, 50 * s, 14 * s, 0, 0, TAU); g.fill();
    g.fillStyle = '#8a5a2b'; g.beginPath(); g.roundRect(x - 9 * s, y - 50 * s, 18 * s, 56 * s, 6 * s); g.fill();
    for (const [dx, dy, r, c] of [[0, -78, 46, '#2f8a3a'], [-30, -60, 32, '#2f8a3a'], [30, -60, 32, '#38983f'], [-10, -96, 30, '#45ab4a'], [16, -88, 26, '#52ba52']]) {
      g.fillStyle = c; g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill();
    }
    g.fillStyle = '#ff5a5f'; for (const [dx, dy] of [[-22, -70], [20, -96], [26, -58]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, 5 * s, 0, TAU); g.fill(); }
  }
  /* the meadow, drawn once */
  function makeBg() {
    const c = document.createElement('canvas'); c.width = W + 800; c.height = H; const g = c.getContext('2d'); g.translate(400, 0);
    g.fillStyle = '#74c35a'; g.fillRect(-400, 0, W + 800, H);
    g.fillStyle = '#9fdf82'; g.beginPath(); g.roundRect(X0 - 12, Y0 - 12, X1 - X0 + 24, Y1 - Y0 + 24, 40); g.fill();
    // soft light and dark patches, then grass tufts
    for (let i = 0; i < 46; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(40,110,30,.06)'; g.beginPath(); g.ellipse(rnd(X0, X1), rnd(Y0, Y1), rnd(60, 170), rnd(30, 80), rnd(0, 3), 0, TAU); g.fill(); }
    g.lineCap = 'round'; g.lineWidth = 2.5;
    for (let i = 0; i < 750; i++) {
      const x = rnd(-380, W + 380), y = rnd(Y0 - 30, H), s = rnd(0.7, 1.3);
      g.strokeStyle = i % 3 ? 'rgba(60,140,45,.32)' : 'rgba(210,255,180,.4)';
      g.beginPath(); g.moveTo(x - 4 * s, y - 7 * s); g.lineTo(x, y); g.lineTo(x + 1 * s, y - 9 * s); g.moveTo(x, y); g.lineTo(x + 5 * s, y - 6 * s); g.stroke();
    }
    // the dirt path from the meadow to the gate
    const path = () => { g.beginPath(); g.moveTo(X0 - 60, 640); g.bezierCurveTo(420, 700, 700, 420, 960, GC + 20); g.quadraticCurveTo(1150, GC + 10, PX0 + 10, GC); };
    g.strokeStyle = '#d4bb7f'; g.lineWidth = 92; path(); g.stroke();
    g.strokeStyle = '#ead69f'; g.lineWidth = 74; path(); g.stroke();
    g.fillStyle = 'rgba(160,120,70,.35)';
    for (let k = 0; k <= 60; k++) {
      const u = k / 60, x = u < 0.75 ? (X0 - 60) + (960 - X0 + 60) * u / 0.75 : 960 + (PX0 - 960) * (u - 0.75) / 0.25;
      const y = u < 0.75 ? 640 + Math.sin(u / 0.75 * Math.PI) * 20 - (640 - GC) * Math.pow(u / 0.75, 1.4) : GC + 10 * (1 - (u - 0.75) / 0.25);
      g.beginPath(); g.ellipse(x + rnd(-24, 24), y + rnd(-18, 18), rnd(3, 6), rnd(2, 4), 0, 0, TAU); g.fill();
    }
    // flowers
    for (let i = 0; i < 120; i++) {
      const x = rnd(X0 + 20, X1 - 20), y = rnd(Y0 + 20, Y1 - 20); if (x > PX0 - 20 && y > PY0 - 20 && y < PY1 + 20) continue;
      const k = rnd(0.6, 1.15), col = ['#fff', '#ffe066', '#ff9fc4', '#c9b6ff'][rint(4)];
      g.strokeStyle = 'rgba(60,140,45,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 4 * k); g.lineTo(x, y + 12 * k); g.stroke();
      g.fillStyle = col; for (let p = 0; p < 5; p++) { const a = p * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 4.2 * k, y + Math.sin(a) * 4.2 * k, 3.2 * k, 0, TAU); g.fill(); }
      g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(x, y, 2.4 * k, 0, TAU); g.fill();
    }
    // bushes in the rounded corners (nobody can walk into them)
    for (const c of CORNERS) {
      const cx = c[0] - c[2] * RC, cy = c[1] - c[3] * RC;
      for (let k = 0; k <= 2; k++) {
        const u = (0.15 + k * 0.35) * Math.PI / 2, a = Math.atan2(c[3] * Math.sin(u), c[2] * Math.cos(u));
        bush(g, cx + Math.cos(a) * (RC + 6), cy + Math.sin(a) * (RC + 6), 0.85);
      }
    }
    // pen floor: straw, a hay bale and a water trough
    g.fillStyle = '#ecd59b'; g.fillRect(PX0, PY0, PX1 - PX0, PY1 - PY0);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(PX0, PY0, PX1 - PX0, 24);
    g.strokeStyle = 'rgba(190,150,80,.55)'; g.lineWidth = 3;
    for (let k = 0; k < 60; k++) { const x = rnd(PX0 + 14, PX1 - 30), y = rnd(PY0 + 14, PY1 - 14), a = rnd(-0.6, 0.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); g.stroke(); }
    g.fillStyle = '#e3b84e'; g.beginPath(); g.roundRect(PX1 - 92, PY0 + 22, 70, 46, 8); g.fill();
    g.strokeStyle = '#b8862c'; g.lineWidth = 3; for (const dy of [15, 31]) { g.beginPath(); g.moveTo(PX1 - 92, PY0 + 22 + dy); g.lineTo(PX1 - 22, PY0 + 22 + dy); g.stroke(); }
    g.fillStyle = '#8a5a2b'; g.beginPath(); g.roundRect(PX1 - 100, PY1 - 66, 80, 40, 10); g.fill();
    g.fillStyle = '#5fc3ff'; g.beginPath(); g.roundRect(PX1 - 94, PY1 - 60, 68, 22, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(PX1 - 84, PY1 - 56, 26, 4);
    // trees round the outside
    for (const [x, y, s] of [[120, 148, 0.95], [-10, 260, 1], [1490, 140, 0.9], [1610, 300, 1], [-20, 560, 1.1], [10, 905, 1.1], [1620, 880, 1.1], [420, 920, 0.9], [980, 925, 0.9]]) tree(g, x, y, s);
    return c;
  }
  /* the pen fence (drawn over everything), cached per gate size */
  function makeFence(g0, g1) {
    const ox = PX0 - 40, oy = PY0 - 40, c = document.createElement('canvas'); c.width = PX1 - ox + 30; c.height = PY1 - oy + 40;
    const g = c.getContext('2d'); g.translate(-ox, -oy);
    const segs = [[PX0, PY0, PX1 - 6, PY0], [PX0, PY1, PX1 - 6, PY1], [PX1 - 6, PY0, PX1 - 6, PY1], [PX0, PY0, PX0, g0 - 14], [PX0, g1 + 14, PX0, PY1]];
    g.lineCap = 'round';
    for (const [lw, col, off] of [[14, 'rgba(60,40,20,.25)', 5], [11, '#a8703c', 0], [4, '#c9925a', -3]]) {
      g.strokeStyle = col; g.lineWidth = lw;
      for (const [ax, ay, bx, by] of segs) for (const rail of [-7, 7]) {
        const vert = ax === bx, rx = vert ? rail : 0, ry = vert ? 0 : rail;
        g.beginPath(); g.moveTo(ax + rx, ay + ry + off); g.lineTo(bx + rx, by + ry + off); g.stroke();
      }
    }
    for (const [ax, ay, bx, by] of segs) {
      const L = hyp(bx - ax, by - ay), n = Math.max(1, Math.round(L / 56));
      for (let k = 0; k <= n; k++) {
        const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n;
        g.fillStyle = 'rgba(60,40,20,.25)'; g.beginPath(); g.roundRect(x - 8, y - 12, 18, 30, 5); g.fill();
        g.fillStyle = '#7a4a22'; g.beginPath(); g.roundRect(x - 9, y - 18, 18, 30, 5); g.fill();
        g.fillStyle = '#9a6434'; g.beginPath(); g.roundRect(x - 6, y - 16, 7, 24, 3); g.fill();
      }
    }
    return { c, ox, oy };
  }
  /* one fluffy fleece, drawn once and stamped for every sheep */
  function makeWool() {
    const c = document.createElement('canvas'); c.width = 84; c.height = 72; const g = c.getContext('2d'); g.translate(42, 40);
    g.fillStyle = '#cfc8de'; for (const [x, y, r] of WOOL) { g.beginPath(); g.arc(x, y, r + 2.5, 0, TAU); g.fill(); }
    g.fillStyle = '#ebe7f3'; for (const [x, y, r] of WOOL) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.fillStyle = '#ffffff'; for (const [x, y, r] of WOOL) { g.beginPath(); g.arc(x - 1, y - 3, r - 3, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y] of [[-10, -18], [6, -20], [-18, -6]]) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(200,190,220,.8)'; g.lineWidth = 2;
    for (const [x, y] of [[-6, 4], [8, 0], [0, 12], [-14, 10], [14, 10]]) { g.beginPath(); g.arc(x, y, 4, 0.3, Math.PI * 1.4); g.stroke(); }
    return c;
  }

  class Sheep {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.ok = false;
      const n = ctx.players.length, kid = this.kid;
      this.dur = kid ? 150 : 120;
      this.gh = kid ? 180 : 130; this.g0 = GC - this.gh / 2; this.g1 = GC + this.gh / 2;
      this.segs = [[PX0, PY0, PX1, PY0], [PX0, PY1, PX1, PY1], [PX0, PY0, PX0, this.g0], [PX0, this.g1, PX0, PY1]];
      this.R = kid ? 220 : 195;   // how far the sheep keep away from you
      this.es = ctx.players.map((p, i) => ({ p, kind: 0, x: 160 + (i % 2) * 80, y: Y0 + 80 + (Y1 - Y0 - 160) * (i + 1) / (n + 1), vx: 0, vy: 0, face: 0, r: 32, cd: 0, walk: 0, herd: 0, say: 0, squash: 0, sqv: 0, moving: false }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      const count = kid ? Math.min(10, 5 + n) : Math.min(18, 8 + n * 2);
      this.sheep = [];
      for (let k = 0; k < count; k++) {
        let x, y, tries = 0;
        do { x = kid ? rnd(420, 1020) : rnd(300, 980); y = rnd(Y0 + 90, Y1 - 90); tries++; } while (tries < 40 && this.sheep.some(s => hyp(s.x - x, s.y - y) < 72));
        this.sheep.push({ kind: 1, x, y, vx: 0, vy: 0, wa: rnd(0, TAU), in: false, panic: 0, by: null, r: 26, fs: Math.random() < 0.5 ? 1 : -1,
          step: rnd(0, TAU), ph: rnd(0, TAU), jump: 0, say: 0, sayTxt: '咩～', baaT: rnd(2, 9), heart: 0, hint: false, hopT: rnd(1, 4), graze: 0, blink: rnd(1, 4) });
      }
      this.total = count; this.inN = 0; this.doneT = -1; this.leftAtDone = 0; this.signPop = 0;
      this.wolf = kid ? null : { kind: 2, st: 'away', t: 22, x: -90, y: 500, vx: 0, vy: 0, pause: 0, face: 1, run: 0, r: 40, scared: 0 };
      this.draws = this.sheep.concat(this.es); if (this.wolf) this.draws.push(this.wolf);
      this.confetti = [];
      for (let i = 0; i < 70; i++) this.confetti.push({ x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, c: CONF[i % 6], life: 0 });
      if (!BG) BG = makeBg();
      if (!WOOLC) WOOLC = makeWool();
      const key = this.gh; if (!FENCE[key]) FENCE[key] = makeFence(this.g0, this.g1); this.fenceC = FENCE[key];
    }
    /* push a circle out of the pen fence */
    fence(o, r, inside) {
      for (const [ax, ay, bx, by] of this.segs) {
        const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, u = clamp(((o.x - ax) * dx + (o.y - ay) * dy) / L, 0, 1);
        const cx = ax + dx * u, cy = ay + dy * u, ex = o.x - cx, ey = o.y - cy, d = hyp(ex, ey);
        if (d < r && d > 0) { o.x = cx + ex / d * r; o.y = cy + ey / d * r; const vn = o.vx * ex / d + o.vy * ey / d; if (vn < 0) { o.vx -= vn * ex / d; o.vy -= vn * ey / d; } }
      }
      if (inside) { o.x = clamp(o.x, PX0 + r + 4, PX1 - r); o.y = clamp(o.y, PY0 + r, PY1 - r); }
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      this.signPop = Math.max(0, this.signPop - dt * 3);
      // players: quick to start, quick to stop, a little squash and stretch
      for (const e of this.es) {
        e.cd -= dt; e.say -= dt;
        const i = ctx.input(e.p), sp = kid ? 350 : 390, go = !!(i.x || i.y), k = 1 - Math.exp(-(go ? 14 : 24) * dt);
        e.vx += (i.x * sp - e.vx) * k; e.vy += (i.y * sp - e.vy) * k;
        if (go !== e.moving) { e.moving = go; e.sqv += go ? -2.2 : 2.6; }
        if (go) { e.face = Math.atan2(i.y, i.x); e.walk += dt * 13; } else e.walk = 0;
        e.sqv += (-e.squash * 260 - e.sqv * 16) * dt; e.squash += e.sqv * dt;
        e.x += e.vx * dt; e.y += e.vy * dt;
        bound(e, e.r); this.fence(e, e.r);
        Fx.walk(e, dt, 'rgba(255,255,255,.75)');
        if (ctx.pressed(e.p, 0) && e.cd <= 0) {
          e.cd = 1.5; e.say = 0.8; e.sqv += 3.2; ctx.sfx('say', e.p.animal);
          Fx.ring(e.x, e.y, PARTY_COLORS[e.p.col].c, 300, 0.5);
          for (const s of this.sheep) {
            if (s.in) continue; const dx = s.x - e.x, dy = s.y - e.y, d = hyp(dx, dy);
            if (d < 300 && d > 0) {
              const f = (kid ? 360 : 420) * (1 - d / 300) + 120; s.vx += dx / d * f; s.vy += dy / d * f; s.panic = 0.9; s.by = e.p;
              if (s.jump <= 0) s.jump = 0.001;
              if (d < 200 && Math.random() < 0.5) { s.say = 1; s.sayTxt = '咩！'; }
            }
          }
          const w = this.wolf; if (w && w.st === 'hunt' && hyp(w.x - e.x, w.y - e.y) < 340) this.scareWolf(e);
        }
      }
      // sheep
      const R = this.R, vmax = kid ? 190 : 245, pull = kid ? 180 : 80;
      let talking = 0; for (const s of this.sheep) if (s.say > 0) talking++;
      for (const s of this.sheep) {
        s.panic -= dt; s.heart -= dt; s.say -= dt; s.blink -= dt; if (s.blink < -0.12) s.blink = rnd(2, 5);
        if (s.jump > 0) { s.jump += dt; if (s.jump > 0.42) s.jump = 0; }
        s.baaT -= dt;
        if (s.baaT <= 0) {
          s.baaT = rnd(5, 13);
          if (talking < 3 && s.say <= 0) { s.say = 1.3; s.sayTxt = s.in ? '咩～♪' : '咩～'; talking++; if (Math.random() < 0.5) ctx.sfx('baa'); }
        }
        let fx = 0, fy = 0;
        if (s.in) {
          s.wa += rnd(-1, 1) * dt * 2; fx += Math.cos(s.wa) * 30 + (PX1 - 90 - s.x) * 0.25; fy += Math.sin(s.wa) * 30;
          for (const o of this.sheep) if (o !== s && o.in) { const dx = s.x - o.x, dy = s.y - o.y, d = hyp(dx, dy); if (d < 54 && d > 0) { fx += dx / d * 170; fy += dy / d * 170; } }
          s.vx += fx * dt; s.vy += fy * dt; const k = Math.exp(-3 * dt); s.vx *= k; s.vy *= k;
          const m = hyp(s.vx, s.vy); if (m > 60) { s.vx *= 60 / m; s.vy *= 60 / m; }
          s.x += s.vx * dt; s.y += s.vy * dt; this.fence(s, s.r, true);
          if (Math.abs(s.vx) > 10) s.fs = s.vx > 0 ? 1 : -1;
          s.step += m * dt * 0.09;
          s.hopT -= dt; if (s.hopT <= 0) { s.hopT = rnd(2.5, 6); s.jump = 0.001; if (Math.random() < 0.4) s.heart = 1.1; }
          continue;
        }
        s.wa += rnd(-1, 1) * dt * 3; fx += Math.cos(s.wa) * 40; fy += Math.sin(s.wa) * 40;
        let near = Infinity;
        for (const e of this.es) {
          const dx = s.x - e.x, dy = s.y - e.y, d = hyp(dx, dy);
          if (d < R && d > 0) { const f = (1 - d / R) * 1100; fx += dx / d * f; fy += dy / d * f; if (d < near) { near = d; s.by = e.p; } }
        }
        const w = this.wolf;
        if (w && w.st === 'hunt') {
          const dx = s.x - w.x, dy = s.y - w.y, d = hyp(dx, dy);
          if (d < 240 && d > 0) { fx += dx / d * (1 - d / 240) * 1400; fy += dy / d * (1 - d / 240) * 1400; if (d < 170) s.panic = Math.max(s.panic, 0.3); }
        }
        let cx = 0, cy = 0, cn = 0;
        for (const o of this.sheep) {
          if (o === s || o.in) continue; const dx = s.x - o.x, dy = s.y - o.y, d = hyp(dx, dy);
          if (d < 58 && d > 0) { fx += dx / d * 220; fy += dy / d * 220; }
          if (d < 170) { cx += o.x; cy += o.y; cn++; }
        }
        if (cn && near > R) { fx += (cx / cn - s.x) * 0.5; fy += (cy / cn - s.y) * 0.5; }
        // stay off the edges and out of the dead-end pockets beside the pen
        const m0 = 80; if (s.x < X0 + m0) fx += 320; if (s.x > X1 - m0) fx -= 320; if (s.y < Y0 + m0) fy += 320; if (s.y > Y1 - m0) fy -= 320;
        if (s.x > PX0 - 40 && (s.y < PY0 + 10 || s.y > PY1 - 10)) fx -= kid ? 300 : 230;
        // close to the gate: a gentle pull through it (and along the fence toward it)
        s.hint = false;
        const gx = PX0 - s.x, gy = GC - s.y;
        if (gx > 0 && gx < 300 && Math.abs(gy) < this.gh / 2 + 170) {
          const d = hyp(gx + 50, gy) || 1, f = pull * (1 - gx / 300); fx += (gx + 50) / d * f; fy += gy / d * f * 1.4; s.hint = true;
        }
        if (gx > -10 && gx < 90 && Math.abs(gy) > this.gh / 2 - 10) fy += Math.sign(gy) * (kid ? 260 : 200);
        s.vx += fx * dt; s.vy += fy * dt;
        const k = Math.exp(-(s.panic > 0 ? 1.2 : 2.4) * dt); s.vx *= k; s.vy *= k;
        const cap = s.panic > 0 ? vmax * 1.6 : vmax, m = hyp(s.vx, s.vy); if (m > cap) { s.vx *= cap / m; s.vy *= cap / m; }
        s.x += s.vx * dt; s.y += s.vy * dt;
        bound(s, s.r); this.fence(s, s.r);
        if (Math.abs(s.vx) > 14) s.fs = s.vx > 0 ? 1 : -1;
        s.step += Math.min(m, 260) * dt * 0.09;
        s.graze = m < 25 && near > R ? Math.min(1, s.graze + dt * 2) : Math.max(0, s.graze - dt * 5);
        if (m > 160 && Math.random() < dt * 6) Fx.dust(s.x, s.y + 20, 'rgba(255,255,255,.6)', 7);
        if (s.x > PX0 + s.r + 6 && s.x < PX1 && s.y > PY0 && s.y < PY1) this.penned(s);
      }
      this.wolfTick(dt);
      // the last one is home: a little party, then the round ends
      if (this.doneT >= 0) {
        this.doneT += dt;
        if (this.doneT < 1.1 && Math.random() < dt * 10) this.confettiBurst(rnd(PX0 + 30, PX1 - 30), rnd(PY0, PY1 - 100), 6);
        if (this.doneT >= 1.7) { this.ok = true; this.over = true; }
      }
      for (const c of this.confetti) if (c.life > 0) { c.life -= dt; c.vy += 520 * dt; c.vx *= 0.985; c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt; }
      if (this.t >= this.dur && this.doneT < 0) this.over = true;
    }
    penned(s) {
      const ctx = this.ctx; let talking = 0; for (const o of this.sheep) if (o.say > 0) talking++;
      s.in = true; s.heart = 1.3; s.jump = 0.001; if (talking < 3) { s.say = 1.2; s.sayTxt = '咩～♪'; } s.panic = 0; this.inN++; s.vx *= 0.3; s.vy *= 0.3; this.signPop = 1;
      const e = s.by && this.by.get(s.by); if (e) { e.herd++; ctx.buzz(e.p, 60); Fx.pop(e.x, e.y - 72, '+1', PARTY_COLORS[e.p.col].d, 36); }
      ctx.sfx('coin'); Fx.ring(s.x, s.y, '#ffe066', 70, 0.45); Fx.burst(s.x, s.y - 20, '#ffd6e2', 8, 180);
      if (this.inN === this.total) {
        this.doneT = 0; this.leftAtDone = Math.max(0, Math.ceil(this.dur - this.t));
        Fx.announce('羊羊全部回家了！', '#2fae5f'); Fx.flash('#fff6c8', 0.35); ctx.sfx('star');
        this.confettiBurst((PX0 + PX1) / 2, PY0 + 40, 40);
        this.es.forEach(q => ctx.buzz(q.p, 120));
        if (this.wolf && this.wolf.st === 'hunt') this.scareWolf(null);
      } else if (this.total - this.inN <= 2 && this.total > 3) Fx.pop((PX0 + PX1) / 2, PY0 - 120, '還差 ' + (this.total - this.inN) + ' 隻！', '#2fae5f', 34);
    }
    confettiBurst(x, y, n) {
      for (const c of this.confetti) {
        if (n <= 0) break; if (c.life > 0) continue; n--;
        const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), sp = rnd(220, 560);
        c.x = x; c.y = y; c.vx = Math.cos(a) * sp; c.vy = Math.sin(a) * sp; c.a = rnd(0, TAU); c.va = rnd(-12, 12); c.life = rnd(1.1, 1.8);
      }
    }
    scareWolf(e) {
      const w = this.wolf; if (w.st !== 'hunt') return; w.st = 'flee'; w.pause = 0; w.scared = 0.6;
      Fx.pop(w.x, w.y - 80, '嗚～', '#555', 40); Fx.burst(w.x, w.y - 10, '#9a9cab', 8, 220);
      if (e) { Fx.pop(e.x, e.y - 76, '走開！', PARTY_COLORS[e.p.col].d, 36); this.ctx.buzz(e.p, 80); }
      this.ctx.sfx('bonk', 0.4);
    }
    wolfTick(dt) {
      const w = this.wolf; if (!w) return;
      w.scared -= dt;
      if (w.st === 'away') {
        w.t -= dt;
        if (w.t <= 0 && this.inN < this.total && this.doneT < 0) {
          w.st = 'warn'; w.t = 2; w.x = -90; w.y = rnd(Y0 + 160, Y1 - 160);
          this.ctx.sfx('howl'); Fx.announce('大野狼來了！', '#c0392b'); Fx.shake(5);
        }
        return;
      }
      if (w.st === 'warn') { w.t -= dt; if (w.t <= 0) { w.st = 'hunt'; w.vx = 260; w.vy = 0; w.face = 1; } return; }
      const sp0 = hyp(w.vx, w.vy); w.run += dt * (4 + sp0 / 28);
      if (w.st === 'flee') {
        w.vx += (-480 - w.vx) * (1 - Math.exp(-6 * dt)); w.vy *= 0.92; w.x += w.vx * dt; w.y += w.vy * dt; w.face = -1;
        Fx.walk(w, dt, 'rgba(255,255,255,.7)');
        if (w.x < -110) { w.st = 'away'; w.t = 15; }
        return;
      }
      // hunting: chase the nearest loose sheep
      for (const e of this.es) if (hyp(e.x - w.x, e.y - w.y) < 105) { this.scareWolf(e); return; }
      w.pause -= dt;
      let best = null, bd = Infinity;
      for (const s of this.sheep) if (!s.in) { const d = hyp(s.x - w.x, s.y - w.y); if (d < bd) { bd = d; best = s; } }
      if (!best) { this.scareWolf(null); return; }
      if (w.pause <= 0) {
        const dx = best.x - w.x, dy = best.y - w.y, d = hyp(dx, dy) || 1;
        w.vx += (dx / d * 215 - w.vx) * (1 - Math.exp(-4 * dt)); w.vy += (dy / d * 215 - w.vy) * (1 - Math.exp(-4 * dt));
        if (d < best.r + 30) {
          w.pause = 1.1; best.panic = 1.4; const a = rnd(0, TAU); best.vx = Math.cos(a) * 380; best.vy = Math.sin(a) * 380; best.by = null;
          best.jump = 0.001; best.say = 1; best.sayTxt = '咩！！';
          this.ctx.sfx('baa'); Fx.burst(best.x, best.y - 10, '#ffffff', 12, 280); Fx.shake(4);
        }
      } else { w.vx *= 0.9; w.vy *= 0.9; }
      w.x += w.vx * dt; w.y += w.vy * dt; w.x = Math.min(w.x, X1 - 40); w.y = clamp(w.y, Y0 + 40, Y1 - 40);
      if (w.y > PY0 - 40 && w.y < PY1 + 40) w.x = Math.min(w.x, PX0 - 44);   // the wolf never goes into the pen
      if (Math.abs(w.vx) > 20) w.face = w.vx > 0 ? 1 : -1;
      Fx.walk(w, dt, 'rgba(255,255,255,.6)');
    }
    drawSheep(g, s, t) {
      const mv = Math.min(1, hyp(s.vx, s.vy) / 110), f = s.fs;
      const jh = s.jump > 0 ? Math.sin(s.jump / 0.42 * Math.PI) * (s.in ? 16 : 26) : 0;
      const bob = Math.abs(Math.sin(s.step)) * 3 * mv, br = Math.sin(t * 2.3 + s.ph) * 0.035;
      const x = s.x, y = s.y - jh - bob;
      const sh = 1 - jh / 70;
      if (s.hint) { g.globalAlpha = 0.35 + 0.2 * Math.sin(t * 6 + s.ph); g.fillStyle = '#fff27a'; g.beginPath(); g.ellipse(s.x, s.y + 18, 36, 13, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
      g.fillStyle = 'rgba(30,60,20,.22)'; g.beginPath(); g.ellipse(s.x, s.y + 19, 27 * sh, 8 * sh, 0, 0, TAU); g.fill();
      // legs: diagonal pairs swing together
      g.fillStyle = '#3a3346';
      for (let i = 0; i < 4; i++) {
        const ph = s.step * 2 + (i === 0 || i === 3 ? 0 : Math.PI), sw = Math.sin(ph) * 6 * mv, lift = Math.max(0, Math.cos(ph)) * 4 * mv;
        const tuck = jh > 4 ? 5 : 0;
        g.beginPath(); g.roundRect(x + LEGX[i] * f + sw * f - 3, y + LEGY[i] - lift - tuck, 6, 14 - tuck * 0.6, 3); g.fill();
      }
      // tail
      g.fillStyle = '#f4f1fa'; g.beginPath(); g.arc(x - f * 25, y - 6 + Math.sin(t * 9 + s.ph) * 1.5, 7, 0, TAU); g.fill();
      // fleece (breathes a little)
      const ww = 84 * (1 - br * 0.6), wh = 72 * (1 + br);
      g.drawImage(WOOLC, x - ww / 2, y - 8 - wh * 0.555, ww, wh);
      // head
      const down = s.graze * 7, nod = Math.sin(s.step * 2) * 1.5 * mv;
      const hx = x + f * 23, hy = y - 8 + down + nod;
      const flap = Math.sin(t * 3 + s.ph) * 0.25 + (s.panic > 0 ? -0.5 : 0);
      g.fillStyle = '#3a3346';
      g.beginPath(); g.ellipse(hx - f * 9, hy - 7, 8, 4, f * (-0.5 + flap), 0, TAU); g.fill();
      g.beginPath(); g.ellipse(hx, hy, 11, 13, f * 0.25, 0, TAU); g.fill();
      g.fillStyle = '#ffb3c6'; g.beginPath(); g.ellipse(hx - f * 9, hy - 7, 4, 2, f * (-0.5 + flap), 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(hx - f * 2, hy - 12, 7, 0, TAU); g.fill(); g.beginPath(); g.arc(hx + f * 4, hy - 13, 5, 0, TAU); g.fill();
      const ex = hx + f * 4, ey = hy - 2, scared = s.panic > 0 && !s.in;
      if (s.blink < 0 && !scared) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(ex - 3, ey); g.lineTo(ex + 3, ey); g.stroke(); }
      else if (s.in && s.heart > 0) { g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.beginPath(); g.arc(ex, ey + 1.5, 3.2, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
      else {
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, scared ? 5 : 3.8, 0, TAU); g.fill();
        g.fillStyle = '#2b2340'; g.beginPath(); g.arc(ex + f * (scared ? 0.5 : 1.2), ey + 0.3, scared ? 1.6 : 2, 0, TAU); g.fill();
      }
      if (s.say > 0) { g.fillStyle = '#ff8fab'; g.beginPath(); g.ellipse(hx + f * 6, hy + 7, 3, 2.4 + Math.abs(Math.sin(t * 18)) * 1.6, 0, 0, TAU); g.fill(); }
      // sweat when scared
      if (scared) {
        const k = (t * 2.5 + s.ph) % 1;
        g.globalAlpha = 1 - k; g.fillStyle = '#7fd0ff';
        g.beginPath(); g.ellipse(x - f * 20 - f * k * 10, y - 30 + k * 8, 3.5, 6, f * 0.4, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(x - f * 4 - f * k * 6, y - 38 - k * 4, 3, 5, -f * 0.2, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      if (s.hint) {   // a little arrow: "this way!"
        const ax = x + 2 + Math.sin(t * 7) * 4, ay = y - 46;
        g.fillStyle = '#ffd23f'; g.strokeStyle = '#fff'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(ax - 10, ay - 6); g.lineTo(ax + 2, ay - 6); g.lineTo(ax + 2, ay - 12); g.lineTo(ax + 14, ay); g.lineTo(ax + 2, ay + 12); g.lineTo(ax + 2, ay + 6); g.lineTo(ax - 10, ay + 6); g.closePath(); g.stroke(); g.fill();
      }
      if (s.heart > 0) { const k = 1 - s.heart / 1.3; g.globalAlpha = Math.min(1, s.heart * 2); g.fillStyle = '#ff4f6d'; heart(g, x + 10 * Math.sin(k * 6), y - 40 - k * 40, 12 + k * 4); g.globalAlpha = 1; }
    }
    drawWolf(g, w, t) {
      if (w.st === 'away' || w.st === 'warn') return;
      const flee = w.st === 'flee', sp = Math.min(1, hyp(w.vx, w.vy) / 200), f = w.face, lunge = w.pause > 0.6;
      const bob = Math.abs(Math.sin(w.run)) * 5 * sp, x = w.x, y = w.y - bob;
      g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(w.x, w.y + 30, 44, 11, 0, 0, TAU); g.fill();
      g.save(); g.translate(x, y); g.scale(f, 1); g.rotate(flee ? -0.06 : 0.08 * sp);
      // legs
      g.strokeStyle = '#4c4e5a'; g.lineWidth = 9; g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const lx = WLEG[i], ph = w.run + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0), sw = Math.sin(ph) * 14 * sp;
        g.beginPath(); g.moveTo(lx, 14); g.lineTo(lx + sw, 30 - Math.max(0, Math.cos(ph)) * 6 * sp); g.stroke();
      }
      // tail: up and wagging when hunting, tucked when running away
      g.fillStyle = '#6d6f7d'; g.strokeStyle = '#43444f'; g.lineWidth = 3;
      g.save(); g.translate(-30, -2); g.rotate(flee ? 0.9 : -0.5 + Math.sin(t * 10) * 0.25);
      g.beginPath(); g.ellipse(-18, 0, 22, 9, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#e4e5ec'; g.beginPath(); g.ellipse(-34, 0, 7, 6, 0, 0, TAU); g.fill();
      g.restore();
      g.fillStyle = '#6d6f7d';
      g.beginPath(); g.ellipse(0, 4, 36, 23, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#d8d9e2'; g.beginPath(); g.ellipse(4, 14, 22, 9, 0, 0, TAU); g.fill();
      // head
      g.fillStyle = '#6d6f7d'; g.beginPath(); g.arc(28, -14, 22, 0, TAU); g.fill(); g.stroke();
      const earA = flee ? 0.7 : 0;
      for (const ex of [16, 32]) { g.save(); g.translate(ex, -30); g.rotate(earA); g.beginPath(); g.moveTo(-8, 2); g.lineTo(0, -18); g.lineTo(8, 2); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ffb3c6'; g.beginPath(); g.moveTo(-4, 0); g.lineTo(0, -10); g.lineTo(4, 0); g.fill(); g.fillStyle = '#6d6f7d'; g.restore(); }
      g.fillStyle = '#d8d9e2'; g.beginPath(); g.ellipse(42, -6, 15, 10, 0, 0, TAU); g.fill();
      g.fillStyle = '#2b2340'; g.beginPath(); g.arc(54, -10, 4.5, 0, TAU); g.fill();
      if (lunge || (!flee && sp > 0.5)) {   // open jaw with teeth
        g.fillStyle = '#7a1f2b'; g.beginPath(); g.moveTo(32, 0); g.lineTo(56, 0); g.lineTo(48, lunge ? 12 : 7); g.closePath(); g.fill();
        g.fillStyle = '#fff'; for (const tx of [38, 46]) { g.beginPath(); g.moveTo(tx, 0); g.lineTo(tx + 3, 5); g.lineTo(tx + 6, 0); g.fill(); }
      }
      if (flee) {   // squeezed eyes
        g.strokeStyle = '#2b2340'; g.lineWidth = 3;
        for (const ex of [20, 33]) { g.beginPath(); g.moveTo(ex - 5, -24); g.lineTo(ex + 2, -20); g.lineTo(ex - 5, -16); g.stroke(); }
      } else {
        g.fillStyle = '#ffe066'; for (const ex of [20, 33]) { g.beginPath(); g.arc(ex, -20, 5, 0, TAU); g.fill(); }
        g.fillStyle = '#2b2340'; for (const ex of [21, 34]) { g.beginPath(); g.arc(ex + 1, -20, 2.2, 0, TAU); g.fill(); }
        g.strokeStyle = '#2b2340'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(13, -30); g.lineTo(25, -25); g.moveTo(40, -30); g.lineTo(29, -25); g.stroke();
      }
      g.restore();
      if (flee) {
        const k = (t * 3) % 1; g.globalAlpha = 1 - k; g.fillStyle = '#7fd0ff';
        g.beginPath(); g.ellipse(x - f * 34 - f * k * 12, y - 44 - k * 10, 5, 8, 0.3, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(x - f * 10 - f * k * 6, y - 52 - k * 14, 4, 7, -0.3, 0, TAU); g.fill(); g.globalAlpha = 1;
      } else if (sp > 0.3) {   // speed lines behind
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4; g.lineCap = 'round';
        for (let k = 0; k < 3; k++) { const ly = y - 14 + k * 14, lx = x - f * (56 + ((t * 300 + k * 30) % 40)); g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx - f * 22, ly); g.stroke(); }
      }
    }
    drawPlayer(g, e, t) {
      const C = PARTY_COLORS[e.p.col], hop = e.walk ? Math.abs(Math.sin(e.walk)) * 8 : 0;
      drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: clamp(e.squash, -0.22, 0.28), hop, happy: e.say > 0, blink: (t + e.p.uid * 1.3) % 3.6 < 0.12 });
      drawTag(g, e.x, e.y - e.r - 30 - hop, e.p);
      if (e.cd > 0) {   // cooldown arc under the feet
        g.strokeStyle = C.c; g.globalAlpha = 0.8; g.lineWidth = 5; g.beginPath(); g.arc(e.x, e.y + e.r + 12, 9, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - e.cd / 1.5)); g.stroke(); g.globalAlpha = 1;
      }
    }
    draw(g) {
      const t = this.t, w = this.wolf;
      g.drawImage(BG, -400, 0);
      // glowing gate and arrows walking into it
      const p = 0.5 + 0.5 * Math.sin(t * 4), g0 = this.g0, gh = this.gh;
      g.fillStyle = '#fff6a8';
      g.globalAlpha = 0.16 + 0.1 * p; g.beginPath(); g.roundRect(PX0 - 70, g0 - 16, 140, gh + 32, 40); g.fill();
      g.globalAlpha = 0.22 + 0.14 * p; g.beginPath(); g.roundRect(PX0 - 40, g0 - 2, 80, gh + 4, 30); g.fill();
      g.globalAlpha = 0.3 + 0.2 * p; g.beginPath(); g.roundRect(PX0 - 14, g0 + 8, 28, gh - 16, 14); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round';
      for (let k = 0; k < 3; k++) {
        const u = ((t * 0.8 + k / 3) % 1), ax = PX0 - 230 + u * 190;
        g.globalAlpha = Math.sin(u * Math.PI) * 0.85;
        g.beginPath(); g.moveTo(ax - 18, GC - 30); g.lineTo(ax + 12, GC); g.lineTo(ax - 18, GC + 30); g.stroke();
      }
      g.globalAlpha = 1;
      // soft "scare" circle under each player
      for (const e of this.es) {
        const C = PARTY_COLORS[e.p.col], rr = this.R * (0.97 + 0.03 * Math.sin(t * 3 + e.p.uid));
        g.fillStyle = C.c; g.globalAlpha = 0.09; g.beginPath(); g.ellipse(e.x, e.y + 10, rr, rr * 0.82, 0, 0, TAU); g.fill();
        g.strokeStyle = C.c; g.globalAlpha = 0.32; g.lineWidth = 3; g.stroke();
      }
      g.globalAlpha = 1;
      // the wolf is coming: a blinking warning where it will run in
      if (w && w.st === 'warn') {
        const on = (t * 6 | 0) % 2, x = X0 + 60, y = w.y;
        g.globalAlpha = on ? 1 : 0.55; g.fillStyle = '#ff3b30'; g.strokeStyle = '#fff'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(x, y - 46); g.lineTo(x + 44, y + 30); g.lineTo(x - 44, y + 30); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.font = `900 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', x, y + 6);
        g.globalAlpha = 1;
      }
      Fx.ground(g);
      // everyone, back to front
      const L = this.draws; L.sort((a, b) => a.y - b.y);
      for (const o of L) { if (o.kind === 1) this.drawSheep(g, o, t); else if (o.kind === 0) this.drawPlayer(g, o, t); else this.drawWolf(g, o, t); }
      // fence over everything, then the gate posts with flags
      g.drawImage(this.fenceC.c, this.fenceC.ox, this.fenceC.oy);
      for (const [py, s] of [[this.g0 - 6, -1], [this.g1 + 6, 1]]) {
        g.fillStyle = 'rgba(60,40,20,.25)'; g.beginPath(); g.roundRect(PX0 - 10, py - 30 + 6, 24, 44, 6); g.fill();
        g.fillStyle = '#7a4a22'; g.beginPath(); g.roundRect(PX0 - 12, py - 34, 24, 46, 6); g.fill();
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(PX0, py - 38, 10 + p * 2, 0, TAU); g.fill();
        g.strokeStyle = '#5a3a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(PX0, py - 46); g.lineTo(PX0, py - 96); g.stroke();
        const wv = Math.sin(t * 6 + s) * 6;
        g.fillStyle = '#2fae5f'; g.beginPath(); g.moveTo(PX0, py - 96); g.quadraticCurveTo(PX0 - 22, py - 90 + wv, PX0 - 44, py - 84 + wv); g.lineTo(PX0, py - 70); g.fill();
      }
      // pen sign with the count
      const sx = (PX0 + PX1) / 2, sy = PY0 - 70, sp = 1 + Math.sin(this.signPop * Math.PI) * 0.12;
      g.fillStyle = '#7a4a22'; g.fillRect(sx - 70, sy + 20, 10, 42); g.fillRect(sx + 60, sy + 20, 10, 42);
      let behind = false;
      for (const o of this.draws) if (!o.in && o.x > sx - 130 && o.x < sx + 130 && o.y > sy - 70 && o.y < sy + 90) { behind = true; break; }
      g.save(); g.translate(sx, sy); g.scale(sp, sp); if (behind) g.globalAlpha = 0.45;
      g.fillStyle = 'rgba(60,40,20,.25)'; g.beginPath(); g.roundRect(-106, -36, 216, 76, 14); g.fill();
      g.fillStyle = '#fff3d6'; g.strokeStyle = '#a8703c'; g.lineWidth = 6; g.beginPath(); g.roundRect(-108, -42, 216, 76, 14); g.fill(); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#7a4a22'; g.font = `900 22px ${FONT}`; g.fillText('羊羊的家', 0, -22);
      g.fillStyle = this.inN === this.total ? '#2fae5f' : '#2b2340'; g.font = `900 34px "Fredoka",${FONT}`; g.fillText('🐑 ' + this.inN + ' / ' + this.total, 0, 12);
      g.restore();
      // speech bubbles on top
      for (const s of this.sheep) if (s.say > 0) {
        const k = Math.min(1, s.say * 4), jh = s.jump > 0 ? Math.sin(s.jump / 0.42 * Math.PI) * 26 : 0;
        g.globalAlpha = k; bubble(g, s.x + s.fs * 26, s.y - 52 - jh, s.sayTxt, 20, s.sayTxt === '咩～' ? null : '#ff8fab'); g.globalAlpha = 1;
      }
      for (const e of this.es) if (e.say > 0) bubble(g, e.x + 44, e.y - 70, PARTY_ANIMALS[e.p.animal].say, 24, PARTY_COLORS[e.p.col].c);
      for (const c of this.confetti) if (c.life > 0) {
        g.globalAlpha = Math.min(1, c.life * 2); g.fillStyle = c.c;
        g.save(); g.translate(c.x, c.y); g.rotate(c.a); g.fillRect(-6, -3.5, 12, 7); g.restore();
      }
      g.globalAlpha = 1;
    }
    center() {
      const w = this.wolf;
      if (w && (w.st === 'warn' || w.st === 'hunt')) return '🐺 大野狼來了！靠近牠或叫一聲趕走牠';
      return '🐑 回家 ' + this.inN + ' / ' + this.total;
    }
    chip(p) { return '🐑 ' + this.by.get(p).herd; }
    pad(p) { return '🐑 ' + this.inN + '/' + this.total + ' 回家　你趕回 ' + this.by.get(p).herd + ' 隻'; }
    ready(p) { return this.by.get(p).cd <= 0; }
    results() {
      const left = this.ok ? this.leftAtDone : 0;
      const stars = this.ok ? (left >= this.dur * 0.35 ? 3 : 2) : (this.inN >= this.total / 2 ? 1 : 0);
      return {
        team: true, ok: this.ok, stars,
        title: this.ok ? '羊羊全部回家了！' : '時間到！',
        sub: this.ok ? `${this.total} 隻都回家，還剩 ${left} 秒` : `還有羊羊在外面・回家 ${this.inN} / ${this.total} 隻`,
        rows: this.es.slice().sort((a, b) => b.herd - a.herd).map(e => ({ p: e.p, key: e.herd, line: `趕回 ${e.herd} 隻` }))
      };
    }
  }
  GAMES.push({
    id: 'sheep', name: '趕羊羊', icon: '🐑', col: '#2fae5f', bg: '#74c35a', kind: 'team', players: '1–6 人',
    blurb: '大家合作，把羊羊趕回家！',
    btn: (p) => ({ label: '叫一聲', icon: PARTY_ANIMALS[p.animal].say }),
    rules: kid => kid
      ? ['大家一起把羊羊趕回右邊的「羊羊的家」', '羊羊會躲開你腳下的圓圈，從羊羊後面慢慢推', '按按鈕叫一聲，附近的羊羊會嚇一跳跑開', '2 分半內全部趕回家就成功']
      : ['合作把所有羊趕進羊圈，門比較窄、羊比較快', '大野狼會來搗蛋：靠近牠，或對牠叫一聲，牠就會逃走', '叫一聲會讓附近的羊嚇一跳（1.5 秒叫一次）', '2 分鐘內全部趕回家'],
    thumb(g) {
      g.fillStyle = '#a6e389'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#ecd59b'; g.fillRect(230, 40, 80, 110); g.strokeStyle = '#a8703c'; g.lineWidth = 6; g.beginPath(); g.moveTo(230, 70); g.lineTo(230, 40); g.lineTo(310, 40); g.lineTo(310, 150); g.lineTo(230, 150); g.lineTo(230, 120); g.stroke();
      const sh = (x, y) => { g.fillStyle = '#fff'; for (const [dx, dy, r] of [[0, 0, 13], [-9, -3, 9], [9, -3, 9], [0, -9, 9]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); } g.fillStyle = '#3a3346'; g.beginPath(); g.ellipse(x + 12, y - 2, 7, 8, 0, 0, TAU); g.fill(); };
      sh(150, 80); sh(180, 110); sh(160, 135); sh(270, 95);
      drawCritter(g, 70, 100, 24, 1, 1, { face: 0, happy: true }); drawCritter(g, 100, 150, 18, 0, 0, { face: -0.3 });
    },
    create: ctx => new Sheep(ctx)
  });
})();
