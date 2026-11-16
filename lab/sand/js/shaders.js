// 沙之實驗室的 WGSL 著色器
// 格子：每格一個 u32 —— 第 0–7 位元：材料，8–15：顏色變化（出生時隨機），16–23：壽命／能量，26：關卡鎖定（橡皮擦擦不掉）
// 移動用 Margolus 鄰域：每個執行緒負責一個 2×2 區塊，四個格子只有它在讀寫，所以不會互相打架；
// 每一格輪流換區塊的位移（0,0）（1,1）（1,0）（0,1），粒子才能跨區塊移動。

export const COMMON = /* wgsl */`
const EMPTY = 0u; const WALL = 1u; const SAND = 2u; const WATER = 3u; const LAVA = 4u; const WOOD = 5u; const PLANT = 6u;
const SEED = 7u; const FIRE = 8u; const STEAM = 9u; const SMOKE = 10u; const STONE = 11u; const OIL = 12u; const EMBER = 13u;
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
    else if (mode == 2u) { if (burnP(ct) > 0.0) { cur = emberOf(ct); } else if (ct == EMPTY) { cur = mk(FIRE); } }    // 點火
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
      c[j] = setLife(mk(PLANT), l - 1u);
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
  if (x < 0 || y < 0 || x >= i32(S.w) || y >= i32(S.h)) { return WALL; }
  return cells[u32(y) * S.w + u32(x)];
}
fn hot(x: i32, y: i32) -> f32 {
  let t = ty(at(x, y));
  if (t == FIRE) { return 1.0; }
  if (t == LAVA || t == EMBER) { return 0.8; }
  return 0.0;
}

@fragment fn fs(in: VO) -> @location(0) vec4f {
  let x = clamp(i32(in.uv.x * f32(S.w)), 0, i32(S.w) - 1);
  let y = clamp(i32(in.uv.y * f32(S.h)), 0, i32(S.h) - 1);
  let c = at(x, y); let t = ty(c);
  let v = f32((c >> 8u) & 255u) / 255.0;
  let tm = S.time;
  var bg = mix(vec3f(0.05, 0.07, 0.13), vec3f(0.08, 0.10, 0.19), in.uv.y);
  if (x % 16 == 0 || y % 16 == 0) { bg += vec3f(0.012, 0.016, 0.03); }
  var rgb = bg;
  var lit = 0.0;   // 自己會發光的
  switch t {
    case 1u {   // 牆：磚塊
      rgb = vec3f(0.34, 0.37, 0.45) + v * 0.05;
      let row = y / 4;
      if (y % 4 == 0 || (x + (row % 2) * 4) % 8 == 0) { rgb *= 0.72; }
    }
    case 2u { rgb = mix(vec3f(0.95, 0.82, 0.52), vec3f(0.80, 0.63, 0.35), v); }
    case 3u {
      rgb = mix(vec3f(0.13, 0.42, 0.88), vec3f(0.20, 0.53, 0.96), v) + 0.035 * sin(tm * 3.0 + f32(x) * 0.31 + f32(y) * 0.17);
      if (ty(at(x, y - 1)) != WATER) { rgb = mix(rgb, vec3f(0.62, 0.85, 1.0), 0.6); }   // 水面
    }
    case 4u {
      let k = 0.5 + 0.5 * sin(tm * 2.0 + v * 6.28 + f32(x) * 0.15 - f32(y) * 0.1);
      rgb = mix(vec3f(0.95, 0.28, 0.04), vec3f(1.0, 0.72, 0.15), k); lit = 1.0;
    }
    case 5u { rgb = vec3f(0.47, 0.30, 0.15) + 0.05 * sin(f32(y) * 1.7 + v * 3.0) + v * 0.04; }
    case 6u {
      rgb = mix(vec3f(0.16, 0.56, 0.20), vec3f(0.33, 0.77, 0.27), v);
      if (life(c) > 0u) { rgb = mix(rgb, vec3f(0.6, 0.95, 0.45), 0.5); }
    }
    case 7u { rgb = vec3f(0.58, 0.43, 0.22) * (0.8 + v * 0.35); }
    case 8u {
      let k = clamp(f32(life(c)) / 60.0, 0.0, 1.0);
      rgb = mix(vec3f(0.95, 0.22, 0.05), vec3f(1.0, 0.92, 0.4), k); lit = 1.0;
    }
    case 9u { rgb = mix(bg, vec3f(0.86, 0.90, 0.96), 0.42 + v * 0.12); }
    case 10u { rgb = mix(bg, vec3f(0.33, 0.33, 0.36), 0.55); }
    case 11u { rgb = vec3f(0.26, 0.24, 0.27) + v * 0.08; }
    case 13u {
      let k = 0.5 + 0.5 * sin(tm * 9.0 + v * 25.0);
      rgb = mix(vec3f(0.55, 0.08, 0.02), vec3f(1.0, 0.55, 0.12), k); lit = 1.0;
    }
    case 12u { rgb = vec3f(0.24, 0.15, 0.22) + v * 0.05 + 0.03 * sin(tm * 2.0 + f32(x) * 0.5); }
    default {}
  }
  // 火和岩漿照亮附近
  if (S.glow > 0.0 && lit == 0.0) {
    var g = 0.0;
    g += hot(x + 3, y) + hot(x - 3, y) + hot(x, y + 3) + hot(x, y - 3);
    g += 0.5 * (hot(x + 7, y + 4) + hot(x - 7, y - 4) + hot(x - 4, y + 7) + hot(x + 4, y - 7));
    rgb += vec3f(1.0, 0.45, 0.12) * g * 0.07 * S.glow;
  }
  return vec4f(rgb, 1.0);
}
`;
