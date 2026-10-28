'use strict';
// 第四架機體「幻翼」（通過第 12 關解鎖）：擦彈型
// - 敵彈從身邊擦過會累積「幻影量表」，滿了自動進入 6 秒幻影模式：火力 +40%，左右多兩個幻影分身一起開火
// - 炸彈是「黑洞」：在前方張開，把附近的子彈吸進去，也會一直傷害靠近的敵人
SHIPS.phantom = { name: '幻翼', en: 'PHANTOM', spr: 'phantom', spd: 1.08, hitk: 0.92, dmgk: 1.05, bomb: 'hole', st: [4, 3, 3, 4], lock: 11,
  note: '擦彈型。子彈從身邊擦過會累積幻影量表，滿了自動進入幻影模式（火力 +40%、兩個分身一起開火）。炸彈是吸走子彈的黑洞。' };
const shipLocked = k => { const S = SHIPS[k]; return !!(S && S.lock !== undefined && !(Store.data.cs || []).includes(S.lock)); };
P.gz = 0; P.phT = 0;
const GZ_MAX = 60;
if (Store.data.ship === 'phantom' && !shipLocked('phantom')) G.ship = 'phantom';

// 2D 備用圖與 3D 模型
SPR.phantom = { w: 36, h: 40, draw(g) { SPR.player.draw(g); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(60,20,110,.55)'; g.fillRect(-20, -22, 40, 44); g.globalCompositeOperation = 'source-over'; } };
EXTRA_MODELS.phantom = K => {
  const BK = K.M(0x1e1a2a, { m: 0.85, r: 0.26, cc: 1 }), VI = K.M(0x4a2a8a, { m: 0.5, r: 0.28, cc: 1 }), CH = K.M(0xb8b0d0, { m: 0.95, r: 0.2, cc: 1, panel: false });
  const PU = K.G(0xb070ff, 2.8), CY = K.G(0x70e8ff, 2.6), GL = K.glass(0x14082a, 0x4a1a8a);
  // 前掠翼
  K.extM([2, 4, 16, -6, 19, -3, 12, 8, 4, 12], 1.3, BK, 0, 0.5);
  K.extM([16, -6, 19, -3, 17, -1], 0.4, VI, 1.2, 0);
  K.extM([3, 10, 10, 14, 9, 17, 3, 15], 1, VI, 0.6, 0.3);
  K.lathe([[0, -22], [1.2, -19], [2.4, -14], [3.4, -6], [3.8, 4], [3.4, 13], [2.6, 17], [0.2, 18]], BK, { sy: 0.8, y: 1.8 });
  K.lathe([[0, -22.2], [1.3, -19], [2.2, -16], [0.2, -15.6]], CH, { sy: 0.9, y: 1.85 });
  K.sph(1.8, 1.7, 5, 0, 3.8, -7, GL);
  for (const s of [-1, 1]) { K.cyl(2, 1.8, 8, s * 3.2, 1.2, 13, VI); K.cyl(1.6, 1.6, 0.6, s * 3.2, 1.2, 17.2, PU); }
  K.barM(3.5, -2, 16, -5, 1.9, 0.6, 0.3, PU);
  K.barM(4, 9, 10, 13.4, 1.4, 0.5, 0.3, CY);
};
EXTRA_BAKES.push(['phantom', 38, 44, EXTRA_MODELS.phantom]);
for (let i = 1; i <= 3; i++) EXTRA_BAKES.push(['phantom_r' + i, 38, 44, EXTRA_MODELS.phantom, { roll: -0.28 * i }], ['phantom_l' + i, 38, 44, EXTRA_MODELS.phantom, { roll: 0.28 * i }]);

// ---------- 擦彈 ----------
updateEB = (function (base) {
  return function (dt) {
    if (G.ship === 'phantom' && P.alive && !P.auto && P.inv <= 0 && G.state === 'play') {
      const hr = G.d.hit * (P.hitk || 1), R = hr + 16;
      for (const b of G.eb) {
        if (b.gz) continue;
        const d = d2(b.x, b.y, P.x, P.y);
        if (d < (b.r + R) ** 2 && d > (b.r + hr) ** 2) {
          b.gz = true; if (P.phT <= 0) P.gz = Math.min(GZ_MAX, P.gz + 1);
          addScore(20); fxP({ k: 'k', x: (b.x + P.x) / 2, y: (b.y + P.y) / 2, vx: rnd(-60, 60), vy: rnd(-60, 60), life: 0, max: 0.18, c: 'p' });
          if (Math.random() < 0.4) Snd.tone(1800, 0.04, 'square', 0.015, 2400);
        }
      }
      if (P.gz >= GZ_MAX && P.phT <= 0) { P.phT = 6; P.gz = 0; popText(P.x, P.y - 40, '幻影模式！', '#d0a0ff'); Snd.play('1up'); P.aura = 0.8; P.auraCol = '#c080ff'; }
    }
    base(dt);
  };
})(updateEB);
updatePlayer = (function (base) {
  return function (dt) {
    base(dt);
    if (P.phT > 0) {
      P.phT -= dt;
      P.ghost = P.ghost || [{ x: P.x, y: P.y }, { x: P.x, y: P.y }];
      P.ghost.forEach((g, i) => { const tx = P.x + (i ? 24 : -24), ty = P.y + 6, f = Math.min(1, dt * 12); g.x += (tx - g.x) * f; g.y += (ty - g.y) * f; });
      if (P.alive && G.t - (P.firing || -9) < 0.15) { P.ghT = (P.ghT || 0) - dt; if (P.ghT <= 0) { P.ghT = 0.1; for (const g of P.ghost) pbShot(g.x, g.y - 12, 0, 'v'); } }
    } else P.ghost = null;
  };
})(updatePlayer);
hurt = (function (base) { return function (e, d) { base(e, d * (P.phT > 0 ? 1.4 : 1)); }; })(hurt);
playerHit = (function (base) { return function () { const was = P.alive; base(); if (was && !P.alive) { P.phT = 0; P.gz = Math.floor(P.gz / 2); } }; })(playerHit);
newGame = (function (base) {
  return function (from) {
    if (shipLocked(G.ship)) G.ship = 'falcon';
    P.gz = 0; P.phT = 0; P.ghost = null; G.hole = null;
    base(from);
  };
})(newGame);

// ---------- 黑洞炸彈 ----------
useBomb = (function (base) {
  return function () {
    const ok = base();
    if (ok && G.ship === 'phantom') {
      G.bombT = 3.2; P.inv = Math.max(P.inv, 3.4);
      G.hole = { x: P.x, y: Math.max(90, P.y - 170), t: 0 };
      for (const b of G.eb) if (d2(b.x, b.y, P.x, P.y) < 120 * 120) { b.dead = true; fxP({ k: 'c', x: b.x, y: b.y, vx: 0, vy: -40, life: 0, max: 0.3 }); }
      G.eb = G.eb.filter(b => !b.dead); G.beams.length = 0;
    }
    return ok;
  };
})(useBomb);
bombTick = (function (base) {
  return function (dt) {
    if (G.ship !== 'phantom' || !G.hole) { base(dt); return; }
    G.bombT -= dt; const Hh = G.hole; Hh.t += dt;
    let n = 0;
    for (const b of G.eb) {
      const dx = Hh.x - b.x, dy = Hh.y - b.y, d = Math.hypot(dx, dy) || 1;
      if (d < 230) { const pull = 260 * (1 - d / 260) + 60; b.vx += dx / d * pull * dt * 4; b.vy += dy / d * pull * dt * 4; b.vx *= 0.96; b.vy *= 0.96; }
      if (d < 18) { b.dead = true; n++; }
    }
    if (n) { addScore(n * 20); G.eb = G.eb.filter(b => !b.dead); }
    G.beams.length = 0;
    for (const e of G.enemies) if (!e.dead && !e.hidden) for (const [cx, cy, r] of hitCircles(e)) if (d2(cx, cy, Hh.x, Hh.y) < (70 + r) ** 2) { hurt(e, (e.boss ? 45 : 80) * dt); break; }
    if (G.bombT <= 0) G.hole = null;
  };
})(bombTick);
drawBomb = (function (base) {
  return function (c) {
    if (G.ship !== 'phantom' || !G.hole) { base(c); return; }
    const Hh = G.hole, k = Math.min(1, Hh.t / 0.3) * Math.min(1, G.bombT / 0.4), R = 46 * k;
    c.save();
    const g = c.createRadialGradient(Hh.x, Hh.y, 0, Hh.x, Hh.y, R * 2.4);
    g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(0.38, 'rgba(10,0,20,.9)'); g.addColorStop(0.45, 'rgba(150,80,255,.55)'); g.addColorStop(1, 'rgba(60,0,120,0)');
    c.fillStyle = g; c.beginPath(); c.arc(Hh.x, Hh.y, R * 2.4, 0, TAU); c.fill();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { c.strokeStyle = `rgba(${i ? '120,220,255' : '210,150,255'},${0.5 * k})`; c.lineWidth = 2; c.beginPath(); c.ellipse(Hh.x, Hh.y, R * (1.1 + i * 0.25), R * (0.45 + i * 0.1), G.t * (2 + i) + i, 0, TAU); c.stroke(); }
    c.restore();
  };
})(drawBomb);

// ---------- 畫面 ----------
drawPlayer = (function (base) {
  return function (ctx) {
    if (P.ghost && P.alive) for (const g of P.ghost) { ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(G.t * 12) * 0.1; Art.draw(ctx, P.spr || 'player', g.x, g.y, 0, 1, 0.8, 0.8); ctx.globalCompositeOperation = 'lighter'; Art.draw(ctx, P.spr || 'player', g.x, g.y, 0, 0.35, 0.8, 0.8, 'w'); ctx.restore(); }
    base(ctx);
    if (G.ship === 'phantom' && P.alive && P.phT > 0) glowDot(ctx, P.x, P.y, 30, `rgba(170,90,255,${0.25 + Math.sin(G.t * 10) * 0.1})`);
  };
})(drawPlayer);
drawHUD = (function (base) {
  return function (c) {
    base(c);
    if (G.ship !== 'phantom' || !P.alive) return;
    const w = 58, x = W / 2 - w / 2 + 14, y = H - 10;
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x - 1, y - 4, w + 2, 8);
    const k = P.phT > 0 ? P.phT / 6 : P.gz / GZ_MAX;
    c.fillStyle = P.phT > 0 ? '#e0b0ff' : '#9a60ff'; c.fillRect(x, y - 3, w * k, 6);
    txt(c, P.phT > 0 ? '幻影' : '擦彈', x - 4, y, 8, '#d0a0ff', 'right', CJK, 700);
  };
})(drawHUD);

// ---------- 標題：第四架機體（鎖住時顯示解鎖條件）----------
refreshTitle = (function (base) {
  return function () {
    if (shipLocked(G.ship)) G.ship = 'falcon';
    base();
    const box = $('ships');
    if (box && !box.querySelector('[data-ship="phantom"]')) {
      const b = document.createElement('button'); b.className = 'ship'; b.dataset.ship = 'phantom';
      b.innerHTML = `<canvas width="96" height="96"></canvas><span><b>${SHIPS.phantom.name}</b><small>${SHIPS.phantom.en}</small></span>`;
      b.onclick = () => { if (shipLocked('phantom')) { Snd.init(); Snd.tone(200, 0.15, 'square', 0.05); $('shipNote').textContent = '通過第 12 關就能解鎖「幻翼」。'; return; } G.ship = 'phantom'; Store.data.ship = 'phantom'; Store.save(); Snd.init(); Snd.play('select'); refreshTitle(); };
      box.appendChild(b);
    }
    const b = box && box.querySelector('[data-ship="phantom"]');
    if (b) {
      const locked = shipLocked('phantom');
      b.classList.toggle('locked', locked); b.classList.toggle('on', G.ship === 'phantom');
      b.querySelector('small').textContent = locked ? '第 12 關後解鎖' : SHIPS.phantom.en;
      const g = b.querySelector('canvas').getContext('2d'), img = Art.get('phantom');
      g.clearRect(0, 0, 96, 96);
      if (img) { const sc = 78 / Math.max(img.lw, img.lh); g.globalAlpha = locked ? 0.35 : 1; g.drawImage(img, 48 - img.lw * sc / 2, 50 - img.lh * sc / 2, img.lw * sc, img.lh * sc); g.globalAlpha = 1; }
      if (locked) { // 鎖頭
        g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.beginPath(); g.arc(48, 44, 12, Math.PI, 0); g.stroke();
        g.fillStyle = '#ffd23f'; g.fillRect(31, 44, 34, 26); g.fillStyle = '#3a2a00'; g.beginPath(); g.arc(48, 54, 4, 0, TAU); g.fill(); g.fillRect(46, 55, 4, 9);
      }
    }
  };
})(refreshTitle);
refreshTitle();
