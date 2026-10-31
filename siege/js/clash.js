// 萬軍守城 — 大軍對決：兩邊大軍在中間撞成一條戰線，人多的那邊往前推
// 戰場分成 CL_NC 路，每一路記：戰線位置 f、頂在戰線上的藍軍 b、紅軍 r。
// 小兵一隊一隊從砲台射出去（一團 blob），穿過門變多，碰到戰線就加進那一路的藍軍。
// 兩側走廊的門要「戰線推過去」才拿得到：越往前推，走廊越長、加越多。
'use strict';

const CL_NC = 7, CL_FW = 2.75, CL_CW = CL_FW * 2 / CL_NC;
const CL_COR = 3.45, CL_CORW = 0.5, CL_WALL = 2.86;   // 走廊中心、半寬、走廊和戰場中間的矮牆
const CL_FENCE = 7, CL_TOP = DEF_Z_BASE - 1.8;          // 走廊從柵欄開始；戰線最遠推到基地前
const CL_MIDZ = 4.4, CL_SPD = 7;
const CL_K = { kill: 0.9, move: 1.7, soft: 25, castle: 0.25, base: 0.5, home: 2, rb: 0.4, diffB: 1.0, diffR: 0.4, smooth: 1.2 };

// L：左走廊（黃色 +），R：右走廊（藍色 ×），mid：中間紫門。swap：左右對調
const CSTAGES = [
  { name: '平原會戰', theme: 0, feed: 6, ramp: 0.5, base: 2600, castle: 300, mid: 9, L: [5, 7, 9, 12, 16, 20, 26, 32], R: [2, 2, 2, 2], tip: '紅軍一大片衝過來！小兵碰到戰線就會往前推。走廊的門要戰線推過去才拿得到' },
  { name: '沙丘夾擊', theme: 1, feed: 13, ramp: 0.6, base: 3800, castle: 320, mid: 12, L: [6, 8, 11, 14, 18, 24, 30, 40], R: [2, 2, 2, 2, 3], surge: 1, swap: 1, tip: '紅色箭頭那一路會猛衝，快把小兵送過去頂住' },
  { name: '冰原紅海', theme: 2, feed: 16, ramp: 0.7, base: 5200, castle: 340, mid: 14, L: [8, 10, 13, 17, 22, 28, 36, 46], R: [2, 2, 2, 2, 2], surge: 1, brute: 1, tip: '紅軍巨兵一上來，那一路就會被壓下去' },
  { name: '霓虹決戰', theme: 3, feed: 26, ramp: 0.8, base: 6800, castle: 360, mid: 18, midW: 0.9, slide: 1, L: [9, 12, 16, 20, 26, 34, 44, 56], R: [2, 2, 2, 3, 3], surge: 1, swap: 1, tip: '中間的紫門會左右跑' },
  { name: '熔岩大軍', theme: 4, feed: 13, ramp: 0.9, base: 8800, castle: 380, mid: 20, L: [10, 14, 18, 24, 30, 40, 52, 66], R: [2, 2, 3, 2, 3], kill: 1, surge: 1, brute: 1, tip: '走廊裡有 ✕ 門，戰線推過去前先別走那邊' },
  { name: '天空總決戰', theme: 5, feed: 13, ramp: 1.0, base: 11000, castle: 400, mid: 24, midW: 0.9, slide: 1, L: [12, 16, 22, 28, 36, 46, 60, 78], R: [2, 2, 3, 2, 3, 3], kill: 1, surge: 1, brute: 1, swap: 1, tip: '最後一戰！全部都來了' },
];

function clCol(x) { return clamp(Math.floor((x + CL_FW) / CL_CW), 0, CL_NC - 1); }
function clColX(i) { return -CL_FW + (i + 0.5) * CL_CW; }
// 戰線在 x 的位置（相鄰兩路之間線性內插，畫面才不會一格一格的）
function clFrontAt(f, x) {
  const u = clamp((x + CL_FW) / CL_CW - 0.5, 0, CL_NC - 1), i = Math.min(CL_NC - 2, Math.floor(u)), k = u - i;
  return f[i] * (1 - k) + f[i + 1] * k;
}

