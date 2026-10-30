// 萬軍守城（複製自千軍突圍 rush/js）— 天空浮島的 3D 模型：疾風鷹、氣球炸彈兵、雷霆巨鷹、天空路邊擺設
// 跟其他 3D 模型一樣在背景烤成精靈圖；烤不出來就用 sky.js 的 2D 圖
'use strict';

function eagle3(K, { f }) {
  const flap = [1, 0.3, -0.7, 0.3][f];
  const BR = K.M(0x8a5a30, { r: 0.6 }), BR2 = K.M(0x5a3a1c, { r: 0.65 }), WH = K.M(0xfff6e8, { r: 0.5 }), BEAK = K.M(0xffc020, { r: 0.35, cc: 0.6 });
  const TIP = K.M(0x2a1c10, { r: 0.6, ds: 1 }), WING = K.M(0x9a6a3a, { r: 0.6, ds: 1 });
  K.grp([0, 0.7, 0], [0.25, 0, 0], () => {
    K.sph([0.24, 0.24, 0.42], [0, 0, -0.05], BR, null, 24);
    K.sph([0.17, 0.15, 0.28], [0, -0.06, 0.05], K.M(0xd8b48a, { r: 0.55 }), null, 18);
    // 頭
    K.sph([0.17, 0.16, 0.18], [0, 0.12, 0.3], WH, null, 20);
    K.cone(0.07, 0.18, [0, 0.08, 0.5], BEAK, [Math.PI / 2 + 0.4, 0, 0], 10);
    for (const sd of [-1, 1]) {
      K.eye([sd * 0.08, 0.17, 0.42], 0.045, 0x1a1206, [0, -0.2], 0xffe08a);
      K.box(0.08, 0.02, 0.03, [sd * 0.08, 0.22, 0.44], BR2, 0.008, [0.2, 0, sd * 0.45]);
      // 翅膀
      K.grp([sd * 0.18, 0.06, -0.02], [0, 0, sd * flap * 0.6], () => {
        K.ext([0, 0.06, sd * 0.45, 0.16, sd * 0.85, 0.1, sd * 0.78, -0.02, sd * 0.86, -0.08, sd * 0.6, -0.1, sd * 0.4, -0.08, 0, -0.06], 0.035, [0, 0, 0], WING, [Math.PI / 2, 0, 0], 0.008);
        for (let k = 0; k < 4; k++) K.box(0.12, 0.02, 0.05, [sd * (0.72 + k * 0.035), 0, -0.06 + k * 0.04], TIP, 0.006, [0, sd * (0.3 - k * 0.15), 0]);
      });
    }
    // 尾巴
    for (let k = -1; k <= 1; k++) K.box(0.07, 0.02, 0.22, [k * 0.06, -0.02, -0.5], BR2, 0.01, [0, k * 0.3, 0]);
    // 爪子
    for (const sd of [-1, 1]) { K.cap([sd * 0.08, -0.15, 0.02], [sd * 0.08, -0.32, 0.08], 0.025, BEAK); for (const k of [-1, 0, 1]) K.cone(0.012, 0.06, [sd * 0.08 + k * 0.025, -0.34, 0.12], K.M(0x1a1206), [Math.PI / 2, 0, 0], 6); }
  });
}

function bomber3(K, { f }) {
  const bob = [0, -0.03, 0, 0.03][f];
  const RED = K.M(0xe8453c, { r: 0.35, cc: 0.7 }), CRM = K.M(0xffe8b0, { r: 0.4, cc: 0.5 }), ROPE = K.M(0x8a6a4a, { r: 0.8 });
  const BAS = K.M(0xa8783e, { r: 0.75 }), GOB = K.M(0x8fd06a, { r: 0.5, cc: 0.3 }), BOMB = K.M(0x2a2f3c, { r: 0.25, m: 0.6, cc: 0.8 });
  K.grp([0, bob, 0], null, () => {
    // 氣球（條紋）
    K.grp([0, 1.3, 0], null, () => {
      for (let i = 0; i < 8; i++) {
        const geo = new K.T.SphereGeometry(0.5, 12, 16, i / 8 * Math.PI * 2, Math.PI * 2 / 8);
        geo.scale(1, 1.12, 1);
        K.mesh(geo, i % 2 ? RED : CRM);
      }
      K.cone(0.18, 0.2, [0, -0.6, 0], RED, [Math.PI, 0, 0], 16);
    });
    for (const [x, z] of [[-0.15, 0.12], [0.15, 0.12], [-0.15, -0.12], [0.15, -0.12]]) K.cap([x * 1.6, 0.72, z * 1.6], [x, 0.42, z], 0.01, ROPE);
    // 籃子
    K.cyl(0.22, 0.18, 0.2, [0, 0.32, 0], BAS, null, 16);
    K.tor(0.22, 0.025, [0, 0.42, 0], K.M(0x6a4a26, { r: 0.8 }), [Math.PI / 2, 0, 0], Math.PI * 2, 20);
    // 坐在裡面的綠色小鬼
    K.sph([0.15, 0.14, 0.14], [0, 0.52, 0.02], GOB, null, 18);
    for (const sd of [-1, 1]) { K.eye([sd * 0.055, 0.55, 0.13], 0.04, 0x1d2a10, [0, -0.2]); K.cone(0.03, 0.1, [sd * 0.17, 0.56, 0], GOB, [0, 0, -sd * 1.3], 8); }
    K.cyl(0.1, 0.12, 0.05, [0, 0.64, 0.01], K.M(0x3a6aff, { r: 0.4 }), null, 14); // 飛行帽
    // 手上的炸彈
    K.sph(0.08, [0.2, 0.52, 0.12], BOMB, null, 14);
    K.sph(0.025, [0.22, 0.62, 0.12], K.M(0xffd34d, { glow: 1 }), null, 8);
  });
}

