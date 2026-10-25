'use strict';
// 第 9 關「深海基地」：珊瑚礁淺海 → 深海峽谷（熱泉、發光生物、沉船）→ 海底基地
// 新敵人：機械魟魚、電漿水母、海床魚雷艙；中頭目「深淵潛艇」；頭目「深淵海妖」（觸手會甩打）
// 這個檔案也放 9–12 關共用的小工具（環境層、敵彈圖、光束顏色）

// ================= 共用 =================
const AMB2 = {};
{
  const u0 = ambUpdate, d0 = ambDraw;
  ambUpdate = function (dt) { const A = AMB2[STAGES[G.stage].amb]; if (A) A.update(dt); else u0(dt); };
  ambDraw = function (ctx) { const A = AMB2[STAGES[G.stage].amb]; if (A) A.draw(ctx); else d0(ctx); };
}
Object.assign(BEAM_COL, {
  c: [[90, 230, 255], 'rgba(40,180,255,.38)', 'rgba(150,240,255,.9)'],
  g: [[120, 255, 90], 'rgba(90,255,60,.35)', 'rgba(190,255,140,.9)'],
  v: [[200, 120, 255], 'rgba(160,80,255,.38)', 'rgba(220,170,255,.9)'],
});
SPR.ebInk = { w: 16, h: 16, draw(g) { circ(g, 0, 0, 7.5, rad(g, 0, 0, 7.5, ['rgba(170,90,255,.6)', 'rgba(120,40,255,0)'])); circ(g, 0, 0, 5, 'rgba(20,0,40,.92)'); circ(g, -1, -1, 3.6, rad(g, -1.5, -1.5, 4, ['#f0d8ff', '#a060ff', '#40108a'])); } };
SPR.ebA = { w: 14, h: 14, draw(g) { circ(g, 0, 0, 6.5, rad(g, 0, 0, 6.5, ['rgba(140,255,60,.6)', 'rgba(80,255,20,0)'])); circ(g, 0, 0, 4.2, 'rgba(10,40,0,.88)'); circ(g, 0, 0, 3.4, rad(g, -0.8, -0.8, 3.6, ['#ffffff', '#d8ff90', '#4ad020'])); } };
SPR.ebC = { w: 10, h: 20, draw(g) { P_(g, [0, -9, 3.6, 0, 0, 9, -3.6, 0], 'rgba(10,30,60,.9)'); P_(g, [0, -7.6, 2.6, 0, 0, 7.6, -2.6, 0], lin(g, 0, -8, 0, 8, ['#ffffff', '#9ff0ff', '#3aa8ff'])); } };
Object.assign(EB_SPR, { ink: 'ebInk', a: 'ebA', c: 'ebC', cr: true });
function eShot2(x, y, a, spd, kind, extra) { eShot(x, y, a, spd, kind); const b = G.eb[G.eb.length - 1]; if (b && b.x === x && b.y === y && extra) Object.assign(b, extra); return b; }

// 可以無縫重複的水底光紋（Voronoi 邊緣）
function makeCaustic(N, n, seed) {
  const pts = []; for (let i = 0; i < n; i++) pts.push([hash(i, 1, seed) * N, hash(i, 2, seed) * N]);
  const c = mkCanvas(N, N), g = c.getContext('2d'), id = g.createImageData(N, N), d = id.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let f1 = 1e9, f2 = 1e9;
    for (const [px, py] of pts) for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const dx = x - px - ox * N, dy = y - py - oy * N, dd = dx * dx + dy * dy;
      if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
    }
    const e = Math.sqrt(f2) - Math.sqrt(f1), v = Math.pow(clamp(1 - e / 5, 0, 1), 2.2);
    const q = (y * N + x) * 4; d[q] = 150 + v * 105; d[q + 1] = 230 + v * 25; d[q + 2] = 255; d[q + 3] = v * 255;
  }
  g.putImageData(id, 0, 0);
  return c;
}

