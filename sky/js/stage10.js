'use strict';
// 第 10 關「機械要塞」：鑽進巨大要塞內部 — 生產線輸送帶 → 巨型齒輪大廳 → 紅光反應爐區
// 走道兩邊是高牆（牆上有砲台），頭頂有鋼樑快速掠過（視差）
// 新敵人：蜘蛛機兵、牆面砲台、電網無人機（兩台之間有雷射網）；中頭目「核心守衛」；頭目「要塞中樞」

// ================= 地形 =================
const Z10 = v => { const d = -v; const gear = smooth(1200, 1600, d) * (1 - smooth(2800, 3200, d)); return { line: 1 - smooth(1200, 1600, d), gear, core: smooth(2800, 3200, d) }; };
const cx10 = v => 180 + Math.sin(v * 0.0011) * 26;
const hw10 = v => 112 + Math.sin(v * 0.0023 + 1) * 26 + Z10(v).gear * 22;
const wall10 = (x, v) => Math.abs(x - cx10(v)) > hw10(v);
const H10 = (x, v) => {
  const e = Math.abs(x - cx10(v)) - hw10(v);
  let h = smooth(-3, 5, e) * 64;
  if (e > 5) h += Math.floor(hash(Math.floor(x / 20), Math.floor(v / 40), 1001) * 3) * 4;
  return h;
};
const C10 = (x, v, h) => {
  const z = Z10(v), e = Math.abs(x - cx10(v)) - hw10(v);
  const pl = hash(Math.floor(x / 24), Math.floor(v / 24), 1002);
  let c = mixC([64, 70, 80], [86, 92, 102], pl * 0.8 + vnoise(x * 0.05, v * 0.05, 1003) * 0.2);
  c = mixC(c, [88, 74, 70], z.core * 0.6);
  if (e > -2) c = mixC(c, mixC([40, 44, 52], [56, 60, 70], hash(Math.floor(x / 20), Math.floor(v / 40), 1001)), smooth(-2, 4, e));
  return c;
};
function gear(g, x, y, r, teeth, a, col) {
  g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(x + 5, y + 6, r + 3, 0, TAU); g.fill();
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) { const a0 = a + i / (teeth * 2) * TAU, rr2 = i % 2 ? r : r + r * 0.12; g.lineTo(x + Math.cos(a0) * rr2, y + Math.sin(a0) * rr2); g.lineTo(x + Math.cos(a0 + TAU / teeth / 2) * rr2, y + Math.sin(a0 + TAU / teeth / 2) * rr2); }
  g.closePath();
  const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r * 1.1); gr.addColorStop(0, rgb(col, 1.35)); gr.addColorStop(1, rgb(col, 0.6));
  g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = rgb(col, 0.45); g.beginPath(); g.arc(x, y, r * 0.72, 0, TAU); g.fill();
  for (let k = 0; k < 6; k++) { const b = a + k / 6 * TAU; g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(x + Math.cos(b) * r * 0.48, y + Math.sin(b) * r * 0.48, r * 0.13, 0, TAU); g.fill(); }
  const hg = g.createRadialGradient(x - r * 0.1, y - r * 0.1, 1, x, y, r * 0.28); hg.addColorStop(0, '#e0e4e8'); hg.addColorStop(1, '#5a6068');
  g.fillStyle = hg; g.beginPath(); g.arc(x, y, r * 0.26, 0, TAU); g.fill();
  g.fillStyle = '#e0b030'; g.beginPath(); g.arc(x, y, r * 0.08, 0, TAU); g.fill();
}
PAINT.push({ H: H10, C: C10, k: 1.7, d: (g, v0, v1, sp) => {
  // 地板接縫與鉚釘
  cells(24, 24, v0, v1, 0, (i, j, x, v) => {
    if (wall10(x + 12, v + 12)) return;
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.8; g.strokeRect(x + 0.5, v + 0.5, 23, 23);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(x + 1.5, v + 23); g.lineTo(x + 1.5, v + 1.5); g.lineTo(x + 23, v + 1.5); g.stroke();
    if (hash(i, j, 1004) > 0.6) { g.fillStyle = 'rgba(0,0,0,.35)'; for (const [px, py] of [[3, 3], [21, 3], [3, 21], [21, 21]]) g.fillRect(x + px - 0.8, v + py - 0.8, 1.6, 1.6); }
    if (hash(i, j, 1005) > 0.93) { g.fillStyle = '#2a2e34'; g.fillRect(x + 4, v + 4, 16, 16); g.fillStyle = 'rgba(0,0,0,.6)'; for (let k = 0; k < 5; k++) g.fillRect(x + 5, v + 6 + k * 3, 14, 1.4); }
  });
  // 輸送帶（生產線區）
  for (const off of [-56, 56]) {
    const bx = v => cx10(v) + off;
    for (let v = Math.floor(v0 / 10) * 10; v < v1; v += 10) {
      if (Z10(v).line < 0.5) continue;
      const x = bx(v);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 15, v, 34, 10);
      g.fillStyle = '#2a2c30'; g.fillRect(x - 16, v, 32, 10);
      g.fillStyle = '#9aa0a8'; g.fillRect(x - 19, v, 3, 10); g.fillRect(x + 16, v, 3, 10);
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 12, v + 2); g.lineTo(x, v + 7); g.lineTo(x + 12, v + 2); g.stroke();
      if (hash(off, v, 1006) > 0.82) container(g, x - 8, v - 6, 16, 12, pick2(['#c86a2a', '#3a78b0', '#d0b040', '#7a8a90'], v, off));
    }
  }
  // 機械手臂底座
  cells(150, 200, v0, v1, 40, (i, j, x, v) => {
    const cx = x + 40 + hash(i, j, 1007) * 70, cv = v + 40 + hash(i, j, 1008) * 120;
    if (Z10(cv).line < 0.5 || wall10(cx, cv) || Math.abs(Math.abs(cx - cx10(cv)) - 56) < 26) return;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(cx + 3, cv + 4, 10, 0, TAU); g.fill();
    g.fillStyle = '#e0a020'; g.beginPath(); g.arc(cx, cv, 9, 0, TAU); g.fill(); g.fillStyle = '#3a3e44'; g.beginPath(); g.arc(cx, cv, 5, 0, TAU); g.fill();
    const a = hash(i, j, 1009) * TAU; g.strokeStyle = '#e0a020'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, cv); g.lineTo(cx + Math.cos(a) * 22, cv + Math.sin(a) * 22); g.lineTo(cx + Math.cos(a + 1) * 22 + Math.cos(a) * 22, cv + Math.sin(a + 1) * 22 + Math.sin(a) * 22); g.stroke();
  });
  // 齒輪大廳
  cells(180, 230, v0, v1, 140, (i, j, x, v) => {
    const cx = x + 30 + hash(i, j, 1010) * 120, cv = v + 50 + hash(i, j, 1011) * 130, z = Z10(cv);
    if (z.gear < 0.5 || hash(i, j, 1012) < 0.25) return;
    g.save(); g.beginPath(); for (let vv = cv - 120; vv < cv + 120; vv += 6) { const L = cx10(vv) - hw10(vv) + 2; vv === cv - 120 ? g.moveTo(L, vv) : g.lineTo(L, vv); } for (let vv = cv + 120; vv > cv - 120; vv -= 6) g.lineTo(cx10(vv) + hw10(vv) - 2, vv); g.closePath(); g.clip();
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(cx, cv, 62, 0, TAU); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, cx, cv, 70, 'rgba(255,110,30,.25)'); g.restore();
    gear(g, cx, cv, 48, 18, hash(i, j, 1013), [120, 122, 128]);
    gear(g, cx + 58, cv - 40, 24, 10, hash(i, j, 1014), [150, 130, 90]);
    g.restore();
  });
  // 反應爐導管（發光）
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (const [off, col] of [[-40, 'rgba(80,220,255,'], [40, 'rgba(255,120,40,']]) {
    g.beginPath(); let first = true;
    for (let v = v0 - 20; v <= v1 + 20; v += 8) { if (Z10(v).core < 0.4) { first = true; continue; } const x = cx10(v) + off + Math.sin(v * 0.02) * 6; first ? g.moveTo(x, v) : g.lineTo(x, v); first = false; }
    g.strokeStyle = col + '.18)'; g.lineWidth = 14; g.stroke(); g.strokeStyle = col + '.55)'; g.lineWidth = 5; g.stroke(); g.strokeStyle = col + '.95)'; g.lineWidth = 1.6; g.stroke();
  }
  g.restore();
  cells(70, 90, v0, v1, 20, (i, j, x, v) => {
    const cx = x + 35, cv = v + 45; if (Z10(cv).core < 0.5 || wall10(cx, cv) || hash(i, j, 1015) < 0.5) return;
    g.fillStyle = '#1a1414'; g.fillRect(cx - 14, cv - 10, 28, 20);
    g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, cx, cv, 18, 'rgba(255,60,30,.45)'); g.restore();
    g.fillStyle = 'rgba(0,0,0,.7)'; for (let k = 0; k < 6; k++) g.fillRect(cx - 13, cv - 9 + k * 3.4, 26, 1.6);
  });
  // 牆邊警示條、牆上管線
  for (const s of [-1, 1]) {
    for (let v = Math.floor(v0 / 8) * 8; v < v1; v += 8) {
      const ex = cx10(v) + s * hw10(v);
      g.fillStyle = '#d8a820'; g.beginPath(); g.moveTo(ex - s * 2, v); g.lineTo(ex - s * 8, v); g.lineTo(ex - s * 8, v + 4); g.lineTo(ex - s * 2, v + 8); g.fill();
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.moveTo(ex - s * 2, v + 8); g.lineTo(ex - s * 8, v + 4); g.lineTo(ex - s * 8, v + 8); g.fill();
    }
    for (const k of [14, 26]) {
      g.beginPath(); for (let v = v0 - 10; v <= v1 + 10; v += 6) { const x = cx10(v) + s * (hw10(v) + k); v === v0 - 10 ? g.moveTo(x, v) : g.lineTo(x, v); }
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 7; g.stroke(); g.strokeStyle = k === 14 ? '#6a7078' : '#7a5a3a'; g.lineWidth = 5; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1; g.stroke();
    }
    for (let v = Math.floor(v0 / 46) * 46; v < v1; v += 46) {
      const x = cx10(v) + s * (hw10(v) + 20);
      g.fillStyle = '#3a3e44'; g.fillRect(x - 6, v - 2, 12, 5);
      glowDotT(g, cx10(v) + s * (hw10(v) + 38), v + 20, 4, hash(s, v, 1016) > 0.5 ? 'rgba(255,60,40,.95)' : 'rgba(255,200,60,.9)');
    }
  }
  // 牆面砲台
  cells(360, 150, v0, v1, 0, (i, j, x, v) => {
    if (j > -3 || i !== 0) return;
    for (const s of [-1, 1]) {
      if (hash(s, j, 1017) < 0.45) continue;
      const cv = v + 30 + hash(s, j, 1018) * 90; if (cv < v0 || cv >= v1) continue;
      sp.push({ type: 'wallgun', x: cx10(cv) + s * (hw10(cv) + 9), v: cv });
    }
  });
} });
WATER.push(wall10);
ROADX.push(null);

