// 沙之實驗室的 WGSL 著色器
// 格子：每格一個 u32 —— 第 0–7 位元：材料，8–15：顏色變化（出生時隨機），16–23：壽命／能量，26：關卡鎖定（橡皮擦擦不掉）
// 移動用 Margolus 鄰域：每個執行緒負責一個 2×2 區塊，四個格子只有它在讀寫，所以不會互相打架；
// 每一格輪流換區塊的位移（0,0）（1,1）（1,0）（0,1），粒子才能跨區塊移動。

export const COMMON = /* wgsl */`
const EMPTY = 0u; const WALL = 1u; const SAND = 2u; const WATER = 3u; const LAVA = 4u; const WOOD = 5u; const PLANT = 6u;
const SEED = 7u; const FIRE = 8u; const STEAM = 9u; const SMOKE = 10u; const STONE = 11u; const OIL = 12u; const EMBER = 13u;
const ICE = 14u; const FLOWER = 15u; const SPOUT = 16u; const VOID = 17u;
const LOCK = 0x4000000u;
const DIRB = 0x1000000u;   // 液體往哪邊流（1 ＝ 往左）：液體記得自己的方向一路流下去，比亂走快很多

struct Shared { w: u32, h: u32, frame: u32, nst: u32, time: f32, glow: f32, p0: f32, p1: f32 };

var<private> seed: u32;
fn pcg(v: u32) -> u32 {
  let s = v * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
fn rnd() -> f32 { seed = pcg(seed); return f32(seed >> 8u) / 16777216.0; }
fn ty(c: u32) -> u32 { return c & 255u; }
fn life(c: u32) -> u32 { return (c >> 16u) & 255u; }
fn setLife(c: u32, l: u32) -> u32 { return (c & ~(255u << 16u)) | (min(l, 255u) << 16u); }
fn mk(t: u32) -> u32 {
  var l = 0u;
  if (t == FIRE) { l = 25u + u32(rnd() * 45.0); }
  else if (t == STEAM) { l = 90u + u32(rnd() * 160.0); }
  else if (t == SMOKE) { l = 30u + u32(rnd() * 50.0); }
  else if (t == ICE) { l = 7u; }   // 冰：還能再把旁邊的水凍住幾代
  return t | (u32(rnd() * 255.0) << 8u) | (l << 16u) | select(0u, DIRB, rnd() < 0.5);
}
fn dens(t: u32) -> i32 {
  switch t {
    case 0u { return 0; }
    case 2u { return 5; }
    case 3u { return 2; }
    case 4u { return 3; }
    case 7u { return 4; }
    case 8u { return -1; }
    case 9u, 10u { return -2; }
    case 12u { return 1; }
    default { return 99; }
  }
}
fn mov(t: u32) -> bool { return t == EMPTY || t == SAND || t == WATER || t == LAVA || t == SEED || t == FIRE || t == STEAM || t == SMOKE || t == OIL; }
fn liquid(t: u32) -> bool { return t == WATER || t == LAVA || t == OIL; }
fn gas(t: u32) -> bool { return t == FIRE || t == STEAM || t == SMOKE; }
fn spread(t: u32) -> f32 {
  if (t == WATER) { return 0.97; }
  if (t == OIL) { return 0.9; }
  return 0.12;   // 岩漿很黏
}
// 著火的東西先變成「餘燼」（不會動、會冒火、會點燃旁邊），燒完才消失；木頭燒得久，草燒得快
fn emberOf(q: u32) -> u32 {
  var l = 40u;
  if (q == WOOD) { l = 120u + u32(rnd() * 80.0); }
  else if (q == PLANT) { l = 30u + u32(rnd() * 30.0); }
  else if (q == SEED) { l = 20u; }
  return setLife(mk(EMBER), l);
}
fn burnP(t: u32) -> f32 {
  if (t == WOOD) { return 0.025; }
  if (t == PLANT) { return 0.015; }
  if (t == SEED) { return 0.08; }
  if (t == FLOWER) { return 0.05; }
  if (t == OIL) { return 0.3; }
  return 0.0;
}
`;

