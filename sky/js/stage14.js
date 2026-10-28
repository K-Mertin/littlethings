'use strict';
// 第 13 關 B 路線「叢林神殿」：雨林與瀑布 → 古代神殿群 → 聖湖祭壇
// 新敵人：符文圖騰（兩根之間會拉出光柵，要打掉一根或趁熄滅時穿過）、石像鬼（石化時很硬，張開翅膀才打得動）、符文砲台
// 中頭目「浮空石首」；頭目「玄武神像」（石龜＋大蛇，蛇會離開龜殼在畫面上游動）

// ================= 地形 =================
const Z14 = v => { const d = -v; const ruin = smooth(1200, 1600, d) * (1 - smooth(2800, 3200, d)); return { jungle: 1 - smooth(1200, 1600, d), ruin, lake: smooth(2800, 3200, d) }; };
const rivX14 = v => 180 + Math.sin(v * 0.0024 + 0.6) * 92 + Math.sin(v * 0.0061) * 26;
const rivW14 = v => { const z = Z14(v); return (30 + Math.sin(v * 0.005) * 8) * (1 - z.ruin * 0.5) * (1 - z.lake); };
const CLIFF14 = 380;
const cliffV14 = j => j * CLIFF14 + 120;
const wob14 = (x, j) => Math.sin(x * 0.035 + j * 1.7) * 8 + (vnoise(x * 0.05, j * 3, 1430) - 0.5) * 12;
const templeAt14 = j => (j < -2 && hash(j, 1, 1401) > 0.25) ? { x: 70 + hash(j, 2, 1401) * 220, v: j * 420 + 210, R: 46 + hash(j, 3, 1401) * 14 } : null;
function temple14(x, v) {
  if (Z14(v).ruin < 0.3 && Z14(v).lake < 0.3) return null;
  const j = Math.floor(v / 420);
  for (const jj of [j - 1, j, j + 1]) { const T = templeAt14(jj); if (T && Math.abs(x - T.x) < T.R + 4 && Math.abs(v - T.v) < T.R + 4) return T; }
  return null;
}
const lake14 = (x, v) => { const z = Z14(v); if (z.lake < 0.4) return false; const cx = 180 + Math.sin(v * 0.004) * 30, r = 120 + Math.sin(v * 0.011) * 20; return Math.abs(x - cx) < r * z.lake && !isle14(x, v); };
const isle14 = (x, v) => { const j = Math.floor(v / 260); const ix = 180 + (hash(j, 7, 1402) - 0.5) * 120, iv = j * 260 + 130; return Math.hypot(x - ix, (v - iv) * 1.2) < 34; };
const water14 = (x, v) => (rivW14(v) > 4 && Math.abs(x - rivX14(v)) < rivW14(v) / 2) || lake14(x, v);
const H14 = (x, v) => {
  const z = Z14(v), T = temple14(x, v);
  if (T) { const d = Math.max(Math.abs(x - T.x), Math.abs(v - T.v)); if (d < T.R) return 56 - Math.floor(d / (T.R / 4.5)) * 11; }
  if (water14(x, v)) return -8;
  let h = fbm(x * 0.012, v * 0.012, 1403) * 22 + Math.pow(ridge(x * 0.05, v * 0.05, 1404), 2) * 9 * (z.jungle + z.ruin * 0.6);
  // 斷崖台地：越往前一階越高，河流在斷崖形成瀑布（崖邊彎彎曲曲）
  let j = Math.floor((v - 120) / CLIFF14); if (v < cliffV14(j) + wob14(x, j)) j--;
  return h - j * 16 * z.jungle;
};
const C14 = (x, v, h, s) => {
  const z = Z14(v), T = temple14(x, v);
  if (T && Math.max(Math.abs(x - T.x), Math.abs(v - T.v)) < T.R) { const m = vnoise(x * 0.09, v * 0.09, 1405); return mixC(mixC([120, 124, 110], [150, 150, 132], fbm(x * 0.04, v * 0.04, 1406)), [70, 110, 60], smooth(0.55, 0.8, m) * 0.7); }
  if (lake14(x, v)) return mixC([30, 120, 120], [60, 170, 160], fbm(x * 0.02, v * 0.02, 1407));
  if (water14(x, v)) return mixC([40, 92, 80], [70, 130, 110], fbm(x * 0.03, v * 0.03, 1408));
  let c = mixC([26, 70, 30], [62, 110, 40], fbm(x * 0.02, v * 0.02, 1409));
  c = mixC(c, [100, 130, 50], smooth(0.62, 0.8, vnoise(x * 0.03, v * 0.03, 1410)) * 0.5);
  c = mixC(c, [90, 80, 60], z.ruin * 0.25 * smooth(0.5, 0.7, fbm(x * 0.03, v * 0.03, 1411)));
  if (isle14(x, v) && z.lake > 0.4) c = [130, 132, 116];
  return mixC(c, [150, 150, 120], clamp((s - 0.7) * 1.5, 0, 0.6));
};
const JTREE14 = [[30, 84, 34], [46, 104, 36], [24, 70, 40], [60, 112, 44], [38, 96, 50]];
PAINT.push({ H: H14, C: C14, k: 1.6, d: (g, v0, v1, sp) => {
  grain(g, v0, v1, 1412, 0.06);
  // 河面波紋與岸邊泡沫
  cells(12, 12, v0, v1, 0, (i, j, x, v) => {
    if (!water14(x + 6, v + 6) || hash(i, j, 1413) < 0.82) return;
    g.strokeStyle = 'rgba(220,255,240,.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, v + 6); g.quadraticCurveTo(x + 6, v + 3, x + 12, v + 6); g.stroke();
  });
  // 瀑布：河流跨過斷崖的地方
  for (let jj = Math.floor((v0 - 120) / CLIFF14) - 1; jj <= Math.floor((v1 - 120) / CLIFF14) + 1; jj++) {
    const cv = cliffV14(jj); if (cv < v0 - 40 || cv > v1 + 40 || Z14(cv).jungle < 0.3) continue;
    const rx = rivX14(cv), rw = rivW14(cv);
    // 斷崖邊的岩壁陰影（沿著彎曲的崖邊）
    g.fillStyle = 'rgba(20,30,10,.35)'; g.beginPath(); g.moveTo(0, cv + wob14(0, jj));
    for (let x = 0; x <= W; x += 6) g.lineTo(x, cv + wob14(x, jj)); for (let x = W; x >= 0; x -= 6) g.lineTo(x, cv + wob14(x, jj) + 5); g.fill();
    const cvr = cv + wob14(rivX14(cv), jj);
    if (rw > 4) {
      for (let k = 0; k < 14; k++) { const xx = rx - rw / 2 + hash(k, jj, 1414) * rw; g.strokeStyle = `rgba(240,255,255,${0.5 + hash(jj, k, 1415) * 0.4})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(xx, cvr - 2); g.lineTo(xx + (hash(k, k, jj) - 0.5) * 3, cvr + 12 + hash(k, jj, 1416) * 8); g.stroke(); }
      g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, rx, cvr + 16, rw * 0.9, 'rgba(220,255,255,.35)'); g.restore();
      for (let k = 0; k < 10; k++) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(rx + (hash(k, jj, 1417) - 0.5) * rw * 1.2, cvr + 14 + hash(jj, k, 1417) * 12, 1.5 + hash(k, k, 1418) * 3, 0, TAU); g.fill(); }
    }
  }
  // 雨林樹冠
  cells(22, 22, v0, v1, 14, (i, j, x, v) => {
    const z = Z14(v + 11), dens = z.jungle * 0.85 + z.ruin * 0.45 + z.lake * 0.3;
    if (hash(i, j, 1419) > dens) return;
    const tx = x + hash(i, j, 1420) * 22, tv = v + hash(j, i, 1420) * 22;
    if (water14(tx, tv) || water14(tx + 8, tv) || water14(tx - 8, tv) || temple14(tx, tv)) return;
    const r = 6 + hash(i, j, 1421) * 8, fl = hash(i, j, 1422);
    tree2(g, tx, tv, r, fl > 0.94 ? [180, 70, 110] : fl > 0.9 ? [200, 140, 40] : pick2(JTREE14, i, j));
    if (r > 11) tree2(g, tx - r * 0.3, tv - r * 0.35, r * 0.5, [80, 140, 50]);
  });
  // 神殿：階梯、苔蘚、頂上的發光祭壇
  for (let jj = Math.floor((v0 - 80) / 420); jj <= Math.floor((v1 + 80) / 420); jj++) {
    const T = templeAt14(jj); if (!T || (Z14(T.v).ruin < 0.3 && Z14(T.v).lake < 0.3) || T.v < v0 - 90 || T.v > v1 + 90) continue;
    for (let k = 1; k <= 4; k++) { const r = T.R - k * T.R / 4.5; g.strokeStyle = 'rgba(40,40,30,.4)'; g.lineWidth = 1; g.strokeRect(T.x - r, T.v - r, r * 2, r * 2); g.strokeStyle = 'rgba(230,225,200,.25)'; g.strokeRect(T.x - r + 1, T.v - r + 1, r * 2, r * 2); }
    // 樓梯（朝下方）
    g.fillStyle = 'rgba(200,196,170,.55)'; g.fillRect(T.x - 7, T.v, 14, T.R);
    g.strokeStyle = 'rgba(60,60,40,.5)'; g.lineWidth = 0.7; for (let y = T.v + 2; y < T.v + T.R; y += 3) { g.beginPath(); g.moveTo(T.x - 7, y); g.lineTo(T.x + 7, y); g.stroke(); }
    // 藤蔓
    for (let k = 0; k < 10; k++) { const a = hash(k, jj, 1423) * TAU, d = T.R * (0.5 + hash(jj, k, 1423) * 0.5); tree2(g, T.x + Math.cos(a) * d, T.v + Math.sin(a) * d, 3 + hash(k, k, jj) * 3, [50, 110, 40]); }
    g.save(); g.globalCompositeOperation = 'lighter';
    glowDotT(g, T.x, T.v, 22, 'rgba(90,255,180,.35)');
    g.strokeStyle = 'rgba(120,255,200,.85)'; g.lineWidth = 1; g.beginPath(); g.arc(T.x, T.v, 9, 0, TAU); g.stroke();
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6; g.beginPath(); g.moveTo(T.x + Math.cos(a) * 9, T.v + Math.sin(a) * 9); g.lineTo(T.x + Math.cos(a) * 14, T.v + Math.sin(a) * 14); g.stroke(); }
    g.restore();
    if (T.v >= v0 && T.v < v1) sp.push({ type: 'runeTur', x: T.x, v: T.v });
  }
  // 石板步道與地上的符文圈
  cells(120, 160, v0, v1, 30, (i, j, x, v) => {
    const z = Z14(v); if (z.ruin < 0.4 || hash(i, j, 1424) < 0.6) return;
    const cx = x + 30 + hash(i, j, 1425) * 60, cv = v + 30 + hash(j, i, 1425) * 100;
    if (water14(cx, cv) || temple14(cx, cv)) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(90,255,190,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cv, 14, 0, TAU); g.stroke(); g.beginPath(); g.arc(cx, cv, 9, 0, TAU); g.stroke();
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; g.fillStyle = 'rgba(150,255,210,.7)'; g.fillRect(cx + Math.cos(a) * 11.5 - 1, cv + Math.sin(a) * 11.5 - 1, 2, 2); }
    g.restore();
  });
  // 聖湖：石柱與蓮花
  cells(30, 30, v0, v1, 10, (i, j, x, v) => {
    const cx = x + 15, cv = v + 15; if (!lake14(cx, cv) || hash(i, j, 1426) < 0.8) return;
    g.fillStyle = 'rgba(30,90,40,.8)'; g.beginPath(); g.arc(cx, cv, 3.4, 0, TAU); g.fill();
    g.fillStyle = hash(i, j, 1427) > 0.5 ? '#ffc0d8' : '#fff0f4'; g.beginPath(); g.arc(cx + 1, cv - 1, 1.6, 0, TAU); g.fill();
  });
  cells(260, 260, v0, v1, 40, (i, j, x, v) => {
    if (i !== 0) return;
    const ix = 180 + (hash(j, 7, 1402) - 0.5) * 120, iv = j * 260 + 130; if (Z14(iv).lake < 0.4 || iv < v0 - 40 || iv > v1 + 40) return;
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6, px = ix + Math.cos(a) * 24, pv = iv + Math.sin(a) * 20; shadowed(g, sh => { g.fillStyle = sh ? 'rgba(0,0,0,.3)' : '#b8b4a0'; g.beginPath(); g.arc(px, pv, 4, 0, TAU); g.fill(); }); }
    g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, ix, iv, 18, 'rgba(120,255,220,.4)'); g.restore();
  });
} });
WATER.push(water14);
ROADX.push(null);

// ================= 環境：螢火蟲與薄霧 =================
AMB2.jungle = {
  update(dt) {
    const A = G.amb;
    while (A.length < 40) A.push({ x: rnd(W), y: rnd(-20, H), ph: rnd(TAU), vx: rnd(-12, 12), vy: rnd(-6, 10), mist: A.length < 6, r: rnd(60, 110) });
    for (const p of A) { p.ph += dt * (p.mist ? 0.3 : 2.4); p.x += (p.vx + Math.sin(p.ph) * (p.mist ? 4 : 16)) * dt; p.y += (p.vy + G.speed * (p.mist ? 0.9 : 0.5)) * dt; if (p.y > H + (p.mist ? 120 : 10)) { p.y = p.mist ? -110 : -10; p.x = rnd(W); } }
  },
  draw(ctx) {
    ctx.save();
    for (const p of G.amb) if (p.mist) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, 'rgba(220,240,230,.13)'); g.addColorStop(1, 'rgba(220,240,230,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of G.amb) if (!p.mist) { const f = 0.5 + 0.5 * Math.sin(p.ph * 2); glowDot(ctx, p.x, p.y, 4 + f * 3, `rgba(210,255,120,${0.25 + f * 0.5})`); }
    ctx.restore();
  },
};

// ================= 敵人 =================
SPR.totem = { w: 26, h: 26, draw(g) { rr(g, -10, -10, 20, 20, 4, '#8a8a72'); circ(g, 0, 0, 5, '#70ffc0'); } };
SPR.garg = { w: 44, h: 34, draw(g) { P_(g, [0, -14, 8, -4, 22, -10, 18, 8, 6, 6, 0, 14, -6, 6, -18, 8, -22, -10, -8, -4], '#7a7a6a'); } };
SPR.runeTur = { w: 26, h: 26, draw(g) { circ(g, 0, 0, 11, '#9a9884'); circ(g, 0, 0, 5, '#60ffb0'); } };
SPR.idol = { w: 110, h: 120, draw(g) { rr(g, -48, -54, 96, 108, 26, '#8a8670'); circ(g, -18, -6, 9, '#2a2a20'); circ(g, 18, -6, 9, '#2a2a20'); rr(g, -22, 24, 44, 12, 5, '#3a3a2a'); } };
EB_SPR.rune = 'ebRune';
SPR.ebRune = { w: 14, h: 14, draw(g) { circ(g, 0, 0, 6.5, rad(g, 0, 0, 6.5, ['rgba(80,255,180,.6)', 'rgba(40,255,160,0)'])); P_(g, [0, -4.6, 4.6, 0, 0, 4.6, -4.6, 0], 'rgba(0,30,20,.9)'); P_(g, [0, -3.4, 3.4, 0, 0, 3.4, -3.4, 0], lin(g, 0, -3, 0, 3, ['#ffffff', '#a0ffd8', '#20c890'])); } };
// 石像鬼石化時只吃 15% 傷害
hurt = (function (base) { return function (e, d) { base(e, e.armor ? d * e.armor : d); }; })(hurt);
Object.assign(ET, {
  // 符文圖騰：成對出現，中間的光柵開開關關，掃到會被打下
  totem: { hp: 16, r: 12, score: 700, ground: true, medal: 0.8, gs: 'pad',
    init(e, o) { e.mate = null; e.lead = !!o.lead; e.cyc = 0; e.ft = rnd(1, 2); e.sa = rnd(TAU); },
    update(e, dt) {
      const easy = G.d.dens < 1, ON = easy ? 1.0 : 1.6, WARN = 0.7, OFF = easy ? 1.9 : 1.2, L = ON + WARN + OFF;
      e.cyc = (e.cyc + dt) % L;
      e.fence = e.cyc < WARN ? 'warn' : e.cyc < WARN + ON ? 'on' : 'off';
      const m = e.mate;
      if (e.lead && m && !m.dead && e.fence === 'on' && P.alive && !P.auto) {
        const x0 = Math.min(e.x, m.x) + 10, x1 = Math.max(e.x, m.x) - 10;
        if (P.x > x0 && P.x < x1 && Math.abs(P.y - e.y) < 6) playerHit();
      }
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 2.8; if (canShoot(e)) { for (let k = 0; k < 4; k++) eShot(e.x, e.y, e.sa + k * Math.PI / 2, 85, 'rune'); e.sa += 0.4; Snd.play('eshot'); } }
    },
    draw(ctx, e) {
      const m = e.mate;
      if (e.lead && m && !m.dead && e.fence !== 'off') {
        const on = e.fence === 'on';
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        const flick = on ? 1 : (Math.floor(G.t * 16) % 2 ? 0.6 : 0.15);
        ctx.strokeStyle = `rgba(60,255,170,${0.25 * flick})`; ctx.lineWidth = on ? 14 : 4; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(m.x, m.y); ctx.stroke();
        if (on) {
          ctx.strokeStyle = 'rgba(160,255,220,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x, e.y);
          const n = 18; for (let i = 1; i <= n; i++) { const u = i / n; ctx.lineTo(lerp(e.x, m.x, u), lerp(e.y, m.y, u) + (i < n ? Math.sin(G.t * 40 + i * 2.3) * 3 : 0)); }
          ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(m.x, m.y); ctx.stroke();
        } else { ctx.setLineDash([6, 6]); ctx.strokeStyle = `rgba(120,255,200,${flick})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(m.x, m.y); ctx.stroke(); ctx.setLineDash([]); }
        ctx.restore();
      }
      Art.draw(ctx, 'pad', e.x, e.y);
      spr(ctx, e, 'totem', 0);
      glowDot(ctx, e.x, e.y - 2, 9 + Math.sin(G.t * 6) * 2, e.fence === 'on' ? 'rgba(140,255,210,.95)' : 'rgba(80,200,150,.6)');
    },
    onDeath(e) { const m = e.mate; if (m && !m.dead) { for (let i = 0; i < 8; i++) { const u = i / 7; fxP({ k: 'k', x: lerp(e.x, m.x, u), y: lerp(e.y, m.y, u), vx: rnd(-60, 60), vy: rnd(-60, 60), life: 0, max: 0.35, c: 'g' }); } m.mate = null; } },
  },
  // 石像鬼：石化（很硬）→ 張開翅膀俯衝開火（打得動）→ 再石化
  garg: { hp: 9, r: 13, score: 650, spr: 'garg',
    init(e, o) { e.vy = 80; e.stop = o.stop || rnd(100, 200); e.cyc = rnd(0, 0.5); e.open = 0; e.armor = 0.15; },
    update(e, dt) {
      if (e.st === undefined) { e.vy = Math.max(20, (e.stop - e.y) * 2.4); if (e.y >= e.stop - 3) { e.st = 0; e.vy = 0; } return; }
      e.st += dt; e.cyc += dt;
      const c = e.cyc % 3.2, opening = c > 1.4;
      e.open = clamp(e.open + (opening ? dt * 4 : -dt * 3), 0, 1);
      e.armor = e.open > 0.5 ? 0 : 0.15;
      if (opening) { e.vx = clamp((P.x - e.x) * 1.6, -90, 90); e.vy = 26; if (!e.fired && c > 1.9) { e.fired = true; if (canShoot(e)) fan(e.x, e.y + 10, aim(e.x, e.y), 5, 0.7, 150); } }
      else { e.vx *= 0.9; e.vy = e.st > 9 ? 70 : -8; e.fired = false; }
    },
    draw(ctx, e) {
      const o = e.open;
      if (o > 0.05) glowDot(ctx, e.x, e.y, 26 * o, `rgba(255,80,60,${0.25 * o})`);
      Art.draw(ctx, 'garg', e.x, e.y, 0, 1, 0.7 + o * 0.45, 1);
      if (e.flash > 0) Art.draw(ctx, 'garg', e.x, e.y, 0, 0.45, 0.7 + o * 0.45, 1, 'w');
      for (const s of [-1, 1]) glowDot(ctx, e.x + s * 4, e.y + 7, 3 + o * 3, o > 0.5 ? 'rgba(255,60,40,1)' : 'rgba(255,200,120,.35)');
      if (e.armor && e.flash > 0) { ctx.strokeStyle = 'rgba(220,220,200,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(e.x, e.y, 17, 0, TAU); ctx.stroke(); }
    },
  },
  // 神殿頂的符文砲台：三條旋轉的光彈臂
  runeTur: { hp: 16, r: 13, score: 650, ground: true, medal: 0.7, gs: 'pad',
    init(e) { e.ft = rnd(0.5, 1.2); e.sa = rnd(TAU); },
    update(e, dt) {
      e.sa += dt * 1.3;
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = G.d.dens >= 1 ? 0.45 : 0.7; if (canShoot(e)) for (let k = 0; k < 3; k++) eShot(e.x, e.y, e.sa + k * TAU / 3, 95, 'rune'); }
    },
    draw(ctx, e) { Art.draw(ctx, 'pad', e.x, e.y); spr(ctx, e, 'runeTur', e.sa); glowDot(ctx, e.x, e.y, 9, 'rgba(120,255,200,.8)'); },
  },
  // 中頭目：浮空石首（眼睛射光束、嘴巴吐石彈、四周的玉環會轉）
  idol: { hp: 540, r: 42, score: 14000, big: 1, drop: ['P', 'S'], hb: [[0, 0, 46]],
    init(e) { e.vy = 50; e.ft = 1.4; e.tb = 3; e.tc = 2; e.sa = 0; e.eye = 0; },
    update(e, dt) {
      if (e.st === undefined) { e.vy = Math.max(12, (150 - e.y) * 1.2); if (e.y >= 146) { e.st = 0; e.x0 = e.x; e.vy = 0; } return; }
      e.st += dt; e.vy = e.st > 18 ? 60 : 0;
      e.x = e.x0 + Math.sin(e.st * 0.45) * 58; e.eye = Math.max(0, e.eye - dt);
      if (!canShoot(e) || e.st > 18) return;
      const f = dt * G.d.fr;
      e.ft -= f; if (e.ft <= 0) { e.ft = 0.16; e.sa += 0.31; for (let k = 0; k < 2; k++) eShot(e.x + Math.cos(e.sa + k * Math.PI) * 60, e.y + Math.sin(e.sa + k * Math.PI) * 60, e.sa + k * Math.PI + Math.PI / 2, 70, 'rune'); }
      e.tb -= f;
      if (e.tb <= 0) { e.tb = 3.6; e.eye = 1.2; if (G.d.beams) { for (const s of [-1, 1]) G.beams.push({ x: e.x + s * 18, y: e.y, w: 14, t: 0, warn: 0.8, life: 1.2, col: 'g', vx: s * 55 }); Snd.play('warn'); } else ring(e.x, e.y, 12, 90, e.st, 'rune'); }
      e.tc -= f; if (e.tc <= 0) { e.tc = 2.3; fan(e.x, e.y + 34, aim(e.x, e.y + 34), 5, 0.6, 140, 'b'); }
    },
    shadow(ctx, e) { Art.shadow(ctx, 'idol', e.x, e.y, 0, 0.9); },
    draw(ctx, e) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(100,255,190,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, 60, 0, TAU); ctx.stroke(); ctx.restore();
      for (let k = 0; k < 6; k++) { const a = e.sa * 0.4 + k * TAU / 6; Art.draw(ctx, 'runeTur', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, a, 1, 0.6, 0.6); }
      spr(ctx, e, 'idol', Math.sin(e.t * 0.8) * 0.05);
      for (const s of [-1, 1]) glowDot(ctx, e.x + s * 18, e.y - 6, 8 + e.eye * 10, `rgba(120,255,200,${0.5 + e.eye * 0.4})`);
    },
  },
});

