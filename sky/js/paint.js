'use strict';
// 地形繪製 v2：先算高度場做「山坡光影」（左上打光），再疊上田地、河流、城市、基地等細節。
// 每關從起點到頭目分成幾段不同地貌。
const RES = 4;
const LDIR = (() => { const v = [-0.55, -0.62, 0.56], m = Math.hypot(...v); return v.map(x => x / m); })();
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = (c, k = 1, a = 1) => `rgba(${clamp(c[0] * k, 0, 255) | 0},${clamp(c[1] * k, 0, 255) | 0},${clamp(c[2] * k, 0, 255) | 0},${a})`;
const ridge = (x, y, s) => 1 - Math.abs(vnoise(x, y, s) * 2 - 1);

// 高度場＋光影底圖：Hf(x,v) 回傳高度（像素），Cf(x,v,h,slope) 回傳 [r,g,b]
function* reliefGen(v0, v1, Hf, Cf, k = 1.6) {
  const nx = Math.ceil(W / RES) + 1, ny = Math.ceil((v1 - v0) / RES) + 1, sw = nx + 2;
  const hs = new Float32Array(sw * (ny + 2));
  for (let j = -1; j <= ny; j++) {
    for (let i = -1; i <= nx; i++) hs[(j + 1) * sw + i + 1] = Hf(i * RES, v0 + j * RES);
    if (j % 10 === 9) yield;
  }
  const c = document.createElement('canvas'); c.width = nx; c.height = ny;
  const cx = c.getContext('2d'), id = cx.createImageData(nx, ny), d = id.data;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p = (j + 1) * sw + i + 1, h = hs[p];
      const dx = (hs[p + 1] - hs[p - 1]) / (2 * RES), dv = (hs[p + sw] - hs[p - sw]) / (2 * RES);
      const n = 1 / Math.hypot(dx, dv, 1), dot = (-dx * LDIR[0] - dv * LDIR[1] + LDIR[2]) * n;
      const b = clamp(1 + (dot - LDIR[2]) * k, 0.45, 1.45);
      const col = Cf(i * RES, v0 + j * RES, h, Math.hypot(dx, dv));
      const q = (j * nx + i) * 4;
      d[q] = col[0] * b; d[q + 1] = col[1] * b; d[q + 2] = col[2] * b; d[q + 3] = 255;
    }
    if (j % 8 === 7) yield;
  }
  cx.putImageData(id, 0, 0);
  return { c, nx, ny, v0, at(x, v) { const i = clamp(Math.round(x / RES), -1, nx), j = clamp(Math.round((v - v0) / RES), -1, ny); return hs[(j + 1) * sw + i + 1]; } };
}
function drawRelief(g, R) {
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(R.c, -RES / 2, R.v0 - RES / 2, R.nx * RES, R.ny * RES);
  g.restore();
}
// 細緻顆粒（讓地面不會太乾淨）
function grain(g, v0, v1, seed, a = 0.06) {
  for (let v = Math.floor(v0 / 6) * 6; v < v1; v += 6) for (let x = 0; x < W; x += 6) {
    const n = hash(x, v, seed);
    if (n < 0.25) { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(x + n * 12, v + n * 7, 2, 2); }
    else if (n > 0.8) { g.fillStyle = `rgba(255,255,255,${a * 0.8})`; g.fillRect(x + n * 4, v + n * 3, 2, 2); }
  }
}
function shadowed(g, fn, ox = 3, oy = 4, a = 0.28) {
  g.save(); g.translate(ox, oy); g.fillStyle = `rgba(0,0,0,${a})`; g.strokeStyle = `rgba(0,0,0,${a})`; fn(true); g.restore(); fn(false);
}
function tree2(g, x, y, r, base = [46, 92, 40]) {
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + r * 0.5, y + r * 0.6, r, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  gr.addColorStop(0, rgb(base, 1.55)); gr.addColorStop(0.6, rgb(base, 1)); gr.addColorStop(1, rgb(base, 0.62));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function palm(g, x, y, r) {
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2; g.lineCap = 'round';
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + x; g.beginPath(); g.moveTo(x + 3, y + 4); g.lineTo(x + 3 + Math.cos(a) * r, y + 4 + Math.sin(a) * r); g.stroke(); }
  g.strokeStyle = '#3f8a35'; g.lineWidth = 2.2;
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + x; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.3) * r * 0.6, y + Math.sin(a + 0.3) * r * 0.6, x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
  g.fillStyle = '#6a4a2a'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill();
}
// 科幻小物件
function turbine(g, x, y, a) {
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.6; g.lineCap = 'round';
  for (let k = 0; k < 3; k++) { const b = a + k * TAU / 3; g.beginPath(); g.moveTo(x + 9, y + 12); g.lineTo(x + 9 + Math.cos(b) * 13, y + 12 + Math.sin(b) * 13); g.stroke(); }
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y + 12); g.lineWidth = 1.4; g.stroke();
  g.strokeStyle = '#f4f6f8'; g.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) { const b = a + k * TAU / 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(b) * 13, y + Math.sin(b) * 13); g.stroke(); }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); g.fillStyle = '#ff4040'; g.beginPath(); g.arc(x, y, 0.8, 0, TAU); g.fill();
}
function solarFarm(g, x, y, cols, rows) {
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + 2, y + 3, cols * 9, rows * 7);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const px = x + c * 9, py = y + r * 7;
    const gr = g.createLinearGradient(px, py, px + 8, py + 5); gr.addColorStop(0, '#5a86c8'); gr.addColorStop(0.5, '#1d3f78'); gr.addColorStop(1, '#14284e');
    g.fillStyle = gr; g.fillRect(px, py, 8, 5.5);
    g.strokeStyle = 'rgba(200,225,255,.35)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(px + 4, py); g.lineTo(px + 4, py + 5.5); g.moveTo(px, py + 2.75); g.lineTo(px + 8, py + 2.75); g.stroke();
  }
}
function dome(g, x, y, r) {
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(x + r * 0.45, y + r * 0.55, r, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.08, x, y, r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#d9dfe6'); gr.addColorStop(1, '#8f9aa6');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(80,90,100,.35)'; g.lineWidth = 0.6; for (const k of [0.45, 0.8]) { g.beginPath(); g.arc(x, y, r * k, 0, TAU); g.stroke(); }
}
function dish(g, x, y, r, a) {
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + 4, y + 5, r, r * 0.75, a, 0, TAU); g.fill();
  const gr = g.createLinearGradient(x - r, y - r, x + r, y + r); gr.addColorStop(0, '#f2f4f6'); gr.addColorStop(1, '#9aa4ae');
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.75, a, 0, TAU); g.fill();
  g.strokeStyle = '#6b7580'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a - 1) * r * 0.9, y + Math.sin(a - 1) * r * 0.9); g.stroke();
}
function glowDotT(g, x, y, r, col) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function container(g, x, y, w, h, col) {
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 2, y + 2, w, h);
  g.fillStyle = col; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, w, 1);
  g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 0.5;
  for (let k = 2; k < (w > h ? w : h); k += 2) { g.beginPath(); if (w > h) { g.moveTo(x + k, y); g.lineTo(x + k, y + h); } else { g.moveTo(x, y + k); g.lineTo(x + w, y + k); } g.stroke(); }
}
function car(g, x, y, vert, col) {
  const w = vert ? 3.2 : 6, h = vert ? 6 : 3.2;
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - w / 2 + 1, y - h / 2 + 1, w, h);
  g.fillStyle = col; g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle = 'rgba(20,30,40,.6)'; vert ? g.fillRect(x - w / 2 + 0.5, y - 1, w - 1, 2) : g.fillRect(x - 1, y - h / 2 + 0.5, 2, h - 1);
}

