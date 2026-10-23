'use strict';
// 守塔奇兵：畫面繪製。世界座標（格）→ 螢幕座標由 view 負責；直式畫面時地圖轉 90 度。
// 所有物件都在螢幕空間「正立」畫，所以轉向後塔和怪物也不會躺著。
// 靜態的東西（地形、塔身、敵人每格動畫）都先畫進離屏畫布快取，每幀只要貼圖。

function makeView(s, rot, ox, oy) {
  const v = { s, rot, ox, oy };
  v.P = (x, y) => rot ? [ox + (ROWS - y) * s, oy + x * s] : [ox + x * s, oy + y * s];
  v.U = (sx, sy) => rot ? [(sy - oy) / s, ROWS - (sx - ox) / s] : [(sx - ox) / s, (sy - oy) / s];
  v.A = a => rot ? a + Math.PI / 2 : a;
  v.w = (rot ? ROWS : COLS) * s; v.h = (rot ? COLS : ROWS) * s;
  return v;
}

const Render = (() => {
  const { TAU, shade, rgba, ell, circ, rrect, poly, lgrad, rgrad } = Gfx;
  let V = null, bg = null, bgKey = '', TR = null, props = [], dpr = 1, lowFx = false;
  let darkN = 0;
  let lightC = null, frostC = null, frostKey = '', goldPos = null, goldT = 0;
  let lastG = null;
  function setView(v) { V = v; }
  function view() { return V; }
  function setLow(l) { lowFx = l; FX.setLow(l); }

  // ───────── 背景快取 ─────────
  function ensureBg(G, W, H, d) {
    dpr = d;
    const key = [G.li, W, H, d, V.s, V.rot, V.ox, V.oy].join(',');
    if (bg && bgKey === key && bg._g === G.L) return;
    bg = Gfx.canvas(W * d, H * d); bg._g = G.L;
    const c = bg.getContext('2d'); c.scale(d, d);
    TR = Terrain.paint(c, V, G, W, H);
    props = Terrain.genProps(G);
    TR.portals = portalSpots(G);
    bgKey = key;
    goldPos = null;
    prewarm(G);
  }
  function invalidate() { bgKey = ''; goldPos = null; }
  function portalSpots(G) {
    return G.L.entries.map(ent => {
      const P = G.paths[ent[0]], a = P.pts[0], sg = P.seg[0];
      // 路線跨進地圖邊界的地方
      let t = 0;
      for (let k = 0; k < 40; k++) { const x = a.x + sg.dx * t, y = a.y + sg.dy * t; if (x >= 0 && y >= 0 && x <= COLS && y <= ROWS) break; t += 0.05; }
      return { x: a.x + sg.dx * (t + 0.42), y: a.y + sg.dy * (t + 0.42), dx: sg.dx, dy: sg.dy };
    });
  }
  function prewarm(G) {
    const ks = new Set();
    if (G.L.pool) for (const p of G.L.pool) ks.add(p[0]);
    if (G.L.boss) ks.add(G.L.boss);
    for (const k of ks) { const d = ENEMIES[k]; const R = Beasts.visR(k, d.r, V.s); for (let f = 0; f < Beasts.FR; f++) { Beasts.frame(k, R, f, 0, dpr); Beasts.frame(k, R, f, 1, dpr); } }
  }

  // ───────── 塔 ─────────
  function towerSprites(k, tier, sp, u) {
    const uq = Math.round(u * 4) / 4, W = 1.8 * uq, H = 2.8 * uq;
    const b = Gfx.sprite(`tw:${k}:${tier}:${sp}:b:${uq}`, W, H, W / 2, 2.3 * uq, dpr, x => Art.body(x, k, tier, sp, uq, 'back'));
    const f = Gfx.sprite(`tw:${k}:${tier}:${sp}:f:${uq}`, W, H, W / 2, 2.3 * uq, dpr, x => Art.body(x, k, tier, sp, uq, 'front'));
    return [b, f];
  }
  function drawTower(ctx, t, a, b, s, time, ang, ghost) {
    const u = s, [bk, fr] = towerSprites(t.k, t.tier, t.spec, u);
    const gy = b + s * 0.12;
    let prog = 1;
    if (t._bt !== undefined && !ghost) { if (t._bt < 0) t._bt = time; prog = clamp((time - t._bt) / 0.65, 0, 1); if (prog >= 1) delete t._bt; }
    if (prog < 1) {
      // 施工中：鷹架＋由下往上長出來
      const e = 1 - Math.pow(1 - prog, 2);
      partial(ctx, bk, a, gy, e);
      scaffold(ctx, a, gy, u, prog, time);
      return;
    }
    Gfx.drawSprite(ctx, bk, a, gy);
    ctx.save(); ctx.translate(a, gy);
    Art.live(ctx, t, u, time, ang, t.k, t.tier, t.spec);
    ctx.restore();
    Gfx.drawSprite(ctx, fr, a, gy);
    // 升級閃光
    if (t._ut !== undefined && !ghost) {
      if (t._ut < 0) t._ut = time;
      const q = (time - t._ut) / 0.6;
      if (q >= 1) delete t._ut;
      else {
        ctx.save(); ctx.globalAlpha = (1 - q) * 0.8; ctx.globalCompositeOperation = 'lighter';
        const gw = s * (0.9 + q * 0.5);
        ctx.drawImage(Gfx.glow('#fff1b0'), a - gw / 2, gy - s * 1.6, gw, s * 1.8);
        ctx.fillStyle = lgrad(ctx, 0, gy - s * 2.4, 0, gy, ['rgba(255,240,180,0)', 'rgba(255,240,180,.6)', 'rgba(255,240,180,0)']);
        ctx.fillRect(a - s * 0.25 * (1 - q), gy - s * 2.4, s * 0.5 * (1 - q), s * 2.4);
        ctx.restore();
      }
    }
    if (t.stunT > 0) {
      for (let i = 0; i < 3; i++) { const aa = time * 5 + i * 2.1; Gfx.star(ctx, a + Math.cos(aa) * s * 0.25, gy - s * 1.05 + Math.sin(aa) * s * 0.08, s * 0.07, '#ffe27a'); }
    }
  }
  function partial(ctx, sp, x, y, f) {
    // 只畫精靈下面 f 比例（以腳底為準往上長）
    const sh = sp.c.height, top = sp.ay / sp.h, visH = top * f + (1 - top);
    const sy = sh * (1 - visH);
    ctx.drawImage(sp.c, 0, sy, sp.c.width, sh - sy, x - sp.ax, y - sp.ay + sp.h * (1 - visH), sp.w, sp.h * visH);
  }
  function scaffold(ctx, a, b, u, p, time) {
    const h = u * (0.4 + p * 0.6);
    ctx.save(); ctx.globalAlpha = Math.min(1, (1 - p) * 3);
    ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = Math.max(1.5, u * 0.035); ctx.lineCap = 'round';
    for (const sx of [-0.34, 0.34]) { ctx.beginPath(); ctx.moveTo(a + sx * u, b); ctx.lineTo(a + sx * u * 0.9, b - h); ctx.stroke(); }
    for (let i = 1; i <= 3; i++) { const yy = b - h * i / 3.3; ctx.beginPath(); ctx.moveTo(a - u * 0.36, yy); ctx.lineTo(a + u * 0.36, yy); ctx.stroke(); }
    ctx.strokeStyle = '#6b4220'; ctx.beginPath(); ctx.moveTo(a - u * 0.34, b); ctx.lineTo(a + u * 0.3, b - h * 0.6); ctx.stroke();
    // 敲打的小錘
    const hm = Math.sin(time * 18) > 0 ? 1 : 0;
    ctx.fillStyle = '#5a5f68'; ctx.fillRect(a + u * 0.18, b - h - u * 0.05 + hm * u * 0.04, u * 0.1, u * 0.05);
    ctx.restore();
  }

  // ───────── 敵人 ─────────
  function enemyR(e, s) { return Beasts.visR(e.k, e.r, s) * (e.boss ? 0.85 : 1); }
  function drawEnemy(ctx, e, a, b, s, time, face, dt) {
    const R = enemyR(e, s), B = Beasts.BOX[e.k];
    let ph = e.wob * (e.fly ? 1.7 : 1);
    const f = ((Math.floor(ph / TAU * Beasts.FR) % Beasts.FR) + Beasts.FR) % Beasts.FR;
    e._f = f;
    const fade = clamp(e.dist / 0.7, 0, 1) * clamp((e.P.len - e.dist) / 0.45, 0, 1);
    if (fade <= 0.01) return;
    const gy = b + s * 0.08;
    const y0 = e.fly ? gy - s * 0.68 + Math.sin(e.wob * 0.5) * s * 0.05 : gy;
    ctx.globalAlpha = fade;
    if (!e.fly) ell(ctx, a, gy, R * (e.boss ? 1.1 : 0.85), R * 0.3, 'rgba(20,10,20,.3)');
    const sp = Beasts.frame(e.k, R, f, 0, dpr);
    const flip = face < 0;
    if (flip) { ctx.save(); ctx.translate(a, 0); ctx.scale(-1, 1); a = 0; }
    Gfx.drawSprite(ctx, sp, a, y0);
    if (e.frozenT <= 0 && e.slowA > 0) { ctx.globalAlpha = fade * 0.65; Gfx.drawSprite(ctx, Beasts.frame(e.k, R, f, 2, dpr), a, y0); ctx.globalAlpha = fade; }
    if (e.flash > 0) { ctx.globalAlpha = fade * Math.min(1, e.flash / 0.09) * 0.85; Gfx.drawSprite(ctx, Beasts.frame(e.k, R, f, 1, dpr), a, y0); ctx.globalAlpha = fade; }
    if (flip) ctx.restore();
    ctx.globalAlpha = 1;
    return { R, y0, top: y0 - B.top * R };
  }
  function enemyStatus(ctx, e, a, info, s, time, dt) {
    if (!info) return;
    const R = info.R, y0 = info.y0, top = info.top;
    const midY = (y0 + top) / 2;
    if (e.shield > 0) {
      const f = e.shield / e.shieldMax, rr = (y0 - top) * 0.62;
      ctx.save();
      ctx.fillStyle = rgrad(ctx, a, midY, rr * 0.6, rr, ['rgba(120,220,255,0)', `rgba(120,220,255,${0.12 + f * 0.15})`]);
      ctx.beginPath(); ctx.arc(a, midY, rr, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(170,235,255,${0.35 + f * 0.5})`; ctx.lineWidth = Math.max(1.2, s * 0.03); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(1, s * 0.025); ctx.beginPath(); ctx.arc(a, midY, rr * 0.82, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
      ctx.restore();
    }
    if (e.frozenT > 0) {
      if (e.stunFx > 0 && !e.brittle && e.frozenT <= e.stunFx) {
        for (let i = 0; i < 3; i++) { const aa = time * 6 + i * 2.1; Gfx.star(ctx, a + Math.cos(aa) * R * 0.7, top - R * 0.15 + Math.sin(aa) * R * 0.2, s * 0.055, '#ffe27a'); }
      } else {
        // 冰塊
        const w = R * 2.1, h = (y0 - top) * 1.05;
        ctx.save();
        rrect(ctx, a - w / 2, y0 - h, w, h + R * 0.15, R * 0.25);
        ctx.fillStyle = lgrad(ctx, a - w / 2, y0 - h, a + w / 2, y0, ['rgba(220,248,255,.75)', 'rgba(150,215,245,.55)', 'rgba(110,180,230,.65)']); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1, s * 0.025); ctx.stroke();
        poly(ctx, [a - w * 0.38, y0 - h * 0.9, a - w * 0.18, y0 - h * 0.9, a - w * 0.42, y0 - h * 0.35], 'rgba(255,255,255,.65)');
        poly(ctx, [a + w * 0.2, y0 - h * 0.15, a + w * 0.38, y0 - h * 0.15, a + w * 0.4, y0 - h * 0.4], 'rgba(255,255,255,.45)');
        ctx.restore();
      }
    } else if (e.slowA > 0) {
      for (let i = 0; i < 3; i++) {
        const aa = time * 2.5 + i * 2.1 + e.id, cx = a + Math.cos(aa) * R * 0.95, cy = midY + Math.sin(aa) * R * 0.35;
        const r = s * 0.035;
        poly(ctx, [cx, cy - r * 1.6, cx + r * 0.7, cy, cx, cy + r * 1.6, cx - r * 0.7, cy], '#e8fbff');
      }
    }
    if (e._burn > 0) {
      e._burn -= dt;
      ctx.save(); ctx.globalAlpha = Math.min(1, e._burn);
      for (let i = 0; i < 3; i++) Art.flame(ctx, a + (i - 1) * R * 0.45, y0 - R * (0.2 + (i % 2) * 0.3), R * 0.18, time * 1.3 + i + e.id);
      ctx.restore();
      if (Math.random() < dt * 6) FX.part('smoke', e.x, e.y, 0.5, 0, 0, 0.6, 0.8, 0.12, '#5a5048');
    }
    if (e.markT > 0) {
      const mr = R * 0.75, my = midY, rot = time * 2;
      ctx.save(); ctx.translate(a, my); ctx.rotate(rot);
      ctx.strokeStyle = 'rgba(255,70,70,.95)'; ctx.lineWidth = Math.max(1.2, s * 0.03);
      ctx.beginPath(); ctx.arc(0, 0, mr, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(mr * 0.5, 0); ctx.lineTo(mr * 1.3, 0); ctx.stroke(); }
      ctx.restore();
    }
    if (e.shred > 0) {
      // 護甲被削弱：小裂痕圖示
      const ix = a - R * 0.75, iy = top - s * 0.02;
      ctx.fillStyle = '#9aa6b8'; ctx.beginPath(); ctx.moveTo(ix - s * 0.06, iy - s * 0.06); ctx.lineTo(ix + s * 0.06, iy - s * 0.06); ctx.lineTo(ix + s * 0.06, iy); ctx.lineTo(ix, iy + s * 0.06); ctx.lineTo(ix - s * 0.06, iy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ff6a4a'; ctx.lineWidth = Math.max(1, s * 0.02); ctx.beginPath(); ctx.moveTo(ix - s * 0.02, iy - s * 0.06); ctx.lineTo(ix + s * 0.01, iy - s * 0.02); ctx.lineTo(ix - s * 0.01, iy + s * 0.03); ctx.stroke();
    }
    if (e.healFx > 0) {
      ctx.globalAlpha = Math.min(1, e.healFx * 2);
      const hy = top - (0.6 - e.healFx) * s * 0.5;
      ctx.fillStyle = '#7dffb0'; ctx.fillRect(a - s * 0.03, hy - s * 0.09, s * 0.06, s * 0.18); ctx.fillRect(a - s * 0.09, hy - s * 0.03, s * 0.18, s * 0.06);
      ctx.globalAlpha = 1;
    }
    // 血條
    if ((e.hp < e.maxHp || e.shield < e.shieldMax) && !e.boss) {
      const bw = Math.max(s * 0.55, R * 1.7), bh = Math.max(3.5, s * 0.075), bx = a - bw / 2, by = top - bh - s * 0.06;
      rrect(ctx, bx - 1.5, by - 1.5, bw + 3, bh + 3, bh); ctx.fillStyle = 'rgba(20,14,28,.82)'; ctx.fill();
      const f = clamp(e.hp / e.maxHp, 0, 1);
      if (f > 0) { rrect(ctx, bx, by, Math.max(bh, bw * f), bh, bh / 2); ctx.fillStyle = f > 0.5 ? lgrad(ctx, 0, by, 0, by + bh, ['#9cf58a', '#4ec85c']) : f > 0.25 ? lgrad(ctx, 0, by, 0, by + bh, ['#ffe27a', '#f0b030']) : lgrad(ctx, 0, by, 0, by + bh, ['#ff8a8a', '#e83a4a']); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + 1, by + 0.5, Math.max(0, bw * f - 2), Math.max(1, bh * 0.3));
      if (e.shieldMax) { const sf = clamp(e.shield / e.shieldMax, 0, 1); if (sf > 0) { rrect(ctx, bx, by - bh * 0.75, bw * sf, bh * 0.6, bh * 0.3); ctx.fillStyle = '#8fe8ff'; ctx.fill(); } }
      if (e.armor >= 0.4 || e.mres >= 0.5) { const ix = bx - s * 0.07, iy = by + bh / 2; circ(ctx, ix, iy, s * 0.055, e.armor >= 0.4 ? '#9aa6b8' : '#b48bff'); ctx.strokeStyle = 'rgba(20,14,28,.8)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
  }
  function drawDeath(ctx, d, s, time) {
    const [a, b] = V.P(d.x, d.y), u = d.t / d.dur;
    const R = Beasts.visR(d.k, d.r, s) * (d.boss ? 0.85 : 1);
    const sp = Beasts.frame(d.k, R, d.f, u < 0.12 ? 1 : 0, dpr);
    const gy = b + s * 0.08;
    ctx.save();
    if (d.fly) {
      const y = gy - s * 0.68 * (1 - u * u);
      ctx.translate(a, y); ctx.rotate(d.face * u * 2.5); ctx.scale(d.face, 1);
      ctx.globalAlpha = 1 - Math.max(0, (u - 0.7) / 0.3);
      Gfx.drawSprite(ctx, sp, 0, 0);
    } else if (d.k === 'slime' || d.k === 'mini' || d.k === 'splitter') {
      ctx.translate(a, gy); ctx.scale(d.face * (1 + u * 0.8), Math.max(0.05, 1 - u));
      ctx.globalAlpha = 1 - u * u;
      Gfx.drawSprite(ctx, sp, 0, 0);
    } else if (d.boss) {
      const sh = (1 - u) * s * 0.05;
      ctx.translate(a + (Math.random() - 0.5) * sh, gy); ctx.scale(d.face * (1 - u * 0.15), 1 - u * 0.3);
      ctx.globalAlpha = 1 - Math.max(0, (u - 0.6) / 0.4);
      Gfx.drawSprite(ctx, sp, 0, 0);
      if (Math.random() < 0.35) { const ex = d.x + (Math.random() - 0.5) * 1.2, ey = d.y + (Math.random() - 0.5) * 0.8; FX.part('fire', ex, ey, 0.4 + Math.random(), 0, 0, 0.5, 0.4, 0.4, '#ffb347'); FX.part('flash', ex, ey, 0.6, 0, 0, 0, 0.12, 0.6, '#fff4c8'); }
    } else {
      ctx.translate(a, gy); ctx.rotate(-d.face * Math.min(1, u * 2.2) * 1.45); ctx.scale(d.face, 1);
      ctx.globalAlpha = 1 - Math.max(0, (u - 0.45) / 0.55);
      Gfx.drawSprite(ctx, sp, 0, 0);
    }
    ctx.restore();
  }

  // ───────── 其他物件 ─────────
  function drawProp(ctx, p, s, time) {
    const [a, b] = V.P(p.wx, p.wy);
    const sp = Terrain.propSprite(p.k, s, p.v, lastG.L.theme, dpr);
    const sw = Terrain.SWAY[p.k];
    if (sw) {
      ctx.save(); ctx.translate(a, b); ctx.rotate(Math.sin(time * 1.4 + p.ph) * sw + Math.sin(time * 0.37 + p.ph * 2) * sw * 0.5);
      ctx.drawImage(sp.c, -sp.ax, -sp.ay, sp.w, sp.h); ctx.restore();
    } else Gfx.drawSprite(ctx, sp, a, b);
  }
  function castlePos(G) {
    const e = G.exitPt;
    return V.P(e.x - e.dx * 0.15, e.y - e.dy * 0.15);
  }
  function drawCastle(ctx, G, s, time) {
    const u = s * 0.9;
    let [a, b] = castlePos(G);
    b += s * 0.2;
    if (FX.st.castleHit > 0) a += Math.sin(time * 70) * FX.st.castleHit * s * 0.08;
    const sp = Gfx.sprite('castle:' + Math.round(u * 4) / 4, u * 2.4, u * 2.6, u * 1.2, u * 2.15, dpr, x => Art.castle(x, Math.round(u * 4) / 4, 'back'));
    Gfx.drawSprite(ctx, sp, a, b);
    ctx.save(); ctx.translate(a, b); Art.castleFlags(ctx, u, time); ctx.restore();
    // 受損
    const f = G.lives / G.maxLives;
    if (f < 0.75) {
      ctx.strokeStyle = 'rgba(40,30,30,.7)'; ctx.lineWidth = Math.max(1, u * 0.02);
      ctx.beginPath(); ctx.moveTo(a - u * 0.4, b - u * 0.5); ctx.lineTo(a - u * 0.3, b - u * 0.35); ctx.lineTo(a - u * 0.36, b - u * 0.2); ctx.moveTo(a + u * 0.45, b - u * 0.45); ctx.lineTo(a + u * 0.35, b - u * 0.3); ctx.stroke();
    }
    if (f < 0.5 && Math.random() < 0.05) FX.part('smoke', G.exitPt.x + (Math.random() - 0.5) * 0.6, G.exitPt.y, 1.4, 0.25, -0.1, 0.45, 1.6, 0.2, '#4a443e');
    if (f < 0.3) for (let i = 0; i < 2; i++) Art.flame(ctx, a + (i ? 0.5 : -0.55) * u, b - u * (i ? 1.1 : 0.9), u * 0.07, time * 1.2 + i);
    if (FX.st.castleHit > 0) { ctx.save(); ctx.globalAlpha = FX.st.castleHit; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(Gfx.glow('#ff4a3a'), a - u * 1.2, b - u * 2, u * 2.4, u * 2.4); ctx.restore(); }
  }
  const PORTAL_COL = { volcano: ['#ffb36b', '#c8341a'], snow: ['#cff4ff', '#3a8ad8'], swamp: ['#d8ff8a', '#3a8a3a'], night: ['#e8b0ff', '#6a2ad8'] };
  function drawPortal(ctx, p, s, time, th) {
    const u = s * 0.85;
    const [a, b0] = V.P(p.x, p.y), b = b0 + s * 0.3;
    const sp = Gfx.sprite('portal:' + Math.round(u * 4) / 4, u * 1.4, u * 1.6, u * 0.7, u * 1.35, dpr, x => Art.portalBack(x, Math.round(u * 4) / 4));
    Gfx.drawSprite(ctx, sp, a, b);
    ctx.save(); ctx.translate(a, b); Art.portalSwirl(ctx, u, time, PORTAL_COL[th] || ['#ff9ae0', '#8a2ad8']); ctx.restore();
  }

  // ───────── 縮圖、圖示 ─────────
  function fakeGame(li) {
    const L = LEVELS[li];
    const fake = { L, T: THEMES[L.theme], grid: buildGrid(L, THEMES[L.theme]), paths: L.paths.map(buildPath), li, lives: 1, maxLives: 1, enemies: [], towers: [] };
    const lp = fake.paths[0], ls = lp.seg[lp.seg.length - 1];
    fake.exitPt = { x: ls.b.x - ls.dx * 0.5, y: ls.b.y - ls.dy * 0.5, dx: ls.dx, dy: ls.dy };
    return fake;
  }
  function thumb(li, w, h) {
    const fake = fakeGame(li);
    const d = Math.min(2, window.devicePixelRatio || 1);
    const c = Gfx.canvas(w * d, h * d); c.style.width = w + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d'); x.scale(d, d);
    const s = Math.min((w - 8) / COLS, (h - 8 - (w - 8) / COLS * 0.4) / ROWS);
    const v = makeView(s, false, (w - COLS * s) / 2, (h - ROWS * s - s * 0.4) / 2);
    const keepV = V, keepD = dpr, keepG = lastG;
    V = v; dpr = d; lastG = fake;
    const tr = Terrain.paint(x, v, fake, w, h, { thumb: true });
    void tr;
    const items = Terrain.genProps(fake).map(p => [V.P(p.wx, p.wy)[1], 0, p]);
    const [ca, cb] = castlePos(fake); items.push([cb + s * 0.2, 1, null]);
    const ps = portalSpots(fake); for (const p of ps) items.push([V.P(p.x, p.y)[1] + s * 0.3, 2, p]);
    items.sort((p, q) => p[0] - q[0]);
    for (const [, k, o] of items) { if (k === 0) drawProp(x, o, s, 0); else if (k === 1) drawCastle(x, fake, s, 0); else drawPortal(x, o, s, 0.5, fake.L.theme); }
    void ca;
    V = keepV; dpr = keepD; lastG = keepG;
    return c;
  }
  const iconCache = {};
  function icon(kind, k, tier, spec, S) {
    S = S || 112;
    const key = kind + k + (tier || 0) + (spec === undefined ? '' : spec) + ':' + S;
    if (iconCache[key]) return iconCache[key];
    const c = Gfx.canvas(S, S), x = c.getContext('2d');
    // 先畫在大一點的暫存畫布，再裁切成剛好的大小（矮的塔也不會顯得太小）
    const T = Gfx.canvas(S * 2, S * 2), tx = T.getContext('2d');
    if (kind === 'tower') {
      const u = S * 0.6, t = { k, tier: tier || 0, spec: spec === undefined ? -1 : spec, id: 3, recoil: 0, stunT: 0, pulse: 0, cd: 0, ang: -Math.PI / 4 };
      tx.translate(S, S * 1.7);
      Art.body(tx, k, t.tier, t.spec, u, 'back');
      Art.live(tx, t, u, 0.6, -Math.PI / 5, k, t.tier, t.spec);
      Art.body(tx, k, t.tier, t.spec, u, 'front');
    } else if (kind === 'castle') {
      const u = S * 0.5; tx.translate(S, S * 1.7); Art.castle(tx, u, 'back'); Art.castleFlags(tx, u, 0.3);
    } else {
      const B = Beasts.BOX[k];
      const R = Math.min(S * 1.6 / B.w, S * 1.6 / B.h);
      const sp = Beasts.frame(k, R, 2, 0, 1);
      tx.drawImage(sp.c, S - sp.ax, S * 1.8 - sp.ay);
    }
    const id = tx.getImageData(0, 0, T.width, T.height).data;
    let x0 = T.width, y0 = T.height, x1 = 0, y1 = 0;
    for (let yy = 0; yy < T.height; yy += 2) for (let xx = 0; xx < T.width; xx += 2) if (id[(yy * T.width + xx) * 4 + 3] > 20) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    if (x1 > x0) {
      const pad = S * 0.05, bw = x1 - x0 + 2, bh = y1 - y0 + 2, f = Math.min((S - pad * 2) / bw, (S - pad * 2) / bh, kind === 'tower' && (tier || 0) === 0 ? 1.15 : 1.4);
      const dw = bw * f, dh = bh * f;
      x.drawImage(T, x0, y0, bw, bh, (S - dw) / 2, S - pad - dh, dw, dh);
    }
    return (iconCache[key] = c.toDataURL());
  }

  // ───────── 每幀 ─────────
  function goldTarget() {
    if (!goldPos || goldT <= 0) {
      const el = document.getElementById('cGold');
      if (el && el.offsetParent !== null) { const r = el.getBoundingClientRect(); goldPos = r.width ? [r.left + 18, r.top + r.height / 2] : null; } else goldPos = null;
      goldT = 1;
    }
    return goldPos;
  }
  function frame(ctx, G, ui, time, W, H, dt) {
    dt = dt || 0;
    goldT -= dt;
    if (G !== FX.G) FX.reset(G);
    lastG = G;
    FX.update(dt, time);
    const s = V.s, HS = s * Art.HS, th = G.L.theme, PAL = Terrain.pal(th);
    const P = V.P;
    ctx.save();
    if (ui.shake > 0) ctx.translate((Math.random() - 0.5) * ui.shake * s * 0.25, (Math.random() - 0.5) * ui.shake * s * 0.25);
    ctx.drawImage(bg, 0, 0, W, H);
    // ── 地面層（裁切在地圖內）──
    ctx.save();
    rrect(ctx, V.ox, V.oy, V.w, V.h, s * 0.3); ctx.clip();
    drawWaterAnim(ctx, s, time);
    drawDecals(ctx, s, time);
    groundUi(ctx, G, ui, s, time);
    // 光環（模擬層的衝擊波）
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const r of G.rings) {
      const [a, b] = P(r.x, r.y), u = 1 - r.life / r.max, rr = lerp(r.r0, r.r1, Math.sqrt(u)) * s;
      ctx.globalAlpha = (1 - u) * 0.7; ctx.strokeStyle = r.c; ctx.lineWidth = Math.max(2, s * 0.09 * (1 - u));
      ctx.beginPath(); ctx.arc(a, b, rr, 0, TAU); ctx.stroke();
      ctx.globalAlpha = (1 - u) * 0.25; ctx.lineWidth = Math.max(4, s * 0.25 * (1 - u)); ctx.stroke();
    }
    ctx.restore();
    // 飛行敵人的影子
    for (const e of G.enemies) if (e.alive && e.fly) { const [a, b] = P(e.x, e.y); const R = enemyR(e, s); ell(ctx, a, b + s * 0.1, R * 0.8, R * 0.25, 'rgba(10,10,30,.2)'); }
    for (const p of FX.parts) if (p.k === 'bird') { const [a, b] = P(p.x + 0.8, p.y + 1.2); ell(ctx, a, b, s * 0.1, s * 0.04, 'rgba(10,10,30,.12)'); }
    ctx.restore();

    // ── 依 y 排序的物件 ──
    const items = [];
    for (const p of props) { const [, b] = P(p.wx, p.wy); items.push([b, 2, p]); }
    for (const t of G.towers) { const [, b] = P(t.cx, t.cy); items.push([b + s * 0.12, 0, t]); }
    for (const e of G.enemies) if (e.alive && !e.fly) { const [, b] = P(e.x, e.y); items.push([b + s * 0.08, 1, e]); }
    for (const d of FX.deaths) if (!d.fly) { const [, b] = P(d.x, d.y); items.push([b + s * 0.08, 3, d]); }
    for (const g of FX.ghosts) { const [, b] = P(g.x, g.y); items.push([b + s * 0.12, 4, g]); }
    items.push([castlePos(G)[1] + s * 0.2, 5, null]);
    for (const p of TR.portals) items.push([P(p.x, p.y)[1] + s * 0.3, 6, p]);
    items.sort((p, q) => p[0] - q[0]);
    const statusQ = [];
    for (const it of items) {
      const o = it[2];
      switch (it[1]) {
        case 0: { const [a, b] = P(o.cx, o.cy); drawTower(ctx, o, a, b, s, time, V.A(o.ang)); break; }
        case 1: {
          const [a, b] = P(o.x, o.y);
          const sd = V.rot ? -o.dy : o.dx;
          if (sd < -0.3) o._face = -1; else if (sd > 0.3) o._face = 1; else if (!o._face) o._face = 1;
          const inf = drawEnemy(ctx, o, a, b, s, time, o._face, dt);
          if (inf) statusQ.push([o, a, inf]);
          break;
        }
        case 2: drawProp(ctx, o, s, time); break;
        case 3: drawDeath(ctx, o, s, time); break;
        case 4: {
          const [a, b] = P(o.x, o.y), [bk] = towerSprites(o.k, o.tier, o.spec, s), u = o.t / o.dur;
          ctx.globalAlpha = 1 - u * u; partial(ctx, bk, a, b + s * 0.12 + u * s * 0.15, 1 - u); ctx.globalAlpha = 1; break;
        }
        case 5: drawCastle(ctx, G, s, time); break;
        case 6: drawPortal(ctx, o, s, time, th); break;
      }
    }
    for (const [o, a, inf] of statusQ) enemyStatus(ctx, o, a, inf, s, time, dt);

    // ── 投射物 ──
    drawProjectiles(ctx, G, s, HS, time, dt);
    // ── 飛行敵人 ──
    const fl = G.enemies.filter(e => e.alive && e.fly).sort((p, q) => p.y - q.y);
    for (const e of fl) {
      const [a, b] = P(e.x, e.y), sd = V.rot ? -e.dy : e.dx;
      if (sd < -0.3) e._face = -1; else if (sd > 0.3) e._face = 1; else if (!e._face) e._face = 1;
      const inf = drawEnemy(ctx, e, a, b, s, time, e._face, dt);
      enemyStatus(ctx, e, a, inf, s, time, dt);
      if (e.k === 'bossDragon' && e.dashT > 0 && Math.random() < 0.6) FX.part('fire', e.x - e.dx * 0.4, e.y - e.dy * 0.4, 0.7, -e.dx * 0.5, -e.dy * 0.5, 0.2, 0.5, 0.3, '#ff8a2a');
    }
    for (const d of FX.deaths) if (d.fly) drawDeath(ctx, d, s, time);
    // ── 粒子（一般）──
    drawParticles(ctx, G, s, HS, time, false);
    // ── 雲影 ──
    ctx.save(); rrect(ctx, V.ox, V.oy, V.w, V.h, s * 0.3); ctx.clip();
    if (th !== 'night') {
      const cs = cloudSprite();
      ctx.globalAlpha = th === 'desert' ? 0.5 : th === 'snow' ? 0.35 : 0.45;
      for (const c of FX.clouds) { const [a, b] = P(c.x, c.y), w = s * 7 * c.sc, h = w * 0.5; ctx.drawImage(cs, a - w / 2, b - h / 2, w, h); }
      ctx.globalAlpha = 1;
    }
    // ── 夜晚光照 ──
    const lights = collectLights(G, s, HS, time, th);
    if (PAL.dark > 0) drawDarkness(ctx, lights, PAL);
    ctx.restore();
    // ── 發光（加色）──
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) { if (!l.c) continue; const r = l.r * s * (PAL.dark > 0 ? 0.8 : 0.5); ctx.globalAlpha = Math.min(1, l.a * (PAL.dark > 0 ? 0.2 : 0.14)); ctx.drawImage(Gfx.glow(l.c), l.sx - r, l.sy - r, r * 2, r * 2); }
    ctx.globalAlpha = 1;
    drawBolts(ctx, G, s, HS);
    drawParticles(ctx, G, s, HS, time, true);
    ctx.restore();
    // ── 入口提示 ──
    waveBadges(ctx, G, ui, s, time);
    // ── 浮動文字 ──
    for (const t of G.texts) {
      const [a, b0] = P(t.x, t.y), u = 1 - t.life / t.max;
      const b = b0 - u * s * 0.9 - s * 0.2;
      const gold = t.c === '#ffd84a' && t.s[0] === '+';
      const sc = (u < 0.15 ? 0.6 + u / 0.15 * 0.5 : 1.1 - Math.min(0.1, (u - 0.15))) * (gold ? 0.78 : 1);
      ctx.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
      const fz = Math.round(Math.max(11, s * 0.32) * t.sz * sc);
      ctx.font = `900 ${fz}px "Fredoka","Noto Sans TC",system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, fz * 0.22); ctx.strokeStyle = 'rgba(40,20,10,.85)'; ctx.lineJoin = 'round';
      ctx.strokeText(t.s, a, b); ctx.fillStyle = t.c; ctx.fillText(t.s, a, b);
    }
    ctx.globalAlpha = 1;
    ctx.restore(); // shake
    overlays(ctx, G, ui, s, time, W, H);
  }

  function drawWaterAnim(ctx, s, time) {
    for (const w of TR.waters) {
      const [x0, y0, x1, y1] = w.box;
      ctx.save();
      ctx.clip(w.path);
      if (w.lava) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 2);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.max(x1 - x0, y1 - y0) * 0.7;
        ctx.drawImage(Gfx.glow('#ff9a3a'), cx - r, cy - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
        // 冒泡
        for (let i = 0; i < 5; i++) {
          const ph = (time * 0.6 + i * 0.37) % 1, px = x0 + (x1 - x0) * Gfx.hash2(i, Math.floor(time * 0.6 + i * 0.37), 3), py = y0 + (y1 - y0) * Gfx.hash2(i + 9, Math.floor(time * 0.6 + i * 0.37), 5);
          ctx.globalAlpha = Math.sin(ph * Math.PI); circ(ctx, px, py, s * 0.05 * (0.5 + ph), '#ffe27a');
        }
        ctx.globalAlpha = 1;
      } else {
        // 波光
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.lineCap = 'round';
        const n = Math.max(4, Math.round((x1 - x0) * (y1 - y0) / (s * s) * 1.6));
        for (let i = 0; i < n; i++) {
          const ph = (time * 0.35 + i * 0.618) % 1, px = x0 + (x1 - x0) * Gfx.hash2(i, Math.floor(time * 0.35 + i * 0.618), 11), py = y0 + (y1 - y0) * Gfx.hash2(i + 7, Math.floor(time * 0.35 + i * 0.618), 13);
          ctx.globalAlpha = Math.sin(ph * Math.PI) * (w.swamp ? 0.4 : 0.8);
          const ww = s * (0.1 + 0.12 * ph);
          ctx.beginPath(); ctx.moveTo(px - ww, py); ctx.quadraticCurveTo(px, py - s * 0.05, px + ww, py); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // 岸邊泡沫
        ctx.setLineDash([s * 0.12, s * 0.18]); ctx.lineDashOffset = -time * s * 0.3;
        ctx.strokeStyle = `rgba(255,255,255,${w.swamp ? 0.15 : 0.35 + 0.15 * Math.sin(time * 1.8)})`; ctx.lineWidth = s * (0.08 + 0.03 * Math.sin(time * 1.3));
        ctx.stroke(w.path); ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }
  function drawDecals(ctx, s, time) {
    for (const d of FX.decals) {
      const [a, b] = V.P(d.x, d.y), u = d.life / d.max, r = d.r * s;
      const al = Math.min(1, u * 2.5);
      switch (d.k) {
        case 'scorch': case 'crater': {
          ctx.globalAlpha = al * (d.k === 'crater' ? 0.85 : 0.6);
          ctx.fillStyle = rgrad(ctx, a, b, 0, r, ['rgba(26,14,8,.85)', 'rgba(40,24,14,.45)', 'rgba(40,26,18,0)']);
          ctx.beginPath(); ctx.ellipse(a, b, r * 0.8, r * 0.6, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(30,18,10,.7)';
          for (let i = 0; i < 7; i++) { const an = d.rot + i * 0.9, q = r * (0.55 + (i % 3) * 0.12); ctx.beginPath(); ctx.ellipse(a + Math.cos(an) * q, b + Math.sin(an) * q * 0.72, r * 0.07, r * 0.05, an, 0, TAU); ctx.fill(); }
          if (d.k === 'crater') { ctx.strokeStyle = 'rgba(120,90,60,.8)'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.beginPath(); ctx.ellipse(a, b, r * 0.55, r * 0.4, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); if (u > 0.6) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (u - 0.6) * 1.5; ctx.drawImage(Gfx.glow('#ff6a1a'), a - r * 0.6, b - r * 0.45, r * 1.2, r * 0.9); ctx.globalCompositeOperation = 'source-over'; } }
          break;
        }
        case 'shock': {
          const q = 1 - u; ctx.globalAlpha = u * 0.6; ctx.strokeStyle = '#fff4d0'; ctx.lineWidth = Math.max(1.5, s * 0.06 * u);
          ctx.beginPath(); ctx.ellipse(a, b, r * (0.3 + q), r * (0.3 + q) * 0.75, 0, 0, TAU); ctx.stroke(); break;
        }
        case 'goo': {
          ctx.globalAlpha = al * 0.6; const c = d.c || '#6ad65e';
          circ(ctx, a, b, r * 0.5, c);
          for (let i = 0; i < 5; i++) { const an = d.rot + i * 1.26; circ(ctx, a + Math.cos(an) * r * 0.6, b + Math.sin(an) * r * 0.4, r * 0.15, c); }
          break;
        }
        case 'arrow': {
          ctx.globalAlpha = al;
          const ang = V.A(d.ang), L = s * 0.2;
          ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = Math.max(1.2, s * 0.03);
          ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a - Math.cos(ang) * L * 0.8, b - Math.sin(ang) * L * 0.8 - L * 0.4); ctx.stroke();
          ctx.strokeStyle = '#f2ece0'; ctx.lineWidth = Math.max(1.5, s * 0.04);
          ctx.beginPath(); ctx.moveTo(a - Math.cos(ang) * L * 0.65, b - Math.sin(ang) * L * 0.65 - L * 0.33); ctx.lineTo(a - Math.cos(ang) * L * 0.8, b - Math.sin(ang) * L * 0.8 - L * 0.4); ctx.stroke();
          break;
        }
        case 'frost': {
          ctx.globalAlpha = al * 0.55;
          ctx.fillStyle = rgrad(ctx, a, b, 0, r, ['rgba(230,250,255,.9)', 'rgba(180,230,255,.5)', 'rgba(180,230,255,0)']);
          ctx.beginPath(); ctx.ellipse(a, b, r, r * 0.75, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1;
          for (let i = 0; i < 6; i++) { const an = d.rot + i * TAU / 6; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + Math.cos(an) * r * 0.7, b + Math.sin(an) * r * 0.5); ctx.stroke(); }
          break;
        }
        case 'crack': {
          ctx.globalAlpha = al * 0.7; ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = Math.max(1.5, s * 0.04); ctx.lineCap = 'round';
          for (let i = 0; i < 7; i++) { const an = d.rot + i * TAU / 7; let px = a, py = b; ctx.beginPath(); ctx.moveTo(px, py); for (let k = 1; k <= 3; k++) { px += Math.cos(an + Math.sin(k * 3 + i) * 0.5) * r * 0.25; py += Math.sin(an + Math.sin(k * 3 + i) * 0.5) * r * 0.18; ctx.lineTo(px, py); } ctx.stroke(); }
          ctx.lineCap = 'butt';
          break;
        }
        case 'rune': {
          ctx.globalAlpha = al; ctx.save(); ctx.translate(a, b); ctx.scale(1, 0.7); ctx.rotate(time * 1.5);
          ctx.strokeStyle = '#c8a0ff'; ctx.lineWidth = Math.max(1.5, s * 0.04); ctx.shadowColor = '#b38aff'; ctx.shadowBlur = s * 0.2;
          ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, TAU); ctx.stroke();
          ctx.beginPath(); for (let i = 0; i < 6; i++) { const an = i * TAU / 6 * 2; ctx.lineTo(Math.cos(an) * r * 0.8, Math.sin(an) * r * 0.8); } ctx.closePath(); ctx.stroke();
          ctx.restore();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  function rangeCircle(ctx, wx, wy, r, c, s, time, dash) {
    const [a, b] = V.P(wx, wy), R = r * s;
    ctx.fillStyle = rgrad(ctx, a, b, R * 0.2, R, [rgba(c, 0.02), rgba(c, 0.1), rgba(c, 0.22)]);
    ctx.beginPath(); ctx.arc(a, b, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(c, 0.9); ctx.lineWidth = 2; ctx.setLineDash(dash || [s * 0.18, s * 0.12]); ctx.lineDashOffset = -time * s * 0.4; ctx.stroke(); ctx.setLineDash([]);
  }
  function brackets(ctx, a, b, w, c, lw) {
    const k = w * 0.28;
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = a + sx * w / 2, y = b + sy * w / 2; ctx.moveTo(x, y - sy * k); ctx.lineTo(x, y); ctx.lineTo(x - sx * k, y); }
    ctx.stroke(); ctx.lineCap = 'butt';
  }
  function groundUi(ctx, G, ui, s, time) {
    // 戰旗光環
    for (const t of G.towers) if (t.k === 'banner') {
      const [a, b] = V.P(t.cx, t.cy), r = s * (0.55 + 0.05 * Math.sin(time * 3));
      ctx.strokeStyle = t.spec === 1 ? 'rgba(110,170,255,.5)' : 'rgba(255,120,90,.5)'; ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.beginPath(); ctx.ellipse(a, b + s * 0.12, r, r * 0.5, 0, 0, TAU); ctx.stroke();
    }
    // 可建造格子
    if (ui.placing) {
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (!canBuild(G, x, y)) continue;
        const [a, b] = V.P(x + 0.5, y + 0.5);
        rrect(ctx, a - s * 0.4, b - s * 0.4, s * 0.8, s * 0.8, s * 0.16); ctx.fillStyle = 'rgba(255,255,240,.10)'; ctx.fill();
        brackets(ctx, a, b, s * 0.78, 'rgba(255,255,240,.45)', Math.max(1, s * 0.025));
      }
    }
    if (ui.selTile) {
      const [a, b] = V.P(ui.selTile.x + 0.5, ui.selTile.y + 0.5), p = 0.5 + 0.5 * Math.sin(time * 6);
      rrect(ctx, a - s * 0.44, b - s * 0.44, s * 0.88, s * 0.88, s * 0.18); ctx.fillStyle = `rgba(255,220,100,${0.14 + p * 0.1})`; ctx.fill();
      brackets(ctx, a, b, s * (0.9 + p * 0.05), '#ffd84a', Math.max(2, s * 0.05));
    }
    if (ui.selTower) {
      const t = ui.selTower;
      if (t.k !== 'mine') rangeCircle(ctx, t.cx, t.cy, t.st.range, t.k === 'banner' ? '#ff7a5a' : '#ffffff', s, time);
      if (ui.preview && ui.preview.range) rangeCircle(ctx, t.cx, t.cy, ui.preview.range, '#ffd84a', s, time, [s * 0.08, s * 0.1]);
      const [a, b] = V.P(t.cx, t.cy);
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = Math.max(2, s * 0.05); ctx.beginPath(); ctx.ellipse(a, b + s * 0.12, s * 0.5, s * 0.22, 0, 0, TAU); ctx.stroke();
      if (t.k === 'banner') for (const o of G.towers) if (o !== t && o.buff.dmg > 0 && dist2(o.cx, o.cy, t.cx, t.cy) <= t.st.range ** 2 + 0.01) { const [p, q] = V.P(o.cx, o.cy); ctx.strokeStyle = 'rgba(255,140,100,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p, q + s * 0.12, s * 0.42, s * 0.18, 0, 0, TAU); ctx.stroke(); }
    }
    if (ui.ghost) {
      const g = ui.ghost, d = TOWERS[g.k], ok = canBuild(G, g.x, g.y);
      if (ok && g.k !== 'mine') rangeCircle(ctx, g.x + 0.5, g.y + 0.5, d.tiers[0].range * G.M.range, g.k === 'banner' ? '#ff7a5a' : '#9fffb0', s, time);
    }
    // 隕石預告
    for (const p of G.projs) if (p.k === 'meteor') {
      const [a, b] = V.P(p.tx, p.ty), u = clamp(p.tt / p.T, 0, 1), R = p.r * s * (1.2 - u * 0.2);
      ctx.fillStyle = rgrad(ctx, a, b, 0, R, [`rgba(255,90,40,${0.05 + u * 0.25})`, `rgba(255,90,40,${0.15 + u * 0.2})`]);
      ctx.beginPath(); ctx.arc(a, b, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,120,60,${0.5 + u * 0.5})`; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = time * 30; ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function drawProjectiles(ctx, G, s, HS, time, dt) {
    const P = V.P;
    for (const p of G.projs) {
      if (p.k === 'meteor') {
        if (p.tt < 0) continue;
        const [a, b0] = P(p.x, p.y), b = b0 - p.h * HS;
        const [sa, sb] = P(p.x0 !== undefined ? p.x0 : p.x, p.y0 !== undefined ? p.y0 : p.y);
        // 火焰尾巴
        const dx = sa - a, dy = (sb - 7 * HS) - b, l = Math.hypot(dx, dy) || 1;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const tl = s * 2.2;
        ctx.strokeStyle = lgrad(ctx, a, b, a + dx / l * tl, b + dy / l * tl, ['rgba(255,220,120,.9)', 'rgba(255,120,40,.5)', 'rgba(255,60,20,0)']);
        ctx.lineWidth = s * 0.35; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + dx / l * tl, b + dy / l * tl); ctx.stroke();
        ctx.drawImage(Gfx.glow('#ff9a3a'), a - s * 0.8, b - s * 0.8, s * 1.6, s * 1.6);
        ctx.restore();
        circ(ctx, a, b, s * 0.24, rgrad(ctx, a, b, 0, s * 0.24, ['#fff0b0', '#ff8a2a', '#8a2a10'], -s * 0.06, -s * 0.06));
        // 地上影子
        const [ga, gb] = P(p.tx, p.ty); ell(ctx, ga, gb, s * 0.3 * (1 - p.h / 8), s * 0.15 * (1 - p.h / 8), 'rgba(0,0,0,.25)');
        continue;
      }
      const [a, b0] = P(p.x, p.y);
      switch (p.k) {
        case 'arrow': {
          if (p._sd === undefined) { p._sd = Math.max(0.5, Math.hypot(p.tx - p.x, p.ty - p.y)); p._tr = []; }
          const d = Math.hypot(p.tx - p.x, p.ty - p.y), u = clamp(1 - d / p._sd, 0, 1);
          const arc = Math.sin(u * Math.PI) * Math.min(0.55, p._sd * 0.16);
          const b = b0 - (p.h + arc) * HS;
          const prev = p._tr.length ? p._tr[p._tr.length - 1] : null;
          let ang = prev ? Math.atan2(b - prev[1], a - prev[0]) : V.A(p.ang || 0);
          if (prev && Math.hypot(b - prev[1], a - prev[0]) < 0.5) ang = p._ang || ang;
          p._ang = ang;
          if (!prev || Math.hypot(b - prev[1], a - prev[0]) > s * 0.06) { p._tr.push([a, b]); if (p._tr.length > 4) p._tr.shift(); }
          // 尾跡
          if (p._tr.length > 1) { ctx.strokeStyle = p.crit ? 'rgba(255,180,80,.45)' : 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, s * 0.025); ctx.beginPath(); ctx.moveTo(p._tr[0][0], p._tr[0][1]); for (const q of p._tr) ctx.lineTo(q[0], q[1]); ctx.lineTo(a, b); ctx.stroke(); }
          ctx.save(); ctx.translate(a, b); ctx.rotate(ang);
          const L = s * 0.26;
          ctx.strokeStyle = '#7a5532'; ctx.lineWidth = Math.max(1.5, s * 0.035); ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, 0); ctx.stroke();
          poly(ctx, [s * 0.06, 0, -s * 0.01, -s * 0.03, -s * 0.01, s * 0.03], p.crit ? '#ffb347' : '#d8dde6');
          poly(ctx, [-L, 0, -L - s * 0.05, -s * 0.04, -L + s * 0.05, 0, -L - s * 0.05, s * 0.04], '#f2ece0');
          ctx.restore();
          break;
        }
        case 'ball': {
          const b = b0 - p.h * HS;
          ell(ctx, a, b0 + s * 0.05, s * 0.11, s * 0.05, 'rgba(0,0,0,.25)');
          const r = s * (p.big ? 0.15 : 0.11);
          circ(ctx, a, b, r, rgrad(ctx, a, b, 0, r, ['#8a909a', '#3a3e46', '#16181c'], -r * 0.4, -r * 0.4));
          if (p.big) { ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(a, b, r * 0.7, time * 8, time * 8 + 1.5); ctx.stroke(); }
          p._st = (p._st || 0) - dt;
          if (p._st <= 0) { p._st = lowFx ? 0.08 : 0.04; FX.part('smoke', p.x, p.y, p.h, 0, 0, 0.1, 0.45, 0.07, '#cfc8bc'); }
          break;
        }
        case 'shard': {
          const b = b0 - p.h * HS;
          const ang = V.A(p.ang || 0);
          ctx.save(); ctx.translate(a, b); ctx.rotate(ang);
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(Gfx.glow('#7fe0ff'), -s * 0.3, -s * 0.2, s * 0.6, s * 0.4); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          poly(ctx, [s * 0.17, 0, 0, s * 0.06, -s * 0.13, 0, 0, -s * 0.06], '#e8fbff');
          poly(ctx, [s * 0.17, 0, 0, -s * 0.06, -s * 0.02, 0], '#a8e8ff');
          ctx.restore();
          if (Math.random() < 0.4) FX.part('glint', p.x, p.y, p.h, 0, 0, -0.2, 0.3, 0.035, '#dff8ff');
          break;
        }
        case 'orb': {
          const b = b0 - p.h * HS;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(Gfx.glow('#b06bff'), a - s * 0.35, b - s * 0.35, s * 0.7, s * 0.7);
          ctx.restore();
          circ(ctx, a, b, s * 0.09, rgrad(ctx, a, b, 0, s * 0.09, ['#ffffff', '#e2c8ff', '#9a5aff']));
          for (let i = 0; i < 2; i++) { const an = time * 12 + i * Math.PI; circ(ctx, a + Math.cos(an) * s * 0.14, b + Math.sin(an) * s * 0.07, s * 0.025, '#f4e8ff'); }
          if (Math.random() < 0.5) FX.part('glint', p.x, p.y, p.h, 0, 0, 0, 0.35, 0.04, '#d8b8ff');
          break;
        }
        case 'missile': {
          const b = b0 - p.h * HS;
          const ang = V.A(Math.atan2(p.vy, p.vx));
          ctx.save(); ctx.translate(a, b); ctx.rotate(ang);
          ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(Gfx.glow('#ffb347'), -s * 0.35, -s * 0.12, s * 0.28, s * 0.24); ctx.globalCompositeOperation = 'source-over';
          rrect(ctx, -s * 0.11, -s * 0.035, s * 0.2, s * 0.07, s * 0.03); ctx.fillStyle = '#f0ebe0'; ctx.fill();
          poly(ctx, [s * 0.13, 0, s * 0.08, -s * 0.035, s * 0.08, s * 0.035], '#e5484d');
          poly(ctx, [-s * 0.11, -s * 0.035, -s * 0.15, -s * 0.07, -s * 0.07, -s * 0.035], '#e5484d');
          poly(ctx, [-s * 0.11, s * 0.035, -s * 0.15, s * 0.07, -s * 0.07, s * 0.035], '#e5484d');
          circ(ctx, -s * 0.14, 0, s * (0.03 + Math.random() * 0.025), '#ffe27a');
          ctx.restore();
          break;
        }
      }
    }
  }
  function drawBolts(ctx, G, s, HS) {
    for (const bo of G.bolts) {
      const u = bo.life / bo.max;
      const pts = bo.pts.map(p => { const [a, b] = V.P(p.x, p.y); return [a, b - p.h * HS]; });
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (bo.beam) {
        const [x0, y0] = pts[0], [x1, y1] = pts[1];
        for (const [w, c, al] of [[s * 0.5, bo.c, 0.3], [s * 0.26, bo.c, 0.8], [s * 0.1, '#ffffff', 1]]) { ctx.globalAlpha = u * al; ctx.strokeStyle = c; ctx.lineWidth = w * (0.4 + u * 0.6); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
        ctx.globalAlpha = u; ctx.drawImage(Gfx.glow(bo.c), x0 - s * 0.4, y0 - s * 0.4, s * 0.8, s * 0.8);
      } else if (bo.tracer) {
        const [x0, y0] = pts[0], [x1, y1] = pts[1];
        ctx.globalAlpha = u; ctx.strokeStyle = lgrad(ctx, x0, y0, x1, y1, ['rgba(255,246,200,0)', 'rgba(255,246,200,.95)']); ctx.lineWidth = Math.max(1.5, s * 0.04); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.drawImage(Gfx.glow('#fff2a8'), x1 - s * 0.25, y1 - s * 0.25, s * 0.5, s * 0.5);
      } else {
        // 連鎖閃電：每幀重新抖動
        const path = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
          if (i === 0) path.push([x0, y0]);
          const segs = 5, nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
          for (let j = 1; j <= segs; j++) { const f = j / segs, jit = j < segs ? (Math.random() - 0.5) * s * 0.35 : 0; path.push([lerp(x0, x1, f) + nx / nl * jit, lerp(y0, y1, f) + ny / nl * jit]); }
        }
        for (const [w, c, al] of [[s * 0.32, bo.c, 0.25], [s * 0.12, bo.c, 0.8], [s * 0.04, '#ffffff', 1]]) {
          ctx.globalAlpha = Math.min(1, u * 1.5) * al; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
          path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        }
        ctx.globalAlpha = Math.min(1, u * 1.5);
        for (const [x, y] of pts.slice(1)) ctx.drawImage(Gfx.glow('#d8c0ff'), x - s * 0.3, y - s * 0.3, s * 0.6, s * 0.6);
      }
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    }
  }
  const ADD = { fire: 1, flash: 1, spark: 1, ember: 1, firefly: 1, glint: 1 };
  function drawParticles(ctx, G, s, HS, time, additive) {
    const P = V.P;
    // 模擬層粒子
    if (!additive) {
      for (const p of G.parts) {
        const [a, b0] = P(p.x, p.y), b = b0 - p.h * HS, u = p.life / p.max;
        if (p.k === 'smoke') { ctx.globalAlpha = u * 0.5; const r = p.sz * s * (1.8 - u) * 1.4; ctx.drawImage(Gfx.puff(p.c), a - r, b - r, r * 2, r * 2); }
        else if (p.k === 'spark') continue;
        else if (p.k === 'snow') { ctx.globalAlpha = Math.min(1, u * 2); circ(ctx, a, b, p.sz * s * 0.8, p.c); }
        else { ctx.globalAlpha = Math.min(1, u * 2); const r = p.sz * s; circ(ctx, a, b, r, p.c); circ(ctx, a - r * 0.3, b - r * 0.3, r * 0.4, 'rgba(255,255,255,.6)'); }
      }
    } else {
      for (const p of G.parts) {
        if (p.k !== 'spark') continue;
        const [a, b0] = P(p.x, p.y), b = b0 - p.h * HS, u = p.life / p.max;
        ctx.globalAlpha = u; ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(1.5, s * 0.035); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a - p.vx * s * 0.05, b - p.vy * s * 0.05 + p.vh * s * 0.04); ctx.stroke();
      }
    }
    // 畫面層粒子
    for (const p of FX.parts) {
      if (!!ADD[p.k] !== additive) continue;
      const [a, b0] = P(p.x, p.y), b = b0 - p.h * HS, u = p.life / p.max;
      switch (p.k) {
        case 'smoke': case 'mist': { ctx.globalAlpha = u * (p.k === 'mist' ? 0.35 : 0.45); const r = p.sz * s * (1 + (1 - u) * 1.3); ctx.drawImage(Gfx.puff(p.c), a - r, b - r, r * 2, r * 2); break; }
        case 'dust': { ctx.globalAlpha = Math.sin(u * Math.PI) * 0.25; const r = p.sz * s; ctx.drawImage(Gfx.puff(p.c), a - r * 1.6, b - r * 0.6, r * 3.2, r * 1.2); break; }
        case 'debris': { ctx.globalAlpha = Math.min(1, u * 3); ctx.save(); ctx.translate(a, b); ctx.rotate(p.rot); const r = p.sz * s; ctx.fillStyle = p.c; ctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-r, r * 0.2, r * 2, r * 0.5); ctx.restore(); break; }
        case 'ice': { ctx.globalAlpha = Math.min(1, u * 2); ctx.save(); ctx.translate(a, b); ctx.rotate(p.rot); const r = p.sz * s; poly(ctx, [0, -r * 1.6, r * 0.6, 0, 0, r * 1.6, -r * 0.6, 0], '#e8fbff'); ctx.restore(); break; }
        case 'coin': { ctx.globalAlpha = 1; const r = s * 0.075, sq = Math.abs(Math.cos(p.rot * 1.5)); ell(ctx, a, b, r * Math.max(0.2, sq), r, '#c99a2a'); ell(ctx, a - r * 0.1 * sq, b, r * Math.max(0.15, sq) * 0.8, r * 0.8, '#ffd84a'); break; }
        case 'plus': { ctx.globalAlpha = Math.min(1, u * 2); const r = s * 0.06; ctx.fillStyle = p.c; ctx.fillRect(a - r * 0.35, b - r, r * 0.7, r * 2); ctx.fillRect(a - r, b - r * 0.35, r * 2, r * 0.7); break; }
        case 'leaf': { ctx.globalAlpha = Math.min(1, u * 3); ctx.save(); ctx.translate(a, b); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(time * 3 + p.rot)) * 0.7 + 0.3); ell(ctx, 0, 0, s * 0.07, s * 0.035, p.c); ctx.restore(); break; }
        case 'snow': { ctx.globalAlpha = Math.min(1, u * 3) * 0.9; circ(ctx, a, b, p.sz * s, p.c); break; }
        case 'fly': { ctx.globalAlpha = Math.min(1, u * 3); const fl = Math.abs(Math.sin(time * 18 + p.rot)); ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(a - s * 0.04 * fl, b, s * 0.045 * fl + 1, s * 0.035, -0.4, 0, TAU); ctx.ellipse(a + s * 0.04 * fl, b, s * 0.045 * fl + 1, s * 0.035, 0.4, 0, TAU); ctx.fill(); break; }
        case 'bird': { ctx.globalAlpha = 1; const fl = Math.sin(time * 10 + p.rot) * s * 0.06; ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a - s * 0.12, b - fl); ctx.quadraticCurveTo(a - s * 0.05, b - s * 0.04, a, b); ctx.quadraticCurveTo(a + s * 0.05, b - s * 0.04, a + s * 0.12, b - fl); ctx.stroke(); break; }
        case 'fire': { ctx.globalAlpha = u; const r = p.sz * s * (0.6 + u * 0.6); ctx.drawImage(Gfx.glow(u > 0.6 ? '#ffe27a' : u > 0.3 ? p.c : '#c8401a', true), a - r, b - r, r * 2, r * 2); break; }
        case 'flash': { ctx.globalAlpha = u * 0.75; const r = p.sz * s * (1.2 - u * 0.3); ctx.drawImage(Gfx.glow(p.c), a - r, b - r, r * 2, r * 2); break; }
        case 'glint': { ctx.globalAlpha = Math.min(1, u * 2); const r = Math.max(1.5, p.sz * s * 1.5); ctx.drawImage(Gfx.glow(p.c, true), a - r, b - r, r * 2, r * 2); break; }
        case 'ember': { ctx.globalAlpha = Math.sin(u * Math.PI); const r = Math.max(1.5, p.sz * s * 2); ctx.drawImage(Gfx.glow(p.c, true), a - r, b - r, r * 2, r * 2); break; }
        case 'firefly': { ctx.globalAlpha = Math.sin(u * Math.PI) * (0.5 + 0.5 * Math.sin(time * 4 + p.rot * 3)); const r = Math.max(2, s * 0.09); ctx.drawImage(Gfx.glow(p.c), a - r, b - r, r * 2, r * 2); break; }
      }
    }
    ctx.globalAlpha = 1;
  }
  const LCOL = { arrow: '#ffcf7a', cannon: '#ffcf7a', sniper: '#ffcf7a', banner: '#ffb35a', mine: '#ffd36b', magic: '#c08bff', frost: '#9fe6ff' };
  function collectLights(G, s, HS, time, th) {
    const L = [], P = V.P;
    const add = (x, y, h, r, c, a) => { const [sx, sy] = P(x, y); L.push({ sx, sy: sy - h * HS, r, c, a }); };
    const dark = Terrain.pal(th).dark > 0;
    for (const t of G.towers) {
      const h = Art.topH(t.k, t.tier) / Art.HS;
      if (t.k === 'magic' || t.k === 'frost') add(t.cx, t.cy, h + 0.25, 1.6 + t.tier * 0.15, LCOL[t.k], 0.8 + 0.2 * Math.sin(time * 3 + t.id));
      else if (dark) add(t.cx, t.cy, h * 0.7, 1.4, LCOL[t.k], 0.75 + 0.1 * Math.sin(time * 9 + t.id));
    }
    for (const p of props) { if (p.k === 'crystal') add(p.wx, p.wy, 0.3, 1.2, th === 'volcano' ? '#ffb35a' : '#9fe6ff', 0.7 + 0.2 * Math.sin(time * 2 + p.ph)); else if (p.k === 'lamp') add(p.wx, p.wy, 0.8, 1.6, '#ffcf7a', 0.85); }
    for (const p of TR.portals) add(p.x, p.y, 0.4, 2, (PORTAL_COL[th] || ['#ff9ae0', '#b06bff'])[1], 0.8 + 0.2 * Math.sin(time * 3));
    if (dark) { const e = G.exitPt; add(e.x, e.y, 0.6, 2.4, '#ffcf7a', 0.8); }
    if (TR.waters.length && TR.waters[0].lava) for (const w of TR.waters) { const [x0, y0, x1, y1] = w.box; L.push({ sx: (x0 + x1) / 2, sy: (y0 + y1) / 2, r: Math.max(x1 - x0, y1 - y0) / s * 0.9, c: '#ff7a2a', a: 0.8 + 0.15 * Math.sin(time * 2) }); }
    for (const p of G.projs) { if (p.k === 'orb') add(p.x, p.y, p.h, 0.9, '#c08bff', 0.9); else if (p.k === 'missile') add(p.x, p.y, p.h, 0.7, '#ffb347', 0.8); else if (p.k === 'meteor' && p.tt >= 0) add(p.x, p.y, p.h, 2.6, '#ff8a3a', 1); else if (p.k === 'shard') add(p.x, p.y, p.h, 0.6, '#9fe6ff', 0.6); }
    for (const l of FX.lights) add(l.x, l.y, l.h, l.r, l.c, l.a * (l.life / l.max));
    if (dark) for (const p of FX.parts) if (p.k === 'firefly' || p.k === 'ember' || p.k === 'fire') { const [sx, sy] = P(p.x, p.y); L.push({ sx, sy: sy - p.h * HS, r: p.k === 'fire' ? 0.8 : 0.35, c: null, a: 0.6 }); }
    for (const e of G.enemies) if (e.alive && (e.k === 'bossLich' || e.k === 'bossGolem')) add(e.x, e.y, 0.6, 1.8, e.k === 'bossLich' ? '#b38aff' : '#ff8a2a', 0.7);
    for (const b of G.bolts) { const p = b.pts[b.pts.length - 1]; add(p.x, p.y, p.h, 1.4, b.c, b.life / b.max); }
    return L;
  }
  function drawDarkness(ctx, lights, PAL) {
    const q = 0.25, w = Math.ceil(V.w * q), h = Math.ceil(V.h * q);
    if (!lightC || lightC.width !== w || lightC.height !== h) { lightC = Gfx.canvas(w, h); lightC._x = lightC.getContext('2d'); darkN = 0; }
    // 光照圖每兩幀更新一次（很柔和，看不出差別）
    if ((darkN++ & 1) === 1) { ctx.drawImage(lightC, V.ox, V.oy, V.w, V.h); return; }
    const x = lightC._x;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.clearRect(0, 0, w, h);
    x.fillStyle = rgba(PAL.darkC || '#0a0c26', PAL.dark); x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-out';
    const g = Gfx.glow('#ffffff');
    for (const l of lights) { if (l.r < 0.5) continue; const r = l.r * V.s * q; x.globalAlpha = Math.min(1, l.a); x.drawImage(g, (l.sx - V.ox) * q - r, (l.sy - V.oy) * q - r, r * 2, r * 2); }
    ctx.drawImage(lightC, V.ox, V.oy, V.w, V.h);
  }
  let cloudC = null;
  function cloudSprite() {
    if (cloudC) return cloudC;
    const W = 256, H = 140; cloudC = Gfx.canvas(W, H); const x = cloudC.getContext('2d');
    const r = mkRng(77);
    for (let i = 0; i < 14; i++) { const px = W * (0.18 + r() * 0.64), py = H * (0.32 + r() * 0.36), rr = H * (0.26 + r() * 0.2); x.fillStyle = rgrad(x, px, py, 0, rr, ['rgba(10,20,40,.16)', 'rgba(10,20,40,.08)', 'rgba(10,20,40,0)']); x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill(); }
    return cloudC;
  }
  function waveBadges(ctx, G, ui, s, time) {
    const nw = ui.nextInfo;
    if (G.state === 'won' || G.state === 'lost' || !nw || !(G.state === 'ready' || G.nextT !== null)) return;
    for (const ei of nw.ents) {
      const ep = G.entryPts[ei]; if (!ep) continue;
      const [a, b] = V.P(clamp(ep.x, 0.5, COLS - 0.5), clamp(ep.y, 0.5, ROWS - 0.5));
      const pul = 1 + Math.sin(time * 5) * 0.06, r = s * 0.36 * pul;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 5); ctx.drawImage(Gfx.glow('#ff5d4a'), a - r * 2, b - r * 2, r * 4, r * 4); ctx.restore();
      circ(ctx, a, b, r, rgrad(ctx, a, b, 0, r, ['#5a2a3a', '#2a1420']));
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.beginPath(); ctx.arc(a, b, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
      const f = G.state === 'ready' ? 1 : clamp(G.nextT / WAVE_GAP, 0, 1);
      ctx.beginPath(); ctx.arc(a, b, r, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke(); ctx.lineCap = 'butt';
      // 骷髏
      circ(ctx, a, b - s * 0.035, s * 0.15, '#f4efe4'); ctx.fillStyle = '#f4efe4'; ctx.fillRect(a - s * 0.08, b + s * 0.05, s * 0.16, s * 0.07);
      circ(ctx, a - s * 0.055, b - s * 0.04, s * 0.045, '#2a1e2a'); circ(ctx, a + s * 0.055, b - s * 0.04, s * 0.045, '#2a1e2a');
      ctx.fillStyle = '#2a1e2a'; for (let i = -1; i <= 1; i++) ctx.fillRect(a + i * s * 0.045 - 1, b + s * 0.06, 2, s * 0.06);
      const ang = V.A(Math.atan2(ep.dy, ep.dx));
      ctx.save(); ctx.translate(a + Math.cos(ang) * r * 1.5, b + Math.sin(ang) * r * 1.5); ctx.rotate(ang);
      poly(ctx, [s * 0.14, 0, -s * 0.08, -s * 0.12, -s * 0.03, 0, -s * 0.08, s * 0.12], '#ffd36b'); ctx.restore();
      ctx.restore();
    }
  }

  // ───────── 畫面最上層 ─────────
  function overlays(ctx, G, ui, s, time, W, H) {
    // 隕石召喚時天色變紅
    if (FX.st.meteorSky > 0) { ctx.fillStyle = lgrad(ctx, 0, 0, 0, H * 0.6, [`rgba(255,90,30,${FX.st.meteorSky * 0.18})`, 'rgba(255,90,30,0)']); ctx.fillRect(0, 0, W, H); }
    if (FX.st.flashW > 0) { ctx.fillStyle = `rgba(255,240,200,${FX.st.flashW * 0.8})`; ctx.fillRect(0, 0, W, H); }
    // 頭目在場：暗紅邊緣
    const boss = G.enemies.find(e => e.alive && e.boss);
    if (boss) {
      ctx.globalAlpha = 0.6 + 0.2 * Math.sin(time * 3); ctx.drawImage(vignette(W, H, '#780014', 0.32), 0, 0, W, H); ctx.globalAlpha = 1;
      bossBar(ctx, boss, s);
    }
    if (G.flash > 0) {
      ctx.globalAlpha = Math.min(1, G.flash); ctx.drawImage(vignette(W, H, '#ff283c', 1), 0, 0, W, H); ctx.globalAlpha = 1;
    }
    const fr = Math.max(FX.st.freeze / 1.8, (G.iceFlash || 0) / 0.8);
    if (fr > 0) { ctx.globalAlpha = Math.min(1, fr); ctx.drawImage(frostOverlay(W, H), 0, 0, W, H); ctx.globalAlpha = 1; }
    // 金幣飛向上方
    const tg = goldTarget();
    for (const c of FX.coins) {
      const [a, b0] = V.P(c.x, c.y), sb = b0 - c.h * s * Art.HS, u = c.t / 0.7;
      if (!tg) { ctx.globalAlpha = 1 - u; circ(ctx, a, sb - u * s * 0.5, s * 0.07, '#ffd84a'); ctx.globalAlpha = 1; continue; }
      const e = u * u * (3 - 2 * u);
      const x = lerp(a, tg[0], e), y = lerp(sb, tg[1], e) - Math.sin(u * Math.PI) * s * 0.8, r = Math.max(4, s * 0.08) * (1 - u * 0.3);
      circ(ctx, x, y, r, '#c99a2a'); circ(ctx, x - r * 0.1, y - r * 0.1, r * 0.8, '#ffd84a'); circ(ctx, x - r * 0.3, y - r * 0.3, r * 0.25, '#fff4c0');
    }
    banners(ctx, G, ui, s, time);
    if (ui.aiming && ui.hover) {
      const [a, b] = V.P(ui.hover.wx, ui.hover.wy), R = SKILLS.meteor.r * s * 1.5;
      ctx.fillStyle = rgrad(ctx, a, b, 0, R, ['rgba(255,120,60,.05)', 'rgba(255,120,60,.25)']); ctx.beginPath(); ctx.arc(a, b, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ff7a4a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = time * 20; ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function bossBar(ctx, boss, s) {
    const bw = Math.min(V.w * 0.72, 440), bx = V.ox + (V.w - bw) / 2, by = V.oy + s * 0.3, bh = Math.max(9, s * 0.18);
    rrect(ctx, bx - 6, by - 4, bw + 12, bh + 26, 10); ctx.fillStyle = 'rgba(24,10,22,.85)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,90,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    const f = clamp(boss.hp / boss.maxHp, 0, 1);
    rrect(ctx, bx, by + 17, bw, bh, bh / 2); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill();
    if (f > 0) { rrect(ctx, bx, by + 17, Math.max(bh, bw * f), bh, bh / 2); ctx.fillStyle = lgrad(ctx, bx, 0, bx + bw, 0, ['#ff2a4a', '#ff7a3c', '#ffc94a']); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(bx + 3, by + 18, Math.max(0, bw * f - 6), bh * 0.3); }
    ctx.font = '700 12.5px "Noto Sans TC",sans-serif'; ctx.fillStyle = '#ffe9d0'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('☠ 頭目 · ' + boss.d.name, bx + 2, by - 1);
    ctx.textAlign = 'right'; ctx.font = '600 12px "Fredoka",sans-serif'; ctx.fillText(Math.ceil(boss.hp) + ' / ' + Math.round(boss.maxHp), bx + bw - 2, by - 1);
  }
  const vigs = {};
  function vignette(W, H, c, a) {
    const k = W + 'x' + H + c;
    if (vigs[k]) return vigs[k];
    const q = 0.5, cv = Gfx.canvas(W * q, H * q), x = cv.getContext('2d'); x.scale(q, q);
    x.fillStyle = rgrad(x, W / 2, H / 2, Math.min(W, H) * 0.3, Math.max(W, H) * 0.72, [rgba(c, 0), rgba(c, a)]); x.fillRect(0, 0, W, H);
    return (vigs[k] = cv);
  }
  let frostKeyC = null;
  function frostOverlay(W, H) {
    const k = W + 'x' + H;
    if (frostC && frostKey === k) return frostC;
    frostKey = k; frostC = Gfx.canvas(W, H); const x = frostC.getContext('2d');
    x.fillStyle = rgrad(x, W / 2, H / 2, Math.min(W, H) * 0.25, Math.max(W, H) * 0.72, ['rgba(200,240,255,0)', 'rgba(200,240,255,.35)', 'rgba(235,250,255,.92)']); x.fillRect(0, 0, W, H);
    const r = mkRng(5);
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const side = i % 4; let px = side === 0 ? r() * W : side === 1 ? W : side === 2 ? r() * W : 0, py = side === 0 ? 0 : side === 1 ? r() * H : side === 2 ? H : r() * H;
      const ang = Math.atan2(H / 2 - py, W / 2 - px) + (r() - 0.5) * 0.8, L = 30 + r() * 90;
      x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(px, py); const ex = px + Math.cos(ang) * L, ey = py + Math.sin(ang) * L; x.lineTo(ex, ey);
      for (const sd of [-1, 1]) { const m = 0.4 + r() * 0.3; x.moveTo(px + Math.cos(ang) * L * m, py + Math.sin(ang) * L * m); x.lineTo(px + Math.cos(ang) * L * m + Math.cos(ang + sd * 0.7) * L * 0.25, py + Math.sin(ang) * L * m + Math.sin(ang + sd * 0.7) * L * 0.25); }
      x.stroke();
    }
    void frostKeyC;
    return frostC;
  }
  // 緞帶橫幅
  function ribbon(ctx, cx, cy, w, h, c1, c2) {
    const tail = h * 0.7;
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + sd * (w / 2 - tail * 0.2), cy - h * 0.2); ctx.lineTo(cx + sd * (w / 2 + tail), cy - h * 0.2); ctx.lineTo(cx + sd * (w / 2 + tail * 0.55), cy + h * 0.25); ctx.lineTo(cx + sd * (w / 2 + tail), cy + h * 0.7); ctx.lineTo(cx + sd * (w / 2 - tail * 0.2), cy + h * 0.7); ctx.closePath();
      ctx.fillStyle = shade(c2, -0.25); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(cx - w / 2, cy - h / 2); ctx.quadraticCurveTo(cx, cy - h * 0.62, cx + w / 2, cy - h / 2); ctx.lineTo(cx + w / 2, cy + h / 2); ctx.quadraticCurveTo(cx, cy + h * 0.38, cx - w / 2, cy + h / 2); ctx.closePath();
    ctx.fillStyle = lgrad(ctx, 0, cy - h / 2, 0, cy + h / 2, [shade(c1, 0.2), c1, c2]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,160,.85)'; ctx.lineWidth = Math.max(1.5, h * 0.05); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,160,.4)'; ctx.setLineDash([h * 0.12, h * 0.08]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - w / 2 + h * 0.15, cy - h * 0.36); ctx.quadraticCurveTo(cx, cy - h * 0.48, cx + w / 2 - h * 0.15, cy - h * 0.36); ctx.moveTo(cx - w / 2 + h * 0.15, cy + h * 0.36); ctx.quadraticCurveTo(cx, cy + h * 0.24, cx + w / 2 - h * 0.15, cy + h * 0.36); ctx.stroke(); ctx.setLineDash([]);
  }
  function banners(ctx, G, ui, s, time) {
    const bn = ui.banner;
    if (!bn) return;
    const dur = bn.intro ? 3.0 : bn.boss ? 3.0 : 2.2;
    if (bn.t >= dur) return;
    const bt = bn.t, a = bt < 0.3 ? bt / 0.3 : bt > dur - 0.5 ? (dur - bt) / 0.5 : 1;
    const cx = V.ox + V.w / 2, cy = V.oy + V.h * (bn.intro ? 0.36 : 0.3);
    const pop = bt < 0.3 ? 0.7 + 0.3 * Math.sin(bt / 0.3 * Math.PI / 2) + Math.sin(bt / 0.3 * Math.PI) * 0.08 : 1;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (bn.intro) {
      // 關卡開場卡：羊皮紙卷軸
      const w = Math.min(V.w * 0.86, 520), h = Math.min(w * 0.42, 190);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      rrect(ctx, cx - w / 2, cy - h / 2, w, h, 10); ctx.fillStyle = lgrad(ctx, 0, cy - h / 2, 0, cy + h / 2, ['#fbf0d4', '#f0dcae', '#e2c68e']); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#a8742e'; ctx.lineWidth = 2; rrect(ctx, cx - w / 2 + 6, cy - h / 2 + 6, w - 12, h - 12, 7); ctx.stroke();
      for (const sd of [-1, 1]) { rrect(ctx, cx + sd * w / 2 - 9, cy - h / 2 - 8, 18, h + 16, 9); ctx.fillStyle = lgrad(ctx, cx + sd * w / 2 - 9, 0, cx + sd * w / 2 + 9, 0, ['#c8944a', '#f0c880', '#8a5a22']); ctx.fill(); }
      const num = bn.li !== undefined ? bn.li + 1 : '';
      circ(ctx, cx, cy - h / 2, h * 0.17, lgrad(ctx, 0, cy - h / 2 - h * 0.17, 0, cy - h / 2 + h * 0.17, ['#ffe08a', '#d89a2a']));
      ctx.strokeStyle = '#8a5a12'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#5a3200'; ctx.font = `700 ${h * 0.17}px "Fredoka",sans-serif`; ctx.fillText(num, cx, cy - h / 2 + 1);
      ctx.fillStyle = '#4a2a0a'; ctx.font = `900 ${h * 0.25}px "Noto Sans TC",sans-serif`; ctx.fillText(bn.big, cx, cy - h * 0.06);
      ctx.fillStyle = '#9a6a2a'; ctx.font = `600 ${h * 0.09}px "Fredoka",sans-serif`; ctx.fillText((bn.en || '').split('').join(' '), cx, cy + h * 0.16);
      ctx.fillStyle = '#6a4a20'; ctx.font = `700 ${h * 0.1}px "Noto Sans TC",sans-serif`; ctx.fillText(bn.small, cx, cy + h * 0.33);
    } else if (bn.boss) {
      const w = Math.min(V.w * 0.8, 480), h = Math.min(66, s * 1.1);
      const slide = bt < 0.35 ? (1 - bt / 0.35) * -V.w * 0.6 : 0;
      ctx.translate(slide, 0);
      ribbon(ctx, cx, cy, w, h, '#b8202e', '#6a0a18');
      const ek = bn.k;
      if (ek) { const B = Beasts.BOX[ek], R = h * 1.2 / B.h, sp = Beasts.frame(ek, R, Math.floor(time * 8) % Beasts.FR, 0, dpr); Gfx.drawSprite(ctx, sp, cx - w / 2 + h * 0.6, cy + h * 0.45); }
      ctx.font = `900 ${h * 0.48}px "Noto Sans TC",sans-serif`; ctx.lineWidth = h * 0.1; ctx.strokeStyle = 'rgba(60,0,10,.9)';
      ctx.strokeText(bn.big, cx + h * 0.3, cy - h * 0.06); ctx.fillStyle = '#ffe9a0'; ctx.fillText(bn.big, cx + h * 0.3, cy - h * 0.06);
      ctx.font = `700 ${h * 0.24}px "Noto Sans TC",sans-serif`; ctx.fillStyle = '#ffd0d0'; ctx.fillText(bn.small, cx + h * 0.3, cy + h * 0.3);
    } else {
      const sz = Math.min(V.w * 0.085, 46), w = Math.min(V.w * 0.62, sz * 7.5), h = sz * 1.45;
      ribbon(ctx, cx, cy, w, h, '#3a6fd8', '#1e3f8a');
      ctx.font = `900 ${sz}px "Noto Sans TC",sans-serif`; ctx.lineWidth = sz * 0.14; ctx.strokeStyle = 'rgba(10,20,60,.85)';
      ctx.strokeText(bn.big, cx, cy - sz * 0.08); ctx.fillStyle = '#ffe9a0'; ctx.fillText(bn.big, cx, cy - sz * 0.08);
      if (bn.small) { ctx.font = `700 ${sz * 0.36}px "Noto Sans TC",sans-serif`; ctx.lineWidth = sz * 0.08; ctx.strokeText(bn.small, cx, cy + h * 0.78); ctx.fillStyle = '#ffffff'; ctx.fillText(bn.small, cx, cy + h * 0.78); }
    }
    ctx.restore();
  }

  return { setView, view, ensureBg, invalidate, frame, thumb, icon, setLow, drawTowerAt: drawTower, fakeGame };
})();
