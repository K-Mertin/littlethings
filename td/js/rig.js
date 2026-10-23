'use strict';
// 守塔奇兵：角色繪製工具（第三版角色共用）。
// 每個部位是一條 Path2D：先塗本色，再在部位內用「自身形狀位移」做出
// 亮部、暗部（色偏紫的 multiply）、底部環境遮蔽、背光輪廓光，最後描深色邊。
// 角色由頭、身體、四肢、武器等獨立部位組成，動畫時各自轉動，所以是真正的姿勢而不只是上下晃。

const Rig = (() => {
  const { TAU, shade, mix, rgba } = Gfx;
  const OUT = '#1d1024';
  // 光從左上方來（指向光源的方向）
  const LX = -0.48, LY = -0.88;
  const BIG = new Path2D(); BIG.rect(-1e4, -1e4, 2e4, 2e4);
  const MT = (dx, dy) => new DOMMatrix([1, 0, 0, 1, dx, dy]);
  function band(x, p, dx, dy) { const q = new Path2D(BIG); q.addPath(p, MT(dx, dy)); x.fill(q, 'evenodd'); }

  // ───────── 材質 ─────────
  // 由一個本色推出整套色階；暗部偏冷紫、亮部偏暖黃，看起來比較有畫的感覺
  const mats = new Map();
  function mat(c, o) {
    const key = c + (o ? JSON.stringify(o) : '');
    let m = mats.get(key);
    if (m) return m;
    o = o || {};
    m = {
      c,
      shM: mix('#ffffff', o.shc || '#55387e', Math.min(0.75, (o.sh || 0.46) * 1.18)),   // multiply 用的暗部色
      aoM: mix('#ffffff', '#2c1640', o.ao || 0.42),
      hi: rgba(mix(c, o.hic || '#fff8e4', 0.66), o.hia || 0.72),
      rim: rgba(o.rimc || '#d8f0ff', o.rima == null ? 0.58 : o.rima),
      line: o.line || OUT,
      gloss: o.gloss || 0,
      lt: mix(c, '#fff8e4', 0.35), dk: mix(c, '#2a1638', 0.45), dd: mix(c, '#1a0c24', 0.68),
    };
    mats.set(key, m);
    return m;
  }

  // ───────── 路徑 ─────────
  const P = {
    ell(cx, cy, rx, ry, rot) { const p = new Path2D(); p.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); return p; },
    circ(cx, cy, r) { const p = new Path2D(); p.arc(cx, cy, Math.max(0.1, r), 0, TAU); return p; },
    rr(x0, y0, w, h, r) { const p = new Path2D(); if (p.roundRect) p.roundRect(x0, y0, w, h, r); else p.rect(x0, y0, w, h); return p; },
    poly(pts) { const p = new Path2D(); p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath(); return p; },
    // 漸細的膠囊（四肢、尾巴）
    cap(x0, y0, x1, y1, r0, r1) {
      const p = new Path2D(), a = Math.atan2(y1 - y0, x1 - x0);
      p.arc(x0, y0, Math.max(0.1, r0), a + Math.PI / 2, a + Math.PI * 1.5);
      p.arc(x1, y1, Math.max(0.1, r1), a - Math.PI / 2, a + Math.PI / 2);
      p.closePath(); return p;
    },
    // 經過一串點的平滑封閉曲線（Catmull-Rom）：有機形狀用
    blob(pts, tension) {
      const n = pts.length / 2, p = new Path2D(), k = (tension == null ? 1 : tension) / 6;
      const X = i => pts[((i % n) + n) % n * 2], Y = i => pts[((i % n) + n) % n * 2 + 1];
      p.moveTo(X(0), Y(0));
      for (let i = 0; i < n; i++) {
        p.bezierCurveTo(X(i) + (X(i + 1) - X(i - 1)) * k, Y(i) + (Y(i + 1) - Y(i - 1)) * k, X(i + 1) - (X(i + 2) - X(i)) * k, Y(i + 1) - (Y(i + 2) - Y(i)) * k, X(i + 1), Y(i + 1));
      }
      p.closePath(); return p;
    },
    // 開放的平滑曲線（不封閉）
    curve(pts) {
      const n = pts.length / 2, p = new Path2D();
      const X = i => pts[Math.max(0, Math.min(n - 1, i)) * 2], Y = i => pts[Math.max(0, Math.min(n - 1, i)) * 2 + 1];
      p.moveTo(X(0), Y(0));
      for (let i = 0; i < n - 1; i++) p.bezierCurveTo(X(i) + (X(i + 1) - X(i - 1)) / 6, Y(i) + (Y(i + 1) - Y(i - 1)) / 6, X(i + 1) - (X(i + 2) - X(i)) / 6, Y(i + 1) - (Y(i + 2) - Y(i)) / 6, X(i + 1), Y(i + 1));
      return p;
    },
    fn(cb) { const p = new Path2D(); cb(p); return p; },
  };

  // ───────── 上色 ─────────
  // part(x, 路徑, 材質, 中心x, 中心y, 尺寸, 選項)
  // 選項：tex(x) 部位內的紋理、lw 線寬、noLine、sd 暗部寬、hd 亮部寬、flat（只描邊不打光）、gloss 高光、glow
  function part(x, p, m, cx, cy, sz, o) {
    o = o || {};
    if (typeof m === 'string') m = mat(m);
    x.fillStyle = o.fill || m.c; x.fill(p);
    x.save(); x.clip(p);
    if (o.tex) o.tex(x);
    if (!o.flat) {
      // 柔和的整體光（左上亮、右下暗）
      const g = x.createRadialGradient(cx + LX * sz * 0.55, cy + LY * sz * 0.55, sz * 0.1, cx, cy, sz * 1.7);
      g.addColorStop(0, 'rgba(255,248,228,.2)'); g.addColorStop(0.5, 'rgba(255,248,228,0)'); g.addColorStop(1, 'rgba(36,14,54,.16)');
      x.fillStyle = g; x.fillRect(cx - sz * 2, cy - sz * 2, sz * 4, sz * 4);
      x.globalCompositeOperation = 'multiply';
      const d = sz * (o.sd || 0.36);
      x.fillStyle = m.shM; band(x, p, LX * d, LY * d);
      // 底部的環境遮蔽
      if (o.ao !== false) { x.fillStyle = m.aoM; band(x, p, 0, -sz * (o.aod || 0.13)); }
      x.globalCompositeOperation = 'source-over';
      const h = sz * (o.hd || 0.2);
      x.fillStyle = m.hi; band(x, p, -LX * h, -LY * h);
      // 背光輪廓光（右側細細一條）
      if (o.rim !== false) { const r = sz * (o.rd || 0.07); x.fillStyle = m.rim; band(x, p, -r, r * 0.35); }
      const gl = o.gloss != null ? o.gloss : m.gloss;
      if (gl) {
        x.fillStyle = `rgba(255,255,255,${0.75 * gl})`;
        x.beginPath(); x.ellipse(cx + LX * sz * 0.48, cy + LY * sz * 0.42, sz * 0.22, sz * 0.1, -0.55, 0, TAU); x.fill();
        x.fillStyle = `rgba(255,255,255,${0.9 * gl})`; x.beginPath(); x.arc(cx + LX * sz * 0.2, cy + LY * sz * 0.58, sz * 0.05, 0, TAU); x.fill();
      }
    }
    if (o.post) o.post(x);
    x.restore();
    if (!o.noLine) { x.lineJoin = 'round'; x.strokeStyle = o.lc || m.line; x.lineWidth = o.lw || sz * 0.09; x.stroke(p); }
  }
  // 只描線（細節線、皺褶）
  function line(x, p, c, w, cap) { x.lineCap = cap || 'round'; x.lineJoin = 'round'; x.strokeStyle = c; x.lineWidth = w; x.stroke(p); x.lineCap = 'butt'; }
  function seg(x, x0, y0, x1, y1, c, w) { x.lineCap = 'round'; x.strokeStyle = c; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.lineCap = 'butt'; }
  // 柔和的遮蔽陰影（畫在某個部位上，被 clip 在 clipP 內）
  function ao(x, clipP, cx, cy, rx, ry, a) {
    x.save(); if (clipP) x.clip(clipP);
    x.globalCompositeOperation = 'multiply';
    x.translate(cx, cy); x.scale(1, ry / rx);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(60,30,80,${a || 0.45})`); g.addColorStop(1, 'rgba(60,30,80,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill();
    x.restore();
  }
  // 發光（符文、眼睛、寶石），快取時才畫所以可以用 shadowBlur
  function glow(x, draw, col, blur) { x.save(); x.shadowColor = col; x.shadowBlur = blur; draw(); x.restore(); }
  function halo(x, cx, cy, r, col, a) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(col, a == null ? 0.6 : a)); g.addColorStop(0.45, rgba(col, (a == null ? 0.6 : a) * 0.35)); g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  }

  // ───────── 紋理 ─────────
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  // 斑點（石頭、皮膚）
  function speckle(x, cx, cy, w, h, n, cols, rmin, rmax, seed) {
    const r = rng(seed || 7);
    for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; x.beginPath(); x.arc(cx + (r() - 0.5) * w, cy + (r() - 0.5) * h, rmin + r() * (rmax - rmin), 0, TAU); x.fill(); }
  }
  // 毛：一撮一撮的短弧線
  function fur(x, cx, cy, w, h, n, col, len, ang, lw, seed) {
    const r = rng(seed || 3);
    x.strokeStyle = col; x.lineWidth = lw; x.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const px = cx + (r() - 0.5) * w, py = cy + (r() - 0.5) * h, a = ang + (r() - 0.5) * 0.6, l = len * (0.6 + r() * 0.6);
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + Math.sin(a) * l * 0.2, py + Math.sin(a) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    x.lineCap = 'butt';
  }
  // 鱗片：一排排小弧
  function scales(x, x0, y0, w, h, s, col, lw) {
    x.strokeStyle = col; x.lineWidth = lw;
    for (let j = 0, y = y0; y < y0 + h; j++, y += s * 0.62) for (let xx = x0 + (j % 2) * s * 0.5; xx < x0 + w; xx += s) { x.beginPath(); x.arc(xx, y, s * 0.5, 0.15, Math.PI - 0.15); x.stroke(); }
  }
  // 金屬的條狀反光
  function sheen(x, x0, y0, x1, y1, w, a) {
    x.save(); x.globalCompositeOperation = 'screen'; x.strokeStyle = `rgba(255,255,255,${a || 0.55})`; x.lineWidth = w; x.lineCap = 'round';
    x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.restore();
  }

  // ───────── 臉 ─────────
  // eye(x, 中心, 半徑, { iris, look:[dx,dy], mood, lid, glow, white })
  // mood：n 普通、angry 生氣、shut 緊閉（><）、x 死掉、happy 笑瞇、wide 驚嚇、sleep 半閉、glow 只有發光的眼睛
  function eye(x, cx, cy, r, o) {
    o = o || {};
    const mood = o.mood || 'n', lk = o.look || [0.25, 0.1], dir = o.dir || 1;
    const lw = Math.max(0.6, r * 0.2);
    x.lineCap = 'round'; x.lineJoin = 'round';
    if (mood === 'shut') { x.strokeStyle = o.lc || OUT; x.lineWidth = lw * 1.3; x.beginPath(); x.moveTo(cx - r * 0.7 * dir, cy - r * 0.55); x.lineTo(cx + r * 0.55 * dir, cy); x.lineTo(cx - r * 0.7 * dir, cy + r * 0.55); x.stroke(); x.lineCap = 'butt'; return; }
    if (mood === 'x') { x.strokeStyle = o.lc || OUT; x.lineWidth = lw * 1.3; x.beginPath(); x.moveTo(cx - r * 0.6, cy - r * 0.6); x.lineTo(cx + r * 0.6, cy + r * 0.6); x.moveTo(cx + r * 0.6, cy - r * 0.6); x.lineTo(cx - r * 0.6, cy + r * 0.6); x.stroke(); x.lineCap = 'butt'; return; }
    if (mood === 'happy') { x.strokeStyle = o.lc || OUT; x.lineWidth = lw * 1.3; x.beginPath(); x.arc(cx, cy + r * 0.3, r * 0.65, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); x.lineCap = 'butt'; return; }
    if (mood === 'glow') {
      glow(x, () => { x.fillStyle = o.iris || '#ff5a4a'; x.beginPath(); x.ellipse(cx, cy, r * 0.75, r * (o.sq || 0.6), 0, 0, TAU); x.fill(); }, o.iris || '#ff5a4a', r * 1.6);
      x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx + r * 0.1 * dir, cy - r * 0.05, r * 0.32, r * 0.24, 0, 0, TAU); x.fill(); x.lineCap = 'butt'; return;
    }
    const ry = r * (mood === 'wide' ? 1.12 : 1), rx = r * 0.84;
    const ep = new Path2D(); ep.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    x.save(); x.clip(ep);
    x.fillStyle = o.white || '#ffffff'; x.fill(ep);
    const g = x.createLinearGradient(0, cy - ry, 0, cy + ry); g.addColorStop(0, 'rgba(120,110,160,.35)'); g.addColorStop(0.35, 'rgba(120,110,160,0)'); x.fillStyle = g; x.fill(ep);
    const ix = cx + rx * lk[0] * dir, iy = cy + ry * lk[1], ir = r * (mood === 'wide' ? 0.46 : 0.62), ic = o.iris || '#4a3060';
    const ig = x.createRadialGradient(ix, iy - ir * 0.4, ir * 0.1, ix, iy, ir * 1.05);
    ig.addColorStop(0, mix(ic, '#ffffff', 0.45)); ig.addColorStop(0.55, ic); ig.addColorStop(1, mix(ic, '#000000', 0.55));
    x.fillStyle = ig; x.beginPath(); x.arc(ix, iy, ir, 0, TAU); x.fill();
    x.fillStyle = '#0e0814'; x.beginPath(); x.ellipse(ix + ir * 0.05 * dir, iy + ir * 0.05, ir * (o.slit ? 0.2 : 0.48), ir * (o.slit ? 0.8 : 0.52), 0, 0, TAU); x.fill();
    // 上眼皮
    const lid = mood === 'angry' ? 0.32 : mood === 'sleep' ? 0.55 : mood === 'sad' ? 0.25 : (o.lid || 0);
    if (lid > 0) {
      x.fillStyle = o.lidc || '#2a1830';
      x.beginPath();
      if (mood === 'angry') { x.moveTo(cx - rx * 1.2 * dir, cy - ry * (1 - lid * 0.8)); x.lineTo(cx + rx * 1.2 * dir, cy - ry * (1 - lid * 2.6)); x.lineTo(cx + rx * 1.2 * dir, cy - ry * 1.3); x.lineTo(cx - rx * 1.2 * dir, cy - ry * 1.3); }
      else if (mood === 'sad') { x.moveTo(cx - rx * 1.2 * dir, cy - ry * (1 - lid * 2.6)); x.lineTo(cx + rx * 1.2 * dir, cy - ry * (1 - lid * 0.6)); x.lineTo(cx + rx * 1.2 * dir, cy - ry * 1.3); x.lineTo(cx - rx * 1.2 * dir, cy - ry * 1.3); }
      else x.rect(cx - rx * 1.2, cy - ry * 1.3, rx * 2.4, ry * (0.3 + lid * 2));
      x.fill();
    }
    x.restore();
    // 反光
    x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(ix - ir * 0.32 * dir, iy - ir * 0.42, ir * 0.36, ir * 0.3, 0, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.arc(ix + ir * 0.38 * dir, iy + ir * 0.4, ir * 0.14, 0, TAU); x.fill();
    x.strokeStyle = o.lc || OUT; x.lineWidth = lw; x.stroke(ep);
    // 睫毛／眉
    if (mood === 'angry' && o.brow !== false) { x.strokeStyle = o.lc || OUT; x.lineWidth = lw * 1.6; x.beginPath(); x.moveTo(cx - rx * 1.05 * dir, cy - ry * 1.0); x.lineTo(cx + rx * 1.0 * dir, cy - ry * 0.55); x.stroke(); }
    x.lineCap = 'butt';
  }
  // 嘴：kind = smile / grin / open / roar / o / frown / flat / wavy
  function mouth(x, cx, cy, w, kind, open, o) {
    o = o || {};
    const lw = Math.max(0.6, w * 0.22), lc = o.lc || OUT;
    x.lineCap = 'round'; x.lineJoin = 'round';
    if (kind === 'smile') { x.strokeStyle = lc; x.lineWidth = lw; x.beginPath(); x.arc(cx, cy - w * 0.5, w * 0.7, 0.35, Math.PI - 0.35); x.stroke(); }
    else if (kind === 'frown') { x.strokeStyle = lc; x.lineWidth = lw; x.beginPath(); x.arc(cx, cy + w * 0.6, w * 0.6, Math.PI + 0.45, -0.45); x.stroke(); }
    else if (kind === 'flat') { x.strokeStyle = lc; x.lineWidth = lw; x.beginPath(); x.moveTo(cx - w * 0.5, cy); x.lineTo(cx + w * 0.5, cy); x.stroke(); }
    else if (kind === 'wavy') { x.strokeStyle = lc; x.lineWidth = lw; x.beginPath(); x.moveTo(cx - w * 0.6, cy); for (let i = 1; i <= 4; i++) x.lineTo(cx - w * 0.6 + i * w * 0.3, cy + (i % 2 ? -1 : 1) * w * 0.15); x.stroke(); }
    else {
      const h = Math.max(w * 0.2, open || w * 0.5);
      const p = new Path2D();
      if (kind === 'o') p.ellipse(cx, cy, w * 0.42, h * 0.55, 0, 0, TAU);
      else { p.moveTo(cx - w, cy - h * 0.15); p.quadraticCurveTo(cx, cy - h * 0.35, cx + w, cy - h * 0.15); p.quadraticCurveTo(cx + w * 0.5, cy + h, cx, cy + h); p.quadraticCurveTo(cx - w * 0.5, cy + h, cx - w, cy - h * 0.15); p.closePath(); }
      x.fillStyle = o.in || '#4a0f22'; x.fill(p);
      x.save(); x.clip(p);
      if (kind !== 'o') { x.fillStyle = o.tongue || '#ff6f86'; x.beginPath(); x.ellipse(cx + w * 0.1, cy + h * 0.95, w * 0.55, h * 0.45, 0, 0, TAU); x.fill(); }
      if (kind === 'grin' || kind === 'roar') {
        x.fillStyle = o.teeth || '#fffbec';
        if (kind === 'grin') x.fillRect(cx - w, cy - h * 0.4, w * 2, h * 0.32);
        else for (const t of [-0.62, 0.62]) { x.beginPath(); x.moveTo(cx + t * w - w * 0.18, cy - h * 0.3); x.lineTo(cx + t * w, cy + h * 0.38); x.lineTo(cx + t * w + w * 0.18, cy - h * 0.3); x.closePath(); x.fill(); }
        if (kind === 'roar') for (const t of [-0.5, 0.5]) { x.beginPath(); x.moveTo(cx + t * w - w * 0.14, cy + h * 1.05); x.lineTo(cx + t * w, cy + h * 0.55); x.lineTo(cx + t * w + w * 0.14, cy + h * 1.05); x.closePath(); x.fill(); }
      }
      x.restore();
      x.strokeStyle = lc; x.lineWidth = lw; x.stroke(p);
    }
    x.lineCap = 'butt';
  }
  function blush(x, cx, cy, rx, a) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, rx); g.addColorStop(0, `rgba(255,96,110,${a || 0.5})`); g.addColorStop(1, 'rgba(255,96,110,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rx, rx * 0.6, 0, 0, TAU); x.fill(); }
  // 汗珠／怒氣符號
  function sweat(x, cx, cy, r) { const p = P.fn(q => { q.moveTo(cx, cy - r * 1.4); q.quadraticCurveTo(cx + r, cy, cx, cy + r * 0.8); q.quadraticCurveTo(cx - r, cy, cx, cy - r * 1.4); }); part(x, p, mat('#bfe8ff', { gloss: 1 }), cx, cy, r, { lw: r * 0.3 }); }

  // ───────── 動畫曲線 ─────────
  const ease = t => t * t * (3 - 2 * t);
  const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
  // 攻擊：0 → 蓄力（負）→ 出手（正）→ 收回；回傳 -1..1
  function swing(t) {
    if (t < 0.4) return -ease(t / 0.4);
    if (t < 0.6) return -1 + ease((t - 0.4) / 0.2) * 2;
    return 1 - ease((t - 0.6) / 0.4);
  }
  // 兩段式腳：回傳膝蓋與腳掌位置
  function leg(hx, hy, a1, a2, l1, l2) {
    const kx = hx + Math.sin(a1) * l1, ky = hy + Math.cos(a1) * l1;
    const fx = kx + Math.sin(a1 + a2) * l2, fy = ky + Math.cos(a1 + a2) * l2;
    return [kx, ky, fx, fy];
  }
  // 雙足走路：ph 0..2π；回傳兩腳大腿角、膝角、身體起伏
  function biped(ph, amp, knee) {
    amp = amp == null ? 0.55 : amp; knee = knee == null ? 0.8 : knee;
    const s = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    return {
      a: [s * amp, s2 * amp],
      k: [-Math.max(0, Math.sin(ph + 1.2)) * knee, -Math.max(0, Math.sin(ph + Math.PI + 1.2)) * knee],
      bob: (1 - Math.abs(Math.cos(ph))) * 0.07,
      arm: [-s * amp * 0.9, -s2 * amp * 0.9],
    };
  }

  return { OUT, LX, LY, mat, P, part, line, seg, ao, glow, halo, rng, speckle, fur, scales, sheen, eye, mouth, blush, sweat, ease, clamp01, swing, leg, biped };
})();