// ================= 環境：頭頂鋼樑（視差）、火花、蒸氣 =================
AMB2.core = {
  update(dt) {
    const A = G.amb;
    while (G.phase === 'fight' && A.filter(p => p.k === 'g').length < 3) { const last = A.filter(p => p.k === 'g').reduce((m, p) => Math.min(m, p.y), H + 200); A.push({ k: 'g', y: Math.min(-60, last - rnd(180, 320)), w: rnd(20, 34), lamp: Math.random() < 0.6 }); }
    if (Math.random() < dt * 3) { const x = rnd(40, W - 40); for (let i = 0; i < 8; i++) A.push({ k: 's', x, y: -5, vx: rnd(-60, 60), vy: rnd(40, 160), life: rnd(0.6, 1.3) }); }
    if (Math.random() < dt * 1.2) A.push({ k: 'v', x: Math.random() < 0.5 ? rnd(10, 60) : rnd(W - 60, W - 10), y: rnd(0, H), r: 6, life: 1.6, t: 0 });
    for (const p of A) {
      if (p.k === 'g') { p.y += G.speed * 1.7 * dt; if (p.y > H + 60) p.dead = true; }
      else if (p.k === 's') { p.vy += 220 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) p.dead = true; }
      else if (p.k === 'v') { p.t += dt; p.y += G.speed * dt; p.r += dt * 20; if (p.t > p.life) p.dead = true; }
    }
    G.amb = A.filter(p => !p.dead);
  },
  under(ctx) {
    for (const p of G.amb) if (p.k === 'v') { ctx.fillStyle = `rgba(220,225,230,${0.22 * (1 - p.t / p.life)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    // 鋼樑的影子
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    for (const p of G.amb) if (p.k === 'g') ctx.fillRect(0, p.y + 22, W, p.w);
  },
  draw(ctx) {
    for (const p of G.amb) if (p.k === 'g') {
      const y = p.y, w = p.w;
      const gr = ctx.createLinearGradient(0, y, 0, y + w); gr.addColorStop(0, '#3a3e46'); gr.addColorStop(0.5, '#23262c'); gr.addColorStop(1, '#121418');
      ctx.globalAlpha = 0.86; ctx.fillStyle = gr; ctx.fillRect(0, y, W, w);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, y, W, 1.5);
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); for (let x = 0; x < W; x += w) { ctx.moveTo(x, y + 2); ctx.lineTo(x + w, y + w - 2); ctx.moveTo(x + w, y + 2); ctx.lineTo(x, y + w - 2); } ctx.stroke();
      ctx.fillStyle = '#d8a820'; for (let x = 0; x < W; x += 24) ctx.fillRect(x, y + w - 3, 12, 3);
      if (p.lamp) for (const lx of [70, W - 70]) glowDot(ctx, lx, y + w / 2, 10 + Math.sin(G.t * 8 + lx) * 2, 'rgba(255,70,40,.75)');
      ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of G.amb) if (p.k === 's') { ctx.strokeStyle = `rgba(255,${180 + p.life * 50 | 0},90,${Math.min(1, p.life)})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); }
    ctx.restore();
    const z = Z10(-G.scroll - H / 2);
    if (z.core > 0.3) { const a = (0.5 + 0.5 * Math.sin(G.t * 3)) * 0.12 * z.core; ctx.fillStyle = `rgba(255,30,20,${a})`; ctx.fillRect(0, 0, W, H); }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },
};

