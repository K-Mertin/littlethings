'use strict';
// 第 13 關 A 路線「霓虹夜城」：雨夜的霓虹商業區 → 高架磁浮軌道區 → 摩天巨塔區
// 新敵人：探照燈塔（照到你會叫來增援）、浮空警車、全像廣告機；中頭目「廣告飛船」；頭目「幻象戰艦」（會放出全像分身）

// ================= 地形 =================
const Z13 = v => { const d = -v; const rail = smooth(1200, 1600, d) * (1 - smooth(2800, 3200, d)); return { down: 1 - smooth(1200, 1600, d), rail, tower: smooth(2800, 3200, d) }; };
const BW13 = 80, BH13 = 96, ST13 = 14, RX13 = [112, 248];
const towerAt13 = j => (j < -1 && ((j % 2) + 2) % 2 === 0) ? { x: 180 + (hash(j, 3, 1330) - 0.5) * 90, v: j * 300 + 150, r: 66 } : null;
function tower13(x, v) {
  const j = Math.floor(v / 300);
  for (const jj of [j - 1, j, j + 1]) { const T = towerAt13(jj); if (T && Math.hypot(x - T.x, v - T.v) < T.r + 12) return T; }
  return null;
}
// 這個位置是哪一棟樓：回傳 [樓高, 區塊 i, j, 子棟 k, 範圍]，馬路回傳 null
function bld13(x, v) {
  const z = Z13(v);
  if (z.rail > 0.5) for (const rx of RX13) if (Math.abs(x - rx) < 22) return null;
  if (z.tower > 0.5 && tower13(x, v)) return null;
  const i = Math.floor(x / BW13), j = Math.floor(v / BH13), lx = x - i * BW13, lv = v - j * BH13;
  if (lx < ST13 || lv < ST13) return null;
  const s = hash(i, j, 1301), iw = BW13 - ST13, ih = BH13 - ST13;
  let k = 0, x0 = i * BW13 + ST13, x1 = (i + 1) * BW13, y0 = j * BH13 + ST13, y1 = (j + 1) * BH13;
  if (s < 0.4) { const m = ST13 + iw * (0.4 + hash(i, j, 1302) * 0.2); if (Math.abs(lx - m) < 1.6) return null; k = lx > m ? 1 : 0; if (k) x0 = i * BW13 + m; else x1 = i * BW13 + m; }
  else if (s < 0.72) { const m = ST13 + ih * (0.35 + hash(i, j, 1303) * 0.3); if (Math.abs(lv - m) < 1.6) return null; k = lv > m ? 1 : 0; if (k) y0 = j * BH13 + m; else y1 = j * BH13 + m; }
  const hb = 10 + hash(i * 3 + k, j, 1304) * 30 * (1 + z.tower * 0.5);
  const edge = Math.min(x - x0, x1 - x, v - y0, y1 - v);
  return [edge < 2.2 ? hb + 1.5 : hb, i, j, k, x0, x1, y0, y1];
}
const H13 = (x, v) => {
  const z = Z13(v);
  if (z.rail > 0.5) for (const rx of RX13) { const d = Math.abs(x - rx); if (d < 9) return 30; if (d < 22) return 0; }
  if (z.tower > 0.5) { const T = tower13(x, v); if (T) { const d = Math.hypot(x - T.x, v - T.v); return d < 22 ? 64 : d < 44 ? 52 : d < T.r ? 40 : 0; } }
  const b = bld13(x, v);
  return b ? b[0] : vnoise(x * 0.2, v * 0.2, 1305) * 0.4;
};
const ROOF13 = [[46, 50, 64], [60, 56, 70], [40, 48, 60], [66, 64, 76], [52, 46, 58], [44, 56, 62]];
const C13 = (x, v, h) => {
  const z = Z13(v), b = bld13(x, v);
  if (z.tower > 0.5) { const T = tower13(x, v); if (T) { const d = Math.hypot(x - T.x, v - T.v); return d < 22 ? [70, 84, 110] : d < 44 ? [54, 64, 88] : [44, 52, 72]; } }
  if (!b) {
    if (h > 20) return [70, 76, 92];
    const wet = vnoise(x * 0.05, v * 0.05, 1306);
    return mixC([16, 18, 28], [30, 30, 44], wet * 0.7);
  }
  const base = ROOF13[(hash(b[1] * 3 + b[3], b[2], 1307) * ROOF13.length) | 0];
  return mixC(base, [90, 92, 110], clamp((b[0] - 10) / 60, 0, 1) * 0.35 + fbm(x * 0.05, v * 0.05, 1308) * 0.12);
};
const SIGNS13 = ['夜市', '拉麵', '電玩', '旅館', '咖啡', '書店', '藥局', '網咖', '火鍋', '雞排', '茶', '酒', '24H', 'KTV', '豆花', '當舖'];
const NEON13 = ['255,70,200', '70,230,255', '160,110,255', '255,200,70', '90,255,160', '255,90,90'];
function neonRect(g, x, y, w, h, col, lw = 1.2) {
  g.strokeStyle = `rgba(${col},.35)`; g.lineWidth = lw * 3.4; g.strokeRect(x, y, w, h);
  g.strokeStyle = `rgba(${col},.95)`; g.lineWidth = lw; g.strokeRect(x, y, w, h);
}
function neonSign(g, x, y, s, col, rot) {
  g.save(); g.translate(x, y); if (rot) g.rotate(rot);
  const w = s.length * 9 + 6;
  g.fillStyle = 'rgba(8,4,16,.85)'; g.fillRect(-w / 2, -7, w, 14);
  neonRect(g, -w / 2, -7, w, 14, col, 0.8);
  g.font = '900 9px "Noto Sans TC","PingFang TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = `rgba(${col},.45)`; g.fillText(s, 0.6, 0.8); g.fillText(s, -0.6, 0.2);
  g.fillStyle = '#fff'; g.fillText(s, 0, 0.5);
  g.restore();
}
PAINT.push({ H: H13, C: C13, k: 1.5, d: (g, v0, v1, sp) => {
  grain(g, v0, v1, 1310, 0.07);
  // 馬路：濕路面的霓虹倒影、路燈、車燈
  g.save(); g.globalCompositeOperation = 'lighter';
  cells(BW13, BH13, v0, v1, 10, (i, j, x, v) => {
    const sx = x + ST13 / 2;
    if (Z13(v).rail > 0.5 && RX13.some(r => Math.abs(sx - r) < 26)) return;
    for (let k = 0; k < 3; k++) { const yy = v + hash(i, j, 1311 + k) * BH13; glowDotT(g, sx, yy, 10 + hash(j, i, 1311 + k) * 10, `rgba(${NEON13[(hash(i, k, j) * 6) | 0]},.13)`); }
    for (let yy = v + 6; yy < v + BH13; yy += 22) { g.fillStyle = 'rgba(255,214,140,.7)'; g.fillRect(sx - ST13 / 2 + 1, yy, 1.4, 1.4); glowDotT(g, sx - ST13 / 2 + 1.6, yy, 6, 'rgba(255,190,110,.18)'); }
    // 車流：往上走是白色頭燈、往下是紅色尾燈
    for (let k = 0; k < 4; k++) {
      const yy = v + hash(i * 7 + k, j, 1312) * BH13, up = k % 2 === 0;
      g.fillStyle = up ? 'rgba(255,250,220,.85)' : 'rgba(255,40,40,.85)';
      g.fillRect(sx + (up ? -3.6 : 1.6), yy, 1.3, 4 + hash(k, i, j) * 6); g.fillRect(sx + (up ? -1.6 : 3.6), yy, 1.3, 4 + hash(k, i, j) * 6);
    }
    for (let k = 0; k < 2; k++) { const xx = x + ST13 + hash(i, j * 5 + k, 1313) * (BW13 - ST13), up = k === 0; g.fillStyle = up ? 'rgba(255,250,220,.8)' : 'rgba(255,40,40,.8)'; g.fillRect(xx, v + (up ? 4 : 8), 5 + hash(k, j, i) * 5, 1.2); }
  });
  g.restore();
  // 屋頂細節
  cells(BW13, BH13, v0, v1, 0, (i, j, x, v) => {
    const z = Z13(v + 48); if (z.tower > 0.5 && tower13(x + 40, v + 48)) return;
    const s = hash(i, j, 1301);
    const parts = s < 0.4 ? 2 : s < 0.72 ? 2 : 1;
    for (let k = 0; k < parts; k++) {
      const cx = x + ST13 + 6 + hash(i * 3 + k, j, 1314) * (BW13 - ST13 - 22), cv = v + ST13 + 6 + hash(j, i * 3 + k, 1314) * (BH13 - ST13 - 22);
      const b = bld13(cx, cv); if (!b || b[3] !== k) continue;
      const [hb, , , , bx0, bx1, by0, by1] = b, w = bx1 - bx0, hh = by1 - by0, seed = hash(i * 3 + k, j, 1315);
      // 空調機組
      for (let q = 0; q < 3; q++) { const ax = bx0 + 4 + hash(q, i, j * 3 + k) * (w - 14), ay = by0 + 4 + hash(j, q, i * 3 + k) * (hh - 12); if (Math.abs(ax - cx) < 10 && Math.abs(ay - cv) < 10) continue; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(ax + 1.5, ay + 2, 8, 6); g.fillStyle = '#7a8090'; g.fillRect(ax, ay, 8, 6); g.strokeStyle = '#3a3e4a'; g.lineWidth = 0.6; g.beginPath(); g.arc(ax + 2.6, ay + 3, 1.8, 0, TAU); g.arc(ax + 5.8, ay + 3, 1.8, 0, TAU); g.stroke(); }
      if (seed < 0.22 && w > 30 && hh > 30) { // 停機坪
        const px = bx0 + w / 2, pv = by0 + hh / 2, r = Math.min(w, hh) * 0.32;
        g.fillStyle = '#2c3240'; g.beginPath(); g.arc(px, pv, r, 0, TAU); g.fill();
        g.strokeStyle = '#e8d070'; g.lineWidth = 1; g.beginPath(); g.arc(px, pv, r * 0.82, 0, TAU); g.stroke();
        g.fillStyle = '#e8e8e8'; g.font = `900 ${r * 0.9}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', px, pv + 0.5);
        g.save(); g.globalCompositeOperation = 'lighter'; for (let q = 0; q < 8; q++) { const a = q * TAU / 8; glowDotT(g, px + Math.cos(a) * r, pv + Math.sin(a) * r, 3, 'rgba(120,255,160,.9)'); } g.restore();
      } else if (seed < 0.4) dome(g, bx0 + w * 0.7, by0 + hh * 0.3, 4 + seed * 8);
      // 霓虹框與招牌
      g.save(); g.globalCompositeOperation = 'lighter';
      if (seed > 0.45) neonRect(g, bx0 + 1.5, by0 + 1.5, w - 3, hh - 3, NEON13[(seed * 97 | 0) % 6], 0.9);
      g.restore();
      if (seed > 0.3 && w > 26) neonSign(g, bx0 + w / 2, by1 - 9, SIGNS13[(hash(i, j * 3 + k, 1316) * SIGNS13.length) | 0], NEON13[(hash(j, i, 1317) * 6) | 0], 0);
      // 探照燈塔
      if (cv >= v0 && cv < v1 && j < -3 && (j & 1) && hb > 24 && hash(i * 3 + k, j, 1318) > 0.86 && z.rail < 0.5) sp.push({ type: 'slight', x: bx0 + w / 2, v: by0 + hh * 0.4 });
    }
  });
  // 磁浮軌道
  cells(40, 60, v0, v1, 0, (i, j, x, v) => {
    if (i !== 0) return;
    if (Z13(v + 30).rail < 0.5) return;
    for (const rx of RX13) {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(rx - 6, v, 18, 60);
      if (((j % 4) + 4) % 4 === 0) { g.fillStyle = '#556078'; g.fillRect(rx - 20, v + 20, 40, 18); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(rx - 20, v + 20, 40, 4); }
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const o of [-4, 4]) { g.strokeStyle = 'rgba(80,230,255,.25)'; g.lineWidth = 4; g.beginPath(); g.moveTo(rx + o, v); g.lineTo(rx + o, v + 60); g.stroke(); g.strokeStyle = 'rgba(180,250,255,.9)'; g.lineWidth = 1; g.stroke(); }
      for (let y = v + 5; y < v + 60; y += 15) glowDotT(g, rx, y, 3, 'rgba(255,120,220,.7)');
      g.restore();
    }
  });
  // 摩天巨塔
  for (let jj = Math.floor((v0 - 160) / 300); jj <= Math.floor((v1 + 160) / 300); jj++) {
    const T = towerAt13(jj); if (!T || T.v < v0 - 120 || T.v > v1 + 120) continue;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [r, c] of [[T.r, '255,70,200'], [44, '70,230,255'], [22, '255,200,70']]) {
      g.strokeStyle = `rgba(${c},.16)`; g.lineWidth = 4; g.beginPath(); g.arc(T.x, T.v, r - 2, 0, TAU); g.stroke();
      g.strokeStyle = `rgba(${c},.5)`; g.lineWidth = 0.8; g.stroke();
    }
    // 巨塔頂的窗格光點
    for (let q = 0; q < 40; q++) { const a = hash(q, jj, 1332) * TAU, r = 24 + hash(jj, q, 1332) * 38; g.fillStyle = hash(q, q, jj) > 0.5 ? 'rgba(255,220,150,.55)' : 'rgba(150,220,255,.5)'; g.fillRect(T.x + Math.cos(a) * r, T.v + Math.sin(a) * r, 1.4, 1.4); }
    for (let q = 0; q < 24; q++) { const a = q * TAU / 24; glowDotT(g, T.x + Math.cos(a) * 55, T.v + Math.sin(a) * 55, 2.6, 'rgba(255,240,200,.8)'); }
    glowDotT(g, T.x, T.v, 40, 'rgba(255,80,200,.25)');
    g.restore();
    g.strokeStyle = '#c8d0e0'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(T.x, T.v - 16); g.lineTo(T.x, T.v + 16); g.moveTo(T.x - 16, T.v); g.lineTo(T.x + 16, T.v); g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter'; glowDotT(g, T.x, T.v, 6, 'rgba(255,60,60,1)'); g.restore();
    if (T.v >= v0 && T.v < v1) sp.push({ type: 'slight', x: T.x + (hash(jj, 9, 1331) > 0.5 ? 34 : -34), v: T.v + 24 });
  }
} });
WATER.push(() => false);
ROADX.push((x) => { const i = Math.round(x / BW13); const r = i * BW13 + ST13 / 2; return r > 10 && r < W - 10 && Math.abs(r - x) < 46 ? r : null; });

// ================= 環境：夜雨 =================
AMB2.rain = {
  update(dt) {
    const A = G.amb;
    while (A.length < 70) A.push({ x: rnd(-40, W + 40), y: rnd(-40, H), l: rnd(8, 16), sp: rnd(560, 760), a: rnd(0.15, 0.35) });
    for (const p of A) { p.x -= p.sp * 0.16 * dt; p.y += p.sp * dt; if (p.y > H + 20) { p.y = rnd(-60, -10); p.x = rnd(-20, W + 60); } }
  },
  draw(ctx) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 1;
    for (const p of G.amb) { ctx.strokeStyle = `rgba(170,200,255,${p.a})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.l * 0.16, p.y - p.l); ctx.stroke(); }
    ctx.restore();
    const vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(60,10,80,.32)'); vg.addColorStop(0.3, 'rgba(10,10,40,0)'); vg.addColorStop(0.8, 'rgba(10,10,40,0)'); vg.addColorStop(1, 'rgba(0,30,60,.35)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },
};

// ================= 敵人 =================
SPR.pcar = { w: 22, h: 30, draw(g) { rr(g, -8, -13, 16, 26, 5, '#e8ecf4'); rr(g, -8, -2, 16, 8, 2, '#1a2a60'); rr(g, -5, -9, 10, 7, 2, '#203040'); } };
SPR.slight = { w: 28, h: 28, draw(g) { circ(g, 0, 0, 10, '#4a5262'); rr(g, -5, -13, 10, 12, 3, '#8a92a2'); circ(g, 0, -12, 4, '#fff6d0'); } };
SPR.holo = { w: 26, h: 26, draw(g) { circ(g, 0, 0, 9, '#3a4256'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; circ(g, Math.cos(a) * 10, Math.sin(a) * 10, 4, '#5a6276'); } circ(g, 0, 0, 3.6, '#ff6ad8'); } };
SPR.blimp = { w: 96, h: 230, draw(g) { g.fillStyle = '#5a5f74'; g.beginPath(); g.ellipse(0, 0, 40, 110, 0, 0, TAU); g.fill(); g.fillStyle = '#101018'; g.fillRect(-20, -60, 40, 90); } };
Object.assign(ET, {
  // 探照燈塔：光照到玩家一陣子就會「發現目標」，叫浮空警車過來
  slight: { hp: 14, r: 12, score: 600, ground: true, medal: 0.7, gs: 'pad',
    init(e) { e.a0 = Math.PI / 2 + rnd(-0.35, 0.35); e.ph = rnd(TAU); e.spot = 0; e.cd = 0; e.a = e.a0; e.alarm = 0; },
    update(e, dt) {
      e.cd -= dt; e.alarm = Math.max(0, e.alarm - dt);
      const len = 175, half = 0.23;
      let seen = false;
      if (P.alive && !P.auto && e.y > -10 && e.y < H - 40 && G.phase === 'fight') {
        const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy);
        let da = Math.atan2(dy, dx) - e.a; da = ((da + Math.PI * 3) % TAU) - Math.PI;
        seen = d < len && Math.abs(da) < half;
        if (seen) e.a = turnTo(e.a, Math.atan2(dy, dx), 1.1 * dt);
      }
      if (seen) e.spot += dt; else { e.spot = Math.max(0, e.spot - dt * 0.7); e.ph += dt * 0.95; e.a = turnTo(e.a, e.a0 + Math.sin(e.ph) * 0.95, 1.6 * dt); }
      if (e.spot > 0.6 && e.cd <= 0) {
        e.cd = 7; e.spot = 0; e.alarm = 1.4;
        popText(e.x, e.y - 22, '發現目標！', '#ff5a8a'); Snd.play('warn');
        const n = G.d.dens >= 1 ? 2 : 1, ty = clamp(P.y - rnd(170, 230), 80, 320);
        for (let k = 0; k < n; k++) G.queue.push({ t: G.st + 0.5 + k * 0.4, fn: () => { const dir = (k + (e.x > 180 ? 1 : 0)) % 2 ? -1 : 1; spawn('pcar', dir > 0 ? -24 : W + 24, ty + k * 36, { dir, ty: ty + k * 36 }); } });
      }
    },
    draw(ctx, e) {
      const len = 175, half = 0.23, red = e.spot > 0.25 || e.alarm > 0;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(e.x, e.y, 6, e.x, e.y, len);
      const c = red ? '255,70,90' : '255,245,200', k = red ? 0.32 + 0.18 * Math.sin(G.t * 20) : 0.2;
      g.addColorStop(0, `rgba(${c},${k + 0.15})`); g.addColorStop(0.7, `rgba(${c},${k * 0.6})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, len, e.a - half, e.a + half); ctx.closePath(); ctx.fill();
      ctx.restore();
      Art.draw(ctx, 'pad', e.x, e.y);
      spr(ctx, e, 'slight', e.a + Math.PI / 2);
      glowDot(ctx, e.x + Math.cos(e.a) * 11, e.y + Math.sin(e.a) * 11, red ? 9 : 7, red ? 'rgba(255,80,100,.95)' : 'rgba(255,250,220,.95)');
      if (e.spot > 0.05) { // 發現量表
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 12, e.y - 22, 24, 3.4);
        ctx.fillStyle = '#ff5a8a'; ctx.fillRect(e.x - 12, e.y - 22, 24 * Math.min(1, e.spot / 0.6), 3.4);
      }
    },
  },
  // 浮空警車：從側邊衝進來，一邊橫移一邊開火
  pcar: { hp: 4, r: 10, score: 300, spr: 'pcar',
    init(e, o) { e.dir = o.dir || 1; e.ty = o.ty || 160; e.vx = e.dir * 175; e.ft = rnd(0.45, 0.8); e.ang = e.dir * Math.PI / 2; },
    update(e, dt) {
      e.vy = (e.ty + Math.sin(e.t * 2.4) * 18 - e.y) * 2;
      e.vx = e.dir * (e.t < 0.6 ? 230 : 150);
      e.ang = Math.atan2(e.vy, e.vx) + Math.PI / 2;
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 1.15; if (canShoot(e) && Math.random() < G.d.shotChance + 0.25) for (let k = 0; k < 2; k++) G.queue.push({ t: G.st + k * 0.13, fn: () => { if (!e.dead && canShoot(e)) eShot(e.x, e.y, aim(e.x, e.y), 150); } }); }
    },
    draw(ctx, e) {
      spr(ctx, e, 'pcar', e.ang);
      const on = Math.floor(G.t * 10) % 2;
      const px = e.x + Math.cos(e.ang + Math.PI / 2) * 1, py = e.y + Math.sin(e.ang + Math.PI / 2) * 1, nx = Math.cos(e.ang), ny = Math.sin(e.ang);
      glowDot(ctx, px - nx * 4, py - ny * 4, 7, on ? 'rgba(255,40,60,.95)' : 'rgba(255,40,60,.3)');
      glowDot(ctx, px + nx * 4, py + ny * 4, 7, on ? 'rgba(60,120,255,.3)' : 'rgba(60,140,255,.95)');
    },
  },
  // 全像廣告機：停在空中投射廣告，打出旋轉的光彈環
  holo: { hp: 7, r: 12, score: 450, spr: 'holo',
    init(e, o) { e.vy = 70; e.stop = o.stop || rnd(100, 220); e.ft = rnd(0.8, 1.4); e.sa = rnd(TAU); e.word = pick(['特價', '新品', '歡迎', '限時', '好吃', '必買']); e.col = pick(NEON13); },
    update(e, dt) {
      if (e.st === undefined) { e.vy = Math.max(10, (e.stop - e.y) * 2); if (e.y >= e.stop - 2) { e.st = 0; e.vy = 0; } }
      else { e.st += dt; e.vy = e.st > 5.5 ? 60 : 0; e.vx = Math.sin(e.st * 1.3) * 14; }
      e.ft -= dt * G.d.fr;
      if (e.ft <= 0) { e.ft = 2.3; if (canShoot(e)) { ring(e.x, e.y, 8, 85, e.sa, 'c'); e.sa += 0.35; } }
    },
    draw(ctx, e) {
      const fl = Math.random() < 0.06 ? 0.3 : 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fl;
      ctx.fillStyle = `rgba(${e.col},.16)`; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - 20, e.y - 38); ctx.lineTo(e.x + 20, e.y - 38); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(${e.col},.22)`; ctx.fillRect(e.x - 22, e.y - 54, 44, 18);
      ctx.strokeStyle = `rgba(${e.col},.9)`; ctx.lineWidth = 1; ctx.strokeRect(e.x - 22, e.y - 54, 44, 18);
      ctx.fillStyle = `rgba(${e.col},.25)`; for (let y = e.y - 53 + (G.t * 20) % 3; y < e.y - 36; y += 3) ctx.fillRect(e.x - 21, y, 42, 1);
      ctx.font = '900 11px ' + CJK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(e.word, e.x + (Math.random() < 0.05 ? 2 : 0), e.y - 45);
      ctx.restore();
      spr(ctx, e, 'holo', e.t * 0.5);
      glowDot(ctx, e.x, e.y, 8, `rgba(${e.col},.85)`);
    },
  },
  // 中頭目：廣告飛船（LED 看板會排出圖案彈幕）
  blimp: { hp: 520, r: 34, score: 13000, big: 1, drop: ['P', 'S'], hb: [[0, -64, 26], [0, -18, 36], [0, 30, 36], [0, 76, 22]],
    init(e) { e.vy = 50; e.ft = 1.2; e.tb = 2.6; e.tc = 4.5; e.gi = 0; e.tur = [Math.PI / 2, Math.PI / 2]; },
    update(e, dt) {
      e.tur = e.tur.map((a, i) => turnTo(a, aim(e.x + (i ? 30 : -30), e.y + 62), 2.4 * dt));
      if (e.st === undefined) { e.vy = Math.max(12, (175 - e.y) * 1.1); if (e.y >= 171) { e.st = 0; e.x0 = e.x; e.vy = 0; } return; }
      e.st += dt; e.vy = e.st > 19 ? 55 : 0;
      e.x = e.x0 + Math.sin(e.st * 0.4) * 62;
      if (!canShoot(e) || e.st > 19) return;
      const f = dt * G.d.fr;
      e.ft -= f; if (e.ft <= 0) { e.ft = 0.6; e.gi ^= 1; const ox = e.gi ? 30 : -30; fan(e.x + ox, e.y + 62, e.tur[e.gi], 3, 0.28, 155); }
      e.tb -= f; if (e.tb <= 0) { e.tb = 4.2; blimpPixels(e); }
      e.tc -= f; if (e.tc <= 0) { e.tc = 5; for (const s of [-1, 1]) for (let k = 0; k < 6; k++) eShot2(e.x + s * 40, e.y - 40 + k * 18, s > 0 ? 0.3 : Math.PI - 0.3, 80, 'c', { av: s * 0.55 }); Snd.play('eshot'); }
    },
    shadow(ctx, e) { Art.shadow(ctx, 'blimp', e.x, e.y, 0, 0.9); },
    draw(ctx, e) {
      spr(ctx, e, 'blimp', 0);
      // LED 看板：跑馬燈
      ctx.save(); ctx.beginPath(); ctx.rect(e.x - 17, e.y - 54, 34, 84); ctx.clip();
      ctx.fillStyle = '#05040c'; ctx.fillRect(e.x - 17, e.y - 54, 34, 84);
      ctx.globalCompositeOperation = 'lighter';
      const msg = '霓虹夜城★歡迎光臨★', hue = (G.t * 60) % 360;
      ctx.font = '900 15px ' + CJK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let k = 0; k < msg.length; k++) { const y = e.y - 54 + ((k * 17 - G.t * 40) % (msg.length * 17) + msg.length * 17) % (msg.length * 17); if (y > e.y - 60 && y < e.y + 36) { ctx.fillStyle = `hsl(${(hue + k * 30) % 360},100%,65%)`; ctx.fillText(msg[k], e.x, y); } }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let y = e.y - 54; y < e.y + 30; y += 2) ctx.fillRect(e.x - 17, y, 34, 1);
      ctx.restore();
      e.tur.forEach((a, i) => Art.draw(ctx, 'gunTur', e.x + (i ? 30 : -30), e.y + 62, a - Math.PI / 2, 1, 0.9, 0.9));
      if (Math.floor(e.t * 2) % 2) for (const s of [-1, 1]) glowDot(ctx, e.x + s * 36, e.y + 90, 6, s < 0 ? 'rgba(255,60,200,.9)' : 'rgba(60,230,255,.9)');
    },
  },
});
// 看板圖案彈：一群子彈排成愛心／星星，往下飄一下再炸開
const PIX13 = [
  ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'],
  ['0001000', '0011100', '1111111', '0111110', '0110110', '1000001'],
  ['1000001', '0100010', '0011100', '0011100', '0100010', '1000001'],
];
function blimpPixels(e) {
  const pat = PIX13[(Math.random() * PIX13.length) | 0], cx = e.x, cy = e.y + 100, list = [];
  const sp = G.d.dens >= 1 ? 8 : 10;
  pat.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '1') return; if (G.d.dens < 1 && (r + c) % 2) return; const b = eShot2(cx + (c - 3) * sp, cy + r * sp, Math.PI / 2, 55, 'c'); if (b) list.push(b); }));
  Snd.play('eshot');
  G.queue.push({ t: G.st + 1.1, fn: () => {
    const mx = cx, my = cy + 1.1 * 55 * G.d.bs + 25;
    for (const b of list) { const a = Math.atan2(b.y - my, b.x - mx) + 0.0001, s = (55 + Math.hypot(b.x - mx, b.y - my) * 2.4) * G.d.bs; b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; }
    if (list.length) fxP({ k: 'r', x: mx, y: my, r: 6, R: 40, life: 0, max: 0.35 });
  } });
}