// ---------------------------------------------------------------- 畫筆、水龍頭、排水孔：每格各自看有沒有被筆刷碰到
export const STAMP = COMMON + /* wgsl */`
struct Stamp { seg: vec4f, prm: vec4f };   // seg：線段起點、終點（格子座標）；prm：半徑、材料、機率、模式
@group(0) @binding(0) var<storage, read_write> cells: array<u32>;
@group(0) @binding(1) var<uniform> S: Shared;
@group(0) @binding(2) var<uniform> ST: array<Stamp, 16>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) g: vec3u) {
  if (g.x >= S.w || g.y >= S.h) { return; }
  let idx = g.y * S.w + g.x;
  seed = pcg((idx * 7919u) ^ (S.frame * 104729u + 0x9e3779b9u));
  let p = vec2f(f32(g.x) + 0.5, f32(g.y) + 0.5);
  var cur = cells[idx];
  for (var k = 0u; k < S.nst; k++) {
    let s = ST[k];
    let a = s.seg.xy; let ab = s.seg.zw - a;
    let t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    if (length(p - (a + ab * t)) > s.prm.x) { continue; }
    if (rnd() >= s.prm.z) { continue; }
    let mat = u32(s.prm.y); let mode = u32(s.prm.w);
    let ct = ty(cur); let locked = (cur & LOCK) != 0u;
    if (mode == 0u) { if (ct == EMPTY || gas(ct)) { cur = mk(mat); } }                 // 倒進空的地方
    else if (mode == 1u) { if (!locked) { cur = select(mk(mat), 0u, mat == EMPTY); } }  // 蓋過去（牆、木頭、橡皮擦）
    else if (mode == 2u) { if (burnP(ct) > 0.0) { cur = emberOf(ct); } else if (ct == EMPTY) { cur = mk(FIRE); } else if (ct == ICE && rnd() < 0.25) { cur = mk(WATER); } }   // 火燒冰 → 水    // 點火
    else if (mode == 3u) { if (!locked && ct != WALL && ct != STONE) { cur = 0u; } }     // 排水孔：吃掉會動的東西
  }
  cells[idx] = cur;
}
`;

