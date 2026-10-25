'use strict';
// 守塔奇兵：第二章的三個多階段頭目——玄甲龜皇、雷鼓鬼神、蝕月魔君。
// 每個形態是一組獨立的精靈圖（bossTortoise2 = 殼碎了、bossRaijin2 = 乘雲飛起、bossEclipse2/3 = 蝕日、狂暴），
// 畫面層依照 e.phase 選用。除了走路／受擊／死亡，還有 idle（呼吸）和 cast（放招）。
(() => {
  const { TAU, mix, rgba } = Gfx;
  const { mat, P, part, eye, mouth, seg, glow, halo } = Rig;
  const { limb2, foot, lw, gait } = Beasts.lib;
  const def = Beasts.def, E = Rig.ease;
  const power = s => Math.max(s.cast, s.sw > 0 ? s.sw : 0);
  const windup = s => s.sw < 0 ? -s.sw : (s.an === 'cast' && s.t < 0.35 ? s.t / 0.35 : 0);

  // ───────── 玄甲龜皇：翡翠龜甲＋金邊、尖刺，頭戴金冠、長白鬚 ─────────
  function tortoise(x, R, s, broken) {
    const skin = mat(broken ? '#7a9a5a' : '#6a9a6a', { sh: 0.5 }), skinD = mat(broken ? '#5a7a42' : '#4e7a52', { sh: 0.5 });
    const shellC = broken ? '#4a6a5a' : '#2f8a6a', gold = mat('#f2c14e', { gloss: 0.9 });
    const pw = power(s), wu = windup(s);
    // 縮殼：第一形態放招＝把頭和腳縮進殼裡
    const hide = !broken && s.an === 'cast' ? Math.sin(Math.min(1, s.t * 1.4) * Math.PI) : 0;
    const roar = broken ? pw : 0;
    const sink = s.die ? E(Math.min(1, s.die / 0.7)) : 0;
    const bob = s.walk ? Math.abs(Math.sin(s.ph)) * R * 0.08 : s.an === 'idle' ? (s.br + 1) * R * 0.03 : 0;
    x.save(); x.translate(0, sink * R * 0.5);
    // 腳（四條粗腿）
    const legs = (far) => {
      for (const [px, i] of far ? [[-R * 0.95, 1], [R * 0.75, 0]] : [[-R * 0.7, 0], [R * 1.0, 1]]) {
        const a = s.walk ? Math.sin(s.ph + i * Math.PI + (far ? 0.5 : 0)) * 0.35 : 0;
        const tuck = hide * R * 0.45 + sink * R * 0.2;
        x.save(); x.translate(px, -R * 0.55 + tuck); x.rotate(a);
        part(x, P.cap(0, 0, 0, R * 0.6 - tuck, R * 0.32, R * 0.28), far ? skinD : skin, 0, R * 0.3, R * 0.32, { lw: lw(R), tex: q => Rig.scales(q, -R * 0.3, 0, R * 0.6, R * 0.6, R * 0.14, 'rgba(30,60,30,.4)', R * 0.025) });
        for (let k = 0; k < 3; k++) part(x, P.poly([(k - 1) * R * 0.15 - R * 0.05, R * 0.62 - tuck, (k - 1) * R * 0.15, R * 0.78 - tuck, (k - 1) * R * 0.15 + R * 0.06, R * 0.62 - tuck]), mat('#f0e6d0'), (k - 1) * R * 0.15, R * 0.7, R * 0.06, { lw: lw(R) * 0.5 });
        x.restore();
      }
    };
    legs(true);
    // 尾巴
    part(x, P.fn(q => { q.moveTo(-R * 1.5, -R * 0.75); q.quadraticCurveTo(-R * 2.0, -R * 0.55 + (s.walk ? Math.sin(s.ph) * R * 0.1 : 0), -R * 2.05, -R * 0.35); q.quadraticCurveTo(-R * 1.8, -R * 0.55, -R * 1.45, -R * 0.55); q.closePath(); }), skinD, -R * 1.75, -R * 0.55, R * 0.3, { lw: lw(R) * 0.8 });
    // 頭（伸出／縮進）
    const hx = R * (1.75 - hide * 0.9) + (roar ? roar * R * 0.15 : 0), hy = -R * (1.05 + bob / R) - wu * R * 0.1 + (s.hit ? R * 0.1 : 0);
    const head = () => {
      x.save(); x.translate(hx, hy); x.rotate(s.hit ? -0.2 : roar ? -0.25 * roar : s.die ? 0.4 : 0);
      part(x, P.cap(-R * 0.6, R * 0.15, -R * 0.05, 0, R * 0.32, R * 0.3), skin, -R * 0.3, R * 0.1, R * 0.32, { lw: lw(R) });
      const hp = P.blob([-R * 0.38, R * 0.1, -R * 0.3, -R * 0.38, R * 0.15, -R * 0.48, R * 0.55, -R * 0.25, R * 0.62, R * 0.1, R * 0.3, R * 0.35, -R * 0.15, R * 0.32]);
      part(x, hp, skin, R * 0.1, 0, R * 0.48, { lw: lw(R) * 1.1, tex: q => Rig.scales(q, -R * 0.3, -R * 0.4, R * 0.8, R * 0.5, R * 0.13, 'rgba(30,60,30,.35)', R * 0.022) });
      // 長鬚
      part(x, P.fn(q => { q.moveTo(R * 0.15, R * 0.28); q.quadraticCurveTo(R * 0.2, R * 0.75, -R * 0.05, R * 0.95); q.quadraticCurveTo(R * 0.4, R * 0.7, R * 0.45, R * 0.28); q.closePath(); }), mat('#f4f0e6'), R * 0.25, R * 0.55, R * 0.25, { lw: lw(R) * 0.7 });
      // 金冠
      if (!broken || !s.die) for (const [ox, h] of [[-0.18, 0.28], [0.05, 0.4], [0.28, 0.28]]) part(x, P.poly([ox * R - R * 0.09, -R * 0.4, ox * R, -R * (0.4 + h), ox * R + R * 0.09, -R * 0.42]), gold, ox * R, -R * 0.55, R * 0.12, { lw: lw(R) * 0.6 });
      part(x, P.rr(-R * 0.3, -R * 0.48, R * 0.68, R * 0.12, R * 0.04), gold, R * 0.04, -R * 0.42, R * 0.3, { lw: lw(R) * 0.6, tex: q => { Gfx.circ(q, R * 0.05, -R * 0.42, R * 0.04, '#5ad1ff'); } });
      const md = s.hit ? 'shut' : s.die ? 'x' : broken ? 'angry' : 'n';
      eye(x, R * 0.25, -R * 0.12, R * 0.12, { iris: broken ? '#ff4a2a' : '#c88a1a', mood: md, look: [0.4, 0.1] });
      eye(x, R * 0.48, -R * 0.12, R * 0.1, { iris: broken ? '#ff4a2a' : '#c88a1a', mood: md, look: [0.4, 0.1] });
      mouth(x, R * 0.4, R * 0.15, R * 0.16, roar > 0.2 || s.hit ? 'roar' : 'frown', R * (0.06 + roar * 0.2));
      x.restore();
    };
    if (hide < 0.5) head();
    // 龜殼
    x.save(); x.translate(0, -bob);
    const sw = R * 1.6, sh = R * 1.55, sy = -R * 0.55;
    const shell = P.fn(q => { q.moveTo(-sw, sy); q.bezierCurveTo(-sw * 1.05, sy - sh * 0.9, -sw * 0.45, sy - sh * 1.1, 0, sy - sh * 1.08); q.bezierCurveTo(sw * 0.45, sy - sh * 1.1, sw * 1.05, sy - sh * 0.9, sw, sy); q.quadraticCurveTo(0, sy + R * 0.3, -sw, sy); q.closePath(); });
    part(x, shell, mat(shellC, { gloss: 0.7, sh: 0.5 }), 0, sy - sh * 0.5, sw, {
      lw: lw(R) * 1.2, tex: q => {
        // 六角甲片
        const plates = [[0, -1.0, 0.42], [-0.62, -0.78, 0.36], [0.62, -0.78, 0.36], [-1.05, -0.35, 0.3], [1.05, -0.35, 0.3], [-0.32, -0.42, 0.32], [0.32, -0.42, 0.32]];
        for (const [px, py, pr] of plates) {
          const cx = px * sw * 0.95, cy = sy + py * sh, r = pr * R * 1.3;
          q.fillStyle = broken ? rgba('#2a4a3a', 0.7) : rgba('#5ad8a8', 0.55); q.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + TAU / 12; q.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75); } q.closePath(); q.fill();
          q.strokeStyle = '#d8a83a'; q.lineWidth = R * 0.06; q.stroke();
        }
        if (broken) {
          // 碎裂：裂痕＋露出紅色的肉
          q.strokeStyle = '#1a0a08'; q.lineWidth = R * 0.07; q.lineCap = 'round';
          for (const [x0, y0, pts] of [[-0.2, -1.05, [[-0.05, -0.75], [-0.3, -0.55], [-0.2, -0.3]]], [0.5, -0.95, [[0.35, -0.6], [0.6, -0.45], [0.55, -0.15]]], [-0.85, -0.7, [[-0.65, -0.45], [-0.9, -0.2]]]]) { q.beginPath(); q.moveTo(x0 * sw, sy + y0 * sh); for (const [px, py] of pts) q.lineTo(px * sw, sy + py * sh); q.stroke(); }
          q.fillStyle = '#d84a3a'; for (const [px, py] of [[-0.25, -0.62], [0.48, -0.55]]) { q.beginPath(); q.ellipse(px * sw, sy + py * sh, R * 0.18, R * 0.1, 0.4, 0, TAU); q.fill(); }
        }
      },
    });
    // 金邊＋尖刺
    x.strokeStyle = '#f2c14e'; x.lineWidth = R * 0.09; x.beginPath(); x.moveTo(-sw, sy); x.quadraticCurveTo(0, sy + R * 0.3, sw, sy); x.stroke();
    const nsp = broken ? 3 : 5;
    for (let i = 0; i < nsp; i++) { const t = (i + 0.5) / nsp, a = Math.PI * (1.12 + t * 0.76), px = Math.cos(a) * sw * 0.98, py = sy - Math.sin(-a) * sh * 1.02 - R * 0.02; part(x, P.poly([px - R * 0.12, py + R * 0.05, px + Math.cos(a) * R * 0.32, py + Math.sin(a) * R * 0.42, px + R * 0.12, py + R * 0.05]), mat('#e8e0cc', { gloss: 0.6 }), px, py, R * 0.12, { lw: lw(R) * 0.6 }); }
    if (hide > 0.4) { halo(x, 0, sy - sh * 0.5, R * 2.2, '#9effe0', hide * 0.45); for (let i = 0; i < 3; i++) Gfx.star(x, Math.cos(i * 2.1 + s.t * 6) * sw * 0.7, sy - sh * 0.6 + Math.sin(i * 2.1 + s.t * 6) * sh * 0.4, R * 0.14, '#ffffff', false); }
    x.restore();
    if (hide >= 0.5) head();
    legs(false);
    x.restore();
  }
  def('bossTortoise', { w: 5.4, h: 4.2, ay: 3.3, top: 3.0, vis: 1.28, die: 'bake', boss: true }, (x, R, s) => tortoise(x, R, s, false));
  def('bossTortoise2', { w: 5.4, h: 4.2, ay: 3.3, top: 3.0, vis: 1.28, die: 'bake', boss: true }, (x, R, s) => tortoise(x, R, s, true));

  // ───────── 雷鼓鬼神：藍皮、雙角、白色亂髮、虎皮裙，背上一圈太鼓；第二形態踩著雷雲飛起來 ─────────
  function raijin(x, R, s, cloud) {
    const skin = mat('#4a7ad8', { sh: 0.5 }), skinD = mat('#3a5ab0', { sh: 0.5 }), tiger = mat('#f2a83a'), drum = mat('#c8382e', { gloss: 0.5 }), horn = mat('#f4ead2', { gloss: 0.6 });
    const pw = power(s), wu = windup(s);
    const g = cloud ? { a: [0.3, -0.5], k: [-0.6, -0.9], bob: 0, arm: [0, 0], fwd: 0, lean: 0 } : gait(s, R, { amp: 0.3, knee: 0.45, bob: 1.4 });
    const fl = cloud ? (s.walk ? Math.sin(s.ph) : s.an === 'idle' ? s.br : 0) * R * 0.12 : 0;
    const die = s.die ? E(s.die) : 0;
    x.save(); x.translate(0, fl - (cloud ? R * 0.6 : 0) + die * R * 0.3);
    // 背後的太鼓環
    x.save(); x.translate(-R * 0.15, -R * 2.35 - g.bob);
    x.strokeStyle = '#8a5a2a'; x.lineWidth = R * 0.12; x.beginPath(); x.arc(0, 0, R * 1.5, Math.PI * 0.95, Math.PI * 2.05); x.stroke();
    x.strokeStyle = '#c89a3a'; x.lineWidth = R * 0.05; x.stroke();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (1.0 + i * 0.2), px = Math.cos(a) * R * 1.5, py = Math.sin(a) * R * 1.5, hit = pw > 0.3 && i % 2 === Math.floor(s.t * 6) % 2;
      part(x, P.circ(px, py, R * 0.3), drum, px, py, R * 0.3, { lw: lw(R) * 0.8, tex: q => { Gfx.circ(q, px, py, R * 0.2, hit ? '#fff8e0' : '#f0dcb4'); q.strokeStyle = '#3a2a1a'; q.lineWidth = R * 0.03; q.beginPath(); q.arc(px, py, R * 0.1, 0, TAU); q.moveTo(px, py - R * 0.1); q.lineTo(px, py + R * 0.1); q.stroke(); } });
      if (hit) halo(x, px, py, R * 0.6, '#fff3a0', 0.6);
    }
    x.restore();
    // 腳
    if (!cloud) for (const i of [1, 0]) {
      const [, , fx, fy] = limb2(x, (i ? -R * 0.22 : R * 0.22) + g.fwd, -R * 0.95 - g.bob, g.a[i], -g.k[i], R * 0.45, R * 0.45, R * 0.2, R * 0.16, i ? skinD : skin);
      foot(x, fx, fy, R * 0.42, R * 0.18, i ? skinD : skin, R);
    } else for (const i of [1, 0]) limb2(x, (i ? -R * 0.22 : R * 0.22), -R * 0.95, g.a[i], -g.k[i], R * 0.4, R * 0.35, R * 0.2, R * 0.16, i ? skinD : skin);
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean - (s.hit ? 0.12 : 0));
    // 虎皮裙
    part(x, P.fn(q => { q.moveTo(-R * 0.62, -R * 1.25); q.lineTo(R * 0.62, -R * 1.25); q.lineTo(R * 0.7, -R * 0.75); q.lineTo(R * 0.35, -R * 0.82); q.lineTo(R * 0.1, -R * 0.68); q.lineTo(-R * 0.2, -R * 0.82); q.lineTo(-R * 0.7, -R * 0.75); q.closePath(); }), tiger, 0, -R * 1.0, R * 0.6, { lw: lw(R), tex: q => { q.strokeStyle = '#2a1a10'; q.lineWidth = R * 0.07; q.lineCap = 'round'; for (const fx of [-0.45, -0.1, 0.25, 0.5]) { q.beginPath(); q.moveTo(fx * R, -R * 1.2); q.quadraticCurveTo(fx * R + R * 0.08, -R * 1.05, fx * R, -R * 0.9); q.stroke(); } } });
    // 身體（肌肉）
    part(x, P.blob([-R * 0.65, -R * 1.2, -R * 0.75, -R * 2.0, 0, -R * 2.35, R * 0.75, -R * 2.0, R * 0.65, -R * 1.2, 0, -R * 1.1]), skin, 0, -R * 1.7, R * 0.75, { lw: lw(R) * 1.1, tex: q => { q.strokeStyle = 'rgba(20,40,100,.35)'; q.lineWidth = R * 0.05; q.beginPath(); q.moveTo(0, -R * 2.1); q.lineTo(0, -R * 1.3); q.moveTo(-R * 0.4, -R * 1.75); q.quadraticCurveTo(0, -R * 1.6, R * 0.4, -R * 1.75); q.stroke(); } });
    // 頭：白色亂髮＋雙角
    x.save(); x.translate(R * 0.1, -R * 2.6); x.rotate(s.hit ? -0.2 : pw > 0.2 ? -0.1 : 0);
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.85 + i * 0.16), l = R * (0.75 + (i % 2) * 0.2) + (pw ? pw * R * 0.15 : 0); part(x, P.fn(q => { q.moveTo(Math.cos(a - 0.2) * R * 0.35, Math.sin(a - 0.2) * R * 0.35); q.quadraticCurveTo(Math.cos(a) * l * 0.8, Math.sin(a) * l * 0.8 - R * 0.1, Math.cos(a) * l, Math.sin(a) * l); q.quadraticCurveTo(Math.cos(a + 0.1) * l * 0.6, Math.sin(a + 0.1) * l * 0.6, Math.cos(a + 0.2) * R * 0.35, Math.sin(a + 0.2) * R * 0.35); q.closePath(); }), mat('#f4f4ff'), Math.cos(a) * l * 0.6, Math.sin(a) * l * 0.6, R * 0.25, { lw: lw(R) * 0.6 }); }
    part(x, P.circ(R * 0.05, 0, R * 0.45), skin, R * 0.05, 0, R * 0.45, { lw: lw(R) });
    for (const sd of [-1, 1]) part(x, P.fn(q => { q.moveTo(sd * R * 0.2 + R * 0.05, -R * 0.35); q.quadraticCurveTo(sd * R * 0.45, -R * 0.75, sd * R * 0.3 + R * 0.1, -R * 1.0); q.quadraticCurveTo(sd * R * 0.2 + R * 0.05, -R * 0.65, sd * R * 0.05, -R * 0.38); q.closePath(); }), horn, sd * R * 0.25, -R * 0.65, R * 0.2, { lw: lw(R) * 0.7 });
    const md = s.hit ? 'shut' : s.die ? 'x' : 'angry';
    eye(x, R * 0.1, -R * 0.05, R * 0.14, { iris: '#ffd36b', mood: md, look: [0.35, 0.1] }); eye(x, R * 0.38, -R * 0.05, R * 0.12, { iris: '#ffd36b', mood: md, look: [0.35, 0.1] });
    mouth(x, R * 0.25, R * 0.22, R * 0.2, pw > 0.2 || s.hit ? 'roar' : 'grin', R * (0.08 + pw * 0.18));
    x.restore();
    // 兩手各拿鼓棒：放招時高舉再敲下
    const up = wu > 0 ? wu : 0, strike = s.an === 'cast' && s.t > 0.4 ? Math.max(0, 1 - (s.t - 0.4) / 0.4) : 0;
    for (const [sd, m] of [[-1, skinD], [1, skin]]) {
      let a = sd < 0 ? 0.6 : -0.6;
      if (s.walk && !cloud) a += g.arm[sd < 0 ? 1 : 0] * 0.4;
      a += -up * sd * 1.6 + strike * sd * 0.8;
      if (s.hit) a = sd * -0.3; if (s.die) a = sd * 0.9 * s.die;
      x.save(); x.translate(sd * R * 0.6, -R * 2.0); x.rotate(Math.PI / 2 + a);
      part(x, P.cap(0, 0, R * 0.75, 0, R * 0.2, R * 0.16), m, R * 0.35, 0, R * 0.22, { lw: lw(R) * 0.9 });
      part(x, P.circ(R * 0.82, 0, R * 0.18), m, R * 0.82, 0, R * 0.18, { lw: lw(R) * 0.7 });
      part(x, P.rr(R * 0.8, -R * 0.05, R * 0.75, R * 0.1, R * 0.05), mat('#d8b07a'), R * 1.15, 0, R * 0.15, { lw: lw(R) * 0.6 });
      part(x, P.circ(R * 1.58, 0, R * 0.1), mat('#f4ead2'), R * 1.58, 0, R * 0.1, { lw: lw(R) * 0.5 });
      x.restore();
    }
    if (pw > 0.3) { x.strokeStyle = rgba('#fff8c0', pw); x.lineWidth = R * 0.06; for (let i = 0; i < 4; i++) { const a = i * 1.6 + s.t * 9; x.beginPath(); x.moveTo(Math.cos(a) * R * 0.8, -R * 2.2 + Math.sin(a) * R * 0.6); x.lineTo(Math.cos(a + 0.3) * R * 1.4, -R * 2.2 + Math.sin(a + 0.4) * R); x.lineTo(Math.cos(a) * R * 1.9, -R * 2.2 + Math.sin(a) * R * 1.4); x.stroke(); } }
    x.restore();
    x.restore();
    // 雷雲
    if (cloud) {
      const cy = -R * 0.55 + fl;
      for (let i = 0; i < 7; i++) { const cx = (i - 3) * R * 0.42, r = R * (0.38 + (i % 3) * 0.08), yy = cy + Math.abs(i - 3) * R * 0.06; part(x, P.circ(cx, yy, r), mat(i % 2 ? '#5a6488' : '#6a7498', { sh: 0.45 }), cx, yy, r, { lw: lw(R) * 0.8, rim: false }); }
      glow(x, () => { x.strokeStyle = '#fff3a0'; x.lineWidth = R * 0.05; x.beginPath(); x.moveTo(-R * 0.6, cy + R * 0.3); x.lineTo(-R * 0.4, cy + R * 0.6); x.lineTo(-R * 0.55, cy + R * 0.65); x.lineTo(-R * 0.3, cy + R * 0.95); x.stroke(); }, '#fff3a0', R * 0.3);
    }
  }
  def('bossRaijin', { w: 5.4, h: 5.2, ay: 4.2, top: 3.9, vis: 1.22, die: 'bake', boss: true }, (x, R, s) => raijin(x, R, s, false));
  def('bossRaijin2', { w: 5.4, h: 5.6, ay: 3.9, top: 3.9, vis: 1.22, die: 'bake', boss: true }, (x, R, s) => raijin(x, R, s, true));

  // ───────── 蝕月魔君：黑金長袍、面具、背後一輪日蝕光環；第二形態光環轉紅、第三形態全身裂出光芒、浮在空中 ─────────
  function eclipse(x, R, s, ph) {
    const robe = mat(ph === 2 ? '#3a1a2a' : '#2a1e4a', { sh: 0.5, rimc: ph === 2 ? '#ff8a6a' : '#c8a8ff', rima: 0.9 }), robeD = mat(ph === 2 ? '#24101a' : '#1a1232'), gold = mat('#f2c14e', { gloss: 0.9 }), mask = mat('#f0ecf4', { gloss: 0.6 });
    const pw = power(s), wu = windup(s);
    const float = ph === 2 ? R * 0.35 : 0;
    const bob = (s.walk ? Math.sin(s.ph) : s.an === 'idle' ? s.br : 0) * R * (ph === 2 ? 0.1 : 0.05);
    const die = s.die ? E(s.die) : 0;
    const corona = ph === 0 ? '#ffd36b' : ph === 1 ? '#ff5a4a' : '#ff9a3a';
    x.save(); x.translate(0, -float - bob + die * R * 0.2);
    // 日蝕光環（黑日＋光冕）
    const hy = -R * 3.0;
    x.save(); x.translate(-R * 0.1, hy);
    const cr = R * (1.25 + pw * 0.2 + (ph === 1 ? 0.1 : 0)) * (1 - die * 0.5);
    glow(x, () => { x.strokeStyle = corona; x.lineWidth = R * 0.12; x.beginPath(); x.arc(0, 0, cr, 0, TAU); x.stroke(); }, corona, R * 0.9);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + (s.t + (s.walk ? s.ph / TAU : 0)) * 0.6, l = cr * (1.12 + (i % 2) * 0.18 + pw * 0.15); x.strokeStyle = rgba(corona, 0.8); x.lineWidth = R * 0.05; x.beginPath(); x.moveTo(Math.cos(a) * cr * 1.04, Math.sin(a) * cr * 1.04); x.lineTo(Math.cos(a) * l, Math.sin(a) * l); x.stroke(); }
    Gfx.circ(x, 0, 0, cr * 0.92, ph === 1 ? '#12060e' : '#0c0818');
    x.restore();
    // 長袍（下襬飄動）
    const sk = s.walk ? Math.sin(s.ph) * R * 0.15 : 0;
    const rb = P.fn(q => { q.moveTo(-R * 0.45, -R * 2.3); q.quadraticCurveTo(-R * 0.95, -R * 1.2, -R * 1.15 - sk, -R * 0.02); for (let i = 0; i < 5; i++) { const t2 = (i + 1) / 5, xx = -R * 1.15 - sk + (R * 2.3 + sk * 2) * t2; q.quadraticCurveTo(xx - R * 0.23, R * 0.12, xx, -R * 0.02 + (i % 2) * R * 0.06); } q.quadraticCurveTo(R * 0.95, -R * 1.2, R * 0.45, -R * 2.3); q.closePath(); });
    part(x, rb, robe, 0, -R * 1.2, R * 1.0, { lw: lw(R) * 1.1, tex: q => {
      q.strokeStyle = 'rgba(242,193,78,.85)'; q.lineWidth = R * 0.06; q.beginPath(); q.moveTo(0, -R * 2.25); q.lineTo(0, -R * 0.05); q.stroke();
      q.fillStyle = 'rgba(242,193,78,.9)'; for (let i = 0; i < 3; i++) { const yy = -R * (1.8 - i * 0.5); q.beginPath(); q.moveTo(-R * 0.18, yy); q.lineTo(0, yy - R * 0.14); q.lineTo(R * 0.18, yy); q.lineTo(0, yy + R * 0.14); q.closePath(); q.fill(); }
      if (ph === 2) { q.strokeStyle = 'rgba(255,170,90,.95)'; q.lineWidth = R * 0.05; for (const [x0, y0, x1, y1] of [[-0.6, -1.5, -0.3, -0.9], [-0.3, -0.9, -0.5, -0.4], [0.5, -1.7, 0.25, -1.1], [0.25, -1.1, 0.55, -0.5]]) { q.beginPath(); q.moveTo(x0 * R, y0 * R); q.lineTo(x1 * R, y1 * R); q.stroke(); } }
      q.fillStyle = 'rgba(242,193,78,.8)'; q.fillRect(-R * 1.2, -R * 0.2, R * 2.4, R * 0.06);
    } });
    // 肩甲（月牙）
    for (const sd of [-1, 1]) part(x, P.fn(q => { q.moveTo(sd * R * 0.2, -R * 2.3); q.quadraticCurveTo(sd * R * 0.95, -R * 2.6, sd * R * 0.95, -R * 1.95); q.quadraticCurveTo(sd * R * 0.75, -R * 2.2, sd * R * 0.25, -R * 2.05); q.closePath(); }), gold, sd * R * 0.6, -R * 2.2, R * 0.35, { lw: lw(R) * 0.8 });
    // 頭（兜帽＋面具）
    x.save(); x.translate(R * 0.02, -R * 2.62); x.rotate(s.hit ? -0.15 : 0);
    part(x, P.fn(q => { q.moveTo(-R * 0.5, R * 0.35); q.quadraticCurveTo(-R * 0.6, -R * 0.45, R * 0.0, -R * 0.62); q.quadraticCurveTo(R * 0.6, -R * 0.45, R * 0.5, R * 0.35); q.closePath(); }), robeD, 0, 0, R * 0.55, { lw: lw(R) });
    part(x, P.fn(q => { q.moveTo(-R * 0.3, -R * 0.3); q.quadraticCurveTo(R * 0.05, -R * 0.42, R * 0.4, -R * 0.3); q.quadraticCurveTo(R * 0.42, R * 0.15, R * 0.05, R * 0.38); q.quadraticCurveTo(-R * 0.32, R * 0.15, -R * 0.3, -R * 0.3); q.closePath(); }), mask, R * 0.05, 0, R * 0.35, { lw: lw(R) * 0.8, tex: q => { q.fillStyle = '#2a1e4a'; q.beginPath(); q.moveTo(R * 0.05, R * 0.02); q.lineTo(R * 0.12, R * 0.28); q.lineTo(-R * 0.02, R * 0.28); q.closePath(); q.fill(); q.strokeStyle = '#f2c14e'; q.lineWidth = R * 0.03; q.beginPath(); q.arc(R * 0.05, -R * 0.22, R * 0.08, Math.PI * 0.2, Math.PI * 1.8); q.stroke(); } });
    const ec = ph === 0 ? '#c8a8ff' : ph === 1 ? '#ff6a5a' : '#ffb03a';
    if (!s.die) glow(x, () => { x.fillStyle = s.hit ? '#ffffff' : ec; for (const ex of [-R * 0.1, R * 0.2]) { x.beginPath(); x.ellipse(ex, -R * 0.05, R * 0.07, R * 0.03, 0, 0, TAU); x.fill(); } }, ec, R * 0.4);
    // 尖冠（第二形態起）
    if (ph >= 1) for (let i = -2; i <= 2; i++) part(x, P.poly([i * R * 0.13 - R * 0.05, -R * 0.55, i * R * 0.16, -R * (0.9 + (2 - Math.abs(i)) * 0.12), i * R * 0.13 + R * 0.05, -R * 0.55]), gold, i * R * 0.13, -R * 0.7, R * 0.08, { lw: lw(R) * 0.5 });
    x.restore();
    // 新月法杖（前手）
    const stA = s.sw ? s.arc(0.1, -0.6, 0.5) : -wu * 0.4 + pw * 0.3 + (s.hit ? 0.3 : 0) + (s.die ? s.die : 0);
    x.save(); x.translate(R * 0.85, -R * 1.5); x.rotate(stA);
    part(x, P.rr(-R * 0.05, -R * 1.6, R * 0.1, R * 2.9, R * 0.04), mat('#3a2a5a'), 0, -R * 0.2, R * 0.15, { lw: lw(R) * 0.6 });
    part(x, P.fn(q => { q.arc(0, -R * 1.85, R * 0.42, Math.PI * 0.25, Math.PI * 1.75); q.arc(R * 0.18, -R * 1.85, R * 0.32, Math.PI * 1.6, Math.PI * 0.4, true); q.closePath(); }), gold, 0, -R * 1.85, R * 0.4, { lw: lw(R) * 0.8 });
    halo(x, R * 0.1, -R * 1.85, R * (0.5 + pw * 0.6), ec, 0.5 + pw * 0.4);
    x.restore();
    part(x, P.cap(R * 0.3, -R * 2.05, R * 0.82, -R * 1.5, R * 0.18, R * 0.15), robe, R * 0.55, -R * 1.8, R * 0.2, { lw: lw(R) * 0.8 });
    part(x, P.circ(R * 0.85, -R * 1.5, R * 0.13), mat('#d8d0e8'), R * 0.85, -R * 1.5, R * 0.13, { lw: lw(R) * 0.6 });
    x.restore();
    if (ph === 2 && !s.die) for (let i = 0; i < 5; i++) { const a = i * 1.3 + s.t * 4, d = R * (0.9 + (i % 2) * 0.3); x.globalAlpha = 0.6; Gfx.circ(x, Math.cos(a) * d, -R * 0.35 + Math.sin(a) * d * 0.3, R * 0.12, '#ff9a3a'); x.globalAlpha = 1; }
    // 死亡：碎成光點
    if (s.die > 0.2) for (let i = 0; i < 10; i++) { const a = i * 0.63, d = R * (0.5 + s.die * 2); x.globalAlpha = 1 - s.die; Gfx.star(x, Math.cos(a) * d, -R * 1.8 + Math.sin(a) * d * 0.6, R * 0.15, '#fff3c0', false); x.globalAlpha = 1; }
  }
  def('bossEclipse', { w: 5.2, h: 5.8, ay: 4.6, top: 4.3, vis: 1.18, die: 'bake', boss: true }, (x, R, s) => eclipse(x, R, s, 0));
  def('bossEclipse2', { w: 5.2, h: 5.8, ay: 4.6, top: 4.3, vis: 1.18, die: 'bake', boss: true }, (x, R, s) => eclipse(x, R, s, 1));
  def('bossEclipse3', { w: 5.2, h: 6.2, ay: 5.0, top: 4.7, vis: 1.18, die: 'bake', boss: true }, (x, R, s) => eclipse(x, R, s, 2));
})();
