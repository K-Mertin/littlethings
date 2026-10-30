// 萬軍守城（複製自千軍突圍 rush/js）— 角色精靈（v2：高解析、輪廓、4 格動作）
'use strict';

function tintOf(src, col, alpha) {
  return mk(src.width, src.height, g => {
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.globalAlpha = alpha == null ? 1 : alpha;
    g.fillStyle = col; g.fillRect(0, 0, src.width, src.height);
  });
}
// 外框：把剪影往八個方向推一點，再把原圖蓋上去
function outlined(src, col, px) {
  const sil = tintOf(src, col);
  return mk(src.width, src.height, g => {
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.drawImage(sil, Math.cos(a) * px, Math.sin(a) * px); }
    g.drawImage(src, 0, 0);
  });
}
// 左上方打光：在圖形邊緣加一層亮邊
function rimLit(src, px) {
  const hi = tintOf(src, 'rgba(255,255,255,1)');
  return mk(src.width, src.height, g => {
    g.drawImage(src, 0, 0);
    const c = mkCanvas(src.width, src.height), cg = c.getContext('2d');
    cg.drawImage(hi, 0, 0);
    cg.globalCompositeOperation = 'destination-out';
    cg.drawImage(src, px, px);
    g.globalAlpha = 0.35; g.globalCompositeOperation = 'source-atop';
    g.drawImage(c, 0, 0);
  });
}
const rad = (g, x, y, r, c0, c1, ox, oy) => {
  const gr = g.createRadialGradient(x + (ox == null ? -0.35 : ox) * r, y + (oy == null ? -0.4 : oy) * r, r * 0.08, x, y, r * 1.1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr;
};
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }

