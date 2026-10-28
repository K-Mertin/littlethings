// 千軍突圍 — 新障礙、拋射物、天候的畫法
'use strict';

function buildHaz() {
  const H = ART.haz = {};
  // 磚牆（正面貼圖）
  H.wall = mk(512, 192, g => {
    g.fillStyle = '#6b4a3a'; g.fillRect(0, 0, 512, 192);
    const bw = 64, bh = 32;
    for (let r = 0; r < 6; r++) for (let c = -1; c < 9; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0) + 2, y = r * bh + 2;
      const k = (r * 7 + c * 13) % 5;
      g.fillStyle = ['#b5653f', '#a95a37', '#c27149', '#9e5232', '#b86a44'][k];
      rr(g, x, y, bw - 4, bh - 4, 3); g.fill();
      g.fillStyle = 'rgba(255,220,180,.18)'; g.fillRect(x + 2, y + 2, bw - 8, 4);
      g.fillStyle = 'rgba(40,10,0,.18)'; g.fillRect(x + 2, y + bh - 9, bw - 8, 4);
    }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 186, 512, 6);
    g.fillStyle = '#8a8f99'; g.fillRect(0, 0, 512, 10);
    g.fillStyle = '#b8bdc6'; g.fillRect(0, 0, 512, 4);
  });
  H.crack = [1, 2, 3].map(n => mk(512, 192, g => {
    g.strokeStyle = 'rgba(30,10,0,.75)'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
    const r = rng(n * 17 + 3);
    for (let i = 0; i < n * 2; i++) {
      let x = 60 + r() * 392, y = 20 + r() * 60;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 70; y += 18 + r() * 22; g.lineTo(x, y); }
      g.stroke();
    }
  }));
  // 補給箱
  H.crate = mk(128, 128, g => {
    g.fillStyle = lin(g, 0, 10, 0, 124, ['#d9a35a', '#a8702f']); rr(g, 8, 14, 112, 108, 10); g.fill();
    g.strokeStyle = '#6b4520'; g.lineWidth = 6; rr(g, 11, 17, 106, 102, 8); g.stroke();
    g.lineWidth = 7; g.beginPath(); g.moveTo(16, 24); g.lineTo(112, 112); g.moveTo(112, 24); g.lineTo(16, 112); g.stroke();
    g.fillStyle = '#2f9bff'; rr(g, 34, 46, 60, 40, 9); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3; rr(g, 34, 46, 60, 40, 9); g.stroke();
    g.fillStyle = '#fff'; g.font = '900 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 68);
    g.fillStyle = 'rgba(255,255,255,.25)'; rr(g, 12, 16, 104, 10, 5); g.fill();
  });
  // 刀鋸
  H.saw = mk(160, 160, g => {
    const c = 80;
    g.translate(c, c);
    g.fillStyle = lin(g, -70, -70, 70, 70, ['#f2f5fa', '#9aa4b5', '#e3e8f0', '#7b8596']);
    g.beginPath();
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 0.55) / n * Math.PI * 2, a2 = (i + 1) / n * Math.PI * 2;
      g.lineTo(Math.cos(a0) * 58, Math.sin(a0) * 58); g.lineTo(Math.cos(a1) * 76, Math.sin(a1) * 76); g.lineTo(Math.cos(a2) * 58, Math.sin(a2) * 58);
    }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,46,60,.5)'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 44, -2.4, -1.2); g.stroke();
    g.fillStyle = '#c0392b'; ell(g, 0, 0, 20, 20); g.fill();
    g.fillStyle = '#2a2d36'; ell(g, 0, 0, 9, 9); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.5; ell(g, Math.cos(a) * 34, Math.sin(a) * 34, 6, 6); g.fill(); }
  });
  // 拋射物
  H.proj = {
    rock: mk(64, 64, g => { g.fillStyle = rad(g, 32, 32, 28, '#c8beae', '#5c544a'); poly(g, [8, 30, 18, 10, 40, 6, 58, 22, 56, 46, 36, 58, 14, 50]); g.fill(); g.fillStyle = 'rgba(255,170,60,.8)'; g.fillRect(26, 28, 14, 4); }),
    poison: mk(64, 64, g => { g.fillStyle = rad(g, 32, 34, 26, '#d9ff8a', '#3f8a1f'); ell(g, 32, 34, 24, 22); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; ell(g, 24, 26, 6, 4); g.fill(); }),
    ice: mk(64, 64, g => { g.fillStyle = lin(g, 10, 10, 54, 54, ['#ffffff', '#8fd3ff', '#3f8fd0']); poly(g, [32, 4, 52, 22, 58, 44, 34, 60, 10, 46, 8, 20]); g.fill(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 8); g.lineTo(34, 56); g.moveTo(12, 24); g.lineTo(54, 40); g.stroke(); }),
    missile: mk(64, 64, g => { g.translate(32, 32); g.fillStyle = '#d9dfe9'; rr(g, -7, -24, 14, 40, 6); g.fill(); g.fillStyle = '#e8453c'; poly(g, [-7, -18, 0, -30, 7, -18]); g.fill(); g.fillStyle = '#5a6377'; poly(g, [-7, 10, -14, 20, -7, 16]); g.fill(); poly(g, [7, 10, 14, 20, 7, 16]); g.fill(); g.fillStyle = '#ffd34d'; ell(g, 0, 20, 5, 7); g.fill(); }),
    bomb: mk(64, 64, g => { g.fillStyle = rad(g, 30, 36, 22, '#5a5f70', '#14161c'); ell(g, 30, 36, 20, 20); g.fill(); g.fillStyle = '#8a6a3a'; g.fillRect(28, 10, 6, 10); g.fillStyle = '#ffd34d'; ell(g, 31, 9, 5, 5); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; ell(g, 22, 28, 6, 4); g.fill(); }),
  };
  H.projCol = { rock: '255,140,40', poison: '120,230,60', ice: '120,200,255', missile: '255,80,60', bomb: '255,90,60' };
}

