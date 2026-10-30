// 萬軍守城（複製自千軍突圍 rush/js）— 熔岩火山的 3D 模型：火蝙蝠、治療巫師、熔岩怪、熔岩炎龍、火山路邊擺設
// 跟其他 3D 模型一樣在背景烤成精靈圖；烤不出來就用 volcano.js 的 2D 圖
'use strict';

function bat3(K, { f }) {
  const flap = [1, 0.35, -0.6, 0.35][f];
  const BODY = K.M(0xe8582a, { r: 0.45, cc: 0.5 }), BELLY = K.M(0xffc070, { r: 0.5 }), WING = K.M(0xb8301c, { r: 0.6, ds: 1 }), DK = K.M(0x5a1206, { r: 0.6 });
  const FIRE = K.M(0xffb040, { glow: 1 }), FIRE2 = K.M(0xfff0a0, { glow: 1 });
  K.grp([0, 0.75, 0], null, () => {
    K.sph([0.26, 0.3, 0.24], [0, 0, 0], BODY, null, 24);
    K.sph([0.17, 0.2, 0.1], [0, -0.04, 0.17], BELLY, null, 18);
    for (const sd of [-1, 1]) {
      K.cone(0.08, 0.22, [sd * 0.13, 0.32, 0], BODY, [0, 0, -sd * 0.35], 10);
      K.eye([sd * 0.1, 0.07, 0.2], 0.075, 0x3a0800, [0, -0.2]);
      K.box(0.1, 0.025, 0.04, [sd * 0.1, 0.17, 0.22], DK, 0.01, [0.2, 0, sd * 0.4]);
      // 翅膀：三根骨＋膜
      K.grp([sd * 0.2, 0.05, 0], [0, 0, sd * flap * 0.55], () => {
        K.ext([0, 0.05, sd * 0.35, 0.22, sd * 0.7, 0.12, sd * 0.62, -0.08, sd * 0.48, -0.02, sd * 0.38, -0.16, sd * 0.24, -0.06, sd * 0.1, -0.14], 0.03, [0, 0, 0], WING, null, 0.008);
        K.cap([0, 0.05, 0.02], [sd * 0.35, 0.22, 0.02], 0.022, DK);
        K.cap([sd * 0.35, 0.22, 0.02], [sd * 0.7, 0.12, 0.02], 0.018, DK);
      });
    }
    K.sph([0.07, 0.04, 0.03], [0, -0.1, 0.24], DK, null, 12);
    for (const sd of [-1, 1]) K.cone(0.018, 0.05, [sd * 0.035, -0.13, 0.25], K.M(0xffffff), [Math.PI, 0, 0], 6);
    // 火焰尾巴
    K.cone(0.1, 0.32, [0, -0.38, -0.05], FIRE, [Math.PI, 0, 0], 12);
    K.cone(0.05, 0.18, [0, -0.33, -0.02], FIRE2, [Math.PI, 0, 0], 10);
  });
}

