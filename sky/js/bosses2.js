'use strict';
// 頭目重新設計（第一批：1–4 關）
// 每個頭目有自己的輪廓、配色和會動的零件，烘焙成多張精靈圖，在遊戲中組合播放。

// ---------- 共用建模小工具 ----------
function kStripes(K, x1, z1, x2, z2, y, w, n, A, B) {
  for (let i = 0; i < n; i++) {
    const a = i / n, b = (i + 1) / n;
    K.bar(x1 + (x2 - x1) * a, z1 + (z2 - z1) * a, x1 + (x2 - x1) * b, z1 + (z2 - z1) * b, y, w, 0.5, i % 2 ? A : B);
  }
}
function kGrill(K, x, z, w, d, y, n, mat, dark) {
  K.rbox(w, d, 0.8, x, z, y, dark, 0.2);
  for (let i = 0; i < n; i++) K.box(w - 1.2, 0.5, 0.7, x, y + 0.9, z - d / 2 + (i + 0.5) * d / n, mat);
}
function kBolts(K, pts, y, mat) { for (let i = 0; i < pts.length; i += 2) K.sph(0.7, 0.4, 0.7, pts[i], y, pts[i + 1], mat); }

Object.assign(EXTRA_MODELS, {
  // ===== 1 關：鋼鐵巨獸 — 迷彩重型攻城履帶車，前方推土鏟、後方雙排氣管、飛彈艙 =====
  nb1(K) {
    const OL = K.M(0x5f6b3a, { m: 0.45, r: 0.5, cc: 0.35 }), OL2 = K.M(0x77834a, { m: 0.45, r: 0.48, cc: 0.35 }), CA = K.M(0x3c4526, { m: 0.4, r: 0.6, panel: false });
    const DK = K.M(0x24261f, { m: 0.7, r: 0.6 }), ST = K.M(0x5b5e62, { m: 0.85, r: 0.35 }), YL = K.M(0xe0b020, { m: 0.2, r: 0.45, panel: false }), BK = K.M(0x1a1a18, { m: 0.3, r: 0.6, panel: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 56, z = sz * 40;
      K.rbox(26, 70, 8, x, z, 0, DK, 1.5);
      for (let k = 0; k < 12; k++) K.box(24, 0.7, 1.6, x, 8.2, z - 33 + k * 6, ST);
      K.rbox(9, 66, 3, x - sx * 13, z, 7, OL2, 0.8);
      kBolts(K, [x - sx * 13, z - 28, x - sx * 13, z - 14, x - sx * 13, z, x - sx * 13, z + 14, x - sx * 13, z + 28], 10.3, ST);
    }
    K.ext([-46, -76, 46, -76, 50, -54, 50, 56, 36, 76, -36, 76, -50, 56, -50, -54], 12, OL, 3, 2.4);
    K.ext([-38, -66, 38, -66, 41, -48, 41, 46, 26, 64, -26, 64, -41, 46, -41, -48], 3, OL2, 15, 1.2);
    // 迷彩
    for (const [x, z, s] of [[-28, -40, 1], [24, -20, 0.8], [-20, 30, 0.9], [30, 40, 0.7], [0, -2, 0.6]]) K.ext([x - 10 * s, z - 6 * s, x + 4 * s, z - 9 * s, x + 12 * s, z, x + 2 * s, z + 8 * s, x - 9 * s, z + 5 * s], 0.3, CA, 18, 0);
    // 推土鏟（畫面下方）
    K.ext([-58, 78, 58, 78, 64, 92, -64, 92], 7, ST, 2, 1.2);
    kStripes(K, -56, 88, 56, 88, 9.2, 3, 14, YL, BK);
    // 引擎甲板：散熱格柵＋雙排氣管
    kGrill(K, 0, -58, 34, 12, 18, 6, ST, DK);
    for (const s of [-1, 1]) { K.cylV(5, 5.6, 9, s * 24, 15, -64, ST); K.cylV(3.6, 3.6, 0.6, s * 24, 24, -64, BK); }
    // 側砲座、飛彈艙
    for (const s of [-1, 1]) {
      K.cylV(11, 12, 3, s * 42, 17, 34, DK);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { K.rbox(5, 5, 1.2, s * (22 + c * 6.5), -20 + r * 7, 18, DK, 0.3); K.sph(1, 0.5, 1, s * (22 + c * 6.5), 19.6, -20 + r * 7, K.G(0xff3030, 2.2)); }
      K.cylV(0.6, 0.6, 14, s * 36, 18, -40, ST);
      K.sph(2.2, 1.4, 2.2, s * 44, 18, 66, K.G(0xfff2b0, 2.8));
    }
    K.cylV(30, 31, 2, 0, 17.5, -6, DK);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; K.sph(0.8, 0.5, 0.8, Math.cos(a) * 28, 19.6, -6 + Math.sin(a) * 28, ST); }
  },
  nb1t(K) {
    const OL = K.M(0x6d7a42, { m: 0.5, r: 0.45, cc: 0.45 }), DK = K.M(0x26281f, { m: 0.85, r: 0.4 }), ST = K.M(0x55585c, { m: 0.9, r: 0.3 });
    K.ext([-20, -24, 20, -24, 27, -8, 27, 14, 14, 24, -14, 24, -27, 14, -27, -8], 9, OL, 21, 2);
    K.ext([-14, -18, 14, -18, 19, -6, 19, 10, 10, 18, -10, 18, -19, 10, -19, -6], 2, K.M(0x7f8c50, { m: 0.5, r: 0.45 }), 30, 0.8);
    K.cylV(6, 6.5, 3, -9, 31, -10, DK); K.sph(4, 2, 4, -9, 34, -10, K.glass(0x1a2a10, 0x203a10));
    for (const s of [-1, 1]) {
      K.cyl(3, 3, 38, s * 7, 26, 42, ST); K.cyl(4.2, 4.2, 7, s * 7, 26, 33, DK);
      K.rbox(9, 8, 6, s * 7, 62, 23, DK, 1);
      for (let k = 0; k < 3; k++) K.box(10, 1, 1.2, s * 7, 26.5, 59 + k * 2.4, ST);
      for (let k = 0; k < 3; k++) K.cyl(1, 1, 3, s * (24 - k * 2.5), 28, -16 - k * 3, DK);
    }
    K.sph(1.8, 1, 1.8, 12, 31.5, -12, K.G(0xff3030, 2.8));
  },

  // ===== 2 關：海上要塞 — 深藍灰戰艦，紅色吃水線、艦橋雷達、垂直發射器、艉部飛行甲板 =====
  nb2(K) {
    const HU = K.M(0x3c4a5c, { m: 0.7, r: 0.35, cc: 0.6 }), RD = K.M(0x8a2424, { m: 0.3, r: 0.5, panel: false }), DE = K.M(0x6a7672, { m: 0.25, r: 0.65 });
    const WH = K.M(0xc5ccd2, { m: 0.35, r: 0.3, cc: 0.8 }), DK = K.M(0x20252c, { m: 0.85, r: 0.4 }), FD = K.M(0x30343a, { m: 0.3, r: 0.6, panel: false });
    const LN = K.M(0xf0f0e8, { m: 0, r: 0.5, panel: false }), YL = K.M(0xe8c040, { m: 0, r: 0.5, panel: false });
    const hull = [0, -162, 22, -140, 36, -112, 46, -80, 52, -40, 54, 0, 54, 50, 53, 100, 50, 130, 46, 154, -46, 154, -50, 130, -53, 100, -54, 50, -54, 0, -52, -40, -46, -80, -36, -112, -22, -140];
    K.ext(hull.map((v, i) => i % 2 ? v + (v > 0 ? 2 : -2) : v * 1.04), 3, RD, 0, 1);
    K.ext(hull, 8, HU, 2, 2);
    K.ext(hull.map((v, i) => i % 2 ? (v > 110 ? 110 : v * 0.95) : v * 0.86), 0.6, DE, 10, 0);
    // 艏：錨鍊、甲板線
    K.cylV(2.2, 2.2, 0.8, -8, 10.6, -134, DK); K.cylV(2.2, 2.2, 0.8, 8, 10.6, -134, DK);
    for (const z of [-150, -60, 40]) K.bar(-40, z, 40, z, 10.7, 0.5, 0.2, DK);
    // 前主砲座（兩座）
    for (const z of [-112, -84]) { K.cylV(13, 14, 2, 0, 10.6, z, DK); }
    // 垂直發射器
    for (const s of [-1, 1]) for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) K.rbox(5, 5, 1, s * (30 + c * 6), -40 + r * 7, 10.6, DK, 0.3);
    // 艦橋＋煙囪＋桅杆
    K.rbox(50, 70, 8, 0, -10, 10.6, WH, 1.6);
    K.rbox(36, 40, 6, 0, -22, 18.6, WH, 1.2);
    K.rbox(26, 18, 4, 0, -32, 24.6, WH, 1);
    K.bar(-12, -41.5, 12, -41.5, 27, 1.4, 1.2, K.glass(0x0a2030, 0x0a3a5a));
    K.bar(-17, -42.5, 17, -42.5, 21.5, 1.2, 1, K.glass(0x0a2030, 0x0a3a5a));
    K.rbox(12, 20, 9, 0, 14, 18.6, DK, 1.6); K.rbox(8, 14, 0.8, 0, 14, 27.6, K.M(0x111111, { panel: false }), 0.3);
    for (const s of [-1, 1]) { K.cylV(5, 5, 2, s * 18, 18.6, 4, WH); K.latheV([[0.01, 0], [4.5, 1.5], [4.8, 2.4]], LN, s * 18, 20.6, 4); }
    // 後主砲座
    for (const z of [70, 100]) K.cylV(13, 14, 2, 0, 10.6, z, DK);
    // 艉飛行甲板
    K.ext([-44, 116, 44, 116, 42, 152, -42, 152], 0.6, FD, 10.6, 0);
    K.bar(0, 118, 0, 150, 11.3, 0.8, 0.2, LN);
    for (const s of [-1, 1]) K.bar(s * 38, 118, s * 38, 150, 11.3, 0.6, 0.2, YL);
    K.torus(10, 0.5, 0, 11.4, 134, LN);
    for (const s of [-1, 1]) K.extM([0, 124, 5, 132, 2, 132], 0.8, K.M(0x7a8490, { m: 0.6, r: 0.35 }), 11.2, 0.2);
    for (const z of [-130, -90, -40, 10, 60, 110, 145]) for (const s of [-1, 1]) K.sph(1, 0.8, 1, s * 52, 9.6, z, K.G(z > 120 ? 0xff3030 : 0x45d8ff, 2.6));
  },
  tur3(K) {
    const ST = K.M(0x8a96a2, { m: 0.75, r: 0.3, cc: 0.7 }), DK = K.M(0x22262c, { m: 0.9, r: 0.35 });
    K.ext([-9, -9, 9, -9, 11, 2, 7, 10, -7, 10, -11, 2], 6, ST, 4, 1.4);
    K.rbox(12, 5, 1.2, 0, -4, 10, DK, 0.3);
    for (const x of [-4.5, 0, 4.5]) { K.cyl(1, 1, 16, x, 7, 18, DK); K.cyl(1.4, 1.4, 1.6, x, 7, 25.5, DK); }
    K.sph(0.9, 0.6, 0.9, 6, 10.4, -5, K.G(0xff3040, 2.6));
  },
  radar(K) {
    const WH = K.M(0xe0e4e8, { m: 0.4, r: 0.3, cc: 0.8 }), DK = K.M(0x22262c, { m: 0.9, r: 0.4 });
    K.rbox(26, 4, 1.2, 0, 0, 2, WH, 0.4);
    for (let k = -11; k <= 11; k += 2.2) K.box(0.6, 0.4, 3.6, k, 3.3, 0, DK);
    K.cylV(2, 2, 2, 0, 0, 0, DK);
  },

  // ===== 3 關：黑鷹重裝機 — 黑色傾轉旋翼攻擊機，黃黑警示條、機鼻加特林、火箭莢艙、V 型尾翼 =====
  nb3(K) {
    const BK = K.M(0x23262b, { m: 0.85, r: 0.28, cc: 0.9 }), GR = K.M(0x3d424a, { m: 0.85, r: 0.3, cc: 0.8 }), YL = K.M(0xf0b818, { m: 0.2, r: 0.4, panel: false }), DK = K.M(0x111214, { m: 0.9, r: 0.4, panel: false });
    const AM = K.glass(0x2a1a05, 0xb06a00), WH = K.M(0xd9dee4, { m: 0.3, r: 0.3 });
    // 主翼
    K.ext([-62, -18, 62, -18, 66, -6, 62, 2, -62, 2, -66, -6], 4, GR, 3, 1.2);
    kStripes(K, -60, -1, -36, -1, 7.3, 2.2, 8, YL, DK); kStripes(K, 36, -1, 60, -1, 7.3, 2.2, 8, YL, DK);
    // 傾轉旋翼引擎艙
    for (const s of [-1, 1]) {
      K.lathe([[0, -24], [7, -21], [12, -10], [13, 6], [11, 16], [6, 22], [0.2, 23]], BK, { sy: 0.75, x: s * 62, y: 4, z: -8 });
      K.cyl(8, 8, 1.2, s * 62, 4, 14.5, K.G(0xffa030, 2.4));
      K.cylV(5, 5, 3, s * 62, 12, -8, GR);
      // 火箭莢艙
      K.cyl(4, 4, 16, s * 38, 1, 4, GR);
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; K.cyl(0.8, 0.8, 0.5, s * 38 + Math.cos(a) * 2.4, 1 + Math.sin(a) * 2.4, 12.2, K.G(0xff3030, 2.2)); }
    }
    // 機身（機頭朝下）
    K.lathe([[0, -50], [7, -46], [15, -34], [22, -14], [23, 6], [20, 22], [14, 36], [7, 46], [0.2, 50]], BK, { sy: 0.7, y: 5 });
    K.lathe([[0, 10], [9, 16], [11, 26], [8, 38], [0.2, 46]], AM, { sy: 0.65, y: 9 });
    K.bar(0, -40, 0, 4, 21, 3, 0.6, GR);
    kStripes(K, -14, -30, 14, -30, 20.2, 2, 6, YL, DK);
    // V 型尾翼
    for (const s of [-1, 1]) { const f = K.ext([s * 2, -48, s * 22, -62, s * 24, -58, s * 4, -40], 1.2, GR, 10, 0.3); }
    K.sph(2.4, 1.4, 2.4, 0, 21.5, -18, K.G(0xffcc33, 3));
    for (const s of [-1, 1]) K.sph(1.2, 0.8, 1.2, s * 66, 6.5, -6, K.G(s < 0 ? 0xff3030 : 0x30ff60, 2.8));
    K.rbox(10, 8, 3, 0, 44, 2, DK, 0.8);
  },
  gat(K) {
    const DK = K.M(0x1d1f22, { m: 0.9, r: 0.35 }), ST = K.M(0x6a6e74, { m: 0.9, r: 0.3 });
    K.latheV([[0.01, 0], [6, 0], [5.5, 2.5], [3, 4], [0.01, 4.2]], DK, 0, 2, 0);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; K.cyl(0.6, 0.6, 14, Math.cos(a) * 1.8, 4 + Math.sin(a) * 1.2, 9, ST); }
    K.cyl(2.6, 2.6, 1.2, 0, 4, 15.5, DK);
  },
  rot3(K) {
    const BL = K.M(0x2a2c30, { m: 0.6, r: 0.4, panel: false }), YL = K.M(0xf0b818, { m: 0.2, r: 0.4, panel: false });
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      K.bar(c * 3, s * 3, c * 38, s * 38, 1, 4.5, 0.6, BL);
      K.bar(c * 34, s * 34, c * 39, s * 39, 1.4, 4.6, 0.4, YL);
    }
    K.cylV(4, 4, 2.4, 0, 0, 0, K.M(0x45494f, { m: 0.85, r: 0.3 }));
  },

  // ===== 4 關：沙暴巨砲 — 沙色機動電磁砲平台，散熱鰭片、藍色冷卻管、超長雙軌砲 =====
  nb4(K) {
    const SA = K.M(0xc2a36a, { m: 0.35, r: 0.55, cc: 0.3 }), SA2 = K.M(0xa88a56, { m: 0.35, r: 0.58, cc: 0.25 }), DK = K.M(0x2a2620, { m: 0.75, r: 0.55 });
    const ST = K.M(0x6a6c70, { m: 0.85, r: 0.35 }), BL = K.G(0x40b8ff, 2.4), YL = K.M(0xe0b030, { m: 0.2, r: 0.45, panel: false }), BK = K.M(0x1a1916, { m: 0.3, r: 0.6, panel: false });
    for (const s of [-1, 1]) {
      K.rbox(26, 168, 9, s * 106, 0, 0, DK, 1.6);
      for (let k = 0; k < 24; k++) K.box(24, 0.7, 1.5, s * 106, 9.2, -80 + k * 7, ST);
      K.rbox(8, 150, 4, s * 92, 0, 6, SA2, 1);
    }
    K.ext(K.oct(92, 76, 28), 13, SA, 0, 2.5);
    K.ext(K.oct(74, 60, 22), 3, SA2, 13, 1);
    // 散熱鰭片陣列（左右）
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) K.box(14, 3, 1.1, s * 58, 17.5, -30 + k * 6.5, ST);
    // 冷卻管
    for (const s of [-1, 1]) { K.bar(s * 46, -56, s * 46, 56, 16.6, 2.2, 1.2, BL); K.bar(s * 46, 56, s * 20, 56, 16.6, 2.2, 1.2, BL); }
    // 四角砲台座
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { K.cylV(15, 16, 3, sx * 86, 13, sz * 52, DK); K.torus(14, 0.8, sx * 86, 16.2, sz * 52, YL); }
    // 中央砲座環
    K.cylV(34, 35, 2.5, 0, 16, 0, DK);
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; K.box(3, 0.6, 1.2, Math.cos(a) * 31, 18.8, Math.sin(a) * 31, i % 2 ? YL : BK).rotation.y = -a; }
    kStripes(K, -70, 70, 70, 70, 13.6, 4, 16, YL, BK); kStripes(K, -70, -70, 70, -70, 13.6, 4, 16, YL, BK);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.sph(1.6, 1, 1.6, sx * 70, 16.5, sz * 62, K.G(0xff3030, 2.6));
  },
  nb4g(K) {
    const SA = K.M(0xd8c08a, { m: 0.45, r: 0.45, cc: 0.5 }), DK = K.M(0x26231d, { m: 0.85, r: 0.4 }), ST = K.M(0x7a7e84, { m: 0.9, r: 0.28 });
    K.latheV([[0.01, 0], [30, 0], [29, 4], [23, 9], [10, 12], [0.01, 12.5]], SA, 0, 19, 0);
    K.rbox(20, 18, 7, 0, -18, 22, DK, 1.6);
    for (let k = 0; k < 4; k++) K.box(18, 0.6, 1, 0, 29.2, -24 + k * 4, ST);
    for (const s of [-1, 1]) {
      K.rbox(5, 66, 5, s * 6, 44, 24, ST, 1);
      K.rbox(3, 10, 6, s * 7.5, 78, 24, DK, 0.6);
    }
    const coil = K.G(0x3fb0ff, 2.4);
    for (let k = 0; k < 6; k++) K.add(new K.T.TorusGeometry(9, 1.2, 8, 28), coil, 0, 26.5, 22 + k * 10);
    K.sph(5, 3, 5, 0, 31, 4, K.glass(0x0a1a30, 0x0a3a80));
  },
});
EXTRA_BAKES.push(
  ['nb1', 150, 186, EXTRA_MODELS.nb1, { glow: 0.8 }],
  ['nb1t', 64, 136, EXTRA_MODELS.nb1t],
  ['nb2', 124, 330, EXTRA_MODELS.nb2, { glow: 0.8 }],
  ['tur3', 26, 56, EXTRA_MODELS.tur3],
  ['radar', 30, 10, EXTRA_MODELS.radar],
  ['nb3', 150, 130, EXTRA_MODELS.nb3, { glow: 0.8 }],
  ['gat', 16, 36, EXTRA_MODELS.gat],
  ['rot3', 82, 82, EXTRA_MODELS.rot3],
  ['nb4', 240, 180, EXTRA_MODELS.nb4, { glow: 0.8 }],
  ['nb4g', 66, 170, EXTRA_MODELS.nb4g, { glow: 0.9 }],
);

