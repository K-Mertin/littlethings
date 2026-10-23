'use strict';
// 深淵地牢：第二輪特效——怪物攻擊招式、施法前搖、召喚法陣、法術特效、撿東西與換裝回饋、殘影、碎片、爆炸、光柱、寶物光束

Object.assign(FX, {
  ghosts: [], chunks: [], flies: [], marks: [], fxs: [],
  // 殘影：把某個角色目前的樣子留在原地慢慢淡出
  ghost(a, x, y, col, dur = 0.35) {
    const r = Render.rs(a);
    const s = a.isP ? Spr.hero(a.cls, FR.idle0, Spr.gearOf(a)) : Spr.mon(a.k, FR.idle0, { rage: a.enraged });
    this.ghosts.push({ s, x: x != null ? x : r.x, y: y != null ? y : r.y, face: r.face, col, t0: now() + this._d(), dur });
  },
  // 通用的定時特效（在 drawExtra 裡依 kind 畫）
  add(kind, o) { if (this.fxs.length < 60) this.fxs.push(Object.assign({ kind, t0: now() + this._d() }, o)); },
  puff(x, y, col = '#c8c0d0', n = 8) {
    const t0 = now() + this._d(); if (Render.q >= 2) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU; this.parts.push({ x: x + 0.5 + Math.cos(a) * 0.15, y: y + 0.6 + Math.sin(a) * 0.1, vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.5 - 0.5, t0, life: fx_rand(0.4, 0.7), col, sz: fx_rand(2, 3.4), g: -0.5 }); }
  },
  debris(x, y, kind) {
    const cols = { barrel: ['#8a5a2e', '#a8703a', '#5a5a66'], crate: ['#9a6a3a', '#c08a4a', '#6a4420'], keg: ['#7a2a1a', '#a83a24', '#2a2a30'], pod: ['#9a5ad0', '#c08aff', '#5fe0d0'], urn: ['#5a8ab0', '#a8d8f0', '#e8fbff'], bones: ['#e8e0ea', '#c8c0d0', '#8a8296'] }[kind] || ['#8a8496', '#b8b2c4'];
    const t0 = now() + this._d(), n = Render.q >= 2 ? 6 : 12;
    for (let i = 0; i < n; i++) { const a = -Math.PI * fx_rand(0.1, 0.9); const s = fx_rand(2, 5); this.chunks.push({ x: x + 0.5, y: y + 0.6, vx: Math.cos(a) * s * (Math.random() < 0.5 ? -1 : 1) * 0.6, vy: Math.sin(a) * s, t0, life: fx_rand(0.5, 0.9), col: cols[i % cols.length], sz: fx_rand(1, 2.4) | 0 || 1, rot: Math.random() * 6 }); }
    this.puff(x, y, '#a89c8c', 6);
  },
  boom(x, y, r = 1.5, rgb = '255,140,40') {
    this.light(x, y, r + 2.5, rgb, 0.9, 0.55, 1);
    this.add('shock', { x: x + 0.5, y: y + 0.5, r, col: 'rgb(' + rgb + ')', dur: 0.45 });
    this.add('flare', { x: x + 0.5, y: y + 0.5, r: r * 1.2, rgb, dur: 0.35 });
    const t0 = now() + this._d(), n = Render.q >= 2 ? 14 : 28;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = fx_rand(1.5, 6) * r; this.parts.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, t0, life: fx_rand(0.3, 0.7), col: ['#fff2b0', '#ffc04a', '#ff7a2a', '#d8401a'][i % 4], sz: fx_rand(1.4, 3), g: 3, glow: 1 }); }
    this.puff(x, y, '#5a4a4a', 10);
    this.screen('255,180,90', 0.25);
  },
  // 撿到東西：圖示飛向背包按鈕；金幣飛向金幣數字
  pickFly(it, x, y) { this.flies.push({ img: Art.itemSprite(it).c, x, y, el: 'bInv', t0: now(), dur: 0.55 }); },
  goldFly(x, y, n) {
    const k = Math.min(6, 2 + (n / 15 | 0));
    for (let i = 0; i < k; i++) this.flies.push({ img: Art.sprite('gold').c, x: x + fx_rand(-0.2, 0.2), y: y + fx_rand(-0.2, 0.2), el: 'goldT', t0: now() + i * 0.05, dur: 0.5 + i * 0.03, small: 1 });
    this.num(x, y, '+' + n, '#ffd75a');
  },
  equipFx(a, col, cursed) {
    const r = Render.rs(a);
    this.add('sweep', { a, col, dur: 0.45 });
    this.ring(r.x, r.y, 0.7, col);
    if (cursed) { this.add('chains', { x: r.x + 0.5, y: r.y + 0.5, dur: 0.9 }); this.puff(r.x, r.y, '#5a2a7a', 10); this.screen('120,40,160', 0.2); }
    else { const t0 = now(); for (let i = 0; i < 10; i++) this.parts.push({ x: r.x + 0.5 + fx_rand(-0.35, 0.35), y: r.y + 0.9, vx: 0, vy: -fx_rand(1.5, 3), t0: t0 + i * 0.02, life: 0.5, col, sz: 1.2, g: 0, glow: 1 }); }
  },
  backstab(m) {
    this.add('stab', { x: m.x + 0.5, y: m.y + 0.45, dur: 0.3, col: '#c8a0ff' });
    this.light(m.x, m.y, 1.6, '180,120,255', 0.6, 0.3);
  },
  // 怪物攻擊招式（依怪物的動作：咬、抓、砸、刺、砍）
  monAtk(m) { const r = Render.rs(m); if (Math.random() < 0.6) this.add('glint', { x: r.x + 0.5 + r.face * 0.3, y: r.y + 0.25, dur: 0.16 }); },
  monHit(m, P) {
    const D = MON[m.k], v = D.verb, dx = P.x - m.x, dy = P.y - m.y;
    const style = v === '咬' ? 'bite' : v === '抓' ? 'claw' : v === '重擊' || v === '撞' ? 'smash' : v === '刺' ? 'stab2' : 'slash';
    const col = m.elite ? ELITES[m.elite].col : D.boss ? '#ff6a9a' : '#ff8a7a';
    if (style === 'slash') this.slash(P.x, P.y, dx, dy, col, D.boss);
    else if (style === 'smash') { this.add('shock', { x: P.x + 0.5, y: P.y + 0.8, r: D.boss ? 1.2 : 0.7, col: '#e8d8c0', dur: 0.35, flat: 1 }); this.puff(P.x, P.y, '#a89c8c', 6); this.shake(D.boss ? 8 : 5); }
    else this.add(style, { x: P.x + 0.5, y: P.y + 0.5, a: Math.atan2(dy, dx), col, dur: 0.26, big: D.boss });
    if (style === 'bite' || style === 'claw' || style === 'smash') Snd.play(style);
  },
  // 腳步：依地面播放不同的聲音，踩水會濺起水花
  step(a) {
    if (!a.isP || !G || !G.F) return;
    const v = Game.tile(a.x, a.y);
    if (v === T.WATER) { Snd.play('step', 'water'); const t0 = now() + 0.08; for (let i = 0; i < 6; i++) { const ang = -Math.PI * fx_rand(0.15, 0.85); this.parts.push({ x: a.x + 0.5, y: a.y + 0.85, vx: Math.cos(ang) * 1.6, vy: Math.sin(ang) * 2.4, t0, life: 0.35, col: '#cfeeff', sz: 1, g: 14 }); } }
    else Snd.play('step', v === T.GRASS ? 'grass' : G.F.biome);
  },
  // 施法前搖：光點往施法者聚集，接著才發射
  cast(m, rgb) {
    const r = Render.rs(m), t0 = now() + this._d();
    this.light(r.x, r.y, 1.8, rgb, 0.7, 0.3);
    this.add('charge', { x: r.x + 0.5, y: r.y + 0.3, rgb, dur: 0.22 });
    for (let i = 0; i < 8; i++) { const a = Math.random() * TAU, d = fx_rand(0.6, 1); this.parts.push({ x: r.x + 0.5 + Math.cos(a) * d, y: r.y + 0.35 + Math.sin(a) * d, vx: -Math.cos(a) * d / 0.22, vy: -Math.sin(a) * d / 0.22, t0, life: 0.22, col: 'rgb(' + rgb + ')', sz: 1.2, g: 0, glow: 1 }); }
    this.delayNext(0.18);
    Snd.play('cast');
  },
  summonCircle(x, y, rgb = '180,120,255') { this.add('circle', { x: x + 0.5, y: y + 0.8, rgb, dur: 0.75 }); this.light(x, y, 1.5, rgb, 0.5, 0.6); },
  pillar(x, y, rgb, dur = 0.7) { this.add('pillar', { x: x + 0.5, y: y + 0.9, rgb, dur }); this.light(x, y, 2.5, rgb, 0.8, dur); },
  spin(a, col) { const r = Render.rs(a); this.add('spin', { a, col, dur: 0.34 }); this.light(r.x, r.y, 2, '255,220,180', 0.5, 0.3); },
  trail(a, x0, y0, x1, y1, col) { const n = Math.max(2, cheb(x0, y0, x1, y1)); for (let i = 0; i < n; i++) { const k = i / n; this.ghost(a, lerp(x0, x1, k), lerp(y0, y1, k), col, 0.25 + k * 0.15); } },
  shadowStep(x0, y0, x1, y1) {
    this.ghost(G.P, x0, y0, '#8a6acf', 0.5);
    const t0 = now(); const n = cheb(x0, y0, x1, y1) * 3;
    for (let i = 0; i < n; i++) { const k = i / n; this.parts.push({ x: lerp(x0, x1, k) + 0.5 + fx_rand(-0.15, 0.15), y: lerp(y0, y1, k) + 0.5 + fx_rand(-0.15, 0.15), vx: 0, vy: -0.4, t0: t0 + k * 0.1, life: 0.4, col: i % 2 ? '#8a6acf' : '#2a1a3a', sz: 1.8, g: 0 }); }
  },
  iceShards(x, y, r) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if ((i || j) && Game.inView(x + i, y + j) && TP[Game.tile(x + i, y + j)].walk) this.add('shard', { x: x + i + 0.5, y: y + j + 0.85, dur: 0.6 + Math.random() * 0.2, d: (Math.abs(i) + Math.abs(j)) * 0.04 }); },

  // ---------- 繪製（在 drawFx 之後呼叫，地圖座標） ----------
  drawExtra(ox, oy, t, dt) {
    const TS = Render.TS, ps = Render.ps, sx = x => ox + x * TS, sy = y => oy + y * TS;
    // 殘影
    this.ghosts = this.ghosts.filter(g => t - g.t0 < g.dur);
    for (const g of this.ghosts) {
      const k = (t - g.t0) / g.dur; if (k < 0) continue;
      ctx.globalAlpha = 0.45 * (1 - k);
      Render.blit(g.s, g.s.c, sx(g.x) + TS / 2, sy(g.y) + TS - ps, g.face < 0);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * (1 - k); Render.blit(g.s, g.s.w, sx(g.x) + TS / 2, sy(g.y) + TS - ps, g.face < 0); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    // 碎片（有重力，會在地上彈一下）
    this.chunks = this.chunks.filter(c => t - c.t0 < c.life);
    for (const c of this.chunks) {
      const a = t - c.t0; if (a < 0) continue;
      let y = c.vy * a + 9 * a * a; if (y > 0.25) y = 0.25 - (y - 0.25) * 0.3;
      ctx.globalAlpha = Math.min(1, (c.life - a) * 5); ctx.fillStyle = c.col;
      const s = c.sz * ps; ctx.fillRect(Math.round(sx(c.x + c.vx * a) - s / 2), Math.round(sy(c.y + y) - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
    // 各種定時特效
    this.fxs = this.fxs.filter(f => t - f.t0 < f.dur + (f.d || 0));
    for (const f of this.fxs) {
      const k = (t - f.t0 - (f.d || 0)) / f.dur; if (k < 0) continue;
      const X = f.x != null ? sx(f.x) : 0, Y = f.y != null ? sy(f.y) : 0;
      switch (f.kind) {
        case 'shock': {
          ctx.strokeStyle = f.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = ps * 2.5 * (1 - k) + ps;
          ctx.beginPath(); ctx.ellipse(X, Y, (f.r + 0.4) * TS * (0.2 + k), (f.r + 0.4) * TS * (0.2 + k) * (f.flat ? 0.45 : 0.7), 0, 0, TAU); ctx.stroke(); break;
        }
        case 'flare': Render.glowAt(X, Y, f.r * TS * (0.6 + k * 0.8), f.rgb, 1 - k, 1); Render.glowAt(X, Y, f.r * TS * 0.5 * (1 - k), '255,255,230', 1 - k, 1); break;
        case 'sweep': { // 換裝時一道白光從上往下掃過角色
          const r = Render.rs(f.a), s = f.a.isP ? Spr.hero(f.a.cls, FR.idle0, Spr.gearOf(f.a)) : null; if (!s) break;
          const X0 = sx(r.x) + TS / 2, Y0 = sy(r.y) + TS - ps, top = Y0 - s.ay * ps, h = s.c.height * ps;
          ctx.save(); ctx.beginPath(); ctx.rect(X0 - TS, top + h * (k - 0.25), TS * 2, h * 0.25); ctx.clip();
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; Render.blit(s, s.w, X0, Y0, r.face < 0); ctx.restore();
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; break;
        }
        case 'chains': {
          ctx.globalAlpha = 1 - k; ctx.fillStyle = '#b05cff';
          for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + k * 6, rr = TS * (0.55 - k * 0.3); ctx.fillRect(Math.round(X + Math.cos(a) * rr), Math.round(Y + Math.sin(a) * rr * 0.6 - k * TS * 0.3), ps * 1.5, ps * 1.5); }
          break;
        }
        case 'stab': case 'stab2': { // 突刺：一條細長的亮線
          const a = f.a != null ? f.a : -0.6, L = TS * (0.3 + k * 0.5);
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = ps * 2;
          ctx.beginPath(); ctx.moveTo(X - Math.cos(a) * L, Y - Math.sin(a) * L); ctx.lineTo(X + Math.cos(a) * L * 0.4, Y + Math.sin(a) * L * 0.4); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = ps; ctx.stroke();
          if (f.kind === 'stab') { ctx.fillStyle = f.col; for (let i = 0; i < 4; i++) { const b = i * Math.PI / 2 + Math.PI / 4; ctx.fillRect(Math.round(X + Math.cos(b) * TS * 0.25 * (0.5 + k)), Math.round(Y + Math.sin(b) * TS * 0.25 * (0.5 + k)), ps * 1.5, ps * 1.5); } }
          ctx.globalCompositeOperation = 'source-over'; break;
        }
        case 'bite': { // 上下兩排牙齒咬合
          const c = Math.min(1, k * 2.2), gap = TS * 0.32 * (1 - c), w = TS * (f.big ? 0.75 : 0.55);
          ctx.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4;
          for (const s of [-1, 1]) {
            const yy = Y + s * (gap + ps);
            ctx.fillStyle = 'rgba(255,255,255,.95)';
            for (let i = 0; i < 5; i++) { const xx = X - w / 2 + (i + 0.5) * w / 5; ctx.beginPath(); ctx.moveTo(xx - ps * 1.5, yy); ctx.lineTo(xx + ps * 1.5, yy); ctx.lineTo(xx, yy - s * ps * 3.5); ctx.fill(); }
            ctx.fillStyle = f.col; ctx.fillRect(X - w / 2, yy - (s < 0 ? ps : 0), w, ps);
          }
          break;
        }
        case 'claw': { // 三道爪痕
          const c = Math.min(1, k * 3), a = f.a + Math.PI / 4, L = TS * (f.big ? 0.8 : 0.6);
          ctx.globalAlpha = k < 0.5 ? 1 : (1 - k) * 2; ctx.lineCap = 'round';
          for (let i = -1; i <= 1; i++) {
            const nx = -Math.sin(a) * i * ps * 3.2, ny = Math.cos(a) * i * ps * 3.2, x0 = X + nx - Math.cos(a) * L / 2, y0 = Y + ny - Math.sin(a) * L / 2;
            ctx.strokeStyle = f.col; ctx.lineWidth = ps * 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a) * L * c, y0 + Math.sin(a) * L * c); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = ps * 0.8; ctx.stroke();
          }
          ctx.lineCap = 'butt'; break;
        }
        case 'glint': { const s = ps * (2 + Math.sin(k * Math.PI) * 3); ctx.globalAlpha = Math.sin(k * Math.PI); ctx.fillStyle = '#fff'; ctx.fillRect(X - s / 2, Y - ps / 2, s, ps); ctx.fillRect(X - ps / 2, Y - s / 2, ps, s); break; }
        case 'charge': Render.glowAt(X, Y, TS * 0.5 * (0.4 + k), f.rgb, 0.9 * k, 1); break;
        case 'circle': { // 召喚法陣：旋轉的符文圈
          const a = Math.min(1, k * 3) * (k > 0.7 ? (1 - k) / 0.3 : 1), R = TS * 0.55;
          ctx.save(); ctx.translate(X, Y); ctx.scale(1, 0.45); ctx.globalAlpha = a; ctx.strokeStyle = 'rgb(' + f.rgb + ')'; ctx.lineWidth = ps * 1.4;
          ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke(); ctx.lineWidth = ps; ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, TAU); ctx.stroke();
          ctx.rotate(k * 3); ctx.beginPath(); for (let i = 0; i <= 5; i++) { const b = i * TAU * 2 / 5; ctx.lineTo(Math.cos(b) * R * 0.7, Math.sin(b) * R * 0.7); } ctx.stroke();
          ctx.restore(); Render.glowAt(X, Y, R, f.rgb, a * 0.5, 1); break;
        }
        case 'pillar': { // 從天而降的光柱
          const a = k < 0.2 ? k * 5 : (1 - k) / 0.8, w = TS * 0.42 * (k < 0.2 ? 0.4 + k * 3 : 1 - (k - 0.2) * 0.6), h = TS * 3.2;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a * 0.55; ctx.fillStyle = 'rgb(' + f.rgb + ')'; ctx.fillRect(Math.round(X - w / 2), Math.round(Y - h), Math.round(w), Math.round(h));
          ctx.globalAlpha = a * 0.9; ctx.fillStyle = '#fffbe8'; ctx.fillRect(Math.round(X - w / 6), Math.round(Y - h), Math.max(ps, Math.round(w / 3)), Math.round(h));
          Render.glowAt(X, Y - ps * 2, TS * 0.7, f.rgb, a, 0);
          ctx.globalCompositeOperation = 'source-over'; break;
        }
        case 'spin': { // 旋風斬：繞身一圈半的刀光
          const r = Render.rs(f.a), cx = sx(r.x) + TS / 2, cy = sy(r.y) + TS / 2, R = TS * 0.95, a0 = k * TAU * 1.5 - Math.PI / 2;
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 4; i++) { ctx.globalAlpha = (1 - k) * (1 - i * 0.22); ctx.strokeStyle = i ? f.col : '#ffffff'; ctx.lineWidth = ps * (i ? 3 - i * 0.6 : 1.4); ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.6, 0, a0 - 0.5 - i * 0.35, a0 - i * 0.35); ctx.stroke(); }
          ctx.globalCompositeOperation = 'source-over'; break;
        }
        case 'shard': { // 冰晶從地面長出來再碎掉
          const g = k < 0.3 ? k / 0.3 : 1, a = k > 0.7 ? (1 - k) / 0.3 : 1, h = TS * 0.45 * g;
          ctx.globalAlpha = a; ctx.fillStyle = '#8ae0ff'; ctx.beginPath(); ctx.moveTo(X - ps * 2.5, Y); ctx.lineTo(X, Y - h); ctx.lineTo(X + ps * 2.5, Y); ctx.fill();
          ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.moveTo(X - ps, Y); ctx.lineTo(X - ps * 0.2, Y - h * 0.9); ctx.lineTo(X + ps * 0.6, Y); ctx.fill();
          ctx.fillStyle = '#3f9ad0'; ctx.fillRect(X + ps, Y - h * 0.4, ps, h * 0.4); break;
        }
      }
      ctx.globalAlpha = 1;
    }
  },
  // 畫面座標的飛行圖示（撿起的道具飛向背包按鈕）
  drawFlies(t) {
    if (!this.flies.length) return;
    const d = Render.dpr, TS = Render.TS;
    this.flies = this.flies.filter(f => t - f.t0 < f.dur);
    for (const f of this.flies) {
      const k = (t - f.t0) / f.dur; if (k < 0) continue;
      const el = document.getElementById(f.el === 'bInv' ? 'bInvBtn' : f.el) || document.querySelector('#bar [data-a="inv"]'); if (!el || !el.offsetParent) continue;
      const rc = el.getBoundingClientRect(), tx = (rc.left + rc.width / 2) * d, ty = (rc.top + rc.height / 2) * d;
      const [x0, y0] = Render.toScreen(f.x + 0.5, f.y + 0.2);
      const e = k * k * (3 - 2 * k), x = lerp(x0, tx, e), y = lerp(y0, ty, e) - Math.sin(k * Math.PI) * TS * 1.2;
      const sz = (f.small ? 0.55 : 0.8) * TS * (1 - k * 0.45);
      ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      ctx.drawImage(f.img, Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz);
      if (k > 0.8 && !f.hit) { f.hit = 1; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    }
    ctx.globalAlpha = 1;
  },
});

// 寶物光束：稀有道具在地上會冒出一道柱狀光
Render.lootBeam = function (X, Y, rgb, t, seed) {
  const TS = this.TS, ps = this.ps, a = 0.5 + 0.25 * Math.sin(t * 3 + seed);
  let c = this._beam && this._beam.get(rgb);
  if (!c) {
    this._beam = this._beam || new Map(); c = document.createElement('canvas'); c.width = 16; c.height = 64; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(' + rgb + ',0)'); g.addColorStop(0.7, 'rgba(' + rgb + ',.55)'); g.addColorStop(1, 'rgba(' + rgb + ',.9)');
    x.fillStyle = g; x.fillRect(4, 0, 8, 64); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(7, 16, 2, 48);
    this._beam.set(rgb, c);
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  ctx.drawImage(c, Math.round(X + TS / 2 - TS * 0.25), Math.round(Y - TS * 2.2), Math.round(TS * 0.5), Math.round(TS * 2.9));
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
};
