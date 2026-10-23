'use strict';
// 守塔奇兵：七個頭目的美術。除了走路／受擊／死亡，還有 idle（呼吸）和 cast（放招：跺腳、衝刺噴火、召喚、鑽地、噴墨）。
(() => {
  const { TAU, mix, rgba } = Gfx;
  const { mat, P, part, eye, mouth, seg, glow, halo } = Rig;
  const { limb2, foot, crystal, lw, gait } = Beasts.lib;
  const def = Beasts.def, OUT = Rig.OUT, E = Rig.ease;
  // 放招的強度：cast 動畫或攻擊動畫的出手
  const power = s => Math.max(s.cast, s.sw > 0 ? s.sw : 0);
  const windup = s => s.sw < 0 ? -s.sw : (s.an === 'cast' && s.t < 0.35 ? s.t / 0.35 : 0);

  // ───────── 岩石巨人王（熔岩巨猿王：胸口熔岩核心、肩上火山晶簇、戴著金色王冠）─────────
  def('bossGolem', { w: 4.6, h: 4.4, ay: 3.6, top: 3.1, vis: 1.32, die: 'bake', boss: true }, (x, R, s) => {
    const st = mat('#8a6a58', { sh: 0.55 }), stD = mat('#5e4638', { sh: 0.55 }), mag = '#ff8a2a';
    const g = gait(s, R, { amp: 0.26, knee: 0.3, bob: 1.6 });
    const pw = power(s), br = s.br;
    const crum = s.die ? E(Math.min(1, s.die / 0.75)) : 0;
    const stomp = s.an === 'cast' ? (s.t < 0.45 ? E(s.t / 0.45) : Math.max(0, 1 - (s.t - 0.45) / 0.2)) : 0;
    const slam = s.an === 'cast' && s.t > 0.55 ? Math.max(0, 1 - (s.t - 0.55) / 0.45) : 0;
    const pulse = 0.7 + 0.3 * (s.an === 'idle' ? (br + 1) / 2 : s.walk ? Math.sin(s.ph * 2) * 0.5 + 0.5 : Math.max(pw, slam));
    const tex = (cx, cy, sz, seed) => q => {
      Rig.speckle(q, cx, cy, sz * 2.2, sz * 2.2, 14, ['rgba(255,230,210,.2)', 'rgba(30,10,10,.25)'], R * 0.02, R * 0.06, seed);
      const r = Rig.rng(seed + 5);
      for (let i = 0; i < 3; i++) { const px = cx + (r() - 0.5) * sz * 1.4, py = cy + (r() - 0.6) * sz * 1.2, w = sz * (0.35 + r() * 0.3); q.fillStyle = i % 2 ? 'rgba(255,240,220,.15)' : 'rgba(30,10,20,.16)'; q.beginPath(); q.moveTo(px, py); q.lineTo(px + w, py + w * 0.25); q.lineTo(px + w * 0.6, py + w * 0.8); q.lineTo(px - w * 0.2, py + w * 0.5); q.closePath(); q.fill(); }
      // 熔岩裂縫
      if (crum < 0.9) { q.save(); q.globalAlpha = pulse * (1 - crum); q.shadowColor = mag; q.shadowBlur = R * 0.3; q.strokeStyle = '#ffb347'; q.lineWidth = R * 0.06; q.lineCap = 'round'; q.beginPath(); const r2 = Rig.rng(seed + 2); let px = cx + (r2() - 0.5) * sz, py = cy - sz * 0.5; q.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (r2() - 0.5) * sz * 0.6; py += sz * 0.28; q.lineTo(px, py); } q.stroke(); q.strokeStyle = '#fff2b0'; q.lineWidth = R * 0.02; q.stroke(); q.restore(); }
    };
    const rock = (p, m, cx, cy, sz, seed) => part(x, p, m, cx, cy, sz, { lw: lw(R) * 1.05, tex: tex(cx, cy, sz, seed || 3) });
    for (const i of [1, 0]) {
      const sw = Math.sin(g.a[i]) * R * 0.3, lift = (s.walk ? Math.max(0, -Math.sin(s.ph + i * Math.PI)) * R * 0.16 : 0) + (i === 0 ? stomp * R * 0.6 : 0);
      x.save(); x.translate(crum * (i ? -R * 0.6 : R * 0.7), 0); x.rotate(crum * (i ? -0.45 : 0.55));
      const lx = (i ? -R * 0.4 : R * 0.3) + sw;
      rock(P.blob([lx - R * 0.34, -lift, lx - R * 0.36, -R * 0.72 - lift, lx + R * 0.02, -R * 0.9 - lift, lx + R * 0.36, -R * 0.7 - lift, lx + R * 0.4, -lift]), i ? stD : st, lx, -R * 0.45 - lift, R * 0.38, 5 + i);
      x.restore();
    }
    x.save(); x.translate(g.fwd, -g.bob - stomp * R * 0.12 + crum * R * 1.0); x.rotate(g.lean * 0.5 - stomp * 0.06 + slam * 0.08 + crum * 0.35);
    const armRot = (i) => (s.walk ? g.arm[i] * 0.5 : 0) + (s.an === 'cast' ? (i ? 2.7 : -2.9) * stomp - slam * 0.5 : 0) + (s.sw ? s.arc(0, -2.6, 0.5) : 0) + (s.hit ? 0.35 : 0) + crum * (i ? -1.0 : 1.3) + (s.an === 'idle' ? br * 0.05 : 0);
    const arm = (i, m, sx, sy) => {
      x.save(); x.translate(sx, sy); x.rotate(armRot(i));
      rock(P.blob([-R * 0.3, -R * 0.08, R * 0.3, -R * 0.08, R * 0.34, R * 0.78, -R * 0.32, R * 0.8]), m, 0, R * 0.35, R * 0.38, 11 + i);
      rock(P.blob([-R * 0.42, R * 0.72, R * 0.4, R * 0.68, R * 0.48, R * 1.3, 0, R * 1.48, -R * 0.48, R * 1.3]), m, 0, R * 1.08, R * 0.46, 13 + i);
      for (let k = 0; k < 3; k++) part(x, P.circ(-R * 0.26 + k * R * 0.26, R * 1.42, R * 0.14), stD, -R * 0.26 + k * R * 0.26, R * 1.42, R * 0.14, { lw: lw(R) * 0.6 });
      x.restore();
    };
    arm(1, stD, -R * 1.05, -R * 2.2);
    const chest = P.blob([-R * 1.05, -R * 0.85, -R * 1.25, -R * 1.85, -R * 0.82, -R * 2.6, R * 0.3, -R * 2.72, R * 1.1, -R * 2.2, R * 1.05, -R * 1.25, R * 0.6, -R * 0.7, -R * 0.25, -R * 0.66], 0.7);
    const bsc = 1 + (s.an === 'idle' ? br * 0.025 : 0);
    x.save(); x.translate(0, -R * 1.6); x.scale(bsc, bsc); x.translate(0, R * 1.6);
    rock(chest, st, 0, -R * 1.65, R * 1.15, 21);
    // 熔岩核心
    if (crum < 0.9) { halo(x, R * 0.15, -R * 1.55, R * (0.75 + pulse * 0.2), mag, 0.55 * pulse * (1 - crum)); }
    part(x, P.blob([R * 0.15, -R * 1.92, R * 0.48, -R * 1.7, R * 0.45, -R * 1.35, R * 0.15, -R * 1.18, -R * 0.18, -R * 1.35, -R * 0.2, -R * 1.72]), mat(crum > 0.5 ? '#5a3a2a' : '#ffb347', { gloss: 1, sh: 0.35, shc: '#c83a10' }), R * 0.15, -R * 1.55, R * 0.35, { lw: lw(R) * 0.9, tex: q => { if (crum < 0.5) { q.fillStyle = '#fff4c0'; q.beginPath(); q.ellipse(R * 0.1, -R * 1.62, R * 0.15, R * 0.2, 0, 0, TAU); q.fill(); } } });
    // 肩上的火山晶簇
    for (const [cx, cy, w, h, r, c] of [[-0.75, -2.42, 0.13, 0.6, -0.4, '#ff8a3a'], [-0.5, -2.58, 0.16, 0.85, -0.12, '#ffb347'], [-0.22, -2.62, 0.11, 0.55, 0.2, '#ff6a2a'], [0.75, -2.15, 0.1, 0.42, 0.6, '#ffb347']]) { crystal(x, cx * R, cy * R, w * R, h * R, c, r, R); }
    halo(x, -R * 0.5, -R * 2.9, R * 0.6, mag, 0.3 * pulse * (1 - crum));
    x.restore();
    // 頭＋王冠
    x.save(); x.translate(R * 0.5 + crum * R * 0.6, -R * 2.62 + crum * R * 1.25); x.rotate((s.hit ? -0.18 : 0) + crum * 1.2 - stomp * 0.12); x.scale(1.28, 1.28);
    rock(P.blob([-R * 0.42, R * 0.22, -R * 0.46, -R * 0.22, -R * 0.1, -R * 0.44, R * 0.34, -R * 0.38, R * 0.5, -R * 0.02, R * 0.4, R * 0.32, 0, R * 0.42]), st, 0, 0, R * 0.46, 31);
    part(x, P.blob([-R * 0.34, -R * 0.12, R * 0.0, -R * 0.28, R * 0.52, -R * 0.16, R * 0.5, -R * 0.02, R * 0.0, -R * 0.06]), stD, R * 0.08, -R * 0.12, R * 0.28, { lw: lw(R) * 0.8 });
    for (const [cx, h, cc] of [[-0.22, 0.38, '#ffd36b'], [0.06, 0.58, '#ffe9a0'], [0.33, 0.38, '#ffd36b']]) part(x, P.poly([cx * R - R * 0.12, -R * 0.36, cx * R, -R * (0.36 + h), cx * R + R * 0.12, -R * 0.36]), mat(cc, { gloss: 0.9 }), cx * R, -R * 0.55, R * 0.15, { lw: lw(R) * 0.7 });
    part(x, P.rr(-R * 0.4, -R * 0.46, R * 0.88, R * 0.14, R * 0.04), mat('#f2c14e', { gloss: 0.9 }), R * 0.04, -R * 0.39, R * 0.3, { lw: lw(R) * 0.7, post: q => { Gfx.circ(q, R * 0.06, -R * 0.39, R * 0.05, '#e5484d'); Gfx.circ(q, -R * 0.22, -R * 0.39, R * 0.035, '#3ae8c0'); Gfx.circ(q, R * 0.32, -R * 0.39, R * 0.035, '#3ae8c0'); } });
    if (!s.die) for (const ex of [R * 0.1, R * 0.34]) glow(x, () => { x.fillStyle = s.hit ? '#ffffff' : '#ffe27a'; x.beginPath(); x.ellipse(ex, R * 0.02, R * 0.08, s.hit ? R * 0.02 : R * 0.055, 0, 0, TAU); x.fill(); }, mag, R * 0.4);
    else for (const ex of [R * 0.1, R * 0.34]) eye(x, ex, R * 0.02, R * 0.08, { mood: 'x' });
    if (pw > 0.2 || stomp > 0.3 || s.hit) { part(x, P.ell(R * 0.22, R * 0.24, R * 0.16, R * 0.06 + R * 0.08 * Math.max(pw, stomp)), mat('#3a0e04'), R * 0.22, R * 0.24, R * 0.12, { flat: true, lw: lw(R) * 0.5 }); halo(x, R * 0.22, R * 0.24, R * 0.18, mag, 0.6); }
    else seg(x, R * 0.05, R * 0.22, R * 0.38, R * 0.2, 'rgba(30,10,10,.85)', R * 0.045);
    x.restore();
    arm(0, st, R * 0.85, -R * 2.0);
    x.restore();
    if (crum > 0.25) for (let i = 0; i < 9; i++) { const r = Rig.rng(i + 11), dx = (r() - 0.5) * R * 3.4 * crum, sz = R * (0.14 + r() * 0.18); rock(P.poly([dx - sz, 0, dx - sz * 0.5, -sz * 1.2, dx + sz * 0.7, -sz, dx + sz, 0]), i % 2 ? st : stD, dx, -sz * 0.5, sz, i); }
  });

  // ───────── 炎龍 ─────────
  def('bossDragon', { w: 6.0, h: 4.6, ay: 2.8, top: 2.0, vis: 1.3, die: 'fly', boss: true }, (x, R, s) => {
    const sc = mat('#d8402e', { sh: 0.5 }), scD = mat('#9a2418', { sh: 0.5 }), belly = mat('#ffc27a', { sh: 0.35 }), memb = mat('#e8603a'), membB = mat('#8a2016'), horn = mat('#fff0c8', { gloss: 0.6 });
    const pw = power(s), wu = windup(s);
    let flap = s.walk ? Math.sin(s.ph) : s.an === 'idle' ? Math.sin(s.ph) * 0.5 : 0.2;
    if (s.an === 'cast' || s.sw) flap = wu > 0 ? 0.9 * wu : -0.7 * pw;
    if (s.hit) flap = -0.3;
    const fold = s.die ? E(Math.min(1, s.die / 0.4)) : 0;
    const by = -R * 0.3 + (s.walk ? -Math.cos(s.ph) * R * 0.15 : s.an === 'idle' ? s.br * R * 0.06 : 0);
    x.save(); x.translate(pw * R * 0.25 - (s.hit ? R * 0.15 : 0), by); x.rotate(pw * 0.08 - wu * 0.1 + (s.hit ? -0.12 : 0));
    const wing = (sd) => {
      const back = sd < 0, sp = 1 - fold * 0.6;
      const jx = sd * R * 1.25 * sp, jy = -R * (1.25 * flap + 0.75), tx = sd * R * 2.6 * sp, ty = -R * (1.35 * flap + 0.35);
      const tips = [[sd * R * 1.95 * sp, R * 0.38 - flap * R * 0.3], [sd * R * 1.38 * sp, R * 0.5 - flap * R * 0.25], [sd * R * 0.8 * sp, R * 0.5 - flap * R * 0.2]];
      const p = P.fn(q => { q.moveTo(sd * R * 0.2, -R * 0.35); q.quadraticCurveTo(sd * R * 0.6, jy - R * 0.2, jx, jy); q.lineTo(tx, ty); let px = tx, py = ty; for (const [ax, ay] of tips) { q.quadraticCurveTo((px + ax) / 2 - sd * R * 0.1, (py + ay) / 2 - R * 0.18, ax, ay); px = ax; py = ay; } q.quadraticCurveTo(sd * R * 0.45, R * 0.25, sd * R * 0.2, R * 0.25); q.closePath(); });
      part(x, p, back ? membB : memb, sd * R * 1.3, -R * 0.2, R * 1.1, { lw: lw(R), sd: 0.25, tex: q => { q.strokeStyle = rgba('#5a0e08', 0.75); q.lineWidth = R * 0.08; q.lineCap = 'round'; q.beginPath(); q.moveTo(sd * R * 0.2, -R * 0.35); q.lineTo(jx, jy); q.lineTo(tx, ty); for (const [ax, ay] of tips) { q.moveTo(jx, jy); q.lineTo(ax, ay); } q.stroke(); } });
      part(x, P.poly([jx, jy, jx + sd * R * 0.12, jy - R * 0.26, jx + sd * R * 0.18, jy + R * 0.02]), horn, jx, jy - R * 0.1, R * 0.12, { lw: lw(R) * 0.6 });
    };
    wing(-1);
    // 尾巴
    const tw = s.walk ? Math.sin(s.ph + 1) * R * 0.15 : 0;
    const tail = P.fn(q => { q.moveTo(-R * 0.55, R * 0.05); q.quadraticCurveTo(-R * 1.4, R * 0.95 + tw, -R * 2.1, R * 0.35 + tw * 1.5); q.quadraticCurveTo(-R * 1.35, R * 0.48 + tw, -R * 0.5, -R * 0.25); q.closePath(); });
    part(x, tail, sc, -R * 1.2, R * 0.35, R * 0.5, { lw: lw(R) });
    part(x, P.poly([-R * 2.1, R * 0.35 + tw * 1.5, -R * 2.45, R * 0.05 + tw * 1.5, -R * 2.35, R * 0.62 + tw * 1.5]), mat('#ffd36b', { gloss: 0.5 }), -R * 2.3, R * 0.35, R * 0.18, { lw: lw(R) * 0.7 });
    // 後腳
    for (const fx of [-R * 0.3, R * 0.25]) { part(x, P.cap(fx, R * 0.35, fx + R * 0.1, R * 0.85, R * 0.16, R * 0.11), fx < 0 ? scD : sc, fx, R * 0.6, R * 0.2, { lw: lw(R) * 0.8 }); for (let k = -1; k <= 1; k++) seg(x, fx + R * 0.1, R * 0.85, fx + R * (0.14 + k * 0.08), R * 0.98, '#fff0c8', R * 0.05); }
    // 身體
    part(x, P.ell(0, 0, R * 0.92, R * 0.64, -0.15), sc, 0, 0, R * 0.85, { lw: lw(R) * 1.1, tex: q => { Rig.scales(q, -R, -R * 0.65, R * 2, R * 0.5, R * 0.2, 'rgba(110,20,10,.4)', R * 0.03); } });
    part(x, P.ell(R * 0.12, R * 0.28, R * 0.6, R * 0.32, -0.15), belly, R * 0.12, R * 0.28, R * 0.5, { lw: lw(R) * 0.6, tex: q => { q.strokeStyle = 'rgba(170,90,40,.6)'; q.lineWidth = R * 0.03; for (let i = 0; i < 5; i++) { q.beginPath(); q.moveTo(-R * 0.35 + i * R * 0.2, R * 0.05); q.lineTo(-R * 0.3 + i * R * 0.2, R * 0.55); q.stroke(); } } });
    for (let i = 0; i < 4; i++) part(x, P.poly([-R * 0.6 + i * R * 0.3, -R * 0.52, -R * 0.5 + i * R * 0.3, -R * 0.86, -R * 0.38 + i * R * 0.3, -R * 0.56]), mat('#ffd36b'), -R * 0.5 + i * R * 0.3, -R * 0.65, R * 0.12, { lw: lw(R) * 0.6 });
    // 脖子與頭
    const nk = P.fn(q => { q.moveTo(R * 0.4, -R * 0.35); q.quadraticCurveTo(R * 0.9, -R * 0.75 + wu * R * 0.2, R * 1.05 + pw * R * 0.2, -R * 1.0 + wu * R * 0.3 + pw * R * 0.25); q.lineTo(R * 1.32 + pw * R * 0.2, -R * 0.78 + wu * R * 0.3 + pw * R * 0.25); q.quadraticCurveTo(R * 1.0, -R * 0.35, R * 0.7, R * 0.15); q.closePath(); });
    part(x, nk, sc, R * 0.9, -R * 0.5, R * 0.4, { lw: lw(R) });
    const hx = R * 1.3 + pw * R * 0.25, hy = -R * 1.0 + wu * R * 0.3 + pw * R * 0.25;
    x.save(); x.translate(hx, hy); x.rotate(-wu * 0.35 + pw * 0.15 + (s.hit ? -0.3 : 0));
    part(x, P.poly([-R * 0.15, -R * 0.2, -R * 0.55, -R * 0.8, R * 0.05, -R * 0.3]), horn, -R * 0.25, -R * 0.45, R * 0.2, { lw: lw(R) * 0.7 });
    part(x, P.poly([R * 0.05, -R * 0.25, -R * 0.12, -R * 0.88, R * 0.25, -R * 0.28]), horn, R * 0.05, -R * 0.5, R * 0.2, { lw: lw(R) * 0.7 });
    const jaw = R * (0.05 + Math.max(pw, s.hit * 0.6) * 0.25);
    part(x, P.poly([R * 0.12, R * 0.12, R * 0.68, R * 0.1 + jaw, R * 0.62, R * 0.24 + jaw, R * 0.1, R * 0.3]), scD, R * 0.4, R * 0.2, R * 0.25, { lw: lw(R) * 0.8 });
    if (jaw > R * 0.1) { x.fillStyle = '#5a0a14'; x.beginPath(); x.moveTo(R * 0.15, R * 0.12); x.lineTo(R * 0.7, R * 0.02); x.lineTo(R * 0.66, R * 0.1 + jaw); x.closePath(); x.fill(); }
    part(x, P.ell(0, 0, R * 0.44, R * 0.34, 0.1), sc, 0, 0, R * 0.42, { lw: lw(R) });
    part(x, P.poly([R * 0.15, -R * 0.15, R * 0.82, -R * 0.02, R * 0.76, R * 0.12, R * 0.15, R * 0.15]), sc, R * 0.45, 0, R * 0.25, { lw: lw(R) * 0.9 });
    for (let i = 0; i < 3; i++) part(x, P.poly([R * (0.3 + i * 0.14), R * 0.12, R * (0.34 + i * 0.14), R * 0.24, R * (0.38 + i * 0.14), R * 0.12]), mat('#fffbe8'), R * 0.34, R * 0.16, R * 0.05, { lw: lw(R) * 0.4, flat: true });
    Gfx.circ(x, R * 0.66, -R * 0.02, R * 0.04, '#2a0a0a');
    if (s.die) eye(x, R * 0.08, -R * 0.08, R * 0.12, { mood: 'x' });
    else if (s.hit) eye(x, R * 0.08, -R * 0.08, R * 0.12, { mood: 'shut' });
    else { glow(x, () => { x.fillStyle = '#ffe27a'; x.beginPath(); x.ellipse(R * 0.08, -R * 0.08, R * 0.13, R * 0.09, 0, 0, TAU); x.fill(); }, '#ffb347', R * 0.3); x.fillStyle = '#2a0a0a'; x.fillRect(R * 0.07, -R * 0.16, R * 0.04, R * 0.16); part(x, P.poly([-R * 0.12, -R * 0.22, R * 0.25, -R * 0.12, R * 0.25, -R * 0.22]), scD, R * 0.05, -R * 0.2, R * 0.1, { flat: true, noLine: true }); }
    // 噴火
    if (pw > 0.25 && s.an !== 'atk') { glow(x, () => { const L = R * (0.8 + pw * 1.4); const fp = P.fn(q => { q.moveTo(R * 0.7, R * 0.12); q.quadraticCurveTo(R * 0.7 + L * 0.5, -R * 0.25 * pw, R * 0.7 + L, R * 0.1); q.quadraticCurveTo(R * 0.7 + L * 0.5, R * 0.5 * pw, R * 0.7, R * 0.2); q.closePath(); }); x.fillStyle = Gfx.lgrad(x, R * 0.7, 0, R * 0.7 + L, 0, ['#fff6c0', '#ffb347', 'rgba(255,90,30,.4)']); x.fill(fp); }, '#ff8a2a', R * 0.5); }
    else if (pw > 0.3) halo(x, R * 0.75, R * 0.15, R * 0.4 * pw, '#ffb347', 0.8);
    x.restore();
    wing(1);
    x.restore();
  });

  // ───────── 巫妖王 ─────────
  def('bossLich', { w: 4.2, h: 4.6, ay: 3.75, top: 3.35, vis: 1.25, die: 'bake', boss: true }, (x, R, s) => {
    const robe = mat('#3e2c62', { sh: 0.5 }), robeD = mat('#24183a'), bone = mat('#ece6d4', { sh: 0.45 }), gl = '#7dffb0', trim = '#b38aff';
    const pw = power(s), wu = windup(s), dis = s.die ? E(s.die) : 0;
    const fl = (s.walk ? Math.sin(s.ph) * 0.1 : s.an === 'idle' ? s.br * 0.06 : 0) * R;
    x.save(); x.translate(s.hit ? -R * 0.12 : 0, -R * 0.3 + fl + dis * R * 0.6); x.rotate(s.hit ? -0.08 : 0);
    x.globalAlpha = 1 - Math.max(0, (dis - 0.4) / 0.6) * 0.7;
    halo(x, 0, -R * 1.4, R * 1.9, gl, 0.12 + pw * 0.3);
    // 法杖（後手），召喚時高舉
    const raise = Math.max(pw, wu * 0.6);
    x.save(); x.translate(-R * 0.85, -R * 0.4 - raise * R * 0.8); x.rotate(-0.08 - raise * 0.35 + (s.sw ? s.arc(0, -0.4, 0.5) : 0));
    part(x, P.rr(-R * 0.07, -R * 2.8, R * 0.14, R * 3.0, R * 0.06), mat('#5a3a22'), 0, -R * 1.3, R * 0.25, { lw: lw(R) * 0.8 });
    x.strokeStyle = OUT; x.lineWidth = R * 0.14; x.beginPath(); x.arc(0, -R * 3.0, R * 0.32, Math.PI * 0.08, Math.PI * 0.92, true); x.stroke(); x.strokeStyle = '#d8d0e8'; x.lineWidth = R * 0.07; x.stroke();
    halo(x, 0, -R * 3.0, R * (0.5 + raise * 0.6), gl, 0.6);
    part(x, P.circ(0, -R * 3.0, R * 0.2), mat(gl, { gloss: 1 }), 0, -R * 3.0, R * 0.2, { lw: lw(R) * 0.7 });
    x.restore();
    { const cw = s.walk ? Math.sin(s.ph) * R * 0.12 : 0; part(x, P.fn(q => { q.moveTo(-R * 0.55, -R * 2.05); q.quadraticCurveTo(-R * 1.4 + cw, -R * 1.2, -R * 1.3 + cw, -R * 0.15); for (let i = 0; i < 5; i++) q.lineTo(-R * 1.3 + cw + i * R * 0.22, -R * 0.15 + (i % 2 ? -R * 0.3 : R * 0.05)); q.lineTo(-R * 0.2, -R * 1.2); q.closePath(); }), mat('#1e1430'), -R * 0.8, -R * 1.0, R * 0.7, { lw: lw(R) }); }
    // 長袍（下襬飄動，沒有腳）
    const rp = P.fn(q => { q.moveTo(-R * 1.05, -R * 0.1); for (let i = 0; i <= 8; i++) { const px = -R * 1.05 + i * R * 0.26, py = -R * 0.1 + (i % 2 ? -R * 0.28 : R * 0.12) + Math.sin(s.ph * (s.walk ? 2 : 1) + i) * R * 0.07 - dis * R * 0.3; q.lineTo(px, py); } q.lineTo(R * 0.62, -R * 2.0); q.lineTo(-R * 0.62, -R * 2.0); q.closePath(); });
    part(x, rp, robe, 0, -R * 1.0, R * 1.0, { lw: lw(R), tex: q => { q.strokeStyle = rgba(trim, 0.5); q.lineWidth = R * 0.04; for (let i = 0; i < 4; i++) { q.beginPath(); q.moveTo(-R * 0.45 + i * R * 0.3, -R * 1.9); q.quadraticCurveTo(-R * 0.55 + i * R * 0.35, -R * 1.0, -R * 0.65 + i * R * 0.4, -R * 0.1); q.stroke(); } for (let i = 0; i < 3; i++) Gfx.star(q, -R * 0.4 + i * R * 0.4, -R * 0.6, R * 0.09, rgba(gl, 0.8), false); q.fillStyle = trim; q.fillRect(-R * 0.06, -R * 2.0, R * 0.12, R * 1.85); } });
    // 肩甲
    for (const sd of [-1, 1]) { part(x, P.ell(sd * R * 0.56, -R * 1.98, R * 0.38, R * 0.24, sd * 0.3), mat('#6a5a8a', { gloss: 0.5 }), sd * R * 0.56, -R * 1.98, R * 0.36, { lw: lw(R) }); for (let k = 0; k < 2; k++) part(x, P.poly([sd * R * (0.5 + k * 0.18), -R * 2.12, sd * R * (0.76 + k * 0.18), -R * (2.55 - k * 0.08), sd * R * (0.7 + k * 0.18), -R * 2.06]), bone, sd * R * 0.65, -R * 2.25, R * 0.12, { lw: lw(R) * 0.6 }); }
    // 頭骨＋王冠
    x.save(); x.translate(R * 0.05, -R * 2.42); x.rotate(s.hit ? -0.2 : -raise * 0.12); x.scale(1.15, 1.15);
    part(x, P.circ(0, 0, R * 0.45), bone, 0, 0, R * 0.45, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(120,100,80,.55)'; q.lineWidth = R * 0.03; q.beginPath(); q.moveTo(-R * 0.25, -R * 0.35); q.lineTo(-R * 0.12, -R * 0.2); q.lineTo(-R * 0.2, -R * 0.08); q.stroke(); } });
    const jaw = R * (0.04 + pw * 0.12 + (s.hit ? 0.08 : 0));
    part(x, P.rr(-R * 0.16, R * 0.22 + jaw, R * 0.4, R * 0.2, R * 0.06), bone, R * 0.04, R * 0.3, R * 0.2, { lw: lw(R) * 0.8, post: q => { q.fillStyle = '#2a2040'; for (let i = 0; i < 4; i++) q.fillRect(-R * 0.12 + i * R * 0.09, R * 0.22 + jaw, R * 0.035, R * 0.09); } });
    for (const ex of [-0.12, 0.18]) { Gfx.circ(x, ex * R, -R * 0.02, R * 0.14, '#120818'); if (!s.die) glow(x, () => Gfx.circ(x, ex * R + R * 0.02, -R * 0.02, R * (0.06 + pw * 0.03), s.hit ? '#ffffff' : gl), gl, R * 0.45); }
    const cr = P.poly([-R * 0.45, -R * 0.25, -R * 0.48, -R * 0.68, -R * 0.24, -R * 0.45, R * 0.02, -R * 0.82, R * 0.28, -R * 0.45, R * 0.5, -R * 0.68, R * 0.48, -R * 0.25]);
    part(x, cr, mat(trim, { gloss: 0.8 }), 0, -R * 0.5, R * 0.45, { lw: lw(R) * 0.8 });
    glow(x, () => Gfx.circ(x, R * 0.02, -R * 0.42, R * 0.07, gl), gl, R * 0.3);
    x.restore();
    // 前手：骷髏手，施法時往前張開
    const ha = s.walk ? Math.sin(s.ph) * 0.1 : 0;
    const hx = R * 0.95 + raise * R * 0.1 + ha * R, hy = -R * 1.42 - raise * R * 0.85;
    part(x, P.cap(R * 0.45, -R * 1.85, hx, hy, R * 0.2, R * 0.16), robeD, (hx + R * 0.45) / 2, (hy - R * 1.85) / 2, R * 0.3, { lw: lw(R) });
    for (let i = 0; i < 4; i++) seg(x, hx, hy, hx + R * (0.12 + raise * 0.08) + i * R * 0.02, hy - R * (0.18 - i * 0.12) - raise * R * 0.1, OUT, R * 0.08), seg(x, hx, hy, hx + R * (0.12 + raise * 0.08) + i * R * 0.02, hy - R * (0.18 - i * 0.12) - raise * R * 0.1, '#ece6d4', R * 0.045);
    if (pw > 0.2) { halo(x, hx + R * 0.25, hy, R * 0.6 * pw, gl, 0.9); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + s.t * 4; Gfx.star(x, hx + R * 0.25 + Math.cos(a) * R * 0.5 * pw, hy + Math.sin(a) * R * 0.4 * pw, R * 0.08, '#d8ffe8', false); } }
    x.restore();
    if (dis > 0.3) for (let i = 0; i < 8; i++) { const r = Rig.rng(i + 5); x.globalAlpha = 1 - dis; halo(x, (r() - 0.5) * R * 2, -R * (0.5 + r() * 2.5) - dis * R, R * 0.35, gl, 0.6); x.globalAlpha = 1; }
  });

  // ───────── 雷霆巨鷹 ─────────
  def('bossRoc', { w: 6.4, h: 4.8, ay: 2.9, top: 2.05, vis: 1.3, die: 'fly', boss: true }, (x, R, s) => {
    const white = mat('#f2ece0', { sh: 0.45 }), wingM = mat('#3e62b8', { sh: 0.5 }), wingB = mat('#243c7a'), gold = mat('#f2c14e', { gloss: 0.8 }), brown = mat('#7a5a40');
    const pw = power(s), wu = windup(s);
    let flap = s.walk ? Math.sin(s.ph) : s.an === 'idle' ? Math.sin(s.ph) * 0.6 : 0.3;
    if (s.an === 'cast' || s.sw) flap = 0.4 + pw * 0.8;
    if (s.hit) flap = -0.4;
    const fold = s.die ? E(Math.min(1, s.die / 0.4)) : 0;
    const by = -R * 0.3 + (s.walk ? -Math.cos(s.ph) * R * 0.15 : 0);
    x.save(); x.translate(s.hit ? -R * 0.12 : 0, by); x.rotate(s.hit ? -0.12 : -pw * 0.1);
    const wing = (sd) => {
      const back = sd < 0, sp = 1 - fold * 0.6, tX = sd * R * 2.75 * sp, tY = -R * (1.45 * flap + 0.3);
      const p = P.fn(q => { q.moveTo(sd * R * 0.25, -R * 0.3); q.quadraticCurveTo(sd * R * 1.3, -R * (1.3 * flap + 0.95), tX, tY); for (let i = 0; i < 6; i++) { const t = i / 5, fx = tX * (1 - t * 0.72), fy = tY + R * (0.35 + t * 0.55) - flap * R * 0.25 * (1 - t); q.lineTo(fx, fy + R * 0.26); q.lineTo(fx - sd * R * 0.12, fy); } q.lineTo(sd * R * 0.25, R * 0.28); q.closePath(); });
      part(x, p, back ? wingB : wingM, sd * R * 1.4, -R * 0.4, R * 1.1, { lw: lw(R), sd: 0.25, tex: q => { q.strokeStyle = rgba(back ? '#101c40' : '#c8dcff', 0.6); q.lineWidth = R * 0.04; for (let i = 1; i < 6; i++) { const t = i / 6; q.beginPath(); q.moveTo(sd * R * (0.4 + t * 0.6), -R * 0.2 - flap * R * 0.3 * t); q.lineTo(tX * (1 - t * 0.72) - sd * R * 0.1, tY + R * (0.5 + t * 0.4)); q.stroke(); } q.fillStyle = rgba('#ffffff', back ? 0.1 : 0.5); q.beginPath(); q.ellipse(sd * R * 0.8, -R * (0.6 * flap + 0.4), R * 0.5, R * 0.14, -sd * flap * 0.5, 0, TAU); q.fill(); } });
      if (!back) glow(x, () => { x.strokeStyle = '#fff6a0'; x.lineWidth = R * 0.06; x.lineJoin = 'miter'; x.beginPath(); x.moveTo(sd * R * 1.25, -R * (1.0 * flap + 0.6)); x.lineTo(sd * R * 1.5, -R * (1.0 * flap + 0.32)); x.lineTo(sd * R * 1.33, -R * (1.0 * flap + 0.28)); x.lineTo(sd * R * 1.65, -R * (1.0 * flap - 0.05)); x.stroke(); }, '#bfe0ff', R * 0.4);
    };
    wing(-1);
    // 尾羽
    for (let i = 0; i < 3; i++) part(x, P.fn(q => { q.moveTo(-R * 0.5, R * 0.1); q.quadraticCurveTo(-R * 1.2, R * (0.2 + i * 0.15), -R * 1.55, R * (0.1 + i * 0.25)); q.lineTo(-R * 1.32, R * (0.32 + i * 0.25)); q.quadraticCurveTo(-R * 0.9, R * 0.36, -R * 0.45, R * 0.3); q.closePath(); }), i === 1 ? white : wingM, -R * 1.0, R * 0.3, R * 0.3, { lw: lw(R) * 0.7 });
    // 爪
    for (const sd of [-0.15, 0.25]) { part(x, P.cap(sd * R, R * 0.45, sd * R + R * 0.1, R * 0.85, R * 0.1, R * 0.08), gold, sd * R, R * 0.65, R * 0.15, { lw: lw(R) * 0.7 }); for (let k = -1; k <= 1; k++) seg(x, sd * R + R * 0.1, R * 0.85, sd * R + R * (0.1 + k * 0.1), R * (0.98 + (pw ? 0.05 : 0)), OUT, R * 0.06); }
    // 身體
    part(x, P.ell(0, 0, R * 0.88, R * 0.62, -0.2), white, 0, 0, R * 0.82, { lw: lw(R) * 1.1, tex: q => { q.strokeStyle = 'rgba(140,110,80,.35)'; q.lineWidth = R * 0.03; for (let i = 0; i < 8; i++) { q.beginPath(); q.arc(-R * 0.45 + (i % 4) * R * 0.28, -R * 0.15 + Math.floor(i / 4) * R * 0.22, R * 0.1, 0.2, Math.PI - 0.2); q.stroke(); } } });
    // 頭
    const hx = R * 0.88, hy = -R * 0.58 - pw * R * 0.15;
    x.save(); x.translate(hx, hy); x.rotate(-pw * 0.25 + (s.hit ? -0.3 : 0));
    for (let i = 0; i < 3; i++) part(x, P.poly([-R * 0.2, -R * 0.25, -R * (0.62 + i * 0.1), -R * (0.5 + i * 0.12), -R * 0.1, -R * 0.1]), i === 1 ? gold : white, -R * 0.4, -R * 0.35, R * 0.15, { lw: lw(R) * 0.6 });
    part(x, P.ell(0, 0, R * 0.44, R * 0.4), white, 0, 0, R * 0.42, { lw: lw(R) });
    const open = R * (0.04 + Math.max(pw, s.hit * 0.5) * 0.2);
    part(x, P.poly([R * 0.28, R * 0.06, R * 0.62, R * 0.16 + open, R * 0.3, R * 0.18 + open]), mat('#c8901a'), R * 0.4, R * 0.14, R * 0.15, { lw: lw(R) * 0.6 });
    part(x, P.fn(q => { q.moveTo(R * 0.25, -R * 0.12); q.quadraticCurveTo(R * 0.88, -R * 0.1, R * 0.78, R * 0.2); q.lineTo(R * 0.3, R * 0.06); q.closePath(); }), gold, R * 0.5, 0, R * 0.25, { lw: lw(R) * 0.8 });
    eye(x, R * 0.13, -R * 0.08, R * 0.13, { iris: '#ffb000', mood: s.mood === 'n' ? 'angry' : s.mood, look: [0.35, 0.1] });
    x.restore();
    if (pw > 0.3) for (let i = 0; i < 3; i++) { const a = -0.6 + i * 0.6; glow(x, () => { x.strokeStyle = '#fff6a0'; x.lineWidth = R * 0.06; x.beginPath(); let px = hx + R * 0.6, py = hy; x.moveTo(px, py); for (let k = 1; k < 4; k++) { px += Math.cos(a) * R * 0.3 * pw; py += Math.sin(a) * R * 0.3 * pw + (k % 2 ? -1 : 1) * R * 0.08; x.lineTo(px, py); } x.stroke(); }, '#bfe0ff', R * 0.4); }
    wing(1);
    x.restore();
  });

  // ───────── 晶甲巨蟲 ─────────
  def('bossWorm', { w: 5.2, h: 4.4, ay: 3.65, top: 3.1, vis: 1.25, die: 'bake', boss: true }, (x, R, s) => {
    const seg_ = mat('#6c5a92', { sh: 0.5, gloss: 0.4 }), belly = mat('#bcaad4', { sh: 0.35 }), cry = '#7fe8ff';
    const pw = power(s), wu = windup(s), col = s.die ? E(Math.min(1, s.die / 0.7)) : 0;
    const dive = s.an === 'cast' ? E(Math.min(1, s.t / 0.7)) : 0; // 鑽地：頭往下鑽
    const n = 5;
    const wave = (i) => (s.walk ? Math.sin(s.ph - i * 0.9) : s.an === 'idle' ? Math.sin(s.ph - i * 0.9) * 0.4 : 0) * R * 0.15;
    for (let i = 0; i < n; i++) {
      const sx = -R * 1.55 + i * R * 0.58, r = R * (0.48 + i * 0.06);
      let sy = -R * (0.55 + i * 0.13) - wave(i) - (i === n - 1 ? (wu * R * 0.4) : 0);
      sy += col * (R * (0.55 + i * 0.13) - r * 0.8) + dive * (i >= 3 ? R * (i - 2) * 0.35 : 0);
      x.save(); x.translate(sx, sy); x.rotate(col * (i - 2) * 0.15);
      part(x, P.ell(0, 0, r, r * 0.92), seg_, 0, 0, r, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(40,24,70,.55)'; q.lineWidth = R * 0.04; q.beginPath(); q.arc(-r * 0.65, 0, r * 0.9, -0.9, 0.9); q.stroke(); } });
      part(x, P.fn(q => { q.ellipse(r * 0.1, r * 0.45, r * 0.75, r * 0.35, 0, 0, Math.PI); q.closePath(); }), belly, r * 0.1, r * 0.55, r * 0.4, { lw: lw(R) * 0.6 });
      if (i < n - 1) crystal(x, 0, -r * 0.75, r * 0.25, r * (0.75 + (s.an === 'idle' ? s.br * 0.05 : 0)) * (1 - col * 0.3), i % 2 ? '#c49bff' : cry, (i - 2) * 0.15, R);
      x.restore();
    }
    // 頭
    const hx = R * 0.85 + dive * R * 0.35, hy = -R * 1.28 - wave(4) - wu * R * 0.4 + col * R * 0.9 + dive * R * 1.1;
    x.save(); x.translate(hx, hy); x.rotate(dive * 1.2 + col * 0.5 + (s.hit ? -0.25 : 0) - wu * 0.2);
    const mo = R * (0.2 + Math.max(pw * 0.2, s.hit * 0.1, wu * 0.12));
    part(x, P.ell(R * 0.38, R * 0.05, mo * 0.75, mo), mat('#3a0a1a'), R * 0.38, R * 0.05, mo, { lw: lw(R), flat: true });
    for (let i = 0; i < 9; i++) { const an = i / 9 * TAU; part(x, P.poly([R * 0.38 + Math.cos(an) * mo * 0.75, R * 0.05 + Math.sin(an) * mo, R * 0.38 + Math.cos(an + 0.2) * mo * 0.35, R * 0.05 + Math.sin(an + 0.2) * mo * 0.45, R * 0.38 + Math.cos(an + 0.4) * mo * 0.75, R * 0.05 + Math.sin(an + 0.4) * mo]), mat('#fff6e0'), R * 0.38, R * 0.05, R * 0.05, { lw: lw(R) * 0.3, flat: true }); }
    for (const [ex, ey] of [[0.1, -0.42], [0.34, -0.48]]) { if (s.die) { eye(x, ex * R, ey * R, R * 0.08, { mood: 'x', lc: '#ff6aa0' }); continue; } glow(x, () => Gfx.circ(x, ex * R, ey * R, R * 0.08, s.hit ? '#ffffff' : '#ff6aa0'), '#ff4a8a', R * 0.35); }
    for (const [ox, h, c] of [[-0.2, 0.7, cry], [0.05, 0.98, '#c49bff'], [0.3, 0.6, cry]]) crystal(x, ox * R, -R * 0.45, R * 0.11, R * h * (1 - col * 0.3), c, ox * 0.6, R);
    x.restore();
    if (dive > 0.3) for (let i = 0; i < 6; i++) { const dx = hx + (i - 2.5) * R * 0.3; part(x, P.ell(dx, -R * 0.08, R * 0.2, R * 0.12 * dive), mat(i % 2 ? '#5a5a74' : '#44445a'), dx, -R * 0.08, R * 0.2, { lw: lw(R) * 0.6 }); }
  });

  // ───────── 沙漠法老 ─────────
  def('bossPharaoh', { w: 4.2, h: 4.8, ay: 3.95, top: 3.55, vis: 1.25, die: 'bake', boss: true }, (x, R, s) => {
    const gold = mat('#f2c14e', { gloss: 0.9, sh: 0.45 }), blue = '#2a5ac8', skin = mat('#b4824e', { sh: 0.45 }), wrap = mat('#f4ecd6', { sh: 0.4 }), wrapD = mat('#cfc09a');
    const g = gait(s, R, { amp: 0.32 });
    const pw = power(s), wu = windup(s);
    const sand = s.die ? E(Math.min(1, s.die / 0.8)) : 0;
    if (sand > 0.55) {
      const q = (sand - 0.55) / 0.45;
      part(x, P.blob([-R * 1.2, 0, -R * 0.7, -R * 0.5 * (1 - q * 0.4), 0, -R * 0.75 * (1 - q * 0.4), R * 0.7, -R * 0.5 * (1 - q * 0.4), R * 1.2, 0, 0, R * 0.12]), mat('#e2c27a'), 0, -R * 0.3, R * 0.8, { lw: lw(R), tex: q2 => Rig.speckle(q2, 0, -R * 0.3, R * 2.4, R * 0.8, 30, ['rgba(255,240,200,.5)', 'rgba(150,110,50,.4)'], R * 0.02, R * 0.04, 8) });
      x.save(); x.translate(R * 0.4, -R * 0.55 * (1 - q * 0.4)); x.rotate(0.6); part(x, P.poly([-R * 0.5, R * 0.4, -R * 0.45, -R * 0.3, 0, -R * 0.7, R * 0.45, -R * 0.3, R * 0.5, R * 0.4]), gold, 0, 0, R * 0.5, { lw: lw(R) }); x.restore();
      return;
    }
    x.save(); x.translate(0, sand * R * 0.8); x.rotate(-sand * 0.4);
    for (const i of [1, 0]) { const [, , fx, fy] = limb2(x, (i ? -R * 0.15 : R * 0.15) + g.fwd, -R * 0.88 - g.bob, g.a[i], -g.k[i], R * 0.44, R * 0.42, R * 0.17, R * 0.14, i ? wrapD : wrap); foot(x, fx, fy, R * 0.38, R * 0.14, gold, R); }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean);
    // 權杖（後手）
    const raise = Math.max(pw, wu * 0.5);
    x.save(); x.translate(-R * 0.78, -R * 0.25 - raise * R * 0.7); x.rotate(-0.1 - raise * 0.3 + (s.sw ? s.arc(0, -0.5, 0.6) : 0));
    part(x, P.rr(-R * 0.06, -R * 2.95, R * 0.12, R * 3.0, R * 0.05), gold, 0, -R * 1.4, R * 0.25, { lw: lw(R) * 0.8 });
    x.strokeStyle = OUT; x.lineWidth = R * 0.16; x.beginPath(); x.arc(0, -R * 3.12, R * 0.22, Math.PI * 0.6, Math.PI * 2.4); x.stroke(); x.strokeStyle = '#f2c14e'; x.lineWidth = R * 0.09; x.stroke();
    if (raise > 0.2) halo(x, 0, -R * 3.1, R * (0.5 + raise * 0.6), '#ffd36b', 0.7 * raise);
    x.restore();
    // 披風
    const cw = s.walk ? Math.sin(s.ph) * R * 0.1 : (s.an === 'idle' ? s.br * R * 0.05 : 0);
    part(x, P.fn(q => { q.moveTo(-R * 0.45, -R * 1.85); q.quadraticCurveTo(-R * 1.05 + cw, -R * 1.0, -R * 0.95 + cw * 1.5, -R * 0.2); q.lineTo(-R * 0.65 + cw, -R * 0.32); q.lineTo(-R * 0.5 + cw, -R * 0.15); q.lineTo(-R * 0.2, -R * 0.6); q.closePath(); }), mat('#2a5ac8'), -R * 0.6, -R * 0.9, R * 0.55, { lw: lw(R), tex: q => { q.strokeStyle = '#f2c14e'; q.lineWidth = R * 0.06; q.beginPath(); q.moveTo(-R * 0.45, -R * 1.82); q.quadraticCurveTo(-R * 1.0 + cw, -R * 1.0, -R * 0.9 + cw * 1.5, -R * 0.24); q.stroke(); } });
    // 裙
    part(x, P.poly([-R * 0.58, -R * 1.02, R * 0.58, -R * 1.02, R * 0.74, -R * 0.35, -R * 0.74, -R * 0.35]), wrap, 0, -R * 0.7, R * 0.6, { lw: lw(R), tex: q => { q.fillStyle = '#f2c14e'; q.fillRect(-R * 0.12, -R * 1.02, R * 0.24, R * 0.67); q.strokeStyle = 'rgba(150,130,90,.5)'; q.lineWidth = R * 0.03; for (let i = -3; i <= 3; i++) { q.beginPath(); q.moveTo(i * R * 0.15, -R * 0.98); q.lineTo(i * R * 0.2, -R * 0.38); q.stroke(); } } });
    // 身體＋項圈
    part(x, P.rr(-R * 0.52, -R * 1.9, R * 1.04, R * 0.95, R * 0.26), skin, 0, -R * 1.4, R * 0.55, { lw: lw(R) });
    part(x, P.fn(q => { q.ellipse(0, -R * 1.78, R * 0.66, R * 0.36, 0, 0, Math.PI); q.lineTo(-R * 0.66, -R * 1.78); q.closePath(); }), gold, 0, -R * 1.6, R * 0.5, { lw: lw(R) * 0.8, tex: q => { q.strokeStyle = blue; q.lineWidth = R * 0.07; for (let i = 0; i < 2; i++) { q.beginPath(); q.ellipse(0, -R * 1.78, R * (0.42 + i * 0.14), R * (0.18 + i * 0.1), 0, 0.15, Math.PI - 0.15); q.stroke(); } for (let i = 0; i < 5; i++) { const an = 0.4 + i * 0.58; Gfx.circ(q, Math.cos(an) * R * 0.5, -R * 1.78 + Math.sin(an) * R * 0.26, R * 0.05, i % 2 ? '#e5484d' : '#3ae8c0'); } } });
    // 頭（法老頭巾）
    x.save(); x.translate(R * 0.06, -R * 2.32); x.rotate((s.hit ? -0.2 : 0) - raise * 0.08); x.scale(1.18, 1.18);
    const hood = P.fn(q => { q.moveTo(-R * 0.6, R * 0.6); q.lineTo(-R * 0.52, -R * 0.3); q.quadraticCurveTo(0, -R * 0.75, R * 0.52, -R * 0.3); q.lineTo(R * 0.6, R * 0.6); q.lineTo(R * 0.34, R * 0.6); q.lineTo(R * 0.32, 0); q.lineTo(-R * 0.32, 0); q.lineTo(-R * 0.34, R * 0.6); q.closePath(); });
    part(x, hood, gold, 0, 0, R * 0.6, { lw: lw(R), tex: q => { q.fillStyle = blue; for (let i = 0; i < 6; i++) q.fillRect(-R * 0.7, -R * 0.3 + i * R * 0.17, R * 1.4, R * 0.08); } });
    part(x, P.ell(R * 0.02, R * 0.1, R * 0.32, R * 0.38), skin, R * 0.02, R * 0.1, R * 0.34, { lw: lw(R) * 0.8 });
    for (const ex of [-0.08, 0.17]) { Gfx.circ(x, ex * R, R * 0.04, R * 0.075, '#1a0a08'); if (!s.die) glow(x, () => Gfx.circ(x, ex * R + R * 0.01, R * 0.04, R * (0.035 + raise * 0.03), s.hit ? '#ffffff' : '#ffe27a'), '#ffd36b', R * 0.45); else eye(x, ex * R, R * 0.04, R * 0.07, { mood: 'x', lc: '#ffe27a' }); }
    x.strokeStyle = '#1a0a08'; x.lineWidth = R * 0.03; for (const ex of [-0.08, 0.17]) { x.beginPath(); x.moveTo(ex * R + R * 0.08, R * 0.04); x.lineTo(ex * R + R * 0.16, R * 0.0); x.stroke(); }
    if (pw > 0.2 || s.hit) mouth(x, R * 0.05, R * 0.27, R * 0.1, 'o', R * 0.1);
    part(x, P.rr(-R * 0.03, R * 0.32, R * 0.12, R * 0.24, R * 0.03), gold, R * 0.03, R * 0.44, R * 0.1, { lw: lw(R) * 0.6, post: q => { q.fillStyle = blue; q.fillRect(-R * 0.03, R * 0.38, R * 0.12, R * 0.04); q.fillRect(-R * 0.03, R * 0.46, R * 0.12, R * 0.04); } });
    part(x, P.fn(q => { q.moveTo(0, -R * 0.42); q.quadraticCurveTo(-R * 0.12, -R * 0.75, R * 0.05, -R * 0.85); q.quadraticCurveTo(R * 0.17, -R * 0.72, R * 0.05, -R * 0.42); q.closePath(); }), gold, R * 0.02, -R * 0.62, R * 0.14, { lw: lw(R) * 0.6, post: q => Gfx.circ(q, R * 0.04, -R * 0.74, R * 0.03, '#e5484d') });
    x.restore();
    // 前手：發光的手掌
    const ax = R * 0.78 + raise * R * 0.2, ay = -R * 1.25 - raise * R * 0.55;
    part(x, P.cap(R * 0.35, -R * 1.65, ax, ay, R * 0.17, R * 0.14), skin, (ax + R * 0.35) / 2, (ay - R * 1.65) / 2, R * 0.25, { lw: lw(R) });
    part(x, P.ell((R * 0.35 + ax) / 2, (ay - R * 1.65) / 2, R * 0.13, R * 0.09, 0.5), gold, (R * 0.35 + ax) / 2, (ay - R * 1.65) / 2, R * 0.12, { lw: lw(R) * 0.5 });
    if (raise > 0.2) { halo(x, ax + R * 0.15, ay, R * 0.55 * raise, '#ffd36b', 0.9); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + s.t * 5; Gfx.star(x, ax + R * 0.15 + Math.cos(a) * R * 0.45 * raise, ay + Math.sin(a) * R * 0.35 * raise, R * 0.08, '#fff4c0', false); } }
    x.restore();
    x.restore();
    if (sand > 0.1) for (let i = 0; i < 10; i++) { const r = Rig.rng(i + 2); Gfx.circ(x, (r() - 0.5) * R * 2.2 * sand, -R * r() * 2.5 * (1 - sand), R * 0.05, rgba('#e2c27a', 0.9)); }
  });

  // ───────── 深淵海妖 ─────────
  def('bossKraken', { w: 5.8, h: 5.0, ay: 4.1, top: 3.5, vis: 1.25, die: 'bake', boss: true }, (x, R, s) => {
    const sk = mat('#8e3cac', { sh: 0.5, gloss: 0.5 }), skD = mat('#5a2074'), belly = '#e8a8d8', sucker = '#ffd0f0';
    const pw = power(s), wu = windup(s), sink = s.die ? E(s.die) : 0;
    const t2 = s.walk ? s.ph : s.an === 'idle' ? s.ph * 0.6 : s.t * 3;
    const tent = (bx, len, ph, sd, back, up) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([bx + sd * t * len * 0.55 + Math.sin(t2 * 1.2 + ph + t * 3) * R * 0.25 * t, -R * 0.4 + t * R * 0.4 - Math.sin(t * Math.PI) * R * 0.15 - t * t * t * R * (0.9 + 0.3 * Math.sin(t2 + ph) + (up || 0) * 1.6)]); }
      const p = new Path2D();
      // 由粗到細的觸手外形
      const L = [], Rt = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[Math.min(i + 1, pts.length - 1)], b = pts[Math.max(i - 1, 0)], dx = a[0] - b[0], dy = a[1] - b[1], d = Math.hypot(dx, dy) || 1, w = R * 0.25 * (1 - i / 9.8); L.push([pts[i][0] - dy / d * w, pts[i][1] + dx / d * w]); Rt.push([pts[i][0] + dy / d * w, pts[i][1] - dx / d * w]); }
      p.moveTo(L[0][0], L[0][1]); for (const q of L) p.lineTo(q[0], q[1]); const e = pts[pts.length - 1]; p.arc(e[0], e[1], R * 0.02, 0, Math.PI); for (let i = Rt.length - 1; i >= 0; i--) p.lineTo(Rt[i][0], Rt[i][1]); p.closePath();
      part(x, p, back ? skD : sk, bx + sd * len * 0.25, -R * 0.5, R * 0.4, { lw: lw(R) * 0.9, sd: 0.25 });
      if (!back) for (let i = 2; i < 8; i += 2) { part(x, P.circ(Rt[i][0] * 0.55 + pts[i][0] * 0.45, Rt[i][1] * 0.55 + pts[i][1] * 0.45, R * 0.07 * (1 - i / 12)), mat(sucker), pts[i][0], pts[i][1], R * 0.07, { lw: R * 0.025, flat: true }); }
    };
    x.save(); x.translate(0, sink * R * 1.6);
    tent(-R * 0.6, R * 2.4, 0, -1, true, pw * 0.5); tent(R * 0.6, R * 2.4, 2, 1, true, pw * 0.5);
    const bob = (s.walk ? Math.sin(s.ph) : s.an === 'idle' ? s.br : 0) * R * 0.08;
    x.save(); x.translate(s.hit ? -R * 0.12 : 0, bob - wu * R * 0.15); x.rotate(s.hit ? -0.08 : 0);
    const sc = 1 + (s.an === 'idle' ? s.br * 0.03 : 0) + wu * 0.06;
    // 頭兩側的鰭
    for (const sd of [-1, 1]) { const fw = s.walk ? Math.sin(s.ph * 2 + sd) * 0.15 : 0; x.save(); x.translate(sd * R * 0.95, -R * 2.2); x.rotate(sd * (0.5 + fw)); part(x, P.fn(q => { q.moveTo(0, -R * 0.35); q.quadraticCurveTo(sd * R * 0.75, -R * 0.55, sd * R * 0.85, R * 0.05); q.quadraticCurveTo(sd * R * 0.5, -R * 0.05, sd * R * 0.55, R * 0.3); q.quadraticCurveTo(sd * R * 0.25, R * 0.1, 0, R * 0.35); q.closePath(); }), mat('#c45ad8'), sd * R * 0.4, 0, R * 0.4, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(80,20,100,.5)'; q.lineWidth = R * 0.04; for (let i = 0; i < 3; i++) { q.beginPath(); q.moveTo(0, -R * 0.2 + i * R * 0.18); q.lineTo(sd * R * (0.75 - i * 0.12), -R * 0.3 + i * R * 0.28); q.stroke(); } } }); x.restore(); }
    const head = P.fn(q => { q.moveTo(-R * 1.0, -R * 1.1); q.bezierCurveTo(-R * 1.25 * sc, -R * 3.2 * sc, R * 1.25 * sc, -R * 3.2 * sc, R * 1.0, -R * 1.1); q.quadraticCurveTo(0, -R * 0.6, -R * 1.0, -R * 1.1); q.closePath(); });
    part(x, head, sk, 0, -R * 2.0, R * 1.1, { lw: lw(R) * 1.2, tex: q => { for (const [sx, sy, sr] of [[-0.6, -2.4, 0.13], [-0.3, -2.75, 0.09], [0.5, -2.5, 0.14], [0.2, -2.85, 0.08], [0.75, -2.0, 0.08], [-0.75, -1.8, 0.1]]) { q.fillStyle = rgba(belly, 0.55); q.beginPath(); q.arc(sx * R, sy * R, sr * R, 0, TAU); q.fill(); } } });
    // 王冠
    for (const [ox, h] of [[-0.38, 0.42], [0, 0.6], [0.38, 0.42]]) { part(x, P.poly([ox * R - R * 0.11, -R * 2.92 * sc, ox * R, -R * (2.92 * sc + h), ox * R + R * 0.11, -R * 2.92 * sc]), mat('#f2c14e', { gloss: 0.8 }), ox * R, -R * 3.1, R * 0.15, { lw: lw(R) * 0.6 }); glow(x, () => Gfx.circ(x, ox * R, -R * (2.92 * sc + h), R * 0.06, '#9ef0ff'), '#9ef0ff', R * 0.3); }
    // 眼睛
    for (const ex of [-0.4, 0.4]) {
      if (s.die) { eye(x, ex * R, -R * 1.58, R * 0.2, { mood: 'x' }); continue; }
      if (s.hit) { eye(x, ex * R, -R * 1.58, R * 0.2, { mood: 'shut' }); continue; }
      part(x, P.ell(ex * R, -R * 1.58, R * 0.34, R * 0.27), mat('#ffe27a', { gloss: 1 }), ex * R, -R * 1.58, R * 0.3, { lw: lw(R) * 1.1, post: q => { q.fillStyle = 'rgba(255,140,40,.6)'; q.beginPath(); q.arc(ex * R, -R * 1.58, R * 0.2, 0, TAU); q.fill(); } });
      x.fillStyle = '#120818'; x.beginPath(); x.ellipse(ex * R + R * 0.03, -R * 1.56, R * 0.06, R * 0.2, 0, 0, TAU); x.fill(); Gfx.circ(x, ex * R - R * 0.1, -R * 1.68, R * 0.06, '#ffffff');
      x.fillStyle = skD.c; x.beginPath(); x.moveTo(ex * R - R * 0.4, -R * 1.95 + (ex < 0 ? -R * 0.06 : R * 0.1)); x.lineTo(ex * R + R * 0.4, -R * 1.95 + (ex < 0 ? R * 0.1 : -R * 0.06)); x.lineTo(ex * R, -R * 1.76); x.closePath(); x.fill();
    }
    // 嘴與噴墨
    mouth(x, 0, -R * 1.12, R * 0.22, pw > 0.2 || s.hit ? 'o' : 'frown', R * (0.12 + pw * 0.25));
    if (pw > 0.25) for (let i = 0; i < 6; i++) { const r = Rig.rng(i + 1); x.globalAlpha = pw; part(x, P.circ(R * (0.15 + i * 0.22 * pw), -R * (1.0 - i * 0.04) + (r() - 0.5) * R * 0.3, R * (0.14 + i * 0.05)), mat('#2a1838'), 0, -R, R * 0.2, { lw: lw(R) * 0.5 }); x.globalAlpha = 1; }
    x.restore();
    tent(-R * 0.35, R * 2.0, 1, -1, false, pw); tent(R * 0.35, R * 2.0, 3, 1, false, pw); tent(0, R * 1.3, 4.5, 1, false, pw * 0.4);
    x.restore();
    if (sink > 0.2) for (let i = 0; i < 6; i++) { const dx = (i - 2.5) * R * 0.5; x.strokeStyle = rgba('#bfe8ff', 0.8 * (1 - sink)); x.lineWidth = R * 0.06; x.beginPath(); x.ellipse(dx, -R * 0.1, R * 0.3 * sink, R * 0.1 * sink, 0, 0, TAU); x.stroke(); }
  });
})();
