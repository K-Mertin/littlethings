'use strict';
// 夜市小吃王：畫面（天空、街景、店面、人物、燈光、天氣、特效）
const NB_SHOPS = ['阿婆鐵蛋', '老牌甘蔗汁', '正宗鹽酥雞', '彈珠汽水', '古早味粉圓', '臭豆腐王', '嘉義雞肉飯', '手工麻糬', '烤玉米專賣', '八寶冰', '滷味大王', '麻辣燙', '豆花伯', '蚵嗲', '當歸鴨', '青草茶'];
const NB_VSIGN = ['藥局', '鐘錶', '冰店', '茶行', '旅社', '眼鏡', '麵館', '金飾', '書局', '牛排', '早餐', '果汁'];
// 不同地點的鄰居店名、直式招牌、牆壁顏色
const NB_MAP = {
  harbor: { shops: ['鮮蚵專賣', '旗魚黑輪', '烤小卷', '虱目魚粥', '海產熱炒', '魚丸湯', '蝦捲大王', '花枝羹', '現撈海鮮', '鹹水雞', '鯊魚煙', '漁港冰店'], v: ['漁具', '冰廠', '魚市', '船行', '民宿', '海產'], walls: ['#b8c8d4', '#d8d4c8', '#a8b8c8', '#c8d0c4', '#e0dcd0', '#9ab0c0'] },
  mountain: { shops: ['高山茶', '竹筒飯', '山豬肉香腸', '苦茶油', '愛玉冰', '紅糟肉圓', '芋圓老店', '山產小炒', '烤香菇', '桂花釀', '溫泉蛋', '梅子專賣'], v: ['茶行', '民宿', '藥草', '登山', '木雕', '茶屋'], walls: ['#a8845a', '#b89870', '#9a7a52', '#c0a07a', '#8a6a4a', '#b08a62'] },
  temple: { shops: ['廟口米糕', '杏仁茶', '糖葫蘆', '碗粿', '麻糬伯', '鹹粥', '香燭金紙', '祈福平安糕', '紅龜粿', '筒仔米糕', '廟口肉羹', '麵茶'], v: ['香舖', '神像', '金紙', '佛具', '餅行', '祭品'], walls: ['#d8a090', '#e0b8a0', '#c89080', '#e8c8a8', '#d0a088', '#c8a898'] },
};
const NB_STALL = [['fryer', '臭'], ['grill', '香'], ['drink', '甘'], ['soup', '滷'], ['ice', '冰'], ['steam', '包'], ['griddle', '餅'], ['wok', '炒']];
const R = {
  cv: null, g: null, dpr: 1, W: 0, H: 0, z: 2, cam: { x: 0, y: 0 }, zoomMul: 1, pan: { x: 0, y: 0 }, top: 56, bottom: 64, left: 0, right: 0, t: 0,
  hover: null, ghost: null, fw: [], wx: [], fwT: 0, flashA: 0,
  init(cv) {
    this.cv = cv; this.g = cv.getContext('2d');
    this.lc = $('#lt'); this.bc = $('#bl'); this.fc = $('#fxc'); this.fg = this.fc.getContext('2d');
    // 字型載入後，文字貼圖要重畫
    try { document.fonts.ready.then(() => { this._tc = null; }); document.fonts.addEventListener('loadingdone', () => { this._tc = null; }); } catch (e) { }
  },
  // 畫質：0 高（dpr 最多 2）、1 中（1.5、少一點粒子）、2 低（1、關掉光暈層和路人影子）
  q: 0, DPRQ: [2, 1.5, 1],
  resize() {
    const dpr = this.dpr = Math.min(window.devicePixelRatio || 1, this.DPRQ[this.q]);
    this.W = innerWidth; this.H = innerHeight;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
    this.fc.width = this.cv.width; this.fc.height = this.cv.height; this.fc.style.width = this.W + 'px'; this.fc.style.height = this.H + 'px';
    this.wx = []; this._skyKey = ''; this._tc = null;
    this.bc.style.display = this.q >= 2 ? 'none' : '';
  },
  setQ(q) { q = clamp(q | 0, 0, 2); if (q === this.q) return; this.q = q; this.resize(); },
  // 自動畫質：連續兩段（各 2 秒）平均每格超過 26ms 就降一級
  perfTick(dt) {
    if (Prefs.d.q !== undefined && Prefs.d.q !== 'auto') { if (this.q !== +Prefs.d.q) this.setQ(+Prefs.d.q); return; }
    const p = this._pf || (this._pf = { t: 0, n: 0, bad: 0, skip: 1 });
    if (document.hidden || dt > 0.5 || Main.state !== 'play' || UI.modal) { p.t = 0; p.n = 0; p.skip = 1; return; }
    p.t += dt; p.n++;
    if (p.t < 2) return;
    const avg = p.t / p.n * 1000; p.t = 0; p.n = 0;
    if (p.skip) { p.skip = 0; return; }
    if (avg > 26 && this.q < 2) { if (++p.bad >= 2) { p.bad = 0; this.setQ(this.q + 1); p.skip = 1; } }
    else p.bad = 0;
  },
  // 文字貼圖：每段字依目前縮放畫一次就快取（fillText 很貴，每格畫好幾十次會拖慢手機）
  txt(g, t, x, y, s, col, wt = 900, out = null, sc = 1) {
    const z = this.z;
    let m = this._tc; if (!m || this._tcz !== z) { m = this._tc = new Map(); this._tcz = z; }
    const key = t + '|' + s + col + wt + (out || '');
    let c = m.get(key);
    if (!c) {
      const px = s * z, pad = Math.ceil(px * 0.2) + (out ? Math.ceil(z) : 0);
      const font = `${wt} ${px}px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif`;
      const mc = this._mc || (this._mc = document.createElement('canvas').getContext('2d'));
      mc.font = font;
      c = document.createElement('canvas'); c.width = Math.ceil(mc.measureText(t).width) + pad * 2; c.height = Math.ceil(px * 1.25) + pad * 2;
      const q = c.getContext('2d'); q.font = font; q.textAlign = 'center'; q.textBaseline = 'middle';
      const cx = c.width / 2, cy = c.height / 2 + px * 0.04;
      if (out) { q.fillStyle = out; const o = Math.max(1, z * 0.6); for (const [ox, oy] of [[-o, 0], [o, 0], [0, -o], [0, o], [o, o], [-o, o]]) q.fillText(t, cx + ox, cy + oy); }
      q.fillStyle = col; q.fillText(t, cx, cy);
      if (m.size > 600) m.clear();
      m.set(key, c);
    }
    const w = c.width / z * sc, h = c.height / z * sc;
    g.drawImage(c, x - w / 2, y - h / 2, w, h);
    return c.width / z;
  },
  bounds() {
    const S = Game.S, m = this.W < this.H ? 0.6 : 1.5, short = this.H < 520;
    return { x0: -m * TILE, x1: (S.W + m) * TILE, y0: -(this.fh() + (short ? 10 : 22)), y1: (S.H + (short ? 2.2 : 3)) * TILE + 2 };
  },
  fitZ() {
    const b = this.bounds(), aw = this.W - this.left - this.right - 12, ah = this.H - this.top - this.bottom - 8;
    return Math.max(1, Math.min(aw / (b.x1 - b.x0), ah / (b.y1 - b.y0)));
  },
  updateCam() {
    const b = this.bounds(), fz = this.fitZ();
    let z = fz * this.zoomMul * this.dpr;
    z = z >= 4 ? Math.floor(z) : Math.max(1, Math.floor(z * 2) / 2);
    this.z = z;
    const vw = (this.W - this.left - this.right) * this.dpr / z, vh = (this.H - this.top - this.bottom) * this.dpr / z;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const ww = b.x1 - b.x0, wh = b.y1 - b.y0;
    const mx = Math.max(0, (ww - vw) / 2 + 20), my = Math.max(0, (wh - vh) / 2 + 20);
    this.pan.x = clamp(this.pan.x, -mx, mx); this.pan.y = clamp(this.pan.y, -my, my);
    this.cam.x = cx + this.pan.x - vw / 2 - this.left * this.dpr / z;
    this.cam.y = cy + this.pan.y - vh / 2 - this.top * this.dpr / z;
    this.cam.x = Math.round(this.cam.x * z) / z; this.cam.y = Math.round(this.cam.y * z) / z;
  },
  toWorld(sx, sy) { return [sx * this.dpr / this.z + this.cam.x, sy * this.dpr / this.z + this.cam.y]; },
  toScreen(wx, wy) { return [(wx - this.cam.x) * this.z / this.dpr, (wy - this.cam.y) * this.z / this.dpr]; },
  night() { const p = Game.S.t / WEEK_LEN; return 0.5 - 0.5 * Math.cos(Math.min(1, p * 1.25) * Math.PI); },
  fh() { return [44, 48, 54, 58, 62, 66][Game.S.lv]; },
  weather() {
    const S = Game.S;
    if (S.ev.some(e => e.n === '颱風')) return 'storm';
    if (S.ev.some(e => e.n === '下雨')) return 'rain';
    if (S.ev.some(e => e.n === '寒流')) return 'snow';
    const f = FESTIVALS[Game.month()];
    return f && f.fx || '';
  },

  draw(dt) {
    this.t += dt;
    const g = this.g, S = Game.S;
    if (!S) return;
    this.updateCam();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, this.cv.width, this.cv.height);
    this.lightsList = [];
    this.sky(g);
    g.setTransform(this.z, 0, 0, this.z, -this.cam.x * this.z, -this.cam.y * this.z);
    this.skyline(g);
    this.street(g);
    this.facade(g);
    this.floor(g);
    if (UI.mode === 'build' || UI.mode === 'move') this.gridLines(g);
    this.objects(g);
    this.weatherFx(g, dt);
    this.lighting(g);
    // 特效、泡泡畫在最上面一層（不會被夜晚調暗）
    const f = this.fg;
    f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, this.fc.width, this.fc.height);
    f.imageSmoothingEnabled = false; f.globalAlpha = 1;
    f.setTransform(this.z, 0, 0, this.z, -this.cam.x * this.z, -this.cam.y * this.z);
    this.effects(f);
    this.bubbles(f);
    f.save(); f.setTransform(1, 0, 0, 1, 0, 0); this.fireworks(f, dt); f.restore();
    if (UI.mode === 'build') { const ht = Guide.tile(); if (ht) this.hintTile(f, ht); }
    if (UI.mode === 'build' || UI.mode === 'move') this.ghostDraw(f);
    // 發現組合等等的閃光
    if (Game.flash) { this.flashA = Math.max(this.flashA, Game.flash); Game.flash = 0; }
    if (this.flashA > 0) {
      f.setTransform(1, 0, 0, 1, 0, 0);
      f.fillStyle = `rgba(255,248,210,${this.flashA * 0.45})`; f.fillRect(0, 0, this.fc.width, this.fc.height);
      this.flashA = Math.max(0, this.flashA - dt * 2.2);
    }
  },

  // ---------- 天空 ----------
  sky(g) {
    const n = this.night(), wt = this.weather(), gray = wt === 'rain' || wt === 'storm' ? 0.55 : 0;
    let top = mixHex('#4a4a9a', '#0b0d2a', n), mid = mixHex('#e07a7a', '#221c50', n), bot = mixHex('#ffc070', '#4a2c5c', n);
    if (gray) { top = mixHex(top, '#2a2c3a', gray); mid = mixHex(mid, '#3a3c4a', gray); bot = mixHex(bot, '#4a4a58', gray); }
    // 天空漸層交給 CSS 背景（省下每一格的全畫面填色）
    const sk = top + mid + bot;
    if (sk !== this._skyKey) { this._skyKey = sk; this.cv.style.background = `linear-gradient(${top},${mid} 33%,${bot} 60%,${bot})`; }
    if (n > 0.3 && !gray) {
      const s = Math.max(1, Math.round(this.dpr));
      g.fillStyle = '#ffffe6';
      for (let i = 0, ns = this.q ? 40 : 70; i < ns; i++) {
        const x = hash(i, 1, 5) * this.cv.width, y = hash(i, 2, 5) * this.cv.height * 0.4, tw = Math.sin(this.t * (1 + hash(i, 3, 5) * 2) + i);
        g.globalAlpha = Math.max(0, (n - 0.3) * (0.6 + tw * 0.4));
        g.fillRect(x | 0, y | 0, s * (i % 9 === 0 ? 2 : 1), s * (i % 9 === 0 ? 2 : 1));
      }
      g.globalAlpha = 1;
      // 月亮（中秋是大大的滿月）
      const full = Game.month() === 9, mx = this.cv.width * 0.84, my = this.cv.height * 0.11, r = (full ? 22 : 12) * this.dpr;
      const hg = g.createRadialGradient(mx, my, r * 0.5, mx, my, r * 3);
      hg.addColorStop(0, `rgba(255,240,200,${0.25 * n})`); hg.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = hg; g.fillRect(mx - r * 3, my - r * 3, r * 6, r * 6);
      g.fillStyle = `rgba(255,246,210,${n})`; g.beginPath(); g.arc(mx, my, r, 0, TAU); g.fill();
      if (!full) { g.fillStyle = top; g.beginPath(); g.arc(mx + r * 0.45, my - r * 0.2, r * 0.85, 0, TAU); g.fill(); }
      else { g.fillStyle = `rgba(230,214,170,${n * 0.6})`; g.beginPath(); g.arc(mx - r * 0.3, my + r * 0.1, r * 0.25, 0, TAU); g.arc(mx + r * 0.3, my - r * 0.3, r * 0.15, 0, TAU); g.fill(); }
    }
  },
  // 背後的大樓（快取）
  skyline(g) {
    const S = Game.S, x0 = -24 * TILE, x1 = (S.W + 24) * TILE, n = Math.round(this.night() * 6) / 6, MP = S.map || 'city';
    const key = S.W + ':' + n + ':' + MP;
    if (MP !== 'city') { if (!this._sky || this._sky.key !== key) this._sky = { key, c: this.mapSky(MP, x0, x1, n, this._sky?.c) }; g.drawImage(this._sky.c, x0, -150 - 40); this.skyAnim(g, MP, x0, x1, n); return; }
    if (!this._sky || this._sky.key !== key) {
      const c = this._sky?.c || document.createElement('canvas');
      c.width = x1 - x0; c.height = 150;
      const q = c.getContext('2d'); q.clearRect(0, 0, c.width, c.height);
      // 遠景
      for (let i = 0, x = 0; x < c.width; i++) {
        const w = 26 + ((hash(i, 9, 7) * 4) | 0) * 10, h = 70 + ((hash(i, 8, 7) * 5) | 0) * 12;
        q.fillStyle = mixHex('#6a6090', '#1c1a3c', n); q.fillRect(x, 150 - h, w, h);
        x += w - 4;
      }
      for (let i = 0, x = 0; x < c.width; i++) {
        const w = 22 + ((hash(i, 1, 7) * 4) | 0) * 8, h = 40 + ((hash(i, 2, 7) * 6) | 0) * 11;
        const col = mixHex(['#7a6a90', '#6a7090', '#806a80'][i % 3], '#24203f', n);
        q.fillStyle = col; q.fillRect(x, 150 - h, w, h);
        q.fillStyle = shade(col, 0.12); q.fillRect(x, 150 - h, w, 2);
        // 屋頂水塔、天線
        if (hash(i, 3, 7) < 0.45) { q.fillStyle = shade(col, -0.25); q.fillRect(x + 4, 150 - h - 6, 7, 6); q.fillRect(x + 5, 150 - h - 8, 5, 2); }
        if (hash(i, 4, 7) < 0.3) { q.fillStyle = shade(col, -0.3); q.fillRect(x + w - 5, 150 - h - 12, 1, 12); q.fillRect(x + w - 8, 150 - h - 9, 7, 1); }
        for (let wy = 150 - h + 6; wy < 140; wy += 7) for (let wx = x + 3; wx < x + w - 4; wx += 5) {
          const hv = hash(wx, wy, 9);
          if (hv < 0.45 * (0.4 + n)) { q.fillStyle = n > 0.35 ? (hv < 0.1 ? '#ffb070' : hv < 0.2 ? '#bfe0ff' : '#ffe08a') : '#a8b0c8'; q.fillRect(wx, wy, 3, 4); }
          else { q.fillStyle = shade(col, -0.18); q.fillRect(wx, wy, 3, 4); }
        }
        x += w + 1;
      }
      this._sky = { key, c };
    }
    g.drawImage(this._sky.c, x0, -150 - 40);
  },
  // 其他地點的背景（快取）：海港＝海和燈塔、山城＝山脊和纜車、廟會＝大廟和摩天輪
  //   畫布底部在世界座標 y = -40，自己店面的上方（x 在 0～W 之間、y -150～-60）是最看得到的地方
  mapSky(MP, x0, x1, n, c) {
    c = c || document.createElement('canvas');
    c.width = x1 - x0; c.height = 150;
    const q = c.getContext('2d'); q.clearRect(0, 0, c.width, c.height);
    const S = Game.S, R2 = (x, y, w, h, col) => { q.fillStyle = col; q.fillRect(x, y, w, h); }, Wc = c.width, sx = -x0, sw = S.W * TILE, cx = sx + sw / 2;
    const dk = col => mixHex(col, '#1a1838', n * 0.45);
    if (MP === 'harbor') {
      for (let x = 0; x < Wc; x++) { const h = 10 + Math.sin(x / 37) * 5 + Math.sin(x / 11) * 2; R2(x, 98 - h, 1, h, dk('#6a7aa8')); }
      for (let y = 98; y < 150; y++) R2(0, y, Wc, 1, dk(mixHex('#5a8ac8', '#2a4a80', (y - 98) / 52)));
      for (let i = 0; i < Wc / 5; i++) R2((hash(i, 5, 81) * Wc) | 0, 100 + ((hash(i, 6, 81) * 48) | 0), 4 + ((hash(i, 7, 81) * 6) | 0), 1, n > 0.4 ? 'rgba(170,200,255,.4)' : 'rgba(230,245,255,.55)');
      // 防波堤和燈塔（在店的右後方）
      const lx = sx + sw - 18;
      R2(lx - 34, 95, 70, 5, dk('#7a7a8a')); R2(lx - 34, 95, 70, 1, dk('#9a9aaa'));
      for (let y = 46; y < 95; y++) { const w = 8 + ((y - 46) / 49 * 6 | 0); R2(lx - w / 2 | 0, y, w, 1, ((y - 46) >> 3) & 1 ? dk('#f4f0e8') : dk('#d8302a')); }
      R2(lx - 6, 38, 12, 8, '#2a3048'); R2(lx - 4, 39, 8, 6, n > 0.3 ? '#fff6b0' : '#d8e8f0'); R2(lx - 6, 35, 12, 3, dk('#c8302a')); R2(lx - 2, 32, 4, 3, dk('#3a3a44'));
      for (const { bx, by, col, L } of this.skyPts('harbor', x0)) {
        R2(bx, by, L, 4, dk(col)); R2(bx + 2, by + 4, L - 4, 2, dk(shade(col, -0.45))); R2(bx + L * 0.4 | 0, by - 7, 9, 7, dk('#f4f0e8')); R2(bx + L * 0.4 + 2 | 0, by - 5, 5, 3, n > 0.3 ? '#fff0a0' : '#6a8aa8');
        R2(bx + L * 0.25 | 0, by - 16, 1, 16, dk('#c8c8d0')); if (n > 0.3) for (let k = 0; k < 4; k++) R2(bx + 2 + k * (L / 4 | 0), by - 2, 2, 2, ['#ff6a4a', '#ffe070', '#7affb0', '#ffe070'][k]);
        if (n > 0.3) R2(bx + 2, by + 7, L - 4, 1, 'rgba(255,230,150,.35)');
      }
    } else if (MP === 'mountain') {
      const ridge = (base, amp, f, col, ph) => { for (let x = 0; x < Wc; x++) { const h = amp * (0.55 + 0.45 * Math.sin((x - cx) / f + ph)) + Math.abs(Math.sin((x - cx) / (f * 0.41) + ph * 2)) * amp * 0.4; R2(x, base - h, 1, 150 - base + h, dk(col)); } };
      ridge(96, 64, 52, '#7a88b8', 1.2); ridge(112, 40, 30, '#4f7480', 2.4);
      for (let i = 0; i < 3; i++) R2(0, 84 + i * 10, Wc, 5, `rgba(235,240,255,${0.2 - i * 0.05})`);
      // 山頂的寶塔（店的左後方）
      const px = sx + sw * 0.22;
      R2(px - 5, 20, 10, 32, dk('#6a4a4a')); for (let k = 0; k < 3; k++) { R2(px - 11 + k * 2, 17 + k * 11, 22 - k * 4, 3, dk('#2a3a3a')); R2(px - 2, 22 + k * 10, 4, 4, n > 0.3 ? '#ffd890' : dk('#9a7a6a')); }
      R2(px - 1, 11, 2, 6, dk('#ffd040'));
      for (let i = 0; i < Wc / 8; i++) { const tx = (hash(i, 4, 91) * Wc) | 0, ty = 104 + ((hash(i, 5, 91) * 40) | 0), col = dk(hash(i, 6, 91) < 0.5 ? '#2f6a44' : '#3a7a4a'); R2(tx + 3, ty - 12, 2, 3, col); R2(tx + 2, ty - 9, 4, 4, col); R2(tx + 1, ty - 5, 6, 4, col); R2(tx, ty - 1, 8, 3, col); R2(tx + 3, ty + 2, 2, 3, dk('#4a3020')); }
      for (const { bx: hx, by: hy } of this.skyPts('mountain', x0)) { R2(hx, hy, 7, 5, dk('#7a5a44')); R2(hx - 1, hy - 2, 9, 2, dk('#2a2a34')); if (n > 0.3) R2(hx + 2, hy + 1, 3, 2, '#ffd890'); }
    } else if (MP === 'temple') {
      for (let x = 0, i = 0; x < Wc; i++) { const w = 26 + ((hash(i, 9, 7) * 4) | 0) * 10, h = 30 + ((hash(i, 8, 7) * 4) | 0) * 8; R2(x, 150 - h, w, h, dk('#7a6090')); x += w - 4; }
      // 大廟（燕尾屋脊、雙龍、寶塔）在店的正後方，比店面高出一截
      const tw = Math.min(250, sw + 60), tx = cx - tw / 2;
      R2(tx + 14, 72, tw - 28, 78, dk('#b8402a')); R2(tx, 64, tw, 9, dk('#2a7a64')); R2(tx - 10, 60, 14, 5, dk('#2a7a64')); R2(tx + tw - 4, 60, 14, 5, dk('#2a7a64'));
      R2(tx - 14, 55, 6, 6, dk('#ffd040')); R2(tx + tw + 8, 55, 6, 6, dk('#ffd040'));
      R2(tx + 30, 42, tw - 60, 8, dk('#2a7a64')); R2(tx + 22, 38, 10, 5, dk('#ffd040')); R2(tx + tw - 32, 38, 10, 5, dk('#ffd040')); R2(tx + 36, 50, tw - 72, 14, dk('#c84a30'));
      R2(cx - 14, 26, 28, 12, dk('#ffd040')); R2(cx - 4, 18, 8, 8, dk('#e8302a')); R2(cx - 2, 12, 4, 6, dk('#ffd040'));
      for (let k = 0; k < 2; k++) { const dx = k ? tx + tw - 64 : tx + 40; R2(dx, 35, 24, 3, dk('#3fa64a')); R2(dx + (k ? 22 : 0), 31, 4, 4, dk('#3fa64a')); R2(dx + 5, 33, 2, 2, dk('#ffd040')); }
      for (let x = tx + 44; x < tx + tw - 44; x += 16) R2(x, 54, 8, 8, n > 0.3 ? '#ffcf60' : dk('#e8b070'));
    }
    return c;
  },
  // 背景裡要亮燈的東西（漁船、山腰的民宿），位置固定，街景的燈光圖也要用
  skyPts(MP, x0) {
    const S = Game.S, Wc = (S.W + 48) * TILE, sx = -x0, sw = S.W * TILE, out = [];
    if (MP === 'harbor') for (let i = 0; i < 12; i++) {
      const L = 22 + ((hash(i, 3, 83) * 3) | 0) * 6, bx = i < 4 ? sx + sw * (0.08 + i * 0.22) | 0 : ((hash(i, 1, 83) * (Wc - 60)) | 0) + 20, by = 101 + ((hash(i, 2, 83) * (i < 4 ? 6 : 30)) | 0), col = ['#e8473b', '#3a8ad8', '#ffd040', '#f4f0e8', '#3fa64a'][i % 5];
      if (bx + L > sx + sw - 50 && bx < sx + sw + 10) continue;
      out.push({ bx, by, col, L });
    }
    if (MP === 'mountain') for (let i = 0; i < 30; i++) out.push({ bx: i < 6 ? sx + sw * (i / 6) + 6 | 0 : (hash(i, 7, 93) * Wc) | 0, by: i < 6 ? 92 + ((hash(i, 8, 93) * 10) | 0) : 96 + ((hash(i, 8, 93) * 40) | 0), L: 7 });
    return out;
  },
  // 背景會動的部分：燈塔的光束、纜車、摩天輪
  skyAnim(g, MP, x0, x1, n) {
    const S = Game.S, sw = S.W * TILE, t = this.t;
    if (MP === 'harbor' && n > 0.25) {
      const lx = sw - 18, ly = -190 + 42, a = Math.PI + Math.sin(t * 0.6) * 1.1;
      g.globalAlpha = 0.2 * n; g.fillStyle = '#fff6c0'; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.cos(a) * 240, ly - 18 + Math.sin(a) * 40); g.lineTo(lx + Math.cos(a) * 240, ly + 18 + Math.sin(a) * 40); g.closePath(); g.fill(); g.globalAlpha = 1;
      this.lightsList.push([lx, ly, 30, 'rgba(255,246,190,A)', 0.8]);
    } else if (MP === 'mountain') {
      const bx = sw * 0.22, by = -190 + 24, ax = sw + 12 * TILE, ay = -190 + 100;
      g.strokeStyle = 'rgba(40,40,60,.75)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      for (let k = 0; k < 2; k++) { const f = ((t * 0.018 + k * 0.5) % 1), x = ax + (bx - ax) * f, y = ay + (by - ay) * f; g.fillStyle = '#5a5a6a'; g.fillRect(x - 0.5, y, 1, 4); g.fillStyle = k ? '#3a8ad8' : '#e8473b'; g.fillRect(x - 5, y + 4, 10, 7); g.fillStyle = n > 0.3 ? '#fff2a0' : '#bfe0ff'; g.fillRect(x - 4, y + 5, 8, 3); if (n > 0.3) this.lightsList.push([x, y + 7, 14, 'rgba(255,240,170,A)', 0.6]); }
    } else if (MP === 'temple') {
      const fx = -30, fy = -190 + 62, r = 40, a0 = t * 0.15;
      g.strokeStyle = n > 0.3 ? 'rgba(210,180,255,.8)' : 'rgba(110,90,140,.95)'; g.lineWidth = 1;
      g.beginPath(); g.arc(fx, fy, r, 0, TAU); g.stroke();
      g.beginPath(); for (let i = 0; i < 12; i++) { const a = a0 + i / 12 * TAU; g.moveTo(fx, fy); g.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r); } g.stroke();
      g.fillStyle = '#5a4a7a'; g.fillRect(fx - 12, fy, 3, 70); g.fillRect(fx + 9, fy, 3, 70);
      for (let i = 0; i < 12; i++) { const a = a0 + i / 12 * TAU; g.fillStyle = ['#ff5ad0', '#5affff', '#ffe040', '#7affb0'][i % 4]; g.fillRect(fx + Math.cos(a) * r - 3, fy + Math.sin(a) * r, 6, 5); }
      if (n > 0.3) this.lightsList.push([fx, fy, 56, 'rgba(255,140,220,A)', 0.45]);
    }
  },
  // 對面：海港是木棧道、海和停泊的漁船
  oppHarbor(R2, X0, X1, oy, lights) {
    const ty = oy + 14;
    for (let x = X0; x < X1; x += 6) { R2(x, ty, 5, 10, '#8a6a4a'); R2(x, ty, 5, 1, '#a8885a'); R2(x + 5, ty, 1, 10, '#5a4030'); }
    R2(X0, ty + 10, X1 - X0, 2, '#5a4030');
    for (let y = ty + 12; y < ty + 80; y++) R2(X0, y, X1 - X0, 1, mixHex('#3a6aa8', '#1e3a70', (y - ty - 12) / 68));
    for (let i = 0; i < (X1 - X0) / 5; i++) R2(X0 + ((hash(i, 1, 87) * (X1 - X0)) | 0), ty + 14 + ((hash(i, 2, 87) * 64) | 0), 5, 1, 'rgba(190,220,255,.4)');
    for (let x = X0 + 30, i = 0; x < X1 - 60; x += 90 + ((hash(i, 3, 87) * 3) | 0) * 20, i++) {
      const col = ['#e8473b', '#3a8ad8', '#ffd040', '#3fa64a', '#f4f0e8'][i % 5], L = 46;
      R2(x, ty + 18, L, 14, col); R2(x + 2, ty + 32, L - 4, 3, shade(col, -0.45)); R2(x + 3, ty + 20, L - 6, 9, shade(col, 0.25));
      R2(x + 14, ty + 14, 16, 10, '#f4f0e8'); R2(x + 16, ty + 16, 12, 4, '#ffe8a0'); R2(x + 20, ty + 2, 1, 12, '#c8c8d0');
      for (let k = 0; k < 5; k++) R2(x + 4 + k * 9, ty + 17, 3, 3, ['#ff4a3a', '#ffd040', '#7affb0', '#5ad0ff', '#ff8ad0'][k]);
      R2(x + L - 1, ty + 10, 1, 10, '#8a6a4a');
      lights.push([x + 22, ty + 18, 30, 'rgba(255,220,140,A)', 0.5]);
    }
  },
  // 對面：山城是石欄杆、樹和山谷裡的燈
  oppMountain(R2, X0, X1, oy, lights, q) {
    const ty = oy + 14;
    for (let y = ty; y < ty + 80; y++) R2(X0, y, X1 - X0, 1, mixHex('#3a5a48', '#1c2a34', (y - ty) / 80));
    for (let x = X0; x < X1; x += 12) { R2(x, ty, 4, 9, '#b8b4a8'); R2(x, ty, 4, 1, '#d8d4c8'); }
    R2(X0, ty + 1, X1 - X0, 3, '#a8a498'); R2(X0, ty + 1, X1 - X0, 1, '#d0ccc0');
    for (let i = 0; i < (X1 - X0) / 14; i++) {
      const tx = X0 + ((hash(i, 1, 89) * (X1 - X0)) | 0), yy = ty + 16 + ((hash(i, 2, 89) * 40) | 0), col = hash(i, 3, 89) < 0.3 ? '#ff9ac0' : hash(i, 3, 89) < 0.6 ? '#2f6a40' : '#3a7a4a';
      R2(tx + 4, yy - 14, 4, 4, col); R2(tx + 2, yy - 10, 8, 5, col); R2(tx, yy - 5, 12, 5, col); R2(tx + 5, yy, 2, 4, '#5a3a24');
    }
    for (let i = 0; i < (X1 - X0) / 30; i++) { const lx = X0 + ((hash(i, 4, 89) * (X1 - X0)) | 0), ly = ty + 50 + ((hash(i, 5, 89) * 26) | 0); R2(lx, ly, 2, 2, '#ffd890'); lights.push([lx + 1, ly + 1, 14, 'rgba(255,214,140,A)', 0.45]); }
  },
  // ---------- 街景（快取：鄰居店面、空地、人行道、馬路、對面的攤子） ----------
  streetKey() { const S = Game.S; return [S.W, S.H, S.lv, S.map].join(':'); },
  buildStreet() {
    const S = Game.S, W = S.W * TILE, Hh = S.H * TILE, X0 = -24 * TILE, X1 = W + 24 * TILE, Y0 = -100, Y1 = Hh + 16 + 44 + 90;
    const c = this._st?.c || document.createElement('canvas');
    c.width = X1 - X0; c.height = Y1 - Y0;
    const q = c.getContext('2d'); q.clearRect(0, 0, c.width, c.height); q.imageSmoothingEnabled = false;
    q.save(); q.translate(-X0, -Y0);
    const R2 = (x, y, w, h, col) => { q.fillStyle = col; q.fillRect(x, y, w, h); };
    const lights = [], texts = [], npcs = [], stalls = [], MP = S.map || 'city', NB = NB_MAP[MP];
    // 鄰居店面（兩層樓的街屋）
    let k = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++, k++) {
        const bw = 48, bx = side < 0 ? -(i + 1) * bw : W + i * bw, hh = 66 + ((hash(i, side, 3) * 4) | 0) * 7;
        const wall = (NB ? NB.walls : ['#c8b8a0', '#a8b0b8', '#c0a090', '#9ab0a4', '#c4a8b0', '#b8b0c8'])[(i * 2 + (side > 0 ? 1 : 0)) % 6];
        R2(bx, -hh, bw, hh, wall); R2(bx, -hh, bw, 3, shade(wall, -0.25)); R2(bx, -hh + 3, bw, 1, shade(wall, 0.2));
        R2(bx + bw - 1, -hh, 1, hh, shade(wall, -0.18));
        // 二樓窗戶、冷氣
        for (let w2 = 0; w2 < 2; w2++) {
          const wx = bx + 7 + w2 * 22, wy = -hh + 10;
          R2(wx - 1, wy - 1, 14, 14, shade(wall, -0.3)); R2(wx, wy, 12, 12, '#2a3048');
          const lit = hash(i * 7 + w2, side, 11) < 0.6;
          if (lit) { R2(wx, wy, 12, 12, hash(i, w2, 13) < 0.5 ? '#ffd890' : '#ffe8b8'); lights.push([wx + 6, wy + 6, 16, 'rgba(255,210,140,A)', 0.3]); }
          R2(wx + 6, wy, 1, 12, '#3a3a44'); R2(wx, wy + 6, 12, 1, '#3a3a44');
          for (let gx = wx; gx < wx + 12; gx += 3) R2(gx, wy, 1, 12, 'rgba(40,40,50,.5)');
          if (hash(i, w2, 21) < 0.5) { R2(wx + 1, wy + 14, 10, 6, '#e8e8ec'); R2(wx + 1, wy + 14, 10, 1, '#ffffff'); R2(wx + 3, wy + 16, 6, 3, '#a8a8b4'); }
          else { R2(wx - 2, wy + 13, 16, 2, '#5a5a64'); for (let gx = wx - 2; gx < wx + 14; gx += 2) R2(gx, wy + 9, 1, 4, '#5a5a64'); if (hash(i, w2, 22) < 0.5) { R2(wx, wy + 8, 4, 5, '#3fa64a'); R2(wx + 1, wy + 7, 2, 1, '#ff6fa8'); } }
        }
        // 一樓：鐵捲門拉起一半，裡面亮燈
        R2(bx + 2, -30, bw - 4, 30, '#4a3a3a');
        R2(bx + 4, -22, bw - 8, 22, '#f2cf90'); R2(bx + 4, -22, bw - 8, 3, '#d8a868');
        for (let s2 = 0; s2 < 4; s2++) { R2(bx + 6 + s2 * 10, -16, 7, 10, ['#e8705a', '#5aa8e8', '#ffd84a', '#7ad890'][(s2 + i) % 4]); R2(bx + 6 + s2 * 10, -16, 7, 1, '#ffffff'); }
        R2(bx + 4, -8, bw - 8, 2, '#a87848');
        for (let y = -30; y < -22; y += 2) R2(bx + 2, y, bw - 4, 1, y % 4 ? '#8a8a94' : '#a8a8b4');
        lights.push([bx + bw / 2, -12, 36, 'rgba(255,200,130,A)', 0.42]);
        // 招牌橫條
        const sc = ['#e8302a', '#2a6ad8', '#2f9a4a', '#f0a020', '#c03ab0', '#1a8a8a'][(i * 5 + (side > 0 ? 3 : 0)) % 6];
        R2(bx + 1, -40, bw - 2, 10, shade(sc, -0.35)); R2(bx + 2, -39, bw - 4, 8, sc); R2(bx + 2, -39, bw - 4, 1, shade(sc, 0.35));
        const SH = NB ? NB.shops : NB_SHOPS;
        texts.push({ x: bx + bw / 2, y: -35, t: SH[(k * 7 + 3) % SH.length], c: '#d8d2e0', s: 5.5 });
        lights.push([bx + bw / 2, -35, 24, hexA(sc), 0.32]);
        // 直式招牌
        if (hash(i, side, 31) < 0.7) {
          const vx = side < 0 ? bx + 2 : bx + bw - 12, vy = -hh + 8, vc = ['#ff4a6a', '#ffd040', '#5ad0ff', '#7affb0', '#ff8ad0'][(i + k) % 5];
          R2(vx, vy, 10, 32, '#2a2036'); R2(vx + 1, vy + 1, 8, 30, '#fff6dc'); R2(vx, vy, 10, 1, vc); R2(vx, vy + 31, 10, 1, vc); R2(vx, vy, 1, 32, vc); R2(vx + 9, vy, 1, 32, vc);
          R2(side < 0 ? vx + 10 : vx - 2, vy + 4, 2, 2, '#5a5a64'); R2(side < 0 ? vx + 10 : vx - 2, vy + 26, 2, 2, '#5a5a64');
          const VS = NB ? NB.v : NB_VSIGN;
          texts.push({ x: vx + 5, y: vy + 16, t: VS[(k * 3 + 1) % VS.length], c: '#a84a48', s: 6, v: 1 });
          lights.push([vx + 5, vy + 16, 28, hexA(vc), 0.34]);
        }
      }
    }
    // 鄰居空地
    for (const side of [-1, 1]) {
      const lx = side < 0 ? -22 * TILE : W, lw = 22 * TILE;
      R2(lx, 0, lw, Hh, '#8c8794');
      for (let y = 0; y < S.H; y++) for (let x = 0; x < 22; x++) {
        const tx = lx + x * TILE, ty = y * TILE, hv = hash(x * side, y, 41);
        R2(tx, ty, TILE, TILE, hv < 0.5 ? '#918c99' : '#88838f');
        R2(tx, ty + 15, TILE, 1, '#7a7582'); R2(tx + 15, ty, 1, TILE, '#7a7582');
        if (hv > 0.85) R2(tx + 4, ty + 5, 5, 3, 'rgba(60,50,60,.25)');
      }
      // 騎樓陰影
      for (let i = 0; i < 6; i++) R2(lx, i, lw, 1, `rgba(20,10,30,${0.3 - i * 0.05})`);
    }
    // 鄰居的攤子、桌椅、雜物
    const lot = (side, gx, gy, what, v) => {
      const x = side < 0 ? -(gx + 1) * TILE : W + gx * TILE, y = gy * TILE;
      if (gy >= S.H) return;
      if (what === 'stall') {
        const [st, ch] = NB_STALL[v % NB_STALL.length], h = Art.facH(st);
        stalls.push({ x, y: y + TILE - h, st, ch, lv: 1 + v % 2 });
        lights.push([x + 8, y + TILE - h + 9, 26, 'rgba(255,214,140,A)', 0.4]);
        if (v % 3 !== 0) Art.blit(q, Art.person(makeLook(900 + v * 13 + (side > 0 ? 7 : 0), 'staff', 'cook'), 0, 1, 'cook'), x + 2, y - 21);
        Art.blit(q, Art.fac(st, v & 1, 1 + v % 2), x, y + TILE - h);
      } else if (what === 'table') { Art.blit(q, Art.fac(v % 2 ? 'stool' : 'wood', 0, 1), x, y + TILE - Art.facH(v % 2 ? 'stool' : 'wood')); }
      else Art.blit(q, Art.prop(v), x, y);
    };
    for (const side of [-1, 1]) {
      const o = side < 0 ? 0 : 3;
      lot(side, 2, 1, 'prop', 2); lot(side, 5, 1, 'stall', 0 + o); lot(side, 9, 1, 'stall', 2 + o); lot(side, 12, 1, 'stall', 4 + o);
      lot(side, 4, 3, 'table', 0 + o); lot(side, 7, 3, 'table', 1);
      lot(side, 9, 3, 'prop', 0); lot(side, 0, 2, 'prop', 2 + (o ? 2 : 0)); lot(side, 8, 2, 'prop', 3);
      lot(side, 12, 2, 'prop', 1); lot(side, 13, 3, 'prop', 0); lot(side, 14, 1, 'stall', 6 + o);
      if (S.H >= 6) { lot(side, 3, 5, 'prop', 1); lot(side, 8, 5, 'table', 0); lot(side, 5, 5, 'prop', 4); }
      if (S.H >= 8) { lot(side, 2, 7, 'stall', 1 + o); lot(side, 6, 7, 'table', 1); lot(side, 10, 6, 'prop', 0); }
      // 鄰居那邊暗一點、灰一點，越遠越暗，讓自己的店是畫面的主角
      const lx = side < 0 ? -22 * TILE : W, gw = 22 * TILE;
      const gr = q.createLinearGradient(side < 0 ? 0 : W, 0, side < 0 ? -gw : W + gw, 0);
      gr.addColorStop(0, 'rgba(30,22,54,.34)'); gr.addColorStop(0.12, 'rgba(30,22,54,.46)'); gr.addColorStop(1, 'rgba(22,16,42,.62)');
      q.fillStyle = gr; q.fillRect(lx, -100, gw, Hh + 100);
      // 自己店面的邊界：矮矮的花圃欄杆
      const ex = side < 0 ? -3 : W;
      for (let y = 4; y < Hh; y += 6) { R2(ex, y, 3, 4, '#7a5a3a'); R2(ex, y, 3, 1, '#a8804a'); }
    }
    // 走道（騎樓地磚）
    const ay = Hh;
    for (let x = X0; x < X1; x += 8) for (let r2 = 0; r2 < 4; r2++) {
      const ox = (r2 & 1) ? 4 : 0, hv = hash(x, r2, 51);
      R2(x + ox, ay + r2 * 4, 8, 4, hv < 0.33 ? '#b06a5c' : hv < 0.66 ? '#a86254' : '#b87464');
      R2(x + ox, ay + r2 * 4 + 3, 8, 1, '#8a4a40'); R2(x + ox + 7, ay + r2 * 4, 1, 3, '#8a4a40');
    }
    // 店門口那一段換成淺色地磚
    for (let x = 0; x < W; x += 8) for (let r2 = 0; r2 < 4; r2++) { const ox = (r2 & 1) ? 4 : 0; R2(x + ox, ay + r2 * 4, 8, 4, (x / 8 + r2) & 1 ? '#d8c8a8' : '#cdbb98'); R2(x + ox, ay + r2 * 4 + 3, 8, 1, '#a8987a'); R2(x + ox + 7, ay + r2 * 4, 1, 3, '#a8987a'); }
    // 路緣
    const ry = Hh + TILE;
    R2(X0, ry - 2, X1 - X0, 2, '#d8d4dc'); R2(X0, ry, X1 - X0, 1, '#9a96a2');
    // 馬路
    R2(X0, ry + 1, X1 - X0, 42, '#3c3a46');
    for (let i = 0; i < (X1 - X0) * 0.5; i++) { const x = X0 + hash(i, 1, 61) * (X1 - X0), y = ry + 1 + hash(i, 2, 61) * 42; R2(x | 0, y | 0, 1, 1, hash(i, 3, 61) < 0.5 ? '#34323e' : '#46444f'); }
    for (let x = X0; x < X1; x += 18) R2(x, ry + 21, 10, 1, '#e8d890');
    R2(X0, ry + 3, X1 - X0, 1, 'rgba(255,255,255,.35)'); R2(X0, ry + 40, X1 - X0, 1, 'rgba(255,255,255,.35)');
    // 斑馬線
    for (const cx of [-4 * TILE, W + 3 * TILE]) for (let i = 0; i < 6; i++) R2(cx + i * 6, ry + 5, 3, 34, '#e8e6ec');
    // 水溝蓋、人孔蓋
    for (let x = X0 + 20; x < X1; x += 70) { R2(x, ry - 2, 8, 2, '#5a5864'); for (let j = 0; j < 8; j += 2) R2(x + j, ry - 2, 1, 2, '#2a2830'); }
    for (const mx of [W * 0.3, W + 9 * TILE, -10 * TILE]) { R2(mx - 3, ry + 9, 7, 5, '#4e4c58'); R2(mx - 2, ry + 10, 5, 3, '#585664'); }
    // 對面的人行道和帳篷（從上面看）
    const oy = ry + 43;
    R2(X0, oy, X1 - X0, 2, '#d8d4dc'); R2(X0, oy + 2, X1 - X0, 12, '#a49ea8');
    for (let x = X0; x < X1; x += 16) R2(x, oy + 2, 1, 12, '#8e8994');
    for (const p of this.skyPts(MP, -24 * TILE)) lights.push([-24 * TILE + p.bx + p.L / 2, -190 + p.by, MP === 'harbor' ? 26 : 12, 'rgba(255,220,150,A)', MP === 'harbor' ? 0.55 : 0.4]);
    if (MP === 'harbor') this.oppHarbor(R2, X0, X1, oy, lights);
    else if (MP === 'mountain') this.oppMountain(R2, X0, X1, oy, lights, q);
    let ti = MP === 'harbor' || MP === 'mountain' ? 1e9 : 0;
    for (let x = X0; x < X1 && ti < 1e9; ti++) {
      const tw = 40 + ((hash(ti, 1, 71) * 3) | 0) * 8, ty = oy + 14, cs = (MP === 'temple' ? [['#c8202a', '#ffd040'], ['#e8473b', '#fff4c8'], ['#d8a020', '#c8202a']] : [['#e8473b', '#fff4e8'], ['#3a8ad8', '#e8f4ff'], ['#f0a020', '#fff4c8'], ['#3a9a5a', '#eaffea'], ['#ff6fa8', '#fff0f6'], ['#8a5ac8', '#f4eaff']])[(ti * 5) % (MP === 'temple' ? 3 : 6)];
      for (let s2 = 0; s2 < tw; s2 += 4) R2(x + s2, ty + 2, 4, 76, (s2 / 4) & 1 ? cs[1] : cs[0]);
      R2(x, ty + 2, tw, 2, shade(cs[0], 0.25));
      for (let s2 = 0; s2 < tw; s2 += 4) R2(x + s2, ty, 4, 3, (s2 / 4) & 1 ? cs[1] : cs[0]);
      for (let s2 = 2; s2 < tw; s2 += 8) R2(x + s2, ty - 1, 4, 1, (s2 / 4) & 1 ? cs[1] : cs[0]);
      R2(x + tw - 1, ty, 1, 78, shade(cs[0], -0.4)); R2(x + tw / 2 | 0, ty + 3, 1, 75, 'rgba(0,0,0,.15)');
      for (let b = x + 3; b < x + tw - 2; b += 5) { R2(b, ty + 4, 1, 1, '#fff2a0'); R2(b, ty + 3, 1, 1, 'rgba(255,240,180,.5)'); }
      lights.push([x + tw / 2, ty + 6, tw * 0.75, 'rgba(255,200,130,A)', 0.55]);
      x += tw + 2;
    }
    q.restore();
    // 路燈的位置
    const lamps = [];
    for (const lx of [-3 * TILE + 8, -11 * TILE + 8, -19 * TILE + 8, W + 2 * TILE + 8, W + 10 * TILE + 8, W + 18 * TILE + 8]) lamps.push(lx);
    this._st = { key: this.streetKey(), c, X0, Y0, lights, texts, npcs, stalls, lamps };
  },
  street(g) {
    if (!this._st || this._st.key !== this.streetKey()) this.buildStreet();
    const st = this._st;
    g.drawImage(st.c, st.X0, st.Y0);
    const vx0 = this.cam.x - 30, vx1 = this.cam.x + this.cv.width / this.z + 30;
    for (const t of st.texts) {
      if (t.x < vx0 || t.x > vx1) continue;
      if (t.v) { const ch = [...t.t]; ch.forEach((c, i) => this.txt(g, c, t.x, t.y + (i - (ch.length - 1) / 2) * 7.2, t.s, t.c)); }
      else this.txt(g, t.t, t.x, t.y + 0.5, t.s, t.c);
    }
    const q = this.q;
    for (const s2 of st.stalls) {
      if (s2.x < vx0 || s2.x > vx1) continue;
      this.txt(g, s2.ch, s2.x + 8, s2.y + 21.7, 5, 'rgba(150,40,36,.8)');
      if (Math.random() < (q ? 0.012 : 0.025)) Game.steam(s2.x + 8 + rnd(-4, 4), s2.y + 12, s2.st);
    }
  },
  // ---------- 自己的店面 ----------
  // 店面：牆、屋頂、窗戶、招牌底板先畫好快取；招牌字、跑馬燈、燈籠每格畫
  signBox() {
    const S = Game.S, W = S.W * TILE, lv = S.lv, fh = this.fh();
    const sw = Math.min(W - 8, 40 + [...S.shop].length * 11 + lv * 6), shh = lv >= 3 ? 16 : 15;
    return { sw, shh, sx: Math.round((W - sw) / 2), sy: -fh + (lv >= 2 ? 21 : lv === 1 ? 10 : 7) };
  },
  buildFacade() {
    const S = Game.S, W = S.W * TILE, lv = S.lv, fh = this.fh(), lit = this.night() > 0.35;
    const c = this._fc?.c || document.createElement('canvas');
    c.width = W + 16; c.height = fh + 16;
    const q = c.getContext('2d'); q.clearRect(0, 0, c.width, c.height);
    q.save(); q.translate(8, fh + 8);
    const R2 = (x, y, w, h, col) => { q.fillStyle = col; q.fillRect(x, y, w, h); };
    const { sw, shh, sx, sy } = this.signBox();
    if (lv === 0) {
      // 路邊小攤：鐵皮牆＋浪板屋頂
      for (let x = 0; x < W; x += 2) R2(x, -fh + 4, 2, fh - 4, (x / 2) & 1 ? '#8e9ca8' : '#a4b0ba');
      for (let i = 0; i < 18; i++) R2((hash(i, 1, 5) * W) | 0, -fh + 6 + ((hash(i, 2, 5) * (fh - 12)) | 0), 2, 1, '#b07a56');
      for (let x = -3; x < W + 3; x += 4) { R2(x, -fh - 1, 4, 3, '#c8d0d8'); R2(x + 2, -fh + 1, 2, 3, '#7a8894'); }
      R2(-3, -fh + 3, W + 6, 1, '#5a6470');
      // 兩根木柱
      R2(0, -fh + 4, 3, fh - 4, '#8a5a34'); R2(W - 3, -fh + 4, 3, fh - 4, '#8a5a34'); R2(0, -fh + 4, 1, fh - 4, '#b07a4a'); R2(W - 3, -fh + 4, 1, fh - 4, '#b07a4a');
      // 手寫價目表
      const mw = Math.min(W - 16, 66), mx = Math.round((W - mw) / 2), my = sy + shh + 4;
      R2(mx - 1, my - 1, mw + 2, 10, '#3a2a20'); R2(mx, my, mw, 8, '#2f4a3a');
      for (let x = mx + 3; x < mx + mw - 4; x += 9) { R2(x, my + 2, 5, 1, '#f4f0e0'); R2(x + 1, my + 4, 3, 1, '#ffd84a'); }
    } else {
      const wall = ['', '#e8d0a8', '#f4e0c0', '#e8c8a0', '#d8b090', '#c89878'][lv];
      R2(0, -fh, W, fh, wall);
      for (let i = 0; i < W * fh / 40; i++) R2((hash(i, 3, 9) * W) | 0, -fh + ((hash(i, 4, 9) * fh) | 0), 2, 1, shade(wall, hash(i, 5, 9) < 0.5 ? -0.06 : 0.06));
      if (lv >= 3) { // 二樓紅磚
        for (let y = -fh + 4; y < sy - 2; y += 4) for (let x = ((y / 4) & 1) * 4; x < W; x += 8) { R2(x, y, 7, 3, hash(x, y, 7) < 0.5 ? '#b8564a' : '#a84e44'); }
      }
      R2(0, -3, W, 3, shade(wall, -0.22)); R2(W - 1, -fh, 1, fh, shade(wall, -0.22)); R2(0, -fh, W, 1, shade(wall, 0.15));
      // 屋簷瓦片（傳說夜市是金黃琉璃瓦、翹起來的屋角）
      const tile = lv >= 5 ? ['#e8a020', '#ffd060'] : ['#8a3a2a', '#a84a3a'];
      R2(-3, -fh - 3, W + 6, 5, tile[0]); for (let x = -3; x < W + 3; x += 4) { R2(x, -fh + 2, 3, 2, tile[1]); R2(x + 1, -fh - 3, 1, 4, shade(tile[0], 0.2)); }
      if (lv >= 5) { R2(-7, -fh - 7, 6, 3, tile[0]); R2(-9, -fh - 9, 3, 3, tile[1]); R2(W + 1, -fh - 7, 6, 3, tile[0]); R2(W + 6, -fh - 9, 3, 3, tile[1]); R2(W / 2 - 6, -fh - 8, 12, 5, '#c8302a'); R2(W / 2 - 3, -fh - 11, 6, 3, '#ffd040'); }
      // 二樓窗戶
      if (lv >= 2) for (let x = 8; x < W - 14; x += 24) {
        if (x + 6 > sx - 4 && x + 6 < sx + sw + 4 && sy < -fh + 20) continue;
        R2(x - 1, -fh + 6, 14, 12, shade(wall, -0.3)); R2(x, -fh + 7, 12, 10, lit ? '#ffe0a0' : '#a8d0e8');
        if (lit) { R2(x + 1, -fh + 8, 4, 8, '#ffcf80'); R2(x + 8, -fh + 9, 3, 3, '#fff0c8'); }
        R2(x + 6, -fh + 7, 1, 10, '#7a5a3a'); R2(x, -fh + 12, 12, 1, '#7a5a3a');
        R2(x - 2, -fh + 17, 16, 2, '#c8302a'); R2(x - 1, -fh + 15, 3, 2, '#3fa64a'); R2(x + 9, -fh + 15, 3, 2, '#3fa64a'); R2(x + 2, -fh + 15, 1, 1, '#ff6fa8');
      }
      // 一樓：明亮的店內（招牌下面）
      const iy = sy + shh + 3;
      if (iy < -10) { R2(2, iy, W - 4, -9 - iy, '#5a3a2a'); R2(4, iy + 1, W - 8, -10 - iy, lit ? '#ffe2a0' : '#f4d8a8'); for (let x = 6; x < W - 8; x += 8) R2(x, iy + 2, 5, 2, ['#e8705a', '#5aa8e8', '#ffd84a', '#7ad890'][(x / 8) & 3]); }
      if (lv >= 4) { R2(0, -fh, 2, fh, '#ffd040'); R2(W - 2, -fh, 2, fh, '#ffd040'); }
    }
    // 招牌底板（字在 facade 每格畫）
    const sc = lv === 0 ? '#ffe7a0' : lv >= 5 ? '#b8181e' : lv >= 3 ? '#c8202a' : '#d84a2a';
    R2(sx - 3, sy - 3, sw + 6, shh + 6, lv === 0 ? '#7a4a24' : '#5a2a1a');
    R2(sx - 2, sy - 2, sw + 4, 1, lv === 0 ? '#a8703e' : '#8a4a2a');
    R2(sx, sy, sw, shh, sc); R2(sx, sy, sw, 2, shade(sc, 0.22)); R2(sx, sy + shh - 1, sw, 1, shade(sc, -0.2));
    if (lv >= 4) { R2(sx, sy, sw, 1, '#ffd040'); R2(sx, sy + shh - 1, sw, 1, '#ffd040'); R2(sx - 3, sy - 3, 3, 3, '#ffd040'); R2(sx + sw, sy - 3, 3, 3, '#ffd040'); R2(sx - 3, sy + shh, 3, 3, '#ffd040'); R2(sx + sw, sy + shh, 3, 3, '#ffd040'); }
    if (lv === 0) { R2(sx + 2, sy - 7, 1, 4, '#5a3a2a'); R2(sx + sw - 3, sy - 7, 1, 4, '#5a3a2a'); }
    // 雨棚
    const ay = -9;
    for (let x = 0; x < W; x += 8) { const a2 = (x / 8) & 1; R2(x, ay, 8, 6, a2 ? '#fff4e8' : '#e8473b'); R2(x, ay, 8, 1, a2 ? '#ffffff' : '#ff6a5a'); R2(x, ay + 6, 8, 1, a2 ? '#f0e0d0' : '#c8302a'); R2(x + 2, ay + 7, 4, 1, a2 ? '#f0e0d0' : '#c8302a'); }
    R2(0, ay - 1, W, 1, '#a8302a');
    q.restore();
    return c;
  },
  facade(g) {
    const S = Game.S, W = S.W * TILE, lv = S.lv, n = this.night(), fh = this.fh();
    const key = [W, lv, fh, n > 0.35 ? 1 : 0, S.shop].join(':');
    if (!this._fc || this._fc.key !== key) this._fc = { key, c: this.buildFacade() };
    g.drawImage(this._fc.c, -8, -fh - 8);
    const { sw, shh, sx, sy } = this.signBox();
    // 招牌周圍的跑馬燈
    const ph = Math.floor(this.t * 6);
    for (let x = sx - 2, i = 0; x < sx + sw + 2; x += 3, i++) { const on = (i + ph) % 3 === 0; g.fillStyle = on ? '#fff6b0' : '#b08a40'; g.fillRect(x, sy - 2, 1, 1); g.fillRect(x, sy + shh + 1, 1, 1); }
    const fs = lv === 0 ? 10 : 10.5;
    this.txt(g, S.shop, W / 2, sy + shh / 2 + 0.5, fs, lv === 0 ? '#c8302a' : '#fff4c0', 900, lv === 0 ? '#fff8e0' : '#5a1a0a');
    if (lv === 0) this.txt(g, '現做・好吃', W / 2, sy + shh + 8.5, 4, '#fff4c0', 700);
    const L = this.lightsList;
    L.push([W / 2, sy + shh / 2, 52 + sw * 0.45, lv === 0 ? 'rgba(255,200,110,A)' : 'rgba(255,110,70,A)', 0.85]);
    if (lv >= 2 && n > .35) for (let x = 8; x < W - 14; x += 24) L.push([x + 6, -fh + 12, 18, 'rgba(255,214,150,A)', 0.6]);
    // 燈籠串
    const ly = -fh - 7, sag = (x) => Math.sin((x + 40) / (W + 80) * Math.PI * 3) * 2.5;
    g.strokeStyle = '#2a1a2a'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-40, ly + 3);
    for (let x = -40; x <= W + 40; x += 4) g.lineTo(x, ly + sag(x) + 3);
    g.stroke();
    const m = Game.month(), xmas = m === 12;
    for (let x = -36, i = 0; x <= W + 36; x += 13, i++) {
      const y = ly + sag(x) + 4, sw2 = Math.sin(this.t * 1.6 + i) * 0.6, xx = x + sw2;
      const col = xmas ? ['#ff4a3a', '#3fc05a', '#ffd040', '#5ad0ff'][i % 4] : ['#ff4a3a', '#ffb020', '#ff4a3a', '#ff6fa8'][i % 4];
      g.drawImage(this.lanternSpr(col), Math.round(xx * 4) / 4 - 3, y - 1);
      if (x >= -8 && x <= W + 8) L.push([xx + 0.5, y + 2.5, 14, col === '#3fc05a' ? 'rgba(120,255,140,A)' : 'rgba(255,140,80,A)', 0.8]);
    }
  },
  lanternSpr(col) {
    const m = this._lsp || (this._lsp = {});
    if (m[col]) return m[col];
    const c = m[col] = document.createElement('canvas'); c.width = 7; c.height = 9; const q = c.getContext('2d');
    const R2 = (x, y, w, h, cc) => { q.fillStyle = cc; q.fillRect(x, y, w, h); };
    R2(1, 1, 5, 5, col); R2(0, 2, 7, 3, col); R2(2, 2, 1, 3, shade(col, 0.4)); R2(2, 0, 3, 1, '#ffd040'); R2(2, 6, 3, 1, '#ffd040'); R2(3, 7, 1, 2, '#ffd040');
    return c;
  },
  // ---------- 店裡的地板 ----------
  floor(g) {
    const S = Game.S, W = S.W, H = S.H;
    let fk = W + ',' + H + ':'; for (const k in S.floor) fk += k + S.floor[k][2];
    if (!this._fl || this._fl.key !== fk) {
      const c = this._fl?.c || document.createElement('canvas'); c.width = W * TILE; c.height = H * TILE;
      const q = c.getContext('2d'); q.clearRect(0, 0, c.width, c.height);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const f = S.floor[x + ',' + y] || 'f_none';
        Art.blit(q, Art.floor(f, (hash(x, y, 1) * 4) | 0), x * TILE, y * TILE);
      }
      for (let i = 0; i < 5; i++) { q.fillStyle = `rgba(20,10,30,${0.22 - i * 0.04})`; q.fillRect(0, i, W * TILE, 1); }
      // 店門口一條暖色的門檻，讓店面和人行道分得清楚
      q.fillStyle = '#c8904a'; q.fillRect(0, H * TILE - 2, W * TILE, 1); q.fillStyle = '#f0c070'; q.fillRect(0, H * TILE - 1, W * TILE, 1);
      this._fl = { key: fk, c };
    }
    g.drawImage(this._fl.c, 0, 0);
    // 晚上整間店有一大片暖光（燈泡串的光在靜態燈光圖裡）
    this.lightsList.push([W * TILE / 2, H * TILE * 0.45, Math.max(W, H) * TILE * 0.75, 'rgba(255,196,130,A)', 0.42]);
    g.fillStyle = '#6a4a3a'; g.fillRect(-1, 0, 1, H * TILE); g.fillRect(W * TILE, 0, 1, H * TILE);
  },
  gridLines(g) {
    const S = Game.S;
    g.fillStyle = 'rgba(255,255,255,.2)';
    for (let x = 0; x <= S.W; x++) g.fillRect(x * TILE, 0, 0.5, S.H * TILE);
    for (let y = 0; y <= S.H; y++) g.fillRect(0, y * TILE, S.W * TILE, 0.5);
  },
  shadow(g, x, y, w) {
    if (!this._shc) { const c = this._shc = document.createElement('canvas'); c.width = 32; c.height = 12; const q = c.getContext('2d'); const gr = q.createRadialGradient(16, 6, 1, 16, 6, 16); gr.addColorStop(0, 'rgba(10,0,20,.42)'); gr.addColorStop(1, 'rgba(10,0,20,0)'); q.save(); q.scale(1, 0.375); q.fillStyle = gr; q.fillRect(0, 0, 32, 32); q.restore(); }
    g.drawImage(this._shc, x - w / 2, y - w * 0.18, w, w * 0.375);
  },
  // ---------- 物件（設施、人物、車）依 y 排序 ----------
  // 清單用物件池重複使用，避免每格產生幾百個小物件
  _ycmp(p, q) { return p.y - q.y; },
  objects(g) {
    const S = Game.S, fr = Math.floor(this.t * 3), st = this._st, n = this.night(), lowQ = this.q >= 2;
    const list = this._ol || (this._ol = []), pool = this._op || (this._op = []);
    let k = 0;
    // 畫面外的人不用畫
    const cx0 = this.cam.x - 16, cx1 = this.cam.x + this.cv.width / this.z + 16, cy1 = this.cam.y + this.cv.height / this.z + 30;
    const P = (y, t, o) => {
      if (t === 2 || t === 3) { const x = o.x; if (x < cx0 || x > cx1 || o.y > cy1) return; } let e = pool[k]; if (!e) e = pool[k] = { y: 0, t: 0, o: null }; e.y = y; e.t = t; e.o = o; list[k++] = e; };
    for (const it of S.items) if (!(UI.carry && UI.carry.it === it)) P((it.y + 1) * TILE - 0.1, 1, it);
    for (const c of Game.cust) P(c.y + (c.oy || 0), 2, c);
    for (const c of Game.peds) P(c.y + (c.oy || 0), 3, c);
    for (const a of Game.srt.values()) P(a.y + 0.05 + (a.oy || 0), 2, a);
    for (const c of Game.cars) P(c.y + 6, 4, c);
    for (const lx of st.lamps) P((S.H + 1) * TILE - 1, 5, lx);
    list.length = k;
    list.sort(this._ycmp);
    // 影子先畫
    for (let i = 0; i < k; i++) {
      const e = list[i], o = e.o;
      if (e.t === 1) { if (F[o.id].cat !== 'floor') this.shadow(g, o.x * TILE + 8, (o.y + 1) * TILE - 1, 18); }
      else if (e.t === 2) { if (!o.sitting && (!lowQ || o.kind === 's')) this.shadow(g, o.x + (o.ox || 0), o.y + (o.oy || 0), 11); }
      else if (e.t === 3) { if (!lowQ) this.shadow(g, o.x + (o.ox || 0), o.y + (o.oy || 0), 10); }
      else if (e.t === 4) this.shadow(g, o.x, o.y + 6, 22);
    }
    for (let i = 0; i < k; i++) {
      const e = list[i], o = e.o;
      if (e.t === 1) this.drawItem(g, o, fr);
      else if (e.t === 2) this.drawAgent(g, o);
      else if (e.t === 3) this.drawAgent(g, o, true);
      else if (e.t === 4) this.drawCar(g, o, n);
      else {
        const x = o, by = (S.H + 1) * TILE - 1;
        g.fillStyle = '#3a3a48'; g.fillRect(x - 1, by - 46, 2, 46); g.fillRect(x - 2, by - 3, 4, 3);
        g.fillStyle = '#4a4a5a'; g.fillRect(x - 1, by - 46, 8, 2); g.fillStyle = n > 0.2 ? '#fff8d8' : '#c8c8d0'; g.fillRect(x + 4, by - 44, 4, 2);
      }
    }
  },
  drawItem(g, it, fr) {
    const S = Game.S, f = F[it.id], h = Art.facH(it.id), x0 = it.x * TILE, top = (it.y + 1) * TILE - h;
    if (f.cat === 'station') {
      const rt = Game.rts.get(it.uid), cooking = rt && rt.cooking;
      Art.blit(g, Art.fac(it.id, cooking ? 4 + (Math.floor(this.t * 6) & 3) : (fr & 2 ? 2 : 0), it.lv), x0, top);
      this.txt(g, Art.STCH[f.st], x0 + 8, top + 21.7, 5, '#b8201a');
      this.lightsList.push([x0 + 8, top + 10, 34, 'rgba(255,214,140,A)', cooking ? 1 : 0.8]);
      if (cooking) this.cookFx(it, f.st, x0, top);
      if (rt && rt.prog > 0) { g.fillStyle = '#2b1b26'; g.fillRect(x0 + 1, top + 11, 14, 3); g.fillStyle = '#7affb0'; g.fillRect(x0 + 2, top + 12, 12 * rt.prog, 1); }
      if (rt && rt.queue.length && !rt.cook) this.bubbleAt(g, x0 + 8, top - 4, 'nocook');
      else if (rt && !rt.front) this.bubbleAt(g, x0 + 8, top - 4, 'angry');
      return;
    }
    Art.blit(g, Art.fac(it.id, fr & 3, it.lv), x0, top);
    if (it.dirty) { Art.blit(g, Art.dirt(), x0 + 2, it.y * TILE + (it.id === 'bench' ? 4 : 2)); if (it.dirty > 1) Art.blit(g, Art.dirt(), x0 + 5, it.y * TILE + 5); }
    if (f.cat === 'seat') {
      // 桌上的菜：吃的時候慢慢變少，熱的還會冒煙
      const rt = Game.rts.get(it.uid);
      if (rt) for (let i = 0; i < rt.seats.length; i++) {
        const c = rt.seats[i]; if (!c || c.state !== 'eat') continue;
        const d = DISH[c.dish], stage = c.eatT > c.eat0 * 0.6 ? 0 : c.eatT > c.eat0 * 0.25 ? 1 : 2;
        const sp = Art.minidish(d.st, stage, CATCOL[d.cat]);
        const tx = x0 + (rt.seats.length === 2 ? (i ? 9 : 3) : [2, 10, 6, 6][i]), ty = it.y * TILE + (rt.seats.length === 2 ? 3 : [4, 4, 1, 6][i]) + (it.id === 'bench' || it.id === 'picnic' ? 2 : 0);
        g.drawImage(sp, tx - 1, ty - 1);
        if (stage < 2 && (d.st === 'soup' || d.st === 'steam' || d.st === 'griddle') && Math.random() < 0.02) Game.steam(tx + 3, ty, 'x');
      }
    } else this.itemLight(it);
    if (it.id === 'vsign') { const ch = [...S.shop.slice(0, 3)]; ch.forEach((cc, i) => this.txt(g, cc, x0 + 8, top + 5 + i * 6.2, 5.5, '#c8302a')); }
    else if (it.id === 'banner') { this.txt(g, '好', x0 + 7.5, top + 5.5, 5, '#c8302a'); this.txt(g, '吃', x0 + 7.5, top + 11.5, 5, '#c8302a'); }
  },
  // 每種攤位煮東西時自己的小動畫粒子
  cookFx(it, st, x0, top) {
    const r = Math.random(), q = this.q ? 0.5 : 1, cx = x0 + 8, cy = top + 13;
    switch (st) {
      case 'fryer': if (r < 0.12 * q) Game.fx.push({ x: cx - 3 + rnd(-3, 3), y: cy, vx: rnd(-10, 10), vy: -rnd(14, 24), g: 60, t: 0, life: 0.4, col: '#fff0a0', s: 1, ember: 1 }); break;
      case 'griddle': if (r < 0.08 * q) Game.fx.push({ x: cx + rnd(-5, 5), y: cy - 1, vx: rnd(-6, 6), vy: -rnd(6, 12), g: 20, t: 0, life: 0.45, col: '#ffe8a8', s: 1, ember: 1 }); break;
      case 'ice': if (r < 0.15 * q) Game.fx.push({ x: cx + rnd(-3, 3), y: top + 7, vx: rnd(-4, 4), vy: rnd(4, 9), t: 0, life: 0.7, col: '#ffffff', s: 1, ember: 1 }); break;
      case 'drink': if (r < 0.05 * q) Game.fx.push({ x: cx + rnd(-4, 4), y: top + 8, vx: 0, vy: -rnd(4, 8), t: 0, life: 0.6, col: 'rgba(200,240,255,.9)', s: 1, puff: 1 }); break;
      case 'soup': if (r < 0.08 * q) Game.fx.push({ x: cx + rnd(-4, 3), y: top + 11, vx: 0, vy: -rnd(3, 6), t: 0, life: 0.5, col: 'rgba(255,240,210,.9)', s: 1, puff: 1 }); break;
      case 'grill': if (r < 0.1 * q) Game.fx.push({ x: cx + rnd(-6, 6), y: top + 14, vx: rnd(-3, 3), vy: -rnd(12, 22), g: -6, t: 0, life: 0.55, col: pick(['#ffd040', '#ff8a2a', '#ff5a1a']), s: 1, ember: 1 }); break;
      case 'steam': if (r < 0.07 * q) Game.steam(cx + rnd(-4, 4), top + 6, 'steam'); break;
      case 'wok': if (r < 0.14 * q) Game.fx.push({ x: cx - 2 + rnd(-5, 5), y: top + 12, vx: rnd(-8, 8), vy: -rnd(16, 30), g: -4, t: 0, life: 0.45, col: pick(['#ffd040', '#ff8a2a', '#ff5a1a', '#fff0a0']), s: 1, ember: 1 }); else if (r < 0.2 * q) Game.steam(cx + rnd(-3, 3), top + 6, 'grill'); break;
    }
  },
  itemLight(it) {
    const x = it.x * TILE + 8, y = (it.y + 1) * TILE - Art.facH(it.id), L = this.lightsList;
    switch (it.id) {
      case 'lantern': L.push([x, y + 10, 36, 'rgba(255,110,60,A)', 1]); break;
      case 'neon': L.push([x, y + 7, 40, 'rgba(255,80,220,A)', 0.9]); L.push([x, y + 7, 22, 'rgba(90,255,255,A)', 0.5]); break;
      case 'vsign': L.push([x, y + 10, 34, 'rgba(255,230,170,A)', 0.9]); break;
      case 'tree': L.push([x, y + 14, 30, 'rgba(255,220,140,A)', 0.7]); L.push([x, y + 14, 20, 'rgba(120,200,255,A)', 0.4]); break;
      case 'shrine': case 'tG': case 'fortune': L.push([x, y + 8, 26, 'rgba(255,210,80,A)', 0.7]); break;
      case 'tv': case 'claw': case 'pinball': case 'bingo': case 'gacha': L.push([x, y + 8, 22, 'rgba(120,200,255,A)', 0.6]); break;
      case 'stage': L.push([x, y + 8, 50, 'rgba(255,220,160,A)', 0.8]); break;
      case 'fountain': case 'koi': L.push([x, y + 8, 28, 'rgba(120,220,255,A)', 0.5]); break;
      case 'icebox': L.push([x, y + 6, 16, 'rgba(160,220,255,A)', 0.4]); break;
      case 'lighthouse': L.push([x, y + 5, 46, 'rgba(255,246,190,A)', 0.9]); break;
      case 'tkw': case 'lounge': L.push([x, y + 10, 22, 'rgba(255,214,150,A)', 0.6]); break;
      case 'net': case 'drum': L.push([x, y + 8, 18, 'rgba(255,190,120,A)', 0.35]); break;
      case 'balloon': case 'ring': case 'goldfish': L.push([x, y + 6, 24, 'rgba(255,230,160,A)', 0.6]); break;
    }
  },
  drawCar(g, c, n) {
    const fl = c.v < 0, x = Math.round(c.x), y = Math.round(c.y);
    // 騎士
    Art.blit(g, Art.person(c.rider, 2, 0, 'sit'), x - 7, y - 19, fl);
    Art.blit(g, Art.scooter(c.col, n > 0.3), x - 10, y - 6, fl);
    if (n > 0.2) {
      const hx = fl ? x - 10 : x + 10;
      this.lightsList.push([hx + (fl ? -10 : 10), y - 2, 26, 'rgba(255,250,210,A)', 0.8]);
      this.lightsList.push([fl ? x + 9 : x - 9, y - 2, 8, 'rgba(255,60,60,A)', 0.8]);
    }
  },
  poseOf(a) {
    const moving = (a.path && a.path.length) || a.state === 'pass' || (a.state === 'queue' && a._mv);
    let pose = '', fr = moving ? Math.floor(a.anim) & 3 : 0, face = a.face || '';
    const out = this._po || (this._po = { pose: '', fr: 0, face: '', moving: false });
    if (a.kind === 's') {
      const job = a.s.job;
      if (job === 'cook' && a.atStation) { const rt = Game.rts.get(a.st); pose = rt ? Art.COOKPOSE[rt.st] || 'cook' : 'cook'; fr = rt && rt.cooking ? Math.floor(a.anim) & 3 : 0; }
      else if (a.poseK) { pose = a.poseK; if (pose !== 'carry' || !moving) fr = Math.floor(a.anim) & 3; }
      else if (job === 'tout' && a.atPost) { pose = 'call'; fr = Math.floor(a.anim) & 3; }
      if (a.jumpT > 0) face = 'happy';
      if (a.tired && !pose) face = 'sad';
      if (pose === 'carry' && !moving) fr = 0;
    } else if (a.sitting) { pose = a.sip ? 'sip' : 'eat'; fr = Math.floor(a.anim * 1.2) & 3; if (a.eatT < 1.2 && a.eatT > 0) face = a.yum || 'happy'; }
    else if (a.state === 'toSeat') pose = 'carry';
    if (a.state === 'queue' && a.wait > 14 && !face) face = 'sad';
    out.pose = pose; out.fr = fr; out.face = face; out.moving = !!moving;
    return out;
  },
  drawAgent(g, a, dim) {
    const { pose, fr, face, moving } = this.poseOf(a);
    const x = a.x + (a.ox || 0);
    let y = a.y + (a.oy || 0);
    if (a.jumpT > 0) y -= Math.abs(Math.sin(a.jumpT * 9)) * 4;
    let dir = a.dir;
    if (pose === 'carry' && !moving && dir === 1) dir = 0;
    let p = Art.person(a.look, dir, fr, pose, face);
    // 路人（不是客人）畫暗一點，讓畫面的層次分得出來
    if (dim && !a.asker) p = Art.dimmed(p);
    const bob = moving && (fr & 1) ? -1 : 0;
    const flip = dir === 2 && a.flip;
    if (a.sitting) Art.blit(g, p, x - 6, y - 19 + (Math.sin(a.anim * 2) > 0.7 ? 1 : 0), flip);
    else Art.blit(g, p, x - 6, y - 20 + bob, flip);
    if (a.look.balloon && !a.sitting) {
      const bx = Math.round(x + (flip ? -5 : 5)), by = Math.round(y - 30 + Math.sin(this.t * 2 + a.anim) * 1.5);
      g.fillStyle = '#e8e8e8'; g.fillRect(bx, by + 6, 1, 12);
      g.fillStyle = OUT; g.fillRect(bx - 3, by - 1, 7, 8); g.fillStyle = a.look.balloon; g.fillRect(bx - 2, by, 5, 6); g.fillStyle = '#ffffff'; g.fillRect(bx - 1, by + 1, 1, 2);
    }
    if (a.vip && a.state !== 'leave') {
      const sx = Math.round(x), sy = Math.round(y - 27 + Math.sin(this.t * 4) * 0.8);
      g.fillStyle = '#ffd040'; g.fillRect(sx - 3, sy + 1, 7, 2); g.fillRect(sx - 3, sy - 1, 1, 2); g.fillRect(sx, sy - 2, 1, 3); g.fillRect(sx + 3, sy - 1, 1, 2);
      this.lightsList.push([x, y - 12, 18, 'rgba(255,220,120,A)', 0.6]);
    }
    if (a.spicy > 0) { // 吃到辣的：頭上冒火
      const fx = Math.round(x), fy = Math.round(y - 24 - (1 - a.spicy) * 4);
      g.globalAlpha = Math.min(1, a.spicy * 2); g.fillStyle = '#ff5a1a'; g.fillRect(fx - 2, fy, 5, 3); g.fillRect(fx - 1, fy - 2, 3, 2); g.fillStyle = '#ffd040'; g.fillRect(fx - 1, fy + 1, 3, 2); g.globalAlpha = 1;
    }
  },

  // ---------- 天氣 ----------
  weatherFx(g, dt) {
    const wt = this.weather(), n = this.night();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const W = this.cv.width, H = this.cv.height, d = this.dpr;
    const want = wt === 'storm' ? 160 : wt === 'rain' ? 90 : wt === 'snow' ? 60 : wt === 'petal' || wt === 'leaf' ? 22 : wt === 'firefly' ? (n > 0.3 ? 26 : 0) : 0;
    if (this._wk !== wt) { this.wx = []; this._wk = wt; }
    while (this.wx.length < want) this.wx.push({ x: Math.random() * W, y: Math.random() * H, s: rnd(0.6, 1.4), p: rnd(TAU) });
    if (this.wx.length > want) this.wx.length = want;
    if (wt === 'rain' || wt === 'storm') {
      const wind = wt === 'storm' ? 0.45 : 0.15;
      g.strokeStyle = 'rgba(190,210,255,.45)'; g.lineWidth = Math.max(1, d * 0.8); g.beginPath();
      for (const p of this.wx) {
        p.y += dt * 520 * d * p.s; p.x += dt * 520 * d * p.s * wind;
        if (p.y > H) { p.y = -20; p.x = Math.random() * W; }
        if (p.x > W) p.x -= W;
        g.moveTo(p.x, p.y); g.lineTo(p.x - 7 * d * wind, p.y - 14 * d * p.s);
      }
      g.stroke();
      if (wt === 'storm' && Math.random() < dt * 0.15) this.flashA = Math.max(this.flashA, 0.5);
    } else if (wt === 'snow') {
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (const p of this.wx) { p.y += dt * 40 * d * p.s; p.x += Math.sin(this.t + p.p) * 0.4 * d; if (p.y > H) { p.y = -4; p.x = Math.random() * W; } g.fillRect(p.x, p.y, 2 * d * p.s, 2 * d * p.s); }
    } else if (wt === 'petal' || wt === 'leaf') {
      const cols = wt === 'petal' ? ['#ffc0d8', '#ffe0ec', '#ff9ac0'] : ['#e8902a', '#d86a2a', '#f0b040'];
      for (const p of this.wx) {
        p.y += dt * 26 * d * p.s; p.x += (Math.sin(this.t * 1.3 + p.p) * 18 + 10) * dt * d;
        if (p.y > H) { p.y = -4; p.x = Math.random() * W; } if (p.x > W) p.x = 0;
        g.fillStyle = cols[(p.p * 3 | 0) % 3]; const w = (1.5 + Math.abs(Math.sin(this.t * 3 + p.p))) * d * 1.4; g.fillRect(p.x, p.y, w, 2 * d);
      }
    } else if (wt === 'firefly') {
      g.globalCompositeOperation = 'lighter';
      for (const p of this.wx) {
        p.x += Math.sin(this.t * 0.7 + p.p) * 10 * dt * d; p.y += Math.cos(this.t * 0.9 + p.p * 2) * 8 * dt * d;
        const a = (0.5 + 0.5 * Math.sin(this.t * 3 + p.p * 5)) * n;
        g.fillStyle = `rgba(200,255,120,${a * 0.25})`; g.fillRect(p.x - 3 * d, p.y - 3 * d, 6 * d, 6 * d);
        g.fillStyle = `rgba(230,255,170,${a})`; g.fillRect(p.x - d, p.y - d, 2 * d, 2 * d);
      }
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
  },
  // ---------- 煙火 ----------
  fireworks(g, dt) {
    const S = Game.S, n = this.night(), W = this.cv.width, H = this.cv.height, d = this.dpr * Math.max(1.6, Math.min(2.6, this.W / 500));
    const on = n > 0.45 && (this.weather() === 'fireworks' || S.ev.some(e => e.host === 'fireworks' || e.host === 'gala'));
    this.fwT -= dt;
    if (on && this.fwT <= 0) {
      this.fwT = rnd(0.45, 1.4);
      const col = pick(['#ff5a7a', '#ffd040', '#5ad0ff', '#7affb0', '#ff8ad0', '#ffffff', '#c890ff']);
      this.fw.push({ x: rnd(0.08, 0.92) * W, y: H * 0.55, vy: -rnd(0.9, 1.2) * H * 0.55, t: 0, rocket: 1, col, ty: H * rnd(0.1, 0.3) });
    }
    for (const f of this.fw) {
      f.t += dt;
      if (f.rocket) { f.y += f.vy * dt; if (f.y <= f.ty) { f.dead = 1; const nn = 48, sp = rnd(48, 70) * d; for (let i = 0; i < nn; i++) { const a = i / nn * TAU, v = sp * rnd(0.85, 1); this.fw.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rnd(1.1, 1.6), col: f.col, sp: 1 }); } this.fw.push({ x: f.x, y: f.y, t: 0, life: 0.35, boom: 1, col: f.col }); if (Main.state === 'play' && Math.random() < 0.5) Snd.play('pop'); } }
      else if (f.sp) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 30 * d * dt; f.vx *= 1 - dt * 1.3; f.vy *= 1 - dt * 0.8; if (f.t > f.life) f.dead = 1; }
      else if (f.boom && f.t > f.life) f.dead = 1;
    }
    this.fw = this.fw.filter(f => !f.dead);
    if (!this.fw.length) return;
    g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
    const s = Math.max(1, Math.round(d));
    for (const f of this.fw) {
      if (f.rocket) { g.globalAlpha = 0.9; g.fillStyle = '#fff4c0'; g.fillRect(f.x, f.y, s, s * 3); }
      else if (f.sp) { const k = 1 - f.t / f.life; g.globalAlpha = k; g.fillStyle = f.col; g.fillRect(f.x, f.y, s * 1.6, s * 1.6); g.globalAlpha = k * 0.45; g.fillRect(f.x - f.vx * 0.05, f.y - f.vy * 0.05, s, s); g.fillRect(f.x - f.vx * 0.1, f.y - f.vy * 0.1, s, s); }
      else if (f.boom) { const k = 1 - f.t / f.life, r = 40 * d; g.globalAlpha = k * 0.5; g.drawImage(this.glowSprite(hexA(f.col)), f.x - r, f.y - r, r * 2, r * 2); }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  },
  // ---------- 燈光：夜晚把畫面調暗，燈的地方保留亮度，再加一點光暈 ----------
  glowSprite(col) {
    this._glow = this._glow || {};
    let c = this._glow[col];
    if (!c) {
      c = this._glow[col] = document.createElement('canvas'); c.width = c.height = 64;
      const q = c.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, col.replace('A', 1)); gr.addColorStop(0.4, col.replace('A', 0.5)); gr.addColorStop(1, col.replace('A', 0));
      q.fillStyle = gr; q.fillRect(0, 0, 64, 64);
    }
    return c;
  },
  // 不會動的燈（鄰居、路燈、帳篷、店裡燈泡串）先合成一張低解析度的燈光圖，每格只要貼一次
  staticLights() {
    const st = this._st, S = Game.S;
    if (st.lm) return st.lm;
    const L = st.lights.slice(), by = (S.H + 1) * TILE - 1;
    for (const lx of st.lamps) { L.push([lx + 6, by - 40, 70, 'rgba(255,236,190,A)', 0.6]); L.push([lx + 6, by - 4, 46, 'rgba(255,230,180,A)', 0.55]); }
    for (let y = 1; y < S.H; y += 3) for (let x = 1; x < S.W; x += 3) L.push([x * TILE + 8, y * TILE + 4, 40, 'rgba(255,200,140,A)', 0.3]);
    const k = 0.5, w = Math.ceil(st.c.width * k), h = Math.ceil(st.c.height * k);
    const m = document.createElement('canvas'), b = document.createElement('canvas');
    m.width = b.width = w; m.height = b.height = h;
    const q = m.getContext('2d'), bq = b.getContext('2d');
    q.setTransform(k, 0, 0, k, -st.X0 * k, -st.Y0 * k); bq.setTransform(k, 0, 0, k, -st.X0 * k, -st.Y0 * k); bq.globalCompositeOperation = 'lighter';
    for (const [x, y, r, col, a] of L) {
      const sp = this.glowSprite(col);
      q.globalAlpha = Math.min(1, a * 0.72); q.drawImage(sp, x - r, y - r, r * 2, r * 2);
      if (r <= 60) { bq.globalAlpha = Math.min(1, a * 0.34); bq.drawImage(sp, x - r * 0.5, y - r * 0.5, r, r); }
    }
    return (st.lm = { m, b });
  },
  lighting(g) {
    const n = this.night(), wt = this.weather(), dim = wt === 'rain' || wt === 'storm' ? 0.18 : 0;
    const dark = Math.min(1, n + dim);
    const lc = this.lc, bc = this.bc, bloom = this.q < 2;
    if (dark < 0.04) { if (!lc.hidden) { lc.hidden = true; bc.hidden = true; } return; }
    lc.hidden = false; bc.hidden = !bloom;
    const D = 3 * this.dpr, lw = Math.ceil(this.cv.width / D), lh = Math.ceil(this.cv.height / D);
    if (lc.width !== lw || lc.height !== lh) {
      for (const c of [lc, bc]) { c.width = lw; c.height = lh; c.style.width = (lw * D / this.dpr) + 'px'; c.style.height = (lh * D / this.dpr) + 'px'; }
    }
    const q = lc.getContext('2d'), b = bc.getContext('2d'), st = this._st, S = Game.S;
    q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'source-over'; q.globalAlpha = 1;
    q.clearRect(0, 0, lw, lh);
    q.fillStyle = `rgba(14,10,44,${0.72 * dark})`; q.fillRect(0, 0, lw, lh);
    const z = this.z / D;
    q.setTransform(z, 0, 0, z, -this.cam.x * z, -this.cam.y * z);
    // 鄰居那邊再暗一層（邊緣柔和），自己的店像打了聚光燈
    const W = S.W * TILE;
    if (!this._nbg || this._nbg.W !== W) {
      const gl = q.createLinearGradient(-40, 0, 0, 0); gl.addColorStop(0, 'rgba(6,2,22,1)'); gl.addColorStop(1, 'rgba(6,2,22,0)');
      const gr = q.createLinearGradient(W, 0, W + 40, 0); gr.addColorStop(0, 'rgba(6,2,22,0)'); gr.addColorStop(1, 'rgba(6,2,22,1)');
      this._nbg = { W, gl, gr };
    }
    // 天空不調暗
    q.clearRect(this.cam.x - 50, this.cam.y - 400, 9999, -this.cam.y + 400 - 104);
    q.globalCompositeOperation = 'destination-out';
    const lm = this.staticLights();
    q.drawImage(lm.m, st.X0, st.Y0, st.c.width, st.c.height);
    q.globalCompositeOperation = 'source-over'; q.globalAlpha = 0.42 * dark;
    q.fillStyle = 'rgba(6,2,22,1)'; q.fillRect(st.X0, -110, -40 - st.X0, 900); q.fillRect(W + 40, -110, st.X0 + st.c.width - W - 40, 900);
    q.fillStyle = this._nbg.gl; q.fillRect(-40, -110, 40, 900); q.fillStyle = this._nbg.gr; q.fillRect(W, -110, 40, 900);
    q.globalAlpha = 1; q.globalCompositeOperation = 'destination-out';
    if (bloom) {
      b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, lw, lh);
      b.setTransform(z, 0, 0, z, -this.cam.x * z, -this.cam.y * z); b.globalCompositeOperation = 'lighter';
      b.globalAlpha = dark; b.drawImage(lm.b, st.X0, st.Y0, st.c.width, st.c.height);
    }
    const vx0 = this.cam.x, vy0 = this.cam.y, vx1 = vx0 + this.cv.width / this.z, vy1 = vy0 + this.cv.height / this.z;
    for (const L of this.lightsList) {
      const x = L[0], y = L[1], r = L[2], a = L[4];
      if (x + r < vx0 || y + r < vy0 || x - r > vx1 || y - r > vy1) continue;
      const sp = this.glowSprite(L[3]);
      q.globalAlpha = Math.min(1, a * 0.72);
      q.drawImage(sp, x - r, y - r, r * 2, r * 2);
      if (bloom && r <= 60) { b.globalAlpha = Math.min(1, a * dark * 0.34); b.drawImage(sp, x - r * 0.5, y - r * 0.5, r, r); }
    }
  },

  // ---------- 特效 ----------
  effects(g) {
    for (const f of Game.fx) {
      const k = 1 - f.t / f.life;
      if (f.coin) {
        g.globalAlpha = Math.min(1, k * 3);
        const w = [5, 3, 1, 3][Math.floor(f.t * 14) & 3], x = Math.round(f.x), y = Math.round(f.y);
        g.fillStyle = OUT; g.fillRect(x - (w >> 1) - 1, y - 3, w + 2, 7);
        g.fillStyle = '#ffc020'; g.fillRect(x - (w >> 1), y - 2, w, 5); g.fillStyle = '#fff0a0'; g.fillRect(x - (w >> 1), y - 2, Math.max(1, w >> 1), 2);
      } else if (f.emo) {
        g.globalAlpha = Math.min(1, k * 2.5);
        const s = f.t < 0.15 ? 0.6 + f.t / 0.15 * 0.5 : 1.1 - Math.min(0.1, (f.t - 0.15));
        const ic = Art.icon(f.emo);
        g.drawImage(ic, Math.round(f.x - ic.width * s / 2), Math.round(f.y - ic.height * s / 2), ic.width * s, ic.height * s);
      } else if (f.ring) {
        g.globalAlpha = k; g.strokeStyle = f.col; g.lineWidth = 1.2;
        g.beginPath(); g.ellipse(f.x, f.y, 4 + (1 - k) * 20, (4 + (1 - k) * 20) * 0.55, 0, 0, TAU); g.stroke();
      } else if (f.conf) {
        g.globalAlpha = Math.min(1, k * 3); g.fillStyle = f.col;
        const w = Math.abs(Math.cos(f.t * 8 + f.rot)) * 2 + 0.5; g.fillRect(f.x - w / 2, f.y - 1, w, 2);
      } else if (f.steam) {
        g.globalAlpha = k * 0.75; g.fillStyle = f.col; const s = 1.5 + f.t * 3.2;
        g.beginPath(); g.arc(f.x + Math.sin(f.t * 3 + f.x) * 1.5, f.y, s, 0, TAU); g.fill();
      } else if (f.puff) {
        g.globalAlpha = k * 0.9; g.fillStyle = f.col; g.beginPath(); g.arc(f.x, f.y, 1 + (1 - k) * 3, 0, TAU); g.fill();
      } else if (f.ember) {
        g.globalAlpha = k; g.fillStyle = f.col; g.fillRect(f.x, f.y, 1, 1);
      } else {
        g.globalAlpha = Math.max(0, k);
        g.fillStyle = f.col;
        if (f.star) { g.fillRect(f.x - 1, f.y, 3, 1); g.fillRect(f.x, f.y - 1, 1, 3); }
        else g.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s);
      }
    }
    g.globalAlpha = 1;
    // 組合閃光
    for (const { a, b } of Game.combos) {
      const tw = (this.t * 1.3 + a.uid * 0.37) % 3;
      if (tw < 0.4) {
        const x = (a.x + b.x) / 2 * TILE + 8, y = (a.y + b.y) / 2 * TILE + 2, s = tw < 0.2 ? 1 : 2;
        g.fillStyle = '#fff8c0'; g.fillRect(x - s, y, s * 2 + 1, 1); g.fillRect(x, y - s, 1, s * 2 + 1);
      }
    }
    for (const f of Game.floats) {
      const k = f.t / 1.4, y = f.y - 12 * Math.min(1, f.t * 2);
      const sc = f.t < 0.12 ? 0.7 + f.t / 0.12 * 0.5 : f.t < 0.25 ? 1.2 - (f.t - 0.12) / 0.13 * 0.2 : 1;
      g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      this.txt(g, f.txt, f.x, y, f.big ? 8 : 6.5, f.col, 900, '#2b1b26', sc);
    }
    g.globalAlpha = 1;
  },
  bubbleAt(g, x, y, icon) {
    const c = Art.bubble(icon);
    g.drawImage(c, Math.round(x) - 11, Math.round(y) - 21);
  },
  // 頭上的泡泡：重要的先畫、互相重疊的就不畫，畫面才不會一團亂
  bubbles(g) {
    const list = this._bl || (this._bl = []); list.length = 0;
    for (const a of Game.cust) if (a.bub && a.bubT > 0) list.push(a);
    for (const a of Game.peds) if (a.bub && a.bubT > 0) list.push(a);
    for (const a of Game.srt.values()) if (a.bub && a.bubT > 0) list.push(a);
    const pr = a => a.asker ? 9 : a.vip ? 7 : a.react ? 6 : a.bub === 'angry' || a.bub === 'nocook' ? 5 : a.kind === 's' ? (a.bub === 'say' ? 3 : 4) : a.bub === 'say' ? 2 : 1;
    list.sort((p, q) => pr(q) - pr(p) || q.bubT - p.bubT);
    const rects = this._br || (this._br = []); rects.length = 0;
    const max = this.q ? 6 : 9;
    let shown = 0;
    for (const a of list) {
      if (shown >= max) break;
      const x = Math.round(a.x + (a.ox || 0)), y = Math.round(a.y + (a.oy || 0) - (a.sitting ? 18 : 22) + (a.asker ? Math.sin(this.t * 5) * 1.5 : 0));
      let w = 18, h = 16;
      if (a.bub === 'say') w = Math.ceil(this.txtW(a.say, 6)) + 8;
      const rx = x - w / 2, ry = y - h;
      let hit = false;
      for (let i = 0; i < rects.length; i += 4) if (rx < rects[i] + rects[i + 2] && rx + w > rects[i] && ry < rects[i + 1] + rects[i + 3] && ry + h > rects[i + 1]) { hit = true; break; }
      if (hit) continue;
      rects.push(rx, ry, w, h); shown++;
      g.globalAlpha = Math.min(1, a.bubT * 4);
      if (a.bub === 'say') {
        const xx = Math.round(rx), yy = y - 13;
        g.fillStyle = 'rgba(20,10,30,.35)'; g.fillRect(xx + 1, yy + 2, w, 11);
        g.fillStyle = OUT; g.fillRect(xx, yy + 1, w, 9); g.fillRect(xx + 1, yy, w - 2, 11);
        g.fillStyle = a.kind === 's' ? '#fff6c0' : '#ffffff'; g.fillRect(xx + 1, yy + 1, w - 2, 9); g.fillRect(xx + 2, yy + 1, w - 4, 9);
        g.fillStyle = OUT; g.fillRect(x - 1, yy + 11, 3, 2); g.fillStyle = a.kind === 's' ? '#fff6c0' : '#ffffff'; g.fillRect(x, yy + 10, 1, 2);
        this.txt(g, a.say, x, yy + 5.5, 6, a.react ? '#d8401a' : '#a8281f', 900);
      } else this.bubbleAt(g, x, y + 2, a.bub);
    }
    g.globalAlpha = 1;
    for (const c of Game.cust) if (c.vip && c.state !== 'eat') this.txt(g, CTYPES[c.type].n, c.x, c.y + 5, 5, '#ffe070', 700, '#2b1b26');
  },
  txtW(t, s) { const mc = this._mc || (this._mc = document.createElement('canvas').getContext('2d')); const k = t + s; const m = this._tw || (this._tw = new Map()); let w = m.get(k); if (w === undefined) { mc.font = `900 ${s * 4}px "Noto Sans TC",sans-serif`; w = mc.measureText(t).width / 4; if (m.size > 300) m.clear(); m.set(k, w); } return w; },
  // 新手引導建議的格子：一閃一閃＋上面有箭頭
  hintTile(g, [x, y]) {
    const k = (Math.sin(performance.now() / 180) + 1) / 2, X = x * TILE, Y = y * TILE;
    g.fillStyle = `rgba(255,214,64,${0.25 + k * 0.3})`; g.fillRect(X, Y, TILE, TILE);
    g.strokeStyle = '#ffd040'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, TILE - 1, TILE - 1);
    const ay = Y - 10 - k * 3;
    g.fillStyle = '#5a1a0a'; g.fillRect(X + 5, ay - 1, 6, 5); g.fillRect(X + 3, ay + 3, 10, 2); g.fillRect(X + 5, ay + 5, 6, 2); g.fillRect(X + 7, ay + 7, 2, 1);
    g.fillStyle = '#ffd040'; g.fillRect(X + 6, ay, 4, 4); g.fillRect(X + 4, ay + 4, 8, 1); g.fillRect(X + 6, ay + 5, 4, 1); g.fillRect(X + 7, ay + 6, 2, 1);
    this.txt(g, '放這裡', X + 8, ay - 5, 5.5, '#fff4c0', 900, '#5a1a0a');
  },
  ghostDraw(g) {
    const gh = this.ghost; if (!gh) return;
    const id = gh.id, f = F[id];
    const ok = gh.ok;
    g.fillStyle = ok ? 'rgba(120,255,160,.35)' : 'rgba(255,90,90,.35)';
    g.fillRect(gh.x * TILE, gh.y * TILE, TILE, TILE);
    g.strokeStyle = ok ? '#7affb0' : '#ff5a5a'; g.lineWidth = 1; g.strokeRect(gh.x * TILE + 0.5, gh.y * TILE + 0.5, TILE - 1, TILE - 1);
    if (f.cat === 'floor') { if (id !== 'f_none') { g.globalAlpha = 0.7; Art.blit(g, Art.floor(id, 0), gh.x * TILE, gh.y * TILE); g.globalAlpha = 1; } return; }
    g.globalAlpha = 0.75;
    const h = Art.facH(id);
    Art.blit(g, Art.fac(id, 0, gh.lv || 1), gh.x * TILE, (gh.y + 1) * TILE - h);
    g.globalAlpha = 1;
    if (ok) {
      for (const o of Game.S.items) {
        if (Math.abs(o.x - gh.x) > 1 || Math.abs(o.y - gh.y) > 1) continue;
        const c = COMBOS.find(c => (c.a === id && c.b === o.id) || (c.b === id && c.a === o.id));
        if (c && Game.S.combos[c.id]) { this.txt(g, '★' + c.n, gh.x * TILE + 8, gh.y * TILE - h + 6, 6, '#ffe070', 900, '#2b1b26'); break; }
      }
    }
  },
};
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = lerp(pa >> 16, pb >> 16, t) | 0, g = lerp((pa >> 8) & 255, (pb >> 8) & 255, t) | 0, bl = lerp(pa & 255, pb & 255, t) | 0;
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
function hexA(hex) { const p = parseInt(hex.slice(1), 16); return `rgba(${p >> 16},${(p >> 8) & 255},${p & 255},A)`; }
