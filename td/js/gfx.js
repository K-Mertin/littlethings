'use strict';
// 守塔奇兵：繪圖基礎工具——顏色、雜訊、離屏畫布快取、外框、柔光貼圖。
// 所有美術都用程式畫，沒有任何圖檔；畫好的東西會快取成離屏畫布，每幀只要 drawImage。

const Gfx = (() => {
  const TAU = Math.PI * 2;
  // ───────── 顏色 ─────────
  const _hex = {};
  function hex(c) {
    if (_hex[c]) return _hex[c];
    let h = c.replace('#', '');
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h, 16);
    return (_hex[c] = [n >> 16 & 255, n >> 8 & 255, n & 255]);
  }
  const _mix = new Map();
  function mix(a, b, t) {
    const key = a + b + Math.round(t * 40);
    let r = _mix.get(key);
    if (r) return r;
    const A = hex(a), B = hex(b);
    const q = Math.round(t * 40) / 40;
    r = '#' + A.map((v, i) => Math.round(v + (B[i] - v) * q).toString(16).padStart(2, '0')).join('');
    _mix.set(key, r);
    return r;
  }
  const shade = (c, t) => t > 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t);
  const _rgba = new Map();
  function rgba(c, a) {
    const key = c + '|' + Math.round(a * 100);
    let r = _rgba.get(key);
    if (r) return r;
    const A = hex(c);
    r = `rgba(${A[0]},${A[1]},${A[2]},${Math.round(a * 100) / 100})`;
    _rgba.set(key, r);
    return r;
  }

  // ───────── 雜訊 ─────────
  function hash2(x, y, seed) {
    let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, seed, oct) {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < (oct || 4); i++) { s += vnoise(x * f, y * f, seed + i * 17) * amp; n += amp; amp *= 0.5; f *= 2.03; }
    return s / n;
  }

  // ───────── 畫布 ─────────
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  // 在 CPU 上畫的畫布（willReadFrequently）：做外框時要讀像素，用這種就不必從顯示卡拷回來，快很多
  function cpu(w, h) { return canvas(w, h); }
  // 快取精靈：w,h 是 CSS 像素，ax,ay 是錨點（通常是腳底中心），draw(ctx) 以錨點為原點作畫
  const cache = new Map();
  let cacheCount = 0;
  function sprite(key, w, h, ax, ay, dpr, draw, outline, bev) {
    const k = key + '@' + dpr;
    let sp = cache.get(k);
    if (sp) return sp;
    const pad = outline ? Math.ceil(outline + 1) : 0;
    const c = canvas((w + pad * 2) * dpr, (h + pad * 2) * dpr);
    const x = c.getContext('2d');
    x.scale(dpr, dpr); x.translate(ax + pad, ay + pad);
    drawScale = dpr; draw(x); drawScale = 0;
    let out = c;
    if (bev) out = bevel(c, Math.max(1, bev * dpr));
    if (outline) out = addOutline(out, outline * dpr, 'rgba(28,18,36,.82)');
    sp = { c: out, w: w + pad * 2, h: h + pad * 2, ax: ax + pad, ay: ay + pad };
    cache.set(k, sp); cacheCount++;
    if (cacheCount > 6000) { cache.clear(); cacheCount = 0; }
    return sp;
  }
  // 角色用的精靈：先在 ss 倍大的暫存畫布上畫（細節更清楚），再縮小存成快取，最後加外框。
  // 縮小後的大小和一般精靈一樣，所以記憶體、每幀貼圖的成本都不變。
  // 每幀畫新圖花的時間記在 stat.ms，呼叫端可以用 busy() 判斷這一幀是不是已經花太多時間，改用備用圖。
  const stat = { ms: 0, n: 0, est: 8 };
  // 正在畫的快取圖「每個 CSS 像素 = 幾個暫存畫布像素」（dpr × 超取樣倍率）；不在快取繪製中時是 0。
  // 讓描線可以依照「最後顯示在畫面上幾個像素」決定粗細，而不是跟著角色尺寸一起變粗。
  let drawScale = 0;
  let scr = null;
  function has(key, dpr) { return cache.has(key + '@' + dpr); }
  function sheet(key, w, h, ax, ay, dpr, draw, o) {
    const k = key + '@' + dpr;
    let sp = cache.get(k);
    if (sp) return sp;
    const t0 = performance.now();
    o = o || {};
    const pad = o.outline ? Math.ceil(o.outline + 1) : 1;
    const ss = o.ss || 1;
    const W = Math.max(1, Math.ceil((w + pad * 2) * dpr)), H = Math.max(1, Math.ceil((h + pad * 2) * dpr));
    let c = cpu(W, H);
    const cx = c.getContext('2d');
    if (ss > 1) {
      const SW = Math.ceil(W * ss), SH = Math.ceil(H * ss);
      // 每張圖用剛好大小的暫存畫布（重複用一張大畫布反而會讓瀏覽器每次都整張複製）
      scr = cpu(SW, SH);
      const sx = scr.getContext('2d');
      sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, SW + 2, SH + 2);
      sx.setTransform(dpr * ss, 0, 0, dpr * ss, (ax + pad) * dpr * ss, (ay + pad) * dpr * ss);
      drawScale = dpr * ss; sx.save(); draw(sx); sx.restore(); drawScale = 0;
      cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'low';
      cx.drawImage(scr, 0, 0, SW, SH, 0, 0, W, H); scr = null;
    } else {
      cx.setTransform(dpr, 0, 0, dpr, (ax + pad) * dpr, (ay + pad) * dpr);
      drawScale = dpr; draw(cx); drawScale = 0;
    }
    if (o.outline) c = softEdge(c, o.outline * dpr, o.edge);
    sp = { c, w: W / dpr, h: H / dpr, ax: ax + pad, ay: ay + pad, key: k };
    cache.set(k, sp); cacheCount++;
    if (cacheCount > 6000) { cache.clear(); cacheCount = 0; }
    const dt = performance.now() - t0; stat.ms += dt; stat.n++; stat.est += (dt - stat.est) * 0.25;
    return sp;
  }
  function frameStart() { stat.ms = 0; stat.n = 0; }
  function busy(lim) { return stat.ms > (lim || 6); }
  function drawSprite(ctx, sp, x, y, sc) {
    sc = sc || 1;
    ctx.drawImage(sp.c, x - sp.ax * sc, y - sp.ay * sc, sp.w * sc, sp.h * sc);
  }
  // 幫畫好的圖加一圈深色外框（漫畫風）
  function addOutline(src, px, color, onCpu) {
    const w = src.width, h = src.height;
    const mk = onCpu ? cpu : canvas;
    const sil = mk(w, h), sx = sil.getContext('2d');
    sx.drawImage(src, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = color; sx.fillRect(0, 0, w, h);
    // 半透明的光暈不要描邊（只描實心的部分）
    try {
      const im = sx.getImageData(0, 0, w, h), d = im.data;
      for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 110 ? 0 : 255;
      sx.putImageData(im, 0, 0);
    } catch (e) { /* 讀不到像素就照舊 */ }
    const out = mk(w, h), o = out.getContext('2d');
    const n = px > 2.5 ? 12 : 8;
    for (let i = 0; i < n; i++) { const a = i / n * TAU; o.drawImage(sil, Math.cos(a) * px, Math.sin(a) * px); }
    o.drawImage(src, 0, 0);
    return out;
  }
  // 柔和外框：只描整體剪影的最外圈，顏色取「該處本身顏色壓暗」（紅衣服描深紅、綠皮膚描深綠），
  // 不再是一圈接近黑色的粗框；半透明邊緣保留反鋸齒，光暈類的淡色不描。
  // px：外框寬度（暫存畫布像素，約等於畫面上 1 個 CSS 像素）；o.k 保留本色的比例（越小越暗）、o.a 外框不透明度
  const EDGE_T = [34, 18, 44];
  function softEdge(src, px, o) {
    o = o || {};
    const w = src.width, h = src.height, k = o.k == null ? 0.33 : o.k, ea = o.a == null ? 0.92 : o.a;
    const sil = cpu(w, h), sx = sil.getContext('2d');
    sx.drawImage(src, 0, 0);
    try {
      const im = sx.getImageData(0, 0, w, h), d = im.data, k1 = 1 - k;
      const tr = EDGE_T[0] * k1, tg = EDGE_T[1] * k1, tb = EDGE_T[2] * k1;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3];
        if (a < 40) { d[i + 3] = 0; continue; }
        d[i] = d[i] * k + tr; d[i + 1] = d[i + 1] * k + tg; d[i + 2] = d[i + 2] * k + tb;
        d[i + 3] = a > 150 ? 255 * ea : (a - 40) / 110 * 255 * ea;
      }
      sx.putImageData(im, 0, 0);
    } catch (e) { sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(40,22,48,.85)'; sx.fillRect(0, 0, w, h); }
    const out = cpu(w, h), q = out.getContext('2d');
    const n = px > 2.2 ? 12 : 8;
    for (let i = 0; i < n; i++) { const a = i / n * TAU; q.drawImage(sil, Math.cos(a) * px, Math.sin(a) * px); }
    q.drawImage(src, 0, 0);
    return out;
  }
  // 立體感：用自身輪廓位移做出「左上亮邊、右下暗邊」＋由上往下的明暗，讓所有角色都有一致的三階光影
  function bevel(src, px, opts) {
    opts = opts || {};
    const w = src.width, h = src.height;
    const out = canvas(w, h), o = out.getContext('2d');
    o.drawImage(src, 0, 0);
    const tmp = canvas(w, h), t = tmp.getContext('2d');
    // 亮邊：輪廓 減去 往右下位移的輪廓
    const rim = (dx, dy, col, a) => {
      t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, w, h);
      t.drawImage(src, 0, 0);
      t.globalCompositeOperation = 'destination-out'; t.drawImage(src, dx, dy);
      t.globalCompositeOperation = 'source-in'; t.fillStyle = col; t.fillRect(0, 0, w, h);
      o.globalAlpha = a; o.globalCompositeOperation = 'source-atop'; o.drawImage(tmp, 0, 0);
      o.globalAlpha = 1;
    };
    rim(px, px, '#fffbe8', opts.hi || 0.5);
    rim(-px * 0.8, -px * 0.8, '#1a0e24', opts.lo || 0.38);
    // 整體由上往下的光（上亮下暗）
    o.globalCompositeOperation = 'source-atop';
    const g = o.createLinearGradient(0, 0, w * 0.35, h);
    g.addColorStop(0, 'rgba(255,250,230,.16)'); g.addColorStop(0.45, 'rgba(255,250,230,0)'); g.addColorStop(0.75, 'rgba(20,10,40,0)'); g.addColorStop(1, 'rgba(20,10,40,.22)');
    o.fillStyle = g; o.fillRect(0, 0, w, h);
    o.globalCompositeOperation = 'source-over';
    return out;
  }
  // 把精靈染成單色（受傷閃白、冰凍染藍）
  function tinted(sp, key, color, alpha) {
    const k = key;
    let t = cache.get(k);
    if (t) return t;
    const c = canvas(sp.c.width, sp.c.height), x = c.getContext('2d');
    x.drawImage(sp.c, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = alpha; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    t = { c, w: sp.w, h: sp.h, ax: sp.ax, ay: sp.ay };
    cache.set(k, t); cacheCount++;
    return t;
  }
  // 柔光圓點（給煙、光暈、火焰用），依顏色快取
  const glows = {};
  function glow(color, hard) {
    const k = color + (hard ? 'h' : '');
    if (glows[k]) return glows[k];
    const S = 64, c = canvas(S, S), x = c.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    const A = hex(color);
    const cs = (a) => `rgba(${A[0]},${A[1]},${A[2]},${a})`;
    if (hard) { g.addColorStop(0, cs(1)); g.addColorStop(0.55, cs(0.9)); g.addColorStop(0.8, cs(0.35)); g.addColorStop(1, cs(0)); }
    else { g.addColorStop(0, cs(1)); g.addColorStop(0.25, cs(0.7)); g.addColorStop(0.6, cs(0.2)); g.addColorStop(1, cs(0)); }
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return (glows[k] = c);
  }
  // 軟煙團（不規則的雲狀）
  const puffs = {};
  function puff(color) {
    if (puffs[color]) return puffs[color];
    const S = 64, c = canvas(S, S), x = c.getContext('2d');
    const r = mkRng(color.length * 31 + 7);
    for (let i = 0; i < 7; i++) {
      const px = S / 2 + (r() - 0.5) * S * 0.36, py = S / 2 + (r() - 0.5) * S * 0.3, rr = S * (0.16 + r() * 0.12);
      const g = x.createRadialGradient(px - rr * 0.3, py - rr * 0.3, 0, px, py, rr);
      g.addColorStop(0, shade(color, 0.25)); g.addColorStop(0.7, color); g.addColorStop(1, rgba(color, 0));
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill();
    }
    return (puffs[color] = c);
  }

  // ───────── 小工具 ─────────
  function ell(ctx, x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); ctx.fill(); }
  function circ(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); ctx.fill(); }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function poly(ctx, pts, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); }
  function star(ctx, x, y, r, c, line) {
    ctx.fillStyle = c; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    if (line !== false) { ctx.strokeStyle = 'rgba(80,50,0,.55)'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.stroke(); }
  }
  function lgrad(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => g.addColorStop(Array.isArray(c) ? c[0] : i / (stops.length - 1), Array.isArray(c) ? c[1] : c));
    return g;
  }
  function rgrad(ctx, x, y, r0, r1, stops, ox, oy) {
    const g = ctx.createRadialGradient(x + (ox || 0), y + (oy || 0), r0, x, y, r1);
    stops.forEach((c, i) => g.addColorStop(Array.isArray(c) ? c[0] : i / (stops.length - 1), Array.isArray(c) ? c[1] : c));
    return g;
  }
  return { TAU, hex, mix, shade, rgba, vnoise, fbm, hash2, canvas, sprite, sheet, has, stat, frameStart, busy, drawSprite, addOutline, softEdge, get drawScale() { return drawScale; }, bevel, tinted, glow, puff, ell, circ, rrect, poly, star, lgrad, rgrad, clear() { cache.clear(); cacheCount = 0; } };
})();
