// 萬軍守城 — 大軍對決：兩邊大軍在中間撞成一條戰線，人多的那邊往前推
// 戰場分成 CL_NC 路，每一路記：戰線位置 f、頂在戰線上的藍軍 b、紅軍 r。
// 小兵一隊一隊從砲台射出去（一團 blob），穿過門變多，碰到戰線就加進那一路的藍軍。
// 兩側走廊的門要「戰線推過去」才拿得到：越往前推，走廊越長、加越多。
'use strict';

// 戰場比守城關卡寬（路面半寬 CL_ROAD，進大軍對決時 setRoad 換過去）
const CL_ROAD = 5.3;
const CL_NC = 7, CL_FW = 3.55, CL_CW = CL_FW * 2 / CL_NC;
const CL_COR = 4.45, CL_CORW = 0.55, CL_WALL = 3.67;   // 走廊中心、半寬、走廊和戰場中間的矮牆
const CL_FENCE = 7, CL_TOP = DEF_Z_BASE - 1.8;          // 走廊從柵欄開始；戰線最遠推到基地前
const CL_MIDZ = 4.4, CL_SPD = 7, CL_UZ = 7.6;   // CL_UZ：兵種門的位置
const CL_UNIT = { arch: '🏹弓箭', cav: '🐎騎兵', shield: '🛡盾兵' };
const CL_K = { kill: 0.9, move: 1.7, soft: 25, castle: 0.25, base: 0.5, home: 2, rb: 0.4, diffB: 1.0, diffR: 0.4, smooth: 1.2 };