// ================= 地形 =================
const Z9 = v => { const d = -v; const deep = smooth(1200, 1600, d) * (1 - smooth(2800, 3200, d)); return { reef: 1 - smooth(1200, 1600, d), deep, base: smooth(2800, 3200, d) }; };
const tX9 = v => 180 + Math.sin(v * 0.0016 + 0.7) * 78 + Math.sin(v * 0.0049) * 18;
const tW9 = v => 30 + Z9(v).deep * 64;
const trench9 = (x, v) => Z9(v).deep > 0.3 && Math.abs(x - tX9(v)) < tW9(v) / 2;
const H9 = (x, v) => {
  const z = Z9(v);
  let h = fbm(x * 0.006, v * 0.006, 901) * (22 + z.deep * 34);
  h += Math.pow(ridge(x * 0.018, v * 0.018, 902), 6) * 16 * (z.reef + z.deep * 0.6);
  h += Math.sin(x * 0.09 + v * 0.05 + fbm(x * 0.01, v * 0.01, 905) * 7) * 0.9 * (z.reef + z.base);
  const dt = Math.abs(x - tX9(v)), tw = tW9(v);
  h -= Math.max(0, 1 - dt / (tw * 1.3)) * 70 * z.deep;
  h = lerp(h, 6 + fbm(x * 0.02, v * 0.02, 906) * 5, z.base * 0.75);
  return h;
};
const C9 = (x, v, h, s) => {
  const z = Z9(v);
  let c = mixC([132, 168, 150], [176, 192, 160], vnoise(x * 0.03, v * 0.03, 903));
  c = mixC(c, mixC([40, 112, 88], [62, 138, 96], vnoise(x * 0.08, v * 0.08, 907)), smooth(0.56, 0.68, fbm(x * 0.01, v * 0.01, 904)) * z.reef);
  c = mixC(c, mixC([36, 66, 82], [52, 86, 96], fbm(x * 0.02, v * 0.02, 908)), z.deep);
  c = mixC(c, mixC([70, 92, 100], [92, 112, 116], vnoise(x * 0.04, v * 0.04, 909)), z.base);
  c = mixC(c, [64, 84, 92], clamp((s - 0.45) * 2.2, 0, 1) * 0.8);
  const dt = Math.abs(x - tX9(v)), tw = tW9(v);
  if (z.deep > 0.05) c = mixC(c, [6, 22, 40], clamp(1 - (dt - tw / 2) / 26, 0, 1) * z.deep);
  const depth = clamp(1 - h / 34, 0, 1) * 0.3 + z.deep * 0.3 + 0.12;
  return mixC(c, [8, 54, 86], depth);
};
function coral(g, x, y, r, kind, col, seed) {
  const C = col;
  if (kind === 0) { // 分枝珊瑚
    g.lineCap = 'round';
    const br = (bx, by, a, L, w, d) => {
      const ex = bx + Math.cos(a) * L, ey = by + Math.sin(a) * L;
      g.strokeStyle = rgb(C, 0.65 + d * 0.12); g.lineWidth = w; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
      if (d < 3) for (const k of [-1, 1]) br(ex, ey, a + k * (0.45 + hash(d, k, seed) * 0.4), L * 0.7, w * 0.7, d + 1);
      else { g.fillStyle = rgb(C, 1.35); g.beginPath(); g.arc(ex, ey, w * 0.7, 0, TAU); g.fill(); }
    };
    g.fillStyle = 'rgba(0,20,30,.3)'; g.beginPath(); g.arc(x + 3, y + 4, r * 0.8, 0, TAU); g.fill();
    for (let k = 0; k < 5; k++) br(x, y, k / 5 * TAU + seed, r * 0.42, r * 0.16, 0);
  } else if (kind === 1) { // 腦珊瑚
    g.fillStyle = 'rgba(0,20,30,.3)'; g.beginPath(); g.arc(x + 3, y + 4, r, 0, TAU); g.fill();
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r); gr.addColorStop(0, rgb(C, 1.4)); gr.addColorStop(1, rgb(C, 0.7));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = rgb(C, 0.55); g.lineWidth = 0.8;
    for (let k = 0; k < 6; k++) { g.beginPath(); const a0 = hash(k, seed, 1) * TAU; for (let i = 0; i < 6; i++) { const rr2 = r * (0.2 + i * 0.13), a = a0 + Math.sin(i * 1.7 + k) * 0.6; i ? g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2) : g.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.stroke(); }
  } else if (kind === 2) { // 桌形珊瑚
    g.fillStyle = 'rgba(0,20,30,.35)'; g.beginPath(); g.ellipse(x + 4, y + 5, r * 1.2, r, 0.3, 0, TAU); g.fill();
    g.fillStyle = rgb(C, 0.9); g.beginPath(); g.ellipse(x, y, r * 1.2, r, 0.3, 0, TAU); g.fill();
    g.strokeStyle = rgb(C, 1.35); g.lineWidth = 0.7;
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 0.9); g.stroke(); }
    g.fillStyle = rgb(C, 1.5); g.beginPath(); g.arc(x - r * 0.2, y - r * 0.2, r * 0.25, 0, TAU); g.fill();
  } else if (kind === 3) { // 海葵
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + seed, L = r * (0.8 + hash(k, seed, 2) * 0.4); g.strokeStyle = rgb(C, 1.1); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * L * 0.6, y + Math.sin(a + 0.4) * L * 0.6, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); g.fillStyle = rgb(C, 1.6); g.beginPath(); g.arc(x + Math.cos(a) * L, y + Math.sin(a) * L, 1.1, 0, TAU); g.fill(); }
    g.fillStyle = rgb(C, 0.6); g.beginPath(); g.arc(x, y, r * 0.25, 0, TAU); g.fill();
  } else { // 管狀海綿
    for (let k = 0; k < 5; k++) { const px = x + (hash(k, seed, 3) - 0.5) * r * 1.4, py = y + (hash(seed, k, 3) - 0.5) * r * 1.4, rr2 = r * (0.22 + hash(k, k, seed) * 0.15);
      g.fillStyle = 'rgba(0,20,30,.3)'; g.beginPath(); g.arc(px + 2, py + 3, rr2, 0, TAU); g.fill();
      g.fillStyle = rgb(C, 1.1); g.beginPath(); g.arc(px, py, rr2, 0, TAU); g.fill(); g.fillStyle = rgb(C, 0.45); g.beginPath(); g.arc(px, py, rr2 * 0.55, 0, TAU); g.fill(); }
  }
}
function kelp(g, x, y, L, seed) {
  g.lineCap = 'round';
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([x + Math.sin(t * 4 + seed) * 7 * t + t * 10, y + t * L]); }
  const path = (o) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0] + o, p[1] + o) : g.moveTo(p[0] + o, p[1] + o)); };
  path(3); g.strokeStyle = 'rgba(0,20,30,.25)'; g.lineWidth = 4; g.stroke();
  path(0); g.strokeStyle = '#4a6a2a'; g.lineWidth = 3; g.stroke(); g.strokeStyle = '#8aa848'; g.lineWidth = 1; g.stroke();
  for (let i = 2; i < 10; i += 2) { const [px, py] = pts[i], s = i % 4 ? 1 : -1; g.fillStyle = i % 4 ? '#6a8a36' : '#5a7a2e'; g.beginPath(); g.ellipse(px + s * 4, py, 4.5, 2, s * 0.6, 0, TAU); g.fill(); }
}
function glassDome(g, x, y, r) {
  g.fillStyle = 'rgba(0,15,25,.4)'; g.beginPath(); g.arc(x + r * 0.4, y + r * 0.5, r, 0, TAU); g.fill();
  g.fillStyle = '#5a6a72'; g.beginPath(); g.arc(x, y, r + 1.5, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.05, x, y, r); gr.addColorStop(0, 'rgba(220,255,255,.95)'); gr.addColorStop(0.4, 'rgba(90,200,220,.85)'); gr.addColorStop(1, 'rgba(10,60,90,.95)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(200,230,240,.45)'; g.lineWidth = 0.6;
  for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x, y, r * (0.25 + k * 0.25), r, 0, 0, TAU); g.stroke(); }
  g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.stroke();
}
PAINT.push({ H: H9, C: C9, k: 1.5, d: (g, v0, v1, sp) => {
  grain(g, v0, v1, 911, 0.05);
  // 沙紋
  g.lineWidth = 0.9;
  cells(22, 14, v0, v1, 10, (i, j, x, v) => {
    const z = Z9(v); if (z.deep > 0.5 || hash(i, j, 912) < 0.35) return;
    const a = hash(i, j, 913) * 0.4 - 0.2;
    g.strokeStyle = 'rgba(255,255,240,.13)'; g.beginPath(); g.ellipse(x + 11, v + 7, 9, 2.4, a, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.strokeStyle = 'rgba(0,30,50,.12)'; g.beginPath(); g.ellipse(x + 11, v + 8.4, 9, 2.4, a, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  });
  // 岩石
  cells(60, 60, v0, v1, 20, (i, j, x, v) => {
    if (hash(i, j, 914) < 0.7 || trench9(x + 30, v + 30)) return;
    for (let k = 0; k < 3; k++) {
      const rx = x + hash(k, i, j) * 60, rv = v + hash(j, k, i) * 60, r = 4 + hash(i + k, j, 915) * 8;
      g.fillStyle = 'rgba(0,20,30,.35)'; g.beginPath(); g.ellipse(rx + 3, rv + 4, r, r * 0.8, 0, 0, TAU); g.fill();
      const gr = g.createRadialGradient(rx - r * 0.4, rv - r * 0.4, 0, rx, rv, r); gr.addColorStop(0, '#9ab0a8'); gr.addColorStop(1, '#3e5258');
      g.fillStyle = gr; g.beginPath(); g.ellipse(rx, rv, r, r * 0.8, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(90,160,90,.5)'; g.beginPath(); g.arc(rx - r * 0.3, rv - r * 0.3, r * 0.4, 0, TAU); g.fill();
    }
  });
  // 珊瑚礁
  const CORALS = [[206, 92, 110], [220, 136, 70], [168, 90, 180], [214, 184, 90], [84, 176, 180], [210, 110, 150]];
  cells(58, 58, v0, v1, 30, (i, j, x, v) => {
    const z = Z9(v + 29);
    if (hash(i, j, 916) > z.reef * 0.42 + z.deep * 0.06) return;
    const n = 1 + ((hash(i, j, 917) * 4) | 0);
    for (let k = 0; k < n; k++) {
      const cx = x + hash(k, i, j * 3) * 58, cv = v + hash(j, k, i * 7) * 58;
      if (trench9(cx, cv)) continue;
      coral(g, cx, cv, 5 + hash(i + k, j, 918) * 8, (hash(k, j, i + 2) * 5) | 0, pick2(CORALS, i * 7 + k, j), hash(k, i, 919) * 6);
    }
  });
  // 海帶
  cells(80, 110, v0, v1, 100, (i, j, x, v) => {
    const z = Z9(v); if (hash(i, j, 920) > 0.35 * z.reef + 0.25 * z.deep) return;
    for (let k = 0; k < 3; k++) { const kx = x + hash(k, i, j) * 70, kv = v + hash(i, k, j) * 50; if (!trench9(kx, kv)) kelp(g, kx, kv, 50 + hash(k, k, j) * 50, hash(i, j, k) * 6); }
  });
  // 深海：熱泉、管蟲、發光生物、沉船
  cells(110, 150, v0, v1, 60, (i, j, x, v) => {
    const cx = x + 20 + hash(i, j, 921) * 70, cv = v + 30 + hash(i, j, 922) * 90, z = Z9(cv);
    if (z.deep < 0.4 || trench9(cx, cv) || Math.abs(cx - tX9(cv)) < tW9(cv) / 2 + 24 || hash(i, j, 923) < 0.35) return;
    g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, cx, cv, 26, 'rgba(255,120,30,.35)'); g.restore();
    for (let k = 0; k < 3; k++) { g.fillStyle = k ? '#2a2420' : 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(cx + (k ? 0 : 3), cv + (k ? -k * 3 : 4), 9 - k * 2.5, 0, TAU); g.fill(); }
    glowDotT(g, cx, cv - 6, 6, 'rgba(255,200,90,.95)');
    for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(210,220,230,${0.16 - k * 0.02})`; g.beginPath(); g.arc(cx + Math.sin(k) * 4 + k * 2, cv - 10 - k * 9, 5 + k * 2.4, 0, TAU); g.fill(); }
    for (let k = 0; k < 9; k++) { const a = hash(k, i, j) * TAU, r = 12 + hash(j, k, i) * 9, tx2 = cx + Math.cos(a) * r, tv = cv + Math.sin(a) * r; g.strokeStyle = '#e8e4d8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(tx2, tv); g.lineTo(tx2 + 1, tv - 4); g.stroke(); g.fillStyle = '#e02a2a'; g.beginPath(); g.arc(tx2 + 1, tv - 4.5, 1.4, 0, TAU); g.fill(); }
  });
  g.save(); g.globalCompositeOperation = 'lighter';
  cells(26, 26, v0, v1, 10, (i, j, x, v) => {
    const z = Z9(v); if (hash(i, j, 924) > z.deep * 0.5 + z.base * 0.12) return;
    glowDotT(g, x + hash(i, j, 925) * 26, v + hash(j, i, 925) * 26, 2 + hash(i, j, 926) * 3, hash(i, j, 927) > 0.5 ? 'rgba(80,240,255,.8)' : 'rgba(200,110,255,.75)');
  });
  for (let v = Math.floor(v0 / 18) * 18; v < v1; v += 18) {
    if (Z9(v).deep < 0.4) continue;
    for (const s of [-1, 1]) glowDotT(g, tX9(v) + s * (tW9(v) / 2 + 2), v + (s > 0 ? 9 : 0), 3, 'rgba(60,230,255,.7)');
  }
  g.restore();
  cells(300, 820, v0, v1, 200, (i, j, x, v) => {
    const cx = x + 60 + hash(i, j, 928) * 180, cv = v + 200 + hash(i, j, 929) * 400;
    if (Z9(cv).deep < 0.5 || hash(i, j, 930) < 0.5 || Math.abs(cx - tX9(cv)) < 90) return;
    g.save(); g.translate(cx, cv); g.rotate(hash(i, j, 931) * 1.2 - 0.6);
    g.fillStyle = 'rgba(0,10,20,.45)'; g.beginPath(); g.ellipse(6, 8, 22, 70, 0, 0, TAU); g.fill();
    const gr = g.createLinearGradient(-20, 0, 20, 0); gr.addColorStop(0, '#3a2a22'); gr.addColorStop(0.5, '#7a5a40'); gr.addColorStop(1, '#3a2a22');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -72); g.quadraticCurveTo(22, -40, 20, 30); g.lineTo(16, 66); g.lineTo(-16, 66); g.lineTo(-20, 30); g.quadraticCurveTo(-22, -40, 0, -72); g.fill();
    g.fillStyle = 'rgba(30,20,16,.85)'; g.fillRect(-12, -30, 24, 70);
    g.strokeStyle = 'rgba(160,110,70,.6)'; g.lineWidth = 1; for (let k = -28; k < 40; k += 8) { g.beginPath(); g.moveTo(-12, k); g.lineTo(12, k); g.stroke(); }
    g.fillStyle = '#5a463a'; g.fillRect(-8, -10, 16, 22); g.fillStyle = 'rgba(80,140,80,.5)'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(hash(k, 1, j) * 30 - 15, hash(k, 2, j) * 120 - 60, 3, 0, TAU); g.fill(); }
    g.restore();
  });
  // 海底基地：管線、玻璃圓頂、六角平台、探照燈
  for (const px of [52, 308]) {
    for (let v = Math.floor(v0 / 6) * 6; v < v1; v += 6) {
      if (Z9(v).base < 0.5) continue;
      g.fillStyle = 'rgba(0,15,25,.35)'; g.fillRect(px + 4, v, 14, 6.5);
      const gr = g.createLinearGradient(px - 7, 0, px + 7, 0); gr.addColorStop(0, '#4a5a62'); gr.addColorStop(0.45, '#b8c8cc'); gr.addColorStop(1, '#3a4a52');
      g.fillStyle = gr; g.fillRect(px - 7, v, 14, 6.5);
      if (((v / 6) | 0) % 9 === 0) { g.fillStyle = '#2a363c'; g.fillRect(px - 9, v, 18, 3); glowDotT(g, px, v + 1, 4, 'rgba(80,230,255,.8)'); }
    }
  }
  cells(170, 210, v0, v1, 60, (i, j, x, v) => {
    const cx = x + 40 + hash(i, j, 932) * 90, cv = v + 40 + hash(i, j, 933) * 130, z = Z9(cv);
    if (z.base < 0.5 || cx < 70 || cx > W - 70) return;
    const hex = (r) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; k ? g.lineTo(cx + Math.cos(a) * r, cv + Math.sin(a) * r * 0.9) : g.moveTo(cx + Math.cos(a) * r, cv + Math.sin(a) * r * 0.9); } g.closePath(); };
    g.save(); g.translate(5, 7); hex(40); g.fillStyle = 'rgba(0,10,20,.45)'; g.fill(); g.restore();
    hex(40); const gr = g.createLinearGradient(cx - 40, cv - 40, cx + 40, cv + 40); gr.addColorStop(0, '#9aaab0'); gr.addColorStop(1, '#4a5a62'); g.fillStyle = gr; g.fill();
    g.strokeStyle = '#e0b030'; g.lineWidth = 1.4; g.setLineDash([4, 3]); hex(35); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.7; for (let k = -30; k < 32; k += 10) { g.beginPath(); g.moveTo(cx + k, cv - 30); g.lineTo(cx + k, cv + 30); g.stroke(); }
    const kind = hash(i, j, 934);
    if (kind < 0.55) { glassDome(g, cx - 12, cv - 6, 13); glassDome(g, cx + 16, cv + 10, 8); }
    else { glassDome(g, cx, cv, 18); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; glowDotT(g, cx + Math.cos(a) * 38, cv + Math.sin(a) * 34, 4, k % 2 ? 'rgba(255,220,120,.9)' : 'rgba(80,230,255,.9)'); }
    g.strokeStyle = '#6a7a80'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 40, cv); g.lineTo(cx - 90, cv + 20); g.stroke(); g.strokeStyle = '#a8b8bc'; g.lineWidth = 2; g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, cx + 30, cv - 34, 24, 'rgba(160,240,255,.22)'); g.restore();
    if (cv >= v0 && cv < v1 && j < -3 && kind > 0.3) sp.push({ type: 'hatch', x: cx + (kind < 0.55 ? 22 : 0), v: cv + (kind < 0.55 ? -18 : 26) });
  });
  // 淺海也有零星的魚雷艙
  cells(120, 190, v0, v1, 0, (i, j, x, v) => {
    if (j > -4 || hash(i, j, 935) < 0.84) return;
    const cx = x + 30 + hash(i, j, 936) * 60, cv = v + 40 + hash(i, j, 937) * 110;
    if (cx < 34 || cx > W - 34 || cv < v0 || cv >= v1 || Z9(cv).base > 0.4 || trench9(cx, cv) || Math.abs(cx - tX9(cv)) < tW9(cv) / 2 + 20) return;
    g.fillStyle = 'rgba(0,20,30,.35)'; g.beginPath(); g.arc(cx, cv, 20, 0, TAU); g.fill();
    sp.push({ type: 'hatch', x: cx, v: cv });
  });
} });
WATER.push(trench9);
ROADX.push(null);

// ================= 環境：水底光紋、光柱、氣泡、魚群 =================
AMB2.sea = {
  tex: null, tex2: null,
  update(dt) {
    const A = G.amb;
    while (A.filter(p => p.k === 'b').length < 34) A.push({ k: 'b', x: rnd(W), y: rnd(H, H + 400), r: rnd(0.8, 3), vy: -rnd(30, 80), ph: rnd(TAU) });
    if (!A.some(p => p.k === 'f') && Math.random() < dt * 0.25) {
      const dir = Math.random() < 0.5 ? 1 : -1, y0 = rnd(80, H - 120), n = 7 + (Math.random() * 8 | 0);
      for (let i = 0; i < n; i++) A.push({ k: 'f', x: dir > 0 ? -20 - rnd(60) : W + 20 + rnd(60), y: y0 + rnd(-30, 30), vx: dir * rnd(48, 60), ph: rnd(TAU), s: rnd(0.7, 1.2) });
    }
    for (const p of A) {
      p.ph += dt * 3;
      if (p.k === 'b') { p.y += (p.vy + G.speed * 0.4) * dt; p.x += Math.sin(p.ph) * 10 * dt; if (p.y < -10) { p.y = H + rnd(10, 200); p.x = rnd(W); } }
      else if (p.k === 'f') { p.x += p.vx * dt; p.y += (G.speed * 0.6 + Math.sin(p.ph) * 6) * dt; if (p.x < -100 || p.x > W + 100) p.dead = true; }
    }
    G.amb = A.filter(p => !p.dead);
  },
  under(ctx) {
    if (!this.tex) { this.tex = makeCaustic(128, 12, 941); this.tex2 = makeCaustic(128, 9, 942); }
    const z = Z9(-G.scroll - H / 2), k = 0.75 - z.deep * 0.45;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [tx, sc, a, sp] of [[this.tex, 1.25, 0.14, 0.6], [this.tex2, 0.9, 0.1, -0.45]]) {
      const s = 128 * sc, ox = (G.t * 9 * sp) % s, oy = ((G.scroll * 0.92 + G.t * 6) % s);
      ctx.globalAlpha = a * k;
      for (let y = oy - s; y < H; y += s) for (let x = ox - s; x < W; x += s) ctx.drawImage(tx, x, y, s, s);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    for (const p of G.amb) if (p.k === 'f') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.vx > 0 ? p.s : -p.s, p.s);
      ctx.fillStyle = 'rgba(10,40,60,.38)'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.4, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-10, -3 + Math.sin(p.ph * 3) * 1.5); ctx.lineTo(-10, 3 + Math.sin(p.ph * 3) * 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(190,240,255,.35)'; ctx.fillRect(-2, -1.6, 6, 0.8);
      ctx.restore();
    }
    ctx.restore();
  },
  draw(ctx) {
    const z = Z9(-G.scroll - H / 2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 95 + Math.sin(G.t * 0.3 + i * 1.7) * 30, w = 26 + i % 2 * 22;
      const gr = ctx.createLinearGradient(x, 0, x - 120, H); gr.addColorStop(0, `rgba(150,230,255,${0.1 * (1 - z.deep * 0.7)})`); gr.addColorStop(1, 'rgba(150,230,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w - 160, H); ctx.lineTo(x - 160, H); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(200,240,255,.55)'; ctx.lineWidth = 0.8;
    for (const p of G.amb) if (p.k === 'b') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke(); if (p.r > 1.8) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(p.x - p.r * 0.4, p.y - p.r * 0.5, 1, 1); } }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, 'rgba(0,20,40,0)'); vg.addColorStop(1, `rgba(0,20,40,${0.35 + z.deep * 0.25})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },
};

// ================= 敵人 =================
SPR.manta = { w: 44, h: 34, draw(g) { P_(g, [0, 14, 20, -4, 18, -8, 4, -6, 0, -16, -4, -6, -18, -8, -20, -4], '#2a4a5a'); P_(g, [0, 10, 6, -2, 0, -10, -6, -2], '#8ae8ff'); } };
SPR.jelly = { w: 28, h: 28, draw(g) { circ(g, 0, 0, 11, rad(g, -3, -3, 12, ['rgba(255,220,255,.95)', 'rgba(220,100,255,.7)', 'rgba(100,20,160,.6)'])); circ(g, 0, 0, 4, '#fff'); } };
SPR.hatch = { w: 34, h: 34, draw(g) { const o = []; for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + TAU / 16; o.push(Math.cos(a) * 16, Math.sin(a) * 16); } P_(g, o, '#4a5a62'); circ(g, 0, 0, 10, '#1a2428'); } };
SPR.torpTur = { w: 26, h: 26, draw(g) { circ(g, 0, 0, 8, '#8a9aa2'); rr(g, -6, 0, 4, 12, 1, '#2a3238'); rr(g, 2, 0, 4, 12, 1, '#2a3238'); } };
SPR.sub9 = { w: 60, h: 190, draw(g) { rr(g, -20, -90, 40, 180, 20, '#2a3a46'); rr(g, -8, -30, 16, 40, 5, '#3a4a56'); } };
Object.assign(ET, {
  manta: { hp: 4, r: 14, score: 350, spr: 'manta', hb: [[0, 0, 12], [-12, -2, 8], [12, -2, 8]],
    init(e, o) { e.x0 = e.x; e.dir = o.dir || 1; e.amp = o.amp ?? 90; e.vy = o.vy || 120; e.ph = o.ph || 0; },
    update(e, dt) {
      const px = e.x;
      e.x = e.x0 + Math.sin(e.t * 1.7 + e.ph) * e.amp * e.dir;
      const vx = (e.x - px) / Math.max(dt, 1e-4);
      e.ang = turnTo(e.ang, Math.atan2(e.vy, vx) - Math.PI / 2, 6 * dt);
      if (!e.fired && e.t > 0.9) { e.fired = true; if (canShoot(e) && Math.random() < G.d.shotChance + 0.2) fan(e.x, e.y + 8, aim(e.x, e.y), 2, 0.25, 160); }
    },
    draw(ctx, e) {
      const f = 1 + Math.sin(e.t * 7) * 0.09;
      spr(ctx, e, 'manta', e.ang, f, 1);
      glowDot(ctx, e.x - Math.sin(e.ang) * 0 - Math.cos(e.ang + Math.PI / 2) * 13, e.y - Math.sin(e.ang + Math.PI / 2) * 13, 6, 'rgba(90,230,255,.7)');
    },
  },
  jelly: { hp: 7, r: 12, score: 500, spr: 'jelly',
    init(e, o) { e.x0 = e.x; e.ph = rnd(TAU); e.ft = rnd(1, 2); e.vy = 30; },
    update(e, dt) {
      const pulse = Math.max(0, Math.sin(e.t * 3 + e.ph));
      e.vy = 22 + pulse * 70; e.x = e.x0 + Math.sin(e.t * 0.8 + e.ph) * 26;
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 2.6; if (canShoot(e)) { const n = G.d.dens >= 1 ? 8 : 6, a0 = rnd(TAU); for (let i = 0; i < n; i++) eShot2(e.x, e.y, a0 + i * TAU / n, 62, 'ink', { acc: 30, vmax: 120 }); Snd.play('eshot'); } }
      if (e.y > H + 40) e.gone = true;
    },
    shadow() { },
    draw(ctx, e) {
      const p = Math.sin(e.t * 3 + e.ph), sx = 1 + p * 0.08, sy = 1 - p * 0.1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        const bx = e.x + (k - 2.5) * 3.4 * sx;
        ctx.strokeStyle = `rgba(${k % 2 ? 220 : 120},${k % 2 ? 130 : 220},255,.55)`; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(bx, e.y - 4);
        for (let s = 1; s <= 6; s++) ctx.lineTo(bx + Math.sin(e.t * 4 + s * 0.9 + k) * (2 + s * 0.8), e.y - 4 - s * 4.5 * (1.1 - p * 0.2));
        ctx.stroke();
      }
      ctx.restore();
      glowDot(ctx, e.x, e.y, 22, 'rgba(220,120,255,.35)');
      spr(ctx, e, 'jelly', 0, sx, sy);
      glowDot(ctx, e.x, e.y + 1, 6 + p * 2, 'rgba(255,240,255,.8)');
    },
  },
  hatch: { hp: 14, r: 13, score: 600, ground: true, medal: 0.6,
    init(e) { e.inv = true; e.open = 0; e.tur = Math.PI / 2; e.ft = 1.2; },
    update(e, dt) {
      e.tur = turnTo(e.tur, aim(e.x, e.y), 2.5 * dt);
      if (e.y > 70 && e.y < H - 140) e.open = Math.min(1, e.open + dt * 1.6); else if (e.y >= H - 140) e.open = Math.max(0, e.open - dt * 1.2);
      e.inv = e.open < 0.6;
      if (e.inv) return;
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 2.8; if (canShoot(e)) { for (const s of [-1, 1]) eShot(e.x + Math.cos(e.tur + s * 1.2) * 6, e.y + Math.sin(e.tur + s * 1.2) * 6, e.tur + s * 0.35, 105, 'm'); Snd.play('missile'); } }
    },
    draw(ctx, e) {
      Art.draw(ctx, 'hatch', e.x, e.y);
      const o = e.open, gap = o * 11;
      ctx.fillStyle = '#1a2428'; ctx.beginPath(); ctx.arc(e.x, e.y, 10.5, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(e.x, e.y, 11, 0, TAU); ctx.clip();
      for (const s of [-1, 1]) { const gr = ctx.createLinearGradient(e.x - 11, 0, e.x + 11, 0); gr.addColorStop(0, '#6a7a80'); gr.addColorStop(1, '#3a4a50'); ctx.fillStyle = gr; ctx.fillRect(e.x + (s < 0 ? -11 - gap : gap), e.y - 11, 11, 22); ctx.fillStyle = '#e0b030'; ctx.fillRect(e.x + (s < 0 ? -2 - gap : gap), e.y - 11, 2, 22); }
      ctx.restore();
      if (o > 0.3) { spr(ctx, e, 'torpTur', e.tur - Math.PI / 2, 0.5 + o * 0.5, 0.5 + o * 0.5); glowDot(ctx, e.x, e.y, 8, 'rgba(255,90,60,.5)'); }
    },
  },
  sub9: { hp: 380, r: 26, score: 9000, big: 1, drop: ['P', 'S'], hb: [[0, -62, 16], [0, -26, 22], [0, 14, 22], [0, 54, 17]],
    init(e) { e.vy = 60; e.ft = 1.5; e.tb = 2.4; e.tc = 3.5; e.tur = [Math.PI / 2, Math.PI / 2]; e.ang = 0; },
    update(e, dt) {
      e.tur = e.tur.map((a, i) => turnTo(a, aim(e.x, e.y + (i ? 40 : -50)), 2.4 * dt));
      if (e.st === undefined) { e.vy = Math.max(14, (150 - e.y) * 1.3); if (e.y >= 146) { e.st = 0; e.x0 = e.x; e.vy = 0; } return; }
      e.st += dt; e.vy = e.st > 18 ? 70 : 0;
      e.x = e.x0 + Math.sin(e.st * 0.45) * 70; e.ang = Math.cos(e.st * 0.45) * 0.12;
      if (!canShoot(e) || e.st > 18) return;
      const f = dt * G.d.fr;
      e.ft -= f; if (e.ft <= 0) { e.ft = 1.3; fan(e.x, e.y - 50, e.tur[0], 3, 0.3, 150); fan(e.x, e.y + 40, e.tur[1], 3, 0.3, 150); }
      e.tb -= f; if (e.tb <= 0) { e.tb = 3.6; for (let k = 0; k < 4; k++) G.queue.push({ t: G.st + k * 0.18, fn: () => { if (!e.dead && canShoot(e)) { const s = k % 2 ? 1 : -1; eShot(e.x + s * 10, e.y - 10 + k * 8, Math.PI / 2 + s * 1.1, 95, 'm'); Snd.play('missile'); } } }); }
      e.tc -= f; if (e.tc <= 0) { e.tc = 4.2; const a0 = rnd(TAU); for (let i = 0; i < 12; i++) eShot2(e.x, e.y + 70, a0 + i * TAU / 12, 70, 'ink', { acc: 40, vmax: 140 }); Snd.play('eshot'); }
    },
    shadow(ctx, e) { Art.shadow(ctx, 'sub9', e.x, e.y, e.ang, 0.9); },
    draw(ctx, e) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(200,240,255,.25)'; ctx.beginPath(); ctx.arc(e.x + Math.sin(e.t * 5 + k) * 5, e.y - 96 - k * 8 - (e.t * 30 % 8), 2 + k * 0.6, 0, TAU); ctx.fill(); }
      ctx.restore();
      spr(ctx, e, 'sub9', e.ang);
      const s = Math.sin(e.ang), c = Math.cos(e.ang);
      Art.draw(ctx, 'gunTur', e.x - s * -50, e.y - 50 * c, e.tur[0] - Math.PI / 2, 1, 1.1, 1.1);
      Art.draw(ctx, 'gunTur', e.x - s * 40, e.y + 40 * c, e.tur[1] - Math.PI / 2, 1, 1.1, 1.1);
      for (let k = 0; k < 4; k++) if ((Math.floor(e.t * 4) + k) % 4 === 0) glowDot(ctx, e.x + (k % 2 ? 7 : -7), e.y - 8 + (k >> 1) * 12, 5, 'rgba(255,80,60,.9)');
    },
  },
});

// ================= 頭目 9：深淵海妖 =================
SPR.k9body = { w: 190, h: 190, draw(g) { P_(g, [0, -92, 40, -50, 50, 10, 34, 50, -34, 50, -50, 10, -40, -50], '#2a3a4a'); circ(g, 0, 26, 16, '#1a0a14'); } };
SPR.k9seg = { w: 22, h: 22, draw(g) { circ(g, 0, 0, 9, rad(g, -2, -2, 10, ['#6a8a9a', '#2a3a4a', '#121a22'])); circ(g, 0, 2, 2.5, '#5ff0ff'); } };
SPR.k9tip = { w: 24, h: 34, draw(g) { P_(g, [0, 16, 8, -4, 4, -14, -4, -14, -8, -4], '#3a4a5a'); circ(g, 0, 2, 3, '#ff4a8a'); } };
function k9Tents(e) {
  const T = [];
  const angs = [0.12, 0.3, 0.44, 0.56, 0.7, 0.88].map(k => Math.PI * k);
  angs.forEach((a, i) => T.push({ a, ph: i * 1.3, side: Math.cos(a) < 0 ? -1 : 1, lash: null, segs: [] }));
  e.tents = T;
}
function k9Update(e, dt) {
  const N = 13, wave = e.ph >= 3 ? 2.6 : 1.7;
  for (const tn of e.tents) {
    const ax = e.x + Math.cos(tn.a) * 40, ay = e.y + 8 + Math.sin(tn.a) * 34;
    const L = tn.lash; let ang = tn.a, x = ax, y = ay;
    const segs = [];
    if (L) {
      L.t += dt;
      const k = L.t < L.warn ? 0.6 + 0.1 * Math.sin(L.t * 30) : L.t < L.warn + 0.12 ? lerp(0.6, 3.2, (L.t - L.warn) / 0.12) : L.t < L.warn + 0.62 ? 3.2 : Math.max(1, 3.2 - (L.t - L.warn - 0.62) * 5);
      for (let j = 0; j < N; j++) {
        const curl = L.t < L.warn ? Math.sin(G.t * 9 + j) * 0.05 : Math.sin(G.t * 14 + j * 0.8) * 0.02;
        const a = lerp(tn.a, L.ang, Math.min(1, L.t / 0.35)) + curl * (j + 1);
        const len = 11.5 * (1 - j / N * 0.45) * k;
        x += Math.cos(a) * len; y += Math.sin(a) * len;
        segs.push([x, y, a, 1 - j / N * 0.55]);
      }
      if (L.t > L.warn + 1.3) tn.lash = null;
      L.hot = L.t > L.warn + 0.05 && L.t < L.warn + 0.7;
    } else {
      for (let j = 0; j < N; j++) {
        ang += Math.sin(G.t * wave + j * 0.42 + tn.ph) * 0.15 + tn.side * 0.02 * (e.ph >= 2 ? 1.6 : 1);
        const len = 11.5 * (1 - j / N * 0.45);
        x += Math.cos(ang) * len; y += Math.sin(ang) * len;
        segs.push([x, y, ang, 1 - j / N * 0.55]);
      }
    }
    tn.segs = segs;
    tn.ax = ax; tn.ay = ay;
  }
}
ET.boss9 = { name: '深淵海妖', en: 'ABYSSAL KRAKEN', hp: 3800, r: 40, score: 350000, boss: true, layer: 'air', hb: [[0, -14, 46], [0, 30, 24]], marks: [0.66, 0.33],
  init(e) { bossBase(e); e.y = -190; e.ph = 1; e.ti = 0; e.td = 3; e.te = 2; k9Tents(e); },
  update(e, dt) {
    k9Update(e, dt);
    if (bossEnter(e, dt, 140, 60)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.38) * 44; e.y = 140 + Math.sin(e.mt * 0.85) * 10;
    const f0 = e.hp / e.maxhp, ph = f0 > 0.66 ? 1 : f0 > 0.33 ? 2 : 3;
    if (ph !== e.ph) {
      e.ph = ph; G.shake = 10; G.eb.length = 0;
      for (let i = 0; i < 5; i++) G.queue.push({ t: G.st + i * 0.12, fn: () => boom(e.x + rnd(-60, 60), e.y + rnd(-40, 40), 1.4) });
      popText(e.x, e.y + 70, ph === 2 ? '海妖之眼睜開了！' : '深淵的怒吼！', '#ff5a8a');
    }
    // 甩打的觸手會打到玩家
    for (const tn of e.tents) if (tn.lash && tn.lash.hot && P.alive) for (const [sx, sy, , sc] of tn.segs) if (d2(sx, sy, P.x, P.y) < (8 * sc + 3) ** 2) { playerHit(); break; }
    if (Math.random() < 0.05 * ph) fxP({ k: 's', x: e.x + rnd(-50, 50), y: e.y + rnd(-60, 20), vx: 0, vy: -40, r: rnd(3, 6), life: 0, max: 1, a: 0.25 });
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    // 觸手尖端輪流開火
    e.ta -= f;
    if (e.ta <= 0) {
      e.ta = ph === 1 ? 0.42 : ph === 2 ? 0.6 : 0.5;
      e.ti = (e.ti + 1) % 6; const tn = e.tents[e.ti];
      if (!tn.lash && tn.segs.length) { const [tx, ty] = tn.segs[tn.segs.length - 1]; if (ty > 0 && ty < H - 160) { if (ph === 1) fan(tx, ty, aim(tx, ty), 2, 0.2, 150); else eShot(tx, ty, aim(tx, ty), 165, 'c'); } }
    }
    if (ph === 1) {
      e.tb -= f; if (e.tb <= 0) { e.tb = 2.6; const n = Math.round(14 * G.d.dens); for (let i = 0; i < n; i++) eShot2(e.x, e.y + 30, e.mt + i * TAU / n, 70, 'ink', { acc: 35, vmax: 130 }); Snd.play('eshot'); }
    } else {
      // 漩渦：彎曲的子彈
      e.tc -= f;
      if (e.tc <= 0) {
        e.tc = ph === 3 ? 0.1 : 0.14; e.sa += 0.43;
        const arms = ph === 3 ? 3 : 2;
        for (let k = 0; k < arms; k++) eShot2(e.x, e.y + 26, e.sa + k * TAU / arms, 100, 's', { av: ph === 3 && (e.sa * 10 | 0) % 2 ? -0.8 : 0.8 });
      }
      // 觸手甩打
      e.td -= f;
      if (e.td <= 0 && G.d.beams) {
        e.td = ph === 3 ? 2.6 : 3.4;
        const free = e.tents.filter(t => !t.lash), picks = [];
        if (free.length) {
          const near = free.slice().sort((a, b) => Math.abs(a.a - aim(e.x, e.y)) - Math.abs(b.a - aim(e.x, e.y)));
          picks.push(near[0]); if (ph === 3 && near[1]) picks.push(near[near.length - 1]);
        }
        picks.forEach((tn, i) => { const ax = e.x + Math.cos(tn.a) * 40, ay = e.y + 8 + Math.sin(tn.a) * 34; tn.lash = { t: 0, warn: 0.85, ang: Math.atan2(P.y - ay, P.x + (i ? rnd(-60, 60) : 0) - ax) }; });
        Snd.play('warn');
      } else if (e.td <= 0) { e.td = 3; ring(e.x, e.y + 30, 12, 80, e.mt, 'b'); }
      if (ph === 3) { e.te -= f; if (e.te <= 0) { e.te = 3.8; for (const s of [-1, 1]) eShot(e.x + s * 50, e.y - 30, Math.PI / 2 + s * 0.9, 100, 'm'); Snd.play('missile'); } }
    }
  },
  shadow(ctx, e) { Art.shadow(ctx, 'k9body', e.x, e.y, 0, 0.85); },
  draw(ctx, e) {
    const x = e.x, y = e.y, ph = e.ph || 1;
    // 觸手（警告線 → 身體）
    for (const tn of e.tents) {
      if (tn.lash && tn.lash.t < tn.lash.warn) {
        const a = tn.lash.ang, al = 0.4 + 0.4 * Math.sin(tn.lash.t * 30);
        ctx.save(); ctx.strokeStyle = `rgba(255,70,120,${al})`; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(tn.ax, tn.ay); ctx.lineTo(tn.ax + Math.cos(a) * 520, tn.ay + Math.sin(a) * 520); ctx.stroke(); ctx.restore();
      }
      for (let j = tn.segs.length - 1; j >= 0; j--) {
        const [sx, sy, a, sc] = tn.segs[j], last = j === tn.segs.length - 1;
        Art.draw(ctx, last ? 'k9tip' : 'k9seg', sx, sy, a - Math.PI / 2, 1, sc * (last ? 1.15 : 1.1), sc * (last ? 1.15 : 1.1));
        if (e.flash > 0) Art.draw(ctx, last ? 'k9tip' : 'k9seg', sx, sy, a - Math.PI / 2, 0.35, sc, sc, 'w');
      }
      const tip = tn.segs[tn.segs.length - 1];
      if (tip) glowDot(ctx, tip[0], tip[1], 7 + (tn.lash && tn.lash.hot ? 6 : 0), ph === 3 ? 'rgba(255,60,90,.8)' : 'rgba(255,90,170,.7)');
    }
    Art.draw(ctx, 'k9body', x, y);
    bFlash(ctx, 'k9body', e);
    // 發光紋路脈動
    const pulse = 0.5 + 0.5 * Math.sin(e.t * (ph === 3 ? 9 : 4));
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) glowDot(ctx, x + s * (14 + k * 9), y - 60 + k * 22, 6, `rgba(${ph === 3 ? '255,80,120' : '80,240,255'},${0.3 + pulse * 0.4})`);
    // 眼睛
    const ex = x, ey = y + 30, open = ph === 1 ? 0.35 : 1, a = aim(ex, ey);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(ex, ey, 17, 13 * open + 1, 0, 0, TAU); ctx.clip();
    const eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, 17);
    eg.addColorStop(0, ph === 3 ? '#fff0c0' : '#f8ffd0'); eg.addColorStop(0.5, ph === 3 ? '#ff6a3a' : '#d8f040'); eg.addColorStop(1, ph === 3 ? '#801020' : '#3a7010');
    ctx.fillStyle = eg; ctx.fillRect(ex - 18, ey - 14, 36, 28);
    ctx.translate(ex + Math.cos(a) * 5, ey + Math.sin(a) * 4); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = '#0a0006'; ctx.beginPath(); ctx.ellipse(0, 0, ph === 3 ? 4.5 : 2.6, 9, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#1a2430'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(ex, ey, 17, 13 * open + 1, 0, 0, TAU); ctx.stroke();
    glowDot(ctx, ex, ey, 30, ph === 3 ? `rgba(255,60,60,${0.25 + pulse * 0.25})` : `rgba(200,255,90,${0.15 + pulse * 0.15})`);
  },
};
ET.boss9.onDeath = e => bossDown(e);