// ---------- 頭目：雷霆巨鷹 ----------
BOSS3.thunder = function (K, a) {
  const B = a.bob, rage = a.rage;
  const BODY = K.M(rage ? 0x3a4a9a : 0x4a6ac8, { r: 0.45, cc: 0.5 }), BODY2 = K.M(rage ? 0x26306a : 0x334c98, { r: 0.5 });
  const WH = K.M(0xf4f8ff, { r: 0.45, cc: 0.4 }), GOLD = K.M(0xffc020, { r: 0.3, cc: 0.7 });
  const WING = K.M(rage ? 0x2a3478 : 0x3a5ab0, { r: 0.55, ds: 1 }), TIP = K.M(0x1a2248, { r: 0.6, ds: 1 });
  const ZAP = K.M(rage ? 0xff7aff : 0xaeeaff, { glow: 1 }), ZAP2 = K.M(0xffffff, { glow: 1 });
  const up = B * 0.5;
  // 腳（金色鳥爪）
  for (const sd of [-1, 1]) {
    const l = Math.max(0, sd * B) * 4;
    K.cap([sd * 0.55, 1.5 + l, 0], [sd * 0.6, 0.35 + l, 0.15], 0.14, GOLD);
    for (const k of [-1, 0, 1]) K.horn([[sd * 0.6, 0.3 + l, 0.15], [sd * 0.6 + k * 0.25, 0.12 + l, 0.5], [sd * 0.6 + k * 0.3, 0.02 + l, 0.62]], 0.07, GOLD, 0.02);
    K.horn([[sd * 0.6, 0.3 + l, 0.1], [sd * 0.6, 0.1 + l, -0.25]], 0.06, GOLD, 0.02);
  }
  // 尾羽
  for (let k = -2; k <= 2; k++) K.box(0.32, 0.06, 1.4, [k * 0.28, 1.6 + up, -1.1], k % 2 ? BODY2 : BODY, 0.03, [-0.5, k * 0.18, 0]);
  // 翅膀（很大，上下拍）
  const flap = Math.sin(a.ph * 2.2) * 0.3 + (a.raise ? -0.55 : 0) + (a.ap > 0 ? 0.35 * a.ap : 0);
  for (const sd of [-1, 1]) {
    K.grp([sd * 1.0, 3.2 + up, -0.3], [0, sd * 0.25, sd * flap], () => {
      K.ext([0, 0.2, sd * 1.4, 0.9, sd * 2.8, 0.7, sd * 3.3, 0.3, sd * 3.0, 0.0, sd * 3.4, -0.4, sd * 2.6, -0.5, sd * 2.8, -0.9, sd * 1.8, -0.8, sd * 1.0, -0.6, 0, -0.5], 0.12, [0, 0, 0], WING, null, 0.03);
      for (let k = 0; k < 6; k++) K.box(0.6, 0.06, 0.16, [sd * (2.2 + k * 0.18), -0.2 - k * 0.12, 0.05], TIP, 0.02, [0, 0, sd * (-0.6 - k * 0.12)]);
      // 翅膀上的電紋
      K.horn([[sd * 0.4, 0.1, 0.08], [sd * 1.0, 0.4, 0.08], [sd * 1.3, 0.05, 0.08], [sd * 2.0, 0.45, 0.08], [sd * 2.4, 0.1, 0.08]], 0.04, ZAP, 0.03);
    });
  }
  // 身體
  K.sph([1.15, 1.45, 1.0], [0, 2.6 + up, 0], BODY, null, 30);
  K.sph([0.75, 1.05, 0.45], [0, 2.4 + up, 0.65], WH, null, 26);
  for (let i = 0; i < 4; i++) K.box(0.9 - i * 0.12, 0.06, 0.06, [0, 1.9 + i * 0.32 + up, 1.07], K.M(0xd8e2f4, { r: 0.5 }), 0.03, [0.2, 0, 0]);
  // 胸口的雷電紋
  K.horn([[-0.2, 3.1 + up, 1.0], [0.15, 2.7 + up, 1.08], [-0.1, 2.55 + up, 1.1], [0.25, 2.0 + up, 1.05]], 0.07, ZAP, 0.05);
  // 脖子與頭（白頭、金嘴）
  const hy = 4.2 + up - a.ap * 0.25, hz = 0.45 + a.ap * 0.45;
  K.cap([0, 3.6 + up, 0.15], [0, hy - 0.25, hz - 0.15], 0.5, WH, 0.42);
  K.grp([0, hy, hz], [a.ap * 0.4, 0, 0], () => {
    K.sph([0.62, 0.55, 0.6], [0, 0, 0], WH, null, 26);
    K.horn([[0, -0.02, 0.5], [0, -0.12, 0.9], [0, -0.38, 1.05]], 0.22, GOLD, 0.02);
    K.sph([0.18, 0.12, 0.25], [0, -0.2, 0.62], GOLD, null, 14);
    for (const sd of [-1, 1]) {
      K.eye([sd * 0.26, 0.12, 0.44], 0.11, rage ? 0xff2060 : 0x1a2448, [0, -0.1], 0xfff2a0);
      K.box(0.32, 0.07, 0.08, [sd * 0.26, 0.3, 0.46], BODY2, 0.03, [0.25, 0, sd * 0.45]);
      // 頭頂的羽冠
      K.horn([[sd * 0.15, 0.45, -0.1], [sd * 0.35, 0.95, -0.35], [sd * 0.3, 1.25, -0.6]], 0.08, BODY, 0.02);
    }
    K.horn([[0, 0.5, -0.1], [0, 1.05, -0.4], [0, 1.4, -0.7]], 0.09, ZAP, 0.03);
  });
  // 身邊的電球
  for (let i = 0; i < 3; i++) {
    const an = a.ph * 1.5 + i * 2.1;
    K.sph(0.22, [Math.cos(an) * 1.8, 2.8 + up + Math.sin(an * 1.3) * 0.4, Math.sin(an) * 0.6 + 0.4], ZAP, null, 12);
    K.sph(0.11, [Math.cos(an) * 1.8, 2.8 + up + Math.sin(an * 1.3) * 0.4, Math.sin(an) * 0.6 + 0.48], ZAP2, null, 10);
  }
};