// ================= 頭目：玄武神像 =================
SPR.x14shell = { w: 200, h: 230, draw(g) { g.fillStyle = '#5a6a50'; g.beginPath(); g.ellipse(0, 0, 90, 100, 0, 0, TAU); g.fill(); circ(g, 0, 96, 22, '#6a6a58'); } };
SPR.x14shellc = SPR.x14shell;
SPR.x14head = { w: 40, h: 46, draw(g) { g.fillStyle = '#2a6a50'; g.beginPath(); g.ellipse(0, 0, 14, 20, 0, 0, TAU); g.fill(); } };
SPR.x14seg = { w: 30, h: 30, draw(g) { circ(g, 0, 0, 12, '#2a5a44'); } };
const X14RUNE = [[0, -66], [56, -34], [56, 30], [0, 62], [-56, 30], [-56, -34]];
ET.boss14 = { name: '玄武神像', en: 'BLACK TORTOISE', hp: 5800, r: 60, score: 650000, boss: true, layer: 'ground', hb: [[0, -6, 72], [0, 98, 24]], marks: [0.66, 0.33],
  init(e) { bossBase(e); e.y = -200; e.ph = 1; e.ri = 0; e.sx = 0; e.sy = 0; e.shist = []; e.sn = { x: 0, y: 0, a: 0, out: 0 }; e.td = 3; e.te = 4; e.segs = null; },
  update(e, dt) {
    if (bossEnter(e, dt, 150, 45)) { this.snake(e, dt); return; }
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.28) * 34; e.y = 150 + Math.sin(e.mt * 0.6) * 6;
    const f0 = e.hp / e.maxhp, ph = f0 > 0.66 ? 1 : f0 > 0.33 ? 2 : 3;
    if (ph !== e.ph) {
      e.ph = ph; G.shake = 14; G.eb.length = 0; G.flash = 0.4;
      for (let i = 0; i < 8; i++) G.queue.push({ t: G.st + i * 0.1, fn: () => boom(e.x + rnd(-100, 100), e.y + rnd(-90, 90), 1.6, true) });
      popText(e.x, e.y + 130, ph === 2 ? '大蛇離開龜殼了！' : '龜殼碎裂，神核覺醒！', '#7dffc8');
      Snd.play('sting');
    }
    bossSmoke(e);
    this.snake(e, dt);
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    // 龜殼上的六個符文輪流打出旋轉光彈
    e.ta -= f;
    if (e.ta <= 0) {
      e.ta = ph === 1 ? 0.6 : ph === 2 ? 0.9 : 0.75; e.ri = (e.ri + 1) % 6;
      const [ox, oy] = X14RUNE[e.ri], rx = e.x + ox, ry = e.y + oy, a0 = Math.atan2(oy, ox);
      for (let k = -1; k <= 1; k++) eShot2(rx, ry, a0 + k * 0.32, 95, 'rune', { av: ph === 3 ? 0.4 : 0.25 });
    }
    // 龜頭吐出石彈
    e.tb -= f;
    if (e.tb <= 0) { e.tb = ph === 3 ? 2.6 : 2.0; for (let k = 0; k < 3; k++) G.queue.push({ t: G.st + k * 0.14, fn: () => { if (!e.dead && canShoot(e)) eShot(e.x, e.y + 112, aim(e.x, e.y + 112) + (k - 1) * 0.12, 170, 'b'); } }); }
    if (ph === 3) {
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.13; e.sa += 0.37; for (let k = 0; k < 3; k++) eShot2(e.x, e.y, e.sa + k * TAU / 3, 105, k ? 'rune' : 'a', { av: 0.3 }); }
      e.td -= f;
      if (e.td <= 0) {
        e.td = 3.8;
        if (G.d.beams) { const xs = [rnd(30, 120), rnd(150, 210), rnd(240, 330)]; xs.forEach((bx, i) => G.beams.push({ x: bx, y: 0, w: 22, t: -i * 0.3, warn: 1.1, life: 1.2, col: 'c' })); Snd.play('warn'); }
        else ring(e.x, e.y, 14, 85, e.mt, 'b');
      }
    }
  },
  // 大蛇：第一階段盤在殼上；第二階段起離開龜殼，在畫面上方繞來繞去，身體每一節都打得到
  snake(e, dt) {
    const S = e.sn, ph = e.ph || 1;
    S.out = clamp(S.out + (ph >= 2 ? dt * 0.6 : -dt), 0, 1);
    S.t = (S.t || 0) + dt;
    let hx, hy;
    if (S.out <= 0) { const a = S.t * 0.9; hx = e.x + Math.cos(a) * 92; hy = e.y + Math.sin(a) * 100; }
    else {
      const a = S.t * 0.9, cx = e.x + Math.cos(a) * 92, cy = e.y + Math.sin(a) * 100;
      const fx = 180 + Math.sin(S.t * 0.7) * 140, fy = 250 + Math.sin(S.t * 1.3) * 70 + (ph === 3 ? 30 : 0);
      hx = lerp(cx, fx, S.out); hy = lerp(cy, fy, S.out);
    }
    const ox = S.x, oy = S.y; S.x = hx; S.y = hy; if (ox || oy) S.a = Math.atan2(hy - oy, hx - ox);
    e.shist.unshift([hx, hy]); if (e.shist.length > 260) e.shist.length = 260;
    const segs = [[hx, hy, 15, S.a]]; let need = 15, acc = 0, prev = e.shist[0];
    for (let i = 1; i < e.shist.length && segs.length < 16; i++) {
      const p = e.shist[i]; acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p;
      if (acc >= need) { segs.push([p[0], p[1], 12 - segs.length * 0.35, 0]); need += 13; }
    }
    for (let i = 1; i < segs.length; i++) { const a = segs[i - 1], b = segs[i]; b[3] = Math.atan2(a[1] - b[1], a[0] - b[0]); }
    S.segs = segs;
    // 打得到的部位：龜殼＋龜頭＋（出來之後）蛇身
    const hb = [[e.x, e.y - 6, 72], [e.x, e.y + 98, 24]];
    if (S.out > 0.5) for (const s of segs) hb.push([s[0], s[1], s[2]]);
    e.segs = e.inv ? null : hb;
    // 蛇吐毒液
    if (!e.inv && canShoot(e) && ph >= 2) {
      S.ft = (S.ft ?? 1.5) - dt * G.d.fr;
      if (S.ft <= 0) { S.ft = ph === 3 ? 1.8 : 1.3; const b = eShot2(hx, hy, aim(hx, hy), 120, 'a'); if (b) b.split = 0.7; Snd.play('eshot'); }
      S.dt = (S.dt ?? 0.4) - dt * G.d.fr;
      if (S.dt <= 0 && segs.length > 6) { S.dt = 0.8; const s = segs[3 + ((Math.random() * (segs.length - 4)) | 0)]; eShot(s[0], s[1], s[3] + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2, 80, 'a'); }
    }
  },
  draw(ctx, e) {
    const x = e.x, y = e.y, ph = e.ph || 1, S = e.sn;
    const drawSnake = () => {
      const segs = S.segs || [];
      for (let i = segs.length - 1; i >= 1; i--) { const s = segs[i], sc = s[2] / 12; Art.draw(ctx, 'x14seg', s[0], s[1], s[3] + Math.PI / 2, 1, sc, sc); if (e.flash > 0 && S.out > 0.5) Art.draw(ctx, 'x14seg', s[0], s[1], s[3] + Math.PI / 2, 0.45, sc, sc, 'w'); }
      if (segs[0]) { Art.draw(ctx, 'x14head', segs[0][0], segs[0][1], S.a + Math.PI / 2); glowDot(ctx, segs[0][0] + Math.cos(S.a) * 8, segs[0][1] + Math.sin(S.a) * 8, 7, ph === 3 ? 'rgba(255,90,60,.9)' : 'rgba(255,220,90,.85)'); }
    };
    if (S.out < 0.5) drawSnake();
    const img = ph === 3 ? 'x14shellc' : 'x14shell';
    Art.draw(ctx, img, x + 8, y + 10, 0, 0.35, 1, 1, 's');
    Art.draw(ctx, img, x, y);
    bFlash(ctx, img, e);
    const p = 0.5 + 0.5 * Math.sin(e.t * (ph === 3 ? 9 : 3));
    X14RUNE.forEach(([ox, oy], i) => glowDot(ctx, x + ox, y + oy, 10 + (i === e.ri ? 8 : 0), `rgba(90,255,180,${0.35 + p * 0.3 + (i === e.ri ? 0.3 : 0)})`));
    if (ph === 3) { glowDot(ctx, x, y - 4, 46, `rgba(80,255,190,${0.35 + p * 0.35})`); glowDot(ctx, x, y - 4, 16, `rgba(230,255,245,${0.6 + p * 0.4})`); }
    for (const s of [-1, 1]) glowDot(ctx, x + s * 8, y + 108, 4, 'rgba(255,200,80,.95)');
    if (S.out >= 0.5) drawSnake();
  },
};
ET.boss14.onDeath = e => bossDown(e);

