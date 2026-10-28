'use strict';
// 第 14 關「楓紅古都」（兩條路線在這裡會合）：夕陽下的古城巷弄 → 運河與寶塔 → 金色宮殿
// 新敵人：戰鬥風箏、天燈（打破有獎章）、摺扇砲艇（打開時射扇形彈）、鐘樓（發出有缺口的音波環）
// 中頭目「飛天戰船」；頭目「機械金龍」（長長的身體會在畫面上游走，碰到身體也會被打下）

// ================= 地形 =================
const Z15 = v => { const d = -v; const canal = smooth(1200, 1600, d) * (1 - smooth(2800, 3200, d)); return { town: 1 - smooth(1200, 1600, d), canal, palace: smooth(2800, 3200, d) }; };
const BW15 = 92, BH15 = 112, LN15 = 10;
const canX15 = v => 180 + Math.sin(v * 0.0019 + 1.3) * 70 + Math.sin(v * 0.0053) * 18;
const canW15 = v => 22 + Z15(v).canal * 40;
const canal15 = (x, v) => { const z = Z15(v); return z.palace < 0.6 && Math.abs(x - canX15(v)) < canW15(v) / 2; };
const pagodaAt15 = j => (j < -2 && hash(j, 4, 1501) > 0.35) ? { x: hash(j, 5, 1501) > 0.5 ? 54 + hash(j, 6, 1501) * 40 : 266 + hash(j, 6, 1501) * 40, v: j * 340 + 170, r: 30 } : null;
function pagoda15(x, v) {
  const z = Z15(v); if (z.canal < 0.3) return null;
  const j = Math.floor(v / 340);
  for (const jj of [j - 1, j, j + 1]) { const T = pagodaAt15(jj); if (T && Math.abs(x - T.x) < T.r && Math.abs(v - T.v) < T.r) return T; }
  return null;
}
// 宮殿：大殿（中間）、兩側偏殿、紅牆
function palace15(x, v) {
  if (Z15(v).palace < 0.5) return null;
  const j = Math.floor(v / 260), lv = v - j * 260;
  if (Math.abs(x - 180) < 92 && lv > 40 && lv < 150) return { cx: 180, cy: j * 260 + 95, hw: 92, hh: 55, gold: true };
  for (const s of [-1, 1]) if (Math.abs(x - (180 + s * 140)) < 30 && lv > 60 && lv < 200) return { cx: 180 + s * 140, cy: j * 260 + 130, hw: 30, hh: 70, gold: false, vert: true };
  return null;
}
// 四合院：一個街區裡四棟房子圍著中庭
function court15(x, v) {
  const i = Math.floor(x / BW15), j = Math.floor(v / BH15), lx = x - i * BW15, lv = v - j * BH15;
  if (lx < LN15 || lv < LN15) return null;
  const w = BW15 - LN15, h = BH15 - LN15, ax = lx - LN15, av = lv - LN15, d = 18;
  if (ax > d && ax < w - d && av > d && av < h - d) return { yard: true, i, j };
  // 屋頂：沿著四邊的長條房子，屋脊在中線
  if (av <= d) return { i, j, cx: i * BW15 + LN15 + w / 2, cy: j * BH15 + LN15 + d / 2, hw: w / 2, hh: d / 2 };
  if (av >= h - d) return { i, j, cx: i * BW15 + LN15 + w / 2, cy: j * BH15 + LN15 + h - d / 2, hw: w / 2, hh: d / 2 };
  if (ax <= d) return { i, j, cx: i * BW15 + LN15 + d / 2, cy: j * BH15 + LN15 + h / 2, hw: d / 2, hh: h / 2 - d, vert: true };
  return { i, j, cx: i * BW15 + LN15 + w - d / 2, cy: j * BH15 + LN15 + h / 2, hw: d / 2, hh: h / 2 - d, vert: true };
}
const roofH15 = (R, x, v, top) => { // 歇山頂：越靠近屋脊越高
  const dx = Math.abs(x - R.cx) / R.hw, dv = Math.abs(v - R.cy) / R.hh;
  const k = R.vert ? Math.max(dx, dv * 0.35) : Math.max(dv, dx * 0.35);
  return top * (1 - k * 0.75);
};
const H15 = (x, v) => {
  const z = Z15(v);
  if (canal15(x, v)) return -6;
  const P = pagoda15(x, v);
  if (P) { const d = Math.max(Math.abs(x - P.x), Math.abs(v - P.v)) / P.r; return 60 - Math.floor(d * 5) * 9; }
  const pl = palace15(x, v);
  if (pl) return roofH15(pl, x, v, pl.gold ? 46 : 30);
  if (z.palace > 0.5) return vnoise(x * 0.2, v * 0.2, 1502) * 0.6;
  if (Math.abs(x - canX15(v)) < canW15(v) / 2 + 12) return 2;
  const c = court15(x, v);
  if (!c || c.yard) return vnoise(x * 0.3, v * 0.3, 1503) * 0.5;
  return roofH15(c, x, v, 14 + hash(c.i, c.j, 1504) * 6);
};
const C15 = (x, v, h) => {
  const z = Z15(v);
  if (canal15(x, v)) { const s = Math.max(0, Math.sin(v * 0.05 + x * 0.02)) * 0.25; return mixC(mixC([40, 84, 96], [70, 110, 120], fbm(x * 0.02, v * 0.02, 1505)), [255, 190, 110], s); }
  if (pagoda15(x, v)) return [110, 74, 58];
  const pl = palace15(x, v);
  if (pl) return pl.gold ? mixC([150, 104, 36], [184, 136, 52], fbm(x * 0.05, v * 0.05, 1506)) : [150, 90, 60];
  if (z.palace > 0.5) { const tile = ((Math.floor(x / 14) + Math.floor(v / 14)) & 1) ? 6 : 0; return [176 + tile, 168 + tile, 150 + tile]; }
  if (Math.abs(x - canX15(v)) < canW15(v) / 2 + 12) return [160, 150, 132];
  const c = court15(x, v);
  if (!c) return mixC([150, 136, 112], [170, 156, 130], vnoise(x * 0.1, v * 0.1, 1507));
  if (c.yard) return mixC([170, 160, 136], [190, 178, 150], vnoise(x * 0.08, v * 0.08, 1508));
  return hash(c.i, c.j, 1509) > 0.4 ? [78, 84, 98] : [152, 84, 58];
};
const MAPLE15 = [[200, 60, 40], [220, 110, 40], [230, 160, 50], [180, 40, 50], [210, 90, 30]];
function maple15(g, x, y, r, seed) {
  g.fillStyle = 'rgba(40,10,0,.28)'; g.beginPath(); g.arc(x + r * 0.5, y + r * 0.6, r, 0, TAU); g.fill();
  const base = MAPLE15[(seed * MAPLE15.length) | 0];
  for (let k = 0; k < 5; k++) { const a = k * 1.3 + seed * 9, d = r * 0.45; const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d; const gr = g.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r * 0.6); gr.addColorStop(0, rgb(base, 1.35)); gr.addColorStop(1, rgb(base, 0.75)); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 0.6, 0, TAU); g.fill(); }
}
function roofLines15(g, R, col) {
  g.strokeStyle = col; g.lineWidth = 0.6;
  if (R.vert) { for (let y = R.cy - R.hh + 2; y < R.cy + R.hh; y += 2.4) { g.beginPath(); g.moveTo(R.cx - R.hw, y); g.lineTo(R.cx + R.hw, y); g.stroke(); } }
  else { for (let x = R.cx - R.hw + 2; x < R.cx + R.hw; x += 2.4) { g.beginPath(); g.moveTo(x, R.cy - R.hh); g.lineTo(x, R.cy + R.hh); g.stroke(); } }
  g.strokeStyle = 'rgba(30,20,20,.65)'; g.lineWidth = 1.4; g.beginPath();
  if (R.vert) { g.moveTo(R.cx, R.cy - R.hh + 3); g.lineTo(R.cx, R.cy + R.hh - 3); } else { g.moveTo(R.cx - R.hw + 3, R.cy); g.lineTo(R.cx + R.hw - 3, R.cy); }
  g.stroke();
  // 翹起的屋角
  g.strokeStyle = 'rgba(40,30,30,.7)'; g.lineWidth = 1.1;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const px = R.cx + sx * R.hw, py = R.cy + sy * R.hh; g.beginPath(); g.moveTo(px - sx * 4, py - sy * 4); g.quadraticCurveTo(px, py, px + sx * 2.5, py - sy * 1); g.stroke(); }
}
PAINT.push({ H: H15, C: C15, k: 1.4, d: (g, v0, v1, sp) => {
  grain(g, v0, v1, 1510, 0.05);
  // 四合院屋瓦、庭院的樹、巷子的燈籠
  cells(BW15, BH15, v0, v1, 0, (i, j, x, v) => {
    const z = Z15(v + 56); if (z.palace > 0.5) return;
    const w = BW15 - LN15, h = BH15 - LN15, bx = x + LN15, by = v + LN15, d = 18;
    const blocked = (px, pv) => canal15(px, pv) || Math.abs(px - canX15(pv)) < canW15(pv) / 2 + 12 || pagoda15(px, pv);
    const roofs = [{ cx: bx + w / 2, cy: by + d / 2, hw: w / 2, hh: d / 2 }, { cx: bx + w / 2, cy: by + h - d / 2, hw: w / 2, hh: d / 2 }, { cx: bx + d / 2, cy: by + h / 2, hw: d / 2, hh: h / 2 - d, vert: true }, { cx: bx + w - d / 2, cy: by + h / 2, hw: d / 2, hh: h / 2 - d, vert: true }];
    const terr = hash(i, j, 1509) <= 0.4;
    for (const R of roofs) { if (blocked(R.cx, R.cy) || blocked(R.cx - R.hw, R.cy - R.hh) || blocked(R.cx + R.hw, R.cy + R.hh)) continue; roofLines15(g, R, terr ? 'rgba(90,40,30,.45)' : 'rgba(30,34,44,.45)'); }
    if (blocked(bx + w / 2, by + h / 2)) return;
    // 庭院：楓樹或水井
    const yx = bx + w / 2, yv = by + h / 2;
    if (hash(i, j, 1511) > 0.35) maple15(g, yx + (hash(i, j, 1512) - 0.5) * 16, yv + (hash(j, i, 1512) - 0.5) * 20, 9 + hash(i, j, 1513) * 5, hash(i, j, 1514));
    else { g.fillStyle = '#6a6a6a'; g.beginPath(); g.arc(yx, yv, 5, 0, TAU); g.fill(); g.fillStyle = '#1a2a3a'; g.beginPath(); g.arc(yx, yv, 3, 0, TAU); g.fill(); }
    // 巷子的紅燈籠
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) { const lx = x + LN15 / 2, lv = v + 20 + k * 34; if (blocked(lx, lv)) continue; glowDotT(g, lx, lv, 7, 'rgba(255,90,40,.35)'); g.fillStyle = 'rgba(255,120,60,.95)'; g.beginPath(); g.ellipse(lx, lv, 1.6, 2.2, 0, 0, TAU); g.fill(); }
    g.restore();
    if (by + h / 2 >= v0 && by + h / 2 < v1 && j < -3 && (j & 1) && hash(i, j, 1515) > 0.9 && z.town > 0.3) sp.push({ type: 'bell', x: yx, v: yv });
  });
  // 楓樹林（運河邊、巷子邊）
  cells(26, 26, v0, v1, 14, (i, j, x, v) => {
    const z = Z15(v + 13); if (hash(i, j, 1516) > 0.12 + z.canal * 0.3) return;
    const tx = x + hash(i, j, 1517) * 26, tv = v + hash(j, i, 1517) * 26;
    if (canal15(tx, tv) || pagoda15(tx, tv) || palace15(tx, tv)) return;
    const c = court15(tx, tv); if (c && !c.yard && z.palace < 0.5) return;
    maple15(g, tx, tv, 6 + hash(i, j, 1518) * 6, hash(i, j, 1519));
  });
  // 運河：石岸、拱橋、小船、夕陽倒影
  cells(40, 40, v0, v1, 0, (i, j, x, v) => {
    if (i !== 0) return;
    for (let vv = v; vv < v + 40; vv += 4) {
      if (Z15(vv).palace > 0.6) continue;
      const cx = canX15(vv), cw = canW15(vv);
      g.fillStyle = '#9a9284'; g.fillRect(cx - cw / 2 - 4, vv, 4, 4.2); g.fillRect(cx + cw / 2, vv, 4, 4.2);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(cx - cw / 2, vv, 2, 4.2);
    }
    const bv = v + 20; if (Z15(bv).palace > 0.6 || ((j % 3) + 3) % 3) return;
    const cx = canX15(bv), cw = canW15(bv);
    shadowed(g, sh => { g.fillStyle = sh ? 'rgba(0,0,0,.35)' : '#b8ad98'; g.fillRect(cx - cw / 2 - 8, bv - 5, cw + 16, 10); });
    g.strokeStyle = 'rgba(80,70,60,.6)'; g.lineWidth = 0.7; for (let k = -cw / 2 - 6; k < cw / 2 + 6; k += 3) { g.beginPath(); g.moveTo(cx + k, bv - 5); g.lineTo(cx + k, bv + 5); g.stroke(); }
    g.fillStyle = '#c03a2a'; g.fillRect(cx - cw / 2 - 8, bv - 6, cw + 16, 1.4); g.fillRect(cx - cw / 2 - 8, bv + 4.6, cw + 16, 1.4);
    if (hash(j, 9, 1520) > 0.4) { const bx = cx + (hash(j, 8, 1520) - 0.5) * cw * 0.5, byy = bv + 30; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(bx + 2, byy + 3, 4, 10, 0, 0, TAU); g.fill(); g.fillStyle = '#6a4a2a'; g.beginPath(); g.ellipse(bx, byy, 4, 10, 0, 0, TAU); g.fill(); g.fillStyle = '#d8c8a0'; g.fillRect(bx - 3, byy - 3, 6, 5); }
  });
  // 寶塔
  for (let jj = Math.floor((v0 - 60) / 340); jj <= Math.floor((v1 + 60) / 340); jj++) {
    const T = pagodaAt15(jj); if (!T || Z15(T.v).canal < 0.3 || T.v < v0 - 60 || T.v > v1 + 60) continue;
    for (let k = 0; k < 5; k++) {
      const r = T.r * (1 - k / 5);
      g.strokeStyle = 'rgba(30,20,20,.6)'; g.lineWidth = 1.4; g.beginPath();
      for (let q = 0; q <= 8; q++) { const a = q * TAU / 8 + TAU / 16, px = T.x + Math.cos(a) * r, py = T.v + Math.sin(a) * r; q ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
      g.fillStyle = 'rgba(255,170,60,.85)'; for (let q = 0; q < 8; q++) { const a = q * TAU / 8 + TAU / 16; g.beginPath(); g.arc(T.x + Math.cos(a) * r, T.v + Math.sin(a) * r, 1.1, 0, TAU); g.fill(); }
    }
    g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, T.x, T.v, 12, 'rgba(255,210,90,.8)'); g.restore();
    if (T.v >= v0 && T.v < v1 && hash(jj, 2, 1522) > 0.4) sp.push({ type: 'bell', x: T.x, v: T.v });
  }
  // 宮殿：金色屋頂、紅牆、廣場石燈
  cells(W, 260, v0, v1, 0, (i, j, x, v) => {
    if (i !== 0 || Z15(v + 130).palace < 0.5) return;
    g.fillStyle = '#a8322a'; g.fillRect(20, v + 20, 4, 240); g.fillRect(W - 24, v + 20, 4, 240);
    g.fillStyle = 'rgba(255,220,150,.3)'; g.fillRect(20, v + 20, 1, 240); g.fillRect(W - 24, v + 20, 1, 240);
    const big = { cx: 180, cy: v + 95, hw: 92, hh: 55 };
    roofLines15(g, big, 'rgba(120,80,10,.45)');
    for (const s of [-1, 1]) { roofLines15(g, { cx: 180 + s * 140, cy: v + 130, hw: 30, hh: 70, vert: true }, 'rgba(70,20,10,.45)'); }
    // 屋脊上的金龍裝飾
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) glowDotT(g, 180 + s * 84, v + 95, 7, 'rgba(255,220,100,.8)');
    g.restore();
    for (let k = 0; k < 6; k++) { const lx = 70 + k * 44, lv = v + 200; if (Math.abs(lx - 180) < 30) continue; g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(lx - 3, lv - 2, 8, 8); g.fillStyle = '#c8c0a8'; g.fillRect(lx - 4, lv - 4, 8, 8); g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, lx, lv, 9, 'rgba(255,170,80,.5)'); g.restore(); }
    g.fillStyle = 'rgba(200,190,170,.5)'; g.fillRect(166, v + 150, 28, 110);
    if (v + 200 >= v0 && v + 200 < v1 && (j & 1) && hash(j, 3, 1521) > 0.5) sp.push({ type: 'bell', x: hash(j, 4, 1521) > 0.5 ? 70 : 290, v: v + 210 });
  });
} });
WATER.push(canal15);
ROADX.push(null);

