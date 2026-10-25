'use strict';
// 夜市小吃王：新手引導
//   Story  開場故事（像素插圖＋對話，可跳過，新遊戲只播一次）
//   Guide  阿德伯一章一章帶著玩：功能慢慢解鎖、按鈕發亮、目前目標、小獎勵
//   Hint   卡關時的提示（沒客人、沒錢、排隊太長…）
//   Help   「怎麼玩」說明頁（有圖）

// 打字機：只算看得到的字，標籤整段跳過（沒關的 <b> 瀏覽器會自己補）
function typeCut(html, n) {
  let out = '', c = 0;
  for (let i = 0; i < html.length && c < n; i++) {
    if (html[i] === '<') { const j = html.indexOf('>', i); out += html.slice(i, j + 1); i = j; continue; }
    if (html[i] === '&') { const j = html.indexOf(';', i); out += html.slice(i, j + 1); i = j; c++; continue; }
    out += html[i]; c++;
  }
  return out;
}
function typeLen(html) { return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, 'x').length; }

// ====================== 開場故事 ======================
const Story = {
  el: null, cv: null, g: null, open: false, i: 0, k: 0, n: 0, t: 0, done: null, raf: 0,
  W: 160, H: 100, SC: 3,
  ownerLook(chef) { const S = Game.S, s = S && S.staff[0]; const L = makeLook(s ? s.seed : 7, 'staff', chef ? 'cook' : ''); return L; },
  firstDish() { const S = Game.S; const k = Object.keys(S.dishes).find(k => DISH[k].st === 'griddle'); return k ? DISH[k].n : '蔥抓餅'; },
  lines() {
    const S = Game.S, shop = esc(S.shop), d = this.firstDish();
    return [
      { cap: '夜市', l: [{ t: '傍晚六點，夜市的燈一盞一盞亮了起來。' }, { t: '烤香腸、蚵仔煎、珍珠奶茶……香味飄滿了整條街。' }] },
      { cap: '阿嬤的攤車', l: [{ t: `你是<b>阿福</b>。阿嬤在這條夜市賣了三十年的<b>${d}</b>。` }, { t: '她退休前，把這台老攤車和一本<b>食譜筆記</b>交給了你。' }, { t: `你決定讓攤車重新開張——招牌就叫「<b>${shop}</b>」！`, who: 'me' }] },
      { cap: '隔壁的阿德伯', l: [{ t: '喲！你就是阿嬤的乖孫吧？我是隔壁賣香腸的<b>阿德伯</b>！', who: 'ade' }, { t: '開店的事不用怕。一開始先顧好一台攤車就好，其他的我一步一步教你！', who: 'ade' }] },
      { cap: '夜市排行榜', l: [{ t: `這條夜市有三十家店在比<b>人氣</b>。你現在嘛……排第 <b>${S.rank || 29}</b> 名，哈哈，倒數的啦！`, who: 'ade' }, { t: '不過別洩氣。把菜做好吃、把客人顧好，總有一天，你會成為<b>夜市之王</b>！', who: 'ade' }] },
      { cap: '開張！', l: [{ t: `「<b>${shop}</b>」今天開張！準備好了嗎？`, who: 'me' }] },
    ];
  },
  play(done) {
    this.done = done; this.i = 0; this.k = 0; this.n = 0; this.t = 0; this.open = true; this.parts = [];
    this.data = this.lines();
    const el = this.el = document.createElement('div'); el.id = 'story';
    el.innerHTML = `<div class="shd"></div><div class="stf"><canvas></canvas><div class="scap"></div><button class="sskip" data-s="skip">跳過 ▸▸</button></div><div class="vn sv"><div class="vp"></div><div class="vt"><b class="vw"></b><p></p></div><i class="vnx">▼</i></div><div class="sdots"></div>`;
    document.body.appendChild(el);
    this.cv = el.querySelector('canvas'); this.cv.width = this.W * this.SC; this.cv.height = this.H * this.SC;
    this.g = this.cv.getContext('2d');
    el.addEventListener('click', e => {
      Snd.init();
      const b = e.target.closest('[data-s]');
      if (b && b.dataset.s === 'skip') { Snd.play('click'); this.close(); return; }
      if (b && b.dataset.s === 'go') { Snd.play('start'); this.close(); return; }
      this.tap();
    });
    this.show();
    let last = performance.now();
    const loop = now => { if (!this.open) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; this.t += dt; this.n += dt * 34; this.paint(); this.draw(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  },
  cur() { return this.data[this.i].l[this.k]; },
  show() {
    const sc = this.data[this.i], ln = this.cur();
    this.n = 0; this._txt = null;
    const vn = this.el.querySelector('.vn');
    vn.classList.toggle('nar', !ln.who);
    const who = ln.who === 'ade' ? ['阿德伯', Guide.look()] : ln.who === 'me' ? ['阿福', this.ownerLook(this.i === 4)] : null;
    vn.querySelector('.vp').innerHTML = who ? UI.img(Art.portrait(who[1], 'happy'), 3) : '';
    vn.querySelector('.vw').textContent = who ? who[0] : '';
    this.el.querySelector('.scap').innerHTML = `<small>第 ${this.i + 1} 幕</small>${sc.cap}`;
    this.el.querySelector('.shd').innerHTML = `<small>序章　${this.i + 1}／${this.data.length}</small><b>${sc.cap}</b>`;
    this.el.querySelector('.sdots').innerHTML = this.data.map((_, j) => `<i class="${j < this.i ? 'd' : j === this.i ? 'c' : ''}"></i>`).join('');
    const sf = this.el.querySelector('.stf'); sf.classList.remove('in'); void sf.offsetWidth; if (this.k === 0) sf.classList.add('in');
    if (this.k === 0) this.t = 0;
  },
  paint() {
    const ln = this.cur(), L = typeLen(ln.t), n = Math.min(L, Math.floor(this.n));
    if (n === this._txt) return; this._txt = n;
    const p = this.el.querySelector('.vn p');
    const last = this.i === this.data.length - 1 && this.k === this.data[this.i].l.length - 1;
    p.innerHTML = typeCut(ln.t, n) + (n >= L && last ? '<br><button class="btn go big sgo" data-s="go">開始營業！</button>' : '');
    this.el.querySelector('.vnx').hidden = n < L || last;
  },
  tap() {
    const ln = this.cur(), L = typeLen(ln.t);
    if (this.n < L) { this.n = L; return; }
    const sc = this.data[this.i];
    if (this.k < sc.l.length - 1) { this.k++; Snd.play('click'); }
    else if (this.i < this.data.length - 1) { this.i++; this.k = 0; Snd.play('tab'); }
    else return;
    this.show();
  },
  close() {
    if (!this.open) return;
    this.open = false; cancelAnimationFrame(this.raf);
    if (Game.S && Game.S.ob) Game.S.ob.story = 1;
    const el = this.el; el.classList.add('out'); setTimeout(() => el.remove(), 350);
    const d = this.done; this.done = null; if (d) d();
  },

  // ---------- 插圖（160×100 的像素畫，放大 3 倍畫到畫布上） ----------
  draw() {
    const g = this.g, t = this.t;
    g.setTransform(this.SC, 0, 0, this.SC, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, this.W, this.H);
    [this.s0, this.s1, this.s2, this.s3, this.s4][this.i].call(this, g, t);
  },
  R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); },
  sky(g, c0, c1, h) { for (let y = 0; y < h; y += 2) this.R(g, 0, y, this.W, 2, mixHex(c0, c1, y / h)); },
  stars(g, t, n, h) { for (let i = 0; i < n; i++) { const tw = Math.sin(t * 2 + i * 1.7) > 0.6; this.R(g, (hash(i, 1, 5) * this.W) | 0, (hash(i, 2, 5) * h) | 0, 1, 1, tw ? '#ffffff' : '#9a90c8'); } },
  skyline(g, base, seed, col, win) {
    for (let x = -4, i = 0; x < this.W; i++) {
      const w = 10 + ((hash(i, 3, seed) * 4) | 0) * 3, h = 14 + ((hash(i, 4, seed) * 6) | 0) * 4;
      this.R(g, x, base - h, w, h, col);
      for (let wy = base - h + 3; wy < base - 3; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (hash(wx, wy, seed) < 0.35) this.R(g, wx, wy, 2, 2, win);
      x += w + 1;
    }
  },
  lanterns(g, y, t, x0 = 0, x1 = this.W, sag = 5) {
    g.fillStyle = '#2b1b26';
    for (let x = x0; x < x1; x++) { const k = (x - x0) / (x1 - x0); g.fillRect(x, y + Math.round(Math.sin(k * Math.PI) * sag), 1, 1); }
    for (let x = x0 + 6, i = 0; x < x1 - 3; x += 12, i++) {
      const k = (x - x0) / (x1 - x0), yy = y + Math.round(Math.sin(k * Math.PI) * sag) + 1, sw = Math.round(Math.sin(t * 2 + i) * 0.8);
      this.R(g, x + sw - 1, yy, 1, 2, '#2b1b26');
      this.R(g, x + sw - 3, yy + 2, 6, 6, i % 3 === 1 ? '#ffb020' : '#e8302a'); this.R(g, x + sw - 2, yy + 1, 4, 8, i % 3 === 1 ? '#ffb020' : '#e8302a');
      this.R(g, x + sw - 2, yy + 3, 1, 3, '#ffe08a'); this.R(g, x + sw - 3, yy + 9, 6, 1, '#ffd040');
      g.fillStyle = 'rgba(255,170,60,.12)'; g.beginPath(); g.arc(x + sw, yy + 5, 7, 0, TAU); g.fill();
    }
  },
  spr(g, c, x, y, s, flip) { // 以腳底中心 (x, y) 為基準畫快取圖
    const w = c.width * s, h = c.height * s, X = Math.round(x - (c.width / 2) * s), Y = Math.round(y - (c.height - 1) * s);
    if (!flip) g.drawImage(c, X, Y, w, h);
    else { g.save(); g.translate(X + w, Y); g.scale(-1, 1); g.drawImage(c, 0, 0, w, h); g.restore(); }
  },
  person(g, L, x, y, s, dir, fr, pose, face, flip) { this.spr(g, Art.person(L, dir, fr, pose, face), x, y, s, flip); },
  fac(g, id, x, y, s, fr = 0) { this.spr(g, Art.fac(id, fr), x, y, s); },
  ground(g, y, c0, c1) { this.R(g, 0, y, this.W, this.H - y, c0); for (let x = 0; x < this.W; x += 8) for (let yy = y + 3; yy < this.H; yy += 6) this.R(g, x + ((yy / 6) & 1) * 4, yy, 7, 1, c1); this.R(g, 0, y, this.W, 1, shade(c0, 0.25)); },
  steam(g, x, y, t, n = 3) { for (let i = 0; i < n; i++) { const k = (t * 0.6 + i / n) % 1; g.fillStyle = `rgba(255,255,255,${0.45 * (1 - k)})`; g.beginPath(); g.arc(x + Math.sin(k * 6 + i) * 2, y - k * 14, 1.2 + k * 2.2, 0, TAU); g.fill(); } },
  glow(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); },
  text(g, s, x, y, size, col, edge, al = 'center') {
    g.font = `900 ${size}px "Noto Sans TC",sans-serif`; g.textAlign = al; g.textBaseline = 'middle';
    if (edge) { g.fillStyle = edge; for (const [dx, dy] of [[-.6, 0], [.6, 0], [0, -.6], [0, .6]]) g.fillText(s, x + dx, y + dy); }
    g.fillStyle = col; g.fillText(s, x, y);
  },
  crowd(g, t, n, y0, y1, seed, s = 1) {
    const ps = this._crowd || (this._crowd = []);
    if (ps.seed !== seed) { ps.length = 0; ps.seed = seed; for (let i = 0; i < n; i++) { const k = ['student', 'couple', 'worker', 'elder', 'kid', 'tourist'][i % 6]; ps.push({ L: makeLook(300 + i * 13, k), x: hash(i, 7, seed) * 200 - 20, y: y0 + hash(i, 8, seed) * (y1 - y0), v: (hash(i, 9, seed) < 0.5 ? -1 : 1) * (6 + hash(i, 10, seed) * 6) }); } }
    const list = ps.map(p => ({ p, x: ((p.x + t * p.v) % 200 + 200) % 200 - 20 })).sort((a, b) => a.p.y - b.p.y);
    for (const { p, x } of list) this.person(g, p.L, x, p.y, s, 2, Math.floor(t * 6 + p.y) & 3, '', '', p.v < 0);
  },
  // 第 1 幕：夜市全景
  s0(g, t) {
    this.sky(g, '#1c1442', '#ff8a5a', 62);
    this.stars(g, t, 22, 30);
    this.glow(g, 128, 40, 30, 'rgba(255,200,120,.35)');
    this.R(g, 122, 34, 12, 12, '#ffe8a8'); this.R(g, 120, 36, 16, 8, '#ffe8a8');
    this.skyline(g, 62, 11, '#2a1f4a', '#ffd890');
    this.skyline(g, 64, 23, '#1f1838', '#ffcf70');
    // 直式霓虹招牌
    const on = Math.sin(t * 3) > -0.6;
    this.R(g, 20, 22, 9, 30, '#2b1b26'); this.R(g, 21, 23, 7, 28, on ? '#ff3a8a' : '#6a2a4a');
    this.text(g, '夜', 24.5, 30, 6, on ? '#fff0f8' : '#c890a8'); this.text(g, '市', 24.5, 38, 6, on ? '#fff0f8' : '#c890a8'); this.text(g, '街', 24.5, 46, 6, on ? '#fff0f8' : '#c890a8');
    if (on) this.glow(g, 24, 37, 18, 'rgba(255,80,160,.25)');
    this.ground(g, 64, '#4a3a4e', '#5a4a5e');
    this.lanterns(g, 6, t, -4, 164, 6);
    const st = ['griddle', 'fryer', 'drink', 'ice', 'soup'];
    for (let i = 0; i < 5; i++) { const x = 18 + i * 31; this.glow(g, x, 58, 16, 'rgba(255,190,90,.22)'); this.fac(g, st[i], x, 74, 1, Math.floor(t * 4 + i) & 1); this.steam(g, x - 2, 48, t + i * 0.3, 2); }
    this.crowd(g, t, 11, 78, 98, 1, 1);
  },
  // 第 2 幕：昏暗巷子裡的老攤車、阿福拿著食譜筆記
  s1(g, t) {
    this.sky(g, '#120e24', '#2a1e3a', 100);
    for (let y = 4; y < 70; y += 6) for (let x = ((y / 6) & 1) * 6 - 6; x < this.W; x += 12) this.R(g, x, y, 11, 5, '#2e2240');
    this.ground(g, 70, '#2a2234', '#352b40');
    // 吊燈
    const sw = Math.sin(t * 1.3) * 1.5;
    this.R(g, 70, 0, 1, 14, '#3a2a3a'); this.R(g, 67 + sw, 14, 7, 3, '#5a4a3a'); this.R(g, 68 + sw, 17, 5, 3, '#fff4c0');
    g.fillStyle = 'rgba(255,230,150,.16)'; g.beginPath(); g.moveTo(66 + sw, 18); g.lineTo(75 + sw, 18); g.lineTo(112, 92); g.lineTo(28, 92); g.closePath(); g.fill();
    this.glow(g, 70 + sw, 19, 14, 'rgba(255,240,180,.55)');
    // 老攤車（灰灰的，有布蓋著一半）
    this.glow(g, 58, 70, 30, 'rgba(255,220,140,.18)');
    this.fac(g, 'griddle', 58, 92, 2, 0);
    // 舊舊的：蓋一層灰、掛著蜘蛛網、地上有落葉
    g.fillStyle = 'rgba(70,60,90,.38)'; g.fillRect(42, 34, 33, 58);
    g.fillStyle = 'rgba(230,230,240,.5)'; for (let i = 0; i < 6; i++) { g.fillRect(43 + i, 35 + i, 1, 1); g.fillRect(43, 35 + i, 1, 1); g.fillRect(43 + i, 35, 1, 1); }
    for (let i = 0; i < 5; i++) this.R(g, 30 + i * 13 + (i & 1) * 4, 90 + (i % 2), 3, 1, ['#8a5a2a', '#a86a2a', '#6a4a2a'][i % 3]);
    // 阿福拿著筆記本
    const L = this.ownerLook(false);
    this.person(g, L, 110, 93, 2, 2, 0, '', 'happy', true);
    const by = 62 + Math.sin(t * 2) * 0.6;
    this.R(g, 95, by, 10, 12, '#8a3a2a'); this.R(g, 96, by + 1, 8, 10, '#a84a32'); this.R(g, 98, by + 3, 4, 2, '#ffe08a'); this.R(g, 104, by + 1, 1, 10, '#fff4e0');
    for (let i = 0; i < 4; i++) { const k = (t * 0.7 + i / 4) % 1; g.globalAlpha = 1 - k; this.R(g, 98 + Math.sin(i * 2 + t) * 8, by - 2 - k * 12, 1, 1, '#ffe070'); this.R(g, 97 + Math.sin(i * 2 + t) * 8, by - 1 - k * 12, 3, 1, 'rgba(255,224,112,.5)'); }
    g.globalAlpha = 1;
  },
  // 第 3 幕：隔壁香腸攤的阿德伯
  s2(g, t) {
    this.sky(g, '#1a1440', '#5a2a5a', 60);
    this.stars(g, t, 14, 26);
    this.skyline(g, 58, 41, '#2a1f4a', '#ffd890');
    this.ground(g, 60, '#4a3a4e', '#5a4a5e');
    this.lanterns(g, 4, t, -4, 164, 4);
    // 香腸攤
    this.glow(g, 40, 64, 30, 'rgba(255,150,60,.3)');
    this.R(g, 14, 22, 52, 7, '#2b1b26'); for (let x = 15; x < 65; x += 6) this.R(g, x, 23, 3, 5, '#e8302a'), this.R(g, x + 3, 23, 3, 5, '#fff4e0');
    this.R(g, 22, 12, 36, 10, '#2b1b26'); this.R(g, 23, 13, 34, 8, '#ffd040'); this.text(g, '阿德香腸', 40, 17.4, 6.5, '#c8202a');
    this.R(g, 16, 29, 2, 40, '#5a3a2a'); this.R(g, 62, 29, 2, 40, '#5a3a2a');
    this.fac(g, 'grill', 46, 92, 2, Math.floor(t * 5) & 1);
    for (let i = 0; i < 2; i++) this.steam(g, 40 + i * 10, 40, t + i * 0.5, 3);
    // 阿德伯揮手
    const A = Guide.look();
    this.person(g, A, 84, 93, 2, 0, 0, Math.floor(t * 3) & 1 ? 'call' : '', 'happy');
    // 阿福
    this.person(g, this.ownerLook(false), 132, 94, 2, 2, 0, '', 'happy', true);
    if (Math.floor(t * 2) & 1) { this.R(g, 92, 36, 3, 7, '#ffd040'); this.R(g, 92, 45, 3, 2, '#ffd040'); }
  },
  // 第 4 幕：排行榜
  s3(g, t) {
    this.sky(g, '#1c1236', '#3a1e4a', 100);
    this.lanterns(g, 2, t, -4, 164, 3);
    const L = Game.ladder(), me = L.findIndex(r => r.me);
    this.R(g, 22, 10, 96, 86, '#3a1e12'); this.R(g, 24, 12, 92, 82, '#5a3422'); this.R(g, 26, 22, 88, 70, '#fff4d8');
    this.R(g, 26, 13, 88, 9, '#c8302a'); this.text(g, '夜市排行榜', 70, 17.6, 6.5, '#fff4c0', '#5a1a0a');
    const rows = [0, 1, 2, 3, 4, -1, me];
    rows.forEach((ri, j) => {
      const y = 24 + j * 9.6;
      if (ri < 0) { this.text(g, '⋯', 70, y + 4, 6, '#a88a6a'); return; }
      const r = L[ri]; if (!r) return;
      const mine = r.me, gold = ri === 0;
      this.R(g, 28, y, 84, 8.4, mine ? (Math.sin(t * 5) > 0 ? '#ffb070' : '#ffd8a8') : gold ? '#ffe680' : j & 1 ? '#fbe8c4' : '#f6dcb0');
      this.text(g, String(ri + 1), 34, y + 4.4, 5.5, gold ? '#c87800' : '#8a4a2a');
      this.text(g, r.n, 42, y + 4.4, 5.2, '#3a2418', null, 'left');
    });
    // 皇冠
    const cy = 22 + Math.sin(t * 3) * 1;
    this.R(g, 100, cy - 2, 12, 5, '#ffc020'); this.R(g, 100, cy - 5, 2, 3, '#ffc020'); this.R(g, 105, cy - 6, 2, 4, '#ffc020'); this.R(g, 110, cy - 5, 2, 3, '#ffc020'); this.R(g, 104, cy - 1, 3, 2, '#e8302a');
    for (let i = 0; i < 5; i++) { const a = t * 2 + i * 1.25; this.R(g, 106 + Math.cos(a) * 11, cy + Math.sin(a) * 5, 1, 1, '#fff6b0'); }
    this.person(g, Guide.look(), 140, 96, 2, 2, 0, 'call', 'happy', true);
    this.person(g, this.ownerLook(false), 12, 98, 2, 2, 0, '', '', false);
  },
  // 第 5 幕：開張！
  s4(g, t) {
    this.sky(g, '#1a1440', '#3a2050', 40);
    this.stars(g, t, 16, 20);
    const S = Game.S;
    this.R(g, 10, 4, 140, 22, '#5a2a1a'); this.R(g, 12, 6, 136, 18, '#c8202a'); this.R(g, 14, 8, 132, 14, '#e8402a');
    for (let x = 12; x < 148; x += 4) this.R(g, x, 4, 2, 1, Math.floor(t * 4 + x / 4) & 1 ? '#fff6b0' : '#ffb040');
    this.text(g, S.shop, 80, 15.6, 11, '#fff4c0', '#5a1a0a');
    for (let x = 6, i = 0; x < 154; x += 10, i++) { this.R(g, x, 26, 10, 7, i & 1 ? '#fff4e0' : '#e8302a'); this.R(g, x, 33, 10, 2, i & 1 ? '#e8dcc8' : '#b8202a'); }
    this.R(g, 0, 35, this.W, 30, '#3a2a3a');
    this.ground(g, 64, '#8a7a7a', '#9a8a8a');
    this.glow(g, 80, 70, 40, 'rgba(255,200,110,.35)');
    const L = this.ownerLook(true);
    this.person(g, L, 80, 72, 2, 0, Math.floor(t * 6) & 3, 'cook', 'happy');
    this.fac(g, 'griddle', 80, 96, 2, Math.floor(t * 5) & 1);
    this.steam(g, 76, 44, t, 3); this.steam(g, 86, 46, t + 0.4, 3);
    this.person(g, Guide.look(), 134, 96, 2, 2, 0, Math.floor(t * 4) & 1 ? 'call' : '', 'happy', true);
    this.person(g, makeLook(55, 'student'), 30, 98, 2, 2, Math.floor(t * 6) & 3, '', 'happy');
    this.person(g, makeLook(91, 'kid'), 14, 99, 2, 2, Math.floor(t * 6 + 1) & 3, '', 'happy');
    // 彩紙＋鞭炮火花
    for (let i = 0; i < 40; i++) {
      const k = (t * 0.35 + hash(i, 1, 77)) % 1, x = hash(i, 2, 77) * this.W + Math.sin(t * 3 + i) * 3, y = -4 + k * 108;
      this.R(g, x, y, 2, Math.sin(t * 8 + i) > 0 ? 2 : 1, ['#ff4a6a', '#ffd040', '#5ad0ff', '#7affb0', '#ff8ad0', '#ffffff'][i % 6]);
    }
    for (const sx of [4, 156]) { const k = (t * 1.5) % 1; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t; this.R(g, sx + Math.cos(a) * k * 10, 42 + Math.sin(a) * k * 10, 1, 1, k < 0.7 ? '#fff0a0' : '#ff8a3d'); } }
  },
};

