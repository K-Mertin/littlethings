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
    const g = c.getContext('2d');
    const r = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 2, y + 7, ww, hh); };
    fn(r, g);
    if (line) this.outline(c);
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
  // look: { skin, hair, hs(髮型), shirt, pants, hat, apron, sign }
  person(L, dir, fr, sit) {
    const key = 'p' + L.key + dir + fr + (sit ? 's' : '');
    return this.get(key, 10, 18, r => {
      const S = L.skin, H = L.hair, sh = L.shirt, pa = L.pants, sk2 = shade(S, -0.12);
      const by = 1; // 身體偏移
      // 腿
      if (!sit) {
        if (fr === 0) { r(3, 14, 2, 2, pa); r(5 + 0, 14, 2, 2, pa); r(3, 16, 2, 1, '#3a2a2a'); r(5, 16, 2, 1, '#3a2a2a'); }
        else if (fr === 1) { r(3, 14, 2, 1, pa); r(5, 14, 2, 2, pa); r(3, 15, 2, 1, '#3a2a2a'); r(5, 16, 2, 1, '#3a2a2a'); }
        else { r(3, 14, 2, 2, pa); r(5, 14, 2, 1, pa); r(3, 16, 2, 1, '#3a2a2a'); r(5, 15, 2, 1, '#3a2a2a'); }
      } else { r(3, 14, 4, 1, pa); }
      // 身體
      r(2, 10 + by - 1, 6, 4, sh); r(2, 13, 6, 1, pa);
      if (L.skirt) r(2, 13, 6, 1, pa), r(1, 14, 8, 1, pa);
      if (dir !== 2) { r(1, 10, 1, 3, sh); r(8, 10, 1, 3, sh); r(1, 13, 1, 1, S); r(8, 13, 1, 1, S); }
      else { r(4, 11, 2, 2, shade(sh, -0.15)); r(5, 13, 1, 1, S); }
      if (L.apron && dir !== 1) { r(3, 11, 4, 3, L.apron); r(3, 10, 1, 1, L.apron); r(6, 10, 1, 1, L.apron); }
      if (L.sign && dir !== 1) { r(7, 7, 3, 3, '#ffe066'); r(8, 10, 1, 3, '#8a5a2b'); r(7, 8, 3, 1, '#e8473b'); }
      // 頭
      r(1, 3, 8, 7, S);
      r(0, 5, 1, 2, S); r(9, 5, 1, 2, S);
      // 頭髮
      const hs = L.hs;
      if (dir === 1) { r(1, 2, 8, 7, H); if (hs === 1 || hs === 5) r(1, 9, 8, 2, H); if (hs === 2) r(3, 0, 4, 3, H); }
      else {
        r(1, 2, 8, 2, H); r(1, 4, 1, 2, H); r(8, 4, 1, 2, H);
        if (hs === 0) { r(2, 4, 3, 1, H); }
        if (hs === 1) { r(1, 4, 1, 6, H); r(8, 4, 1, 6, H); r(2, 4, 6, 1, H); }
        if (hs === 2) { r(3, 0, 4, 2, H); r(2, 4, 2, 1, H); }
        if (hs === 3) { r(1, 1, 2, 1, H); r(4, 1, 2, 1, H); r(7, 1, 2, 1, H); r(5, 4, 3, 1, H); }
        if (hs === 4) { r(1, 2, 8, 1, S); r(2, 2, 6, 1, sk2); }
        if (hs === 5) { r(-1, 4, 2, 4, H); r(9, 4, 2, 4, H); r(2, 4, 6, 1, H); }
        if (dir === 0) {
          r(3, 6, 1, 2, '#2b1b26'); r(6, 6, 1, 2, '#2b1b26');
          r(2, 8, 1, 1, '#ff9a9a'); r(7, 8, 1, 1, '#ff9a9a');
          if (L.glasses) { r(2, 6, 3, 1, '#2b1b26'); r(5, 6, 3, 1, '#2b1b26'); }
        } else {
          r(1, 2, 4, 6, H); r(6, 6, 1, 2, '#2b1b26'); r(7, 8, 1, 1, '#ff9a9a');
        }
      }
      // 帽子
      if (L.hat === 'chef') { r(2, -1, 6, 4, '#ffffff'); r(1, -2, 8, 2, '#ffffff'); r(2, 2, 6, 1, '#dfe4ea'); }
      if (L.hat === 'cap') { r(1, 1, 8, 2, L.capc); if (dir === 0) r(1, 3, 8, 1, shade(L.capc, -0.3)); if (dir === 2) r(7, 3, 3, 1, shade(L.capc, -0.3)); }
      if (L.hat === 'band') { r(1, 3, 8, 1, '#e8473b'); if (dir !== 0) r(0, 4, 2, 2, '#e8473b'); }
      if (L.hat === 'bow') { r(6, 1, 3, 2, '#ff6fa8'); r(7, 1, 1, 2, '#c03a70'); }
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
  facH(id) { const f = F[id]; if (f.cat === 'station') return 26; return ({ lantern: 26, neon: 24, shrine: 22, plant: 16, flower: 14, trash: 14, fan: 20, sink: 18, tv: 20, cat: 16, mascot: 26, fountain: 16, stage: 24, pinball: 22, gacha: 20, goldfish: 12, ring: 16, claw: 24, balloon: 24, bench: 10, stool: 12, wood: 12, round: 13, booth: 16, tB: 18, tS: 18, tG: 20 })[id] || 16; },
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
        case 'balloon':
          r(0, 0, 16, 22, '#f4e8c8'); r(0, 0, 16, 1, '#c8303a'); r(0, 21, 16, 3, '#a8703e');
          [[1, 2, '#ff4a3a'], [6, 2, '#ffd84a'], [11, 2, '#5ad0ff'], [3, 8, '#7affb0'], [8, 8, '#ff8ad0'], [12, 9, '#ff4a3a'], [1, 14, '#5ad0ff'], [6, 14, '#ffd84a'], [10, 15, '#ff8ad0']]
            .forEach(([x, y, c], i) => { if (((i + fr) % 7) !== 3) { r(x, y, 3, 4, c); r(x, y, 1, 1, '#ffffff'); r(x + 1, y + 4, 1, 1, '#8a8a8a'); } }); break;
      }
    });
  },
  station(r, id, fr, lv) {
    const aw = { griddle: ['#e8473b', '#fff4e8'], drink: ['#3a8ad8', '#e8f4ff'], fryer: ['#f0a020', '#fff4c8'], soup: ['#3a9a5a', '#eaffea'], ice: ['#ff6fa8', '#fff0f6'], steam: ['#a8703e', '#fff0d8'], grill: ['#8a2a2a', '#ffd8c8'] }[id];
    // 棚子支架
    r(1, 4, 1, 14, '#6a4a3a'); r(14, 4, 1, 14, '#6a4a3a');
    // 遮陽棚（條紋）
    for (let i = 0; i < 8; i++) r(i * 2, 1, 2, 4, i % 2 ? aw[1] : aw[0]);
    r(0, 0, 16, 1, shade(aw[0], -0.25));
    for (let i = 0; i < 8; i++) r(i * 2, 5, 2, 1, i % 2 ? aw[1] : aw[0]);
    // 攤車本體
    r(0, 16, 16, 10, shade(aw[0], -0.1)); r(0, 16, 16, 1, shade(aw[0], 0.3));
    r(2, 18, 12, 5, '#fff4dc'); r(0, 25, 16, 1, shade(aw[0], -0.4));
    r(2, 24, 2, 2, '#3a3a3a'); r(12, 24, 2, 2, '#3a3a3a');
    // 檯面
    r(0, 13, 16, 3, '#c8ccd4'); r(0, 13, 16, 1, '#e8ecf0');
    // 等級星星
    for (let i = 0; i < lv; i++) r(3 + i * 4, 20, 2, 2, '#ffc020');
    const f2 = fr & 1;
    switch (id) {
      case 'griddle':
        r(1, 11, 14, 3, '#5a5a64'); r(2, 11, 12, 1, '#7a7a84');
        r(3, 10, 5, 2, '#f4c870'); r(4, 10, 3, 1, '#ffe0a0'); r(9, 10, 4, 2, f2 ? '#ffd84a' : '#f4c870'); r(10, 10, 1, 1, '#59c25a'); break;
      case 'drink':
        r(2, 6, 5, 8, '#8a5a2b'); r(2, 6, 5, 1, '#a8703e'); r(3, 8, 3, 3, '#c8904a'); r(4, 12, 1, 1, '#3a3a3a');
        r(8, 9, 2, 5, '#f8f0e0'); r(8, 9, 2, 1, '#c8904a'); r(11, 9, 2, 5, '#f8f0e0'); r(11, 10, 2, 3, '#8a5a2b'); r(12, 7, 1, 2, '#ff4a3a'); r(9, 7, 1, 2, '#3a8ad8'); break;
      case 'fryer':
        r(2, 9, 9, 5, '#8a8a94'); r(3, 9, 7, 2, f2 ? '#ffc040' : '#e8a020'); r(4, 9, 1, 1, '#fff0a0'); r(7, 10, 1, 1, '#fff0a0');
        r(11, 6, 1, 6, '#5a5a64'); r(10, 10, 4, 3, '#c8c8d0'); r(11, 10, 2, 2, '#e8a020'); break;
      case 'soup':
        r(2, 7, 11, 7, '#8a8a94'); r(1, 7, 13, 2, '#a8a8b4'); r(3, 8, 9, 2, '#a8502a'); r(4, 8, 2, 1, '#e8a060');
        r(0, 9, 1, 2, '#5a5a64'); r(14, 9, 1, 2, '#5a5a64'); r(10, 4, 1, 5, '#c8904a'); break;
      case 'ice':
        r(1, 8, 14, 6, '#bfe8ff'); r(1, 8, 14, 1, '#ffffff'); r(2, 9, 3, 3, '#ffd84a'); r(6, 9, 3, 3, '#ff8ab0'); r(10, 9, 3, 3, '#a8e8a0');
        r(4, 6, 5, 3, '#ffffff'); r(5, 5, 3, 1, '#ffffff'); r(5, 6, 3, 1, '#ffb020'); break;
      case 'steam':
        r(2, 10, 11, 4, '#c8a060'); r(2, 10, 11, 1, '#e0c080'); r(3, 6, 9, 4, '#c8a060'); r(3, 6, 9, 1, '#e0c080'); r(4, 3, 7, 3, '#d8b070'); r(4, 3, 7, 1, '#f0d090');
        r(2, 12, 11, 1, '#a8804a'); r(3, 8, 9, 1, '#a8804a'); break;
      case 'grill':
        r(1, 10, 14, 4, '#3a3a40'); r(2, 11, 12, 2, f2 ? '#ff6a2a' : '#e84a1a'); r(3, 11, 1, 1, '#ffd040'); r(9, 12, 1, 1, '#ffd040');
        for (let i = 0; i < 4; i++) { r(2 + i * 3, 9, 1, 3, '#d8c8a0'); r(2 + i * 3, 8, 2, 2, i % 2 ? '#c8503a' : '#e8c040'); } break;
    }
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
        case 'gear': r(2, 2, 5, 5, '#a8b0c0'); r(4, 0, 1, 9, '#a8b0c0'); r(0, 4, 9, 1, '#a8b0c0'); r(4, 4, 1, 1, '#4a4a5a'); break;
        case 'people': r(1, 1, 3, 3, '#f4c8a0'); r(0, 4, 5, 4, '#5a8ad8'); r(5, 0, 3, 3, '#f4c8a0'); r(4, 3, 5, 5, '#e8473b'); break;
      }
    });
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
        case 'grill': r(5, 0, 1, 12, '#d8c8a0'); r(3, 1, 5, 4, ca); r(3, 5, 5, 4, cb); r(4, 2, 1, 1, '#ffffff'); r(3, 3, 5, 1, shade(ca, -0.3)); r(3, 7, 5, 1, shade(cb, -0.3)); break;
      }
    });
  },
  ing(id) {
    const c = ING[id].col;
    return this.get('g' + id, 9, 9, r => { r(1, 2, 7, 6, c); r(2, 1, 5, 8, c); r(2, 2, 2, 2, shade(c, 0.5)); r(5, 6, 2, 1, shade(c, -0.25)); });
  },
};