// ================= 敵人 =================
SPR.crawler = { w: 26, h: 26, draw(g) { circ(g, 0, 0, 9, rad(g, -2, -2, 10, ['#b0b6be', '#5a6068', '#2a2e34'])); circ(g, 0, 4, 3, '#ff3040'); } };
SPR.wallgun = { w: 30, h: 30, draw(g) { rr(g, -11, -11, 22, 22, 4, '#4a4e56'); rr(g, -2.5, 0, 5, 16, 1, '#22262c'); } };
SPR.node = { w: 22, h: 22, draw(g) { circ(g, 0, 0, 9, '#3a3e48'); circ(g, 0, 0, 4.5, '#60e8ff'); } };
SPR.guard10 = { w: 80, h: 80, draw(g) { const o = []; for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + TAU / 16; o.push(Math.cos(a) * 32, Math.sin(a) * 32); } P_(g, o, '#3a404c'); circ(g, 0, 0, 12, '#ff6a2a'); } };
SPR.g10arm = { w: 24, h: 56, draw(g) { rr(g, -8, -26, 16, 52, 5, '#5a606c'); } };
Object.assign(ET, {
  crawler: { hp: 9, r: 11, score: 450, ground: true, medal: 0.5, gs: 'crawler',
    init(e) { e.vy = 18; e.ft = rnd(1, 2); e.dir = 0; e.body = 0; },
    update(e, dt) {
      const want = clamp(P.x - e.x, -1, 1) * 38, edge = Math.abs(e.x - cx10(-H - G.scroll + e.y)) > hw10(-H - G.scroll + e.y) - 16;
      e.vx = lerp(e.vx, edge ? (cx10(-H - G.scroll + e.y) - e.x) * 0.8 : want, Math.min(1, dt * 2));
      e.body = turnTo(e.body, Math.atan2(e.vy + G.speed, e.vx) - Math.PI / 2, 4 * dt);
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 2.3; if (canShoot(e)) for (let k = 0; k < 3; k++) G.queue.push({ t: G.st + k * 0.13, fn: () => { if (!e.dead && canShoot(e)) eShot(e.x, e.y, aim(e.x, e.y), 150); } }); }
    },
    draw(ctx, e) {
      ctx.strokeStyle = '#2a2e34'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        const s = k < 3 ? -1 : 1, i = k % 3, ph = e.t * 10 + i * 2 + (s > 0 ? Math.PI : 0), ly = (i - 1) * 7 + Math.sin(ph) * 2.5;
        const kx = e.x + s * 11, ky = e.y + ly, fx = e.x + s * 17, fy = e.y + ly * 1.4 + Math.cos(ph) * 2;
        ctx.beginPath(); ctx.moveTo(e.x + s * 4, e.y + ly * 0.4); ctx.lineTo(kx, ky - 3); ctx.lineTo(fx, fy); ctx.stroke();
      }
      spr(ctx, e, 'crawler', e.body);
      glowDot(ctx, e.x + Math.cos(e.body + Math.PI / 2) * 6, e.y + Math.sin(e.body + Math.PI / 2) * 6, 5, 'rgba(255,50,60,.8)');
    },
  },
  wallgun: { hp: 16, r: 12, score: 600, ground: true, medal: 0.6,
    init(e) { e.side = e.x < 180 ? -1 : 1; e.tur = e.side < 0 ? 0 : Math.PI; e.ft = rnd(0.8, 1.8); },
    update(e, dt) {
      const base = e.side < 0 ? 0 : Math.PI, a = aim(e.x, e.y), rel = clamp(((a - base + Math.PI * 3) % TAU) - Math.PI, -1.2, 1.2);
      e.tur = turnTo(e.tur, base + rel, 2.2 * dt);
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 2.1; if (canShoot(e)) fan(e.x + Math.cos(e.tur) * 14, e.y + Math.sin(e.tur) * 14, e.tur, 3, 0.4, 145); }
    },
    draw(ctx, e) { Art.draw(ctx, 'wallgun', e.x, e.y, e.side < 0 ? -Math.PI / 2 : Math.PI / 2); spr(ctx, e, 'gunTur', e.tur - Math.PI / 2, 1.05, 1.05); },
  },
  node: { hp: 6, r: 10, score: 300, spr: 'node',
    init(e, o) { e.vy = o.vy || 55; e.cx = o.cx; e.s = o.s; e.gap = o.gap || 70; e.ph = o.ph || 0; },
    update(e, dt) {
      e.x = e.cx + e.s * (e.gap + Math.sin(e.t * 1.6 + e.ph) * 40);
      e.ang += dt * 3;
      if (e.s < 0 && e.mate && !e.mate.dead && P.alive && e.y > 10) {
        const m = e.mate, dx = m.x - e.x, dy = m.y - e.y, L2 = dx * dx + dy * dy, t = clamp(((P.x - e.x) * dx + (P.y - e.y) * dy) / L2, 0, 1);
        if (d2(P.x, P.y, e.x + dx * t, e.y + dy * t) < 16) playerHit();
      }
    },
    draw(ctx, e) {
      if (e.s < 0 && e.mate && !e.mate.dead) {
        const m = e.mate, fr = Math.floor(G.t * 30);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        const pts = [[e.x, e.y]]; for (let i = 1; i < 10; i++) { const u = i / 10; pts.push([e.x + (m.x - e.x) * u + (hash(i, fr, 7) - 0.5) * 6, e.y + (m.y - e.y) * u + (hash(fr, i, 7) - 0.5) * 6]); } pts.push([m.x, m.y]);
        for (const [w, c] of [[8, 'rgba(60,180,255,.25)'], [3, 'rgba(120,230,255,.8)'], [1.2, 'rgba(240,255,255,1)']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
        ctx.restore();
      }
      spr(ctx, e, 'node');
      glowDot(ctx, e.x, e.y, 10, 'rgba(100,230,255,.8)');
    },
  },
  guard10: { hp: 420, r: 30, score: 10000, big: 1, drop: ['P', 'S'], hb: [[0, 0, 30]],
    init(e) { e.vy = 60; e.rot = 0; e.ft = 1; e.tb = 3; e.sa = 0; },
    update(e, dt) {
      e.rot += dt * (e.st > 9 ? 1.6 : 0.9);
      if (e.st === undefined) { e.vy = Math.max(14, (140 - e.y) * 1.3); if (e.y >= 136) { e.st = 0; e.x0 = e.x; e.vy = 0; } return; }
      e.st += dt; e.vy = e.st > 17 ? 80 : 0;
      e.x = e.x0 + Math.sin(e.st * 0.6) * 60;
      if (!canShoot(e) || e.st > 17) return;
      const f = dt * G.d.fr;
      e.ft -= f; if (e.ft <= 0) { e.ft = 0.16; e.sa += 0.31; for (let k = 0; k < 4; k++) { const a = e.rot + k * Math.PI / 2; eShot(e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34, a + 0.6, 110); } }
      e.tb -= f; if (e.tb <= 0) { e.tb = 3.4; if (G.d.beams) { G.beams.push({ x: clamp(P.x, 20, W - 20), y: e.y + 30, w: 22, t: 0, warn: 0.9, life: 0.6, col: 'c' }); Snd.play('warn'); } else fan(e.x, e.y + 20, aim(e.x, e.y), 5, 0.6, 140, 'b'); }
    },
    shadow(ctx, e) { Art.shadow(ctx, 'guard10', e.x, e.y, 0, 0.9); },
    draw(ctx, e) {
      for (let k = 0; k < 4; k++) { const a = e.rot + k * Math.PI / 2; Art.draw(ctx, 'g10arm', e.x + Math.cos(a) * 36, e.y + Math.sin(a) * 36, a + Math.PI / 2); glowDot(ctx, e.x + Math.cos(a) * 52, e.y + Math.sin(a) * 52, 6, 'rgba(255,150,60,.8)'); }
      spr(ctx, e, 'guard10', 0);
      const chg = G.beams.some(b => b.t < b.warn);
      glowDot(ctx, e.x, e.y, chg ? 26 + Math.random() * 6 : 18, chg ? 'rgba(140,230,255,.95)' : 'rgba(255,120,50,.8)');
    },
  },
});

