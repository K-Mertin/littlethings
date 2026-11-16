// 關卡：用比例座標畫，格子大小不同（WebGPU／相容模式）也一樣
// emit：水龍頭／出沙口（每一格都在那裡倒材料）；drain：排水孔（吃掉流到那裡的東西，免得畫面被灌滿）
// win：fill ＝ 區域裡某種材料達到 need（區域面積的比例）並維持 1 秒；survive ＝ 撐過 time 秒，區域裡的材料剩 keep 以上
import { M, Builder } from './mats.js';

const ground = (B, y = 0.95) => B.rect(0, y, 1, 1, M.WALL);

export const LEVELS = [
  {
    id: 'cup', name: '水往杯子流', icon: '🥛',
    goal: '畫石牆，把水龍頭的水引進右邊的杯子，裝到三分之一。',
    tools: ['wall', 'erase'], ink: 1.3,
    build(B) {
      ground(B);
      B.rect(0.05, 0.02, 0.19, 0.045, M.WALL);   // 水龍頭
      this.cupR = B.cup(0.7, 0.6, 0.9, 0.95);
    },
    emit: [{ x: 0.12, y: 0.06, r: 0.01, mat: M.WATER, prob: 0.32 }],
    drain: [{ x0: 0.0, y0: 0.9, x1: 0.3, y1: 0.95 }],
    win(L) { return { kind: 'fill', region: L.cupR, mats: [M.WATER], need: 0.35 }; },
  },
  {
    id: 'box', name: '沙子溜滑梯', icon: '📦',
    goal: '把沙子送進右下的箱子。沙子不像水：斜坡太平會卡住，要畫得夠陡（像溜滑梯）才滑得下去！',
    tools: ['wall', 'erase'], ink: 1.3,
    build(B) {
      ground(B);
      B.rect(0.24, 0.02, 0.36, 0.045, M.WALL);
      this.cupR = B.cup(0.44, 0.66, 0.72, 0.95);
    },
    emit: [{ x: 0.3, y: 0.06, r: 0.01, mat: M.SAND, prob: 0.45 }],
    drain: [{ x0: 0, y0: 0.9, x1: 0.4, y1: 0.95 }, { x0: 0.76, y0: 0.9, x1: 1, y1: 0.95 }],
    win(L) { return { kind: 'fill', region: L.cupR, mats: [M.SAND], need: 0.15 }; },
  },
  {
    id: 'garden', name: '小花園', icon: '🌷',
    goal: '在花盆裡撒種子、澆水，讓植物長高，碰到上面的虛線。種子要碰到水才會發芽，植物喝越多水長越高！',
    tools: ['seed', 'water'], ink: 0,
    build(B) {
      ground(B);
      B.cup(0.3, 0.74, 0.7, 0.95);
      B.rect(0.31, 0.86, 0.69, 0.935, M.SAND, false);
      this.bed = { x0: B.X(0.31), y0: B.Y(0.3), x1: B.X(0.69), y1: B.Y(0.42) };
    },
    emit: [], drain: [{ x0: 0, y0: 0.9, x1: 0.28, y1: 0.95 }, { x0: 0.72, y0: 0.9, x1: 1, y1: 0.95 }],
    win(L) { return { kind: 'fill', region: L.bed, mats: [M.PLANT], need: 0.06 }; },
  },
  {
    id: 'twin', name: '雙杯挑戰', icon: '⚖️',
    goal: '只有一個水龍頭，要把左右兩個杯子都裝到三分之一。',
    tools: ['wall', 'erase'], ink: 2.0,
    build(B) {
      ground(B);
      B.rect(0.43, 0.02, 0.57, 0.045, M.WALL);
      this.cupA = B.cup(0.05, 0.62, 0.25, 0.95);
      this.cupB = B.cup(0.75, 0.62, 0.95, 0.95);
    },
    emit: [{ x: 0.5, y: 0.06, r: 0.01, mat: M.WATER, prob: 0.4 }],
    drain: [{ x0: 0.32, y0: 0.9, x1: 0.68, y1: 0.95 }],
    win(L) { return { kind: 'fill', region: L.cupA, region2: L.cupB, mats: [M.WATER], need: 0.35 }; },
  },
  {
    id: 'lava', name: '擋住岩漿', icon: '🌋',
    goal: '火山在噴岩漿了！用水、沙子或石牆保護右邊的小木屋，撐過 35 秒。（水碰到岩漿會變成石頭）',
    tools: ['water', 'sand', 'wall'], ink: 0.8, time: 35, keep: 0.85,
    build(B) {
      ground(B, 0.93);
      B.line(0.0, 0.3, 0.42, 0.56, 0.022, M.WALL);
      B.rect(0.0, 0.03, 0.12, 0.06, M.STONE);
      this.home = B.house(0.74, 0.93, 0.15, 0.3);
    },
    emit: [{ x: 0.07, y: 0.09, r: 0.013, mat: M.LAVA, prob: 0.3 }],
    drain: [],
    win(L) { return { kind: 'survive', region: L.home, mats: [M.WOOD], keep: 0.85, time: 35 }; },
  },
  {
    id: 'forest', name: '森林救火', icon: '🚒',
    goal: '森林燒起來了！用水滅火、沙子蓋住，或用橡皮擦清出一條「防火巷」，保護小木屋撐過 40 秒。',
    tools: ['water', 'sand', 'erase'], ink: 0, time: 40, keep: 0.85,
    build(B) {
      ground(B, 0.93);
      B.rect(0, 0.9, 0.72, 0.93, M.PLANT, false);
      [0.07, 0.18, 0.3, 0.42, 0.55].forEach((x, i) => B.tree(x, 0.9, 1.4 + (i % 2) * 0.35, false));
      this.home = B.house(0.76, 0.93, 0.15, 0.3);
      B.rect(0.72, 0.9, 0.76, 0.93, M.PLANT, false);
    },
    emit: [{ x: 0.02, y: 0.86, r: 0.03, mat: M.FIRE, prob: 0.5, mode: 2, until: 1.5 }],
    drain: [],
    win(L) { return { kind: 'survive', region: L.home, mats: [M.WOOD], keep: 0.85, time: 40 }; },
  },
];

export function buildLevel(L, w, h) {
  const B = new Builder(w, h);
  L.build(B);
  return B.a;
}

// 自由玩的開場小場景：地面、一池水、一棵樹、一座沙丘
export function freeScene(w, h) {
  const B = new Builder(w, h);
  B.rect(0, 0.95, 1, 1, M.WALL, false);
  B.line(0.55, 0.78, 0.55, 0.95, 0.008, M.WALL, false);
  B.line(0.9, 0.78, 0.9, 0.95, 0.008, M.WALL, false);
  B.rect(0.56, 0.83, 0.895, 0.95, M.WATER, false, 0.97);
  for (let x = 0.04; x < 0.42; x += 0.004) {
    const k = Math.sin((x - 0.04) / 0.38 * Math.PI);
    B.rect(x, 0.95 - k * 0.14, x + 0.004, 0.95, M.SAND, false, 0.97);
  }
  B.tree(0.47, 0.95, 1.5, false);
  return B.a;
}
