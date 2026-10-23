'use strict';
// 守塔奇兵：畫面繪製。世界座標（格）→ 螢幕座標由 view 負責；直式畫面時地圖轉 90 度。
// 所有物件都在螢幕空間「正立」畫，所以轉向後塔和怪物也不會躺著。

function makeView(s, rot, ox, oy) {
  const v = { s, rot, ox, oy };
  v.P = (x, y) => rot ? [ox + (ROWS - y) * s, oy + x * s] : [ox + x * s, oy + y * s];
  v.U = (sx, sy) => rot ? [(sy - oy) / s, ROWS - (sx - ox) / s] : [(sx - ox) / s, (sy - oy) / s];
  v.A = a => rot ? a + Math.PI / 2 : a;
  v.w = (rot ? ROWS : COLS) * s; v.h = (rot ? COLS : ROWS) * s;
  return v;
}

const Draw = (() => {
  const TAU = Math.PI * 2;
  // 顏色工具
  function hex(c) { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  const _mix = {};
  function mix(a, b, t) {
    const key = a + b + (t * 20 | 0);
    if (_mix[key]) return _mix[key];
    const A = hex(a), B = hex(b);
    const r = 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
    return (_mix[key] = r);
  }
  const shade = (c, t) => t > 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t);

  function ell(ctx, x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); ctx.fill(); }
  function circ(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); ctx.fill(); }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function poly(ctx, pts, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); }

  // ───────── 地形裝飾 ─────────
  function deco(ctx, k, x, y, s, v, T) {
    ell(ctx, x + s * 0.06, y + s * 0.28, s * 0.36, s * 0.13, 'rgba(0,0,0,.18)');
    switch (k) {
      case 'tree': {
        ctx.fillStyle = '#7a5134'; ctx.fillRect(x - s * 0.05, y, s * 0.1, s * 0.28);
        const g = v < 0.5 ? '#3f9a3e' : '#4aa845';
        circ(ctx, x - s * 0.15, y - s * 0.05, s * 0.22, shade(g, -0.12));
        circ(ctx, x + s * 0.15, y - s * 0.03, s * 0.21, shade(g, -0.12));
        circ(ctx, x, y - s * 0.2, s * 0.26, g);
        circ(ctx, x - s * 0.07, y - s * 0.28, s * 0.11, shade(g, 0.25));
        if (v > 0.75) { circ(ctx, x + s * 0.1, y - s * 0.12, s * 0.04, '#ff6b5a'); circ(ctx, x - s * 0.12, y, s * 0.035, '#ff6b5a'); }
        break;
      }
      case 'pine': case 'spine': {
        const g = k === 'spine' ? '#4f8a76' : (v < 0.5 ? '#2f7d4a' : '#3a8a50');
        ctx.fillStyle = '#6b4a30'; ctx.fillRect(x - s * 0.04, y + s * 0.1, s * 0.08, s * 0.18);
        for (let i = 0; i < 3; i++) {
          const yy = y + s * 0.15 - i * s * 0.18, w = s * (0.34 - i * 0.08);
          poly(ctx, [x - w, yy, x + w, yy, x, yy - s * 0.3], shade(g, i * 0.06));
          if (k === 'spine') poly(ctx, [x - w * 0.5, yy - s * 0.15, x + w * 0.5, yy - s * 0.15, x, yy - s * 0.3], '#ffffff');
        }
        break;
      }
      case 'bush':
        circ(ctx, x - s * 0.14, y + s * 0.08, s * 0.16, '#3d8f3a'); circ(ctx, x + s * 0.14, y + s * 0.1, s * 0.15, '#3d8f3a');
        circ(ctx, x, y, s * 0.2, '#4ba646'); circ(ctx, x - s * 0.05, y - s * 0.07, s * 0.07, '#7fd36b');
        if (v > 0.5) { circ(ctx, x + s * 0.08, y + s * 0.02, s * 0.035, '#ffe066'); }
        break;
      case 'rock': {
        const c = T && T.lava ? '#4a3a35' : k === 'rock' && T && T.g1 === '#eef6fb' ? '#9fb1c0' : '#9aa0a6';
        poly(ctx, [x - s * 0.3, y + s * 0.2, x - s * 0.22, y - s * 0.08, x - s * 0.02, y - s * 0.2, x + s * 0.25, y - s * 0.06, x + s * 0.3, y + s * 0.2], c);
        poly(ctx, [x - s * 0.22, y - s * 0.08, x - s * 0.02, y - s * 0.2, x + s * 0.25, y - s * 0.06, x + s * 0.02, y + s * 0.02], shade(c, 0.25));
        if (v > 0.6) { circ(ctx, x + s * 0.28, y + s * 0.2, s * 0.09, shade(c, -0.1)); }
        break;
      }
      case 'mush':
        ctx.fillStyle = '#f2e6cf'; ctx.fillRect(x - s * 0.05, y - s * 0.02, s * 0.1, s * 0.24);
        ell(ctx, x, y - s * 0.04, s * 0.24, s * 0.16, v < 0.5 ? '#e5484d' : '#9b6bff');
        circ(ctx, x - s * 0.08, y - s * 0.08, s * 0.035, '#fff'); circ(ctx, x + s * 0.07, y - s * 0.1, s * 0.03, '#fff'); circ(ctx, x + s * 0.01, y - s * 0.15, s * 0.025, '#fff');
        if (v > 0.4) { ctx.fillStyle = '#f2e6cf'; ctx.fillRect(x + s * 0.17, y + s * 0.1, s * 0.05, s * 0.12); ell(ctx, x + s * 0.195, y + s * 0.1, s * 0.1, s * 0.07, '#e5484d'); }
        break;
      case 'cactus': {
        const c = '#4caf6a';
        rrect(ctx, x - s * 0.08, y - s * 0.3, s * 0.16, s * 0.56, s * 0.08); ctx.fillStyle = c; ctx.fill();
        rrect(ctx, x - s * 0.26, y - s * 0.12, s * 0.1, s * 0.22, s * 0.05); ctx.fill();
        rrect(ctx, x + s * 0.16, y - s * 0.2, s * 0.1, s * 0.24, s * 0.05); ctx.fill();
        ctx.fillRect(x - s * 0.2, y + s * 0.04, s * 0.14, s * 0.07); ctx.fillRect(x + s * 0.06, y - s * 0.02, s * 0.14, s * 0.07);
        ctx.fillStyle = shade(c, 0.3); ctx.fillRect(x - s * 0.03, y - s * 0.26, s * 0.03, s * 0.46);
        if (v > 0.6) circ(ctx, x, y - s * 0.31, s * 0.05, '#ff7fbf');
        break;
      }
      case 'palm': {
        ctx.strokeStyle = '#a87a4a'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y + s * 0.25); ctx.quadraticCurveTo(x + s * 0.12, y, x + s * 0.05, y - s * 0.3); ctx.stroke();
        const lx = x + s * 0.05, ly = y - s * 0.32;
        ctx.strokeStyle = '#2f9a4a'; ctx.lineWidth = s * 0.08;
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.75 + v;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx + Math.cos(a) * s * 0.25, ly + Math.sin(a) * s * 0.25 - s * 0.06, lx + Math.cos(a) * s * 0.36, ly + Math.sin(a) * s * 0.3 + s * 0.08); ctx.stroke();
        }
        circ(ctx, lx - s * 0.03, ly + s * 0.04, s * 0.04, '#7a4a20'); circ(ctx, lx + s * 0.04, ly + s * 0.05, s * 0.04, '#7a4a20');
        ctx.lineCap = 'butt';
        break;
      }
      case 'dead': {
        ctx.strokeStyle = T && T.lava ? '#2a1a14' : '#5b4a52'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y + s * 0.25); ctx.lineTo(x, y - s * 0.2);
        ctx.moveTo(x, y - s * 0.02); ctx.lineTo(x - s * 0.2, y - s * 0.2); ctx.moveTo(x, y - s * 0.1); ctx.lineTo(x + s * 0.18, y - s * 0.3);
        ctx.moveTo(x - s * 0.12, y - s * 0.12); ctx.lineTo(x - s * 0.14, y - s * 0.3); ctx.stroke(); ctx.lineCap = 'butt';
        break;
      }
      case 'crystal': {
        const c = v < 0.5 ? '#7fe8ff' : '#c49bff';
        ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = s * 0.3;
        poly(ctx, [x - s * 0.08, y + s * 0.2, x - s * 0.12, y - s * 0.12, x - s * 0.02, y - s * 0.32, x + s * 0.06, y - s * 0.1, x + s * 0.04, y + s * 0.2], c);
        poly(ctx, [x + s * 0.04, y + s * 0.2, x + s * 0.1, y - s * 0.06, x + s * 0.22, y - s * 0.16, x + s * 0.2, y + s * 0.2], shade(c, -0.15));
        ctx.restore();
        poly(ctx, [x - s * 0.1, y - s * 0.1, x - s * 0.02, y - s * 0.3, x - s * 0.02, y + s * 0.1], 'rgba(255,255,255,.45)');
        break;
      }
      case 'grave': {
        rrect(ctx, x - s * 0.15, y - s * 0.22, s * 0.3, s * 0.44, [s * 0.15, s * 0.15, s * 0.02, s * 0.02]); ctx.fillStyle = '#8b8fa6'; ctx.fill();
        ctx.fillStyle = '#6c7088'; ctx.fillRect(x - s * 0.02, y - s * 0.14, s * 0.04, s * 0.18); ctx.fillRect(x - s * 0.08, y - s * 0.08, s * 0.16, s * 0.04);
        break;
      }
    }
  }

  // ───────── 地圖底圖 ─────────
  function drawMap(ctx, v, G, opts) {
    opts = opts || {};
    const L = G.L, T = G.T, grid = G.grid, s = v.s;
    const [mx, my] = [v.ox, v.oy], mw = v.w, mh = v.h;
    const rng = mkRng(L.seed * 999 + 3);
    // 外框
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = s * 0.6; ctx.shadowOffsetY = s * 0.15;
    rrect(ctx, mx - s * 0.12, my - s * 0.12, mw + s * 0.24, mh + s * 0.24, s * 0.35); ctx.fillStyle = T.edge; ctx.fill();
    ctx.restore();
    ctx.save();
    rrect(ctx, mx, my, mw, mh, s * 0.25); ctx.clip();
    // 地面格子
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const [ax, ay] = v.P(x, y), [bx, by] = v.P(x + 1, y + 1);
      const n = rng();
      ctx.fillStyle = (x + y) % 2 ? T.g1 : T.g2;
      ctx.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax) + 0.5, Math.abs(by - ay) + 0.5);
      if (n < 0.35) { ctx.fillStyle = n < 0.17 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)'; ctx.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)); }
    }
    // 柔和的光斑
    for (let i = 0; i < 7; i++) {
      const [cx, cy] = v.P(rng() * COLS, rng() * ROWS), r = s * (2 + rng() * 3);
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, rng() < 0.5 ? 'rgba(255,255,230,.10)' : 'rgba(0,0,40,.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    // 水 / 岩漿
    for (const [wx, wy, ww, wh] of (L.water || [])) {
      const [ax, ay] = v.P(wx, wy), [bx, by] = v.P(wx + ww, wy + wh);
      const x0 = Math.min(ax, bx), y0 = Math.min(ay, by), w = Math.abs(bx - ax), h = Math.abs(by - ay);
      const wc = T.water || '#3fb6e6';
      ctx.save();
      rrect(ctx, x0 + s * 0.06, y0 + s * 0.06, w - s * 0.12, h - s * 0.12, s * 0.35);
      ctx.fillStyle = shade(wc, -0.25); ctx.fill();
      rrect(ctx, x0 + s * 0.12, y0 + s * 0.14, w - s * 0.24, h - s * 0.24, s * 0.3);
      const gr = ctx.createLinearGradient(x0, y0, x0, y0 + h);
      gr.addColorStop(0, shade(wc, 0.15)); gr.addColorStop(1, wc);
      ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = T.lava ? 'rgba(255,240,150,.7)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.lineCap = 'round';
      for (let i = 0; i < ww * wh * 2; i++) {
        const px = x0 + s * 0.3 + rng() * (w - s * 0.6), py = y0 + s * 0.3 + rng() * (h - s * 0.6);
        ctx.beginPath(); ctx.moveTo(px - s * 0.1, py); ctx.quadraticCurveTo(px, py - s * 0.06, px + s * 0.1, py); ctx.stroke();
      }
      if (T.lava) { for (let i = 0; i < ww * wh; i++) circ(ctx, x0 + s * 0.3 + rng() * (w - s * 0.6), y0 + s * 0.3 + rng() * (h - s * 0.6), s * 0.05, '#ffe27a'); }
      ctx.restore();
    }
    // 路
    const strokePaths = (w, c, dash) => {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
      for (const P of G.paths) {
        ctx.beginPath();
        P.pts.forEach((p, i) => { const [x, y] = v.P(p.x, p.y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      }
      ctx.setLineDash([]);
    };
    strokePaths(s * 1.02, 'rgba(0,0,0,.12)');
    strokePaths(s * 0.94, T.pathE);
    strokePaths(s * 0.8, T.path);
    strokePaths(s * 0.36, 'rgba(255,255,255,.13)');
    // 路上的小石頭和車轍
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (!grid[y][x].path) continue;
      for (let i = 0; i < 3; i++) {
        const [px, py] = v.P(x + 0.15 + rng() * 0.7, y + 0.15 + rng() * 0.7);
        circ(ctx, px, py, s * (0.02 + rng() * 0.03), rng() < 0.5 ? shade(T.pathE, 0.2) : shade(T.path, 0.25));
      }
    }
    // 草叢與小花
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = grid[y][x];
      if (c.path || c.water) continue;
      if (rng() < 0.55) {
        const [px, py] = v.P(x + 0.2 + rng() * 0.6, y + 0.2 + rng() * 0.6);
        ctx.strokeStyle = shade(T.g1, -0.18); ctx.lineWidth = Math.max(1, s * 0.03); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px - s * 0.06, py); ctx.lineTo(px - s * 0.09, py - s * 0.1); ctx.moveTo(px, py); ctx.lineTo(px, py - s * 0.13); ctx.moveTo(px + s * 0.06, py); ctx.lineTo(px + s * 0.09, py - s * 0.1); ctx.stroke();
      }
      if (rng() < 0.22) {
        const [px, py] = v.P(x + 0.2 + rng() * 0.6, y + 0.2 + rng() * 0.6);
        const fc = T.flower[Math.floor(rng() * T.flower.length)];
        for (let i = 0; i < 4; i++) circ(ctx, px + Math.cos(i * 1.57) * s * 0.04, py + Math.sin(i * 1.57) * s * 0.04, s * 0.035, fc);
        circ(ctx, px, py, s * 0.025, '#ffd84a');
      }
    }
    // 裝飾物（由上到下）
    const list = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = grid[y][x]; if (c.deco) { const [px, py] = v.P(x + 0.5, y + 0.5); list.push([py, px, c]); } }
    list.sort((a, b) => a[0] - b[0]);
    for (const [py, px, c] of list) deco(ctx, c.deco, px, py, s, c.dv, T);
    ctx.restore();
    // 城堡
    if (!opts.noCastle) castle(ctx, v, G);
    // 內框細線
    rrect(ctx, mx + 0.5, my + 0.5, mw - 1, mh - 1, s * 0.25); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.stroke();
  }

  function castle(ctx, v, G) {
    const s = v.s, e = G.exitPt;
    const [x, y] = v.P(e.x, e.y);
    const c = '#d8d2c4', d = '#a59d8d', roof = '#4f7cff';
    ell(ctx, x, y + s * 0.42, s * 0.75, s * 0.22, 'rgba(0,0,0,.25)');
    // 牆
    ctx.fillStyle = d; ctx.fillRect(x - s * 0.62, y - s * 0.1, s * 1.24, s * 0.5);
    ctx.fillStyle = c; ctx.fillRect(x - s * 0.62, y - s * 0.2, s * 1.24, s * 0.46);
    for (let i = 0; i < 5; i++) ctx.fillRect(x - s * 0.62 + i * s * 0.28, y - s * 0.3, s * 0.16, s * 0.12);
    // 門
    rrect(ctx, x - s * 0.17, y - s * 0.02, s * 0.34, s * 0.3, [s * 0.17, s * 0.17, 0, 0]); ctx.fillStyle = '#5a3b26'; ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - s * 0.02, y + s * 0.0, s * 0.04, s * 0.28);
    // 兩座塔樓
    for (const sx of [-1, 1]) {
      const tx = x + sx * s * 0.52;
      ctx.fillStyle = d; ctx.fillRect(tx - s * 0.18, y - s * 0.45, s * 0.36, s * 0.85);
      ctx.fillStyle = c; ctx.fillRect(tx - s * 0.18, y - s * 0.5, s * 0.3, s * 0.85);
      poly(ctx, [tx - s * 0.24, y - s * 0.48, tx + s * 0.24, y - s * 0.48, tx, y - s * 0.92], roof);
      poly(ctx, [tx - s * 0.24, y - s * 0.48, tx, y - s * 0.48, tx, y - s * 0.92], shade(roof, 0.2));
      rrect(ctx, tx - s * 0.05, y - s * 0.3, s * 0.1, s * 0.14, s * 0.05); ctx.fillStyle = '#3a3346'; ctx.fill();
    }
    // 旗子
    ctx.fillStyle = '#6b5a48'; ctx.fillRect(x - s * 0.01, y - s * 0.75, s * 0.025, s * 0.5);
    poly(ctx, [x + s * 0.015, y - s * 0.75, x + s * 0.3, y - s * 0.67, x + s * 0.015, y - s * 0.58], '#ffc94a');
  }

  // ───────── 防禦塔 ─────────
  function towerBase(ctx, x, y, s, top, side, tier) {
    const w = s * (0.36 + tier * 0.015);
    ell(ctx, x + s * 0.04, y + s * 0.22, w * 1.15, s * 0.16, 'rgba(0,0,0,.25)');
    ctx.fillStyle = side; ctx.fillRect(x - w, y, w * 2, s * 0.16);
    ell(ctx, x, y + s * 0.16, w, s * 0.12, side);
    ell(ctx, x, y, w, s * 0.13, top);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.82, s * 0.1, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    if (tier >= 2) { ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = Math.max(1, s * 0.025); ctx.beginPath(); ctx.ellipse(x, y + s * 0.08, w, s * 0.12, 0, 0.1, Math.PI - 0.1); ctx.stroke(); }
  }
  function cyl(ctx, x, yb, w, h, c) {
    // 圓柱：底在 yb，往上 h
    ctx.fillStyle = shade(c, -0.18); ctx.fillRect(x - w, yb - h, w * 2, h);
    const gr = ctx.createLinearGradient(x - w, 0, x + w, 0);
    gr.addColorStop(0, shade(c, 0.12)); gr.addColorStop(0.45, c); gr.addColorStop(1, shade(c, -0.28));
    ctx.fillStyle = gr; ctx.fillRect(x - w, yb - h, w * 2, h);
    ell(ctx, x, yb, w, w * 0.35, shade(c, -0.28));
    ctx.fillStyle = gr; ctx.fillRect(x - w, yb - h, w * 2, h);
    ell(ctx, x, yb - h, w, w * 0.35, shade(c, 0.22));
  }

  function tower(ctx, x, y, s, t, time, a) {
    const k = t.k, tier = t.tier, sp = t.spec;
    const rec = (t.recoil || 0);
    const born = clamp((time - (t.bornAt || -9)) / 0.35, 0, 1);
    const pop = born < 1 ? 1 + Math.sin(born * Math.PI) * 0.15 : 1;
    ctx.save();
    ctx.translate(x, y + s * 0.08); ctx.scale(pop, pop); ctx.translate(-x, -(y + s * 0.08));
    const cy = y + s * 0.08;
    const lv = tier + (tier === 3 ? 0.5 : 0);
    switch (k) {
      case 'arrow': {
        towerBase(ctx, x, cy, s, '#c9b79a', '#8d7a5e', tier);
        const h = s * (0.42 + lv * 0.06), w = s * (0.2 + lv * 0.015);
        const wood = sp === 1 ? '#8a6a3e' : '#b07a42';
        // 木塔身
        poly(ctx, [x - w * 1.15, cy, x + w * 1.15, cy, x + w * 0.85, cy - h, x - w * 0.85, cy - h], wood);
        ctx.strokeStyle = shade(wood, -0.3); ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath(); ctx.moveTo(x - w, cy - h * 0.15); ctx.lineTo(x + w * 0.9, cy - h * 0.75); ctx.moveTo(x + w, cy - h * 0.15); ctx.lineTo(x - w * 0.9, cy - h * 0.75); ctx.stroke();
        // 平台
        ell(ctx, x, cy - h, w * 1.45, s * 0.1, shade(wood, -0.2));
        ell(ctx, x, cy - h - s * 0.02, w * 1.35, s * 0.09, shade(wood, 0.25));
        // 弓
        const bx = x, by = cy - h - s * 0.08;
        const bows = sp === 0 ? [-0.35, 0, 0.35] : [0];
        for (const off of bows) {
          ctx.save(); ctx.translate(bx, by); ctx.rotate(a + off);
          const L = s * (sp === 1 ? 0.34 : 0.26) - rec * s * 0.04;
          ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-s * 0.04, 0); ctx.lineTo(L, 0); ctx.stroke();
          ctx.strokeStyle = sp === 1 ? '#3b6b3a' : '#7a4a22'; ctx.lineWidth = Math.max(1.5, s * 0.045);
          ctx.beginPath(); ctx.arc(L * 0.55, 0, s * 0.15, -1.2, 1.2); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(L * 0.55 + Math.cos(-1.2) * s * 0.15, Math.sin(-1.2) * s * 0.15); ctx.lineTo(L * 0.25 - rec * s * 0.05, 0); ctx.lineTo(L * 0.55 + Math.cos(1.2) * s * 0.15, Math.sin(1.2) * s * 0.15); ctx.stroke();
          ctx.restore();
        }
        // 小屋頂
        if (tier >= 1) {
          const rc = sp === 1 ? '#3f7a4a' : '#d9534f';
          ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - w * 1.2, cy - h - s * 0.3, s * 0.03, s * 0.24); ctx.fillRect(x + w * 1.2 - s * 0.03, cy - h - s * 0.3, s * 0.03, s * 0.24);
          poly(ctx, [x - w * 1.5, cy - h - s * 0.28, x + w * 1.5, cy - h - s * 0.28, x, cy - h - s * (0.48 + tier * 0.04)], rc);
          poly(ctx, [x - w * 1.5, cy - h - s * 0.28, x, cy - h - s * 0.28, x, cy - h - s * (0.48 + tier * 0.04)], shade(rc, 0.18));
        }
        break;
      }
      case 'cannon': {
        towerBase(ctx, x, cy, s, '#a7adb5', '#6f757d', tier);
        const w = s * (0.27 + lv * 0.015), h = s * (0.2 + lv * 0.04);
        cyl(ctx, x, cy, w, h, sp === 0 ? '#8b8f99' : sp === 1 ? '#7a8a7a' : '#9aa0aa');
        // 城垛
        for (let i = -1; i <= 1; i++) { ctx.fillStyle = '#7b818b'; ctx.fillRect(x + i * w * 0.65 - s * 0.05, cy - h - s * 0.1, s * 0.1, s * 0.08); }
        const by = cy - h - s * 0.06;
        if (sp === 1) {
          // 飛彈發射器
          ctx.save(); ctx.translate(x, by); ctx.rotate(a);
          rrect(ctx, -s * 0.16, -s * 0.16, s * 0.34, s * 0.32, s * 0.05); ctx.fillStyle = '#4b5a4b'; ctx.fill();
          for (let i = -1; i <= 1; i++) { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(s * 0.02, i * s * 0.09 - s * 0.03, s * 0.2 - rec * s * 0.05, s * 0.06); circ(ctx, s * 0.22 - rec * s * 0.05, i * s * 0.09, s * 0.03, '#ff5d4a'); }
          ctx.restore();
        } else {
          ctx.save(); ctx.translate(x, by); ctx.rotate(a);
          const bl = s * (0.34 + lv * 0.03) - rec * s * 0.1, bw = s * (0.09 + (sp === 0 ? 0.05 : 0) + tier * 0.01);
          rrect(ctx, -s * 0.05, -bw, bl, bw * 2, bw * 0.5); ctx.fillStyle = '#2d3138'; ctx.fill();
          ctx.fillStyle = '#4a505a'; ctx.fillRect(-s * 0.03, -bw * 0.9, bl * 0.9, bw * 0.5);
          if (tier >= 2) { ctx.fillStyle = '#d9a83a'; ctx.fillRect(bl * 0.55, -bw - 1, s * 0.04, bw * 2 + 2); }
          circ(ctx, bl, 0, bw * 0.55, '#15171b');
          ctx.restore();
          circ(ctx, x, by, s * (0.12 + tier * 0.01), '#3b4048'); circ(ctx, x - s * 0.03, by - s * 0.03, s * 0.04, '#6b727d');
        }
        break;
      }
      case 'frost': {
        towerBase(ctx, x, cy, s, '#d6eef8', '#8fb5c9', tier);
        const w = s * (0.17 + lv * 0.01), h = s * (0.3 + lv * 0.05);
        cyl(ctx, x, cy, w, h, '#bfe3f2');
        ctx.fillStyle = 'rgba(80,160,210,.5)'; ctx.fillRect(x - w * 0.15, cy - h, w * 0.3, h);
        const fy = cy - h - s * 0.25 + Math.sin(time * 2 + t.id) * s * 0.04;
        ctx.save(); ctx.shadowColor = '#7fe0ff'; ctx.shadowBlur = s * 0.4;
        if (sp === 1) {
          for (let i = 0; i < 3; i++) { const o = (i - 1) * s * 0.11; poly(ctx, [x + o, fy - s * (0.3 - Math.abs(i - 1) * 0.1), x + o + s * 0.07, fy, x + o, fy + s * 0.12, x + o - s * 0.07, fy], i === 1 ? '#e8fbff' : '#9fe6ff'); }
        } else {
          const r = s * (0.13 + lv * 0.02), sp2 = time * 1.2 + t.id;
          const cw = Math.abs(Math.cos(sp2)) * 0.6 + 0.4;
          poly(ctx, [x, fy - r * 1.5, x + r * cw, fy, x, fy + r * 1.1, x - r * cw, fy], '#bff0ff');
          poly(ctx, [x, fy - r * 1.5, x + r * cw * 0.5, fy, x, fy + r * 1.1], '#ffffff');
        }
        ctx.restore();
        if (sp === 0) {
          ctx.strokeStyle = 'rgba(220,250,255,.7)'; ctx.lineWidth = Math.max(1, s * 0.025);
          for (let i = 0; i < 3; i++) { const aa = time * 2 + i * 2.1; ctx.beginPath(); ctx.ellipse(x, fy, s * 0.3, s * 0.1, 0, aa, aa + 1.2); ctx.stroke(); }
        }
        break;
      }
      case 'magic': {
        towerBase(ctx, x, cy, s, '#cbbbe0', '#7d6a99', tier);
        const w = s * (0.16 + lv * 0.01), h = s * (0.44 + lv * 0.05);
        cyl(ctx, x, cy, w, h, '#9a86c4');
        // 尖頂
        poly(ctx, [x - w * 1.3, cy - h, x + w * 1.3, cy - h, x, cy - h - s * 0.2], '#5b3f99');
        poly(ctx, [x - w * 1.3, cy - h, x, cy - h, x, cy - h - s * 0.2], '#7a5cc4');
        circ(ctx, x - w * 0.3, cy - h * 0.55, s * 0.035, '#ffe27a');
        const oy = cy - h - s * 0.36 + Math.sin(time * 2.5 + t.id) * s * 0.05;
        const pc = sp === 1 ? '#ff8ee8' : sp === 0 ? '#9fd8ff' : '#d39bff';
        ctx.save(); ctx.shadowColor = pc; ctx.shadowBlur = s * (0.4 + rec * 0.4);
        if (sp === 1) {
          const r = s * 0.17, aa = time * 1.5;
          poly(ctx, [x + Math.cos(aa) * r, oy + Math.sin(aa) * r * 0.5 - r * 0.3, x + Math.cos(aa + 2.1) * r, oy + Math.sin(aa + 2.1) * r * 0.5, x + Math.cos(aa + 4.2) * r, oy + Math.sin(aa + 4.2) * r * 0.5], pc);
          poly(ctx, [x, oy - r * 1.1, x + Math.cos(aa) * r, oy + Math.sin(aa) * r * 0.5 - r * 0.3, x + Math.cos(aa + 2.1) * r, oy + Math.sin(aa + 2.1) * r * 0.5], 'rgba(255,255,255,.6)');
        } else {
          circ(ctx, x, oy, s * (0.12 + lv * 0.015 + rec * 0.03), pc);
          circ(ctx, x - s * 0.035, oy - s * 0.04, s * 0.045, 'rgba(255,255,255,.85)');
        }
        ctx.restore();
        if (sp === 0) {
          ctx.strokeStyle = '#e8f6ff'; ctx.lineWidth = 1.2;
          for (let i = 0; i < 2; i++) { const aa = time * 7 + i * 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(aa) * s * 0.12, oy + Math.sin(aa) * s * 0.12); ctx.lineTo(x + Math.cos(aa + 0.4) * s * 0.24, oy + Math.sin(aa + 0.9) * s * 0.2); ctx.stroke(); }
        }
        for (let i = 0; i < 2 + tier; i++) { const aa = time * 1.6 + i * TAU / (2 + tier); circ(ctx, x + Math.cos(aa) * s * 0.26, oy + Math.sin(aa) * s * 0.09, s * 0.025, '#fff4c8'); }
        break;
      }
      case 'sniper': {
        towerBase(ctx, x, cy, s, '#a9b8a0', '#66745e', tier);
        const w = s * (0.12 + lv * 0.008), h = s * (0.62 + lv * 0.05);
        const c = sp === 1 ? '#7a3f3f' : '#3f6a4e';
        poly(ctx, [x - w * 1.5, cy, x + w * 1.5, cy, x + w, cy - h, x - w, cy - h], c);
        poly(ctx, [x - w * 1.5, cy, x - w * 0.2, cy, x - w * 0.1, cy - h, x - w, cy - h], shade(c, 0.15));
        ctx.strokeStyle = shade(c, -0.35); ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - w * (1.5 - i * 0.12), cy - h * i / 4); ctx.lineTo(x + w * (1.5 - i * 0.12), cy - h * i / 4); ctx.stroke(); }
        // 瞭望台
        const ty = cy - h;
        rrect(ctx, x - s * 0.2, ty - s * 0.16, s * 0.4, s * 0.16, s * 0.03); ctx.fillStyle = '#6b5236'; ctx.fill();
        ctx.fillStyle = '#4b3a26'; ctx.fillRect(x - s * 0.2, ty - s * 0.03, s * 0.4, s * 0.03);
        // 槍
        ctx.save(); ctx.translate(x, ty - s * 0.12); ctx.rotate(a);
        const gl = s * (0.5 + lv * 0.03) - rec * s * 0.08;
        ctx.fillStyle = '#20242a'; ctx.fillRect(-s * 0.1, -s * 0.025, gl, s * 0.05);
        ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-s * 0.14, -s * 0.04, s * 0.16, s * 0.08);
        ctx.fillStyle = sp === 0 ? '#ffd36b' : '#3a3f48'; ctx.fillRect(s * 0.02, -s * 0.07, s * 0.14, s * 0.04);
        if (sp === 1) { ctx.strokeStyle = 'rgba(255,60,60,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gl, 0); ctx.lineTo(gl + s * 1.2, 0); ctx.stroke(); }
        if (rec > 0.7) circ(ctx, gl + s * 0.04, 0, s * 0.08 * rec, '#fff2a8');
        ctx.restore();
        // 迷彩旗
        ctx.fillStyle = '#4b3a26'; ctx.fillRect(x + s * 0.17, ty - s * 0.42, s * 0.02, s * 0.3);
        poly(ctx, [x + s * 0.19, ty - s * 0.42, x + s * 0.36, ty - s * 0.36 + Math.sin(time * 4) * s * 0.02, x + s * 0.19, ty - s * 0.3], sp === 1 ? '#ff5d4a' : '#ffd36b');
        break;
      }
      case 'banner': {
        towerBase(ctx, x, cy, s, '#e3c9a8', '#a37f5a', tier);
        const ph = s * (0.8 + lv * 0.08);
        if (sp === 1) {
          // 瞭望塔
          poly(ctx, [x - s * 0.22, cy, x + s * 0.22, cy, x + s * 0.14, cy - s * 0.5, x - s * 0.14, cy - s * 0.5], '#9a7048');
          ell(ctx, x, cy - s * 0.5, s * 0.2, s * 0.07, '#6b4a2a');
        }
        if (sp === 0) {
          // 戰鼓
          const dx = x - s * 0.2, dy = cy - s * 0.02;
          cyl(ctx, dx, dy + s * 0.06, s * 0.13, s * 0.14, '#c94a3a');
          ell(ctx, dx, dy - s * 0.08, s * 0.13, s * 0.05, '#f4e6c8');
          const hit = Math.sin(time * 9) > 0.6 ? s * 0.03 : 0;
          ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx + s * 0.06, dy - s * 0.2 + hit); ctx.lineTo(dx + s * 0.02, dy - s * 0.08 + hit); ctx.stroke();
        }
        ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - s * 0.02, cy - ph, s * 0.04, ph);
        circ(ctx, x, cy - ph, s * 0.05, '#ffd36b');
        const fw = s * (0.36 + lv * 0.04), fh = s * (0.22 + lv * 0.02);
        const fc = sp === 1 ? '#3f86ff' : '#ff5a4a';
        ctx.fillStyle = fc; ctx.beginPath();
        const top = cy - ph + s * 0.05;
        ctx.moveTo(x + s * 0.02, top);
        for (let i = 0; i <= 8; i++) { const u = i / 8; ctx.lineTo(x + s * 0.02 + u * fw, top + Math.sin(time * 5 - u * 4) * s * 0.03 * u); }
        for (let i = 8; i >= 0; i--) { const u = i / 8; ctx.lineTo(x + s * 0.02 + u * fw - (i === 8 ? s * 0.06 : 0), top + fh + Math.sin(time * 5 - u * 4) * s * 0.03 * u); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(x + s * 0.02 + fw * 0.45, top + fh * 0.5 + Math.sin(time * 5 - 1.8) * s * 0.015, fh * 0.26, 0, TAU); ctx.fill();
        if (t.pulse > 0 || time % 3 < 0.05) { /* 預留 */ }
        break;
      }
      case 'mine': {
        // 小山丘與礦坑口
        ell(ctx, x + s * 0.04, cy + s * 0.2, s * 0.44, s * 0.15, 'rgba(0,0,0,.25)');
        const hc = sp === 0 ? '#c9b38f' : '#9a8670';
        if (sp === 0) {
          // 銀行
          ctx.fillStyle = '#e8e0cf'; ctx.fillRect(x - s * 0.34, cy - s * 0.32, s * 0.68, s * 0.46);
          poly(ctx, [x - s * 0.4, cy - s * 0.32, x + s * 0.4, cy - s * 0.32, x, cy - s * 0.58], '#c94a3a');
          for (let i = -1; i <= 1; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(x + i * s * 0.2 - s * 0.03, cy - s * 0.28, s * 0.06, s * 0.38); }
          ctx.fillStyle = '#ffd84a'; ctx.font = `900 ${s * 0.2}px "Noto Sans TC",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('金', x, cy - s * 0.41);
        } else {
          ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(x - s * 0.42, cy + s * 0.15); ctx.quadraticCurveTo(x - s * 0.3, cy - s * 0.42, x, cy - s * 0.42); ctx.quadraticCurveTo(x + s * 0.3, cy - s * 0.42, x + s * 0.42, cy + s * 0.15); ctx.closePath(); ctx.fill();
          ctx.fillStyle = shade(hc, 0.2); ctx.beginPath(); ctx.moveTo(x - s * 0.34, cy); ctx.quadraticCurveTo(x - s * 0.25, cy - s * 0.36, x - s * 0.02, cy - s * 0.38); ctx.lineTo(x - s * 0.1, cy); ctx.closePath(); ctx.fill();
          rrect(ctx, x - s * 0.13, cy - s * 0.2, s * 0.26, s * 0.32, [s * 0.13, s * 0.13, 0, 0]); ctx.fillStyle = '#2a1e16'; ctx.fill();
          ctx.strokeStyle = '#7a5532'; ctx.lineWidth = Math.max(2, s * 0.05);
          ctx.beginPath(); ctx.moveTo(x - s * 0.15, cy + s * 0.12); ctx.lineTo(x - s * 0.15, cy - s * 0.2); ctx.lineTo(x + s * 0.15, cy - s * 0.2); ctx.lineTo(x + s * 0.15, cy + s * 0.12); ctx.stroke();
        }
        // 礦車
        const kx = x + s * 0.26, ky = cy + s * 0.08;
        ctx.fillStyle = '#5a5f68'; ctx.fillRect(kx - s * 0.12, ky - s * 0.1, s * 0.24, s * 0.12);
        const gem = sp === 1 ? ['#ff5d8f', '#5ad1ff', '#7dffb0'] : ['#ffd84a', '#ffe98a', '#f2b632'];
        for (let i = 0; i < 3; i++) circ(ctx, kx - s * 0.06 + i * s * 0.06, ky - s * 0.11, s * 0.045, gem[i]);
        circ(ctx, kx - s * 0.07, ky + s * 0.03, s * 0.03, '#2a2d33'); circ(ctx, kx + s * 0.07, ky + s * 0.03, s * 0.03, '#2a2d33');
        // 閃光
        const tw = (time * 1.3 + t.id * 0.37) % 1;
        if (tw < 0.25) { const r = s * 0.08 * Math.sin(tw * 4 * Math.PI); ctx.fillStyle = '#fffbe0'; poly(ctx, [kx, ky - s * 0.25 - r, kx + r * 0.3, ky - s * 0.25, kx, ky - s * 0.25 + r, kx - r * 0.3, ky - s * 0.25], '#fffbe0'); }
        if (t.pulse > 0) { ctx.globalAlpha = t.pulse; circ(ctx, x, cy - s * 0.2, s * 0.5 * (1.5 - t.pulse), 'rgba(255,216,74,.35)'); ctx.globalAlpha = 1; }
        break;
      }
    }
    ctx.restore();
    // 等級標記
    const pipY = y + s * 0.4;
    if (tier < 3) {
      for (let i = 0; i <= tier; i++) { const px = x + (i - tier / 2) * s * 0.13; poly(ctx, [px, pipY - s * 0.05, px + s * 0.045, pipY, px, pipY + s * 0.05, px - s * 0.045, pipY], '#ffd36b'); }
    } else {
      star(ctx, x, pipY, s * 0.09, sp === 0 ? '#ffd36b' : '#7fe0ff');
    }
    if (t.stunT > 0) {
      for (let i = 0; i < 3; i++) { const aa = time * 5 + i * 2.1; star(ctx, x + Math.cos(aa) * s * 0.22, y - s * 0.75 + Math.sin(aa) * s * 0.07, s * 0.06, '#ffe27a'); }
    }
  }
  function star(ctx, x, y, r, c) {
    ctx.fillStyle = c; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(80,50,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // ───────── 敵人 ─────────
  function eyes(ctx, x, y, r, face, c) {
    const ex = face * r * 0.25;
    circ(ctx, x - r * 0.3 + ex, y, r * 0.24, '#fff'); circ(ctx, x + r * 0.3 + ex, y, r * 0.24, '#fff');
    circ(ctx, x - r * 0.26 + ex * 1.5, y + r * 0.03, r * 0.12, c || '#1d1a2b'); circ(ctx, x + r * 0.34 + ex * 1.5, y + r * 0.03, r * 0.12, c || '#1d1a2b');
  }
  function enemy(ctx, x, y, s, e, time, face) {
    const k = e.k, R = e.r * s;
    const fl = e.flash > 0 ? 0.65 : 0;
    const C = c => fl ? mix(c, '#ffffff', fl) : c;
    const bob = Math.sin(e.wob) * R * 0.08;
    const fy = e.fly ? s * 0.5 + Math.sin(e.wob * 0.5) * s * 0.06 : 0;
    // 影子
    ell(ctx, x, y + R * 0.55, R * (e.fly ? 0.8 : 1.0), R * 0.32, e.fly ? 'rgba(0,0,0,.16)' : 'rgba(0,0,0,.25)');
    const by = y - fy;
    ctx.save();
    if (e.frozenT > 0 && !e.stunFx) { /* 冰塊在下面畫 */ }
    switch (k) {
      case 'slime': case 'mini': case 'splitter': {
        const sq = 1 + Math.sin(e.wob * 1.3) * 0.1;
        const col = k === 'slime' ? '#5fcf55' : k === 'mini' ? '#ff9fd0' : '#ff6fb5';
        ctx.fillStyle = C(col); ctx.beginPath(); ctx.ellipse(x, by - R * 0.4 * sq, R * 1.05 / sq, R * 0.85 * sq, 0, Math.PI, 0); ctx.lineTo(x + R * 1.05 / sq, by + R * 0.3); ctx.lineTo(x - R * 1.05 / sq, by + R * 0.3); ctx.closePath(); ctx.fill();
        ell(ctx, x, by + R * 0.3, R * 1.05 / sq, R * 0.22, C(shade(col, -0.2)));
        circ(ctx, x - R * 0.45, by - R * 0.7 * sq, R * 0.2, 'rgba(255,255,255,.55)');
        if (k === 'splitter') { circ(ctx, x - R * 0.35, by - R * 0.1, R * 0.22, 'rgba(255,255,255,.35)'); circ(ctx, x + R * 0.4, by - R * 0.25, R * 0.18, 'rgba(255,255,255,.35)'); circ(ctx, x + R * 0.05, by + R * 0.1, R * 0.16, 'rgba(255,255,255,.35)'); }
        eyes(ctx, x, by - R * 0.35, R, face);
        break;
      }
      case 'runner': {
        const leg = Math.sin(e.wob * 2) * R * 0.25;
        ctx.strokeStyle = C('#a85a2a'); ctx.lineWidth = R * 0.25; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - R * 0.4, by + R * 0.1); ctx.lineTo(x - R * 0.4 + leg, by + R * 0.55); ctx.moveTo(x + R * 0.4, by + R * 0.1); ctx.lineTo(x + R * 0.4 - leg, by + R * 0.55); ctx.stroke();
        ell(ctx, x, by - R * 0.1 + bob, R * 0.95, R * 0.6, C('#ff9a3c'));
        // 尾巴
        poly(ctx, [x - face * R * 0.8, by - R * 0.2, x - face * R * 1.45, by - R * 0.65 + bob, x - face * R * 1.1, by - R * 0.05], C('#ffb870'));
        // 頭
        circ(ctx, x + face * R * 0.55, by - R * 0.45 + bob, R * 0.5, C('#ffad5a'));
        poly(ctx, [x + face * R * 0.25, by - R * 0.75, x + face * R * 0.4, by - R * 1.2, x + face * R * 0.6, by - R * 0.85], C('#e0782a'));
        poly(ctx, [x + face * R * 0.65, by - R * 0.85, x + face * R * 0.85, by - R * 1.25, x + face * R * 0.95, by - R * 0.7], C('#e0782a'));
        circ(ctx, x + face * R * 0.75, by - R * 0.5 + bob, R * 0.1, '#1d1a2b');
        circ(ctx, x + face * R * 1.0, by - R * 0.35 + bob, R * 0.09, '#3a2a2a');
        ctx.lineCap = 'butt';
        break;
      }
      case 'beetle': {
        for (let i = -1; i <= 1; i++) { ctx.strokeStyle = '#2d3138'; ctx.lineWidth = R * 0.12; const lg = Math.sin(e.wob * 2 + i) * R * 0.12; ctx.beginPath(); ctx.moveTo(x + i * R * 0.5, by); ctx.lineTo(x + i * R * 0.6 + lg, by + R * 0.5); ctx.stroke(); }
        ctx.fillStyle = C('#7d8796'); ctx.beginPath(); ctx.ellipse(x, by - R * 0.15 + bob, R * 1.05, R * 0.8, 0, Math.PI, 0); ctx.lineTo(x + R * 1.05, by + R * 0.15); ctx.lineTo(x - R * 1.05, by + R * 0.15); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C('#4b525d'); ctx.lineWidth = Math.max(1, R * 0.08);
        ctx.beginPath(); ctx.moveTo(x, by - R * 0.95 + bob); ctx.lineTo(x, by + R * 0.15); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x, by - R * 0.15 + bob, R * 0.7, R * 0.5, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ell(ctx, x - R * 0.4, by - R * 0.6 + bob, R * 0.25, R * 0.12, 'rgba(255,255,255,.5)');
        circ(ctx, x + face * R * 0.95, by - R * 0.05, R * 0.38, C('#4b525d'));
        circ(ctx, x + face * R * 1.1, by - R * 0.12, R * 0.08, '#ff5d4a');
        break;
      }
      case 'bat': case 'gargoyle': {
        const flap = Math.sin(time * 14 + e.wob) * 0.6;
        const col = k === 'bat' ? '#8c5cf0' : '#8e98a8', wc = k === 'bat' ? '#6a3fd0' : '#6a7484';
        for (const sd of [-1, 1]) {
          ctx.fillStyle = C(wc); ctx.beginPath(); ctx.moveTo(x + sd * R * 0.3, by - R * 0.1);
          ctx.quadraticCurveTo(x + sd * R * 1.3, by - R * (0.9 + flap), x + sd * R * 1.8, by - R * (0.2 + flap * 0.6));
          ctx.quadraticCurveTo(x + sd * R * 1.2, by - R * 0.05, x + sd * R * 1.1, by + R * 0.25);
          ctx.quadraticCurveTo(x + sd * R * 0.8, by + R * 0.05, x + sd * R * 0.3, by + R * 0.3); ctx.closePath(); ctx.fill();
        }
        circ(ctx, x, by, R * 0.72, C(col));
        poly(ctx, [x - R * 0.55, by - R * 0.4, x - R * 0.35, by - R * 1.0, x - R * 0.1, by - R * 0.55], C(col));
        poly(ctx, [x + R * 0.55, by - R * 0.4, x + R * 0.35, by - R * 1.0, x + R * 0.1, by - R * 0.55], C(col));
        if (k === 'gargoyle') { ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - R * 0.4, by + R * 0.2); ctx.lineTo(x - R * 0.1, by - R * 0.1); ctx.lineTo(x + R * 0.2, by + R * 0.3); ctx.stroke(); }
        eyes(ctx, x, by - R * 0.1, R * 0.85, face, k === 'bat' ? '#ff3a6a' : '#ffb000');
        break;
      }
      case 'golem': {
        rrect(ctx, x - R * 0.95, by - R * 1.15 + bob, R * 1.9, R * 1.5, R * 0.3); ctx.fillStyle = C('#b9a98e'); ctx.fill();
        ctx.fillStyle = C('#9a8a70'); ctx.fillRect(x - R * 0.95, by - R * 0.05 + bob, R * 1.9, R * 0.35);
        ctx.fillStyle = C('#9a8a70'); ctx.fillRect(x - R * 1.25, by - R * 0.8 + bob, R * 0.32, R * 0.85); ctx.fillRect(x + R * 0.93, by - R * 0.8 + bob, R * 0.32, R * 0.85);
        ctx.save(); ctx.shadowColor = '#7fe8ff'; ctx.shadowBlur = R * 0.6;
        ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = Math.max(1, R * 0.1);
        ctx.beginPath(); ctx.moveTo(x - R * 0.3, by - R * 0.3 + bob); ctx.lineTo(x, by - R * 0.55 + bob); ctx.lineTo(x + R * 0.3, by - R * 0.3 + bob); ctx.stroke();
        circ(ctx, x - R * 0.35 + face * R * 0.1, by - R * 0.8 + bob, R * 0.12, '#bff6ff'); circ(ctx, x + R * 0.35 + face * R * 0.1, by - R * 0.8 + bob, R * 0.12, '#bff6ff');
        ctx.restore();
        break;
      }
      case 'healer': {
        ctx.fillStyle = C('#f4f1ea'); ctx.beginPath(); ctx.moveTo(x - R * 0.8, by + R * 0.35); ctx.lineTo(x - R * 0.45, by - R * 0.75 + bob); ctx.lineTo(x + R * 0.45, by - R * 0.75 + bob); ctx.lineTo(x + R * 0.8, by + R * 0.35); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C('#5fcf8a'); ctx.fillRect(x - R * 0.1, by - R * 0.55 + bob, R * 0.2, R * 0.7); ctx.fillRect(x - R * 0.32, by - R * 0.32 + bob, R * 0.64, R * 0.2);
        circ(ctx, x, by - R * 1.0 + bob, R * 0.42, C('#ffd9b8'));
        ctx.fillStyle = C('#f4f1ea'); ctx.beginPath(); ctx.arc(x, by - R * 1.05 + bob, R * 0.48, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(x, by - R * 1.6 + bob); ctx.closePath(); ctx.fill();
        eyes(ctx, x, by - R * 0.95 + bob, R * 0.55, face);
        // 法杖
        ctx.strokeStyle = '#8a6a3e'; ctx.lineWidth = R * 0.12; ctx.beginPath(); ctx.moveTo(x + face * R * 0.85, by + R * 0.35); ctx.lineTo(x + face * R * 0.85, by - R * 1.3); ctx.stroke();
        circ(ctx, x + face * R * 0.85, by - R * 1.35, R * 0.2, '#7dffb0');
        break;
      }
      case 'shield': {
        rrect(ctx, x - R * 0.7, by - R * 0.85 + bob, R * 1.4, R * 1.2, R * 0.35); ctx.fillStyle = C('#5a7ab8'); ctx.fill();
        circ(ctx, x, by - R * 1.05 + bob, R * 0.48, C('#c9d2e0'));
        ctx.fillStyle = '#2d3550'; ctx.fillRect(x - R * 0.3 + face * R * 0.08, by - R * 1.1 + bob, R * 0.6, R * 0.12);
        // 盾牌
        const sx = x + face * R * 0.65;
        ctx.fillStyle = C('#ffd36b'); ctx.beginPath(); ctx.moveTo(sx - R * 0.35, by - R * 0.7); ctx.lineTo(sx + R * 0.35, by - R * 0.7); ctx.lineTo(sx + R * 0.35, by - R * 0.1); ctx.lineTo(sx, by + R * 0.3); ctx.lineTo(sx - R * 0.35, by - R * 0.1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C('#3f86ff'); ctx.fillRect(sx - R * 0.06, by - R * 0.6, R * 0.12, R * 0.7);
        break;
      }
      case 'ogre': {
        ell(ctx, x, by - R * 0.35 + bob, R * 1.0, R * 0.95, C('#7fae55'));
        ell(ctx, x, by - R * 0.1 + bob, R * 0.75, R * 0.55, C('#a8cf7a'));
        ctx.fillStyle = C('#7a5532'); ctx.fillRect(x - R * 0.9, by + R * 0.05 + bob, R * 1.8, R * 0.25);
        eyes(ctx, x, by - R * 0.75 + bob, R * 0.6, face);
        poly(ctx, [x - R * 0.25, by - R * 0.4 + bob, x - R * 0.18, by - R * 0.58 + bob, x - R * 0.1, by - R * 0.4 + bob], '#fff');
        poly(ctx, [x + R * 0.25, by - R * 0.4 + bob, x + R * 0.18, by - R * 0.58 + bob, x + R * 0.1, by - R * 0.4 + bob], '#fff');
        // 棍棒
        ctx.save(); ctx.translate(x + face * R * 0.9, by - R * 0.3); ctx.rotate(face * (0.4 + Math.sin(e.wob) * 0.2));
        rrect(ctx, -R * 0.12, -R * 1.1, R * 0.3, R * 1.2, R * 0.12); ctx.fillStyle = '#8a5a32'; ctx.fill();
        circ(ctx, R * 0.03, -R * 1.05, R * 0.22, '#9a6a3e');
        ctx.restore();
        break;
      }
      case 'skeleton': {
        ctx.strokeStyle = C('#e8e3d2'); ctx.lineWidth = R * 0.18; ctx.lineCap = 'round';
        const lg = Math.sin(e.wob * 2) * R * 0.2;
        ctx.beginPath(); ctx.moveTo(x, by - R * 0.3); ctx.lineTo(x - R * 0.3 + lg, by + R * 0.5); ctx.moveTo(x, by - R * 0.3); ctx.lineTo(x + R * 0.3 - lg, by + R * 0.5);
        ctx.moveTo(x, by - R * 0.9); ctx.lineTo(x, by - R * 0.3); ctx.moveTo(x - R * 0.45, by - R * 0.7); ctx.lineTo(x + R * 0.45, by - R * 0.7); ctx.stroke(); ctx.lineCap = 'butt';
        circ(ctx, x, by - R * 1.15, R * 0.45, C('#f1eee2'));
        circ(ctx, x - R * 0.17 + face * R * 0.08, by - R * 1.15, R * 0.12, '#2a2340'); circ(ctx, x + R * 0.17 + face * R * 0.08, by - R * 1.15, R * 0.12, '#2a2340');
        break;
      }
      case 'bossGolem': {
        const st = Math.max(0, Math.sin(e.wob * 0.5)) * R * 0.05;
        rrect(ctx, x - R * 0.85, by - R * 1.3 + st, R * 1.7, R * 1.55, R * 0.35); ctx.fillStyle = C('#a8835a'); ctx.fill();
        ctx.fillStyle = C('#8a6844'); ctx.fillRect(x - R * 0.85, by - R * 0.2, R * 1.7, R * 0.45);
        rrect(ctx, x - R * 1.35, by - R * 1.1, R * 0.5, R * 1.1, R * 0.2); ctx.fillStyle = C('#94704a'); ctx.fill();
        rrect(ctx, x + R * 0.85, by - R * 1.1, R * 0.5, R * 1.1, R * 0.2); ctx.fill();
        poly(ctx, [x - R * 0.4, by - R * 1.3, x - R * 0.3, by - R * 1.65, x - R * 0.1, by - R * 1.4, x, by - R * 1.75, x + R * 0.1, by - R * 1.4, x + R * 0.3, by - R * 1.65, x + R * 0.4, by - R * 1.3], '#ffd36b');
        ctx.save(); ctx.shadowColor = '#ff7a2a'; ctx.shadowBlur = R * 0.5;
        circ(ctx, x - R * 0.3 + face * R * 0.1, by - R * 0.85, R * 0.13, '#ffb347'); circ(ctx, x + R * 0.3 + face * R * 0.1, by - R * 0.85, R * 0.13, '#ffb347');
        ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = R * 0.07; ctx.beginPath(); ctx.moveTo(x - R * 0.5, by - R * 0.4); ctx.lineTo(x - R * 0.2, by - R * 0.55); ctx.lineTo(x + R * 0.1, by - R * 0.35); ctx.lineTo(x + R * 0.45, by - R * 0.5); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'bossDragon': {
        const flap = Math.sin(time * 6 + e.wob) * 0.5;
        for (const sd of [-1, 1]) {
          ctx.fillStyle = C('#c93a2a'); ctx.beginPath(); ctx.moveTo(x + sd * R * 0.3, by - R * 0.2);
          ctx.lineTo(x + sd * R * 1.6, by - R * (1.2 + flap)); ctx.lineTo(x + sd * R * 1.9, by - R * (0.2 + flap * 0.5)); ctx.lineTo(x + sd * R * 1.3, by + R * 0.1); ctx.lineTo(x + sd * R * 0.9, by - R * 0.05); ctx.lineTo(x + sd * R * 0.4, by + R * 0.25); ctx.closePath(); ctx.fill();
        }
        ell(ctx, x, by, R * 0.85, R * 0.6, C('#ff5a3a'));
        ell(ctx, x, by + R * 0.15, R * 0.55, R * 0.35, C('#ffc27a'));
        circ(ctx, x + face * R * 0.75, by - R * 0.45, R * 0.42, C('#ff6a4a'));
        poly(ctx, [x + face * R * 0.55, by - R * 0.8, x + face * R * 0.45, by - R * 1.25, x + face * R * 0.75, by - R * 0.85], '#ffd36b');
        poly(ctx, [x + face * R * 0.85, by - R * 0.8, x + face * R * 0.95, by - R * 1.25, x + face * R * 1.05, by - R * 0.75], '#ffd36b');
        circ(ctx, x + face * R * 0.9, by - R * 0.5, R * 0.09, '#1d1a2b');
        if (e.dashT > 0) { for (let i = 0; i < 3; i++) circ(ctx, x + face * R * 1.25 + Math.sin(time * 30 + i) * R * 0.1, by - R * 0.35 + i * R * 0.06, R * (0.15 - i * 0.03), i ? '#ffb347' : '#ffe27a'); }
        break;
      }
      case 'bossLich': {
        ctx.save(); ctx.shadowColor = '#9a6bff'; ctx.shadowBlur = R * 0.8;
        ctx.fillStyle = C('#3a2a5a'); ctx.beginPath(); ctx.moveTo(x - R * 0.95, by + R * 0.4);
        for (let i = 0; i <= 6; i++) ctx.lineTo(x - R * 0.95 + i * R * 0.32, by + R * (i % 2 ? 0.2 : 0.45) + Math.sin(time * 4 + i) * R * 0.05);
        ctx.lineTo(x + R * 0.55, by - R * 0.9); ctx.lineTo(x - R * 0.55, by - R * 0.9); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = C('#5a3f8a'); ctx.fillRect(x - R * 0.5, by - R * 0.85, R * 1.0, R * 0.25);
        circ(ctx, x, by - R * 1.15, R * 0.45, C('#e8e3d2'));
        ctx.save(); ctx.shadowColor = '#7dffb0'; ctx.shadowBlur = R * 0.4;
        circ(ctx, x - R * 0.17 + face * R * 0.06, by - R * 1.15, R * 0.11, '#7dffb0'); circ(ctx, x + R * 0.17 + face * R * 0.06, by - R * 1.15, R * 0.11, '#7dffb0');
        ctx.restore();
        poly(ctx, [x - R * 0.45, by - R * 1.4, x - R * 0.4, by - R * 1.85, x - R * 0.2, by - R * 1.55, x, by - R * 1.95, x + R * 0.2, by - R * 1.55, x + R * 0.4, by - R * 1.85, x + R * 0.45, by - R * 1.4], '#b38aff');
        ctx.strokeStyle = '#8a6a3e'; ctx.lineWidth = R * 0.1; ctx.beginPath(); ctx.moveTo(x - face * R * 0.85, by + R * 0.4); ctx.lineTo(x - face * R * 0.85, by - R * 1.6); ctx.stroke();
        ctx.save(); ctx.shadowColor = '#d9b8ff'; ctx.shadowBlur = R * 0.6; circ(ctx, x - face * R * 0.85, by - R * 1.7, R * 0.2, '#d9b8ff'); ctx.restore();
        break;
      }
    }
    ctx.restore();
    // 狀態
    if (e.shield > 0) {
      ctx.strokeStyle = `rgba(120,220,255,${0.35 + 0.5 * e.shield / e.shieldMax})`; ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.beginPath(); ctx.arc(x, by - R * 0.4, R * 1.35, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(120,220,255,.12)'; ctx.fill();
    }
    if (e.frozenT > 0) {
      if (e.stunFx > 0 && !e.brittle && e.frozenT <= e.stunFx) {
        for (let i = 0; i < 3; i++) { const aa = time * 6 + i * 2.1; star(ctx, x + Math.cos(aa) * R * 0.8, by - R * 1.5 + Math.sin(aa) * R * 0.25, s * 0.05, '#ffe27a'); }
      } else {
        rrect(ctx, x - R * 1.1, by - R * 1.4, R * 2.2, R * 1.9, R * 0.3); ctx.fillStyle = 'rgba(180,235,255,.55)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.stroke();
        poly(ctx, [x - R * 0.8, by - R * 1.2, x - R * 0.4, by - R * 1.2, x - R * 0.9, by - R * 0.4], 'rgba(255,255,255,.5)');
      }
    } else if (e.slowA > 0) {
      ctx.fillStyle = 'rgba(120,200,255,.35)'; ctx.beginPath(); ctx.ellipse(x, y + R * 0.4, R * 1.1, R * 0.35, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 2; i++) { const aa = time * 3 + i * 3.1 + e.id; circ(ctx, x + Math.cos(aa) * R * 0.9, by - R * 0.3 + Math.sin(aa * 1.3) * R * 0.4, Math.max(1.2, s * 0.025), '#dff6ff'); }
    }
    if (e.markT > 0) {
      ctx.strokeStyle = 'rgba(255,70,70,.9)'; ctx.lineWidth = 1.5;
      const mr = R * 0.9, my = by - R * 0.4;
      ctx.beginPath(); ctx.arc(x, my, mr, 0, TAU); ctx.moveTo(x - mr * 1.3, my); ctx.lineTo(x - mr * 0.5, my); ctx.moveTo(x + mr * 0.5, my); ctx.lineTo(x + mr * 1.3, my);
      ctx.moveTo(x, my - mr * 1.3); ctx.lineTo(x, my - mr * 0.5); ctx.moveTo(x, my + mr * 0.5); ctx.lineTo(x, my + mr * 1.3); ctx.stroke();
    }
    if (e.healFx > 0) {
      ctx.globalAlpha = Math.min(1, e.healFx * 2);
      ctx.fillStyle = '#7dffb0'; const hy = by - R * 1.6 - (0.6 - e.healFx) * s * 0.5;
      ctx.fillRect(x - s * 0.03, hy - s * 0.09, s * 0.06, s * 0.18); ctx.fillRect(x - s * 0.09, hy - s * 0.03, s * 0.18, s * 0.06);
      ctx.globalAlpha = 1;
    }
    // 血條
    if ((e.hp < e.maxHp || e.shield < e.shieldMax) && !e.boss) {
      const bw = Math.max(s * 0.5, R * 2), bh = Math.max(3, s * 0.07), bx = x - bw / 2, byy = by - R * (k === 'skeleton' || k === 'healer' || k === 'shield' ? 1.9 : 1.6) - bh;
      ctx.fillStyle = 'rgba(20,16,30,.75)'; ctx.fillRect(bx - 1, byy - 1, bw + 2, bh + 2);
      const f = clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = f > 0.5 ? '#6be37a' : f > 0.25 ? '#ffd34a' : '#ff5d5d'; ctx.fillRect(bx, byy, bw * f, bh);
      if (e.shieldMax) { ctx.fillStyle = '#7fe0ff'; ctx.fillRect(bx, byy - bh * 0.6, bw * clamp(e.shield / e.shieldMax, 0, 1), bh * 0.5); }
    }
  }

  return { deco, drawMap, tower, enemy, star, circ, ell, poly, rrect, shade, mix, castle };
})();

// ───────── 整個畫面 ─────────
const Render = (() => {
  let V = null, bg = null, bgKey = '';
  const TAU = Math.PI * 2;
  function setView(v) { V = v; }
  function view() { return V; }
  function ensureBg(G, W, H, dpr) {
    const key = [G.li, W, H, dpr, V.s, V.rot, V.ox, V.oy].join(',');
    if (bg && bgKey === key && bg._g === G.L) return;
    bg = document.createElement('canvas'); bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr); bg._g = G.L;
    const c = bg.getContext('2d'); c.scale(dpr, dpr);
    Draw.drawMap(c, V, G);
    bgKey = key;
  }
  function invalidate() { bgKey = ''; }

  function thumb(li, w, h) {
    const L = LEVELS[li];
    const fake = { L, T: THEMES[L.theme], grid: buildGrid(L, THEMES[L.theme]), paths: L.paths.map(buildPath), li };
    const lp = fake.paths[0], ls = lp.seg[lp.seg.length - 1];
    fake.exitPt = { x: ls.b.x - ls.dx * 0.5, y: ls.b.y - ls.dy * 0.5 };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr; c.style.width = w + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    const s = Math.min((w - 8) / COLS, (h - 8) / ROWS);
    const v = makeView(s, false, (w - COLS * s) / 2, (h - ROWS * s) / 2);
    Draw.drawMap(x, v, fake);
    return c;
  }

  const iconCache = {};
  function icon(kind, k, tier, spec) {
    const key = kind + k + (tier || 0) + (spec === undefined ? '' : spec);
    if (iconCache[key]) return iconCache[key];
    const c = document.createElement('canvas'), S = 96; c.width = S; c.height = S;
    const x = c.getContext('2d');
    if (kind === 'tower') {
      Draw.tower(x, S / 2, S * 0.6, S * 0.8, { k, tier: tier || 0, spec: spec === undefined ? -1 : spec, id: 3, recoil: 0, stunT: 0, pulse: 0 }, 0.6, -Math.PI / 4);
    } else {
      const d = ENEMIES[k], sc = d.boss ? 1.1 : 0.62 / d.r * 0.42;
      const R = Math.min(S * 0.9, S * sc);
      const e = { k, r: d.r, hp: 1, maxHp: 1, shield: 0, shieldMax: 0, wob: 0, fly: !!d.fly, flash: 0, frozenT: 0, slowA: 0, markT: 0, healFx: 0, id: 1, boss: d.boss };
      Draw.enemy(x, S / 2, S * (d.fly ? 0.82 : 0.7), R * (d.boss ? 0.95 : 1), e, 0.3, 1);
    }
    return (iconCache[key] = c.toDataURL());
  }

  function frame(ctx, G, ui, time, W, H) {
    const s = V.s;
    // 背景
    ctx.fillStyle = G.T.bg; ctx.fillRect(0, 0, W, H);
    const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
    gr.addColorStop(0, 'rgba(255,255,255,.06)'); gr.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (ui.shake > 0) ctx.translate((Math.random() - 0.5) * ui.shake * s * 0.25, (Math.random() - 0.5) * ui.shake * s * 0.25);
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.save();
    Draw.rrect(ctx, V.ox, V.oy, V.w, V.h, s * 0.25); ctx.clip();
    // 焦痕
    if (G.scorch) for (const sc of G.scorch) { const [x, y] = V.P(sc.x, sc.y); ctx.globalAlpha = Math.min(1, sc.life / 2) * 0.22; Draw.ell(ctx, x, y, sc.r * s, sc.r * s * 0.7, '#2a1a10'); }
    ctx.globalAlpha = 1;
    // 可建造格子提示
    if (ui.placing) {
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (!canBuild(G, x, y)) continue;
        const [a, b] = V.P(x + 0.5, y + 0.5);
        Draw.rrect(ctx, a - s * 0.42, b - s * 0.42, s * 0.84, s * 0.84, s * 0.12);
        ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fill();
      }
    }
    // 選取格
    if (ui.selTile) {
      const [a, b] = V.P(ui.selTile.x + 0.5, ui.selTile.y + 0.5);
      const p = 0.5 + 0.5 * Math.sin(time * 6);
      Draw.rrect(ctx, a - s * 0.46, b - s * 0.46, s * 0.92, s * 0.92, s * 0.14);
      ctx.fillStyle = `rgba(255,220,100,${0.12 + p * 0.1})`; ctx.fill();
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; ctx.stroke();
    }
    // 射程圈
    const rangeCircle = (wx, wy, r, c, dash) => {
      const [a, b] = V.P(wx, wy);
      ctx.beginPath(); ctx.arc(a, b, r * s, 0, TAU);
      ctx.fillStyle = c || 'rgba(255,255,255,.12)'; ctx.fill();
      ctx.setLineDash(dash || [6, 5]); ctx.lineDashOffset = -time * 20; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    };
    if (ui.selTower) {
      const t = ui.selTower;
      if (TOWERS[t.k].k !== 'mine' && t.k !== 'mine') rangeCircle(t.cx, t.cy, t.st.range, t.k === 'banner' ? 'rgba(255,120,90,.13)' : null);
      if (ui.preview && ui.preview.range) rangeCircle(t.cx, t.cy, ui.preview.range, 'rgba(255,220,100,.08)', [3, 4]);
      if (t.k === 'banner') {
        for (const o of G.towers) if (o !== t && o.buff.dmg > 0 && dist2(o.cx, o.cy, t.cx, t.cy) <= t.st.range ** 2 + 0.01) { const [a, b] = V.P(o.cx, o.cy); ctx.strokeStyle = 'rgba(255,140,100,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a, b, s * 0.4, 0, TAU); ctx.stroke(); }
      }
    }
    if (ui.ghost) {
      const g = ui.ghost, d = TOWERS[g.k];
      const ok = canBuild(G, g.x, g.y);
      if (ok && g.k !== 'mine') rangeCircle(g.x + 0.5, g.y + 0.5, d.tiers[0].range * G.M.range, g.k === 'banner' ? 'rgba(255,120,90,.13)' : null);
      const [a, b] = V.P(g.x + 0.5, g.y + 0.5);
      ctx.globalAlpha = ok ? 0.75 : 0.35;
      Draw.tower(ctx, a, b, s, { k: g.k, tier: 0, spec: -1, id: 0, recoil: 0, stunT: 0, pulse: 0 }, time, -Math.PI / 2);
      ctx.globalAlpha = 1;
      if (!ok) { ctx.strokeStyle = '#ff5d5d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a - s * 0.25, b - s * 0.25); ctx.lineTo(a + s * 0.25, b + s * 0.25); ctx.moveTo(a + s * 0.25, b - s * 0.25); ctx.lineTo(a - s * 0.25, b + s * 0.25); ctx.stroke(); }
    }
    // 光環
    for (const r of G.rings) {
      const [a, b] = V.P(r.x, r.y), u = 1 - r.life / r.max;
      ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = r.c; ctx.lineWidth = Math.max(1.5, s * 0.06 * (1 - u));
      ctx.beginPath(); ctx.arc(a, b, lerp(r.r0, r.r1, Math.sqrt(u)) * s, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 隕石預告
    for (const p of G.projs) if (p.k === 'meteor') {
      const [a, b] = V.P(p.tx, p.ty), u = clamp(p.tt / p.T, 0, 1);
      ctx.strokeStyle = `rgba(255,90,50,${0.4 + u * 0.5})`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(a, b, p.r * s * (1.2 - u * 0.2), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,90,50,${0.08 + u * 0.15})`; ctx.fill();
    }
    // 地面物件依 y 排序
    const items = [];
    for (const t of G.towers) { const [a, b] = V.P(t.cx, t.cy); items.push([b, 0, t, a]); }
    for (const e of G.enemies) if (e.alive && !e.fly) { const [a, b] = V.P(e.x, e.y); items.push([b, 1, e, a]); }
    items.sort((p, q) => p[0] - q[0]);
    for (const [b, kind, o, a] of items) {
      if (kind === 0) {
        if (o.bornAt === undefined) o.bornAt = time;
        if (o._tier !== o.tier) { o._tier = o.tier; o.bornAt = time; }
        Draw.tower(ctx, a, b, s, o, time, V.A(o.ang));
        if (o === ui.selTower) { /* 已有射程圈 */ }
      } else {
        const sd = V.rot ? -o.dy : o.dx;
        Draw.enemy(ctx, a, b, s, o, time, sd < -0.1 ? -1 : 1);
      }
    }
    // 投射物
    const HS = s * 0.55;
    for (const p of G.projs) {
      if (p.k === 'meteor') continue;
      const [a, b0] = V.P(p.x, p.y), b = b0 - p.h * HS;
      switch (p.k) {
        case 'arrow': {
          const ang = V.A(p.ang || 0);
          ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = Math.max(1.5, s * 0.04); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(a - Math.cos(ang) * s * 0.2, b - Math.sin(ang) * s * 0.2); ctx.lineTo(a, b); ctx.stroke();
          ctx.strokeStyle = p.crit ? '#ffb347' : '#e8e8e8'; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + Math.cos(ang) * s * 0.06, b + Math.sin(ang) * s * 0.06); ctx.stroke();
          ctx.lineCap = 'butt';
          break;
        }
        case 'ball': {
          Draw.ell(ctx, a, b0, s * 0.1, s * 0.05, 'rgba(0,0,0,.25)');
          Draw.circ(ctx, a, b, s * (p.big ? 0.15 : 0.11), '#26292e'); Draw.circ(ctx, a - s * 0.03, b - s * 0.03, s * 0.04, '#7a808a');
          break;
        }
        case 'shard': {
          ctx.save(); ctx.translate(a, b); ctx.rotate(V.A(p.ang || 0)); ctx.shadowColor = '#7fe0ff'; ctx.shadowBlur = s * 0.3;
          Draw.poly(ctx, [s * 0.14, 0, 0, s * 0.06, -s * 0.12, 0, 0, -s * 0.06], '#d9f7ff'); ctx.restore();
          break;
        }
        case 'orb': {
          ctx.save(); ctx.shadowColor = '#c38bff'; ctx.shadowBlur = s * 0.4;
          Draw.circ(ctx, a, b, s * 0.11, '#c38bff'); Draw.circ(ctx, a, b, s * 0.06, '#fff'); ctx.restore();
          break;
        }
        case 'missile': {
          const ang = V.A(Math.atan2(p.vy, p.vx));
          ctx.save(); ctx.translate(a, b); ctx.rotate(ang);
          ctx.fillStyle = '#f0ebe0'; ctx.fillRect(-s * 0.1, -s * 0.03, s * 0.18, s * 0.06);
          Draw.circ(ctx, s * 0.08, 0, s * 0.035, '#ff5d4a');
          Draw.circ(ctx, -s * 0.12, 0, s * (0.04 + Math.random() * 0.03), '#ffb347');
          ctx.restore();
          break;
        }
      }
    }
    // 飛行敵人
    for (const e of G.enemies) if (e.alive && e.fly) { const [a, b] = V.P(e.x, e.y); const sd = V.rot ? -e.dy : e.dx; Draw.enemy(ctx, a, b, s, e, time, sd < -0.1 ? -1 : 1); }
    // 隕石本體
    for (const p of G.projs) if (p.k === 'meteor' && p.tt >= 0) {
      const [a, b0] = V.P(p.x, p.y), b = b0 - p.h * HS;
      ctx.save(); ctx.shadowColor = '#ff7a2a'; ctx.shadowBlur = s * 0.6;
      Draw.circ(ctx, a, b, s * 0.26, '#ff6a2a'); Draw.circ(ctx, a - s * 0.05, b - s * 0.05, s * 0.15, '#ffd36b'); ctx.restore();
    }
    // 閃電、光束
    for (const bo of G.bolts) {
      const u = bo.life / bo.max;
      const pts = bo.pts.map(p => { const [a, b] = V.P(p.x, p.y); return [a, b - p.h * HS]; });
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (bo.beam) {
        ctx.globalAlpha = u; ctx.strokeStyle = bo.c; ctx.lineWidth = s * 0.28 * u; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.09 * u; ctx.stroke();
      } else if (bo.tracer) {
        ctx.globalAlpha = u; ctx.strokeStyle = bo.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke();
      } else {
        ctx.globalAlpha = Math.min(1, u * 1.5);
        for (const [w, c] of [[s * 0.14, bo.c], [s * 0.04, '#ffffff']]) {
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
          for (let i = 0; i < pts.length - 1; i++) {
            const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
            if (i === 0) ctx.moveTo(x0, y0);
            const segs = 4;
            for (let j = 1; j <= segs; j++) { const f = j / segs, jit = j < segs ? (Math.random() - 0.5) * s * 0.3 : 0; ctx.lineTo(lerp(x0, x1, f) + jit, lerp(y0, y1, f) + jit); }
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    }
    // 粒子
    for (const p of G.parts) {
      const [a, b0] = V.P(p.x, p.y), b = b0 - p.h * HS, u = p.life / p.max;
      if (p.k === 'smoke') { ctx.globalAlpha = u * 0.5; Draw.circ(ctx, a, b, p.sz * s * (1.8 - u), p.c); }
      else if (p.k === 'spark') { ctx.globalAlpha = u; ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a - p.vx * s * 0.04, b - p.vy * s * 0.04 + p.vh * s * 0.03); ctx.stroke(); }
      else { ctx.globalAlpha = Math.min(1, u * 2); Draw.circ(ctx, a, b, p.sz * s * (p.k === 'snow' ? 0.8 : 1), p.c); }
    }
    ctx.globalAlpha = 1;
    // 入口提示（下一波）
    const nw = ui.nextInfo;
    if (G.state !== 'won' && G.state !== 'lost' && nw && (G.state === 'ready' || G.nextT !== null)) {
      for (const ei of nw.ents) {
        const ep = G.entryPts[ei]; if (!ep) continue;
        const [a, b] = V.P(clamp(ep.x, 0.5, COLS - 0.5), clamp(ep.y, 0.5, ROWS - 0.5));
        const pul = 1 + Math.sin(time * 5) * 0.08, r = s * 0.42 * pul;
        ctx.save(); ctx.shadowColor = '#ff5d4a'; ctx.shadowBlur = s * 0.4;
        Draw.circ(ctx, a, b, r, 'rgba(40,20,30,.85)'); ctx.restore();
        ctx.strokeStyle = '#ff6b5a'; ctx.lineWidth = s * 0.07;
        const f = G.state === 'ready' ? 1 : clamp(G.nextT / WAVE_GAP, 0, 1);
        ctx.beginPath(); ctx.arc(a, b, r, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
        // 骷髏
        Draw.circ(ctx, a, b - s * 0.04, s * 0.17, '#f4efe4');
        ctx.fillStyle = '#f4efe4'; ctx.fillRect(a - s * 0.09, b + s * 0.06, s * 0.18, s * 0.08);
        Draw.circ(ctx, a - s * 0.06, b - s * 0.04, s * 0.05, '#2a1e2a'); Draw.circ(ctx, a + s * 0.06, b - s * 0.04, s * 0.05, '#2a1e2a');
        // 方向箭頭
        const ang = V.A(Math.atan2(ep.dy, ep.dx));
        ctx.save(); ctx.translate(a + Math.cos(ang) * r * 1.45, b + Math.sin(ang) * r * 1.45); ctx.rotate(ang);
        Draw.poly(ctx, [s * 0.14, 0, -s * 0.08, -s * 0.12, -s * 0.08, s * 0.12], '#ff6b5a'); ctx.restore();
      }
    }
    ctx.restore(); // clip
    // 浮動文字
    for (const t of G.texts) {
      const [a, b0] = V.P(t.x, t.y), u = 1 - t.life / t.max;
      const b = b0 - u * s * 0.9;
      const sc = u < 0.15 ? 0.6 + u / 0.15 * 0.5 : 1.1 - Math.min(0.1, (u - 0.15));
      ctx.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
      ctx.font = `900 ${Math.round(Math.max(11, s * 0.34) * t.sz * sc)}px "Noto Sans TC",system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2.5, s * 0.08); ctx.strokeStyle = 'rgba(30,20,10,.75)'; ctx.lineJoin = 'round';
      ctx.strokeText(t.s, a, b); ctx.fillStyle = t.c; ctx.fillText(t.s, a, b);
    }
    ctx.globalAlpha = 1;
    ctx.restore(); // shake
    // 頭目血條
    const boss = G.enemies.find(e => e.alive && e.boss);
    if (boss) {
      const bw = Math.min(V.w * 0.7, 420), bx = V.ox + (V.w - bw) / 2, by = V.oy + s * 0.25, bh = Math.max(8, s * 0.18);
      ctx.fillStyle = 'rgba(20,12,24,.8)'; Draw.rrect(ctx, bx - 4, by - 4, bw + 8, bh + 8 + 16, 8); ctx.fill();
      const f = clamp(boss.hp / boss.maxHp, 0, 1);
      const g2 = ctx.createLinearGradient(bx, 0, bx + bw, 0); g2.addColorStop(0, '#ff3a4a'); g2.addColorStop(1, '#ff9a3c');
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(bx, by + 16, bw, bh);
      ctx.fillStyle = g2; ctx.fillRect(bx, by + 16, bw * f, bh);
      ctx.font = '700 12px "Noto Sans TC",sans-serif'; ctx.fillStyle = '#ffe9d0'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('頭目 · ' + boss.d.name, bx + 2, by - 1);
      ctx.textAlign = 'right'; ctx.fillText(Math.ceil(boss.hp) + ' / ' + Math.round(boss.maxHp), bx + bw - 2, by - 1);
    }
    // 受傷紅框、冰封藍光
    if (G.flash > 0) {
      const g3 = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      g3.addColorStop(0, 'rgba(255,0,0,0)'); g3.addColorStop(1, `rgba(255,40,60,${G.flash})`);
      ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);
    }
    if (G.iceFlash > 0) { ctx.fillStyle = `rgba(190,240,255,${G.iceFlash * 0.4})`; ctx.fillRect(0, 0, W, H); }
    // 波次橫幅
    if (ui.banner && ui.banner.t < 2.2) {
      const bt = ui.banner.t, a = bt < 0.25 ? bt / 0.25 : bt > 1.7 ? (2.2 - bt) / 0.5 : 1;
      const cx = V.ox + V.w / 2, cy = V.oy + V.h * 0.42;
      ctx.globalAlpha = a;
      const sz = Math.min(V.w * 0.11, 56) * (bt < 0.25 ? 0.8 + bt : 1.05);
      ctx.font = `900 ${sz}px "Noto Sans TC",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = sz * 0.16; ctx.strokeStyle = ui.banner.boss ? 'rgba(90,0,10,.85)' : 'rgba(40,24,6,.8)'; ctx.lineJoin = 'round';
      ctx.strokeText(ui.banner.big, cx, cy); ctx.fillStyle = ui.banner.boss ? '#ff6b5a' : '#ffe27a'; ctx.fillText(ui.banner.big, cx, cy);
      if (ui.banner.small) {
        ctx.font = `700 ${sz * 0.36}px "Noto Sans TC",sans-serif`; ctx.lineWidth = sz * 0.08;
        ctx.strokeText(ui.banner.small, cx, cy + sz * 0.75); ctx.fillStyle = '#fff'; ctx.fillText(ui.banner.small, cx, cy + sz * 0.75);
      }
      ctx.globalAlpha = 1;
    }
    // 瞄準隕石
    if (ui.aiming && ui.hover) {
      const [a, b] = V.P(ui.hover.wx, ui.hover.wy);
      ctx.strokeStyle = '#ff7a4a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(a, b, SKILLS.meteor.r * s * 1.5, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  return { setView, view, ensureBg, invalidate, frame, thumb, icon };
})();
