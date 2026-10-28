'use strict';
/* 滾滾球 — everyone rolls round inside a see-through hamster ball. TILT the phone to roll
   (phones without a tilt sensor, and keyboards, use the stick). Collect stars; the big 🌟 is worth 3.
   Three stages, one after another, each its own map:
     1 草地圓盤  a round island in the sea
     2 冰湖      slippery ice (大人: cracks open into holes; 小朋友: snowmen to bounce off)
     3 彈珠台    pinball bumpers that fling you about
   The 「衝」 button gives a quick boost.
   小朋友: fences all round, nobody can fall off, bumping costs nothing.
   大人:   no fences — fall in and you drop 3 stars; a hard bump knocks a star out of the other ball. */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', RFONT = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const COL = '#14b8a6', CX = 800, CY = 520, BR = 36;
  const MAPS = [
    { n: '草地圓盤', icon: '🌿', fric: 1.5, edge: '#3aa0d8' },
    { n: '冰湖', icon: '🧊', fric: 0.38, edge: '#24557e' },
    { n: '彈珠台', icon: '🎰', fric: 1.1, edge: '#2a1747' }
  ];
  const BUMPERS = [[560, 400], [1040, 400], [800, 520], [560, 650], [1040, 650]];
  const SNOWMEN = [[520, 440], [1080, 600], [800, 380]];

  class Roll {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.teams = !!ctx.teams;
      this.stageLen = this.kid ? 30 : 35; this.dur = this.stageLen * 3; this.stage = -1; this.edge = MAPS[0].edge;
      this.es = ctx.players.map((p, i) => ({ p, x: CX, y: CY, vx: 0, vy: 0, roll: 0, face: Math.PI / 2, stars: 0, total: 0, falls: 0, bumps: 0, golds: 0,
        fall: 0, shield: 0, dash: 0, cd: 0, spillCd: 0, hitT: 0, trail: [] }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.stars = []; this.loose = []; this.holes = []; this.bump = BUMPERS.map(([x, y]) => ({ x, y, r: 44, hit: 0 }));
      this.goldT = 6; this.holeT = 5; this.waves = []; for (let i = 0; i < 26; i++) this.waves.push({ x: rnd(-400, W + 400), y: rnd(0, H), ph: rnd(0, TAU), s: rnd(0.6, 1.2) });
      this.snow = []; for (let i = 0; i < 40; i++) this.snow.push({ x: rnd(-400, W + 400), y: rnd(0, H), v: rnd(20, 50) });
      this.nextStage();
    }
    get map() { return MAPS[this.stage]; }
    nextStage() {
      this.stage++; this.edge = this.map.edge; this.stars = []; this.loose = []; this.holes = []; this.goldT = 6; this.holeT = 5; this.bgCv = null;
      const n = this.es.length;
      this.es.forEach((e, i) => {
        const a = i * TAU / Math.max(1, n) - Math.PI / 2, rr = n > 1 ? 150 : 0;
        e.x = CX + Math.cos(a) * rr * 1.4; e.y = CY + Math.sin(a) * rr * 0.8; e.vx = e.vy = 0; e.fall = 0; e.shield = 1.5; e.trail.length = 0;
        e.stars += 0;   // stars carry over between stages
      });
      for (let k = 0; k < 4 + n; k++) this.addStar(false);
      Fx.announce('第 ' + (this.stage + 1) + ' 關：' + this.map.icon + ' ' + this.map.n, COL);
      this.ctx.sfx('star');
    }
    /* is (x, y) on solid ground? */
    onGround(x, y) {
      const s = this.stage;
      if (s === 0) { const d = hyp(x - CX, y - CY); return d < 400; }
      if (s === 1) { const dx = (x - CX) / 620, dy = (y - CY) / 330; if (dx * dx + dy * dy > 1) return false; return !this.holes.some(h => h.open && hyp(x - h.x, y - h.y) < h.r); }
      return x > 180 && x < 1420 && y > 210 && y < 830;
    }
    fenced() { return this.kid; }
    randSpot() {
      for (let k = 0; k < 60; k++) {
        const x = rnd(220, 1380), y = rnd(230, 810);
        if (!this.onGround(x, y) || !this.onGround(x + 50, y) || !this.onGround(x - 50, y) || !this.onGround(x, y + 50) || !this.onGround(x, y - 50)) continue;
        if (this.stage === 2 && this.bump.some(b => hyp(x - b.x, y - b.y) < b.r + 50)) continue;
        if (this.stage === 1 && this.kid && SNOWMEN.some(([sx, sy]) => hyp(x - sx, y - sy) < 90)) continue;
        if (this.holes.some(h => hyp(x - h.x, y - h.y) < h.r + 40)) continue;
        return { x, y };
      }
      return { x: CX, y: CY };
    }
    addStar(gold) { const s = this.randSpot(); this.stars.push({ x: s.x, y: s.y, gold, t: 0, life: gold ? 7 : 1e9, ph: rnd(0, TAU) }); }
    spill(e, n, from) {
      n = Math.min(n, e.stars); if (n <= 0) return;
      e.stars -= n;
      for (let k = 0; k < n; k++) { const a = from != null ? from + rnd(-0.8, 0.8) : rnd(0, TAU), sp = rnd(220, 380); this.loose.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, z: 0, vz: 420, t: 0 }); }
      Fx.pop(e.x, e.y - 70, '-' + n + ' ⭐', '#ff4f6d', 36);
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid, M = this.map; this.t += dt;
      if (this.t >= this.stageLen * (this.stage + 1) && this.stage < 2) this.nextStage();
      for (const w of this.waves) w.ph += dt * 1.5;
      for (const s of this.snow) { s.y += s.v * dt; s.x += Math.sin(this.t + s.y * 0.01) * 10 * dt; if (s.y > H) { s.y = -10; s.x = rnd(-400, W + 400); } }
      // stars
      this.goldT -= dt;
      if (this.goldT <= 0) { this.goldT = kid ? 7 : 8; this.addStar(true); ctx.sfx('coin'); }
      for (const s of this.stars) s.t += dt;
      this.stars = this.stars.filter(s => s.t < s.life);
      while (this.stars.filter(s => !s.gold).length < 3 + Math.ceil(this.es.length * 0.8)) this.addStar(false);
      for (const l of this.loose) {
        l.t += dt; l.x += l.vx * dt; l.y += l.vy * dt; l.vx *= Math.exp(-dt * 3); l.vy *= Math.exp(-dt * 3);
        if (l.z > 0 || l.vz > 0) { l.vz -= 1600 * dt; l.z = Math.max(0, l.z + l.vz * dt); if (l.z === 0) l.vz = 0; }
        if (l.t > 0.5 && l.z === 0 && !this.onGround(l.x, l.y)) l.gone = true;
        if (l.t > 9) l.gone = true;
      }
      this.loose = this.loose.filter(l => !l.gone);
      // ice cracks into holes (大人)
      if (this.stage === 1 && !kid) {
        this.holeT -= dt;
        if (this.holeT <= 0 && this.holes.length < 5) { this.holeT = 5.5; const s = this.randSpot(); this.holes.push({ x: s.x, y: s.y, r: rnd(54, 74), warn: 2.2, open: false, cr: [] }); ctx.sfx('stun'); }
        for (const h of this.holes) if (!h.open) { h.warn -= dt; if (h.warn <= 0) { h.open = true; ctx.sfx('splash'); Fx.burst(h.x, h.y, '#dff4ff', 16, 260); Fx.shake(4); } }
      }
      for (const b of this.bump) b.hit = Math.max(0, b.hit - dt * 4);
      // players
      const acc = (kid ? 820 : 960) * (this.stage === 1 ? 0.75 : 1), vmax = kid ? 470 : 560;
      for (const e of this.es) {
        e.shield = Math.max(0, e.shield - dt); e.cd -= dt; e.dash = Math.max(0, e.dash - dt); e.spillCd -= dt; e.hitT = Math.max(0, e.hitT - dt);
        if (e.fall > 0) {
          e.fall += dt;
          if (e.fall > 1.3) { const s = this.randSpot(); e.x = s.x; e.y = s.y; e.vx = e.vy = 0; e.fall = 0; e.shield = 2; ctx.sfx('pop'); Fx.ring(e.x, e.y, '#fff', 80); }
          continue;
        }
        const i = ctx.input(e.p);
        e.vx += i.x * acc * dt; e.vy += i.y * acc * dt;
        if (ctx.pressed(e.p, 0) && e.cd <= 0) {
          const m = hyp(i.x, i.y), a = m > 0.2 ? Math.atan2(i.y, i.x) : Math.atan2(e.vy, e.vx);
          if (m > 0.2 || hyp(e.vx, e.vy) > 30) { e.vx += Math.cos(a) * 520; e.vy += Math.sin(a) * 520; e.dash = 0.35; e.cd = kid ? 1.4 : 1.8; ctx.sfx('whoosh'); Fx.ring(e.x, e.y, '#ffffff', 70, 0.3); }
        }
        const fr = Math.exp(-dt * M.fric * (i.x || i.y ? 0.6 : 1));
        e.vx *= fr; e.vy *= fr;
        const sp = hyp(e.vx, e.vy), cap = e.dash > 0 ? vmax * 1.7 : vmax; if (sp > cap) { e.vx *= cap / sp; e.vy *= cap / sp; }
        const ox = e.x, oy = e.y;
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.roll += sp * dt / BR; if (sp > 20) e.face = Math.atan2(e.vy, e.vx);
        if ((e.trail.length === 0 || hyp(e.x - e.trail[e.trail.length - 1][0], e.y - e.trail[e.trail.length - 1][1]) > 18) && sp > 60) { e.trail.push([e.x, e.y]); if (e.trail.length > 10) e.trail.shift(); } else if (sp < 60 && e.trail.length) e.trail.shift();
        // fences (小朋友) or falling off (大人)
        if (this.fenced()) this.fence(e, ox, oy);
        else if (!this.onGround(e.x, e.y) && e.shield <= 0) {
          e.fall = 0.001; e.falls++; ctx.sfx('splash'); ctx.buzz(e.p, 300); Fx.burst(e.x, e.y, this.stage === 2 ? '#b18cff' : '#bfe8ff', 14, 260);
          const n = Math.min(3, e.stars); if (n) { e.stars -= n; Fx.pop(e.x, e.y - 70, '-' + n + ' ⭐', '#ff4f6d', 40); }
          else Fx.pop(e.x, e.y - 70, '掉下去了！', '#2b2340', 36);
          continue;
        } else if (!this.onGround(e.x, e.y)) this.fence(e, ox, oy);   // spawn shield: bounce off the edge
        if (kid && this.stage === 1) for (const [sx, sy] of SNOWMEN) this.bounceOff(e, sx, sy, 46, 0.9, false);
        if (this.stage === 2) for (const b of this.bump) if (this.bounceOff(e, b.x, b.y, b.r, 1, true)) { b.hit = 1; ctx.sfx('bonk', 1.2); Fx.ring(b.x, b.y, '#ffd23f', 90, 0.3); ctx.buzz(e.p, 40); }
        if (this.stage === 1 && kid) { /* ice is slippery: snow puffs */ if (sp > 200 && Math.random() < dt * 10) Fx.dust(e.x, e.y + BR * 0.8, 'rgba(255,255,255,.9)', 10); }
        else Fx.walk({ x: e.x, y: e.y, vx: e.vx, vy: e.vy, r: BR, _dustT: e._dustT }, dt);
        // pick up stars
        for (const s of this.stars) if (!s.got && hyp(e.x - s.x, e.y - s.y) < BR + 22) {
          s.got = true; const v = s.gold ? 3 : 1; e.stars += v; e.total += v; if (s.gold) e.golds++;
          ctx.sfx(s.gold ? 'star' : 'coin'); Fx.pop(s.x, s.y - 40, '+' + v, s.gold ? '#ffb400' : '#2b2340', s.gold ? 48 : 34); Fx.burst(s.x, s.y, '#ffd23f', s.gold ? 16 : 8, 220);
        }
        for (const l of this.loose) if (!l.gone && l.t > 0.5 && l.z === 0 && hyp(e.x - l.x, e.y - l.y) < BR + 20) { l.gone = true; e.stars++; e.total++; ctx.sfx('coin'); Fx.pop(l.x, l.y - 30, '+1', '#2b2340', 30); }
      }
      this.stars = this.stars.filter(s => !s.got);
      // balls bump into each other
      const E = this.es;
      for (let a = 0; a < E.length; a++) for (let b = a + 1; b < E.length; b++) {
        const A = E[a], B = E[b]; if (A.fall || B.fall) continue;
        const dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy); if (d >= BR * 2 || d === 0) continue;
        const nx = dx / d, ny = dy / d, o = (BR * 2 - d) / 2; A.x -= nx * o; A.y -= ny * o; B.x += nx * o; B.y += ny * o;
        const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny; if (rv >= 0) continue;
        const j = -(1 + 0.9) * rv / 2; A.vx -= j * nx; A.vy -= j * ny; B.vx += j * nx; B.vy += j * ny;
        const imp = -rv; if (imp > 120) { ctx.sfx('bonk', clamp(imp / 600, 0, 1)); Fx.ring((A.x + B.x) / 2, (A.y + B.y) / 2, '#ffffff', 50 + imp * 0.05, 0.3); A.hitT = B.hitT = 0.25; }
        if (!kid && imp > 330) {   // a hard bump knocks a star out of the slower ball
          const sa = hyp(A.vx, A.vy), sb = hyp(B.vx, B.vy), V = sa < sb ? A : B, H2 = V === A ? B : A;
          if (V.spillCd <= 0 && V.shield <= 0 && V.stars > 0) { V.spillCd = 1; H2.bumps++; this.spill(V, 1, Math.atan2(V.y - H2.y, V.x - H2.x)); ctx.buzz(V.p, 120); Fx.shake(5); }
        }
      }
      if (this.t >= this.dur) this.over = true;
    }
    bounceOff(e, x, y, r, rest, kick) {
      const dx = e.x - x, dy = e.y - y, d = hyp(dx, dy); if (d >= r + BR || d === 0) return false;
      const nx = dx / d, ny = dy / d; e.x = x + nx * (r + BR); e.y = y + ny * (r + BR);
      const vn = e.vx * nx + e.vy * ny; if (vn < 0) { e.vx -= (1 + rest) * vn * nx; e.vy -= (1 + rest) * vn * ny; }
      if (kick) { e.vx += nx * 380; e.vy += ny * 380; }
      return true;
    }
    fence(e, ox, oy) {
      const s = this.stage;
      if (s === 0) { const dx = e.x - CX, dy = e.y - CY, d = hyp(dx, dy), R = 400 - BR * 0.6; if (d > R) { const nx = dx / d, ny = dy / d; e.x = CX + nx * R; e.y = CY + ny * R; const vn = e.vx * nx + e.vy * ny; if (vn > 0) { e.vx -= 1.6 * vn * nx; e.vy -= 1.6 * vn * ny; } } }
      else if (s === 1) {
        const ax = 620 - BR * 0.6, ay = 330 - BR * 0.6, dx = (e.x - CX) / ax, dy = (e.y - CY) / ay, k = hyp(dx, dy);
        if (k > 1) { e.x = CX + dx / k * ax; e.y = CY + dy / k * ay; let nx = dx / ax, ny = dy / ay; const m = hyp(nx, ny); nx /= m; ny /= m; const vn = e.vx * nx + e.vy * ny; if (vn > 0) { e.vx -= 1.6 * vn * nx; e.vy -= 1.6 * vn * ny; } }
        for (const h of this.holes) if (h.open) this.bounceOff(e, h.x, h.y, h.r, 0.6, false);
      } else {
        if (e.x < 180 + BR * 0.6) { e.x = 180 + BR * 0.6; e.vx = Math.abs(e.vx) * 0.8; }
        if (e.x > 1420 - BR * 0.6) { e.x = 1420 - BR * 0.6; e.vx = -Math.abs(e.vx) * 0.8; }
        if (e.y < 210 + BR * 0.6) { e.y = 210 + BR * 0.6; e.vy = Math.abs(e.vy) * 0.8; }
        if (e.y > 830 - BR * 0.6) { e.y = 830 - BR * 0.6; e.vy = -Math.abs(e.vy) * 0.8; }
      }
    }

    /* ---------------- drawing ---------------- */
    paintMap(g) {
      const s = this.stage;
      if (s === 0) {
        const sea = g.createLinearGradient(0, 0, 0, H); sea.addColorStop(0, '#6fd0ff'); sea.addColorStop(1, '#2f8fd0'); g.fillStyle = sea; g.fillRect(-400, 0, W + 800, H);
        for (const [x, y, r] of [[120, 260, 70], [1500, 760, 90], [1420, 220, 50], [180, 800, 60]]) { g.fillStyle = '#f3dfa4'; g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, TAU); g.fill(); g.fillStyle = '#6cc04a'; g.beginPath(); g.ellipse(x, y - 6, r * 0.7, r * 0.33, 0, 0, TAU); g.fill(); }
        g.fillStyle = '#8a6a3a'; g.beginPath(); g.ellipse(CX, CY + 34, 404, 404 * 0.98, 0, 0, TAU); g.fill();
        g.fillStyle = '#6a4f2a'; g.beginPath(); g.ellipse(CX, CY + 40, 396, 396, 0, 0, Math.PI); g.fill();
        const gr = g.createRadialGradient(CX - 120, CY - 140, 40, CX, CY, 400); gr.addColorStop(0, '#9ee07a'); gr.addColorStop(1, '#5fb546');
        g.fillStyle = gr; g.beginPath(); g.arc(CX, CY, 400, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(CX, CY, 400, 0, TAU); g.clip();
        for (let k = -6; k <= 6; k++) { g.fillStyle = k % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.03)'; g.fillRect(CX + k * 64 - 32, CY - 400, 64, 800); }
        for (let k = 0; k < 60; k++) { const a = k * 2.4, rr = 40 + (k * 53) % 340; g.fillStyle = ['#fff', '#ffe066', '#ff9fc4'][k % 3]; g.beginPath(); g.arc(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 3, 0, TAU); g.fill(); }
        g.restore();
      } else if (s === 1) {
        const sea = g.createLinearGradient(0, 0, 0, H); sea.addColorStop(0, '#3c78a8'); sea.addColorStop(1, '#1d4468'); g.fillStyle = sea; g.fillRect(-400, 0, W + 800, H);
        for (const [x, y, r] of [[140, 240, 80], [1480, 300, 60], [200, 820, 70], [1440, 820, 90], [800, 120, 50]]) { g.fillStyle = 'rgba(230,246,255,.85)'; g.beginPath(); g.ellipse(x, y, r, r * 0.45, 0.2, 0, TAU); g.fill(); }
        g.fillStyle = '#9cc8e6'; g.beginPath(); g.ellipse(CX, CY + 26, 624, 334, 0, 0, TAU); g.fill();
        const ice = g.createLinearGradient(CX - 600, CY - 300, CX + 600, CY + 300); ice.addColorStop(0, '#f2fbff'); ice.addColorStop(0.5, '#cfeeff'); ice.addColorStop(1, '#e9f7ff');
        g.fillStyle = ice; g.beginPath(); g.ellipse(CX, CY, 620, 330, 0, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.ellipse(CX, CY, 620, 330, 0, 0, TAU); g.clip();
        g.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 7; k++) { const x = CX - 600 + k * 190; g.beginPath(); g.moveTo(x, CY - 330); g.lineTo(x + 50, CY - 330); g.lineTo(x - 150, CY + 330); g.lineTo(x - 200, CY + 330); g.fill(); }
        g.strokeStyle = 'rgba(120,170,210,.35)'; g.lineWidth = 2; for (let k = 0; k < 12; k++) { const x = CX + ((k * 211) % 1100) - 550, y = CY + ((k * 137) % 520) - 260; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y + 14); g.lineTo(x + 46, y - 6); g.stroke(); }
        g.restore();
      } else {
        g.fillStyle = '#2a1747'; g.fillRect(-400, 0, W + 800, H);
        for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(255,255,255,${0.2 + (k % 5) * 0.12})`; g.beginPath(); g.arc(((k * 397) % (W + 800)) - 400, (k * 211) % H, 1 + (k % 3), 0, TAU); g.fill(); }
        g.fillStyle = '#140b2e'; g.beginPath(); g.roundRect(166, 196, 1268, 648, 40); g.fill();
        const fl = g.createLinearGradient(0, 210, 0, 830); fl.addColorStop(0, '#5b2bb0'); fl.addColorStop(1, '#2f1a6b');
        g.fillStyle = fl; g.beginPath(); g.roundRect(180, 210, 1240, 620, 32); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; for (let x = 220; x < 1420; x += 60) { g.beginPath(); g.moveTo(x, 210); g.lineTo(x, 830); g.stroke(); } for (let y = 250; y < 830; y += 60) { g.beginPath(); g.moveTo(180, y); g.lineTo(1420, y); g.stroke(); }
        g.strokeStyle = '#ff6fb7'; g.lineWidth = 6; g.beginPath(); g.roundRect(180, 210, 1240, 620, 32); g.stroke();
        g.strokeStyle = 'rgba(255,111,183,.3)'; g.lineWidth = 18; g.stroke();
        for (const [x, y] of [[300, 300], [1300, 300], [300, 740], [1300, 740]]) { g.fillStyle = 'rgba(255,210,63,.18)'; g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x + 40, y); g.lineTo(x, y + 40); g.lineTo(x - 40, y); g.fill(); }
      }
    }
    bgLayer(g) {
      const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
      if (!this.bgCv || this.bgS !== s || this.bgStage !== this.stage) {
        const c = this.bgCv || document.createElement('canvas'); c.width = Math.ceil((W + 800) * s); c.height = Math.ceil(H * s);
        const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 400 * s, 0); this.paintMap(cg); this.bgCv = c; this.bgS = s; this.bgStage = this.stage;
      }
      g.drawImage(this.bgCv, -400, 0, W + 800, H);
    }
    drawFence(g, at) {
      if (!this.fenced()) return;
      g.strokeStyle = '#fff'; g.lineWidth = 6; g.fillStyle = '#c98f55';
      if (this.stage === 0) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(CX, CY, 398, 0, TAU); g.stroke(); for (let k = 0; k < 48; k++) { const a = k * TAU / 48; g.fillRect(CX + Math.cos(a) * 398 - 4, CY + Math.sin(a) * 398 - 14, 8, 18); } }
      else if (this.stage === 1) { g.strokeStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(CX, CY, 618, 328, 0, 0, TAU); g.stroke(); for (let k = 0; k < 60; k++) { const a = k * TAU / 60; g.fillStyle = k % 2 ? '#ff4f58' : '#fff'; g.fillRect(CX + Math.cos(a) * 618 - 4, CY + Math.sin(a) * 328 - 14, 8, 18); } }
    }
    drawStar(g, x, y, r, col, rot) {
      g.save(); g.translate(x, y); g.rotate(rot || 0); g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(160,100,0,.6)'; g.lineWidth = 2.5; g.stroke(); g.restore();
    }
    drawBall(g, e, at) {
      const C = PARTY_COLORS[e.p.col], tc = this.teams ? TEAMS[e.p.team].c : C.c;
      let x = e.x, y = e.y, sc = 1, al = 1;
      if (e.fall > 0) { const k = Math.min(1, e.fall / 0.8); sc = 1 - k * 0.7; y += k * 40; al = 1 - k; }
      if (al <= 0) return;
      g.globalAlpha = al;
      // trail
      for (let i = 0; i < e.trail.length; i++) { const [tx, ty] = e.trail[i]; g.globalAlpha = al * (i / e.trail.length) * 0.25; g.fillStyle = tc; g.beginPath(); g.arc(tx, ty, BR * (0.4 + i / e.trail.length * 0.4), 0, TAU); g.fill(); }
      g.globalAlpha = al;
      if (!e.fall) { g.fillStyle = 'rgba(20,20,40,.25)'; g.beginPath(); g.ellipse(x, y + BR * 0.9, BR * 0.9, BR * 0.3, 0, 0, TAU); g.fill(); }
      g.save(); g.translate(x, y); g.scale(sc, sc);
      const sp = hyp(e.vx, e.vy);
      drawCritter(g, 0, 6, BR * 0.62, e.p.col, e.p.animal, { noShadow: true, face: e.face, step: e.roll * 2, moving: sp > 30, rot: clamp(e.vx / 2400, -0.25, 0.25), stun: e.hitT > 0, happy: e.dash > 0, still: true });
      // the ball: tinted glass with rolling bands
      const gl = g.createRadialGradient(-BR * 0.35, -BR * 0.4, BR * 0.1, 0, 0, BR); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(0.7, 'rgba(255,255,255,.08)'); gl.addColorStop(1, mixCol(tc, 0.2).replace('rgb', 'rgba').replace(')', ',.45)'));
      g.fillStyle = gl; g.beginPath(); g.arc(0, 0, BR, 0, TAU); g.fill();
      g.strokeStyle = tc; g.lineWidth = 4; g.stroke();
      g.save(); g.beginPath(); g.arc(0, 0, BR, 0, TAU); g.clip(); g.rotate(e.face);
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3;
      for (let k = 0; k < 3; k++) { const ph = ((e.roll / Math.PI + k / 3) % 1) * 2 - 1; g.beginPath(); g.ellipse(ph * BR, 0, BR * 0.18 * Math.sqrt(1 - ph * ph) + 1, BR * Math.sqrt(1 - ph * ph), 0, 0, TAU); g.stroke(); }
      g.restore();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-BR * 0.38, -BR * 0.48, BR * 0.22, BR * 0.12, -0.6, 0, TAU); g.fill();
      if (e.shield > 0 && (at * 10 | 0) % 2) { g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, BR + 6, 0, TAU); g.stroke(); }
      g.restore(); g.globalAlpha = 1;
      if (!e.fall) {
        drawTag(g, x, y - BR - 26, e.p);
        g.font = '900 22px ' + RFONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = '#fff'; g.strokeText('⭐' + e.stars, x, y + BR + 20); g.fillStyle = '#2b2340'; g.fillText('⭐' + e.stars, x, y + BR + 20);
      }
    }
    draw(g, clock) {
      const at = clock || this.t;
      this.bgLayer(g);
      if (this.stage === 0) for (const w of this.waves) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(w.x + Math.sin(w.ph) * 8, w.y, 18 * w.s, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
      if (this.stage === 1) {
        for (const h of this.holes) {
          if (h.open) { g.fillStyle = '#1d4468'; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fill(); g.strokeStyle = '#e9f7ff'; g.lineWidth = 6; g.stroke(); g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.arc(h.x - h.r * 0.3, h.y - h.r * 0.3, h.r * 0.3, 0, TAU); g.fill(); }
          else { const k = 1 - h.warn / 2.2; g.strokeStyle = `rgba(40,90,140,${0.4 + k * 0.6})`; g.lineWidth = 3; g.beginPath(); for (let a = 0; a < 7; a++) { const an = a * TAU / 7 + 0.3; g.moveTo(h.x, h.y); g.lineTo(h.x + Math.cos(an) * h.r * (0.4 + k * 0.6), h.y + Math.sin(an) * h.r * (0.4 + k * 0.6)); } g.stroke(); if ((at * 6 | 0) % 2) { g.font = '900 30px ' + RFONT; g.fillStyle = '#ff3b4a'; g.textAlign = 'center'; g.fillText('!', h.x, h.y - h.r - 10); } }
        }
        if (this.kid) for (const [sx, sy] of SNOWMEN) {
          g.fillStyle = 'rgba(30,60,90,.2)'; g.beginPath(); g.ellipse(sx, sy + 40, 46, 14, 0, 0, TAU); g.fill();
          g.fillStyle = '#fff'; g.strokeStyle = '#b8d6ea'; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy + 8, 40, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.arc(sx, sy - 40, 26, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = '#2b2340'; g.beginPath(); g.arc(sx - 8, sy - 44, 3.5, 0, TAU); g.arc(sx + 8, sy - 44, 3.5, 0, TAU); g.fill(); g.fillStyle = '#ff8a1f'; g.beginPath(); g.moveTo(sx, sy - 38); g.lineTo(sx + 18, sy - 35); g.lineTo(sx, sy - 32); g.fill();
          g.fillStyle = '#ff4f58'; g.fillRect(sx - 24, sy - 20, 48, 8);
        }
      }
      if (this.stage === 2) for (const b of this.bump) {
        const k = b.hit, r = b.r * (1 + k * 0.15);
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(b.x, b.y + r * 0.8, r, r * 0.3, 0, 0, TAU); g.fill();
        g.fillStyle = k > 0.1 ? '#fff6c2' : '#ffd23f'; g.beginPath(); g.arc(b.x, b.y, r, 0, TAU); g.fill();
        g.fillStyle = '#ff6fb7'; g.beginPath(); g.arc(b.x, b.y, r * 0.72, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, r * 0.38, 0, TAU); g.fill();
        g.font = '900 20px ' + RFONT; g.fillStyle = '#ff3b8a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('彈', b.x, b.y + 1);
        if (k > 0) { g.strokeStyle = `rgba(255,210,63,${k})`; g.lineWidth = 6; g.beginPath(); g.arc(b.x, b.y, r + 14 * (1 - k) + 6, 0, TAU); g.stroke(); }
      }
      this.drawFence(g, at);
      Fx.ground(g);
      for (const s of this.stars) {
        const bob = Math.sin(at * 4 + s.ph) * 5, blink = s.gold && s.life - s.t < 2 && (at * 8 | 0) % 2;
        g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(s.x, s.y + 18, s.gold ? 20 : 13, 5, 0, 0, TAU); g.fill();
        if (s.gold) { const gr = g.createRadialGradient(s.x, s.y + bob, 4, s.x, s.y + bob, 50); gr.addColorStop(0, 'rgba(255,230,120,.7)'); gr.addColorStop(1, 'rgba(255,230,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y + bob, 50, 0, TAU); g.fill(); }
        if (!blink) this.drawStar(g, s.x, s.y + bob - (s.t < 0.3 ? (0.3 - s.t) * 300 : 0), s.gold ? 30 : 18, s.gold ? '#ffb400' : '#ffd23f', Math.sin(at * 2 + s.ph) * 0.3);
      }
      for (const l of this.loose) { g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(l.x, l.y + 14, 12, 4, 0, 0, TAU); g.fill(); this.drawStar(g, l.x, l.y - l.z, 16, '#ffe680', at * 6); }
      const order = this.es.slice().sort((a, b) => a.y - b.y);
      for (const e of order) this.drawBall(g, e, at);
      if (this.stage === 1) { g.fillStyle = 'rgba(255,255,255,.8)'; for (const s of this.snow) { g.beginPath(); g.arc(s.x, s.y, 2.5, 0, TAU); g.fill(); } }
      // stage sign
      g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.roundRect(24, 160, 250, 52, 26); g.fill();
      g.fillStyle = '#2b2340'; g.font = '900 24px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('第 ' + (this.stage + 1) + '/3 關 ' + this.map.icon + ' ' + this.map.n, 44, 187);
    }
    center() { const left = Math.ceil(this.stageLen * (this.stage + 1) - this.t); return this.stage < 2 ? '下一關還有 ' + left + ' 秒' : '最後一關！'; }
    teamScore(t) { return '⭐' + this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.stars, 0); }
    chip(p) { return '⭐ ' + this.by.get(p).stars; }
    pad(p) { const e = this.by.get(p); return '⭐ ' + e.stars + '・第 ' + (this.stage + 1) + ' 關' + (e.fall ? '・掉下去了！' : ''); }
    ready(p) { const e = this.by.get(p); return e.cd <= 0 && !e.fall; }
    padLayout() { return { type: 'tilt', prompt: '把手機平放，往哪邊斜就往哪邊滾', btn: { icon: '💨', label: '衝' } }; }
    results() {
      const team = this.teams ? { teamScores: [0, 1].map(t => this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.stars, 0)), teamText: t => this.teamScore(t) } : {};
      return { ...team, rows: this.es.slice().sort((a, b) => b.stars - a.stars).map(e => ({ p: e.p, key: e.stars, line: `⭐ ${e.stars} 顆` + (e.golds ? `・🌟 ${e.golds}` : '') + (this.kid ? '' : `・掉下去 ${e.falls} 次`) })) };
    }
  }
  GAMES.push({
    id: 'roll', name: '滾滾球', icon: '🔮', col: COL, bg: '#2f8fd0', kind: 'vs', teams: true, players: '1–6 人',
    blurb: '斜斜手機滾球球，撿最多星星！三關不同地圖',
    btn: { label: '衝', icon: '💨' },
    rules: kid => kid
      ? ['你在透明的大球球裡！把手機平放，往哪邊斜球就往哪邊滾', '（沒有感應的手機會出現搖桿）', '撿星星 ⭐，金色大星星 🌟 一次 3 顆', '三關：草地、冰湖（很滑！）、彈珠台；旁邊有圍欄不會掉下去']
      : ['斜手機滾球，按「衝」可以衝一下（沒有感應就用搖桿）', '三關：草地圓盤、冰湖（會裂開變洞）、彈珠台（彈跳器）', '沒有圍欄：掉下去會掉 3 顆星星', '用力撞別人，可以把他的星星撞出來搶走；最後星星最多的人贏'],
    thumb(g) {
      g.fillStyle = '#4fb6ec'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#6a4f2a'; g.beginPath(); g.ellipse(160, 98, 120, 66, 0, 0, TAU); g.fill();
      g.fillStyle = '#7fcf5e'; g.beginPath(); g.ellipse(160, 90, 120, 64, 0, 0, TAU); g.fill();
      const ball = (x, y, c, a) => { drawCritter(g, x, y + 2, 13, c, a, { noShadow: true, still: true }); g.fillStyle = 'rgba(255,255,255,.2)'; g.strokeStyle = PARTY_COLORS[c].c; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 22, 0, TAU); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(x - 8, y - 10, 5, 3, -0.6, 0, TAU); g.fill(); };
      ball(110, 90, 0, 0); ball(205, 104, 1, 2);
      g.font = '24px system-ui'; g.textAlign = 'center'; g.fillText('⭐', 160, 70); g.fillText('🌟', 230, 72); g.fillText('⭐', 120, 125);
      g.font = '28px system-ui'; g.fillText('📱', 288, 40);
    },
    create: ctx => new Roll(ctx)
  });
})();
