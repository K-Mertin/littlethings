// 反彈神射手：物理核心（子彈反彈、命中、炸藥桶）
// 遊戲畫面（game.js）和關卡解題器（tools/solve.mjs）共用這份，所以解題器算出來的解法跟玩家打出來的一模一樣。
// 座標：場地固定 800×560，左上角是 (0,0)，y 往下。角度：0° 朝右，逆時針為正（畫面上往上是 90°）。
(function (root) {
  'use strict';
  const W = 800, H = 560;
  const C = {
    W, H,
    SPEED: 1000,        // 子彈速度（每秒像素）
    MAX_BOUNCE: 6,      // 最多反彈幾次，第 7 次撞牆子彈就碎掉
    MAX_DIST: 7000,     // 子彈最多飛多遠
    BULLET_R: 5,
    ENEMY_R: 20,
    BARREL_R: 17,
    BLAST_R: 115,       // 炸藥桶爆炸範圍
    MIRROR_T: 12,       // 鏡子厚度
    PLAYER_R: 22,
    MUZZLE: 0,          // 子彈從角色中心出發（角色不會被自己的子彈打到）
  };
  const EPS = 1e-7;

  // 把關卡資料轉成「多邊形＋邊」。每條邊記錄外法向量（從牆裡指向外面）。
  function build(def) {
    const polys = [];
    const addPoly = (pts, kind) => polys.push({ pts, kind });
    for (const b of def.walls || []) addPoly(boxPts(b), 'wall');
    for (const b of def.soft || []) addPoly(boxPts(b), 'soft');
    for (const m of def.mirrors || []) addPoly(segPts(m, C.MIRROR_T), 'mirror');
    const edges = [];
    for (const p of polys) {
      const n = p.pts.length;
      let cx = 0, cy = 0;
      for (const q of p.pts) { cx += q[0] / n; cy += q[1] / n; }
      for (let i = 0; i < n; i++) {
        const a = p.pts[i], b = p.pts[(i + 1) % n];
        let nx = b[1] - a[1], ny = -(b[0] - a[0]);
        const L = Math.hypot(nx, ny); nx /= L; ny /= L;
        const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
        if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
        edges.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], nx, ny, kind: p.kind });
      }
    }
    // 場地外框：法向量朝場地內
    const soft = def.softBorder || {};
    edges.push({ ax: 0, ay: 0, bx: W, by: 0, nx: 0, ny: 1, kind: soft.top ? 'soft' : 'wall', border: 1 });
    edges.push({ ax: 0, ay: H, bx: W, by: H, nx: 0, ny: -1, kind: soft.bottom ? 'soft' : 'wall', border: 1 });
    edges.push({ ax: 0, ay: 0, bx: 0, by: H, nx: 1, ny: 0, kind: soft.left ? 'soft' : 'wall', border: 1 });
    edges.push({ ax: W, ay: 0, bx: W, by: H, nx: -1, ny: 0, kind: soft.right ? 'soft' : 'wall', border: 1 });
    return {
      def, polys, edges,
      player: { x: def.player[0], y: def.player[1] },
      enemies: def.enemies.map((e, i) => ({ i, x: e[0], y: e[1] })),
      barrels: (def.barrels || []).map((b, i) => ({ i, x: b[0], y: b[1] })),
    };
  }
  function boxPts(b) { const [x, y, w, h] = b; return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
  function segPts(m, t) {
    const [x1, y1, x2, y2] = m; let dx = x2 - x1, dy = y2 - y1; const L = Math.hypot(dx, dy);
    const ox = -dy / L * t / 2, oy = dx / L * t / 2;
    return [[x1 + ox, y1 + oy], [x2 + ox, y2 + oy], [x2 - ox, y2 - oy], [x1 - ox, y1 - oy]];
  }

  // 射線 p + t·v（0 < t ≤ maxT）最先撞到哪條邊
  function firstHit(world, px, py, vx, vy, maxT) {
    let best = null, bt = maxT;
    for (const e of world.edges) {
      if (vx * e.nx + vy * e.ny >= 0) continue;           // 只會從外面撞進去
      const ex = e.bx - e.ax, ey = e.by - e.ay;
      const den = vx * ey - vy * ex;
      if (Math.abs(den) < EPS) continue;
      const qx = e.ax - px, qy = e.ay - py;
      const t = (qx * ey - qy * ex) / den;
      const s = (qx * vy - qy * vx) / den;
      if (t > 1e-6 && t < bt && s >= -1e-6 && s <= 1 + 1e-6) { bt = t; best = e; }
    }
    return best ? { t: bt, e: best } : null;
  }

  // 線段 a→b 有沒有碰到圓（回傳沿線段的比例 0..1，沒碰到回傳 -1）
  function segCircle(ax, ay, bx, by, cx, cy, r) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    let u = L2 ? ((cx - ax) * dx + (cy - ay) * dy) / L2 : 0;
    u = Math.max(0, Math.min(1, u));
    const x = ax + u * dx - cx, y = ay + u * dy - cy;
    return x * x + y * y <= r * r ? u : -1;
  }

  // 一顆子彈的狀態
  function makeBullet(world, deg) {
    const a = deg * Math.PI / 180;
    const vx = Math.cos(a), vy = -Math.sin(a);
    return { x: world.player.x + vx * C.MUZZLE, y: world.player.y + vy * C.MUZZLE, vx, vy, bounces: 0, dist: 0, dead: false, path: [[world.player.x, world.player.y]] };
  }

  // 讓子彈往前走 dist 像素。state：{ dead: Set(敵人), boom: Set(炸藥桶) }。
  // ev(type, data) 回報事件：'bounce' 'hit' 'barrel' 'stop'
  function advance(world, b, dist, state, ev) {
    ev = ev || (() => {});
    let guard = 0;
    while (dist > 1e-6 && !b.dead && guard++ < 64) {
      const left = C.MAX_DIST - b.dist;
      const step = Math.min(dist, left);
      const hit = firstHit(world, b.x, b.y, b.vx, b.vy, step);
      const t = hit ? hit.t : step;
      const nx = b.x + b.vx * t, ny = b.y + b.vy * t;
      touch(world, b, b.x, b.y, nx, ny, state, ev);
      b.x = nx; b.y = ny; b.dist += t; dist -= t;
      if (hit) {
        b.path.push([nx, ny]);
        if (hit.e.kind === 'soft' || b.bounces >= C.MAX_BOUNCE) { b.dead = true; ev('stop', { x: nx, y: ny, soft: hit.e.kind === 'soft' }); break; }
        // 反射：v' = v − 2(v·n)n
        const d = b.vx * hit.e.nx + b.vy * hit.e.ny;
        b.vx -= 2 * d * hit.e.nx; b.vy -= 2 * d * hit.e.ny;
        const L = Math.hypot(b.vx, b.vy); b.vx /= L; b.vy /= L;
        b.bounces++;
        ev('bounce', { x: nx, y: ny, kind: hit.e.kind });
      } else if (b.dist >= C.MAX_DIST - 1e-6) {
        b.path.push([nx, ny]); b.dead = true; ev('stop', { x: nx, y: ny }); break;
      }
    }
    if (guard >= 64 && !b.dead) { b.dead = true; ev('stop', { x: b.x, y: b.y }); }
  }

  // 這一小段路上碰到的敵人、炸藥桶（子彈會穿過去繼續飛）
  function touch(world, b, ax, ay, bx, by, state, ev) {
    const hits = [];
    for (const e of world.enemies) {
      if (state.dead.has(e.i)) continue;
      const u = segCircle(ax, ay, bx, by, e.x, e.y, C.ENEMY_R + C.BULLET_R - 1);
      if (u >= 0) hits.push({ u, t: 'e', o: e });
    }
    for (const r of world.barrels) {
      if (state.boom.has(r.i)) continue;
      const u = segCircle(ax, ay, bx, by, r.x, r.y, C.BARREL_R + C.BULLET_R - 1);
      if (u >= 0) hits.push({ u, t: 'b', o: r });
    }
    hits.sort((p, q) => p.u - q.u);
    for (const h of hits) {
      if (h.t === 'e') { if (!state.dead.has(h.o.i)) { state.dead.add(h.o.i); ev('hit', h.o); } }
      else explode(world, h.o, state, ev);
    }
  }

  function explode(world, r, state, ev) {
    if (state.boom.has(r.i)) return;
    state.boom.add(r.i);
    ev('barrel', r);
    for (const e of world.enemies) {
      if (!state.dead.has(e.i) && Math.hypot(e.x - r.x, e.y - r.y) <= C.BLAST_R + C.ENEMY_R * 0.5) { state.dead.add(e.i); ev('hit', e); }
    }
    for (const o of world.barrels) {
      if (!state.boom.has(o.i) && Math.hypot(o.x - r.x, o.y - r.y) <= C.BLAST_R + C.BARREL_R * 0.5) explode(world, o, state, ev);
    }
  }

  // 一次飛完（解題器、瞄準線用）
  function simulate(world, deg, state, limitDist) {
    state = state || { dead: new Set(), boom: new Set() };
    const b = makeBullet(world, deg);
    const events = [];
    advance(world, b, limitDist || C.MAX_DIST, state, (t, d) => events.push([t, d]));
    if (!b.dead) b.path.push([b.x, b.y]);
    return { bullet: b, state, events };
  }

  // 瞄準線：走到第 n 次反彈之後再多走 tail 像素
  function aimPath(world, deg, bouncesShown, tail) {
    const b = makeBullet(world, deg);
    const st = { dead: new Set(), boom: new Set() };
    const pts = [[b.x, b.y]];
    let guard = 0;
    while (!b.dead && guard++ < 20) {
      const before = b.bounces;
      const hit = firstHit(world, b.x, b.y, b.vx, b.vy, 2000);
      if (!hit) break;
      if (before >= bouncesShown) {
        const t = Math.min(hit.t, tail);
        pts.push([b.x + b.vx * t, b.y + b.vy * t]);
        return { pts, end: t < hit.t ? 'tail' : hit.e.kind };
      }
      advance(world, b, hit.t + 1e-9, st, null);
      pts.push([b.x, b.y]);
      if (b.dead) return { pts, end: hit.e.kind };
    }
    return { pts, end: 'none' };
  }

  // 點在不在牆裡（關卡檢查用）
  function insideSolid(world, x, y) {
    for (const p of world.polys) {
      let inside = false; const P = p.pts;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside;
      }
      if (inside) return p;
    }
    return null;
  }

  const api = { C, build, makeBullet, advance, simulate, aimPath, insideSolid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RicoCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
