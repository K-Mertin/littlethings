'use strict';
/* 一起救火 — everyone together: fires break out on the houses; walk up to one and
   HOLD the button — the hose aims itself at the nearest burning house in reach.
   If a fire burns all the way, that house is lost. Save the village until time runs out.
   小朋友: endless water, slow fires, can lose 4 houses.
   大人: the water tank empties (refill at the pond), fires grow faster and jump to
   the next house, only 2 houses may burn. */
(() => {
  const X0 = 50, Y0 = 150, X1 = 1550, Y1 = 870, POND = { x: 800, y: 540, rx: 120, ry: 70 };
  const HOUSES = [[230, 290], [560, 270], [1040, 270], [1370, 290], [230, 740], [560, 790], [1040, 790], [1370, 740]];
  const ROOFS = ['#ff6b5e', '#4f9dff', '#ffb02e', '#6bcf7f', '#b07aff', '#ff7fb8', '#3fc1c9', '#ff8f4a'];
  const STATION = { x: 800, y: 270, w: 110 };   // the fire station: base line at y, half width w
  const FLAMES = [[-44, -30], [44, -30], [0, -84], [-24, -58], [24, -58], [-62, -14], [62, -14]];
  const FONT = '"Noto Sans TC",system-ui,sans-serif';
  const NP = 340;   // particle pool size
  let BG = null, RUINS = null, STATION_C = null; const HOUSE_C = [];

  const VIL = [['#ffd9b8', '#5a3a1a'], ['#f2c29b', '#2b2340'], ['#ffe2c6', '#c96a2a'], ['#e8b48a', '#7a4a22'], ['#ffd9b8', '#9b9b9b'], ['#f2c29b', '#d64f8a'], ['#ffe2c6', '#3a3346'], ['#e8b48a', '#ffbf1f']];
  const NPUD = 24;   // puddle pool

  /* ---------- smooth controls: ease in, stop a little quicker, turn without snapping ---------- */
  function angTo(a, b, k) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * k; }
  function steer(e, i, sp, dt) {
    const tx = i.x * sp, ty = i.y * sp, cur = hyp(e.vx, e.vy), tgt = hyp(tx, ty);
    const k = 1 - Math.exp(-(tgt > cur + 1 ? 9 : 15) * dt);
    e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
    if (!tgt && hyp(e.vx, e.vy) < 14) e.vx = e.vy = 0;
    const s = hyp(e.vx, e.vy), go = tgt > 0;
    if (go !== e.moving) { e.moving = go; e.sqv += go ? -1.8 : 2.2; }
    if (go && !e.lock) e.face = angTo(e.face, Math.atan2(i.y, i.x), 1 - Math.exp(-13 * dt));
    e.mv += (Math.min(1, s / sp) - e.mv) * (1 - Math.exp(-10 * dt));
    e.walk += s * dt / 26;
    e.sqv += (-e.squash * 260 - e.sqv * 16) * dt; e.squash += e.sqv * dt;
  }
  function hopOf(e) { return Math.abs(Math.sin(e.walk)) * 7 * e.mv + (e.cheer > 0 ? Math.sin((1 - e.cheer) * Math.PI) * 14 : 0); }
  function onBody(g, e, hop, sq) {
    const bob = e.mv > 0.15 ? Math.abs(Math.sin(e.walk)) * e.r * 0.06 : 0;
    g.save(); g.translate(e.x, e.y - hop - bob); g.scale(1 + sq, 1 - sq);
  }
  function sweat(g, x, y, t, ph) {
    const k = (t * 2.2 + ph) % 1; g.globalAlpha = 1 - k; g.fillStyle = '#7fd0ff';
    g.beginPath(); g.moveTo(x, y + k * 10 - 7); g.quadraticCurveTo(x + 5, y + k * 10 + 1, x, y + k * 10 + 4); g.quadraticCurveTo(x - 5, y + k * 10 + 1, x, y + k * 10 - 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x - 1.2, y + k * 10, 1.2, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  /* firefighter helmet: long back brim, ribbed dome, flipped-up visor, badge in the player's colour */
  function helmet(g, r, face, col) {
    const lx = Math.cos(face), ly = Math.sin(face), hy = -r * 0.6;
    g.fillStyle = '#8f1e15'; g.beginPath(); g.ellipse(-lx * r * 0.2, hy + r * 0.06 - ly * r * 0.06, r * 1.08, r * 0.32, 0, 0, TAU); g.fill();
    g.fillStyle = '#c92c1f'; g.beginPath(); g.ellipse(-lx * r * 0.2, hy + r * 0.01 - ly * r * 0.06, r * 1.02, r * 0.26, 0, 0, TAU); g.fill();
    g.fillStyle = '#ef3b2c'; g.beginPath(); g.ellipse(0, hy, r * 0.78, r * 0.68, 0, Math.PI, 0); g.closePath(); g.fill();
    g.strokeStyle = '#c92c1f'; g.lineWidth = r * 0.05;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.5, hy - r * 0.02); g.quadraticCurveTo(s * r * 0.48, hy - r * 0.48, s * r * 0.14, hy - r * 0.64); g.stroke(); }
    g.strokeStyle = '#ff6a4f'; g.lineWidth = r * 0.17; g.beginPath(); g.moveTo(lx * r * 0.06, hy - r * 0.66); g.lineTo(lx * r * 0.1, hy - r * 0.06); g.stroke();
    g.strokeStyle = '#c92c1f'; g.lineWidth = r * 0.04; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(-r * 0.36, hy - r * 0.4, r * 0.16, r * 0.08, -0.6, 0, TAU); g.fill();
    if (ly > -0.5) {
      // the visor, flipped up on the front of the dome
      g.strokeStyle = 'rgba(255,190,60,.75)'; g.lineWidth = r * 0.15; g.beginPath(); g.ellipse(lx * r * 0.1, hy - r * 0.04, r * 0.66, r * 0.5, 0, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = r * 0.03; g.beginPath(); g.ellipse(lx * r * 0.1, hy - r * 0.06, r * 0.62, r * 0.47, 0, Math.PI * 1.2, Math.PI * 1.45); g.stroke();
      // front shield badge
      const bx = lx * r * 0.3, by = hy - r * 0.3;
      g.fillStyle = '#fff3c4'; g.strokeStyle = '#c9961e'; g.lineWidth = r * 0.05;
      g.beginPath(); g.moveTo(bx - r * 0.2, by - r * 0.18); g.quadraticCurveTo(bx, by - r * 0.3, bx + r * 0.2, by - r * 0.18); g.lineTo(bx + r * 0.17, by + r * 0.06); g.quadraticCurveTo(bx, by + r * 0.24, bx - r * 0.17, by + r * 0.06); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = col; g.beginPath(); g.arc(bx, by - r * 0.02, r * 0.09, 0, TAU); g.fill();
    }
  }
  /* the water tank on the back, with a little window showing how much is left */
  function tank(g, r, x, y, k) {
    g.fillStyle = '#3a3346'; g.beginPath(); g.roundRect(x - r * 0.25, y - r * 0.55, r * 0.5, r * 0.95, r * 0.22); g.fill();
    g.fillStyle = '#d63a2a'; g.beginPath(); g.roundRect(x - r * 0.21, y - r * 0.51, r * 0.42, r * 0.87, r * 0.19); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x - r * 0.15, y - r * 0.44, r * 0.07, r * 0.7);
    g.fillStyle = '#e9eef5'; g.fillRect(x - r * 0.08, y - r * 0.34, r * 0.16, r * 0.6);
    g.fillStyle = k < 0.25 ? '#ff6b5e' : '#3fa7ff'; g.fillRect(x - r * 0.06, y + r * 0.24 - r * 0.56 * k, r * 0.12, r * 0.56 * k);
    g.fillStyle = '#9aa0ad'; g.beginPath(); g.roundRect(x - r * 0.1, y - r * 0.66, r * 0.2, r * 0.14, r * 0.04); g.fill();
  }
  /* ---------- drawn once ---------- */
  function picket(g, x0, y0, x1, y1) {
    const L = hyp(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / 22));
    g.strokeStyle = '#d9c3a0'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0 - 10); g.lineTo(x1, y1 - 10); g.moveTo(x0, y0 - 2); g.lineTo(x1, y1 - 2); g.stroke();
    for (let k = 0; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
      g.fillStyle = '#fff8ea'; g.beginPath(); g.moveTo(x - 4, y + 4); g.lineTo(x - 4, y - 16); g.lineTo(x, y - 21); g.lineTo(x + 4, y - 16); g.lineTo(x + 4, y + 4); g.fill();
    }
  }
  function tree(g, x, y, s) {
    g.fillStyle = 'rgba(30,70,20,.25)'; g.beginPath(); g.ellipse(x + 10 * s, y + 6 * s, 46 * s, 13 * s, 0, 0, TAU); g.fill();
    g.fillStyle = '#8a5a2b'; g.beginPath(); g.roundRect(x - 8 * s, y - 44 * s, 16 * s, 50 * s, 6 * s); g.fill();
    for (const [dx, dy, r, c] of [[0, -72, 42, '#2f8a3a'], [-28, -54, 30, '#2f8a3a'], [28, -54, 30, '#38983f'], [-10, -88, 28, '#45ab4a'], [14, -80, 24, '#52ba52']]) {
      g.fillStyle = c; g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill();
    }
  }
  function makeBg() {
    const c = document.createElement('canvas'); c.width = W + 800; c.height = H; const g = c.getContext('2d'); g.translate(400, 0);
    g.fillStyle = '#7cc565'; g.fillRect(-400, 0, W + 800, H);
    g.fillStyle = '#93d77b'; g.beginPath(); g.roundRect(X0 - 12, Y0 - 12, X1 - X0 + 24, Y1 - Y0 + 24, 36); g.fill();
    for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(40,110,30,.06)'; g.beginPath(); g.ellipse(rnd(X0, X1), rnd(Y0, Y1), rnd(60, 160), rnd(30, 70), rnd(0, 3), 0, TAU); g.fill(); }
    g.lineCap = 'round'; g.lineWidth = 2.5;
    for (let i = 0; i < 600; i++) {
      const x = rnd(-380, W + 380), y = rnd(Y0 - 30, H), s = rnd(0.7, 1.2);
      g.strokeStyle = i % 3 ? 'rgba(60,140,45,.3)' : 'rgba(210,255,180,.4)';
      g.beginPath(); g.moveTo(x - 4 * s, y - 7 * s); g.lineTo(x, y); g.lineTo(x + 5 * s, y - 6 * s); g.stroke();
    }
    // roads: one across, one down from the fire station, a round plaza around the pond
    const RY0 = POND.y - 50, RY1 = POND.y + 50;
    g.fillStyle = '#c9c3b8'; g.fillRect(X0 - 12, RY0 - 8, X1 - X0 + 24, RY1 - RY0 + 16); g.fillRect(742, STATION.y, 116, Y1 + 12 - STATION.y);
    g.fillStyle = '#8f8a95'; g.fillRect(X0 - 12, RY0, X1 - X0 + 24, RY1 - RY0); g.fillRect(750, STATION.y, 100, Y1 + 12 - STATION.y);
    g.fillStyle = '#c9c3b8'; g.beginPath(); g.ellipse(POND.x, POND.y, POND.rx + 70, POND.ry + 58, 0, 0, TAU); g.fill();
    g.fillStyle = '#e6dccb'; g.beginPath(); g.ellipse(POND.x, POND.y, POND.rx + 62, POND.ry + 50, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(160,150,130,.45)'; g.lineWidth = 2;
    for (let k = 0; k < 36; k++) { const a = k * TAU / 36; g.beginPath(); g.moveTo(POND.x + Math.cos(a) * (POND.rx + 22), POND.y + Math.sin(a) * (POND.ry + 18)); g.lineTo(POND.x + Math.cos(a) * (POND.rx + 60), POND.y + Math.sin(a) * (POND.ry + 48)); g.stroke(); }
    g.strokeStyle = '#fff6c8'; g.lineWidth = 5; g.setLineDash([26, 22]);
    g.beginPath(); g.moveTo(X0, POND.y); g.lineTo(POND.x - POND.rx - 70, POND.y); g.moveTo(POND.x + POND.rx + 70, POND.y); g.lineTo(X1, POND.y);
    g.moveTo(800, STATION.y + 20); g.lineTo(800, POND.y - POND.ry - 58); g.moveTo(800, POND.y + POND.ry + 58); g.lineTo(800, Y1 + 10); g.stroke(); g.setLineDash([]);
    // pond (water ripples are drawn live)
    g.fillStyle = '#7a6f62'; g.beginPath(); g.ellipse(POND.x, POND.y + 4, POND.rx + 18, POND.ry + 16, 0, 0, TAU); g.fill();
    for (let k = 0; k < 22; k++) { const a = k * TAU / 22; g.fillStyle = k % 2 ? '#b4aca0' : '#a39a8d'; g.beginPath(); g.ellipse(POND.x + Math.cos(a) * (POND.rx + 12), POND.y + Math.sin(a) * (POND.ry + 10), 14, 10, a, 0, TAU); g.fill(); }
    g.fillStyle = '#4fb7ea'; g.beginPath(); g.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU); g.fill();
    g.fillStyle = '#7fd0f5'; g.beginPath(); g.ellipse(POND.x - 20, POND.y - 14, POND.rx * 0.7, POND.ry * 0.5, 0, 0, TAU); g.fill();
    for (const [dx, dy] of [[-70, 22], [64, -18]]) { g.fillStyle = '#3fae4a'; g.beginPath(); g.ellipse(POND.x + dx, POND.y + dy, 16, 10, 0.3, 0.4, TAU - 0.2); g.fill(); }
    g.fillStyle = '#ff9fc4'; g.beginPath(); g.arc(POND.x - 66, POND.y + 18, 5, 0, TAU); g.fill();
    // zebra crossings, drain covers, benches round the plaza, red hydrants by the road
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (const cx of [POND.x - 330, POND.x + 330]) for (let k = 0; k < 6; k++) g.fillRect(cx - 30 + k * 11, RY0 + 8, 6, RY1 - RY0 - 16);
    for (let k = 0; k < 4; k++) g.fillRect(758 + k * 22, POND.y + POND.ry + 66, 12, 26);
    for (const [mx, my] of [[260, POND.y - 22], [1340, POND.y + 20], [800, 760], [1120, POND.y - 18]]) {
      g.fillStyle = '#6f6a75'; g.beginPath(); g.arc(mx, my, 15, 0, TAU); g.fill();
      g.strokeStyle = '#8f8a95'; g.lineWidth = 2; for (let k = -10; k <= 10; k += 5) { g.beginPath(); g.moveTo(mx - Math.sqrt(150 - k * k * 0.9), my + k); g.lineTo(mx + Math.sqrt(150 - k * k * 0.9), my + k); g.stroke(); }
    }
    for (const [bx, by] of [[POND.x - 150, POND.y - 104], [POND.x + 150, POND.y - 104]]) {
      g.fillStyle = 'rgba(40,40,30,.2)'; g.fillRect(bx - 32, by + 10, 68, 8);
      g.fillStyle = '#8a5a2b'; g.fillRect(bx - 34, by - 6, 68, 6); g.fillRect(bx - 34, by + 3, 68, 6);
      g.fillStyle = '#3a3346'; g.fillRect(bx - 30, by + 8, 5, 10); g.fillRect(bx + 25, by + 8, 5, 10);
    }
    for (const [hx, hy] of [[400, RY0 - 18], [1200, RY0 - 18], [700, RY1 + 30], [900, 380]]) {
      g.fillStyle = 'rgba(40,40,30,.25)'; g.beginPath(); g.ellipse(hx + 3, hy + 12, 13, 5, 0, 0, TAU); g.fill();
      g.fillStyle = '#c92c1f'; g.beginPath(); g.roundRect(hx - 8, hy - 18, 16, 30, [8, 8, 2, 2]); g.fill();
      g.fillStyle = '#e8483a'; g.fillRect(hx - 12, hy - 6, 24, 6); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(hx, hy - 18, 4, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(hx - 5, hy - 14, 3, 20);
    }
    // little gardens in front of every house
    for (const [x, y] of HOUSES) {
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x, y + 52, 120, 30, 0, 0, TAU); g.fill();
      g.fillStyle = '#d8c6a4'; g.fillRect(x - 12, y + 40, 24, 36);
      picket(g, x - 118, y + 56, x - 30, y + 56); picket(g, x + 30, y + 56, x + 118, y + 56);
      for (let k = 0; k < 6; k++) { const fx = x + (k < 3 ? -100 + k * 26 : 48 + (k - 3) * 26), fy = y + 64; g.fillStyle = ['#ff6f8f', '#ffe066', '#fff'][k % 3]; for (let p = 0; p < 5; p++) { const a = p * TAU / 5; g.beginPath(); g.arc(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 3, 0, TAU); g.fill(); } }
      // a mailbox by the gate and stepping stones up the path
      g.fillStyle = '#7a4a22'; g.fillRect(x + 22, y + 52, 4, 22);
      g.fillStyle = '#2f8cff'; g.beginPath(); g.roundRect(x + 14, y + 40, 20, 14, [7, 7, 2, 2]); g.fill(); g.fillStyle = '#ff4f58'; g.fillRect(x + 31, y + 36, 3, 9);
      g.fillStyle = 'rgba(255,255,255,.55)'; for (const sy of [48, 60, 72]) { g.beginPath(); g.ellipse(x + (sy % 24 ? 3 : -3), y + sy, 8, 4, 0, 0, TAU); g.fill(); }
    }
    // village fence round the edge and trees outside it
    picket(g, X0 - 4, Y1 + 18, X1 + 4, Y1 + 18);
    for (const [x, y, s] of [[110, 152, 0.9], [-30, 300, 1], [1500, 150, 0.85], [1630, 330, 1], [-30, 640, 1.05], [1630, 650, 1], [-10, 905, 1.1], [1610, 905, 1.1], [300, 925, 0.85], [1290, 925, 0.85]]) tree(g, x, y, s);
    return c;
  }
  function makeHouse(roof) {
    const c = document.createElement('canvas'); c.width = 200; c.height = 170; const g = c.getContext('2d'); g.translate(100, 120);
    g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(8, 44, 86, 16, 0, 0, TAU); g.fill();
    // chimney
    g.fillStyle = '#b5654a'; g.fillRect(34, -86, 18, 34); g.fillStyle = '#8f4c36'; g.fillRect(31, -90, 24, 8);
    // walls
    g.fillStyle = '#fff3dc'; g.strokeStyle = '#c9a66a'; g.lineWidth = 3; g.beginPath(); g.roundRect(-64, -30, 128, 72, 6); g.fill(); g.stroke();
    g.fillStyle = 'rgba(200,160,100,.18)'; g.fillRect(-62, 22, 124, 18);
    g.strokeStyle = 'rgba(200,160,100,.35)'; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-62, -12 + k * 14); g.lineTo(62, -12 + k * 14); g.stroke(); }
    // roof with shingles
    g.fillStyle = roof; g.beginPath(); g.moveTo(-82, -24); g.lineTo(0, -92); g.lineTo(82, -24); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 3;
    for (let k = 1; k < 4; k++) { const yy = -92 + k * 17, hw = 82 * k * 17 / 68; g.beginPath(); g.moveTo(-hw, yy); g.lineTo(hw, yy); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(-74, -26); g.lineTo(0, -88); g.lineTo(-6, -76); g.lineTo(-60, -30); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-80, -26, 160, 6);
    // round attic window
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -50, 11, 0, TAU); g.fill(); g.fillStyle = '#9fd8ff'; g.beginPath(); g.arc(0, -50, 8, 0, TAU); g.fill();
    // door
    g.fillStyle = '#8a5a2b'; g.beginPath(); g.roundRect(-14, 2, 28, 40, [10, 10, 0, 0]); g.fill();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(8, 24, 3, 0, TAU); g.fill();
    // windows with frames and flower boxes
    for (const s of [-1, 1]) {
      const wx = s * 40;
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(wx - 15, -16, 30, 26, 4); g.fill();
      g.fillStyle = '#9fd8ff'; g.beginPath(); g.roundRect(wx - 12, -13, 24, 20, 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(wx - 9, -11, 6, 8);
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(wx, -13); g.lineTo(wx, 7); g.moveTo(wx - 12, -3); g.lineTo(wx + 12, -3); g.stroke();
      g.fillStyle = '#8a5a2b'; g.fillRect(wx - 16, 10, 32, 7);
      for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#ff6f8f' : '#ffe066'; g.beginPath(); g.arc(wx - 11 + k * 7.3, 9, 3.4, 0, TAU); g.fill(); }
    }
    return c;
  }
  function makeRuins() {
    const c = document.createElement('canvas'); c.width = 200; c.height = 170; const g = c.getContext('2d'); g.translate(100, 120);
    g.fillStyle = 'rgba(20,20,20,.3)'; g.beginPath(); g.ellipse(4, 40, 96, 22, 0, 0, TAU); g.fill();
    g.fillStyle = '#3b3438'; g.beginPath(); g.ellipse(0, 34, 86, 16, 0, 0, TAU); g.fill();
    // broken walls
    g.fillStyle = '#5b5560'; g.beginPath(); g.moveTo(-64, 40); g.lineTo(-64, -18); g.lineTo(-48, -30); g.lineTo(-36, -8); g.lineTo(-20, -20); g.lineTo(-8, 4); g.lineTo(-8, 40); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(18, 40); g.lineTo(18, -2); g.lineTo(34, -26); g.lineTo(46, -6); g.lineTo(64, -24); g.lineTo(64, 40); g.closePath(); g.fill();
    g.fillStyle = '#2b2528'; g.beginPath(); g.roundRect(-52, -6, 18, 16, 3); g.fill(); g.beginPath(); g.roundRect(32, 0, 20, 16, 3); g.fill();
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(-30, 6, 30, 22, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(40, 10, 26, 20, 0, 0, TAU); g.fill();
    // charred beams
    g.strokeStyle = '#2a2226'; g.lineCap = 'round';
    for (const [x0, y0, x1, y1, w] of [[-70, 30, 10, -56], [60, 34, -6, -44], [-40, 36, 60, 18], [-6, 38, -30, -10]]) { g.lineWidth = 10; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = '#4a3d40'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 + 2, y0 - 2); g.lineTo(x1 + 2, y1 - 2); g.stroke(); g.strokeStyle = '#2a2226'; void w; }
    // rubble
    for (let k = 0; k < 18; k++) { g.fillStyle = k % 3 ? '#4a4248' : '#6d6570'; g.beginPath(); g.ellipse(rnd(-74, 74), rnd(26, 46), rnd(5, 11), rnd(4, 7), rnd(0, 3), 0, TAU); g.fill(); }
    return c;
  }
  function makeStation() {
    const c = document.createElement('canvas'); c.width = 280; c.height = 200; const g = c.getContext('2d'); g.translate(140, 160);
    const w = STATION.w;
    g.fillStyle = 'rgba(30,60,20,.25)'; g.beginPath(); g.ellipse(8, 6, w + 16, 18, 0, 0, TAU); g.fill();
    // tower
    g.fillStyle = '#c93a2a'; g.fillRect(w - 50, -150, 44, 60); g.fillStyle = '#a92d20'; g.fillRect(w - 56, -156, 56, 10);
    g.fillStyle = '#5a1a14'; g.beginPath(); g.roundRect(w - 44, -144, 32, 40, [14, 14, 2, 2]); g.fill();   // the bell hangs here (drawn live)
    g.fillStyle = '#fff'; for (let k = 0; k < 3; k++) g.fillRect(w - 48, -98 + k * 0, 40, 4);
    // building
    g.fillStyle = '#e8483a'; g.beginPath(); g.roundRect(-w, -100, w * 2, 102, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-w, -100, w * 2, 12);
    g.fillStyle = '#a92d20'; g.beginPath(); g.roundRect(-w - 8, -112, w * 2 + 16, 18, 6); g.fill();
    // sign
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-58, -92, 116, 30, 8); g.fill();
    g.fillStyle = '#c93a2a'; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('消防隊', 0, -76);
    // two garage doors, one open with a fire truck peeking out
    for (const s of [-1, 1]) {
      const dx = s * 52;
      g.fillStyle = '#3a2f3a'; g.beginPath(); g.roundRect(dx - 42, -54, 84, 56, [10, 10, 0, 0]); g.fill();
      if (s < 0) {
        g.fillStyle = '#ff4f2e'; g.beginPath(); g.roundRect(dx - 34, -40, 68, 42, 6); g.fill();
        g.fillStyle = '#9fd8ff'; g.beginPath(); g.roundRect(dx - 26, -34, 52, 16, 4); g.fill();
        g.fillStyle = '#fff'; g.fillRect(dx - 34, -14, 68, 5);
        g.fillStyle = '#ffd23f'; for (const lx of [-26, 26]) { g.beginPath(); g.arc(dx + lx, -4, 5, 0, TAU); g.fill(); }
        g.fillStyle = '#2f8cff'; g.beginPath(); g.roundRect(dx - 12, -46, 24, 7, 3); g.fill();
      } else {
        g.fillStyle = '#d9d4e0'; for (let k = 0; k < 5; k++) g.fillRect(dx - 38, -50 + k * 11, 76, 8);
      }
    }
    return c;
  }

  class Fire {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.ok = false;
      const n = ctx.players.length, kid = this.kid;
      this.dur = 90; this.lives = kid ? 4 : 2; this.lost = 0;
      this.reach = kid ? 215 : 180; this.power = kid ? 1.2 : 0.8;
      this.houses = HOUSES.map(([x, y], i) => ({ kind: 1, i, x, y, sy: y + 40, roof: ROOFS[i], fire: 0, burnt: false, wet: 0, saveT: 0, warned: false, smokeT: 0, emberT: 0,
        chimT: rnd(0, 1.5), vil: { peek: 0, show: 0, wait: rnd(2, 10), cheer: 0, side: i % 2 ? 1 : -1, skin: VIL[i][0], hair: VIL[i][1] } }));
      this.es = ctx.players.map((p, i) => {
        const x = 800 + (i - (n - 1) / 2) * 76, y = STATION.y + 90 + (i % 2) * 20, tr = new Float32Array(2 * 14);
        for (let k = 0; k < 14; k++) { tr[k * 2] = x; tr[k * 2 + 1] = y - k * 4; }
        return { kind: 0, p, x, y, vx: 0, vy: 0, face: Math.PI / 2, r: 30, water: 100, spray: false, sprayK: 0, lock: false,
          saved: 0, walk: 0, target: null, tx: 0, ty: 0, squash: 0, sqv: 0, moving: false, filling: false, low: false, near: null, wave: rnd(0, TAU),
          mv: 0, cheer: 0, worry: 0, trail: tr, pudT: 0, splT: 0 };
      });
      // puddles where the water lands, two roof cats, the wind, fish in the pond
      this.pud = []; for (let i = 0; i < NPUD; i++) this.pud.push({ on: false, x: 0, y: 0, r: 0, life: 0 });
      this.cats = [{ h: 1, st: 'sit', t: 0, x: 0, y: 0, x0: 0, y0: 0, x1: 0, y1: 0, dur: 1, col: '#ff9f43', d: '#d9762a', ph: 0, stay: 0 },
        { h: 6, st: 'sit', t: 0, x: 0, y: 0, x0: 0, y0: 0, x1: 0, y1: 0, dur: 1, col: '#9a9cab', d: '#6d6f7d', ph: 2, stay: 0 }];
      for (const c of this.cats) { const [sx, sy] = this.seat(c.h); c.x = sx; c.y = sy; }
      this.wind = 0.4; this.windPh = rnd(0, TAU);
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.spawnT = kid ? 3 : 2.5;
      this.rate = kid ? 1 / 27 : 1 / 16;
      this.every = (kid ? 7.5 : 4.5) / (1 + 0.25 * (n - 1));
      this.cap = 1 + n;   // never more fires at once than the team can handle
      this.station = { kind: 2, sy: STATION.y };
      this.draws = this.houses.concat(this.es); this.draws.push(this.station, { kind: 3, sy: 468 });
      this.P = []; this.pi = 0;
      for (let i = 0; i < NP; i++) this.P.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, r: 1, gy: 0 });
      this.pts = new Float32Array(2 * 15);
      if (!BG) { BG = makeBg(); RUINS = makeRuins(); STATION_C = makeStation(); ROOFS.forEach((r, i) => { HOUSE_C[i] = makeHouse(r); }); }
    }
    /* particles: 0 smoke, 1 steam, 2 ember, 3 water drop, 4 sparkle */
    part(k, x, y, vx, vy, life, r, gy) {
      const p = this.P[this.pi]; this.pi = (this.pi + 1) % NP;
      p.on = true; p.k = k; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.t = 0; p.life = life; p.r = r; p.gy = gy || 0;
    }
    alive() { return this.houses.filter(h => !h.burnt); }
    ignite(h) {
      if (h.burnt || h.fire > 0) return;
      h.fire = 0.05; h.warned = false; this.ctx.sfx('whoosh');
      Fx.ring(h.x, h.y - 30, '#ff7a2e', 140, 0.5); Fx.pop(h.x, h.y - 130, '著火了！', '#ff4f2e', 34);
    }
    solid(e) {
      for (const h of this.houses) {
        const cx = clamp(e.x, h.x - 70, h.x + 70), cy = clamp(e.y, h.y - 50, h.y + 40), dx = e.x - cx, dy = e.y - cy, d = hyp(dx, dy);
        if (d < e.r && d > 0) { e.x = cx + dx / d * e.r; e.y = cy + dy / d * e.r; }
      }
      { const cx = clamp(e.x, STATION.x - STATION.w, STATION.x + STATION.w), cy = clamp(e.y, Y0, STATION.y), dx = e.x - cx, dy = e.y - cy, d = hyp(dx, dy);
        if (d < e.r && d > 0) { e.x = cx + dx / d * e.r; e.y = cy + dy / d * e.r; } else if (d === 0) e.y = STATION.y + e.r; }
      const px = (e.x - POND.x) / (POND.rx + e.r * 0.5), py = (e.y - POND.y) / (POND.ry + e.r * 0.5), pd = hyp(px, py);
      if (pd < 1 && pd > 0) { e.x = POND.x + px / pd * (POND.rx + e.r * 0.5); e.y = POND.y + py / pd * (POND.ry + e.r * 0.5); }
      e.x = clamp(e.x, X0 + e.r, X1 - e.r); e.y = clamp(e.y, Y0 + e.r, Y1 - e.r);
    }
    update(dt) {
      const ctx = this.ctx, kid = this.kid; this.t += dt;
      // new fires
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = this.every * rnd(0.7, 1.3) * Math.max(0.6, 1 - this.t / 200);
        const calm = this.alive().filter(h => h.fire <= 0 && h.wet <= 0), burning = this.houses.filter(h => h.fire > 0).length;
        if (calm.length && burning < this.cap) this.ignite(calm[rint(calm.length)]);
      }
      // players
      for (const e of this.es) {
        e.cheer -= dt;
        steer(e, ctx.input(e.p), kid ? 340 : 360, dt);
        e.x += e.vx * dt; e.y += e.vy * dt; this.solid(e);
        this.trailTick(e);
        // splash through puddles
        e.splT -= dt;
        if (e.splT <= 0 && hyp(e.vx, e.vy) > 130) for (const q of this.pud) if (q.on && hyp((e.x - q.x) / q.r, (e.y + 22 - q.y) / (q.r * 0.45)) < 1) { e.splT = 0.12; for (let k = 0; k < 3; k++) Fx.dust(e.x + rnd(-14, 14), e.y + 24, 'rgba(150,215,255,.9)', 7); break; }
        Fx.walk(e, dt, 'rgba(255,255,255,.7)');
        ctx.pressed(e.p, 0);
        // refill at the pond (大人)
        const nearPond = hyp((e.x - POND.x) / (POND.rx + 75), (e.y - POND.y) / (POND.ry + 75)) < 1;
        e.filling = !kid && nearPond && e.water < 100;
        if (e.filling) {
          e.water = Math.min(100, e.water + 70 * dt);
          if (Math.random() < dt * 14) { const a = Math.atan2(e.y - POND.y, e.x - POND.x); this.part(3, POND.x + Math.cos(a) * POND.rx * 0.8, POND.y + Math.sin(a) * POND.ry * 0.8, (e.x - POND.x) * 0.9 + rnd(-30, 30), -260, 0.7, 4, e.y - 20); }
          if (e.water >= 100 && e.low) { e.low = false; ctx.sfx('coin'); ctx.buzz(e.p, 60); Fx.pop(e.x, e.y - 80, '裝滿了！', '#2f8cff', 32); Fx.ring(e.x, e.y, '#7fd0ff', 70, 0.4); }
        }
        if (e.water < 75) e.low = true;
        // nearest burning house in reach
        let best = null, bd = this.reach, near = null, nd = Infinity;
        for (const h of this.houses) if (h.fire > 0) {
          const d = hyp(h.x - e.x, h.y - 20 - e.y);
          if (d < bd) { bd = d; best = h; }
          if (d < nd) { nd = d; near = h; }
        }
        e.near = best ? null : near; e.target = best;
        e.spray = ctx.held(e.p, 0) && (kid || e.water > 0); e.lock = e.spray && !!best;
        e.worry = (best && best.fire > 0.7) || (!kid && e.water <= 0 && !e.filling) ? 1 : Math.max(0, e.worry - dt * 2);
        e.sprayK = e.spray ? Math.min(1, e.sprayK + dt * 5) : Math.max(0, e.sprayK - dt * 7);
        if (e.spray) {
          if (!kid) { const was = e.water; e.water = Math.max(0, e.water - 22 * dt); if (was > 0 && e.water <= 0) { Fx.pop(e.x, e.y - 80, '沒水了！', '#ff4f58', 30); ctx.buzz(e.p, 120); } }
          if (best) { e.tx = best.x + clamp(e.x - best.x, -40, 40); e.ty = best.y - 52; e.face = angTo(e.face, Math.atan2(e.ty - e.y, e.tx - e.x), 1 - Math.exp(-16 * dt)); }
          else { e.tx = e.x + Math.cos(e.face) * 150; e.ty = e.y + Math.sin(e.face) * 110 + 10; }
          e.pudT -= dt;
          if (e.sprayK >= 1 && e.pudT <= 0) { e.pudT = 0.2; if (best) this.puddle(best.x + clamp(e.x - best.x, -70, 70) + rnd(-24, 24), best.y + 64 + rnd(-4, 10), 2.2); else this.puddle(e.tx + rnd(-10, 10), e.ty + 10, 2.6); }
          if (best) {
            best.fire -= this.power * dt; best.wet = 2.5;
            if (Math.random() < dt * 30) this.part(1, e.tx + rnd(-26, 26), e.ty + rnd(-10, 14), rnd(-30, 30), rnd(-110, -60), rnd(0.6, 1), rnd(10, 16));
            if (best.fire <= 0) this.saved(best, e);
          } else if (e.sprayK > 0.6 && Math.random() < dt * 24) this.part(3, e.tx + rnd(-10, 10), e.ty - 6, rnd(-90, 90), rnd(-200, -90), 0.6, 3.5, e.ty + 6);
        }
      }
      // fires grow, smoke and embers rise
      for (const h of this.houses) {
        h.wet -= dt; h.saveT -= dt;
        if (h.burnt) { h.smokeT -= dt; if (h.smokeT <= 0) { h.smokeT = rnd(0.5, 0.9); this.part(0, h.x + rnd(-40, 40), h.y - 10, rnd(-8, 8), -40, 2.4, 10); } continue; }
        if (h.saveT > 0 && Math.random() < dt * 10) this.part(4, h.x + rnd(-80, 80), h.y + rnd(-100, 20), 0, -20, 0.7, rnd(8, 14));
        if (h.fire <= 0) continue;
        if (h.wet <= 0) h.fire += this.rate * dt * (1 + this.t / 120);
        h.smokeT -= dt; if (h.smokeT <= 0) { h.smokeT = 0.32 / (0.4 + h.fire); this.part(0, h.x + rnd(-50, 50), h.y - 70 - h.fire * 30, rnd(-10, 14), rnd(-70, -45), rnd(1.6, 2.4), 12 + h.fire * 10); }
        h.emberT -= dt; if (h.emberT <= 0) { h.emberT = 0.25 / (0.3 + h.fire); this.part(2, h.x + rnd(-60, 60), h.y - 40 - rnd(0, 50), rnd(-40, 40), rnd(-160, -90), rnd(0.7, 1.2), rnd(2.5, 4)); }
        if (h.fire > 0.7 && !h.warned) { h.warned = true; ctx.sfx('tick'); Fx.pop(h.x, h.y - 120, '快燒掉了！', '#ff3b30', 34); }
        if (h.fire < 0.6) h.warned = false;
        if (!kid && h.fire > 0.75 && Math.random() < dt * 0.2) {
          const nb = this.alive().filter(o => o !== h && o.fire <= 0 && hyp(o.x - h.x, o.y - h.y) < 520);
          if (nb.length) { const o = nb[rint(nb.length)]; this.ignite(o); Fx.pop(o.x, o.y - 160, '火燒過來了！', '#ff4f2e', 32); }
        }
        if (h.fire >= 1) {
          h.burnt = true; h.fire = 0; this.lost++; ctx.sfx('boom'); Fx.shake(9); Fx.flash('#ff7a3a', 0.25);
          Fx.burst(h.x, h.y - 30, '#555', 22, 320); Fx.burst(h.x, h.y - 30, '#ff8a1f', 12, 260); Fx.pop(h.x, h.y - 120, '房子燒掉了…', '#c0392b', 36);
          for (let k = 0; k < 10; k++) this.part(0, h.x + rnd(-70, 70), h.y - rnd(0, 60), rnd(-40, 40), rnd(-120, -60), rnd(1.4, 2.4), rnd(16, 26));
          this.es.forEach(e => ctx.buzz(e.p, 200));
          const left = this.lives - this.lost;
          if (left === 1 && this.alive().length > 1) Fx.announce('只能再燒 1 間了！', '#ff3b30');
          if (this.lost >= this.lives || !this.alive().length) { this.over = true; this.ok = false; }
        }
      }
      this.ambient(dt);
      // particles
      for (const p of this.P) {
        if (!p.on) continue; p.t += dt; if (p.t >= p.life) { p.on = false; continue; }
        if (p.k === 3) { p.vy += 900 * dt; if (p.vy > 0 && p.y > p.gy) { p.on = false; continue; } }
        else if (p.k === 2) { p.vx += Math.sin(p.t * 9 + p.r * 3) * 120 * dt; p.vy -= 20 * dt; }
        else if (p.k <= 1 || p.k === 5) { p.vx += this.wind * 34 * dt; p.vy *= 1 - 0.4 * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      if (this.t >= this.dur && !this.over) { this.over = true; this.ok = true; }
    }
    /* where a cat sits: on a house roof, or (i < 0) on the fire station */
    seat(i) { if (i < 0) return [STATION.x + 30, STATION.y - 112]; const h = HOUSES[i]; return i % 2 ? [h[0] + 14, h[1] - 76] : [h[0] - 40, h[1] - 58]; }
    /* a puddle where the water lands: grows if there's one already */
    puddle(x, y, grow) {
      let best = null, bd = 40, free = null, old = null;
      for (const q of this.pud) { if (!q.on) { free = free || q; continue; } const d = hyp(q.x - x, q.y - y); if (d < bd) { bd = d; best = q; } if (!old || q.life < old.life) old = q; }
      if (best) { best.r = Math.min(48, best.r + grow); best.life = 10; best.x += (x - best.x) * 0.05; return; }
      const q = free || old; q.on = true; q.x = x; q.y = y; q.r = 12; q.life = 10;
    }
    /* the hose lies on the ground behind you */
    trailTick(e) {
      const T = e.trail, bx = e.x - Math.cos(e.face) * e.r * 0.5, by = e.y + e.r * 0.62;
      if (hyp(T[0] - bx, T[1] - by) > 13) { T.copyWithin(2, 0, T.length - 2); T[0] = bx; T[1] = by; }
    }
    /* chimney smoke, villagers at the windows, roof cats, wind, puddles drying */
    ambient(dt) {
      const t = this.t;
      this.wind = Math.sin(t * 0.11 + this.windPh) * 0.8 + Math.sin(t * 0.37) * 0.25;
      for (const h of this.houses) {
        const v = h.vil; v.cheer -= dt; v.show -= dt; v.wait -= dt;
        if (h.burnt) { v.peek = 0; continue; }
        if (v.wait <= 0) { v.wait = rnd(6, 14); v.show = rnd(1.8, 3); }
        const want = h.fire > 0 || v.cheer > 0 || v.show > 0 ? 1 : 0;
        v.peek += (want - v.peek) * (1 - Math.exp(-6 * dt));
        if (h.fire <= 0) { h.chimT -= dt; if (h.chimT <= 0) { h.chimT = rnd(0.7, 1.1); this.part(5, h.x + 43 + rnd(-3, 3), h.y - 94, rnd(-4, 4), rnd(-34, -24), rnd(1.8, 2.4), rnd(6, 8)); } }
      }
      for (const c of this.cats) {
        c.ph += dt;
        if (c.st === 'jump') {
          c.t += dt; const u = Math.min(1, c.t / c.dur);
          c.x = c.x0 + (c.x1 - c.x0) * u; c.y = c.y0 + (c.y1 - c.y0) * u - Math.sin(u * Math.PI) * (90 + Math.abs(c.x1 - c.x0) * 0.08);
          if (u >= 1) { c.st = 'sit'; c.stay = 0; }
          continue;
        }
        c.stay += dt;
        const home = c.h >= 0 ? this.houses[c.h] : null, other = this.cats.find(o => o !== c);
        const calm = this.houses.filter(o => !o.burnt && o.fire <= 0 && o.i !== other.h && o.i !== c.h);
        let to = null;
        if (home && (home.fire > 0 || home.burnt)) to = calm.length ? calm.reduce((a, b) => hyp(a.x - home.x, a.y - home.y) < hyp(b.x - home.x, b.y - home.y) ? a : b).i : -1;
        else if (!home && calm.length && c.stay > 6 && Math.random() < dt * 0.15) to = calm[rint(calm.length)].i;
        if (to !== null && to !== c.h) {
          const [x1, y1] = this.seat(to); c.x0 = c.x; c.y0 = c.y; c.x1 = x1; c.y1 = y1; c.h = to; c.st = 'jump'; c.t = 0; c.dur = 0.8 + hyp(x1 - c.x, y1 - c.y) / 900;
          if (home && home.fire > 0) Fx.pop(c.x, c.y - 30, '喵！', c.d, 24);
        }
      }
      for (const q of this.pud) if (q.on) { q.life -= dt; if (q.life <= 0) q.on = false; }
    }
    saved(h, e) {
      const ctx = this.ctx; h.fire = 0; h.saveT = 1.6; e.saved++; e.cheer = 1; e.sqv -= 2.4; h.vil.cheer = 2.6;
      ctx.sfx('star'); ctx.buzz(e.p, 80);
      Fx.pop(h.x, h.y - 120, '得救了！', '#2f8cff', 42); Fx.burst(h.x, h.y - 40, '#9fd8ff', 16, 260); Fx.ring(h.x, h.y - 30, '#9fd8ff', 150, 0.5);
      Fx.pop(e.x, e.y - 76, '+1', PARTY_COLORS[e.p.col].d, 34);
      for (let k = 0; k < 8; k++) this.part(1, h.x + rnd(-60, 60), h.y - rnd(30, 80), rnd(-30, 30), rnd(-140, -70), rnd(0.8, 1.2), rnd(14, 22));
    }
    flame(g, x, y, s, sway, col) {
      const w = s * 0.55, h = s * 1.9;
      g.fillStyle = col; g.beginPath(); g.moveTo(x - w, y);
      g.quadraticCurveTo(x - w * 1.05, y - h * 0.55, x + sway, y - h);
      g.quadraticCurveTo(x + w * 1.05, y - h * 0.55, x + w, y);
      g.quadraticCurveTo(x, y + w * 0.7, x - w, y); g.fill();
    }
    drawHouse(g, h, t) {
      const x = h.x, y = h.y;
      if (h.burnt) {
        g.drawImage(RUINS, x - 100, y - 120);
        g.fillStyle = '#ff7a2e';
        for (let k = 0; k < 4; k++) { g.globalAlpha = 0.4 + 0.4 * Math.sin(t * (3 + k) + k * 2); g.beginPath(); g.arc(x - 50 + k * 32, y + 30 + (k % 2) * 8, 3.5, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
        return;
      }
      const f = h.fire, danger = f > 0.7, sh = danger ? Math.sin(t * 46) * 3 * Math.min(1, (f - 0.6) / 0.3) : 0;
      if (f > 0) { g.globalAlpha = Math.min(0.55, 0.16 + 0.08 * Math.sin(t * 9 + x) + f * 0.25); g.fillStyle = '#ff9a2e'; g.beginPath(); g.ellipse(x, y + 36, 100 + f * 30, 30, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
      g.drawImage(HOUSE_C[h.i], x - 100 + sh, y - 120);
      const xx = x + sh;
      if (f > 0) {
        // glowing windows, soot creeping over the house, red alarm flash when close to burning down
        g.fillStyle = '#ffb02e'; g.globalAlpha = 0.55 + 0.35 * Math.sin(t * 15 + h.i);
        g.fillRect(xx - 52, y - 13, 24, 20); g.fillRect(xx + 28, y - 13, 24, 20); g.globalAlpha = 1;
      }
      if (h.vil.peek > 0.02) this.drawVillager(g, h, xx, y, t);
      for (const c of this.cats) if (c.st === 'sit' && c.h === h.i) this.drawCat(g, c, t);
      if (f > 0) {
        g.fillStyle = '#2b1a14'; g.globalAlpha = f * 0.38;
        g.beginPath(); g.moveTo(xx - 82, y - 24); g.lineTo(xx, y - 92); g.lineTo(xx + 82, y - 24); g.closePath(); g.fill();
        g.globalAlpha = f * 0.22; g.fillRect(xx - 64, y - 30, 128, 72); g.globalAlpha = 1;
        if (danger) {
          g.fillStyle = '#ff1a1a'; g.globalAlpha = 0.18 + 0.16 * Math.sin(t * 16);
          g.beginPath(); g.moveTo(xx - 82, y - 24); g.lineTo(xx, y - 92); g.lineTo(xx + 82, y - 24); g.lineTo(xx + 64, y + 42); g.lineTo(xx - 64, y + 42); g.closePath(); g.fill(); g.globalAlpha = 1;
        }
        const n = 2 + Math.round(f * 5);
        for (let k = 0; k < n; k++) {
          const [fx0, fy0] = FLAMES[k], s = (13 + f * 26) * (0.85 + 0.22 * Math.sin(t * 11 + k * 1.9)) * (k === 2 ? 1.2 : 1), sw = Math.sin(t * 7 + k * 2.3) * s * 0.22, fx = xx + fx0, fy = y + fy0;
          this.flame(g, fx, fy, s * 1.18, sw * 1.2, '#ff3d1f');
          this.flame(g, fx, fy, s * 0.9, sw, '#ff8a1f');
          this.flame(g, fx, fy + 2, s * 0.6, sw * 0.8, '#ffd23f');
          if (f > 0.35) this.flame(g, fx, fy + 3, s * 0.3, sw * 0.6, '#fff6c0');
        }
        // how close it is to burning down
        const bw = 112, by = y + 52;
        g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(x - bw / 2 - 3, by, bw + 6, 18, 9); g.fill();
        g.fillStyle = danger ? ((t * 6 | 0) % 2 ? '#ff1a1a' : '#ff6b5e') : f > 0.45 ? '#ff8a1f' : '#ffb02e';
        g.beginPath(); g.roundRect(x - bw / 2, by + 3, Math.max(6, bw * Math.min(1, f)), 12, 6); g.fill();
        g.font = '18px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🔥', x - bw / 2 - 16, by + 9);
        if (danger) {   // warning sign bobbing over the roof
          const wy = y - 84 + Math.sin(t * 8) * 6, s = 1 + 0.08 * Math.sin(t * 16);
          g.save(); g.translate(x + 96, wy); g.scale(s, s);
          g.fillStyle = '#ffd23f'; g.strokeStyle = '#c0392b'; g.lineWidth = 5; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(0, -28); g.lineTo(30, 24); g.lineTo(-30, 24); g.closePath(); g.fill(); g.stroke();
          g.fillStyle = '#c0392b'; g.font = `900 34px ${FONT}`; g.fillText('!', 0, 8);
          g.restore();
        }
      }
      if (h.wet > 0 && f <= 0) {   // freshly soaked: shiny with a few drips
        g.globalAlpha = Math.min(1, h.wet) * 0.3; g.fillStyle = '#bfe8ff';
        g.beginPath(); g.moveTo(x - 82, y - 24); g.lineTo(x, y - 92); g.lineTo(x + 82, y - 24); g.closePath(); g.fill();
        g.globalAlpha = Math.min(1, h.wet) * 0.8; g.fillStyle = '#5fc3ff';
        for (let k = 0; k < 4; k++) { const dy = ((t * 60 + k * 23) % 40); g.beginPath(); g.ellipse(x - 60 + k * 40, y - 24 + dy, 3, 5, 0, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
    }
    /* a villager peeking out of a window: worried and waving when it burns, cheering when saved */
    drawVillager(g, h, xx, y, t) {
      const v = h.vil, wx = xx + v.side * 40, fire = h.fire > 0, cheer = v.cheer > 0, py = y + 13 - v.peek * 13;
      g.save(); g.beginPath(); g.rect(wx - 12, y - 13, 24, 20); g.clip();
      g.fillStyle = v.skin; g.beginPath(); g.arc(wx, py, 7.5, 0, TAU); g.fill();
      g.fillStyle = v.hair; g.beginPath(); g.arc(wx, py - 2, 7.8, Math.PI * 1.05, Math.PI * 1.95); g.fill();
      g.fillStyle = '#2b2340'; g.beginPath(); g.arc(wx - 2.6, py + 0.5, 1.2, 0, TAU); g.arc(wx + 2.6, py + 0.5, 1.2, 0, TAU); g.fill();
      g.strokeStyle = '#2b2340'; g.lineWidth = 1.3; g.beginPath();
      if (fire) g.arc(wx, py + 4.5, 1.8, 0, TAU); else g.arc(wx, py + 2.5, 2.4, 0.2, Math.PI - 0.2);
      g.stroke();
      g.fillStyle = 'rgba(255,110,150,.5)'; g.beginPath(); g.arc(wx - 4.5, py + 3, 1.5, 0, TAU); g.arc(wx + 4.5, py + 3, 1.5, 0, TAU); g.fill();
      if (fire || cheer) {   // hands waving
        const wv = Math.sin(t * (fire ? 16 : 10) + h.i) * 3; g.fillStyle = v.skin;
        g.beginPath(); g.arc(wx - 9, py - 3 + wv, 2.6, 0, TAU); g.arc(wx + 9, py - 3 - wv, 2.6, 0, TAU); g.fill();
      }
      g.restore();
    }
    drawCat(g, c, t) {
      const x = c.x, y = c.y, jump = c.st === 'jump', s = jump ? (c.x1 >= c.x0 ? 1 : -1) : (c.h % 2 ? -1 : 1);
      g.save(); g.translate(x, y); g.scale(s, 1);
      if (!jump) { g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(2, 1, 13, 4, 0, 0, TAU); g.fill(); }
      const sw = Math.sin(t * 2.4 + c.ph) * 0.5;
      g.strokeStyle = c.d; g.lineWidth = 4.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-8, -4); if (jump) g.quadraticCurveTo(-20, -6, -26, -16); else g.quadraticCurveTo(-18, -2 + sw * 4, -16 + sw * 6, -16); g.stroke();
      g.fillStyle = c.col; g.beginPath(); if (jump) g.ellipse(0, -8, 13, 7, -0.2, 0, TAU); else g.ellipse(0, -8, 10, 9, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(8, -18, 7.5, 0, TAU); g.fill();
      for (const ex of [4, 12]) { g.beginPath(); g.moveTo(ex - 3.5, -22); g.lineTo(ex, -30); g.lineTo(ex + 3.5, -22); g.fill(); }
      g.fillStyle = c.d; g.fillRect(-4, -14, 2.5, 6); g.fillRect(1, -15, 2.5, 6);
      g.fillStyle = '#fff6ea'; g.beginPath(); g.ellipse(9, -15, 4.5, 3, 0, 0, TAU); g.fill();
      if ((t + c.ph) % 4 < 0.15 && !jump) { g.strokeStyle = '#2b2340'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(5, -19); g.lineTo(8, -19); g.moveTo(11, -19); g.lineTo(14, -19); g.stroke(); }
      else { g.fillStyle = '#2b2340'; g.beginPath(); g.arc(6, -19, jump ? 2 : 1.5, 0, TAU); g.arc(12, -19, jump ? 2 : 1.5, 0, TAU); g.fill(); }
      g.fillStyle = '#ff7d9c'; g.beginPath(); g.arc(9.5, -16, 1.2, 0, TAU); g.fill();
      g.restore();
    }
    /* flag and windsock by the plaza: both show which way the wind blows */
    drawFlags(g, t) {
      const w = this.wind, d = w >= 0 ? 1 : -1, L = 30 + Math.abs(w) * 30, sag = 1 - Math.abs(w);
      { const px = 600, base = 468, top = base - 120;
        g.fillStyle = 'rgba(30,60,20,.22)'; g.beginPath(); g.ellipse(px + 4, base + 2, 14, 5, 0, 0, TAU); g.fill();
        g.fillStyle = '#8f8a95'; g.beginPath(); g.roundRect(px - 9, base - 8, 18, 10, 3); g.fill();
        g.strokeStyle = '#6f6a75'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, base - 4); g.lineTo(px, top); g.stroke();
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(px, top - 3, 5, 0, TAU); g.fill();
        g.fillStyle = '#ff4f2e'; g.beginPath(); g.moveTo(px, top + 2);
        for (let k = 1; k <= 6; k++) g.lineTo(px + d * L * k / 6, top + 2 + Math.sin(t * 9 - k * 0.9) * k * 0.9 + sag * k * 3);
        for (let k = 6; k >= 0; k--) g.lineTo(px + d * L * k / 6, top + 30 + Math.sin(t * 9 - k * 0.9) * k * 0.9 + sag * k * 4 - k * 0.8);
        g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(px + d * L * 0.42, top + 17 + Math.sin(t * 9 - 2.4) * 2 + sag * 8, 5, 0, TAU); g.fill(); }
      { const sx = 1000, base = 468, sy = base - 104;
        g.fillStyle = 'rgba(30,60,20,.22)'; g.beginPath(); g.ellipse(sx + 4, base + 2, 12, 4, 0, 0, TAU); g.fill();
        g.strokeStyle = '#6f6a75'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, base); g.lineTo(sx, sy); g.stroke();
        g.strokeStyle = '#3a3346'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, 6, 0, TAU); g.stroke();
        g.save(); g.translate(sx, sy); g.scale(d, 1); g.rotate(sag * 1.1 + Math.sin(t * 7) * 0.06);
        for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#fff' : '#ff6a2e'; g.beginPath(); g.moveTo(4 + k * 11, -9 + k * 1.5); g.lineTo(15 + k * 11, -7.5 + k * 1.5); g.lineTo(15 + k * 11, 7.5 - k * 1.5); g.lineTo(4 + k * 11, 9 - k * 1.5); g.closePath(); g.fill(); }
        g.restore(); }
    }
    drawStation(g, t) {
      g.drawImage(STATION_C, STATION.x - 140, STATION.y - 160);
      const alarm = this.houses.some(h => h.fire > 0);
      // the fire bell swings and rings while something is burning
      { const bx = STATION.x + 84, by = STATION.y - 96, a = alarm ? Math.sin(t * 18) * 0.55 : 0;
        g.fillStyle = '#5a1a14'; g.fillRect(bx - 16, by - 4, 22, 5); g.fillRect(bx - 16, by - 4, 5, 18);
        g.save(); g.translate(bx, by); g.rotate(a);
        g.fillStyle = '#b8860b'; g.fillRect(-2, 0, 4, 6);
        g.fillStyle = '#ffcf3a'; g.beginPath(); g.moveTo(-6, 6); g.quadraticCurveTo(-8, 18, -13, 24); g.lineTo(13, 24); g.quadraticCurveTo(8, 18, 6, 6); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-5, 10, 3, 10);
        g.fillStyle = '#8a6a10'; g.beginPath(); g.arc(-a * 10, 26, 3.5, 0, TAU); g.fill();
        g.restore();
        if (alarm) { g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.lineCap = 'round'; const k = (t * 4) % 1; g.globalAlpha = 1 - k;
          for (const s of [-1, 1]) { g.beginPath(); g.arc(bx, by + 14, 22 + k * 14, s < 0 ? Math.PI * 0.75 : -Math.PI * 0.25, s < 0 ? Math.PI * 1.25 : Math.PI * 0.25); g.stroke(); }
          g.globalAlpha = 1; }
      }
      // the fire truck's roof light flashes during an alarm
      if (alarm) { const on = (t * 6 | 0) % 2; g.fillStyle = on ? '#2f8cff' : '#ff2e2e'; g.globalAlpha = 0.9; g.beginPath(); g.roundRect(STATION.x - 64, STATION.y - 46, 24, 7, 3); g.fill(); g.globalAlpha = 0.25; g.beginPath(); g.arc(STATION.x - 52, STATION.y - 43, 18, 0, TAU); g.fill(); g.globalAlpha = 1; }
      for (const c of this.cats) if (c.st === 'sit' && c.h < 0) this.drawCat(g, c, t);
      // the light on top spins red when something is burning
      if (this.houses.some(h => h.fire > 0)) {
        const on = (t * 4 | 0) % 2; g.fillStyle = on ? '#ff2e2e' : '#ffd23f'; g.globalAlpha = 0.9;
        g.beginPath(); g.arc(STATION.x - 70, STATION.y - 118, 9, 0, TAU); g.fill();
        g.globalAlpha = 0.25; g.beginPath(); g.arc(STATION.x - 70, STATION.y - 118, 20, 0, TAU); g.fill(); g.globalAlpha = 1;
      } else { g.fillStyle = '#b8b2c2'; g.beginPath(); g.arc(STATION.x - 70, STATION.y - 118, 9, 0, TAU); g.fill(); }
      g.fillStyle = '#7a1f16'; g.fillRect(STATION.x - 74, STATION.y - 110, 8, 6);
    }
    drawPlayer(g, e, t) {
      const C = PARTY_COLORS[e.p.col], hop = hopOf(e), r = e.r, sq = clamp(e.squash, -0.22, 0.28);
      const fx = Math.cos(e.face), fy = Math.sin(e.face), lvl = this.kid ? 1 : e.water / 100;
      const bob = e.mv > 0.15 ? Math.abs(Math.sin(e.walk)) * r * 0.06 : 0;
      // nozzle in front (behind the body when facing up)
      const nx = e.x + fx * r * 0.95, ny = e.y - hop - bob + fy * r * 0.45 + r * 0.42;
      const nozzle = () => {
        g.strokeStyle = '#7a1f16'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(e.x - fx * 4, e.y - hop - bob + r * 0.72); g.quadraticCurveTo(e.x + fx * r * 0.5, e.y - hop - bob + r * 0.8, nx, ny); g.stroke();
        g.strokeStyle = '#c93a2a'; g.lineWidth = 5; g.stroke();
        g.strokeStyle = '#3a3346'; g.lineWidth = 10; g.beginPath(); g.moveTo(nx - fx * 7, ny - fy * 5); g.lineTo(nx + fx * 3, ny + fy * 2); g.stroke();
        g.strokeStyle = '#e8b53a'; g.lineWidth = 8; g.beginPath(); g.moveTo(nx + fx * 2, ny + fy * 1.5); g.lineTo(nx + fx * 9, ny + fy * 6); g.stroke();
        g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(nx + fx * 6, ny + fy * 4 - 2, 1.8, 0, TAU); g.fill();
      };
      const up = fy < -0.3;
      // the water tank on the back peeks out behind the body (or shows fully when walking away)
      if (!up) { onBody(g, e, hop, sq); tank(g, r, -fx * r * 0.72, -r * 0.05, lvl); g.restore(); }
      if (up) nozzle();
      drawCritter(g, e.x, e.y, r, e.p.col, e.p.animal, { face: e.face, hop, squash: sq, step: e.walk, moving: e.mv > 0.15, happy: (e.spray && !!e.target) || e.cheer > 0, blink: (t + e.p.uid * 1.3) % 3.6 < 0.12 });
      onBody(g, e, hop, sq);
      // reflective stripe round the jacket
      g.save(); g.beginPath(); g.arc(0, 0, r * 0.99, 0, TAU); g.clip();
      g.fillStyle = '#ffd23f'; g.fillRect(-r, r * 0.5, r * 2, r * 0.17);
      g.fillStyle = '#eef3f8'; g.fillRect(-r, r * 0.555, r * 2, r * 0.06);
      g.restore();
      if (up) tank(g, r, 0, r * 0.08, lvl);
      helmet(g, r, e.face, C.c);
      if (e.worry > 0.3) sweat(g, (fx >= 0 ? -1 : 1) * r * 0.78, -r * 0.42, t, e.p.uid * 0.37);
      g.restore();
      if (!up) nozzle();
      drawTag(g, e.x, e.y - r - 40 - hop, e.p);
      // water tank meter (大人)
      if (!this.kid) {
        const lo = e.water < 25, w = 64;
        g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.roundRect(e.x - w / 2 - 3, e.y + r + 8, w + 6, 14, 7); g.fill();
        g.fillStyle = lo && (t * 5 | 0) % 2 ? '#ff4f58' : '#2f8cff'; g.beginPath(); g.roundRect(e.x - w / 2, e.y + r + 11, Math.max(4, w * e.water / 100), 8, 4); g.fill();
        if (e.water <= 0 && !e.filling) { g.font = '20px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💧?', e.x + w / 2 + 22, e.y + r + 15); }
      }
      // refilling: a little tank filling up with bubbles
      if (e.filling) {
        const tx = e.x + 44, ty = e.y - 64, k = e.water / 100;
        g.fillStyle = '#fff'; g.strokeStyle = '#2f8cff'; g.lineWidth = 4; g.beginPath(); g.roundRect(tx - 18, ty - 28, 36, 52, 10); g.fill(); g.stroke();
        const lvl = ty + 20 - 44 * k;
        g.fillStyle = '#5fc3ff'; g.beginPath(); g.moveTo(tx - 14, ty + 20); g.lineTo(tx - 14, lvl);
        for (let i = 0; i <= 4; i++) g.lineTo(tx - 14 + i * 7, lvl + Math.sin(t * 10 + i) * 2.5);
        g.lineTo(tx + 14, ty + 20); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 3; i++) { const by = ty + 18 - ((t * 40 + i * 15) % Math.max(4, 44 * k)); g.beginPath(); g.arc(tx - 6 + i * 6, by, 2.2, 0, TAU); g.fill(); }
      }
      // a little arrow pointing to the nearest fire when it's out of reach
      if (e.near && !e.spray) {
        const a = Math.atan2(e.near.y - 20 - e.y, e.near.x - e.x), R = r + 30 + Math.sin(t * 8) * 4, ax = e.x + Math.cos(a) * R, ay = e.y + Math.sin(a) * R * 0.8;
        g.save(); g.translate(ax, ay); g.rotate(a); g.fillStyle = '#ff7a2e'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.globalAlpha = 0.9;
        g.beginPath(); g.moveTo(12, 0); g.lineTo(-8, -11); g.lineTo(-3, 0); g.lineTo(-8, 11); g.closePath(); g.stroke(); g.fill(); g.restore();
      }
      // in reach but not spraying: tell the little ones what to do
      if (this.kid && e.target && !e.spray) {
        {
          const by = e.y - r - 66 - hop + Math.sin(t * 6) * 3; g.font = `900 22px ${FONT}`; const w = g.measureText('按住噴水！').width + 24;
          g.fillStyle = '#2f8cff'; g.beginPath(); g.roundRect(e.x - w / 2, by - 17, w, 34, 17); g.fill();
          g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('按住噴水！', e.x, by + 1);
        }
      }
      void C;
    }
    /* the hose: a curved stream that grows out from the nozzle */
    drawStream(g, e, t) {
      if (e.sprayK <= 0) return;
      const fx = Math.cos(e.face), fy = Math.sin(e.face), hop = hopOf(e) + (e.mv > 0.15 ? Math.abs(Math.sin(e.walk)) * e.r * 0.06 : 0);
      const sx = e.x + fx * (e.r * 0.95 + 9), sy = e.y - hop + fy * e.r * 0.45 + e.r * 0.42 + fy * 6;
      const ex = e.tx, ey = e.ty, d = hyp(ex - sx, ey - sy), lift = 40 + d * 0.22;
      const cx = (sx + ex) / 2 + Math.sin(t * 17) * 4, cy = (sy + ey) / 2 - lift + Math.sin(t * 23) * 4;
      const P = this.pts, N = 14, kk = e.sprayK;
      for (let i = 0; i <= N; i++) { const u = i / N * kk, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; P[i * 2] = a * sx + b * cx + c * ex; P[i * 2 + 1] = a * sy + b * cy + c * ey; }
      const path = () => { g.beginPath(); g.moveTo(P[0], P[1]); for (let i = 1; i <= N; i++) g.lineTo(P[i * 2], P[i * 2 + 1]); };
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = 'rgba(47,140,255,.35)'; g.lineWidth = 18; path(); g.stroke();
      g.strokeStyle = '#5fc3ff'; g.lineWidth = 10; path(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 4; g.setLineDash([10, 16]); g.lineDashOffset = -t * 420; path(); g.stroke(); g.setLineDash([]);
      if (kk >= 1) {   // splash where it lands
        g.fillStyle = 'rgba(191,232,255,.9)';
        for (let i = 0; i < 4; i++) { const a = t * 13 + i * 1.6, rr = 10 + 6 * Math.sin(t * 20 + i); g.beginPath(); g.arc(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr * 0.6, 5, 0, TAU); g.fill(); }
      }
    }
    draw(g) {
      const t = this.t;
      g.drawImage(BG, -400, 0);
      // puddles where the water landed
      for (const q of this.pud) if (q.on) {
        const a = Math.min(1, q.life / 3); g.globalAlpha = a * 0.55; g.fillStyle = '#5fc3ff'; g.beginPath(); g.ellipse(q.x, q.y, q.r, q.r * 0.42, 0, 0, TAU); g.fill();
        g.globalAlpha = a * 0.7; g.fillStyle = '#d6f1ff'; g.beginPath(); g.ellipse(q.x - q.r * 0.3, q.y - q.r * 0.12, q.r * 0.32, q.r * 0.09, -0.1, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      // two koi circling in the pond
      for (let k = 0; k < 2; k++) {
        const a = t * (0.45 + k * 0.12) + k * 2.6, fx = POND.x + Math.cos(a) * POND.rx * (0.55 - k * 0.15), fy = POND.y + Math.sin(a) * POND.ry * (0.5 - k * 0.12), h = a + Math.PI / 2;
        g.save(); g.translate(fx, fy); g.rotate(h); g.globalAlpha = 0.85;
        g.fillStyle = k ? '#fff6ea' : '#ff8a3a'; g.beginPath(); g.ellipse(0, 0, 13, 5.5, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(-11, 0); g.lineTo(-20, -6 + Math.sin(t * 12 + k) * 2); g.lineTo(-20, 6 + Math.sin(t * 12 + k) * 2); g.closePath(); g.fill();
        if (k) { g.fillStyle = '#ff6b3a'; g.beginPath(); g.arc(3, -1, 3, 0, TAU); g.fill(); }
        g.restore(); g.globalAlpha = 1;
      }
      // everyone's hose lies on the ground behind them
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const e of this.es) {
        const T = e.trail, path = () => { g.beginPath(); g.moveTo(e.x - Math.cos(e.face) * e.r * 0.6, e.y + e.r * 0.25); for (let k = 0; k < T.length; k += 2) g.lineTo(T[k], T[k + 1]); };
        g.strokeStyle = 'rgba(40,30,30,.18)'; g.lineWidth = 10; g.save(); g.translate(2, 4); path(); g.stroke(); g.restore();
        g.strokeStyle = '#7a1f16'; g.lineWidth = 8; path(); g.stroke();
        g.strokeStyle = '#d63a2a'; g.lineWidth = 4.8; path(); g.stroke();
        g.strokeStyle = 'rgba(255,170,150,.6)'; g.lineWidth = 1.6; g.setLineDash([8, 10]); path(); g.stroke(); g.setLineDash([]);
        const n = T.length - 2; g.fillStyle = '#e8b53a'; g.beginPath(); g.arc(T[n], T[n + 1], 6, 0, TAU); g.fill();
      }
      // live pond ripples
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3;
      for (let k = 0; k < 3; k++) { const u = (t * 0.35 + k / 3) % 1; g.globalAlpha = 1 - u; g.beginPath(); g.ellipse(POND.x + 10, POND.y + 4, 20 + u * 80, 8 + u * 36, 0, 0, TAU); g.stroke(); }
      g.globalAlpha = 1;
      if (!this.kid) {
        g.strokeStyle = 'rgba(47,140,255,.55)'; g.lineWidth = 4; g.setLineDash([14, 12]); g.lineDashOffset = -t * 20;
        g.beginPath(); g.ellipse(POND.x, POND.y, POND.rx + 75, POND.ry + 75, 0, 0, TAU); g.stroke(); g.setLineDash([]);
        g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; const lw = g.measureText('💧 來這裡裝水').width + 24;
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(POND.x - lw / 2, POND.y + POND.ry + 60, lw, 34, 17); g.fill();
        g.fillStyle = '#1658b5'; g.fillText('💧 來這裡裝水', POND.x, POND.y + POND.ry + 78);
      }
      Fx.ground(g);
      for (const e of this.es) e.sy = e.y;
      const L = this.draws; L.sort((a, b) => a.sy - b.sy);
      for (const o of L) { if (o.kind === 1) this.drawHouse(g, o, t); else if (o.kind === 0) this.drawPlayer(g, o, t); else if (o.kind === 2) this.drawStation(g, t); else this.drawFlags(g, t); }
      for (const e of this.es) this.drawStream(g, e, t);
      for (const c of this.cats) if (c.st === 'jump') this.drawCat(g, c, t);
      // smoke, steam, embers, drops, sparkles
      for (const p of this.P) {
        if (!p.on) continue; const k = p.t / p.life;
        if (p.k === 0) { g.globalAlpha = (1 - k) * 0.45 * Math.min(1, p.t * 4); g.fillStyle = '#6f6a74'; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + k * 1.6), 0, TAU); g.fill(); }
        else if (p.k === 5) { g.globalAlpha = (1 - k) * 0.4 * Math.min(1, p.t * 3); g.fillStyle = '#eceaf2'; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + k * 1.8), 0, TAU); g.fill(); }
        else if (p.k === 1) { g.globalAlpha = (1 - k) * 0.75; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(p.x, p.y, p.r * (0.7 + k * 1.2), 0, TAU); g.fill(); }
        else if (p.k === 2) { g.globalAlpha = (1 - k) * (0.6 + 0.4 * Math.sin(p.t * 30)); g.fillStyle = k < 0.5 ? '#ffd23f' : '#ff7a2e'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
        else if (p.k === 3) { g.globalAlpha = 0.9; g.fillStyle = '#5fc3ff'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
        else {
          const s = p.r * Math.sin(k * Math.PI); g.globalAlpha = 1; g.fillStyle = '#fff6a8';
          g.beginPath(); g.moveTo(p.x, p.y - s); g.quadraticCurveTo(p.x, p.y, p.x + s, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y + s); g.quadraticCurveTo(p.x, p.y, p.x - s, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y - s); g.fill();
        }
      }
      g.globalAlpha = 1;
    }
    center() {
      const left = Math.max(0, this.lives - this.lost), burning = this.houses.filter(h => h.fire > 0).length;
      return (burning ? '🔥 ' + burning + ' 間著火・' : '') + '🏠 還可以燒 ' + left + ' 間';
    }
    chip(p) { return '🚒 ' + this.by.get(p).saved; }
    pad(p) {
      const e = this.by.get(p), burning = this.houses.filter(h => h.fire > 0).length;
      const w = this.kid ? '' : (e.water <= 0 ? '　沒水了，去池塘！' : '　💧' + Math.round(e.water));
      return (burning ? '🔥 ' + burning + ' 間著火' : '沒有火') + w;
    }
    ready(p) { const e = this.by.get(p); return this.kid || e.water > 0; }
    results() {
      const left = this.lives - this.lost;
      const stars = this.ok ? (this.lost === 0 ? 3 : left >= Math.ceil(this.lives / 2) ? 2 : 1) : 0;
      return {
        team: true, ok: this.ok, stars,
        title: this.ok ? (this.lost === 0 ? '一間都沒燒掉！' : '撐過去了！') : '燒掉太多房子了…',
        sub: `燒掉 ${this.lost} 間房子`,
        rows: this.es.slice().sort((a, b) => b.saved - a.saved).map(e => ({ p: e.p, key: e.saved, line: `滅火 ${e.saved} 次` }))
      };
    }
  }
  GAMES.push({
    id: 'fire', name: '一起救火', icon: '🚒', col: '#ff4f2e', bg: '#7cc565', kind: 'team', players: '1–6 人',
    blurb: '大家合作，房子著火了快去滅火！',
    btn: { label: '按住噴水', icon: '💦' },
    rules: kid => kid
      ? ['房子會著火，跟著橘色箭頭跑到著火的房子旁邊', '按住「噴水」不放，水管會自己對準火', '房子下面的紅條滿了，房子就會燒掉', '90 秒內燒掉不到 4 間就成功']
      : ['跑到著火的房子旁邊，按住「噴水」澆熄', '水會用完！回中間的池塘就能裝滿', '火太大會燒到隔壁的房子，要分頭去救', '90 秒內燒掉不到 2 間就成功'],
    thumb(g) {
      g.fillStyle = '#8fd27a'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#fff3dc'; g.fillRect(150, 70, 110, 60); g.fillStyle = '#ff6b5e'; g.beginPath(); g.moveTo(140, 74); g.lineTo(205, 26); g.lineTo(270, 74); g.fill();
      for (let k = 0; k < 4; k++) { const fx = 165 + k * 27; g.fillStyle = '#ff5a1f'; g.beginPath(); g.moveTo(fx - 12, 70); g.quadraticCurveTo(fx, 30, fx, 22); g.quadraticCurveTo(fx, 30, fx + 12, 70); g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(fx, 62, 6, 0, TAU); g.fill(); }
      drawCritter(g, 80, 110, 24, 1, 1, { face: 0, happy: true }); g.fillStyle = '#ff4f2e'; g.beginPath(); g.ellipse(80, 93, 19, 10, 0, Math.PI, 0); g.fill();
      g.strokeStyle = '#5fc3ff'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(104, 104); g.quadraticCurveTo(135, 60, 165, 78); g.stroke();
    },
    create: ctx => new Fire(ctx)
  });
})();
