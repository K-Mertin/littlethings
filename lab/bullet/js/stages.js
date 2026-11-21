// 關卡：每一關是一串「第幾秒出現什麼敵人、怎麼飛、什麼時候射什麼彈幕」，最後是魔王
// 彈幕的種類（attack.pat）：
//   aim    瞄準玩家的扇形（n 顆、spread 間隔），連射 rep 次
//   ring   一整圈 n 顆，連射 rep 次，每次轉 spin
//   spiral 迴旋：一次 arms 顆，很快地一直射、每發轉一點點（像灑水器）
//   flower 一圈 n 顆、子彈會轉彎（curve），射出來像花瓣
//   rain   往下的一排（從畫面上方灑下來）
export const ENEMIES = {
  drone: { hp: 4, r: 0.8, score: 100 },
  fighter: { hp: 8, r: 1.0, score: 200 },
  turret: { hp: 40, r: 1.3, score: 800 },
  carrier: { hp: 110, r: 2.2, score: 2500 },
  rock: { hp: 18, r: 1.1, score: 300 },
};

// 小工具：一排敵人
const row = (t, type, xs, o) => xs.map((x, i) => ({ t: t + i * (o.gap || 0), type, x, ...o }));
const A = (at, pat, o = {}) => ({ at, pat, ...o });

