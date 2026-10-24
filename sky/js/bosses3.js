'use strict';
// 頭目重新設計（第二批：5–8 關）
// 5 天穹要塞：白金色「天使」飛行要塞，層層羽翼、金色光環在頭頂旋轉
// 6 冰原巨像：鋼藍色冰甲蜘蛛機甲，身上長滿發光冰晶，六隻會走路的腳
// 7 熔岩鑽地艦：岩甲鑽地機，中央巨型鑽頭旋轉，外圈是有散熱口的旋轉砲環
// 8 星艦母艦：暗紅黑色的異星新月母艦，紫色能量紋路；第二階段裝甲花瓣打開露出核心眼睛

Object.assign(EXTRA_MODELS, {
  nb5(K) {
    const WH = K.M(0xdfe6f2, { m: 0.35, r: 0.25, cc: 1 }), PE = K.M(0xaebfd8, { m: 0.45, r: 0.28, cc: 1 }), NV = K.M(0x1e2a48, { m: 0.8, r: 0.35 }), GD = K.M(0xd8a838, { m: 0.95, r: 0.22, cc: 1, panel: false });
    const DK = K.M(0x2a2e3a, { m: 0.85, r: 0.35 }), BL = K.G(0x7fd8ff, 3);
    // 羽翼：每邊四片往外後方展開的羽毛
    for (const s of [-1, 1]) for (let f = 0; f < 4; f++) {
      const bx = s * (24 + f * 30), bz = 4 - f * 8, tx = s * (90 + f * 22), tz = -26 - f * 10;
      K.ext([bx, bz + 8, tx - s * 2, tz - 7, tx + s * 11, tz + 7, bx, bz + 25], 2, NV, 0.5 + f * 0.4, 0.6);
      K.ext([bx, bz + 10, tx, tz - 4, tx + s * 8, tz + 6, bx, bz + 22], 3, f % 2 ? PE : WH, 2 + f * 0.4, 0.8);
      K.bar(bx, bz + 10, tx, tz - 4, 5.6 + f * 0.4, 1.2, 0.6, GD);
    }
    // 中央機身：三層圓盤
    K.latheV([[0.01, 0], [56, 0], [55, 2], [0.01, 2.5]], NV, 0, 0.5, 4);
    K.latheV([[0.01, 0], [52, 0], [50, 4], [44, 7], [0.01, 8]], WH, 0, 2, 4);
    K.latheV([[0.01, 0], [38, 0], [36, 3], [30, 5], [0.01, 6]], PE, 0, 10, 4);
    K.torus(46, 1.4, 0, 9.6, 4, GD);
    K.torus(33, 1, 0, 15.6, 4, GD);
    // 機頭（朝下）
    K.ext([0, 76, 16, 40, -16, 40], 4, WH, 6, 1);
    K.bar(0, 44, 0, 74, 10.6, 2, 0.6, GD);
    // 翼上砲塔座、引擎
    for (const s of [-1, 1]) {
      K.latheV([[0.01, 0], [15, 0], [14, 3], [9, 6], [0.01, 6.5]], GD, s * 100, 8, 0);
      K.cylV(8, 8, 1, s * 100, 14.5, 0, DK);
      K.rbox(12, 20, 5, s * 140, -12, 7, PE, 1.2);
    }
    for (const ex of [-60, -26, 26, 60]) { K.cyl(7, 7.5, 16, ex, 6, -42, PE); K.cyl(5.5, 5.5, 1, ex, 6, -50.5, BL); }
    for (const s of [-1, 1]) K.sph(1.6, 1, 1.6, s * 172, 8, -46, K.G(0xffe080, 3));
  },
  nb5r(K) {
    const GD = K.M(0xe0b040, { m: 0.95, r: 0.2, cc: 1, panel: false });
    K.torus(52, 2.2, 0, 22, 0, GD);
    K.torus(46, 0.8, 0, 22, 0, K.G(0xfff0a0, 2.4));
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; K.bar(Math.cos(a) * 46, Math.sin(a) * 46, Math.cos(a) * 58, Math.sin(a) * 58, 22, 2, 1, GD); }
  },
  nb6(K) {
    const AR = K.M(0x3c5068, { m: 0.75, r: 0.3, cc: 0.9 }), AR2 = K.M(0x5a7290, { m: 0.7, r: 0.3, cc: 0.9 }), DK = K.M(0x141c28, { m: 0.9, r: 0.4 });
    const ICE = new K.T.MeshPhysicalMaterial({ color: 0xbfefff, metalness: 0, roughness: 0.05, transmission: 0, clearcoat: 1, emissive: 0x2a9ad0, emissiveIntensity: 0.9, envMapIntensity: 1.2 });
    ICE.userData.glow = 0x5fd8ff;
    // 背甲：前後兩節
    K.ext([-40, -54, 40, -54, 54, -24, 50, 10, 30, 22, -30, 22, -50, 10, -54, -24], 12, AR, 6, 2.4);
    K.ext([-32, -46, 32, -46, 42, -22, 38, 4, 24, 14, -24, 14, -38, 4, -42, -22], 3, AR2, 18, 1.2);
    K.ext([-30, 24, 30, 24, 38, 44, 24, 64, -24, 64, -38, 44], 10, AR, 6, 2);
    // 頭部眼睛群（朝下）
    for (const [x, z, r] of [[-12, 52, 4], [12, 52, 4], [-5, 58, 2.6], [5, 58, 2.6], [0, 46, 3]]) K.sph(r, r * 0.7, r, x, 15, z, K.G(0x60e8ff, 3));
    // 冰晶
    const crystal = (x, z, h, tilt, rot) => { const m = K.add(new K.T.ConeGeometry(3.4, h, 6), ICE, x, 18 + h / 2 - 1, z); m.rotation.z = tilt; m.rotation.y = rot; };
    for (const [x, z, h, t] of [[-20, -30, 16, 0.3], [-8, -38, 22, 0.1], [6, -34, 18, -0.2], [20, -26, 14, -0.35], [-26, -6, 12, 0.4], [26, -4, 13, -0.4], [0, -16, 26, 0], [-12, 2, 10, 0.2], [12, 4, 11, -0.2]]) crystal(x, z, h, t, x * 0.1);
    // 肩砲座、髖關節
    for (const s of [-1, 1]) K.cylV(11, 12, 3, s * 40, 18, -18, DK);
    for (const [x, z] of [[-50, -40], [50, -40], [-54, -4], [54, -4], [-44, 34], [44, 34]]) { K.cylV(7, 7.5, 6, x, 8, z, DK); K.sph(3, 2, 3, x, 14, z, AR2); }
  },
  nb6l(K) {
    const AR = K.M(0x4a6280, { m: 0.75, r: 0.3, cc: 0.9 }), DK = K.M(0x182230, { m: 0.9, r: 0.4 });
    K.rbox(9, 56, 5, 0, 0, 2, AR, 1.4);
    K.bar(0, -24, 0, 24, 7.4, 2.4, 0.6, DK);
    K.cylV(5, 5, 6, 0, 1, 26, DK);
    K.sph(1.2, 0.8, 1.2, 0, 7.6, -10, K.G(0x60e8ff, 2.6));
  },
  nb6f(K) {
    const DK = K.M(0x182230, { m: 0.9, r: 0.4 }), ST = K.M(0xa0b8cc, { m: 0.9, r: 0.25 });
    K.rbox(7, 34, 4, 0, 0, 1, DK, 1.2);
    for (const s of [-1, 0, 1]) K.ext([s * 3, 14, s * 3 + s * 4 + 1, 22, s * 3 - 1, 22], 2, ST, 0, 0.4);
  },
  nb7(K) {
    const RK = K.M(0x4a3c36, { m: 0.55, r: 0.5, cc: 0.3 }), RK2 = K.M(0x6a5446, { m: 0.55, r: 0.5, cc: 0.3 }), DK = K.M(0x1e1816, { m: 0.85, r: 0.45 });
    const LV = K.G(0xff6a1a, 2.8), ST = K.M(0x7a7470, { m: 0.9, r: 0.3 });
    K.cylV(60, 64, 12, 0, 0, 0, RK);
    // 岩甲板塊之間的熔岩縫
    for (let i = 0; i < 10; i++) {
      const a0 = i / 10 * Math.PI * 2 + 0.05, a1 = (i + 1) / 10 * Math.PI * 2 - 0.05, pts = [];
      for (const [r, a] of [[30, a0], [58, a0], [58, a1], [30, a1]]) pts.push(Math.cos(a) * r, Math.sin(a) * r);
      K.ext(pts, 2.5 + (i % 3), i % 2 ? RK2 : RK, 12, 0.8);
      K.bar(Math.cos(a0 - 0.05) * 30, Math.sin(a0 - 0.05) * 30, Math.cos(a0 - 0.05) * 58, Math.sin(a0 - 0.05) * 58, 12.4, 1.6, 0.6, LV);
    }
    K.cylV(30, 31, 3, 0, 12, 0, DK);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; K.cylV(3, 3.4, 7, Math.cos(a) * 50, 14, Math.sin(a) * 50, ST); K.cylV(2.4, 2.4, 0.5, Math.cos(a) * 50, 21, Math.sin(a) * 50, LV); }
  },
  nb7d(K) {
    const ST = K.M(0x9a948c, { m: 0.95, r: 0.22, cc: 0.6, panel: false }), DK = K.M(0x2a2420, { m: 0.9, r: 0.4 });
    K.latheV([[0.01, 0], [27, 0], [24, 6], [16, 13], [7, 20], [0.01, 25]], ST, 0, 15, 0);
    for (let k = 0; k < 4; k++) {
      const pts = [];
      for (let t = 0; t <= 1.001; t += 0.1) { const r = 26 - t * 22, a = k * Math.PI / 2 + t * 2.6; pts.push([Math.cos(a) * r, Math.sin(a) * r, 15 + t * 22]); }
      for (let i = 1; i < pts.length; i++) { const [x1, z1, y1] = pts[i - 1], [x2, z2] = pts[i]; K.bar(x1, z1, x2, z2, y1 + 2.2, 3, 2.4, DK); }
    }
    K.sph(2.2, 2, 2.2, 0, 39, 0, K.G(0xffb040, 3));
  },
  nb7r(K) {
    const RG = K.M(0x5c4a40, { m: 0.75, r: 0.4, cc: 0.4 }), DK = K.M(0x231c18, { m: 0.9, r: 0.4 }), LV = K.G(0xff7a2a, 2.4);
    const geo = new K.T.TorusGeometry(70, 8, 10, 64); geo.rotateX(Math.PI / 2); K.add(geo, K.pv(RG, 'lathe'), 0, 16, 0);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; K.cylV(11, 12, 4, Math.cos(a) * 68, 18, Math.sin(a) * 68, DK); }
    for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9 + 0.17; K.box(4, 1, 7, Math.cos(a) * 70, 24, Math.sin(a) * 70, i % 3 ? DK : LV).rotation.y = -a; }
  },
  nb8(K, o) {
    const HU = K.M(0x2a1820, { m: 0.85, r: 0.3, cc: 0.9 }), HU2 = K.M(0x4a2430, { m: 0.8, r: 0.3, cc: 0.9 }), DK = K.M(0x0e0a10, { m: 0.9, r: 0.35 });
    const PU = K.G(0xc060ff, 2.6), RD = K.G(0xff3050, 2.8);
    // 新月形主體（兩角朝下包住中央）
    const cres = [];
    for (let i = 0; i <= 20; i++) { const a = Math.PI + i / 20 * Math.PI; cres.push(Math.cos(a) * 172, 30 + Math.sin(a) * 92); }
    for (let i = 20; i >= 0; i--) { const a = Math.PI + i / 20 * Math.PI; cres.push(Math.cos(a) * 120, 50 + Math.sin(a) * 60); }
    K.ext(cres, 10, HU, 0, 2.5);
    // 紫色能量紋路
    for (let i = 1; i < 20; i += 2) { const a = Math.PI + i / 20 * Math.PI; K.bar(Math.cos(a) * 126, 50 + Math.sin(a) * 64, Math.cos(a) * 166, 30 + Math.sin(a) * 88, 10.6, 1.2, 0.5, PU); }
    // 兩翼尖端的砲莢
    for (const s of [-1, 1]) { K.rbox(18, 34, 8, s * 146, 24, 6, HU2, 1.6); K.cyl(3, 3, 12, s * 146, 12, 44, DK); K.sph(2.4, 1.6, 2.4, s * 146, 14.6, 14, RD); }
    // 側邊機庫（敵機從這裡出來）
    for (const s of [-1, 1]) { K.rbox(36, 20, 4, s * 90, -10, 10, DK, 1); K.bar(s * 74, -1, s * 106, -1, 14.4, 1, 0.5, PU); }
    // 中央：球形核心座＋裝甲花瓣
    K.latheV([[0.01, 0], [46, 0], [44, 6], [36, 12], [0.01, 14]], HU2, 0, 4, 6);
    const open = !!(o && o.open);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6, r0 = open ? 30 : 4, r1 = open ? 50 : 34;
      const pts = [Math.cos(a - 0.42) * r0, 6 + Math.sin(a - 0.42) * r0, Math.cos(a) * r1, 6 + Math.sin(a) * r1, Math.cos(a + 0.42) * r0, 6 + Math.sin(a + 0.42) * r0];
      K.ext(pts, 3, i % 2 ? HU : HU2, 17, 1);
      K.bar(Math.cos(a) * (r0 + 3), 6 + Math.sin(a) * (r0 + 3), Math.cos(a) * (r1 - 4), 6 + Math.sin(a) * (r1 - 4), 20.3, 0.8, 0.4, PU);
    }
    if (open) { K.sph(26, 14, 26, 0, 18, 6, K.M(0x400818, { m: 0.2, r: 0.2, cc: 1, panel: false })); K.torus(27, 1.2, 0, 18, 6, RD); }
    // 後方引擎
    for (const ex of [-110, -50, 50, 110]) { K.rbox(20, 18, 7, ex, -60 + Math.abs(ex) * 0.12, 3, DK, 1.4); K.cyl(6, 6, 1, ex, 7, -70 + Math.abs(ex) * 0.12, K.G(0xb070ff, 3)); }
    K.rbox(6, 30, 5, 0, 92, 8, HU2, 1);
    K.sph(2, 1.4, 2, 0, 13.6, 104, RD);
  },
  nb8e(K) {
    K.sph(14, 8, 14, 0, 0, 0, K.M(0xffe8d0, { m: 0, r: 0.3, cc: 1, panel: false }));
    K.sph(8, 5, 8, 0, 5, 4, K.G(0xff2040, 3));
    K.sph(3.5, 3, 3.5, 0, 8, 5.4, K.M(0x080008, { m: 0, r: 0.2, cc: 1, panel: false }));
  },
});
EXTRA_BAKES.push(
  ['nb5', 352, 170, EXTRA_MODELS.nb5, { glow: 0.85 }],
  ['nb5r', 124, 124, EXTRA_MODELS.nb5r, { glow: 0.9 }],
  ['nb6', 124, 134, EXTRA_MODELS.nb6, { glow: 1 }],
  ['nb6l', 14, 64, EXTRA_MODELS.nb6l],
  ['nb6f', 18, 50, EXTRA_MODELS.nb6f],
  ['nb7', 132, 132, EXTRA_MODELS.nb7, { glow: 0.9 }],
  ['nb7d', 58, 58, EXTRA_MODELS.nb7d, { glow: 0.8 }],
  ['nb7r', 164, 164, EXTRA_MODELS.nb7r, { glow: 0.8 }],
  ['nb8', 360, 220, EXTRA_MODELS.nb8, { glow: 0.9 }],
  ['nb8o', 360, 220, EXTRA_MODELS.nb8, { glow: 0.9, open: true }],
  ['nb8e', 34, 34, EXTRA_MODELS.nb8e, { glow: 0.8 }],
);