// L：左走廊（黃色 +），R：右走廊（藍色 ×），mid：中間紫門。swap：左右對調
// flip：兩邊走廊每 22 秒對調一次
// units：場上的兵種門（arch 弓箭手、cav 騎兵、shield 盾兵）；cat：走廊投石車；rain：紅軍箭雨；wall：紅軍盾陣
const CSTAGES = [
  { name: '平原會戰', theme: 0, feed: 8, ramp: 0.5, base: 2600, castle: 300, mid: 9, L: [5, 7, 9, 12, 16, 20, 26, 32], R: [2, 2, 2, 2], units: ['arch', 'cav'], tip: '紅軍一大片衝過來！小兵碰到戰線就會往前推。走廊的門要戰線推過去才拿得到' },
  { name: '沙丘夾擊', theme: 1, feed: 20, ramp: 0.6, base: 3800, castle: 320, mid: 12, L: [6, 8, 11, 14, 18, 24, 30, 40], R: [2, 2, 2, 2, 3], surge: 1, swap: 1, units: ['arch', 'cav'], cat: 1, tip: '紅色箭頭那一路會猛衝；走廊的投石車會往紅軍最多的地方丟大石頭' },
  { name: '冰原紅海', theme: 2, feed: 21, ramp: 0.7, base: 5200, castle: 340, mid: 14, L: [8, 10, 13, 17, 22, 28, 36, 46], R: [2, 2, 2, 2, 2], surge: 1, brute: 1, units: ['arch', 'shield'], rain: 1, tip: '紅圈是紅軍的箭雨，小兵別走進去；盾兵門讓那一路少死一半' },
  { name: '霓虹決戰', theme: 3, feed: 43, ramp: 0.8, base: 6800, castle: 360, mid: 18, midW: 0.9, slide: 1, L: [9, 12, 16, 20, 26, 34, 44, 56], R: [2, 2, 2, 3, 3], surge: 1, swap: 1, units: ['cav', 'shield'], cat: 1, wall: 1, tip: '紅軍舉起盾陣那一路推不動——用騎兵或投石車把盾陣打破' },
  { name: '熔岩大軍', theme: 4, feed: 22, ramp: 0.9, base: 8800, castle: 380, mid: 20, L: [10, 14, 18, 24, 30, 40, 52, 66], R: [2, 2, 3, 2, 3], kill: 1, surge: 1, brute: 1, units: ['arch', 'cav', 'shield'], cat: 2, rain: 1, tip: '走廊裡有 ✕ 門，戰線推過去前先別走那邊' },
  { name: '天空總決戰', theme: 5, feed: 23, ramp: 1.0, base: 11000, castle: 400, mid: 24, midW: 0.9, slide: 1, L: [12, 16, 22, 28, 36, 46, 60, 78], R: [2, 2, 3, 2, 3, 3], kill: 1, surge: 1, brute: 1, swap: 1, units: ['arch', 'cav', 'shield'], cat: 2, rain: 1, wall: 1, tip: '前面學過的花樣全部都來了！' },
  { name: '沙暴突襲', theme: 1, feed: 47, ramp: 1.0, base: 12500, castle: 420, mid: 26, L: [13, 18, 24, 30, 38, 48, 62, 80], R: [2, 2, 3, 3, 2, 3], surge: 1, brute: 1, flip: 1, units: ['arch', 'cav'], cat: 1, tip: '走廊會對調！+ 門和 × 門每隔一陣子換邊，要跟著換' },
  { name: '冰封要塞', theme: 2, feed: 54, ramp: 1.0, base: 14000, castle: 440, mid: 28, midW: 0.9, slide: 1, L: [14, 19, 25, 32, 40, 52, 66, 84], R: [2, 3, 2, 3, 3, 2], kill: 1, rain: 1, wall: 1, units: ['shield', 'cav'], cat: 2, tip: '盾陣、箭雨一起來：騎兵破盾，盾兵頂住' },
  { name: '熔岩雙線', theme: 4, feed: 48, ramp: 1.1, base: 16000, castle: 460, mid: 30, L: [15, 20, 27, 34, 44, 56, 72, 92], R: [2, 3, 3, 2, 3, 3], kill: 1, surge: 1, brute: 1, rain: 1, flip: 1, swap: 1, units: ['arch', 'cav', 'shield'], cat: 2, tip: '走廊對調加上猛衝，兩邊都要顧' },
  { name: '雲頂決戰', theme: 5, feed: 59, ramp: 1.2, base: 19000, castle: 480, mid: 32, midW: 0.9, slide: 1, L: [16, 22, 29, 38, 48, 62, 80, 100], R: [2, 3, 3, 3, 2, 3, 3], kill: 1, surge: 1, brute: 1, rain: 1, wall: 1, flip: 1, units: ['arch', 'cav', 'shield'], cat: 2, tip: '真正的最後一戰：所有花樣都在這裡' },
  // 第三部 · 傳說戰場：所有花樣混在一起，紅軍更多
  { name: '綠野大會戰', theme: 0, feed: 78, ramp: 1.2, base: 21000, castle: 500, mid: 34, L: [17, 23, 30, 39, 50, 64, 82, 104], R: [2, 3, 3, 2, 3, 3, 3], surge: 1, brute: 1, wall: 1, flip: 1, units: ['cav', 'arch', 'shield'], cat: 2, tip: '傳說戰場開打！盾陣會在走廊對調的時候出現' },
  { name: '沙海長城', theme: 1, feed: 66, ramp: 1.25, base: 23000, castle: 520, mid: 36, midW: 0.9, slide: 1, L: [18, 24, 32, 41, 52, 67, 86, 110], R: [2, 3, 3, 3, 2, 3, 3], kill: 1, surge: 1, rain: 1, wall: 1, units: ['shield', 'arch', 'cav'], cat: 2, tip: '紫門會跑、箭雨會追：邊躲邊送兵' },
  { name: '極光雪原', theme: 2, feed: 83, ramp: 1.3, base: 25000, castle: 540, mid: 38, L: [19, 26, 34, 44, 56, 72, 92, 118], R: [2, 3, 3, 3, 3, 2, 3], kill: 1, surge: 1, brute: 1, rain: 1, flip: 1, swap: 1, units: ['arch', 'shield', 'cav'], cat: 2, tip: '巨兵、猛衝一起壓上來，弓箭手和盾兵要搭配' },
  { name: '霓虹終焉', theme: 3, feed: 64, ramp: 1.35, base: 28000, castle: 560, mid: 40, midW: 0.9, slide: 1, L: [20, 27, 36, 46, 60, 76, 98, 124], R: [2, 3, 3, 3, 3, 3, 3], kill: 1, surge: 1, brute: 1, rain: 1, wall: 1, flip: 1, units: ['cav', 'shield', 'arch'], cat: 2, tip: '大軍對決最終戰：全部的花樣，紅軍最多' },
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
  setRoad(CL_ROAD);
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
  // 投石車：一座在 × 走廊、第二座在 + 走廊（戰線推過去才用得到）
  if (C.cat) {
    const gR = gates.filter(g => g.side === -sL), gL = gates.filter(g => g.side === sL && g.k === 'add');
    gates.push({ t: 'gate', id: _uid++, k: 'cat', v: 0, x: -sL * CL_COR, w: CL_CORW, z: (gR[0].z + gR[1].z) / 2, fade: 0, bump: 0, side: -sL, cd: 0 });
    if (C.cat > 1) gates.push({ t: 'gate', id: _uid++, k: 'cat', v: 0, x: sL * CL_COR, w: CL_CORW, z: (gL[5].z + gL[6].z) / 2, fade: 0, bump: 0, side: sL, cd: 0 });
  }
  // 兵種門：場上左右兩個（加的人和紫門一樣多），每 9 秒換一次種類
  const ug = [];
  if (C.units) for (const sx of [-1, 1]) ug.push({ t: 'gate', id: _uid++, k: 'unit', u: C.units[sx < 0 ? 0 : 1], v: C.mid, x: sx * 2.5, w: 0.8, z: CL_UZ, fade: 0, bump: 0, side: 0 });
  // 走廊裡也各有一個兵種門（不加人，只換兵種）：走廊練出來的大隊也能變成兵種，數量和兵種才會相乘
  if (C.units) {
    const gL = gates.filter(g => g.side === sL && g.k === 'add'), gR = gates.filter(g => g.side === -sL && g.k === 'mul');
    gates.push({ t: 'gate', id: _uid++, k: 'unit', u: C.units[(2) % C.units.length], v: 0, x: sL * CL_COR, w: CL_CORW, z: (gL[1].z + gL[2].z) / 2, fade: 0, bump: 0, side: sL, cor: 1 });
    gates.push({ t: 'gate', id: _uid++, k: 'unit', u: C.units[(3) % C.units.length], v: 0, x: -sL * CL_COR, w: CL_CORW, z: (gR[1].z + gR[2].z) / 2, fade: 0, bump: 0, side: -sL, cor: 1 });
  }
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
    gates, mid, ug, ugI: 0, ugT: 9, blobs: [], brutes: [], shots: [],
    ar: new Array(CL_NC).fill(0), arK: new Array(CL_NC).fill(0), arT: new Array(CL_NC).fill(1), push: new Array(CL_NC).fill(0), sh: new Array(CL_NC).fill(0), rw: new Array(CL_NC).fill(0),
    rain: null, rainT: 9, wallT: 16, flipT: 22, flipWarn: 0,
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
  else if (g.k === 'unit') { bl.n += g.v; bl.u = g.u; g.bump = 1; bl.pop = 1; emit('cunit', g); return; }
  else if (g.k === 'cat') { if (g.cd > 0) return; clThrow(g); g.bump = 1; return; }
  g.bump = 1; bl.pop = 1;
  emit('mult');
}