function newClash(n, opts) {
  opts = opts || {};
  const C = CSTAGES[n - 1], th = THEMES[C.theme];
  const up = Object.assign({ rate: 0, wall: 0, power: 0, giant: 0, card: 0 }, opts.up || {});
  const L = { n, name: C.name, theme: th, tip: C.tip, C, airy: !!th.airy, hot: !!th.hot, E: 1, lv: n };
  const sL = C.swap ? 1 : -1;   // 黃色 + 走廊在哪一邊
  const gates = [];
  const zA = CL_FENCE + 1.8, zB = CL_TOP - 1.2;
  C.L.forEach((v, k) => gates.push({ t: 'gate', id: _uid++, k: 'add', v, x: sL * CL_COR, w: CL_CORW, z: zA + (zB - zA) * k / (C.L.length - 1), fade: 0, bump: 0, look: 'wpn', side: sL }));
  C.R.forEach((v, k) => gates.push({ t: 'gate', id: _uid++, k: 'mul', v, x: -sL * CL_COR, w: CL_CORW, z: zA + 1.4 + (zB - zA - 1.4) * k / (C.R.length - 1), fade: 0, bump: 0, side: -sL }));
  // ✕ 門：在 + 走廊裡一開一關（關著的時候進去會整隊消失），要抓空檔
  if (C.kill) gates.push({ t: 'gate', id: _uid++, k: 'kill', v: 0, x: sL * CL_COR, w: CL_CORW, z: (gates[3].z + gates[4].z) / 2, fade: 0, bump: 0, side: sL, blink: 2.2, shut: true });
  const mid = { t: 'gate', id: _uid++, k: 'add', v: C.mid, x: 0, w: C.midW || 1.3, z: CL_MIDZ, fade: 0, bump: 0, look: 'spec', side: 0 };
  if (C.slide) { mid.slide = { cx: 0, amp: 1.5, f: 0.55, ph: 0 }; mid.pair = { used: false }; }
  const f0 = 21;
  G = {
    mode: 'clash', s: n, L, st: 'play', t: 0, dist: 0, spd: 0, scroll: false,
    px: 0, tx: 0, vx: 0,
    units: [], objs: [], parts: [], floats: [], fx: [], decals: [], q: [], bullets: [], sold: [],
    fireAcc: 0, rate: 5 * (1 + up.rate * 0.05), pow: 1 + up.power * 0.06,
    castle: C.castle + up.wall * 20, castleMax: C.castle + up.wall * 20,
    base: { t: 'base', hp: C.base, max: C.base, hit: 0, rage: false, x: 0, z: DEF_Z_BASE },
    giant: 0, giantMax: Math.round(90 * (1 - 0.06 * up.giant)), charge: 0,
    shake: 0, flash: 0, kills: 0, sent: 0, endT: 0, sim: !!opts.sim, card: null, squadN: DEF_SQUAD,
    gates, mid, blobs: [], brutes: [],
    f: new Array(CL_NC).fill(f0), b: new Array(CL_NC).fill(25), r: new Array(CL_NC).fill(25),
    inRate: 0, surge: null, surgeT: 13, bruteT: 17, castleHitT: 0, hits: 0,
  };
  return G;
}

// 一隊小兵（一團）
function clFire() {
  const x = G.px;
  const lane = x < -CL_WALL ? -1 : x > CL_WALL ? 1 : 0;
  const bx = lane ? lane * CL_COR : clamp(x, -CL_FW + 0.15, CL_FW - 0.15);
  const col = lane < 0 ? 0 : lane > 0 ? CL_NC - 1 : clCol(bx);
  G.blobs.push({ x: bx, z: DEF_Z_CANNON + 0.7, n: G.squadN, lane, col, ph: Math.random() * 6, pop: 0.6 });
  G.sent += G.squadN;
  emit('dshot');
}

function clGate(bl, g) {
  if (g.k === 'add') bl.n += g.v;
  else if (g.k === 'mul') bl.n *= g.v;
  else if (g.k === 'kill') { bl.n = 0; emit('unitdie'); return; }
  g.bump = 1; bl.pop = 1;
  emit('mult');
}