function healer3(K, { f }) {
  const P = walk3(f);
  const ROBE = K.M(0x2aa86a, { r: 0.7 }), ROBE2 = K.M(0x17714a, { r: 0.75 }), SKIN = K.M(0x9ff0b8, { r: 0.5, cc: 0.3 }), GOLD = K.M(0xe8c860, { r: 0.35, m: 0.6 });
  const WOOD = K.M(0x6a4a26, { r: 0.8 }), ORB = K.M(0x7dffb0, { glow: 1 }), WH = K.M(0xffffff, { r: 0.4 });
  K.grp([0, P.up, 0], null, () => {
    K.lathe([[0.36, 0], [0.34, 0.12], [0.27, 0.5], [0.2, 0.85], [0.12, 1.0], [0.02, 1.05]], [0, 0, 0], ROBE, null, 24);
    K.tor(0.35, 0.03, [0, 0.06, 0], GOLD, [Math.PI / 2, 0, 0], Math.PI * 2, 28);
    // 胸前十字
    K.box(0.06, 0.2, 0.03, [0, 0.62, 0.22], WH, 0.01); K.box(0.18, 0.06, 0.03, [0, 0.64, 0.22], WH, 0.01);
    // 頭與兜帽
    K.sph([0.19, 0.2, 0.18], [0, 1.15, 0.03], SKIN, null, 22);
    K.dome([0.25, 0.3, 0.24], [0, 1.12, -0.02], ROBE2, [-0.15, 0, 0], 0.55);
    K.cone(0.12, 0.25, [0, 1.48, -0.12], ROBE2, [-0.5, 0, 0], 12);
    for (const sd of [-1, 1]) K.eye([sd * 0.075, 1.17, 0.17], 0.05, 0x0e3a20);
    // 法杖
    const sw = P.s * 0.04;
    K.cap([0.36, 0.05, 0.12 + sw], [0.36, 1.45, 0.12 + sw], 0.025, WOOD);
    K.sph(0.1, [0.36, 1.55, 0.12 + sw], ORB, null, 16);
    K.tor(0.12, 0.015, [0.36, 1.55, 0.12 + sw], GOLD, [Math.PI / 2, 0, 0], Math.PI * 2, 20);
    K.cap([0.22, 0.85, 0.05], [0.34, 0.95, 0.12 + sw], 0.05, ROBE);
    K.cap([-0.22, 0.85, 0.05], [-0.3, 0.62, 0.12 - sw], 0.05, ROBE);
    K.sph(0.05, [-0.3, 0.6, 0.13 - sw], SKIN, null, 12);
  });
}

function magma3(K, { f }) {
  const P = walk3(f);
  const RK = [0x4a3c3a, 0x3a2e2c, 0x5a4a46].map(c => K.M(c, { r: 0.9, flat: true }));
  const LAVA = K.M(f % 2 ? 0xffb040 : 0xff7a1a, { glow: 1 }), LAVA2 = K.M(0xfff0a0, { glow: 1 });
  const rock = (s, p, m, rot) => K.mesh(new K.T.DodecahedronGeometry(1, 0), m, p, rot || [p[0] * 2, p[1], p[2] * 3], s);
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, sd * P.s) * 0.08;
    rock([0.15, 0.16, 0.16], [sd * 0.2, 0.14 + lift, 0.02], RK[1]);
    K.box(0.12, 0.03, 0.1, [sd * 0.2, 0.1 + lift, 0.15], LAVA, 0.01);
  }
  K.grp([0, P.up, 0], [0, 0, P.s * 0.05], () => {
    rock([0.5, 0.52, 0.42], [0, 0.72, 0], RK[0], [0.2, 0.3, 0.1]);
    rock([0.28, 0.2, 0.24], [-0.24, 1.08, 0.08], RK[2]);
    rock([0.26, 0.18, 0.22], [0.26, 1.05, 0.06], RK[2]);
    // 發光裂縫
    for (const [x, y, r] of [[-0.25, 0.55, 0.5], [0.22, 0.7, -0.4], [0, 0.4, 0.1], [0.05, 0.85, 0.9]]) K.box(0.04, 0.3, 0.04, [x, y, 0.4], LAVA, 0.012, [0, 0, r]);
    // 頭頂熔岩
    K.sph([0.22, 0.12, 0.2], [0, 1.2, 0.02], LAVA, null, 16);
    K.sph([0.12, 0.07, 0.1], [0.04, 1.27, 0.05], LAVA2, null, 12);
    // 臉
    for (const sd of [-1, 1]) {
      K.sph([0.07, 0.05, 0.03], [sd * 0.13, 0.86, 0.4], LAVA2, null, 12);
      K.box(0.13, 0.04, 0.05, [sd * 0.13, 0.95, 0.4], RK[1], 0.015, [0, 0, sd * 0.4]);
    }
    K.box(0.22, 0.06, 0.04, [0, 0.66, 0.42], LAVA, 0.02);
    // 手
    for (const sd of [-1, 1]) {
      const sw = -sd * P.s * 0.08;
      rock([0.15, 0.2, 0.15], [sd * 0.55, 0.72, 0.05 + sw], RK[1]);
      rock([0.16, 0.15, 0.16], [sd * 0.58, 0.48, 0.12 + sw], RK[0]);
      K.box(0.06, 0.04, 0.04, [sd * 0.58, 0.44, 0.27 + sw], LAVA, 0.01);
    }
  });
}