// ---------- 士兵（背面，4 格跑步，3 種外觀） ----------
function drawSoldier2(g, W, H, f, v) {
  const u = H / 100;
  g.save(); g.translate(W / 2, 0); g.scale(u, u);
  const a = f / 4 * Math.PI * 2;
  const liftL = Math.max(0, Math.sin(a)) * 6, liftR = Math.max(0, -Math.sin(a)) * 6;
  const bob = f % 2 ? -1.6 : 0;
  // 腿
  const leg = (sd, lift) => {
    const x = sd * 8.5;
    g.fillStyle = lin(g, x - 6, 0, x + 6, 0, ['#2a3a60', '#3b5288', '#22304f']);
    rr(g, x - 6, 62 - lift + bob * 0.3, 12, 24, 5); g.fill();
    g.fillStyle = '#1d2840'; rr(g, x - 5.5, 72 - lift, 11, 6, 3); g.fill(); // 護膝
    g.fillStyle = lin(g, 0, 82 - lift, 0, 96 - lift, ['#3a3f4a', '#16181d']);
    rr(g, x - 7, 83 - lift, 14, 12, 4.5); g.fill();
    g.fillStyle = '#5a606c'; rr(g, x - 7, 93 - lift, 14, 2.5, 1.2); g.fill();
  };
  leg(-1, liftL); leg(1, liftR);
  g.translate(0, bob);
  // 手肘（往前持槍，從背後看手肘往外）
  for (const sd of [-1, 1]) {
    const sw = sd * Math.sin(a) * 1.2;
    g.fillStyle = lin(g, sd * 20 - 6, 0, sd * 20 + 6, 0, ['#2f72d8', '#4d95ff', '#1f55b0']);
    rr(g, sd * 21 - 6, 34 + sw, 12, 22, 6); g.fill();
    g.fillStyle = '#20314f'; rr(g, sd * 21 - 6, 50 + sw, 12, 6, 3); g.fill(); // 手套
  }
  // 槍：從右肩伸出去
  g.save(); g.translate(13, 34); g.rotate(-0.16);
  g.fillStyle = '#23272e'; rr(g, -3.4, -26, 7, 34, 2); g.fill();
  g.fillStyle = '#4b535f'; rr(g, -2.2, -26, 2.4, 30, 1); g.fill();
  g.fillStyle = '#6b4a2a'; rr(g, -4, 0, 8, 10, 2); g.fill(); // 槍托
  g.fillStyle = '#111'; rr(g, -2, -29, 4, 4, 1); g.fill(); // 槍口
  g.restore();
  // 身體
  g.fillStyle = rad(g, -4, 42, 26, '#66adff', '#1b4fae');
  rr(g, -19, 29, 38, 37, 11); g.fill();
  g.strokeStyle = 'rgba(10,30,80,.45)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(0, 31); g.lineTo(0, 63); g.stroke();
  g.fillStyle = 'rgba(10,30,80,.35)'; rr(g, -19, 29, 8, 9, 4); g.fill(); rr(g, 11, 29, 8, 9, 4); g.fill(); // 肩章
  // 腰帶與小包
  g.fillStyle = '#2c2216'; rr(g, -19, 60, 38, 6, 2); g.fill();
  g.fillStyle = '#7a6640'; rr(g, -17, 58, 9, 9, 2); g.fill(); rr(g, 8, 58, 9, 9, 2); g.fill();
  g.fillStyle = '#c9b27a'; g.fillRect(-14, 61, 3, 1.5); g.fillRect(11, 61, 3, 1.5);
  // 水壺
  g.fillStyle = rad(g, -18, 66, 5, '#9fb07a', '#4c5a30'); ell(g, -18, 66, 3.6, 5); g.fill();
  // 背包
  g.fillStyle = rad(g, -2, 44, 16, '#a8bb73', '#4c5b2c');
  rr(g, -12, 35, 24, 25, 6); g.fill();
  g.fillStyle = 'rgba(40,50,20,.45)'; rr(g, -12, 35, 24, 9, 5); g.fill(); // 蓋子
  g.fillStyle = '#d8c48a'; rr(g, -2, 42, 4, 3, 1); g.fill(); // 扣環
  g.fillStyle = '#5c6e3a'; rr(g, -9, 49, 8, 9, 2); g.fill(); rr(g, 1, 49, 8, 9, 2); g.fill();
  g.strokeStyle = '#3c4626'; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(-10, 30); g.lineTo(-9, 37); g.moveTo(10, 30); g.lineTo(9, 37); g.stroke();
  // 睡袋
  g.fillStyle = lin(g, 0, 29, 0, 36, ['#8a6d4a', '#5a4430']); rr(g, -13, 29.5, 26, 7, 3.5); g.fill();
  g.strokeStyle = '#3a2a18'; g.lineWidth = 1; g.beginPath(); g.moveTo(-6, 29.5); g.lineTo(-6, 36.5); g.moveTo(6, 29.5); g.lineTo(6, 36.5); g.stroke();
  if (v === 2) { // 無線電天線
    g.strokeStyle = '#2b2f36'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(9, 36); g.lineTo(13, 8); g.stroke();
    g.fillStyle = '#ff5a4e'; ell(g, 13, 8, 1.6, 1.6); g.fill();
  }
  // 脖子
  g.fillStyle = '#e7b18a'; rr(g, -6, 23, 12, 9, 3); g.fill();
  // 頭盔
  g.fillStyle = rad(g, 0, 17, 18, '#86a7d0', '#284770');
  ell(g, 0, 17, 17.5, 15.5); g.fill();
  g.fillStyle = 'rgba(30,55,90,.5)';
  for (const [x, y, r] of [[-8, 12, 3], [6, 9, 2.5], [9, 19, 3], [-3, 22, 2.5], [-12, 20, 2]]) { ell(g, x, y, r, r * 0.8); g.fill(); }
  g.fillStyle = '#213d62'; rr(g, -18.5, 21, 37, 5.5, 2.7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.4)'; ell(g, -6, 8, 6, 3.3); g.fill();
  if (v === 1) { // 護目鏡帶
    g.fillStyle = '#2a2520'; rr(g, -17.5, 14, 35, 4, 2); g.fill();
    g.fillStyle = '#ffcc4d'; rr(g, -3, 13.5, 6, 5, 1.5); g.fill();
  }
  g.restore();
}

// ---------- 怪物（正面，4 格走路） ----------
function eyes2(g, x, y, r, gap, angry, col) {
  for (const sd of [-1, 1]) {
    g.fillStyle = '#fffdf6'; ell(g, x + sd * gap, y, r, r * 1.08); g.fill();
    g.fillStyle = col || '#1b1430'; ell(g, x + sd * gap - sd * r * 0.12, y + r * 0.22, r * 0.52, r * 0.58); g.fill();
    g.fillStyle = '#fff'; ell(g, x + sd * gap - r * 0.22, y, r * 0.18, r * 0.18); g.fill();
  }
  if (angry) {
    g.strokeStyle = '#1b1430'; g.lineWidth = r * 0.45; g.lineCap = 'round';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x + sd * (gap + r * 1.0), y - r * 1.3); g.lineTo(x + sd * (gap - r * 0.8), y - r * 0.75); g.stroke(); }
  }
}
function walkPh(f) { const a = f / 4 * Math.PI * 2; return { a, s: Math.sin(a), sq: f % 2 ? 0.96 : 1.0, up: f % 2 ? 2 : 0 }; }