// ================= 頭目 10：要塞中樞 =================
SPR.b10 = { w: 340, h: 200, draw(g) { P_(g, [-160, -60, 160, -60, 170, 30, 120, 90, -120, 90, -170, 30], '#3a3e48'); circ(g, 0, 10, 46, '#1a1c22'); } };
SPR.b10ring = { w: 124, h: 124, draw(g) { circ(g, 0, 0, 58, null, '#8a8e96', 8); } };
SPR.b10arm = { w: 44, h: 120, draw(g) { rr(g, -14, -20, 28, 90, 6, '#5a5e68'); rr(g, -6, 60, 12, 30, 3, '#22262c'); } };
SPR.b10shut = { w: 50, h: 90, draw(g) { rr(g, -24, -44, 48, 88, 6, '#4a4e58'); } };
const B10A = [[-112, 6], [112, 6]];
ET.boss10 = { name: '要塞中樞', en: 'FORTRESS HEART', hp: 4200, r: 44, score: 400000, boss: true, layer: 'ground', hb: [[0, 10, 42], [-112, 0, 24], [112, 0, 24], [0, -50, 30]], marks: [0.6, 0.3],
  init(e) { bossBase(e); e.y = -160; e.ph = 1; e.ring = 0; e.arm = [Math.PI / 2, Math.PI / 2]; e.ai = 0; e.open = 0; e.td = 2; e.wall = 0; },
  update(e, dt) {
    e.ring += dt * (e.ph === 1 ? 0.6 : e.ph === 2 ? 1.1 : 1.8);
    e.arm = e.arm.map((a, i) => turnTo(a, aim(e.x + B10A[i][0], e.y + B10A[i][1]), 1.8 * dt));
    if (bossEnter(e, dt, 150, 50)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.3) * 18; e.y = 150 + Math.sin(e.mt * 0.7) * 6;
    const f0 = e.hp / e.maxhp, ph = f0 > 0.6 ? 1 : f0 > 0.3 ? 2 : 3;
    if (ph !== e.ph) {
      e.ph = ph; G.shake = 12; G.eb.length = 0;
      for (let i = 0; i < 6; i++) G.queue.push({ t: G.st + i * 0.1, fn: () => boom(e.x + rnd(-150, 150), e.y + rnd(-50, 50), 1.5, true) });
      popText(e.x, e.y + 90, ph === 2 ? '核心護罩開啟！' : '反應爐過載！', '#ff7a3a');
    }
    e.open = clamp(e.open + (ph >= 2 ? dt : -dt) * 1.2, 0, 1);
    bossSmoke(e); if (ph === 3 && Math.random() < 0.3) fxP({ k: 'f', x: e.x + rnd(-140, 140), y: e.y + rnd(-40, 60), vx: 0, vy: -20, r: rnd(4, 9), life: 0, max: 0.5, g: true });
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    if (ph <= 2) {
      e.ta -= f;
      if (e.ta <= 0) { e.ta = ph === 1 ? 0.95 : 1.4; e.ai ^= 1; const [ox, oy] = B10A[e.ai], a = e.arm[e.ai]; fan(e.x + ox + Math.cos(a) * 56, e.y + oy + Math.sin(a) * 56, a, ph === 1 ? 5 : 3, 0.5, 160); }
    }
    if (ph === 1) {
      e.tb -= f; if (e.tb <= 0) { e.tb = 2.4; const n = 12; for (let i = 0; i < n; i++) { const a = e.ring + i * TAU / n; eShot(e.x + Math.cos(a) * 58, e.y + 10 + Math.sin(a) * 58, a, 92); } Snd.play('eshot'); }
    } else if (ph === 2) {
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.13; e.sa += 0.37; for (const s of [-1, 1]) eShot(e.x, e.y + 10, Math.PI / 2 + Math.sin(e.sa) * 1.1 * s, 140, 'c'); }
      e.td -= f;
      if (e.td <= 0) {
        e.td = 5.2;
        if (G.d.beams) { for (const s of [-1, 1]) G.beams.push({ x: e.x + s * 70, y: e.y + 40, w: 20, t: 0, warn: 1.0, life: 2.4, col: 'c', vx: s * 75 }); Snd.play('warn'); }
        else ring(e.x, e.y + 10, 14, 90, e.mt, 'b');
      }
    } else {
      // 壓力牆：一排排子彈從上面壓下來，只留一個缺口
      e.td -= f;
      if (e.td <= 0) {
        e.td = 1.9; e.wall++;
        const gap = clamp(P.x + rnd(-60, 60), 50, W - 50), gw = G.d.dens < 1 ? 74 : 56;
        for (let x = 10; x < W; x += 20) if (Math.abs(x - gap) > gw / 2) eShot2(x, e.y - 40, Math.PI / 2, 95, 'c', { keep: 1 });
        Snd.play('eshot');
      }
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.11; e.sa += 0.29; for (let k = 0; k < 5; k++) eShot(e.x, e.y + 10, e.sa + k * TAU / 5, 80); }
    }
  },
  draw(ctx, e) {
    const x = e.x, y = e.y, ph = e.ph || 1;
    Art.draw(ctx, 'b10', x + 6, y + 9, 0, 0.35, 1, 1, 's');
    Art.draw(ctx, 'b10', x, y);
    bFlash(ctx, 'b10', e);
    // 核心
    const pulse = 0.5 + 0.5 * Math.sin(e.t * (ph === 3 ? 14 : 5));
    glowDot(ctx, x, y + 10, 40 + e.open * 20, ph === 3 ? `rgba(255,60,40,${0.5 + pulse * 0.4})` : `rgba(90,220,255,${0.35 + pulse * 0.4 * e.open})`);
    glowDot(ctx, x, y + 10, 16 + e.open * 8, `rgba(255,255,255,${0.4 + e.open * 0.5})`);
    for (const s of [-1, 1]) { Art.draw(ctx, 'b10shut', x + s * (24 + e.open * 30), y + 10); }
    Art.draw(ctx, 'b10ring', x, y + 10, e.ring);
    for (let i = 0; i < 6; i++) { const a = e.ring + i * TAU / 6; glowDot(ctx, x + Math.cos(a) * 58, y + 10 + Math.sin(a) * 58, 5, ph === 1 ? 'rgba(255,200,80,.9)' : 'rgba(120,230,255,.9)'); }
    B10A.forEach(([ox, oy], i) => {
      const a = e.arm[i] - Math.PI / 2, ax = x + ox, ay = y + oy;
      Art.draw(ctx, 'b10arm', ax, ay, a, ph === 3 ? 0.75 : 1);
      if (ph < 3 && e.ai === i && e.ta > 0.8) glowDot(ctx, ax + Math.cos(e.arm[i]) * 58, ay + Math.sin(e.arm[i]) * 58, 14, 'rgba(255,200,90,.9)');
    });
    if (ph === 3) for (const [ox, oy] of B10A) if (Math.random() < 0.5) fxP({ k: 's', x: x + ox + rnd(-10, 10), y: y + oy, vx: rnd(-10, 10), vy: -30, r: rnd(4, 7), life: 0, max: 0.9, a: 0.4, g: true });
  },
};
ET.boss10.onDeath = e => bossDown(e);