// ---------- 熔岩炎龍 ----------
BOSS3.dragon = function (K, a) {
  const B = a.bob, rage = a.rage;
  const SC = K.M(rage ? 0xd8301a : 0xe2501e, { r: 0.4, cc: 0.6 }), SC2 = K.M(rage ? 0x8a1008 : 0xa82812, { r: 0.5, cc: 0.4 });
  const BELLY = K.M(0xffc860, { r: 0.45, cc: 0.4 }), WING = K.M(rage ? 0x7a0e08 : 0x9a2412, { r: 0.6, ds: 1 }), HORN = K.M(0xf3e2b8, { r: 0.4, cc: 0.6 });
  const SPK = K.M(0xffcf4a, { r: 0.3, cc: 0.8 }), FIRE = K.M(rage ? 0xffffff : 0xffe08a, { glow: 1 }), FIRE2 = K.M(0xff7a1a, { glow: 1 }), DK = K.M(0x3a0806, { r: 0.6 });
  const up = B * 0.5;
  // 腳
  for (const sd of [-1, 1]) {
    const l = Math.max(0, sd * B) * 4;
    K.sph([0.55, 0.65, 0.6], [sd * 0.75, 0.75 + l, 0], SC, null, 22);
    K.sph([0.42, 0.22, 0.6], [sd * 0.78, 0.2 + l, 0.25], SC2, null, 18);
    for (const k of [-1, 0, 1]) K.cone(0.07, 0.22, [sd * 0.78 + k * 0.2, 0.15 + l, 0.82], HORN, [Math.PI / 2, 0, 0], 8);
  }
  // 尾巴
  K.horn([[0.3, 0.9, -0.6], [1.2, 0.6, -0.9], [2.0, 0.7, -0.6], [2.5, 1.2 + Math.sin(a.ph) * 0.2, -0.2]], 0.32, SC, 0.08);
  K.cone(0.22, 0.45, [2.6, 1.45 + Math.sin(a.ph) * 0.2, -0.15], SPK, [0, 0, -0.6], 4);
  // 翅膀
  const flap = Math.sin(a.ph * 2.2) * 0.25 + (a.raise ? -0.35 : 0);
  for (const sd of [-1, 1]) {
    K.grp([sd * 0.7, 3.3 + up, -0.4], [0, sd * 0.35, sd * flap * 0.6], () => {
      K.ext([0, 0, sd * 1.3, 1.8, sd * 2.6, 1.0, sd * 2.4, 0.0, sd * 2.6, -0.9, sd * 1.8, -0.6, sd * 1.3, -1.3, sd * 0.6, -0.7], 0.06, [0, 0, 0], WING, null, 0.02);
      K.cap([0, 0, 0.04], [sd * 1.3, 1.8, 0.04], 0.09, SC2);
      K.cap([sd * 1.3, 1.8, 0.04], [sd * 2.6, 1.0, 0.04], 0.07, SC2);
      K.cap([sd * 1.3, 1.8, 0.04], [sd * 2.6, -0.9, 0.04], 0.05, SC2);
      K.cone(0.08, 0.3, [sd * 1.3, 2.0, 0.04], HORN, [0, 0, -sd * 0.3], 8);
    });
  }
  // 身體
  K.sph([1.25, 1.5, 1.05], [0, 2.1 + up, 0], SC, null, 30);
  K.sph([0.8, 1.15, 0.5], [0, 1.95 + up, 0.65], BELLY, null, 26);
  for (let i = 0; i < 5; i++) K.tor(0.62 - Math.abs(i - 2) * 0.06, 0.03, [0, 1.35 + i * 0.32 + up, 0.95], SC2, [Math.PI / 2 - 0.25, 0, 0], Math.PI, 20);
  // 背刺
  for (let i = 0; i < 5; i++) K.cone(0.14, 0.38, [0, 3.2 - i * 0.45 + up, -0.95 + i * 0.05], SPK, [-1.2 - i * 0.1, 0, 0], 6);
  // 手
  for (const sd of [-1, 1]) {
    let hand;
    if (a.raise) hand = [sd * 1.5, 3.8, 0.6];
    else if (a.ap > 0) hand = [sd * 1.4, 2.1 - a.ap * 0.5, 1.2 + a.ap * 0.4];
    else hand = [sd * 1.45, 1.9 + up, 0.7 - sd * B * 3];
    K.cap([sd * 1.0, 2.8 + up, 0.3], hand, 0.2, SC2, 0.16);
    K.sph(0.24, hand, SC, null, 14);
    for (const k of [-1, 0, 1]) K.cone(0.05, 0.18, [hand[0] + k * 0.12, hand[1] - 0.18, hand[2] + 0.15], HORN, [Math.PI * 0.8, 0, 0], 8);
  }
  // 脖子與頭
  const hy = 4.0 + up + (a.ap > 0 ? -a.ap * 0.25 : 0), hz = 0.55 + a.ap * 0.4;
  K.cap([0, 3.2 + up, 0.15], [0, hy - 0.2, hz - 0.2], 0.45, SC, 0.38);
  K.grp([0, hy, hz], [a.ap * 0.35, 0, 0], () => {
    K.sph([0.62, 0.48, 0.6], [0, 0, 0], SC, null, 26);
    K.sph([0.42, 0.26, 0.5], [0, -0.12, 0.45], SC, null, 20);       // 口鼻
    const open = 0.05 + a.ap * 0.22 + (rage ? 0.05 : 0);
    K.sph([0.38, 0.14, 0.45], [0, -0.3 - open, 0.42], SC2, null, 18); // 下巴
    if (open > 0.1) K.sph([0.28, 0.1, 0.3], [0, -0.22 - open * 0.5, 0.55], FIRE, null, 14);
    for (const sd of [-1, 1]) {
      K.cone(0.03, 0.09, [sd * 0.2, -0.24, 0.82], K.M(0xffffff), [Math.PI, 0, 0], 6);
      K.eye([sd * 0.27, 0.12, 0.42], 0.11, 0x2a0600, [0, -0.1], rage ? 0xffffff : 0xfff2a0);
      K.box(0.22, 0.05, 0.06, [sd * 0.27, 0.27, 0.46], DK, 0.02, [0.2, 0, sd * 0.4]);
      K.horn([[sd * 0.3, 0.3, -0.1], [sd * 0.6, 0.65, -0.3], [sd * 0.62, 1.05, -0.55]], 0.11, HORN);
      K.sph(0.04, [sd * 0.1, -0.02, 0.92], DK, null, 8);  // 鼻孔
    }
    for (let i = 0; i < 3; i++) K.cone(0.08, 0.22, [0, 0.42 - i * 0.05, -0.15 - i * 0.18], SPK, [-0.9, 0, 0], 6);
  });
  // 胸口的火光
  K.sph([0.32, 0.4, 0.1], [0, 2.3 + up, 1.12], FIRE2, null, 16);
  K.sph([0.18, 0.24, 0.08], [0, 2.3 + up, 1.18], FIRE, null, 14);
};

