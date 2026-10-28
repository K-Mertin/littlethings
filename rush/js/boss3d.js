// 千軍突圍 — 3D 頭目：巨石魔像、沙暴蠍王、冰霜巨人、機械魔王
// 動作：走路四格、舉手（蓄力）、重擊兩格；暴怒時另外烤一套紅色的
'use strict';

const BOSS3 = {
  golem(K, a) {
    const B = a.bob, rage = a.rage;
    const ST = [0xb9b0a2, 0xa69c8c, 0xc8beae, 0x958b7c].map(c => K.M(c, { r: 0.85, flat: true }));
    const DK = K.M(0x5c544a, { r: 0.9, flat: true }), MOSS = K.M(0x6aa84a, { r: 0.9, flat: true });
    const GL = K.M(rage ? 0xff5a2a : 0xffb43a, { glow: 1 }), GL2 = K.M(rage ? 0xffd0b0 : 0xfff0b0, { glow: 1 });
    const CRY = K.M(rage ? 0xff7a5a : 0xffd27a, { r: 0.1, cc: 1, e: rage ? 0x8a1a00 : 0x8a5a00, ei: 0.8, flat: true });
    const rock = (s, p, m, rot) => K.mesh(new K.T.DodecahedronGeometry(1, 0), m, p, rot || [p[0] * 1.7, p[1], p[2] * 2.3], s);
    // 腿
    for (const sd of [-1, 1]) {
      const l = Math.max(0, sd * B) * 4;
      rock([0.55, 0.75, 0.55], [sd * 0.7, 0.75 + l, 0], ST[1]);
      rock([0.7, 0.3, 0.75], [sd * 0.72, 0.22 + l, 0.15], ST[3]);
      for (const k of [-1, 0, 1]) rock([0.15, 0.12, 0.15], [sd * 0.72 + k * 0.25, 0.12 + l, 0.8], DK);
    }
    const up = B * 0.5;
    // 身體
    rock([1.45, 1.15, 1.05], [0, 2.25 + up, 0], ST[2], [0.2, 0.4, 0.1]);
    rock([0.7, 0.5, 0.6], [-0.6, 2.9 + up, 0.35], ST[0]);
    rock([0.65, 0.45, 0.55], [0.7, 2.85 + up, 0.3], ST[0]);
    rock([0.95, 0.42, 0.8], [0, 1.4 + up, 0.15], ST[3]);
    rock([0.5, 0.15, 0.45], [-0.9, 3.25 + up, 0.1], MOSS);
    rock([0.35, 0.1, 0.3], [0.85, 1.6 + up, 0.6], MOSS);
    // 胸口符文與裂縫
    K.tor(0.4, 0.06, [0, 2.2 + up, 1.0], GL, null, Math.PI * 2, 28);
    K.box(0.07, 0.62, 0.05, [0, 2.2 + up, 1.03], GL, 0.02); K.box(0.62, 0.07, 0.05, [0, 2.2 + up, 1.03], GL, 0.02);
    K.sph(0.15, [0, 2.2 + up, 1.0], GL2, null, 14);
    for (const [x, y, r] of [[-0.85, 1.85, 0.6], [0.95, 2.3, -0.5], [-0.4, 1.55, 0.3]]) K.box(0.05, 0.4, 0.05, [x, y + up, 0.95], GL, 0.015, [0, 0, r]);
    // 頭
    rock([0.78, 0.55, 0.62], [0, 3.85 + up, 0.25], ST[2], [0.1, 0.3, 0.05]);
    K.box(1.2, 0.18, 0.3, [0, 4.0 + up, 0.75], DK, 0.06, [0.2, 0, 0]);
    for (const sd of [-1, 1]) { K.sph([0.14, 0.09, 0.05], [sd * 0.3, 3.88 + up, 0.82], GL2, null, 12); K.sph([0.2, 0.14, 0.05], [sd * 0.3, 3.88 + up, 0.79], GL, null, 12); }
    K.box(0.6, 0.1 + a.ap * 0.15, 0.08, [0, 3.58 + up, 0.82], K.M(0x2a2420), 0.03);
    // 肩上的水晶
    for (const sd of [-1, 1]) {
      K.mesh(new K.T.OctahedronGeometry(1, 0), CRY, [sd * 1.35, 3.85 + up, -0.1], [0, 0.4, sd * 0.3], [0.18, 0.55, 0.18]);
      K.mesh(new K.T.OctahedronGeometry(1, 0), CRY, [sd * 1.7, 3.6 + up, 0.0], [0, 0.4, sd * 0.6], [0.14, 0.4, 0.14]);
    }
    // 手臂：走路下垂、舉高、往前砸
    for (const sd of [-1, 1]) {
      let el, fi;
      if (a.raise) { el = [sd * 1.9, 4.2, 0.2]; fi = [sd * 1.35, 5.3, 0.35]; }
      else if (a.ap > 0) { const t = a.ap; el = [sd * 1.95, 2.55 - t * 0.4, 0.7 + t * 0.4]; fi = [sd * 1.6, 1.5 - t * 0.7, 1.4 + t * 0.6]; }
      else { const sw = -sd * B * 3; el = [sd * 2.05, 2.3 + up, 0.15 + sw]; fi = [sd * 2.05, 1.25 + up, 0.45 + sw]; }
      rock([0.62, 0.55, 0.6], [sd * 1.6, 3.25 + up, 0.05], ST[0]);
      rock([0.42, 0.42, 0.42], [(sd * 1.6 + el[0]) / 2, (3.25 + up + el[1]) / 2, (el[2]) / 2], ST[1]);
      rock([0.45, 0.5, 0.45], el, ST[3]);
      rock([0.38, 0.4, 0.38], [(el[0] + fi[0]) / 2, (el[1] + fi[1]) / 2, (el[2] + fi[2]) / 2], ST[1]);
      rock([0.62, 0.66, 0.62], fi, ST[2]);
      for (const k of [-1, 0, 1]) rock([0.16, 0.14, 0.14], [fi[0] + k * 0.28, fi[1] - 0.3, fi[2] + 0.45], DK);
    }
  },
  scorpion(K, a) {
    const B = a.bob * 0.5, rage = a.rage;
    const SH = K.M(0xe0a050, { r: 0.35, cc: 0.8 }), SH2 = K.M(0xc07a2e, { r: 0.4, cc: 0.6 }), DK = K.M(0x6a3c12, { r: 0.5 });
    const STG = K.M(rage ? 0xff3b3b : 0xa64fe0, { r: 0.2, cc: 1, e: rage ? 0x6a0000 : 0x3a0a5a });
    const GLW = K.M(rage ? 0xff6a6a : 0xd8a0ff, { glow: 1 });
    // 腳：三對，分節
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
      const lift = Math.max(0, Math.sin(a.ph * 3 + i + (sd > 0 ? 1 : 0))) * 0.25;
      const z = 0.5 - i * 0.55;
      const p0 = [sd * 0.75, 0.75, z], p1 = [sd * (1.45 + i * 0.15), 1.25 + lift, z + 0.15 - i * 0.1], p2 = [sd * (1.95 + i * 0.25), 0.0 + lift * 0.4, z + 0.3 - i * 0.2];
      K.cap(p0, p1, 0.11, SH2, 0.09); K.cap(p1, p2, 0.09, SH2, 0.035);
      K.sph(0.12, p1, DK, null, 10);
    }
    // 身體甲殼（分節）
    K.grp([0, B, 0], null, () => {
      for (let i = 0; i < 4; i++) {
        const z = 0.65 - i * 0.45, s = 1 - i * 0.08;
        K.sph([1.05 * s, 0.5 * s, 0.42], [0, 0.95 + i * 0.03, z], i % 2 ? SH2 : SH, null, 28);
        for (let k = -1; k <= 1; k++) K.cone(0.08, 0.22, [k * 0.4 * s, 1.42 + i * 0.03 - Math.abs(k) * 0.08, z], DK, [-0.4, 0, -k * 0.3], 8);
      }
      // 頭與四顆眼睛
      K.sph([0.75, 0.42, 0.45], [0, 0.95, 1.1], SH, null, 24);
      for (const [x, y, r] of [[-0.25, 1.22, 0.12], [0.25, 1.22, 0.12], [-0.1, 1.33, 0.07], [0.1, 1.33, 0.07]]) {
        K.sph(r, [x, y, 1.45], K.M(rage ? 0xff2b2b : 0x2a0f05, { r: 0.1, cc: 1 }), null, 12);
        K.sph(r * 0.3, [x - r * 0.3, y + r * 0.35, 1.45 + r * 0.9], K.M(0xffffff, { glow: 1 }), null, 6);
      }
      // 大顎
      for (const sd of [-1, 1]) K.horn([[sd * 0.2, 0.75, 1.45], [sd * 0.22, 0.6, 1.6], [sd * 0.1, 0.5, 1.68]], 0.07, DK);
      // 鉗子
      for (const sd of [-1, 1]) {
        const cx = sd * (1.75 + (a.raise ? 0.2 : 0)), cy = 1.2 + (a.raise ? 0.8 : 0) - a.ap * 0.4, cz = 1.7 + a.ap * 0.4;
        const open = 0.35 + (a.raise ? 0.35 : 0) + Math.sin(a.ph * 2) * 0.08;
        K.cap([sd * 0.7, 0.95, 1.0], [sd * 1.3, 1.1, 1.4], 0.16, SH2, 0.14);
        K.cap([sd * 1.3, 1.1, 1.4], [cx, cy, cz - 0.3], 0.14, SH2, 0.15);
        K.grp([cx, cy, cz], [0, -sd * 0.3, 0], () => {
          K.sph([0.42, 0.32, 0.5], [0, 0, 0], SH, null, 20);
          K.grp([0, 0.05, 0.35], [-open, 0, 0], () => K.horn([[0, 0, 0], [sd * 0.06, 0.18, 0.4], [-sd * 0.05, 0.12, 0.75]], 0.14, SH, 0.02));
          K.grp([0, -0.05, 0.35], [open * 0.6, 0, 0], () => K.horn([[0, 0, 0], [sd * 0.06, -0.12, 0.35], [-sd * 0.05, -0.05, 0.6]], 0.11, SH2, 0.02));
          for (let k = 0; k < 3; k++) K.cone(0.03, 0.09, [-sd * 0.02, 0.06 + k * 0.03, 0.55 + k * 0.08], K.M(0xfff3d0, { r: 0.3 }), [-1.4, 0, 0], 6);
        });
      }
      // 尾巴：從後面捲過頭頂
      const curl = a.raise ? -0.12 : a.ap > 0 ? 0.22 * a.ap : 0;
      let p = [0, 1.1, -1.0], th = 0.55;
      for (let i = 0; i < 7; i++) {
        th += 0.36 + curl * 0.6 + Math.sin(a.ph + i) * 0.02;
        const r = 0.36 - i * 0.03, L = 0.46 - i * 0.02;
        const np = [0, p[1] + Math.sin(th) * L, p[2] - Math.cos(th) * L];
        K.sph([r, r * 0.9, r * 1.05], np, i % 2 ? SH2 : SH, null, 16);
        K.cone(0.05, 0.16, [0, np[1] + r * 0.85, np[2]], DK, null, 6);
        p = np;
      }
      K.sph(0.3, [0, p[1] + 0.05, p[2] + 0.25], STG, null, 16);
      K.horn([[0, p[1] + 0.05, p[2] + 0.4], [0, p[1] - 0.2 - a.ap * 0.3, p[2] + 0.75], [0, p[1] - 0.55 - a.ap * 0.5, p[2] + 0.85]], 0.12, STG, 0.005);
      K.sph(0.08, [0, p[1] + 0.12, p[2] + 0.5], GLW, null, 8);
    });
  },
  yeti(K, a) {
    const B = a.bob, rage = a.rage;
    const FUR = K.M(0xf4f8ff, { r: 0.8 }), FUR2 = K.M(0xd8e4f2, { r: 0.85, flat: true }), SKIN = K.M(0x6a9cd4, { r: 0.5, cc: 0.4 });
    const SKIN2 = K.M(0x4a7fb5, { r: 0.5 }), HORN = K.M(0xf0e4c4, { r: 0.4, cc: 0.5 }), ICE = K.M(0x9ad8f8, { r: 0.05, cc: 1, op: 0.85, flat: true }), DK = K.M(0x1b2a4a);
    const tufts = (c, rx, ry, rz, n, seed) => { const r = rng(seed); for (let i = 0; i < n; i++) { const u = r() * 6.28, v = r() * 3.14; const nx = Math.sin(v) * Math.cos(u), ny = Math.cos(v), nz = Math.sin(v) * Math.sin(u); if (nz < -0.3) continue; K.cone(0.09, 0.28, [c[0] + nx * rx, c[1] + ny * ry, c[2] + nz * rz], FUR2, [Math.atan2(nz, ny) , 0, -Math.atan2(nx, ny)], 5); } };
    for (const sd of [-1, 1]) {
      const l = Math.max(0, sd * B) * 4;
      K.sph([0.58, 0.62, 0.58], [sd * 0.65, 0.65 + l, 0], FUR, null, 20);
      K.sph([0.5, 0.18, 0.62], [sd * 0.68, 0.12 + l, 0.18], SKIN, null, 18);
      for (const k of [-1, 0, 1]) K.cone(0.06, 0.2, [sd * 0.68 + k * 0.2, 0.1 + l, 0.82], HORN, [Math.PI / 2, 0, 0], 8);
    }
    const up = B * 0.5;
    // 身體
    K.sph([1.5, 1.75, 1.2], [0, 2.4 + up, 0], FUR, null, 32);
    tufts([0, 2.4 + up, 0], 1.45, 1.7, 1.15, 70, 3);
    K.sph([0.9, 0.95, 0.4], [0, 2.0 + up, 0.88], K.M(0xc8d8ec, { r: 0.8 }), null, 24);
    // 肩上的冰
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) K.mesh(new K.T.CylinderGeometry(0, 0.16, 0.7 - k * 0.15, 6), ICE, [sd * (1.0 + k * 0.25), 3.85 + up - k * 0.12, -0.2 + k * 0.1], [0, 0, -sd * (0.3 + k * 0.25)]);
    // 臉
    K.sph([0.8, 0.66, 0.5], [0, 3.35 + up, 0.82], SKIN, null, 28);
    K.sph([0.42, 0.25, 0.25], [0, 3.1 + up, 1.18], SKIN2, null, 18);
    for (const sd of [-1, 1]) {
      K.eye([sd * 0.3, 3.5 + up, 1.18], 0.15, rage ? 0xff2020 : 0x1b2a4a, [0, -0.2]);
      K.box(0.36, 0.07, 0.06, [sd * 0.3, 3.7 + up, 1.25], DK, 0.03, [0.2, 0, sd * 0.35]);
    }
    K.sph([0.38, 0.16 + a.ap * 0.12, 0.1], [0, 2.95 + up, 1.22], DK, null, 18);
    for (const sd of [-1, 1]) K.cone(0.07, 0.2, [sd * 0.2, 3.05 + up, 1.3], K.M(0xffffff, { r: 0.3 }), [Math.PI, 0, 0], 8);
    // 角
    for (const sd of [-1, 1]) K.horn([[sd * 0.6, 3.85 + up, 0.6], [sd * 1.15, 4.15 + up, 0.6], [sd * 1.3, 4.6 + up, 0.5], [sd * 1.1, 5.0 + up, 0.4]], 0.2, HORN);
    // 手臂
    for (const sd of [-1, 1]) {
      let hand;
      if (a.raise) hand = [sd * 1.3, 5.2, 0.5];
      else if (a.ap > 0) hand = [sd * 1.3, 1.9 - a.ap * 0.35, 1.5 + a.ap * 0.3];
      else hand = [sd * 1.85, 1.5 + up, 0.5 - sd * B * 3];
      const sh = [sd * 1.3, 3.2 + up, 0.1], el = [(sh[0] + hand[0]) / 2 + sd * 0.35, (sh[1] + hand[1]) / 2, (sh[2] + hand[2]) / 2];
      K.cap(sh, el, 0.48, FUR, 0.42); K.cap(el, hand, 0.42, FUR, 0.36);
      tufts(el, 0.45, 0.45, 0.45, 14, 9 + sd);
      K.sph([0.48, 0.42, 0.45], hand, SKIN, null, 18);
      for (const k of [-1, 0, 1]) K.cone(0.07, 0.3, [hand[0] + k * 0.22, hand[1] + (a.raise ? 0.45 : -0.4), hand[2] + 0.3], HORN, [a.raise ? -0.4 : Math.PI + 0.4, 0, 0], 8);
    }
  },
  mech(K, a) {
    const B = a.bob, rage = a.rage;
    const MT = K.M(0xc4ccdc, { r: 0.3, m: 0.75 }), MD = K.M(0x4a5266, { r: 0.4, m: 0.7 }), DK = K.M(0x20242e, { r: 0.5, m: 0.5 });
    const YL = K.M(0xffc21f, { r: 0.4, cc: 0.6 }), CORE = K.M(rage ? 0xff3b4f : 0x3ff2ff, { glow: 1 }), CORE2 = K.M(0xffffff, { glow: 1 });
    const HOT = K.M(rage ? 0xff5a3a : 0xffa03a, { glow: 1 });
    for (const sd of [-1, 1]) {
      const l = Math.max(0, sd * B) * 4;
      K.box(0.62, 1.3, 0.62, [sd * 0.72, 1.15 + l, 0], MD, 0.12);
      K.box(0.75, 0.38, 0.75, [sd * 0.72, 0.62 + l, 0.05], MT, 0.08);
      K.box(1.0, 0.32, 1.25, [sd * 0.75, 0.16 + l, 0.2], MT, 0.08);
      for (let k = 0; k < 3; k++) K.box(0.22, 0.06, 0.3, [sd * 0.75 - 0.3 + k * 0.3, 0.33 + l, 0.75], YL, 0.02, [0.3, 0, 0]);
      K.cyl(0.07, 0.07, 1.0, [sd * 1.08, 1.15 + l, 0.15], K.M(0xe0e6f0, { r: 0.15, m: 0.9 }), null, 10); // 油壓桿
    }
    const up = B * 0.5;
    // 身體
    K.box(2.7, 2.1, 1.7, [0, 2.75 + up, 0], MT, 0.3);
    K.box(2.3, 0.5, 1.75, [0, 1.75 + up, 0.02], MD, 0.15);
    K.box(1.4, 0.12, 0.1, [0, 3.35 + up, 0.86], DK, 0.04);
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { K.box(0.42, 0.11, 0.1, [sd * 0.95, 2.5 + up + k * 0.2, 0.84], DK, 0.03); K.box(0.34, 0.05, 0.08, [sd * 0.95, 2.5 + up + k * 0.2, 0.87], HOT, 0.02); }
    for (const [x, y] of [[-1.15, 3.6], [1.15, 3.6], [-1.15, 1.95], [1.15, 1.95]]) K.sph(0.06, [x, y + up, 0.86], K.M(0x9aa3b5, { m: 0.9, r: 0.3 }), null, 8);
    // 核心
    K.cyl(0.55, 0.6, 0.15, [0, 2.6 + up, 0.86], DK, [Math.PI / 2, 0, 0], 28);
    K.sph([0.42, 0.42, 0.18], [0, 2.6 + up, 0.92], CORE, null, 22);
    K.sph(0.2, [0, 2.6 + up, 1.02], CORE2, null, 14);
    for (let k = 0; k < 3; k++) K.tor(0.62, 0.05, [0, 2.6 + up, 0.95], CORE, [0, 0, k * 2.1 + a.ph], 1.3, 16);
    // 頭
    K.box(1.25, 0.85, 1.0, [0, 4.25 + up, 0.15], MT, 0.25);
    K.box(1.0, 0.26, 0.1, [0, 4.25 + up, 0.66], DK, 0.06);
    K.box(0.92, 0.18, 0.1, [0, 4.25 + up, 0.7], K.M(rage ? 0xff2b2b : 0xff5a3a, { glow: 1 }), 0.05);
    K.box(0.2, 0.16, 0.1, [Math.sin(a.ph) * 0.3, 4.25 + up, 0.73], K.M(0xfff2c0, { glow: 1 }), 0.04);
    K.cyl(0.03, 0.03, 0.7, [0.45, 4.95 + up, 0], K.M(0x9aa3b5, { m: 0.9, r: 0.3 }), null, 6);
    K.sph(0.09, [0.45, 5.32 + up, 0], CORE, null, 10);
    // 肩上飛彈莢
    for (const sd of [-1, 1]) {
      K.box(1.05, 0.85, 1.1, [sd * 1.75, 3.85 + up, -0.1], MD, 0.18);
      for (let k = 0; k < 4; k++) { const x = sd * 1.75 + ((k % 2) - 0.5) * 0.42, y = 3.75 + up + Math.floor(k / 2) * 0.32; K.cyl(0.13, 0.13, 0.1, [x, y, 0.46], DK, [Math.PI / 2, 0, 0], 14); K.cone(0.09, 0.2, [x, y, 0.5], K.M(0xff5a3a, { r: 0.4, cc: 0.6 }), [Math.PI / 2, 0, 0], 12); }
      K.box(1.0, 0.06, 0.14, [sd * 1.75, 4.29 + up, 0.4], YL, 0.02);
      for (let k = 0; k < 3; k++) K.box(0.16, 0.05, 0.7, [sd * 1.75 - 0.3 + k * 0.3, 4.29 + up, -0.15], DK, 0.02);
    }
    // 手臂砲
    for (const sd of [-1, 1]) {
      let p, rx;
      if (a.raise) { p = [sd * 1.85, 4.5, 0.6]; rx = -1.2; }
      else if (a.ap > 0) { p = [sd * 1.95, 2.3 - a.ap * 0.6, 1.0 + a.ap * 0.4]; rx = 0.4 + a.ap * 0.5; }
      else { p = [sd * 1.95, 2.3 + up, 0.6 - sd * B * 2]; rx = 0; }
      K.sph(0.4, [sd * 1.6, 3.2 + up, 0.1], DK, null, 14);
      K.cap([sd * 1.6, 3.2 + up, 0.1], [p[0], p[1] + 0.2, p[2] - 0.3], 0.22, DK);
      K.grp(p, [rx, 0, 0], () => {
        K.box(0.72, 0.72, 1.6, [0, 0, 0], MD, 0.15);
        K.box(0.8, 0.3, 0.5, [0, 0.35, -0.3], MT, 0.08);
        K.cyl(0.26, 0.3, 0.4, [0, 0, 0.95], DK, [Math.PI / 2, 0, 0], 16);
        K.cyl(0.18, 0.18, 0.05, [0, 0, 1.16], CORE, [Math.PI / 2, 0, 0], 16);
        K.box(0.74, 0.08, 0.3, [0, -0.2, 0.3], YL, 0.03);
      });
    }
  },
};

// 每個頭目 14 張：走路 4、舉手 1、重擊 2，各一般／暴怒
async function bakeBoss3(k) {
  const args = [];
  for (const rage of [false, true]) {
    for (let i = 0; i < 4; i++) { const ph = i / 4 * Math.PI; args.push({ ph, bob: Math.sin(ph * 2) * 0.06, ap: 0, raise: false, rage }); }
    args.push({ ph: 0, bob: 0, ap: 0.6, raise: true, rage });
    args.push({ ph: 0, bob: 0, ap: 1, raise: false, rage });
    args.push({ ph: 0, bob: 0, ap: 0.5, raise: false, rage });
  }
  // 一般、暴怒各一組（範圍各自量）
  const fr = [];
  for (let i = 0; i < 2; i++) fr.push(...await bakeSet(BOSS3[k], args.slice(i * 7, i * 7 + 7), { ppu: 56, th: 38, scale: 1.1, shadow: true }));
  return fr;
}