// ================= 環境：夕陽與飄落的楓葉 =================
AMB2.maple = {
  update(dt) {
    const A = G.amb;
    while (A.length < 34) A.push({ x: rnd(-20, W + 20), y: rnd(-30, H), a: rnd(TAU), sp: rnd(-3, 3), vx: rnd(-30, -10), vy: rnd(30, 60), c: (Math.random() * MAPLE15.length) | 0, s: rnd(2, 3.6) });
    for (const p of A) { p.a += p.sp * dt; p.x += (p.vx + Math.sin(p.a) * 20) * dt; p.y += (p.vy + G.speed * 0.4) * dt; if (p.y > H + 10 || p.x < -20) { p.y = -10; p.x = rnd(0, W + 40); } }
  },
  draw(ctx) {
    const sun = ctx.createLinearGradient(0, 0, W, H);
    sun.addColorStop(0, 'rgba(255,150,60,.22)'); sun.addColorStop(0.5, 'rgba(255,120,60,0)'); sun.addColorStop(1, 'rgba(60,20,80,.25)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
    for (const p of G.amb) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(1, Math.abs(Math.cos(p.a * 1.3)) * 0.8 + 0.2);
      ctx.fillStyle = rgb(MAPLE15[p.c], 1.15, 0.85); ctx.beginPath();
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5; ctx.lineTo(Math.cos(a) * p.s, Math.sin(a) * p.s); ctx.lineTo(Math.cos(a + TAU / 10) * p.s * 0.45, Math.sin(a + TAU / 10) * p.s * 0.45); }
      ctx.fill(); ctx.restore();
    }
  },
};

