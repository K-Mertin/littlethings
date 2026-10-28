// 千軍突圍 — 3D 場景擺設：樹、風車、仙人掌、雪人、大樓……（每種三個樣子）
'use strict';

const DECOR3 = {
  tree(K, { v }) {
    const r = rng(11 + v * 7);
    const BARK = K.M(0x7a5232, { r: 0.85 }), BARK2 = K.M(0x5a3a22, { r: 0.9 });
    const G = [0x4f9e3a, 0x62b448, 0x3f8a32, 0x78c455].map(c => K.M(c, { r: 0.7, flat: true }));
    K.lathe([[0.32, 0], [0.22, 0.12], [0.17, 0.5], [0.15, 1.3], [0.12, 1.8], [0.02, 1.9]], [0, 0, 0], BARK, null, 12);
    for (let i = 0; i < 4; i++) { const a = i * 1.6 + v; K.horn([[0, 0.25, 0], [Math.cos(a) * 0.3, 0.06, Math.sin(a) * 0.3], [Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45]], 0.09, BARK2); }
    K.horn([[0, 1.3, 0], [0.4, 1.7, 0.1], [0.7, 1.95, 0.05]], 0.08, BARK);
    K.horn([[0, 1.5, 0], [-0.35, 1.9, -0.05], [-0.6, 2.1, 0]], 0.07, BARK);
    const blobs = [[0, 2.55, 0, 0.95], [0.75, 2.2, 0.1, 0.7], [-0.72, 2.25, 0.05, 0.72], [0.3, 3.05, -0.1, 0.65], [-0.35, 3.0, 0.15, 0.6], [0.1, 2.15, 0.6, 0.62], [-0.2, 2.1, -0.55, 0.6]];
    for (const [x, y, z, s] of blobs) {
      const geo = new K.T.IcosahedronGeometry(1, 1);
      K.mesh(geo, G[(r() * G.length) | 0], [x, y, z], [r(), r(), r()], s * (0.9 + r() * 0.2));
    }
    if (v === 2) for (let i = 0; i < 9; i++) { const a = r() * 6.28, y = 2.1 + r() * 1.1; K.sph(0.09, [Math.cos(a) * 0.85, y, Math.sin(a) * 0.7 + 0.25], K.M(0xe8402c, { r: 0.3, cc: 0.8 }), null, 10); }
    if (v === 1) for (let i = 0; i < 12; i++) { const a = r() * 6.28; K.sph(0.06, [Math.cos(a) * 0.9, 2.2 + r() * 1.1, Math.sin(a) * 0.8 + 0.2], K.M(0xffd6e8, { r: 0.6 }), null, 8); }
  },
  bush(K, { v }) {
    const r = rng(23 + v * 5);
    const G = [0x4a9a3a, 0x5fb34a, 0x3d8a30].map(c => K.M(c, { r: 0.75, flat: true }));
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; const geo = new K.T.IcosahedronGeometry(1, 1); K.mesh(geo, G[i % 3], [Math.cos(a) * 0.45, 0.35 + r() * 0.25, Math.sin(a) * 0.3], [r(), r(), r()], 0.38 + r() * 0.12); }
    const geo = new K.T.IcosahedronGeometry(1, 1); K.mesh(geo, G[1], [0, 0.65, 0], null, 0.45);
    const fc = [0xff6fa8, 0xffe14f, 0xffffff][v];
    for (let i = 0; i < 8; i++) { const a = r() * 6.28; K.sph(0.06, [Math.cos(a) * 0.55, 0.45 + r() * 0.5, Math.sin(a) * 0.35 + 0.15], K.M(fc, { r: 0.5 }), null, 8); }
  },
  flower(K, { v }) {
    const r = rng(31 + v * 3);
    const GR = K.M(0x5cae45, { r: 0.8 }), cols = [[0xff5a8a, 0xffd34d], [0xffffff, 0xffc21f], [0x9a6bff, 0xffffff]][v];
    for (let i = 0; i < 16; i++) { const x = (r() - 0.5) * 1.5, z = (r() - 0.5) * 0.6; K.cone(0.04, 0.3 + r() * 0.25, [x, 0.15, z], GR, [(r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5], 5); }
    for (let i = 0; i < 7; i++) {
      const x = (r() - 0.5) * 1.3, z = (r() - 0.5) * 0.5, h = 0.35 + r() * 0.3;
      K.cyl(0.012, 0.012, h, [x, h / 2, z], GR, null, 5);
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; K.sph([0.07, 0.025, 0.045], [x + Math.cos(a) * 0.07, h, z + Math.sin(a) * 0.07], K.M(cols[0], { r: 0.5 }), [0, -a, 0], 8); }
      K.sph(0.04, [x, h + 0.015, z], K.M(cols[1], { r: 0.5 }), null, 8);
    }
  },
  rock(K, { v }) {
    const r = rng(41 + v * 9);
    const ST = K.M([0x9a968e, 0xa89a86, 0x8e8a94][v], { r: 0.85, flat: true }), MOSS = K.M(0x6aa84a, { r: 0.9, flat: true });
    const geo = new K.T.DodecahedronGeometry(1, 0);
    K.mesh(geo, ST, [0, 0.45, 0], [0.3, v, 0.2], [0.85, 0.6, 0.7]);
    K.mesh(new K.T.DodecahedronGeometry(1, 0), ST, [0.6, 0.25, 0.25], [1, 2, 0.5], [0.4, 0.32, 0.38]);
    K.mesh(new K.T.DodecahedronGeometry(1, 0), ST, [-0.55, 0.18, 0.3], [2, 1, 0.3], [0.3, 0.22, 0.28]);
    if (v === 0) K.mesh(new K.T.DodecahedronGeometry(1, 0), MOSS, [-0.05, 0.92, 0.05], [0.3, 1, 0.2], [0.55, 0.15, 0.45]);
    for (let i = 0; i < 4; i++) K.mesh(new K.T.TetrahedronGeometry(1, 0), ST, [(r() - 0.5) * 1.6, 0.05, 0.4 + r() * 0.3], [r() * 3, r() * 3, 0], 0.08 + r() * 0.06);
  },
  windmill(K, { v }) {
    const WALL = K.M(0xf2ebe0, { r: 0.8 }), ROOF = K.M([0xc4452f, 0x3f6fb5, 0x6a8a3a][v], { r: 0.6 }), WOOD = K.M(0x7a5232, { r: 0.8 });
    const CLOTH = K.M(0xfaf6ee, { r: 0.9, ds: 1 }), DK = K.M(0x3a2a20);
    K.lathe([[1.15, 0], [1.1, 0.3], [0.85, 3.6], [0.8, 3.8], [0, 3.8]], [0, 0, 0], WALL, null, 20);
    K.tor(1.12, 0.08, [0, 0.3, 0], K.M(0xb8aa98, { r: 0.8 }), [Math.PI / 2, 0, 0], Math.PI * 2, 20);
    K.tor(0.86, 0.07, [0, 3.55, 0], WOOD, [Math.PI / 2, 0, 0], Math.PI * 2, 20);
    K.cone(1.05, 1.3, [0, 4.4, 0], ROOF, null, 20);
    K.box(0.55, 0.85, 0.1, [0, 0.42, 1.08], WOOD, 0.04, [0.08, 0, 0]);
    K.sph(0.04, [0.15, 0.45, 1.15], K.M(0xd8b04a, { m: 0.8, r: 0.3 }));
    for (const [y, x] of [[1.6, 0], [2.6, 0.3]]) { K.box(0.32, 0.42, 0.1, [x, y, 1.0 - (y - 1.6) * 0.08], K.M(0x6fb4e8, { r: 0.1, cc: 1 }), 0.03); K.box(0.4, 0.06, 0.14, [x, y - 0.25, 1.0 - (y - 1.6) * 0.08], WOOD, 0.02); }
    // 風車葉（四片格子帆）
    K.grp([0, 3.75, 1.0], [0, 0, 0.35 + v * 0.3], () => {
      K.cyl(0.14, 0.14, 0.35, [0, 0, 0], DK, [Math.PI / 2, 0, 0], 12);
      for (let i = 0; i < 4; i++) K.grp([0, 0, 0.15], [0, 0, i * Math.PI / 2], () => {
        K.box(0.1, 3.1, 0.08, [0, 1.6, 0], WOOD, 0.02);
        K.box(0.62, 2.3, 0.03, [0.36, 1.85, -0.02], CLOTH, 0.01);
        for (let k = 0; k < 6; k++) K.box(0.7, 0.04, 0.05, [0.36, 0.8 + k * 0.42, 0.02], WOOD, 0.01);
        K.box(0.04, 2.4, 0.05, [0.68, 1.85, 0.02], WOOD, 0.01);
      });
    });
  },
  cactus(K, { v }) {
    const G = K.M(0x4f9a4a, { r: 0.55, cc: 0.3 }), G2 = K.M(0x3d7f3a, { r: 0.6 }), SP = K.M(0xfff4c8, { r: 0.4 });
    const H = [2.2, 1.7, 2.4][v];
    const col = (a, b, rad) => {
      K.cap(a, b, rad, G);
      for (let i = 0; i < 6; i++) { const an = i / 6 * 6.28; K.cap([a[0] + Math.cos(an) * rad * 0.85, a[1], a[2] + Math.sin(an) * rad * 0.85], [b[0] + Math.cos(an) * rad * 0.85, b[1], b[2] + Math.sin(an) * rad * 0.85], rad * 0.25, G2); }
    };
    col([0, 0.1, 0], [0, H, 0], 0.26);
    col([0.26, 0.9, 0], [0.62, 0.95, 0], 0.15); col([0.62, 0.95, 0], [0.62, 1.6, 0], 0.15);
    if (v !== 1) { col([-0.26, 1.2, 0], [-0.55, 1.25, 0], 0.13); col([-0.55, 1.25, 0], [-0.55, 1.8, 0], 0.13); }
    for (let i = 0; i < 18; i++) { const y = 0.3 + (i * 0.37) % (H - 0.4), an = i * 2.4; K.cone(0.012, 0.08, [Math.cos(an) * 0.28, y, Math.sin(an) * 0.28], SP, [0, 0, Math.PI / 2 - an], 4); }
    const fl = K.M([0xff5a8a, 0xffd34d, 0xff8a3a][v], { r: 0.5 });
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; K.sph([0.08, 0.03, 0.05], [Math.cos(a) * 0.07, H + 0.26, Math.sin(a) * 0.07], fl, [0, -a, 0.4], 8); }
    K.sph(0.05, [0, H + 0.28, 0], K.M(0xffe14f));
    K.mesh(new K.T.DodecahedronGeometry(1, 0), K.M(0xc8a070, { r: 0.9, flat: true }), [0.3, 0.06, 0.35], null, [0.25, 0.12, 0.2]);
  },
  // 沙漠：小沙丘＋乾草
  skull(K, { v }) {
    const r = rng(51 + v);
    const SAND = K.M(0xdcae6e, { r: 0.95 }), GR = K.M(0xb8a050, { r: 0.8 });
    K.mesh(new K.T.SphereGeometry(1, 24, 12, 0, 6.28, 0, Math.PI / 2), SAND, [0, 0, 0], null, [0.8, 0.45, 0.5]);
    K.mesh(new K.T.SphereGeometry(1, 20, 10, 0, 6.28, 0, Math.PI / 2), SAND, [0.55, 0, 0.15], null, [0.45, 0.28, 0.35]);
    for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * 1.6, z = (r() - 0.5) * 0.6; K.cone(0.025, 0.4 + r() * 0.3, [x, 0.35 + r() * 0.1, z], GR, [(r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8], 4); }
    if (v === 2) { K.horn([[-0.6, 0.15, 0.4], [-0.3, 0.2, 0.5], [0.0, 0.15, 0.55]], 0.05, K.M(0xf4ecd8, { r: 0.5 })); K.sph(0.12, [0.05, 0.15, 0.55], K.M(0xf4ecd8, { r: 0.5 })); }
  },
  palm(K, { v }) {
    const TR = K.M(0x9a7248, { r: 0.85 }), RING = K.M(0x6f5030, { r: 0.9 }), LF = K.M(0x4fa848, { r: 0.6, ds: 1 }), LF2 = K.M(0x3d8a3a, { r: 0.6, ds: 1 });
    const bend = [0.6, -0.5, 0.3][v];
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([Math.sin(t * 1.4) * bend, t * 3.9, 0]); }
    for (let i = 0; i < 8; i++) { K.cap(pts[i], pts[i + 1], 0.17 - i * 0.008, TR, 0.16 - i * 0.008); K.tor(0.17 - i * 0.008, 0.035, pts[i + 1], RING, [Math.PI / 2, 0, 0], Math.PI * 2, 14); }
    const top = pts[8];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * 6.28 + v;
      K.grp(top, [0, -a, 0], () => {
        K.shape(s => { s.moveTo(0, 0); s.quadraticCurveTo(0.9, 0.35, 1.9, -0.6); s.quadraticCurveTo(0.9, 0.0, 0, -0.06); }, 0.02, [0, 0, 0], i % 2 ? LF : LF2, [Math.PI / 2 - 0.35, 0, 0], 0);
        K.grp([0, 0, 0], [Math.PI / 2 - 0.35, 0, 0], () => K.box(1.6, 0.03, 0.03, [0.85, 0.05, 0], RING, 0.01, [0, 0, -0.25]));
      });
    }
    for (let i = 0; i < 3; i++) { const a = i * 2.1; K.sph(0.13, [top[0] + Math.cos(a) * 0.15, top[1] - 0.2, Math.sin(a) * 0.15], K.M(0x6a4a24, { r: 0.6 }), null, 12); }
  },
  mesa(K, { v }) {
    const L = [0xc8643a, 0xd98a52, 0xb4522e, 0xe0a068].map(c => K.M(c, { r: 0.9, flat: true }));
    const H = [4.6, 3.8, 5.0][v], wd = [2.8, 3.1, 2.5][v];
    let y = 0, k = 0;
    while (y < H) {
      const h = 0.5 + ((k * 7) % 3) * 0.25, rr0 = wd * (1 - y / H * 0.25), rr1 = wd * (1 - (y + h) / H * 0.25) - (y + h >= H ? 0 : 0.05);
      K.cyl(rr1, rr0, Math.min(h, H - y + 0.01), [0, y + Math.min(h, H - y) / 2, 0], L[k % 4], [0, k * 0.4, 0], 9);
      y += h; k++;
    }
    K.cyl(wd * 0.72, wd * 0.76, 0.1, [0, H + 0.04, 0], K.M(0xe0a868, { r: 0.95, flat: true }), null, 9);
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + v; K.mesh(new K.T.IcosahedronGeometry(1, 0), K.M(0x7a9a4a, { r: 0.9, flat: true }), [Math.cos(a) * wd * 0.4, H + 0.15, Math.sin(a) * wd * 0.35], null, 0.25 + (i % 2) * 0.1); }
    for (let i = 0; i < 6; i++) { const a = i * 1.1 + v; K.mesh(new K.T.DodecahedronGeometry(1, 0), L[i % 4], [Math.cos(a) * wd * 1.05, 0.2, Math.sin(a) * wd * 0.9], [i, i, 0], 0.3 + (i % 3) * 0.12); }
  },
  pine(K, { v }) {
    const TR = K.M(0x6a4428, { r: 0.85 }), G = [0x2f7a4f, 0x3a8f5c, 0x2a6a46].map(c => K.M(c, { r: 0.7, flat: true })), SN = K.M(0xffffff, { r: 0.6, flat: true });
    K.cyl(0.14, 0.2, 1.0, [0, 0.5, 0], TR, null, 10);
    const lv = [[1.35, 1.5, 0.7], [1.1, 1.3, 1.5], [0.82, 1.15, 2.25], [0.52, 1.0, 2.95]];
    lv.forEach(([rad, h, y], i) => {
      K.cone(rad, h, [0, y + h / 2, 0], G[i % 3], [0, i * 0.5 + v, 0], 9);
      if (v !== 1) K.cone(rad * 0.62, h * 0.42, [0, y + h * 0.79, 0], SN, [0, i * 0.5 + v, 0], 9);
    });
    if (v === 2) K.mesh(new K.T.OctahedronGeometry(0.16, 0), K.M(0xffe14f, { r: 0.3, m: 0.6, e: 0x5a4400 }), [0, 4.1, 0]);
  },
  snowman(K, { v }) {
    const SN = K.M(0xf6f9ff, { r: 0.7 }), BLK = K.M(0x1d2130, { r: 0.4 }), SC = K.M([0xe8453c, 0x3f82f2, 0x4fa848][v], { r: 0.8 });
    K.sph([0.62, 0.55, 0.6], [0, 0.5, 0], SN, null, 28);
    K.sph(0.45, [0, 1.25, 0], SN, null, 28);
    K.sph(0.34, [0, 1.85, 0.02], SN, null, 28);
    K.tor(0.3, 0.08, [0, 1.58, 0.02], SC, [Math.PI / 2 - 0.1, 0, 0], Math.PI * 2, 24);
    K.box(0.14, 0.4, 0.06, [0.18, 1.38, 0.33], SC, 0.03, [0.2, 0, 0.15]);
    for (const sd of [-1, 1]) K.sph(0.045, [sd * 0.11, 1.93, 0.31], BLK, null, 10);
    K.cone(0.06, 0.32, [0, 1.84, 0.48], K.M(0xff8a2a, { r: 0.5 }), [Math.PI / 2, 0, 0], 10);
    for (let i = 0; i < 5; i++) { const a = Math.PI * (0.2 + i * 0.15); K.sph(0.025, [Math.cos(a) * 0.17, 1.76 - Math.sin(a) * 0.08, 0.31], BLK, null, 8); }
    for (const y of [1.15, 1.3, 1.45]) K.sph(0.04, [0, y, 0.44], BLK, null, 8);
    if (v !== 2) { K.cyl(0.25, 0.25, 0.04, [0, 2.12, 0], BLK, null, 20); K.cyl(0.17, 0.17, 0.32, [0, 2.3, 0], BLK, null, 20); K.cyl(0.175, 0.175, 0.06, [0, 2.17, 0], SC, null, 20); }
    else K.dome(0.3, [0, 2.08, 0], SC), K.sph(0.08, [0, 2.4, 0], SN);
    const ST = K.M(0x6a4428, { r: 0.8 });
    for (const sd of [-1, 1]) { K.horn([[sd * 0.4, 1.3, 0], [sd * 0.8, 1.55, 0.05], [sd * 1.0, 1.75, 0.05]], 0.03, ST); K.horn([[sd * 0.85, 1.6, 0.05], [sd * 0.95, 1.5, 0.08]], 0.015, ST); }
  },
  ice(K, { v }) {
    const r = rng(61 + v * 3);
    const IC = K.M(0x6cc8f4, { r: 0.05, cc: 1, op: 0.8, flat: true, env: 1.2 }), IC2 = K.M(0xb4e6ff, { r: 0.05, cc: 1, op: 0.85, flat: true, env: 1.2 });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.28, d = i === 0 ? 0 : 0.35 + r() * 0.25, h = i === 0 ? 2.0 : 0.7 + r() * 0.8;
      const geo = new K.T.CylinderGeometry(0, 0.22 + r() * 0.08, h, 6);
      K.mesh(geo, i % 2 ? IC : IC2, [Math.cos(a) * d, h / 2 - 0.05, Math.sin(a) * d * 0.7], [(r() - 0.5) * 0.5, r(), (r() - 0.5) * 0.5 + (i ? Math.cos(a) * -0.3 : 0)]);
    }
    K.mesh(new K.T.SphereGeometry(1, 16, 8, 0, 6.28, 0, Math.PI / 2), K.M(0xffffff, { r: 0.7 }), [0, 0, 0], null, [0.8, 0.2, 0.6]);
  },
  lamp(K, { v }) {
    const POLE = K.M(0x3a3f55, { r: 0.4, m: 0.7 }), LIT = K.M(0xfff2b8, { glow: 1 });
    K.cyl(0.18, 0.24, 0.35, [0, 0.17, 0], POLE, null, 12);
    K.cyl(0.07, 0.09, 3.8, [0, 2.2, 0], POLE, null, 12);
    K.horn([[0, 3.9, 0], [-0.3, 4.15, 0], [-0.9, 4.15, 0]], 0.05, POLE, 0.045);
    K.cyl(0.08, 0.32, 0.22, [-0.95, 4.05, 0], POLE, null, 14);
    K.cyl(0.26, 0.26, 0.04, [-0.95, 3.93, 0], LIT, null, 14);
    K.sph(0.16, [-0.95, 3.9, 0.02], LIT, null, 14);
    for (let i = 0; i < 3; i++) K.tor(0.1, 0.02, [0, 0.7 + i * 0.05, 0], POLE, [Math.PI / 2, 0, 0], 6.28, 12);
    if (v === 1) K.box(0.5, 0.7, 0.04, [0.3, 2.6, 0.05], K.M(0xff4fd8, { glow: 1 }), 0.02);
    if (v === 2) K.box(0.5, 0.5, 0.05, [0, 2.0, 0.1], K.M(0x3f82f2, { r: 0.4, cc: 0.6 }), 0.03);
  },
  building(K, { v }) {
    const r = rng(71 + v * 13);
    const BC = K.M([0x3a2f6a, 0x2a4a6a, 0x5a2a5a][v], { r: 0.7 }), TRIM = K.M([0x524a8a, 0x3f6a90, 0x7a3f7a][v], { r: 0.6 });
    const WIN = K.M([0xffe680, 0x7df9ff, 0xff8ad8][v], { glow: 1 }), OFF = K.M(0x1a1830, { r: 0.2, cc: 1 });
    const W = 5.4, D = 3.4, H = [7.6, 6.6, 8.2][v];
    K.box(W, H, D, [0, H / 2, 0], BC, 0.08);
    for (let y = 0; y < H; y += 2.4) K.box(W + 0.12, 0.14, D + 0.12, [0, y + 0.07, 0], TRIM, 0.04);
    K.box(W + 0.2, 0.3, D + 0.2, [0, H + 0.1, 0], TRIM, 0.06);
    for (let y = 0.9; y < H - 0.6; y += 0.8) for (let x = -W / 2 + 0.55; x < W / 2 - 0.3; x += 0.75) {
      const on = r() > 0.38;
      K.box(0.42, 0.48, 0.06, [x, y, D / 2 + 0.01], on ? WIN : OFF, 0.02);
    }
    for (let y = 0.9; y < H - 0.6; y += 0.8) for (let z = -D / 2 + 0.5; z < D / 2 - 0.3; z += 0.75) if (r() > 0.5) K.box(0.06, 0.48, 0.42, [-W / 2 - 0.01, y, z], WIN, 0.02);
    // 屋頂：冷氣、水塔、天線
    K.box(0.8, 0.5, 0.6, [-1.4, H + 0.5, 0], K.M(0x8a90a0, { r: 0.4, m: 0.6 }), 0.05);
    if (v !== 1) { K.cyl(0.5, 0.5, 0.9, [1.2, H + 1.0, -0.3], K.M(0x7a5232, { r: 0.8 }), null, 14); K.cone(0.55, 0.4, [1.2, H + 1.65, -0.3], K.M(0x5a3a22), null, 14); for (const sd of [-1, 1]) K.cyl(0.04, 0.04, 0.5, [1.2 + sd * 0.35, H + 0.4, -0.3], POLEC(K), null, 6); }
    else { K.cyl(0.03, 0.03, 2.4, [1.4, H + 1.4, 0], POLEC(K), null, 6); K.sph(0.1, [1.4, H + 2.62, 0], K.M(0xff3b3b, { glow: 1 })); }
    // 一樓的店面
    K.box(W * 0.5, 1.1, 0.1, [0.4, 0.6, D / 2 + 0.03], K.M(0x2a2a40, { r: 0.1, cc: 1 }), 0.03);
    K.box(W * 0.56, 0.36, 0.6, [0.4, 1.35, D / 2 + 0.3], K.M([0xe8453c, 0x3fc8a0, 0xffc21f][v], { r: 0.6 }), 0.04, [0.3, 0, 0]);
  },
  sign(K, { v }) {
    const POLE = POLEC(K), c = [0xff4fd8, 0x3ff2ff, 0xffe14f][v], NE = K.M(c, { glow: 1 });
    K.cyl(0.08, 0.1, 2.0, [0, 1.0, 0], POLE, null, 10);
    K.box(2.2, 1.2, 0.18, [0, 2.6, 0], K.M(0x1a1c2a, { r: 0.4 }), 0.06);
    // 霓虹管外框
    const pts = [[-1.0, 2.1], [1.0, 2.1], [1.0, 3.1], [-1.0, 3.1]];
    for (let i = 0; i < 4; i++) K.cap([pts[i][0], pts[i][1], 0.12], [pts[(i + 1) % 4][0], pts[(i + 1) % 4][1], 0.12], 0.035, NE);
    // 字：用畫布當貼圖
    const cv = mkCanvas(256, 128), g = cv.getContext('2d');
    g.fillStyle = '#' + c.toString(16).padStart(6, '0'); g.shadowColor = g.fillStyle; g.shadowBlur = 18;
    g.font = '900 78px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(['夜市', 'GO!', '★★'][v], 128, 68); g.fillText(['夜市', 'GO!', '★★'][v], 128, 68);
    const tex = new K.T.CanvasTexture(cv); tex.colorSpace = K.T.SRGBColorSpace;
    const mat = new K.T.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
    K.mats.set('signtex' + v + Math.random(), mat);
    K.mesh(new K.T.PlaneGeometry(1.9, 0.95), mat, [0, 2.6, 0.1]);
    for (const sd of [-1, 1]) K.box(0.06, 0.6, 0.06, [sd * 0.7, 3.4, 0], POLE, 0.02);
  },
};
function POLEC(K) { return K.M(0x3a3f55, { r: 0.4, m: 0.7 }); }

