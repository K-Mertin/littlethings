'use strict';
// 守塔奇兵：敵人美術。每種敵人畫成 10 格動畫（走路、拍翅膀），快取後每幀只貼圖。
// 原點 = 腳底中心（飛行敵人是身體中心下方），面向右；R = 體型單位。

const Beasts = (() => {
  const { TAU, shade, rgba, ell, circ, rrect, poly, lgrad, rgrad } = Gfx;
  const FR = 10; // 動畫格數
  // 每種敵人的畫布範圍（以 R 為單位）：w 寬、h 高、ay 原點離上緣、top 血條高度、vis 視覺放大
  const BOX = {
    slime: { w: 2.8, h: 2.6, ay: 2.1, top: 1.75, vis: 1.45 },
    mini: { w: 2.8, h: 2.6, ay: 2.1, top: 1.75, vis: 1.5 },
    splitter: { w: 2.8, h: 2.6, ay: 2.1, top: 1.8, vis: 1.38 },
    runner: { w: 3.8, h: 2.8, ay: 2.2, top: 1.75, vis: 1.45 },
    beetle: { w: 3.2, h: 2.6, ay: 2.0, top: 1.6, vis: 1.4 },
    bat: { w: 4.6, h: 3.4, ay: 2.0, top: 1.5, vis: 1.45 },
    golem: { w: 3.2, h: 3.4, ay: 2.9, top: 2.55, vis: 1.35 },
    healer: { w: 3.0, h: 3.6, ay: 3.0, top: 2.75, vis: 1.38 },
    shield: { w: 3.2, h: 3.6, ay: 3.0, top: 2.7, vis: 1.35 },
    ogre: { w: 3.6, h: 3.6, ay: 3.0, top: 2.6, vis: 1.3 },
    gargoyle: { w: 4.8, h: 3.6, ay: 2.2, top: 1.7, vis: 1.38 },
    skeleton: { w: 3.0, h: 3.4, ay: 2.9, top: 2.6, vis: 1.4 },
    bossGolem: { w: 3.8, h: 3.8, ay: 3.2, top: 2.9, vis: 1.3 },
    bossDragon: { w: 5.6, h: 4.2, ay: 2.6, top: 1.9, vis: 1.3 },
    bossLich: { w: 3.6, h: 4.2, ay: 3.5, top: 3.2, vis: 1.25 },
  };
  const OUT = 'rgba(30,20,32,.8)';
  function fs(x, f, s, w) { x.fillStyle = f; x.fill(); if (s) { x.strokeStyle = s; x.lineWidth = w; x.stroke(); } }
  function eye(x, cx, cy, r, look, iris) {
    x.beginPath(); x.ellipse(cx, cy, r * 0.85, r, 0, 0, TAU); fs(x, '#ffffff', OUT, Math.max(0.8, r * 0.18));
    circ(x, cx + r * 0.3 * look, cy + r * 0.1, r * 0.55, iris || '#1d1a2b');
    circ(x, cx + r * 0.1 * look, cy - r * 0.25, r * 0.22, '#ffffff');
  }
  function limb(x, x0, y0, x1, y1, w, c) {
    x.lineCap = 'round';
    x.strokeStyle = OUT; x.lineWidth = w + 2; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.strokeStyle = c; x.lineWidth = w; x.stroke();
    x.lineCap = 'butt';
  }
  function leg2(x, hx, hy, ang, l1, l2, w, c, bend) {
    // 兩節腿：髖 (hx,hy)，往下擺 ang
    const kx = hx + Math.sin(ang) * l1, ky = hy + Math.cos(ang) * l1;
    const fx = kx + Math.sin(ang + (bend || 0.4)) * l2, fy = ky + Math.cos(ang + (bend || 0.4)) * l2;
    limb(x, hx, hy, kx, ky, w, c); limb(x, kx, ky, fx, fy, w * 0.9, c);
    return [fx, fy];
  }

  // ───────── 各種敵人 ─────────
  function slime(x, R, p, col, inner) {
    const hop = Math.max(0, Math.sin(p)), lift = hop * R * 0.28;
    const sq = 1 + (Math.cos(p * 2) * 0.5 + (hop > 0.05 ? 0 : 0.5)) * 0.1;
    const w = R * 1.05 / sq, h = R * 1.45 * sq;
    x.save(); x.translate(0, -lift);
    x.beginPath(); x.moveTo(-w, 0); x.bezierCurveTo(-w * 1.05, -h * 0.75, -w * 0.45, -h, 0, -h); x.bezierCurveTo(w * 0.55, -h, w * 1.05, -h * 0.7, w, 0); x.quadraticCurveTo(0, R * 0.16, -w, 0); x.closePath();
    fs(x, rgrad(x, -w * 0.3, -h * 0.6, 0, h * 1.1, [shade(col, 0.45), col, shade(col, -0.35)], 0, 0), null);
    if (inner) {
      x.save(); x.clip();
      for (const [ix, iy, ir] of [[-0.35, -0.35, 0.28], [0.35, -0.5, 0.24], [0.05, -0.15, 0.22]]) { circ(x, ix * R, iy * R, ir * R, rgba('#ffffff', 0.28)); circ(x, ix * R + ir * R * 0.25, iy * R, ir * R * 0.18, rgba('#3a1030', 0.5)); }
      x.restore();
    }
    // 高光
    x.beginPath(); x.ellipse(-w * 0.45, -h * 0.68, w * 0.22, h * 0.13, -0.6, 0, TAU); x.fillStyle = 'rgba(255,255,255,.7)'; x.fill();
    circ(x, -w * 0.2, -h * 0.85, R * 0.06, 'rgba(255,255,255,.8)');
    // 眼睛與嘴
    eye(x, R * 0.1, -h * 0.55, R * 0.2, 1); eye(x, R * 0.52, -h * 0.55, R * 0.18, 1);
    x.strokeStyle = shade(col, -0.6); x.lineWidth = Math.max(1, R * 0.07); x.lineCap = 'round';
    x.beginPath(); x.arc(R * 0.32, -h * 0.32, R * 0.12, 0.3, Math.PI - 0.3); x.stroke(); x.lineCap = 'butt';
    // 底部的黏液
    x.beginPath(); x.ellipse(0, R * 0.02, w * 0.9, R * 0.12, 0, 0, Math.PI); x.fillStyle = rgba(shade(col, -0.3), 0.8); x.fill();
    x.restore();
  }
  function runner(x, R, p) {
    const c = '#f08a3c', belly = '#ffe2bc', dk = '#b85a20';
    const s1 = Math.sin(p), c1 = Math.cos(p);
    const by = -R * 0.85 - Math.abs(c1) * R * 0.1;
    // 後腿（遠）
    leg2(x, -R * 0.55, by + R * 0.1, -s1 * 0.7, R * 0.42, R * 0.38, R * 0.17, shade(dk, -0.1), -0.6);
    leg2(x, R * 0.5, by + R * 0.1, s1 * 0.6, R * 0.4, R * 0.36, R * 0.16, shade(dk, -0.1), 0.5);
    // 尾巴
    x.beginPath(); x.moveTo(-R * 0.8, by - R * 0.1); x.quadraticCurveTo(-R * 1.5, by - R * 0.35 - s1 * R * 0.15, -R * 1.65, by - R * 0.9 - s1 * R * 0.1); x.quadraticCurveTo(-R * 1.25, by - R * 0.55, -R * 0.75, by + R * 0.12); x.closePath();
    fs(x, lgrad(x, -R * 1.6, 0, -R * 0.7, 0, ['#fff4e0', c]), null);
    // 身體
    x.beginPath(); x.ellipse(0, by, R * 0.95, R * 0.5, -0.08, 0, TAU); fs(x, lgrad(x, 0, by - R * 0.5, 0, by + R * 0.5, [shade(c, 0.25), c, shade(c, -0.2)]), null);
    x.beginPath(); x.ellipse(R * 0.1, by + R * 0.25, R * 0.6, R * 0.22, 0, 0, Math.PI); x.fillStyle = belly; x.fill();
    // 前腿（近）
    leg2(x, -R * 0.45, by + R * 0.15, s1 * 0.75, R * 0.42, R * 0.4, R * 0.19, c, -0.6);
    leg2(x, R * 0.6, by + R * 0.15, -s1 * 0.65, R * 0.4, R * 0.38, R * 0.18, c, 0.5);
    // 頭
    const hx = R * 0.95, hy = by - R * 0.45 + c1 * R * 0.05;
    poly(x, [hx - R * 0.15, hy - R * 0.25, hx - R * 0.05, hy - R * 0.85, hx + R * 0.2, hy - R * 0.32], dk);
    poly(x, [hx + R * 0.15, hy - R * 0.3, hx + R * 0.38, hy - R * 0.85, hx + R * 0.48, hy - R * 0.22], c);
    poly(x, [hx + R * 0.2, hy - R * 0.35, hx + R * 0.36, hy - R * 0.72, hx + R * 0.42, hy - R * 0.28], '#ffd0c0');
    x.beginPath(); x.ellipse(hx, hy, R * 0.45, R * 0.38, 0, 0, TAU); fs(x, rgrad(x, hx, hy, 0, R * 0.5, [shade(c, 0.3), c], -R * 0.15, -R * 0.15), null);
    x.beginPath(); x.moveTo(hx + R * 0.2, hy - R * 0.1); x.quadraticCurveTo(hx + R * 0.75, hy - R * 0.05, hx + R * 0.82, hy + R * 0.12); x.quadraticCurveTo(hx + R * 0.5, hy + R * 0.32, hx + R * 0.1, hy + R * 0.25); x.closePath(); fs(x, belly, null);
    circ(x, hx + R * 0.82, hy + R * 0.08, R * 0.08, '#2a1a1a');
    x.beginPath(); x.ellipse(hx + R * 0.2, hy - R * 0.08, R * 0.1, R * 0.12, 0, 0, TAU); fs(x, '#ffffff', null); circ(x, hx + R * 0.24, hy - R * 0.06, R * 0.06, '#1d1a2b');
    x.strokeStyle = shade(dk, -0.3); x.lineWidth = Math.max(1, R * 0.06); x.beginPath(); x.moveTo(hx + R * 0.05, hy - R * 0.25); x.lineTo(hx + R * 0.3, hy - R * 0.2); x.stroke();
  }
  function beetle(x, R, p) {
    const c = '#6f8aa8', dk = '#3e4d63';
    const s1 = Math.sin(p);
    const by = -R * 0.55;
    // 腳
    for (let i = 0; i < 3; i++) {
      const hx = -R * 0.5 + i * R * 0.5, sw = Math.sin(p + i * 2.1) * 0.5;
      leg2(x, hx, by + R * 0.1, sw - 0.2, R * 0.3, R * 0.3, R * 0.1, '#2a3040', 0.8);
    }
    // 殼
    x.beginPath(); x.moveTo(-R * 1.0, by + R * 0.2); x.bezierCurveTo(-R * 1.05, by - R * 0.95, R * 0.85, by - R * 1.0, R * 0.85, by + R * 0.2); x.quadraticCurveTo(0, by + R * 0.45, -R * 1.0, by + R * 0.2); x.closePath();
    fs(x, rgrad(x, -R * 0.3, by - R * 0.6, 0, R * 1.3, ['#d8e6f5', c, dk], 0, 0), null);
    x.save(); x.clip();
    x.strokeStyle = rgba('#1a2030', 0.55); x.lineWidth = Math.max(1, R * 0.06);
    x.beginPath(); x.moveTo(-R * 0.1, by - R * 0.72); x.quadraticCurveTo(-R * 0.05, by - R * 0.1, -R * 0.15, by + R * 0.35); x.stroke();
    for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(-R * 0.1, by + R * 0.2, R * (0.4 + i * 0.28), R * (0.35 + i * 0.25), 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); }
    for (const [rx, ry] of [[-0.6, -0.15], [-0.35, -0.5], [0.3, -0.5], [0.55, -0.15]]) { circ(x, rx * R, by + ry * R, R * 0.05, '#c8d4e2'); }
    x.restore();
    x.beginPath(); x.ellipse(-R * 0.45, by - R * 0.48, R * 0.28, R * 0.12, -0.5, 0, TAU); x.fillStyle = 'rgba(255,255,255,.6)'; x.fill();
    // 頭與角
    const hx = R * 0.9, hy = by + R * 0.02 + s1 * R * 0.03;
    x.beginPath(); x.ellipse(hx, hy, R * 0.32, R * 0.28, 0, 0, TAU); fs(x, dk, null);
    x.beginPath(); x.moveTo(hx + R * 0.05, hy - R * 0.2); x.quadraticCurveTo(hx + R * 0.5, hy - R * 0.4, hx + R * 0.55, hy - R * 0.85); x.quadraticCurveTo(hx + R * 0.3, hy - R * 0.45, hx - R * 0.05, hy - R * 0.1); x.closePath(); fs(x, '#c8cfd8', null);
    circ(x, hx + R * 0.15, hy - R * 0.02, R * 0.08, '#ff6a4a'); circ(x, hx + R * 0.13, hy - R * 0.04, R * 0.03, '#ffe0c0');
  }
  function bat(x, R, p, gar) {
    const c = gar ? '#8e98a8' : '#7d55d8', wc = gar ? '#6a7484' : '#5a35b0', mem = gar ? '#8a8f9a' : '#b48cff';
    const flap = Math.sin(p), by = -R * 0.2 + flap * R * 0.12;
    for (const sd of [-1, 1]) {
      const tipY = by - R * (0.95 * flap + 0.15), tipX = sd * R * (gar ? 2.05 : 1.95);
      x.beginPath(); x.moveTo(sd * R * 0.35, by - R * 0.2);
      x.quadraticCurveTo(sd * R * 1.1, by - R * (0.9 * flap + 0.55), tipX, tipY);
      x.lineTo(sd * R * 1.55, by + R * 0.2 - flap * R * 0.2);
      x.quadraticCurveTo(sd * R * 1.35, by + R * 0.05, sd * R * 1.05, by + R * 0.35 - flap * R * 0.15);
      x.quadraticCurveTo(sd * R * 0.85, by + R * 0.15, sd * R * 0.35, by + R * 0.3);
      x.closePath();
      fs(x, lgrad(x, 0, by - R, 0, by + R * 0.4, [shade(mem, 0.1), wc]), null);
      x.strokeStyle = shade(wc, -0.35); x.lineWidth = Math.max(1, R * 0.05);
      x.beginPath(); x.moveTo(sd * R * 0.35, by - R * 0.15); x.lineTo(tipX * 0.98, tipY); x.moveTo(sd * R * 0.7, by - R * 0.25 - flap * R * 0.2); x.lineTo(sd * R * 1.05, by + R * 0.3 - flap * R * 0.15); x.stroke();
    }
    if (gar) { // 尾巴
      x.strokeStyle = c; x.lineWidth = R * 0.12; x.lineCap = 'round'; x.beginPath(); x.moveTo(-R * 0.3, by + R * 0.5); x.quadraticCurveTo(-R * 0.9, by + R * 0.9, -R * 1.1, by + R * 0.5); x.stroke(); x.lineCap = 'butt';
      poly(x, [-R * 1.1, by + R * 0.35, -R * 1.25, by + R * 0.55, -R * 1.0, by + R * 0.6], c);
    }
    x.beginPath(); x.ellipse(0, by + R * 0.05, R * 0.62, R * 0.7, 0, 0, TAU); fs(x, rgrad(x, 0, by, 0, R * 0.8, [shade(c, 0.35), c, shade(c, -0.3)], -R * 0.2, -R * 0.3), null);
    // 耳朵 / 角
    if (gar) { for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(sd * R * 0.3, by - R * 0.45); x.quadraticCurveTo(sd * R * 0.5, by - R * 1.05, sd * R * 0.15, by - R * 1.15); x.quadraticCurveTo(sd * R * 0.35, by - R * 0.8, sd * R * 0.05, by - R * 0.55); x.closePath(); fs(x, '#d8d2c0', null); } }
    else { for (const sd of [-1, 1]) poly(x, [sd * R * 0.5, by - R * 0.35, sd * R * 0.45, by - R * 1.05, sd * R * 0.1, by - R * 0.5], c); poly(x, [R * 0.38, by - R * 0.42, R * 0.38, by - R * 0.85, R * 0.18, by - R * 0.5], '#ff9ad0'); }
    x.beginPath(); x.ellipse(R * 0.05, by + R * 0.3, R * 0.35, R * 0.3, 0, 0, Math.PI); x.fillStyle = rgba('#ffffff', 0.18); x.fill();
    eye(x, -R * 0.05, by - R * 0.12, R * 0.16, 1, gar ? '#ff9a00' : '#ff2a5a'); eye(x, R * 0.32, by - R * 0.12, R * 0.15, 1, gar ? '#ff9a00' : '#ff2a5a');
    poly(x, [R * 0.05, by + R * 0.18, R * 0.12, by + R * 0.34, R * 0.18, by + R * 0.18], '#fff');
    poly(x, [R * 0.22, by + R * 0.18, R * 0.28, by + R * 0.32, R * 0.34, by + R * 0.18], '#fff');
    // 腳爪
    for (const sd of [-0.2, 0.25]) limb(x, sd * R, by + R * 0.65, sd * R + R * 0.05, by + R * 0.85, R * 0.08, shade(c, -0.3));
  }
  function golem(x, R, p) {
    const c = '#b9a98e', dk = '#8a7a62', rune = '#6fe8ff';
    const s1 = Math.sin(p), bob = Math.abs(Math.cos(p)) * R * 0.08;
    // 腿
    for (const [sd, ph] of [[-1, 0], [1, Math.PI]]) {
      const sw = Math.sin(p + ph) * R * 0.22;
      rrect(x, sd * R * 0.35 - R * 0.2 + sw, -R * 0.65, R * 0.4, R * 0.65 - Math.max(0, -Math.cos(p + ph)) * R * 0.08, R * 0.08); fs(x, sd < 0 ? shade(dk, -0.1) : dk, OUT, Math.max(1, R * 0.05));
    }
    x.save(); x.translate(0, -bob);
    // 後手
    rrect(x, -R * 1.15 - s1 * R * 0.1, -R * 1.75, R * 0.38, R * 0.95, R * 0.12); fs(x, shade(dk, -0.15), OUT, Math.max(1, R * 0.05));
    // 身體
    rrect(x, -R * 0.85, -R * 2.0, R * 1.7, R * 1.45, R * 0.25); fs(x, lgrad(x, -R * 0.8, 0, R * 0.8, 0, [shade(c, 0.25), c, shade(c, -0.25)]), OUT, Math.max(1, R * 0.05));
    x.strokeStyle = rgba('#000000', 0.25); x.lineWidth = Math.max(1, R * 0.05);
    x.beginPath(); x.moveTo(-R * 0.5, -R * 2.0); x.lineTo(-R * 0.35, -R * 1.5); x.lineTo(-R * 0.6, -R * 1.1); x.moveTo(R * 0.55, -R * 1.9); x.lineTo(R * 0.4, -R * 1.4); x.stroke();
    // 苔蘚
    x.fillStyle = '#7aa84a'; x.beginPath(); x.ellipse(-R * 0.3, -R * 1.95, R * 0.45, R * 0.12, 0, 0, TAU); x.fill();
    // 符文發光
    x.strokeStyle = rune; x.lineWidth = Math.max(1, R * 0.09); x.lineCap = 'round';
    x.beginPath(); x.moveTo(-R * 0.25, -R * 1.25); x.lineTo(0, -R * 1.5); x.lineTo(R * 0.25, -R * 1.25); x.moveTo(0, -R * 1.5); x.lineTo(0, -R * 1.0); x.stroke(); x.lineCap = 'butt';
    // 頭
    rrect(x, R * 0.0, -R * 2.45, R * 0.75, R * 0.55, R * 0.12); fs(x, shade(c, 0.1), OUT, Math.max(1, R * 0.05));
    rrect(x, R * 0.25, -R * 2.25, R * 0.4, R * 0.12, R * 0.05); fs(x, '#bff6ff', null);
    // 前手
    rrect(x, R * 0.75 + s1 * R * 0.1, -R * 1.75, R * 0.4, R * 1.0, R * 0.12); fs(x, lgrad(x, R * 0.75, 0, R * 1.15, 0, [c, dk]), OUT, Math.max(1, R * 0.05));
    x.restore();
  }
  function healer(x, R, p) {
    const robe = '#f4f0e6', trim = '#4fcf8a';
    const s1 = Math.sin(p), bob = Math.abs(Math.cos(p)) * R * 0.06;
    // 腳
    for (const ph of [0, Math.PI]) { const sw = Math.sin(p + ph) * R * 0.2; ell(x, sw + R * 0.05, -R * 0.06, R * 0.18, R * 0.09, '#6a4a32'); }
    x.save(); x.translate(0, -bob);
    // 法杖（後）
    limb(x, R * 0.7, -R * 0.1, R * 0.75, -R * 2.5, R * 0.1, '#8a5a2e');
    // 長袍
    x.beginPath(); x.moveTo(-R * 0.75, -R * 0.08); x.quadraticCurveTo(-R * 0.65 + s1 * R * 0.08, -R * 1.2, -R * 0.42, -R * 1.65); x.lineTo(R * 0.42, -R * 1.65); x.quadraticCurveTo(R * 0.65, -R * 1.1, R * 0.75 + s1 * R * 0.08, -R * 0.08); x.closePath();
    fs(x, lgrad(x, -R * 0.7, 0, R * 0.7, 0, ['#ffffff', robe, '#c8c0ae']), OUT, Math.max(1, R * 0.05));
    x.fillStyle = trim; x.fillRect(-R * 0.1, -R * 1.55, R * 0.2, R * 1.45);
    x.fillRect(-R * 0.75, -R * 0.2, R * 1.5, R * 0.1);
    x.fillStyle = '#ffffff'; x.fillRect(-R * 0.05, -R * 1.3, R * 0.1, R * 0.35); x.fillRect(-R * 0.17, -R * 1.18, R * 0.34, R * 0.1);
    // 頭與兜帽
    circ(x, R * 0.05, -R * 1.95, R * 0.4, '#ffd9b8');
    x.beginPath(); x.arc(R * 0.02, -R * 1.98, R * 0.5, Math.PI * 0.75, Math.PI * 2.2); x.quadraticCurveTo(R * 0.35, -R * 1.6, R * 0.3, -R * 1.55); x.lineTo(-R * 0.45, -R * 1.55); x.closePath(); fs(x, robe, OUT, Math.max(1, R * 0.05));
    circ(x, R * 0.2, -R * 1.92, R * 0.06, '#2a1a12'); circ(x, R * 0.38, -R * 1.92, R * 0.055, '#2a1a12');
    x.strokeStyle = '#c87a5a'; x.lineWidth = Math.max(1, R * 0.04); x.beginPath(); x.arc(R * 0.3, -R * 1.78, R * 0.08, 0.3, Math.PI - 0.3); x.stroke();
    // 手
    circ(x, R * 0.72, -R * 1.25, R * 0.13, '#ffd9b8');
    // 法杖寶石
    circ(x, R * 0.75, -R * 2.6, R * 0.2, rgrad(x, R * 0.75, -R * 2.6, 0, R * 0.22, ['#eafff2', '#4fe0a0', '#1f8a5a'], -R * 0.06, -R * 0.06));
    x.strokeStyle = '#c99a40'; x.lineWidth = Math.max(1, R * 0.05); x.beginPath(); x.arc(R * 0.75, -R * 2.6, R * 0.24, Math.PI * 0.2, Math.PI * 0.8); x.stroke();
    x.restore();
  }
  function knight(x, R, p) {
    const steel = '#9aa6b8', blue = '#3a68c8';
    const bob = Math.abs(Math.cos(p)) * R * 0.06;
    for (const [ph, c] of [[Math.PI, '#4a5262'], [0, '#5a6274']]) { const sw = Math.sin(p + ph) * 0.45; leg2(x, R * 0.0, -R * 0.75, sw, R * 0.38, R * 0.36, R * 0.22, c, -0.2); }
    x.save(); x.translate(0, -bob);
    // 劍（後）
    limb(x, -R * 0.55, -R * 1.2, -R * 0.95, -R * 2.0, R * 0.08, '#d8dde6');
    // 身體
    rrect(x, -R * 0.55, -R * 1.75, R * 1.1, R * 1.05, R * 0.3); fs(x, lgrad(x, -R * 0.5, 0, R * 0.5, 0, ['#c8d2e2', steel, '#5a6478']), OUT, Math.max(1, R * 0.05));
    x.fillStyle = blue; x.fillRect(-R * 0.55, -R * 1.0, R * 1.1, R * 0.16);
    // 頭盔
    x.beginPath(); x.arc(R * 0.05, -R * 2.05, R * 0.44, Math.PI, 0); x.lineTo(R * 0.49, -R * 1.75); x.lineTo(-R * 0.39, -R * 1.75); x.closePath(); fs(x, lgrad(x, -R * 0.4, 0, R * 0.5, 0, ['#e2e8f2', steel, '#5a6478']), OUT, Math.max(1, R * 0.05));
    x.fillStyle = '#1e2232'; x.fillRect(R * 0.05, -R * 2.05, R * 0.42, R * 0.1);
    x.fillStyle = '#1e2232'; x.fillRect(R * 0.22, -R * 1.98, R * 0.06, R * 0.2);
    // 羽飾
    x.beginPath(); x.moveTo(-R * 0.05, -R * 2.45); x.quadraticCurveTo(-R * 0.5, -R * 2.9 + Math.sin(p * 2) * R * 0.05, -R * 0.75, -R * 2.3); x.quadraticCurveTo(-R * 0.4, -R * 2.55, -R * 0.1, -R * 2.3); x.closePath(); fs(x, '#e5484d', null);
    // 盾
    const sx = R * 0.68;
    x.beginPath(); x.moveTo(sx - R * 0.35, -R * 1.7); x.lineTo(sx + R * 0.35, -R * 1.7); x.lineTo(sx + R * 0.35, -R * 1.05); x.quadraticCurveTo(sx + R * 0.3, -R * 0.6, sx, -R * 0.45); x.quadraticCurveTo(sx - R * 0.3, -R * 0.6, sx - R * 0.35, -R * 1.05); x.closePath();
    fs(x, lgrad(x, sx - R * 0.35, 0, sx + R * 0.35, 0, ['#ffe9a0', '#f2c14e', '#b8862a']), OUT, Math.max(1, R * 0.05));
    x.beginPath(); x.moveTo(sx - R * 0.22, -R * 1.58); x.lineTo(sx + R * 0.22, -R * 1.58); x.lineTo(sx + R * 0.22, -R * 1.1); x.quadraticCurveTo(sx, -R * 0.7, sx - R * 0.22, -R * 1.1); x.closePath(); fs(x, blue, null);
    Gfx.star(x, sx, -R * 1.25, R * 0.12, '#ffe9a0', false);
    x.restore();
  }
  function ogre(x, R, p) {
    const c = '#7fae55', dk = '#5a8a3a', belly = '#b8d88a';
    const s1 = Math.sin(p), bob = Math.abs(Math.cos(p)) * R * 0.08;
    for (const [ph, cc] of [[Math.PI, shade(dk, -0.15)], [0, dk]]) { const sw = Math.sin(p + ph) * R * 0.25; rrect(x, -R * 0.25 + sw, -R * 0.75, R * 0.42, R * 0.75, R * 0.15); fs(x, cc, OUT, Math.max(1, R * 0.05)); ell(x, -R * 0.02 + sw + R * 0.06, -R * 0.04, R * 0.28, R * 0.1, '#5a3a22'); }
    x.save(); x.translate(0, -bob);
    // 後手
    limb(x, -R * 0.65, -R * 1.65, -R * 0.95 - s1 * R * 0.15, -R * 0.95, R * 0.32, dk);
    // 身體
    x.beginPath(); x.ellipse(0, -R * 1.35, R * 0.95, R * 0.85, 0, 0, TAU); fs(x, rgrad(x, -R * 0.3, -R * 1.6, 0, R * 1.1, [shade(c, 0.3), c, dk], 0, 0), OUT, Math.max(1, R * 0.05));
    x.beginPath(); x.ellipse(R * 0.15, -R * 1.15, R * 0.6, R * 0.55, 0, 0, TAU); x.fillStyle = belly; x.fill();
    // 腰布
    x.beginPath(); x.moveTo(-R * 0.85, -R * 0.75); x.lineTo(R * 0.85, -R * 0.75); x.lineTo(R * 0.6, -R * 0.45); x.lineTo(R * 0.2, -R * 0.55); x.lineTo(-R * 0.2, -R * 0.4); x.lineTo(-R * 0.7, -R * 0.5); x.closePath(); fs(x, '#8a5a32', OUT, Math.max(1, R * 0.04));
    // 頭
    x.beginPath(); x.ellipse(R * 0.25, -R * 2.2, R * 0.48, R * 0.42, 0, 0, TAU); fs(x, rgrad(x, R * 0.1, -R * 2.35, 0, R * 0.55, [shade(c, 0.3), c]), OUT, Math.max(1, R * 0.05));
    eye(x, R * 0.25, -R * 2.3, R * 0.11, 1, '#c83a2a'); eye(x, R * 0.52, -R * 2.3, R * 0.1, 1, '#c83a2a');
    x.strokeStyle = '#2a3a1a'; x.lineWidth = Math.max(1, R * 0.06); x.beginPath(); x.moveTo(R * 0.13, -R * 2.45); x.lineTo(R * 0.36, -R * 2.4); x.moveTo(R * 0.45, -R * 2.42); x.lineTo(R * 0.62, -R * 2.46); x.stroke();
    poly(x, [R * 0.22, -R * 2.0, R * 0.27, -R * 2.18, R * 0.32, -R * 2.0], '#fffbe8');
    poly(x, [R * 0.48, -R * 2.0, R * 0.53, -R * 2.18, R * 0.58, -R * 2.0], '#fffbe8');
    // 前手與棍棒
    const sw = s1 * 0.15;
    x.save(); x.translate(R * 0.75, -R * 1.65); x.rotate(-0.6 + sw);
    rrect(x, -R * 0.12, -R * 1.45, R * 0.3, R * 1.3, R * 0.14); fs(x, lgrad(x, -R * 0.12, 0, R * 0.18, 0, ['#b07a48', '#7a4a22']), OUT, Math.max(1, R * 0.05));
    circ(x, R * 0.03, -R * 1.4, R * 0.25, '#9a6a3e'); x.strokeStyle = OUT; x.stroke();
    for (const [nx, ny] of [[-0.18, -1.45], [0.22, -1.35], [0.05, -1.62]]) poly(x, [nx * R, ny * R, nx * R + R * 0.08, ny * R - R * 0.04, nx * R + R * 0.04, ny * R + R * 0.06], '#d8dde6');
    x.restore();
    limb(x, R * 0.6, -R * 1.6, R * 0.8, -R * 1.65, R * 0.32, c);
    x.restore();
  }
  function skeleton(x, R, p) {
    const bone = '#efe9d8', dk = '#b8b09a';
    const s1 = Math.sin(p);
    for (const ph of [Math.PI, 0]) { const sw = Math.sin(p + ph) * 0.5; leg2(x, 0, -R * 0.9, sw, R * 0.45, R * 0.45, R * 0.1, ph ? dk : bone, -0.3); }
    // 盆骨、脊椎、肋骨
    x.beginPath(); x.ellipse(0, -R * 0.92, R * 0.25, R * 0.12, 0, 0, TAU); fs(x, bone, OUT, Math.max(1, R * 0.04));
    limb(x, 0, -R * 0.95, 0, -R * 1.6, R * 0.1, bone);
    for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(0, -R * (1.25 + i * 0.15), R * (0.35 - i * 0.04), R * 0.08, 0, 0, TAU); x.strokeStyle = OUT; x.lineWidth = R * 0.1; x.stroke(); x.strokeStyle = bone; x.lineWidth = R * 0.06; x.stroke(); }
    // 後手與盾
    limb(x, -R * 0.2, -R * 1.6, -R * 0.45 - s1 * R * 0.1, -R * 1.05, R * 0.08, dk);
    circ(x, -R * 0.5 - s1 * R * 0.1, -R * 1.1, R * 0.32, '#8a5a2e'); x.strokeStyle = OUT; x.lineWidth = Math.max(1, R * 0.05); x.stroke();
    circ(x, -R * 0.5 - s1 * R * 0.1, -R * 1.1, R * 0.1, '#9aa0aa');
    // 頭骨
    x.beginPath(); x.arc(R * 0.05, -R * 2.0, R * 0.42, 0, TAU); fs(x, rgrad(x, -R * 0.1, -R * 2.15, 0, R * 0.5, ['#ffffff', bone, dk]), OUT, Math.max(1, R * 0.05));
    rrect(x, R * 0.0, -R * 1.75, R * 0.35, R * 0.22, R * 0.06); fs(x, bone, OUT, Math.max(1, R * 0.04));
    circ(x, R * 0.0, -R * 2.0, R * 0.12, '#2a2040'); circ(x, R * 0.28, -R * 2.0, R * 0.11, '#2a2040');
    circ(x, R * 0.02, -R * 2.0, R * 0.04, '#ff6a6a'); circ(x, R * 0.3, -R * 2.0, R * 0.035, '#ff6a6a');
    x.strokeStyle = '#2a2040'; x.lineWidth = 1; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(R * (0.07 + i * 0.1), -R * 1.75); x.lineTo(R * (0.07 + i * 0.1), -R * 1.6); x.stroke(); }
    // 前手與劍
    const sa = -0.9 + s1 * 0.3;
    x.save(); x.translate(R * 0.3, -R * 1.5); x.rotate(sa);
    limb(x, 0, 0, R * 0.4, 0, R * 0.08, bone);
    x.fillStyle = OUT; x.fillRect(R * 0.38, -R * 0.06, R * 0.75, R * 0.12); x.fillStyle = '#b8a888'; x.fillRect(R * 0.4, -R * 0.04, R * 0.72, R * 0.08);
    x.fillStyle = '#6b4a2a'; x.fillRect(R * 0.34, -R * 0.15, R * 0.06, R * 0.3);
    x.restore();
  }
  function bossGolem(x, R, p) {
    const c = '#9a7a58', dk = '#6a4e36', mag = '#ff8a2a';
    const s1 = Math.sin(p), bob = Math.abs(Math.cos(p)) * R * 0.06;
    for (const [ph, cc] of [[Math.PI, shade(dk, -0.15)], [0, dk]]) { const sw = Math.sin(p + ph) * R * 0.2; rrect(x, -R * 0.32 + sw, -R * 0.8, R * 0.5, R * 0.8, R * 0.12); fs(x, cc, OUT, Math.max(1, R * 0.04)); }
    x.save(); x.translate(0, -bob);
    rrect(x, -R * 1.35 - s1 * R * 0.08, -R * 2.0, R * 0.5, R * 1.4, R * 0.18); fs(x, shade(dk, -0.1), OUT, Math.max(1, R * 0.04));
    // 身體：不規則岩塊
    x.beginPath(); x.moveTo(-R * 0.95, -R * 0.75); x.lineTo(-R * 1.05, -R * 1.8); x.lineTo(-R * 0.6, -R * 2.45); x.lineTo(R * 0.3, -R * 2.55); x.lineTo(R * 1.0, -R * 2.1); x.lineTo(R * 1.0, -R * 0.85); x.lineTo(R * 0.4, -R * 0.65); x.closePath();
    fs(x, lgrad(x, -R, -R * 2.5, R, -R * 0.7, [shade(c, 0.35), c, dk]), OUT, Math.max(1, R * 0.05));
    // 岩漿裂縫
    x.save(); x.shadowColor = mag; x.shadowBlur = R * 0.3;
    x.strokeStyle = mag; x.lineWidth = Math.max(1, R * 0.07); x.lineCap = 'round';
    x.beginPath(); x.moveTo(-R * 0.6, -R * 1.0); x.lineTo(-R * 0.3, -R * 1.4); x.lineTo(-R * 0.45, -R * 1.8); x.moveTo(R * 0.2, -R * 0.9); x.lineTo(R * 0.4, -R * 1.5); x.lineTo(R * 0.7, -R * 1.7); x.moveTo(-R * 0.3, -R * 1.4); x.lineTo(R * 0.05, -R * 1.5); x.stroke();
    x.restore(); x.lineCap = 'butt';
    // 頭
    x.beginPath(); x.moveTo(R * 0.0, -R * 2.3); x.lineTo(R * 0.15, -R * 2.85); x.lineTo(R * 0.85, -R * 2.85); x.lineTo(R * 0.95, -R * 2.3); x.closePath(); fs(x, shade(c, 0.15), OUT, Math.max(1, R * 0.05));
    // 王冠水晶
    for (const [cx, h, cc] of [[0.25, 0.4, '#ffd36b'], [0.5, 0.55, '#ffe9a0'], [0.75, 0.38, '#ffd36b']]) { x.beginPath(); x.moveTo(cx * R - R * 0.1, -R * 2.82); x.lineTo(cx * R, -R * (2.82 + h)); x.lineTo(cx * R + R * 0.1, -R * 2.82); x.closePath(); fs(x, cc, OUT, Math.max(1, R * 0.03)); }
    x.save(); x.shadowColor = mag; x.shadowBlur = R * 0.3;
    rrect(x, R * 0.3, -R * 2.62, R * 0.15, R * 0.1, R * 0.03); fs(x, '#ffe27a', null); rrect(x, R * 0.6, -R * 2.62, R * 0.15, R * 0.1, R * 0.03); fs(x, '#ffe27a', null);
    x.restore();
    // 前手
    rrect(x, R * 0.85 + s1 * R * 0.08, -R * 2.0, R * 0.55, R * 1.45, R * 0.18); fs(x, lgrad(x, R * 0.85, 0, R * 1.4, 0, [c, dk]), OUT, Math.max(1, R * 0.05));
    for (let i = 0; i < 3; i++) circ(x, R * (0.95 + i * 0.16) + s1 * R * 0.08, -R * 0.55, R * 0.1, dk);
    x.restore();
  }
  function dragon(x, R, p) {
    const c = '#d8402e', dk = '#8a2418', belly = '#ffc27a', wing = '#b82e22';
    const flap = Math.sin(p), by = -R * 0.3 + flap * R * 0.15;
    // 遠側翅膀
    const wingP = (sd, back) => {
      const tipY = by - R * (1.35 * flap + 0.35), tipX = sd * R * 2.5;
      x.beginPath(); x.moveTo(sd * R * 0.2, by - R * 0.35);
      x.lineTo(sd * R * 1.25, by - R * (1.25 * flap + 0.75)); x.lineTo(tipX, tipY);
      x.quadraticCurveTo(sd * R * 2.05, by - R * 0.1, sd * R * 1.85, by + R * 0.4 - flap * R * 0.3);
      x.quadraticCurveTo(sd * R * 1.55, by + R * 0.1, sd * R * 1.3, by + R * 0.5 - flap * R * 0.25);
      x.quadraticCurveTo(sd * R * 1.0, by + R * 0.2, sd * R * 0.75, by + R * 0.5 - flap * R * 0.2);
      x.quadraticCurveTo(sd * R * 0.5, by + R * 0.2, sd * R * 0.2, by + R * 0.25); x.closePath();
      fs(x, lgrad(x, 0, by - R * 1.2, 0, by + R * 0.5, back ? [shade(wing, -0.25), shade(wing, -0.45)] : ['#ff8a5a', wing]), null);
      x.strokeStyle = shade(dk, -0.2); x.lineWidth = Math.max(1, R * 0.06);
      x.beginPath(); x.moveTo(sd * R * 0.2, by - R * 0.35); x.lineTo(sd * R * 1.25, by - R * (1.25 * flap + 0.75)); x.lineTo(tipX, tipY);
      x.moveTo(sd * R * 1.25, by - R * (1.25 * flap + 0.75)); x.lineTo(sd * R * 1.85, by + R * 0.4 - flap * R * 0.3);
      x.moveTo(sd * R * 1.25, by - R * (1.25 * flap + 0.75)); x.lineTo(sd * R * 1.3, by + R * 0.5 - flap * R * 0.25);
      x.moveTo(sd * R * 1.25, by - R * (1.25 * flap + 0.75)); x.lineTo(sd * R * 0.75, by + R * 0.5 - flap * R * 0.2); x.stroke();
    };
    wingP(-1, true);
    // 尾巴
    x.beginPath(); x.moveTo(-R * 0.5, by + R * 0.1); x.quadraticCurveTo(-R * 1.4, by + R * 0.9 + flap * R * 0.1, -R * 2.0, by + R * 0.35); x.quadraticCurveTo(-R * 1.3, by + R * 0.5, -R * 0.45, by - R * 0.2); x.closePath(); fs(x, c, OUT, Math.max(1, R * 0.04));
    poly(x, [-R * 2.0, by + R * 0.35, -R * 2.3, by + R * 0.1, -R * 2.25, by + R * 0.55], dk);
    // 身體
    x.beginPath(); x.ellipse(0, by, R * 0.85, R * 0.6, -0.15, 0, TAU); fs(x, rgrad(x, -R * 0.2, by - R * 0.3, 0, R, [shade(c, 0.35), c, dk]), OUT, Math.max(1, R * 0.05));
    x.beginPath(); x.ellipse(R * 0.1, by + R * 0.25, R * 0.55, R * 0.3, -0.15, 0, Math.PI); x.fillStyle = belly; x.fill();
    x.strokeStyle = rgba('#a85a2a', 0.6); x.lineWidth = 1; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-R * 0.3 + i * R * 0.2, by + R * 0.28); x.lineTo(-R * 0.25 + i * R * 0.2, by + R * 0.5); x.stroke(); }
    // 背刺
    for (let i = 0; i < 4; i++) poly(x, [-R * 0.55 + i * R * 0.3, by - R * 0.48, -R * 0.45 + i * R * 0.3, by - R * 0.78, -R * 0.33 + i * R * 0.3, by - R * 0.52], '#ffd36b');
    // 脖子與頭
    x.beginPath(); x.moveTo(R * 0.45, by - R * 0.3); x.quadraticCurveTo(R * 0.9, by - R * 0.7, R * 1.05, by - R * 0.95); x.lineTo(R * 1.3, by - R * 0.75); x.quadraticCurveTo(R * 1.0, by - R * 0.35, R * 0.7, by + R * 0.15); x.closePath(); fs(x, c, OUT, Math.max(1, R * 0.04));
    const hx = R * 1.25, hy = by - R * 0.95;
    poly(x, [hx - R * 0.15, hy - R * 0.2, hx - R * 0.45, hy - R * 0.75, hx + R * 0.05, hy - R * 0.3], '#ffe9a0');
    poly(x, [hx + R * 0.05, hy - R * 0.25, hx - R * 0.1, hy - R * 0.8, hx + R * 0.25, hy - R * 0.28], '#ffd36b');
    x.beginPath(); x.ellipse(hx, hy, R * 0.4, R * 0.3, 0.1, 0, TAU); fs(x, rgrad(x, hx - R * 0.1, hy - R * 0.1, 0, R * 0.45, [shade(c, 0.35), c]), OUT, Math.max(1, R * 0.05));
    x.beginPath(); x.moveTo(hx + R * 0.15, hy - R * 0.15); x.lineTo(hx + R * 0.75, hy + R * 0.0); x.lineTo(hx + R * 0.7, hy + R * 0.15); x.lineTo(hx + R * 0.15, hy + R * 0.22); x.closePath(); fs(x, c, OUT, Math.max(1, R * 0.04));
    circ(x, hx + R * 0.62, hy + R * 0.03, R * 0.05, '#2a0a0a');
    x.beginPath(); x.ellipse(hx + R * 0.05, hy - R * 0.08, R * 0.11, R * 0.08, 0, 0, TAU); fs(x, '#ffe27a', null); circ(x, hx + R * 0.08, hy - R * 0.08, R * 0.04, '#2a0a0a');
    wingP(1, false);
  }
  function lich(x, R, p) {
    const robe = '#3a2a5a', dk = '#1e1430', trim = '#b38aff';
    const s1 = Math.sin(p), fl = Math.sin(p) * R * 0.1;
    x.save(); x.translate(0, -R * 0.25 + fl);
    // 法杖（後）
    limb(x, -R * 0.9, -R * 0.2, -R * 0.95, -R * 3.0, R * 0.1, '#5a3a22');
    // 長袍（下擺破爛）
    x.beginPath(); x.moveTo(-R * 1.0, -R * 0.1);
    for (let i = 0; i <= 8; i++) x.lineTo(-R * 1.0 + i * R * 0.25, -R * 0.1 + (i % 2 ? -R * 0.25 : R * 0.12) + Math.sin(p * 2 + i) * R * 0.06);
    x.lineTo(R * 0.6, -R * 2.0); x.lineTo(-R * 0.6, -R * 2.0); x.closePath();
    fs(x, lgrad(x, -R, 0, R, 0, [shade(robe, 0.2), robe, dk]), OUT, Math.max(1, R * 0.05));
    x.strokeStyle = trim; x.lineWidth = Math.max(1, R * 0.07); x.beginPath(); x.moveTo(0, -R * 2.0); x.lineTo(R * 0.05, -R * 0.2); x.stroke();
    // 肩甲
    for (const sd of [-1, 1]) { x.beginPath(); x.ellipse(sd * R * 0.55, -R * 1.95, R * 0.35, R * 0.22, sd * 0.3, 0, TAU); fs(x, '#5a4a7a', OUT, Math.max(1, R * 0.04)); poly(x, [sd * R * 0.6, -R * 2.1, sd * R * 0.85, -R * 2.5, sd * R * 0.8, -R * 2.05], '#d8d0e8'); }
    // 頭骨
    x.beginPath(); x.arc(R * 0.05, -R * 2.4, R * 0.42, 0, TAU); fs(x, rgrad(x, -R * 0.1, -R * 2.55, 0, R * 0.5, ['#ffffff', '#e8e3d2', '#a8a090']), OUT, Math.max(1, R * 0.05));
    rrect(x, -R * 0.12, -R * 2.18, R * 0.38, R * 0.2, R * 0.06); fs(x, '#e8e3d2', OUT, Math.max(1, R * 0.04));
    circ(x, -R * 0.08, -R * 2.42, R * 0.12, '#1a0a2a'); circ(x, R * 0.22, -R * 2.42, R * 0.12, '#1a0a2a');
    x.save(); x.shadowColor = '#7dffb0'; x.shadowBlur = R * 0.3; circ(x, -R * 0.06, -R * 2.42, R * 0.06, '#7dffb0'); circ(x, R * 0.24, -R * 2.42, R * 0.06, '#7dffb0'); x.restore();
    // 王冠
    x.beginPath(); x.moveTo(-R * 0.4, -R * 2.62); x.lineTo(-R * 0.42, -R * 3.0); x.lineTo(-R * 0.22, -R * 2.8); x.lineTo(R * 0.05, -R * 3.15); x.lineTo(R * 0.3, -R * 2.8); x.lineTo(R * 0.5, -R * 3.0); x.lineTo(R * 0.48, -R * 2.62); x.closePath();
    fs(x, lgrad(x, 0, -R * 3.1, 0, -R * 2.6, ['#e8d0ff', trim, '#6a4ab8']), OUT, Math.max(1, R * 0.04));
    circ(x, R * 0.05, -R * 2.78, R * 0.06, '#7dffb0');
    // 前手（骨爪）
    limb(x, R * 0.45, -R * 1.8, R * 0.85 + s1 * R * 0.1, -R * 1.4, R * 0.18, robe);
    circ(x, R * 0.92 + s1 * R * 0.1, -R * 1.38, R * 0.1, '#e8e3d2');
    x.restore();
  }

  function drawKind(x, k, R, p) {
    switch (k) {
      case 'slime': return slime(x, R, p, '#5fcf55');
      case 'mini': return slime(x, R, p, '#ff9fd0');
      case 'splitter': return slime(x, R, p, '#ff6fb5', true);
      case 'runner': return runner(x, R, p);
      case 'beetle': return beetle(x, R, p);
      case 'bat': return bat(x, R, p, false);
      case 'gargoyle': return bat(x, R, p, true);
      case 'golem': return golem(x, R, p);
      case 'healer': return healer(x, R, p);
      case 'shield': return knight(x, R, p);
      case 'ogre': return ogre(x, R, p);
      case 'skeleton': return skeleton(x, R, p);
      case 'bossGolem': return bossGolem(x, R, p);
      case 'bossDragon': return dragon(x, R, p);
      case 'bossLich': return lich(x, R, p);
    }
  }
  // 取得某一格動畫的快取圖。v: 0 正常、1 閃白、2 冰藍
  function frame(k, R, f, v, dpr) {
    const B = BOX[k] || BOX.slime;
    const Rq = Math.round(R * 4) / 4;
    const base = Gfx.sprite(`en:${k}:${Rq}:${f}`, B.w * Rq, B.h * Rq, B.w * Rq / 2, B.ay * Rq, dpr, x => drawKind(x, k, Rq, f / FR * TAU), Math.max(1, Rq * 0.07));
    if (!v) return base;
    if (v === 1) return Gfx.tinted(base, `en:${k}:${Rq}:${f}:w@${dpr}`, '#ffffff', 0.85);
    return Gfx.tinted(base, `en:${k}:${Rq}:${f}:i@${dpr}`, '#8fd8ff', 0.5);
  }
  const visR = (k, r, s) => r * s * ((BOX[k] || BOX.slime).vis);
  return { FR, BOX, frame, visR, drawKind };
})();
