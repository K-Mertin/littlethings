'use strict';
// 曉鐘傳說：地圖上的光源、天氣與粒子
const FieldFx = {
  parts: [], clouds: null, lm: null,
  reset() { this.parts = []; },
  update(dt, f) {
    const sp = window.__speed || 1;
    dt *= sp;
    const p = f.leader(); if (!p) return;
    const k = L.k, T = 16, vw = L.V.w / k, vh = L.V.h / k;
    const cx = (p.x + 0.5) * T, cy = (p.y + 0.5) * T;
    const rand = (a, b) => a + Math.random() * (b - a);
    const add = o => { if (this.parts.length < (Game.lowFx ? 70 : 260)) this.parts.push(o); };
    const th = f.def.theme, world = f.isWorld();
    const snowy = th === 'snow' || th === 'ice' || (world && p.x >= 40 && p.y < 23);
    const sandy = th === 'sand' || th === 'tomb' || (world && p.x >= 40 && p.y >= 23);
    if (snowy && Math.random() < dt * (th === 'ice' ? 14 : 30)) add({ k: 'snow', x: cx + rand(-vw * 0.7, vw * 0.7), y: cy - vh * 0.6, vx: rand(-6, 6), vy: rand(12, 22), life: 9, t: 0, s: Math.random() < 0.3 ? 2 : 1, ph: rand(0, 6) });
    if (sandy && Math.random() < dt * (th === 'tomb' ? 6 : 14)) add({ k: th === 'tomb' ? 'mote' : 'sand', x: cx + rand(-vw * 0.7, vw * 0.3), y: cy + rand(-vh * 0.5, vh * 0.5), vx: th === 'tomb' ? rand(-2, 2) : rand(40, 70), vy: rand(-3, 3), life: th === 'tomb' ? 4 : 2.4, t: 0 });
    if ((th === 'cave' || th === 'mine') && Math.random() < dt * 5) add({ k: 'mote', x: cx + rand(-vw * 0.5, vw * 0.5), y: cy + rand(-vh * 0.5, vh * 0.5), vx: rand(-2, 2), vy: rand(-3, -1), life: 5, t: 0 });
    if (th === 'castle' && Math.random() < dt * 10) add({ k: 'ember', x: cx + rand(-vw * 0.6, vw * 0.6), y: cy + vh * 0.55, vx: rand(-5, 5), vy: rand(-22, -12), life: 6, t: 0, ph: rand(0, 6) });
    if (world && !snowy && !sandy && Math.random() < dt * 3 && !F('nox')) add({ k: 'fly', x: cx + rand(-vw * 0.5, vw * 0.5), y: cy + rand(-vh * 0.5, vh * 0.5), vx: rand(-4, 4), vy: rand(-4, 4), life: 5, t: 0, ph: rand(0, 6) });
    if (th === 'town' || th === 'port') { if (Math.random() < dt * 1.2) add({ k: 'leaf', x: cx + rand(-vw * 0.7, vw * 0.2), y: cy - vh * 0.55, vx: rand(10, 20), vy: rand(8, 14), life: 9, t: 0, ph: rand(0, 6), c: pick(['#e8a040', '#d86a3a', '#f0c050', '#7ac050']) }); }
    for (const b of f.builds) if (b.chimney && b.alpha > 0.5 && Math.random() < dt * 2.2) add({ k: 'smoke', x: b.chimney.x + rand(-1, 1), y: b.chimney.y, vx: rand(2, 5), vy: rand(-9, -6), life: 2.6, t: 0, s: rand(1, 1.6) });
    for (const pr of f.props) if (pr.img === LSpr.cache.lamp && Math.random() < dt * 0.4) add({ k: 'mote', x: pr.x * 16 + 8 + rand(-6, 6), y: pr.y * 16 - 10, vx: rand(-2, 2), vy: rand(-4, -2), life: 2.5, t: 0, c: '#ffe8a0' });
    for (const l of f.lights) if (l.flame && Math.random() < dt * 1.5) add({ k: 'spark', x: l.x + rand(-1, 1), y: l.y - 2, vx: rand(-3, 3), vy: rand(-14, -8), life: 0.8, t: 0 });
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i]; q.t += dt;
      if (q.t > q.life) { this.parts.splice(i, 1); continue; }
      q.x += q.vx * dt + (q.k === 'snow' || q.k === 'leaf' ? Math.sin(q.t * 2 + q.ph) * 8 * dt : 0); q.y += q.vy * dt;
      if (q.k === 'fly') { q.vx += rand(-20, 20) * dt; q.vy += rand(-20, 20) * dt; q.vx = clamp(q.vx, -8, 8); q.vy = clamp(q.vy, -8, 8); }
      if (q.k === 'smoke') { q.s += dt * 1.1; q.vx += dt * 3; }
    }
  },
  drawWorldFx(g, f, sx0, sy0, k, T) {
    // 雲影（大地圖）
    if (f.isWorld()) {
      const t = f.t, V = L.V;
      if (!this.clouds) { const r = seeded(9); this.clouds = Array.from({ length: 9 }, () => ({ x: r() * 1300, y: r() * 900, w: 50 + r() * 70, h: 22 + r() * 22 })); }
      g.fillStyle = 'rgba(10,20,40,.12)';
      for (const c of this.clouds) {
        const x = ((c.x + t * 6) % 1300) - 100, y = c.y - t * 1.5 % 900;
        const X = sx0 + x * k, Y = sy0 + (((y % 900) + 900) % 900 - 60) * k;
        if (X > V.x + V.w + c.w * k || X < V.x - c.w * 2 * k || Y < V.y - c.h * 2 * k || Y > V.y + V.h + c.h * k) continue;
        g.beginPath(); g.ellipse(X, Y, c.w * k, c.h * k, 0, 0, TAU); g.ellipse(X + c.w * 0.6 * k, Y + c.h * 0.3 * k, c.w * 0.6 * k, c.h * 0.7 * k, 0, 0, TAU); g.fill();
      }
    }
    // 星之碎片的閃光
    if (typeof SHARDS !== 'undefined') { const p = f.leader(); for (const s of SHARDS) { if (s[0] !== f.id || F(`s:${s[0]}:${s[1]},${s[2]}`)) continue; if (Math.abs(s[1] - p.x) > 4 || Math.abs(s[2] - p.y) > 4) continue; const ph = (f.t * 0.8 + s[1] * 0.37) % 1; if (ph > 0.35) continue; const a = Math.sin(ph / 0.35 * Math.PI), X = sx0 + (s[1] * 16 + 8) * k, Y = sy0 + (s[2] * 16 + 10) * k; g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,240,180,${a})`; g.fillRect(X - k * 3 * a, Y - k * 0.5, k * 6 * a, k); g.fillRect(X - k * 0.5, Y - k * 3 * a, k, k * 6 * a); g.globalCompositeOperation = 'source-over'; } }
    for (const q of this.parts) {
      const X = sx0 + q.x * k, Y = sy0 + q.y * k, a = Math.min(1, q.t * 3, (q.life - q.t) * 1.5);
      g.globalAlpha = a;
      switch (q.k) {
        case 'snow': g.fillStyle = '#ffffff'; g.fillRect(X, Y, k * q.s, k * q.s); break;
        case 'sand': g.fillStyle = 'rgba(255,236,190,.7)'; g.fillRect(X, Y, k * 4, k * 0.6); break;
        case 'mote': g.fillStyle = q.c || 'rgba(255,240,200,.6)'; g.fillRect(X, Y, k * 0.7, k * 0.7); break;
        case 'ember': g.fillStyle = Math.sin(q.t * 9 + q.ph) > 0 ? '#ff6040' : '#ffb060'; g.fillRect(X, Y, k, k); break;
        case 'fly': g.globalAlpha = a * (0.5 + 0.5 * Math.sin(q.t * 5 + q.ph)); g.fillStyle = '#e8ff90'; g.fillRect(X, Y, k, k); g.globalAlpha *= 0.3; g.fillRect(X - k, Y - k, k * 3, k * 3); break;
        case 'leaf': g.fillStyle = q.c; g.fillRect(X, Y, k * (1 + (Math.sin(q.t * 4 + q.ph) > 0 ? 1 : 0)), k); break;
        case 'smoke': g.globalAlpha = a * 0.3 * (1 - q.t / q.life); g.fillStyle = '#d8d4e4'; g.fillRect(X - q.s * k, Y - q.s * k, q.s * 2 * k, q.s * 2 * k); break;
        case 'spark': g.fillStyle = '#ffd060'; g.fillRect(X, Y, k * 0.8, k * 0.8); break;
      }
    }
    g.globalAlpha = 1;
  },
  glows: {},
  glowSpr(col) {
    if (this.glows[col]) return this.glows[col];
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (this.glows[col] = c);
  },
  flame(g, X, Y, k, t, seed) {
    const f1 = Math.sin(t * 13 + seed) * 0.5 + Math.sin(t * 21 + seed * 2) * 0.5;
    g.fillStyle = '#ff6a20'; g.fillRect(X - 2 * k, Y - (3 + f1) * k, 4 * k, (4 + f1) * k);
    g.fillStyle = '#ffb030'; g.fillRect(X - 1.5 * k, Y - (4 + f1 * 1.2) * k, 3 * k, (4 + f1) * k);
    g.fillStyle = '#fff0a0'; g.fillRect(X - 0.5 * k, Y - (2.5 + f1) * k, k, 2.5 * k);
  },
  drawLights(g, f, sx0, sy0, k, T, amb) {
    const V = L.V, t = f.t;
    // 火焰本體
    const hid = l => l.b !== undefined && f.builds[l.b] && f.builds[l.b].alpha > 0.5;
    for (const l of f.lights) if (l.flame && !hid(l)) { const X = sx0 + l.x * k, Y = sy0 + l.y * k; if (X < V.x - 40 || X > V.x + V.w + 40 || Y < V.y - 40 || Y > V.y + V.h + 40) continue; this.flame(g, X, Y + 2 * k, k * (l.flame < 1 ? 0.5 : 1), t, l.x); }
    const dark = f.def.dark;
    if (dark) {
      const s = 4, w = Math.ceil(V.w / s), h = Math.ceil(V.h / s);
      if (!this.lm || this.lm.width !== w || this.lm.height !== h) { this.lm = document.createElement('canvas'); this.lm.width = w; this.lm.height = h; }
      const lg = this.lm.getContext('2d');
      lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, w, h);
      lg.fillStyle = dark === 2 ? 'rgba(4,2,10,.93)' : 'rgba(6,4,14,.86)'; lg.fillRect(0, 0, w, h);
      lg.globalCompositeOperation = 'destination-out';
      const hole = (X, Y, r, a) => { const x = (X - V.x) / s, y = (Y - V.y) / s, rr = r / s; if (x < -rr || y < -rr || x > w + rr || y > h + rr) return; const gr = lg.createRadialGradient(x, y, rr * 0.15, x, y, rr); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.75})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.fillRect(x - rr, y - rr, rr * 2, rr * 2); };
      const p = f.leader(), lx = sx0 + (lerp(p.fx, p.x, p.t) + 0.5) * T, ly = sy0 + (lerp(p.fy, p.y, p.t) + 0.4) * T;
      hole(lx, ly, T * (dark === 2 ? 4.4 : 5.6) * (1 + Math.sin(t * 3) * 0.015), 1);
      for (const l of f.lights) hole(sx0 + l.x * k, sy0 + l.y * k, l.r * k * 1.5 * (1 + (l.fl ? Math.sin(t * 9 + l.x) * 0.06 * l.fl : 0)), 0.9);
      g.imageSmoothingEnabled = true; g.drawImage(this.lm, V.x, V.y, w * s, h * s); g.imageSmoothingEnabled = false;
    }
    if (Game.lowFx && !dark) return;
    // 光暈（加色）：不會閃爍的光源先烘焙成一張光圖
    g.globalCompositeOperation = 'lighter';
    if (!f.lightLayer) {
      const c = document.createElement('canvas'), W = f.w * 16, H = f.h * 16, s = 4; c.width = Math.ceil(W / s); c.height = Math.ceil(H / s);
      const lg = c.getContext('2d'); let n = 0;
      for (const l of f.lights) { if (l.fl > 0.25 || l.b !== undefined) continue; l.baked = 1; n++; const r = l.r / s; lg.globalAlpha = l.win || l.lamp ? 0.28 : 0.22; lg.drawImage(this.glowSpr(l.col), l.x / s - r, l.y / s - r, r * 2, r * 2); }
      f.lightLayer = { c, s, n, dimOnly: true };
    }
    const LL = f.lightLayer;
    if (LL.n && (dark || amb)) { g.imageSmoothingEnabled = true; g.drawImage(LL.c, sx0, sy0, LL.c.width * LL.s * k, LL.c.height * LL.s * k); g.imageSmoothingEnabled = false; }
    for (const l of f.lights) {
      if (l.baked && (dark || amb)) continue;
      if (!dark && !amb && (l.win || l.lamp)) continue;
      if (hid(l)) continue;
      const X = sx0 + l.x * k, Y = sy0 + l.y * k, r = l.r * k * (1 + (l.fl ? Math.sin(t * 9 + l.x) * 0.05 * l.fl : 0));
      if (X < V.x - r || X > V.x + V.w + r || Y < V.y - r || Y > V.y + V.h + r) continue;
      const a = dark ? 0.32 : amb ? 0.28 : 0.16;
      g.globalAlpha = a; g.drawImage(this.glowSpr(l.col), X - r, Y - r, r * 2, r * 2); g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
  },
};
