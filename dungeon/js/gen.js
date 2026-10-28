'use strict';
// 深淵地牢：樓層產生（房間＋走廊、洞窟、岩漿、混合、頭目競技場）
const Gen = {
  make(depth, rng, opts = {}) {
    const bi = opts.biome != null ? opts.biome : biomeOf(depth), kind = opts.kind || (opts.rush ? (depth >= DEEP_LAST ? 'abyss' : 'arena') : BIOMES[bi].gen);
    let F = null;
    for (let tries = 0; tries < 30 && !F; tries++) {
      try {
        if (kind === 'arena') F = this.arena(rng, bi === 2 || bi === 4 ? T.LAVA : T.WATER);
        else if (kind === 'abyss') F = this.abyss(rng);
        else if (kind === 'caves') F = this.caves(rng, depth);
        else if (kind === 'flooded') F = this.flooded(rng, depth);
        else if (kind === 'islands') F = this.islands(rng, depth);
        else F = this.rooms(rng, depth, kind);
      } catch (e) { F = null; if (tries > 25) throw e; }
      if (F && !this.finish(F, rng, depth, opts)) F = null;
    }
    F.biome = bi; F.depth = depth;
    return F;
  },
  blank(w, h) { return { w, h, t: new Uint8Array(w * h), deco: new Uint8Array(w * h), rooms: [], vaults: [], torches: [], start: null, stairs: null }; },
  idx(F, x, y) { return y * F.w + x; },
  get(F, x, y) { return x < 0 || y < 0 || x >= F.w || y >= F.h ? T.WALL : F.t[y * F.w + x]; },
  set(F, x, y, v) { if (x > 0 && y > 0 && x < F.w - 1 && y < F.h - 1) F.t[y * F.w + x] = v; },
  isFloorish(v) { return v === T.FLOOR || v === T.GRASS || v === T.WATER || v === T.RUBBLE || v === T.ICE || v === T.CARPET || v === T.ASH || v === T.BRIDGE; },

  // ---------- 房間＋走廊 ----------
  rooms(rng, depth, kind) {
    const W = 58, H = 38, F = this.blank(W, H);
    const rooms = [];
    for (let i = 0; i < 260 && rooms.length < 13; i++) {
      const big = rng.chance(0.15);
      const w = big ? rng.int(9, 14) : rng.int(4, 9), h = big ? rng.int(6, 9) : rng.int(3, 6);
      const x = rng.int(2, W - w - 2), y = rng.int(2, H - h - 2);
      if (rooms.some(r => x - 2 < r.x + r.w && x + w + 2 > r.x && y - 2 < r.y + r.h && y + h + 2 > r.y)) continue;
      rooms.push({ x, y, w, h, kind: 'room', shape: big ? rng.pick(['rect', 'pillars', 'oval']) : rng.pick(['rect', 'rect', 'rect', 'oval', 'cross']) });
    }
    if (rooms.length < 6) return null;
    // 秘密寶庫：找一間小房間當寶庫
    let vault = null;
    if (depth >= 2 && rng.chance(0.65)) {
      const cand = rooms.filter(r => r.w <= 7 && r.h <= 5 && r.shape !== 'pillars');
      if (cand.length) { vault = rng.pick(cand); vault.kind = 'vault'; vault.shape = 'rect'; }
    }
    for (const r of rooms) this.carveRoom(F, r, rng);
    const norm = rooms.filter(r => r !== vault);
    const cen = r => [r.x + (r.w >> 1), r.y + (r.h >> 1)];
    // Prim 最小生成樹
    const inT = [norm[0]], out = norm.slice(1), edges = [];
    while (out.length) {
      let best = null, bd = 1e9;
      for (const a of inT) for (const b of out) { const [ax, ay] = cen(a), [bx, by] = cen(b), d = Math.abs(ax - bx) + Math.abs(ay - by); if (d < bd) { bd = d; best = [a, b]; } }
      edges.push(best); inT.push(best[1]); out.splice(out.indexOf(best[1]), 1);
    }
    const loops = [];
    for (let i = 0; i < 3; i++) { const a = rng.pick(norm), b = rng.pick(norm); if (a !== b) loops.push([a, b]); }
    for (const [a, b] of edges.concat(loops)) this.corridor(F, cen(a), cen(b), rng);
    // 門
    for (const r of norm) this.placeDoors(F, r, rng);
    // 寶庫：只有一條走廊，入口是秘門
    if (vault) {
      const ring = this.ring(vault);
      if (ring.some(([x, y]) => this.get(F, x, y) !== T.WALL)) vault.kind = 'room';
      else {
        let best = null, bd = 1e9;
        for (const r of norm) { const d = Math.abs(cen(r)[0] - cen(vault)[0]) + Math.abs(cen(r)[1] - cen(vault)[1]); if (d < bd) { bd = d; best = r; } }
        this.corridor(F, cen(vault), cen(best), rng);
        let n = 0;
        for (const [x, y] of ring) if (this.get(F, x, y) !== T.WALL) { this.set(F, x, y, T.SECRET); n++; }
        if (!n) vault.kind = 'room';
        else F.vaults.push(vault);
      }
    }
    F.rooms = rooms;
    const start = rng.pick(norm.filter(r => r.shape !== 'pillars'));
    start.start = 1;
    F.start = this.freeIn(F, start, rng);
    // 生態區特色
    if (kind === 'lava') this.addLava(F, rng, rooms);
    if (kind === 'mixed') this.addCrystal(F, rng, rooms);
    this.addPools(F, rng, rooms, kind);
    // 其他秘門：迴圈走廊的門有機會變成秘門
    return F;
  },
  ring(r) {
    const out = [];
    for (let x = r.x - 1; x <= r.x + r.w; x++) { out.push([x, r.y - 1]); out.push([x, r.y + r.h]); }
    for (let y = r.y; y < r.y + r.h; y++) { out.push([r.x - 1, y]); out.push([r.x + r.w, y]); }
    return out;
  },
  carveRoom(F, r, rng) {
    const cx = r.x + (r.w - 1) / 2, cy = r.y + (r.h - 1) / 2;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      let ok = true;
      if (r.shape === 'oval') { const dx = (x - cx) / (r.w / 2 + 0.3), dy = (y - cy) / (r.h / 2 + 0.3); ok = dx * dx + dy * dy <= 1.05; }
      if (r.shape === 'cross') { const ix = Math.abs(x - cx) <= Math.max(1, r.w / 5), iy = Math.abs(y - cy) <= Math.max(1, r.h / 5); ok = ix || iy || (r.w < 6 || r.h < 5); }
      if (ok) this.set(F, x, y, T.FLOOR);
    }
    if (r.shape === 'pillars') {
      for (let y = r.y + 1; y < r.y + r.h - 1; y += 2) for (let x = r.x + 1; x < r.x + r.w - 1; x += 3)
        if (y > r.y && y < r.y + r.h - 1 && (x === r.x + 1 || x >= r.x + r.w - 3 || y === r.y + 1 || y >= r.y + r.h - 2)) this.set(F, x, y, T.PILLAR);
    }
  },
  corridor(F, [x0, y0], [x1, y1], rng) {
    let x = x0, y = y0;
    const horizFirst = rng.chance(0.5);
    const step = (tx, ty) => {
      while (x !== tx || y !== ty) {
        if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y);
        const v = this.get(F, x, y);
        if (v === T.WALL) { this.set(F, x, y, T.FLOOR); F.deco[this.idx(F, x, y)] = 0; F.corr = F.corr || new Uint8Array(F.w * F.h); F.corr[this.idx(F, x, y)] = 1; }
        else if (v === T.PILLAR) this.set(F, x, y, T.FLOOR);
      }
    };
    if (horizFirst) { step(x1, y0); step(x1, y1); } else { step(x0, y1); step(x1, y1); }
  },
  placeDoors(F, r, rng) {
    for (const [x, y] of this.ring(r)) {
      if (this.get(F, x, y) !== T.FLOOR) continue;
      const h = this.get(F, x - 1, y) === T.WALL && this.get(F, x + 1, y) === T.WALL;
      const v = this.get(F, x, y - 1) === T.WALL && this.get(F, x, y + 1) === T.WALL;
      if ((h || v) && rng.chance(0.7)) this.set(F, x, y, T.DOOR);
    }
  },
  freeIn(F, r, rng) {
    for (let i = 0; i < 80; i++) { const x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1); if (this.get(F, x, y) === T.FLOOR) return [x, y]; }
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (this.get(F, x, y) === T.FLOOR) return [x, y];
    return [r.x, r.y];
  },
  blob(rng, cx, cy, n) { // 隨機團塊
    const pts = new Set(), arr = [[cx, cy]]; pts.add(cx + ',' + cy);
    while (pts.size < n && arr.length) {
      const [x, y] = rng.pick(arr), [dx, dy] = rng.pick(DIRS4), k = (x + dx) + ',' + (y + dy);
      if (!pts.has(k)) { pts.add(k); arr.push([x + dx, y + dy]); }
    }
    return arr;
  },
  addPools(F, rng, rooms, kind) {
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      const r = rng.pick(rooms); if (r.kind === 'vault') continue;
      const [cx, cy] = this.freeIn(F, r, rng);
      const tile = kind === 'lava' ? T.FLOOR : rng.chance(kind === 'mixed' ? 0.3 : 0.5) ? T.WATER : T.GRASS;
      if (tile === T.FLOOR) continue;
      for (const [x, y] of this.blob(rng, cx, cy, rng.int(5, 16))) if (this.get(F, x, y) === T.FLOOR) this.set(F, x, y, tile);
    }
    // 長廊雜草
    if (kind === 'rooms') for (let i = 0; i < 3; i++) {
      const x = rng.int(1, F.w - 2), y = rng.int(1, F.h - 2);
      for (const [px, py] of this.blob(rng, x, y, rng.int(4, 12))) if (this.get(F, px, py) === T.FLOOR) this.set(F, px, py, T.GRASS);
    }
  },
  addLava(F, rng, rooms) {
    const big = rooms.filter(r => r.kind === 'room' && !r.start && r.w >= 6 && r.h >= 5);
    rng.shuffle(big);
    for (const r of big.slice(0, 3)) {
      if (rng.chance(0.5)) { // 中央岩漿池
        for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (this.get(F, x, y) === T.FLOOR && rng.chance(0.85)) this.set(F, x, y, T.LAVA);
      } else {
        const [cx, cy] = this.freeIn(F, r, rng);
        for (const [x, y] of this.blob(rng, cx, cy, rng.int(8, 20))) if (this.get(F, x, y) === T.FLOOR) this.set(F, x, y, T.LAVA);
      }
    }
    // 岩漿河
    if (rng.chance(0.7)) {
      let x = rng.int(4, F.w - 5), y = 1, dx = 0;
      while (y < F.h - 1) {
        for (let k = -1; k <= 0; k++) { const v = this.get(F, x + k, y); if (v === T.FLOOR || v === T.WALL) this.set(F, x + k, y, v === T.FLOOR ? T.LAVA : T.WALL); }
        if (this.get(F, x, y) === T.WALL && rng.chance(0.25)) { /* 穿過牆 */ }
        y++; if (rng.chance(0.4)) dx = rng.int(-1, 1); x = clamp(x + dx, 3, F.w - 4);
      }
    }
  },
  addCrystal(F, rng, rooms) {
    for (const r of rooms) {
      if (r.kind === 'vault' || r.start) continue;
      if (rng.chance(0.35)) for (let i = 0; i < r.w * r.h / 9; i++) {
        const x = rng.int(r.x + 1, r.x + r.w - 2), y = rng.int(r.y + 1, r.y + r.h - 2);
        if (this.get(F, x, y) === T.FLOOR) this.set(F, x, y, T.CRYSTAL);
      } else if (rng.chance(0.4)) {
        const [cx, cy] = this.freeIn(F, r, rng);
        for (const [x, y] of this.blob(rng, cx, cy, rng.int(6, 18))) if (this.get(F, x, y) === T.FLOOR) this.set(F, x, y, T.ICE);
      }
    }
    // 部分房間改成洞窟形狀的冰窟
    for (let i = 0; i < 2; i++) {
      const x = rng.int(5, F.w - 6), y = rng.int(5, F.h - 6);
      for (const [px, py] of this.blob(rng, x, y, rng.int(20, 45))) if (this.get(F, px, py) === T.WALL && px > 1 && py > 1 && px < F.w - 2 && py < F.h - 2) this.set(F, px, py, T.FLOOR);
    }
  },

  // ---------- 洞窟 ----------
  caves(rng, depth) {
    const W = 56, H = 38;
    for (let attempt = 0; attempt < 12; attempt++) {
      const F = this.blank(W, H);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) F.t[y * W + x] = rng.chance(0.45) ? T.WALL : T.FLOOR;
      const cnt = (x, y) => { let n = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ((i || j) && this.get(F, x + i, y + j) === T.WALL) n++; return n; };
      for (let it = 0; it < 6; it++) {
        const nt = F.t.slice();
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const n = cnt(x, y); nt[y * W + x] = n >= 5 || (it < 2 && n <= 1) ? T.WALL : T.FLOOR; }
        F.t = nt;
      }
      // 只保留最大區域
      const reg = this.regions(F, v => v === T.FLOOR);
      if (!reg.length) continue;
      reg.sort((a, b) => b.length - a.length);
      if (reg[0].length < W * H * 0.32) continue;
      for (let i = 1; i < reg.length; i++) for (const k of reg[i]) F.t[k] = T.WALL;
      // 幾個人工房間（之後挑商店或特殊房間）
      const rooms = [];
      for (let i = 0; i < 120 && rooms.length < 4; i++) {
        const w = rng.int(5, 8), h = rng.int(4, 6), x = rng.int(2, W - w - 2), y = rng.int(2, H - h - 2);
        let wall = 0; for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) if (this.get(F, xx, yy) === T.WALL) wall++;
        if (wall < (w + 2) * (h + 2) * 0.85) continue;
        if (rooms.some(r => x - 2 < r.x + r.w && x + w + 2 > r.x && y - 2 < r.y + r.h && y + h + 2 > r.y)) continue;
        rooms.push({ x, y, w, h, kind: 'room', shape: 'rect' });
      }
      for (const r of rooms) {
        this.carveRoom(F, r, rng);
        // 隧道連到最近的洞穴
        const c = [r.x + (r.w >> 1), r.y + (r.h >> 1)];
        const tgt = this.nearestMatch(F, c, (x, y) => this.get(F, x, y) === T.FLOOR && !(x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h));
        if (tgt) this.corridor(F, c, tgt, rng);
      }
      // 寶庫（秘門）
      if (depth >= 2 && rooms.length && rng.chance(0.6)) {
        const v = rooms[rooms.length - 1], ring = this.ring(v);
        const open = ring.filter(([x, y]) => this.get(F, x, y) !== T.WALL);
        if (open.length && open.length <= 2) { for (const [x, y] of open) this.set(F, x, y, T.SECRET); v.kind = 'vault'; F.vaults.push(v); }
      }
      for (const r of rooms) if (r.kind === 'room') this.placeDoors(F, r, rng);
      // 水與苔
      for (let i = 0; i < 4; i++) {
        const p = this.randFloor(F, rng);
        const tile = rng.chance(0.5) ? T.WATER : T.GRASS;
        for (const [x, y] of this.blob(rng, p[0], p[1], rng.int(6, 22))) if (this.get(F, x, y) === T.FLOOR) this.set(F, x, y, tile);
      }
      F.rooms = rooms;
      F.start = this.randFloor(F, rng);
      return F;
    }
    return null;
  },
  regions(F, pass) {
    const seen = new Uint8Array(F.w * F.h), out = [];
    for (let i = 0; i < F.t.length; i++) {
      if (seen[i] || !pass(F.t[i])) continue;
      const q = [i], reg = []; seen[i] = 1;
      while (q.length) {
        const k = q.pop(); reg.push(k);
        const x = k % F.w, y = (k / F.w) | 0;
        for (const [dx, dy] of DIRS4) { const nx = x + dx, ny = y + dy, nk = ny * F.w + nx; if (nx >= 0 && ny >= 0 && nx < F.w && ny < F.h && !seen[nk] && pass(F.t[nk])) { seen[nk] = 1; q.push(nk); } }
      }
      out.push(reg);
    }
    return out;
  },
  nearestMatch(F, [sx, sy], fn) {
    for (let r = 1; r < 60; r++) for (let y = sy - r; y <= sy + r; y++) for (let x = sx - r; x <= sx + r; x++) {
      if (Math.max(Math.abs(x - sx), Math.abs(y - sy)) !== r) continue;
      if (x > 0 && y > 0 && x < F.w - 1 && y < F.h - 1 && fn(x, y)) return [x, y];
    }
    return null;
  },
  randFloor(F, rng) {
    for (let i = 0; i < 4000; i++) { const x = rng.int(1, F.w - 2), y = rng.int(1, F.h - 2); if (F.t[y * F.w + x] === T.FLOOR) return [x, y]; }
    for (let i = 0; i < F.t.length; i++) if (F.t[i] === T.FLOOR) return [i % F.w, (i / F.w) | 0];
    return [1, 1];
  },

  // ---------- 頭目競技場 ----------
  arena(rng, liquid = T.LAVA) {
    const W = 36, H = 30, F = this.blank(W, H);
    const hall = { x: 5, y: 4, w: 26, h: 20, kind: 'room', shape: 'rect' };
    for (let y = hall.y; y < hall.y + hall.h; y++) for (let x = hall.x; x < hall.x + hall.w; x++) this.set(F, x, y, T.FLOOR);
    for (let y = hall.y + 3; y < hall.y + hall.h - 3; y += 4) { this.set(F, hall.x + 4, y, T.PILLAR); this.set(F, hall.x + hall.w - 5, y, T.PILLAR); this.set(F, hall.x + 9, y + 1, T.PILLAR); this.set(F, hall.x + hall.w - 10, y + 1, T.PILLAR); }
    // 岩漿溝
    for (let x = hall.x + 2; x < hall.x + hall.w - 2; x++) if (x < 15 || x > 20) { this.set(F, x, hall.y + 7, liquid); }
    // 入口走廊
    for (let y = hall.y + hall.h; y < H - 2; y++) { this.set(F, 17, y, T.FLOOR); this.set(F, 18, y, T.FLOOR); }
    const ent = { x: 14, y: H - 5, w: 8, h: 3, kind: 'room', shape: 'rect', start: 1 };
    this.carveRoom(F, ent, rng);
    F.rooms = [ent, hall];
    F.start = [17, H - 4];
    F.bossAt = [17, hall.y + 2];
    F.arena = 1;
    return F;
  },

  // ---------- 收尾：連通、樓梯、裝飾 ----------
  finish(F, rng, depth, opts) {
    if (!F || !F.start) return false;
    const pass = v => TP[v].walk && v !== T.LAVA;
    // 修正連通：無法到達的區域用最便宜的路線打通（岩漿變橋、牆壁變碎石）
    for (let k = 0; k < 20; k++) {
      const dist = this.bfs(F, F.start, pass);
      let un = -1;
      for (let i = 0; i < F.t.length; i++) if (pass(F.t[i]) && dist[i] < 0 && !this.inVault(F, i)) { un = i; break; }
      if (un < 0) break;
      this.dig(F, F.start, [un % F.w, (un / F.w) | 0]);
    }
    const dist = this.bfs(F, F.start, pass);
    let reach = 0, total = 0;
    for (let i = 0; i < F.t.length; i++) if (pass(F.t[i]) && !this.inVault(F, i)) { total++; if (dist[i] >= 0) reach++; }
    if (reach < total || reach < 60) return false;
    // 樓梯：離起點最遠的地板
    if (!F.arena) {
      let best = -1, bd = -1;
      for (let i = 0; i < F.t.length; i++) if (F.t[i] === T.FLOOR && dist[i] > bd && !this.inVault(F, i)) { bd = dist[i]; best = i; }
      if (bd < 12) return false;
      F.stairs = [best % F.w, (best / F.w) | 0];
      F.t[best] = T.STAIRS;
      F.stairDist = bd;
    }
    // 秘門：一些走廊上的門改成秘門（不能切斷連通）
    if (!F.arena && depth >= 2) {
      const doors = []; for (let i = 0; i < F.t.length; i++) if (F.t[i] === T.DOOR) doors.push(i);
      rng.shuffle(doors);
      let made = 0;
      for (const d of doors) {
        if (made >= 2 || !rng.chance(0.35)) continue;
        F.t[d] = T.SECRET;
        const nd = this.bfs(F, F.start, pass);
        let ok = nd[F.stairs[1] * F.w + F.stairs[0]] >= 0;
        if (ok) for (let i = 0; i < F.t.length; i++) if (pass(F.t[i]) && !this.inVault(F, i) && nd[i] < 0) { ok = false; break; }
        if (ok) made++; else F.t[d] = T.DOOR;
      }
    }
    // 泉水
    if (!F.arena && rng.chance(0.3)) {
      const cand = F.rooms.filter(r => r.kind === 'room' && !r.start && r.w >= 5 && r.h >= 5);
      if (cand.length) { const r = rng.pick(cand), x = r.x + (r.w >> 1), y = r.y + (r.h >> 1); if (F.t[y * F.w + x] === T.FLOOR && this.safeBlock(F, x, y, pass)) F.t[y * F.w + x] = T.FOUNTAIN; }
    }
    // 牆上的火把
    for (let y = 1; y < F.h - 1; y++) for (let x = 1; x < F.w - 1; x++) {
      if (F.t[y * F.w + x] === T.WALL && TP[F.t[(y + 1) * F.w + x]].walk && hash2(x, y, depth * 31) < 0.045) F.torches.push([x, y]);
    }
    // 地板裝飾
    const dch = BIOMES[biomeOf(depth)].gen === 'caves' ? 0.16 : 0.09;
    for (let i = 0; i < F.t.length; i++) if (F.t[i] === T.FLOOR && rng.chance(dch)) F.deco[i] = rng.int(1, 3);
    return true;
  },
  safeBlock(F, x, y, pass) { // 把 (x,y) 堵住後，周圍八格仍互相連通
    const old = F.t[y * F.w + x]; F.t[y * F.w + x] = T.PILLAR;
    const d = this.bfs(F, F.start, pass); let ok = true;
    for (const [dx, dy] of DIRS8) { const k = (y + dy) * F.w + x + dx; if (pass(F.t[k]) && d[k] < 0) ok = false; }
    if (F.stairs && d[F.stairs[1] * F.w + F.stairs[0]] < 0) ok = false;
    F.t[y * F.w + x] = old; return ok;
  },
  inVault(F, i) { const x = i % F.w, y = (i / F.w) | 0; return F.vaults.some(v => x >= v.x && x < v.x + v.w && y >= v.y && y < v.y + v.h); },
  bfs(F, [sx, sy], pass) {
    const d = new Int16Array(F.w * F.h).fill(-1), q = [sy * F.w + sx]; d[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const k = q[h], x = k % F.w, y = (k / F.w) | 0;
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= F.w || ny >= F.h) continue;
        const nk = ny * F.w + nx; if (d[nk] >= 0 || !pass(F.t[nk])) continue;
        if (dx && dy && (!pass(F.t[y * F.w + nx]) && !pass(F.t[ny * F.w + x]))) continue;
        d[nk] = d[k] + 1; q.push(nk);
      }
    }
    return d;
  },
  dig(F, from, to) { // Dijkstra：岩漿成本 4、牆 12，沿路打通
    const N = F.w * F.h, cost = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1);
    const s = from[1] * F.w + from[0], g = to[1] * F.w + to[0];
    cost[s] = 0; const open = [s];
    const cf = v => v === T.LAVA || v === T.DEEP || v === T.CHASM ? 4 : v === T.WALL || v === T.SECRET || v === T.CRYSTAL || v === T.PILLAR ? 12 : TP[v].walk ? 1 : 12;
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[bi]]) bi = i;
      const k = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (k === g) break;
      const x = k % F.w, y = (k / F.w) | 0;
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx, ny = y + dy; if (nx < 1 || ny < 1 || nx >= F.w - 1 || ny >= F.h - 1) continue;
        const nk = ny * F.w + nx; if (this.inVault(F, nk) && nk !== g) continue;
        const c = cost[k] + cf(F.t[nk]);
        if (c < cost[nk]) { if (cost[nk] >= 1e9) open.push(nk); cost[nk] = c; prev[nk] = k; }
      }
    }
    let k = g;
    while (k >= 0 && k !== s) {
      const v = F.t[k];
      if (v === T.LAVA || v === T.DEEP || v === T.CHASM) F.t[k] = T.BRIDGE; else if (!TP[v].walk || v === T.SECRET) F.t[k] = T.RUBBLE;
      k = prev[k];
    }
  },
};
