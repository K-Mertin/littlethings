'use strict';
/* 保護蛋糕 — everyone together guards a birthday cake on a picnic blanket.
   Ants (and in 大人 mode beetles) march in from the edges in little lines. The one
   button is 跺腳: a stomp that sends a shockwave round you, and every bug inside it
   gets dizzy, spins, and runs away. A bug that reaches the cake nibbles for a moment,
   then takes a bite and runs off with a crumb. Keep some cake until time runs out.
   小朋友: slow ants, 8 bites of cake, a bigger stomp, and ants that bump into you turn round.
   大人:   faster and more ants, beetles that need two stomps, only 5 bites of cake. */
(() => {
  const X0 = 50, Y0 = 150, X1 = 1550, Y1 = 870, CX = 800, CY = 540, PRX = 150, PRY = 60;
  const BX0 = CX - 300, BY0 = CY - 150, BX1 = CX + 300, BY1 = CY + 140;   // the picnic blanket
  const OX = 170, OY = 236, CW = 340, CHT = 290;                           // cake sprite origin = plate centre
  const FONT = '"Noto Sans TC",system-ui,sans-serif';
  const CONF = ['#ff4f58', '#2f8cff', '#ffbf1f', '#22c26a', '#9b5cff', '#ff6fb7'];
  const TIERS = [
    { rx: 118, ry: 40, by: -6, h: 74, c: '#ff9cc2', l: '#ffcade', d: '#de6496', f: '#fffaf3' },
    { rx: 86, ry: 29, by: -80, h: 62, c: '#fff0d6', l: '#fffbf2', d: '#e3c294', f: '#ff8fbd' },
    { rx: 56, ry: 19, by: -142, h: 52, c: '#ffb5d3', l: '#ffdbe9', d: '#e27aa7', f: '#fffaf3' }
  ];
  /* bite spots on the cake: x, y, and which way is "outside" */
  const BITES = [[-116, -40, -1, 0], [116, -32, 1, 0], [-84, -110, -1, 0], [84, -104, 1, 0], [-50, 30, 0, 1], [56, 28, 0, 1], [-54, -170, -1, 0], [54, -166, 1, 0]];
  /* candles stand on the top tier (back ones first) */
  const CANDLES = [[-31, -209], [31, -209], [-44, -182], [44, -182], [0, -176]];
  const CANDLE_C = ['#7fd0ff', '#ffe066', '#b48cff', '#6fdc8c', '#ff7fb8'];
  const KID_WAVES = [
    { at: 1.5, name: '第 1 波：小螞蟻來了！', mix: 'N' },
    { at: 18, name: '第 2 波：快螞蟻來了！', mix: 'NFN' },
    { at: 36, name: '第 3 波：螞蟻排隊來了！', mix: 'LNN' },
    { at: 54, name: '第 4 波：螞蟻大集合！', mix: 'NFL' },
    { at: 71, name: '最後一波：加油！', mix: 'NFLN' }
  ];
  const ADULT_WAVES = [
    { at: 1.5, name: '第 1 波：小螞蟻來了！', mix: 'N' },
    { at: 16, name: '第 2 波：快螞蟻來了！', mix: 'NFF' },
    { at: 32, name: '第 3 波：甲蟲來了！', mix: 'BNB' },
    { at: 48, name: '第 4 波：螞蟻排隊來了！', mix: 'LFN' },
    { at: 64, name: '第 5 波：大家都來了！', mix: 'NFBL' },
    { at: 82, name: '最後一波：撐住！', mix: 'NFBLF' }
  ];
  const TYPE = { N: 0, F: 1, B: 2, L: 0 };
  let BG = null, BUGS = null, STAR = null, CRUMB = null; const CAKES = {};

  const POND = { x: 330, y: 800, rx: 118, ry: 46 };
  const NTR = 300;   // ant-trail dots (ring buffer)
  /* picnic guests sitting just above the meadow: [x, y, colour, animal, hat colour] */
  const GUESTS = [[150, 128, 2, 3, '#2f8cff'], [206, 136, 4, 2, '#ffbf1f'], [1398, 128, 3, 4, '#ff4f58'], [1454, 136, 1, 0, '#22c26a']];

  /* ---------- smooth controls: ease in, stop a little quicker, turn without snapping ---------- */
  function angTo(a, b, k) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * k; }
  function steer(e, i, sp, dt) {
    const tx = i.x * sp, ty = i.y * sp, cur = hyp(e.vx, e.vy), tgt = hyp(tx, ty);
    const k = 1 - Math.exp(-(tgt > cur + 1 ? 9 : 15) * dt);
    e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
    if (!tgt && hyp(e.vx, e.vy) < 14) e.vx = e.vy = 0;
    const s = hyp(e.vx, e.vy), go = tgt > 0;
    if (go !== e.moving) { e.moving = go; e.sqv += go ? -1.8 : 2.2; }
    if (go) e.face = angTo(e.face, Math.atan2(i.y, i.x), 1 - Math.exp(-13 * dt));
    e.mv += (Math.min(1, s / sp) - e.mv) * (1 - Math.exp(-10 * dt));
    e.walk += s * dt / 26;
    e.sqv += (-e.squash * 260 - e.sqv * 16) * dt; e.squash += e.sqv * dt;
  }
  function onBody(g, x, y, r, hop, sq, bob) { g.save(); g.translate(x, y - hop - bob); g.scale(1 + sq, 1 - sq); }
  function sweat(g, x, y, t, ph) {
    const k = (t * 2.2 + ph) % 1; g.globalAlpha = 1 - k; g.fillStyle = '#7fd0ff';
    g.beginPath(); g.moveTo(x, y + k * 10 - 7); g.quadraticCurveTo(x + 5, y + k * 10 + 1, x, y + k * 10 + 4); g.quadraticCurveTo(x - 5, y + k * 10 + 1, x, y + k * 10 - 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x - 1.2, y + k * 10, 1.2, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  /* a striped party hat with a pompom, worn a little to one side */
  function partyHat(g, r, col, face, tilt) {
    const lx = Math.cos(face) * r * 0.06;
    g.save(); g.translate(lx - r * 0.12, -r * 0.78); g.rotate(-0.22 + tilt);
    const h = r * 1.08, w = r * 0.42;
    g.fillStyle = 'rgba(60,30,60,.2)'; g.beginPath(); g.ellipse(0, r * 0.06, w * 1.05, r * 0.11, 0, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.moveTo(-w, 0); g.lineTo(0, -h); g.lineTo(w, 0); g.quadraticCurveTo(0, r * 0.12, -w, 0); g.closePath(); g.clip();
    g.fillStyle = col; g.fillRect(-w, -h, w * 2, h + r * 0.2);
    g.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-w, -k * h * 0.28 + r * 0.02); g.lineTo(w, -k * h * 0.28 - h * 0.16); g.lineTo(w, -k * h * 0.28 - h * 0.06); g.lineTo(-w, -k * h * 0.28 + h * 0.1); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(-w * 0.55, 0); g.lineTo(-w * 0.1, -h * 0.85); g.lineTo(-w * 0.25, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(w * 0.3, 0); g.lineTo(0, -h); g.lineTo(w, 0); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = '#ffd23f'; for (let k = 0; k < 6; k++) { const a = k * TAU / 6; g.beginPath(); g.arc(Math.cos(a) * r * 0.08, -h + Math.sin(a) * r * 0.08, r * 0.08, 0, TAU); g.fill(); }
    g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(-r * 0.03, -h - r * 0.03, r * 0.06, 0, TAU); g.fill();
    g.restore();
  }
  /* a white bib with a scalloped edge and a little strawberry */
  function bib(g, r, face) {
    const bx = Math.cos(face) * r * 0.14, by = r * 0.66;
    g.strokeStyle = '#ff8fbd'; g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(bx - r * 0.32, by - r * 0.12); g.quadraticCurveTo(bx - r * 0.5, by - r * 0.2, bx - r * 0.6, by - r * 0.3); g.moveTo(bx + r * 0.32, by - r * 0.12); g.quadraticCurveTo(bx + r * 0.5, by - r * 0.2, bx + r * 0.6, by - r * 0.3); g.stroke();
    g.fillStyle = '#fffaf3'; g.beginPath(); g.ellipse(bx, by, r * 0.42, r * 0.21, 0, 0, TAU); g.fill();
    for (let k = 0; k < 5; k++) { const a = 0.15 * Math.PI + k * 0.175 * Math.PI; g.beginPath(); g.arc(bx + Math.cos(a) * r * 0.39, by + Math.sin(a) * r * 0.19, r * 0.085, 0, TAU); g.fill(); }
    g.strokeStyle = '#ff8fbd'; g.lineWidth = r * 0.035; g.beginPath(); g.ellipse(bx, by, r * 0.42, r * 0.21, 0, 0, TAU); g.stroke();
    g.fillStyle = '#e8303f'; g.beginPath(); g.moveTo(bx - r * 0.08, by - r * 0.04); g.quadraticCurveTo(bx, by + r * 0.16, bx + r * 0.08, by - r * 0.04); g.quadraticCurveTo(bx, by - r * 0.09, bx - r * 0.08, by - r * 0.04); g.fill();
    g.fillStyle = '#3fae4a'; g.beginPath(); g.ellipse(bx, by - r * 0.06, r * 0.07, r * 0.03, 0, 0, TAU); g.fill();
  }
  /* ---------- drawn once ---------- */
  function tree(g, x, y, s, pink) {
    g.fillStyle = 'rgba(30,70,20,.25)'; g.beginPath(); g.ellipse(x + 10 * s, y + 6 * s, 50 * s, 14 * s, 0, 0, TAU); g.fill();
    g.fillStyle = '#8a5a2b'; g.beginPath(); g.roundRect(x - 9 * s, y - 50 * s, 18 * s, 56 * s, 6 * s); g.fill();
    const C = pink ? ['#f59ac0', '#f59ac0', '#f7a8cb', '#ffbfd9', '#ffd3e4'] : ['#2f8a3a', '#2f8a3a', '#38983f', '#45ab4a', '#52ba52'];
    [[0, -78, 46], [-30, -60, 32], [30, -60, 32], [-10, -96, 30], [16, -88, 26]].forEach(([dx, dy, r], i) => {
      g.fillStyle = C[i]; g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill();
    });
    if (pink) { g.fillStyle = '#fff'; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(x + rnd(-50, 50) * s, y + rnd(-120, -46) * s, rnd(2, 3.5) * s, 0, TAU); g.fill(); } }
  }
  function anthill(g, x, y) {
    g.fillStyle = 'rgba(60,40,20,.2)'; g.beginPath(); g.ellipse(x + 4, y + 8, 46, 14, 0, 0, TAU); g.fill();
    g.fillStyle = '#b98a55'; g.beginPath(); g.ellipse(x, y, 42, 22, 0, Math.PI, 0); g.lineTo(x + 42, y + 4); g.ellipse(x, y + 4, 42, 10, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#cfa06a'; g.beginPath(); g.ellipse(x - 8, y - 8, 22, 9, -0.2, 0, TAU); g.fill();
    g.fillStyle = '#4a3020'; g.beginPath(); g.ellipse(x + 2, y - 16, 9, 5, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(120,80,40,.5)'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(x - 34 + k * 10, y + 6 + (k % 2) * 4, 2.5, 0, TAU); g.fill(); }
  }
  function makeBg() {
    const c = document.createElement('canvas'); c.width = W + 800; c.height = H; const g = c.getContext('2d'); g.translate(400, 0);
    g.fillStyle = '#79c35f'; g.fillRect(-400, 0, W + 800, H);
    g.fillStyle = '#93d77a'; g.beginPath(); g.roundRect(X0 - 12, Y0 - 12, X1 - X0 + 24, Y1 - Y0 + 24, 40); g.fill();
    for (let i = 0; i < 44; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(40,110,30,.06)'; g.beginPath(); g.ellipse(rnd(X0, X1), rnd(Y0, Y1), rnd(60, 170), rnd(30, 80), rnd(0, 3), 0, TAU); g.fill(); }
    g.lineCap = 'round'; g.lineWidth = 2.5;
    for (let i = 0; i < 700; i++) {
      const x = rnd(-380, W + 380), y = rnd(Y0 - 30, H), s = rnd(0.7, 1.3);
      if (x > BX0 - 10 && x < BX1 + 10 && y > BY0 - 10 && y < BY1 + 14) continue;
      g.strokeStyle = i % 3 ? 'rgba(60,140,45,.32)' : 'rgba(210,255,180,.4)';
      g.beginPath(); g.moveTo(x - 4 * s, y - 7 * s); g.lineTo(x, y); g.lineTo(x + 1 * s, y - 9 * s); g.moveTo(x, y); g.lineTo(x + 5 * s, y - 6 * s); g.stroke();
    }
    for (let i = 0; i < 110; i++) {
      const x = rnd(X0 + 20, X1 - 20), y = rnd(Y0 + 20, Y1 - 20); if (x > BX0 - 30 && x < BX1 + 30 && y > BY0 - 30 && y < BY1 + 30) continue;
      const k = rnd(0.6, 1.15), col = ['#fff', '#ffe066', '#ff9fc4', '#c9b6ff'][rint(4)];
      g.strokeStyle = 'rgba(60,140,45,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 4 * k); g.lineTo(x, y + 12 * k); g.stroke();
      g.fillStyle = col; for (let p = 0; p < 5; p++) { const a = p * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 4.2 * k, y + Math.sin(a) * 4.2 * k, 3.2 * k, 0, TAU); g.fill(); }
      g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(x, y, 2.4 * k, 0, TAU); g.fill();
    }
    for (const [x, y] of [[120, 214], [1478, 222], [118, 818], [1480, 822]]) anthill(g, x, y);
    // the duck pond (bottom left): reeds, stones, lily pads
    { const P = POND;
      g.fillStyle = 'rgba(30,70,20,.2)'; g.beginPath(); g.ellipse(P.x + 6, P.y + 8, P.rx + 18, P.ry + 14, 0, 0, TAU); g.fill();
      for (let k = 0; k < 20; k++) { const a = k * TAU / 20; g.fillStyle = k % 2 ? '#c9c1b2' : '#a8a093'; g.beginPath(); g.ellipse(P.x + Math.cos(a) * (P.rx + 8), P.y + Math.sin(a) * (P.ry + 7), 13, 8, a, 0, TAU); g.fill(); }
      g.fillStyle = '#4fb2e0'; g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.fill();
      g.fillStyle = '#7fd0f5'; g.beginPath(); g.ellipse(P.x - 18, P.y - 10, P.rx * 0.66, P.ry * 0.46, 0, 0, TAU); g.fill();
      for (const [dx, dy, s] of [[-80, 18, 1], [70, -16, 0.8], [88, 14, 0.9]]) { g.fillStyle = '#3fae4a'; g.beginPath(); g.ellipse(P.x + dx, P.y + dy, 14 * s, 8 * s, 0.3, 0.4, TAU - 0.2); g.fill(); }
      g.fillStyle = '#ff9fc4'; g.beginPath(); g.arc(P.x - 76, P.y + 16, 4.5, 0, TAU); g.fill();
      g.strokeStyle = '#3f8a3c'; g.lineWidth = 3; g.lineCap = 'round';
      for (const [rx, ry] of [[P.x - P.rx - 4, P.y - 10], [P.x - P.rx + 10, P.y - 24], [P.x + P.rx - 6, P.y - 26], [P.x + P.rx + 4, P.y - 8]]) {
        for (const d of [-5, 0, 5]) { g.beginPath(); g.moveTo(rx + d, ry); g.quadraticCurveTo(rx + d * 2, ry - 18, rx + d * 1.4, ry - 30); g.stroke(); }
        g.fillStyle = '#8a5a2b'; g.beginPath(); g.ellipse(rx, ry - 27, 3.5, 8, 0, 0, TAU); g.fill();
      }
    }
    // playground (bottom right): a sandbox with a sandcastle, bucket and spade
    { const x = 1250, y = 800;
      g.fillStyle = 'rgba(30,70,20,.2)'; g.beginPath(); g.roundRect(x - 78, y - 30, 164, 76, 12); g.fill();
      g.fillStyle = '#c08850'; g.beginPath(); g.roundRect(x - 84, y - 38, 168, 78, 12); g.fill();
      g.fillStyle = '#f3dc9b'; g.beginPath(); g.roundRect(x - 74, y - 30, 148, 62, 8); g.fill();
      g.fillStyle = 'rgba(200,160,80,.4)'; for (let k = 0; k < 30; k++) { g.beginPath(); g.arc(x + rnd(-68, 68), y + rnd(-24, 26), 1.6, 0, TAU); g.fill(); }
      g.fillStyle = '#e8c477'; g.fillRect(x - 40, y - 14, 44, 28); g.fillRect(x - 46, y - 24, 14, 38); g.fillRect(x - 6, y - 24, 14, 38);
      g.fillStyle = '#d9b05e'; for (const tx of [-46, -6]) for (let k = 0; k < 3; k++) g.fillRect(x + tx + k * 5, y - 28, 3, 4);
      g.fillStyle = '#8a6a30'; g.beginPath(); g.roundRect(x - 23, y - 2, 10, 16, [5, 5, 0, 0]); g.fill();
      g.strokeStyle = '#5a3a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 26, y - 14); g.lineTo(x - 26, y - 40); g.stroke();
      g.fillStyle = '#ff4f58'; g.beginPath(); g.moveTo(x - 26, y - 40); g.lineTo(x - 12, y - 35); g.lineTo(x - 26, y - 30); g.fill();
      g.fillStyle = '#2f8cff'; g.beginPath(); g.moveTo(x + 30, y - 10); g.lineTo(x + 54, y - 10); g.lineTo(x + 50, y + 16); g.lineTo(x + 34, y + 16); g.closePath(); g.fill();
      g.strokeStyle = '#1658b5'; g.lineWidth = 2; g.beginPath(); g.arc(x + 42, y - 10, 12, Math.PI, 0); g.stroke();
      g.fillStyle = '#ffbf1f'; g.save(); g.translate(x + 60, y + 20); g.rotate(0.7); g.fillRect(-2, -18, 4, 22); g.beginPath(); g.ellipse(0, 8, 6, 9, 0, 0, TAU); g.fill(); g.restore();
    }
    // the guests' little blankets just above the meadow
    for (const [x0, col] of [[178, 'rgba(47,140,255,.55)'], [1426, 'rgba(34,194,106,.55)']]) {
      g.fillStyle = 'rgba(30,70,20,.2)'; g.beginPath(); g.roundRect(x0 - 76, 116, 156, 40, 8); g.fill();
      g.save(); g.beginPath(); g.roundRect(x0 - 80, 110, 160, 40, 8); g.clip();
      g.fillStyle = '#fff'; g.fillRect(x0 - 80, 110, 160, 40); g.fillStyle = col;
      for (let x = x0 - 80; x < x0 + 80; x += 20) g.fillRect(x, 110, 10, 40); for (let y = 110; y < 150; y += 20) g.fillRect(x0 - 80, y, 160, 10);
      g.restore();
    }
    // picnic blanket: gingham with stitched border and tassels
    g.fillStyle = 'rgba(30,70,20,.22)'; g.beginPath(); g.roundRect(BX0 + 8, BY0 + 12, BX1 - BX0, BY1 - BY0, 18); g.fill();
    g.save(); g.beginPath(); g.roundRect(BX0, BY0, BX1 - BX0, BY1 - BY0, 18); g.clip();
    g.fillStyle = '#fff7f2'; g.fillRect(BX0, BY0, BX1 - BX0, BY1 - BY0);
    g.fillStyle = 'rgba(232,70,88,.5)';
    for (let x = BX0; x < BX1; x += 46) g.fillRect(x, BY0, 23, BY1 - BY0);
    for (let y = BY0; y < BY1; y += 46) g.fillRect(BX0, y, BX1 - BX0, 23);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(BX0, BY0, BX1 - BX0, 40);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.setLineDash([10, 8]);
    g.beginPath(); g.roundRect(BX0 + 10, BY0 + 10, BX1 - BX0 - 20, BY1 - BY0 - 20, 12); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#e84658'; g.lineWidth = 4; g.lineCap = 'round';
    for (let x = BX0 + 22; x < BX1 - 10; x += 22) { g.beginPath(); g.moveTo(x, BY1); g.lineTo(x + 2, BY1 + 12); g.stroke(); g.beginPath(); g.moveTo(x, BY0); g.lineTo(x - 2, BY0 - 10); g.stroke(); }
    // picnic basket (back left)
    { const x = BX0 + 78, y = BY0 + 66;
      g.fillStyle = 'rgba(60,30,20,.2)'; g.beginPath(); g.ellipse(x + 6, y + 30, 56, 14, 0, 0, TAU); g.fill();
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 7; g.beginPath(); g.ellipse(x, y - 14, 34, 34, 0, Math.PI, 0); g.stroke();
      g.fillStyle = '#c98f4d'; g.beginPath(); g.roundRect(x - 50, y - 16, 100, 46, 10); g.fill();
      g.strokeStyle = '#a8703c'; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - 48, y - 4 + k * 12); g.lineTo(x + 48, y - 4 + k * 12); g.stroke(); }
      for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(x - 42 + k * 14, y - 14); g.lineTo(x - 42 + k * 14, y + 28); g.stroke(); }
      g.fillStyle = '#e84658'; g.beginPath(); g.moveTo(x - 50, y - 16); g.lineTo(x + 50, y - 16); g.lineTo(x + 30, y + 6); g.lineTo(x - 30, y + 6); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; for (let k = 0; k < 4; k++) g.fillRect(x - 34 + k * 18, y - 14, 8, 8);
      g.fillStyle = '#ff4f58'; g.beginPath(); g.arc(x + 20, y - 24, 10, 0, TAU); g.fill(); g.fillStyle = '#3fae4a'; g.fillRect(x + 19, y - 38, 3, 8);
    }
    // lemonade and cups (back right)
    { const x = BX1 - 90, y = BY0 + 70;
      g.fillStyle = 'rgba(60,30,20,.18)'; g.beginPath(); g.ellipse(x + 10, y + 26, 60, 12, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(220,240,255,.85)'; g.beginPath(); g.roundRect(x - 22, y - 40, 44, 64, [10, 10, 14, 14]); g.fill();
      g.fillStyle = '#ffe066'; g.beginPath(); g.roundRect(x - 19, y - 16, 38, 38, [0, 0, 12, 12]); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x - 14, y - 34, 6, 50);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + 6, y - 6, 8, 0, TAU); g.fill(); g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(x + 6, y - 6, 5, 0, TAU); g.fill();
      for (const [dx, col] of [[40, '#2f8cff'], [64, '#ff6fb7']]) {
        g.fillStyle = col; g.beginPath(); g.moveTo(x + dx - 10, y - 4); g.lineTo(x + dx + 10, y - 4); g.lineTo(x + dx + 7, y + 22); g.lineTo(x + dx - 7, y + 22); g.closePath(); g.fill();
        g.fillStyle = '#fff6b0'; g.beginPath(); g.ellipse(x + dx, y - 4, 10, 3.5, 0, 0, TAU); g.fill();
      }
    }
    // sandwiches (front left)
    { const x = BX0 + 86, y = BY1 - 52;
      g.fillStyle = 'rgba(60,30,20,.18)'; g.beginPath(); g.ellipse(x + 5, y + 8, 58, 20, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, 56, 22, 0, 0, TAU); g.fill(); g.strokeStyle = '#7fd0ff'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 46, 17, 0, 0, TAU); g.stroke();
      for (const [dx, dy] of [[-18, -2], [16, 0]]) {
        g.fillStyle = '#f2d39b'; g.beginPath(); g.moveTo(x + dx - 18, y + dy + 8); g.lineTo(x + dx + 18, y + dy + 8); g.lineTo(x + dx, y + dy - 18); g.closePath(); g.fill();
        g.fillStyle = '#6fdc6f'; g.fillRect(x + dx - 15, y + dy + 4, 30, 4); g.fillStyle = '#ffe9c4'; g.beginPath(); g.moveTo(x + dx - 13, y + dy + 4); g.lineTo(x + dx + 13, y + dy + 4); g.lineTo(x + dx, y + dy - 13); g.closePath(); g.fill();
      }
    }
    // watermelon (front right)
    { const x = BX1 - 90, y = BY1 - 50;
      g.fillStyle = 'rgba(60,30,20,.18)'; g.beginPath(); g.ellipse(x + 5, y + 10, 56, 14, 0, 0, TAU); g.fill();
      for (const [dx, a] of [[-22, -0.2], [20, 0.25]]) {
        g.save(); g.translate(x + dx, y); g.rotate(a);
        g.fillStyle = '#2f9a45'; g.beginPath(); g.arc(0, -14, 30, 0.15 * Math.PI, 0.85 * Math.PI); g.closePath(); g.fill();
        g.fillStyle = '#d9f5c0'; g.beginPath(); g.arc(0, -14, 26, 0.15 * Math.PI, 0.85 * Math.PI); g.closePath(); g.fill();
        g.fillStyle = '#ff5b6e'; g.beginPath(); g.arc(0, -14, 22, 0.15 * Math.PI, 0.85 * Math.PI); g.closePath(); g.fill();
        g.fillStyle = '#2b2340'; for (const [sx, sy] of [[-7, 0], [5, 2], [0, 8]]) { g.beginPath(); g.ellipse(sx, sy, 1.8, 3, 0, 0, TAU); g.fill(); }
        g.restore();
      }
    }
    // the big plate the cake sits on
    g.fillStyle = 'rgba(80,30,50,.22)'; g.beginPath(); g.ellipse(CX + 8, CY + 12, PRX + 8, PRY + 6, 0, 0, TAU); g.fill();
    g.fillStyle = '#e9e4f2'; g.beginPath(); g.ellipse(CX, CY + 5, PRX, PRY, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(CX, CY, PRX, PRY, 0, 0, TAU); g.fill();
    g.strokeStyle = '#ffcf5a'; g.lineWidth = 4; g.beginPath(); g.ellipse(CX, CY, PRX - 9, PRY - 5, 0, 0, TAU); g.stroke();
    g.fillStyle = '#f4f1f9'; g.beginPath(); g.ellipse(CX, CY - 2, PRX - 26, PRY - 13, 0, 0, TAU); g.fill();
    for (const [x, y, s, p] of [[20, 140, 0.9, 1], [1590, 140, 0.85, 1], [-30, 420, 1, 1], [1630, 440, 1, 1], [-10, 905, 1.1, 0], [1610, 905, 1.1, 0], [560, 935, 0.85, 1], [1060, 935, 0.85, 0]]) tree(g, x, y, s, p);
    return c;
  }
  /* bugs face +x; 4 walking frames each: 0 ant, 1 fast red ant, 2 beetle */
  function makeBug(type, f) {
    const big = type === 2, S = big ? 124 : 84, k = big ? 1.95 : 1.5, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'); g.translate(S / 2, S / 2); g.scale(k, k);
    const body = ['#4a3328', '#e0402f', '#2f7a68'][type], dark = ['#24160f', '#8e1f15', '#163f35'][type], hi = ['#8f6b58', '#ff9a8a', '#8fe0c6'][type];
    g.fillStyle = 'rgba(30,40,20,.2)'; g.beginPath(); g.ellipse(-2, 4, 22, 11, 0, 0, TAU); g.fill();
    const sw = [1, 0, -1, 0][f];
    g.strokeStyle = dark; g.lineWidth = big ? 2.4 : 3; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) {
      const grp = ((i + 1) + (s > 0 ? 1 : 0)) % 2 ? 1 : -1, d = sw * grp * 4.5;
      g.beginPath(); g.moveTo(i * 4, s * 3); g.lineTo(i * 7 + d * 0.6, s * (big ? 10 : 9)); g.lineTo(i * (big ? 12 : 10) + d, s * (big ? 16 : 13.5)); g.stroke();
    }
    if (big) {
      g.fillStyle = dark; g.beginPath(); g.arc(13, 0, 7, 0, TAU); g.fill();
      g.fillStyle = dark; g.beginPath(); g.moveTo(17, -3); g.quadraticCurveTo(26, -4, 25, -10); g.quadraticCurveTo(24, -2, 19, 3); g.closePath(); g.fill();
      g.fillStyle = body; g.strokeStyle = dark; g.lineWidth = 1.6; g.beginPath(); g.ellipse(-3, 0, 15, 12, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-18, 0); g.lineTo(9, 0); g.stroke();
      g.fillStyle = hi; g.globalAlpha = 0.75; g.beginPath(); g.ellipse(-6, -6, 7, 3, -0.15, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-6, 6, 5, 2, 0.15, 0, TAU); g.fill(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(-10, -7, 1.8, 0, TAU); g.fill();
      for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(15, s * 3.6, 2.6, 0, TAU); g.fill(); g.fillStyle = '#2b2340'; g.beginPath(); g.arc(16, s * 3.6, 1.4, 0, TAU); g.fill(); }
    } else {
      g.strokeStyle = dark; g.lineWidth = 1.8;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(13, s * 3); g.quadraticCurveTo(18, s * 9, 23, s * 8); g.stroke(); g.fillStyle = dark; g.beginPath(); g.arc(23, s * 8, 2, 0, TAU); g.fill(); }
      g.fillStyle = body; g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(-12, 0, 10.5, 8.5, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(-1, 0, 5.5, 4.3, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(9.5, 0, 8.2, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = hi; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(-14, -3.5, 5, 2.4, -0.2, 0, TAU); g.fill(); g.beginPath(); g.ellipse(7.5, -3.4, 3, 1.6, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
      if (type === 1) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(-17, -1.2, 9, 2.4); }
      for (const s of [-1, 1]) {
        g.fillStyle = '#fff'; g.beginPath(); g.arc(12, s * 3.8, 3.6, 0, TAU); g.fill();
        g.fillStyle = '#2b2340'; g.beginPath(); g.arc(13.3, s * 3.6, 2, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(12.8, s * 3.6 - 0.9, 0.7, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgba(255,120,150,.55)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(8, s * 6.4, 2, 1.3, 0, 0, TAU); g.fill(); }
    }
    return c;
  }
  function makeStar() {
    const c = document.createElement('canvas'); c.width = c.height = 24; const g = c.getContext('2d'); g.translate(12, 12);
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.2 : 9.5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.stroke(); g.fill(); return c;
  }
  function makeCrumb() {
    const c = document.createElement('canvas'); c.width = 30; c.height = 28; const g = c.getContext('2d'); g.translate(15, 15);
    g.fillStyle = '#f2c879'; g.beginPath(); g.roundRect(-10, -6, 20, 16, 4); g.fill();
    g.fillStyle = '#ff9cc2'; g.beginPath(); g.roundRect(-11, -11, 22, 8, 4); g.fill();
    g.fillStyle = '#fffaf3'; g.beginPath(); g.arc(-4, -10, 3.5, 0, TAU); g.arc(4, -11, 3, 0, TAU); g.fill();
    g.fillStyle = '#ff4f58'; g.beginPath(); g.arc(2, -13, 3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(160,110,40,.5)'; for (const [x, y] of [[-5, 2], [3, 5], [6, 0]]) { g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); }
    return c;
  }
  function ensureArt() {
    if (!BUGS) { BUGS = [0, 1, 2].map(t => [0, 1, 2, 3].map(f => makeBug(t, f))); STAR = makeStar(); CRUMB = makeCrumb(); }
  }
  /* ---------- the cake ---------- */
  function tierSide(g, T) {
    const top = T.by - T.h;
    g.beginPath(); g.moveTo(-T.rx, top); g.lineTo(-T.rx, T.by); g.ellipse(0, T.by, T.rx, T.ry, 0, Math.PI, 0, true); g.lineTo(T.rx, top); g.ellipse(0, top, T.rx, T.ry, 0, 0, Math.PI, true); g.closePath();
  }
  function tier(g, T, seed, base) {
    const top = T.by - T.h;
    if (!base) { g.fillStyle = 'rgba(140,60,90,.2)'; g.beginPath(); g.ellipse(5, T.by + 4, T.rx + 4, T.ry + 3, 0, 0, TAU); g.fill(); }
    const gr = g.createLinearGradient(-T.rx, 0, T.rx, 0);
    gr.addColorStop(0, T.d); gr.addColorStop(0.28, T.l); gr.addColorStop(0.62, T.c); gr.addColorStop(1, T.d);
    g.fillStyle = gr; tierSide(g, T); g.fill();
    // frosted top
    g.fillStyle = T.f; g.beginPath(); g.ellipse(0, top, T.rx, T.ry, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-T.rx * 0.2, top - T.ry * 0.3, T.rx * 0.6, T.ry * 0.45, 0, 0, TAU); g.fill();
    // frosting drips down the front
    g.fillStyle = T.f; g.strokeStyle = T.f; g.lineWidth = 9; g.beginPath(); g.ellipse(0, top + 2, T.rx - 2, T.ry, 0, 0, Math.PI); g.stroke();
    const n = Math.round(T.rx / 11);
    for (let k = 0; k <= n; k++) {
      const x = -T.rx + 6 + k * (2 * T.rx - 12) / n, e = Math.sqrt(Math.max(0, 1 - (x / T.rx) * (x / T.rx))), yy = top + T.ry * e;
      const len = (7 + ((k * 37 + seed) % 5) * 4.5) * (0.35 + 0.65 * e);
      g.beginPath(); g.roundRect(x - 4.5, yy - 2, 9, len, 4.5); g.fill();
      g.beginPath(); g.arc(x, yy + len - 2, 5.5, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (let k = 1; k < n; k += 3) { const x = -T.rx + 6 + k * (2 * T.rx - 12) / n, e = Math.sqrt(Math.max(0, 1 - (x / T.rx) * (x / T.rx))); g.beginPath(); g.arc(x - 1.5, top + T.ry * e + 2, 1.8, 0, TAU); g.fill(); }
  }
  function strawberry(g, x, y, s) {
    g.fillStyle = '#e8303f'; g.beginPath(); g.moveTo(x - 9 * s, y - 6 * s); g.quadraticCurveTo(x - 10 * s, y + 8 * s, x, y + 12 * s); g.quadraticCurveTo(x + 10 * s, y + 8 * s, x + 9 * s, y - 6 * s); g.quadraticCurveTo(x, y - 10 * s, x - 9 * s, y - 6 * s); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - 4 * s, y - 2 * s, 2.5 * s, 4 * s, 0.3, 0, TAU); g.fill();
    g.fillStyle = '#ffe066'; for (const [dx, dy] of [[-3, 2], [3, 0], [0, 6], [4, 5], [-4, 6]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, 0.9 * s, 0, TAU); g.fill(); }
    g.fillStyle = '#3fae4a'; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.5; g.beginPath(); g.ellipse(x + Math.cos(a) * 5 * s, y - 7 * s + Math.sin(a) * 2 * s + 2 * s, 4 * s, 1.8 * s, a, 0, TAU); g.fill(); }
  }
  function rosette(g, x, y, s, col) {
    g.fillStyle = 'rgba(160,90,110,.25)'; g.beginPath(); g.ellipse(x + 1, y + 4 * s, 9 * s, 4 * s, 0, 0, TAU); g.fill();
    g.fillStyle = col; for (let k = 0; k < 6; k++) { const a = k * TAU / 6; g.beginPath(); g.arc(x + Math.cos(a) * 5 * s, y + Math.sin(a) * 3 * s, 4.2 * s, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(x, y - 3 * s, 5 * s, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x - 2 * s, y - 5 * s, 1.8 * s, 0, TAU); g.fill();
  }
  function drawWholeCake(g) {
    const [T1, T2, T3] = TIERS;
    tier(g, T1, 1, true);
    // pearls round the bottom and dots on the pink sides
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (const [x, y] of [[-92, -36], [-60, -20], [-24, -14], [16, -12], [52, -18], [86, -30], [-76, 0], [-40, 6], [0, 10], [36, 8], [72, 0], [102, -10]]) { g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); }
    for (let a = 0.04 * Math.PI; a < 0.97 * Math.PI; a += 0.075 * Math.PI) {
      const x = Math.cos(a) * (T1.rx - 2), y = T1.by + Math.sin(a) * T1.ry - 5;
      g.fillStyle = '#fffaf3'; g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - 1.6, y - 1.8, 1.8, 0, TAU); g.fill();
    }
    tier(g, T2, 3);
    // sprinkles and a little sign on the cream tier
    const SPR = ['#ff4f58', '#2f8cff', '#ffbf1f', '#22c26a', '#9b5cff'];
    for (let k = 0; k < 26; k++) {
      const x = -76 + ((k * 53) % 152), yb = -80 + 29 * Math.sqrt(Math.max(0, 1 - (x / 86) * (x / 86))), y = yb - 8 - ((k * 29) % 34);
      if (Math.abs(x) < 52 && y > -98 && y < -62) continue;
      g.save(); g.translate(x, y); g.rotate(k * 1.3); g.fillStyle = SPR[k % 5]; g.beginPath(); g.roundRect(-3.5, -1.2, 7, 2.4, 1.2); g.fill(); g.restore();
    }
    g.fillStyle = 'rgba(120,60,40,.2)'; g.beginPath(); g.ellipse(2, -76, 50, 17, 0, 0, TAU); g.fill();
    g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(0, -79, 50, 17, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff6e8'; g.beginPath(); g.ellipse(0, -80, 45, 13.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#c2185b'; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('生日快樂', 0, -79);
    // strawberries on the first ledge
    for (const a of [0.12, 0.27, 0.42, 0.58, 0.73, 0.88]) strawberry(g, Math.cos(a * Math.PI) * (T1.rx - 15), T1.by - T1.h + Math.sin(a * Math.PI) * (T1.ry - 6) - 4, 1.05);
    tier(g, T3, 2);
    g.fillStyle = 'rgba(255,255,255,.8)';
    for (const [x, y] of [[-40, -156], [-18, -146], [6, -144], [30, -150], [-28, -134], [18, -132], [44, -138]]) { g.beginPath(); g.arc(x, y, 3.6, 0, TAU); g.fill(); }
    // cream rosettes on the second ledge, and round the very top
    for (const a of [0.12, 0.3, 0.5, 0.7, 0.88]) rosette(g, Math.cos(a * Math.PI) * (T2.rx - 12), T2.by - T2.h + Math.sin(a * Math.PI) * (T2.ry - 5) - 2, 1.1, '#fffaf3');
    for (const a of [-0.9, -0.7, -0.3, -0.1]) rosette(g, Math.cos(a * Math.PI) * (T3.rx - 9), T3.by - T3.h + Math.sin(a * Math.PI) * (T3.ry - 4), 0.75, '#ff8fbd');
    g.fillStyle = '#5b5bd6'; for (const [x, y] of [[-14, -200], [22, -198], [-48, -192]]) { g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); }
  }
  function makeCake(nb, lives, R) {
    const c = document.createElement('canvas'); c.width = CW; c.height = CHT; const g = c.getContext('2d'); g.translate(OX, OY);
    if (nb >= lives) {   // all gone: just crumbs, a strawberry and a fallen candle
      for (let k = 0; k < 40; k++) {
        const a = k * 2.4, d = 20 + ((k * 37) % 100), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.36 - 4;
        g.fillStyle = ['#f2c879', '#ff9cc2', '#fffaf3', '#e8c08a'][k % 4]; g.beginPath(); g.ellipse(x, y, 3 + (k % 3) * 2, 2 + (k % 2) * 1.6, a, 0, TAU); g.fill();
      }
      strawberry(g, 40, -6, 1.1);
      g.save(); g.translate(-30, 4); g.rotate(-1.2); g.fillStyle = '#7fd0ff'; g.fillRect(-4, -28, 8, 28); g.fillStyle = '#fff'; g.fillRect(-4, -20, 8, 4); g.fillRect(-4, -9, 8, 4); g.restore();
      return c;
    }
    drawWholeCake(g);
    for (let i = 0; i < nb; i++) {
      // a big scalloped bite: the hole shows what's behind, ringed with sponge
      const [x, y, dx, dy] = BITES[i], px = -dy, py = dx, s = R * 0.6, cx = x - dx * s * 0.3, cy = y - dy * s * 0.3;
      const pts = [[cx + px * s * 0.95 + dx * s * 0.3, cy + py * s * 0.95 + dy * s * 0.3], [cx, cy], [cx - px * s * 0.95 + dx * s * 0.3, cy - py * s * 0.95 + dy * s * 0.3]];
      const circles = rr => { g.beginPath(); for (const [qx, qy] of pts) { g.moveTo(qx + rr, qy); g.arc(qx, qy, rr, 0, TAU); } };
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = '#d99a4a'; circles(s + 11); g.fill();
      g.fillStyle = '#f7d894'; circles(s + 8); g.fill();
      g.fillStyle = 'rgba(190,130,50,.55)';
      for (const [qx, qy] of pts) for (let k = 0; k < 7; k++) { const an = k * 0.9 + i; g.beginPath(); g.arc(qx + Math.cos(an) * (s + 4), qy + Math.sin(an) * (s + 4), 1.7, 0, TAU); g.fill(); }
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      circles(s); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    return c;
  }
  function cakeSprite(nb, lives, R) {
    const key = lives + '/' + nb; if (!CAKES[key]) CAKES[key] = makeCake(nb, lives, R); return CAKES[key];
  }

  class Cake {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.ok = false;
      const kid = this.kid, n = this.n = ctx.players.length;
      this.dur = kid ? 90 : 100; this.lives = kid ? 8 : 5; this.bitten = 0; this.biteR = kid ? 50 : 60;
      this.R = kid ? 150 : 110; this.cdMax = 0.6; this.munchT = kid ? 1.6 : 0.8;
      this.spd = kid ? { N: 46, F: 80, L: 46, B: 40 } : { N: 64, F: 112, L: 60, B: 42 };
      this.es = ctx.players.map((p, i) => ({
        kind: 0, p, x: CX + (i - (n - 1) / 2) * 92, y: CY + 175 + (i % 2) * 34, vx: 0, vy: 0, face: -Math.PI / 2, r: 30,
        cd: 0, walk: 0, squash: 0, sqv: 0, moving: false, boom: 0, scared: 0, mv: 0, cheer: 0, worry: 0
      }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.ants = []; this.wave = 0; this.cakeHurt = 0; this.danger = null; this.total = 0;
      this.cake = { kind: 2, y: CY - 30 }; this.balloon = { kind: 3, y: BY0 + 40 };
      this.confetti = []; for (let i = 0; i < 90; i++) this.confetti.push({ x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, c: CONF[i % 6], life: 0 });
      this.endT = 0; this.lastClock = null; this.blown = false;
      // ambient life: guests who cheer and gasp, petals, ant trails, ducks
      this.guests = GUESTS.map(([x, y, col, animal, hat], i) => ({ x, y, col, animal, hat, cheer: 0, worry: 0, ph: i * 1.7 }));
      this.petals = []; for (let i = 0; i < 18; i++) this.petals.push({ x: rnd(-100, W), y: rnd(0, H), vx: rnd(14, 34), vy: rnd(22, 40), a: rnd(0, TAU), va: rnd(-2, 2), ph: rnd(0, TAU) });
      this.trail = new Float32Array(NTR * 3); this.trI = 0; for (let i = 0; i < NTR; i++) this.trail[i * 3 + 2] = -99;
      this.quack = 0; this.quackT = rnd(4, 8);
      this.buildWaves();
      ensureArt(); if (!BG) BG = makeBg();
      cakeSprite(0, this.lives, this.biteR);
    }
    /* plan every group of bugs up front: when, from where, what and how many */
    buildWaves() {
      const kid = this.kid, n = this.n, WV = this.waves = kid ? KID_WAVES : ADULT_WAVES;
      const f = kid ? 0.7 + 0.3 * n : 0.75 + 0.25 * n + 0.06 * n * n;
      this.groups = [];
      WV.forEach((w, i) => {
        const end = i + 1 < WV.length ? WV[i + 1].at - 2.5 : this.dur - 8;
        let budget = Math.round((kid ? 5 + 2.2 * i : 8 + 3 * i) * f);
        const list = [];
        while (budget > 0) {
          const c = w.mix[rint(w.mix.length)];
          let cnt = c === 'L' ? 6 : c === 'B' ? 1 + (n > 2 && Math.random() < 0.4 ? 1 : 0) : c === 'F' ? 2 + rint(2) : 2 + rint(3);
          if (c !== 'L') cnt = Math.min(cnt, budget);
          list.push({ c, n: cnt }); budget -= c === 'B' ? cnt * 2 : cnt;
        }
        const t0 = w.at + 1.6, span = Math.max(1, end - t0);
        let lastA = rnd(0, TAU);
        list.forEach((gr, j) => {
          const a = lastA + rnd(1.3, 4.9); lastA = a;
          const [sx, sy] = this.rayRect(a, X0 - 36, Y0 - 40, X1 + 36, Y1 + 44), [wx, wy] = this.rayRect(a, X0 + 56, Y0 + 50, X1 - 56, Y1 - 46);
          this.groups.push({ t: t0 + span * (list.length === 1 ? 0 : j / (list.length - 1)) * 0.92 + rnd(0, 0.5), c: gr.c, left: gr.n, n: gr.n, sx, sy, wx, wy, a: a + Math.PI, next: 0, prev: null });
        });
      });
      this.groups.sort((a, b) => a.t - b.t);
    }
    /* where a ray from the cake leaves a rectangle */
    rayRect(a, x0, y0, x1, y1) {
      const c = Math.cos(a), s = Math.sin(a); let k = Infinity;
      if (c > 1e-6) k = Math.min(k, (x1 - CX) / c); else if (c < -1e-6) k = Math.min(k, (x0 - CX) / c);
      if (s > 1e-6) k = Math.min(k, (y1 - CY) / s); else if (s < -1e-6) k = Math.min(k, (y0 - CY) / s);
      return [CX + c * k, CY + s * k];
    }
    spawn(gr) {
      const type = TYPE[gr.c], px = -Math.sin(gr.a), py = Math.cos(gr.a), j = gr.c === 'L' ? 0 : rnd(-30, 30);
      const sp = this.spd[gr.c] * (1 + 0.18 * this.t / this.dur) * rnd(0.92, 1.08);
      const a = {
        kind: 1, type, x: gr.sx + px * j, y: gr.sy + py * j, h: gr.a, sp, st: 'march', stT: 0, ph: rnd(0, TAU), step: rnd(0, 4),
        r: type === 2 ? 30 : 19, hp: type === 2 ? 2 : 1, lx: gr.sx + px * j, ly: gr.sy + py * j, vx: 0, vy: 0, hz: 0, hv: 0, spin: 0, carry: false, lead: null, flag: false, ex: 0, gone: false
      };
      if (gr.c === 'L') { if (gr.prev) a.lead = gr.prev; else a.flag = true; gr.prev = a; }
      this.ants.push(a);
    }
    active(a) { return a.st !== 'dizzy' && a.st !== 'flee' && !a.gone; }
    q(x, y, sx, sy) { const dx = (x - CX) / sx, dy = (y - CY) / sy; return Math.sqrt(dx * dx + dy * dy); }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      this.cakeHurt = Math.max(0, this.cakeHurt - dt);
      // waves and groups
      const w = this.waves[this.wave];
      if (w && this.t >= w.at) {
        this.wave++;
        Fx.announce(w.name, w.mix.includes('B') && this.wave === 3 ? '#2f7a68' : w.mix.includes('F') && this.wave === 2 ? '#e0402f' : '#c2185b');
        ctx.sfx('whoosh');
      }
      for (const gr of this.groups) {
        if (gr.left <= 0) continue; if (this.t < gr.t) break;
        gr.next -= dt; if (gr.next > 0) continue;
        gr.next = gr.c === 'L' ? 0.5 : gr.c === 'F' ? 0.32 : gr.c === 'B' ? 0.9 : 0.55;
        this.spawn(gr); gr.left--;
      }
      // players
      for (const e of this.es) {
        e.cd -= dt; e.boom = Math.max(0, e.boom - dt);
        e.cheer -= dt;
        steer(e, ctx.input(e.p), kid ? 340 : 360, dt);
        e.x += e.vx * dt; e.y += e.vy * dt;
        this.offPond(e, e.r * 0.7);
        // keep off the cake plate
        const sx = PRX + e.r * 0.7, sy = PRY + e.r * 0.45, qd = this.q(e.x, e.y, sx, sy);
        if (qd < 1) { if (qd < 1e-3) e.y = CY + sy; else { e.x = CX + (e.x - CX) / qd; e.y = CY + (e.y - CY) / qd; } }
        e.x = clamp(e.x, X0 + e.r, X1 - e.r); e.y = clamp(e.y, Y0 + e.r, Y1 - e.r);
        Fx.walk(e, dt, 'rgba(255,255,255,.7)');
        if (ctx.pressed(e.p, 0) && e.cd <= 0) this.stomp(e);
        const d = this.danger; e.worry = d && d.st === 'munch' ? 1 : Math.max(0, e.worry - dt * 2);
      }
      // bugs
      let best = null, bq = Infinity;
      const A = this.ants;
      for (const a of A) {
        a.ex = Math.max(0, a.ex - dt);
        this.move(a, dt);
        this.offPond(a, a.r * 0.6);
        if ((a.st === 'march' || a.st === 'carry' || a.st === 'lost') && hyp(a.x - a.lx, a.y - a.ly) > 14) {   // a dotted trail behind every marching bug
          a.lx = a.x; a.ly = a.y; const T = this.trail, j = this.trI * 3; T[j] = a.x - Math.cos(a.h) * a.r * 0.6; T[j + 1] = a.y - Math.sin(a.h) * a.r * 0.6 + 3; T[j + 2] = this.t; this.trI = (this.trI + 1) % NTR;
        }
        if (kid && (a.st === 'march' || a.st === 'lost' || a.st === 'munch')) {
          for (const e of this.es) {
            const dx = a.x - e.x, dy = a.y - e.y, rr = e.r + a.r * 0.7;
            if (dx * dx + dy * dy < rr * rr) {
              const d = Math.sqrt(dx * dx + dy * dy) || 1;
              a.st = 'turn'; a.stT = 1.3; a.h = Math.atan2(dy, dx); a.x = e.x + dx / d * rr; a.y = e.y + dy / d * rr; a.ex = 0.7; a.lead = null;
              ctx.sfx('pop'); break;
            }
          }
        }
        if (a.st === 'march' || a.st === 'munch') { const qa = this.q(a.x, a.y, PRX, PRY) - (a.st === 'munch' ? 1 : 0); if (qa < bq) { bq = qa; best = a; } }
      }
      this.danger = best;
      // a little elbow room between marching bugs
      for (let i = 0; i < A.length; i++) {
        const a = A[i]; if (a.st !== 'march') continue;
        for (let j = i + 1; j < A.length; j++) {
          const b = A[j]; if (b.st !== 'march') continue;
          const dx = a.x - b.x, dy = a.y - b.y, rr = (a.r + b.r) * 0.9, d2 = dx * dx + dy * dy;
          if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), f = (rr - d) * 0.5 / d; a.x += dx * f; a.y += dy * f; b.x -= dx * f; b.y -= dy * f; }
        }
      }
      let k = 0; for (const a of A) if (!a.gone) A[k++] = a; A.length = k;
      this.ambient(dt);
      if (this.t >= this.dur && !this.over) this.win();
    }
    /* keep players and bugs out of the duck pond (they slide round its edge) */
    offPond(o, pad) {
      const P = POND, qx = (o.x - P.x) / (P.rx + pad), qy = (o.y - P.y) / (P.ry + pad * 0.6), q = Math.sqrt(qx * qx + qy * qy);
      if (q < 1) { if (q < 1e-3) o.y = P.y - P.ry - pad; else { o.x = P.x + qx / q * (P.rx + pad); o.y = P.y + qy / q * (P.ry + pad * 0.6); } }
    }
    /* petals drift, guests calm down, ducks quack now and then */
    ambient(dt) {
      for (const p of this.petals) {
        p.ph += dt; p.a += p.va * dt; p.x += (p.vx + Math.sin(p.ph * 1.3) * 22) * dt; p.y += p.vy * dt;
        if (p.y > H + 20 || p.x > W + 40) { p.x = rnd(-200, W - 300); p.y = -20; }
      }
      for (const q of this.guests) { q.cheer -= dt; q.worry -= dt; }
      this.quack -= dt; this.quackT -= dt; if (this.quackT <= 0) { this.quackT = rnd(7, 14); this.quack = 1.1; }
    }
    /* one bug's little brain */
    move(a, dt) {
      const s = a.st;
      if (s === 'dizzy' || s === 'bonk') {
        a.stT -= dt; a.x += a.vx * dt; a.y += a.vy * dt; const f = Math.exp(-5 * dt); a.vx *= f; a.vy *= f;
        a.hz += a.hv * dt; a.hv -= 1500 * dt; if (a.hz <= 0) { a.hz = 0; a.hv = a.hv < -160 ? -a.hv * 0.35 : 0; }
        a.spin += dt * (s === 'dizzy' ? 16 : 6) * Math.max(0.2, a.stT);
        if (a.stT <= 0) { a.hz = 0; if (s === 'dizzy') { a.st = 'flee'; a.h = Math.atan2(a.y - CY, a.x - CX); a.spin = 0; } else { a.st = 'march'; a.spin = 0; } }
        return;
      }
      let want = a.h, sp = a.sp;
      if (s === 'march') {
        if (a.lead && (a.lead.gone || a.lead.st !== 'march')) { a.lead = null; a.st = 'lost'; a.stT = 0.9; a.ex = 0.9; }
        else if (a.lead) {
          const dx = a.lead.x - a.x, dy = a.lead.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
          want = Math.atan2(dy, dx); sp = d > 34 ? a.sp * 1.25 : d > 24 ? a.sp * 0.7 : 0;
        } else want = Math.atan2(CY - a.y, CX - a.x) + Math.sin(this.t * 2.6 + a.ph) * 0.38;
      } else if (s === 'lost') {
        want = a.h + Math.sin(this.t * 7 + a.ph) * 1.5; sp = a.sp * 0.4; a.stT -= dt; if (a.stT <= 0) a.st = 'march';
      } else if (s === 'turn') {
        sp = a.sp * 1.4; a.stT -= dt; if (a.stT <= 0) a.st = 'march';
      } else if (s === 'munch') {
        a.stT -= dt; a.step += dt * 9;
        if (Math.random() < dt * 7) Fx.dust(a.x + Math.cos(a.h) * 14, a.y + Math.sin(a.h) * 14 - 6, Math.random() < 0.5 ? 'rgba(255,214,150,.95)' : 'rgba(255,170,205,.95)', 4);
        if (a.stT <= 0) this.bite(a);
        return;
      } else {   // flee / carry: run for the nearest way out
        want = Math.atan2(a.y - CY, a.x - CX) + Math.sin(this.t * 5 + a.ph) * 0.25; sp = a.sp * (s === 'flee' ? 2.3 : 1.25);
        if (s === 'flee' && Math.random() < dt * 3) Fx.dust(a.x, a.y + 4, 'rgba(255,255,255,.55)', 5);
      }
      let da = want - a.h; da = Math.atan2(Math.sin(da), Math.cos(da));
      a.h += da * Math.min(1, dt * (s === 'march' ? 4 : 7));
      a.x += Math.cos(a.h) * sp * dt; a.y += Math.sin(a.h) * sp * dt; a.step += sp * dt * 0.14;
      if (s === 'march' && this.q(a.x, a.y, PRX - 8, PRY - 6) <= 1) { a.st = 'munch'; a.stT = this.munchT; a.h = Math.atan2(CY - 60 - a.y, CX - a.x); a.lead = null; }
      if ((s === 'flee' || s === 'carry') && (a.x < X0 - 90 || a.x > X1 + 90 || a.y < Y0 - 90 || a.y > Y1 + 90)) a.gone = true;
    }
    stomp(e) {
      const ctx = this.ctx, R = this.R, C = PARTY_COLORS[e.p.col];
      e.cd = this.cdMax; e.squash = 0.34; e.sqv = -1; e.boom = 0.28;
      ctx.sfx('bonk', 0.15); ctx.buzz(e.p, 35);
      Fx.ring(e.x, e.y + 12, C.c, R, 0.42); Fx.ring(e.x, e.y + 12, '#ffffff', R * 0.62, 0.3);
      for (let k = 0; k < 10; k++) { const a = k * TAU / 10; Fx.dust(e.x + Math.cos(a) * 36, e.y + 22 + Math.sin(a) * 16, 'rgba(255,255,255,.85)', 11); }
      let n = 0;
      for (const a of this.ants) {
        if (!this.active(a)) continue;
        const dx = a.x - e.x, dy = a.y - e.y, rr = R + a.r * 0.5; if (dx * dx + dy * dy > rr * rr) continue;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (a.hp > 1) {
          a.hp--; a.st = 'bonk'; a.stT = 0.6; a.vx = dx / d * 240; a.vy = dy / d * 240; a.hv = 220; a.lead = null;
          Fx.pop(a.x, a.y - 40, '再一下！', '#2f7a68', 26); Fx.burst(a.x, a.y, '#8fe0c6', 6, 180); ctx.sfx('bonk', 0.7);
        } else { this.scare(a, dx / d, dy / d); n++; }
      }
      if (n) {
        e.scared += n; this.total += n; e.cheer = 0.8;
        if (n >= 2) for (const q of this.guests) q.cheer = Math.max(q.cheer, 1);
        Fx.pop(e.x, e.y - 92, n > 1 ? `嚇跑了 ${n} 隻！` : '嚇跑了！', C.d, n > 2 ? 40 : 32);
        ctx.sfx(n >= 3 ? 'star' : 'stun'); Fx.shake(n >= 3 ? 6 : 3); if (n >= 4) ctx.hitstop(0.05);
      }
    }
    scare(a, ux, uy) {
      a.st = 'dizzy'; a.stT = 0.95; a.vx = ux * 260; a.vy = uy * 260; a.hv = 330; a.hz = 0.1; a.lead = null;
      if (a.carry) { a.carry = false; Fx.burst(a.x, a.y - 10, '#f7d894', 6, 160); }
      Fx.burst(a.x, a.y - 8, '#ffe066', 5, 200);
      if (a.flag) for (const b of this.ants) if (b.lead === a) { b.lead = null; b.st = 'lost'; b.stT = 1.1; b.ex = 1.1; }
    }
    bite(a) {
      const ctx = this.ctx; a.st = 'carry'; a.carry = true; a.h = Math.atan2(a.y - CY, a.x - CX); a.lead = null;
      if (this.bitten >= this.lives || this.over) return;
      this.bitten++; this.cakeHurt = 0.5;
      for (const q of this.guests) q.worry = 1.4;
      const [bx, by] = BITES[this.bitten - 1];
      Fx.burst(CX + bx, CY + by, '#f7d894', 12, 260); Fx.burst(CX + bx, CY + by, '#ff9cc2', 8, 220);
      Fx.pop(CX + bx * 1.2, CY + by - 30, '被咬一口！', '#e0402f', 34);
      ctx.sfx('splat'); Fx.shake(5); Fx.flash('#ff9cc2', 0.18);
      this.es.forEach(e => ctx.buzz(e.p, 120));
      const left = this.lives - this.bitten;
      if (left <= 0) {
        this.over = true; this.ok = false; ctx.sfx('end');
        Fx.pop(CX, CY - 170, '蛋糕被吃光了…', '#8e1f15', 46);
        for (const b of this.ants) if (b.st === 'munch' || b.st === 'march') { b.st = 'carry'; b.carry = true; b.h = Math.atan2(b.y - CY, b.x - CX); }
      } else if (left === 2) Fx.announce('蛋糕只剩 2 塊了！', '#e0402f');
      else if (left === 1) Fx.announce('最後 1 塊了！快保護！', '#e0402f');
    }
    win() {
      const ctx = this.ctx; this.over = true; this.ok = true; this.blown = true;
      ctx.sfx('star'); Fx.flash('#fff6c8', 0.35);
      for (const a of this.ants) if (a.st !== 'flee') { a.st = 'flee'; a.h = Math.atan2(a.y - CY, a.x - CX); a.hz = 0; a.spin = 0; a.ex = 0.8; }
      this.confettiBurst(CX, CY - 200, 60);
      this.es.forEach(e => { ctx.buzz(e.p, 150); e.sqv -= 3; e.cheer = 0.8; });
      for (const q of this.guests) q.cheer = 99;
    }
    confettiBurst(x, y, n) {
      for (const c of this.confetti) {
        if (n <= 0) break; if (c.life > 0) continue; n--;
        const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), sp = rnd(260, 640);
        c.x = x + rnd(-40, 40); c.y = y; c.vx = Math.cos(a) * sp; c.vy = Math.sin(a) * sp; c.a = rnd(0, TAU); c.va = rnd(-12, 12); c.life = rnd(1.4, 2.4);
      }
    }
    /* after the round: the party keeps moving under the result card */
    post(dt) {
      this.endT += dt;
      for (const a of this.ants) if (!a.gone && (a.st === 'flee' || a.st === 'carry' || a.st === 'dizzy')) {
        if (a.st === 'dizzy') { a.st = 'flee'; a.hz = 0; }
        a.x += Math.cos(a.h) * a.sp * 2.2 * dt; a.y += Math.sin(a.h) * a.sp * 2.2 * dt; a.step += a.sp * dt * 0.3;
      }
      for (const e of this.es) { e.sqv += (-e.squash * 260 - e.sqv * 16) * dt; e.squash += e.sqv * dt; e.cheer -= dt; if (this.ok && e.cheer < -0.6) e.cheer = 0.8; e.mv *= Math.exp(-8 * dt); }
      this.ambient(dt);
      if (this.ok && this.endT < 1.6 && Math.random() < dt * 8) this.confettiBurst(rnd(BX0 + 60, BX1 - 60), CY - 120, 5);
      for (const c of this.confetti) if (c.life > 0) { c.life -= dt; c.vy += 560 * dt; c.vx *= 0.985; c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt; }
    }

    /* ---------- drawing ---------- */
    drawBug(g, a, t) {
      const spr = BUGS[a.type][(a.step | 0) & 3], S = spr.width;
      let rot = a.h + a.spin, y = a.y - a.hz;
      if (a.st === 'munch') rot += Math.sin(t * 22 + a.ph) * 0.12;
      if (a.st === 'munch') {   // pulsing red ring: someone is eating the cake!
        const p = 0.5 + 0.5 * Math.sin(t * 12 + a.ph);
        g.strokeStyle = '#ff3b4a'; g.globalAlpha = 0.5 + 0.4 * p; g.lineWidth = 4; g.beginPath(); g.ellipse(a.x, a.y + 4, a.r + 10 + p * 5, (a.r + 10 + p * 5) * 0.7, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
      }
      if (a.hz > 0) { g.fillStyle = 'rgba(30,40,20,.18)'; g.beginPath(); g.ellipse(a.x, a.y + 4, a.r * 0.9, a.r * 0.4, 0, 0, TAU); g.fill(); }
      g.save(); g.translate(a.x, y); g.rotate(rot);
      if (a.st === 'dizzy') g.scale(1, -1);   // flipped on its back, legs in the air
      g.drawImage(spr, -S / 2, -S / 2);
      g.restore();
      if (a.carry) g.drawImage(CRUMB, a.x + Math.cos(a.h) * 14 - 15, y + Math.sin(a.h) * 14 - 28);
      if (a.flag) {   // the line leader waves a little flag
        const fx = a.x - Math.cos(a.h) * 8, fy = y - 4, wv = Math.sin(t * 9 + a.ph) * 3;
        g.strokeStyle = '#5a3a1a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 34); g.stroke();
        g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(fx, fy - 34); g.quadraticCurveTo(fx + 10, fy - 30 + wv, fx + 20, fy - 28 + wv); g.lineTo(fx, fy - 20); g.closePath(); g.fill();
      }
      if (a.st === 'dizzy' || (a.st === 'flee' && a.ex > 0)) {   // stars spinning round its head
        const cy = y - a.r - 10;
        for (let k = 0; k < 3; k++) { const an = t * 7 + k * TAU / 3; g.drawImage(STAR, a.x + Math.cos(an) * 16 - 8, cy + Math.sin(an) * 5 - 8, 16, 16); }
      } else if (a.st === 'flee') {   // sweat drop as it runs off
        const k = (t * 3 + a.ph) % 1; g.globalAlpha = 1 - k; g.fillStyle = '#7fd0ff';
        g.beginPath(); g.ellipse(a.x - Math.cos(a.h) * 10, y - a.r - 6 - k * 8, 3, 5, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
      if (a.ex > 0 && (a.st === 'turn' || a.st === 'lost')) {
        const s = a.st === 'turn' ? '！' : '？', yy = y - a.r - 14 - (1 - Math.min(1, a.ex * 3)) * 6;
        g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText(s, a.x, yy); g.fillStyle = a.st === 'turn' ? '#ff6b2e' : '#5b5bd6'; g.fillText(s, a.x, yy);
      }
    }
    drawCake(g, t) {
      const spr = cakeSprite(this.bitten, this.lives, this.biteR), hurt = this.cakeHurt / 0.5;
      const jx = hurt > 0 ? Math.sin(t * 70) * 5 * hurt : 0, sq = hurt * 0.06;
      g.save(); g.translate(CX + jx, CY); g.scale(1 + sq, 1 - sq);
      if (this.bitten < this.lives) { g.fillStyle = 'rgba(140,60,90,.2)'; g.beginPath(); g.ellipse(5, TIERS[0].by + 4, TIERS[0].rx + 4, TIERS[0].ry + 3, 0, 0, TAU); g.fill(); }
      g.drawImage(spr, -OX, -OY);
      if (this.bitten < this.lives) {
        const bt = this.endT;
        for (let i = 0; i < CANDLES.length; i++) {
          const [x, y] = CANDLES[i];
          g.fillStyle = 'rgba(160,80,110,.25)'; g.beginPath(); g.ellipse(x + 1, y + 1, 6, 2.5, 0, 0, TAU); g.fill();
          g.fillStyle = CANDLE_C[i]; g.beginPath(); g.roundRect(x - 4, y - 30, 8, 30, 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 3; k++) g.fillRect(x - 4, y - 25 + k * 9, 8, 3);
          g.strokeStyle = '#3a3346'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x, y - 35); g.stroke();
          if (!this.blown) {
            const f = 1 + 0.16 * Math.sin(t * 17 + i * 2.1) + 0.08 * Math.sin(t * 31 + i), sw = Math.sin(t * 9 + i * 1.7) * 1.8, fy = y - 35;
            g.globalAlpha = 0.22 + 0.06 * Math.sin(t * 13 + i); g.fillStyle = '#ffe066'; g.beginPath(); g.arc(x, fy - 8, 15 * f, 0, TAU); g.fill(); g.globalAlpha = 1;
            for (const [s, col] of [[1, '#ff8a1f'], [0.68, '#ffd23f'], [0.36, '#fffbe0']]) {
              const w = 5.5 * s, h = 19 * s * f;
              g.fillStyle = col; g.beginPath(); g.moveTo(x - w, fy); g.quadraticCurveTo(x - w, fy - h * 0.55, x + sw, fy - h); g.quadraticCurveTo(x + w, fy - h * 0.55, x + w, fy); g.quadraticCurveTo(x, fy + w * 0.8, x - w, fy); g.fill();
            }
          } else {   // blown out: wisps of smoke curl up
            for (let k = 0; k < 3; k++) {
              const u = (bt * 0.7 + k / 3 + i * 0.13) % 1;
              g.globalAlpha = (1 - u) * 0.5 * Math.min(1, bt * 2); g.fillStyle = '#cfcad6';
              g.beginPath(); g.arc(x + Math.sin(u * 7 + i) * 6, y - 38 - u * 60, 3 + u * 6, 0, TAU); g.fill();
            }
            g.globalAlpha = 1;
          }
        }
      }
      g.restore();
    }
    drawBalloons(g, t) {
      const x0 = BX1 + 34, y0 = BY0 + 40;
      for (const [dx, h, col, ph] of [[-16, 150, '#ff4f58', 0], [10, 176, '#2f8cff', 1.7], [30, 138, '#ffbf1f', 3.1]]) {
        const bx = x0 + dx + Math.sin(t * 1.3 + ph) * 6, by = y0 - h + Math.sin(t * 1.7 + ph) * 4;
        g.strokeStyle = 'rgba(80,70,90,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + dx * 0.5 + 6, (y0 + by) / 2, bx, by + 30); g.stroke();
        g.fillStyle = col; g.beginPath(); g.ellipse(bx, by, 24, 29, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(bx - 5, by + 33); g.lineTo(bx + 5, by + 33); g.lineTo(bx, by + 27); g.fill();
        g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(bx - 9, by - 11, 6, 10, -0.4, 0, TAU); g.fill();
      }
      g.fillStyle = '#8a5a2b'; g.beginPath(); g.roundRect(x0 - 4, y0 - 8, 8, 14, 3); g.fill();
    }
    drawPlayer(g, e, t) {
      const C = PARTY_COLORS[e.p.col], r = e.r, ch = Math.max(0, e.cheer), hop = Math.abs(Math.sin(e.walk)) * 7 * e.mv + (ch > 0 ? Math.sin((1 - ch / 0.8) * Math.PI) * 14 : 0);
      if (e.boom > 0) {   // a cartoon "pow" star under the feet
        const k = e.boom / 0.28, s = (1 - k) * 0.6 + 0.6;
        g.globalAlpha = k; g.fillStyle = '#ffe066'; g.beginPath();
        for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = (i % 2 ? 26 : 54) * s; g.lineTo(e.x + Math.cos(a) * rr, e.y + 22 + Math.sin(a) * rr * 0.45); }
        g.closePath(); g.fill(); g.globalAlpha = 1;
      }
      const sq = clamp(e.squash, -0.24, 0.36), hh = hop + (e.boom > 0.2 ? 4 : 0), bob = e.mv > 0.15 ? Math.abs(Math.sin(e.walk)) * r * 0.06 : 0;
      drawCritter(g, e.x, e.y, r, e.p.col, e.p.animal, { face: e.face, hop: hh, squash: sq, step: e.walk, moving: e.mv > 0.15, happy: e.boom > 0 || e.cheer > 0, blink: (t + e.p.uid * 1.3) % 3.6 < 0.12 });
      onBody(g, e.x, e.y, r, hh, sq, bob);
      bib(g, r, e.face);
      partyHat(g, r, C.c, e.face, e.boom > 0 ? -0.25 : Math.sin(e.walk) * 0.06 * e.mv);
      if (e.worry > 0.3 && e.boom <= 0) sweat(g, (Math.cos(e.face) >= 0 ? -1 : 1) * r * 0.8, -r * 0.4, t, e.p.uid * 0.37);
      g.restore();
      drawTag(g, e.x, e.y - r - 48 - hop, e.p);
      if (e.cd > 0) { g.strokeStyle = C.c; g.globalAlpha = 0.85; g.lineWidth = 5; g.beginPath(); g.arc(e.x, e.y + r + 14, 9, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - e.cd / this.cdMax)); g.stroke(); g.globalAlpha = 1; }
      // kids: an arrow to the bug that's closest to the cake when it's out of reach
      const d = this.danger;
      if (this.kid && d && !this.over && hyp(d.x - e.x, d.y - e.y) > this.R + 40) {
        const a = Math.atan2(d.y - e.y, d.x - e.x), R = r + 34 + Math.sin(t * 8) * 4, ax = e.x + Math.cos(a) * R, ay = e.y + Math.sin(a) * R * 0.8;
        g.save(); g.translate(ax, ay); g.rotate(a); g.fillStyle = d.st === 'munch' ? '#ff3b4a' : '#ff8a1f'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.globalAlpha = 0.9;
        g.beginPath(); g.moveTo(13, 0); g.lineTo(-8, -12); g.lineTo(-3, 0); g.lineTo(-8, 12); g.closePath(); g.stroke(); g.fill(); g.restore();
      }
    }
    /* picnic guests above the meadow: cheer when bugs are scared off, gasp when the cake is bitten */
    drawGuests(g, t) {
      for (const q of this.guests) {
        const ch = q.cheer > 0, wo = q.worry > 0 && !ch, hop = ch ? Math.abs(Math.sin(t * 9 + q.ph)) * 10 : Math.abs(Math.sin(t * 1.5 + q.ph)) * 1.5;
        drawCritter(g, q.x, q.y, 17, q.col, q.animal, { face: Math.PI / 2 + Math.sin(t * 0.6 + q.ph) * 0.4, hop, step: 0, moving: false, happy: ch, stun: wo });
        onBody(g, q.x, q.y, 17, hop, 0, 0); partyHat(g, 17, q.hat, Math.PI / 2, 0.1 * Math.sin(t + q.ph)); if (wo) sweat(g, 13, -8, t, q.ph); g.restore();
      }
      // parasols over each group
      for (const [px, col] of [[178, '#ff6fb7'], [1426, '#ffbf1f']]) {
        g.strokeStyle = '#8a5a2b'; g.lineWidth = 4; g.beginPath(); g.moveTo(px, 150); g.lineTo(px - 6, 74); g.stroke();
        g.fillStyle = 'rgba(30,70,20,.12)'; g.beginPath(); g.ellipse(px + 4, 146, 70, 10, 0, 0, TAU); g.fill();
        g.save(); g.translate(px - 6, 74); g.rotate(-0.06);
        for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#fff' : col; g.beginPath(); g.moveTo(0, -8); g.lineTo(-72 + k * 24, 10); g.quadraticCurveTo(-60 + k * 24, 16, -48 + k * 24, 10); g.closePath(); g.fill(); }
        g.fillStyle = col; g.beginPath(); g.arc(0, -10, 4, 0, TAU); g.fill();
        g.restore();
      }
    }
    /* kites flown by the guests on each side */
    drawKites(g, t) {
      for (const [ax, ay, kx, ky, col, ph] of [[222, 128, 380, 214, '#2f8cff', 0], [1470, 128, 1250, 196, '#ff4f58', 2.2]]) {
        const x = kx + Math.sin(t * 0.7 + ph) * 34, y = ky + Math.sin(t * 1.1 + ph) * 18, rot = Math.sin(t * 1.3 + ph) * 0.18;
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + x) / 2, Math.max(ay, y) + 30, x, y + 26); g.stroke();
        g.save(); g.translate(x, y); g.rotate(rot);
        g.strokeStyle = '#5a3a1a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 26);
        for (let k = 1; k <= 6; k++) g.lineTo(Math.sin(t * 5 + k + ph) * 6, 26 + k * 10); g.stroke();
        for (let k = 2; k <= 6; k += 2) { const bx = Math.sin(t * 5 + k + ph) * 6, by = 26 + k * 10; g.fillStyle = k % 4 ? '#ffd23f' : '#ff6fb7'; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 6, by - 4); g.lineTo(bx - 6, by + 4); g.closePath(); g.moveTo(bx, by); g.lineTo(bx + 6, by - 4); g.lineTo(bx + 6, by + 4); g.closePath(); g.fill(); }
        g.fillStyle = col; g.beginPath(); g.moveTo(0, -30); g.lineTo(22, -2); g.lineTo(0, 26); g.lineTo(-22, -2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(0, -30); g.lineTo(22, -2); g.lineTo(0, -2); g.closePath(); g.moveTo(0, -2); g.lineTo(-22, -2); g.lineTo(0, 26); g.closePath(); g.fill();
        g.strokeStyle = '#5a3a1a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 26); g.moveTo(-22, -2); g.lineTo(22, -2); g.stroke();
        g.restore();
      }
    }
    /* a mother duck and her ducklings paddling round the pond */
    drawDucks(g, t) {
      const P = POND;
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
      for (let k = 0; k < 2; k++) { const u = (t * 0.4 + k / 2) % 1; g.globalAlpha = 1 - u; g.beginPath(); g.ellipse(P.x + 30, P.y + 6, 10 + u * 50, 4 + u * 20, 0, 0, TAU); g.stroke(); }
      g.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const a = t * 0.32 - i * 0.42, x = P.x + Math.cos(a) * P.rx * 0.62, y = P.y + Math.sin(a) * P.ry * 0.55, s = i ? 0.62 : 1, d = -Math.sin(a) >= 0 ? 1 : -1, bob = Math.sin(t * 4 + i) * 1.2;
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - d * 14 * s, y - 4 * s); g.lineTo(x - d * 24 * s, y - 9 * s); g.moveTo(x - d * 14 * s, y + 4 * s); g.lineTo(x - d * 24 * s, y + 7 * s); g.stroke();
        g.save(); g.translate(x, y + bob); g.scale(d * s, s);
        g.fillStyle = i ? '#ffe066' : '#fffaf3'; g.beginPath(); g.ellipse(0, 0, 15, 9, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(-12, -3); g.lineTo(-19, -9); g.lineTo(-14, 2); g.fill();
        g.fillStyle = i ? '#f2c94c' : '#e9e4f2'; g.beginPath(); g.ellipse(-2, -2, 8, 5, -0.2, 0, TAU); g.fill();
        g.fillStyle = i ? '#ffe066' : '#fffaf3'; g.beginPath(); g.arc(10, -10, 7, 0, TAU); g.fill();
        g.fillStyle = '#ff9f43'; g.beginPath(); g.moveTo(15, -11); g.lineTo(23, -9 + (this.quack > 0 && !i ? Math.sin(t * 30) * 2 : 0)); g.lineTo(15, -7); g.closePath(); g.fill();
        g.fillStyle = '#2b2340'; g.beginPath(); g.arc(12, -12, 1.6, 0, TAU); g.fill();
        g.restore();
      }
      if (this.quack > 0) {
        const a = t * 0.32, x = P.x + Math.cos(a) * P.rx * 0.62, y = P.y + Math.sin(a) * P.ry * 0.55;
        g.globalAlpha = Math.min(1, this.quack * 3); g.font = `900 18px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 5; g.strokeStyle = '#fff'; g.strokeText('呱呱～', x, y - 34); g.fillStyle = '#c96a2a'; g.fillText('呱呱～', x, y - 34); g.globalAlpha = 1;
      }
    }
    /* tiny dotted paths the ants leave behind */
    drawTrails(g, now) {
      const T = this.trail; g.fillStyle = '#6b4a30';
      for (let b = 0; b < 4; b++) {
        g.globalAlpha = 0.34 - b * 0.08; g.beginPath();
        for (let i = 0; i < NTR; i++) { const age = now - T[i * 3 + 2]; if (age < 0 || age >= 6 || (age / 1.5 | 0) !== b) continue; const x = T[i * 3], y = T[i * 3 + 1]; g.moveTo(x + 2.2, y); g.arc(x, y, 2.2, 0, TAU); }
        g.fill();
      }
      g.globalAlpha = 1;
    }
    drawPetals(g) {
      for (const p of this.petals) {
        const fl = Math.cos(p.ph * 3); g.fillStyle = fl > 0 ? '#ffc6dc' : '#ff9fc4';
        g.beginPath(); g.ellipse(p.x, p.y, 6 * Math.max(0.25, Math.abs(fl)), 4, p.a, 0, TAU); g.fill();
      }
    }
    drawWarn(g, gr, t) {
      const k = (gr.t - this.t) / 1.5, on = (t * 6 | 0) % 2, x = gr.wx, y = gr.wy, a = gr.a, s = 1 + (on ? 0.08 : 0);
      g.save(); g.translate(x, y);
      g.globalAlpha = Math.min(1, (1 - k) * 3) * (on ? 1 : 0.7);
      g.rotate(a); g.scale(s, s);
      g.fillStyle = '#ff3b4a'; g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(66, 0); g.lineTo(34, -26); g.lineTo(34, -12); g.lineTo(-4, -12); g.lineTo(-4, 12); g.lineTo(34, 12); g.lineTo(34, 26); g.closePath(); g.stroke(); g.fill();
      g.rotate(-a);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill(); g.strokeStyle = '#ff3b4a'; g.lineWidth = 4; g.stroke();
      const spr = BUGS[TYPE[gr.c]][(t * 8 | 0) & 3], sc = gr.c === 'B' ? 0.46 : 0.62;
      g.rotate(a); g.drawImage(spr, -spr.width * sc / 2, -spr.width * sc / 2, spr.width * sc, spr.width * sc); g.rotate(-a);
      if (gr.n > 1) { g.font = `900 22px "Fredoka",${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = '#fff'; g.strokeText('×' + gr.n, 22, 26); g.fillStyle = '#c2185b'; g.fillText('×' + gr.n, 22, 26); }
      g.restore(); g.globalAlpha = 1;
    }
    draw(g, clock) {
      const t = this.t;
      if (this.over) { const dt = this.lastClock == null ? 0 : clamp(clock - this.lastClock, 0, 0.05); this.lastClock = clock; this.post(dt); }
      const tt = this.over ? t + this.endT : t;
      g.drawImage(BG, -400, 0);
      // soft stomp range under each player
      if (!this.over) for (const e of this.es) {
        const C = PARTY_COLORS[e.p.col], ready = e.cd <= 0;
        g.fillStyle = C.c; g.globalAlpha = ready ? 0.1 : 0.04; g.beginPath(); g.arc(e.x, e.y + 12, this.R, 0, TAU); g.fill();
        if (ready) { g.strokeStyle = C.c; g.globalAlpha = 0.35; g.lineWidth = 3; g.setLineDash([12, 10]); g.lineDashOffset = -tt * 20; g.stroke(); g.setLineDash([]); }
      }
      g.globalAlpha = 1;
      this.drawTrails(g, this.t);
      this.drawDucks(g, tt);
      this.drawGuests(g, tt);
      // a seesaw by the sandbox that rocks gently
      { const x = 1110, y = 812, a = Math.sin(tt * 1.2) * 0.16;
        g.fillStyle = 'rgba(30,70,20,.22)'; g.beginPath(); g.ellipse(x, y + 10, 70, 9, 0, 0, TAU); g.fill();
        g.fillStyle = '#7a4a22'; g.beginPath(); g.moveTo(x - 12, y + 8); g.lineTo(x, y - 12); g.lineTo(x + 12, y + 8); g.closePath(); g.fill();
        g.save(); g.translate(x, y - 12); g.rotate(a);
        g.fillStyle = '#ff9f43'; g.beginPath(); g.roundRect(-66, -5, 132, 10, 4); g.fill();
        for (const s of [-1, 1]) { g.fillStyle = s < 0 ? '#ff4f58' : '#2f8cff'; g.beginPath(); g.roundRect(s * 58 - 9, -10, 18, 7, 3); g.fill(); g.strokeStyle = '#3a3346'; g.lineWidth = 3; g.beginPath(); g.moveTo(s * 46, -4); g.lineTo(s * 46, -18); g.lineTo(s * 40, -18); g.stroke(); }
        g.restore(); }
      Fx.ground(g);
      // warnings where the next bugs will come in
      if (!this.over) for (const gr of this.groups) { if (gr.t - 1.5 > t) break; if (gr.left === gr.n && t < gr.t + 0.4) this.drawWarn(g, gr, tt); }
      // bugs on the ground, then players, cake and balloons back to front, then bugs climbing the cake
      const A = this.ants; A.sort((a, b) => a.y - b.y);
      for (const a of A) if (a.st !== 'munch') this.drawBug(g, a, tt);
      const L = [this.cake, this.balloon]; for (const e of this.es) L.push(e); L.sort((a, b) => a.y - b.y);
      for (const o of L) { if (o.kind === 0) this.drawPlayer(g, o, tt); else if (o.kind === 2) this.drawCake(g, tt); else this.drawBalloons(g, tt); }
      for (const a of A) if (a.st === 'munch') this.drawBug(g, a, tt);
      // the happy ending
      if (this.over && this.ok) {
        const k = Math.min(1, this.endT / 0.35), s = (k < 1 ? 0.4 + 0.8 * k - 0.2 * Math.sin(k * Math.PI) : 1) * (1 + 0.04 * Math.sin(this.endT * 6));
        g.save(); g.translate(CX, CY - 300); g.scale(s, s); g.rotate(Math.sin(this.endT * 3) * 0.03);
        g.font = `900 84px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        g.lineWidth = 18; g.strokeStyle = '#fff'; g.strokeText('生日快樂！', 0, 0);
        g.fillStyle = '#f472b6'; g.fillText('生日快樂！', 0, 0);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillText('生日快樂！', -2, -3);
        g.restore();
      }
      this.drawKites(g, tt);
      this.drawPetals(g);
      for (const c of this.confetti) if (c.life > 0) {
        g.globalAlpha = Math.min(1, c.life * 2); g.fillStyle = c.c;
        g.save(); g.translate(c.x, c.y); g.rotate(c.a); g.fillRect(-6, -3.5, 12, 7); g.restore();
      }
      g.globalAlpha = 1;
    }
    center() {
      const left = Math.max(0, this.lives - this.bitten), m = this.ants.some(a => a.st === 'munch');
      return (m ? '⚠️ 有螞蟻在偷吃！・' : '') + '🎂 剩 ' + left + ' 塊・第 ' + Math.max(1, this.wave) + ' 波';
    }
    chip(p) { return '👣 ' + this.by.get(p).scared; }
    pad(p) { return '🎂 剩 ' + Math.max(0, this.lives - this.bitten) + ' 塊・第 ' + Math.max(1, this.wave) + ' 波　你嚇跑 ' + this.by.get(p).scared + ' 隻'; }
    ready(p) { return this.by.get(p).cd <= 0; }
    results() {
      const left = Math.max(0, this.lives - this.bitten);
      const stars = this.ok ? (this.bitten === 0 ? 3 : left > this.lives / 2 ? 2 : 1) : 0;
      return {
        team: true, ok: this.ok, stars,
        title: this.ok ? (this.bitten === 0 ? '一口都沒被吃！' : '蛋糕保住了！') : '蛋糕被吃光了…',
        sub: this.ok ? `蛋糕還剩 ${left} / ${this.lives} 塊・大家一起嚇跑 ${this.total} 隻蟲蟲` : `撐到第 ${Math.max(1, this.wave)} 波・大家一起嚇跑 ${this.total} 隻蟲蟲`,
        rows: this.es.slice().sort((a, b) => b.scared - a.scared).map(e => ({ p: e.p, key: e.scared, line: `嚇跑 ${e.scared} 隻` }))
      };
    }
  }
  GAMES.push({
    id: 'cake', name: '保護蛋糕', icon: '🎂', col: '#f472b6', bg: '#79c35f', kind: 'team', players: '1–6 人',
    blurb: '大家合作，別讓螞蟻偷吃生日蛋糕！',
    btn: { label: '跺腳', icon: '👣' },
    rules: kid => kid
      ? ['螞蟻要來偷吃蛋糕！紅箭頭是牠們來的地方', '按「跺腳」踩一下，圈圈裡的螞蟻會暈頭轉向跑走', '走路碰到螞蟻，牠也會嚇得掉頭', '撐過 90 秒、蛋糕還在就成功！']
      : ['螞蟻和甲蟲會從四面八方來偷吃蛋糕', '按「跺腳」嚇跑圈圈裡的蟲蟲（0.6 秒踩一次）', '紅色快螞蟻跑很快，甲蟲要踩兩下才會跑', '蛋糕只有 5 塊，撐過 100 秒就成功'],
    thumb(g) {
      ensureArt();
      g.fillStyle = '#8fd474'; g.fillRect(0, 0, 320, 180);
      g.save(); g.beginPath(); g.roundRect(70, 92, 180, 74, 10); g.clip();
      g.fillStyle = '#fff7f2'; g.fillRect(70, 92, 180, 74); g.fillStyle = 'rgba(232,70,88,.5)';
      for (let x = 70; x < 250; x += 24) g.fillRect(x, 92, 12, 74); for (let y = 92; y < 166; y += 24) g.fillRect(70, y, 180, 12);
      g.restore();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(160, 136, 62, 20, 0, 0, TAU); g.fill();
      g.save(); g.translate(160, 132); g.scale(0.44, 0.44); drawWholeCake(g);
      for (let i = 0; i < CANDLES.length; i++) {
        const [x, y] = CANDLES[i]; g.fillStyle = CANDLE_C[i]; g.fillRect(x - 4, y - 30, 8, 30);
        g.fillStyle = '#ff8a1f'; g.beginPath(); g.ellipse(x, y - 42, 6, 11, 0, 0, TAU); g.fill(); g.fillStyle = '#ffe066'; g.beginPath(); g.ellipse(x, y - 40, 3.5, 6, 0, 0, TAU); g.fill();
      }
      g.restore();
      for (const [x, y, a, ty] of [[30, 60, 0.3, 0], [52, 74, 0.4, 0], [290, 120, Math.PI, 1], [270, 40, 2.4, 0]]) { const s = BUGS[ty][0]; g.save(); g.translate(x, y); g.rotate(a); g.drawImage(s, -24, -24, 48, 48); g.restore(); }
      drawCritter(g, 262, 150, 22, 5, 2, { face: Math.PI, happy: true });
      g.drawImage(STAR, 276, 104, 16, 16); g.drawImage(STAR, 300, 110, 14, 14);
    },
    create: ctx => new Cake(ctx)
  });
})();