// ---------- 地面上的東西（在物件之前畫） ----------
function drawHazGround(g, G, t) {
  for (const o of G.objs) {
    if (o.t === 'spike') drawSpike(g, o, t);
    else if (o.t === 'saw') drawSawRail(g, o);
    else if (o.t === 'lob') drawLobWarn(g, o, t);
    else if (o.t === 'boss' && o.strike) drawStrikeWarn(g, o, t);
  }
}

function quadW(g, x0, z0, x1, z1, h) {
  const a = P(x0, z0, h || 0), b = P(x1, z0, h || 0), c = P(x1, z1, h || 0), d = P(x0, z1, h || 0);
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath();
}

function drawSpike(g, o, t) {
  if (o.z > ZSPAWN || o.z + o.len < -Z0 + 0.5) return;
  const z0 = Math.max(o.z, -Z0 + 0.6), z1 = o.z + o.len;
  // 底板
  g.fillStyle = '#3d424e'; quadW(g, o.x0, z0, o.x1, z1); g.fill();
  g.strokeStyle = o.warn ? '#ff4a3a' : '#ffcc33'; g.lineWidth = Math.max(1.5, 0.06 * P(0, z0, 0).s);
  quadW(g, o.x0, z0, o.x1, z1); g.stroke();
  // 尖刺
  const c = (G.t + o.ph) % o.per;
  let up = 0;
  if (o.up) up = Math.min(1, c / 0.08);
  else if (o.warn) up = 0.15 + 0.1 * Math.sin(t * 40);
  const cols = Math.round((o.x1 - o.x0) / 0.55), rows = 4;
  for (let r = rows - 1; r >= 0; r--) {
    const z = o.z + (r + 0.5) * o.len / rows;
    if (z < -Z0 + 0.8) continue;
    for (let k = 0; k < cols; k++) {
      const x = o.x0 + (k + 0.5) * (o.x1 - o.x0) / cols;
      const b = P(x, z, 0), s = b.s;
      if (up <= 0.02) { g.fillStyle = '#1e2129'; ell(g, b.x, b.y, 0.08 * s, 0.035 * s); g.fill(); continue; }
      const hh = 0.55 * up * s;
      g.fillStyle = lin(g, b.x - 0.1 * s, 0, b.x + 0.1 * s, 0, ['#8a93a5', '#f1f4f9', '#6d7586']);
      g.beginPath(); g.moveTo(b.x - 0.1 * s, b.y); g.lineTo(b.x, b.y - hh); g.lineTo(b.x + 0.1 * s, b.y); g.closePath(); g.fill();
    }
  }
}

