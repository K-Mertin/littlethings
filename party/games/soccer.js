'use strict';
/* 動物足球 — top-down football, ☀️ 太陽隊 (defends the LEFT goal, attacks right) against
   🌙 月亮隊 (defends the RIGHT goal, attacks left). Each goal's net is tinted with the
   colour of the team that defends it.
   Walking into the ball dribbles it; the one button kicks it the way you face when it's
   at your feet, otherwise it's a short dash.
   小朋友: 90 s, big goals, big reach, slower ball that sticks a little to your feet.
   大人:   120 s, smaller goals, faster ball and harder kicks, the dash is a shoulder charge.
   1 player (no teams): shooting practice against a computer goalkeeper on the right goal.
   The pitch has rounded corners that gently roll the ball back out, so it can't get stuck. */
(() => {
  const X0 = 110, X1 = 1490, Y0 = 178, Y1 = 858, CX = 800, CY = 518;
  const GD = 58, RC = 90, PR = 9;          // goal depth, corner radius, post radius
  const FONT = '"Noto Sans TC",system-ui,sans-serif', FRED = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const ACC = '#14b8a6';
  const CONF = ['#ff4f58', '#2f8cff', '#ffbf1f', '#22c26a', '#9b5cff', '#ff6fb7', '#ffffff'];
  const ADS = [['動物足球', '#14b8a6'], ['⚽ 加油加油！', '#ff7a45'], ['噗噗牛奶', '#2f8cff'], ['小熊蜂蜜', '#ffb21f'], ['兔兔紅蘿蔔汁', '#ff5a7a'],
    ['青蛙跳跳鞋', '#22a35a'], ['小豬布丁', '#ff8fc0'], ['MW 大街', '#7a5cff']];
  /* corner circles: centre + which way is "out" */
  const CORN = [[X0 + RC, Y0 + RC, -1, -1], [X1 - RC, Y0 + RC, 1, -1], [X0 + RC, Y1 - RC, -1, 1], [X1 - RC, Y1 - RC, 1, 1]];
  const ease = k => k * k * (3 - 2 * k);

  function steer(e, ix, iy, sp, dt) {
    const tx = ix * sp, ty = iy * sp, moving = ix || iy;
    const rate = !moving ? 18 : (e.vx * tx + e.vy * ty < 0 ? 20 : 11);
    const k = 1 - Math.exp(-rate * dt);
    e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
    if (!moving && e.vx * e.vx + e.vy * e.vy < 300) { e.vx = 0; e.vy = 0; }
  }
  function spring(e, dt) { e.sqv += (-e.sq * 320 - e.sqv * 15) * dt; e.sq += e.sqv * dt; }
  /* a cached full-width (-400 … W+400) layer, re-rendered only when the screen scale changes */
  function layer(self, key, g, paint) {
    const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
    let L = self[key];
    if (!L || L.s !== s) {
      const c = (L && L.c) || document.createElement('canvas'); c.width = Math.ceil((W + 800) * s); c.height = Math.ceil(H * s);
      const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 400 * s, 0); paint(cg); L = self[key] = { c, s };
    }
    return L;
  }
  function pent(g, x, y, r, a) {
    g.beginPath();
    for (let k = 0; k < 5; k++) { const b = a + k * TAU / 5; g.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r); }
    g.closePath(); g.fill();
  }
  /* the ball itself, drawn at (x, y) — also used for the lobby card */
  function ballArt(g, x, y, r, spin) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.save(); g.clip(); g.rotate(spin || 0);
    g.fillStyle = '#2b2340'; pent(g, 0, 0, r * 0.36, -Math.PI / 2);
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5 + TAU / 10; pent(g, Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98, r * 0.3, a); }
    g.strokeStyle = 'rgba(43,35,64,.55)'; g.lineWidth = Math.max(1, r * 0.07); g.beginPath();
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5; g.moveTo(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36); g.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); }
    g.stroke(); g.restore();
    g.fillStyle = 'rgba(43,35,64,.14)'; g.beginPath(); g.arc(r * 0.18, r * 0.2, r * 0.9, 0.1, Math.PI * 0.95); g.arc(0, 0, r, Math.PI * 0.95, 0.1, true); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.28, r * 0.15, -0.7, 0, TAU); g.fill();
    g.strokeStyle = '#2b2340'; g.lineWidth = Math.max(1.5, r * 0.1); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    g.restore();
  }

  class Soccer {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.teams = !!ctx.teams; this.edge = '#1d3346';
      this.dur = this.kid ? 90 : 120;
      this.GH = this.kid ? 150 : 104;            // half the goal mouth
      this.mouthL = this.teams;                  // practice: only the right goal is open
      this.score = [0, 0]; this.shots = 0;
      const br = this.kid ? 21 : 16;
      this.ball = { x: CX, y: CY, vx: 0, vy: 0, z: 0, vz: 0, r: br, spin: 0, last: null, trail: [] };
      this.es = ctx.players.map(p => ({ p, team: this.teams ? p.team : 0, x: CX, y: CY, vx: 0, vy: 0, kx: 0, ky: 0, face: 0, r: 34, cd: 0, dashT: 0, dx: 0, dy: 0,
        wind: 0, kickT: 0, kickA: 0, noTouch: 0, sq: 0, sqv: 0, walk: 0, stun: 0, happy: 0, goals: 0, own: 0, touches: 0, hitT: 0 }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.place();
      this.ph = 'play'; this.phT = 0; this.goalSide = 0;
      this.net = [{ b: 0, v: 0, hy: CY }, { b: 0, v: 0, hy: CY }];
      this.conf = []; this.cheer = [0, 0];
      this.flags = []; for (let i = 0; i < 10; i++) this.flags.push({ x: 60 + i * 164 + rnd(-30, 30), y: rnd(70, 128), c: this.teams ? TEAMS[i < 5 ? 0 : 1].c : CONF[i % 6], ph: rnd(0, TAU) });
      this.tufts = []; for (let i = 0; i < 260; i++) this.tufts.push([rnd(X0 + 10, X1 - 10), rnd(Y0 + 10, Y1 - 10), rnd(0.7, 1.3)]);
      this.gk = this.teams ? null : { x: X1 - 46, y: CY, vy: 0, r: 34, dive: 0, dvy: 0, sq: 0, sqv: 0, saves: 0, happy: 0, wob: rnd(0, TAU),
        col: ((ctx.players[0] ? ctx.players[0].col : 0) + 3) % 6, animal: ((ctx.players[0] ? ctx.players[0].animal : 0) + 3) % 6 };
      this.dl = [];
    }
    /* everyone back to their own half (kick-off) */
    place() {
      const b = this.ball; b.x = CX; b.y = CY; b.vx = b.vy = b.z = b.vz = 0; b.last = null; b.trail.length = 0;
      for (const t of [0, 1]) {
        const mates = this.es.filter(e => e.team === t), m = mates.length, side = t === 0 ? -1 : 1;
        mates.forEach((e, i) => {
          const sp = Math.min(150, 560 / Math.max(1, m));
          e.x = this.teams ? CX + side * (190 + (i % 2) * 150 + (m === 1 ? 40 : 0)) : 520 - (i % 2) * 120;
          e.y = CY + (i - (m - 1) / 2) * (this.teams ? sp : 110);
          e.vx = e.vy = e.kx = e.ky = 0; e.dashT = 0; e.wind = 0; e.stun = 0; e.face = this.teams ? (t === 0 ? 0 : Math.PI) : 0; e.cd = 0.2;
        });
      }
    }
    dirOf(e) { return this.teams && e.team === 1 ? -1 : 1; }   // which way this player attacks
    reachOf() { return this.kid ? 58 : 38; }
    inReach(e, slack) {
      const b = this.ball, dx = b.x - e.x, dy = b.y - e.y, d = hyp(dx, dy);
      if (d - e.r - b.r > this.reachOf() + (slack || 0)) return false;
      if (this.kid || d < 1) return true;
      const diff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - e.face), Math.cos(Math.atan2(dy, dx) - e.face)));
      return diff < 1.75;
    }

    /* ---------------- update ---------------- */
    update(dt) {
      const ctx = this.ctx, kid = this.kid, b = this.ball; this.t += dt;
      // phases: play → goal (celebrate) → kick (everyone lined up, a breath) → play
      if (this.ph !== 'play') {
        this.phT -= dt;
        if (this.phT <= 0) {
          if (this.ph === 'goal') {
            if (this.teams) { this.place(); this.ph = 'kick'; this.phT = 1.0; for (const e of this.es) for (let k = 0; k < 3; k++) Fx.dust(e.x, e.y + e.r * 0.75, 'rgba(255,255,255,.8)', 12); Fx.pop(CX, CY - 150, '預備…', '#2b2340', 54); ctx.sfx('pop'); }
            else this.respawn();
          } else if (this.ph === 'kick') { this.ph = 'play'; ctx.sfx('go'); Fx.ring(CX, CY, '#ffffff', 160, 0.5); Fx.pop(CX, CY - 150, '開球！', ACC, 60); }
        }
      }
      for (const n of this.net) { n.v += (-n.b * 220 - n.v * 5) * dt; n.b += n.v * dt; }
      for (const c of this.conf) { c.t += dt; c.vy += 520 * dt; c.vx *= 0.985; c.vy *= 0.985; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; }
      this.conf = this.conf.filter(c => c.t < c.life);
      this.cheer[0] = Math.max(0, this.cheer[0] - dt); this.cheer[1] = Math.max(0, this.cheer[1] - dt);

      const speed = kid ? 300 : 335, lock = this.ph === 'kick';
      for (const e of this.es) {
        e.cd -= dt; e.noTouch -= dt; e.kickT = Math.max(0, e.kickT - dt); e.happy = Math.max(0, e.happy - dt); e.hitT -= dt; spring(e, dt);
        if (lock) { e.vx = e.vy = 0; e.walk = 0; continue; }
        if (e.stun > 0) {
          e.stun -= dt; const f = Math.exp(-4 * dt); e.kx *= f; e.ky *= f; e.vx = e.kx; e.vy = e.ky;
          e.x += e.vx * dt; e.y += e.vy * dt; this.keepIn(e); continue;
        }
        const i = ctx.input(e.p);
        steer(e, i.x, i.y, speed * (e.wind > 0 ? 0.45 : 1), dt);
        if (i.x || i.y) e.face = Math.atan2(i.y, i.x);
        if (ctx.pressed(e.p, 0) && e.cd <= 0 && e.wind <= 0 && this.ph !== 'kick') {
          if (this.ph === 'play' && this.inReach(e, 6)) { e.wind = 0.085; e.sq = 0.17; e.sqv = 0; e.cd = 0.5; }
          else {   // nothing to kick: a short dash (a shoulder charge for grown-ups)
            let dx = i.x, dy = i.y; if (!dx && !dy) { dx = Math.cos(e.face); dy = Math.sin(e.face); }
            const m = hyp(dx, dy) || 1; e.dx = dx / m; e.dy = dy / m; e.dashT = 0.2; e.cd = kid ? 0.7 : 0.95; e.sq = -0.16; e.sqv = 0;
            ctx.sfx('whoosh'); for (let k = 0; k < 4; k++) Fx.dust(e.x - e.dx * 20, e.y + e.r * 0.7, 'rgba(235,255,225,.9)', 12);
          }
        }
        if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) this.kick(e); }
        if (e.dashT > 0) { e.dashT -= dt; const s = speed * 2.5 * (0.5 + 0.5 * ease(Math.max(0, e.dashT) / 0.2)); e.vx = e.dx * s; e.vy = e.dy * s; }
        const f = Math.exp(-5 * dt); e.kx *= f; e.ky *= f;
        e.x += (e.vx + e.kx) * dt; e.y += (e.vy + e.ky) * dt; this.keepIn(e);
        const s = hyp(e.vx, e.vy); if (s > 30) e.walk += dt * (6 + s / 40); else e.walk = 0;
        Fx.walk(e, dt, 'rgba(235,255,225,.8)');
      }
      this.bumps();
      this.ballStep(dt);
      if (this.gk) this.keeper(dt);
      if (this.t >= this.dur) this.over = true;
    }
    keepIn(e) {
      const r = e.r * 0.7;
      e.x = clamp(e.x, X0 + r, X1 - r); e.y = clamp(e.y, Y0 + r * 0.6, Y1 - r * 0.6);
      for (const [cx, cy, sx, sy] of CORN) {
        if ((e.x - cx) * sx <= 0 || (e.y - cy) * sy <= 0) continue;
        const dx = e.x - cx, dy = e.y - cy, d = hyp(dx, dy), lim = RC - r * 0.6;
        if (d > lim) { e.x = cx + dx / d * lim; e.y = cy + dy / d * lim; }
      }
      if (this.gk) { const k = this.gk, dx = e.x - k.x, dy = e.y - k.y, d = hyp(dx, dy), m = e.r + k.r - 6; if (d < m && d > 0) { e.x = k.x + dx / d * m; e.y = k.y + dy / d * m; } }
    }
    bumps() {
      const ctx = this.ctx, es = this.es;
      for (let a = 0; a < es.length; a++) for (let c = a + 1; c < es.length; c++) {
        const A = es[a], B = es[c], dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), m = A.r + B.r - 4;
        if (d >= m || d === 0) continue;
        const nx = dx / d, ny = dy / d, o = (m - d) / 2;
        A.x -= nx * o; A.y -= ny * o; B.x += nx * o; B.y += ny * o;
        if (this.kid || A.team === B.team && this.teams) continue;
        // grown-ups: a dash into an opponent is a shoulder charge
        for (const [P, Q, s] of [[A, B, 1], [B, A, -1]]) {
          if (P.dashT <= 0 || Q.stun > 0 || Q.hitT > 0) continue;
          Q.kx += nx * s * 620; Q.ky += ny * s * 620; Q.stun = 0.45; Q.wind = 0; Q.hitT = 0.6; Q.sq = 0.25; Q.sqv = 0;
          P.dashT = 0; P.vx *= 0.3; P.vy *= 0.3; P.sq = 0.2; P.sqv = 0;
          const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2;
          ctx.sfx('bonk', 0.8); ctx.sfx('stun'); Fx.shake(7); Fx.burst(cx, cy, '#ffe066', 10, 300); Fx.ring(cx, cy, '#ffffff', 80, 0.3);
          Fx.pop(cx, cy - 50, '碰！', '#ff5a3d', 42); ctx.buzz(Q.p, 150); ctx.hitstop(0.04);
        }
      }
    }
    kick(e) {
      const ctx = this.ctx, b = this.ball, kid = this.kid;
      e.kickT = 0.22; e.sq = -0.18; e.sqv = 0;
      if (!this.inReach(e, 24) || this.ph !== 'play') {   // whiffed
        ctx.sfx('whoosh'); Fx.dust(e.x + Math.cos(e.face) * 30, e.y + e.r * 0.7, 'rgba(235,255,225,.9)', 10); e.cd = 0.3; e.kickA = e.face; return;
      }
      let a = e.face;
      if (kid) {   // a gentle nudge toward the goal you attack when you're roughly facing it
        const gx = this.dirOf(e) > 0 ? X1 + 20 : X0 - 20, ga = Math.atan2(CY - b.y, gx - b.x), diff = Math.atan2(Math.sin(ga - a), Math.cos(ga - a));
        if (Math.abs(diff) < 0.75) a += diff * 0.6;
      }
      const P = kid ? 760 : 1080, cx = Math.cos(a), cy = Math.sin(a);
      // ball behind the foot? bring it round to the front first
      if ((b.x - e.x) * cx + (b.y - e.y) * cy < e.r * 0.4) { b.x = e.x + cx * (e.r + b.r + 2); b.y = e.y + cy * (e.r + b.r + 2); this.walls(0); }
      b.vx = cx * P + e.vx * 0.25; b.vy = cy * P + e.vy * 0.25; b.vz = kid ? 180 : 260; b.last = e;
      e.kickA = a; e.noTouch = 0.18; e.cd = kid ? 0.35 : 0.45; e.touches++; this.shots++;
      ctx.sfx('whoosh'); ctx.sfx('bonk', 0.15); ctx.buzz(e.p, 40);
      Fx.shake(kid ? 5 : 8); Fx.ring(b.x, b.y, '#ffffff', 70, 0.3);
      Fx.burst(b.x, b.y + b.r * 0.6, '#9be37a', 7, 220); Fx.burst(b.x, b.y, '#ffffff', 5, 260);
      for (let k = 0; k < 3; k++) Fx.dust(b.x, b.y + b.r * 0.6, 'rgba(235,255,225,.9)', 11);
      if (!kid) ctx.hitstop(0.03);
    }
    /* keep the ball on the pitch / inside the nets; returns the hardest hit (for sounds) */
    walls(dt) {
      const b = this.ball, r = b.r, E = 0.72, GH = this.GH;
      let hit = 0;
      const bounce = (nx, ny, e) => { const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; hit = Math.max(hit, -vn); } };
      // posts
      for (const [px, open] of [[X0, this.mouthL], [X1, true]]) {
        if (!open) continue;
        for (const py of [CY - GH, CY + GH]) {
          const dx = b.x - px, dy = b.y - py, d = hyp(dx, dy);
          if (d < r + PR && d > 0) { const nx = dx / d, ny = dy / d; b.x = px + nx * (r + PR); b.y = py + ny * (r + PR); const vn = -(b.vx * nx + b.vy * ny); bounce(nx, ny, 0.8); if (vn > 260) this.post(px, py, vn); }
        }
      }
      const inL = this.mouthL && b.x < X0, inR = b.x > X1;
      if (inL || inR) {   // inside a net: soft back and sides
        const back = inL ? X0 - GD : X1 + GD;
        if (b.y < CY - GH + r) { b.y = CY - GH + r; bounce(0, 1, 0.3); }
        if (b.y > CY + GH - r) { b.y = CY + GH - r; bounce(0, -1, 0.3); }
        if (inL && b.x < back + r) { b.x = back + r; bounce(1, 0, 0.15); }
        if (inR && b.x > back - r) { b.x = back - r; bounce(-1, 0, 0.15); }
        return hit;
      }
      // rounded corners (and a gentle slope there that rolls the ball back out)
      for (const [cx, cy, sx, sy] of CORN) {
        if ((b.x - cx) * sx <= 0 || (b.y - cy) * sy <= 0) continue;
        const dx = b.x - cx, dy = b.y - cy, d = hyp(dx, dy) || 1, nx = dx / d, ny = dy / d;
        if (d > RC - r) { b.x = cx + nx * (RC - r); b.y = cy + ny * (RC - r); bounce(-nx, -ny, E); }
        b.vx -= nx * 140 * dt * Math.min(1, d / RC); b.vy -= ny * 140 * dt * Math.min(1, d / RC);
      }
      if (b.y < Y0 + r) { b.y = Y0 + r; bounce(0, 1, E); }
      if (b.y > Y1 - r) { b.y = Y1 - r; bounce(0, -1, E); }
      const mouth = Math.abs(b.y - CY) < GH;
      if (b.x < X0 + r && !(this.mouthL && mouth)) { b.x = X0 + r; bounce(1, 0, E); }
      if (b.x > X1 - r && !mouth) { b.x = X1 - r; bounce(-1, 0, E); }
      // a ball resting right against a side line drifts off it a touch
      const slow = b.vx * b.vx + b.vy * b.vy < 900;
      if (slow) {
        if (b.y < Y0 + r + 6) b.vy += 40 * dt;
        if (b.y > Y1 - r - 6) b.vy -= 40 * dt;
        if (b.x < X0 + r + 6 && !(this.mouthL && mouth)) b.vx += 40 * dt;
        if (b.x > X1 - r - 6 && !mouth) b.vx -= 40 * dt;
      }
      return hit;
    }
    post(px, py, v) {
      this.ctx.sfx('bonk', 1); this.ctx.sfx('tick'); Fx.shake(Math.min(9, v / 120)); Fx.burst(px, py, '#ffffff', 8, 260);
      Fx.pop(px + (px < CX ? 70 : -70), py - 30, '噹！', '#2b2340', 40);
    }
    ballStep(dt) {
      const b = this.ball, kid = this.kid, ctx = this.ctx;
      const inNet = (this.mouthL && b.x < X0) || b.x > X1;
      const fr = inNet ? 4.5 : (kid ? 1.05 : 0.78), max = kid ? 860 : 1220;
      const f = Math.exp(-fr * dt); b.vx *= f; b.vy *= f;
      let sp = hyp(b.vx, b.vy);
      if (sp < 14) { b.vx *= 0.8; b.vy *= 0.8; }
      if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; sp = max; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.z > 0 || b.vz > 0) { b.vz -= 1600 * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; if (b.vz < -90) { b.vz = -b.vz * 0.42; Fx.dust(b.x, b.y + b.r * 0.6, 'rgba(235,255,225,.8)', 8); } else b.vz = 0; } }
      b.spin += sp / b.r * dt * (b.vx >= 0 ? 1 : -1);
      if (sp > 480) { b.trail.unshift(b.x, b.y - b.z); if (b.trail.length > 8) b.trail.length = 8; } else if (b.trail.length) b.trail.length = Math.max(0, b.trail.length - 2);
      // players: walking into the ball pushes it (dribbling)
      if (this.ph !== 'kick') for (const e of this.es) {
        if (e.noTouch > 0) continue;
        const dx = b.x - e.x, dy = b.y - e.y, d = hyp(dx, dy), m = e.r + b.r - 2;
        if (d >= m || d === 0) continue;
        const nx = dx / d, ny = dy / d; b.x = e.x + nx * m; b.y = e.y + ny * m;
        const rel = (b.vx - e.vx) * nx + (b.vy - e.vy) * ny;
        if (rel < 0) {
          const er = kid ? 0.12 : 0.3; b.vx -= nx * rel * (1 + er); b.vy -= ny * rel * (1 + er);
          if (rel < -60) { e.touches++; if (rel < -280) ctx.sfx('bonk', 0.05); }
        }
        if (this.ph === 'play') b.last = e;
      }
      // little ones: the ball likes the nearest pair of feet
      if (kid && this.ph === 'play') {
        let best = null, bd = 1e9;
        for (const e of this.es) { if (e.noTouch > 0 || e.stun > 0) continue; const d = hyp(b.x - e.x, b.y - e.y) - e.r - b.r; if (d < bd) { bd = d; best = e; } }
        if (best && bd < 30 && hyp(b.vx - best.vx, b.vy - best.vy) < 320) {
          const tx = best.x + Math.cos(best.face) * (best.r + b.r + 2), ty = best.y + Math.sin(best.face) * (best.r + b.r + 2);
          b.vx += ((tx - b.x) * 7 + (best.vx - b.vx) * 2.4) * dt; b.vy += ((ty - b.y) * 7 + (best.vy - b.vy) * 2.4) * dt;
        }
      }
      const hit = this.walls(dt);
      if (hit > 380) { ctx.sfx('bonk', 0.3); Fx.burst(b.x, b.y, '#ffffff', 4, 160); Fx.shake(Math.min(5, hit / 200)); }
      // anyone still overlapping (ball pinned to a wall) is the one who steps back
      for (const e of this.es) {
        const dx = e.x - b.x, dy = e.y - b.y, d = hyp(dx, dy), m = e.r + b.r - 2;
        if (d < m && d > 0) { e.x = b.x + dx / d * m; e.y = b.y + dy / d * m; this.keepIn(e); }
      }
      // goal?
      if (this.ph === 'play') {
        if (this.mouthL && b.x < X0 - b.r) this.goal(1, 0);
        else if (b.x > X1 + b.r) this.goal(0, 1);
      }
    }
    /* team `t` scored into net `n` (0 left, 1 right) */
    goal(t, n) {
      const ctx = this.ctx, b = this.ball, s = b.last, own = !!(s && this.teams && s.team !== t);
      this.score[t]++;
      if (s) { if (own) s.own++; else { s.goals++; s.happy = 2.2; } }
      this.net[n].v = 9 + Math.min(10, hyp(b.vx, b.vy) / 80); this.net[n].hy = b.y;
      this.ph = 'goal'; this.phT = this.teams ? 2.5 : 1.5; this.goalSide = n; this.lastTeam = t;
      const T = TEAMS[t], col = this.teams ? T.c : s ? PARTY_COLORS[s.p.col].c : ACC;
      if (this.teams) {
        Fx.announce(own ? '烏龍球！' + T.icon + ' ' + T.n + '得分' : T.icon + ' ' + T.n + ' 進球！', T.c);
        for (const e of this.es) if (e.team === t) { e.happy = 2.2; ctx.buzz(e.p, 200); }
        this.cheer[t] = 2.6;
      } else { Fx.announce(s ? s.p.name + ' 進球！' : '進球！', col); this.cheer[0] = this.cheer[1] = 2; if (s) ctx.buzz(s.p, 200); }
      if (s && !own) Fx.pop(s.x, s.y - 80, '+1', this.teams ? T.d : PARTY_COLORS[s.p.col].d, 54);
      ctx.sfx('win'); ctx.sfx('splash'); ctx.sfx('star'); ctx.hitstop(0.12);
      Fx.shake(16); Fx.flash(this.teams ? T.soft : '#ffffff', 0.45);
      const gx = n === 0 ? X0 : X1, dir = n === 0 ? 1 : -1, pal = this.teams ? [T.c, T.d, '#ffffff', T.soft, '#ffe066'] : CONF;
      for (let i = 0; i < 110; i++) {
        const a = (dir > 0 ? 0 : Math.PI) + rnd(-1.1, 1.1) - 0.35, sp = rnd(250, 900);
        this.conf.push({ x: gx + rnd(-10, 10), y: b.y + rnd(-40, 40), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(100, 300), rot: rnd(0, TAU), vr: rnd(-14, 14), w: rnd(8, 15), h: rnd(5, 9), c: pal[rint(pal.length)], t: 0, life: rnd(1.4, 2.4) });
      }
      Fx.burst(gx, b.y, col, 20, 420); Fx.ring(gx, b.y, col, 220, 0.6); Fx.ring(gx, b.y, '#ffffff', 140, 0.4);
    }
    /* practice: a fresh ball somewhere in the middle */
    respawn() {
      const b = this.ball; b.x = rnd(560, 980); b.y = CY + rnd(-200, 200); b.vx = b.vy = 0; b.z = 60; b.vz = 0; b.trail.length = 0;
      this.ph = 'play'; Fx.ring(b.x, b.y, ACC, 90, 0.45); Fx.burst(b.x, b.y, '#ffffff', 8, 200); this.ctx.sfx('pop');
      if (this.gk) { this.gk.y = CY; this.gk.dive = 0; }
    }
    keeper(dt) {
      const k = this.gk, b = this.ball, kid = this.kid, GH = this.GH;
      spring(k, dt); k.happy = Math.max(0, k.happy - dt); k.wob += dt; k.saveT = (k.saveT || 0) - dt;
      let ty = CY;
      if (this.ph === 'play') {
        if (b.vx > 60 && b.x < k.x) ty = b.y + b.vy * (k.x - b.x) / b.vx;
        else ty = CY + (b.y - CY) * (b.x > 900 ? 0.75 : 0.35);
        if (kid) ty += Math.sin(k.wob * 1.7) * 60;       // a dozy keeper for little ones
      }
      ty = clamp(ty, CY - GH + 14, CY + GH - 14);
      const sp = kid ? 130 : 235;
      if (k.dive > 0) { k.dive -= dt; k.y += k.dvy * dt; k.dvy *= Math.exp(-3 * dt); }
      else {
        const want = clamp((ty - k.y) * 6, -sp, sp); k.vy += (want - k.vy) * (1 - Math.exp(-10 * dt)); k.y += k.vy * dt;
        if (!kid && this.ph === 'play' && b.vx > 420 && k.x - b.x < 280 && k.x - b.x > 0 && Math.abs(ty - k.y) > 30) { k.dive = 0.45; k.dvy = Math.sign(ty - k.y) * 430; k.sq = -0.2; k.sqv = 0; }
      }
      k.y = clamp(k.y, CY - GH + 10, CY + GH - 10);
      const dx = b.x - k.x, dy = b.y - k.y, d = hyp(dx, dy), m = k.r + b.r;
      if (d < m && d > 0 && this.ph === 'play') {
        const nx = dx / d, ny = dy / d; b.x = k.x + nx * m; b.y = k.y + ny * m;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; b.vx -= 140; b.vy += rnd(-120, 120);
          if (vn < -300 && hyp(b.vx, b.vy) > 420 && k.saveT <= 0) {
            k.saves++; k.saveT = 0.8; k.happy = 1.2; k.sq = 0.25; k.sqv = 0;
            this.ctx.sfx('bonk', 0.5); Fx.shake(5); Fx.burst(b.x, b.y, '#ffffff', 10, 260);
            Fx.pop(k.x - 40, k.y - 80, '擋下！', '#2b2340', 40);
          }
        }
      }
    }

    /* ---------------- drawing ---------------- */
    paintBg(g) {
      const GH = this.GH;
      // stands
      g.fillStyle = '#24425a'; g.fillRect(-400, 0, W + 800, H);
      for (let y = 0, i = 0; y < 146; y += 29, i++) { g.fillStyle = i % 2 ? '#2e5573' : '#2a4d69'; g.fillRect(-400, y, W + 800, 29); g.fillStyle = '#3a6787'; g.fillRect(-400, y + 25, W + 800, 4); }
      for (const side of [-1, 1]) for (let i = 0; i < 16; i++) {
        const x = side < 0 ? 34 - (i + 1) * 28 : W - 34 + i * 28;
        g.fillStyle = i % 2 ? '#2e5573' : '#2a4d69'; g.fillRect(x, 146, 28, H - 146); g.fillStyle = '#3a6787'; g.fillRect(side < 0 ? x : x + 24, 146, 4, H - 146);
      }
      // the grass apron and the pitch
      g.fillStyle = '#3e9a48'; g.beginPath(); g.roundRect(34, 144, W - 68, H - 136, 18); g.fill();
      g.save(); g.beginPath(); g.roundRect(40, 176, W - 80, 686, 8); g.clip();
      for (let i = 0, x = X0 - 115; x < X1 + 115; x += 115, i++) { g.fillStyle = i % 2 ? '#5cbf5a' : '#52b450'; g.fillRect(x, 170, 115, 700); }
      g.fillStyle = 'rgba(255,255,255,.035)'; for (let y = Y0; y < Y1; y += 136) g.fillRect(40, y, W - 80, 68);
      g.strokeStyle = 'rgba(40,120,40,.45)'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath();
      for (const [x, y, s] of this.tufts) { g.moveTo(x - 4 * s, y); g.lineTo(x - 2 * s, y - 7 * s); g.moveTo(x + 3 * s, y); g.lineTo(x + 4 * s, y - 8 * s); }
      g.stroke();
      if (this.teams) {   // each half wears its team's colour, very faintly
        g.globalAlpha = 0.07; g.fillStyle = TEAMS[0].c; g.fillRect(40, 170, CX - 40, 700); g.fillStyle = TEAMS[1].c; g.fillRect(CX, 170, CX - 40, 700); g.globalAlpha = 1;
      }
      g.restore();
      // pitch lines
      g.strokeStyle = 'rgba(255,255,255,.88)'; g.lineWidth = 6; g.lineJoin = 'round';
      g.beginPath(); g.roundRect(X0, Y0, X1 - X0, Y1 - Y0, RC); g.stroke();
      g.beginPath(); g.moveTo(CX, Y0); g.lineTo(CX, Y1); g.stroke();
      g.beginPath(); g.arc(CX, CY, 104, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(CX, CY, 9, 0, TAU); g.fill();
      for (const s of [-1, 1]) {
        const gx = s < 0 ? X0 : X1, pa = 230, ga = GH + 44;
        if (s < 0 && !this.mouthL) continue;
        g.beginPath(); g.moveTo(gx, CY - 250); g.lineTo(gx - s * pa, CY - 250); g.lineTo(gx - s * pa, CY + 250); g.lineTo(gx, CY + 250); g.stroke();
        g.beginPath(); g.moveTo(gx, CY - ga); g.lineTo(gx - s * 86, CY - ga); g.lineTo(gx - s * 86, CY + ga); g.lineTo(gx, CY + ga); g.stroke();
        g.beginPath(); g.arc(gx - s * 160, CY, 7, 0, TAU); g.fill();
        g.beginPath(); g.arc(gx - s * 160, CY, 120, s < 0 ? -0.93 : Math.PI - 0.93, s < 0 ? 0.93 : Math.PI + 0.93); g.stroke();
      }
      // team marks in each half / the practice sign
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (this.teams) {
        g.globalAlpha = 0.22; g.font = '86px system-ui'; g.fillText(TEAMS[0].icon, 470, CY); g.fillText(TEAMS[1].icon, 1130, CY); g.globalAlpha = 1;
      } else {
        g.globalAlpha = 0.3; g.font = `900 52px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText('射門練習', 420, CY); g.globalAlpha = 1;
        // the closed left end: a little bench
        g.fillStyle = 'rgba(20,60,20,.25)'; g.beginPath(); g.roundRect(48, CY - 92, 56, 196, 12); g.fill();
        g.fillStyle = '#d98b3a'; g.beginPath(); g.roundRect(54, CY - 96, 44, 192, 10); g.fill();
        g.fillStyle = '#f0a85a'; for (let y = CY - 88; y < CY + 92; y += 30) { g.beginPath(); g.roundRect(58, y, 36, 22, 6); g.fill(); }
      }
      // advertising boards
      for (const [y, h] of [[148, 24], [866, 26]]) {
        let i = y > 500 ? 3 : 0;
        for (let x = 44; x < W - 44; x += 190, i++) {
          const w = Math.min(186, W - 44 - x), [txt, c] = ADS[i % ADS.length];
          g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 2, y + 3, w, h);
          g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, 5); g.fill();
          g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x + 3, y + 2, w - 6, h * 0.35);
          if (w > 100) { g.fillStyle = '#ffffff'; g.font = `900 ${h - 8}px ${FONT}`; g.fillText(txt, x + w / 2, y + h / 2 + 1); }
        }
      }
    }
    paintCrowd(g) {
      const fan = (x, y, s) => {
        const shirt = this.teams && Math.random() < 0.7 ? TEAMS[x < CX ? 0 : 1][Math.random() < 0.6 ? 'c' : 'd'] : PARTY_COLORS[rint(6)].c;
        const head = PARTY_COLORS[rint(6)];
        g.fillStyle = shirt; g.beginPath(); g.roundRect(x - 10 * s, y + 2 * s, 20 * s, 14 * s, 6 * s); g.fill();
        g.fillStyle = head.c; const ear = rint(3);
        if (ear === 0) { g.beginPath(); g.moveTo(x - 8 * s, y - 4 * s); g.lineTo(x - 7 * s, y - 13 * s); g.lineTo(x - 2 * s, y - 8 * s); g.moveTo(x + 8 * s, y - 4 * s); g.lineTo(x + 7 * s, y - 13 * s); g.lineTo(x + 2 * s, y - 8 * s); g.fill(); }
        else if (ear === 1) { g.beginPath(); g.arc(x - 6 * s, y - 8 * s, 3.5 * s, 0, TAU); g.arc(x + 6 * s, y - 8 * s, 3.5 * s, 0, TAU); g.fill(); }
        g.beginPath(); g.arc(x, y - 2 * s, 8.5 * s, 0, TAU); g.fill();
        g.fillStyle = '#2b2340'; g.beginPath(); g.arc(x - 3 * s, y - 3 * s, 1.4 * s, 0, TAU); g.arc(x + 3 * s, y - 3 * s, 1.4 * s, 0, TAU); g.fill();
      };
      for (let row = 0; row < 5; row++) for (let x = -390 + (row % 2) * 13; x < W + 400; x += 26) if (Math.random() < 0.86) fan(x + rnd(-3, 3), 14 + row * 29, 1);
      for (const side of [-1, 1]) for (let col = 0; col < 15; col++) for (let y = 168 + (col % 2) * 14; y < H; y += 28) {
        if (Math.random() > 0.8) continue;
        fan(side < 0 ? 20 - col * 28 : W - 20 + col * 28, y, 0.95);
      }
    }
    drawGoal(g, n, t) {
      const s = n === 0 ? -1 : 1, gx = n === 0 ? X0 : X1, back = gx + s * GD, GH = this.GH, top = CY - GH, bot = CY + GH, N = this.net[n];
      const col = this.teams ? TEAMS[n].c : ACC, bx = y => back + s * N.b * 26 * Math.exp(-(((y - N.hy) / 75) ** 2));
      g.fillStyle = 'rgba(10,30,20,.3)'; g.fillRect(Math.min(gx, back) - (s < 0 ? 4 : -4), top + 8, GD, GH * 2);
      g.fillStyle = col; g.globalAlpha = 0.32; g.beginPath(); g.moveTo(gx, top);
      for (let y = top; y <= bot; y += 12) g.lineTo(bx(y), y);
      g.lineTo(bx(bot), bot); g.lineTo(gx, bot); g.closePath(); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath();
      for (let y = top + 13; y < bot; y += 13) { g.moveTo(gx, y); g.lineTo(bx(y), y); }
      for (const f of [0.33, 0.66, 1]) { g.moveTo(gx + (bx(top) - gx) * f, top); for (let y = top + 12; y <= bot; y += 12) g.lineTo(gx + (bx(y) - gx) * f, y); g.lineTo(gx + (bx(bot) - gx) * f, bot); }
      g.stroke();
      g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(gx, top); g.lineTo(bx(top), top); g.moveTo(gx, bot); g.lineTo(bx(bot), bot); g.stroke();
    }
    drawFrame(g, n) {
      const gx = n === 0 ? X0 : X1, GH = this.GH, top = CY - GH, bot = CY + GH, s = n === 0 ? -1 : 1, col = this.teams ? TEAMS[n].c : ACC;
      g.strokeStyle = 'rgba(10,30,20,.3)'; g.lineWidth = 9; g.beginPath(); g.moveTo(gx + 6, top + 8); g.lineTo(gx + 6, bot + 8); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(gx, top); g.lineTo(gx, bot); g.stroke();
      g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([14, 14]); g.beginPath(); g.moveTo(gx, top + 7); g.lineTo(gx, bot - 7); g.stroke(); g.setLineDash([]);
      for (const y of [top, bot]) {
        g.fillStyle = 'rgba(10,30,20,.3)'; g.beginPath(); g.ellipse(gx + 4, y + 9, PR + 2, PR * 0.6, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.strokeStyle = '#9aa7b5'; g.lineWidth = 2; g.beginPath(); g.arc(gx, y, PR, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#e5ecf2'; g.beginPath(); g.arc(gx + s * GD, y, 5, 0, TAU); g.fill();
      }
    }
    drawCrowd(g, t) {
      const L = layer(this, 'crowdL', g, cg => this.paintCrowd(cg)), s = L.s;
      g.globalAlpha = 0.8;
      for (const half of [0, 1]) {
        const c = this.cheer[half], dy = c > 0 ? -Math.abs(Math.sin(t * 13 + half)) * 7 * Math.min(1, c) : -Math.abs(Math.sin(t * 2.2 + half * 1.3)) * 1.2;
        g.drawImage(L.c, half * 1200 * s, 0, 1200 * s, H * s, -400 + half * 1200, dy, 1200, H);
      }
      g.globalAlpha = 1;
      for (const f of this.flags) {
        const c = this.cheer[f.x < CX ? 0 : 1], sp = c > 0 ? 14 : 4, w = Math.sin(t * sp + f.ph) * 6;
        g.strokeStyle = '#d8dee6'; g.lineWidth = 3; g.beginPath(); g.moveTo(f.x, f.y + 20); g.lineTo(f.x, f.y - 26 - (c > 0 ? 8 : 0)); g.stroke();
        const y = f.y - 26 - (c > 0 ? 8 : 0);
        g.fillStyle = f.c; g.beginPath(); g.moveTo(f.x, y); g.quadraticCurveTo(f.x + 18, y - 4 + w, f.x + 36, y + 2 + w * 0.6); g.lineTo(f.x + 36, y + 20 + w * 0.6); g.quadraticCurveTo(f.x + 18, y + 14 + w, f.x, y + 20); g.fill();
      }
    }
    cornerFlags(g, t) {
      for (const [cx, cy, sx, sy] of CORN) {
        const x = cx + sx * RC * 0.7071, y = cy + sy * RC * 0.7071, w = Math.sin(t * 5 + cx) * 4;
        g.fillStyle = 'rgba(10,30,20,.3)'; g.beginPath(); g.ellipse(x + 3, y + 3, 6, 3, 0, 0, TAU); g.fill();
        g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 34); g.stroke();
        g.fillStyle = '#ffd21f'; g.beginPath(); g.moveTo(x, y - 34); g.quadraticCurveTo(x + 10, y - 33 + w, x + 20, y - 28 + w); g.lineTo(x, y - 20); g.fill();
      }
    }
    arrows(g, t) {
      // which way to kick, shown on the grass at kick-off
      const a = this.ph === 'kick' ? 1 : clamp((4 - this.t) / 1.5, 0, 1); if (a <= 0) return;
      const sets = this.teams ? [[0, 1, 320], [1, -1, 1280]] : [[-1, 1, 1080]];
      for (const [tm, dir, x0] of sets) {
        const col = tm < 0 ? ACC : TEAMS[tm].c;
        for (let k = 0; k < 3; k++) {
          const ph = ((t * 1.6 + k / 3) % 1), x = x0 + dir * (k * 46 + ph * 20);
          g.globalAlpha = a * (0.25 + 0.55 * Math.sin(ph * Math.PI)); g.fillStyle = col;
          g.beginPath(); g.moveTo(x + dir * 22, Y0 + 44); g.lineTo(x - dir * 4, Y0 + 20); g.lineTo(x - dir * 4, Y0 + 32); g.lineTo(x + dir * 8, Y0 + 44); g.lineTo(x - dir * 4, Y0 + 56); g.lineTo(x - dir * 4, Y0 + 68); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(x + dir * 22, Y1 - 44); g.lineTo(x - dir * 4, Y1 - 68); g.lineTo(x - dir * 4, Y1 - 56); g.lineTo(x + dir * 8, Y1 - 44); g.lineTo(x - dir * 4, Y1 - 32); g.lineTo(x - dir * 4, Y1 - 20); g.closePath(); g.fill();
        }
      }
      g.globalAlpha = 1;
    }
    drawPlayer(g, e, t) {
      const C = this.teams ? TEAMS[e.team] : PARTY_COLORS[e.p.col], s = hyp(e.vx, e.vy), m = Math.min(1, s / 220), bob = Math.abs(Math.sin(e.walk));
      const celebrating = e.happy > 0 && this.ph !== 'play', hop = e.stun > 0 ? 0 : celebrating ? Math.abs(Math.sin(t * 9 + e.p.uid)) * 22 : bob * 7 * m;
      const sq = e.sq + (0.5 - bob) * 0.08 * m;
      // team ring under the feet; it lights up when the ball is close enough to kick
      const ready = this.ph === 'play' && e.cd <= 0 && e.stun <= 0 && this.inReach(e, 0);
      g.lineWidth = 4; g.strokeStyle = C.c;
      if (ready) { g.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.2 * Math.sin(t * 12)) + ')'; g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.8, e.r * 1.18, e.r * 0.42, 0, 0, TAU); g.fill(); g.lineWidth = 5; }
      g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.8, e.r * (ready ? 1.18 : 1.02), e.r * (ready ? 0.42 : 0.36), 0, 0, TAU); g.stroke();
      if (e.dashT > 0) { g.globalAlpha = 0.28; g.fillStyle = PARTY_COLORS[e.p.col].c; for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(e.x - e.dx * k * 16, e.y - e.dy * k * 16, e.r * (1 - k * 0.12), 0, TAU); g.fill(); } g.globalAlpha = 1; }
      // the kicking foot: pulled back on the wind-up, swung through on the kick
      let fa = null;
      if (e.wind > 0) fa = e.face + Math.PI * 0.75;
      else if (e.kickT > 0) fa = e.kickA + Math.PI * 0.75 * (1 - ease(1 - e.kickT / 0.22)) * (e.kickT > 0.12 ? 1 : (e.kickT / 0.12));
      const foot = () => {
        const fx = e.x + Math.cos(fa) * (e.r + 4), fy = e.y + Math.sin(fa) * (e.r + 4) * 0.8 + e.r * 0.45;
        g.fillStyle = PARTY_COLORS[e.p.col].c; g.strokeStyle = PARTY_COLORS[e.p.col].d; g.lineWidth = 3; g.beginPath(); g.ellipse(fx, fy, 12, 9, fa, 0, TAU); g.fill(); g.stroke();
      };
      if (e.kickT > 0.04 && e.kickT < 0.2) {
        g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(e.x, e.y + e.r * 0.3, e.r + 18, e.kickA - 0.9, e.kickA + 0.5); g.stroke();
      }
      if (fa !== null && Math.sin(fa) < 0) foot();
      drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, squash: sq, hop, rot: e.stun > 0 ? Math.sin(t * 20) * 0.15 : clamp(e.vx / 2600, -0.14, 0.14), stun: e.stun > 0, happy: e.happy > 0, blink: (t + e.p.uid * 1.3) % 3.6 < 0.12 });
      if (fa !== null && Math.sin(fa) >= 0) foot();
      if (e.stun > 0) { g.font = '20px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let k = 0; k < 3; k++) { const a = t * 6 + k * TAU / 3; g.fillText('⭐', e.x + Math.cos(a) * 30, e.y - e.r - 6 + Math.sin(a) * 9); } }
      else {
        g.fillStyle = C.c; g.save(); g.translate(e.x + Math.cos(e.face) * (e.r + 16), e.y + e.r * 0.25 + Math.sin(e.face) * (e.r + 10)); g.rotate(e.face);
        g.beginPath(); g.moveTo(11, 0); g.lineTo(-6, -8); g.lineTo(-6, 8); g.closePath(); g.fill(); g.restore();
      }
      drawTag(g, e.x, e.y - e.r - 30 - hop, e.p);
    }
    drawKeeper(g, k, t) {
      const ga = this.kid ? Math.sin(t * 3) * 0.2 : 0, sw = k.dive > 0 ? Math.sign(k.dvy) * 0.5 : 0;
      for (const s of [-1, 1]) {   // big gloves
        const a = -Math.PI / 2 + s * (1.15 + ga) + sw, x = k.x + Math.cos(a) * (k.r + 6) - 8, y = k.y + Math.sin(a) * (k.r + 2);
        g.fillStyle = '#ffd21f'; g.strokeStyle = '#a87700'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - 3, y - 3, 3.5, 0, TAU); g.fill();
      }
      drawCritter(g, k.x, k.y, k.r, k.col, k.animal, { face: Math.PI, squash: k.sq, rot: k.dive > 0 ? Math.sign(k.dvy) * 0.5 : Math.sin(t * 2) * 0.05, happy: k.happy > 0, blink: t % 3 < 0.12 });
      g.font = `700 18px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const w = 76; g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(k.x - w / 2, k.y - k.r - 44, w, 26, 13); g.fill(); g.strokeStyle = ACC; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#2b2340'; g.fillText('守門員', k.x, k.y - k.r - 30);
    }
    drawBall(g, b) {
      const y = b.y - b.z, k = 1 - Math.min(0.5, b.z / 120);
      g.fillStyle = 'rgba(10,40,10,.28)'; g.beginPath(); g.ellipse(b.x + 3 + b.z * 0.25, b.y + b.r * 0.62, b.r * 0.95 * k, b.r * 0.4 * k, 0, 0, TAU); g.fill();
      for (let i = b.trail.length - 2, j = 1; i >= 2; i -= 2, j++) { g.globalAlpha = 0.1 + j * 0.04; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(b.trail[i], b.trail[i + 1], b.r * (0.55 + j * 0.1), 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      ballArt(g, b.x, y, b.r, b.spin);
    }
    add(y, k, o) { let it = this.dl[this.dn]; if (!it) it = this.dl[this.dn] = { y: 0, k: 0, o: null }; it.y = y; it.k = k; it.o = o; this.dn++; }
    draw(g) {
      const t = this.t;
      const B = layer(this, 'bgL', g, cg => this.paintBg(cg));
      g.drawImage(B.c, -400, 0, W + 800, H);
      this.drawCrowd(g, t);
      this.arrows(g, t);
      Fx.ground(g);
      if (this.mouthL) this.drawGoal(g, 0, t);
      this.drawGoal(g, 1, t);
      this.cornerFlags(g, t);
      this.dn = 0;
      for (const e of this.es) this.add(e.y, 0, e);
      if (this.gk) this.add(this.gk.y, 1, this.gk);
      this.add(this.ball.y, 2, this.ball);
      const L = this.dl;
      for (let i = 1; i < this.dn; i++) { const it = L[i]; let j = i - 1; while (j >= 0 && L[j].y > it.y) { L[j + 1] = L[j]; j--; } L[j + 1] = it; }
      for (let i = 0; i < this.dn; i++) { const it = L[i]; if (it.k === 0) this.drawPlayer(g, it.o, t); else if (it.k === 1) this.drawKeeper(g, it.o, t); else this.drawBall(g, it.o); }
      if (this.mouthL) this.drawFrame(g, 0);
      this.drawFrame(g, 1);
      for (const c of this.conf) {
        const a = c.t > c.life - 0.4 ? (c.life - c.t) / 0.4 : 1, w = c.w * Math.abs(Math.cos(c.rot));
        g.globalAlpha = a; g.fillStyle = c.c; g.fillRect(c.x - w / 2, c.y - c.h / 2, Math.max(1.5, w), c.h);
      }
      g.globalAlpha = 1;
    }
    chip(p) { const e = this.by.get(p); return '⚽ ' + e.goals; }
    pad(p) {
      const e = this.by.get(p);
      if (this.ph === 'goal') return this.teams ? (e.team === this.lastTeam ? '進球了！🎉' : '被進球了，加油追回來！') : '進球了！🎉';
      if (this.ph === 'kick') return '預備…開球！';
      if (!this.teams) return '進球 ' + e.goals + ' 顆' + (this.gk ? '　守門員擋下 ' + this.gk.saves + ' 球' : '');
      return `${TEAMS[0].icon} ${this.score[0]} : ${this.score[1]} ${TEAMS[1].icon}　你進了 ${e.goals} 球` + (e.stun > 0 ? '　😵' : '');
    }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && e.stun <= 0 && this.ph === 'play'; }
    center() { return this.teams ? '' : '射門練習：進球 ' + this.score[0] + '　守門員擋下 ' + this.gk.saves; }
    teamScore(t) { return this.score[t]; }
    results() {
      const rows = this.es.slice().sort((a, b) => b.goals - a.goals || b.touches - a.touches).map(e => ({ p: e.p, key: e.goals, line: `進球 ${e.goals} 顆` + (e.own ? `・烏龍 ${e.own}` : '') }));
      if (this.teams) return { rows, teamScores: [this.score[0], this.score[1]] };
      const r = { rows };
      if (rows.length === 1) r.title = `練習完成：進了 ${this.score[0]} 球！`;
      return r;
    }
  }
  GAMES.push({
    id: 'soccer', name: '動物足球', icon: '🥅', col: ACC, bg: '#1d3346', kind: 'vs', teams: true, forceTeams: true, players: '1–6 人',
    blurb: '☀️ 太陽隊對 🌙 月亮隊，把球踢進對方的球門！',
    btn: { label: '踢球', icon: '🦶' },
    rules: kid => kid
      ? ['搖桿跑步，走過去碰到球就會帶著球跑', '球在腳邊時按「踢球」，球會往你面對的方向飛', '☀️ 太陽隊往右踢、🌙 月亮隊往左踢；一個人玩就是射門練習', '90 秒後，進球多的隊伍贏！']
      : ['搖桿跑步，碰到球就能帶球', '球在腳邊按「踢球」大力射門，離球太遠就是衝刺', '衝刺可以用肩膀撞開對手，把球搶過來！', '120 秒，進球多的隊伍贏；一個人玩就是對守門員練射門'],
    thumb(g) {
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#5cbf5a' : '#52b450'; g.fillRect(i * 54, 0, 54, 180); }
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(160, 0); g.lineTo(160, 180); g.stroke(); g.beginPath(); g.arc(160, 90, 34, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(320, 30); g.lineTo(250, 30); g.lineTo(250, 150); g.lineTo(320, 150); g.stroke();
      g.fillStyle = 'rgba(91,91,214,.35)'; g.fillRect(296, 58, 24, 64);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.beginPath(); for (let y = 64; y < 122; y += 8) { g.moveTo(296, y); g.lineTo(320, y); } g.moveTo(308, 58); g.lineTo(308, 122); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(296, 58); g.lineTo(296, 122); g.stroke();
      g.strokeStyle = TEAMS[0].c; g.lineWidth = 3; g.beginPath(); g.ellipse(200, 116, 26, 9, 0, 0, TAU); g.stroke();
      drawCritter(g, 200, 98, 24, 2, 1, { face: 0, squash: -0.08, happy: true });
      g.strokeStyle = TEAMS[1].c; g.beginPath(); g.ellipse(98, 76, 22, 8, 0, 0, TAU); g.stroke();
      drawCritter(g, 98, 60, 20, 4, 5, { face: 0 });
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; for (const [a, b] of [[236, 88], [230, 100]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(a + 18, b - 2); g.stroke(); }
      g.fillStyle = 'rgba(10,40,10,.28)'; g.beginPath(); g.ellipse(268, 104, 11, 5, 0, 0, TAU); g.fill();
      ballArt(g, 266, 88, 12, 0.6);
    },
    create: ctx => new Soccer(ctx)
  });
})();
