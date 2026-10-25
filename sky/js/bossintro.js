'use strict';
// 頭目登場演出：WARNING 警報畫面 → 頭目名牌（掃描剪影、類型、危險度）＋音樂重音
// 中頭目出現時的 CAUTION 小警示、頭目擊破的「目標擊破」字樣、分段血條

const BOSS_INFO = {
  boss1: { img: 'nb1', cls: '重型攻城履帶車', threat: 2, col: '#ffb43a' },
  boss2: { img: 'nb2', cls: '導彈巡洋要塞艦', threat: 3, col: '#5fc8ff' },
  boss3: { img: 'nb3', cls: '傾轉旋翼重攻擊機', threat: 3, col: '#ffcc33' },
  boss4: { img: 'nb4', cls: '機動電磁砲平台', threat: 3, col: '#ffa040' },
  boss5: { img: 'nb5', cls: '浮空天使要塞', threat: 4, col: '#ffe08a' },
  boss6: { img: 'nb6', cls: '六足冰甲機甲', threat: 4, col: '#7fe0ff' },
  boss7: { img: 'nb7', cls: '地心鑽掘母艦', threat: 4, col: '#ff7a2a' },
  boss8: { img: 'nb8', cls: '異星新月母艦', threat: 5, col: '#d080ff' },
  boss9: { img: 'k9body', cls: '生化機械頭足類', threat: 5, col: '#5ff0ff' },
  boss10: { img: 'b10', cls: '要塞動力核心', threat: 5, col: '#ff8a3a' },
};
const MID_INFO = { bomber: '重型轟炸機', heavy: '重裝砲艇', sub9: '深淵潛艇', guard10: '核心守衛' };

