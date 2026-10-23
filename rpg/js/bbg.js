'use strict';
// 曉鐘傳說：戰鬥背景（多層視差，依畫面比例產生）
const BBG = {
  cache: {},
  get(kind, aspect) {
    const W = 320, H = clamp(Math.round(W * aspect / 8) * 8, 150, 420);
    const key = kind + H;
    if (this.cache[key]) return this.cache[key];
    const hz = Math.round(H * (aspect > 0.9 ? 0.36 : 0.46)); // 地平線
    const mk = (w = W) => { const c = document.createElement('canvas'); c.width = w; c.height = H; return c; };
    const sky = mk(), far = mk(W * 2), mid = mk(), ground = mk(), fg = mk();
    const r = seeded(kind.length * 977 + 31);
    const sg = sky.getContext('2d'), fgx = far.getContext('2d'), mg = mid.getContext('2d'), gg = ground.getContext('2d'), fgg = fg.getContext('2d');
    // 帶抖動的漸層天空
    const band = (g, y0, y1, c0, c1, w = W) => { for (let y = y0; y < y1; y++) { const t = (y - y0) / Math.max(1, y1 - y0); for (let x = 0; x < w; x += 1) { const d = ((x + y) & 1) * 0.06 - 0.03; g.fillStyle = mix(c0, c1, clamp(t + d, 0, 1)); g.fillRect(x, y, 1, 1); } } };
    const fastBand = (g, y0, y1, c0, c1, w = W) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, y0, w, y1 - y0); };
    void band;
    const ridge = (g, w, y0, amp, col, fr, seed, rough = 0.3) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= w; x += 2) { const xx = x / w * TAU; g.lineTo(x, y0 - Math.abs(Math.sin(x * fr + seed)) * amp - Math.sin(x * fr * 2.7 + seed) * amp * rough - (fbm(x / 30, seed, 3) - 0.5) * amp * 0.6); void xx; } g.lineTo(w, H); g.fill(); };
    const tileRidge = (g, y0, amp, col, n, seed) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W * 2; x += 2) { const a = x / (W * 2) * TAU * n; g.lineTo(x, y0 - (Math.sin(a + seed) * 0.5 + 0.5) * amp - (Math.sin(a * 2.3 + seed * 2) * 0.5 + 0.5) * amp * 0.35); } g.lineTo(W * 2, H); g.fill(); };
    const cloud = (g, x, y, s, col, sh) => { g.fillStyle = sh; for (const [dx, dy, rr] of [[0, 2, 7], [8, 1, 9], [17, 3, 6], [-7, 4, 5]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s + 2, rr * s, 0, TAU); g.fill(); } g.fillStyle = col; for (const [dx, dy, rr] of [[0, 2, 7], [8, 1, 9], [17, 3, 6], [-7, 4, 5]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, rr * s, 0, TAU); g.fill(); } g.fillRect(x - 10 * s, y + 4 * s, 30 * s, 5 * s); };
    const floor = (g, top, c1, c2, c3, lines, noise = 0.25) => {
      for (let y = top; y < H; y++) { const t = (y - top) / (H - top); g.fillStyle = mix(c1, c2, t); g.fillRect(0, y, W, 1); }
      const rr = seeded(top * 7 + c1.length);
      for (let i = 0; i < W * (H - top) * noise / 40; i++) { const y = top + Math.pow(rr(), 0.8) * (H - top), s = 1 + (y - top) / (H - top) * 3; g.fillStyle = rr() < 0.5 ? c3 : lighten(mix(c1, c2, (y - top) / (H - top)), 0.12); g.fillRect(rr() * W, y, s, Math.max(1, s * 0.5)); }
      if (lines) { g.strokeStyle = c3; g.globalAlpha = 0.5; for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(W / 2 + i * 12, top); g.lineTo(W / 2 + i * 70, H); g.stroke(); } for (let k = 1; k < 7; k++) { const y = top + Math.pow(k / 7, 1.7) * (H - top); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.globalAlpha = 1; }
    };
    const treeBlob = (g, x, y, s, c) => { g.fillStyle = c[0]; g.beginPath(); g.arc(x, y, 9 * s, 0, TAU); g.fill(); g.fillStyle = c[1]; g.beginPath(); g.arc(x - 2 * s, y - 2 * s, 7 * s, 0, TAU); g.fill(); g.fillStyle = c[2]; g.beginPath(); g.arc(x - 4 * s, y - 4 * s, 3.5 * s, 0, TAU); g.fill(); };
    const tuft = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y - 3, 1, 3); g.fillRect(x + 2, y - 4, 1, 4); g.fillRect(x + 4, y - 2, 1, 2); g.fillRect(x - 2, y - 2, 1, 2); };
    const pillars = (g, n, col, hi, lo, top, h, w = 16) => { for (let i = 0; i < n; i++) { const x = (i + 0.5) * W / n - w / 2; g.fillStyle = col; g.fillRect(x, top, w, h); g.fillStyle = hi; g.fillRect(x + 2, top, 3, h); g.fillStyle = lo; g.fillRect(x + w - 4, top, 4, h); g.fillStyle = lighten(col, 0.1); g.fillRect(x - 3, top, w + 6, 5); g.fillRect(x - 3, top + h - 5, w + 6, 5); g.fillStyle = lo; g.fillRect(x - 3, top + h, w + 6, 2); } };
    const stars = (g, n, col, ymax, w = W) => { for (let i = 0; i < n; i++) { g.fillStyle = col; const s = r() < 0.15 ? 2 : 1; g.fillRect((r() * w) | 0, (r() * ymax) | 0, s, s); } };
    let anim = null;
    switch (kind) {
      case 'field': case 'forest': {
        fastBand(sg, 0, hz, '#3a8ae0', '#bfe6ff'); sg.fillStyle = 'rgba(255,255,230,.6)'; sg.beginPath(); sg.arc(W * 0.8, hz * 0.25, 14, 0, TAU); sg.fill();
        for (let i = 0; i < 7; i++) cloud(fgx, r() * W * 2, 10 + r() * hz * 0.45, 0.6 + r() * 0.5, '#ffffff', '#d8ecff');
        tileRidge(fgx, hz - 4, 26, '#8ab8d8', 3, 1); tileRidge(fgx, hz + 2, 14, '#6aa0c0', 5, 2);
        if (kind === 'forest') { for (let i = 0; i < 26; i++) treeBlob(mg, i * 13 + r() * 6, hz + 2 + r() * 6, 1 + r() * 0.3, ['#1f4a2a', '#2f6a38', '#4a8a48']); mg.fillStyle = '#1f4a2a'; mg.fillRect(0, hz + 6, W, 8); }
        else { ridge(mg, W, hz + 6, 10, '#4f9a50', 0.04, 3); for (let i = 0; i < 6; i++) treeBlob(mg, r() * W, hz + 2 + r() * 4, 0.7, ['#2a6a34', '#3a8a40', '#6ac850']); }
        floor(gg, hz + 8, '#5cb446', '#3f8a32', '#4a9a3a', false, 0.5);
        for (let i = 0; i < 40; i++) tuft(gg, r() * W, hz + 12 + r() * (H - hz - 12), '#3a7a2a');
        for (let i = 0; i < 12; i++) { fgg.fillStyle = pick(['#ff7aa0', '#fff4a0', '#ffffff']); fgg.fillRect(r() * W, hz + 14 + r() * (H - hz - 14), 2, 2); }
        for (const x of [4, W - 30]) for (let i = 0; i < 9; i++) tuft(fgg, x + i * 3, H - 1, '#2a6a24');
        break;
      }
      case 'shore': {
        fastBand(sg, 0, hz, '#3a90e8', '#c8ecff');
        for (let i = 0; i < 6; i++) cloud(fgx, r() * W * 2, 8 + r() * hz * 0.4, 0.7 + r() * 0.4, '#ffffff', '#d8ecff');
        fgx.fillStyle = '#2f78d4'; fgx.fillRect(0, hz - 14, W * 2, 30); fgx.fillStyle = '#5aa8ee'; for (let i = 0; i < 40; i++) fgx.fillRect(r() * W * 2, hz - 12 + r() * 26, 6 + r() * 6, 1);
        mg.fillStyle = '#f4f8ff'; for (let x = 0; x < W; x += 2) mg.fillRect(x, hz + 13 + Math.sin(x * 0.2) * 1.5, 2, 2);
        floor(gg, hz + 15, '#ecd28e', '#d8b870', '#c8a868', false, 0.6);
        for (let i = 0; i < 8; i++) { gg.fillStyle = '#f4e8d0'; gg.fillRect(r() * W, hz + 20 + r() * (H - hz - 20), 3, 2); }
        anim = 'waves';
        break;
      }
      case 'cave': case 'mine': {
        fastBand(sg, 0, H, '#120c08', '#2e2218');
        for (let i = 0; i < 16; i++) { const x = r() * W * 2, h = 16 + r() * 40; fgx.fillStyle = '#20160e'; fgx.beginPath(); fgx.moveTo(x - 10, 0); fgx.lineTo(x, h); fgx.lineTo(x + 10, 0); fgx.fill(); fgx.fillStyle = '#3a2a1c'; fgx.fillRect(x - 1, 0, 2, h * 0.7); }
        tileRidge(fgx, hz, 18, '#2a1e16', 4, 2);
        if (kind === 'mine') { for (let i = 0; i < 4; i++) { const x = 20 + i * 80; mg.fillStyle = '#4a2e18'; mg.fillRect(x, hz - 40, 6, 56); mg.fillRect(x + 44, hz - 40, 6, 56); mg.fillRect(x - 4, hz - 44, 58, 6); mg.fillStyle = '#7a5030'; mg.fillRect(x + 1, hz - 40, 2, 56); mg.fillRect(x - 4, hz - 44, 58, 2); mg.fillStyle = '#ffb040'; mg.fillRect(x + 22, hz - 36, 4, 5); } }
        else { for (let i = 0; i < 10; i++) { mg.fillStyle = '#5a8a3a'; mg.fillRect(r() * W, hz + r() * 8, 4, 2); } for (let i = 0; i < 5; i++) { const x = r() * W; mg.fillStyle = '#3a2a1e'; mg.beginPath(); mg.moveTo(x - 7, hz + 14); mg.lineTo(x, hz - 6 - r() * 10); mg.lineTo(x + 7, hz + 14); mg.fill(); } }
        floor(gg, hz + 12, '#5a4838', '#3a2c20', '#4a3a2c', true, 0.5);
        if (kind === 'mine') for (const yy of [0.6, 0.85]) { gg.fillStyle = '#a8a8b8'; gg.fillRect(0, hz + 12 + (H - hz - 12) * yy, W, 2); }
        anim = 'dust';
        break;
      }
      case 'tower': {
        fastBand(sg, 0, H, '#2a3040', '#5a6274');
        for (let y = 0; y < hz + 12; y += 8) for (let x = (y / 8) % 2 ? 0 : 10; x < W * 2; x += 20) { fgx.fillStyle = '#3e4658'; fgx.fillRect(x, y, 19, 7); fgx.fillStyle = '#4a5468'; fgx.fillRect(x, y, 19, 1); }
        for (const x of [60, 220, 380, 540]) { fgx.fillStyle = '#1a2030'; fgx.fillRect(x, 20, 30, 40); fgx.fillStyle = '#7ab0e0'; fgx.fillRect(x + 3, 23, 24, 34); fgx.fillStyle = '#c8e8ff'; fgx.fillRect(x + 5, 25, 7, 30); fgx.fillStyle = '#1a2030'; fgx.fillRect(x + 14, 23, 2, 34); }
        pillars(mg, 4, '#8a909e', '#b8bec8', '#5a606e', hz - 50, 62, 14);
        floor(gg, hz + 12, '#8a909c', '#5a606c', '#6a707c', true, 0.3);
        anim = 'wind';
        break;
      }
      case 'desert': {
        fastBand(sg, 0, hz, '#f08a40', '#fff0c0'); sg.fillStyle = '#fff8e0'; sg.beginPath(); sg.arc(W * 0.75, hz * 0.35, 16, 0, TAU); sg.fill(); sg.fillStyle = 'rgba(255,248,224,.3)'; sg.beginPath(); sg.arc(W * 0.75, hz * 0.35, 26, 0, TAU); sg.fill();
        tileRidge(fgx, hz + 2, 22, '#e0a860', 3, 1); tileRidge(fgx, hz + 6, 12, '#d49850', 5, 4);
        for (let i = 0; i < 2; i++) { const x = 40 + r() * (W - 80); mg.fillStyle = '#c8904a'; mg.beginPath(); mg.moveTo(x - 30, hz + 8); mg.lineTo(x, hz - 26); mg.lineTo(x + 30, hz + 8); mg.fill(); mg.fillStyle = '#e8b870'; mg.beginPath(); mg.moveTo(x - 30, hz + 8); mg.lineTo(x, hz - 26); mg.lineTo(x - 4, hz + 8); mg.fill(); }
        floor(gg, hz + 8, '#ecd28e', '#d4b06a', '#c8a060', false, 0.5);
        for (let y = hz + 14; y < H; y += 7) { gg.strokeStyle = 'rgba(180,140,80,.5)'; gg.beginPath(); for (let x = 0; x <= W; x += 4) gg.lineTo(x, y + Math.sin(x * 0.05 + y) * 2); gg.stroke(); }
        anim = 'heat';
        break;
      }
      case 'tomb': {
        fastBand(sg, 0, H, '#1e1608', '#4a3820');
        for (let y = 0; y < hz + 12; y += 10) for (let x = (y / 10) % 2 ? 0 : 12; x < W * 2; x += 24) { fgx.fillStyle = '#6a5028'; fgx.fillRect(x, y, 23, 9); fgx.fillStyle = '#7a6034'; fgx.fillRect(x, y, 23, 1); if (r() < 0.2) { fgx.fillStyle = '#3a2810'; fgx.fillRect(x + 8, y + 2, 2, 5); fgx.fillRect(x + 12, y + 3, 4, 1); } }
        pillars(mg, 5, '#b8904e', '#e0c080', '#7a5a2a', hz - 54, 66, 16);
        for (let i = 0; i < 5; i++) { const x = (i + 0.5) * W / 5; mg.fillStyle = '#3a7ad8'; mg.fillRect(x - 2, hz - 50, 4, 4); }
        floor(gg, hz + 12, '#c09e5c', '#7a5a30', '#a08040', true, 0.3);
        anim = 'torch';
        break;
      }
      case 'snow': {
        fastBand(sg, 0, hz, '#7aa0d0', '#e8f2fc');
        for (let i = 0; i < 5; i++) cloud(fgx, r() * W * 2, 8 + r() * hz * 0.4, 0.8, '#f4f8ff', '#c8d8ec');
        tileRidge(fgx, hz - 2, 34, '#b8c8e0', 3, 2); tileRidge(fgx, hz + 4, 14, '#dce8f6', 5, 5);
        for (let i = 0; i < 12; i++) { const x = r() * W; const s = 0.8 + r() * 0.5; mg.fillStyle = '#2a5a44'; mg.beginPath(); mg.moveTo(x, hz - 18 * s); mg.lineTo(x + 7 * s, hz + 8); mg.lineTo(x - 7 * s, hz + 8); mg.fill(); mg.fillStyle = '#f4f8ff'; mg.beginPath(); mg.moveTo(x, hz - 18 * s); mg.lineTo(x + 3 * s, hz - 8 * s); mg.lineTo(x - 3 * s, hz - 8 * s); mg.fill(); }
        floor(gg, hz + 8, '#eef4ff', '#c8d4e8', '#d8e4f4', false, 0.4);
        anim = 'snow';
        break;
      }
      case 'ice': {
        fastBand(sg, 0, H, '#1a3a6a', '#7ab4e0');
        for (let i = 0; i < 18; i++) { const x = r() * W * 2, h = 30 + r() * 60; fgx.fillStyle = '#9ad0f0'; fgx.beginPath(); fgx.moveTo(x - 9, hz + 10); fgx.lineTo(x, hz + 10 - h); fgx.lineTo(x + 9, hz + 10); fgx.fill(); fgx.fillStyle = '#d8f2ff'; fgx.beginPath(); fgx.moveTo(x - 9, hz + 10); fgx.lineTo(x, hz + 10 - h); fgx.lineTo(x - 2, hz + 10); fgx.fill(); }
        for (let i = 0; i < 8; i++) { const x = r() * W, h = 14 + r() * 20; mg.fillStyle = '#c8ecff'; mg.beginPath(); mg.moveTo(x - 5, hz + 12); mg.lineTo(x, hz + 12 - h); mg.lineTo(x + 5, hz + 12); mg.fill(); mg.fillStyle = '#ffffff'; mg.fillRect(x - 1, hz + 14 - h, 1, h - 6); }
        floor(gg, hz + 12, '#bfe2f6', '#7ab4e0', '#9ad0f0', true, 0.2);
        for (let i = 0; i < 10; i++) { gg.fillStyle = 'rgba(255,255,255,.6)'; const x = r() * W, y = hz + 16 + r() * (H - hz - 16); gg.fillRect(x, y, 10, 1); }
        anim = 'sparkle';
        break;
      }
      case 'island': {
        fastBand(sg, 0, hz, '#1a0e2a', '#6a3a5a'); stars(sg, 50, '#ffd0ff', hz * 0.7);
        sg.fillStyle = '#e8d0ff'; sg.beginPath(); sg.arc(W * 0.2, hz * 0.3, 10, 0, TAU); sg.fill(); sg.fillStyle = '#1a0e2a'; sg.beginPath(); sg.arc(W * 0.2 + 4, hz * 0.3 - 2, 9, 0, TAU); sg.fill();
        tileRidge(fgx, hz, 20, '#3a2448', 4, 1);
        for (let i = 0; i < 6; i++) { const x = r() * W; mg.strokeStyle = '#2a1a30'; mg.lineWidth = 2; mg.beginPath(); mg.moveTo(x, hz + 10); mg.lineTo(x, hz - 14); mg.lineTo(x - 6, hz - 22); mg.moveTo(x, hz - 6); mg.lineTo(x + 7, hz - 14); mg.stroke(); }
        floor(gg, hz + 10, '#665a7c', '#3a3050', '#4a3e5a', false, 0.5);
        anim = 'mist';
        break;
      }
      case 'star': {
        fastBand(sg, 0, H, '#05031a', '#2a1a5a'); stars(sg, 140, '#ffffff', H * 0.9); stars(sg, 40, '#ffe8a0', H * 0.9);
        for (let i = 0; i < 3; i++) { const x = r() * W, y = r() * hz, rr2 = 30 + r() * 40; const gr = sg.createRadialGradient(x, y, 0, x, y, rr2); gr.addColorStop(0, pick(['rgba(160,90,255,.25)', 'rgba(80,160,255,.22)', 'rgba(255,120,200,.2)'])); gr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = gr; sg.fillRect(x - rr2, y - rr2, rr2 * 2, rr2 * 2); }
        for (let i = 0; i < 10; i++) { const x = r() * W * 2, y = 10 + r() * hz, s2 = 3 + r() * 6; fgx.fillStyle = '#6a5ab0'; fgx.beginPath(); fgx.moveTo(x, y - s2); fgx.lineTo(x + s2 * 0.6, y); fgx.lineTo(x, y + s2); fgx.lineTo(x - s2 * 0.6, y); fgx.fill(); fgx.fillStyle = '#c8b8ff'; fgx.fillRect(x - 1, y - s2 * 0.6, 1, s2); }
        mg.fillStyle = '#1a1440'; mg.beginPath(); mg.ellipse(W / 2, hz + 30, W * 0.62, 26, 0, 0, TAU); mg.fill();
        floor(gg, hz + 12, '#3a3270', '#141030', '#5a4aa0', true, 0.2);
        anim = 'sparkle';
        break;
      }
      case 'castle': case 'throne': {
        fastBand(sg, 0, H, kind === 'throne' ? '#0a0614' : '#140e20', kind === 'throne' ? '#3a1030' : '#3a2e50');
        if (kind === 'throne') { stars(sg, 50, '#ff80a0', hz); sg.fillStyle = 'rgba(200,30,70,.18)'; sg.beginPath(); sg.arc(W / 2, hz * 0.5, 60, 0, TAU); sg.fill(); sg.fillStyle = 'rgba(200,30,70,.25)'; sg.beginPath(); sg.arc(W / 2, hz * 0.5, 34, 0, TAU); sg.fill(); }
        else for (let y = 0; y < hz + 12; y += 9) for (let x = (y / 9) % 2 ? 0 : 11; x < W * 2; x += 22) { fgx.fillStyle = '#2a2040'; fgx.fillRect(x, y, 21, 8); fgx.fillStyle = '#342a4c'; fgx.fillRect(x, y, 21, 1); }
        if (kind === 'castle') for (const x of [90, 250, 410, 570]) { fgx.fillStyle = '#8a1030'; fgx.fillRect(x, 6, 26, 50); fgx.fillStyle = '#f2c14e'; fgx.fillRect(x, 6, 26, 2); fgx.fillRect(x + 11, 22, 4, 12); fgx.fillRect(x + 7, 26, 12, 4); fgx.fillStyle = '#8a1030'; fgx.beginPath(); fgx.moveTo(x, 56); fgx.lineTo(x + 13, 64); fgx.lineTo(x + 26, 56); fgx.fill(); }
        pillars(mg, kind === 'throne' ? 4 : 5, '#5d4f78', '#8a7aa8', '#3a2e50', hz - 60, 72, 16);
        floor(gg, hz + 12, '#4e4262', '#241c34', '#3a3050', true, 0.25);
        gg.fillStyle = '#8a1a34'; gg.beginPath(); gg.moveTo(W / 2 - 14, hz + 12); gg.lineTo(W / 2 + 14, hz + 12); gg.lineTo(W / 2 + 60, H); gg.lineTo(W / 2 - 60, H); gg.fill();
        gg.fillStyle = '#f2c14e'; gg.globalAlpha = 0.6; gg.fillRect(W / 2 - 14, hz + 12, 1, 1); gg.globalAlpha = 1;
        anim = kind === 'throne' ? 'embers' : 'torch';
        break;
      }
      default: fastBand(sg, 0, H, '#000', '#222');
    }
    // 靜態的圖層先合成成一張，減少每格的繪圖量
    const back = mk(), bg2 = back.getContext('2d');
    bg2.drawImage(sky, 0, 0); bg2.drawImage(far, W / 2, 0, W, H, 0, 0, W, H); bg2.drawImage(ground, 0, 0); bg2.drawImage(mid, 0, 0);
    return (this.cache[key] = { W, H, hz, back, fg, anim });
  },
  // 畫到戰鬥舞台
  draw(g, kind, rect, t) {
    const aspect = rect.h / rect.w, b = this.get(kind, aspect);
    const s = Math.max(rect.w / b.W, rect.h / b.H);
    const ox = rect.x + (rect.w - b.W * s) / 2, oy = rect.y + (rect.h - b.H * s) / 2;
    g.imageSmoothingEnabled = false;
    g.drawImage(b.back, ox, oy, b.W * s, b.H * s);
    return { ox, oy, s, b };
  },
  drawFg(g, info, rect, t) {
    const { ox, oy, s, b } = info;
    g.drawImage(b.fg, ox, oy, b.W * s, b.H * s);
    // 環境動畫
    if (Game.lowFx) return;
    const R = (i, k) => hash2(i, k, 5);
    switch (b.anim) {
      case 'snow': g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 60; i++) { const x = ((R(i, 1) * b.W + t * (8 + R(i, 2) * 10) + Math.sin(t + i) * 6) % b.W), y = (R(i, 3) * b.H + t * (14 + R(i, 4) * 14)) % b.H; g.fillRect(ox + x * s, oy + y * s, s * (R(i, 5) < 0.3 ? 2 : 1), s * (R(i, 5) < 0.3 ? 2 : 1)); } break;
      case 'dust': case 'mist': g.fillStyle = b.anim === 'mist' ? 'rgba(200,160,220,.35)' : 'rgba(255,230,190,.45)'; for (let i = 0; i < 30; i++) { const x = (R(i, 1) * b.W + Math.sin(t * 0.3 + i) * 10 + t * 2) % b.W, y = (R(i, 2) * b.H - t * (2 + R(i, 3) * 3) + b.H * 4) % b.H; g.fillRect(ox + x * s, oy + y * s, s, s); } break;
      case 'embers': for (let i = 0; i < 36; i++) { const x = (R(i, 1) * b.W + Math.sin(t * 0.8 + i) * 8) % b.W, y = (R(i, 2) * b.H - t * (10 + R(i, 3) * 14) + b.H * 50) % b.H; g.fillStyle = i % 3 ? '#ff5040' : '#ffb060'; g.fillRect(ox + x * s, oy + y * s, s, s); } break;
      case 'sparkle': for (let i = 0; i < 20; i++) { const ph = (t * 0.6 + R(i, 1)) % 1; if (ph > 0.3) continue; const a = Math.sin(ph / 0.3 * Math.PI); g.fillStyle = `rgba(255,255,255,${a})`; const x = R(i, 2) * b.W, y = b.hz + R(i, 3) * (b.H - b.hz); g.fillRect(ox + (x - 1) * s, oy + y * s, s * 3, s); g.fillRect(ox + x * s, oy + (y - 1) * s, s, s * 3); } break;
      case 'waves': g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 14; i++) { const x = (R(i, 1) * b.W + t * 6) % b.W, y = b.hz - 12 + R(i, 2) * 24; if (Math.sin(t * 2 + i) > 0.3) g.fillRect(ox + x * s, oy + y * s, s * 6, s); } break;
      case 'heat': g.fillStyle = 'rgba(255,240,200,.35)'; for (let i = 0; i < 20; i++) { const x = (R(i, 1) * b.W + t * 30) % b.W, y = b.hz + R(i, 2) * (b.H - b.hz); g.fillRect(ox + x * s, oy + y * s, s * 8, s); } break;
      case 'wind': g.fillStyle = 'rgba(230,240,255,.35)'; for (let i = 0; i < 12; i++) { const x = (R(i, 1) * b.W + t * 60) % (b.W + 60) - 30, y = R(i, 2) * b.H; g.fillRect(ox + x * s, oy + y * s, s * 18, s); } break;
      case 'torch': { const f = 0.5 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.05; const gr = g.createRadialGradient(rect.x + rect.w / 2, rect.y + rect.h * 0.3, 0, rect.x + rect.w / 2, rect.y + rect.h * 0.3, rect.w * 0.6); gr.addColorStop(0, `rgba(255,170,80,${0.12 * f})`); gr.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = gr; g.fillRect(rect.x, rect.y, rect.w, rect.h); break; }
    }
  },
};