// ================= 第 1 關：綠野河谷 → 森林丘陵 → 高地前哨 =================
const Z1 = v => { const d = -v; const forest = smooth(1100, 1600, d) * (1 - smooth(2500, 3000, d)), high = smooth(2500, 3000, d); return { farm: 1 - forest - high, forest, high }; };
const H1 = (x, v) => {
  const z = Z1(v);
  let h = fbm(x * 0.005, v * 0.005, 3) * (22 + z.forest * 45 + z.high * 80) + vnoise(x * 0.025, v * 0.025, 4) * 7 * (z.forest + z.high * 1.4);
  const dr = Math.abs(x - riverX(v)), rw = riverW(v);
  h -= Math.max(0, 1 - dr / (rw * 2.4)) * (18 + z.high * 30);
  return h;
};
const C1 = (x, v, h, s) => {
  const z = Z1(v);
  let c = mixC([92, 140, 52], [128, 172, 76], fbm(x * 0.01, v * 0.01, 11));
  c = mixC(c, [150, 152, 92], z.high * 0.45 * vnoise(x * 0.012, v * 0.012, 15));
  const can = vnoise(x * 0.09, v * 0.09, 13), fn = fbm(x * 0.012, v * 0.012, 12);
  const forest = clamp(z.forest * 1.3 + z.high * 0.25 + z.farm * 0.05 + (fn - 0.5) * 1.6 - 0.15, 0, 1);
  c = mixC(c, mixC([34, 74, 32], [62, 108, 46], can), forest);
  const rock = clamp((s - 0.5) * 2.2 + z.high * 0.25 + (vnoise(x * 0.03, v * 0.03, 14) - 0.5) * 0.5, 0, 1);
  c = mixC(c, mixC([120, 110, 92], [158, 150, 132], vnoise(x * 0.06, v * 0.06, 16)), rock);
  const dr = Math.abs(x - riverX(v)), rw = riverW(v);
  if (dr < rw / 2 + 9) c = mixC(c, [205, 186, 132], 0.85);
  return c;
};
// ================= 第 2 關：海岸 → 群島 → 礁岩淺灘 → 外海 =================
function nearIsland(x, v) {
  const j = Math.floor(v / 520); let best = null, bd = 1e9;
  for (const jj of [j - 1, j, j + 1]) {
    const isl = islandAt(jj); if (!isl) continue;
    const dx = x - isl.x, dy = v - isl.v, d = Math.hypot(dx, dy), e = d - islandR(isl, Math.atan2(dy, dx));
    if (e < bd) { bd = e; best = isl; }
  }
  return [best, bd];
}
const H2 = (x, v) => {
  if (v > coastV(x)) return 6 + fbm(x * 0.02, v * 0.02, 21) * 10;
  const [isl, e] = nearIsland(x, v);
  if (isl && e < 0) return 3 + Math.min(1, -e / isl.r * 1.6) * (14 + isl.r * 0.3) * (0.7 + fbm(x * 0.04, v * 0.04, 22) * 0.6);
  return vnoise(x * 0.07, v * 0.11, 23) * 1.4 + vnoise(x * 0.2, v * 0.28, 24) * 0.6;
};
const C2 = (x, v, h, s) => {
  const d = -v;
  if (v > coastV(x)) { const t = v - coastV(x); return t < 12 ? [226, 208, 152] : mixC([104, 150, 64], [138, 168, 80], fbm(x * 0.03, v * 0.03, 25)); }
  const [isl, e] = nearIsland(x, v);
  if (isl && e < 0) {
    if (e > -7) return [226, 206, 150];
    return mixC(mixC([82, 138, 56], [52, 104, 44], fbm(x * 0.05, v * 0.05, 26)), [140, 130, 110], clamp((s - 0.35) * 2, 0, 1));
  }
  const reef = smooth(0.62, 0.7, fbm(x * 0.008, v * 0.008, 27)) * smooth(1800, 2300, d) * (1 - smooth(3200, 3600, d));
  const coastShallow = 1 - smooth(0, 120, coastV(x) - v);
  const shallow = clamp(Math.max(1 - e / 70, reef * 0.9, coastShallow), 0, 1);
  const deep = smooth(3000, 3600, d) * 0.4;
  let c = mixC([22, 82, 134], [16, 56, 102], fbm(x * 0.004, v * 0.004, 28) * 0.6 + deep);
  c = mixC(c, mixC([64, 178, 196], [120, 210, 210], vnoise(x * 0.05, v * 0.05, 29) * clamp(1 - e / 70, 0, 1)), shallow * 0.9);
  return c;
};
// ================= 第 3 關：住宅區 → 市中心 → 工業區（中間有運河） =================
const canalAt = v => { const d = -v; for (const c of [1700, 3300]) if (Math.abs(d - c) < 30) return c; return null; };
// ================= 第 4 關：沙丘 → 峽谷台地 → 基地 =================
const Z4 = v => { const d = -v; const mesa = smooth(1100, 1500, d) * (1 - smooth(2600, 3000, d)); return { mesa, flat: smooth(2600, 3000, d) }; };
const H4 = (x, v) => {
  const z = Z4(v);
  let h = fbm(x * 0.004, v * 0.004, 41) * 26;
  h += Math.pow(ridge(x * 0.014 + v * 0.006, v * 0.022, 42), 2.2) * 16 * (1 - z.flat * 0.6);
  const m = fbm(x * 0.0055, v * 0.0055, 43);
  h += smooth(0.49, 0.59, m) * 38 * z.mesa;
  h -= Math.pow(ridge(x * 0.008, v * 0.008, 44), 8) * 34 * z.mesa;
  return h;
};
const C4 = (x, v, h, s) => {
  const z = Z4(v);
  let c = mixC([206, 164, 98], [232, 200, 132], clamp(h / 40 + vnoise(x * 0.02, v * 0.02, 45) * 0.3, 0, 1));
  c = mixC(c, [180, 108, 70], clamp(z.mesa * smooth(30, 40, h), 0, 1) * 0.75);
  c = mixC(c, [146, 92, 62], clamp((s - 0.7) * 1.8, 0, 1) * (0.4 + z.mesa * 0.6));
  c = mixC(c, [150, 120, 90], clamp(-h / 14, 0, 1) * z.mesa);
  return c;
};
// ================= 第 5 關：高空雲海 =================
const cloudN = (x, v) => fbm(x * 0.0055, v * 0.0055 + 3, 51) * 0.8 + vnoise(x * 0.03, v * 0.03, 52) * 0.2;
const cloudCover = v => { const d = -v; return 0.64 - smooth(800, 2600, d) * 0.05 + smooth(3000, 3800, d) * 0.05; };
const cloudH = (x, v) => Math.max(0, cloudN(x, v) - cloudCover(v)) * 140;
const H5 = (x, v) => { const c = cloudH(x, v); return c > 0 ? c * 0.6 : vnoise(x * 0.06, v * 0.09, 53) * 1.2; };
const C5 = (x, v) => {
  const c = cloudH(x, v);
  const shade = smooth(0, 9, cloudH(x - 20, v - 30));
  const sea = mixC([24, 70, 122], [36, 96, 152], fbm(x * 0.005, v * 0.005, 54)).map(k => k * (1 - shade * 0.35));
  if (c <= 0) return sea;
  return mixC(sea, mixC([226, 234, 246], [255, 255, 255], clamp(c / 18, 0, 1)), smooth(0, 12, c));
};