// ---------- 天空路邊擺設 ----------
const SKY_DECOR3 = {
  cloudpuff(K, { v }) {
    const r = rng(101 + v * 7);
    const C = [0xffffff, 0xf2f7ff, 0xe4eefc].map(c => K.M(c, { r: 0.85 }));
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = r() * 0.9; K.sph([0.55 + r() * 0.35, 0.4 + r() * 0.25, 0.5 + r() * 0.3], [Math.cos(a) * d * 1.3, 0.45 + r() * 0.5, Math.sin(a) * d * 0.6], C[i % 3], null, 18); }
    if (v === 2) K.mesh(new K.T.OctahedronGeometry(0.22, 0), K.M(0xffe14f, { r: 0.3, m: 0.4, e: 0x6a5000 }), [0.2, 1.5, 0.2], [0.3, 0.6, 0]);
  },
  floatrock(K, { v }) {
    const r = rng(111 + v * 5);
    const ST = K.M(0xa8927a, { r: 0.85, flat: true }), ST2 = K.M(0x8a7660, { r: 0.85, flat: true }), GR = K.M(0x6cc84a, { r: 0.75, flat: true });
    const lift = 0.9;
    K.mesh(new K.T.ConeGeometry(1.25, 1.6, 7), ST, [0, lift + 0.4, 0], [Math.PI, v, 0]);
    K.mesh(new K.T.ConeGeometry(0.6, 0.9, 6), ST2, [0.5, lift + 0.2, 0.2], [Math.PI, 1, 0.2]);
    K.cyl(1.25, 1.2, 0.25, [0, lift + 1.25, 0], GR, [0, v, 0], 7);
    if (v !== 1) { K.cyl(0.07, 0.1, 0.7, [0.2, lift + 1.7, 0], K.M(0x7a5232, { r: 0.8 }), null, 8); K.mesh(new K.T.IcosahedronGeometry(0.45, 1), K.M(0x5fb84a, { r: 0.7, flat: true }), [0.2, lift + 2.2, 0], [r(), r(), 0]); }
    else for (let i = 0; i < 6; i++) K.sph(0.07, [(r() - 0.5) * 1.6, lift + 1.42, (r() - 0.5) * 1.2], K.M([0xff6f9e, 0xffd34d, 0xffffff][i % 3], { r: 0.5 }), null, 8);
    for (let i = 0; i < 4; i++) K.horn([[(r() - 0.5) * 0.8, lift - 0.2, (r() - 0.5) * 0.6], [(r() - 0.5) * 0.9, lift - 0.6, (r() - 0.5) * 0.6], [(r() - 0.5) * 0.9, lift - 0.9, 0]], 0.03, K.M(0x6a4a2a, { r: 0.8 }));
    // 一小團雲托著
    for (let i = 0; i < 4; i++) K.sph([0.45, 0.22, 0.35], [(i - 1.5) * 0.5, 0.25, 0.3], K.M(0xffffff, { r: 0.85 }), null, 14);
  },
  balloon(K, { v }) {
    const cols = [[0xff5a5a, 0xffd34d], [0x4fa3ff, 0xffffff], [0x8a6bff, 0xffb0e0]][v % 3];
    const A = K.M(cols[0], { r: 0.4, cc: 0.6 }), Bm = K.M(cols[1], { r: 0.4, cc: 0.6 }), ROPE = K.M(0x6a4a2a, { r: 0.8 });
    K.grp([0, 3.0, 0], null, () => {
      for (let i = 0; i < 10; i++) { const geo = new K.T.SphereGeometry(1, 10, 18, i / 10 * Math.PI * 2, Math.PI * 2 / 10); geo.scale(1, 1.15, 1); K.mesh(geo, i % 2 ? A : Bm); }
      K.cone(0.42, 0.5, [0, -1.3, 0], A, [Math.PI, 0, 0], 18);
    });
    for (const [x, z] of [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]]) K.cap([x * 2, 1.6, z * 2], [x, 0.55, z], 0.015, ROPE);
    K.box(0.55, 0.42, 0.55, [0, 0.3, 0], K.M(0xa8783e, { r: 0.75 }), 0.06);
    K.tor(0.33, 0.03, [0, 0.52, 0], ROPE, [Math.PI / 2, 0, 0], Math.PI * 2, 16);
    for (let k = 0; k < 3; k++) K.sph(0.08, [-0.2 + k * 0.2, 0.06, 0.3], K.M(0x8a7a5a, { r: 0.8 }), null, 8);
  },
  skytower(K, { v }) {
    const WHT = K.M(0xf4f8ff, { r: 0.5 }), GOLD = K.M(0xffc83d, { r: 0.3, m: 0.6, cc: 0.6 }), BLU = K.M(0x4f9cff, { r: 0.1, cc: 1 });
    K.lathe([[0.85, 0], [0.8, 0.25], [0.62, 4.2], [0.72, 4.35], [0.72, 4.5], [0, 4.5]], [0, 0, 0], WHT, null, 20);
    K.tor(0.82, 0.06, [0, 0.25, 0], GOLD, [Math.PI / 2, 0, 0], 6.28, 20);
    K.tor(0.72, 0.06, [0, 4.4, 0], GOLD, [Math.PI / 2, 0, 0], 6.28, 20);
    K.dome([0.7, 0.85, 0.7], [0, 4.5, 0], GOLD);
    K.cyl(0.03, 0.03, 0.8, [0, 5.6, 0], K.M(0x8a7a6a), null, 6);
    K.ext([0, 0, 0.6, -0.15, 0, -0.32], 0.02, [0.02, 6.0, 0], K.M([0xff5a5a, 0x4fa3ff, 0x8a6bff][v % 3], { r: 0.6, ds: 1 }), null, 0);
    for (const y of [1.2, 2.3, 3.4]) { K.box(0.32, 0.5, 0.1, [0, y, 0.7 - y * 0.03], BLU, 0.08); K.box(0.42, 0.06, 0.14, [0, y - 0.3, 0.7 - y * 0.03], GOLD, 0.02); }
    for (let i = 0; i < 3; i++) K.sph([0.7, 0.3, 0.5], [(i - 1) * 0.8, 0.15, 0.4], K.M(0xffffff, { r: 0.85 }), null, 14);
  },
};

Object.assign(ENEMY3, {
  eagle:  { fn: eagle3,  w: 2.0, ol: 'rgba(50,30,10,.9)' },
  bomber: { fn: bomber3, w: 1.3, ol: 'rgba(60,10,10,.9)' },
});
Object.assign(DECOR3, SKY_DECOR3);
{
  const base = sceneJobs3;
  sceneJobs3 = function () {
    const J = base();
    for (const k of Object.keys(SKY_DECOR3)) J.push(job('decor', 'decor:' + k, () => bakeSet(DECOR3[k], [0, 1, 2].map(v => ({ v })), { ppu: k === 'skytower' ? 40 : 52, th: 40, ol: 'rgba(40,60,100,.5)', olpx: 1.1, key: 2.4 }), a => { ART.decor[k] = a; }));
    return J;
  };
}
