'use strict';
// 第 6 關「冰原前線」、第 7 關「熔岩地帶」：地形、裝甲列車、兩個新頭目、音樂、環境粒子（雪、火星）

// ================= 共用：環境粒子 =================
function ambUpdate(dt) {
  const kind = STAGES[G.stage].amb, A = G.amb;
  const want = kind === 'snow' ? 70 : kind === 'ember' ? 46 : 0;
  while (A.length < want) A.push(kind === 'snow'
    ? { x: rnd(W), y: rnd(-20, H), r: rnd(0.8, 2.4), vx: rnd(-14, 8), vy: rnd(40, 90), ph: rnd(TAU) }
    : { x: rnd(W), y: rnd(0, H + 20), r: rnd(0.8, 2), vx: rnd(-10, 10), vy: -rnd(25, 70), ph: rnd(TAU), life: rnd(1.5, 4) });
  for (const p of A) {
    p.ph += dt * 2; p.x += (p.vx + Math.sin(p.ph) * 12) * dt; p.y += (p.vy + G.speed * (kind === 'snow' ? 0.6 : 0.3)) * dt;
    if (kind === 'snow' ? p.y > H + 10 : p.y < -10) { p.y = kind === 'snow' ? -10 : H + 10; p.x = rnd(W); }
    if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
  }
}
function ambDraw(ctx) {
  const kind = STAGES[G.stage].amb;
  if (kind === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (const p of G.amb) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
  } else if (kind === 'ember') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of G.amb) { const f = 0.5 + 0.5 * Math.sin(p.ph * 3); ctx.fillStyle = `rgba(255,${120 + f * 80 | 0},40,${0.45 + f * 0.4})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}

// ================= 第 6 關：雪原 → 冰海（有裂開的水道和冰山）→ 極地基地 =================
const Z6 = v => { const d = -v; const sea = smooth(1200, 1600, d) * (1 - smooth(2800, 3200, d)); return { plain: 1 - smooth(1200, 1600, d), sea, base: smooth(2800, 3200, d) }; };
const lead6 = (x, v) => Math.abs(vnoise(x * 0.008, v * 0.0035, 601) - 0.5);
const pool6 = (x, v) => smooth(0.66, 0.7, fbm(x * 0.007, v * 0.007, 606));
const water6 = (x, v) => { const z = Z6(v); return z.sea > 0.5 && (lead6(x, v) < 0.09 * z.sea || pool6(x, v) > 0.5); };
const H6 = (x, v) => {
  const z = Z6(v);
  let h = fbm(x * 0.006, v * 0.006, 602) * (34 * z.plain + 50 * z.base + 4 * z.sea);
  h += Math.pow(ridge(x * 0.03, v * 0.02, 603), 8) * 3 * z.sea;
  if (water6(x, v)) h -= 4;
  return h;
};
const C6 = (x, v, h, s) => {
  const z = Z6(v);
  let c = mixC([222, 232, 244], [246, 250, 255], vnoise(x * 0.02, v * 0.02, 604));
  c = mixC(c, mixC([186, 214, 236], [206, 228, 244], vnoise(x * 0.05, v * 0.05, 605)), z.sea * 0.85);
  c = mixC(c, [120, 128, 140], clamp((s - 0.6) * 2, 0, 1) * (1 - z.sea));
  if (z.sea > 0.3) {
    const q = lead6(x, v) / (0.09 * z.sea), pl = fbm(x * 0.007, v * 0.007, 606);
    const wv = Math.max(1 - smooth(0.8, 1.15, q), smooth(0.66, 0.71, pl)) * smooth(0.45, 0.55, z.sea);
    const deep = mixC([10, 34, 60], [60, 110, 145], clamp(Math.min(q, 1 - smooth(0.66, 0.75, pl)) * 1.1, 0, 1));
    c = mixC(c, deep, wv);
  }
  return c;
};
function pineSnow(g, x, y, r) {
  g.fillStyle = 'rgba(40,60,90,.25)'; g.beginPath(); g.arc(x + r * 0.5, y + r * 0.6, r, 0, TAU); g.fill();
  g.fillStyle = '#2c4a3e'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.3, r * 0.65, 0, TAU); g.fill();
}
PAINT.push({ H: H6, C: C6, k: 1.5, d: (g, v0, v1, sp, R) => {
  grain(g, v0, v1, 611, 0.05);
  // 冰海：冰山、浮冰裂縫
  cells(70, 70, v0, v1, 30, (i, j, x, v) => {
    const cx = x + hash(i, j, 612) * 70, cv = v + hash(i, j, 613) * 70, z = Z6(cv);
    if (z.sea > 0.4) {
      if (water6(cx, cv) && hash(i, j, 614) > 0.55) {
        const r = 6 + hash(i, j, 615) * 10, pts = [];
        for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, rr = r * (0.7 + hash(k, i, j) * 0.5); pts.push([cx + Math.cos(a) * rr, cv + Math.sin(a) * rr]); }
        g.fillStyle = 'rgba(0,20,40,.35)'; g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0] + 3, p[1] + 4) : g.moveTo(p[0] + 3, p[1] + 4)); g.fill();
        const gr = g.createLinearGradient(cx - r, cv - r, cx + r, cv + r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#9cc8e4');
        g.fillStyle = gr; g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.fill();
      } else if (!water6(cx, cv) && hash(i, j, 616) > 0.6) {
        g.strokeStyle = 'rgba(120,160,190,.45)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(cx, cv);
        for (let k = 0; k < 4; k++) g.lineTo(cx + (hash(k, i, j) - 0.5) * 40, cv + (hash(j, k, i) - 0.5) * 30); g.stroke();
      }
    } else if (hash(i, j, 617) < 0.55 * z.plain + 0.2 * z.base) {
      const n = 3 + ((hash(i, j, 618) * 9) | 0);
      for (let k = 0; k < n; k++) pineSnow(g, x + hash(k, i, j) * 70, v + hash(j, k, i) * 70, 3.5 + hash(i + k, j, 619) * 3);
    }
  });
  // 結冰的湖
  cells(160, 260, v0, v1, 60, (i, j, x, v) => {
    const cx = x + 40 + hash(i, j, 620) * 80, cv = v + 60 + hash(i, j, 621) * 140;
    if (Z6(cv).plain < 0.6 || hash(i, j, 622) < 0.6) return;
    const rx = 26 + hash(i, j, 623) * 20, ry = 18 + hash(j, i, 623) * 14;
    const gr = g.createRadialGradient(cx - rx * 0.3, cv - ry * 0.3, 2, cx, cv, rx); gr.addColorStop(0, '#d6eefc'); gr.addColorStop(1, '#8ab8d8');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cv, rx, ry, hash(i, j, 624), 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - rx * 0.5, cv - 2); g.lineTo(cx + rx * 0.3, cv + 3); g.stroke();
  });
  // 雪地履帶痕
  g.strokeStyle = 'rgba(150,170,195,.45)'; g.lineWidth = 1.4;
  for (const o of [-3, 3]) { g.beginPath(); for (let v = v0 - 20; v <= v1 + 20; v += 6) { const x = 120 + Math.sin(v * 0.004 + 2) * 70 + o; v === v0 - 20 ? g.moveTo(x, v) : g.lineTo(x, v); } g.stroke(); }
  // 極地基地
  cells(170, 230, v0, v1, 50, (i, j, x, v) => {
    const cx = x + 40 + hash(i, j, 625) * 90, cv = v + 40 + hash(i, j, 626) * 150, z = Z6(cv);
    if (z.base < 0.5 && hash(i, j, 627) > 0.12) return;
    if (water6(cx, cv) || cx < 40 || cx > W - 40) return;
    g.fillStyle = 'rgba(40,60,90,.18)'; g.fillRect(cx - 34, cv - 24, 72, 52);
    g.fillStyle = '#b8c2cc'; g.fillRect(cx - 36, cv - 26, 70, 50);
    g.strokeStyle = '#e0b030'; g.lineWidth = 1; g.setLineDash([3, 3]); g.strokeRect(cx - 36, cv - 26, 70, 50); g.setLineDash([]);
    dome(g, cx - 18, cv - 8, 10); dome(g, cx + 4, cv + 10, 7); dish(g, cx + 20, cv - 12, 8, hash(i, j, 628) * TAU);
    glowDotT(g, cx + 30, cv + 20, 4, 'rgba(80,220,255,.9)'); glowDotT(g, cx - 32, cv + 20, 4, 'rgba(255,60,60,.9)');
    if (cv >= v0 && cv < v1 && j < -3) sp.push({ type: 'turret', x: cx + 18, v: cv + 14 });
  });
} });
WATER.push(water6);
ROADX.push(null);

// ================= 第 7 關：火山灰原 → 熔岩河峽谷 → 火山口工業區 =================
const Z7 = v => { const d = -v; const can = smooth(1200, 1600, d) * (1 - smooth(2800, 3200, d)); return { ash: 1 - smooth(1200, 1600, d), can, cal: smooth(2800, 3200, d) }; };
const lavaX = v => 190 + Math.sin(v * 0.0019 + 1) * 85 + Math.sin(v * 0.0061) * 22;
const lavaW = v => { const z = Z7(v); return 16 + z.can * 40 + z.cal * 22 + Math.sin(v * 0.005) * 6; };
const RAIL7 = [64, 296];
const railOn = (v, k) => k === 0 || Z7(v).cal > 0.5;
const lava7 = (x, v) => Math.abs(x - lavaX(v)) < lavaW(v) / 2;
const H7 = (x, v) => {
  const z = Z7(v);
  let h = fbm(x * 0.006, v * 0.006, 701) * (30 + z.can * 50) + Math.pow(ridge(x * 0.011, v * 0.011, 702), 5) * 9;
  const dr = Math.abs(x - lavaX(v)), lw = lavaW(v);
  h -= Math.max(0, 1 - dr / (lw * 1.8)) * (14 + z.can * 30);
  return h;
};
const C7 = (x, v, h, s) => {
  const z = Z7(v);
  let c = mixC([46, 40, 40], [82, 72, 66], fbm(x * 0.012, v * 0.012, 703));
  c = mixC(c, [128, 122, 114], smooth(0.58, 0.72, vnoise(x * 0.008, v * 0.008, 704)) * (0.5 + z.ash * 0.5));
  c = mixC(c, [100, 60, 48], clamp((s - 0.5) * 1.6, 0, 1) * 0.6);
  const dr = Math.abs(x - lavaX(v)), lw = lavaW(v);
  c = mixC(c, [120, 40, 16], Math.max(0, 1 - (dr - lw / 2) / 14) * 0.8);
  return c;
};
PAINT.push({ H: H7, C: C7, k: 1.9, d: (g, v0, v1, sp) => {
  grain(g, v0, v1, 711, 0.07);
  // 地面發光裂縫
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  cells(60, 60, v0, v1, 30, (i, j, x, v) => {
    if (hash(i, j, 712) < 0.55) return;
    let px = x + hash(i, j, 713) * 60, pv = v + hash(i, j, 714) * 60;
    g.strokeStyle = 'rgba(255,90,20,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, pv);
    for (let k = 0; k < 4; k++) { px += (hash(k, i, j) - 0.5) * 24; pv += (hash(j, k, i) - 0.3) * 18; g.lineTo(px, pv); }
    g.stroke(); g.strokeStyle = 'rgba(255,200,80,.5)'; g.lineWidth = 0.7; g.stroke();
  });
  g.restore();
  // 熔岩河：外圍光暈、亮核心、漂浮的冷卻岩塊
  g.save(); g.globalCompositeOperation = 'lighter';
  bandPath(g, lavaX, v => lavaW(v) + 18, v0, v1, 0); g.fillStyle = 'rgba(255,80,10,.22)'; g.fill();
  g.restore();
  bandPath(g, lavaX, lavaW, v0, v1, 0);
  const lg = g.createLinearGradient(0, v0, W, v1); lg.addColorStop(0, '#ff6a10'); lg.addColorStop(0.5, '#ff9a20'); lg.addColorStop(1, '#ff5a0a'); g.fillStyle = lg; g.fill();
  bandPath(g, lavaX, v => lavaW(v) * 0.45, v0, v1, 0); g.fillStyle = 'rgba(255,240,150,.85)'; g.fill();
  for (let v = Math.floor(v0 / 16) * 16; v < v1; v += 16) {
    if (hash(2, v, 715) < 0.45) continue;
    const x = lavaX(v) + (hash(3, v, 715) - 0.5) * lavaW(v) * 0.7, r = 2.5 + hash(4, v, 715) * 4;
    g.fillStyle = '#3a1a10'; g.beginPath(); g.ellipse(x, v, r * 1.3, r, hash(5, v, 715) * 3, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,160,60,.8)'; g.lineWidth = 0.8; g.stroke();
  }
  // 鐵軌（穿過熔岩的地方是鐵橋）
  for (let k = 0; k < RAIL7.length; k++) {
    const rx = RAIL7[k];
    for (let v = Math.floor(v0 / 8) * 8; v < v1; v += 8) {
      if (!railOn(v, k)) continue;
      const onLava = lava7(rx, v) || lava7(rx - 10, v) || lava7(rx + 10, v);
      g.fillStyle = onLava ? '#5a5048' : 'rgba(30,22,18,.85)'; g.fillRect(rx - 9, v, 18, onLava ? 8 : 3);
      if (onLava) { g.fillStyle = '#8a8076'; g.fillRect(rx - 11, v, 2, 8); g.fillRect(rx + 9, v, 2, 8); }
    }
    g.fillStyle = '#9a9aa2';
    for (let v = Math.floor(v0 / 4) * 4; v < v1; v += 4) { if (!railOn(v, k)) continue; g.fillRect(rx - 5.5, v, 1.4, 4.2); g.fillRect(rx + 4.1, v, 1.4, 4.2); }
  }
  // 冒煙的噴氣孔、地熱發電塔
  cells(120, 150, v0, v1, 40, (i, j, x, v) => {
    const cx = x + 20 + hash(i, j, 716) * 80, cv = v + 20 + hash(i, j, 717) * 110, z = Z7(cv);
    if (lava7(cx, cv) || Math.abs(cx - lavaX(cv)) < lavaW(cv) / 2 + 30 || RAIL7.some((r, k) => railOn(cv, k) && Math.abs(cx - r) < 26)) return;
    const r = hash(i, j, 718);
    if (r < 0.35) { g.fillStyle = '#2a2222'; g.beginPath(); g.arc(cx, cv, 6, 0, TAU); g.fill(); glowDotT(g, cx, cv, 7, 'rgba(255,120,30,.7)'); g.fillStyle = 'rgba(200,200,200,.18)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(cx + 6 + k * 5, cv - 4 - k * 6, 5 + k * 2, 0, TAU); g.fill(); } }
    else if (r < 0.6 && z.cal + z.can * 0.3 > 0.4) {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(cx - 22, cv - 16, 50, 38);
      g.fillStyle = '#7a7470'; g.fillRect(cx - 24, cv - 18, 48, 36);
      dome(g, cx - 10, cv - 4, 8); dome(g, cx + 10, cv + 6, 6);
      g.strokeStyle = '#c8b090'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 24, cv + 14); g.lineTo(cx + 24, cv + 14); g.stroke();
      glowDotT(g, cx + 18, cv - 12, 4, 'rgba(255,200,60,.9)');
      if (cv >= v0 && cv < v1 && j < -3 && hash(i, j, 719) > 0.4) sp.push({ type: 'turret', x: cx - 10, v: cv - 4 });
    }
  });
} });
WATER.push(lava7);
ROADX.push(null);

// ================= 裝甲列車（第 7 關）=================
SPR.loco = { w: 24, h: 42, draw(g) { rr(g, -10, -20, 20, 40, 4, '#5a5048'); rr(g, -7, -18, 14, 10, 3, '#ffb03a'); } };
SPR.tcar = { w: 24, h: 34, draw(g) { rr(g, -10, -16, 20, 32, 3, '#4a4440'); } };
SPR.ebI = { w: 16, h: 16, draw(g) { circ(g, 0, 0, 7.5, rad(g, 0, 0, 7.5, ['rgba(140,220,255,.6)', 'rgba(80,160,255,0)'])); P_(g, [0, -6.5, 3.5, 0, 0, 6.5, -3.5, 0], 'rgba(20,40,80,.9)'); P_(g, [0, -5.2, 2.6, 0, 0, 5.2, -2.6, 0], lin(g, 0, -5, 0, 5, ['#ffffff', '#a8e8ff', '#4ab0ff'])); } };
Object.assign(ET, {
  loco: { hp: 18, r: 12, score: 800, ground: true, gs: 'loco', medal: 0.9, hb: [[0, -8, 11], [0, 10, 11]],
    init(e) { e.vy = 52; },
    update(e) { if (Math.random() < 0.15) fxP({ k: 's', x: e.x + rnd(-3, 3), y: e.y + 14, vx: rnd(-10, 10), vy: -30, r: 4, life: 0, max: 0.9, a: 0.35, g: true }); },
    draw(ctx, e) { spr(ctx, e, 'loco', 0); },
  },
  tcar: { hp: 12, r: 12, score: 500, ground: true, gs: 'tcar', medal: 0.6, hb: [[0, -6, 11], [0, 8, 11]],
    init(e) { e.vy = 52; e.tur = Math.PI / 2; e.ft = rnd(0.6, 1.6); },
    update(e, dt) {
      e.tur = turnTo(e.tur, aim(e.x, e.y), 2.5 * dt);
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 1.9; if (canShoot(e)) fan(e.x + Math.cos(e.tur) * 13, e.y + Math.sin(e.tur) * 13, e.tur, 2, 0.18, 145); }
    },
    draw(ctx, e) { spr(ctx, e, 'tcar', 0); Art.draw(ctx, 'gunTur', e.x, e.y, e.tur - Math.PI / 2, 1, 0.95, 0.95); },
  },
});

// ================= 頭目 6：冰原巨像（四隻腳的巨型機甲）=================
ET.boss6 = { name: '冰原巨像', en: 'FROST TITAN', hp: 1300, r: 46, score: 140000, boss: true, layer: 'ground', hb: [[0, -6, 44], [0, 42, 26]],
  init(e) { bossBase(e); e.y = -130; e.gl = Math.PI / 2; e.gr = Math.PI / 2; },
  update(e, dt) {
    e.gl = turnTo(e.gl, aim(e.x - 40, e.y - 18), 3 * dt); e.gr = turnTo(e.gr, aim(e.x + 40, e.y - 18), 3 * dt);
    if (bossEnter(e, dt, 155, 55)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.42) * 62; e.y = 155 + Math.sin(e.mt * 0.9) * 8;
    const p2 = phase2(e); bossSmoke(e);
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    e.ta -= f;
    if (e.ta <= 0) { e.ta = p2 ? 1.1 : 1.5; fan(e.x - 40, e.y - 18, e.gl, 3, 0.3, 155); fan(e.x + 40, e.y - 18, e.gr, 3, 0.3, 155); }
    e.tb -= f;
    if (e.tb <= 0) {
      e.tb = p2 ? 2.2 : 2.8;
      const a0 = aim(e.x, e.y + 40);
      for (const k of [-0.42, 0, 0.42]) { eShot(e.x, e.y + 40, a0 + k, 125, 'b'); G.eb[G.eb.length - 1].split = 0.75; }
      Snd.play('eshot');
    }
    if (p2) {
      e.tc -= f;
      if (e.tc <= 0) {
        e.tc = 1.7; e.sa += 0.7;
        const n = Math.max(12, Math.round(20 * G.d.dens));
        for (let i = 0; i < n; i++) { if (i % n < 3) continue; eShot(e.x, e.y, e.sa + i * TAU / n, 95); }
      }
    }
  },
  draw(ctx, e) {
    const x = e.x, y = e.y, ph = e.t * 3.2;
    const legs = [[-52, -38, 0], [52, -38, Math.PI], [-52, 40, Math.PI], [52, 40, 0]];
    for (const [lx, ly, o] of legs) { const off = Math.sin(ph + o) * 7; Art.draw(ctx, 'walkerLeg', x + lx + 4, y + ly + off + 6, 0, 0.3, 2.6, 2.6, 's'); Art.draw(ctx, 'walkerLeg', x + lx, y + ly + off, 0, 1, 2.6, 2.6); glowDot(ctx, x + lx, y + ly + off + 14, 6, 'rgba(90,200,255,.6)'); }
    Art.draw(ctx, 'b6', x + 6, y + 8, 0, 0.3, 1, 1, 's');
    Art.draw(ctx, 'b6', x, y);
    bFlash(ctx, 'b6', e);
    Art.draw(ctx, 'gunTur', x - 40, y - 18, e.gl - Math.PI / 2, 1, 1.3, 1.3);
    Art.draw(ctx, 'gunTur', x + 40, y - 18, e.gr - Math.PI / 2, 1, 1.3, 1.3);
    glowDot(ctx, x, y + 40, 12 + Math.sin(e.t * 5) * 3, e.p2 ? 'rgba(120,200,255,.95)' : 'rgba(120,220,255,.7)');
  },
};
// ================= 頭目 7：熔岩鑽地艦（外圈砲塔會轉，還會引爆熔岩柱）=================
ET.boss7 = { name: '熔岩鑽地艦', en: 'MAGMA DRILLER', hp: 1500, r: 60, score: 170000, boss: true, layer: 'ground', hb: [[0, 0, 58]],
  init(e) { bossBase(e); e.y = -140; e.ring = 0; e.k = 0; e.tur = Math.PI / 2; },
  update(e, dt) {
    e.ring += dt * (e.p2 ? 0.9 : 0.55);
    e.tur = turnTo(e.tur, aim(e.x, e.y), 1.3 * dt);
    if (bossEnter(e, dt, 150, 55)) return;
    e.mt += dt;
    e.x = 180 + Math.sin(e.mt * 0.3) * 40; e.y = 150 + Math.sin(e.mt * 0.7) * 8;
    const p2 = phase2(e); bossSmoke(e);
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    e.ta -= f;
    if (e.ta <= 0) {
      e.ta = p2 ? 0.22 : 0.32; e.k = (e.k + 1) % 6;
      const a = e.ring + e.k * TAU / 6, px = e.x + Math.cos(a) * 68, py = e.y + Math.sin(a) * 68;
      eShot(px, py, a, 105); if (e.k % 2 === 0) eShot(px, py, aim(px, py), 140);
    }
    e.tb -= f;
    if (e.tb <= 0) { e.tb = 3; fan(e.x + Math.cos(e.tur) * 40, e.y + Math.sin(e.tur) * 40, e.tur, 7, 0.9, 140, 'b'); }
    e.tc -= f;
    if (e.tc <= 0) {
      e.tc = p2 ? 3.6 : 5;
      if (G.d.beams) {
        const xs = p2 ? [rnd(30, 120), rnd(150, 210), rnd(240, 330)] : [P.x + rnd(-30, 30), rnd(30, 330)];
        for (const bx of xs) G.beams.push({ x: clamp(bx, 20, W - 20), y: e.y + 70, w: 30, t: 0, warn: 1.1, life: 0.8, col: 'o' });
        Snd.play('warn');
      } else ring(e.x, e.y, 12, 90, e.mt);
    }
  },
  draw(ctx, e) {
    const x = e.x, y = e.y;
    glowDot(ctx, x, y, 110, 'rgba(255,90,20,.25)');
    Art.draw(ctx, 'b7', x + 6, y + 8, 0, 0.35, 1, 1, 's');
    Art.draw(ctx, 'b7', x, y);
    bFlash(ctx, 'b7', e);
    Art.draw(ctx, 'b7ring', x, y, e.ring);
    for (let i = 0; i < 6; i++) { const a = e.ring + i * TAU / 6; Art.draw(ctx, 'gunTur', x + Math.cos(a) * 68, y + Math.sin(a) * 68, a - Math.PI / 2, 1, 1.05, 1.05); }
    Art.draw(ctx, 'b4tur', x, y, e.tur - Math.PI / 2, 1, 0.8, 0.8);
    glowDot(ctx, x, y, 18 + Math.sin(e.t * 8) * 4, e.p2 ? 'rgba(255,80,30,.95)' : 'rgba(255,170,60,.75)');
  },
};
ET.boss6.onDeath = e => bossDown(e);
ET.boss7.onDeath = e => bossDown(e);

// 2D 備用
SPR.b6 = { w: 150, h: 130, draw(g) { const o = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; o.push(Math.cos(a) * 70, Math.sin(a) * 58); } P_(g, o, '#b8d0e4'); circ(g, 0, 40, 14, '#4ab0ff'); } };
SPR.b7 = { w: 140, h: 140, draw(g) { circ(g, 0, 0, 62, '#4a3a34'); circ(g, 0, 0, 40, '#2a2220'); } };
SPR.b7ring = { w: 170, h: 170, draw(g) { circ(g, 0, 0, 76, null, '#6a5a50', 10); } };

// ================= 3D 模型 =================
Object.assign(EXTRA_MODELS, {
  loco(K) {
    const BD = K.M(0x5a524a, { m: 0.7, r: 0.4 }), DK = K.M(0x24201e, { m: 0.8, r: 0.5 }), OR = K.M(0xd07a20, { m: 0.4, r: 0.35, cc: 0.8 });
    K.rbox(20, 40, 6, 0, 0, 0, DK, 0.6);
    K.rbox(17, 26, 6, 0, 5, 5, BD, 1.2);
    K.rbox(17, 10, 8, 0, -13, 5, OR, 1.2);
    K.bar(-6, -18, 6, -18, 10, 1, 1.4, K.glass(0x2a1a05, 0x6a3a00));
    K.cylV(2.4, 2.8, 4, 0, 10, 10, DK);
    for (const s of [-1, 1]) K.sph(1, 0.8, 0.8, s * 6, 6, -20, K.G(0xfff0a0, 2.8));
  },
  tcar(K) {
    const BD = K.M(0x4a4440, { m: 0.7, r: 0.42, cc: 0.4 }), DK = K.M(0x24201e, { m: 0.8, r: 0.5 });
    K.rbox(20, 32, 5, 0, 0, 0, DK, 0.6);
    K.rbox(18, 28, 4, 0, 0, 4.5, BD, 1);
    K.cylV(8, 8.5, 1, 0, 8.5, 0, DK);
    for (const s of [-1, 1]) K.bar(s * 9.5, -10, s * 9.5, 10, 6, 0.6, 1, K.G(0xff6a2a, 2));
  },
  b6(K) {
    const AR = K.M(0x6e86a2, { m: 0.6, r: 0.32, cc: 0.9 }), AR2 = K.M(0x3c4e66, { m: 0.7, r: 0.32 }), DK = K.M(0x182232, { m: 0.85, r: 0.4 }), CY = K.G(0x5fd8ff, 2.6);
    const hex = (rx, rz, oz = 0) => { const o = []; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; o.push(Math.cos(a) * rx, Math.sin(a) * rz + oz); } return o; };
    K.ext(hex(68, 56), 14, AR2, 4, 2.5);
    K.ext(hex(54, 44, -4), 4, AR, 18, 1.4);
    K.rbox(40, 22, 4, 0, 30, 18, DK, 1);
    K.bar(-14, 40, 14, 40, 22.5, 2.2, 1.2, K.glass(0x0b2a40, 0x0a5a8a));
    for (let k = 0; k < 4; k++) { K.rbox(8, 16, 1.6, -27 + k * 18, -32, 21.5, DK, 0.3); K.bar(-27 + k * 18, -38, -27 + k * 18, -26, 23, 1.6, 0.4, CY); }
    for (const s of [-1, 1]) { K.cylV(10, 11, 2.4, s * 40, 21.6, -18, DK); K.barM(46, -6, 60, 18, 18.4, 1, 0.4, CY); }
    for (const [x, z] of [[-52, -38], [52, -38], [-52, 40], [52, 40]]) K.cylV(9, 10, 3, x, 4, z, DK);
  },
  b7(K) {
    const RK = K.M(0x4a3a34, { m: 0.6, r: 0.45, cc: 0.3 }), DK = K.M(0x231c1a, { m: 0.85, r: 0.45 }), OR = K.G(0xff6a1a, 2.6);
    K.cylV(62, 64, 10, 0, 0, 0, RK);
    K.cylV(50, 54, 4, 0, 10, 0, DK);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; K.bar(Math.cos(a) * 30, Math.sin(a) * 30, Math.cos(a) * 48, Math.sin(a) * 48, 14.2, 2, 0.5, i % 2 ? OR : DK); }
    K.cylV(26, 28, 3, 0, 14, 0, RK);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; K.sph(2, 1.2, 2, Math.cos(a) * 58, 10.5, Math.sin(a) * 58, K.G(0xffa040, 2.6)); }
  },
  b7ring(K) {
    const RG = K.M(0x6a5a50, { m: 0.8, r: 0.35, cc: 0.5 }), DK = K.M(0x2a2220, { m: 0.9, r: 0.4 });
    const geo = new K.T.TorusGeometry(70, 7, 12, 64); geo.rotateX(Math.PI / 2); K.add(geo, RG, 0, 16, 0);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; K.cylV(10, 11, 3, Math.cos(a) * 68, 18, Math.sin(a) * 68, DK); }
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12 + 0.13; K.box(3, 1, 5, Math.cos(a) * 70, 23, Math.sin(a) * 70, DK).rotation.y = -a; }
  },
});
EXTRA_BAKES.push(
  ['loco', 24, 42, EXTRA_MODELS.loco, { rot: Math.PI }],
  ['tcar', 24, 34, EXTRA_MODELS.tcar],
  ['b6', 150, 130, EXTRA_MODELS.b6, { glow: 0.8 }],
  ['b7', 140, 140, EXTRA_MODELS.b7, { glow: 0.8 }],
  ['b7ring', 170, 170, EXTRA_MODELS.b7ring],
);

// ================= 波次與關卡 =================
Object.assign(WAVES, {
  train: q => {
    const k = Z7(-30 - H - G.scroll).cal > 0.5 && Math.random() < 0.5 ? 1 : 0, x = RAIL7[k];
    q(0, () => spawn('loco', x, -40));
    for (let i = 1; i <= 3; i++) q(i * 0.68, () => spawn('tcar', x, -40));
    return 4;
  },
  iceBoats: q => { for (let i = 0; i < 3; i++) q(i * 0.7, () => { const x = groundX(rnd(60, 300), 'water'); if (x !== null) spawn('boat', x, -30); }); return 3; },
});
STAGES.push(
  { name: '冰原前線', en: 'FROZEN FRONT', boss: 'boss6', amb: 'snow',
    seq: ['droneW', 'walkers', 'fDown', 'carrierP', 'tanks3', 'icpt', 'crates', 'snakeL', 'chop2', 'fSwoopL', 'fSwoopR', 'iceBoats', 'mines', 'carrierS', 'jetsUp', 'heavy', 'iceBoats', 'fDive', 'snakeR', 'walkers', 'carrierP', 'icpt', 'tanks3', 'bomber', 'carrierB', 'walkers', 'droneW'] },
  { name: '熔岩地帶', en: 'MAGMA ZONE', boss: 'boss7', amb: 'ember', speed: 50,
    seq: ['fDown', 'train', 'droneL', 'walkers', 'carrierP', 'icpt', 'tanks3', 'crates', 'chop2', 'snakeR', 'train', 'fSwoopL', 'fSwoopR', 'carrierS', 'mines', 'heavy', 'jetsUp', 'walkers', 'train', 'fDive', 'carrierP', 'icpt', 'snakeL', 'bomber', 'crates', 'carrierB', 'train', 'fSine'] },
);
Object.assign(SONGS, {
  s5: { bpm: 136, key: 50, prog: [[0, 'm'], [-4, 'M'], [-2, 'M'], [-7, 'm']], seed: 113, drums: 2 },
  s6: { bpm: 162, key: 40, prog: [[0, 'm'], [0, 'm'], [3, 'M'], [1, 'M']], seed: 131, drums: 3 },
});
