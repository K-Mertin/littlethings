'use strict';
// 曉鐘傳說：戰鬥特效（粒子、刀光、法術、畫面震動與閃光）
const BFX = {
  effs: [], parts: [], u: 4,
  reset() { this.effs = []; this.parts = []; },
  busy() { return this.effs.length > 0; },
  P(o) { if (this.parts.length < (Game.lowFx ? 300 : 900)) this.parts.push(Object.assign({ t: 0, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, size: 1, size2: null, add: true, shape: 'sq', rot: 0, vr: 0 }, o)); },
  E(dur, draw, back) { this.effs.push({ t: 0, dur, draw, back }); return dur; },
  update(dt) {
    for (const e of this.effs) e.t += dt;
    this.effs = this.effs.filter(e => e.t < e.dur);
    for (const p of this.parts) {
      p.t += dt; p.vx += p.ax * dt; p.vy += p.ay * dt;
      if (p.drag) { p.vx *= Math.pow(1 - p.drag, dt * 60); p.vy *= Math.pow(1 - p.drag, dt * 60); }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter(p => p.t < p.life);
  },
  draw(g, back) {
    for (const e of this.effs) if (!!e.back === back) { g.save(); e.draw(g, clamp(e.t / e.dur, 0, 1), e.t); g.restore(); }
    if (back) return;
    for (const p of this.parts) {
      const k = p.t / p.life, a = p.fade === false ? 1 : Math.min(1, (1 - k) * 2.2, p.t * 12 + 0.2);
      const sz = (p.size2 !== null ? lerp(p.size, p.size2, k) : p.size) * this.u;
      g.globalAlpha = a * (p.alpha || 1);
      g.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      g.fillStyle = p.col2 ? mix(p.col, p.col2, k) : p.col;
      if (p.shape === 'circle') { g.beginPath(); g.arc(p.x, p.y, sz, 0, TAU); g.fill(); }
      else if (p.shape === 'shard') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath(); g.moveTo(0, -sz * 1.6); g.lineTo(sz * 0.5, 0); g.lineTo(0, sz * 1.6); g.lineTo(-sz * 0.5, 0); g.closePath(); g.fill(); g.restore(); }
      else if (p.shape === 'star') { g.fillRect(p.x - sz * 1.5, p.y - sz * 0.3, sz * 3, sz * 0.6); g.fillRect(p.x - sz * 0.3, p.y - sz * 1.5, sz * 0.6, sz * 3); }
      else if (p.shape === 'text') { g.globalCompositeOperation = 'source-over'; UI.text(g, p.txt, p.x, p.y, p.col, sz * 3, 'center', 'middle', 900); }
      else if (p.shape === 'arrow') { g.beginPath(); g.moveTo(p.x, p.y + (p.dir || -1) * sz * 1.4); g.lineTo(p.x + sz, p.y); g.lineTo(p.x - sz, p.y); g.fill(); g.fillRect(p.x - sz * 0.4, p.y - (p.dir || -1) * sz * 1.2 * 0 + (p.dir || -1) * -sz * 1.2 + (p.dir > 0 ? 0 : 0), sz * 0.8, sz * 1.2); }
      else g.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  },
  // ───── 工具 ─────
  burst(x, y, n, col, o = {}) {
    for (let i = 0; i < n; i++) { const a = (o.a0 ?? 0) + Math.random() * (o.spread ?? TAU), sp = (o.sp || 60) * (0.4 + Math.random()) * this.u / 4; this.P({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (o.vy || 0), ay: o.grav ? o.grav * this.u : 0, drag: o.drag ?? 0.06, life: (o.life || 0.5) * (0.6 + Math.random() * 0.6), size: o.size || 1, size2: o.size2 ?? 0.2, col: Array.isArray(col) ? pick(col) : col, col2: o.col2, shape: o.shape || 'sq', add: o.add ?? true, vr: o.vr || 0, rot: Math.random() * TAU }); }
  },
  ring(x, y, r0, r1, col, dur, w = 1, back = false) {
    return this.E(dur, (g, k) => { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k; g.strokeStyle = col; g.lineWidth = Math.max(1, w * this.u * (1 - k * 0.6)); g.beginPath(); g.ellipse(x, y, lerp(r0, r1, k), lerp(r0, r1, k) * 0.35, 0, 0, TAU); g.stroke(); }, back);
  },
  glow(x, y, r, col, dur, a = 0.8) {
    return this.E(dur, (g, k) => { g.globalCompositeOperation = 'lighter'; const rr = r * (0.6 + k * 0.6); const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${col},${a * (1 - k)})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); });
  },
  bolt(g, x0, y0, x1, y1, seed, w, col) {
    const r = seeded(seed), n = 9; let px = x0, py = y0;
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, py);
    for (let i = 1; i <= n; i++) { const t = i / n; const nx = lerp(x0, x1, t) + (i < n ? (r() - 0.5) * Math.abs(y1 - y0) * 0.25 : 0), ny = lerp(y0, y1, t); g.lineTo(nx, ny); if (r() < 0.25 && i < n - 1) { g.moveTo(nx, ny); g.lineTo(nx + (r() - 0.5) * 40, ny + 25); g.moveTo(nx, ny); } px = nx; py = ny; }
    g.stroke();
  },
  // ───── 各種特效（p 為目標位置 {x,y,w,h}；回傳持續秒數） ─────
  play(kind, p, o = {}) {
    const u = this.u, S = BScene;
    switch (kind) {
      case 'slash': case 'crit': {
        const n = kind === 'crit' ? 2 : 1, col = kind === 'crit' ? '255,230,120' : '255,255,255';
        for (let i = 0; i < n; i++) {
          const a0 = i ? -0.6 : -2.5, a1 = i ? 1.3 : -0.4, r = Math.max(p.w, p.h) * 0.42, cx = p.x + (i ? -1 : 1) * r * 0.25, cy = p.y + (i ? r * 0.1 : -r * 0.1);
          this.E(0.32, (g, k) => {
            const kk = Math.min(1, k * 2.2), e = lerp(a0, a1, kk), s = lerp(a0, a1, Math.max(0, kk - 0.45));
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - Math.max(0, k - 0.5) * 2;
            for (let j = 0; j < 3; j++) { g.strokeStyle = `rgba(${col},${0.35 + j * 0.3})`; g.lineWidth = u * (3.2 - j); g.beginPath(); g.arc(cx, cy, r - j * u * 0.6, s, e, a1 < a0); g.stroke(); }
          });
        }
        this.burst(p.x, p.y, kind === 'crit' ? 26 : 12, kind === 'crit' ? ['#fff4a0', '#ffd040', '#ffffff'] : ['#ffffff', '#fff4c0'], { sp: 110, life: 0.4, size: 1.2 });
        this.glow(p.x, p.y, p.w * 0.6, '255,250,220', 0.25);
        if (kind === 'crit') { S.flash('255,240,180', 0.5); S.zoom = 0.06; S.shake = 0.35; this.P({ x: p.x, y: p.y - p.h * 0.55, vy: -20 * u / 4, life: 0.9, size: 2.1, col: '#ffe060', shape: 'text', txt: '會心一擊！', fade: true }); }
        return kind === 'crit' ? 0.45 : 0.3;
      }
      case 'smash': {
        this.E(0.3, (g, k) => { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k; g.strokeStyle = '#fff8e0'; g.lineWidth = u * 4 * (1 - k); g.beginPath(); g.moveTo(p.x + p.w * 0.25, p.y - p.h * 0.5); g.lineTo(p.x - p.w * 0.2 + 0, lerp(p.y - p.h * 0.5, p.y + p.h * 0.35, Math.min(1, k * 3))); g.stroke(); });
        this.ring(p.x, p.y + p.h * 0.35, u * 2, p.w * 0.7, '#ffe8b0', 0.4, 2);
        this.burst(p.x, p.y + p.h * 0.3, 18, ['#d8c8a0', '#a89070'], { sp: 90, life: 0.6, add: false, grav: 40, a0: Math.PI, spread: Math.PI, size: 1.4 });
        S.shake = 0.25;
        return 0.4;
      }
      case 'whirl': {
        this.E(0.5, (g, k) => { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k; g.strokeStyle = '#ffffff'; g.lineWidth = u * 2; const r = Math.max(p.w, p.h) * 0.45; for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(p.x, p.y, r, r * 0.45, 0, k * 14 + i * Math.PI, k * 14 + i * Math.PI + 1.6); g.stroke(); } });
        this.burst(p.x, p.y, 10, '#ffffff', { sp: 100, life: 0.4 });
        return 0.5;
      }
      case 'claw': {
        this.E(0.3, (g, k) => { g.globalAlpha = 1 - Math.max(0, k - 0.5) * 2; g.strokeStyle = '#ff4a4a'; g.lineWidth = u * 1.6; g.lineCap = 'round'; for (let i = -1; i <= 1; i++) { const kk = Math.min(1, k * 3.5 - (i + 1) * 0.25); if (kk <= 0) continue; const x0 = p.x - p.w * 0.25 + i * u * 4, y0 = p.y - p.h * 0.35; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + p.w * 0.4 * kk, y0 + p.h * 0.6 * kk); g.stroke(); } });
        this.burst(p.x, p.y, 10, ['#ff6a5a', '#ffd0c0'], { sp: 90, life: 0.35 });
        return 0.3;
      }
      case 'fire': case 'fireP': {
        const big = o.big;
        const go = () => {
          for (let i = 0; i < (big ? 40 : 28); i++) this.P({ x: p.x + (Math.random() - 0.5) * p.w * 0.6, y: p.y + p.h * 0.35 - Math.random() * p.h * 0.2, vx: (Math.random() - 0.5) * 20 * u / 4, vy: -(60 + Math.random() * 110) * u / 4, drag: 0.03, life: 0.5 + Math.random() * 0.5, size: 2.2 + Math.random() * 1.6, size2: 0.3, col: pick(['#ffe070', '#ffb030', '#ff6a20']), col2: '#a02010', shape: 'circle' });
          this.glow(p.x, p.y, p.w * 0.9, '255,140,40', 0.55, 0.9);
          this.burst(p.x, p.y, 12, ['#ffd060', '#ff8a30'], { sp: 140, life: 0.4, size: 1.2 });
        };
        if (o.src) return this.missile(o.src, p, '#ff8a30', 'fire', go) + 0.5;
        go(); return 0.65;
      }
      case 'ice': case 'iceP': {
        const n = 7, r = Math.max(p.w, p.h) * 0.55;
        this.E(0.7, (g, k) => {
          const kk = Math.min(1, k * 2.4);
          for (let i = 0; i < n; i++) {
            const a = i / n * TAU + 0.3, d = r * (1 - kk) + p.w * 0.12, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.7, z = u * (2.2 + (i % 3));
            if (k > 0.55) continue;
            g.globalAlpha = 1; g.fillStyle = i % 2 ? '#d8f4ff' : '#ffffff'; g.strokeStyle = '#3a8ad8'; g.lineWidth = Math.max(1, u * 0.4);
            g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.beginPath(); g.moveTo(0, -z * 1.6); g.lineTo(z * 0.45, 0); g.lineTo(0, z * 1.6); g.lineTo(-z * 0.45, 0); g.closePath(); g.fill(); g.stroke(); g.restore();
          }
          if (k > 0.5 && k < 0.6) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(200,240,255,.6)'; g.beginPath(); g.arc(p.x, p.y, p.w * 0.5, 0, TAU); g.fill(); }
        });
        setTimeout(() => { this.burst(p.x, p.y, 22, ['#ffffff', '#c8f0ff', '#8ad0ff'], { sp: 150, life: 0.6, shape: 'shard', size: 1.2, size2: 0.4, vr: 8, add: false, grav: 60 }); this.burst(p.x, p.y, 10, 'rgba(220,245,255,.5)', { sp: 30, life: 0.8, shape: 'circle', size: 3, size2: 6, add: false }); }, 380 / (window.__speed || 1));
        return 0.75;
      }
      case 'bolt': case 'boltP': {
        const top = S.stage.y;
        this.E(0.5, (g, k, t) => { if (Math.floor(t * 30) % 3 === 2) return; g.globalCompositeOperation = 'lighter'; const sd = Math.floor(t * 20) + p.x | 0; this.bolt(g, p.x + (seeded(sd)() - 0.5) * p.w * 0.6, top, p.x, p.y + p.h * 0.2, sd, u * 2.4, 'rgba(255,250,190,.9)'); this.bolt(g, p.x + (seeded(sd)() - 0.5) * p.w * 0.6, top, p.x, p.y + p.h * 0.2, sd, u * 0.9, '#ffffff'); });
        this.glow(p.x, p.y, p.w * 1.1, '255,250,180', 0.5, 0.9);
        setTimeout(() => this.burst(p.x, p.y + p.h * 0.2, 16, ['#fff8a0', '#ffffff'], { sp: 160, life: 0.35, size: 1 }), 100);
        S.flash('255,250,200', 0.35); S.shake = Math.max(S.shake, 0.2);
        return 0.55;
      }
      case 'holy': {
        this.E(0.8, (g, k) => { g.globalCompositeOperation = 'lighter'; const a = Math.sin(k * Math.PI), w = p.w * 0.35 * (0.6 + a * 0.6); const gr = g.createLinearGradient(p.x - w, 0, p.x + w, 0); gr.addColorStop(0, 'rgba(255,240,160,0)'); gr.addColorStop(0.5, `rgba(255,255,230,${0.9 * a})`); gr.addColorStop(1, 'rgba(255,240,160,0)'); g.fillStyle = gr; g.fillRect(p.x - w, S.stage.y, w * 2, p.y + p.h * 0.5 - S.stage.y); g.globalAlpha = a; g.fillStyle = '#fffbe0'; const c = u * 1.2, L = p.h * 0.35 * a; g.fillRect(p.x - c, p.y - L, c * 2, L * 2); g.fillRect(p.x - L * 0.7, p.y - L * 0.35 - c, L * 1.4, c * 2); });
        for (let i = 0; i < 18; i++) this.P({ x: p.x + (Math.random() - 0.5) * p.w * 0.8, y: p.y + p.h * 0.4, vy: -(40 + Math.random() * 80) * u / 4, life: 0.8 + Math.random() * 0.4, size: 1, col: '#fffbe0', shape: 'star' });
        return 0.8;
      }
      case 'meteor': {
        const n = 7;
        for (let i = 0; i < n; i++) {
          const delay = i * 0.09, tx = p.x + (Math.random() - 0.5) * p.w * 1.6, ty = p.y + (Math.random() - 0.2) * p.h * 0.5;
          const sx = tx - S.stage.w * 0.35, sy = S.stage.y - u * 10;
          this.E(0.45 + delay, (g, k, t) => { const kk = (t - delay) / 0.45; if (kk < 0 || kk > 1) return; const x = lerp(sx, tx, kk), y = lerp(sy, ty, kk); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(x, y, x - (tx - sx) * 0.25, y - (ty - sy) * 0.25); gr.addColorStop(0, 'rgba(255,220,120,.95)'); gr.addColorStop(1, 'rgba(255,90,30,0)'); g.strokeStyle = gr; g.lineWidth = u * 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - (tx - sx) * 0.25, y - (ty - sy) * 0.25); g.stroke(); g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(x, y, u * 2, 0, TAU); g.fill(); });
          setTimeout(() => { this.burst(tx, ty, 20, ['#ffe070', '#ff8a30', '#ff4a20'], { sp: 160, life: 0.55, shape: 'circle', size: 2, size2: 0.2 }); this.glow(tx, ty, p.w * 0.6, '255,150,60', 0.4); S.shake = 0.3; }, (0.45 + delay) * 1000 / (window.__speed || 1));
        }
        S.flash('255,140,60', 0.25);
        return 1.1;
      }
      case 'heal': case 'healE': {
        this.ring(p.x, p.y + p.h * 0.4, u * 2, p.w * 0.55, '#7dffb0', 0.6, 1.2, true);
        for (let i = 0; i < 16; i++) this.P({ x: p.x + (Math.random() - 0.5) * p.w * 0.7, y: p.y + p.h * 0.4 - Math.random() * p.h * 0.3, vy: -(30 + Math.random() * 50) * u / 4, life: 0.7 + Math.random() * 0.4, size: 1.1, col: pick(['#b0ffd0', '#7dffb0', '#ffffff']), shape: i % 3 ? 'star' : 'sq' });
        this.glow(p.x, p.y, p.w * 0.7, '120,255,170', 0.5, 0.5);
        return 0.6;
      }
      case 'buff': case 'buffE': case 'debuff': {
        const up = kind !== 'debuff', col = kind === 'debuff' ? '#8ab0ff' : '#ffd76a';
        this.ring(p.x, p.y + p.h * 0.4, p.w * 0.2, p.w * 0.6, col, 0.55, 1.4, true);
        for (let i = 0; i < 4; i++) this.P({ x: p.x + (i - 1.5) * p.w * 0.22, y: up ? p.y + p.h * 0.2 : p.y - p.h * 0.4, vy: (up ? -1 : 1) * 50 * u / 4, life: 0.6, size: 1.6, col, shape: 'arrow', dir: up ? -1 : 1, add: false });
        return 0.55;
      }
      case 'sleep': case 'sleepP': {
        for (let i = 0; i < 8; i++) this.P({ x: p.x + (Math.random() - 0.5) * p.w * 0.6, y: p.y, vx: (Math.random() - 0.5) * 20, vy: -20 * u / 4, life: 0.8, size: 2.5, size2: 5, col: '#ffb0e0', shape: 'circle', add: false, alpha: 0.35 });
        for (let i = 0; i < 3; i++) this.P({ x: p.x + i * u * 3, y: p.y - p.h * 0.2 - i * u * 2, vy: -24 * u / 4, life: 0.8, size: 1 + i * 0.3, col: '#cfe6ff', shape: 'text', txt: 'z' });
        return 0.6;
      }
      case 'seal': case 'sealP': {
        this.E(0.6, (g, k) => { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.sin(k * Math.PI); g.strokeStyle = '#c08aff'; g.lineWidth = u * 0.8; const r = p.w * 0.45; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.stroke(); g.beginPath(); g.arc(p.x, p.y, r * 0.7, 0, TAU); g.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + k * 3; g.fillStyle = '#e0c0ff'; g.fillRect(p.x + Math.cos(a) * r * 0.85 - u, p.y + Math.sin(a) * r * 0.85 - u, u * 2, u * 2); } });
        return 0.6;
      }
      case 'poison': {
        for (let i = 0; i < 12; i++) this.P({ x: p.x + (Math.random() - 0.5) * p.w * 0.6, y: p.y + p.h * 0.3, vx: (Math.random() - 0.5) * 10, vy: -(20 + Math.random() * 40) * u / 4, life: 0.7, size: 1.4, size2: 2, col: pick(['#b070e0', '#8ad060']), shape: 'circle', add: false, alpha: 0.8 });
        return 0.5;
      }
      case 'dark': case 'darkP': {
        this.E(0.7, (g, k) => { g.globalAlpha = Math.sin(k * Math.PI) * 0.85; const r = p.w * 0.6 * (1.2 - k * 0.6); const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); gr.addColorStop(0, 'rgba(20,0,30,.95)'); gr.addColorStop(0.6, 'rgba(80,20,110,.6)'); gr.addColorStop(1, 'rgba(80,20,110,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill(); });
        for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, d = p.w * 0.8; this.P({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.6, vx: -Math.cos(a) * d * 1.6, vy: -Math.sin(a) * d, life: 0.55, size: 1.4, col: pick(['#a050e0', '#5a1a8a', '#ff4a8a']), add: true }); }
        return 0.7;
      }
      case 'roar': {
        for (let i = 0; i < 3; i++) setTimeout(() => this.ring(p.x, p.y, u * 4, S.stage.w * 0.7, 'rgba(255,255,255,.8)', 0.6, 2.5), i * 120);
        S.shake = 0.6;
        return 0.6;
      }
      case 'appear': {
        this.burst(p.x, p.y, 14, ['#ffffff', '#c8d8ff'], { sp: 80, life: 0.5, shape: 'star' });
        return 0.3;
      }
    }
    return 0.4;
  },
  // 投射物（火球等）
  missile(src, p, col, kind, then) {
    const dur = 0.28;
    this.E(dur, (g, k) => {
      const x = lerp(src.x, p.x, k), y = lerp(src.y, p.y, k) - Math.sin(k * Math.PI) * p.h * 0.25;
      g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(x, y, 0, x, y, this.u * 5); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.4, 'rgba(255,140,40,.9)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
      g.fillStyle = gr; g.fillRect(x - this.u * 5, y - this.u * 5, this.u * 10, this.u * 10);
      if (Math.random() < 0.8) this.P({ x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 0.3, size: 1.4, size2: 0.2, col: pick(['#ffd060', '#ff7a30']), shape: 'circle' });
    });
    setTimeout(then, dur * 1000 / (window.__speed || 1));
    return dur;
  },
  // 吐息：從怪物噴向隊伍
  breath(src, targets, el) {
    const cols = { fire: ['#ffe070', '#ff8a30', '#ff4a20'], ice: ['#ffffff', '#c8f0ff', '#8ad0ff'], wind: ['#e8fff4', '#b8ffe0', '#ffffff'], poison: ['#b070e0', '#8ad060', '#d0a0ff'], sand: ['#f0d090', '#d8b070', '#fff0c0'], dark: ['#5a1a8a', '#a050e0', '#1a0a2a'] }[el] || ['#ffffff'];
    const dur = 0.85, add = el !== 'dark' && el !== 'sand';
    this.E(dur, () => {
      for (let i = 0; i < 4; i++) {
        const t = pick(targets); if (!t) continue;
        const sp = 1 / (0.35 + Math.random() * 0.2);
        this.P({ x: src.x + (Math.random() - 0.5) * this.u * 4, y: src.y + (Math.random() - 0.5) * this.u * 4, vx: (t.x - src.x) * sp + (Math.random() - 0.5) * 60, vy: (t.y - src.y) * sp + (Math.random() - 0.5) * 60, life: 1 / sp * 1.1, size: 1.5 + Math.random() * 2, size2: 4, col: pick(cols), shape: 'circle', add, alpha: add ? 0.8 : 0.7 });
      }
    });
    return dur;
  },
};
