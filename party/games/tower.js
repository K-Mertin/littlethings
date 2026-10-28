'use strict';
/* 疊疊高塔 — everybody builds ONE tower together. A crane swings a new floor back and forth;
   whoever's turn it is presses 「放！」 to drop it. Land it on top of the tower!
   Turns go round the group; the others' phones become 「加油！」 buttons (little hearts fly up).
   Every 5th floor is golden: a perfect drop on it gives back a heart.
   小朋友: 5 hearts, goal 12 floors, wide blocks that never get smaller, a slow crane.
   大人:   3 hearts, goal 20 floors, the part that hangs over is cut off (the tower gets thinner),
           three perfect drops in a row grow it back, the crane speeds up and from floor 8 there's wind. */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', RFONT = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const COL = '#0ea5e9', CX = 800, GROUND = 800, FH = 72, HOOK_Y = 196;
  const BLOCK_COLS = ['#ff6b6b', '#4dabf7', '#ffd43b', '#51cf66', '#b197fc', '#ff8cc6'];

  class Tower {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = null; this.edge = '#8fd3ff';
      this.es = ctx.players.map((p, i) => ({ p, floors: 0, perfect: 0, cheers: 0, hop: 0, vy: 0, say: 0 }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.goal = this.kid ? 12 : 20; this.lives = this.kid ? 5 : 3; this.hearts = this.lives;
      this.w0 = this.kid ? 250 : 230;
      this.floors = [{ x: CX, w: 340, col: '#9a8c7a', base: true }];   // the foundation
      this.turn = 0; this.combo = 0; this.cam = 0; this.camT = 0; this.wob = 0; this.wind = 0; this.windT = 0;
      this.drop = null; this.debris = []; this.cheerFx = []; this.phase = 'swing'; this.idle = 0; this.endT = 0;
      this.ph = rnd(0, TAU); this.hookX = CX;
      this.clouds = []; for (let i = 0; i < 14; i++) this.clouds.push({ x: rnd(-200, W + 200), y: rnd(-2600, 500), s: rnd(0.6, 1.4), v: rnd(5, 18) });
      this.birds = []; for (let i = 0; i < 5; i++) this.birds.push({ x: rnd(0, W), y: rnd(-1800, 200), v: rnd(40, 80) * (Math.random() < 0.5 ? -1 : 1), ph: rnd(0, TAU) });
      this.stars = []; for (let i = 0; i < 80; i++) this.stars.push({ x: rnd(0, W), y: rnd(-3200, -1400), r: rnd(1, 2.6) });
      this.newBlock();
    }
    top() { return this.floors[this.floors.length - 1]; }
    level() { return this.floors.length - 1; }
    cur() {   // whose turn it is (skipping phones that dropped out)
      for (let k = 0; k < this.es.length; k++) { const e = this.es[(this.turn + k) % this.es.length]; if (e.p.online || e.p.local) { this.turn = (this.turn + k) % this.es.length; return e; } }
      return this.es[0];
    }
    newBlock() {
      const n = this.level() + 1, gold = n % 5 === 0;
      this.hang = { w: this.kid ? this.w0 : this.top().base ? this.w0 : Math.min(this.w0, this.nextW || this.w0), gold, col: gold ? '#ffcf3f' : BLOCK_COLS[this.cur().p.col % 6] };
      this.phase = 'swing'; this.idle = 0;
      if (!this.kid && n >= 8) { this.wind = rnd(-1, 1); if (Math.abs(this.wind) < 0.3) this.wind = 0.3 * Math.sign(this.wind || 1); } else this.wind = 0;
    }
    speed() { const n = this.level(); return this.kid ? 1.25 + n * 0.035 : 1.6 + n * 0.06; }
    /* world y of a floor's top (ground = GROUND) */
    floorY(i) { return GROUND - i * FH; }
    swayX(i, at) { const n = this.floors.length; return Math.sin(at * 2.1) * this.wob * Math.pow(i / Math.max(1, n), 1.5); }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      for (const c of this.clouds) { c.x += c.v * dt; if (c.x > W + 260) c.x = -260; }
      for (const b of this.birds) { b.x += b.v * dt; if (b.x > W + 60) b.x = -60; if (b.x < -60) b.x = W + 60; }
      for (const e of this.es) { if (e.hop > 0 || e.vy) { e.vy -= 1700 * dt; e.hop = Math.max(0, e.hop + e.vy * dt); if (e.hop <= 0) e.vy = 0; } e.say = Math.max(0, e.say - dt); }
      this.wob = Math.max(0, this.wob - dt * (kid ? 5 : 3));
      // the camera follows the top of the tower
      this.camT = Math.max(0, this.level() * FH - 330); this.cam += (this.camT - this.cam) * Math.min(1, dt * 3);
      // cheering from everybody else
      for (const e of this.es) {
        const n = this.taps(e);
        if (!n) continue;
        if (e === this.cur() && this.phase === 'swing') { this.release(); continue; }
        if (e !== this.cur()) { e.cheers++; e.hop = Math.max(e.hop, 1); e.vy = 360; if (this.cheerFx.length < 60) this.cheerFx.push({ x: this.standX(e) + rnd(-20, 20), y: 790, t: 0, c: ['💖', '⭐', '👏', '🎉'][rint(4)] }); }
      }
      for (const c of this.cheerFx) c.t += dt; this.cheerFx = this.cheerFx.filter(c => c.t < 1.4);
      for (const d of this.debris) { d.vy += 1800 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.r += d.vr * dt; }
      this.debris = this.debris.filter(d => d.y < GROUND + this.cam + 200);
      if (this.phase === 'end') { this.endT -= dt; if (this.endT <= 0) this.over = true; return; }
      if (this.phase === 'swing') {
        this.ph += dt * this.speed();
        this.hookX = CX + Math.sin(this.ph) * (kid ? 330 : 380);
        this.idle += dt;
        if (this.idle > (kid ? 14 : 10)) { this.release(); Fx.pop(this.hookX, HOOK_Y - 40, '時間到，自動放下', '#2b2340', 30); }
      } else if (this.phase === 'fall') {
        const d = this.drop; d.vy += 2600 * dt; d.y += d.vy * dt; d.x += this.wind * 150 * dt; d.rot *= Math.exp(-dt * 6);
        const top = this.top(), i = this.level(), ty = this.floorY(i) - FH, tx = top.x + this.swayX(i, this.t);
        if (d.y >= ty) this.land(d, tx, ty);
      } else if (this.phase === 'wait') { this.pt -= dt; if (this.pt <= 0) { this.turn = (this.turn + 1) % this.es.length; this.newBlock(); } }
    }
    taps(e) { const p = e.p; if (!p.inp) return 0; const n = p.inp.c[0] - p.seen[0]; if (n > 0) p.seen[0] = p.inp.c[0]; return n > 0 ? 1 : 0; }
    release() {
      // the block's world y while hanging: under the hook, which sits at a fixed spot on screen
      this.drop = { x: this.hookX, y: HOOK_Y + 46 - this.cam, vy: 0, w: this.hang.w, col: this.hang.col, gold: this.hang.gold, rot: Math.sin(this.ph) * 0.12, by: this.cur() };
      this.phase = 'fall'; this.ctx.sfx('whoosh');
    }
    land(d, tx, ty) {
      const ctx = this.ctx, kid = this.kid, e = d.by, top = this.top(), dx = d.x - tx;
      const half = (d.w + top.w) / 2, overlap = half - Math.abs(dx);
      const perfect = Math.abs(dx) < (kid ? 12 : 7);
      const miss = kid ? Math.abs(dx) > top.w * 0.55 + d.w * 0.05 : overlap < 18;
      if (miss) {
        this.debris.push({ x: d.x, y: ty, vx: Math.sign(dx || 1) * 260, vy: -220, w: d.w, col: d.col, r: 0, vr: Math.sign(dx || 1) * 4, gold: d.gold });
        this.hearts--; this.combo = 0; this.wob = Math.min(40, this.wob + 14);
        ctx.sfx('bonk', 0.4); ctx.buzz(e.p, 300); Fx.shake(8); Fx.pop(CX, 330, this.hearts > 0 ? '掉下去了！💔' : '沒有愛心了…', '#ff3b4a', 54);
        e.say = 1.4;
        if (this.hearts <= 0) return this.finish(false);
        this.phase = 'wait'; this.pt = 1.1; return;
      }
      let x = perfect ? tx : d.x, w = d.w;
      if (!kid && !perfect) {   // cut off what hangs over the edge
        const l = Math.max(d.x - d.w / 2, tx - top.w / 2), r = Math.min(d.x + d.w / 2, tx + top.w / 2);
        const cutW = d.w - (r - l), side = dx > 0 ? 1 : -1;
        if (cutW > 2) this.debris.push({ x: side > 0 ? r + cutW / 2 : l - cutW / 2, y: ty, vx: side * 140, vy: -80, w: cutW, col: d.col, r: 0, vr: side * 3, gold: d.gold });
        x = (l + r) / 2; w = r - l;
      }
      this.combo = perfect ? this.combo + 1 : 0;
      if (!kid && perfect && this.combo >= 3 && w < this.w0) { w = Math.min(this.w0, w + 24); Fx.pop(x, ty - 70, '變寬了！', '#16a34a', 36); }
      this.nextW = w;
      this.floors.push({ x: x - this.swayX(this.level() + 1, this.t), w, col: d.col, gold: d.gold, who: e.p, perfect });
      e.floors++; this.wob = Math.min(40, this.wob + (perfect ? 0 : Math.min(18, Math.abs(dx) * 0.12)));
      const sy = ty + this.cam;
      if (perfect) {
        e.perfect++; ctx.sfx('star'); Fx.ring(x, sy, '#fff', 160, 0.45); Fx.pop(x, sy - 80, this.combo >= 2 ? '完美 ×' + this.combo + '！' : '完美！', '#ffb400', 56); Fx.flash('#ffffff', 0.18);
        if (d.gold && this.hearts < this.lives) { this.hearts++; Fx.pop(x + 120, sy - 40, '💖 +1', '#ff4f8a', 44); ctx.sfx('coin'); }
      } else { ctx.sfx('bonk', 0.2); Fx.pop(x, sy - 70, Math.abs(dx) > d.w * 0.35 ? '差點！' : '好！', '#2b2340', 40); }
      Fx.shake(perfect ? 3 : 5); ctx.buzz(e.p, 60);
      for (let k = 0; k < 6; k++) Fx.dust(x + rnd(-w / 2, w / 2), sy, 'rgba(255,255,255,.9)', 12);
      e.hop = 1; e.vy = 420; e.say = 0;
      if (this.level() >= this.goal) return this.finish(true);
      if (this.level() === Math.ceil(this.goal / 2)) Fx.announce('蓋到一半了！加油！', COL, 420);
      this.phase = 'wait'; this.pt = 0.7;
    }
    finish(ok) {
      this.phase = 'end'; this.endT = ok ? 3.2 : 2.2; this.ok = ok || this.level() >= Math.ceil(this.goal / 3);
      this.endText = ok ? '蓋好了！' : '結束！';
      if (ok) { Fx.announce('🎉 高塔蓋好了！', '#ffb400', 420); this.ctx.sfx('win'); Fx.flash('#fff6c2', 0.4); for (let k = 0; k < 5; k++) Fx.burst(CX + rnd(-200, 200), rnd(200, 500), BLOCK_COLS[k], 14, 380); }
    }

    /* ---------------- drawing ---------------- */
    standX(e) { const i = this.es.indexOf(e), s = i % 2 ? 1 : -1; return CX + s * (300 + (i >> 1) * 130); }
    drawSky(g, at) {
      const c = this.cam, k = clamp(c / 2600, 0, 1);
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, k < 0.5 ? mixHex('#7cc8ff', '#4a63c9', k * 2) : mixHex('#4a63c9', '#1b1747', (k - 0.5) * 2));
      sky.addColorStop(1, k < 0.5 ? mixHex('#d8f1ff', '#8fb3ff', k * 2) : mixHex('#8fb3ff', '#3a3480', (k - 0.5) * 2));
      g.fillStyle = sky; g.fillRect(-400, 0, W + 800, H);
      g.save(); g.translate(0, c * 0.6);
      g.fillStyle = '#fff'; for (const s of this.stars) { g.globalAlpha = clamp((k - 0.3) * 2, 0, 1) * (0.6 + Math.sin(at * 3 + s.x) * 0.4); g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.restore();
      g.save(); g.translate(0, c * 0.8);
      for (const cl of this.clouds) { g.fillStyle = 'rgba(255,255,255,.85)'; const x = cl.x, y = cl.y, s = cl.s; g.beginPath(); g.ellipse(x, y, 80 * s, 26 * s, 0, 0, TAU); g.ellipse(x + 40 * s, y - 16 * s, 44 * s, 28 * s, 0, 0, TAU); g.ellipse(x - 36 * s, y - 8 * s, 36 * s, 22 * s, 0, 0, TAU); g.fill(); }
      g.restore();
      g.save(); g.translate(0, c);
      g.strokeStyle = '#2b2340'; g.lineWidth = 3; g.lineCap = 'round';
      for (const b of this.birds) { const f = Math.sin(at * 10 + b.ph) * 8; g.beginPath(); g.moveTo(b.x - 14, b.y - f); g.quadraticCurveTo(b.x - 6, b.y - 8, b.x, b.y); g.quadraticCurveTo(b.x + 6, b.y - 8, b.x + 14, b.y - f); g.stroke(); }
      g.restore();
    }
    drawCity(g) {
      const y0 = GROUND + this.cam; if (y0 > H + 400) return;
      g.save(); g.translate(0, this.cam * 0.25);   // far skyline moves slower
      g.fillStyle = '#9cc6e6';
      for (let x = -400, k = 0; x < W + 400; x += 90, k++) { const h = 120 + ((k * 73) % 140); g.fillRect(x, GROUND - h + 20, 80, h); }
      g.restore();
      g.save(); g.translate(0, this.cam);
      g.fillStyle = '#7fb0d6';
      for (let x = -380, k = 0; x < W + 400; x += 130, k++) {
        if (Math.abs(x + 55 - CX) < 260) continue;
        const h = 90 + ((k * 97) % 160); g.fillRect(x, GROUND - h, 110, h);
        g.fillStyle = 'rgba(255,255,255,.4)'; for (let wy = GROUND - h + 16; wy < GROUND - 16; wy += 28) for (let wx = x + 14; wx < x + 100; wx += 26) g.fillRect(wx, wy, 12, 14);
        g.fillStyle = '#7fb0d6';
      }
      // ground: grass + a construction site fence
      g.fillStyle = '#6bbf4e'; g.fillRect(-400, GROUND, W + 800, 400);
      g.fillStyle = '#5aa63f'; g.fillRect(-400, GROUND, W + 800, 10);
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const x = CX + s * (230 + k * 46); g.fillStyle = k % 2 ? '#ff9f1c' : '#fff'; g.fillRect(x - 20, GROUND - 46, 40, 14); g.fillStyle = '#555'; g.fillRect(x - 3, GROUND - 46, 6, 46); }
      g.restore();
    }
    block(g, x, y, w, col, gold, who, at, perfect) {
      // y = top of the block (screen)
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - w / 2 + 6, y + 6, w, FH);
      g.fillStyle = col; g.beginPath(); g.roundRect(x - w / 2, y, w, FH, 8); g.fill();
      g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x - w / 2 + 4, y + 4, w - 8, 8);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x - w / 2, y + FH - 10, w, 10);
      // windows
      const n = Math.max(1, Math.floor((w - 20) / 52));
      for (let k = 0; k < n; k++) {
        const wx = x - (n - 1) * 26 + k * 52;
        g.fillStyle = gold ? '#fff3b0' : '#e8f6ff'; g.beginPath(); g.roundRect(wx - 16, y + 18, 32, 34, 6); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 2; g.stroke();
      }
      if (who && n >= 1) {   // the builder waves from the middle window
        const wx = x - (n - 1) * 26 + Math.floor((n - 1) / 2) * 52;
        g.save(); g.beginPath(); g.roundRect(wx - 16, y + 18, 32, 34, 6); g.clip();
        drawCritter(g, wx, y + 46, 14, who.col, who.animal, { noShadow: true, still: true, happy: perfect, face: Math.PI / 2 });
        g.restore();
      }
      if (gold) { g.font = '22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⭐', x + w / 2 - 18, y + 16); }
    }
    draw(g, clock) {
      const at = clock || this.t, c = this.cam;
      this.drawSky(g, at);
      this.drawCity(g);
      // goal line
      const gy = this.floorY(this.goal) + c;
      if (gy > -20 && gy < H) {
        g.strokeStyle = '#ffb400'; g.lineWidth = 5; g.setLineDash([20, 12]); g.beginPath(); g.moveTo(CX - 420, gy); g.lineTo(CX + 420, gy); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#ffb400'; g.beginPath(); g.roundRect(CX + 430, gy - 22, 150, 44, 22); g.fill();
        g.fillStyle = '#2b2340'; g.font = '900 24px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏁 目標 ' + this.goal + ' 層', CX + 505, gy + 1);
      }
      Fx.ground(g);
      // the tower
      for (let i = 0; i < this.floors.length; i++) {
        const f = this.floors[i], x = f.x + this.swayX(i, at), y = this.floorY(i) + c;
        if (y > H + 20 || y < -FH - 20) continue;
        if (f.base) { g.fillStyle = '#8a7d6b'; g.fillRect(x - f.w / 2, y, f.w, 34); g.fillStyle = '#a89a86'; g.fillRect(x - f.w / 2, y, f.w, 10); g.fillStyle = '#ffcf3f'; for (let k = 0; k < 6; k++) g.fillRect(x - f.w / 2 + 14 + k * 54, y + 16, 26, 10); continue; }
        this.block(g, x, y, f.w, f.col, f.gold, f.who, at, f.perfect);
        if (i % 5 === 0) { g.font = '900 24px ' + RFONT; g.textAlign = 'right'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = '#fff'; g.strokeText(i + 'F', x - f.w / 2 - 12, y + FH / 2); g.fillStyle = '#2b2340'; g.fillText(i + 'F', x - f.w / 2 - 12, y + FH / 2); }
      }
      if (this.phase === 'end' && this.level() >= this.goal) {   // a roof with a flag
        const top = this.top(), x = top.x + this.swayX(this.level(), at), y = this.floorY(this.level()) + c;
        g.fillStyle = '#e8590c'; g.beginPath(); g.moveTo(x - top.w / 2 - 14, y); g.lineTo(x, y - 90); g.lineTo(x + top.w / 2 + 14, y); g.fill();
        g.fillStyle = '#555'; g.fillRect(x - 3, y - 170, 6, 84); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x + 3, y - 170); g.lineTo(x + 70 + Math.sin(at * 8) * 6, y - 150); g.lineTo(x + 3, y - 130); g.fill();
      }
      for (const d of this.debris) { g.save(); g.translate(d.x, d.y + c + FH / 2); g.rotate(d.r); this.block(g, 0, -FH / 2, d.w, d.col, d.gold, null, at); g.restore(); }
      if (this.drop && this.phase === 'fall') { const d = this.drop; g.save(); g.translate(d.x, d.y + c + FH / 2); g.rotate(d.rot); this.block(g, 0, -FH / 2, d.w, d.col, d.gold, null, at); g.restore(); }
      // the crane: a beam across the top, a trolley and a swinging hook with the next block
      g.fillStyle = '#ffb400'; g.fillRect(-400, 128, W + 800, 22);
      g.strokeStyle = '#c98a00'; g.lineWidth = 4; g.beginPath(); for (let x = -400; x < W + 400; x += 44) { g.moveTo(x, 128); g.lineTo(x + 22, 150); g.lineTo(x + 44, 128); } g.stroke();
      if (this.phase === 'swing' || this.phase === 'wait') {
        const hx = this.phase === 'swing' ? this.hookX : this.hookX;
        g.fillStyle = '#555'; g.fillRect(hx - 30, 140, 60, 20);
        g.strokeStyle = '#333'; g.lineWidth = 4; g.beginPath(); g.moveTo(hx, 160); g.lineTo(hx, HOOK_Y + 30); g.stroke();
        if (this.phase === 'swing') {
          const h = this.hang, rot = Math.cos(this.ph) * 0.06;
          g.save(); g.translate(hx, HOOK_Y + 46 + FH / 2); g.rotate(rot); this.block(g, 0, -FH / 2, h.w, h.col, h.gold, null, at); g.restore();
          // a faint guide straight down
          g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.setLineDash([10, 10]); g.beginPath(); g.moveTo(hx, HOOK_Y + 46 + FH); g.lineTo(hx, this.floorY(this.level()) - FH + c); g.stroke(); g.setLineDash([]);
        }
      }
      if (this.wind && this.phase !== 'end') {
        const s = Math.sign(this.wind), x = CX + s * 520, y = 240;
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.roundRect(x - 90, y - 26, 180, 52, 26); g.fill();
        g.fillStyle = '#2b2340'; g.font = '900 24px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText((s < 0 ? '⬅️ ' : '') + '🌬️ 風' + '〰'.repeat(Math.ceil(Math.abs(this.wind) * 3)) + (s > 0 ? ' ➡️' : ''), x, y + 1);
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3;
        for (let k = 0; k < 8; k++) { const ly = 260 + k * 70, lx = ((at * 300 * s + k * 237) % (W + 400) + W + 400) % (W + 400) - 200; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 60 * s, ly); g.stroke(); }
      }
      // the builders at the bottom (fixed on screen)
      const cu = this.cur();
      for (const e of this.es) {
        const x = this.standX(e), me = e === cu && this.phase !== 'end';
        if (me) { g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(x, 868, 54, 14, 0, 0, TAU); g.fill(); g.font = '30px system-ui'; g.textAlign = 'center'; g.fillText('⬇️', x, 760 - e.hop - Math.abs(Math.sin(at * 6)) * 8); }
        drawCritter(g, x, 846, me ? 34 : 28, e.p.col, e.p.animal, { hop: e.hop, happy: e.hop > 0 || this.phase === 'end' && this.ok, stun: e.say > 0, face: -Math.PI / 2, blink: (at + e.p.uid) % 3.5 < 0.12 });
        drawTag(g, x, 886, e.p);
      }
      for (const c2 of this.cheerFx) { const k = c2.t / 1.4; g.globalAlpha = 1 - k; g.font = '30px system-ui'; g.textAlign = 'center'; g.fillText(c2.c, c2.x + Math.sin(c2.t * 6) * 10, c2.y - k * 160); } g.globalAlpha = 1;
      // hearts + height
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(24, 170, 64 + this.lives * 34, 52, 26); g.fill();
      g.font = '28px system-ui'; for (let k = 0; k < this.lives; k++) { g.globalAlpha = k < this.hearts ? 1 : 0.25; g.fillText('❤️', 40 + k * 34, 197); } g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(W - 250, 170, 226, 52, 26); g.fill();
      g.fillStyle = '#2b2340'; g.font = '900 28px ' + RFONT; g.textAlign = 'center'; g.fillText('🏢 ' + this.level() + ' / ' + this.goal + ' 層', W - 137, 197);
    }
    center() { const e = this.cur(); return this.phase === 'end' ? '' : '輪到 ' + e.p.name + ' 放方塊' + (this.combo >= 2 ? '・完美 ×' + this.combo : ''); }
    chip(p) { const e = this.by.get(p); return '🧱 ' + e.floors + (e.perfect ? ' ✨' + e.perfect : ''); }
    pad(p) { const e = this.by.get(p); return '🏢 ' + this.level() + '/' + this.goal + ' 層・❤️ ' + this.hearts; }
    ready(p) { return this.by.get(p) !== this.cur() || this.phase === 'swing'; }
    padLayout(p) {
      if (this.phase === 'end') return { type: 'tap', prompt: '看大螢幕！', btn: { icon: '🎉', label: '耶！' } };
      const e = this.by.get(p), cu = this.cur();
      if (e === cu) return { type: 'tap', prompt: '輪到你了！看準方塊在塔的正上方再按', btn: { icon: '⬇️', label: '放！' } };
      return { type: 'tap', prompt: '輪到 ' + cu.p.name + '，按按鈕幫忙加油！', btn: { icon: '📣', label: '加油！' } };
    }
    results() {
      const n = this.level(), stars = n >= this.goal ? 3 : n >= Math.ceil(this.goal * 2 / 3) ? 2 : n >= Math.ceil(this.goal / 3) ? 1 : 0;
      return {
        team: true, ok: stars > 0, stars,
        title: n >= this.goal ? (this.hearts === this.lives ? '一顆愛心都沒掉！' : '高塔蓋好了！') : stars ? '蓋了 ' + n + ' 層，好高！' : '塔還太矮了…再試一次',
        sub: `大家一起蓋了 ${n} / ${this.goal} 層・完美 ${this.es.reduce((s, e) => s + e.perfect, 0)} 次`,
        rows: this.es.slice().sort((a, b) => (b.perfect * 2 + b.floors) - (a.perfect * 2 + a.floors)).map(e => ({ p: e.p, key: e.perfect * 2 + e.floors, line: `放了 ${e.floors} 層・完美 ${e.perfect} 次` + (e.cheers ? `・加油 ${e.cheers} 次` : '') }))
      };
    }
  }
  function mixHex(a, b, k) {
    const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), m = (s) => Math.round(((A >> s) & 255) + (((B >> s) & 255) - ((A >> s) & 255)) * k);
    return `rgb(${m(16)},${m(8)},${m(0)})`;
  }
  GAMES.push({
    id: 'tower', name: '疊疊高塔', icon: '🏗️', col: COL, bg: '#8fd3ff', kind: 'team', players: '1–6 人',
    blurb: '輪流放下方塊，大家一起蓋最高的塔！',
    btn: { label: '放！', icon: '⬇️' },
    rules: kid => kid
      ? ['吊車會把方塊晃來晃去，輪到你的時候按「放！」', '方塊要疊在塔的上面，歪太多會掉下去、少一顆愛心', '沒輪到的人按「加油！」幫忙', '一起蓋到 12 層就成功！每 5 層有金色方塊，放得完美可以拿回愛心']
      : ['輪流放方塊，凸出去的部分會被切掉，塔會越來越細', '放得完美不會被切，連續 3 次完美塔會變寬', '吊車越晃越快，第 8 層開始有風，看風向提早放', '3 顆愛心，目標 20 層；金色方塊放得完美可以拿回愛心'],
    thumb(g) {
      const sky = g.createLinearGradient(0, 0, 0, 180); sky.addColorStop(0, '#7cc8ff'); sky.addColorStop(1, '#d8f1ff'); g.fillStyle = sky; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#6bbf4e'; g.fillRect(0, 160, 320, 20);
      g.fillStyle = '#ffb400'; g.fillRect(0, 14, 320, 8);
      const B = (x, y, w, c) => { g.fillStyle = c; g.beginPath(); g.roundRect(x - w / 2, y, w, 22, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; for (let k = -1; k <= 1; k++) g.fillRect(x + k * 16 - 5, y + 6, 10, 10); };
      B(160, 138, 90, '#ff6b6b'); B(164, 116, 86, '#4dabf7'); B(158, 94, 84, '#ffd43b'); B(162, 72, 80, '#51cf66');
      g.strokeStyle = '#333'; g.lineWidth = 2; g.beginPath(); g.moveTo(220, 22); g.lineTo(220, 36); g.stroke(); B(220, 36, 78, '#b197fc');
      drawCritter(g, 60, 150, 16, 0, 2, { noShadow: true, still: true, happy: true }); drawCritter(g, 270, 150, 16, 1, 4, { noShadow: true, still: true });
    },
    create: ctx => new Tower(ctx)
  });
})();
