// 萬軍守城（複製自千軍突圍 rush/js）— 第五世界「熔岩火山」：場景、新怪物、熔岩炎龍、岩漿河、噴火口、兵種與加持門的畫法
'use strict';

// ---------- 路邊裝飾 ----------
DECOR.lavarock = (g, W, H, v) => {
  const s = H / 100, cx = W / 2;
  g.fillStyle = radial(g, cx - 8 * s, 50 * s, 46 * s, '#5a4a48', '#1e1414');
  poly(g, [cx - 44 * s, 100 * s, cx - 36 * s, 52 * s, cx - 14 * s, 30 * s, cx + 12 * s, 36 * s, cx + 38 * s, 58 * s, cx + 44 * s, 100 * s]); g.fill();
  // 發光的裂縫
  g.strokeStyle = '#ff7a1a'; g.lineWidth = 3 * s; g.lineCap = 'round'; g.shadowColor = '#ff5a00'; g.shadowBlur = 8 * s;
  g.beginPath(); g.moveTo(cx - 20 * s, 96 * s); g.lineTo(cx - 12 * s, 70 * s); g.lineTo(cx - 18 * s, 54 * s);
  g.moveTo(cx + 8 * s, 92 * s); g.lineTo(cx + 16 * s, 68 * s); g.lineTo(cx + 10 * s, 50 * s + v * 3 * s); g.stroke();
  g.shadowBlur = 0;
};
DECOR.deadtree = (g, W, H, v) => {
  const s = H / 100, cx = W / 2;
  g.strokeStyle = '#2a1c18'; g.lineCap = 'round';
  const br = (x, y, a, l, w) => {
    if (l < 6) return;
    const x2 = x + Math.cos(a) * l * s, y2 = y - Math.sin(a) * l * s;
    g.lineWidth = w * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    br(x2, y2, a + 0.5 + v * 0.05, l * 0.62, w * 0.6); br(x2, y2, a - 0.45, l * 0.58, w * 0.6);
  };
  br(cx, 100 * s, Math.PI / 2 + (v - 1) * 0.08, 42, 9);
  g.fillStyle = 'rgba(255,120,40,.5)'; ell(g, cx, 98 * s, 14 * s, 3 * s); g.fill();
};
DECOR.vent = (g, W, H, v) => {
  const s = H / 100, cx = W / 2;
  g.fillStyle = radial(g, cx, 80 * s, 40 * s, '#4a3634', '#1a1010');
  g.beginPath(); g.moveTo(cx - 40 * s, 100 * s); g.quadraticCurveTo(cx - 22 * s, 64 * s, cx - 12 * s, 62 * s); g.lineTo(cx + 12 * s, 62 * s); g.quadraticCurveTo(cx + 22 * s, 64 * s, cx + 40 * s, 100 * s); g.fill();
  g.fillStyle = radial(g, cx, 62 * s, 14 * s, '#ffe08a', '#ff4a10'); ell(g, cx, 63 * s, 12 * s, 4 * s); g.fill();
  for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(90,80,80,${0.35 - i * 0.07})`; ell(g, cx + (i % 2 ? 6 : -5) * s, (48 - i * 13) * s, (10 + i * 5) * s, (8 + i * 3) * s); g.fill(); }
};
DECOR.obsidian = (g, W, H, v) => {
  const s = H / 100, cx = W / 2;
  const shard = (x, w, h, c) => { g.fillStyle = lin(g, cx + (x - w) * s, 0, cx + (x + w) * s, 0, c); g.beginPath(); g.moveTo(cx + (x - w) * s, 100 * s); g.lineTo(cx + (x + w * 0.2) * s, (100 - h) * s); g.lineTo(cx + (x + w) * s, 100 * s); g.closePath(); g.fill(); };
  shard(-14, 11, 50, ['#2a1f3a', '#6a5a8a', '#1a1426']); shard(10, 13, 74, ['#1e1630', '#7a68a0', '#140e20']); shard(28, 7, 34, ['#2a1f3a', '#5a4a7a', '#1a1426']);
  g.fillStyle = 'rgba(255,140,60,.55)'; ell(g, cx, 99 * s, 30 * s, 3 * s); g.fill();
};
Object.assign(DECOR_SIZE, { lavarock: [2.2, 1.5], deadtree: [2.6, 3.6], vent: [2.4, 2.6], obsidian: [2, 2.4] });

// ---------- 新怪物（正面，4 格） ----------
function drawBat2(g, W, H, f) {
  const u = H / 100, flap = [1, 0.35, -0.6, 0.35][f];
  g.save(); g.translate(W / 2, 0); g.scale(u, u);
  // 翅膀
  for (const sd of [-1, 1]) {
    g.fillStyle = lin(g, 0, 20, sd * 60, 60, ['#ff7a3a', '#a8241a']);
    g.beginPath(); g.moveTo(sd * 12, 44);
    g.quadraticCurveTo(sd * 40, 26 - flap * 22, sd * 64, 30 - flap * 30);
    g.lineTo(sd * 56, 52 - flap * 18); g.lineTo(sd * 46, 46 - flap * 10); g.lineTo(sd * 38, 60 - flap * 8); g.lineTo(sd * 26, 54); g.lineTo(sd * 14, 62); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(80,10,6,.6)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(sd * 14, 46); g.lineTo(sd * 56, 52 - flap * 18); g.moveTo(sd * 14, 48); g.lineTo(sd * 38, 60 - flap * 8); g.stroke();
  }
  // 身體
  g.fillStyle = rad(g, -3, 46, 22, '#ffb05a', '#c2361a'); ell(g, 0, 50, 17, 20); g.fill();
  // 耳朵
  for (const sd of [-1, 1]) { g.fillStyle = '#c2361a'; poly(g, [sd * 6, 34, sd * 15, 18, sd * 15, 38]); g.fill(); }
  g.fillStyle = 'rgba(255,240,170,.6)'; ell(g, 0, 58, 9, 8); g.fill();
  eyes2(g, 0, 45, 5.2, 6.5, true, '#3a0800');
  g.fillStyle = '#fff'; poly(g, [-4, 55, -2.5, 60, -1, 55]); g.fill(); poly(g, [4, 55, 2.5, 60, 1, 55]); g.fill();
  // 小火苗尾巴
  g.fillStyle = rad(g, 0, 78, 8, '#fff2a0', 'rgba(255,90,20,0)'); ell(g, 0, 76, 6, 9); g.fill();
  g.restore();
}
function drawHealer2(g, W, H, f) {
  const u = H / 100; const P = walkPh(f);
  g.save(); g.translate(W / 2, 0); g.scale(u, u);
  // 長袍
  g.fillStyle = lin(g, -30, 0, 30, 0, ['#1f7a52', '#3fcf8a', '#16603e']);
  g.beginPath(); g.moveTo(-26, 96); g.quadraticCurveTo(-24, 50, 0, 34); g.quadraticCurveTo(24, 50, 26, 96); g.closePath(); g.fill();
  g.fillStyle = '#e8d070'; rr(g, -26, 90, 52, 6, 3); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)'; poly(g, [-8, 92, 0, 40, 4, 92]); g.fill();
  // 法杖（右手）
  g.strokeStyle = '#6a4a26'; g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(30, 94); g.lineTo(32, 18); g.stroke();
  g.fillStyle = rad(g, 32, 14, 9, '#eafff0', '#3fe08a'); ell(g, 32, 14, 7.5 + (f % 2), 7.5 + (f % 2)); g.fill();
  g.fillStyle = 'rgba(120,255,160,.35)'; ell(g, 32, 14, 13, 13); g.fill();
  // 臉與兜帽
  g.fillStyle = rad(g, 0, 34, 20, '#9ff0b8', '#2c8a5a'); ell(g, 0, 34, 17, 16); g.fill();
  g.fillStyle = '#16603e'; g.beginPath(); g.moveTo(-19, 40); g.quadraticCurveTo(-20, 8, 0, 4); g.quadraticCurveTo(20, 8, 19, 40); g.quadraticCurveTo(10, 22, 0, 22); g.quadraticCurveTo(-10, 22, -19, 40); g.fill();
  eyes2(g, 0, 34, 5, 6.5, false, '#0e3a20');
  // 胸前的十字
  g.fillStyle = '#ffffff'; rr(g, -3, 52, 6, 16, 2); g.fill(); rr(g, -8, 57, 16, 6, 2); g.fill();
  // 左手
  g.fillStyle = '#7fe0a0'; ell(g, -24, 60 + P.s * 3, 5.5, 7); g.fill();
  g.restore();
}
function drawMagma2(g, W, H, f) {
  const u = H / 100; const P = walkPh(f);
  g.save(); g.translate(W / 2, 0); g.scale(u, u);
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, sd * P.s) * 5;
    g.fillStyle = '#2a1a16'; rr(g, sd * 14 - 7, 80 - lift, 14, 15, 5); g.fill();
    g.fillStyle = '#ff6a1a'; rr(g, sd * 14 - 4, 86 - lift, 8, 3, 1.5); g.fill();
  }
  g.translate(0, P.up);
  // 岩石身體
  g.fillStyle = rad(g, -6, 50, 40, '#5a4a46', '#1a1212');
  poly(g, [-34, 86, -38, 54, -24, 26, 0, 18, 24, 26, 38, 54, 34, 86]); g.fill();
  // 岩漿裂縫（發光）
  g.save(); g.shadowColor = '#ff5a00'; g.shadowBlur = 10;
  g.strokeStyle = f % 2 ? '#ffb040' : '#ff7a1a'; g.lineWidth = 3.4; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-26, 76); g.lineTo(-16, 60); g.lineTo(-22, 44); g.moveTo(22, 80); g.lineTo(14, 62); g.lineTo(24, 46); g.moveTo(-6, 84); g.lineTo(0, 70); g.lineTo(-4, 62); g.stroke();
  g.restore();
  // 頭頂熔岩
  g.fillStyle = rad(g, 0, 22, 18, '#fff0a0', '#ff4a10'); g.beginPath(); g.moveTo(-18, 30); g.quadraticCurveTo(-10, 10 - P.up, 0, 16); g.quadraticCurveTo(10, 8 + P.up, 18, 30); g.closePath(); g.fill();
  // 臉
  g.fillStyle = '#ffcf4a'; ell(g, -10, 42, 5.5, 4.5); g.fill(); ell(g, 10, 42, 5.5, 4.5); g.fill();
  g.fillStyle = '#3a0c00'; ell(g, -10, 43, 2.4, 2.4); g.fill(); ell(g, 10, 43, 2.4, 2.4); g.fill();
  g.strokeStyle = '#1a0a06'; g.lineWidth = 3; g.beginPath(); g.moveTo(-17, 34); g.lineTo(-5, 38); g.moveTo(17, 34); g.lineTo(5, 38); g.stroke();
  g.fillStyle = rad(g, 0, 56, 10, '#fff0a0', '#ff4a10'); g.beginPath(); g.ellipse(0, 54, 10, 6, 0, 0, Math.PI); g.fill();
  // 手臂
  for (const sd of [-1, 1]) { g.fillStyle = rad(g, sd * 40, 60, 10, '#5a4a46', '#1a1212'); ell(g, sd * 40, 60 - sd * P.s * 4, 9, 12); g.fill(); g.fillStyle = '#ff7a1a'; ell(g, sd * 41, 66 - sd * P.s * 4, 3, 2); g.fill(); }
  g.restore();
}

// ---------- 建立圖 ----------
function buildVolc() {
  const S = ART.scene;
  const tuft = mk(64, 48, g => { for (let i = 0; i < 6; i++) { const x = 14 + i * 7; g.strokeStyle = i % 2 ? '#3a2a24' : '#5a3a2a'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, 47); g.lineTo(x + (i % 2 ? 4 : -4), 47 - 14 - (i * 5) % 9); g.stroke(); } });
  const ember = mk(64, 32, g => { for (const [x, y, r] of [[18, 22, 7], [36, 24, 5], [48, 20, 6]]) { g.fillStyle = rad(g, x, y, r, '#5a4644', '#1e1414'); ell(g, x, y, r, r * 0.7); g.fill(); g.fillStyle = 'rgba(255,120,30,.8)'; ell(g, x + 1, y + 1, r * 0.3, r * 0.2); g.fill(); } });
  const crack = mk(64, 32, g => { g.strokeStyle = '#ff7a1a'; g.lineWidth = 2.5; g.shadowColor = '#ff5a00'; g.shadowBlur = 6; g.beginPath(); g.moveTo(6, 24); g.lineTo(22, 18); g.lineTo(34, 26); g.lineTo(58, 16); g.stroke(); });
  const ash = mk(64, 32, g => { g.fillStyle = rad(g, 30, 22, 26, '#6a5a58', '#2e2424'); g.beginPath(); g.ellipse(32, 30, 28, 14, 0, Math.PI, 0); g.fill(); });
  S.detail.volcano = [tuft, ember, crack, ash];
  S.post.volcano = mk(32, 96, g => { g.fillStyle = lin(g, 8, 0, 24, 0, ['#2a2020', '#5a4a48', '#1e1616']); rr(g, 9, 10, 14, 86, 3); g.fill(); g.fillStyle = '#ff8a1a'; ell(g, 16, 11, 9, 6); g.fill(); g.fillStyle = 'rgba(255,220,120,.9)'; ell(g, 16, 10, 4, 3); g.fill(); });
  S.rail.volcano = ['#3a2a28', '#6a5248'];

  const enemy = (fn, w, h, ol) => {
    const fr = [0, 1, 2, 3].map(f => outlined(mk(w, h, (g, W, H) => fn(g, W, H, f)), ol, 2.6));
    return { fr, fl: fr.map(flashOf) };
  };
  ART.bat = enemy(drawBat2, 200, 140, 'rgba(70,8,0,.92)');
  ART.healer = enemy(drawHealer2, 170, 190, 'rgba(6,40,20,.92)');
  ART.magma = enemy(drawMagma2, 190, 180, 'rgba(30,6,0,.92)');

  // 拋射物
  const H = ART.haz;
  H.proj.fireball = mk(64, 64, g => { g.fillStyle = rad(g, 32, 32, 30, '#fff6c0', 'rgba(255,60,0,0)'); ell(g, 32, 32, 30, 30); g.fill(); g.fillStyle = rad(g, 30, 30, 16, '#ffffff', '#ff8a1a'); ell(g, 32, 32, 15, 15); g.fill(); });
  H.proj.magma = mk(64, 64, g => { g.fillStyle = rad(g, 30, 30, 26, '#5a4644', '#1a1010'); poly(g, [10, 30, 18, 12, 38, 8, 56, 22, 54, 44, 36, 58, 14, 50]); g.fill(); g.strokeStyle = '#ff8a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(18, 28); g.lineTo(32, 34); g.lineTo(46, 24); g.moveTo(32, 34); g.lineTo(30, 50); g.stroke(); });
  H.proj.shell = mk(64, 64, g => { g.translate(32, 32); g.fillStyle = '#56663a'; rr(g, -9, -18, 18, 30, 8); g.fill(); g.fillStyle = '#c9a050'; rr(g, -9, 4, 18, 6, 2); g.fill(); g.fillStyle = '#3a4426'; poly(g, [-9, 10, -14, 22, 14, 22, 9, 10]); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; rr(g, -6, -14, 4, 16, 2); g.fill(); });
  H.projCol.fireball = '255,130,30'; H.projCol.magma = '255,100,30'; H.projCol.shell = '120,200,255';

  // 熔岩河的貼圖（橫向可重複）
  ART.lava = mk(256, 64, g => {
    g.fillStyle = lin(g, 0, 0, 0, 64, ['#ff9a1a', '#ff5a10', '#d8320a']); g.fillRect(0, 0, 256, 64);
    const r = rng(77);
    for (let i = 0; i < 26; i++) { const x = r() * 256, y = r() * 64, w = 14 + r() * 30; g.fillStyle = r() < 0.5 ? 'rgba(255,240,150,.55)' : 'rgba(120,20,0,.35)'; ell(g, x, y, w, 3 + r() * 4); g.fill(); }
  });
  ART.rock = mk(128, 64, g => {
    g.fillStyle = lin(g, 0, 0, 0, 64, ['#8a7a72', '#5a4c46']); rr(g, 0, 0, 128, 64, 10); g.fill();
    g.strokeStyle = 'rgba(30,20,16,.5)'; g.lineWidth = 3;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32 + (k % 2 ? 6 : -6), 64); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, 4, 4, 120, 8, 4); g.fill();
  });
}

// ---------- 遠景 ----------
function bgVolcano(g, CW, hy, r) {
  // 火山
  const vx = CW * 0.62;
  g.fillStyle = '#3a1614';
  g.beginPath(); g.moveTo(vx - hy * 1.6, hy + 2); g.lineTo(vx - hy * 0.22, hy * 0.28); g.lineTo(vx + hy * 0.22, hy * 0.3); g.lineTo(vx + hy * 1.7, hy + 2); g.closePath(); g.fill();
  // 流下來的岩漿
  g.strokeStyle = '#ff6a1a'; g.lineWidth = Math.max(2, hy * 0.025); g.lineCap = 'round';
  for (const [dx, k] of [[-0.12, 1], [0.05, 0.8], [0.16, 1.1]]) { g.beginPath(); g.moveTo(vx + dx * hy, hy * 0.3); g.quadraticCurveTo(vx + dx * hy * 2.4, hy * 0.6, vx + dx * hy * 3.2 * k, hy * 0.98); g.stroke(); }
  // 火山口的光
  g.fillStyle = radial(g, vx, hy * 0.28, hy * 0.5, 'rgba(255,200,90,.85)', 'rgba(255,80,20,0)', 0, 0); ell(g, vx, hy * 0.28, hy * 0.5, hy * 0.36); g.fill();
  // 煙
  for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(40,20,20,${0.5 - i * 0.04})`; ell(g, vx + (r() - 0.4) * hy * (0.2 + i * 0.12), hy * (0.22 - i * 0.05), hy * (0.12 + i * 0.05), hy * (0.07 + i * 0.03)); g.fill(); }
  // 前面的山
  for (const [col, amp] of [['#2e1012', 0.42], ['#4a1c18', 0.22]]) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, hy + 2);
    const n = 8; for (let i = 0; i <= n; i++) g.lineTo(i / n * CW, hy - hy * amp * (0.3 + r() * 0.7));
    g.lineTo(CW, hy + 2); g.closePath(); g.fill();
  }
}

