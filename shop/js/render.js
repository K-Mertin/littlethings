'use strict';
// 夜市小吃王：畫面（天空、街景、店面、人物、燈光、天氣、特效）
const NB_SHOPS = ['阿婆鐵蛋', '老牌甘蔗汁', '正宗鹽酥雞', '彈珠汽水', '古早味粉圓', '臭豆腐王', '嘉義雞肉飯', '手工麻糬', '烤玉米專賣', '八寶冰', '滷味大王', '麻辣燙', '豆花伯', '蚵嗲', '當歸鴨', '青草茶'];
const NB_VSIGN = ['藥局', '鐘錶', '冰店', '茶行', '旅社', '眼鏡', '麵館', '金飾', '書局', '牛排', '早餐', '果汁'];
const NB_STALL = [['fryer', '臭'], ['grill', '香'], ['drink', '甘'], ['soup', '滷'], ['ice', '冰'], ['steam', '包'], ['griddle', '餅']];
const R = {
  cv: null, g: null, dpr: 1, W: 0, H: 0, z: 2, cam: { x: 0, y: 0 }, zoomMul: 1, pan: { x: 0, y: 0 }, top: 56, bottom: 64, left: 0, right: 0, t: 0,
  hover: null, ghost: null, fw: [], wx: [], fwT: 0, flashA: 0,
  init(cv) {
    this.cv = cv; this.g = cv.getContext('2d');
    this.lc = $('#lt'); this.bc = $('#bl'); this.fc = $('#fxc'); this.fg = this.fc.getContext('2d');
  },
  resize() {
    const dpr = this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.W = innerWidth; this.H = innerHeight;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
    this.fc.width = this.cv.width; this.fc.height = this.cv.height; this.fc.style.width = this.W + 'px'; this.fc.style.height = this.H + 'px';
    this.wx = []; this._skyKey = '';
  },
  bounds() {
    const S = Game.S, m = this.W < this.H ? 0.6 : 1.5, short = this.H < 520;
    return { x0: -m * TILE, x1: (S.W + m) * TILE, y0: short ? -40 : -54, y1: (S.H + (short ? 2.2 : 3)) * TILE + 2 };
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
  fh() { return [30, 36, 46, 50, 54, 58][Game.S.lv]; },
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
      for (let i = 0; i < 70; i++) {
        const x = hash(i, 1, 5) * this.cv.width, y = hash(i, 2, 5) * this.cv.height * 0.4, tw = Math.sin(this.t * (1 + hash(i, 3, 5) * 2) + i);
        g.fillStyle = `rgba(255,255,230,${(n - 0.3) * (0.6 + tw * 0.4)})`;
        g.fillRect(x | 0, y | 0, s * (i % 9 === 0 ? 2 : 1), s * (i % 9 === 0 ? 2 : 1));
      }
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
    const S = Game.S, x0 = -24 * TILE, x1 = (S.W + 24) * TILE, n = Math.round(this.night() * 6) / 6;
    const key = S.W + ':' + n;
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
  // ---------- 街景（快取：鄰居店面、空地、人行道、馬路、對面的攤子） ----------
  streetKey() { const S = Game.S; return [S.W, S.H, S.lv].join(':'); },
  buildStreet() {
    const S = Game.S, W = S.W * TILE, Hh = S.H * TILE, X0 = -24 * TILE, X1 = W + 24 * TILE, Y0 = -100, Y1 = Hh + 16 + 44 + 90;
    const c = this._st?.c || document.createElement('canvas');
    c.width = X1 - X0; c.height = Y1 - Y0;
    const q = c.getContext('2d'); q.clearRect(0, 0, c.width, c.height); q.imageSmoothingEnabled = false;
    q.save(); q.translate(-X0, -Y0);
    const R2 = (x, y, w, h, col) => { q.fillStyle = col; q.fillRect(x, y, w, h); };
    const lights = [], texts = [], npcs = [], stalls = [];
    // 鄰居店面（兩層樓的街屋）
    let k = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++, k++) {
        const bw = 48, bx = side < 0 ? -(i + 1) * bw : W + i * bw, hh = 66 + ((hash(i, side, 3) * 4) | 0) * 7;
        const wall = ['#c8b8a0', '#a8b0b8', '#c0a090', '#9ab0a4', '#c4a8b0', '#b8b0c8'][(i * 2 + (side > 0 ? 1 : 0)) % 6];
        R2(bx, -hh, bw, hh, wall); R2(bx, -hh, bw, 3, shade(wall, -0.25)); R2(bx, -hh + 3, bw, 1, shade(wall, 0.2));
        R2(bx + bw - 1, -hh, 1, hh, shade(wall, -0.18));
        // 二樓窗戶、冷氣
        for (let w2 = 0; w2 < 2; w2++) {
          const wx = bx + 7 + w2 * 22, wy = -hh + 10;
          R2(wx - 1, wy - 1, 14, 14, shade(wall, -0.3)); R2(wx, wy, 12, 12, '#2a3048');
          const lit = hash(i * 7 + w2, side, 11) < 0.6;
          if (lit) { R2(wx, wy, 12, 12, hash(i, w2, 13) < 0.5 ? '#ffd890' : '#ffe8b8'); lights.push([wx + 6, wy + 6, 18, 'rgba(255,210,140,A)', 0.5]); }
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
        lights.push([bx + bw / 2, -12, 40, 'rgba(255,200,130,A)', 0.75]);
        // 招牌橫條
        const sc = ['#e8302a', '#2a6ad8', '#2f9a4a', '#f0a020', '#c03ab0', '#1a8a8a'][(i * 5 + (side > 0 ? 3 : 0)) % 6];
        R2(bx + 1, -40, bw - 2, 10, shade(sc, -0.35)); R2(bx + 2, -39, bw - 4, 8, sc); R2(bx + 2, -39, bw - 4, 1, shade(sc, 0.35));
        texts.push({ x: bx + bw / 2, y: -35, t: NB_SHOPS[(k * 7 + 3) % NB_SHOPS.length], c: '#ffffff', s: 5.5 });
        lights.push([bx + bw / 2, -35, 26, hexA(sc), 0.55]);
        // 直式招牌
        if (hash(i, side, 31) < 0.7) {
          const vx = side < 0 ? bx + 2 : bx + bw - 12, vy = -hh + 8, vc = ['#ff4a6a', '#ffd040', '#5ad0ff', '#7affb0', '#ff8ad0'][(i + k) % 5];
          R2(vx, vy, 10, 32, '#2a2036'); R2(vx + 1, vy + 1, 8, 30, '#fff6dc'); R2(vx, vy, 10, 1, vc); R2(vx, vy + 31, 10, 1, vc); R2(vx, vy, 1, 32, vc); R2(vx + 9, vy, 1, 32, vc);
          R2(side < 0 ? vx + 10 : vx - 2, vy + 4, 2, 2, '#5a5a64'); R2(side < 0 ? vx + 10 : vx - 2, vy + 26, 2, 2, '#5a5a64');
          texts.push({ x: vx + 5, y: vy + 16, t: NB_VSIGN[(k * 3 + 1) % NB_VSIGN.length], c: '#c8302a', s: 6, v: 1 });
          lights.push([vx + 5, vy + 16, 34, hexA(vc), 0.6]);
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
        lights.push([x + 8, y + TILE - h + 9, 30, 'rgba(255,214,140,A)', 0.7]);
        Art.blit(q, Art.person(makeLook(900 + v * 13 + (side > 0 ? 7 : 0), 'staff', 'cook'), 0, 1, 'cook'), x + 2, y - 21);
        Art.blit(q, Art.fac(st, v & 1, 1 + v % 2), x, y + TILE - h);
      } else if (what === 'table') { Art.blit(q, Art.fac(v % 2 ? 'stool' : 'wood', 0, 1), x, y + TILE - Art.facH(v % 2 ? 'stool' : 'wood')); }
      else Art.blit(q, Art.prop(v), x, y);
    };
    for (const side of [-1, 1]) {
      const o = side < 0 ? 0 : 3;
      lot(side, 2, 1, 'stall', 0 + o); lot(side, 6, 1, 'stall', 2 + o); lot(side, 10, 1, 'stall', 4 + o);
      lot(side, 2, 3, 'table', 1); lot(side, 4, 3, 'table', 0 + o); lot(side, 7, 3, 'table', 1);
      lot(side, 9, 3, 'prop', 0); lot(side, 0, 2, 'prop', 2 + (o ? 2 : 0)); lot(side, 8, 2, 'prop', 3);
      lot(side, 12, 2, 'prop', 1); lot(side, 13, 3, 'prop', 0); lot(side, 14, 1, 'stall', 6 + o);
      if (S.H >= 6) { lot(side, 3, 5, 'prop', 1); lot(side, 8, 5, 'table', 0); lot(side, 5, 5, 'prop', 4); }
      if (S.H >= 8) { lot(side, 2, 7, 'stall', 1 + o); lot(side, 6, 7, 'table', 1); lot(side, 10, 6, 'prop', 0); }
      // 鄰居那邊暗一點，讓自己的店比較顯眼
      const lx = side < 0 ? -22 * TILE : W;
      R2(lx, -100, 22 * TILE, Hh + 100, 'rgba(26,18,48,.26)');
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
    let ti = 0;
    for (let x = X0; x < X1; ti++) {
      const tw = 40 + ((hash(ti, 1, 71) * 3) | 0) * 8, ty = oy + 14, cs = [['#e8473b', '#fff4e8'], ['#3a8ad8', '#e8f4ff'], ['#f0a020', '#fff4c8'], ['#3a9a5a', '#eaffea'], ['#ff6fa8', '#fff0f6'], ['#8a5ac8', '#f4eaff']][(ti * 5) % 6];
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
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const t of st.texts) {
      g.font = `900 ${t.s}px "Noto Sans TC","PingFang TC",sans-serif`; g.fillStyle = t.c;
      if (t.v) { const ch = [...t.t]; ch.forEach((c, i) => g.fillText(c, t.x, t.y + (i - (ch.length - 1) / 2) * 7.2)); }
      else g.fillText(t.t, t.x, t.y + 0.5);
    }
    g.font = '900 5px "Noto Sans TC",sans-serif'; g.fillStyle = 'rgba(160,30,26,.85)';
    for (const s2 of st.stalls) { g.fillText(s2.ch, s2.x + 8, s2.y + 21.7); if (Math.random() < 0.03) Game.steam(s2.x + 8 + rnd(-4, 4), s2.y + 12, s2.st); }
    for (const L of st.lights) this.lightsList.push(L);
  },
  // ---------- 自己的店面 ----------
  facade(g) {
    const S = Game.S, W = S.W * TILE, lv = S.lv, n = this.night(), fh = this.fh();
    const wall = ['#c8a888', '#e8d0a8', '#f4e0c0', '#e8c8a0', '#d8b090', '#c89878'][lv];
    g.fillStyle = wall; g.fillRect(0, -fh, W, fh);
    g.fillStyle = shade(wall, -0.22); g.fillRect(0, -3, W, 3); g.fillRect(W - 1, -fh, 1, fh);
    g.fillStyle = shade(wall, 0.15); g.fillRect(0, -fh, W, 1);
    // 屋簷瓦片
    if (lv >= 1) { g.fillStyle = '#8a3a2a'; g.fillRect(-2, -fh - 2, W + 4, 4); for (let x = -2; x < W + 2; x += 4) { g.fillStyle = '#a84a3a'; g.fillRect(x, -fh + 2, 3, 2); } }
    // 二樓窗戶
    if (lv >= 2) for (let x = 8; x < W - 14; x += 24) {
      g.fillStyle = shade(wall, -0.3); g.fillRect(x - 1, -fh + 7, 14, 12);
      g.fillStyle = n > .35 ? '#ffe0a0' : '#a8d0e8'; g.fillRect(x, -fh + 8, 12, 10);
      g.fillStyle = '#7a5a3a'; g.fillRect(x + 6, -fh + 8, 1, 10); g.fillRect(x, -fh + 13, 12, 1);
      g.fillStyle = '#c8302a'; g.fillRect(x - 2, -fh + 18, 16, 2);
      if (n > .35) this.lightsList.push([x + 6, -fh + 13, 18, 'rgba(255,214,150,A)', 0.6]);
    }
    // 招牌（周圍有跑馬燈）
    const sw = Math.min(W - 8, 34 + S.shop.length * 10 + lv * 6), sx = Math.round((W - sw) / 2), sy = -fh + (lv >= 2 ? 22 : 6), shh = 14;
    g.fillStyle = '#5a2a1a'; g.fillRect(sx - 2, sy - 2, sw + 4, shh + 4);
    g.fillStyle = lv >= 3 ? '#c8202a' : '#d84a2a'; g.fillRect(sx, sy, sw, shh);
    g.fillStyle = shade(lv >= 3 ? '#c8202a' : '#d84a2a', 0.2); g.fillRect(sx, sy, sw, 2);
    if (lv >= 4) { g.fillStyle = '#ffd040'; g.fillRect(sx, sy, sw, 1); g.fillRect(sx, sy + shh - 1, sw, 1); }
    const ph = Math.floor(this.t * 6);
    for (let x = sx - 1, i = 0; x < sx + sw + 1; x += 3, i++) { const on = (i + ph) % 3 === 0; g.fillStyle = on ? '#fff6b0' : '#c89a40'; g.fillRect(x, sy - 2, 1, 1); g.fillRect(x, sy + shh + 1, 1, 1); }
    g.font = '900 9.5px "Noto Sans TC","PingFang TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#5a1a0a'; g.fillText(S.shop, W / 2 + 0.6, sy + shh / 2 + 1.6);
    g.fillStyle = '#fff4c0'; g.fillText(S.shop, W / 2, sy + shh / 2 + 1);
    this.lightsList.push([W / 2, sy + shh / 2, 48 + sw * 0.4, 'rgba(255,110,70,A)', 0.75]);
    // 雨棚
    const ay = -9;
    for (let x = 0; x < W; x += 8) { g.fillStyle = (x / 8) & 1 ? '#fff4e8' : '#e8473b'; g.fillRect(x, ay, 8, 6); g.fillStyle = (x / 8) & 1 ? '#f0e0d0' : '#c8302a'; g.fillRect(x, ay + 6, 8, 1); g.fillRect(x + 2, ay + 7, 4, 1); }
    g.fillStyle = '#a8302a'; g.fillRect(0, ay - 1, W, 1);
    // 燈籠串
    const ly = -fh - 6, sag = (x) => Math.sin((x + 40) / (W + 80) * Math.PI * 3) * 2.5;
    g.strokeStyle = '#2a1a2a'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-40, ly + 3);
    for (let x = -40; x <= W + 40; x += 4) g.lineTo(x, ly + sag(x) + 3);
    g.stroke();
    const fest = Game.month() === 2 || Game.month() === 12;
    for (let x = -36, i = 0; x <= W + 36; x += 13, i++) {
      const y = ly + sag(x) + 4, sw2 = Math.sin(this.t * 1.6 + i) * 0.6;
      const col = fest && Game.month() === 12 ? ['#ff4a3a', '#3fc05a', '#ffd040', '#5ad0ff'][i % 4] : ['#ff4a3a', '#ffb020', '#ff4a3a', '#ff6fa8'][i % 4];
      g.fillStyle = col; g.fillRect(x - 2 + sw2, y, 5, 5); g.fillRect(x - 3 + sw2, y + 1, 7, 3);
      g.fillStyle = shade(col, 0.4); g.fillRect(x - 1 + sw2, y + 1, 1, 3);
      g.fillStyle = '#ffd040'; g.fillRect(x - 1 + sw2, y - 1, 3, 1); g.fillRect(x - 1 + sw2, y + 5, 3, 1); g.fillRect(x + sw2, y + 6, 1, 2);
      this.lightsList.push([x + sw2 + 0.5, y + 2.5, 14, col === '#3fc05a' ? 'rgba(120,255,140,A)' : 'rgba(255,140,80,A)', 0.8]);
    }
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
      this._fl = { key: fk, c };
    }
    g.drawImage(this._fl.c, 0, 0);
    // 店裡頭頂的燈泡串：晚上整間店暖暖的
    for (let y = 1; y < H; y += 3) for (let x = 1; x < W; x += 3) this.lightsList.push([x * TILE + 8, y * TILE + 4, 40, 'rgba(255,200,140,A)', 0.3]);
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
  objects(g) {
    const S = Game.S, list = [], fr = Math.floor(this.t * 3), st = this._st, n = this.night();
    for (const it of S.items) if (!(UI.carry && UI.carry.it === it)) list.push({ y: (it.y + 1) * TILE - 0.1, it });
    for (const c of Game.cust) list.push({ y: c.y + (c.oy || 0), a: c });
    for (const c of Game.peds) list.push({ y: c.y + (c.oy || 0), a: c });
    for (const a of Game.srt.values()) list.push({ y: a.y + 0.05 + (a.oy || 0), a });
    for (const c of Game.cars) list.push({ y: c.y + 6, car: c });
    for (const lx of st.lamps) list.push({ y: (S.H + 1) * TILE - 1, lamp: lx });
    list.sort((p, q) => p.y - q.y);
    // 影子先畫
    for (const o of list) {
      if (o.it) { const f = F[o.it.id]; this.shadow(g, o.it.x * TILE + 8, (o.it.y + 1) * TILE - 1, f.cat === 'floor' ? 0 : 18); }
      else if (o.a && !o.a.sitting) this.shadow(g, o.a.x + (o.a.ox || 0), o.a.y + (o.a.oy || 0), 11);
      else if (o.car) this.shadow(g, o.car.x, o.car.y + 6, 22);
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const o of list) {
      if (o.it) {
        const it = o.it, f = F[it.id], h = Art.facH(it.id);
        const cooking = f.cat === 'station' && Game.rts.get(it.uid)?.cooking;
        const c = Art.fac(it.id, f.cat === 'station' ? (cooking ? fr : (fr & 2 ? 2 : 0)) : fr, it.lv);
        const top = (it.y + 1) * TILE - h;
        Art.blit(g, c, it.x * TILE, top);
        if (it.dirty) { Art.blit(g, Art.dirt(), it.x * TILE + 2, it.y * TILE + (it.id === 'bench' ? 4 : 2)); if (it.dirty > 1) Art.blit(g, Art.dirt(), it.x * TILE + 5, it.y * TILE + 5); }
        if (f.cat === 'station') {
          g.font = '900 5px "Noto Sans TC","PingFang TC",sans-serif'; g.fillStyle = '#b8201a';
          g.fillText(Art.STCH[f.st], it.x * TILE + 8, top + 21.7);
          this.lightsList.push([it.x * TILE + 8, top + 10, 34, 'rgba(255,214,140,A)', 0.9]);
          const rt = Game.rts.get(it.uid);
          if (rt && rt.prog > 0) { g.fillStyle = '#2b1b26'; g.fillRect(it.x * TILE + 1, top + 11, 14, 3); g.fillStyle = '#7affb0'; g.fillRect(it.x * TILE + 2, top + 12, 12 * rt.prog, 1); }
          if (rt && rt.queue.length && !rt.cook) this.bubbleAt(g, it.x * TILE + 8, top - 6, 'nocook', 1);
          else if (rt && !rt.front) this.bubbleAt(g, it.x * TILE + 8, top - 6, 'angry', 1);
        } else this.itemLight(it);
        if (it.id === 'vsign') { g.font = '900 5.5px "Noto Sans TC","PingFang TC",sans-serif'; g.fillStyle = '#c8302a'; const ch = [...S.shop.slice(0, 3)]; ch.forEach((cc, i) => g.fillText(cc, it.x * TILE + 8, top + 5 + i * 6.2)); }
        if (it.id === 'banner') { g.font = '900 5px "Noto Sans TC",sans-serif'; g.fillStyle = '#c8302a'; g.fillText('好', it.x * TILE + 7.5, top + 5.5); g.fillText('吃', it.x * TILE + 7.5, top + 11.5); }
      } else if (o.stall) {
        const s2 = o.stall, cook = Math.floor(this.t * 2 + s2.x) & 1;
        Art.blit(g, Art.fac(s2.st, cook ? 1 : 0, s2.lv), s2.x, s2.y);
        g.font = '900 5px "Noto Sans TC",sans-serif'; g.fillStyle = '#b8201a'; g.fillText(s2.ch, s2.x + 8, s2.y - 2.2);
        if (Math.random() < 0.04) Game.steam(s2.x + 8 + rnd(-4, 4), s2.y + 12, s2.st);
      } else if (o.npc) {
        const p = o.npc, f2 = Math.floor(this.t * 3 + p.ph) & 3;
        Art.blit(g, Art.person(p.look, 0, f2, 'cook'), p.x - 6, p.y - 20);
      } else if (o.lamp) {
        const x = o.lamp, by = (S.H + 1) * TILE - 1;
        g.fillStyle = '#3a3a48'; g.fillRect(x - 1, by - 46, 2, 46); g.fillRect(x - 2, by - 3, 4, 3);
        g.fillStyle = '#4a4a5a'; g.fillRect(x - 1, by - 46, 8, 2); g.fillStyle = n > 0.2 ? '#fff8d8' : '#c8c8d0'; g.fillRect(x + 4, by - 44, 4, 2);
        this.lightsList.push([x + 6, by - 40, 70, 'rgba(255,236,190,A)', 0.6]);
        this.lightsList.push([x + 6, by - 4, 46, 'rgba(255,230,180,A)', 0.55]);
      } else if (o.car) this.drawCar(g, o.car, n);
      else this.drawAgent(g, o.a);
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
      case 'balloon': case 'ring': case 'goldfish': L.push([x, y + 6, 24, 'rgba(255,230,160,A)', 0.6]); break;
    }
  },
  drawCar(g, c, n) {
    const fl = c.v < 0, x = Math.round(c.x), y = Math.round(c.y);
    // 騎士
    Art.blit(g, Art.person(c.rider, 2, 0, 'sit'), x - 7, y - 19, fl);
    g.save(); g.translate(x, y); if (fl) g.scale(-1, 1);
    g.fillStyle = OUT; g.fillRect(-10, -2, 21, 4); g.fillRect(-9, 0, 6, 6); g.fillRect(4, 0, 6, 6);
    g.fillStyle = '#2a2a30'; g.fillRect(-8, 1, 4, 4); g.fillRect(5, 1, 4, 4); g.fillStyle = '#9a9aa8'; g.fillRect(-7, 2, 2, 2); g.fillRect(6, 2, 2, 2);
    g.fillStyle = c.col; g.fillRect(-8, -4, 9, 4); g.fillRect(3, -8, 5, 7); g.fillRect(1, -2, 8, 2);
    g.fillStyle = shade(c.col, 0.3); g.fillRect(-8, -4, 9, 1); g.fillRect(3, -8, 5, 1);
    g.fillStyle = shade(c.col, -0.3); g.fillRect(-8, -1, 17, 1);
    g.fillStyle = '#3a3a44'; g.fillRect(-7, -5, 7, 1); g.fillRect(6, -10, 1, 2); g.fillRect(5, -10, 3, 1);
    g.fillStyle = n > 0.3 ? '#fff8c0' : '#e8e0a0'; g.fillRect(8, -7, 2, 2);
    g.fillStyle = '#ff4a3a'; g.fillRect(-9, -3, 1, 2);
    g.restore();
    if (n > 0.2) {
      const hx = fl ? x - 10 : x + 10;
      this.lightsList.push([hx + (fl ? -10 : 10), y - 2, 26, 'rgba(255,250,210,A)', 0.8]);
      this.lightsList.push([fl ? x + 9 : x - 9, y - 2, 8, 'rgba(255,60,60,A)', 0.8]);
    }
  },
  poseOf(a) {
    const moving = (a.path && a.path.length) || a.state === 'pass' || (a.state === 'queue' && a._mv);
    let pose = '', fr = moving ? Math.floor(a.anim) & 3 : 0, face = a.face || '';
    if (a.kind === 's') {
      const job = a.s.job;
      if (job === 'cook' && a.atStation) { pose = 'cook'; fr = Game.rts.get(a.st)?.cooking ? Math.floor(a.anim) & 3 : 0; }
      else if (a.poseK) { pose = a.poseK; if (pose !== 'carry' || !moving) fr = Math.floor(a.anim * (pose === 'carry' ? 1 : 1)) & 3; }
      else if (job === 'tout' && a.atPost) { pose = 'call'; fr = Math.floor(a.anim) & 3; }
      if (a.tired && !pose) face = 'sad';
      if (pose === 'carry' && !moving) fr = 0;
    } else if (a.sitting) { pose = 'eat'; fr = Math.floor(a.anim * 1.2) & 3; }
    else if (a.state === 'toSeat') pose = 'carry';
    if (a.state === 'queue' && a.wait > 14 && !face) face = 'sad';
    return { pose, fr, face, moving };
  },
  drawAgent(g, a) {
    const { pose, fr, face, moving } = this.poseOf(a);
    const x = a.x + (a.ox || 0), y = a.y + (a.oy || 0);
    let dir = a.dir;
    if (pose === 'carry' && !moving && dir === 1) dir = 0;
    const p = Art.person(a.look, dir, fr, pose, face);
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
  lighting(g) {
    const n = this.night(), wt = this.weather(), dim = wt === 'rain' || wt === 'storm' ? 0.18 : 0;
    const dark = Math.min(1, n + dim);
    const lc = this.lc, bc = this.bc;
    if (dark < 0.04) { if (!lc.hidden) { lc.hidden = true; bc.hidden = true; } return; }
    lc.hidden = false; bc.hidden = false;
    const D = 3 * this.dpr, lw = Math.ceil(this.cv.width / D), lh = Math.ceil(this.cv.height / D);
    if (lc.width !== lw || lc.height !== lh) {
      for (const c of [lc, bc]) { c.width = lw; c.height = lh; c.style.width = (lw * D / this.dpr) + 'px'; c.style.height = (lh * D / this.dpr) + 'px'; }
    }
    const q = lc.getContext('2d'), b = bc.getContext('2d');
    q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'source-over'; q.globalAlpha = 1;
    q.clearRect(0, 0, lw, lh);
    q.fillStyle = `rgba(14,10,44,${0.72 * dark})`; q.fillRect(0, 0, lw, lh);
    const z = this.z / D;
    q.setTransform(z, 0, 0, z, -this.cam.x * z, -this.cam.y * z);
    // 天空不調暗
    q.clearRect(this.cam.x - 50, this.cam.y - 400, 9999, -this.cam.y + 400 - 104);
    q.globalCompositeOperation = 'destination-out';
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, lw, lh);
    b.setTransform(z, 0, 0, z, -this.cam.x * z, -this.cam.y * z); b.globalCompositeOperation = 'lighter';
    const vx0 = this.cam.x, vy0 = this.cam.y, vx1 = vx0 + this.cv.width / this.z, vy1 = vy0 + this.cv.height / this.z;
    for (const L of this.lightsList) {
      const [x, y, r, col, a] = L;
      if (x + r < vx0 || y + r < vy0 || x - r > vx1 || y - r > vy1) continue;
      const sp = this.glowSprite(col);
      q.globalAlpha = Math.min(1, a * 0.72);
      q.drawImage(sp, x - r, y - r, r * 2, r * 2);
      if (r <= 60) { b.globalAlpha = Math.min(1, a * dark * 0.34); b.drawImage(sp, x - r * 0.5, y - r * 0.5, r, r); }
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
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const f of Game.floats) {
      const k = f.t / 1.4, y = f.y - 12 * Math.min(1, f.t * 2);
      const sc = f.t < 0.12 ? 0.7 + f.t / 0.12 * 0.5 : f.t < 0.25 ? 1.2 - (f.t - 0.12) / 0.13 * 0.2 : 1;
      g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      g.font = `700 ${(f.big ? 8 : 6.5) * sc}px "Silkscreen","Noto Sans TC",monospace`;
      g.fillStyle = '#2b1b26'; for (const [ox, oy] of [[-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.7]]) g.fillText(f.txt, f.x + ox, y + oy);
      g.fillStyle = f.col; g.fillText(f.txt, f.x, y);
    }
    g.globalAlpha = 1;
  },
  bubbleAt(g, x, y, icon, small) {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = OUT; g.fillRect(x - 6, y - 12, 13, 11); g.fillRect(x - 7, y - 11, 15, 9); g.fillRect(x - 1, y - 1, 3, 2);
    g.fillStyle = '#ffffff'; g.fillRect(x - 5, y - 11, 11, 9); g.fillRect(x - 6, y - 10, 13, 7); g.fillRect(x, y - 2, 1, 1);
    const ic = Art.icon(icon);
    Art.blit(g, ic, x - 4, y - 10);
  },
  bubbles(g) {
    const list = [];
    for (const a of Game.cust) if (a.bub && a.bubT > 0) list.push(a);
    for (const a of Game.peds) if (a.bub && a.bubT > 0) list.push(a);
    for (const a of Game.srt.values()) if (a.bub && a.bubT > 0) list.push(a);
    // 太多泡泡會很亂：只畫最重要的一些
    list.sort((p, q) => (q.asker ? 9 : q.kind === 's' ? 2 : 0) - (p.asker ? 9 : p.kind === 's' ? 2 : 0));
    let shown = 0;
    for (const a of list) {
      if (shown++ > 16) break;
      const x = a.x + (a.ox || 0), y = a.y + (a.oy || 0) - (a.sitting ? 18 : 22);
      g.globalAlpha = Math.min(1, a.bubT * 4);
      if (a.bub === 'say') {
        g.font = '700 6px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const w = Math.ceil(g.measureText(a.say).width) + 6, xx = Math.round(x), yy = Math.round(y);
        g.fillStyle = OUT; g.fillRect(xx - w / 2 - 1, yy - 11, w + 2, 10); g.fillRect(xx - w / 2, yy - 12, w, 12); g.fillStyle = '#fff6c0'; g.fillRect(xx - w / 2, yy - 11, w, 8); g.fillRect(xx - 1, yy - 3, 2, 2);
        g.fillStyle = '#c8302a'; g.fillText(a.say, xx, yy - 6.5);
      } else this.bubbleAt(g, x, y + (a.asker ? Math.sin(this.t * 5) * 1.5 : 0), a.bub);
    }
    g.globalAlpha = 1;
    for (const c of Game.cust) if (c.vip && c.state !== 'eat') {
      g.font = '700 5px "Noto Sans TC",sans-serif'; g.textAlign = 'center';
      g.fillStyle = '#2b1b26'; g.fillText(CTYPES[c.type].n, c.x + 0.4, c.y + 5.4); g.fillStyle = '#ffe070'; g.fillText(CTYPES[c.type].n, c.x, c.y + 5);
    }
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
        if (c && Game.S.combos[c.id]) { g.fillStyle = '#ffe070'; g.font = '700 6px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText('★' + c.n, gh.x * TILE + 8, gh.y * TILE - h + 10); break; }
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