// ================= 3D 模型 =================
Object.assign(EXTRA_MODELS, {
  crawler(K) {
    const AR = K.M(0x8a9098, { m: 0.8, r: 0.3, cc: 0.7 }), DK = K.M(0x22262c, { m: 0.9, r: 0.4 }), YL = K.M(0xe0a820, { m: 0.3, r: 0.4, cc: 0.6 });
    K.ext([-7, -9, 7, -9, 10, -2, 8, 9, -8, 9, -10, -2], 4, AR, 1, 1);
    K.ext([-5, -7, 5, -7, 6, 0, -6, 0], 1.2, YL, 5, 0.3);
    K.sph(4.5, 3, 4, 0, 5, 5, DK);
    for (const s of [-1, 1]) K.sph(1.2, 0.8, 1.2, s * 2.2, 7.6, 7, K.G(0xff3040, 3));
    K.cyl(1, 1, 6, 0, 6, 10, DK);
  },
  wallgun(K) {
    const ST = K.M(0x5a606a, { m: 0.8, r: 0.35, cc: 0.5 }), DK = K.M(0x20242a, { m: 0.9, r: 0.4 }), YL = K.M(0xe0b030, { m: 0.2, r: 0.45, panel: false });
    K.rbox(26, 22, 6, 0, 0, 0, ST, 1.6);
    K.rbox(20, 4, 0.6, 0, 9, 6, YL, 0.2);
    for (const s of [-1, 1]) K.cylV(2, 2, 2, s * 9, 6, -6, DK);
    K.sph(1, 0.6, 1, 0, 6.6, -8, K.G(0xff3040, 2.6));
  },
  node(K) {
    const ST = K.M(0x3a404c, { m: 0.85, r: 0.3, cc: 0.8 });
    K.latheV([[0.01, -2], [9, -1], [9.5, 1], [7, 3.5], [0.01, 4.2]], ST);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; K.bar(Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * 11, Math.sin(a) * 11, 1, 2.2, 1.6, ST); }
    K.sph(4, 3, 4, 0, 3, 0, K.G(0x60e8ff, 3));
  },
  guard10(K) {
    const AR = K.M(0x2a2e38, { m: 0.85, r: 0.32, cc: 0.8 }), AR2 = K.M(0x40465a, { m: 0.8, r: 0.3, cc: 0.8 }), DK = K.M(0x14161c, { m: 0.9, r: 0.4 }), YL = K.M(0xe0b030, { m: 0.2, r: 0.45, panel: false });
    K.ext(K.oct(32, 32, 12), 8, AR, 0, 2);
    K.ext(K.oct(24, 24, 9), 3, AR2, 8, 1);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; K.box(5, 0.4, 2, Math.cos(a) * 28, 8.3, Math.sin(a) * 28, i % 2 ? YL : DK).rotation.y = -a; }
    K.cylV(12, 13, 2, 0, 11, 0, DK);
    K.torus(13, 1, 0, 13, 0, K.G(0xff8a3a, 2.4));
  },
  g10arm(K) {
    const AR = K.M(0x5a6070, { m: 0.8, r: 0.3, cc: 0.8 }), DK = K.M(0x1a1c22, { m: 0.9, r: 0.4 });
    K.ext([-8, -24, 8, -24, 10, 16, 0, 27, -10, 16], 5, AR, 2, 1.2);
    K.bar(0, -20, 0, 18, 7.4, 2, 0.6, K.G(0xff9a3a, 2.4));
    K.cylV(4, 4, 2, 0, 5, -18, DK);
  },
  b10(K) {
    const AR = K.M(0x23262e, { m: 0.85, r: 0.34, cc: 0.7 }), AR2 = K.M(0x3a2c2a, { m: 0.8, r: 0.34, cc: 0.7 }), DK = K.M(0x0e1014, { m: 0.9, r: 0.4 });
    const YL = K.M(0xe0b030, { m: 0.2, r: 0.45, panel: false }), BK = K.M(0x1a1916, { m: 0.3, r: 0.6, panel: false }), OR = K.G(0xff7a2a, 2.4), CY = K.G(0x50e0ff, 2.4), ST = K.M(0x8a9098, { m: 0.9, r: 0.28 });
    K.ext([-160, -66, 160, -66, 172, -40, 172, 34, 128, 92, -128, 92, -172, 34, -172, -40], 14, AR, 0, 3);
    K.ext([-140, -56, 140, -56, 150, -36, 150, 26, 112, 78, -112, 78, -150, 26, -150, -36], 4, AR2, 14, 1.4);
    // 中央核心井
    K.cylV(52, 54, 4, 0, 16, 10, DK);
    K.cylV(40, 40, 1, 0, 19.5, 10, K.M(0x0a0c10, { m: 0.2, r: 0.5, panel: false }));
    // 上方排氣塔
    for (const s of [-1, 0, 1]) { K.rbox(26, 30, 12, s * 46, -40, 18, DK, 2); for (let k = 0; k < 4; k++) K.box(22, 0.6, 1.2, s * 46, 30.4, -50 + k * 6, ST); }
    // 兩側手臂基座
    for (const s of [-1, 1]) { K.cylV(26, 28, 6, s * 112, 16, 6, DK); K.torus(24, 1.2, s * 112, 22.4, 6, YL); }
    // 能量導管
    for (const s of [-1, 1]) { K.bar(s * 56, 10, s * 86, 10, 20, 3, 1.6, CY); K.bar(s * 40, 60, s * 120, 60, 18.6, 2.4, 1, OR); }
    kStripes(K, -120, 86, 120, 86, 14.6, 4, 20, YL, BK);
    for (let i = 0; i < 6; i++) K.sph(1.6, 1, 1.6, -125 + i * 50, 18.4, -60, K.G(i % 2 ? 0xff3030 : 0xffc040, 2.6));
  },
  b10ring(K) {
    const RG = K.M(0x5a5450, { m: 0.9, r: 0.3, cc: 0.6 }), DK = K.M(0x22262c, { m: 0.9, r: 0.4 });
    const geo = new K.T.TorusGeometry(58, 5, 10, 64); geo.rotateX(Math.PI / 2); K.add(geo, K.pv(RG, 'lathe'), 0, 24, 0);
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; K.box(8, 5, 6, Math.cos(a) * 63, 24, Math.sin(a) * 63, i % 4 ? RG : DK).rotation.y = -a; }
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; K.cylV(5, 5, 3, Math.cos(a) * 58, 26, Math.sin(a) * 58, DK); }
  },
  b10arm(K) {
    const AR = K.M(0x3a2e2c, { m: 0.85, r: 0.32, cc: 0.7 }), DK = K.M(0x121418, { m: 0.9, r: 0.4 }), ST = K.M(0x7a8088, { m: 0.9, r: 0.28 });
    K.cylV(15, 16, 6, 0, 24, 0, AR);
    K.rbox(22, 50, 9, 0, 28, 26, AR, 2);
    for (const s of [-1, 1]) { K.cyl(3.4, 3.4, 40, s * 6, 34, 52, ST); K.cyl(4.6, 4.6, 6, s * 6, 34, 72, DK); }
    K.bar(0, 6, 0, 46, 35.6, 4, 0.6, K.G(0xff8a3a, 2.4));
    K.cylV(6, 6, 1, 0, 30, 0, K.G(0xffd060, 2.6));
  },
  b10shut(K) {
    const AR = K.M(0x2c3038, { m: 0.85, r: 0.32, cc: 0.7 }), YL = K.M(0xe0b030, { m: 0.2, r: 0.45, panel: false }), BK = K.M(0x1a1916, { m: 0.3, r: 0.6, panel: false });
    K.ext([-18, -44, 18, -44, 24, -30, 24, 30, 18, 44, -18, 44, -24, 30, -24, -30], 5, AR, 20, 1.2);
    kStripes(K, 20, -40, 20, 40, 25.4, 3, 8, YL, BK); kStripes(K, -20, -40, -20, 40, 25.4, 3, 8, YL, BK);
  },
});
EXTRA_BAKES.push(
  ['crawler', 26, 26, EXTRA_MODELS.crawler, { rot: Math.PI }],
  ['wallgun', 30, 30, EXTRA_MODELS.wallgun],
  ['node', 22, 22, EXTRA_MODELS.node, { glow: 0.9 }],
  ['guard10', 80, 80, EXTRA_MODELS.guard10, { glow: 0.8 }],
  ['g10arm', 24, 56, EXTRA_MODELS.g10arm, { glow: 0.8 }],
  ['b10', 350, 200, EXTRA_MODELS.b10, { glow: 0.8 }],
  ['b10ring', 140, 140, EXTRA_MODELS.b10ring],
  ['b10arm', 44, 156, EXTRA_MODELS.b10arm, { glow: 0.8 }],
  ['b10shut', 50, 90, EXTRA_MODELS.b10shut],
);