// ====================== 阿德伯的引導 ======================
// u：這一章開放的功能；tab：打開建造面板時先切到哪一頁；goals：依序完成（第一個沒完成的會讓按鈕發亮）；r：完成獎勵
const GUIDE = [
  { t: '開張第一天', u: [],
    lines: () => [`這就是你阿嬤留下的<b>鐵板煎台</b>！一開始我們只顧好這一台就好。`, '客人會走到攤位前面<b>排隊</b>，廚師煮好就<b>收錢</b>，客人再找<b>位子</b>坐下來吃。', '現在時間是<b>暫停</b>的。按右上角的 <b>x1</b> 開門做生意吧！'],
    goals: [
      { t: '按右上角「x1」開始營業', done: () => UI.speed > 0, hl: ['#speed [data-v="1"]'] },
      { t: () => `賣出 8 份${Story.firstDish()}`, prog: () => [Guide.sold() - Guide.ob().b, 8] },
    ], base: () => Guide.sold(), r: { money: 300 } },
  { t: '第二台攤車', u: ['build', 'tab:station'], tab: 'station', gift: 'drink',
    lines: () => ['生意不錯嘛！不過只賣一種東西，<b>想喝飲料</b>的客人就沒東西買了。', '我那台用不到的<b>飲料吧</b>就送你吧！打開<b>「建造」</b>，點<b>飲料吧</b>，再點店裡<b>發亮的那一格</b>放下去。', '我姪女<b>阿珠</b>也會過來幫你顧飲料攤喔！'],
    goals: [{ t: '把阿德伯送的「飲料吧」擺進店裡', done: () => Game.hasStation('drink'), hl: ['[data-a="pick"][data-v="drink"]', '#panel [data-a="tab"][data-v="station"]', '#bar [data-v="build"]'] }],
    after() { Guide.addAzhu(); } },
  { t: '擺桌椅', u: ['tab:seat'], tab: 'seat',
    lines: () => ['客人買了東西<b>沒位子坐</b>，就只好外帶，<b>滿意度</b>會變低。', '到<b>「建造」→「座位」</b>，再買 <b>2 組塑膠桌椅</b>，擺在店裡的空地上。'],
    goals: [{ t: '再擺 2 組桌椅', prog: () => [Guide.seats() - Guide.ob().b, 2], hl: ['[data-a="pick"][data-v="stool"]', '#panel [data-a="tab"][data-v="seat"]', '#bar [data-v="build"]'] }],
    base: () => Guide.seats(), r: { money: 600 } },
  { t: '調整價錢', u: ['menu'],
    lines: () => ['價錢是賺錢的關鍵！打開<b>「菜單」</b>看看。', '按 <b>＋／－</b> 可以調價錢。<b class="cg">綠色</b>剛好、<b class="cr">紅色</b>太貴客人會不高興、<b class="cb">藍色</b>太便宜賺得少。先試著調一次看看！'],
    goals: [{ t: '在「菜單」調整一道菜的價錢', done: () => Guide.ob().f.price, hl: ['#panel [data-a="price"]', '#bar [data-v="menu"]'] }],
    r: { money: 300 } },
  { t: '研發新菜', u: ['lab', 'idea', 'tab:ing'],
    lines: () => ['客人吃久了會膩，<b>菜色越多</b>，客人越開心。', `右上角的燈泡是<b>靈感</b>，研發新菜要用到它。打開<b>「研發」</b>，把<b>${Guide.pairN()[0]}</b>和<b>${Guide.pairN()[1]}</b>放進格子，按「研發！」`],
    goals: [{ t: () => `研發一道新菜（${Guide.pairN().join(' ＋ ')}）`, prog: () => [Game.nKnown() - Guide.ob().b, 1], hl: ['[data-a="rgo"]:not([disabled])', '[data-a="rpick"][data-v="@A"]:not(.on)', '[data-a="rpick"][data-v="@B"]:not(.on)', '#panel [data-a="tab"][data-v="lab"]', '#bar [data-v="lab"]'] }],
    base: () => Game.nKnown(), r: { idea: 6 },
    // 靈感或錢不夠研發的話，阿德伯先補一點，不會卡住
    start() { const S = Game.S, ic = Game.ideaCost(), mc = Game.moneyCost(); if (S.idea < ic) S.idea = ic; if (S.money < mc) S.money = mc; } },
  { t: '請幫手', u: ['staff'],
    lines: () => ['客人越來越多，<b>桌子髒了</b>沒人收可不行。', '打開<b>「員工」→「徵人」</b>，請一位新員工。工作分成<b>廚師</b>（顧攤位）、<b>外場</b>（清桌子、招呼客人）、<b>攬客</b>（在門口拉客人）。'],
    goals: [{ t: '請一位新員工', prog: () => [Game.S.staff.length - Guide.ob().b, 1], hl: ['#panel [data-a="hire"]', '#panel [data-a="tab"][data-v="hire"]', '#bar [data-v="staff"]'] }],
    base: () => Game.S.staff.length, r: { money: 800 },
    start() { const S = Game.S; if (!S.hire.length) Game.rollHire(); const fee = Math.min(...S.hire.map(c => c.sal * 2)); if (S.money < fee) S.money = fee; } },
  { t: '裝飾與組合', u: ['tab:decor', 'tab:fun', 'tab:floor'], tab: 'decor',
    lines: () => ['店要<b>漂亮</b>，客人才會被吸引進來。裝飾會增加<b>魅力</b>。', '有些東西放在<b>隔壁</b>（斜的也算）會變成<b>擺設組合</b>，有額外加成！試試在紅燈籠旁邊再放一個<b>紅燈籠</b>。'],
    goals: [{ t: '發現一個擺設組合（兩個紅燈籠放隔壁）', prog: () => [Object.keys(Game.S.combos).length, 1], hl: ['[data-a="pick"][data-v="lantern"]', '#panel [data-a="tab"][data-v="decor"]', '#bar [data-v="build"]'] }],
    r: { money: 1000 } },
  { t: '人氣與排行榜', u: ['info', 'pop', 'rank'],
    lines: () => ['客人吃得開心，<b>人氣</b>（愛心）就會上升。夜市的<b>排行榜</b>比的就是人氣！', '打開<b>「經營」</b>看看排行榜，還有可以挑戰的<b>目標</b>。'],
    goals: [{ t: '打開「經營」看排行榜', done: () => UI.panel === 'info', hl: ['#bar [data-v="info"]'] }],
    r: { idea: 5 } },
  { t: '擴建成小吃店', u: ['biz', 'expand'], tab: 'station',
    lines: () => ['接下來的大目標：人氣到 <b>120</b>、存到 <b>$20,000</b>，就能擴建成「<b>巷口小吃店</b>」，店面變大、能請更多人！', '這段時間附近的人可能會來<b>委託</b>你幫忙，完成有獎勵，在<b>「事業」</b>可以看到。', '慢慢來不用急。不知道下一步要做什麼，就看看<b>左上角的目標</b>！'],
    goals: [
      { t: '人氣達到 120', live: 1, prog: () => [Game.S.pop, 120] },
      { t: '存到 $20,000', live: 1, prog: () => [Game.S.money, 20000], money: 1 },
      { t: '到「建造」→「攤位」按「擴建」', done: () => Game.S.lv >= 1, hl: ['#panel [data-a="expand"]', '#panel [data-a="tab"][data-v="station"]', '#bar [data-v="build"]'] },
    ], fin: () => Game.S.lv >= 1, r: { money: 2000, idea: 10 } },
  { t: '出師了！', u: [], end: 1,
    lines: () => ['恭喜！你已經是個像樣的老闆了。', '每年 <b>10 月</b>有<b>夜市小吃大賽</b>，年底有<b>頒獎典禮</b>。之後還能辦<b>活動</b>、研究<b>秘方</b>、開<b>分店</b>。', '目標是排行榜<b>第一名</b>——成為<b>夜市之王</b>！左上角會一直告訴你下一步。加油啊！'],
    goals: [], r: { idea: 10 } },
];
const GUIDE_ALL = ['build', 'staff', 'menu', 'lab', 'biz', 'info', 'idea', 'pop', 'rank', 'tab:station', 'tab:seat', 'tab:decor', 'tab:fun', 'tab:floor', 'tab:ing', 'expand'];

