'use strict';
/* 動物大富翁 — a turn-based board game on the big screen.
   A winding road of colourful squares runs through a little diorama: the meadow (起點),
   over the river bridge, through the village and the forest, up the mountain to the
   rainbow castle (終點). Each player's critter is a token on the road.
   On your turn your phone becomes one big 🎲 button: a 3D die tumbles across the TV,
   lands with a thud, and your critter hops square by square.
   Squares: ⭐ star (+1), 🪜 ladder (climb up a row), 🛝 slide (down a row), ❓ event card,
            🛒 shop (大人 only: spend stars on 🍀 幸運骰 / 🍌 香蕉皮 / 🚀 火箭).
   While someone else is rolling, everybody else's phone is a 「幫忙加油！」 button that
   makes their critter cheer on the board.
   First to the castle wins; otherwise after N rounds the one furthest along (then most ⭐) wins.
   小朋友: 32 squares, lots of ladders and stars, one slide, no shop, friendly events,
           auto-roll after 8 s. 大人: 48 squares, more slides, shops, 交換位置 and 偷一顆星. */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', NUM = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const LIME = '#84cc16', DEEP = '#3f6212', INK = '#2b2340';
  const ROWS = [818, 643, 468, 293], XL = 150, XR = 1170;
  const PX0 = 1322, PX1 = 1586, PX = (PX0 + PX1) / 2;   // the notice board on the right
  const DX = 660, DY = 486;                              // where the big die tumbles / cards show
  const SLOT = [PX, 560];                                // where the die rests on the notice board
  const ZT = [['#fff7d6', '#e2b24f'], ['#ffe8ee', '#e49ab0'], ['#e4f7da', '#86c06f'], ['#e6f0fb', '#94afd0']];
  const TT = { star: ['#ffe066', '#d99a00'], event: ['#c4a5ff', '#7c4ddb'], shop: ['#7dd3fc', '#2389c9'], ladder: ['#8be27f', '#2f9e44'], slide: ['#ffb070', '#e0681a'], start: ['#ff9fc8', '#d6458a'], finish: ['#ffd84a', '#c48a00'] };
  const CONF = ['#ff4f58', '#2f8cff', '#ffbf1f', '#22c26a', '#9b5cff', '#ff6fb7', '#ffffff'];
  const ITEMS = [
    { id: 'luck', n: '幸運骰', d: '下次擲兩顆', icon: '🍀', cost: 2, col: '#22c26a' },
    { id: 'banana', n: '香蕉皮', d: '放在後面一格', icon: '🍌', cost: 1, col: '#e0a800' },
    { id: 'rocket', n: '火箭', d: '前進 5 格', icon: '🚀', cost: 3, col: '#ef4444' },
    { id: 'none', n: '不買', d: '下次再說', icon: '🙅', cost: 0, col: '#8b8fa3' }
  ];
  // event cards: a = big line, b = small line, g = picture, w = [小朋友 weight, 大人 weight]
  const EVENTS = {
    wind: { a: '順風！', b: '前進 3 格', g: 'wind', col: '#0ea5e9', w: [3, 2] },
    bird: { a: '小鳥載你飛！', b: '前進 2 格', g: 'fwd', col: '#16a34a', w: [3, 1] },
    bag: { a: '撿到星星袋！', b: '拿到 2 顆星星', g: 'star2', col: '#d97706', w: [3, 2] },
    all: { a: '大家都 +1 顆星', b: '一起開心！', g: 'party', col: '#db2777', w: [2, 1] },
    again: { a: '好運氣！', b: '再擲一次', g: 'dice', col: '#7c3aed', w: [2, 1] },
    rain: { a: '下雨了', b: '休息一回合', g: 'rain', col: '#475569', w: [1, 2] },
    lost: { a: '迷路了', b: '退後 2 格', g: 'back', col: '#ea580c', w: [1, 0] },
    mud: { a: '踩到泥巴', b: '退後 3 格', g: 'mud', col: '#92400e', w: [0, 2] },
    swap: { a: '交換位置！', b: '', g: 'swap', col: '#0891b2', w: [0, 2], multi: true },
    steal: { a: '偷一顆星！', b: '', g: 'steal', col: '#be123c', w: [0, 2], multi: true }
  };
  const ease = k => 1 - Math.pow(1 - k, 3);
  const back = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const sndOK = () => Sfx.on && Sfx.ctx && Sfx.ctx.state === 'running';
  const online = p => !!(p.online || p.local);

  /* ---------------- a little 3D die ---------------- */
  const mm = (A, B) => { const R = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) R[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return R; };
  const rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  const ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const rz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
  const ap = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
  const FACES = [
    { v: 1, n: [0, 0, 1], u: [1, 0, 0], w: [0, 1, 0] }, { v: 6, n: [0, 0, -1], u: [-1, 0, 0], w: [0, 1, 0] },
    { v: 3, n: [1, 0, 0], u: [0, 0, -1], w: [0, 1, 0] }, { v: 4, n: [-1, 0, 0], u: [0, 0, 1], w: [0, 1, 0] },
    { v: 2, n: [0, 1, 0], u: [1, 0, 0], w: [0, 0, -1] }, { v: 5, n: [0, -1, 0], u: [1, 0, 0], w: [0, 0, 1] }
  ];
  const FACE_R = { 1: rx(0), 6: ry(Math.PI), 3: ry(-Math.PI / 2), 4: ry(Math.PI / 2), 2: rx(Math.PI / 2), 5: rx(-Math.PI / 2) };
  const TILT = mm(rx(0.5), ry(-0.6));
  const PIPS = { 1: [[0, 0]], 2: [[-1, 1], [1, -1]], 3: [[-1, 1], [0, 0], [1, -1]], 4: [[-1, 1], [1, 1], [-1, -1], [1, -1]], 5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]], 6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]] };
  const LIGHT = (() => { const v = [-0.45, 0.7, 0.65], m = Math.hypot(...v); return v.map(x => x / m); })();
  const shadeRGB = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
  function dieMatrix(v, a, b, c, k) { const e = 1 - k; return mm(TILT, mm(mm(rx(a * e), mm(ry(b * e), rz(c * e))), FACE_R[v])); }
  function drawDie(g, x, y, s, M, tint) {
    const face = tint || [255, 255, 255], edge = [face[0] * 0.8, face[1] * 0.78, face[2] * 0.86];
    for (const F of FACES) {
      const n = ap(M, F.n); if (n[2] <= 0.015) continue;
      const u = ap(M, F.u), w = ap(M, F.w), sh = 0.58 + 0.42 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      g.save(); g.transform(u[0] * s, -u[1] * s, w[0] * s, -w[1] * s, x + n[0] * s, y - n[1] * s);
      g.fillStyle = shadeRGB(edge, sh); g.fillRect(-1.01, -1.01, 2.02, 2.02);
      g.fillStyle = shadeRGB(face, sh); g.beginPath(); g.roundRect(-0.86, -0.86, 1.72, 1.72, 0.38); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.roundRect(-0.72, 0.42, 1.44, 0.32, 0.16); g.fill();
      g.fillStyle = F.v === 1 ? '#e11d48' : INK;
      for (const [pu, pw] of PIPS[F.v]) { g.beginPath(); g.arc(pu * 0.5, pw * 0.5, F.v === 1 ? 0.27 : 0.17, 0, TAU); g.fill(); }
      g.restore();
    }
  }

  /* ---------------- little vector pictures (no emoji needed on the TV) ---------------- */
  function star(g, x, y, r, fill, stroke, lw) {
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.46 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.lineJoin = 'round';
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || r * 0.25; g.stroke(); }
    g.fillStyle = fill; g.fill();
  }
  function arrow(g, x, y, s, ang, col, edge) {
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
    g.beginPath(); g.moveTo(-0.9, -0.3); g.lineTo(0.1, -0.3); g.lineTo(0.1, -0.75); g.lineTo(0.95, 0); g.lineTo(0.1, 0.75); g.lineTo(0.1, 0.3); g.lineTo(-0.9, 0.3); g.closePath();
    g.lineJoin = 'round'; if (edge) { g.strokeStyle = edge; g.lineWidth = 0.22; g.stroke(); } g.fillStyle = col; g.fill(); g.restore();
  }
  function banana(g, x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || -0.3); g.scale(s, s);
    g.fillStyle = 'rgba(40,30,10,.2)'; g.beginPath(); g.ellipse(0.05, 0.55, 0.9, 0.22, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-0.95, -0.2); g.quadraticCurveTo(0, 0.95, 0.95, -0.25); g.quadraticCurveTo(0, 0.45, -0.95, -0.2); g.closePath();
    g.fillStyle = '#ffd43b'; g.fill(); g.strokeStyle = '#c99400'; g.lineWidth = 0.1; g.stroke();
    g.fillStyle = '#6b4f1d'; g.beginPath(); g.arc(-0.95, -0.2, 0.09, 0, TAU); g.arc(0.95, -0.25, 0.08, 0, TAU); g.fill();
    g.restore();
  }
  function clover(g, x, y, s) {
    g.fillStyle = '#22c26a'; g.strokeStyle = '#127a40'; g.lineWidth = s * 0.08;
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.arc(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42, s * 0.4, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = '#7ee2a0'; g.beginPath(); g.arc(x, y, s * 0.16, 0, TAU); g.fill();
    g.strokeStyle = '#127a40'; g.lineWidth = s * 0.12; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * 0.3, y + s * 0.7, x + s * 0.1, y + s * 1.05); g.stroke();
  }
  function rocket(g, x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot == null ? -0.6 : rot); g.scale(s, s);
    g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(-0.25, 0.6); g.lineTo(0, 1.1); g.lineTo(0.25, 0.6); g.fill();
    g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(-0.32, 0.25); g.lineTo(-0.62, 0.72); g.lineTo(-0.3, 0.62); g.fill(); g.beginPath(); g.moveTo(0.32, 0.25); g.lineTo(0.62, 0.72); g.lineTo(0.3, 0.62); g.fill();
    g.fillStyle = '#f1f5f9'; g.strokeStyle = '#64748b'; g.lineWidth = 0.07; g.beginPath(); g.moveTo(0, -1); g.quadraticCurveTo(0.45, -0.45, 0.32, 0.62); g.lineTo(-0.32, 0.62); g.quadraticCurveTo(-0.45, -0.45, 0, -1); g.fill(); g.stroke();
    g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(0, -1); g.quadraticCurveTo(0.28, -0.72, 0.36, -0.5); g.lineTo(-0.36, -0.5); g.quadraticCurveTo(-0.28, -0.72, 0, -1); g.fill();
    g.fillStyle = '#38bdf8'; g.strokeStyle = '#334155'; g.beginPath(); g.arc(0, -0.12, 0.18, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  function cart(g, x, y, s, col) {
    g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 0.14; g.lineJoin = g.lineCap = 'round';
    g.beginPath(); g.moveTo(-0.95, -0.6); g.lineTo(-0.65, -0.6); g.lineTo(-0.4, 0.35); g.lineTo(0.62, 0.35); g.lineTo(0.85, -0.35); g.lineTo(-0.55, -0.35); g.stroke();
    g.beginPath(); g.moveTo(-0.5, -0.35); g.lineTo(0.85, -0.35); g.lineTo(0.62, 0.35); g.lineTo(-0.4, 0.35); g.closePath(); g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.arc(-0.28, 0.66, 0.15, 0, TAU); g.arc(0.5, 0.66, 0.15, 0, TAU); g.fill(); g.restore();
  }
  function cloud(g, x, y, s, col) {
    g.fillStyle = col || '#fff';
    for (const [u, v, r] of [[-0.55, 0.12, 0.42], [0, -0.12, 0.55], [0.55, 0.1, 0.42], [0.2, 0.25, 0.4], [-0.25, 0.25, 0.4]]) { g.beginPath(); g.arc(x + u * s, y + v * s, r * s, 0, TAU); g.fill(); }
  }
  /* the picture on an event card */
  function glyph(g, kind, x, y, s) {
    g.lineCap = g.lineJoin = 'round';
    if (kind === 'wind') {
      g.strokeStyle = '#0ea5e9'; g.lineWidth = s * 0.13;
      for (const [yy, l] of [[-0.45, 1.2], [0, 1.6], [0.45, 1]]) { g.beginPath(); g.moveTo(x - s * 0.9, y + yy * s); g.lineTo(x - s * 0.9 + l * s, y + yy * s); g.arc(x - s * 0.9 + l * s, y + yy * s - s * 0.2, s * 0.2, Math.PI / 2, -Math.PI * 0.9, true); g.stroke(); }
    } else if (kind === 'fwd') { arrow(g, x, y, s, 0, '#22c55e', '#15803d'); }
    else if (kind === 'back') { arrow(g, x, y, s, Math.PI, '#fb923c', '#c2410c'); }
    else if (kind === 'mud') {
      g.fillStyle = '#8b5a2b'; g.beginPath(); g.ellipse(x, y + s * 0.45, s * 0.95, s * 0.35, 0, 0, TAU); g.fill();
      g.fillStyle = '#a9713c'; g.beginPath(); g.ellipse(x - s * 0.2, y + s * 0.38, s * 0.4, s * 0.12, 0, 0, TAU); g.fill();
      arrow(g, x, y - s * 0.35, s * 0.6, Math.PI, '#fb923c', '#c2410c');
    } else if (kind === 'star2') { star(g, x - s * 0.38, y + s * 0.12, s * 0.62, '#ffd43b', '#c98a00'); star(g, x + s * 0.42, y - s * 0.22, s * 0.5, '#ffe066', '#c98a00'); }
    else if (kind === 'party') {
      star(g, x, y, s * 0.72, '#ffd43b', '#c98a00');
      for (let k = 0; k < 8; k++) { const a = k * TAU / 8; g.fillStyle = CONF[k % 6]; g.fillRect(x + Math.cos(a) * s * 0.95 - 4, y + Math.sin(a) * s * 0.95 - 4, 9, 9); }
    } else if (kind === 'dice') { drawDie(g, x, y, s * 0.55, mm(TILT, FACE_R[6])); }
    else if (kind === 'rain') {
      cloud(g, x, y - s * 0.25, s * 0.75, '#94a3b8');
      g.strokeStyle = '#38bdf8'; g.lineWidth = s * 0.1; for (const u of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(x + u * s, y + s * 0.4); g.lineTo(x + u * s - s * 0.12, y + s * 0.75); g.stroke(); }
    } else if (kind === 'swap') {
      g.strokeStyle = '#0891b2'; g.lineWidth = s * 0.14;
      g.beginPath(); g.arc(x, y, s * 0.62, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(x, y, s * 0.62, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
      arrow(g, x + s * 0.55, y - s * 0.3, s * 0.32, 0.9, '#0891b2'); arrow(g, x - s * 0.55, y + s * 0.3, s * 0.32, 0.9 + Math.PI, '#0891b2');
    } else if (kind === 'steal') {
      star(g, x + s * 0.3, y - s * 0.15, s * 0.6, '#ffd43b', '#c98a00');
      g.fillStyle = '#ffd8b5'; g.strokeStyle = '#c2410c'; g.lineWidth = s * 0.06;
      g.beginPath(); g.ellipse(x - s * 0.45, y + s * 0.35, s * 0.32, s * 0.24, -0.4, 0, TAU); g.fill(); g.stroke();
      for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x - s * 0.2 + k * s * 0.08, y + s * 0.1 - k * s * 0.13, s * 0.15, s * 0.07, -0.6, 0, TAU); g.fill(); g.stroke(); }
    }
  }

  /* ---------------- the road ---------------- */
  function buildBoard(N, kid) {
    const pts = [];
    for (let r = 0; r < 4; r++) {
      const dir = r % 2 ? -1 : 1;
      for (let k = r ? 1 : 0; k <= 120; k++) {
        const u = k / 120, x = dir > 0 ? XL + (XR - XL) * u : XR - (XR - XL) * u;
        pts.push({ x, y: ROWS[r] + Math.sin(u * Math.PI * 3 + r * 1.3) * 13 * Math.sin(u * Math.PI), row: r, turn: false });
      }
      if (r < 3) {
        const R = (ROWS[r] - ROWS[r + 1]) / 2, cx = dir > 0 ? XR : XL, cy = ROWS[r] - R;
        for (let k = 1; k < 48; k++) { const a = Math.PI / 2 - dir * Math.PI * k / 48; pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), row: r, turn: true }); }
      }
    }
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hyp(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const L = cum[cum.length - 1], sp = L / (N - 1), rad = Math.min(kid ? 50 : 45, sp * 0.43);
    const sq = []; let j = 0;
    for (let i = 0; i < N; i++) {
      const s = i * sp; while (j < pts.length - 2 && cum[j + 1] < s) j++;
      const a = pts[j], b = pts[j + 1], u = clamp((s - cum[j]) / (cum[j + 1] - cum[j] || 1), 0, 1);
      sq.push({ i, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, row: a.row, turn: a.turn || b.turn, type: 'normal', link: -1 });
    }
    sq[0].type = 'start'; sq[N - 1].type = 'finish';
    // ladders and slides join a square to the one right above it in the next row
    const links = [], used = new Set([0, N - 1]);
    const ok = s => !s.turn && s.i >= 2 && s.i <= N - 3 && s.x > XL + 25 && s.x < XR - 25 && !used.has(s.i);
    const want = kid ? { ladder: 4, slide: 1 } : { ladder: 4, slide: 5 };
    for (const kind of ['ladder', 'slide']) {
      let made = 0;
      for (let tries = 0; tries < 400 && made < want[kind]; tries++) {
        // kids' slide sits low on the board; ladders anywhere
        const band = kind === 'slide' && kid ? rint(2) : rint(3);
        const lo = sq.filter(s => s.row === band && ok(s)); if (!lo.length) continue;
        const A = lo[rint(lo.length)];
        const hi = sq.filter(s => s.row === band + 1 && ok(s) && Math.abs(s.x - A.x) < sp * 0.55);
        if (!hi.length) continue;
        const B = hi.sort((p, q) => Math.abs(p.x - A.x) - Math.abs(q.x - A.x))[0];
        if (links.some(l => l.band === band && Math.abs(l.x - (A.x + B.x) / 2) < 150)) continue;
        if (used.has(A.i + 1) && used.has(A.i - 1)) continue;
        const from = kind === 'ladder' ? A : B, to = kind === 'ladder' ? B : A;
        from.type = kind; from.link = to.i; to.dest = true; used.add(A.i); used.add(B.i);
        links.push({ kind, from: from.i, to: to.i, band, x: (A.x + B.x) / 2, side: rint(2) ? 1 : -1 });
        made++;
      }
    }
    // the rest: stars, event cards and shops, spread out a little
    const want2 = kid ? [['star', 8], ['event', 5]] : [['star', 6], ['event', 7], ['shop', 3]];
    const free = sq.filter(s => s.type === 'normal' && !s.dest && s.i > 1 && s.i < N - 1);
    for (let i = free.length - 1; i > 0; i--) { const k = rint(i + 1); [free[i], free[k]] = [free[k], free[i]]; }
    for (const [type, n] of want2) {
      let made = 0;
      for (const s of free) {
        if (made >= n) break;
        if (s.type !== 'normal') continue;
        const nb = [sq[s.i - 1], sq[s.i + 1]].filter(Boolean);
        if (nb.some(q => q.type === type)) continue;
        if (type === 'shop' && sq.some(q => q.type === 'shop' && Math.abs(q.i - s.i) < 8)) continue;
        s.type = type; made++;
      }
    }
    // the dense centreline (for the road under the squares)
    return { sq, links, rad, sp, pts, N };
  }
  /* a slide is a curvy chute from the top square to the bottom one */
  function slideCurve(A, B, side) {
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, off = 70 * side;
    return [[A.x, A.y], [mx + off, A.y + (B.y - A.y) * 0.2], [mx - off, A.y + (B.y - A.y) * 0.8], [B.x, B.y]];
  }
  function bez(P, u) {
    const v = 1 - u;
    return [v * v * v * P[0][0] + 3 * v * v * u * P[1][0] + 3 * v * u * u * P[2][0] + u * u * u * P[3][0], v * v * v * P[0][1] + 3 * v * v * u * P[1][1] + 3 * v * u * u * P[2][1] + u * u * u * P[3][1]];
  }

  function bgLayer(self, g, paint) {
    const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
    if (!self.bgCv || self.bgS !== s) {
      const c = self.bgCv || document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(H * s);
      const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 0, 0); paint(cg); self.bgCv = c; self.bgS = s;
    }
    g.drawImage(self.bgCv, 0, 0, W, H);
  }
  function wave(g, y0, amp, ph, col, x1) {
    g.fillStyle = col; g.beginPath(); g.moveTo(-10, H + 10);
    for (let x = -10; x <= (x1 || W) + 20; x += 20) g.lineTo(x, y0 + Math.sin(x * 0.009 + ph) * amp + Math.sin(x * 0.023 + ph * 2) * amp * 0.4);
    g.lineTo((x1 || W) + 20, H + 10); g.closePath(); g.fill();
  }
  function house(g, x, y, k, i) {
    const body = ['#fff1d6', '#ffe0ea', '#e0f2ff', '#fef9c3', '#e9e3ff'][i % 5], roof = ['#e8505b', '#f08a24', '#3b82c4', '#8b5cf6', '#16a34a'][(i * 3) % 5];
    const w = 52 * k, h = 38 * k;
    g.fillStyle = 'rgba(40,60,20,.22)'; g.beginPath(); g.ellipse(x + 4, y + 2, w * 0.62, 7 * k, 0, 0, TAU); g.fill();
    g.fillStyle = body; g.fillRect(x - w / 2, y - h, w, h);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + w * 0.18, y - h, w * 0.32, h);
    g.fillStyle = roof; g.beginPath(); g.moveTo(x - w * 0.62, y - h + 2); g.lineTo(x, y - h - 30 * k); g.lineTo(x + w * 0.62, y - h + 2); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(x - w * 0.5, y - h); g.lineTo(x, y - h - 26 * k); g.lineTo(x - w * 0.1, y - h); g.fill();
    if (i % 2) { g.fillStyle = '#8a5a3c'; g.fillRect(x + w * 0.18, y - h - 26 * k, 8 * k, 16 * k); }
    g.fillStyle = '#9a6a42'; g.beginPath(); g.roundRect(x - 7 * k, y - 22 * k, 14 * k, 22 * k, [6 * k, 6 * k, 0, 0]); g.fill();
    g.fillStyle = '#8fd3ff'; g.fillRect(x - w * 0.38, y - h * 0.72, 11 * k, 10 * k); g.fillRect(x + w * 0.38 - 11 * k, y - h * 0.72, 11 * k, 10 * k);
    g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(x - w * 0.38, y - h * 0.72, 11 * k, 10 * k); g.strokeRect(x + w * 0.38 - 11 * k, y - h * 0.72, 11 * k, 10 * k);
  }
  function tree(g, x, y, k, i) {
    g.fillStyle = 'rgba(20,50,20,.25)'; g.beginPath(); g.ellipse(x + 3, y + 1, 20 * k, 6 * k, 0, 0, TAU); g.fill();
    g.fillStyle = '#8a5a34'; g.fillRect(x - 4 * k, y - 22 * k, 8 * k, 22 * k);
    if (i % 3 === 0) {   // a pine
      for (let l = 0; l < 3; l++) { g.fillStyle = l % 2 ? '#2f8f46' : '#267a3b'; g.beginPath(); g.moveTo(x - (26 - l * 6) * k, y - (16 + l * 18) * k); g.lineTo(x, y - (50 + l * 16) * k); g.lineTo(x + (26 - l * 6) * k, y - (16 + l * 18) * k); g.closePath(); g.fill(); }
    } else {
      g.fillStyle = '#2f9a4a'; g.beginPath(); g.arc(x, y - 44 * k, 24 * k, 0, TAU); g.arc(x - 15 * k, y - 32 * k, 16 * k, 0, TAU); g.arc(x + 15 * k, y - 32 * k, 16 * k, 0, TAU); g.fill();
      g.fillStyle = '#4cbf62'; g.beginPath(); g.arc(x - 7 * k, y - 50 * k, 12 * k, 0, TAU); g.fill();
      if (i % 4 === 1) { g.fillStyle = '#ff5a5f'; for (const [u, v] of [[-10, -40], [8, -52], [12, -34]]) { g.beginPath(); g.arc(x + u * k, y + v * k, 3.5 * k, 0, TAU); g.fill(); } }
    }
  }
  function flower(g, x, y, c, k) {
    g.fillStyle = c; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 4 * k, y + Math.sin(a) * 4 * k, 3 * k, 0, TAU); g.fill(); }
    g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(x, y, 2.4 * k, 0, TAU); g.fill();
  }

  class Board {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = null; this.edge = '#7cc35a';
      const n = ctx.players.length; this.solo = n === 1;
      this.N = this.kid ? 32 : 48; this.maxRounds = this.kid ? 10 : 14; this.round = 1;
      const B = buildBoard(this.N, this.kid); Object.assign(this, { sq: B.sq, links: B.links, rad: B.rad, pts: B.pts });
      this.tokR = this.kid ? 27 : 24;
      this.es = ctx.players.map((p, i) => ({ p, i, pos: 0, stars: this.kid ? 0 : 2, skip: false, lucky: false, cheer: 0, cheers: 0, cheerCd: 0, anim: null, x: 0, y: 0, face: Math.PI / 2, stun: 0, step: 0, moving: false, sq: 0, sqv: 0, items: 0 }));
      this.es.forEach(e => { const o = this.slotPos(e); e.x = o[0]; e.y = o[1]; });
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.cur = 0; this.phase = 'start'; this.pt = 0; this.timers = []; this.status = '準備開始…';
      this.banana = new Set(); this.dice = null; this.lastDice = null; this.card = null; this.shop = null; this.msg = null;
      this.parts = []; this.cheerLog = []; this.cheerTotal = 0; this.winner = null; this.target = -1; this.again = false; this.againUsed = false;
      this.clouds = [[260, 120, 0.9], [760, 90, 1.1], [1150, 140, 0.8]].map(([x, y, s]) => ({ x, y, s }));
      this.later(0.7, () => this.beginTurn());
    }
    get active() { return this.es[this.cur]; }
    later(t, fn) { this.timers.push({ t, fn }); }
    ribbon(text, col, T, big, who) { this.msg = { text, col, t: 0, T: T || 1.8, big: !!big, who: who || null }; }
    say(n, a) { this.ctx.sfx(n, a); }

    /* ---------------- where a token stands ---------------- */
    slotPos(e) {
      const s = this.sq[e.pos], here = this.es.filter(q => q.pos === e.pos && !q.anim), k = here.indexOf(e), m = here.length;
      if (m <= 1 || k < 0) return [s.x, s.y - 6];
      const a = -Math.PI / 2 + k * TAU / m + (m === 2 ? Math.PI / 2 : 0), R = this.rad * (m > 3 ? 0.5 : 0.42);
      return [s.x + Math.cos(a) * R, s.y - 6 + Math.sin(a) * R * 0.75];
    }
    animate(e, a, end) { a.t = 0; a.end = end; e.anim = a; }
    hopTo(e, to, end) {
      const a = [e.x, e.y], b = this.sq[to], T = this.kid ? 0.34 : 0.28;
      e.face = Math.atan2(b.y - a[1], b.x - a[0]);
      this.animate(e, { kind: 'arc', x0: a[0], y0: a[1], x1: b.x, y1: b.y - 6, T, H: 46 }, end);
    }
    flyTo(e, to, T, H, end) { const b = this.sq[to]; this.animate(e, { kind: 'arc', x0: e.x, y0: e.y, x1: b.x, y1: b.y - 6, T, H }, end); }
    animPos(e) {
      const a = e.anim, u = clamp(a.t / a.T, 0, 1);
      if (a.kind === 'arc') { const k = a.H > 80 ? ease(u) : u; return [a.x0 + (a.x1 - a.x0) * k, a.y0 + (a.y1 - a.y0) * k, a.H * 4 * k * (1 - k)]; }
      if (a.kind === 'ladder') { const k = ease(u), bob = Math.abs(Math.sin(u * Math.PI * 6)) * 8; return [a.x0 + (a.x1 - a.x0) * k, a.y0 + (a.y1 - a.y0) * k, bob]; }
      if (a.kind === 'slide') { const k = u * u, p = bez(a.P, k); return [p[0], p[1] - 6, 0]; }
      return [e.x, e.y, 0];
    }

    /* ---------------- turn flow ---------------- */
    beginTurn() {
      const e = this.active; this.againUsed = this.again ? this.againUsed : false;
      this.target = -1; this.card = this.card && this.card.outT != null ? this.card : null;
      if (e.skip) {
        e.skip = false; this.phase = 'skip'; this.status = '下雨了，休息一回合';
        this.ribbon(e.p.name + ' 休息一回合', '#475569', 1.7, this.kid, e); this.say('stun');
        this.later(1.9, () => this.endTurn());
        return;
      }
      this.phase = 'wait'; this.pt = 0; this.status = online(e.p) ? (e.lucky ? '幸運骰！按手機擲兩顆' : '按手機擲骰子！') : '不在線上，等一下自動擲';
      if (!this.again) this.ribbon('輪到 ' + e.p.name + '！', PARTY_COLORS[e.p.col].d, this.kid ? 2.2 : 1.6, this.kid, e);
      this.again = false;
      this.say('join'); this.ctx.buzz(e.p, 160);
      e.sq = -0.2; e.sqv = 0;
    }
    waitLimit(e) { return !online(e.p) ? 5 : this.kid ? 8 : 20; }
    press(e) {
      const A = this.active;
      if (e === A) { if (this.phase === 'wait') this.roll(false); return; }
      if (this.phase === 'end' || e.cheerCd > 0) return;
      // everyone else cheers the active player on
      e.cheerCd = 0.14; e.cheer = 0.6; e.cheers++; this.cheerTotal++; e.sq = -0.18; e.sqv = 0;
      if (this.parts.length < 150) this.parts.push({ k: 'note', x: e.x + rnd(-12, 12), y: e.y - this.tokR - 10, vx: rnd(-30, 30), vy: -90, t: 0, life: 1.1, col: PARTY_COLORS[e.p.col].d, r: rnd(18, 26) });
      const last = this.cheerLog[0];
      if (last && last.e === e) { last.t = 0; last.n++; } else { this.cheerLog.unshift({ e, t: 0, n: 1 }); if (this.cheerLog.length > 3) this.cheerLog.pop(); }
      if (sndOK() && e.cheers % 2) Sfx.tone(700 + e.p.animal * 70 + rnd(-30, 30), 0.08, 'triangle', 0.06, 900 + e.p.animal * 60);
    }
    roll(auto) {
      const e = this.active, two = e.lucky; e.lucky = false;
      this.phase = 'roll'; this.pt = 0; this.status = '擲骰子…';
      if (auto) Fx.pop(e.x, e.y - 70, '自動擲骰！', INK, 30);
      const mk = i => ({ v: 1 + rint(6), a: (rnd(3, 5) * Math.PI) * (rint(2) ? 1 : -1), b: rnd(3, 5) * Math.PI * (rint(2) ? 1 : -1), c: rnd(-1.5, 1.5), off: two ? (i ? 92 : -92) : 0 });
      this.dice = { list: two ? [mk(0), mk(1)] : [mk(0)], t: 0, landed: false, fly: -1, bounce: 0 };
      this.lastDice = null;
      e.sq = 0.25; e.sqv = 0; this.ctx.buzz(e.p, 40);
      if (sndOK()) Sfx.noise(0.25, 0.12, 2400, 1.4);
    }
    rollT() { return this.kid ? 1.15 : 1.0; }
    landDice() {
      const d = this.dice, e = this.active, sum = d.list.reduce((s, x) => s + x.v, 0);
      d.landed = true; d.sum = sum;
      Fx.shake(11); this.ctx.hitstop(0.05);
      if (sndOK()) { Sfx.noise(0.22, 0.32, 170, 0.7); Sfx.tone(130, 0.22, 'sine', 0.3, 55); }
      for (const x of d.list) for (let k = 0; k < 6; k++) Fx.dust(DX + x.off + rnd(-60, 60), DY + 66, 'rgba(255,255,255,.85)', 14);
      Fx.pop(DX, DY - 120, (d.list.length > 1 ? d.list.map(x => x.v).join(' + ') + ' = ' : '') + sum + ' 步！', PARTY_COLORS[e.p.col].d, this.kid ? 64 : 52);
      this.target = Math.min(this.N - 1, e.pos + sum);
      this.later(0.62, () => { d.fly = 0; this.lastDice = d; this.move(e, sum, 1, 'dice', () => this.arrive(e, 0)); });
    }
    move(e, n, dir, cause, done) {
      this.phase = 'move'; this.status = dir > 0 ? `前進 ${n} 格！` : `退後 ${n} 格…`;
      let count = 0;
      const step = () => {
        if (n <= 0 || (dir < 0 && e.pos <= 0) || (dir > 0 && e.pos >= this.N - 1)) return done();
        const to = e.pos + dir;
        this.hopTo(e, to, () => {
          e.pos = to; n--; count++; e.sq = 0.22; e.sqv = 0;
          const s = this.sq[to];
          Fx.dust(s.x - 10, s.y + this.tokR * 0.6, 'rgba(255,255,255,.8)', 9); Fx.dust(s.x + 10, s.y + this.tokR * 0.6, 'rgba(255,255,255,.8)', 9);
          if (sndOK()) Sfx.tone(dir > 0 ? 480 + Math.min(count, 10) * 48 : 560 - count * 50, 0.09, 'triangle', 0.13, dir > 0 ? 640 + count * 48 : 380);
          if (e.pos >= this.N - 1) return this.win(e);
          if (dir > 0 && cause === 'dice' && this.banana.has(e.pos)) {   // 🍌 slip!
            this.banana.delete(e.pos); e.stun = 1.0; this.target = -1;
            Fx.pop(s.x, s.y - 70, '滑倒了！', '#c99400', 40); Fx.burst(s.x, s.y, '#ffd43b', 12, 220); Fx.shake(7); this.say('splat');
            this.ctx.buzz(e.p, 200);
            return this.later(0.7, () => this.move(e, 2, -1, 'slip', done));
          }
          step();
        });
      };
      step();
    }
    arrive(e, depth) {
      this.target = -1;
      const s = this.sq[e.pos], P = PARTY_COLORS[e.p.col];
      if (s.type === 'star') {
        e.stars++; Fx.pop(s.x, s.y - 70, '+1 星星！', '#d99a00', 42); Fx.burst(s.x, s.y - 20, '#ffd43b', 16, 280); Fx.ring(s.x, s.y, '#ffe066', 90); this.say('star');
        this.status = '拿到一顆星星！'; e.sq = -0.25; e.sqv = 0;
        return this.later(1.0, () => this.endTurn());
      }
      if (s.type === 'ladder' || s.type === 'slide') {
        const L = this.links.find(l => l.from === e.pos), to = this.sq[s.link], up = s.type === 'ladder';
        this.phase = 'busy'; this.status = up ? '爬梯子，往上爬！' : '溜滑梯，咻～';
        Fx.pop(s.x, s.y - 70, up ? '爬梯子！' : '溜滑梯～', up ? '#2f9e44' : '#e0681a', 42);
        if (up) { this.say('coin'); if (sndOK()) [523, 659, 784, 1047].forEach((f, i) => Sfx.tone(f, 0.12, 'triangle', 0.1, 0, 0.12 + i * 0.13)); }
        else { this.say('whoosh'); if (sndOK()) Sfx.tone(900, 0.8, 'sine', 0.1, 220); }
        const a = up ? { kind: 'ladder', x0: s.x, y0: s.y - 6, x1: to.x, y1: to.y - 6, T: 1.0 } : { kind: 'slide', P: slideCurve(s, to, L ? L.side : 1), T: 0.95 };
        return this.later(0.35, () => this.animate(e, a, () => {
          e.pos = s.link; e.sq = 0.3; e.sqv = 0;
          if (up) { Fx.burst(to.x, to.y - 10, '#8be27f', 14, 240); Fx.ring(to.x, to.y, '#2f9e44', 80); }
          else { for (let k = 0; k < 6; k++) Fx.dust(to.x, to.y + 14, 'rgba(255,255,255,.85)', 12); Fx.shake(5); e.stun = 0.6; }
          if (e.pos >= this.N - 1) return this.win(e);
          this.later(0.5, () => this.endTurn());
        }));
      }
      if (s.type === 'event' && depth === 0) return this.drawCard(e);
      if (s.type === 'shop' && depth === 0 && !this.kid) return this.openShop(e);
      this.later(depth ? 0.5 : 0.4, () => this.endTurn());
      void P;
    }
    /* ---------------- ❓ event cards ---------------- */
    drawCard(e) {
      const pool = [];
      for (const id in EVENTS) {
        const E = EVENTS[id], w = E.w[this.kid ? 0 : 1];
        if (!w || (E.multi && this.solo)) continue;
        if (id === 'again' && this.againUsed) continue;
        if (id === 'steal' && !this.es.some(q => q !== e && q.stars > 0)) continue;
        for (let k = 0; k < w; k++) pool.push(id);
      }
      const id = pool[rint(pool.length)], E = EVENTS[id], card = { id, E, t: 0, a: E.a, b: E.b, q: null, done: false, outT: null };
      if (id === 'swap') {
        const others = this.es.filter(q => q !== e && q.pos !== e.pos);
        card.q = others.length ? others[rint(others.length)] : null;
        card.b = card.q ? '跟 ' + card.q.p.name + ' 換位子' : '大家都在同一格，沒得換';
      }
      if (id === 'steal') {
        const rich = this.es.filter(q => q !== e && q.stars > 0).sort((a, b) => b.stars - a.stars);
        card.q = rich[0] || null; card.b = card.q ? '從 ' + card.q.p.name + ' 拿 1 顆' : '大家都沒有星星';
      }
      this.card = card; this.phase = 'card'; this.status = '抽到事件卡！';
      this.say('pop'); if (sndOK()) Sfx.noise(0.3, 0.1, 3000, 2);
      const hold = this.kid ? 2.9 : 2.4;
      this.later(0.55, () => { if (sndOK()) Sfx.tone(520, 0.1, 'triangle', 0.12, 1040); });
      this.later(hold, () => { card.outT = 0; this.applyCard(e, card); });
    }
    applyCard(e, c) {
      const done = () => this.later(0.45, () => this.endTurn());
      const s = this.sq[e.pos];
      switch (c.id) {
        case 'wind': case 'bird': return this.move(e, c.id === 'wind' ? 3 : 2, 1, 'event', () => this.arrive(e, 1));
        case 'lost': case 'mud': this.say('stun'); e.stun = 0.8; return this.move(e, c.id === 'lost' ? 2 : 3, -1, 'event', () => this.arrive(e, 1));
        case 'bag': e.stars += 2; Fx.pop(s.x, s.y - 70, '+2 星星！', '#d99a00', 44); Fx.burst(s.x, s.y - 20, '#ffd43b', 20, 300); this.say('star'); return done();
        case 'all':
          for (const q of this.es) { q.stars++; q.cheer = 0.8; Fx.pop(q.x, q.y - 60, '+1', '#d99a00', 34); Fx.burst(q.x, q.y - 20, '#ffd43b', 8, 200); }
          this.say('star'); return done();
        case 'again': this.again = true; this.againUsed = true; this.say('go'); this.status = '再擲一次！'; return done();
        case 'rain': e.skip = true; this.say('stun'); this.status = '下一回合要休息'; Fx.pop(s.x, s.y - 70, '下回合休息', '#475569', 36); return done();
        case 'swap': {
          const q = c.q; if (!q || q.pos === e.pos) return done();
          this.phase = 'busy'; this.say('whoosh');
          const pe = e.pos, pq = q.pos; let n = 2;
          const fin = () => { if (--n) return; e.pos = pq; q.pos = pe; Fx.ring(e.x, e.y, '#0891b2', 80); Fx.ring(q.x, q.y, '#0891b2', 80); done(); };
          this.flyTo(e, pq, 1.0, 160, fin); this.flyTo(q, pe, 1.0, 160, fin);
          return;
        }
        case 'steal': {
          const q = c.q; if (!q) return done();
          q.stars = Math.max(0, q.stars - 1); e.stars++; q.stun = 0.9; e.cheer = 0.9;
          if (this.parts.length < 150) this.parts.push({ k: 'star', x0: q.x, y0: q.y - 40, x1: e.x, y1: e.y - 40, t: 0, life: 0.8 });
          this.say('coin'); Fx.pop(q.x, q.y - 60, '-1', '#be123c', 34); this.later(0.8, () => { Fx.pop(e.x, e.y - 60, '+1 星星', '#d99a00', 36); this.say('star'); });
          return this.later(0.6, done);
        }
      }
      done();
    }
    /* ---------------- 🛒 the shop (大人) ---------------- */
    openShop(e) {
      this.shop = { e, t: 0, choice: null }; this.phase = 'shop'; this.status = '逛商店中…';
      this.say('coin'); this.ctx.buzz(e.p, 120);
    }
    canBuy(e, it) { return it.id === 'none' || e.stars >= it.cost; }
    onChoose(p, id) {
      const sh = this.shop; if (this.phase !== 'shop' || !sh || sh.choice || sh.e.p !== p) return;
      const it = ITEMS.find(x => x.id === id); if (!it || !this.canBuy(sh.e, it)) return;
      this.buy(it);
    }
    buy(it) {
      const sh = this.shop, e = sh.e, s = this.sq[e.pos]; sh.choice = it.id; sh.ct = 0;
      if (it.id === 'none') { this.say('pop'); return this.later(0.9, () => { this.shop = null; this.endTurn(); }); }
      e.stars -= it.cost; e.items++; this.say('coin'); Fx.pop(s.x, s.y - 70, '-' + it.cost + ' 星星', '#2389c9', 34);
      this.later(1.1, () => {
        this.shop = null;
        if (it.id === 'luck') { e.lucky = true; Fx.pop(e.x, e.y - 70, '下次擲兩顆！', '#16a34a', 40); this.say('star'); this.later(0.8, () => this.endTurn()); }
        else if (it.id === 'banana') {
          const b = Math.max(1, e.pos - 1), bs = this.sq[b];
          if (b < this.N - 1 && bs.type !== 'ladder' && bs.type !== 'slide') { this.banana.add(b); Fx.pop(bs.x, bs.y - 50, '放好香蕉皮！', '#c99400', 34); }
          this.say('splat'); this.later(0.8, () => this.endTurn());
        } else if (it.id === 'rocket') {
          const to = Math.min(this.N - 1, e.pos + 5); this.phase = 'busy'; this.status = '坐火箭，咻！';
          e.rocket = 1; this.say('boom'); Fx.shake(9); if (sndOK()) Sfx.tone(200, 1.0, 'sawtooth', 0.06, 900);
          this.flyTo(e, to, 1.1, 220, () => {
            e.pos = to; e.rocket = 0; Fx.burst(e.x, e.y, '#ff9f1c', 16, 280); Fx.shake(8); this.say('bonk', 1);
            if (to >= this.N - 1) return this.win(e);
            this.arrive(e, 1);
          });
        }
      });
    }
    endTurn() {
      if (this.phase === 'end' || this.over) return;
      if (this.again) { this.ribbon(this.active.p.name + ' 再擲一次！', '#7c3aed', 1.4, this.kid); this.phase = 'next'; return this.later(0.9, () => this.beginTurn()); }
      this.phase = 'next'; this.status = '';
      this.later(0.45, () => {
        this.cur = (this.cur + 1) % this.es.length;
        if (this.cur === 0) {
          this.round++;
          if (this.round > this.maxRounds) { this.round = this.maxRounds; return this.endGame(); }
          if (this.round === this.maxRounds) { this.ribbon('最後一回合！', '#e11d48', 1.6, true); return this.later(1.5, () => this.beginTurn()); }
        }
        this.beginTurn();
      });
    }
    win(e) {
      this.phase = 'end'; this.winner = e; this.target = -1; e.pos = this.N - 1; e.anim = null;
      this.status = '到達城堡了！';
      const s = this.sq[this.N - 1];
      Fx.flash('#fff', 0.5); Fx.shake(10); Fx.burst(s.x, s.y - 30, '#ffd43b', 26, 360); Fx.ring(s.x, s.y, PARTY_COLORS[e.p.col].c, 140);
      this.ribbon(e.p.name + ' 到達城堡！', PARTY_COLORS[e.p.col].d, 3.4, true, e);
      this.say('win'); this.ctx.buzz(e.p, 400);
      for (let k = 0; k < 90; k++) this.parts.push({ k: 'conf', x: rnd(0, PX0), y: rnd(-200, -10), vx: rnd(-40, 40), vy: rnd(120, 260), a: rnd(0, TAU), va: rnd(-6, 6), t: 0, life: 4, col: CONF[k % CONF.length] });
      this.endText = '到達城堡！'; this.later(3.6, () => { this.over = true; });
    }
    endGame() {
      this.phase = 'end'; this.status = '回合用完了！';
      const best = this.es.slice().sort((a, b) => (b.pos - a.pos) || (b.stars - a.stars))[0];
      this.winner = this.solo ? null : best;
      this.ribbon('回合用完了！走最遠的人贏', '#e11d48', 2.6, true);
      this.say('end');
      this.endText = '回合用完！'; this.later(2.8, () => { this.over = true; });
    }

    /* ---------------- update ---------------- */
    update(dt) {
      const ctx = this.ctx; this.t += dt; this.pt += dt;
      for (const e of this.es) {
        if (ctx.pressed(e.p, 0)) this.press(e);
        e.cheer = Math.max(0, e.cheer - dt); e.cheerCd -= dt; e.stun = Math.max(0, e.stun - dt);
        e.sqv += (-e.sq * 300 - e.sqv * 13) * dt; e.sq += e.sqv * dt;
        if (e.anim) { const a = e.anim; a.t += dt; if (a.t >= a.T) { const p = this.animPos(e); e.x = p[0]; e.y = p[1]; e.anim = null; if (a.end) a.end(); } }
      }
      const due = []; this.timers = this.timers.filter(tm => { tm.t -= dt; if (tm.t <= 0) { due.push(tm); return false; } return true; });
      for (const tm of due) tm.fn();
      if (this.phase === 'wait' && this.pt >= this.waitLimit(this.active)) this.roll(true);
      if (this.phase === 'shop' && this.shop && !this.shop.choice) {
        this.shop.t += dt;
        if (this.shop.t >= (online(this.shop.e.p) ? 15 : 2)) this.buy(ITEMS[3]);
      }
      if (this.dice) {
        const d = this.dice; d.t += dt;
        if (!d.landed) {
          const T = this.rollT(), k = d.t / T, b = Math.floor(k * 2.6 + 0.5);
          if (b !== d.bounce && k < 0.95) { d.bounce = b; if (sndOK() && b > 0) Sfx.tone(300 + rnd(0, 120), 0.05, 'square', 0.05); }
          if (d.t >= T) this.landDice();
        }
        if (d.fly >= 0 && d.fly < 1) d.fly = Math.min(1, d.fly + dt / 0.4);
      }
      if (this.card) { this.card.t += dt; if (this.card.outT != null) { this.card.outT += dt; if (this.card.outT > 0.4) this.card = null; } }
      if (this.shop && this.shop.choice) this.shop.ct += dt;
      if (this.msg) { this.msg.t += dt; if (this.msg.t > this.msg.T) this.msg = null; }
      for (const c of this.cheerLog) c.t += dt; this.cheerLog = this.cheerLog.filter(c => c.t < 3);
      // tokens glide to their spot on the square (they share squares politely)
      const k = 1 - Math.exp(-dt * 12);
      for (const e of this.es) {
        if (e.anim) { const p = this.animPos(e); e.x = p[0]; e.y = p[1]; e.h = p[2]; e.moving = true; e.step += dt * 14; if (e.rocket && this.parts.length < 160) this.parts.push({ k: 'fire', x: e.x + rnd(-8, 8), y: e.y - e.h + 20, vx: rnd(-30, 30), vy: rnd(40, 120), t: 0, life: 0.45, r: rnd(6, 12), col: rint(2) ? '#ff9f1c' : '#ffd43b' }); }
        else { const o = this.slotPos(e); e.x += (o[0] - e.x) * k; e.y += (o[1] - e.y) * k; e.h = 0; e.moving = Math.hypot(o[0] - e.x, o[1] - e.y) > 2; if (e.moving) e.step += dt * 10; }
      }
      for (const p of this.parts) {
        p.t += dt;
        if (p.k === 'conf') { p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; p.vx += Math.sin(p.t * 3 + p.a) * 20 * dt; }
        else if (p.k === 'note' || p.k === 'fire') { p.x += p.vx * dt; p.y += p.vy * dt; }
      }
      this.parts = this.parts.filter(p => p.t < p.life && (p.k !== 'conf' || p.y < H + 20));
      for (const c of this.clouds) { c.x += dt * 9 * c.s; if (c.x > PX0 + 60) c.x = -140; }
    }

    /* ---------------- drawing ---------------- */
    paintBg(g) {
      const kid = this.kid, R = this.rad;
      // sky, mountains, then the zones from back to front
      let gr = g.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, '#8fd3ff'); gr.addColorStop(1, '#e3f5ff'); g.fillStyle = gr; g.fillRect(0, 0, W, 300);
      const peaks = [[300, 168, 150], [470, 132, 170], [660, 176, 140], [850, 120, 190], [1060, 160, 160], [1260, 136, 170], [1470, 170, 150]];
      for (const [x, y, w] of peaks) {
        g.fillStyle = '#9db8dc'; g.beginPath(); g.moveTo(x - w, 300); g.lineTo(x, y); g.lineTo(x + w, 300); g.closePath(); g.fill();
        g.fillStyle = '#86a3cc'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, 300); g.lineTo(x + w * 0.25, 300); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - w * 0.28, y + 42); g.lineTo(x, y); g.lineTo(x + w * 0.28, y + 42); g.lineTo(x + w * 0.1, y + 34); g.lineTo(x - 2, y + 46); g.lineTo(x - w * 0.12, y + 34); g.closePath(); g.fill();
      }
      wave(g, 236, 10, 0.4, '#b8de8f');
      wave(g, 268, 8, 1.7, '#a6d77f');
      wave(g, 388, 9, 2.2, '#6fbd57');
      wave(g, 556, 8, 0.9, '#b4df8c');
      wave(g, 706, 6, 2.6, '#7fcdf3');       // the river
      wave(g, 712, 5, 2.6, '#5ab8ee');
      wave(g, 756, 6, 1.1, '#e9d9a6');       // sandy bank
      wave(g, 764, 6, 1.1, '#9de27a');       // the meadow
      // river ripples
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let x = 40; x < PX0; x += 110) { const y = 733 + Math.sin(x * 0.03) * 6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 16, y - 6, x + 32, y); g.stroke(); }
      // a little texture: grass tufts and flowers
      const near = (x, y, m) => this.sq.some(s => Math.abs(s.x - x) < R + m && Math.abs(s.y - y) < R + m) || this.links.some(l => { const a = this.sq[l.from], b = this.sq[l.to]; return Math.abs((a.x + b.x) / 2 - x) < 60 + m && y > Math.min(a.y, b.y) - 10 && y < Math.max(a.y, b.y) + 10; });
      let seed = 7; const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 260; i++) {
        const x = rr() * PX0, y = 250 + rr() * 650;
        if (y > 700 && y < 766) continue;
        if (near(x, y, 4)) continue;
        if (y > 766 || (y > 556 && y < 700)) flower(g, x, y, ['#ffffff', '#ffe066', '#ff9fc4', '#c4b5fd'][i % 4], 0.9);
        else { g.strokeStyle = y < 388 ? '#8cc56a' : '#4f9e44'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 5, y + 4); g.lineTo(x - 2, y - 5); g.moveTo(x, y + 4); g.lineTo(x + 1, y - 8); g.moveTo(x + 5, y + 4); g.lineTo(x + 4, y - 4); g.stroke(); }
      }
      // rainbow + castle (the finish) at the top left
      const F = this.sq[this.N - 1];
      const rb = ['#ff5a5f', '#ff9f1c', '#ffd43b', '#4ade80', '#38bdf8', '#a78bfa'];
      g.lineWidth = 11; g.globalAlpha = 0.85;
      rb.forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(F.x + 20, F.y + 40, 214 - i * 11, Math.PI * 1.02, Math.PI * 1.98); g.stroke(); });
      g.globalAlpha = 1;
      this.castle(g, F.x, F.y - R + 6);
      // the start: a bunch of balloons tied next to the first square
      const S0 = this.sq[0];
      g.strokeStyle = 'rgba(60,40,20,.6)'; g.lineWidth = 2;
      [[-34, -64, '#ff5a5f'], [-12, -78, '#ffd43b'], [10, -62, '#38bdf8']].forEach(([u, v, c]) => {
        const bx = S0.x - R - 22 + u * 0.6, by = S0.y + v + 10;
        g.beginPath(); g.moveTo(S0.x - R - 14, S0.y + 20); g.quadraticCurveTo(bx + 6, by + 30, bx, by + 16); g.stroke();
        g.fillStyle = c; g.beginPath(); g.ellipse(bx, by, 13, 16, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(bx - 4, by - 6, 4, 6, -0.4, 0, TAU); g.fill();
      });
      // the road under the squares
      g.lineCap = g.lineJoin = 'round';
      const road = (w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); this.pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke(); };
      road(R * 1.25 + 12, 'rgba(60,40,20,.18)'); road(R * 1.25, '#e9d3a1'); road(R * 1.25 - 12, '#f3e2b8');
      // the bridge where the road crosses the river
      const br = this.pts.filter(p => p.turn && p.row === 0 && p.y > 690 && p.y < 772);
      if (br.length) {
        const bx = br.reduce((s, p) => s + p.x, 0) / br.length;
        g.fillStyle = '#a5683a'; g.fillRect(bx - R * 0.95, 696, R * 1.9, 80);
        g.fillStyle = '#c98a55'; for (let y = 700; y < 774; y += 12) g.fillRect(bx - R * 0.95 + 3, y, R * 1.9 - 6, 8);
        g.fillStyle = '#7a4a26'; g.fillRect(bx - R * 0.95 - 6, 690, 8, 92); g.fillRect(bx + R * 0.95 - 2, 690, 8, 92);
      }
      // houses between the village and forest rows, trees between the forest and mountain rows
      const gapH = (ROWS[1] - R) - (ROWS[2] + R), hk = clamp(gapH / 92, 0.62, 1);
      const linkNear = (band, x, m) => this.links.some(l => l.band === band && Math.abs(l.x - x) < m);
      let hi = 0;
      for (let x = 215; x < XR - 30; x += 92 * hk + 18) { if (linkNear(1, x, 64)) continue; house(g, x + (hi % 2 ? 6 : -6), ROWS[1] - R - 8, hk, hi++); }
      this.mill = [XR + 82, ROWS[1] - R - 10, hk];
      this.millBody(g);
      let ti = 0;
      for (let x = 60; x < XR - 40; x += 58 + (ti % 3) * 6) { if (linkNear(2, x, 52)) { ti++; continue; } tree(g, x, ROWS[2] - R - 4 + (ti % 2) * 4, clamp(((ROWS[2] - R) - (ROWS[3] + R)) / 86, 0.6, 1), ti++); }
      // lily pads in the river and flowers by the start
      for (let x = 80; x < XR; x += 170) { if (linkNear(0, x, 50)) continue; g.fillStyle = '#3fae5b'; g.beginPath(); g.arc(x, 740, 11, 0.4, TAU - 0.2); g.lineTo(x, 740); g.fill(); g.fillStyle = '#ff9fc4'; g.beginPath(); g.arc(x + 4, 737, 4, 0, TAU); g.fill(); }
      // ladders and slides go under the tiles' rims but over the road
      for (const l of this.links) this.drawLink(g, l);
      // the squares
      for (const s of this.sq) this.tile(g, s);
      // the notice board (static parts)
      g.fillStyle = '#7a4a26'; g.fillRect(PX0 + 30, 840, 16, 58); g.fillRect(PX1 - 46, 840, 16, 58);
      g.fillStyle = 'rgba(60,40,20,.25)'; g.beginPath(); g.roundRect(PX0 + 6, 160, PX1 - PX0, 700, 26); g.fill();
      g.fillStyle = '#c98a55'; g.beginPath(); g.roundRect(PX0, 150, PX1 - PX0, 700, 26); g.fill();
      g.fillStyle = '#fff8e7'; g.beginPath(); g.roundRect(PX0 + 12, 162, PX1 - PX0 - 24, 676, 18); g.fill();
      g.fillStyle = LIME; g.beginPath(); g.roundRect(PX0 + 26, 172, PX1 - PX0 - 52, 50, 25); g.fill();
      g.fillStyle = '#fff'; g.font = `900 28px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('動物大富翁', PX, 198);
      g.strokeStyle = '#ecdcbc'; g.lineWidth = 3;
      for (const y of [472, 662, 752]) { g.beginPath(); g.moveTo(PX0 + 30, y); g.lineTo(PX1 - 30, y); g.stroke(); }
      g.fillStyle = '#a0866a'; g.font = `700 19px ${FONT}`;
      g.fillText('骰子', PX, 492); g.fillText('回合', PX, 682); g.fillText('加油聲', PX, 772);
    }
    castle(g, x, y) {
      const wall = '#f3e6ff', shade = '#d9c6f2', roof = '#ff6fa8', roofD = '#d6458a';
      g.fillStyle = 'rgba(40,30,60,.18)'; g.beginPath(); g.ellipse(x, y + 6, 120, 16, 0, 0, TAU); g.fill();
      g.fillStyle = wall; g.fillRect(x - 70, y - 86, 140, 90);
      g.fillStyle = shade; g.fillRect(x + 20, y - 86, 50, 90);
      for (let k = -70; k < 70; k += 20) { g.fillStyle = wall; g.fillRect(x + k, y - 100, 12, 16); }
      for (const s of [-1, 1]) {
        const tx = x + s * 82;
        g.fillStyle = wall; g.fillRect(tx - 24, y - 120, 48, 124); g.fillStyle = shade; g.fillRect(tx + 6, y - 120, 18, 124);
        g.fillStyle = roof; g.beginPath(); g.moveTo(tx - 32, y - 118); g.lineTo(tx, y - 178); g.lineTo(tx + 32, y - 118); g.closePath(); g.fill();
        g.fillStyle = roofD; g.beginPath(); g.moveTo(tx, y - 178); g.lineTo(tx + 32, y - 118); g.lineTo(tx + 10, y - 118); g.closePath(); g.fill();
        g.fillStyle = '#7dd3fc'; g.beginPath(); g.roundRect(tx - 9, y - 96, 18, 24, [9, 9, 0, 0]); g.fill();
        g.strokeStyle = '#7a4a26'; g.lineWidth = 3; g.beginPath(); g.moveTo(tx, y - 178); g.lineTo(tx, y - 204); g.stroke();
        g.fillStyle = s < 0 ? '#ffd43b' : '#38bdf8'; g.beginPath(); g.moveTo(tx, y - 204); g.lineTo(tx + 24, y - 197); g.lineTo(tx, y - 190); g.fill();
      }
      g.fillStyle = roof; g.beginPath(); g.moveTo(x - 40, y - 96); g.lineTo(x, y - 150); g.lineTo(x + 40, y - 96); g.closePath(); g.fill();
      g.fillStyle = '#ffd43b'; star(g, x, y - 112, 13, '#ffe066', '#c98a00', 3);
      g.fillStyle = '#7a4a9a'; g.beginPath(); g.roundRect(x - 24, y - 52, 48, 56, [24, 24, 0, 0]); g.fill();
      g.fillStyle = '#9b6bc4'; g.beginPath(); g.roundRect(x - 18, y - 46, 36, 50, [18, 18, 0, 0]); g.fill();
    }
    millBody(g) {
      const [x, y, k] = this.mill;
      g.fillStyle = 'rgba(40,60,20,.22)'; g.beginPath(); g.ellipse(x + 3, y + 2, 34 * k, 8 * k, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff1d6'; g.beginPath(); g.moveTo(x - 24 * k, y); g.lineTo(x - 15 * k, y - 76 * k); g.lineTo(x + 15 * k, y - 76 * k); g.lineTo(x + 24 * k, y); g.closePath(); g.fill();
      g.fillStyle = '#e8505b'; g.beginPath(); g.moveTo(x - 22 * k, y - 74 * k); g.lineTo(x, y - 98 * k); g.lineTo(x + 22 * k, y - 74 * k); g.closePath(); g.fill();
      g.fillStyle = '#9a6a42'; g.beginPath(); g.roundRect(x - 7 * k, y - 22 * k, 14 * k, 22 * k, [6 * k, 6 * k, 0, 0]); g.fill();
    }
    drawLink(g, l) {
      const A = this.sq[l.from], B = this.sq[l.to], R = this.rad;
      if (l.kind === 'ladder') {
        const dx = B.x - A.x, dy = B.y - A.y, m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m, nx = -uy * 15, ny = ux * 15;
        const x0 = A.x + ux * R * 0.55, y0 = A.y + uy * R * 0.55, x1 = B.x - ux * R * 0.55, y1 = B.y - uy * R * 0.55;
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(40,30,10,.25)'; g.lineWidth = 10;
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x0 + nx * s + 6, y0 + ny * s + 6); g.lineTo(x1 + nx * s + 6, y1 + ny * s + 6); g.stroke(); }
        const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(3, Math.round(len / 20));
        g.strokeStyle = '#a5683a'; g.lineWidth = 6;
        for (let k = 1; k < n; k++) { const u = k / n, cx = x0 + (x1 - x0) * u, cy = y0 + (y1 - y0) * u; g.beginPath(); g.moveTo(cx - nx, cy - ny); g.lineTo(cx + nx, cy + ny); g.stroke(); }
        for (const s of [-1, 1]) { g.strokeStyle = '#7a4a26'; g.lineWidth = 9; g.beginPath(); g.moveTo(x0 + nx * s, y0 + ny * s); g.lineTo(x1 + nx * s, y1 + ny * s); g.stroke(); g.strokeStyle = '#c98a55'; g.lineWidth = 4; g.stroke(); }
      } else {
        const P = slideCurve(A, B, l.side), path = () => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); g.bezierCurveTo(P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]); };
        g.lineCap = 'round';
        g.save(); g.translate(6, 7); path(); g.strokeStyle = 'rgba(40,30,10,.22)'; g.lineWidth = 34; g.stroke(); g.restore();
        path(); g.strokeStyle = '#c2410c'; g.lineWidth = 34; g.stroke();
        path(); g.strokeStyle = '#ff922b'; g.lineWidth = 24; g.stroke();
        path(); g.strokeStyle = '#ffd8a8'; g.lineWidth = 6; g.stroke();
        // little stripes along the chute
        for (let k = 1; k < 10; k++) { const p = bez(P, k / 10); g.fillStyle = k % 2 ? '#fff4e6' : '#ff6b6b'; g.beginPath(); g.arc(p[0], p[1], 4, 0, TAU); g.fill(); }
      }
    }
    tile(g, s) {
      const R = this.rad, [c, d] = TT[s.type] || ZT[s.row], x = s.x, y = s.y;
      g.fillStyle = 'rgba(40,30,10,.22)'; g.beginPath(); g.roundRect(x - R + 3, y - R + 9, R * 2, R * 2, R * 0.38); g.fill();
      g.fillStyle = d; g.beginPath(); g.roundRect(x - R, y - R + 6, R * 2, R * 2, R * 0.38); g.fill();
      g.fillStyle = c; g.beginPath(); g.roundRect(x - R, y - R, R * 2, R * 2, R * 0.38); g.fill();
      g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.roundRect(x - R + 6, y - R + 5, R * 2 - 12, R * 0.5, R * 0.25); g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const T = s.type;
      if (T === 'normal') { g.fillStyle = d; g.font = `900 ${R * 0.62}px ${NUM}`; g.fillText(String(s.i), x, y + 3); }
      else if (T === 'star') star(g, x, y + 2, R * 0.62, '#fff8d0', '#d99a00', R * 0.1);
      else if (T === 'event') { g.font = `900 ${R * 1.15}px ${NUM}`; g.lineWidth = R * 0.14; g.strokeStyle = d; g.strokeText('?', x, y + 4); g.fillStyle = '#fff'; g.fillText('?', x, y + 4); }
      else if (T === 'shop') cart(g, x, y + 2, R * 0.55, '#fff');
      else if (T === 'ladder') arrow(g, x, y + 2, R * 0.5, -Math.PI / 2, '#fff', d);
      else if (T === 'slide') arrow(g, x, y + 2, R * 0.5, Math.PI / 2, '#fff', d);
      else if (T === 'start' || T === 'finish') { g.font = `900 ${R * 0.56}px ${FONT}`; g.fillStyle = '#fff'; g.lineWidth = 5; g.strokeStyle = d; g.strokeText(T === 'start' ? '起點' : '終點', x, y + 3); g.fillText(T === 'start' ? '起點' : '終點', x, y + 3); }
    }

    draw(g, t) {
      bgLayer(this, g, cg => this.paintBg(cg));
      const R = this.rad;
      // drifting clouds (in front of the mountains, behind the HUD)
      g.save(); g.beginPath(); g.rect(-400, 0, PX0 + 400, H); g.clip();
      for (const c of this.clouds) { g.globalAlpha = 0.85; cloud(g, c.x, c.y + 60, 46 * c.s); } g.globalAlpha = 1; g.restore();
      // windmill sails
      if (this.mill) {
        const [mx, my, k] = this.mill, a = t * 1.2;
        g.save(); g.translate(mx, my - 70 * k); g.rotate(a); g.fillStyle = '#fff'; g.strokeStyle = '#9a6a42'; g.lineWidth = 2;
        for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.rect(-5 * k, -48 * k, 14 * k, 40 * k); g.fill(); g.stroke(); }
        g.fillStyle = '#9a6a42'; g.beginPath(); g.arc(0, 0, 5 * k, 0, TAU); g.fill(); g.restore();
      }
      // river glints
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 6; i++) { const x = ((t * 40 + i * 230) % (PX0 + 60)) - 30; g.beginPath(); g.ellipse(x, 726 + (i % 3) * 9, 12, 2.5, 0, 0, TAU); g.fill(); }
      // bananas on the board
      for (const b of this.banana) { const s = this.sq[b]; banana(g, s.x + R * 0.35, s.y + R * 0.4, 18, -0.3 + Math.sin(t * 2 + b) * 0.08); }
      const A = this.active;
      // where the die says you'll stop
      if (this.target >= 0 && this.phase === 'move') {
        const s = this.sq[this.target], P = PARTY_COLORS[A.p.col];
        g.save(); g.setLineDash([12, 8]); g.lineDashOffset = -t * 40; g.strokeStyle = P.c; g.lineWidth = 6; g.beginPath(); g.roundRect(s.x - R - 6, s.y - R - 6, R * 2 + 12, R * 2 + 12, R * 0.45); g.stroke(); g.restore();
      }
      // the active player's glow
      if (A && this.phase !== 'end') {
        const P = PARTY_COLORS[A.p.col], pulse = 0.5 + 0.5 * Math.sin(t * 6);
        g.globalAlpha = 0.35 + pulse * 0.25; g.fillStyle = P.c; g.beginPath(); g.ellipse(A.x, A.y + this.tokR * 0.85, this.tokR * 1.5 + pulse * 6, this.tokR * 0.55 + pulse * 2, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
      // tokens, back to front, the moving one on top
      const list = this.es.slice().sort((a, b) => (!!a.anim - !!b.anim) || (a.y - b.y));
      for (const e of list) {
        const P = e.p, cheer = e.cheer > 0, hop = (e.h || 0) + (cheer ? Math.abs(Math.sin(e.cheer * 10)) * 12 : 0) + (this.winner === e && this.phase === 'end' ? Math.abs(Math.sin(t * 7)) * 26 : 0);
        const face = e.anim ? e.face : Math.PI / 2 + Math.sin(t * 0.7 + e.i) * 0.4;
        if (e.rocket) rocket(g, e.x, e.y - hop + 10, 26, 0);
        drawCritter(g, e.x, e.y - this.tokR * 0.15, this.tokR, P.col, P.animal, { face, hop, squash: e.sq, happy: cheer || (this.phase === 'end' && this.winner === e), stun: e.stun > 0, step: e.step, moving: e.moving, alpha: online(P) ? 1 : 0.55 });
        if (e === A && this.phase === 'wait') {
          const by = e.y - this.tokR * 2.3 - hop - Math.abs(Math.sin(t * 5)) * 10;
          arrow(g, e.x, by, 16, Math.PI / 2, PARTY_COLORS[P.col].c, '#fff');
        }
      }
      if (A && this.phase !== 'end' && !A.anim) drawTag(g, A.x, A.y - this.tokR * 2.1 - (this.phase === 'wait' ? 38 : 0), A.p);
      if (this.winner && this.phase === 'end') { const w = this.winner; drawTag(g, w.x, w.y - this.tokR * 2.4, w.p); }
      // particles: cheering notes, rocket fire, a stolen star, confetti
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const p of this.parts) {
        const k = p.t / p.life;
        if (p.k === 'note') { g.globalAlpha = 1 - k; g.font = `900 ${p.r}px ${FONT}`; g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText('♪', p.x, p.y); g.fillStyle = p.col; g.fillText('♪', p.x, p.y); }
        else if (p.k === 'fire') { g.globalAlpha = 1 - k; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r * (1 - k * 0.6), 0, TAU); g.fill(); }
        else if (p.k === 'star') { const u = ease(k); star(g, p.x0 + (p.x1 - p.x0) * u, p.y0 + (p.y1 - p.y0) * u - Math.sin(u * Math.PI) * 120, 22, '#ffd43b', '#c98a00', 4); }
        else if (p.k === 'conf') { g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.col; g.fillRect(-8, -4, 16, 8); g.restore(); }
      }
      g.globalAlpha = 1;
      this.drawPanel(g, t);
      this.drawDice(g, t);
      this.drawCardOverlay(g, t);
      this.drawShop(g, t);
      this.drawMsg(g);
    }
    drawPanel(g, t) {
      const A = this.active, P = PARTY_COLORS[A.p.col];
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const end = this.phase === 'end', who = end ? (this.winner || A) : A, WP = PARTY_COLORS[who.p.col];
      g.fillStyle = '#a0866a'; g.font = `700 20px ${FONT}`; g.fillText(end ? (this.winner ? '贏家' : '結束') : '輪到', PX, 244);
      // countdown ring round the big critter
      const cy = 326;
      g.fillStyle = mixCol(WP.c, 0.78); g.beginPath(); g.arc(PX, cy, 64, 0, TAU); g.fill();
      if (this.phase === 'wait') {
        const lim = this.waitLimit(A), left = lim - this.pt, show = this.kid || !online(A.p) || left <= 6;
        if (show) {
          const k = clamp(left / lim, 0, 1);
          g.strokeStyle = left < 3 ? '#ff3b4a' : WP.c; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.arc(PX, cy, 66, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(PX + 52, cy - 50, 20, 0, TAU); g.fill(); g.strokeStyle = WP.c; g.lineWidth = 3; g.stroke();
          g.fillStyle = INK; g.font = `900 22px ${NUM}`; g.fillText(String(Math.max(1, Math.ceil(left))), PX + 52, cy - 49);
        }
      }
      const bob = this.phase === 'wait' ? Math.abs(Math.sin(t * 4)) * 8 : end && this.winner ? Math.abs(Math.sin(t * 7)) * 14 : 0;
      drawCritter(g, PX, cy + 6, 46, who.p.col, who.p.animal, { hop: bob, happy: end || who.cheer > 0 || this.phase === 'wait', noShadow: true, step: 0, moving: false });
      g.font = `900 34px ${FONT}`; g.fillStyle = WP.d; g.fillText(who.p.name, PX, 414, PX1 - PX0 - 40);
      g.font = `700 20px ${FONT}`; g.fillStyle = INK;
      const st = end ? (this.winner ? (this.winner.pos >= this.N - 1 ? '到達城堡了！' : '走得最遠！') : '練習完成！') : this.status;
      g.fillText(st, PX, 448, PX1 - PX0 - 36);
      // the die that was just rolled
      if (this.lastDice && this.lastDice.fly >= 1) {
        const L = this.lastDice.list;
        L.forEach((x, i) => drawDie(g, SLOT[0] + (L.length > 1 ? (i ? 48 : -48) : 0), SLOT[1], L.length > 1 ? 30 : 38, mm(TILT, FACE_R[x.v])));
        if (L.length > 1) { g.font = `900 24px ${NUM}`; g.fillStyle = INK; g.fillText('= ' + this.lastDice.sum, PX, 644); }
        else { g.font = `900 24px ${NUM}`; g.fillStyle = INK; g.fillText(L[0].v + ' 步', PX, 644); }
      } else if (!this.dice || this.dice.fly >= 1 || !this.dice.list) {
        g.globalAlpha = 0.35; drawDie(g, SLOT[0], SLOT[1], 34, mm(TILT, FACE_R[1]), [230, 225, 215]); g.globalAlpha = 1;
      }
      if (A.lucky && !end) { clover(g, PX1 - 50, 520, 14); }
      // rounds
      g.fillStyle = INK; g.font = `900 40px ${NUM}`; g.fillText(this.round + ' / ' + this.maxRounds, PX, 716);
      // cheering
      g.font = `900 30px ${NUM}`; g.fillStyle = '#db2777'; g.fillText('♪ ' + this.cheerTotal, PX, 796);
      g.font = `700 18px ${FONT}`;
      this.cheerLog.slice(0, 1).forEach(c => { g.globalAlpha = c.t > 2.4 ? (3 - c.t) / 0.6 : 1; g.fillStyle = PARTY_COLORS[c.e.p.col].d; g.fillText(c.e.p.name + ' 在加油！' + (c.n > 1 ? ' ×' + c.n : ''), PX, 824, PX1 - PX0 - 40); });
      g.globalAlpha = 1;
      if (!this.cheerLog.length && !end && !this.solo) { g.fillStyle = '#a0866a'; g.font = `700 16px ${FONT}`; g.fillText('其他人按手機幫忙加油！', PX, 824, PX1 - PX0 - 44); }
      void P;
    }
    drawDice(g) {
      const d = this.dice; if (!d || d.fly >= 1) return;
      const T = this.rollT(), k = clamp(d.t / T, 0, 1), e = ease(k), n = d.list.length;
      const sz = this.kid ? 72 : 64;
      d.list.forEach((x, i) => {
        let cx = DX + x.off, cy = DY, s = sz;
        const hgt = d.landed ? 0 : 340 * Math.pow(1 - k, 1.5) * Math.abs(Math.cos(k * Math.PI * 2.6));
        if (d.fly >= 0) { const u = ease(d.fly), tx = SLOT[0] + (n > 1 ? (i ? 48 : -48) : 0), ty = SLOT[1]; cx += (tx - cx) * u; cy += (ty - cy) * u; s = sz + ((n > 1 ? 30 : 38) - sz) * u; }
        const lift = hgt + (d.landed && d.fly < 0 ? Math.max(0, 1 - (d.t - T) * 6) * -6 : 0);
        if (d.fly < 0) { g.fillStyle = 'rgba(30,20,50,.25)'; const sk = 1 - Math.min(0.6, hgt / 400); g.beginPath(); g.ellipse(cx, cy + s * 1.25, s * 1.25 * sk, s * 0.32 * sk, 0, 0, TAU); g.fill(); }
        const M = d.landed ? mm(TILT, FACE_R[x.v]) : dieMatrix(x.v, x.a, x.b, x.c, e);
        drawDie(g, cx + (d.landed ? 0 : (1 - e) * (i ? 90 : -90) * 0), cy - lift, s, M);
      });
    }
    drawCardOverlay(g, t) {
      const c = this.card; if (!c) return;
      const out = c.outT != null ? clamp(c.outT / 0.35, 0, 1) : 0, inK = clamp(c.t / 0.3, 0, 1), flip = clamp((c.t - 0.35) / 0.4, 0, 1);
      g.globalAlpha = 0.3 * inK * (1 - out); g.fillStyle = '#1e1b3a'; g.fillRect(-400, 0, W + 800, H); g.globalAlpha = 1 - out;
      const sc = (0.4 + 0.6 * back(inK)) * (1 - out * 0.25), sx = Math.max(0.02, Math.abs(Math.cos(flip * Math.PI))), front = flip > 0.5;
      const w = 470, h = 300;
      g.save(); g.translate(DX, DY - 20 - out * 40); g.rotate(Math.sin(t * 2) * 0.015); g.scale(sc * sx, sc);
      g.fillStyle = 'rgba(20,10,40,.3)'; g.beginPath(); g.roundRect(-w / 2 + 8, -h / 2 + 12, w, h, 28); g.fill();
      if (!front) {
        g.fillStyle = '#7c4ddb'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 28); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.roundRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 18); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.15)'; for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) { g.font = `900 40px ${NUM}`; g.fillText('?', i * 66, j * 80); }
        g.font = `900 150px ${NUM}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('?', 0, 8);
      } else {
        const E = c.E;
        g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 28); g.fill();
        g.strokeStyle = E.col; g.lineWidth = 8; g.stroke();
        g.fillStyle = E.col; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, 62, [28, 28, 0, 0]); g.fill();
        g.fillStyle = '#fff'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('事件卡', 0, -h / 2 + 32);
        g.fillStyle = mixCol(E.col, 0.85); g.beginPath(); g.arc(-w / 2 + 110, 34, 76, 0, TAU); g.fill();
        glyph(g, E.g, -w / 2 + 110, 34, 54);
        g.textAlign = 'left'; g.fillStyle = INK; g.font = `900 ${c.a.length > 6 ? 38 : 46}px ${FONT}`; g.fillText(c.a, -w / 2 + 206, 6, w - 226);
        g.fillStyle = E.col; g.font = `900 ${c.b.length > 9 ? 26 : 32}px ${FONT}`; g.fillText(c.b, -w / 2 + 206, 66, w - 226);
      }
      g.restore(); g.globalAlpha = 1;
    }
    drawShop(g, t) {
      const sh = this.shop; if (!sh) return;
      const e = sh.e, inK = ease(clamp(sh.t / 0.3, 0, 1)), w = 760, h = 400;
      g.globalAlpha = 0.3 * inK; g.fillStyle = '#1e1b3a'; g.fillRect(-400, 0, W + 800, H); g.globalAlpha = 1;
      g.save(); g.translate(DX, DY - 10); g.scale(0.6 + 0.4 * inK, 0.6 + 0.4 * inK);
      g.fillStyle = 'rgba(20,10,40,.3)'; g.beginPath(); g.roundRect(-w / 2 + 8, -h / 2 + 12, w, h, 30); g.fill();
      g.fillStyle = '#f0f9ff'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 30); g.fill(); g.strokeStyle = '#2389c9'; g.lineWidth = 8; g.stroke();
      // a striped awning
      g.save(); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, 70, [30, 30, 0, 0]); g.clip();
      for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#fff' : '#38bdf8'; g.fillRect(-w / 2 + i * w / 12, -h / 2, w / 12 + 1, 70); }
      g.restore();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 34px ${FONT}`; g.lineWidth = 8; g.strokeStyle = '#fff'; g.strokeText(e.p.name + ' 的商店時間', 0, -h / 2 + 36); g.fillStyle = '#0c4a6e'; g.fillText(e.p.name + ' 的商店時間', 0, -h / 2 + 36);
      star(g, -50, -h / 2 + 100, 16, '#ffd43b', '#c98a00', 3);
      g.font = `900 28px ${NUM}`; g.fillStyle = INK; g.textAlign = 'left'; g.fillText('× ' + e.stars, -28, -h / 2 + 101); g.textAlign = 'center';
      ITEMS.forEach((it, i) => {
        const bx = -w / 2 + 30 + i * 180, by = -h / 2 + 130, bw = 160, bh = 220, can = this.canBuy(e, it), ch = sh.choice === it.id;
        g.globalAlpha = can || ch ? 1 : 0.4;
        if (sh.choice && !ch) g.globalAlpha = 0.3;
        const pop = ch ? 1 + Math.sin(Math.min(1, sh.ct * 4) * Math.PI) * 0.12 : 1;
        g.save(); g.translate(bx + bw / 2, by + bh / 2); g.scale(pop, pop);
        g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-bw / 2, -bh / 2, bw, bh, 20); g.fill(); g.strokeStyle = ch ? INK : it.col; g.lineWidth = ch ? 7 : 4; g.stroke();
        if (it.id === 'luck') clover(g, 0, -52, 24);
        else if (it.id === 'banana') banana(g, 0, -50, 40, -0.2);
        else if (it.id === 'rocket') rocket(g, 0, -50, 40, 0.5);
        else { g.strokeStyle = '#8b8fa3'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(-24, -76); g.lineTo(24, -28); g.moveTo(24, -76); g.lineTo(-24, -28); g.stroke(); }
        g.fillStyle = INK; g.font = `900 28px ${FONT}`; g.fillText(it.n, 0, 20);
        g.fillStyle = '#64748b'; g.font = `700 18px ${FONT}`; g.fillText(it.d, 0, 52, bw - 14);
        if (it.cost) { star(g, -20, 86, 14, '#ffd43b', '#c98a00', 3); g.fillStyle = INK; g.font = `900 26px ${NUM}`; g.textAlign = 'left'; g.fillText('× ' + it.cost, -2, 87); g.textAlign = 'center'; }
        else { g.fillStyle = '#64748b'; g.font = `900 22px ${FONT}`; g.fillText('免費', 0, 87); }
        g.restore(); g.globalAlpha = 1;
      });
      g.fillStyle = '#0c4a6e'; g.font = `700 22px ${FONT}`;
      const left = Math.ceil((online(e.p) ? 15 : 2) - sh.t);
      g.fillText(sh.choice ? (sh.choice === 'none' ? '這次不買！' : '買好了！') : online(e.p) ? `用手機選一樣（${Math.max(0, left)}）` : '不在線上，這次不買', 0, h / 2 - 22);
      g.restore();
      void t;
    }
    drawMsg(g) {
      const m = this.msg; if (!m) return;
      const k = m.t / m.T, sc = k < 0.1 ? 0.6 + k / 0.1 * 0.4 : 1, size = m.big ? 58 : 44;
      g.save(); g.translate(DX, m.big ? 196 : 190); g.scale(sc, sc); g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      g.font = `900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(m.text).width, ic = m.who ? size * 1.3 : 0, w = tw + 80 + ic;
      g.fillStyle = 'rgba(43,35,64,.84)'; g.beginPath(); g.roundRect(-w / 2, -size * 0.8, w, size * 1.6, size * 0.8); g.fill();
      g.strokeStyle = m.who ? PARTY_COLORS[m.who.p.col].c : LIME; g.lineWidth = 5; g.stroke();
      if (m.who) drawCritter(g, -w / 2 + 40 + ic / 2 - 6, 4, size * 0.48, m.who.p.col, m.who.p.animal, { happy: true, noShadow: true, step: 0, moving: false });
      g.lineWidth = 9; g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.strokeText(m.text, ic / 2, 2); g.fillStyle = m.col; g.fillText(m.text, ic / 2, 2);
      g.restore(); g.globalAlpha = 1;
    }

    /* ---------------- phones, HUD, results ---------------- */
    padLayout(p) {
      const e = this.by.get(p), A = this.active;
      if (this.phase === 'end') return { type: 'tap', prompt: this.winner ? this.winner.p.name + ' 贏了！一起歡呼！' : '遊戲結束！', btn: { icon: '🎉', label: '歡呼！' } };
      if (e === A) {
        if (this.phase === 'shop' && this.shop && this.shop.e === e) {
          const ch = this.shop.choice;
          return {
            type: 'choices', prompt: `🛒 商店！你有 ⭐${e.stars}，要買什麼？`, cols: 2, locked: !!ch,
            options: ITEMS.map(it => ({ id: it.id, label: it.n + (it.cost ? ` ⭐${it.cost}` : ''), icon: it.icon, col: it.col, state: ch === it.id ? 'chosen' : (this.canBuy(e, it) ? '' : 'off') }))
          };
        }
        if (this.phase === 'skip') return { type: 'tap', prompt: '☔ 下雨了，這回合休息', btn: { icon: '☔', label: '休息中' } };
        if (this.phase === 'wait') return { type: 'tap', prompt: e.lucky ? '輪到你了！🍀 這次擲兩顆骰子' : '輪到你了！按一下擲骰子', btn: { icon: '🎲', label: '擲骰子' } };
        return { type: 'tap', prompt: '看大螢幕！', btn: { icon: '🎲', label: '擲骰子' } };
      }
      return { type: 'tap', prompt: (this.phase === 'wait' ? '等 ' + A.p.name + ' 擲骰子…' : '輪到 ' + A.p.name + '・') + '按按鈕幫忙加油！', btn: { icon: '📣', label: '幫忙加油！' } };
    }
    ready(p) {
      const e = this.by.get(p);
      if (this.phase === 'end') return true;
      return e === this.active ? this.phase === 'wait' : true;   // the others' button cheers
    }
    posText(e) { return e.pos >= this.N - 1 ? '終點' : e.pos === 0 ? '起點' : '第 ' + e.pos + ' 格'; }
    chip(p) { const e = this.by.get(p); return this.posText(e) + ' ⭐' + e.stars; }
    pad(p) {
      const e = this.by.get(p), A = this.active;
      const me = this.posText(e) + '・⭐ ' + e.stars + (e.lucky ? '・🍀' : '') + (e.skip ? '・☔' : '');
      if (this.phase === 'end') return this.winner === e ? '🏆 你贏了！' : '遊戲結束！' + me;
      if (e === A) return this.phase === 'wait' ? '🎲 輪到你了！' + me : '你：' + me;
      return '你在' + me;
    }
    center() {
      if (this.phase === 'end') return this.winner ? '🏆 ' + this.winner.p.name + (this.winner.pos >= this.N - 1 ? ' 到達城堡！' : ' 走得最遠！') : '回合用完了！';
      return `第 ${this.round} / ${this.maxRounds} 回合・輪到 ${this.active.p.name}`;
    }
    results() {
      const N = this.N;
      const rows = this.es.slice().sort((a, b) => (b.pos - a.pos) || (b.stars - a.stars)).map(e => ({
        p: e.p, key: e.pos * 1000 + e.stars,
        line: (e.pos >= N - 1 ? '🏰 到達終點！' : `走到第 ${e.pos} 格`) + `・⭐ ${e.stars}`
      }));
      const r = { rows };
      if (this.solo) { const e = this.es[0]; r.title = e.pos >= N - 1 ? `第 ${this.round} 回合就到達城堡！` : `走到第 ${e.pos} 格！`; }
      return r;
    }
  }

  GAMES.push({
    id: 'board', name: '動物大富翁', icon: '🎲', col: LIME, bg: '#7cc35a', kind: 'vs', players: '1–6 人',
    blurb: '輪流擲骰子，爬梯子、溜滑梯，先到城堡的人贏！',
    btn: { label: '擲骰子', icon: '🎲' },
    rules: kid => kid
      ? ['輪到你的時候，按手機擲骰子', '動物會一格一格往前跳', '⭐ 拿星星、🪜 爬梯子往上、❓ 抽事件卡', '先到城堡的人贏！別人擲骰子時可以按手機幫忙加油']
      : ['輪流按手機擲骰子，動物照點數往前走', '🪜 梯子往上爬、🛝 滑梯會溜下去、❓ 事件卡可能交換位置或偷星星', '🛒 商店用 ⭐ 買：🍀 幸運骰、🍌 香蕉皮、🚀 火箭', '先到城堡的人贏；14 回合後走最遠的人贏（同格比 ⭐）'],
    thumb(g) {
      g.fillStyle = '#9de27a'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#bfe9ff'; g.fillRect(0, 0, 320, 40);
      g.fillStyle = '#5ab8ee'; g.fillRect(0, 108, 320, 14);
      const cols = ['#fff7d6', '#ffe066', '#c4a5ff', '#ffe8ee', '#8be27f', '#fff7d6', '#ffb070', '#7dd3fc'];
      const path = []; for (let i = 0; i < 7; i++) path.push([24 + i * 34, 150]); for (let i = 0; i < 7; i++) path.push([228 - i * 34, 82]);
      g.strokeStyle = '#f3e2b8'; g.lineWidth = 22; g.lineCap = g.lineJoin = 'round'; g.beginPath(); path.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.lineTo(262, 116); g.stroke();
      path.forEach((p, i) => { g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.roundRect(p[0] - 13, p[1] - 10, 26, 26, 7); g.fill(); g.fillStyle = cols[i % cols.length]; g.beginPath(); g.roundRect(p[0] - 13, p[1] - 13, 26, 26, 7); g.fill(); });
      g.strokeStyle = '#7a4a26'; g.lineWidth = 4; for (const s of [-7, 7]) { g.beginPath(); g.moveTo(126 + s, 140); g.lineTo(126 + s, 92); g.stroke(); }
      g.lineWidth = 3; for (let y = 100; y < 140; y += 10) { g.beginPath(); g.moveTo(119, y); g.lineTo(133, y); g.stroke(); }
      star(g, 58, 150, 9, '#fff8d0', '#d99a00', 2);
      drawDie(g, 272, 56, 26, mm(TILT, FACE_R[5]));
      drawCritter(g, 24, 140, 14, 0, 0, { noShadow: true, still: true, happy: true });
      drawCritter(g, 160, 72, 14, 1, 2, { noShadow: true, still: true });
      drawCritter(g, 194, 72, 14, 3, 5, { noShadow: true, still: true, happy: true, hop: 6 });
    },
    create: ctx => new Board(ctx)
  });
})();
