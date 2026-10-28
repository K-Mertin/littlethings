// 千軍突圍 — 守城模式的畫面
'use strict';

function buildDefArt() {
  const A = ART.def = {};
  // 敵方基地（正面）
  A.base = [false, true].map(rage => mk(512, 384, g => {
    const W = 512, H = 384;
    // 兩座塔
    for (const x of [70, 442]) {
      g.fillStyle = lin(g, x - 60, 0, x + 60, 0, ['#3a2f45', '#6a5878', '#2c2436']);
      g.fillRect(x - 56, 90, 112, 294);
      g.fillStyle = '#2c2436'; for (let k = -2; k <= 2; k++) g.fillRect(x + k * 24 - 9, 66, 18, 30);
      g.fillStyle = rage ? '#ff5a3a' : '#ffcc55'; for (const y of [150, 230]) { rr(g, x - 12, y, 24, 34, 12); g.fill(); }
      g.fillStyle = '#c0392b'; poly(g, [x, 10, x + 50, 30, x, 46]); g.fill();
      g.fillStyle = '#5a4a3a'; g.fillRect(x - 3, 10, 6, 60);
    }
    // 城牆
    g.fillStyle = lin(g, 0, 140, 0, 384, ['#5e4d6e', '#3a2f45']);
    g.fillRect(110, 150, 292, 234);
    g.fillStyle = '#3a2f45'; for (let k = 0; k < 7; k++) g.fillRect(118 + k * 42, 126, 26, 30);
    // 磚紋
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
    for (let y = 170; y < 384; y += 26) { g.beginPath(); g.moveTo(110, y); g.lineTo(402, y); g.stroke(); }
    // 大門
    g.fillStyle = '#1c1520'; g.beginPath(); g.moveTo(196, 384); g.lineTo(196, 270); g.quadraticCurveTo(256, 200, 316, 270); g.lineTo(316, 384); g.fill();
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 6; for (let x = 212; x < 316; x += 22) { g.beginPath(); g.moveTo(x, 384); g.lineTo(x, 250 + Math.abs(x - 256) * 0.6); g.stroke(); }
    // 骷髏旗
    g.fillStyle = rage ? '#ff3b3b' : '#e8453c'; rr(g, 226, 160, 60, 48, 6); g.fill();
    g.fillStyle = '#fff'; ell(g, 256, 180, 13, 12); g.fill(); g.fillRect(248, 186, 16, 10);
    g.fillStyle = '#1c1520'; ell(g, 251, 180, 3.5, 4); g.fill(); ell(g, 261, 180, 3.5, 4); g.fill();
    // 火把光
    if (rage) { g.fillStyle = 'rgba(255,80,40,.25)'; g.fillRect(110, 150, 292, 234); }
  }));
  A.baseFlash = A.base.map(flashOf);
  // 砲台
  A.cannon = mk(220, 200, g => {
    // 輪子
    for (const x of [44, 176]) {
      g.fillStyle = '#5a3a1a'; ell(g, x, 160, 34, 34); g.fill();
      g.fillStyle = '#8a5a2a'; ell(g, x, 160, 26, 26); g.fill();
      g.strokeStyle = '#3a2410'; g.lineWidth = 5; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(x - Math.cos(a) * 24, 160 - Math.sin(a) * 24); g.lineTo(x + Math.cos(a) * 24, 160 + Math.sin(a) * 24); g.stroke(); }
      g.fillStyle = '#c9a050'; ell(g, x, 160, 8, 8); g.fill();
    }
    // 底座
    g.fillStyle = lin(g, 30, 0, 190, 0, ['#2a5fb0', '#4f95ff', '#1d4a90']); rr(g, 30, 110, 160, 50, 14); g.fill();
    g.fillStyle = '#ffd34d'; rr(g, 30, 110, 160, 8, 4); g.fill();
    // 砲管（朝遠方，從後面看是一個圓）
    g.fillStyle = lin(g, 60, 0, 160, 0, ['#3a4252', '#9aa6ba', '#2a303e']); rr(g, 62, 40, 96, 86, 30); g.fill();
    g.fillStyle = '#20242e'; ell(g, 110, 62, 30, 18); g.fill();
    g.fillStyle = '#ffd34d'; rr(g, 62, 92, 96, 10, 4); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)'; rr(g, 70, 46, 18, 60, 9); g.fill();
  });
  // 巨人（金色士兵）
  A.giant = ART.soldierV[0].map(fr => mk(fr.width, fr.height, g => { g.drawImage(fr, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,200,40,.45)'; g.fillRect(0, 0, fr.width, fr.height); }));
}

function renderDef(G, t) {
  const g = R.g, th = G.L.theme;
  R.camX = G.px * 0.15;
  if (R.bgKey !== th.id + R.W + 'x' + R.H) { R.bg = buildBg(th); R.bgKey = th.id + R.W + 'x' + R.H; R.sun = null; }
  if (!R.vig) R.vig = vignette();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const sh = G.shake * 9 * R.dpr * R.q;
  g.translate(sh ? (Math.random() - 0.5) * sh : 0, sh ? (Math.random() - 0.5) * sh : 0);
  if (R.hy > 2) g.drawImage(R.bg, -R.bgPad - R.camX * 2 * R.dpr, 0);
  drawClouds(g, th, t);
  drawGround(g, th, 0);
  drawGroundDetail(g, th, 0);
  for (const o of G.objs) if (o.t === 'geyser') drawGeyserGround(g, o, t); else if (o.t === 'pool') drawPool(g, o, t);
  // 自己這邊的城牆線
  const a = P(-ROAD, 0.2, 0), b = P(ROAD, 0.2, 0);
  g.strokeStyle = 'rgba(80,170,255,.75)'; g.lineWidth = Math.max(3, 0.12 * a.s);
  g.setLineDash([14 * R.dpr, 10 * R.dpr]); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]);
  for (const e of G.fx) if (e.k === 'ring') drawRing(g, e);

  const items = R.items || (R.items = []);
  items.length = 0;
  const SP = 4.2;
  for (let k = -2; k <= 16; k++) for (const side of [-1, 1]) {
    const h = hash(k * 2 + (side > 0 ? 1 : 0) + th.id.length * 1000 + 55);
    if (h % 10 < 3) continue;
    const kind = th.decor[(h >>> 4) % th.decor.length];
    const far = kind === 'building' || kind === 'mesa' || kind === 'windmill';
    const x = side * (ROAD + (far ? 5.5 : 1.9) + ((h >>> 9) % 70) / 10);
    const z = k * SP + ((h >>> 3) % 20) / 10;
    if (z < -Z0 + 1 || z > DEF_Z_BASE + 6) continue;
    items.push({ z, kind, x, v: (h >>> 12) % 3, sc: 0.8 + ((h >>> 15) % 50) / 100 });
  }
  fenceItems(items, th, 0);
  for (const o of G.objs) items.push({ z: o.z, o });
  for (const e of G.fx) if (e.k !== 'ring' && !(e.k === 'die' && e.boss)) items.push({ z: e.z - 0.05, e });
  // 小兵一批一批排序（太多的時候每個都排很慢）
  for (const u of G.units) items.push({ z: u.z, u });
  items.push({ z: DEF_Z_BASE + 0.5, base: 1 });
  items.push({ z: DEF_Z_CANNON, cannon: 1 });
  items.sort((p, q) => q.z - p.z);
  for (const it of items) {
    if (it.kind) drawDecor(g, it);
    else if (it.fence) drawFence(g, it, th);
    else if (it.e) drawFxItem(g, it.e);
    else if (it.u) drawUnit(g, it.u);
    else if (it.base) drawBase(g, G, t);
    else if (it.cannon) drawCannon(g, G, t);
    else {
      const o = it.o;
      if (o.t === 'gate') drawGate(g, o, t);
      else if (o.t === 'en') drawEnemy(g, o);
      else if (o.t === 'geyser') drawGeyserPlume(g, o, t);
    }
  }
  drawParts(g, G);
  drawFloats(g, G);
  drawWeather(g, th, t);
  if (th.dark) { g.fillStyle = 'rgba(30,10,60,.12)'; g.fillRect(-20, -20, R.W + 40, R.H + 40); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(R.vig, 0, 0);
  if (G.flash > 0) { g.fillStyle = `rgba(255,60,60,${G.flash * 0.3})`; g.fillRect(0, 0, R.W, R.H); }
}

function drawUnit(g, u) {
  const p = P(u.x, u.z, 0);
  if (u.giant) {
    const spr = ART.def.giant[Math.floor(u.ph / (Math.PI / 2)) & 3];
    const h = (spr.wh ? spr.wh * 2.06 : 2.1) * p.s, w = h * spr.width / spr.height;
    drawShadow(g, p.x, p.y, 1.3 * p.s);
    g.drawImage(spr, p.x - w / 2, p.y - h * (1 - (spr.foot || 0)), w, h);
    const hb = w * 0.8;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(p.x - hb / 2, p.y - h - 0.15 * p.s, hb, Math.max(3, 0.08 * p.s));
    g.fillStyle = '#ffd34d'; g.fillRect(p.x - hb / 2, p.y - h - 0.15 * p.s, hb * clamp(u.hp / (24 * G.pow), 0, 1), Math.max(3, 0.08 * p.s));
    return;
  }
  const spr = (u.pw && ART.def.giant ? ART.def.giant : ART.soldierV[u.v])[Math.floor(u.ph / (Math.PI / 2)) & 3];
  const k = (1 + u.pop * 0.5) * (u.pw ? 1.15 : 1);
  const h = (spr.wh ? spr.wh * 0.765 : 0.78) * p.s * k, w = h * spr.width / spr.height;
  g.drawImage(spr, p.x - w / 2, p.y - h * (1 - (spr.foot || 0)), w, h);
}

function drawBase(g, G, t) {
  const b = G.base;
  if (b.hp <= 0 && G.st !== 'play' && (G.t - (b.deadAt || G.t)) > 1.8) return;
  const p = P(0, DEF_Z_BASE + 0.5, 0);
  const spr = (b.hit > 0 ? ART.def.baseFlash : ART.def.base)[b.rage ? 1 : 0];
  const h = spr.wh ? spr.wh * p.s : 9.5 * p.s * 0.75, w = spr.wh ? h * spr.width / spr.height : 9.5 * p.s, ft = spr.foot || 0;
  const jx = b.hit > 0 ? (Math.random() - 0.5) * 0.08 * p.s : 0;
  const sink = b.hp <= 0 ? Math.min(h * 0.6, (G.t - (b.deadAt || G.t)) * h * 0.4) : 0;
  drawShadow(g, p.x, p.y, w * 1.1);
  g.save();
  g.beginPath(); g.rect(p.x - w, p.y - h - 20, w * 2, h * (1 + ft) + 20); g.clip();
  g.drawImage(spr, p.x - w / 2 + jx, p.y - h * (1 - ft) + sink, w, h);
  g.restore();
}

function drawCannon(g, G, t) {
  const p = P(G.px, DEF_Z_CANNON, 0);
  const CN = ART.def.cannon;
  const h = CN.wh ? CN.wh * p.s : 2.1 * p.s * 200 / 220, w = CN.wh ? h * CN.width / CN.height : 2.1 * p.s;
  drawShadow(g, p.x, p.y, 2.3 * p.s);
  const kick = G.fireAcc < 0.25 ? (0.25 - G.fireAcc) * 0.1 * p.s : 0;
  g.drawImage(CN, p.x - w / 2, p.y - h * (1 - (CN.foot || 0)) + kick, w, h);
  // 砲口火光
  if (G.st === 'play' && G.fireAcc < 0.3) {
    const m = P(G.px, DEF_Z_CANNON + 0.4, 1.35), s = 0.9 * m.s;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - G.fireAcc / 0.3;
    g.drawImage(ART.flash.y, m.x - s / 2, m.y - s / 2, s, s);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
}

function drawDefHud(G) {
  const g = R.g, u = R.u * R.dpr;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const top = (R.safeTop || 0) * R.dpr + 10 * u;
  const cx = R.W / 2;
  // 敵方基地血條
  const BW = Math.min(R.W - 130 * u, 300 * u), by = top + 4 * u;
  const b = G.base;
  g.fillStyle = 'rgba(10,10,20,.72)'; rr(g, cx - BW / 2, by, BW, 26 * u, 9 * u); g.fill();
  const k = clamp(b.hp / b.max, 0, 1);
  g.fillStyle = lin(g, cx - BW / 2, 0, cx + BW / 2, 0, b.rage ? ['#ff2b4b', '#ff7a3a'] : ['#c93cff', '#ff4f7a']);
  if (k > 0) { rr(g, cx - BW / 2 + 3 * u, by + 3 * u, Math.max(6 * u, (BW - 6 * u) * k), 20 * u, 7 * u); g.fill(); }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${13 * u}px "Noto Sans TC",system-ui,sans-serif`;
  g.fillText(`敵方基地 ${fmtNum(Math.max(0, b.hp))}`, cx, by + 13.5 * u);
  // 關卡名
  g.font = `900 ${12 * u}px "Noto Sans TC",system-ui,sans-serif`;
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 4 * u;
  const lab = `守城 ${G.s} · ${G.L.name}`;
  g.strokeText(lab, cx, by + 40 * u); g.fillText(lab, cx, by + 40 * u);
  // 自己的城：血條（左下）
  const bw2 = 150 * u, bx2 = 12 * u, by2 = R.H - 40 * u - (R.safeBot || 0) * R.dpr;
  g.fillStyle = 'rgba(10,14,24,.7)'; rr(g, bx2, by2, bw2, 28 * u, 10 * u); g.fill();
  const kc = clamp(G.castle / G.castleMax, 0, 1);
  g.fillStyle = kc > 0.5 ? '#33d17a' : kc > 0.25 ? '#ffb03a' : '#ff4040';
  if (kc > 0) { rr(g, bx2 + 30 * u, by2 + 7 * u, (bw2 - 38 * u) * kc, 14 * u, 7 * u); g.fill(); }
  g.fillStyle = '#fff'; g.font = `900 ${15 * u}px system-ui,sans-serif`; g.textAlign = 'center'; g.fillText('🏰', bx2 + 16 * u, by2 + 15 * u);
  // 場上小兵數
  g.textAlign = 'left'; g.font = `900 ${13 * u}px "Noto Sans TC",system-ui,sans-serif`;
  g.strokeText(`場上小兵 ${G.units.length}`, bx2 + 2 * u, by2 - 12 * u); g.fillText(`場上小兵 ${G.units.length}`, bx2 + 2 * u, by2 - 12 * u);
}