// ---------- 畫法 ----------
function legDraw(ctx, hx, hy, fx, fy) {
  // 兩段腳：髖 → 膝（往外抬高）→ 腳掌
  const mx = (hx + fx) / 2 + (hx < 180 ? -1 : 1) * 0, my = (hy + fy) / 2;
  const dx = fx - hx, dy = fy - hy, L = Math.hypot(dx, dy) || 1;
  const kx = mx + (-dy / L) * 14 * Math.sign(hx - (G.boss ? G.boss.x : 180) || 1), ky = my + (dx / L) * 14 * Math.sign(hx - (G.boss ? G.boss.x : 180) || 1);
  const seg = (x1, y1, x2, y2, img) => { const a = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2; const l = Math.hypot(x2 - x1, y2 - y1); Art.draw(ctx, img, (x1 + x2) / 2, (y1 + y2) / 2, a, 1, 1, l / (img === 'nb6l' ? 56 : 34)); };
  Art.draw(ctx, 'nb6l', (hx + kx) / 2 + 5, (hy + ky) / 2 + 7, Math.atan2(ky - hy, kx - hx) - Math.PI / 2, 0.3, 1, Math.hypot(kx - hx, ky - hy) / 56, 's');
  seg(kx, ky, fx, fy, 'nb6f');
  seg(hx, hy, kx, ky, 'nb6l');
}
const NEWB2 = {
  boss5: ['nb5', (ctx, e) => {
    const x = e.x, y = e.y;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const ex of [-60, -26, 26, 60]) { glowDot(ctx, x + ex, y - 54, 14 + Math.random() * 6, 'rgba(130,210,255,.85)'); glowDot(ctx, x + ex, y - 66, 8, 'rgba(200,240,255,.6)'); }
    ctx.restore();
    Art.draw(ctx, 'nb5', x, y);
    bFlash(ctx, 'nb5', e);
    Art.draw(ctx, 'nb5r', x, y + 4, e.t * (e.p2 ? 1.6 : 0.6));
    const core = e.p2 ? 0.6 + 0.4 * Math.sin(e.t * 10) : 0.4 + 0.15 * Math.sin(e.t * 3);
    glowDot(ctx, x, y + 4, 24, e.p2 ? `rgba(255,100,60,${core})` : `rgba(255,190,80,${core * 0.8})`);
    glowDot(ctx, x, y + 4, 9, `rgba(255,250,220,${core})`);
    for (const s of [-1, 1]) glowDot(ctx, x + s * 100, y + 14, 10, 'rgba(255,220,120,.5)');
  }],
  boss6: ['nb6', (ctx, e) => {
    const x = e.x, y = e.y, ph = e.t * 3.4;
    const hips = [[-50, -40], [50, -40], [-54, -4], [54, -4], [-44, 34], [44, 34]];
    hips.forEach(([hx, hz], i) => {
      const s = Math.sign(hx), step = Math.sin(ph + (i % 2 ? Math.PI : 0));
      const fx = x + hx + s * 34, fy = y + hz + step * 10 + (hz < -20 ? -14 : hz > 20 ? 16 : 0);
      legDraw(ctx, x + hx, y + hz, fx, fy);
      if (step > 0.95) fxP({ k: 's', x: fx, y: fy + 10, vx: rnd(-20, 20), vy: -10, r: 4, life: 0, max: 0.6, a: 0.35, g: true });
    });
    Art.draw(ctx, 'nb6', x + 6, y + 9, 0, 0.3, 1, 1, 's');
    Art.draw(ctx, 'nb6', x, y);
    bFlash(ctx, 'nb6', e);
    Art.draw(ctx, 'gunTur', x - 40, y - 18, e.gl - Math.PI / 2, 1, 1.3, 1.3);
    Art.draw(ctx, 'gunTur', x + 40, y - 18, e.gr - Math.PI / 2, 1, 1.3, 1.3);
    glowDot(ctx, x, y + 52, 14 + Math.sin(e.t * 6) * 4, e.p2 ? 'rgba(140,220,255,1)' : 'rgba(100,220,255,.75)');
  }],
  boss7: ['nb7', (ctx, e) => {
    const x = e.x, y = e.y;
    glowDot(ctx, x, y, 120, 'rgba(255,90,20,.25)');
    Art.draw(ctx, 'nb7', x + 6, y + 9, 0, 0.35, 1, 1, 's');
    Art.draw(ctx, 'nb7', x, y);
    bFlash(ctx, 'nb7', e);
    Art.draw(ctx, 'nb7r', x, y, e.ring);
    for (let i = 0; i < 6; i++) { const a = e.ring + i * TAU / 6; Art.draw(ctx, 'gunTur', x + Math.cos(a) * 68, y + Math.sin(a) * 68, a - Math.PI / 2, 1, 1.1, 1.1); }
    Art.draw(ctx, 'nb7d', x, y, -e.t * (e.p2 ? 9 : 5));
    glowDot(ctx, x, y, 22 + Math.sin(e.t * 8) * 5, e.p2 ? 'rgba(255,80,30,.85)' : 'rgba(255,160,60,.55)');
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; if (Math.random() < 0.2) fxP({ k: 's', x: x + Math.cos(a) * 50, y: y + Math.sin(a) * 50, vx: 0, vy: -30, r: 4, life: 0, max: 0.9, a: 0.3 }); }
  }],
  boss8: ['nb8', (ctx, e) => {
    const x = e.x, y = e.y, ph = e.ph || 1, img = ph >= 2 ? 'nb8o' : 'nb8';
    for (const ex of [-110, -50, 50, 110]) glowDot(ctx, x + ex, y - 74 + Math.abs(ex) * 0.12, 16 + Math.random() * 6, 'rgba(180,120,255,.85)');
    Art.draw(ctx, img, x, y);
    bFlash(ctx, img, e);
    const pulse = 0.5 + 0.5 * Math.sin(e.t * (ph === 3 ? 14 : 6));
    if (ph >= 2) {
      glowDot(ctx, x, y + 6, 46, `rgba(255,40,80,${0.35 + pulse * 0.3})`);
      const a = aim(x, y + 6);
      Art.draw(ctx, 'nb8e', x + Math.cos(a) * 6, y + 6 + Math.sin(a) * 6, 0, 1, 1.4, 1.4);
    } else glowDot(ctx, x, y + 6, 24, `rgba(190,110,255,${0.3 + pulse * 0.3})`);
    for (const s of [-1, 1]) glowDot(ctx, x + s * 146, y + 14, 9, ph === 1 ? 'rgba(255,60,90,.9)' : 'rgba(255,60,90,.35)');
    if (ph === 3) for (let k = 0; k < 2; k++) fxP({ k: 's', x: x + rnd(-150, 150), y: y + rnd(-40, 40), vx: 0, vy: -40, r: rnd(4, 8), life: 0, max: 1, a: 0.3 });
  }],
};
for (const k in NEWB2) {
  const [img, fn] = NEWB2[k], prev = ET[k].draw;
  ET[k].draw = (ctx, e) => Bake.has(img) ? fn(ctx, e) : prev(ctx, e);
}
ET.boss6.hb = [[0, -16, 46], [0, 40, 26]];
ET.boss8.hb = [[0, 6, 46], [-120, -10, 34], [120, -10, 34], [-150, 24, 18], [150, 24, 18]];