// ---------------------------------------------------------------- 物理：一個執行緒一個 2×2 區塊
export const STEP = COMMON + /* wgsl */`
struct Pass { off: u32, salt: u32, p0: u32, p1: u32 };
@group(0) @binding(0) var<storage, read_write> cells: array<u32>;
@group(0) @binding(1) var<uniform> S: Shared;
@group(0) @binding(2) var<uniform> P: Pass;

var<private> c: array<u32, 4>;       // 0 左上 1 右上 2 左下 3 右下
var<private> moved: array<bool, 4>;
var<private> mir: bool;            // 這個區塊有沒有左右鏡射（本地的「往右」在世界裡是往左）

fn sw(i: u32, j: u32) { let t = c[i]; c[i] = c[j]; c[j] = t; moved[i] = true; moved[j] = true; }

// 植物往哪個方向長：往上最容易，斜上次之，旁邊很少，往下不長
fn growW(i: u32, j: u32) -> f32 {
  let ri = i / 2u; let rj = j / 2u;
  if (rj < ri) { return select(0.5, 1.0, (i % 2u) == (j % 2u)); }
  if (rj == ri) { return 0.15; }
  return 0.0;
}

fn react(i: u32, j: u32) {
  let p = ty(c[i]); let q = ty(c[j]);
  if (p == LAVA && q == WATER) { c[i] = mk(STONE); c[j] = mk(STEAM); return; }
  // 冰：碰到熱的會融化；碰到水會慢慢把水凍住（有代數限制）；讓蒸氣凝結
  if (p == ICE) {
    if (q == FIRE || q == LAVA || q == EMBER) { if (rnd() < 0.3) { c[i] = mk(WATER); if (q == FIRE) { c[j] = mk(STEAM); } } return; }
    if (q == WATER) { let l = life(c[i]); if (l > 0u && rnd() < 0.006) { c[j] = setLife(mk(ICE), l - 1u); } return; }
    if (q == STEAM) { if (rnd() < 0.1) { c[j] = mk(WATER); } return; }
    return;
  }
  // 水龍頭：往下（偶爾往旁邊）出水
  if (p == SPOUT && q == EMPTY) { let down = (j / 2u) > (i / 2u); if (rnd() < select(0.06, 0.35, down)) { c[j] = mk(WATER); } return; }
  // 黑洞：吃掉旁邊會動的東西
  if (p == VOID) { if (q != EMPTY && mov(q)) { if (rnd() < 0.9) { c[j] = 0u; } } return; }
  if ((p == FIRE || p == LAVA || p == EMBER) && burnP(q) > 0.0) {
    var k = 1.0;
    if (p == LAVA) { k = 3.0; } else if (p == EMBER) { k = 1.0; }
    if (rnd() < burnP(q) * k) { c[j] = emberOf(q); }
    return;
  }
  if (p == EMBER && q == WATER) {
    if (rnd() < 0.5) { c[i] = mk(SMOKE); if (rnd() < 0.5) { c[j] = mk(STEAM); } }
    return;
  }
  if (p == EMBER && q == EMPTY) { if (rnd() < 0.12 * growW(i, j)) { c[j] = mk(FIRE); } return; }
  if (p == FIRE && q == WATER) {
    if (rnd() < 0.4) { c[i] = mk(STEAM); if (rnd() < 0.2) { c[j] = mk(STEAM); } }
    return;
  }
  if (p == SEED && q == WATER) {
    if (rnd() < 0.05) { c[i] = setLife(mk(PLANT), 40u); c[j] = 0u; }
    return;
  }
  if (p == PLANT && q == WATER) {
    if (rnd() < 0.04) { c[i] = setLife(c[i], life(c[i]) + 12u); c[j] = 0u; }
    return;
  }
  if (p == PLANT && q == EMPTY) {
    let l = life(c[i]);
    if (l > 0u && rnd() < 0.05 * growW(i, j)) {
      // 長到一定高度，偶爾開出一朵花（花不再往上長）
      c[j] = select(setLife(mk(PLANT), l - 1u), mk(FLOWER), l < 30u && rnd() < 0.045);
      if (rnd() < 0.85) { c[i] = setLife(c[i], 0u); }
    }
  }
}

fn age(i: u32) {
  let t = ty(c[i]);
  if (t != FIRE && t != SMOKE && t != STEAM && t != EMBER) { return; }
  let l = life(c[i]);
  var dec = 1u;
  if ((t == STEAM || t == EMBER) && rnd() < 0.5) { dec = 0u; }
  if (l <= dec) {
    if (t == FIRE || t == EMBER) { c[i] = select(0u, mk(SMOKE), rnd() < 0.3); }
    else if (t == SMOKE) { c[i] = 0u; }
    else { c[i] = select(0u, mk(WATER), rnd() < 0.35); }   // 蒸氣冷了變回水滴
  } else { c[i] = setLife(c[i], l - dec); }
}

fn fallP(t: u32, under: u32) -> f32 {
  if (t == SAND || t == SEED) { return select(1.0, 0.5, liquid(under)); }
  if (t == WATER || t == OIL) { return 0.98; }
  if (t == LAVA) { return 0.7; }
  return 1.0;
}

fn physics() {
  moved = array<bool, 4>(false, false, false, false);
  // 直的：重的往下、輕的（氣體）往上
  for (var col = 0u; col < 2u; col++) {
    let tt = ty(c[col]); let tb = ty(c[col + 2u]);
    if (mov(tt) && mov(tb)) {
      let dt = dens(tt); let db = dens(tb);
      if (dt > db) {
        var p = 1.0;
        if (dt > 0) { p = fallP(tt, tb); } else { p = select(0.75, 0.9, tb == FIRE); }
        if (rnd() < p) { sw(col, col + 2u); }
      }
    }
  }
  // 斜的：底下擋住了就往斜下滑（沙堆成小山）
  if (!moved[0] && !moved[3]) {
    let t0 = ty(c[0]); let t1 = ty(c[1]); let t2 = ty(c[2]); let t3 = ty(c[3]);
    let d0 = dens(t0);
    if (mov(t0) && d0 > 0 && mov(t3) && d0 > dens(t3) && (!mov(t2) || dens(t2) >= d0) && (!mov(t1) || dens(t1) < d0)) {
      var p = 0.95;
      if (t0 == SAND || t0 == SEED) { p = 0.75; } else if (t0 == LAVA) { p = 0.4; }
      if (rnd() < p) { sw(0u, 3u); }
    }
  }
  // 氣體斜著往上飄
  if (!moved[2] && !moved[1]) {
    let t2 = ty(c[2]); let t1 = ty(c[1]); let t0 = ty(c[0]);
    if (gas(t2) && mov(t1) && dens(t1) > dens(t2) && (!mov(t0) || dens(t0) <= dens(t2)) && rnd() < 0.6) { sw(2u, 1u); }
  }
  // 橫的：液體攤平、氣體散開
  for (var row = 0u; row < 2u; row++) {
    let i = row * 2u; let j = i + 1u;
    if (moved[i] || moved[j]) { continue; }
    let ti = ty(c[i]); let tj = ty(c[j]);
    if (liquid(ti)) {
      let goLeft = (c[i] & DIRB) != 0u;
      if (mov(tj) && dens(tj) < dens(ti)) { if (rnd() < spread(ti) * select(0.08, 1.0, goLeft == mir)) { sw(i, j); } }
      else if (goLeft == mir && rnd() < 0.5) { c[i] = c[i] ^ DIRB; }   // 撞到東西就回頭
    }
    else if (gas(ti) && tj == EMPTY) { if (rnd() < 0.5) { sw(i, j); } }
  }
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let ox = i32(P.off & 1u); let oy = i32((P.off >> 1u) & 1u);
  let x0 = i32(g.x * 2u) - ox; let y0 = i32(g.y * 2u) - oy;
  if (x0 >= i32(S.w) || y0 >= i32(S.h)) { return; }
  seed = pcg((g.x * 1973u) ^ pcg((g.y * 9277u) ^ (S.frame * 26699u + P.salt)));
  var ins: array<bool, 4>;
  var ids: array<u32, 4>;
  for (var k = 0u; k < 4u; k++) {
    let x = x0 + i32(k % 2u); let y = y0 + i32(k / 2u);
    ins[k] = x >= 0 && y >= 0 && x < i32(S.w) && y < i32(S.h);
    ids[k] = select(0u, u32(y) * S.w + u32(x), ins[k]);
    c[k] = select(WALL | LOCK, cells[ids[k]], ins[k]);   // 畫面外當作牆
  }
  // 隨機左右鏡射，這樣往左往右的機會一樣
  mir = rnd() < 0.5;
  if (mir) { var t = c[0]; c[0] = c[1]; c[1] = t; t = c[2]; c[2] = c[3]; c[3] = t; }

  react(0u, 1u); react(1u, 0u); react(2u, 3u); react(3u, 2u);
  react(0u, 2u); react(2u, 0u); react(1u, 3u); react(3u, 1u);
  react(0u, 3u); react(3u, 0u); react(1u, 2u); react(2u, 1u);
  for (var k = 0u; k < 4u; k++) { age(k); }
  physics();

  if (mir) { var t = c[0]; c[0] = c[1]; c[1] = t; t = c[2]; c[2] = c[3]; c[3] = t; }
  for (var k = 0u; k < 4u; k++) { if (ins[k]) { cells[ids[k]] = c[k]; } }
}
`;