// ================= 3D 模型 =================
Object.assign(EXTRA_MODELS, {
  manta(K) {
    const H = K.M(0x2c4858, { m: 0.75, r: 0.3, cc: 0.9 }), H2 = K.M(0x1a2a36, { m: 0.85, r: 0.35 }), BL = K.M(0xc8d8e0, { m: 0.3, r: 0.3, cc: 1 }), CY = K.G(0x50e8ff, 2.8);
    K.extM([0, -15, 8, -8, 21, -2, 22, 3, 12, 4, 4, 10, 0, 12], 2, H, 0, 0.6);
    K.extM([0, -12, 6, -6, 15, -1, 6, 2, 0, 4], 0.6, BL, 2, 0.2);
    K.lathe([[0, -14], [3, -10], [4.4, -2], [4, 6], [1.5, 12], [0.2, 16]], H2, { sy: 0.6, y: 2 });
    K.bar(0, 12, 0, 22, 1.5, 1, 0.8, H2);
    K.barM(4, -4, 19, 1, 2.8, 0.7, 0.3, CY);
    for (const s of [-1, 1]) K.sph(1.4, 0.9, 1.4, s * 3, 3.4, -10, K.G(0x9af8ff, 3));
  },
  jelly(K) {
    const BELL = new K.T.MeshPhysicalMaterial({ color: 0xe0a0ff, metalness: 0, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.8, emissive: 0x8030c0, emissiveIntensity: 0.8 });
    BELL.userData.glow = 0xc070ff;
    K.latheV([[0.01, 0], [11, 0], [11.5, 2], [10, 6], [6, 9.5], [0.01, 11]], BELL);
    K.torus(10.5, 0.9, 0, 1, 0, K.G(0x60e8ff, 2.6));
    K.sph(4, 3.5, 4, 0, 4, 0, K.G(0xffd0ff, 3));
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; K.sph(1, 0.6, 1, Math.cos(a) * 7, 8, Math.sin(a) * 7, K.G(0x9ff8ff, 2.4)); }
  },
  hatch(K) {
    const ST = K.M(0x5a6a72, { m: 0.75, r: 0.35, cc: 0.5 }), DK = K.M(0x1e2a30, { m: 0.85, r: 0.4 }), YL = K.M(0xe0b030, { m: 0.2, r: 0.45, panel: false });
    K.ext(K.oct(16, 16, 6.5), 3, ST, 0, 0.9);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; K.box(3, 0.3, 1.4, Math.cos(a) * 14, 3.1, Math.sin(a) * 14, i % 2 ? YL : DK).rotation.y = -a; }
    for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) K.sph(0.9, 0.6, 0.9, x, 3.2, z, K.G(0x50e8ff, 2.6));
  },
  torpTur(K) {
    const ST = K.M(0x8a9aa4, { m: 0.8, r: 0.3, cc: 0.6 }), DK = K.M(0x22282e, { m: 0.9, r: 0.35 });
    K.latheV([[0.01, 0], [7.5, 0], [7.2, 2], [5, 4.2], [0.01, 4.6]], ST, 0, 4, 0);
    for (const s of [-1, 1]) { K.cyl(2.2, 2.2, 10, s * 3.4, 6.5, 6, DK); K.cyl(1.6, 1.6, 0.5, s * 3.4, 6.5, 11.2, K.G(0xff5a3a, 2.4)); }
  },
  sub9(K) {
    const HU = K.M(0x2a3a48, { m: 0.75, r: 0.32, cc: 0.8 }), H2 = K.M(0x3a4e5e, { m: 0.75, r: 0.32, cc: 0.8 }), DK = K.M(0x121a22, { m: 0.9, r: 0.4 }), RD = K.M(0x7a2020, { m: 0.3, r: 0.5, panel: false });
    K.lathe([[0, -92], [8, -86], [16, -70], [20, -40], [21, 0], [20, 50], [15, 76], [8, 88], [0.2, 92]], HU, { sy: 0.7, y: 2 });
    K.rbox(14, 34, 8, 0, -30, 12, H2, 2);
    K.rbox(26, 4, 1.2, 0, -36, 19, H2, 0.5);
    for (let r = 0; r < 4; r++) for (const s of [-1, 1]) K.rbox(5, 5, 1, s * 6, -6 + r * 8, 15.4, DK, 0.3);
    for (const s of [-1, 1]) { K.ext([s * 18, 64, s * 32, 74, s * 32, 79, s * 18, 76], 1.4, H2, 3, 0.4); K.ext([s * 18, -58, s * 30, -54, s * 30, -50, s * 18, -50], 1.2, H2, 3, 0.4); }
    K.torus(8, 1.4, 0, 2, 92, DK);
    K.bar(0, -90, 0, 90, 16, 1, 0.4, K.G(0x50d8ff, 1.8));
    for (const z of [-80, -40, 20, 60]) for (const s of [-1, 1]) K.sph(0.9, 0.7, 0.9, s * 19, 6, z, K.G(0x50e8ff, 2.6));
    K.cylV(6, 6.5, 1.4, 0, 15, -50, DK); K.cylV(6, 6.5, 1.4, 0, 15, 40, DK);
    K.ext([-21, 2, 21, 2, 21, 4, -21, 4], 0.4, RD, 14.6, 0);
  },
  k9body(K) {
    const AR = K.M(0x2a3e52, { m: 0.75, r: 0.3, cc: 0.9 }), AR2 = K.M(0x3e5a72, { m: 0.7, r: 0.3, cc: 0.9 }), DK = K.M(0x0e161e, { m: 0.9, r: 0.4 });
    const FL = K.M(0x5a2a4a, { m: 0.3, r: 0.4, cc: 0.8, panel: false }), CY = K.G(0x50f0ff, 2.6), PK = K.G(0xff5aa0, 2.6);
    // 外套膜（往畫面上方延伸的尖頭）
    K.lathe([[0, -96], [10, -88], [24, -66], [38, -36], [46, -6], [46, 18], [38, 40], [24, 52], [0.2, 56]], AR, { sy: 0.62, y: 4 });
    // 鰭
    for (const s of [-1, 1]) {
      K.ext([s * 20, -84, s * 70, -70, s * 82, -50, s * 64, -46, s * 34, -52], 2.4, AR2, 6, 0.8);
      K.bar(s * 26, -80, s * 74, -58, 9, 1, 0.5, CY);
    }
    // 裝甲環節
    for (let k = 0; k < 5; k++) { const z = -70 + k * 22, r = [20, 34, 42, 46, 44][k]; K.bar(-r, z, r, z, 18 + (k > 1 ? 10 : k * 4), 2.6, 1.4, DK); }
    K.bar(0, -94, 0, 30, 33, 2.2, 1, CY);
    for (const s of [-1, 1]) K.bar(s * 18, -60, s * 30, 10, 31, 1.4, 0.8, CY);
    // 嘴部（眼睛下方）
    K.latheV([[0.01, 0], [26, 0], [24, 4], [18, 7], [0.01, 8]], FL, 0, 20, 34);
    K.cylV(19, 19, 1, 0, 26, 30, DK);
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; K.sph(1.4, 1, 1.4, Math.cos(a) * 24, 25, 34 + Math.sin(a) * 18, PK); }
    for (const s of [-1, 1]) K.sph(3, 2, 3, s * 34, 26, 0, K.G(0xffe060, 2.8));
  },
  k9seg(K) {
    const AR = K.M(0x3a5466, { m: 0.75, r: 0.3, cc: 0.9 }), DK = K.M(0x141c24, { m: 0.9, r: 0.4 });
    K.latheV([[0.01, 0], [9.5, 0], [9, 2], [7, 4.6], [0.01, 5.4]], AR);
    K.torus(8.4, 0.8, 0, 2.4, 0, DK);
    for (const s of [-1, 1]) K.sph(1.6, 1, 1.6, s * 4.5, 4.6, 1, K.G(0xff6ab0, 2.6));
    K.bar(0, -7, 0, 7, 5.2, 1.2, 0.5, K.G(0x50f0ff, 2));
  },
  k9tip(K) {
    const AR = K.M(0x3a5466, { m: 0.75, r: 0.3, cc: 0.9 }), BL = K.M(0xd8e0e8, { m: 0.9, r: 0.2, cc: 1 });
    K.latheV([[0.01, 0], [8, 0], [7, 3], [0.01, 4.4]], AR, 0, 0, -8);
    for (const s of [-1, 1]) K.ext([s * 2, -6, s * 9, 2, s * 6, 14, s * 1, 16, s * 4, 4], 2.4, BL, 0.5, 0.5);
    K.sph(2.6, 2, 2.6, 0, 3.8, -4, K.G(0xff4a8a, 3));
  },
});
EXTRA_BAKES.push(
  ['manta', 44, 34, EXTRA_MODELS.manta, { rot: Math.PI }],
  ['jelly', 28, 28, EXTRA_MODELS.jelly, { glow: 0.9 }],
  ['hatch', 34, 34, EXTRA_MODELS.hatch],
  ['torpTur', 26, 26, EXTRA_MODELS.torpTur],
  ['sub9', 60, 190, EXTRA_MODELS.sub9, { glow: 0.7 }],
  ['k9body', 190, 190, EXTRA_MODELS.k9body, { glow: 0.9 }],
  ['k9seg', 22, 22, EXTRA_MODELS.k9seg, { glow: 0.7 }],
  ['k9tip', 24, 34, EXTRA_MODELS.k9tip, { glow: 0.8 }],
);