function clBlobs(dt) {
  const B = G.blobs, f = G.f;
  for (let i = B.length - 1; i >= 0; i--) {
    const bl = B[i];
    const z0 = bl.z;
    bl.z += CL_SPD * dt; bl.ph += dt * 12;
    if (bl.pop > 0) bl.pop = Math.max(0, bl.pop - dt * 3);
    const fz = bl.lane ? f[bl.col] : clFrontAt(f, bl.x);
    if (G.st === 'play') {
      if (bl.lane === 0) {
        const m = G.mid;
        if (z0 < m.z && bl.z >= m.z && m.z < fz - 0.2 && Math.abs(bl.x - m.x) <= m.w) clGate(bl, m);
      } else {
        for (const g of G.gates) {
          if (g.side !== bl.lane || g.z >= fz - 0.2) continue;
          if (g.blink && !g.shut) continue;   // ✕ 門打開的時候可以過
          if (z0 < g.z && bl.z >= g.z) { clGate(bl, g); if (!bl.n) break; }
        }
      }
    }
    if (bl.n <= 0) { B.splice(i, 1); continue; }
    // 碰到戰線：加進那一路
    if (bl.z >= fz - 0.25) {
      if (G.st === 'play') {
        G.b[bl.col] += bl.n; G.inRate += bl.n / 3;
        if (bl.n >= 30) emit('cjoin', bl);
        if (fxOn() && bl.n >= 10) FX.add({ k: 'ring', x: bl.lane ? clColX(bl.col) : bl.x, z: fz, life: 0.4, size: 1 + Math.min(3, bl.n / 60), col: '120,190,255' });
      }
      B.splice(i, 1);
    }
  }
}

function clLaunchCharge() {
  if (G.mode !== 'clash' || G.st !== 'play' || G.giant < G.giantMax) return false;
  G.giant = 0; G.charge = 5;
  emit('charge');
  return true;
}

