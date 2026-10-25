'use strict';
// 守塔奇兵：第二章的新敵人美術——哥布林、哥布林熱氣球、聖盾騎士、夜鴉、狂暴猿、圖騰薩滿、影行者、鑽地鼴。
// 跟其他敵人同一套分部位畫法（四階光影、柔和的本色外框），每隻都有走路／攻擊／受擊／死亡動畫。
(() => {
  const { TAU, mix, rgba } = Gfx;
  const { mat, P, part, eye, mouth, blush, seg, glow, halo } = Rig;
  const { limb2, foot, lw, gait } = Beasts.lib;
  const def = Beasts.def, OUT = Rig.EDGE;
  const E = Rig.ease;

  // ───────── 哥布林：綠皮大耳、皮背心、短刀 ─────────
  function goblinHead(x, R, s, o) {
    o = o || {};
    const skin = mat(o.skin || '#7ac04a', { sh: 0.45 }), skinD = mat(mix(o.skin || '#7ac04a', '#2a4a1a', 0.3));
    // 大耳朵（往後斜）
    const ew = s.walk ? Math.sin(s.ph * 2) * 0.06 : s.hit ? 0.3 : 0;
    for (const [sd, m] of [[-1, skinD], [1, skin]]) {
      x.save(); x.translate(sd * R * 0.36 - R * 0.05, -R * 0.08); x.rotate(sd * (0.25 + ew) - 0.35);
      part(x, P.fn(q => { q.moveTo(0, -R * 0.12); q.quadraticCurveTo(sd * R * 0.45 - R * 0.25, -R * 0.4, sd * R * 0.62 - R * 0.35, -R * 0.12); q.quadraticCurveTo(sd * R * 0.3 - R * 0.1, R * 0.05, 0, R * 0.12); q.closePath(); }), m, sd * R * 0.2, -R * 0.12, R * 0.25, { lw: lw(R) * 0.8, tex: q => { q.fillStyle = 'rgba(255,140,140,.45)'; q.beginPath(); q.ellipse(sd * R * 0.22 - R * 0.12, -R * 0.12, R * 0.12, R * 0.05, -0.4, 0, TAU); q.fill(); } });
      x.restore();
    }
    const hp = P.blob([-R * 0.42, R * 0.05, -R * 0.36, -R * 0.36, R * 0.05, -R * 0.48, R * 0.45, -R * 0.3, R * 0.52, R * 0.08, R * 0.3, R * 0.38, -R * 0.2, R * 0.36]);
    part(x, hp, skin, 0, -R * 0.05, R * 0.48, { lw: lw(R) });
    if (o.hat) o.hat(x, R);
    // 大鼻子
    part(x, P.ell(R * 0.48, R * 0.04, R * 0.14, R * 0.1, 0.3), skin, R * 0.48, R * 0.04, R * 0.14, { lw: lw(R) * 0.7 });
    const md = s.mood === 'n' ? 'angry' : s.mood;
    eye(x, R * 0.12, -R * 0.1, R * 0.14, { iris: o.iris || '#d8a020', mood: md, look: [0.35, 0.1] });
    eye(x, R * 0.36, -R * 0.1, R * 0.12, { iris: o.iris || '#d8a020', mood: md, look: [0.35, 0.1] });
    if (s.die) mouth(x, R * 0.26, R * 0.22, R * 0.12, 'wavy');
    else if (s.hit) mouth(x, R * 0.26, R * 0.22, R * 0.1, 'o', R * 0.12);
    else mouth(x, R * 0.26, R * 0.2, R * 0.16, 'grin', R * 0.1);
  }
  def('goblin', { w: 3.2, h: 3.2, ay: 2.6, top: 2.2, vis: 1.42, die: 'fall' }, (x, R, s) => {
    const vest = mat('#8a5a32', { sh: 0.45 }), pants = mat('#5a4a3a'), skin = mat('#7ac04a', { sh: 0.45 });
    const g = gait(s, R, { amp: 0.6, knee: 1.0, bob: 1.3 });
    for (const i of [1, 0]) {
      const [, , fx, fy] = limb2(x, (i ? -R * 0.1 : R * 0.12) + g.fwd, -R * 0.6 - g.bob, g.a[i], -g.k[i], R * 0.3, R * 0.3, R * 0.11, R * 0.09, i ? mat('#4a3a2a') : pants);
      foot(x, fx, fy, R * 0.3, R * 0.12, mat(i ? '#5a7a2a' : '#6a9a3a'), R);
    }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean + 0.12);
    // 後手
    const aA = s.walk ? g.arm[1] * 0.6 : s.hit ? 0.8 : 0;
    part(x, P.cap(-R * 0.1, -R * 1.05, -R * 0.3 + Math.sin(aA) * R * 0.3, -R * 0.62, R * 0.08, R * 0.07), mat('#5a8a3a'), -R * 0.2, -R * 0.8, R * 0.1, { lw: lw(R) * 0.7 });
    // 身體＋背心
    const body = P.blob([-R * 0.32, -R * 0.55, -R * 0.36, -R * 1.0, 0, -R * 1.18, R * 0.36, -R * 1.0, R * 0.34, -R * 0.55, 0, -R * 0.46]);
    part(x, body, vest, 0, -R * 0.82, R * 0.38, { lw: lw(R), tex: q => { q.fillStyle = '#7ac04a'; q.beginPath(); q.moveTo(-R * 0.05, -R * 1.15); q.lineTo(R * 0.12, -R * 1.15); q.lineTo(R * 0.05, -R * 0.85); q.closePath(); q.fill(); q.fillStyle = '#3a2a1a'; q.fillRect(-R * 0.4, -R * 0.66, R * 0.8, R * 0.08); q.fillStyle = '#d8b040'; q.fillRect(-R * 0.04, -R * 0.67, R * 0.1, R * 0.1); } });
    // 頭
    x.save(); x.translate(R * 0.12, -R * 1.42); x.rotate(s.hit ? -0.25 : s.sw > 0 ? 0.15 : 0);
    goblinHead(x, R, s, { hat: (q, r) => part(q, P.fn(z => { z.arc(-r * 0.02, -r * 0.18, r * 0.38, Math.PI * 1.05, Math.PI * 1.95); z.closePath(); }), mat('#a83a2a'), 0, -r * 0.35, r * 0.3, { lw: lw(r) * 0.8 }) });
    x.restore();
    // 前手拿短刀
    let kA = s.walk ? -0.4 + g.arm[0] * 0.4 : -0.6;
    if (s.sw) kA = s.arc(-0.6, -2.0, 0.6); if (s.hit) kA = -1.4; if (s.die) kA = -0.6 - s.die;
    x.save(); x.translate(R * 0.22, -R * 1.0); x.rotate(kA + Math.PI / 2);
    part(x, P.cap(0, 0, R * 0.38, 0, R * 0.08, R * 0.07), skin, R * 0.19, 0, R * 0.1, { lw: lw(R) * 0.7 });
    part(x, P.poly([R * 0.42, -R * 0.05, R * 0.82, -R * 0.03, R * 0.92, 0, R * 0.82, R * 0.03, R * 0.42, R * 0.05]), mat('#d8dee8', { gloss: 1 }), R * 0.65, 0, R * 0.15, { lw: lw(R) * 0.6 });
    part(x, P.rr(R * 0.34, -R * 0.09, R * 0.07, R * 0.18, R * 0.02), mat('#8a5a2a'), R * 0.37, 0, R * 0.08, { lw: lw(R) * 0.5 });
    x.restore();
    x.restore();
  });

  // ───────── 哥布林熱氣球：補丁氣球＋藤籃（裡面三隻哥布林）、沙包、火爐 ─────────
  def('balloon', { w: 3.4, h: 4.6, ay: 3.9, top: 3.75, vis: 1.15, die: 'fly' }, (x, R, s) => {
    const sway = s.walk ? Math.sin(s.ph) * 0.06 : s.hit ? 0.15 : 0, bob = s.walk ? Math.sin(s.ph * 2) * R * 0.05 : 0;
    const pop = s.die ? E(Math.min(1, s.die * 1.6)) : 0;
    x.save(); x.translate(0, bob); x.rotate(sway);
    // 繩子
    x.strokeStyle = 'rgba(90,60,30,.85)'; x.lineWidth = R * 0.04;
    for (const sx of [-0.42, -0.14, 0.14, 0.42]) { x.beginPath(); x.moveTo(sx * R, -R * 0.62); x.lineTo(sx * R * 1.5, -R * 1.4); x.stroke(); }
    // 氣球本體（漏氣時縮小變皺）
    const bw = R * 1.2 * (1 - pop * 0.45), bh = R * 1.45 * (1 - pop * 0.35), by = -R * 2.45 + pop * R * 0.6;
    const env = P.fn(q => { q.moveTo(-R * 0.4, -R * 1.4); q.bezierCurveTo(-bw * 1.25, by + bh * 0.4, -bw * 1.05, by - bh * 1.05, 0, by - bh); q.bezierCurveTo(bw * 1.05, by - bh * 1.05, bw * 1.25, by + bh * 0.4, R * 0.4, -R * 1.4); q.closePath(); });
    part(x, env, mat('#e5484d', { gloss: 0.6, sh: 0.45 }), 0, by, bw, {
      lw: lw(R) * 1.1, tex: q => {
        // 黃色直條紋
        for (const f of [-0.55, 0, 0.55]) { q.fillStyle = '#ffd36b'; q.beginPath(); q.moveTo(f * R * 0.3 - R * 0.06, -R * 1.42); q.quadraticCurveTo(f * bw * 1.3 - R * 0.12, by, f * bw * 0.6 - R * 0.1, by - bh * 0.98); q.lineTo(f * bw * 0.6 + R * 0.1, by - bh * 0.98); q.quadraticCurveTo(f * bw * 1.3 + R * 0.12, by, f * R * 0.3 + R * 0.06, -R * 1.42); q.closePath(); q.fill(); }
        // 補丁
        q.fillStyle = '#8a6a3a'; q.fillRect(-bw * 0.6, by - bh * 0.2, R * 0.32, R * 0.26); q.strokeStyle = '#3a2a1a'; q.lineWidth = R * 0.025; q.setLineDash([R * 0.05, R * 0.04]); q.strokeRect(-bw * 0.6, by - bh * 0.2, R * 0.32, R * 0.26); q.setLineDash([]);
        q.fillStyle = '#5a8a3a'; q.beginPath(); q.arc(bw * 0.5, by - bh * 0.45, R * 0.13, 0, TAU); q.fill();
      },
    });
    // 骷髏記號
    Gfx.circ(x, R * 0.05, by + bh * 0.05, R * 0.18, 'rgba(40,20,20,.65)'); Gfx.circ(x, -R * 0.02, by + bh * 0.03, R * 0.04, '#ffd36b'); Gfx.circ(x, R * 0.12, by + bh * 0.03, R * 0.04, '#ffd36b');
    // 火爐與火焰
    seg(x, 0, -R * 0.72, 0, -R * 1.25, '#3a3a40', R * 0.08);
    if (!s.die) glow(x, () => { Gfx.circ(x, 0, -R * 1.32, R * 0.12, '#ffb03a'); Gfx.circ(x, 0, -R * 1.36, R * 0.06, '#fff3b0'); }, '#ff8a2a', R * 0.5);
    // 藤籃
    const bk = P.fn(q => { q.moveTo(-R * 0.6, -R * 0.68); q.lineTo(R * 0.6, -R * 0.68); q.lineTo(R * 0.5, 0); q.quadraticCurveTo(0, R * 0.08, -R * 0.5, 0); q.closePath(); });
    // 籃子裡的哥布林（兩隻探頭）
    for (const [gx, sc] of [[-R * 0.28, 0.55], [R * 0.24, 0.6]]) { x.save(); x.translate(gx, -R * 0.75); x.scale(sc, sc); goblinHead(x, R, s, {}); x.restore(); }
    part(x, bk, mat('#b8864a', { sh: 0.45 }), 0, -R * 0.35, R * 0.55, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(90,60,30,.6)'; q.lineWidth = R * 0.04; for (let i = 1; i < 4; i++) { q.beginPath(); q.moveTo(-R * 0.62, -R * 0.68 + i * R * 0.17); q.lineTo(R * 0.62, -R * 0.68 + i * R * 0.17); q.stroke(); } for (let i = -3; i <= 3; i++) { q.beginPath(); q.moveTo(i * R * 0.16, -R * 0.7); q.lineTo(i * R * 0.14, R * 0.05); q.stroke(); } } });
    part(x, P.rr(-R * 0.66, -R * 0.76, R * 1.32, R * 0.14, R * 0.06), mat('#8a5a2a'), 0, -R * 0.7, R * 0.6, { lw: lw(R) * 0.8 });
    // 沙包
    for (const sx of [-0.62, 0.62]) part(x, P.ell(sx * R, -R * 0.45, R * 0.12, R * 0.15), mat('#c8ad7a'), sx * R, -R * 0.45, R * 0.13, { lw: lw(R) * 0.6 });
    x.restore();
  });

  // ───────── 聖盾騎士：白金重甲＋巨大的金色塔盾、太陽紋罩袍 ─────────
  def('paladin', { w: 3.8, h: 4.1, ay: 3.35, top: 3.0, vis: 1.3, die: 'fall' }, (x, R, s) => {
    const steel = mat('#dfe4ee', { gloss: 1, sh: 0.45 }), steelD = mat('#a8b0c0', { gloss: 0.6 }), gold = mat('#f2c14e', { gloss: 0.9 }), cloth = mat('#f6f1e4', { sh: 0.4 });
    const g = gait(s, R, { amp: 0.32, knee: 0.5 });
    for (const i of [1, 0]) {
      const [, , fx, fy] = limb2(x, (i ? -R * 0.16 : R * 0.16) + g.fwd, -R * 0.86 - g.bob, g.a[i], -g.k[i], R * 0.44, R * 0.44, R * 0.17, R * 0.14, i ? steelD : steel);
      foot(x, fx, fy, R * 0.44, R * 0.2, i ? steelD : steel, R);
    }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean);
    // 後手：權杖
    let mA = -0.4 + (s.walk ? g.arm[1] * 0.25 : 0);
    if (s.sw) mA = s.arc(-0.4, -2.4, 0.8); if (s.hit) mA = -1.0; if (s.die) mA = -0.4 - s.die * 1.2;
    x.save(); x.translate(-R * 0.3, -R * 1.6); x.rotate(mA);
    part(x, P.cap(0, 0, R * 0.48, 0, R * 0.15, R * 0.12), steelD, R * 0.24, 0, R * 0.18, { lw: lw(R) * 0.8 });
    part(x, P.rr(R * 0.42, -R * 0.05, R * 1.0, R * 0.1, R * 0.04), mat('#8a6a3a'), R * 0.9, 0, R * 0.2, { lw: lw(R) * 0.6 });
    part(x, P.circ(R * 1.5, 0, R * 0.18), gold, R * 1.5, 0, R * 0.18, { lw: lw(R) * 0.7, tex: q => { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; q.fillStyle = '#c8901a'; q.beginPath(); q.moveTo(R * 1.5 + Math.cos(a) * R * 0.15, Math.sin(a) * R * 0.15); q.lineTo(R * 1.5 + Math.cos(a + 0.3) * R * 0.27, Math.sin(a + 0.3) * R * 0.27); q.lineTo(R * 1.5 + Math.cos(a + 0.55) * R * 0.15, Math.sin(a + 0.55) * R * 0.15); q.fill(); } } });
    x.restore();
    // 身體（胸甲＋罩袍）
    part(x, P.rr(-R * 0.55, -R * 2.0, R * 1.1, R * 1.2, R * 0.36), steel, 0, -R * 1.4, R * 0.6, { lw: lw(R) });
    part(x, P.fn(q => { q.moveTo(-R * 0.42, -R * 1.85); q.lineTo(R * 0.42, -R * 1.85); q.lineTo(R * 0.5, -R * 0.55); q.lineTo(0, -R * 0.42); q.lineTo(-R * 0.5, -R * 0.55); q.closePath(); }), cloth, 0, -R * 1.2, R * 0.5, { lw: lw(R) * 0.8, tex: q => { Gfx.circ(q, 0, -R * 1.35, R * 0.17, '#f2c14e'); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; q.strokeStyle = '#f2c14e'; q.lineWidth = R * 0.04; q.beginPath(); q.moveTo(Math.cos(a) * R * 0.2, -R * 1.35 + Math.sin(a) * R * 0.2); q.lineTo(Math.cos(a) * R * 0.3, -R * 1.35 + Math.sin(a) * R * 0.3); q.stroke(); } q.fillStyle = '#f2c14e'; q.fillRect(-R * 0.5, -R * 0.62, R * 1.0, R * 0.05); } });
    part(x, P.circ(-R * 0.45, -R * 1.85, R * 0.26), steel, -R * 0.45, -R * 1.85, R * 0.26, { lw: lw(R) * 0.8 });
    // 頭盔（大頂盔＋金十字＋羽飾）
    x.save(); x.translate(R * 0.05, -R * 2.32); x.rotate(s.hit ? -0.18 : s.die ? -0.25 : 0);
    part(x, P.fn(q => { q.moveTo(-R * 0.5, R * 0.42); q.lineTo(-R * 0.52, -R * 0.2); q.quadraticCurveTo(0, -R * 0.68, R * 0.52, -R * 0.2); q.lineTo(R * 0.5, R * 0.42); q.quadraticCurveTo(0, R * 0.5, -R * 0.5, R * 0.42); q.closePath(); }), steel, 0, 0, R * 0.52, { lw: lw(R), tex: q => { q.fillStyle = '#2a2236'; q.fillRect(-R * 0.1, -R * 0.08, R * 0.6, R * 0.08); q.fillRect(R * 0.15, -R * 0.08, R * 0.08, R * 0.34); q.fillStyle = '#f2c14e'; q.fillRect(-R * 0.04, -R * 0.45, R * 0.08, R * 0.85); } });
    glow(x, () => { Gfx.circ(x, R * 0.2, -R * 0.04, R * 0.04, '#bfe8ff'); Gfx.circ(x, R * 0.42, -R * 0.04, R * 0.035, '#bfe8ff'); }, '#9fd8ff', R * 0.25);
    part(x, P.fn(q => { q.moveTo(-R * 0.05, -R * 0.5); q.quadraticCurveTo(-R * 0.75, -R * 0.95, -R * 1.05, -R * 0.35); q.quadraticCurveTo(-R * 0.6, -R * 0.55, -R * 0.1, -R * 0.38); q.closePath(); }), mat('#ffffff'), -R * 0.5, -R * 0.6, R * 0.4, { lw: lw(R) * 0.8 });
    x.restore();
    // 前手：巨大的塔盾（受擊時往前頂）
    const sp = s.hit ? -R * 0.12 : s.sw > 0 ? s.sw * R * 0.15 : 0;
    x.save(); x.translate(R * 0.62 + sp, -R * 1.2);
    const sh = P.fn(q => { q.moveTo(-R * 0.4, -R * 0.95); q.quadraticCurveTo(0, -R * 1.12, R * 0.4, -R * 0.95); q.lineTo(R * 0.42, R * 0.35); q.quadraticCurveTo(R * 0.2, R * 0.82, 0, R * 1.02); q.quadraticCurveTo(-R * 0.2, R * 0.82, -R * 0.42, R * 0.35); q.closePath(); });
    part(x, sh, gold, 0, 0, R * 0.6, { lw: lw(R) * 1.1, tex: q => { q.strokeStyle = '#fff3b0'; q.lineWidth = R * 0.07; q.beginPath(); q.moveTo(0, -R * 0.85); q.lineTo(0, R * 0.85); q.moveTo(-R * 0.32, -R * 0.2); q.lineTo(R * 0.32, -R * 0.2); q.stroke(); q.strokeStyle = 'rgba(160,100,20,.6)'; q.lineWidth = R * 0.05; q.stroke(sh); Gfx.circ(q, 0, -R * 0.2, R * 0.14, '#ffffff'); } });
    halo(x, 0, -R * 0.2, R * 0.55, '#fff3b0', 0.35);
    x.restore();
    x.restore();
  });

  // ───────── 夜鴉：深紫黑羽、金色眼睛、翅膀大幅拍動 ─────────
  def('raven', { w: 4.8, h: 3.4, ay: 2.1, top: 1.6, vis: 1.4, die: 'fly' }, (x, R, s) => {
    const fea = mat('#3a2c58', { sh: 0.5, gloss: 0.4, rimc: '#c8b0ff', rima: 0.8 }), feaD = mat('#241a3a', { gloss: 0.3 }), beak = mat('#f2c14e', { gloss: 0.8 });
    const fl = s.walk ? Math.sin(s.ph) : s.hit ? -0.6 : s.die ? 0.3 - s.die : s.sw ? -s.sw * 0.6 : 0.2;
    const bob = s.walk ? -Math.cos(s.ph) * R * 0.12 : 0;
    x.save(); x.translate(0, bob); x.rotate(s.hit ? -0.25 : s.sw > 0 ? 0.2 * s.sw : 0);
    const wing = (far) => {
      x.save(); x.translate(-R * 0.1, -R * 0.55); x.scale(1, far ? 0.8 : 1); x.rotate(-0.3 - fl * 0.9 - (far ? 0.25 : 0));
      const w = P.fn(q => { q.moveTo(0, 0); q.quadraticCurveTo(-R * 0.6, -R * 0.55, -R * 1.5, -R * 0.4); q.lineTo(-R * 1.35, -R * 0.2); q.lineTo(-R * 1.55, -R * 0.05); q.lineTo(-R * 1.3, R * 0.06); q.lineTo(-R * 1.45, R * 0.22); q.lineTo(-R * 1.1, R * 0.22); q.lineTo(-R * 1.15, R * 0.38); q.quadraticCurveTo(-R * 0.6, R * 0.32, 0, R * 0.18); q.closePath(); });
      part(x, w, far ? feaD : fea, -R * 0.7, 0, R * 0.7, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(160,140,220,.45)'; q.lineWidth = R * 0.035; for (let i = 0; i < 4; i++) { q.beginPath(); q.moveTo(-R * 0.25 - i * R * 0.25, R * 0.1); q.lineTo(-R * 0.45 - i * R * 0.27, -R * 0.25 + i * R * 0.03); q.stroke(); } } });
      x.restore();
    };
    wing(true);
    // 尾巴
    part(x, P.fn(q => { q.moveTo(-R * 0.45, -R * 0.45); q.lineTo(-R * 1.25, -R * 0.3); q.lineTo(-R * 1.15, -R * 0.12); q.lineTo(-R * 1.3, R * 0.02); q.lineTo(-R * 0.45, -R * 0.2); q.closePath(); }), feaD, -R * 0.85, -R * 0.25, R * 0.4, { lw: lw(R) });
    // 身體
    part(x, P.ell(0, -R * 0.42, R * 0.62, R * 0.4, -0.15), fea, 0, -R * 0.42, R * 0.6, { lw: lw(R), tex: q => Rig.fur(q, R * 0.05, -R * 0.32, R * 0.9, R * 0.3, 10, 'rgba(120,100,180,.45)', R * 0.12, 2.6, R * 0.03, 4) });
    // 爪子
    for (const dx of [0.05, 0.25]) { seg(x, dx * R, -R * 0.1, dx * R + R * 0.06, R * 0.12, '#c8a040', R * 0.06); }
    // 頭
    x.save(); x.translate(R * 0.55, -R * 0.75); x.rotate(s.hit ? -0.3 : s.die ? 0.4 : 0);
    part(x, P.circ(0, 0, R * 0.32), fea, 0, 0, R * 0.32, { lw: lw(R) });
    // 羽冠
    for (const [a, l] of [[-2.3, 0.35], [-2.0, 0.42], [-1.7, 0.3]]) part(x, P.fn(q => { q.moveTo(-R * 0.05, -R * 0.2); q.lineTo(Math.cos(a) * R * l - R * 0.05, Math.sin(a) * R * l - R * 0.15); q.lineTo(R * 0.05, -R * 0.25); q.closePath(); }), feaD, 0, -R * 0.3, R * 0.15, { lw: lw(R) * 0.6 });
    const op = s.sw > 0.2 || s.hit ? R * 0.1 : 0;
    part(x, P.poly([R * 0.2, -R * 0.08, R * 0.62, R * 0.02, R * 0.2, R * 0.06]), beak, R * 0.4, 0, R * 0.15, { lw: lw(R) * 0.7 });
    if (op) part(x, P.poly([R * 0.2, R * 0.08, R * 0.5, R * 0.1 + op, R * 0.2, R * 0.14]), beak, R * 0.35, R * 0.1, R * 0.1, { lw: lw(R) * 0.6 });
    if (s.die) eye(x, R * 0.08, -R * 0.05, R * 0.12, { mood: 'x' });
    else { glow(x, () => { Gfx.circ(x, R * 0.08, -R * 0.06, R * 0.1, '#ffc84a'); Gfx.circ(x, R * 0.1, -R * 0.06, R * 0.045, '#1a0a20'); }, '#ffb03a', R * 0.3); Gfx.circ(x, R * 0.06, -R * 0.09, R * 0.025, '#ffffff'); }
    x.restore();
    wing(false);
    x.restore();
  });

  // ───────── 狂暴猿：深色粗毛、紅色雞冠頭、鐵護腕、用拳頭著地走 ─────────
  def('brute', { w: 4.6, h: 4.0, ay: 3.2, top: 2.8, vis: 1.3, die: 'fall' }, (x, R, s) => {
    const fur = mat('#5a4a5a', { sh: 0.5 }), furD = mat('#3e323e', { sh: 0.5 }), skin = mat('#c89a88', { sh: 0.4 }), iron = mat('#8a909a', { gloss: 0.8 });
    const ph = s.ph;
    let by = -R * 1.35, fwd = 0, lean = 0.25;
    if (s.walk) by -= Math.abs(Math.sin(ph)) * R * 0.12;
    if (s.sw) { fwd = s.sw > 0 ? s.sw * R * 0.35 : s.sw * R * 0.1; lean = 0.25 + s.sw * 0.25; by -= s.sw < 0 ? -s.sw * R * 0.25 : 0; }
    if (s.hit) { fwd = -R * 0.12; lean = 0.05; }
    if (s.die) { lean = 0.25 - s.die * 0.3; }
    // 後腳
    for (const i of [1, 0]) {
      const a = s.walk ? Math.sin(ph + i * Math.PI) * 0.45 : 0;
      const [, , fx, fy] = limb2(x, -R * 0.35 + (i ? -R * 0.1 : R * 0.1), by + R * 0.55, a, s.walk ? -Math.max(0, Math.sin(ph + i * Math.PI + 1)) * 0.6 : 0, R * 0.42, R * 0.42, R * 0.2, R * 0.15, i ? furD : fur);
      part(x, P.ell(fx + R * 0.08, fy - R * 0.06, R * 0.2, R * 0.1), skin, fx, fy, R * 0.18, { lw: lw(R) * 0.7 });
    }
    x.save(); x.translate(fwd, by); x.rotate(lean);
    // 後手（著地）
    const armA = (i) => s.walk ? Math.sin(ph + i * Math.PI + Math.PI) * 0.55 : s.sw ? (i ? -0.3 : s.arc(0.2, -2.6, 0.9)) : s.hit ? -0.8 : 0.1;
    const arm = (i) => {
      x.save(); x.translate(R * 0.3, -R * 0.55); x.rotate(armA(i));
      part(x, P.cap(0, 0, 0, R * 1.05, R * 0.27, R * 0.22), i ? furD : fur, 0, R * 0.5, R * 0.3, { lw: lw(R) });
      part(x, P.rr(-R * 0.25, R * 0.62, R * 0.5, R * 0.2, R * 0.06), iron, 0, R * 0.72, R * 0.25, { lw: lw(R) * 0.7, tex: q => { for (const sx of [-0.15, 0, 0.15]) Gfx.circ(q, sx * R, R * 0.72, R * 0.03, '#d8dee8'); } });
      part(x, P.ell(0, R * 1.1, R * 0.27, R * 0.2), skin, 0, R * 1.1, R * 0.25, { lw: lw(R) * 0.8 });
      x.restore();
    };
    arm(1);
    // 身體（大胸膛）
    const body = P.blob([-R * 0.9, -R * 0.1, -R * 0.8, -R * 0.75, -R * 0.1, -R * 1.05, R * 0.6, -R * 0.85, R * 0.75, -R * 0.2, R * 0.4, R * 0.35, -R * 0.4, R * 0.4]);
    part(x, body, fur, 0, -R * 0.35, R * 0.85, { lw: lw(R) * 1.1, tex: q => { Rig.fur(q, -R * 0.1, -R * 0.4, R * 1.5, R * 0.8, 22, 'rgba(30,20,30,.45)', R * 0.16, 2.2, R * 0.04, 5); q.fillStyle = 'rgba(200,154,136,.85)'; q.beginPath(); q.ellipse(R * 0.35, -R * 0.35, R * 0.32, R * 0.42, 0.3, 0, TAU); q.fill(); } });
    // 頭（紅色雞冠毛）
    x.save(); x.translate(R * 0.62, -R * 0.82); x.rotate(-lean * 0.7 + (s.hit ? -0.3 : 0));
    part(x, P.fn(q => { q.moveTo(-R * 0.35, -R * 0.25); for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.35; q.lineTo(Math.cos(a) * R * 0.62 - R * 0.05, Math.sin(a) * R * 0.62 - R * 0.05); q.lineTo(Math.cos(a + 0.17) * R * 0.35, Math.sin(a + 0.17) * R * 0.35); } q.closePath(); }), mat('#e5483a', { sh: 0.4 }), 0, -R * 0.4, R * 0.35, { lw: lw(R) * 0.8 });
    part(x, P.circ(0, 0, R * 0.4), fur, 0, 0, R * 0.4, { lw: lw(R) });
    part(x, P.ell(R * 0.15, R * 0.1, R * 0.32, R * 0.24), skin, R * 0.15, R * 0.1, R * 0.3, { lw: lw(R) * 0.8 });
    seg(x, -R * 0.1, -R * 0.12, R * 0.35, -R * 0.15, 'rgba(40,20,30,.8)', R * 0.1);
    const md = s.hit ? 'shut' : s.die ? 'x' : 'angry';
    eye(x, R * 0.08, -R * 0.03, R * 0.1, { iris: '#ff3a2a', mood: md, look: [0.4, 0.1] }); eye(x, R * 0.3, -R * 0.03, R * 0.09, { iris: '#ff3a2a', mood: md, look: [0.4, 0.1] });
    mouth(x, R * 0.2, R * 0.2, R * 0.16, s.sw > 0.1 || s.hit ? 'roar' : 'grin', R * (0.1 + (s.sw > 0 ? s.sw * 0.15 : 0)));
    x.restore();
    arm(0);
    x.restore();
  });

  // ───────── 圖騰薩滿：羽毛頭冠、木面具、骷髏圖騰杖（發綠光） ─────────
  def('shaman', { w: 3.6, h: 4.3, ay: 3.5, top: 3.2, vis: 1.35, die: 'fall', cast: true }, (x, R, s) => {
    const robe = mat('#6a8a5a', { sh: 0.45 }), skin = mat('#8ab05a', { sh: 0.45 }), wood = mat('#8a5a32');
    const g = gait(s, R, { amp: 0.4 });
    const cast = s.cast;
    for (const i of [1, 0]) { const fx = Math.sin(g.a[i]) * R * 0.3 + (i ? -R * 0.12 : R * 0.12); foot(x, fx, s.walk ? -Math.max(0, -Math.sin(s.ph + i * Math.PI)) * R * 0.08 : 0, R * 0.32, R * 0.14, mat(i ? '#5a7a3a' : '#6a9a4a'), R); }
    x.save(); x.translate(g.fwd, -g.bob); x.rotate(g.lean);
    // 圖騰杖（後手）
    const stA = cast ? -0.25 * cast : s.sw ? (s.sw < 0 ? -s.sw * 0.4 : -s.sw * 1.0) : (s.walk ? Math.sin(s.ph) * 0.06 : 0) + (s.hit ? 0.3 : 0) + (s.die ? 0.9 * s.die : 0);
    x.save(); x.translate(R * 0.55, -R * 0.1 - cast * R * 0.5); x.rotate(-stA);
    part(x, P.rr(-R * 0.06, -R * 2.5, R * 0.12, R * 2.55, R * 0.05), wood, 0, -R * 1.2, R * 0.2, { lw: lw(R) * 0.7, tex: q => { q.fillStyle = '#c84a3a'; q.fillRect(-R * 0.07, -R * 1.6, R * 0.14, R * 0.06); q.fillStyle = '#3a8acd'; q.fillRect(-R * 0.07, -R * 1.4, R * 0.14, R * 0.06); } });
    // 圖騰頭（木雕臉＋小骷髏）
    part(x, P.rr(-R * 0.22, -R * 3.0, R * 0.44, R * 0.5, R * 0.08), mat('#a8743e'), 0, -R * 2.75, R * 0.25, { lw: lw(R) * 0.8, tex: q => { q.fillStyle = '#2a1a10'; q.fillRect(-R * 0.14, -R * 2.88, R * 0.1, R * 0.08); q.fillRect(R * 0.04, -R * 2.88, R * 0.1, R * 0.08); q.fillStyle = '#e8dcc0'; for (let i = 0; i < 4; i++) q.fillRect(-R * 0.12 + i * R * 0.065, -R * 2.68, R * 0.045, R * 0.08); q.fillStyle = '#3ab88a'; q.fillRect(-R * 0.22, -R * 2.78, R * 0.44, R * 0.03); } });
    for (const sd of [-1, 1]) part(x, P.fn(q => { q.moveTo(sd * R * 0.2, -R * 2.95); q.quadraticCurveTo(sd * R * 0.6, -R * 3.3, sd * R * 0.45, -R * 2.7); q.closePath(); }), mat(sd < 0 ? '#e5484d' : '#3a8acd'), sd * R * 0.35, -R * 2.95, R * 0.2, { lw: lw(R) * 0.6 });
    const gl = 0.5 + cast * 0.5;
    halo(x, 0, -R * 2.85, R * (0.5 + cast * 0.5), '#7dffb0', 0.45 * gl);
    x.restore();
    // 草裙長袍
    const sk = s.walk ? Math.sin(s.ph) * R * 0.08 : 0;
    part(x, P.fn(q => { q.moveTo(-R * 0.65 - sk, -R * 0.08); q.quadraticCurveTo(-R * 0.55, -R * 1.1, -R * 0.35, -R * 1.55); q.lineTo(R * 0.35, -R * 1.55); q.quadraticCurveTo(R * 0.55, -R * 1.1, R * 0.65 + sk, -R * 0.08); q.lineTo(-R * 0.65 - sk, -R * 0.08); q.closePath(); }), robe, 0, -R * 0.8, R * 0.65, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(40,60,30,.5)'; q.lineWidth = R * 0.035; for (let i = 0; i < 9; i++) { const fx = -R * 0.6 + i * R * 0.15; q.beginPath(); q.moveTo(fx * 0.7, -R * 0.75); q.lineTo(fx + sk * 0.3, -R * 0.08); q.stroke(); } q.fillStyle = '#c8a050'; q.fillRect(-R * 0.6, -R * 0.82, R * 1.2, R * 0.1); for (let i = 0; i < 5; i++) Gfx.circ(q, -R * 0.4 + i * R * 0.2, -R * 0.77, R * 0.04, i % 2 ? '#e5484d' : '#3ab88a'); } });
    // 骨頭項鍊
    for (let i = 0; i < 5; i++) { const a = Math.PI * (0.2 + i * 0.15); part(x, P.ell(Math.cos(a) * R * 0.32, -R * 1.45 + Math.sin(a) * R * 0.18, R * 0.05, R * 0.08, a), mat('#f0e6d0'), 0, -R * 1.35, R * 0.06, { lw: lw(R) * 0.5 }); }
    // 頭＋面具＋羽毛冠
    x.save(); x.translate(R * 0.08, -R * 1.92); x.rotate(s.hit ? -0.2 : cast ? -0.15 : s.die ? -0.3 : 0);
    for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.15 + i * 0.12); part(x, P.fn(q => { q.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); q.quadraticCurveTo(Math.cos(a - 0.15) * R * 0.75, Math.sin(a - 0.15) * R * 0.75, Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95); q.quadraticCurveTo(Math.cos(a + 0.15) * R * 0.75, Math.sin(a + 0.15) * R * 0.75, Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); q.closePath(); }), mat(['#e5484d', '#ffd36b', '#3a8acd', '#e5484d', '#3ab88a', '#ffd36b', '#e5484d'][i]), Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, R * 0.2, { lw: lw(R) * 0.6 }); }
    part(x, P.circ(R * 0.05, 0, R * 0.38), skin, R * 0.05, 0, R * 0.38, { lw: lw(R) });
    // 木面具
    part(x, P.fn(q => { q.moveTo(R * 0.0, -R * 0.3); q.quadraticCurveTo(R * 0.55, -R * 0.32, R * 0.52, R * 0.05); q.quadraticCurveTo(R * 0.48, R * 0.42, R * 0.18, R * 0.45); q.quadraticCurveTo(-R * 0.05, R * 0.2, R * 0.0, -R * 0.3); q.closePath(); }), mat('#c8945a', { gloss: 0.3 }), R * 0.25, 0, R * 0.3, { lw: lw(R) * 0.8, tex: q => { q.fillStyle = '#3ab88a'; q.fillRect(R * 0.06, -R * 0.06, R * 0.42, R * 0.05); q.fillStyle = '#e5484d'; q.beginPath(); q.moveTo(R * 0.15, R * 0.15); q.lineTo(R * 0.42, R * 0.15); q.lineTo(R * 0.3, R * 0.32); q.closePath(); q.fill(); } });
    const ec = cast > 0.2 ? '#bfffd8' : '#ffe08a';
    glow(x, () => { Gfx.circ(x, R * 0.2, -R * 0.12, R * 0.055, ec); Gfx.circ(x, R * 0.4, -R * 0.12, R * 0.05, ec); }, '#7dffb0', R * 0.3);
    x.restore();
    // 前手
    const hx = R * 0.55 + Math.sin(stA) * R * 0.9, hy = -R * 1.05 - cast * R * 0.5;
    part(x, P.cap(R * 0.12, -R * 1.35, hx - R * 0.05, hy, R * 0.12, R * 0.1), skin, (hx + R * 0.12) / 2, hy, R * 0.2, { lw: lw(R) * 0.7 });
    if (cast > 0.4) for (let i = 0; i < 4; i++) { const a = i * 1.7 + s.t * 6; Gfx.star(x, R * 0.55 + Math.cos(a) * R * 0.7, -R * 2.9 - cast * R * 0.5 + Math.sin(a) * R * 0.4, R * 0.1, '#d8ffe8', false); }
    x.restore();
  });

  // ───────── 影行者：連帽斗篷、發光的紫眼、兩把彎刀，下襬化成煙 ─────────
  def('shade', { w: 3.6, h: 3.9, ay: 3.2, top: 2.85, vis: 1.38, die: 'bake' }, (x, R, s) => {
    const cloak = mat('#3a2a5a', { sh: 0.5, rimc: '#c8a8ff', rima: 0.85 }), cloakD = mat('#241a3a'), steel = mat('#c8c0e8', { gloss: 1 });
    const fade = s.die ? E(s.die) : 0;
    const bob = s.walk ? Math.sin(s.ph * 2) * R * 0.06 : s.an === 'idle' ? s.br * R * 0.03 : 0;
    const lean = s.walk ? 0.12 : s.sw > 0 ? 0.25 * s.sw : s.hit ? -0.15 : 0.05;
    x.save(); x.globalAlpha = 1 - fade * 0.85; x.translate(0, -bob - fade * R * 0.4); x.rotate(lean);
    // 後面的刀
    const dA = s.sw ? s.arc(0.4, -1.8, 1.2) : s.walk ? 0.4 + Math.sin(s.ph) * 0.15 : 0.5;
    const blade = (ang, px, far) => { x.save(); x.translate(px, -R * 1.4); x.rotate(ang); part(x, P.fn(q => { q.moveTo(R * 0.1, -R * 0.04); q.quadraticCurveTo(R * 0.7, -R * 0.25, R * 1.0, R * 0.05); q.quadraticCurveTo(R * 0.65, -R * 0.05, R * 0.1, R * 0.06); q.closePath(); }), far ? mat('#8a80b0', { gloss: 0.7 }) : steel, R * 0.55, 0, R * 0.25, { lw: lw(R) * 0.6 }); part(x, P.rr(-R * 0.08, -R * 0.04, R * 0.2, R * 0.08, R * 0.03), mat('#5a3a8a'), 0, 0, R * 0.1, { lw: lw(R) * 0.5 }); x.restore(); };
    blade(-dA - 0.4, -R * 0.3, true);
    // 斗篷（下襬一條條化成煙）
    const fl = s.walk ? Math.sin(s.ph) * R * 0.12 : s.hit ? R * 0.2 : 0;
    const body = P.fn(q => {
      q.moveTo(-R * 0.35, -R * 2.0); q.quadraticCurveTo(-R * 0.75, -R * 1.2, -R * 0.85 - fl, -R * 0.35);
      for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 0.5) / 6, t2 = (i + 1) / 6; const xa = -R * 0.85 - fl + (R * 1.55 + fl) * t1, xb = -R * 0.85 - fl + (R * 1.55 + fl) * t2; void t0; q.quadraticCurveTo(xa, R * 0.05 + (i % 2) * R * 0.08, xb, -R * 0.3 + (i % 2) * R * 0.1); }
      q.quadraticCurveTo(R * 0.72, -R * 1.2, R * 0.38, -R * 2.0); q.closePath();
    });
    part(x, body, cloak, 0, -R * 1.1, R * 0.8, { lw: lw(R), tex: q => { q.strokeStyle = 'rgba(120,90,180,.45)'; q.lineWidth = R * 0.04; for (const fx of [-0.4, -0.05, 0.3]) { q.beginPath(); q.moveTo(fx * R * 0.6, -R * 1.8); q.quadraticCurveTo(fx * R * 1.2 + fl * 0.3, -R * 0.9, fx * R * 1.5 + fl * 0.5, -R * 0.2); q.stroke(); } q.fillStyle = '#8a6ad8'; q.fillRect(-R * 0.55, -R * 1.05, R * 1.1, R * 0.05); } });
    // 兜帽（臉是一片黑，只有兩隻發光的眼睛）
    x.save(); x.translate(R * 0.08, -R * 2.15); x.rotate(s.hit ? -0.25 : 0);
    const hood = P.fn(q => { q.moveTo(-R * 0.5, R * 0.35); q.quadraticCurveTo(-R * 0.62, -R * 0.4, R * 0.0, -R * 0.62); q.quadraticCurveTo(R * 0.2, -R * 0.55, R * 0.55, -R * 0.15); q.quadraticCurveTo(R * 0.6, R * 0.25, R * 0.4, R * 0.42); q.closePath(); });
    part(x, hood, cloak, 0, -R * 0.1, R * 0.55, { lw: lw(R) });
    x.fillStyle = '#0a0612'; x.beginPath(); x.ellipse(R * 0.18, R * 0.02, R * 0.3, R * 0.27, 0.15, 0, TAU); x.fill();
    if (!s.die) glow(x, () => { x.fillStyle = s.hit ? '#ffffff' : '#d8a8ff'; for (const ex of [R * 0.1, R * 0.32]) { x.beginPath(); x.ellipse(ex, -R * 0.02, R * 0.07, s.hit ? R * 0.015 : R * 0.035, -0.15, 0, TAU); x.fill(); } }, '#b070ff', R * 0.4);
    x.restore();
    blade(dA, R * 0.3, false);
    x.restore();
    // 死亡：化成紫色煙霧
    if (s.die > 0.1) for (let i = 0; i < 7; i++) { const a = i * 0.9, d = R * (0.3 + s.die * 1.2); x.globalAlpha = (1 - s.die) * 0.7; Gfx.circ(x, Math.cos(a) * d * 0.8, -R * 1.2 + Math.sin(a) * d * 0.5 - s.die * R * 0.8, R * (0.25 + s.die * 0.3), '#4a3a6a'); }
    x.globalAlpha = 1;
  });

  // ───────── 鑽地鼴：咖啡色絨毛、粉紅鼻、大爪子、礦工帽上的頭燈 ─────────
  def('mole', { w: 3.9, h: 3.1, ay: 2.5, top: 2.0, vis: 1.4, die: 'bake' }, (x, R, s) => {
    const fur = mat('#8a6a52', { sh: 0.5 }), furD = mat('#6a4e3a', { sh: 0.5 }), pink = mat('#ff9ab0', { gloss: 0.6 }), claw = mat('#f0e6d0', { gloss: 0.6 });
    const flip = s.die ? E(Math.min(1, s.die / 0.55)) : 0;
    let by = -R * 0.72, fwd = 0;
    if (s.walk) by -= Math.abs(Math.sin(s.ph * 2)) * R * 0.06;
    if (s.sw > 0) fwd = s.sw * R * 0.25; if (s.hit) fwd = -R * 0.1;
    x.save(); x.translate(fwd, by); x.rotate(flip * Math.PI * 0.9 + (s.hit ? -0.12 : 0)); if (flip) x.translate(0, flip * R * 0.1);
    // 後腳
    for (const [px, i] of [[-R * 0.55, 1], [-R * 0.3, 0]]) { const a = s.walk ? Math.sin(s.ph * 2 + i * Math.PI) * 0.4 : 0; x.save(); x.translate(px, R * 0.35); x.rotate(a); part(x, P.ell(0, R * 0.15, R * 0.18, R * 0.12), i ? furD : fur, 0, R * 0.15, R * 0.18, { lw: lw(R) * 0.8 }); part(x, P.ell(R * 0.1, R * 0.26, R * 0.12, R * 0.06), pink, R * 0.1, R * 0.26, R * 0.1, { lw: lw(R) * 0.5 }); x.restore(); }
    // 身體（圓滾滾）
    part(x, P.ell(-R * 0.1, 0, R * 0.85, R * 0.62), fur, -R * 0.1, 0, R * 0.8, { lw: lw(R) * 1.1, tex: q => { Rig.fur(q, -R * 0.2, -R * 0.15, R * 1.4, R * 0.7, 18, 'rgba(60,40,30,.45)', R * 0.13, 2.4, R * 0.03, 7); q.fillStyle = 'rgba(200,170,140,.5)'; q.beginPath(); q.ellipse(R * 0.1, R * 0.3, R * 0.5, R * 0.22, 0, 0, TAU); q.fill(); } });
    // 頭＋礦工帽
    x.save(); x.translate(R * 0.62, -R * 0.15); x.rotate(s.hit ? -0.2 : s.walk ? Math.sin(s.ph * 2) * 0.05 : 0);
    part(x, P.ell(0, 0, R * 0.45, R * 0.4), fur, 0, 0, R * 0.42, { lw: lw(R) });
    part(x, P.ell(R * 0.42, R * 0.05, R * 0.2, R * 0.13), fur, R * 0.4, R * 0.05, R * 0.18, { lw: lw(R) * 0.8 });
    part(x, P.circ(R * 0.6, R * 0.04, R * 0.1), pink, R * 0.6, R * 0.04, R * 0.1, { lw: lw(R) * 0.6 });
    for (const dy of [-0.02, 0.06, 0.12]) seg(x, R * 0.5, R * dy, R * 0.82, R * (dy * 1.8 - 0.03), 'rgba(40,30,30,.55)', R * 0.02);
    part(x, P.fn(q => { q.arc(-R * 0.05, -R * 0.15, R * 0.38, Math.PI * 1.02, Math.PI * 1.98); q.lineTo(R * 0.45, -R * 0.12); q.lineTo(-R * 0.45, -R * 0.12); q.closePath(); }), mat('#f2c14e', { gloss: 0.8 }), 0, -R * 0.3, R * 0.35, { lw: lw(R) * 0.8 });
    glow(x, () => Gfx.circ(x, R * 0.2, -R * 0.36, R * 0.07, s.die ? '#8a8a7a' : '#fffbe0'), '#fff3a0', s.die ? 0 : R * 0.5);
    if (s.die) eye(x, R * 0.18, -R * 0.02, R * 0.08, { mood: 'x' });
    else { x.fillStyle = '#1a1010'; x.beginPath(); x.ellipse(R * 0.18, -R * 0.02, R * 0.04, s.hit ? R * 0.01 : R * 0.05, 0, 0, TAU); x.fill(); Gfx.circ(x, R * 0.17, -R * 0.04, R * 0.015, '#ffffff'); }
    if (s.hit || s.sw > 0.2) mouth(x, R * 0.42, R * 0.2, R * 0.08, 'o', R * 0.08);
    x.restore();
    // 前爪（挖土）
    const ca = s.walk ? Math.sin(s.ph * 2) * 0.5 : s.sw ? s.arc(0.2, -1.2, 0.9) : s.hit ? -0.6 : 0.2;
    for (const [px, far] of [[R * 0.25, 1], [R * 0.45, 0]]) {
      x.save(); x.translate(px, R * 0.25); x.rotate(ca * (far ? -1 : 1));
      part(x, P.ell(R * 0.1, R * 0.15, R * 0.17, R * 0.12), far ? furD : fur, R * 0.1, R * 0.15, R * 0.16, { lw: lw(R) * 0.7 });
      for (let i = 0; i < 3; i++) part(x, P.poly([R * (0.15 + i * 0.07), R * 0.2, R * (0.2 + i * 0.07), R * 0.42, R * (0.24 + i * 0.07), R * 0.2]), claw, R * (0.2 + i * 0.07), R * 0.3, R * 0.06, { lw: lw(R) * 0.4 });
      x.restore();
    }
    x.restore();
  });
})();