const Guide = {
  coachOpen: false, el: null, gel: null, hlEl: null, line: 0, n: 0, wait: 0, _gk: '',
  look() { const L = makeLook(4242, 'elder'); L.hat = 'band'; L.key += 'tut'; return L; },
  ob() { return Game.S && Game.S.ob; },
  on() { const o = this.ob(); return !!(o && o.ch >= 0); },
  ch() { const o = this.ob(); return o && o.ch >= 0 ? GUIDE[o.ch] : null; },
  can(k) { const o = this.ob(); return !o || o.ch === -1 || !!o.u[k]; },
  blocking() { return this.coachOpen || Story.open || Help.open; },
  sold() { let n = 0; const d = Game.S.st.dsold; for (const k in d) n += d[k]; return n; },
  seats() { return Game.S.items.filter(i => F[i.id].cat === 'seat').length; },
  pair() { return Game.S.scen === 'sweet' ? ['tea', 'milk'] : ['flour', 'egg']; },
  pairN() { return this.pair().map(k => ING[k].n); },
  init() {
    this.el = $('#coach'); this.gel = $('#goal');
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-g]');
      if (b && b.dataset.g === 'skip') { this.askSkip(); return; }
      if (b && b.dataset.g === 'ok') { this.closeCoach(); return; }
      this.tapCoach();
    });
    this.gel.addEventListener('click', e => {
      Snd.init();
      const b = e.target.closest('[data-g]'); const k = b ? b.dataset.g : 'body';
      if (k === 'help') { Snd.play('tab'); Help.show(this.on() ? this.helpSec() : 'flow'); return; }
      if (k === 'min') { Prefs.d.trk = Prefs.d.trk ? 0 : 1; Prefs.save(); Snd.play('click'); this._gk = ''; this.renderGoal(); return; }
      if (Prefs.d.trk) { Prefs.d.trk = 0; Prefs.save(); this._gk = ''; this.renderGoal(); return; }
      if (this.on()) { Snd.play('click'); this.showCoach(true); }
      else { Snd.play('tab'); UI.tab.info = 'goal'; UI.closeInfo(); UI.openPanel('info'); }
    });
  },
  helpSec() { return ['flow', 'build', 'seat', 'menu', 'lab', 'staff', 'combo', 'pop', 'pop', 'biz'][this.ob().ch] || 'flow'; },
  // 新遊戲：故事播完以後從第 0 章開始
  begin() { this._begin = true; UI.setSpeed(0); },
  start(i, fresh) {
    const o = this.ob(), C = GUIDE[i];
    o.ch = i; o.g = {}; o.b = C.base ? C.base() : 0;
    if (C.start) C.start();
    for (const k of C.u) { if (!o.u[k]) { o.u[k] = 1; this.flashNew(k); } }
    if (C.tab) UI.tab.build = C.tab;
    this.applyGates();
    this._gk = '';
    this.showCoach(false);
  },
  // 把還沒介紹的按鈕／數值藏起來
  applyGates() {
    for (const k of ['build', 'staff', 'menu', 'lab', 'biz', 'info']) { const b = document.querySelector(`#bar [data-v="${k}"]`); if (b) b.hidden = !this.can(k); }
    $('#hudIdea').hidden = !this.can('idea'); $('#hudPop').hidden = !this.can('pop'); $('#hudRank').hidden = !this.can('rank');
    UI.measure && UI.measure();
  },
  flashNew(k) {
    const el = k === 'idea' ? $('#hudIdea') : k === 'pop' ? $('#hudPop') : k === 'rank' ? $('#hudRank') : document.querySelector(`#bar [data-v="${k}"]`);
    if (!el) return;
    el.classList.add('nw');
    if (el.classList.contains('chip')) setTimeout(() => el.classList.remove('nw'), 9000);
  },
  // ---------- 阿德伯說話（對話框，說話的時候時間停住） ----------
  showCoach(replay) {
    const C = this.ch(); if (!C) return;
    UI.closeInfo(); Hint.hide();
    if (!replay) { UI.closePanel(); UI.endBuild(); }
    this.coachOpen = true; this.line = 0; this.n = 0; this.replay = replay;
    this.lines = C.lines();
    const o = this.ob();
    this.el.innerHTML = `<div class="vp">${UI.img(Art.portrait(this.look(), 'happy'), 3)}</div><div class="vt"><b class="vw">阿德伯<em>${o.ch < GUIDE.length - 1 ? `第 ${o.ch + 1} 課・` : ''}${C.t}</em></b><p></p><div class="vf"></div></div><i class="vnx">▼</i>${o.ch < GUIDE.length - 1 ? '<button class="vskip" data-g="skip">跳過新手引導</button>' : ''}`;
    this.el.hidden = false;
    this.el.classList.remove('in'); void this.el.offsetWidth; this.el.classList.add('in');
    $('#coachDim').hidden = false;
    this.clearHl();
    Snd.play('event');
    this._typed = -1;
  },
  coachTick(dt) {
    if (!this.coachOpen) return;
    this.n += dt * 36;
    const ln = this.lines[this.line], L = typeLen(ln), n = Math.min(L, Math.floor(this.n));
    if (n === this._typed) return; this._typed = n;
    this.el.querySelector('p').innerHTML = typeCut(ln, n);
    const last = this.line === this.lines.length - 1, C = this.ch();
    const done = n >= L;
    this.el.querySelector('.vnx').hidden = !done || last;
    let f = '';
    if (done && last) {
      const gs = C.goals.map(g => `<li>${typeof g.t === 'function' ? g.t() : g.t}</li>`).join('');
      f = (gs ? `<div class="vgoal"><small>目標</small><ul>${gs}</ul>${C.r ? `<small class="vr">獎勵 ${Game.rewardText(C.r)}</small>` : ''}</div>` : '') + `<button class="btn go" data-g="ok">${C.end ? '開始經營！' : this.replay ? '知道了' : '好，我來試試！'}</button>`;
    }
    this.el.querySelector('.vf').innerHTML = f;
    this.el.querySelector('.vp img')?.classList.toggle('talk', !done);
  },
  tapCoach() {
    const ln = this.lines[this.line], L = typeLen(ln);
    if (this.n < L) { this.n = L; return; }
    if (this.line < this.lines.length - 1) { this.line++; this.n = 0; Snd.play('click'); }
  },
  closeCoach() {
    Snd.play('click');
    this.coachOpen = false; this.el.hidden = true; $('#coachDim').hidden = true;
    const C = this.ch();
    if (C && C.end) { this.finish(C); return; }
    this._gk = ''; this.update();
  },
  askSkip() {
    if (!confirm('跳過新手引導？所有功能會直接打開。\n（「選單 → 怎麼玩」隨時可以看說明）')) return;
    this.coachOpen = false; this.el.hidden = true; $('#coachDim').hidden = true;
    this.skipAll();
    UI.toast('已跳過新手引導，所有功能都打開了', '');
    if (!UI.speed) UI.setSpeed(1);
  },
  skipAll(quiet) {
    const o = this.ob(); if (!o) return;
    if (o.ch >= 0 && o.ch <= 2 || o.ch <= -2 && o.ch >= -4) this.catchUp();
    for (const k of GUIDE_ALL) o.u[k] = 1;
    o.ch = -1; this.coachOpen = false;
    if (this.el) { this.el.hidden = true; $('#coachDim').hidden = true; }
    if (!quiet) { Prefs.d.tutDone = 1; Prefs.save(); }
    this.clearHl(); this.applyGates(); this._gk = '';
    if (!quiet) this.renderGoal();
  },
  finish(C) {
    if (C.r) { Game.giveReward(C.r); }
    this.skipAll();
    Game.confetti(Game.S.W * TILE / 2, Game.S.H * TILE * 0.4, 50); Snd.play('fanfare');
    UI.toast(`新手引導完成！${C.r ? Game.rewardText(C.r) : ''}`, 'goal');
    if (!UI.speed) UI.setSpeed(1);
  },
  goalDone(g, i) {
    const o = this.ob();
    if (!g.live && o.g[i]) return true;
    let d;
    if (g.prog) { const p = g.prog(); d = p[0] >= p[1]; } else d = !!g.done();
    if (d && !g.live) o.g[i] = 1;
    return d;
  },
  complete(C) {
    const o = this.ob();
    if (C.r) Game.giveReward(C.r);
    if (C.after) C.after();
    Snd.play('level');
    Game.confetti(Game.S.W * TILE / 2, Game.S.H * TILE * 0.4, 26);
    UI.toast(`✔ ${C.t} 完成！${C.r ? '　' + Game.rewardText(C.r) : ''}`, 'goal');
    this.clearHl();
    o.ch = -2 - o.ch; // 等一下再開下一章（負數＝中場）
    this.wait = 1.6;
    this._gk = ''; this.renderGoal();
  },
  // 在前幾課就跳過：把一般開局會有的飲料吧、阿珠、桌椅補上
  catchUp() {
    const S = Game.S, ok = (id, x, y) => Game.inPlot(x, y) && !Game.canPlace(id, x, y, true);
    if (!Game.hasStation('drink')) for (const [x, y] of [[3, 1], [4, 1], [2, 1]]) if (ok('drink', x, y)) { Game.place('drink', x, y, true); break; }
    if (!S.staff.some(s => s.name === '阿珠')) this.addAzhu(true);
    if (this.seats() < 2) for (const [x, y] of [[4, 3], [3, 3], [4, 4]]) if (ok('stool', x, y)) { Game.place('stool', x, y, true); break; }
  },
  addAzhu(quiet) {
    const S = Game.S; if (S.staff.some(s => s.name === '阿珠')) return;
    const ch = S.ob.chef || 0;
    const s = Game.newStaff({ name: '阿珠', cook: 5 + ch, serv: 6 + ch, charm: 4 + ch, job: 'cook', trait: 'smile' });
    S.staff.push(s); Game.spawnStaff(s);
    if (!quiet) { UI.toast('阿德伯的姪女「阿珠」來幫忙顧飲料吧了！', 'good'); Snd.play('hire'); }
  },
  // 每 0.25 秒從主迴圈呼叫
  update(dt = 0.25) {
    if (!this.gel) return;
    const o = this.ob();
    if (Main.state !== 'play' || !Game.S) { this.gel.hidden = true; this.clearHl(); return; }
    if (this._begin) { if (UI.modal || Game.pending.length || Story.open) return; this._begin = false; if (o && o.ch >= 0) { UI.setSpeed(0); this.start(o.ch); } return; }
    if (o && o.ch <= -2) { // 章節之間的空檔：目標卡片全部打勾，等一下再開下一課
      this.renderGoal();
      if (UI.modal) return;
      this.wait -= dt; if (this.wait <= 0) { const nx = -2 - o.ch + 1; if (nx < GUIDE.length) this.start(nx); else this.skipAll(); }
      return;
    }
    // 舊玩家放著不理：一年後自動全部打開
    if (o && o.ch >= 0 && o.ch < 8 && Game.S.week >= 48) { for (const k of GUIDE_ALL) o.u[k] = 1; this.start(8); return; }
    this.renderGoal();
    if (!this.on() || UI.modal || this.coachOpen || Story.open || Help.open) { this.clearHl(); return; }
    const C = this.ch();
    // 進度
    let allDone = true, first = null;
    C.goals.forEach((g, i) => { const d = this.goalDone(g, i); if (!d) { allDone = false; if (!first) first = g; } });
    if (C.fin ? C.fin() : (allDone && C.goals.length)) { this.complete(C); return; }
    // 發亮的按鈕
    let tgt = null;
    const [A, B] = this.pair();
    for (const q of (first && first.hl) || []) {
      const el = document.querySelector(q.replace('@A', A).replace('@B', B));
      if (el && el.offsetParent !== null && !el.hidden) { tgt = el; break; }
    }
    if (tgt !== this.hlEl) {
      this.clearHl();
      if (tgt) { tgt.classList.add('tut-hl'); this.hlEl = tgt; if (tgt.closest('.pb')) tgt.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }
  },
  clearHl() { if (this.hlEl) this.hlEl.classList.remove('tut-hl'); this.hlEl = null; document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl')); },
  // 建造時建議的格子（發亮）
  tile() {
    const C = this.ch(); if (!C || UI.mode !== 'build') return null;
    const S = Game.S, ok = (x, y) => Game.inPlot(x, y) && !Game.canPlace(UI.sel, x, y, true);
    const o = this.ob();
    if (o.ch === 1 && UI.sel === 'drink') { for (const [x, y] of [[3, 1], [4, 1], [2, 1]]) if (ok(x, y)) return [x, y]; }
    if (o.ch === 2 && UI.sel === 'stool') { for (const [x, y] of [[4, 3], [3, 3], [1, 3], [4, 4], [2, 4], [1, 4]]) if (ok(x, y)) return [x, y]; }
    if (o.ch === 6 && UI.sel === 'lantern') {
      for (const it of S.items) if (it.id === 'lantern') for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1], [0, -1]]) if (ok(it.x + dx, it.y + dy)) return [it.x + dx, it.y + dy];
    }
    return null;
  },
  giftFree(id) { const C = this.ch(); return !!(C && C.gift === id && !Game.hasStation(id)); },
  // ---------- 目前目標（左上角） ----------
  goalItems() {
    const o = this.ob();
    if (o && o.ch <= -2) { const k = -2 - o.ch, D = GUIDE[k]; return { h: `第 ${k + 1} 課・${D.t}`, items: D.goals.map(g => ({ t: typeof g.t === 'function' ? g.t() : g.t, d: 1 })), r: D.r, fin: 1 }; }
    const C = this.ch();
    if (C) return { h: `第 ${this.ob().ch + 1} 課・${C.t}`, items: C.goals.map((g, i) => { const d = this.goalDone(g, i), p = g.prog ? g.prog() : null; return { t: typeof g.t === 'function' ? g.t() : g.t, d, p, m: g.money }; }), r: C.r };
    // 引導結束以後：下一個建議
    const S = Game.S, items = [];
    if (S.q && S.q.acc) { const p = Game.questProg(S.q); items.push({ t: `委託：${S.q.goal}`, p: [Math.max(0, p[0]), p[1]] }); }
    const n = LEVELS[S.lv + 1];
    if (n) { if (!Game.canExpand()) items.push({ t: `可以擴建成「${n.n}」了！`, hot: 1 }); else { const r = Math.min(1, S.pop / n.pop, Math.max(0, S.money) / n.cost); items.push({ t: `擴建成「${n.n}」`, p: [r, 1], em: `人氣 ${num(Math.min(S.pop, n.pop))}／${num(n.pop)}・${money(Math.max(0, Math.min(S.money, n.cost)))}／${money(n.cost)}` }); } }
    if (S.yg && items.length < 2) { const p = Game.ygProg(S.yg); if (p[0] < p[1]) items.push({ t: `今年：${S.yg.title}`, p: p[1] > 1 ? [Math.max(0, p[0]), p[1]] : null }); }
    if (items.length < 2) for (const g of GOALS) { if (S.goals[g.id]) continue; const v = Game.goalVal(g.k); items.push({ t: g.n, sub: g.d, p: g.k === 'rank' || g.v <= 1 ? null : [v, g.v] }); break; }
    return { h: '下一步', items: items.slice(0, 2) };
  },
  renderGoal() {
    const el = this.gel;
    if (Main.state !== 'play' || Story.open) { el.hidden = true; return; }
    const o = this.ob(), mid = o && o.ch <= -2, act = this.on() || mid;
    if (!act && Prefs.d.goals === false) { el.hidden = true; return; }
    const G = this.goalItems();
    const pct = p => Math.max(0, Math.min(100, p[0] / p[1] * 100));
    const fmt = (x, m) => m ? money(x) : num(Math.max(0, Math.floor(x)));
    let h;
    if (Prefs.d.trk) h = `<button class="gpill" data-g="body">目標 ▸</button>`;
    else {
      h = `<div class="gh"><b>${act ? (mid ? '完成！' : '目前目標') : G.h}</b>${act ? `<small>${G.h}</small>` : ''}<span><button data-g="help" aria-label="怎麼玩">?</button><button data-g="min" aria-label="縮小">–</button></span></div><ul>`;
      for (const it of G.items) h += `<li class="${it.d ? 'ok' : ''} ${it.hot ? 'hot' : ''}"><i></i><span>${esc(it.t)}${it.em ? `<small class="ge">${it.em}</small>` : it.p && !it.d ? `<em>${fmt(Math.min(it.p[0], it.p[1]), it.m)} / ${fmt(it.p[1], it.m)}</em>` : ''}${it.sub && !it.p ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.p && !it.d ? `<u><b style="width:${pct(it.p)}%"></b></u>` : ''}</li>`;
      h += '</ul>';
      if (G.r) h += `<small class="gr">獎勵 ${Game.rewardText(G.r)}</small>`;
      if (this.on()) h += `<small class="gt">點這裡再聽一次阿德伯說明</small>`;
      if (mid) h += `<small class="gt">阿德伯有話要說……</small>`;
    }
    if (h === this._gk) { this.place(); return; }
    this._gk = h; el.innerHTML = h; el.hidden = false; this.place();
  },
  place() {
    const el = this.gel, hr = $('#hud').getBoundingClientRect(), ev = $('#hudEv'), eb = ev && ev.textContent ? ev.getBoundingClientRect().bottom : 0;
    el.style.top = Math.max(hr.bottom + 2, eb + 4) + 'px';
    el.style.left = (R.left + 8) + 'px';
  },
};

