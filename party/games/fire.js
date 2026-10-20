'use strict';
/* 一起救火 — everyone together: fires break out on the houses; stand near one and
   HOLD the button to spray water. If a fire burns all the way, that house is lost.
   Save the village until the time runs out.
   小朋友: endless water, slow fires, can lose 4 houses.
   大人: the water tank empties (refill at the pond), fires grow faster and jump to
   the next house, only 2 houses may burn. */
(() => {
  const X0 = 50, Y0 = 150, X1 = 1550, Y1 = 870, POND = { x: 800, y: 520, rx: 120, ry: 70 };
  const HOUSES = [[230, 280], [560, 250], [1040, 250], [1370, 280], [230, 720], [560, 770], [1040, 770], [1370, 720]];
  const ROOFS = ['#ff6b5e', '#4f9dff', '#ffb02e', '#6bcf7f', '#b07aff', '#ff7fb8', '#3fc1c9', '#ff8f4a'];
  class Fire {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.ok = false;
      const n = ctx.players.length, kid = this.kid;
      this.dur = 90; this.lives = kid ? 4 : 2; this.lost = 0;
      this.houses = HOUSES.map(([x, y], i) => ({ x, y, roof: ROOFS[i], fire: 0, burnt: false, wet: 0 }));
      this.es = ctx.players.map((p, i) => {
        const a = i * TAU / Math.max(1, n);
        return { p, x: 800 + Math.cos(a) * 230, y: 520 + Math.sin(a) * 150, vx: 0, vy: 0, face: a, r: 30, water: 100, spray: false, saved: 0, walk: 0, target: null };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.spawnT = 3; this.drops = [];
      this.rate = kid ? 1 / 24 : 1 / 15;
      this.every = (kid ? 7 : 4.5) / (1 + 0.25 * (n - 1));
    }
    alive() { return this.houses.filter(h => !h.burnt); }
    ignite(h) { if (!h.burnt && h.fire <= 0) { h.fire = 0.05; this.ctx.sfx('whoosh'); } }
    solid(e) {
      for (const h of this.houses) {
        const cx = clamp(e.x, h.x - 70, h.x + 70), cy = clamp(e.y, h.y - 50, h.y + 40), dx = e.x - cx, dy = e.y - cy, d = hyp(dx, dy);
        if (d < e.r && d > 0) { e.x = cx + dx / d * e.r; e.y = cy + dy / d * e.r; }
      }
      const px = (e.x - POND.x) / (POND.rx + e.r * 0.5), py = (e.y - POND.y) / (POND.ry + e.r * 0.5), pd = hyp(px, py);
      if (pd < 1 && pd > 0) { e.x = POND.x + px / pd * (POND.rx + e.r * 0.5); e.y = POND.y + py / pd * (POND.ry + e.r * 0.5); }
      e.x = clamp(e.x, X0 + e.r, X1 - e.r); e.y = clamp(e.y, Y0 + e.r, Y1 - e.r);
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      // new fires
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = this.every * rnd(0.7, 1.3) * Math.max(0.6, 1 - this.t / 200);
        const calm = this.alive().filter(h => h.fire <= 0 && h.wet <= 0);
        if (calm.length) this.ignite(calm[rint(calm.length)]);
      }
      // players
      const reach = kid ? 170 : 140, power = kid ? 0.95 : 0.8;
      for (const e of this.es) {
        const i = ctx.input(e.p), sp = 340, k = 1 - Math.exp(-11 * dt);
        e.vx += (i.x * sp - e.vx) * k; e.vy += (i.y * sp - e.vy) * k;
        if (i.x || i.y) { e.face = Math.atan2(i.y, i.x); e.walk += dt * 12; } else e.walk = 0;
        e.x += e.vx * dt; e.y += e.vy * dt; this.solid(e);
        ctx.pressed(e.p, 0);
        const nearPond = hyp((e.x - POND.x) / (POND.rx + 70), (e.y - POND.y) / (POND.ry + 70)) < 1;
        if (!kid && nearPond && e.water < 100) { const was = e.water; e.water = Math.min(100, e.water + 70 * dt); if (was < 100 && e.water >= 100) { ctx.sfx('coin'); ctx.buzz(e.p, 60); } }
        e.spray = false; e.target = null;
        if (ctx.held(e.p, 0) && (kid || e.water > 0)) {
          let best = null, bd = reach;
          for (const h of this.houses) if (h.fire > 0) { const d = hyp(h.x - e.x, h.y - 20 - e.y); if (d < bd) { bd = d; best = h; } }
          e.spray = true; e.target = best;
          if (!kid) e.water = Math.max(0, e.water - 22 * dt);
          const tx = best ? best.x : e.x + Math.cos(e.face) * 120, ty = best ? best.y - 30 : e.y + Math.sin(e.face) * 120;
          if (best) e.face = Math.atan2(ty - e.y, tx - e.x);
          if (Math.random() < dt * 40) this.drops.push({ x: e.x + Math.cos(e.face) * 30, y: e.y + Math.sin(e.face) * 30 - 10, tx: tx + rnd(-20, 20), ty: ty + rnd(-20, 20), t: 0 });
          if (best) {
            best.fire -= power * dt; best.wet = 2.5;
            if (best.fire <= 0) { best.fire = 0; e.saved++; ctx.sfx('star'); ctx.buzz(e.p, 80); Fx.pop(best.x, best.y - 110, '滅火了！', '#2f8cff', 40); Fx.burst(best.x, best.y - 40, '#9fd8ff', 16, 260); }
          }
        }
      }
      for (const d of this.drops) d.t += dt * 3; this.drops = this.drops.filter(d => d.t < 1);
      // fires grow
      for (const h of this.houses) {
        h.wet -= dt;
        if (h.burnt || h.fire <= 0) continue;
        if (h.wet <= 0) h.fire += this.rate * dt * (1 + this.t / 120);
        if (!kid && h.fire > 0.7 && Math.random() < dt * 0.25) {
          const nb = this.alive().filter(o => o !== h && o.fire <= 0 && hyp(o.x - h.x, o.y - h.y) < 520);
          if (nb.length) { const o = nb[rint(nb.length)]; this.ignite(o); Fx.pop(o.x, o.y - 110, '火燒過來了！', '#ff4f2e', 32); }
        }
        if (h.fire >= 1) {
          h.burnt = true; h.fire = 0; this.lost++; ctx.sfx('boom'); Fx.burst(h.x, h.y - 30, '#555', 20, 300); Fx.pop(h.x, h.y - 110, '房子燒掉了…', '#c0392b', 36);
          this.es.forEach(e => ctx.buzz(e.p, 200));
          if (this.lost >= this.lives || !this.alive().length) { this.over = true; this.ok = false; }
        }
      }
      if (this.t >= this.dur && !this.over) { this.over = true; this.ok = true; }
    }
    drawHouse(g, h, t) {
      const x = h.x, y = h.y;
      g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(x + 8, y + 44, 84, 16, 0, 0, TAU); g.fill();
      if (h.burnt) {
        g.fillStyle = '#5b5560'; g.beginPath(); g.roundRect(x - 66, y - 20, 132, 60, 6); g.fill();
        g.fillStyle = '#3a3540'; g.beginPath(); g.moveTo(x - 76, y - 16); g.lineTo(x - 20, y - 60); g.lineTo(x + 10, y - 30); g.lineTo(x + 40, y - 70); g.lineTo(x + 76, y - 16); g.fill();
        g.fillStyle = 'rgba(120,120,130,.4)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x - 20 + k * 22, y - 80 - ((t * 30 + k * 20) % 60), 12 + k * 3, 0, TAU); g.fill(); }
        return;
      }
      const shake = h.fire > 0.6 ? Math.sin(t * 40) * 1.5 : 0;
      g.fillStyle = '#fff3dc'; g.strokeStyle = '#c9a66a'; g.lineWidth = 3; g.beginPath(); g.roundRect(x - 64 + shake, y - 30, 128, 72, 6); g.fill(); g.stroke();
      g.fillStyle = h.roof; g.beginPath(); g.moveTo(x - 80 + shake, y - 26); g.lineTo(x + shake, y - 90); g.lineTo(x + 80 + shake, y - 26); g.closePath(); g.fill();
      g.fillStyle = '#8a5a2b'; g.beginPath(); g.roundRect(x - 14, y + 2, 28, 40, 6); g.fill();
      g.fillStyle = '#9fd8ff'; for (const s of [-1, 1]) { g.beginPath(); g.roundRect(x + s * 40 - 13, y - 14, 26, 22, 4); g.fill(); }
      if (h.wet > 0 && h.fire <= 0) { g.fillStyle = 'rgba(120,200,255,.35)'; g.beginPath(); g.roundRect(x - 70, y - 90, 140, 132, 18); g.fill(); }
      if (h.fire > 0) {
        const f = h.fire, n = 3 + Math.round(f * 5);
        for (let k = 0; k < n; k++) {
          const fx = x - 50 + (k * 100) / Math.max(1, n - 1), fy = y - 40 - (k % 2) * 20, s = (16 + f * 30) * (0.8 + 0.3 * Math.sin(t * 12 + k * 1.7));
          g.fillStyle = '#ff5a1f'; g.beginPath(); g.moveTo(fx - s * 0.6, fy); g.quadraticCurveTo(fx - s * 0.5, fy - s * 1.2, fx, fy - s * 1.8); g.quadraticCurveTo(fx + s * 0.5, fy - s * 1.2, fx + s * 0.6, fy); g.closePath(); g.fill();
          g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(fx - s * 0.3, fy); g.quadraticCurveTo(fx - s * 0.25, fy - s * 0.7, fx, fy - s); g.quadraticCurveTo(fx + s * 0.25, fy - s * 0.7, fx + s * 0.3, fy); g.closePath(); g.fill();
        }
        // how close it is to burning down
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(x - 52, y + 50, 104, 16, 8); g.fill();
        g.fillStyle = f > 0.7 ? '#ff2e2e' : '#ff8a1f'; g.beginPath(); g.roundRect(x - 50, y + 52, 100 * Math.min(1, f), 12, 6); g.fill();
      }
    }
    draw(g) {
      const t = this.t;
      g.fillStyle = '#8fd27a'; g.fillRect(-400, 0, W + 800, H);
      g.fillStyle = '#e8d6a8'; g.fillRect(X0, 470, X1 - X0, 100); g.fillRect(750, Y0, 100, Y1 - Y0);
      g.fillStyle = '#7fc5f0'; g.beginPath(); g.ellipse(POND.x, POND.y, POND.rx + 14, POND.ry + 12, 0, 0, TAU); g.fill();
      g.fillStyle = '#4fb7ea'; g.beginPath(); g.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(POND.x, POND.y, 30 + ((t * 30 + k * 30) % 90), 12 + ((t * 30 + k * 30) % 90) * 0.5, 0, 0, TAU); g.stroke(); }
      if (!this.kid) { g.fillStyle = '#2b2340'; g.font = '900 22px "Noto Sans TC",system-ui'; g.textAlign = 'center'; g.fillText('💧 來這裡裝水', POND.x, POND.y + POND.ry + 34); }
      const things = [];
      for (const h of this.houses) things.push({ y: h.y + 40, f: () => this.drawHouse(g, h, t) });
      for (const e of this.es) things.push({ y: e.y, f: () => {
        drawCritter(g, e.x, e.y, e.r, e.p.col, e.p.animal, { face: e.face, hop: e.walk ? Math.abs(Math.sin(e.walk)) * 7 : 0, happy: e.spray && !!e.target });
        // fire helmet
        g.fillStyle = '#ff4f2e'; g.beginPath(); g.ellipse(e.x, e.y - e.r * 0.72, e.r * 0.8, e.r * 0.42, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(e.x, e.y - e.r * 0.95, 5, 0, TAU); g.fill();
        drawTag(g, e.x, e.y - e.r - 30, e.p);
        if (!this.kid) {
          g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(e.x - 30, e.y + e.r + 10, 60, 12, 6); g.fill();
          g.fillStyle = e.water < 20 ? '#ff4f58' : '#2f8cff'; g.beginPath(); g.roundRect(e.x - 28, e.y + e.r + 12, 56 * e.water / 100, 8, 4); g.fill();
        }
      } });
      things.sort((a, b) => a.y - b.y).forEach(o => o.f());
      g.fillStyle = '#5fc3ff';
      for (const d of this.drops) { const x = d.x + (d.tx - d.x) * d.t, y = d.y + (d.ty - d.y) * d.t - Math.sin(d.t * Math.PI) * 50; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
    }
    center() { return '🏠 還可以燒 ' + Math.max(0, this.lives - this.lost) + ' 間'; }
    chip(p) { return '🚒 ' + this.by.get(p).saved; }
    pad(p) {
      const e = this.by.get(p), burning = this.houses.filter(h => h.fire > 0).length;
      const w = this.kid ? '' : (e.water <= 0 ? '　沒水了，去池塘！' : '　💧' + Math.round(e.water));
      return (burning ? '🔥 ' + burning + ' 間著火' : '沒有火') + w;
    }
    ready(p) { const e = this.by.get(p); return this.kid || e.water > 0; }
    results() {
      const left = this.lives - this.lost;
      const stars = this.ok ? (this.lost === 0 ? 3 : left >= Math.ceil(this.lives / 2) ? 2 : 1) : 0;
      return {
        team: true, ok: this.ok, stars,
        title: this.ok ? (this.lost === 0 ? '一間都沒燒掉！' : '撐過去了！') : '燒掉太多房子了…',
        sub: `燒掉 ${this.lost} 間房子`,
        rows: this.es.slice().sort((a, b) => b.saved - a.saved).map(e => ({ p: e.p, key: e.saved, line: `滅火 ${e.saved} 次` }))
      };
    }
  }
  GAMES.push({
    id: 'fire', name: '一起救火', icon: '🚒', col: '#ff4f2e', bg: '#8fd27a', kind: 'team', players: '1–6 人',
    blurb: '大家合作，房子著火了快去滅火！',
    btn: { label: '按住噴水', icon: '💦' },
    rules: kid => kid
      ? ['房子會著火，快跑到著火的房子旁邊', '按住「噴水」不放，就會把火澆熄', '房子下面的紅條滿了，房子就會燒掉', '90 秒內燒掉不到 4 間就成功']
      : ['跑到著火的房子旁邊，按住「噴水」澆熄', '水會用完！回中間的池塘就能裝滿', '火太大會燒到隔壁的房子，要分頭去救', '90 秒內燒掉不到 2 間就成功'],
    thumb(g) {
      g.fillStyle = '#8fd27a'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#fff3dc'; g.fillRect(150, 70, 110, 60); g.fillStyle = '#ff6b5e'; g.beginPath(); g.moveTo(140, 74); g.lineTo(205, 26); g.lineTo(270, 74); g.fill();
      for (let k = 0; k < 4; k++) { const fx = 165 + k * 27; g.fillStyle = '#ff5a1f'; g.beginPath(); g.moveTo(fx - 12, 70); g.quadraticCurveTo(fx, 30, fx, 22); g.quadraticCurveTo(fx, 30, fx + 12, 70); g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(fx, 62, 6, 0, TAU); g.fill(); }
      drawCritter(g, 80, 110, 24, 1, 1, { face: 0, happy: true }); g.fillStyle = '#ff4f2e'; g.beginPath(); g.ellipse(80, 93, 19, 10, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#5fc3ff'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(108 + k * 10, 100 - Math.sin(k / 5 * Math.PI) * 18, 5, 0, TAU); g.fill(); }
    },
    create: ctx => new Fire(ctx)
  });
})();
