'use strict';
// 守塔奇兵：敵人美術（第三版：分部位骨架、四階光影、每種敵人都有走路／攻擊／受擊／死亡動畫）。
// 原點 = 腳底中心（飛行敵人是身體中心下方），面向右；R = 體型單位。
// 動畫：walk 8 格（走路、拍翅、蠕動）、atk 6 格（蓄力→出手→收回）、hit 2 格（受擊縮一下）、die 6 格（各自的倒下方式）；
// 頭目另外有 idle 6 格（呼吸）和 cast 6 格（放招）。每一格先在兩倍大的畫布上畫好再縮小快取，之後每幀只貼圖。

const Beasts = (() => {
  const { TAU } = Gfx;
  const { mat, P, part, eye, mouth, blush } = Rig;
  const N = { walk: 8, atk: 6, hit: 2, die: 6, idle: 6, cast: 6 };
  const FR = N.walk, FA = N.atk;
  // w 寬、h 高、ay 原點離上緣、top 血條高度、vis 視覺放大；die：倒下時畫面層怎麼處理
  //   fall = 往後倒（畫面層轉）、bake = 動畫本身已經畫好、fly = 從空中旋轉掉下
  const BOX = {};
  const DEF = {};
  function def(k, box, draw) { BOX[k] = box; DEF[k] = draw; }

  // 動畫狀態：每個角色都用同一套數值解讀動作
  function pose(an, t) {
    const s = { an, t, walk: an === 'walk', ph: an === 'walk' ? t * TAU : (an === 'idle' ? t * TAU : 0) };
    s.sw = an === 'atk' ? Rig.swing(t) : 0;
    s.hit = an === 'hit' ? (t < 0.5 ? 1 : 0.55) : 0;
    s.die = an === 'die' ? t : 0;
    s.cast = an === 'cast' ? Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 * 0.6 : 1) : 0;
    s.br = an === 'idle' ? Math.sin(t * TAU) : 0;
    // 武器揮動的角度：靜止 → 蓄力 → 出手 → 回到靜止（一路同方向轉，不會跳）
    s.arc = (rest, wind, strike) => {
      if (an !== 'atk') return rest;
      const e = Rig.ease;
      if (t < 0.4) return rest + (wind - rest) * e(t / 0.4);
      if (t < 0.6) return wind + (strike - wind) * e((t - 0.4) / 0.2);
      const to = Math.abs(strike - rest) > Math.PI ? rest + Math.sign(strike - rest) * TAU : rest;
      return strike + (to - strike) * e((t - 0.6) / 0.4);
    };
    s.mood = s.hit ? 'shut' : s.die > 0.1 ? 'x' : s.sw > 0.15 || s.sw < -0.3 ? 'angry' : 'n';
    return s;
  }
  // ───────── 共用小零件 ─────────
  const OUT = Rig.OUT;
  const lw = R => R * 0.075;
  // 兩段式的四肢（大腿＋小腿），回傳末端座標
  function limb2(x, hx, hy, a1, a2, l1, l2, r0, r1, m, o) {
    const [kx, ky, fx, fy] = Rig.leg(hx, hy, a1, a2, l1, l2);
    const R = r0 * 3.2;
    part(x, P.cap(kx, ky, fx, fy, (r0 + r1) * 0.5, r1), m, (kx + fx) / 2, (ky + fy) / 2, R * 0.5, { lw: (o && o.lw) || r0 * 0.5 });
    part(x, P.cap(hx, hy, kx, ky, r0, (r0 + r1) * 0.5), m, (hx + kx) / 2, (hy + ky) / 2, R * 0.5, { lw: (o && o.lw) || r0 * 0.5 });
    return [kx, ky, fx, fy];
  }
  // 小靴子／腳掌
  function foot(x, fx, fy, len, h, m, R, dir) {
    dir = dir || 1;
    const p = P.fn(q => { q.moveTo(fx - len * 0.35 * dir, fy - h); q.quadraticCurveTo(fx + len * 0.55 * dir, fy - h * 1.1, fx + len * 0.68 * dir, fy - h * 0.25); q.quadraticCurveTo(fx + len * 0.66 * dir, fy + h * 0.05, fx + len * 0.3 * dir, fy); q.lineTo(fx - len * 0.38 * dir, fy); q.quadraticCurveTo(fx - len * 0.48 * dir, fy - h * 0.5, fx - len * 0.35 * dir, fy - h); q.closePath(); });
    part(x, p, m, fx, fy - h * 0.5, len * 0.5, { lw: lw(R) * 0.8 });
  }
  function crystal(x, cx, cy, w, h, col, rot, R) {
    x.save(); x.translate(cx, cy); x.rotate(rot || 0);
    const p = P.poly([-w, 0, -w * 0.82, -h * 0.72, 0, -h, w * 0.82, -h * 0.72, w, 0, 0, h * 0.18]);
    part(x, p, mat(col, { gloss: 0.6, sh: 0.4, shc: '#3a3a9a' }), 0, -h * 0.5, Math.max(w, h * 0.5), { lw: lw(R) * 0.6, hd: 0.3 });
    x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = Math.max(0.6, w * 0.2); x.lineCap = 'round';
    x.beginPath(); x.moveTo(-w * 0.35, -h * 0.12); x.lineTo(-w * 0.32, -h * 0.75); x.stroke(); x.lineCap = 'butt';
    x.restore();
  }
  // 受擊：整隻往後縮一下（以腳底為軸）
  function flinch(x, s, R, k) { if (s.hit) { x.translate(-R * 0.12 * s.hit, 0); x.rotate(-(k || 0.12) * s.hit); } }

  // ───────── 史萊姆家族 ─────────
  function slime(x, R, s, col, kind) {
    const ph = s.ph;
    let lift = 0, sx = 1, sy = 1, lean = 0, fwd = 0;
    if (s.walk) {
      const air = Math.sin(ph);
      if (air > 0) { lift = air * R * 0.36; sy = 1 + Math.cos(ph) * 0.1; sx = 1 / sy; lean = Math.cos(ph) * 0.1; }
      else { const q = -air; sy = 1 - q * 0.2; sx = 1 + q * 0.18; }
    }
    if (s.sw) { if (s.sw < 0) { sy = 1 + s.sw * 0.22; sx = 1 - s.sw * 0.14; lean = s.sw * 0.18; } else { sx = 1 + s.sw * 0.2; sy = 1 - s.sw * 0.08; fwd = s.sw * R * 0.45; lean = s.sw * 0.22; } }
    if (s.hit) { sx = 1 + s.hit * 0.16; sy = 1 - s.hit * 0.18; lean = -s.hit * 0.15; fwd = -s.hit * R * 0.1; }
    let puddle = 0;
    if (s.die) { const q = Math.min(1, s.die / 0.45); sy = 1 - q * 0.72; sx = 1 + q * 0.75; puddle = Math.max(0, (s.die - 0.35) / 0.65); }
    const w = R * 1.08 * sx, h = R * 1.42 * sy;
    // 地上的濕痕（跳起來時變淡）
    x.save(); x.globalAlpha = 0.45 * (1 - Math.min(1, lift / (R * 0.36)));
    x.fillStyle = Gfx.mix(col, '#1a0c24', 0.35); x.beginPath(); x.ellipse(0, 0, w * (0.95 + puddle * 0.5), R * (0.15 + puddle * 0.12), 0, 0, TAU); x.fill(); x.restore();
    x.save(); x.translate(fwd, -lift); x.rotate(lean);
    const body = P.fn(q => { q.moveTo(-w, 0); q.bezierCurveTo(-w * 1.1, -h * 0.72, -w * 0.5, -h, 0, -h); q.bezierCurveTo(w * 0.6, -h, w * 1.08, -h * 0.7, w, 0); q.quadraticCurveTo(0, R * 0.16, -w, 0); q.closePath(); });
    const m = mat(col, { gloss: 1, sh: 0.5, hia: 0.7 });
    part(x, body, m, 0, -h * 0.5, Math.max(w, h * 0.6), {
      lw: lw(R) * 1.1, sd: 0.3,
      tex: q => {
        // 半透明的核心與氣泡
        q.fillStyle = Gfx.rgba(Gfx.mix(col, '#2a1040', 0.4), 0.32); q.beginPath(); q.ellipse(w * 0.12, -h * 0.32, w * 0.62, h * 0.36, 0, 0, TAU); q.fill();
        if (kind === 'split') for (const [ix, iy, ir] of [[-0.4, -0.36, 0.25], [0.38, -0.5, 0.22], [0.02, -0.18, 0.21]]) {
          const cx = ix * w, cy = iy * h * 1.25, r = ir * R;
          q.fillStyle = Gfx.rgba('#ffd0ea', 0.55); q.beginPath(); q.ellipse(cx, cy, r, r * 0.85, 0, 0, TAU); q.fill();
          q.fillStyle = '#5a1040'; q.beginPath(); q.arc(cx + r * 0.25, cy - r * 0.1, r * 0.13, 0, TAU); q.arc(cx + r * 0.6, cy - r * 0.1, r * 0.11, 0, TAU); q.fill();
        }
        q.strokeStyle = 'rgba(255,255,255,.55)'; q.lineWidth = R * 0.035;
        for (const [ix, iy, ir] of [[-0.5, -0.22, 0.09], [0.55, -0.18, 0.06], [0.2, -0.1, 0.05], [-0.18, -0.55, 0.045]]) { q.beginPath(); q.arc(ix * w, iy * h, ir * R, 0, TAU); q.stroke(); }
      },
      post: q => {
        q.strokeStyle = 'rgba(255,255,255,.28)'; q.lineWidth = R * 0.16; q.stroke(body);
        q.fillStyle = Gfx.rgba(Gfx.mix(col, '#ffffff', 0.55), 0.5); q.beginPath(); q.ellipse(-w * 0.1, -h * 0.42, w * 0.35, h * 0.25, -0.3, 0, TAU); q.fill();
        // 大片亮面
        q.strokeStyle = 'rgba(255,255,255,.85)'; q.lineWidth = R * 0.1; q.lineCap = 'round';
        q.beginPath(); q.arc(0, -h * 0.5, Math.min(w, h) * 0.78, Math.PI * 1.08, Math.PI * 1.38); q.stroke();
        q.fillStyle = '#fff'; q.beginPath(); q.arc(-w * 0.12, -h * 0.9, R * 0.065, 0, TAU); q.fill();
      },
    });
    // 頭頂的裝飾：史萊姆長了兩片嫩芽、小膠綁蝴蝶結、分裂膠頭上三個小水滴
    if (!s.die || s.die < 0.3) {
      if (kind === 'slime') {
        Rig.seg(x, R * 0.0, -h + R * 0.04, R * 0.04, -h - R * 0.22, OUT, R * 0.11); Rig.seg(x, R * 0.0, -h + R * 0.04, R * 0.04, -h - R * 0.22, '#6ab83a', R * 0.055);
        for (const sd of [-1, 1]) { x.save(); x.translate(R * 0.04, -h - R * 0.2); x.rotate(sd * 0.9 + (s.walk ? Math.sin(s.ph) * 0.15 : 0)); part(x, P.fn(q => { q.moveTo(0, 0); q.quadraticCurveTo(R * 0.16, -R * 0.12, 0, -R * 0.38); q.quadraticCurveTo(-R * 0.16, -R * 0.12, 0, 0); q.closePath(); }), mat('#9ae05a'), 0, -R * 0.18, R * 0.16, { lw: lw(R) * 0.7, tex: q => Rig.seg(q, 0, -R * 0.04, 0, -R * 0.3, 'rgba(40,110,30,.6)', R * 0.03) }); x.restore(); }
      } else if (kind === 'mini') {
        x.save(); x.translate(-R * 0.15, -h * 0.92); x.rotate(-0.35);
        for (const sd of [-1, 1]) part(x, P.fn(q => { q.moveTo(0, 0); q.quadraticCurveTo(sd * R * 0.3, -R * 0.25, sd * R * 0.36, 0); q.quadraticCurveTo(sd * R * 0.3, R * 0.22, 0, 0); q.closePath(); }), mat('#ff4a7a'), sd * R * 0.18, 0, R * 0.2, { lw: lw(R) * 0.7 });
        part(x, P.circ(0, 0, R * 0.09), mat('#ff4a7a', { gloss: 0.6 }), 0, 0, R * 0.09, { lw: lw(R) * 0.6 });
        x.restore();
      } else {
        for (const [dx, hh, rr] of [[-0.22, 0.28, -0.4], [0.04, 0.4, 0], [0.3, 0.26, 0.4]]) { x.save(); x.translate(dx * R, -h + R * 0.08 + Math.abs(dx) * R * 0.25); x.rotate(rr); part(x, P.fn(q => { q.moveTo(-R * 0.1, 0); q.quadraticCurveTo(-R * 0.06, -R * hh, 0, -R * hh * 1.1); q.quadraticCurveTo(R * 0.06, -R * hh, R * 0.1, 0); q.closePath(); }), m, 0, -R * hh * 0.5, R * 0.15, { lw: lw(R) * 0.7 }); x.restore(); }
      }
    }
    // 臉
    const ey = -h * 0.56, ec = Gfx.mix(col, '#140820', 0.65);
    const mood = s.mood;
    eye(x, R * 0.08 + (sx - 1) * R * 0.2, ey, R * 0.26 * Math.min(1.1, sy + 0.2), { iris: ec, mood, look: [0.3, 0.15] });
    eye(x, R * 0.6 + (sx - 1) * R * 0.5, ey, R * 0.24 * Math.min(1.1, sy + 0.2), { iris: ec, mood, look: [0.3, 0.15] });
    blush(x, -R * 0.05, ey + R * 0.3, R * 0.13); blush(x, R * 0.75, ey + R * 0.3, R * 0.12);
    const my = ey + R * 0.36;
    if (s.die) mouth(x, R * 0.36, my, R * 0.14, 'wavy');
    else if (s.hit) mouth(x, R * 0.36, my, R * 0.16, 'o', R * 0.22);
    else if (s.sw > 0.1) mouth(x, R * 0.36, my - R * 0.04, R * 0.2, 'roar', R * 0.25 * s.sw);
    else if (s.sw < -0.2) mouth(x, R * 0.36, my, R * 0.14, 'frown');
    else mouth(x, R * 0.36, my - R * 0.08, R * 0.17, 'smile');
    x.restore();
    // 死亡：濺出的小水滴
    if (s.die > 0.15) {
      const q = (s.die - 0.15) / 0.85;
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (1.08 + i * 0.17), d = R * (0.9 + q * 0.9), dx = Math.cos(a) * d, dy = Math.sin(a) * d * 0.7 - R * 0.2 + q * q * R * 0.9;
        if (dy > -R * 0.05) continue;
        part(x, P.circ(dx, dy, R * 0.09 * (1 - q * 0.4)), m, dx, dy, R * 0.09, { lw: lw(R) * 0.6 });
      }
    }
  }
  def('slime', { w: 3.0, h: 2.9, ay: 2.3, top: 1.85, vis: 1.45, die: 'bake' }, (x, R, s) => slime(x, R, s, '#62d050', 'slime'));
  def('mini', { w: 3.0, h: 2.9, ay: 2.3, top: 1.85, vis: 1.5, die: 'bake' }, (x, R, s) => slime(x, R, s, '#ff96cc', 'mini'));
  def('splitter', { w: 3.0, h: 2.9, ay: 2.3, top: 1.9, vis: 1.38, die: 'bake' }, (x, R, s) => slime(x, R, s, '#ff62b0', 'split'));

  // ───────── 疾風狼 ─────────
  def('runner', { w: 4.4, h: 3.1, ay: 2.4, top: 1.85, vis: 1.45, die: 'bake' }, (x, R, s) => {
    const fur = mat('#f0883a', { sh: 0.5 }), furD = mat('#c8642a', { sh: 0.5 }), cream = mat('#fff1dc'), dark = mat('#5a3424');
    const ph = s.ph;
    let by = -R * 1.0, pitch = 0, fwd = 0, crouch = 0, stretch = 0;
    if (s.walk) { by -= Math.abs(Math.sin(ph)) * R * 0.14; pitch = Math.sin(ph) * 0.09; stretch = Math.cos(ph) * 0.06; }
    if (s.sw) { if (s.sw < 0) { crouch = -s.sw; pitch = s.sw * 0.12; fwd = s.sw * R * 0.12; } else { fwd = s.sw * R * 0.5; pitch = s.sw * 0.16; } }
    if (s.hit) { pitch = -0.2 * s.hit; fwd = -R * 0.12 * s.hit; }
    let down = 0;
    if (s.die) { down = Rig.ease(Math.min(1, s.die / 0.6)); pitch = down * 0.18; }
    by += crouch * R * 0.22 + down * R * 0.55;
    // 腿的角度（旋轉式奔跑）
    const legA = (o) => s.walk ? Math.sin(ph + o) * 0.85 : s.sw ? (s.sw < 0 ? 0.3 : -0.6) * (o > 2 ? -1 : 1) : 0;
    const kneeA = (o) => s.walk ? -Math.max(0, Math.sin(ph + o + 1.3)) * 1.1 : -crouch * 0.8;
    const L = R * 0.44, rr = R * 0.19;
    const splay = down * 1.2;
    x.save(); x.translate(fwd, 0);
    const legs = (far) => {
      const m = far ? furD : fur;
      // 後腿（臀部）與前腿（肩膀）
      for (const [hx, o, bend] of [[-R * 0.6, far ? 0.5 : 0, 1], [R * 0.55, far ? Math.PI + 0.5 : Math.PI, -1]]) {
        const a1 = legA(o) * (1 - down) + (bend > 0 ? -splay : splay), a2 = kneeA(o) * bend * (1 - down);
        const hy = by + R * 0.15 + Math.sin(pitch) * hx;
        const [, , fx, fy] = limb2(x, hx, hy, a1, a2, L, L * 0.95, rr * (bend > 0 ? 1.25 : 1), rr * 0.75, m);
        part(x, P.ell(fx + R * 0.07, fy - R * 0.05, R * 0.17, R * 0.1), far ? furD : mat('#ffe6c8'), fx, fy, R * 0.15, { lw: lw(R) * 0.75 });
      }
    };
    legs(true);
    x.save(); x.translate(0, by); x.rotate(pitch);
    // 尾巴
    const tw = s.walk ? Math.sin(ph + 1) * R * 0.2 : s.hit ? R * 0.25 : 0, tl = 1 - down * 0.4;
    const tail = P.blob([-R * 0.7, -R * 0.3, -R * 1.15, -R * 0.5 - tw * 0.4, -R * 1.5 * tl, -R * 0.82 - tw * 0.8, -R * 1.8 * tl, -R * 1.18 - tw, -R * 2.0 * tl, -R * 0.92 - tw, -R * 1.85 * tl, -R * 0.5 - tw * 0.7, -R * 1.4, -R * 0.06 - tw * 0.3, -R * 0.8, R * 0.16]);
    part(x, tail, fur, -R * 1.3, -R * 0.4, R * 0.45, { lw: lw(R), tex: q => { q.fillStyle = '#fff6ea'; q.beginPath(); q.ellipse(-R * 1.88 * tl, -R * 1.0 - tw, R * 0.3, R * 0.26, -0.6, 0, TAU); q.fill(); Rig.fur(q, -R * 1.3, -R * 0.45, R * 0.9, R * 0.5, 10, 'rgba(150,70,20,.5)', R * 0.16, -2.6, R * 0.03, 5); } });
    // 身體
    const body = P.blob([-R * 0.95, -R * 0.05, -R * 0.75, -R * 0.42, -R * 0.1, -R * 0.5 - stretch * R, R * 0.6, -R * 0.45, R * 0.95, -R * 0.15, R * 0.7, R * 0.32, 0, R * 0.36, -R * 0.65, R * 0.3]);
    part(x, body, fur, 0, -R * 0.05, R * 0.75, {
      lw: lw(R), tex: q => {
        Rig.fur(q, -R * 0.1, -R * 0.38, R * 1.4, R * 0.2, 14, 'rgba(140,60,20,.55)', R * 0.14, 2.6, R * 0.035, 9);
      },
    });
    const belly = P.blob([-R * 0.55, R * 0.18, 0, R * 0.12, R * 0.6, R * 0.1, R * 0.7, R * 0.3, 0, R * 0.38, -R * 0.6, R * 0.3]);
    part(x, belly, cream, 0, R * 0.25, R * 0.4, { lw: lw(R) * 0.6, sd: 0.2, aod: 0.06 });
    // 胸前的白毛
    const ruff = P.blob([R * 0.55, -R * 0.35, R * 0.95, -R * 0.3, R * 1.08, R * 0.0, R * 0.95, R * 0.28, R * 0.7, R * 0.38, R * 0.5, R * 0.05]);
    part(x, ruff, cream, R * 0.8, 0, R * 0.35, { lw: lw(R) * 0.8, tex: q => Rig.fur(q, R * 0.8, R * 0.05, R * 0.4, R * 0.5, 7, 'rgba(200,150,110,.6)', R * 0.12, 1.9, R * 0.03, 2) });
    x.restore();
    legs(false);
    // 頭
    const hx = R * 1.08 + fwd * 0.1, hy = by - R * 0.52 + (s.sw > 0 ? s.sw * R * 0.12 : 0) - (s.hit ? R * 0.1 : 0) + down * R * 0.25;
    const ht = s.hit ? -0.3 : s.sw > 0 ? s.sw * 0.2 : s.die ? down * 0.5 : Math.sin(ph) * 0.05;
    x.save(); x.translate(hx, hy); x.rotate(ht); x.scale(1.2, 1.2);
    const earBack = s.hit || s.sw > 0 || s.die ? 0.6 : 0;
    for (const [ex, m] of [[-R * 0.12, furD], [R * 0.16, fur]]) {
      x.save(); x.translate(ex, -R * 0.28); x.rotate(-0.15 - earBack);
      const ear = P.poly([-R * 0.16, 0, -R * 0.02, -R * 0.62, R * 0.17, -R * 0.02]);
      part(x, ear, m, 0, -R * 0.25, R * 0.25, { lw: lw(R) * 0.9, tex: q => { q.fillStyle = '#ffb4a0'; q.beginPath(); q.moveTo(-R * 0.07, -R * 0.04); q.lineTo(-R * 0.01, -R * 0.44); q.lineTo(R * 0.08, -R * 0.04); q.fill(); } });
      x.restore();
    }
    const head = P.blob([-R * 0.42, -R * 0.05, -R * 0.3, -R * 0.36, R * 0.05, -R * 0.44, R * 0.38, -R * 0.28, R * 0.45, R * 0.05, R * 0.2, R * 0.34, -R * 0.2, R * 0.32]);
    part(x, head, fur, 0, 0, R * 0.42, { lw: lw(R), tex: q => { q.fillStyle = '#fff1dc'; q.beginPath(); q.ellipse(R * 0.0, R * 0.22, R * 0.3, R * 0.16, 0, 0, TAU); q.fill(); } });
    // 口鼻
    const jaw = s.sw > 0 ? s.sw * R * 0.2 : s.hit ? R * 0.1 : 0;
    if (jaw > R * 0.02) {
      const lower = P.blob([R * 0.12, R * 0.12, R * 0.62, R * 0.1 + jaw, R * 0.72, R * 0.2 + jaw, R * 0.2, R * 0.3]);
      part(x, lower, cream, R * 0.4, R * 0.2, R * 0.22, { lw: lw(R) * 0.8 });
      Rig.mouth(x, R * 0.45, R * 0.1 + jaw * 0.3, R * 0.2, 'roar', jaw * 0.9);
    }
    const snout = P.blob([R * 0.12, -R * 0.2, R * 0.6, -R * 0.12, R * 0.82, R * 0.0, R * 0.7, R * 0.12, R * 0.15, R * 0.14]);
    part(x, snout, cream, R * 0.45, 0, R * 0.25, { lw: lw(R) * 0.85 });
    part(x, P.ell(R * 0.8, -R * 0.06, R * 0.08, R * 0.065), mat('#2a1820', { gloss: 1 }), R * 0.8, -R * 0.06, R * 0.08, { lw: lw(R) * 0.5 });
    if (!jaw && !s.die) { Rig.seg(x, R * 0.5, R * 0.1, R * 0.7, R * 0.07, OUT, R * 0.04); }
    if (s.die) { const tg = P.blob([R * 0.45, R * 0.1, R * 0.6, R * 0.12, R * 0.6, R * 0.3, R * 0.5, R * 0.28]); part(x, tg, mat('#ff7a8a'), R * 0.52, R * 0.2, R * 0.1, { lw: lw(R) * 0.6 }); }
    eye(x, R * 0.12, -R * 0.12, R * 0.15, { iris: '#7a3010', mood: s.mood === 'n' ? 'angry' : s.mood, look: [0.35, 0.1] });
    // 臉頰的毛
    Rig.fur(x, -R * 0.3, R * 0.12, R * 0.15, R * 0.2, 4, '#fff1dc', R * 0.14, 2.5, R * 0.06, 4);
    x.restore();
    x.restore();
  });

  // ───────── 取得某一格動畫 ─────────
  let SS = 2;
  function setSS(v) { SS = v; }
  function nOf(an) { return N[an] || 1; }
  function drawKind(x, k, R, an, f) {
    an = an || 'walk';
    const n = nOf(an), cyc = an === 'walk' || an === 'idle';
    const t = cyc ? f / n : (n > 1 ? f / (n - 1) : 0);
    const fn = DEF[k] || DEF.slime;
    x.save(); fn(x, R, pose(an, t)); x.restore();
  }
  const last = new Map();
  // v：0 正常、1 閃白、2 冰藍；an：'walk'（預設）、'atk'（或 true）、'hit'、'die'、'idle'、'cast'
  function frame(k, R, f, v, dpr, an) {
    if (an === true) an = 'atk';
    an = an || 'walk';
    if (!DEF[k]) k = 'slime';
    const B = BOX[k];
    const Rq = Math.round(R * 4) / 4;
    const n = nOf(an); f = ((f % n) + n) % n;
    const key = `en3:${k}:${Rq}:${an}${f}`;
    let base;
    // 這一幀已經畫了太多新圖：先用同一隻已經畫好的圖頂著，等之後暖身補上
    const fb = last.get(k + ':' + Rq + ':' + dpr);
    if (fb && !Gfx.has(key, dpr) && Gfx.busy()) { base = fb; if (typeof Render !== 'undefined' && Render.want) Render.want(k, Rq, an, f, dpr); }
    else {
      const ex = an === 'die' ? 1.0 : 0;
      const W = (B.w + 0.9 + ex) * Rq, H = (B.h + 0.5 + ex * 0.4) * Rq;
      const ss = Math.max(1, Math.min(SS, 4.5 / dpr));
      base = Gfx.sheet(key, W, H, W / 2, (B.ay + 0.5 + ex * 0.4) * Rq, dpr, x => drawKind(x, k, Rq, an, f), { ss, outline: Math.max(0.9, Rq * 0.06) });
      if (an === 'walk' && f === 0) last.set(k + ':' + Rq + ':' + dpr, base);
    }
    if (!v) return base;
    if (v === 1) return Gfx.tinted(base, base.key + ':w', '#ffffff', 0.8);
    return Gfx.tinted(base, base.key + ':i', '#8fd8ff', 0.5);
  }
  const visR = (k, r, s) => r * s * ((BOX[k] || BOX.slime).vis);
  return { N, FR, FA, BOX, DEF, def, frame, visR, drawKind, pose, setSS, lib: { limb2, foot, crystal, flinch, lw } };
})();