// ---------------------------------------------------------------- 液體橫流：只看左右兩格，讓水面很快攤平
// Margolus 一次只能走一格，水堆會攤得很慢；這一輪只讓「已經躺在東西上面」的液體順著自己的方向往旁邊流。
export const FLOW = COMMON + /* wgsl */`
struct Pass { off: u32, salt: u32, p0: u32, p1: u32 };
@group(0) @binding(0) var<storage, read_write> cells: array<u32>;
@group(0) @binding(1) var<uniform> S: Shared;
@group(0) @binding(2) var<uniform> P: Pass;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let x0 = i32(g.x * 2u) - i32(P.off & 1u); let y = i32(g.y);
  let W = i32(S.w);
  if (y >= i32(S.h) || x0 >= W) { return; }
  seed = pcg((g.x * 7717u) ^ pcg((g.y * 3301u) ^ (S.frame * 15731u + P.salt * 3u)));
  let mir = rnd() < 0.5;   // true：從右邊那格往左流
  let xi = select(x0, x0 + 1, mir); let xj = select(x0 + 1, x0, mir);
  if (xi < 0 || xj < 0 || xi >= W || xj >= W) { return; }
  let ii = u32(y * W + xi); let jj = u32(y * W + xj);
  let a = cells[ii]; let ta = ty(a);
  if (!liquid(ta)) { return; }
  if (((a & DIRB) != 0u) != mir) { return; }   // 只往自己記得的方向流
  let b = cells[jj]; let tb = ty(b);
  if (mov(tb) && dens(tb) < dens(ta)) {
    if (y + 1 < i32(S.h)) { let tu = ty(cells[ii + S.w]); if (mov(tu) && dens(tu) < dens(ta)) { return; } }   // 底下是空的就讓它先掉
    if (rnd() < spread(ta)) { cells[ii] = b; cells[jj] = a; }
  } else if (rnd() < 0.5) { cells[ii] = a ^ DIRB; }
}
`;