// ================= 波次、關卡、音樂 =================
Object.assign(WAVES, {
  crawlers: q => { for (let i = 0; i < 3; i++) q(i * 0.6, () => { const x = groundX(rnd(80, 280), 'land'); if (x !== null) spawn('crawler', x, -24); }); return 3; },
  fence: q => {
    const mk = (cx, gap, ph) => { const a = spawn('node', cx, -20, { cx, s: -1, gap, ph }), b = spawn('node', cx, -20, { cx, s: 1, gap, ph }); a.mate = b; b.mate = a; };
    q(0, () => mk(180, 60, 0)); q(1.6, () => mk(180, 40, Math.PI));
    return 4;
  },
  fenceX: q => {
    const mk = (cx, gap, ph) => { const a = spawn('node', cx, -20, { cx, s: -1, gap, ph, vy: 70 }), b = spawn('node', cx, -20, { cx, s: 1, gap, ph, vy: 70 }); a.mate = b; b.mate = a; };
    q(0, () => mk(110, 30, 0)); q(0.8, () => mk(250, 30, 1.5)); q(1.6, () => mk(180, 50, 3));
    return 4;
  },
  guard10: q => { q(0, () => spawn('guard10', 180, -60)); return 10; },
});
STAGES.push({ name: '機械要塞', en: 'FORTRESS CORE', boss: 'boss10', amb: 'core', speed: 50, bossSong: 'bossX',
  under: ctx => AMB2.core.under(ctx),
  seq: ['fDown', 'crawlers', 'fence', 'carrierP', 'icpt', 'crates', 'fSwoopL', 'fSwoopR', 'crawlers', 'droneW', 'fenceX', 'carrierS', 'snakeL', 'heavy', 'crawlers', 'jetsUp', 'carrierP', 'fence', 'guard10', 'mines', 'icpt', 'crates', 'fenceX', 'crawlers', 'carrierB', 'fDive', 'droneW'] });
Object.assign(SONGS, {
  s9: { bpm: 158, key: 40, prog: [[0, 'm'], [0, 'm'], [-2, 'M'], [-4, 'M'], [0, 'm'], [0, 'm'], [3, 'M'], [1, 'M']], seed: 211, drums: 3, lead: 'square', bass: 'sawtooth', arp: [0, 0, 12, 0, 7, 0, 12, 3] },
});