// ================= 敵人 =================
SPR.kite = { w: 26, h: 30, draw(g) { P_(g, [0, -14, 11, -2, 0, 14, -11, -2], '#d8402a'); P_(g, [0, -14, 11, -2, 0, -2], '#f0c040'); } };
SPR.lant = { w: 18, h: 24, draw(g) { g.fillStyle = '#ff6030'; g.beginPath(); g.ellipse(0, 0, 8, 11, 0, 0, TAU); g.fill(); } };
SPR.fanship = { w: 50, h: 36, draw(g) { P_(g, [0, 12, -22, -10, 22, -10], '#c8a050'); circ(g, 0, 8, 6, '#6a3a20'); } };
SPR.bell = { w: 30, h: 30, draw(g) { rr(g, -12, -12, 24, 24, 4, '#8a4a2a'); circ(g, 0, 0, 7, '#d8a840'); } };
SPR.junk = { w: 120, h: 210, draw(g) { g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(0, 0, 34, 96, 0, 0, TAU); g.fill(); } };
SPR.junkSail = { w: 110, h: 40, draw(g) { P_(g, [-52, 14, -40, -16, 40, -16, 52, 14], '#c84a30'); } };
Object.assign(ET, {
  // 戰鬥風箏：成群滑翔，邊飛邊丟小彈
  kite: { hp: 3, r: 10, score: 160, spr: 'kite',
    init(e, o) { e.dir = o.dir || 1; e.ph = o.ph || 0; e.vy = 110; e.ft = rnd(0.6, 1.4); },
    update(e, dt) {
      e.vx = Math.cos(e.t * 2 + e.ph) * 110 * e.dir; e.vy = 95 + Math.sin(e.t * 3 + e.ph) * 30;
      e.ang = Math.atan2(e.vy, e.vx) - Math.PI / 2;
      e.ft -= dt * G.d.fr; if (e.ft <= 0) { e.ft = 1.6; if (canShoot(e) && Math.random() < G.d.shotChance) eShot(e.x, e.y, aim(e.x, e.y), 130); }
    },
    draw(ctx, e) {
      ctx.strokeStyle = 'rgba(255,240,200,.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(e.x, e.y + 10);
      for (let k = 1; k < 6; k++) ctx.lineTo(e.x + Math.sin(e.t * 6 + k) * 4, e.y + 10 + k * 5); ctx.stroke();
      spr(ctx, e, 'kite', e.ang * 0.4);
    },
  },
  // 天燈：從城裡慢慢飄上來，打破會掉獎章（不會撞人）
  lant: { hp: 2, r: 9, score: 100, layer: 'ground', spr: 'lant',
    init(e) { e.vy = -rnd(38, 52); e.ph = rnd(TAU); },
    update(e, dt) { e.vx = Math.sin(e.t * 1.4 + e.ph) * 12; e.vy = -45; },
    draw(ctx, e) { glowDot(ctx, e.x, e.y, 16 + Math.sin(e.t * 5 + e.ph) * 2, 'rgba(255,150,60,.45)'); spr(ctx, e, 'lant', Math.sin(e.t + e.ph) * 0.1); glowDot(ctx, e.x, e.y + 4, 5, 'rgba(255,240,160,.9)'); },
    onDeath(e) { for (let i = 0; i < 2; i++) spawnItem('medal', e.x + (i ? 8 : -8), e.y); },
  },
  // 摺扇砲艇：合起來時快速移動，打開時射出大扇形彈
  fanship: { hp: 8, r: 14, score: 600, spr: 'fanship',
    init(e, o) { e.vy = 90; e.stop = o.stop || rnd(110, 210); e.open = 0; e.ft = 0; e.cyc = 0; },
    update(e, dt) {
      if (e.st === undefined) { e.vy = Math.max(20, (e.stop - e.y) * 2.6); if (e.y >= e.stop - 3) { e.st = 0; e.vy = 0; } return; }
      e.st += dt; e.cyc += dt;
      const c = e.cyc % 3, opening = c > 1.2 && c < 2.4;
      e.open = clamp(e.open + (opening ? dt * 3 : -dt * 3), 0, 1);
      if (!opening) e.vx = clamp((P.x - e.x) * 1.2, -100, 100); else e.vx = 0;
      if (opening && !e.fired && e.open > 0.9) { e.fired = true; if (canShoot(e)) { fan(e.x, e.y + 8, Math.PI / 2, 9, 1.6, 115); if (G.d.dens >= 1) G.queue.push({ t: G.st + 0.3, fn: () => { if (!e.dead && canShoot(e)) fan(e.x, e.y + 8, Math.PI / 2, 8, 1.4, 135); } }); } }
      if (!opening) e.fired = false;
      if (e.st > 9) e.vy = 80;
    },
    draw(ctx, e) {
      const o = e.open;
      for (let k = -4; k <= 4; k++) { const a = k * 0.18 * (0.25 + o * 0.75); ctx.save(); ctx.translate(e.x, e.y + 8); ctx.rotate(a); ctx.fillStyle = k % 2 ? '#e8c060' : '#c03a2a'; ctx.beginPath(); ctx.moveTo(-2.2, 0); ctx.lineTo(2.2, 0); ctx.lineTo(4.5, -24); ctx.lineTo(-4.5, -24); ctx.fill(); ctx.restore(); }
      spr(ctx, e, 'fanship', 0);
      if (o > 0.5) glowDot(ctx, e.x, e.y + 6, 10, 'rgba(255,200,90,.85)');
    },
  },
  // 鐘樓：敲鐘時發出一圈音波彈，圈上有個缺口可以鑽過去
  bell: { hp: 18, r: 13, score: 700, ground: true, medal: 0.8, gs: 'pad',
    init(e) { e.ft = rnd(1, 2.4); e.ring = 0; },
    update(e, dt) {
      e.ring = Math.max(0, e.ring - dt);
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) {
        e.ft = 3.4; if (!canShoot(e)) return;
        const n = Math.round(22 * Math.max(0.75, G.d.dens)), gap = aim(e.x, e.y) + rnd(-0.6, 0.6), gw = G.d.dens < 1 ? 0.75 : 0.5;
        for (let i = 0; i < n; i++) { const a = i * TAU / n; let d = ((a - gap + Math.PI * 3) % TAU) - Math.PI; if (Math.abs(d) < gw) continue; eShot(e.x, e.y, a, 70, 'c'); }
        e.ring = 0.6; Snd.tone(330, 0.8, 'sine', 0.08, 320); Snd.tone(660, 0.6, 'triangle', 0.04, 650);
      }
    },
    draw(ctx, e) {
      Art.draw(ctx, 'pad', e.x, e.y);
      spr(ctx, e, 'bell', Math.sin(G.t * 8) * e.ring * 0.4);
      if (e.ring > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,210,120,${e.ring})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, 14 + (0.6 - e.ring) * 60, 0, TAU); ctx.stroke(); ctx.restore(); }
    },
  },
  // 中頭目：飛天戰船（兩側舷砲齊射、帆上的砲台）
  junk: { hp: 560, r: 34, score: 14000, big: 1, drop: ['P', 'S'], hb: [[0, -64, 24], [0, -18, 32], [0, 30, 32], [0, 76, 22]],
    init(e) { e.vy = 50; e.ft = 1.4; e.tb = 2.4; e.tc = 3.5; e.side = 1; e.tur = Math.PI / 2; },
    update(e, dt) {
      e.tur = turnTo(e.tur, aim(e.x, e.y - 70), 2.4 * dt);
      if (e.st === undefined) { e.vy = Math.max(12, (165 - e.y) * 1.1); if (e.y >= 161) { e.st = 0; e.x0 = e.x; e.vy = 0; } return; }
      e.st += dt; e.vy = e.st > 19 ? 55 : 0;
      e.x = e.x0 + Math.sin(e.st * 0.42) * 66;
      if (!canShoot(e) || e.st > 19) return;
      const f = dt * G.d.fr;
      e.ft -= f;
      if (e.ft <= 0) { // 舷砲：一排砲口往側面打，子彈慢慢轉向下方
        e.ft = 2.2; e.side = -e.side; const s = e.side;
        for (let k = 0; k < 6; k++) G.queue.push({ t: G.st + k * 0.08, fn: () => { if (!e.dead && canShoot(e)) eShot2(e.x + s * 30, e.y - 60 + k * 24, s > 0 ? 0 : Math.PI, 110, 'b', { av: s * 0.9 }); } });
        Snd.play('eshot');
      }
      e.tb -= f; if (e.tb <= 0) { e.tb = 1.5; fan(e.x, e.y - 70, e.tur, 3, 0.3, 160); }
      e.tc -= f; if (e.tc <= 0) { e.tc = 4.2; ring(e.x, e.y + 30, 16, 85, e.st, 'c'); }
    },
    shadow(ctx, e) { Art.shadow(ctx, 'junk', e.x, e.y, 0, 0.9); },
    draw(ctx, e) {
      spr(ctx, e, 'junk', 0);
      for (let k = 0; k < 3; k++) { const y = e.y - 50 + k * 50, flap = 1 + Math.sin(e.t * 2 + k) * 0.06; Art.draw(ctx, 'junkSail', e.x, y, 0, 1, flap, 1); }
      Art.draw(ctx, 'gunTur', e.x, e.y - 70, e.tur - Math.PI / 2, 1, 1.1, 1.1);
      if (Math.floor(e.t * 2) % 2) glowDot(ctx, e.x, e.y + 96, 7, 'rgba(255,120,40,.9)');
    },
  },
});