function drawGrunt2(g, W, H, f) {
  const u = H / 100; const P = walkPh(f);
  g.save(); g.translate(W / 2, 0); g.scale(u, u);
  // 尾巴
  g.strokeStyle = '#5a2fb0'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(14, 78); g.quadraticCurveTo(34, 76 + P.s * 4, 30, 62); g.stroke();
  g.fillStyle = '#5a2fb0'; poly(g, [26, 60, 34, 56, 32, 66]); g.fill();
  // 腳
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, sd * P.s) * 6;
    g.fillStyle = rad(g, sd * 14, 92 - lift, 11, '#7d55d8', '#3c2180');
    ell(g, sd * 14, 92 - lift, 11, 6.5); g.fill();
    g.fillStyle = '#e8dcff'; for (let k = -1; k <= 1; k++) { ell(g, sd * 14 + k * 4.5, 96 - lift, 1.8, 1.4); g.fill(); }
  }
  g.translate(0, P.up); g.scale(1, P.sq); g.translate(0, (1 - P.sq) * 90);
  // 手
  for (const sd of [-1, 1]) {
    const sw = sd * P.s * 6;
    g.fillStyle = rad(g, sd * 34, 58 + sw, 10, '#9a72f0', '#4a28a0');
    ell(g, sd * 34, 58 + sw, 8.5, 11); g.fill();
    g.fillStyle = '#f3e9ff'; for (let k = -1; k <= 1; k++) { poly(g, [sd * 34 + k * 3.5 - 1.2, 67 + sw, sd * 34 + k * 3.5, 72 + sw, sd * 34 + k * 3.5 + 1.2, 67 + sw]); g.fill(); }
  }
  // 角
  for (const sd of [-1, 1]) {
    g.fillStyle = lin(g, sd * 12, 30, sd * 24, 4, ['#d9c08a', '#fff2cf']);
    g.beginPath(); g.moveTo(sd * 11, 28); g.quadraticCurveTo(sd * 22, 12, sd * 25, 3); g.quadraticCurveTo(sd * 21, 18, sd * 22, 31); g.fill();
    g.strokeStyle = 'rgba(140,100,40,.5)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(sd * 13, 23); g.lineTo(sd * 21, 22); g.moveTo(sd * 16, 16); g.lineTo(sd * 22, 15); g.stroke();
  }
  // 身體
  g.fillStyle = rad(g, -3, 56, 36, '#c09cff', '#4f25b0');
  ell(g, 0, 58, 31, 34); g.fill();
  g.fillStyle = 'rgba(70,30,150,.35)';
  for (const [x, y, r] of [[-20, 44, 3.5], [21, 52, 3], [-22, 70, 2.5], [18, 74, 3.5], [8, 32, 2.5]]) { ell(g, x, y, r, r); g.fill(); }
  g.fillStyle = rad(g, 0, 74, 18, 'rgba(255,235,255,.55)', 'rgba(255,235,255,.12)', 0, -0.2); ell(g, 0, 73, 18, 15); g.fill();
  eyes2(g, 0, 46, 8.8, 11, true);
  // 腮紅
  g.fillStyle = 'rgba(255,120,190,.45)'; ell(g, -21, 57, 4.5, 2.6); g.fill(); ell(g, 21, 57, 4.5, 2.6); g.fill();
  // 嘴
  g.fillStyle = '#2a1240'; g.beginPath(); g.ellipse(0, 63, 12, 7.5 + P.up, 0, 0, Math.PI); g.fill();
  g.fillStyle = '#ff6b8a'; g.beginPath(); g.ellipse(0, 68 + P.up * 0.6, 6, 2.6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff';
  poly(g, [-8, 63, -5, 69, -2, 63]); g.fill(); poly(g, [8, 63, 5, 69, 2, 63]); g.fill();
  g.restore();
}