// 投石車：往紅軍最多（或有盾陣）的那一路丟一顆大石頭
function clThrow(g) {
  let best = 0, bv = -1;
  for (let c = 0; c < CL_NC; c++) { const v = G.r[c] + (G.rw[c] > 0 ? 1e5 : 0); if (v > bv) { bv = v; best = c; } }
  G.shots.push({ c: best, x0: g.x, z0: g.z, age: 0, T: 1.1 });
  g.cd = 4;
  emit('cthrow', g);
}
function clLand(s) {
  const c = s.c, r = G.r, z = G.f[c] + 1.6;
  const k = Math.min(r[c], 25 + 0.3 * r[c]); r[c] -= k; G.kills += k;
  for (const d of [-1, 1]) if (r[c + d] != null) { const k2 = r[c + d] * 0.12; r[c + d] -= k2; G.kills += k2; }
  if (G.rw[c] > 0) { G.rw[c] = 0; emit('cwallbreak', { c }); }
  G.shake = Math.max(G.shake, 0.35);
  if (fxOn()) FX.boom(clColX(c), z, 1.2);
  emit('ccat', { c });
}

function clBlobs(dt) {
  const B = G.blobs, f = G.f;
  for (let i = B.length - 1; i >= 0; i--) {
    const bl = B[i];
    const z0 = bl.z;
    bl.z += CL_SPD * (bl.u === 'cav' ? 1.7 : 1) * dt; bl.ph += dt * (bl.u === 'cav' ? 20 : 12);   // 騎兵跑得快
    if (bl.u === 'cav' && fxOn() && Math.random() < dt * 14) FX.add({ k: 'puff', spr: 'dust', x: bl.x + (Math.random() - 0.5) * 0.6, z: bl.z - 0.3, h: 0.15, life: 0.45, size: 0.7, grow: 1.6, rise: 0.3, a: 0.7 });
    if (bl.pop > 0) bl.pop = Math.max(0, bl.pop - dt * 3);
    const fz = bl.lane ? f[bl.col] : clFrontAt(f, bl.x);
    if (G.st === 'play') {
      if (bl.lane === 0) {
        const m = G.mid;
        if (z0 < m.z && bl.z >= m.z && m.z < fz - 0.2 && Math.abs(bl.x - m.x) <= m.w) clGate(bl, m);
        for (const u of G.ug) if (z0 < u.z && bl.z >= u.z && u.z < fz - 0.2 && Math.abs(bl.x - u.x) <= u.w) clGate(bl, u);
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
        const c = bl.col;
        if (bl.u === 'arch') {   // 弓箭手：七成站在後面一直射，三成拿盾頂在前線（整隊都變弓箭手的話戰線會沒人頂）
          G.ar[c] += bl.n * 0.7; G.b[c] += bl.n * 0.3;
          if (fxOn()) floatText(clColX(c), fz - 1.2, 1.4, `🏹 +${fmtNum(bl.n * 0.7)}`, '#9dffb5', 0.75); emit('carch', bl);
        }
        else {
          if (bl.u === 'cav') {   // 騎兵：一衝進去就撞倒一堆紅軍，戰線往前推，盾陣也撞破
            let k = Math.min(G.r[c], bl.n * 0.9 * G.pow); G.r[c] -= k;
            for (const d of [-1, 1]) if (G.r[c + d] != null) { const k2 = Math.min(G.r[c + d], bl.n * 0.15 * G.pow); G.r[c + d] -= k2; k += k2; G.push[c + d] += Math.min(1, 0.2 + bl.n * 0.01); }
            G.kills += k;
            G.push[c] += Math.min(3, 0.6 + bl.n * 0.03);
            if (G.rw[c] > 0) { G.rw[c] = 0; emit('cwallbreak', { c }); }
            if (fxOn()) {
              const x = clColX(c), z = fz + 0.4;
              FX.add({ k: 'ring', x, z, life: 0.5, size: 2.6, col: '230,120,255' });
              for (let i = 0; i < 8; i++) FX.add({ k: 'puff', spr: 'dust', x: x + (Math.random() - 0.5) * 2, z: z + Math.random() * 1.5, h: 0.3, life: 0.6, size: 1.3, grow: 1.7, rise: 0.6, a: 0.85 });
              floatText(x, z + 0.5, 1.6, `🐎 撞倒 ${fmtNum(k)}`, '#ffb8ff', 0.85);
            }
            emit('ccav', bl);
          } else if (bl.u === 'shield') {
            G.sh[c] = Math.max(G.sh[c], 10);
            for (const d of [-1, 1]) if (G.sh[c + d] != null) G.sh[c + d] = Math.max(G.sh[c + d], 6);   // 旁邊兩路也頂一下
            if (fxOn()) floatText(clColX(c), fz, 1.6, '🛡 盾牆！', '#bfe6ff', 0.85);
            emit('cshield', bl);
          }
          G.b[c] += bl.n;
        }
        G.inRate += bl.n / 3;
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
  for (const g of G.gates) {
    g.fade = g.z < f[g.side < 0 ? 0 : NC - 1] - 0.2 ? (g.blink && !g.shut ? 0.75 : 0) : 0.55;
    if (g.k === 'cat' && g.cd > 0) { g.cd -= dt; if (!g.fade) g.fade = 0.45; }
  }
  // 兵種門：每 9 秒左右換一次
  if (G.ug.length) {
    G.ugT -= dt;
    if (G.ugT <= 0) {
      G.ugT = 9; G.ugI++;
      const U = C.units;
      G.ug.forEach((u, i) => { u.u = U[(G.ugI + i) % U.length]; u.bump = 0.6; });
      G.gates.filter(g => g.k === 'unit').forEach((g, i) => { g.u = U[(G.ugI + 2 + i) % U.length]; g.bump = 0.6; });
    }
    for (const u of G.ug) u.fade = u.z < clFrontAt(f, u.x) - 0.2 ? 0 : 0.6;
  }
  // 走廊對調：預告 2 秒，接著兩邊走廊的門（含投石車、✕ 門）一起換邊
  if (C.flip) {
    if (G.flipWarn > 0) {
      G.flipWarn -= dt;
      if (G.flipWarn <= 0) {
        for (const g of G.gates) { g.side = -g.side; g.x = -g.x; g.bump = 1; }
        G.flipT = 22;
        emit('cflip');
      }
    } else {
      G.flipT -= dt;
      if (G.flipT <= 0) { G.flipWarn = 2; emit('cflipwarn'); }
    }
  }
  // 投石車的石頭
  for (let i = G.shots.length - 1; i >= 0; i--) { const s = G.shots[i]; s.age += dt; if (s.age >= s.T) { clLand(s); G.shots.splice(i, 1); } }
  // 紅軍箭雨：紅圈預告，落下時圈裡的小兵剩三成多
  if (C.rain) {
    const rn = G.rain;
    if (!rn) {
      G.rainT -= dt;
      if (G.rainT <= 0) {
        let x, z;
        if (Math.abs(G.px) > CL_WALL) { const sd = Math.sign(G.px); x = sd * CL_COR; z = CL_FENCE + 0.5 + Math.random() * Math.max(0.5, Math.min(f[sd < 0 ? 0 : NC - 1], CL_TOP) - CL_FENCE - 1.3); }
        else { x = clamp(G.px + (Math.random() - 0.5), -CL_FW + 0.5, CL_FW - 0.5); const zt = Math.min(clFrontAt(f, x) - 1, 12); z = zt > 3.5 ? 3 + Math.random() * (zt - 3) : 3 + Math.random() * 2; }
        G.rain = { x, z, warn: 1.5, rad: 1.1 };
        emit('crainwarn', G.rain);
      }
    } else {
      rn.warn -= dt;
      if (rn.warn <= 0) {
        let hit = 0;
        for (const bl of G.blobs) { const dx = (bl.x - rn.x) / rn.rad, dz = (bl.z - rn.z) / rn.rad; if (dx * dx + dz * dz < 1) { const k = bl.n - Math.floor(bl.n * 0.35); bl.n -= k; hit += k; bl.pop = 0.8; } }
        emit('crain', { x: rn.x, z: rn.z, hit });
        if (fxOn()) for (let i = 0; i < 22; i++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * rn.rad; FX.add({ k: 'carrow', x0: rn.x + Math.cos(a) * d + 0.8, z0: rn.z + Math.sin(a) * d + 2.5, h0: 5, x1: rn.x + Math.cos(a) * d, z1: rn.z + Math.sin(a) * d, h1: 0, arc: 0, life: 0.35 + Math.random() * 0.25, red: 1, x: rn.x, z: rn.z }); }
        G.rain = null; G.rainT = 8 + Math.random() * 4;
      }
    }
  }
  // 紅軍盾陣：推最前面的那一路舉起盾，12 秒內很難推
  if (C.wall) {
    G.wallT -= dt;
    if (G.wallT <= 0) {
      let c = 0; for (let i = 1; i < NC; i++) if (f[i] > f[c] + 0.01 || (Math.abs(f[i] - f[c]) <= 0.01 && Math.random() < 0.5)) c = i;
      G.rw[c] = 12; G.wallT = 18 + Math.random() * 6;
      emit('cwall', { c });
    }
  }
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
  // 弓箭手：在後面一直射，打自己那一路和旁邊兩路，慢慢累了就散掉
  for (let i = 0; i < NC; i++) {
    const a = G.ar[i];
    if (a < 0.5) { G.ar[i] = 0; continue; }
    const k = dt * 0.3 * a * pw;
    for (const [c, w2] of [[i, 0.6], [i - 1, 0.2], [i + 1, 0.2]]) if (r[c] != null) { const kk = Math.min(r[c], k * w2); r[c] -= kk; G.kills += kk; G.arK[i] += kk; }
    G.ar[i] *= Math.exp(-dt / 8);
    G.arT[i] -= dt;
    if (G.arT[i] <= 0) { G.arT[i] = 1; if (G.arK[i] >= 1 && fxOn()) floatText(clColX(i), f[i] + 0.8, 1.2, '-' + fmtNum(G.arK[i]), '#9dffb5', 0.6); G.arK[i] = 0; }
    if (fxOn() && Math.random() < dt * Math.min(30, 4 + a / 2)) {
      const x = clColX(i) + (Math.random() - 0.5) * CL_CW, zf = f[i];
      FX.add({ k: 'carrow', x0: x, z0: zf - 1.3, h0: 0.9, x1: x + (Math.random() - 0.5) * 0.6, z1: zf + 0.8 + Math.random() * 2, h1: 0.3, arc: 1.4, life: 0.5, x, z: zf });
    }
  }
  for (let i = 0; i < NC; i++) {
    const Bp = b[i] * pw, Rr = r[i];
    const k = dt * K.kill * Math.min(Bp, Rr);
    const wall = G.rw[i] > 0, shd = G.sh[i] > 0;
    b[i] = Math.max(0, b[i] - k / pw * (shd ? 0.35 : 1)); r[i] = Math.max(0, r[i] - k * (wall ? 0.35 : 1));
    G.kills += k;
    let v = K.move * (Bp - Rr) / (Bp + Rr + K.soft) + (G.charge > 0 && Bp > 1 ? 0.6 : 0);
    if (wall && v > 0) v *= 0.25;
    if (G.push[i] > 0) { const d = Math.min(G.push[i], dt * 3); G.push[i] -= d; v += d / dt; }
    if (G.rw[i] > 0) G.rw[i] -= dt;
    if (G.sh[i] > 0) G.sh[i] -= dt;
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
