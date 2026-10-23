'use strict';
// 夜市小吃王：畫面（天空、店面、地板、人物、燈光）
const R = {
  cv: null, g: null, dpr: 1, W: 0, H: 0, z: 2, cam: { x: 0, y: 0 }, zoomMul: 1, pan: { x: 0, y: 0 }, top: 56, bottom: 64, left: 0, right: 0, t: 0,
  hover: null, ghost: null,
  init(cv) { this.cv = cv; this.g = cv.getContext('2d'); },
  resize() {
    const dpr = this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.W = innerWidth; this.H = innerHeight;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
  },
  bounds() {
    const S = Game.S, m = this.W < this.H ? 0.6 : 1.5, short = this.H < 520;
    return { x0: -m * TILE, x1: (S.W + m) * TILE, y0: short ? -34 : -48, y1: (S.H + (short ? 2.2 : 3)) * TILE + 2 };
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

  draw(dt) {
    this.t += dt;
    const g = this.g, S = Game.S;
    if (!S) return;
    this.updateCam();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    this.sky(g);
    g.setTransform(this.z, 0, 0, this.z, -this.cam.x * this.z, -this.cam.y * this.z);
    this.skyline(g);
    this.facade(g);
    this.ground(g);
    if (UI.mode === 'build' || UI.mode === 'move') this.gridLines(g);
    this.objects(g);
    this.lights(g);
    this.effects(g);
    this.bubbles(g);
    if (UI.mode === 'build' || UI.mode === 'move') this.ghostDraw(g);
  },
  sky(g) {
    const n = this.night(), m = Game.month();
    const top = mixHex('#3a3a8a', '#0b0d2a', n), mid = mixHex('#c8607a', '#1c1846', n), bot = mixHex('#ffb060', '#3a2450', n);
    const gr = g.createLinearGradient(0, 0, 0, this.cv.height * 0.7);
    gr.addColorStop(0, top); gr.addColorStop(0.6, mid); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fillRect(0, 0, this.cv.width, this.cv.height);
    // 星星
    if (n > 0.3) {
      g.fillStyle = `rgba(255,255,230,${(n - 0.3) * 1.2})`;
      const s = Math.max(1, Math.round(this.dpr));
      for (let i = 0; i < 60; i++) {
        const x = hash(i, 1, 5) * this.cv.width, y = hash(i, 2, 5) * this.cv.height * 0.45;
        if (Math.sin(this.t * 2 + i) > -0.6) g.fillRect(x | 0, y | 0, s, s);
      }
      // 月亮
      const mx = this.cv.width * 0.82, my = this.cv.height * 0.12, r = 12 * this.dpr;
      g.fillStyle = `rgba(255,248,210,${n})`; g.beginPath(); g.arc(mx, my, r, 0, TAU); g.fill();
      g.fillStyle = mixHex('#3a3a8a', '#0b0d2a', n); g.beginPath(); g.arc(mx + r * 0.45, my - r * 0.2, r * 0.85, 0, TAU); g.fill();
    }
    // 季節：冬天下一點雪、夏天有螢火蟲
    const se = Game.season();
    if (se === 'winter') { g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 40; i++) { const x = (hash(i, 3, 1) * this.cv.width + this.t * 10 * (1 + i % 3)) % this.cv.width, y = (hash(i, 4, 1) * this.cv.height + this.t * 30 * (1 + i % 2)) % this.cv.height; g.fillRect(x, y, 2 * this.dpr, 2 * this.dpr); } }
  },
  skyline(g) {
    const S = Game.S, x0 = -20 * TILE, x1 = (S.W + 20) * TILE, n = Math.round(this.night() * 8) / 8;
    const key = S.W + ':' + n;
    if (!this._sky || this._sky.key !== key) {
      const c = this._sky?.c || document.createElement('canvas');
      c.width = x1 - x0; c.height = 120;
      const q = c.getContext('2d'); q.clearRect(0, 0, c.width, c.height);
      for (let i = 0, x = 0; x < c.width; i++) {
        const w = 20 + ((hash(i, 1, 7) * 4) | 0) * 8, h = 30 + ((hash(i, 2, 7) * 6) | 0) * 10;
        q.fillStyle = mixHex('#5a4a7a', '#1a1838', n); q.fillRect(x, 120 - 24 - h, w, h + 24);
        q.fillStyle = n > 0.4 ? '#ffd870' : '#8a7aa8';
        for (let wy = -20 - h + 4; wy < -28; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 6) if (hash(wx, wy, 9) < 0.4) q.fillRect(wx, wy + 120, 3, 3);
        x += w + 2;
      }
      this._sky = { key, c };
    }
    g.drawImage(this._sky.c, x0, -120);
  },
  facade(g) {
    const S = Game.S, W = S.W * TILE, lv = S.lv, n = this.night();
    // 左右的鄰居店家
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const bx = side < 0 ? -(k + 1) * 48 : W + k * 48, bw = 46;
        const hh = 34 + ((hash(k, side, 3) * 3) | 0) * 6;
        g.fillStyle = ['#8a6a5a', '#7a7a8a', '#9a8a6a', '#6a7a8a'][(k + (side > 0 ? 1 : 0)) % 4]; g.fillRect(bx, -hh, bw, hh);
        g.fillStyle = '#5a5a64'; g.fillRect(bx + 4, -20, bw - 8, 20);
        g.fillStyle = '#6a6a74'; for (let y = -19; y < 0; y += 3) g.fillRect(bx + 4, y, bw - 8, 1);
        g.fillStyle = ['#e8473b', '#3a8ad8', '#3fa64a', '#ffb020'][(k * 3 + (side > 0 ? 2 : 0)) % 4]; g.fillRect(bx + 6, -hh + 4, bw - 12, 8);
        g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(bx + 10, -hh + 7, bw - 20, 2);
      }
    }
    // 自己的店：等級越高越氣派
    const fh = [30, 36, 40, 44, 46, 46][lv];
    g.fillStyle = ['#c8a888', '#e8d0a8', '#f4e0c0', '#e8c8a0', '#d8b090', '#c89878'][lv]; g.fillRect(0, -fh, W, fh);
    g.fillStyle = shade(['#c8a888', '#e8d0a8', '#f4e0c0', '#e8c8a0', '#d8b090', '#c89878'][lv], -0.2); g.fillRect(0, -3, W, 3);
    if (lv >= 1) { g.fillStyle = '#8a3a2a'; g.fillRect(0, -fh, W, 3); for (let x = 2; x < W; x += 6) { g.fillStyle = '#a84a3a'; g.fillRect(x, -fh + 3, 4, 2); } }
    // 窗戶
    if (lv >= 2) for (let x = 10; x < W - 10; x += 26) { g.fillStyle = n > .4 ? '#ffe8a0' : '#a8d0e8'; g.fillRect(x, -fh + 8, 10, 8); g.fillStyle = '#7a5a3a'; g.fillRect(x + 4, -fh + 8, 1, 8); }
    // 招牌
    const sw = Math.min(W - 8, 30 + S.shop.length * 10 + lv * 6), sx = (W - sw) / 2, sy = -fh + (lv >= 2 ? 18 : 6), shh = 13;
    g.fillStyle = '#5a2a1a'; g.fillRect(sx - 1, sy - 1, sw + 2, shh + 2);
    g.fillStyle = lv >= 3 ? '#c8202a' : '#d84a2a'; g.fillRect(sx, sy, sw, shh);
    g.fillStyle = '#ffd040'; g.fillRect(sx + 1, sy + 1, sw - 2, 1); g.fillRect(sx + 1, sy + shh - 2, sw - 2, 1);
    g.font = '900 9px "Noto Sans TC","PingFang TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#5a1a0a'; g.fillText(S.shop, W / 2 + 0.5, sy + shh / 2 + 1.5);
    g.fillStyle = '#fff4c0'; g.fillText(S.shop, W / 2, sy + shh / 2 + 1);
    // 燈籠串
    const ly = -fh - 4;
    g.strokeStyle = '#3a2a2a'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-40, ly); 
    for (let x = -40; x <= W + 40; x += 4) g.lineTo(x, ly + Math.sin((x + 40) / (W + 80) * Math.PI * 3) * 2 + 3);
    g.stroke();
    for (let x = -36, i = 0; x <= W + 36; x += 14, i++) {
      const y = ly + Math.sin((x + 40) / (W + 80) * Math.PI * 3) * 2 + 4;
      g.fillStyle = ['#ff4a3a', '#ffb020', '#ff4a3a', '#ff6fa8'][i % 4]; g.fillRect(x - 2, y, 5, 5); g.fillStyle = '#ffd040'; g.fillRect(x - 1, y - 1, 3, 1); g.fillRect(x - 1, y + 5, 3, 1);
    }
  },
  ground(g) {
    const S = Game.S, W = S.W, H = S.H;
    // 人行道
    for (let x = -14; x < W + 14; x++) {
      g.fillStyle = (x & 1) ? '#9a96a0' : '#a8a4ae'; g.fillRect(x * TILE, H * TILE, TILE, TILE);
      g.fillStyle = '#8a8690'; g.fillRect(x * TILE, H * TILE + 15, TILE, 1); g.fillRect(x * TILE + 15, H * TILE, 1, TILE);
    }
    // 鄰居店門口地面
    g.fillStyle = '#8a8690'; g.fillRect(-14 * TILE, 0, 14 * TILE, H * TILE); g.fillRect(W * TILE, 0, 14 * TILE, H * TILE);
    g.fillStyle = '#7a7680';
    for (let y = 0; y < H; y++) { g.fillRect(-14 * TILE, y * TILE + 15, 14 * TILE, 1); g.fillRect(W * TILE, y * TILE + 15, 14 * TILE, 1); }
    for (let y = 0; y < H; y++) for (const x of [-7, -6, -5, -4, -3, -2, -1, W, W + 1, W + 2, W + 3, W + 4, W + 5, W + 6]) {
      const h = hash(x - W * (x >= W ? 1 : 0) * 0 + (x < 0 ? 100 : 0), y + (H - y) * 31, 4);
      if (h < 0.16 && !(y === H - 1 && (x === -1 || x === W))) Art.blit(g, Art.prop(Math.floor(h * 31) % 5), x * TILE, y * TILE);
    }
    // 馬路
    const ry = (H + 1) * TILE;
    g.fillStyle = '#c8c4cc'; g.fillRect(-14 * TILE, ry, (W + 28) * TILE, 2);
    g.fillStyle = '#3a3844'; g.fillRect(-14 * TILE, ry + 2, (W + 28) * TILE, 40);
    g.fillStyle = '#e8e0a0'; for (let x = -14 * TILE; x < (W + 14) * TILE; x += 16) g.fillRect(x, ry + 16, 8, 1);
    // 對面人行道與店家
    const oy = ry + 34;
    g.fillStyle = '#c8c4cc'; g.fillRect(-14 * TILE, oy, (W + 28) * TILE, 2);
    for (let x = -14; x < W + 14; x++) { g.fillStyle = (x & 1) ? '#9a96a0' : '#a8a4ae'; g.fillRect(x * TILE, oy + 2, TILE, 14); }
    const n = this.night();
    for (let k = -6; k < W / 3 + 6; k++) {
      const bx = k * 48, hh = 400, col = ['#7a6a8a', '#8a7a6a', '#6a7a7a', '#8a6a6a'][((k % 4) + 4) % 4];
      g.fillStyle = mixHex(col, '#2a2440', n * 0.6); g.fillRect(bx, oy + 16, 46, hh);
      g.fillStyle = ['#e8473b', '#3a8ad8', '#3fa64a', '#ffb020'][((k % 4) + 4) % 4]; g.fillRect(bx + 2, oy + 16, 42, 9);
      g.fillStyle = n > 0.4 ? '#ffe090' : '#a8c8d8'; g.fillRect(bx + 6, oy + 30, 14, 12); g.fillRect(bx + 26, oy + 30, 14, 12);
      g.fillStyle = '#5a4a3a'; g.fillRect(bx + 12, oy + 30, 1, 12); g.fillRect(bx + 32, oy + 30, 1, 12);
      g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(bx + 8, oy + 19, 30, 2);
    }
    // 店面地板
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const f = S.floor[x + ',' + y] || 'f_none';
      Art.blit(g, Art.floor(f, (hash(x, y, 1) * 4) | 0), x * TILE, y * TILE);
    }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, W * TILE, 3);
    // 店面邊框
    g.fillStyle = '#6a4a3a'; g.fillRect(-1, 0, 1, H * TILE); g.fillRect(W * TILE, 0, 1, H * TILE);
  },
  gridLines(g) {
    const S = Game.S;
    g.fillStyle = 'rgba(255,255,255,.18)';
    for (let x = 0; x <= S.W; x++) g.fillRect(x * TILE, 0, 0.5, S.H * TILE);
    for (let y = 0; y <= S.H; y++) g.fillRect(0, y * TILE, S.W * TILE, 0.5);
  },
  frameOf(a, moving) { if (!moving) return 0; return [0, 1, 0, 2][Math.floor(a.anim) & 3]; },
  objects(g) {
    const S = Game.S, list = [], fr = Math.floor(this.t * 3);
    for (const it of S.items) if (!(UI.carry && UI.carry.it === it)) list.push({ y: (it.y + 1) * TILE - 0.1, it });
    for (const c of Game.cust) list.push({ y: c.y, a: c });
    for (const c of Game.peds) list.push({ y: c.y, a: c });
    for (const a of Game.srt.values()) list.push({ y: a.y + 0.05, a });
    for (const c of Game.cars) list.push({ y: c.y + 6, car: c });
    list.sort((p, q) => p.y - q.y);
    for (const o of list) {
      if (o.it) {
        const it = o.it, f = F[it.id], h = Art.facH(it.id);
        const c = Art.fac(it.id, f.cat === 'station' ? (Game.rts.get(it.uid)?.cooking ? fr : 0) : fr, it.lv);
        Art.blit(g, c, it.x * TILE, (it.y + 1) * TILE - h);
        if (it.dirty) Art.blit(g, Art.dirt(), it.x * TILE + 2, it.y * TILE + (it.id === 'bench' ? 4 : 2));
        if (f.cat === 'station') {
          const rt = Game.rts.get(it.uid);
          if (rt && rt.prog > 0) { g.fillStyle = '#2b1b26'; g.fillRect(it.x * TILE + 1, (it.y + 1) * TILE - h - 4, 14, 3); g.fillStyle = '#7affb0'; g.fillRect(it.x * TILE + 2, (it.y + 1) * TILE - h - 3, 12 * rt.prog, 1); }
          if (rt && rt.queue.length && !rt.cook) { this.bubbleAt(g, it.x * TILE + 8, (it.y + 1) * TILE - h - 2, 'people', true); }
          if (rt && !rt.front) { this.bubbleAt(g, it.x * TILE + 8, (it.y + 1) * TILE - h - 2, 'angry', true); }
        }
      } else if (o.car) {
        const c = o.car, fl = c.v < 0;
        g.save(); g.translate(Math.round(c.x), Math.round(c.y)); if (fl) g.scale(-1, 1);
        g.fillStyle = '#2b1b26'; g.fillRect(-9, -1, 18, 2);
        g.fillStyle = '#2b1b26'; g.fillRect(-8, 0, 5, 5); g.fillRect(4, 0, 5, 5); g.fillStyle = '#8a8a8a'; g.fillRect(-7, 1, 3, 3); g.fillRect(5, 1, 3, 3);
        g.fillStyle = c.col; g.fillRect(-6, -5, 12, 5); g.fillRect(4, -9, 3, 5); g.fillStyle = shade(c.col, -0.3); g.fillRect(-6, -1, 12, 1);
        g.fillStyle = '#ffe890'; g.fillRect(7, -8, 2, 2);
        g.restore();
        const p = Art.person(c.rider, 2, 0, true); Art.blit(g, p, c.x - 5 - (fl ? 1 : 0), c.y - 20, fl);
        g.fillStyle = c.rider.shirt; g.fillRect(Math.round(c.x) - 4, Math.round(c.y) - 15, 1, 1);
      } else {
        const a = o.a, moving = (a.path && a.path.length) || a.state === 'pass' || (a.state === 'queue' && a._mv);
        if (a.sitting) {
          const p = Art.person(a.look, a.dir, 0, true);
          const bob = Math.sin(a.anim * 2) > 0.6 ? 1 : 0;
          Art.blit(g, p, a.x - 5, a.y - 17 + bob, a.flip);
        } else {
          let fr2 = this.frameOf(a, moving);
          if (a.kind === 's' && a.atStation && Game.rts.get(a.st)?.cooking) fr2 = (Math.floor(a.anim) & 1) ? 1 : 2;
          const p = Art.person(a.look, a.dir, fr2, false);
          const bob = moving && (Math.floor(a.anim) & 1) ? -1 : 0;
          if (a.kind === 's' || a.vip) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(Math.round(a.x) - 4, Math.round(a.y) - 1, 9, 2); }
          Art.blit(g, p, a.x - 5, a.y - 17 + bob, a.dir === 2 && a.flip);
          if (a.state === 'leave' && a.sat >= 70 && !a.takeout) { g.fillStyle = CATCOL[DISH[a.dish]?.cat] || '#fff'; }
        }
      }
    }
  },
  lights(g) {
    const S = Game.S, n = this.night(), b = this.bounds();
    if (n < 0.05) return;
    g.fillStyle = `rgba(20,16,60,${0.32 * n})`;
    g.fillRect(b.x0 - 300, -200, b.x1 - b.x0 + 600, b.y1 + 400);
    g.globalCompositeOperation = 'lighter';
    this._glow = this._glow || {};
    const glow = (x, y, r, col, a) => {
      let c = this._glow[col];
      if (!c) {
        c = this._glow[col] = document.createElement('canvas'); c.width = c.height = 64;
        const q = c.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, col.replace('A', 1)); gr.addColorStop(1, col.replace('A', 0));
        q.fillStyle = gr; q.fillRect(0, 0, 64, 64);
      }
      g.globalAlpha = Math.min(1, a); g.drawImage(c, x - r, y - r, r * 2, r * 2);
    };
    const fl = 0.9 + Math.sin(this.t * 7) * 0.05;
    for (const it of S.items) {
      const x = it.x * TILE + 8, y = it.y * TILE;
      if (it.id === 'lantern') glow(x, y - 2, 30, 'rgba(255,120,60,A)', 0.38 * n * fl);
      else if (it.id === 'neon') glow(x, y - 2, 34, 'rgba(255,80,220,A)', 0.32 * n);
      else if (F[it.id].cat === 'station') glow(x, y + 2, 24, 'rgba(255,200,120,A)', 0.26 * n);
      else if (it.id === 'tv' || it.id === 'claw' || it.id === 'pinball') glow(x, y + 2, 18, 'rgba(120,200,255,A)', 0.22 * n);
      else if (it.id === 'shrine' || it.id === 'tG') glow(x, y, 22, 'rgba(255,210,80,A)', 0.25 * n);
    }
    const W = S.W * TILE, fh = [30, 36, 40, 44, 46, 46][S.lv];
    for (let x = -36; x <= W + 36; x += 28) glow(x, -fh, 18, 'rgba(255,160,80,A)', 0.2 * n);
    glow(W / 2, -fh + 12, 40, 'rgba(255,90,60,A)', 0.2 * n);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  },
  effects(g) {
    for (const f of Game.fx) {
      const k = 1 - f.t / f.life;
      g.globalAlpha = Math.max(0, f.steam ? k * 0.7 : k);
      g.fillStyle = f.col;
      const s = f.steam ? f.s + f.t * 3 : f.s;
      if (f.star) { g.fillRect(f.x - 1, f.y, 3, 1); g.fillRect(f.x, f.y - 1, 1, 3); }
      else g.fillRect(f.x - s / 2, f.y - s / 2, s, s);
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
    g.font = '700 7px "Silkscreen","Noto Sans TC",monospace';
    for (const f of Game.floats) {
      const k = f.t / 1.4, y = f.y - 12 * Math.min(1, f.t * 2);
      g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      g.fillStyle = '#2b1b26'; g.fillText(f.txt, f.x + 0.5, y + 0.5);
      g.fillStyle = f.col; g.fillText(f.txt, f.x, y);
    }
    g.globalAlpha = 1;
  },
  bubbleAt(g, x, y, icon, small) {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = OUT; g.fillRect(x - 7, y - 13, 15, 12); g.fillRect(x - 1, y - 2, 3, 2);
    g.fillStyle = '#ffffff'; g.fillRect(x - 6, y - 12, 13, 10); g.fillRect(x, y - 2, 1, 1);
    const ic = Art.icon(icon);
    Art.blit(g, ic, x - 4, y - 11);
  },
  bubbles(g) {
    const list = [...Game.cust, ...Game.peds, ...Game.srt.values()];
    for (const a of list) {
      if (!a.bub || a.bubT <= 0) continue;
      const y = a.y - (a.sitting ? 16 : 19);
      if (a.bub === 'say') {
        g.font = '700 6px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const w = Math.ceil(g.measureText(a.say).width) + 6, x = Math.round(a.x), yy = Math.round(y);
        g.fillStyle = OUT; g.fillRect(x - w / 2 - 1, yy - 11, w + 2, 10); g.fillStyle = '#fff6c0'; g.fillRect(x - w / 2, yy - 10, w, 8); g.fillRect(x - 1, yy - 2, 2, 2);
        g.fillStyle = '#c8302a'; g.fillText(a.say, x, yy - 5.5);
      } else this.bubbleAt(g, a.x, y, a.bub);
    }
    // 名字（VIP）
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
    // 會形成的組合提示
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