function drawSawRail(g, o) {
  if (o.z > ZSPAWN || o.z < -Z0 + 0.6) return;
  if (o.amp > 0) {
    g.fillStyle = '#2a2d36';
    quadW(g, o.cx - o.amp - 0.3, o.z - 0.12, o.cx + o.amp + 0.3, o.z + 0.12); g.fill();
    g.fillStyle = '#ffcc33';
    for (const sx of [-1, 1]) { const p = P(o.cx + sx * (o.amp + 0.3), o.z, 0); ell(g, p.x, p.y, 0.12 * p.s, 0.06 * p.s); g.fill(); }
  }
}

function drawSaw(g, o) {
  const p = P(o.x, o.z, 0);
  const s = o.r * 2.8 * p.s;
  drawShadow(g, p.x, p.y, s * 0.9);
  g.save(); g.translate(p.x, p.y - s * 0.5); g.scale(1, 0.98); g.rotate(o.spin);
  g.drawImage(ART.haz.saw, -s / 2, -s / 2, s, s);
  g.restore();
  // 支架
  g.fillStyle = '#3a3f4c'; rr(g, p.x - 0.08 * p.s, p.y - s * 0.5, 0.16 * p.s, s * 0.5, 0.04 * p.s); g.fill();
}

function drawLobWarn(g, o, t) {
  if (o.tz < -Z0 + 0.6) return;
  const q = clamp(o.age / o.T, 0, 1);
  const a = P(o.tx, o.tz - o.rad, 0), b = P(o.tx, o.tz + o.rad, 0), m = P(o.tx, o.tz, 0);
  const rx = o.rad * m.s, ry = Math.max(2, (a.y - b.y) / 2), cy = (a.y + b.y) / 2;
  const col = ART.haz.projCol[o.kind];
  g.fillStyle = `rgba(${col},${0.12 + q * 0.28})`;
  g.beginPath(); g.ellipse(m.x, cy, rx * q, ry * q, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = `rgba(255,60,60,${0.55 + 0.35 * Math.sin(t * 18)})`; g.lineWidth = Math.max(2, 0.07 * m.s);
  g.beginPath(); g.ellipse(m.x, cy, rx, ry, 0, 0, Math.PI * 2); g.stroke();
}

function drawLob(g, o) {
  const p = P(o.x, o.z, o.h), gnd = P(o.x, o.z, 0);
  const s = (o.kind === 'bomb' ? 0.8 : 1.15) * p.s;
  g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, gnd.x, gnd.y, s * 0.35, s * 0.12); g.fill();
  g.save(); g.translate(p.x, p.y); g.rotate(o.kind === 'missile' ? Math.PI : o.age * 8);
  g.drawImage(ART.haz.proj[o.kind], -s / 2, -s / 2, s, s);
  g.restore();
  if (o.kind === 'missile' || o.kind === 'bomb') {
    g.globalCompositeOperation = 'lighter';
    const gs = s * 0.9; g.drawImage(ART.glow.rocket, p.x - gs / 2, p.y - gs / 2 - (o.kind === 'missile' ? -s * 0.3 : s * 0.35), gs, gs);
    g.globalCompositeOperation = 'source-over';
  }
}

