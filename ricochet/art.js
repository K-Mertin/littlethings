// 反彈神射手：美術（全部用 Canvas 2D 程式畫，沒有圖片素材）
// - scene()：把地板、外框、牆、海綿、鏡子預先畫到一張離屏畫布（每關／縮放改變時畫一次）
// - backdrop()：場地外面的背景（草地、雪地、工廠、城堡）
// - hero() / enemy() / barrel() …：每一格都要畫、會動的東西
// 座標都是「世界座標」（場地 800×560）。直式螢幕時場地轉了 90°，角色和臉用 upright() 轉回正的。
(function (root) {
  'use strict';
  const C = root.RicoCore.C;
  const TAU = Math.PI * 2;
  let ctx = null, portrait = false;
  const Art = {};
  Art.use = (c, p) => { ctx = c; portrait = p; };

  // 固定種子的亂數：同一關每次畫出來都一樣
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  function shade(hex, k) {       // k>0 變亮、k<0 變暗
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (k >= 0) { r = lerp(r, 255, k); g = lerp(g, 255, k); b = lerp(b, 255, k); } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  Art.rr = rr;
  function upright(x, y, fn) { ctx.save(); ctx.translate(x, y); if (portrait) ctx.rotate(Math.PI / 2); fn(); ctx.restore(); }
  Art.upright = upright;
  // 世界方向向量 → 正立的本地座標方向
  function localDir(vx, vy) { return portrait ? [vy, -vx] : [vx, vy]; }
  Art.localDir = localDir;

  // ── 主題 ──
  const THEMES = {
    camp: { name: '訓練營', bg: '#86c35d', bg2: '#6fae49', floor: 'wood', wall: '#9a95a8', wallDark: '#4b4560', frame: '#8a5a32', soft: '#9b6bff' },
    ice: { name: '冰晶洞', bg: '#cfe9f7', bg2: '#b4dcf1', floor: 'ice', wall: '#8fd0f0', wallDark: '#3c7fa8', frame: '#e9f6ff', soft: '#9b6bff' },
    factory: { name: '機關工廠', bg: '#59616e', bg2: '#4b525d', floor: 'metal', wall: '#6f7d8c', wallDark: '#2c333d', frame: '#3b434e', soft: '#9b6bff' },
    castle: { name: '魔王城堡', bg: '#2d2340', bg2: '#251c36', floor: 'stone', wall: '#5d5674', wallDark: '#211b30', frame: '#4a4260', soft: '#9b6bff' },
  };
  Art.THEMES = THEMES;

  // ── 場地外面的背景 ──
  Art.backdrop = function (key, w, h, dpr, seed) {
    const T = THEMES[key] || THEMES.camp;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const R = rng(seed || 7);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, T.bg); g.addColorStop(1, T.bg2);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const n = Math.round(w * h / 2600);
    if (key === 'camp') {
      for (let i = 0; i < n; i++) {           // 草
        const x = R() * w, y = R() * h, s = 3 + R() * 5;
        c.strokeStyle = R() < 0.5 ? 'rgba(40,110,30,.35)' : 'rgba(190,240,140,.35)'; c.lineWidth = 1.6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - s * 0.4, y - s); c.moveTo(x, y); c.lineTo(x + s * 0.1, y - s * 1.2); c.moveTo(x, y); c.lineTo(x + s * 0.5, y - s * 0.9); c.stroke();
      }
      for (let i = 0; i < n / 14; i++) {      // 小花
        const x = R() * w, y = R() * h; c.fillStyle = ['#fff', '#ffe066', '#ff9ec4'][i % 3];
        for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, 0, TAU); c.fill(); }
        c.fillStyle = '#f5a623'; c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill();
      }
    } else if (key === 'ice') {
      for (let i = 0; i < n / 2; i++) {
        const x = R() * w, y = R() * h, s = 1 + R() * 2.5; c.fillStyle = `rgba(255,255,255,${0.4 + R() * 0.5})`; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
      }
      for (let i = 0; i < n / 20; i++) { const x = R() * w, y = R() * h; flake(c, x, y, 5 + R() * 6); }
    } else if (key === 'factory') {
      c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1;
      for (let x = 0; x < w; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let y = 0; y < h; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      for (let i = 0; i < 6; i++) {            // 管線
        const y = R() * h, t = 10 + R() * 10; c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, y + 3, w, t);
        const pg = c.createLinearGradient(0, y, 0, y + t); pg.addColorStop(0, '#8b96a3'); pg.addColorStop(0.5, '#c2cad3'); pg.addColorStop(1, '#6c7682');
        c.fillStyle = pg; c.fillRect(0, y, w, t);
        for (let x = R() * 120; x < w; x += 140 + R() * 120) { c.fillStyle = '#56606b'; c.fillRect(x, y - 3, 10, t + 6); }
      }
    } else if (key === 'castle') {
      for (let i = 0; i < n / 3; i++) { const x = R() * w, y = R() * h; c.fillStyle = `rgba(255,240,200,${0.15 + R() * 0.5})`; c.beginPath(); c.arc(x, y, R() * 1.4 + 0.3, 0, TAU); c.fill(); }
    }
    return cv;
  };
  function flake(c, x, y, s) {
    c.save(); c.translate(x, y); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.4; c.lineCap = 'round';
    for (let k = 0; k < 6; k++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s); c.moveTo(0, -s * 0.55); c.lineTo(s * 0.25, -s * 0.8); c.moveTo(0, -s * 0.55); c.lineTo(-s * 0.25, -s * 0.8); c.stroke(); }
    c.restore();
  }

  // ── 場地（離屏畫布）──
  const M = 30;      // 外框寬度（畫在場地外圍）
  Art.MARGIN = M;
  Art.scene = function (def, world, key, res, seed) {
    const T = THEMES[key] || THEMES.camp;
    const cv = document.createElement('canvas');
    cv.width = Math.round((C.W + M * 2) * res); cv.height = Math.round((C.H + M * 2) * res);
    const c = cv.getContext('2d'); c.scale(res, res); c.translate(M, M);
    const R = rng(seed || 1);
    // 地板
    c.save(); c.beginPath(); c.rect(0, 0, C.W, C.H); c.clip();
    FLOORS[T.floor](c, R);
    // 四周內側陰影
    const vg = c.createRadialGradient(C.W / 2, C.H / 2, C.H * 0.35, C.W / 2, C.H / 2, C.W * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.22)'); c.fillStyle = vg; c.fillRect(0, 0, C.W, C.H);
    // 牆、海綿、鏡子的影子
    c.fillStyle = 'rgba(20,10,30,.28)';
    for (const p of world.polys) { c.save(); c.translate(7, 9); path(c, p.pts); c.fill(); c.restore(); }
    c.restore();
    frame(c, T, def.softBorder || {}, R, key);
    for (const p of world.polys) {
      if (p.kind === 'wall') WALLS[key](c, box(p.pts), T, R);
      else if (p.kind === 'soft') sponge(c, box(p.pts), R);
      else if (p.kind === 'mirror') mirror(c, p.pts);
    }
    return cv;
  };
  function path(c, P) { c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); c.closePath(); }
  function box(P) { const xs = P.map(p => p[0]), ys = P.map(p => p[1]); const x = Math.min(...xs), y = Math.min(...ys); return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]; }

  const FLOORS = {
    wood(c, R) {
      const rowH = 40;
      for (let y = 0; y < C.H; y += rowH) {
        let x = -R() * 200;
        while (x < C.W) {
          const L = 140 + R() * 160, base = ['#dcae74', '#d4a368', '#e3b77f', '#cf9d62'][Math.floor(R() * 4)];
          const g = c.createLinearGradient(0, y, 0, y + rowH); g.addColorStop(0, shade(base, 0.08)); g.addColorStop(1, shade(base, -0.06));
          c.fillStyle = g; c.fillRect(x, y, L, rowH);
          c.strokeStyle = 'rgba(110,60,20,.13)'; c.lineWidth = 1.2;          // 木紋
          for (let k = 0; k < 4; k++) {
            const yy = y + 6 + R() * (rowH - 12), amp = 1 + R() * 2.5, ph = R() * 6;
            c.beginPath(); for (let xx = x; xx <= x + L; xx += 10) { const v = yy + Math.sin(xx / 30 + ph) * amp; xx === x ? c.moveTo(xx, v) : c.lineTo(xx, v); } c.stroke();
          }
          if (R() < 0.35) { const kx = x + 20 + R() * (L - 40), ky = y + 10 + R() * (rowH - 20); c.strokeStyle = 'rgba(110,60,20,.25)'; c.beginPath(); c.ellipse(kx, ky, 7, 3.5, 0, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(kx, ky, 3, 1.5, 0, 0, TAU); c.stroke(); }
          c.fillStyle = 'rgba(80,40,10,.45)'; c.fillRect(x + L - 1.5, y, 2, rowH);   // 接縫
          c.fillStyle = 'rgba(70,45,25,.55)';                                     // 釘子
          for (const nx of [x + 8, x + L - 9]) for (const ny of [y + 9, y + rowH - 9]) { c.beginPath(); c.arc(nx, ny, 1.6, 0, TAU); c.fill(); }
          x += L;
        }
        c.fillStyle = 'rgba(80,40,10,.4)'; c.fillRect(0, y + rowH - 1.5, C.W, 2);
      }
    },
    ice(c, R) {
      const s = 80;
      for (let y = 0; y < C.H; y += s) for (let x = 0; x < C.W; x += s) {
        const g = c.createLinearGradient(x, y, x + s, y + s); const b = ['#e6f6ff', '#dbf1fd', '#eefaff'][Math.floor(R() * 3)];
        g.addColorStop(0, shade(b.length ? b : '#e6f6ff', 0.2)); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(x, y, s, s);
        c.strokeStyle = 'rgba(120,180,220,.35)'; c.lineWidth = 1.5; c.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
        if (R() < 0.3) {          // 裂痕
          c.strokeStyle = 'rgba(140,190,225,.5)'; c.lineWidth = 1; c.beginPath(); let px = x + R() * s, py = y + R() * s; c.moveTo(px, py);
          for (let k = 0; k < 4; k++) { px += (R() - 0.5) * 30; py += (R() - 0.5) * 30; c.lineTo(px, py); } c.stroke();
        }
        if (R() < 0.4) { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 10, y + 16); c.lineTo(x + 26, y + 8); c.stroke(); }
      }
      for (let i = 0; i < 40; i++) { const x = R() * C.W, y = R() * C.H; c.fillStyle = 'rgba(255,255,255,.8)'; star4(c, x, y, 2 + R() * 3); }
    },
    metal(c, R) {
      const s = 100;
      for (let y = 0; y < C.H; y += s) for (let x = 0; x < C.W; x += s) {
        const b = ['#a3adb8', '#9aa5b1', '#aab4be'][Math.floor(R() * 3)];
        const g = c.createLinearGradient(x, y, x, y + s); g.addColorStop(0, shade(b, 0.1)); g.addColorStop(1, shade(b, -0.08));
        c.fillStyle = g; c.fillRect(x, y, s, s);
        c.fillStyle = 'rgba(255,255,255,.08)';                  // 止滑紋
        for (let yy = y + 8; yy < y + s - 4; yy += 14) for (let xx = x + 8 + ((yy / 14) % 2) * 7; xx < x + s - 4; xx += 14) { c.save(); c.translate(xx, yy); c.rotate(0.6); c.fillRect(-4, -1.2, 8, 2.4); c.restore(); }
        c.strokeStyle = 'rgba(40,50,60,.5)'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, s - 2, s - 2);
        c.fillStyle = '#6e7883';
        for (const [rx, ry] of [[x + 9, y + 9], [x + s - 9, y + 9], [x + 9, y + s - 9], [x + s - 9, y + s - 9]]) { c.beginPath(); c.arc(rx, ry, 3, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(rx - 1, ry - 1, 1, 0, TAU); c.fill(); c.fillStyle = '#6e7883'; }
        if (R() < 0.15) { c.fillStyle = 'rgba(30,30,40,.12)'; c.beginPath(); c.ellipse(x + R() * s, y + R() * s, 14 + R() * 14, 8 + R() * 8, R() * 3, 0, TAU); c.fill(); }
      }
      // 黃黑警示線
      c.save(); c.globalAlpha = 0.5; hazard(c, 0, C.H - 14, C.W, 14); hazard(c, 0, 0, C.W, 10); c.restore();
    },
    stone(c, R) {
      const s = 70;
      c.fillStyle = '#3c3550'; c.fillRect(0, 0, C.W, C.H);
      for (let y = 0; y < C.H; y += s) for (let x = ((y / s) % 2) * -35; x < C.W; x += s) {
        const b = ['#6b6681', '#625d78', '#736e89', '#5d5872'][Math.floor(R() * 4)];
        const g = c.createLinearGradient(x, y, x + s, y + s); g.addColorStop(0, shade(b, 0.1)); g.addColorStop(1, shade(b, -0.12));
        c.fillStyle = g; rr(c, x + 2, y + 2, s - 4, s - 4, 6); c.fill();
        if (R() < 0.25) { c.fillStyle = 'rgba(90,150,80,.35)'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + 6 + R() * 14, y + s - 8 - R() * 10, 2 + R() * 3, 0, TAU); c.fill(); } }
        if (R() < 0.3) { c.strokeStyle = 'rgba(30,25,45,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + R() * s, y + 4); c.lineTo(x + R() * s, y + s / 2); c.lineTo(x + R() * s, y + s - 4); c.stroke(); }
      }
      // 火把的暖光
      for (const [x, y] of [[0, 0], [C.W, 0], [0, C.H], [C.W, C.H], [C.W / 2, 0], [C.W / 2, C.H]]) {
        const g = c.createRadialGradient(x, y, 10, x, y, 230); g.addColorStop(0, 'rgba(255,170,80,.28)'); g.addColorStop(1, 'rgba(255,170,80,0)');
        c.fillStyle = g; c.fillRect(0, 0, C.W, C.H);
      }
    },
  };
  function star4(c, x, y, s) { c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.3, y - s * 0.3); c.lineTo(x + s, y); c.lineTo(x + s * 0.3, y + s * 0.3); c.lineTo(x, y + s); c.lineTo(x - s * 0.3, y + s * 0.3); c.lineTo(x - s, y); c.lineTo(x - s * 0.3, y - s * 0.3); c.closePath(); c.fill(); }
  function hazard(c, x, y, w, h) {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = '#f2c230'; c.fillRect(x, y, w, h); c.fillStyle = '#2b2b2b';
    for (let k = x - h * 2; k < x + w + h; k += h * 2) { c.beginPath(); c.moveTo(k, y + h); c.lineTo(k + h, y); c.lineTo(k + h * 2, y); c.lineTo(k + h, y + h); c.closePath(); c.fill(); }
    c.restore();
  }

  // 外框（畫在場地外圍 M 像素寬）
  function frame(c, T, soft, R, key) {
    const W = C.W, H = C.H;
    const sides = [['top', -M, -M, W + M * 2, M], ['bottom', -M, H, W + M * 2, M], ['left', -M, -M, M, H + M * 2], ['right', W, -M, M, H + M * 2]];
    for (const [name, x, y, w, h] of sides) {
      if (key === 'camp') {
        const horiz = w > h;
        const g = horiz ? c.createLinearGradient(0, y, 0, y + h) : c.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, '#a8703f'); g.addColorStop(0.5, '#8a5a32'); g.addColorStop(1, '#6d4425');
        c.fillStyle = g; c.fillRect(x, y, w, h);
        c.strokeStyle = 'rgba(60,30,10,.35)'; c.lineWidth = 1.2;
        for (let k = 0; k < 3; k++) { c.beginPath(); if (horiz) { const yy = y + 6 + k * 8; c.moveTo(x, yy); c.lineTo(x + w, yy + 1); } else { const xx = x + 6 + k * 8; c.moveTo(xx, y); c.lineTo(xx + 1, y + h); } c.stroke(); }
      } else if (key === 'ice') {
        c.fillStyle = '#f4fbff'; c.fillRect(x, y, w, h);
        c.fillStyle = '#d6ecf8'; for (let k = 0; k < (w + h) / 18; k++) { const px = x + R() * w, py = y + R() * h; c.beginPath(); c.arc(px, py, 4 + R() * 8, 0, TAU); c.fill(); }
      } else if (key === 'factory') {
        c.fillStyle = '#39414b'; c.fillRect(x, y, w, h); hazard(c, x + (w > h ? 0 : 8), y + (w > h ? 8 : 0), w > h ? w : 14, w > h ? 14 : h);
      } else {
        c.fillStyle = '#4a4260'; c.fillRect(x, y, w, h);
        c.strokeStyle = 'rgba(20,15,30,.6)'; c.lineWidth = 2;
        if (w > h) for (let k = x; k < x + w; k += 34) { c.strokeRect(k, y + 2, 34, h / 2 - 2); c.strokeRect(k + 17, y + h / 2, 34, h / 2 - 2); }
        else for (let k = y; k < y + h; k += 34) { c.strokeRect(x + 2, k, w / 2 - 2, 34); c.strokeRect(x + w / 2, k + 17, w / 2 - 2, 34); }
      }
      if (soft[name]) {          // 海綿邊：紫色軟墊
        const t = 12, sx = name === 'right' ? W : name === 'left' ? -t : 0, sy = name === 'bottom' ? H : name === 'top' ? -t : 0;
        const sw = w > h ? W : t, sh = w > h ? t : H;
        sponge(c, [sx, sy, sw, sh], R, true);
      }
    }
    // 角柱
    for (const [x, y] of [[-M, -M], [W, -M], [-M, H], [W, H]]) {
      if (key === 'camp') { c.fillStyle = '#6d4425'; rr(c, x - 2, y - 2, M + 4, M + 4, 6); c.fill(); c.fillStyle = '#a8703f'; rr(c, x + 4, y + 4, M - 8, M - 8, 4); c.fill(); }
      else if (key === 'castle') { c.fillStyle = '#3a3350'; c.fillRect(x - 3, y - 3, M + 6, M + 6); c.fillStyle = '#5d5674'; c.fillRect(x + 3, y + 3, M - 6, M - 6); }
      else if (key === 'factory') { c.fillStyle = '#2c333d'; c.fillRect(x, y, M, M); c.fillStyle = '#8b96a3'; c.beginPath(); c.arc(x + M / 2, y + M / 2, 6, 0, TAU); c.fill(); }
    }
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.strokeRect(-1, -1, W + 2, H + 2);
  }

  const WALLS = {
    camp(c, b, T, R) { bricks(c, b, R, ['#a29db0', '#948fa4', '#aaa5b8', '#8b869c'], '#4b4560', true); },
    ice(c, b, T, R) {
      const [x, y, w, h] = b;
      const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#6fb8e4'); g.addColorStop(0.5, '#3b88c0'); g.addColorStop(1, '#245f93');
      c.fillStyle = g; rr(c, x, y, w, h, 6); c.fill(); c.lineWidth = 3; c.strokeStyle = '#173f66'; c.stroke();
      c.save(); rr(c, x, y, w, h, 6); c.clip();
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2;
      for (let k = 0; k < (w + h) / 30; k++) { const px = x + R() * w, py = y + R() * h; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 8 + R() * 10, py - 8 - R() * 10); c.stroke(); }
      c.restore();
      c.fillStyle = '#fbfeff';                // 頂上的雪
      c.beginPath(); c.moveTo(x - 2, y + 6); for (let xx = x; xx <= x + w; xx += 10) c.quadraticCurveTo(xx + 5, y - 5 - R() * 3, xx + 10, y + 2); c.lineTo(x + w + 2, y + 8); c.lineTo(x - 2, y + 8); c.closePath(); c.fill();
    },
    factory(c, b, T, R) {
      const [x, y, w, h] = b;
      const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#8795a4'); g.addColorStop(1, '#55616e');
      c.fillStyle = g; c.fillRect(x, y, w, h); c.lineWidth = 3; c.strokeStyle = '#2c333d'; c.strokeRect(x, y, w, h);
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 2, y + 2, w - 4, 3);
      if (w > 26 && h > 26) { const t = Math.min(10, Math.min(w, h) / 4); if (w >= h) hazard(c, x + 4, y + h / 2 - t / 2, w - 8, t); else hazard(c, x + w / 2 - t / 2, y + 4, t, h - 8); }
      c.fillStyle = '#3b444f';
      for (const [rx, ry] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) { c.beginPath(); c.arc(rx, ry, 2.5, 0, TAU); c.fill(); }
    },
    castle(c, b, T, R) { bricks(c, b, R, ['#2f2a42', '#28233a', '#35304a', '#2b2640'], '#0f0b18', false); c.strokeStyle = '#c9a24a'; c.lineWidth = 2; rr(c, b[0] + 3, b[1] + 3, b[2] - 6, b[3] - 6, 3); c.stroke(); },
  };
  function bricks(c, b, R, cols, dark, moss) {
    const [x, y, w, h] = b, bh = 18, bw = 34;
    c.save(); rr(c, x, y, w, h, 4); c.clip();
    c.fillStyle = dark; c.fillRect(x, y, w, h);
    for (let yy = y, row = 0; yy < y + h; yy += bh, row++) {
      for (let xx = x - (row % 2) * bw / 2; xx < x + w; xx += bw) {
        const col = cols[Math.floor(R() * cols.length)];
        const g = c.createLinearGradient(0, yy, 0, yy + bh); g.addColorStop(0, shade(col, 0.15)); g.addColorStop(1, shade(col, -0.1));
        c.fillStyle = g; rr(c, xx + 1.5, yy + 1.5, bw - 3, bh - 3, 3); c.fill();
        if (R() < 0.12) { c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(xx + 6, yy + 4); c.lineTo(xx + 12, yy + 10); c.lineTo(xx + 10, yy + 15); c.stroke(); }
      }
    }
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x, y, w, 3);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x, y + h - 4, w, 4);
    c.restore();
    c.lineWidth = 3; c.strokeStyle = dark; rr(c, x, y, w, h, 4); c.stroke();
    if (moss) {
      c.fillStyle = 'rgba(95,170,70,.85)';
      for (let k = 0; k < w / 16; k++) if (R() < 0.6) { const mx = x + 4 + R() * (w - 8); c.beginPath(); c.arc(mx, y + 1, 3 + R() * 4, Math.PI, 0); c.fill(); }
    }
  }
  function sponge(c, b, R, flat) {
    const [x, y, w, h] = b;
    const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#b393ff'); g.addColorStop(1, '#7f4fe6');
    c.fillStyle = g; rr(c, x, y, w, h, flat ? 4 : 10); c.fill();
    c.save(); rr(c, x, y, w, h, flat ? 4 : 10); c.clip();
    const n = Math.max(3, Math.round(w * h / 140));
    for (let k = 0; k < n; k++) {
      const px = x + R() * w, py = y + R() * h, r = 1.5 + R() * 4;
      c.fillStyle = 'rgba(70,30,150,.45)'; c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(px - r * 0.3, py - r * 0.3, r * 0.4, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x, y, w, 3);
    c.restore();
    c.lineWidth = 2.5; c.strokeStyle = '#5a2fc0'; rr(c, x, y, w, h, flat ? 4 : 10); c.stroke();
  }
  function mirror(c, P) {
    path(c, P); c.fillStyle = '#5b6a7d'; c.fill();       // 金屬框
    const ins = P.map((p, i) => { const o = P[(i + 2) % 4]; return [lerp(p[0], o[0], 0.18), lerp(p[1], o[1], 0.18)]; });
    path(c, ins);
    const g = c.createLinearGradient(P[0][0], P[0][1], P[1][0], P[1][1]);
    g.addColorStop(0, '#e6f7ff'); g.addColorStop(0.3, '#9ad8ff'); g.addColorStop(0.55, '#e9f8ff'); g.addColorStop(0.75, '#7cc7ff'); g.addColorStop(1, '#c9ecff');
    c.fillStyle = g; c.fill();
    c.lineWidth = 1.5; c.strokeStyle = '#2a4d73'; path(c, P); c.stroke();
    for (const k of [0.08, 0.92]) {     // 兩端螺絲
      const bx = lerp((P[0][0] + P[3][0]) / 2, (P[1][0] + P[2][0]) / 2, k), by = lerp((P[0][1] + P[3][1]) / 2, (P[1][1] + P[2][1]) / 2, k);
      c.fillStyle = '#d0d7df'; c.beginPath(); c.arc(bx, by, 3, 0, TAU); c.fill(); c.strokeStyle = '#46546a'; c.lineWidth = 1; c.stroke();
    }
  }

  // ── 主角「阿彈」：戴牛仔帽、綁紅領巾的小神槍手 ──
  // aim：畫面上的角度（度）；st：{ t, recoil(0..1), mood: 'idle'|'win'|'sad'|'ouch', blink }
  Art.hero = function (x, y, aim, st) {
    const a = -aim * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const facing = ca >= 0 ? 1 : -1;
    const breathe = Math.sin(st.t * 2.4) * 0.8;
    const jump = st.mood === 'win' ? -Math.abs(Math.sin(st.t * 7)) * 10 : 0;
    const shake = st.mood === 'ouch' ? Math.sin(st.t * 60) * 2 : 0;
    upright(x, y, () => {
      ctx.translate(shake, 0);
      ctx.fillStyle = 'rgba(30,20,40,.25)'; ctx.beginPath(); ctx.ellipse(0, 20, 20 - jump * 0.3, 7, 0, 0, TAU); ctx.fill();
      ctx.translate(0, jump);
      const gunBehind = sa < -0.35;   // 槍往上指時畫在身體後面
      if (gunBehind) gun();
      // 腳
      ctx.fillStyle = '#5a3b22'; rr(ctx, -10, 12, 8, 8, 3); ctx.fill(); rr(ctx, 2, 12, 8, 8, 3); ctx.fill();
      // 身體：藍上衣＋皮帶
      ctx.fillStyle = '#3f8de8'; rr(ctx, -12, -2 + breathe * 0.3, 24, 18, 8); ctx.fill();
      ctx.fillStyle = '#7a4a24'; ctx.fillRect(-12, 9, 24, 4); ctx.fillStyle = '#ffd34d'; ctx.fillRect(-3, 8.5, 6, 5);
      // 頭
      ctx.translate(0, breathe * 0.5);
      ctx.fillStyle = '#ffd7b0'; ctx.beginPath(); ctx.arc(0, -14, 15, 0, TAU); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#d69a6a'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,120,.45)'; ctx.beginPath(); ctx.arc(-9, -9, 3.2, 0, TAU); ctx.arc(9, -9, 3.2, 0, TAU); ctx.fill();
      // 眼睛
      const lx = ca * 2.2, ly = sa * 1.6;
      if (st.mood === 'win') {
        ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-5.5, -13, 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(5.5, -13, 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else if (st.blink || st.mood === 'ouch') {
        ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(-3, -14); ctx.moveTo(3, -14); ctx.lineTo(8, -14); ctx.stroke();
      } else {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-5.5, -14, 3.6, 4.4, 0, 0, TAU); ctx.ellipse(5.5, -14, 3.6, 4.4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.arc(-5.5 + lx, -14 + ly, 2.3, 0, TAU); ctx.arc(5.5 + lx, -14 + ly, 2.3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4.8 + lx, -15 + ly, 0.8, 0, TAU); ctx.arc(6.2 + lx, -15 + ly, 0.8, 0, TAU); ctx.fill();
      }
      // 嘴
      ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
      if (st.mood === 'win') { ctx.fillStyle = '#c0392b'; ctx.arc(0, -7, 4, 0, Math.PI); ctx.fill(); }
      else if (st.mood === 'sad' || st.mood === 'ouch') ctx.arc(0, -4, 3.5, Math.PI * 1.15, Math.PI * 1.85);
      else ctx.arc(facing * 1.5, -8, 3.2, 0.25, Math.PI - 0.25);
      ctx.stroke();
      // 紅領巾
      ctx.fillStyle = '#e8473c'; ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(10, -2); ctx.lineTo(facing * 3, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-facing * 6, -1); ctx.lineTo(-facing * 13, 4 + Math.sin(st.t * 5) * 1.5); ctx.lineTo(-facing * 9, 0); ctx.fill();
      // 牛仔帽
      ctx.fillStyle = '#8a5a32'; ctx.beginPath(); ctx.ellipse(0, -24, 22, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#a56b3a'; ctx.beginPath(); ctx.moveTo(-12, -24); ctx.quadraticCurveTo(-13, -38, -4, -36); ctx.quadraticCurveTo(0, -33, 4, -36); ctx.quadraticCurveTo(13, -38, 12, -24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a3b22'; ctx.fillRect(-12, -28, 24, 4);
      ctx.fillStyle = '#ffd34d'; star(ctx, 0, -26, 3.4);
      ctx.translate(0, -breathe * 0.5);
      if (!gunBehind) gun();
    });
    function gun() {
      // 手臂從肩膀伸出去，槍跟著瞄準方向轉
      const kick = st.recoil * 7;
      ctx.save(); ctx.translate(facing * 6, 2); ctx.rotate(a);
      ctx.fillStyle = '#ffd7b0'; rr(ctx, 0 - kick, -3.5, 16, 7, 3.5); ctx.fill();
      ctx.translate(14 - kick, 0); if (facing < 0) ctx.scale(1, -1);
      ctx.fillStyle = '#4b4f5c'; rr(ctx, 0, -4, 22, 7, 2); ctx.fill();           // 槍管
      ctx.fillStyle = '#6f7484'; ctx.fillRect(4, -5, 10, 2);
      ctx.fillStyle = '#7a4a24'; rr(ctx, -2, -1, 8, 11, 3); ctx.fill();           // 握把
      ctx.fillStyle = '#8b90a0'; ctx.beginPath(); ctx.arc(6, -0.5, 3.4, 0, TAU); ctx.fill();   // 轉輪
      ctx.restore();
    }
  };
  function star(c, x, y, r) {
    c.beginPath(); for (let k = 0; k < 10; k++) { const rr2 = k % 2 ? r * 0.45 : r, an = -Math.PI / 2 + k * Math.PI / 5; c.lineTo(x + Math.cos(an) * rr2, y + Math.sin(an) * rr2); } c.closePath(); c.fill();
  }
  Art.star = (x, y, r) => star(ctx, x, y, r);

  // ── 敵人：調皮的小哥布林，每隻配色和配件都不一樣 ──
  const SKINS = [['#6cc36a', '#3d8a3f'], ['#59b8a6', '#2f7f70'], ['#9bc95a', '#5d8a2a'], ['#7fc98a', '#3f8f52'], ['#4fae7e', '#2b7350']];
  const GEAR = ['none', 'helmet', 'horns', 'bandana', 'eyepatch', 'mohawk', 'none', 'cap'];
  Art.enemyLook = (i, seed) => { const R = rng((seed || 1) * 97 + i * 31 + 5); return { skin: SKINS[Math.floor(R() * SKINS.length)], gear: GEAR[Math.floor(R() * GEAR.length)], ph: R() * TAU, size: 0.95 + R() * 0.12 }; };
  // look：enemyLook；st：{ t, dead(秒，-1=活著), lookX/lookY（看向哪裡的世界方向）, kx/ky（被打飛的方向）, scared }
  Art.enemy = function (x, y, look, st) {
    const R0 = C.ENEMY_R * look.size;
    const t = st.t + look.ph;
    if (st.dead >= 0) {
      const d = st.dead;
      if (d < 0.7) {               // 被打飛：往子彈方向滑出去、轉圈、變小
        const k = d / 0.7, ease = 1 - (1 - k) * (1 - k);
        upright(x + st.kx * 34 * ease, y + st.ky * 34 * ease, () => {
          ctx.rotate(ease * 5 * (st.kx >= 0 ? 1 : -1)); ctx.globalAlpha = 1 - k * 0.6; const sc = 1 - k * 0.35; ctx.scale(sc, sc);
          body(R0, look, t, d < 0.08 ? 'flash' : 'ko', 0, 0);
          ctx.globalAlpha = 1;
        });
        upright(x + st.kx * 34 * ease, y + st.ky * 34 * ease, () => {    // 頭上轉圈的星星
          for (let k2 = 0; k2 < 3; k2++) { const an = d * 9 + k2 * TAU / 3; ctx.fillStyle = '#ffd34d'; star(ctx, Math.cos(an) * 16, -R0 - 6 + Math.sin(an) * 5, 4); }
        });
      }
      if (d > 0.4 && d < 1.8) {     // 小幽靈飄上去
        const k = (d - 0.4) / 1.4;
        upright(x + st.kx * 34, y + st.ky * 34, () => {
          ctx.globalAlpha = (1 - k) * 0.8; ctx.translate(Math.sin(d * 6) * 4, -k * 50 - 10);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI, 0); ctx.lineTo(9, 10); for (let q = 0; q < 3; q++) ctx.lineTo(6 - q * 6, q % 2 ? 10 : 6); ctx.lineTo(-9, 10); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.arc(-3, -1, 1.5, 0, TAU); ctx.arc(3, -1, 1.5, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        });
      }
      if (d >= 0.7) upright(x + st.kx * 34, y + st.ky * 34, () => {    // 留在地上的小頭盔／印子
        ctx.fillStyle = 'rgba(40,30,50,.18)'; ctx.beginPath(); ctx.ellipse(0, 6, 13, 5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = look.skin[1]; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(0, 3, 7, Math.PI, 0); ctx.fill(); ctx.globalAlpha = 1;
      });
      return;
    }
    upright(x, y, () => {
      const [lx, ly] = localDir(st.lookX || 0, st.lookY || 0);
      ctx.fillStyle = 'rgba(30,20,40,.25)'; ctx.beginPath(); ctx.ellipse(0, R0 * 0.85, R0 * 0.95, R0 * 0.32, 0, 0, TAU); ctx.fill();
      const hop = Math.abs(Math.sin(t * 3)) * (st.scared ? 4 : 2);
      ctx.translate(0, -hop);
      const sq = 1 + Math.sin(t * 6) * 0.03;
      ctx.scale(1 / sq, sq);
      body(R0, look, t, st.scared ? 'scared' : 'idle', lx, ly);
    });
  };
  function body(R, look, t, face, lx, ly) {
    const [skin, dark] = face === 'flash' ? ['#ffffff', '#dddddd'] : look.skin;
    // 耳朵
    ctx.fillStyle = skin; ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
    const ew = Math.sin(t * 2) * 0.08;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.rotate(ew * s);
      ctx.beginPath(); ctx.moveTo(R * 0.7, -R * 0.35); ctx.quadraticCurveTo(R * 1.55, -R * 0.75, R * 1.45, -R * 0.05); ctx.quadraticCurveTo(R * 1.1, 0, R * 0.8, R * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = shade(skin, -0.15); ctx.beginPath(); ctx.moveTo(R * 0.85, -R * 0.25); ctx.quadraticCurveTo(R * 1.3, -R * 0.5, R * 1.25, -R * 0.08); ctx.closePath(); ctx.fill(); ctx.fillStyle = skin;
      ctx.restore();
    }
    // 身體
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.2, 0, 0, R * 1.1);
    g.addColorStop(0, shade(skin, 0.25)); g.addColorStop(1, skin);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.95, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(skin, 0.35); ctx.beginPath(); ctx.ellipse(0, R * 0.45, R * 0.55, R * 0.32, 0, 0, TAU); ctx.fill();   // 肚子
    // 配件（頭上）
    gear(R, look.gear, dark);
    // 臉
    const eyeY = -R * 0.18;
    if (face === 'ko' || face === 'flash') {
      ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (const s of [-1, 1]) { const ex = s * R * 0.36; ctx.beginPath(); ctx.moveTo(ex - 4, eyeY - 4); ctx.lineTo(ex + 4, eyeY + 4); ctx.moveTo(ex + 4, eyeY - 4); ctx.lineTo(ex - 4, eyeY + 4); ctx.stroke(); }
      ctx.fillStyle = '#7a1f2a'; ctx.beginPath(); ctx.ellipse(0, R * 0.32, 5, 6, 0, 0, TAU); ctx.fill();
      return;
    }
    const blink = (t % 3.7) < 0.12;
    for (const s of [-1, 1]) {
      const ex = s * R * 0.36;
      if (look.gear === 'eyepatch' && s < 0) { ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.ellipse(ex, eyeY, 6, 5.5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-R * 0.9, eyeY - 8); ctx.lineTo(R * 0.6, eyeY - 2); ctx.stroke(); continue; }
      if (blink) { ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex - 5, eyeY); ctx.lineTo(ex + 5, eyeY); ctx.stroke(); continue; }
      ctx.fillStyle = face === 'scared' ? '#fff' : '#fff9d6'; ctx.beginPath(); ctx.ellipse(ex, eyeY, face === 'scared' ? 6.5 : 5.8, face === 'scared' ? 7 : 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = face === 'scared' ? '#2b2340' : '#c0392b'; ctx.beginPath(); ctx.arc(ex + lx * 2.4, eyeY + ly * 2.4, face === 'scared' ? 2 : 2.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.arc(ex + lx * 2.6, eyeY + ly * 2.6, 1.3, 0, TAU); ctx.fill();
    }
    // 眉毛
    ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const bro = face === 'scared' ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(-R * 0.62, eyeY - 9 - bro * 2); ctx.lineTo(-R * 0.14, eyeY - 6 + bro * 2); ctx.moveTo(R * 0.62, eyeY - 9 - bro * 2); ctx.lineTo(R * 0.14, eyeY - 6 + bro * 2); ctx.stroke();
    // 嘴巴＋獠牙
    ctx.fillStyle = '#5a1e2a';
    if (face === 'scared') { ctx.beginPath(); ctx.ellipse(0, R * 0.38, 4, 5, 0, 0, TAU); ctx.fill(); }
    else {
      ctx.beginPath(); ctx.moveTo(-R * 0.4, R * 0.25); ctx.quadraticCurveTo(0, R * 0.55 + Math.sin(t * 4) * 1.5, R * 0.4, R * 0.25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fffbea';
      ctx.beginPath(); ctx.moveTo(-R * 0.3, R * 0.27); ctx.lineTo(-R * 0.22, R * 0.08); ctx.lineTo(-R * 0.14, R * 0.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(R * 0.3, R * 0.27); ctx.lineTo(R * 0.22, R * 0.08); ctx.lineTo(R * 0.14, R * 0.3); ctx.fill();
    }
  }
  function gear(R, g, dark) {
    if (g === 'helmet') {
      ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.arc(0, -R * 0.35, R * 0.85, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5c6570'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#c9d0d7'; ctx.fillRect(-R * 0.15, -R * 1.2, R * 0.3, R * 0.5);
    } else if (g === 'horns') {
      ctx.fillStyle = '#f3e6c4'; ctx.strokeStyle = '#a8946a'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * R * 0.25, -R * 0.8); ctx.quadraticCurveTo(s * R * 0.5, -R * 1.5, s * R * 0.75, -R * 1.35); ctx.quadraticCurveTo(s * R * 0.5, -R * 1.05, s * R * 0.55, -R * 0.68); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    } else if (g === 'bandana') {
      ctx.fillStyle = '#e8473c'; ctx.beginPath(); ctx.ellipse(0, -R * 0.62, R * 0.92, R * 0.3, 0, Math.PI, 0); ctx.lineTo(R * 0.9, -R * 0.5); ctx.lineTo(-R * 0.9, -R * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; for (const px of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.arc(px * R, -R * 0.66, 1.6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#e8473c'; ctx.beginPath(); ctx.moveTo(R * 0.85, -R * 0.6); ctx.lineTo(R * 1.25, -R * 0.85); ctx.lineTo(R * 1.2, -R * 0.45); ctx.fill();
    } else if (g === 'mohawk') {
      ctx.fillStyle = '#ff6b9a'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * R * 0.16 - 4, -R * 0.85); ctx.lineTo(k * R * 0.16, -R * 1.35 + Math.abs(k) * 4); ctx.lineTo(k * R * 0.16 + 4, -R * 0.85); ctx.fill(); }
    } else if (g === 'cap') {
      ctx.fillStyle = '#3f6fd8'; ctx.beginPath(); ctx.arc(0, -R * 0.5, R * 0.7, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillRect(-R * 0.1, -R * 0.56, R * 1.05, R * 0.16); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -R * 1.18, 2.6, 0, TAU); ctx.fill();
    }
  }

  // ── 炸藥桶：木桶＋鐵箍＋會冒火花的引信 ──
  Art.barrel = function (x, y, t) {
    const R = C.BARREL_R;
    upright(x, y, () => {
      ctx.fillStyle = 'rgba(30,20,40,.28)'; ctx.beginPath(); ctx.ellipse(3, R * 0.95, R * 1.05, R * 0.38, 0, 0, TAU); ctx.fill();
      const g = ctx.createLinearGradient(-R, 0, R, 0); g.addColorStop(0, '#8a4b22'); g.addColorStop(0.4, '#c77a3a'); g.addColorStop(1, '#7a3f1a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-R * 0.85, -R); ctx.quadraticCurveTo(-R * 1.15, 0, -R * 0.85, R); ctx.lineTo(R * 0.85, R); ctx.quadraticCurveTo(R * 1.15, 0, R * 0.85, -R); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a2a12'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#555b66'; ctx.lineWidth = 3;
      for (const yy of [-R * 0.62, R * 0.62]) { ctx.beginPath(); ctx.moveTo(-R * 0.98, yy); ctx.lineTo(R * 0.98, yy); ctx.stroke(); }
      ctx.fillStyle = '#e8473c'; ctx.fillRect(-R * 0.95, -R * 0.32, R * 1.9, R * 0.64);
      ctx.fillStyle = '#fff'; ctx.font = '900 10px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TNT', 0, 0.5);
      ctx.fillStyle = '#d99a5c'; ctx.beginPath(); ctx.ellipse(0, -R, R * 0.85, R * 0.25, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#4a2a12'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -R); ctx.quadraticCurveTo(5, -R - 8, 2, -R - 13); ctx.stroke();
      const f = 0.6 + Math.sin(t * 25) * 0.4;
      ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(2, -R - 14, 3 + f * 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(2, -R - 14, 1.5 + f, 0, TAU); ctx.fill();
    });
  };

  // ── 量角器 ──
  Art.protractor = function (x, y, shown, base) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(0, 0, 50, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(43,35,64,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 50, 0, TAU); ctx.stroke();
    for (let d = 0; d < 360; d += 5) {
      const big = d % 90 === 0, mid = d % 15 === 0, q = base - d * Math.PI / 180;
      const r1 = big ? 38 : mid ? 42 : 46;
      ctx.strokeStyle = big ? 'rgba(43,35,64,.6)' : mid ? 'rgba(43,35,64,.35)' : 'rgba(43,35,64,.18)'; ctx.lineWidth = big ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(Math.cos(q) * r1, Math.sin(q) * r1); ctx.lineTo(Math.cos(q) * 50, Math.sin(q) * 50); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(239,75,63,.7)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 56, base, base - shown * Math.PI / 180, true); ctx.stroke();
    ctx.restore();
    for (const d of [0, 90, 180, 270]) {
      const q = base - d * Math.PI / 180;
      upright(x + Math.cos(q) * 66, y + Math.sin(q) * 66, () => { ctx.font = '800 10px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.strokeText(d + '°', 0, 0); ctx.fillStyle = 'rgba(43,35,64,.75)'; ctx.fillText(d + '°', 0, 0); });
    }
  };

  // ── 漫畫字（砰！轟！）──
  Art.comic = function (x, y, text, k, color) {
    upright(x, y, () => {
      const sc = k < 0.2 ? k / 0.2 * 1.25 : 1.25 - (k - 0.2) * 0.3;
      ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      ctx.translate(0, -k * 26); ctx.scale(sc, sc); ctx.rotate(-0.12);
      ctx.font = '900 22px "PingFang TC","Noto Sans TC",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = '#2b2340'; ctx.strokeText(text, 0, 0);
      ctx.fillStyle = color || '#ffd34d'; ctx.fillText(text, 0, 0);
      ctx.globalAlpha = 1;
    });
  };


  // ── 傳送門：旋轉的光圈，一對同顏色 ──
  Art.portal = function (x, y, color, t, side) {
    const R = C.PORTAL_R;
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 1.3);
    g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55 + Math.sin(t * 3 + side) * 0.1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.3, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, TAU); ctx.fill();
    for (let k = 0; k < 3; k++) {          // 往裡面捲的漩渦
      ctx.save(); ctx.rotate(t * (side ? -2.2 : 2.2) + k * TAU / 3);
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
      ctx.beginPath(); for (let q = 0; q <= 20; q++) { const a = q / 20 * 2.4, r = R * 0.68 * (1 - q / 24); const px = Math.cos(a) * r, py = Math.sin(a) * r; q ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([5, 6]); ctx.lineDashOffset = t * 20;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    for (let k = 0; k < 6; k++) {          // 繞著轉的小光點
      const a = t * 1.6 + k * TAU / 6; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05, 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  // ── 會滑動的牆：有箭頭紋路的方塊；ghost = 下一回合的位置（虛線框）──
  Art.mover = function (b, key, kind) {
    const [x, y, w, h] = b;
    ctx.fillStyle = 'rgba(20,10,30,.25)'; rr(ctx, x + 6, y + 8, w, h, 6); ctx.fill();
    const base = kind === 'soft' ? ['#b393ff', '#7f4fe6', '#5a2fc0'] : key === 'ice' ? ['#9fe0ff', '#4aa8dc', '#2a6f9e'] : key === 'factory' ? ['#ffcf5a', '#e0a020', '#8a5c00'] : key === 'castle' ? ['#a88bd8', '#6c4fa8', '#3a2668'] : ['#9fd88a', '#5aa846', '#336a26'];
    const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, base[0]); g.addColorStop(1, base[1]);
    ctx.fillStyle = g; rr(ctx, x, y, w, h, 6); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = base[2]; ctx.stroke();
    ctx.save(); rr(ctx, x, y, w, h, 6); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const horiz = w >= h;
    for (let k = -1; k <= 1; k++) {          // 雙向箭頭：表示會滑動
      ctx.beginPath();
      if (horiz) { const cx = x + w / 2 + k * 26; ctx.moveTo(cx - 5, y + h / 2 - 6); ctx.lineTo(cx + 2, y + h / 2); ctx.lineTo(cx - 5, y + h / 2 + 6); }
      else { const cy = y + h / 2 + k * 26; ctx.moveTo(x + w / 2 - 6, cy - 5); ctx.lineTo(x + w / 2, cy + 2); ctx.lineTo(x + w / 2 + 6, cy - 5); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y, w, 3);
    ctx.restore();
    ctx.fillStyle = base[2];
    for (const [rx, ry] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) { ctx.beginPath(); ctx.arc(rx, ry, 2.4, 0, TAU); ctx.fill(); }
  };
  Art.moverGhost = function (b) {
    const [x, y, w, h] = b;
    ctx.save(); ctx.setLineDash([7, 6]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(43,35,64,.45)'; ctx.fillStyle = 'rgba(255,255,255,.18)';
    rr(ctx, x, y, w, h, 6); ctx.fill(); ctx.stroke(); ctx.restore();
  };
  // 走路怪下一步會走到哪：腳印＋虛線
  Art.walkGhost = function (to, from) {
    if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 2) return;
    ctx.save(); ctx.setLineDash([4, 7]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(43,35,64,.4)';
    ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(43,35,64,.2)'; ctx.strokeStyle = 'rgba(43,35,64,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(to[0], to[1], C.ENEMY_R, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
    upright(to[0], to[1], () => { ctx.fillStyle = 'rgba(43,35,64,.5)'; for (const [fx, fy] of [[-5, -3], [5, 4]]) { ctx.beginPath(); ctx.ellipse(fx, fy, 3, 4.5, 0, 0, TAU); ctx.fill(); } });
  };

  // ── 冰晶玻璃：半透明、有切面和閃光 ──
  Art.glass = function (b, t) {
    const [x, y, w, h] = b;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(ctx, x, y, w, h, 3); ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(200,245,255,.55)'); g.addColorStop(0.5, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(190,235,255,.55)');
    ctx.fillStyle = g; rr(ctx, x, y, w, h, 3); ctx.fill();
    ctx.setLineDash([6, 4]); ctx.lineWidth = 2.5; ctx.strokeStyle = '#33b5e5'; ctx.stroke(); ctx.setLineDash([]);
    ctx.clip();
    // 裂痕（一看就知道打得破）
    ctx.strokeStyle = 'rgba(40,110,160,.55)'; ctx.lineWidth = 1.3;
    const L = Math.max(w, h), n = Math.max(1, Math.round(L / 70));
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const cx = w > h ? x + u * w : x + w / 2, cy = w > h ? y + h / 2 : y + u * h;
      for (const a of [0.5, 2.1, 3.6, 5]) {
        ctx.beginPath(); ctx.moveTo(cx, cy);
        const r1 = Math.min(w, h) * 0.45 + 6;
        ctx.lineTo(cx + Math.cos(a) * r1 * 0.5, cy + Math.sin(a) * r1 * 0.5 + 2); ctx.lineTo(cx + Math.cos(a + 0.3) * r1, cy + Math.sin(a + 0.3) * r1);
        ctx.stroke();
      }
    }
    const sp = (t * 0.25) % 1.6 - 0.3;                                   // 一道光掃過去
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    if (w > h) { const sx = x + sp * w; ctx.moveTo(sx, y); ctx.lineTo(sx + 12, y); ctx.lineTo(sx + 2, y + h); ctx.lineTo(sx - 10, y + h); }
    else { const sy = y + sp * h; ctx.moveTo(x, sy); ctx.lineTo(x, sy + 12); ctx.lineTo(x + w, sy + 2); ctx.lineTo(x + w, sy - 10); }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    star4(ctx, x + w * 0.25, y + h * 0.2, 3.5 + Math.sin(t * 4) * 1.5);
    star4(ctx, x + w * 0.7, y + h * 0.75, 3 + Math.cos(t * 3) * 1.2);
  };

  // ── 被抓住的小雪兔（人質）：綁著繩子，頭上冒「救命」──
  Art.hostage = function (x, y, st) {
    const R = C.HOSTAGE_R, t = st.t, hurt = st.hurt >= 0;
    upright(x, y, () => {
      ctx.fillStyle = 'rgba(30,20,40,.25)'; ctx.beginPath(); ctx.ellipse(0, R * 0.9, R, R * 0.32, 0, 0, TAU); ctx.fill();
      const hop = st.happy ? -Math.abs(Math.sin(t * 8)) * 10 : st.scared ? Math.sin(t * 40) * 1.5 : 0;
      ctx.translate(st.scared ? hop : 0, st.happy ? hop : 0);
      // 耳朵
      for (const sd of [-1, 1]) {
        ctx.save(); ctx.translate(sd * 7, -R * 0.7); ctx.rotate(sd * (0.18 + Math.sin(t * 2 + sd) * 0.06));
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c9c3d6'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -12, 6, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffc2d8'; ctx.beginPath(); ctx.ellipse(0, -12, 3, 10, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = hurt ? '#ffd6d6' : '#ffffff'; ctx.strokeStyle = '#c9c3d6'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.92, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,150,180,.5)'; ctx.beginPath(); ctx.arc(-9, 3, 3.5, 0, TAU); ctx.arc(9, 3, 3.5, 0, TAU); ctx.fill();
      // 眼睛
      ctx.fillStyle = '#2b2340';
      if (hurt) { ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 6 - 3, -6); ctx.lineTo(sd * 6 + 3, -1); ctx.moveTo(sd * 6 + 3, -6); ctx.lineTo(sd * 6 - 3, -1); ctx.stroke(); } }
      else if (st.happy) { ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2.2; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 6, -3, 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
      else {
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 6, -4, 3, 3.8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sd * 6 + 1, -5, 1.1, 0, TAU); ctx.fill(); ctx.fillStyle = '#2b2340'; }
        ctx.fillStyle = 'rgba(120,200,255,.9)'; ctx.beginPath(); ctx.arc(-6, 1 + (t * 2 % 1) * 6, 1.6, 0, TAU); ctx.fill();   // 眼淚
      }
      ctx.fillStyle = '#ff8fb0'; ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(2, 2); ctx.lineTo(0, 4.5); ctx.closePath(); ctx.fill();
      // 繩子
      if (!st.happy) {
        ctx.strokeStyle = '#b8864a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-R * 0.98, 6); ctx.quadraticCurveTo(0, 12, R * 0.98, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-R * 0.9, 11); ctx.quadraticCurveTo(0, 17, R * 0.9, 11); ctx.stroke();
        ctx.fillStyle = '#8a5a32'; ctx.beginPath(); ctx.arc(R * 0.6, 12, 3, 0, TAU); ctx.fill();
      }
      // 「救命」泡泡（一陣一陣出現）
      const ph = (t % 4) / 4;
      if (!st.happy && !hurt && ph < 0.45) {
        const a = ph < 0.08 ? ph / 0.08 : ph > 0.37 ? (0.45 - ph) / 0.08 : 1;
        ctx.globalAlpha = a; ctx.translate(16, -R - 24);
        ctx.fillStyle = '#fff'; rr(ctx, -20, -11, 40, 20, 9); ctx.fill(); ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, 9); ctx.lineTo(-16, 16); ctx.lineTo(-4, 9); ctx.fill();
        ctx.fillStyle = '#e8473c'; ctx.font = '900 11px "PingFang TC","Noto Sans TC",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('救命！', 0, -1);
        ctx.globalAlpha = 1;
      }
    });
  };

  root.RicoArt = Art;
})(window);
