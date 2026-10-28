'use strict';
// 守塔奇兵：第三章的新敵人美術——小雪妖、雪怪、發條兵、冰霜巫師、冰晶蛾，以及頭目雪怪王、鋼鐵巨像、永凍冰龍（各形態）。
// 跟其他敵人同一套分部位畫法（四階光影、柔和的本色外框），每隻都有走路／攻擊／受擊／死亡動畫。
(() => {
  const { TAU, mix, rgba } = Gfx;
  const { mat, P, part, eye, mouth, blush, seg, glow, halo } = Rig;
  const { limb2, foot, lw, gait } = Beasts.lib;
  const def = Beasts.def, E = Rig.ease;
  const power = s => Math.max(s.cast, s.sw > 0 ? s.sw : 0);
  const windup = s => s.sw < 0 ? -s.sw : (s.an === 'cast' && s.t < 0.35 ? s.t / 0.35 : 0);

  // ───────── 小雪妖：圓滾滾的雪球、藍色腮紅、頭頂一顆小冰晶、樹枝小手 ─────────
  def('imp', { w: 2.8, h: 2.8, ay: 2.2, top: 1.8, vis: 1.45, die: 'bake' }, (x, R, s) => {
    const snow = mat('#f4f9ff', { sh: 0.5, shc: '#6a8ac8', gloss: 0.3 });
    let lift = 0, sq = 1, lean = 0;
    if (s.walk) { const a = Math.sin(s.ph); lift = Math.max(0, a) * R * 0.32; sq = a < 0 ? 1 + a * 0.15 : 1 + Math.cos(s.ph) * 0.06; lean = Math.cos(s.ph) * 0.12; }
    if (s.hit) { sq = 0.85; lean = -0.2; }
    if (s.sw) lean = s.sw * 0.25;
    const br = s.die ? E(Math.min(1, s.die * 1.3)) : 0;
    x.save(); x.translate(0, -lift); x.rotate(lean);
    if (!br) {
      // 腳
      for (const sd of [-1, 1]) part(x, P.ell(sd * R * 0.3, -R * 0.08, R * 0.2, R * 0.12), mat('#c8daf0'), sd * R * 0.3, -R * 0.08, R * 0.2, { lw: lw(R) * 0.7 });
      // 樹枝手（後）
      seg(x, -R * 0.5, -R * 0.75, -R * 0.95, -R * (0.95 + (s.walk ? Math.sin(s.ph) * 0.15 : 0.1)), '#6a4428', R * 0.07);
      // 身體
      part(x, P.ell(0, -R * 0.68 * sq, R * 0.72 / Math.sqrt(sq), R * 0.66 * sq), snow, 0, -R * 0.68, R * 0.7, { lw: lw(R) * 1.1, tex: q => { q.fillStyle = 'rgba(160,190,230,.35)'; for (const [cx, cy, r] of [[-0.35, -0.4, 0.12], [0.3, -0.95, 0.09], [-0.1, -1.0, 0.07]]) { q.beginPath(); q.arc(cx * R, cy * R, r * R, 0, TAU); q.fill(); } } });
      // 頭頂冰晶
      x.save(); x.translate(R * 0.05, -R * 1.3 * sq); x.rotate(s.walk ? Math.sin(s.ph) * 0.15 : 0);
      part(x, P.poly([-R * 0.12, R * 0.05, -R * 0.08, -R * 0.22, 0, -R * 0.38, R * 0.08, -R * 0.22, R * 0.12, R * 0.05]), mat('#8ae0ff', { gloss: 1 }), 0, -R * 0.15, R * 0.15, { lw: lw(R) * 0.6 });
      x.restore();
      // 臉
      const md = s.mood;
      eye(x, R * 0.08, -R * 0.8, R * 0.15, { iris: '#2a4a8a', mood: md, look: [0.35, 0.1] });
      eye(x, R * 0.42, -R * 0.8, R * 0.13, { iris: '#2a4a8a', mood: md, look: [0.35, 0.1] });
      blush(x, -R * 0.05, -R * 0.58, R * 0.1); blush(x, R * 0.55, -R * 0.58, R * 0.09);
      mouth(x, R * 0.28, -R * 0.5, R * 0.12, s.hit ? 'o' : s.sw > 0.1 ? 'roar' : 'smile', R * 0.12);
      // 樹枝手（前）
      const ha = s.sw ? s.arc(0.2, -1.4, 0.8) : (s.walk ? Math.sin(s.ph + 1) * 0.3 : 0);
      x.save(); x.translate(R * 0.55, -R * 0.75); x.rotate(-0.6 + ha);
      seg(x, 0, 0, R * 0.45, 0, '#7a5232', R * 0.07); seg(x, R * 0.3, 0, R * 0.42, -R * 0.12, '#7a5232', R * 0.05);
      x.restore();
    } else {
      // 碎成雪塊
      for (let i = 0; i < 7; i++) { const an = Math.PI * (1.1 + i * 0.13), d = R * (0.2 + br * 0.9); const cx = Math.cos(an) * d, cy = -R * 0.5 + Math.sin(an) * d * 0.6 + br * br * R * 0.6; part(x, P.circ(cx, Math.min(-R * 0.08, cy), R * (0.22 - i * 0.015) * (1 - br * 0.3)), snow, cx, cy, R * 0.2, { lw: lw(R) * 0.6 }); }
    }
    x.restore();
  });

  // ───────── 雪怪：厚厚白毛、灰藍色的臉、兩支彎角、粗壯手臂 ─────────
  function yetiBody(x, R, s, o) {
    o = o || {};
    const fur = mat(o.fur || '#eef2f8', { sh: 0.5, shc: '#5a6aa8' }), furD = mat(o.furD || '#c8d0e0', { sh: 0.5, shc: '#4a5a98' }), skin = mat(o.skin || '#7a8eb0', { sh: 0.45 }), horn = mat('#e8dcc0', { gloss: 0.5 });
    const g = gait(s, R, { amp: 0.32, knee: 0.5, bob: 1.2 });
    const pw = power(s), wu = windup(s);
    // 腿
    for (const i of [1, 0]) {
      const [, , fx, fy] = limb2(x, (i ? -R * 0.22 : R * 0.22) + g.fwd, -R * 0.8 - g.bob, g.a[i], -g.k[i], R * 0.42, R * 0.4, R * 0.26, R * 0.2, i ? furD : fur);
      part(x, P.ell(fx + R * 0.1, fy - R * 0.06, R * 0.28, R * 0.12), skin, fx, fy, R * 0.25, { lw: lw(R) * 0.8 });
    }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean * 0.6 + (s.hit ? -0.12 : 0));
    // 後手
    const armA = i => { if (o.cast && wu) return i ? -0.4 : -2.2 * wu; if (s.sw) return i ? 0.2 : s.arc(0.3, -2.4, 0.6); if (s.hit) return 0.6; if (s.die) return 0.3 + s.die * 0.4; return s.walk ? 0.3 + g.arm[i] * 0.5 : 0.25 + (s.an === 'idle' ? s.br * 0.08 : 0); };
    const arm = i => {
      x.save(); x.translate(R * (0.72 - i * 1.05), -R * (1.55 + i * 0.3)); x.rotate(i ? -armA(i) : -armA(i) * 0.6 + 0.12);
      part(x, P.cap(0, 0, R * 0.1, R * 1.15, R * 0.34, R * 0.3), i ? furD : fur, R * 0.05, R * 0.55, R * 0.34, { lw: lw(R), tex: q => Rig.fur(q, R * 0.05, R * 0.55, R * 0.45, R * 0.95, 7, 'rgba(90,110,170,.35)', R * 0.14, 1.9, R * 0.03, 21 + i) });
      part(x, P.ell(R * 0.12, R * 1.3, R * 0.3, R * 0.24), skin, R * 0.12, R * 1.3, R * 0.28, { lw: lw(R) * 0.8, tex: q => { q.fillStyle = '#e8e0d0'; for (let k = 0; k < 3; k++) { q.beginPath(); q.moveTo(R * (0.0 + k * 0.1), R * 1.5); q.lineTo(R * (0.04 + k * 0.1), R * 1.62); q.lineTo(R * (0.08 + k * 0.1), R * 1.5); q.fill(); } } });
      if (o.ball && i === 0 && o.cast && wu > 0.2) { const br = R * 0.75; part(x, P.circ(R * 0.1, R * 1.75, br), mat('#ffffff', { sh: 0.45, shc: '#6a8ac8' }), R * 0.1, R * 1.75, br, { lw: lw(R) }); }
      x.restore();
    };
    arm(1);
    // 身體（一大團毛，肚子是灰藍色的皮）
    const body = P.blob([-R * 0.75, -R * 0.75, -R * 0.85, -R * 1.6, -R * 0.4, -R * 2.2, R * 0.35, -R * 2.25, R * 0.85, -R * 1.7, R * 0.8, -R * 0.8, R * 0.3, -R * 0.55, -R * 0.35, -R * 0.55]);
    part(x, body, fur, 0, -R * 1.4, R * 0.9, { lw: lw(R) * 1.1, tex: q => { Rig.fur(q, 0, -R * 1.4, R * 1.5, R * 1.5, 26, 'rgba(90,110,170,.32)', R * 0.16, 2.2, R * 0.035, 9); q.fillStyle = 'rgba(122,142,176,.55)'; q.beginPath(); q.ellipse(R * 0.25, -R * 1.15, R * 0.38, R * 0.48, 0.2, 0, TAU); q.fill(); if (o.armor) { q.fillStyle = 'rgba(160,220,255,.85)'; for (const [cx, cy] of [[-0.55, -1.85], [0.55, -1.9]]) { q.beginPath(); q.moveTo(cx * R - R * 0.3, cy * R + R * 0.1); q.lineTo(cx * R - R * 0.1, cy * R - R * 0.35); q.lineTo(cx * R + R * 0.25, cy * R - R * 0.15); q.lineTo(cx * R + R * 0.3, cy * R + R * 0.15); q.closePath(); q.fill(); } } } });
    arm(0);
    // 頭
    x.save(); x.translate(R * 0.42, -R * 2.2); x.rotate(s.hit ? -0.25 : pw > 0.2 ? -0.15 : s.die ? 0.3 : 0);
    for (const sd of [-1, 1]) part(x, P.fn(q => { q.moveTo(sd * R * 0.25, -R * 0.25); q.quadraticCurveTo(sd * R * 0.75, -R * 0.45, sd * R * 0.62, -R * 0.95); q.quadraticCurveTo(sd * R * 0.5, -R * 0.55, sd * R * 0.12, -R * 0.38); q.closePath(); }), horn, sd * R * 0.45, -R * 0.55, R * 0.25, { lw: lw(R) * 0.7, tex: q => { q.strokeStyle = 'rgba(140,120,90,.5)'; q.lineWidth = R * 0.03; for (let k = 1; k < 4; k++) { q.beginPath(); q.moveTo(sd * R * (0.25 + k * 0.1), -R * (0.3 + k * 0.1)); q.lineTo(sd * R * (0.32 + k * 0.1), -R * (0.42 + k * 0.1)); q.stroke(); } } });
    part(x, P.circ(0, 0, R * 0.48), fur, 0, 0, R * 0.48, { lw: lw(R), tex: q => Rig.fur(q, 0, -R * 0.1, R * 0.8, R * 0.6, 10, 'rgba(90,110,170,.3)', R * 0.12, 2, R * 0.03, 3) });
    part(x, P.ell(R * 0.15, R * 0.08, R * 0.34, R * 0.3), skin, R * 0.15, R * 0.08, R * 0.32, { lw: lw(R) * 0.8 });
    if (o.crown) for (let i = -2; i <= 2; i++) part(x, P.poly([i * R * 0.13 - R * 0.06, -R * 0.4, i * R * 0.15, -R * (0.75 + (2 - Math.abs(i)) * 0.1), i * R * 0.13 + R * 0.06, -R * 0.42]), mat('#9fe6ff', { gloss: 1 }), i * R * 0.13, -R * 0.55, R * 0.1, { lw: lw(R) * 0.5 });
    const md = s.hit ? 'shut' : s.die ? 'x' : 'angry';
    eye(x, R * 0.02, -R * 0.02, R * 0.11, { iris: o.eye || '#3a6ad8', mood: md, look: [0.35, 0.1] });
    eye(x, R * 0.3, -R * 0.02, R * 0.1, { iris: o.eye || '#3a6ad8', mood: md, look: [0.35, 0.1] });
    mouth(x, R * 0.2, R * 0.22, R * 0.2, pw > 0.15 || s.hit || s.sw > 0.1 ? 'roar' : 'frown', R * (0.06 + Math.max(pw, s.sw > 0 ? s.sw : 0) * 0.2));
    if (!s.die) for (const tx of [R * 0.08, R * 0.32]) part(x, P.poly([tx - R * 0.04, R * 0.16, tx, R * 0.3, tx + R * 0.04, R * 0.16]), mat('#ffffff'), tx, R * 0.22, R * 0.04, { lw: lw(R) * 0.4 });
    x.restore();
    x.restore();
    if (pw > 0.3 && o.cast) { x.save(); x.globalAlpha = pw * 0.7; for (let i = 0; i < 6; i++) { const a = i * 1.05 + s.t * 5; Gfx.circ(x, Math.cos(a) * R * 1.2, -R * 1.6 + Math.sin(a) * R * 0.8, R * 0.08, '#ffffff'); } x.restore(); }
  }
  def('yeti', { w: 4.0, h: 4.4, ay: 3.6, top: 3.2, vis: 1.25, die: 'fall' }, (x, R, s) => yetiBody(x, R, s, {}));
  def('bossYeti', { w: 5.2, h: 5.0, ay: 4.1, top: 3.7, vis: 1.15, die: 'bake', boss: true }, (x, R, s) => { const sink = s.die ? E(s.die) : 0; x.save(); x.translate(0, sink * R * 0.6); x.rotate(-sink * 0.3); yetiBody(x, R, s, { crown: true, ball: true, cast: true, fur: '#f6f8ff', furD: '#d0d8ea', skin: '#6a7ea8' }); x.restore(); });
  def('bossYeti2', { w: 5.2, h: 5.0, ay: 4.1, top: 3.7, vis: 1.15, die: 'bake', boss: true }, (x, R, s) => { const sink = s.die ? E(s.die) : 0; x.save(); x.translate(0, sink * R * 0.6); x.rotate(-sink * 0.3); yetiBody(x, R, s, { crown: true, armor: true, cast: true, fur: '#e8eef8', furD: '#c0c8dc', skin: '#7a6a98', eye: '#ff3a4a' }); if (!s.die) halo(x, 0, -R * 1.5, R * 2, '#bfeaff', 0.18 + power(s) * 0.3); x.restore(); });

  // ───────── 發條兵：黃銅圓桶身體、背後的發條鑰匙、單眼護目鏡、活塞腿、鐵鎚手 ─────────
  def('clock', { w: 3.8, h: 4.0, ay: 3.25, top: 2.9, vis: 1.3, die: 'bake' }, (x, R, s) => {
    const brass = mat('#d8a84a', { gloss: 1, sh: 0.45 }), brassD = mat('#a87a2e', { gloss: 0.8 }), iron = mat('#7a828e', { gloss: 0.9 }), dark = mat('#3a3a42', { gloss: 0.5 });
    const g = gait(s, R, { amp: 0.28, knee: 0.4, bob: 0.8 });
    const fall = s.die ? E(Math.min(1, s.die * 1.2)) : 0;
    // 死亡：零件散開
    if (fall) {
      for (let i = 0; i < 6; i++) { const an = Math.PI * (1.05 + i * 0.16), d = R * (0.3 + fall * 1.1), cx = Math.cos(an) * d, cy = -R * 0.6 + Math.sin(an) * d * 0.5 + fall * fall * R * 0.5; x.save(); x.translate(cx, Math.min(-R * 0.1, cy)); x.rotate(fall * (i - 2.5)); gear(x, R * (0.18 + (i % 3) * 0.05), i % 2 ? brass : iron, R); x.restore(); }
      x.save(); x.translate(R * 0.3 * fall, -R * 0.4 + fall * R * 0.2); x.rotate(fall * 1.3); part(x, P.rr(-R * 0.45, -R * 0.55, R * 0.9, R * 0.9, R * 0.2), brassD, 0, -R * 0.1, R * 0.5, { lw: lw(R) }); x.restore();
      return;
    }
    // 活塞腿
    for (const i of [1, 0]) {
      const [, , fx, fy] = limb2(x, (i ? -R * 0.2 : R * 0.2) + g.fwd, -R * 0.85 - g.bob, g.a[i], -g.k[i], R * 0.42, R * 0.42, R * 0.13, R * 0.11, i ? dark : iron);
      foot(x, fx, fy, R * 0.42, R * 0.17, i ? brassD : brass, R);
    }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean * 0.5 + (s.hit ? -0.1 : 0));
    // 發條鑰匙（一直轉）
    const ka = (s.walk ? s.ph * 2 : s.t * 6) % TAU;
    x.save(); x.translate(-R * 0.62, -R * 1.5); x.scale(Math.cos(ka), 1);
    seg(x, 0, 0, -R * 0.25, 0, '#8a6a2a', R * 0.08);
    for (const sd of [-1, 1]) part(x, P.ell(-R * 0.35, sd * R * 0.18, R * 0.13, R * 0.2), brass, -R * 0.35, sd * R * 0.18, R * 0.18, { lw: lw(R) * 0.6 });
    x.restore();
    // 身體（圓桶＋鉚釘＋玻璃窗裡的齒輪）
    part(x, P.rr(-R * 0.6, -R * 2.05, R * 1.2, R * 1.25, R * 0.3), brass, 0, -R * 1.42, R * 0.65, { lw: lw(R), tex: q => {
      q.fillStyle = 'rgba(120,80,20,.4)'; q.fillRect(-R * 0.6, -R * 1.62, R * 1.2, R * 0.07); q.fillRect(-R * 0.6, -R * 1.12, R * 1.2, R * 0.07);
      for (let i = 0; i < 6; i++) Gfx.circ(q, -R * 0.48 + i * R * 0.19, -R * 1.58, R * 0.03, '#fff0c0');
      Gfx.circ(q, R * 0.18, -R * 1.35, R * 0.24, '#2a2a30'); q.save(); q.translate(R * 0.18, -R * 1.35); q.rotate(ka); for (let k = 0; k < 8; k++) { q.rotate(TAU / 8); q.fillStyle = '#c89a3a'; q.fillRect(R * 0.1, -R * 0.03, R * 0.08, R * 0.06); } Gfx.circ(q, 0, 0, R * 0.11, '#d8a84a'); q.restore();
      q.strokeStyle = 'rgba(255,255,255,.6)'; q.lineWidth = R * 0.03; q.beginPath(); q.arc(R * 0.18, -R * 1.35, R * 0.2, 3.6, 4.6); q.stroke();
    } });
    // 頭盔（單眼護目鏡）
    x.save(); x.translate(R * 0.08, -R * 2.3); x.rotate(s.hit ? -0.2 : 0);
    part(x, P.fn(q => { q.moveTo(-R * 0.45, R * 0.25); q.lineTo(-R * 0.45, -R * 0.1); q.quadraticCurveTo(0, -R * 0.55, R * 0.45, -R * 0.1); q.lineTo(R * 0.45, R * 0.25); q.closePath(); }), iron, 0, 0, R * 0.45, { lw: lw(R), tex: q => { for (let i = 0; i < 5; i++) Gfx.circ(q, -R * 0.36 + i * R * 0.18, R * 0.18, R * 0.025, '#c8ccd4'); } });
    seg(x, 0, -R * 0.38, 0, -R * 0.62, '#7a828e', R * 0.05); Gfx.circ(x, 0, -R * 0.65, R * 0.06, s.hit ? '#ffffff' : '#ff6a3a');
    part(x, P.circ(R * 0.2, -R * 0.02, R * 0.17), brassD, R * 0.2, -R * 0.02, R * 0.17, { lw: lw(R) * 0.7 });
    glow(x, () => Gfx.circ(x, R * 0.22, -R * 0.02, R * 0.1, s.hit ? '#ffffff' : '#ffcf5a'), '#ffb03a', R * 0.35);
    x.restore();
    // 前手：鐵鎚
    let hA = s.walk ? -0.3 + g.arm[0] * 0.3 : -0.4;
    if (s.sw) hA = s.arc(-0.4, -2.3, 0.7); if (s.hit) hA = -1.1;
    x.save(); x.translate(R * 0.55, -R * 1.75); x.rotate(hA + Math.PI / 2);
    part(x, P.cap(0, 0, R * 0.55, 0, R * 0.12, R * 0.1), iron, R * 0.27, 0, R * 0.14, { lw: lw(R) * 0.7 });
    part(x, P.rr(R * 0.5, -R * 0.05, R * 0.5, R * 0.1, R * 0.03), mat('#6a4428'), R * 0.75, 0, R * 0.1, { lw: lw(R) * 0.5 });
    part(x, P.rr(R * 0.9, -R * 0.24, R * 0.26, R * 0.48, R * 0.06), dark, R * 1.03, 0, R * 0.25, { lw: lw(R) * 0.7, tex: q => { q.fillStyle = '#9aa2ae'; q.fillRect(R * 0.92, -R * 0.22, R * 0.06, R * 0.44); } });
    x.restore();
    x.restore();
  });
  function gear(x, r, m, R) {
    const p = P.fn(q => { for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rr = i % 2 ? r : r * 1.25; q.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } q.closePath(); });
    part(x, p, m, 0, 0, r, { lw: lw(R) * 0.5, tex: q => Gfx.circ(q, 0, 0, r * 0.35, '#3a3a42') });
  }

  // ───────── 冰霜巫師：冰藍長袍＋白毛滾邊、尖兜帽、冰晶法杖 ─────────
  def('frostmage', { w: 3.6, h: 4.4, ay: 3.6, top: 3.3, vis: 1.32, die: 'fall', cast: true }, (x, R, s) => {
    const robe = mat('#4a8ad8', { sh: 0.5, rimc: '#cff4ff', rima: 0.8 }), robeD = mat('#2e5a9a'), furT = mat('#f4f8ff', { sh: 0.4 }), skin = mat('#d8e4f2', { sh: 0.4 }), ice = mat('#bff0ff', { gloss: 1 });
    const g = gait(s, R, { amp: 0.35 });
    const cast = s.cast;
    for (const i of [1, 0]) { const fx = Math.sin(g.a[i]) * R * 0.3 + (i ? -R * 0.12 : R * 0.12); foot(x, fx, s.walk ? -Math.max(0, -Math.sin(s.ph + i * Math.PI)) * R * 0.08 : 0, R * 0.3, R * 0.13, mat(i ? '#2a3e6a' : '#3a5280'), R); }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean);
    // 法杖（後手）
    const stA = cast ? -0.3 * cast : s.sw ? s.arc(0, -0.6, 0.4) : (s.walk ? Math.sin(s.ph) * 0.06 : 0) + (s.hit ? 0.3 : 0) + (s.die ? 0.8 * s.die : 0);
    x.save(); x.translate(R * 0.55, -R * 0.15 - cast * R * 0.4); x.rotate(-stA);
    part(x, P.rr(-R * 0.05, -R * 2.6, R * 0.1, R * 2.65, R * 0.04), mat('#8ab0d8', { gloss: 0.6 }), 0, -R * 1.3, R * 0.15, { lw: lw(R) * 0.6 });
    x.save(); x.translate(0, -R * 2.85);
    for (const [a, l] of [[-0.5, 0.42], [0, 0.55], [0.5, 0.42]]) part(x, P.poly([-R * 0.08, 0, Math.sin(a) * R * l - R * 0.04, -Math.cos(a) * R * l, Math.sin(a) * R * l + R * 0.04, -Math.cos(a) * R * l + R * 0.02, R * 0.08, 0]), ice, Math.sin(a) * R * l * 0.5, -R * 0.2, R * 0.2, { lw: lw(R) * 0.6 });
    halo(x, 0, -R * 0.2, R * (0.5 + cast * 0.6), '#9fe6ff', 0.4 + cast * 0.5);
    x.restore();
    x.restore();
    // 長袍
    const sk = s.walk ? Math.sin(s.ph) * R * 0.08 : 0;
    part(x, P.fn(q => { q.moveTo(-R * 0.62 - sk, -R * 0.06); q.quadraticCurveTo(-R * 0.5, -R * 1.1, -R * 0.32, -R * 1.65); q.lineTo(R * 0.32, -R * 1.65); q.quadraticCurveTo(R * 0.5, -R * 1.1, R * 0.62 + sk, -R * 0.06); q.closePath(); }), robe, 0, -R * 0.85, R * 0.65, { lw: lw(R), tex: q => { q.fillStyle = '#f4f8ff'; q.fillRect(-R * 0.65, -R * 0.2, R * 1.3, R * 0.14); q.strokeStyle = 'rgba(200,240,255,.7)'; q.lineWidth = R * 0.04; q.beginPath(); q.moveTo(0, -R * 1.6); q.lineTo(0, -R * 0.2); q.stroke(); for (let i = 0; i < 3; i++) Gfx.star(q, 0, -R * (1.35 - i * 0.35), R * 0.07, '#dff6ff', false); } });
    part(x, P.ell(0, -R * 1.62, R * 0.45, R * 0.15), furT, 0, -R * 1.62, R * 0.42, { lw: lw(R) * 0.8 });
    // 頭＋尖兜帽
    x.save(); x.translate(R * 0.05, -R * 1.98); x.rotate(s.hit ? -0.2 : cast ? -0.12 : s.die ? -0.3 : 0);
    part(x, P.fn(q => { q.moveTo(-R * 0.42, R * 0.25); q.quadraticCurveTo(-R * 0.5, -R * 0.4, -R * 0.1, -R * 0.55); q.quadraticCurveTo(-R * 0.35, -R * 1.0, -R * 0.65, -R * 1.15); q.quadraticCurveTo(-R * 0.05, -R * 1.05, R * 0.25, -R * 0.55); q.quadraticCurveTo(R * 0.52, -R * 0.3, R * 0.45, R * 0.25); q.closePath(); }), robeD, -R * 0.05, -R * 0.4, R * 0.55, { lw: lw(R) });
    part(x, P.circ(R * 0.06, -R * 0.02, R * 0.3), skin, R * 0.06, -R * 0.02, R * 0.3, { lw: lw(R) * 0.8 });
    // 白鬍子
    part(x, P.fn(q => { q.moveTo(-R * 0.15, R * 0.08); q.quadraticCurveTo(R * 0.05, R * 0.6, R * 0.12, R * 0.62); q.quadraticCurveTo(R * 0.25, R * 0.4, R * 0.35, R * 0.06); q.closePath(); }), furT, R * 0.1, R * 0.3, R * 0.25, { lw: lw(R) * 0.6 });
    const ec = cast > 0.2 ? '#ffffff' : '#7fd8ff';
    glow(x, () => { Gfx.circ(x, R * 0.0, -R * 0.08, R * 0.05, ec); Gfx.circ(x, R * 0.2, -R * 0.08, R * 0.045, ec); }, '#7fd8ff', R * 0.3);
    if (s.die) eye(x, R * 0.1, -R * 0.08, R * 0.08, { mood: 'x' });
    x.restore();
    // 前手
    const hx = R * 0.55 + Math.sin(stA) * R * 0.9, hy = -R * 1.05 - cast * R * 0.4;
    part(x, P.cap(R * 0.1, -R * 1.45, hx - R * 0.05, hy, R * 0.12, R * 0.1), robe, (hx + R * 0.1) / 2, hy, R * 0.2, { lw: lw(R) * 0.7 });
    part(x, P.circ(hx, hy, R * 0.09), skin, hx, hy, R * 0.09, { lw: lw(R) * 0.5 });
    if (cast > 0.4) for (let i = 0; i < 5; i++) { const a = i * 1.26 + s.t * 7; Gfx.star(x, R * 0.55 + Math.cos(a) * R * 0.7, -R * 3.0 - cast * R * 0.4 + Math.sin(a) * R * 0.4, R * 0.1, '#e8fbff', false); }
    x.restore();
  });

  // ───────── 冰晶蛾：透明的冰晶翅膀＋白色毛茸茸的身體、羽狀觸角 ─────────
  def('moth', { w: 4.4, h: 3.4, ay: 2.1, top: 1.7, vis: 1.38, die: 'fly' }, (x, R, s) => {
    const fluff = mat('#f4f8ff', { sh: 0.5, shc: '#7a8ac8' });
    const fl = s.walk ? Math.sin(s.ph) : s.hit ? -0.7 : s.die ? 0.4 - s.die : s.sw ? -s.sw * 0.6 : 0.3;
    const bob = s.walk ? -Math.cos(s.ph) * R * 0.1 : 0;
    x.save(); x.translate(0, bob); x.rotate(s.hit ? -0.2 : 0);
    const wing = (far) => {
      x.save(); x.translate(-R * 0.05, -R * 0.55); x.scale(1, far ? 0.75 : 1); x.rotate(-0.5 - fl * 0.8 - (far ? 0.3 : 0));
      const w = P.fn(q => { q.moveTo(0, 0); q.quadraticCurveTo(-R * 0.3, -R * 1.1, -R * 1.1, -R * 1.0); q.quadraticCurveTo(-R * 1.45, -R * 0.55, -R * 1.0, -R * 0.15); q.quadraticCurveTo(-R * 1.25, R * 0.25, -R * 0.75, R * 0.45); q.quadraticCurveTo(-R * 0.3, R * 0.4, 0, R * 0.05); q.closePath(); });
      x.globalAlpha = far ? 0.75 : 0.88;
      part(x, w, mat(far ? '#8ad0f0' : '#bff0ff', { gloss: 1, sh: 0.35, shc: '#4a7ac8' }), -R * 0.6, -R * 0.3, R * 0.7, { lw: lw(R) * 0.8, tex: q => { q.strokeStyle = 'rgba(255,255,255,.85)'; q.lineWidth = R * 0.03; for (const [ex, ey] of [[-1.05, -0.95], [-1.25, -0.5], [-1.0, -0.15], [-0.8, 0.38]]) { q.beginPath(); q.moveTo(0, 0); q.quadraticCurveTo(ex * R * 0.5, ey * R * 0.5 - R * 0.1, ex * R, ey * R); q.stroke(); } Gfx.circ(q, -R * 0.75, -R * 0.55, R * 0.12, 'rgba(120,90,220,.6)'); Gfx.circ(q, -R * 0.75, -R * 0.55, R * 0.06, 'rgba(255,255,255,.9)'); } });
      x.globalAlpha = 1;
      x.restore();
    };
    wing(true);
    // 身體（毛茸茸的三節）
    part(x, P.ell(-R * 0.35, -R * 0.42, R * 0.38, R * 0.22, 0.25), fluff, -R * 0.35, -R * 0.42, R * 0.35, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(140,160,210,.5)'; q.lineWidth = R * 0.03; for (let i = 0; i < 3; i++) { q.beginPath(); q.arc(-R * (0.2 + i * 0.15), -R * 0.42, R * 0.2, 1.2, 2.0); q.stroke(); } } });
    part(x, P.circ(R * 0.05, -R * 0.55, R * 0.24), fluff, R * 0.05, -R * 0.55, R * 0.24, { lw: lw(R), tex: q => Rig.fur(q, R * 0.05, -R * 0.55, R * 0.4, R * 0.35, 8, 'rgba(140,160,210,.5)', R * 0.09, 2, R * 0.025, 5) });
    x.save(); x.translate(R * 0.32, -R * 0.68);
    part(x, P.circ(0, 0, R * 0.19), fluff, 0, 0, R * 0.19, { lw: lw(R) });
    // 觸角
    for (const sd of [-1, 1]) { seg(x, R * 0.05, -R * 0.12, R * (0.2 + sd * 0.08), -R * 0.5, '#b8c8e8', R * 0.03); for (let k = 0; k < 4; k++) seg(x, R * (0.08 + k * 0.04 + sd * 0.02), -R * (0.2 + k * 0.08), R * (0.16 + k * 0.04 + sd * 0.06), -R * (0.16 + k * 0.08), '#dfe8ff', R * 0.02); }
    if (s.die) eye(x, R * 0.07, -R * 0.02, R * 0.08, { mood: 'x' });
    else { glow(x, () => { Gfx.circ(x, R * 0.08, -R * 0.02, R * 0.07, '#5a3ad8'); Gfx.circ(x, R * 0.06, -R * 0.04, R * 0.025, '#ffffff'); }, '#9a8aff', R * 0.2); }
    x.restore();
    wing(false);
    if (!s.die && s.walk && (Math.floor(s.ph * 1.3) % 2 === 0)) Gfx.star(x, -R * 1.0, -R * 0.1, R * 0.07, '#ffffff', false);
    x.restore();
  });

  // ───────── 鋼鐵巨像：矮人鑄造的鐵巨人、胸口熔爐、肩上大砲；第二形態過熱（鐵甲脫落、全身發紅、冒蒸汽） ─────────
  function colossus(x, R, s, hot) {
    const iron = mat(hot ? '#6a4a44' : '#7a8290', { gloss: 0.8, sh: 0.5, rimc: hot ? '#ff8a5a' : '#cfd8e8', rima: 0.7 }), ironD = mat(hot ? '#4a302c' : '#565e6a', { gloss: 0.6 }), brass = mat('#c8963a', { gloss: 0.9 }), dark = mat('#2a2a30');
    const pw = power(s), wu = windup(s);
    const g = gait(s, R, { amp: 0.25, knee: 0.4, bob: 1.0 });
    const sink = s.die ? E(Math.min(1, s.die / 0.8)) : 0;
    x.save(); x.translate(0, sink * R * 0.5); x.rotate(-sink * 0.15);
    // 腿（粗短的鐵柱）
    for (const i of [1, 0]) {
      const [, , fx, fy] = limb2(x, (i ? -R * 0.4 : R * 0.4) + g.fwd, -R * 1.05 - g.bob, g.a[i], -g.k[i], R * 0.55, R * 0.5, R * 0.3, R * 0.26, i ? ironD : iron);
      part(x, P.rr(fx - R * 0.35, fy - R * 0.25, R * 0.75, R * 0.28, R * 0.08), i ? dark : ironD, fx, fy - R * 0.1, R * 0.35, { lw: lw(R) * 0.8 });
    }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean * 0.4 - (s.hit ? 0.08 : 0));
    // 後手臂
    const armA = i => { if (s.sw) return i ? 0.2 : s.arc(0.3, -1.6, 0.5); if (s.hit) return 0.5; if (s.die) return 0.3 + s.die; return s.walk ? 0.25 + g.arm[i] * 0.35 : 0.2 + (s.an === 'idle' ? s.br * 0.05 : 0); };
    const arm = i => {
      x.save(); x.translate(R * (0.75 - i * 1.5), -R * 2.35); x.rotate(-armA(i));
      part(x, P.circ(0, 0, R * 0.42), i ? ironD : iron, 0, 0, R * 0.42, { lw: lw(R), tex: q => { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; Gfx.circ(q, Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3, R * 0.04, '#c8ccd4'); } } });
      part(x, P.cap(0, R * 0.2, 0, R * 1.2, R * 0.3, R * 0.28), i ? ironD : iron, 0, R * 0.7, R * 0.3, { lw: lw(R) });
      part(x, P.rr(-R * 0.36, R * 1.15, R * 0.72, R * 0.55, R * 0.15), i ? dark : ironD, 0, R * 1.42, R * 0.36, { lw: lw(R) * 0.9, tex: q => { q.fillStyle = '#c8963a'; q.fillRect(-R * 0.36, R * 1.2, R * 0.72, R * 0.07); } });
      x.restore();
    };
    arm(1);
    // 軀幹（梯形鐵甲＋熔爐胸口）
    const torso = P.fn(q => { q.moveTo(-R * 0.95, -R * 2.8); q.lineTo(R * 0.95, -R * 2.8); q.lineTo(R * 0.75, -R * 1.1); q.lineTo(-R * 0.75, -R * 1.1); q.closePath(); });
    part(x, torso, iron, 0, -R * 1.95, R * 0.95, { lw: lw(R) * 1.2, tex: q => {
      q.strokeStyle = 'rgba(20,20,30,.4)'; q.lineWidth = R * 0.04; q.beginPath(); q.moveTo(-R * 0.9, -R * 2.3); q.lineTo(R * 0.9, -R * 2.3); q.moveTo(-R * 0.8, -R * 1.5); q.lineTo(R * 0.8, -R * 1.5); q.stroke();
      for (let i = 0; i < 7; i++) Gfx.circ(q, -R * 0.78 + i * R * 0.26, -R * 2.72, R * 0.035, '#d8dce4');
      // 矮人符文
      q.strokeStyle = hot ? 'rgba(255,170,90,.9)' : 'rgba(120,220,255,.85)'; q.lineWidth = R * 0.04;
      for (const sx of [-0.62, 0.62]) { q.beginPath(); q.moveTo(sx * R - R * 0.08, -R * 2.6); q.lineTo(sx * R, -R * 2.45); q.lineTo(sx * R + R * 0.08, -R * 2.6); q.moveTo(sx * R, -R * 2.45); q.lineTo(sx * R, -R * 2.35); q.stroke(); }
      if (hot) { q.fillStyle = 'rgba(255,90,40,.35)'; q.fillRect(-R, -R * 2.85, R * 2, R * 1.8); q.strokeStyle = 'rgba(255,200,120,.9)'; q.lineWidth = R * 0.05; for (const [x0, y0, x1, y1] of [[-0.6, -2.2, -0.3, -1.7], [0.5, -2.6, 0.3, -2.0], [0.2, -1.6, 0.55, -1.25]]) { q.beginPath(); q.moveTo(x0 * R, y0 * R); q.lineTo(x1 * R, y1 * R); q.stroke(); } }
    } });
    // 熔爐口
    part(x, P.rr(-R * 0.36, -R * 2.15, R * 0.72, R * 0.62, R * 0.12), dark, 0, -R * 1.85, R * 0.36, { lw: lw(R) * 0.8 });
    const fire = 0.7 + pw * 0.3 + (hot ? 0.3 : 0);
    glow(x, () => { x.fillStyle = hot ? '#ffe08a' : '#ff9a3a'; x.fillRect(-R * 0.28, -R * 2.05, R * 0.56, R * 0.45); for (let i = 0; i < 4; i++) { x.fillStyle = '#2a2a30'; x.fillRect(-R * 0.28 + i * R * 0.17, -R * 2.05, R * 0.04, R * 0.45); } }, '#ff7a2a', R * (0.6 + fire * 0.4));
    // 肩上大砲（後座力：放招時往後縮）
    x.save(); x.translate(-R * 0.55, -R * 3.0); x.rotate(-0.55 - wu * 0.2 + (s.an === 'cast' && s.t > 0.4 ? 0.15 : 0));
    part(x, P.rr(-R * 0.25, -R * 0.22, R * 1.3, R * 0.44, R * 0.15), ironD, R * 0.4, 0, R * 0.5, { lw: lw(R), tex: q => { q.fillStyle = '#c8963a'; q.fillRect(R * 0.2, -R * 0.22, R * 0.08, R * 0.44); q.fillRect(R * 0.75, -R * 0.22, R * 0.08, R * 0.44); } });
    Gfx.circ(x, R * 1.05, 0, R * 0.16, '#141418');
    if (pw > 0.4) glow(x, () => Gfx.circ(x, R * 1.12, 0, R * 0.18 * pw, '#ffd36b'), '#ff9a3a', R * 0.8 * pw);
    x.restore();
    // 頭（小小的、深陷在肩膀間，一條發光的眼縫）
    x.save(); x.translate(R * 0.15, -R * 3.0); x.rotate(s.hit ? -0.15 : 0);
    part(x, P.fn(q => { q.moveTo(-R * 0.4, R * 0.15); q.lineTo(-R * 0.36, -R * 0.35); q.quadraticCurveTo(0, -R * 0.6, R * 0.36, -R * 0.35); q.lineTo(R * 0.4, R * 0.15); q.closePath(); }), iron, 0, -R * 0.15, R * 0.4, { lw: lw(R) });
    // 鬍子造型的鐵面罩（矮人風）
    part(x, P.fn(q => { q.moveTo(-R * 0.3, R * 0.0); q.lineTo(R * 0.3, R * 0.0); q.lineTo(R * 0.2, R * 0.4); q.lineTo(0, R * 0.55); q.lineTo(-R * 0.2, R * 0.4); q.closePath(); }), brass, 0, R * 0.25, R * 0.3, { lw: lw(R) * 0.7, tex: q => { q.strokeStyle = 'rgba(120,80,20,.5)'; q.lineWidth = R * 0.03; for (let i = -2; i <= 2; i++) { q.beginPath(); q.moveTo(i * R * 0.1, R * 0.05); q.lineTo(i * R * 0.07, R * 0.45); q.stroke(); } } });
    const ec = s.die ? '#5a5a60' : s.hit ? '#ffffff' : hot ? '#ff5a3a' : '#7fe8ff';
    glow(x, () => { x.fillStyle = ec; x.fillRect(-R * 0.25, -R * 0.2, R * 0.5, R * 0.08); }, ec, s.die ? 0 : R * 0.4);
    x.restore();
    x.restore();
    arm(0);
    if (hot && !s.die) for (let i = 0; i < 4; i++) { const a = s.t * 3 + i * 1.6 + (s.walk ? s.ph : 0); x.globalAlpha = 0.45; Gfx.circ(x, Math.cos(a) * R * 0.8, -R * 3.2 - ((s.t * 2 + i * 0.25) % 1) * R * 0.9, R * (0.2 + i * 0.04), '#f0ece6'); x.globalAlpha = 1; }
    if (s.die > 0.3) for (let i = 0; i < 6; i++) { const a = i * 1.1, d = R * (0.4 + s.die * 1.4); x.save(); x.globalAlpha = 1 - s.die; x.translate(Math.cos(a) * d, -R * 1.8 + Math.sin(a) * d * 0.5); x.rotate(s.die * 4 + i); gear(x, R * 0.18, i % 2 ? brass : iron, R); x.restore(); }
    x.restore();
  }
  def('bossColossus', { w: 5.6, h: 5.4, ay: 4.4, top: 4.1, vis: 1.12, die: 'bake', boss: true }, (x, R, s) => colossus(x, R, s, false));
  def('bossColossus2', { w: 5.6, h: 5.6, ay: 4.6, top: 4.1, vis: 1.12, die: 'bake', boss: true }, (x, R, s) => colossus(x, R, s, true));
  // ───────── 永凍冰龍：冰藍鱗片、水晶背棘、半透明的冰翼；第二形態落地披冰甲，第三形態被暴風雪包圍 ─────────
  function wyrm(x, R, s, ph) {
    const sc = mat(ph === 2 ? '#5a7ab8' : '#7ab8e0', { sh: 0.5, shc: '#2a3a8a', rimc: '#e8fbff', rima: 0.8 }), scD = mat(ph === 2 ? '#3a5288' : '#4a88b8', { sh: 0.5 }), belly = mat('#e8f6ff', { sh: 0.35 });
    const memb = mat('#bfeaff', { gloss: 0.8, sh: 0.35 }), membB = mat('#8ac4e8', { gloss: 0.6 }), horn = mat('#f4fbff', { gloss: 1 }), crys = mat('#9fe6ff', { gloss: 1, sh: 0.35, shc: '#3a5ac8' });
    const pw = power(s), wu = windup(s);
    const fly = ph === 0;
    let flap = fly ? (s.walk ? Math.sin(s.ph) : s.an === 'idle' ? Math.sin(s.ph) * 0.5 : 0.2) : -0.9;
    if (fly && (s.an === 'cast' || s.sw)) flap = wu > 0 ? 0.9 * wu : -0.7 * pw;
    if (s.hit && fly) flap = -0.3;
    const sink = s.die ? E(Math.min(1, s.die / 0.8)) : 0;
    const by = (fly ? -R * 0.3 + (s.walk ? -Math.cos(s.ph) * R * 0.15 : s.an === 'idle' ? s.br * R * 0.06 : 0) : -R * 0.95 - (s.walk ? Math.abs(Math.sin(s.ph)) * R * 0.06 : 0)) + sink * R * 0.6;
    x.save(); x.translate(pw * R * 0.2 - (s.hit ? R * 0.15 : 0), by); x.rotate(pw * 0.06 - wu * 0.1 + (s.hit ? -0.1 : 0) - sink * 0.2);
    if (ph === 2 && !s.die) halo(x, 0, -R * 0.2, R * 2.6, '#cfefff', 0.25 + pw * 0.2);
    const wing = (sd) => {
      const back = sd < 0, sp = fly ? 1 : 0.55;
      const jx = sd * R * 1.25 * sp, jy = -R * (1.25 * flap + 0.75), tx = sd * R * 2.7 * sp, ty = -R * (1.4 * flap + 0.35);
      const tips = [[sd * R * 2.0 * sp, R * 0.4 - flap * R * 0.3], [sd * R * 1.4 * sp, R * 0.52 - flap * R * 0.25], [sd * R * 0.8 * sp, R * 0.5 - flap * R * 0.2]];
      const p = P.fn(q => { q.moveTo(sd * R * 0.2, -R * 0.35); q.quadraticCurveTo(sd * R * 0.6, jy - R * 0.2, jx, jy); q.lineTo(tx, ty); let px = tx, py = ty; for (const [ax, ay] of tips) { q.quadraticCurveTo((px + ax) / 2 - sd * R * 0.1, (py + ay) / 2 - R * 0.18, ax, ay); px = ax; py = ay; } q.quadraticCurveTo(sd * R * 0.45, R * 0.25, sd * R * 0.2, R * 0.25); q.closePath(); });
      x.save(); x.globalAlpha = 0.9;
      part(x, p, back ? membB : memb, sd * R * 1.3, -R * 0.2, R * 1.1, { lw: lw(R), sd: 0.25, tex: q => { q.strokeStyle = rgba('#2a5a9a', 0.75); q.lineWidth = R * 0.08; q.lineCap = 'round'; q.beginPath(); q.moveTo(sd * R * 0.2, -R * 0.35); q.lineTo(jx, jy); q.lineTo(tx, ty); for (const [ax, ay] of tips) { q.moveTo(jx, jy); q.lineTo(ax, ay); } q.stroke(); q.strokeStyle = 'rgba(255,255,255,.6)'; q.lineWidth = R * 0.03; for (const [ax, ay] of tips) { q.beginPath(); q.moveTo((jx + ax) / 2, (jy + ay) / 2); q.lineTo((jx + ax) / 2 + sd * R * 0.15, (jy + ay) / 2 + R * 0.1); q.stroke(); } } });
      x.restore();
      part(x, P.poly([jx, jy, jx + sd * R * 0.12, jy - R * 0.3, jx + sd * R * 0.2, jy + R * 0.02]), crys, jx, jy - R * 0.1, R * 0.12, { lw: lw(R) * 0.6 });
    };
    wing(-1);
    // 長尾巴（尾端一顆冰晶）
    const tw = s.walk ? Math.sin(s.ph + 1) * R * 0.18 : s.an === 'idle' ? s.br * R * 0.08 : 0;
    const tail = P.fn(q => { q.moveTo(-R * 0.55, R * 0.05); q.bezierCurveTo(-R * 1.4, R * 0.9 + tw, -R * 2.0, -R * 0.1 + tw, -R * 2.6, R * 0.25 + tw * 1.6); q.bezierCurveTo(-R * 1.9, R * 0.15 + tw, -R * 1.35, R * 0.5 + tw, -R * 0.5, -R * 0.25); q.closePath(); });
    part(x, tail, sc, -R * 1.4, R * 0.25, R * 0.6, { lw: lw(R), tex: q => Rig.scales(q, -R * 2.6, -R * 0.2, R * 2.1, R * 0.9, R * 0.16, 'rgba(30,60,140,.35)', R * 0.025) });
    part(x, P.poly([-R * 2.6, R * 0.25 + tw * 1.6, -R * 3.0, -R * 0.05 + tw * 1.6, -R * 2.85, R * 0.55 + tw * 1.6]), crys, -R * 2.8, R * 0.25, R * 0.2, { lw: lw(R) * 0.7 });
    // 腳
    if (fly) { for (const fx of [-R * 0.3, R * 0.25]) { part(x, P.cap(fx, R * 0.35, fx + R * 0.1, R * 0.85, R * 0.16, R * 0.11), fx < 0 ? scD : sc, fx, R * 0.6, R * 0.2, { lw: lw(R) * 0.8 }); for (let k = -1; k <= 1; k++) seg(x, fx + R * 0.1, R * 0.85, fx + R * (0.14 + k * 0.08), R * 0.98, '#f4fbff', R * 0.05); } }
    else for (const [fx, i] of [[-R * 0.55, 1], [R * 0.45, 0], [-R * 0.25, 0], [R * 0.75, 1]]) { const a = s.walk ? Math.sin(s.ph + i * Math.PI + fx) * 0.35 : 0; x.save(); x.translate(fx, R * 0.25); x.rotate(a); part(x, P.cap(0, 0, R * 0.05, R * 0.72, R * 0.2, R * 0.15), i ? scD : sc, 0, R * 0.36, R * 0.2, { lw: lw(R) * 0.8 }); for (let k = -1; k <= 1; k++) seg(x, R * 0.05, R * 0.72, R * (0.1 + k * 0.1), R * 0.86, '#f4fbff', R * 0.05); x.restore(); }
    // 身體
    part(x, P.ell(0, 0, R * 1.0, R * 0.62, -0.12), sc, 0, 0, R * 0.9, { lw: lw(R) * 1.1, tex: q => { Rig.scales(q, -R, -R * 0.62, R * 2, R * 0.5, R * 0.2, 'rgba(30,60,140,.35)', R * 0.03); } });
    part(x, P.ell(R * 0.12, R * 0.26, R * 0.66, R * 0.3, -0.12), belly, R * 0.12, R * 0.26, R * 0.55, { lw: lw(R) * 0.6, tex: q => { q.strokeStyle = 'rgba(120,160,210,.6)'; q.lineWidth = R * 0.03; for (let i = 0; i < 5; i++) { q.beginPath(); q.moveTo(-R * 0.4 + i * R * 0.2, R * 0.03); q.lineTo(-R * 0.35 + i * R * 0.2, R * 0.52); q.stroke(); } } });
    // 背上的水晶棘（第二形態變成整排冰甲）
    const nsp = ph >= 1 ? 6 : 4;
    for (let i = 0; i < nsp; i++) { const px = -R * 0.75 + i * R * (1.5 / (nsp - 1)), h = R * (ph >= 1 ? 0.55 + (i % 2) * 0.2 : 0.4); part(x, P.poly([px - R * 0.12, -R * 0.5, px - R * 0.02, -R * 0.5 - h, px + R * 0.1, -R * 0.52]), crys, px, -R * 0.55 - h * 0.4, R * 0.15, { lw: lw(R) * 0.6 }); }
    if (ph >= 1) part(x, P.fn(q => { q.moveTo(-R * 0.85, -R * 0.15); q.lineTo(-R * 0.6, -R * 0.55); q.lineTo(R * 0.55, -R * 0.6); q.lineTo(R * 0.85, -R * 0.2); q.lineTo(R * 0.5, -R * 0.35); q.lineTo(-R * 0.5, -R * 0.3); q.closePath(); }), mat('#cff4ff', { gloss: 1, sh: 0.3 }), 0, -R * 0.4, R * 0.8, { lw: lw(R) * 0.6, tex: q => { q.strokeStyle = 'rgba(255,255,255,.8)'; q.lineWidth = R * 0.03; q.beginPath(); q.moveTo(-R * 0.5, -R * 0.45); q.lineTo(R * 0.3, -R * 0.5); q.stroke(); } });
    wing(1);
    // 脖子與頭
    const nk = P.fn(q => { q.moveTo(R * 0.45, -R * 0.35); q.quadraticCurveTo(R * 0.95, -R * 0.8 + wu * R * 0.2, R * 1.1 + pw * R * 0.2, -R * 1.05 + wu * R * 0.3 + pw * R * 0.25); q.lineTo(R * 1.38 + pw * R * 0.2, -R * 0.82 + wu * R * 0.3 + pw * R * 0.25); q.quadraticCurveTo(R * 1.05, -R * 0.35, R * 0.75, R * 0.15); q.closePath(); });
    part(x, nk, sc, R * 0.95, -R * 0.5, R * 0.42, { lw: lw(R) });
    const hx = R * 1.35 + pw * R * 0.25, hy = -R * 1.05 + wu * R * 0.3 + pw * R * 0.25;
    x.save(); x.translate(hx, hy); x.rotate(-wu * 0.35 + pw * 0.15 + (s.hit ? -0.3 : 0));
    // 冰晶冠角
    for (const [ax, ay, l] of [[-0.2, -0.2, 0.75], [0.0, -0.25, 0.85], [-0.38, -0.08, 0.55]]) part(x, P.poly([ax * R - R * 0.07, ay * R, ax * R - R * 0.35, ay * R - R * l, ax * R + R * 0.08, ay * R - R * 0.05]), horn, ax * R - R * 0.15, ay * R - R * l * 0.5, R * 0.2, { lw: lw(R) * 0.7 });
    const jaw = R * (0.05 + Math.max(pw, s.hit * 0.6) * 0.25);
    part(x, P.poly([R * 0.12, R * 0.12, R * 0.7, R * 0.1 + jaw, R * 0.64, R * 0.24 + jaw, R * 0.1, R * 0.3]), scD, R * 0.4, R * 0.2, R * 0.25, { lw: lw(R) * 0.8 });
    if (jaw > R * 0.1) { x.fillStyle = '#1a2a5a'; x.beginPath(); x.moveTo(R * 0.15, R * 0.12); x.lineTo(R * 0.72, R * 0.02); x.lineTo(R * 0.68, R * 0.1 + jaw); x.closePath(); x.fill(); }
    part(x, P.ell(0, 0, R * 0.44, R * 0.34, 0.1), sc, 0, 0, R * 0.42, { lw: lw(R) });
    part(x, P.poly([R * 0.15, -R * 0.15, R * 0.85, -R * 0.02, R * 0.78, R * 0.12, R * 0.15, R * 0.15]), sc, R * 0.45, 0, R * 0.25, { lw: lw(R) * 0.9 });
    for (let i = 0; i < 3; i++) part(x, P.poly([R * (0.3 + i * 0.14), R * 0.12, R * (0.34 + i * 0.14), R * 0.24, R * (0.38 + i * 0.14), R * 0.12]), mat('#ffffff'), R * 0.34, R * 0.16, R * 0.05, { lw: lw(R) * 0.4, flat: true });
    const ec = ph === 2 ? '#c8a8ff' : '#e8fbff';
    if (s.die) eye(x, R * 0.08, -R * 0.08, R * 0.12, { mood: 'x' });
    else if (s.hit) eye(x, R * 0.08, -R * 0.08, R * 0.12, { mood: 'shut' });
    else { glow(x, () => { x.fillStyle = ec; x.beginPath(); x.ellipse(R * 0.08, -R * 0.08, R * 0.13, R * 0.09, 0, 0, TAU); x.fill(); }, ph === 2 ? '#9a6aff' : '#7fd8ff', R * 0.35); x.fillStyle = '#1a2a5a'; x.fillRect(R * 0.07, -R * 0.16, R * 0.04, R * 0.16); }
    // 冰息
    if (pw > 0.25 && s.an !== 'atk') glow(x, () => { const L = R * (0.9 + pw * 1.6); const fp = P.fn(q => { q.moveTo(R * 0.72, R * 0.12); q.quadraticCurveTo(R * 0.72 + L * 0.5, -R * 0.3 * pw, R * 0.72 + L, R * 0.15); q.quadraticCurveTo(R * 0.72 + L * 0.5, R * 0.6 * pw, R * 0.72, R * 0.22); q.closePath(); }); x.fillStyle = Gfx.lgrad(x, R * 0.72, 0, R * 0.72 + L, 0, ['#ffffff', '#bff0ff', 'rgba(120,200,255,.3)']); x.fill(fp); }, '#7fd8ff', R * 0.5);
    x.restore();
    x.restore();
    // 第三形態：周圍捲起暴風雪
    if (ph === 2 && !s.die) for (let i = 0; i < 9; i++) { const a = i * 0.7 + s.t * 5 + (s.walk ? s.ph : 0), d = R * (1.6 + (i % 3) * 0.35); x.globalAlpha = 0.55; Gfx.circ(x, Math.cos(a) * d, -R * 0.8 + Math.sin(a) * d * 0.35, R * (0.06 + (i % 2) * 0.04), '#ffffff'); x.globalAlpha = 1; }
    if (s.die > 0.3) for (let i = 0; i < 10; i++) { const a = i * 0.63, d = R * (0.5 + s.die * 2); x.globalAlpha = 1 - s.die; Gfx.star(x, Math.cos(a) * d, -R * 0.8 + Math.sin(a) * d * 0.6, R * 0.15, '#e8fbff', false); x.globalAlpha = 1; }
  }
  def('bossWyrm', { w: 6.6, h: 4.8, ay: 2.9, top: 2.1, vis: 1.25, die: 'bake', boss: true }, (x, R, s) => wyrm(x, R, s, 0));
  def('bossWyrm2', { w: 6.6, h: 4.4, ay: 3.2, top: 2.6, vis: 1.25, die: 'bake', boss: true }, (x, R, s) => wyrm(x, R, s, 1));
  def('bossWyrm3', { w: 6.8, h: 4.6, ay: 3.3, top: 2.7, vis: 1.25, die: 'bake', boss: true }, (x, R, s) => wyrm(x, R, s, 2));
})();