function drawRunner2(g, W, H, f) {
  const u = H / 100; const P = walkPh(f);
  g.save(); g.translate(W / 2, 0); g.scale(u, u);
  // 長腿
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, sd * P.s) * 10;
    g.fillStyle = lin(g, sd * 10 - 5, 0, sd * 10 + 5, 0, ['#e0503a', '#a52a1c']);
    rr(g, sd * 10 - 4.5, 68 - lift, 9, 24, 4); g.fill();
    g.fillStyle = '#7a1c12'; ell(g, sd * 10, 93 - lift, 8, 4.5); g.fill();
  }
  g.translate(0, P.up * 1.5);
  // 耳朵
  for (const sd of [-1, 1]) {
    g.fillStyle = '#ff7a5c'; poly(g, [sd * 12, 30, sd * 36, 6 + P.s * sd * 2, sd * 24, 42]); g.fill();
    g.fillStyle = '#ffd0b8'; poly(g, [sd * 15, 31, sd * 31, 13 + P.s * sd * 2, sd * 23, 38]); g.fill();
  }
  // 頭身
  g.fillStyle = rad(g, -3, 48, 28, '#ffa080', '#b5281a');
  ell(g, 0, 50, 23, 27); g.fill();
  g.fillStyle = 'rgba(255,230,200,.5)'; ell(g, 0, 62, 13, 10); g.fill();
  // 頭頂毛
  g.fillStyle = '#c3301f'; poly(g, [-8, 25, -2, 15, 0, 25, 5, 14, 8, 26]); g.fill();
  // 手臂往後擺（跑很快）
  for (const sd of [-1, 1]) {
    g.fillStyle = '#c3301f';
    ell(g, sd * 25, 58 - sd * P.s * 8, 6, 8.5); g.fill();
  }
  eyes2(g, 0, 44, 7.2, 9, true, '#3a0c08');
  g.fillStyle = '#3a0c08'; g.beginPath(); g.ellipse(0, 59, 8, 4.5, 0, 0, Math.PI); g.fill();
  g.fillStyle = '#fff'; poly(g, [-5, 59, -3, 63, -1, 59]); g.fill(); poly(g, [5, 59, 3, 63, 1, 59]); g.fill();
  // 速度線
  g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 1.6; g.lineCap = 'round';
  for (const [x, y, l] of [[-30, 36, 8], [30, 40, 7], [-33, 66, 6]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - l); g.stroke(); }
  g.restore();
}

function drawBrute2(g, W, H, f) {
  const u = H / 100; const P = walkPh(f);
  g.save(); g.translate(W / 2, 0); g.scale(u, u);
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, sd * P.s) * 4;
    g.fillStyle = rad(g, sd * 19, 90 - lift, 13, '#5fa452', '#2a5c24'); rr(g, sd * 19 - 10, 80 - lift, 20, 14, 7); g.fill();
    g.fillStyle = '#1e3a1a'; ell(g, sd * 19, 95 - lift, 14, 5); g.fill();
    g.fillStyle = '#efe7cc'; for (let k = -1; k <= 1; k++) { ell(g, sd * 19 + k * 6, 96 - lift, 2.2, 1.6); g.fill(); }
  }
  g.translate(0, P.up * 0.7);
  // 大拳頭
  for (const sd of [-1, 1]) {
    const sw = sd * P.s * 4;
    g.fillStyle = rad(g, sd * 40, 50 + sw, 12, '#8fe07f', '#367f2e');
    ell(g, sd * 40, 50 + sw, 11, 16); g.fill(); // 手臂
    g.fillStyle = rad(g, sd * 42, 68 + sw, 12, '#a3ec92', '#3a8a32');
    ell(g, sd * 42, 68 + sw, 12.5, 11.5); g.fill();
    g.fillStyle = '#f2e6c4'; rr(g, sd * 42 - 9, 60 + sw, 18, 4, 2); g.fill(); // 繃帶
  }
  // 身體
  g.fillStyle = rad(g, -4, 52, 42, '#a8ee96', '#347e2c');
  ell(g, 0, 55, 36, 39); g.fill();
  g.fillStyle = 'rgba(30,80,30,.3)';
  for (const [x, y, r] of [[-25, 40, 4], [26, 46, 3.5], [-28, 64, 3], [22, 30, 3]]) { ell(g, x, y, r, r); g.fill(); }
  g.fillStyle = rad(g, 0, 70, 22, 'rgba(255,255,220,.55)', 'rgba(255,255,220,.1)', 0, -0.2); ell(g, 0, 70, 22, 17); g.fill();
  // 腰布
  g.fillStyle = '#7a4a26'; poly(g, [-26, 78, 26, 78, 20, 92, 8, 86, 0, 94, -8, 86, -20, 92]); g.fill();
  g.fillStyle = '#c9a050'; rr(g, -27, 75, 54, 6, 3); g.fill();
  g.fillStyle = '#ffe28a'; rr(g, -5, 74, 10, 8, 2); g.fill();
  // 背刺
  g.fillStyle = '#efe7cc';
  for (let i = -2; i <= 2; i++) { poly(g, [i * 9 - 4.5, 22 + Math.abs(i) * 2.5, i * 9, 10 + Math.abs(i) * 3, i * 9 + 4.5, 22 + Math.abs(i) * 2.5]); g.fill(); }
  eyes2(g, 0, 38, 6.2, 10, true, '#1d2a10');
  // 疤
  g.strokeStyle = 'rgba(40,60,20,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(17, 30); g.lineTo(13, 43); g.moveTo(13, 33); g.lineTo(18, 35); g.moveTo(14, 38); g.lineTo(19, 40); g.stroke();
  g.fillStyle = '#1d3a19'; rr(g, -15, 51, 30, 11, 5); g.fill();
  g.fillStyle = '#fffbe8';
  for (const sd of [-1, 1]) { poly(g, [sd * 11, 56, sd * 9, 43, sd * 5, 56]); g.fill(); }
  g.restore();
}