const BossIntro = {
  sil: Object.create(null),
  // 警報階段（由 runScript 呼叫）
  warnTick(dt) {
    const before = G.warnT; G.warnT += dt;
    if (before === 0 || (before < 1.1 && G.warnT >= 1.1)) Snd.play('siren');
    if (before < 2.3 && G.warnT >= 2.3) {
      const S = STAGES[G.stage];
      G.phase = 'boss'; G.boss = spawn(S.boss, 180, -150);
      G.intro = { t: 0, type: S.boss };
      Snd.play('sting'); G.shake = Math.max(G.shake, 6);
      const song = S.bossSong || 'boss';
      G.queue.push({ t: G.st + 1.5, fn: () => { if (G.phase === 'boss') Music.play(song); } });
    }
  },
  update(dt) {
    if (G.intro) { G.intro.t += dt; if (G.intro.t > 3.6) G.intro = null; }
    if (G.caution) { G.caution.t += dt; if (G.caution.t > 2.2) G.caution = null; }
  },
  // 頭目剪影（藍圖風格），快取
  silhouette(type) {
    const info = BOSS_INFO[type] || {}, key = type + (Bake.ready ? 'b' : '');
    if (this.sil[key]) return this.sil[key];
    const src = Art.get(info.img && Bake.has(info.img) ? info.img : (Bake.has(type) ? type : info.img || type));
    const S = 3, bw = 92, bh = 64, c = document.createElement('canvas'); c.width = bw * S; c.height = bh * S;
    const g = c.getContext('2d');
    if (src) {
      const k = Math.min(bw / src.lw, bh / src.lh) * 0.96, w = src.lw * k * S, h = src.lh * k * S;
      g.drawImage(src, (c.width - w) / 2, (c.height - h) / 2, w, h);
      g.globalCompositeOperation = 'source-atop';
      const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, 'rgba(150,235,255,.95)'); gr.addColorStop(1, 'rgba(40,150,230,.9)');
      g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = 'rgba(0,30,60,.35)';
      for (let y = 0; y < c.height; y += 3 * S) g.fillRect(0, y, c.width, S);
      g.globalCompositeOperation = 'source-over';
    }
    c.lw = bw; c.lh = bh;
    if (Bake.ready) this.sil[key] = c;
    return c;
  },
  // ---------- 畫面 ----------
  drawWarn(c) {
    const t = G.warnT, a = Math.min(1, t / 0.3) * (t > 2.0 ? Math.max(0, 1 - (t - 2.0) / 0.3) : 1);
    if (a <= 0) return;
    c.save();
    // 紅色暗角脈動
    const pulse = 0.5 + 0.5 * Math.sin(t * 9);
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.72);
    vg.addColorStop(0, 'rgba(120,0,0,0)'); vg.addColorStop(1, `rgba(200,10,10,${(0.35 + pulse * 0.3) * a})`);
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    c.fillStyle = `rgba(30,0,0,${0.28 * a})`; c.fillRect(0, 0, W, H);
    // 掃描線
    c.fillStyle = `rgba(255,40,40,${0.05 * a})`;
    for (let y = (t * 120) % 4; y < H; y += 4) c.fillRect(0, y, W, 1);
    // 警示膠帶（從兩側滑進來）
    const slide = 1 - Math.pow(1 - Math.min(1, t / 0.35), 3);
    const tape = (y, dir) => {
      c.save(); c.translate((1 - slide) * W * dir, y);
      c.fillStyle = `rgba(20,10,0,${0.85 * a})`; c.fillRect(-20, -11, W + 40, 22);
      c.beginPath(); c.rect(-20, -9, W + 40, 18); c.clip();
      c.fillStyle = `rgba(255,200,0,${a})`;
      const off = (t * 70 * dir) % 24;
      for (let x = -48 + off; x < W + 48; x += 24) { c.beginPath(); c.moveTo(x, -9); c.lineTo(x + 12, -9); c.lineTo(x + 2, 9); c.lineTo(x - 10, 9); c.fill(); }
      c.restore();
    };
    tape(222, -1); tape(392, 1);
    // 中央面板
    c.globalAlpha = a;
    c.fillStyle = 'rgba(40,0,0,.62)'; c.fillRect(0, 236, W, 142);
    c.strokeStyle = 'rgba(255,70,50,.7)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 240.5); c.lineTo(W, 240.5); c.moveTo(0, 373.5); c.lineTo(W, 373.5); c.stroke();
    // 跑馬燈小字
    c.font = '400 8px Silkscreen,monospace'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,120,100,.75)';
    const msg = 'ALERT · HUGE ENERGY SIGNATURE · ', mw = c.measureText(msg).width;
    for (let x = -((t * 60) % mw); x < W; x += mw) { c.fillText(msg, x, 250); c.fillText(msg, W - x - mw, 364); }
    // WARNING（紅藍錯位閃爍）
    const on = Math.floor(t * 5) % 3 !== 2, jx = (Math.random() - 0.5) * (t < 0.6 ? 6 : 1.5);
    c.textAlign = 'center'; c.font = '700 40px Silkscreen,monospace';
    if (on) {
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = 'rgba(0,200,255,.55)'; c.fillText('WARNING', W / 2 - 2 + jx, 290);
      c.fillStyle = 'rgba(255,30,30,.9)'; c.fillText('WARNING', W / 2 + 2 + jx, 290);
      c.globalCompositeOperation = 'source-over';
      c.lineWidth = 1; c.strokeStyle = 'rgba(255,230,220,.9)'; c.strokeText('WARNING', W / 2 + jx, 290);
    }
    // 三角警示圖示
    for (const s of [-1, 1]) {
      const x = W / 2 + s * 150, y = 290;
      c.fillStyle = on ? '#ffcc00' : 'rgba(255,204,0,.35)';
      c.beginPath(); c.moveTo(x, y - 13); c.lineTo(x + 13, y + 10); c.lineTo(x - 13, y + 10); c.closePath(); c.fill();
      c.fillStyle = '#2a0a00'; c.font = '900 14px ' + CJK; c.fillText('!', x, y + 3);
    }
    c.font = '700 14px ' + CJK; c.fillStyle = '#fff';
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.6)';
    const sub = '巨大能量反應接近中';
    c.strokeText(sub, W / 2, 326); c.fillText(sub, W / 2, 326);
    c.font = '400 9px Silkscreen,monospace'; c.fillStyle = '#ffb0a0';
    c.fillText('STAGE ' + (G.stage + 1) + ' · BOSS APPROACHING', W / 2, 346);
    c.restore();
  },
  drawPlate(c) {
    const I = G.intro; if (!I) return;
    const t = I.t, T = ET[I.type], info = BOSS_INFO[I.type] || {}, col = info.col || '#ffcc33';
    const inK = 1 - Math.pow(1 - Math.min(1, t / 0.45), 3), outK = t > 3.0 ? Math.min(1, (t - 3.0) / 0.5) : 0;
    // 電影黑邊
    const bar = 30 * (t < 3.0 ? inK : 1 - outK);
    if (bar > 0.5) { c.fillStyle = '#000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar); }
    const x0 = (1 - inK) * -W + outK * W, y0 = 404;
    c.save(); c.translate(x0, y0);
    // 斜角面板
    const pw = 334, ph = 98, px = (W - pw) / 2;
    c.beginPath(); c.moveTo(px + 14, 0); c.lineTo(px + pw, 0); c.lineTo(px + pw - 14, ph); c.lineTo(px, ph); c.closePath();
    const pg = c.createLinearGradient(px, 0, px + pw, 0); pg.addColorStop(0, 'rgba(6,12,24,.92)'); pg.addColorStop(1, 'rgba(10,20,36,.82)');
    c.fillStyle = pg; c.fill();
    c.strokeStyle = col; c.globalAlpha = 0.8; c.lineWidth = 1.2; c.stroke(); c.globalAlpha = 1;
    c.fillStyle = col; c.fillRect(px + 14, -3, 64, 3); c.fillRect(px + pw - 92, ph, 78, 3);
    // 剪影框
    const sx = px + 14, sy = 14, sw = 96, sh = 70;
    c.fillStyle = 'rgba(20,60,90,.45)'; c.fillRect(sx, sy, sw, sh);
    c.strokeStyle = 'rgba(120,220,255,.25)'; c.lineWidth = 0.5;
    for (let gx = sx; gx <= sx + sw; gx += 12) { c.beginPath(); c.moveTo(gx + 0.5, sy); c.lineTo(gx + 0.5, sy + sh); c.stroke(); }
    for (let gy = sy; gy <= sy + sh; gy += 12) { c.beginPath(); c.moveTo(sx, gy + 0.5); c.lineTo(sx + sw, gy + 0.5); c.stroke(); }
    const sil = this.silhouette(I.type);
    c.globalAlpha = Math.min(1, t * 2.5) * (0.85 + Math.random() * 0.15);
    c.drawImage(sil, sx + 2, sy + 3, sw - 4, sh - 6);
    c.globalAlpha = 1;
    const scan = sy + ((t * 70) % sh);
    c.fillStyle = 'rgba(160,240,255,.55)'; c.fillRect(sx, scan, sw, 1.2);
    c.strokeStyle = 'rgba(160,240,255,.8)'; c.lineWidth = 1.2;
    for (const [cx, cy, dx, dy] of [[sx, sy, 1, 1], [sx + sw, sy, -1, 1], [sx, sy + sh, 1, -1], [sx + sw, sy + sh, -1, -1]]) { c.beginPath(); c.moveTo(cx + dx * 8, cy); c.lineTo(cx, cy); c.lineTo(cx, cy + dy * 8); c.stroke(); }
    // 文字
    const tx = sx + sw + 12;
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = '400 8px Silkscreen,monospace'; c.fillStyle = col;
    c.fillText('STAGE ' + (G.stage + 1) + (G.round > 1 ? '-' + G.round : '') + ' · BOSS', tx, 16);
    const name = T.name, nShow = Math.min(name.length, Math.floor(Math.max(0, t - 0.25) * 14));
    c.font = '900 27px ' + "'Noto Serif TC','Songti TC',serif";
    c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.7)';
    const nm = name.slice(0, nShow);
    c.strokeText(nm, tx, 40);
    const ng = c.createLinearGradient(0, 28, 0, 52); ng.addColorStop(0, '#ffffff'); ng.addColorStop(1, col);
    c.fillStyle = ng; c.fillText(nm, tx, 40);
    c.font = '400 9px Silkscreen,monospace'; c.fillStyle = 'rgba(200,225,255,.85)';
    if (t > 0.6) c.fillText(T.en || '', tx, 60);
    if (t > 0.8) {
      c.font = '500 10.5px ' + CJK; c.fillStyle = '#cfe0f2';
      c.fillText('類型　' + (info.cls || '未知'), tx, 75);
      c.fillText('危險度', tx, 89);
      const n = info.threat || 3;
      for (let i = 0; i < 5; i++) {
        const lit = i < n && t > 0.9 + i * 0.12;
        c.fillStyle = lit ? (n >= 5 ? '#ff4a4a' : col) : 'rgba(255,255,255,.15)';
        c.beginPath(); c.moveTo(tx + 40 + i * 13, 84); c.lineTo(tx + 49 + i * 13, 84); c.lineTo(tx + 46 + i * 13, 94); c.lineTo(tx + 37 + i * 13, 94); c.closePath(); c.fill();
      }
    }
    c.restore();
  },
  drawCaution(c) {
    const C = G.caution; if (!C) return;
    const t = C.t, a = t < 0.2 ? t / 0.2 : t > 1.8 ? Math.max(0, (2.2 - t) / 0.4) : 1;
    c.save(); c.globalAlpha = a;
    const y = 96;
    c.fillStyle = 'rgba(40,24,0,.7)'; c.fillRect(0, y - 14, W, 28);
    c.fillStyle = '#ffcc00';
    const off = (t * 50) % 16;
    for (let x = -32 + off; x < W + 16; x += 16) { c.fillRect(x, y - 14, 8, 3); c.fillRect(x + 8, y + 11, 8, 3); }
    const on = Math.floor(t * 6) % 2 === 0;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 13px Silkscreen,monospace'; c.fillStyle = on ? '#ffcc33' : '#ff8a2a';
    c.fillText('CAUTION', W / 2 - 64, y + 1);
    c.font = '700 12px ' + CJK; c.fillStyle = '#fff';
    c.fillText('大型敵機：' + C.name, W / 2 + 40, y + 1);
    c.restore();
  },
  drawDown(c) {
    if (G.phase !== 'down') return;
    const t = G.downT; if (t < 2.5) return;
    const k = Math.min(1, (t - 2.5) / 0.18), a = t > 3.4 ? Math.max(0, 1 - (t - 3.4) / 0.2) : 1;
    c.save(); c.globalAlpha = a; c.translate(W / 2, 300); c.rotate(-0.08); c.scale(2 - k, 2 - k);
    c.strokeStyle = '#ffd23f'; c.lineWidth = 3; c.strokeRect(-110, -26, 220, 52);
    c.lineWidth = 1; c.strokeRect(-104, -20, 208, 40);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 26px ' + "'Noto Serif TC',serif"; c.fillStyle = '#ffe9a8'; c.lineWidth = 4; c.strokeStyle = 'rgba(60,20,0,.8)';
    c.strokeText('目標擊破', 0, -3); c.fillText('目標擊破', 0, -3);
    c.font = '400 8px Silkscreen,monospace'; c.fillStyle = '#ffd23f'; c.fillText('TARGET DESTROYED', 0, 15);
    c.restore();
  },
  // 頭目血條：分段＋階段刻度
  drawBar(c) {
    const b = G.boss;
    if (!b || b.dead) return;
    const T = ET[b.type], info = BOSS_INFO[b.type] || {}, col = info.col || '#ffcc33';
    const f = b.inv ? Math.min(1, b.t / 2) : Math.max(0, b.hp / b.maxhp);
    b.barShow = b.barShow === undefined ? f : b.barShow + (f - b.barShow) * 0.08;
    const x = 20, y = 31, w = W - 72, h = 6;
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 2, y - 2, w + 4, h + 4);
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x, y, w * Math.max(f, b.barShow), h);
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, f < 0.34 ? '#ff3a3a' : f < 0.5 ? '#ff7a2a' : col); g.addColorStop(1, f < 0.34 ? '#ff8a6a' : '#fff3b0');
    c.fillStyle = g; c.fillRect(x, y, w * f, h);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x, y, w * f, 1.5);
    c.fillStyle = 'rgba(0,0,0,.55)';
    for (let i = 1; i < 20; i++) c.fillRect(x + w * i / 20, y, 1, h);
    for (const m of T.marks || [0.5]) { c.fillStyle = '#fff'; c.fillRect(x + w * m - 1, y - 3, 2, h + 6); }
    txt(c, 'BOSS', x, y + 14, 8, col, 'left');
    txt(c, T.name, x + 34, y + 14, 10, '#fff', 'left', CJK, 700);
    txt(c, Math.ceil(f * 100) + '%', x + w, y + 14, 8, f < 0.34 ? '#ff6a5a' : '#dfe8f2', 'right');
  },
};

// 中頭目出現時顯示 CAUTION
spawn = (function (base) {
  return function (type, x, y, o) {
    const e = base(type, x, y, o);
    if (MID_INFO[type] && G.phase === 'fight' && G.state === 'play') G.caution = { t: 0, name: MID_INFO[type] };
    return e;
  };
})(spawn);
ET.boss8.marks = [0.66, 0.33];
