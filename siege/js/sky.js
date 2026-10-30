// 萬軍守城（複製自千軍突圍 rush/js）— 第六世界「天空浮島」：場景、疾風鷹、氣球炸彈兵、雷霆巨鷹、強風、雷擊、斷橋的畫法
// （2D 版本；3D 模型在 sky3d.js，烤好會換掉這裡的圖）
'use strict';

// ---------- 路邊裝飾 ----------
DECOR.cloudpuff = (g, W, H, v) => {
  const s = H / 100, cx = W / 2;
  const puffs = [[-30, 72, 26], [0, 60, 34], [30, 70, 28], [-12, 80, 24], [16, 82, 22], [44, 82, 18], [-44, 84, 16]];
  g.fillStyle = 'rgba(150,180,220,.35)'; ell(g, cx, 96 * s, 46 * s, 6 * s); g.fill();
  for (const [x, y, r] of puffs) { g.fillStyle = radial(g, cx + (x - r * 0.3) * s, (y - r * 0.4) * s, r * 1.3 * s, '#ffffff', '#c9dcf4'); ell(g, cx + x * s, y * s, r * s, r * 0.82 * s); g.fill(); }
  if (v === 2) { g.fillStyle = '#ffe680'; poly(g, [cx + 6 * s, 36 * s, cx + 10 * s, 26 * s, cx + 14 * s, 36 * s, cx + 24 * s, 38 * s, cx + 15 * s, 44 * s, cx + 18 * s, 54 * s, cx + 10 * s, 47 * s, cx + 2 * s, 54 * s, cx + 5 * s, 44 * s, cx - 4 * s, 38 * s]); g.fill(); }
};
DECOR.floatrock = (g, W, H, v) => {
  const s = H / 100, cx = W / 2, lift = 18;
  g.fillStyle = 'rgba(120,150,200,.3)'; ell(g, cx, 97 * s, 30 * s, 4 * s); g.fill();
  // 底下的岩石（倒三角）
  g.fillStyle = lin(g, cx - 40 * s, 0, cx + 40 * s, 0, ['#8a7a6a', '#b8a48c', '#6a5a4c']);
  poly(g, [cx - 42 * s, (52 - lift) * s + 24 * s, cx + 42 * s, (52 - lift) * s + 24 * s, cx + 20 * s, (80 - lift) * s + 18 * s, cx + 4 * s, (100 - lift) * s, cx - 14 * s, (86 - lift) * s + 10 * s]); g.fill();
  // 草地頂
  g.fillStyle = lin(g, 0, 50 * s, 0, 64 * s, ['#7ed35a', '#4f9a3a']); ell(g, cx, (58 - lift + 24) * s, 44 * s, 10 * s); g.fill();
  // 小樹或花
  if (v !== 1) { g.fillStyle = '#6a4a2a'; g.fillRect(cx - 2 * s, (30 - lift + 24) * s, 4 * s, 26 * s); g.fillStyle = radial(g, cx - 4 * s, (24 - lift + 24) * s, 18 * s, '#9fe07a', '#3f8a32'); ell(g, cx, (28 - lift + 24) * s, 16 * s, 14 * s); g.fill(); }
  else for (let i = 0; i < 5; i++) { g.fillStyle = ['#ff6f9e', '#ffd34d', '#ffffff'][i % 3]; ell(g, cx + (i - 2) * 12 * s, (56 - lift + 24) * s, 3.5 * s, 3.5 * s); g.fill(); }
  // 垂下的根
  g.strokeStyle = 'rgba(80,60,40,.6)'; g.lineWidth = 1.5 * s;
  for (const x of [-18, -4, 12]) { g.beginPath(); g.moveTo(cx + x * s, (76 - lift + 24) * s); g.quadraticCurveTo(cx + (x + 4) * s, (84 - lift + 24) * s, cx + x * s, (92 - lift + 20) * s); g.stroke(); }
};
DECOR.balloon = (g, W, H, v) => {
  const s = H / 100, cx = W / 2;
  const cols = [['#ff5a5a', '#ffd34d'], ['#4fa3ff', '#ffffff'], ['#8a6bff', '#ffb0e0']][v % 3];
  g.fillStyle = 'rgba(120,150,200,.3)'; ell(g, cx, 98 * s, 16 * s, 3 * s); g.fill();
  // 氣球（條紋）
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[i % 2];
    g.beginPath(); g.moveTo(cx, 6 * s);
    const a0 = -1 + i / 3, a1 = -1 + (i + 1) / 3;
    g.bezierCurveTo(cx + a0 * 46 * s, 6 * s, cx + a0 * 40 * s, 46 * s, cx + a0 * 12 * s, 58 * s);
    g.lineTo(cx + a1 * 12 * s, 58 * s);
    g.bezierCurveTo(cx + a1 * 40 * s, 46 * s, cx + a1 * 46 * s, 6 * s, cx, 6 * s); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.3)'; ell(g, cx - 14 * s, 22 * s, 6 * s, 12 * s); g.fill();
  g.strokeStyle = '#5a4a3a'; g.lineWidth = 1.5 * s;
  for (const x of [-10, 10]) { g.beginPath(); g.moveTo(cx + x * s, 58 * s); g.lineTo(cx + x * 0.7 * s, 74 * s); g.stroke(); }
  g.fillStyle = lin(g, 0, 74 * s, 0, 86 * s, ['#b8864a', '#7a5228']); rr(g, cx - 9 * s, 74 * s, 18 * s, 12 * s, 2 * s); g.fill();
};
DECOR.skytower = (g, W, H, v) => {
  const s = H / 100, cx = W / 2;
  g.fillStyle = 'rgba(120,150,200,.3)'; ell(g, cx, 98 * s, 22 * s, 3 * s); g.fill();
  g.fillStyle = lin(g, cx - 14 * s, 0, cx + 14 * s, 0, ['#d8e2ee', '#ffffff', '#b8c8dc']);
  g.beginPath(); g.moveTo(cx - 14 * s, 98 * s); g.lineTo(cx - 10 * s, 26 * s); g.lineTo(cx + 10 * s, 26 * s); g.lineTo(cx + 14 * s, 98 * s); g.closePath(); g.fill();
  g.fillStyle = '#ffc83d'; g.beginPath(); g.ellipse(cx, 26 * s, 13 * s, 12 * s, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#e8a820'; g.fillRect(cx - 13 * s, 25 * s, 26 * s, 3 * s);
  for (const y of [40, 58, 76]) { g.fillStyle = '#4f9cff'; rr(g, cx - 3 * s, y * s, 6 * s, 9 * s, 3 * s); g.fill(); }
  g.strokeStyle = '#8a7a6a'; g.lineWidth = 1.5 * s; g.beginPath(); g.moveTo(cx, 14 * s); g.lineTo(cx, 4 * s); g.stroke();
  g.fillStyle = ['#ff5a5a', '#4fa3ff', '#8a6bff'][v % 3]; poly(g, [cx, 4 * s, cx + 12 * s, 7 * s, cx, 10 * s]); g.fill();
};
Object.assign(DECOR_SIZE, { cloudpuff: [3.2, 1.8], floatrock: [3.0, 3.4], balloon: [2.0, 4.4], skytower: [2.4, 6.0] });

// ---------- 新怪物（正面，4 格） ----------
function drawEagle2(g, W, H, f) {
  const u = H / 100, flap = [1, 0.3, -0.7, 0.3][f];
  g.save(); g.translate(W / 2, H * 0.5); g.scale(u, u);
  for (const sd of [-1, 1]) {
    g.save(); g.scale(sd, 1); g.rotate(-flap * 0.35);
    g.fillStyle = lin(g, 0, -10, 70, 10, ['#6a4a2a', '#a8784a', '#4a321a']);
    g.beginPath(); g.moveTo(10, -6); g.quadraticCurveTo(40, -30, 76, -18); g.lineTo(66, -6); g.lineTo(72, 2); g.lineTo(58, 6); g.lineTo(62, 14); g.lineTo(40, 12); g.quadraticCurveTo(22, 10, 10, 8); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(14, -4); g.quadraticCurveTo(40, -24, 70, -16); g.lineTo(40, -10); g.closePath(); g.fill();
    g.restore();
  }
  g.fillStyle = rad(g, -3, -6, 22, '#c89a62', '#6a4a2a'); ell(g, 0, 0, 16, 22); g.fill();
  g.fillStyle = '#fff6e8'; ell(g, 0, -20, 13, 12); g.fill();
  g.fillStyle = '#ffc020'; poly(g, [-5, -16, 5, -16, 0, -4]); g.fill();
  for (const sd of [-1, 1]) { g.fillStyle = '#1a1206'; ell(g, sd * 6, -22, 2.6, 2.8); g.fill(); g.strokeStyle = '#1a1206'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(sd * 10, -28); g.lineTo(sd * 2, -25); g.stroke(); }
  g.fillStyle = '#ffc020'; for (const sd of [-1, 1]) { rr(g, sd * 6 - 2, 18, 4, 8, 2); g.fill(); }
  g.restore();
}
function drawBomber2(g, W, H, f) {
  const u = H / 100, bob = [0, -1.5, 0, 1.5][f];
  g.save(); g.translate(W / 2, bob * u); g.scale(u, u);
  // 氣球
  g.fillStyle = rad(g, -8, 18, 30, '#ff8a8a', '#c82a2a'); ell(g, 0, 26, 24, 26); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; ell(g, -9, 16, 5, 9); g.fill();
  g.strokeStyle = '#5a3a2a'; g.lineWidth = 1.2; for (const x of [-8, 8]) { g.beginPath(); g.moveTo(x, 48); g.lineTo(x * 0.6, 60); g.stroke(); }
  // 小鬼本體（坐在籃子裡）
  g.fillStyle = lin(g, 0, 58, 0, 80, ['#b8864a', '#7a5228']); rr(g, -16, 66, 32, 16, 4); g.fill();
  g.fillStyle = rad(g, -3, 58, 14, '#a8e07a', '#4f9a3a'); ell(g, 0, 60, 12, 11); g.fill();
  eyes2(g, 0, 59, 4.2, 4.5, true, '#1d2a10');
  g.fillStyle = '#2a2f3c'; ell(g, 15, 66, 6, 6); g.fill(); g.fillStyle = '#ffd34d'; ell(g, 17, 60, 1.8, 1.8); g.fill();
  g.restore();
}

// ---------- 場景零件 ----------
function buildSky() {
  const S = ART.scene;
  const puff = mk(64, 40, g => { for (const [x, y, r] of [[18, 26, 12], [32, 22, 15], [46, 27, 11]]) { g.fillStyle = rad(g, x - 3, y - 4, r * 1.2, '#ffffff', '#d4e2f6'); ell(g, x, y, r, r * 0.7); g.fill(); } });
  const feather = mk(48, 32, g => { g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(8, 26); g.quadraticCurveTo(24, 10, 40, 6); g.stroke(); g.fillStyle = 'rgba(200,220,255,.9)'; g.beginPath(); g.ellipse(26, 15, 14, 4, -0.5, 0, 7); g.fill(); });
  const sparkle = mk(32, 32, g => { g.fillStyle = 'rgba(255,240,160,.95)'; poly(g, [16, 2, 19, 13, 30, 16, 19, 19, 16, 30, 13, 19, 2, 16, 13, 13]); g.fill(); });
  const flower = mk(48, 32, g => { for (let i = 0; i < 4; i++) { g.fillStyle = ['#ff8ac0', '#ffe14f', '#9fd0ff', '#ffffff'][i]; ell(g, 8 + i * 10, 18 + (i % 2) * 4, 4, 4); g.fill(); } });
  S.detail.sky = [puff, feather, sparkle, flower];
  S.post.sky = mk(32, 96, g => { g.fillStyle = lin(g, 8, 0, 24, 0, ['#c8d4e4', '#ffffff', '#a8b8cc']); rr(g, 10, 12, 12, 84, 3); g.fill(); g.fillStyle = '#ffc83d'; ell(g, 16, 12, 8, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; ell(g, 14, 10, 3, 2); g.fill(); });
  S.rail.sky = ['#e8d9a8', '#ffffff'];

  const enemy = (fn, w, h, ol) => {
    const fr = [0, 1, 2, 3].map(f => outlined(mk(w, h, (g, W, H) => fn(g, W, H, f)), ol, 2.6));
    return { fr, fl: fr.map(flashOf) };
  };
  ART.eagle = enemy(drawEagle2, 220, 150, 'rgba(50,30,10,.92)');
  ART.bomber = enemy(drawBomber2, 150, 200, 'rgba(60,10,10,.92)');

  const H = ART.haz;
  H.proj.orb = mk(64, 64, g => { g.fillStyle = rad(g, 32, 32, 30, '#ffffff', 'rgba(80,160,255,0)'); ell(g, 32, 32, 30, 30); g.fill(); g.fillStyle = rad(g, 30, 30, 14, '#ffffff', '#5ab8ff'); ell(g, 32, 32, 14, 14); g.fill(); g.strokeStyle = '#e8f6ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(14, 24); g.lineTo(28, 32); g.lineTo(22, 40); g.lineTo(46, 30); g.stroke(); });
  H.projCol.orb = '110,190,255';

  // 雲海（斷橋下面）與木板橋
  ART.gapSea = mk(256, 64, g => {
    g.fillStyle = lin(g, 0, 0, 0, 64, ['#bcd8f8', '#8fbcef', '#6fa4e6']); g.fillRect(0, 0, 256, 64);
    const r = rng(91);
    for (let i = 0; i < 22; i++) { const x = r() * 256, y = r() * 64, w = 18 + r() * 34; g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.4})`; ell(g, x, y, w, 4 + r() * 6); g.fill(); }
  });
  ART.plank = mk(128, 64, g => {
    g.fillStyle = '#7a5a36'; g.fillRect(0, 0, 128, 64);
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#a07a4c' : '#b48a58'; g.fillRect(2, k * 8 + 1, 124, 6); }
    g.fillStyle = '#5a3e22'; for (const x of [10, 118]) g.fillRect(x - 3, 0, 6, 64);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(2, 1, 124, 2);
  });
}

// ---------- 遠景：浮島和雲海 ----------
function bgSky(g, CW, hy, r) {
  // 太陽
  g.fillStyle = radial(g, CW * 0.2, hy * 0.25, hy * 0.5, 'rgba(255,250,220,.95)', 'rgba(255,250,220,0)', 0, 0); ell(g, CW * 0.2, hy * 0.25, hy * 0.5, hy * 0.5); g.fill();
  // 遠方的浮島
  for (let i = 0; i < 6; i++) {
    const x = r() * CW, y = hy * (0.3 + r() * 0.4), w = hy * (0.12 + r() * 0.18);
    g.fillStyle = 'rgba(150,170,200,.55)'; poly(g, [x - w, y, x + w, y, x + w * 0.3, y + w * 0.9, x - w * 0.2, y + w * 0.6]); g.fill();
    g.fillStyle = 'rgba(140,200,140,.6)'; ell(g, x, y, w, w * 0.2); g.fill();
  }
  // 雲海
  for (let layer = 0; layer < 3; layer++) {
    const y0 = hy * (0.72 + layer * 0.1);
    g.fillStyle = ['rgba(255,255,255,.55)', 'rgba(240,248,255,.75)', 'rgba(255,255,255,.95)'][layer];
    for (let x = -40; x < CW + 40; x += hy * 0.18) { const rr0 = hy * (0.08 + r() * 0.08); ell(g, x, y0 + r() * hy * 0.04, rr0 * 1.6, rr0); g.fill(); }
    g.fillRect(0, y0 + hy * 0.04, CW, hy);
  }
}

// ---------- 斷橋（雲海＋木板橋）----------
function drawGap(g, o, t) {
  const z0 = Math.max(o.z, -Z0 + 0.6), z1 = o.z + o.len;
  if (z1 <= z0 || o.z > ZSPAWN) return;
  const a = P(-ROAD - 1.2, z0, 0), b = P(ROAD + 1.2, z1, 0), a2 = P(ROAD + 1.2, z0, 0);
  const off = (t * 18) % 128;
  g.save();
  quadW(g, -ROAD - 1.2, z0, ROAD + 1.2, z1); g.clip();
  const w = a2.x - a.x, h = a.y - b.y;
  for (let x = a.x - off * w / 256 * 0.5 - w; x < a2.x; x += w * 0.5) g.drawImage(ART.gapSea, x, b.y, w * 0.5 + 1, h);
  // 往下看的深度感
  g.fillStyle = 'rgba(40,80,160,.18)'; g.fillRect(a.x, b.y, w, h);
  g.restore();
  // 斷掉的橋邊
  g.strokeStyle = '#6a4a2a'; g.lineWidth = Math.max(2, 0.12 * a.s);
  for (const z of [o.z, z1]) { if (z < -Z0 + 0.6) continue; const p = P(-ROAD - 1.2, z, 0), q = P(ROAD + 1.2, z, 0); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); }
  // 木板橋（有繩子）
  for (const br of o.bridges) {
    const za = Math.max(o.z - 0.35, -Z0 + 0.6), zb = z1 + 0.35;
    if (zb <= za) continue;
    const p = P(br.x - br.w, za, 0), q = P(br.x + br.w, zb, 0), p2 = P(br.x + br.w, za, 0);
    g.drawImage(ART.plank, p.x, q.y, p2.x - p.x, p.y - q.y);
    g.strokeStyle = o.burn ? '#ff5a3a' : '#ffe08a'; g.lineWidth = Math.max(1.5, 0.05 * p.s);
    quadW(g, br.x - br.w, za, br.x + br.w, zb); g.stroke();
    for (const sx of [-1, 1]) { const c = P(br.x + sx * br.w, za, 0.6), d = P(br.x + sx * br.w, zb, 0.6); g.strokeStyle = '#d8c090'; g.lineWidth = Math.max(1, 0.04 * c.s); g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(d.x, d.y); g.stroke(); }
  }
}

// ---------- 雷擊（地上的藍圈）----------
function drawBoltGround(g, o, t) {
  if (o.z > ZSPAWN || o.z < -Z0 + 0.8) return;
  const m = P(o.x, o.z, 0), a = P(o.x, o.z - o.r, 0), b = P(o.x, o.z + o.r, 0);
  const rx = o.r * m.s, ry = Math.max(2, (a.y - b.y) / 2), cy = (a.y + b.y) / 2;
  if (o.warn > 0) {
    const q = clamp(1 - o.warn / 1.25, 0, 1);
    g.fillStyle = `rgba(110,190,255,${0.15 + q * 0.3})`; g.beginPath(); g.ellipse(m.x, cy, rx * q, ry * q, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(160,220,255,${0.6 + 0.35 * Math.sin(t * 20)})`; g.lineWidth = Math.max(2, 0.07 * m.s);
    g.beginPath(); g.ellipse(m.x, cy, rx, ry, 0, 0, Math.PI * 2); g.stroke();
  } else {
    g.fillStyle = `rgba(30,40,60,${0.5 * clamp(o.flash / 0.28, 0, 1)})`; g.beginPath(); g.ellipse(m.x, cy, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2); g.fill();
  }
}
// 雷霆巨鷹：被標記的兩條路
function drawZap(g, b, t) {
  const zp = b.zap; if (!zp) return;
  const z0 = Math.max(-Z0 + 0.6, -2), z1 = b.z - 0.5;
  for (const lx of zp.lanes) {
    const a = P(lx - 1.3, z0, 0), q = P(lx + 1.3, z1, 0);
    if (zp.t > 0) {
      const k = 1 - zp.t / 1.35;
      g.fillStyle = `rgba(110,190,255,${0.12 + k * 0.28 + 0.08 * Math.sin(t * 22)})`;
      quadW(g, lx - 1.3, z0, lx + 1.3, z1); g.fill();
      g.strokeStyle = 'rgba(200,235,255,.8)'; g.lineWidth = Math.max(2, 0.06 * a.s); quadW(g, lx - 1.3, z0, lx + 1.3, z1); g.stroke();
    } else {
      g.fillStyle = 'rgba(230,245,255,.55)'; quadW(g, lx - 1.3, z0, lx + 1.3, z1); g.fill();
    }
  }
}
// 閃電（畫在最上面）
function boltLine(g, x0, y0, x1, y1, w, seed) {
  const r = rng(seed);
  g.beginPath(); g.moveTo(x0, y0);
  const n = 7;
  for (let i = 1; i < n; i++) { const k = i / n; g.lineTo(lerp(x0, x1, k) + (r() - 0.5) * w * 6, lerp(y0, y1, k)); }
  g.lineTo(x1, y1);
  g.strokeStyle = 'rgba(160,220,255,.6)'; g.lineWidth = w * 3; g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = w; g.stroke();
}
function drawSkyTop(g, G, t) {
  // 閃電
  for (const o of G.objs) {
    if (o.t === 'bolt' && o.warn <= 0 && o.flash > 0 && o.z > -Z0 + 0.6) {
      const p = P(o.x, o.z, 0), top = P(o.x, o.z, 14);
      boltLine(g, top.x + p.s * 0.4, Math.max(-20, top.y), p.x, p.y, Math.max(2, 0.08 * p.s), o.id * 13 + ((t * 30) | 0));
      g.globalCompositeOperation = 'lighter'; const s = 2.6 * p.s; g.drawImage(ART.glowW, p.x - s / 2, p.y - s / 2, s, s); g.globalCompositeOperation = 'source-over';
    }
    if (o.t === 'boss' && o.zap && o.zap.t <= 0 && o.zap.burn > 0) {
      for (const lx of o.zap.lanes) for (const zz of [3, 8, 13]) {
        if (zz > o.z) continue;
        const p = P(lx, zz, 0), top = P(lx, zz, 12);
        boltLine(g, top.x, Math.max(-20, top.y), p.x, p.y, Math.max(2, 0.07 * p.s), lx * 31 + zz + ((t * 30) | 0));
      }
    }
  }
  // 強風：箭頭預告＋風的線條
  const gu = G.gust;
  if (gu && G.st === 'play') {
    const u = R.u * R.dpr, d = gu.dir;
    const y = R.H * 0.45, a = gu.warn > 0 ? 0.55 + 0.45 * Math.sin(t * 14) : 0.9;
    g.save(); g.globalAlpha = a;
    for (let k = 0; k < 3; k++) {
      const x = R.W / 2 + d * (k - 1) * 46 * u;
      g.fillStyle = gu.warn > 0 ? '#ffffff' : '#bfe4ff';
      g.beginPath(); g.moveTo(x + d * 22 * u, y); g.lineTo(x - d * 12 * u, y - 22 * u); g.lineTo(x - d * 4 * u, y); g.lineTo(x - d * 12 * u, y + 22 * u); g.closePath(); g.fill();
    }
    g.font = `900 ${18 * u}px "Noto Sans TC",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 5 * u; g.strokeStyle = 'rgba(20,40,80,.7)'; const txt = gu.warn > 0 ? '強風要來了！' : '強風！';
    g.strokeText(txt, R.W / 2, y - 40 * u); g.fillStyle = '#ffffff'; g.fillText(txt, R.W / 2, y - 40 * u);
    if (gu.warn <= 0) {
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2 * R.dpr;
      for (let i = 0; i < 18; i++) {
        const yy = ((i * 97 + t * 40) % R.H), xx = ((i * 211 + d * t * 900) % (R.W + 200) + R.W + 200) % (R.W + 200) - 100;
        g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx - d * 60 * R.dpr, yy); g.stroke();
      }
    }
    g.restore();
  }
}

// ---------- 頭目：雷霆巨鷹（2D 備用）----------
BOSS_DRAW.thunder = function (g, a) {
  const B = a.bob, flap = Math.sin(a.ph * 2.2) * 0.3 + (a.raise ? -0.4 : 0);
  const body = a.rage ? '#3a4a8a' : '#4a6ab8', wing = a.rage ? '#2a3466' : '#3a5498', glow = a.rage ? '#ff5aff' : '#9fe0ff';
  // 翅膀
  for (const sd of [-1, 1]) {
    g.save(); g.translate(sd * 0.9, -3.2 + B); g.scale(sd, 1); g.rotate(-flap);
    g.fillStyle = lin(g, 0, 0, 3.4, 0, [wing, body, '#1e2a50']);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(1.6, -1.6, 3.4, -1.2); g.lineTo(3.0, -0.6); g.lineTo(3.3, -0.2); g.lineTo(2.6, 0.1); g.lineTo(2.8, 0.6); g.lineTo(1.8, 0.6); g.quadraticCurveTo(0.8, 0.8, 0, 0.6); g.closePath(); g.fill();
    g.strokeStyle = glow; g.lineWidth = 0.08; g.beginPath(); g.moveTo(0.4, 0); g.lineTo(1.4, -0.6); g.lineTo(1.2, -0.2); g.lineTo(2.4, -0.8); g.stroke();
    g.restore();
  }
  // 腳
  g.fillStyle = '#ffc020'; for (const sd of [-1, 1]) { rr(g, sd * 0.6 - 0.12, -1.2 + Math.max(0, sd * B), 0.24, 1.1, 0.1); g.fill(); poly(g, [sd * 0.6 - 0.4, -0.05, sd * 0.6, -0.3, sd * 0.6 + 0.4, -0.05]); g.fill(); }
  // 身體
  g.fillStyle = radial(g, -0.3, -2.8 + B, 1.8, '#7a9ae0', body); ell(g, 0, -2.5 + B, 1.25, 1.5); g.fill();
  g.fillStyle = 'rgba(255,255,255,.75)'; ell(g, 0, -2.2 + B, 0.75, 1.0); g.fill();
  g.strokeStyle = glow; g.lineWidth = 0.1; g.beginPath(); g.moveTo(-0.2, -3.0 + B); g.lineTo(0.15, -2.5 + B); g.lineTo(-0.1, -2.4 + B); g.lineTo(0.25, -1.8 + B); g.stroke();
  // 頭
  g.fillStyle = '#ffffff'; ell(g, 0, -4.15 + B, 0.75, 0.65); g.fill();
  g.fillStyle = '#ffc020'; poly(g, [-0.28, -4.0 + B, 0.28, -4.0 + B, 0, -3.35 + B - a.ap * 0.1]); g.fill();
  for (const sd of [-1, 1]) {
    g.fillStyle = a.rage ? '#ff3060' : '#1a2448'; ell(g, sd * 0.3, -4.3 + B, 0.11, 0.12); g.fill();
    g.strokeStyle = '#1a2448'; g.lineWidth = 0.08; g.beginPath(); g.moveTo(sd * 0.55, -4.6 + B); g.lineTo(sd * 0.15, -4.45 + B); g.stroke();
    g.fillStyle = body; poly(g, [sd * 0.3, -4.7 + B, sd * 0.7, -5.2 + B, sd * 0.55, -4.6 + B]); g.fill();
  }
  // 身邊的電光
  g.fillStyle = radial(g, 0, -2.5 + B, 2.2, a.rage ? 'rgba(255,90,255,.25)' : 'rgba(120,200,255,.22)', 'rgba(0,0,0,0)', 0, 0); ell(g, 0, -2.5 + B, 2.2, 2.2); g.fill();
};
