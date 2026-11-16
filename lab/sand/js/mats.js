// 材料編號（和 shaders.js 的常數一致）與工具列
export const M = { EMPTY: 0, WALL: 1, SAND: 2, WATER: 3, LAVA: 4, WOOD: 5, PLANT: 6, SEED: 7, FIRE: 8, STEAM: 9, SMOKE: 10, STONE: 11, OIL: 12, EMBER: 13 };
export const LOCK = 0x4000000;

// mode：0 倒進空的地方、1 蓋過去、2 點火（見 shaders.js 的 STAMP）
export const TOOLS = {
  sand: { name: '沙子', emoji: '🏖️', mat: M.SAND, mode: 0, prob: 0.45, color: '#f0cf85' },
  water: { name: '水', emoji: '💧', mat: M.WATER, mode: 0, prob: 0.55, color: '#3d8ff0' },
  lava: { name: '岩漿', emoji: '🌋', mat: M.LAVA, mode: 0, prob: 0.45, color: '#ff7a1c' },
  seed: { name: '種子', emoji: '🌱', mat: M.SEED, mode: 0, prob: 0.06, color: '#9a7038' },
  oil: { name: '油', emoji: '🛢️', mat: M.OIL, mode: 0, prob: 0.5, color: '#4d2c45' },
  fire: { name: '火', emoji: '🔥', mat: M.FIRE, mode: 2, prob: 0.5, color: '#ff4d1a' },
  wood: { name: '木頭', emoji: '🪵', mat: M.WOOD, mode: 1, prob: 1, color: '#7a4d26' },
  wall: { name: '石牆', emoji: '🧱', mat: M.WALL, mode: 1, prob: 1, color: '#5d6476' },
  erase: { name: '橡皮擦', emoji: '🧽', mat: M.EMPTY, mode: 1, prob: 1, color: '#e9eef8' },
};
export const FREE_TOOLS = ['sand', 'water', 'lava', 'seed', 'oil', 'fire', 'wood', 'wall', 'erase'];

// 用比例座標（0–1）在格子上畫關卡、場景
export class Builder {
  constructor(w, h) { this.w = w; this.h = h; this.a = new Uint32Array(w * h); }
  put(x, y, mat, lock) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.a[y * this.w + x] = (mat | (((Math.random() * 255) | 0) << 8) | (lock ? LOCK : 0)) >>> 0;
  }
  X(v) { return Math.round(v * this.w); }
  Y(v) { return Math.round(v * this.h); }
  rect(x0, y0, x1, y1, mat, lock = true, fill = 1) {
    for (let y = this.Y(y0); y < this.Y(y1); y++) for (let x = this.X(x0); x < this.X(x1); x++) if (Math.random() < fill) this.put(x, y, mat, lock);
  }
  // 粗線（th 是比例，以寬度計）
  line(x0, y0, x1, y1, th, mat, lock = true) {
    const ax = x0 * this.w, ay = y0 * this.h, bx = x1 * this.w, by = y1 * this.h, r = th * this.w / 2;
    const abx = bx - ax, aby = by - ay, ab2 = abx * abx + aby * aby || 1;
    for (let y = Math.floor(Math.min(ay, by) - r); y <= Math.ceil(Math.max(ay, by) + r); y++)
      for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.ceil(Math.max(ax, bx) + r); x++) {
        const px = x + 0.5 - ax, py = y + 0.5 - ay, t = Math.min(1, Math.max(0, (px * abx + py * aby) / ab2));
        const dx = px - abx * t, dy = py - aby * t;
        if (dx * dx + dy * dy <= r * r) this.put(x, y, mat, lock);
      }
  }
  disc(cx, cy, rr, mat, lock = true, fill = 1) {
    const r = rr * this.w, X = cx * this.w, Y = cy * this.h;
    for (let y = Math.floor(Y - r); y <= Y + r; y++) for (let x = Math.floor(X - r); x <= X + r; x++)
      if ((x - X) ** 2 + (y - Y) ** 2 <= r * r && Math.random() < fill) this.put(x, y, mat, lock);
  }
  // 杯子：U 字形的牆（內側範圍回傳給關卡目標用）
  cup(x0, y0, x1, y1, th = 0.012) {
    this.line(x0, y0, x0, y1, th, M.WALL); this.line(x1, y0, x1, y1, th, M.WALL); this.line(x0, y1, x1, y1, th, M.WALL);
    const t = th * this.w / 2 + 1;
    return { x0: this.X(x0) + t, y0: this.Y(y0), x1: this.X(x1) - t, y1: this.Y(y1) - t };
  }
  // 木頭小屋（牆＋三角屋頂），回傳範圍
  house(x0, y1, wd, ht) {
    const x1 = x0 + wd, yw = y1 - ht * 0.6, yt = y1 - ht;
    this.rect(x0, yw, x1, y1, M.WOOD);
    // 窗戶、門挖空
    const W = this.w, H = this.h;
    const clear = (a, b, c, d) => { for (let y = this.Y(b); y < this.Y(d); y++) for (let x = this.X(a); x < this.X(c); x++) this.a[y * W + x] = 0; };
    clear(x0 + wd * 0.18, yw + ht * 0.12, x0 + wd * 0.38, yw + ht * 0.3);
    clear(x0 + wd * 0.6, y1 - ht * 0.38, x0 + wd * 0.8, y1);
    for (let y = this.Y(yt); y < this.Y(yw); y++) {
      const k = (y - this.Y(yt)) / Math.max(1, this.Y(yw) - this.Y(yt));
      const cx = (x0 + x1) / 2, half = (wd / 2 + 0.01) * k;
      for (let x = this.X(cx - half); x < this.X(cx + half); x++) this.put(x, y, M.WOOD, true);
    }
    void H;
    return { x0: this.X(x0), y0: this.Y(yt), x1: this.X(x1), y1: this.Y(y1) };
  }
  tree(x, y1, s, lock = true) {
    this.rect(x - 0.008 * s, y1 - 0.18 * s, x + 0.008 * s, y1, M.WOOD, lock);
    this.disc(x, y1 - 0.2 * s, 0.035 * s, M.PLANT, lock, 0.92);
    this.disc(x - 0.025 * s, y1 - 0.15 * s, 0.025 * s, M.PLANT, lock, 0.92);
    this.disc(x + 0.025 * s, y1 - 0.15 * s, 0.025 * s, M.PLANT, lock, 0.92);
  }
}
