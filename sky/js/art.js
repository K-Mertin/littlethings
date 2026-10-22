'use strict';
// 圖像：所有角色都用程式畫好後快取成小畫布（依畫面縮放重建，保持清晰）
const Art = {
  scale: 2, cache: Object.create(null),
  setScale(s) { this.scale = s; this.cache = Object.create(null); },
  get(name, variant = '') {
    const key = name + variant;
    let c = this.cache[key];
    if (c) return c;
    const bk = typeof Bake !== 'undefined' && Bake.imgs[name];
    if (bk) {
      if (!variant) return bk;
      c = document.createElement('canvas'); c.width = bk.width; c.height = bk.height;
      const g = c.getContext('2d'); g.drawImage(bk, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = variant === 'w' ? 'rgba(255,255,255,.75)' : '#000'; g.fillRect(0, 0, c.width, c.height);
      c.lw = bk.lw; c.lh = bk.lh; this.cache[key] = c;
      return c;
    }
    const d = SPR[name], pad = 2;
    if (!d) return null;
    c = document.createElement('canvas');
    c.width = Math.ceil((d.w + pad * 2) * this.scale); c.height = Math.ceil((d.h + pad * 2) * this.scale);
    const g = c.getContext('2d');
    g.scale(this.scale, this.scale); g.translate(d.w / 2 + pad, d.h / 2 + pad);
    d.draw(g);
    if (variant === 'w' || variant === 's') {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = variant === 'w' ? 'rgba(255,255,255,.8)' : '#000';
      g.fillRect(0, 0, c.width, c.height);
    }
    c.lw = d.w + pad * 2; c.lh = d.h + pad * 2;
    this.cache[key] = c;
    return c;
  },
  draw(ctx, name, x, y, ang = 0, alpha = 1, sx = 1, sy = 1, variant = '') {
    const c = this.get(name, variant);
    if (!c) return;
    ctx.save(); ctx.translate(x, y);
    if (ang) ctx.rotate(ang);
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    ctx.drawImage(c, -c.lw / 2 * sx, -c.lh / 2 * sy, c.lw * sx, c.lh * sy);
    ctx.restore();
  },
  // 空中單位的影子：畫在地面上，往右下偏移
  shadow(ctx, name, x, y, ang = 0, s = 0.75) {
    this.draw(ctx, name, x + 14, y + 26, ang, 0.28, s, s, 's');
  },
};

function P_(g, pts, fill, stroke, lw = 1) {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function mirror(g, pts, fill, stroke, lw) { P_(g, pts, fill, stroke, lw); P_(g, pts.map((v, i) => i % 2 ? v : -v), fill, stroke, lw); }
function circ(g, x, y, r, fill, stroke, lw = 1) {
  g.beginPath(); g.arc(x, y, r, 0, TAU);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function rr(g, x, y, w, h, r, fill, stroke, lw = 1) {
  g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  return gr;
}
function rad(g, x, y, r, stops) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  return gr;
}

const SPR = {
  // 玩家戰機（機頭朝上）
  player: { w: 36, h: 40, draw(g) {
    mirror(g, [0, -5, 17, 8, 17, 12, 4, 10, 0, 12], '#8a97a6');
    mirror(g, [14, 5, 17, 8, 17, 12, 14, 11.6], '#d8322b');
    mirror(g, [3, 9, 9, 16, 9, 19, 2, 17], '#728090');
    g.beginPath(); g.moveTo(0, -20); g.bezierCurveTo(4.5, -15, 5.5, -6, 5.5, 4); g.lineTo(4.4, 17); g.lineTo(-4.4, 17); g.lineTo(-5.5, 4); g.bezierCurveTo(-5.5, -6, -4.5, -15, 0, -20); g.closePath();
    g.fillStyle = lin(g, -6, 0, 6, 0, ['#9aa6b2', '#eef2f6', '#b3bdc8', '#7f8b97']); g.fill();
    g.beginPath(); g.moveTo(0, -20); g.bezierCurveTo(2.6, -17, 3.6, -14, 3.9, -11.5); g.lineTo(-3.9, -11.5); g.bezierCurveTo(-3.6, -14, -2.6, -17, 0, -20); g.closePath(); g.fillStyle = '#d8322b'; g.fill();
    g.beginPath(); g.ellipse(0, -4, 2.7, 5.6, 0, 0, TAU); g.fillStyle = lin(g, 0, -10, 0, 2, ['#e8fbff', '#47b6e6', '#1b5f8c']); g.fill();
    g.strokeStyle = 'rgba(40,50,60,.45)'; g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(-9, 6); g.lineTo(-4.5, 6); g.moveTo(9, 6); g.lineTo(4.5, 6); g.moveTo(0, 3); g.lineTo(0, 15); g.stroke();
    rr(g, -4.3, 15, 3.2, 4, 1, '#3a3f45'); rr(g, 1.1, 15, 3.2, 4, 1, '#3a3f45');
  } },
  // 小戰鬥機（機頭朝下）
  fighter: { w: 28, h: 28, draw(g) {
    mirror(g, [2, 0, 13, -5, 13, -8.5, 2, -6], '#56623a');
    mirror(g, [1.5, -9, 6, -13, 6, -11, 1.5, -6], '#4a5532');
    g.beginPath(); g.moveTo(0, 13); g.bezierCurveTo(3.4, 8, 3.8, 2, 3.8, -4); g.lineTo(2.6, -12); g.lineTo(-2.6, -12); g.lineTo(-3.8, -4); g.bezierCurveTo(-3.8, 2, -3.4, 8, 0, 13); g.closePath();
    g.fillStyle = lin(g, -4, 0, 4, 0, ['#5c6a3c', '#9aa865', '#5c6a3c']); g.fill();
    circ(g, 9, -5.5, 1.7, '#c0392b'); circ(g, -9, -5.5, 1.7, '#c0392b');
    g.beginPath(); g.ellipse(0, 3.5, 1.8, 3.4, 0, 0, TAU); g.fillStyle = '#1d2a30'; g.fill();
  } },
  // 快速戰機（從後方往上衝，機頭朝上）
  jet: { w: 26, h: 32, draw(g) {
    mirror(g, [2, -2, 12, 8, 12, 11, 2, 7], '#2c3e70');
    mirror(g, [2, 9, 6, 15, 6, 16, 2, 14], '#22325c');
    g.beginPath(); g.moveTo(0, -15); g.lineTo(3.4, -6); g.lineTo(3.2, 14); g.lineTo(-3.2, 14); g.lineTo(-3.4, -6); g.closePath();
    g.fillStyle = lin(g, -4, 0, 4, 0, ['#2a3a66', '#6d84c2', '#2a3a66']); g.fill();
    g.beginPath(); g.ellipse(0, -4, 1.6, 3.6, 0, 0, TAU); g.fillStyle = '#ffd36b'; g.fill();
    circ(g, 8, 8, 1.4, '#ffcc33'); circ(g, -8, 8, 1.4, '#ffcc33');
  } },
  // 小飛碟（成群出現）
  drone: { w: 22, h: 22, draw(g) {
    circ(g, 0, 0, 10, rad(g, -2, -2, 12, ['#ff7a5c', '#c0392b', '#6b1a12']));
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4; rr(g, Math.cos(a) * 7 - 1.6, Math.sin(a) * 7 - 1.6, 3.2, 3.2, 1, '#ffd36b'); }
    circ(g, 0, 0, 4.5, rad(g, -1, -1, 5, ['#fff6c8', '#f1c40f', '#a67c00']));
    circ(g, 0, 0, 10, null, 'rgba(0,0,0,.35)', 1);
  } },
  // 直升機機身（旋翼另外畫）
  chopper: { w: 30, h: 42, draw(g) {
    rr(g, -1.6, -20, 3.2, 14, 1, '#3e4d30');
    rr(g, -5, -21, 10, 2.4, 1, '#2e3a24');
    rr(g, -13, -1, 26, 3.4, 1.5, '#3e4d30');
    rr(g, -14, -3, 4, 8, 1.5, '#2b3522'); rr(g, 10, -3, 4, 8, 1.5, '#2b3522');
    g.beginPath(); g.ellipse(0, 2, 7.5, 12, 0, 0, TAU); g.fillStyle = lin(g, -8, 0, 8, 0, ['#3e4d30', '#7d9455', '#3e4d30']); g.fill();
    g.beginPath(); g.ellipse(0, 9, 4.6, 4, 0, 0, TAU); g.fillStyle = lin(g, 0, 5, 0, 13, ['#d8f4ff', '#5fa9c9']); g.fill();
    circ(g, 0, -1, 2.2, '#222');
  } },
  // 道具運輸機（白橘色，打下來會掉道具）
  carrier: { w: 34, h: 40, draw(g) {
    rr(g, -2, -19, 4, 12, 1, '#e8e8e0');
    rr(g, -6, -20, 12, 3, 1, '#f08a24');
    g.beginPath(); g.ellipse(0, 2, 11, 13, 0, 0, TAU); g.fillStyle = lin(g, -11, 0, 11, 0, ['#c9c9c0', '#ffffff', '#c9c9c0']); g.fill();
    g.save(); g.beginPath(); g.ellipse(0, 2, 11, 13, 0, 0, TAU); g.clip();
    g.fillStyle = '#f08a24'; g.fillRect(-12, -4, 24, 4); g.fillRect(-12, 3, 24, 2); g.restore();
    g.beginPath(); g.ellipse(0, 10, 5.5, 4, 0, 0, TAU); g.fillStyle = '#7fd0f0'; g.fill();
    circ(g, 0, 2, 11.5, null, 'rgba(0,0,0,.3)', 1);
  } },
  // 戰車車身（車頭朝下）
  tank: { w: 28, h: 34, draw(g) {
    for (const sx of [-1, 1]) {
      rr(g, sx * 10 - 3.5, -15, 7, 30, 2, '#2c2b26');
      g.strokeStyle = '#4a4840'; g.lineWidth = 1;
      for (let y = -13; y < 15; y += 3) { g.beginPath(); g.moveTo(sx * 10 - 3, y); g.lineTo(sx * 10 + 3, y); g.stroke(); }
    }
    rr(g, -8, -13, 16, 27, 2, lin(g, -8, 0, 8, 0, ['#6f6a42', '#a39c66', '#6f6a42']));
    rr(g, -6, 9, 12, 3, 1, '#5b5735');
  } },
  // 砲塔（轉動的部分，砲管朝下）
  tankTur: { w: 30, h: 30, draw(g) {
    rr(g, -1.6, 2, 3.2, 13, 1, '#4f4c30');
    circ(g, 0, 0, 6.5, rad(g, -2, -2, 8, ['#c9c08a', '#8a8456', '#5b5735']));
    circ(g, 1.5, -1.5, 1.6, '#3e3b24');
  } },
  // 地面防空砲座
  pad: { w: 34, h: 34, draw(g) {
    const o = [];
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + TAU / 16; o.push(Math.cos(a) * 16, Math.sin(a) * 16); }
    P_(g, o, '#6d6d66');
    const o2 = o.map(v => v * 0.82);
    P_(g, o2, lin(g, -14, -14, 14, 14, ['#c4c4ba', '#8f8f86']));
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.stroke();
  } },
  gunTur: { w: 30, h: 30, draw(g) {
    rr(g, -4, 1, 2.6, 13, 1, '#3c3f44'); rr(g, 1.4, 1, 2.6, 13, 1, '#3c3f44');
    circ(g, 0, 0, 7, rad(g, -2, -2, 9, ['#b9c0c8', '#6b737c', '#3e444a']));
    rr(g, -2.5, -3, 5, 3, 1, '#2a2e33');
  } },
  // 小砲艇（船頭朝上）
  boat: { w: 20, h: 46, draw(g) {
    g.beginPath(); g.moveTo(0, -22); g.bezierCurveTo(7, -12, 8, 0, 8, 14); g.lineTo(6.5, 21); g.lineTo(-6.5, 21); g.lineTo(-8, 14); g.bezierCurveTo(-8, 0, -7, -12, 0, -22); g.closePath();
    g.fillStyle = lin(g, -8, 0, 8, 0, ['#5d6b72', '#a6b3ba', '#5d6b72']); g.fill();
    rr(g, -4.5, -2, 9, 11, 1.5, '#d5dadc'); rr(g, -3, 0, 6, 3, 1, '#2d3a40');
    rr(g, -2, 12, 4, 5, 1, '#7d8a90');
  } },
  // 巡洋艦（船頭朝上，砲塔另外畫）
  cruiser: { w: 60, h: 176, draw(g) {
    g.beginPath(); g.moveTo(0, -87); g.bezierCurveTo(22, -60, 26, -20, 26, 30); g.bezierCurveTo(26, 60, 22, 80, 16, 86); g.lineTo(-16, 86); g.bezierCurveTo(-22, 80, -26, 60, -26, 30); g.bezierCurveTo(-26, -20, -22, -60, 0, -87); g.closePath();
    g.fillStyle = lin(g, -26, 0, 26, 0, ['#4f5b62', '#98a5ad', '#5d6a72']); g.fill();
    g.strokeStyle = '#3a444a'; g.lineWidth = 1.2; g.stroke();
    g.beginPath(); g.moveTo(0, -78); g.bezierCurveTo(16, -55, 19, -20, 19, 30); g.lineTo(17, 78); g.lineTo(-17, 78); g.lineTo(-19, 30); g.bezierCurveTo(-19, -20, -16, -55, 0, -78); g.closePath();
    g.fillStyle = '#8d8a7c'; g.fill();
    g.strokeStyle = 'rgba(60,55,45,.35)'; g.lineWidth = 0.6;
    for (let y = -70; y < 78; y += 4) { g.beginPath(); g.moveTo(-18, y); g.lineTo(18, y); g.stroke(); }
    rr(g, -11, -12, 22, 30, 3, lin(g, -11, 0, 11, 0, ['#9aa4aa', '#d7dde0', '#9aa4aa']));
    rr(g, -7, -8, 14, 10, 2, '#b8c0c4'); rr(g, -5, -6, 10, 3, 1, '#2d3a40');
    circ(g, 0, 26, 4, '#555'); rr(g, -1.5, 28, 3, 10, 1, '#444');
    circ(g, 0, 62, 9, null, '#e8e2c8', 1.2);
  } },
  // 大型轟炸機（中頭目，機頭朝下）
  bomber: { w: 128, h: 92, draw(g) {
    mirror(g, [6, 2, 62, -14, 62, -22, 6, -14], '#545c5f');
    mirror(g, [6, 2, 62, -14, 62, -16, 6, -2], '#6e7779');
    mirror(g, [4, -32, 22, -40, 22, -44, 4, -40], '#4c5457');
    for (const x of [-42, -24, 24, 42]) { rr(g, x - 4, -16, 8, 22, 3, '#3d4446'); circ(g, x, 8, 3.5, '#222'); }
    g.beginPath(); g.moveTo(0, 44); g.bezierCurveTo(10, 32, 11, 10, 11, -10); g.lineTo(8, -44); g.lineTo(-8, -44); g.lineTo(-11, -10); g.bezierCurveTo(-11, 10, -10, 32, 0, 44); g.closePath();
    g.fillStyle = lin(g, -11, 0, 11, 0, ['#4a5255', '#a4adb0', '#4a5255']); g.fill();
    g.beginPath(); g.ellipse(0, 30, 5, 7, 0, 0, TAU); g.fillStyle = lin(g, 0, 22, 0, 38, ['#cdeefa', '#3f86a8']); g.fill();
    circ(g, 40, -16, 3.5, '#c0392b'); circ(g, -40, -16, 3.5, '#c0392b');
    circ(g, 0, 0, 5, '#2b3133'); circ(g, 0, -22, 4, '#2b3133');
  } },
  // 卡車（車頭朝下）
  truck: { w: 14, h: 26, draw(g) {
    rr(g, -6, -12, 12, 16, 1.5, '#5e6b3f'); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = .7;
    for (let y = -10; y < 4; y += 3) { g.beginPath(); g.moveTo(-5, y); g.lineTo(5, y); g.stroke(); }
    rr(g, -5.5, 5, 11, 7, 2, '#7a8a52'); rr(g, -4, 9, 8, 2, 1, '#2d3a40');
  } },
  // 子彈
  // 敵彈：亮核心＋彩色環＋深色外框（在白雲、沙漠上也看得清楚）
  eb: { w: 13, h: 13, draw(g) {
    circ(g, 0, 0, 6.2, rad(g, 0, 0, 6.2, ['rgba(255,120,30,.55)', 'rgba(255,90,20,0)']));
    circ(g, 0, 0, 4.1, 'rgba(70,10,0,.85)');
    circ(g, 0, 0, 3.4, rad(g, -0.8, -0.8, 3.6, ['#ffffff', '#fff1a8', '#ff8a1e']));
  } },
  ebB: { w: 19, h: 19, draw(g) {
    circ(g, 0, 0, 9, rad(g, 0, 0, 9, ['rgba(255,60,160,.55)', 'rgba(255,0,120,0)']));
    circ(g, 0, 0, 6.4, 'rgba(60,0,30,.85)');
    circ(g, 0, 0, 5.6, rad(g, -1.2, -1.2, 6, ['#ffffff', '#ffc4e6', '#ff2f92']));
    circ(g, 0, 0, 3.6, null, 'rgba(255,255,255,.6)', 0.8);
  } },
  emis: { w: 8, h: 18, draw(g) { rr(g, -2, -7, 4, 13, 2, '#d9d9d9'); P_(g, [0, 9, 2, 5, -2, 5], '#e74c3c'); mirror(g, [2, -6, 4, -8, 2, -3], '#999'); } },
  pb: { w: 8, h: 20, draw(g) { rr(g, -3, -9, 6, 18, 3, lin(g, 0, -9, 0, 9, ['rgba(255,240,150,.5)', 'rgba(255,170,40,.35)', 'rgba(255,120,20,0)'])); rr(g, -1.5, -8, 3, 13, 1.5, lin(g, 0, -8, 0, 5, ['#ffffff', '#fff6b0', 'rgba(255,200,60,.4)'])); } },
  mis: { w: 8, h: 18, draw(g) { rr(g, -2, -7, 4, 13, 2, '#e5e8ea'); P_(g, [0, -10, 2, -6, -2, -6], '#d8322b'); mirror(g, [2, 3, 4, 7, 2, 6], '#7f8c95'); } },
  hmis: { w: 8, h: 18, draw(g) { rr(g, -2, -7, 4, 13, 2, '#e5e8ea'); P_(g, [0, -10, 2, -6, -2, -6], '#2ecc71'); mirror(g, [2, 3, 4, 7, 2, 6], '#7f8c95'); } },
};