function drawStrikeWarn(g, b, t) {
  const st = b.strike;
  const z1 = Math.max(-Z0 + 0.6, -3), z0 = b.z;
  const k = 1 - st.t / 1.05;
  g.fillStyle = `rgba(255,40,40,${0.15 + k * 0.3 + 0.08 * Math.sin(t * 20)})`;
  quadW(g, st.x - 1.25, z1, st.x + 1.25, z0); g.fill();
  g.strokeStyle = 'rgba(255,90,90,.9)'; g.lineWidth = Math.max(2, 0.05 * P(st.x, 0, 0).s);
  quadW(g, st.x - 1.25, z1, st.x + 1.25, z0); g.stroke();
  // 箭頭
  for (let i = 0; i < 3; i++) {
    const z = z0 - 2 - i * 2.4 - (t * 6 % 2.4);
    if (z < z1 + 0.5) continue;
    const a = P(st.x - 0.6, z + 0.6, 0), b2 = P(st.x, z - 0.4, 0), c = P(st.x + 0.6, z + 0.6, 0);
    g.fillStyle = 'rgba(255,230,230,.75)'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b2.x, b2.y); g.lineTo(c.x, c.y); g.closePath(); g.fill();
  }
}

// ---------- 立起來的東西（深度排序） ----------
function drawWall(g, o, t) {
  const H = ART.haz, Hh = 2.2;
  const A = P(-ROAD - 0.2, o.z, 0), B = P(ROAD + 0.2, o.z, Hh);
  const w = B.x - A.x, h = A.y - B.y;
  if (h < 2) return;
  const jx = o.hit > 0 ? (Math.random() - 0.5) * 0.05 * A.s : 0;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(A.x + jx, A.y - 0.04 * A.s, w, 0.12 * A.s);
  g.drawImage(H.wall, A.x + jx, B.y, w, h);
  const dmg = 1 - o.hp / o.max;
  const ci = dmg > 0.7 ? 2 : dmg > 0.4 ? 1 : dmg > 0.15 ? 0 : -1;
  if (ci >= 0) g.drawImage(H.crack[ci], A.x + jx, B.y, w, h);
  if (o.hit > 0) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(A.x + jx, B.y, w, h); }
  // 牌子：血量與獎勵
  const u = A.s;
  const cx = A.x + w / 2, sy = B.y - 0.55 * u;
  const rwTxt = gateText(o.rw);
  g.font = `900 ${0.5 * u}px "Noto Sans TC",system-ui,sans-serif`;
  const label = `打破拿 ${rwTxt}`;
  const tw = g.measureText(label).width;
  const bw = tw + 0.6 * u, bh = 0.72 * u;
  g.fillStyle = 'rgba(20,24,36,.85)'; rr(g, cx - bw / 2, sy - bh / 2, bw, bh, bh / 2); g.fill();
  g.strokeStyle = '#ffd34d'; g.lineWidth = Math.max(1.5, 0.05 * u); g.stroke();
  g.fillStyle = '#ffe680'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, cx, sy + 0.02 * u);
  // 血條
  const hw = w * 0.5, hy = B.y + h * 0.42, hh = Math.max(4, 0.26 * u);
  g.fillStyle = 'rgba(10,10,20,.75)'; rr(g, cx - hw / 2, hy, hw, hh, hh / 2); g.fill();
  g.fillStyle = '#ff7a3a'; rr(g, cx - hw / 2 + 2, hy + 2, Math.max(0, (hw - 4) * (o.hp / o.max)), hh - 4, (hh - 4) / 2); g.fill();
  g.font = `900 ${0.62 * u}px "Noto Sans TC",system-ui,sans-serif`;
  g.lineJoin = 'round'; g.lineWidth = 0.12 * u; g.strokeStyle = 'rgba(40,10,0,.9)';
  const num = fmtNum(Math.max(1, o.hp));
  g.strokeText(num, cx, hy + hh + 0.5 * u); g.fillStyle = '#fff'; g.fillText(num, cx, hy + hh + 0.5 * u);
}