// ================= 3D 模型 =================
Object.assign(EXTRA_MODELS, {
  totem(K) {
    const ST = K.M(0x8a8a72, { m: 0.05, r: 0.7, panel: false, flat: true }), ST2 = K.M(0x6a6a58, { m: 0.05, r: 0.75, panel: false, flat: true });
    K.rbox(20, 20, 10, 0, 0, 0, ST2, 1);
    K.rbox(15, 15, 8, 0, 0, 10, ST, 1);
    K.ext(K.oct(6, 6, 2.4), 3, ST2, 18, 0.4);
    K.sph(3.6, 2, 3.6, 0, 21, 0, K.G(0x60ffc0, 3));
    for (const s of [-1, 1]) { K.box(3, 1, 8, s * 5, 18.6, 0, K.G(0x50e8a0, 2)); }
  },
  garg(K) {
    const ST = K.M(0x7a7a6a, { m: 0.05, r: 0.75, panel: false, flat: true }), ST2 = K.M(0x5a5a4c, { m: 0.05, r: 0.8, panel: false, flat: true });
    for (const s of [-1, 1]) K.ext([s * 6, -6, s * 22, -14, s * 20, 2, s * 16, 0, s * 18, 10, s * 6, 6], 1.6, ST2, 2, 0.4);
    K.sph(6, 4, 9, 0, 3, 0, ST);
    K.sph(4.6, 3.6, 4.6, 0, 5, 9, ST);
    for (const s of [-1, 1]) K.ext([s * 2, 10, s * 5, 16, s * 1, 13], 1.2, ST2, 6, 0.2);
    K.ext([-2, -8, 2, -8, 0, -18], 1, ST2, 2, 0.2);
  },
  runeTur(K) {
    const ST = K.M(0x9a9884, { m: 0.05, r: 0.7, panel: false, flat: true });
    K.cylV(11, 12, 4, 0, 0, 0, ST);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3; K.bar(0, 0, Math.cos(a) * 12, Math.sin(a) * 12, 5, 4, 3, ST); K.sph(2, 1.4, 2, Math.cos(a) * 12, 6, Math.sin(a) * 12, K.G(0x60ffb0, 2.8)); }
    K.sph(5, 3, 5, 0, 5, 0, K.G(0x80ffc8, 2.4));
  },
  idol(K) {
    const ST = K.M(0x8a8670, { m: 0.05, r: 0.72, panel: false }), ST2 = K.M(0x6a6656, { m: 0.05, r: 0.8, panel: false }), MS = K.M(0x4a6a3a, { m: 0, r: 0.9, panel: false });
    const geo = new K.T.SphereGeometry(48, 32, 20), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const f = 0.94 + vnoise(p.getX(i) * 0.12 + 3, p.getZ(i) * 0.12, 1440) * 0.12; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.6, p.getZ(i) * f * 1.1); }
    geo.computeVertexNormals(); K.add(geo, ST);
    for (const s of [-1, 1]) { K.sph(10, 4, 7, s * 18, 26, -6, ST2); K.sph(5, 3, 5, s * 18, 28, -6, K.G(0x60ffc0, 2.4)); K.sph(8, 5, 14, s * 44, 10, 6, ST2); }
    K.ext([-8, 4, 8, 4, 10, 18, -10, 18], 6, ST2, 22, 1);
    K.rbox(40, 10, 5, 0, 32, 20, ST2, 2);
    K.ext([-46, -40, 46, -40, 40, -56, -40, -56], 8, ST2, 18, 1);
    for (let k = 0; k < 7; k++) K.sph(5, 2, 4, -36 + k * 12, 28, -48, k % 2 ? MS : K.G(0x40e090, 1.6));
  },
  x14shell(K, o) {
    const SH = K.M(0x1c2a22, { m: 0.3, r: 0.5, cc: 0.6, panel: false, env: 0.25 }), SH2 = K.M(0x2e4a38, { m: 0.35, r: 0.42, cc: 0.8, panel: false, flat: true, env: 0.3 }), ST = K.M(0x34362c, { m: 0.1, r: 0.7, panel: false, env: 0.25 }), JD = K.G(0x50ffb0, 2.4), JD2 = K.G(0x2aff9a, 1.3);
    const BZ = K.M(0x8a6a2a, { m: 0.9, r: 0.3, cc: 1, panel: false });
    const cr = !!(o && o.cracked);
    // 四隻腳
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { K.sph(22, 10, 18, sx * 80, 4, sz * 64, ST); for (let c = -1; c <= 1; c++) K.sph(3, 2, 5, sx * 96, 6, sz * 64 + c * 8 + sz * 10, BZ); }
    // 龜頭（朝下方）
    K.sph(18, 12, 24, 0, 8, 98, ST); K.sph(10, 6, 8, 0, 12, 116, ST);
    for (const s of [-1, 1]) K.sph(3, 2, 3, s * 9, 16, 108, K.G(0xffc040, 3));
    K.bar(-14, 86, 14, 86, 17, 3, 1.4, BZ);
    // 龜殼：六角板
    K.sph(92, 34, 100, 0, 8, -4, SH);
    const plates = [[0, -6, 26], [0, -62, 20], [52, -32, 20], [52, 26, 20], [0, 56, 20], [-52, 26, 20], [-52, -32, 20], [34, -78, 12], [-34, -78, 12], [78, -2, 12], [-78, -2, 12], [34, 74, 12], [-34, 74, 12]];
    plates.forEach(([px, pz, r], i) => {
      if (cr && i === 0) return;
      const h = 30 + (r > 20 ? 6 : 0) - Math.hypot(px, pz) * 0.12;
      const m = K.ext(K.oct(r, r * 0.92, r * 0.42), 4, SH2, h, 1); m.position.x += px; m.position.z += pz;
      const rim = K.ext(K.oct(r + 2, (r + 2) * 0.92, (r + 2) * 0.42), 1, JD2, h - 0.6, 0.2); rim.position.x += px; rim.position.z += pz;
      if (r > 20) { const c = K.ext(K.oct(r * 0.45, r * 0.42, r * 0.2), 1, BZ, h + 4, 0.3); c.position.x += px; c.position.z += pz; }
    });
    for (const [px, pz] of X14RUNE) { const m = K.ext(K.oct(7, 7, 3), 1, JD, 40 - Math.hypot(px, pz) * 0.12, 0.2); m.position.x += px; m.position.z += pz; }
    if (cr) { // 碎開的殼：中間露出神核，裂縫發光
      K.sph(26, 14, 26, 0, 30, -6, JD);
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3; K.bar(Math.cos(a) * 24, Math.sin(a) * 24 - 6, Math.cos(a) * 70, Math.sin(a) * 76 - 6, 38, 2, 1, K.G(0x80ffd0, 2.2)); }
    }
  },
  x14head(K) {
    const SK = K.M(0x1e4a36, { m: 0.4, r: 0.35, cc: 0.9, panel: false }), SK2 = K.M(0x6a9a4a, { m: 0.4, r: 0.35, cc: 0.9, panel: false });
    K.sph(12, 8, 18, 0, 4, 0, SK);
    for (const s of [-1, 1]) K.ext([s * 3, 6, s * 12, -2, s * 10, 8], 1, K.M(0x8a6a2a, { m: 0.9, r: 0.3, cc: 1, panel: false }), 9, 0.3);
    K.sph(8, 5, 8, 0, 8, -8, SK2);
    for (const s of [-1, 1]) { K.sph(2.6, 2, 2.6, s * 7, 9, -6, K.G(0xffd040, 3)); K.ext([s * 6, 6, s * 14, 2, s * 8, 12], 2, SK2, 5, 0.4); }
    K.ext([-2, -18, 2, -18, 4, -26, 0, -22, -4, -26], 1, K.G(0xff5050, 2), 4, 0.2);
  },
  x14seg(K) {
    const SK = K.M(0x1e4a36, { m: 0.4, r: 0.35, cc: 0.9, panel: false }), SK2 = K.M(0x5a8a3e, { m: 0.4, r: 0.35, cc: 0.9, panel: false });
    K.sph(12, 7, 12, 0, 3, 0, SK);
    for (const s of [-1, 1]) K.ext([s * 4, -8, s * 11, -3, s * 11, 4, s * 4, 8], 1, SK2, 7.6, 0.3);
    K.ext(K.oct(4.6, 7, 2), 1.4, K.M(0x8a6a2a, { m: 0.9, r: 0.3, cc: 1, panel: false }), 9, 0.3);
    K.sph(1.4, 1, 1.4, 0, 10.4, 0, K.G(0x50ffb0, 2.6));
  },
});
EXTRA_BAKES.push(
  ['totem', 26, 26, EXTRA_MODELS.totem, { glow: 0.9 }],
  ['garg', 46, 38, EXTRA_MODELS.garg, { rot: Math.PI }],
  ['runeTur', 28, 28, EXTRA_MODELS.runeTur, { glow: 0.9 }],
  ['idol', 112, 124, EXTRA_MODELS.idol, { glow: 0.7 }],
  ['x14shell', 210, 250, EXTRA_MODELS.x14shell, { glow: 0.8 }],
  ['x14shellc', 210, 250, EXTRA_MODELS.x14shell, { glow: 0.9, cracked: true }],
  ['x14head', 34, 54, EXTRA_MODELS.x14head, { rot: Math.PI, glow: 0.8 }],
  ['x14seg', 26, 26, EXTRA_MODELS.x14seg],
);