// ====================== 卡關提示 ======================
const Hint = {
  el: null, last: {}, lastAny: 0, idle: 0, noCust: 0, take0: 0, t: 0,
  init() {
    this.el = $('#hint');
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-h]');
      if (b && b.dataset.h === 'more') { Help.show(this.sec); }
      this.hide();
    });
  },
  hide() { this.el.classList.remove('show'); clearTimeout(this._t); },
  show(id, txt, sec) {
    const now = performance.now() / 1000;
    this.last[id] = now; this.lastAny = now; this.sec = sec;
    this.el.innerHTML = `<div class="hp">${UI.img(Art.portrait(Guide.look(), ''), 2)}</div><p><b>阿德伯的提示</b>${txt}</p>${sec ? '<button data-h="more">怎麼做？</button>' : ''}<button data-h="x" aria-label="關閉">✕</button>`;
    this.el.classList.remove('show'); void this.el.offsetWidth; this.el.classList.add('show');
    Snd.play('pop');
    clearTimeout(this._t); this._t = setTimeout(() => this.hide(), 9000);
  },
  // 每秒檢查一次
  tick(dt) {
    if (Main.state !== 'play' || UI.modal || Guide.blocking() || !Game.S) return;
    if (UI.mode !== 'play') { this.hide(); return; }
    if (Prefs.d.hints === false) return;
    const S = Game.S, G = Game, now = performance.now() / 1000, run = UI.speed > 0;
    // 計時
    this.idle = !run && !UI.panel && UI.mode === 'play' ? this.idle + dt : 0;
    this.noCust = run && G.cust.length === 0 ? this.noCust + dt * SPEEDS[UI.speed] : 0;
    if (now - this.lastAny < 25) return;
    const ok = id => !this.last[id] || now - this.last[id] > 150;
    const o = Guide.ob(), early = o && o.ch >= 0 && o.ch <= 1;
    const cand = [];
    if (this.idle > 14 && ok('pause') && !(o && o.ch === 0 && !o.g[0])) cand.push(['pause', '時間<b>暫停</b>中喔！按右上角的 <b>x1</b> 繼續營業。', 'time']);
    const menu = G.menu();
    if (!menu.length && ok('menu')) cand.push(['menu', '菜單上<b>沒有能賣的菜</b>！到「菜單」把菜上架，或蓋對應的攤位。', 'menu']);
    const nSt = G.stList ? G.stList.length : 0, cooks = S.staff.filter(s => s.job === 'cook').length;
    if (nSt > cooks && !early && ok('cook')) cand.push(['cook', `有攤位<b>沒有廚師</b>顧！${Guide.can('staff') ? '到「員工」請人，或把員工的工作換成「廚師」。' : '點員工可以換工作。'}`, 'staff']);
    const longQ = G.stList && G.stList.find(rt => rt.queue.length >= 5);
    if (longQ && ok('queue')) cand.push(['queue', `「${F[longQ.it.id].n}」<b>排隊太長</b>了，客人等太久會生氣！點攤位可以<b>升級</b>煮得更快${Guide.can('tab:station') ? '，或多擺一台同樣的攤位' : ''}。`, 'build']);
    const dirty = S.items.filter(i => i.dirty).length, serv = S.staff.filter(s => s.job === 'serve').length;
    if (dirty >= 3 && !serv && Guide.can('staff') && ok('dirty')) cand.push(['dirty', '<b>桌子好髒</b>，客人不想坐！請一位<b>外場</b>員工來清理（員工 → 換工作「外場」）。', 'staff']);
    const tk = G.dbg.takeout || 0;
    if (tk - this.take0 >= 6 && Guide.can('tab:seat') && ok('seat')) cand.push(['seat', '好多客人<b>沒位子坐</b>只好外帶，多擺幾組<b>桌椅</b>吧！', 'seat']);
    if (Guide.can('menu')) {
      const exp = menu.find(k => S.dishes[k].price / G.dishValue(k) > 1.35);
      if (exp && ok('price')) cand.push(['price', `「${DISH[exp].n}」的價錢是<b>紅色</b>的，太貴了，客人會不高興。到「菜單」按 <b>－</b> 調低一點。`, 'menu']);
    }
    const bill = S.staff.reduce((a, s) => a + s.sal, 0) + G.rent();
    if (S.money < bill && G.wk() >= 3 && S.week > 2 && ok('money')) cand.push(['money', `錢快不夠付月底的<b>薪水和租金</b>（${money(bill)}）了！先別亂花錢，價錢可以調高一點，或賣掉用不到的東西。`, 'time']);
    if (this.noCust > 30 && menu.length && ok('nocust')) cand.push(['nocust', `客人好少……試試${Guide.can('tab:decor') ? '擺<b>裝飾</b>增加魅力、' : ''}${Guide.can('staff') ? '請一位<b>攬客</b>、' : ''}或把價錢調低一點。`, 'pop']);
    if (!Guide.on() && Guide.can('lab') && S.idea >= G.ideaCost() + 10 && S.money > G.moneyCost() * 3 && ok('idea') && (this.t += dt) > 240) cand.push(['idea', '<b>靈感</b>存了不少，去「研發」試試新菜色吧！食譜筆記裡有提示。', 'lab']);
    if (!Guide.on() && LEVELS[S.lv + 1] && !G.canExpand() && ok('expand')) cand.push(['expand', `可以<b>擴建</b>成「${LEVELS[S.lv + 1].n}」了！打開「建造」→「攤位」，按最上面的「擴建！」。`, 'pop']);
    // 新手引導中：阿德伯已經在教了，只留下真的卡住的提示
    if (Guide.on() || (o && o.ch <= -2)) { const keep = ['pause', 'money', 'queue', 'nocust', 'menu', ...(o.ch > 5 || o.ch < -7 ? ['dirty', 'seat', 'price', 'cook'] : [])]; for (let i = cand.length - 1; i >= 0; i--) if (!keep.includes(cand[i][0])) cand.splice(i, 1); }
    if (cand.length) { const [id, txt, sec] = cand[0]; if (id === 'seat') this.take0 = tk; if (id === 'idea') this.t = 0; this.show(id, txt, sec); }
    else if (tk - this.take0 > 30) this.take0 = tk - 3;
  },
};