function drawShield2(g, W, H, f) {
  const u = H / 100; const P = walkPh(f);
  g.save(); g.translate(W / 2, 0); g.scale(u, u);
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, sd * P.s) * 5;
    g.fillStyle = '#3c4256'; rr(g, sd * 11 - 5, 80 - lift, 10, 13, 3); g.fill();
    g.fillStyle = '#23283a'; ell(g, sd * 11, 94 - lift, 9, 4.5); g.fill();
  }
  g.translate(0, P.up);
  // 劍
  g.fillStyle = lin(g, 30, 0, 36, 0, ['#cfd8ea', '#7d8aa8']); poly(g, [31, 18, 35, 12, 37, 18, 36, 56, 32, 56]); g.fill();
  g.fillStyle = '#c9a050'; rr(g, 27, 55, 14, 4, 2); g.fill();
  // 頭與頭盔
  g.fillStyle = rad(g, -2, 26, 18, '#9fbf86', '#4f6f3a'); ell(g, 0, 28, 15, 14); g.fill();
  eyes2(g, 0, 29, 4.8, 6.5, true, '#1d2a10');
  g.fillStyle = rad(g, -3, 16, 18, '#e0e8f8', '#6a7594'); g.beginPath(); g.ellipse(0, 22, 18, 13, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#596384'; rr(g, -19, 20, 38, 5, 2.5); g.fill();
  g.fillStyle = '#e8453c'; g.beginPath(); g.moveTo(-2, 9); g.quadraticCurveTo(8, -2, 16, 6); g.quadraticCurveTo(8, 4, 2, 11); g.fill(); // 羽毛
  // 盾牌
  g.fillStyle = lin(g, -30, 36, 30, 92, ['#b9c8e6', '#7a8bb0', '#4e5d80']);
  g.beginPath(); g.moveTo(-30, 38); g.lineTo(30, 38); g.lineTo(30, 70); g.quadraticCurveTo(28, 86, 0, 96); g.quadraticCurveTo(-28, 86, -30, 70); g.closePath(); g.fill();
  g.strokeStyle = '#ffd25c'; g.lineWidth = 3.2;
  g.beginPath(); g.moveTo(-25.5, 42.5); g.lineTo(25.5, 42.5); g.lineTo(25.5, 69); g.quadraticCurveTo(24, 82, 0, 90.5); g.quadraticCurveTo(-24, 82, -25.5, 69); g.closePath(); g.stroke();
  g.fillStyle = '#ffd25c'; poly(g, [0, 50, 10, 62, 0, 80, -10, 62]); g.fill();
  g.fillStyle = '#e8453c'; poly(g, [0, 56, 5, 62, 0, 72, -5, 62]); g.fill();
  g.fillStyle = '#e9eef8'; for (const [x, y] of [[-25, 47], [25, 47], [-25, 66], [25, 66], [0, 86]]) { ell(g, x, y, 1.8, 1.8); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.3)'; rr(g, -25, 43, 18, 7, 3); g.fill();
  // 握盾的手
  g.fillStyle = '#7f9f6a'; ell(g, -31, 60 + P.s * 2, 5, 6); g.fill();
  g.restore();
}


