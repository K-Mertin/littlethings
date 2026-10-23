'use strict';
// 守塔奇兵：選關世界地圖、圖鑑。地圖整張用程式畫，關卡節點是蓋在上面的按鈕。

const WorldMap = (() => {
  const { TAU, shade, rgba, circ, lgrad, rgrad, fbm } = Gfx;
  // 節點位置（0~1），橫式與直式各一套
  const NL = [[0.07, 0.78], [0.17, 0.5], [0.27, 0.78], [0.37, 0.46], [0.47, 0.74], [0.56, 0.38], [0.65, 0.7], [0.74, 0.32], [0.84, 0.66], [0.93, 0.32]];
  const NP = [[0.3, 0.94], [0.7, 0.85], [0.3, 0.75], [0.7, 0.655], [0.28, 0.56], [0.7, 0.46], [0.3, 0.365], [0.7, 0.27], [0.3, 0.175], [0.7, 0.07]];
  let cache = null;
  const ICON = { autumn: 'tree', canyon: 'rock', meadow: 'tree', forest: 'pine', desert: 'cactus', snow: 'spine', swamp: 'mush', volcano: 'crystal', coast: 'palm', night: 'grave' };
  function positions(w, h) { const P = h > w * 1.05 ? NP : NL; return P.map(([x, y]) => [x * w, y * h]); }
  function draw(w, h) {
    const d = Math.min(2, window.devicePixelRatio || 1);
    const key = w + 'x' + h + '@' + d;
    if (cache && cache.key === key) return cache;
    const c = Gfx.canvas(w * d, h * d); c.style.width = w + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d'); x.scale(d, d);
    const pts = positions(w, h);
    const themes = LEVELS.map(L => L.theme);
    // 海
    x.fillStyle = lgrad(x, 0, 0, 0, h, ['#2a8ec4', '#1a6a9e']); x.fillRect(0, 0, w, h);
    const r = mkRng(9);
    x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1.5; x.lineCap = 'round';
    for (let i = 0; i < w * h / 2500; i++) { const px = r() * w, py = r() * h, ww = 6 + r() * 10; x.beginPath(); x.moveTo(px - ww, py); x.quadraticCurveTo(px, py - 4, px + ww, py); x.stroke(); }
    // 陸地：低解析度的區域圖（每個像素找最近的關卡＝主題色）
    const q = 2, lw = Math.ceil(w / q), lh = Math.ceil(h / q);
    const lc = Gfx.canvas(lw, lh), lx = lc.getContext('2d'), img = lx.createImageData(lw, lh), D = img.data;
    const cols = themes.map(t => Terrain.pal(t).g.map(Gfx.hex));
    const sc = Math.min(w, h);
    for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
      const X = i * q, Y = j * q;
      const wx = X + (fbm(X / 90, Y / 90, 3, 3) - 0.5) * 70, wy = Y + (fbm(X / 90 + 9, Y / 90, 4, 3) - 0.5) * 70;
      let best = 0, bd = 1e18, bd2 = 1e18;
      for (let k = 0; k < pts.length; k++) { const dd = (pts[k][0] - wx) ** 2 + (pts[k][1] - wy) ** 2; if (dd < bd) { bd2 = bd; bd = dd; best = k; } else if (dd < bd2) bd2 = dd; }
      // 島的形狀
      let ed = 1e9; for (let k = 0; k < pts.length; k++) { const segA = pts[k], segB = pts[Math.min(pts.length - 1, k + 1)]; ed = Math.min(ed, Math.sqrt(segDist2(wx, wy, segA[0], segA[1], segB[0], segB[1]))); }
      const land = ed < sc * 0.27 + (fbm(X / 60, Y / 60, 8, 3) - 0.5) * sc * 0.18;
      const o = (j * lw + i) * 4;
      if (!land) { D[o + 3] = 0; continue; }
      const n = fbm(X / 40, Y / 40, 11, 3), C = cols[best], t = clamp(n * 1.6 - 0.2, 0, 0.999) * 3, kk = Math.floor(t), u = t - kk;
      const A = C[kk], B = C[Math.min(3, kk + 1)];
      const edge = Math.min(1, (Math.sqrt(bd2) - Math.sqrt(bd)) / 30);
      const dim = 0.86 + 0.14 * edge;
      D[o] = (A[0] + (B[0] - A[0]) * u) * dim; D[o + 1] = (A[1] + (B[1] - A[1]) * u) * dim; D[o + 2] = (A[2] + (B[2] - A[2]) * u) * dim; D[o + 3] = 255;
    }
    lx.putImageData(img, 0, 0);
    // 海岸：先畫一圈淺色沙灘
    const shore = Gfx.canvas(lw, lh), sx = shore.getContext('2d');
    sx.drawImage(lc, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#f2dca0'; sx.fillRect(0, 0, lw, lh);
    x.imageSmoothingEnabled = true;
    x.save(); x.shadowColor = 'rgba(0,30,60,.5)'; x.shadowBlur = 18; x.shadowOffsetY = 6;
    for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) x.drawImage(shore, ox * 2, oy * 2, lw * q, lh * q);
    x.restore();
    x.drawImage(lc, 0, 0, lw * q, lh * q);
    // 小路
    x.save();
    x.lineCap = 'round'; x.lineJoin = 'round';
    const curve = (a, b, i) => { const mx = (a[0] + b[0]) / 2 + (i % 2 ? 1 : -1) * (b[1] - a[1]) * 0.18, my = (a[1] + b[1]) / 2 + (i % 2 ? -1 : 1) * (b[0] - a[0]) * 0.18; return [mx, my]; };
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], [mx, my] = curve(a, b, i);
      x.strokeStyle = 'rgba(60,40,20,.35)'; x.lineWidth = 9; x.beginPath(); x.moveTo(a[0], a[1] + 2); x.quadraticCurveTo(mx, my + 2, b[0], b[1] + 2); x.stroke();
      x.strokeStyle = '#e8cf98'; x.lineWidth = 6; x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo(mx, my, b[0], b[1]); x.stroke();
      x.strokeStyle = '#a07a44'; x.lineWidth = 2; x.setLineDash([2, 7]); x.stroke(); x.setLineDash([]);
    }
    x.restore();
    // 每一區的裝飾物
    const u = Math.max(26, Math.min(44, sc * 0.075));
    const placed = [];
    themes.forEach((th, k) => {
      const [cx, cy] = pts[k], rr = mkRng(k * 31 + 5);
      for (let i = 0; i < 9; i++) {
        const an = rr() * TAU, dist = u * (1.3 + rr() * 1.6), px = cx + Math.cos(an) * dist, py = cy + Math.sin(an) * dist * 0.75;
        if (px < 10 || py < 20 || px > w - 10 || py > h - 6) continue;
        // 避開小路與其他節點
        let bad = false;
        for (let m = 0; m < pts.length; m++) { if ((pts[m][0] - px) ** 2 + (pts[m][1] - py) ** 2 < (u * 1.1) ** 2) bad = true; if (m < pts.length - 1 && segDist2(px, py, pts[m][0], pts[m][1], pts[m + 1][0], pts[m + 1][1]) < (u * 0.6) ** 2) bad = true; }
        if (bad) continue;
        placed.push([py, th, px, rr()]);
      }
    });
    placed.sort((a, b) => a[0] - b[0]);
    for (const [py, th, px, v] of placed) {
      const k = v < 0.7 ? ICON[th] : (th === 'volcano' || th === 'snow' || th === 'desert' ? 'rock' : th === 'night' ? 'dead' : 'bush');
      x.save(); x.translate(px, py); Terrain.propDraw(x, k, u * 0.9, v, th); x.restore();
    }
    // 火山與城堡
    const vi = themes.indexOf('volcano');
    if (vi >= 0) { const [vx, vy] = pts[vi]; volcano(x, vx + u * 1.4, vy - u * 0.5, u * 1.3); }
    const ni = themes.indexOf('night');
    if (ni >= 0) { const [nx, ny] = pts[ni]; x.save(); x.translate(nx + u * 1.4, ny + u * 0.5); Art.castle(x, u * 0.6, 'back'); x.restore(); }
    // 雲
    for (let i = 0; i < 4; i++) { const px = r() * w, py = r() * h * 0.9, cw = 90 + r() * 90; x.globalAlpha = 0.55; x.drawImage(Gfx.puff('#ffffff'), px - cw / 2, py - cw * 0.3, cw, cw * 0.6); x.globalAlpha = 1; }
    // 羅盤
    compass(x, w - 46, h - 46, 30);
    cache = { key, canvas: c, pts };
    return cache;
  }
  function volcano(x, cx, cy, u) {
    x.beginPath(); x.moveTo(cx - u, cy + u * 0.5); x.lineTo(cx - u * 0.25, cy - u * 0.5); x.lineTo(cx + u * 0.25, cy - u * 0.5); x.lineTo(cx + u, cy + u * 0.5); x.closePath();
    x.fillStyle = lgrad(x, cx - u, 0, cx + u, 0, ['#7a5a4a', '#5a4038', '#3a2824']); x.fill();
    x.fillStyle = '#ff7a2a'; x.beginPath(); x.ellipse(cx, cy - u * 0.5, u * 0.25, u * 0.08, 0, 0, TAU); x.fill();
    x.strokeStyle = '#ff9a3a'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx - u * 0.1, cy - u * 0.45); x.quadraticCurveTo(cx - u * 0.2, cy, cx - u * 0.35, cy + u * 0.3); x.stroke();
    for (let i = 0; i < 3; i++) circ(x, cx + (i - 1) * u * 0.15, cy - u * (0.75 + i * 0.2), u * (0.12 + i * 0.05), rgba('#6a5a58', 0.6));
  }
  function compass(x, cx, cy, r) {
    circ(x, cx, cy, r, 'rgba(250,240,210,.85)'); x.strokeStyle = '#8a5a22'; x.lineWidth = 2; x.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 - Math.PI / 2; x.fillStyle = i === 0 ? '#c8382e' : '#5a3a1e'; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85); x.lineTo(cx + Math.cos(a + 1.57) * r * 0.18, cy + Math.sin(a + 1.57) * r * 0.18); x.lineTo(cx + Math.cos(a - 1.57) * r * 0.18, cy + Math.sin(a - 1.57) * r * 0.18); x.closePath(); x.fill(); }
    x.fillStyle = '#5a3a1e'; x.font = '700 10px "Noto Sans TC",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('北', cx, cy - r - 8);
  }
  return { draw, positions };
})();