// ================= 頭目：機械金龍 =================
SPR.d15head = { w: 70, h: 80, draw(g) { P_(g, [0, 36, 20, 10, 24, -20, 0, -36, -24, -20, -20, 10], '#d8a830'); } };
SPR.d15seg = { w: 46, h: 40, draw(g) { circ(g, 0, 0, 17, '#c89a30'); } };
SPR.d15tail = { w: 40, h: 60, draw(g) { P_(g, [0, -26, 16, 6, 0, 28, -16, 6], '#c89a30'); } };
SPR.d15pearl = { w: 30, h: 30, draw(g) { circ(g, 0, 0, 12, rad(g, -3, -3, 13, ['#ffffff', '#ffe9a0', '#ff9a30'])); } };
const D15N = 22;
ET.boss15 = { name: '機械金龍', en: 'GOLDEN MECHA DRAGON', hp: 5600, r: 22, score: 700000, boss: true, layer: 'air', hb: [[0, 0, 26]], marks: [0.66, 0.33],
  init(e) {
    bossBase(e); e.ph = 1; e.hist = []; e.path = 0; e.mode = 'weave'; e.mt0 = 0; e.coil = 0; e.pearl = null; e.td = 3; e.te = 2; e.wave = 0;
    e.x = -60; e.y = 120; e.hx = -60; e.hy = 120;
  },
  update(e, dt) {
    const T = ET.boss15;
    // 入場：從左邊游進畫面
    if (e.inv) { e.t2 = (e.t2 || 0) + dt; e.x = -60 + e.t2 * 150; e.y = 120 + Math.sin(e.t2 * 3) * 30; T.body(e); if (e.t2 > 1.9) { e.inv = false; e.mt = 0; } return; }
    e.mt += dt;
    const f0 = e.hp / e.maxhp, ph = f0 > 0.66 ? 1 : f0 > 0.33 ? 2 : 3;
    if (ph !== e.ph) {
      e.ph = ph; G.shake = 12; G.eb.length = 0; G.flash = 0.35;
      for (const s of (e.segs || []).slice(0, 8)) boom(s[0], s[1], 1.3);
      popText(clamp(e.x, 60, W - 60), clamp(e.y + 60, 80, 400), ph === 2 ? '金龍盤繞！' : '龍珠覺醒，雷霆萬鈞！', '#ffd23f');
      Snd.play('sting'); e.coilT = ph === 2 ? 0 : -1;
      if (ph === 3) e.pearl = { x: 180, y: 200, vx: 90, vy: 70 };
    }
    // 移動：大 S 型游走；第二階段會定時盤成一圈；第三階段追著龍珠跑
    let tx, ty;
    if (ph === 2 && e.coilT >= 0) {
      e.coilT += dt;
      const ang = e.coilT * 2.2, R = 80 + Math.max(0, 1.2 - e.coilT) * 60;
      tx = 180 + Math.cos(ang) * R; ty = 210 + Math.sin(ang) * R * 0.8;
      if (e.coilT > 6.5) e.coilT = -4.5;
    } else if (ph === 3 && e.pearl) {
      const p = e.pearl; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 40 || p.x > W - 40) p.vx = -p.vx; if (p.y < 70 || p.y > 330) p.vy = -p.vy;
      p.x = clamp(p.x, 40, W - 40); p.y = clamp(p.y, 70, 330);
      tx = p.x + Math.cos(e.mt * 3) * 26; ty = p.y + Math.sin(e.mt * 3) * 26;
    } else {
      if (ph === 2) e.coilT += dt;
      tx = 180 + Math.sin(e.mt * 0.8) * 150; ty = 150 + Math.sin(e.mt * 1.6) * 80 + (ph === 2 ? 20 : 0);
    }
    const sp = ph === 3 ? 240 : 190, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, mv = Math.min(d, sp * dt);
    e.x += dx / d * mv; e.y += dy / d * mv;
    T.body(e);
    if (!canShoot(e)) return;
    const f = dt * G.d.fr, segs = e.segs;
    // 龍身一節一節往下開火（像波浪一樣從頭傳到尾）
    e.ta -= f;
    if (e.ta <= 0) {
      e.ta = ph === 1 ? 0.11 : 0.15; e.wave = (e.wave + 1) % D15N;
      const s = segs[e.wave]; if (s && s[1] > 0 && s[1] < H - 160 && s[0] > 0 && s[0] < W && (e.wave % (G.d.dens >= 1 ? 2 : 3) === 0)) eShot(s[0], s[1], Math.PI / 2 + Math.sin(e.mt * 2 + e.wave) * 0.4, ph === 1 ? 105 : 90, 'c');
    }
    // 龍頭噴火
    e.tb -= f;
    if (e.tb <= 0) { e.tb = ph === 3 ? 1.6 : 2.2; const a = aim(e.x, e.y); for (let k = 0; k < (G.d.dens >= 1 ? 7 : 5); k++) G.queue.push({ t: G.st + k * 0.05, fn: () => { if (!e.dead && canShoot(e)) eShot(e.x, e.y, a + rnd(-0.32, 0.32), rnd(150, 200), 'b'); } }); Snd.play('missile'); }
    if (ph === 2 && e.coilT > 1.4 && e.coilT < 6.2) {
      e.tc -= f; if (e.tc <= 0) { e.tc = 0.9; for (let k = 0; k < D15N; k += 3) { const s = segs[k]; if (s) eShot(s[0], s[1], Math.atan2(s[1] - 210, s[0] - 180), 80, 's'); } Snd.play('eshot'); }
    }
    if (ph === 3) {
      e.td -= f;
      if (e.td <= 0) {
        e.td = 3.6; const p = e.pearl;
        if (G.d.beams) { G.beams.push({ x: clamp(P.x, 20, W - 20), y: p.y, w: 18, t: 0, warn: 0.9, life: 1.0, col: 'o' }); Snd.play('warn'); }
        ring(p.x, p.y, 12, 95, e.mt, 'c');
      }
      e.te -= f; if (e.te <= 0) { e.te = 0.2; e.sa += 0.5; eShot2(e.pearl.x, e.pearl.y, e.sa, 90, 's', { av: 0.25 }); }
    }
  },
  body(e) {
    e.hist.unshift([e.x, e.y]); if (e.hist.length > 600) e.hist.length = 600;
    const segs = [[e.x, e.y, 24, 0]]; let need = 26, acc = 0, prev = e.hist[0];
    for (let i = 1; i < e.hist.length && segs.length < D15N; i++) {
      const p = e.hist[i]; acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p;
      if (acc >= need) { segs.push([p[0], p[1], segs.length > D15N - 4 ? 12 : 16, 0]); need += 17; }
    }
    while (segs.length < D15N) { const l = segs[segs.length - 1]; segs.push([l[0], l[1], 12, 0]); }
    for (let i = 0; i < segs.length; i++) { const a = segs[i], b = segs[i + 1] || segs[i - 1]; a[3] = i + 1 < segs.length ? Math.atan2(a[1] - b[1], a[0] - b[0]) : Math.atan2(b[1] - a[1], b[0] - a[0]); }
    e.segs = segs;
  },
  draw(ctx, e) {
    const segs = e.segs || [];
    const ph = e.ph || 1;
    if (e.pearl) { const p = e.pearl; glowDot(ctx, p.x, p.y, 36 + Math.sin(e.t * 8) * 4, 'rgba(255,200,90,.45)'); Art.draw(ctx, 'd15pearl', p.x, p.y, e.t * 2); }
    for (let i = segs.length - 1; i >= 1; i--) {
      const s = segs[i], n = i === segs.length - 1 ? 'd15tail' : 'd15seg', sc = i > segs.length - 5 ? 0.8 - (i - (segs.length - 5)) * 0.06 : 1;
      Art.draw(ctx, n, s[0], s[1], s[3] - Math.PI / 2, 1, sc, sc);
      if (e.flash > 0) Art.draw(ctx, n, s[0], s[1], s[3] - Math.PI / 2, 0.4, sc, sc, 'w');
      if (i % 3 === 0) glowDot(ctx, s[0], s[1], 5, ph === 3 ? 'rgba(255,120,60,.8)' : 'rgba(120,230,255,.7)');
    }
    const h = segs[0]; if (!h) return;
    // 龍鬚
    ctx.strokeStyle = 'rgba(255,230,150,.8)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); const a = h[3] + Math.PI / 2; ctx.moveTo(h[0] + Math.cos(h[3] + s * 0.5) * 18, h[1] + Math.sin(h[3] + s * 0.5) * 18); for (let k = 1; k <= 6; k++) ctx.lineTo(h[0] + Math.cos(h[3] + s * 0.5) * 18 - Math.cos(h[3]) * k * 7 + Math.cos(a) * s * (k * 4 + Math.sin(e.t * 5 + k) * 4), h[1] + Math.sin(h[3] + s * 0.5) * 18 - Math.sin(h[3]) * k * 7 + Math.sin(a) * s * (k * 4 + Math.sin(e.t * 5 + k) * 4)); ctx.stroke(); }
    Art.draw(ctx, 'd15head', h[0], h[1], h[3] - Math.PI / 2);
    bFlash(ctx, 'd15head', e, h[0], h[1], h[3] - Math.PI / 2);
    for (const s of [-1, 1]) glowDot(ctx, h[0] + Math.cos(h[3] + s * 0.6) * 12, h[1] + Math.sin(h[3] + s * 0.6) * 12, 5, ph === 3 ? 'rgba(255,60,40,1)' : 'rgba(120,240,255,1)');
  },
};
ET.boss15.shadow = (ctx, e) => { const segs = e.segs || []; for (let i = segs.length - 1; i >= 0; i -= 2) { const s = segs[i]; Art.shadow(ctx, i ? 'd15seg' : 'd15head', s[0], s[1], s[3] - Math.PI / 2, 0.6); } };
ET.boss15.onDeath = e => {
  const segs = (e.segs || []).slice(1);
  segs.forEach((s, i) => G.queue.push({ t: G.st + 0.06 * (i + 1), fn: () => boom(s[0], s[1], 1.4) }));
  bossDown(e);
};