function drawThrower2(g, W, H, f) {
  const u = H / 100; const P = walkPh(f);
  g.save(); g.translate(W / 2, 0); g.scale(u, u);
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, sd * P.s) * 5;
    g.fillStyle = '#6a4a1a'; rr(g, sd * 10 - 5, 78 - lift, 10, 14, 4); g.fill();
    g.fillStyle = '#3a2810'; ell(g, sd * 10, 94 - lift, 9, 4.5); g.fill();
  }
  g.translate(0, P.up);
  // 背上的炸彈袋
  g.fillStyle = '#7a5a2a'; rr(g, -24, 40, 48, 34, 10); g.fill();
  for (const [x, y] of [[-14, 38], [0, 34], [14, 38]]) { g.fillStyle = rad(g, x, y, 7, '#5a5f70', '#14161c'); ell(g, x, y, 7, 7); g.fill(); g.fillStyle = '#ffd34d'; ell(g, x + 2, y - 7, 2, 2); g.fill(); }
  // 身體
  g.fillStyle = rad(g, -3, 58, 26, '#ffd27a', '#c97a1f'); ell(g, 0, 60, 24, 26); g.fill();
  g.fillStyle = 'rgba(255,245,210,.5)'; ell(g, 0, 70, 13, 10); g.fill();
  // 頭巾
  g.fillStyle = '#d83a3a'; rr(g, -20, 34, 40, 8, 4); g.fill();
  g.fillStyle = '#d83a3a'; poly(g, [18, 36, 30, 30 + P.s * 2, 28, 42]); g.fill();
  eyes2(g, 0, 50, 6.5, 8.5, true, '#3a1a05');
  g.fillStyle = '#3a1a05'; g.beginPath(); g.ellipse(0, 64, 7, 4, 0, 0, Math.PI); g.fill();
  // 舉起丟炸彈的手
  g.fillStyle = '#e09a3a'; ell(g, 26, 40, 6, 9); g.fill();
  g.fillStyle = rad(g, 28, 28, 7, '#5a5f70', '#14161c'); ell(g, 28, 28, 7, 7); g.fill();
  g.fillStyle = '#ffd34d'; ell(g, 31, 20, 2.4, 2.4); g.fill();
  g.fillStyle = '#e09a3a'; ell(g, -25, 62 + P.s * 3, 6, 8); g.fill();
  g.restore();
}
function drawSplitter2(g, W, H, f) {
  const u = H / 100; const P = walkPh(f);
  g.save(); g.translate(W / 2, 0); g.scale(u, u);
  const sq = 1 + (f % 2 ? 0.08 : -0.04);
  g.translate(0, 96); g.scale(1 / sq, sq); g.translate(0, -96);
  g.fillStyle = rad(g, -6, 60, 40, 'rgba(190,255,150,.95)', 'rgba(40,150,60,.95)', -0.3, -0.5);
  g.beginPath(); g.moveTo(-36, 96); g.quadraticCurveTo(-42, 40, 0, 26); g.quadraticCurveTo(42, 40, 36, 96); g.closePath(); g.fill();
  // 身體裡的小史萊姆影子
  g.fillStyle = 'rgba(30,110,40,.35)'; for (const [x, y, r] of [[-14, 74, 8], [12, 78, 7], [0, 60, 6]]) { ell(g, x, y, r, r * 0.8); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.55)'; ell(g, -16, 44, 8, 5); g.fill(); ell(g, -6, 38, 3, 2); g.fill();
  eyes2(g, 0, 58, 7, 10, false, '#123a12');
  g.fillStyle = '#123a12'; g.beginPath(); g.ellipse(0, 74, 8, 5, 0, 0, Math.PI); g.fill();
  g.fillStyle = 'rgba(40,150,60,.9)'; ell(g, -30, 96, 6, 3); g.fill(); ell(g, 28, 97, 7, 3); g.fill();
  g.restore();
}

