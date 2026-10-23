'use strict';
// 守塔奇兵：敵人美術（第二版：更精緻的造型與光影）。
// 每種敵人有 10 格走路（或拍翅）動畫＋6 格攻擊動畫（被英雄擋住時），快取後每幀只貼圖。
// 原點 = 腳底中心（飛行敵人是身體中心下方），面向右；R = 體型單位。
// 光影：每個部位用「亮—本色—暗」三階漸層，加上高光與暗部，快取時再加一層輪廓亮邊（Gfx.bevel）。

const Beasts = (() => {
  const { TAU, shade, rgba, ell, circ, rrect, poly, lgrad, rgrad } = Gfx;
  const FR = 10, FA = 6; // 走路格數、攻擊格數
  // 畫布範圍（以 R 為單位）：w 寬、h 高、ay 原點離上緣、top 血條高度、vis 視覺放大
  const BOX = {
    slime: { w: 2.9, h: 2.8, ay: 2.2, top: 1.8, vis: 1.45 },
    mini: { w: 2.9, h: 2.8, ay: 2.2, top: 1.8, vis: 1.5 },
    splitter: { w: 2.9, h: 2.8, ay: 2.2, top: 1.85, vis: 1.38 },
    runner: { w: 4.0, h: 3.0, ay: 2.3, top: 1.8, vis: 1.45 },
    beetle: { w: 3.6, h: 2.8, ay: 2.1, top: 1.65, vis: 1.4 },
    bat: { w: 4.8, h: 3.6, ay: 2.1, top: 1.5, vis: 1.45 },
    golem: { w: 3.4, h: 3.6, ay: 3.0, top: 2.6, vis: 1.35 },
    healer: { w: 3.2, h: 3.8, ay: 3.1, top: 2.85, vis: 1.38 },
    shield: { w: 3.4, h: 3.8, ay: 3.1, top: 2.75, vis: 1.35 },
    ogre: { w: 3.8, h: 3.8, ay: 3.1, top: 2.65, vis: 1.3 },
    gargoyle: { w: 5.0, h: 3.8, ay: 2.3, top: 1.75, vis: 1.38 },
    skeleton: { w: 3.2, h: 3.6, ay: 3.0, top: 2.65, vis: 1.4 },
    wisp: { w: 3.6, h: 3.4, ay: 2.1, top: 1.6, vis: 1.4 },
    crawler: { w: 4.0, h: 3.0, ay: 2.3, top: 1.85, vis: 1.4 },
    mummy: { w: 3.2, h: 3.8, ay: 3.1, top: 2.75, vis: 1.35 },
    crab: { w: 4.0, h: 3.0, ay: 2.3, top: 1.75, vis: 1.4 },
    bossGolem: { w: 4.0, h: 4.0, ay: 3.3, top: 2.95, vis: 1.3 },
    bossDragon: { w: 5.8, h: 4.4, ay: 2.7, top: 1.95, vis: 1.3 },
    bossLich: { w: 3.8, h: 4.4, ay: 3.6, top: 3.25, vis: 1.25 },
    bossRoc: { w: 6.2, h: 4.6, ay: 2.8, top: 2.0, vis: 1.3 },
    bossWorm: { w: 5.0, h: 4.2, ay: 3.5, top: 3.0, vis: 1.25 },
    bossPharaoh: { w: 3.8, h: 4.6, ay: 3.8, top: 3.45, vis: 1.25 },
    bossKraken: { w: 5.6, h: 4.8, ay: 3.9, top: 3.4, vis: 1.25 },
  };
  const OUT = 'rgba(28,18,30,.85)';
  const lw = R => Math.max(1, R * 0.055);
  function fs(x, f, s, w) { x.fillStyle = f; x.fill(); if (s) { x.strokeStyle = s; x.lineWidth = w; x.stroke(); } }
  // 三階漸層（光從左上來）
  const tri = (x, c, x0, y0, x1, y1, k) => lgrad(x, x0, y0, x1, y1, [shade(c, 0.32 * (k || 1)), c, shade(c, -0.38 * (k || 1))]);
  const ball = (x, cx, cy, r, c) => rgrad(x, cx - r * 0.35, cy - r * 0.4, r * 0.05, r * 1.15, [shade(c, 0.45), shade(c, 0.12), c, shade(c, -0.4)]);
  function spec(x, cx, cy, rx, ry, a) { x.beginPath(); x.ellipse(cx, cy, rx, ry, -0.5, 0, TAU); x.fillStyle = rgba('#ffffff', a || 0.55); x.fill(); }
  // 大眼睛：眼白漸層＋虹膜＋瞳孔＋兩個反光；angry = 眉毛下壓
  function eye(x, cx, cy, r, look, iris, angry) {
    x.beginPath(); x.ellipse(cx, cy, r * 0.82, r, 0, 0, TAU); fs(x, rgrad(x, cx, cy - r * 0.3, 0, r * 1.1, ['#ffffff', '#e8eef6']), OUT, Math.max(0.8, r * 0.16));
    const ix = cx + r * 0.28 * look, iy = cy + r * 0.12, ic = iris || '#3a2a4a';
    circ(x, ix, iy, r * 0.56, rgrad(x, ix, iy - r * 0.2, 0, r * 0.6, [shade(ic, 0.35), ic, shade(ic, -0.5)]));
    circ(x, ix + r * 0.05 * look, iy, r * 0.26, '#120a14');
    circ(x, ix - r * 0.14, iy - r * 0.22, r * 0.18, '#ffffff'); circ(x, ix + r * 0.18, iy + r * 0.2, r * 0.08, 'rgba(255,255,255,.8)');
    if (angry) { x.beginPath(); x.moveTo(cx - r * 0.95, cy - r * 1.05); x.lineTo(cx + r * 0.95, cy - r * 0.62); x.lineTo(cx + r * 0.95, cy - r * 1.25); x.closePath(); x.fillStyle = angry === 2 ? '#2a1a1a' : OUT; x.fill(); }
  }
  function limb(x, x0, y0, x1, y1, w, c) {
    x.lineCap = 'round';
    x.strokeStyle = OUT; x.lineWidth = w + Math.max(2, w * 0.3); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.strokeStyle = c; x.lineWidth = w; x.stroke();
    x.strokeStyle = rgba('#ffffff', 0.22); x.lineWidth = w * 0.28; x.beginPath(); x.moveTo(x0 - w * 0.15, y0 - w * 0.15); x.lineTo(x1 - w * 0.15, y1 - w * 0.15); x.stroke();
    x.lineCap = 'butt';
  }
  function leg2(x, hx, hy, ang, l1, l2, w, c, bend) {
    const kx = hx + Math.sin(ang) * l1, ky = hy + Math.cos(ang) * l1;
    const fx = kx + Math.sin(ang + (bend || 0.4)) * l2, fy = ky + Math.cos(ang + (bend || 0.4)) * l2;
    limb(x, hx, hy, kx, ky, w, c); limb(x, kx, ky, fx, fy, w * 0.9, c);
    return [fx, fy];
  }
  function mouth(x, cx, cy, w, open, teeth) {
    x.beginPath(); x.ellipse(cx, cy, w, Math.max(w * 0.15, open), 0, 0, Math.PI); x.closePath(); fs(x, '#5a1020', OUT, Math.max(0.8, w * 0.18));
    if (open > w * 0.25) { x.beginPath(); x.ellipse(cx, cy + open * 0.6, w * 0.5, open * 0.35, 0, Math.PI, 0); x.fillStyle = '#ff6a7a'; x.fill(); }
    if (teeth) for (const t of [-0.45, 0.45]) poly(x, [cx + t * w - w * 0.15, cy, cx + t * w, cy + w * 0.35, cx + t * w + w * 0.15, cy], '#fffbe8');
  }
  function crystalShard(x, cx, cy, w, h, col, t, R) {
    x.save(); x.translate(cx, cy); x.rotate(t);
    x.beginPath(); x.moveTo(-w, 0); x.lineTo(-w * 0.8, -h * 0.75); x.lineTo(0, -h); x.lineTo(w * 0.8, -h * 0.75); x.lineTo(w, 0); x.closePath();
    fs(x, lgrad(x, -w, 0, w, 0, [shade(col, 0.55), col, shade(col, -0.4)]), OUT, lw(R) * 0.7);
    x.beginPath(); x.moveTo(-w * 0.3, -h * 0.1); x.lineTo(-w * 0.3, -h * 0.8); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = Math.max(1, R * 0.04); x.stroke();
    x.restore();
  }

  // ───────── 史萊姆家族 ─────────
  function slime(x, R, p, col, inner, A) {
    const hop = Math.max(0, Math.sin(p)), lift = hop * R * 0.3 + A * R * 0.1;
    const sq = 1 + (Math.cos(p * 2) * 0.5 + (hop > 0.05 ? 0 : 0.5)) * 0.1 - A * 0.12;
    const w = R * 1.08 / sq, h = R * 1.5 * sq;
    x.beginPath(); x.ellipse(R * 0.05, 0, w * 0.95, R * 0.16, 0, 0, TAU); x.fillStyle = rgba(shade(col, -0.25), 0.55 * (1 - hop)); x.fill();
    x.save(); x.translate(A * R * 0.25, -lift);
    const body = () => { x.beginPath(); x.moveTo(-w, 0); x.bezierCurveTo(-w * 1.08, -h * 0.78, -w * 0.45, -h, 0, -h); x.bezierCurveTo(w * 0.6, -h, w * 1.08, -h * 0.72, w, 0); x.quadraticCurveTo(0, R * 0.18, -w, 0); x.closePath(); };
    body(); fs(x, rgrad(x, -w * 0.3, -h * 0.65, R * 0.1, h * 1.15, [shade(col, 0.55), shade(col, 0.15), col, shade(col, -0.42)]), null);
    x.save(); body(); x.clip();
    circ(x, w * 0.1, -h * 0.25, R * 0.5, rgba(shade(col, -0.25), 0.35));
    for (const [ix, iy, ir] of [[-0.45, -0.25, 0.1], [0.5, -0.2, 0.07], [0.1, -0.12, 0.06], [-0.2, -0.55, 0.05]]) { x.beginPath(); x.arc(ix * R, iy * R, ir * R, 0, TAU); x.strokeStyle = rgba('#ffffff', 0.5); x.lineWidth = Math.max(0.8, R * 0.03); x.stroke(); }
    if (inner) for (const [ix, iy, ir] of [[-0.38, -0.4, 0.26], [0.4, -0.55, 0.22], [0.05, -0.2, 0.2]]) { circ(x, ix * R, iy * R, ir * R, rgba('#ffffff', 0.25)); circ(x, ix * R + ir * R * 0.2, iy * R + ir * R * 0.1, ir * R * 0.45, rgba('#5a1040', 0.45)); }
    x.beginPath(); x.ellipse(w * 0.55, -h * 0.35, w * 0.35, h * 0.5, 0.3, 0, TAU); x.strokeStyle = rgba('#ffffff', 0.25); x.lineWidth = R * 0.08; x.stroke();
    x.restore();
    body(); x.strokeStyle = rgba(shade(col, -0.55), 0.9); x.lineWidth = lw(R); x.stroke();
    spec(x, -w * 0.45, -h * 0.7, w * 0.24, h * 0.14, 0.75); circ(x, -w * 0.15, -h * 0.88, R * 0.06, 'rgba(255,255,255,.9)');
    const ey = -h * 0.55;
    eye(x, R * 0.12, ey, R * 0.21, 1, shade(col, -0.6), A > 0.3 ? 1 : 0); eye(x, R * 0.56, ey, R * 0.19, 1, shade(col, -0.6), A > 0.3 ? 1 : 0);
    ell(x, R * 0.0, ey + R * 0.28, R * 0.1, R * 0.05, 'rgba(255,110,140,.5)'); ell(x, R * 0.72, ey + R * 0.28, R * 0.09, R * 0.05, 'rgba(255,110,140,.5)');
    if (A > 0.3) mouth(x, R * 0.36, -h * 0.3, R * 0.16, R * 0.14 * A, true);
    else { x.strokeStyle = shade(col, -0.65); x.lineWidth = Math.max(1, R * 0.07); x.lineCap = 'round'; x.beginPath(); x.arc(R * 0.34, -h * 0.34, R * 0.12, 0.3, Math.PI - 0.3); x.stroke(); x.lineCap = 'butt'; }
    x.restore();
  }

  // ───────── 疾風狼 ─────────
  function runner(x, R, p, A) {
    const c = '#f08a3c', belly = '#fff0d8', dk = '#a8501a', ear = '#ffc0a8';
    const s1 = Math.sin(p), c1 = Math.cos(p);
    const by = -R * 0.9 - Math.abs(c1) * R * 0.12;
    x.save(); x.translate(A * R * 0.3, 0);
    leg2(x, -R * 0.55, by + R * 0.1, -s1 * 0.75, R * 0.44, R * 0.4, R * 0.17, shade(dk, -0.15), -0.7);
    leg2(x, R * 0.5, by + R * 0.1, s1 * 0.65 - A * 0.5, R * 0.42, R * 0.38, R * 0.16, shade(dk, -0.15), 0.5);
    const tw = s1 * R * 0.18;
    x.beginPath(); x.moveTo(-R * 0.8, by - R * 0.15); x.bezierCurveTo(-R * 1.4, by - R * 0.2 - tw, -R * 1.9, by - R * 0.7 - tw, -R * 1.75, by - R * 1.05 - tw); x.bezierCurveTo(-R * 1.55, by - R * 0.7, -R * 1.2, by - R * 0.15, -R * 0.75, by + R * 0.15); x.closePath();
    fs(x, lgrad(x, -R * 1.8, by - R, -R * 0.7, by, ['#fffaf0', '#ffd8a8', c]), OUT, lw(R));
    x.beginPath(); x.ellipse(0, by, R * 0.98, R * 0.52, -0.08, 0, TAU); fs(x, tri(x, c, 0, by - R * 0.55, 0, by + R * 0.55), OUT, lw(R));
    x.beginPath(); x.ellipse(R * 0.12, by + R * 0.24, R * 0.62, R * 0.24, -0.05, 0, Math.PI); x.fillStyle = belly; x.fill();
    x.strokeStyle = rgba(dk, 0.7); x.lineWidth = Math.max(1, R * 0.05); x.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const fx = -R * 0.6 + i * R * 0.28; x.beginPath(); x.moveTo(fx, by - R * 0.42); x.lineTo(fx - R * 0.1, by - R * 0.25); x.stroke(); }
    x.lineCap = 'butt';
    spec(x, -R * 0.3, by - R * 0.3, R * 0.35, R * 0.1, 0.3);
    leg2(x, -R * 0.45, by + R * 0.15, s1 * 0.8, R * 0.44, R * 0.42, R * 0.19, c, -0.7);
    leg2(x, R * 0.6, by + R * 0.15, -s1 * 0.7 - A * 0.6, R * 0.42, R * 0.4, R * 0.18, c, 0.5);
    const hx = R * 1.0, hy = by - R * 0.5 + c1 * R * 0.05;
    poly(x, [hx - R * 0.2, hy - R * 0.25, hx - R * 0.1, hy - R * 0.92, hx + R * 0.18, hy - R * 0.32], dk);
    x.beginPath(); x.moveTo(hx + R * 0.1, hy - R * 0.28); x.lineTo(hx + R * 0.36, hy - R * 0.95); x.lineTo(hx + R * 0.5, hy - R * 0.2); x.closePath(); fs(x, c, OUT, lw(R));
    poly(x, [hx + R * 0.18, hy - R * 0.33, hx + R * 0.35, hy - R * 0.78, hx + R * 0.42, hy - R * 0.27], ear);
    x.beginPath(); x.ellipse(hx, hy, R * 0.47, R * 0.4, 0, 0, TAU); fs(x, ball(x, hx, hy, R * 0.47, c), OUT, lw(R));
    const jaw = A * R * 0.18;
    x.beginPath(); x.moveTo(hx + R * 0.15, hy - R * 0.12); x.quadraticCurveTo(hx + R * 0.78, hy - R * 0.08, hx + R * 0.88, hy + R * 0.08); x.quadraticCurveTo(hx + R * 0.55, hy + R * 0.18, hx + R * 0.12, hy + R * 0.18); x.closePath(); fs(x, belly, OUT, lw(R) * 0.8);
    if (A > 0.2) { x.beginPath(); x.moveTo(hx + R * 0.2, hy + R * 0.18); x.lineTo(hx + R * 0.75, hy + R * 0.12 + jaw); x.lineTo(hx + R * 0.2, hy + R * 0.3 + jaw); x.closePath(); fs(x, '#ffe8d8', OUT, lw(R) * 0.8); poly(x, [hx + R * 0.6, hy + R * 0.1, hx + R * 0.64, hy + R * 0.22, hx + R * 0.68, hy + R * 0.1], '#ffffff'); }
    circ(x, hx + R * 0.86, hy + R * 0.04, R * 0.09, '#1a1018'); circ(x, hx + R * 0.84, hy + R * 0.01, R * 0.03, '#fff');
    eye(x, hx + R * 0.22, hy - R * 0.12, R * 0.13, 1, '#7a3a10', 1);
    x.restore();
  }

  // ───────── 鐵甲蟲 ─────────
  function beetle(x, R, p, A) {
    const c = '#5f7ea0', dk = '#2e3e58', hi = '#c8dcf0';
    const by = -R * 0.6;
    x.save(); x.translate(A * R * 0.25, 0);
    for (let i = 0; i < 3; i++) { const hx = -R * 0.5 + i * R * 0.5, sw = Math.sin(p + i * 2.1) * 0.55; leg2(x, hx, by + R * 0.15, sw - 0.2, R * 0.32, R * 0.32, R * 0.11, '#232838', 0.85); }
    const shell = () => { x.beginPath(); x.moveTo(-R * 1.05, by + R * 0.22); x.bezierCurveTo(-R * 1.1, by - R * 1.0, R * 0.9, by - R * 1.05, R * 0.9, by + R * 0.22); x.quadraticCurveTo(0, by + R * 0.48, -R * 1.05, by + R * 0.22); x.closePath(); };
    shell(); fs(x, rgrad(x, -R * 0.35, by - R * 0.65, R * 0.05, R * 1.35, [hi, shade(c, 0.15), c, dk]), OUT, lw(R));
    x.save(); shell(); x.clip();
    // 金屬虹彩
    x.fillStyle = lgrad(x, -R, by - R, R, by + R * 0.3, ['rgba(160,120,255,0)', 'rgba(160,120,255,.28)', 'rgba(80,220,200,.22)', 'rgba(80,220,200,0)']); x.fillRect(-R * 1.2, by - R * 1.2, R * 2.4, R * 1.8);
    x.strokeStyle = rgba('#101624', 0.6); x.lineWidth = Math.max(1, R * 0.06);
    x.beginPath(); x.moveTo(-R * 0.08, by - R * 0.78); x.quadraticCurveTo(-R * 0.02, by - R * 0.1, -R * 0.12, by + R * 0.38); x.stroke();
    for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(-R * 0.1, by + R * 0.25, R * (0.42 + i * 0.3), R * (0.36 + i * 0.27), 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); }
    x.strokeStyle = rgba('#ffffff', 0.25); x.lineWidth = Math.max(1, R * 0.03);
    for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(-R * 0.1, by + R * 0.22, R * (0.42 + i * 0.3), R * (0.36 + i * 0.27), 0, Math.PI * 1.1, Math.PI * 1.5); x.stroke(); }
    for (const [rx, ry] of [[-0.62, -0.12], [-0.38, -0.5], [0.28, -0.52], [0.55, -0.12], [-0.12, -0.75]]) { circ(x, rx * R, by + ry * R, R * 0.06, '#d8e4f0'); circ(x, rx * R + R * 0.015, by + ry * R + R * 0.02, R * 0.03, '#5a6a80'); }
    x.restore();
    spec(x, -R * 0.48, by - R * 0.52, R * 0.3, R * 0.12, 0.7);
    const hx = R * 0.92, hy = by + R * 0.04 + Math.sin(p) * R * 0.03 - A * R * 0.1;
    x.save(); x.translate(hx, hy); x.rotate(-A * 0.4);
    x.beginPath(); x.ellipse(0, 0, R * 0.35, R * 0.3, 0, 0, TAU); fs(x, ball(x, 0, 0, R * 0.35, dk), OUT, lw(R));
    x.beginPath(); x.moveTo(R * 0.05, -R * 0.22); x.quadraticCurveTo(R * 0.55, -R * 0.42, R * 0.6, -R * 0.95); x.quadraticCurveTo(R * 0.38, -R * 0.5, -R * 0.05, -R * 0.1); x.closePath(); fs(x, lgrad(x, 0, -R, R * 0.5, 0, ['#ffffff', '#c8d0da', '#7a8494']), OUT, lw(R) * 0.8);
    eye(x, R * 0.12, -R * 0.02, R * 0.13, 1, '#ff5a3a', 1);
    for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(R * 0.25, R * 0.08 * sd + R * 0.1); x.quadraticCurveTo(R * 0.55, R * (0.1 + sd * 0.05) + R * 0.1, R * 0.5, R * (0.22 + sd * 0.02) + A * R * 0.05 * sd); x.lineTo(R * 0.3, R * 0.15); x.closePath(); fs(x, '#2a2430', OUT, lw(R) * 0.6); }
    x.restore();
    x.restore();
  }

  // ───────── 蝙蝠 / 石像鬼 ─────────
  function bat(x, R, p, gar, A) {
    const c = gar ? '#8a94a6' : '#7a50d8', wc = gar ? '#5e6878' : '#4e2ea8', mem = gar ? '#9aa0ac' : '#b890ff';
    const flap = Math.sin(p), by = -R * 0.2 + flap * R * 0.12;
    x.save(); x.translate(A * R * 0.2, A * R * 0.15);
    for (const sd of [-1, 1]) {
      const tipY = by - R * (0.95 * flap + 0.15), tipX = sd * R * (gar ? 2.1 : 2.0);
      const wing = () => { x.beginPath(); x.moveTo(sd * R * 0.35, by - R * 0.2); x.quadraticCurveTo(sd * R * 1.1, by - R * (0.9 * flap + 0.6), tipX, tipY); x.lineTo(sd * R * 1.6, by + R * 0.2 - flap * R * 0.2); x.quadraticCurveTo(sd * R * 1.38, by + R * 0.02, sd * R * 1.08, by + R * 0.36 - flap * R * 0.15); x.quadraticCurveTo(sd * R * 0.86, by + R * 0.12, sd * R * 0.35, by + R * 0.3); x.closePath(); };
      wing(); fs(x, lgrad(x, 0, by - R, 0, by + R * 0.4, [shade(mem, 0.15), mem, wc]), OUT, lw(R));
      x.save(); wing(); x.clip();
      x.strokeStyle = rgba(shade(wc, -0.4), 0.8); x.lineWidth = Math.max(1, R * 0.06);
      x.beginPath(); x.moveTo(sd * R * 0.35, by - R * 0.15); x.lineTo(tipX * 0.98, tipY); x.moveTo(sd * R * 0.75, by - R * 0.3 - flap * R * 0.2); x.lineTo(sd * R * 1.08, by + R * 0.32 - flap * R * 0.15); x.moveTo(sd * R * 1.15, by - R * 0.45 - flap * R * 0.45); x.lineTo(sd * R * 1.6, by + R * 0.18 - flap * R * 0.2); x.stroke();
      if (gar) { x.strokeStyle = rgba('#ffffff', 0.18); for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(sd * R * (0.6 + i * 0.3), by - R * 0.3); x.lineTo(sd * R * (0.7 + i * 0.3), by + R * 0.1); x.stroke(); } }
      x.restore();
      circ(x, tipX, tipY, R * 0.06, shade(wc, -0.3));
    }
    if (gar) { x.strokeStyle = OUT; x.lineWidth = R * 0.16; x.lineCap = 'round'; x.beginPath(); x.moveTo(-R * 0.3, by + R * 0.5); x.quadraticCurveTo(-R * 0.9, by + R * 0.95, -R * 1.15, by + R * 0.5); x.stroke(); x.strokeStyle = c; x.lineWidth = R * 0.1; x.stroke(); x.lineCap = 'butt'; poly(x, [-R * 1.12, by + R * 0.32, -R * 1.3, by + R * 0.55, -R * 1.02, by + R * 0.62], shade(c, -0.2)); }
    x.beginPath(); for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU, rr = (i % 2 ? 1 : 0.93); x.lineTo(Math.cos(a) * R * 0.64 * rr, by + R * 0.05 + Math.sin(a) * R * 0.72 * rr); } x.closePath();
    fs(x, ball(x, 0, by, R * 0.7, c), OUT, lw(R));
    x.beginPath(); x.ellipse(R * 0.05, by + R * 0.3, R * 0.36, R * 0.3, 0, 0, Math.PI); x.fillStyle = rgba(gar ? '#c8ccd4' : '#d8c0ff', 0.4); x.fill();
    if (gar) { for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(sd * R * 0.3, by - R * 0.45); x.quadraticCurveTo(sd * R * 0.55, by - R * 1.1, sd * R * 0.12, by - R * 1.2); x.quadraticCurveTo(sd * R * 0.36, by - R * 0.82, sd * R * 0.05, by - R * 0.55); x.closePath(); fs(x, lgrad(x, 0, by - R * 1.2, 0, by - R * 0.5, ['#fff4e0', '#c8bea8']), OUT, lw(R) * 0.8); } x.strokeStyle = rgba('#2a2a34', 0.5); x.lineWidth = Math.max(1, R * 0.04); x.beginPath(); x.moveTo(-R * 0.3, by - R * 0.1); x.lineTo(-R * 0.15, by + R * 0.15); x.lineTo(-R * 0.3, by + R * 0.35); x.stroke(); }
    else { for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(sd * R * 0.52, by - R * 0.32); x.lineTo(sd * R * 0.46, by - R * 1.08); x.lineTo(sd * R * 0.1, by - R * 0.52); x.closePath(); fs(x, c, OUT, lw(R) * 0.8); poly(x, [sd * R * 0.4, by - R * 0.42, sd * R * 0.4, by - R * 0.88, sd * R * 0.2, by - R * 0.52], '#ff9ad0'); } }
    spec(x, -R * 0.25, by - R * 0.3, R * 0.18, R * 0.1, 0.35);
    eye(x, -R * 0.08, by - R * 0.12, R * 0.17, 1, gar ? '#ff9a00' : '#ff2a5a', 1); eye(x, R * 0.32, by - R * 0.12, R * 0.16, 1, gar ? '#ff9a00' : '#ff2a5a', 1);
    if (A > 0.3) mouth(x, R * 0.12, by + R * 0.2, R * 0.18, R * 0.14 * A, true);
    else { poly(x, [R * 0.04, by + R * 0.18, R * 0.11, by + R * 0.36, R * 0.18, by + R * 0.18], '#fff'); poly(x, [R * 0.22, by + R * 0.18, R * 0.28, by + R * 0.34, R * 0.34, by + R * 0.18], '#fff'); }
    for (const sd of [-0.2, 0.25]) limb(x, sd * R, by + R * 0.65, sd * R + R * 0.05, by + R * 0.88, R * 0.08, shade(c, -0.35));
    x.restore();
  }

  // ───────── 石像 ─────────
  function golem(x, R, p, A) {
    const c = '#b8a88c', dk = '#7e6e56', rune = '#6fe8ff';
    const s1 = Math.sin(p), bob = Math.abs(Math.cos(p)) * R * 0.08;
    const stone = (x0, y0, w, h, cc, r) => { rrect(x, x0, y0, w, h, r || R * 0.12); fs(x, tri(x, cc, x0, y0, x0 + w, y0 + h), OUT, lw(R)); x.strokeStyle = rgba('#000', 0.2); x.lineWidth = Math.max(1, R * 0.03); x.beginPath(); x.moveTo(x0 + w * 0.2, y0 + h * 0.3); x.lineTo(x0 + w * 0.45, y0 + h * 0.45); x.stroke(); x.fillStyle = rgba('#fff', 0.25); x.fillRect(x0 + w * 0.12, y0 + R * 0.04, w * 0.5, Math.max(1, R * 0.04)); };
    for (const [sd, ph] of [[-1, 0], [1, Math.PI]]) { const sw = Math.sin(p + ph) * R * 0.22; stone(sd * R * 0.36 - R * 0.22 + sw, -R * 0.68, R * 0.44, R * 0.68 - Math.max(0, -Math.cos(p + ph)) * R * 0.08, sd < 0 ? shade(dk, -0.1) : dk); }
    x.save(); x.translate(A * R * 0.2, -bob);
    stone(-R * 1.2 - s1 * R * 0.1, -R * 1.8, R * 0.42, R * 1.0, shade(dk, -0.12));
    rrect(x, -R * 0.88, -R * 2.05, R * 1.76, R * 1.5, R * 0.28); fs(x, tri(x, c, -R * 0.9, -R * 2.05, R * 0.9, -R * 0.55), OUT, lw(R));
    x.strokeStyle = rgba('#3a2e22', 0.45); x.lineWidth = Math.max(1, R * 0.05);
    x.beginPath(); x.moveTo(-R * 0.5, -R * 2.05); x.lineTo(-R * 0.35, -R * 1.55); x.lineTo(-R * 0.62, -R * 1.1); x.moveTo(R * 0.58, -R * 1.95); x.lineTo(R * 0.42, -R * 1.45); x.lineTo(R * 0.6, -R * 1.2); x.stroke();
    // 石面斑點
    { const rr = mkRng(7); for (let i = 0; i < 26; i++) { const px = (rr() - 0.5) * R * 1.6, py = -R * (0.65 + rr() * 1.35); circ(x, px, py, R * (0.02 + rr() * 0.035), rgba(rr() < 0.5 ? '#ffffff' : '#3a2e22', 0.18 + rr() * 0.15)); } }
    // 苔蘚＋垂下的藤蔓
    x.beginPath(); x.ellipse(-R * 0.3, -R * 2.0, R * 0.55, R * 0.16, 0, 0, TAU); fs(x, lgrad(x, 0, -R * 2.1, 0, -R * 1.9, ['#b8f070', '#5a9a3a']), null);
    x.strokeStyle = '#4a8a2e'; x.lineWidth = Math.max(1, R * 0.05); x.lineCap = 'round';
    for (const [vx, vl] of [[-0.7, 0.45], [-0.45, 0.3], [0.05, 0.38]]) { x.beginPath(); x.moveTo(vx * R, -R * 1.95); x.quadraticCurveTo(vx * R + R * 0.08, -R * (1.95 - vl * 0.5), vx * R, -R * (1.95 - vl)); x.stroke(); circ(x, vx * R, -R * (1.95 - vl), R * 0.045, '#7ac84a'); }
    x.lineCap = 'butt';
    circ(x, -R * 0.5, -R * 2.1, R * 0.06, '#fff3a8'); circ(x, -R * 0.2, -R * 2.12, R * 0.05, '#ffffff'); circ(x, -R * 0.08, -R * 2.06, R * 0.045, '#ff9ec7');
    // 肩上長出的水晶
    crystalShard(x, R * 0.62, -R * 1.98, R * 0.1, R * 0.4, '#7fe8ff', 0.4, R); crystalShard(x, R * 0.75, -R * 1.9, R * 0.07, R * 0.26, '#c49bff', 0.8, R);
    x.save(); x.shadowColor = rune; x.shadowBlur = R * 0.35;
    x.strokeStyle = rune; x.lineWidth = Math.max(1, R * 0.1); x.lineCap = 'round';
    x.beginPath(); x.moveTo(-R * 0.28, -R * 1.25); x.lineTo(0, -R * 1.55); x.lineTo(R * 0.28, -R * 1.25); x.moveTo(0, -R * 1.55); x.lineTo(0, -R * 0.98); x.stroke();
    x.strokeStyle = '#e8ffff'; x.lineWidth = Math.max(1, R * 0.04); x.stroke(); x.restore(); x.lineCap = 'butt';
    rrect(x, R * 0.0, -R * 2.52, R * 0.78, R * 0.6, R * 0.14); fs(x, tri(x, shade(c, 0.08), 0, -R * 2.5, R * 0.8, -R * 1.9), OUT, lw(R));
    x.save(); x.shadowColor = rune; x.shadowBlur = R * 0.3; rrect(x, R * 0.24, -R * 2.3, R * 0.44, R * 0.13, R * 0.05); fs(x, A > 0.3 ? '#ffffff' : '#bff6ff', null); x.restore();
    stone(R * 0.78 + s1 * R * 0.1 + A * R * 0.35, -R * 1.8 - A * R * 0.3, R * 0.42, R * 1.05, c);
    x.restore();
  }

  // ───────── 祭司 ─────────
  function healer(x, R, p, A) {
    const robe = '#f6f2ea', trim = '#3ec88a', gold = '#e8b84a';
    const s1 = Math.sin(p), bob = Math.abs(Math.cos(p)) * R * 0.06;
    for (const ph of [0, Math.PI]) { const sw = Math.sin(p + ph) * R * 0.2; ell(x, sw + R * 0.05, -R * 0.06, R * 0.2, R * 0.1, '#5a3a22'); }
    x.save(); x.translate(0, -bob);
    const st = A * 0.5;
    x.save(); x.translate(R * 0.75, -R * 0.1); x.rotate(st);
    limb(x, 0, 0, 0, -R * 2.45, R * 0.11, '#8a5a2e');
    x.strokeStyle = gold; x.lineWidth = Math.max(1, R * 0.07); x.beginPath(); x.arc(0, -R * 2.55, R * 0.28, Math.PI * 0.15, Math.PI * 0.85, true); x.stroke();
    circ(x, 0, -R * 2.55, R * 0.21, ball(x, 0, -R * 2.55, R * 0.21, '#3ee0a0'));
    spec(x, -R * 0.07, -R * 2.62, R * 0.06, R * 0.04, 0.9);
    x.restore();
    x.beginPath(); x.moveTo(-R * 0.78, -R * 0.08); x.quadraticCurveTo(-R * 0.68 + s1 * R * 0.08, -R * 1.2, -R * 0.44, -R * 1.68); x.lineTo(R * 0.44, -R * 1.68); x.quadraticCurveTo(R * 0.68, -R * 1.1, R * 0.78 + s1 * R * 0.08, -R * 0.08); x.closePath();
    fs(x, tri(x, robe, -R * 0.7, 0, R * 0.7, 0, 0.6), OUT, lw(R));
    x.strokeStyle = rgba('#a89a80', 0.45); x.lineWidth = Math.max(1, R * 0.03);
    for (const fx of [-0.4, 0.35]) { x.beginPath(); x.moveTo(fx * R, -R * 1.3); x.quadraticCurveTo(fx * R * 1.2, -R * 0.7, fx * R * 1.4, -R * 0.12); x.stroke(); }
    x.fillStyle = trim; x.fillRect(-R * 0.11, -R * 1.58, R * 0.22, R * 1.5); x.fillRect(-R * 0.78, -R * 0.22, R * 1.56, R * 0.11);
    x.fillStyle = gold; x.fillRect(-R * 0.78, -R * 0.24, R * 1.56, R * 0.03);
    x.fillStyle = '#ffffff'; x.fillRect(-R * 0.05, -R * 1.32, R * 0.1, R * 0.36); x.fillRect(-R * 0.17, -R * 1.2, R * 0.34, R * 0.1);
    // 裙擺的金色花紋
    x.strokeStyle = gold; x.lineWidth = Math.max(1, R * 0.035);
    for (let i = 0; i < 6; i++) { const fx = -R * 0.65 + i * R * 0.26; x.beginPath(); x.arc(fx, -R * 0.36, R * 0.07, 0, Math.PI, true); x.stroke(); }
    // 光環
    x.save(); x.shadowColor = '#fff3a0'; x.shadowBlur = R * 0.3; x.strokeStyle = '#ffe9a0'; x.lineWidth = Math.max(1, R * 0.06); x.beginPath(); x.ellipse(R * 0.0, -R * 2.62, R * 0.32, R * 0.09, 0, 0, TAU); x.stroke(); x.restore();
    // 兜帽（後半）
    x.beginPath(); x.arc(-R * 0.05, -R * 2.0, R * 0.55, Math.PI * 0.6, Math.PI * 1.75); x.lineTo(-R * 0.45, -R * 1.55); x.closePath(); fs(x, tri(x, robe, -R * 0.6, -R * 2.5, R * 0.3, -R * 1.5, 0.6), OUT, lw(R));
    // 臉
    circ(x, R * 0.1, -R * 1.98, R * 0.42, ball(x, R * 0.1, -R * 1.98, R * 0.42, '#ffdcbc')); x.strokeStyle = OUT; x.lineWidth = lw(R) * 0.8; x.stroke();
    // 瀏海
    x.beginPath(); x.arc(R * 0.1, -R * 2.0, R * 0.44, Math.PI * 1.05, Math.PI * 1.9); x.quadraticCurveTo(R * 0.3, -R * 2.2, R * 0.05, -R * 2.18); x.quadraticCurveTo(-R * 0.15, -R * 2.05, -R * 0.32, -R * 1.9); x.closePath(); fs(x, lgrad(x, 0, -R * 2.45, 0, -R * 2.0, ['#fff4c0', '#e8c060']), OUT, lw(R) * 0.7);
    // 兜帽邊（前）
    x.strokeStyle = trim; x.lineWidth = Math.max(1, R * 0.08); x.beginPath(); x.arc(-R * 0.05, -R * 2.0, R * 0.55, Math.PI * 1.25, Math.PI * 1.7); x.stroke();
    eye(x, R * 0.2, -R * 1.94, R * 0.11, 1, '#2a8a5a'); eye(x, R * 0.44, -R * 1.94, R * 0.1, 1, '#2a8a5a');
    ell(x, R * 0.08, -R * 1.78, R * 0.07, R * 0.04, 'rgba(255,120,120,.45)'); ell(x, R * 0.52, -R * 1.78, R * 0.06, R * 0.04, 'rgba(255,120,120,.45)');
    x.strokeStyle = '#c87a5a'; x.lineWidth = Math.max(1, R * 0.04); x.beginPath(); x.arc(R * 0.33, -R * 1.78, R * 0.07, 0.3, Math.PI - 0.3); x.stroke();
    // 聖書
    rrect(x, -R * 0.42, -R * 1.25, R * 0.36, R * 0.28, R * 0.04); fs(x, tri(x, '#8a3a2a', -R * 0.4, -R * 1.25, -R * 0.1, -R), OUT, lw(R) * 0.7);
    x.fillStyle = gold; x.fillRect(-R * 0.27, -R * 1.2, R * 0.05, R * 0.18); x.fillRect(-R * 0.33, -R * 1.14, R * 0.17, R * 0.05);
    circ(x, R * 0.72 + Math.sin(st) * R * 0.9, -R * 1.25, R * 0.13, '#ffd9b8');
    x.restore();
  }

  // ───────── 盾衛 ─────────
  function knight(x, R, p, A) {
    const steel = '#a8b4c8', blue = '#2f5ec0', gold = '#f2c14e';
    const bob = Math.abs(Math.cos(p)) * R * 0.06;
    for (const [ph, c] of [[Math.PI, '#4a5262'], [0, '#6a7488']]) { const sw = Math.sin(p + ph) * 0.45; const [fx, fy] = leg2(x, 0, -R * 0.78, sw, R * 0.4, R * 0.38, R * 0.24, c, -0.2); rrect(x, fx - R * 0.15, fy - R * 0.1, R * 0.36, R * 0.14, R * 0.05); fs(x, '#3a3440', OUT, lw(R) * 0.7); }
    x.save(); x.translate(A * R * 0.15, -bob);
    const sa = A > 0 ? -0.6 + A * 2.2 : 0;
    x.save(); x.translate(-R * 0.5, -R * 1.25); x.rotate(-2.6 + sa);
    rrect(x, -R * 0.05, -R * 0.06, R * 0.95, R * 0.12, R * 0.04); fs(x, lgrad(x, 0, -R * 0.06, 0, R * 0.06, ['#ffffff', '#c8d2e0', '#7a869a']), OUT, lw(R) * 0.8);
    x.restore();
    x.beginPath(); x.moveTo(-R * 0.45, -R * 1.72); x.quadraticCurveTo(-R * 0.95, -R * 1.0 + Math.sin(p) * R * 0.05, -R * 0.75, -R * 0.45); x.lineTo(-R * 0.2, -R * 0.7); x.closePath(); fs(x, tri(x, '#c83a3a', -R, 0, 0, 0), OUT, lw(R));
    rrect(x, -R * 0.56, -R * 1.78, R * 1.12, R * 1.08, R * 0.32); fs(x, rgrad(x, -R * 0.2, -R * 1.5, R * 0.1, R * 1.2, ['#ffffff', steel, '#5a6478']), OUT, lw(R));
    x.strokeStyle = rgba('#3a4458', 0.5); x.lineWidth = Math.max(1, R * 0.04); x.beginPath(); x.moveTo(0, -R * 1.72); x.lineTo(0, -R * 1.1); x.stroke();
    x.fillStyle = blue; x.fillRect(-R * 0.56, -R * 1.02, R * 1.12, R * 0.17); x.fillStyle = gold; x.fillRect(-R * 0.56, -R * 1.02, R * 1.12, R * 0.03);
    circ(x, 0, -R * 0.94, R * 0.07, gold);
    x.beginPath(); x.arc(R * 0.05, -R * 2.08, R * 0.46, Math.PI, 0); x.lineTo(R * 0.51, -R * 1.76); x.lineTo(-R * 0.41, -R * 1.76); x.closePath(); fs(x, rgrad(x, -R * 0.1, -R * 2.3, R * 0.05, R * 0.6, ['#ffffff', steel, '#5a6478']), OUT, lw(R));
    x.fillStyle = '#141826'; rrect(x, R * 0.08, -R * 2.1, R * 0.42, R * 0.11, R * 0.03); x.fill();
    circ(x, R * 0.3, -R * 2.05, R * 0.04, '#ff5a3a');
    for (let i = 0; i < 3; i++) { x.fillStyle = '#141826'; x.fillRect(R * (0.2 + i * 0.09), -R * 1.97, R * 0.04, R * 0.15); }
    x.strokeStyle = gold; x.lineWidth = Math.max(1, R * 0.05); x.beginPath(); x.arc(R * 0.05, -R * 2.08, R * 0.46, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    x.beginPath(); x.moveTo(-R * 0.05, -R * 2.5); x.quadraticCurveTo(-R * 0.55, -R * 2.98 + Math.sin(p * 2) * R * 0.05, -R * 0.85, -R * 2.35); x.quadraticCurveTo(-R * 0.45, -R * 2.6, -R * 0.12, -R * 2.36); x.closePath(); fs(x, lgrad(x, 0, -R * 3, 0, -R * 2.3, ['#ff8a7a', '#c82838']), OUT, lw(R) * 0.8);
    const sx = R * 0.72 + A * R * 0.2;
    x.beginPath(); x.moveTo(sx - R * 0.38, -R * 1.78); x.lineTo(sx + R * 0.38, -R * 1.78); x.lineTo(sx + R * 0.38, -R * 1.08); x.quadraticCurveTo(sx + R * 0.33, -R * 0.58, sx, -R * 0.42); x.quadraticCurveTo(sx - R * 0.33, -R * 0.58, sx - R * 0.38, -R * 1.08); x.closePath();
    fs(x, lgrad(x, sx - R * 0.38, 0, sx + R * 0.38, 0, ['#fff2b8', gold, '#a8761a']), OUT, lw(R));
    x.beginPath(); x.moveTo(sx - R * 0.24, -R * 1.64); x.lineTo(sx + R * 0.24, -R * 1.64); x.lineTo(sx + R * 0.24, -R * 1.12); x.quadraticCurveTo(sx, -R * 0.72, sx - R * 0.24, -R * 1.12); x.closePath(); fs(x, tri(x, blue, sx, -R * 1.6, sx, -R * 0.8), null);
    Gfx.star(x, sx, -R * 1.28, R * 0.13, '#ffe9a0', false);
    spec(x, sx - R * 0.2, -R * 1.6, R * 0.08, R * 0.04, 0.8);
    x.restore();
  }

  // ───────── 巨魔 ─────────
  function ogre(x, R, p, A) {
    const c = '#7aae52', dk = '#4e7e32', belly = '#c0dc90';
    const s1 = Math.sin(p), bob = Math.abs(Math.cos(p)) * R * 0.08;
    for (const [ph, cc] of [[Math.PI, shade(dk, -0.15)], [0, dk]]) { const sw = Math.sin(p + ph) * R * 0.25; rrect(x, -R * 0.26 + sw, -R * 0.78, R * 0.44, R * 0.78, R * 0.16); fs(x, tri(x, cc, -R * 0.3 + sw, 0, R * 0.2 + sw, 0), OUT, lw(R)); ell(x, -R * 0.02 + sw + R * 0.06, -R * 0.05, R * 0.3, R * 0.11, '#4a2e18'); }
    x.save(); x.translate(0, -bob);
    limb(x, -R * 0.65, -R * 1.65, -R * 0.95 - s1 * R * 0.15, -R * 0.95, R * 0.34, dk);
    x.beginPath(); x.ellipse(0, -R * 1.38, R * 0.98, R * 0.88, 0, 0, TAU); fs(x, ball(x, 0, -R * 1.38, R * 0.98, c), OUT, lw(R));
    x.beginPath(); x.ellipse(R * 0.15, -R * 1.15, R * 0.62, R * 0.56, 0, 0, TAU); x.fillStyle = lgrad(x, 0, -R * 1.7, 0, -R * 0.6, [shade(belly, 0.2), belly, shade(belly, -0.15)]); x.fill();
    x.strokeStyle = rgba(dk, 0.5); x.lineWidth = Math.max(1, R * 0.04); x.beginPath(); x.arc(R * 0.15, -R * 1.0, R * 0.12, 0.2, Math.PI - 0.2); x.stroke();
    x.strokeStyle = rgba('#3a5a22', 0.8); x.lineWidth = Math.max(1, R * 0.04); x.beginPath(); x.moveTo(-R * 0.6, -R * 1.8); x.lineTo(-R * 0.3, -R * 1.55); for (let i = 0; i < 3; i++) { x.moveTo(-R * (0.55 - i * 0.1), -R * (1.8 - i * 0.07)); x.lineTo(-R * (0.48 - i * 0.1), -R * (1.68 - i * 0.07)); } x.stroke();
    x.beginPath(); x.moveTo(-R * 0.88, -R * 0.78); x.lineTo(R * 0.88, -R * 0.78); x.lineTo(R * 0.6, -R * 0.42); x.lineTo(R * 0.2, -R * 0.55); x.lineTo(-R * 0.2, -R * 0.38); x.lineTo(-R * 0.7, -R * 0.5); x.closePath(); fs(x, tri(x, '#8a5a32', 0, -R * 0.8, 0, -R * 0.4), OUT, lw(R) * 0.8);
    x.fillStyle = '#d8c8a0'; x.fillRect(-R * 0.88, -R * 0.82, R * 1.76, R * 0.08);
    // 腰帶上的骷髏扣
    circ(x, R * 0.1, -R * 0.74, R * 0.13, ball(x, R * 0.1, -R * 0.74, R * 0.13, '#f0e8d8')); x.strokeStyle = OUT; x.lineWidth = lw(R) * 0.6; x.stroke();
    circ(x, R * 0.05, -R * 0.76, R * 0.03, '#2a1a1a'); circ(x, R * 0.15, -R * 0.76, R * 0.03, '#2a1a1a');
    const hx = R * 0.25, hy = -R * 2.25;
    x.beginPath(); x.ellipse(hx, hy, R * 0.5, R * 0.44, 0, 0, TAU); fs(x, ball(x, hx, hy, R * 0.5, c), OUT, lw(R));
    for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(hx + sd * R * 0.42, hy - R * 0.05); x.lineTo(hx + sd * R * 0.72, hy - R * 0.2); x.lineTo(hx + sd * R * 0.45, hy + R * 0.12); x.closePath(); fs(x, c, OUT, lw(R) * 0.7); }
    for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(hx - R * 0.15 + i * R * 0.12, hy - R * 0.38); x.quadraticCurveTo(hx - R * 0.2 + i * R * 0.15, hy - R * 0.62, hx - R * 0.05 + i * R * 0.18, hy - R * 0.7); x.strokeStyle = '#3a2a18'; x.lineWidth = Math.max(1, R * 0.07); x.lineCap = 'round'; x.stroke(); x.lineCap = 'butt'; }
    x.beginPath(); x.arc(hx + R * 0.66, hy + R * 0.05, R * 0.07, 0, TAU); x.strokeStyle = '#f2c14e'; x.lineWidth = Math.max(1, R * 0.04); x.stroke();
    eye(x, hx - R * 0.02, hy - R * 0.08, R * 0.13, 1, '#c83a2a', 2); eye(x, hx + R * 0.27, hy - R * 0.08, R * 0.12, 1, '#c83a2a', 2);
    circ(x, hx + R * 0.15, hy + R * 0.1, R * 0.08, shade(c, -0.25));
    mouth(x, hx + R * 0.12, hy + R * 0.2, R * 0.22, R * (0.05 + A * 0.12), false);
    poly(x, [hx - R * 0.02, hy + R * 0.22, hx + R * 0.02, hy + R * 0.02, hx + R * 0.07, hy + R * 0.22], '#fffbe8');
    poly(x, [hx + R * 0.2, hy + R * 0.22, hx + R * 0.25, hy + R * 0.02, hx + R * 0.29, hy + R * 0.22], '#fffbe8');
    const sw = s1 * 0.15 - (A > 0 ? (A < 0.5 ? -A * 1.4 : 0.7 - (A - 0.5) * 3) : 0);
    x.save(); x.translate(R * 0.75, -R * 1.65); x.rotate(-0.6 + sw);
    rrect(x, -R * 0.13, -R * 1.5, R * 0.32, R * 1.35, R * 0.15); fs(x, lgrad(x, -R * 0.13, 0, R * 0.19, 0, ['#c88a58', '#9a6232', '#6a4220']), OUT, lw(R));
    circ(x, R * 0.03, -R * 1.45, R * 0.27, ball(x, R * 0.03, -R * 1.45, R * 0.27, '#9a6a3e')); x.strokeStyle = OUT; x.lineWidth = lw(R); x.stroke();
    for (const [nx, ny] of [[-0.2, -1.5], [0.24, -1.38], [0.05, -1.7], [0.18, -1.62], [-0.15, -1.3]]) poly(x, [nx * R, ny * R, nx * R + R * 0.09, ny * R - R * 0.05, nx * R + R * 0.04, ny * R + R * 0.07], '#e8ecf2');
    x.fillStyle = '#c8b090'; x.fillRect(-R * 0.13, -R * 0.55, R * 0.32, R * 0.08);
    x.restore();
    limb(x, R * 0.6, -R * 1.6, R * 0.8, -R * 1.65, R * 0.34, c);
    x.restore();
  }

  // ───────── 骷髏兵 ─────────
  function skeleton(x, R, p, A) {
    const bone = '#f2ecdc', dk = '#b8ae96';
    const s1 = Math.sin(p);
    for (const ph of [Math.PI, 0]) { const sw = Math.sin(p + ph) * 0.5; leg2(x, 0, -R * 0.92, sw, R * 0.46, R * 0.46, R * 0.11, ph ? dk : bone, -0.3); }
    x.beginPath(); x.ellipse(0, -R * 0.94, R * 0.27, R * 0.13, 0, 0, TAU); fs(x, tri(x, bone, 0, -R, 0, -R * 0.8), OUT, lw(R) * 0.8);
    limb(x, 0, -R * 0.97, 0, -R * 1.62, R * 0.1, bone);
    for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(0, -R * (1.27 + i * 0.15), R * (0.36 - i * 0.04), R * 0.085, 0, 0, TAU); x.strokeStyle = OUT; x.lineWidth = R * 0.11; x.stroke(); x.strokeStyle = bone; x.lineWidth = R * 0.065; x.stroke(); }
    x.beginPath(); x.moveTo(-R * 0.3, -R * 1.0); x.lineTo(R * 0.32, -R * 1.0); x.lineTo(R * 0.25, -R * 0.62); x.lineTo(R * 0.08, -R * 0.75); x.lineTo(-R * 0.05, -R * 0.58); x.lineTo(-R * 0.22, -R * 0.72); x.closePath(); fs(x, '#6a4a6a', OUT, lw(R) * 0.7);
    limb(x, -R * 0.2, -R * 1.6, -R * 0.45 - s1 * R * 0.1, -R * 1.05, R * 0.08, dk);
    const shx = -R * 0.5 - s1 * R * 0.1;
    circ(x, shx, -R * 1.1, R * 0.34, ball(x, shx, -R * 1.1, R * 0.34, '#8a5a2e')); x.strokeStyle = OUT; x.lineWidth = lw(R); x.stroke();
    x.strokeStyle = '#c8b088'; x.lineWidth = Math.max(1, R * 0.05); x.beginPath(); x.arc(shx, -R * 1.1, R * 0.24, 0, TAU); x.stroke();
    circ(x, shx, -R * 1.1, R * 0.1, '#b8c0ca');
    x.beginPath(); x.arc(R * 0.05, -R * 2.02, R * 0.44, 0, TAU); fs(x, ball(x, R * 0.05, -R * 2.02, R * 0.44, bone), OUT, lw(R));
    x.strokeStyle = rgba('#8a7a60', 0.6); x.lineWidth = Math.max(1, R * 0.03); x.beginPath(); x.moveTo(-R * 0.15, -R * 2.4); x.lineTo(-R * 0.05, -R * 2.25); x.lineTo(-R * 0.12, -R * 2.15); x.stroke();
    rrect(x, R * 0.0, -R * 1.76, R * 0.36, R * 0.22 + A * R * 0.08, R * 0.06); fs(x, bone, OUT, lw(R) * 0.8);
    for (const ex of [0.0, 0.28]) { circ(x, ex * R, -R * 2.02, R * 0.12, '#1a1028'); x.save(); x.shadowColor = '#ff4a4a'; x.shadowBlur = R * 0.25; circ(x, ex * R + R * 0.02, -R * 2.02, R * 0.045, '#ff6a6a'); x.restore(); }
    poly(x, [R * 0.12, -R * 1.88, R * 0.16, -R * 1.8, R * 0.2, -R * 1.88], '#1a1028');
    // 生鏽的頭盔
    x.beginPath(); x.arc(R * 0.05, -R * 2.08, R * 0.47, Math.PI * 1.02, Math.PI * 1.98); x.lineTo(R * 0.55, -R * 2.1); x.lineTo(-R * 0.45, -R * 2.1); x.closePath(); fs(x, tri(x, '#8a7a6a', -R * 0.4, -R * 2.5, R * 0.5, -R * 2.1), OUT, lw(R) * 0.8);
    for (const [rx, ry] of [[-0.2, -2.3], [0.25, -2.35], [0.0, -2.45]]) circ(x, rx * R, ry * R, R * 0.05, rgba('#c86a3a', 0.6));
    x.fillStyle = '#5a4a3a'; x.fillRect(-R * 0.45, -R * 2.14, R * 1.0, R * 0.06);
    x.strokeStyle = '#2a2040'; x.lineWidth = 1; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(R * (0.07 + i * 0.1), -R * 1.76); x.lineTo(R * (0.07 + i * 0.1), -R * 1.6); x.stroke(); }
    const sa = -0.9 + s1 * 0.3 + A * 1.4;
    x.save(); x.translate(R * 0.3, -R * 1.5); x.rotate(sa);
    limb(x, 0, 0, R * 0.4, 0, R * 0.08, bone);
    x.beginPath(); x.moveTo(R * 0.4, -R * 0.06); x.lineTo(R * 1.15, -R * 0.04); x.lineTo(R * 1.25, 0); x.lineTo(R * 1.15, R * 0.04); x.lineTo(R * 0.4, R * 0.06); x.closePath(); fs(x, lgrad(x, 0, -R * 0.06, 0, R * 0.06, ['#e8e0c8', '#a8987a', '#6a5a48']), OUT, lw(R) * 0.7);
    for (let i = 0; i < 3; i++) poly(x, [R * (0.6 + i * 0.18), R * 0.05, R * (0.66 + i * 0.18), R * 0.11, R * (0.72 + i * 0.18), R * 0.05], '#8a7a60');
    x.fillStyle = '#6b4a2a'; x.fillRect(R * 0.34, -R * 0.16, R * 0.07, R * 0.32);
    x.restore();
  }

  // ───────── 風精靈（新）─────────
  function wisp(x, R, p, A) {
    const by = -R * 0.3 + Math.sin(p) * R * 0.12;
    x.save(); x.translate(A * R * 0.25, 0);
    for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(-R * (0.5 + i * 0.35), by + R * (0.2 + i * 0.12), R * (0.45 - i * 0.1), R * (0.18 - i * 0.03), Math.sin(p + i) * 0.3, 0, TAU); x.strokeStyle = rgba('#e8f8ff', 0.85 - i * 0.2); x.lineWidth = Math.max(1, R * (0.12 - i * 0.03)); x.stroke(); }
    for (const sd of [-1, 1]) {
      const fl = Math.sin(p * 2) * 0.4;
      x.save(); x.translate(-R * 0.1, by - R * 0.3); x.rotate(sd * (0.6 + fl) - 0.3);
      x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(R * 0.4, -R * 0.55, 0, -R * 1.1); x.quadraticCurveTo(-R * 0.4, -R * 0.55, 0, 0); x.closePath();
      fs(x, lgrad(x, 0, -R * 1.1, 0, 0, ['#e8fff0', '#9fe8c0', '#4ab88a']), OUT, lw(R) * 0.7);
      x.strokeStyle = rgba('#2a8a5a', 0.6); x.lineWidth = Math.max(1, R * 0.03); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -R * 1.0); x.stroke();
      x.restore();
    }
    x.beginPath(); x.ellipse(0, by, R * 0.6, R * 0.55, 0, 0, TAU); fs(x, rgrad(x, -R * 0.15, by - R * 0.2, R * 0.05, R * 0.7, ['#ffffff', '#d8f4ff', '#8ad0f4', '#4a9ad8']), OUT, lw(R));
    for (let i = 0; i < 2; i++) { x.beginPath(); x.arc(R * 0.05, by + R * 0.05, R * (0.25 + i * 0.15), p + i * 2, p + i * 2 + 2.2); x.strokeStyle = rgba('#ffffff', 0.7); x.lineWidth = Math.max(1, R * 0.05); x.stroke(); }
    x.beginPath(); x.moveTo(-R * 0.1, by - R * 0.5); x.quadraticCurveTo(R * 0.2, by - R * 0.9, -R * 0.05, by - R * 1.0); x.strokeStyle = '#ffffff'; x.lineWidth = Math.max(1, R * 0.07); x.lineCap = 'round'; x.stroke(); x.lineCap = 'butt';
    eye(x, R * 0.08, by - R * 0.05, R * 0.15, 1, '#2a6ab8', A > 0.3 ? 1 : 0); eye(x, R * 0.38, by - R * 0.05, R * 0.14, 1, '#2a6ab8', A > 0.3 ? 1 : 0);
    if (A > 0.3) mouth(x, R * 0.25, by + R * 0.2, R * 0.12, R * 0.1, false);
    else { x.strokeStyle = '#2a5a8a'; x.lineWidth = Math.max(1, R * 0.05); x.beginPath(); x.arc(R * 0.24, by + R * 0.16, R * 0.08, 0.3, Math.PI - 0.3); x.stroke(); }
    x.restore();
  }

  // ───────── 晶甲蛛（新）─────────
  function crawler(x, R, p, A) {
    const c = '#4a4466', dk = '#2a2440', cry = '#7fe8ff', cry2 = '#c49bff';
    const by = -R * 0.85;
    x.save(); x.translate(A * R * 0.25, 0);
    for (let i = 0; i < 4; i++) for (const far of [1, 0]) {
      const hx = -R * 0.45 + i * R * 0.3, sw = Math.sin(p + i * 1.6 + far * Math.PI) * 0.5;
      const kx = hx + Math.sin(sw - 0.5 + (far ? 0.2 : 0)) * R * 0.55, ky = by - R * 0.35;
      const fx = kx + Math.sin(sw) * R * 0.25 + (i - 1.5) * R * 0.12;
      limb(x, hx, by, kx, ky, R * 0.09, far ? shade(dk, -0.2) : dk); limb(x, kx, ky, fx, 0, R * 0.08, far ? shade(dk, -0.2) : c);
    }
    x.beginPath(); x.ellipse(-R * 0.45, by - R * 0.1, R * 0.7, R * 0.5, -0.2, 0, TAU); fs(x, ball(x, -R * 0.45, by - R * 0.1, R * 0.7, c), OUT, lw(R));
    crystalShard(x, -R * 0.75, by - R * 0.4, R * 0.15, R * 0.6, cry2, -0.4, R); crystalShard(x, -R * 0.45, by - R * 0.5, R * 0.18, R * 0.85, cry, 0.05, R); crystalShard(x, -R * 0.15, by - R * 0.4, R * 0.13, R * 0.5, cry, 0.45, R);
    x.beginPath(); x.ellipse(R * 0.35, by + R * 0.05, R * 0.42, R * 0.36, 0, 0, TAU); fs(x, ball(x, R * 0.35, by + R * 0.05, R * 0.42, shade(c, 0.1)), OUT, lw(R));
    for (const [ex, ey, er] of [[0.38, -0.05, 0.1], [0.6, -0.04, 0.09], [0.48, -0.2, 0.06], [0.68, -0.18, 0.05]]) { circ(x, ex * R, by + ey * R, er * R, '#1a0a20'); x.save(); x.shadowColor = '#ff4a8a'; x.shadowBlur = R * 0.2; circ(x, ex * R + er * R * 0.2, by + ey * R - er * R * 0.2, er * R * 0.45, '#ff6aa0'); x.restore(); }
    for (const sd of [0, 1]) { const fy = by + R * 0.3, fx = R * (0.48 + sd * 0.18); x.beginPath(); x.moveTo(fx - R * 0.05, fy - R * 0.05); x.quadraticCurveTo(fx + R * 0.1, fy + R * 0.15 + A * R * 0.1, fx - R * 0.02, fy + R * 0.25 + A * R * 0.1); x.lineTo(fx + R * 0.04, fy - R * 0.05); x.closePath(); fs(x, '#e8e0f0', OUT, lw(R) * 0.6); }
    x.restore();
  }

  // ───────── 木乃伊（新）─────────
  function mummy(x, R, p, A) {
    const wrap = '#e8dcc0', dk = '#b8a888', glow = '#7dffb0';
    const s1 = Math.sin(p), bob = Math.abs(Math.cos(p)) * R * 0.05;
    for (const [ph, c] of [[Math.PI, dk], [0, wrap]]) { const sw = Math.sin(p + ph) * 0.35; leg2(x, 0, -R * 0.8, sw, R * 0.42, R * 0.38, R * 0.22, c, -0.15); }
    x.save(); x.translate(A * R * 0.15, -bob);
    limb(x, -R * 0.25, -R * 1.6, R * 0.55 + s1 * R * 0.08 + A * R * 0.3, -R * 1.55, R * 0.2, dk);
    rrect(x, -R * 0.5, -R * 1.85, R * 1.0, R * 1.15, R * 0.3); fs(x, tri(x, wrap, -R * 0.5, -R * 1.8, R * 0.5, -R * 0.7, 0.7), OUT, lw(R));
    x.save(); rrect(x, -R * 0.5, -R * 1.85, R * 1.0, R * 1.15, R * 0.3); x.clip();
    x.strokeStyle = rgba('#8a7a5a', 0.55); x.lineWidth = Math.max(1, R * 0.04);
    for (let i = 0; i < 8; i++) { const yy = -R * 1.8 + i * R * 0.15; x.beginPath(); x.moveTo(-R * 0.55, yy + (i % 2) * R * 0.06); x.lineTo(R * 0.55, yy + R * 0.1 - (i % 2) * R * 0.04); x.stroke(); }
    x.restore();
    x.beginPath(); x.moveTo(-R * 0.3, -R * 0.9); x.quadraticCurveTo(-R * 0.55, -R * 0.55 + s1 * R * 0.05, -R * 0.45, -R * 0.3); x.lineTo(-R * 0.35, -R * 0.35); x.quadraticCurveTo(-R * 0.4, -R * 0.6, -R * 0.2, -R * 0.85); x.closePath(); fs(x, wrap, OUT, lw(R) * 0.6);
    x.beginPath(); x.arc(R * 0.06, -R * 2.12, R * 0.44, 0, TAU); fs(x, ball(x, R * 0.06, -R * 2.12, R * 0.44, wrap), OUT, lw(R));
    x.save(); x.beginPath(); x.arc(R * 0.06, -R * 2.12, R * 0.44, 0, TAU); x.clip();
    x.strokeStyle = rgba('#8a7a5a', 0.55); x.lineWidth = Math.max(1, R * 0.04);
    for (let i = 0; i < 6; i++) { const yy = -R * 2.5 + i * R * 0.15; x.beginPath(); x.moveTo(-R * 0.4, yy + R * 0.08); x.lineTo(R * 0.5, yy - (i % 2) * R * 0.05); x.stroke(); }
    x.fillStyle = '#1a1410'; x.fillRect(R * 0.0, -R * 2.2, R * 0.48, R * 0.14);
    x.restore();
    x.save(); x.shadowColor = glow; x.shadowBlur = R * 0.3; circ(x, R * 0.15, -R * 2.13, R * 0.05, glow); circ(x, R * 0.36, -R * 2.13, R * 0.045, glow); x.restore();
    limb(x, R * 0.2, -R * 1.55, R * 0.85 + s1 * R * 0.1 + A * R * 0.35, -R * 1.45 - A * R * 0.15, R * 0.2, wrap);
    circ(x, 0, -R * 1.45, R * 0.12, ball(x, 0, -R * 1.45, R * 0.12, '#f2c14e')); x.strokeStyle = OUT; x.lineWidth = lw(R) * 0.6; x.stroke(); circ(x, 0, -R * 1.45, R * 0.05, '#2ab8a8');
    x.restore();
  }

  // ───────── 鐵螯蟹（新）─────────
  function crab(x, R, p, A) {
    const c = '#d8583a', dk = '#8a2a1a', hi = '#ffb08a';
    const by = -R * 0.75, s1 = Math.sin(p * 2);
    x.save(); x.translate(A * R * 0.2, -Math.abs(s1) * R * 0.04);
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const hx = sd * R * (0.35 + i * 0.18), sw = Math.sin(p * 2 + i * 1.3 + (sd > 0 ? 0 : Math.PI)) * 0.25; const kx = hx + sd * R * 0.35, ky = by - R * 0.15 + sw * R * 0.2; limb(x, hx, by + R * 0.1, kx, ky, R * 0.09, dk); limb(x, kx, ky, kx + sd * R * 0.12, 0, R * 0.08, sd > 0 ? c : dk); }
    x.beginPath(); x.moveTo(-R * 0.95, by + R * 0.15); x.quadraticCurveTo(-R * 1.0, by - R * 0.65, 0, by - R * 0.72); x.quadraticCurveTo(R * 1.0, by - R * 0.65, R * 0.95, by + R * 0.15); x.quadraticCurveTo(0, by + R * 0.4, -R * 0.95, by + R * 0.15); x.closePath();
    fs(x, rgrad(x, -R * 0.3, by - R * 0.5, R * 0.05, R * 1.2, [hi, shade(c, 0.1), c, dk]), OUT, lw(R));
    x.strokeStyle = rgba(dk, 0.6); x.lineWidth = Math.max(1, R * 0.05); x.beginPath(); x.moveTo(-R * 0.6, by - R * 0.25); x.quadraticCurveTo(0, by - R * 0.45, R * 0.6, by - R * 0.25); x.stroke();
    for (const [sx, sy] of [[-0.5, -0.4], [0.0, -0.55], [0.5, -0.4], [-0.25, -0.15], [0.3, -0.15]]) circ(x, sx * R, by + sy * R, R * 0.06, '#ffd0b0');
    spec(x, -R * 0.4, by - R * 0.45, R * 0.25, R * 0.08, 0.5);
    for (const sd of [0, 1]) { const ex = R * (0.1 + sd * 0.35), ey = by - R * 0.9 + Math.sin(p + sd) * R * 0.04; limb(x, ex, by - R * 0.6, ex, ey, R * 0.07, dk); eye(x, ex, ey, R * 0.13, 1, '#1a1a2a', 1); }
    const cl = A > 0 ? Math.sin(A * Math.PI) : (Math.sin(p) + 1) * 0.15;
    for (const [sd, sc] of [[1, 1], [-1, 0.75]]) {
      x.save(); x.translate(sd * R * 0.8, by - R * 0.1); x.scale(sd * sc, sc); x.rotate(-0.4 - (sd > 0 ? A * 0.6 : 0));
      limb(x, 0, 0, R * 0.35, -R * 0.25, R * 0.14, c);
      x.translate(R * 0.4, -R * 0.35);
      x.beginPath(); x.ellipse(0, 0, R * 0.32, R * 0.24, 0, 0, TAU); fs(x, ball(x, 0, 0, R * 0.32, c), OUT, lw(R));
      x.save(); x.rotate(-0.3 - cl * 0.5); x.beginPath(); x.moveTo(R * 0.2, -R * 0.08); x.quadraticCurveTo(R * 0.55, -R * 0.28, R * 0.6, -R * 0.02); x.lineTo(R * 0.25, R * 0.02); x.closePath(); fs(x, tri(x, c, 0, -R * 0.3, 0, 0), OUT, lw(R) * 0.8); x.restore();
      x.save(); x.rotate(0.3 + cl * 0.3); x.beginPath(); x.moveTo(R * 0.2, R * 0.08); x.quadraticCurveTo(R * 0.5, R * 0.22, R * 0.55, R * 0.04); x.lineTo(R * 0.25, 0); x.closePath(); fs(x, shade(c, -0.15), OUT, lw(R) * 0.8); x.restore();
      x.restore();
    }
    x.restore();
  }

  // ───────── 頭目：岩石巨人王 ─────────
  function bossGolem(x, R, p, A) {
    const c = '#9a7a58', dk = '#5e4430', mag = '#ff8a2a';
    const s1 = Math.sin(p), bob = Math.abs(Math.cos(p)) * R * 0.06;
    for (const [ph, cc] of [[Math.PI, shade(dk, -0.15)], [0, dk]]) { const sw = Math.sin(p + ph) * R * 0.2; rrect(x, -R * 0.34 + sw, -R * 0.82, R * 0.54, R * 0.82, R * 0.14); fs(x, tri(x, cc, -R * 0.3 + sw, 0, R * 0.2 + sw, 0), OUT, lw(R)); }
    x.save(); x.translate(A * R * 0.15, -bob);
    rrect(x, -R * 1.4 - s1 * R * 0.08, -R * 2.05, R * 0.55, R * 1.45, R * 0.2); fs(x, tri(x, shade(dk, -0.05), -R * 1.4, 0, -R * 0.85, 0), OUT, lw(R));
    const body = () => { x.beginPath(); x.moveTo(-R * 0.98, -R * 0.75); x.lineTo(-R * 1.08, -R * 1.82); x.lineTo(-R * 0.62, -R * 2.5); x.lineTo(R * 0.32, -R * 2.6); x.lineTo(R * 1.04, -R * 2.12); x.lineTo(R * 1.04, -R * 0.85); x.lineTo(R * 0.42, -R * 0.65); x.closePath(); };
    body(); fs(x, lgrad(x, -R, -R * 2.6, R, -R * 0.7, [shade(c, 0.4), c, dk]), OUT, lw(R) * 1.2);
    x.save(); body(); x.clip();
    for (const [px, py, q] of [[-0.6, -2.2, 0.15], [0.4, -2.3, 0.2], [-0.2, -1.3, -0.12], [0.6, -1.4, -0.18]]) { x.beginPath(); x.moveTo(px * R, py * R); x.lineTo(px * R + R * 0.5, py * R + R * 0.1); x.lineTo(px * R + R * 0.3, py * R + R * 0.5); x.closePath(); x.fillStyle = q > 0 ? rgba('#ffffff', q) : rgba('#000000', -q); x.fill(); }
    x.restore();
    x.save(); x.shadowColor = mag; x.shadowBlur = R * 0.35;
    x.strokeStyle = mag; x.lineWidth = Math.max(1, R * 0.08); x.lineCap = 'round';
    x.beginPath(); x.moveTo(-R * 0.6, -R * 1.0); x.lineTo(-R * 0.3, -R * 1.4); x.lineTo(-R * 0.45, -R * 1.8); x.moveTo(R * 0.2, -R * 0.9); x.lineTo(R * 0.4, -R * 1.5); x.lineTo(R * 0.7, -R * 1.7); x.moveTo(-R * 0.3, -R * 1.4); x.lineTo(R * 0.05, -R * 1.5); x.stroke();
    x.strokeStyle = '#ffe9a0'; x.lineWidth = Math.max(1, R * 0.03); x.stroke();
    x.restore(); x.lineCap = 'butt';
    x.beginPath(); x.moveTo(R * 0.0, -R * 2.35); x.lineTo(R * 0.15, -R * 2.92); x.lineTo(R * 0.88, -R * 2.92); x.lineTo(R * 0.98, -R * 2.35); x.closePath(); fs(x, tri(x, shade(c, 0.12), 0, -R * 2.9, R, -R * 2.35), OUT, lw(R));
    for (const [cx, h, cc] of [[0.25, 0.42, '#ffd36b'], [0.5, 0.6, '#ffe9a0'], [0.75, 0.4, '#ffd36b']]) { x.beginPath(); x.moveTo(cx * R - R * 0.11, -R * 2.88); x.lineTo(cx * R, -R * (2.88 + h)); x.lineTo(cx * R + R * 0.11, -R * 2.88); x.closePath(); fs(x, lgrad(x, cx * R - R * 0.1, 0, cx * R + R * 0.1, 0, ['#fff8d0', cc, '#c8902a']), OUT, lw(R) * 0.6); }
    x.save(); x.shadowColor = mag; x.shadowBlur = R * 0.35;
    rrect(x, R * 0.28, -R * 2.68, R * 0.17, R * 0.11, R * 0.03); fs(x, '#ffe27a', null); rrect(x, R * 0.6, -R * 2.68, R * 0.17, R * 0.11, R * 0.03); fs(x, '#ffe27a', null);
    x.restore();
    if (A > 0.2) { rrect(x, R * 0.35, -R * 2.52, R * 0.4, R * 0.1 * (1 + A), R * 0.03); fs(x, '#3a1a08', null); }
    const ay = A > 0 ? -A * R * 0.6 : 0;
    rrect(x, R * 0.88 + s1 * R * 0.08, -R * 2.05 + ay, R * 0.58, R * 1.5, R * 0.2); fs(x, lgrad(x, R * 0.88, 0, R * 1.45, 0, [shade(c, 0.15), c, dk]), OUT, lw(R));
    for (let i = 0; i < 3; i++) circ(x, R * (0.98 + i * 0.17) + s1 * R * 0.08, -R * 0.56 + ay, R * 0.11, tri(x, dk, 0, -R * 0.7, 0, -R * 0.45));
    x.restore();
  }

  // ───────── 頭目：炎龍 ─────────
  function dragon(x, R, p, A) {
    const c = '#d8402e', dk = '#7a1e12', belly = '#ffc27a', wing = '#b02a20';
    const flap = Math.sin(p), by = -R * 0.3 + flap * R * 0.15;
    const wingP = (sd, back) => {
      const tipY = by - R * (1.35 * flap + 0.35), tipX = sd * R * 2.55;
      x.beginPath(); x.moveTo(sd * R * 0.2, by - R * 0.35); x.lineTo(sd * R * 1.25, by - R * (1.25 * flap + 0.75)); x.lineTo(tipX, tipY); x.quadraticCurveTo(sd * R * 2.05, by - R * 0.1, sd * R * 1.85, by + R * 0.4 - flap * R * 0.3); x.quadraticCurveTo(sd * R * 1.55, by + R * 0.1, sd * R * 1.3, by + R * 0.5 - flap * R * 0.25); x.quadraticCurveTo(sd * R * 1.0, by + R * 0.2, sd * R * 0.75, by + R * 0.5 - flap * R * 0.2); x.quadraticCurveTo(sd * R * 0.5, by + R * 0.2, sd * R * 0.2, by + R * 0.25); x.closePath();
      fs(x, lgrad(x, 0, by - R * 1.2, 0, by + R * 0.5, back ? [shade(wing, -0.25), shade(wing, -0.5)] : ['#ff9a6a', '#e8503a', wing]), OUT, lw(R));
      x.strokeStyle = shade(dk, -0.2); x.lineWidth = Math.max(1, R * 0.07); x.lineCap = 'round';
      const jx = sd * R * 1.25, jy = by - R * (1.25 * flap + 0.75);
      x.beginPath(); x.moveTo(sd * R * 0.2, by - R * 0.35); x.lineTo(jx, jy); x.lineTo(tipX, tipY);
      x.moveTo(jx, jy); x.lineTo(sd * R * 1.85, by + R * 0.4 - flap * R * 0.3); x.moveTo(jx, jy); x.lineTo(sd * R * 1.3, by + R * 0.5 - flap * R * 0.25); x.moveTo(jx, jy); x.lineTo(sd * R * 0.75, by + R * 0.5 - flap * R * 0.2); x.stroke();
      x.lineCap = 'butt'; poly(x, [jx, jy, jx + sd * R * 0.1, jy - R * 0.22, jx + sd * R * 0.15, jy + R * 0.02], '#ffe9c0');
    };
    wingP(-1, true);
    x.beginPath(); x.moveTo(-R * 0.5, by + R * 0.1); x.quadraticCurveTo(-R * 1.4, by + R * 0.95 + flap * R * 0.1, -R * 2.05, by + R * 0.35); x.quadraticCurveTo(-R * 1.3, by + R * 0.5, -R * 0.45, by - R * 0.2); x.closePath(); fs(x, tri(x, c, 0, by - R * 0.2, 0, by + R), OUT, lw(R));
    poly(x, [-R * 2.05, by + R * 0.35, -R * 2.38, by + R * 0.08, -R * 2.3, by + R * 0.6], '#ffd36b');
    x.beginPath(); x.ellipse(0, by, R * 0.88, R * 0.62, -0.15, 0, TAU); fs(x, ball(x, 0, by, R * 0.9, c), OUT, lw(R));
    x.beginPath(); x.ellipse(R * 0.1, by + R * 0.25, R * 0.58, R * 0.32, -0.15, 0, Math.PI); x.fillStyle = lgrad(x, 0, by, 0, by + R * 0.6, [shade(belly, 0.2), belly, shade(belly, -0.2)]); x.fill();
    x.strokeStyle = rgba('#a85a2a', 0.6); x.lineWidth = Math.max(1, R * 0.03); for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(-R * 0.35 + i * R * 0.18, by + R * 0.28); x.lineTo(-R * 0.3 + i * R * 0.18, by + R * 0.52); x.stroke(); }
    x.strokeStyle = rgba(dk, 0.35); for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(-R * 0.5 + i * R * 0.2, by - R * 0.15, R * 0.09, 0, Math.PI); x.stroke(); }
    for (let i = 0; i < 4; i++) poly(x, [-R * 0.55 + i * R * 0.3, by - R * 0.5, -R * 0.45 + i * R * 0.3, by - R * 0.82, -R * 0.33 + i * R * 0.3, by - R * 0.54], '#ffd36b');
    x.beginPath(); x.moveTo(R * 0.45, by - R * 0.3); x.quadraticCurveTo(R * 0.9, by - R * 0.7, R * 1.05, by - R * 0.95); x.lineTo(R * 1.3, by - R * 0.75); x.quadraticCurveTo(R * 1.0, by - R * 0.35, R * 0.7, by + R * 0.15); x.closePath(); fs(x, tri(x, c, R * 0.5, by - R, R * 1.2, by), OUT, lw(R));
    const hx = R * 1.25, hy = by - R * 0.95;
    poly(x, [hx - R * 0.15, hy - R * 0.2, hx - R * 0.5, hy - R * 0.8, hx + R * 0.05, hy - R * 0.3], '#fff0c0');
    poly(x, [hx + R * 0.05, hy - R * 0.25, hx - R * 0.12, hy - R * 0.85, hx + R * 0.25, hy - R * 0.28], '#ffd36b');
    x.beginPath(); x.ellipse(hx, hy, R * 0.42, R * 0.32, 0.1, 0, TAU); fs(x, ball(x, hx, hy, R * 0.42, c), OUT, lw(R));
    const jaw = R * (0.04 + A * 0.18);
    x.beginPath(); x.moveTo(hx + R * 0.15, hy - R * 0.15); x.lineTo(hx + R * 0.78, hy + R * 0.0); x.lineTo(hx + R * 0.72, hy + R * 0.12); x.lineTo(hx + R * 0.15, hy + R * 0.15); x.closePath(); fs(x, tri(x, c, hx, hy - R * 0.2, hx, hy + R * 0.2), OUT, lw(R));
    x.beginPath(); x.moveTo(hx + R * 0.15, hy + R * 0.15); x.lineTo(hx + R * 0.66, hy + R * 0.12 + jaw); x.lineTo(hx + R * 0.15, hy + R * 0.28 + jaw); x.closePath(); fs(x, shade(c, -0.2), OUT, lw(R) * 0.8);
    for (let i = 0; i < 3; i++) poly(x, [hx + R * (0.3 + i * 0.13), hy + R * 0.12, hx + R * (0.34 + i * 0.13), hy + R * 0.22, hx + R * (0.38 + i * 0.13), hy + R * 0.12], '#fffbe8');
    if (A > 0.3) { x.save(); x.shadowColor = '#ffb347'; x.shadowBlur = R * 0.5; circ(x, hx + R * 0.72, hy + R * 0.12 + jaw * 0.5, R * 0.12 * A, '#ffe27a'); x.restore(); }
    circ(x, hx + R * 0.62, hy + R * 0.0, R * 0.05, '#2a0a0a');
    x.save(); x.shadowColor = '#ffd36b'; x.shadowBlur = R * 0.2; x.beginPath(); x.ellipse(hx + R * 0.05, hy - R * 0.08, R * 0.12, R * 0.08, 0, 0, TAU); fs(x, '#ffe27a', null); x.restore();
    x.fillStyle = '#2a0a0a'; x.fillRect(hx + R * 0.06, hy - R * 0.15, R * 0.04, R * 0.14);
    x.beginPath(); x.moveTo(hx - R * 0.1, hy - R * 0.2); x.lineTo(hx + R * 0.2, hy - R * 0.12); x.lineTo(hx + R * 0.2, hy - R * 0.2); x.closePath(); x.fillStyle = dk; x.fill();
    wingP(1, false);
  }

  // ───────── 頭目：巫妖王 ─────────
  function lich(x, R, p, A) {
    const robe = '#3a2a5a', dk = '#1a1028', trim = '#b38aff', glow = '#7dffb0';
    const s1 = Math.sin(p), fl = Math.sin(p) * R * 0.1;
    x.save(); x.translate(0, -R * 0.25 + fl);
    x.save(); x.translate(-R * 0.9, -R * 0.2); x.rotate(-A * 0.4);
    limb(x, 0, 0, -R * 0.05, -R * 2.8, R * 0.11, '#5a3a22');
    x.strokeStyle = '#d8d0e8'; x.lineWidth = Math.max(1, R * 0.06); x.beginPath(); x.arc(-R * 0.05, -R * 3.0, R * 0.28, Math.PI * 0.1, Math.PI * 0.9, true); x.stroke();
    x.save(); x.shadowColor = glow; x.shadowBlur = R * 0.4; circ(x, -R * 0.05, -R * 3.0, R * 0.18, ball(x, -R * 0.05, -R * 3.0, R * 0.18, glow)); x.restore();
    x.restore();
    const robeP = () => { x.beginPath(); x.moveTo(-R * 1.0, -R * 0.1); for (let i = 0; i <= 8; i++) x.lineTo(-R * 1.0 + i * R * 0.25, -R * 0.1 + (i % 2 ? -R * 0.25 : R * 0.12) + Math.sin(p * 2 + i) * R * 0.06); x.lineTo(R * 0.6, -R * 2.0); x.lineTo(-R * 0.6, -R * 2.0); x.closePath(); };
    robeP(); fs(x, lgrad(x, -R, 0, R, 0, [shade(robe, 0.25), robe, dk]), OUT, lw(R));
    x.save(); robeP(); x.clip();
    x.strokeStyle = rgba(trim, 0.5); x.lineWidth = Math.max(1, R * 0.04);
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-R * 0.5 + i * R * 0.3, -R * 1.9); x.quadraticCurveTo(-R * 0.6 + i * R * 0.35, -R * 1.0, -R * 0.7 + i * R * 0.4, -R * 0.1); x.stroke(); }
    for (let i = 0; i < 3; i++) Gfx.star(x, -R * 0.4 + i * R * 0.4, -R * 0.55, R * 0.08, rgba(glow, 0.7), false);
    x.restore();
    x.strokeStyle = trim; x.lineWidth = Math.max(1, R * 0.08); x.beginPath(); x.moveTo(0, -R * 2.0); x.lineTo(R * 0.05, -R * 0.2); x.stroke();
    for (const sd of [-1, 1]) { x.beginPath(); x.ellipse(sd * R * 0.55, -R * 1.95, R * 0.36, R * 0.23, sd * 0.3, 0, TAU); fs(x, ball(x, sd * R * 0.55, -R * 1.95, R * 0.36, '#6a5a8a'), OUT, lw(R)); for (let k = 0; k < 2; k++) poly(x, [sd * R * (0.5 + k * 0.18), -R * 2.1, sd * R * (0.75 + k * 0.18), -R * (2.5 - k * 0.08), sd * R * (0.7 + k * 0.18), -R * 2.05], '#e8e0f0'); }
    x.beginPath(); x.arc(R * 0.05, -R * 2.4, R * 0.43, 0, TAU); fs(x, ball(x, R * 0.05, -R * 2.4, R * 0.43, '#e8e3d2'), OUT, lw(R));
    rrect(x, -R * 0.12, -R * 2.18, R * 0.38, R * 0.2 + A * R * 0.1, R * 0.06); fs(x, '#e8e3d2', OUT, lw(R) * 0.8);
    circ(x, -R * 0.08, -R * 2.42, R * 0.13, '#120818'); circ(x, R * 0.22, -R * 2.42, R * 0.13, '#120818');
    x.save(); x.shadowColor = glow; x.shadowBlur = R * 0.4; circ(x, -R * 0.06, -R * 2.42, R * 0.065, glow); circ(x, R * 0.24, -R * 2.42, R * 0.065, glow); x.restore();
    x.beginPath(); x.moveTo(-R * 0.42, -R * 2.62); x.lineTo(-R * 0.45, -R * 3.02); x.lineTo(-R * 0.22, -R * 2.82); x.lineTo(R * 0.05, -R * 3.2); x.lineTo(R * 0.3, -R * 2.82); x.lineTo(R * 0.52, -R * 3.02); x.lineTo(R * 0.5, -R * 2.62); x.closePath();
    fs(x, lgrad(x, 0, -R * 3.1, 0, -R * 2.6, ['#f0e0ff', trim, '#5a3aa8']), OUT, lw(R) * 0.8);
    x.save(); x.shadowColor = glow; x.shadowBlur = R * 0.3; circ(x, R * 0.05, -R * 2.78, R * 0.07, glow); x.restore();
    const hx = R * 0.92 + s1 * R * 0.1 + A * R * 0.2, hy = -R * 1.38 - A * R * 0.3;
    limb(x, R * 0.45, -R * 1.8, hx, hy, R * 0.19, robe);
    for (let i = 0; i < 3; i++) limb(x, hx, hy, hx + R * (0.15 + i * 0.03), hy - R * (0.1 - i * 0.1), R * 0.04, '#e8e3d2');
    if (A > 0.2) { x.save(); x.shadowColor = glow; x.shadowBlur = R * 0.6; circ(x, hx + R * 0.25, hy, R * 0.16 * A, rgba(glow, 0.8)); x.restore(); }
    x.restore();
  }

  // ───────── 頭目：雷霆巨鷹（新）─────────
  function roc(x, R, p, A) {
    const c = '#e8e0d0', dk = '#6a5a4a', wing = '#3a5aa8', gold = '#f2c14e';
    const flap = Math.sin(p), by = -R * 0.3 + flap * R * 0.15;
    const wingP = (sd, back) => {
      const tipY = by - R * (1.4 * flap + 0.3), tipX = sd * R * 2.7;
      x.beginPath(); x.moveTo(sd * R * 0.25, by - R * 0.3);
      x.quadraticCurveTo(sd * R * 1.3, by - R * (1.3 * flap + 0.9), tipX, tipY);
      for (let i = 0; i < 5; i++) { const t = i / 4, fx = tipX * (1 - t * 0.7), fy = tipY + R * (0.3 + t * 0.5) - flap * R * 0.2 * (1 - t); x.lineTo(fx, fy + R * 0.25); x.lineTo(fx - sd * R * 0.12, fy); }
      x.lineTo(sd * R * 0.25, by + R * 0.25); x.closePath();
      fs(x, lgrad(x, 0, by - R * 1.2, 0, by + R * 0.6, back ? [shade(wing, -0.2), shade(wing, -0.5)] : ['#8ab0f0', wing, shade(wing, -0.35)]), OUT, lw(R));
      x.strokeStyle = rgba(back ? '#1a2a5a' : '#c8d8ff', 0.6); x.lineWidth = Math.max(1, R * 0.04);
      for (let i = 1; i < 5; i++) { const t = i / 5; x.beginPath(); x.moveTo(sd * R * (0.4 + t * 0.6), by - R * 0.2 - flap * R * 0.3 * t); x.lineTo(tipX * (1 - t * 0.7) - sd * R * 0.1, tipY + R * (0.45 + t * 0.4)); x.stroke(); }
      if (!back) { x.save(); x.shadowColor = '#bfe0ff'; x.shadowBlur = R * 0.4; x.strokeStyle = '#fff6a0'; x.lineWidth = Math.max(1, R * 0.05); x.beginPath(); x.moveTo(sd * R * 1.2, by - R * (1.0 * flap + 0.6)); x.lineTo(sd * R * 1.45, by - R * (1.0 * flap + 0.35)); x.lineTo(sd * R * 1.3, by - R * (1.0 * flap + 0.3)); x.lineTo(sd * R * 1.6, by - R * (1.0 * flap)); x.stroke(); x.restore(); }
    };
    wingP(-1, true);
    for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(-R * 0.5, by + R * 0.1); x.quadraticCurveTo(-R * 1.2, by + R * (0.2 + i * 0.15), -R * 1.5, by + R * (0.1 + i * 0.25)); x.lineTo(-R * 1.3, by + R * (0.3 + i * 0.25)); x.quadraticCurveTo(-R * 0.9, by + R * 0.35, -R * 0.45, by + R * 0.3); x.closePath(); fs(x, tri(x, i === 1 ? '#f0f0f8' : wing, 0, by, 0, by + R * 0.6), OUT, lw(R) * 0.7); }
    x.beginPath(); x.ellipse(0, by, R * 0.85, R * 0.6, -0.2, 0, TAU); fs(x, ball(x, 0, by, R * 0.85, c), OUT, lw(R));
    x.strokeStyle = rgba(dk, 0.35); x.lineWidth = Math.max(1, R * 0.03); for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(-R * 0.4 + (i % 3) * R * 0.3, by + R * (Math.floor(i / 3) * 0.2), R * 0.1, 0.2, Math.PI - 0.2); x.stroke(); }
    for (const sd of [-0.15, 0.25]) { limb(x, sd * R, by + R * 0.5, sd * R + R * 0.1, by + R * 0.85, R * 0.1, gold); for (let k = -1; k <= 1; k++) limb(x, sd * R + R * 0.1, by + R * 0.85, sd * R + R * (0.1 + k * 0.1), by + R * 0.98, R * 0.04, '#2a2020'); }
    const hx = R * 0.85, hy = by - R * 0.55;
    x.beginPath(); x.ellipse(hx, hy, R * 0.42, R * 0.38, 0, 0, TAU); fs(x, ball(x, hx, hy, R * 0.42, '#ffffff'), OUT, lw(R));
    for (let i = 0; i < 3; i++) poly(x, [hx - R * 0.2, hy - R * 0.25, hx - R * (0.6 + i * 0.1), hy - R * (0.5 + i * 0.12), hx - R * 0.1, hy - R * 0.1], i === 1 ? '#ffd36b' : '#e8eef8');
    const open = A * R * 0.12;
    x.beginPath(); x.moveTo(hx + R * 0.25, hy - R * 0.12); x.quadraticCurveTo(hx + R * 0.85, hy - R * 0.1, hx + R * 0.75, hy + R * 0.18); x.lineTo(hx + R * 0.3, hy + R * 0.05); x.closePath(); fs(x, lgrad(x, hx, hy - R * 0.1, hx, hy + R * 0.2, ['#fff0a0', gold, '#b8801a']), OUT, lw(R) * 0.8);
    x.beginPath(); x.moveTo(hx + R * 0.28, hy + R * 0.06); x.lineTo(hx + R * 0.62, hy + R * 0.16 + open); x.lineTo(hx + R * 0.3, hy + R * 0.16 + open); x.closePath(); fs(x, '#c8901a', OUT, lw(R) * 0.6);
    eye(x, hx + R * 0.12, hy - R * 0.08, R * 0.12, 1, '#ffb000', 2);
    wingP(1, false);
  }

  // ───────── 頭目：晶甲巨蟲（新）─────────
  function worm(x, R, p, A) {
    const c = '#6a5a8a', dk = '#3a2e54', belly = '#b8a8d0', cry = '#7fe8ff';
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const sx = -R * 1.5 + i * R * 0.55, wv = Math.sin(p - i * 0.9) * R * 0.15, sy = -R * (0.55 + i * 0.12) - wv - (i === segs - 1 ? A * R * 0.3 : 0), r = R * (0.48 + i * 0.06);
      x.beginPath(); x.ellipse(sx, sy, r, r * 0.92, 0, 0, TAU); fs(x, ball(x, sx, sy, r, c), OUT, lw(R));
      x.beginPath(); x.ellipse(sx + r * 0.1, sy + r * 0.45, r * 0.75, r * 0.35, 0, 0, Math.PI); x.fillStyle = belly; x.fill();
      x.strokeStyle = rgba(dk, 0.6); x.lineWidth = Math.max(1, R * 0.04); x.beginPath(); x.arc(sx - r * 0.65, sy, r * 0.9, -0.9, 0.9); x.stroke();
      if (i < segs - 1) crystalShard(x, sx, sy - r * 0.75, r * 0.25, r * 0.75, i % 2 ? '#c49bff' : cry, (i - 2) * 0.15, R);
    }
    const hx = R * 0.85, hy = -R * 1.25 - Math.sin(p - 4 * 0.9) * R * 0.15 - A * R * 0.3;
    const mo = R * (0.18 + A * 0.18);
    x.beginPath(); x.ellipse(hx + R * 0.38, hy + R * 0.05, mo * 0.7, mo, 0, 0, TAU); fs(x, '#3a0a1a', OUT, lw(R));
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; poly(x, [hx + R * 0.38 + Math.cos(an) * mo * 0.7, hy + R * 0.05 + Math.sin(an) * mo, hx + R * 0.38 + Math.cos(an + 0.2) * mo * 0.35, hy + R * 0.05 + Math.sin(an + 0.2) * mo * 0.5, hx + R * 0.38 + Math.cos(an + 0.4) * mo * 0.7, hy + R * 0.05 + Math.sin(an + 0.4) * mo], '#fff6e0'); }
    for (const [ex, ey] of [[0.1, -0.4], [0.32, -0.45]]) { x.save(); x.shadowColor = '#ff4a8a'; x.shadowBlur = R * 0.3; circ(x, hx + ex * R, hy + ey * R, R * 0.07, '#ff6aa0'); x.restore(); }
    for (const [ox, h, col] of [[-0.2, 0.7, cry], [0.05, 0.95, '#c49bff'], [0.3, 0.6, cry]]) crystalShard(x, hx + ox * R, hy - R * 0.45, R * 0.1, R * h, col, ox * 0.6, R);
  }

  // ───────── 頭目：沙漠法老（新）─────────
  function pharaoh(x, R, p, A) {
    const gold = '#f2c14e', blue = '#2a5ac8', skin = '#a87a4a', wrap = '#e8dcc0';
    const bob = Math.abs(Math.cos(p)) * R * 0.05;
    for (const [ph, c] of [[Math.PI, '#c8b890'], [0, wrap]]) { const sw = Math.sin(p + ph) * 0.35; leg2(x, 0, -R * 0.85, sw, R * 0.44, R * 0.4, R * 0.22, c, -0.15); }
    x.save(); x.translate(0, -bob);
    x.save(); x.translate(-R * 0.75, -R * 0.2); x.rotate(-0.1 - A * 0.4);
    limb(x, 0, 0, 0, -R * 2.9, R * 0.1, gold);
    x.beginPath(); x.arc(0, -R * 3.05, R * 0.22, Math.PI * 0.6, Math.PI * 2.4); x.strokeStyle = OUT; x.lineWidth = R * 0.14; x.stroke(); x.strokeStyle = gold; x.lineWidth = R * 0.08; x.stroke();
    x.restore();
    x.beginPath(); x.moveTo(-R * 0.55, -R * 1.0); x.lineTo(R * 0.55, -R * 1.0); x.lineTo(R * 0.7, -R * 0.35); x.lineTo(-R * 0.7, -R * 0.35); x.closePath(); fs(x, tri(x, '#f8f2e0', -R * 0.7, 0, R * 0.7, 0, 0.5), OUT, lw(R));
    x.fillStyle = gold; x.fillRect(-R * 0.1, -R * 1.0, R * 0.2, R * 0.65);
    rrect(x, -R * 0.52, -R * 1.85, R * 1.04, R * 0.9, R * 0.25); fs(x, tri(x, skin, -R * 0.5, -R * 1.8, R * 0.5, -R), OUT, lw(R));
    x.beginPath(); x.ellipse(0, -R * 1.72, R * 0.62, R * 0.32, 0, 0, Math.PI); x.lineTo(-R * 0.62, -R * 1.72); x.closePath(); fs(x, lgrad(x, 0, -R * 1.75, 0, -R * 1.4, [gold, blue, gold]), OUT, lw(R) * 0.8);
    for (let i = 0; i < 5; i++) { const an = 0.4 + i * 0.58; circ(x, Math.cos(an) * R * 0.48, -R * 1.72 + Math.sin(an) * R * 0.22, R * 0.05, i % 2 ? '#e5484d' : '#3ae8c0'); }
    const hx = R * 0.05, hy = -R * 2.25;
    const hood = () => { x.beginPath(); x.moveTo(hx - R * 0.55, hy + R * 0.55); x.lineTo(hx - R * 0.48, hy - R * 0.3); x.quadraticCurveTo(hx, hy - R * 0.7, hx + R * 0.48, hy - R * 0.3); x.lineTo(hx + R * 0.55, hy + R * 0.55); x.lineTo(hx + R * 0.32, hy + R * 0.55); x.lineTo(hx + R * 0.3, hy); x.lineTo(hx - R * 0.3, hy); x.lineTo(hx - R * 0.32, hy + R * 0.55); x.closePath(); };
    hood(); fs(x, gold, null);
    x.save(); hood(); x.clip(); x.fillStyle = blue; for (let i = 0; i < 5; i++) x.fillRect(hx - R * 0.6, hy - R * 0.25 + i * R * 0.17, R * 1.2, R * 0.08); x.restore();
    hood(); x.strokeStyle = OUT; x.lineWidth = lw(R); x.stroke();
    x.beginPath(); x.ellipse(hx + R * 0.02, hy + R * 0.08, R * 0.3, R * 0.36, 0, 0, TAU); fs(x, ball(x, hx, hy + R * 0.08, R * 0.32, skin), OUT, lw(R) * 0.8);
    for (const ex of [-0.08, 0.16]) { circ(x, hx + ex * R, hy + R * 0.02, R * 0.07, '#1a0a08'); x.save(); x.shadowColor = '#ffd36b'; x.shadowBlur = R * 0.4; circ(x, hx + ex * R + R * 0.01, hy + R * 0.02, R * 0.035, '#ffe27a'); x.restore(); }
    rrect(x, hx - R * 0.02, hy + R * 0.28, R * 0.12, R * 0.22, R * 0.03); fs(x, gold, OUT, lw(R) * 0.6);
    x.beginPath(); x.moveTo(hx, hy - R * 0.45); x.quadraticCurveTo(hx - R * 0.1, hy - R * 0.75, hx + R * 0.05, hy - R * 0.82); x.quadraticCurveTo(hx + R * 0.15, hy - R * 0.7, hx + R * 0.05, hy - R * 0.45); x.closePath(); fs(x, gold, OUT, lw(R) * 0.6);
    circ(x, hx + R * 0.04, hy - R * 0.72, R * 0.03, '#e5484d');
    const ax = R * 0.75 + A * R * 0.2;
    limb(x, R * 0.35, -R * 1.6, ax, -R * 1.25 - A * R * 0.3, R * 0.18, skin);
    x.fillStyle = gold; x.beginPath(); x.ellipse((R * 0.35 + ax) / 2, -R * 1.43, R * 0.12, R * 0.08, 0.5, 0, TAU); x.fill();
    if (A > 0.2) { x.save(); x.shadowColor = '#ffd36b'; x.shadowBlur = R * 0.6; circ(x, ax + R * 0.15, -R * 1.3 - A * R * 0.3, R * 0.15 * A, rgba('#ffe27a', 0.8)); x.restore(); }
    x.restore();
  }

  // ───────── 頭目：深淵海妖（新）─────────
  function kraken(x, R, p, A) {
    const c = '#8a3aa8', dk = '#4a1a64', belly = '#e8a8d8', sucker = '#ffd0f0';
    const bob = Math.sin(p) * R * 0.08;
    const tent = (bx, len, ph, sd, back) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([bx + sd * t * len * 0.55 + Math.sin(p * 1.2 + ph + t * 3) * R * 0.25 * t, -R * 0.4 + t * R * 0.4 - Math.sin(t * Math.PI) * R * 0.15 - t * t * t * R * (0.9 + 0.3 * Math.sin(p + ph))]); }
      x.lineCap = 'round'; x.lineJoin = 'round';
      for (let i = 0; i < pts.length - 1; i++) { const w = R * 0.3 * (1 - i / 9); x.strokeStyle = OUT; x.lineWidth = w + Math.max(2, R * 0.06); x.beginPath(); x.moveTo(pts[i][0], pts[i][1]); x.lineTo(pts[i + 1][0], pts[i + 1][1]); x.stroke(); }
      for (let i = 0; i < pts.length - 1; i++) { const w = R * 0.3 * (1 - i / 9); x.strokeStyle = back ? dk : c; x.lineWidth = w; x.beginPath(); x.moveTo(pts[i][0], pts[i][1]); x.lineTo(pts[i + 1][0], pts[i + 1][1]); x.stroke(); }
      if (!back) for (let i = 2; i < 8; i += 2) circ(x, pts[i][0], pts[i][1] + R * 0.06, R * 0.045, sucker);
      x.lineCap = 'butt'; x.lineJoin = 'miter';
    };
    tent(-R * 0.6, R * 2.4, 0, -1, true); tent(R * 0.6, R * 2.4, 2, 1, true);
    x.save(); x.translate(0, bob);
    const hy = -R * 2.0;
    x.beginPath(); x.moveTo(-R * 1.0, -R * 1.1); x.bezierCurveTo(-R * 1.25, hy - R * 1.2, R * 1.25, hy - R * 1.2, R * 1.0, -R * 1.1); x.quadraticCurveTo(0, -R * 0.6, -R * 1.0, -R * 1.1); x.closePath();
    fs(x, rgrad(x, -R * 0.35, hy - R * 0.5, R * 0.1, R * 1.8, [shade(c, 0.45), shade(c, 0.1), c, dk]), OUT, lw(R) * 1.2);
    for (const [sx, sy, sr] of [[-0.6, -2.4, 0.12], [-0.3, -2.75, 0.09], [0.5, -2.5, 0.13], [0.2, -2.85, 0.08], [0.75, -2.0, 0.08], [-0.75, -1.8, 0.09]]) circ(x, sx * R, sy * R, sr * R, rgba(belly, 0.55));
    spec(x, -R * 0.45, -R * 2.6, R * 0.3, R * 0.14, 0.45);
    for (const [ox, h] of [[-0.35, 0.4], [0, 0.55], [0.35, 0.4]]) { x.beginPath(); x.moveTo(ox * R - R * 0.1, -R * 2.95); x.lineTo(ox * R, -R * (2.95 + h)); x.lineTo(ox * R + R * 0.1, -R * 2.95); x.closePath(); fs(x, lgrad(x, 0, -R * 3.5, 0, -R * 2.9, ['#ffe9a0', '#f2c14e']), OUT, lw(R) * 0.6); circ(x, ox * R, -R * (2.95 + h), R * 0.06, '#9ef0ff'); }
    for (const ex of [-0.38, 0.38]) { x.beginPath(); x.ellipse(ex * R, -R * 1.55, R * 0.26, R * 0.2, 0, 0, TAU); fs(x, rgrad(x, ex * R, -R * 1.6, 0, R * 0.26, ['#fff8c0', '#ffd36b', '#c88a1a']), OUT, lw(R)); x.fillStyle = '#120818'; x.fillRect(ex * R - R * 0.04, -R * 1.72, R * 0.08, R * 0.34); circ(x, ex * R - R * 0.1, -R * 1.62, R * 0.04, '#fff'); x.beginPath(); x.moveTo(ex * R - R * 0.3, -R * 1.85 + (ex < 0 ? -R * 0.04 : R * 0.06)); x.lineTo(ex * R + R * 0.3, -R * 1.85 + (ex < 0 ? R * 0.06 : -R * 0.04)); x.lineTo(ex * R, -R * 1.72); x.closePath(); x.fillStyle = dk; x.fill(); }
    x.beginPath(); x.ellipse(0, -R * 1.08, R * 0.22, R * (0.06 + A * 0.12), 0, 0, TAU); fs(x, '#2a0a24', OUT, lw(R) * 0.8);
    if (A > 0.3) { x.save(); x.globalAlpha = A; for (let i = 0; i < 4; i++) circ(x, R * (0.1 + i * 0.12), -R * (1.0 - i * 0.05), R * (0.12 + i * 0.05), '#1e1028'); x.restore(); }
    x.restore();
    tent(-R * 0.35, R * 2.0, 1, -1, false); tent(R * 0.35, R * 2.0, 3, 1, false); tent(0, R * 1.3, 4.5, 1, false);
  }

  function drawKind(x, k, R, p, A) {
    A = A || 0;
    switch (k) {
      case 'slime': return slime(x, R, p, '#5fcf55', false, A);
      case 'mini': return slime(x, R, p, '#ff9fd0', false, A);
      case 'splitter': return slime(x, R, p, '#ff6fb5', true, A);
      case 'runner': return runner(x, R, p, A);
      case 'beetle': return beetle(x, R, p, A);
      case 'bat': return bat(x, R, p, false, A);
      case 'gargoyle': return bat(x, R, p, true, A);
      case 'golem': return golem(x, R, p, A);
      case 'healer': return healer(x, R, p, A);
      case 'shield': return knight(x, R, p, A);
      case 'ogre': return ogre(x, R, p, A);
      case 'skeleton': return skeleton(x, R, p, A);
      case 'wisp': return wisp(x, R, p, A);
      case 'crawler': return crawler(x, R, p, A);
      case 'mummy': return mummy(x, R, p, A);
      case 'crab': return crab(x, R, p, A);
      case 'bossGolem': return bossGolem(x, R, p, A);
      case 'bossDragon': return dragon(x, R, p, A);
      case 'bossLich': return lich(x, R, p, A);
      case 'bossRoc': return roc(x, R, p, A);
      case 'bossWorm': return worm(x, R, p, A);
      case 'bossPharaoh': return pharaoh(x, R, p, A);
      case 'bossKraken': return kraken(x, R, p, A);
    }
  }
  // 取得某一格動畫的快取圖。v: 0 正常、1 閃白、2 冰藍；atk = true 時 f 是攻擊動畫的第幾格
  function frame(k, R, f, v, dpr, atk) {
    const B = BOX[k] || BOX.slime;
    const Rq = Math.round(R * 4) / 4;
    const key = `en:${k}:${Rq}:${atk ? 'a' : ''}${f}`;
    // 四周多留一點空間（攻擊動作會往前撲）
    const base = Gfx.sprite(key, (B.w + 0.9) * Rq, (B.h + 0.5) * Rq, (B.w + 0.9) * Rq / 2, (B.ay + 0.5) * Rq, dpr,
      x => atk ? drawKind(x, k, Rq, f / FA * Math.PI, Math.sin(f / (FA - 1) * Math.PI)) : drawKind(x, k, Rq, f / FR * TAU, 0),
      Math.max(1, Rq * 0.07), Math.max(0.8, Rq * 0.085));
    if (!v) return base;
    if (v === 1) return Gfx.tinted(base, key + `:w@${dpr}`, '#ffffff', 0.85);
    return Gfx.tinted(base, key + `:i@${dpr}`, '#8fd8ff', 0.5);
  }
  const visR = (k, r, s) => r * s * ((BOX[k] || BOX.slime).vis);
  return { FR, FA, BOX, frame, visR, drawKind };
})();