// ================= 3D 模型 =================
Object.assign(EXTRA_MODELS, {
  kite(K) {
    const RD = K.M(0xd8402a, { m: 0.1, r: 0.5, panel: false }), GD = K.M(0xf0c040, { m: 0.5, r: 0.35, panel: false }), DK = K.M(0x3a2a20, { m: 0.3, r: 0.5, panel: false });
    K.ext([0, -14, 11, -2, 0, 14, -11, -2], 0.8, RD, 0, 0.2);
    K.ext([0, -14, 11, -2, 0, -2], 0.4, GD, 0.8, 0.1); K.ext([0, 14, -11, -2, 0, -2], 0.4, GD, 0.8, 0.1);
    K.bar(0, -14, 0, 14, 1.4, 0.8, 0.6, DK); K.bar(-11, -2, 11, -2, 1.4, 0.8, 0.6, DK);
    K.sph(2.6, 1.6, 2.6, 0, 2, -2, K.G(0xffd070, 2.4));
  },
  lant(K) {
    const PA = K.M(0xff6a30, { m: 0, r: 0.6, panel: false, e: 0xff4010, ei: 0.8 });
    K.latheV([[0.1, -10], [6, -9], [8, -4], [8, 4], [6, 9], [0.1, 10]], PA, 0, 0, 0);
    K.cylV(4, 4, 1, 0, 9, 0, K.M(0x4a2a10, { m: 0.2, r: 0.6, panel: false }));
  },
  fanship(K) {
    const GD = K.M(0xc8a050, { m: 0.8, r: 0.25, cc: 1 }), RD = K.M(0x8a2a1a, { m: 0.4, r: 0.35, cc: 1 }), DK = K.M(0x2a1a14, { m: 0.8, r: 0.4 });
    K.ext([0, 12, -14, -6, -8, -12, 8, -12, 14, -6], 4, RD, 0, 1);
    K.ext([0, 8, -8, -6, 8, -6], 2, GD, 4, 0.6);
    K.sph(5, 3, 5, 0, 6, 6, K.G(0xffc060, 2.4));
    for (const s of [-1, 1]) { K.cyl(2.4, 2.4, 8, s * 9, 2, 0, DK); K.cyl(2, 2, 0.6, s * 9, 2, -4.4, K.G(0xff9a40, 2.6)); }
  },
  bell(K) {
    const WD = K.M(0x8a4a2a, { m: 0.1, r: 0.55, panel: false }), RF = K.M(0x3a3e48, { m: 0.3, r: 0.5, panel: false }), GD = K.M(0xd8a840, { m: 0.95, r: 0.25, cc: 1, panel: false });
    K.rbox(26, 26, 6, 0, 0, 0, WD, 1);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.cylV(1.4, 1.4, 8, sx * 10, 6, sz * 10, K.M(0xc03a2a, { m: 0.1, r: 0.5, panel: false }));
    K.latheV([[0.1, 0], [8, 1], [7, 5], [4, 9], [0.1, 10]], GD, 0, 6, 0);
    K.ext([0, -16, 16, 0, 0, 16, -16, 0], 2, RF, 14, 0.8);
    K.sph(2.4, 1.6, 2.4, 0, 17, 0, GD);
  },
  junk(K) {
    const WD = K.M(0x7a4a2a, { m: 0.1, r: 0.55, cc: 0.6, panel: false }), WD2 = K.M(0x9a6a3a, { m: 0.1, r: 0.55, cc: 0.6, panel: false }), DK = K.M(0x2a1a10, { m: 0.4, r: 0.5, panel: false }), GD = K.M(0xd8a840, { m: 0.95, r: 0.25, cc: 1, panel: false });
    K.ext([0, -104, 24, -80, 34, -20, 32, 60, 20, 98, -20, 98, -32, 60, -34, -20, -24, -80], 10, WD, 0, 2);
    K.ext([0, -90, 18, -70, 26, -20, 24, 56, 14, 86, -14, 86, -24, 56, -26, -20, -18, -70], 2, WD2, 10, 0.6);
    for (let k = 0; k < 6; k++) for (const s of [-1, 1]) { K.cyl(2, 2, 8, s * 34, 7, -60 + k * 24, DK); K.box(8, 1, 1, s * 36, 7, -60 + k * 24, DK); }
    K.ext([-16, 84, 16, 84, 18, 104, -18, 104], 10, WD2, 10, 1);
    K.bar(-12, 92, 12, 92, 21, 3, 1, GD);
    for (const z of [-50, 0, 50]) K.cylV(2, 2.4, 26, 0, 12, z, DK);
    K.sph(4, 3, 4, 0, 14, -104, GD);
  },
  junkSail(K) {
    const SL = K.M(0xc84a30, { m: 0, r: 0.75, panel: false }), DK = K.M(0x3a1a10, { m: 0.2, r: 0.6, panel: false });
    K.ext([-52, 14, -40, -16, 40, -16, 52, 14], 1, SL, 30, 0.3);
    for (let k = -3; k <= 3; k++) K.bar(k * 13 - 2, -16, k * 15, 14, 31.4, 0.8, 0.6, DK);
    K.bar(-40, -16, 40, -16, 31.4, 1.6, 1, DK);
  },
  d15head(K) {
    const GD = K.M(0xa8600a, { m: 0.55, r: 0.38, cc: 0.8, env: 0.25 }), GD2 = K.M(0x5a3006, { m: 0.55, r: 0.4, cc: 0.8, env: 0.25 }), RD = K.M(0xc01818, { m: 0.4, r: 0.35, cc: 1, panel: false }), WH = K.M(0xf0f0e8, { m: 0.1, r: 0.3, panel: false });
    // 頭朝下（+z）
    K.ext([0, 36, 14, 26, 20, 6, 22, -14, 12, -30, -12, -30, -22, -14, -20, 6, -14, 26], 8, GD, 0, 2);
    K.ext([0, 30, 10, 22, 14, 6, -14, 6, -10, 22], 3, GD2, 8, 1);
    K.ext([-10, 34, 10, 34, 8, 40, -8, 40], 3, RD, 2, 0.6);
    for (const s of [-1, 1]) {
      K.ext([s * 8, -20, s * 26, -44, s * 22, -46, s * 4, -26], 3, GD2, 8, 0.6); K.ext([s * 14, -32, s * 30, -36, s * 26, -40], 2, GD2, 9, 0.4);
      K.sph(4, 3, 4, s * 12, 11, 8, K.G(0x60e8ff, 3));
      for (let k = 0; k < 3; k++) K.ext([s * (20 - k * 2), -6 + k * 10, s * (30 - k * 2), -10 + k * 10, s * (22 - k * 2), 0 + k * 10], 1.4, RD, 4, 0.3);
      K.ext([s * 4, 36, s * 6, 42, s * 2, 40], 1, WH, 4, 0.2);
    }
    K.bar(0, -26, 0, 20, 11.4, 2, 0.6, K.G(0x60e8ff, 2));
  },
  d15seg(K) {
    const GD = K.M(0x9a560a, { m: 0.55, r: 0.4, cc: 0.8, env: 0.25 }), GD2 = K.M(0xd89a28, { m: 0.6, r: 0.3, cc: 1, panel: false, env: 0.3 }), RD = K.M(0xc01818, { m: 0.4, r: 0.35, cc: 1, panel: false });
    K.sph(17, 10, 15, 0, 2, 0, GD);
    for (let k = 0; k < 3; k++) K.ext([-10 + k * 1, -8 + k * 6, 10 - k * 1, -8 + k * 6, 0, -2 + k * 6], 1.4, GD2, 9, 0.3);
    K.ext([-3, -10, 3, -10, 0, -18], 3, RD, 8, 0.4);
    for (const s of [-1, 1]) K.ext([s * 14, -2, s * 24, 6, s * 16, 6], 1, RD, 3, 0.3);
    K.torus(15.5, 0.8, 0, 3, 0, K.G(0x50e0ff, 1.6));
  },
  d15tail(K) {
    const GD = K.M(0x9a560a, { m: 0.55, r: 0.4, cc: 0.8, env: 0.25 }), RD = K.M(0xc01818, { m: 0.4, r: 0.35, cc: 1, panel: false });
    K.sph(11, 7, 12, 0, 2, -12, GD);
    K.ext([0, -4, 16, 10, 8, 28, 0, 18, -8, 28, -16, 10], 1.6, RD, 3, 0.4);
  },
  d15pearl(K) { K.sph(11, 11, 11, 0, 0, 0, K.G(0xffd070, 3)); K.torus(13, 1, 0, 0, 0, K.M(0xd8a830, { m: 0.95, r: 0.2, cc: 1, panel: false })); },
});
EXTRA_BAKES.push(
  ['kite', 26, 32, EXTRA_MODELS.kite, { glow: 0.7 }],
  ['lant', 18, 22, EXTRA_MODELS.lant, { glow: 0.6 }],
  ['fanship', 34, 30, EXTRA_MODELS.fanship, { glow: 0.8 }],
  ['bell', 34, 34, EXTRA_MODELS.bell],
  ['junk', 76, 216, EXTRA_MODELS.junk],
  ['junkSail', 110, 36, EXTRA_MODELS.junkSail],
  ['d15head', 64, 92, EXTRA_MODELS.d15head, { glow: 0.9 }],
  ['d15seg', 50, 42, EXTRA_MODELS.d15seg],
  ['d15tail', 36, 44, EXTRA_MODELS.d15tail],
  ['d15pearl', 32, 32, EXTRA_MODELS.d15pearl, { glow: 1 }],
);