// ---------- 地上的新東西 ----------
function drawLava(g, o, t) {
  if (o.sky) return drawGap(g, o, t);
  const z0 = Math.max(o.z, -Z0 + 0.6), z1 = o.z + o.len;
  if (z1 <= z0 || o.z > ZSPAWN) return;
  // 岩漿（往旁邊流動）
  const a = P(-ROAD - 1.2, z0, 0), b = P(ROAD + 1.2, z1, 0), a2 = P(ROAD + 1.2, z0, 0);
  const off = (t * 40) % 128;
  g.save();
  quadW(g, -ROAD - 1.2, z0, ROAD + 1.2, z1); g.clip();
  const w = a2.x - a.x, h = a.y - b.y;
  for (let x = a.x - off * w / 256 * 0.5 - w; x < a2.x; x += w * 0.5) g.drawImage(ART.lava, x, b.y, w * 0.5 + 1, h);
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.2 + 0.12 * Math.sin(t * 5);
  g.fillStyle = '#ffb040'; g.fillRect(a.x, b.y, w, h);
  g.restore();
  // 岸邊
  g.strokeStyle = '#2a1410'; g.lineWidth = Math.max(2, 0.1 * a.s);
  for (const z of [o.z, z1]) { if (z < -Z0 + 0.6) continue; const p = P(-ROAD - 1.2, z, 0), q = P(ROAD + 1.2, z, 0); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); }
  // 石橋
  for (const br of o.bridges) {
    const za = Math.max(o.z - 0.35, -Z0 + 0.6), zb = z1 + 0.35;
    if (zb <= za) continue;
    const p = P(br.x - br.w, za, 0), q = P(br.x + br.w, zb, 0), p2 = P(br.x + br.w, za, 0);
    g.drawImage(ART.rock, p.x, q.y, p2.x - p.x, p.y - q.y);
    g.strokeStyle = o.burn ? '#ff5a3a' : '#ffd34d'; g.lineWidth = Math.max(1.5, 0.05 * p.s);
    quadW(g, br.x - br.w, za, br.x + br.w, zb); g.stroke();
  }
}
function drawGeyserGround(g, o, t) {
  if (o.z > ZSPAWN || o.z < -Z0 + 0.8) return;
  const m = P(o.x, o.z, 0), a = P(o.x, o.z - o.r, 0), b = P(o.x, o.z + o.r, 0);
  const rx = o.r * m.s, ry = Math.max(2, (a.y - b.y) / 2), cy = (a.y + b.y) / 2;
  g.fillStyle = '#2a1a16'; g.beginPath(); g.ellipse(m.x, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
  const hot = o.erupt ? 1 : o.warn ? 0.6 + 0.4 * Math.sin(t * 20) : 0.3;
  g.fillStyle = `rgba(255,${120 + hot * 80},30,${0.35 + hot * 0.5})`; g.beginPath(); g.ellipse(m.x, cy, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2); g.fill();
  if (o.warn || o.erupt) { g.strokeStyle = `rgba(255,60,60,${o.erupt ? 0.9 : 0.5 + 0.4 * Math.sin(t * 18)})`; g.lineWidth = Math.max(2, 0.07 * m.s); g.beginPath(); g.ellipse(m.x, cy, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2); g.stroke(); }
}
function drawGeyserPlume(g, o, t) {
  if (o.z > ZSPAWN || o.z < -Z0 + 0.8) return;
  const m = P(o.x, o.z, 0);
  if (o.warn) {
    // 冒煙
    for (let i = 0; i < 3; i++) { const q = P(o.x + Math.sin(t * 3 + i) * 0.2, o.z, 0.4 + i * 0.5 + (t * 1.5 % 0.5)); g.fillStyle = `rgba(80,70,70,${0.45 - i * 0.12})`; ell(g, q.x, q.y, (0.3 + i * 0.15) * q.s, (0.25 + i * 0.12) * q.s); g.fill(); }
  } else if (o.erupt) {
    const top = P(o.x, o.z, 4.2 + Math.sin(t * 30) * 0.2);
    const w = o.r * 1.1 * m.s;
    const gr = g.createLinearGradient(0, top.y, 0, m.y);
    gr.addColorStop(0, 'rgba(255,240,160,0)'); gr.addColorStop(0.25, 'rgba(255,200,80,.9)'); gr.addColorStop(1, 'rgba(255,90,20,.95)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(m.x - w * 0.55, m.y); g.quadraticCurveTo(m.x - w * 0.9, (m.y + top.y) / 2, m.x - w * 0.3, top.y); g.lineTo(m.x + w * 0.3, top.y); g.quadraticCurveTo(m.x + w * 0.9, (m.y + top.y) / 2, m.x + w * 0.55, m.y); g.closePath(); g.fill();
    g.globalCompositeOperation = 'lighter'; const s = w * 2.2; g.drawImage(ART.glow.rocket, m.x - s / 2, (m.y + top.y) / 2 - s / 2, s, s); g.globalCompositeOperation = 'source-over';
  }
}
function drawPool(g, o, t) {
  if (o.z < -Z0 + 0.8) return;
  const m = P(o.x, o.z, 0), a = P(o.x, o.z - o.r, 0), b = P(o.x, o.z + o.r, 0);
  const al = clamp(o.life / 0.6, 0, 1);
  g.fillStyle = `rgba(255,110,20,${0.75 * al})`; g.beginPath(); g.ellipse(m.x, (a.y + b.y) / 2, o.r * m.s, Math.max(2, (a.y - b.y) / 2), 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = `rgba(255,230,140,${0.5 * al * (0.6 + 0.4 * Math.sin(t * 8 + o.id))})`; g.beginPath(); g.ellipse(m.x, (a.y + b.y) / 2, o.r * 0.5 * m.s, Math.max(1, (a.y - b.y) / 4), 0, 0, Math.PI * 2); g.fill();
}
function drawBreath(g, b, t) {
  const br = b.breath; if (!br) return;
  const z1 = Math.max(-Z0 + 0.6, -3), z0 = b.z - 0.5;
  const x0 = br.side > 0 ? 0 : -ROAD - 0.3, x1 = br.side > 0 ? ROAD + 0.3 : 0;
  if (br.t > 0) {
    const k = 1 - br.t / 1.3;
    g.fillStyle = `rgba(255,60,30,${0.12 + k * 0.28 + 0.08 * Math.sin(t * 20)})`; quadW(g, x0, z1, x1, z0); g.fill();
    g.strokeStyle = 'rgba(255,120,90,.95)'; g.lineWidth = Math.max(2, 0.05 * P(0, 0, 0).s); quadW(g, x0, z1, x1, z0); g.stroke();
    // 往另一邊的箭頭（提示要躲到哪）
    const ax = -br.side * 2.1;
    for (let i = 0; i < 2; i++) {
      const z = 2 + i * 6, p = P(ax, z, 0.05), s = 0.6 * p.s;
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(p.x - br.side * s, p.y); g.lineTo(p.x + br.side * s * 0.4, p.y - s * 0.5); g.lineTo(p.x + br.side * s * 0.4, p.y + s * 0.5); g.closePath(); g.fill();
    }
  } else {
    const gr = g.createLinearGradient(0, P(0, z0, 0).y, 0, P(0, z1, 0).y);
    gr.addColorStop(0, 'rgba(255,240,150,.9)'); gr.addColorStop(1, 'rgba(255,80,20,.75)');
    g.fillStyle = gr; quadW(g, x0, z1, x1, z0); g.fill();
  }
}

// ---------- 熔岩炎龍 ----------
BOSS_DRAW.dragon = function (g, a) {
  const B = a.bob;
  const scale = (x, y, rx, ry, c0, c1) => { g.fillStyle = radial(g, x, y, Math.max(rx, ry), c0, c1); ell(g, x, y, rx, ry); g.fill(); };
  const red0 = a.rage ? '#ff5a3a' : '#ff6a22', red1 = a.rage ? '#6a0606' : '#8a1408';
  // 翅膀
  const flap = Math.sin(a.ph * 2.2) * 0.25 + (a.raise ? -0.35 : 0);
  for (const sd of [-1, 1]) {
    g.fillStyle = lin(g, sd * 0.8, -4.5, sd * 3.2, -2.0, ['#c2361a', '#5a0e0a']);
    g.beginPath(); g.moveTo(sd * 0.7, -3.4 + B);
    g.lineTo(sd * 2.0, -5.2 + flap + B); g.lineTo(sd * 3.15, -4.5 + flap * 1.2 + B);
    g.lineTo(sd * 2.8, -3.4 + flap * 0.6 + B); g.lineTo(sd * 3.0, -2.5 + flap * 0.3 + B);
    g.lineTo(sd * 2.2, -2.6 + B); g.lineTo(sd * 2.0, -1.9 + B); g.lineTo(sd * 1.2, -2.4 + B); g.closePath(); g.fill();
    g.strokeStyle = '#3a0806'; g.lineWidth = 0.08; g.lineCap = 'round';
    g.beginPath(); g.moveTo(sd * 0.7, -3.4 + B); g.lineTo(sd * 2.0, -5.2 + flap + B); g.moveTo(sd * 1.2, -3.6 + B); g.lineTo(sd * 3.15, -4.5 + flap * 1.2 + B); g.moveTo(sd * 1.2, -3.2 + B); g.lineTo(sd * 3.0, -2.5 + flap * 0.3 + B); g.stroke();
  }
  // 尾巴（從後面繞出來）
  g.strokeStyle = red1; g.lineWidth = 0.42; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0.4, -0.6); g.quadraticCurveTo(2.0, -0.2, 2.4 + Math.sin(a.ph) * 0.2, -1.2); g.stroke();
  g.fillStyle = '#ffcf4a'; poly(g, [2.2 + Math.sin(a.ph) * 0.2, -1.1, 2.6 + Math.sin(a.ph) * 0.2, -1.7, 2.75 + Math.sin(a.ph) * 0.2, -1.05]); g.fill();
  // 腳
  for (const sd of [-1, 1]) {
    const l = sd < 0 ? Math.max(0, B) : Math.max(0, -B);
    scale(sd * 0.75, -0.55 + l, 0.5, 0.6, red0, red1);
    g.fillStyle = '#f4e6c0'; for (let k = -1; k <= 1; k++) { poly(g, [sd * 0.75 + k * 0.17 - 0.05, -0.08 + l, sd * 0.75 + k * 0.17, 0.08 + l, sd * 0.75 + k * 0.17 + 0.05, -0.08 + l]); g.fill(); }
  }
  // 身體
  scale(0, -2.0 + B, 1.35, 1.6, red0, red1);
  // 發光的肚子（鱗片）
  g.fillStyle = radial(g, 0, -1.7 + B, 1.0, a.rage ? '#fff0a0' : '#ffe08a', '#ff7a1a', 0, -0.3); ell(g, 0, -1.75 + B, 0.75, 1.15); g.fill();
  g.strokeStyle = 'rgba(160,50,10,.6)'; g.lineWidth = 0.05;
  for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(0, -2.6 + k * 0.38 + B, 0.62 - Math.abs(k - 2) * 0.06, 0.12, 0, 0, Math.PI); g.stroke(); }
  // 手
  const armY = a.raise ? -3.6 : -2.1 + a.ap * 0.6;
  for (const sd of [-1, 1]) {
    g.strokeStyle = red1; g.lineWidth = 0.36;
    g.beginPath(); g.moveTo(sd * 1.0, -2.7 + B); g.lineTo(sd * 1.45, armY + B); g.stroke();
    scale(sd * 1.48, armY + B, 0.28, 0.24, red0, red1);
  }
  // 脖子與頭
  scale(0, -3.45 + B, 0.62, 0.55, red0, red1);
  const hy = -4.05 + B + (a.ap > 0 ? a.ap * 0.15 : 0);
  scale(0, hy, 0.85, 0.62, red0, red1);
  // 角
  for (const sd of [-1, 1]) {
    g.fillStyle = lin(g, sd * 0.4, hy - 0.3, sd * 1.0, hy - 1.1, ['#4a3a30', '#f4e6c0']);
    g.beginPath(); g.moveTo(sd * 0.35, hy - 0.4); g.quadraticCurveTo(sd * 0.95, hy - 0.7, sd * 0.85, hy - 1.25); g.quadraticCurveTo(sd * 0.7, hy - 0.75, sd * 0.15, hy - 0.5); g.fill();
  }
  // 背刺
  g.fillStyle = '#ffcf4a';
  for (let k = -2; k <= 2; k++) { poly(g, [k * 0.28 - 0.1, hy - 0.5 + Math.abs(k) * 0.05, k * 0.28, hy - 0.78 + Math.abs(k) * 0.08, k * 0.28 + 0.1, hy - 0.5 + Math.abs(k) * 0.05]); g.fill(); }
  // 眼睛
  const ec = a.rage ? '#ffffff' : '#fff2a0';
  for (const sd of [-1, 1]) {
    g.fillStyle = ec; ell(g, sd * 0.32, hy - 0.08, 0.17, 0.12); g.fill();
    g.fillStyle = '#2a0600'; ell(g, sd * 0.32, hy - 0.06, 0.05, 0.1); g.fill();
    g.strokeStyle = '#3a0806'; g.lineWidth = 0.07; g.beginPath(); g.moveTo(sd * 0.55, hy - 0.3); g.lineTo(sd * 0.12, hy - 0.18); g.stroke();
  }
  // 嘴（攻擊時張開噴火）
  const open = 0.1 + a.ap * 0.25;
  g.fillStyle = '#3a0806'; g.beginPath(); g.ellipse(0, hy + 0.3, 0.42, open, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; for (const sd of [-1, 1]) { poly(g, [sd * 0.28, hy + 0.3 - open * 0.6, sd * 0.2, hy + 0.3, sd * 0.12, hy + 0.3 - open * 0.6]); g.fill(); }
  if (a.ap > 0.2 || a.rage) { g.fillStyle = radial(g, 0, hy + 0.35, 0.45, 'rgba(255,240,150,.95)', 'rgba(255,90,20,0)', 0, 0); ell(g, 0, hy + 0.4, 0.45, 0.35); g.fill(); }
  // 鼻孔冒煙
  g.fillStyle = 'rgba(80,60,60,.5)'; for (const sd of [-1, 1]) { ell(g, sd * 0.18, hy + 0.05 - (a.t * 0.8 % 0.4), 0.08, 0.06); g.fill(); }
};

// ---------- 兵種／加持門的圖示 ----------
function drawSpecIcon(g, k, x, y, s, stroke) {
  g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
  g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = stroke || 'rgba(0,0,0,.6)';
  if (k === 'medic') { g.fillStyle = '#fff'; g.beginPath(); g.rect(-8, -26, 16, 52); g.rect(-26, -8, 52, 16); g.stroke(); g.fill(); g.fillStyle = '#ff4a5a'; g.fillRect(-5, -23, 10, 46); g.fillRect(-23, -5, 46, 10); }
  else if (k === 'mortar') { g.rotate(-0.5); g.fillStyle = '#fff'; g.beginPath(); g.rect(-9, -28, 18, 46); g.stroke(); g.fill(); g.fillStyle = '#ffb020'; g.fillRect(-9, -6, 18, 7); g.rotate(0.5); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 22, 22, 6, 0, 0, Math.PI * 2); g.stroke(); g.fill(); }
  else if (k === 'guard') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -28); g.lineTo(24, -18); g.lineTo(20, 10); g.quadraticCurveTo(12, 24, 0, 30); g.quadraticCurveTo(-12, 24, -20, 10); g.lineTo(-24, -18); g.closePath(); g.stroke(); g.fill(); g.fillStyle = '#5fb6ff'; g.beginPath(); g.moveTo(0, -18); g.lineTo(14, -12); g.lineTo(11, 8); g.quadraticCurveTo(6, 17, 0, 20); g.closePath(); g.fill(); }
  else if (k === 'shield') { g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(0, 4, 24, Math.PI, 0); g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(0, 4, 24, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; g.fillRect(-28, 4, 56, 6); }
  else if (k === 'fury') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(6, -30); g.lineTo(-16, 4); g.lineTo(-2, 4); g.lineTo(-8, 30); g.lineTo(16, -6); g.lineTo(2, -6); g.closePath(); g.stroke(); g.fill(); }
  g.restore();
}

