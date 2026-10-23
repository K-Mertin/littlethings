'use strict';
// 深淵地牢：視野（遞迴陰影投射）與路徑
const FOV = {
  // 回傳 Uint8Array，1 = 看得見
  compute(F, ox, oy, radius) {
    const vis = new Uint8Array(F.w * F.h);
    const op = (x, y) => x < 0 || y < 0 || x >= F.w || y >= F.h || TP[F.t[y * F.w + x]].op;
    const mark = (x, y) => { if (x >= 0 && y >= 0 && x < F.w && y < F.h) vis[y * F.w + x] = 1; };
    mark(ox, oy);
    const r2 = radius * radius + radius;
    const mult = [[1, 0, 0, -1, -1, 0, 0, 1], [0, 1, -1, 0, 0, -1, 1, 0], [0, 1, 1, 0, 0, -1, -1, 0], [1, 0, 0, 1, -1, 0, 0, -1]];
    const cast = (row, start, end, xx, xy, yx, yy) => {
      if (start < end) return;
      let newStart = 0;
      for (let j = row; j <= radius; j++) {
        let dx = -j - 1, dy = -j, blocked = false;
        while (dx <= 0) {
          dx++;
          const X = ox + dx * xx + dy * xy, Y = oy + dx * yx + dy * yy;
          const lS = (dx - 0.5) / (dy + 0.5), rS = (dx + 0.5) / (dy - 0.5);
          if (start < rS) continue; else if (end > lS) break;
          if (dx * dx + dy * dy < r2) mark(X, Y);
          if (blocked) {
            if (op(X, Y)) { newStart = rS; continue; }
            blocked = false; start = newStart;
          } else if (op(X, Y) && j < radius) {
            blocked = true; cast(j + 1, start, lS, xx, xy, yx, yy); newStart = rS;
          }
        }
        if (blocked) break;
      }
    };
    for (let o = 0; o < 8; o++) cast(1, 1.0, 0.0, mult[0][o], mult[1][o], mult[2][o], mult[3][o]);
    return vis;
  },
  // 兩點之間是否沒有遮擋（不含兩端）
  clear(F, x0, y0, x1, y1) {
    const pts = lineTo(x0, y0, x1, y1);
    for (let i = 0; i < pts.length - 1; i++) { const [x, y] = pts[i]; if (TP[F.t[y * F.w + x]].op) return false; }
    return true;
  },
  // BFS 路徑：回傳路徑陣列（不含起點），pass(x,y) 判斷能否通過
  path(F, sx, sy, tx, ty, pass, limit = 4000) {
    if (sx === tx && sy === ty) return [];
    const W = F.w, N = W * F.h, prev = new Int32Array(N).fill(-1), s = sy * W + sx, g = ty * W + tx;
    prev[s] = s; const q = [s];
    for (let h = 0; h < q.length && h < limit; h++) {
      const k = q[h], x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= F.h) continue;
        const nk = ny * W + nx; if (prev[nk] >= 0) continue;
        if (nk !== g && !pass(nx, ny)) continue;
        if (nk === g && !pass(nx, ny, true)) continue;
        if (dx && dy && (!TP[F.t[y * W + nx]].walk || !TP[F.t[ny * W + x]].walk)) continue; // 不切牆角
        prev[nk] = k;
        if (nk === g) {
          const out = []; let c = g;
          while (c !== s) { out.push([c % W, (c / W) | 0]); c = prev[c]; }
          return out.reverse();
        }
        q.push(nk);
      }
    }
    return null;
  },
  // Dijkstra 距離圖（8 方向，等成本）
  distMap(F, sx, sy, pass) {
    const W = F.w, d = new Int16Array(W * F.h).fill(32767), q = [sy * W + sx]; d[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const k = q[h], x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= F.h) continue;
        const nk = ny * W + nx; if (d[nk] !== 32767 || !pass(nx, ny)) continue;
        if (dx && dy && (!TP[F.t[y * W + nx]].walk || !TP[F.t[ny * W + x]].walk)) continue;
        d[nk] = d[k] + 1; q.push(nk);
      }
    }
    return d;
  },
};