// ================= 波次、關卡、音樂 =================
Object.assign(WAVES, {
  fence: q => { q(0, () => {
    const wide = Math.random() < 0.5, xa = wide ? rnd(36, 60) : rnd(40, 120), xb = wide ? rnd(300, 324) : rnd(240, 320);
    const va = groundX(xa, 'land'), vb = groundX(xb, 'land');
    const a = spawn('totem', va ?? xa, -30, { lead: true }), b = spawn('totem', vb ?? xb, -30, {});
    a.mate = b; b.mate = a; b.cyc = a.cyc;
  }); return 3.2; },
  gargs: q => { [80, 280, 180].forEach((x, i) => q(i * 0.5, () => spawn('garg', x, -24, { stop: 110 + i * 40 }))); return 4; },
  idol: q => { q(0, () => spawn('idol', 180, -80)); return 11.5; },
});
STAGES.push({ name: '叢林神殿', en: 'JUNGLE TEMPLE', boss: 'boss14', amb: 'jungle', speed: 48, bossSong: 'bossX',
  seq: ['fDown', 'gargs', 'fence', 'carrierP', 'droneW', 'fence', 'icpt', 'gargs', 'crates', 'carrierS', 'carrierO', 'fence', 'fSwoopL', 'fSwoopR', 'gargs', 'snakeR', 'carrierP', 'idol', 'fence', 'gargs', 'jetsUp', 'fDive', 'carrierB', 'fence', 'gargs', 'fSine', 'droneW'] });
Object.assign(SONGS, {
  s13: { bpm: 136, key: 46, prog: [[0, 'm'], [3, 'M'], [-2, 'M'], [0, 'm'], [5, 'm'], [3, 'M'], [-2, 'M'], [-4, 'M']], seed: 331, drums: 2, lead: 'triangle', arpW: 'triangle', pad: 0.9, arp: [0, 7, 10, 12, 7, 3, 7, 10] },
});
BOSS_INFO.boss14 = { img: 'x14shell', cls: '遠古石龜守護神', threat: 5, col: '#7dffc8' };
MID_INFO.idol = '浮空石首';
