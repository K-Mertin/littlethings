'use strict';
/* 照著畫 — a shape appears on the big screen (a pencil draws it first, so you can see how it goes).
   Everyone draws it on their phone at the same time; the big screen shows all the drawings live.
   Then each drawing is laid over the shape and scored 0–100 % 「像不像」.
   Scoring: both pictures become a coarse grid of inked cells; the drawing is moved and resized onto
   the shape's bounding box, then precision (drawn where the shape is) and recall (covered the shape)
   are combined, with a little tolerance — so wobbly lines are fine, but the right shape matters.
   小朋友: 5 simple shapes; the shape stays on screen while you draw; any size/stretch is fine.
   大人:   6 harder shapes; you see it for 3 seconds, then it hides — draw from memory (proportions count). */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', RFONT = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const COL = '#8b5cf6', AW = 320, AH = 240, GW = 64, GH = 48;
  const DRAW_COLS = ['#2b2340', '#ff4f58', '#2f8cff', '#22c26a', '#ffbf1f', '#9b5cff', '#ffffff'];
  /* shapes in a 400 × 300 frame, as lists of polylines */
  const arc = (cx, cy, rx, ry, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  const ring = (cx, cy, r) => arc(cx, cy, r, r, 0, TAU, 48);
  const SH = {
    circle: { n: '圓形', e: '⚪', p: () => [ring(200, 150, 105)] },
    square: { n: '正方形', e: '🟥', p: () => [[[100, 50], [300, 50], [300, 250], [100, 250], [100, 50]]] },
    triangle: { n: '三角形', e: '🔺', p: () => [[[200, 40], [320, 255], [80, 255], [200, 40]]] },
    heart: { n: '愛心', e: '❤️', p: () => { const o = []; for (let i = 0; i <= 60; i++) { const t = i / 60 * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); o.push([200 + x * 7, 140 - y * 7]); } return [o]; } },
    star: { n: '星星', e: '⭐', p: () => { const o = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 48 : 120; o.push([200 + Math.cos(a) * r, 162 + Math.sin(a) * r]); } return [o]; } },
    house: { n: '房子', e: '🏠', p: () => [[[110, 140], [110, 262], [290, 262], [290, 140]], [[85, 145], [200, 40], [315, 145]], [[180, 262], [180, 200], [220, 200], [220, 262]]] },
    sun: { n: '太陽', e: '☀️', p: () => { const o = [ring(200, 150, 62)]; for (let k = 0; k < 8; k++) { const a = k * TAU / 8; o.push([[200 + Math.cos(a) * 82, 150 + Math.sin(a) * 82], [200 + Math.cos(a) * 128, 150 + Math.sin(a) * 128]]); } return o; } },
    smile: { n: '笑臉', e: '😊', p: () => [ring(200, 150, 112), ring(160, 115, 12), ring(240, 115, 12), arc(200, 150, 62, 56, 0.25, Math.PI - 0.25, 20)] },
    tree: { n: '聖誕樹', e: '🎄', p: () => [[[200, 30], [270, 120], [235, 120], [295, 205], [105, 205], [165, 120], [130, 120], [200, 30]], [[180, 205], [180, 265], [220, 265], [220, 205]]] },
    flower: { n: '花', e: '🌸', p: () => { const o = [ring(200, 150, 30)]; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5; o.push(arc(200 + Math.cos(a) * 72, 150 + Math.sin(a) * 72, 42, 42, a + 2.2, a + TAU - 2.2, 20)); } return o; } },
    fish: { n: '小魚', e: '🐟', p: () => [arc(180, 150, 110, 70, 0, TAU, 48), [[288, 150], [350, 95], [350, 205], [288, 150]], ring(130, 135, 10)] },
    bolt: { n: '閃電', e: '⚡', p: () => [[[230, 25], [120, 160], [195, 160], [160, 280], [285, 125], [208, 125], [230, 25]]] },
    moon: { n: '月亮', e: '🌙', p: () => [arc(200, 150, 115, 115, -2.1, 2.1, 40).concat(arc(250, 150, 92, 104, 2.0, -2.0, 40))] },
    umbrella: { n: '雨傘', e: '☂️', p: () => { const top = arc(200, 140, 145, 110, Math.PI, TAU, 36), sc = []; for (let k = 0; k < 4; k++) sc.push(...arc(91 + k * 72.5 + 36, 140, 36, 22, 0, -Math.PI, 10).reverse()); return [top, sc, [[200, 140], [200, 250]].concat(arc(178, 250, 22, 22, 0, Math.PI, 10))]; } },
    cat: { n: '貓臉', e: '🐱', p: () => [arc(200, 165, 115, 100, -0.75, Math.PI + 0.75, 40), [[118, 95], [105, 25], [165, 70]], [[235, 70], [295, 25], [282, 95]], ring(160, 150, 12), ring(240, 150, 12), [[60, 185], [150, 180]], [[60, 210], [150, 195]], [[340, 185], [250, 180]], [[340, 210], [250, 195]]] }
  };
  const KID = ['circle', 'square', 'triangle', 'heart', 'star', 'house', 'sun', 'smile', 'tree', 'flower'];
  const ADULT = ['heart', 'star', 'house', 'smile', 'fish', 'bolt', 'moon', 'umbrella', 'cat', 'flower', 'tree'];

  function plen(P) { let L = 0; for (const s of P) for (let i = 1; i < s.length; i++) L += hyp(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; }
  /* a canvas's inked cells as a GW × GH grid */
  function cells(cv) {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, out = new Uint8Array(GW * GH), sx = cv.width / GW, sy = cv.height / GH;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const i = (y * cv.width + x) * 4; if (d[i + 3] < 40 || (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235)) continue;
      out[Math.min(GH - 1, (y / sy) | 0) * GW + Math.min(GW - 1, (x / sx) | 0)] = 1;
    }
    return out;
  }
  function bbox(G) { let x0 = GW, y0 = GH, x1 = -1, y1 = -1; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (G[y * GW + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }; }
  function dilate(G, r) { const o = new Uint8Array(GW * GH); for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (G[y * GW + x]) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < GW && Y < GH && dx * dx + dy * dy <= r * r + 1) o[Y * GW + X] = 1; } return o; }
  const P_R = (P, R) => P + R ? 2 * P * R / (P + R) : 0;
  /* 0..100: how much the drawing looks like the shape */
  function similarity(T, D, stretch) {
    const tb = bbox(T), db = bbox(D); if (!tb || !db) return 0;
    let sx = tb.w / db.w, sy = tb.h / db.h;
    if (!stretch) { const s = Math.sqrt(sx * sy); sx = sy = s; }
    if (db.w < 3 && db.h < 3) return 0;
    const M = new Uint8Array(GW * GH), tcx = (tb.x0 + tb.x1) / 2, tcy = (tb.y0 + tb.y1) / 2, dcx = (db.x0 + db.x1) / 2, dcy = (db.y0 + db.y1) / 2;
    // map every drawn cell (with sub-steps, so scaling up leaves no gaps)
    const st = Math.max(1, Math.ceil(Math.max(sx, sy)));
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (D[y * GW + x]) for (let j = 0; j < st; j++) for (let i = 0; i < st; i++) {
      const X = Math.round(tcx + (x + i / st - dcx) * sx), Y = Math.round(tcy + (y + j / st - dcy) * sy);
      if (X >= 0 && Y >= 0 && X < GW && Y < GH) M[Y * GW + X] = 1;
    }
    // precision: drawn cells close to the shape (1 cell of slack); recall: shape cells near the drawing (2 cells)
    const T1 = dilate(T, 1), M2 = dilate(M, 2);
    let m = 0, mh = 0, t = 0, th = 0;
    for (let i = 0; i < GW * GH; i++) { if (M[i]) { m++; if (T1[i]) mh++; } if (T[i]) { t++; if (M2[i]) th++; } }
    if (!m || !t) return 0;
    let f = P_R(mh / m, th / t);
    // scribbling everywhere isn't drawing: compare how much line there is for the picture's size
    let dn = 0; for (let i = 0; i < GW * GH; i++) dn += D[i];
    const ink = (dn / Math.sqrt(db.w * db.h)) / (t / Math.sqrt(tb.w * tb.h));
    if (ink > 1.7) f *= Math.pow(1.7 / ink, 0.8);
    return Math.round(100 * Math.pow(clamp((f - 0.3) / 0.62, 0, 1), 1.3));
  }

  class Copy {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = null; this.teams = !!ctx.teams; this.edge = '#f6e7c8';
      this.es = ctx.players.map(p => { const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH; const e = { p, cv, score: 0, best: 0, sum: 0, last: 0, shown: 0, strokes: 0, inked: 0 }; this.wipe(e); return e; });
      this.by = new Map(this.es.map(e => [e.p, e]));
      const pool = (this.kid ? KID : ADULT).slice(); for (let i = pool.length - 1; i > 0; i--) { const j = rint(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      this.rounds = this.kid ? 5 : 6; this.list = pool.slice(0, this.rounds); this.ri = -1; this.seed = rint(1e6);
      this.tcv = document.createElement('canvas'); this.tcv.width = AW; this.tcv.height = AH;
      this.papers = []; for (let i = 0; i < 40; i++) this.papers.push({ x: rnd(-380, W + 380), y: rnd(0, H), r: rnd(0, TAU), c: ['#ffd6e6', '#d5f0ff', '#fff1b8', '#d9f7d0'][rint(4)] });
      this.next();
    }
    wipe(e) { const g = e.cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, AW, AH); e.inked = 0; }
    next() {
      this.ri++;
      if (this.ri >= this.rounds) { this.over = true; return; }
      this.key = this.list[this.ri]; this.shape = SH[this.key]; this.paths = this.shape.p(); this.len = plen(this.paths);
      const g = this.tcv.getContext('2d'); g.clearRect(0, 0, AW, AH); g.strokeStyle = '#2b2340'; g.lineWidth = 9; g.lineCap = g.lineJoin = 'round';
      for (const s of this.paths) { g.beginPath(); s.forEach(([x, y], i) => i ? g.lineTo(x * AW / 400, y * AH / 300) : g.moveTo(x * AW / 400, y * AH / 300)); g.stroke(); }
      this.T = cells(this.tcv);
      for (const e of this.es) { this.wipe(e); e.last = 0; e.shown = 0; }
      this.phase = 'look'; this.pt = this.kid ? 3.2 : 3.6; this.lookT = this.pt; this.limit = this.kid ? 16 : 13;
      Fx.announce('第 ' + (this.ri + 1) + ' 題：' + this.shape.e + ' ' + this.shape.n, COL, 470);
      this.ctx.sfx('pop');
    }
    onDraw(p, d) {
      const e = this.by.get(p); if (!e || this.phase !== 'draw' || !d.p || d.p.length < 2) return;
      const g = e.cv.getContext('2d'), pts = d.p.length & 1 ? d.p.slice(0, -1) : d.p;
      g.strokeStyle = DRAW_COLS[d.c] || '#2b2340'; g.lineWidth = d.c === 6 ? 26 : 8; g.lineCap = g.lineJoin = 'round';
      g.beginPath(); g.moveTo(pts[0] * AW, pts[1] * AH); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] * AW, pts[i + 1] * AH);
      if (pts.length === 2) g.lineTo(pts[0] * AW + 0.1, pts[1] * AH);
      g.stroke(); e.inked++; if (e.lastS !== d.s) { e.lastS = d.s; e.strokes++; }
    }
    onDrawClear(p) { const e = this.by.get(p); if (e && this.phase === 'draw') this.wipe(e); }
    update(dt) {
      const ctx = this.ctx; this.t += dt; this.pt -= dt;
      if (this.phase === 'look') { if (this.pt <= 0) { this.phase = 'draw'; this.pt = this.limit; ctx.sfx('go'); Fx.pop(800, 470, this.kid ? '開始畫！' : '藏起來了！憑記憶畫！', COL, 70); } return; }
      if (this.phase === 'draw') {
        if (this.pt <= 3 && this.pt + dt > 3) ctx.sfx('tick');
        if (this.pt <= 0) this.score();
        return;
      }
      if (this.phase === 'score') {
        for (const e of this.es) e.shown += (e.last - e.shown) * Math.min(1, dt * 3);
        if (this.pt <= 0) this.next();
      }
    }
    score() {
      this.phase = 'score'; this.pt = 5.5;
      let best = -1;
      for (const e of this.es) {
        const D = cells(e.cv); e.last = e.inked ? similarity(this.T, D, this.kid) : 0;
        e.score += e.last; e.sum += e.last; e.best = Math.max(e.best, e.last); best = Math.max(best, e.last);
      }
      this.top = this.es.length > 1 && best > 0 ? this.es.filter(e => e.last === best) : [];
      for (const e of this.top) { e.score += 20; this.ctx.buzz(e.p, 80); }
      this.ctx.sfx('star'); Fx.flash('#fff', 0.2);
    }

    /* ---------------- drawing ---------------- */
    paintBg(g) {
      g.fillStyle = '#f6e7c8'; g.fillRect(-400, 0, W + 800, H);
      // a cork board with pinned paper scraps
      g.fillStyle = '#c99a62'; g.fillRect(-400, 130, W + 800, 770);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,50,20,${0.05 + (i % 5) * 0.02})`; g.fillRect(((i * 523) % (W + 800)) - 400, 130 + (i * 311) % 770, 3, 3); }
      for (const p of this.papers) { g.save(); g.translate(p.x, p.y < 130 ? p.y + 130 : p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-30, -22, 60, 44); g.restore(); }
      g.fillStyle = '#8a5a2b'; g.fillRect(-400, 122, W + 800, 14);
    }
    bgLayer(g) {
      const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
      if (!this.bgCv || this.bgS !== s) { const c = this.bgCv || document.createElement('canvas'); c.width = Math.ceil((W + 800) * s); c.height = Math.ceil(H * s); const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 400 * s, 0); this.paintBg(cg); this.bgCv = c; this.bgS = s; }
      g.drawImage(this.bgCv, -400, 0, W + 800, H);
    }
    /* the shape, drawn up to fraction k of its length */
    trace(g, x, y, w, h, k, col, lw) {
      let left = this.len * k, px = null; const sx = w / 400, sy = h / 300;
      g.strokeStyle = col; g.lineWidth = lw; g.lineCap = g.lineJoin = 'round';
      for (const s of this.paths) {
        if (left <= 0) break;
        g.beginPath(); g.moveTo(x + s[0][0] * sx, y + s[0][1] * sy);
        for (let i = 1; i < s.length && left > 0; i++) {
          const L = hyp(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]), f = Math.min(1, left / (L || 1));
          const ex = s[i - 1][0] + (s[i][0] - s[i - 1][0]) * f, ey = s[i - 1][1] + (s[i][1] - s[i - 1][1]) * f;
          g.lineTo(x + ex * sx, y + ey * sy); left -= L; px = [x + ex * sx, y + ey * sy];
        }
        g.stroke();
      }
      return px;
    }
    paper(g, x, y, w, h, rot) {
      g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot || 0);
      g.fillStyle = 'rgba(60,30,10,.25)'; g.fillRect(-w / 2 + 6, -h / 2 + 8, w, h);
      g.fillStyle = '#fff'; g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = '#ff4f58'; g.beginPath(); g.arc(0, -h / 2 + 8, 9, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-3, -h / 2 + 5, 3, 0, TAU); g.fill();
      g.restore();
    }
    draw(g, clock) {
      const at = clock || this.t;
      this.bgLayer(g);
      if (!this.shape) return;
      const sh = this.shape, n = this.es.length;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 40px ' + FONT; g.fillStyle = '#2b2340'; g.fillText('照著畫：' + sh.e + ' ' + sh.n, 800, 172);
      g.font = '700 22px ' + FONT; g.fillStyle = '#5c3b1b';
      g.fillText(this.phase === 'score' ? '紅線是題目・越像分數越高' + (this.top.length ? '・👑 最像的人 +20' : '') : '第 ' + (this.ri + 1) + ' / ' + this.rounds + ' 題', 800, 212);
      if (this.phase === 'look' || this.phase === 'draw') {
        // the model sheet
        const w = 420, h = 315, x = 800 - w / 2, y = 236;
        this.paper(g, x, y, w, h, -0.01);
        if (this.phase === 'look') {
          const k = clamp((this.lookT - this.pt) / (this.lookT * 0.75), 0, 1), tip = this.trace(g, x, y, w, h, k, '#2b2340', 9);
          if (tip && k < 1) { g.save(); g.translate(tip[0], tip[1]); g.rotate(-0.6); g.fillStyle = '#ffbf1f'; g.fillRect(-6, -60, 12, 50); g.fillStyle = '#f6d7a8'; g.beginPath(); g.moveTo(-6, -10); g.lineTo(6, -10); g.lineTo(0, 0); g.fill(); g.restore(); }
        } else if (this.kid) this.trace(g, x, y, w, h, 1, '#2b2340', 9);
        else {
          g.fillStyle = 'rgba(155,92,246,.12)'; g.fillRect(x + 10, y + 10, w - 20, h - 20);
          g.font = '900 120px ' + RFONT; g.fillStyle = 'rgba(155,92,246,.5)'; g.fillText('?', 800, y + h / 2);
          g.font = '700 22px ' + FONT; g.fillStyle = '#6b4fa0'; g.fillText('憑記憶畫出 ' + sh.n, 800, y + h - 34);
        }
        if (this.phase === 'draw') {
          const k = Math.max(0, this.pt / this.limit);
          g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.roundRect(590, y + h + 16, 420, 14, 7); g.fill();
          g.fillStyle = this.pt < 3 ? '#ff3b4a' : COL; g.beginPath(); g.roundRect(590, y + h + 16, 420 * k, 14, 7); g.fill();
        }
        // everyone's paper, live
        const cw = Math.min(220, 1400 / n - 20), chh = cw * 0.75;
        this.es.forEach((e, i) => {
          const cx = 800 - (n - 1) * (cw + 20) / 2 + i * (cw + 20), cy = 646;
          this.paper(g, cx - cw / 2, cy, cw, chh, (i % 2 ? 1 : -1) * 0.02);
          g.drawImage(e.cv, cx - cw / 2 + 4, cy + 4, cw - 8, chh - 8);
          drawTag(g, cx, cy + chh + 20, e.p);
          if (this.phase === 'draw' && e.inked) { g.font = '26px system-ui'; g.fillText('✏️', cx + cw / 2 - 12, cy + 4 + Math.sin(at * 12 + i) * 3); }
        });
        return;
      }
      // score: every drawing with the shape on top and its %
      const cols = n <= 4 ? n : 3, rows = n <= 4 ? 1 : 2;
      const cw = rows === 1 ? Math.min(400, 1440 / cols - 30) : 300, chh = cw * 0.75, gy = rows === 1 ? 290 : 250;
      this.es.forEach((e, i) => {
        const r = (i / cols) | 0, inRow = r === rows - 1 ? n - cols * (rows - 1) : cols, c = i % cols, x = 800 - (inRow - 1) * (cw + 30) / 2 + c * (cw + 30) - cw / 2, y = gy + r * (chh + 84);
        const top = this.top.includes(e);
        this.paper(g, x, y, cw, chh, 0);
        g.drawImage(e.cv, x + 4, y + 4, cw - 8, chh - 8);
        g.globalAlpha = 0.45; this.trace(g, x + 4, y + 4, cw - 8, chh - 8, 1, '#ff4f58', 4); g.globalAlpha = 1;
        if (top) { g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(x - 4, y - 4, cw + 8, chh + 8); g.font = '44px system-ui'; g.fillText('👑', x + cw - 8, y - 6); }
        const pct = Math.round(e.shown);
        g.fillStyle = pct >= 70 ? '#22c26a' : pct >= 40 ? '#ffbf1f' : '#ff7a6b'; g.beginPath(); g.roundRect(x + cw / 2 - 70, y + chh - 30, 140, 52, 26); g.fill();
        g.fillStyle = '#fff'; g.font = '900 32px ' + RFONT; g.fillText(pct + '%', x + cw / 2, y + chh - 3);
        drawTag(g, x + cw / 2, y + chh + 42, e.p);
        drawCritter(g, x - 10, y + chh + 30, 22, e.p.col, e.p.animal, { noShadow: true, happy: top || pct >= 60, still: true, hop: top ? Math.abs(Math.sin(at * 6)) * 8 : 0 });
      });
    }
    center() { return this.phase === 'draw' ? '還有 ' + Math.ceil(this.pt) + ' 秒' : ''; }
    teamScore(t) { return this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.score, 0) + ' 分'; }
    chip(p) { return this.by.get(p).score + ' 分'; }
    pad(p) { const e = this.by.get(p); return e.score + ' 分・第 ' + (this.ri + 1) + ' 題'; }
    ready() { return this.phase === 'draw'; }
    padLayout(p) {
      if (!this.shape) return null;
      const e = this.by.get(p), id = 'c' + this.seed + '-' + this.ri, sh = this.shape;
      if (this.phase === 'look') return { type: 'draw', id, prompt: (this.kid ? '看大螢幕！等一下要畫：' : '記住大螢幕的形狀：') + sh.e + ' ' + sh.n, canDraw: false };
      if (this.phase === 'draw') return { type: 'draw', id, prompt: '畫出 ' + sh.e + ' ' + sh.n + '！畫大一點', canDraw: true };
      return { type: 'draw', id, prompt: '像 ' + e.last + '%！' + (this.top.includes(e) ? '👑 最像！+20' : '看大螢幕'), canDraw: false };
    }
    results() {
      const team = this.teams ? { teamScores: [0, 1].map(t => this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.score, 0)), teamText: t => this.teamScore(t) } : {};
      return { ...team, rows: this.es.slice().sort((a, b) => b.score - a.score).map(e => ({ p: e.p, key: e.score, line: `${e.score} 分・平均 ${Math.round(e.sum / Math.max(1, this.ri))}%・最高 ${e.best}%` })) };
    }
  }
  GAMES.push({
    id: 'copy', name: '照著畫', icon: '🖍️', col: COL, bg: '#f6e7c8', kind: 'vs', teams: true, cat: 'brain', players: '1–6 人',
    blurb: '看大螢幕的形狀，在手機上畫一樣的！',
    btn: { label: '畫', icon: '🖍️' },
    rules: kid => kid
      ? ['大螢幕上的鉛筆會先畫一個形狀給你看', '在手機上用手指畫一樣的形狀，畫大一點', '畫完會比一比「像不像」，越像分數越高', '最像的人再加 20 分！一共 5 題']
      : ['形狀只給你看 3 秒就藏起來，要憑記憶畫', '大小、位置沒關係，但比例和形狀要對', '畫完疊上題目算「像不像」0–100 分，最像的人 +20', '一共 6 題，分數最高的人贏'],
    thumb(g) {
      g.fillStyle = '#c99a62'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#fff'; g.save(); g.translate(100, 90); g.rotate(-0.04); g.fillRect(-70, -55, 140, 105); g.restore();
      g.save(); g.translate(225, 95); g.rotate(0.05); g.fillRect(-70, -55, 140, 105); g.restore();
      g.strokeStyle = '#2b2340'; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 16 : 40; g.lineTo(100 + Math.cos(a) * r, 92 + Math.sin(a) * r); } g.stroke();
      g.strokeStyle = '#ff4f58'; g.beginPath(); for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + 0.08, r = (i % 2 ? 15 : 37) + Math.sin(i * 3) * 4; g.lineTo(225 + Math.cos(a) * r, 98 + Math.sin(a) * r); } g.stroke();
      g.fillStyle = '#22c26a'; g.beginPath(); g.roundRect(195, 140, 60, 26, 13); g.fill(); g.fillStyle = '#fff'; g.font = '900 16px "Fredoka",system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('86%', 225, 153);
    },
    create: ctx => new Copy(ctx)
  });
})();