export const STAGES = [
  {
    id: 's1', name: '粉紅星雲邊境', tint: [0x9a2a6a, 0x2a3aa0], boss: 'crab', bossName: '鋼鐵巨蟹',
    intro: '敵人的偵察隊來了！一邊閃子彈、一邊打。按住 Shift（手機用兩根手指）可以慢慢移動，比較好鑽縫。',
    waves: [
      ...row(1, 'drone', [-6, -3, 0, 3, 6], { gap: 0.4, path: 'down', speed: 6, atk: [A(1.2, 'aim', { n: 1, speed: 7 })] }),
      ...row(5, 'drone', [-8, -5, -2], { gap: 0.3, path: 'sine', speed: 5, amp: 4, atk: [A(1.5, 'aim', { n: 3, spread: 0.25, speed: 7 })] }),
      ...row(6.5, 'drone', [8, 5, 2], { gap: 0.3, path: 'sine', speed: 5, amp: -4, atk: [A(1.5, 'aim', { n: 3, spread: 0.25, speed: 7 })] }),
      { t: 10, type: 'turret', x: 0, path: 'stop', stopZ: -9, hold: 7, atk: [A(1.2, 'ring', { n: 18, rep: 6, interval: 0.9, spin: 0.09, speed: 6, color: 1 })] },
      ...row(13, 'fighter', [-9, 9], { path: 'down', speed: 9, atk: [A(0.8, 'aim', { n: 5, spread: 0.18, speed: 9, rep: 2, interval: 0.4, color: 2 })] }),
      ...row(19, 'drone', [-7, -5, -3, -1, 1, 3, 5, 7], { gap: 0.2, path: 'down', speed: 7, atk: [A(1.0, 'aim', { n: 1, speed: 8 })] }),
      { t: 23, type: 'turret', x: -6, path: 'stop', stopZ: -10, hold: 8, atk: [A(1, 'spiral', { arms: 3, dur: 6, spin: 0.21, speed: 5.5, color: 4 })] },
      { t: 23, type: 'turret', x: 6, path: 'stop', stopZ: -10, hold: 8, atk: [A(1, 'spiral', { arms: 3, dur: 6, spin: -0.21, speed: 5.5, color: 1 })] },
      ...row(33, 'fighter', [-10, -6, 6, 10], { gap: 0.5, path: 'cross', speed: 7, z: -11, atk: [A(1.0, 'ring', { n: 12, rep: 1, speed: 6, color: 2 })] }),
      { t: 38, type: 'carrier', x: 0, path: 'stop', stopZ: -9, hold: 12, atk: [A(1, 'flower', { n: 16, rep: 10, interval: 0.6, spin: 0.2, curve: 0.5, speed: 5, color: 0 }), A(4, 'aim', { n: 7, spread: 0.12, speed: 8, rep: 6, interval: 1.2, color: 2, size: 2 })] },
      ...row(52, 'drone', [-8, -4, 0, 4, 8], { gap: 0.25, path: 'sine', speed: 6, amp: 3, atk: [A(1.2, 'ring', { n: 8, speed: 6, color: 3 })] }),
    ],
    end: 58,
    phases: [   // 魔王：血量剩多少時換招式
      { until: 0.66, cycle: 4.0, atk: [A(0, 'aim', { gun: 1, n: 5, spread: 0.2, speed: 8, rep: 3, interval: 0.25, color: 2 }), A(0, 'aim', { gun: 2, n: 5, spread: 0.2, speed: 8, rep: 3, interval: 0.25, color: 2 }), A(1.5, 'ring', { gun: 0, n: 24, rep: 3, interval: 0.5, spin: 0.13, speed: 6, color: 0 })] },
      { until: 0.33, cycle: 5.0, atk: [A(0, 'spiral', { gun: 0, arms: 4, dur: 4, spin: 0.23, speed: 6, color: 4 }), A(1, 'aim', { gun: 1, n: 3, spread: 0.3, speed: 10, rep: 6, interval: 0.5, color: 2, size: 2 })] },
      { until: 0, cycle: 4.5, atk: [A(0, 'flower', { gun: 0, n: 20, rep: 6, interval: 0.55, spin: 0.15, curve: 0.6, speed: 5.5, color: 0 }), A(0.2, 'flower', { gun: 0, n: 20, rep: 6, interval: 0.55, spin: -0.15, curve: -0.6, speed: 5.5, color: 1 })] },
    ],
    bossHp: 900,
  },
  {
    id: 's2', name: '冰晶小行星帶', tint: [0x1a6a9a, 0x5ae0ff], boss: 'hydra', bossName: '三頭冰龍艦',
    intro: '前面是小行星帶！大石頭打得碎，但會擋路。擦過子彈旁邊（擦彈）也有分數。',
    waves: [
      ...[-8, -3, 2, 7, -5, 4, 0, -9, 8].map((x, i) => ({ t: 1 + i * 0.9, type: 'rock', x, path: 'down', speed: 3 + (i % 3), atk: [] })),
      ...row(7, 'fighter', [-6, 0, 6], { gap: 0.3, path: 'down', speed: 8, atk: [A(0.9, 'aim', { n: 3, spread: 0.2, speed: 9, rep: 3, interval: 0.3, color: 1 })] }),
      { t: 11, type: 'turret', x: 0, path: 'stop', stopZ: -10, hold: 8, atk: [A(1, 'ring', { n: 30, rep: 7, interval: 0.8, spin: 0.05, speed: 4.5, accel: -2.5, color: 1 })] },
      ...[-6, 6, -2, 2, -9, 9].map((x, i) => ({ t: 14 + i * 0.6, type: 'rock', x, path: 'down', speed: 4, atk: [] })),
      ...row(21, 'drone', [-9, -6, -3, 0, 3, 6, 9], { gap: 0.15, path: 'sine', speed: 6, amp: 2.5, atk: [A(1.0, 'ring', { n: 10, speed: 5, color: 1 })] }),
      { t: 26, type: 'carrier', x: -5, path: 'stop', stopZ: -10, hold: 10, atk: [A(1, 'spiral', { arms: 5, dur: 8, spin: 0.17, speed: 5, color: 1 })] },
      { t: 27, type: 'carrier', x: 5, path: 'stop', stopZ: -8, hold: 10, atk: [A(1.5, 'aim', { n: 9, spread: 0.1, speed: 8, rep: 7, interval: 1.1, color: 5 })] },
      ...[-7, -2, 3, 8, -4, 6].map((x, i) => ({ t: 40 + i * 0.5, type: 'rock', x, path: 'down', speed: 5, atk: [] })),
      ...row(44, 'fighter', [-10, -5, 0, 5, 10], { gap: 0.3, path: 'cross', speed: 8, z: -12, atk: [A(0.7, 'rain', { n: 1, speed: 7, rep: 6, interval: 0.25, color: 1 })] }),
      { t: 50, type: 'turret', x: 0, path: 'stop', stopZ: -11, hold: 7, atk: [A(1, 'flower', { n: 14, rep: 9, interval: 0.5, spin: 0.3, curve: -0.7, speed: 5, color: 3 })] },
    ],
    end: 60,
    phases: [
      { until: 0.66, cycle: 4.2, atk: [A(0, 'aim', { gun: 0, n: 7, spread: 0.13, speed: 9, rep: 4, interval: 0.3, color: 1 }), A(0.6, 'aim', { gun: 1, n: 7, spread: 0.13, speed: 9, rep: 4, interval: 0.3, color: 5 }), A(1.2, 'aim', { gun: 2, n: 7, spread: 0.13, speed: 9, rep: 4, interval: 0.3, color: 1 })] },
      { until: 0.33, cycle: 5.0, atk: [A(0, 'ring', { gun: 1, n: 36, rep: 8, interval: 0.45, spin: 0.087, speed: 5, accel: -2, color: 1 }), A(2, 'spiral', { gun: 0, arms: 2, dur: 2.5, spin: 0.3, speed: 7, color: 3 }), A(2, 'spiral', { gun: 2, arms: 2, dur: 2.5, spin: -0.3, speed: 7, color: 3 })] },
      { until: 0, cycle: 5.5, atk: [A(0, 'flower', { gun: 1, n: 24, rep: 8, interval: 0.5, spin: 0.12, curve: 0.8, speed: 5, color: 1 }), A(0, 'flower', { gun: 1, n: 24, rep: 8, interval: 0.5, spin: -0.12, curve: -0.8, speed: 5, color: 5 }), A(2.5, 'aim', { gun: 0, n: 1, speed: 12, rep: 10, interval: 0.15, color: 2, size: 2 })] },
    ],
    bossHp: 1300,
  },
  {
    id: 's3', name: '黑洞核心', tint: [0x5a1a8a, 0xff4ab0], boss: 'eclipse', bossName: '日蝕',
    intro: '最後一關：黑洞旁邊的要塞。子彈會轉彎、會先慢下來再加速，看清楚縫隙再鑽！',
    waves: [
      ...row(1, 'fighter', [-8, -4, 0, 4, 8], { gap: 0.3, path: 'down', speed: 8, atk: [A(0.8, 'flower', { n: 8, rep: 2, interval: 0.5, curve: 0.8, speed: 6, color: 4 })] }),
      { t: 6, type: 'turret', x: -7, path: 'stop', stopZ: -11, hold: 8, atk: [A(1, 'spiral', { arms: 4, dur: 7, spin: 0.19, speed: 5, curve: 0.3, color: 4 })] },
      { t: 6, type: 'turret', x: 7, path: 'stop', stopZ: -11, hold: 8, atk: [A(1, 'spiral', { arms: 4, dur: 7, spin: -0.19, speed: 5, curve: -0.3, color: 0 })] },
      ...row(16, 'drone', [-9, -7, -5, -3, -1, 1, 3, 5, 7, 9], { gap: 0.12, path: 'sine', speed: 7, amp: 2, atk: [A(1.0, 'aim', { n: 3, spread: 0.3, speed: 8, color: 4 })] }),
      { t: 21, type: 'carrier', x: 0, path: 'stop', stopZ: -9, hold: 12, atk: [A(1, 'ring', { n: 40, rep: 10, interval: 0.9, spin: 0.04, speed: 6, accel: -3, color: 4 }), A(2, 'aim', { n: 5, spread: 0.15, speed: 10, rep: 8, interval: 1.1, color: 2, size: 2 })] },
      ...row(34, 'fighter', [-10, 10, -6, 6, -2, 2], { gap: 0.35, path: 'cross', speed: 9, z: -12, atk: [A(0.6, 'ring', { n: 16, speed: 6, color: 0 })] }),
      { t: 40, type: 'turret', x: 0, path: 'stop', stopZ: -10, hold: 9, atk: [A(1, 'flower', { n: 20, rep: 12, interval: 0.55, spin: 0.25, curve: 0.9, speed: 5, color: 4 }), A(1.25, 'flower', { n: 20, rep: 12, interval: 0.55, spin: -0.25, curve: -0.9, speed: 5, color: 1 })] },
      ...row(52, 'drone', [-8, -4, 0, 4, 8, -6, -2, 2, 6], { gap: 0.2, path: 'down', speed: 8, atk: [A(0.8, 'ring', { n: 6, speed: 7, color: 2 })] }),
    ],
    end: 60,
    phases: [
      { until: 0.75, cycle: 4.5, atk: [A(0, 'spiral', { gun: 0, arms: 6, dur: 4, spin: 0.15, speed: 5, curve: 0.25, color: 4 }), A(1.5, 'aim', { gun: 0, n: 9, spread: 0.12, speed: 9, rep: 3, interval: 0.35, color: 2 })] },
      { until: 0.5, cycle: 5.0, atk: [A(0, 'ring', { gun: 0, n: 48, rep: 6, interval: 0.7, spin: 0.065, speed: 7, accel: -4, color: 0 }), A(0.35, 'ring', { gun: 0, n: 48, rep: 6, interval: 0.7, spin: -0.065, speed: 7, accel: -4, color: 4 })] },
      { until: 0.25, cycle: 5.0, atk: [A(0, 'flower', { gun: 0, n: 30, rep: 8, interval: 0.5, spin: 0.1, curve: 1.0, speed: 5, color: 4 }), A(0, 'flower', { gun: 0, n: 30, rep: 8, interval: 0.5, spin: -0.1, curve: -1.0, speed: 5, color: 1 })] },
      { until: 0, cycle: 6.0, atk: [A(0, 'spiral', { gun: 0, arms: 8, dur: 5, spin: 0.11, speed: 6, color: 4 }), A(0, 'spiral', { gun: 0, arms: 8, dur: 5, spin: -0.11, speed: 4.5, color: 0 }), A(2, 'aim', { gun: 0, n: 3, spread: 0.2, speed: 12, rep: 8, interval: 0.3, color: 5, size: 2 })] },
    ],
    bossHp: 1800,
  },
];

// 難度：子彈速度、密度（一圈幾顆）、玩家的命
export const DIFFS = [
  { name: '簡單', speed: 0.75, density: 0.55, lives: 5, hitR: 0.12 },
  { name: '普通', speed: 1, density: 0.85, lives: 3, hitR: 0.16 },
  { name: '困難', speed: 1.15, density: 1.2, lives: 2, hitR: 0.18 },
];