// 兵種士兵頭上的小標記
function drawSpecBadge(g, k, x, y, s) {
  if (s < 6) return;
  g.fillStyle = 'rgba(10,14,24,.75)'; ell(g, x, y - s * 0.5, s * 0.55, s * 0.55); g.fill();
  g.strokeStyle = SPEC[k].col; g.lineWidth = Math.max(1.5, s * 0.1); ell(g, x, y - s * 0.5, s * 0.55, s * 0.55); g.stroke();
  drawSpecIcon(g, k, x, y - s * 0.5, s * 0.6, 'rgba(0,0,0,.6)');
}

// 部隊上的護罩
function drawShieldBubble(g, G, t) {
  if (!G.buff || G.buff.shield <= 0) return;
  const cr = crowdR(), c = P(G.px, 0, 0.6), a = P(G.px, -cr.rz - 0.4, 0), b = P(G.px, cr.rz + 0.4, 0);
  const rx = (cr.rx + 0.4) * c.s, ry = Math.max(rx * 0.5, (a.y - b.y) / 2 + 0.9 * c.s);
  const blink = G.buff.shield < 1.5 ? (Math.sin(t * 20) > 0 ? 1 : 0.35) : 1;
  g.save(); g.globalAlpha = 0.5 * blink;
  const gr = g.createRadialGradient(c.x, c.y, rx * 0.3, c.x, c.y, rx);
  gr.addColorStop(0, 'rgba(127,232,255,0)'); gr.addColorStop(0.85, 'rgba(127,232,255,.35)'); gr.addColorStop(1, 'rgba(220,250,255,.9)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

// HUD：兵種與加持
function drawSupportHud(G, x, y, u) {
  const g = R.g;
  const chips = [];
  for (const k of SPEC_ORDER) if (G.spec && G.spec[k] > 0) chips.push({ k, n: G.spec[k], col: SPEC[k].col });
  for (const k in BUFF) if (G.buff && G.buff[k] > 0) chips.push({ k, t: G.buff[k], col: BUFF[k].col, max: BUFF[k].dur });
  if (!chips.length) return;
  const cw = 44 * u, ch = 40 * u;
  const maxX = R.W - 64 * u;
  for (const c of chips) {
    if (x + cw > maxX) break;
    g.fillStyle = 'rgba(10,14,24,.62)'; rr(g, x, y, cw, ch, 10 * u); g.fill();
    g.strokeStyle = c.col; g.lineWidth = 2 * u; rr(g, x + 1 * u, y + 1 * u, cw - 2 * u, ch - 2 * u, 9 * u); g.stroke();
    drawSpecIcon(g, c.k, x + cw * 0.38, y + ch * 0.42, 16 * u, 'rgba(0,0,0,.7)');
    g.font = `900 ${12 * u}px "Noto Sans TC",system-ui,sans-serif`; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    g.lineWidth = 3 * u; g.strokeStyle = 'rgba(0,0,0,.8)';
    const txt = c.n != null ? '×' + c.n : Math.ceil(c.t) + '';
    g.strokeText(txt, x + cw - 4 * u, y + ch - 5 * u); g.fillStyle = '#fff'; g.fillText(txt, x + cw - 4 * u, y + ch - 5 * u);
    if (c.max) { g.fillStyle = c.col; rr(g, x + 5 * u, y + ch - 4 * u, (cw - 10 * u) * c.t / c.max, 2.5 * u, 1.2 * u); g.fill(); }
    x += cw + 5 * u;
  }
}