function sceneJobs3() {
  const J = [];
  const order = ['tree', 'bush', 'flower', 'rock', 'windmill', 'cactus', 'skull', 'palm', 'mesa', 'pine', 'snowman', 'ice', 'lamp', 'building', 'sign'];
  for (const k of order) J.push(['decor', async () => {
    const big = k === 'building' || k === 'mesa';
    ART.decor[k] = await bakeSet(DECOR3[k], [0, 1, 2].map(v => ({ v })), { ppu: big ? 36 : k === 'windmill' || k === 'palm' ? 48 : 60, th: 40, ol: 'rgba(20,30,20,.55)', olpx: 1.2, key: 2.4 });
  }]);
  return J;
}

// ---------- 道具：補給箱、油桶 ----------
function texLabel(K, w, h, draw) {
  const cv = mkCanvas(w, h); draw(cv.getContext('2d'), w, h);
  const tex = new K.T.CanvasTexture(cv); tex.colorSpace = K.T.SRGBColorSpace;
  const m = new K.T.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5 });
  K.mats.set('tex' + Math.random(), m);
  return m;
}
function crate3(K) {
  const WD = K.M(0xd49a52, { r: 0.75 }), WD2 = K.M(0xa8702f, { r: 0.8 }), MT = K.M(0x5a606c, { r: 0.35, m: 0.8 }), BL = K.M(0x2f9bff, { r: 0.35, cc: 0.8 });
  const S = 0.9;
  K.box(S, S, S, [0, S / 2, 0], WD, 0.05);
  // 木條框和對角斜撐
  for (const z of [S / 2 + 0.01, -S / 2 - 0.01]) {
    for (const [x, y, w, h] of [[0, 0.06, S, 0.11], [0, S - 0.06, S, 0.11], [-S / 2 + 0.06, S / 2, 0.11, S], [S / 2 - 0.06, S / 2, 0.11, S]]) K.box(w, h, 0.05, [x, y, z], WD2, 0.02);
    K.box(0.1, S * 1.2, 0.04, [0, S / 2, z], WD2, 0.02, [0, 0, 0.785]);
  }
  for (const [x, z] of [[S / 2 + 0.01, 0], [-S / 2 - 0.01, 0]]) for (const [y, w, h] of [[0.06, S, 0.11], [S - 0.06, S, 0.11]]) K.box(0.05, h, w, [x, y, z], WD2, 0.02);
  K.box(S + 0.02, 0.06, S + 0.02, [0, S + 0.005, 0], WD2, 0.02);
  // 金屬護角
  for (const x of [-1, 1]) for (const y of [0, 1]) for (const z of [-1, 1]) K.box(0.14, 0.14, 0.14, [x * S / 2, y * S, z * S / 2], MT, 0.03);
  // 藍色問號牌
  K.box(0.46, 0.32, 0.04, [0, S / 2, S / 2 + 0.05], BL, 0.06);
  const lab = texLabel(K, 128, 96, (g, w, h) => { g.fillStyle = '#fff'; g.font = '900 84px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 4); });
  K.mesh(new K.T.PlaneGeometry(0.4, 0.3), lab, [0, S / 2, S / 2 + 0.075]);
  const lab2 = texLabel(K, 128, 128, (g, w, h) => { g.fillStyle = '#2f9bff'; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '900 80px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 68); });
  K.mesh(new K.T.PlaneGeometry(0.42, 0.42), lab2, [0, S + 0.04, 0], [-Math.PI / 2, 0, 0]);
}
function barrel3(K) {
  const RD = K.M(0xe0412f, { r: 0.35, cc: 0.7 }), RIM = K.M(0x7a1414, { r: 0.4, m: 0.5 }), YL = K.M(0xffd34d, { r: 0.4 });
  K.lathe([[0.36, 0], [0.4, 0.06], [0.42, 0.45], [0.4, 0.86], [0.36, 0.92], [0, 0.92]], [0, 0, 0], RD, null, 28);
  for (const y of [0.06, 0.32, 0.6, 0.88]) K.tor(0.41, 0.025, [0, y, 0], RIM, [Math.PI / 2, 0, 0], 6.28, 28);
  K.cyl(0.07, 0.07, 0.05, [0.18, 0.94, 0.05], RIM, null, 12);
  const lab = texLabel(K, 128, 128, (g, w, h) => {
    g.fillStyle = '#ffd34d'; g.beginPath(); g.moveTo(64, 14); g.lineTo(118, 108); g.lineTo(10, 108); g.closePath(); g.fill();
    g.strokeStyle = '#2a1a0a'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#2a1a0a'; g.font = '900 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 64, 76);
  });
  K.mesh(new K.T.CylinderGeometry(0.425, 0.425, 0.3, 24, 1, true, -0.55, 1.1), lab, [0, 0.46, 0]);
  K.tor(0.3, 0.02, [0, 0.925, 0], YL, [Math.PI / 2, 0, 0], 6.28, 24);
}

// ---------- 守城：敵方城堡、我方砲台 ----------
function castle3(K, { rage }) {
  const STN = [0x5e4d6e, 0x6e5c80, 0x4e3f5c].map(c => K.M(c, { r: 0.85, flat: true })), DK = K.M(0x2c2436, { r: 0.8 });
  const ROOF = K.M(rage ? 0xff3b2b : 0xc0392b, { r: 0.5, cc: 0.4 }), WOOD = K.M(0x8a6a3a, { r: 0.8 }), IRON = K.M(0x3a3a44, { r: 0.4, m: 0.7 });
  const WIN = K.M(rage ? 0xff5a3a : 0xffcc55, { glow: 1 }), FIRE = K.M(rage ? 0xff4020 : 0xffa030, { glow: 1 });
  // 城牆（石塊磚）
  const W = 6.2, H = 3.4, D = 1.4;
  K.box(W, H, D, [0, H / 2, 0], STN[0], 0.08);
  const r = rng(5);
  for (let y = 0.25; y < H; y += 0.5) for (let x = -W / 2 + 0.3 + ((y * 2) % 1 ? 0.3 : 0); x < W / 2 - 0.2; x += 0.62) if (Math.abs(x) > 1.1 || y > 2.4) K.box(0.56, 0.44, 0.08, [x, y, D / 2 + 0.02], STN[(r() * 3) | 0], 0.04);
  for (let x = -W / 2 + 0.3; x < W / 2; x += 0.62) K.box(0.4, 0.45, D + 0.1, [x, H + 0.22, 0], STN[1], 0.05);
  // 大門
  K.shape(s => { s.moveTo(-1.0, 0); s.lineTo(-1.0, 1.6); s.quadraticCurveTo(0, 2.7, 1.0, 1.6); s.lineTo(1.0, 0); s.lineTo(-1.0, 0); }, 0.12, [0, 0, D / 2 + 0.02], K.M(0x1c1520));
  for (let x = -0.8; x <= 0.81; x += 0.32) K.box(0.08, 2.0 - Math.abs(x) * 0.5, 0.06, [x, (2.0 - Math.abs(x) * 0.5) / 2, D / 2 + 0.1], IRON, 0.02);
  for (const y of [0.5, 1.2]) K.box(1.9, 0.07, 0.06, [0, y, D / 2 + 0.12], IRON, 0.02);
  K.tor(1.05, 0.12, [0, 1.6, D / 2 + 0.06], STN[2], null, Math.PI, 20);
  // 骷髏旗
  K.box(1.1, 0.9, 0.05, [0, 2.75, D / 2 + 0.08], K.M(rage ? 0xff3b3b : 0xd83a32, { r: 0.7 }), 0.02);
  K.sph([0.22, 0.2, 0.08], [0, 2.82, D / 2 + 0.14], K.M(0xffffff, { r: 0.5 }), null, 14);
  for (const sd of [-1, 1]) K.sph(0.05, [sd * 0.08, 2.84, D / 2 + 0.21], K.M(0x1c1520), null, 8);
  K.box(0.2, 0.1, 0.05, [0, 2.66, D / 2 + 0.14], K.M(0xffffff, { r: 0.5 }), 0.02);
  // 兩座塔
  for (const sd of [-1, 1]) {
    const x = sd * 3.4;
    K.cyl(1.15, 1.25, 5.2, [x, 2.6, 0.1], STN[2], null, 12);
    for (let y = 0.4; y < 5; y += 0.55) K.tor(1.22, 0.04, [x, y, 0.1], DK, [Math.PI / 2, 0, 0], 6.28, 12);
    K.cyl(1.4, 1.3, 0.4, [x, 5.3, 0.1], STN[1], null, 12);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; K.box(0.36, 0.42, 0.36, [x + Math.cos(a) * 1.25, 5.7, 0.1 + Math.sin(a) * 1.25], STN[1], 0.04, [0, -a, 0]); }
    K.cone(1.2, 2.0, [x, 6.9, 0.1], ROOF, null, 12);
    K.cyl(0.04, 0.04, 1.0, [x, 8.3, 0.1], WOOD, null, 6);
    K.box(0.7, 0.42, 0.03, [x + 0.37, 8.55, 0.1], ROOF, 0.01);
    for (const y of [2.2, 3.6]) { K.box(0.36, 0.6, 0.12, [x, y, 1.27], DK, 0.08); K.box(0.26, 0.5, 0.1, [x, y, 1.31], WIN, 0.06); }
    // 火把
    K.cyl(0.05, 0.04, 0.5, [sd * 1.5, 2.0, D / 2 + 0.15], WOOD, [0.3, 0, 0], 8);
    K.sph([0.12, 0.2, 0.12], [sd * 1.5, 2.35, D / 2 + 0.25], FIRE, null, 10);
  }
  if (rage) for (let i = 0; i < 6; i++) K.sph([0.25, 0.4, 0.2], [-2.2 + i * 0.9, H + 0.6, 0.2], FIRE, null, 10);
}
function cannon3(K) {
  const BL = K.M(0x2f6fe6, { r: 0.35, cc: 0.7 }), GD = K.M(0xffc21f, { r: 0.3, m: 0.7 }), WOOD = K.M(0x8a5a2a, { r: 0.75 }), DKW = K.M(0x5a3a1a, { r: 0.8 });
  const MT = K.M(0x3a4252, { r: 0.25, m: 0.85 }), MT2 = K.M(0x9aa6ba, { r: 0.2, m: 0.9 });
  // 輪子
  for (const sd of [-1, 1]) K.grp([sd * 0.8, 0.5, -0.1], [0, 0, Math.PI / 2], () => {
    K.cyl(0.5, 0.5, 0.14, [0, 0, 0], DKW, null, 24);
    K.tor(0.48, 0.05, [0, 0, 0], MT, [Math.PI / 2, 0, 0], 6.28, 24);
    for (let k = 0; k < 6; k++) K.box(0.07, 0.07, 0.85, [0, 0, 0], WOOD, 0.02, [0, k * Math.PI / 6, 0]);
    K.cyl(0.12, 0.12, 0.2, [0, 0, 0], GD, null, 12);
  });
  // 底座
  K.box(1.3, 0.5, 1.5, [0, 0.55, -0.1], BL, 0.12);
  K.box(1.34, 0.08, 1.54, [0, 0.82, -0.1], GD, 0.03);
  for (const sd of [-1, 1]) K.box(0.18, 0.5, 0.6, [sd * 0.45, 1.0, 0], BL, 0.06);
  // 砲管：朝 +z（遠方）
  K.grp([0, 1.15, 0], [-0.18, 0, 0], () => {
    K.lathe([[0.42, -0.75], [0.46, -0.6], [0.4, -0.5], [0.36, 0.3], [0.3, 1.1], [0.36, 1.2], [0.36, 1.32], [0.24, 1.33], [0.24, 1.0]], [0, 0, 0], MT, [Math.PI / 2, 0, 0], 28);
    for (const z of [-0.4, 0.3, 1.05]) K.tor(z < 0 ? 0.42 : z < 1 ? 0.37 : 0.32, 0.05, [0, 0, z], GD, null, 6.28, 28);
    K.sph(0.3, [0, 0, -0.78], MT2, null, 16);
    K.sph(0.1, [0, 0, -1.1], GD, null, 10);
    K.cyl(0.05, 0.05, 0.3, [0, 0.42, -0.2], MT2, null, 8);
  });
}
function propJobs3() {
  return [
    ['prop', async () => { ART.haz.crate = await bake3(crate3, { ppu: 120, th: 40, scale: 1.1, ol: 'rgba(60,30,8,.8)', olpx: 1.6 }); }],
    ['prop', async () => { ART.barrel = await bake3(barrel3, { ppu: 110, th: 40, scale: 1.12, ol: 'rgba(60,8,8,.8)', olpx: 1.6 }); }],
  ];
}
function defJobs3() {
  return [
    ['def', async () => {
      const D = ART.def, b = await bakeSet(castle3, [{ rage: false }, { rage: true }], { ppu: 44, th: 50, ol: 'rgba(20,10,30,.8)', olpx: 1.5 });
      D.base = b; D.baseFlash = b.map(s => { const c = flashOf(s); c.wh = s.wh; c.foot = s.foot; return c; });
    }],
    ['def', async () => { ART.def.cannon = await bake3(cannon3, { ppu: 110, th: 50, rotY: Math.PI, ol: 'rgba(10,20,50,.8)', olpx: 1.6 }); }],
    ['def', async () => { ART.def.giant = await bakeSet(soldier3, [0, 1, 2, 3].map(f => ({ f, v: 2, wid: 'rifle', gold: 1 })), { ppu: 150, th: 48, rotY: Math.PI, scale: 1.12, ol: 'rgba(90,50,0,.85)', olpx: 1.8 }); }],
  ];
}
