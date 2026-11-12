// 反彈神射手：物理核心＋回合規則（遊戲畫面 game.js 和關卡解題器 tools/solve.mjs 共用）
// 座標：場地固定 800×560，左上角是 (0,0)，y 往下。角度：0° 朝右，逆時針為正（畫面上往上是 90°）。
//
// 回合制：玩家打一發 → 子彈飛完 → 敵人回合（回合數 +1、會動的牆／走路怪移到下一格、到時間的射手開槍）→ 換玩家。
// 所有東西只在回合之間動，所以同一個局面、同一個角度，結果永遠一樣，解題器才能驗證每一關。
(function (root) {
  'use strict';
  const W = 800, H = 560;
  const C = {
    W, H,
    SPEED: 1000,        // 子彈速度（每秒像素）
    MAX_BOUNCE: 6,      // 玩家子彈最多反彈幾次，第 7 次撞牆子彈就碎掉
    ENEMY_BOUNCE: 3,    // 敵人子彈最多反彈幾次
    MAX_DIST: 7000,     // 子彈最多飛多遠
    BULLET_R: 5,
    ENEMY_R: 20,
    BOSS_R: 34,
    HOSTAGE_R: 18,
    BARREL_R: 17,
    BLAST_R: 115,       // 炸藥桶爆炸範圍
    MIRROR_T: 12,       // 鏡子厚度
    PLAYER_R: 22,
    PLAYER_HIT_R: 17,   // 子彈打到主角的範圍
    PORTAL_R: 24,       // 傳送門畫出來的大小
    PORTAL_IN: 14,      // 子彈碰到這個半徑就傳送
    SHIELD_LEN: 52, SHIELD_T: 9, SHIELD_D: 28,   // 盾牌：長、厚、離身體中心多遠
    HP: 3,
  };
  const EPS = 1e-7;

  // ── 關卡資料 → 世界 ──
  function build(def) {
    const polys = [];
    const add = (pts, kind, extra) => { const p = Object.assign({ pts, kind }, extra || {}); polys.push(p); return p; };
    for (const b of def.walls || []) add(boxPts(b), 'wall');
    for (const b of def.soft || []) add(boxPts(b), 'soft');
    for (const m of def.mirrors || []) add(segPts(m, C.MIRROR_T), 'mirror');
    const glass = (def.glass || []).map((b, i) => ({ i, box: b, pts: boxPts(b) }));
    const movers = (def.movers || []).map((m, i) => ({ i, box: m.box, path: m.path && m.path.length ? m.path : [[0, 0]], kind: m.soft ? 'soft' : 'wall' }));
    const edges = [];
    for (const p of polys) pushEdges(edges, p.pts, p.kind);
    const sb = def.softBorder || {};
    edges.push({ ax: 0, ay: 0, bx: W, by: 0, nx: 0, ny: 1, kind: sb.top ? 'soft' : 'wall', border: 1 });
    edges.push({ ax: 0, ay: H, bx: W, by: H, nx: 0, ny: -1, kind: sb.bottom ? 'soft' : 'wall', border: 1 });
    edges.push({ ax: 0, ay: 0, bx: 0, by: H, nx: 1, ny: 0, kind: sb.left ? 'soft' : 'wall', border: 1 });
    edges.push({ ax: W, ay: 0, bx: W, by: H, nx: -1, ny: 0, kind: sb.right ? 'soft' : 'wall', border: 1 });
    for (const g of glass) pushEdges(edges, g.pts, 'glass', { glass: g.i });
    const enemies = def.enemies.map((e, i) => {
      const o = Object.assign({}, e[2] || {});
      const type = o.type || 'grunt';
      return {
        i, type, x: e[0], y: e[1],
        path: o.path ? [[e[0], e[1]]].concat(o.path) : null,      // 走路怪：每回合走到下一格（最後一格走完回到起點）
        every: o.every || (type === 'gunner' ? 2 : type === 'boss' ? 2 : 0),   // 射手：每幾回合開一槍（0 = 不開槍）
        face: o.face == null ? null : o.face,                        // 盾牌朝哪個角度
        hp: o.hp || (type === 'boss' ? 3 : 1),
        r: type === 'boss' ? C.BOSS_R : C.ENEMY_R,
      };
    });
    const portals = (def.portals || []).map((p, i) => ({ i, a: [p[0], p[1]], b: [p[2], p[3]] }));
    const world = {
      def, polys, glass, movers, portals, staticEdges: edges, edgeCache: new Map(),
      player: { x: def.player[0], y: def.player[1] },
      enemies,
      hostages: (def.hostages || []).map((h, i) => ({ i, x: h[0], y: h[1] })),
      barrels: (def.barrels || []).map((b, i) => ({ i, x: b[0], y: b[1] })),
      period: 1,
    };
    // 會動的東西多久循環一次（解題器用）
    const lens = movers.map(m => m.path.length).concat(enemies.map(e => e.path ? e.path.length : 1)).concat(enemies.map(e => e.every || 1));
    world.period = lens.reduce((a, b) => lcm(a, b), 1);
    world.hasTurns = movers.length > 0 || enemies.some(e => e.path || e.every);
    return world;
  }
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const lcm = (a, b) => a / gcd(a, b) * b;
  function boxPts(b) { const [x, y, w, h] = b; return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
  function segPts(m, t) {
    const [x1, y1, x2, y2] = m; const dx = x2 - x1, dy = y2 - y1; const L = Math.hypot(dx, dy);
    const ox = -dy / L * t / 2, oy = dx / L * t / 2;
    return [[x1 + ox, y1 + oy], [x2 + ox, y2 + oy], [x2 - ox, y2 - oy], [x1 - ox, y1 - oy]];
  }
  function pushEdges(edges, pts, kind, extra) {
    const n = pts.length; let cx = 0, cy = 0;
    for (const q of pts) { cx += q[0] / n; cy += q[1] / n; }
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = -(b[0] - a[0]);
      const L = Math.hypot(nx, ny); nx /= L; ny /= L;
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
      edges.push(Object.assign({ ax: a[0], ay: a[1], bx: b[0], by: b[1], nx, ny, kind }, extra || {}));
    }
  }

  // ── 某一回合的位置 ──
  function enemyPos(world, e, turn) { if (!e.path) return [e.x, e.y]; const p = e.path[turn % e.path.length]; return [p[0], p[1]]; }
  function moverBox(m, turn) { const o = m.path[turn % m.path.length]; return [m.box[0] + o[0], m.box[1] + o[1], m.box[2], m.box[3]]; }
  function shieldPts(world, e, turn) {
    const [x, y] = enemyPos(world, e, turn);
    const a = e.face * Math.PI / 180, dx = Math.cos(a), dy = -Math.sin(a);
    const cx = x + dx * C.SHIELD_D, cy = y + dy * C.SHIELD_D, px = -dy * C.SHIELD_LEN / 2, py = dx * C.SHIELD_LEN / 2;
    return segPts([cx - px, cy - py, cx + px, cy + py], C.SHIELD_T);
  }
  function edgesAt(world, turn) {
    const key = turn % world.period;
    let es = world.edgeCache.get(key);
    if (es) return es;
    es = world.staticEdges.slice();
    for (const m of world.movers) pushEdges(es, boxPts(moverBox(m, turn)), m.kind, { mover: m.i });
    for (const e of world.enemies) if (e.face != null) pushEdges(es, shieldPts(world, e, turn), 'shield', { enemy: e.i });
    world.edgeCache.set(key, es);
    return es;
  }

  // ── 局面 ──
  function newState(world) {
    return { dead: new Set(), boom: new Set(), glass: new Set(), turn: 0, hp: world.def.hp || C.HP, bossHp: world.enemies.map(e => e.hp), hostage: false };
  }
  function cloneState(s) {
    return { dead: new Set(s.dead), boom: new Set(s.boom), glass: new Set(s.glass), turn: s.turn, hp: s.hp, bossHp: s.bossHp.slice(), hostage: s.hostage };
  }

  // 射線 p + t·v（0 < t ≤ maxT）最先撞到哪條邊
  function firstHit(edges, state, px, py, vx, vy, maxT) {
    let best = null, bt = maxT;
    for (const e of edges) {
      if (vx * e.nx + vy * e.ny >= 0) continue;           // 只會從外面撞進去
      if (e.glass != null && state.glass.has(e.glass)) continue;
      if (e.enemy != null && state.dead.has(e.enemy)) continue;
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
  // 射線碰到圓（半徑 r）最早的 t；起點已經在圓裡就不算
  function rayCircle(px, py, vx, vy, cx, cy, r, maxT) {
    const fx = px - cx, fy = py - cy;
    const c = fx * fx + fy * fy - r * r; if (c <= 0) return -1;
    const b = fx * vx + fy * vy; if (b > 0) return -1;
    const disc = b * b - c; if (disc < 0) return -1;
    const t = -b - Math.sqrt(disc);
    return t > 1e-6 && t <= maxT ? t : -1;
  }
  // 線段 a→b 有沒有碰到圓（回傳沿線段的比例 0..1，沒碰到回傳 -1）
  function segCircle(ax, ay, bx, by, cx, cy, r) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    let u = L2 ? ((cx - ax) * dx + (cy - ay) * dy) / L2 : 0;
    u = Math.max(0, Math.min(1, u));
    const x = ax + u * dx - cx, y = ay + u * dy - cy;
    return x * x + y * y <= r * r ? u : -1;
  }

  // ── 子彈 ──
  // owner：'player' 或敵人編號（敵人的子彈）
  function makeBullet(world, deg, from, owner) {
    const a = deg * Math.PI / 180;
    const vx = Math.cos(a), vy = -Math.sin(a);
    const o = from || [world.player.x, world.player.y];
    return {
      x: o[0], y: o[1], vx, vy, bounces: 0, dist: 0, dead: false, path: [[o[0], o[1]]],
      owner: owner == null ? 'player' : owner, maxB: owner == null || owner === 'player' ? C.MAX_BOUNCE : C.ENEMY_BOUNCE,
      inside: new Set(), portalSkip: -1,
    };
  }

  // 走到下一個事件（撞牆或進傳送門）或走滿 dist。回傳實際走了多遠
  function step(world, b, dist, state, ev) {
    const edges = edgesAt(world, state.turn);
    const step0 = Math.min(dist, C.MAX_DIST - b.dist);
    const hit = firstHit(edges, state, b.x, b.y, b.vx, b.vy, step0);
    let t = hit ? hit.t : step0, portal = null;
    // 傳送門
    if (b.portalSkip >= 0) {        // 剛從這個門出來，離開它的範圍之前不再觸發
      const pt = portalPt(world, b.portalSkip);
      if (Math.hypot(b.x - pt[0], b.y - pt[1]) > C.PORTAL_IN + 0.5) b.portalSkip = -1;
    }
    for (let k = 0; k < world.portals.length * 2; k++) {
      if (k === b.portalSkip) continue;
      const pt = portalPt(world, k);
      const tp = rayCircle(b.x, b.y, b.vx, b.vy, pt[0], pt[1], C.PORTAL_IN, t);
      if (tp >= 0 && tp < t) { t = tp; portal = k; }
    }
    const nx = b.x + b.vx * t, ny = b.y + b.vy * t;
    touch(world, b, b.x, b.y, nx, ny, state, ev);
    if (b.dead) return t;
    b.x = nx; b.y = ny; b.dist += t;
    if (portal != null) {
      const from = portalPt(world, portal), to = portalPt(world, portal ^ 1);
      b.path.push([nx, ny]);
      b.x = to[0] + (nx - from[0]); b.y = to[1] + (ny - from[1]);
      b.portalSkip = portal ^ 1;
      b.path.push(null, [b.x, b.y]);        // null = 路線在這裡斷開（傳送）
      ev('portal', { from: portal, to: portal ^ 1, x: b.x, y: b.y });
      return t;
    }
    if (hit && t === hit.t) {
      b.path.push([nx, ny]);
      const k = hit.e.kind;
      if (k === 'glass') {          // 玻璃：打破，子彈直直穿過去
        state.glass.add(hit.e.glass);
        ev('glass', { i: hit.e.glass, x: nx, y: ny });
        b.x += b.vx * 0.05; b.y += b.vy * 0.05;
        return t;
      }
      if (k === 'soft' || b.bounces >= b.maxB) { b.dead = true; ev('stop', { x: nx, y: ny, soft: k === 'soft' }); return t; }
      const d = b.vx * hit.e.nx + b.vy * hit.e.ny;     // 反射：v' = v − 2(v·n)n
      b.vx -= 2 * d * hit.e.nx; b.vy -= 2 * d * hit.e.ny;
      const L = Math.hypot(b.vx, b.vy); b.vx /= L; b.vy /= L;
      b.bounces++;
      ev('bounce', { x: nx, y: ny, kind: k });
    } else if (b.dist >= C.MAX_DIST - 1e-6) { b.path.push([nx, ny]); b.dead = true; ev('stop', { x: nx, y: ny }); }
    return t;
  }
  function portalPt(world, k) { const p = world.portals[k >> 1]; return k & 1 ? p.b : p.a; }

  function advance(world, b, dist, state, ev) {
    ev = ev || noop;
    let guard = 0;
    while (dist > 1e-6 && !b.dead && guard++ < 80) dist -= step(world, b, dist, state, ev);
    if (guard >= 80 && !b.dead) { b.dead = true; ev('stop', { x: b.x, y: b.y }); }
  }
  function noop() {}

  // 這一小段路上碰到的東西（敵人、炸藥桶、人質、主角）
  function touch(world, b, ax, ay, bx, by, state, ev) {
    const hits = [];
    const mine = b.owner === 'player';
    for (const e of world.enemies) {
      if (state.dead.has(e.i)) continue;
      if (!mine && e.i === b.owner && b.bounces === 0) continue;     // 自己剛射出去的子彈不會打到自己
      const [x, y] = enemyPos(world, e, state.turn);
      const r = e.r + C.BULLET_R - 1;
      const u = segCircle(ax, ay, bx, by, x, y, r);
      const endIn = Math.hypot(bx - x, by - y) <= r;
      if (u >= 0 && !b.inside.has(e.i)) hits.push({ u, t: 'e', o: e, x, y });
      if (endIn) b.inside.add(e.i); else b.inside.delete(e.i);
    }
    for (const r of world.barrels) {
      if (state.boom.has(r.i)) continue;
      const u = segCircle(ax, ay, bx, by, r.x, r.y, C.BARREL_R + C.BULLET_R - 1);
      if (u >= 0) hits.push({ u, t: 'b', o: r });
    }
    for (const h of world.hostages) {
      const u = segCircle(ax, ay, bx, by, h.x, h.y, C.HOSTAGE_R + C.BULLET_R - 1);
      if (u >= 0) hits.push({ u, t: 'h', o: h });
    }
    if (!mine || b.bounces > 0) {
      const u = segCircle(ax, ay, bx, by, world.player.x, world.player.y, C.PLAYER_HIT_R + C.BULLET_R - 1);
      if (u >= 0) hits.push({ u, t: 'p' });
    }
    hits.sort((p, q) => p.u - q.u);
    for (const h of hits) {
      if (h.t === 'e') {
        damage(world, h.o, state, ev, 'bullet', b);
        if (mine && allDead(world, state)) { b.dead = true; ev('stop', { x: h.x, y: h.y, fizzle: 1 }); return; }   // 最後一隻倒下，子彈就消失（不會再彈回來打到自己）
      }
      else if (h.t === 'b') explode(world, h.o, state, ev);
      else if (h.t === 'h') {
        state.hostage = true; b.dead = true;
        ev('hostage', h.o); ev('stop', { x: ax + (bx - ax) * h.u, y: ay + (by - ay) * h.u });
        return;
      } else if (h.t === 'p') {
        state.hp = Math.max(0, state.hp - 1); b.dead = true;
        ev('ouch', { x: world.player.x, y: world.player.y, by: b.owner }); ev('stop', { x: ax + (bx - ax) * h.u, y: ay + (by - ay) * h.u });
        return;
      }
    }
  }
  function damage(world, e, state, ev, how, b) {
    if (state.dead.has(e.i)) return;
    state.bossHp[e.i]--;
    const [x, y] = enemyPos(world, e, state.turn);
    if (state.bossHp[e.i] <= 0) { state.dead.add(e.i); ev('hit', { i: e.i, x, y, how, vx: b ? b.vx : 0, vy: b ? b.vy : 0 }); }
    else ev('hurt', { i: e.i, x, y, hp: state.bossHp[e.i] });
  }
  function explode(world, r, state, ev) {
    if (state.boom.has(r.i)) return;
    state.boom.add(r.i);
    ev('barrel', r);
    for (const e of world.enemies) {
      if (state.dead.has(e.i)) continue;
      const [x, y] = enemyPos(world, e, state.turn);
      if (Math.hypot(x - r.x, y - r.y) <= C.BLAST_R + e.r * 0.5) damage(world, e, state, ev, 'boom', null);
    }
    for (const h of world.hostages) if (Math.hypot(h.x - r.x, h.y - r.y) <= C.BLAST_R + C.HOSTAGE_R * 0.5) { state.hostage = true; ev('hostage', h); }
    if (Math.hypot(world.player.x - r.x, world.player.y - r.y) <= C.BLAST_R + C.PLAYER_HIT_R * 0.5) { state.hp = Math.max(0, state.hp - 1); ev('ouch', { x: world.player.x, y: world.player.y, by: 'boom' }); }
    for (const g of world.glass) if (!state.glass.has(g.i) && boxNear(g.box, r.x, r.y, C.BLAST_R)) { state.glass.add(g.i); ev('glass', { i: g.i, x: g.box[0] + g.box[2] / 2, y: g.box[1] + g.box[3] / 2 }); }
    for (const o of world.barrels) {
      if (!state.boom.has(o.i) && Math.hypot(o.x - r.x, o.y - r.y) <= C.BLAST_R + C.BARREL_R * 0.5) explode(world, o, state, ev);
    }
  }
  function boxNear(b, x, y, r) { const cx = Math.max(b[0], Math.min(x, b[0] + b[2])), cy = Math.max(b[1], Math.min(y, b[1] + b[3])); return Math.hypot(cx - x, cy - y) <= r; }

  // ── 回合 ──
  const allDead = (world, state) => state.dead.size >= world.enemies.length;
  // 敵人回合開始：回合數 +1，回傳這回合要開槍的敵人（照順序；開槍前要再確認牠還活著）
  function enemyTurn(world, state) {
    state.turn++;
    return world.enemies.filter(e => e.every && !state.dead.has(e.i) && state.turn % e.every === 0).map(e => e.i);
  }
  // 敵人瞄準主角的角度
  function enemyAim(world, state, i) {
    const e = world.enemies[i]; const [x, y] = enemyPos(world, e, state.turn);
    return Math.atan2(-(world.player.y - y), world.player.x - x) * 180 / Math.PI;
  }
  // 再過幾回合會開槍（0 = 不會）
  function turnsUntilFire(world, state, i) {
    const e = world.enemies[i]; if (!e.every) return 0;
    return e.every - (state.turn % e.every);
  }

  // 一次飛完（解題器、測試用）
  function simulate(world, deg, state, from, owner) {
    state = state || newState(world);
    const b = makeBullet(world, deg, from, owner);
    const events = [];
    advance(world, b, C.MAX_DIST, state, (t, d) => events.push([t, d]));
    return { bullet: b, state, events };
  }
  // 完整一回合：玩家開槍 → 子彈飛完 → 判定 → 敵人回合。回傳 'win' | 'lose' | 'next'
  function playTurn(world, state, deg, shotsLeft) {
    simulate(world, deg, state);
    const r = judge(world, state, shotsLeft);
    if (r !== 'next') return r;
    for (const i of enemyTurn(world, state)) {
      if (state.dead.has(i)) continue;
      const e = world.enemies[i];
      simulate(world, enemyAim(world, state, i), state, enemyPos(world, e, state.turn), i);
      if (state.hp <= 0 || state.hostage) return 'lose';
    }
    return allDead(world, state) ? 'win' : 'next';
  }
  function judge(world, state, shotsLeft) {
    if (state.hostage || state.hp <= 0) return 'lose';
    if (allDead(world, state)) return 'win';
    if (shotsLeft <= 0) return 'lose';
    return 'next';
  }


  // ── 解題（解題器和遊戲裡的「提示」共用）──
  // 在每個局面每 step 度試射一發，連續同一個結果的角度合成一個「角度窗」，窗至少 minWin 度才算玩家調得出來。
  // 廣度優先：回傳最少幾發過關、每一發的角度（窗的中間）
  const maskOf = set => { let m = 0; for (const i of set) m |= 1 << i; return m; };
  const sigOf = (w, s) => [maskOf(s.dead), maskOf(s.boom), maskOf(s.glass), s.hp, s.bossHp.join('.'), s.turn % w.period].join('|');
  function outcomes(w, st, shotsLeft, step, minWin) {
    const N = Math.round(360 / step);
    const runs = []; let cur = null;
    for (let k = 0; k <= N; k++) {
      let key = null, res = null, ns = null;
      if (k < N) { ns = cloneState(st); res = playTurn(w, ns, k * step, shotsLeft - 1); key = res + '#' + sigOf(w, ns); }
      if (cur && key === cur.key) { cur.n++; continue; }
      if (cur) runs.push(cur);
      cur = k < N ? { key, res, ns, from: k * step, n: 1 } : null;
    }
    if (runs.length > 1 && runs[0].key === runs[runs.length - 1].key) { const last = runs.pop(); runs[0].n += last.n; runs[0].from = last.from; }
    const best = new Map();
    for (const r of runs) {
      r.width = r.n * step;
      if (r.width < minWin - 1e-9) continue;
      const b = best.get(r.key);
      if (!b || r.width > b.width) best.set(r.key, r);
    }
    return [...best.values()];
  }
  function solve(w, s0, shots, opt) {
    opt = opt || {};
    const step = opt.step || 0.1, minWin = opt.minWin || 0.6, maxStates = opt.maxStates || 1500;
    const sig0 = sigOf(w, s0);
    const seen = new Map([[sig0, { parent: null, o: null }]]);
    let frontier = [{ st: s0, sig: sig0 }], found = null, expanded = 0, capped = false, oneShot = 0;
    for (let depth = 0; depth < shots && !found && frontier.length && !capped; depth++) {
      const next = [];
      for (const node of frontier) {
        if (++expanded > maxStates) { capped = true; break; }
        for (const o of outcomes(w, node.st, shots - depth, step, minWin)) {
          if (o.res === 'win') {
            if (depth === 0) oneShot = Math.max(oneShot, o.width);
            if (!found || o.width > found.o.width) found = { o, parent: node.sig, depth: depth + 1 };
            continue;
          }
          if (o.res !== 'next') continue;
          const sig = sigOf(w, o.ns);
          if (sig === node.sig && !w.hasTurns) continue;
          if (seen.has(sig)) continue;
          seen.set(sig, { parent: node.sig, o });
          next.push({ st: o.ns, sig });
        }
      }
      frontier = next;
    }
    const plan = [];
    if (found) { plan.unshift(found.o); let sg = found.parent; while (sg && seen.get(sg).o) { plan.unshift(seen.get(sg).o); sg = seen.get(sg).parent; } }
    return {
      min: found ? found.depth : Infinity, capped: capped && !found, states: seen.size, oneShot,
      plan: plan.map(o => ({ at: +(((o.from + o.width / 2) % 360)).toFixed(2), width: +o.width.toFixed(2), from: o.from })),
    };
  }

  // 瞄準線：走到第 n 次反彈之後再多走 tail 像素（傳送門會跟著穿過去）
  function aimPath(world, deg, bouncesShown, tail, state, from, owner) {
    const st = cloneState(state || newState(world));
    const b = makeBullet(world, deg, from, owner);
    const segs = [[[b.x, b.y]]];
    let guard = 0;
    while (!b.dead && guard++ < 30) {
      const before = b.bounces;
      if (before >= bouncesShown) {
        const sx = b.x, sy = b.y;
        advance(world, b, tail, st, null);
        segs[segs.length - 1].push([b.x, b.y]);
        if (Math.hypot(b.x - sx, b.y - sy) < 1) break;
        break;
      }
      let portal = false;
      step(world, b, 3000, st, t => { if (t === 'portal') portal = true; });
      if (portal) { const last = b.path[b.path.length - 3]; segs[segs.length - 1].push(last); segs.push([[b.x, b.y]]); }
      else segs[segs.length - 1].push([b.x, b.y]);
    }
    return { segs };
  }

  // 點在不在牆裡（關卡檢查用）
  function insideSolid(world, x, y) {
    const polys = world.polys.concat(world.glass.map(g => ({ pts: g.pts, kind: 'glass' }))).concat(world.movers.map(m => ({ pts: boxPts(moverBox(m, 0)), kind: 'mover' })));
    for (const p of polys) {
      let inside = false; const P = p.pts;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside;
      }
      if (inside) return p;
    }
    return null;
  }

  const api = { C, build, newState, cloneState, makeBullet, advance, simulate, aimPath, insideSolid, enemyTurn, enemyAim, enemyPos, moverBox, shieldPts, turnsUntilFire, playTurn, judge, allDead, edgesAt, solve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RicoCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