// ================= 頭目：幻象戰艦（第二階段會放出兩個全像分身，真身才有影子）=================
SPR.b13 = { w: 200, h: 180, draw(g) { P_(g, [0, 90, 40, 40, 96, 10, 80, -60, 30, -88, -30, -88, -80, -60, -96, 10, -40, 40], '#2a2e3e'); circ(g, 0, -40, 18, '#ff4fd8'); } };
const B13G = [[-72, 12], [72, 12], [-40, -40], [40, -40]];
const SLOTS13 = [[72, 150], [180, 116], [288, 150]];
ET.boss13 = { name: '幻象戰艦', en: 'MIRAGE DREADNOUGHT', hp: 5600, r: 40, score: 650000, boss: true, layer: 'air', hb: [[0, -6, 42], [0, 52, 22], [-70, 12, 20], [70, 12, 20]], marks: [0.66, 0.33],
  init(e) { bossBase(e); e.y = -170; e.ph = 1; e.decoys = []; e.shufT = 0; e.gi = 0; e.td = 3; e.te = 6; e.glitch = 0; },
  update(e, dt) {
    if (bossEnter(e, dt, 132, 60)) return;
    e.mt += dt; e.glitch = Math.max(0, e.glitch - dt);
    const f0 = e.hp / e.maxhp, ph = f0 > 0.66 ? 1 : f0 > 0.33 ? 2 : 3;
    if (ph !== e.ph) {
      e.ph = ph; G.shake = 10; G.eb.length = 0; G.flash = 0.35; e.glitch = 0.8;
      for (let i = 0; i < 6; i++) G.queue.push({ t: G.st + i * 0.1, fn: () => boom(e.x + rnd(-90, 90), e.y + rnd(-50, 50), 1.4) });
      if (ph === 2) {
        popText(e.x, e.y + 90, '全像分身展開！', '#ff6ad8');
        e.slot = SLOTS13.reduce((b, s, i) => Math.hypot(s[0] - e.x, s[1] - e.y) < Math.hypot(SLOTS13[b][0] - e.x, SLOTS13[b][1] - e.y) ? i : b, 1);
        e.decoys = SLOTS13.filter((s, i) => i !== e.slot).map(([x, y]) => ({ x: e.x, y: e.y, tx: x, ty: y, ft: rnd(0.4, 1.2) }));
        e.tx = SLOTS13[e.slot][0]; e.ty = SLOTS13[e.slot][1]; e.shufT = 6.5;
      } else { popText(e.x, e.y + 90, '分身消失……主砲過載！', '#ff6ad8'); e.decoys = []; e.tx = null; }
      Snd.play('sting');
    }
    bossSmoke(e);
    e.sc = lerp(e.sc || 1, ph === 2 ? 0.66 : 1, Math.min(1, dt * 3));
    e.segs = ET.boss13.hb.map(([hx, hy, r]) => [e.x + hx * e.sc, e.y + hy * e.sc, r * e.sc]);
    if (ph === 2) {
      e.shufT -= dt;
      if (e.shufT <= 0) { // 三個位置洗牌
        e.shufT = 6.5; e.glitch = 0.6;
        const order = shuffle([0, 1, 2]);
        e.slot = order[0]; e.tx = SLOTS13[e.slot][0]; e.ty = SLOTS13[e.slot][1];
        e.decoys.forEach((d, i) => { d.tx = SLOTS13[order[i + 1]][0]; d.ty = SLOTS13[order[i + 1]][1]; });
        Snd.tone(900, 0.3, 'sawtooth', 0.04, 200);
      }
      const k = Math.min(1, dt * 3.2);
      e.x += (e.tx - e.x) * k; e.y += (e.ty + Math.sin(e.mt * 1.6) * 6 - e.y) * k;
      for (const d of e.decoys) { d.x += (d.tx - d.x) * k; d.y += (d.ty + Math.sin(e.mt * 1.6 + d.tx) * 6 - d.y) * k; }
    } else {
      e.x = 180 + Math.sin(e.mt * 0.42) * (ph === 3 ? 70 : 56); e.y = 132 + Math.sin(e.mt * 0.9) * 10;
    }
    if (!canShoot(e)) return;
    const f = dt * G.d.fr;
    if (ph === 1) {
      e.ta -= f;
      if (e.ta <= 0) { e.ta = 1.05; e.gi = (e.gi + 1) % 4; const [ox, oy] = B13G[e.gi]; fan(e.x + ox, e.y + oy, aim(e.x + ox, e.y + oy), 4, 0.42, 150); }
      e.tb -= f;
      if (e.tb <= 0) { e.tb = 2.7; const n = Math.round(12 * G.d.dens); for (let i = 0; i < n; i++) { const a = e.mt + i * TAU / n; eShot2(e.x, e.y + 20, a, 85, 'c', { av: 0.35 }); eShot2(e.x, e.y + 20, a + 0.13, 85, 'c', { av: -0.35 }); } Snd.play('eshot'); }
      e.tc -= f;
      if (e.tc <= 0) { e.tc = 2.1; for (let k = 0; k < 3; k++) G.queue.push({ t: G.st + k * 0.12, fn: () => { if (!e.dead && canShoot(e)) eShot(e.x, e.y + 60, aim(e.x, e.y + 60), 185, 'b'); } }); }
    } else if (ph === 2) {
      // 三艘一起開火（分身的子彈一樣會痛）
      const srcs = [e, ...e.decoys];
      for (const s of srcs) {
        s.ft = (s.ft ?? 1) - f;
        if (s.ft <= 0) { s.ft = 1.7; fan(s.x, s.y + 34, aim(s.x, s.y + 34), 3, 0.34, 140, 'c'); }
      }
      e.tb -= f;
      if (e.tb <= 0) { e.tb = 3.4; ring(e.x, e.y, 14, 80, e.mt, 's'); }
    } else {
      e.tc -= f;
      if (e.tc <= 0) { e.tc = 0.11; e.sa += 0.41; for (const s of [-1, 1]) eShot2(e.x, e.y + 20, Math.PI / 2 + s * (0.9 + Math.sin(e.sa) * 0.8), 120, s > 0 ? 'c' : 's'); }
      e.td -= f;
      if (e.td <= 0) {
        e.td = 4.4;
        if (G.d.beams) { [P.x - 64, P.x + 64].forEach((bx, i) => G.beams.push({ x: clamp(bx, 24, W - 24), y: e.y + 60, w: 20, t: -i * 0.2, warn: 1.0, life: 1.5, col: 'v', vx: (i ? 1 : -1) * 70 })); Snd.play('warn'); }
        else ring(e.x, e.y, 14, 90, e.mt, 'b');
      }
      e.te -= f;
      if (e.te <= 0) { e.te = 7.5; const ty = clamp(P.y - 200, 120, 300); spawn('pcar', -24, ty, { dir: 1, ty }); spawn('pcar', W + 24, ty + 40, { dir: -1, ty: ty + 40 }); }
    }
  },
  shadow(ctx, e) { Art.shadow(ctx, 'b13', e.x, e.y, 0, 0.85 * (e.sc || 1)); },
  draw(ctx, e) {
    const ph = e.ph || 1;
    for (const d of e.decoys) b13Draw(ctx, d.x, d.y, e, true);
    b13Draw(ctx, e.x, e.y, e, false);
    if (ph === 3) { const p = 0.5 + 0.5 * Math.sin(e.t * 14); glowDot(ctx, e.x, e.y - 40, 34, `rgba(255,60,200,${0.35 + p * 0.35})`); }
  },
};
function b13Draw(ctx, x, y, e, fake) {
  const gl = e.glitch > 0 || (fake && Math.random() < 0.08);
  const jx = gl ? rnd(-5, 5) : 0, sc = e.sc || 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  if (fake) {
    ctx.save(); ctx.globalAlpha = 0.62 + Math.random() * 0.12;
    Art.draw(ctx, 'b13', x + jx, y);
    ctx.globalCompositeOperation = 'lighter';
    Art.draw(ctx, 'b13', x + jx + 2, y, 0, 0.25, 1, 1, 'w');
    ctx.fillStyle = 'rgba(120,230,255,.12)';
    for (let yy = y - 85 + (G.t * 60) % 4; yy < y + 85; yy += 4) ctx.fillRect(x - 96, yy, 192, 1.2);
    ctx.restore();
  } else {
    Art.draw(ctx, 'b13', x + jx, y);
    bFlash(ctx, 'b13', e, x + jx, y);
  }
  // 霓虹燈條
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const p = 0.5 + 0.5 * Math.sin(G.t * 6 + x);
  for (const s of [-1, 1]) {
    ctx.strokeStyle = `rgba(255,70,210,${0.35 + p * 0.3})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + s * 18, y + 70); ctx.lineTo(x + s * 76, y + 14); ctx.lineTo(x + s * 70, y - 46); ctx.stroke();
  }
  glowDot(ctx, x, y - 40, 16 + p * 4, fake ? 'rgba(120,230,255,.6)' : 'rgba(255,90,220,.75)');
  for (const [ox, oy] of B13G) glowDot(ctx, x + ox, y + oy + 8, 5, 'rgba(255,220,120,.8)');
  ctx.restore();
  ctx.restore();
}
ET.boss13.onDeath = e => { e.decoys = []; bossDown(e); };

// ================= 3D 模型 =================
Object.assign(EXTRA_MODELS, {
  pcar(K) {
    const WH = K.M(0xeef2f8, { m: 0.3, r: 0.25, cc: 1 }), BL = K.M(0x1a2a6a, { m: 0.5, r: 0.3, cc: 1 }), DK = K.M(0x1a1e26, { m: 0.8, r: 0.4 });
    K.ext([-7, -13, 7, -13, 9, -6, 9, 10, 6, 14, -6, 14, -9, 10, -9, -6], 3.4, WH, 0.6, 1);
    K.ext([-9, 1, 9, 1, 9, 8, -9, 8], 0.6, BL, 4, 0.2);
    K.rbox(12, 12, 2.6, 0, -2, 4, K.glass(0x0a1a2a, 0x0a3a5a), 1);
    K.box(10, 1.2, 2.2, 0, 7, -7.4, DK);
    K.sph(2, 0.8, 1.2, -2.6, 7.6, -7.4, K.G(0xff2a3a, 3)); K.sph(2, 0.8, 1.2, 2.6, 7.6, -7.4, K.G(0x3a6aff, 3));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.cylV(2.4, 2.6, 1, sx * 8.6, 0, sz * 9, K.G(0x60e8ff, 2.2));
    for (const s of [-1, 1]) K.sph(1.2, 0.8, 0.8, s * 5, 2.4, -13.6, K.G(0xfff2c0, 3));
  },
  slight(K) {
    const GR = K.M(0x5a6272, { m: 0.85, r: 0.3 }), DK = K.M(0x22262e, { m: 0.9, r: 0.4 });
    K.cylV(9, 10, 3, 0, 0, 0, DK);
    K.cylV(5, 6, 6, 0, 3, 0, GR);
    K.cyl(5.2, 4.2, 11, 0, 10, -5, GR);
    K.cyl(5, 5, 0.8, 0, 10, -10.8, K.G(0xfff4d0, 3.2));
    for (const s of [-1, 1]) K.box(1.6, 6, 6, s * 6, 8, -2, DK);
  },
  holo(K) {
    const ST = K.M(0x3a4258, { m: 0.85, r: 0.3, cc: 0.8 }), WH = K.M(0xd8dce6, { m: 0.4, r: 0.3, cc: 1 });
    K.cylV(8, 9, 3, 0, 0, 0, ST);
    K.sph(6, 3, 6, 0, 3, 0, WH);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; K.bar(0, 0, Math.cos(a) * 10, Math.sin(a) * 10, 2, 1.6, 1.2, ST); K.torus(3.6, 0.6, Math.cos(a) * 10, 3, Math.sin(a) * 10, ST); K.cylV(0.6, 0.6, 2, Math.cos(a) * 10, 2, Math.sin(a) * 10, K.G(0x80e8ff, 2)); }
    K.sph(3, 2.4, 3, 0, 5, 0, K.G(0xff60d8, 3));
  },
  blimp(K) {
    const EN = K.M(0x5a6078, { m: 0.4, r: 0.4, cc: 0.8, panel: false }), EN2 = K.M(0x7a8098, { m: 0.4, r: 0.4, cc: 0.8 }), DK = K.M(0x15161c, { m: 0.6, r: 0.5, panel: false });
    K.lathe([[0, -112], [18, -104], [34, -80], [40, -40], [40, 40], [34, 80], [18, 104], [0.2, 112]], EN, { sy: 0.7, y: 4 });
    K.rbox(36, 88, 3, 0, -12, 30, DK, 1);
    for (const s of [-1, 1]) { K.ext([s * 10, 82, s * 40, 106, s * 40, 116, s * 10, 104], 2, EN2, 4, 0.6); K.cyl(5, 5, 10, s * 44, 6, 60, DK); K.cyl(4, 4, 0.6, s * 44, 6, 65.6, K.G(0xff60d8, 2.4)); }
    K.ext([-4, 92, 4, 92, 4, 118, -4, 118], 16, EN2, 4, 1);
    K.rbox(24, 40, 8, 0, 60, 0, EN2, 2);
    for (const z of [-90, -60, 54, 84]) for (const s of [-1, 1]) K.sph(1.2, 0.8, 1.2, s * 37, 18, z, K.G(z < 0 ? 0x60e8ff : 0xff60d8, 2.8));
  },
  b13(K) {
    const HU = K.M(0x14161f, { m: 0.75, r: 0.42, cc: 0.6, env: 0.22 }), HU2 = K.M(0x262a3a, { m: 0.75, r: 0.38, cc: 0.6, env: 0.25 }), DK = K.M(0x0a0b10, { m: 0.9, r: 0.45, env: 0.2 }), CH = K.M(0xb8c0d0, { m: 0.95, r: 0.2, cc: 1, panel: false });
    const PK = K.G(0xff4fd8, 2.6), CY = K.G(0x50e8ff, 2.6);
    // 主船身：船頭朝下
    K.ext([0, 92, 38, 44, 94, 12, 80, -58, 30, -88, -30, -88, -80, -58, -94, 12, -38, 44], 8, HU, 0, 2);
    K.ext([0, 76, 28, 38, 62, 10, 52, -50, 20, -74, -20, -74, -52, -50, -62, 10, -28, 38], 4, HU2, 8, 1.4);
    // 艦橋
    K.ext([-14, -60, 14, -60, 18, -20, 10, 6, -10, 6, -18, -20], 10, HU, 12, 1.2);
    K.bar(-10, -14, 10, -14, 22.4, 3, 1, K.glass(0x1a0a2a, 0x5a1a7a));
    // 全像投影碟
    K.latheV([[0.1, 0], [14, 2], [18, 6], [16, 7], [2, 4]], CH, 0, 22, -40);
    K.sph(5, 3, 5, 0, 26, -40, PK);
    // 側砲台
    for (const s of [-1, 1]) {
      K.cylV(10, 11, 4, s * 72, 8, 12, DK); K.sph(7, 4, 7, s * 72, 12, 12, HU2); K.cyl(1.6, 1.6, 14, s * 72, 14, 20, DK);
      K.cylV(7, 8, 3, s * 40, 12, -40, DK); K.cyl(1.4, 1.4, 12, s * 40, 15, -34, DK);
      K.bar(s * 18, 70, s * 76, 14, 8.4, 2, 0.6, PK); K.bar(s * 76, 14, s * 70, -46, 8.4, 2, 0.6, PK);
      K.bar(s * 28, -70, s * 52, -50, 12.4, 1.4, 0.5, CY);
      K.cyl(6, 6, 10, s * 22, 4, -88, DK); K.cyl(5, 5, 0.6, s * 22, 4, -93.4, K.G(0xff8ae8, 3));
    }
    K.bar(0, 30, 0, 86, 8.6, 3, 0.6, CY);
    // 船身窗格燈
    for (let k = 0; k < 8; k++) for (const s of [-1, 1]) K.box(2.4, 0.6, 1.2, s * (20 + k * 6), 12.4, -36 + k * 9, K.G(k % 2 ? 0xffd890 : 0x80e0ff, 2.2));
    for (const s of [-1, 1]) K.bar(s * 30, -60, s * 30, 24, 12.2, 1, 0.4, K.G(0xff4fd8, 2));
  },
});
EXTRA_BAKES.push(
  ['pcar', 22, 32, EXTRA_MODELS.pcar, { glow: 0.8 }],
  ['slight', 26, 30, EXTRA_MODELS.slight, { glow: 0.9 }],
  ['holo', 26, 26, EXTRA_MODELS.holo, { glow: 0.8 }],
  ['blimp', 100, 236, EXTRA_MODELS.blimp, { glow: 0.6 }],
  ['b13', 200, 190, EXTRA_MODELS.b13, { glow: 0.8 }],
);

// ================= 波次、關卡、音樂 =================
Object.assign(WAVES, {
  cars: q => { const ty = rnd(110, 200); for (let k = 0; k < 3; k++) q(k * 0.5, () => { const dir = k % 2 ? -1 : 1; spawn('pcar', dir > 0 ? -24 : W + 24, ty + k * 40, { dir, ty: ty + k * 40 }); }); return 3.4; },
  holos: q => { [90, 270, 180].forEach((x, i) => q(i * 0.6, () => spawn('holo', x, -20, { stop: 110 + i * 45 }))); return 4; },
  blimp: q => { q(0, () => spawn('blimp', 180, -140)); return 12; },
});
STAGES.push({ name: '霓虹夜城', en: 'NEON CITY', boss: 'boss13', amb: 'rain', speed: 52, bossSong: 'bossX',
  seq: ['fDown', 'cars', 'holos', 'carrierP', 'fSwoopL', 'fSwoopR', 'icpt', 'cars', 'crates', 'carrierS', 'carrierO', 'holos', 'jetsUp', 'snakeL', 'fDive', 'cars', 'carrierP', 'blimp', 'holos', 'cars', 'fSine', 'icpt', 'carrierB', 'holos', 'droneW', 'cars', 'fDown'] });
Object.assign(SONGS, {
  s12: { bpm: 128, key: 44, prog: [[0, 'm'], [-4, 'M'], [-2, 'M'], [-7, 'M'], [0, 'm'], [3, 'M'], [-2, 'M'], [-5, 'm']], seed: 307, drums: 2, lead: 'square', arpW: 'sawtooth', pad: 1.1, bass: 'sawtooth', arp: [0, 12, 7, 12, 3, 12, 7, 15] },
});
BOSS_INFO.boss13 = { img: 'b13', cls: '全像偽裝戰艦', threat: 5, col: '#ff4fd8' };
MID_INFO.blimp = '廣告飛船';
