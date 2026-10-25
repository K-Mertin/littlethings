'use strict';
// 守塔奇兵：防禦塔造型（第二版）。
// 七種塔各有自己的建築語彙：箭塔＝木造瞭望台、砲塔＝矮胖石堡、冰霜塔＝冰岩長出的冰晶、
// 法師塔＝細長法塔＋浮空符環、狙擊塔＝細高鐘樓、戰旗＝軍營帳篷與戰鼓、金礦＝礦坑口與井架。
// Lv1→Lv2→Lv3 逐級長高、加細節；兩種專精各有完全不同的外型。
// 原點 = 塔腳底中心、u = 一格的像素；靜態部分分成 back（塔身，畫在小兵後面）和 front（欄杆、前緣，畫在小兵前面）。
// 線條一律用「本色壓暗」的細線，不用黑粗框；整體剪影的外框由 Gfx.softEdge 在快取時加上。

const Towers = (() => {
  const { TAU, shade, mix, rgba, ell, circ, lgrad, rgrad } = Gfx;
  const K = 0.36; // 俯視的橢圓扁率（跟地圖其他東西一致）
  const LIGHT = 'rgba(255,248,226,', DARK = 'rgba(30,14,44,';

  // ───────── 線條 ─────────
  // 依最後顯示大小限制粗細：0.4～0.95 個 CSS 像素
  function lw(x, u, f) {
    const w = u * (f || 0.014), ds = Gfx.drawScale;
    if (!ds) return Math.max(0.6, w);
    const T = x.getTransform(), k = Math.hypot(T.a, T.b) / ds;
    if (!(k > 0)) return w;
    return Math.max(0.4, Math.min(0.95, w * k)) / k;
  }
  const edgeC = c => rgba(mix(c, '#1e0e1c', 0.6), 0.78);
  function edge(x, u, c, f) { x.lineJoin = 'round'; x.strokeStyle = c ? edgeC(c) : 'rgba(48,26,44,.6)'; x.lineWidth = lw(x, u, f); x.stroke(); }
  function fe(x, u, fill, c, f) { x.fillStyle = fill; x.fill(); edge(x, u, c || (typeof fill === 'string' ? fill : null), f); }
  function path(x, pts) { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); }
  function line(x, x0, y0, x1, y1, c, w) { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.lineCap = 'butt'; }
  const L = (a, b, t) => a + (b - a) * t;
  const R = s => mkRng(s);

  // ───────── 基座 ─────────
  // kind: 0 夯土、1 石圈、2 切石平台、3 切石＋金邊
  function pad(x, u, kind, tint) {
    const rx = u * 0.46, ry = u * 0.2;
    ell(x, u * 0.03, u * 0.07, rx * 1.1, ry * 1.12, 'rgba(20,10,20,.2)');
    if (kind === 0) {
      ell(x, 0, u * 0.02, rx, ry, '#8a6a46'); ell(x, 0, 0, rx * 0.95, ry * 0.9, '#a98458');
      x.fillStyle = rgba('#5a4028', 0.25); x.beginPath(); x.ellipse(u * 0.05, u * 0.02, rx * 0.7, ry * 0.55, 0, 0, TAU); x.fill();
      const r = R(5);
      for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + r() * 0.3, f = 0.78 + r() * 0.2; const px = Math.cos(a) * rx * f, py = Math.sin(a) * ry * f; ell(x, px, py + u * 0.008, u * 0.04, u * 0.024, '#6d5a48'); ell(x, px, py, u * 0.036, u * 0.02, shade('#b9a994', r() * 0.24 - 0.12)); }
      return;
    }
    const st = tint || '#b8b0a2';
    x.beginPath(); x.ellipse(0, u * 0.05, rx, ry, 0, 0, Math.PI); x.lineTo(-rx, 0); x.ellipse(0, 0, rx, ry, 0, Math.PI, 0, true); x.closePath();
    fe(x, u, lgrad(x, -rx, 0, rx, 0, [shade(st, -0.18), shade(st, -0.32), shade(st, -0.45)]), st);
    x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, TAU); fe(x, u, lgrad(x, -rx, -ry, rx, ry, [shade(st, 0.2), st, shade(st, -0.12)]), st);
    x.save(); x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, TAU); x.clip();
    const r = R(9);
    x.strokeStyle = rgba('#2a1a20', 0.16); x.lineWidth = lw(x, u, 0.01);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.2; x.beginPath(); x.moveTo(Math.cos(a) * rx * 0.58, Math.sin(a) * ry * 0.58); x.lineTo(Math.cos(a) * rx, Math.sin(a) * ry); x.stroke(); }
    for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * TAU + 0.2; x.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#000000', 0.05 + r() * 0.05); x.beginPath(); x.ellipse(Math.cos(a) * rx * 0.8, Math.sin(a) * ry * 0.8, rx * 0.12, ry * 0.14, 0, 0, TAU); x.fill(); }
    x.beginPath(); x.ellipse(0, 0, rx * 0.58, ry * 0.58, 0, 0, TAU); x.stroke();
    x.restore();
    x.strokeStyle = rgba('#2a1a20', 0.2); x.lineWidth = lw(x, u, 0.01);
    for (let i = 1; i < 9; i++) { const a = i / 9 * Math.PI; x.beginPath(); x.moveTo(Math.cos(a) * rx, Math.sin(a) * ry); x.lineTo(Math.cos(a) * rx, Math.sin(a) * ry + u * 0.05); x.stroke(); }
    if (kind >= 3) {
      x.strokeStyle = '#a8761c'; x.lineWidth = lw(x, u, 0.03); x.beginPath(); x.ellipse(0, u * 0.026, rx, ry, 0, 0.1, Math.PI - 0.1); x.stroke();
      x.strokeStyle = '#ffd36b'; x.lineWidth = lw(x, u, 0.014); x.stroke();
    }
  }

  // ───────── 圓柱（可做成下寬上窄的錐台） ─────────
  // tex: stone 石塊 / brick 磚 / wood 直木板 / log 橫圓木 / plaster 灰泥 / plate 鐵板 / ice
  function drum(x, u, yb, r0, h, c, o) {
    o = o || {};
    const r1 = o.r1 || r0, yt = yb - h;
    const shape = () => { x.beginPath(); x.moveTo(-r1, yt); x.lineTo(-r0, yb); x.ellipse(0, yb, r0, r0 * K, 0, Math.PI, 0, true); x.lineTo(r1, yt); x.ellipse(0, yt, r1, r1 * K, 0, 0, Math.PI, false); x.closePath(); };
    shape(); x.fillStyle = c; x.fill();
    x.save(); x.clip();
    const tex = o.tex || 'stone', rr = y => L(r0, r1, (yb - y) / h);
    if (tex === 'stone' || tex === 'brick' || tex === 'ice') {
      const rh = o.rh || u * (tex === 'brick' ? 0.06 : 0.085), rnd = R(o.seed || 7);
      for (let j = 0, y = yb + r0 * K; y > yt - rh; j++, y -= rh) {
        const yc = y - rh, r = rr(y - rh / 2), n = Math.max(3, Math.round(Math.PI * r / (rh * (tex === 'brick' ? 2.2 : 1.7))));
        const off = (j % 2) * 0.5;
        for (let i = -1; i < n + 1; i++) {
          const a0 = Math.max(0, (i + off) / n * Math.PI), a1 = Math.min(Math.PI, (i + 1 + off) / n * Math.PI);
          if (a1 <= a0) continue;
          x.fillStyle = shade(c, (rnd() - 0.5) * (o.jit || 0.14));
          x.beginPath(); x.ellipse(0, yc, r, r * K, 0, a0, a1); x.ellipse(0, y, r, r * K, 0, a1, a0, true); x.closePath(); x.fill();
        }
        x.strokeStyle = rgba('#24141c', tex === 'ice' ? 0.1 : 0.2); x.lineWidth = lw(x, u, 0.008);
        x.beginPath(); x.ellipse(0, y, r, r * K, 0, 0, Math.PI); x.stroke();
        for (let i = 0; i <= n; i++) { const a = (i + off) / n * Math.PI; if (a <= 0 || a >= Math.PI) continue; x.beginPath(); x.moveTo(Math.cos(a) * r, yc + Math.sin(a) * r * K); x.lineTo(Math.cos(a) * r, y + Math.sin(a) * r * K); x.stroke(); }
        x.strokeStyle = rgba('#ffffff', tex === 'ice' ? 0.3 : 0.12); x.beginPath(); x.ellipse(0, y - lw(x, u, 0.012) * 1.2, r, r * K, 0, 0.3, Math.PI - 0.3); x.stroke();
      }
    } else if (tex === 'wood' || tex === 'plate') {
      const n = o.n || Math.max(6, Math.round(r0 / (u * 0.055)));
      for (let i = 0; i < n; i++) {
        const a0 = i / n * Math.PI, a1 = (i + 1) / n * Math.PI;
        x.fillStyle = shade(c, ((i * 7) % 5) * 0.025 - 0.05);
        x.beginPath(); x.moveTo(Math.cos(a0) * r1, yt + Math.sin(a0) * r1 * K); x.lineTo(Math.cos(a0) * r0, yb + Math.sin(a0) * r0 * K); x.lineTo(Math.cos(a1) * r0, yb + Math.sin(a1) * r0 * K); x.lineTo(Math.cos(a1) * r1, yt + Math.sin(a1) * r1 * K); x.closePath(); x.fill();
      }
      x.strokeStyle = rgba('#24141c', 0.22); x.lineWidth = lw(x, u, 0.008);
      for (let i = 1; i < n; i++) { const a = i / n * Math.PI; x.beginPath(); x.moveTo(Math.cos(a) * r1, yt + Math.sin(a) * r1 * K); x.lineTo(Math.cos(a) * r0, yb + Math.sin(a) * r0 * K); x.stroke(); }
      if (tex === 'plate') { for (const f of [0.15, 0.85]) for (let i = 0; i <= n; i++) { const a = (i + 0.5) / n * Math.PI, y = L(yb, yt, f), r = rr(y); circ(x, Math.cos(a) * r, y + Math.sin(a) * r * K, u * 0.009, rgba('#ffffff', 0.45)); } }
    } else if (tex === 'log') {
      const rh = o.rh || u * 0.07;
      for (let y = yb + r0 * K, j = 0; y > yt - rh; y -= rh, j++) {
        const r = rr(y - rh / 2);
        x.fillStyle = shade(c, (j % 3) * 0.04 - 0.04); x.beginPath(); x.ellipse(0, y - rh, r, r * K, 0, 0, Math.PI); x.ellipse(0, y, r, r * K, 0, Math.PI, 0, true); x.closePath(); x.fill();
        x.strokeStyle = rgba('#ffffff', 0.16); x.lineWidth = lw(x, u, 0.01); x.beginPath(); x.ellipse(0, y - rh * 0.72, r, r * K, 0, 0.2, Math.PI - 0.2); x.stroke();
        x.strokeStyle = rgba('#24141c', 0.28); x.beginPath(); x.ellipse(0, y, r, r * K, 0, 0, Math.PI); x.stroke();
      }
    } else if (tex === 'plaster') {
      const rnd = R(o.seed || 3);
      for (let i = 0; i < 7; i++) { const a = rnd() * Math.PI, y = L(yb, yt, rnd()); x.fillStyle = rgba('#000000', 0.05); x.beginPath(); x.ellipse(Math.cos(a) * r0 * 0.8, y, u * 0.05, u * 0.03, 0, 0, TAU); x.fill(); }
    }
    // 圓柱明暗：左亮右暗，右緣一點反光，底部遮蔽
    x.fillStyle = lgrad(x, -r0, 0, r0, 0, [[0, LIGHT + '.3)'], [0.28, LIGHT + '.06)'], [0.55, DARK + '.04)'], [0.88, DARK + '.36)'], [0.96, DARK + '.3)'], [1, 'rgba(190,210,255,.12)']]);
    x.fillRect(-r0 - 2, yt - r1 * K - 2, r0 * 2 + 4, h + (r0 + r1) * K + 4);
    x.fillStyle = lgrad(x, 0, yt, 0, yb + r0 * K, [[0, LIGHT + '.08)'], [0.7, 'rgba(0,0,0,0)'], [1, DARK + '.3)']]);
    x.fillRect(-r0 - 2, yt - r1 * K - 2, r0 * 2 + 4, h + (r0 + r1) * K + 4);
    x.restore();
    shape(); edge(x, u, c);
    if (o.top) { x.beginPath(); x.ellipse(0, yt, r1, r1 * K, 0, 0, TAU); fe(x, u, lgrad(x, -r1, yt - r1 * K, r1, yt + r1 * K, [shade(o.top, 0.18), o.top, shade(o.top, -0.15)]), o.top); }
  }
  // 頂部圓盤（有厚度）
  function disk(x, u, y, r, c, th) {
    th = th == null ? u * 0.045 : th;
    if (th > 0) { x.beginPath(); x.ellipse(0, y + th, r, r * K, 0, 0, Math.PI); x.lineTo(-r, y); x.ellipse(0, y, r, r * K, 0, Math.PI, 0, true); x.closePath(); fe(x, u, lgrad(x, -r, 0, r, 0, [shade(c, -0.12), shade(c, -0.28), shade(c, -0.45)]), c); }
    x.beginPath(); x.ellipse(0, y, r, r * K, 0, 0, TAU); fe(x, u, lgrad(x, -r, y - r * K, r, y + r * K, [shade(c, 0.22), c, shade(c, -0.1)]), c);
  }
  function deckPlanks(x, u, y, r, c) {
    x.save(); x.beginPath(); x.ellipse(0, y, r, r * K, 0, 0, TAU); x.clip();
    x.strokeStyle = rgba(shade(c, -0.5), 0.35); x.lineWidth = lw(x, u, 0.008);
    for (let i = -6; i <= 6; i++) { const px = i * u * 0.07; x.beginPath(); x.moveTo(px, y - r * K); x.lineTo(px, y + r * K); x.stroke(); }
    x.restore();
  }
  // 圓形城垛：part = back / front
  function merlons(x, u, y, r, h, c, part, n, o) {
    o = o || {};
    n = n || 8;
    const list = [];
    for (let i = 0; i < n; i++) list.push((i + 0.5) / n * TAU + (o.rot || 0));
    list.sort((a, b) => Math.sin(a) - Math.sin(b));
    for (const a of list) {
      const front = Math.sin(a) > 0;
      if ((part === 'front') !== front) continue;
      const px = Math.cos(a) * r * 0.93, py = y + Math.sin(a) * r * K * 0.93;
      const w = r * (o.w || 0.34) * (0.5 + 0.5 * Math.abs(Math.sin(a)));
      const lit = front ? 0.05 - Math.cos(a) * 0.14 : -0.3;
      x.beginPath(); x.moveTo(px - w / 2, py); x.lineTo(px - w / 2, py - h); x.lineTo(px + w / 2, py - h); x.lineTo(px + w / 2, py); x.closePath();
      fe(x, u, shade(c, lit), c, 0.012);
      x.beginPath(); x.rect(px - w / 2, py - h - u * 0.018, w, u * 0.018); fe(x, u, shade(c, front ? 0.24 : -0.05), c, 0.01);
      if (o.cap) { x.fillStyle = o.cap; x.fillRect(px - w / 2, py - h, w, u * 0.014); }
    }
  }
  // 圓錐屋頂：style shingle 魚鱗瓦 / thatch 茅草 / slate 石板 / stripe 條紋帳篷 / copper 銅
  function cone(x, u, yb, r, h, c, o) {
    o = o || {};
    const flare = o.flare || 1, ry = r * K, yt = yb - h, conc = o.conc == null ? 0.38 : o.conc;
    const shape = () => { x.beginPath(); x.moveTo(0, yt); x.quadraticCurveTo(-r * conc, yb - h * 0.3, -r * flare, yb); x.ellipse(0, yb, r * flare, ry * flare, 0, Math.PI, 0, true); x.quadraticCurveTo(r * conc, yb - h * 0.3, 0, yt); x.closePath(); };
    shape(); x.fillStyle = c; x.fill();
    x.save(); x.clip();
    const st = o.style || 'shingle';
    if (st === 'stripe') {
      const n = o.n || 8, c2 = o.c2 || '#f4ead2';
      for (let i = 0; i < n; i++) {
        if (i % 2) continue;
        const a0 = i / n * Math.PI, a1 = (i + 1) / n * Math.PI;
        x.fillStyle = c2; x.beginPath(); x.moveTo(0, yt); x.lineTo(Math.cos(a0) * r * flare * 1.05, yb + Math.sin(a0) * ry * flare * 1.05); x.ellipse(0, yb, r * flare * 1.05, ry * flare * 1.05, 0, a0, a1); x.closePath(); x.fill();
      }
    } else if (st === 'thatch') {
      const rnd = R(o.seed || 4);
      x.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        const a = rnd() * Math.PI, f0 = 0.15 + rnd() * 0.5, f1 = f0 + 0.25 + rnd() * 0.35;
        const p = t => [Math.cos(a) * r * flare * t, L(yt, yb, t) + Math.sin(a) * ry * flare * t];
        const [ax, ay] = p(f0), [bx, by] = p(Math.min(1.05, f1));
        x.strokeStyle = rgba(rnd() < 0.5 ? shade(c, 0.3) : shade(c, -0.3), 0.5); x.lineWidth = lw(x, u, 0.012);
        x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      }
      x.lineCap = 'butt';
      for (const f of [0.5, 0.78]) { x.strokeStyle = rgba(shade(c, -0.45), 0.5); x.lineWidth = lw(x, u, 0.016); x.beginPath(); x.ellipse(0, L(yt, yb, f), r * flare * f, ry * flare * f, 0, 0.05, Math.PI - 0.05); x.stroke(); }
    } else {
      // 魚鱗瓦／石板：一排排弧形瓦片
      const rows = o.rows || Math.max(4, Math.round(h / (u * 0.07)));
      for (let j = 1; j <= rows; j++) {
        const f = j / rows, yy = L(yt, yb, f), rr = r * flare * f, n = Math.max(3, Math.round(rr * Math.PI / (u * (st === 'slate' ? 0.07 : 0.055))));
        if (j % 2 === 0) { x.fillStyle = rgba(shade(c, 0.1), 0.35); x.beginPath(); x.ellipse(0, yy, rr, rr * K, 0, 0, Math.PI); x.ellipse(0, L(yt, yb, (j - 1) / rows), r * flare * (j - 1) / rows, r * flare * (j - 1) / rows * K, 0, Math.PI, 0, true); x.closePath(); x.fill(); }
        x.strokeStyle = rgba(shade(c, -0.5), 0.45); x.lineWidth = lw(x, u, 0.01);
        x.beginPath();
        for (let i = 0; i < n; i++) {
          const a0 = i / n * Math.PI + (j % 2) * 0.5 / n * Math.PI, a1 = a0 + Math.PI / n;
          const x0 = Math.cos(a0) * rr, y0 = yy + Math.sin(a0) * rr * K, x1 = Math.cos(a1) * rr, y1 = yy + Math.sin(a1) * rr * K;
          x.moveTo(x0, y0);
          if (st === 'slate') x.lineTo(x1, y1);
          else x.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + u * 0.03, x1, y1);
        }
        x.stroke();
      }
    }
    x.fillStyle = lgrad(x, -r, 0, r, 0, [[0, LIGHT + '.32)'], [0.38, LIGHT + '.02)'], [0.7, DARK + '.18)'], [1, DARK + '.42)']]);
    x.fillRect(-r * flare - 2, yt - 2, r * flare * 2 + 4, h + ry * flare + 4);
    x.fillStyle = lgrad(x, 0, yt, 0, yb + ry, [[0, 'rgba(0,0,0,0)'], [0.85, 'rgba(0,0,0,0)'], [1, DARK + '.25)']]);
    x.fillRect(-r * flare - 2, yt - 2, r * flare * 2 + 4, h + ry * flare + 4);
    x.restore();
    shape(); edge(x, u, c);
    if (o.valance) {
      // 帳篷下緣的波浪布邊
      const n = 9, vr = r * flare, vh = u * 0.05;
      x.beginPath(); x.ellipse(0, yb, vr, vr * K, 0, 0, Math.PI);
      for (let i = n; i >= 0; i--) { const a = i / n * Math.PI; const px = Math.cos(a) * vr, py = yb + Math.sin(a) * vr * K; if (i < n) { const am = (i + 0.5) / n * Math.PI; x.quadraticCurveTo(Math.cos(am) * vr, yb + Math.sin(am) * vr * K + vh * 2, px, py); } else x.lineTo(px, py); }
      x.closePath(); fe(x, u, lgrad(x, -vr, 0, vr, 0, [shade(o.valance, 0.2), o.valance, shade(o.valance, -0.35)]), o.valance);
    }
    if (o.finial) { line(x, 0, yt + u * 0.02, 0, yt - u * 0.1, '#6a5030', lw(x, u, 0.03)); circ(x, 0, yt - u * 0.11, u * 0.028, o.finial); circ(x, -u * 0.008, yt - u * 0.12, u * 0.009, 'rgba(255,255,255,.8)'); }
  }

  // ───────── 角朝前的方柱（立體感最強的方塔畫法） ─────────
  // 底中心 (cx, yb)；w = 左右兩角距離；h 高；o.wt 頂寬（錐形）；o.tex: stone / brick / plank / log / plate / plaster
  function prism(x, u, cx, yb, w, h, c, o) {
    o = o || {};
    const wt = o.wt || w, d0 = w * K / 2, d1 = wt * K / 2, yt = yb - h;
    const faces = [
      { pts: [cx - w / 2, yb, cx, yb + d0, cx, yt + d1, cx - wt / 2, yt], lit: o.litL == null ? 0.04 : o.litL, side: -1 },
      { pts: [cx, yb + d0, cx + w / 2, yb, cx + wt / 2, yt, cx, yt + d1], lit: o.litR == null ? -0.24 : o.litR, side: 1 },
    ];
    for (const F of faces) {
      const cc = shade(F.lit >= 0 ? c : c, F.lit);
      path(x, F.pts); x.fillStyle = cc; x.fill();
      x.save(); x.clip();
      faceTex(x, u, cx, yb, w, wt, h, cc, F.side, o);
      // 由上往下的明暗＋接角處的亮線
      x.fillStyle = lgrad(x, 0, yt, 0, yb + d0, [[0, LIGHT + (F.side < 0 ? '.14)' : '.04)')], [0.7, 'rgba(0,0,0,0)'], [1, DARK + '.28)']]);
      x.fillRect(cx - w, yt - d1 - 2, w * 2, h + d0 + d1 + 4);
      if (F.side < 0) { x.fillStyle = lgrad(x, cx - w / 2, 0, cx, 0, [[0, LIGHT + '.0)'], [0.85, LIGHT + '.0)'], [1, LIGHT + '.22)']]); x.fillRect(cx - w, yt - d1 - 2, w, h + d0 + d1 + 4); }
      else { x.fillStyle = lgrad(x, cx, 0, cx + w / 2, 0, [[0, DARK + '.0)'], [0.85, DARK + '.12)'], [1, 'rgba(190,210,255,.12)']]); x.fillRect(cx, yt - d1 - 2, w, h + d0 + d1 + 4); }
      x.restore();
      path(x, F.pts); edge(x, u, c);
    }
    if (o.top !== false) { path(x, [cx - wt / 2, yt, cx, yt - d1, cx + wt / 2, yt, cx, yt + d1]); fe(x, u, lgrad(x, cx - wt / 2, yt - d1, cx + wt / 2, yt + d1, [shade(o.top || c, 0.24), o.top || c, shade(o.top || c, -0.12)]), o.top || c); }
  }
  // 面上的紋理：沿著面的斜度畫（左面往右下斜、右面往右上斜）
  function faceTex(x, u, cx, yb, w, wt, h, c, side, o) {
    const tex = o.tex || 'stone', yt = yb - h;
    const xa = side < 0 ? cx - Math.max(w, wt) / 2 : cx, xb = side < 0 ? cx : cx + Math.max(w, wt) / 2;
    const sl = side < 0 ? K : -K; // 每往右 1 單位，y 的變化
    const yAt = (px, y0) => y0 + (px - xa) * sl; // y0 = xa 處的 y
    if (tex === 'stone' || tex === 'brick') {
      const rh = o.rh || u * (tex === 'brick' ? 0.055 : 0.08), rnd = R((o.seed || 11) + side * 7);
      const bw = rh * (tex === 'brick' ? 2.1 : 1.6);
      for (let j = 0, y = yb + (side < 0 ? 0 : w * K / 2); y > yt - w * K; j++, y -= rh) {
        for (let px = xa - (j % 2) * bw / 2; px < xb; px += bw) {
          const p0 = Math.max(xa, px), p1 = Math.min(xb, px + bw);
          x.fillStyle = shade(c, (rnd() - 0.5) * (o.jit || 0.14));
          path(x, [p0, yAt(p0, y - rh), p1, yAt(p1, y - rh), p1, yAt(p1, y), p0, yAt(p0, y)]); x.fill();
        }
        x.strokeStyle = rgba('#24141c', 0.2); x.lineWidth = lw(x, u, 0.008);
        x.beginPath(); x.moveTo(xa, yAt(xa, y)); x.lineTo(xb, yAt(xb, y)); x.stroke();
        for (let px = xa - (j % 2) * bw / 2 + bw; px < xb; px += bw) { x.beginPath(); x.moveTo(px, yAt(px, y - rh)); x.lineTo(px, yAt(px, y)); x.stroke(); }
        x.strokeStyle = rgba('#ffffff', 0.1); x.beginPath(); x.moveTo(xa, yAt(xa, y - rh) + lw(x, u, 0.012)); x.lineTo(xb, yAt(xb, y - rh) + lw(x, u, 0.012)); x.stroke();
      }
    } else if (tex === 'plank') {
      const n = o.n || 5, rnd = R((o.seed || 5) + side);
      for (let i = 0; i < n; i++) { const p0 = L(xa, xb, i / n), p1 = L(xa, xb, (i + 1) / n); x.fillStyle = shade(c, (rnd() - 0.5) * 0.14); path(x, [p0, yt - u, p1, yt - u, p1, yb + u, p0, yb + u]); x.fill(); }
      x.strokeStyle = rgba('#24141c', 0.25); x.lineWidth = lw(x, u, 0.008);
      for (let i = 1; i < n; i++) { const p = L(xa, xb, i / n); x.beginPath(); x.moveTo(p, yt - u); x.lineTo(p, yb + u); x.stroke(); }
    } else if (tex === 'log') {
      const rh = o.rh || u * 0.06;
      for (let j = 0, y = yb + w * K / 2; y > yt - w * K; j++, y -= rh) {
        x.fillStyle = shade(c, (j % 3) * 0.04 - 0.04); path(x, [xa, yAt(xa, y - rh), xb, yAt(xb, y - rh), xb, yAt(xb, y), xa, yAt(xa, y)]); x.fill();
        x.strokeStyle = rgba('#ffffff', 0.16); x.lineWidth = lw(x, u, 0.01); x.beginPath(); x.moveTo(xa, yAt(xa, y - rh * 0.72)); x.lineTo(xb, yAt(xb, y - rh * 0.72)); x.stroke();
        x.strokeStyle = rgba('#24141c', 0.3); x.beginPath(); x.moveTo(xa, yAt(xa, y)); x.lineTo(xb, yAt(xb, y)); x.stroke();
      }
      // 圓木端頭
      for (let j = 0, y = yb + (side < 0 ? 0 : w * K / 2); y > yt; j++, y -= rh) { const ex = side < 0 ? xa + u * 0.012 : xb - u * 0.012; if (j % 1 === 0) { circ(x, ex, yAt(ex, y - rh / 2), rh * 0.42, shade(c, 0.3)); x.strokeStyle = rgba(shade(c, -0.4), 0.5); x.lineWidth = lw(x, u, 0.006); x.beginPath(); x.arc(ex, yAt(ex, y - rh / 2), rh * 0.22, 0, TAU); x.stroke(); } }
    } else if (tex === 'plate') {
      const ph = u * 0.12, rnd = R(3 + side);
      for (let y = yb + w * K / 2; y > yt - w * K; y -= ph) {
        x.fillStyle = shade(c, (rnd() - 0.5) * 0.08); path(x, [xa, yAt(xa, y - ph), xb, yAt(xb, y - ph), xb, yAt(xb, y), xa, yAt(xa, y)]); x.fill();
        x.strokeStyle = rgba('#1a1a14', 0.3); x.lineWidth = lw(x, u, 0.008); x.beginPath(); x.moveTo(xa, yAt(xa, y)); x.lineTo(xb, yAt(xb, y)); x.stroke();
        for (let px = xa + u * 0.03; px < xb; px += u * 0.06) circ(x, px, yAt(px, y - u * 0.012), u * 0.008, rgba('#ffffff', 0.4));
      }
    } else if (tex === 'plaster') {
      const rnd = R(7 + side);
      for (let i = 0; i < 5; i++) { const px = L(xa, xb, rnd()), py = L(yt, yb, rnd()); x.fillStyle = rgba('#000000', 0.05); x.beginPath(); x.ellipse(px, py, u * 0.05, u * 0.03, 0, 0, TAU); x.fill(); }
    }
  }
  // 角朝前的金字塔屋頂：底在 yb（屋簷兩側的角），w 寬、h 高
  function pyr(x, u, cx, yb, w, h, c, o) {
    o = o || {};
    const d = w * K / 2, yt = yb - h, st = o.style || 'shingle';
    const faces = [[cx - w / 2, yb, cx, yb + d, cx, yt, 0.08, -1], [cx, yb + d, cx + w / 2, yb, cx, yt, -0.3, 1]];
    for (const [ax, ay, bx, by, , , lit, side] of faces.map(f => [f[0], f[1], f[2], f[3], f[4], f[5], f[6], f[7]])) {
      const cc = shade(c, lit);
      path(x, [ax, ay, bx, by, cx, yt]); x.fillStyle = cc; x.fill();
      x.save(); x.clip();
      const rows = o.rows || Math.max(4, Math.round(h / (u * 0.065)));
      for (let j = 0; j < rows; j++) {
        const f = j / rows, f2 = (j + 1) / rows;
        const p0x = L(ax, cx, f), p0y = L(ay, yt, f), p1x = L(bx, cx, f), p1y = L(by, yt, f);
        if (st === 'thatch') {
          x.strokeStyle = rgba(shade(c, j % 2 ? 0.25 : -0.25), 0.45); x.lineWidth = lw(x, u, 0.01);
          const rnd = R(j * 13 + side);
          for (let i = 0; i < 9; i++) { const t = rnd(); const sx = L(p0x, p1x, t), sy = L(p0y, p1y, t); x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (cx - sx) * 0.18, sy + (yt - sy) * 0.18); x.stroke(); }
          x.strokeStyle = rgba(shade(c, -0.45), 0.4); x.lineWidth = lw(x, u, 0.014); x.beginPath(); x.moveTo(p0x, p0y); x.lineTo(p1x, p1y); x.stroke();
        } else {
          if (j % 2) { x.fillStyle = rgba(shade(c, 0.12), 0.3); path(x, [p0x, p0y, p1x, p1y, L(bx, cx, f2), L(by, yt, f2), L(ax, cx, f2), L(ay, yt, f2)]); x.fill(); }
          const n = Math.max(2, Math.round(Math.hypot(p1x - p0x, p1y - p0y) / (u * 0.06)));
          x.strokeStyle = rgba(shade(c, -0.5), 0.45); x.lineWidth = lw(x, u, 0.01); x.beginPath();
          for (let i = 0; i < n; i++) { const t0 = (i + (j % 2) * 0.5) / n, t1 = Math.min(1, t0 + 1 / n); const x0 = L(p0x, p1x, t0), y0 = L(p0y, p1y, t0), x1 = L(p0x, p1x, t1), y1 = L(p0y, p1y, t1); x.moveTo(x0, y0); if (st === 'slate') x.lineTo(x1, y1); else x.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + u * 0.025, x1, y1); }
          x.stroke();
        }
      }
      x.fillStyle = lgrad(x, 0, yt, 0, yb + d, [[0, side < 0 ? LIGHT + '.18)' : 'rgba(0,0,0,0)'], [1, DARK + '.22)']]); x.fillRect(cx - w, yt - 2, w * 2, h + d + 4);
      x.restore();
      path(x, [ax, ay, bx, by, cx, yt]); edge(x, u, c);
    }
    // 屋簷厚度
    path(x, [cx - w / 2, yb, cx, yb + d, cx + w / 2, yb, cx + w / 2, yb + u * 0.03, cx, yb + d + u * 0.03, cx - w / 2, yb + u * 0.03]); fe(x, u, shade(c, -0.4), c, 0.01);
    if (o.finial) { line(x, cx, yt + u * 0.02, cx, yt - u * 0.12, '#5a4030', lw(x, u, 0.028)); circ(x, cx, yt - u * 0.13, u * 0.028, o.finial); circ(x, cx - u * 0.008, yt - u * 0.14, u * 0.009, 'rgba(255,255,255,.8)'); }
  }
  // 木樑（四角木）：帶亮面與端頭
  function beam(x, u, x0, y0, x1, y1, w, c) {
    const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
    path(x, [x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny]);
    fe(x, u, c, c, 0.01);
    x.strokeStyle = rgba('#ffffff', 0.22); x.lineWidth = w * 0.28; x.beginPath(); x.moveTo(x0 - nx * 0.45, y0 - ny * 0.45); x.lineTo(x1 - nx * 0.45, y1 - ny * 0.45); x.stroke();
    x.strokeStyle = rgba('#000000', 0.18); x.lineWidth = w * 0.25; x.beginPath(); x.moveTo(x0 + nx * 0.5, y0 + ny * 0.5); x.lineTo(x1 + nx * 0.5, y1 + ny * 0.5); x.stroke();
  }
  // 圓木（帶樹皮色、圓頭）
  function log(x, u, x0, y0, x1, y1, w, c) {
    x.lineCap = 'round';
    x.strokeStyle = edgeC(c); x.lineWidth = w + lw(x, u, 0.012) * 2; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.strokeStyle = c; x.lineWidth = w; x.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
    x.strokeStyle = rgba('#ffe8c8', 0.3); x.lineWidth = w * 0.3; x.beginPath(); x.moveTo(x0 - nx * w * 0.2, y0 - ny * w * 0.2); x.lineTo(x1 - nx * w * 0.2, y1 - ny * w * 0.2); x.stroke();
    x.strokeStyle = rgba('#2a1408', 0.25); x.lineWidth = w * 0.22; x.beginPath(); x.moveTo(x0 + nx * w * 0.28, y0 + ny * w * 0.28); x.lineTo(x1 + nx * w * 0.28, y1 + ny * w * 0.28); x.stroke();
    x.lineCap = 'butt';
  }
  // 繩子綁結
  function lash(x, u, cx, cy, s) {
    x.strokeStyle = '#d8c08a'; x.lineWidth = lw(x, u, 0.012);
    for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(cx - s, cy + i * s * 0.5 - s * 0.3); x.lineTo(cx + s, cy + i * s * 0.5 + s * 0.3); x.stroke(); }
  }
  // 掛在牆上的長旗
  function banner(x, u, cx, ty, w, h, c, emblem, o) {
    o = o || {};
    x.beginPath(); x.moveTo(cx - w / 2, ty); x.lineTo(cx + w / 2, ty); x.lineTo(cx + w / 2, ty + h); x.lineTo(cx, ty + h * 0.8); x.lineTo(cx - w / 2, ty + h); x.closePath();
    fe(x, u, lgrad(x, cx - w / 2, 0, cx + w / 2, 0, [shade(c, 0.22), c, shade(c, -0.12), shade(c, 0.05), shade(c, -0.3)]), c);
    x.save(); x.clip();
    x.fillStyle = lgrad(x, 0, ty, 0, ty + h, [[0, 'rgba(0,0,0,.15)'], [0.2, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.12)']]); x.fillRect(cx - w, ty, w * 2, h);
    x.fillStyle = o.trim || '#f2c14e'; x.fillRect(cx - w / 2, ty, w, Math.max(1, u * 0.018));
    x.fillRect(cx - w / 2, ty, Math.max(0.8, u * 0.01), h); x.fillRect(cx + w / 2 - Math.max(0.8, u * 0.01), ty, Math.max(0.8, u * 0.01), h);
    x.restore();
    const ey = ty + h * 0.42, er = w * 0.27;
    if (emblem === 'star') Gfx.star(x, cx, ey, er * 1.05, o.ec || '#ffe08a', false);
    else if (emblem === 'arrow') { line(x, cx, ey + er, cx, ey - er, o.ec || '#ffe08a', lw(x, u, 0.016)); path(x, [cx, ey - er * 1.3, cx - er * 0.45, ey - er * 0.6, cx + er * 0.45, ey - er * 0.6]); x.fillStyle = o.ec || '#ffe08a'; x.fill(); }
    else if (emblem === 'eye') { x.fillStyle = o.ec || '#ffe08a'; x.beginPath(); x.ellipse(cx, ey, er * 1.1, er * 0.6, 0, 0, TAU); x.fill(); circ(x, cx, ey, er * 0.38, c); }
    else if (emblem === 'cross') { x.strokeStyle = o.ec || '#ffe08a'; x.lineWidth = lw(x, u, 0.012); x.beginPath(); x.arc(cx, ey, er * 0.8, 0, TAU); x.moveTo(cx - er * 1.2, ey); x.lineTo(cx + er * 1.2, ey); x.moveTo(cx, ey - er * 1.2); x.lineTo(cx, ey + er * 1.2); x.stroke(); }
    else if (emblem === 'bolt') { path(x, [cx + er * 0.3, ey - er * 1.2, cx - er * 0.5, ey + er * 0.1, cx, ey + er * 0.1, cx - er * 0.3, ey + er * 1.2, cx + er * 0.55, ey - er * 0.15, cx + er * 0.05, ey - er * 0.15]); x.fillStyle = o.ec || '#ffe08a'; x.fill(); }
    else if (emblem === 'flake') { x.strokeStyle = o.ec || '#e8fbff'; x.lineWidth = lw(x, u, 0.012); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; x.beginPath(); x.moveTo(cx - Math.cos(a) * er, ey - Math.sin(a) * er); x.lineTo(cx + Math.cos(a) * er, ey + Math.sin(a) * er); x.stroke(); } }
    else if (emblem) circ(x, cx, ey, er * 0.8, o.ec || 'rgba(255,255,255,.85)');
    beam(x, u, cx - w * 0.65, ty - u * 0.006, cx + w * 0.65, ty - u * 0.006, u * 0.022, '#6b4a2a');
  }
  // 拱形窗／門洞（角朝前的面上要斜一點：用 skew）
  function arch(x, u, cx, cy, w, h, fill, sk, glowC) {
    x.save(); x.translate(cx, cy); if (sk) x.transform(1, sk, 0, 1, 0, 0);
    x.beginPath(); x.moveTo(-w / 2, h / 2); x.lineTo(-w / 2, -h / 2 + w / 2); x.arc(0, -h / 2 + w / 2, w / 2, Math.PI, 0); x.lineTo(w / 2, h / 2); x.closePath();
    fe(x, u, fill || '#2a1e2a', '#5a4a50', 0.01);
    if (glowC) { x.fillStyle = rgba(glowC, 0.9); x.beginPath(); x.moveTo(-w * 0.3, h / 2); x.lineTo(-w * 0.3, -h / 2 + w / 2); x.arc(0, -h / 2 + w / 2, w * 0.3, Math.PI, 0); x.lineTo(w * 0.3, h / 2); x.closePath(); x.fill(); x.fillStyle = rgba('#fff7d0', 0.6); x.fillRect(-w * 0.22, -h * 0.15, w * 0.14, h * 0.5); }
    x.restore();
  }
  function slit(x, u, cx, cy, h, sk) { x.save(); x.translate(cx, cy); if (sk) x.transform(1, sk, 0, 1, 0, 0); x.fillStyle = '#1e1620'; x.fillRect(-u * 0.012, -h / 2, u * 0.024, h); x.fillRect(-u * 0.03, -u * 0.01, u * 0.06, u * 0.02); x.restore(); }
  // 有面的石頭
  function rock(x, u, cx, cy, rx, ry, c, seed, snow) {
    const r = R(seed || 1), n = 7, pts = [];
    for (let i = 0; i < n; i++) { const a = Math.PI + i / (n - 1) * Math.PI, k = 0.82 + r() * 0.3; pts.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * 1.6); }
    pts.push(cx + rx * 0.95, cy + ry * 0.25, cx + rx * 0.4, cy + ry * 0.55, cx - rx * 0.45, cy + ry * 0.5, cx - rx * 0.98, cy + ry * 0.2);
    path(x, pts); x.fillStyle = c; x.fill();
    x.save(); x.clip();
    path(x, [cx - rx * 1.2, cy - ry * 2, cx + rx * 0.1, cy - ry * 2, cx - rx * 0.05, cy + ry, cx - rx * 1.2, cy + ry]); x.fillStyle = rgba('#ffffff', 0.16); x.fill();
    path(x, [cx + rx * 0.35, cy - ry * 2, cx + rx * 1.2, cy - ry * 2, cx + rx * 1.2, cy + ry, cx + rx * 0.25, cy + ry]); x.fillStyle = rgba('#140a20', 0.22); x.fill();
    x.fillStyle = lgrad(x, 0, cy - ry * 1.6, 0, cy + ry * 0.6, [[0, 'rgba(0,0,0,0)'], [0.7, 'rgba(0,0,0,0)'], [1, DARK + '.3)']]); x.fillRect(cx - rx * 1.3, cy - ry * 2, rx * 2.6, ry * 3);
    if (snow) { x.fillStyle = snow; x.beginPath(); x.moveTo(cx - rx * 1.1, cy - ry * 0.9); for (let i = 0; i <= 6; i++) { const t = i / 6; x.lineTo(L(cx - rx * 0.95, cx + rx * 0.9, t), cy - ry * 1.62 * Math.sin(t * Math.PI * 0.9 + 0.2) + (i % 2) * ry * 0.25); } x.lineTo(cx + rx * 1.1, cy - ry * 0.4); x.lineTo(cx - rx * 1.1, cy - ry * 2.5); x.closePath(); x.globalCompositeOperation = 'source-atop'; x.fill(); x.globalCompositeOperation = 'source-over'; }
    x.restore();
    path(x, pts); edge(x, u, c);
  }
  // 小山丘／岩堆：底中心 (cx, yb)、寬 w、高 h；o.peak 山頂偏移、o.flat 平頂寬、o.cap 頂上的草或雪、o.cd 頂蓋厚度
  function mound(x, u, cx, yb, w, h, c, o) {
    o = o || {};
    const r = R(o.seed || 1), n = 12, pk = o.peak || 0, fl = o.flat || 0;
    const prof = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, px = cx - w / 2 + w * t;
      let k = Math.sin(Math.min(1, Math.max(0, (t - (pk * 0.5))) / (1 - Math.abs(pk) * 0.5)) * Math.PI);
      k = Math.pow(Math.max(0, k), 0.65);
      if (fl && Math.abs(px - cx) < fl / 2) k = 1;
      const j = (i === 0 || i === n) ? 0 : (r() - 0.5) * 0.16;
      prof.push(px, yb - h * Math.min(1, k + j * k));
    }
    const shape = () => {
      x.beginPath(); x.moveTo(prof[0], prof[1]);
      for (let i = 2; i < prof.length - 2; i += 2) x.quadraticCurveTo(prof[i], prof[i + 1], (prof[i] + prof[i + 2]) / 2, (prof[i + 1] + prof[i + 3]) / 2);
      x.lineTo(prof[prof.length - 2], prof[prof.length - 1]);
      x.ellipse(cx, yb, w / 2, w / 2 * K * 0.55, 0, 0, Math.PI); x.closePath();
    };
    shape(); x.fillStyle = c; x.fill();
    x.save(); x.clip();
    // 岩塊：一塊塊有亮面暗面的石頭
    for (let i = 0; i < (o.rocks || 7); i++) {
      const t = 0.1 + r() * 0.8, px = cx - w / 2 + w * t, idx = Math.round(t * n) * 2, top = prof[idx + 1], py = L(top, yb, 0.25 + r() * 0.6), rw = u * (0.06 + r() * 0.06), rh = rw * (0.6 + r() * 0.3);
      path(x, [px - rw, py + rh * 0.3, px - rw * 0.7, py - rh, px + rw * 0.4, py - rh * 1.1, px + rw, py - rh * 0.2, px + rw * 0.8, py + rh * 0.5, px - rw * 0.3, py + rh * 0.6]);
      x.fillStyle = shade(c, 0.12 + r() * 0.08); x.fill();
      path(x, [px + rw * 0.1, py - rh * 1.05, px + rw, py - rh * 0.2, px + rw * 0.8, py + rh * 0.5, px + rw * 0.1, py + rh * 0.2]); x.fillStyle = shade(c, -0.18); x.fill();
    }
    x.fillStyle = lgrad(x, cx - w / 2, 0, cx + w / 2, 0, [[0, LIGHT + '.2)'], [0.4, LIGHT + '.0)'], [0.75, DARK + '.12)'], [1, DARK + '.35)']]); x.fillRect(cx - w, yb - h * 1.5, w * 2, h * 2);
    if (o.cap) {
      const d = o.cd || u * 0.06;
      // 沿著山脊的一條帶子（兩端漸細）
      x.beginPath(); x.moveTo(prof[0], prof[1] - u * 0.05);
      for (let i = 0; i < prof.length; i += 2) x.lineTo(prof[i], prof[i + 1] - u * 0.05);
      for (let i = prof.length - 2; i >= 0; i -= 2) { const t = i / (prof.length - 2), taper = Math.sin(t * Math.PI); x.lineTo(prof[i], prof[i + 1] + d * taper * (0.6 + 0.6 * Math.abs(Math.sin(i * 1.7)))); }
      x.closePath();
      x.fillStyle = o.cap; x.fill();
      x.fillStyle = lgrad(x, cx - w / 2, 0, cx + w / 2, 0, [[0, LIGHT + '.15)'], [0.6, LIGHT + '0)'], [1, DARK + '.2)']]); x.fill();
    }
    x.fillStyle = lgrad(x, 0, yb - h, 0, yb + w * K * 0.3, [[0, 'rgba(0,0,0,0)'], [0.75, 'rgba(0,0,0,0)'], [1, DARK + '.32)']]); x.fillRect(cx - w, yb - h * 1.5, w * 2, h * 2);
    x.restore();
    shape(); edge(x, u, c);
    return prof;
  }
  // 六角冰晶（中脊亮、右面暗、內部微光）
  function ice(x, u, cx, yb, w, h, c, tilt, o) {
    o = o || {};
    x.save(); x.translate(cx, yb); x.rotate(tilt || 0);
    const P = [-w, 0, -w, -h * 0.72, -w * 0.35, -h * 0.9, 0, -h, w * 0.4, -h * 0.88, w, -h * 0.7, w, 0, 0, w * 0.3];
    path(x, P); x.fillStyle = c; x.fill();
    x.save(); x.clip();
    path(x, [-w * 1.1, w, -w * 1.1, -h * 0.75, -w * 0.35, -h * 0.92, -w * 0.1, -h, -w * 0.1, w]); x.fillStyle = rgba('#ffffff', 0.4); x.fill();
    path(x, [w * 0.3, w, w * 0.3, -h * 0.9, w * 1.1, -h * 0.72, w * 1.1, w]); x.fillStyle = rgba(o.dk || '#3a6a9a', 0.32); x.fill();
    x.fillStyle = rgrad(x, 0, -h * 0.4, 0, h * 0.6, [rgba('#ffffff', o.core || 0.45), rgba('#ffffff', 0)]); x.fillRect(-w * 1.2, -h * 1.1, w * 2.4, h * 1.2);
    x.strokeStyle = rgba('#ffffff', 0.85); x.lineWidth = lw(x, u, 0.01); x.beginPath(); x.moveTo(-w * 0.6, -h * 0.08); x.lineTo(-w * 0.62, -h * 0.66); x.stroke();
    x.restore();
    path(x, P); x.strokeStyle = rgba(o.ec || '#2a5a8a', 0.6); x.lineWidth = lw(x, u, 0.01); x.lineJoin = 'round'; x.stroke();
    x.restore();
  }
  // 冰柱（往下垂）
  function icicles(x, u, x0, x1, y, n, seed, c) {
    const r = R(seed || 3);
    x.fillStyle = c || 'rgba(225,248,255,.92)';
    for (let i = 0; i < n; i++) { const px = L(x0, x1, (i + 0.5) / n), w = u * (0.012 + r() * 0.012), l = u * (0.04 + r() * 0.07); x.beginPath(); x.moveTo(px - w, y); x.lineTo(px, y + l); x.lineTo(px + w, y); x.closePath(); x.fill(); }
  }
  // 小東西：木桶、砲彈堆、麻袋、箭捆、箱子
  function barrel(x, u, cx, yb, r, h, c) {
    x.save(); x.translate(cx, 0); drum(x, u, yb, r, h, c || '#9a6434', { tex: 'wood', n: 6, top: shade(c || '#9a6434', 0.2) });
    for (const f of [0.25, 0.75]) { x.strokeStyle = '#4a4a52'; x.lineWidth = lw(x, u, 0.016); x.beginPath(); x.ellipse(0, L(yb, yb - h, f), r * 1.02, r * K, 0, 0.05, Math.PI - 0.05); x.stroke(); }
    x.restore();
  }
  function balls(x, u, cx, cy, s, n) {
    const pos = n >= 6 ? [[-1, 0], [0, 0], [1, 0], [-0.5, -0.8], [0.5, -0.8], [0, -1.6]] : [[-0.5, 0], [0.5, 0], [0, -0.8]];
    for (const [dx, dy] of pos) { const px = cx + dx * s * 2, py = cy + dy * s * 1.05; circ(x, px, py, s, rgrad(x, px, py, s * 0.1, s, ['#7a808a', '#3a3e46', '#1e2026'], -s * 0.35, -s * 0.4)); x.strokeStyle = 'rgba(20,20,30,.5)'; x.lineWidth = lw(x, u, 0.008); x.stroke(); }
  }
  function sack(x, u, cx, cy, w, h, c) {
    c = c || '#c8ad7a';
    x.beginPath(); x.moveTo(cx - w * 0.5, cy); x.quadraticCurveTo(cx - w * 0.58, cy - h * 0.9, cx - w * 0.2, cy - h); x.quadraticCurveTo(cx, cy - h * 0.82, cx + w * 0.2, cy - h); x.quadraticCurveTo(cx + w * 0.6, cy - h * 0.9, cx + w * 0.5, cy); x.quadraticCurveTo(cx, cy + h * 0.18, cx - w * 0.5, cy); x.closePath();
    fe(x, u, lgrad(x, cx - w / 2, cy - h, cx + w / 2, cy, [shade(c, 0.22), c, shade(c, -0.3)]), c, 0.01);
    x.strokeStyle = rgba(shade(c, -0.45), 0.4); x.lineWidth = lw(x, u, 0.008); x.beginPath(); x.moveTo(cx - w * 0.15, cy - h * 0.8); x.quadraticCurveTo(cx, cy - h * 0.5, cx + w * 0.05, cy - h * 0.15); x.stroke();
  }
  function crate(x, u, cx, yb, s, c) { prism(x, u, cx, yb, s, s * 0.7, c || '#a8783e', { tex: 'plank', n: 3 }); }
  function arrows(x, u, cx, yb, n) {
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.16, l = u * 0.2; const tx = cx + Math.cos(a) * l, ty = yb + Math.sin(a) * l; line(x, cx, yb, tx, ty, '#8a5a2e', lw(x, u, 0.014)); path(x, [tx + Math.cos(a) * u * 0.03, ty + Math.sin(a) * u * 0.03, tx - u * 0.014, ty + u * 0.005, tx + u * 0.014, ty + u * 0.005]); x.fillStyle = i % 2 ? '#e5484d' : '#f4ece0'; x.fill(); }
  }
  function lantern(x, u, cx, cy, on) {
    line(x, cx, cy - u * 0.05, cx, cy - u * 0.02, '#3a3a40', lw(x, u, 0.01));
    x.beginPath(); x.rect(cx - u * 0.024, cy - u * 0.02, u * 0.048, u * 0.06); fe(x, u, on === false ? '#5a5048' : '#ffd36b', '#8a6a2a', 0.01);
    if (on !== false) { x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(cx - u * 0.01, cy - u * 0.01, u * 0.012, u * 0.035); }
    x.fillStyle = '#3a3a40'; x.fillRect(cx - u * 0.03, cy - u * 0.026, u * 0.06, u * 0.01); x.fillRect(cx - u * 0.03, cy + u * 0.038, u * 0.06, u * 0.01);
  }
  // 固定的小三角旗（靜態）
  function pennant(x, u, px, py, len, c, dir) {
    dir = dir || 1;
    line(x, px, py + u * 0.02, px, py - u * 0.12, '#5a4030', lw(x, u, 0.018));
    x.beginPath(); x.moveTo(px, py - u * 0.12); x.quadraticCurveTo(px + dir * len * 0.5, py - u * 0.13, px + dir * len, py - u * 0.09); x.quadraticCurveTo(px + dir * len * 0.5, py - u * 0.08, px, py - u * 0.05); x.closePath();
    fe(x, u, c, c, 0.01);
  }

  // ───────── 箭塔：木造瞭望台 ─────────
  const WOOD = '#9a6838', WOOD2 = '#7a4e28', PLANK = '#b88a52';
  // 角朝前的木欄杆（半邊）：w 平台寬、y 平台高度
  function fenceBox(x, u, cx, y, w, h, c, part, kind) {
    const d = w * K / 2;
    const segs = part === 'front' ? [[cx - w / 2, y, cx, y + d], [cx, y + d, cx + w / 2, y]] : [[cx - w / 2, y, cx, y - d], [cx, y - d, cx + w / 2, y]];
    for (const [x0, y0, x1, y1] of segs) {
      const lit = (x1 - x0) * (y1 - y0) > 0 ? 0.04 : -0.22;
      path(x, [x0, y0, x1, y1, x1, y1 - h, x0, y0 - h]);
      const cc = shade(c, part === 'front' ? lit : -0.18);
      x.fillStyle = cc; x.fill();
      x.save(); x.clip();
      if (kind === 'wattle') {
        x.strokeStyle = rgba(shade(c, -0.45), 0.55); x.lineWidth = lw(x, u, 0.01);
        for (let i = 1; i < 4; i++) { const f = i / 4; x.beginPath(); for (let k = 0; k <= 8; k++) { const t = k / 8; const px = L(x0, x1, t), py = L(y0, y1, t) - h * f + Math.sin(k * Math.PI + i) * u * 0.008; if (k) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke(); }
        x.strokeStyle = rgba(shade(c, 0.35), 0.5); for (let k = 0; k <= 5; k++) { const t = k / 5; const px = L(x0, x1, t), py = L(y0, y1, t); x.beginPath(); x.moveTo(px, py); x.lineTo(px, py - h); x.stroke(); }
      } else {
        const n = 5; x.strokeStyle = rgba(shade(c, -0.5), 0.35); x.lineWidth = lw(x, u, 0.008);
        for (let k = 1; k < n; k++) { const t = k / n, px = L(x0, x1, t), py = L(y0, y1, t); x.beginPath(); x.moveTo(px, py); x.lineTo(px, py - h); x.stroke(); }
        x.fillStyle = rgba('#ffffff', 0.18); path(x, [x0, y0 - h, x1, y1 - h, x1, y1 - h + u * 0.016, x0, y0 - h + u * 0.016]); x.fill();
      }
      x.restore();
      path(x, [x0, y0, x1, y1, x1, y1 - h, x0, y0 - h]); edge(x, u, c);
    }
  }
  function deckBox(x, u, cx, y, w, c, th) {
    const d = w * K / 2; th = th == null ? u * 0.04 : th;
    path(x, [cx - w / 2, y, cx, y + d, cx + w / 2, y, cx + w / 2, y + th, cx, y + d + th, cx - w / 2, y + th]); fe(x, u, shade(c, -0.3), c, 0.01);
    path(x, [cx - w / 2, y, cx, y - d, cx + w / 2, y, cx, y + d]); fe(x, u, lgrad(x, cx - w / 2, y - d, cx + w / 2, y + d, [shade(c, 0.18), c, shade(c, -0.1)]), c);
    x.save(); path(x, [cx - w / 2, y, cx, y - d, cx + w / 2, y, cx, y + d]); x.clip(); x.strokeStyle = rgba(shade(c, -0.5), 0.3); x.lineWidth = lw(x, u, 0.008);
    for (let i = -5; i <= 5; i++) { const o = i * u * 0.055; x.beginPath(); x.moveTo(cx - w / 2 + o, y - u); x.lineTo(cx - w / 2 + o + u * 2, y - u + u * 2 * K); x.stroke(); }
    x.restore();
  }
  function arrowBody(x, tier, sp, u, B, T) {
    const py = -(T - 0.14 * u);
    if (tier === 0) {
      // Lv1：四根圓木撐起的草編平台，旁邊一捆箭和草靶
      const w = u * 0.5;
      if (B) {
        pad(x, u, 0);
        // 草靶
        line(x, u * 0.36, u * 0.08, u * 0.33, -u * 0.1, '#6b4a2a', lw(x, u, 0.02)); line(x, u * 0.42, u * 0.08, u * 0.4, -u * 0.08, '#6b4a2a', lw(x, u, 0.02));
        x.beginPath(); x.ellipse(u * 0.37, -u * 0.13, u * 0.075, u * 0.085, 0, 0, TAU); fe(x, u, '#e8c878', '#a88a40');
        x.beginPath(); x.ellipse(u * 0.37, -u * 0.13, u * 0.05, u * 0.058, 0, 0, TAU); x.fillStyle = '#e5484d'; x.fill(); circ(x, u * 0.37, -u * 0.13, u * 0.022, '#f4ece0'); circ(x, u * 0.37, -u * 0.13, u * 0.01, '#e5484d');
        line(x, u * 0.3, -u * 0.18, u * 0.37, -u * 0.13, '#f4ece0', lw(x, u, 0.01));
        log(x, u, 0, -u * 0.08, 0, py - u * 0.05, u * 0.045, WOOD2);
        log(x, u, -u * 0.3, u * 0.0, -u * 0.22, py, u * 0.05, WOOD);
        log(x, u, u * 0.3, u * 0.0, u * 0.22, py, u * 0.05, WOOD2);
        // 斜撐＋綁繩
        log(x, u, -u * 0.27, -u * 0.06, u * 0.2, py + u * 0.1, u * 0.026, shade(WOOD2, -0.1));
        log(x, u, u * 0.27, -u * 0.06, -u * 0.2, py + u * 0.1, u * 0.026, shade(WOOD, -0.1));
        lash(x, u, -u * 0.012, py * 0.5 - u * 0.02, u * 0.02);
        log(x, u, 0, u * 0.08, 0, py + u * 0.05, u * 0.05, WOOD);
        deckBox(x, u, 0, py, w, PLANK);
        fenceBox(x, u, 0, py, w, u * 0.09, '#b8964e', 'back', 'wattle');
        log(x, u, -u * 0.25, py + u * 0.02, -u * 0.25, py - u * 0.44, u * 0.02, '#6b4220');
        arrows(x, u, -u * 0.36, u * 0.08, 4);
        // 梯子
        x.save(); x.translate(-u * 0.12, 0);
        line(x, -u * 0.07, u * 0.14, -u * 0.02, py + u * 0.1, '#8a5a2e', lw(x, u, 0.018)); line(x, u * 0.04, u * 0.14, u * 0.07, py + u * 0.12, '#8a5a2e', lw(x, u, 0.018));
        for (let i = 1; i < 5; i++) { const f = i / 5; line(x, L(-u * 0.07, -u * 0.02, f), L(u * 0.14, py + u * 0.1, f), L(u * 0.04, u * 0.07, f), L(u * 0.14, py + u * 0.12, f), '#a8743e', lw(x, u, 0.014)); }
        x.restore();
      } else fenceBox(x, u, 0, py, w, u * 0.09, '#b8964e', 'front', 'wattle');
      return;
    }
    if (tier === 1) {
      // Lv2：石砌墩座＋方木架＋木板護牆，兩側掛盾
      const w = u * 0.6;
      if (B) {
        pad(x, u, 1);
        prism(x, u, 0, u * 0.04, u * 0.7, u * 0.14, '#a8a090', { tex: 'stone', rh: u * 0.07, top: '#a8a090' });
        const yb = -u * 0.1;
        beam(x, u, -u * 0.3, yb, -u * 0.25, py, u * 0.045, WOOD);
        beam(x, u, u * 0.3, yb, u * 0.25, py, u * 0.045, WOOD2);
        beam(x, u, 0, yb + u * 0.08, 0, py + u * 0.1, u * 0.05, WOOD);
        // X 斜撐（沿著兩個面）
        beam(x, u, -u * 0.28, yb - u * 0.02, -u * 0.02, py + u * 0.14, u * 0.026, shade(WOOD, -0.08));
        beam(x, u, -u * 0.02, yb + u * 0.06, -u * 0.26, py + u * 0.06, u * 0.026, shade(WOOD, -0.12));
        beam(x, u, u * 0.28, yb - u * 0.02, u * 0.02, py + u * 0.14, u * 0.026, shade(WOOD2, -0.08));
        beam(x, u, u * 0.02, yb + u * 0.06, u * 0.26, py + u * 0.06, u * 0.026, shade(WOOD2, -0.12));
        deckBox(x, u, 0, py, w, PLANK, u * 0.05);
        fenceBox(x, u, 0, py, w, u * 0.12, '#a8743e', 'back');
        // 角落旗竿
        line(x, -w / 2 + u * 0.02, py, -w / 2 + u * 0.02, py - u * 0.5, '#5a3a22', lw(x, u, 0.022));
        line(x, w / 2 - u * 0.02, py, w / 2 - u * 0.02, py - u * 0.4, '#5a3a22', lw(x, u, 0.022));
        pennant(x, u, w / 2 - u * 0.02, py - u * 0.28, u * 0.16, '#3a6fd8', 1);
        pennant(x, u, -w / 2 + u * 0.02, py - u * 0.38, u * 0.18, '#c8382e', 1);
      } else {
        fenceBox(x, u, 0, py, w, u * 0.12, '#a8743e', 'front');
        for (const [sx, c] of [[-0.17, '#c8382e'], [0.17, '#3a6fd8']]) shield(x, u, sx * u, py + u * 0.02 + Math.abs(sx) * u * 0.0, u * 0.07, c);
      }
      return;
    }
    // Lv3 以上：石造下半部＋木造外廊（hoarding）＋屋頂
    const spec0 = tier === 3 && sp === 0, spec1 = tier === 3 && sp === 1;
    if (spec0) return arrowRepeater(x, u, B, py);
    if (spec1) return arrowEagle(x, u, B, py);
    const w = u * 0.62, wh = u * 0.76, hy = py + u * 0.2;
    if (B) {
      pad(x, u, 2);
      prism(x, u, 0, u * 0.02, w, u * 0.02 - hy, '#bdb5a6', { wt: w * 0.9, tex: 'stone', seed: 21, top: false });
      arch(x, u, -u * 0.13, -u * 0.06, u * 0.1, u * 0.16, '#3a2a22', K);
      slit(x, u, u * 0.15, hy + u * 0.12, u * 0.08, -K);
      // 木造外廊與托架
      for (const sx of [-0.24, -0.1, 0.1, 0.24]) beam(x, u, sx * u * 0.95, hy + u * 0.07 + Math.abs(sx) * -u * 0.0, sx * u * 1.18, hy - u * 0.005, u * 0.026, WOOD2);
      prism(x, u, 0, hy, wh, hy - py - u * 0.0 + u * 0.0, '#9a6a3c', { tex: 'plank', n: 6, top: false });
      deckBox(x, u, 0, py, wh, PLANK, u * 0.03);
      fenceBox(x, u, 0, py, wh, u * 0.1, '#8a5a30', 'back');
      // 屋頂柱＋魚鱗瓦屋頂
      line(x, -wh / 2 + u * 0.02, py, -wh / 2 + u * 0.02, py - u * 0.5, '#5a3a22', lw(x, u, 0.03));
      line(x, wh / 2 - u * 0.02, py, wh / 2 - u * 0.02, py - u * 0.5, '#4a2e1a', lw(x, u, 0.03));
      line(x, 0, py - wh * K / 2, 0, py - u * 0.5, '#4a2e1a', lw(x, u, 0.028));
      pyr(x, u, 0, py - u * 0.5, wh * 1.12, u * 0.4, '#b8503a', { finial: '#ffd36b' });
      banner(x, u, -u * 0.17, hy + u * 0.06, u * 0.11, u * 0.24, '#c8382e', 'star');
    } else {
      fenceBox(x, u, 0, py, wh, u * 0.1, '#8a5a30', 'front');
      shield(x, u, u * 0.16, py + u * 0.03, u * 0.07, '#3a6fd8');
    }
  }
  function shield(x, u, cx, cy, s, c) {
    x.beginPath(); x.moveTo(cx - s, cy - s * 0.9); x.lineTo(cx + s, cy - s * 0.9); x.lineTo(cx + s * 0.95, cy); x.quadraticCurveTo(cx + s * 0.6, cy + s * 0.75, cx, cy + s * 1.05); x.quadraticCurveTo(cx - s * 0.6, cy + s * 0.75, cx - s * 0.95, cy); x.closePath();
    fe(x, u, lgrad(x, cx - s, cy - s, cx + s, cy + s, [shade(c, 0.25), c, shade(c, -0.3)]), c, 0.01);
    x.strokeStyle = '#f2c14e'; x.lineWidth = lw(x, u, 0.01); x.beginPath(); x.moveTo(cx, cy - s * 0.8); x.lineTo(cx, cy + s * 0.9); x.moveTo(cx - s * 0.8, cy - s * 0.2); x.lineTo(cx + s * 0.8, cy - s * 0.2); x.stroke();
  }
  // 連弩塔：寬大的圓形戰廊＋紅白條紋帳篷頂，四周插滿箭捆
  function arrowRepeater(x, u, B, py) {
    const r = u * 0.4, gr = u * 0.47, gy = py + u * 0.16;
    if (B) {
      pad(x, u, 3, '#b8ac98');
      // 木樁圍籬（後半）
      for (let i = 0; i < 7; i++) { const a = Math.PI + (i + 0.5) / 7 * Math.PI; stake(x, u, Math.cos(a) * u * 0.44, Math.sin(a) * u * 0.18, u * 0.1); }
      drum(x, u, 0, r, -gy, '#b3a998', { r1: r * 0.92, tex: 'stone', seed: 33 });
      arch(x, u, 0, -u * 0.08, u * 0.12, u * 0.18, '#3a2a22');
      // 戰廊托架
      for (let i = 0; i < 7; i++) { const a = (i + 0.5) / 7 * Math.PI; beam(x, u, Math.cos(a) * r * 0.9, gy + u * 0.1 + Math.sin(a) * r * 0.9 * K, Math.cos(a) * gr * 0.95, gy + Math.sin(a) * gr * K, u * 0.024, WOOD2); }
      drum(x, u, gy, gr, gy - py, '#9a6838', { tex: 'wood', n: 12 });
      disk(x, u, py, gr, PLANK, u * 0.025); deckPlanks(x, u, py, gr, PLANK);
      // 帳篷支柱＋條紋頂
      for (const a of [Math.PI * 1.05, Math.PI * 1.5, Math.PI * 1.95]) line(x, Math.cos(a) * gr * 0.92, py + Math.sin(a) * gr * K * 0.92, Math.cos(a) * gr * 0.92, py - u * 0.52 + Math.sin(a) * gr * K * 0.92, '#5a3a22', lw(x, u, 0.026));
      cone(x, u, py - u * 0.52, gr * 1.08, u * 0.32, '#c8382e', { style: 'stripe', n: 10, c2: '#f4ead2', conc: 0.5, valance: '#c8382e', finial: '#ffd36b' });
      for (const sx of [-1, 1]) banner(x, u, sx * r * 0.62, gy + u * 0.05, u * 0.12, u * 0.26, '#c8382e', 'arrow');
      // 箭桶
      for (const sx of [-0.4, 0.38]) { barrel(x, u, sx * u, u * 0.1, u * 0.055, u * 0.09, '#8a5a2e'); arrows(x, u, sx * u, u * 0.01, 5); }
    } else {
      merlons(x, u, py, gr, u * 0.1, '#8a5a30', 'front', 10, { w: 0.42 });
      for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI; stake(x, u, Math.cos(a) * u * 0.46, u * 0.03 + Math.sin(a) * u * 0.18, u * 0.1); }
    }
  }
  function stake(x, u, cx, yb, h) {
    path(x, [cx - u * 0.016, yb, cx - u * 0.016, yb - h * 0.8, cx, yb - h, cx + u * 0.016, yb - h * 0.8, cx + u * 0.016, yb]); fe(x, u, lgrad(x, cx - u * 0.016, 0, cx + u * 0.016, 0, ['#b07a44', '#7a4e28']), '#7a4e28', 0.01);
  }
  // 鷹眼塔：細長石柱＋高聳的銅綠尖塔，塔頂一隻金鷹
  function arrowEagle(x, u, B, py) {
    const r = u * 0.22;
    if (B) {
      pad(x, u, 3, '#c2bcae');
      drum(x, u, u * 0.02, u * 0.3, u * 0.12, '#a9a293', { r1: u * 0.28, tex: 'stone', rh: u * 0.06, seed: 41, top: '#bdb6a6' });
      drum(x, u, -u * 0.1, r * 1.05, -u * 0.1 - py - u * 0.06, '#c7c0b0', { r1: r * 0.88, tex: 'stone', seed: 42 });
      for (const f of [0.3, 0.68]) { const y = L(-u * 0.1, py, f), rr = L(r * 1.05, r * 0.88, f); x.strokeStyle = '#a8761c'; x.lineWidth = lw(x, u, 0.026); x.beginPath(); x.ellipse(0, y, rr, rr * K, 0, 0.04, Math.PI - 0.04); x.stroke(); x.strokeStyle = '#ffd36b'; x.lineWidth = lw(x, u, 0.012); x.stroke(); }
      arch(x, u, 0, -u * 0.17, u * 0.09, u * 0.14, '#3a2a22');
      arch(x, u, -u * 0.06, py + u * 0.2, u * 0.05, u * 0.09, '#2a2236', 0, '#ffcf5a');
      banner(x, u, u * 0.1, py + u * 0.1, u * 0.09, u * 0.22, '#2f7a45', 'eye', { ec: '#ffe08a' });
      // 托架與小陽台
      for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI; beam(x, u, Math.cos(a) * r * 0.85, py + u * 0.1 + Math.sin(a) * r * 0.85 * K, Math.cos(a) * u * 0.3, py + Math.sin(a) * u * 0.3 * K, u * 0.022, '#8a8072'); }
      disk(x, u, py, u * 0.32, '#c2b8a4', u * 0.035);
      merlons(x, u, py, u * 0.32, u * 0.07, '#b0a894', 'back', 9);
      for (const a of [Math.PI * 1.08, Math.PI * 1.92]) line(x, Math.cos(a) * u * 0.28, py + Math.sin(a) * u * 0.28 * K, Math.cos(a) * u * 0.28, py - u * 0.52, '#4a3a2a', lw(x, u, 0.026));
      line(x, 0, py - u * 0.3 * K, 0, py - u * 0.52, '#3a2a1a', lw(x, u, 0.026));
      // 高尖塔
      cone(x, u, py - u * 0.5, u * 0.34, u * 0.78, '#3f9a78', { style: 'slate', flare: 1, conc: 0.22 });
      x.strokeStyle = '#d8a83a'; x.lineWidth = lw(x, u, 0.02); x.beginPath(); x.ellipse(0, py - u * 0.5, u * 0.34, u * 0.34 * K, 0, 0.05, Math.PI - 0.05); x.stroke();
      eagle(x, u, 0, py - u * 1.28);
    } else merlons(x, u, py, u * 0.32, u * 0.07, '#b0a894', 'front', 9);
  }
  // 金色老鷹雕像（展翅）
  function eagle(x, u, cx, cy) {
    const g = '#e8b440';
    line(x, cx, cy + u * 0.06, cx, cy - u * 0.02, '#8a6a2a', lw(x, u, 0.02));
    for (const sd of [-1, 1]) {
      x.beginPath(); x.moveTo(cx, cy - u * 0.04); x.quadraticCurveTo(cx + sd * u * 0.1, cy - u * 0.14, cx + sd * u * 0.2, cy - u * 0.12); x.lineTo(cx + sd * u * 0.15, cy - u * 0.09); x.lineTo(cx + sd * u * 0.17, cy - u * 0.06); x.lineTo(cx + sd * u * 0.12, cy - u * 0.045); x.lineTo(cx + sd * u * 0.12, cy - u * 0.02); x.quadraticCurveTo(cx + sd * u * 0.05, cy - u * 0.02, cx, cy - u * 0.01); x.closePath();
      fe(x, u, sd < 0 ? shade(g, 0.15) : shade(g, -0.15), g, 0.01);
    }
    x.beginPath(); x.ellipse(cx, cy - u * 0.03, u * 0.03, u * 0.05, 0, 0, TAU); fe(x, u, g, g, 0.01);
    circ(x, cx + u * 0.012, cy - u * 0.085, u * 0.024, '#f4ead2'); path(x, [cx + u * 0.03, cy - u * 0.09, cx + u * 0.055, cy - u * 0.08, cx + u * 0.03, cy - u * 0.07]); x.fillStyle = '#e8a030'; x.fill();
    circ(x, cx + u * 0.018, cy - u * 0.09, u * 0.006, '#1a1a1a');
  }

  // ───────── 砲塔：矮胖石堡 ─────────
  function cannonBody(x, tier, sp, u, B, T) {
    const py = -(T - 0.05 * u);
    if (tier === 3 && sp === 1) return cannonMissile(x, u, B, py);
    if (tier === 3 && sp === 0) return cannonFort(x, u, B, py);
    if (tier === 0) {
      // Lv1：沙包＋木樁圍成的砲位
      const r = u * 0.36;
      if (B) {
        pad(x, u, 0);
        drum(x, u, 0, r * 1.02, -py, '#8a6a3e', { r1: r * 0.95, tex: 'log', rh: u * 0.08 });
        disk(x, u, py, r * 0.95, '#a88a5a', 0);
        x.save(); x.beginPath(); x.ellipse(0, py, r * 0.95, r * 0.95 * K, 0, 0, TAU); x.clip(); x.fillStyle = rgba('#5a4028', 0.25); x.beginPath(); x.ellipse(0, py, r * 0.6, r * 0.6 * K, 0, 0, TAU); x.fill(); x.restore();
        sackRing(x, u, py, r * 0.95, 'back', 7);
        balls(x, u, u * 0.36, u * 0.1, u * 0.028, 3);
        barrel(x, u, -u * 0.37, u * 0.1, u * 0.05, u * 0.09, '#7a4a28');
      } else sackRing(x, u, py, r * 0.95, 'front', 7);
      return;
    }
    // Lv2 / Lv3：下寬上窄的石堡，城垛、鐵箍、砲口
    const big = tier >= 2, r0 = u * (big ? 0.46 : 0.42), r1 = u * (big ? 0.39 : 0.36), c = big ? '#a8a194' : '#b0a898';
    if (!B) { merlons(x, u, py, r1, u * 0.09, c, 'front', big ? 9 : 8, { w: 0.4, cap: big ? '#5a5e66' : null }); return; }
    pad(x, u, big ? 2 : 1);
    drum(x, u, u * 0.02, r0, u * 0.02 - py, c, { r1, tex: 'stone', seed: 51 + tier, rh: u * 0.075 });
    // 斜坡基腳（外凸的石塊環）
    x.save(); x.beginPath(); x.ellipse(0, u * 0.02, r0 * 1.04, r0 * 1.04 * K, 0, 0, Math.PI); x.ellipse(0, -u * 0.05, r0 * 0.99, r0 * 0.99 * K, 0, Math.PI, 0, true); x.closePath(); fe(x, u, lgrad(x, -r0, 0, r0, 0, [shade(c, -0.05), shade(c, -0.22), shade(c, -0.4)]), c); x.restore();
    // 鐵箍
    const by = L(u * 0.02, py, 0.55), br = L(r0, r1, 0.55);
    x.strokeStyle = '#3e4148'; x.lineWidth = lw(x, u, 0.04); x.beginPath(); x.ellipse(0, by, br * 1.01, br * K, 0, 0.02, Math.PI - 0.02); x.stroke();
    x.strokeStyle = '#8a8f99'; x.lineWidth = lw(x, u, 0.012); x.stroke();
    for (let i = 1; i < 7; i++) { const a = i / 7 * Math.PI; circ(x, Math.cos(a) * br, by + Math.sin(a) * br * K, u * 0.012, '#d8dce4'); }
    // 砲口
    for (const sx of [-0.55, 0.55]) gunPort(x, u, sx * L(r0, r1, 0.3), L(u * 0.02, py, 0.3) + u * 0.04, u * 0.075, sx < 0 ? 0.2 : -0.2);
    if (big) {
      // 扶壁
      for (const a of [Math.PI * 0.22, Math.PI * 0.78]) buttress(x, u, Math.cos(a) * r0 * 0.98, u * 0.02 + Math.sin(a) * r0 * K * 0.98, u * 0.1, (u * 0.02 - py) * 0.6, c, a < Math.PI / 2 ? 1 : -1);
      x.strokeStyle = '#a8761c'; x.lineWidth = lw(x, u, 0.026); x.beginPath(); x.ellipse(0, py + u * 0.03, r1, r1 * K, 0, 0.05, Math.PI - 0.05); x.stroke(); x.strokeStyle = '#ffd36b'; x.lineWidth = lw(x, u, 0.012); x.stroke();
      balls(x, u, -u * 0.38, u * 0.12, u * 0.03, 6);
      barrel(x, u, u * 0.4, u * 0.13, u * 0.05, u * 0.09, '#7a4a28');
    } else balls(x, u, -u * 0.36, u * 0.11, u * 0.028, 3);
    disk(x, u, py, r1, shade(c, 0.08), 0);
    x.save(); x.beginPath(); x.ellipse(0, py, r1, r1 * K, 0, 0, TAU); x.clip(); x.strokeStyle = rgba('#000000', 0.15); x.lineWidth = lw(x, u, 0.008); for (let i = 1; i < 4; i++) { x.beginPath(); x.ellipse(0, py, r1 * i / 4, r1 * i / 4 * K, 0, 0, TAU); x.stroke(); } x.restore();
    merlons(x, u, py, r1, u * 0.09, c, 'back', big ? 9 : 8, { w: 0.4, cap: big ? '#5a5e66' : null });
    if (big) {
      // Lv3：後方的火藥庫小塔樓＋旗
      x.save(); x.translate(r1 * 0.5, py - r1 * K * 0.7);
      drum(x, u, 0, u * 0.1, u * 0.2, shade(c, -0.04), { tex: 'stone', rh: u * 0.05, seed: 57 });
      slit(x, u, -u * 0.02, -u * 0.1, u * 0.06);
      cone(x, u, -u * 0.2, u * 0.13, u * 0.2, '#3a4f8a', { style: 'slate', rows: 3 });
      pennant(x, u, 0, -u * 0.42, u * 0.15, '#e5484d', 1);
      x.restore();
    }
  }
  function gunPort(x, u, cx, cy, s, sk) {
    x.save(); x.translate(cx, cy); x.transform(1, sk, 0, 1, 0, 0);
    x.beginPath(); x.ellipse(0, 0, s * 0.62, s * 0.5, 0, 0, TAU); fe(x, u, '#5a5650', '#3a3630', 0.01);
    x.beginPath(); x.ellipse(0, s * 0.04, s * 0.38, s * 0.3, 0, 0, TAU); x.fillStyle = '#151218'; x.fill();
    x.restore();
  }
  function buttress(x, u, cx, yb, w, h, c, side) {
    path(x, [cx - w / 2, yb, cx + w / 2, yb, cx + w * 0.3 * side + w * 0.2, yb - h, cx + w * 0.3 * side - w * 0.2, yb - h]);
    fe(x, u, lgrad(x, cx - w / 2, 0, cx + w / 2, 0, [shade(c, 0.12), shade(c, -0.25)]), c);
    x.save(); x.clip(); x.strokeStyle = rgba('#24141c', 0.2); x.lineWidth = lw(x, u, 0.008); for (let y = yb - u * 0.07; y > yb - h; y -= u * 0.07) { x.beginPath(); x.moveTo(cx - w, y); x.lineTo(cx + w, y); x.stroke(); } x.restore();
  }
  function sackRing(x, u, y, r, part, n) {
    const list = []; for (let i = 0; i < n * 2; i++) list.push((i + 0.5) / (n * 2) * TAU);
    list.sort((a, b) => Math.sin(a) - Math.sin(b));
    for (const a of list) { const fr = Math.sin(a) > 0; if ((part === 'front') !== fr) continue; const px = Math.cos(a) * r, py = y + Math.sin(a) * r * K; sack(x, u, px, py + u * 0.02, u * 0.13 * (0.6 + 0.4 * Math.abs(Math.sin(a))), u * 0.075, fr ? '#cdb27e' : '#a8905e'); }
  }
  // 巨砲堡：深灰花崗岩重堡、青銅飾邊、突出的堞口托架與巨大城垛
  function cannonFort(x, u, B, py) {
    const r0 = u * 0.49, r1 = u * 0.42, c = '#8a8c96', br = '#c8913a';
    if (!B) { merlons(x, u, py, r1 * 1.06, u * 0.13, c, 'front', 7, { w: 0.5, cap: br }); return; }
    pad(x, u, 3, '#8a8a90');
    drum(x, u, u * 0.03, r0, u * 0.03 - py * 0.5 + u * 0.02, '#7a7c86', { r1: r0 * 0.95, tex: 'stone', seed: 61, rh: u * 0.09 });
    drum(x, u, py * 0.5 + u * 0.01, r1, -py * 0.5 - u * 0.05, c, { tex: 'stone', seed: 62, rh: u * 0.08 });
    // 堞口托架
    for (let i = 0; i < 9; i++) { const a = (i + 0.5) / 9 * Math.PI; const px = Math.cos(a) * r1, pyy = py + u * 0.06 + Math.sin(a) * r1 * K; path(x, [px - u * 0.022, pyy - u * 0.02, px + u * 0.022, pyy - u * 0.02, px + u * 0.014, pyy + u * 0.05, px - u * 0.014, pyy + u * 0.05]); fe(x, u, shade(c, -0.1 - Math.cos(a) * 0.15), c, 0.008); }
    drum(x, u, py + u * 0.06, r1 * 1.06, u * 0.06, shade(c, 0.05), { tex: 'stone', seed: 63, rh: u * 0.06 });
    // 青銅飾帶＋獅頭盾徽
    x.strokeStyle = shade(br, -0.35); x.lineWidth = lw(x, u, 0.036); x.beginPath(); x.ellipse(0, py * 0.5 + u * 0.01, r1 * 1.0, r1 * K, 0, 0.03, Math.PI - 0.03); x.stroke(); x.strokeStyle = br; x.lineWidth = lw(x, u, 0.018); x.stroke();
    crest(x, u, 0, py * 0.5 + u * 0.13, u * 0.1, '#3a3f8a', br);
    for (const sx of [-0.62, 0.62]) gunPort(x, u, sx * r0 * 0.95, -u * 0.05, u * 0.09, sx < 0 ? 0.22 : -0.22);
    // 鐵鍊與巨大砲彈
    x.strokeStyle = '#4a4e58'; x.lineWidth = lw(x, u, 0.014); x.setLineDash([u * 0.018, u * 0.012]);
    x.beginPath(); x.moveTo(-r1 * 0.85, py + u * 0.1); x.quadraticCurveTo(-r1 * 0.55, py * 0.6, -r1 * 0.25, py * 0.5 + u * 0.02); x.moveTo(r1 * 0.85, py + u * 0.1); x.quadraticCurveTo(r1 * 0.55, py * 0.6, r1 * 0.25, py * 0.5 + u * 0.02); x.stroke(); x.setLineDash([]);
    balls(x, u, -u * 0.4, u * 0.14, u * 0.042, 6);
    disk(x, u, py, r1 * 1.06, shade(c, 0.12), 0);
    merlons(x, u, py, r1 * 1.06, u * 0.13, c, 'back', 7, { w: 0.5, cap: br });
  }
  function crest(x, u, cx, cy, s, c, trim) {
    x.beginPath(); x.moveTo(cx - s, cy - s); x.lineTo(cx + s, cy - s); x.lineTo(cx + s, cy - s * 0.1); x.quadraticCurveTo(cx + s * 0.7, cy + s * 0.75, cx, cy + s * 1.05); x.quadraticCurveTo(cx - s * 0.7, cy + s * 0.75, cx - s, cy - s * 0.1); x.closePath();
    fe(x, u, lgrad(x, cx - s, cy - s, cx + s, cy + s, [shade(c, 0.3), c, shade(c, -0.3)]), c);
    x.strokeStyle = trim; x.lineWidth = lw(x, u, 0.016); x.stroke();
    Gfx.star(x, cx, cy - s * 0.05, s * 0.5, '#ffe08a', false);
  }
  // 集束飛彈：橄欖綠鐵甲碉堡、黃黑警示條、雷達與天線
  function cannonMissile(x, u, B, py) {
    const w = u * 0.82, c = '#6f7a5a';
    if (!B) {
      // 前緣沙包
      for (let i = 0; i < 4; i++) sack(x, u, -u * 0.33 + i * u * 0.1, u * 0.13 + Math.abs(i - 1.5) * -u * 0.025, u * 0.11, u * 0.07, '#b8a070');
      return;
    }
    pad(x, u, 2, '#9aa08e');
    prism(x, u, 0, u * 0.03, w, u * 0.03 - py, c, { wt: w * 0.92, tex: 'plate', top: '#5f6a4c' });
    // 黃黑警示條（左右兩面）
    const hy = L(u * 0.03, py, 0.78), d = w * 0.92 * K / 2;
    for (const side of [-1, 1]) {
      const pts = side < 0 ? [-w * 0.465, hy, 0, hy + d, 0, hy + d + u * 0.05, -w * 0.47, hy + u * 0.05] : [0, hy + d, w * 0.465, hy, w * 0.47, hy + u * 0.05, 0, hy + d + u * 0.05];
      path(x, pts); x.fillStyle = side < 0 ? '#f2c94a' : '#c8a030'; x.fill();
      x.save(); x.clip(); x.fillStyle = '#26221c';
      for (let k = -12; k < 12; k++) { const px = k * u * 0.05; path(x, [px, hy - u, px + u * 0.025, hy - u, px + u * 0.025 + u * 0.3, hy + u, px + u * 0.3, hy + u]); x.fill(); }
      x.restore();
    }
    // 鐵門
    x.save(); x.translate(-w * 0.22, -u * 0.06); x.transform(1, K, 0, 1, 0, 0); x.beginPath(); x.rect(-u * 0.06, -u * 0.12, u * 0.12, u * 0.16); fe(x, u, '#4a5240', '#2a3020'); x.fillStyle = '#e5484d'; x.fillRect(-u * 0.02, -u * 0.09, u * 0.04, u * 0.02); x.restore();
    // 側面飛彈莢艙
    for (let i = 0; i < 2; i++) { const px = w * 0.3, pyy = L(u * 0.03, py, 0.38) + i * u * 0.07; x.save(); x.translate(px, pyy); x.transform(1, -K, 0, 1, 0, 0); x.beginPath(); x.rect(-u * 0.07, -u * 0.03, u * 0.14, u * 0.055); fe(x, u, '#4a5240', '#2a3020'); for (let k = 0; k < 3; k++) circ(x, -u * 0.045 + k * u * 0.045, -u * 0.003, u * 0.016, '#1a1c16'); x.restore(); }
    // 雷達與天線（後方）
    line(x, -w * 0.32, py, -w * 0.32, py - u * 0.42, '#4a4e44', lw(x, u, 0.018));
    for (let i = 0; i < 3; i++) line(x, -w * 0.32 - u * 0.03, py - u * (0.22 + i * 0.07), -w * 0.32 + u * 0.03, py - u * (0.22 + i * 0.07), '#4a4e44', lw(x, u, 0.01));
    circ(x, -w * 0.32, py - u * 0.43, u * 0.016, '#e5484d');
    line(x, w * 0.3, py + u * 0.02, w * 0.3, py - u * 0.2, '#4a4e44', lw(x, u, 0.022));
    x.save(); x.translate(w * 0.3, py - u * 0.24); x.rotate(-0.5);
    x.beginPath(); x.ellipse(0, 0, u * 0.11, u * 0.05, 0, Math.PI, 0); x.quadraticCurveTo(0, u * 0.045, -u * 0.11, 0); fe(x, u, lgrad(x, -u * 0.1, -u * 0.05, u * 0.1, u * 0.04, ['#e8ece4', '#a8b0a0']), '#8a9088');
    line(x, 0, -u * 0.01, 0, -u * 0.08, '#5a5e58', lw(x, u, 0.01)); circ(x, 0, -u * 0.085, u * 0.012, '#ffd36b');
    x.restore();
    // 沙包（後排）
    for (let i = 0; i < 3; i++) sack(x, u, u * 0.18 + i * u * 0.1, u * 0.02 - i * u * 0.03, u * 0.11, u * 0.07, '#a8905e');
  }

  // ───────── 冰霜塔：冰岩上長出冰晶 ─────────
  function frostBody(x, tier, sp, u, B, T) {
    const py = -(T - 0.3 * u);
    if (tier === 3 && sp === 1) return frostSpire(x, u, B, py);
    if (tier === 3 && sp === 0) return frostStorm(x, u, B, py);
    const rk = '#8496aa', snow = '#eef6fc';
    const r = u * (tier >= 2 ? 0.24 : 0.22), ry = py + u * 0.14;
    if (!B) {
      // 前面的冰晶與雪堆
      if (tier === 0) { ice(x, u, u * 0.2, u * 0.1, u * 0.035, u * 0.13, '#c8f2ff', 0.3); return; }
      ice(x, u, u * 0.27, u * 0.12, u * 0.045, u * (0.14 + tier * 0.04), '#c8f2ff', 0.28);
      ice(x, u, -u * 0.3, u * 0.12, u * 0.038, u * 0.12, '#a8e6ff', -0.32);
      if (tier >= 2) for (const sd of [-1, 1]) ice(x, u, sd * r * 0.82, py + r * K * 0.75, u * 0.04, u * 0.17, sd < 0 ? '#e0faff' : '#bfefff', sd * 0.22);
      return;
    }
    pad(x, u, tier >= 2 ? 2 : tier, '#b8c8d4');
    if (tier === 0) {
      // Lv1：覆雪的冰岩堆，平頂站人，裂縫裡長出冰晶
      mound(x, u, 0, u * 0.08, u * 0.8, u * 0.24, rk, { flat: u * 0.34, cap: snow, cd: u * 0.07, seed: 4, rocks: 6 });
      mound(x, u, 0, -u * 0.04, u * 0.44, -u * 0.04 - py + u * 0.01, '#9aacbe', { flat: u * 0.36, cap: snow, cd: u * 0.05, seed: 44, rocks: 5 });
      disk(x, u, py, u * 0.18, snow, u * 0.02);
      icicles(x, u, -u * 0.17, u * 0.17, py + u * 0.025, 6, 2);
      ice(x, u, -u * 0.2, u * 0.0, u * 0.04, u * 0.17, '#bfefff', -0.35);
      ice(x, u, -u * 0.27, u * 0.05, u * 0.025, u * 0.09, '#d6f6ff', -0.6);
      ice(x, u, u * 0.15, -u * 0.08, u * 0.03, u * 0.12, '#a8e6ff', 0.45);
      return;
    }
    // Lv2 / Lv3：冰岩座＋石柱，刻著發光藍色符文
    mound(x, u, 0, u * 0.07, u * 0.86, u * (0.2 + tier * 0.03), rk, { flat: u * 0.3, cap: snow, cd: u * 0.06, seed: 6 + tier, rocks: 8 });
    const yb0 = -u * 0.1;
    drum(x, u, yb0, r, yb0 - ry, '#b9cad8', { r1: r * 0.9, tex: 'stone', seed: 71 + tier, rh: u * 0.07 });
    if (tier >= 2) {
      // 冰殼：半透明的冰包住塔身下半
      x.save(); x.globalAlpha = 0.55;
      x.beginPath(); x.moveTo(-r * 1.08, yb0); x.lineTo(-r * 1.02, L(yb0, ry, 0.35)); x.lineTo(-r * 0.6, L(yb0, ry, 0.55)); x.lineTo(-r * 0.2, L(yb0, ry, 0.3)); x.lineTo(r * 0.3, L(yb0, ry, 0.6)); x.lineTo(r * 0.75, L(yb0, ry, 0.4)); x.lineTo(r * 1.06, L(yb0, ry, 0.5)); x.lineTo(r * 1.08, yb0); x.ellipse(0, yb0, r * 1.08, r * 1.08 * K, 0, 0, Math.PI); x.closePath();
      x.fillStyle = lgrad(x, -r, 0, r, 0, ['#ffffff', '#c8f2ff', '#6ab8e8']); x.fill(); x.restore();
    }
    const gy = L(yb0, ry, 0.5), gr = L(r, r * 0.9, 0.5);
    x.save(); x.shadowColor = '#7fe0ff'; x.shadowBlur = u * 0.08;
    x.strokeStyle = '#8fe8ff'; x.lineWidth = lw(x, u, 0.02); x.beginPath(); x.ellipse(0, gy, gr, gr * K, 0, 0.1, Math.PI - 0.1); x.stroke();
    for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI; const px = Math.cos(a) * gr, pyy = gy + Math.sin(a) * gr * K; x.fillStyle = '#d8fbff'; x.fillRect(px - u * 0.01, pyy - u * 0.035, u * 0.02, u * 0.025); }
    x.restore();
    arch(x, u, 0, L(yb0, ry, 0.18), u * 0.07, u * 0.1, '#1e2a3a', 0, '#7fd6ff');
    disk(x, u, ry, r * 1.15, '#dcecf5', u * 0.04);
    icicles(x, u, -r * 1.1, r * 1.1, ry + u * 0.04, 9, 5);
    drum(x, u, ry, r * 0.75, ry - py, '#c9d8e4', { tex: 'stone', seed: 75, rh: u * 0.06 });
    disk(x, u, py, r * 1.05, '#eaf4fa', u * 0.03);
    for (const sd of [-1, 1]) ice(x, u, sd * r * 1.16, ry + u * 0.03, u * 0.042, u * (0.15 + tier * 0.03), sd < 0 ? '#bfefff' : '#9fe0ff', sd * 0.24);
    if (tier >= 2) {
      // Lv3：後半圈高高的冰晶冠
      for (const a of [Math.PI * 1.12, Math.PI * 1.38, Math.PI * 1.62, Math.PI * 1.88]) ice(x, u, Math.cos(a) * r * 0.95, py + Math.sin(a) * r * K * 0.95, u * 0.04, u * (0.26 + 0.06 * Math.abs(Math.cos(a * 2))), '#d6f6ff', Math.cos(a) * 0.3, { core: 0.6 });
    }
  }
  // 暴風雪：岩台上一圈覆雪巨石陣，中間是符文祭壇
  function frostStorm(x, u, B, py) {
    const ring = u * 0.4;
    const stones = []; for (let i = 0; i < 6; i++) stones.push((i + 0.5) / 6 * TAU + 0.2);
    const mono = (a) => { const px = Math.cos(a) * ring, pyy = Math.sin(a) * ring * K + u * 0.02, h = u * (0.34 + 0.06 * Math.sin(a * 3)); menhir(x, u, px, pyy, u * 0.065, h, Math.sin(a) > 0); };
    if (!B) { stones.filter(a => Math.sin(a) > 0.15).sort((a, b) => Math.sin(a) - Math.sin(b)).forEach(mono); return; }
    pad(x, u, 3, '#b8c8d4');
    stones.filter(a => Math.sin(a) <= 0.15).sort((a, b) => Math.sin(a) - Math.sin(b)).forEach(mono);
    const r = u * 0.2, ry = py + u * 0.1;
    mound(x, u, 0, u * 0.05, u * 0.62, u * 0.16, '#8496aa', { flat: u * 0.3, cap: '#eef6fc', cd: u * 0.05, seed: 12 });
    drum(x, u, -u * 0.05, r, -u * 0.05 - py, '#aabccc', { r1: r * 0.85, tex: 'stone', seed: 81, rh: u * 0.07 });
    x.save(); x.shadowColor = '#7fe0ff'; x.shadowBlur = u * 0.08;
    for (let i = 0; i < 3; i++) { const y = L(-u * 0.05, py, 0.25 + i * 0.25), rr = L(r, r * 0.85, 0.25 + i * 0.25); x.strokeStyle = rgba('#8fe8ff', 0.9 - i * 0.2); x.lineWidth = lw(x, u, 0.016); x.beginPath(); x.ellipse(0, y, rr, rr * K, 0, 0.15, Math.PI - 0.15); x.stroke(); }
    x.restore();
    disk(x, u, py, r * 1.25, '#eaf4fa', u * 0.035);
    icicles(x, u, -r * 1.2, r * 1.2, py + u * 0.035, 9, 8);
    void ry;
  }
  function menhir(x, u, cx, yb, w, h, front) {
    const c = front ? '#9aaabb' : '#7a8a9c';
    path(x, [cx - w, yb, cx - w * 0.85, yb - h * 0.8, cx - w * 0.3, yb - h, cx + w * 0.5, yb - h * 0.94, cx + w * 0.9, yb - h * 0.75, cx + w, yb]);
    fe(x, u, lgrad(x, cx - w, 0, cx + w, 0, [shade(c, 0.2), c, shade(c, -0.35)]), c);
    x.save(); x.clip();
    x.fillStyle = '#f2f8ff'; x.beginPath(); x.moveTo(cx - w * 1.2, yb - h * 0.8); x.quadraticCurveTo(cx, yb - h * 0.86, cx + w * 1.2, yb - h * 0.72); x.lineTo(cx + w * 1.2, yb - h * 1.2); x.lineTo(cx - w * 1.2, yb - h * 1.2); x.closePath(); x.fill();
    x.shadowColor = '#7fe0ff'; x.shadowBlur = u * 0.06; x.strokeStyle = '#a8f0ff'; x.lineWidth = lw(x, u, 0.012);
    x.beginPath(); x.moveTo(cx, yb - h * 0.62); x.lineTo(cx, yb - h * 0.35); x.moveTo(cx - w * 0.35, yb - h * 0.52); x.lineTo(cx + w * 0.35, yb - h * 0.45); x.stroke();
    x.restore();
    ell(x, cx, yb + u * 0.005, w * 1.2, w * 0.4, 'rgba(242,248,255,.85)');
  }
  // 冰晶尖塔：巨大的六角冰晶群直接從岩石長出來
  function frostSpire(x, u, B, py) {
    if (!B) {
      ice(x, u, -u * 0.25, u * 0.1, u * 0.06, u * 0.3, '#bfefff', -0.32);
      ice(x, u, u * 0.27, u * 0.1, u * 0.055, u * 0.24, '#9fe0ff', 0.36);
      return;
    }
    pad(x, u, 3, '#b8c8d4');
    mound(x, u, 0, u * 0.06, u * 0.8, u * 0.2, '#7f90a2', { cap: '#eef6fc', cd: u * 0.05, seed: 21, rocks: 8 });
    ice(x, u, -u * 0.17, -u * 0.01, u * 0.08, -py * 1.15, '#a8e6ff', -0.28, { core: 0.5 });
    ice(x, u, u * 0.18, 0, u * 0.08, -py * 1.05, '#bfefff', 0.26, { core: 0.5 });
    // 主晶柱
    x.save(); x.shadowColor = '#9fe6ff'; x.shadowBlur = u * 0.15;
    ice(x, u, 0, u * 0.02, u * 0.14, -py + u * 0.95, '#d6f6ff', 0, { core: 0.75, dk: '#4a7aaa' });
    x.restore();
    ice(x, u, -u * 0.08, u * 0.04, u * 0.05, u * 0.32, '#e8fbff', -0.5);
    ice(x, u, u * 0.1, u * 0.05, u * 0.045, u * 0.26, '#c8f2ff', 0.55);
    mound(x, u, 0, u * 0.1, u * 0.5, u * 0.09, '#8a9aaa', { cap: '#eef6fc', cd: u * 0.035, seed: 23, rocks: 4 });
  }

  // ───────── 法師塔：細長法塔＋浮空符環 ─────────
  function magicBody(x, tier, sp, u, B, T) {
    const py = -(T - 0.3 * u);
    if (tier === 3 && sp === 0) return magicStorm(x, u, B, py, T);
    if (tier === 3 && sp === 1) return magicPrism(x, u, B, py, T);
    const st = '#a99cc4', roof = tier >= 2 ? '#5a3aa8' : '#6a45b8';
    if (!B) {
      if (tier >= 1) shellRibs(x, u, py, u * (tier >= 2 ? 0.3 : 0.27), T, '#cbbfe0', 'front', tier);
      return;
    }
    pad(x, u, tier >= 2 ? 2 : tier, '#b9adc9');
    const r0 = u * (0.2 + tier * 0.012), r1 = r0 * 0.78;
    drum(x, u, u * 0.02, r0 * 1.25, u * 0.08, '#9a8eb4', { r1: r0 * 1.12, tex: 'stone', rh: u * 0.04, seed: 90, top: '#b0a4c8' });
    drum(x, u, -u * 0.06, r0, -u * 0.06 - py - u * 0.05, st, { r1, tex: 'stone', seed: 91 + tier, rh: u * 0.07 });
    arch(x, u, 0, -u * 0.13, u * 0.09, u * 0.15, '#3a2050');
    arch(x, u, -r0 * 0.45, L(-u * 0.06, py, 0.5), u * 0.05, u * 0.09, '#2a1e3a', 0, '#ffcf5a');
    arch(x, u, r0 * 0.35, L(-u * 0.06, py, 0.75), u * 0.045, u * 0.08, '#2a1e3a', 0, '#ffcf5a');
    if (tier >= 2) {
      // Lv3：兩側飛扶壁鰭、金飾帶、掛旗
      for (const sd of [-1, 1]) fin(x, u, sd, r0, -u * 0.06, py, '#8a7eaa');
      for (const f of [0.35, 0.7]) { const y = L(-u * 0.06, py, f), rr = L(r0, r1, f); x.strokeStyle = '#a8761c'; x.lineWidth = lw(x, u, 0.024); x.beginPath(); x.ellipse(0, y, rr, rr * K, 0, 0.05, Math.PI - 0.05); x.stroke(); x.strokeStyle = '#ffd36b'; x.lineWidth = lw(x, u, 0.011); x.stroke(); }
      banner(x, u, r0 * 0.05, L(-u * 0.06, py, 0.62), u * 0.1, u * 0.2, roof, 'star');
    }
    // 托架＋陽台
    for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI; beam(x, u, Math.cos(a) * r1 * 0.9, py + u * 0.06 + Math.sin(a) * r1 * K, Math.cos(a) * r1 * 1.4, py + Math.sin(a) * r1 * 1.4 * K, u * 0.02, '#8a7ea8'); }
    disk(x, u, py, r1 * 1.45, '#cbbfe0', u * 0.035);
    // 地板上的魔法陣
    x.save(); x.beginPath(); x.ellipse(0, py, r1 * 1.45, r1 * 1.45 * K, 0, 0, TAU); x.clip(); x.strokeStyle = rgba('#8a5ad8', 0.6); x.lineWidth = lw(x, u, 0.01); x.beginPath(); x.ellipse(0, py, r1 * 0.9, r1 * 0.9 * K, 0, 0, TAU); x.stroke(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU * 2; const b = (i + 1) / 5 * TAU * 2; if (!i) x.beginPath(); x.moveTo(Math.cos(a) * r1 * 0.9, py + Math.sin(a) * r1 * 0.9 * K); x.lineTo(Math.cos(b) * r1 * 0.9, py + Math.sin(b) * r1 * 0.9 * K); } x.stroke(); x.restore();
    if (tier === 0) {
      // Lv1：兩根小石柱撐起法球
      for (const a of [Math.PI * 1.15, Math.PI * 1.85]) { const px = Math.cos(a) * r1 * 1.2, pyy = py + Math.sin(a) * r1 * 1.2 * K; x.beginPath(); x.rect(px - u * 0.02, pyy - u * 0.16, u * 0.04, u * 0.16); fe(x, u, lgrad(x, px - u * 0.02, 0, px + u * 0.02, 0, ['#ece6f8', '#b8acd0']), '#b8acd0'); circ(x, px, pyy - u * 0.17, u * 0.025, '#d8c0ff'); }
    } else shellRibs(x, u, py, u * (tier >= 2 ? 0.3 : 0.27), T, '#cbbfe0', 'back', tier);
  }
  // 法球後面的半圓穹頂骨架（只有後半，前面開放）
  function shellRibs(x, u, py, r, T, c, part, tier) {
    const top = -T - u * 0.2;
    if (part === 'back') {
      // 穹頂內面（深色＋星點）
      x.beginPath(); x.ellipse(0, py, r, r * K, 0, Math.PI, 0); x.bezierCurveTo(r, top + u * 0.05, r * 0.5, top - u * 0.02, 0, top); x.bezierCurveTo(-r * 0.5, top - u * 0.02, -r, top + u * 0.05, -r, py); x.closePath();
      fe(x, u, lgrad(x, 0, top, 0, py, ['#3a2a6a', '#5a3aa8', '#2a1e4a']), '#5a3aa8');
      x.save(); x.clip(); const rnd = R(17); for (let i = 0; i < 14; i++) circ(x, (rnd() - 0.5) * r * 1.8, L(top, py, rnd() * 0.9), u * (0.004 + rnd() * 0.006), rgba('#fff4c8', 0.5 + rnd() * 0.5)); x.restore();
      for (const f of [-1, -0.45, 0.45, 1]) { x.strokeStyle = '#d8cce8'; x.lineWidth = lw(x, u, 0.03); x.beginPath(); x.moveTo(f * r, py - Math.sqrt(Math.max(0, 1 - f * f)) * r * K); x.quadraticCurveTo(f * r, top + u * 0.02, 0, top); x.stroke(); }
      circ(x, 0, top - u * 0.015, u * 0.03, '#ffd36b');
    } else {
      // 前面兩根柱腳
      for (const sd of [-1, 1]) { const px = sd * r * 0.98; x.beginPath(); x.rect(px - u * 0.022, py - u * 0.1, u * 0.044, u * 0.1); fe(x, u, lgrad(x, px - u * 0.022, 0, px + u * 0.022, 0, ['#f0eaf8', '#b0a4c8']), '#b0a4c8'); circ(x, px, py - u * 0.11, u * 0.026, tier >= 2 ? '#ffd36b' : '#d8c0ff'); }
    }
  }
  function fin(x, u, sd, r0, yb, py, c) {
    path(x, [sd * r0 * 0.9, yb - u * 0.02, sd * r0 * 1.6, yb + u * 0.02, sd * r0 * 1.45, L(yb, py, 0.35), sd * r0 * 0.9, L(yb, py, 0.7)]);
    fe(x, u, sd < 0 ? shade(c, 0.12) : shade(c, -0.2), c);
  }
  // 雷電塔：深藍石塔纏著銅線圈，兩側避雷針，頂端金屬圓頂帶尖刺
  function magicStorm(x, u, B, py, T) {
    const st = '#7a86b0', cu = '#c87a3a';
    const r0 = u * 0.25, r1 = r0 * 0.8;
    if (!B) {
      for (const sd of [-1, 1]) { const px = sd * u * 0.36; x.save(); x.shadowColor = '#9fd8ff'; x.shadowBlur = u * 0.1; circ(x, px, py - u * 0.44, u * 0.04, rgrad(x, px, py - u * 0.44, 0, u * 0.04, ['#ffffff', '#9fd8ff', '#5a8ad8'])); x.restore(); }
      return;
    }
    pad(x, u, 3, '#9aa0c0');
    drum(x, u, u * 0.02, r0 * 1.3, u * 0.08, '#6a7498', { r1: r0 * 1.15, tex: 'stone', rh: u * 0.04, seed: 95, top: '#8a94b8' });
    drum(x, u, -u * 0.06, r0, -u * 0.06 - py - u * 0.05, st, { r1, tex: 'stone', seed: 96, rh: u * 0.07 });
    // 銅線圈
    for (let i = 0; i < 4; i++) { const f = 0.2 + i * 0.18, y = L(-u * 0.06, py, f), rr = L(r0, r1, f) * 1.06; x.strokeStyle = shade(cu, -0.35); x.lineWidth = lw(x, u, 0.05); x.beginPath(); x.ellipse(0, y, rr, rr * K, 0, 0.02, Math.PI - 0.02); x.stroke(); x.strokeStyle = cu; x.lineWidth = lw(x, u, 0.03); x.stroke(); x.strokeStyle = '#ffd0a0'; x.lineWidth = lw(x, u, 0.01); x.beginPath(); x.ellipse(0, y - u * 0.006, rr, rr * K, 0, 0.6, 1.6); x.stroke(); }
    arch(x, u, 0, -u * 0.13, u * 0.09, u * 0.15, '#1e2440');
    banner(x, u, -r0 * 0.05, L(-u * 0.06, py, 0.94) + u * 0.0, u * 0.09, u * 0.08, '#2a3e9a', null);
    // 避雷針
    for (const sd of [-1, 1]) { const px = sd * u * 0.36; line(x, px, u * 0.08, px, py - u * 0.4, '#8a5a2a', lw(x, u, 0.026)); for (let i = 0; i < 6; i++) { const y = L(u * 0.0, py - u * 0.3, i / 6); x.strokeStyle = cu; x.lineWidth = lw(x, u, 0.016); x.beginPath(); x.ellipse(px, y, u * 0.03, u * 0.012, 0, 0, Math.PI); x.stroke(); } beam(x, u, px - sd * u * 0.0, py - u * 0.06, sd * r1 * 0.9, py - u * 0.02, u * 0.016, '#6a5040'); }
    disk(x, u, py, r1 * 1.45, '#9aa4c8', u * 0.035);
    // 金屬圓頂（後半，像天線罩）
    const top = -T - u * 0.24, r = u * 0.28;
    x.beginPath(); x.ellipse(0, py, r, r * K, 0, Math.PI, 0); x.bezierCurveTo(r, top + u * 0.06, r * 0.5, top, 0, top); x.bezierCurveTo(-r * 0.5, top, -r, top + u * 0.06, -r, py); x.closePath();
    fe(x, u, lgrad(x, -r, 0, r, 0, ['#e8eef8', '#8a94a8', '#4a5068']), '#6a7488');
    x.save(); x.clip(); x.strokeStyle = rgba('#2a3040', 0.35); x.lineWidth = lw(x, u, 0.01); for (const f of [-0.6, -0.2, 0.2, 0.6]) { x.beginPath(); x.moveTo(f * r, py); x.quadraticCurveTo(f * r * 1.05, top + u * 0.1, 0, top); x.stroke(); } x.restore();
    x.fillStyle = 'rgba(20,20,50,.55)'; x.beginPath(); x.ellipse(0, py - u * 0.06, r * 0.72, u * 0.2, 0, Math.PI, 0); x.fill();
    line(x, 0, top + u * 0.01, 0, top - u * 0.14, '#c87a3a', lw(x, u, 0.022)); circ(x, 0, top - u * 0.15, u * 0.028, '#bfe8ff');
  }
  // 奧術稜鏡：白色大理石細塔、粉色水晶鑲嵌，頂端是托住稜鏡的開口環架
  function magicPrism(x, u, B, py, T) {
    const st = '#ece6ee', pk = '#ff7ee0';
    const r0 = u * 0.22, r1 = r0 * 0.75;
    const ringY = -T + u * 0.02;
    if (!B) {
      // 環架前半
      x.strokeStyle = '#c8a040'; x.lineWidth = lw(x, u, 0.03); x.beginPath(); x.ellipse(0, ringY, u * 0.22, u * 0.22 * K, 0, 0, Math.PI); x.stroke();
      x.strokeStyle = '#ffe08a'; x.lineWidth = lw(x, u, 0.012); x.stroke();
      return;
    }
    pad(x, u, 3, '#d8d0dc');
    drum(x, u, u * 0.02, r0 * 1.35, u * 0.08, '#d4ccd8', { r1: r0 * 1.2, tex: 'stone', rh: u * 0.04, seed: 97, top: '#e8e0ec' });
    drum(x, u, -u * 0.06, r0, -u * 0.06 - py - u * 0.05, st, { r1, tex: 'stone', seed: 98, rh: u * 0.09, jit: 0.06 });
    // 粉色水晶鑲嵌條
    for (let i = 0; i < 3; i++) { const a = Math.PI * (0.3 + i * 0.2); const px0 = Math.cos(a) * r0, px1 = Math.cos(a) * r1; x.save(); x.shadowColor = pk; x.shadowBlur = u * 0.06; line(x, px0, -u * 0.06 + Math.sin(a) * r0 * K, px1, py + Math.sin(a) * r1 * K, i === 1 ? '#ffb0f0' : pk, lw(x, u, 0.018)); x.restore(); }
    arch(x, u, -r0 * 0.5, -u * 0.12, u * 0.07, u * 0.12, '#3a2040');
    for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI; beam(x, u, Math.cos(a) * r1 * 0.9, py + u * 0.06 + Math.sin(a) * r1 * K, Math.cos(a) * r1 * 1.5, py + Math.sin(a) * r1 * 1.5 * K, u * 0.02, '#c8bcc8'); }
    disk(x, u, py, r1 * 1.5, '#f4eef6', u * 0.035);
    // 四根細金柱撐起環架
    for (const a of [Math.PI * 1.1, Math.PI * 1.9, Math.PI * 0.3, Math.PI * 0.7]) { const px = Math.cos(a) * u * 0.2, pyy = py + Math.sin(a) * u * 0.2 * K, ty = ringY + Math.sin(a) * u * 0.22 * K; if (Math.sin(a) > 0) continue; line(x, px, pyy, Math.cos(a) * u * 0.22, ty, '#c8a040', lw(x, u, 0.018)); }
    x.strokeStyle = '#a8801c'; x.lineWidth = lw(x, u, 0.03); x.beginPath(); x.ellipse(0, ringY, u * 0.22, u * 0.22 * K, 0, Math.PI, TAU); x.stroke(); x.strokeStyle = '#ffe08a'; x.lineWidth = lw(x, u, 0.012); x.stroke();
    for (const sd of [-1, 1]) { x.save(); x.shadowColor = pk; x.shadowBlur = u * 0.06; ice(x, u, sd * r1 * 1.5, py + u * 0.02, u * 0.03, u * 0.12, '#ffc0f0', sd * 0.25, { ec: '#a83a8a', dk: '#a83a8a' }); x.restore(); }
  }

  // ───────── 狙擊塔：細高鐘樓、長平台 ─────────
  function sniperBody(x, tier, sp, u, B, T) {
    const py = -(T - 0.13 * u);
    if (tier === 3 && sp === 0) return sniperClock(x, u, B, py);
    if (tier === 3 && sp === 1) return sniperLodge(x, u, B, py);
    const dw = u * 0.64; // 長平台
    if (tier === 0) {
      // Lv1：細長的高腳木架＋梯子
      if (B) {
        pad(x, u, 0);
        log(x, u, 0, -u * 0.1, 0, py, u * 0.034, WOOD2);
        log(x, u, -u * 0.26, 0, -u * 0.14, py, u * 0.04, WOOD);
        log(x, u, u * 0.26, 0, u * 0.14, py, u * 0.04, WOOD2);
        for (const f of [0.22, 0.52]) { const y0 = py * f, y1 = py * (f + 0.26); log(x, u, -u * (0.26 - f * 0.12), y0, u * (0.26 - (f + 0.26) * 0.12), y1, u * 0.02, shade(WOOD, -0.1)); log(x, u, u * (0.26 - f * 0.12), y0, -u * (0.26 - (f + 0.26) * 0.12), y1, u * 0.02, shade(WOOD2, -0.1)); lash(x, u, 0, (y0 + y1) / 2, u * 0.015); }
        log(x, u, 0, u * 0.08, 0, py + u * 0.04, u * 0.04, WOOD);
        deckBox(x, u, 0, py, u * 0.42, PLANK, u * 0.035);
        // 梯子
        line(x, u * 0.1, u * 0.14, u * 0.06, py + u * 0.04, '#8a5a2e', lw(x, u, 0.016)); line(x, u * 0.2, u * 0.12, u * 0.15, py + u * 0.05, '#8a5a2e', lw(x, u, 0.016));
        for (let i = 1; i < 8; i++) { const f = i / 8; line(x, L(u * 0.1, u * 0.06, f), L(u * 0.14, py + u * 0.04, f), L(u * 0.2, u * 0.15, f), L(u * 0.12, py + u * 0.05, f), '#a8743e', lw(x, u, 0.012)); }
      } else fenceBox(x, u, 0, py, u * 0.42, u * 0.06, '#a8743e', 'front');
      return;
    }
    // Lv2 / Lv3：錐形磚塔身，頂上一條長長的木平台；Lv3 加鐘亭和屋頂
    const big = tier >= 2, c = big ? '#b8ae9a' : '#b87a5a';
    if (B) {
      pad(x, u, big ? 2 : 1);
      prism(x, u, 0, u * 0.02, u * 0.5, u * 0.02 - py - u * 0.02, c, { wt: u * 0.34, tex: big ? 'stone' : 'brick', seed: 101 + tier, top: false });
      arch(x, u, -u * 0.12, -u * 0.06, u * 0.08, u * 0.15, '#3a2a22', K);
      for (const f of [0.38, 0.66]) slit(x, u, u * L(0.12, 0.09, f), L(u * 0.02, py, f), u * 0.08, -K);
      if (big) { const y = L(u * 0.02, py, 0.5); x.strokeStyle = '#6b5a48'; x.lineWidth = lw(x, u, 0.03); x.beginPath(); x.moveTo(-u * 0.21, y); x.lineTo(0, y + u * 0.21 * K * 0.95); x.lineTo(u * 0.21, y); x.stroke(); }
      // 長平台托架
      for (const sd of [-1, 1]) beam(x, u, sd * u * 0.16, py + u * 0.14, sd * dw * 0.45, py + u * 0.01, u * 0.026, WOOD2);
      deckBox(x, u, 0, py, dw, PLANK, u * 0.035);
      fenceBox(x, u, 0, py, dw, u * 0.07, '#8a5a30', 'back');
      if (big) {
        // 鐘亭：三根柱、後面掛一口鐘、魚鱗瓦屋頂
        for (const px of [-dw * 0.42, dw * 0.42]) line(x, px, py, px, py - u * 0.5, '#5a3a22', lw(x, u, 0.028));
        line(x, 0, py - dw * K / 2 * 0.9, 0, py - u * 0.5, '#4a2e1a', lw(x, u, 0.026));
        bell(x, u, u * 0.12, py - u * 0.4, u * 0.06, '#c8a040');
        pyr(x, u, 0, py - u * 0.5, dw * 1.05, u * 0.36, '#5b6a3a', { finial: '#ffd36b' });
      }
    } else {
      fenceBox(x, u, 0, py, dw, u * 0.07, '#8a5a30', 'front');
    }
  }
  function bell(x, u, cx, cy, s, c) {
    line(x, cx, cy - s * 1.2, cx, cy - s * 0.8, '#3a3a40', lw(x, u, 0.012));
    x.beginPath(); x.moveTo(cx - s * 0.5, cy - s * 0.8); x.quadraticCurveTo(cx - s * 0.6, cy, cx - s, cy + s * 0.4); x.lineTo(cx + s, cy + s * 0.4); x.quadraticCurveTo(cx + s * 0.6, cy, cx + s * 0.5, cy - s * 0.8); x.closePath();
    fe(x, u, lgrad(x, cx - s, 0, cx + s, 0, [shade(c, 0.4), c, shade(c, -0.4)]), c);
    circ(x, cx, cy + s * 0.45, s * 0.18, shade(c, -0.5));
  }
  // 神射手：藍金色鐘樓，正面大鐘面、藍石板尖頂
  function sniperClock(x, u, B, py) {
    const dw = u * 0.66, c = '#d8d4cc', bl = '#2f4f9a';
    if (!B) { fenceBox(x, u, 0, py, dw, u * 0.07, '#3a4f7a', 'front'); return; }
    pad(x, u, 3, '#c8c4bc');
    prism(x, u, 0, u * 0.02, u * 0.52, u * 0.02 - py - u * 0.02, c, { wt: u * 0.36, tex: 'stone', seed: 111, top: false, jit: 0.08 });
    // 金色腰線
    for (const f of [0.3, 0.75]) { const y = L(u * 0.02, py, f), hw = L(u * 0.26, u * 0.18, f); x.strokeStyle = '#a8761c'; x.lineWidth = lw(x, u, 0.026); x.beginPath(); x.moveTo(-hw, y); x.lineTo(0, y + hw * K); x.lineTo(hw, y); x.stroke(); x.strokeStyle = '#ffd36b'; x.lineWidth = lw(x, u, 0.011); x.stroke(); }
    // 鐘面（左面）
    const cy = L(u * 0.02, py, 0.53);
    x.save(); x.translate(-u * 0.11, cy + u * 0.04); x.transform(1, K, 0, 1, 0, 0);
    circ(x, 0, 0, u * 0.085, '#f4ead2'); x.strokeStyle = '#c8a040'; x.lineWidth = lw(x, u, 0.02); x.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circ(x, Math.cos(a) * u * 0.065, Math.sin(a) * u * 0.065, u * 0.007, '#3a3020'); }
    line(x, 0, 0, 0, -u * 0.055, '#2a2420', lw(x, u, 0.012)); line(x, 0, 0, u * 0.04, u * 0.012, '#2a2420', lw(x, u, 0.012));
    x.restore();
    arch(x, u, u * 0.1, -u * 0.06, u * 0.07, u * 0.14, '#2a2240', -K);
    banner(x, u, u * 0.12, L(u * 0.02, py, 0.74) - u * 0.03, u * 0.08, u * 0.2, bl, 'star');
    for (const sd of [-1, 1]) beam(x, u, sd * u * 0.16, py + u * 0.14, sd * dw * 0.45, py + u * 0.01, u * 0.026, '#5a5048');
    deckBox(x, u, 0, py, dw, '#9a9488', u * 0.035);
    fenceBox(x, u, 0, py, dw, u * 0.07, '#3a4f7a', 'back');
    for (const px of [-dw * 0.42, dw * 0.42]) line(x, px, py, px, py - u * 0.52, '#d8d4cc', lw(x, u, 0.034));
    line(x, 0, py - dw * K / 2 * 0.9, 0, py - u * 0.52, '#b8b4ac', lw(x, u, 0.03));
    bell(x, u, u * 0.13, py - u * 0.42, u * 0.065, '#f2c14e');
    pyr(x, u, 0, py - u * 0.52, dw * 1.04, u * 0.62, bl, { style: 'slate', finial: '#ffd36b' });
    x.strokeStyle = '#ffd36b'; x.lineWidth = lw(x, u, 0.016); x.beginPath(); x.moveTo(-dw * 0.52, py - u * 0.52); x.lineTo(0, py - u * 0.52 + dw * 1.04 * K / 2); x.lineTo(dw * 0.52, py - u * 0.52); x.stroke();
  }
  // 獵人印記：深紅圓木獵人小屋塔，掛獸皮與鹿角，紅色印記旗
  function sniperLodge(x, u, B, py) {
    const dw = u * 0.64, c = '#7a4a34';
    if (!B) {
      fenceBox(x, u, 0, py, dw, u * 0.07, '#5a3020', 'front');
      // 鹿角
      x.strokeStyle = '#efe2c4'; x.lineWidth = lw(x, u, 0.022); x.lineCap = 'round';
      for (const sd of [-1, 1]) { const bx = 0, by = py + u * 0.03; x.beginPath(); x.moveTo(bx + sd * u * 0.02, by); x.quadraticCurveTo(bx + sd * u * 0.1, by - u * 0.03, bx + sd * u * 0.15, by - u * 0.11); x.moveTo(bx + sd * u * 0.08, by - u * 0.02); x.lineTo(bx + sd * u * 0.08, by - u * 0.08); x.moveTo(bx + sd * u * 0.12, by - u * 0.06); x.lineTo(bx + sd * u * 0.18, by - u * 0.08); x.stroke(); }
      x.lineCap = 'butt';
      circ(x, 0, py + u * 0.035, u * 0.025, '#efe2c4');
      return;
    }
    pad(x, u, 3, '#a89a8c');
    prism(x, u, 0, u * 0.02, u * 0.5, u * 0.02 - py - u * 0.02, c, { wt: u * 0.36, tex: 'log', rh: u * 0.065, top: false });
    // 獸皮
    for (const [px, pyy, s] of [[-0.11, L(u * 0.02, py, 0.45), 1], [0.12, L(u * 0.02, py, 0.62), -1]]) { x.save(); x.translate(px * u, pyy); x.transform(1, s * K, 0, 1, 0, 0); x.beginPath(); x.moveTo(-u * 0.06, -u * 0.07); x.quadraticCurveTo(0, -u * 0.05, u * 0.06, -u * 0.07); x.lineTo(u * 0.05, u * 0.02); x.quadraticCurveTo(u * 0.07, u * 0.08, u * 0.02, u * 0.06); x.lineTo(0, u * 0.09); x.lineTo(-u * 0.02, u * 0.06); x.quadraticCurveTo(-u * 0.07, u * 0.08, -u * 0.05, u * 0.02); x.closePath(); fe(x, u, s > 0 ? '#c89a62' : '#9a6a40', '#6a4a2a', 0.01); x.restore(); }
    arch(x, u, u * 0.1, -u * 0.06, u * 0.08, u * 0.15, '#2a1a14', -K);
    banner(x, u, -u * 0.12, L(u * 0.02, py, 0.82) - u * 0.02, u * 0.085, u * 0.22, '#9a2a2a', 'cross', { ec: '#f4ead2' });
    for (const sd of [-1, 1]) beam(x, u, sd * u * 0.16, py + u * 0.14, sd * dw * 0.45, py + u * 0.01, u * 0.028, '#5a3020');
    deckBox(x, u, 0, py, dw, '#8a5a3a', u * 0.035);
    fenceBox(x, u, 0, py, dw, u * 0.07, '#5a3020', 'back');
    for (const px of [-dw * 0.42, dw * 0.42]) log(x, u, px, py, px, py - u * 0.5, u * 0.03, '#5a3020');
    log(x, u, 0, py - dw * K / 2 * 0.9, 0, py - u * 0.5, u * 0.028, '#4a2818');
    lantern(x, u, -dw * 0.3, py - u * 0.3);
    pyr(x, u, 0, py - u * 0.5, dw * 1.08, u * 0.34, '#8a2a2a', { style: 'thatch' });
    // 屋頂上的大鹿角
    x.strokeStyle = '#efe2c4'; x.lineWidth = lw(x, u, 0.024); x.lineCap = 'round';
    const ay = py - u * 0.84;
    for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(0, ay + u * 0.02); x.quadraticCurveTo(sd * u * 0.1, ay - u * 0.02, sd * u * 0.18, ay - u * 0.14); x.moveTo(sd * u * 0.08, ay - u * 0.01); x.lineTo(sd * u * 0.07, ay - u * 0.09); x.moveTo(sd * u * 0.14, ay - u * 0.07); x.lineTo(sd * u * 0.22, ay - u * 0.09); x.stroke(); }
    x.lineCap = 'butt';
    circ(x, 0, ay + u * 0.03, u * 0.03, '#efe2c4'); circ(x, -u * 0.01, ay + u * 0.025, u * 0.007, '#2a1a14'); circ(x, u * 0.012, ay + u * 0.025, u * 0.007, '#2a1a14');
  }

  // ───────── 戰旗：軍營、帳篷、戰鼓 ─────────
  function bannerBody(x, tier, sp, u, B, T) {
    void T;
    if (sp === 1) return bannerWatch(x, u, B);
    if (sp === 0) return bannerDrum(x, u, B);
    if (!B) {
      if (tier === 0) for (const [sx, c] of [[-0.25, '#3a6fd8'], [0.28, '#d8a03a']]) shield(x, u, sx * u, u * 0.0, u * 0.07, c);
      return;
    }
    if (tier === 0) {
      // Lv1：營地：一圈石頭、武器架、旗竿插座
      pad(x, u, 0);
      tent(x, u, u * 0.16, -u * 0.1, u * 0.22, u * 0.3, '#c8b088', '#a8905e');
      rack(x, u, -u * 0.06, -u * 0.12);
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ell(x, Math.cos(a) * u * 0.07, Math.sin(a) * u * 0.03 + u * 0.01, u * 0.022, u * 0.014, '#8a8478'); }
      return;
    }
    // Lv2 / Lv3：石台（Lv3 兩層＋金邊）、火盆、條紋帳篷
    pad(x, u, tier >= 2 ? 2 : 1, '#c9b090');
    if (tier >= 2) { tent(x, u, -u * 0.13, -u * 0.17, u * 0.3, u * 0.6, '#c8382e', '#f4ead2', true); rack(x, u, u * 0.16, -u * 0.16); }
    else tent(x, u, -u * 0.12, -u * 0.15, u * 0.27, u * 0.52, '#4f8a4a', '#e8dcc0', true);
    const r = u * (tier >= 2 ? 0.22 : 0.18), h = u * (tier >= 2 ? 0.18 : 0.12);
    if (tier >= 2) drum(x, u, u * 0.02, r * 1.3, u * 0.06, '#b8a68c', { tex: 'stone', rh: u * 0.03, top: '#d0c2a8' });
    drum(x, u, u * 0.02 - (tier >= 2 ? u * 0.06 : 0), r, h - (tier >= 2 ? u * 0.06 : 0), '#c4b49c', { tex: 'stone', rh: u * 0.05, top: '#d8cbb4' });
    if (tier >= 2) { x.strokeStyle = '#a8761c'; x.lineWidth = lw(x, u, 0.022); x.beginPath(); x.ellipse(0, -h + u * 0.035, r, r * K, 0, 0.1, Math.PI - 0.1); x.stroke(); x.strokeStyle = '#ffd36b'; x.lineWidth = lw(x, u, 0.01); x.stroke(); }
    circ(x, 0, -h, u * 0.04, '#4a3a2a');
    // 火盆
    for (const sx of tier >= 2 ? [-1, 1] : [1]) brazier(x, u, sx * u * 0.33, -u * 0.22);
  }
  function brazier(x, u, bx, top) {
    line(x, bx - u * 0.035, u * 0.05, bx, top + u * 0.04, '#3e4148', lw(x, u, 0.016)); line(x, bx + u * 0.035, u * 0.05, bx, top + u * 0.04, '#3e4148', lw(x, u, 0.016)); line(x, bx, u * 0.06, bx, top + u * 0.04, '#4b4f58', lw(x, u, 0.016));
    x.beginPath(); x.moveTo(bx - u * 0.07, top - u * 0.04); x.lineTo(bx + u * 0.07, top - u * 0.04); x.quadraticCurveTo(bx + u * 0.06, top + u * 0.03, bx, top + u * 0.04); x.quadraticCurveTo(bx - u * 0.06, top + u * 0.03, bx - u * 0.07, top - u * 0.04); x.closePath(); fe(x, u, lgrad(x, bx - u * 0.07, 0, bx + u * 0.07, 0, ['#8a8f99', '#4b4f58', '#2a2d33']), '#4b4f58');
    x.beginPath(); x.ellipse(bx, top - u * 0.04, u * 0.07, u * 0.022, 0, 0, TAU); x.fillStyle = '#5a2a10'; x.fill(); ell(x, bx, top - u * 0.04, u * 0.05, u * 0.014, '#ff8a2a');
  }
  // 圓錐帳篷（stripe 條紋）：底中心 (cx, yb)
  function tent(x, u, cx, yb, r, h, c, c2, stripe) {
    x.save(); x.translate(cx, 0);
    cone(x, u, yb, r, h, c, { style: stripe ? 'stripe' : 'thatch', c2, n: 8, conc: 0.25, flare: 1, seed: 3 });
    // 門簾
    x.beginPath(); x.moveTo(r * 0.05, yb - h * 0.5); x.lineTo(r * 0.3, yb + r * K * 0.95); x.lineTo(-r * 0.15, yb + r * K * 0.98); x.closePath(); fe(x, u, shade(c, -0.45), c, 0.01);
    line(x, 0, yb - h, 0, yb - h - u * 0.1, '#5a4030', lw(x, u, 0.016));
    x.beginPath(); x.moveTo(0, yb - h - u * 0.1); x.lineTo(u * 0.09, yb - h - u * 0.075); x.lineTo(0, yb - h - u * 0.05); x.closePath(); x.fillStyle = stripe ? c2 : '#e5484d'; x.fill();
    x.restore();
  }
  // 兵器架（長矛＋斧）
  function rack(x, u, cx, yb) {
    beam(x, u, cx - u * 0.1, yb - u * 0.06, cx + u * 0.1, yb - u * 0.06, u * 0.02, WOOD2);
    for (const [dx, c] of [[-0.07, '#c8ccd4'], [0, '#c8ccd4'], [0.07, '#c8ccd4']]) { line(x, cx + dx * u, yb + u * 0.03, cx + dx * u + u * 0.01, yb - u * 0.24, '#7a5232', lw(x, u, 0.014)); path(x, [cx + dx * u + u * 0.01, yb - u * 0.3, cx + dx * u - u * 0.008, yb - u * 0.24, cx + dx * u + u * 0.028, yb - u * 0.24]); x.fillStyle = c; x.fill(); }
    for (const sx of [-1, 1]) line(x, cx + sx * u * 0.1, yb + u * 0.03, cx + sx * u * 0.1, yb - u * 0.08, WOOD, lw(x, u, 0.02));
  }
  // 戰鼓：紅金條紋大棚子下一面大戰鼓
  function bannerDrum(x, u, B) {
    if (!B) {
      // 大鼓（在前面）
      const dx = -u * 0.14, dy = u * 0.06;
      for (const sd of [-1, 1]) log(x, u, dx + sd * u * 0.14, dy + u * 0.02, dx - sd * u * 0.12, dy - u * 0.2, u * 0.024, WOOD2);
      x.save(); x.translate(dx, 0);
      drum(x, u, dy - u * 0.04, u * 0.17, u * 0.17, '#b8402e', { tex: 'plain' });
      x.strokeStyle = '#f2c14e'; x.lineWidth = lw(x, u, 0.016);
      for (let i = 0; i < 6; i++) { const a0 = i / 6 * Math.PI, a1 = (i + 0.5) / 6 * Math.PI; x.beginPath(); x.moveTo(Math.cos(a0) * u * 0.17, dy - u * 0.21 + Math.sin(a0) * u * 0.17 * K); x.lineTo(Math.cos(a1) * u * 0.17, dy - u * 0.04 + Math.sin(a1) * u * 0.17 * K); x.stroke(); }
      for (const f of [0, 1]) { x.strokeStyle = '#5a2a1a'; x.lineWidth = lw(x, u, 0.024); x.beginPath(); x.ellipse(0, dy - u * 0.04 - f * u * 0.17, u * 0.172, u * 0.172 * K, 0, 0, Math.PI); x.stroke(); }
      x.beginPath(); x.ellipse(0, dy - u * 0.21, u * 0.17, u * 0.17 * K, 0, 0, TAU); fe(x, u, rgrad(x, 0, dy - u * 0.21, 0, u * 0.17, ['#fff6e0', '#f0dcb4', '#c8ac80'], -u * 0.04, -u * 0.02), '#c8ac80');
      circ(x, 0, dy - u * 0.21, u * 0.03, rgba('#8a5a2a', 0.35));
      x.restore();
      return;
    }
    pad(x, u, 3, '#c9b090');
    // 棚子：後柱＋條紋頂
    for (const px of [-u * 0.4, u * 0.4]) line(x, px, u * 0.0, px, -u * 0.58, '#5a3a22', lw(x, u, 0.03));
    line(x, 0, -u * 0.12, 0, -u * 0.58, '#4a2e1a', lw(x, u, 0.028));
    cone(x, u, -u * 0.58, u * 0.48, u * 0.26, '#c8382e', { style: 'stripe', n: 12, c2: '#f2c14e', conc: 0.55, valance: '#a82a22', finial: '#ffd36b' });
    for (const sx of [-0.3, 0.32]) { barrel(x, u, sx * u, -u * 0.04, u * 0.045, u * 0.08, '#8a5a2e'); }
    // 鼓棒架
    line(x, u * 0.26, u * 0.08, u * 0.34, -u * 0.12, '#7a5232', lw(x, u, 0.014)); circ(x, u * 0.34, -u * 0.13, u * 0.018, '#f4ead2');
  }
  // 瞭望塔：高木架、梯子、號角與燈籠
  function bannerWatch(x, u, B) {
    const py = -u * 0.85, w = u * 0.56;
    if (!B) { fenceBox(x, u, 0, py, w, u * 0.1, '#8a5a30', 'front'); return; }
    pad(x, u, 3, '#c9b090');
    log(x, u, 0, -u * 0.08, 0, py, u * 0.04, WOOD2);
    log(x, u, -u * 0.32, u * 0.0, -u * 0.22, py, u * 0.048, WOOD);
    log(x, u, u * 0.32, u * 0.0, u * 0.22, py, u * 0.048, WOOD2);
    for (const f of [0.18, 0.5]) { const y0 = py * f, y1 = py * (f + 0.3); log(x, u, -u * (0.31 - f * 0.1), y0, u * (0.31 - (f + 0.3) * 0.1), y1, u * 0.022, shade(WOOD, -0.1)); log(x, u, u * (0.31 - f * 0.1), y0, -u * (0.31 - (f + 0.3) * 0.1), y1, u * 0.022, shade(WOOD2, -0.1)); }
    log(x, u, 0, u * 0.09, 0, py + u * 0.05, u * 0.045, WOOD);
    // 梯子
    line(x, -u * 0.08, u * 0.15, -u * 0.05, py + u * 0.06, '#8a5a2e', lw(x, u, 0.016)); line(x, u * 0.03, u * 0.15, u * 0.04, py + u * 0.07, '#8a5a2e', lw(x, u, 0.016));
    for (let i = 1; i < 9; i++) { const f = i / 9; line(x, L(-u * 0.08, -u * 0.05, f), L(u * 0.15, py + u * 0.06, f), L(u * 0.03, u * 0.04, f), L(u * 0.15, py + u * 0.07, f), '#a8743e', lw(x, u, 0.012)); }
    deckBox(x, u, 0, py, w, PLANK, u * 0.04);
    fenceBox(x, u, 0, py, w, u * 0.1, '#8a5a30', 'back');
    // 號角（掛在欄杆上）與燈籠
    x.save(); x.translate(w * 0.36, py - u * 0.08);
    x.beginPath(); x.moveTo(-u * 0.04, -u * 0.01); x.quadraticCurveTo(u * 0.02, u * 0.03, u * 0.09, -u * 0.04); x.lineTo(u * 0.1, u * 0.02); x.quadraticCurveTo(u * 0.02, u * 0.06, -u * 0.045, u * 0.01); x.closePath(); fe(x, u, lgrad(x, -u * 0.04, 0, u * 0.1, 0, ['#f4e6c8', '#c8a878']), '#a88a5a');
    x.restore();
    lantern(x, u, -w * 0.4, py - u * 0.14);
    crate(x, u, u * 0.3, u * 0.12, u * 0.14, '#a8783e');
  }

  // ───────── 金礦：礦坑口、井架、礦車軌道 ─────────
  function mineBody(x, tier, sp, u, B, T) {
    void T;
    if (!B) return;
    if (tier === 3 && sp === 0) return mineBank(x, u);
    const gem = tier === 3 && sp === 1;
    const hh = u * (0.36 + tier * 0.05);
    ell(x, u * 0.03, u * 0.1, u * 0.5, u * 0.19, 'rgba(20,10,20,.22)');
    // 岩山
    const hill = gem ? '#7a6a8a' : tier >= 2 ? '#8f7a68' : '#a08a6a';
    mound(x, u, -u * 0.02, u * 0.1, u * 0.94, hh * 1.25, hill, { peak: -0.1, cap: gem ? null : '#5f9e3c', cd: u * 0.08, seed: 31 + tier, rocks: 9 });
    // 坑口（木框）
    const ew = u * 0.15, eh = u * 0.22, ey = u * 0.07;
    x.beginPath(); x.moveTo(-ew, ey); x.lineTo(-ew, ey - eh + ew * 0.5); x.quadraticCurveTo(0, ey - eh - ew * 0.3, ew, ey - eh + ew * 0.5); x.lineTo(ew, ey); x.closePath();
    x.fillStyle = rgrad(x, 0, ey - eh * 0.4, 0, eh, ['#3a2a1e', '#120c0a']); x.fill();
    if (gem) { x.save(); x.clip(); x.fillStyle = rgrad(x, 0, ey - eh * 0.3, 0, eh * 0.8, ['rgba(255,140,240,.6)', 'rgba(120,80,255,0)']); x.fillRect(-ew, ey - eh, ew * 2, eh); x.restore(); }
    else if (tier >= 1) { x.save(); x.clip(); x.fillStyle = rgrad(x, 0, ey - eh * 0.25, 0, eh * 0.5, ['rgba(255,200,90,.5)', 'rgba(255,200,90,0)']); x.fillRect(-ew, ey - eh, ew * 2, eh); x.restore(); }
    const fc = gem ? '#6a5a7a' : '#7a5532';
    beam(x, u, -ew - u * 0.01, ey + u * 0.01, -ew - u * 0.01, ey - eh - u * 0.01, u * 0.04, fc);
    beam(x, u, ew + u * 0.01, ey + u * 0.01, ew + u * 0.01, ey - eh - u * 0.01, u * 0.04, shade(fc, -0.15));
    beam(x, u, -ew - u * 0.04, ey - eh - u * 0.02, ew + u * 0.04, ey - eh - u * 0.02, u * 0.045, shade(fc, 0.05));
    if (tier >= 2 && !gem) { x.beginPath(); x.rect(-u * 0.06, ey - eh - u * 0.075, u * 0.12, u * 0.05); fe(x, u, '#e8d4a0', '#8a6a3a', 0.01); x.fillStyle = '#7a4a1a'; x.font = `900 ${u * 0.04}px "Noto Sans TC",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('金礦', 0, ey - eh - u * 0.048); }
    // 軌道
    x.strokeStyle = '#6a5a48'; x.lineWidth = lw(x, u, 0.02);
    for (let i = 0; i < 4; i++) { const f = i / 3, yy = L(ey - u * 0.02, u * 0.24, f), hw = L(u * 0.08, u * 0.13, f); line(x, -hw - u * 0.015, yy, hw + u * 0.015, yy, '#7a5532', lw(x, u, 0.022)); }
    line(x, -u * 0.07, ey - u * 0.02, -u * 0.12, u * 0.25, '#8a8f99', lw(x, u, 0.014)); line(x, u * 0.07, ey - u * 0.02, u * 0.12, u * 0.25, '#8a8f99', lw(x, u, 0.014));
    if (gem) {
      // 寶石礦坑：洞口四周長滿發光的彩色寶石
      for (const [px, pyy, w, h, c, t] of [[-0.3, -0.04, 0.05, 0.2, '#ff5d8f', -0.4], [-0.2, -0.14, 0.04, 0.16, '#c49bff', -0.2], [0.22, -0.12, 0.05, 0.22, '#5ad1ff', 0.3], [0.33, 0.02, 0.04, 0.15, '#7dffb0', 0.5], [0.0, -hh * 0.7 / u, 0.06, 0.24, '#ffd36b', 0.05], [-0.13, -hh * 0.6 / u, 0.035, 0.13, '#5ad1ff', -0.35], [0.13, -hh * 0.62 / u, 0.035, 0.12, '#ff5d8f', 0.4]]) { x.save(); x.shadowColor = c; x.shadowBlur = u * 0.1; ice(x, u, px * u, pyy * u, w * u, h * u, c, t, { dk: shade(c, -0.5), ec: shade(c, -0.55), core: 0.6 }); x.restore(); }
      return;
    }
    // 礦石堆、十字鎬
    for (const [px, pyy, c] of [[0.3, 0.13, '#ffd84a'], [0.36, 0.11, '#f2b632'], [0.33, 0.08, '#ffe98a'], [0.26, 0.12, '#c99a2a']]) { x.beginPath(); x.moveTo(px * u - u * 0.03, pyy * u); x.lineTo(px * u - u * 0.02, pyy * u - u * 0.035); x.lineTo(px * u + u * 0.02, pyy * u - u * 0.04); x.lineTo(px * u + u * 0.035, pyy * u); x.closePath(); fe(x, u, c, '#8a6a12', 0.01); }
    x.save(); x.translate(-u * 0.38, u * 0.06); x.rotate(-0.45); line(x, 0, 0, 0, -u * 0.2, '#8a5a2e', lw(x, u, 0.02)); x.beginPath(); x.moveTo(-u * 0.09, -u * 0.17); x.quadraticCurveTo(0, -u * 0.24, u * 0.09, -u * 0.17); x.lineTo(0, -u * 0.2); x.closePath(); fe(x, u, '#9aa0aa', '#5a5e68', 0.01); x.restore();
    if (tier >= 1) {
      // 井架（A 字木架，上面一個滑輪；輪子本身在 live 裡轉）
      const top = -hh * 1.42, wx = u * 0.06;
      const big = tier >= 2;
      log(x, u, -u * 0.08, -hh * 0.55, wx - u * 0.005, top + u * 0.02, u * (big ? 0.032 : 0.026), WOOD);
      log(x, u, u * 0.2, -hh * 0.45, wx + u * 0.005, top + u * 0.02, u * (big ? 0.032 : 0.026), WOOD2);
      if (big) { log(x, u, -u * 0.03, L(-hh * 0.55, top, 0.45), u * 0.15, L(-hh * 0.45, top, 0.45), u * 0.02, shade(WOOD, -0.1)); log(x, u, -u * 0.05, L(-hh * 0.55, top, 0.25), u * 0.13, L(-hh * 0.45, top, 0.65), u * 0.016, shade(WOOD2, -0.1)); }
      line(x, wx + u * 0.05, top, wx + u * 0.05, ey - eh - u * 0.03, '#3a3a3a', lw(x, u, 0.01));
      // 小工寮（Lv2 起）
      x.save(); x.translate(u * 0.32, -u * 0.04);
      prism(x, u, 0, 0, u * 0.2, u * 0.12, '#a8783e', { tex: 'plank', n: 3, top: false });
      pyr(x, u, 0, -u * 0.12, u * 0.24, u * 0.1, big ? '#6a7a8a' : '#8a5a3a', { style: big ? 'slate' : 'shingle', rows: 2 });
      x.restore();
    }
  }
  // 銀行：金色圓頂的金庫，石柱門廊、台階、金幣堆
  function mineBank(x, u) {
    ell(x, u * 0.03, u * 0.09, u * 0.52, u * 0.2, 'rgba(20,10,20,.25)');
    // 台階
    for (let i = 0; i < 3; i++) { const w = u * (0.9 - i * 0.06), y = u * (0.1 - i * 0.04); x.beginPath(); x.rect(-w / 2, y - u * 0.04, w, u * 0.045); fe(x, u, lgrad(x, -w / 2, 0, w / 2, 0, ['#e8e0cc', '#cfc5b0', '#a89e8a']), '#a89e8a'); }
    // 主體
    x.beginPath(); x.rect(-u * 0.38, -u * 0.5, u * 0.76, u * 0.48); fe(x, u, lgrad(x, -u * 0.38, 0, u * 0.38, 0, ['#f6efe0', '#e2d8c4', '#bcb29c']), '#bcb29c');
    // 圓頂
    const dy = -u * 0.62;
    drum(x, u, -u * 0.5, u * 0.22, u * 0.1, '#e2d8c4', { tex: 'plaster', top: null });
    x.beginPath(); x.ellipse(0, dy + u * 0.02, u * 0.22, u * 0.22 * K, 0, 0, Math.PI); x.arc(0, dy + u * 0.02, u * 0.22, 0, Math.PI, true); x.closePath();
    fe(x, u, rgrad(x, 0, dy, 0, u * 0.24, ['#fff4c0', '#f2c14e', '#a8761c'], -u * 0.08, -u * 0.1), '#a8761c');
    x.save(); x.clip(); x.strokeStyle = rgba('#7a4a10', 0.4); x.lineWidth = lw(x, u, 0.01); for (const f of [-0.6, -0.2, 0.2, 0.6]) { x.beginPath(); x.moveTo(f * u * 0.22, dy + u * 0.03); x.quadraticCurveTo(f * u * 0.24, dy - u * 0.15, 0, dy - u * 0.2); x.stroke(); } x.restore();
    line(x, 0, dy - u * 0.2, 0, dy - u * 0.28, '#a8761c', lw(x, u, 0.02)); circ(x, 0, dy - u * 0.29, u * 0.03, '#ffe08a');
    // 三角楣＋金幣徽
    x.beginPath(); x.moveTo(-u * 0.44, -u * 0.48); x.lineTo(0, -u * 0.62); x.lineTo(u * 0.44, -u * 0.48); x.closePath(); fe(x, u, lgrad(x, 0, -u * 0.62, 0, -u * 0.48, ['#f6ecd4', '#d4c6a8']), '#b8a888');
    circ(x, 0, -u * 0.535, u * 0.045, '#f2c14e'); x.strokeStyle = '#8a5a12'; x.lineWidth = lw(x, u, 0.012); x.stroke();
    x.fillStyle = '#8a5a12'; x.font = `900 ${u * 0.05}px "Noto Sans TC",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('金', 0, -u * 0.53);
    x.beginPath(); x.rect(-u * 0.42, -u * 0.5, u * 0.84, u * 0.035); fe(x, u, '#d8ccb0', '#a89e8a', 0.01);
    // 石柱
    for (let i = -2; i <= 2; i++) { if (i === 0) continue; const cx = i * u * 0.15; x.beginPath(); x.rect(cx - u * 0.032, -u * 0.46, u * 0.064, u * 0.42); fe(x, u, lgrad(x, cx - u * 0.032, 0, cx + u * 0.032, 0, ['#ffffff', '#e8dfcc', '#a8a08c']), '#a8a08c'); x.fillStyle = '#d8ccb0'; x.fillRect(cx - u * 0.042, -u * 0.47, u * 0.084, u * 0.02); x.fillRect(cx - u * 0.042, -u * 0.06, u * 0.084, u * 0.02); }
    // 金庫圓門
    x.beginPath(); x.arc(0, -u * 0.17, u * 0.09, 0, TAU); fe(x, u, rgrad(x, 0, -u * 0.17, 0, u * 0.09, ['#d8dce4', '#8a909a', '#4a4e58'], -u * 0.03, -u * 0.03), '#4a4e58');
    x.strokeStyle = '#f2c14e'; x.lineWidth = lw(x, u, 0.012); x.beginPath(); x.arc(0, -u * 0.17, u * 0.065, 0, TAU); x.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; line(x, Math.cos(a) * u * 0.02, -u * 0.17 + Math.sin(a) * u * 0.02, Math.cos(a) * u * 0.05, -u * 0.17 + Math.sin(a) * u * 0.05, '#c8ccd4', lw(x, u, 0.012)); }
    circ(x, 0, -u * 0.17, u * 0.018, '#f2c14e');
    // 金幣堆與錢袋
    for (const [bx, n] of [[-0.38, 4], [0.36, 3]]) for (let i = 0; i < n; i++) { ell(x, bx * u, u * 0.11 - i * u * 0.022, u * 0.055, u * 0.02, '#c99a2a'); ell(x, bx * u, u * 0.105 - i * u * 0.022, u * 0.055, u * 0.018, '#ffd84a'); }
    sack(x, u, u * 0.26, u * 0.13, u * 0.1, u * 0.1, '#c8a060'); x.fillStyle = '#8a5a12'; x.font = `900 ${u * 0.045}px "Noto Sans TC",sans-serif`; x.fillText('$', u * 0.26, u * 0.09);
  }

  // ───────── 兵營：木柵營地 → 石基營房 → 城門要塞；騎士團＝白石城堡、狂戰營＝北地長屋 ─────────
  // 木樁圍籬：繞著一個橢圓，part = back / front（front 在 gate 角度留門）
  function palisade(x, u, rx, ry, h, part, gate, sharp) {
    const n = 15, list = [];
    for (let i = 0; i < n; i++) list.push((i + 0.5) / n * TAU);
    list.sort((a, b) => Math.sin(a) - Math.sin(b));
    for (const a of list) {
      const front = Math.sin(a) > 0;
      if ((part === 'front') !== front) continue;
      if (gate !== undefined && Math.abs(Math.atan2(Math.sin(a - gate), Math.cos(a - gate))) < 0.32) continue;
      const px = Math.cos(a) * rx, py = Math.sin(a) * ry, hh = h * (0.85 + 0.15 * Math.sin(a * 5.3));
      const w = u * 0.034;
      path(x, [px - w, py, px - w, py - hh * 0.82, px, py - hh, px + w, py - hh * 0.82, px + w, py]);
      fe(x, u, lgrad(x, px - w, 0, px + w, 0, front ? [shade(WOOD, 0.12 - Math.cos(a) * 0.12), shade(WOOD2, -0.05 - Math.cos(a) * 0.1)] : [shade(WOOD2, -0.1), shade(WOOD2, -0.3)]), WOOD2, 0.01);
      if (sharp) { path(x, [px - w * 0.5, py - hh * 0.86, px, py - hh, px + w * 0.5, py - hh * 0.86]); x.fillStyle = rgba('#f4e2c4', 0.55); x.fill(); }
    }
    // 橫綁的繩
    x.strokeStyle = rgba('#d8c08a', 0.8); x.lineWidth = lw(x, u, 0.01);
    x.beginPath(); x.ellipse(0, -h * 0.55, rx, ry, 0, part === 'front' ? 0.05 : Math.PI + 0.05, part === 'front' ? Math.PI - 0.05 : TAU - 0.05); x.stroke();
  }
  function gateFrame(x, u, cx, yb, w, h, c) {
    for (const sx of [-1, 1]) beam(x, u, cx + sx * w / 2, yb + u * 0.01, cx + sx * w / 2, yb - h, u * 0.04, sx < 0 ? c : shade(c, -0.15));
    beam(x, u, cx - w / 2 - u * 0.04, yb - h + u * 0.01, cx + w / 2 + u * 0.04, yb - h + u * 0.01, u * 0.045, shade(c, 0.05));
  }
  function spears(x, u, cx, yb, n) {
    for (let i = 0; i < n; i++) { const dx = (i - (n - 1) / 2) * u * 0.035, top = yb - u * (0.26 + (i % 2) * 0.03); line(x, cx + dx, yb, cx + dx * 1.6, top, '#7a5232', lw(x, u, 0.012)); path(x, [cx + dx * 1.6, top - u * 0.05, cx + dx * 1.6 - u * 0.014, top + u * 0.004, cx + dx * 1.6 + u * 0.014, top + u * 0.004]); x.fillStyle = '#d8dee8'; x.fill(); }
  }
  function barracksBody(x, tier, sp, u, B, T) {
    void T;
    if (tier === 3 && sp === 0) return barracksKnight(x, u, B);
    if (tier === 3 && sp === 1) return barracksBerserk(x, u, B);
    if (tier === 0) {
      // Lv1：一圈木樁圍成的營地，前面開門，裡面一頂帳篷和兵器架
      if (B) {
        pad(x, u, 0);
        palisade(x, u, u * 0.42, u * 0.18, u * 0.2, 'back');
        tent(x, u, -u * 0.08, -u * 0.06, u * 0.2, u * 0.32, '#b8a070', '#8a7448', false);
        rack(x, u, u * 0.18, -u * 0.04);
        // 營火
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ell(x, u * 0.2 + Math.cos(a) * u * 0.045, u * 0.08 + Math.sin(a) * u * 0.02, u * 0.016, u * 0.01, '#7a7468'); }
        ell(x, u * 0.2, u * 0.08, u * 0.03, u * 0.013, '#3a2a20');
      } else {
        palisade(x, u, u * 0.42, u * 0.18, u * 0.2, 'front', Math.PI * 0.62);
        gateFrame(x, u, -u * 0.15, u * 0.17, u * 0.17, u * 0.27, WOOD);
      }
      return;
    }
    if (tier === 1) {
      // Lv2：石砌下半＋木框灰泥上半的營房，魚鱗瓦屋頂，門口掛盾
      if (B) {
        pad(x, u, 1);
        palisade(x, u, u * 0.44, u * 0.19, u * 0.16, 'back', undefined, true);
        prism(x, u, 0, u * 0.02, u * 0.6, u * 0.2, '#b0a796', { tex: 'stone', rh: u * 0.065, top: false, seed: 41 });
        prism(x, u, 0, -u * 0.18, u * 0.6, u * 0.22, '#e8dcc0', { tex: 'plaster', top: false });
        // 木框
        for (const [x0, y0, x1, y1] of [[-0.3, -0.18, -0.3, -0.4], [0, -0.07, 0, -0.29], [0.3, -0.18, 0.3, -0.4], [-0.3, -0.29, 0, -0.18], [0, -0.18, 0.3, -0.29]]) beam(x, u, x0 * u, y0 * u, x1 * u, y1 * u, u * 0.024, WOOD2);
        arch(x, u, -u * 0.15, -u * 0.02, u * 0.11, u * 0.16, '#3a2a22', K);
        x.save(); x.translate(u * 0.15, -u * 0.27); x.transform(1, -K, 0, 1, 0, 0); x.beginPath(); x.rect(-u * 0.04, -u * 0.03, u * 0.08, u * 0.06); fe(x, u, '#3a2a30', '#5a4a40', 0.01); x.fillStyle = rgba('#ffd36b', 0.7); x.fillRect(-u * 0.03, -u * 0.02, u * 0.06, u * 0.04); x.restore();
        pyr(x, u, 0, -u * 0.4, u * 0.72, u * 0.3, '#b8503a', { rows: 5 });
        line(x, u * 0.12, -u * 0.62, u * 0.12, -u * 0.78, '#4a4a52', lw(x, u, 0.03));
      } else {
        palisade(x, u, u * 0.44, u * 0.19, u * 0.16, 'front', Math.PI * 0.62, true);
        shield(x, u, u * 0.08, -u * 0.08, u * 0.055, '#3a6fd8');
        barrel(x, u, u * 0.3, u * 0.12, u * 0.045, u * 0.08, '#8a5a2e');
      }
      return;
    }
    // Lv3：兩座圓塔夾著城門，鐵閘門、紅瓦尖頂、門上的大旗
    if (B) {
      pad(x, u, 2);
      for (const sx of [-1, 1]) {
        x.save(); x.translate(sx * u * 0.27, -u * 0.02);
        drum(x, u, 0, u * 0.14, u * 0.5, '#b4ab9a', { r1: u * 0.13, tex: 'stone', seed: 50 + sx, rh: u * 0.07 });
        merlons(x, u, -u * 0.5, u * 0.15, u * 0.05, '#b4ab9a', 'back', 6);
        disk(x, u, -u * 0.5, u * 0.15, '#c8bfae', u * 0.02);
        cone(x, u, -u * 0.53, u * 0.16, u * 0.26, sx < 0 ? '#b8503a' : '#a8463a', { finial: '#ffd36b', rows: 4 });
        slit(x, u, sx * u * 0.03, -u * 0.25, u * 0.07, 0);
        x.restore();
      }
      prism(x, u, 0, u * 0.02, u * 0.4, u * 0.36, '#c0b7a4', { tex: 'stone', seed: 52, top: '#a89f8c' });
      merlons(x, u, -u * 0.36, u * 0.0, u * 0.0, '#c0b7a4', 'back', 1);
      // 鐵閘門
      x.save(); x.translate(-u * 0.1, -u * 0.06); x.transform(1, K, 0, 1, 0, 0);
      x.beginPath(); x.moveTo(-u * 0.07, u * 0.1); x.lineTo(-u * 0.07, -u * 0.05); x.arc(0, -u * 0.05, u * 0.07, Math.PI, 0); x.lineTo(u * 0.07, u * 0.1); x.closePath(); fe(x, u, '#2a1e22', '#5a4a50', 0.01);
      x.strokeStyle = '#6a6e78'; x.lineWidth = lw(x, u, 0.012);
      for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * u * 0.025, -u * 0.1); x.lineTo(i * u * 0.025, u * 0.06); x.stroke(); }
      for (let j = 0; j < 3; j++) { x.beginPath(); x.moveTo(-u * 0.065, -u * 0.05 + j * u * 0.045); x.lineTo(u * 0.065, -u * 0.05 + j * u * 0.045); x.stroke(); }
      x.restore();
      banner(x, u, u * 0.1, -u * 0.32, u * 0.11, u * 0.2, '#c8382e', 'cross');
      // 城牆垛口（後半）
      for (const [px, py] of [[-0.18, -0.38], [-0.06, -0.43], [0.06, -0.43], [0.18, -0.38]]) { x.beginPath(); x.rect(px * u - u * 0.03, py * u - u * 0.05, u * 0.06, u * 0.05); fe(x, u, '#c8bfae', '#a89f8c', 0.01); }
    } else {
      for (const sx of [-1, 1]) { x.save(); x.translate(sx * u * 0.27, -u * 0.02); merlons(x, u, -u * 0.5, u * 0.15, u * 0.05, '#b4ab9a', 'front', 6); x.restore(); }
      barrel(x, u, u * 0.4, u * 0.14, u * 0.04, u * 0.07, '#8a5a2e');
      spears(x, u, -u * 0.42, u * 0.12, 3);
    }
  }
  // 騎士團：白石方堡＋兩座藍頂尖塔、藍底金獅旗、台階
  function barracksKnight(x, u, B) {
    const st = '#e2ddd2';
    if (B) {
      pad(x, u, 3, '#c8c4bc');
      for (const sx of [-1, 1]) {
        x.save(); x.translate(sx * u * 0.3, -u * 0.06);
        drum(x, u, 0, u * 0.11, u * 0.72, st, { r1: u * 0.1, tex: 'stone', seed: 60 + sx, rh: u * 0.065 });
        disk(x, u, -u * 0.72, u * 0.12, '#d0cabe', u * 0.02);
        cone(x, u, -u * 0.74, u * 0.13, u * 0.38, '#3a5aa8', { style: 'slate', finial: '#ffd36b', rows: 5 });
        slit(x, u, sx * u * 0.02, -u * 0.4, u * 0.08, 0);
        x.restore();
      }
      prism(x, u, 0, u * 0.03, u * 0.48, u * 0.5, st, { tex: 'stone', seed: 61, top: false });
      prism(x, u, 0, -u * 0.47, u * 0.52, u * 0.06, '#d4cec2', { tex: 'stone', seed: 62, rh: u * 0.06 });
      pyr(x, u, 0, -u * 0.53, u * 0.56, u * 0.34, '#4a68b8', { style: 'slate', finial: '#ffd36b', rows: 5 });
      // 大門＋金邊
      arch(x, u, -u * 0.12, -u * 0.05, u * 0.13, u * 0.2, '#2a2236', K, '#ffcf7a');
      // 藍金大旗
      banner(x, u, u * 0.12, -u * 0.42, u * 0.13, u * 0.28, '#2f56b8', 'cross', { trim: '#ffd36b', ec: '#ffd36b' });
      x.save(); x.translate(u * 0.12, -u * 0.3); crest(x, u, 0, 0, u * 0.035, '#f2c14e', '#fff3b0'); x.restore();
    } else {
      // 台階
      for (let i = 0; i < 2; i++) { const w = u * (0.2 - i * 0.04); x.save(); x.translate(-u * 0.18, u * 0.1 - i * u * 0.035); x.transform(1, K, 0, 1, 0, 0); x.beginPath(); x.rect(-w / 2, -u * 0.035, w, u * 0.035); fe(x, u, lgrad(x, -w / 2, 0, w / 2, 0, ['#f0ece4', '#bab4a8']), '#a8a298', 0.01); x.restore(); }
      pennant(x, u, u * 0.42, u * 0.12, u * 0.14, '#3a6fd8', 1);
      pennant(x, u, -u * 0.44, u * 0.06, u * 0.14, '#f2c14e', -1);
    }
  }
  // 狂戰營：圓木長屋＋陡峭茅草屋頂、屋脊兩端翹起的獸角、門上牛角頭骨、尖木樁與火盆
  function barracksBerserk(x, u, B) {
    if (B) {
      pad(x, u, 0);
      palisade(x, u, u * 0.46, u * 0.2, u * 0.22, 'back', undefined, true);
      prism(x, u, 0, u * 0.02, u * 0.66, u * 0.24, '#8a5a32', { tex: 'log', rh: u * 0.055, top: false });
      pyr(x, u, 0, -u * 0.22, u * 0.8, u * 0.5, '#9a7a3e', { style: 'thatch', rows: 7 });
      // 屋脊兩端交叉的山牆板，末端雕成往外捲的龍頭
      for (const sd of [-1, 1]) {
        beam(x, u, -sd * u * 0.05, -u * 0.64, sd * u * 0.16, -u * 0.9, u * 0.035, sd < 0 ? '#8a5a32' : '#6a4424');
        x.strokeStyle = '#5a3a1e'; x.lineWidth = lw(x, u, 0.03); x.lineCap = 'round'; x.beginPath(); x.moveTo(sd * u * 0.16, -u * 0.9); x.quadraticCurveTo(sd * u * 0.26, -u * 0.98, sd * u * 0.22, -u * 0.86); x.stroke(); x.lineCap = 'butt';
        circ(x, sd * u * 0.19, -u * 0.93, u * 0.012, '#ffd36b');
      }
      // 門＋牛角頭骨
      arch(x, u, -u * 0.16, -u * 0.04, u * 0.11, u * 0.16, '#2a1a14', K, '#ff9a3a');
      x.save(); x.translate(-u * 0.16, -u * 0.2);
      x.beginPath(); x.ellipse(0, 0, u * 0.035, u * 0.04, 0, 0, TAU); fe(x, u, '#f0e6d0', '#a89878', 0.01);
      circ(x, -u * 0.012, -u * 0.004, u * 0.008, '#2a1a14'); circ(x, u * 0.012, -u * 0.004, u * 0.008, '#2a1a14');
      x.strokeStyle = '#efe2c4'; x.lineWidth = lw(x, u, 0.016); x.lineCap = 'round';
      for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(sd * u * 0.03, -u * 0.02); x.quadraticCurveTo(sd * u * 0.08, -u * 0.02, sd * u * 0.08, -u * 0.07); x.stroke(); }
      x.lineCap = 'butt'; x.restore();
      // 紅色戰紋
      x.save(); x.translate(u * 0.17, -u * 0.12); x.transform(1, -K, 0, 1, 0, 0); x.strokeStyle = rgba('#c8281e', 0.85); x.lineWidth = lw(x, u, 0.018); x.beginPath(); x.moveTo(-u * 0.06, -u * 0.04); x.lineTo(0, u * 0.03); x.lineTo(u * 0.06, -u * 0.04); x.moveTo(-u * 0.06, u * 0.0); x.lineTo(0, u * 0.07); x.lineTo(u * 0.06, u * 0.0); x.stroke(); x.restore();
      for (const sx of [-1, 1]) brazier(x, u, sx * u * 0.4, -u * 0.12);
    } else {
      palisade(x, u, u * 0.46, u * 0.2, u * 0.22, 'front', Math.PI * 0.64, true);
      // 斧頭架
      x.save(); x.translate(u * 0.3, u * 0.1);
      for (const sd of [-1, 1]) { line(x, sd * u * 0.03, 0, -sd * u * 0.03, -u * 0.18, '#6a4424', lw(x, u, 0.014)); x.beginPath(); x.moveTo(-sd * u * 0.03, -u * 0.17); x.quadraticCurveTo(-sd * u * 0.09, -u * 0.2, -sd * u * 0.08, -u * 0.12); x.lineTo(-sd * u * 0.035, -u * 0.13); x.closePath(); fe(x, u, '#c8ccd4', '#6a6e78', 0.01); }
      x.restore();
    }
  }

  // ───────── 煉金塔：煉金小屋 → 銅頂工坊 → 煉金高塔；瘟疫鍋＝巨大鐵鍋、腐蝕酸＝黃銅精煉廠 ─────────
  // 玻璃瓶（藥水）
  function vial(x, u, cx, yb, s, c, tall) {
    const h = s * (tall ? 2.6 : 1.6);
    x.beginPath(); x.moveTo(cx - s * 0.28, yb - h); x.lineTo(cx - s * 0.28, yb - h * 0.62); x.quadraticCurveTo(cx - s, yb - h * 0.5, cx - s, yb - s * 0.4); x.quadraticCurveTo(cx - s, yb, cx, yb); x.quadraticCurveTo(cx + s, yb, cx + s, yb - s * 0.4); x.quadraticCurveTo(cx + s, yb - h * 0.5, cx + s * 0.28, yb - h * 0.62); x.lineTo(cx + s * 0.28, yb - h); x.closePath();
    fe(x, u, rgba('#e8fff4', 0.35), '#5a8a7a', 0.008);
    x.save(); x.clip(); x.fillStyle = lgrad(x, 0, yb - h * 0.55, 0, yb, [shade(c, 0.35), c, shade(c, -0.3)]); x.fillRect(cx - s * 1.2, yb - h * 0.52, s * 2.4, h); x.restore();
    x.fillStyle = rgba('#ffffff', 0.7); x.fillRect(cx - s * 0.6, yb - s * 1.0, s * 0.18, s * 0.6);
    x.beginPath(); x.rect(cx - s * 0.34, yb - h - s * 0.3, s * 0.68, s * 0.32); fe(x, u, '#a8743e', '#6a4424', 0.008);
  }
  function cauldron(x, u, cx, yb, r, c, liq) {
    x.save(); x.translate(cx, 0);
    for (const sd of [-1, 0.2, 1]) line(x, sd * r * 0.75, yb + r * 0.05, sd * r * 0.6, yb - r * 0.3, '#2a2a30', lw(x, u, 0.018));
    x.beginPath(); x.ellipse(0, yb - r * 0.55, r, r * K * 1.1, 0, Math.PI, 0, true); x.quadraticCurveTo(r * 1.05, yb + r * 0.15, 0, yb + r * 0.2); x.quadraticCurveTo(-r * 1.05, yb + r * 0.15, -r, yb - r * 0.55); x.closePath();
    fe(x, u, rgrad(x, -r * 0.3, yb - r * 0.4, r * 0.1, r * 1.3, [shade(c, 0.35), c, shade(c, -0.45)]), c);
    x.beginPath(); x.ellipse(0, yb - r * 0.55, r * 1.04, r * K * 1.14, 0, 0, TAU); fe(x, u, shade(c, 0.15), c, 0.012);
    x.beginPath(); x.ellipse(0, yb - r * 0.55, r * 0.88, r * K * 0.95, 0, 0, TAU); x.fillStyle = rgrad(x, 0, yb - r * 0.55, 0, r * 0.9, [shade(liq, 0.45), liq, shade(liq, -0.25)]); x.fill();
    x.restore();
  }
  function pipe(x, u, pts, w, c) {
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.strokeStyle = edgeC(c); x.lineWidth = w + lw(x, u, 0.012) * 2; x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.stroke();
    x.strokeStyle = c; x.lineWidth = w; x.stroke();
    x.strokeStyle = rgba('#fff4d0', 0.45); x.lineWidth = w * 0.3; x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px, py - w * 0.2) : x.moveTo(px, py - w * 0.2)); x.stroke();
    x.lineCap = 'butt';
  }
  const ALC_G = '#7ad04a';
  function alchemyBody(x, tier, sp, u, B, T) {
    void T;
    if (tier === 3 && sp === 0) return alchemyPlague(x, u, B);
    if (tier === 3 && sp === 1) return alchemyAcid(x, u, B);
    if (tier === 0) {
      // Lv1：圓形土屋＋茅草頂、石砌煙囪，屋外一口小鍋
      if (B) {
        pad(x, u, 0);
        x.save(); x.translate(-u * 0.08, -u * 0.02);
        drum(x, u, 0, u * 0.24, u * 0.24, '#c8a878', { r1: u * 0.22, tex: 'plaster', seed: 5 });
        arch(x, u, u * 0.02, -u * 0.04, u * 0.09, u * 0.13, '#3a2a22', 0, '#9ef06a');
        cone(x, u, -u * 0.22, u * 0.3, u * 0.3, '#a88848', { style: 'thatch', seed: 8 });
        x.restore();
        prism(x, u, u * 0.1, -u * 0.32, u * 0.08, u * 0.24, '#8a8478', { tex: 'stone', rh: u * 0.04, top: '#5a5650' });
        for (let i = 0; i < 4; i++) { vial(x, u, -u * 0.36 + i * u * 0.05, u * 0.1, u * 0.02, ['#7ad04a', '#c87aff', '#ffb03a', '#5ad8ff'][i], i % 2); }
      } else {
        cauldron(x, u, u * 0.24, u * 0.13, u * 0.11, '#3a3a44', ALC_G);
      }
      return;
    }
    if (tier === 1) {
      // Lv2：石砌圓工坊＋銅綠圓頂，旁邊蒸餾器（燒瓶＋盤管＋接收瓶）
      if (B) {
        pad(x, u, 1);
        drum(x, u, 0, u * 0.28, u * 0.36, '#b4aa98', { r1: u * 0.26, tex: 'stone', seed: 72, rh: u * 0.07 });
        disk(x, u, -u * 0.36, u * 0.29, '#9a9284', u * 0.025);
        cone(x, u, -u * 0.38, u * 0.27, u * 0.26, '#5aa88a', { conc: 0.05, finial: '#c87a3a', rows: 5 });
        // 銅邊
        x.strokeStyle = '#c87a3a'; x.lineWidth = lw(x, u, 0.022); x.beginPath(); x.ellipse(0, -u * 0.38, u * 0.27, u * 0.27 * K, 0, 0.05, Math.PI - 0.05); x.stroke();
        arch(x, u, -u * 0.08, -u * 0.06, u * 0.1, u * 0.15, '#2a2a22', 0, '#9ef06a');
        x.save(); x.translate(u * 0.13, -u * 0.22); x.transform(1, -0.15, 0, 1, 0, 0); x.beginPath(); x.arc(0, 0, u * 0.04, 0, TAU); fe(x, u, '#2a3a2a', '#5a6a5a', 0.01); x.fillStyle = rgba('#9ef06a', 0.7); x.beginPath(); x.arc(0, 0, u * 0.028, 0, TAU); x.fill(); x.restore();
      } else {
        // 蒸餾器
        brazierSmall(x, u, u * 0.3, u * 0.12);
        vial(x, u, u * 0.3, u * 0.02, u * 0.05, ALC_G, false);
        pipe(x, u, [[u * 0.3, -u * 0.1], [u * 0.36, -u * 0.16], [u * 0.43, -u * 0.08], [u * 0.43, u * 0.04]], u * 0.014, '#c87a3a');
        vial(x, u, u * 0.43, u * 0.14, u * 0.035, '#c8ff6a', false);
        for (let i = 0; i < 3; i++) vial(x, u, -u * 0.38 + i * u * 0.055, u * 0.13, u * 0.022, ['#c87aff', '#ffb03a', '#5ad8ff'][i], true);
      }
      return;
    }
    // Lv3：細高的石塔＋頂上發光的玻璃圓頂（黃銅骨架），外牆有管線、窗裡排滿藥瓶
    if (B) {
      pad(x, u, 2);
      drum(x, u, 0, u * 0.26, u * 0.62, '#a8a092', { r1: u * 0.2, tex: 'stone', seed: 81, rh: u * 0.075 });
      for (const y of [-0.2, -0.42]) { x.strokeStyle = '#c87a3a'; x.lineWidth = lw(x, u, 0.02); x.beginPath(); const r = L(u * 0.26, u * 0.2, -y / 0.62); x.ellipse(0, y * u, r, r * K, 0, 0.05, Math.PI - 0.05); x.stroke(); }
      arch(x, u, -u * 0.07, -u * 0.06, u * 0.1, u * 0.15, '#2a2a22', 0, '#9ef06a');
      arch(x, u, u * 0.06, -u * 0.36, u * 0.07, u * 0.1, '#2a2a22', 0, '#c8ff6a');
      disk(x, u, -u * 0.62, u * 0.24, '#c87a3a', u * 0.03);
      // 玻璃圓頂（黃銅肋）
      const dy = -u * 0.64, dr = u * 0.2;
      x.beginPath(); x.ellipse(0, dy, dr, dr * K, 0, 0, Math.PI); x.arc(0, dy, dr, 0, Math.PI, true); x.closePath();
      fe(x, u, rgrad(x, -dr * 0.3, dy - dr * 0.5, 0, dr * 1.2, [rgba('#f0ffe0', 0.95), rgba('#9ef06a', 0.8), rgba('#3a8a3a', 0.85)]), '#3a6a3a');
      x.strokeStyle = '#c87a3a'; x.lineWidth = lw(x, u, 0.016);
      for (const f of [-0.6, 0, 0.6]) { x.beginPath(); x.moveTo(f * dr, dy + Math.sqrt(1 - f * f) * dr * K * 0.9); x.quadraticCurveTo(f * dr * 1.05, dy - dr * 0.7, 0, dy - dr); x.stroke(); }
      line(x, 0, dy - dr, 0, dy - dr - u * 0.1, '#c87a3a', lw(x, u, 0.02)); circ(x, 0, dy - dr - u * 0.11, u * 0.024, '#ffd36b');
      banner(x, u, -u * 0.13, -u * 0.5, u * 0.09, u * 0.18, '#3a8a4a', 'circle', { ec: '#c8ff6a' });
      // 外牆管線
      pipe(x, u, [[u * 0.2, -u * 0.55], [u * 0.3, -u * 0.5], [u * 0.3, -u * 0.08], [u * 0.24, u * 0.0]], u * 0.022, '#c87a3a');
    } else {
      brazierSmall(x, u, -u * 0.34, u * 0.12);
      vial(x, u, -u * 0.34, u * 0.03, u * 0.05, '#c8ff6a', false);
      cauldron(x, u, u * 0.3, u * 0.14, u * 0.09, '#3a3a44', ALC_G);
    }
  }
  function brazierSmall(x, u, cx, yb) {
    for (const sd of [-1, 1]) line(x, cx + sd * u * 0.04, yb, cx + sd * u * 0.025, yb - u * 0.07, '#3a3a40', lw(x, u, 0.014));
    x.beginPath(); x.ellipse(cx, yb - u * 0.07, u * 0.05, u * 0.018, 0, 0, TAU); fe(x, u, '#4a4a52', '#2a2a30', 0.01);
    ell(x, cx, yb - u * 0.075, u * 0.035, u * 0.01, '#ff8a2a');
  }
  // 瘟疫鍋：石砌火坑上一口巨大的黑鐵鍋，上方歪斜的木吊架掛著大勺和鐵鍊，旁邊骷髏
  function alchemyPlague(x, u, B) {
    if (B) {
      pad(x, u, 0);
      x.fillStyle = rgba('#5a2a6a', 0.3); x.beginPath(); x.ellipse(0, u * 0.03, u * 0.46, u * 0.19, 0, 0, TAU); x.fill();
      // 木吊架
      log(x, u, -u * 0.36, u * 0.02, -u * 0.22, -u * 0.86, u * 0.04, WOOD2);
      log(x, u, u * 0.34, -u * 0.02, u * 0.22, -u * 0.84, u * 0.04, WOOD);
      log(x, u, -u * 0.3, -u * 0.86, u * 0.3, -u * 0.8, u * 0.042, shade(WOOD, -0.08));
      lash(x, u, -u * 0.22, -u * 0.84, u * 0.02); lash(x, u, u * 0.22, -u * 0.82, u * 0.02);
      // 石砌火坑
      drum(x, u, 0, u * 0.36, u * 0.14, '#6a6058', { r1: u * 0.34, tex: 'stone', seed: 91, rh: u * 0.06 });
      x.fillStyle = rgba('#ff6a1a', 0.85); for (let i = 0; i < 5; i++) { const a = (i + 0.5) / 5 * Math.PI; x.beginPath(); x.ellipse(Math.cos(a) * u * 0.3, -u * 0.07 + Math.sin(a) * u * 0.3 * K, u * 0.03, u * 0.018, 0, 0, TAU); x.fill(); }
      // 大鐵鍋
      cauldron(x, u, 0, -u * 0.12, u * 0.33, '#2e2a34', '#9a4ad8');
      // 鍋邊的骷髏
      x.save(); x.translate(-u * 0.22, -u * 0.27);
      x.beginPath(); x.arc(0, 0, u * 0.04, 0, TAU); fe(x, u, '#e8e0cc', '#8a8070', 0.01); x.fillStyle = '#e8e0cc'; x.fillRect(-u * 0.022, u * 0.02, u * 0.044, u * 0.025);
      circ(x, -u * 0.015, 0, u * 0.011, '#2a1a2a'); circ(x, u * 0.015, 0, u * 0.011, '#2a1a2a');
      x.restore();
      // 鐵鍊與大勺
      x.strokeStyle = '#5a5a64'; x.lineWidth = lw(x, u, 0.012); for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(u * 0.12, -u * 0.78 + i * u * 0.05, u * 0.01, u * 0.022, 0, 0, TAU); x.stroke(); }
      line(x, u * 0.12, -u * 0.48, u * 0.16, -u * 0.36, '#6a4424', lw(x, u, 0.02));
      x.beginPath(); x.ellipse(u * 0.17, -u * 0.34, u * 0.035, u * 0.018, 0, 0, TAU); fe(x, u, '#5a5a64', '#2a2a30', 0.01);
    } else {
      for (const [px, c] of [[-0.42, '#9a4ad8'], [0.4, '#7ad04a'], [0.46, '#c87aff']]) vial(x, u, px * u, u * 0.14, u * 0.028, c, px > 0.42);
    }
  }
  // 腐蝕酸：黃銅鍋爐＋兩座玻璃酸液槽、管線、壓力錶、警示條紋
  function alchemyAcid(x, u, B) {
    const brass = '#c89a3a';
    if (B) {
      pad(x, u, 3, '#8a8a8e');
      // 後方兩座酸液槽
      for (const sx of [-1, 1]) {
        x.save(); x.translate(sx * u * 0.27, -u * 0.06);
        drum(x, u, 0, u * 0.12, u * 0.08, brass, { tex: 'plate', n: 6 });
        const gh = u * 0.5;
        x.beginPath(); x.moveTo(-u * 0.11, -u * 0.08); x.lineTo(-u * 0.11, -u * 0.08 - gh); x.ellipse(0, -u * 0.08 - gh, u * 0.11, u * 0.11 * K, 0, Math.PI, 0); x.lineTo(u * 0.11, -u * 0.08); x.ellipse(0, -u * 0.08, u * 0.11, u * 0.11 * K, 0, 0, Math.PI); x.closePath();
        fe(x, u, rgba('#e8fff0', 0.3), '#5a7a6a', 0.01);
        const lv = -u * 0.08 - gh * (sx < 0 ? 0.7 : 0.55);
        x.save(); x.clip(); x.fillStyle = lgrad(x, -u * 0.11, 0, u * 0.11, 0, ['#e8ff6a', '#b8e83a', '#6a9a1a']); x.fillRect(-u * 0.12, lv, u * 0.24, gh + u * 0.1); x.fillStyle = rgba('#f8ffb0', 0.7); x.beginPath(); x.ellipse(0, lv, u * 0.11, u * 0.11 * K, 0, 0, TAU); x.fill(); x.restore();
        x.fillStyle = rgba('#ffffff', 0.55); x.fillRect(-u * 0.08, -u * 0.08 - gh * 0.9, u * 0.02, gh * 0.75);
        for (const f of [0.33, 0.66]) { x.strokeStyle = brass; x.lineWidth = lw(x, u, 0.016); x.beginPath(); x.ellipse(0, -u * 0.08 - gh * f, u * 0.112, u * 0.112 * K, 0, 0.05, Math.PI - 0.05); x.stroke(); }
        disk(x, u, -u * 0.08 - gh, u * 0.12, brass, u * 0.025);
        x.restore();
      }
      pipe(x, u, [[-u * 0.27, -u * 0.62], [-u * 0.27, -u * 0.72], [u * 0.27, -u * 0.72], [u * 0.27, -u * 0.62]], u * 0.024, brass);
      // 中央鍋爐
      drum(x, u, u * 0.04, u * 0.17, u * 0.34, '#b88a3a', { r1: u * 0.15, tex: 'plate', n: 8 });
      cone(x, u, -u * 0.3, u * 0.16, u * 0.12, '#a87a2a', { style: 'slate', rows: 3 });
      line(x, u * 0.05, -u * 0.4, u * 0.05, -u * 0.62, '#4a4a52', lw(x, u, 0.04));
      // 警示條紋
      x.save(); x.beginPath(); x.ellipse(0, u * 0.0, u * 0.17, u * 0.17 * K, 0, 0, Math.PI); x.lineTo(-u * 0.17, -u * 0.04); x.ellipse(0, -u * 0.04, u * 0.17, u * 0.17 * K, 0, Math.PI, 0, true); x.closePath(); x.clip();
      for (let i = -6; i < 6; i++) { x.fillStyle = i % 2 ? '#2a2a2a' : '#f2c14e'; x.beginPath(); x.moveTo(i * u * 0.04, -u * 0.08); x.lineTo(i * u * 0.04 + u * 0.04, -u * 0.08); x.lineTo(i * u * 0.04 + u * 0.08, u * 0.08); x.lineTo(i * u * 0.04 + u * 0.04, u * 0.08); x.closePath(); x.fill(); }
      x.restore();
    } else {
      // 壓力錶與閥門
      x.save(); x.translate(-u * 0.06, -u * 0.18);
      circ(x, 0, 0, u * 0.05, '#c89a3a'); x.strokeStyle = '#6a4a1a'; x.lineWidth = lw(x, u, 0.01); x.stroke(); circ(x, 0, 0, u * 0.038, '#f4f0e0');
      line(x, 0, 0, u * 0.025, -u * 0.02, '#c8281e', lw(x, u, 0.01));
      x.restore();
      pipe(x, u, [[u * 0.17, -u * 0.12], [u * 0.36, -u * 0.12], [u * 0.36, u * 0.06]], u * 0.022, brass);
      circ(x, u * 0.36, -u * 0.12, u * 0.03, '#c8281e');
      vial(x, u, -u * 0.38, u * 0.14, u * 0.03, '#d8ff4a', true);
    }
  }

  // ───────── 靜態塔身入口 ─────────
  function body(x, k, tier, sp, u, part) {
    const B = part === 'back', T = Art.topH(k, tier) * u;
    switch (k) {
      case 'arrow': return arrowBody(x, tier, sp, u, B, T);
      case 'cannon': return cannonBody(x, tier, sp, u, B, T);
      case 'frost': return frostBody(x, tier, sp, u, B, T);
      case 'magic': return magicBody(x, tier, sp, u, B, T);
      case 'sniper': return sniperBody(x, tier, sp, u, B, T);
      case 'banner': return bannerBody(x, tier, sp, u, B, T);
      case 'mine': return mineBody(x, tier, sp, u, B, T);
      case 'barracks': return barracksBody(x, tier, sp, u, B, T);
      case 'alchemy': return alchemyBody(x, tier, sp, u, B, T);
    }
  }
  return { body, lw, edge, fe, drum, prism, cone, pyr, disk, ice, rock, banner, lantern, beam, log, eagle, shield, vial, cauldron, pipe };
})();