PAINT.push(
  // ---------------- 第 1 關 ----------------
  { H: H1, C: C1, k: 1.8, d: (g, v0, v1, sp, R) => {
    grain(g, v0, v1, 101, 0.07);
    // 田地（平坦的農田區）
    cells(92, 74, v0, v1, 80, (i, j, x, v) => {
      if (hash(i, j, 1) > 0.62) return;
      const cx = x + 46, cv = v + 37, z = Z1(cv);
      if (z.farm < 0.6) return;
      if (Math.abs(cx - riverX(cv)) < riverW(cv) / 2 + 52 || Math.abs(cx - roadX1(cv)) < 54) return;
      const col = [[196, 182, 84], [146, 178, 70], [158, 120, 76], [212, 176, 96], [124, 164, 60], [170, 190, 92]][(hash(i, j, 2) * 6) | 0];
      g.save(); g.translate(cx, cv); g.rotate((hash(i, j, 4) - 0.5) * 0.12);
      g.fillStyle = 'rgba(30,50,20,.35)'; g.fillRect(-42, -32, 86, 66);
      const gr = g.createLinearGradient(-42, -32, 42, 32); gr.addColorStop(0, rgb(col, 1.12)); gr.addColorStop(1, rgb(col, 0.9));
      g.fillStyle = gr; g.fillRect(-42, -33, 84, 66);
      g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 1.3;
      const hz = hash(i, j, 3) > 0.5;
      for (let k = 4; k < (hz ? 66 : 84); k += 4.5) { g.beginPath(); if (hz) { g.moveTo(-42, -33 + k); g.lineTo(42, -33 + k); } else { g.moveTo(-42 + k, -33); g.lineTo(-42 + k, 33); } g.stroke(); }
      for (let k = -40; k < 42; k += 6) { tree2(g, k, -35, 2.2, [52, 96, 40]); }
      g.restore();
    });
    // 樹林
    cells(56, 56, v0, v1, 30, (i, j, x, v) => {
      const z = Z1(v + 28), dens = z.forest * 0.95 + z.farm * 0.35 + z.high * 0.3;
      if (hash(i, j, 5) > dens) return;
      const n = 4 + ((hash(i, j, 6) * (6 + z.forest * 14)) | 0);
      for (let k = 0; k < n; k++) {
        const tx = x + hash(i * 31 + k, j, 7) * 56, tv = v + hash(i, j * 17 + k, 8) * 56;
        if (Math.abs(tx - riverX(tv)) < riverW(tv) / 2 + 9 || Math.abs(tx - roadX1(tv)) < 12) continue;
        const pine = z.high > 0.4 || hash(k, i, j) < z.forest * 0.4;
        tree2(g, tx, tv, (pine ? 3.2 : 4.2) + hash(k, i + j, 9) * 3.4, pine ? [34, 78, 48] : [56, 104, 42]);
      }
    });
    // 河流：岸邊、深淺、波光
    bandPath(g, riverX, v => riverW(v) + 6, v0, v1, 0); g.fillStyle = 'rgba(120,100,60,.45)'; g.fill();
    bandPath(g, riverX, riverW, v0, v1, 0);
    const wg = g.createLinearGradient(0, v0, W, v1); wg.addColorStop(0, '#3d86b4'); wg.addColorStop(1, '#2f74a2');
    g.fillStyle = wg; g.fill();
    bandPath(g, riverX, v => riverW(v) * 0.5, v0, v1, 0); g.fillStyle = 'rgba(14,52,92,.45)'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1;
    for (let v = Math.floor(v0 / 14) * 14; v < v1; v += 14) {
      const o = (hash(1, v, 12) - 0.5) * riverW(v) * 0.7, x = riverX(v) + o;
      g.beginPath(); g.moveTo(x - 4, v); g.quadraticCurveTo(x, v - 1.5, x + 4, v); g.stroke();
    }
    for (let v = Math.floor(v0 / 40) * 40; v < v1; v += 40) {
      if (Z1(v).high < 0.3) continue;
      for (let k = 0; k < 3; k++) { const x = riverX(v) + (hash(k, v, 17) - 0.5) * riverW(v) * 0.6; g.fillStyle = '#8c8578'; g.beginPath(); g.arc(x, v + k * 9, 2.5, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x, v + k * 9 - 1, 4, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    }
    // 道路＋橋＋車
    g.lineCap = 'round';
    g.beginPath(); for (let v = v0 - 20; v <= v1 + 20; v += 5) v === v0 - 20 ? g.moveTo(roadX1(v), v) : g.lineTo(roadX1(v), v);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 17; g.stroke();
    g.strokeStyle = '#6f6c66'; g.lineWidth = 13; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.8; g.setLineDash([6, 7]); g.stroke(); g.setLineDash([]);
    // 橋：沿著道路方向畫在河上
    let seg = null;
    const flush = () => {
      if (!seg || seg.length < 2) { seg = null; return; }
      g.save(); g.lineCap = 'butt';
      const path = (o) => { g.beginPath(); seg.forEach(([x, v], i) => i ? g.lineTo(x + o, v) : g.moveTo(x + o, v)); };
      path(4); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 18; g.translate(0, 4); g.stroke(); g.translate(0, -4);
      path(0); g.strokeStyle = '#c4c1b8'; g.lineWidth = 19; g.stroke();
      g.strokeStyle = '#8f8c86'; g.lineWidth = 14; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.8; g.setLineDash([6, 7]); g.stroke(); g.setLineDash([]);
      g.restore(); seg = null;
    };
    for (let v = v0 - 30; v <= v1 + 30; v += 3) {
      const rx = roadX1(v);
      if (Math.abs(rx - riverX(v)) < riverW(v) / 2 + 10) (seg || (seg = [])).push([rx, v]); else flush();
    }
    flush();
    for (let v = Math.floor(v0 / 20) * 20; v < v1; v += 20) {
      const rx = roadX1(v);
      if (Math.abs(rx - riverX(v)) > riverW(v) / 2 + 12 && hash(3, v, 18) > 0.8) car(g, rx + (hash(4, v, 18) > 0.5 ? 3 : -3), v + 6, true, pick2(['#d94a3a', '#f0f0ea', '#3a6ab0', '#e0b030'], v, 3));
    }
    // 村莊
    cells(64, 64, v0, v1, 30, (i, j, x, v) => {
      const z = Z1(v);
      if (hash(i, j, 14) < 0.82 - z.farm * 0.1 || z.forest > 0.7) return;
      const n = 2 + ((hash(i, j, 15) * 4) | 0);
      for (let k = 0; k < n; k++) {
        const hx = x + 10 + hash(i, j + k, 16) * 44, hv = v + 10 + hash(i + k, j, 17) * 44;
        if (Math.abs(hx - riverX(hv)) < riverW(hv) / 2 + 22 || Math.abs(hx - roadX1(hv)) < 20) continue;
        const roof = pick2([[180, 84, 58], [64, 104, 156], [140, 112, 76], [196, 196, 186]], i + k, j);
        const w = 10 + hash(k, i, j) * 6, h2 = 8 + hash(j, k, i) * 4;
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(hx + 2.5, hv + 3, w, h2);
        g.fillStyle = rgb(roof, 1.18); g.fillRect(hx, hv, w, h2 / 2); g.fillStyle = rgb(roof, 0.82); g.fillRect(hx, hv + h2 / 2, w, h2 / 2);
        g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(hx, hv + h2 / 2 - 0.4, w, 0.8);
      }
    });
    // 太陽能板、風力發電、雷達（科幻感）
    cells(150, 210, v0, v1, 40, (i, j, x, v) => {
      const cx = x + 30 + hash(i, j, 61) * 90, cv = v + 30 + hash(i, j, 62) * 150, z = Z1(cv);
      if (Math.abs(cx - riverX(cv)) < riverW(cv) / 2 + 40 || Math.abs(cx - roadX1(cv)) < 40 || cx < 20 || cx > W - 50) return;
      const r = hash(i, j, 63);
      if (r < 0.25 && z.forest < 0.5) solarFarm(g, cx - 20, cv - 12, 5, 3);
      else if (r < 0.6 && R.at(cx, cv) > 20) { turbine(g, cx, cv, hash(i, j, 64) * TAU); turbine(g, cx + 26, cv + 18, hash(i, j, 65) * TAU); }
      else if (r < 0.8 && z.high > 0.4) {
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(cx - 24, cv - 18, 56, 42);
        g.fillStyle = '#9a9a92'; g.fillRect(cx - 26, cv - 20, 54, 40); g.strokeStyle = '#d0b040'; g.setLineDash([3, 3]); g.strokeRect(cx - 26, cv - 20, 54, 40); g.setLineDash([]);
        dome(g, cx - 10, cv - 4, 9); dish(g, cx + 14, cv + 8, 7, hash(i, j, 66) * TAU);
        glowDotT(g, cx + 22, cv - 14, 4, 'rgba(255,60,60,.9)');
      }
    });
    // 防空砲座
    cells(120, 170, v0, v1, 0, (i, j, x, v) => {
      if (j > -3 || hash(i, j, 18) < 0.72) return;
      const cx = x + 30 + hash(i, j, 19) * 60, cv = v + 40 + hash(i, j, 20) * 90;
      if (cx < 30 || cx > W - 30 || cv < v0 || cv >= v1) return;
      if (Math.abs(cx - riverX(cv)) < riverW(cv) / 2 + 26 || Math.abs(cx - roadX1(cv)) < 28) return;
      g.fillStyle = 'rgba(80,70,50,.35)'; g.beginPath(); g.arc(cx, cv, 22, 0, TAU); g.fill();
      sp.push({ type: 'turret', x: cx, v: cv });
    });
  } },
  // ---------------- 第 2 關 ----------------
  { H: H2, C: C2, k: 1.4, d: (g, v0, v1, sp) => {
    // 浪花與波光
    cells(36, 28, v0, v1, 10, (i, j, x, v) => {
      const wx = x + hash(i, j, 23) * 36, wv = v + hash(i, j, 24) * 28;
      if (wv > coastV(wx) - 4 || inIsland(wx, wv, 4)) return;
      const r = hash(i, j, 22);
      if (r < 0.45) { g.strokeStyle = `rgba(255,255,255,${0.18 + r * 0.3})`; g.lineWidth = 1; g.beginPath(); g.arc(wx, wv + 6, 6 + r * 6, -2.4, -0.7); g.stroke(); }
      else if (r > 0.9) { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(wx, wv, 2, 1); }
    });
    // 小島細節：岸邊白浪、椰子樹、岩石、燈塔
    for (let j = Math.floor(v0 / 520) - 1; j <= Math.floor(v1 / 520) + 1; j++) {
      const isl = islandAt(j); if (!isl) continue;
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.6; g.setLineDash([5, 4]);
      g.beginPath(); for (let a = 0; a <= TAU + 0.01; a += 0.15) { const r = islandR(isl, a) + 3; const px = isl.x + Math.cos(a) * r, pv = isl.v + Math.sin(a) * r; a ? g.lineTo(px, pv) : g.moveTo(px, pv); } g.stroke(); g.setLineDash([]);
      for (let k = 0; k < isl.r / 4; k++) {
        const a = hash(k, j, 25) * TAU, r = (0.3 + hash(j, k, 26) * 0.6) * (isl.r - 14);
        palm(g, isl.x + Math.cos(a) * r, isl.v + Math.sin(a) * r, 5 + hash(k, k, j) * 3);
      }
      if (hash(j, 5, 207) > 0.5) { const a = hash(j, 6, 207) * TAU, r = islandR(isl, a) - 10; dome(g, isl.x + Math.cos(a) * r, isl.v + Math.sin(a) * r, 4); glowDotT(g, isl.x + Math.cos(a) * r, isl.v + Math.sin(a) * r, 8, 'rgba(255,240,170,.5)'); }
      if (isl.r > 52 && isl.v >= v0 && isl.v < v1) sp.push({ type: 'turret', x: isl.x, v: isl.v });
    }
    // 海上平台（科幻）
    cells(180, 600, v0, v1, 60, (i, j, x, v) => {
      if (j > -2 || hash(i, j, 81) < 0.55) return;
      const cx = x + 40 + hash(i, j, 82) * 100, cv = v + 100 + hash(i, j, 83) * 400;
      if (cx < 40 || cx > W - 40 || inIsland(cx, cv, 40)) return;
      const hex = (r) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; k ? g.lineTo(cx + Math.cos(a) * r, cv + Math.sin(a) * r) : g.moveTo(cx + Math.cos(a) * r, cv + Math.sin(a) * r); } g.closePath(); };
      g.save(); g.translate(5, 7); hex(26); g.fillStyle = 'rgba(0,20,40,.4)'; g.fill(); g.restore();
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.fillStyle = '#3b4248'; g.beginPath(); g.arc(cx + Math.cos(a) * 22, cv + Math.sin(a) * 22, 3, 0, TAU); g.fill(); }
      hex(25); const gr = g.createLinearGradient(cx - 25, cv - 25, cx + 25, cv + 25); gr.addColorStop(0, '#b9c0c6'); gr.addColorStop(1, '#6e767e'); g.fillStyle = gr; g.fill();
      g.strokeStyle = '#e0b030'; g.lineWidth = 1.5; g.setLineDash([4, 3]); hex(22); g.stroke(); g.setLineDash([]);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; glowDotT(g, cx + Math.cos(a) * 24, cv + Math.sin(a) * 24, 4, 'rgba(80,220,255,.9)'); }
      if (cv >= v0 && cv < v1) sp.push({ type: 'turret', x: cx, v: cv });
    });
    // 起點港口
    if (v1 > -700) {
      for (let k = 0; k < 14; k++) { const x = 12 + k * 25, y = coastV(x) + 50 + hash(k, 1, 27) * 40; container(g, x, y, 10, 5, pick2(['#c85a3a', '#3a78b0', '#e0b030', '#4a9a5a', '#d0d0c8'], k, 2)); container(g, x + 2, y + 7, 10, 5, pick2(['#c85a3a', '#3a78b0', '#e0b030', '#4a9a5a'], k, 5)); }
      for (const px of [70, 200, 300]) {
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px + 3, coastV(px) - 60, 10, 66);
        g.fillStyle = '#9a958a'; g.fillRect(px, coastV(px) - 62, 10, 68); g.fillStyle = '#c2bdb0'; g.fillRect(px, coastV(px) - 62, 2, 68);
        for (let k = 0; k < 4; k++) glowDotT(g, px + 5, coastV(px) - 55 + k * 16, 3, 'rgba(255,220,140,.8)');
      }
      for (const cx of [130, 250]) { const y = coastV(cx) + 22; g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + 4, y + 4); g.lineTo(cx + 4, y - 40); g.stroke(); g.strokeStyle = '#e0a020'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, y - 44); g.stroke(); g.fillStyle = '#e0a020'; g.fillRect(cx - 6, y - 4, 12, 8); }
    }
  } },
  // ---------------- 第 3 關 ----------------
  { d: (g, v0, v1, sp) => {
    g.fillStyle = '#4e5257'; g.fillRect(0, v0, W, v1 - v0);
    grain(g, v0, v1, 301, 0.08);
    // 運河
    for (let v = Math.floor(v0 / 2) * 2; v < v1; v += 2) { const c = canalAt(v); if (c !== null) { const t = Math.abs(-v - c) / 30; g.fillStyle = t > 0.8 ? '#8a8a84' : rgb(mixC([40, 110, 150], [24, 80, 120], 1 - t)); g.fillRect(0, v, W, 2.2); } }
    const resRoofs = [[176, 82, 62], [150, 98, 70], [96, 102, 110], [190, 186, 176], [120, 72, 56]];
    const dtRoofs = [[120, 130, 142], [88, 98, 112], [150, 158, 166], [70, 78, 92], [180, 186, 190]];
    const indRoofs = [[150, 150, 144], [122, 128, 120], [168, 160, 140], [110, 112, 116]];
    cells(CITY_BW, CITY_BH, v0, v1, 30, (i, j, x, v) => {
      const bx = cityRoadX(i) + CITY_RW / 2, bv = v + CITY_RW / 2, bw = CITY_BW - CITY_RW, bh = CITY_BH - CITY_RW;
      const d = -(bv + bh / 2);
      if (canalAt(bv) !== null || canalAt(bv + bh) !== null || canalAt(bv + bh / 2) !== null) return;
      const district = d < 1300 ? 0 : d < 2700 ? 1 : 2;
      g.fillStyle = '#8b8d88'; g.fillRect(bx, bv, bw, bh);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(bx, bv, bw, 1.5);
      const kind = hash(i, j, 31);
      if (kind < 0.13) {
        g.fillStyle = '#5a8c42'; g.fillRect(bx + 3, bv + 3, bw - 6, bh - 6);
        g.strokeStyle = '#d0c4a0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(bx + 3, bv + bh * 0.7); g.bezierCurveTo(bx + bw * 0.3, bv + bh * 0.2, bx + bw * 0.7, bv + bh * 0.9, bx + bw - 3, bv + bh * 0.3); g.stroke();
        if (district === 1) { g.fillStyle = '#3a8ab8'; g.beginPath(); g.ellipse(bx + bw / 2, bv + bh / 2, 14, 10, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(bx + bw / 2, bv + bh / 2, 4, 3, 0, 0, TAU); g.fill(); }
        for (let k = 0; k < 10; k++) tree2(g, bx + 9 + hash(k, i, j) * (bw - 18), bv + 9 + hash(i, k, j) * (bh - 18), 4 + hash(k, j, 2) * 3);
        return;
      }
      if (district === 0) {
        // 住宅：小房子＋院子＋樹
        g.fillStyle = '#76965a'; g.fillRect(bx + 2, bv + 2, bw - 4, bh - 4);
        for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 3; c2++) {
          if (hash(i * 3 + c2, j * 3 + r, 32) < 0.15) continue;
          const hx = bx + 5 + c2 * 26, hv = bv + 5 + r * 34, roof = pick2(resRoofs, i * 3 + c2, j * 3 + r);
          g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(hx + 3, hv + 3, 18, 14);
          g.fillStyle = rgb(roof, 1.2); g.fillRect(hx, hv, 18, 7); g.fillStyle = rgb(roof, 0.85); g.fillRect(hx, hv + 7, 18, 7);
          if (hash(c2, r, i + j) > 0.6) tree2(g, hx + 22, hv + 20, 3.5);
          if (hash(r, c2, i - j) > 0.75) { g.fillStyle = '#4ab0d8'; g.fillRect(hx + 2, hv + 18, 9, 6); }
        }
        return;
      }
      const lots = district === 2
        ? (kind < 0.55 ? [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] : [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]])
        : (kind < 0.45 ? [[0, 0, 1, 1]] : kind < 0.75 ? [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] : [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1, 0.5]]);
      lots.forEach((l, n) => {
        const lx = bx + l[0] * bw + 4, lv = bv + l[1] * bh + 4, lw = l[2] * bw - 8, lh = l[3] * bh - 8;
        const tall = district === 1 ? 8 + hash(i * 7 + n, j, 32) * 22 : 3 + hash(i * 7 + n, j, 32) * 5;
        const pal = district === 1 ? dtRoofs : indRoofs, roof = pick2(pal, i + n * 3, j * 5 + n);
        // 長長的影子
        g.fillStyle = 'rgba(0,0,0,.38)';
        g.beginPath(); g.moveTo(lx + lw, lv); g.lineTo(lx + lw + tall * 0.6, lv + tall); g.lineTo(lx + lw + tall * 0.6, lv + lh + tall); g.lineTo(lx + tall * 0.6, lv + lh + tall); g.lineTo(lx, lv + lh); g.lineTo(lx + lw, lv + lh); g.closePath(); g.fill();
        const glass = district === 1 && hash(i, j * 3 + n, 37) > 0.45;
        if (glass) {
          const gr = g.createLinearGradient(lx, lv, lx + lw, lv + lh); gr.addColorStop(0, '#9ec4dc'); gr.addColorStop(0.45, '#3f6684'); gr.addColorStop(1, '#22384c');
          g.fillStyle = gr; g.fillRect(lx, lv, lw, lh);
          g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(lx, lv + lh * 0.3); g.lineTo(lx + lw * 0.3, lv); g.lineTo(lx + lw * 0.45, lv); g.lineTo(lx, lv + lh * 0.45); g.fill();
          g.strokeStyle = 'rgba(200,230,255,.25)'; g.lineWidth = 0.6;
          for (let k = 6; k < lw; k += 6) { g.beginPath(); g.moveTo(lx + k, lv); g.lineTo(lx + k, lv + lh); g.stroke(); }
        } else {
          const gr = g.createLinearGradient(lx, lv, lx + lw, lv + lh); gr.addColorStop(0, rgb(roof, 1.15)); gr.addColorStop(1, rgb(roof, 0.88));
          g.fillStyle = gr; g.fillRect(lx, lv, lw, lh);
          g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(lx + 3, lv + 3, lw - 6, lh - 6); g.fillStyle = rgb(roof, 1.02); g.fillRect(lx + 4, lv + 4, lw - 8, lh - 8);
          if (district === 2) {
            g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 1;
            for (let k = 5; k < (lw > lh ? lw : lh) - 4; k += 4) { g.beginPath(); if (lw > lh) { g.moveTo(lx + k, lv + 4); g.lineTo(lx + k, lv + lh - 4); } else { g.moveTo(lx + 4, lv + k); g.lineTo(lx + lw - 4, lv + k); } g.stroke(); }
            if (hash(i, j, 38 + n) > 0.55) { for (let k = 0; k < 2; k++) { const tx = lx + lw * (0.3 + k * 0.4), tv = lv + lh / 2; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(tx + 3, tv + 4, 8, 0, TAU); g.fill(); dome(g, tx, tv, 7.5); } }
          } else {
            const r2 = hash(i, j * 5 + n, 39);
            if (r2 < 0.3) solarFarm(g, lx + 6, lv + 6, Math.max(1, ((lw - 12) / 9) | 0), Math.max(1, ((lh - 12) / 7) | 0));
            else if (r2 < 0.5) { g.fillStyle = '#5f8a46'; g.fillRect(lx + 5, lv + 5, lw - 10, lh - 10); for (let k = 0; k < 4; k++) tree2(g, lx + 9 + hash(k, n, i) * (lw - 18), lv + 9 + hash(n, k, j) * (lh - 18), 3.4); }
            else for (let k = 0; k < 3; k++) { const ax = lx + 6 + hash(k, n, i + j * 9) * (lw - 18), av = lv + 6 + hash(n, k, i - j) * (lh - 18); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(ax + 2, av + 2, 8, 7); g.fillStyle = '#c9cdd0'; g.fillRect(ax, av, 8, 7); g.fillStyle = '#8d9398'; g.beginPath(); g.arc(ax + 4, av + 3.5, 2.4, 0, TAU); g.fill(); }
          }
        }
        if (district === 1) { // 霓虹燈邊
          g.strokeStyle = n % 2 ? 'rgba(255,80,200,.75)' : 'rgba(70,220,255,.8)'; g.lineWidth = 1;
          g.strokeRect(lx + 1, lv + 1, lw - 2, lh - 2);
          if (hash(i, j, 36 + n) > 0.75) { g.strokeStyle = '#f0e090'; g.lineWidth = 1.2; g.beginPath(); g.arc(lx + lw / 2, lv + lh / 2, 7, 0, TAU); g.stroke(); g.fillStyle = '#f0e090'; g.font = '700 8px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', lx + lw / 2, lv + lh / 2 + 0.5); }
        }
        const tv = lv + lh / 2;
        if (lw > 30 && lh > 30 && j < -3 && hash(i, j, 36 + n) > 0.84 && tv >= v0 && tv < v1) sp.push({ type: 'turret', x: lx + lw / 2, v: tv });
      });
    });
    // 馬路標線、斑馬線、車
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.setLineDash([7, 8]);
    for (let i = 0; i <= 3; i++) { g.beginPath(); g.moveTo(cityRoadX(i), v0); g.lineTo(cityRoadX(i), v1); g.stroke(); }
    for (let j = Math.floor(v0 / CITY_BH); j <= Math.floor(v1 / CITY_BH) + 1; j++) { if (canalAt(j * CITY_BH) !== null) continue; g.beginPath(); g.moveTo(0, j * CITY_BH); g.lineTo(W, j * CITY_BH); g.stroke(); }
    g.setLineDash([]);
    for (let j = Math.floor(v0 / CITY_BH); j <= Math.floor(v1 / CITY_BH) + 1; j++) for (let i = 0; i <= 3; i++) {
      const cx = cityRoadX(i), cv = j * CITY_BH;
      g.fillStyle = 'rgba(255,255,255,.5)';
      for (let k = -7; k <= 7; k += 3) { g.fillRect(cx + k, cv - 12, 1.6, 4); g.fillRect(cx + k, cv + 8, 1.6, 4); }
      for (let k = 0; k < 3; k++) { const cvv = cv + 20 + hash(i, j * 3 + k, 71) * 80; if (hash(i, j * 3 + k, 72) > 0.4 && canalAt(cvv) === null) car(g, cx + (k % 2 ? 4 : -4), cvv, true, pick2(['#e04a3a', '#f0f0ea', '#3a6ab0', '#e0b030', '#2a2a2a', '#5ac0d0'], i * 7 + k, j)); }
    }
    // 運河上的橋
    for (const c of [1700, 3300]) {
      const cv = -c; if (cv + 40 < v0 || cv - 40 > v1) continue;
      for (let i = 0; i <= 3; i++) { const x = cityRoadX(i); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 7, cv - 30, 18, 64); g.fillStyle = '#7d8084'; g.fillRect(x - 9, cv - 32, 18, 64); g.fillStyle = '#b8bcc0'; g.fillRect(x - 10, cv - 32, 2, 64); g.fillRect(x + 8, cv - 32, 2, 64); }
    }
  } },
  // ---------------- 第 4 關 ----------------
  { H: H4, C: C4, k: 2.0, d: (g, v0, v1, sp) => {
    grain(g, v0, v1, 401, 0.07);
    // 乾河床
    g.strokeStyle = 'rgba(170,130,80,.45)'; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); for (let v = v0 - 20; v <= v1 + 20; v += 6) { const x = 80 + Math.sin(v * 0.004 + 1) * 60 + Math.sin(v * 0.013) * 15; v === v0 - 20 ? g.moveTo(x, v) : g.lineTo(x, v); } g.stroke();
    g.strokeStyle = 'rgba(120,90,60,.25)'; g.lineWidth = 3; g.stroke();
    // 碎石路
    g.beginPath(); for (let v = v0 - 20; v <= v1 + 20; v += 5) { const x = 180 + Math.sin(v * 0.003) * 110; v === v0 - 20 ? g.moveTo(x, v) : g.lineTo(x, v); }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 15; g.stroke(); g.strokeStyle = '#c9a46a'; g.lineWidth = 11; g.stroke();
    g.strokeStyle = 'rgba(120,90,50,.35)'; g.lineWidth = 1; g.setLineDash([3, 4]); g.stroke(); g.setLineDash([]);
    // 岩石
    cells(60, 60, v0, v1, 20, (i, j, x, v) => {
      if (hash(i, j, 45) < 0.75) return;
      const n = 2 + ((hash(i, j, 46) * 4) | 0);
      for (let k = 0; k < n; k++) {
        const rx = x + hash(k, i, j) * 60, rv = v + hash(j, k, i) * 60, r = 3 + hash(i + k, j, 47) * 6;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(rx + 2.5, rv + 3, r, r * 0.8, 0, 0, TAU); g.fill();
        const gr = g.createRadialGradient(rx - r * 0.4, rv - r * 0.4, 0, rx, rv, r); gr.addColorStop(0, '#c9a888'); gr.addColorStop(1, '#7d6248');
        g.fillStyle = gr; g.beginPath(); g.ellipse(rx, rv, r, r * 0.8, 0, 0, TAU); g.fill();
      }
    });
    // 綠洲
    for (let j = Math.floor(v0 / 360) - 1; j <= Math.floor(v1 / 360) + 1; j++) {
      const o = oasisAt(j);
      if (o) {
        g.fillStyle = 'rgba(120,150,70,.8)'; g.beginPath(); g.arc(o.x, o.v, o.r + 11, 0, TAU); g.fill();
        const gr = g.createRadialGradient(o.x - 5, o.v - 5, 2, o.x, o.v, o.r); gr.addColorStop(0, '#6ad0e0'); gr.addColorStop(1, '#2c7aa0');
        g.fillStyle = gr; g.beginPath(); g.arc(o.x, o.v, o.r, 0, TAU); g.fill();
        for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + j; palm(g, o.x + Math.cos(a) * (o.r + 8), o.v + Math.sin(a) * (o.r + 8), 6); }
      }
      // 基地
      const b = baseAt(j); if (!b) continue;
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(b.x0 + 5, b.v0 + 5, b.x1 - b.x0, b.v1 - b.v0);
      g.fillStyle = '#a9a699'; g.fillRect(b.x0, b.v0, b.x1 - b.x0, b.v1 - b.v0);
      for (let x = b.x0; x < b.x1; x += 20) for (let v = b.v0; v < b.v1; v += 20) { g.fillStyle = `rgba(0,0,0,${0.03 + hash(x, v, 409) * 0.06})`; g.fillRect(x, v, 20, 20); }
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1;
      for (let x = b.x0; x < b.x1; x += 20) { g.beginPath(); g.moveTo(x, b.v0); g.lineTo(x, b.v1); g.stroke(); }
      for (let v = b.v0; v < b.v1; v += 20) { g.beginPath(); g.moveTo(b.x0, v); g.lineTo(b.x1, v); g.stroke(); }
      const rx = (b.x0 + b.x1) / 2;
      g.fillStyle = '#55585b'; g.fillRect(rx - 18, b.v0, 36, b.v1 - b.v0);
      g.fillStyle = '#f1efe6'; for (let v = b.v0 + 10; v < b.v1 - 10; v += 22) g.fillRect(rx - 1.5, v, 3, 12);
      for (let k = 0; k < 6; k++) g.fillRect(rx - 15 + k * 5, b.v1 - 14, 3, 10);
      for (let v = b.v0 + 8; v < b.v1; v += 24) { glowDotT(g, rx - 19, v, 3, 'rgba(80,220,255,.9)'); glowDotT(g, rx + 19, v, 3, 'rgba(80,220,255,.9)'); }
      for (const hx of [b.x0 + 14, b.x1 - 50]) {
        const hv = b.v0 + 30;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(hx + 5, hv + 5, 36, 54);
        const gr = g.createLinearGradient(hx, 0, hx + 36, 0); gr.addColorStop(0, '#5f6a5c'); gr.addColorStop(0.4, '#b3bfae'); gr.addColorStop(1, '#5f6a5c');
        g.fillStyle = gr; g.fillRect(hx, hv, 36, 54);
        g.strokeStyle = 'rgba(0,0,0,.2)'; for (let v = hv + 6; v < hv + 54; v += 6) { g.beginPath(); g.moveTo(hx, v); g.lineTo(hx + 36, v); g.stroke(); }
      }
      // 起降坪（發光圓環）
      const px = b.x0 + 34, pv = b.v0 + 210;
      g.fillStyle = '#6c7076'; g.beginPath(); g.arc(px, pv, 16, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(90,230,255,.9)'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, pv, 13, 0, TAU); g.stroke();
      g.fillStyle = '#f0e8c0'; g.font = '700 10px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', px, pv + 0.5);
      for (let k = 0; k < 3; k++) { const fx = b.x0 + 26 + k * 18, fv = b.v1 - 40; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(fx + 3, fv + 4, 7, 0, TAU); g.fill(); dome(g, fx, fv, 7); }
      dish(g, b.x1 - 30, b.v0 + 112, 9, hash(j, 1, 410) * TAU);
      g.strokeStyle = '#7a7d80'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(b.x0 + 26, b.v1 - 40); g.lineTo(b.x0, b.v1 - 40); g.stroke();
      g.fillStyle = '#e0b030'; for (let x = b.x0; x < b.x1; x += 12) { g.fillRect(x, b.v0, 6, 3); g.fillRect(x + 6, b.v1 - 3, 6, 3); }
      for (const [tx, tv] of [[b.x0 + 32, b.v0 + 120], [b.x1 - 32, b.v0 + 150], [b.x1 - 30, b.v1 - 40]]) {
        if (tv >= v0 && tv < v1) sp.push({ type: 'turret', x: tx, v: tv });
      }
    }
  } },
  // ---------------- 第 5 關 ----------------
  { H: H5, C: C5, k: 0.9, d: (g, v0, v1) => {
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1;
    cells(30, 24, v0, v1, 10, (i, j, x, v) => {
      if (hash(i, j, 52) < 0.65 || cloudH(x, v) > 0) return;
      g.beginPath(); g.moveTo(x, v); g.lineTo(x + 7, v + 1); g.stroke();
    });
  } },
);
