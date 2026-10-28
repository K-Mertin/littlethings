'use strict';
// 夜市小吃王：所有像素圖都用程式畫出來，畫好後快取
const OUT = '#2b1b26';
const Art = {
  cache: new Map(),
  mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
  get(key, w, h, fn, line = true) {
    let c = this.cache.get(key);
    if (c) return c;
    c = this.mk(w + 4, h + 8);
    const g = c.getContext('2d'), CW = c.width, CH = c.height;
    // 畫的時候順便記住哪些格子有顏色，描邊直接用這張表算，不用讀回像素（手機上讀像素很慢）
    const m = line ? new Uint8Array(CW * CH) : null;
    const r = (x, y, ww, hh, col) => {
      g.fillStyle = col; g.fillRect(x + 2, y + 7, ww, hh);
      if (!m || (col[0] === 'r' && parseFloat(col.slice(col.lastIndexOf(',') + 1)) < 0.2)) return;
      const x0 = Math.max(0, Math.round(x + 2)), y0 = Math.max(0, Math.round(y + 7)), x1 = Math.min(CW, Math.round(x + 2 + ww)), y1 = Math.min(CH, Math.round(y + 7 + hh));
      for (let yy = y0; yy < y1; yy++) m.fill(1, yy * CW + x0, yy * CW + x1);
    };
    fn(r, g);
    if (line) {
      g.fillStyle = OUT;
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
        const i = y * CW + x;
        if (m[i]) continue;
        if ((x > 0 && m[i - 1]) || (x < CW - 1 && m[i + 1]) || (y > 0 && m[i - CW]) || (y < CH - 1 && m[i + CW])) g.fillRect(x, y, 1, 1);
      }
    }
    // 快取太大就整個清掉（正在用的圖還留在各自的外觀上，不會閃）
    if (this.cache.size > 3000) this.cache.clear();
    this.cache.set(key, c);
    return c;
  },
  outline(c, col = OUT) {
    const g = c.getContext('2d'), w = c.width, h = c.height, im = g.getImageData(0, 0, w, h), d = im.data, o = new Uint8ClampedArray(d);
    const p = parseInt(col.slice(1), 16), R = p >> 16, G = (p >> 8) & 255, B = p & 255;
    const A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && o[(y * w + x) * 4 + 3] > 40;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (o[i + 3] > 40) continue;
      if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) { d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = 255; }
    }
    g.putImageData(im, 0, 0);
  },
  // 把快取圖畫到世界座標 (x, y) = 圖的左上角
  blit(g, c, x, y, flip) {
    if (!flip) g.drawImage(c, Math.round(x) - 2, Math.round(y) - 7);
    else { g.save(); g.translate(Math.round(x) + c.width - 2, Math.round(y) - 7); g.scale(-1, 1); g.drawImage(c, 0, 0); g.restore(); }
  },
  url(c, scale = 3) {
    const k = '__url' + scale;
    if (c[k]) return c[k];
    const o = this.mk(c.width * scale, c.height * scale), g = o.getContext('2d');
    g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, o.width, o.height);
    return (c[k] = o.toDataURL());
  },

  // ---------- 人物 ----------
  // look: { skin, hair, hs(髮型 0-7), shirt, pants, top(衣服款式), inner, acc(配件), hat, capc, apron, sign, glasses, shoe }
  // dir: 0 正面 / 1 背面 / 2 側面（向右）；fr: 0-3 走路；pose: '' 走路站立、sit 坐、eat 吃、cook 煮、carry 端盤、wipe 擦桌、call 叫賣
  // face: '' / happy / sad / angry
  PW: 12, PH: 21,
  POSES: { '': 0, sit: 1, eat: 2, cook: 3, carry: 4, wipe: 5, call: 6, sip: 7, stir: 8, shake: 9 },
  COOKPOSE: { griddle: 'cook', fryer: 'cook', grill: 'cook', soup: 'stir', steam: 'stir', drink: 'shake', ice: 'shake', wok: 'cook' },
  FACES: { '': 0, happy: 1, sad: 2, angry: 3, wow: 4 },
  person(L, dir, fr, pose = '', face = '') {
    if (pose === true) pose = 'sit';
    // 每個外觀自己記住畫好的圖（用數字索引），不用每格都組長長的字串去查表
    const idx = ((this.POSES[pose] * 5 + this.FACES[face]) * 3 + dir) * 4 + (fr & 3);
    const sp = L._spr || (L._spr = []);
    if (L._sk !== L.key) { L._sk = L.key; sp.length = 0; }
    return sp[idx] || (sp[idx] = this.personDraw(L, dir, fr, pose, face));
  },
  personDraw(L, dir, fr, pose, face) {
    const key = 'p' + L.key + dir + (fr & 3) + pose + face;
    return this.get(key, 12, 21, r => {
      const S = L.skin, H = L.hair, sh = L.shirt, pa = L.pants, shoe = L.shoe || '#3a2a2a';
      const shD = shade(sh, -0.18), paD = shade(pa, -0.2), hD = shade(H, -0.25), sD = shade(S, -0.12);
      const sit = pose === 'sit' || pose === 'eat' || pose === 'sip';
      const f = fr & 3, step = sit ? 0 : (f === 1 ? 1 : f === 3 ? -1 : 0);
      const side = dir === 2, back = dir === 1;
      // ---- 腿 ----
      if (sit) {
        r(3, 15, 6, 2, pa); r(3, 16, 6, 1, paD);
        if (!back) { r(3, 17, 2, 2, pa); r(7, 17, 2, 2, pa); r(3, 19, 2, 1, shoe); r(7, 19, 2, 1, shoe); }
      } else if (side) {
        if (step === 0) { r(4, 15, 4, 4, pa); r(4, 15, 1, 4, paD); r(4, 19, 5, 1, shoe); }
        else {
          // 後腳（暗）、前腳
          r(3, 15, 3, 2, paD); r(2, 17, 2, 2, paD); r(1, 19, 3, 1, shade(shoe, -0.2));
          r(6, 15, 3, 2, pa); r(7, 17, 2, 2, pa); r(7, 19, 3, 1, shoe);
        }
      } else {
        const lL = step === 1 ? 4 : step === -1 ? 3 : 4, rL = step === -1 ? 4 : step === 1 ? 3 : 4;
        r(3, 15, 6, 1, pa);
        r(3, 15, 2, lL, pa); r(7, 15, 2, rL, pa); r(5, 15, 2, 1, paD);
        r(3, 15 + lL, 2, 1, shoe); r(7, 15 + rL, 2, 1, shoe);
      }
      // ---- 身體 ----
      const top = L.top || 'tee';
      const torso = (x, w) => {
        r(x, 9, w, 5, sh); r(x, 13, w, 1, shD);
        if (top === 'stripe') for (let y = 10; y < 14; y += 2) r(x, y, w, 1, L.inner || '#ffffff');
        if (top === 'jacket' && !back) { r(x + (side ? 2 : 2), 9, side ? 1 : w - 4, 5, L.inner || '#ffffff'); }
        if (top === 'suit' && !back) { r(x + (side ? 2 : 2), 9, side ? 1 : w - 4, 4, '#ffffff'); if (!side) r(x + w / 2 - 0.5 | 0, 10, 1, 3, L.inner || '#c8302a'); }
        if (top === 'hoodie') { r(x, 9, w, 1, shD); if (back) r(x + 1, 9, w - 2, 2, shD); }
        if (top === 'dress') { r(x - 1, 13, w + 2, side ? 3 : 3, sh); r(x - 1, 15, w + 2, 1, shD); }
        if (top === 'polo' && !back) { r(x + 1, 9, w - 2, 1, '#ffffff'); }
        r(x, 14, w, 1, top === 'dress' ? sh : pa);
      };
      if (side) torso(4, 5); else torso(3, 6);
      if (L.apron && !back) {
        if (side) { r(7, 10, 2, 5, L.apron); }
        else { r(4, 10, 4, 5, L.apron); r(4, 9, 1, 1, L.apron); r(7, 9, 1, 1, L.apron); r(4, 12, 4, 1, shade(L.apron, -0.08)); }
      }
      if (L.acc === 'bag') {
        if (back) { r(3, 9, 6, 5, L.capc || '#3a6ad8'); r(4, 10, 4, 2, shade(L.capc || '#3a6ad8', 0.2)); }
        else if (side) { r(2, 9, 2, 5, L.capc || '#3a6ad8'); r(4, 9, 1, 3, shade(L.capc || '#3a6ad8', -0.2)); }
        else { r(3, 9, 1, 4, shade(L.capc || '#3a6ad8', -0.1)); r(8, 9, 1, 4, shade(L.capc || '#3a6ad8', -0.1)); }
      }
      if (L.acc === 'camera' && !back) { r(side ? 7 : 5, 11, 2, 2, '#3a3a44'); r(side ? 8 : 6, 12, 1, 1, '#8ad0ff'); }
      // ---- 手臂 ----
      const hand = (x, y) => r(x, y, 1, 1, S);
      const armF = (x, len) => { r(x, 9, 1, len, sh); hand(x, 9 + len); };
      if (pose === 'cook') {
        r(2, 9, 1, 2, sh); r(9, 9, 1, 2, sh); r(3, 10, 1, 1, sh); r(8, 10, 1, 1, sh); hand(3, 11); hand(8, 11);
        if (f & 1) { r(9, 6, 1, 5, '#8a8a94'); r(8, 5, 3, 1, '#c8c8d0'); } else { r(10, 8, 1, 3, '#8a8a94'); r(10, 7, 2, 1, '#c8c8d0'); }
      } else if (pose === 'stir') { // 湯鍋、蒸籠：雙手拿大湯杓攪
        r(2, 9, 1, 2, sh); r(9, 9, 1, 2, sh); r(3, 10, 1, 1, sh); r(8, 10, 1, 1, sh);
        const lx = [5, 6, 7, 6][f]; hand(lx - 1, 11); hand(lx + 1, 11);
        r(lx, 4 + (f & 1), 1, 8, '#a8703e'); r(lx - 1, 3 + (f & 1), 3, 1, '#c8904a');
      } else if (pose === 'shake') { // 飲料、冰品：搖雪克杯
        const up = f & 1;
        r(2, 9, 1, 3, sh); hand(2, 12);
        r(8, 8 - up, 2, 3, sh); hand(9, 7 - up); r(9, 3 - up * 2, 2, 4, '#d8dce4'); r(9, 3 - up * 2, 2, 1, '#ffffff'); r(10, 4 - up * 2, 1, 2, '#a8b0bc');
        if (up) { r(11, 1, 1, 1, '#8ad0ff'); r(8, 2, 1, 1, '#8ad0ff'); }
      } else if (pose === 'carry') {
        if (side) { r(6, 9, 2, 1, sh); r(8, 8, 1, 1, S); r(6, 7, 5, 1, '#c8ccd4'); r(7, 6, 2, 1, L.dishc || '#ffd84a'); r(9, 5, 1, 2, '#ffffff'); }
        else { r(2, 9, 1, 3, sh); hand(2, 12); r(9, 7, 1, 3, sh); hand(9, 6); r(7, 5, 5, 1, '#c8ccd4'); r(8, 4, 2, 1, L.dishc || '#ffd84a'); r(10, 3, 1, 2, '#ffffff'); }
      } else if (pose === 'wipe') {
        armF(2, 3);
        const cx = (f & 1) ? 9 : 7;
        r(9, 9, 1, 2, sh); r(cx, 11, 3, 2, '#e8f4ff'); r(cx, 12, 3, 1, '#a8c8e0'); hand(cx + 1, 11);
      } else if (pose === 'call') {
        armF(2, 4);
        if (f & 1) { r(9, 6, 1, 4, sh); hand(9, 5); r(10, 4, 1, 2, S); } else { r(9, 7, 2, 2, sh); r(10, 5, 1, 2, sh); hand(10, 4); }
      } else if (sit) {
        if (back) { r(2, 9, 1, 3, sh); r(9, 9, 1, 3, sh); }
        else if (pose === 'eat') {
          r(2, 10, 1, 2, sh); r(9, 10, 1, 2, sh); r(3, 12, 6, 2, '#ffffff'); r(3, 12, 6, 1, L.dishc || '#e8963a'); r(4, 14, 4, 1, '#d8d8e0');
          if (f & 1) { hand(8, 8); r(8, 6, 1, 2, '#c89a5a'); r(9, 5, 1, 3, '#c89a5a'); } else { hand(8, 11); r(8, 9, 1, 2, '#c89a5a'); r(9, 9, 1, 2, '#c89a5a'); }
        } else if (pose === 'sip') { // 喝飲料：杯子拿到嘴邊
          r(2, 10, 1, 2, sh); hand(2, 12);
          if (f & 2) { r(8, 7, 1, 3, sh); r(7, 4, 3, 4, L.dishc || '#c8904a'); r(7, 4, 3, 1, '#ffffff'); r(8, 2, 1, 2, '#ff4a3a'); hand(8, 8); }
          else { r(9, 10, 1, 2, sh); r(8, 9, 3, 4, L.dishc || '#c8904a'); r(8, 9, 3, 1, '#ffffff'); r(9, 7, 1, 2, '#ff4a3a'); }
        } else { armF(2, 3); armF(9, 3); }
      } else if (side) {
        const sw = step === 1 ? 1 : step === -1 ? -1 : 0;
        r(6 + (sw > 0 ? 1 : sw < 0 ? -1 : 0), 9, 2, 3, shD); hand(6 + (sw > 0 ? 2 : sw < 0 ? -1 : 0), 12);
        if (L.acc === 'brief') r(sw < 0 ? 3 : 7, 13, 3, 3, '#5a3a2a');
      } else {
        const a1 = step === 1 ? 3 : 4, a2 = step === -1 ? 3 : 4;
        armF(2, a1); armF(9, a2);
        if (L.acc === 'brief' && !back) { r(9, 9 + a2 + 1, 3, 3, '#5a3a2a'); r(10, 9 + a2, 1, 1, '#3a2418'); }
        if (L.acc === 'phone' && !back) { r(9, 8, 1, 3, sh); r(9, 6, 2, 3, '#2a2a3a'); r(9, 7, 1, 1, '#8ad0ff'); }
        if (L.acc === 'cane') { r(10, 12, 1, 8, '#8a5a2b'); r(10, 12, 2, 1, '#8a5a2b'); }
        if (L.acc === 'book' && !back) { r(8, 11, 3, 3, '#ffffff'); r(8, 11, 3, 1, '#c8302a'); }
      }
      if (L.sign && pose === 'call') { r(-2, 4, 5, 5, '#ffe066'); r(-2, 4, 5, 1, '#e8473b'); r(-1, 6, 3, 1, '#e8473b'); r(-1, 8, 3, 1, '#e8473b'); r(0, 9, 1, 4, '#8a5a2b'); }
      // ---- 頭 ----
      r(2, 1, 8, 8, S); r(1, 2, 10, 6, S); r(3, 8, 6, 1, sD);
      const hs = L.hs | 0;
      if (back) {
        r(2, 0, 8, 8, H); r(1, 1, 10, 6, H); r(2, 7, 8, 1, hD);
        if (hs === 1 || hs === 7) { r(1, 7, 10, hs === 1 ? 4 : 2, H); }
        if (hs === 2) { r(4, -2, 4, 3, H); r(5, -2, 2, 1, hD); }
        if (hs === 5) { r(-1, 3, 2, 5, H); r(11, 3, 2, 5, H); }
        if (hs === 6) { r(5, 7, 2, 5, H); r(5, 7, 2, 1, L.capc || '#ff6fa8'); }
        if (hs === 4) { r(3, 0, 6, 3, sD); }
      } else if (side) {
        r(2, 0, 7, 2, H); r(1, 1, 5, 6, H); r(6, 1, 4, 2, H); r(9, 2, 1, 1, H); r(1, 6, 3, 2, hD);
        if (hs === 1) r(1, 6, 4, 5, H);
        if (hs === 2) { r(1, -2, 4, 3, H); }
        if (hs === 3) { r(3, -1, 1, 1, H); r(6, -1, 1, 1, H); }
        if (hs === 5) r(0, 4, 2, 5, H);
        if (hs === 6) { r(-1, 3, 2, 6, H); r(0, 3, 1, 1, L.capc || '#ff6fa8'); }
        if (hs === 7) r(1, 6, 5, 2, H);
        if (hs === 4) { r(2, 0, 6, 2, sD); r(1, 3, 3, 3, H); }
        // 臉
        r(10, 4, 1, 2, S);
        if (face === 'happy' || face === 'wow') r(7, 4, 2, 1, OUT); else if (face === 'angry') { r(7, 3, 2, 1, OUT); r(8, 4, 1, 2, OUT); } else r(8, 4, 1, 2, OUT);
        r(8, 6, 1, 1, '#ff9a9a');
        if (face === 'happy') r(9, 7, 1, 1, '#c0503a');
        if (L.glasses) { r(7, 4, 3, 1, OUT); }
      } else {
        // 頭髮
        r(2, 0, 8, 2, H); r(1, 1, 10, 2, H); r(1, 3, 1, 2, H); r(10, 3, 1, 2, H); r(2, 2, 8, 1, H);
        if (hs === 0) { r(2, 3, 3, 1, H); r(7, 3, 1, 1, H); }
        if (hs === 1) { r(1, 3, 1, 7, H); r(10, 3, 1, 7, H); r(0, 5, 1, 5, H); r(11, 5, 1, 5, H); r(2, 3, 2, 1, H); r(8, 3, 2, 1, H); }
        if (hs === 2) { r(4, -2, 4, 3, H); r(5, -2, 2, 1, shade(H, 0.2)); r(2, 3, 2, 1, H); }
        if (hs === 3) { r(2, -1, 1, 1, H); r(5, -1, 2, 1, H); r(9, -1, 1, 1, H); r(3, 3, 1, 1, H); r(6, 3, 2, 1, H); }
        if (hs === 4) { r(2, 0, 8, 2, sD); r(3, 0, 6, 1, S); r(1, 2, 2, 3, H); r(9, 2, 2, 3, H); }
        if (hs === 5) { r(-1, 2, 2, 6, H); r(11, 2, 2, 6, H); r(0, 2, 1, 1, L.capc || '#ff6fa8'); r(11, 2, 1, 1, L.capc || '#ff6fa8'); r(2, 3, 8, 1, H); }
        if (hs === 6) { r(2, 3, 4, 1, H); r(10, 0, 2, 2, L.capc || '#ff6fa8'); }
        if (hs === 7) { r(1, 3, 1, 5, H); r(10, 3, 1, 5, H); r(2, 3, 8, 1, H); r(1, 7, 2, 1, H); r(9, 7, 2, 1, H); }
        r(1, 1, 1, 1, hD);
        // 臉
        if (!back) {
          if (face === 'happy' || face === 'wow') { r(3, 5, 2, 1, OUT); r(7, 5, 2, 1, OUT); r(3, 4, 1, 1, OUT); r(8, 4, 1, 1, OUT); }
          else if (face === 'sad') { r(3, 5, 2, 1, OUT); r(7, 5, 2, 1, OUT); r(10, 3, 1, 2, '#8ad0ff'); }
          else if (face === 'angry') { r(3, 4, 2, 2, OUT); r(7, 4, 2, 2, OUT); r(3, 3, 1, 1, OUT); r(8, 3, 1, 1, OUT); }
          else { r(3, 4, 2, 2, OUT); r(7, 4, 2, 2, OUT); r(3, 4, 1, 1, '#ffffff'); r(7, 4, 1, 1, '#ffffff'); }
          r(2, 6, 1, 1, '#ff9a9a'); r(9, 6, 1, 1, '#ff9a9a');
          if (face === 'wow') { r(5, 7, 2, 2, '#c0503a'); r(2, 6, 1, 1, '#ff6a6a'); r(9, 6, 1, 1, '#ff6a6a'); }
          else if (face === 'happy' || pose === 'call') { r(5, 7, 2, 1, '#c0503a'); }
          else if (face === 'angry' || face === 'sad') r(5, 7, 2, 1, shade(S, -0.35));
          else if (pose === 'eat' && (f & 1)) r(5, 7, 2, 1, '#c0503a');
          else r(5, 7, 2, 1, shade(S, -0.2));
          if (L.glasses) { r(2, 4, 4, 1, OUT); r(6, 4, 4, 1, OUT); r(2, 4, 1, 2, OUT); r(9, 4, 1, 2, OUT); }
        }
      }
      // ---- 帽子 ----
      const hat = L.hat;
      if (hat === 'chef') { r(2, -2, 8, 4, '#ffffff'); r(1, -4, 10, 3, '#ffffff'); r(3, -5, 6, 1, '#ffffff'); r(2, 2, 8, 1, '#dfe4ea'); r(4, -3, 1, 4, '#eef2f6'); }
      if (hat === 'cap') { r(1, 0, 10, 2, L.capc); r(2, -1, 8, 1, L.capc); if (dir === 0) r(1, 2, 10, 1, shade(L.capc, -0.3)); if (side) r(8, 2, 4, 1, shade(L.capc, -0.3)); }
      if (hat === 'band') { r(1, 2, 10, 1, '#e8473b'); if (back || side) { r(side ? 0 : 5, 3, 2, 2, '#e8473b'); } }
      if (hat === 'bow') { r(7, -1, 4, 2, '#ff6fa8'); r(8, -1, 1, 2, '#c03a70'); }
      if (hat === 'straw') { r(-1, 1, 14, 1, '#e8c870'); r(2, -1, 8, 2, '#f0d890'); r(2, 0, 8, 1, '#c8302a'); }
      if (hat === 'beanie') { r(1, -1, 10, 3, L.capc); r(1, 1, 10, 1, shade(L.capc, -0.25)); r(5, -2, 2, 1, '#ffffff'); }
      if (hat === 'helmet') { r(1, -1, 10, 4, L.capc); r(2, -2, 8, 1, L.capc); r(2, -1, 3, 1, shade(L.capc, 0.4)); if (!back) r(1, 2, 10, 1, '#3a3a44'); }
    });
  },
  // 大頭像（菜單、員工資料用）
  portrait(L, face = '') {
    const key = 'pt' + L.key + face;
    return this.get(key, 22, 22, r => {
      const S = L.skin, H = L.hair, sh = L.shirt, hD = shade(H, -0.25), sD = shade(S, -0.12);
      // 肩膀
      r(2, 17, 18, 5, sh); r(1, 19, 20, 3, sh); r(2, 21, 18, 1, shade(sh, -0.2));
      if (L.top === 'suit' || L.top === 'jacket') { r(9, 17, 4, 5, L.top === 'suit' ? '#ffffff' : (L.inner || '#ffffff')); if (L.top === 'suit') r(10, 18, 2, 4, L.inner || '#c8302a'); }
      if (L.top === 'stripe') { r(1, 19, 20, 1, L.inner || '#fff'); r(2, 17, 18, 1, L.inner || '#fff'); }
      if (L.top === 'polo') r(8, 17, 6, 1, '#ffffff');
      if (L.apron) { r(6, 18, 10, 4, L.apron); r(6, 17, 1, 1, L.apron); r(15, 17, 1, 1, L.apron); }
      r(9, 15, 4, 2, sD);
      // 臉
      r(4, 3, 14, 12, S); r(3, 5, 16, 8, S); r(5, 15, 12, 1, S); r(6, 15, 10, 1, sD);
      r(2, 8, 1, 3, S); r(19, 8, 1, 3, S);
      // 頭髮
      const hs = L.hs | 0;
      r(4, 1, 14, 4, H); r(3, 2, 16, 3, H); r(2, 4, 2, 4, H); r(18, 4, 2, 4, H); r(4, 5, 4, 1, H); r(5, 0, 12, 1, H);
      if (hs === 0) { r(8, 5, 3, 1, H); r(14, 5, 2, 1, H); }
      if (hs === 1) { r(1, 6, 3, 13, H); r(18, 6, 3, 13, H); r(8, 5, 2, 1, H); r(14, 5, 3, 1, H); }
      if (hs === 2) { r(7, -3, 8, 4, H); r(9, -3, 4, 1, shade(H, 0.2)); }
      if (hs === 3) { r(4, -1, 2, 2, H); r(9, -2, 3, 2, H); r(15, -1, 2, 2, H); r(10, 5, 3, 1, H); }
      if (hs === 4) { r(5, 0, 12, 3, sD); r(6, 0, 10, 2, S); r(2, 4, 3, 5, H); r(17, 4, 3, 5, H); }
      if (hs === 5) { r(-1, 4, 3, 10, H); r(20, 4, 3, 10, H); r(0, 4, 2, 2, L.capc || '#ff6fa8'); r(20, 4, 2, 2, L.capc || '#ff6fa8'); r(8, 5, 6, 1, H); }
      if (hs === 6) { r(17, 0, 4, 4, H); r(18, 0, 2, 2, L.capc || '#ff6fa8'); r(5, 5, 6, 1, H); }
      if (hs === 7) { r(2, 6, 2, 8, H); r(18, 6, 2, 8, H); r(4, 5, 14, 1, H); }
      r(4, 2, 2, 1, shade(H, 0.25)); r(3, 4, 1, 1, hD);
      // 眼睛
      if (face === 'happy') { r(6, 9, 3, 1, OUT); r(13, 9, 3, 1, OUT); r(6, 8, 1, 1, OUT); r(15, 8, 1, 1, OUT); }
      else { r(6, 8, 3, 3, OUT); r(13, 8, 3, 3, OUT); r(6, 8, 1, 1, '#ffffff'); r(13, 8, 1, 1, '#ffffff'); r(8, 10, 1, 1, '#5a4a6a'); r(15, 10, 1, 1, '#5a4a6a'); }
      if (hs !== 4) { r(6, 6, 3, 1, hD); r(13, 6, 3, 1, hD); }
      if (L.glasses) { r(5, 7, 5, 1, OUT); r(12, 7, 5, 1, OUT); r(5, 7, 1, 4, OUT); r(16, 7, 1, 4, OUT); r(10, 8, 2, 1, OUT); r(5, 11, 5, 1, OUT); r(12, 11, 5, 1, OUT); }
      r(4, 11, 2, 1, '#ff9a9a'); r(16, 11, 2, 1, '#ff9a9a');
      r(10, 11, 1, 1, sD);
      if (face === 'happy') { r(9, 12, 4, 2, '#c0503a'); r(10, 13, 2, 1, '#ff8a8a'); } else r(9, 13, 4, 1, shade(S, -0.35));
      // 帽子
      const hat = L.hat;
      if (hat === 'chef') { r(4, -3, 14, 6, '#ffffff'); r(2, -6, 18, 4, '#ffffff'); r(5, -7, 12, 1, '#ffffff'); r(4, 3, 14, 1, '#dfe4ea'); r(8, -5, 1, 7, '#eef2f6'); r(13, -5, 1, 7, '#eef2f6'); }
      if (hat === 'cap') { r(3, 0, 16, 4, L.capc); r(5, -1, 12, 1, L.capc); r(2, 4, 18, 1, shade(L.capc, -0.3)); }
      if (hat === 'band') { r(3, 4, 16, 2, '#e8473b'); r(9, 4, 4, 2, '#ffffff'); }
      if (hat === 'bow') { r(13, -1, 7, 4, '#ff6fa8'); r(16, -1, 1, 4, '#c03a70'); }
      if (hat === 'straw') { r(-1, 3, 24, 2, '#e8c870'); r(4, -1, 14, 4, '#f0d890'); r(4, 2, 14, 1, '#c8302a'); }
      if (hat === 'beanie') { r(3, -1, 16, 5, L.capc); r(3, 3, 16, 1, shade(L.capc, -0.25)); r(9, -3, 4, 2, '#ffffff'); }
    });
  },
  // ---------- 地板 ----------
  floor(id, v) {
    return this.get('fl' + id + (v & 3), 16, 16, r => {
      const hv = (x, y) => hash(x, y, v * 7 + id.length);
      if (id === 'f_none') {
        r(0, 0, 16, 16, '#b9b2a8');
        for (let i = 0; i < 10; i++) r((hv(i, 1) * 16) | 0, (hv(i, 2) * 16) | 0, 1, 1, hv(i, 3) > .5 ? '#a8a196' : '#c8c2b8');
        r(0, 15, 16, 1, '#a8a196'); r(15, 0, 1, 16, '#a8a196');
      } else if (id === 'f_brick') {
        r(0, 0, 16, 16, '#b8564a');
        for (let y = 0; y < 4; y++) { r(0, y * 4 + 3, 16, 1, '#8f3d34'); const o = y & 1 ? 4 : 0; r(o, y * 4, 1, 3, '#8f3d34'); r(o + 8, y * 4, 1, 3, '#8f3d34'); }
        for (let i = 0; i < 6; i++) r((hv(i, 4) * 16) | 0, (hv(i, 5) * 16) | 0, 2, 1, '#c96a5c');
      } else if (id === 'f_grass') {
        r(0, 0, 16, 16, '#5fae4c');
        for (let i = 0; i < 14; i++) { const x = (hv(i, 6) * 15) | 0, y = (hv(i, 7) * 15) | 0; r(x, y, 1, 2, hv(i, 8) > .5 ? '#4b9a3c' : '#78c45e'); }
        if (hv(9, 9) > .6) { r(5, 6, 1, 1, '#ffef7a'); r(11, 10, 1, 1, '#ff9ac0'); }
      } else if (id === 'f_wood') {
        r(0, 0, 16, 16, '#c88a52');
        for (let y = 0; y < 4; y++) { r(0, y * 4 + 3, 16, 1, '#9a6234'); r(((hv(y, 1) * 12) | 0) + 2, y * 4, 1, 3, '#a8703e'); }
        r(0, 1, 16, 1, '#d89a62'); r(0, 9, 16, 1, '#d89a62');
      } else if (id === 'f_tile') {
        r(0, 0, 16, 16, '#f2e6c8');
        r(0, 0, 8, 8, '#4a9ab8'); r(8, 8, 8, 8, '#4a9ab8');
        r(2, 2, 4, 4, '#f2e6c8'); r(10, 10, 4, 4, '#f2e6c8');
        r(3, 3, 2, 2, '#e8473b'); r(11, 11, 2, 2, '#e8473b');
        r(11, 3, 2, 2, '#e8a02a'); r(3, 11, 2, 2, '#e8a02a');
        r(0, 15, 16, 1, '#d8c8a8'); r(15, 0, 1, 16, '#d8c8a8');
      } else if (id === 'f_marble') {
        r(0, 0, 16, 16, '#eceef2');
        for (let i = 0; i < 8; i++) r(((hv(i, 2) * 12) | 0), ((hv(i, 3) * 15) | 0), 4, 1, '#d4d8e0');
        r(0, 15, 16, 1, '#c8ccd6'); r(15, 0, 1, 16, '#c8ccd6'); r(1, 1, 3, 1, '#ffffff');
      }
    }, false);
  },

  // ---------- 設施 ----------
  facH(id) { const f = F[id]; if (f.cat === 'station') return 29; return ({ banner: 24, icebox: 12, vsign: 28, tree: 28, lion: 18, koi: 14, bingo: 22, fortune: 24, picnic: 14, bar: 16, lantern: 26, neon: 24, shrine: 22, plant: 16, flower: 14, trash: 14, fan: 20, sink: 18, tv: 20, cat: 16, mascot: 26, fountain: 16, stage: 24, pinball: 22, gacha: 20, goldfish: 12, ring: 16, claw: 24, balloon: 24, bench: 10, stool: 12, wood: 12, round: 13, booth: 16, tB: 18, tS: 18, tG: 20, net: 20, sakura: 30, drum: 20, lighthouse: 30, fridge: 22, tkw: 22, lounge: 22 })[id] || 16; },
  fac(id, fr = 0, lv = 1) {
    const h = this.facH(id);
    return this.get('f' + id + fr + lv, 16, h, r => {
      const b = h - 16; // 地面以上的高度
      const f = F[id];
      if (f.cat === 'station') return this.station(r, id, fr, lv);
      switch (id) {
        case 'stool':
          r(0, 7, 4, 3, '#e84a3a'); r(0, 7, 4, 1, '#ff7a6a'); r(0, 10, 1, 2, '#b8302a'); r(3, 10, 1, 2, '#b8302a');
          r(12, 7, 4, 3, '#e84a3a'); r(12, 7, 4, 1, '#ff7a6a'); r(12, 10, 1, 2, '#b8302a'); r(15, 10, 1, 2, '#b8302a');
          r(3, 2, 10, 4, '#e8ecf2'); r(3, 2, 10, 1, '#ffffff'); r(3, 6, 10, 1, '#a8b0bc'); r(4, 7, 1, 5, '#7a8290'); r(11, 7, 1, 5, '#7a8290');
          r(5, 3, 2, 1, '#ff8a7a'); break;
        case 'bench':
          r(0, 4, 16, 3, '#b8763e'); r(0, 4, 16, 1, '#d8965a'); r(1, 7, 2, 3, '#7a4a24'); r(13, 7, 2, 3, '#7a4a24'); break;
        case 'wood':
          r(1, 6, 3, 2, '#a8703e'); r(1, 8, 1, 3, '#7a4a24'); r(3, 8, 1, 3, '#7a4a24');
          r(12, 6, 3, 2, '#a8703e'); r(12, 8, 1, 3, '#7a4a24'); r(14, 8, 1, 3, '#7a4a24');
          r(3, 2, 10, 4, '#c88a52'); r(3, 2, 10, 1, '#e0a870'); r(4, 6, 2, 5, '#7a4a24'); r(10, 6, 2, 5, '#7a4a24'); break;
        case 'round':
          r(0, 7, 3, 2, '#e84a3a'); r(13, 7, 3, 2, '#e84a3a'); r(6, 0, 4, 2, '#e84a3a'); r(6, 11, 4, 2, '#e84a3a');
          r(3, 2, 10, 6, '#f4e8d0'); r(2, 3, 12, 4, '#f4e8d0'); r(4, 2, 8, 1, '#ffffff'); r(3, 7, 10, 1, '#d8c8a8'); r(7, 8, 2, 3, '#8a7a6a'); break;
        case 'booth':
          r(0, 2, 3, 12, '#c8303a'); r(13, 2, 3, 12, '#c8303a'); r(0, 2, 3, 2, '#e8505a'); r(13, 2, 3, 2, '#e8505a');
          r(4, 5, 8, 4, '#3a2a2a'); r(4, 5, 8, 1, '#5a4a4a'); r(7, 9, 2, 5, '#2a1a1a'); r(5, 6, 2, 1, '#ffd84a'); break;
        case 'plant':
          r(5, 10, 6, 5, '#c86a3a'); r(4, 10, 8, 1, '#e08a52'); r(6, 15, 4, 1, '#a8502a');
          r(4, 4, 8, 6, '#3fa64a'); r(3, 6, 10, 3, '#3fa64a'); r(6, 1, 4, 4, '#4fc05a'); r(5, 5, 2, 2, '#6fd870'); r(9, 3, 2, 2, '#6fd870'); break;
        case 'lantern': {
          r(7, 4, 2, 22, '#5a3a2a'); r(5, 25, 6, 1, '#3a2a2a');
          const c = '#ff4a3a';
          r(3, 6, 10, 9, c); r(2, 8, 12, 5, c); r(5, 5, 6, 1, '#ffcc40'); r(5, 15, 6, 1, '#ffcc40');
          r(4, 7, 1, 7, '#ff8a6a'); r(7, 16, 2, 3, '#ffcc40'); r(6, 9, 4, 3, '#ffe060');
          r(7, 2, 2, 3, '#ffcc40'); break;
        }
        case 'trash':
          r(4, 3, 8, 11, '#3a9a5a'); r(3, 2, 10, 2, '#4ab86a'); r(6, 1, 4, 1, '#4ab86a'); r(5, 5, 1, 7, '#2f7a48'); r(8, 5, 1, 7, '#2f7a48'); r(10, 5, 1, 7, '#2f7a48'); break;
        case 'fan':
          r(7, 10, 2, 8, '#d8d8e0'); r(4, 18, 8, 2, '#a8a8b8');
          r(3, 1, 10, 10, '#8ac8ff'); r(2, 3, 12, 6, '#8ac8ff'); r(4, 2, 8, 8, '#bfe2ff');
          if (fr % 2 === 0) { r(7, 2, 2, 8, '#5aa8f0'); r(3, 5, 10, 2, '#5aa8f0'); } else { r(4, 3, 2, 2, '#5aa8f0'); r(10, 7, 2, 2, '#5aa8f0'); r(10, 3, 2, 2, '#5aa8f0'); r(4, 7, 2, 2, '#5aa8f0'); r(6, 5, 4, 2, '#5aa8f0'); }
          r(7, 5, 2, 2, '#ffffff'); break;
        case 'flower':
          r(1, 8, 14, 6, '#a8703e'); r(1, 8, 14, 1, '#c88a52'); r(1, 6, 14, 3, '#3fa64a');
          [[2, '#ff6fa8'], [5, '#8a7aff'], [8, '#ffd84a'], [11, '#ff6fa8'], [13, '#ffffff']].forEach(([x, c], i) => { r(x, 3 + (i & 1), 3, 3, c); r(x + 1, 4 + (i & 1), 1, 1, '#fff6a0'); }); break;
        case 'sink':
          r(5, 8, 6, 10, '#e8eef4'); r(2, 4, 12, 5, '#f4f8fc'); r(3, 5, 10, 2, '#9ad0f0'); r(7, 1, 2, 4, '#a8b0bc'); r(7, 1, 4, 1, '#a8b0bc'); r(6, 9, 4, 1, '#c8d0dc'); break;
        case 'tv':
          r(5, 14, 6, 6, '#7a4a24'); r(1, 1, 14, 13, '#3a3a48'); r(2, 2, 12, 10, ['#5ac8ff', '#7affb0', '#ffd84a', '#ff8ad0'][fr & 3]);
          r(3, 3, 4, 2, '#ffffff'); r(5, 8, 6, 2, shade(['#5ac8ff', '#7affb0', '#ffd84a', '#ff8ad0'][fr & 3], -0.3)); r(12, 12, 2, 1, '#ff4a3a'); break;
        case 'neon': {
          r(7, 14, 2, 10, '#5a5a6a'); r(0, 1, 16, 13, '#2a2040');
          const c1 = fr % 2 ? '#ff5ad0' : '#ff9ae8', c2 = fr % 2 ? '#5affff' : '#2ad0e0';
          r(1, 2, 14, 1, c1); r(1, 12, 14, 1, c1); r(1, 2, 1, 11, c1); r(14, 2, 1, 11, c1);
          r(3, 4, 2, 6, c2); r(3, 4, 4, 2, c2); r(3, 8, 4, 2, c2); r(9, 4, 2, 6, '#ffe040'); r(12, 4, 2, 6, '#ffe040'); r(9, 6, 5, 2, '#ffe040'); break;
        }
        case 'shrine':
          r(2, 10, 12, 10, '#d84a3a'); r(0, 7, 16, 4, '#3a6a4a'); r(1, 6, 14, 1, '#4a8a5a'); r(-1, 9, 2, 1, '#3a6a4a'); r(15, 9, 2, 1, '#3a6a4a');
          r(5, 12, 6, 6, '#2a1a1a'); r(7, 14, 2, 3, '#ffd84a'); r(6, 13, 4, 1, '#ffcc40'); r(3, 20, 10, 2, '#8a8a8a'); r(6, 4, 4, 2, '#ffcc40'); break;
        case 'cat':
          r(3, 6, 10, 9, '#ffffff'); r(4, 2, 8, 6, '#ffffff'); r(4, 1, 2, 2, '#ffffff'); r(10, 1, 2, 2, '#ffffff'); r(4, 2, 1, 1, '#ff9a9a'); r(11, 2, 1, 1, '#ff9a9a');
          r(5, 4, 1, 1, '#2b1b26'); r(10, 4, 1, 1, '#2b1b26'); r(7, 6, 2, 1, '#ff6a6a'); r(4, 9, 8, 2, '#e8473b'); r(7, 10, 2, 2, '#ffd84a');
          if (fr % 2) { r(12, 0, 3, 5, '#ffffff'); } else { r(12, 2, 3, 4, '#ffffff'); }
          r(5, 12, 6, 2, '#ffd84a'); r(4, 15, 8, 1, '#c8c8c8'); break;
        case 'mascot':
          r(7, 18, 2, 8, '#7a4a24'); r(3, 25, 10, 1, '#5a3a2a');
          r(1, 2, 14, 16, '#e8a03a'); r(2, 1, 12, 1, '#e8a03a'); r(2, 3, 12, 14, '#f4b84a');
          for (let i = 0; i < 5; i++) r(3 + ((i * 5) % 10), 4 + i * 3, 2, 1, '#d8902a');
          r(4, 8, 2, 2, '#2b1b26'); r(10, 8, 2, 2, '#2b1b26'); r(4, 11, 2, 1, '#ff8a7a'); r(10, 11, 2, 1, '#ff8a7a'); r(6, 12, 4, 2, '#c8303a');
          r(-1, 9, 2, 4, '#f4b84a'); r(15, 6, 2, 4, '#f4b84a'); break;
        case 'fountain':
          r(0, 6, 16, 10, '#a8b0bc'); r(1, 5, 14, 2, '#c8d0dc'); r(2, 7, 12, 5, '#4aa8e8'); r(3, 8, 3, 1, '#a8e0ff');
          r(7, -2, 2, 10, '#c8d0dc'); r(6, 0, 4, 1, '#c8d0dc');
          r(5 - (fr & 1), -4, 1, 4, '#a8e0ff'); r(10 + (fr & 1), -4, 1, 4, '#a8e0ff'); r(7, -5, 2, 2, '#e0f4ff'); break;
        case 'stage':
          r(0, 14, 16, 10, '#7a4a24'); r(0, 14, 16, 2, '#a8703e'); r(0, 0, 16, 2, '#c8303a'); r(0, 0, 3, 14, '#c8303a'); r(13, 0, 3, 14, '#c8303a');
          r(3, 2, 10, 12, '#3a2a4a'); r(5, 3, 1, 1, '#ffe060'); r(10, 3, 1, 1, '#ffe060'); r(1, 2, 1, 10, '#e8505a'); r(14, 2, 1, 10, '#e8505a');
          r(6 + (fr & 1), 7, 3, 7, '#5ad0ff'); r(6 + (fr & 1), 4, 3, 3, '#f4c8a0'); r(4, 16, 8, 1, '#ffd84a'); break;
        case 'tB': case 'tS': case 'tG': {
          const c = { tB: '#d8884a', tS: '#d8dce8', tG: '#ffd040' }[id], d2 = shade(c, -0.3);
          const t = id === 'tG' ? -2 : 0;
          r(4, 13, 8, 5, '#5a3a2a'); r(3, 13, 10, 1, '#7a5a3a');
          r(7, 10, 2, 3, d2); r(5, 12, 6, 1, d2); r(4, 2 + t, 8, 8 - t, c); r(2, 3 + t, 2, 4, c); r(12, 3 + t, 2, 4, c); r(5, 3 + t, 2, 5, shade(c, 0.4));
          if (id === 'tG') { r(7, -1, 2, 2, '#ffffff'); } break;
        }
        case 'pinball':
          r(2, 4, 12, 18, '#e8473b'); r(3, 5, 10, 11, '#2a3a6a'); r(4, 6, 1, 1, '#ffd84a'); r(9, 8, 1, 1, '#ff8ad0'); r(6, 11, 1, 1, '#7affb0'); r(11, 12, 1, 1, '#ffd84a');
          r(3 + (fr & 1) * 5, 9, 2, 2, '#ffffff'); r(3, 17, 10, 3, '#c8303a'); r(5, 18, 2, 1, '#ffd84a'); r(2, 1, 12, 3, '#ffd84a'); r(4, 2, 8, 1, '#e8473b'); break;
        case 'gacha':
          r(3, 12, 10, 8, '#e8473b'); r(3, 2, 10, 10, '#dff4ff'); r(2, 1, 12, 2, '#e8473b');
          [[4, 5, '#ffd84a'], [7, 4, '#5ad0ff'], [10, 6, '#ff8ad0'], [5, 8, '#7affb0'], [9, 9, '#ffd84a'], [7, 7, '#ff6a4a']].forEach(([x, y, c]) => r(x, y, 2, 2, c));
          r(6, 14, 4, 3, '#c8303a'); r(7, 15, 2, 1, '#ffffff'); break;
        case 'goldfish':
          r(0, 2, 16, 10, '#5ab0e8'); r(0, 1, 16, 2, '#3a88c8'); r(1, 4, 14, 6, '#7ac8f8');
          r(3 + (fr & 1), 5, 3, 2, '#ff8a2a'); r(10 - (fr & 1), 7, 3, 2, '#ff8a2a'); r(8, 4, 2, 1, '#ff5a2a'); r(6, 8, 2, 1, '#ffffff'); break;
        case 'ring':
          r(0, 6, 16, 10, '#6a4a8a'); r(0, 6, 16, 2, '#8a6aaa'); r(1, 8, 14, 1, '#ffd84a');
          [[2, '#5ad0ff'], [5, '#ff8ad0'], [8, '#7affb0'], [11, '#ffd84a']].forEach(([x, c]) => { r(x, 1, 2, 5, c); r(x, 0, 2, 1, '#ffffff'); });
          r(4, 2, 4, 1, '#ff4a3a'); r(4, 4, 4, 1, '#ff4a3a'); break;
        case 'claw':
          r(1, 0, 14, 24, '#ff8ad0'); r(2, 2, 12, 13, '#dff4ff'); r(2, 1, 12, 1, '#ffd84a');
          r(7 + (fr & 1) * 2, 3, 1, 4, '#8a8a8a'); r(6 + (fr & 1) * 2, 7, 3, 1, '#8a8a8a');
          r(3, 11, 3, 3, '#ffd84a'); r(7, 12, 3, 2, '#8ad0ff'); r(10, 11, 3, 3, '#ffb0e0'); r(4, 11, 1, 1, '#2b1b26');
          r(2, 16, 12, 6, '#e85aa8'); r(4, 18, 3, 2, '#2b1b26'); r(10, 18, 2, 2, '#ffd84a'); break;
        case 'banner':
          r(2, 0, 1, 24, '#8a6a4a'); r(1, 23, 3, 1, '#5a4a3a');
          r(3, 1, 9, 15, '#e8302a'); r(3, 1, 9, 1, '#ff6a5a'); r(11, 1, 1, 15, '#b8201a');
          r(3, 16, 2, 2, '#e8302a'); r(7, 16, 2, 2, '#e8302a'); r(10, 16, 2, 1 + (fr & 1), '#e8302a');
          r(5, 3, 5, 5, '#ffe070'); r(5, 9, 5, 5, '#ffe070'); r(6, 4, 3, 3, '#e8302a'); r(6, 10, 3, 3, '#e8302a'); r(2, 0, 10, 1, '#ffd040'); break;
        case 'icebox':
          r(1, 3, 14, 9, '#3a8ad8'); r(1, 3, 14, 2, '#5aa8f0'); r(1, 11, 14, 1, '#2a6ab8'); r(3, 6, 10, 3, '#ffffff'); r(4, 7, 8, 1, '#e8473b');
          r(3, 0, 2, 4, '#8ae0a0'); r(6, 1, 2, 3, '#ffd84a'); r(9, 0, 2, 4, '#8ad0ff'); r(12, 1, 2, 3, '#ff8ab0'); r(3, 0, 2, 1, '#ffffff'); r(9, 0, 2, 1, '#ffffff'); break;
        case 'vsign':
          r(7, 22, 2, 6, '#5a5a6a'); r(4, 27, 8, 1, '#3a3a44');
          r(3, 0, 10, 22, '#2a2036'); r(4, 1, 8, 20, fr & 1 ? '#fff4c8' : '#ffe8a0'); r(3, 0, 10, 1, '#ff5ad0'); r(3, 21, 10, 1, '#ff5ad0');
          r(3, 0, 1, 22, '#ff5ad0'); r(12, 0, 1, 22, '#ff5ad0'); break;
        case 'tree':
          r(7, 23, 2, 4, '#7a4a24'); r(4, 26, 8, 2, '#c8302a');
          r(6, 2, 4, 4, '#2f8a3a'); r(5, 6, 6, 5, '#2f8a3a'); r(3, 11, 10, 6, '#2f8a3a'); r(1, 17, 14, 6, '#2f8a3a');
          r(7, 3, 2, 3, '#4aa850'); r(5, 8, 3, 2, '#4aa850'); r(3, 13, 4, 2, '#4aa850'); r(2, 19, 5, 2, '#4aa850');
          r(7, -1, 2, 2, '#ffd040'); r(6, 0, 4, 1, '#ffd040');
          [[5, 8, '#ff4a3a'], [9, 10, '#5ad0ff'], [4, 14, '#ffd040'], [11, 15, '#ff6fa8'], [3, 20, '#5ad0ff'], [8, 18, '#ff4a3a'], [12, 21, '#ffd040'], [7, 13, '#ffffff']]
            .forEach(([x, y, c], i) => r(x, y, 1, 1, (i + fr) % 3 ? c : '#fff8d0'));
          r(4, 10, 8, 1, '#ffd040'); r(2, 16, 12, 1, '#ffd040'); break;
        case 'lion':
          r(2, 13, 12, 5, '#9a9aa8'); r(2, 13, 12, 1, '#c8c8d4');
          r(3, 3, 10, 10, '#b8b8c4'); r(2, 4, 12, 7, '#b8b8c4'); r(4, 1, 8, 3, '#a8a8b4');
          for (let i = 0; i < 5; i++) r(2 + i * 2.5 | 0, 2 + (i & 1), 2, 2, '#8a8a98');
          r(5, 6, 2, 2, '#2b1b26'); r(9, 6, 2, 2, '#2b1b26'); r(5, 6, 1, 1, '#ffffff'); r(9, 6, 1, 1, '#ffffff');
          r(6, 9, 4, 2, '#c8302a'); r(7, 9, 2, 1, '#ffffff'); r(10, 11, 3, 3, '#c8c8d4'); r(11, 12, 1, 1, '#8a8a98'); break;
        case 'koi':
          r(0, 3, 16, 11, '#8a8a94'); r(0, 3, 16, 1, '#b8b8c4'); r(1, 5, 14, 8, '#2a6aa8'); r(1, 5, 14, 1, '#4a8ac8');
          r(3 + (fr & 1), 7, 3, 2, '#ffffff'); r(4 + (fr & 1), 7, 1, 1, '#ff4a2a'); r(10 - (fr & 1), 9, 3, 2, '#ff6a2a'); r(11 - (fr & 1), 10, 1, 1, '#ffffff');
          r(7, 6, 3, 2, '#3fa64a'); r(8, 6, 1, 1, '#ff8ab0'); r(12, 11, 2, 1, '#8ad0ff'); break;
        case 'bingo':
          r(1, 2, 14, 20, '#3a8ad8'); r(1, 2, 14, 2, '#ffd040'); r(2, 5, 12, 12, '#1a2a4a');
          for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { r(3 + x * 4, 6 + y * 4, 3, 3, ((x + y * 3 + fr) % 4) ? '#2a4a7a' : '#ffd040'); }
          r(2, 18, 12, 3, '#2a6ab8'); r(6, 19, 4, 1, '#ffffff'); break;
        case 'fortune':
          r(0, 10, 16, 14, '#8a2a2a'); r(0, 10, 16, 2, '#c84a3a'); r(-1, 9, 18, 1, '#5a1a1a');
          r(1, 0, 14, 10, '#c8302a'); r(1, 0, 14, 1, '#ffd040'); r(3, 2, 10, 6, '#fff4c8');
          r(5, 13, 6, 8, '#c8904a'); r(5, 13, 6, 1, '#e0b070'); for (let i = 0; i < 4; i++) r(6 + i, 10 - (i + fr) % 2, 1, 4, '#e8d8a8');
          r(13, 13, 2, 3, '#ffd040'); break;
        case 'picnic':
          r(0, 2, 16, 3, '#b8763e'); r(0, 2, 16, 1, '#d8965a');
          r(1, 5, 14, 5, '#c88a52'); r(1, 5, 14, 1, '#e0a870'); r(2, 7, 12, 1, '#a8703e');
          r(0, 11, 16, 2, '#b8763e'); r(0, 11, 16, 1, '#d8965a'); r(2, 10, 1, 4, '#7a4a24'); r(13, 10, 1, 4, '#7a4a24'); r(3, 13, 1, 1, '#7a4a24'); break;
        case 'bar':
          r(0, 2, 16, 6, '#7a4a2a'); r(0, 2, 16, 2, '#c8904a'); r(0, 2, 16, 1, '#e8b070'); r(1, 8, 14, 1, '#5a3418');
          r(2, 11, 4, 2, '#e8473b'); r(10, 11, 4, 2, '#e8473b'); r(3, 13, 2, 3, '#8a8a94'); r(11, 13, 2, 3, '#8a8a94'); r(2, 15, 4, 1, '#5a5a64'); r(10, 15, 4, 1, '#5a5a64');
          r(5, 0, 2, 2, '#ffd84a'); r(10, 0, 1, 2, '#ff8ab0'); break;
        case 'net': // 漁網和彩色浮球
          r(1, 0, 1, 20, '#7a5a3a'); r(14, 0, 1, 20, '#7a5a3a'); r(0, 19, 16, 1, '#5a4a3a');
          for (let y = 1; y < 16; y += 3) r(2, y, 12, 1, 'rgba(230,220,190,.85)');
          for (let x = 3; x < 14; x += 3) r(x, 1, 1, 15, 'rgba(230,220,190,.85)');
          [[3, 3, '#ff4a3a'], [9, 2, '#ffd040'], [6, 8, '#5ad0ff'], [11, 10, '#ff8a3d'], [4, 13, '#7affb0']].forEach(([x, y, c], i) => { r(x, y + ((i + fr) & 1), 3, 3, c); r(x, y + ((i + fr) & 1), 1, 1, '#ffffff'); });
          r(1, 16, 14, 2, '#c89a5a'); break;
        case 'sakura': // 山櫻花樹，花瓣會飄
          r(7, 18, 2, 11, '#6a3a2a'); r(5, 28, 6, 2, '#5a3a2a'); r(5, 20, 2, 1, '#6a3a2a'); r(9, 17, 2, 1, '#6a3a2a');
          r(2, 4, 12, 10, '#ff9ac0'); r(0, 7, 16, 7, '#ff9ac0'); r(4, 1, 8, 4, '#ffb0d0'); r(1, 14, 14, 3, '#f080a8');
          for (let i = 0; i < 9; i++) r((hash(i, 1, 3) * 14) | 0, 2 + ((hash(i, 2, 3) * 13) | 0), 2, 1, i % 3 ? '#ffd0e4' : '#ffffff');
          r(3 + fr % 3 * 4, 20 + (fr & 1) * 3, 1, 1, '#ffb0d0'); r(12 - fr % 3 * 3, 23, 1, 1, '#ffc8dc'); break;
        case 'drum': // 廟會大鼓
          r(2, 14, 2, 6, '#7a3a1a'); r(12, 14, 2, 6, '#7a3a1a'); r(1, 19, 14, 1, '#5a2a12');
          r(1, 3, 14, 12, '#c8302a'); r(0, 5, 16, 8, '#c8302a'); r(2, 3, 12, 1, '#e8503a'); r(1, 4, 1, 10, '#a8201a'); r(14, 4, 1, 10, '#a8201a');
          r(3, 4, 10, 10, '#f4e4c0'); r(2, 6, 12, 6, '#f4e4c0'); r(5, 6, 6, 6, '#e8d4a8'); r(7, 8, 2, 2, '#c8302a');
          for (const x of [1, 14]) for (let y = 5; y < 13; y += 2) r(x, y, 1, 1, '#ffd040');
          r(fr & 1 ? 12 : 13, fr & 1 ? 0 : 1, 1, 5, '#a8703e'); r(fr & 1 ? 11 : 12, fr & 1 ? 0 : 1, 3, 1, '#ffd040'); break;
        case 'lighthouse': // 燈塔模型（紅白條紋，燈會轉）
          r(4, 26, 8, 4, '#8a8a94'); r(3, 29, 10, 1, '#5a5a64');
          for (let y = 8; y < 26; y++) { const w = 4 + ((y - 8) / 18 * 4 | 0), x = 8 - w / 2 | 0; r(x, y, w, 1, ((y - 8) >> 2) & 1 ? '#ffffff' : '#e8302a'); }
          r(4, 7, 8, 1, '#3a3a44'); r(5, 3, 6, 4, '#2a3048'); r(6, 4, 4, 3, fr & 1 ? '#fff8c0' : '#ffe070'); r(5, 1, 6, 2, '#c8302a'); r(7, 0, 2, 1, '#3a3a44');
          if (fr & 1) { r(0, 4, 5, 1, 'rgba(255,248,192,.8)'); } else { r(11, 4, 5, 1, 'rgba(255,248,192,.8)'); } break;
        case 'fridge': // 大冰箱
          r(2, 0, 12, 22, '#e8eef4'); r(2, 0, 12, 1, '#ffffff'); r(13, 0, 1, 22, '#b8c0cc'); r(2, 9, 12, 1, '#a8b0bc');
          r(11, 3, 1, 4, '#8a8a94'); r(11, 12, 1, 6, '#8a8a94'); r(4, 2, 4, 2, '#5ad0ff'); r(4, 11, 3, 2, '#7affb0'); r(3, 21, 2, 1, '#6a6a74'); r(11, 21, 2, 1, '#6a6a74'); break;
        case 'tkw': // 外帶窗口
          r(0, 2, 16, 20, '#c8904a'); r(0, 2, 16, 2, '#e0b070'); r(2, 6, 12, 8, '#3a2a2a'); r(3, 7, 10, 6, fr & 1 ? '#ffe8a8' : '#ffd890');
          r(1, 14, 14, 2, '#a8703e'); r(4, 13, 3, 2, '#ffffff'); r(9, 12, 2, 3, '#c8904a');
          r(1, 0, 14, 3, '#e8473b'); for (let x = 1; x < 15; x += 4) r(x, 0, 2, 3, '#fff4e8'); r(4, 17, 8, 3, '#2f9a4a'); r(5, 18, 6, 1, '#ffffff'); break;
        case 'lounge': // 員工休息室（小門＋布簾＋茶壺）
          r(0, 1, 16, 21, '#a87850'); r(0, 1, 16, 2, '#c8986a'); r(3, 5, 10, 17, '#5a3a2a'); r(4, 6, 8, 16, '#3a2a2a');
          r(3, 5, 10, 6, '#3a6ab8'); for (let x = 4; x < 13; x += 3) r(x, 5, 1, 6, '#5a8ad8'); r(6, 7, 4, 2, '#ffffff');
          r(12, 14, 3, 3, '#e8e8f0'); r(13, 13, 1, 1, '#8a8a94'); if (fr & 1) r(13, 11, 1, 2, 'rgba(255,255,255,.7)'); r(1, 18, 2, 4, '#3fa64a'); break;
        case 'balloon':
          r(0, 0, 16, 22, '#f4e8c8'); r(0, 0, 16, 1, '#c8303a'); r(0, 21, 16, 3, '#a8703e');
          [[1, 2, '#ff4a3a'], [6, 2, '#ffd84a'], [11, 2, '#5ad0ff'], [3, 8, '#7affb0'], [8, 8, '#ff8ad0'], [12, 9, '#ff4a3a'], [1, 14, '#5ad0ff'], [6, 14, '#ffd84a'], [10, 15, '#ff8ad0']]
            .forEach(([x, y, c], i) => { if (((i + fr) % 7) !== 3) { r(x, y, 3, 4, c); r(x, y, 1, 1, '#ffffff'); r(x + 1, y + 4, 1, 1, '#8a8a8a'); } }); break;
      }
    });
  },
  STCOL: { griddle: ['#e8473b', '#fff4e8'], drink: ['#3a8ad8', '#e8f4ff'], fryer: ['#f0a020', '#fff4c8'], soup: ['#3a9a5a', '#eaffea'], ice: ['#ff6fa8', '#fff0f6'], steam: ['#a8703e', '#fff0d8'], grill: ['#8a2a2a', '#ffd8c8'], wok: ['#1f8a86', '#e8fff8'] },
  STCH: { griddle: '煎', drink: '茶', fryer: '炸', soup: '湯', ice: '冰', steam: '蒸', grill: '烤', wok: '炒' },
  station(r, id, fr, lv) {
    const aw = this.STCOL[id], A = aw[0], B = aw[1], AD = shade(A, -0.3), gold = lv >= 4;
    // fr 0～3：沒在煮（燈泡閃）；4～7：正在煮的動畫格
    const ck = fr >= 4, cf = fr & 3, f2 = cf & 1;
    if (gold) { r(-1, 1, 18, 1, '#ffd040'); r(7, -1, 2, 2, '#ffd040'); }
    // 支架
    r(1, 6, 1, 20, '#5a4a44'); r(14, 6, 1, 20, '#5a4a44');
    // 遮陽棚：條紋＋波浪邊
    r(-1, 2, 18, 1, AD);
    for (let i = 0; i < 9; i++) { const c = i % 2 ? B : A; r(-1 + i * 2, 3, 2, 4, c); r(-1 + i * 2, 3, 2, 1, shade(c, 0.25)); }
    for (let i = 0; i < 9; i++) { const c = i % 2 ? B : A; r(-1 + i * 2, 7, 2, 1, c); if (i % 2 === 0) r(-1 + i * 2, 8, 2, 1, shade(c, -0.15)); }
    // 燈泡串
    for (let x = 1; x < 16; x += 3) r(x, 9, 1, 1, (x + cf) % 2 ? '#fff0a0' : '#ffd060');
    // 攤車本體
    const body = gold ? '#e8b830' : shade(A, -0.08);
    r(0, 18, 16, 9, body); r(0, 18, 16, 1, shade(body, 0.35)); r(0, 26, 16, 1, shade(body, -0.35));
    r(4, 19, 8, 6, shade(body, -0.35)); r(5, 19, 6, 5, gold ? '#fff4c0' : '#fff6e4'); r(5, 19, 6, 1, '#ffffff');
    r(1, 19, 1, 7, shade(body, -0.15)); r(14, 19, 1, 7, shade(body, -0.15));
    r(2, 26, 3, 3, '#2a2a30'); r(11, 26, 3, 3, '#2a2a30'); r(3, 27, 1, 1, '#9a9aa8'); r(12, 27, 1, 1, '#9a9aa8');
    r(-1, 16, 18, 2, '#b8bcc6'); r(-1, 16, 18, 1, '#eef0f4');
    for (let i = 0; i < Math.min(lv, 5); i++) { const c = i >= 3 ? '#ff6fa8' : '#ffd040'; r(i < 3 ? 1 : 13, 19 + (i % 3) * 2, 2, 1, c); }
    switch (id) {
      case 'griddle': { // 鐵板：餅會翻面、跳起來
        r(0, 14, 16, 2, '#3a3a44'); r(1, 13, 14, 1, ck ? '#7a6a66' : '#5a5a66');
        const jump = ck ? [0, 2, 3, 1][cf] : 0, flip = ck && (cf === 1 || cf === 2);
        r(2, 12 - jump, 5, flip ? 1 : 2, flip ? '#e8a850' : '#f4c060'); if (!flip) { r(3, 12, 3, 1, '#ffe8a8'); r(4, 13, 1, 1, '#59c25a'); }
        r(9, 12, 4, 2, ck && cf > 1 ? '#e8b050' : '#ffd070'); r(10, 12, 2, 1, '#ffe8a8'); r(11, 13, 1, 1, '#ffd84a');
        if (ck) { r(8 + (cf & 1), 10 - (cf & 1), 1, 3, '#8a8a94'); r(7 + (cf & 1), 10 - (cf & 1), 3, 1, '#c8c8d0'); } else { r(13, 10, 1, 4, '#8a8a94'); r(12, 10, 3, 1, '#c8c8d0'); }
        if (ck && cf & 1) { r(1, 11, 1, 1, '#fff6d0'); r(14, 11, 1, 1, '#fff6d0'); }
        r(6, 11, 3, 1, '#f8f0e0'); break;
      }
      case 'drink': { // 飲料吧：倒茶的水柱、杯子一杯一杯滿起來
        r(1, 9, 4, 7, '#c8904a'); r(1, 9, 4, 1, '#e8b070'); r(2, 11, 2, 3, '#8a5a2b'); r(2, 15, 1, 1, '#3a3a3a');
        r(5, 9, 4, 7, '#f4ecdc'); r(5, 9, 4, 1, '#ffffff'); r(6, 11, 2, 3, '#e0d0b0'); r(6, 15, 1, 1, '#3a3a3a');
        for (let i = 0; i < 3; i++) {
          const fill = ck ? Math.min(3, Math.max(0, cf - i + 1)) : 2;
          r(10 + i * 2, 12, 2, 4, '#f8f0e0'); r(10 + i * 2, 16 - fill - 1, 2, fill + 1, ['#c8904a', '#8a5a2b', '#ffb070'][i]); r(10 + i * 2 + (i & 1), 10, 1, 2, ['#ff4a3a', '#3a8ad8', '#3fa64a'][i]);
        }
        if (ck) { r(2 + (cf & 1) * 4, 15, 1, 1, '#c8904a'); r(10 + (cf % 3) * 2, 9, 1, 3, '#d8a060'); }
        break;
      }
      case 'fryer': { // 炸鍋：油泡泡、炸籃上下
        r(1, 11, 9, 5, '#8a8a94'); r(1, 11, 9, 1, '#b8b8c4'); r(2, 12, 7, 2, ck ? (f2 ? '#ffd050' : '#ffb830') : '#e8a020');
        const bub = ck ? [[3, 12], [6, 13], [8, 12], [4, 13]][cf] : [3, 12];
        r(bub[0], bub[1], 1, 1, '#fff0a0'); if (ck) r(bub[0] + 2 > 8 ? 2 : bub[0] + 2, 12 + (cf & 1), 1, 1, '#fff8c8');
        const by = ck && cf >= 2 ? 8 : 9;
        r(4, by, 1, 3, '#5a5a64'); r(3, by, 3, 1, '#5a5a64'); if (by === 8) { r(3, 11, 3, 1, '#d8902a'); }
        r(11, 12, 4, 4, '#c8c8d0'); r(11, 12, 4, 1, '#e8e8f0'); r(11, 13, 2, 2, '#d8902a'); r(13, 13, 2, 1, '#e8a03a'); r(12, 15, 2, 1, '#c8801a');
        break;
      }
      case 'soup': { // 湯鍋：湯滾、湯杓轉圈
        r(1, 10, 11, 6, '#7a7a86'); r(0, 10, 13, 2, '#a8a8b4'); r(0, 10, 13, 1, '#d0d0dc'); r(2, 11, 9, 1, '#a8502a'); r(3, 11, 2, 1, '#e8a060');
        if (ck) { r([3, 6, 8, 5][cf], 10, 2, 1, '#e8a060'); r([7, 4, 3, 8][cf], 10, 1, 1, '#ffd8a0'); }
        r(-1, 12, 1, 2, '#5a5a64'); r(13, 12, 1, 2, '#5a5a64');
        const lx = ck ? [9, 7, 4, 6][cf] : 9;
        r(lx, 6, 1, 6, '#c8904a'); r(lx - 1, 6, 3, 1, '#c8904a');
        r(13, 13, 3, 3, '#f8f8ff'); r(13, 13, 3, 1, '#ffffff'); r(14, 14, 1, 1, '#a8502a');
        break;
      }
      case 'ice': { // 冰品：刨冰機轉輪、冰山長高
        r(0, 11, 16, 5, '#bfe8ff'); r(0, 11, 16, 1, '#ffffff'); r(0, 15, 16, 1, '#8ac0e0');
        r(1, 12, 3, 3, '#ffd84a'); r(5, 12, 3, 3, '#ff8ab0'); r(9, 12, 3, 3, '#a8e8a0'); r(13, 12, 2, 3, '#9a2a3a');
        r(5, 7, 6, 4, '#e8eef4'); r(6, 6, 4, 1, '#c8d0dc'); r(7, 5, 2, 1, '#8a8a94'); r(6, 9, 4, 2, '#ffffff');
        const wh = ck ? [[11, 6], [12, 7], [11, 8], [10, 7]][cf] : [11, 7];
        r(10, 6, 3, 3, '#a8b0bc'); r(wh[0], wh[1], 1, 1, '#ff4a3a');
        if (ck) { r(7, 10 - (cf >> 1), 2, 1 + (cf >> 1), '#ffffff'); r(7, 8 + f2, 2, 1, '#ffb020'); } else r(7, 8, 2, 1, '#ffb020');
        break;
      }
      case 'steam': { // 蒸籠：蓋子被蒸氣頂起來
        for (let i = 0; i < 3; i++) { const y = 13 - i * 3; r(2, y, 12, 3, '#c8a060'); r(2, y, 12, 1, '#e8c888'); r(2, y + 2, 12, 1, '#a8804a'); }
        const lift = ck ? [0, 1, 2, 1][cf] : 0;
        r(3, 6 - lift, 10, 1, '#d8b070'); r(4, 5 - lift, 8, 1, '#f0d090'); r(7, 4 - lift, 2, 1, '#a8804a');
        if (lift) { r(3, 7 - lift + 1, 10, lift, 'rgba(255,255,255,.85)'); }
        break;
      }
      case 'wok': { // 快炒：大火竄起、鍋子甩起來、菜在空中翻
        r(0, 14, 16, 2, '#3a3a44'); r(1, 13, 14, 1, '#5a5a66');
        const toss = ck ? [0, 1, 2, 1][cf] : 0;
        r(2, 11 - toss, 9, 2, '#2a2a30'); r(3, 13 - toss, 7, 1, '#2a2a30'); r(2, 11 - toss, 9, 1, '#5a5a66'); r(11, 11 - toss, 4, 1, '#7a4a24');
        r(4, 10 - toss, 2, 1, '#e8963a'); r(7, 10 - toss, 2, 1, '#59c25a');
        if (ck && toss) { r(5, 8 - toss * 2, 1, 1, '#e8963a'); r(8, 7 - toss, 1, 1, '#ff4a3a'); r(6, 6 - toss, 1, 1, '#59c25a'); }
        if (ck) { const fl = ['#ffd040', '#ff8a2a', '#ff5a1a', '#ffb030'][cf]; r(3, 13, 7, 1, fl); r(2 + (cf & 1), 12 - toss, 1, 2, fl); r(10 - (cf & 1), 12 - toss, 1, 2, '#ff8a2a'); if (cf === 2) { r(1, 9, 1, 3, '#ffd040'); r(11, 8, 1, 3, '#ff8a2a'); } }
        else r(4, 13, 5, 1, '#3a6ae8');
        r(13, 12, 2, 2, '#c8c8d0'); r(13, 11, 2, 1, '#8a8a94');
        break;
      }
      case 'grill': { // 炭烤：火光跳動、串燒翻面
        r(0, 12, 16, 4, '#3a3a40'); r(0, 12, 16, 1, '#5a5a64');
        r(1, 13, 14, 2, ck ? ['#ff6a2a', '#ff8a3a', '#ff5a1a', '#ff7a2a'][cf] : (fr & 2 ? '#e84a1a' : '#d8401a'));
        r(2 + (ck ? cf : 0), 14, 1, 1, '#ffd040'); r(7, 13, 1, 1, '#ffd040'); r(11 - (ck ? cf : 0), 14, 1, 1, '#ffd040');
        if (ck) { r(4 + cf * 2, 11, 1, 1, '#ffb030'); r(12 - cf, 10, 1, 2, '#ff8a2a'); }
        for (let i = 0; i < 5; i++) { const t = ck && ((i + cf) & 3) === 0; r(1 + i * 3, 9, 1, 4, '#d8c8a0'); r(1 + i * 3, 9, 2, 3, t ? '#8a3a2a' : ['#c8503a', '#e8c040', '#a8483a', '#ffd030', '#c8503a'][i]); r(1 + i * 3, 9, 1, 1, '#ffe0a0'); }
        break;
      }
    }
  },
  // 桌上的小盤子：stage 0 滿、1 吃一半、2 吃光
  minidish(st, stage, col) {
    return this.get('md' + st + stage + col, 6, 5, r => {
      const full = stage === 0, half = stage === 1;
      if (st === 'drink') { r(1, 0, 3, 5, '#e8f4ff'); r(1, full ? 1 : half ? 3 : 4, 3, full ? 4 : half ? 2 : 1, col); r(2, -2, 1, 2, '#ff4a3a'); return; }
      if (st === 'soup' || st === 'ice') { r(0, 2, 6, 3, st === 'ice' ? '#bfe8ff' : '#ffffff'); r(1, 4, 4, 1, '#d8d8e0'); if (!stage || half) { r(1, full ? 0 : 1, 4, full ? 2 : 1, col); if (full) r(2, 0, 1, 1, '#ffffff'); } return; }
      if (st === 'steam') { r(0, 2, 6, 3, '#c8a060'); r(0, 2, 6, 1, '#e0c080'); if (full) { r(1, 1, 2, 2, '#fff4e8'); r(3, 1, 2, 2, '#fff4e8'); } else if (half) r(2, 1, 2, 2, '#fff4e8'); return; }
      if (st === 'grill') { r(0, 3, 6, 2, '#ffffff'); if (full) { r(1, 1, 4, 2, col); r(0, 2, 1, 1, '#d8c8a0'); } else if (half) r(2, 2, 2, 1, col); else r(1, 3, 3, 1, '#d8c8a0'); return; }
      r(0, 3, 6, 2, '#ffffff'); r(1, 4, 4, 1, '#d8d8e0');
      if (full) { r(1, 1, 4, 2, col); r(2, 1, 1, 1, shade(col, 0.4)); } else if (half) r(2, 2, 2, 1, col);
    });
  },
  // 路人用的暗色版
  dimmed(c) {
    if (c._dim) return c._dim;
    const d = this.mk(c.width, c.height), q = d.getContext('2d');
    q.drawImage(c, 0, 0); q.globalCompositeOperation = 'source-atop'; q.fillStyle = 'rgba(34,26,60,.38)'; q.fillRect(0, 0, d.width, d.height);
    return (c._dim = d);
  },
  scooter(col, lit) {
    return this.get('sc' + col + (lit ? 1 : 0), 22, 14, r => {
      const R0 = (x, y, w, h, c) => r(x + 1, y + 3, w, h, c);
      R0(-1, 1, 21, 4, OUT); R0(0, 3, 6, 6, OUT); R0(13, 3, 6, 6, OUT);
      R0(1, 4, 4, 4, '#2a2a30'); R0(14, 4, 4, 4, '#2a2a30'); R0(2, 5, 2, 2, '#9a9aa8'); R0(15, 5, 2, 2, '#9a9aa8');
      R0(1, -1, 9, 4, col); R0(12, -5, 5, 7, col); R0(10, 1, 8, 2, col);
      R0(1, -1, 9, 1, shade(col, 0.3)); R0(12, -5, 5, 1, shade(col, 0.3)); R0(1, 2, 17, 1, shade(col, -0.3));
      R0(2, -2, 7, 1, '#3a3a44'); R0(15, -7, 1, 2, '#3a3a44'); R0(14, -7, 3, 1, '#3a3a44');
      R0(17, -4, 2, 2, lit ? '#fff8c0' : '#e8e0a0'); R0(0, 0, 1, 2, '#ff4a3a');
    }, false);
  },
  // 鄰居空地的小道具
  prop(k) {
    return this.get('pr' + k, 16, 16, r => {
      if (k === 0) { // 停好的機車
        r(1, 10, 4, 4, '#2b1b26'); r(11, 10, 4, 4, '#2b1b26'); r(2, 11, 2, 2, '#8a8a8a'); r(12, 11, 2, 2, '#8a8a8a');
        r(3, 6, 10, 5, '#5ab0e8'); r(3, 6, 10, 1, '#8ad0ff'); r(11, 2, 3, 5, '#5ab0e8'); r(11, 1, 4, 1, '#3a3a3a'); r(4, 5, 5, 1, '#3a3a3a');
      } else if (k === 1) { // 紙箱
        r(1, 8, 8, 7, '#c8904a'); r(1, 8, 8, 1, '#e0b070'); r(4, 8, 2, 7, '#a8703e'); r(7, 4, 7, 11, '#d8a060'); r(7, 4, 7, 1, '#f0c080'); r(10, 4, 1, 11, '#b8804a');
      } else if (k === 2) { // 塑膠椅疊
        for (let i = 0; i < 4; i++) r(4, 4 + i * 2, 8, 2, i % 2 ? '#d83a2a' : '#ff5a48');
        r(4, 12, 1, 3, '#b8302a'); r(11, 12, 1, 3, '#b8302a');
      } else if (k === 3) { // 瓦斯桶
        r(5, 4, 6, 11, '#3a8ad8'); r(6, 3, 4, 1, '#3a8ad8'); r(7, 1, 2, 2, '#a8a8b8'); r(6, 7, 4, 1, '#ffffff');
      } else { // 小貓
        r(5, 10, 7, 4, '#f0a040'); r(10, 7, 4, 4, '#f0a040'); r(10, 6, 1, 1, '#f0a040'); r(13, 6, 1, 1, '#f0a040'); r(11, 8, 1, 1, '#2b1b26'); r(3, 9, 3, 1, '#f0a040'); r(6, 11, 4, 1, '#d88020');
      }
    });
  },
  // 髒碗盤
  dirt() {
    return this.get('dirt', 12, 6, r => { r(0, 3, 4, 2, '#f8f8f8'); r(1, 2, 2, 1, '#a8502a'); r(6, 2, 5, 3, '#ffffff'); r(7, 2, 3, 1, '#d8c8a0'); r(4, 4, 2, 1, '#c8a060'); r(9, 0, 1, 2, '#e8e0d0'); });
  },

  // ---------- 小圖示 ----------
  icon(name) {
    return this.get('i' + name, 9, 9, r => {
      switch (name) {
        case 'coin': r(2, 0, 5, 9, '#ffc020'); r(1, 1, 7, 7, '#ffc020'); r(0, 2, 9, 5, '#ffc020'); r(3, 2, 3, 5, '#ffe070'); r(4, 1, 1, 7, '#e89a10'); break;
        case 'heart': r(1, 1, 3, 3, '#ff4a6a'); r(5, 1, 3, 3, '#ff4a6a'); r(0, 2, 9, 3, '#ff4a6a'); r(1, 5, 7, 1, '#ff4a6a'); r(2, 6, 5, 1, '#ff4a6a'); r(3, 7, 3, 1, '#ff4a6a'); r(4, 8, 1, 1, '#ff4a6a'); r(2, 2, 1, 1, '#ffb0c0'); break;
        case 'bulb': r(2, 0, 5, 6, '#ffe040'); r(1, 1, 7, 4, '#ffe040'); r(3, 1, 1, 2, '#ffffff'); r(3, 6, 3, 2, '#a8a8b8'); r(4, 8, 1, 1, '#7a7a8a'); break;
        case 'cup': r(1, 0, 7, 4, '#ffc020'); r(0, 1, 1, 2, '#ffc020'); r(8, 1, 1, 2, '#ffc020'); r(2, 1, 2, 2, '#ffe890'); r(3, 4, 3, 2, '#e89a10'); r(2, 6, 5, 2, '#a86a20'); break;
        case 'star': r(4, 0, 1, 2, '#ffd040'); r(3, 2, 3, 2, '#ffd040'); r(0, 3, 9, 2, '#ffd040'); r(1, 5, 7, 1, '#ffd040'); r(2, 6, 2, 2, '#ffd040'); r(5, 6, 2, 2, '#ffd040'); break;
        case 'cal': r(0, 1, 9, 8, '#ffffff'); r(0, 1, 9, 3, '#e8473b'); r(2, 0, 1, 2, '#3a3a3a'); r(6, 0, 1, 2, '#3a3a3a'); r(2, 5, 2, 1, '#3a3a3a'); r(5, 5, 2, 1, '#3a3a3a'); r(2, 7, 2, 1, '#3a3a3a'); break;
        case 'salty': r(0, 4, 9, 4, '#f8f0e0'); r(1, 8, 7, 1, '#d8c8b0'); r(1, 2, 7, 3, '#e8963a'); r(2, 1, 5, 1, '#e8963a'); r(3, 2, 2, 1, '#ffd08a'); break;
        case 'sweet': r(3, 5, 3, 4, '#c8904a'); r(1, 1, 7, 5, '#ff8ab8'); r(2, 0, 5, 1, '#ff8ab8'); r(2, 2, 2, 1, '#ffd0e0'); r(5, 3, 1, 1, '#ffffff'); break;
        case 'spicy': r(2, 2, 4, 6, '#e8473b'); r(3, 1, 4, 6, '#e8473b'); r(5, 0, 2, 2, '#3fa64a'); r(3, 3, 1, 2, '#ff9a8a'); r(2, 8, 2, 1, '#e8473b'); break;
        case 'drink': r(1, 2, 7, 7, '#c8904a'); r(1, 2, 7, 1, '#ffffff'); r(2, 7, 1, 1, '#3a2418'); r(5, 6, 1, 1, '#3a2418'); r(4, 7, 1, 1, '#3a2418'); r(6, 0, 1, 3, '#ff4a3a'); break;
        case 'f5': case 'f4': case 'f3': case 'f2': case 'f1': {
          const c = { f5: '#ff8ad0', f4: '#ffd040', f3: '#c8d8a0', f2: '#a8b8d8', f1: '#ff6a4a' }[name];
          r(1, 0, 7, 9, c); r(0, 1, 9, 7, c);
          if (name === 'f5') { r(2, 3, 1, 1, OUT); r(6, 3, 1, 1, OUT); r(2, 5, 5, 1, OUT); r(3, 6, 3, 1, OUT); r(1, 1, 2, 2, '#ff4a6a'); r(6, 1, 2, 2, '#ff4a6a'); }
          if (name === 'f4') { r(2, 3, 1, 1, OUT); r(6, 3, 1, 1, OUT); r(2, 5, 1, 1, OUT); r(6, 5, 1, 1, OUT); r(3, 6, 3, 1, OUT); }
          if (name === 'f3') { r(2, 3, 1, 1, OUT); r(6, 3, 1, 1, OUT); r(3, 6, 3, 1, OUT); }
          if (name === 'f2') { r(2, 3, 1, 1, OUT); r(6, 3, 1, 1, OUT); r(3, 6, 3, 1, OUT); r(2, 7, 1, 1, OUT); r(6, 7, 1, 1, OUT); r(7, 1, 1, 2, '#5ad0ff'); }
          if (name === 'f1') { r(1, 2, 2, 1, OUT); r(6, 2, 2, 1, OUT); r(2, 4, 1, 1, OUT); r(6, 4, 1, 1, OUT); r(2, 6, 5, 1, OUT); r(1, 7, 1, 1, OUT); r(7, 7, 1, 1, OUT); }
          break;
        }
        case 'zzz': r(1, 1, 4, 1, '#ffffff'); r(3, 2, 1, 1, '#ffffff'); r(2, 3, 1, 1, '#ffffff'); r(1, 4, 4, 1, '#ffffff'); r(5, 5, 3, 1, '#c8d8ff'); r(6, 6, 1, 1, '#c8d8ff'); r(5, 7, 3, 1, '#c8d8ff'); break;
        case 'note': r(5, 0, 3, 1, '#ffffff'); r(5, 0, 1, 6, '#ffffff'); r(7, 0, 1, 4, '#ffffff'); r(3, 5, 3, 3, '#ffffff'); break;
        case 'broom': r(6, 0, 1, 5, '#a8703e'); r(4, 5, 5, 4, '#ffd84a'); r(4, 5, 5, 1, '#e8a020'); break;
        case 'angry': r(1, 1, 7, 7, '#ff4a3a'); r(2, 3, 2, 1, '#ffffff'); r(5, 3, 2, 1, '#ffffff'); r(3, 6, 3, 1, '#ffffff'); break;
        case 'wait': r(2, 0, 5, 1, '#a8703e'); r(2, 8, 5, 1, '#a8703e'); r(3, 1, 3, 2, '#ffd84a'); r(4, 3, 1, 3, '#ffd84a'); r(3, 6, 3, 2, '#ffd84a'); break;
        case 'excl': r(3, 0, 3, 6, '#ff4a3a'); r(3, 7, 3, 2, '#ff4a3a'); r(4, 1, 1, 3, '#ff9a8a'); break;
        case 'sweat': r(4, 0, 2, 2, '#8ad0ff'); r(3, 2, 4, 4, '#8ad0ff'); r(4, 6, 2, 1, '#5aa8e8'); r(4, 3, 1, 1, '#ffffff'); break;
        case 'nocook': r(1, 1, 7, 4, '#ffffff'); r(0, 0, 3, 3, '#ffffff'); r(6, 0, 3, 3, '#ffffff'); r(2, 5, 5, 2, '#dfe4ea'); r(0, 7, 9, 1, '#e8473b'); r(4, 2, 1, 1, '#e8473b'); break;
        case 'shop': r(0, 2, 9, 3, '#e8473b'); r(0, 2, 9, 1, '#ff7a6a'); r(1, 5, 7, 4, '#f4e0c0'); r(3, 6, 3, 3, '#8a5a2b'); r(1, 0, 7, 2, '#ffd040'); break;
        case 'firework': r(4, 0, 1, 9, '#ffd040'); r(0, 4, 9, 1, '#ff6fa8'); r(1, 1, 1, 1, '#5ad0ff'); r(7, 1, 1, 1, '#5ad0ff'); r(1, 7, 1, 1, '#7affb0'); r(7, 7, 1, 1, '#7affb0'); r(3, 3, 3, 3, '#ffffff'); break;
        case 'medal': r(2, 0, 2, 3, '#3a8ad8'); r(5, 0, 2, 3, '#e8473b'); r(1, 3, 7, 6, '#ffc020'); r(2, 2, 5, 1, '#ffc020'); r(3, 4, 3, 3, '#ffe070'); r(4, 5, 1, 1, '#e89a10'); break;
        case 'book': r(0, 1, 9, 8, '#c8302a'); r(1, 1, 7, 7, '#fff4dc'); r(4, 1, 1, 8, '#a8201a'); r(2, 3, 2, 1, '#c8a080'); r(5, 3, 2, 1, '#c8a080'); r(2, 5, 2, 1, '#c8a080'); break;
        case 'flask': r(3, 0, 3, 3, '#dfe4ea'); r(2, 0, 5, 1, '#a8b0bc'); r(1, 3, 7, 6, '#dfe4ea'); r(2, 5, 5, 3, '#7affb0'); r(3, 5, 1, 1, '#ffffff'); break;
        case 'heart2': r(1, 1, 3, 3, '#ff6fa8'); r(5, 1, 3, 3, '#ff6fa8'); r(0, 2, 9, 3, '#ff6fa8'); r(1, 5, 7, 1, '#ff6fa8'); r(2, 6, 5, 1, '#ff6fa8'); r(3, 7, 3, 1, '#ff6fa8'); r(2, 2, 1, 1, '#ffffff'); break;
        case 'gear': r(2, 2, 5, 5, '#a8b0c0'); r(4, 0, 1, 9, '#a8b0c0'); r(0, 4, 9, 1, '#a8b0c0'); r(4, 4, 1, 1, '#4a4a5a'); break;
        case 'sword': r(0, 0, 2, 2, '#e8eef4'); r(2, 2, 2, 2, '#e8eef4'); r(4, 4, 1, 1, '#c8d0dc'); r(7, 0, 2, 2, '#e8eef4'); r(5, 2, 2, 2, '#e8eef4'); r(1, 6, 3, 1, '#ffd040'); r(5, 6, 3, 1, '#ffd040'); r(2, 7, 1, 2, '#a8703e'); r(6, 7, 1, 2, '#a8703e'); r(3, 5, 1, 1, '#c8d0dc'); r(5, 5, 1, 1, '#c8d0dc'); break;
        case 'people': r(1, 1, 3, 3, '#f4c8a0'); r(0, 4, 5, 4, '#5a8ad8'); r(5, 0, 3, 3, '#f4c8a0'); r(4, 3, 5, 5, '#e8473b'); break;
      }
    });
  },

  // 分店的小風景（每家分店有自己的地標），lv = 分店等級，0 = 還沒開
  branchScene(id, lv) {
    const key = 'br' + id + lv;
    let c = this.cache.get(key); if (c) return c;
    const W = 128, H = 64; c = this.mk(W, H);
    const g = c.getContext('2d'), R2 = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const seed = id.length * 31 + id.charCodeAt(0), hv = (i, j) => hash(i, j, seed);
    const sky = { tokyo: ['#141a3a', '#3a2a5a'], liuhe: ['#0e1a3a', '#4a2a5a'], luodong: ['#0a1a2a', '#2a3a5a'] }[id] || ['#10102e', '#3a2450'];
    for (let y = 0; y < 44; y++) R2(0, y, W, 1, mixHex(sky[0], sky[1], y / 44));
    for (let i = 0; i < 26; i++) R2((hv(i, 1) * W) | 0, (hv(i, 2) * 26) | 0, 1, 1, i % 5 ? '#c8c8f0' : '#ffffe0');
    // 遠方建築
    for (let x = 0, i = 0; x < W; i++) { const w = 8 + ((hv(i, 3) * 4) | 0) * 3, h = 10 + ((hv(i, 4) * 6) | 0) * 3; R2(x, 44 - h, w, h, '#1c1838'); for (let wy = 46 - h; wy < 42; wy += 3) for (let wx = x + 1; wx < x + w - 1; wx += 2) if (hv(wx, wy) < 0.3) R2(wx, wy, 1, 1, '#ffd890'); x += w; }
    // 地標
    if (id === 'shilin') { // 大牌樓
      R2(38, 14, 4, 30, '#b8202a'); R2(86, 14, 4, 30, '#b8202a'); R2(34, 10, 60, 5, '#e8302a'); R2(32, 8, 64, 3, '#2a6a4a'); R2(30, 7, 4, 2, '#2a6a4a'); R2(94, 7, 4, 2, '#2a6a4a');
      R2(52, 15, 24, 7, '#ffd040'); R2(54, 17, 20, 3, '#c8302a'); R2(38, 24, 52, 2, '#e8302a');
    } else if (id === 'raohe') { // 廟宇
      R2(44, 22, 40, 22, '#a8302a'); R2(38, 18, 52, 5, '#2a5a4a'); R2(34, 16, 6, 3, '#2a5a4a'); R2(88, 16, 6, 3, '#2a5a4a'); R2(32, 14, 4, 3, '#ffd040'); R2(92, 14, 4, 3, '#ffd040');
      R2(48, 12, 32, 5, '#2a5a4a'); R2(60, 8, 8, 4, '#ffd040'); R2(58, 30, 12, 14, '#3a1a1a'); R2(60, 32, 8, 2, '#ffd040'); for (let x = 46; x < 82; x += 8) R2(x, 24, 4, 4, '#ffcf60');
    } else if (id === 'fengjia') { // 霓虹看板牆
      for (let i = 0; i < 9; i++) { const x = 6 + i * 13, h = 14 + ((hv(i, 7) * 4) | 0) * 4, col = ['#ff5ad0', '#5affff', '#ffe040', '#7affb0', '#ff8a3d'][i % 5]; R2(x, 42 - h, 9, h, '#2a2040'); R2(x + 1, 43 - h, 7, 1, col); R2(x + 1, 41, 7, 1, col); R2(x + 1, 43 - h, 1, h - 1, col); R2(x + 7, 43 - h, 1, h - 1, col); R2(x + 3, 46 - h, 3, 3, col); R2(x + 3, 52 - h, 3, 2, col); }
    } else if (id === 'liuhe') { // 高塔和椰子樹
      R2(92, 4, 3, 40, '#2a2a4a'); R2(84, 18, 18, 26, '#24244a'); R2(88, 26, 3, 18, sky[0]); R2(96, 26, 3, 18, sky[0]); R2(93, 0, 1, 5, '#ff4a3a'); for (let y = 20; y < 42; y += 3) { R2(85, y, 1, 1, '#ffd890'); R2(100, y, 1, 1, '#ffd890'); }
      for (const tx of [12, 40, 116]) { R2(tx, 22, 2, 22, '#5a3a24'); R2(tx - 6, 20, 14, 2, '#2f8a3a'); R2(tx - 4, 18, 10, 2, '#3fa64a'); R2(tx - 7, 22, 3, 2, '#2f8a3a'); R2(tx + 5, 22, 3, 2, '#2f8a3a'); }
    } else if (id === 'luodong') { // 公園的水池和涼亭
      R2(24, 38, 80, 6, '#1a3a5a'); R2(28, 38, 72, 1, '#4a8ac8'); for (let x = 30; x < 100; x += 9) R2(x, 40, 4, 1, '#ffd890');
      R2(52, 22, 24, 3, '#b8302a'); R2(48, 20, 32, 3, '#2a5a4a'); R2(62, 16, 4, 4, '#ffd040'); R2(54, 25, 2, 13, '#b8302a'); R2(72, 25, 2, 13, '#b8302a');
      for (const tx of [10, 100, 118]) { R2(tx, 28, 3, 16, '#4a3020'); R2(tx - 6, 18, 15, 11, '#1f5a2a'); R2(tx - 3, 15, 9, 4, '#2a7a3a'); }
    } else if (id === 'bangkok') { // 寺廟尖塔＋水上市場的小船
      for (const [x, h] of [[30, 30], [46, 22], [62, 34]]) { R2(x - 6, 44 - h + 10, 12, h - 10, '#c8902a'); R2(x - 3, 44 - h, 6, 10, '#e8b040'); R2(x - 1, 44 - h - 6, 2, 6, '#ffd040'); }
      R2(0, 38, W, 6, '#2a5a6a'); for (let x = 2; x < W; x += 7) R2(x, 40, 4, 1, '#5aa0b0');
      for (const x of [84, 102]) { R2(x, 38, 14, 3, '#7a4a24'); R2(x + 3, 34, 3, 4, '#ffd84a'); R2(x + 8, 35, 3, 3, '#ff6a4a'); R2(x + 2, 33, 10, 1, '#e8d8a0'); }
    } else if (id === 'singapore') { // 三棟高樓頂著一艘船＋摩天輪
      for (const x of [70, 86, 102]) { R2(x, 12, 10, 32, '#3a4a6a'); for (let y = 14; y < 42; y += 3) R2(x + 2, y, 6, 1, '#ffd890'); }
      R2(66, 8, 50, 4, '#5a6a8a'); R2(68, 9, 46, 1, '#a8d0ff');
      g.strokeStyle = '#7a8ab8'; g.beginPath(); g.arc(30, 26, 14, 0, TAU); g.stroke(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; R2(30 + Math.cos(a) * 14 - 1, 26 + Math.sin(a) * 14 - 1, 2, 2, '#5affff'); }
    } else if (id === 'newyork') { // 大螢幕廣告牆＋高樓
      for (let i = 0; i < 8; i++) { const x = 4 + i * 16, h = 26 + ((hv(i, 11) * 3) | 0) * 6; R2(x, 44 - h, 14, h, '#2a2a40'); R2(x + 2, 46 - h, 10, 8, ['#ff5ad0', '#5affff', '#ffe040', '#7affb0', '#ff8a3d'][i % 5]); R2(x + 2, 56 - h, 10, 5, ['#5ad0ff', '#ff4a6a', '#ffd040'][i % 3]); }
      R2(56, 0, 16, 10, '#2a2a40'); R2(63, 0, 2, 4, '#ffffff');
    } else if (id === 'tokyo') { // 紅白電波塔＋紙燈籠
      R2(94, 2, 1, 6, '#ffffff'); R2(92, 8, 5, 6, '#e8473b'); R2(90, 14, 9, 8, '#ffffff'); R2(88, 22, 13, 8, '#e8473b'); R2(85, 30, 19, 8, '#ffffff'); R2(82, 38, 25, 6, '#e8473b'); R2(92, 26, 5, 18, sky[1]);
      for (let x = 6; x < 76; x += 10) { R2(x + 1, 20, 1, 4, '#3a2a2a'); R2(x - 1, 24, 6, 7, x % 20 ? '#fff4e0' : '#e8473b'); R2(x - 1, 24, 6, 1, '#3a2a2a'); R2(x - 1, 30, 6, 1, '#3a2a2a'); }
      R2(0, 21, 80, 1, '#3a2a2a');
    }
    // 街道
    R2(0, 44, W, 20, '#3a3446'); R2(0, 44, W, 1, '#6a6478');
    // 攤位一排（等級越高越多）
    const n = lv ? 2 + lv : 3, cols = ['#e8473b', '#3a8ad8', '#f0a020', '#3a9a5a', '#ff6fa8', '#8a5ac8', '#e8473b'];
    for (let i = 0; i < n; i++) {
      const x = 4 + i * Math.floor((W - 16) / n), col = lv ? cols[(i + seed) % cols.length] : '#4a4458';
      for (let k = 0; k < 10; k += 2) R2(x + k, 46, 2, 3, (k / 2) & 1 ? (lv ? '#fff4e8' : '#5a5468') : col);
      R2(x, 49, 10, 6, lv ? shade(col, -0.2) : '#3a3448'); R2(x + 3, 50, 4, 3, lv ? '#fff6e4' : '#4a4458');
      if (lv) R2(x + 1, 49, 8, 1, '#ffe8a0');
    }
    // 自家分店的招牌
    if (lv) {
      R2(W / 2 - 18, 52, 36, 9, '#5a2a1a'); R2(W / 2 - 17, 53, 34, 7, lv >= 4 ? '#ffd040' : '#c8202a'); R2(W / 2 - 14, 55, 28, 3, lv >= 4 ? '#c8202a' : '#fff4c0');
      for (let x = W / 2 - 17; x < W / 2 + 17; x += 3) R2(x, 51, 1, 1, '#fff6b0');
      // 人潮
      for (let i = 0; i < 6 + lv * 5; i++) { const x = (hv(i, 9) * (W - 4)) | 0, y = 56 + ((hv(i, 10) * 6) | 0); R2(x, y - 3, 2, 2, ['#f4c8a0', '#e8b088', '#f8d8b8'][i % 3]); R2(x, y - 4, 2, 1, ['#2b1b16', '#5a3a24', '#1a1a2a'][i % 3]); R2(x, y - 1, 2, 3, SHIRTS[i % SHIRTS.length]); }
      // 燈籠串
      for (let x = 2; x < W; x += 6) R2(x, 44 + Math.round(Math.sin(x / 9) * 1.5) - 2, 2, 2, ['#ff4a3a', '#ffb020', '#ff6fa8'][(x / 6) % 3 | 0]);
    } else { g.fillStyle = 'rgba(10,8,24,.45)'; g.fillRect(0, 0, W, H); }
    this.cache.set(key, c);
    return c;
  },
  // 夜市地點的小風景（挑戰關卡的卡片用）
  mapScene(id) {
    const key = 'mp' + id;
    let c = this.cache.get(key); if (c) return c;
    const W = 128, H = 64; c = this.mk(W, H);
    const g = c.getContext('2d'), R2 = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const hv = (i, j) => hash(i, j, id.length * 17);
    const sky = { harbor: ['#0c1638', '#2a3a6a'], mountain: ['#0e1430', '#3a2a5a'], temple: ['#1a0e2e', '#5a2240'] }[id] || ['#10102e', '#3a2450'];
    for (let y = 0; y < 46; y++) R2(0, y, W, 1, mixHex(sky[0], sky[1], y / 46));
    for (let i = 0; i < 24; i++) R2((hv(i, 1) * W) | 0, (hv(i, 2) * 22) | 0, 1, 1, i % 5 ? '#c8c8f0' : '#ffffe0');
    const lanternRow = y => { for (let x = 2; x < W; x += 6) R2(x, y + Math.round(Math.sin(x / 9) * 1.5), 2, 2, ['#ff4a3a', '#ffb020', '#ff6fa8'][(x / 6) % 3 | 0]); };
    const stalls = (y, n, cols) => { for (let i = 0; i < n; i++) { const x = 3 + i * Math.floor((W - 12) / n), col = cols[i % cols.length]; for (let k = 0; k < 10; k += 2) R2(x + k, y, 2, 3, (k / 2) & 1 ? '#fff4e8' : col); R2(x, y + 3, 10, 6, shade(col, -0.2)); R2(x + 3, y + 4, 4, 3, '#fff6e4'); R2(x + 1, y + 3, 8, 1, '#ffe8a0'); } };
    if (id === 'harbor') {
      R2(108, 6, 9, 9, '#fff0c0'); R2(107, 8, 11, 5, '#fff0c0');
      // 遠山、海、月光倒影
      for (let x = 0; x < W; x++) { const h = 6 + Math.sin(x / 13) * 3 + Math.sin(x / 5) * 1; R2(x, 30 - h, 1, h, '#1c2448'); }
      for (let y = 30; y < 46; y++) R2(0, y, W, 1, mixHex('#1a3a6a', '#0e2244', (y - 30) / 16));
      for (let y = 31; y < 46; y += 2) R2(108 + Math.round(Math.sin(y) * 2), y, 8 - (y - 30) / 4, 1, 'rgba(255,240,190,.55)');
      for (let i = 0; i < 18; i++) R2((hv(i, 5) * W) | 0, 31 + ((hv(i, 6) * 14) | 0), 3, 1, 'rgba(160,200,255,.35)');
      // 燈塔
      R2(14, 14, 6, 18, '#f4f0e8'); for (let y = 16; y < 32; y += 6) R2(14, y, 6, 3, '#e8302a'); R2(13, 10, 8, 4, '#2a3048'); R2(15, 11, 4, 2, '#fff8a0'); R2(14, 8, 6, 2, '#c8302a');
      g.fillStyle = 'rgba(255,248,180,.22)'; g.beginPath(); g.moveTo(17, 12); g.lineTo(60, 4); g.lineTo(60, 16); g.closePath(); g.fill();
      R2(8, 30, 20, 3, '#3a3a50');
      // 漁船
      for (const [x, y, col] of [[40, 38, '#e8473b'], [70, 34, '#3a8ad8'], [92, 40, '#ffd040']]) { R2(x, y, 14, 3, col); R2(x + 2, y + 3, 10, 1, shade(col, -0.4)); R2(x + 5, y - 6, 1, 6, '#c8c8d0'); R2(x + 6, y - 5, 5, 3, '#f4f0e8'); R2(x + 3, y - 2, 3, 2, '#fff2a0'); R2(x + 3, y + 4, 4, 1, 'rgba(255,240,160,.4)'); }
      R2(0, 46, W, 18, '#4a3a34'); for (let x = 0; x < W; x += 6) R2(x, 46, 5, 18, '#5a4a40'); R2(0, 46, W, 1, '#8a7060');
      lanternRow(44); stalls(48, 7, ['#3a8ad8', '#e8473b', '#1f8a86', '#f0a020']);
    } else if (id === 'mountain') {
      R2(56, 3, 8, 8, '#fff0c0'); R2(55, 5, 10, 4, '#fff0c0');
      const ridge = (base, amp, f, col, ph) => { for (let x = 0; x < W; x++) { const h = amp * (0.6 + 0.4 * Math.sin(x / f + ph)) + Math.abs(Math.sin(x / (f * 0.37) + ph)) * amp * 0.35; R2(x, base - h, 1, h + 20, col); } };
      ridge(30, 16, 14, '#34406e', 1); ridge(38, 13, 10, '#2a4a50', 3);
      // 山頂的塔和纜車
      R2(86, 8, 6, 12, '#3a2a3a'); R2(84, 7, 10, 2, '#5a3a3a'); R2(85, 12, 8, 1, '#5a3a3a'); R2(87, 10, 4, 2, '#ffd890'); R2(87, 15, 4, 2, '#ffd890');
      g.strokeStyle = '#8a8aa8'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, 24); g.lineTo(88, 6); g.stroke();
      R2(38, 13, 6, 5, '#e8473b'); R2(39, 14, 4, 2, '#fff2a0'); R2(40, 11, 1, 2, '#8a8aa8');
      for (let i = 0; i < 3; i++) R2(0, 30 + i * 5, W, 2, `rgba(220,230,255,${0.12 - i * 0.03})`);
      for (let i = 0; i < 9; i++) { const x = (hv(i, 7) * W) | 0, y = 36 + ((hv(i, 8) * 6) | 0); R2(x + 2, y - 7, 2, 2, '#1a3a2a'); R2(x + 1, y - 5, 4, 3, '#1a3a2a'); R2(x, y - 2, 6, 3, '#1a3a2a'); R2(x + 2, y + 1, 2, 2, '#3a2a1a'); }
      // 老街木屋
      for (let i = 0; i < 6; i++) { const x = i * 22 - 2; R2(x, 36, 20, 10, '#6a4a32'); R2(x - 2, 33, 24, 3, '#2a2a34'); R2(x + 4, 39, 5, 4, '#ffd890'); R2(x + 12, 39, 5, 4, '#ffcf70'); }
      R2(0, 46, W, 18, '#5a5660'); for (let x = 0; x < W; x += 8) for (let y = 46; y < 64; y += 4) R2(x + ((y / 4) & 1) * 4, y, 7, 3, '#6a6670');
      lanternRow(45); stalls(48, 6, ['#3a9a5a', '#a8703e', '#e8473b', '#8a2a2a']);
    } else if (id === 'temple') {
      // 摩天輪
      g.strokeStyle = '#5a4a7a'; g.lineWidth = 1; g.beginPath(); g.arc(24, 22, 16, 0, TAU); g.stroke();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; R2(24 + Math.cos(a) * 16 - 1, 22 + Math.sin(a) * 16 - 1, 3, 3, ['#ff5ad0', '#5affff', '#ffe040', '#7affb0'][i % 4]); g.beginPath(); g.moveTo(24, 22); g.lineTo(24 + Math.cos(a) * 16, 22 + Math.sin(a) * 16); g.stroke(); }
      R2(20, 22, 2, 24, '#5a4a7a'); R2(27, 22, 2, 24, '#5a4a7a');
      // 大廟（燕尾屋脊）
      R2(52, 26, 60, 20, '#a8302a'); R2(46, 22, 72, 5, '#2a5a4a'); R2(42, 19, 6, 3, '#2a5a4a'); R2(116, 19, 6, 3, '#2a5a4a'); R2(40, 16, 4, 3, '#ffd040'); R2(120, 16, 4, 3, '#ffd040');
      R2(58, 14, 48, 5, '#2a5a4a'); R2(54, 12, 5, 3, '#ffd040'); R2(105, 12, 5, 3, '#ffd040'); R2(76, 8, 12, 5, '#ffd040'); R2(80, 5, 4, 3, '#e8302a');
      R2(74, 32, 16, 14, '#3a1a1a'); R2(76, 34, 12, 2, '#ffd040'); for (let x = 56; x < 110; x += 9) if (x < 72 || x > 90) R2(x, 30, 5, 5, '#ffcf60');
      for (let i = 0; i < 6; i++) { const x = 50 + i * 12; R2(x, 22, 1, 3, '#3a1a1a'); R2(x - 2, 25, 5, 5, '#ff4a3a'); R2(x - 1, 26, 3, 2, '#ffd890'); }
      R2(0, 46, W, 18, '#8a6a5a'); for (let x = 0; x < W; x += 8) R2(x, 46, 7, 18, '#9a7a68');
      lanternRow(44); stalls(48, 7, ['#e8473b', '#ffd040', '#c8302a', '#ff6fa8']);
      for (let i = 0; i < 18; i++) { const x = (hv(i, 9) * (W - 4)) | 0, y = 58 + ((hv(i, 10) * 5) | 0); R2(x, y - 3, 2, 2, '#f4c8a0'); R2(x, y - 4, 2, 1, i % 3 ? '#ffd040' : '#2b1b16'); R2(x, y - 1, 2, 3, i % 2 ? '#ffd040' : '#e8473b'); }
    } else {
      for (let x = 0, i = 0; x < W; i++) { const w = 8 + ((hv(i, 3) * 4) | 0) * 3, h = 12 + ((hv(i, 4) * 6) | 0) * 3; R2(x, 44 - h, w, h, '#2a2450'); for (let wy = 46 - h; wy < 42; wy += 3) for (let wx = x + 1; wx < x + w - 1; wx += 2) if (hv(wx, wy) < 0.35) R2(wx, wy, 1, 1, '#ffd890'); x += w; }
      R2(10, 18, 7, 26, '#2b1b26'); R2(11, 19, 5, 24, '#ff3a8a'); R2(110, 20, 7, 24, '#2b1b26'); R2(111, 21, 5, 22, '#ffd040');
      R2(0, 44, W, 20, '#4a3a4e'); for (let x = 0; x < W; x += 8) R2(x, 50 + ((x / 8) & 1) * 4, 7, 1, '#5a4a5e');
      lanternRow(42); stalls(47, 7, ['#e8473b', '#3a8ad8', '#f0a020', '#3a9a5a', '#ff6fa8']);
      for (let i = 0; i < 16; i++) { const x = (hv(i, 9) * (W - 4)) | 0, y = 58 + ((hv(i, 10) * 5) | 0); R2(x, y - 3, 2, 2, ['#f4c8a0', '#e8b088'][i % 2]); R2(x, y - 4, 2, 1, '#2b1b16'); R2(x, y - 1, 2, 3, SHIRTS[i % SHIRTS.length]); }
    }
    this.cache.set(key, c);
    return c;
  },
  // 頭上的對話泡泡（圓角、尾巴、陰影，圖示在中間）
  bubble(icon) {
    return this.get('bb' + icon, 18, 16, (r, g) => {
      const warn = icon === 'angry' || icon === 'nocook' || icon === 'excl';
      const bg = warn ? '#fff0ec' : '#ffffff', edge = warn ? '#a8281f' : OUT;
      r(2, 13, 14, 1, 'rgba(20,10,30,.3)'); r(16, 3, 1, 10, 'rgba(20,10,30,.3)');
      r(2, 0, 13, 1, edge); r(2, 12, 13, 1, edge); r(0, 2, 1, 9, edge); r(16, 2, 1, 9, edge);
      r(1, 1, 1, 1, edge); r(15, 1, 1, 1, edge); r(1, 11, 1, 1, edge); r(15, 11, 1, 1, edge);
      r(2, 1, 13, 11, bg); r(1, 2, 15, 9, bg); r(2, 10, 13, 1, warn ? '#ffd8d0' : '#ece6f4');
      r(7, 12, 3, 1, bg); r(8, 13, 1, 1, bg); r(6, 12, 1, 1, edge); r(10, 12, 1, 1, edge); r(7, 13, 1, 1, edge); r(9, 13, 1, 1, edge); r(8, 14, 1, 1, edge);
      g.drawImage(this.icon(icon), 4, 2);
    }, false);
  },
  // 菜色小圖（依攤位種類畫容器）
  dish(id) {
    const d = DISH[id];
    const ca = (ING[d.a] || ING[DISH[d.a]?.a] || { col: '#e8963a' }).col, cb = (ING[d.b] || ING[DISH[d.b]?.b] || { col: '#ffd84a' }).col;
    return this.get('d' + id, 12, 12, r => {
      switch (d.st) {
        case 'griddle': r(0, 7, 12, 3, '#f8f8f8'); r(1, 10, 10, 1, '#d8d8e0'); r(1, 4, 10, 4, '#f4c870'); r(2, 3, 8, 1, '#f4c870'); r(3, 5, 2, 1, cb); r(7, 4, 2, 1, cb); r(5, 6, 2, 1, ca); break;
        case 'drink': r(2, 2, 8, 10, ca === '#8a5a2b' ? '#c8904a' : shade(ca, -0.05)); r(2, 2, 8, 1, '#ffffff'); r(3, 9, 1, 1, cb); r(6, 8, 1, 1, cb); r(8, 10, 1, 1, cb); r(7, 0, 1, 3, '#ff4a3a'); r(3, 4, 1, 4, 'rgba(255,255,255,.5)'); break;
        case 'fryer': r(1, 4, 10, 8, '#f4e8c8'); r(1, 4, 10, 1, '#e0d0a0'); r(2, 1, 3, 4, '#d8902a'); r(5, 0, 3, 5, '#e8a03a'); r(8, 2, 3, 3, '#c8801a'); r(4, 7, 4, 2, '#e8473b'); r(6, 1, 1, 1, cb); break;
        case 'soup': r(0, 5, 12, 2, '#ffffff'); r(1, 7, 10, 3, '#f0f0f8'); r(3, 10, 6, 1, '#d8d8e0'); r(1, 4, 10, 2, ca); r(3, 3, 3, 2, cb); r(7, 3, 2, 1, cb); r(4, 0, 1, 2, '#e8eef4'); r(7, 0, 1, 2, '#e8eef4'); break;
        case 'ice': r(1, 7, 10, 4, '#bfe8ff'); r(3, 11, 6, 1, '#a0c8e0'); r(2, 3, 8, 5, '#ffffff'); r(3, 1, 6, 3, '#ffffff'); r(3, 3, 3, 2, ca); r(6, 2, 3, 3, cb); r(5, 5, 2, 1, cb); break;
        case 'steam': r(0, 6, 12, 5, '#c8a060'); r(0, 6, 12, 1, '#e0c080'); r(0, 8, 12, 1, '#a8804a'); r(2, 2, 3, 4, '#fff4e8'); r(6, 2, 3, 4, '#fff4e8'); r(3, 1, 1, 1, '#fff4e8'); r(7, 1, 1, 1, '#fff4e8'); r(9, 3, 2, 3, ca); break;
        case 'wok': r(0, 8, 12, 3, '#f8f8f8'); r(1, 11, 10, 1, '#d8d8e0'); r(1, 5, 10, 4, shade(ca, -0.1)); r(2, 4, 8, 1, shade(ca, -0.1)); r(2, 5, 2, 2, cb); r(6, 4, 2, 2, cb); r(8, 6, 2, 2, '#59c25a'); r(4, 7, 2, 1, '#ff4a3a'); r(5, 2, 1, 2, 'rgba(255,255,255,.7)'); break;
        case 'grill': r(5, 0, 1, 12, '#d8c8a0'); r(3, 1, 5, 4, ca); r(3, 5, 5, 4, cb); r(4, 2, 1, 1, '#ffffff'); r(3, 3, 5, 1, shade(ca, -0.3)); r(3, 7, 5, 1, shade(cb, -0.3)); break;
      }
    });
  },
  ing(id) {
    const c = ING[id].col;
    return this.get('g' + id, 9, 9, r => { r(1, 2, 7, 6, c); r(2, 1, 5, 8, c); r(2, 2, 2, 2, shade(c, 0.5)); r(5, 6, 2, 1, shade(c, -0.25)); });
  },
};
