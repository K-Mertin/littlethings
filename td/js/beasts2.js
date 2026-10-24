'use strict';
// 守塔奇兵：敵人美術（續）——甲蟲、蝙蝠、石像鬼、石像、祭司、盾衛、巨魔、骷髏兵、風精靈、晶甲蛛、木乃伊、鐵螯蟹。
(() => {
  const { TAU, mix, rgba } = Gfx;
  const { mat, P, part, eye, mouth, blush, seg, glow, halo } = Rig;
  const { limb2, foot, crystal, lw } = Beasts.lib;
  const def = Beasts.def, OUT = Rig.EDGE;
  const E = Rig.ease;

  // 雙足角色的共同動作：回傳腳的角度、身體起伏、手臂擺動、往前衝的距離、身體前傾
  function gait(s, R, o) {
    o = o || {};
    const g = { a: [0, 0], k: [0, 0], bob: 0, arm: [0, 0], fwd: 0, lean: 0, fall: 0 };
    if (s.walk) { const b = Rig.biped(s.ph, o.amp, o.knee); g.a = b.a; g.k = b.k; g.bob = b.bob * R * (o.bob || 1); g.arm = b.arm; g.lean = Math.sin(s.ph * 2) * 0.02; }
    if (s.an === 'idle') { g.bob = (s.br + 1) * R * 0.03; }
    if (s.sw) { g.fwd = (s.sw > 0 ? s.sw * 0.3 : s.sw * 0.1) * R; g.lean = s.sw * 0.12; g.a = [s.sw > 0 ? -0.35 * s.sw : 0.15 * -s.sw, s.sw > 0 ? 0.45 * s.sw : -0.1]; g.k = [s.sw < 0 ? 0.3 * s.sw : 0, s.sw < 0 ? 0.25 * s.sw : 0]; }
    if (s.hit) { g.lean = -0.16 * s.hit; g.fwd = -0.1 * R * s.hit; g.a = [0.2 * s.hit, -0.15 * s.hit]; g.arm = [0.6 * s.hit, 0.8 * s.hit]; }
    if (s.die) { const q = E(Math.min(1, s.die / 0.5)); g.a = [-0.3 * q, 0.5 * q]; g.k = [-0.6 * q, -0.2 * q]; g.arm = [1.2 * q, 1.5 * q]; }
    return g;
  }

  Beasts.lib.gait = gait;

  // ───────── 鐵甲蟲 ─────────
  def('beetle', { w: 3.8, h: 2.9, ay: 2.2, top: 1.7, vis: 1.4, die: 'bake' }, (x, R, s) => {
    const shell = mat('#3f6ee0', { gloss: 1, sh: 0.5 }), body = mat('#2c3450'), legM = mat('#262a3e'), horn = mat('#e8ecf4', { gloss: 0.8 });
    let by = -R * 0.72, rot = 0, fwd = 0, flip = 0;
    if (s.walk) by -= Math.abs(Math.sin(s.ph * 2)) * R * 0.04;
    if (s.sw) { rot = s.sw < 0 ? s.sw * 0.25 : s.sw * 0.12; fwd = s.sw > 0 ? s.sw * R * 0.4 : s.sw * R * 0.1; }
    if (s.hit) { rot = -0.12 * s.hit; fwd = -R * 0.1; }
    if (s.die) flip = E(Math.min(1, s.die / 0.55));
    x.save(); x.translate(fwd, 0);
    // 翻肚：繞身體中心轉半圈
    x.translate(0, by); x.rotate(rot + flip * Math.PI); if (flip) x.translate(0, flip * R * 0.15);
    const legs = (far) => {
      for (let i = 0; i < 3; i++) {
        const hx = -R * 0.55 + i * R * 0.55, ph = s.ph + i * 2.1 + (far ? Math.PI : 0), base = (i - 1) * 0.55;
        let a1 = base + (s.walk ? Math.sin(ph) * 0.4 : 0) + (far ? 0.12 : 0), a2 = -base * 0.6 + (i === 1 ? 0.5 : 0);
        if (s.die) { a1 = Math.PI + base + Math.sin(s.die * 30 + i * 2) * 0.4; a2 = 0.8; }
        limb2(x, hx, R * 0.18, a1, a2 - (s.walk ? Math.max(0, Math.sin(ph + 1)) * 0.3 : 0), R * 0.3, R * 0.32, R * 0.075, R * 0.045, far ? mat('#1a1c2a') : legM);
      }
    };
    legs(true);
    // 肚子
    part(x, P.ell(0, R * 0.12, R * 0.95, R * 0.28), body, 0, R * 0.12, R * 0.5, { lw: lw(R) });
    // 頭與角
    const hx = R * 0.88, hy = R * 0.0 - (s.sw > 0 ? s.sw * R * 0.1 : 0);
    x.save(); x.translate(hx, hy); x.rotate(s.sw > 0 ? -s.sw * 0.3 : s.sw < 0 ? -s.sw * 0.15 : Math.sin(s.ph * 2) * 0.05);
    const hornP = P.fn(q => { q.moveTo(R * 0.05, -R * 0.2); q.quadraticCurveTo(R * 0.62, -R * 0.38, R * 0.62, -R * 1.02); q.quadraticCurveTo(R * 0.42, -R * 0.55, R * 0.0, -R * 0.02); q.closePath(); });
    part(x, hornP, horn, R * 0.35, -R * 0.4, R * 0.3, { lw: lw(R) * 0.9 });
    part(x, P.ell(0, 0, R * 0.38, R * 0.32), body, 0, 0, R * 0.36, { lw: lw(R) });
    for (const sd of [-1, 1]) { const mp = P.fn(q => { q.moveTo(R * 0.25, R * 0.05 * sd + R * 0.1); q.quadraticCurveTo(R * 0.58, R * (0.12 + sd * 0.04), R * 0.52, R * (0.26 + sd * 0.02) + (s.sw > 0 ? s.sw * R * 0.06 * sd : 0)); q.lineTo(R * 0.32, R * 0.16); q.closePath(); }); part(x, mp, legM, R * 0.4, R * 0.15, R * 0.12, { lw: lw(R) * 0.6 }); }
    eye(x, R * 0.14, -R * 0.05, R * 0.19, { iris: '#ff5a2a', mood: s.mood === 'n' ? 'angry' : s.mood, look: [0.35, 0.1] });
    x.restore();
    // 甲殼
    const sh = P.fn(q => { q.moveTo(-R * 1.08, R * 0.22); q.bezierCurveTo(-R * 1.12, -R * 0.95, R * 0.9, -R * 1.05, R * 0.92, R * 0.18); q.quadraticCurveTo(0, R * 0.46, -R * 1.08, R * 0.22); q.closePath(); });
    part(x, sh, shell, -R * 0.08, -R * 0.35, R * 0.95, {
      lw: lw(R) * 1.1, tex: q => {
        q.fillStyle = Gfx.lgrad(q, -R, -R, R, R * 0.3, ['rgba(170,120,255,0)', 'rgba(170,120,255,.3)', 'rgba(80,230,210,.25)', 'rgba(80,230,210,0)']); q.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 1.8);
        q.strokeStyle = 'rgba(18,24,48,.55)'; q.lineWidth = R * 0.05;
        q.beginPath(); q.moveTo(-R * 0.1, -R * 0.75); q.quadraticCurveTo(-R * 0.05, -R * 0.1, -R * 0.12, R * 0.35); q.stroke();
        for (let i = 0; i < 2; i++) { q.beginPath(); q.ellipse(-R * 0.1, R * 0.28, R * (0.55 + i * 0.35), R * (0.5 + i * 0.32), 0, Math.PI * 1.05, Math.PI * 1.95); q.stroke(); }
        for (const [rx, ry] of [[-0.62, -0.1], [-0.4, -0.5], [0.3, -0.52], [0.56, -0.1], [-0.12, -0.75]]) { q.fillStyle = '#e8f0fa'; q.beginPath(); q.arc(rx * R, ry * R, R * 0.06, 0, TAU); q.fill(); q.fillStyle = '#4a5a78'; q.beginPath(); q.arc(rx * R + R * 0.015, ry * R + R * 0.02, R * 0.03, 0, TAU); q.fill(); }
      },
    });
    x.save(); x.clip(sh); x.strokeStyle = '#f2c14e'; x.lineWidth = R * 0.09; x.stroke(sh); x.restore();
    for (const [gx, gy, gr] of [[-0.55, -0.38, 0.11], [0.3, -0.62, 0.09], [0.48, -0.2, 0.08]]) part(x, P.circ(gx * R, gy * R, gr * R), mat('#ffd36b', { gloss: 0.8 }), gx * R, gy * R, gr * R, { lw: lw(R) * 0.5 });
    Rig.sheen(x, -R * 0.75, -R * 0.35, -R * 0.35, -R * 0.68, R * 0.08, 0.6);
    legs(false);
    x.restore(); x.restore();
  });

  // ───────── 蝙蝠／石像鬼 ─────────
  function bat(x, R, s, gar) {
    const furM = mat(gar ? '#8c96a8' : '#7a4ed8', { sh: 0.5 }), wingM = mat(gar ? '#6a7486' : '#5a32b0'), memM = mat(gar ? '#9aa2b2' : '#b48cff', { sh: 0.4 });
    let flap = s.walk ? Math.sin(s.ph) : 0.3, rot = 0, fwd = 0, fold = 0;
    if (s.sw) { flap = s.sw < 0 ? 1 : -0.6 * s.sw; rot = s.sw > 0 ? s.sw * 0.45 : s.sw * 0.15; fwd = s.sw > 0 ? s.sw * R * 0.35 : 0; }
    if (s.hit) { flap = -0.4; rot = -0.3 * s.hit; fold = 0.3; }
    if (s.die) { fold = E(Math.min(1, s.die / 0.4)); flap = -0.2; rot = s.die * 0.6; }
    const by = -R * 0.25 + (s.walk ? -Math.cos(s.ph) * R * 0.12 : 0);
    x.save(); x.translate(fwd, by); x.rotate(rot);
    const wing = (sd) => {
      const sp = 1 - fold * 0.65, up = flap;
      const sx = sd * R * 0.3, tipX = sd * R * 2.05 * sp * (1 - Math.abs(up) * 0.12), tipY = -R * (1.0 * up + 0.15);
      const jX = sd * R * 1.05 * sp, jY = -R * (0.75 * up + 0.45);
      const p = P.fn(q => {
        q.moveTo(sx, -R * 0.25); q.quadraticCurveTo(sd * R * 0.6, jY - R * 0.15, jX, jY); q.lineTo(tipX, tipY);
        q.quadraticCurveTo(sd * R * 1.75 * sp, -R * 0.05 * up + R * 0.05, sd * R * 1.62 * sp, R * 0.22 - up * R * 0.2);
        q.quadraticCurveTo(sd * R * 1.38 * sp, R * 0.02, sd * R * 1.1 * sp, R * 0.38 - up * R * 0.15);
        q.quadraticCurveTo(sd * R * 0.86 * sp, R * 0.12, sd * R * 0.62 * sp, R * 0.4 - up * R * 0.1);
        q.quadraticCurveTo(sd * R * 0.45, R * 0.2, sx, R * 0.25); q.closePath();
      });
      part(x, p, sd < 0 ? wingM : memM, sd * R, -R * 0.1, R * 0.9, {
        lw: lw(R), sd: 0.25, tex: q => {
          q.strokeStyle = rgba(gar ? '#2a3040' : '#2a1060', 0.7); q.lineWidth = R * 0.07; q.lineCap = 'round';
          q.beginPath(); q.moveTo(sx, -R * 0.2); q.lineTo(jX, jY); q.lineTo(tipX, tipY); q.moveTo(jX, jY); q.lineTo(sd * R * 1.62 * sp, R * 0.22 - up * R * 0.2); q.moveTo(jX, jY); q.lineTo(sd * R * 1.1 * sp, R * 0.38 - up * R * 0.15); q.moveTo(jX, jY); q.lineTo(sd * R * 0.62 * sp, R * 0.4 - up * R * 0.1); q.stroke();
          if (gar) Rig.speckle(q, sd * R, 0, R * 2, R, 14, ['rgba(255,255,255,.18)', 'rgba(0,0,0,.15)'], R * 0.02, R * 0.06, 11);
        },
      });
      part(x, P.circ(jX, jY, R * 0.08), mat(gar ? '#4a5262' : '#3a1a80'), jX, jY, R * 0.08, { lw: lw(R) * 0.6 });
      if (!gar) { const cl = P.poly([tipX, tipY, tipX + sd * R * 0.14, tipY - R * 0.14, tipX + sd * R * 0.04, tipY + R * 0.05]); part(x, cl, mat('#f4ecff'), tipX, tipY, R * 0.08, { lw: lw(R) * 0.5 }); }
    };
    wing(-1); wing(1);
    if (gar) {
      // 尾巴
      const tp = P.fn(q => { q.moveTo(-R * 0.25, R * 0.4); q.quadraticCurveTo(-R * 0.85, R * 0.95, -R * 1.2, R * 0.45); q.lineTo(-R * 1.1, R * 0.4); q.quadraticCurveTo(-R * 0.8, R * 0.75, -R * 0.35, R * 0.25); q.closePath(); });
      part(x, tp, furM, -R * 0.7, R * 0.55, R * 0.3, { lw: lw(R) * 0.8 });
      part(x, P.poly([-R * 1.12, R * 0.26, -R * 1.38, R * 0.5, -R * 1.05, R * 0.62]), mat('#6a7080'), -R * 1.18, R * 0.46, R * 0.15, { lw: lw(R) * 0.7 });
    }
    // 腳
    for (const fx of [-R * 0.18, R * 0.22]) { seg(x, fx, R * 0.5, fx + R * 0.04, R * 0.78, OUT, R * 0.14); seg(x, fx, R * 0.5, fx + R * 0.04, R * 0.78, gar ? '#5a6272' : '#3a1a70', R * 0.08); }
    // 身體（毛茸茸的球）
    const pts = []; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, rr = i % 2 ? 1 : 0.9; pts.push(Math.cos(a) * R * 0.66 * rr, R * 0.05 + Math.sin(a) * R * 0.72 * rr); }
    const bp = gar ? P.blob([-R * 0.6, R * 0.2, -R * 0.55, -R * 0.45, 0, -R * 0.7, R * 0.6, -R * 0.4, R * 0.65, R * 0.25, 0, R * 0.72]) : P.poly(pts);
    part(x, bp, furM, 0, 0, R * 0.68, {
      lw: lw(R), tex: q => {
        q.fillStyle = rgba(gar ? '#c8ccd6' : '#d8c4ff', 0.55); q.beginPath(); q.ellipse(R * 0.1, R * 0.32, R * 0.36, R * 0.3, 0, 0, TAU); q.fill();
        if (gar) { Rig.speckle(q, 0, 0, R * 1.3, R * 1.4, 22, ['rgba(255,255,255,.22)', 'rgba(30,30,40,.2)'], R * 0.02, R * 0.06, 4); q.strokeStyle = 'rgba(40,40,52,.55)'; q.lineWidth = R * 0.035; q.beginPath(); q.moveTo(-R * 0.35, -R * 0.15); q.lineTo(-R * 0.18, R * 0.1); q.lineTo(-R * 0.32, R * 0.32); q.stroke(); }
        else Rig.fur(q, 0, -R * 0.1, R * 1.1, R * 1.0, 16, 'rgba(60,20,140,.45)', R * 0.12, 1.6, R * 0.035, 6);
      },
    });
    // 胸前的絨毛（蝙蝠）／石頭眉骨與青苔（石像鬼）
    if (!gar) part(x, P.fn(q => { const n = 7; q.moveTo(-R * 0.32, R * 0.05); for (let i = 0; i <= n; i++) { const a = Math.PI * (1.05 - i / n * 1.1); q.quadraticCurveTo(R * 0.05 + Math.cos(a + 0.08) * R * 0.48, R * 0.3 + Math.sin(a + 0.08) * R * 0.5, R * 0.05 + Math.cos(a) * R * 0.38, R * 0.3 + Math.sin(a) * R * 0.38); } q.closePath(); }), mat('#e6d2ff', { sh: 0.4 }), R * 0.05, R * 0.35, R * 0.38, { lw: lw(R) * 0.7, tex: q => Rig.fur(q, R * 0.05, R * 0.4, R * 0.5, R * 0.4, 8, 'rgba(120,80,190,.5)', R * 0.1, 1.6, R * 0.03, 2) });
    else {
      part(x, P.blob([-R * 0.62, -R * 0.42, -R * 0.2, -R * 0.62, R * 0.15, -R * 0.55, R * 0.4, -R * 0.62, R * 0.58, -R * 0.35, R * 0.1, -R * 0.38]), mat('#6e7686'), 0, -R * 0.48, R * 0.35, { lw: lw(R) * 0.8 });
      part(x, P.blob([-R * 0.6, -R * 0.15, -R * 0.35, -R * 0.38, -R * 0.05, -R * 0.3, -R * 0.25, -R * 0.12]), mat('#6aa848'), -R * 0.35, -R * 0.25, R * 0.2, { lw: lw(R) * 0.6 });
    }
    // 耳朵／角
    for (const sd of [-1, 1]) {
      if (gar) { const hp = P.fn(q => { q.moveTo(sd * R * 0.32, -R * 0.5); q.quadraticCurveTo(sd * R * 0.6, -R * 1.15, sd * R * 0.15, -R * 1.25); q.quadraticCurveTo(sd * R * 0.38, -R * 0.85, sd * R * 0.05, -R * 0.6); q.closePath(); }); part(x, hp, mat('#efe2c4'), sd * R * 0.3, -R * 0.9, R * 0.25, { lw: lw(R) * 0.8 }); }
      else { const ep = P.poly([sd * R * 0.55, -R * 0.3, sd * R * 0.5, -R * 1.12, sd * R * 0.08, -R * 0.52]); part(x, ep, furM, sd * R * 0.4, -R * 0.65, R * 0.3, { lw: lw(R) * 0.85, tex: q => { q.fillStyle = '#ff9ad0'; q.beginPath(); q.moveTo(sd * R * 0.43, -R * 0.42); q.lineTo(sd * R * 0.42, -R * 0.9); q.lineTo(sd * R * 0.2, -R * 0.52); q.fill(); } }); }
    }
    const ic = gar ? '#ff9a00' : '#ff2a5a', md = s.mood === 'n' ? 'angry' : s.mood;
    eye(x, -R * 0.1, -R * 0.12, R * 0.2, { iris: ic, mood: md, look: [0.35, 0.15] }); eye(x, R * 0.34, -R * 0.12, R * 0.19, { iris: ic, mood: md, look: [0.35, 0.15] });
    if (gar) { part(x, P.blob([-R * 0.15, R * 0.05, R * 0.35, R * 0.0, R * 0.62, R * 0.15, R * 0.5, R * 0.42, R * 0.0, R * 0.45, -R * 0.2, R * 0.3]), mat('#a4acba'), R * 0.2, R * 0.22, R * 0.3, { lw: lw(R) * 0.8 }); Gfx.circ(x, R * 0.45, R * 0.16, R * 0.035, '#2a2a34'); Gfx.circ(x, R * 0.55, R * 0.18, R * 0.03, '#2a2a34'); }
    if (s.sw > 0.2 || s.hit) mouth(x, R * 0.15, R * (gar ? 0.36 : 0.2), R * 0.2, s.hit ? 'o' : 'roar', R * 0.24);
    else if (gar) { mouth(x, R * 0.18, R * 0.38, R * 0.18, 'flat'); for (const fx of [0.02, 0.34]) part(x, P.poly([fx * R - R * 0.05, R * 0.4, fx * R, R * 0.22, fx * R + R * 0.05, R * 0.4]), mat('#fff6e0'), fx * R, R * 0.32, R * 0.05, { lw: lw(R) * 0.4, flat: true }); }
    else { mouth(x, R * 0.12, R * 0.17, R * 0.16, 'smile'); for (const fx of [0.03, 0.22]) part(x, P.poly([fx * R - R * 0.05, R * 0.2, fx * R, R * 0.36, fx * R + R * 0.05, R * 0.2]), mat('#ffffff'), fx * R, R * 0.26, R * 0.05, { lw: lw(R) * 0.4, flat: true }); }
    x.restore();
  }
  def('bat', { w: 4.8, h: 3.6, ay: 2.1, top: 1.5, vis: 1.45, die: 'fly' }, (x, R, s) => bat(x, R, s, false));
  def('gargoyle', { w: 5.0, h: 3.8, ay: 2.3, top: 1.75, vis: 1.38, die: 'fly' }, (x, R, s) => bat(x, R, s, true));

  // ───────── 石像（駝背的岩石巨猿：肩上長水晶、胸口有發光的符文核心）─────────
  def('golem', { w: 4.0, h: 3.8, ay: 3.1, top: 2.6, vis: 1.42, die: 'bake' }, (x, R, s) => {
    const st = mat('#a9a4b6', { sh: 0.55 }), stD = mat('#7c768c', { sh: 0.55 }), moss = mat('#78c44a', { sh: 0.45 }), rune = '#5ff0ff';
    const g = gait(s, R, { amp: 0.3, knee: 0.35, bob: 1.5 });
    const br = s.die ? E(Math.min(1, s.die / 0.7)) : 0;
    const rockTex = (cx, cy, sz, seed) => q => {
      Rig.speckle(q, cx, cy, sz * 2.2, sz * 2.2, 12, ['rgba(255,255,255,.22)', 'rgba(40,30,60,.22)'], R * 0.02, R * 0.05, seed);
      // 切面：幾塊亮暗不同的多邊形，讓石頭看起來有稜角
      const r = Rig.rng(seed + 9);
      for (let i = 0; i < 3; i++) { const px = cx + (r() - 0.5) * sz * 1.4, py = cy + (r() - 0.6) * sz * 1.2, w = sz * (0.35 + r() * 0.3); q.fillStyle = i % 2 ? 'rgba(255,255,255,.14)' : 'rgba(30,20,50,.14)'; q.beginPath(); q.moveTo(px, py); q.lineTo(px + w, py + w * 0.25); q.lineTo(px + w * 0.6, py + w * 0.8); q.lineTo(px - w * 0.2, py + w * 0.5); q.closePath(); q.fill(); }
    };
    const rock = (p, m, cx, cy, sz, seed) => part(x, p, m, cx, cy, sz, { lw: lw(R), tex: rockTex(cx, cy, sz, seed || 3) });
    // 腳（短而粗）
    for (const [i, m] of [[1, stD], [0, st]]) {
      const sw = Math.sin(g.a[i]) * R * 0.32, lift = s.walk ? Math.max(0, -Math.sin(s.ph + i * Math.PI)) * R * 0.16 : 0;
      x.save(); x.translate(br * R * (i ? -0.5 : 0.6), 0); x.rotate(br * (i ? -0.4 : 0.5));
      const lx = (i ? -R * 0.32 : R * 0.22) + sw;
      rock(P.blob([lx - R * 0.28, -lift, lx - R * 0.3, -R * 0.62 - lift, lx + R * 0.02, -R * 0.78 - lift, lx + R * 0.3, -R * 0.6 - lift, lx + R * 0.34, -lift]), m, lx, -R * 0.4, R * 0.32, 5 + i);
      x.restore();
    }
    x.save(); x.translate(g.fwd, -g.bob + br * R * 0.9); x.rotate(g.lean * 0.6 + br * 0.35);
    // 手臂：長到快碰地，像大猩猩
    let up = 0;
    if (s.an === 'atk') up = s.arc(0, 1, 0.15) ;
    const armRot = (i) => (s.walk ? g.arm[i] * 0.55 : 0) - up * (i ? 2.4 : 2.7) + (s.hit ? 0.35 : 0) + (s.an === 'atk' && s.t > 0.45 && s.t < 0.75 ? -0.35 : 0) + br * (i ? -1.0 : 1.2);
    const arm = (i, m, sx) => {
      x.save(); x.translate(sx, i ? -R * 2.0 : -R * 1.88); x.rotate(armRot(i));
      rock(P.blob([-R * 0.24, -R * 0.05, R * 0.24, -R * 0.05, R * 0.28, R * 0.7, -R * 0.26, R * 0.72]), m, 0, R * 0.32, R * 0.32, 11 + i);
      rock(P.blob([-R * 0.34, R * 0.66, R * 0.32, R * 0.62, R * 0.4, R * 1.18, 0, R * 1.32, -R * 0.4, R * 1.18]), m, 0, R * 0.98, R * 0.4, 13 + i);
      for (let k = 0; k < 3; k++) part(x, P.circ(-R * 0.22 + k * R * 0.22, R * 1.28, R * 0.12), stD, -R * 0.22 + k * R * 0.22, R * 1.28, R * 0.12, { lw: lw(R) * 0.6 });
      crystal(x, R * 0.12, R * 0.7, R * 0.07, R * 0.26, '#9ff0ff', 1.2, R);
      x.restore();
    };
    arm(1, stD, -R * 0.9);
    // 身體：寬肩、往前駝
    const chest = P.blob([-R * 0.9, -R * 0.8, -R * 1.12, -R * 1.65, -R * 0.75, -R * 2.32, R * 0.25, -R * 2.42, R * 0.98, -R * 2.0, R * 0.95, -R * 1.2, R * 0.55, -R * 0.68, -R * 0.2, -R * 0.62], 0.7);
    rock(chest, st, 0, -R * 1.5, R * 1.0, 21);
    // 胸口符文圈＋核心
    const on = 1 - br;
    if (on > 0.05) {
      glow(x, () => { x.globalAlpha = on; x.strokeStyle = rune; x.lineWidth = R * 0.06; x.beginPath(); x.arc(R * 0.18, -R * 1.45, R * 0.36, 0, TAU); x.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; x.beginPath(); x.moveTo(R * 0.18 + Math.cos(a) * R * 0.36, -R * 1.45 + Math.sin(a) * R * 0.36); x.lineTo(R * 0.18 + Math.cos(a) * R * 0.48, -R * 1.45 + Math.sin(a) * R * 0.48); x.stroke(); } x.globalAlpha = 1; }, rune, R * 0.45);
      halo(x, R * 0.18, -R * 1.45, R * 0.55, rune, 0.45 * on * (s.hit ? 1.5 : 1));
    }
    part(x, P.poly([R * 0.18, -R * 1.7, R * 0.38, -R * 1.55, R * 0.38, -R * 1.33, R * 0.18, -R * 1.2, -R * 0.02, -R * 1.33, -R * 0.02, -R * 1.55]), mat(on > 0.1 ? '#8ff6ff' : '#6a8a98', { gloss: 1 }), R * 0.18, -R * 1.45, R * 0.24, { lw: lw(R) * 0.7, hd: 0.3 });
    // 肩上的苔蘚與水晶
    const mp = P.blob([-R * 1.05, -R * 1.85, -R * 0.82, -R * 2.32, -R * 0.2, -R * 2.45, R * 0.15, -R * 2.3, -R * 0.35, -R * 2.12, -R * 0.75, -R * 1.98]);
    part(x, mp, moss, -R * 0.5, -R * 2.2, R * 0.45, { lw: lw(R) * 0.7, tex: q => Rig.speckle(q, -R * 0.5, -R * 2.2, R, R * 0.4, 12, ['#c4f27e', '#4a8a2e'], R * 0.025, R * 0.05, 3) });
    for (const [vx, vl] of [[-0.95, 0.38], [-0.6, 0.25]]) { seg(x, vx * R, -R * 1.98, vx * R + R * 0.02, -R * (1.98 - vl), '#3e7a26', R * 0.05); Gfx.circ(x, vx * R + R * 0.02, -R * (1.98 - vl), R * 0.05, '#8ad85a'); }
    part(x, P.fn(q => { q.ellipse(-R * 0.8, -R * 2.32, R * 0.14, R * 0.09, 0, Math.PI, 0); q.lineTo(-R * 0.8, -R * 2.2); q.closePath(); }), mat('#e8484d'), -R * 0.8, -R * 2.28, R * 0.12, { lw: lw(R) * 0.5, post: q => { Gfx.circ(q, -R * 0.84, -R * 2.35, R * 0.025, '#fff'); Gfx.circ(q, -R * 0.75, -R * 2.33, R * 0.02, '#fff'); } });
    seg(x, -R * 0.8, -R * 2.24, -R * 0.8, -R * 2.14, '#f2ecdc', R * 0.05);
    crystal(x, -R * 0.1, -R * 2.36, R * 0.13, R * 0.55, '#7fe8ff', -0.15, R); crystal(x, R * 0.14, -R * 2.32, R * 0.09, R * 0.36, '#c49bff', 0.35, R); crystal(x, -R * 0.32, -R * 2.3, R * 0.07, R * 0.3, '#b8f4ff', -0.55, R);
    // 頭：低低地嵌在兩肩之間，厚重的眉骨下面兩顆發光的眼睛
    x.save(); x.translate(R * 0.42 + br * R * 0.7, -R * 2.42 + br * R * 1.5 + (s.hit ? -R * 0.06 : 0)); x.rotate((s.hit ? -0.2 : s.an === 'atk' ? -up * 0.15 : 0) + br * 1.3);
    rock(P.blob([-R * 0.38, R * 0.2, -R * 0.42, -R * 0.2, -R * 0.1, -R * 0.42, R * 0.3, -R * 0.36, R * 0.46, -R * 0.02, R * 0.36, R * 0.3, 0, R * 0.38]), st, 0, 0, R * 0.42, 31);
    part(x, P.blob([-R * 0.3, -R * 0.12, R * 0.0, -R * 0.26, R * 0.48, -R * 0.15, R * 0.45, -R * 0.02, R * 0.0, -R * 0.06]), stD, R * 0.08, -R * 0.12, R * 0.25, { lw: lw(R) * 0.8 });
    if (!s.die) for (const ex of [R * 0.1, R * 0.32]) glow(x, () => { x.fillStyle = s.hit ? '#ffffff' : '#c8fbff'; x.beginPath(); x.ellipse(ex, R * 0.02, R * 0.07, s.hit ? R * 0.02 : R * 0.05, 0, 0, TAU); x.fill(); }, rune, R * 0.35);
    else for (const ex of [R * 0.1, R * 0.32]) eye(x, ex, R * 0.02, R * 0.07, { mood: 'x' });
    seg(x, R * 0.05, R * 0.2, R * 0.35, R * 0.18 + (s.an === 'atk' && up > 0.5 ? R * 0.06 : 0), 'rgba(30,20,40,.8)', R * 0.04);
    x.restore();
    arm(0, st, R * 0.78);
    x.restore();
    if (br > 0.2) for (let i = 0; i < 7; i++) { const r = Rig.rng(i + 3), dx = (r() - 0.5) * R * 2.8 * br, sz = R * (0.12 + r() * 0.16); rock(P.poly([dx - sz, 0, dx - sz * 0.4, -sz * 1.1, dx + sz * 0.8, -sz * 0.9, dx + sz, 0]), i % 2 ? st : stD, dx, -sz * 0.5, sz, i); }
  });

  // ───────── 祭司 ─────────
  def('healer', { w: 3.4, h: 3.9, ay: 3.15, top: 2.9, vis: 1.38, die: 'fall', cast: true }, (x, R, s) => {
    const robe = mat('#f6f1e6', { sh: 0.42 }), trim = '#36c48a', gold = mat('#f0bc4a', { gloss: 0.7 }), skin = mat('#ffd8b8', { sh: 0.3 }), hair = mat('#ffd970');
    const g = gait(s, R, { amp: 0.35 });
    const cast = s.cast;
    // 腳
    for (const i of [1, 0]) { const fx = Math.sin(g.a[i]) * R * 0.32 + (i ? -R * 0.12 : R * 0.12); foot(x, fx, s.walk ? -Math.max(0, -Math.sin(s.ph + i * Math.PI)) * R * 0.08 : 0, R * 0.36, R * 0.18, mat(i ? '#5a3a24' : '#7a4e2e'), R); }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean);
    // 法杖（後手）
    const stA = cast ? -0.35 * cast : s.sw ? (s.sw < 0 ? -s.sw * 0.5 : -s.sw * 1.1) : (s.walk ? Math.sin(s.ph) * 0.06 : 0) + (s.hit ? 0.3 : 0) + (s.die ? 0.8 * s.die : 0);
    x.save(); x.translate(R * 0.62, -R * 0.15 - cast * R * 0.6); x.rotate(-stA);
    const staff = P.rr(-R * 0.06, -R * 2.45, R * 0.12, R * 2.5, R * 0.06);
    part(x, staff, mat('#9a6634'), 0, -R * 1.2, R * 0.25, { lw: lw(R) * 0.8 });
    x.strokeStyle = OUT; x.lineWidth = R * 0.14; x.beginPath(); x.arc(0, -R * 2.6, R * 0.3, Math.PI * 0.12, Math.PI * 0.88, true); x.stroke();
    x.strokeStyle = '#f0bc4a'; x.lineWidth = R * 0.08; x.stroke();
    if (cast > 0.2) halo(x, 0, -R * 2.6, R * (0.6 + cast * 0.5), '#9effc8', 0.7 * cast);
    part(x, P.circ(0, -R * 2.6, R * 0.22), mat('#38e09a', { gloss: 1 }), 0, -R * 2.6, R * 0.22, { lw: lw(R) * 0.8 });
    x.restore();
    // 長袍
    const sk = s.walk ? Math.sin(s.ph) * R * 0.1 : 0;
    const rp = P.fn(q => { q.moveTo(-R * 0.82 - sk * 0.5, -R * 0.06); q.quadraticCurveTo(-R * 0.7, -R * 1.2, -R * 0.42, -R * 1.72); q.lineTo(R * 0.42, -R * 1.72); q.quadraticCurveTo(R * 0.72, -R * 1.1, R * 0.82 + sk, -R * 0.06); q.quadraticCurveTo(R * 0.4, R * 0.04, 0, -R * 0.04); q.quadraticCurveTo(-R * 0.4, R * 0.04, -R * 0.82 - sk * 0.5, -R * 0.06); q.closePath(); });
    part(x, rp, robe, 0, -R * 0.85, R * 0.85, {
      lw: lw(R), tex: q => {
        q.strokeStyle = 'rgba(150,130,110,.45)'; q.lineWidth = R * 0.035; q.lineCap = 'round';
        for (const fx of [-0.45, -0.1, 0.32]) { q.beginPath(); q.moveTo(fx * R, -R * 1.2); q.quadraticCurveTo(fx * R * 1.25 + sk * 0.3, -R * 0.6, fx * R * 1.45 + sk * 0.6, -R * 0.08); q.stroke(); }
        q.fillStyle = trim; q.fillRect(-R * 0.12, -R * 1.7, R * 0.24, R * 1.7); q.fillRect(-R * 1, -R * 0.26, R * 2, R * 0.13);
        q.fillStyle = '#f0bc4a'; q.fillRect(-R * 1, -R * 0.29, R * 2, R * 0.035);
        q.fillStyle = '#ffffff'; q.fillRect(-R * 0.05, -R * 1.45, R * 0.1, R * 0.38); q.fillRect(-R * 0.17, -R * 1.33, R * 0.34, R * 0.1);
        q.strokeStyle = '#e0a83a'; q.lineWidth = R * 0.035; for (let i = 0; i < 7; i++) { q.beginPath(); q.arc(-R * 0.75 + i * R * 0.25, -R * 0.4, R * 0.07, 0, Math.PI, true); q.stroke(); }
      },
    });
    // 聖書（前手抱著）
    const bkx = -R * 0.38, bky = -R * 1.12 - (s.hit ? R * 0.1 : 0);
    part(x, P.rr(bkx - R * 0.2, bky - R * 0.17, R * 0.4, R * 0.32, R * 0.05), mat('#8a3428'), bkx, bky, R * 0.22, { lw: lw(R) * 0.7, tex: q => { q.fillStyle = '#f0bc4a'; q.fillRect(bkx - R * 0.03, bky - R * 0.12, R * 0.06, R * 0.22); q.fillRect(bkx - R * 0.1, bky - R * 0.06, R * 0.2, R * 0.06); } });
    // 光環
    glow(x, () => { x.strokeStyle = '#ffe9a0'; x.lineWidth = R * 0.07; x.beginPath(); x.ellipse(R * 0.0, -R * 2.72 - cast * R * 0.1, R * 0.34, R * 0.1, 0, 0, TAU); x.stroke(); }, '#fff3a0', R * 0.35);
    // 頭
    x.save(); x.translate(R * 0.05, -R * 2.05); x.rotate(s.hit ? -0.2 : s.die ? -0.3 : cast ? -0.12 : (s.walk ? Math.sin(s.ph * 2) * 0.03 : 0));
    const hood = P.fn(q => { q.arc(-R * 0.05, 0, R * 0.6, Math.PI * 0.55, Math.PI * 1.9); q.quadraticCurveTo(R * 0.62, R * 0.2, R * 0.45, R * 0.48); q.quadraticCurveTo(0, R * 0.62, -R * 0.4, R * 0.5); q.closePath(); });
    part(x, hood, robe, -R * 0.05, 0, R * 0.6, { lw: lw(R) });
    part(x, P.circ(R * 0.12, R * 0.05, R * 0.44), skin, R * 0.12, R * 0.05, R * 0.44, { lw: lw(R) * 0.8, rim: false });
    const bang = P.fn(q => { q.arc(R * 0.12, R * 0.05, R * 0.46, Math.PI * 1.02, Math.PI * 1.92); q.quadraticCurveTo(R * 0.38, -R * 0.12, R * 0.12, -R * 0.15); q.quadraticCurveTo(-R * 0.08, -R * 0.02, -R * 0.33, R * 0.15); q.closePath(); });
    part(x, bang, hair, R * 0.1, -R * 0.2, R * 0.35, { lw: lw(R) * 0.7, gloss: 0.4 });
    x.strokeStyle = trim; x.lineWidth = R * 0.09; x.beginPath(); x.arc(-R * 0.05, 0, R * 0.6, Math.PI * 1.2, Math.PI * 1.72); x.stroke();
    const md = cast > 0.3 ? 'happy' : s.mood;
    eye(x, R * 0.18, R * 0.08, R * 0.13, { iris: '#2a8a5a', mood: md, look: [0.3, 0.1] }); eye(x, R * 0.46, R * 0.08, R * 0.12, { iris: '#2a8a5a', mood: md, look: [0.3, 0.1] });
    blush(x, R * 0.08, R * 0.26, R * 0.09); blush(x, R * 0.56, R * 0.26, R * 0.08);
    mouth(x, R * 0.33, R * 0.3, R * 0.08, s.hit ? 'o' : s.die ? 'wavy' : s.sw > 0.2 ? 'open' : 'smile', R * 0.1);
    x.restore();
    // 前手（扶法杖）
    const hx = R * 0.6 + Math.sin(stA) * R * 0.9, hy = -R * 1.15 - cast * R * 0.6;
    part(x, P.cap(R * 0.15, -R * 1.45, hx - R * 0.05, hy, R * 0.15, R * 0.12), robe, (hx + R * 0.15) / 2, hy, R * 0.25, { lw: lw(R) * 0.8 });
    part(x, P.circ(hx, hy, R * 0.12), skin, hx, hy, R * 0.12, { lw: lw(R) * 0.6 });
    if (cast > 0.4) for (let i = 0; i < 4; i++) { const a = i * 1.7 + s.t * 6; Gfx.star(x, R * 0.62 + Math.cos(a) * R * 0.75, -R * 2.6 - cast * R * 0.6 + Math.sin(a) * R * 0.45, R * 0.1, '#eafff4', false); }
    x.restore();
  });

  // ───────── 盾衛 ─────────
  def('shield', { w: 3.6, h: 3.9, ay: 3.2, top: 2.85, vis: 1.35, die: 'fall' }, (x, R, s) => {
    const steel = mat('#b4c0d4', { gloss: 0.9, sh: 0.5 }), steelD = mat('#7a879c', { gloss: 0.5 }), blue = mat('#2f5ec0'), gold = mat('#f2c14e', { gloss: 0.8 }), red = mat('#d03a3a');
    const g = gait(s, R, { amp: 0.42 });
    // 披風
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean);
    const cw = s.walk ? Math.sin(s.ph) * R * 0.08 : s.hit ? R * 0.15 : 0;
    part(x, P.fn(q => { q.moveTo(-R * 0.35, -R * 1.85); q.quadraticCurveTo(-R * 0.95 + cw, -R * 1.1, -R * 0.85 + cw * 1.5, -R * 0.45); q.lineTo(-R * 0.6 + cw, -R * 0.55); q.lineTo(-R * 0.45 + cw, -R * 0.42); q.lineTo(-R * 0.1, -R * 0.8); q.closePath(); }), red, -R * 0.55, -R * 1.1, R * 0.5, { lw: lw(R) });
    // 劍（後手）
    let saA = -0.5 + (s.walk ? g.arm[1] * 0.3 : 0);
    if (s.sw) saA = s.arc(-0.5, -2.3, 0.9);
    if (s.hit) saA = -1.2; if (s.die) saA = -0.5 - s.die * 1.5;
    x.restore();
    for (const i of [1, 0]) {
      const m = i ? steelD : steel;
      const [, , fx, fy] = limb2(x, (i ? -R * 0.14 : R * 0.14) + g.fwd, -R * 0.82 - g.bob, g.a[i], -g.k[i], R * 0.42, R * 0.42, R * 0.15, R * 0.13, m);
      foot(x, fx, fy, R * 0.4, R * 0.18, mat(i ? '#3a3440' : '#4a4452'), R);
    }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean);
    x.save(); x.translate(-R * 0.25, -R * 1.55); x.rotate(saA);
    part(x, P.cap(0, 0, R * 0.5, 0, R * 0.14, R * 0.12), steelD, R * 0.25, 0, R * 0.2, { lw: lw(R) * 0.8 });
    part(x, P.rr(R * 0.45, -R * 0.2, R * 0.1, R * 0.4, R * 0.04), gold, R * 0.5, 0, R * 0.15, { lw: lw(R) * 0.6 });
    const bl = P.poly([R * 0.55, -R * 0.08, R * 1.55, -R * 0.07, R * 1.75, 0, R * 1.55, R * 0.07, R * 0.55, R * 0.08]);
    part(x, bl, mat('#e8eef8', { gloss: 1 }), R * 1.1, 0, R * 0.3, { lw: lw(R) * 0.7, sd: 0.5 });
    x.restore();
    // 身體
    const torso = P.rr(-R * 0.55, -R * 1.92, R * 1.1, R * 1.12, R * 0.34);
    part(x, torso, steel, 0, -R * 1.36, R * 0.6, { lw: lw(R), tex: q => { q.fillStyle = '#2f5ec0'; q.fillRect(-R * 0.6, -R * 1.08, R * 1.2, R * 0.18); q.fillStyle = '#f2c14e'; q.fillRect(-R * 0.6, -R * 1.08, R * 1.2, R * 0.04); q.strokeStyle = 'rgba(40,50,70,.5)'; q.lineWidth = R * 0.04; q.beginPath(); q.moveTo(0, -R * 1.85); q.lineTo(0, -R * 1.15); q.stroke(); } });
    Rig.sheen(x, -R * 0.35, -R * 1.75, -R * 0.38, -R * 1.25, R * 0.07, 0.6);
    // 鎖子甲裙＋藍色罩袍
    part(x, P.fn(q => { q.moveTo(-R * 0.5, -R * 0.92); q.lineTo(R * 0.5, -R * 0.92); q.lineTo(R * 0.55, -R * 0.62); q.lineTo(-R * 0.55, -R * 0.62); q.closePath(); }), mat('#8c98ac', { gloss: 0.4 }), 0, -R * 0.77, R * 0.4, { lw: lw(R) * 0.7, tex: q => Rig.scales(q, -R * 0.6, -R * 0.92, R * 1.2, R * 0.32, R * 0.12, 'rgba(40,50,70,.5)', R * 0.025) });
    part(x, P.fn(q => { q.moveTo(-R * 0.16, -R * 0.95); q.lineTo(R * 0.24, -R * 0.95); q.lineTo(R * 0.2, -R * 0.5); q.lineTo(R * 0.04, -R * 0.42); q.lineTo(-R * 0.12, -R * 0.5); q.closePath(); }), mat('#2f5ec0'), R * 0.04, -R * 0.7, R * 0.25, { lw: lw(R) * 0.7, tex: q => { q.fillStyle = '#f2c14e'; q.fillRect(R * 0.0, -R * 0.88, R * 0.08, R * 0.3); q.fillRect(-R * 0.06, -R * 0.78, R * 0.2, R * 0.07); } });
    part(x, P.circ(-R * 0.42, -R * 1.78, R * 0.24), steel, -R * 0.42, -R * 1.78, R * 0.24, { lw: lw(R) * 0.8 });
    // 頭盔
    x.save(); x.translate(R * 0.05, -R * 2.22); x.rotate(s.hit ? -0.2 : s.sw > 0 ? 0.08 : 0);
    const hp = P.fn(q => { q.arc(0, 0, R * 0.52, Math.PI * 0.92, Math.PI * 2.08); q.lineTo(R * 0.5, R * 0.4); q.quadraticCurveTo(0, R * 0.55, -R * 0.45, R * 0.4); q.closePath(); });
    part(x, hp, steel, 0, 0, R * 0.52, { lw: lw(R), tex: q => { q.fillStyle = '#121624'; q.fillRect(R * 0.05, -R * 0.06, R * 0.5, R * 0.12); for (let i = 0; i < 3; i++) q.fillRect(R * (0.18 + i * 0.1), R * 0.08, R * 0.045, R * 0.22); q.strokeStyle = '#f2c14e'; q.lineWidth = R * 0.06; q.beginPath(); q.arc(0, 0, R * 0.52, Math.PI * 1.15, Math.PI * 1.85); q.stroke(); } });
    if (!s.die) glow(x, () => { Gfx.circ(x, R * 0.36, 0, R * 0.05, s.hit ? '#ffffff' : '#ff6a3a'); }, '#ff5a2a', R * 0.25);
    const pw = s.walk ? Math.sin(s.ph * 2) * R * 0.06 : s.hit ? R * 0.1 : 0;
    part(x, P.fn(q => { q.moveTo(-R * 0.05, -R * 0.45); q.quadraticCurveTo(-R * 0.55, -R * 1.0 + pw, -R * 0.95, -R * 0.35 + pw); q.quadraticCurveTo(-R * 0.5, -R * 0.62, -R * 0.12, -R * 0.32); q.closePath(); }), red, -R * 0.45, -R * 0.6, R * 0.35, { lw: lw(R) * 0.8 });
    x.restore();
    part(x, P.fn(q => { q.ellipse(R * 0.36, -R * 1.72, R * 0.3, R * 0.22, 0.3, Math.PI * 0.95, Math.PI * 2.1); q.closePath(); }), steel, R * 0.36, -R * 1.78, R * 0.28, { lw: lw(R) * 0.8, tex: q => { q.strokeStyle = '#f2c14e'; q.lineWidth = R * 0.05; q.beginPath(); q.ellipse(R * 0.36, -R * 1.72, R * 0.24, R * 0.16, 0.3, Math.PI * 1.05, Math.PI * 2.0); q.stroke(); } });
    // 盾（前手）
    const sx = R * 0.68 + (s.sw > 0 ? s.sw * R * 0.15 : 0) + (s.hit ? R * 0.05 : 0), sy = -R * 1.25 - (s.hit ? R * 0.2 : 0);
    x.save(); x.translate(sx, sy); x.rotate(s.hit ? -0.15 : s.die ? 0.6 * s.die : 0);
    const shp = P.fn(q => { q.moveTo(-R * 0.42, -R * 0.55); q.lineTo(R * 0.42, -R * 0.55); q.lineTo(R * 0.42, R * 0.15); q.quadraticCurveTo(R * 0.36, R * 0.6, 0, R * 0.78); q.quadraticCurveTo(-R * 0.36, R * 0.6, -R * 0.42, R * 0.15); q.closePath(); });
    part(x, shp, gold, 0, 0, R * 0.55, { lw: lw(R) * 1.1, tex: q => { const ip = P.fn(r => { r.moveTo(-R * 0.28, -R * 0.42); r.lineTo(R * 0.28, -R * 0.42); r.lineTo(R * 0.28, R * 0.12); r.quadraticCurveTo(0, R * 0.62, -R * 0.28, R * 0.12); r.closePath(); }); q.fillStyle = '#2f5ec0'; q.fill(ip); Gfx.star(q, 0, -R * 0.02, R * 0.16, '#ffe9a0', false); } });
    x.restore();
    x.restore();
  });

  // ───────── 巨魔 ─────────
  def('ogre', { w: 4.6, h: 4.0, ay: 3.25, top: 2.75, vis: 1.3, die: 'fall' }, (x, R, s) => {
    const skin = mat('#7cb050', { sh: 0.5 }), skinD = mat('#5a8a38', { sh: 0.5 }), belly = mat('#c4de94', { sh: 0.35 }), cloth = mat('#8a5a32'), wood = mat('#9a6232');
    const g = gait(s, R, { amp: 0.32, knee: 0.5, bob: 1.5 });
    for (const i of [1, 0]) {
      const sw = Math.sin(g.a[i]) * R * 0.35, lift = s.walk ? Math.max(0, -Math.sin(s.ph + i * Math.PI)) * R * 0.12 : 0, hx = (i ? -R * 0.3 : R * 0.3) + g.fwd;
      part(x, P.rr(hx - R * 0.22 + sw * 0.5, -R * 0.85 - lift, R * 0.44, R * 0.85, R * 0.18), i ? skinD : skin, hx, -R * 0.45, R * 0.3, { lw: lw(R) });
      part(x, P.ell(hx + sw * 0.5 + R * 0.06, -R * 0.06 - lift, R * 0.3, R * 0.12), mat('#4a2e18'), hx, 0, R * 0.2, { lw: lw(R) * 0.8 });
    }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean);
    // 後手
    const aB = (s.walk ? g.arm[1] * 0.5 : 0) + (s.hit ? 0.6 : 0) + (s.die ? 1.2 * s.die : 0);
    x.save(); x.translate(-R * 0.75, -R * 1.75); x.rotate(aB);
    part(x, P.cap(0, 0, -R * 0.15, R * 0.75, R * 0.24, R * 0.2), skinD, 0, R * 0.4, R * 0.3, { lw: lw(R) });
    part(x, P.circ(-R * 0.15, R * 0.82, R * 0.2), skinD, -R * 0.15, R * 0.82, R * 0.2, { lw: lw(R) * 0.8 });
    x.restore();
    // 身體
    part(x, P.ell(0, -R * 1.45, R * 1.0, R * 0.92), skin, 0, -R * 1.45, R * 0.95, { lw: lw(R) * 1.1, tex: q => { Rig.speckle(q, 0, -R * 1.5, R * 1.8, R * 1.6, 18, ['rgba(60,100,30,.35)', 'rgba(200,240,140,.25)'], R * 0.03, R * 0.07, 9); } });
    const jig = s.hit ? R * 0.06 : 0;
    part(x, P.ell(R * 0.18, -R * 1.18 + jig, R * 0.64, R * 0.58 - jig), belly, R * 0.18, -R * 1.18, R * 0.6, { lw: lw(R) * 0.6, tex: q => { q.strokeStyle = 'rgba(90,120,50,.5)'; q.lineWidth = R * 0.04; q.beginPath(); q.arc(R * 0.2, -R * 1.0, R * 0.12, 0.2, Math.PI - 0.2); q.stroke(); } });
    // 腰布
    part(x, P.poly([-R * 0.92, -R * 0.82, R * 0.92, -R * 0.82, R * 0.65, -R * 0.4, R * 0.25, -R * 0.55, -R * 0.15, -R * 0.36, -R * 0.68, -R * 0.5]), cloth, 0, -R * 0.6, R * 0.5, { lw: lw(R) * 0.8 });
    part(x, P.rr(-R * 0.95, -R * 0.9, R * 1.9, R * 0.12, R * 0.04), mat('#d8c8a0'), 0, -R * 0.84, R * 0.3, { lw: lw(R) * 0.6 });
    part(x, P.circ(R * 0.12, -R * 0.8, R * 0.15), mat('#f2eadc'), R * 0.12, -R * 0.8, R * 0.15, { lw: lw(R) * 0.6, post: q => { Gfx.circ(q, R * 0.06, -R * 0.82, R * 0.035, '#2a1a1a'); Gfx.circ(q, R * 0.18, -R * 0.82, R * 0.035, '#2a1a1a'); } });
    // 頭
    x.save(); x.translate(R * 0.28, -R * 2.32); x.rotate(s.hit ? -0.25 : s.sw > 0 ? 0.15 * s.sw : s.die ? -0.3 : 0);
    for (const sd of [-1, 1]) part(x, P.poly([sd * R * 0.42, -R * 0.05, sd * R * 0.78, -R * 0.25, sd * R * 0.48, R * 0.15]), skin, sd * R * 0.55, -R * 0.05, R * 0.2, { lw: lw(R) * 0.8 });
    part(x, P.ell(0, 0, R * 0.52, R * 0.46), skin, 0, 0, R * 0.5, { lw: lw(R) });
    for (let i = 0; i < 3; i++) seg(x, -R * 0.15 + i * R * 0.13, -R * 0.4, -R * 0.08 + i * R * 0.16, -R * 0.7, '#3a2a18', R * 0.08);
    x.strokeStyle = '#f2c14e'; x.lineWidth = R * 0.05; x.beginPath(); x.arc(R * 0.72, R * 0.0, R * 0.08, 0, TAU); x.stroke();
    const md = s.mood === 'n' ? 'angry' : s.mood;
    eye(x, R * 0.0, -R * 0.08, R * 0.13, { iris: '#c83a2a', mood: md, look: [0.3, 0.1] }); eye(x, R * 0.3, -R * 0.08, R * 0.12, { iris: '#c83a2a', mood: md, look: [0.3, 0.1] });
    part(x, P.ell(R * 0.16, R * 0.1, R * 0.11, R * 0.08), skinD, R * 0.16, R * 0.1, R * 0.1, { lw: lw(R) * 0.5 });
    if (s.sw > 0.1 || s.hit) mouth(x, R * 0.15, R * 0.22, R * 0.22, s.hit ? 'o' : 'roar', R * 0.2); else mouth(x, R * 0.15, R * 0.24, R * 0.2, 'frown');
    for (const tx of [0.0, 0.28]) part(x, P.poly([tx * R - R * 0.05, R * 0.27, tx * R, R * 0.05, tx * R + R * 0.06, R * 0.27]), mat('#fffbe8'), tx * R, R * 0.18, R * 0.08, { lw: lw(R) * 0.5 });
    x.restore();
    // 前手＋棍棒
    let ca = -0.6 + (s.walk ? g.arm[0] * 0.25 : 0);
    if (s.sw) ca = s.arc(-0.6, 2.4, 4.8);
    if (s.hit) ca = -0.2; if (s.die) ca = -0.6 + s.die * 1.8;
    x.save(); x.translate(R * 0.72, -R * 1.72); x.rotate(ca + 0.6);
    part(x, P.cap(0, 0, R * 0.05, R * 0.7, R * 0.25, R * 0.2), skin, 0, R * 0.35, R * 0.3, { lw: lw(R) });
    x.translate(R * 0.05, R * 0.75); x.rotate(2.3);
    const club = P.fn(q => { q.moveTo(-R * 0.1, R * 0.15); q.lineTo(-R * 0.13, -R * 0.6); q.quadraticCurveTo(-R * 0.38, -R * 1.45, R * 0.02, -R * 1.62); q.quadraticCurveTo(R * 0.38, -R * 1.45, R * 0.15, -R * 0.6); q.lineTo(R * 0.12, R * 0.15); q.closePath(); });
    part(x, club, wood, 0, -R * 0.7, R * 0.45, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(70,40,20,.5)'; q.lineWidth = R * 0.035; for (let i = 0; i < 4; i++) { q.beginPath(); q.moveTo(-R * 0.08 + i * R * 0.06, -R * 0.3); q.quadraticCurveTo(-R * 0.15 + i * R * 0.08, -R * 0.9, -R * 0.05 + i * R * 0.05, -R * 1.4); q.stroke(); } } });
    for (const [nx, ny] of [[-0.24, -1.3], [0.22, -1.2], [0.0, -1.58], [0.2, -0.9], [-0.22, -0.95]]) part(x, P.poly([nx * R, ny * R, nx * R + Math.sign(nx || 1) * R * 0.14, ny * R - R * 0.04, nx * R, ny * R + R * 0.08]), mat('#e8ecf2', { gloss: 0.6 }), nx * R, ny * R, R * 0.06, { lw: lw(R) * 0.4 });
    part(x, P.rr(-R * 0.14, -R * 0.3, R * 0.28, R * 0.12, R * 0.03), mat('#c8b090'), 0, -R * 0.24, R * 0.12, { lw: lw(R) * 0.5 });
    part(x, P.circ(0, 0, R * 0.2), skin, 0, 0, R * 0.2, { lw: lw(R) * 0.8 });
    x.restore();
    x.restore();
  });

  // ───────── 骷髏兵 ─────────
  def('skeleton', { w: 3.4, h: 3.7, ay: 3.05, top: 2.7, vis: 1.4, die: 'bake' }, (x, R, s) => {
    const bone = mat('#f2ecdc', { sh: 0.45 }), boneD = mat('#c4b89c', { sh: 0.45 }), rust = mat('#8a7a6a', { gloss: 0.3 });
    const g = gait(s, R, { amp: 0.5, knee: 0.9 });
    const col = s.die ? E(Math.min(1, s.die / 0.6)) : 0; // 散架程度
    const rattle = s.hit ? R * 0.06 : 0;
    const drop = (k) => col * R * k;
    for (const i of [1, 0]) {
      const hx = (i ? -R * 0.12 : R * 0.12) + g.fwd;
      x.save(); if (col) { x.translate(hx * col * 2, 0); x.rotate((i ? -1 : 1) * col * 1.3); }
      const [, , fx, fy] = limb2(x, hx, -R * 0.95 - g.bob + drop(0.6), g.a[i] * (1 - col), -g.k[i], R * 0.46, R * 0.46, R * 0.08, R * 0.07, i ? boneD : bone);
      foot(x, fx, fy, R * 0.3, R * 0.1, i ? boneD : bone, R);
      x.restore();
    }
    x.save(); x.translate(g.fwd + rattle, -g.bob + drop(0.9)); x.rotate(g.lean + col * 0.5);
    // 骨盆＋破布
    part(x, P.ell(0, -R * 0.96, R * 0.28, R * 0.14), bone, 0, -R * 0.96, R * 0.28, { lw: lw(R) * 0.8 });
    part(x, P.poly([-R * 0.32, -R * 1.02, R * 0.34, -R * 1.02, R * 0.28, -R * 0.6, R * 0.1, -R * 0.74, -R * 0.04, -R * 0.55, -R * 0.24, -R * 0.7]), mat('#6a4a7a'), 0, -R * 0.8, R * 0.3, { lw: lw(R) * 0.7 });
    // 後手＋圓盾
    const shx = -R * 0.5 - (s.walk ? g.arm[1] * R * 0.15 : 0), shy = -R * 1.15 - (s.hit ? R * 0.2 : 0);
    seg(x, -R * 0.2, -R * 1.62, shx, shy, OUT, R * 0.14); seg(x, -R * 0.2, -R * 1.62, shx, shy, '#c4b89c', R * 0.08);
    if (col < 0.9) { x.save(); x.translate(shx - col * R * 0.8, shy + drop(1.0)); x.rotate(col * 1.2); part(x, P.circ(0, 0, R * 0.36), mat('#8a5a2e'), 0, 0, R * 0.36, { lw: lw(R), tex: q => { q.strokeStyle = '#c8a878'; q.lineWidth = R * 0.05; q.beginPath(); q.arc(0, 0, R * 0.26, 0, TAU); q.stroke(); q.strokeStyle = 'rgba(60,30,10,.5)'; q.lineWidth = R * 0.03; for (const a of [0.4, 1.6, 2.6]) { q.beginPath(); q.moveTo(Math.cos(a) * R * 0.1, Math.sin(a) * R * 0.1); q.lineTo(Math.cos(a) * R * 0.34, Math.sin(a) * R * 0.34); q.stroke(); } } }); part(x, P.circ(0, 0, R * 0.11), mat('#b8c0ca', { gloss: 1 }), 0, 0, R * 0.11, { lw: lw(R) * 0.6 }); x.restore(); }
    // 脊椎與肋骨
    seg(x, 0, -R * 0.98, 0, -R * 1.65, OUT, R * 0.16); seg(x, 0, -R * 0.98, 0, -R * 1.65, '#e8e0cc', R * 0.09);
    for (let i = 0; i < 3; i++) { const ry = -R * (1.28 + i * 0.15) + (col ? drop(0.3 * i) : 0); x.strokeStyle = OUT; x.lineWidth = R * 0.12; x.beginPath(); x.ellipse(0, ry, R * (0.36 - i * 0.04), R * 0.09, 0, 0, TAU); x.stroke(); x.strokeStyle = '#f2ecdc'; x.lineWidth = R * 0.065; x.stroke(); }
    // 紅色破圍巾
    { const sw2 = s.walk ? Math.sin(s.ph) * R * 0.1 : s.hit ? R * 0.12 : 0; part(x, P.fn(q => { q.moveTo(-R * 0.3, -R * 1.72); q.quadraticCurveTo(-R * 0.75, -R * 1.6 + sw2, -R * 0.95, -R * 1.25 + sw2); q.lineTo(-R * 0.82, -R * 1.18 + sw2); q.lineTo(-R * 0.78, -R * 1.32 + sw2); q.lineTo(-R * 0.6, -R * 1.42); q.quadraticCurveTo(-R * 0.4, -R * 1.5, -R * 0.15, -R * 1.52); q.lineTo(R * 0.32, -R * 1.62); q.lineTo(R * 0.25, -R * 1.78); q.closePath(); }), mat('#c8382e'), -R * 0.3, -R * 1.55, R * 0.4, { lw: lw(R) * 0.8 }); }
    // 頭（散架時會滾下來）
    x.save(); x.translate(R * 0.05 + col * R * 1.0, -R * 2.05 + drop(1.75) - (s.hit ? R * 0.08 : 0)); x.rotate((s.hit ? -0.25 : s.walk ? Math.sin(s.ph * 2) * 0.06 : 0) + col * 2.2);
    part(x, P.circ(0, 0, R * 0.45), bone, 0, 0, R * 0.45, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(120,100,70,.6)'; q.lineWidth = R * 0.03; q.beginPath(); q.moveTo(-R * 0.2, -R * 0.38); q.lineTo(-R * 0.1, -R * 0.24); q.lineTo(-R * 0.16, -R * 0.12); q.stroke(); } });
    const jaw = s.sw > 0.1 ? s.sw * R * 0.12 : s.walk ? Math.max(0, Math.sin(s.ph * 2)) * R * 0.04 : s.hit ? R * 0.1 : 0;
    part(x, P.rr(-R * 0.05, R * 0.22 + jaw, R * 0.38, R * 0.2, R * 0.06), bone, R * 0.14, R * 0.3, R * 0.2, { lw: lw(R) * 0.8, post: q => { q.fillStyle = '#2a2040'; for (let i = 0; i < 3; i++) q.fillRect(R * (0.03 + i * 0.1), R * 0.22 + jaw, R * 0.04, R * 0.1); } });
    for (const ex of [-0.04, 0.24]) { Gfx.circ(x, ex * R, -R * 0.02, R * 0.13, '#1a1028'); if (!s.die) glow(x, () => Gfx.circ(x, ex * R + R * 0.02, -R * 0.02, R * 0.05, s.hit ? '#ffffff' : '#ff5a4a'), '#ff4a3a', R * 0.25); }
    part(x, P.poly([R * 0.1, R * 0.12, R * 0.14, R * 0.2, R * 0.18, R * 0.12]), mat('#1a1028'), R * 0.14, R * 0.15, R * 0.05, { flat: true, noLine: true });
    // 生鏽頭盔
    const hp = P.fn(q => { q.arc(0, -R * 0.05, R * 0.49, Math.PI * 1.02, Math.PI * 1.98); q.lineTo(R * 0.58, -R * 0.03); q.lineTo(-R * 0.48, -R * 0.03); q.closePath(); });
    for (const sd of [-1, 1]) part(x, P.fn(q => { q.moveTo(sd * R * 0.3, -R * 0.38); q.quadraticCurveTo(sd * R * 0.65, -R * 0.5, sd * R * 0.62, -R * 0.85); q.quadraticCurveTo(sd * R * 0.48, -R * 0.55, sd * R * 0.18, -R * 0.45); q.closePath(); }), mat('#efe6cf'), sd * R * 0.45, -R * 0.6, R * 0.2, { lw: lw(R) * 0.7 });
    part(x, hp, rust, 0, -R * 0.3, R * 0.45, { lw: lw(R) * 0.9, tex: q => { for (const [rx, ry] of [[-0.25, -0.3], [0.2, -0.38], [0.0, -0.45], [0.35, -0.15]]) { q.fillStyle = 'rgba(200,100,50,.55)'; q.beginPath(); q.arc(rx * R, ry * R, R * 0.06, 0, TAU); q.fill(); } } });
    x.restore();
    // 前手＋劍
    let sa = -0.9 + (s.walk ? g.arm[0] * 0.25 : 0);
    if (s.sw) sa = s.arc(-0.9, -2.4, 0.7);
    if (s.hit) sa = -1.4; if (s.die) sa = -0.9 + col * 2.5;
    x.save(); x.translate(R * 0.28 + col * R * 0.4, -R * 1.55 + drop(1.3)); x.rotate(sa);
    seg(x, 0, 0, R * 0.42, 0, OUT, R * 0.14); seg(x, 0, 0, R * 0.42, 0, '#f2ecdc', R * 0.08);
    part(x, P.poly([R * 0.42, -R * 0.07, R * 1.2, -R * 0.05, R * 1.32, 0, R * 1.2, R * 0.05, R * 0.42, R * 0.07]), mat('#b8ae98', { gloss: 0.6 }), R * 0.85, 0, R * 0.25, { lw: lw(R) * 0.7, tex: q => { q.fillStyle = 'rgba(160,90,50,.6)'; for (let i = 0; i < 3; i++) { q.beginPath(); q.arc(R * (0.65 + i * 0.2), R * 0.05, R * 0.04, 0, TAU); q.fill(); } } });
    part(x, P.rr(R * 0.36, -R * 0.17, R * 0.08, R * 0.34, R * 0.03), mat('#6b4a2a'), R * 0.4, 0, R * 0.1, { lw: lw(R) * 0.5 });
    x.restore();
    x.restore();
  });

  // ───────── 風精靈 ─────────
  def('wisp', { w: 3.8, h: 3.5, ay: 2.2, top: 1.65, vis: 1.4, die: 'bake' }, (x, R, s) => {
    const cloud = mat('#e4f6ff', { sh: 0.4, shc: '#4a7ad8' }), leaf = mat('#8ee8b8', { sh: 0.45 });
    const ph = s.ph, dis = s.die ? E(s.die) : 0;
    const by = -R * 0.3 + (s.walk ? Math.sin(ph) * R * 0.12 : 0);
    let fwd = s.sw > 0 ? s.sw * R * 0.3 : 0, puff = s.sw < 0 ? -s.sw : 0;
    x.save(); x.translate(fwd + (s.hit ? -R * 0.12 : 0), by); x.rotate(s.hit ? -0.25 : 0);
    x.globalAlpha = 1 - dis * 0.6;
    // 風的尾巴
    for (let i = 0; i < 3; i++) { x.strokeStyle = rgba('#ffffff', 0.8 - i * 0.2); x.lineWidth = R * (0.12 - i * 0.025); x.lineCap = 'round'; x.beginPath(); x.ellipse(-R * (0.6 + i * 0.4) - dis * R * 0.5, R * (0.18 + i * 0.12), R * (0.45 - i * 0.08), R * (0.16 - i * 0.03), Math.sin(ph + i) * 0.3, 0.3, Math.PI * 1.6); x.stroke(); }
    // 葉子翅膀
    for (const sd of [-1, 1]) {
      const fl = s.walk ? Math.sin(ph * 2) * 0.45 : s.sw > 0 ? -0.4 : 0.2;
      x.save(); x.translate(-R * 0.15, -R * 0.3); x.rotate(sd * (0.55 + fl) - 0.35 + dis * sd);
      const lp = P.fn(q => { q.moveTo(0, 0); q.quadraticCurveTo(R * 0.45, -R * 0.55, 0, -R * 1.15); q.quadraticCurveTo(-R * 0.45, -R * 0.55, 0, 0); q.closePath(); });
      part(x, lp, sd < 0 ? mat('#5cc48e') : leaf, 0, -R * 0.55, R * 0.4, { lw: lw(R) * 0.8, tex: q => { q.strokeStyle = 'rgba(30,110,70,.6)'; q.lineWidth = R * 0.035; q.beginPath(); q.moveTo(0, 0); q.lineTo(0, -R * 1.05); for (let i = 1; i < 4; i++) { q.moveTo(0, -R * 0.25 * i); q.lineTo(R * 0.15, -R * 0.25 * i - R * 0.15); q.moveTo(0, -R * 0.25 * i); q.lineTo(-R * 0.15, -R * 0.25 * i - R * 0.15); } q.stroke(); } });
      x.restore();
    }
    // 雲朵身體
    const sc = 1 + puff * 0.12 + (s.sw > 0 ? -s.sw * 0.05 : 0);
    const rx = R * 0.66 * sc * (1 + dis * 0.6), ry = R * 0.58 * sc;
    const cpath = P.fn(q => { const n = 9; for (let i = 0; i <= n; i++) { const a = i / n * TAU + 0.2, px = Math.cos(a) * rx, py = Math.sin(a) * ry; if (!i) q.moveTo(px, py); else { const am = (i - 0.5) / n * TAU + 0.2; q.quadraticCurveTo(Math.cos(am) * rx * 1.28, Math.sin(am) * ry * 1.28, px, py); } } q.closePath(); });
    part(x, cpath, cloud, 0, 0, R * 0.62, { lw: lw(R), gloss: 0.5, tex: q => { q.strokeStyle = 'rgba(255,255,255,.75)'; q.lineWidth = R * 0.05; for (let i = 0; i < 2; i++) { q.beginPath(); q.arc(R * 0.05, R * 0.08, R * (0.24 + i * 0.16), ph + i * 2, ph + i * 2 + 2.0); q.stroke(); } } });
    // 頭上的小捲
    seg(x, -R * 0.1, -R * 0.5, -R * 0.05, -R * 0.85, OUT, R * 0.13); x.strokeStyle = '#ffffff'; x.lineWidth = R * 0.07; x.lineCap = 'round'; x.beginPath(); x.moveTo(-R * 0.1, -R * 0.5); x.quadraticCurveTo(R * 0.2, -R * 0.85, -R * 0.05, -R * 0.95); x.stroke();
    const md = s.die ? 'x' : puff > 0.3 ? 'shut' : s.mood;
    eye(x, R * 0.08, -R * 0.05, R * 0.16, { iris: '#2a6ab8', mood: md, look: [0.3, 0.1] }); eye(x, R * 0.38, -R * 0.05, R * 0.15, { iris: '#2a6ab8', mood: md, look: [0.3, 0.1] });
    blush(x, -R * 0.04, R * 0.14, R * 0.1); blush(x, R * 0.5, R * 0.14, R * 0.09);
    if (s.sw > 0.2) mouth(x, R * 0.26, R * 0.18, R * 0.1, 'o', R * 0.16); else if (s.hit) mouth(x, R * 0.24, R * 0.18, R * 0.1, 'wavy'); else if (puff) mouth(x, R * 0.24, R * 0.18, R * 0.08, 'flat'); else mouth(x, R * 0.24, R * 0.14, R * 0.1, 'smile');
    if (s.sw > 0.2) for (let i = 0; i < 3; i++) { x.strokeStyle = rgba('#ffffff', 0.85); x.lineWidth = R * 0.06; x.beginPath(); x.moveTo(R * 0.55, R * (0.05 + i * 0.12)); x.quadraticCurveTo(R * (0.9 + s.sw * 0.3), R * (0.0 + i * 0.12), R * (1.1 + s.sw * 0.4), R * (0.1 + i * 0.12)); x.stroke(); }
    x.restore();
    if (dis > 0.2) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, d = R * (0.5 + dis * 1.1); x.globalAlpha = 1 - dis; Gfx.star(x, Math.cos(a) * d, by + Math.sin(a) * d * 0.7, R * 0.1, '#ffffff', false); x.globalAlpha = 1; }
    x.lineCap = 'butt';
  });

  // ───────── 晶甲蛛 ─────────
  def('crawler', { w: 4.2, h: 3.1, ay: 2.4, top: 1.9, vis: 1.4, die: 'bake' }, (x, R, s) => {
    const body = mat('#4c4670', { sh: 0.5, gloss: 0.4 }), legM = mat('#2e2846'), legF = mat('#211c34');
    const curl = s.die ? E(Math.min(1, s.die / 0.6)) : 0;
    let by = -R * 0.88 + curl * R * 0.45, fwd = 0, rear = 0;
    if (s.walk) by -= Math.abs(Math.sin(s.ph * 2)) * R * 0.04;
    if (s.sw) { rear = s.sw < 0 ? -s.sw : 0; fwd = s.sw > 0 ? s.sw * R * 0.35 : 0; }
    if (s.hit) fwd = -R * 0.12;
    x.save(); x.translate(fwd, 0);
    const legs = (far) => {
      for (let i = 0; i < 4; i++) {
        const hx = -R * 0.1 + i * R * 0.17, ph = s.ph + i * 1.6 + (far ? Math.PI : 0);
        const dir = i < 2 ? -1 : 1, spread = [1.0, 0.55, 0.5, 0.95][i] * (far ? 0.85 : 1);
        const sw = s.walk ? Math.sin(ph) * R * 0.18 : 0, lift = s.walk ? Math.max(0, Math.cos(ph)) * R * 0.12 : 0;
        const up = (i >= 2 ? rear : 0);
        const kx = hx + dir * R * (0.32 + spread * 0.22) + sw * 0.5, ky = by - R * (0.62 + up * 0.5) + curl * R * 0.25;
        let fx = hx + dir * R * (0.75 + spread * 0.45) + sw, fy = -lift - up * R * 0.9;
        if (curl) { fx = fx + (hx - fx) * curl * 0.7; fy = fy + (by - R * 0.2 - fy) * curl * 0.8; }
        const m = far ? legF : legM;
        part(x, P.cap(kx, ky, fx, fy, R * 0.06, R * 0.03), m, (kx + fx) / 2, (ky + fy) / 2, R * 0.2, { lw: lw(R) * 0.6 });
        part(x, P.cap(hx, by + R * 0.05, kx, ky, R * 0.085, R * 0.065), m, (hx + kx) / 2, (by + ky) / 2, R * 0.2, { lw: lw(R) * 0.6 });
      }
    };
    legs(true); legs(false);
    x.save(); x.translate(0, by); x.rotate(-rear * 0.25 + (s.hit ? -0.12 : 0));
    // 腹部＋水晶
    part(x, P.ell(-R * 0.55, -R * 0.12, R * 0.72, R * 0.52, -0.2), body, -R * 0.55, -R * 0.12, R * 0.7, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(160,140,230,.45)'; q.lineWidth = R * 0.05; for (let i = 0; i < 3; i++) { q.beginPath(); q.ellipse(-R * 0.55, R * 0.1, R * (0.3 + i * 0.18), R * (0.25 + i * 0.12), -0.2, Math.PI * 1.1, Math.PI * 1.9); q.stroke(); } } });
    const glowA = 1 - curl * 0.7;
    halo(x, -R * 0.5, -R * 0.75, R * 0.8, '#7fe8ff', 0.35 * glowA);
    crystal(x, -R * 0.88, -R * 0.42, R * 0.15, R * 0.62, '#c49bff', -0.45, R); crystal(x, -R * 0.52, -R * 0.55, R * 0.2, R * 0.9, '#7fe8ff', 0.05, R); crystal(x, -R * 0.18, -R * 0.42, R * 0.13, R * 0.5, '#9ff0ff', 0.45, R);
    // 頭胸部
    part(x, P.ell(R * 0.32, R * 0.05, R * 0.44, R * 0.38), mat('#5a5482', { gloss: 0.6 }), R * 0.32, R * 0.05, R * 0.42, { lw: lw(R) });
    for (const [ex, ey, er] of [[0.36, -0.06, 0.11], [0.6, -0.04, 0.1], [0.46, -0.24, 0.065], [0.66, -0.2, 0.055]]) {
      if (s.hit || curl > 0.3) { seg(x, ex * R - er * R, ey * R, ex * R + er * R, ey * R, '#ff6aa0', R * 0.04); continue; }
      Gfx.circ(x, ex * R, ey * R, er * R, '#1a0a20'); glow(x, () => Gfx.circ(x, ex * R + er * R * 0.15, ey * R - er * R * 0.15, er * R * 0.5, '#ff7ab0'), '#ff4a8a', R * 0.22);
    }
    // 毒牙
    const fo = s.sw > 0 ? s.sw * R * 0.12 : 0;
    for (const sd of [0, 1]) { const fx = R * (0.46 + sd * 0.18), fy = R * 0.3; part(x, P.fn(q => { q.moveTo(fx - R * 0.06, fy - R * 0.05); q.quadraticCurveTo(fx + R * 0.12, fy + R * 0.15 + fo, fx - R * 0.02, fy + R * 0.28 + fo); q.lineTo(fx + R * 0.05, fy - R * 0.05); q.closePath(); }), mat('#ece4f4'), fx, fy + R * 0.1, R * 0.1, { lw: lw(R) * 0.6 }); }
    x.restore();
    x.restore();
  });

  // ───────── 木乃伊 ─────────
  def('mummy', { w: 3.4, h: 3.9, ay: 3.2, top: 2.8, vis: 1.35, die: 'bake' }, (x, R, s) => {
    const wrap = mat('#e8dcc0', { sh: 0.45 }), wrapD = mat('#c4b490', { sh: 0.45 }), gl = '#7dffb0';
    const g = gait(s, R, { amp: 0.3, knee: 0.4 });
    const col = s.die ? E(Math.min(1, s.die / 0.7)) : 0;
    const bands = (cx, cy, w, h, seed) => q => { q.strokeStyle = 'rgba(130,110,80,.55)'; q.lineWidth = R * 0.035; const r = Rig.rng(seed); for (let y = cy - h; y < cy + h; y += R * 0.14) { const t = (r() - 0.5) * R * 0.1; q.beginPath(); q.moveTo(cx - w, y + t); q.lineTo(cx + w, y - t + R * 0.06); q.stroke(); } };
    if (col > 0.5) {
      // 倒成一堆布條
      const q = (col - 0.5) / 0.5;
      part(x, P.blob([-R * 1.0, 0, -R * 0.7, -R * 0.45 * (1.4 - q), 0, -R * 0.6 * (1.4 - q), R * 0.7, -R * 0.4 * (1.4 - q), R * 1.05, 0, 0, R * 0.12]), wrap, 0, -R * 0.25, R * 0.8, { lw: lw(R), tex: bands(0, -R * 0.3, R, R * 0.5, 4) });
      part(x, P.circ(R * 0.55, -R * 0.35 * (1.4 - q), R * 0.32), wrap, R * 0.55, -R * 0.4, R * 0.32, { lw: lw(R), tex: bands(R * 0.55, -R * 0.4, R * 0.4, R * 0.3, 2) });
      return;
    }
    for (const i of [1, 0]) { const [, , fx, fy] = limb2(x, (i ? -R * 0.14 : R * 0.14) + g.fwd, -R * 0.82 - g.bob + col * R * 0.4, g.a[i], -g.k[i], R * 0.42, R * 0.4, R * 0.17, R * 0.15, i ? wrapD : wrap); foot(x, fx, fy, R * 0.32, R * 0.14, i ? wrapD : wrap, R); }
    x.save(); x.translate(g.fwd, -g.bob + col * R * 0.4); x.rotate(g.lean + col * 0.6);
    const reach = s.sw ? (s.sw < 0 ? s.sw * 0.9 : s.sw * 0.4) : 0;
    const armY = -R * 1.55, aw = s.walk ? Math.sin(s.ph) * 0.1 : 0;
    // 後手（往前伸）
    x.save(); x.translate(-R * 0.2, armY); x.rotate(-0.08 + reach * -0.8 + (s.hit ? -0.5 : 0) - aw);
    part(x, P.cap(0, 0, R * 0.85, 0, R * 0.18, R * 0.15), wrapD, R * 0.42, 0, R * 0.25, { lw: lw(R) });
    x.restore();
    const tp = P.rr(-R * 0.52, -R * 1.9, R * 1.04, R * 1.2, R * 0.32);
    part(x, tp, wrap, 0, -R * 1.3, R * 0.6, { lw: lw(R), tex: bands(0, -R * 1.3, R * 0.6, R * 0.62, 7) });
    // 飄動的布條
    const fl = s.walk ? Math.sin(s.ph + 1) * R * 0.08 : 0;
    part(x, P.fn(q => { q.moveTo(-R * 0.4, -R * 1.0); q.quadraticCurveTo(-R * 0.75, -R * 0.65 + fl, -R * 0.85 + fl, -R * 0.28); q.lineTo(-R * 0.68 + fl, -R * 0.3); q.quadraticCurveTo(-R * 0.58, -R * 0.6, -R * 0.3, -R * 0.9); q.closePath(); }), wrapD, -R * 0.6, -R * 0.6, R * 0.25, { lw: lw(R) * 0.6 });
    part(x, P.fn(q => { q.ellipse(0, -R * 1.86, R * 0.5, R * 0.22, 0, 0, Math.PI); q.lineTo(-R * 0.5, -R * 1.86); q.closePath(); }), mat('#f2c14e', { gloss: 0.8 }), 0, -R * 1.78, R * 0.4, { lw: lw(R) * 0.7, tex: q => { q.strokeStyle = '#2a5ac8'; q.lineWidth = R * 0.05; q.beginPath(); q.ellipse(0, -R * 1.86, R * 0.36, R * 0.13, 0, 0.2, Math.PI - 0.2); q.stroke(); } });
    glow(x, () => { x.strokeStyle = 'rgba(125,255,176,.85)'; x.lineWidth = R * 0.03; x.beginPath(); x.moveTo(-R * 0.3, -R * 1.2); x.lineTo(-R * 0.1, -R * 1.15); x.moveTo(R * 0.15, -R * 0.95); x.lineTo(R * 0.38, -R * 0.9); x.stroke(); }, '#7dffb0', R * 0.2);
    // 聖甲蟲護符
    part(x, P.ell(0, -R * 1.42, R * 0.14, R * 0.11), mat('#f2c14e', { gloss: 0.9 }), 0, -R * 1.42, R * 0.14, { lw: lw(R) * 0.6, post: q => Gfx.circ(q, 0, -R * 1.42, R * 0.05, '#2ab8a8') });
    // 頭
    x.save(); x.translate(R * 0.08, -R * 2.18); x.rotate(s.hit ? -0.25 : s.walk ? Math.sin(s.ph) * 0.06 : 0.05);
    part(x, P.circ(0, 0, R * 0.46), wrap, 0, 0, R * 0.46, { lw: lw(R), tex: q => { bands(0, 0, R * 0.5, R * 0.46, 3)(q); q.fillStyle = '#1a1410'; q.fillRect(-R * 0.05, -R * 0.12, R * 0.52, R * 0.18); } });
    part(x, P.rr(-R * 0.46, -R * 0.36, R * 0.94, R * 0.12, R * 0.04), mat('#f2c14e', { gloss: 0.8 }), 0, -R * 0.3, R * 0.3, { lw: lw(R) * 0.6, post: q => { q.fillStyle = '#2ab8a8'; q.beginPath(); q.ellipse(R * 0.25, -R * 0.3, R * 0.07, R * 0.05, 0, 0, TAU); q.fill(); } });
    if (!s.die) for (const ex of [R * 0.12, R * 0.34]) glow(x, () => { Gfx.circ(x, ex, -R * 0.03, R * 0.06, s.hit ? '#ffffff' : gl); }, gl, R * 0.3);
    else for (const ex of [R * 0.12, R * 0.34]) eye(x, ex, -R * 0.03, R * 0.06, { mood: 'x', lc: '#7dffb0' });
    // 鬆掉的頭巾尾
    part(x, P.fn(q => { q.moveTo(-R * 0.35, -R * 0.25); q.quadraticCurveTo(-R * 0.75, -R * 0.2 + fl, -R * 0.85, R * 0.1 + fl); q.lineTo(-R * 0.7, R * 0.12 + fl); q.quadraticCurveTo(-R * 0.6, -R * 0.05, -R * 0.38, -R * 0.08); q.closePath(); }), wrapD, -R * 0.6, -R * 0.05, R * 0.2, { lw: lw(R) * 0.6 });
    x.restore();
    // 前手
    x.save(); x.translate(R * 0.25, armY + R * 0.05); x.rotate(0.02 + reach * -0.9 + (s.hit ? -0.6 : 0) + aw);
    part(x, P.cap(0, 0, R * 0.85, 0, R * 0.18, R * 0.15), wrap, R * 0.42, 0, R * 0.25, { lw: lw(R), tex: bands(R * 0.4, 0, R * 0.5, R * 0.2, 9) });
    if (s.sw > 0.3) for (let i = 0; i < 3; i++) seg(x, R * 0.95, -R * 0.1 + i * R * 0.1, R * 1.15, -R * 0.15 + i * R * 0.12, '#fffbe8', R * 0.05);
    x.restore();
    x.restore();
  });

  // ───────── 鐵螯蟹 ─────────
  def('crab', { w: 4.2, h: 3.1, ay: 2.4, top: 1.8, vis: 1.4, die: 'bake' }, (x, R, s) => {
    const shell = mat('#dc5a3a', { gloss: 0.8, sh: 0.5 }), dk = mat('#a03420'), legM = mat('#b8442c');
    const flip = s.die ? E(Math.min(1, s.die / 0.55)) : 0;
    let by = -R * 0.78, fwd = 0;
    if (s.walk) by -= Math.abs(Math.sin(s.ph * 2)) * R * 0.05;
    if (s.sw > 0) fwd = s.sw * R * 0.2; if (s.hit) fwd = -R * 0.1;
    x.save(); x.translate(fwd, by); x.rotate(flip * Math.PI + (s.hit ? -0.1 : 0)); if (flip) x.translate(0, flip * R * 0.1);
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
      const ph = s.ph * 2 + i * 1.3 + (sd > 0 ? 0 : Math.PI);
      const lift = s.walk ? Math.max(0, Math.sin(ph)) * 0.35 : 0, wig = s.die ? Math.sin(s.die * 28 + i) * 0.3 : 0;
      limb2(x, sd * R * (0.35 + i * 0.16), R * 0.12, sd * -(1.2 - i * 0.1) - sd * lift + wig, sd * 1.4, R * 0.42, R * 0.45, R * 0.1, R * 0.05, sd > 0 ? legM : dk);
    }
    // 殼
    const sp = P.fn(q => { q.moveTo(-R * 0.98, R * 0.15); q.quadraticCurveTo(-R * 1.02, -R * 0.68, 0, -R * 0.74); q.quadraticCurveTo(R * 1.02, -R * 0.68, R * 0.98, R * 0.15); q.quadraticCurveTo(0, R * 0.42, -R * 0.98, R * 0.15); q.closePath(); });
    part(x, sp, shell, 0, -R * 0.2, R * 0.95, { lw: lw(R) * 1.1, tex: q => { q.strokeStyle = 'rgba(120,30,20,.55)'; q.lineWidth = R * 0.05; q.beginPath(); q.moveTo(-R * 0.62, -R * 0.25); q.quadraticCurveTo(0, -R * 0.48, R * 0.62, -R * 0.25); q.stroke(); for (const [sx, sy] of [[-0.5, -0.42], [0, -0.58], [0.5, -0.42], [-0.25, -0.12], [0.3, -0.12]]) { q.fillStyle = '#ffd2b4'; q.beginPath(); q.arc(sx * R, sy * R, R * 0.06, 0, TAU); q.fill(); } for (const [bx, by2, br2] of [[-0.62, -0.22, 0.09], [-0.5, -0.12, 0.06], [0.45, -0.5, 0.07]]) { q.fillStyle = '#efe4cc'; q.beginPath(); q.arc(bx * R, by2 * R, br2 * R, 0, TAU); q.fill(); q.fillStyle = '#5a4a3a'; q.beginPath(); q.arc(bx * R, by2 * R, br2 * R * 0.4, 0, TAU); q.fill(); } for (let i = 0; i < 6; i++) { q.fillStyle = 'rgba(255,240,220,.6)'; q.beginPath(); q.moveTo(-R * 0.9 + i * R * 0.36, R * 0.15); q.lineTo(-R * 0.8 + i * R * 0.36, R * 0.0); q.lineTo(-R * 0.72 + i * R * 0.36, R * 0.15); q.fill(); } } });
    for (let i = 0; i < 5; i++) { const a = Math.PI * (1.2 + i * 0.15), px = Math.cos(a) * R * 0.95, py = -R * 0.2 + Math.sin(a) * R * 0.58; part(x, P.poly([px - R * 0.07, py + R * 0.04, px + Math.cos(a) * R * 0.14, py + Math.sin(a) * R * 0.16, px + R * 0.07, py + R * 0.04]), dk, px, py, R * 0.08, { lw: lw(R) * 0.5 }); }
    // 眼柄
    for (const sd of [0, 1]) { const ex = R * (0.08 + sd * 0.36), ey = -R * 1.08 + (s.walk ? Math.sin(s.ph + sd) * R * 0.04 : 0) - (s.hit ? R * 0.05 : 0); seg(x, ex, -R * 0.55, ex, ey, OUT, R * 0.14); seg(x, ex, -R * 0.55, ex, ey, '#c8503a', R * 0.08); eye(x, ex, ey, R * 0.14, { iris: '#1a1a2a', mood: s.mood === 'n' ? 'angry' : s.mood, look: [0.25, 0.1] }); }
    if (!flip) mouth(x, R * 0.35, -R * 0.02, R * 0.12, s.hit ? 'o' : s.sw > 0.2 ? 'open' : 'frown', R * 0.1);
    // 鉗子
    const cl = s.sw ? (s.sw > 0 ? Math.sin(s.sw * Math.PI) : 0.6 * -s.sw) : s.walk ? (Math.sin(s.ph) + 1) * 0.15 : 0.1;
    for (const [sd, sc] of [[-1, 0.72], [1, 1]]) {
      x.save(); x.translate(sd * R * 0.82, -R * 0.12); x.scale(sd * sc, sc); x.rotate(-0.45 - (sd > 0 && s.sw ? (s.sw > 0 ? s.sw * 0.7 : s.sw * 0.4) : 0) + (s.hit ? 0.4 : 0));
      part(x, P.cap(0, 0, R * 0.35, -R * 0.28, R * 0.14, R * 0.12), dk, R * 0.17, -R * 0.14, R * 0.18, { lw: lw(R) * 0.9 });
      x.translate(R * 0.45, -R * 0.38);
      part(x, P.ell(0, 0, R * 0.36, R * 0.27), shell, 0, 0, R * 0.34, { lw: lw(R) });
      x.save(); x.rotate(-0.25 - cl * 0.55); part(x, P.fn(q => { q.moveTo(R * 0.2, -R * 0.1); q.quadraticCurveTo(R * 0.62, -R * 0.32, R * 0.68, -R * 0.02); q.lineTo(R * 0.24, R * 0.02); q.closePath(); }), shell, R * 0.45, -R * 0.1, R * 0.22, { lw: lw(R) * 0.8 }); x.restore();
      x.save(); x.rotate(0.25 + cl * 0.3); part(x, P.fn(q => { q.moveTo(R * 0.2, R * 0.08); q.quadraticCurveTo(R * 0.55, R * 0.25, R * 0.6, R * 0.04); q.lineTo(R * 0.24, 0); q.closePath(); }), dk, R * 0.4, R * 0.1, R * 0.18, { lw: lw(R) * 0.8 }); x.restore();
      x.restore();
    }
    x.restore();
  });
})();