// ---------------------------------------------------------------- 數格子（關卡目標）
export const COUNT = COMMON + /* wgsl */`
struct Regions { rect: array<vec4f, 8>, mask: array<vec4u, 2>, n: vec4u };
@group(0) @binding(0) var<storage, read> cells: array<u32>;
@group(0) @binding(1) var<uniform> S: Shared;
@group(0) @binding(2) var<uniform> R: Regions;
@group(0) @binding(3) var<storage, read_write> cnt: array<atomic<u32>, 8>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) g: vec3u) {
  if (g.x >= S.w || g.y >= S.h) { return; }
  let t = ty(cells[g.y * S.w + g.x]);
  let x = f32(g.x); let y = f32(g.y);
  for (var k = 0u; k < R.n.x; k++) {
    let r = R.rect[k];
    if (x >= r.x && x < r.z && y >= r.y && y < r.w) {
      if (((R.mask[k / 4u][k % 4u] >> t) & 1u) == 1u) { atomicAdd(&cnt[k], 1u); }
    }
  }
}
`;

// ---------------------------------------------------------------- 畫面
// 每個畫面像素：找到自己落在哪一格、格子裡的哪個位置（做顆粒、磚塊的立體感），
// 再看上面、左邊是不是空的（受光面）、上面堆了多深（越深越暗），最後加上火和岩漿照亮附近的光。
export const DRAW = COMMON + /* wgsl */`
@group(0) @binding(0) var<storage, read> cells: array<u32>;
@group(0) @binding(1) var<uniform> S: Shared;

struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: VO;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv = vec2f((p[i].x + 1.0) * 0.5, (1.0 - p[i].y) * 0.5);
  return o;
}
fn at(x: i32, y: i32) -> u32 {
  if (x < 0 || y < 0 || x >= i32(S.w) || y >= i32(S.h)) { return 0u; }
  return cells[u32(y) * S.w + u32(x)];
}
fn hot(x: i32, y: i32) -> f32 {
  let t = ty(at(x, y));
  if (t == FIRE) { return 1.0; }
  if (t == LAVA) { return 0.9; }
  if (t == EMBER) { return 0.7; }
  return 0.0;
}
fn filled(t: u32) -> bool { return t != EMPTY && !gas(t); }
fn h2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }

// 背景：黃昏的天空、遠山、星星
fn sky(uv: vec2f) -> vec3f {
  var c = mix(vec3f(0.05, 0.06, 0.15), vec3f(0.20, 0.13, 0.26), smoothstep(0.0, 1.0, uv.y));
  c = mix(c, vec3f(0.36, 0.20, 0.30), smoothstep(0.55, 1.0, uv.y) * 0.5);
  let sg = uv * vec2f(160.0, 95.0);
  let st = floor(sg);
  let tw = h2(st);
  let sd = length(fract(sg) - vec2f(h2(st + 3.1), h2(st + 7.7)) * 0.6 - 0.2);
  if (tw > 0.975 && uv.y < 0.62) { c += vec3f(0.75, 0.75, 0.9) * smoothstep(0.09, 0.0, sd) * (0.6 + 0.4 * sin(S.time * 2.0 + tw * 40.0)) * (1.0 - uv.y / 0.62); }
  let h1 = 0.70 + 0.05 * sin(uv.x * 6.0 + 1.0) + 0.025 * sin(uv.x * 17.0 + 2.0);
  if (uv.y > h1) { c = mix(c, vec3f(0.09, 0.08, 0.17), 0.85); }
  let hh = 0.80 + 0.04 * sin(uv.x * 9.0 + 4.0) + 0.02 * sin(uv.x * 23.0);
  if (uv.y > hh) { c = mix(c, vec3f(0.06, 0.06, 0.12), 0.9); }
  return c;
}

@fragment fn fs(in: VO) -> @location(0) vec4f {
  let gx = in.uv.x * f32(S.w); let gy = in.uv.y * f32(S.h);
  let x = clamp(i32(gx), 0, i32(S.w) - 1); let y = clamp(i32(gy), 0, i32(S.h) - 1);
  let f = vec2f(fract(gx), fract(gy));
  let c = at(x, y); let t = ty(c);
  let v = f32((c >> 8u) & 255u) / 255.0;
  let tm = S.time;
  let bg = sky(in.uv);
  var rgb = bg;
  var lit = 0.0;      // 自己發光
  var shade = true;   // 要不要做立體感
  let up = ty(at(x, y - 1)); let lf = ty(at(x - 1, y)); let dn = ty(at(x, y + 1)); let rt = ty(at(x + 1, y));
  // 往上數堆了幾格（越深越暗）
  var depth = 0.0;
  for (var k = 1; k <= 6; k++) { if (filled(ty(at(x, y - k)))) { depth += 1.0; } else { break; } }
  // 顆粒：格子邊緣暗一點，看起來是一粒一粒的
  let e = max(abs(f.x - 0.5), abs(f.y - 0.5));
  let grain = 1.0 - smoothstep(0.28, 0.5, e) * 0.28;

  switch t {
    case 0u {   // 空氣：旁邊有煙或蒸氣的話畫一點淡淡的邊，雲看起來是柔的
      var sm = 0.0; var st = 0.0;
      for (var dy = -2; dy <= 2; dy++) { for (var dx = -2; dx <= 2; dx++) { let q = ty(at(x + dx, y + dy)); if (q == SMOKE) { sm += 1.0; } if (q == STEAM) { st += 1.0; } } }
      rgb = mix(bg, vec3f(0.30, 0.29, 0.32), smoothstep(0.0, 18.0, sm) * 0.6);
      rgb = mix(rgb, vec3f(0.9, 0.93, 0.98), smoothstep(0.0, 18.0, st) * 0.45);
      shade = false;
    }
    case 1u {   // 牆：磚塊，每塊有自己的亮暗和斜角
      let row = y / 3; let bx = (x + (row % 2) * 3) / 6;
      let fx = (f32((x + (row % 2) * 3) % 6) + f.x) / 6.0; let fy = (f32(y % 3) + f.y) / 3.0;
      let bv = h2(vec2f(f32(bx), f32(row)));
      rgb = vec3f(0.42, 0.40, 0.46) * (0.85 + bv * 0.25);
      let mortar = min(min(fx, 1.0 - fx) * 6.0, min(fy, 1.0 - fy) * 3.0);
      rgb *= mix(0.55, 1.0, smoothstep(0.05, 0.25, mortar));
      rgb += vec3f(0.06) * smoothstep(0.6, 0.0, fy) * smoothstep(0.1, 0.3, mortar);
      shade = false;
    }
    case 2u {   // 沙：每一粒顏色都不太一樣（淺黃、土黃、少數深色的小石英和黑色礦物），表面有一點閃光
      let r1 = h2(vec2f(f32(x), f32(y)) * 0.731);
      var sc = mix(vec3f(0.93, 0.80, 0.56), vec3f(0.78, 0.60, 0.37), v);
      sc = mix(sc, vec3f(0.55, 0.45, 0.33), step(0.93, r1));            // 深色顆粒
      sc = mix(sc, vec3f(0.25, 0.22, 0.20), step(0.985, r1));           // 黑色礦物
      sc = mix(sc, vec3f(1.0, 0.97, 0.88), step(0.975, h2(vec2f(f32(x), f32(y)) + floor(tm * 3.0))) * 0.5 * select(0.0, 1.0, !filled(up)));   // 表面偶爾閃一下
      rgb = sc * (1.0 - smoothstep(0.3, 0.5, e) * 0.12);
    }
    case 3u {   // 水：越深越藍，表面亮，半透明
      let d = 0.0 + depth;
      // 真的水是透明的：看得到後面（稍微被折射扭曲），越深越偏藍綠、越暗；表面有一條反光
      let wob = vec2f(sin(tm * 1.7 + gy * 0.35), cos(tm * 1.3 + gx * 0.29)) * 0.004;
      let behind = sky(in.uv + wob);
      let k = clamp(d / 6.0, 0.0, 1.0);
      let absorb = exp(-vec3f(0.55, 0.22, 0.12) * (d + 1.0) * 0.55);
      var w = behind * absorb + vec3f(0.03, 0.12, 0.2) * (0.6 + k);
      w += vec3f(0.5, 0.75, 1.0) * 0.06 * (0.5 + 0.5 * sin(tm * 2.2 + f32(x) * 0.45 + f32(y) * 0.8)) * (1.0 - k);   // 水裡的光紋
      if (up != WATER && up != OIL) { w = mix(w, vec3f(0.85, 0.95, 1.0), smoothstep(0.6, 0.0, f.y) * 0.65); }
      rgb = w;
      shade = false;
    }
    case 4u {   // 岩漿：亮橘色，表面有慢慢流動的暗色硬殼
      let k = 0.5 + 0.5 * sin(tm * 1.6 + v * 6.28 + f32(x) * 0.17 - f32(y) * 0.11);
      rgb = mix(vec3f(1.0, 0.35, 0.05), vec3f(1.0, 0.85, 0.3), k);
      let crust = smoothstep(0.62, 0.8, h2(vec2f(f32(x / 2), f32(y / 2)) + floor(tm * 0.6)));
      rgb = mix(rgb, vec3f(0.35, 0.07, 0.03), crust * 0.6 * step(0.5, depth + 0.6));
      lit = 1.0; shade = false;
    }
    case 5u {   // 木頭：木紋
      let ring = 0.5 + 0.5 * sin(f32(y) * 0.9 + sin(f32(x) * 0.25 + v * 3.0) * 2.0);
      rgb = mix(vec3f(0.40, 0.24, 0.12), vec3f(0.60, 0.40, 0.21), ring) * (0.92 + v * 0.12);
    }
    case 6u {   // 植物：葉子圓圓的
      let leaf = 1.0 - smoothstep(0.2, 0.6, length(f - 0.5)) * 0.35;
      rgb = mix(vec3f(0.14, 0.52, 0.20), vec3f(0.36, 0.80, 0.30), v) * leaf;
      if (life(c) > 0u) { rgb = mix(rgb, vec3f(0.65, 1.0, 0.5), 0.45); }
    }
    case 7u { rgb = vec3f(0.62, 0.45, 0.22) * (0.8 + v * 0.35) * grain; }
    case 8u {
      let k = clamp(f32(life(c)) / 55.0, 0.0, 1.0);
      rgb = mix(vec3f(0.95, 0.20, 0.05), vec3f(1.0, 0.95, 0.55), k * k);
      rgb = mix(bg, rgb, 0.65 + 0.35 * k);
      lit = 1.0; shade = false;
    }
    case 9u, 10u {   // 蒸氣、煙：看周圍 5×5 有多少同樣的氣體，做成一團一團柔柔的雲，而不是一格一格
      var cnt = 0.0;
      for (var dy = -2; dy <= 2; dy++) { for (var dx = -2; dx <= 2; dx++) { if (ty(at(x + dx, y + dy)) == t) { cnt += 1.0; } } }
      let dens = smoothstep(0.0, 18.0, cnt);
      let gc = select(vec3f(0.30, 0.29, 0.32), vec3f(0.9, 0.93, 0.98), t == 9u);
      rgb = mix(bg, gc, dens * select(0.75, 0.55, t == 9u));
      shade = false;
    }
    case 11u { rgb = (vec3f(0.30, 0.28, 0.31) + v * 0.08 + 0.05 * h2(vec2f(f32(x), f32(y)) * 1.7)) * grain; }
    case 12u {   // 油：深色，表面有彩虹光
      rgb = vec3f(0.20, 0.13, 0.18) + v * 0.04;
      if (up != OIL) {
        let hue = f32(x) * 0.08 + tm * 0.4;
        rgb += (0.5 + 0.5 * cos(vec3f(0.0, 2.1, 4.2) + hue)) * 0.25 * smoothstep(0.6, 0.0, f.y);
      }
      shade = false;
    }
    case 13u {
      let k = 0.5 + 0.5 * sin(tm * 9.0 + v * 25.0);
      rgb = mix(vec3f(0.55, 0.08, 0.02), vec3f(1.0, 0.6, 0.15), k); lit = 1.0; shade = false;
    }
    case 14u {   // 冰：淡藍、半透明、斜斜的反光
      rgb = mix(bg, vec3f(0.72, 0.90, 1.0), 0.78) + vec3f(0.12) * step(0.9, fract((f32(x) + f.x + f32(y) + f.y) * 0.18 + v * 0.3));
    }
    case 15u {   // 花：五種顏色，中間黃色花心
      var pal = array<vec3f, 5>(vec3f(1.0, 0.45, 0.70), vec3f(1.0, 0.85, 0.25), vec3f(0.75, 0.50, 1.0), vec3f(1.0, 0.98, 0.95), vec3f(1.0, 0.30, 0.30));
      let col = pal[min(4u, u32(v * 5.0))];
      let r = length(f - 0.5);
      rgb = mix(col, vec3f(1.0, 0.9, 0.3), smoothstep(0.22, 0.12, r)) * (1.0 - smoothstep(0.42, 0.55, r) * 0.4);
    }
    case 16u {   // 水龍頭：金屬管
      rgb = mix(vec3f(0.55, 0.60, 0.68), vec3f(0.85, 0.90, 0.95), smoothstep(0.0, 1.0, 1.0 - abs(f.x - 0.5) * 2.0));
      rgb = mix(rgb, vec3f(0.35, 0.65, 1.0), smoothstep(0.25, 0.1, length(f - 0.5)));
      shade = false;
    }
    case 17u {   // 黑洞：黑色、外圈紫色旋轉
      let ang = atan2(f.y - 0.5, f.x - 0.5);
      rgb = mix(vec3f(0.01), vec3f(0.55, 0.25, 0.95), smoothstep(0.25, 0.5, length(f - 0.5)) * (0.5 + 0.5 * sin(ang * 3.0 + tm * 6.0)));
      lit = 0.5; shade = false;
    }
    default {}
  }
  // 立體感：上面空著的受光、左邊空著的受光、下面空著的有陰影；被埋越深越暗
  if (shade) {
    if (!filled(up)) { rgb += vec3f(0.16, 0.14, 0.10) * smoothstep(0.45, 0.0, f.y); }
    if (!filled(lf)) { rgb += vec3f(0.07) * smoothstep(0.45, 0.0, f.x); }
    if (!filled(rt)) { rgb *= mix(1.0, 0.82, smoothstep(0.55, 1.0, f.x)); }
    if (!filled(dn)) { rgb *= mix(1.0, 0.75, smoothstep(0.5, 1.0, f.y)); }
    rgb *= 1.0 - depth * 0.035;
  }
  // 物體在背景上投下一點影子（讓東西浮在畫面上）
  if (t == EMPTY && filled(ty(at(x - 1, y - 1)))) { rgb *= 0.82; }
  // 火、岩漿照亮附近（越近越亮）
  if (S.glow > 0.0 && lit < 1.0) {
    var g = 0.0;
    var dirs = array<vec2i, 8>(vec2i(1, 0), vec2i(-1, 0), vec2i(0, 1), vec2i(0, -1), vec2i(1, 1), vec2i(-1, 1), vec2i(1, -1), vec2i(-1, -1));
    var rings = array<i32, 4>(2, 4, 7, 11);
    var wts = array<f32, 4>(1.0, 0.7, 0.45, 0.25);
    for (var r = 0; r < 4; r++) { for (var d = 0; d < 8; d++) { let o = dirs[d] * rings[r]; g += hot(x + o.x, y + o.y) * wts[r]; } }
    rgb += vec3f(1.0, 0.48, 0.15) * g * 0.035 * S.glow;
  }
  return vec4f(rgb, 1.0);
}
`;
