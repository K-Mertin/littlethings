'use strict';
// 守塔奇兵：英雄美術。三位英雄各有 待機／走路／攻擊／施法 四組動畫，每格畫好後快取成圖。
// 原點 = 腳底中心、面向右；R = 體型單位（全身約 2.7R 高）。

const HeroArt = (() => {
  const { TAU, shade, rgba, ell, circ, rrect, poly, lgrad, rgrad } = Gfx;
  const OUT = 'rgba(28,18,34,.9)';
  const SKIN = '#f6cfa6', SKIN_D = '#d9a57a';
  const FR = { idle: 8, walk: 8, atk: 6, cast: 6 };
  const BOX = { w: 4.6, h: 4.9, ay: 4.0, top: 3.55 };
  function fs(x, f, s, w) { x.fillStyle = f; x.fill(); if (s) { x.strokeStyle = s; x.lineWidth = w; x.stroke(); } }
  function limb(x, x0, y0, x1, y1, w, c) {
    x.lineCap = 'round';
    x.strokeStyle = OUT; x.lineWidth = w + 2; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.strokeStyle = c; x.lineWidth = w; x.stroke();
    x.lineCap = 'butt';
  }
  function leg(x, R, hx, sw, lift, c, boot) {
    const fx = hx + sw * R * 0.42, fy = -lift;
    limb(x, hx, -R * 0.78, (hx + fx) / 2 + R * 0.02, -R * 0.4 - lift * 0.5, R * 0.2, c);
    limb(x, (hx + fx) / 2 + R * 0.02, -R * 0.4 - lift * 0.5, fx, fy - R * 0.1, R * 0.19, c);
    rrect(x, fx - R * 0.13, fy - R * 0.2, R * 0.34, R * 0.2, R * 0.08); fs(x, boot, OUT, Math.max(1, R * 0.05));
  }
  // 大眼睛的臉（面向右）
  function face(x, R, hy, blink) {
    const cx = R * 0.06;
    x.beginPath(); x.arc(cx, hy, R * 0.52, 0, TAU);
    fs(x, rgrad(x, cx + R * 0.1, hy - R * 0.15, R * 0.05, R * 0.6, ['#ffe2c4', SKIN, SKIN_D]), OUT, Math.max(1, R * 0.06));
    // 腮紅
    ell(x, cx + R * 0.36, hy + R * 0.18, R * 0.1, R * 0.06, 'rgba(255,120,110,.45)');
    for (const ex of [cx + R * 0.14, cx + R * 0.38]) {
      if (blink) { x.strokeStyle = '#2a1a22'; x.lineWidth = Math.max(1, R * 0.05); x.beginPath(); x.moveTo(ex - R * 0.07, hy + R * 0.02); x.lineTo(ex + R * 0.07, hy + R * 0.02); x.stroke(); continue; }
      x.beginPath(); x.ellipse(ex, hy, R * 0.075, R * 0.11, 0, 0, TAU); x.fillStyle = '#2a1a22'; x.fill();
      circ(x, ex + R * 0.02, hy - R * 0.04, R * 0.032, '#ffffff');
    }
    x.strokeStyle = '#8a3a2a'; x.lineWidth = Math.max(1, R * 0.04); x.beginPath(); x.arc(cx + R * 0.3, hy + R * 0.2, R * 0.06, 0.2, Math.PI - 0.2); x.stroke();
  }

  // ───────── 騎士 雷歐 ─────────
  function knight(x, R, a, u, ph) {
    const steel = '#c8d2e2', steelD = '#7a869c', blue = '#3a68d8', gold = '#f2c14e';
    const walk = a === 'walk', bob = walk ? Math.abs(Math.sin(ph)) * R * 0.08 : Math.sin(ph) * R * 0.03;
    const sw = walk ? Math.sin(ph) : 0;
    // 披風
    const fl = walk ? Math.sin(ph * 2) * R * 0.08 : Math.sin(ph) * R * 0.04;
    x.beginPath(); x.moveTo(-R * 0.25, -R * 1.62 - bob); x.quadraticCurveTo(-R * 0.95 + fl, -R * 1.0, -R * 0.85 + fl * 1.5, -R * 0.35); x.lineTo(-R * 0.1, -R * 0.6); x.closePath();
    fs(x, lgrad(x, -R, 0, 0, 0, ['#1e3a8a', blue]), OUT, Math.max(1, R * 0.05));
    leg(x, R, -R * 0.14, -sw, walk ? Math.max(0, -Math.sin(ph)) * R * 0.15 : 0, steelD, '#4a3a30');
    leg(x, R, R * 0.14, sw, walk ? Math.max(0, Math.sin(ph)) * R * 0.15 : 0, '#8a96ac', '#5a4a3a');
    x.save(); x.translate(0, -bob);
    // 劍的角度
    let sa = -0.5;
    if (a === 'atk') sa = u < 0.35 ? -0.5 - u / 0.35 * 1.6 : -2.1 + Math.min(1, (u - 0.35) / 0.3) * 3.2;
    if (a === 'cast') sa = -0.4 + u * TAU * 1.0;
    // 盾（後手）
    const shx = a === 'cast' ? R * 0.1 : -R * 0.05;
    // 身體（胸甲）
    rrect(x, -R * 0.45, -R * 1.68, R * 0.9, R * 0.98, R * 0.3);
    fs(x, lgrad(x, -R * 0.45, 0, R * 0.45, 0, ['#e8eef8', steel, steelD]), OUT, Math.max(1, R * 0.06));
    x.fillStyle = blue; x.fillRect(-R * 0.42, -R * 1.02, R * 0.84, R * 0.14);
    circ(x, 0, -R * 0.95, R * 0.08, gold);
    x.strokeStyle = gold; x.lineWidth = Math.max(1, R * 0.05); x.beginPath(); x.moveTo(-R * 0.3, -R * 1.6); x.lineTo(0, -R * 1.35); x.lineTo(R * 0.3, -R * 1.6); x.stroke();
    // 頭（頭盔）
    const hy = -R * 2.12;
    face(x, R, hy, a === 'idle' && Math.floor(ph / TAU * 8) === 5);
    x.beginPath(); x.arc(R * 0.06, hy, R * 0.58, Math.PI * 1.02, Math.PI * 1.98); x.lineTo(R * 0.64, hy - R * 0.02); x.lineTo(R * 0.6, hy - R * 0.12); x.lineTo(-R * 0.15, hy - R * 0.18); x.lineTo(-R * 0.5, hy + R * 0.3); x.lineTo(-R * 0.55, hy - R * 0.02); x.closePath();
    fs(x, lgrad(x, -R * 0.5, hy - R * 0.6, R * 0.6, hy, ['#ffffff', steel, steelD]), OUT, Math.max(1, R * 0.06));
    x.strokeStyle = gold; x.lineWidth = Math.max(1, R * 0.06); x.beginPath(); x.arc(R * 0.06, hy, R * 0.58, Math.PI * 1.25, Math.PI * 1.75); x.stroke();
    // 羽飾
    const pf = Math.sin(ph * (walk ? 2 : 1)) * R * 0.06;
    x.beginPath(); x.moveTo(R * 0.0, hy - R * 0.55); x.quadraticCurveTo(-R * 0.5, hy - R * 1.15 + pf, -R * 0.95, hy - R * 0.55 + pf); x.quadraticCurveTo(-R * 0.5, hy - R * 0.8, -R * 0.12, hy - R * 0.42); x.closePath();
    fs(x, lgrad(x, 0, hy - R, 0, hy - R * 0.4, ['#ff7a6a', '#d8283a']), OUT, Math.max(1, R * 0.05));
    // 盾
    x.save(); x.translate(shx - R * 0.42, -R * 1.2);
    x.beginPath(); x.moveTo(-R * 0.3, -R * 0.38); x.lineTo(R * 0.3, -R * 0.38); x.lineTo(R * 0.3, R * 0.05); x.quadraticCurveTo(R * 0.26, R * 0.36, 0, R * 0.5); x.quadraticCurveTo(-R * 0.26, R * 0.36, -R * 0.3, R * 0.05); x.closePath();
    fs(x, lgrad(x, -R * 0.3, 0, R * 0.3, 0, ['#ffe9a0', gold, '#b8862a']), OUT, Math.max(1, R * 0.06));
    x.beginPath(); x.moveTo(-R * 0.19, -R * 0.27); x.lineTo(R * 0.19, -R * 0.27); x.lineTo(R * 0.19, R * 0.03); x.quadraticCurveTo(0, R * 0.36, -R * 0.19, R * 0.03); x.closePath(); fs(x, blue, null);
    Gfx.star(x, 0, -R * 0.05, R * 0.13, '#ffe9a0', false);
    x.restore();
    // 劍（前手）
    x.save(); x.translate(R * 0.38, -R * 1.25); x.rotate(sa);
    rrect(x, -R * 0.06, -R * 0.12, R * 0.3, R * 0.24, R * 0.06); fs(x, '#6a4a2a', OUT, Math.max(1, R * 0.04));
    rrect(x, R * 0.2, -R * 0.22, R * 0.09, R * 0.44, R * 0.03); fs(x, gold, OUT, Math.max(1, R * 0.04));
    x.beginPath(); x.moveTo(R * 0.29, -R * 0.09); x.lineTo(R * 1.38, -R * 0.07); x.lineTo(R * 1.55, 0); x.lineTo(R * 1.38, R * 0.07); x.lineTo(R * 0.29, R * 0.09); x.closePath();
    fs(x, lgrad(x, 0, -R * 0.09, 0, R * 0.09, ['#ffffff', '#d8e2f0', '#8a96ac']), OUT, Math.max(1, R * 0.05));
    x.strokeStyle = 'rgba(120,150,200,.6)'; x.lineWidth = Math.max(1, R * 0.03); x.beginPath(); x.moveTo(R * 0.35, 0); x.lineTo(R * 1.3, 0); x.stroke();
    circ(x, 0, 0, R * 0.12, SKIN); x.strokeStyle = OUT; x.lineWidth = Math.max(1, R * 0.04); x.stroke();
    x.restore();
    x.restore();
  }

  // ───────── 遊俠 小嵐 ─────────
  function ranger(x, R, a, u, ph) {
    const green = '#3f9a5a', greenD = '#25683a', leather = '#8a5a32';
    const walk = a === 'walk', bob = walk ? Math.abs(Math.sin(ph)) * R * 0.08 : Math.sin(ph) * R * 0.03;
    const sw = walk ? Math.sin(ph) : 0;
    // 斗篷
    const fl = walk ? Math.sin(ph * 2) * R * 0.1 : Math.sin(ph) * R * 0.05;
    x.beginPath(); x.moveTo(-R * 0.2, -R * 1.65 - bob); x.quadraticCurveTo(-R * 0.9 + fl, -R * 1.1, -R * 0.75 + fl * 1.6, -R * 0.5); x.lineTo(-R * 0.55 + fl, -R * 0.62); x.lineTo(-R * 0.4 + fl, -R * 0.45); x.lineTo(-R * 0.05, -R * 0.75); x.closePath();
    fs(x, lgrad(x, -R, 0, 0, 0, [greenD, green]), OUT, Math.max(1, R * 0.05));
    leg(x, R, -R * 0.12, -sw, walk ? Math.max(0, -Math.sin(ph)) * R * 0.15 : 0, '#5a4a3a', '#5a3a22');
    leg(x, R, R * 0.12, sw, walk ? Math.max(0, Math.sin(ph)) * R * 0.15 : 0, '#6a5a48', '#6a4a2a');
    x.save(); x.translate(0, -bob);
    // 箭袋
    x.save(); x.translate(-R * 0.38, -R * 1.35); x.rotate(-0.35);
    rrect(x, -R * 0.13, -R * 0.45, R * 0.26, R * 0.7, R * 0.08); fs(x, leather, OUT, Math.max(1, R * 0.05));
    for (let i = 0; i < 3; i++) { x.fillStyle = ['#e5484d', '#ffffff', '#ffd36b'][i]; x.fillRect(-R * 0.1 + i * R * 0.07, -R * 0.62, R * 0.05, R * 0.18); }
    x.restore();
    // 身體
    rrect(x, -R * 0.4, -R * 1.62, R * 0.8, R * 0.95, R * 0.28);
    fs(x, lgrad(x, -R * 0.4, 0, R * 0.4, 0, [shade(green, 0.25), green, greenD]), OUT, Math.max(1, R * 0.06));
    x.fillStyle = leather; x.fillRect(-R * 0.38, -R * 1.0, R * 0.76, R * 0.12);
    x.strokeStyle = leather; x.lineWidth = Math.max(1, R * 0.08); x.beginPath(); x.moveTo(-R * 0.3, -R * 1.55); x.lineTo(R * 0.3, -R * 1.05); x.stroke();
    circ(x, 0, -R * 0.94, R * 0.06, '#ffd36b');
    // 頭
    const hy = -R * 2.08;
    // 馬尾
    const pt = Math.sin(ph * (walk ? 2 : 1)) * R * 0.08;
    x.beginPath(); x.moveTo(-R * 0.35, hy - R * 0.25); x.quadraticCurveTo(-R * 0.95, hy - R * 0.1 + pt, -R * 0.85, hy + R * 0.55 + pt); x.quadraticCurveTo(-R * 0.6, hy + R * 0.1, -R * 0.3, hy + R * 0.05); x.closePath();
    fs(x, '#c8642a', OUT, Math.max(1, R * 0.05));
    face(x, R, hy, a === 'idle' && Math.floor(ph / TAU * 8) === 3);
    // 頭髮瀏海
    x.beginPath(); x.arc(R * 0.06, hy, R * 0.55, Math.PI * 1.05, Math.PI * 1.9); x.quadraticCurveTo(R * 0.4, hy - R * 0.2, R * 0.15, hy - R * 0.28); x.quadraticCurveTo(-R * 0.1, hy - R * 0.1, -R * 0.45, hy + R * 0.15); x.closePath();
    fs(x, lgrad(x, 0, hy - R * 0.6, 0, hy, ['#ff9a4a', '#c8642a']), OUT, Math.max(1, R * 0.05));
    // 兜帽（推到後面）
    x.beginPath(); x.arc(-R * 0.15, hy + R * 0.05, R * 0.55, Math.PI * 0.55, Math.PI * 1.3); x.quadraticCurveTo(-R * 0.3, hy + R * 0.3, -R * 0.05, hy + R * 0.48); x.closePath();
    fs(x, greenD, OUT, Math.max(1, R * 0.05));
    // 羽毛髮飾
    x.beginPath(); x.moveTo(R * 0.25, hy - R * 0.45); x.quadraticCurveTo(R * 0.45, hy - R * 1.0, R * 0.1, hy - R * 1.05); x.quadraticCurveTo(R * 0.25, hy - R * 0.75, R * 0.12, hy - R * 0.48); x.closePath();
    fs(x, '#ffffff', OUT, Math.max(1, R * 0.04));
    // 弓
    let pull = 0, aim = -0.08;
    if (a === 'atk') pull = u < 0.6 ? u / 0.6 : 1 - (u - 0.6) / 0.4 * 1.2;
    if (a === 'cast') { aim = -0.9; pull = u < 0.5 ? u / 0.5 : 0; }
    pull = clamp(pull, 0, 1);
    x.save(); x.translate(R * 0.2, -R * 1.32); x.rotate(aim);
    const br = R * 0.85, bx = R * 0.55;
    // 拉弓的手臂
    limb(x, 0, 0, bx - R * 0.15 - pull * R * 0.45, 0, R * 0.14, green);
    limb(x, -R * 0.1, R * 0.05, bx, 0, R * 0.14, green);
    x.strokeStyle = OUT; x.lineWidth = Math.max(2, R * 0.14); x.beginPath(); x.arc(bx - br * 0.6, 0, br, -0.95, 0.95); x.stroke();
    x.strokeStyle = '#a86a32'; x.lineWidth = Math.max(1.2, R * 0.08); x.stroke();
    x.strokeStyle = '#ffd36b'; x.lineWidth = Math.max(1, R * 0.05); x.beginPath(); x.arc(bx - br * 0.6, 0, br, -0.15, 0.15); x.stroke();
    const ex = bx - br * 0.6 + Math.cos(0.95) * br, ey = Math.sin(0.95) * br, hx = ex - R * 0.1 - pull * R * 0.5;
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = Math.max(1, R * 0.03); x.beginPath(); x.moveTo(ex, -ey); x.lineTo(hx, 0); x.lineTo(ex, ey); x.stroke();
    if (pull > 0.15 || a === 'idle' || a === 'walk') {
      x.strokeStyle = '#6b4a2a'; x.lineWidth = Math.max(1, R * 0.05); x.beginPath(); x.moveTo(hx, 0); x.lineTo(bx + R * 0.35, 0); x.stroke();
      poly(x, [bx + R * 0.48, 0, bx + R * 0.3, -R * 0.07, bx + R * 0.3, R * 0.07], '#e8eef8');
    }
    circ(x, bx, 0, R * 0.1, SKIN); circ(x, hx, 0, R * 0.1, SKIN);
    x.restore();
    x.restore();
  }

  // ───────── 法師 露米 ─────────
  function mage(x, R, a, u, ph) {
    const robe = '#6a3ac8', robeD = '#3e1f84', gold = '#f2c14e';
    const walk = a === 'walk', bob = walk ? Math.abs(Math.sin(ph)) * R * 0.06 : Math.sin(ph) * R * 0.05;
    const sw = walk ? Math.sin(ph) : 0;
    // 腳（長袍下）
    for (const [hx, s, c] of [[-R * 0.15, -sw, '#3a2a48'], [R * 0.15, sw, '#4a3a58']]) { const fx = hx + s * R * 0.3; rrect(x, fx - R * 0.14, -R * 0.2, R * 0.34, R * 0.2, R * 0.08); fs(x, c, OUT, Math.max(1, R * 0.05)); }
    x.save(); x.translate(0, -bob);
    // 長袍
    const sk = walk ? Math.sin(ph) * R * 0.08 : 0;
    x.beginPath(); x.moveTo(-R * 0.32, -R * 1.62); x.lineTo(R * 0.32, -R * 1.62); x.quadraticCurveTo(R * 0.55, -R * 0.8, R * 0.62 + sk, -R * 0.15); x.quadraticCurveTo(0, -R * 0.02, -R * 0.62 + sk, -R * 0.15); x.quadraticCurveTo(-R * 0.55, -R * 0.8, -R * 0.32, -R * 1.62); x.closePath();
    fs(x, lgrad(x, -R * 0.6, 0, R * 0.6, 0, [shade(robe, 0.25), robe, robeD]), OUT, Math.max(1, R * 0.06));
    x.strokeStyle = gold; x.lineWidth = Math.max(1, R * 0.06); x.beginPath(); x.moveTo(-R * 0.6 + sk, -R * 0.2); x.quadraticCurveTo(0, -R * 0.07, R * 0.6 + sk, -R * 0.2); x.stroke();
    for (const [sx, sy] of [[-0.25, -0.6], [0.2, -0.9], [0.32, -0.42], [-0.1, -1.2]]) Gfx.star(x, sx * R, sy * R, R * 0.07, '#ffe9a0', false);
    x.fillStyle = gold; x.fillRect(-R * 0.36, -R * 1.18, R * 0.72, R * 0.1);
    // 頭
    const hy = -R * 2.05;
    // 長髮（後）
    x.beginPath(); x.moveTo(-R * 0.45, hy - R * 0.1); x.quadraticCurveTo(-R * 0.7, hy + R * 0.6, -R * 0.45, hy + R * 0.85); x.lineTo(-R * 0.05, hy + R * 0.5); x.closePath();
    fs(x, '#bfe0ff', OUT, Math.max(1, R * 0.05));
    face(x, R, hy, a === 'idle' && Math.floor(ph / TAU * 8) === 6);
    x.beginPath(); x.arc(R * 0.06, hy, R * 0.55, Math.PI * 1.0, Math.PI * 1.85); x.quadraticCurveTo(R * 0.3, hy - R * 0.3, -R * 0.05, hy - R * 0.25); x.quadraticCurveTo(-R * 0.3, hy - R * 0.05, -R * 0.5, hy + R * 0.3); x.closePath();
    fs(x, lgrad(x, 0, hy - R * 0.6, 0, hy, ['#ffffff', '#bfe0ff']), OUT, Math.max(1, R * 0.05));
    // 巫師帽
    const tw = Math.sin(ph) * R * 0.08;
    x.beginPath(); x.moveTo(-R * 0.85, hy - R * 0.32); x.quadraticCurveTo(R * 0.06, hy - R * 0.62, R * 0.95, hy - R * 0.32); x.quadraticCurveTo(R * 0.06, hy - R * 0.2, -R * 0.85, hy - R * 0.32); x.closePath();
    fs(x, robeD, OUT, Math.max(1, R * 0.06));
    x.beginPath(); x.moveTo(-R * 0.45, hy - R * 0.42); x.quadraticCurveTo(-R * 0.2, hy - R * 1.2, R * 0.1, hy - R * 1.45); x.quadraticCurveTo(-R * 0.5 + tw, hy - R * 1.6, -R * 0.75 + tw, hy - R * 1.3); x.quadraticCurveTo(R * 0.2, hy - R * 1.0, R * 0.55, hy - R * 0.42); x.closePath();
    fs(x, lgrad(x, -R * 0.5, 0, R * 0.5, 0, [shade(robe, 0.2), robe, robeD]), OUT, Math.max(1, R * 0.06));
    x.fillStyle = gold; x.beginPath(); x.moveTo(-R * 0.44, hy - R * 0.48); x.quadraticCurveTo(R * 0.06, hy - R * 0.62, R * 0.54, hy - R * 0.48); x.lineTo(R * 0.5, hy - R * 0.6); x.quadraticCurveTo(R * 0.06, hy - R * 0.74, -R * 0.4, hy - R * 0.6); x.closePath(); x.fill();
    Gfx.star(x, -R * 0.75 + tw, hy - R * 1.3, R * 0.12, '#ffe27a', false);
    // 法杖
    let sa = 0.15;
    if (a === 'atk') sa = u < 0.4 ? 0.15 - u / 0.4 * 0.7 : -0.55 + (u - 0.4) / 0.6 * 0.7;
    if (a === 'cast') sa = -0.2 - Math.sin(u * Math.PI) * 0.5;
    const lift = a === 'cast' ? Math.sin(u * Math.PI) * R * 0.45 : 0;
    x.save(); x.translate(R * 0.42, -R * 1.25 - lift); x.rotate(sa);
    limb(x, -R * 0.35, R * 0.05, 0, 0, R * 0.16, robe);
    x.strokeStyle = OUT; x.lineWidth = Math.max(2, R * 0.16); x.beginPath(); x.moveTo(0, R * 1.15); x.lineTo(0, -R * 0.95); x.stroke();
    x.strokeStyle = '#8a5a32'; x.lineWidth = Math.max(1, R * 0.09); x.stroke();
    x.strokeStyle = gold; x.lineWidth = Math.max(1, R * 0.07); x.beginPath(); x.arc(0, -R * 1.15, R * 0.24, Math.PI * 0.15, Math.PI * 0.85, true); x.stroke();
    poly(x, [0, -R * 1.48, R * 0.16, -R * 1.2, 0, -R * 0.95, -R * 0.16, -R * 1.2], '#d8c0ff');
    x.strokeStyle = OUT; x.lineWidth = Math.max(1, R * 0.04); x.stroke();
    poly(x, [0, -R * 1.48, R * 0.16, -R * 1.2, 0, -R * 1.2], '#ffffff');
    circ(x, 0, 0, R * 0.1, SKIN);
    x.restore();
    x.restore();
  }

  function drawKind(x, id, R, a, u, ph) {
    if (id === 'knight') knight(x, R, a, u, ph);
    else if (id === 'ranger') ranger(x, R, a, u, ph);
    else mage(x, R, a, u, ph);
  }
  // 取得一格動畫：anim = idle/walk/atk/cast，f = 第幾格；v=1 受傷閃紅
  function frame(id, R, anim, f, dpr, v) {
    const Rq = Math.round(R * 4) / 4, n = FR[anim];
    f = ((f % n) + n) % n;
    const sp = Gfx.sprite(`hero:${id}:${Rq}:${anim}:${f}`, BOX.w * Rq, BOX.h * Rq, BOX.w * Rq / 2, BOX.ay * Rq, dpr,
      x => drawKind(x, id, Rq, anim, f / (n - 1), f / n * TAU), Math.max(1, Rq * 0.08), Math.max(0.8, Rq * 0.07));
    if (!v) return sp;
    return Gfx.tinted(sp, `hero:${id}:${Rq}:${anim}:${f}:r@${dpr}`, '#ff4a4a', 0.55);
  }
  // 頭像（圓形徽章）
  const pcache = {};
  function portrait(id, S) {
    const k = id + ':' + S;
    if (pcache[k]) return pcache[k];
    const c = Gfx.canvas(S, S), x = c.getContext('2d');
    const d = HEROES[id];
    x.fillStyle = rgrad(x, S / 2, S * 0.4, S * 0.05, S * 0.6, [shade(d.color, 0.45), d.color, shade(d.color, -0.45)]);
    x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, TAU); x.fill();
    x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 1, 0, TAU); x.clip();
    const R = S * 0.36;
    x.translate(S * 0.52, S * 1.42);
    drawKind(x, id, R, 'idle', 0, 0.3);
    x.restore();
    return (pcache[k] = c.toDataURL());
  }
  // 全身立繪（選英雄畫面用）
  function standee(id, S, anim) {
    const c = Gfx.canvas(S, S), x = c.getContext('2d');
    const R = S * 0.22;
    x.translate(S * 0.5, S * 0.86);
    ell(x, 0, 0, R * 0.9, R * 0.25, 'rgba(0,0,0,.3)');
    drawKind(x, id, R, anim || 'idle', 0.5, 0.3);
    return c;
  }
  return { FR, BOX, frame, portrait, standee, drawKind };
})();
