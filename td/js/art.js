'use strict';
// 守塔奇兵：防禦塔、城堡、傳送門的美術。
// 每座塔分成「靜態塔身」（快取成圖）和「會動的部分」（弓箭手、砲管、水晶…每幀畫）。
// 原點 = 塔腳底中心，u = 一格的像素大小。

const Art = (() => {
  const { TAU, shade, mix, rgba, ell, circ, rrect, poly, lgrad, rgrad } = Gfx;
  const OUT = 'rgba(30,20,32,.85)';
  // 每種塔「發射點」的高度（跟模擬的 TOP_H 對齊，畫面高度比例 0.9）
  const HS = 0.9;
  const topH = (k, tier) => TOP_H[k] * (1 + tier * 0.08) * HS;

  // ───────── 共用零件 ─────────
  function lw(u, f) { return Math.max(1, u * (f || 0.018)); }
  function fs(ctx, fill, stroke, w) { ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.stroke(); } }
  // 建地：Lv1 夯土、Lv2 石圈、Lv3+ 切石平台加金邊
  function plot(x, u, tier, tint) {
    const rx = u * 0.46, ry = u * 0.2;
    ell(x, u * 0.03, u * 0.06, rx * 1.12, ry * 1.15, 'rgba(0,0,0,.22)');
    if (tier === 0) {
      ell(x, 0, u * 0.02, rx, ry, '#8a6a46'); ell(x, 0, 0, rx * 0.96, ry * 0.92, '#a98458');
      const r = mkRng(5);
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; const px = Math.cos(a) * rx * 0.88, py = Math.sin(a) * ry * 0.85; ell(x, px, py + u * 0.01, u * 0.05, u * 0.03, '#7d6a58'); ell(x, px, py, u * 0.045, u * 0.025, shade('#b3a594', r() * 0.2 - 0.1)); }
      return;
    }
    const st = tint || '#b8b0a2';
    // 側面
    x.beginPath(); x.ellipse(0, u * 0.05, rx, ry, 0, 0, Math.PI); x.lineTo(-rx, 0); x.ellipse(0, 0, rx, ry, 0, Math.PI, 0, true); x.closePath();
    fs(x, shade(st, -0.32), OUT, lw(u));
    // 頂面
    x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, TAU); fs(x, lgrad(x, -rx, -ry, rx, ry, [shade(st, 0.18), st, shade(st, -0.12)]), OUT, lw(u));
    // 石板縫
    x.strokeStyle = rgba('#000000', 0.18); x.lineWidth = lw(u, 0.012);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.2; x.beginPath(); x.moveTo(Math.cos(a) * rx * 0.55, Math.sin(a) * ry * 0.55); x.lineTo(Math.cos(a) * rx * 0.98, Math.sin(a) * ry * 0.98); x.stroke(); }
    x.beginPath(); x.ellipse(0, 0, rx * 0.55, ry * 0.55, 0, 0, TAU); x.stroke();
    // 側面石塊
    x.strokeStyle = rgba('#000000', 0.25);
    for (let i = 1; i < 8; i++) { const a = i / 8 * Math.PI; const px = Math.cos(a) * rx; x.beginPath(); x.moveTo(px, Math.sin(a) * ry); x.lineTo(px, Math.sin(a) * ry + u * 0.05); x.stroke(); }
    if (tier >= 2) {
      x.strokeStyle = '#e8b84a'; x.lineWidth = lw(u, 0.022);
      x.beginPath(); x.ellipse(0, u * 0.025, rx * 1.0, ry * 1.0, 0, 0.12, Math.PI - 0.12); x.stroke();
      for (const a of [0.5, 1.57, 2.64]) circ(x, Math.cos(a) * rx, Math.sin(a) * ry + u * 0.025, u * 0.018, '#ffe08a');
    }
  }
  // 磚牆紋理（在已裁切的區域內）
  function bricks(x, x0, y0, w, h, rh, base, seed, jitter) {
    const r = mkRng(seed || 3);
    for (let row = 0, y = y0; y < y0 + h; row++, y += rh) {
      let bx = x0 - (row % 2 ? rh * 0.9 : 0);
      while (bx < x0 + w) {
        const bw = rh * (1.6 + r() * 0.6);
        x.fillStyle = shade(base, (r() - 0.5) * (jitter || 0.16));
        x.fillRect(bx + 0.5, y + 0.5, bw - 1, rh - 1);
        bx += bw;
      }
    }
  }
  // 圓柱塔身：底在 yb，高 h，半徑 r。tex: 'brick' | 'wood' | 'plain'
  function cyl(x, yb, r, h, base, u, tex, seed) {
    const ry = r * 0.36;
    x.save();
    x.beginPath(); x.moveTo(-r, yb - h); x.lineTo(-r, yb); x.ellipse(0, yb, r, ry, 0, Math.PI, 0, true); x.lineTo(r, yb - h); x.ellipse(0, yb - h, r, ry, 0, 0, Math.PI, false); x.closePath();
    x.fillStyle = base; x.fill();
    x.clip();
    if (tex === 'brick') bricks(x, -r, yb - h - ry, r * 2, h + ry * 2, u * 0.075, base, seed);
    else if (tex === 'wood') {
      const n = Math.max(5, Math.round(r / (u * 0.06)));
      for (let i = 0; i < n; i++) { const a = Math.PI - (i + 0.5) / n * Math.PI; const px = Math.cos(a) * r; x.fillStyle = shade(base, ((i * 7) % 5) * 0.03 - 0.06); x.fillRect(px - r / n, yb - h - ry, r * 2 / n + 1, h + ry * 2); }
      x.strokeStyle = rgba('#000000', 0.3); x.lineWidth = lw(u, 0.01);
      for (let i = 1; i < n; i++) { const a = Math.PI - i / n * Math.PI; const px = Math.cos(a) * r; x.beginPath(); x.moveTo(px, yb - h); x.lineTo(px, yb + Math.sin(Math.acos(px / r)) * ry); x.stroke(); }
    }
    // 明暗
    x.fillStyle = lgrad(x, -r, 0, r, 0, [[0, 'rgba(255,255,255,.22)'], [0.35, 'rgba(255,255,255,0)'], [0.7, 'rgba(0,0,0,.12)'], [1, 'rgba(0,0,0,.38)']]);
    x.fillRect(-r, yb - h - ry, r * 2, h + ry * 2);
    x.fillStyle = lgrad(x, 0, yb - h, 0, yb + ry, [[0, 'rgba(0,0,0,0)'], [0.75, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.25)']]);
    x.fillRect(-r, yb - h - ry, r * 2, h + ry * 2);
    x.restore();
    x.beginPath(); x.moveTo(-r, yb - h); x.lineTo(-r, yb); x.ellipse(0, yb, r, ry, 0, Math.PI, 0, true); x.lineTo(r, yb - h);
    x.strokeStyle = OUT; x.lineWidth = lw(u); x.stroke();
  }
  // 頂部圓盤
  function disk(x, y, r, c, u, edge) {
    const ry = r * 0.36;
    if (edge) { x.beginPath(); x.ellipse(0, y + edge, r, ry, 0, 0, Math.PI); x.lineTo(-r, y); x.ellipse(0, y, r, ry, 0, Math.PI, 0, true); x.closePath(); fs(x, shade(c, -0.3), OUT, lw(u)); }
    x.beginPath(); x.ellipse(0, y, r, ry, 0, 0, TAU); fs(x, lgrad(x, -r, y - ry, r, y + ry, [shade(c, 0.2), c, shade(c, -0.1)]), OUT, lw(u));
  }
  // 城垛：半邊（back=後半圈 / front=前半圈）
  function crenels(x, y, r, h, c, u, part, n) {
    n = n || 8;
    const ry = r * 0.36;
    const list = [];
    for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; list.push(a); }
    list.sort((a, b) => Math.sin(a) - Math.sin(b));
    for (const a of list) {
      const front = Math.sin(a) > 0;
      if ((part === 'front') !== front) continue;
      const px = Math.cos(a) * r * 0.92, py = y + Math.sin(a) * ry * 0.92;
      const w = r * 0.32 * (0.55 + 0.45 * Math.abs(Math.sin(a)));
      rrect(x, px - w / 2, py - h, w, h, u * 0.012);
      fs(x, shade(c, front ? -0.02 + Math.cos(a) * -0.12 : -0.25), OUT, lw(u, 0.014));
      x.fillStyle = rgba('#ffffff', 0.25); x.fillRect(px - w / 2 + 1, py - h + 1, w - 2, u * 0.018);
    }
  }
  // 圓錐屋頂
  function cone(x, yb, r, h, c, u, flare) {
    const ry = r * 0.36;
    x.save();
    x.beginPath(); x.moveTo(0, yb - h); x.quadraticCurveTo(-r * 0.4, yb - h * 0.35, -r * (flare || 1.05), yb); x.ellipse(0, yb, r * (flare || 1.05), ry, 0, Math.PI, 0, true); x.quadraticCurveTo(r * 0.4, yb - h * 0.35, 0, yb - h); x.closePath();
    x.fillStyle = c; x.fill(); x.clip();
    // 瓦片
    x.strokeStyle = rgba('#000000', 0.22); x.lineWidth = lw(u, 0.012);
    for (let i = 1; i < 6; i++) { const yy = yb - h + h * i / 6; const rr = r * i / 6 * 1.05; x.beginPath(); x.ellipse(0, yy, rr, rr * 0.36, 0, 0.05, Math.PI - 0.05); x.stroke(); }
    for (let i = -4; i <= 4; i++) { x.beginPath(); x.moveTo(0, yb - h); x.lineTo(i * r * 0.27, yb + ry); x.stroke(); }
    x.fillStyle = lgrad(x, -r, 0, r, 0, [[0, 'rgba(255,255,255,.3)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.35)']]);
    x.fillRect(-r * 1.2, yb - h, r * 2.4, h + ry * 2);
    x.restore();
    x.beginPath(); x.moveTo(0, yb - h); x.quadraticCurveTo(-r * 0.4, yb - h * 0.35, -r * (flare || 1.05), yb); x.ellipse(0, yb, r * (flare || 1.05), ry, 0, Math.PI, 0, true); x.quadraticCurveTo(r * 0.4, yb - h * 0.35, 0, yb - h); x.closePath();
    x.strokeStyle = OUT; x.lineWidth = lw(u); x.stroke();
  }
  function door(x, cx, yb, w, h, u, c) {
    rrect(x, cx - w / 2, yb - h, w, h, [w / 2, w / 2, 0, 0]); fs(x, c || '#5a3a22', OUT, lw(u, 0.014));
    x.strokeStyle = rgba('#000000', 0.35); x.lineWidth = lw(u, 0.01);
    x.beginPath(); x.moveTo(cx, yb - h + w * 0.2); x.lineTo(cx, yb); x.stroke();
    circ(x, cx + w * 0.22, yb - h * 0.45, u * 0.012, '#e8c060');
  }
  function win(x, cx, cy, w, h, u, glowC) {
    rrect(x, cx - w / 2, cy - h / 2, w, h, [w / 2, w / 2, 0, 0]); fs(x, glowC || '#2a2238', OUT, lw(u, 0.012));
    if (glowC) { x.fillStyle = rgba('#fff7d0', 0.5); x.fillRect(cx - w * 0.25, cy - h * 0.2, w * 0.2, h * 0.5); }
  }
  function goldBand(x, y, r, u) {
    const ry = r * 0.36;
    x.strokeStyle = '#8a5a12'; x.lineWidth = lw(u, 0.04); x.beginPath(); x.ellipse(0, y, r, ry, 0, 0.05, Math.PI - 0.05); x.stroke();
    x.strokeStyle = '#f2c14e'; x.lineWidth = lw(u, 0.022); x.beginPath(); x.ellipse(0, y, r, ry, 0, 0.05, Math.PI - 0.05); x.stroke();
  }
  // 掛旗（垂直長條旗）
  function hangBanner(x, cx, ty, w, h, c, u, emblem) {
    x.beginPath(); x.moveTo(cx - w / 2, ty); x.lineTo(cx + w / 2, ty); x.lineTo(cx + w / 2, ty + h); x.lineTo(cx, ty + h * 0.82); x.lineTo(cx - w / 2, ty + h); x.closePath();
    fs(x, lgrad(x, cx - w / 2, 0, cx + w / 2, 0, [shade(c, 0.15), c, shade(c, -0.25)]), OUT, lw(u, 0.014));
    x.fillStyle = '#f2c14e'; x.fillRect(cx - w / 2, ty, w, Math.max(1.5, u * 0.02));
    if (emblem === 'star') Gfx.star(x, cx, ty + h * 0.4, w * 0.28, '#ffe08a', false);
    else if (emblem === 'circle') circ(x, cx, ty + h * 0.4, w * 0.22, 'rgba(255,255,255,.85)');
    else if (emblem) { x.fillStyle = '#ffe08a'; x.font = `900 ${w * 0.6}px "Noto Sans TC",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emblem, cx, ty + h * 0.4); }
    x.fillStyle = '#6b4a2a'; x.fillRect(cx - w * 0.62, ty - u * 0.015, w * 1.24, u * 0.025);
  }
  function post(x, x0, y0, x1, y1, w, c, u) {
    x.lineCap = 'round';
    x.strokeStyle = OUT; x.lineWidth = w + lw(u) * 2; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.strokeStyle = c; x.lineWidth = w; x.stroke();
    x.strokeStyle = rgba('#ffffff', 0.18); x.lineWidth = w * 0.3; x.beginPath(); x.moveTo(x0 - w * 0.2, y0); x.lineTo(x1 - w * 0.2, y1); x.stroke();
    x.lineCap = 'butt';
  }
  function railing(x, y, r, u, c, part) {
    // 木欄杆（半圈）
    const ry = r * 0.36, a0 = part === 'front' ? 0 : Math.PI, a1 = part === 'front' ? Math.PI : TAU;
    const h = u * 0.09;
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (a1 - a0) * i / 6, px = Math.cos(a) * r, py = y + Math.sin(a) * ry;
      x.fillStyle = OUT; x.fillRect(px - u * 0.018, py - h, u * 0.036, h);
      x.fillStyle = shade(c, -0.1); x.fillRect(px - u * 0.012, py - h + 1, u * 0.024, h - 1);
    }
    x.strokeStyle = OUT; x.lineWidth = u * 0.045; x.beginPath(); x.ellipse(0, y - h, r, ry, 0, a0, a1); x.stroke();
    x.strokeStyle = c; x.lineWidth = u * 0.026; x.stroke();
  }

  // ───────── 角色 ─────────
  const SKIN = '#f6cfa6';
  // Q 版小兵：腳底在 (0,0)、面向右。look：{ c 衣服, hat 帽子種類, hc 帽子顏色, feather, hair }
  // 頭比較大、有眼睛和腮紅，衣服三階明暗，帽子依兵種不同，一眼就分得出來。
  function chibi(x, u, look) {
    const k = u * 1.3, c = look.c || '#4f9a4a', L = lw(u, 0.011);
    // 靴子
    for (const bx of [-0.03, 0.012]) { rrect(x, bx * k, -k * 0.045, k * 0.03, k * 0.045, k * 0.008); fs(x, '#3a2a22', OUT, L); }
    // 斗篷（背後）
    if (look.cape) { x.beginPath(); x.moveTo(-k * 0.04, -k * 0.17); x.quadraticCurveTo(-k * 0.1, -k * 0.1, -k * 0.085, -k * 0.035); x.lineTo(-k * 0.02, -k * 0.06); x.closePath(); fs(x, look.cape, OUT, L); }
    // 身體
    x.beginPath(); x.moveTo(-k * 0.055, -k * 0.04); x.quadraticCurveTo(-k * 0.06, -k * 0.13, -k * 0.042, -k * 0.165); x.lineTo(k * 0.042, -k * 0.165); x.quadraticCurveTo(k * 0.065, -k * 0.13, k * 0.058, -k * 0.04); x.closePath();
    fs(x, lgrad(x, -k * 0.06, 0, k * 0.06, 0, [shade(c, 0.3), c, shade(c, -0.35)]), OUT, L);
    if (look.robe) { x.beginPath(); x.moveTo(-k * 0.06, -k * 0.04); x.lineTo(k * 0.065, -k * 0.04); x.lineTo(k * 0.07, -k * 0.005); x.lineTo(-k * 0.068, -k * 0.005); x.closePath(); fs(x, shade(c, -0.15), OUT, L); }
    x.fillStyle = look.belt || '#5a3a1e'; x.fillRect(-k * 0.055, -k * 0.088, k * 0.112, k * 0.016);
    circ(x, k * 0.005, -k * 0.08, k * 0.008, '#f2c14e');
    // 頭
    const hy = -k * 0.225, hr = k * 0.06;
    if (look.hair) { x.beginPath(); x.arc(-k * 0.01, hy + k * 0.005, hr * 1.05, Math.PI * 0.5, Math.PI * 1.5); x.fillStyle = look.hair; x.fill(); }
    circ(x, 0, hy, hr, rgrad(x, -hr * 0.3, hy - hr * 0.35, hr * 0.1, hr * 1.2, ['#ffe6cc', SKIN, '#d8a07a'])); x.strokeStyle = OUT; x.lineWidth = L; x.stroke();
    for (const ex of [0.018, 0.042]) { x.beginPath(); x.ellipse(ex * k, hy + k * 0.002, k * 0.008, k * 0.012, 0, 0, TAU); x.fillStyle = '#2a1a22'; x.fill(); circ(x, ex * k + k * 0.003, hy - k * 0.004, k * 0.0035, '#ffffff'); }
    ell(x, k * 0.05, hy + k * 0.02, k * 0.01, k * 0.006, 'rgba(255,110,110,.55)');
    // 帽子
    const hc = look.hc || shade(c, -0.25);
    switch (look.hat) {
      case 'hood': x.beginPath(); x.arc(0, hy - k * 0.004, hr * 1.12, Math.PI * 0.92, Math.PI * 2.12); x.lineTo(-hr * 1.1, hy + k * 0.06); x.closePath(); fs(x, lgrad(x, -hr, 0, hr, 0, [shade(hc, 0.25), hc, shade(hc, -0.3)]), OUT, L); break;
      case 'helm': x.beginPath(); x.arc(0, hy - k * 0.002, hr * 1.1, Math.PI, 0); x.lineTo(hr * 1.25, hy + k * 0.002); x.lineTo(-hr * 1.2, hy + k * 0.002); x.closePath(); fs(x, lgrad(x, 0, hy - hr, 0, hy, ['#ffffff', hc, shade(hc, -0.35)]), OUT, L); circ(x, 0, hy - hr * 1.05, k * 0.01, '#e5484d'); break;
      case 'wizard': x.beginPath(); x.moveTo(-hr * 1.4, hy - k * 0.02); x.quadraticCurveTo(0, hy - k * 0.035, hr * 1.5, hy - k * 0.02); x.quadraticCurveTo(0, hy - k * 0.005, -hr * 1.4, hy - k * 0.02); x.closePath(); fs(x, hc, OUT, L); x.beginPath(); x.moveTo(-hr * 0.8, hy - k * 0.025); x.quadraticCurveTo(-hr * 0.2, hy - k * 0.12, -hr * 1.2, hy - k * 0.16); x.quadraticCurveTo(hr * 0.4, hy - k * 0.1, hr * 0.85, hy - k * 0.025); x.closePath(); fs(x, lgrad(x, -hr, 0, hr, 0, [shade(hc, 0.3), hc, shade(hc, -0.3)]), OUT, L); Gfx.star(x, -hr * 1.2, hy - k * 0.16, k * 0.014, '#ffe27a', false); break;
      case 'miner': x.beginPath(); x.arc(0, hy - k * 0.004, hr * 1.08, Math.PI, 0); x.closePath(); fs(x, lgrad(x, 0, hy - hr, 0, hy, ['#fff3a0', '#f2c14e', '#b8862a']), OUT, L); x.fillStyle = '#b8862a'; x.fillRect(-hr * 1.25, hy - k * 0.006, hr * 2.5, k * 0.01); circ(x, hr * 0.5, hy - hr * 0.55, k * 0.012, '#ffffff'); break;
      case 'tophat': x.beginPath(); x.ellipse(0, hy - hr * 0.55, hr * 1.4, hr * 0.32, 0, 0, TAU); fs(x, hc, OUT, L); rrect(x, -hr * 0.75, hy - hr * 1.6, hr * 1.5, hr * 1.05, hr * 0.25); fs(x, lgrad(x, -hr, 0, hr, 0, [shade(hc, 0.25), hc, shade(hc, -0.3)]), OUT, L); x.fillStyle = look.band || '#e5484d'; x.fillRect(-hr * 0.75, hy - hr * 0.85, hr * 1.5, hr * 0.22); break;
      default: x.beginPath(); x.moveTo(-hr * 1.15, hy - k * 0.006); x.quadraticCurveTo(0, hy - k * 0.1, hr * 1.1, hy - k * 0.012); x.lineTo(hr * 1.4, hy - k * 0.004); x.lineTo(-hr * 1.25, hy); x.closePath(); fs(x, lgrad(x, 0, hy - k * 0.08, 0, hy, [shade(hc, 0.3), hc]), OUT, L);
    }
    if (look.feather) { x.strokeStyle = look.feather; x.lineWidth = lw(u, 0.018); x.lineCap = 'round'; x.beginPath(); x.moveTo(-k * 0.03, hy - k * 0.05); x.quadraticCurveTo(-k * 0.08, hy - k * 0.1, -k * 0.115, hy - k * 0.07); x.stroke(); x.lineCap = 'butt'; }
    return { k, hy };
  }
  // 弓箭手：腳底在 (0,0)，面向右。aim = 相對角度（往右為 0），pull 0~1 拉弓程度
  function archer(x, u, aim, pull, look) {
    const { k } = chibi(x, u, { c: look.tunic || '#3f8a4a', hat: look.hood ? 'hood' : 'cap', hc: look.hat || '#2f6b38', feather: look.hood ? null : (look.feather || '#e5484d'), cape: look.hood ? shade(look.hat || '#2f6b38', -0.1) : null, hair: '#8a5a2a' });
    // 箭袋
    rrect(x, -k * 0.085, -k * 0.175, k * 0.03, k * 0.085, k * 0.008); fs(x, '#8a5a2a', OUT, lw(u, 0.01));
    x.fillStyle = '#f2ece0'; x.fillRect(-k * 0.082, -k * 0.195, k * 0.008, k * 0.026); x.fillStyle = '#e5484d'; x.fillRect(-k * 0.071, -k * 0.2, k * 0.008, k * 0.03);
    const sx = k * 0.01, sy = -k * 0.13;
    x.save(); x.translate(sx, sy); x.rotate(aim);
    const br = k * (look.long ? 0.11 : 0.088), bx = k * 0.075;
    x.strokeStyle = OUT; x.lineWidth = lw(u, 0.032); x.beginPath(); x.arc(bx - br * 0.55, 0, br, -1.05, 1.05); x.stroke();
    x.strokeStyle = look.bow || '#a86a32'; x.lineWidth = lw(u, 0.02); x.stroke();
    x.strokeStyle = '#f2c14e'; x.lineWidth = lw(u, 0.012); x.beginPath(); x.arc(bx - br * 0.55, 0, br, -0.2, 0.2); x.stroke();
    const ex = bx - br * 0.55 + Math.cos(1.05) * br, ey = Math.sin(1.05) * br, hx = ex - pull * k * 0.07;
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1; x.beginPath(); x.moveTo(ex, -ey); x.lineTo(hx, 0); x.lineTo(ex, ey); x.stroke();
    if (pull > 0.25) { x.strokeStyle = '#6b4a2a'; x.lineWidth = lw(u, 0.012); x.beginPath(); x.moveTo(hx, 0); x.lineTo(bx + k * 0.04, 0); x.stroke(); poly(x, [bx + k * 0.06, 0, bx + k * 0.035, -k * 0.012, bx + k * 0.035, k * 0.012], '#e8eef8'); }
    circ(x, bx - br * 0.55 + br * 0.98, 0, k * 0.016, SKIN); circ(x, hx, 0, k * 0.016, SKIN);
    x.restore();
  }
  // 狙擊手
  function rifleman(x, u, aim, rec, look) {
    const { k } = chibi(x, u, { c: look.coat, hat: 'tophat', hc: look.hat, band: look.band || '#e5484d', belt: shade(look.coat, -0.4), hair: '#3a2a22' });
    x.save(); x.translate(0, -k * 0.13); x.rotate(aim);
    const L = k * 0.26, back = rec * k * 0.04;
    x.translate(-back, 0);
    rrect(x, -k * 0.06, -k * 0.016, k * 0.1, k * 0.036, k * 0.01); fs(x, lgrad(x, 0, -k * 0.016, 0, k * 0.02, ['#a86a3a', '#7a4a22']), OUT, lw(u, 0.01));
    x.fillStyle = OUT; x.fillRect(k * 0.02, -k * 0.012, L, k * 0.022);
    x.fillStyle = lgrad(x, 0, -k * 0.01, 0, k * 0.008, ['#8a909a', '#4b505a']); x.fillRect(k * 0.02, -k * 0.009, L - 1, k * 0.014);
    rrect(x, k * 0.05, -k * 0.045, k * 0.09, k * 0.024, k * 0.01); fs(x, look.scope || '#2a2d33', OUT, lw(u, 0.008));
    circ(x, k * 0.14, -k * 0.033, k * 0.009, '#9fe6ff');
    circ(x, k * 0.0, k * 0.0, k * 0.016, SKIN); circ(x, k * 0.09, k * 0.005, k * 0.014, SKIN);
    x.restore();
  }
  // ───────── 防禦塔：靜態塔身 ─────────
  // part: 'back'（塔身＋後半部）或 'front'（前面的欄杆、城垛）
  function body(x, k, tier, sp, u, part) {
    const B = part === 'back';
    const T = topH(k, tier) * u;
    switch (k) {
      case 'arrow': return arrowBody(x, tier, sp, u, B, T);
      case 'cannon': return cannonBody(x, tier, sp, u, B, T);
      case 'frost': return frostBody(x, tier, sp, u, B, T);
      case 'magic': return magicBody(x, tier, sp, u, B, T);
      case 'sniper': return sniperBody(x, tier, sp, u, B, T);
      case 'banner': return bannerBody(x, tier, sp, u, B, T);
      case 'mine': return mineBody(x, tier, sp, u, B, T);
    }
  }
  const WOOD = '#b07a44', STONE = '#bdb5a8';
  function arrowBody(x, tier, sp, u, B, T) {
    const py = -(T - 0.14 * u); // 平台高度
    if (tier === 0) {
      if (B) {
        plot(x, u, 0);
        // 四根腳
        post(x, -u * 0.3, 0, -u * 0.22, py, u * 0.055, '#8a5a2e', u);
        post(x, u * 0.3, 0, u * 0.22, py, u * 0.055, '#7a4a22', u);
        post(x, -u * 0.12, u * 0.06, -u * 0.1, py, u * 0.05, '#9a6a3a', u);
        post(x, u * 0.12, u * 0.06, u * 0.1, py, u * 0.05, '#8a5a2e', u);
        // 斜撐
        x.strokeStyle = '#6b4220'; x.lineWidth = u * 0.03; x.beginPath(); x.moveTo(-u * 0.27, -u * 0.05); x.lineTo(u * 0.2, py + u * 0.1); x.moveTo(u * 0.27, -u * 0.05); x.lineTo(-u * 0.2, py + u * 0.1); x.stroke();
        // 平台
        disk(x, py, u * 0.32, '#b98a52', u, u * 0.05);
        x.strokeStyle = rgba('#000000', 0.25); x.lineWidth = lw(u, 0.01);
        for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(i * u * 0.08, py - u * 0.1); x.lineTo(i * u * 0.08, py + u * 0.1); x.stroke(); }
        railing(x, py, u * 0.3, u, '#9a6a3a', 'back');
        // 小旗
        post(x, -u * 0.26, py, -u * 0.26, py - u * 0.42, u * 0.022, '#6b4220', u);
      } else railing(x, py, u * 0.3, u, '#9a6a3a', 'front');
      return;
    }
    if (tier === 1) {
      if (B) {
        plot(x, u, 1);
        cyl(x, 0, u * 0.3, u * 0.3, STONE, u, 'brick', 11);
        post(x, -u * 0.24, -u * 0.28, -u * 0.22, py, u * 0.05, '#8a5a2e', u);
        post(x, u * 0.24, -u * 0.28, u * 0.22, py, u * 0.05, '#7a4a22', u);
        post(x, 0, -u * 0.22, 0, py, u * 0.05, '#8a5a2e', u);
        x.strokeStyle = '#6b4220'; x.lineWidth = u * 0.028; x.beginPath(); x.moveTo(-u * 0.22, -u * 0.3); x.lineTo(u * 0.2, py + u * 0.07); x.moveTo(u * 0.22, -u * 0.3); x.lineTo(-u * 0.2, py + u * 0.07); x.stroke();
        door(x, 0, u * 0.08, u * 0.13, u * 0.2, u);
        disk(x, py, u * 0.34, '#b98a52', u, u * 0.05);
        railing(x, py, u * 0.32, u, '#9a6a3a', 'back');
        post(x, -u * 0.3, py, -u * 0.3, py - u * 0.48, u * 0.024, '#6b4220', u);
        x.beginPath(); x.moveTo(-u * 0.29, py - u * 0.47); x.lineTo(-u * 0.08, py - u * 0.42); x.lineTo(-u * 0.29, py - u * 0.36); x.closePath(); fs(x, '#e5484d', OUT, lw(u, 0.012));
      } else railing(x, py, u * 0.32, u, '#9a6a3a', 'front');
      return;
    }
    // Lv3 與專精：石塔
    const spec0 = tier === 3 && sp === 0, spec1 = tier === 3 && sp === 1;
    const r = spec0 ? u * 0.4 : spec1 ? u * 0.29 : u * 0.34;
    const st = spec1 ? '#c7c0b0' : spec0 ? '#b3a99a' : STONE;
    if (B) {
      plot(x, u, tier >= 3 ? 3 : 2);
      cyl(x, 0, r, -py, st, u, 'brick', 13 + sp);
      // 木製外廊（hoarding）
      if (spec0) {
        disk(x, py, r * 1.12, '#a07040', u, u * 0.06);
        for (const sx of [-1, 1]) { hangBanner(x, sx * r * 0.62, py + u * 0.09, u * 0.13, u * 0.3, '#c8382e', u, 'star'); }
      } else disk(x, py, r * 1.04, shade(st, 0.05), u, u * 0.05);
      door(x, 0, u * 0.07, u * 0.14, u * 0.22, u);
      if (!spec0) hangBanner(x, 0, py + u * 0.1, u * 0.14, u * 0.28, spec1 ? '#2f7a45' : '#c8382e', u, spec1 ? 'circle' : 'star');
      win(x, -r * 0.55, py + u * 0.2, u * 0.05, u * 0.09, u);
      win(x, r * 0.55, py + u * 0.2, u * 0.05, u * 0.09, u);
      if (tier === 3) goldBand(x, py + u * 0.05, r * 1.04, u);
      crenels(x, py, r * (spec0 ? 1.12 : 1.04), u * 0.09, spec0 ? '#a07040' : st, u, 'back', spec0 ? 10 : 8);
      if (spec1) {
        // 鷹眼塔：細長屋頂柱
        post(x, -r * 0.85, py - u * 0.02, -r * 0.85, py - u * 0.38, u * 0.03, '#6b4a2a', u);
        post(x, r * 0.85, py - u * 0.02, r * 0.85, py - u * 0.38, u * 0.03, '#6b4a2a', u);
      }
    } else {
      crenels(x, py, r * (spec0 ? 1.12 : 1.04), u * 0.09, spec0 ? '#a07040' : st, u, 'front', spec0 ? 10 : 8);
      if (spec1) {
        cone(x, py - u * 0.36, r * 1.15, u * 0.34, '#2f8a4a', u);
        circ(x, 0, py - u * 0.71, u * 0.03, '#ffe08a');
      }
    }
  }
  function cannonBody(x, tier, sp, u, B, T) {
    const py = -(T - 0.05 * u);
    if (!B) {
      if (tier >= 1) crenels(x, py, tier >= 3 ? u * 0.44 : u * 0.38, u * 0.08, tier >= 3 && sp === 1 ? '#6f7a64' : '#9a948a', u, 'front', tier >= 2 ? 9 : 7);
      else railing(x, py, u * 0.35, u, '#8a5a2e', 'front');
      return;
    }
    if (tier === 0) {
      plot(x, u, 0);
      cyl(x, 0, u * 0.36, -py, '#9a6634', u, 'wood', 21);
      x.strokeStyle = '#3e4148'; x.lineWidth = u * 0.03; x.beginPath(); x.ellipse(0, py * 0.45, u * 0.36, u * 0.13, 0, 0, Math.PI); x.stroke();
      disk(x, py, u * 0.36, '#c49a64', u);
      railing(x, py, u * 0.35, u, '#8a5a2e', 'back');
      // 砲彈堆
      for (const [bx, by] of [[0.28, 0.12], [0.36, 0.1], [0.32, 0.05]]) { circ(x, bx * u, by * u, u * 0.045, '#2e3036'); circ(x, bx * u - u * 0.012, by * u - u * 0.012, u * 0.014, '#6b707a'); }
      return;
    }
    const big = tier >= 3, r = big ? u * 0.44 : u * 0.38;
    const c = tier >= 3 && sp === 1 ? '#7d8a70' : '#a8a196';
    plot(x, u, tier >= 2 ? 3 : 1, tier >= 3 && sp === 1 ? '#9aa08e' : null);
    cyl(x, 0, r, -py, c, u, 'brick', 31 + tier);
    // 鐵箍
    x.strokeStyle = '#3e4148'; x.lineWidth = u * 0.035; x.beginPath(); x.ellipse(0, py * 0.35, r, r * 0.36, 0, 0.02, Math.PI - 0.02); x.stroke();
    x.strokeStyle = '#8a8f99'; x.lineWidth = u * 0.012; x.stroke();
    for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI; circ(x, Math.cos(a) * r, py * 0.35 + Math.sin(a) * r * 0.36, u * 0.012, '#c8ccd4'); }
    // 砲口窗
    win(x, -r * 0.5, py * 0.62, u * 0.07, u * 0.08, u);
    win(x, r * 0.5, py * 0.62, u * 0.07, u * 0.08, u);
    if (tier >= 2) goldBand(x, py + u * 0.03, r, u);
    disk(x, py, r, shade(c, 0.1), u);
    crenels(x, py, r, u * 0.08, c, u, 'back', tier >= 2 ? 9 : 7);
    if (tier >= 2 && !(tier === 3 && sp === 1)) { for (const [bx, by] of [[-0.42, 0.1], [-0.34, 0.14], [-0.38, 0.06]]) { circ(x, bx * u, by * u, u * 0.045, '#2e3036'); circ(x, bx * u - u * 0.012, by * u - u * 0.012, u * 0.014, '#6b707a'); } }
    if (tier === 3 && sp === 1) {
      // 彈藥箱
      rrect(x, u * 0.24, u * 0.0, u * 0.2, u * 0.13, u * 0.02); fs(x, '#5d6b4a', OUT, lw(u, 0.012));
      x.fillStyle = '#e8d04a'; x.fillRect(u * 0.27, u * 0.05, u * 0.14, u * 0.025);
    }
    if (tier === 3 && sp === 0) hangBanner(x, 0, py + u * 0.08, u * 0.15, u * 0.26, '#3a3f8a', u, 'star');
  }
  function frostBody(x, tier, sp, u, B, T) {
    const ice = '#cfe9f5', stone = '#b9cad8';
    if (!B) {
      if (tier === 3 && sp === 1) {
        // 冰晶尖塔：前面的大冰柱
        crystal(x, -u * 0.22, -u * 0.05, u * 0.09, u * 0.42, '#bfefff', u, -0.2);
        crystal(x, u * 0.24, -u * 0.02, u * 0.08, u * 0.34, '#9fe0ff', u, 0.25);
      }
      return;
    }
    plot(x, u, tier >= 2 ? 3 : tier, '#c2d3df');
    const py = -(T - 0.3 * u);
    if (tier === 0) {
      // 小冰祠：石柱＋四根小柱
      cyl(x, 0, u * 0.2, -py, stone, u, 'brick', 41);
      disk(x, py, u * 0.26, '#dcecf5', u, u * 0.04);
      crystal(x, -u * 0.2, u * 0.02, u * 0.05, u * 0.16, '#bfefff', u, -0.3);
    } else if (tier === 1) {
      cyl(x, 0, u * 0.22, -py, stone, u, 'brick', 42);
      for (const sx of [-1, 1]) crystal(x, sx * u * 0.24, u * 0.02, u * 0.06, u * 0.2, '#bfefff', u, sx * 0.3);
      disk(x, py, u * 0.28, '#dcecf5', u, u * 0.05);
      win(x, 0, py * 0.5, u * 0.06, u * 0.1, u, '#7fd6ff');
    } else if (tier === 2 || sp === 0) {
      const r = u * 0.24;
      cyl(x, 0, r, -py, '#c9d8e4', u, 'brick', 43);
      // 拱窗與冰霜
      win(x, 0, py * 0.55, u * 0.08, u * 0.14, u, '#7fd6ff');
      x.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 6; i++) { const px = -r + i * r * 0.4; x.beginPath(); x.moveTo(px, py); x.lineTo(px + r * 0.2, py); x.lineTo(px + r * 0.1, py + u * (0.06 + (i % 2) * 0.05)); x.closePath(); x.fill(); }
      goldBand(x, py * 0.2, r, u);
      disk(x, py, r * 1.25, '#e2f1f9', u, u * 0.05);
      for (const sx of [-1, 1]) crystal(x, sx * r * 1.25, py + u * 0.02, u * 0.045, u * 0.14, '#9fe0ff', u, sx * 0.25);
      if (sp === 0) { // 暴風雪：石環
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; if (Math.sin(a) > 0) continue; const px = Math.cos(a) * u * 0.42, pyy = Math.sin(a) * u * 0.17; rrect(x, px - u * 0.04, pyy - u * 0.18, u * 0.08, u * 0.18, u * 0.02); fs(x, '#b4c6d4', OUT, lw(u, 0.012)); }
      }
    } else {
      // 冰晶尖塔：冰柱群取代塔身
      crystal(x, 0, 0, u * 0.17, -py + u * 0.1, '#d6f6ff', u, 0);
      crystal(x, -u * 0.12, -u * 0.02, u * 0.09, -py * 0.7, '#a8e6ff', u, -0.35);
      crystal(x, u * 0.13, -u * 0.01, u * 0.1, -py * 0.75, '#bfefff', u, 0.3);
    }
    if (tier === 3 && sp === 0) {
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; if (Math.sin(a) <= 0) continue; }
    }
  }
  function crystal(x, cx, yb, w, h, c, u, tilt) {
    x.save(); x.translate(cx, yb); x.rotate(tilt || 0);
    x.beginPath(); x.moveTo(-w, 0); x.lineTo(-w * 0.9, -h * 0.72); x.lineTo(0, -h); x.lineTo(w * 0.9, -h * 0.72); x.lineTo(w, 0); x.closePath();
    fs(x, lgrad(x, -w, 0, w, 0, [shade(c, 0.4), c, shade(c, -0.3)]), OUT, lw(u, 0.012));
    x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.moveTo(-w * 0.55, -h * 0.05); x.lineTo(-w * 0.5, -h * 0.7); x.lineTo(-w * 0.1, -h * 0.9); x.lineTo(-w * 0.2, -h * 0.1); x.closePath(); x.fill();
    x.restore();
  }
  function magicBody(x, tier, sp, u, B, T) {
    if (!B) return;
    plot(x, u, tier >= 2 ? 3 : tier, '#b9adc9');
    const st = '#a99cc4', roof = sp === 1 ? '#b0408f' : sp === 0 ? '#3a5fb8' : '#6a45b8';
    const py = -(T - 0.3 * u);
    const r = tier === 0 ? u * 0.24 : tier === 1 ? u * 0.25 : u * 0.27;
    cyl(x, 0, r, -py, st, u, 'brick', 51 + tier);
    door(x, 0, u * 0.08, u * 0.12, u * 0.2, u, '#4a2a5a');
    win(x, -r * 0.5, py * 0.55, u * 0.05, u * 0.09, u, '#ffcf5a');
    win(x, r * 0.45, py * 0.75, u * 0.05, u * 0.09, u, '#ffcf5a');
    if (tier >= 2) { goldBand(x, py * 0.3, r, u); hangBanner(x, -r * 0.05, py + u * 0.12, u * 0.12, u * 0.24, roof, u, 'circle'); }
    // 頂部：四根柱子的露天平台（法球浮在上面）
    disk(x, py, r * 1.2, '#cbbfe0', u, u * 0.05);
    const ph = u * 0.18;
    for (const a of [Math.PI * 1.2, Math.PI * 1.8]) { const px = Math.cos(a) * r, pyy = py + Math.sin(a) * r * 0.36; rrect(x, px - u * 0.025, pyy - ph, u * 0.05, ph, u * 0.01); fs(x, '#d8cfe8', OUT, lw(u, 0.012)); }
    if (tier >= 1) {
      // 屋頂：環形簷（中間空）
      x.save();
      const ry = r * 1.25 * 0.36, yy = py - ph;
      x.beginPath(); x.ellipse(0, yy, r * 1.25, ry, 0, 0, TAU); fs(x, roof, OUT, lw(u));
      x.beginPath(); x.ellipse(0, yy, r * 0.7, r * 0.7 * 0.36, 0, 0, TAU); x.fillStyle = shade(roof, -0.4); x.fill();
      x.restore();
    }
    if (sp === 0) { // 雷電塔：銅線圈柱
      for (const sx of [-1, 1]) { const px = sx * r * 1.15; rrect(x, px - u * 0.03, py - u * 0.3, u * 0.06, u * 0.3, u * 0.01); fs(x, '#b8743a', OUT, lw(u, 0.012)); for (let i = 0; i < 5; i++) { x.fillStyle = '#e8a050'; x.fillRect(px - u * 0.035, py - u * 0.27 + i * u * 0.05, u * 0.07, u * 0.018); } circ(x, px, py - u * 0.32, u * 0.04, '#d8c0ff'); }
    }
    if (sp === 1) { for (const sx of [-1, 1]) crystal(x, sx * r * 1.25, py + u * 0.02, u * 0.05, u * 0.2, '#ffa8e8', u, sx * 0.2); }
  }
  function sniperBody(x, tier, sp, u, B, T) {
    const py = -(T - 0.13 * u);
    if (!B) {
      // 瞭望台前緣
      const c = tier === 0 ? '#9a6a3a' : sp === 1 ? '#7a3434' : sp === 0 ? '#3a4f7a' : '#7a6248';
      rrect(x, -u * 0.27, py - u * 0.04, u * 0.54, u * 0.1, u * 0.02); fs(x, c, OUT, lw(u));
      x.fillStyle = rgba('#ffffff', 0.2); x.fillRect(-u * 0.25, py - u * 0.03, u * 0.5, u * 0.02);
      if (tier >= 2) { x.fillStyle = sp === 0 ? '#f2c14e' : '#c9b38a'; x.fillRect(-u * 0.27, py + u * 0.03, u * 0.54, u * 0.02); }
      if (sp === 1) { // 鹿角
        x.strokeStyle = '#e8dcc0'; x.lineWidth = lw(u, 0.02); x.lineCap = 'round';
        for (const sx of [-1, 1]) { x.beginPath(); x.moveTo(sx * u * 0.03, py + u * 0.0); x.quadraticCurveTo(sx * u * 0.1, py - u * 0.03, sx * u * 0.14, py - u * 0.09); x.moveTo(sx * u * 0.08, py - u * 0.02); x.lineTo(sx * u * 0.09, py - u * 0.07); x.stroke(); }
        x.lineCap = 'butt';
      }
      return;
    }
    plot(x, u, tier >= 2 ? 3 : tier, tier >= 3 && sp === 1 ? '#a89a8c' : null);
    if (tier === 0) {
      // 細長木架
      for (const [x0, x1, c] of [[-0.28, -0.18, '#8a5a2e'], [0.28, 0.18, '#7a4a22'], [-0.1, -0.07, '#9a6a3a'], [0.1, 0.07, '#8a5a2e']]) post(x, x0 * u, (Math.abs(x0) < 0.2 ? 0.05 : 0) * u, x1 * u, py, u * 0.045, c, u);
      x.strokeStyle = '#6b4220'; x.lineWidth = u * 0.026;
      for (const f of [0.25, 0.55]) { x.beginPath(); x.moveTo(-u * (0.28 - f * 0.1), py * f); x.lineTo(u * (0.28 - f * 0.1), py * (f + 0.25)); x.moveTo(u * (0.28 - f * 0.1), py * f); x.lineTo(-u * (0.28 - f * 0.1), py * (f + 0.25)); x.stroke(); }
      rrect(x, -u * 0.25, py - u * 0.02, u * 0.5, u * 0.08, u * 0.02); fs(x, '#a8743e', OUT, lw(u));
      return;
    }
    const c = tier === 1 ? '#b87a5a' : sp === 1 ? '#8a5048' : sp === 0 ? '#b8b4ac' : '#a89c88';
    // 方形高塔（梯形）
    const w0 = u * 0.27, w1 = u * 0.19;
    x.save();
    x.beginPath(); x.moveTo(-w0, 0); x.lineTo(-w1, py); x.lineTo(w1, py); x.lineTo(w0, 0); x.closePath();
    x.fillStyle = c; x.fill(); x.clip();
    bricks(x, -w0, py, w0 * 2, -py, u * 0.07, c, 61 + tier + sp);
    x.fillStyle = lgrad(x, -w0, 0, w0, 0, [[0, 'rgba(255,255,255,.2)'], [0.5, 'rgba(0,0,0,0)'], [0.52, 'rgba(0,0,0,.18)'], [1, 'rgba(0,0,0,.32)']]);
    x.fillRect(-w0, py, w0 * 2, -py);
    x.restore();
    x.beginPath(); x.moveTo(-w0, 0); x.lineTo(-w1, py); x.lineTo(w1, py); x.lineTo(w0, 0); x.strokeStyle = OUT; x.lineWidth = lw(u); x.stroke();
    // 射擊孔
    for (const f of [0.35, 0.65]) { rrect(x, -u * 0.018, py * f - u * 0.05, u * 0.036, u * 0.1, u * 0.01); fs(x, '#1e1a24', null); }
    door(x, 0, u * 0.06, u * 0.12, u * 0.18, u);
    if (tier >= 2) { x.fillStyle = sp === 0 ? '#f2c14e' : '#6b5a48'; x.fillRect(-w1 - u * 0.01, py + u * 0.04, w1 * 2 + u * 0.02, u * 0.03); }
    if (sp === 0) hangBanner(x, -u * 0.13, py + u * 0.08, u * 0.1, u * 0.24, '#2f4f9a', u, 'star');
    if (sp === 1) hangBanner(x, u * 0.13, py + u * 0.08, u * 0.1, u * 0.24, '#9a2a2a', u, 'circle');
    // 瞭望台後緣與頂篷柱
    rrect(x, -u * 0.27, py - u * 0.06, u * 0.54, u * 0.06, u * 0.02); fs(x, shade(c, -0.15), OUT, lw(u));
    if (tier >= 2) {
      post(x, -u * 0.24, py - u * 0.02, -u * 0.24, py - u * 0.42, u * 0.03, '#5a3a22', u);
      post(x, u * 0.24, py - u * 0.02, u * 0.24, py - u * 0.42, u * 0.03, '#5a3a22', u);
      const rc = sp === 1 ? '#8a2a2a' : sp === 0 ? '#2f4f9a' : '#5b6a3a';
      x.beginPath(); x.moveTo(-u * 0.32, py - u * 0.38); x.lineTo(0, py - u * 0.56); x.lineTo(u * 0.32, py - u * 0.38); x.lineTo(u * 0.28, py - u * 0.34); x.lineTo(-u * 0.28, py - u * 0.34); x.closePath();
      fs(x, lgrad(x, -u * 0.3, 0, u * 0.3, 0, [shade(rc, 0.2), rc, shade(rc, -0.25)]), OUT, lw(u));
      if (sp === 0) circ(x, 0, py - u * 0.57, u * 0.03, '#ffe08a');
    }
  }
  function bannerBody(x, tier, sp, u, B, T) {
    if (!B) return;
    if (sp === 1) {
      plot(x, u, 3, '#c9b090');
      // 瞭望塔：高木架
      const py = -u * 0.75;
      for (const [x0, x1, c] of [[-0.3, -0.18, '#8a5a2e'], [0.3, 0.18, '#7a4a22']]) post(x, x0 * u, 0, x1 * u, py, u * 0.05, c, u);
      x.strokeStyle = '#6b4220'; x.lineWidth = u * 0.026;
      for (const f of [0.2, 0.55]) { x.beginPath(); x.moveTo(-u * 0.27, py * f); x.lineTo(u * 0.24, py * (f + 0.3)); x.moveTo(u * 0.27, py * f); x.lineTo(-u * 0.24, py * (f + 0.3)); x.stroke(); }
      rrect(x, -u * 0.26, py - u * 0.12, u * 0.52, u * 0.14, u * 0.02); fs(x, '#a8743e', OUT, lw(u));
      x.strokeStyle = rgba('#000000', 0.3); x.lineWidth = lw(u, 0.01);
      for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * u * 0.1, py - u * 0.12); x.lineTo(i * u * 0.1, py + u * 0.02); x.stroke(); }
      return;
    }
    plot(x, u, tier >= 2 ? 3 : tier, '#c9b090');
    // 石座
    if (tier >= 1) {
      const r = u * (tier >= 2 ? 0.22 : 0.18);
      cyl(x, 0, r, u * (tier >= 2 ? 0.18 : 0.12), '#c4b49c', u, 'brick', 71);
      disk(x, -u * (tier >= 2 ? 0.18 : 0.12), r, '#d8cbb4', u);
      if (tier >= 2) goldBand(x, -u * 0.1, r, u);
    } else {
      // 斜靠的盾牌
      for (const [sx, c] of [[-0.24, '#3a6fd8'], [0.26, '#d8a03a']]) { x.beginPath(); x.moveTo(sx * u - u * 0.07, -u * 0.12); x.lineTo(sx * u + u * 0.07, -u * 0.12); x.lineTo(sx * u + u * 0.07, -u * 0.02); x.lineTo(sx * u, u * 0.05); x.lineTo(sx * u - u * 0.07, -u * 0.02); x.closePath(); fs(x, c, OUT, lw(u, 0.012)); circ(x, sx * u, -u * 0.05, u * 0.02, '#ffe08a'); }
    }
    if (tier >= 1 && sp !== 0) {
      // 火盆
      for (const sx of tier >= 2 ? [-1, 1] : [1]) { const bx = sx * u * 0.33; post(x, bx, u * 0.05, bx, -u * 0.22, u * 0.025, '#4b4f58', u); x.beginPath(); x.moveTo(bx - u * 0.07, -u * 0.26); x.lineTo(bx + u * 0.07, -u * 0.26); x.lineTo(bx + u * 0.04, -u * 0.2); x.lineTo(bx - u * 0.04, -u * 0.2); x.closePath(); fs(x, '#5a5f68', OUT, lw(u, 0.012)); }
    }
    if (sp === 0) {
      // 戰鼓
      const dx = -u * 0.24, dy = u * 0.02;
      cyl(x, dy, u * 0.15, u * 0.17, '#b8402e', u, 'plain');
      x.strokeStyle = '#f2c14e'; x.lineWidth = lw(u, 0.018);
      for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(-u * 0.15 + i * u * 0.075, dy - u * 0.17); x.lineTo(-u * 0.15 + (i + 0.5) * u * 0.075, dy); x.stroke(); }
      x.save(); x.translate(0, 0); x.restore();
      x.beginPath(); x.ellipse(0, dy - u * 0.17, u * 0.15, u * 0.054, 0, 0, TAU); fs(x, '#f4e6c8', OUT, lw(u));
      void dx;
    }
  }
  function mineBody(x, tier, sp, u, B, T) {
    if (!B) return;
    if (tier === 3 && sp === 0) {
      // 銀行
      ell(x, u * 0.03, u * 0.06, u * 0.5, u * 0.2, 'rgba(0,0,0,.25)');
      rrect(x, -u * 0.44, -u * 0.06, u * 0.88, u * 0.14, u * 0.02); fs(x, '#cfc5b0', OUT, lw(u));
      rrect(x, -u * 0.38, -u * 0.48, u * 0.76, u * 0.44, u * 0.01); fs(x, '#ede4d0', OUT, lw(u));
      for (let i = -2; i <= 2; i++) { const cx = i * u * 0.15; rrect(x, cx - u * 0.035, -u * 0.46, u * 0.07, u * 0.42, u * 0.01); fs(x, lgrad(x, cx - u * 0.035, 0, cx + u * 0.035, 0, ['#ffffff', '#e2d8c4', '#b8ad98']), OUT, lw(u, 0.012)); }
      x.beginPath(); x.moveTo(-u * 0.46, -u * 0.48); x.lineTo(0, -u * 0.72); x.lineTo(u * 0.46, -u * 0.48); x.closePath(); fs(x, lgrad(x, 0, -u * 0.72, 0, -u * 0.48, ['#f2e6cc', '#d4c6a8']), OUT, lw(u));
      circ(x, 0, -u * 0.565, u * 0.065, '#f2c14e'); x.strokeStyle = '#8a5a12'; x.lineWidth = lw(u, 0.014); x.stroke();
      x.fillStyle = '#8a5a12'; x.font = `900 ${u * 0.08}px "Noto Sans TC",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('金', 0, -u * 0.56);
      rrect(x, -u * 0.07, -u * 0.22, u * 0.14, u * 0.18, [u * 0.07, u * 0.07, 0, 0]); fs(x, '#5a3a22', OUT, lw(u, 0.012));
      // 金幣堆
      for (const [bx, n] of [[-0.36, 4], [0.34, 3]]) for (let i = 0; i < n; i++) { ell(x, bx * u, u * 0.1 - i * u * 0.025, u * 0.06, u * 0.022, '#c99a2a'); ell(x, bx * u, u * 0.095 - i * u * 0.025, u * 0.06, u * 0.02, '#ffd84a'); }
      return;
    }
    // 礦坑：小山丘
    ell(x, u * 0.03, u * 0.08, u * 0.5, u * 0.18, 'rgba(0,0,0,.22)');
    const hill = tier === 3 ? '#8f7a68' : '#a08a6a', hh = u * (0.3 + tier * 0.06);
    x.beginPath(); x.moveTo(-u * 0.48, u * 0.1); x.bezierCurveTo(-u * 0.45, -hh * 1.1, u * 0.35, -hh * 1.25, u * 0.48, u * 0.1); x.closePath();
    fs(x, lgrad(x, -u * 0.4, -hh, u * 0.4, u * 0.1, [shade(hill, 0.2), hill, shade(hill, -0.25)]), OUT, lw(u));
    const r = mkRng(81 + tier);
    for (let i = 0; i < 9; i++) { const px = (r() - 0.5) * u * 0.7, py = -r() * hh * 0.8; ell(x, px, py, u * 0.05, u * 0.03, shade(hill, r() * 0.3 - 0.15)); }
    // 草皮
    x.fillStyle = '#6aa84a'; x.beginPath(); x.moveTo(-u * 0.3, -hh * 0.75); x.bezierCurveTo(-u * 0.15, -hh * 1.12, u * 0.15, -hh * 1.15, u * 0.3, -hh * 0.8); x.quadraticCurveTo(0, -hh * 0.92, -u * 0.3, -hh * 0.75); x.fill();
    if (sp === 1) { for (const [px, py, c] of [[-0.25, -0.15, '#ff5d8f'], [0.2, -0.22, '#5ad1ff'], [0.32, -0.05, '#7dffb0'], [-0.05, -0.33, '#c49bff']]) crystal(x, px * u, py * u + hh * 0.1, u * 0.04, u * 0.12, c, u, px); }
    // 坑口
    rrect(x, -u * 0.13, -u * 0.22, u * 0.26, u * 0.3, [u * 0.13, u * 0.13, 0, 0]); fs(x, '#1e1612', null);
    x.strokeStyle = '#7a5532'; x.lineWidth = u * 0.045; x.beginPath(); x.moveTo(-u * 0.15, u * 0.09); x.lineTo(-u * 0.15, -u * 0.22); x.lineTo(u * 0.15, -u * 0.22); x.lineTo(u * 0.15, u * 0.09); x.stroke();
    x.strokeStyle = OUT; x.lineWidth = lw(u, 0.012); x.strokeRect(-u * 0.175, -u * 0.245, u * 0.35, u * 0.045);
    // 鐵軌
    x.strokeStyle = '#5a5f68'; x.lineWidth = lw(u, 0.016);
    x.beginPath(); x.moveTo(-u * 0.08, u * 0.08); x.lineTo(-u * 0.12, u * 0.22); x.moveTo(u * 0.08, u * 0.08); x.lineTo(u * 0.12, u * 0.22); x.stroke();
    x.strokeStyle = '#7a5532'; for (let i = 0; i < 3; i++) { const yy = u * (0.1 + i * 0.05); x.beginPath(); x.moveTo(-u * (0.1 + i * 0.012), yy); x.lineTo(u * (0.1 + i * 0.012), yy); x.stroke(); }
    // 十字鎬
    x.save(); x.translate(-u * 0.32, u * 0.02); x.rotate(-0.5);
    post(x, 0, 0, 0, -u * 0.22, u * 0.02, '#8a5a2e', u);
    x.beginPath(); x.moveTo(-u * 0.1, -u * 0.2); x.quadraticCurveTo(0, -u * 0.27, u * 0.1, -u * 0.2); x.lineTo(0, -u * 0.23); x.closePath(); fs(x, '#9aa0aa', OUT, lw(u, 0.01));
    x.restore();
    if (tier >= 1) { post(x, u * 0.2, u * 0.0, u * 0.2, -u * 0.28, u * 0.018, '#5a3a22', u); }
    if (tier >= 1) { ell(x, u * 0.36, u * 0.12, u * 0.07, u * 0.05, '#c2a070'); x.fillStyle = '#8a6a3a'; x.fillRect(u * 0.33, u * 0.04, u * 0.06, u * 0.03); }
    if (tier >= 2 && sp !== 1) {
      // 吊架
      post(x, -u * 0.18, -hh * 0.7, -u * 0.06, -hh * 1.35, u * 0.025, '#6b4220', u);
      post(x, u * 0.08, -hh * 0.75, -u * 0.06, -hh * 1.35, u * 0.025, '#5a3a1e', u);
    }
  }

  // ───────── 防禦塔：會動的部分 ─────────
  // t: 塔物件；a: 螢幕上的瞄準角度；time: 秒
  function live(x, t, u, time, a, k, tier, sp) {
    const T = topH(k, tier) * u, rec = t.recoil || 0;
    const right = Math.cos(a) >= 0, face = right ? 1 : -1;
    const rel = right ? a : Math.PI - a; // 鏡像後的相對角度
    const aim = clamp(Math.atan2(Math.sin(rel), Math.cos(rel)), -1.2, 0.9);
    const st = t.st, pull = st && st.rate ? clamp(1 - (t.cd || 0) * st.rate, 0, 1) : 0.6;
    switch (k) {
      case 'arrow': {
        const py = -(T - 0.14 * u);
        const look = tier === 3 ? (sp === 0 ? { tunic: '#b83a30', hat: '#7a2a24', feather: '#ffe08a' } : { tunic: '#2f6b3a', hat: '#244f2c', hood: true, long: true, bow: '#5a3a1e' }) : tier === 2 ? { tunic: '#3a6fb8', hat: '#2a4f8a', feather: '#ffe08a' } : { tunic: '#4f9a4a', hat: '#2f6b38' };
        const xs = tier === 0 ? [0] : (tier === 3 && sp === 0) ? [-0.15, 0, 0.15] : (tier === 3 && sp === 1) ? [0] : [-0.1, 0.1];
        for (let i = 0; i < xs.length; i++) {
          x.save(); x.translate(xs[i] * u, py - (i === 1 && xs.length === 3 ? u * 0.03 : 0)); x.scale(face, 1);
          archer(x, u, aim + (xs.length === 3 ? (i - 1) * 0.12 : 0), rec > 0.75 ? 0 : pull, look);
          x.restore();
        }
        if (tier === 0) {
          // 小旗
          const fy = py - u * 0.42;
          x.beginPath(); x.moveTo(-u * 0.25, fy);
          for (let i = 0; i <= 5; i++) { const f = i / 5; x.lineTo(-u * 0.25 + f * u * 0.2, fy + Math.sin(time * 6 - f * 4) * u * 0.015 * f); }
          for (let i = 5; i >= 0; i--) { const f = i / 5; x.lineTo(-u * 0.25 + f * u * (i === 5 ? 0.16 : 0.2), fy + u * 0.09 + Math.sin(time * 6 - f * 4) * u * 0.015 * f); }
          x.closePath(); fs(x, '#ffc94a', OUT, lw(u, 0.01));
        }
        break;
      }
      case 'cannon': {
        const py = -(T - 0.05 * u);
        if (tier === 3 && sp === 1) { rocketRack(x, u, py, a, rec, time); break; }
        const big = tier === 3 && sp === 0;
        const L = u * (0.3 + tier * 0.04 + (big ? 0.06 : 0)), bw = u * (0.07 + tier * 0.012 + (big ? 0.05 : 0));
        const ca = Math.cos(a), sa = Math.sin(a);
        const vis = Math.atan2(sa * 0.75, ca), lf = 0.62 + 0.38 * Math.abs(ca);
        const behind = sa < -0.15;
        const drawBarrel = () => {
          x.save(); x.translate(0, py - u * 0.06); x.rotate(vis);
          const l = L * lf - rec * u * 0.08;
          const bc = big ? '#b8863a' : tier >= 2 ? '#3a3f48' : '#4a4038';
          rrect(x, -u * 0.04, -bw, l, bw * 2, bw * 0.4); fs(x, lgrad(x, 0, -bw, 0, bw, [shade(bc, 0.35), bc, shade(bc, -0.35)]), OUT, lw(u));
          rrect(x, l - u * 0.05, -bw * 1.2, u * 0.07, bw * 2.4, u * 0.015); fs(x, big ? '#d8a84a' : shade(bc, 0.1), OUT, lw(u));
          if (tier >= 2 || big) { x.fillStyle = big ? '#f2d080' : '#d9a83a'; x.fillRect(l * 0.4, -bw - 0.5, u * 0.035, bw * 2 + 1); }
          x.restore();
        };
        // 砲手（Lv2 起）：戴頭盔、拿火把
        if (tier >= 1) {
          x.save(); x.translate(-face * u * 0.24, py + u * 0.02); x.scale(face, 1);
          chibi(x, u * 0.85, { c: big ? '#8a5a2a' : '#5a6a8a', hat: 'helm', hc: big ? '#d8a84a' : '#a8b4c8', hair: '#3a2a22' });
          const kk = u * 0.85 * 1.3;
          x.strokeStyle = OUT; x.lineWidth = lw(u, 0.03); x.beginPath(); x.moveTo(kk * 0.03, -kk * 0.12); x.lineTo(kk * 0.1, -kk * 0.2); x.stroke();
          x.strokeStyle = '#7a4a22'; x.lineWidth = lw(u, 0.018); x.stroke();
          flame(x, kk * 0.105, -kk * 0.21, u * (0.035 + rec * 0.02), time * 1.5 + t.id);
          x.restore();
        }
        if (behind) drawBarrel();
        // 砲座圓頂
        const dr = u * (0.13 + tier * 0.015 + (big ? 0.04 : 0));
        x.beginPath(); x.ellipse(0, py - u * 0.02, dr, dr * 0.42, 0, 0, Math.PI); x.lineTo(-dr, py - u * 0.02); x.arc(0, py - u * 0.02, dr, Math.PI, 0); x.closePath();
        fs(x, rgrad(x, 0, py - u * 0.06, 0, dr * 1.2, [shade(big ? '#8a6a3a' : '#5a606a', 0.3), big ? '#6a4a22' : '#3e434c'], -dr * 0.4, -dr * 0.4), OUT, lw(u));
        if (!behind) drawBarrel();
        break;
      }
      case 'frost': {
        const py = -(T - 0.3 * u);
        if (tier === 3 && sp === 0) {
          // 暴風雪：旋轉的雪霧
          x.save();
          for (let i = 0; i < 3; i++) { const aa = time * 2.2 + i * 2.1; x.strokeStyle = rgba('#ffffff', 0.55 - i * 0.12); x.lineWidth = lw(u, 0.03 - i * 0.006); x.beginPath(); x.ellipse(0, py - u * 0.16, u * (0.34 + i * 0.05), u * (0.11 + i * 0.02), 0, aa, aa + 2.2); x.stroke(); }
          x.restore();
          // 三顆冰晶繞圈
          for (let i = 0; i < 3; i++) {
            const aa = time * 1.6 + i * TAU / 3, cx = Math.cos(aa) * u * 0.26, cy = py - u * 0.2 + Math.sin(aa) * u * 0.08;
            floatCrystal(x, cx, cy, u * 0.07, time * 2 + i, u, '#d9f6ff', 0.7 + 0.3 * Math.sin(aa));
          }
          floatCrystal(x, 0, py - u * 0.26 + Math.sin(time * 2) * u * 0.02, u * 0.09, time * 1.4, u, '#ffffff', 1);
        } else {
          const r = u * (0.08 + tier * 0.015 + (sp === 1 ? 0.03 : 0));
          floatCrystal(x, 0, py - u * 0.24 + Math.sin(time * 2 + t.id) * u * 0.035, r, time * 1.3 + t.id, u, tier === 3 ? '#e8fbff' : '#c8f2ff', 1 + rec * 0.4);
        }
        break;
      }
      case 'magic': {
        const py = -(T - 0.3 * u);
        const oy = -T + Math.sin(time * 2.4 + t.id) * u * 0.035;
        const pc = sp === 1 ? '#ff7ee0' : sp === 0 ? '#8fd0ff' : '#c08bff';
        // 法師（Lv2 起）：舉起法杖對著水晶球施法
        if (tier >= 1) {
          x.save(); x.translate(-u * 0.2, py + u * 0.05);
          chibi(x, u * 0.8, { c: sp === 1 ? '#a83a8a' : sp === 0 ? '#3a5ab8' : '#6a3ac8', hat: 'wizard', hc: sp === 1 ? '#6a1a5a' : sp === 0 ? '#1e2e7a' : '#3e1f84', robe: true, hair: '#e8e8f0' });
          const kk = u * 0.8 * 1.3, lift = rec * kk * 0.03;
          x.strokeStyle = OUT; x.lineWidth = lw(u, 0.025); x.beginPath(); x.moveTo(kk * 0.07, -kk * 0.02); x.lineTo(kk * 0.1, -kk * 0.3 - lift); x.stroke();
          x.strokeStyle = '#8a5a32'; x.lineWidth = lw(u, 0.014); x.stroke();
          circ(x, kk * 0.1, -kk * 0.31 - lift, kk * 0.02, pc); circ(x, kk * 0.06, -kk * 0.13, kk * 0.016, SKIN);
          x.restore();
        }
        // 符文環
        x.save(); x.strokeStyle = rgba(pc, 0.55); x.lineWidth = lw(u, 0.012);
        x.beginPath(); x.ellipse(0, oy + u * 0.02, u * 0.2, u * 0.06, 0, 0, TAU); x.stroke();
        for (let i = 0; i < 6; i++) { const aa = time * 1.2 + i * TAU / 6; const rx = Math.cos(aa) * u * 0.2, ry = oy + u * 0.02 + Math.sin(aa) * u * 0.06; x.fillStyle = Math.sin(aa) > 0 ? '#fff4c8' : rgba('#fff4c8', 0.45); x.fillRect(rx - u * 0.012, ry - u * 0.018, u * 0.024, u * 0.036); }
        x.restore();
        if (sp === 1) {
          // 稜鏡
          const aa = time * 1.5, r = u * 0.12;
          const pts = [0, 1, 2].map(i => [Math.cos(aa + i * TAU / 3) * r, Math.sin(aa + i * TAU / 3) * r * 0.35]);
          x.beginPath(); x.moveTo(0, oy - r * 1.3); for (const [px, pyy] of pts) x.lineTo(px, oy + pyy); x.closePath(); fs(x, rgba('#ffd0f4', 0.95), OUT, lw(u, 0.012));
          x.beginPath(); x.moveTo(0, oy + r * 1.1); for (const [px, pyy] of pts) x.lineTo(px, oy + pyy); x.closePath(); fs(x, rgba('#ff7ee0', 0.95), OUT, lw(u, 0.012));
          x.beginPath(); x.moveTo(0, oy - r * 1.3); x.lineTo(pts[0][0], oy + pts[0][1]); x.lineTo(0, oy + r * 1.1); x.closePath(); x.fillStyle = 'rgba(255,255,255,.35)'; x.fill();
        } else {
          const r = u * (0.075 + tier * 0.012 + rec * 0.02);
          circ(x, 0, oy, r, rgrad(x, 0, oy, 0, r, ['#ffffff', pc, shade(pc, -0.4)], -r * 0.35, -r * 0.35));
          x.strokeStyle = OUT; x.lineWidth = lw(u, 0.01); x.stroke();
          circ(x, -r * 0.35, oy - r * 0.35, r * 0.25, 'rgba(255,255,255,.85)');
          if (sp === 0) {
            x.strokeStyle = '#e8f6ff'; x.lineWidth = lw(u, 0.014);
            for (let i = 0; i < 3; i++) { const aa = time * 9 + i * 2.1, j = Math.sin(time * 37 + i) * 0.5; x.beginPath(); x.moveTo(Math.cos(aa) * r, oy + Math.sin(aa) * r); x.lineTo(Math.cos(aa + j) * r * 1.8, oy + Math.sin(aa) * r * 1.6); x.lineTo(Math.cos(aa) * r * 2.4, oy + Math.sin(aa + j) * r * 2.2); x.stroke(); }
          }
        }
        break;
      }
      case 'sniper': {
        const py = -(T - 0.13 * u);
        const look = sp === 1 ? { coat: '#7a2a2a', hat: '#3a2420', band: '#e8dcc0', scope: '#5a1a1a' } : sp === 0 ? { coat: '#2f4f9a', hat: '#1e2a4a', band: '#f2c14e', scope: '#c9a040' } : tier >= 2 ? { coat: '#4f6a3a', hat: '#2f3a24', band: '#e5484d' } : { coat: '#5a7a4a', hat: '#3a4a2a', band: '#c94a3a' };
        x.save(); x.translate(0, py - u * 0.04); x.scale(face, 1);
        rifleman(x, u, clamp(aim, -0.6, 0.7), rec, look);
        // 瞄準鏡閃光
        const gl = (time * 0.7 + t.id * 0.31) % 1;
        if (gl < 0.08) { const s2 = Math.sin(gl / 0.08 * Math.PI) * u * 0.07; x.save(); x.translate(0, -u * 0.16); x.rotate(clamp(aim, -0.6, 0.7)); x.translate(u * 0.1, -u * 0.04); x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(-s2, 0); x.lineTo(0, -s2 * 0.25); x.lineTo(s2, 0); x.lineTo(0, s2 * 0.25); x.closePath(); x.fill(); x.beginPath(); x.moveTo(0, -s2); x.lineTo(s2 * 0.25, 0); x.lineTo(0, s2); x.lineTo(-s2 * 0.25, 0); x.closePath(); x.fill(); x.restore(); }
        x.restore();
        if (tier === 0) { // 小旗
          post(x, u * 0.22, py, u * 0.22, py - u * 0.36, u * 0.018, '#5a3a22', u);
          x.beginPath(); x.moveTo(u * 0.23, py - u * 0.36); x.lineTo(u * 0.38, py - u * 0.32 + Math.sin(time * 5) * u * 0.015); x.lineTo(u * 0.23, py - u * 0.27); x.closePath(); fs(x, '#ffd36b', OUT, lw(u, 0.01));
        }
        break;
      }
      case 'banner': {
        const big = tier >= 2 || sp >= 0;
        const baseY = sp === 1 ? -u * 0.85 : tier >= 1 ? -u * (tier >= 2 ? 0.18 : 0.12) : 0;
        const ph = sp === 1 ? u * 0.55 : u * (0.75 + tier * 0.08);
        const px = sp === 0 ? u * 0.08 : 0;
        post(x, px, baseY, px, baseY - ph, u * 0.035, '#6b4220', u);
        circ(x, px, baseY - ph - u * 0.02, u * 0.035, '#ffd36b'); x.strokeStyle = OUT; x.lineWidth = lw(u, 0.01); x.stroke();
        const fw = u * (0.34 + tier * 0.04 + (big ? 0.04 : 0)), fh = u * (0.22 + tier * 0.02);
        const fc = sp === 1 ? '#3a6fd8' : sp === 0 ? '#c8382e' : '#e5484d';
        const top = baseY - ph + u * 0.03;
        const wv = (f) => Math.sin(time * 5.5 - f * 4.5) * u * 0.035 * f;
        x.beginPath(); x.moveTo(px + u * 0.02, top);
        for (let i = 0; i <= 10; i++) { const f = i / 10; x.lineTo(px + u * 0.02 + f * fw, top + wv(f)); }
        x.lineTo(px + u * 0.02 + fw * 0.82, top + fh * 0.5 + wv(1));
        for (let i = 10; i >= 0; i--) { const f = i / 10; x.lineTo(px + u * 0.02 + f * fw, top + fh + wv(f)); }
        x.closePath();
        fs(x, lgrad(x, px, top, px + fw, top + fh, [shade(fc, 0.15), fc, shade(fc, -0.2)]), OUT, lw(u, 0.012));
        if (tier >= 2) { x.strokeStyle = '#f2c14e'; x.lineWidth = lw(u, 0.016); x.beginPath(); x.moveTo(px + u * 0.03, top + u * 0.02 + wv(0.05)); for (let i = 1; i <= 8; i++) { const f = i / 10; x.lineTo(px + u * 0.02 + f * fw, top + u * 0.02 + wv(f)); } x.stroke(); }
        Gfx.star(x, px + u * 0.02 + fw * 0.4, top + fh * 0.5 + wv(0.4), fh * 0.26, '#fff3c0', false);
        if (sp === 0) {
          // 鼓手
          const hit = Math.max(0, Math.sin(time * 9));
          x.save(); x.translate(-u * 0.24 - u * 0.14, u * 0.03);
          archerless(x, u, '#b83a30');
          x.strokeStyle = '#6b4a2a'; x.lineWidth = lw(u, 0.02);
          x.beginPath(); x.moveTo(u * 0.04, -u * 0.13); x.lineTo(u * 0.13, -u * 0.18 + hit * u * 0.04); x.stroke();
          x.restore();
        }
        if (sp === 1) {
          // 拿望遠鏡的哨兵
          x.save(); x.translate(-u * 0.12, -u * 0.85); x.scale(face, 1);
          archerless(x, u, '#3a6fb8');
          rrect(x, u * 0.02, -u * 0.2, u * 0.12, u * 0.03, u * 0.01); fs(x, '#c9a040', OUT, lw(u, 0.01));
          x.restore();
        }
        // 火盆火焰
        if (tier >= 1 && sp !== 0 && sp !== 1) for (const sx of tier >= 2 ? [-1, 1] : [1]) flame(x, sx * u * 0.33, -u * 0.27, u * 0.07, time + sx);
        break;
      }
      case 'mine': {
        if (tier === 3 && sp === 0) {
          const tw = (time * 0.9 + t.id * 0.37) % 1;
          if (tw < 0.3) sparkle(x, -u * 0.36, u * 0.02, u * 0.07 * Math.sin(tw / 0.3 * Math.PI));
          const tw2 = (time * 0.9 + t.id * 0.37 + 0.5) % 1;
          if (tw2 < 0.3) sparkle(x, u * 0.34, u * 0.04, u * 0.06 * Math.sin(tw2 / 0.3 * Math.PI));
          break;
        }
        // 礦工：戴安全帽揮十字鎬
        {
          x.save(); x.translate(-u * 0.3, u * 0.08);
          chibi(x, u * 0.85, { c: '#5a6aa8', hat: 'miner', hair: '#3a2a22', belt: '#3a2a1a' });
          const kk = u * 0.85 * 1.3, sw = Math.sin(time * 5 + t.id) * 0.7 - 0.3;
          x.save(); x.translate(kk * 0.03, -kk * 0.12); x.rotate(sw);
          x.strokeStyle = OUT; x.lineWidth = lw(u, 0.026); x.beginPath(); x.moveTo(0, 0); x.lineTo(kk * 0.12, -kk * 0.08); x.stroke();
          x.strokeStyle = '#9a6a3a'; x.lineWidth = lw(u, 0.015); x.stroke();
          x.beginPath(); x.moveTo(kk * 0.08, -kk * 0.13); x.quadraticCurveTo(kk * 0.14, -kk * 0.1, kk * 0.16, -kk * 0.03); x.strokeStyle = OUT; x.lineWidth = lw(u, 0.026); x.stroke(); x.strokeStyle = '#b8c0cc'; x.lineWidth = lw(u, 0.014); x.stroke();
          circ(x, 0, 0, kk * 0.016, SKIN);
          x.restore();
          if (Math.sin(time * 5 + t.id) > 0.92) sparkle(x, kk * 0.17, -kk * 0.02, u * 0.04);
          x.restore();
        }
        // 礦車進出
        const m = (Math.sin(time * 0.9 + t.id) + 1) / 2;
        const kx = lerp(-u * 0.02, u * 0.06, m), ky = lerp(u * 0.0, u * 0.16, m), ks = 0.8 + m * 0.25;
        x.save(); x.translate(kx, ky); x.scale(ks, ks);
        rrect(x, -u * 0.11, -u * 0.1, u * 0.22, u * 0.1, u * 0.015); fs(x, '#6b5a48', OUT, lw(u, 0.012));
        x.fillStyle = '#4a3a2a'; x.fillRect(-u * 0.11, -u * 0.06, u * 0.22, u * 0.015);
        const gem = sp === 1 ? ['#ff5d8f', '#5ad1ff', '#7dffb0'] : ['#ffd84a', '#ffe98a', '#f2b632'];
        for (let i = 0; i < 3; i++) circ(x, -u * 0.06 + i * u * 0.06, -u * 0.11, u * 0.04, gem[i]);
        circ(x, -u * 0.065, u * 0.005, u * 0.026, '#2a2d33'); circ(x, u * 0.065, u * 0.005, u * 0.026, '#2a2d33');
        x.restore();
        if (tier >= 2 && sp !== 1) {
          // 吊架上的輪子
          const hh = u * (0.3 + tier * 0.06), wx = -u * 0.06, wy = -hh * 1.35;
          circ(x, wx, wy, u * 0.06, '#7a5532'); x.strokeStyle = OUT; x.lineWidth = lw(u, 0.012); x.stroke();
          x.strokeStyle = '#d8b07a'; x.lineWidth = lw(u, 0.012);
          for (let i = 0; i < 3; i++) { const aa = time * 2 + i * Math.PI / 3; x.beginPath(); x.moveTo(wx + Math.cos(aa) * u * 0.055, wy + Math.sin(aa) * u * 0.055); x.lineTo(wx - Math.cos(aa) * u * 0.055, wy - Math.sin(aa) * u * 0.055); x.stroke(); }
          x.strokeStyle = '#3a3a3a'; x.beginPath(); x.moveTo(wx + u * 0.06, wy); x.lineTo(wx + u * 0.06, -u * 0.2); x.stroke();
        }
        if (tier >= 1) { // 燈籠
          const lx = u * 0.2, ly = -u * 0.28;
          rrect(x, lx - u * 0.03, ly, u * 0.06, u * 0.07, u * 0.01); fs(x, '#ffd36b', OUT, lw(u, 0.01));
        }
        const tw = (time * 1.1 + t.id * 0.37) % 1;
        if (tw < 0.25) sparkle(x, u * 0.08, -u * 0.22, u * 0.07 * Math.sin(tw / 0.25 * Math.PI));
        if (t.pulse > 0) { x.globalAlpha = t.pulse * 0.8; circ(x, 0, -u * 0.1, u * 0.45 * (1.6 - t.pulse), rgba('#ffd84a', 0.35)); x.globalAlpha = 1; }
        break;
      }
    }
  }
  // 沒拿武器的小人（鼓手、哨兵）
  function archerless(x, u, c) { chibi(x, u, { c, hat: 'helm', hc: '#b8c0cc', hair: '#5a3a22' }); }
  function rocketRack(x, u, py, a, rec, time) {
    const ca = Math.cos(a), sa = Math.sin(a);
    const vis = Math.atan2(sa * 0.75, ca);
    rrect(x, -u * 0.16, py - u * 0.1, u * 0.32, u * 0.12, u * 0.03); fs(x, '#4b5a3e', OUT, lw(u));
    x.save(); x.translate(0, py - u * 0.14); x.rotate(vis * 0.6 - 0.25 * (ca >= 0 ? 1 : -1));
    rrect(x, -u * 0.17, -u * 0.12, u * 0.34, u * 0.2, u * 0.03); fs(x, lgrad(x, 0, -u * 0.12, 0, u * 0.08, ['#7d8a62', '#55603f']), OUT, lw(u));
    for (let i = 0; i < 3; i++) {
      const yy = -u * 0.08 + i * u * 0.06, back = rec > 0.5 ? u * 0.0 : 0;
      circ(x, ca >= 0 ? u * 0.15 : -u * 0.15, yy, u * 0.025, '#1e2218');
      if (rec < 0.6) { const tip = ca >= 0 ? u * 0.2 : -u * 0.2; poly(x, [tip + (ca >= 0 ? u * 0.05 : -u * 0.05), yy, tip, yy - u * 0.02, tip, yy + u * 0.02], '#e5484d'); void back; }
    }
    x.fillStyle = '#e8d04a'; x.fillRect(-u * 0.15, u * 0.04, u * 0.3, u * 0.02);
    x.restore();
    void time;
  }
  function floatCrystal(x, cx, cy, r, ph, u, c, bright) {
    const cw = Math.abs(Math.cos(ph)) * 0.55 + 0.45;
    x.beginPath(); x.moveTo(cx, cy - r * 1.7); x.lineTo(cx + r * cw, cy - r * 0.2); x.lineTo(cx, cy + r * 1.2); x.lineTo(cx - r * cw, cy - r * 0.2); x.closePath();
    fs(x, lgrad(x, cx - r, 0, cx + r, 0, [shade(c, 0.3), c, shade('#7fd6ff', -0.1)]), OUT, lw(u, 0.012));
    x.beginPath(); x.moveTo(cx, cy - r * 1.7); x.lineTo(cx + r * cw * 0.45, cy - r * 0.2); x.lineTo(cx, cy + r * 1.2); x.closePath(); x.fillStyle = 'rgba(255,255,255,.6)'; x.fill();
    if (bright > 1) { x.globalAlpha = Math.min(1, bright - 1); circ(x, cx, cy, r * 0.5, '#ffffff'); x.globalAlpha = 1; }
  }
  function sparkle(x, cx, cy, s) {
    if (s <= 0.2) return;
    x.fillStyle = '#fffbe0';
    x.beginPath(); x.moveTo(cx - s, cy); x.lineTo(cx, cy - s * 0.25); x.lineTo(cx + s, cy); x.lineTo(cx, cy + s * 0.25); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s * 0.25, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s * 0.25, cy); x.closePath(); x.fill();
  }
  function flame(x, cx, cy, r, t) {
    const f = 1 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7.3) * 0.08;
    x.beginPath(); x.moveTo(cx - r, cy); x.quadraticCurveTo(cx - r * 0.9, cy - r * 1.4 * f, cx + Math.sin(t * 5) * r * 0.3, cy - r * 2.2 * f); x.quadraticCurveTo(cx + r * 0.9, cy - r * 1.3 * f, cx + r, cy); x.closePath();
    x.fillStyle = '#ff8a2a'; x.fill();
    x.beginPath(); x.moveTo(cx - r * 0.5, cy); x.quadraticCurveTo(cx - r * 0.4, cy - r * 0.9 * f, cx, cy - r * 1.4 * f); x.quadraticCurveTo(cx + r * 0.4, cy - r * 0.8 * f, cx + r * 0.5, cy); x.closePath();
    x.fillStyle = '#ffe27a'; x.fill();
  }

  // ───────── 城堡 ─────────
  function castle(x, u, part) {
    // 原點：城門底部中心。寬約 2 格，高約 1.8 格
    const st = '#d6cfc0', dk = '#a59c8a', roof = '#3f6fd8';
    if (part === 'back') {
      ell(x, u * 0.05, u * 0.1, u * 1.0, u * 0.3, 'rgba(0,0,0,.28)');
      // 後方主堡
      x.save(); x.translate(0, -u * 0.3);
      rrect(x, -u * 0.38, -u * 0.95, u * 0.76, u * 0.95, u * 0.02); fs(x, dk, OUT, lw(u));
      x.save(); rrect(x, -u * 0.38, -u * 0.95, u * 0.76, u * 0.95, u * 0.02); x.clip(); bricks(x, -u * 0.38, -u * 0.95, u * 0.76, u * 0.95, u * 0.08, '#c4bcac', 91); x.fillStyle = lgrad(x, -u * 0.38, 0, u * 0.38, 0, ['rgba(255,255,255,.15)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.25)']); x.fillRect(-u, -u, u * 2, u * 2); x.restore();
      for (let i = 0; i < 5; i++) { rrect(x, -u * 0.38 + i * u * 0.165, -u * 1.05, u * 0.1, u * 0.11, u * 0.01); fs(x, '#c4bcac', OUT, lw(u, 0.014)); }
      win(x, -u * 0.15, -u * 0.6, u * 0.08, u * 0.14, u, '#ffcf5a'); win(x, u * 0.15, -u * 0.6, u * 0.08, u * 0.14, u, '#ffcf5a');
      x.restore();
      // 兩側塔樓
      for (const sx of [-1, 1]) {
        x.save(); x.translate(sx * u * 0.62, 0);
        cyl(x, 0, u * 0.22, u * 1.05, st, u, 'brick', 92 + sx);
        win(x, 0, -u * 0.65, u * 0.07, u * 0.12, u, '#ffcf5a');
        disk(x, -u * 1.05, u * 0.26, '#e2dccf', u, u * 0.04);
        cone(x, -u * 1.08, u * 0.29, u * 0.55, roof, u);
        post(x, 0, -u * 1.6, 0, -u * 1.85, u * 0.018, '#5a4a3a', u);
        x.restore();
      }
      // 城牆
      rrect(x, -u * 0.62, -u * 0.55, u * 1.24, u * 0.6, u * 0.02); fs(x, st, OUT, lw(u));
      x.save(); rrect(x, -u * 0.62, -u * 0.55, u * 1.24, u * 0.6, u * 0.02); x.clip(); bricks(x, -u * 0.62, -u * 0.55, u * 1.24, u * 0.6, u * 0.075, st, 94); x.fillStyle = lgrad(x, 0, -u * 0.55, 0, u * 0.05, ['rgba(255,255,255,.12)', 'rgba(0,0,0,.18)']); x.fillRect(-u, -u, u * 2, u * 2); x.restore();
      for (let i = 0; i < 6; i++) { rrect(x, -u * 0.6 + i * u * 0.21, -u * 0.65, u * 0.13, u * 0.12, u * 0.01); fs(x, st, OUT, lw(u, 0.014)); }
      // 城門
      rrect(x, -u * 0.2, -u * 0.42, u * 0.4, u * 0.47, [u * 0.2, u * 0.2, 0, 0]); fs(x, '#3a2a1e', OUT, lw(u));
      rrect(x, -u * 0.16, -u * 0.38, u * 0.32, u * 0.43, [u * 0.16, u * 0.16, 0, 0]); fs(x, '#6b4a2a', null);
      x.strokeStyle = '#2a1e14'; x.lineWidth = lw(u, 0.014);
      for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * u * 0.08, -u * 0.36); x.lineTo(i * u * 0.08, u * 0.05); x.stroke(); }
      x.strokeStyle = '#4b4f58'; x.lineWidth = lw(u, 0.025); x.beginPath(); x.moveTo(-u * 0.16, -u * 0.18); x.lineTo(u * 0.16, -u * 0.18); x.moveTo(-u * 0.16, -u * 0.02); x.lineTo(u * 0.16, -u * 0.02); x.stroke();
      // 門上徽章
      x.beginPath(); x.moveTo(-u * 0.1, -u * 0.52); x.lineTo(u * 0.1, -u * 0.52); x.lineTo(u * 0.1, -u * 0.42); x.lineTo(0, -u * 0.36); x.lineTo(-u * 0.1, -u * 0.42); x.closePath(); fs(x, '#3f6fd8', OUT, lw(u, 0.012));
      Gfx.star(x, 0, -u * 0.45, u * 0.045, '#ffe08a', false);
      for (const sx of [-1, 1]) hangBanner(x, sx * u * 0.38, -u * 0.5, u * 0.13, u * 0.36, '#3f6fd8', u, 'star');
    }
  }
  function castleFlags(x, u, time) {
    for (const sx of [-1, 1]) {
      const fx = sx * u * 0.62, fy = -u * 1.84;
      const wv = (f) => Math.sin(time * 5 - f * 4 + sx) * u * 0.03 * f;
      x.beginPath(); x.moveTo(fx, fy);
      for (let i = 0; i <= 6; i++) { const f = i / 6; x.lineTo(fx + f * u * 0.3, fy + wv(f)); }
      x.lineTo(fx + u * 0.24, fy + u * 0.07 + wv(1));
      for (let i = 6; i >= 0; i--) { const f = i / 6; x.lineTo(fx + f * u * 0.3, fy + u * 0.14 + wv(f)); }
      x.closePath(); fs(x, '#ffc94a', OUT, lw(u, 0.012));
    }
  }

  // ───────── 敵人出生傳送門 ─────────
  function portalBack(x, u) {
    // 石拱門（後半）
    ell(x, 0, u * 0.08, u * 0.55, u * 0.2, 'rgba(0,0,0,.3)');
    for (const sx of [-1, 1]) {
      rrect(x, sx * u * 0.4 - u * 0.1, -u * 0.8, u * 0.2, u * 0.85, u * 0.04); fs(x, '#6a6478', OUT, lw(u));
      x.save(); rrect(x, sx * u * 0.4 - u * 0.1, -u * 0.8, u * 0.2, u * 0.85, u * 0.04); x.clip(); bricks(x, sx * u * 0.4 - u * 0.1, -u * 0.8, u * 0.2, u * 0.85, u * 0.08, '#7a7488', 101 + sx); x.restore();
    }
    x.beginPath(); x.arc(0, -u * 0.8, u * 0.5, Math.PI, 0); x.arc(0, -u * 0.8, u * 0.3, 0, Math.PI, true); x.closePath(); fs(x, '#757088', OUT, lw(u));
    x.save(); x.beginPath(); x.arc(0, -u * 0.8, u * 0.5, Math.PI, 0); x.arc(0, -u * 0.8, u * 0.3, 0, Math.PI, true); x.closePath(); x.clip();
    x.strokeStyle = rgba('#000000', 0.3); x.lineWidth = lw(u, 0.012);
    for (let i = 1; i < 7; i++) { const a = Math.PI + i / 7 * Math.PI; x.beginPath(); x.moveTo(Math.cos(a) * u * 0.3, -u * 0.8 + Math.sin(a) * u * 0.3); x.lineTo(Math.cos(a) * u * 0.5, -u * 0.8 + Math.sin(a) * u * 0.5); x.stroke(); }
    x.restore();
    // 拱心石骷髏
    circ(x, 0, -u * 1.22, u * 0.09, '#e8e2d2'); x.strokeStyle = OUT; x.lineWidth = lw(u, 0.012); x.stroke();
    circ(x, -u * 0.03, -u * 1.23, u * 0.022, '#2a1e2a'); circ(x, u * 0.03, -u * 1.23, u * 0.022, '#2a1e2a');
    // 苔蘚與藤
    x.strokeStyle = '#4f8a3a'; x.lineWidth = lw(u, 0.025); x.lineCap = 'round';
    x.beginPath(); x.moveTo(-u * 0.45, -u * 0.95); x.quadraticCurveTo(-u * 0.55, -u * 0.6, -u * 0.48, -u * 0.35); x.moveTo(u * 0.42, -u * 1.0); x.quadraticCurveTo(u * 0.52, -u * 0.8, u * 0.47, -u * 0.55); x.stroke(); x.lineCap = 'butt';
    // 火把
    for (const sx of [-1, 1]) { x.fillStyle = '#4b3a2a'; x.fillRect(sx * u * 0.55 - u * 0.015, -u * 0.7, u * 0.03, u * 0.18); }
  }
  function portalSwirl(x, u, time, col) {
    // 漩渦（在拱門內，每幀畫）
    x.save();
    x.beginPath(); x.ellipse(0, -u * 0.42, u * 0.3, u * 0.45, 0, 0, TAU); x.clip();
    x.fillStyle = rgrad(x, 0, -u * 0.42, 0, u * 0.5, ['#ffffff', col[0], col[1], '#120818']); x.fillRect(-u * 0.4, -u, u * 0.8, u * 1.2);
    x.strokeStyle = rgba('#ffffff', 0.5); x.lineWidth = lw(u, 0.02);
    for (let i = 0; i < 4; i++) {
      x.beginPath();
      for (let j = 0; j <= 20; j++) { const f = j / 20, a = time * 3 + i * Math.PI / 2 + f * 5, r = f * u * 0.4; x.lineTo(Math.cos(a) * r * 0.7, -u * 0.42 + Math.sin(a) * r); }
      x.stroke();
    }
    x.restore();
    for (const sx of [-1, 1]) flame(x, sx * u * 0.55, -u * 0.7, u * 0.05, time * 1.2 + sx);
  }

  return { topH, HS, body, live, castle, castleFlags, portalBack, portalSwirl, flame, sparkle, crystal, cyl, cone, disk, bricks, plot, post, hangBanner, archerless, OUT, fs, lw };
})();