// 道具圖示
const ITEM_COL = { red: ['#ff5a4e', '#a3170f'], blue: ['#4fb3ff', '#0f4fa3'], purple: ['#c77dff', '#5a1aa3'], M: ['#ffcf3a', '#a36a00'], H: ['#5fe08a', '#137a3a'], B: ['#ff9a3a', '#9a3a00'] };
for (const k in ITEM_COL) {
  const [c1, c2] = ITEM_COL[k];
  const letter = { red: 'V', blue: 'L', purple: 'P', M: 'M', H: 'H', B: 'B' }[k];
  SPR['it_' + k] = { w: 22, h: 22, draw(g) {
    if (k === 'red' || k === 'blue' || k === 'purple') {
      P_(g, [0, -10, 9, -4, 9, 5, 0, 10, -9, 5, -9, -4], lin(g, -9, -10, 9, 10, [c1, c2]), 'rgba(255,255,255,.85)', 1.2);
      P_(g, [0, -10, 9, -4, 0, 0, -9, -4], 'rgba(255,255,255,.35)');
    } else {
      rr(g, -9, -9, 18, 18, 5, lin(g, 0, -9, 0, 9, [c1, c2]), 'rgba(255,255,255,.85)', 1.2);
    }
    g.fillStyle = '#fff'; g.font = '900 11px "Silkscreen",ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,.45)'; g.strokeText(letter, 0, 1); g.fillText(letter, 0, 1);
  } };
}
SPR.medal = { w: 18, h: 18, draw(g) {
  circ(g, 0, 0, 8, rad(g, -2, -2, 9, ['#fff6c0', '#f5c518', '#a67c00']), '#7a5a00', 1);
  const s = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.4 : 5.4, a = -Math.PI / 2 + i * Math.PI / 5; s.push(Math.cos(a) * r, Math.sin(a) * r); }
  P_(g, s, '#fffbe0');
} };
SPR.oneup = { w: 22, h: 22, draw(g) {
  rr(g, -10, -10, 20, 20, 6, lin(g, 0, -10, 0, 10, ['#7dffb0', '#139a4a']), '#fff', 1.2);
  g.fillStyle = '#fff'; g.font = '700 8px "Silkscreen",ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1UP', 0, 1);
} };
SPR.lifeIcon = { w: 12, h: 14, draw(g) { g.scale(0.34, 0.34); SPR.player.draw(g); } };
