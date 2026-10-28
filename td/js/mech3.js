'use strict';
// 守塔奇兵：第三章關卡機制的畫面——雪崩陷阱、冰洞巢穴、碎石與熔爐基座、輸送帶與拉桿、火盆與寒潮、
// 頭目丟出的雪球／砲彈、塔被凍住／被雪埋住的樣子。靜態的部分做成精靈快取，每幀只畫會動的東西。
const Mech3Art = (() => {
  const { TAU, shade, rgba, ell, circ, rrect, poly, lgrad, rgrad, mix } = Gfx;
  let V = null, dpr = 1;
  const P = (x, y) => V.P(x, y);
  const q4 = s => Math.round(s * 4) / 4;

  // ───────── 雪崩陷阱：雪坡上懸著一大片積雪，底下是石頭 ─────────
  function trapSprite(s) {
    const u = q4(s);
    return Gfx.sprite('m3trap:' + u, u * 1.2, u * 1.25, u * 0.6, u * 0.95, dpr, x => {
      // 岩石底座
      const rk = [[-0.42, -0.05, 0.22], [0.36, -0.02, 0.2], [-0.05, -0.2, 0.3], [0.2, -0.35, 0.2], [-0.28, -0.32, 0.18]];
      ell(x, 0, 0, u * 0.5, u * 0.16, 'rgba(10,20,40,.28)');
      for (const [rx, ry, rr] of rk) { const cx = rx * u, cy = ry * u, r = rr * u; x.fillStyle = lgrad(x, cx - r, cy - r, cx + r, cy + r, ['#9aa8b8', '#6a7888', '#3e4a5a']); x.beginPath(); x.ellipse(cx, cy, r, r * 0.8, 0, 0, TAU); x.fill(); }
      // 積雪（往道路那一側懸出去）
      const sn = new Path2D();
      sn.moveTo(-u * 0.5, -u * 0.32); sn.quadraticCurveTo(-u * 0.45, -u * 0.78, -u * 0.05, -u * 0.82); sn.quadraticCurveTo(u * 0.42, -u * 0.86, u * 0.52, -u * 0.5);
      sn.quadraticCurveTo(u * 0.56, -u * 0.32, u * 0.42, -u * 0.3); sn.quadraticCurveTo(u * 0.2, -u * 0.18, 0, -u * 0.3); sn.quadraticCurveTo(-u * 0.25, -u * 0.2, -u * 0.5, -u * 0.32); sn.closePath();
      x.fillStyle = lgrad(x, 0, -u * 0.86, 0, -u * 0.2, ['#ffffff', '#eef6fc', '#bcd4e8']); x.fill(sn);
      x.strokeStyle = 'rgba(90,120,160,.45)'; x.lineWidth = Math.max(1, u * 0.02); x.stroke(sn);
      // 冰柱
      for (let i = 0; i < 6; i++) { const ix = (-0.38 + i * 0.15) * u, iy = -u * (0.3 + (i % 2) * 0.04); poly(x, [ix - u * 0.03, iy, ix + u * 0.03, iy, ix, iy + u * (0.1 + (i % 3) * 0.05)], '#d8f2ff'); }
      // 亮面
      x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = Math.max(1, u * 0.035); x.lineCap = 'round';
      x.beginPath(); x.moveTo(-u * 0.32, -u * 0.62); x.quadraticCurveTo(-u * 0.1, -u * 0.78, u * 0.15, -u * 0.76); x.stroke();
      // 木樁和繩子（拉下去就崩）
      x.fillStyle = '#7a5532'; x.fillRect(u * 0.3, -u * 0.62, u * 0.05, u * 0.42);
      x.strokeStyle = '#c8a46a'; x.lineWidth = Math.max(1, u * 0.02); x.beginPath(); x.moveTo(u * 0.33, -u * 0.6); x.quadraticCurveTo(u * 0.1, -u * 0.55, -u * 0.05, -u * 0.62); x.stroke();
    });
  }
  function drawTraps(ctx, G, s, time, ui) {
    for (const tr of G.traps) {
      const [a, b] = P(tr.cx, tr.cy), ready = tr.cd <= 0 && G.state === 'run';
      const [ta, tb] = P(tr.tx, tr.ty), R = TRAP.r * s;
      // 打擊範圍（準備好時亮起來）
      ctx.save();
      ctx.globalAlpha = ready ? 0.6 + 0.25 * Math.sin(time * 4 + tr.i) : 0.3;
      ctx.strokeStyle = ready ? '#2a6ab8' : '#6a8aa8'; ctx.lineWidth = Math.max(1.5, s * 0.035); ctx.setLineDash([s * 0.1, s * 0.08]); ctx.lineDashOffset = -time * s * 0.25;
      ctx.beginPath(); ctx.ellipse(ta, tb, R, R, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (ready) { ctx.globalAlpha = 0.1; ctx.fillStyle = '#4a9ae8'; ctx.fill(); }
      ctx.restore();
      Gfx.drawSprite(ctx, trapSprite(s), a, b + s * 0.3);
      // 冷卻環／準備好的光
      const r = s * 0.2, cy = b - s * 0.62;
      if (ready) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 5 + tr.i); ctx.drawImage(Gfx.glow('#bfeaff'), a - r * 3, cy - r * 3, r * 6, r * 6); ctx.restore(); }
      circ(ctx, a, cy, r * 1.15, 'rgba(14,24,44,.78)');
      ctx.strokeStyle = ready ? '#bfeaff' : '#6a8aa8'; ctx.lineWidth = Math.max(2, s * 0.045); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(a, cy, r * 0.95, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - tr.cd / tr.max)); ctx.stroke(); ctx.lineCap = 'butt';
      // 圖示：往下的箭頭＋雪花
      if (ready) { const bob = Math.sin(time * 6) * s * 0.02; poly(ctx, [a - r * 0.45, cy - r * 0.25 + bob, a + r * 0.45, cy - r * 0.25 + bob, a, cy + r * 0.45 + bob], '#ffffff'); }
      else { ctx.fillStyle = '#cfe6f8'; ctx.font = `700 ${Math.max(9, s * 0.2)}px "Fredoka",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.ceil(tr.cd), a, cy + 0.5); }
    }
  }

  // ───────── 冰洞巢穴：冰塊堆成的圓頂＋黑洞洞口；甦醒時洞裡亮出藍眼睛 ─────────
  function nestSprite(s, st) {
    const u = q4(s);
    return Gfx.sprite('m3nest:' + st + ':' + u, u * 1.5, u * 1.5, u * 0.75, u * 1.1, dpr, x => {
      ell(x, 0, 0, u * 0.62, u * 0.2, 'rgba(10,20,40,.3)');
      if (st === 2) {
        // 打爛了：散落的冰塊
        for (let i = 0; i < 9; i++) { const an = i * 0.7, d = u * (0.15 + (i % 3) * 0.14), cx = Math.cos(an) * d, cy = Math.sin(an) * d * 0.45 - u * 0.05, r = u * (0.09 + (i % 2) * 0.05); poly(x, [cx - r, cy, cx - r * 0.3, cy - r * 1.1, cx + r, cy - r * 0.4, cx + r * 0.6, cy + r * 0.3], i % 2 ? '#bfe2f2' : '#8ec4dc'); }
        return;
      }
      // 圓頂（一圈圈冰磚）
      const dome = new Path2D(); dome.moveTo(-u * 0.6, 0); dome.bezierCurveTo(-u * 0.62, -u * 0.72, -u * 0.3, -u * 0.95, 0, -u * 0.95); dome.bezierCurveTo(u * 0.3, -u * 0.95, u * 0.62, -u * 0.72, u * 0.6, 0); dome.closePath();
      x.fillStyle = lgrad(x, -u * 0.6, -u, u * 0.6, 0, st ? ['#e8f8ff', '#9ad0ea', '#4a88b0'] : ['#f4fbff', '#c8e2f0', '#8ab0c8']); x.fill(dome);
      x.save(); x.clip(dome);
      x.strokeStyle = 'rgba(60,110,150,.45)'; x.lineWidth = Math.max(1, u * 0.02);
      for (let j = 1; j < 5; j++) { const yy = -u * 0.95 + j * u * 0.21; x.beginPath(); x.moveTo(-u * 0.7, yy); x.lineTo(u * 0.7, yy); x.stroke(); for (let k = -3; k <= 3; k++) { const xx = (k + (j % 2) * 0.5) * u * 0.22; x.beginPath(); x.moveTo(xx, yy - u * 0.21); x.lineTo(xx, yy); x.stroke(); } }
      x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(-u * 0.25, -u * 0.62, u * 0.18, u * 0.08, -0.5, 0, TAU); x.fill();
      x.restore();
      // 洞口
      const hole = new Path2D(); hole.moveTo(-u * 0.24, 0); hole.quadraticCurveTo(-u * 0.26, -u * 0.46, 0, -u * 0.48); hole.quadraticCurveTo(u * 0.26, -u * 0.46, u * 0.24, 0); hole.closePath();
      x.fillStyle = st ? rgrad(x, 0, -u * 0.15, 0, u * 0.4, ['#061224', '#0c2038', '#1a3a5a']) : '#a8c8dc'; x.fill(hole);
      if (!st) { x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = Math.max(1, u * 0.025); for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-u * 0.2 + i * u * 0.13, -u * 0.05); x.lineTo(-u * 0.14 + i * u * 0.11, -u * 0.38); x.stroke(); } }
      // 冰柱與尖刺
      for (let i = 0; i < 5; i++) { const ix = (-0.22 + i * 0.11) * u; poly(x, [ix - u * 0.03, -u * 0.47 + Math.abs(i - 2) * u * 0.03, ix + u * 0.03, -u * 0.47 + Math.abs(i - 2) * u * 0.03, ix, -u * (0.34 - (i % 2) * 0.05)], '#e8fbff'); }
      for (const [sx, sh] of [[-0.45, 0.32], [0.48, 0.28], [-0.12, 0.3]]) { const bx = sx * u, by = sx < -0.2 || sx > 0.2 ? -u * 0.35 : -u * 0.88; poly(x, [bx - u * 0.06, by, bx, by - u * sh, bx + u * 0.06, by], '#dff6ff'); }
    });
  }
  function drawNests(ctx, G, s, time) {
    for (const n of G.nests) {
      const [a, b] = P(n.x, n.y), st = !n.alive ? 2 : n.awake ? 1 : 0;
      if (st === 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 3 + n.gx); ctx.drawImage(Gfx.glow('#7fd8ff'), a - s, b - s * 1.2, s * 2, s * 1.8); ctx.restore(); }
      const shake = n.flash > 0 ? Math.sin(time * 80) * s * 0.025 : 0;
      Gfx.drawSprite(ctx, nestSprite(s, st), a + shake, b + s * 0.35);
      if (st === 1) {
        // 洞裡的眼睛
        const blink = Math.sin(time * 1.3 + n.gx) > 0.96 ? 0.2 : 1;
        for (const [ex, ey] of [[-0.08, -0.22], [0.08, -0.22], [-0.04, -0.12], [0.11, -0.1]].slice(0, 2 + (Math.floor(time * 0.5 + n.gy) % 3))) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(Gfx.glow('#9ff0ff'), a + ex * s - s * 0.06, b + s * 0.35 + ey * s - s * 0.06, s * 0.12, s * 0.12); ctx.restore(); ell(ctx, a + ex * s, b + s * 0.35 + ey * s, s * 0.025, s * 0.02 * blink, '#e8ffff'); }
        if (n.flash > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, n.flash / 0.09) * 0.5; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(Gfx.glow('#ffffff'), a - s * 0.6, b - s * 0.6, s * 1.2, s * 1.1); ctx.restore(); }
        // 生命條
        const w = s * 0.8, h = Math.max(4, s * 0.08), x0 = a - w / 2, y0 = b - s * 0.78, f = clamp(n.hp / n.maxHp, 0, 1);
        rrect(ctx, x0 - 1.5, y0 - 1.5, w + 3, h + 3, h); ctx.fillStyle = 'rgba(10,18,34,.85)'; ctx.fill();
        rrect(ctx, x0, y0, Math.max(h, w * f), h, h / 2); ctx.fillStyle = lgrad(ctx, x0, 0, x0 + w, 0, ['#5ac8ff', '#bff0ff']); ctx.fill();
        // 下一批小雪妖的倒數
        if (G.spawners.length) { const r = s * 0.1; ctx.strokeStyle = 'rgba(191,240,255,.85)'; ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.beginPath(); ctx.arc(a + w / 2 + r * 1.6, y0 + h / 2, r, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - n.spawnT / NEST.every)); ctx.stroke(); }
      } else if (st === 0) {
        // 沉睡中：顯示第幾波甦醒
        const txt = `第 ${n.wake + 1} 波甦醒`, fz = Math.max(9, s * 0.2);
        ctx.font = `700 ${fz}px "Noto Sans TC",sans-serif`; const w = ctx.measureText(txt).width + fz;
        rrect(ctx, a - w / 2, b - s * 0.82, w, fz * 1.5, fz * 0.75); ctx.fillStyle = 'rgba(14,30,50,.72)'; ctx.fill();
        ctx.fillStyle = '#cfeaff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, a, b - s * 0.82 + fz * 0.78);
        for (let i = 0; i < 2; i++) { const ph = (time * 0.4 + i * 0.5) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8; ctx.fillStyle = '#e8f6ff'; ctx.font = `700 ${Math.round(fz * (0.8 + ph * 0.4))}px "Fredoka",sans-serif`; ctx.fillText('z', a + s * 0.25 + ph * s * 0.2, b - s * 0.1 - ph * s * 0.4); }
        ctx.globalAlpha = 1;
      }
    }
  }

  // ───────── 碎石堆＋熔爐基座 ─────────
  function rubbleSprite(s, v) {
    const u = q4(s);
    return Gfx.sprite('m3rub:' + v + ':' + u, u * 1.1, u * 1.0, u * 0.55, u * 0.7, dpr, x => {
      const r = mkRng(v * 977 + 13);
      ell(x, 0, 0, u * 0.46, u * 0.15, 'rgba(0,0,0,.3)');
      // 斷掉的木樑
      x.save(); x.rotate(-0.4 + r() * 0.8); x.fillStyle = lgrad(x, 0, -u * 0.05, 0, u * 0.05, ['#8a6038', '#5a3a1e']); x.fillRect(-u * 0.38, -u * 0.22, u * 0.7, u * 0.09); x.fillStyle = '#3a2614'; x.fillRect(u * 0.2, -u * 0.22, u * 0.03, u * 0.09); x.restore();
      for (let i = 0; i < 9; i++) {
        const cx = (r() - 0.5) * u * 0.75, cy = -u * (0.05 + r() * 0.3) + (i < 4 ? 0 : -u * 0.08), rr = u * (0.09 + r() * 0.1);
        const base = mix('#8a7e74', '#5a4e48', r());
        x.beginPath(); for (let k = 0; k < 6; k++) { const an = k / 6 * TAU + r() * 0.5, q = rr * (0.75 + r() * 0.35); x.lineTo(cx + Math.cos(an) * q, cy + Math.sin(an) * q * 0.8); } x.closePath();
        x.fillStyle = lgrad(x, cx - rr, cy - rr, cx + rr, cy + rr, [shade(base, 0.25), base, shade(base, -0.3)]); x.fill();
        x.strokeStyle = 'rgba(30,20,16,.35)'; x.lineWidth = Math.max(0.8, u * 0.012); x.stroke();
      }
      for (let i = 0; i < 6; i++) circ(x, (r() - 0.5) * u * 0.8, -r() * u * 0.08, u * 0.025, '#4a3e38');
    });
  }
  function anvilSprite(s) {
    const u = q4(s);
    return Gfx.sprite('m3anv:' + u, u * 1.0, u * 0.7, u * 0.5, u * 0.35, dpr, x => {
      const w = u * 0.42, h = u * 0.26;
      x.beginPath(); for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + TAU / 16; x.lineTo(Math.cos(an) * w, Math.sin(an) * h); } x.closePath();
      x.fillStyle = lgrad(x, -w, -h, w, h, ['#6a6460', '#3a3634', '#24201e']); x.fill(); x.strokeStyle = '#1a1614'; x.lineWidth = Math.max(1, u * 0.03); x.stroke();
      x.beginPath(); for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + TAU / 16; x.lineTo(Math.cos(an) * w * 0.72, Math.sin(an) * h * 0.72); } x.closePath();
      x.strokeStyle = '#ff9a3a'; x.lineWidth = Math.max(1, u * 0.025); x.stroke();
      // 鐵砧紋章
      x.fillStyle = '#ffb35a'; x.beginPath(); x.moveTo(-w * 0.35, -h * 0.18); x.lineTo(w * 0.4, -h * 0.18); x.lineTo(w * 0.22, h * 0.05); x.lineTo(w * 0.1, h * 0.05); x.lineTo(w * 0.15, h * 0.3); x.lineTo(-w * 0.15, h * 0.3); x.lineTo(-w * 0.1, h * 0.05); x.lineTo(-w * 0.2, h * 0.05); x.closePath(); x.fill();
      for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + TAU / 16; circ(x, Math.cos(an) * w * 0.86, Math.sin(an) * h * 0.86, u * 0.018, '#c8b8a8'); }
    });
  }
  function drawGroundMarks(ctx, G, s, time, ui) {
    // 熔爐基座（碎石清掉後才看得到的也在這裡）
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = G.grid[y][x];
      if (c.anv && !c.rub) {
        const [a, b] = P(x + 0.5, y + 0.55);
        Gfx.drawSprite(ctx, anvilSprite(s), a, b);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 2.5 + x); ctx.drawImage(Gfx.glow('#ff8a2a'), a - s * 0.5, b - s * 0.3, s, s * 0.6); ctx.restore();
      }
    }
  }
  function drawRubble(ctx, G, s, time, ui) {
    const sel = ui && ui.selRub;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = G.grid[y][x]; if (!c.rub) continue;
      const [a, b] = P(x + 0.5, y + 0.5);
      Gfx.drawSprite(ctx, rubbleSprite(s, (x * 7 + y * 3) % 4), a, b + s * 0.2);
      const on = sel && sel.x === x && sel.y === y;
      if (on || (ui && ui.placing)) {
        // 價格小牌
        const fz = Math.max(9, s * 0.2), txt = '⛏ ' + RUB_COST;
        ctx.font = `700 ${fz}px "Fredoka","Noto Sans TC",sans-serif`; const w = ctx.measureText(txt).width + fz * 0.9;
        rrect(ctx, a - w / 2, b - s * 0.5, w, fz * 1.45, fz * 0.7); ctx.fillStyle = on ? 'rgba(255,200,80,.95)' : 'rgba(30,22,16,.7)'; ctx.fill();
        ctx.fillStyle = on ? '#3a2410' : (G.gold >= RUB_COST ? '#ffd84a' : '#ff8a7a'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, a, b - s * 0.5 + fz * 0.75);
      }
      if (on) { const p = 0.5 + 0.5 * Math.sin(time * 6); ctx.strokeStyle = `rgba(255,216,74,${0.6 + p * 0.4})`; ctx.lineWidth = Math.max(2, s * 0.05); rrect(ctx, a - s * 0.44, b - s * 0.44, s * 0.88, s * 0.88, s * 0.18); ctx.stroke(); }
    }
  }

  // ───────── 輸送帶＋拉桿 ─────────
  function drawBelts(ctx, G, s, time) {
    const B = G.belt; if (!B) return;
    for (const [cx, cy, cw, chh] of G.L.belts) for (let y = cy; y < cy + chh; y++) for (let x = cx; x < cx + cw; x++) {
      let dx = 1, dy = 0;
      for (const Pp of G.paths) for (const sg of Pp.seg) if (segDist2(x + 0.5, y + 0.5, sg.a.x, sg.a.y, sg.b.x, sg.b.y) < 0.05) { dx = sg.dx; dy = sg.dy; }
      const [a, b] = P(x + 0.5, y + 0.5), an = V.A(Math.atan2(dy, dx));
      ctx.save(); ctx.translate(a, b); ctx.rotate(an);
      const L = s * 0.5, W = s * 0.38;
      ctx.fillStyle = '#2e2a2a'; ctx.fillRect(-L, -W, L * 2, W * 2);
      // 履帶條紋：平常緩慢往前；反轉時快速往後
      const sp = B.on > 0 ? -2.6 : 0.35, off = ((time * sp * s) % (s * 0.2) + s * 0.2) % (s * 0.2);
      ctx.fillStyle = B.on > 0 ? '#6a5a4a' : '#4a4442';
      for (let k = -L - s * 0.2 + off; k < L; k += s * 0.2) ctx.fillRect(k, -W * 0.9, s * 0.08, W * 1.8);
      ctx.fillStyle = '#8a7a6a'; ctx.fillRect(-L, -W - s * 0.04, L * 2, s * 0.05); ctx.fillRect(-L, W - s * 0.01, L * 2, s * 0.05);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) circ(ctx, sx * L * 0.85, sy * W * 1.05, s * 0.03, '#c8b8a0');
      if (B.on > 0) { ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 10); ctx.strokeStyle = '#ffcf7a'; ctx.lineWidth = Math.max(2, s * 0.05); ctx.lineCap = 'round'; const ph = ((-time * 2.2) % 1 + 1) % 1; const xx = -L + ph * L * 2; ctx.beginPath(); ctx.moveTo(xx + s * 0.08, -s * 0.13); ctx.lineTo(xx - s * 0.06, 0); ctx.lineTo(xx + s * 0.08, s * 0.13); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.restore();
    }
    const [lx, ly] = G.L.lever, [a, b] = P(lx + 0.5, ly + 0.5), ready = B.cd <= 0 && G.state === 'run';
    // 拉桿機台
    ell(ctx, a, b + s * 0.18, s * 0.38, s * 0.13, 'rgba(0,0,0,.3)');
    rrect(ctx, a - s * 0.3, b - s * 0.15, s * 0.6, s * 0.36, s * 0.06); ctx.fillStyle = lgrad(ctx, 0, b - s * 0.15, 0, b + s * 0.2, ['#8a7a6a', '#5a4a3e', '#3a2e26']); ctx.fill();
    ctx.strokeStyle = '#2a201a'; ctx.lineWidth = Math.max(1, s * 0.025); ctx.stroke();
    for (const sx of [-0.22, 0.22]) circ(ctx, a + sx * s, b + s * 0.12, s * 0.035, '#c8b8a0');
    const la = B.on > 0 ? 0.7 : -0.7;
    ctx.save(); ctx.translate(a, b - s * 0.1); ctx.rotate(la);
    ctx.fillStyle = '#c8c0b8'; ctx.fillRect(-s * 0.025, -s * 0.42, s * 0.05, s * 0.42); circ(ctx, 0, -s * 0.44, s * 0.08, B.on > 0 ? '#ffcf7a' : ready ? '#ff5a4a' : '#8a3a30');
    ctx.restore();
    if (ready) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 5); ctx.drawImage(Gfx.glow('#ffb35a'), a - s * 0.6, b - s * 0.9, s * 1.2, s * 1.2); ctx.restore(); }
    const r = s * 0.17, cy = b - s * 0.75;
    circ(ctx, a, cy, r * 1.15, 'rgba(30,20,14,.8)');
    ctx.strokeStyle = B.on > 0 ? '#ffcf7a' : ready ? '#ffb35a' : '#7a5a3a'; ctx.lineWidth = Math.max(2, s * 0.045); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(a, cy, r * 0.95, -Math.PI / 2, -Math.PI / 2 + TAU * (B.on > 0 ? B.on / BELT.dur : 1 - B.cd / B.max)); ctx.stroke(); ctx.lineCap = 'butt';
    if (!ready && B.on <= 0) { ctx.fillStyle = '#e8d8c0'; ctx.font = `700 ${Math.max(9, s * 0.18)}px "Fredoka",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.ceil(B.cd), a, cy + 0.5); }
    else { ctx.strokeStyle = '#fff4d0'; ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.beginPath(); ctx.arc(a, cy, r * 0.45, 0.4, TAU - 0.2); ctx.stroke(); poly(ctx, [a + r * 0.45, cy - r * 0.35, a + r * 0.7, cy + r * 0.1, a + r * 0.2, cy + r * 0.05], '#fff4d0'); }
  }

  // ───────── 火盆 ─────────
  function brazierSprite(s) {
    const u = q4(s);
    return Gfx.sprite('m3brz:' + u, u * 0.9, u * 1.0, u * 0.45, u * 0.8, dpr, x => {
      ell(x, 0, 0, u * 0.3, u * 0.1, 'rgba(0,0,0,.3)');
      x.fillStyle = '#3a3230'; for (const sx of [-0.18, 0.18]) { x.beginPath(); x.moveTo(sx * u, 0); x.lineTo(sx * u * 0.4, -u * 0.32); x.lineTo(sx * u * 0.4 + u * 0.03, -u * 0.32); x.lineTo(sx * u + u * 0.04, 0); x.fill(); }
      x.fillStyle = lgrad(x, -u * 0.3, 0, u * 0.3, 0, ['#8a6a4a', '#5a3e28', '#3a2618']); x.beginPath(); x.moveTo(-u * 0.32, -u * 0.48); x.lineTo(u * 0.32, -u * 0.48); x.lineTo(u * 0.2, -u * 0.3); x.lineTo(-u * 0.2, -u * 0.3); x.closePath(); x.fill();
      x.strokeStyle = '#c8a46a'; x.lineWidth = Math.max(1, u * 0.025); x.beginPath(); x.moveTo(-u * 0.32, -u * 0.48); x.lineTo(u * 0.32, -u * 0.48); x.stroke();
      ell(x, 0, -u * 0.48, u * 0.3, u * 0.07, '#2a1a10'); for (let i = 0; i < 5; i++) circ(x, (i - 2) * u * 0.1, -u * 0.49, u * 0.05, i % 2 ? '#ff6a2a' : '#ffb35a');
    });
  }
  function drawBraziers(ctx, G, s, time) {
    const cold = G.cold && G.cold.on;
    for (const br of G.braziers) {
      const [a, b] = P(br.x, br.y);
      // 暖區
      ctx.save(); ctx.globalAlpha = cold ? 0.35 + 0.1 * Math.sin(time * 3) : 0.12; ctx.strokeStyle = '#ffb35a'; ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.setLineDash([s * 0.12, s * 0.1]); ctx.lineDashOffset = -time * s * 0.2; ctx.beginPath(); ctx.arc(a, b, 2.25 * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]); if (cold) { ctx.globalAlpha = 0.06; ctx.fillStyle = '#ffb35a'; ctx.fill(); } ctx.restore();
      Gfx.drawSprite(ctx, brazierSprite(s), a, b + s * 0.25);
      Art.flame(ctx, a, b + s * 0.25 - s * 0.5, s * 0.12, time * 1.3 + br.x);
    }
  }

  // ───────── 塔的狀態：凍成冰塊、被雪埋住、寒潮結霜 ─────────
  function towerOverlay(ctx, t, a, gy, s, time) {
    if (t.iced > 0 && t.stunT > 0) {
      const f = Math.min(1, t.iced * 2), w = s * 0.42, h = s * 0.95;
      ctx.save(); ctx.globalAlpha = 0.55 * f;
      ctx.fillStyle = lgrad(ctx, a - w, gy - h, a + w, gy, ['rgba(230,250,255,.9)', 'rgba(140,210,240,.7)', 'rgba(90,170,220,.75)']);
      ctx.beginPath(); ctx.moveTo(a - w, gy); ctx.lineTo(a - w * 1.05, gy - h * 0.7); ctx.lineTo(a - w * 0.5, gy - h); ctx.lineTo(a + w * 0.6, gy - h * 0.95); ctx.lineTo(a + w * 1.05, gy - h * 0.6); ctx.lineTo(a + w, gy); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.9 * f; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1, s * 0.025); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a - w * 0.6, gy - h * 0.8); ctx.lineTo(a - w * 0.3, gy - h * 0.35); ctx.stroke();
      ctx.restore();
    }
    if (t.snowT > 0 && t.stunT > 0) {
      const f = Math.min(1, t.snowT * 1.5), w = s * 0.5;
      ctx.save(); ctx.globalAlpha = f;
      for (const [ox, oy, r] of [[-0.25, -0.12, 0.26], [0.22, -0.1, 0.24], [0, -0.32, 0.3], [-0.12, -0.5, 0.2], [0.15, -0.55, 0.18]]) { circ(ctx, a + ox * w * 2, gy + oy * s, r * s, '#e8f2fa'); circ(ctx, a + ox * w * 2 - r * s * 0.25, gy + oy * s - r * s * 0.3, r * s * 0.55, '#ffffff'); }
      ctx.restore();
    }
    if (t.cold && !(t.stunT > 0)) {
      // 結霜：底下一圈冰晶＋偶爾飄雪
      ctx.save(); ctx.globalAlpha = 0.75;
      for (let i = 0; i < 5; i++) { const an = i * 1.25 + t.id, rx = Math.cos(an) * s * 0.3, ry = Math.sin(an) * s * 0.1; poly(ctx, [a + rx - s * 0.03, gy + ry, a + rx, gy + ry - s * (0.1 + (i % 2) * 0.06), a + rx + s * 0.03, gy + ry], '#dff6ff'); }
      ctx.restore();
      Gfx.star(ctx, a + s * 0.3, gy - s * 1.1 + Math.sin(time * 2 + t.id) * s * 0.04, s * 0.07, '#cfefff');
    }
  }
  // ───────── 頭目丟出的雪球／砲彈 ─────────
  function drawLob(ctx, p, s, HS, time) {
    const [a, b0] = P(p.x, p.y), b = b0 - p.h * HS;
    const [ga, gb] = P(p.tx, p.ty);
    ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = p.kind === 'snow' ? '#dff6ff' : '#ff8a5a'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(ga, gb, s * 0.45, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    ell(ctx, a, b0 + s * 0.05, s * 0.18, s * 0.07, 'rgba(0,0,0,.25)');
    if (p.kind === 'snow') {
      const r = s * 0.26;
      circ(ctx, a, b, r, rgrad(ctx, a, b, 0, r, ['#ffffff', '#e8f2fa', '#a8c8e0'], -r * 0.3, -r * 0.3));
      for (let i = 0; i < 4; i++) { const an = time * 6 + i * 1.6; circ(ctx, a + Math.cos(an) * r * 0.6, b + Math.sin(an) * r * 0.5, r * 0.18, 'rgba(200,225,245,.8)'); }
      if (Math.random() < 0.5) FX.part('snow', p.x, p.y, p.h, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, -0.5, 0.6, 0.04, '#ffffff');
    } else {
      const r = s * 0.15;
      circ(ctx, a, b, r, rgrad(ctx, a, b, 0, r, ['#8a8a92', '#3a3a42', '#1a1a20'], -r * 0.3, -r * 0.3));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(Gfx.glow('#ff8a3a'), a - r * 2, b - r * 2.4, r * 2.4, r * 2.4); ctx.restore();
      if (Math.random() < 0.6) FX.part('smoke', p.x, p.y, p.h, 0, 0, 0.1, 0.5, 0.1, '#a8a098');
    }
  }
  // ───────── 寒潮小牌（地圖左上角）＋畫面結霜 ─────────
  function coldBadge(ctx, G, s, time) {
    const C = G.cold; if (!C) return;
    const fz = Math.max(11, Math.min(14, s * 0.3)), x0 = V.ox + s * 0.25, y0 = V.oy + s * 0.25;
    ctx.font = `700 ${fz}px "Noto Sans TC",sans-serif`;
    const txt = C.on ? `寒潮！火盆旁 2 格外的塔變慢  ${Math.ceil(C.t)}` : `下一次寒潮  ${Math.ceil(C.t)}`;
    const w = ctx.measureText(txt).width + fz * 2.6, h = fz * 2;
    rrect(ctx, x0, y0, w, h, h / 2); ctx.fillStyle = C.on ? 'rgba(20,50,80,.85)' : 'rgba(14,16,34,.7)'; ctx.fill(); ctx.strokeStyle = C.on ? 'rgba(160,220,255,.8)' : 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; ctx.stroke();
    const ix = x0 + h * 0.55, iy = y0 + h / 2;
    Gfx.star(ctx, ix, iy, h * 0.26, C.on ? '#cfefff' : '#8aa8c0');
    ctx.fillStyle = '#f6f1e7'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x0 + h * 1.15, iy + 0.5);
  }
  let frostK = '', frostC = null;
  function coldOverlay(ctx, W, H, a) {
    const k = W + 'x' + H;
    if (frostK !== k) {
      frostK = k; frostC = Gfx.canvas(W * 0.5, H * 0.5); const x = frostC.getContext('2d'); x.scale(0.5, 0.5);
      x.fillStyle = rgrad(x, W / 2, H / 2, Math.min(W, H) * 0.35, Math.max(W, H) * 0.75, ['rgba(180,230,255,0)', 'rgba(180,230,255,.55)']); x.fillRect(0, 0, W, H);
      const r = mkRng(5); x.strokeStyle = 'rgba(240,252,255,.55)'; x.lineWidth = 1.5;
      for (let i = 0; i < 60; i++) { const ed = r() < 0.5, px = ed ? (r() < 0.5 ? r() * W * 0.12 : W - r() * W * 0.12) : r() * W, py = ed ? r() * H : (r() < 0.5 ? r() * H * 0.12 : H - r() * H * 0.12); let an = r() * TAU; x.beginPath(); x.moveTo(px, py); let cx = px, cy = py; for (let k2 = 0; k2 < 4; k2++) { an += (r() - 0.5) * 1.2; cx += Math.cos(an) * 14; cy += Math.sin(an) * 14; x.lineTo(cx, cy); } x.stroke(); }
    }
    ctx.globalAlpha = a; ctx.drawImage(frostC, 0, 0, W, H); ctx.globalAlpha = 1;
  }
  // 給 render 的光源
  function lights(G, add, time) {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = G.grid[y][x]; if (c.anv && !c.rub) add(x + 0.5, y + 0.5, 0.1, 1.2, '#ff8a2a', 0.6 + 0.15 * Math.sin(time * 2.5 + x)); }
    for (const n of G.nests) if (n.alive && n.awake) add(n.x, n.y, 0.3, 1.6, '#7fd8ff', 0.7);
    for (const b of G.braziers) add(b.x, b.y, 0.6, 2.4, '#ffb35a', 0.85 + 0.1 * Math.sin(time * 9 + b.x));
    for (const tr of G.traps) if (tr.cd <= 0) add(tr.cx, tr.cy, 0.6, 1, '#cfefff', 0.6);
  }
  // 地面層：在敵人和塔之前畫
  function ground(ctx, G, s, time, ui, v, d) {
    V = v; dpr = d;
    drawGroundMarks(ctx, G, s, time, ui);
    if (G.belt) drawBelts(ctx, G, s, time);
    if (G.L.rubble) drawRubble(ctx, G, s, time, ui);
    if (G.braziers.length) drawBraziers(ctx, G, s, time);
    if (G.nests.length) drawNests(ctx, G, s, time);
    if (G.traps.length) drawTraps(ctx, G, s, time, ui);
  }
  function setView(v, d) { V = v; dpr = d; }
  // 選關縮圖：只畫靜態的樣子
  function thumb(ctx, G, s, v, d) {
    V = v; dpr = d; const L = G.L;
    for (const [x, y] of (L.anvils || [])) if (!(L.rubble || []).some(r => r[0] === x && r[1] === y)) { const [a, b] = P(x + 0.5, y + 0.55); Gfx.drawSprite(ctx, anvilSprite(s), a, b); }
    for (const [x, y] of (L.rubble || [])) { const [a, b] = P(x + 0.5, y + 0.5); Gfx.drawSprite(ctx, rubbleSprite(s, (x * 7 + y * 3) % 4), a, b + s * 0.2); }
    for (const [x, y] of (L.braziers || [])) { const [a, b] = P(x + 0.5, y + 0.5); Gfx.drawSprite(ctx, brazierSprite(s), a, b + s * 0.25); }
    for (const [x, y] of (L.nests || [])) { const [a, b] = P(x + 0.5, y + 0.5); Gfx.drawSprite(ctx, nestSprite(s, 1), a, b + s * 0.35); }
    for (const [x, y] of (L.traps || [])) { const [a, b] = P(x + 0.5, y + 0.5); Gfx.drawSprite(ctx, trapSprite(s), a, b + s * 0.3); }
  }
  return { ground, towerOverlay, drawLob, coldBadge, coldOverlay, lights, setView, thumb };
})();