// ---------- 火山路邊擺設 ----------
const VOLC_DECOR3 = {
  lavarock(K, { v }) {
    const r = rng(53 + v * 7);
    const ST = [0x4a3c3a, 0x3a2e2c, 0x5a4a46].map(c => K.M(c, { r: 0.9, flat: true })), LV = K.M(0xff7a1a, { glow: 1 });
    K.mesh(new K.T.DodecahedronGeometry(1, 0), ST[v], [0, 0.5, 0], [0.3, v, 0.2], [0.95, 0.7, 0.75]);
    K.mesh(new K.T.DodecahedronGeometry(1, 0), ST[(v + 1) % 3], [0.7, 0.28, 0.2], [1, 2, 0.5], [0.42, 0.34, 0.4]);
    for (let i = 0; i < 3; i++) K.box(0.06, 0.45, 0.05, [(r() - 0.5) * 0.9, 0.45, 0.68], LV, 0.02, [0, 0, (r() - 0.5) * 1.6]);
    K.cyl(0.9, 1.0, 0.04, [0.1, 0.02, 0.1], K.M(0xff5a10, { glow: 1, }), null, 12);
  },
  deadtree(K, { v }) {
    const BK = K.M(0x2a1c18, { r: 0.9 }), EM = K.M(0xff6a1a, { glow: 1 });
    K.lathe([[0.22, 0], [0.16, 0.2], [0.12, 1.2], [0.08, 2.0], [0.02, 2.2]], [0, 0, 0], BK, null, 10);
    const br = [[0, 1.2, 0, 0.7, 1.9, 0.1, 1.0, 2.5, 0], [0, 1.6, 0, -0.6, 2.3, -0.1, -0.9, 2.9, 0.1], [0, 2.0, 0, 0.2, 2.8, 0.2, 0.4, 3.3, 0]];
    br.forEach((b, i) => { if (v === 1 && i === 2) return; K.horn([[b[0], b[1], b[2]], [b[3], b[4], b[5]], [b[6], b[7], b[8]]], 0.08, BK); });
    K.cyl(0.5, 0.55, 0.04, [0, 0.02, 0], EM, null, 12);
  },
  vent(K, { v }) {
    const ST = K.M(0x3a2c2a, { r: 0.9, flat: true }), LV = K.M(0xffa040, { glow: 1 }), SM = K.M(0x5a5050, { r: 1, op: 0.55 });
    K.lathe([[1.2, 0], [0.9, 0.4], [0.5, 0.9], [0.42, 1.0], [0.3, 0.92]], [0, 0, 0], ST, null, 12);
    K.cyl(0.36, 0.36, 0.05, [0, 0.95, 0], LV, null, 14);
    for (let i = 0; i < 3; i++) K.sph(0.35 + i * 0.15, [(i % 2 ? 0.15 : -0.1) * (v + 1), 1.4 + i * 0.5, 0], SM, null, 12);
  },
  obsidian(K, { v }) {
    const OB = [0x2a1f3a, 0x3a2a52, 0x1e1630].map(c => K.M(c, { r: 0.15, cc: 1, flat: true }));
    const sh = [[0, 1.6, 0.35, 0], [0.5, 1.0, 0.25, 0.4], [-0.45, 0.8, 0.22, -0.3], [0.2, 0.6, 0.18, 0.8]];
    sh.forEach(([x, h, w, r], i) => K.mesh(new K.T.OctahedronGeometry(1, 0), OB[(i + v) % 3], [x, h * 0.45, (i % 2) * 0.2], [0, r + v, r * 0.3], [w, h * 0.6, w]));
    K.cyl(0.8, 0.85, 0.03, [0, 0.015, 0], K.M(0xff6a1a, { glow: 1 }), null, 10);
  },
};

// 把新模型接到烘焙清單
Object.assign(ENEMY3, {
  bat:    { fn: bat3,    w: 1.4, ol: 'rgba(70,8,0,.9)' },
  healer: { fn: healer3, w: 1.0, ol: 'rgba(6,40,20,.9)' },
  magma:  { fn: magma3,  w: 1.4, ol: 'rgba(30,6,0,.9)' },
});
Object.assign(DECOR3, VOLC_DECOR3);
{
  const base = sceneJobs3;
  sceneJobs3 = function () {
    const J = base();
    for (const k of Object.keys(VOLC_DECOR3)) J.push(job('decor', 'decor:' + k, () => bakeSet(DECOR3[k], [0, 1, 2].map(v => ({ v })), { ppu: 52, th: 40, ol: 'rgba(30,10,8,.55)', olpx: 1.1, key: 2.4 }), a => { ART.decor[k] = a; }));
    return J;
  };
}