// ================= 波次、關卡、音樂 =================
Object.assign(WAVES, {
  kitesL: q => { for (let i = 0; i < 7; i++) q(i * 0.2, () => spawn('kite', 70 + i * 10, -16, { dir: 1, ph: i * 0.5 })); return 3; },
  kitesR: q => { for (let i = 0; i < 7; i++) q(i * 0.2, () => spawn('kite', 290 - i * 10, -16, { dir: -1, ph: i * 0.5 })); return 3; },
  lanterns: q => { const x0 = rnd(60, 120); for (let i = 0; i < 6; i++) q(i * 0.35, () => spawn('lant', x0 + i * 40 + rnd(-8, 8), H + 20)); return 2.2; },
  fans: q => { [100, 260].forEach((x, i) => q(i * 0.8, () => spawn('fanship', x, -20, { stop: 120 + i * 50 }))); return 4.2; },
  junk: q => { q(0, () => spawn('junk', 180, -120)); return 12; },
});
STAGES.push({ name: '楓紅古都', en: 'AUTUMN CAPITAL', boss: 'boss15', amb: 'maple', speed: 50, bossSong: 'final',
  seq: ['kitesL', 'fans', 'lanterns', 'carrierP', 'kitesR', 'icpt', 'fans', 'crates', 'carrierS', 'carrierO', 'kitesL', 'lanterns', 'jetsUp', 'fans', 'snakeL', 'carrierP', 'junk', 'kitesR', 'lanterns', 'fans', 'fDive', 'carrierB', 'kitesL', 'fans', 'lanterns', 'fSine', 'kitesR'] });
Object.assign(SONGS, {
  s14: { bpm: 132, key: 45, prog: [[0, 'm'], [-2, 'M'], [-4, 'M'], [-5, 'M'], [0, 'm'], [3, 'M'], [5, 'm'], [-5, 'M']], seed: 349, drums: 2, lead: 'triangle', arpW: 'square', pad: 1, arp: [0, 2, 7, 9, 12, 9, 7, 2] },
});
BOSS_INFO.boss15 = { img: 'd15head', cls: '古都守護機械龍', threat: 5, col: '#ffd23f' };
MID_INFO.junk = '飛天戰船';