// ---------- 畫法 ----------
function rotorBlur(ctx, x, y, r, t, img) {
  ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#1a1c20'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  for (let k = 0; k < 3; k++) Art.draw(ctx, img, x, y, t * 26 + k * 0.12, 0.35 + k * 0.2);
}
function smokeFrom(x, y, rate, g) { if (Math.random() < rate) fxP({ k: 's', x: x + rnd(-2, 2), y, vx: rnd(-8, 8), vy: -rnd(25, 45), r: rnd(3, 6), life: 0, max: 1.1, a: 0.35, g }); }
const NEWB = {
  boss1: ['nb1', (ctx, e) => {
    const x = e.x, y = e.y;
    Art.draw(ctx, 'nb1', x + 6, y + 9, 0, 0.35, 1, 1, 's');
    Art.draw(ctx, 'nb1', x, y);
    treadAnim(ctx, [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => [x + sx * 56 - 12, y + sz * 40 - 34, 24, 68]));
    bFlash(ctx, 'nb1', e);
    for (const s of [-1, 1]) smokeFrom(x + s * 24, y - 70, e.p2 ? 0.5 : 0.25, true);
    if (e.p2) { if (Math.floor(e.t * 4) % 2) for (const s of [-1, 1]) glowDot(ctx, x + s * 34, y - 50, 9, 'rgba(255,60,60,.9)'); smokeFrom(x + rnd(-40, 40), y + rnd(-30, 50), 0.3, true); }
    Art.draw(ctx, 'gunTur', x - 42, y + 34, e.gl - Math.PI / 2, 1, 1.3, 1.3);
    Art.draw(ctx, 'gunTur', x + 42, y + 34, e.gr - Math.PI / 2, 1, 1.3, 1.3);
    Art.draw(ctx, 'nb1t', x, y - 6, e.tur - Math.PI / 2);
    bFlash(ctx, 'nb1t', e, x, y - 6, e.tur - Math.PI / 2);
  }],
  boss2: ['nb2', (ctx, e) => {
    const x = e.x, y = e.y;
    wake(ctx, x, y + 152, 24, e.t);
    Art.draw(ctx, 'nb2', x + 5, y + 8, 0, 0.3, 1, 1, 's');
    Art.draw(ctx, 'nb2', x, y);
    bFlash(ctx, 'nb2', e);
    Art.draw(ctx, 'radar', x, y + 4 - 10, e.t * 2.4);
    smokeFrom(x, y + 14, 0.2, true);
    if (e.p2) for (const s of [-1, 1]) for (let k = 0; k < 5; k++) if ((Math.floor(e.t * 5) + k) % 3 === 0) glowDot(ctx, x + s * 33, y - 40 + k * 7, 5, 'rgba(255,60,60,.95)');
    ET.boss2.offs.forEach(([ox, oy], i) => { Art.draw(ctx, 'tur3', x + ox, y + oy, e.tur[i] - Math.PI / 2, 1, 1.15, 1.15); });
  }],
  boss3: ['nb3', (ctx, e) => {
    const x = e.x, y = e.y;
    Art.draw(ctx, 'nb3', x, y);
    bFlash(ctx, 'nb3', e);
    Art.draw(ctx, 'gat', x, y + 36, aim(x, y + 36) - Math.PI / 2, 1, 1.2, 1.2);
    if (Math.floor(e.t * (e.p2 ? 7 : 2)) % 2) glowDot(ctx, x, y - 18, 10, e.p2 ? 'rgba(255,50,50,.95)' : 'rgba(255,200,60,.85)');
    for (const s of [-1, 1]) { glowDot(ctx, x + s * 62, y + 8, 9, 'rgba(255,160,60,.6)'); rotorBlur(ctx, x + s * 62, y - 8, 41, s * e.t, 'rot3'); }
    if (e.p2) smokeFrom(x + rnd(-50, 50), y + rnd(-20, 20), 0.35, false);
  }],
  boss4: ['nb4', (ctx, e) => {
    const x = e.x, y = e.y;
    Art.draw(ctx, 'nb4', x + 6, y + 9, 0, 0.35, 1, 1, 's');
    Art.draw(ctx, 'nb4', x, y);
    treadAnim(ctx, [[x - 106 - 12, y - 82, 24, 164], [x + 106 - 12, y - 82, 24, 164]]);
    bFlash(ctx, 'nb4', e);
    ET.boss4.corners.forEach(([ox, oy], i) => Art.draw(ctx, 'gunTur', x + ox, y + oy, e.ct[i] - Math.PI / 2, 1, 1.35, 1.35));
    Art.draw(ctx, 'nb4g', x, y, e.tur - Math.PI / 2);
    bFlash(ctx, 'nb4g', e, x, y, e.tur - Math.PI / 2);
    const charging = G.beams.some(b => b.t < b.warn);
    const ca = Math.cos(e.tur), sa = Math.sin(e.tur);
    for (let k = 0; k < 6; k++) {
      const d = 22 + k * 10, on = charging ? (Math.floor(G.t * 16) + k) % 3 !== 0 : k === Math.floor(G.t * 4) % 6;
      if (on) glowDot(ctx, x + ca * d, y + sa * d, charging ? 14 : 9, charging ? 'rgba(140,220,255,.95)' : 'rgba(80,170,255,.6)');
    }
    if (charging) glowDot(ctx, x + ca * 82, y + sa * 82, 18 + Math.random() * 6, 'rgba(200,240,255,.95)');
  }],
};
for (const k in NEWB) {
  const [img, fn] = NEWB[k], prev = ET[k].draw;
  ET[k].draw = (ctx, e) => Bake.has(img) ? fn(ctx, e) : prev(ctx, e);
}
// 新造型比較大，判定框跟著調整
ET.boss1.hb = [[0, -10, 48], [0, 44, 34]];
ET.boss3.hb = [[0, 0, 30], [-62, -8, 18], [62, -8, 18], [0, 34, 16]];