function drawCrate(g, o, t) {
  const p = P(o.x, o.z, 0);
  const C = ART.haz.crate, s = 1.25 * p.s;
  const ch = (C.wh || 1.25) * p.s, cw = ch * C.width / C.height, cy = p.y - ch * (1 - (C.foot || 0));
  const bob = Math.sin(t * 3 + o.id) * 0.04 * p.s;
  drawShadow(g, p.x, p.y, s * 1.2);
  g.drawImage(C, p.x - cw / 2, cy - bob, cw, ch);
  if (o.hit > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45; g.drawImage(C, p.x - cw / 2, cy - bob, cw, ch); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  // 獎勵標籤
  const txt = gateText(o.rw);
  const fs = 0.42 * p.s;
  g.font = `900 ${fs}px "Noto Sans TC",system-ui,sans-serif`;
  const tw = g.measureText(txt).width, bw = tw + fs * 0.8, bh = fs * 1.35;
  const by = p.y - s - bob - bh - 0.08 * p.s;
  g.fillStyle = o.rw.k === 'lv' ? 'rgba(20,140,80,.9)' : 'rgba(20,90,200,.9)'; rr(g, p.x - bw / 2, by, bw, bh, bh / 2); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, p.x, by + bh / 2 + fs * 0.04);
  // 血條
  if (o.hp < o.max) {
    const hw = s * 0.9, hy = p.y - 0.12 * p.s;
    g.fillStyle = 'rgba(10,10,20,.7)'; g.fillRect(p.x - hw / 2, hy, hw, Math.max(3, 0.08 * p.s));
    g.fillStyle = '#ffd34d'; g.fillRect(p.x - hw / 2, hy, hw * clamp(o.hp / o.max, 0, 1), Math.max(3, 0.08 * p.s));
  }
}

