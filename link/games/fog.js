'use strict';
/* 迷霧尋寶 — real-time lantern maze: every phone only sees the small lit circle around its own explorer.
   The maze is generated from a seed (the view carries [seed,W,H,kid,checksum]; a client whose copy doesn't
   match asks for the raw layout once). Host simulates at 30 Hz, sends 15 Hz views with only what is in the
   player's light + newly explored tiles; the client predicts its own walking (host validates every step)
   and interpolates everything else. The big screen gets the god view: the whole lantern-lit castle. */
(() => {
  const TAU = Math.PI * 2, U = 64;            // drawing: 64 world units per tile
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); };
  const HB = 0.3;                              // explorer hitbox half size (tiles)
  const GEMV = [1, 2, 5];
  const K_LAMP = 10, K_SHOE = 11, K_MAP = 12, K_KEY = 13, K_CHEST = 14;
  const LAMP_T = 10, SHOE_T = 8, MAP_T = 5, LAMP_X = 1.6, SHOE_X = 1.55;
  const ITEM_EMO = { 10: '🔦', 11: '👟', 12: '🗺️', 13: '🔑' };
  const ITEM_NAME = { 10: '大燈籠！看得更遠', 11: '飛毛腿！跑得更快', 12: '藏寶圖！看見附近地圖', 13: '拿到鑰匙了！快找寶箱' };
  const CFG = kid => kid
    ? { time: 120, spd: 3.7, lr: 3.6, mapR: 8, gem: 0.16, respawn: 0.8, items: { 10: 2, 11: 1, 12: 2 }, chestV: 10, chestRe: 15 }
    : { time: 180, spd: 4.2, lr: 2.8, mapR: 7.5, gem: 0.085, respawn: 2.6, items: { 10: 2, 11: 2, 12: 1 }, chestV: 25, chestRe: 20 };

  /* ---------- deterministic helpers (host and every client must agree) ---------- */
  function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = (i, s) => { let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  /* rooms + winding corridors ("rooms and mazes"): 1 wall, 0 corridor, 2 room floor */
  function genMaze(seed, W, H, kid) {
    const R = seeded(seed), g = new Uint8Array(W * H).fill(1), reg = new Int32Array(W * H).fill(-1), rooms = [];
    const ri = n => Math.floor(R() * n);
    let nreg = 0, area = 0;
    const carve = (x, y, r, v) => { const i = y * W + x; g[i] = v; reg[i] = r; };
    const tryRoom = (x, y, w, h) => {
      if (x < 1 || y < 1 || x + w > W - 1 || y + h > H - 1) return false;
      for (const o of rooms) if (x <= o.x + o.w && o.x <= x + w && y <= o.y + o.h && o.y <= y + h) return false;
      const r = nreg++; rooms.push({ x, y, w, h, r }); area += w * h;
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) carve(i, j, r, 2);
      return true;
    };
    const sw = 5, sh = 5;
    tryRoom(2 * Math.floor((W - sw) / 4) + 1, 2 * Math.floor((H - sh) / 4) + 1, sw, sh);
    const tries = Math.round(W * H / 8), maxA = W * H * (kid ? 0.4 : 0.34);
    for (let k = 0; k < tries && area < maxA; k++) {
      const w = 3 + 2 * ri(3), h = 3 + 2 * ri(kid ? 2 : 3);
      tryRoom(1 + 2 * ri(((W - 2 - w) >> 1) + 1), 1 + 2 * ri(((H - 2 - h) >> 1) + 1), w, h);
    }
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
      if (g[y * W + x] !== 1) continue;
      const r = nreg++; carve(x, y, r, 0);
      const st = [[x, y]]; let last = -1;
      while (st.length) {
        const c = st[st.length - 1], opts = [];
        for (let d = 0; d < 4; d++) { const nx = c[0] + D[d][0] * 2, ny = c[1] + D[d][1] * 2; if (nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && g[ny * W + nx] === 1) opts.push(d); }
        if (!opts.length) { st.pop(); last = -1; continue; }
        const d = opts.includes(last) && R() < 0.45 ? last : opts[ri(opts.length)];
        carve(c[0] + D[d][0], c[1] + D[d][1], r, 0);
        const nx = c[0] + D[d][0] * 2, ny = c[1] + D[d][1] * 2; carve(nx, ny, r, 0); st.push([nx, ny]); last = d;
      }
    }
    const par = []; for (let k = 0; k < nreg; k++) par.push(k);
    const find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const con = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (g[i] !== 1) continue;
      if (g[i - 1] !== 1 && g[i + 1] !== 1 && reg[i - 1] !== reg[i + 1]) con.push(i, reg[i - 1], reg[i + 1]);
      else if (g[i - W] !== 1 && g[i + W] !== 1 && reg[i - W] !== reg[i + W]) con.push(i, reg[i - W], reg[i + W]);
    }
    const n = con.length / 3;
    for (let k = n - 1; k > 0; k--) { const j = ri(k + 1); for (let q = 0; q < 3; q++) { const t = con[k * 3 + q]; con[k * 3 + q] = con[j * 3 + q]; con[j * 3 + q] = t; } }
    const loopP = kid ? 0.07 : 0.05;
    for (let k = 0; k < n; k++) {
      const i = con[k * 3], a = find(con[k * 3 + 1]), b = find(con[k * 3 + 2]);
      if (a !== b) { par[a] = b; g[i] = 0; }
      else if (R() < loopP && g[i - 1] === 1 && g[i + 1] === 1 || R() < loopP * 0.5) {
        if (g[i - 1] !== 1 && g[i + 1] !== 1 || g[i - W] !== 1 && g[i + W] !== 1) g[i] = 0;
      }
    }
    let passes = kid ? 60 : 8, changed = true;
    while (passes-- > 0 && changed) {
      changed = false;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x; if (g[i] !== 0) continue;
        const c = (g[i - 1] !== 1) + (g[i + 1] !== 1) + (g[i - W] !== 1) + (g[i + W] !== 1);
        if (c <= 1) { g[i] = 1; changed = true; }
      }
    }
    let ck = 7; for (let i = 0; i < g.length; i++) ck = (Math.imul(ck, 31) + g[i] + 1) >>> 0;
    return { w: W, h: H, g, rooms, start: rooms[0], ck };
  }
  const MZ = {};
  const getMaze = (seed, W, H, kid) => { const k = seed + '/' + W + '/' + H + '/' + (kid ? 1 : 0); return MZ[k] || (MZ[k] = genMaze(seed, W, H, kid)); };
  const fromLayout = (L, W, H) => {
    const g = new Uint8Array(W * H); for (let i = 0; i < g.length; i++) g[i] = L.charCodeAt(i) - 48;
    let ck = 7; for (let i = 0; i < g.length; i++) ck = (Math.imul(ck, 31) + g[i] + 1) >>> 0;
    // rebuild room rectangles from the room floor (2) for the rugs
    const rooms = [], seen = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (g[i] !== 2 || seen[i]) continue;
      let w = 0; while (x + w < W && g[i + w] === 2) w++;
      let h = 0; while (y + h < H && g[i + h * W] === 2) h++;
      for (let j = 0; j < h; j++) for (let q = 0; q < w; q++) seen[i + j * W + q] = 1;
      rooms.push({ x, y, w, h });
    }
    return { w: W, h: H, g, rooms, start: rooms[0], ck };
  };

  /* ---------- grid collision: box vs tiles, slides along walls, helps you into openings ---------- */
  const solid = (M, tx, ty) => tx < 0 || ty < 0 || tx >= M.w || ty >= M.h || M.g[ty * M.w + tx] === 1;
  const boxHit = (M, x, y) => {
    const x0 = Math.floor(x - HB), x1 = Math.floor(x + HB), y0 = Math.floor(y - HB), y1 = Math.floor(y + HB);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(M, tx, ty)) return true;
    return false;
  };
  function moveEnt(M, e, ux, uy, dist) {
    let left = dist;
    while (left > 1e-6) {
      const st = Math.min(0.18, left); left -= st;
      const mx = ux * st, my = uy * st;
      if (mx) {
        const nx = e.x + mx;
        if (!boxHit(M, nx, e.y)) e.x = nx;
        else {
          const col = mx > 0 ? Math.floor(nx + HB) : Math.floor(nx - HB);
          e.x = mx > 0 ? col - HB - 1e-4 : col + 1 + HB + 1e-4;
          if (Math.abs(uy) < 0.6) assist(M, e, 'y', col, Math.floor(e.y), Math.abs(mx));
        }
      }
      if (my) {
        const ny = e.y + my;
        if (!boxHit(M, e.x, ny)) e.y = ny;
        else {
          const row = my > 0 ? Math.floor(ny + HB) : Math.floor(ny - HB);
          e.y = my > 0 ? row - HB - 1e-4 : row + 1 + HB + 1e-4;
          if (Math.abs(ux) < 0.6) assist(M, e, 'x', row, Math.floor(e.x), Math.abs(my));
        }
      }
    }
  }
  // blocked while walking along one axis: slide sideways toward the lane that is open ahead
  function assist(M, e, ax, ahead, lane, amt) {
    const open = l => ax === 'y' ? !solid(M, ahead, l) : !solid(M, l, ahead);
    const cur = ax === 'y' ? e.y : e.x;
    let tgt = null;
    if (open(lane)) tgt = lane + 0.5;
    else { const o = cur - lane < 0.5 ? lane - 1 : lane + 1; if (open(o) && Math.abs(o + 0.5 - cur) < 0.8) tgt = o + 0.5; }
    if (tgt == null) return;
    const d = tgt - cur, s = Math.sign(d) * Math.min(Math.abs(d), amt * 0.9 + 0.01);
    if (ax === 'y') { if (!boxHit(M, e.x, e.y + s)) e.y += s; } else if (!boxHit(M, e.x + s, e.y)) e.x += s;
  }
  // BFS over floor tiles: path of tile indices from (sx,sy) to the first goal tile
  function bfs(M, sx, sy, goal, maxD) {
    const W = M.w, s = sy * W + sx, prev = new Int32Array(M.g.length).fill(-2), q = [s], dist = new Uint16Array(M.g.length);
    prev[s] = -1;
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      if (goal(c) && c !== s) { const p = []; for (let k = c; k !== -1; k = prev[k]) p.push(k); return p.reverse(); }
      if (dist[c] >= maxD) continue;
      const nb = [c + 1, c - 1, c + W, c - W];
      for (const k of nb) if (k >= 0 && k < M.g.length && prev[k] === -2 && M.g[k] !== 1 && Math.abs((k % W) - (c % W)) <= 1) { prev[k] = c; dist[k] = dist[c] + 1; q.push(k); }
    }
    return null;
  }

  /* ---------- CSS ---------- */
  const CSS = `
.fg-root{position:absolute;inset:0;overflow:hidden;background:#07060c;touch-action:none;-webkit-user-select:none;user-select:none}
.fg-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.fg-hud{position:absolute;inset:0;pointer-events:none;font-family:var(--sans)}
.fg-chip{position:absolute;background:rgba(36,26,44,.78);color:#ffeccc;border-radius:16px;box-shadow:0 3px 0 rgba(0,0,0,.35),inset 0 0 0 1.5px rgba(255,200,120,.25);padding:6px 12px}
.fg-me{left:10px;top:10px;display:flex;align-items:center;gap:8px}
.fg-me img{width:40px;height:40px}
.fg-me .big{font-family:var(--round);font-weight:700;font-size:30px;line-height:1;color:#ffd166}
.fg-me .big small{font-family:var(--sans);font-size:13px;font-weight:900;color:#e9c99c;margin-left:3px}
.fg-me .sm{font-size:12px;font-weight:900;color:#e9c99c;line-height:1.35}
.fg-me .rk{display:inline-block;background:#ffd166;color:#6b3f00;border-radius:999px;padding:0 8px;font-size:12.5px;margin-right:4px}
.fg-me.pop .big{animation:fg-bump .35s ease-out}
@keyframes fg-bump{40%{transform:scale(1.25)}}
.fg-time{right:10px;top:10px;font-family:var(--round);font-weight:700;font-size:24px;min-width:78px;text-align:center;color:#ffeccc}
.fg-time.hot{background:#e8455b;color:#fff;animation:fg-pulse .5s infinite alternate}
@keyframes fg-pulse{to{transform:scale(1.08)}}
.fg-lb{right:10px;top:60px;padding:6px 8px;display:flex;flex-direction:column;gap:2px;min-width:112px}
.fg-lb .r{display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:900;line-height:1.25}
.fg-lb .r img{width:20px;height:20px}
.fg-lb .r .n{flex:1;max-width:60px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.fg-lb .r .v{font-family:var(--round);font-weight:700;color:#ffd166}
.fg-lb .r.me{color:#9fe0ff}
.fg-items{position:absolute;left:10px;top:66px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.fg-it{background:rgba(36,26,44,.82);color:#fff;border-radius:999px;padding:4px 10px 4px 6px;font-weight:900;font-size:14px;display:flex;align-items:center;gap:6px;
  box-shadow:0 2px 0 rgba(0,0,0,.35);animation:fg-in .3s ease-out}
.fg-it b{font-size:20px;line-height:1}
.fg-it i{display:block;width:46px;height:6px;border-radius:3px;background:rgba(255,255,255,.2);overflow:hidden;font-style:normal}
.fg-it i s{display:block;height:100%;background:#ffd166;transition:width .25s linear}
.fg-it.key{background:#ffcf4a;color:#5a3500;animation:fg-in .3s ease-out,fg-glow 1s infinite alternate}
@keyframes fg-glow{to{box-shadow:0 0 0 4px rgba(255,207,74,.35)}}
@keyframes fg-in{from{transform:scale(.5);opacity:0}}
.fg-mm{position:absolute;left:10px;bottom:12px;border-radius:10px;background:rgba(10,8,16,.75);box-shadow:0 0 0 2px rgba(255,200,120,.35),0 3px 0 rgba(0,0,0,.4);image-rendering:pixelated}
.fg-joy{position:absolute;width:128px;height:128px;margin:-64px 0 0 -64px;border-radius:50%;background:radial-gradient(circle,rgba(255,230,180,.10),rgba(255,230,180,.22));
  box-shadow:inset 0 0 0 3px rgba(255,220,160,.45);pointer-events:none;transition:opacity .2s}
.fg-joy b{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3d6,#ffc46b 60%,#d98a2b);
  box-shadow:0 4px 0 rgba(0,0,0,.35)}
.fg-joy.idle{opacity:.55;animation:fg-bob 1.2s ease-in-out infinite alternate}
.fg-joy.idle b{animation:fg-wig 1.6s ease-in-out infinite}
@keyframes fg-wig{0%,100%{transform:translate(0,0)}25%{transform:translate(26px,-8px)}75%{transform:translate(-22px,10px)}}
.fg-hint{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);background:rgba(36,26,44,.85);color:#ffeccc;border-radius:999px;padding:9px 16px;
  font-weight:900;font-size:15px;white-space:nowrap;transition:opacity .6s}
@keyframes fg-bob{to{transform:translateY(-6px)}}
.fg-big{position:absolute;left:50%;top:28%;transform:translate(-50%,-50%);font-family:var(--round);font-weight:700;font-size:44px;color:#ffd166;text-align:center;white-space:nowrap;
  text-shadow:0 3px 0 #6b3f00,0 0 18px rgba(0,0,0,.6);animation:fg-pop .35s ease-out}
.fg-big small{display:block;font-family:var(--sans);font-size:18px;font-weight:900;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.6)}
.fg-big.bad{color:#bcd0ff;text-shadow:0 3px 0 #2a2f6b,0 0 18px rgba(0,0,0,.6)}
@keyframes fg-pop{from{transform:translate(-50%,-50%) scale(.5);opacity:0}}
.fg-side{position:absolute;right:0;top:0;bottom:0;background:linear-gradient(#2d2033,#1b1420);box-shadow:-4px 0 0 #4a3424,-8px 0 30px rgba(0,0,0,.5);padding:18px 16px;
  display:flex;flex-direction:column;gap:12px;overflow:hidden;color:#ffeccc}
.fg-side h3{margin:0;font-weight:900;font-size:27px;color:#ffd166;text-align:center;text-shadow:0 3px 0 #6b3f00}
.fg-side .tm{font-family:var(--round);font-weight:700;font-size:58px;text-align:center;line-height:1}
.fg-side .tm.hot{color:#ff5d73;animation:fg-pulse .5s infinite alternate}
.fg-side .md{text-align:center;font-weight:900;color:#c9a77a;font-size:15px}
.fg-side .rows{display:flex;flex-direction:column;gap:8px}
.fg-side .r{display:flex;align-items:center;gap:10px;background:rgba(255,236,204,.08);border-radius:16px;padding:6px 10px;box-shadow:inset 0 0 0 1.5px rgba(255,200,120,.15)}
.fg-side .r img{width:46px;height:46px}
.fg-side .r .k{font-family:var(--round);font-weight:700;font-size:22px;width:26px;text-align:center;color:#a08a74}
.fg-side .r.first{background:rgba(255,209,102,.18);box-shadow:inset 0 0 0 2px rgba(255,209,102,.6)}
.fg-side .r .n{flex:1;min-width:0;font-weight:900;font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fg-side .r .n small{display:block;font-size:12.5px;color:#c9a77a;font-weight:700}
.fg-side .r .v{font-family:var(--round);font-weight:700;font-size:30px;color:#ffd166}
.fg-side .leg{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:14px;font-weight:700;color:#c9a77a}
.fg-side .leg span{display:flex;align-items:center;gap:4px;min-height:30px}
.fg-side .leg img{width:32px;height:32px;margin:-4px 0}
.fg-pubtop{left:10px;right:10px;top:10px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;font-weight:900;font-size:14px}
`;
  function injectCSS() {
    if (document.getElementById('fg-style')) return;
    const s = document.createElement('style'); s.id = 'fg-style'; s.textContent = CSS; document.head.appendChild(s);
  }

  /* ---------- sprites (made once) ---------- */
  const SPR = {};
  function sprites() {
    if (SPR.ok) return SPR;
    const mk = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; };
    const glow = (g, cx, cy, r, rgb, a) => { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); };
    const GC = [['#4fd8ff', '#1b86c9', '#c9f4ff', '80,210,255'], ['#ff5c93', '#b8235a', '#ffd0e0', '255,90,150'], ['#ffd23f', '#c48a00', '#fff4c0', '255,210,70']];
    SPR.gem = GC.map(([c, d, l, rgb], k) => mk(96, 96, (g) => {
      glow(g, 48, 50, 46, rgb, 0.55);
      const s = [0.62, 0.78, 1][k];
      g.translate(48, 50); g.scale(s, s);
      g.lineJoin = 'round';
      g.fillStyle = c; g.beginPath(); g.moveTo(-16, -16); g.lineTo(16, -16); g.lineTo(27, -4); g.lineTo(0, 26); g.lineTo(-27, -4); g.closePath(); g.fill();
      g.fillStyle = l; g.beginPath(); g.moveTo(-16, -16); g.lineTo(16, -16); g.lineTo(27, -4); g.lineTo(-27, -4); g.closePath(); g.fill();
      g.fillStyle = d; g.beginPath(); g.moveTo(8, -4); g.lineTo(27, -4); g.lineTo(0, 26); g.closePath(); g.fill();
      g.strokeStyle = d; g.lineWidth = 3; g.beginPath(); g.moveTo(-16, -16); g.lineTo(16, -16); g.lineTo(27, -4); g.lineTo(0, 26); g.lineTo(-27, -4); g.closePath(); g.stroke();
      g.lineWidth = 1.6; g.beginPath(); g.moveTo(-27, -4); g.lineTo(27, -4); g.moveTo(-8, -4); g.lineTo(0, 26); g.moveTo(8, -4); g.lineTo(0, 26); g.moveTo(-6, -16); g.lineTo(-8, -4); g.moveTo(6, -16); g.lineTo(8, -4); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-12, -12); g.lineTo(-4, -12); g.lineTo(-9, -6); g.closePath(); g.fill();
      if (k === 2) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(22, -26); g.lineTo(25, -20); g.lineTo(31, -17); g.lineTo(25, -14); g.lineTo(22, -8); g.lineTo(19, -14); g.lineTo(13, -17); g.lineTo(19, -20); g.closePath(); g.fill(); }
    }));
    const emo = (e, px) => mk(96, 96, (g) => {
      glow(g, 48, 48, 46, '255,236,170', 0.65);
      g.fillStyle = 'rgba(255,248,225,.92)'; g.beginPath(); g.arc(48, 48, 27, 0, TAU); g.fill();
      g.strokeStyle = '#ffcf4a'; g.lineWidth = 3; g.stroke();
      g.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 48, 51);
    });
    SPR.item = {}; for (const k in ITEM_EMO) SPR.item[k] = emo(ITEM_EMO[k], 34);
    const chest = locked => mk(112, 112, (g) => {
      glow(g, 56, 58, 54, '255,200,80', 0.6);
      g.translate(56, 60); g.lineJoin = 'round';
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 26, 34, 8, 0, 0, TAU); g.fill();
      g.fillStyle = '#9b5e2a'; g.strokeStyle = '#4a2a10'; g.lineWidth = 3;
      g.beginPath(); g.rect(-30, -4, 60, 30); g.fill(); g.stroke();
      g.fillStyle = '#b8733a'; g.beginPath(); g.moveTo(-30, -4); g.lineTo(-30, -14); g.quadraticCurveTo(0, -34, 30, -14); g.lineTo(30, -4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffcf4a'; g.strokeStyle = '#a06c00'; g.lineWidth = 2;
      for (const x of [-22, 16]) { g.beginPath(); g.rect(x, -24 + (x < 0 ? 4 : 4), 6, 50 - 4); g.fill(); g.stroke(); }
      g.beginPath(); g.rect(-30, -6, 60, 5); g.fill(); g.stroke();
      if (locked) {
        g.strokeStyle = '#7a5300'; g.lineWidth = 4; g.beginPath(); g.arc(0, 2, 6, Math.PI, 0); g.stroke();
        g.fillStyle = '#ffd84d'; g.strokeStyle = '#7a5300'; g.lineWidth = 2; g.beginPath(); g.rect(-8, 2, 16, 13); g.fill(); g.stroke();
        g.fillStyle = '#5a3a00'; g.beginPath(); g.arc(0, 7, 2.4, 0, TAU); g.fill(); g.fillRect(-1, 8, 2, 4);
      } else { g.fillStyle = '#ffd84d'; g.beginPath(); g.arc(0, 4, 6, 0, TAU); g.fill(); g.stroke(); }
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-18, -18); g.lineTo(-10, -22); g.lineTo(-12, -16); g.closePath(); g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
    });
    SPR.chest = [chest(false), chest(true)];
    SPR.lantern = mk(64, 64, (g) => {
      glow(g, 32, 36, 30, '255,200,90', 0.8);
      g.lineJoin = 'round'; g.strokeStyle = '#3a2a1c'; g.lineWidth = 3;
      g.beginPath(); g.arc(32, 22, 7, Math.PI, 0); g.stroke();
      g.fillStyle = '#3a2a1c'; g.fillRect(23, 22, 18, 5); g.fillRect(23, 45, 18, 5);
      g.fillStyle = '#ffe58a'; g.beginPath(); g.rect(25, 27, 14, 18); g.fill();
      g.fillStyle = '#fff8d0'; g.beginPath(); g.ellipse(32, 37, 3.5, 6, 0, 0, TAU); g.fill();
      g.strokeStyle = '#3a2a1c'; g.lineWidth = 2; g.strokeRect(25, 27, 14, 18);
    });
    SPR.glow = mk(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,196,110,.55)'); gr.addColorStop(0.45, 'rgba(255,170,80,.22)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    SPR.torchGlow = mk(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,170,70,.6)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
    const ghost = angry => mk(112, 112, (g) => {
      glow(g, 56, 56, 54, '170,200,255', 0.45);
      g.translate(56, 54); g.lineJoin = 'round';
      g.fillStyle = 'rgba(244,247,255,.95)'; g.strokeStyle = '#8f9bd6'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-28, 30); g.lineTo(-28, -4); g.arc(0, -4, 28, Math.PI, 0); g.lineTo(28, 30);
      for (let k = 0; k < 4; k++) { const x = 28 - k * 14; g.quadraticCurveTo(x - 7, 20, x - 14, 30); }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#2b2340';
      g.beginPath(); g.ellipse(-10, -6, 5, angry ? 5 : 7, 0, 0, TAU); g.ellipse(10, -6, 5, angry ? 5 : 7, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-8.5, -8.5, 1.8, 0, TAU); g.arc(11.5, -8.5, 1.8, 0, TAU); g.fill();
      if (angry) { g.strokeStyle = '#2b2340'; g.lineWidth = 3; g.beginPath(); g.moveTo(-17, -17); g.lineTo(-5, -13); g.moveTo(17, -17); g.lineTo(5, -13); g.stroke(); }
      g.fillStyle = '#2b2340'; g.beginPath(); g.ellipse(0, 9, angry ? 6 : 4, angry ? 5 : 4, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,150,190,.55)'; g.beginPath(); g.ellipse(-18, 4, 5, 3, 0, 0, TAU); g.ellipse(18, 4, 5, 3, 0, 0, TAU); g.fill();
    });
    SPR.ghost = [ghost(false), ghost(true)];
    SPR.ok = true; return SPR;
  }

  /* ---------- static maze painting (into cached chunks) ---------- */
  const MIX = (a, b, t) => { const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16); const r = (p >> 16) + ((q >> 16) - (p >> 16)) * t, gg = ((p >> 8) & 255) + (((q >> 8) & 255) - ((p >> 8) & 255)) * t, bb = (p & 255) + ((q & 255) - (p & 255)) * t; return `rgb(${r | 0},${gg | 0},${bb | 0})`; };
  const isTorch = (M, i) => M.g[i] === 1 && i + M.w < M.g.length && M.g[i + M.w] !== 1 && hash(i, 7) < 0.075;
  function paintTiles(g, M, x0, y0, x1, y1) {
    const W = M.w, G = M.g;
    const at = (x, y) => x < 0 || y < 0 || x >= W || y >= M.h ? 1 : G[y * W + x];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= W || y >= M.h) continue;
      const i = y * W + x, v = G[i], px = x * U, py = y * U, h1 = hash(i, 1), h2 = hash(i, 2);
      if (v !== 1) {
        if (v === 2) {   // wooden planks
          g.fillStyle = MIX('#b57a45', '#a66d3c', h1); g.fillRect(px, py, U, U);
          g.strokeStyle = 'rgba(80,40,15,.45)'; g.lineWidth = 2;
          g.beginPath();
          for (let k = 1; k < 4; k++) { g.moveTo(px, py + k * 16); g.lineTo(px + U, py + k * 16); }
          for (let k = 0; k < 4; k++) { const sx = px + ((hash(y * 4 + k, 3) * 4 | 0) * 16 + (x % 2) * 32) % U; g.moveTo(sx, py + k * 16); g.lineTo(sx, py + k * 16 + 16); }
          g.stroke();
          g.fillStyle = 'rgba(255,220,170,.12)'; g.fillRect(px, py + 2, U, 3);
        } else {         // flagstones
          g.fillStyle = '#6f5a48'; g.fillRect(px, py, U, U);
          const o = (h1 * 3 | 0) * 6;
          const st = [[2, 2, 30 + o, 28], [34 + o, 2, 28 - o, 28], [2, 32, 22, 30], [26, 32, 36, 30]];
          for (let k = 0; k < 4; k++) { const s = st[k]; g.fillStyle = MIX('#a8896a', '#93765a', hash(i, 10 + k)); g.fillRect(px + s[0], py + s[1], s[2], s[3]); }
          g.fillStyle = 'rgba(255,240,210,.14)'; for (let k = 0; k < 4; k++) { const s = st[k]; g.fillRect(px + s[0], py + s[1], s[2], 3); }
          if (h2 < 0.18) { g.fillStyle = 'rgba(60,45,35,.5)'; g.beginPath(); g.arc(px + 12 + h1 * 40, py + 14 + h2 * 150, 3, 0, TAU); g.arc(px + 20 + h1 * 30, py + 18 + h2 * 140, 2, 0, TAU); g.fill(); }
        }
        // soft shadows cast by the walls
        g.fillStyle = 'rgba(20,10,25,.32)';
        if (at(x, y - 1) === 1) g.fillRect(px, py, U, 12);
        if (at(x - 1, y) === 1) g.fillRect(px, py, 7, U);
        if (at(x + 1, y) === 1) g.fillRect(px + U - 4, py, 4, U);
        // small details
        if (v === 0 && h2 > 0.93 && at(x - 1, y) === 1 && at(x, y - 1) === 1) {   // cobweb
          g.strokeStyle = 'rgba(235,235,245,.5)'; g.lineWidth = 1.5; g.beginPath();
          for (let k = 0; k < 4; k++) { const a = k / 3 * Math.PI / 2; g.moveTo(px, py); g.lineTo(px + Math.cos(a) * 26, py + Math.sin(a) * 26); }
          for (const r of [10, 18]) { g.moveTo(px + r, py); g.quadraticCurveTo(px + r * 0.55, py + r * 0.55, px, py + r); }
          g.stroke();
        }
      } else {
        const below = at(x, y + 1) !== 1, face = below ? 22 : 0, top = U - face;
        g.fillStyle = MIX('#4c4163', '#443a59', h1); g.fillRect(px, py, U, top);
        g.strokeStyle = 'rgba(30,22,45,.55)'; g.lineWidth = 2; g.beginPath();
        for (let k = 1; k * 14 < top; k++) { g.moveTo(px, py + k * 14); g.lineTo(px + U, py + k * 14); }
        for (let k = 0; k * 14 < top; k++) { const sx = px + (k % 2 ? 16 : 40); g.moveTo(sx, py + k * 14); g.lineTo(sx, Math.min(py + top, py + k * 14 + 14)); }
        g.stroke();
        g.fillStyle = 'rgba(160,140,200,.32)';
        if (at(x, y - 1) !== 1) g.fillRect(px, py, U, 4);
        if (at(x - 1, y) !== 1) g.fillRect(px, py, 4, top);
        if (at(x + 1, y) !== 1) g.fillRect(px + U - 4, py, 4, top);
        if (h2 < 0.14) { g.fillStyle = 'rgba(110,150,80,.75)'; g.beginPath(); g.ellipse(px + 14 + h1 * 36, py + 10 + h2 * 100, 9, 5, 0, 0, TAU); g.ellipse(px + 22 + h1 * 30, py + 14 + h2 * 100, 6, 4, 0, 0, TAU); g.fill(); }
        if (face) {
          g.fillStyle = '#2d2540'; g.fillRect(px, py + top, U, face);
          g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px, py + top + 11, U, 1.5);
          g.fillRect(px + 20, py + top, 1.5, 11); g.fillRect(px + 46, py + top + 11, 1.5, 11);
          g.fillStyle = 'rgba(200,170,255,.18)'; g.fillRect(px, py + top, U, 2);
          if (isTorch(M, i)) {
            const cx = px + U / 2, cy = py + top + 4;
            g.fillStyle = '#3a2a1c'; g.fillRect(cx - 3, cy, 6, 14); g.fillRect(cx - 7, cy, 14, 4);
            g.fillStyle = '#ff9a2e'; g.beginPath(); g.moveTo(cx, cy - 16); g.quadraticCurveTo(cx + 9, cy - 4, cx, cy + 1); g.quadraticCurveTo(cx - 9, cy - 4, cx, cy - 16); g.fill();
            g.fillStyle = '#ffe9a0'; g.beginPath(); g.ellipse(cx, cy - 4, 3, 5, 0, 0, TAU); g.fill();
          }
        }
      }
    }
    // rugs and furniture in the rooms
    for (let r = 0; r < M.rooms.length; r++) {
      const o = M.rooms[r];
      if (o.x > x1 || o.x + o.w < x0 || o.y > y1 || o.y + o.h < y0) continue;
      if (r === 0) {   // start hall: a compass rose rug
        const cx = (o.x + o.w / 2) * U, cy = (o.y + o.h / 2) * U, R = Math.min(o.w, o.h) * U * 0.36;
        g.fillStyle = '#7b2d3f'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
        g.strokeStyle = '#e8b64c'; g.lineWidth = 5; g.stroke();
        g.beginPath(); g.arc(cx, cy, R * 0.8, 0, TAU); g.lineWidth = 2; g.stroke();
        g.fillStyle = '#e8b64c'; g.beginPath();
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU - Math.PI / 2, rr = k % 2 ? R * 0.32 : R * 0.72; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); const b = a + TAU / 16; g.lineTo(cx + Math.cos(b) * R * 0.14, cy + Math.sin(b) * R * 0.14); }
        g.closePath(); g.fill();
        continue;
      }
      const hr = hash(r, 5);
      if (o.w >= 5 && o.h >= 3 && hr < 0.7) {
        const cols = [['#7b2d3f', '#e8b64c'], ['#2d4f7b', '#e8d38c'], ['#3f6b3a', '#f0c86a']][hash(r, 6) * 3 | 0];
        const rx = (o.x + 1) * U + 10, ry = (o.y + (o.h > 3 ? 1 : 0)) * U + 10, rw = (o.w - 2) * U - 20, rh = (o.h - (o.h > 3 ? 2 : 0)) * U - 20;
        g.fillStyle = cols[0]; g.fillRect(rx, ry, rw, rh);
        g.strokeStyle = cols[1]; g.lineWidth = 4; g.strokeRect(rx + 6, ry + 6, rw - 12, rh - 12);
        g.lineWidth = 2; g.strokeRect(rx + 13, ry + 13, rw - 26, rh - 26);
      }
      // a barrel / crate / pot in some corners
      const corners = [[o.x, o.y], [o.x + o.w - 1, o.y], [o.x, o.y + o.h - 1], [o.x + o.w - 1, o.y + o.h - 1]];
      for (let k = 0; k < 4; k++) {
        const hh = hash(r * 4 + k, 8); if (hh > 0.45) continue;
        const cx = corners[k][0] * U + U / 2 + (k % 2 ? 12 : -12), cy = corners[k][1] * U + U / 2 + (k > 1 ? 12 : -10);
        g.lineWidth = 2.5; g.strokeStyle = '#3a2412';
        if (hh < 0.15) { g.fillStyle = '#8a5a2e'; g.beginPath(); g.ellipse(cx, cy, 13, 15, 0, 0, TAU); g.fill(); g.stroke(); g.strokeStyle = '#c9a060'; g.beginPath(); g.ellipse(cx, cy, 13, 4, 0, 0, TAU); g.stroke(); }
        else if (hh < 0.3) { g.fillStyle = '#a8763c'; g.fillRect(cx - 13, cy - 13, 26, 26); g.strokeRect(cx - 13, cy - 13, 26, 26); g.beginPath(); g.moveTo(cx - 13, cy - 13); g.lineTo(cx + 13, cy + 13); g.moveTo(cx + 13, cy - 13); g.lineTo(cx - 13, cy + 13); g.stroke(); }
        else { g.fillStyle = '#c0663d'; g.beginPath(); g.arc(cx, cy + 2, 11, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#7a3a20'; g.beginPath(); g.ellipse(cx, cy - 8, 6, 3, 0, 0, TAU); g.fill(); }
      }
    }
  }

  LGAMES.push({
    id: 'fog', name: '迷霧尋寶', icon: '🔦', col: '#f2a93b',
    blurb: '每人只看得到燈籠照亮的一小圈，摸黑找寶石！', players: [1, 6],
    rules: kid => kid ? [
      '👆 手指按住螢幕拖一拖，小探險家就會走',
      '🔦 你只看得到燈籠照亮的地方，走過的路會畫在小地圖上',
      '💎 撿寶石！黃色大顆最多分，🧰 寶箱更多分',
      '🔦👟🗺️ 撿道具：燈變亮、跑更快、看見地圖',
      '⏱ 2 分鐘，寶石分數最多的人贏！'
    ] : [
      '👆 拖曳搖桿（電腦用方向鍵／WASD）在城堡迷宮裡移動',
      '🔦 每個人只看得到自己燈籠照到的範圍',
      '👻 鬼魂只在燈光下現身，被抓到會掉一半寶石；撞到別人會撞掉對方 1 顆',
      '🔑 找到鑰匙才能打開大寶箱（+25 分）',
      '⏱ 3 分鐘，寶石總分最高的人贏'
    ],

    /* =================================================================== HOST */
    host(ctx) {
      const kid = ctx.kid, N = ctx.players.length, C = CFG(kid);
      const W = kid ? (N > 3 ? 31 : 27) : (N > 3 ? 45 : 39), H = kid ? (N > 3 ? 21 : 19) : (N > 3 ? 29 : 25);
      const seed = (Math.random() * 1e9) >>> 0, M = genMaze(seed, W, H, kid);
      const floors = []; for (let i = 0; i < M.g.length; i++) if (M.g[i] !== 1) floors.push(i);
      let layout = null;
      const layoutStr = () => layout || (layout = Array.from(M.g, v => String.fromCharCode(48 + v)).join(''));
      let timeLeft = C.time, over = false, endT = 0, t = 0, eid = 1, evq = 0, pubN = 0, gemAcc = 0, tickN = 0;
      const ents = [], evs = [], pend = [];
      const gemTarget = Math.round(floors.length * C.gem);
      const st = M.start, scx = st.x + st.w / 2, scy = st.y + st.h / 2;
      const P = ctx.players.map((p, i) => {
        const a = i / Math.max(1, N) * TAU + 0.3, rr = N === 1 ? 0 : 1.2;
        return {
          id: p.id, i, name: p.name, x: Math.floor(scx + Math.cos(a) * rr) + 0.5, y: Math.floor(scy + Math.sin(a) * rr) + 0.5,
          fa: Math.PI / 2, mv: false, vx: 0, vy: 0, px: 0, py: 0, d: [0, 0], lpt: 0,
          score: 0, cnt: 0, caught: 0, chests: 0, light: 0, speed: 0, map: 0, key: false, inv: 0, pv: 0,
          ex: new Uint8Array(W * H), xNew: [], xc: 0, full: true, lay: false, lastPick: 0, hintT: 0, hint: null, keyMsgT: -9, bump: {}, off: false
        };
      });
      P.forEach(e => { e.px = e.x; e.py = e.y; });
      const byId = {}; P.forEach(e => byId[e.id] = e);
      const ev = (k, x, y, i, v, id) => evs.push({ q: ++evq, k, x, y, i, v: v || 0, id: id || 0, t });
      const lrOf = e => C.lr * (e.light > 0 ? LAMP_X : 1);
      const visOf = e => e.map > 0 ? Math.max(lrOf(e), C.mapR) : lrOf(e);
      const spdOf = e => C.spd * (e.speed > 0 ? SHOE_X : 1);
      const tileOf = (x, y) => Math.floor(y) * W + Math.floor(x);

      /* placement */
      const occupied = () => { const s = new Set(); for (const o of ents) s.add(tileOf(o.x, o.y)); return s; };
      const freeTile = (minD, avoidStart) => {
        const occ = occupied(); let best = null, bd = -1;
        for (let k = 0; k < 40; k++) {
          const i = floors[Math.random() * floors.length | 0]; if (occ.has(i)) continue;
          const x = i % W + 0.5, y = (i / W | 0) + 0.5;
          if (avoidStart && x > st.x - 0.5 && x < st.x + st.w + 0.5 && y > st.y - 0.5 && y < st.y + st.h + 0.5) continue;
          let d = 1e9; for (const e of P) d = Math.min(d, Math.hypot(e.x - x, e.y - y));
          if (d >= minD) return i;
          if (d > bd) { bd = d; best = i; }
        }
        return best != null ? best : floors[Math.random() * floors.length | 0];
      };
      const addEnt = (i, k, v, jit) => {
        const o = { id: eid++, x: i % W + 0.5 + (jit ? (Math.random() - 0.5) * 0.3 : 0), y: (i / W | 0) + 0.5 + (jit ? (Math.random() - 0.5) * 0.3 : 0), k, v: v || 0, nt: 0, own: null };
        if (eid > 99999) eid = 1;
        ents.push(o); return o;
      };
      const gemKind = () => { const r = Math.random(); return r < (kid ? 0.58 : 0.55) ? 0 : r < (kid ? 0.88 : 0.85) ? 1 : 2; };
      const addGem = (minD, start) => { const k = gemKind(); addEnt(freeTile(minD, start), k, GEMV[k], true); };
      const placeChest = () => {
        const rooms = M.rooms.slice(1);
        let best = null, bd = -1;
        for (let k = 0; k < 12 && rooms.length; k++) {
          const o = rooms[Math.random() * rooms.length | 0], x = o.x + (o.w >> 1), y = o.y + (o.h >> 1);
          let d = 1e9; for (const e of P) d = Math.min(d, Math.hypot(e.x - x, e.y - y));
          if (d > bd) { bd = d; best = y * W + x; }
          if (d > W / 3) break;
        }
        if (best == null) best = freeTile(8, true);
        const c = addEnt(best, K_CHEST, C.chestV, false);
        if (!kid) {
          let ki = null;
          for (let k = 0; k < 40; k++) { const i = floors[Math.random() * floors.length | 0], x = i % W + 0.5, y = (i / W | 0) + 0.5; if (Math.hypot(x - c.x, y - c.y) > W / 3 && !P.some(e => Math.hypot(e.x - x, e.y - y) < 4)) { ki = i; break; } }
          addEnt(ki != null ? ki : freeTile(6, true), K_KEY, 0, false);
        }
      };
      for (let k = 0; k < gemTarget; k++) addGem(2, true);
      for (const k in C.items) for (let n = 0; n < C.items[k]; n++) addEnt(freeTile(6, true), +k, 0, false);
      placeChest();

      /* ghosts (adult) */
      const ghosts = [];
      if (!kid) {
        const n = N <= 2 ? 2 : N <= 4 ? 3 : 4;
        const rooms = M.rooms.slice(1).sort((a, b) => Math.hypot(b.x + b.w / 2 - scx, b.y + b.h / 2 - scy) - Math.hypot(a.x + a.w / 2 - scx, a.y + a.h / 2 - scy));
        for (let k = 0; k < n; k++) {
          const o = rooms[k % Math.max(1, rooms.length)] || st, tx = o.x + (o.w >> 1), ty = o.y + (o.h >> 1);
          ghosts.push({ id: k + 1, x: tx + 0.5, y: ty + 0.5, tx, ty, ptx: tx, pty: ty, pause: 1 + k, chase: false, fx: 1 });
        }
      }
      const ghostNext = G => {
        const cx = G.tx, cy = G.ty;
        let tgt = null, td = 7;
        for (const e of P) { if (e.off || e.inv > 0) continue; const d = Math.hypot(e.x - G.x, e.y - G.y); if (d < td) { td = d; tgt = e; } }
        let nx = null, ny = null;
        G.chase = false;
        if (tgt && Math.random() < 0.8) {
          const goal = tileOf(tgt.x, tgt.y), p = bfs(M, cx, cy, i => i === goal, 12);
          if (p && p.length > 1) { nx = p[1] % W; ny = p[1] / W | 0; G.chase = true; }
        }
        if (nx == null) {
          const opts = [];
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = cx + dx, y = cy + dy; if (!solid(M, x, y) && !(x === G.ptx && y === G.pty)) opts.push([x, y]); }
          if (!opts.length) { nx = G.ptx; ny = G.pty; }
          else {
            const sx = cx + (cx - G.ptx), sy = cy + (cy - G.pty), str = opts.find(o => o[0] === sx && o[1] === sy);
            const o = str && Math.random() < 0.55 ? str : opts[Math.random() * opts.length | 0]; nx = o[0]; ny = o[1];
          }
        }
        G.ptx = cx; G.pty = cy; G.tx = nx; G.ty = ny;
        if (nx !== cx) G.fx = nx > cx ? 1 : -1;
      };

      /* drops */
      const scatter = (e, pieces, total) => {
        const ti = tileOf(e.x, e.y), cand = [];
        const seen = new Set([ti]), q = [[ti, 0]];
        for (let h = 0; h < q.length; h++) { const [c, d] = q[h]; if (d > 0) cand.push(c); if (d >= 2) continue; for (const k of [c + 1, c - 1, c + W, c - W]) if (!seen.has(k) && M.g[k] !== 1) { seen.add(k); q.push([k, d + 1]); } }
        if (!cand.length) cand.push(ti);
        let left = total;
        for (let n = 0; n < pieces && left > 0; n++) {
          const v = n === pieces - 1 ? left : Math.max(1, Math.round(total / pieces)); left -= v;
          const o = addEnt(cand[Math.random() * cand.length | 0], v >= 5 ? 2 : v >= 2 ? 1 : 0, v, true);
          o.nt = t + 1.6; o.own = e.id;
        }
      };
      const dropKey = e => { if (!e.key) return; e.key = false; const o = addEnt(tileOf(e.x, e.y), K_KEY, 0, false); o.x = e.x; o.y = e.y; o.nt = t + 1.6; o.own = e.id; };

      const markEx = (e, rad) => {
        const R2 = (rad + 0.5) * (rad + 0.5), x0 = Math.max(0, Math.floor(e.x - rad - 1)), x1 = Math.min(W - 1, Math.floor(e.x + rad + 1)), y0 = Math.max(0, Math.floor(e.y - rad - 1)), y1 = Math.min(H - 1, Math.floor(e.y + rad + 1));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - e.x, dy = y + 0.5 - e.y; if (dx * dx + dy * dy > R2) continue;
          const i = y * W + x; if (!e.ex[i]) { e.ex[i] = 1; e.xc++; if (!e.full) e.xNew.push(i); }
        }
        if (e.xNew.length > 800) { e.xNew.length = 0; e.full = true; }
      };
      const exB64 = e => { let s = ''; for (let i = 0; i < e.ex.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) if (e.ex[i + k]) b |= 1 << k; s += String.fromCharCode(b); } return btoa(s); };

      const pickup = e => {
        if (e.off) return;
        const R = kid ? 0.62 : 0.52;
        for (let k = ents.length - 1; k >= 0; k--) {
          const o = ents[k], dx = o.x - e.x, dy = o.y - e.y;
          if (dx * dx + dy * dy > R * R) continue;
          if (o.own === e.id && t < o.nt) continue;
          if (o.k < 3) {
            e.score += o.v; e.cnt++; e.lastPick = t; e.hint = null;
            ev(1, o.x, o.y, e.i, o.v, o.id);
          } else if (o.k === K_CHEST) {
            if (!kid && !e.key) { if (t - e.keyMsgT > 3) { e.keyMsgT = t; ctx.toast(e.id, '🔒 寶箱鎖住了，要先找到 🔑 鑰匙！'); ctx.sound(e.id, 'wrong'); } continue; }
            e.key = false; e.score += o.v; e.chests++; e.lastPick = t;
            ev(5, o.x, o.y, e.i, o.v, o.id);
            if (!kid) ctx.toast('*', `🎁 ${e.name} 打開了大寶箱！+${o.v}`);
            pend.push({ at: t + C.chestRe, chest: true });
          } else if (o.k === K_KEY) {
            if (e.key) continue;
            e.key = true; ev(6, o.x, o.y, e.i, 0, o.id);
            ctx.toast('*', `🔑 ${e.name} 拿到鑰匙了！`);
          } else {
            if (o.k === K_LAMP) e.light = LAMP_T; else if (o.k === K_SHOE) e.speed = SHOE_T; else if (o.k === K_MAP) e.map = MAP_T;
            ev(2, o.x, o.y, e.i, o.k, o.id); e.lastPick = t;
            pend.push({ at: t + 12, k: o.k });
          }
          ents.splice(k, 1);
        }
      };
      const hintFor = e => {
        const gem = new Set(); for (const o of ents) if (o.k < 3 || o.k === K_CHEST) gem.add(tileOf(o.x, o.y));
        const p = bfs(M, Math.floor(e.x), Math.floor(e.y), i => gem.has(i), 60);
        if (!p || p.length < 2) { e.hint = null; return; }
        const j = p[Math.min(3, p.length - 1)], tx = j % W + 0.5, ty = (j / W | 0) + 0.5;
        e.hint = Math.round(Math.atan2(ty - e.y, tx - e.x) * 100) / 100;
      };

      const api = {
        rate: 15,
        get over() { return over; },
        tick(dt) {
          if (over) return;
          t += dt; tickN++;
          if (timeLeft > 0) {
            timeLeft -= dt;
            if (timeLeft <= 0) { timeLeft = 0; endT = 1.4; ctx.sound('*', 'end'); ctx.toast('*', '⏱ 時間到！'); }
          } else { endT -= dt; if (endT <= 0) over = true; return; }
          for (const e of P) {
            e.off = !ctx.online(e.id);
            e.light = Math.max(0, e.light - dt); e.speed = Math.max(0, e.speed - dt); e.map = Math.max(0, e.map - dt); e.inv = Math.max(0, e.inv - dt);
            if (e.off) { e.d = [0, 0]; e.path = null; }
            if (e.path) {   // walking a route (bots): steer toward the next tile centre
              let wp = e.path[e.pk];
              while (wp != null && Math.hypot(wp % W + 0.5 - e.x, (wp / W | 0) + 0.5 - e.y) < 0.12) wp = e.path[++e.pk];
              if (wp == null) { e.path = null; e.d = [0, 0]; }
              else { const dx = wp % W + 0.5 - e.x, dy = (wp / W | 0) + 0.5 - e.y, l = Math.hypot(dx, dy); const s = Math.min(1, l / (spdOf(e) * dt)); e.d = [dx / l * s, dy / l * s]; }
            }
            const dl = Math.hypot(e.d[0], e.d[1]);
            if (dl > 0.05) moveEnt(M, e, e.d[0] / Math.max(1, dl), e.d[1] / Math.max(1, dl), spdOf(e) * Math.min(1, dl) * dt);
            const vx = (e.x - e.px) / dt, vy = (e.y - e.py) / dt;
            e.vx += (vx - e.vx) * 0.5; e.vy += (vy - e.vy) * 0.5; e.px = e.x; e.py = e.y;
            e.mv = Math.hypot(e.vx, e.vy) > 0.4;
            if (e.mv) e.fa = Math.atan2(e.vy, e.vx);
            if ((tickN + e.i) % 2 === 0) markEx(e, visOf(e));
            pickup(e);
            if (kid) {
              if (t - e.lastPick > 5) { e.hintT -= dt; if (e.hintT <= 0) { e.hintT = 0.6; hintFor(e); } }
              else e.hint = null;
            }
          }
          // ghosts
          for (const G of ghosts) {
            if (G.pause > 0) { G.pause -= dt; continue; }
            const tx = G.tx + 0.5, ty = G.ty + 0.5, dx = tx - G.x, dy = ty - G.y, d = Math.hypot(dx, dy), sp = (G.chase ? 2.9 : 2.2) * dt;
            if (d <= sp) { G.x = tx; G.y = ty; ghostNext(G); } else { G.x += dx / d * sp; G.y += dy / d * sp; }
            for (const e of P) {
              if (e.off || e.inv > 0 || Math.hypot(e.x - G.x, e.y - G.y) > 0.58) continue;
              const lose = Math.floor(e.score / 2);
              e.score -= lose; e.cnt -= Math.floor(e.cnt / 2); e.inv = 3; e.caught++;
              if (lose > 0) scatter(e, Math.min(6, Math.ceil(lose / 3)), lose);
              dropKey(e);
              ev(3, e.x, e.y, e.i, lose, 0);
              ctx.sound(e.id, 'buzz');
              G.pause = 1.4; const px = G.ptx, py = G.pty; G.ptx = G.tx; G.pty = G.ty; G.tx = px; G.ty = py; G.chase = false;
            }
          }
          // bumps (adult)
          if (!kid) for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) {
            const A = P[a], B = P[b]; if (A.off || B.off) continue;
            const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
            if (d > 0.62 || (A.bump[B.id] || 0) > t) continue;
            A.bump[B.id] = t + 1.5;
            const ux = d > 0.01 ? dx / d : 1, uy = d > 0.01 ? dy / d : 0;
            const aHits = A.vx * ux + A.vy * uy > 0.5, bHits = -(B.vx * ux + B.vy * uy) > 0.5;
            const victims = aHits && bHits ? [A, B] : aHits ? [B] : bHits ? [A] : [A, B];
            for (const v of victims) {
              if (v.inv > 0 || v.score <= 0) continue;
              const val = Math.min(2, v.score); v.score -= val; v.cnt = Math.max(0, v.cnt - 1);
              scatter(v, 1, val);
            }
            const push = (e, s) => { moveEnt(M, e, ux * s, uy * s, 0.35); e.pv++; };
            push(A, -1); push(B, 1);
            ev(4, (A.x + B.x) / 2, (A.y + B.y) / 2, A.i, B.i, 0);
            ctx.sound(A.id, 'flip'); ctx.sound(B.id, 'flip');
          }
          // respawns
          gemAcc += dt;
          const gemsNow = ents.reduce((n, o) => n + (o.k < 3 ? 1 : 0), 0);
          if (gemAcc >= C.respawn) { gemAcc = 0; if (gemsNow < gemTarget) addGem(4, false); }
          for (let k = pend.length - 1; k >= 0; k--) {
            if (pend[k].at > t) continue;
            if (pend[k].chest) placeChest(); else addEnt(freeTile(6, false), pend[k].k, 0, false);
            pend.splice(k, 1);
          }
          while (evs.length && t - evs[0].t > 1.5) evs.shift();
        },
        msg(id, d) {
          const e = byId[id]; if (!e || !d || over) return;
          if (typeof d.go === 'number' && d.go >= 0 && d.go < M.g.length && M.g[d.go] !== 1 && !e.off) {
            if (!e.path || e.path[e.path.length - 1] !== d.go) { const p = bfs(M, Math.floor(e.x), Math.floor(e.y), i => i === d.go, 400); e.path = p; e.pk = 1; if (!p) e.d = [0, 0]; }
          }
          if (Array.isArray(d.d) && d.d.length === 2) {
            e.path = null;
            const x = +d.d[0] / 100, y = +d.d[1] / 100;
            if (isFinite(x) && isFinite(y)) { const l = Math.hypot(x, y); e.d = l > 1 ? [x / l, y / l] : [x, y]; }
          }
          if (Array.isArray(d.p) && d.p.length === 2 && d.v === e.pv) {
            const cx = +d.p[0] / 100, cy = +d.p[1] / 100; if (!isFinite(cx) || !isFinite(cy)) return;
            e.d = [0, 0]; e.path = null;
            const now = t, dx = cx - e.x, dy = cy - e.y, dist = Math.hypot(dx, dy);
            const allow = Math.min(1.5, spdOf(e) * Math.max(0.05, now - e.lpt) * 1.3 + 0.12);
            e.lpt = now;
            if (dist > 1e-3) moveEnt(M, e, dx / dist, dy / dist, Math.min(dist, allow));
            if (Math.hypot(cx - e.x, cy - e.y) > 0.7) e.pv++;
          }
          if (d.rx) e.full = true;
          if (d.lay) e.lay = true;
        },
        leave(id) { const e = byId[id]; if (e) { e.d = [0, 0]; e.path = null; } },
        back(id) { const e = byId[id]; if (e) { e.full = true; e.d = [0, 0]; e.path = null; } },
        view(id) {
          const me = id == null ? null : byId[id];
          const v = { t: Math.round(ctx.now() * 1000) / 1000, kid, mz: [seed, W, H, M.ck], tl: Math.ceil(timeLeft), ids: P.map(e => e.id), me: me ? me.i : null };
          const vis = me ? visOf(me) : 1e9, R2 = (vis + 0.8) * (vis + 0.8);
          const near = (x, y) => !me || (x - me.x) * (x - me.x) + (y - me.y) * (y - me.y) <= R2;
          const PL = [];
          for (const e of P) {
            if (e !== me && !near(e.x, e.y)) continue;
            const fl = (e.light > 0 ? 1 : 0) | (e.speed > 0 ? 2 : 0) | (e.inv > 0 ? 4 : 0) | (e.off ? 8 : 0) | (e.key ? 16 : 0) | (e.mv ? 32 : 0) | (e.map > 0 ? 64 : 0);
            PL.push(e.i, Math.round(e.x * 100), Math.round(e.y * 100), Math.round(e.fa * 10), fl);
          }
          v.p = PL;
          if (me || pubN++ % 3 === 0) {
            const Gm = []; for (const o of ents) if (near(o.x, o.y)) Gm.push(o.id, Math.round(o.x * 10), Math.round(o.y * 10), o.k);
            v.g = Gm;
          }
          const Gh = []; for (const G of ghosts) if (near(G.x, G.y)) Gh.push(G.id, Math.round(G.x * 100), Math.round(G.y * 100), (G.chase ? 1 : 0) | (G.pause > 0 ? 2 : 0) | (G.fx < 0 ? 4 : 0));
          v.h = Gh;
          const lb = []; for (const e of P) lb.push(e.score, e.cnt, e.key ? 1 : 0);
          v.lb = lb;
          const E = [];
          for (const x of evs) if (!me || x.i === me.i || near(x.x, x.y)) E.push(x.q, x.k, Math.round(x.x * 10), Math.round(x.y * 10), x.i, x.v, x.id);
          v.ev = E;
          if (me) {
            v.lr = Math.round(lrOf(me) * 100) / 100; v.mr = me.map > 0 ? C.mapR : 0;
            v.it = [Math.ceil(me.light * 10), Math.ceil(me.speed * 10), Math.ceil(me.map * 10)];
            v.key = me.key ? 1 : 0; v.pv = me.pv; v.sp = Math.round(spdOf(me) * 100) / 100;
            if (me.full) { v.xa = exB64(me); me.full = false; me.xNew.length = 0; }
            else if (me.xNew.length) { v.xd = me.xNew.slice(); me.xNew.length = 0; }
            v.xn = me.xc;
            if (me.lay) { v.L = layoutStr(); me.lay = false; }
            if (kid && me.hint != null) v.hn = me.hint;
          }
          return v;
        },
        results() {
          return {
            rows: P.map(e => kid
              ? { id: e.id, key: e.score, line: `💎 撿到 ${e.cnt} 顆寶石${e.chests ? ` · 🧰×${e.chests}` : ''} · ${e.score} 分` }
              : { id: e.id, key: e.score, line: `${e.score} 分 · 💎${e.cnt}${e.chests ? ` · 🎁寶箱×${e.chests}` : ''} · 👻被抓 ${e.caught} 次` }),
            sub: kid ? '比一比誰撿到最多寶石分數！' : '寶石總分排名'
          };
        }
      };
      return api;
    },

    /* =================================================================== CLIENT */
    client(root, api) {
      injectCSS(); const SP = sprites();
      const pub = api.me == null, kid = api.kid, tv = api.isTable;
      root.innerHTML = `<div class="fg-root"><canvas class="fg-cv"></canvas><div class="fg-hud"></div></div>`;
      const box = root.firstChild, cv = box.querySelector('.fg-cv'), hud = box.querySelector('.fg-hud'), g = cv.getContext('2d');
      let cw = 0, ch = 0, dpr = 1, side = 0, raf = 0, alive = true, ppt = 40;
      let M = null, mzKey = '', torches = [], layAsk = 0;
      const snaps = []; let off = null, jit = 0.03, rclock = null;
      let ents = new Map(), parts = [], bubbles = [], lastQ = 0, pl = [], meI = null, lastV = null;
      let ex = null, hx = null, hxc = 0, rxAsk = 0;
      const chunks = new Map(); let chunkPPT = 0;
      const CH = 8;
      let lastFrame = performance.now(), lastTl = null, prevScore = null, prevKey = 0;
      // my explorer: predicted while I steer, otherwise follows the host
      const me = { x: 0, y: 0, ok: false, drive: false, idleT: 0, pv: -1, fa: Math.PI / 2, sentT: 0, sx: 0, sy: 0, hidden: new Map(), played: new Set() };
      let inX = 0, inY = 0;

      /* ---------- HUD ---------- */
      const el = {};
      if (pub) {
        hud.innerHTML = `<div class="fg-side" hidden><h3>🔦 迷霧尋寶</h3><div class="tm">0:00</div><div class="md">${kid ? '🧒 小朋友模式 · 撿寶石' : '🧑 大人模式 · 小心鬼魂 👻'}</div><div class="rows"></div>
          <div class="leg"><span><img alt="" src="${SP.gem[0].toDataURL()}">1 分</span><span><img alt="" src="${SP.gem[1].toDataURL()}">2 分</span><span><img alt="" src="${SP.gem[2].toDataURL()}">5 分</span><span>🧰 寶箱 ${kid ? 10 : 25} 分</span>${kid ? '' : '<span>🔑 開寶箱</span><span>👻 掉一半</span>'}</div></div>
          <div class="fg-chip fg-pubtop" hidden></div><div class="fg-bw"></div>`;
        el.side = hud.querySelector('.fg-side'); el.tm = hud.querySelector('.tm'); el.rows = hud.querySelector('.rows'); el.top = hud.querySelector('.fg-pubtop'); el.bw = hud.querySelector('.fg-bw');
      } else {
        hud.innerHTML = `<div class="fg-chip fg-me"></div><div class="fg-chip fg-time">0:00</div><div class="fg-chip fg-lb"></div><div class="fg-items"></div>
          <canvas class="fg-mm"></canvas><div class="fg-joy idle" hidden><b></b></div>
          <div class="fg-hint">👆 按住螢幕任何地方拖一拖，就會走路</div><div class="fg-bw"></div>`;
        el.me = hud.querySelector('.fg-me'); el.tm = hud.querySelector('.fg-time'); el.lb = hud.querySelector('.fg-lb'); el.items = hud.querySelector('.fg-items');
        el.mm = hud.querySelector('.fg-mm'); el.joy = hud.querySelector('.fg-joy'); el.knob = el.joy.querySelector('b'); el.hint = hud.querySelector('.fg-hint'); el.bw = hud.querySelector('.fg-bw');
        const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
        if (fine) el.hint.textContent = '⌨️ 方向鍵或 WASD 走路（也可以用滑鼠拖曳）';
      }
      const cache = {};
      const setHTML = (k, node, html) => { if (cache[k] !== html) { cache[k] = html; node.innerHTML = html; } };
      const showBig = (txt, sub, bad) => {
        if (!el.bw) return;
        const d = document.createElement('div'); d.className = 'fg-big' + (bad ? ' bad' : ''); d.innerHTML = esc(txt) + (sub ? `<small>${esc(sub)}</small>` : '');
        el.bw.innerHTML = ''; el.bw.appendChild(d); setTimeout(() => d.remove(), 1700);
      };

      /* ---------- input: floating joystick + keys ---------- */
      let joyPtr = null, jx0 = 0, jy0 = 0, hintGone = false;
      const hideHint = () => { if (!hintGone && el.hint) { hintGone = true; el.hint.style.opacity = 0; if (joyPtr == null && el.joy) el.joy.hidden = true; setTimeout(() => { if (el.hint) el.hint.hidden = true; }, 700); } };
      const showIdleJoy = () => {
        if (pub || !el.joy || joyPtr != null) return;
        el.joy.hidden = false; el.joy.classList.add('idle');
        el.joy.style.left = (cw / 2) + 'px'; el.joy.style.top = (ch - 110) + 'px'; el.knob.style.transform = '';
      };
      const setJoy = (cx, cy) => {
        const b = cv.getBoundingClientRect(), x = cx - b.left, y = cy - b.top, dx = x - jx0, dy = y - jy0, d = Math.hypot(dx, dy), R = 52;
        const k = d > R ? R / d : 1;
        el.knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
        if (d < 7) { inX = 0; inY = 0; return; }
        const m = Math.min(1, d / R);
        inX = dx / d * m; inY = dy / d * m;
        if (m > 0.5) { inX = dx / d; inY = dy / d; }   // most of the way out = full speed
      };
      const onDown = e => {
        if (pub) return;
        e.preventDefault();
        if (joyPtr != null) return;
        joyPtr = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) { }
        const b = cv.getBoundingClientRect(); jx0 = e.clientX - b.left; jy0 = e.clientY - b.top;
        el.joy.hidden = false; el.joy.classList.remove('idle'); el.joy.style.left = jx0 + 'px'; el.joy.style.top = jy0 + 'px'; el.knob.style.transform = '';
        hideHint();
      };
      const onMove = e => { if (e.pointerId === joyPtr) setJoy(e.clientX, e.clientY); };
      const onUp = e => {
        if (e.pointerId !== joyPtr) return;
        joyPtr = null; inX = 0; inY = 0; el.joy.hidden = true;
      };
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
      cv.addEventListener('contextmenu', e => e.preventDefault());
      const keys = {};
      const KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' };
      const onKey = e => {
        if (pub) return;
        const k = KEYMAP[e.code]; if (!k) return;
        e.preventDefault(); keys[k] = e.type === 'keydown';
        if (joyPtr == null) {
          const x = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), y = (keys.d ? 1 : 0) - (keys.u ? 1 : 0), l = Math.hypot(x, y) || 1;
          inX = x / l; inY = y / l;
        }
        hideHint();
      };
      addEventListener('keydown', onKey); addEventListener('keyup', onKey);
      setTimeout(() => { if (!hintGone) showIdleJoy(); }, 600);
      setTimeout(hideHint, 9000);

      /* ---------- world ---------- */
      const setMaze = m => {
        M = m; chunks.clear();
        ex = new Uint8Array(M.w * M.h); hx = new Uint8Array(M.w * M.h); hxc = 0;
        torches = []; for (let i = 0; i < M.g.length; i++) if (isTorch(M, i)) torches.push(i);
        mmBase = null;
      };
      const getChunk = (cx, cy) => {
        const key = cx + ',' + cy; let c = chunks.get(key);
        if (c) { chunks.delete(key); chunks.set(key, c); return c; }
        c = document.createElement('canvas'); c.width = c.height = CH * ppt;
        const cg = c.getContext('2d'); cg.setTransform(ppt / U, 0, 0, ppt / U, -cx * CH * ppt, -cy * CH * ppt);
        paintTiles(cg, M, cx * CH, cy * CH, cx * CH + CH, cy * CH + CH);
        chunks.set(key, c);
        const max = pub ? 64 : 14;
        while (chunks.size > max) chunks.delete(chunks.keys().next().value);
        return c;
      };

      /* explored memory (mine) + minimap */
      let mmBase = null, mmS = 3, mmDirty = true;
      const MMC = ['#c9a77a', '#4a3f5c', '#d9965a'];
      const mmTile = i => { if (!mmBase) return; const m = mmBase.getContext('2d'); m.fillStyle = MMC[M.g[i]]; m.fillRect((i % M.w) * mmS, (i / M.w | 0) * mmS, mmS, mmS); mmDirty = true; };
      const explore = i => { if (!ex[i]) { ex[i] = 1; mmTile(i); } };
      const markLocal = (x, y, rad) => {
        if (!M) return;
        const R2 = (rad + 0.5) * (rad + 0.5), W = M.w;
        for (let ty = Math.max(0, Math.floor(y - rad - 1)); ty <= Math.min(M.h - 1, Math.floor(y + rad + 1)); ty++)
          for (let tx = Math.max(0, Math.floor(x - rad - 1)); tx <= Math.min(W - 1, Math.floor(x + rad + 1)); tx++) {
            const dx = tx + 0.5 - x, dy = ty + 0.5 - y; if (dx * dx + dy * dy <= R2) explore(ty * W + tx);
          }
      };
      const ensureMM = () => {
        if (mmBase || !M || pub) return;
        mmS = cl(Math.floor(Math.min(130, cw * 0.32) / M.w), 2, 4);
        mmBase = document.createElement('canvas'); mmBase.width = M.w * mmS; mmBase.height = M.h * mmS;
        for (let i = 0; i < ex.length; i++) if (ex[i]) mmTile(i);
        el.mm.width = mmBase.width; el.mm.height = mmBase.height; el.mm.style.width = mmBase.width + 'px'; el.mm.style.height = mmBase.height + 'px';
      };
      const drawMM = now => {
        if (!mmBase) return;
        const m = el.mm.getContext('2d');
        m.clearRect(0, 0, el.mm.width, el.mm.height); m.drawImage(mmBase, 0, 0);
        const x = me.x * mmS, y = me.y * mmS, b = 0.5 + 0.5 * Math.sin(now * 8);
        m.fillStyle = `rgba(255,220,120,${0.35 + b * 0.3})`; m.beginPath(); m.arc(x, y, mmS * 2.6, 0, TAU); m.fill();
        const C = PARTY_COLORS[colOf(meI) % 6];
        m.fillStyle = '#fff'; m.beginPath(); m.arc(x, y, mmS * 1.5, 0, TAU); m.fill();
        m.fillStyle = C.c; m.beginPath(); m.arc(x, y, mmS * 1.05, 0, TAU); m.fill();
      };

      const player = i => pl[i] || null;
      const colOf = i => { const p = player(i); return p ? p.col : (i || 0); };

      /* ---------- events / feedback ---------- */
      const burst = (x, y, cols, n, spd) => {
        for (let k = 0; k < n && parts.length < 140; k++) {
          const a = Math.random() * TAU, v = spd * (0.4 + Math.random() * 0.8);
          parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.45 + Math.random() * 0.4, c: cols[Math.random() * cols.length | 0], r: 0.05 + Math.random() * 0.06 });
        }
      };
      const GEMCOL = [['#4fd8ff', '#c9f4ff'], ['#ff5c93', '#ffd0e0'], ['#ffd23f', '#fff4c0']];
      const bubble = (x, y, txt, col, big) => { if (bubbles.length < 24) bubbles.push({ x, y, t: performance.now() / 1000, txt, col, big }); };
      const gemFx = (x, y, k, v, mine) => {
        burst(x, y, GEMCOL[Math.min(2, k)], mine ? 10 : 6, 2.2);
        bubble(x, y, kid ? (mine ? `叮！+${v}` : '叮！') : `+${v}`, GEMCOL[Math.min(2, k)][0]);
      };
      const onEvents = E => {
        for (let k = 0; k < E.length; k += 7) {
          const q = E[k]; if (q <= lastQ) continue;
          const kind = E[k + 1], x = E[k + 2] / 10, y = E[k + 3] / 10, i = E[k + 4], v = E[k + 5], id = E[k + 6], mine = i === meI && !pub;
          if (kind === 1) {
            if (mine && me.played.has(id)) continue;
            if (mine) { api.sfx(v >= 5 ? 'coin' : 'eat', v >= 2 ? 6 : 2); api.vibrate(v >= 5 ? 30 : 12); me.played.add(id); }
            const o = ents.get(id); gemFx(x, y, o ? o.k : v >= 5 ? 2 : v >= 2 ? 1 : 0, v, mine);
          } else if (kind === 2) {
            burst(x, y, ['#fff3b0', '#ffd166', '#ffffff'], 16, 2.6);
            if (mine) { api.sfx('star'); api.vibrate(40); showBig(ITEM_EMO[v] + ' ' + ITEM_NAME[v].split('！')[0] + '！', ITEM_NAME[v].split('！')[1] || ''); }
            else bubble(x, y, ITEM_EMO[v], '#ffd166', 1);
          } else if (kind === 3) {
            burst(x, y, ['#dfe6ff', '#aab8ff', '#ffffff'], 18, 3);
            bubble(x, y, '👻 嚇！', '#bcd0ff', 1);
            if (mine) { api.sfx('boom'); api.vibrate(300); showBig('👻 哇！被鬼抓到了', v ? `掉了 ${v} 分的寶石，快撿回來！` : '還好你身上沒有寶石', true); }
          } else if (kind === 4) {
            burst(x, y, ['#ffffff', '#ffd166'], 8, 2);
            bubble(x, y, '碰！', '#ff8a5c');
            if (i === meI || v === meI) { if (!pub) { api.vibrate(60); } }
          } else if (kind === 5) {
            burst(x, y, ['#ffd23f', '#fff4c0', '#ff9a2e', '#ffffff'], 30, 3.5);
            bubble(x, y, `🎁 +${v}`, '#ffd23f', 1);
            if (mine) { api.sfx('win'); api.vibrate(120); showBig(`🎁 寶箱 +${v}！`, '太厲害了！'); }
            else if (pub || tv) api.sfx('star');
          } else if (kind === 6) {
            burst(x, y, ['#ffd23f', '#ffffff'], 14, 2.5);
            if (mine) { api.sfx('turn'); api.vibrate(50); showBig('🔑 拿到鑰匙！', '快去找上鎖的寶箱'); }
            else bubble(x, y, '🔑', '#ffd23f', 1);
          }
        }
        for (let k = 0; k < E.length; k += 7) if (E[k] > lastQ) lastQ = E[k];
      };

      const updateHud = v => {
        const n = v.ids.length, lb = v.lb;
        const order = [...Array(n).keys()].sort((a, b) => lb[b * 3] - lb[a * 3] || a - b);
        const tl = v.tl, hot = tl <= 10 && tl > 0;
        if (lastTl !== null && tl !== lastTl && tl <= 5 && tl > 0) api.sfx('tick');
        if (lastTl !== null && tl !== lastTl && tl === 10) showBig('最後 10 秒！');
        lastTl = tl;
        if (pub) {
          const wide = cw >= 700;
          el.side.hidden = !wide; el.top.hidden = wide;
          if (wide) {
            side = Math.min(340, Math.max(250, cw * 0.21)); el.side.style.width = side + 'px';
            setHTML('tm', el.tm, '⏱ ' + fmtT(tl)); el.tm.classList.toggle('hot', hot);
            setHTML('rows', el.rows, order.map((i, r) => {
              const p = player(i);
              return `<div class="r ${r === 0 && lb[i * 3] > 0 ? 'first' : ''}"><span class="k">${r === 0 && lb[i * 3] > 0 ? '👑' : r + 1}</span><img alt="" src="${api.avatar(p, 96)}"><div class="n">${esc(p ? p.name : '?')}<small>💎 ${lb[i * 3 + 1]} 顆${lb[i * 3 + 2] ? ' · 🔑 有鑰匙' : ''}</small></div><span class="v">${lb[i * 3]}</span></div>`;
            }).join(''));
          } else {
            side = 0;
            setHTML('top', el.top, `<span>⏱ ${fmtT(tl)}</span>` + order.slice(0, 4).map((i, r) => `<span>${r === 0 ? '👑' : r + 1 + '.'}${esc(player(i) ? player(i).name : '?')} ${lb[i * 3]}</span>`).join(''));
          }
          return;
        }
        const i = meI, score = lb[i * 3], cnt = lb[i * 3 + 1];
        const rank = order.indexOf(i) + 1, p = player(i);
        setHTML('me', el.me, `<img alt="" src="${api.avatar(p, 96)}"><div><div class="big">${score}<small>分</small></div><div class="sm">${n > 1 ? `<span class="rk">第 ${rank} 名</span>` : ''}💎 ${cnt} 顆</div></div>`);
        if (prevScore !== null && score > prevScore) { el.me.classList.remove('pop'); void el.me.offsetWidth; el.me.classList.add('pop'); }
        prevScore = score;
        setHTML('tm', el.tm, '⏱ ' + fmtT(tl)); el.tm.classList.toggle('hot', hot);
        if (n > 1) setHTML('lb', el.lb, order.slice(0, 6).map(j => { const q = player(j); return `<div class="r ${j === i ? 'me' : ''}"><img alt="" src="${api.avatar(q, 48)}"><span class="n">${esc(q ? q.name : '?')}${lb[j * 3 + 2] ? '🔑' : ''}</span><span class="v">${lb[j * 3]}</span></div>`; }).join(''));
        else el.lb.hidden = true;
        const it = v.it || [0, 0, 0], bar = (k, tot) => `<i><s style="width:${Math.round(k / 10 / tot * 100)}%"></s></i>`;
        let h = '';
        if (it[0] > 0) h += `<div class="fg-it"><b>🔦</b>${Math.ceil(it[0] / 10)}s${bar(it[0], LAMP_T)}</div>`;
        if (it[1] > 0) h += `<div class="fg-it"><b>👟</b>${Math.ceil(it[1] / 10)}s${bar(it[1], SHOE_T)}</div>`;
        if (it[2] > 0) h += `<div class="fg-it"><b>🗺️</b>${Math.ceil(it[2] / 10)}s${bar(it[2], MAP_T)}</div>`;
        if (v.key) h += `<div class="fg-it key"><b>🔑</b>快找寶箱！</div>`;
        setHTML('items', el.items, h);
        el.items.style.top = (el.me.offsetHeight + 18) + 'px';
        if (v.key && !prevKey) { /* fx in event */ }
        prevKey = v.key;
      };

      /* ---------- interpolation ---------- */
      const at = rt => {
        if (!snaps.length) return { P: [], H: [] };
        let A = snaps[0], B = null;
        for (let k = snaps.length - 1; k >= 0; k--) if (snaps[k].t <= rt) { A = snaps[k]; B = snaps[k + 1] || null; break; }
        if (!B && snaps.length >= 2 && A === snaps[snaps.length - 1]) { B = A; A = snaps[snaps.length - 2]; rt = Math.min(rt, B.t + 0.15); }
        const al = B ? cl((rt - A.t) / (B.t - A.t || 1), 0, 1.8) : 0;
        const lerp = (a, b, f) => { if (!a || Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 2) return { ...b }; return { ...b, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; };
        const S = B || A, Pp = [], Hh = [];
        for (const k in S.P) Pp.push(B ? lerp(A.P[k], S.P[k], al) : { ...S.P[k] });
        for (const k in S.H) Hh.push(B ? lerp(A.H[k], S.H[k], al) : { ...S.H[k] });
        return { P: Pp, H: Hh };
      };

      /* ---------- drawing ---------- */
      const drawExplorer = (e, z, now, isMe) => {
        const p = player(e.i), col = colOf(e.i), animal = p ? p.animal : e.i, r = 0.37 * U * (pub ? 1.3 : 1);
        const x = e.x * U, y = e.y * U, face = e.fa;
        const blink = (e.fl & 4) && Math.floor(now * 10) % 2;
        if (!blink) {
          drawCritter(g, x, y - 4, r, col, animal, { face, moving: !!(e.fl & 32) || (isMe && me.drive), alpha: e.fl & 8 ? 0.55 : 1 });
          const side = Math.cos(face) >= 0 ? 1 : -1, ls = 30 + (e.fl & 1 ? 8 : 0), sw = Math.sin(now * 3 + e.i) * 2;
          g.drawImage(SP.lantern, x + side * r * 0.95 - ls / 2, y - 2 + sw - ls / 2, ls, ls);
        }
        if (e.fl & 2) { g.fillStyle = 'rgba(255,255,255,.6)'; for (let k = 0; k < 3; k++) { const a = Math.cos(e.fa + Math.PI), b = Math.sin(e.fa + Math.PI); g.fillRect(x + a * (r + 8 + k * 7) - 4, y + b * (r + 8) + (k - 1) * 9, 8, 2.5); } }
        if (e.fl & 16) { g.font = `${26}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('🔑', x + r * 0.9, y - r * 0.6); }
        if (!isMe || pub) {
          const fs = (tv ? 16 : 13) / z, yy = y - r * 1.55;
          g.font = `900 ${fs}px "Noto Sans TC",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom';
          const name = (p ? p.name : '?') + (e.fl & 8 ? ' 💤' : '');
          g.lineWidth = 4 / z; g.strokeStyle = 'rgba(20,12,30,.85)'; g.lineJoin = 'round'; g.strokeText(name, x, yy);
          g.fillStyle = mixCol(PARTY_COLORS[col % 6].c, 0.45); g.fillText(name, x, yy);
        }
      };
      const drawEnts = (rect, now, minS) => {
        for (const o of ents.values()) {
          if (o.x < rect[0] - 1 || o.x > rect[2] + 1 || o.y < rect[1] - 1 || o.y > rect[3] + 1) continue;
          const hid = me.hidden.get(o.id); if (hid && now - hid < 1.2) continue;
          const age = now - o.t0, grow = age < 0.4 ? age / 0.4 : 1, bob = Math.sin(now * 3 + o.id) * 3;
          const x = o.x * U, y = o.y * U;
          if (o.k < 3) { const s = Math.max(58, minS) * grow * (1 + Math.sin(now * 4 + o.id) * 0.06); g.drawImage(SP.gem[o.k], x - s / 2, y - s / 2 + bob * 0.6, s, s); }
          else if (o.k === K_CHEST) { const s = Math.max(84, minS * 1.4) * grow; g.drawImage(SP.chest[kid ? 0 : 1], x - s / 2, y - s / 2 - 4, s, s); }
          else { const s = Math.max(64, minS * 1.1) * grow; g.drawImage(SP.item[o.k], x - s / 2, y - s / 2 + bob, s, s); }
        }
      };
      const drawGhost = (h, now, minS) => {
        const s = Math.max(80, minS * 1.4), bob = Math.sin(now * 3 + h.id * 2) * 6, x = h.x * U, y = h.y * U - 10 + bob;
        g.save(); g.globalAlpha = h.st & 2 ? 0.55 : 0.88; g.translate(x, y); if (h.st & 4) g.scale(-1, 1);
        g.drawImage(SP.ghost[h.st & 1], -s / 2, -s / 2, s, s); g.restore();
      };
      const drawFx = (dt, now, z) => {
        for (let k = parts.length - 1; k >= 0; k--) {
          const p = parts[k]; p.t += dt; if (p.t >= p.life) { parts.splice(k, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9;
          g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.c; g.beginPath(); g.arc(p.x * U, p.y * U, Math.max(p.r * U, 2.5 / z), 0, TAU); g.fill();
        }
        g.globalAlpha = 1; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let k = bubbles.length - 1; k >= 0; k--) {
          const b = bubbles[k], q = (now - b.t) / 1; if (q >= 1) { bubbles.splice(k, 1); continue; }
          const s = (b.big ? 30 : 24) / Math.max(z, 0.35) * (q < 0.15 ? q / 0.15 * 1.15 : 1);
          g.globalAlpha = q > 0.7 ? (1 - q) / 0.3 : 1;
          g.font = `900 ${s}px "Fredoka","Noto Sans TC",system-ui,sans-serif`;
          const y = b.y * U - 34 - q * 46;
          g.lineWidth = s * 0.2; g.strokeStyle = 'rgba(30,18,40,.9)'; g.lineJoin = 'round'; g.strokeText(b.txt, b.x * U, y);
          g.fillStyle = b.col || '#fff'; g.fillText(b.txt, b.x * U, y);
        }
        g.globalAlpha = 1;
      };

      let mmT = 0, exT = 0;
      const frame = () => {
        if (!alive) return;
        raf = requestAnimationFrame(frame);
        const nowMs = performance.now(), dt = Math.min(0.1, (nowMs - lastFrame) / 1000), now = nowMs / 1000; lastFrame = nowMs;
        const w = box.clientWidth, h = box.clientHeight;
        if (!w || !h) return;
        const pr = Math.min(tv ? 1.5 : 2, devicePixelRatio || 1);
        if (w !== cw || h !== ch || pr !== dpr) { cw = w; ch = h; dpr = pr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = '#07060c'; g.fillRect(0, 0, cv.width, cv.height);
        const v = snaps[snaps.length - 1];
        if (!v || !M) return;
        const target = now - (off || 0) - cl(1 / 15 + jit + 0.02, 0.09, 0.3);
        if (rclock == null || Math.abs(target - rclock) > 0.6) rclock = target;
        else { rclock += dt; rclock += (target - rclock) * Math.min(1, dt * 2); }
        const S = at(rclock);

        // my explorer
        let myE = null;
        if (!pub) {
          const sv = v.P[meI];
          if (sv) {
            if (!me.ok) { me.x = sv.x; me.y = sv.y; me.ok = true; }
            if (v.pv !== me.pv) { me.pv = v.pv; me.x = sv.x; me.y = sv.y; }
            const want = Math.hypot(inX, inY) > 0.05;
            if (want) {
              if (!me.drive) { me.drive = true; }
              me.idleT = 0;
              const l = Math.max(1, Math.hypot(inX, inY));
              moveEnt(M, me, inX / l, inY / l, (v.sp || 4) * Math.min(1, Math.hypot(inX, inY)) * dt);
              me.fa = Math.atan2(inY, inX);
            } else if (me.drive) { me.idleT += dt; if (me.idleT > 0.35) me.drive = false; }
            if (me.drive) {
              if ((now - me.sentT > 0.05 && (Math.abs(me.x - me.sx) > 0.005 || Math.abs(me.y - me.sy) > 0.005)) || now - me.sentT > 0.5) {
                me.sentT = now; me.sx = me.x; me.sy = me.y;
                api.send({ p: [Math.round(me.x * 100), Math.round(me.y * 100)], v: me.pv });
              }
              // grab gems right away (the host confirms a moment later)
              for (const o of ents.values()) if (o.k < 3 && !me.hidden.has(o.id) && Math.hypot(o.x - me.x, o.y - me.y) < (kid ? 0.55 : 0.45)) {
                me.hidden.set(o.id, now); me.played.add(o.id);
                api.sfx(o.k === 2 ? 'coin' : 'eat', o.k ? 6 : 2); api.vibrate(o.k === 2 ? 30 : 12);
                gemFx(o.x, o.y, o.k, GEMV[o.k], true);
              }
            } else {
              const f = Math.min(1, dt * 12); me.x += (sv.x - me.x) * f; me.y += (sv.y - me.y) * f;
              if (Math.abs(sv.x - me.x) + Math.abs(sv.y - me.y) > 3) { me.x = sv.x; me.y = sv.y; }
              if (sv.fl & 32) me.fa = sv.fa;
            }
            myE = { i: meI, x: me.x, y: me.y, fa: me.fa, fl: sv.fl | (me.drive ? 32 : 0) };
          }
          if (now - exT > 0.08 && me.ok) { exT = now; markLocal(me.x, me.y, Math.max(v.lr || 3, v.mr || 0)); }
          for (const [id, tt] of me.hidden) if (now - tt > 1.5) me.hidden.delete(id);
        }

        // camera
        let z, camX, camY, ax, ay;
        if (pub) {
          const aw = cw - side, pad = 18, top = side ? 0 : 44;
          const tpx = Math.min((aw - pad * 2) / M.w, (ch - pad * 2 - top) / M.h);
          ppt = Math.max(4, Math.floor(tpx * dpr));
          camX = M.w / 2; camY = M.h / 2; ax = aw / 2; ay = top + (ch - top) / 2;
        } else {
          const tpx = Math.min(cw, ch) / (kid ? 8.2 : 9);
          ppt = Math.max(8, Math.round(tpx * dpr));
          camX = me.x; camY = me.y; ax = cw / 2; ay = ch / 2 + (ch > cw ? 20 : 10);
        }
        if (ppt !== chunkPPT) { chunkPPT = ppt; chunks.clear(); }
        z = ppt / dpr;
        const ox = Math.round(ax * dpr - camX * ppt), oy = Math.round(ay * dpr - camY * ppt);
        const rect = [-ox / ppt, -oy / ppt, (cv.width - ox) / ppt, (cv.height - oy) / ppt];
        // maze chunks
        const c0 = Math.max(0, Math.floor(rect[0] / CH)), c1 = Math.min(Math.ceil(M.w / CH) - 1, Math.floor(rect[2] / CH));
        const r0 = Math.max(0, Math.floor(rect[1] / CH)), r1 = Math.min(Math.ceil(M.h / CH) - 1, Math.floor(rect[3] / CH));
        for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) g.drawImage(getChunk(cx, cy), ox + cx * CH * ppt, oy + cy * CH * ppt);
        const k = ppt / U;
        g.setTransform(k, 0, 0, k, ox, oy);
        const zz = ppt / dpr / U;   // css px per world unit
        // torch flicker
        g.globalCompositeOperation = 'lighter';
        for (const i of torches) {
          const tx = i % M.w, ty = i / M.w | 0; if (tx < rect[0] - 2 || tx > rect[2] + 2 || ty < rect[1] - 2 || ty > rect[3] + 2) continue;
          if (!pub && !ex[i]) continue;
          const f = 1 + Math.sin(now * 9 + i) * 0.06 + Math.sin(now * 23 + i * 3) * 0.04, s = 150 * f;
          g.drawImage(SP.torchGlow, tx * U + U / 2 - s / 2, (ty + 1) * U - 8 - s / 2, s, s);
        }
        if (pub) {
          g.globalCompositeOperation = 'source-over';
          g.fillStyle = 'rgba(14,8,30,.34)'; g.fillRect(0, 0, M.w * U, M.h * U);
          g.globalCompositeOperation = 'lighter';
          for (const e of S.P) { const s = (e.fl & 1 ? 3.6 : 2.6) * 2 * U; g.drawImage(SP.glow, e.x * U - s / 2, e.y * U - s / 2, s, s); }
        }
        g.globalCompositeOperation = 'source-over';
        const minS = pub ? 18 / zz : 0;
        drawEnts(rect, now, minS);
        const list = S.P.filter(e => e.i !== meI);
        list.sort((a, b) => a.y - b.y);
        for (const e of list) drawExplorer(e, zz, now, false);
        if (myE) drawExplorer(myE, zz, now, true);
        for (const hh of S.H) drawGhost(hh, now, minS);
        if (pub && v.ids.length > 1) {
          let bi = -1, bl = 0; for (let i = 0; i < v.ids.length; i++) if (v.lb[i * 3] > bl) { bl = v.lb[i * 3]; bi = i; }
          const e = S.P.find(q => q.i === bi);
          if (e) { g.font = `${34}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('👑', e.x * U, e.y * U - 0.37 * U * 2.3 - 8); }
        }
        if (!pub && myE) {
          // darkness: one radial gradient — warm lantern tint inside, dim memory outside, soft edge
          g.setTransform(1, 0, 0, 1, 0, 0);
          const sx = ox + me.x * ppt, sy = oy + me.y * ppt, lr = (v.lr || 3) * (1 + Math.sin(now * 5.3) * 0.012 + Math.sin(now * 13) * 0.008), mr = v.mr || 0;
          const Rr = Math.max(lr, mr) * ppt, dark = kid ? 0.76 : 0.84;
          const gr = g.createRadialGradient(sx, sy, 0, sx, sy, Rr), f = lr * ppt / Rr;
          gr.addColorStop(0, 'rgba(255,190,110,.12)');
          gr.addColorStop(f * 0.55, 'rgba(255,170,90,.04)');
          gr.addColorStop(f * 0.62, 'rgba(10,6,22,0)');
          if (mr > lr) { gr.addColorStop(f, 'rgba(14,16,40,.28)'); gr.addColorStop(1, `rgba(8,8,28,${dark})`); }
          else gr.addColorStop(1, `rgba(8,8,28,${dark})`);
          g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
          // never-seen tiles stay pitch black
          g.fillStyle = '#07060c'; g.beginPath();
          const tx0 = Math.max(0, Math.floor(rect[0])), tx1 = Math.min(M.w - 1, Math.floor(rect[2])), ty0 = Math.max(0, Math.floor(rect[1])), ty1 = Math.min(M.h - 1, Math.floor(rect[3]));
          for (let ty = ty0; ty <= ty1; ty++) {
            let run = -1;
            for (let tx = tx0; tx <= tx1 + 1; tx++) {
              const unk = tx <= tx1 && !ex[ty * M.w + tx];
              if (unk && run < 0) run = tx;
              else if (!unk && run >= 0) { g.rect(ox + run * ppt, oy + ty * ppt, (tx - run) * ppt, ppt); run = -1; }
            }
          }
          g.fill();
          g.setTransform(k, 0, 0, k, ox, oy);
          // gentle hint arrow (kid mode)
          if (v.hn != null && !me.drive) {
            const a = v.hn, bo = Math.sin(now * 5) * 8, d = 0.37 * U * 2.4 + bo, x = me.x * U + Math.cos(a) * d, y = me.y * U + Math.sin(a) * d, s = 22;
            g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha = 0.85 + Math.sin(now * 5) * 0.15;
            g.fillStyle = '#ffd166'; g.strokeStyle = '#6b3f00'; g.lineWidth = 4; g.lineJoin = 'round';
            g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * 0.4, -s * 0.85); g.lineTo(-s * 0.4, -s * 0.35); g.lineTo(-s * 1.1, -s * 0.35); g.lineTo(-s * 1.1, s * 0.35); g.lineTo(-s * 0.4, s * 0.35); g.lineTo(-s * 0.4, s * 0.85); g.closePath();
            g.stroke(); g.fill(); g.restore();
            g.font = '900 20px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            const tx = me.x * U + Math.cos(a) * (d + 40), ty = me.y * U + Math.sin(a) * (d + 40);
            g.lineWidth = 5; g.strokeStyle = 'rgba(30,18,40,.9)'; g.strokeText('💎這邊', tx, ty); g.fillStyle = '#fff'; g.fillText('💎這邊', tx, ty);
          }
        }
        drawFx(dt, now, zz);
        if (pub) {   // vignette for the cosy cave look
          g.setTransform(1, 0, 0, 1, 0, 0);
          const W2 = (cw - side) * dpr, cx = W2 / 2, cyy = cv.height / 2, R = Math.hypot(cx, cyy);
          const gr = g.createRadialGradient(cx, cyy, R * 0.55, cx, cyy, R);
          gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)');
          g.fillStyle = gr; g.fillRect(0, 0, W2, cv.height);
        }
        if (!pub && now - mmT > 0.15) { mmT = now; ensureMM(); drawMM(now); }
      };
      raf = requestAnimationFrame(frame);

      return {
        view(v) {
          if (!v || !v.ids || !v.mz) return;
          const now = performance.now() / 1000;
          pl = v.ids.map(id => api.player(id));
          meI = v.me;
          // maze from the seed (or the raw layout if this copy doesn't match)
          const [seed, W, H, ck] = v.mz, key = v.mz.join('/');
          if (key !== mzKey) {
            if (v.L && v.L.length === W * H) { setMaze(fromLayout(v.L, W, H)); mzKey = key; }
            else {
              const m = getMaze(seed, W, H, kid);
              if (m.ck === ck) { setMaze(m); mzKey = key; }
              else if (!pub && now - layAsk > 1) { layAsk = now; api.send({ lay: 1 }); }
            }
          }
          if (!M) return;
          // explored memory from the host
          if (!pub) {
            if (v.xa) {
              const s = atob(v.xa); hx.fill(0); hxc = 0;
              for (let i = 0; i < hx.length; i++) if (s.charCodeAt(i >> 3) & (1 << (i & 7))) { hx[i] = 1; hxc++; explore(i); }
            }
            if (v.xd) for (const i of v.xd) if (i >= 0 && i < hx.length && !hx[i]) { hx[i] = 1; hxc++; explore(i); }
            if (v.xn !== hxc && now - rxAsk > 1.5) { rxAsk = now; api.send({ rx: 1 }); }
          }
          const d = now - v.t;
          if (off == null || d < off) off = d; else off += (d - off) * 0.005;
          const late = d - off; jit = late > jit ? late : jit + (late - jit) * 0.02;
          v.P = {}; for (let k = 0; k < v.p.length; k += 5) v.P[v.p[k]] = { i: v.p[k], x: v.p[k + 1] / 100, y: v.p[k + 2] / 100, fa: v.p[k + 3] / 10, fl: v.p[k + 4] };
          v.H = {}; for (let k = 0; k < v.h.length; k += 4) v.H[v.h[k]] = { id: v.h[k], x: v.h[k + 1] / 100, y: v.h[k + 2] / 100, st: v.h[k + 3] };
          if (snaps.length && v.t <= snaps[snaps.length - 1].t) snaps.length = 0;
          snaps.push(v); if (snaps.length > 6) snaps.shift();
          if (v.g) {
            const nm = new Map();
            for (let k = 0; k < v.g.length; k += 4) { const id = v.g[k], o = ents.get(id); nm.set(id, o ? Object.assign(o, { x: v.g[k + 1] / 10, y: v.g[k + 2] / 10 }) : { id, x: v.g[k + 1] / 10, y: v.g[k + 2] / 10, k: v.g[k + 3], t0: now }); }
            ents = nm;
          }
          if (v.ev && v.ev.length) onEvents(v.ev);
          lastV = v;
          updateHud(v);
        },
        destroy() {
          alive = false; cancelAnimationFrame(raf);
          removeEventListener('keydown', onKey); removeEventListener('keyup', onKey);
          chunks.clear();
        }
      };
    },

    bot(v, api) {
      if (!v || v.me == null || !v.mz || !v.p) return;
      let my = null; for (let k = 0; k < v.p.length; k += 5) if (v.p[k] === v.me) my = { x: v.p[k + 1] / 100, y: v.p[k + 2] / 100 };
      if (!my) return;
      const M = getMaze(v.mz[0], v.mz[1], v.mz[2], v.kid); if (M.ck !== v.mz[3]) return;
      const W = M.w, st = BOT[api.me] || (BOT[api.me] = { tgt: null, t: 0 });
      const sx = Math.floor(my.x), sy = Math.floor(my.y);
      const want = new Set();
      if (v.g) for (let k = 0; k < v.g.length; k += 4) { const kk = v.g[k + 3]; if (kk === K_CHEST && !v.key && !v.kid) continue; want.add(Math.floor(v.g[k + 2] / 10) * W + Math.floor(v.g[k + 1] / 10)); }
      const cur = sy * W + sx;
      let path = want.size ? bfs(M, sx, sy, i => want.has(i), 30) : null;
      if (path) st.tgt = path[path.length - 1];
      else if (st.tgt == null || st.tgt === cur || Math.random() < 0.03 || M.g[st.tgt] === 1) { let i; do { i = Math.random() * M.g.length | 0; } while (M.g[i] === 1); st.tgt = i; }
      api.send({ go: st.tgt });
    }
  });
  const BOT = {};
})();
