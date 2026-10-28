'use strict';
// 後期武器成長：第 14 關起超限可以到 Lv11「覺醒」，每種主武器多一招專屬攻擊
//   紅 鳳凰火翼：定時放出兩隻會追蹤的火鳥
//   藍 稜鏡散射：雷射開著時，分光打向附近的敵人
//   紫 雷暴領域：定時在身邊炸開一圈閃電，順便消掉身邊的子彈
//   綠 海嘯：定時推出一道橫跨畫面的大浪
//   金 軌道砲擊：鎖定血最多的敵人，從天上打下一道光柱
//   粉 光刃護環：三片光刃一直繞著你轉，可以擋掉碰到的子彈
LV_CAP[12] = 10; LV_CAP[13] = 10; LV_CAP[14] = 11; LV_CAP[15] = 11;
odCap = function () { const c = G.round > 1 ? (G.stage >= 14 ? 11 : 10) : (LV_CAP[G.stage] ?? 10); return Math.max(0, c - 8); };
const AWAKE = {
  red: { name: '鳳凰火翼', col: '#ff8a3a' }, blue: { name: '稜鏡散射', col: '#8fe8ff' }, purple: { name: '雷暴領域', col: '#d090ff' },
  wave: { name: '海嘯', col: '#5ff0d0' }, rail: { name: '軌道砲擊', col: '#ffe070' }, blade: { name: '光刃護環', col: '#ff8ae0' },
};
G.aw = []; P.awT = 0;
hurt = (function (base) { return function (e, d) { base(e, d * (P.od >= 3 ? 1.06 : 1)); }; })(hurt);
collect = (function (base) {
  return function (it) {
    const od0 = P.od; base(it);
    if (P.od >= 3 && od0 < 3) {
      const A = AWAKE[P.w];
      G.queue.push({ t: G.st + 1.0, fn: () => { popText(P.x, P.y - 66, '覺醒！' + (A ? A.name : ''), A ? A.col : '#fff'); Snd.play('1up'); P.aura = 1.2; P.auraCol = A ? A.col : '#fff'; } });
    }
  };
})(collect);
startStage = (function (base) {
  return function (n) {
    base(n); G.aw = [];
    if (G.round === 1 && n === 14 && !G.mission) G.banner.extra3 = '覺醒解放：每種武器多一招必殺技';
  };
})(startStage);
playerHit = (function (base) { return function () { const was = P.alive; base(); if (was && !P.alive) G.aw = []; }; })(playerHit);
function awTarget(pref) { // 優先打頭目，其次血最多的
  let best = null, bv = -1;
  for (const e of G.enemies) { if (e.dead || e.hidden || e.inv || e.y < 10 || e.y > H - 60) continue; const v = (e.boss ? 1e6 : 0) + (pref === 'hp' ? e.hp : -d2(e.x, e.y, P.x, P.y - 200)); if (v > bv) { bv = v; best = e; } }
  return best;
}
function awFire(dt) {
  const w = P.w;
  if (w === 'blade') { if (!G.aw.some(a => a.k === 'halo')) G.aw.push({ k: 'halo', t: 0, cd: new Map() }); return; }
  P.awT -= dt; if (P.awT > 0) return;
  if (w === 'red') { P.awT = 1.6; for (const s of [-1, 1]) G.aw.push({ k: 'phx', x: P.x + s * 16, y: P.y - 4, vx: s * 140, vy: -260, t: 0, tr: [] }); Snd.tone(520, 0.25, 'sawtooth', 0.04, 900); }
  else if (w === 'blue') { P.awT = 0.45; const B = P.beams && P.beams[0]; if (!B || B.k < 0.5) { P.awT = 0.1; return; } const used = new Set(); const nx = P.x, ny = P.y - 24; for (let k = 0; k < 3; k++) { let best = null, bd = 260 * 260; for (const e of G.enemies) { if (e.dead || e.hidden || e.inv || used.has(e) || e.y < 0 || e.y > H) continue; const d = d2(e.x, e.y, nx, ny - 120); if (d < bd) { bd = d; best = e; } } if (!best) break; used.add(best); hurt(best, best.boss ? 7 : 9); pulseFlash(best); G.aw.push({ k: 'prism', x0: nx, y0: ny, x1: best.x, y1: best.y, t: 0, h: k * 120 }); } }
  else if (w === 'purple') { P.awT = 2.0; G.aw.push({ k: 'storm', x: P.x, y: P.y, t: 0, hit: false }); Snd.noise(0.35, 0.09, 4000, 900, 0, 'bandpass'); }
  else if (w === 'wave') { P.awT = 1.9; G.aw.push({ k: 'tsu', x: P.x, y: P.y - 20, t: 0, hit: new Set() }); Snd.tone(160, 0.5, 'sine', 0.08, 320); }
  else if (w === 'rail') { const e = awTarget('hp'); if (!e) { P.awT = 0.3; return; } P.awT = 2.6; G.aw.push({ k: 'orb', e, x: e.x, y: e.y, t: 0, done: false }); Snd.play('warn'); }
}
updatePB = (function (base) {
  return function (dt) {
    base(dt);
    if (!G.aw) G.aw = [];
    const active = P.od >= 3 && P.alive && G.t - (P.firing || -9) < 0.15 && G.phase !== 'clear' && G.phase !== 'down' && G.state === 'play';
    if (active) awFire(dt);
    for (const a of G.aw) {
      a.t += dt;
      if (a.k === 'phx') {
        if (!a.tg || a.tg.dead || a.tg.hidden) a.tg = awTarget('near');
        let ang = Math.atan2(a.vy, a.vx);
        if (a.tg && a.t > 0.15) ang = turnTo(ang, Math.atan2(a.tg.y - a.y, a.tg.x - a.x), 6 * dt);
        const sp = Math.min(460, 260 + a.t * 500); a.vx = Math.cos(ang) * sp; a.vy = Math.sin(ang) * sp;
        a.x += a.vx * dt; a.y += a.vy * dt; a.tr.unshift([a.x, a.y]); if (a.tr.length > 12) a.tr.length = 12;
        if (a.t > 2.4 || a.y < -40 || a.x < -40 || a.x > W + 40) a.dead = true;
        for (const e of G.enemies) { if (a.dead || e.dead || e.hidden || e.inv) continue; for (const [cx, cy, r] of hitCircles(e)) if (d2(cx, cy, a.x, a.y) < (r + 8) ** 2) { hurt(e, 14); a.dead = true; boom(a.x, a.y, 0.8); for (const o of G.enemies) if (o !== e && !o.dead && !o.inv && d2(o.x, o.y, a.x, a.y) < 34 * 34) hurt(o, 6); break; } }
      } else if (a.k === 'prism') { if (a.t > 0.2) a.dead = true; }
      else if (a.k === 'storm') {
        a.x = P.x; a.y = P.y;
        if (!a.hit && a.t > 0.08) {
          a.hit = true;
          for (const e of G.enemies) if (!e.dead && !e.hidden && !e.inv) for (const [cx, cy, r] of hitCircles(e)) if (d2(cx, cy, a.x, a.y) < (150 + r) ** 2) { hurt(e, e.boss ? 14 : 20); pulseFlash(e); break; }
          let n = 0; for (const b of G.eb) if (d2(b.x, b.y, a.x, a.y) < 70 * 70) { b.dead = true; n++; fxP({ k: 'c', x: b.x, y: b.y, vx: 0, vy: -40, life: 0, max: 0.3 }); }
          if (n) addScore(n * 10);
        }
        if (a.t > 0.5) a.dead = true;
      } else if (a.k === 'tsu') {
        a.y -= 250 * dt; const w = Math.min(330, 60 + a.t * 520);
        for (const e of G.enemies) { if (e.dead || e.hidden || e.inv || a.hit.has(e)) continue; for (const [cx, cy, r] of hitCircles(e)) if (Math.abs(cx - a.x) < w / 2 + r && Math.abs(cy - a.y) < r + 12) { a.hit.add(e); hurt(e, e.boss ? 9 : 12); break; } }
        if (a.y < -40) a.dead = true;
      } else if (a.k === 'orb') {
        if (a.e && !a.e.dead && a.t < 0.45) { a.x = a.e.x; a.y = a.e.y; }
        if (!a.done && a.t >= 0.5) {
          a.done = true; G.shake = Math.max(G.shake, 4);
          for (const e of G.enemies) if (!e.dead && !e.hidden && !e.inv) for (const [cx, cy, r] of hitCircles(e)) if (Math.abs(cx - a.x) < 22 + r && cy < a.y + 40) { hurt(e, e.boss ? 42 : 70); break; }
          for (let i = 0; i < 10; i++) fxP({ k: 'k', x: a.x, y: a.y, vx: rnd(-220, 220), vy: rnd(-220, 220), life: 0, max: 0.35 });
          Snd.noise(0.3, 0.12, 3000, 400); Snd.tone(1600, 0.3, 'sawtooth', 0.05, 200);
        }
        if (a.t > 0.9) a.dead = true;
      } else if (a.k === 'halo') {
        if (!(P.od >= 3 && P.w === 'blade') || !P.alive) { a.dead = true; continue; }
        for (let k = 0; k < 3; k++) {
          const ang = a.t * 5 + k * TAU / 3, bx = P.x + Math.cos(ang) * 36, by = P.y + Math.sin(ang) * 36;
          for (const b of G.eb) if (d2(b.x, b.y, bx, by) < 11 * 11) { b.dead = true; addScore(10); fxP({ k: 'c', x: b.x, y: b.y, vx: 0, vy: -30, life: 0, max: 0.25 }); }
          for (const e of G.enemies) { if (e.dead || e.hidden || e.inv) continue; const last = a.cd.get(e) || -1; if (a.t - last < 0.15) continue; for (const [cx, cy, r] of hitCircles(e)) if (d2(cx, cy, bx, by) < (r + 9) ** 2) { hurt(e, 3); a.cd.set(e, a.t); pulseFlash(e); break; } }
        }
        G.eb = G.eb.filter(b => !b.dead);
      }
    }
    G.aw = G.aw.filter(a => !a.dead);
  };
})(updatePB);
drawPB = (function (base) {
  return function (ctx) {
    base(ctx);
    if (!G.aw || !G.aw.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const a of G.aw) {
      if (a.k === 'phx') {
        for (let i = 1; i < a.tr.length; i++) { const u = i / a.tr.length; ctx.strokeStyle = `rgba(255,${170 - u * 120 | 0},40,${0.85 * (1 - u)})`; ctx.lineWidth = 12 * (1 - u) + 1; ctx.beginPath(); ctx.moveTo(a.tr[i - 1][0], a.tr[i - 1][1]); ctx.lineTo(a.tr[i][0], a.tr[i][1]); ctx.stroke(); }
        const ang = Math.atan2(a.vy, a.vx), fl = Math.sin(a.t * 30) * 0.4;
        for (const s of [-1, 1]) { ctx.fillStyle = 'rgba(255,150,50,.7)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + Math.cos(ang + s * (2.3 + fl)) * 16, a.y + Math.sin(ang + s * (2.3 + fl)) * 16); ctx.lineTo(a.x + Math.cos(ang + Math.PI) * 8, a.y + Math.sin(ang + Math.PI) * 8); ctx.fill(); }
        glowDot(ctx, a.x, a.y, 12, 'rgba(255,190,80,.95)'); glowDot(ctx, a.x, a.y, 5, 'rgba(255,255,230,1)');
      } else if (a.k === 'prism') {
        const k = 1 - a.t / 0.2;
        for (const [o, c] of [[-1.5, '255,90,120'], [0, '120,255,160'], [1.5, '110,160,255']]) { ctx.strokeStyle = `rgba(${c},${0.8 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x0 + o, a.y0); ctx.lineTo(a.x1 + o, a.y1); ctx.stroke(); }
        ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x0, a.y0); ctx.lineTo(a.x1, a.y1); ctx.stroke();
        glowDot(ctx, a.x1, a.y1, 12 * k, 'rgba(200,240,255,.9)');
      } else if (a.k === 'storm') {
        const k = a.t / 0.5, R = 20 + k * 140;
        ctx.strokeStyle = `rgba(210,150,255,${0.9 * (1 - k)})`; ctx.lineWidth = 3;
        ctx.beginPath(); for (let i = 0; i <= 36; i++) { const an = i / 36 * TAU, rr2 = R + (hash(i, Math.floor(a.t * 30), 7) - 0.5) * 16; i ? ctx.lineTo(a.x + Math.cos(an) * rr2, a.y + Math.sin(an) * rr2) : ctx.moveTo(a.x + Math.cos(an) * rr2, a.y + Math.sin(an) * rr2); } ctx.stroke();
        ctx.strokeStyle = `rgba(255,240,255,${1 - k})`; ctx.lineWidth = 1; ctx.stroke();
        glowDot(ctx, a.x, a.y, 70 * (1 - k), `rgba(180,110,255,${0.4 * (1 - k)})`);
      } else if (a.k === 'tsu') {
        const w = Math.min(330, 60 + a.t * 520), half = w / 2;
        const arc = (lw, col, dy) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a.x - half, a.y + 14 + dy); ctx.quadraticCurveTo(a.x, a.y - 18 + dy, a.x + half, a.y + 14 + dy); ctx.stroke(); };
        arc(22, 'rgba(40,220,190,.18)', 0); arc(8, 'rgba(100,255,220,.6)', 0); arc(2.4, 'rgba(240,255,250,.95)', 0); arc(3, 'rgba(120,255,230,.35)', 10);
      } else if (a.k === 'orb') {
        if (a.t < 0.5) { const k = a.t / 0.5; ctx.strokeStyle = `rgba(255,230,120,${0.5 + k * 0.5})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(a.x, a.y, 34 - k * 22, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(a.x - 40, a.y); ctx.lineTo(a.x + 40, a.y); ctx.moveTo(a.x, a.y - 40); ctx.lineTo(a.x, a.y + 40); ctx.stroke(); ctx.fillStyle = `rgba(255,230,120,${0.15 * k})`; ctx.fillRect(a.x - 3, 0, 6, a.y); }
        else { const k = 1 - (a.t - 0.5) / 0.4, g = ctx.createLinearGradient(a.x - 26, 0, a.x + 26, 0); g.addColorStop(0, 'rgba(255,200,60,0)'); g.addColorStop(0.5, `rgba(255,240,170,${k})`); g.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = g; ctx.fillRect(a.x - 26 * k - 4, 0, 52 * k + 8, a.y + 20); glowDot(ctx, a.x, a.y, 50 * k, `rgba(255,220,120,${k})`); }
      } else if (a.k === 'halo') {
        ctx.strokeStyle = 'rgba(255,120,220,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.x, P.y, 36, 0, TAU); ctx.stroke();
        for (let k = 0; k < 3; k++) {
          const ang = a.t * 5 + k * TAU / 3, bx = P.x + Math.cos(ang) * 36, by = P.y + Math.sin(ang) * 36;
          glowDot(ctx, bx, by, 13, 'rgba(255,90,210,.45)');
          ctx.strokeStyle = 'rgba(255,240,255,.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bx, by, 7, ang * 3, ang * 3 + 2); ctx.stroke(); ctx.beginPath(); ctx.arc(bx, by, 7, ang * 3 + Math.PI, ang * 3 + Math.PI + 2); ctx.stroke();
        }
      }
    }
    ctx.restore();
  };
})(drawPB);
// HUD：覺醒標示
drawHUD = (function (base) {
  return function (c) {
    base(c);
    if (P.od >= 3 && P.alive) { const A = AWAKE[P.w]; if (A) txt(c, '覺醒・' + A.name, 12, H - 64, 9, A.col, 'left', CJK, 700); }
  };
})(drawHUD);
window.__sky.aw = { AWAKE, odCap: () => odCap() };