// 會動的門：上方橫桿與左右箭頭；轉盤門：倒數小圈
function drawGateExtra(g, o, t) {
  const H = 2.7;
  if (o.slide && !o.pair.used) {
    const a = P(-ROAD, o.z, H + 0.35), b = P(ROAD, o.z, H + 0.35);
    g.strokeStyle = '#8b95a8'; g.lineWidth = Math.max(2, 0.12 * a.s);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    g.strokeStyle = '#ffd34d'; g.lineWidth = Math.max(1, 0.04 * a.s);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    for (const sx of [-1, 1]) drawPost(g, sx * ROAD, o.z, H + 0.4);
    const c = P(o.x, o.z, H + 0.35);
    g.strokeStyle = '#8b95a8'; g.lineWidth = Math.max(1.5, 0.06 * c.s);
    for (const sx of [-1, 1]) { const d = P(o.x + sx * o.w, o.z, H + 0.1); g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(P(o.x + sx * o.w * 0.6, o.z, H + 0.35).x, c.y); g.stroke(); }
    // 箭頭
    const dir = Math.cos(G.t * o.slide.f + o.slide.ph) >= 0 ? 1 : -1;
    const ar = P(o.x + dir * (o.w + 0.45), o.z, 1.4), s = 0.35 * ar.s;
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.moveTo(ar.x + dir * s, ar.y); g.lineTo(ar.x - dir * s * 0.4, ar.y - s * 0.7); g.lineTo(ar.x - dir * s * 0.4, ar.y + s * 0.7); g.closePath(); g.fill();
  }
  if (o.roul && !o.pair.used) {
    const p = P(o.x + o.w - 0.45, o.z, H - 0.35), r = 0.25 * p.s;
    g.fillStyle = 'rgba(0,0,0,.45)'; ell(g, p.x, p.y, r, r); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(p.x, p.y); g.arc(p.x, p.y, r * 0.85, -Math.PI / 2, -Math.PI / 2 + (1 - o.roul.t / o.roul.per) * Math.PI * 2); g.closePath(); g.fill();
    // 下一個數字
    const nx = o.roul.vals[(o.roul.i + 1) % o.roul.vals.length];
    const q = P(o.x, o.z, 0.42);
    g.font = `900 ${0.32 * q.s}px "Noto Sans TC",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('下一個 ' + gateText(nx), q.x, q.y);
  }
}

// ---------- 天候 ----------
function drawFogRule(g, th) {
  // 沙暴：遠方幾乎看不到，26 公尺內才清楚
  const y0 = Math.max(0, R.hy - 4), y1 = P(0, 24, 0).y;
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, 'rgba(232,196,140,.97)'); gr.addColorStop(0.55, 'rgba(232,196,140,.85)'); gr.addColorStop(1, 'rgba(232,196,140,0)');
  g.fillStyle = gr; g.fillRect(-20, y0, R.W + 40, y1 - y0);
  g.fillStyle = 'rgba(232,196,140,.97)'; g.fillRect(-20, -20, R.W + 40, y0 + 20);
}

function drawDarkRule(g, G) {
  // 停電：只有部隊前面一小塊是亮的
  if (!R.darkCv || R.darkCv.width !== R.W || R.darkCv.height !== R.H) R.darkCv = mkCanvas(R.W, R.H);
  const c = R.darkCv.getContext('2d');
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, R.W, R.H);
  c.fillStyle = 'rgba(4,4,16,.86)'; c.fillRect(0, 0, R.W, R.H);
  c.globalCompositeOperation = 'destination-out';
  const p0 = P(G.px, 0, 0), p1 = P(G.px, 20, 0);
  const rx = Math.max(R.W * 0.18, 3.2 * p0.s);
  // 部隊周圍
  let gr = c.createRadialGradient(p0.x, p0.y, 0, p0.x, p0.y, rx);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.beginPath(); c.ellipse(p0.x, p0.y - rx * 0.3, rx, rx * 0.9, 0, 0, Math.PI * 2); c.fill();
  // 往前的光束
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const z = 2 + i * 2.2, p = P(G.px, z, 0.8), r = (1.6 + z * 0.13) * p.s;
    gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    const a = 0.7 * (1 - i / steps);
    gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
  }
  // 路燈與霓虹招牌的小光點
  c.globalCompositeOperation = 'source-over';
  g.drawImage(R.darkCv, 0, 0);
  // 門的面板還是看得到一點點（自己會發光）
  g.save(); g.globalAlpha = 0.45;
  for (const o of G.objs) if (o.t === 'gate' && !o.pair.used && o.z > 4) drawGate(g, o, G.t);
  g.restore();
}

// 紅圈蓋在部隊上面也看得到（只畫外框）
function drawLobWarnTop(g, G, t) {
  for (const o of G.objs) {
    if (o.t !== 'lob' || o.tz > 6 || o.tz < -Z0 + 0.6) continue;
    const a = P(o.tx, o.tz - o.rad, 0), b = P(o.tx, o.tz + o.rad, 0), m = P(o.tx, o.tz, 0);
    g.setLineDash([10 * R.dpr, 8 * R.dpr]);
    g.strokeStyle = `rgba(255,70,70,${0.6 + 0.3 * Math.sin(t * 18)})`; g.lineWidth = Math.max(2.5, 0.06 * m.s);
    g.beginPath(); g.ellipse(m.x, (a.y + b.y) / 2, o.rad * m.s, Math.max(2, (a.y - b.y) / 2), 0, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
  }
}

// 岔路中間的隔牆（分段加入深度排序）
function dividerItems(items, o) {
  for (let z = 0; z < o.len; z += 3) items.push({ z: o.z + z, div: o, z0: o.z + z, z1: o.z + Math.min(o.len, z + 3) });
}
function drawDividerSeg(g, it) {
  const z0 = Math.max(it.z0, -Z0 + 0.8), z1 = it.z1;
  if (z1 <= z0) return;
  const w = 0.32, h = 0.95;
  // 側面
  g.fillStyle = '#9aa3b2';
  quadW(g, -w, z0, w, z0, 0);
  const a = P(-w, z0, 0), b = P(w, z0, 0), c = P(w, z0, h), d = P(-w, z0, h);
  g.fillStyle = '#c9d0db'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fill();
  for (const sx of [-1, 1]) {
    const p0 = P(sx * w, z0, 0), p1 = P(sx * w, z1, 0), p2 = P(sx * w, z1, h), p3 = P(sx * w, z0, h);
    g.fillStyle = '#aab3c2'; g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.lineTo(p3.x, p3.y); g.closePath(); g.fill();
  }
  // 頂面黃黑條紋
  const n = 3;
  for (let k = 0; k < n; k++) {
    const za = z0 + (z1 - z0) * k / n, zb = z0 + (z1 - z0) * (k + 1) / n;
    g.fillStyle = k % 2 ? '#2a2d36' : '#ffcc33';
    quadW(g, -w, za, w, zb, h); g.fill();
  }
}