function clashStep(dt, input) {
  if (G.st === 'win' || G.st === 'lost') return;
  G.t += dt;
  if (input && input.abs != null) G.tx = clamp(input.abs, -PX_MAX, PX_MAX);
  G.px += clamp(G.tx - G.px, -12 * dt, 12 * dt);
  for (const g of G.gates) if (g.bump > 0) g.bump = Math.max(0, g.bump - dt * 4);
  if (G.mid.bump > 0) G.mid.bump = Math.max(0, G.mid.bump - dt * 4);
  if (G.base.hit > 0) G.base.hit -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2);
  if (G.st !== 'play') {
    G.endT -= dt;
    if (G.endT <= 0) { G.st = G.st === 'lose' ? 'lost' : 'win'; if (G.st === 'win') emit('win'); }
    stepFx(dt); clBlobs(dt);
    return;
  }
  const C = G.L.C, NC = CL_NC, f = G.f, b = G.b, r = G.r, K = CL_K;
  const m = G.mid;
  if (m.slide) m.x = m.slide.cx + m.slide.amp * Math.sin(G.t * m.slide.f + m.slide.ph);
  m.fade = m.z < clFrontAt(f, m.x) - 0.2 ? 0 : 0.6;
  for (const g of G.gates) if (g.blink) g.shut = Math.floor(G.t / g.blink) % 2 === 0;
  for (const g of G.gates) g.fade = g.z < f[g.side < 0 ? 0 : NC - 1] - 0.2 ? (g.blink && !g.shut ? 0.75 : 0) : 0.55;
  // 砲台
  G.fireAcc += dt * G.rate / DEF_SQUAD;
  while (G.fireAcc >= 1) { G.fireAcc -= 1; clFire(); G.giant = Math.min(G.giantMax, G.giant + G.squadN); }
  if (G.charge > 0) G.charge -= dt;
  clBlobs(dt);
  // 猛衝：箭頭預告，接著那一路的紅軍多好幾倍
  const w = new Array(NC).fill(1);
  if (C.surge) {
    const s = G.surge;
    if (!s) { G.surgeT -= dt; if (G.surgeT <= 0) { G.surge = { c: 1 + Math.floor(Math.random() * (NC - 2)), warn: 2.5, t: 6 }; emit('csurge', G.surge); } }
    else if (s.warn > 0) s.warn -= dt;
    else {
      s.t -= dt; w[s.c] += 4; w[s.c - 1] += 1.5; w[s.c + 1] += 1.5;
      if (s.t <= 0) { G.surge = null; G.surgeT = 11 + Math.random() * 5; }
    }
  }
  // 一開始紅軍慢慢湧上來（25 秒到全速），之後越來越多
  const ramp = (0.45 + 0.55 * Math.min(1, G.t / 25)) * (1 + C.ramp * Math.min(1, G.t / 150)) + (G.base.rage ? 0.2 : 0);
  let fa = 0; for (const v of f) fa += v / NC;
  const fk = fa / CL_TOP;
  // 戰線推得越近敵方基地，紅軍補得越快；藍軍來得越多，敵方也派越多（兩邊才會拉鋸，不會一下子一面倒）
  G.inRate *= Math.exp(-dt / 3);
  const feed = C.feed * ramp * (1 + CL_K.home * fk * fk) + CL_K.rb * G.inRate;
  // 每一路平均分到 feed/NC，猛衝的那路多好幾倍（總量變多）
  for (let i = 0; i < NC; i++) r[i] += feed / NC * w[i] * dt;
  // 巨兵：某一路一下子多很多紅軍
  if (C.brute) {
    G.bruteT -= dt;
    if (G.bruteT <= 0) {
      const c = Math.floor(Math.random() * NC);
      r[c] += feed * 4.5; G.brutes.push({ c, t: 4, ph: Math.random() * 6 });
      G.bruteT = 15 + Math.random() * 6;
      emit('cbrute', { c });
    }
    for (let i = G.brutes.length - 1; i >= 0; i--) { const q = G.brutes[i]; q.t -= dt; q.ph += dt * 6; if (q.t <= 0 || r[q.c] < feed * 0.6) G.brutes.splice(i, 1); }
  }
  // 交戰、推戰線
  const pw = G.pow * (G.charge > 0 ? 2 : 1);
  for (let i = 0; i < NC; i++) {
    const Bp = b[i] * pw, Rr = r[i];
    const k = dt * K.kill * Math.min(Bp, Rr);
    b[i] = Math.max(0, b[i] - k / pw); r[i] = Math.max(0, r[i] - k);
    G.kills += k;
    const v = K.move * (Bp - Rr) / (Bp + Rr + K.soft) + (G.charge > 0 && Bp > 1 ? 0.6 : 0);
    f[i] = clamp(f[i] + v * dt, 0, CL_TOP);
    if (f[i] <= 0.05 && r[i] > 0.5) {
      const d = Math.min(r[i], (r[i] * K.castle + 3) * dt);
      r[i] -= d; G.castle -= d; G.castleHitT -= dt;
      if (G.castleHitT <= 0) { G.castleHitT = 0.35; G.hits++; emit('castlehit'); G.flash = Math.min(1, G.flash + 0.25); }
    }
    if (f[i] >= CL_TOP - 3 && b[i] > 0.5) {   // 推到基地前面就開始打基地（越近打越多）
      const d = b[i] * pw * dt * K.base * Math.min(1, (f[i] - CL_TOP + 3) / 3);
      G.base.hp -= d; G.base.hit = 0.1; b[i] -= b[i] * 0.12 * dt;
      if (Math.random() < dt * 6) emit('basehit', {});
    }
  }
  // 左右兩路互相支援：人會往旁邊擴散，戰線會變平順
  for (let i = 0; i < NC - 1; i++) {
    const tb = (b[i] - b[i + 1]) * K.diffB * dt; b[i] -= tb; b[i + 1] += tb;
    const tr = (r[i] - r[i + 1]) * K.diffR * dt; r[i] -= tr; r[i + 1] += tr;
  }
  const f2 = f.slice();
  for (let i = 0; i < NC; i++) {
    const nb = i === 0 ? f2[1] : i === NC - 1 ? f2[NC - 2] : (f2[i - 1] + f2[i + 1]) / 2;
    f[i] += (nb - f2[i]) * Math.min(1, K.smooth * dt);
  }
  // 戰線上的火花
  if (fxOn() && Math.random() < dt * 10) {
    const i = Math.floor(Math.random() * NC);
    if (b[i] > 1 && r[i] > 1) FX.add({ k: 'spark', x: clColX(i) + (Math.random() - 0.5) * CL_CW, z: f[i], h: 0.3 + Math.random() * 0.8, life: 0.12, size: 0.5 + Math.random() * 0.5, fl: Math.random() < 0.5 ? 'y' : 'o', rot: Math.random() * 3 });
  }
  stepFx(dt);
  if (!G.base.rage && G.base.hp <= G.base.max * 0.5) { G.base.rage = true; emit('baserage'); }
  if (G.base.hp <= 0) { G.base.hp = 0; G.base.deadAt = G.t; G.st = 'winning'; G.endT = 2.4; G.shake = 1.2; emit('bossdie'); }
  else if (G.castle <= 0) { G.castle = 0; G.st = 'lose'; G.endT = 1.8; emit('lose'); }
}