// ================= 波次、關卡、音樂 =================
Object.assign(WAVES, {
  mantaL: q => { for (let i = 0; i < 5; i++) q(i * 0.32, () => spawn('manta', 110, -18, { dir: 1, amp: 80 })); return 3; },
  mantaR: q => { for (let i = 0; i < 5; i++) q(i * 0.32, () => spawn('manta', 250, -18, { dir: -1, amp: 80 })); return 3; },
  mantaV: q => { [[180, 0], [140, 0.25], [220, 0.25], [100, 0.5], [260, 0.5]].forEach(([x, t]) => q(t, () => spawn('manta', x, -18, { amp: 26, vy: 140, ph: t * 4 }))); return 3; },
  jellies: q => { [70, 290, 140, 220].forEach((x, i) => q(i * 0.7, () => spawn('jelly', x, -20))); return 4; },
  jellyRain: q => { for (let i = 0; i < 7; i++) q(i * 0.45, () => spawn('jelly', rnd(40, W - 40), -20)); return 4.6; },
  sub9: q => { q(0, () => spawn('sub9', 180, -100)); return 10; },
});
STAGES.push({ name: '深海基地', en: 'ABYSSAL BASE', boss: 'boss9', amb: 'sea', speed: 44, bossSong: 'bossX',
  under: ctx => AMB2.sea.under(ctx),
  seq: ['mantaL', 'fDown', 'jellies', 'carrierP', 'mantaR', 'crates', 'icpt', 'mines', 'mantaV', 'snakeL', 'carrierS', 'jellies', 'fDive', 'droneW', 'sub9', 'carrierP', 'mantaL', 'mines', 'jellyRain', 'icpt', 'snakeR', 'crates', 'mantaV', 'carrierB', 'jellies', 'fDown', 'mantaR'] });
Object.assign(SONGS, {
  s8: { bpm: 126, key: 43, prog: [[0, 'm'], [-4, 'M'], [-2, 'M'], [-5, 'm'], [0, 'm'], [3, 'M'], [-2, 'M'], [-7, 'M']], seed: 173, drums: 2, lead: 'triangle', arpW: 'sine', pad: 1, arp: [0, 7, 12, 19, 12, 7, 3, 7] },
  bossX: { bpm: 174, key: 41, prog: [[0, 'm'], [1, 'M'], [0, 'm'], [-2, 'M'], [0, 'm'], [1, 'M'], [3, 'M'], [-1, 'M']], seed: 191, drums: 3, lead: 'sawtooth', pad: 0.7, bass: 'sawtooth' },
});