// ---------- 死亡變成的小金幣 ----------
function drawCoin(g, W, H) {
  const c = W / 2;
  g.fillStyle = rad(g, c, c, c * 0.9, '#fff3a8', '#d99a10'); ell(g, c, c, c * 0.88, c * 0.88); g.fill();
  g.strokeStyle = '#a86400'; g.lineWidth = c * 0.12; ell(g, c, c, c * 0.66, c * 0.66); g.stroke();
  g.fillStyle = '#a86400'; g.font = `900 ${c * 0.9}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', c, c * 1.04);
}

// 發光圖（子彈頭、槍口火光共用）
function glowSprite(col, size) {
  return mk(size, size, g => {
    const c = size / 2;
    const gr = g.createRadialGradient(c, c, 0, c, c, c);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, col); gr.addColorStop(0.5, col.replace(/^#(..)(..)(..)$/, (m, r, gg, b) => `rgba(${parseInt(r, 16)},${parseInt(gg, 16)},${parseInt(b, 16)},.35)`)); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
  });
}
function starFlash(col, size) {
  return mk(size, size, g => {
    const c = size / 2;
    g.translate(c, c);
    g.fillStyle = col;
    for (let i = 0; i < 4; i++) {
      g.rotate(Math.PI / 4);
      g.beginPath(); g.moveTo(0, -c * (i % 2 ? 0.55 : 0.95)); g.lineTo(c * 0.12, 0); g.lineTo(0, c * (i % 2 ? 0.55 : 0.95)); g.lineTo(-c * 0.12, 0); g.closePath(); g.fill();
    }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, c * 0.5);
    gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; ell(g, 0, 0, c * 0.5, c * 0.5); g.fill();
  });
}
function puffSprite(size, col) {
  return mk(size, size, g => {
    const c = size / 2;
    for (const [x, y, r] of [[0, 0, 0.55], [-0.3, 0.12, 0.38], [0.32, 0.1, 0.4], [0.05, -0.28, 0.36]]) {
      const gr = g.createRadialGradient(c + x * c - r * c * 0.3, c + y * c - r * c * 0.3, 0, c + x * c, c + y * c, r * c);
      gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
      g.fillStyle = gr; ell(g, c + x * c, c + y * c, r * c, r * c); g.fill();
    }
  });
}

function buildChars() {
  const SH = 168;
  const OL = 'rgba(14,22,48,.9)';
  ART.soldierV = [0, 1, 2].map(v => [0, 1, 2, 3].map(f => outlined(mk(Math.round(SH * 0.66), SH, (g, w, h) => drawSoldier2(g, w, h, f, v)), OL, 2.2)));
  ART.soldierIdle = [0, 1, 2].map(v => outlined(mk(Math.round(SH * 0.66), SH, (g, w, h) => drawSoldier2(g, w, h, 0, v)), OL, 2.2));
  const enemy = (fn, w, h, ol) => {
    const fr = [0, 1, 2, 3].map(f => outlined(mk(w, h, (g, W, H) => fn(g, W, H, f)), ol, 2.6));
    return { fr, fl: fr.map(flashOf), red: fr.map(s => mk(s.width, s.height, g => { g.drawImage(s, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,60,60,.45)'; g.fillRect(0, 0, s.width, s.height); })) };
  };
  ART.grunt = enemy(drawGrunt2, 180, 180, 'rgba(36,10,70,.92)');
  ART.runner = enemy(drawRunner2, 150, 160, 'rgba(70,10,4,.92)');
  ART.brute = enemy(drawBrute2, 300, 280, 'rgba(14,40,10,.92)');
  ART.shield = enemy(drawShield2, 176, 186, 'rgba(20,24,40,.92)');
  ART.thrower = enemy(drawThrower2, 176, 176, 'rgba(70,30,0,.92)');
  ART.splitter = enemy(drawSplitter2, 180, 160, 'rgba(10,50,14,.92)');
  ART.coin = mk(48, 48, drawCoin);
  ART.glow = {};
  for (const k in WEAPONS) ART.glow[k] = glowSprite(WEAPONS[k].col.length === 7 ? WEAPONS[k].col : '#ffcc33', 64);
  ART.glowW = glowSprite('#fff2b0', 64);
  ART.flash = { y: starFlash('#ffd34d', 96), c: starFlash('#7df9ff', 96), o: starFlash('#ff8a3d', 96) };
  ART.smoke = puffSprite(96, ['rgba(235,235,235,.9)', 'rgba(150,150,150,0)']);
  ART.dust = puffSprite(96, ['rgba(255,255,255,.95)', 'rgba(220,220,235,0)']);
  ART.fire = puffSprite(96, ['rgba(255,240,170,1)', 'rgba(255,90,20,0)']);
}