// ====================== 怎麼玩 ======================
const Help = {
  open: false, el: null, cur: 'flow',
  secs() {
    const im = (c, s = 3) => UI.img(c, s), ar = '<span class="har">→</span>', pl = '<span class="har">＋</span>';
    const p = (seed, kind, job, face = 'happy') => im(Art.portrait(makeLook(seed, kind, job), face), 2);
    return [
      ['flow', '基本流程', `<div class="hfig">${p(31, 'student')}${ar}${im(Art.fac('griddle'), 2)}${ar}${im(Art.icon('coin'), 3)}${ar}${im(Art.fac('stool'), 2)}</div>
        <p>客人從街上走進來，到賣他想吃的東西的<b>攤位</b>前排隊。<b>廚師</b>煮好就收錢，客人再找<b>座位</b>坐下來吃，吃得開心店的<b>人氣</b>就會上升。</p>
        <p>頭上的泡泡是客人想吃的種類（鹹的、甜的、飲料…）。菜單上沒有他想吃的，他會比較不開心。</p>`],
      ['time', '時間與金錢', `<div class="hfig"><span class="hspd"><i>II</i><i class="on">x1</i><i>x2</i><i>x4</i></span>${im(Art.icon('cal'), 4)}</div>
        <p>右上角可以<b>暫停</b>或<b>加快</b>時間。一週大約 24 秒，四週是一個月。</p>
        <p><b>每個月底</b>要付員工<b>薪水</b>和店面<b>租金</b>，記得留一點錢。錢變成負的時候，可以點東西「賣掉」換回一半的錢。</p>`],
      ['build', '建造與擺放', `<div class="hfig">${im(Art.fac('griddle'), 2)}${im(Art.fac('drink'), 2)}${im(Art.fac('fryer'), 2)}${im(Art.fac('lantern'), 2)}</div>
        <p>打開<b>「建造」</b>選東西，再點店裡的<b>空格子</b>放下去。綠色的格子可以放，紅色不行（不能把通道擋住）。</p>
        <p>點店裡的攤位、桌子或裝飾，可以<b>升級</b>、<b>移動</b>或<b>賣掉</b>。拖曳畫面可以移動，雙指或滾輪可以縮放。</p>`],
      ['seat', '座位', `<div class="hfig">${im(Art.fac('stool'), 3)}${im(Art.fac('wood'), 3)}${im(Art.fac('round'), 3)}</div>
        <p>客人買了東西要有地方坐。座位不夠，客人只好<b>外帶</b>，滿意度會變低。</p><p>桌子吃完會變髒，要有<b>外場</b>員工來清理。</p>`],
      ['menu', '菜單與價錢', `<div class="hfig">${im(Art.dish('pancake'), 5)}<span class="hpr"><i class="cb">$30</i><i class="cg">$40</i><i class="cr">$60</i></span></div>
        <p>在<b>「菜單」</b>按 ＋／－ 調價錢。<b class="cg">綠色</b>剛好、<b class="cr">紅色</b>太貴（客人會不高興，甚至不買）、<b class="cb">藍色</b>太便宜。</p>
        <p>每道菜要有對應的<b>攤位</b>才賣得出去。也可以用靈感<b>改良</b>菜色，越改越好吃、可以賣越貴。</p>`],
      ['lab', '研發新菜', `<div class="hfig">${im(Art.ing('flour'), 5)}${pl}${im(Art.ing('egg'), 5)}${ar}${im(Art.dish('eggcrepe'), 5)}</div>
        <p>在<b>「研發」</b>選兩樣食材（或已經研發的菜），花<b>靈感</b>和一點錢組合看看。成功就多一道新菜！</p>
        <p>失敗只扣一半靈感，還會給你提示。「食譜筆記」裡有每道菜的謎題；在「菜單 → 食材」跟批發商進貨可以解鎖更多組合。</p>`],
      ['staff', '員工', `<div class="hfig">${p(12, 'staff', 'cook')}${p(18, 'staff', 'serve')}${p(25, 'staff', 'tout')}</div>
        <p><b>廚師</b>顧攤位（一個攤位要一位廚師）、<b>外場</b>清桌子和招呼排隊的客人、<b>攬客</b>站在門口把路人拉進來。</p>
        <p>每個月會有新的應徵者。員工會升級，也可以花錢<b>培訓</b>；每個人還有不同的<b>特質</b>。</p>`],
      ['combo', '擺設組合', `<div class="hfig">${im(Art.fac('lantern'), 3)}${pl}${im(Art.fac('lantern'), 3)}${ar}<b class="hcb">燈籠一條街！</b></div>
        <p>有些東西放在<b>隔壁</b>（斜的也算）會變成<b>擺設組合</b>，讓客人更滿意、人氣更高、來客更多。</p><p>一共 34 種，「經營 → 組合圖鑑」裡有提示。</p>`],
      ['pop', '人氣、排行與擴建', `<div class="hfig">${im(Art.icon('heart'), 4)}${ar}${im(Art.icon('cup'), 4)}${ar}${im(Art.icon('shop'), 4)}</div>
        <p>客人滿意，<b>人氣</b>就上升；夜市<b>排行榜</b>比的就是人氣。裝飾、組合、攬客、活動都能讓更多客人上門。</p>
        <p>人氣和錢夠了就能<b>擴建</b>：路邊小攤 → 巷口小吃店 → 排隊名店 → 美食廣場 → 夜市大街 → 傳說夜市。店越大，能放越多東西、請越多人。</p>`],
      ['biz', '事業', `<div class="hfig">${p(44, 'asker')}${im(Art.icon('firework'), 4)}${im(Art.icon('flask'), 4)}${im(Art.icon('shop'), 4)}</div>
        <p><b>委託</b>：附近的人會來拜託你，完成有獎勵。<b>活動</b>：花錢辦試吃會、演唱會，一週內客人大增。</p>
        <p><b>秘方</b>：用靈感研究永久加成。<b>分店</b>：擴建到美食廣場以後，可以到其他夜市開分店。</p>`],
      ['year', '一年的行事曆', `<div class="hfig">${im(Art.icon('firework'), 4)}${im(Art.fac('tG'), 3)}${im(Art.icon('star'), 4)}</div>
        <p>每個月有不同的<b>節慶</b>（春節、暑假、中秋…），會有限定挑戰。每週也可能發生<b>事件</b>（颱風、美食節目、網紅來訪…）。</p>
        <p>每年 <b>10 月</b>有<b>夜市小吃大賽</b>，年底有<b>頒獎典禮</b>，依排名拿獎金和獎盃。拿下第一名就是<b>夜市之王</b>！</p>`],
    ];
  },
  show(sec = 'flow') {
    this.cur = sec; this.open = true;
    let el = this.el;
    if (!el) {
      el = this.el = document.createElement('div'); el.id = 'help'; document.body.appendChild(el);
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-hp]');
        if (e.target === el || (b && b.dataset.hp === 'x')) { Snd.play('click'); this.close(); return; }
        if (b) { Snd.play('tab'); this.cur = b.dataset.hp; this.render(); }
      });
    }
    el.hidden = false; this.render();
  },
  render() {
    const S = this.secs(), i = Math.max(0, S.findIndex(s => s[0] === this.cur)), s = S[i];
    this.el.innerHTML = `<div class="hc"><div class="ph"><h3>怎麼玩</h3><button class="x" data-hp="x" aria-label="關閉">✕</button></div>
      <div class="tabs hnav">${S.map(x => `<button data-hp="${x[0]}" class="${x[0] === s[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div>
      <div class="pb hb"><h4>${s[1]}</h4>${s[2]}<div class="hnx">${i > 0 ? `<button class="btn" data-hp="${S[i - 1][0]}">← ${S[i - 1][1]}</button>` : '<span></span>'}${i < S.length - 1 ? `<button class="btn go" data-hp="${S[i + 1][0]}">${S[i + 1][1]} →</button>` : `<button class="btn go" data-hp="x">開始玩！</button>`}</div></div></div>`;
    const on = this.el.querySelector('.hnav .on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  },
  close() { this.open = false; if (this.el) this.el.hidden = true; },
};
