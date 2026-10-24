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
  // ── 加色亮度上限：把畫面切成格子，每格累積的加色亮度超過上限就逐漸不再加亮（避免爆炸疊在一起變成一片白）──
  let bud = null, budW = 0, budH = 0, budC = 32;
  const BUD_CAP = 1.6;
  function budReset(W, H, s) {
    budC = Math.max(20, s * 0.85);
    const w = Math.ceil(W / budC) + 1, h = Math.ceil(H / budC) + 1;
    if (!bud || w * h > bud.length) bud = new Float32Array(w * h);
    budW = w; budH = h; bud.fill(0, 0, w * h);
  }
  function glowAt(ctx, img, x, y, r, a) {
    if (a <= 0.01 || r <= 0) return;
    const cx = Math.floor(x / budC), cy = Math.floor(y / budC);
    let k = 1, i = -1;
    if (cx >= 0 && cy >= 0 && cx < budW && cy < budH) { i = cy * budW + cx; k = Math.max(0, 1 - bud[i] / BUD_CAP); }
    if (k < 0.03) return;
    const aa = Math.min(1, a) * k;
    ctx.globalAlpha = aa;
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    if (i >= 0) bud[i] += aa * clamp(r / budC, 0.2, 2.5);
  }
  function view() { return V; }
  let qual = 0;
  function setLow(l, q) { lowFx = l; qual = q || 0; FX.setLow(l); const ss = [1.4, 1.2, 1][qual] || 1; Beasts.setSS(ss); Crew.setSS(ss); }

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
    TR.pathGlow = pathGlow(G, W, H);
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
  // 精靈圖預先畫好：排進佇列，每幀用一點點時間慢慢畫，避免開場卡一下
  // 順序：英雄 → 第一波會出現的敵人走路 → 其他敵人走路 → 受擊 → 死亡 → 攻擊／頭目放招 → 塔上小兵
  // 畫面每幀只花幾毫秒慢慢畫，另外在瀏覽器閒置時（requestIdleCallback）多畫一些。
  // 每張圖大概要畫多久（Gfx.stat.est）是估出來的：只有估計放得進剩下的時間才畫，避免一張大圖把一幀拖長
  let warmQ = [], lastWarm = 0;
  function warmStep(ms) {
    const t0 = performance.now();
    while (warmQ.length && performance.now() - t0 + Gfx.stat.est * 0.8 < ms) { warmQ.shift()(); lastWarm = t0; }
    // 每一張都比預算大（很慢的機器）：至少每 0.08 秒畫一張，保證會畫完
    if (warmQ.length && t0 - lastWarm > 80) { warmQ.shift()(); lastWarm = t0; }
  }
  let idleOn = false;
  function idleWarm() {
    if (idleOn || !warmQ.length || typeof requestIdleCallback !== 'function') return;
    idleOn = true;
    requestIdleCallback(dl => { idleOn = false; while (warmQ.length && dl.timeRemaining() > Gfx.stat.est + 1) { warmQ.shift()(); lastWarm = performance.now(); } idleWarm(); }, { timeout: 1000 });
  }
  const wanted = new Set();
  function want(k, R, an, f, dd) { const key = k + R + an + f + dd; if (wanted.has(key)) return; wanted.add(key); warmQ.unshift(() => { wanted.delete(key); Beasts.frame(k, R, f, 0, dd, an); }); }
  function prewarm(G) {
    warmQ = []; wanted.clear();
    const ks = new Set(), first = new Set();
    if (G.waves && G.waves[0]) for (const g of (G.waves[0].groups || G.waves[0])) if (g && g.k) first.add(g.k);
    if (G.L.pool) for (const p of G.L.pool) ks.add(p[0]);
    if (G.L.boss) ks.add(G.L.boss);
    if (G.L.midBoss) ks.add(G.L.midBoss[1]);
    for (const k of [...ks, ...first]) { const d = ENEMIES[k]; ks.add(k); if (d.split) ks.add(d.split); if (d.summon) ks.add(d.summonK || 'skeleton'); }
    const knight = G.hero && G.hero.d.block, dd = dpr;
    const order = [...ks].sort((a, b) => (first.has(b) ? 1 : 0) - (first.has(a) ? 1 : 0));
    const Rof = k => { const d = ENEMIES[k]; return Beasts.visR(k, d.r, V.s) * (d.boss ? 0.85 : 1); };
    if (G.hero) { const id = G.hero.id, R = V.s * 0.33; for (const an of ['idle', 'walk', 'atk', 'cast']) for (let f = 0; f < HeroArt.FR[an]; f++) warmQ.push(() => HeroArt.frame(id, R, an, f, dd)); }
    for (const k of order) warmQ.push(() => { Beasts.frame(k, Rof(k), 0, 0, dd); Beasts.frame(k, Rof(k), 0, 1, dd); });
    for (const k of order) for (let f = 1; f < Beasts.N.walk; f++) warmQ.push(() => Beasts.frame(k, Rof(k), f, 0, dd));
    for (const k of order) for (let f = 0; f < Beasts.N.hit; f++) warmQ.push(() => Beasts.frame(k, Rof(k), f, 0, dd, 'hit'));
    for (const k of order) for (let f = 0; f < Beasts.N.die; f++) warmQ.push(() => Beasts.frame(k, Rof(k), f, 0, dd, 'die'));
    for (const k of order) {
      const d = ENEMIES[k], B = Beasts.BOX[k];
      if (knight && !d.fly && !d.boss) for (let f = 0; f < Beasts.N.atk; f++) warmQ.push(() => Beasts.frame(k, Rof(k), f, 0, dd, 'atk'));
      if (B.boss || B.cast) for (let f = 0; f < Beasts.N.cast; f++) warmQ.push(() => Beasts.frame(k, Rof(k), f, 0, dd, 'cast'));
      if (B.boss) for (let f = 0; f < Beasts.N.idle; f++) warmQ.push(() => Beasts.frame(k, Rof(k), f, 0, dd, 'idle'));
    }
    // 塔上的小兵：把每種塔、每個等級的會動部分在暫存畫布上畫一次，快取就都建好了
    const scratch = Gfx.canvas(8, 8).getContext('2d');
    // 每個工作只畫一種姿勢（一兩張小圖），才不會一次卡太久
    for (const [tier, sp] of [[0, -1], [1, -1], [2, -1], [3, 0], [3, 1]]) for (const k of (G.towersAvail || TOWER_ORDER)) for (const [rec, cd] of (k === 'mine' || k === 'banner' ? [[0, 0]] : [[0, 9], [0, 0.66], [0, 0.33], [0, 0], [1, 0]])) for (let i = 0; i < (k === 'mine' || k === 'banner' ? 8 : 1); i++) warmQ.push(() => {
      const t = { k, tier, spec: sp, id: 0, recoil: rec, cd, st: { rate: 1 }, stunT: 0, pulse: 0 }; scratch.save(); Art.live(scratch, t, V.s, i / 6.5, -0.3, k, tier, sp); scratch.restore();
    });
    idleWarm();
  }

  // ───────── 塔 ─────────
  function towerSprites(k, tier, sp, u) {
    const uq = Math.round(u * 4) / 4, W = 1.8 * uq, H = 2.8 * uq;
    // 塔身外圈加一道柔和的本色外框（約 0.8 個 CSS 像素），不是黑框
    const ol = -Math.min(0.9, Math.max(0.6, uq * 0.014));
    const b = Gfx.sprite(`tw2:${k}:${tier}:${sp}:b:${uq}`, W, H, W / 2, 2.3 * uq, dpr, x => Art.body(x, k, tier, sp, uq, 'back'), ol);
    const f = Gfx.sprite(`tw2:${k}:${tier}:${sp}:f:${uq}`, W, H, W / 2, 2.3 * uq, dpr, x => Art.body(x, k, tier, sp, uq, 'front'), ol);
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
    if (t.stunT > 0 && t.inked) {
      ctx.save(); ctx.globalAlpha = Math.min(1, t.stunT * 1.5) * 0.85; ctx.fillStyle = '#24142e';
      for (let i = 0; i < 5; i++) { const an = i * 1.3 + t.id; ctx.beginPath(); ctx.ellipse(a + Math.cos(an) * s * 0.18, gy - s * 0.7 + Math.sin(an) * s * 0.25, s * 0.13, s * 0.09, an, 0, TAU); ctx.fill(); }
      ctx.restore();
    } else if (t.stunT > 0) {
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
    if (e.under > 0) {
      // 鑽地中：只看得到翻起的土堆
      ctx.globalAlpha = fade;
      for (let i = 0; i < 5; i++) { const ox = (i - 2) * R * 0.35 - e._face * R * 0.2, h = R * (0.35 + 0.15 * Math.sin(time * 12 + i)); ell(ctx, a + ox, gy - h * 0.4, R * 0.3, h * 0.6, i % 2 ? '#5a5a74' : '#44445a'); }
      ell(ctx, a + e._face * R * 0.6, gy - R * 0.25, R * 0.18, R * 0.12, '#9ef0ff');
      ctx.globalAlpha = 1;
      return null;
    }
    const y0 = e.fly ? gy - s * 0.68 + Math.sin(e.wob * 0.5) * s * 0.05 : gy;
    ctx.globalAlpha = fade;
    if (!e.fly) ell(ctx, a, gy, R * (e.boss ? 1.1 : 0.85), R * 0.3, 'rgba(20,10,20,.3)');
    // 動作：放招 > 受擊 > 被擋住時攻擊 > 走路
    if (e.flash > 0.05 && !(e._hcd > 0)) { e._hitT = 0.16; e._hcd = 0.55; }
    if (e._hcd > 0) e._hcd -= dt; if (e._hitT > 0) e._hitT -= dt;
    let an = 'walk', fa = f;
    if (e._castT > 0) { e._castT -= dt; an = 'cast'; fa = Math.min(5, Math.floor((1 - e._castT / 0.9) * 6)); }
    else if (e._hitT > 0 && !e.frozenT) { an = 'hit'; fa = e._hitT > 0.08 ? 0 : 1; }
    else if (e.held) { an = 'atk'; fa = Math.floor(time * 9 + e.id) % Beasts.FA; }
    else if (e.boss && e.frozenT > 0) { an = 'idle'; fa = Math.floor(time * 6) % Beasts.N.idle; }
    const atk = an;
    const sp = Beasts.frame(e.k, R, fa, 0, dpr, atk);
    const flip = face < 0;
    if (flip) { ctx.save(); ctx.translate(a, 0); ctx.scale(-1, 1); a = 0; }
    Gfx.drawSprite(ctx, sp, a, y0);
    if (e.frozenT <= 0 && e.slowA > 0) { ctx.globalAlpha = fade * 0.65; Gfx.drawSprite(ctx, Beasts.frame(e.k, R, fa, 2, dpr, atk), a, y0); ctx.globalAlpha = fade; }
    if (e.flash > 0) { ctx.globalAlpha = fade * Math.min(1, e.flash / 0.09) * 0.85; Gfx.drawSprite(ctx, Beasts.frame(e.k, R, fa, 1, dpr, atk), a, y0); ctx.globalAlpha = fade; }
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
      ctx.globalAlpha = 0.45 + f * 0.55; ctx.drawImage(bubbleSprite(), a - rr, midY - rr, rr * 2, rr * 2); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(a, midY, rr, 0, TAU);
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
        ctx.fillStyle = 'rgba(170,225,250,.65)'; ctx.fill();
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
      if (f > 0) { rrect(ctx, bx, by, Math.max(bh, bw * f), bh, bh / 2); ctx.fillStyle = f > 0.5 ? '#62d46a' : f > 0.25 ? '#f4c440' : '#ee4a56'; ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + 1, by + 0.5, Math.max(0, bw * f - 2), Math.max(1, bh * 0.3));
      if (e.shieldMax) { const sf = clamp(e.shield / e.shieldMax, 0, 1); if (sf > 0) { rrect(ctx, bx, by - bh * 0.75, bw * sf, bh * 0.6, bh * 0.3); ctx.fillStyle = '#8fe8ff'; ctx.fill(); } }
      if (e.armor >= 0.4 || e.mres >= 0.5) { const ix = bx - s * 0.07, iy = by + bh / 2; circ(ctx, ix, iy, s * 0.055, e.armor >= 0.4 ? '#9aa6b8' : '#b48bff'); ctx.strokeStyle = 'rgba(20,14,28,.8)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
  }
  function drawDeath(ctx, d, s, time) {
    const [a, b] = V.P(d.x, d.y), u = d.t / d.dur;
    const R = Beasts.visR(d.k, d.r, s) * (d.boss ? 0.85 : 1);
    const st = (Beasts.BOX[d.k] || {}).die;
    const df = Math.min(Beasts.N.die - 1, Math.floor(Math.min(1, u / 0.8) * Beasts.N.die));
    const sp = Beasts.frame(d.k, R, df, u < 0.08 ? 1 : 0, dpr, 'die');
    const gy = b + s * 0.08;
    ctx.save();
    if (st === 'bake') {
      // 倒下動畫已經畫在圖裡（翻肚、散架、崩塌、化成水）
      ctx.translate(a, d.fly ? gy - s * 0.68 + u * s * 0.2 : gy); ctx.scale(d.face, 1);
      ctx.globalAlpha = 1 - Math.max(0, (u - 0.72) / 0.28);
      Gfx.drawSprite(ctx, sp, 0, 0);
      if (d.boss && Math.random() < 0.3) { const ex = d.x + (Math.random() - 0.5) * 1.2, ey = d.y + (Math.random() - 0.5) * 0.8; FX.part('fire', ex, ey, 0.4 + Math.random(), 0, 0, 0.5, 0.4, 0.4, '#ffb347'); FX.part('flash', ex, ey, 0.6, 0, 0, 0, 0.12, 0.6, '#fff4c8'); }
    } else if (d.fly) {
      const y = gy - s * 0.68 * (1 - u * u);
      ctx.translate(a, y); ctx.rotate(d.face * u * 2.5); ctx.scale(d.face, 1);
      ctx.globalAlpha = 1 - Math.max(0, (u - 0.7) / 0.3);
      Gfx.drawSprite(ctx, sp, 0, 0);
    } else if (d.boss) {
      const sh = (1 - u) * s * 0.05;
      ctx.translate(a + (Math.random() - 0.5) * sh, gy); ctx.scale(d.face * (1 - u * 0.15), 1 - u * 0.3);
      ctx.globalAlpha = 1 - Math.max(0, (u - 0.6) / 0.4);
      Gfx.drawSprite(ctx, sp, 0, 0);
      if (Math.random() < 0.35) { const ex = d.x + (Math.random() - 0.5) * 1.2, ey = d.y + (Math.random() - 0.5) * 0.8; FX.part('fire', ex, ey, 0.4 + Math.random(), 0, 0, 0.5, 0.4, 0.4, '#ffb347'); FX.part('flash', ex, ey, 0.6, 0, 0, 0, 0.12, 0.6, '#fff4c8'); }
    } else {
      ctx.translate(a, gy); ctx.rotate(-d.face * Rig.ease(Math.min(1, u * 1.9)) * 1.45); ctx.scale(d.face, 1);
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


  // ───────── 關卡機制的畫面：傳送陣、海流、水晶基座光芒 ─────────
  function levelFx(ctx, G, s, time) {
    const L = G.L;
    if (L.tp) {
      for (const P of G.paths) for (const sg of P.seg) if (sg.tp) for (const [pt, out] of [[sg.a, 0], [sg.b, 1]]) {
        const [a, b] = V.P(pt.x, pt.y), rr = s * 0.5;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.2 * Math.sin(time * 3); ctx.drawImage(Gfx.glow('#b88aff'), a - rr * 1.3, b - rr * 1.6, rr * 2.6, rr * 2.2); ctx.restore();
        ctx.save(); ctx.translate(a, b); ctx.scale(1, 0.55);
        ctx.fillStyle = rgrad(ctx, 0, 0, 0, rr, [out ? 'rgba(255,230,255,.85)' : 'rgba(220,200,255,.85)', 'rgba(150,100,255,.5)', 'rgba(120,80,255,0)']); ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#e8d8ff'; ctx.lineWidth = Math.max(1.5, s * 0.04);
        for (let i = 0; i < 3; i++) { const a0 = time * (out ? -2.4 : 2.4) + i * 2.1; ctx.beginPath(); ctx.arc(0, 0, rr * (0.55 + i * 0.15), a0, a0 + 1.6); ctx.stroke(); }
        ctx.restore();
      }
    }
    if (G.hasCur) {
      ctx.save();
      for (const [cx, cy, cw, chh] of L.current) for (let y = cy; y < cy + chh; y++) for (let x = cx; x < cx + cw; x++) {
        // 找這格路的方向
        let dx = 0, dy = 0;
        for (const P of G.paths) for (const sg of P.seg) if (segDist2(x + 0.5, y + 0.5, sg.a.x, sg.a.y, sg.b.x, sg.b.y) < 0.05) { dx = sg.dx; dy = sg.dy; }
        if (!dx && !dy) continue;
        { const [a0, b0] = V.P(x + 0.5, y + 0.5); ctx.globalAlpha = 0.22 + 0.06 * Math.sin(time * 3 + x + y); ctx.fillStyle = '#5ad8ff'; rrect(ctx, a0 - s * 0.42, b0 - s * 0.42, s * 0.84, s * 0.84, s * 0.2); ctx.fill(); }
        for (let k = 0; k < 2; k++) {
          const ph = ((time * 1.2 + k * 0.5) % 1), wx = x + 0.5 + dx * (ph - 0.5), wy = y + 0.5 + dy * (ph - 0.5);
          const [a, b] = V.P(wx, wy), an = V.A(Math.atan2(dy, dx));
          ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
          ctx.save(); ctx.translate(a, b); ctx.rotate(an);
          ctx.strokeStyle = '#e8fcff'; ctx.lineWidth = Math.max(2, s * 0.07); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.14); ctx.lineTo(s * 0.06, 0); ctx.lineTo(-s * 0.08, s * 0.14); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
  }

  // ───────── 英雄 ─────────
  function heroAnim(H, time) {
    if (H.castT > 0) return ['cast', Math.min(5, Math.floor((1 - H.castT / 0.55) * 6))];
    if (H.atkT > 0) return ['atk', Math.min(5, Math.floor((1 - H.atkT / 0.32) * 6))];
    if (H.moving) return ['walk', Math.floor(H.walkPh / TAU * 8)];
    return ['idle', Math.floor(time * 5 + H.lv) % 8];
  }
  function drawHero(ctx, G, H, a, b, s, time, ui) {
    const R = s * 0.33, gy = b + s * 0.1;
    const sd = V.rot ? -H.fdy : H.fdx;
    if (sd < -0.25) H._sf = -1; else if (sd > 0.25) H._sf = 1; else if (!H._sf) H._sf = 1;
    const sel = ui && ui.selHero;
    // 光環與影子
    if (sel) {
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath(); ctx.ellipse(a, gy, s * 0.42, s * 0.18, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([s * 0.08, s * 0.08]); ctx.lineDashOffset = -time * s * 0.3; ctx.beginPath(); ctx.ellipse(a, gy, s * 0.52, s * 0.23, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    ell(ctx, a, gy, R * 0.8, R * 0.24, 'rgba(20,10,20,.32)');
    if (H.lvUp > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, H.lvUp) * 0.7;
      ctx.drawImage(Gfx.glow('#ffe27a'), a - s * 0.7, gy - s * 1.2, s * 1.4, s * 1.4);
      ctx.fillStyle = 'rgba(255,230,140,.35)'; ctx.fillRect(a - s * 0.3 * H.lvUp / 1.6, gy - s * 2.2, s * 0.6 * H.lvUp / 1.6, s * 2.2);
      ctx.restore();
    }
    // 盾牆：金色護罩
    if (H.castK === 'wall' && H.castT > 0) {
      const q = 1 - H.castT / 0.55;
      ctx.save(); ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = Math.max(2, s * 0.06);
      ctx.beginPath(); ctx.ellipse(a, gy - s * 0.35, s * (0.5 + q * 0.4), s * (0.6 + q * 0.4), 0, Math.PI, TAU); ctx.stroke(); ctx.restore();
    }
    const [an, f] = heroAnim(H, time);
    const sp = HeroArt.frame(H.id, R, an, f, dpr, H.hurtT > 0 ? 1 : 0);
    ctx.save(); ctx.translate(a, gy); if (H._sf < 0) ctx.scale(-1, 1);
    Gfx.drawSprite(ctx, sp, 0, 0);
    // 旋風斬：劍光
    if (H.castK === 'whirl' && H.castT > 0) {
      const q = 1 - H.castT / 0.55;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - q;
      ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = s * 0.12;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.35, s * 0.85, s * 0.38, 0, q * 9, q * 9 + 3.6); ctx.stroke();
      ctx.lineWidth = s * 0.05; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    } else if (H.d.atk === 'melee' && an === 'atk' && f >= 2 && f <= 4) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#eaf4ff'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(R * 0.4, -R * 1.25, R * 1.5, -1.6 + (f - 2) * 0.5, -0.4 + (f - 2) * 0.5); ctx.stroke(); ctx.lineCap = 'butt';
    }
    ctx.restore();
    // 法杖光點
    if (H.id === 'mage') {
      const lift = an === 'cast' ? Math.sin(f / 5 * Math.PI) * R * 0.45 : 0;
      const gx = a + H._sf * R * 0.42, gyy = gy - R * 2.45 - lift;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = an === 'cast' ? 0.9 : 0.45 + 0.15 * Math.sin(time * 4);
      ctx.drawImage(Gfx.glow('#b88aff'), gx - R * 0.6, gyy - R * 0.6, R * 1.2, R * 1.2); ctx.restore();
    }
    // 血條＋等級
    const top = gy - HeroArt.BOX.top * R;
    const bw = s * 0.62, bh = Math.max(4, s * 0.08), bx = a - bw / 2 + s * 0.08, by = top - bh - s * 0.02;
    rrect(ctx, bx - 1.5, by - 1.5, bw + 3, bh + 3, bh); ctx.fillStyle = 'rgba(20,14,28,.85)'; ctx.fill();
    const hf = clamp(H.hp / H.maxHp, 0, 1);
    if (hf > 0) { rrect(ctx, bx, by, Math.max(bh, bw * hf), bh, bh / 2); ctx.fillStyle = hf > 0.5 ? '#5ad86a' : hf > 0.25 ? '#f0c030' : '#e8404a'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + 1, by + 0.5, Math.max(0, bw * hf - 2), Math.max(1, bh * 0.3)); }
    const lr = Math.max(7, s * 0.15);
    circ(ctx, bx - lr * 0.6, by + bh / 2, lr, H.d.color); ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(lr * 1.15)}px "Fredoka",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(H.lv, bx - lr * 0.6, by + bh / 2 + 0.5);
  }
  function drawHeroGround(ctx, G, H, ui, s, time) {
    // 集結旗：選取英雄時、或正在走過去時顯示
    if (!H.dead && (ui.selHero || H.cmd)) {
      const [a, b] = V.P(H.rx, H.ry);
      ctx.strokeStyle = 'rgba(255,216,74,.8)'; ctx.lineWidth = Math.max(1.5, s * 0.035);
      const p = (time * 1.5) % 1;
      ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.ellipse(a, b, s * (0.15 + p * 0.3), s * (0.07 + p * 0.14), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(a - 1, b - s * 0.55, Math.max(2, s * 0.04), s * 0.55);
      const wv = Math.sin(time * 6) * s * 0.03;
      ctx.beginPath(); ctx.moveTo(a + 1, b - s * 0.55); ctx.quadraticCurveTo(a + s * 0.15, b - s * 0.5 + wv, a + s * 0.3, b - s * 0.47); ctx.lineTo(a + 1, b - s * 0.36); ctx.closePath(); ctx.fillStyle = H.d.color; ctx.fill(); ctx.strokeStyle = 'rgba(30,20,30,.8)'; ctx.lineWidth = 1; ctx.stroke();
      if (ui.selHero && H.d.engage) { ctx.setLineDash([s * 0.1, s * 0.1]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(a, b, H.d.engage * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      if (ui.selHero && !H.d.engage) { ctx.setLineDash([s * 0.1, s * 0.1]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; const [ha, hb] = V.P(H.x, H.y); ctx.beginPath(); ctx.arc(ha, hb, H.d.range * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    }
    // 選取英雄時，道路微微發亮提示可以點
    if (ui.selHero && TR.pathGlow) { ctx.globalAlpha = 0.25 + 0.12 * Math.sin(time * 4); ctx.drawImage(TR.pathGlow, V.ox, V.oy, V.w, V.h); ctx.globalAlpha = 1; }
    // 箭雨落點
    for (const p of H.pend) if (p.k === 'rain') {
      const [a, b] = V.P(p.x, p.y), q = 1 - p.t / p.T;
      ctx.strokeStyle = `rgba(255,230,150,${0.25 + q * 0.5})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(a, b, p.r * s * 0.8, p.r * s * 0.4, 0, 0, TAU); ctx.stroke();
    }
  }
  function drawHeroAir(ctx, H, s) {
    const HS = s * Art.HS;
    for (const p of H.pend) if (p.k === 'rain') {
      const q = clamp(1 - p.t / p.T, 0, 1);
      for (let i = 0; i < 4; i++) {
        const ox = ((i * 37) % 7 - 3) * 0.12, oy = ((i * 53) % 5 - 2) * 0.12;
        const [a, b0] = V.P(p.x + ox, p.y + oy), h = (1 - q) * 5 + i * 0.25, b = b0 - h * HS;
        ctx.strokeStyle = '#7a5532'; ctx.lineWidth = Math.max(1.5, s * 0.035); ctx.beginPath(); ctx.moveTo(a, b - s * 0.3); ctx.lineTo(a, b); ctx.stroke();
        poly(ctx, [a, b + s * 0.07, a - s * 0.035, b, a + s * 0.035, b], '#e8eef8');
      }
    }
  }
  function pathGlow(G, W, H) {
    const c = Gfx.canvas(V.w, V.h), x = c.getContext('2d');
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = 'rgba(255,240,180,1)'; x.lineWidth = V.s * 0.75;
    for (const P of G.paths) for (const run of pathRuns(P)) { x.beginPath(); run.forEach((p, i) => { const [a, b] = V.P(p.x, p.y); i ? x.lineTo(a - V.ox, b - V.oy) : x.moveTo(a - V.ox, b - V.oy); }); x.stroke(); }
    x.globalCompositeOperation = 'destination-out'; x.lineWidth = V.s * 0.5; x.stroke();
    for (const P of G.paths) for (const run of pathRuns(P)) { x.beginPath(); run.forEach((p, i) => { const [a, b] = V.P(p.x, p.y); i ? x.lineTo(a - V.ox, b - V.oy) : x.moveTo(a - V.ox, b - V.oy); }); x.stroke(); }
    return c;
  }

  // ───────── 縮圖、圖示 ─────────
  function fakeGame(li) {
    const L = LEVELS[li];
    const fake = { L, T: THEMES[L.theme], grid: buildGrid(L, THEMES[L.theme]), paths: levelPaths(L), li, lives: 1, maxLives: 1, enemies: [], towers: [] };
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
    Crew.setDpr(1);
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
      const sp = Beasts.frame(k, R, B.boss ? 1 : 1, 0, 1, B.boss ? 'idle' : 'walk');
      tx.drawImage(sp.c, S - sp.ax, S * 1.8 - sp.ay);
    }
    if (kind === 'tower') { const e = Gfx.softEdge(T, Math.max(0.8, S / 110), { k: 0.38, a: 0.85 }); tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, T.width, T.height); tx.drawImage(e, 0, 0); }
    const id = tx.getImageData(0, 0, T.width, T.height).data;
    let x0 = T.width, y0 = T.height, x1 = 0, y1 = 0;
    for (let yy = 0; yy < T.height; yy += 2) for (let xx = 0; xx < T.width; xx += 2) if (id[(yy * T.width + xx) * 4 + 3] > 20) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    if (x1 > x0) {
      const pad = S * 0.05, bw = x1 - x0 + 2, bh = y1 - y0 + 2, f = Math.min((S - pad * 2) / bw, (S - pad * 2) / bh, kind === 'tower' && (tier || 0) === 0 ? 1.15 : 1.4);
      const dw = bw * f, dh = bh * f;
      x.drawImage(T, x0, y0, bw, bh, (S - dw) / 2, S - pad - dh, dw, dh);
    }
    Crew.setDpr(dpr);
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
    Gfx.frameStart(); Crew.setDpr(dpr);
    if (warmQ.length) { warmStep(qual ? 4 : 6); idleWarm(); }
    const s = V.s, HS = s * Art.HS, th = G.L.theme, PAL = Terrain.pal(th);
    budReset(W, H, s);
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
    levelFx(ctx, G, s, time);
    if (G.hero) drawHeroGround(ctx, G, G.hero, ui, s, time);
    // 光環（模擬層的衝擊波）
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ringK = Math.min(1, 6 / Math.max(1, G.rings.length));
    for (const r of G.rings) {
      const [a, b] = P(r.x, r.y), u = 1 - r.life / r.max, rr = lerp(r.r0, r.r1, Math.sqrt(u)) * s;
      ctx.globalAlpha = (1 - u) * 0.6 * ringK; ctx.strokeStyle = r.c; ctx.lineWidth = Math.max(2, s * 0.09 * (1 - u));
      ctx.beginPath(); ctx.arc(a, b, rr, 0, TAU); ctx.stroke();
      ctx.globalAlpha = (1 - u) * 0.2 * ringK; ctx.lineWidth = Math.max(4, s * 0.25 * (1 - u)); ctx.stroke();
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
    if (G.hero && !G.hero.dead) items.push([P(G.hero.x, G.hero.y)[1] + s * 0.1, 7, G.hero]);
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
          if (o.hero) { const [a, b] = P(o.x, o.y), u = o.t / o.dur, sp = HeroArt.frame(o.hero, s * 0.33, 'idle', 0, dpr); ctx.save(); ctx.globalAlpha = (1 - u) * 0.7; ctx.translate(a, b + s * 0.1 - u * s * 0.9); ctx.scale(o.sf, 1); Gfx.drawSprite(ctx, Gfx.tinted(sp, 'ghost:' + o.hero + ':' + sp.w, '#cfe6ff', 0.75), 0, 0); ctx.restore(); break; }
          const [a, b] = P(o.x, o.y), [bk] = towerSprites(o.k, o.tier, o.spec, s), u = o.t / o.dur;
          ctx.globalAlpha = 1 - u * u; partial(ctx, bk, a, b + s * 0.12 + u * s * 0.15, 1 - u); ctx.globalAlpha = 1; break;
        }
        case 5: drawCastle(ctx, G, s, time); break;
        case 6: drawPortal(ctx, o, s, time, th); break;
        case 7: { const [a, b] = P(o.x, o.y); drawHero(ctx, G, o, a, b, s, time, ui); break; }
      }
    }
    for (const [o, a, inf] of statusQ) enemyStatus(ctx, o, a, inf, s, time, dt);

    // ── 投射物 ──
    drawProjectiles(ctx, G, s, HS, time, dt);
    if (G.hero) drawHeroAir(ctx, G.hero, s);
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
    if (th !== 'night' && th !== 'cave' && qual < 2) {
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
    for (const l of lights) { if (!l.c) continue; const r = l.r * s * (PAL.dark > 0 ? 0.8 : 0.5); glowAt(ctx, Gfx.glow(l.c), l.sx, l.sy, r, l.a * (PAL.dark > 0 ? 0.2 : 0.14)); }
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
      if (w.void) continue;
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
          const sp = decalSprite(d.k === 'crater' ? 'crater' : 'scorch', d.v);
          ctx.globalAlpha = al * (d.k === 'crater' ? 0.75 : 0.45);
          ctx.drawImage(sp, a - r, b - r * 0.75, r * 2, r * 1.5);
          if (d.k === 'crater' && u > 0.55) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (u - 0.55) * 1.2; ctx.drawImage(Gfx.glow('#ff6a1a'), a - r * 0.55, b - r * 0.4, r * 1.1, r * 0.8); ctx.globalCompositeOperation = 'source-over'; }
          break;
        }
        case 'ink': {
          ctx.globalAlpha = al * 0.7;
          ctx.fillStyle = '#1e1028'; ctx.beginPath(); ctx.ellipse(a, b, r * 0.5, r * 0.35, 0, 0, TAU); ctx.fill();
          for (let i = 0; i < 9; i++) { const an = d.rot + i * 0.7, q = r * (0.45 + (i % 3) * 0.15); ctx.beginPath(); ctx.ellipse(a + Math.cos(an) * q, b + Math.sin(an) * q * 0.7, r * 0.1, r * 0.07, an, 0, TAU); ctx.fill(); }
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
          ctx.globalAlpha = al * 0.6;
          ctx.drawImage(decalSprite('frost', d.v), a - r, b - r * 0.75, r * 2, r * 1.5);
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
          ctx.strokeStyle = '#c8a0ff'; ctx.lineWidth = Math.max(1.5, s * 0.04); 
          ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, TAU); ctx.stroke();
          ctx.beginPath(); for (let i = 0; i < 6; i++) { const an = i * TAU / 6 * 2; ctx.lineTo(Math.cos(an) * r * 0.8, Math.sin(an) * r * 0.8); } ctx.closePath(); ctx.stroke();
          ctx.restore();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  // 地面痕跡的快取圖（每種 3 個變化）
  const decalC = {};
  function decalSprite(k, v) {
    v = (v || 0) % 3;
    const key = k + v;
    if (decalC[key]) return decalC[key];
    const S = 128, c = Gfx.canvas(S, S), x = c.getContext('2d'), rr = mkRng(v * 17 + k.length * 5 + 3), C = S / 2;
    if (k === 'frost') {
      x.fillStyle = rgrad(x, C, C, 0, C, ['rgba(235,250,255,.9)', 'rgba(190,235,255,.5)', 'rgba(190,235,255,0)']); x.fillRect(0, 0, S, S);
      x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 2; x.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const an = rr() * TAU, L = C * (0.45 + rr() * 0.4); x.beginPath(); x.moveTo(C, C); x.lineTo(C + Math.cos(an) * L, C + Math.sin(an) * L); x.stroke(); const m = 0.55; x.beginPath(); x.moveTo(C + Math.cos(an) * L * m, C + Math.sin(an) * L * m); x.lineTo(C + Math.cos(an + 0.5) * L * 0.75, C + Math.sin(an + 0.5) * L * 0.75); x.stroke(); }
    } else {
      // 焦痕：淡淡的暖棕色、邊緣不規則、中間比較淺（像被燒過的草地），不是一團黑
      const crater = k === 'crater';
      for (let i = 0; i < 9; i++) {
        const an = rr() * TAU, q = rr() * C * 0.35, px = C + Math.cos(an) * q, py = C + Math.sin(an) * q, R = C * (0.35 + rr() * 0.3);
        x.fillStyle = rgrad(x, px, py, 0, R, [crater ? 'rgba(60,36,22,.45)' : 'rgba(92,62,36,.32)', crater ? 'rgba(70,44,26,.25)' : 'rgba(110,80,46,.16)', 'rgba(110,80,46,0)']);
        x.beginPath(); x.arc(px, py, R, 0, TAU); x.fill();
      }
      // 放射狀的灰燼條紋
      x.strokeStyle = crater ? 'rgba(40,26,18,.32)' : 'rgba(80,58,38,.16)'; x.lineCap = 'round';
      for (let i = 0; i < 11; i++) { const an = i / 11 * TAU + rr() * 0.4, r0 = C * (0.3 + rr() * 0.15), r1 = C * (0.6 + rr() * 0.3); x.lineWidth = 1.5 + rr() * 2.5; x.beginPath(); x.moveTo(C + Math.cos(an) * r0, C + Math.sin(an) * r0); x.lineTo(C + Math.cos(an) * r1, C + Math.sin(an) * r1); x.stroke(); }
      // 灰白色的灰燼點
      for (let i = 0; i < 10; i++) { const an = rr() * TAU, q = rr() * C * 0.6; x.fillStyle = rr() < 0.5 ? 'rgba(200,190,170,.35)' : 'rgba(60,40,30,.35)'; x.beginPath(); x.arc(C + Math.cos(an) * q, C + Math.sin(an) * q, 1.5 + rr() * 2.5, 0, TAU); x.fill(); }
      if (crater) { x.strokeStyle = 'rgba(150,120,90,.55)'; x.lineWidth = 4; x.beginPath(); x.ellipse(C, C, C * 0.42, C * 0.36, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); x.strokeStyle = 'rgba(40,24,16,.4)'; x.beginPath(); x.ellipse(C, C + 3, C * 0.42, C * 0.36, 0, 0.1, Math.PI - 0.1); x.stroke(); }
    }
    return (decalC[key] = c);
  }
  let bubbleC = null;
  function bubbleSprite() {
    if (bubbleC) return bubbleC;
    const S = 64; bubbleC = Gfx.canvas(S, S); const x = bubbleC.getContext('2d');
    x.fillStyle = rgrad(x, S / 2, S / 2, S * 0.3, S / 2, ['rgba(120,220,255,0)', 'rgba(120,220,255,.3)']); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, TAU); x.fill();
    return bubbleC;
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
        glowAt(ctx, Gfx.glow('#ff9a3a'), a, b, s * 0.8, 1);
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
          circ(ctx, a, b, r, '#2e3238'); circ(ctx, a - r * 0.35, b - r * 0.35, r * 0.35, '#8a909a');
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
          glowAt(ctx, Gfx.glow('#b06bff'), a, b, s * 0.35, 1);
          ctx.restore();
          circ(ctx, a, b, s * 0.09, '#b07aff'); circ(ctx, a, b, s * 0.055, '#f0e4ff');
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
        glowAt(ctx, Gfx.glow(bo.c), x0, y0, s * 0.4, u);
      } else if (bo.tracer) {
        const [x0, y0] = pts[0], [x1, y1] = pts[1];
        ctx.globalAlpha = u; ctx.strokeStyle = lgrad(ctx, x0, y0, x1, y1, ['rgba(255,246,200,0)', 'rgba(255,246,200,.95)']); ctx.lineWidth = Math.max(1.5, s * 0.04); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        glowAt(ctx, Gfx.glow('#fff2a8'), x1, y1, s * 0.25, u);
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
        for (let i = 1; i < pts.length; i++) glowAt(ctx, Gfx.glow('#d8c0ff'), pts[i][0], pts[i][1], s * 0.3, Math.min(1, u * 1.5));
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
        case 'bubble': { ctx.globalAlpha = Math.min(1, u * 2) * 0.7; const rr = Math.max(1.5, p.sz * s); ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(1, s * 0.015); ctx.beginPath(); ctx.arc(a, b, rr, 0, TAU); ctx.stroke(); circ(ctx, a - rr * 0.35, b - rr * 0.35, rr * 0.25, 'rgba(255,255,255,.8)'); break; }
        case 'cloudlet': { ctx.globalAlpha = Math.min(1, u * 4, (1 - u) * 4) * 0.55; const rr = p.sz * s; ctx.drawImage(cloudSprite(), a - rr * 2, b - rr, rr * 4, rr * 2); break; }
        case 'dust': { ctx.globalAlpha = Math.sin(u * Math.PI) * 0.25; const r = p.sz * s; ctx.drawImage(Gfx.puff(p.c), a - r * 1.6, b - r * 0.6, r * 3.2, r * 1.2); break; }
        case 'debris': { ctx.globalAlpha = Math.min(1, u * 3); ctx.save(); ctx.translate(a, b); ctx.rotate(p.rot); const r = p.sz * s; ctx.fillStyle = p.c; ctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-r, r * 0.2, r * 2, r * 0.5); ctx.restore(); break; }
        case 'ice': { ctx.globalAlpha = Math.min(1, u * 2); ctx.save(); ctx.translate(a, b); ctx.rotate(p.rot); const r = p.sz * s; poly(ctx, [0, -r * 1.6, r * 0.6, 0, 0, r * 1.6, -r * 0.6, 0], '#e8fbff'); ctx.restore(); break; }
        case 'coin': { ctx.globalAlpha = 1; const r = s * 0.075, sq = Math.abs(Math.cos(p.rot * 1.5)); ell(ctx, a, b, r * Math.max(0.2, sq), r, '#c99a2a'); ell(ctx, a - r * 0.1 * sq, b, r * Math.max(0.15, sq) * 0.8, r * 0.8, '#ffd84a'); break; }
        case 'plus': { ctx.globalAlpha = Math.min(1, u * 2); const r = s * 0.06; ctx.fillStyle = p.c; ctx.fillRect(a - r * 0.35, b - r, r * 0.7, r * 2); ctx.fillRect(a - r, b - r * 0.35, r * 2, r * 0.7); break; }
        case 'leaf': { ctx.globalAlpha = Math.min(1, u * 3); ctx.save(); ctx.translate(a, b); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(time * 3 + p.rot)) * 0.7 + 0.3); ell(ctx, 0, 0, s * 0.07, s * 0.035, p.c); ctx.restore(); break; }
        case 'snow': { ctx.globalAlpha = Math.min(1, u * 3) * 0.9; circ(ctx, a, b, p.sz * s, p.c); break; }
        case 'fly': { ctx.globalAlpha = Math.min(1, u * 3); const fl = Math.abs(Math.sin(time * 18 + p.rot)); ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(a - s * 0.04 * fl, b, s * 0.045 * fl + 1, s * 0.035, -0.4, 0, TAU); ctx.ellipse(a + s * 0.04 * fl, b, s * 0.045 * fl + 1, s * 0.035, 0.4, 0, TAU); ctx.fill(); break; }
        case 'bird': { ctx.globalAlpha = 1; const fl = Math.sin(time * 10 + p.rot) * s * 0.06; ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a - s * 0.12, b - fl); ctx.quadraticCurveTo(a - s * 0.05, b - s * 0.04, a, b); ctx.quadraticCurveTo(a + s * 0.05, b - s * 0.04, a + s * 0.12, b - fl); ctx.stroke(); break; }
        case 'fire': { const r = p.sz * s * (0.6 + u * 0.6); glowAt(ctx, Gfx.glow(u > 0.6 ? '#ffd36b' : u > 0.3 ? p.c : '#c8401a', true), a, b, r, u * 0.85); break; }
        case 'flash': { const r = p.sz * s * (1.2 - u * 0.3); glowAt(ctx, Gfx.glow(p.c), a, b, r, u * 0.6); break; }
        case 'glint': { const r = Math.max(1.5, p.sz * s * 1.5); glowAt(ctx, Gfx.glow(p.c, true), a, b, r, Math.min(1, u * 2)); break; }
        case 'ember': { const r = Math.max(1.5, p.sz * s * 2); glowAt(ctx, Gfx.glow(p.c, true), a, b, r, Math.sin(u * Math.PI)); break; }
        case 'firefly': { const r = Math.max(2, s * 0.09); glowAt(ctx, Gfx.glow(p.c), a, b, r, Math.sin(u * Math.PI) * (0.5 + 0.5 * Math.sin(time * 4 + p.rot * 3))); break; }
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
    for (const [px, py] of (G.L.pads || [])) add(px + 0.5, py + 0.5, 0.1, 1.3, '#7fe8ff', 0.8 + 0.2 * Math.sin(time * 2.5 + px));
    for (const p of props) { if (p.k === 'crystal') add(p.wx, p.wy, 0.3, 1.2, th === 'volcano' ? '#ffb35a' : p.v < 0.5 ? '#9fe6ff' : '#d0a8ff', 0.7 + 0.2 * Math.sin(time * 2 + p.ph)); else if (p.k === 'lamp') add(p.wx, p.wy, 0.8, 1.6, '#ffcf7a', 0.85); }
    for (const p of TR.portals) add(p.x, p.y, 0.4, 2, (PORTAL_COL[th] || ['#ff9ae0', '#b06bff'])[1], 0.8 + 0.2 * Math.sin(time * 3));
    if (dark) { const e = G.exitPt; add(e.x, e.y, 0.6, 2.4, '#ffcf7a', 0.8); }
    if (TR.waters.length && TR.waters[0].lava) for (const w of TR.waters) { const [x0, y0, x1, y1] = w.box; L.push({ sx: (x0 + x1) / 2, sy: (y0 + y1) / 2, r: Math.max(x1 - x0, y1 - y0) / s * 0.9, c: '#ff7a2a', a: 0.8 + 0.15 * Math.sin(time * 2) }); }
    for (const p of G.projs) { if (p.k === 'orb') add(p.x, p.y, p.h, 0.9, '#c08bff', 0.9); else if (p.k === 'missile') add(p.x, p.y, p.h, 0.7, '#ffb347', 0.8); else if (p.k === 'meteor' && p.tt >= 0) add(p.x, p.y, p.h, 2.6, '#ff8a3a', 1); else if (p.k === 'shard') add(p.x, p.y, p.h, 0.6, '#9fe6ff', 0.6); }
    for (const l of FX.lights) add(l.x, l.y, l.h, l.r, l.c, l.a * (l.life / l.max));
    if (dark) for (const p of FX.parts) if (p.k === 'firefly' || p.k === 'ember' || p.k === 'fire') { const [sx, sy] = P(p.x, p.y); L.push({ sx, sy: sy - p.h * HS, r: p.k === 'fire' ? 0.8 : 0.35, c: null, a: 0.6 }); }
    for (const e of G.enemies) if (e.alive && (e.k === 'bossLich' || e.k === 'bossGolem')) add(e.x, e.y, 0.6, 1.8, e.k === 'bossLich' ? '#b38aff' : '#ff8a2a', 0.7);
    for (const b of G.bolts) { const p = b.pts[b.pts.length - 1]; add(p.x, p.y, p.h, 1.4, b.c, b.life / b.max); }
    if (G.hero && !G.hero.dead) { const H = G.hero; add(H.x, H.y, 0.9, dark ? 1.6 : 0.9, H.id === 'mage' ? '#c08bff' : dark ? '#ffcf7a' : null, 0.7); }
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
    if (FX.st.flashW > 0) { ctx.fillStyle = `rgba(255,214,150,${Math.min(0.12, FX.st.flashW * 0.45)})`; ctx.fillRect(0, 0, W, H); }
    // 沙暴
    if (FX.st.stormA > 0.02) {
      ctx.save(); ctx.beginPath(); ctx.rect(V.ox, V.oy, V.w, V.h); ctx.clip();
      ctx.globalAlpha = FX.st.stormA * 0.32; ctx.fillStyle = '#d8a860'; ctx.fillRect(V.ox, V.oy, V.w, V.h);
      ctx.globalAlpha = FX.st.stormA * 0.5; const cs = cloudSprite();
      for (let i = 0; i < 5; i++) { const ph = (time * 0.25 + i * 0.21) % 1; ctx.drawImage(cs, V.ox - V.w * 0.4 + ph * V.w * 1.4, V.oy + V.h * (i / 5) - s, V.w * 0.6, s * 2.5); }
      ctx.restore(); ctx.globalAlpha = 1;
    }
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

  return { want, warmLeft: () => warmQ.length, setView, view, ensureBg, invalidate, frame, thumb, icon, setLow, drawTowerAt: drawTower, fakeGame };
})();