// ───────── 圖鑑 ─────────
const Codex = (() => {
  let tab = 'tower';
  const sel = {};
  function towerUnlocked(k) { return TOWERS[k].unlock <= Prog.cleared(); }
  function build() {
    const box = $('cxBody');
    for (const b of document.querySelectorAll('#cxTabs button')) b.classList.toggle('on', b.dataset.tab === tab);
    if (tab === 'ach') {
      box.innerHTML = ACHIEVEMENTS.map(a => { const t = Store.data.ach[a.id]; return `<div class="cx-card ach${t ? '' : ' locked'}"><i class="medal${t ? ' on' : ''}"></i><div class="cx-info"><b>${esc(a.name)}</b><p>${esc(a.desc)}</p>${t ? `<small class="bt" style="color:var(--mint)">${new Date(t).toLocaleDateString('zh-TW')} 達成</small>` : ''}</div></div>`; }).join('');
    } else if (tab === 'tower') {
      box.innerHTML = TOWER_ORDER.map(k => {
        const d = TOWERS[k], ok = towerUnlocked(k), v = sel[k] || 0;
        const tier = v < 3 ? v : 3, spec = v < 3 ? -1 : v - 3;
        const st = tier < 3 ? d.tiers[tier] : Object.assign({}, d.tiers[2], d.spec[spec]);
        const nm = !ok ? '？？？' : tier < 3 ? `${d.name} Lv${tier + 1}` : d.spec[spec].name;
        const desc = !ok ? `打贏第 ${d.unlock} 關之後解鎖。` : tier < 3 ? d.desc : d.spec[spec].desc;
        const chips = [0, 1, 2, 3, 4].map(i => `<button class="cx-chip${i === v ? ' on' : ''}" data-k="${k}" data-v="${i}" ${ok ? '' : 'disabled'}><img alt="" src="${Render.icon('tower', k, i < 3 ? i : 3, i < 3 ? undefined : i - 3, 72)}"></button>`).join('');
        const stats = !ok ? '' : statLine(k, st);
        return `<div class="cx-card${ok ? '' : ' locked'}"><div class="cx-art"><img alt="" src="${Render.icon('tower', k, tier, spec < 0 ? undefined : spec, 180)}"></div>
          <div class="cx-info"><b>${esc(nm)}</b><small>${d.en}</small><p>${esc(desc)}</p><div class="cx-stats">${stats}</div><div class="cx-chips">${chips}</div></div></div>`;
      }).join('');
    } else {
      const order = ['slime', 'runner', 'beetle', 'bat', 'golem', 'healer', 'shield', 'splitter', 'mini', 'ogre', 'gargoyle', 'skeleton', 'bossGolem', 'bossDragon', 'bossLich'];
      box.innerHTML = order.map(k => {
        const d = ENEMIES[k], ok = !!Store.data.seen[k];
        const stats = ok ? [['生命', d.hp], ['速度', d.spd], d.armor ? ['護甲', Math.round(d.armor * 100) + '%'] : null, d.mres ? ['抗魔', Math.round(d.mres * 100) + '%'] : null, ['金幣', d.bounty], d.lives > 1 ? ['扣命', d.lives] : null, d.fly ? ['飛行', ''] : null].filter(Boolean).map(([a, b]) => `<span>${a}${b !== '' ? ' <b>' + b + '</b>' : ''}</span>`).join('') : '';
        return `<div class="cx-card${ok ? '' : ' locked'}${d.boss ? ' boss' : ''}"><div class="cx-art"><img alt="" src="${Render.icon('enemy', k, 0, undefined, 160)}"></div>
          <div class="cx-info"><b>${ok ? esc(d.name) : '？？？'}</b>${d.boss ? '<small class="bt">頭目</small>' : ''}<p>${ok ? esc(d.desc || '分裂膠被打爆之後跑出來的小膠。') : '還沒遇見過。在戰場上遇到之後就會記錄下來。'}</p><div class="cx-stats">${stats}</div></div></div>`;
      }).join('');
    }
    const nA = ACHIEVEMENTS.filter(a => Store.data.ach[a.id]).length;
    const nT = TOWER_ORDER.filter(towerUnlocked).length, nE = Object.keys(ENEMIES).filter(k => Store.data.seen[k]).length;
    $('cxCount').textContent = tab === 'ach' ? `已達成 ${nA}/${ACHIEVEMENTS.length}` : tab === 'tower' ? `已解鎖 ${nT}/${TOWER_ORDER.length}` : `已遇見 ${nE}/${Object.keys(ENEMIES).length}`;
  }
  function statLine(k, st) {
    const out = [];
    if (st.dmg) out.push(['傷害', fmt(st.dmg) + (st.multi ? ' ×' + st.multi : '') + (st.missiles ? ' ×' + st.missiles : '')]);
    if (st.rate) out.push(['每秒', st.rate]);
    if (k !== 'mine') out.push([k === 'banner' ? '範圍' : '射程', st.range]);
    if (st.splash) out.push(['爆炸', st.splash]);
    if (st.slow) out.push(['減速', Math.round(st.slow * 100) + '%']);
    if (st.buffDmg) out.push(['加成', '+' + Math.round(st.buffDmg * 100) + '%']);
    if (st.gold) out.push(['每波', '+' + st.gold]);
    out.push(['花費', st.cost]);
    return out.map(([a, b]) => `<span>${a} <b>${b}</b></span>`).join('');
  }
  function open(back) {
    $('cxBack').onclick = () => { Snd.sfx('click'); if (back) back(); };
    build(); UI.show('ovCodex');
  }
  function init() {
    $('cxTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.tab; Snd.sfx('click'); build(); });
    $('cxBody').addEventListener('click', e => { const b = e.target.closest('.cx-chip'); if (!b || b.disabled) return; sel[b.dataset.k] = +b.dataset.v; Snd.sfx('click'); build(); });
  }
  return { open, init, build };
})();
