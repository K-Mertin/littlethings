'use strict';
// 曉鐘傳說：主迴圈、畫面配置、標題、存讀檔、轉場
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let G = null;

const Game = {
  scene: 'title', fadeA: 0, fading: false, flashWhite: 0, flashRed: 0, overlay: null, last: 0, newDiff: 'normal', slotMode: 'load', titleSel: 0, dawn: undefined, dawnTarget: 0,
  init() {
    Store.load(); Input.init();
    if (matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0)) Input.setTouch(true);
    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    this.resize();
    this.setupTouch();
    this.setupTitle();
    cv.addEventListener('pointerdown', e => {
      Snd.init();
      if (e.pointerType === 'touch') Input.setTouch(true);
      const dpr = L.dpr; Input.taps.push({ x: e.clientX * dpr, y: e.clientY * dpr });
    });
    addEventListener('keydown', () => Snd.init(), { once: false });
    document.fonts && document.fonts.ready.then(() => { this.fontsReady = true; });
    setTimeout(() => { document.getElementById('loading').remove(); }, 50);
    this.showTitle();
    requestAnimationFrame(t => this.loop(t));
  },
  resize() {
    const W = innerWidth, H = innerHeight, dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    L.W = cv.width; L.H = cv.height; L.dpr = dpr;
    let vx = 0, vy = 0, vw = W, vh = H;
    const touch = Input.touchMode, portrait = H >= W;
    const pad = document.getElementById('pad'), A = document.getElementById('btnA'), B = document.getElementById('btnB'), bg = document.getElementById('ctrlBg'), mute = document.getElementById('btnMute');
    if (touch && portrait) {
      const ch = Math.round(Math.min(W * 0.56, H * 0.34));
      vh = H - ch;
      const ds = Math.min(ch * 0.82, W * 0.44), bs = Math.min(ch * 0.34, W * 0.19);
      Object.assign(bg.style, { left: '0px', top: vh + 'px', width: W + 'px', height: ch + 'px' });
      Object.assign(pad.style, { width: ds + 'px', height: ds + 'px', left: W * 0.05 + 'px', top: vh + (ch - ds) / 2 + 'px' });
      Object.assign(A.style, { width: bs + 'px', height: bs + 'px', left: W - bs * 1.25 + 'px', top: vh + ch * 0.18 + 'px' });
      Object.assign(B.style, { width: bs + 'px', height: bs + 'px', left: W - bs * 2.45 + 'px', top: vh + ch * 0.18 + bs * 0.75 + 'px' });
    } else if (touch) {
      const sw = Math.round(Math.min(H * 0.44, W * 0.2));
      vx = sw; vw = W - sw * 2;
      const ds = Math.min(sw * 0.94, H * 0.48), bs = Math.min(sw * 0.44, H * 0.22);
      Object.assign(bg.style, { left: '0px', top: '0px', width: '0px', height: '0px' });
      Object.assign(pad.style, { width: ds + 'px', height: ds + 'px', left: (sw - ds) / 2 + 'px', top: H - ds - H * 0.08 + 'px' });
      Object.assign(A.style, { width: bs + 'px', height: bs + 'px', left: W - sw + sw * 0.5 + 'px', top: H * 0.5 + 'px' });
      Object.assign(B.style, { width: bs + 'px', height: bs + 'px', left: W - sw + sw * 0.08 + 'px', top: H * 0.5 + bs * 0.8 + 'px' });
    } else {
      if (vw > vh * 2) { vw = Math.round(vh * 2); vx = (W - vw) / 2; }
    }
    Object.assign(mute.style, { left: vx + vw - 42 + 'px', top: vy + 8 + 'px' });
    L.V = { x: Math.round(vx * dpr), y: Math.round(vy * dpr), w: Math.round(vw * dpr), h: Math.round(vh * dpr) };
    L.FS = Math.round(dpr * clamp(Math.min(vw, vh) / 24, 13, 21));
    L.k = Math.max(1, Math.round(Math.min(vw, vh) * dpr / (16 * 10.5)));
    L.pad = Math.round(L.FS * 0.65);
    L.portrait = portrait;
  },
  setupTouch() {
    const pad = document.getElementById('pad'), cells = { up: pad.querySelector('.u'), down: pad.querySelector('.d'), left: pad.querySelector('.l'), right: pad.querySelector('.r') };
    let pid = null;
    const set = d => { if (d) Input.latch[d] = 1; for (const k of ['up', 'down', 'left', 'right']) { Input.touchHeld[k] = k === d ? 1 : 0; cells[k].classList.toggle('on', k === d); } };
    const at = e => {
      const r = pad.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      if (Math.hypot(x, y) < r.width * 0.1) return null;
      return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
    };
    pad.addEventListener('pointerdown', e => { e.preventDefault(); Snd.init(); Input.setTouch(true); pid = e.pointerId; pad.setPointerCapture(pid); set(at(e)); });
    pad.addEventListener('pointermove', e => { if (e.pointerId === pid) set(at(e)); });
    const up = e => { if (e.pointerId === pid) { pid = null; set(null); } };
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
    for (const [id, k] of [['btnA', 'ok'], ['btnB', 'cancel']]) {
      const b = document.getElementById(id);
      b.addEventListener('pointerdown', e => { e.preventDefault(); Snd.init(); Input.setTouch(true); Input.touchHeld[k] = 1; Input.latch[k] = 1; b.classList.add('on'); b.setPointerCapture(e.pointerId); });
      const off = () => { Input.touchHeld[k] = 0; b.classList.remove('on'); };
      b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
    }
    document.getElementById('btnMute').addEventListener('click', () => this.toggleMute());
  },
  toggleMute() {
    const on = !(Store.data.music || Store.data.sfx);
    Store.data.music = on; Store.data.sfx = on; Store.save(); Snd.applyVol(); this.syncMute();
  },
  syncMute() {
    document.getElementById('btnMute').textContent = (Store.data.music || Store.data.sfx) ? '♪' : '✕';
    document.querySelectorAll('.tog').forEach(b => { const on = !!Store.data[b.dataset.opt]; b.classList.toggle('on', on); b.querySelector('b').textContent = on ? '開' : '關'; });
  },

  // ───── 標題 ─────
  setupTitle() {
    const $ = id => document.getElementById(id);
    $('btnNew').onclick = () => { Snd.init(); Snd.play('ok'); this.openSlots('new'); };
    $('btnContinue').onclick = () => { Snd.init(); Snd.play('ok'); this.openSlots('load'); };
    $('slotsBack').onclick = () => { Snd.play('cancel'); this.showOv('title'); };
    $('diffBack').onclick = () => { Snd.play('cancel'); this.openSlots('new'); };
    $('diffGo').onclick = () => { Snd.play('ok'); this.newGame(this.newSlot, this.newDiff); };
    document.querySelectorAll('.tog').forEach(b => b.onclick = () => { Snd.init(); Store.data[b.dataset.opt] = !Store.data[b.dataset.opt]; Store.save(); Snd.applyVol(); this.syncMute(); });
    const dl = $('diffList');
    for (const k in DIFFS) {
      const b = document.createElement('button'); b.className = 'diff'; b.dataset.k = k;
      b.innerHTML = `<b>${DIFFS[k].name}</b><span>${DIFFS[k].note}</span>`;
      b.onclick = () => { Snd.play('cursor'); this.newDiff = k; dl.querySelectorAll('.diff').forEach(x => x.classList.toggle('on', x.dataset.k === k)); };
      dl.appendChild(b);
    }
    this.syncMute();
  },
  showOv(id) {
    for (const s of ['title', 'slots', 'diffs']) document.getElementById(s).hidden = s !== id;
    this.titleSel = 0; this.markSel();
  },
  focusables() { const ov = ['title', 'slots', 'diffs'].map(i => document.getElementById(i)).find(o => !o.hidden); return ov ? [...ov.querySelectorAll('button:not(:disabled),a')].filter(b => !b.classList.contains('tog')) : []; },
  markSel() { const f = this.focusables(); f.forEach((b, i) => b.classList.toggle('sel', i === this.titleSel && !Input.touchMode)); },
  showTitle() {
    this.scene = 'title'; document.body.classList.remove('ingame');
    UI.layers = []; this.dawn = undefined;
    const any = [1, 2, 3].some(n => SaveIO.read(n));
    document.getElementById('btnContinue').style.display = any ? '' : 'none';
    document.getElementById('btnNew').className = any ? 'btn2' : 'big';
    this.showOv('title');
    if (!this.titleBg) setTimeout(() => { if (this.titleBg || this.scene !== 'title') return; const keep = G; G = newGameState('normal'); Field.load('world', 9, 8, 'down', { quiet: true }); this.titleBg = Field.baked; G = keep; Music.play('title'); }, 60);
    Music.play('title');
  },
  openSlots(mode) {
    this.slotMode = mode;
    const list = document.getElementById('slotList'); list.innerHTML = '';
    document.getElementById('slotsTitle').textContent = mode === 'new' ? '要把新冒險記錄在哪裡？' : '要讀取哪一個記錄？';
    for (const n of [1, 2, 3]) {
      const d = SaveIO.read(n), b = document.createElement('button');
      b.className = 'slot' + (d ? '' : ' empty');
      b.innerHTML = `<b>記錄 ${n}${d && d.cleared ? ' ★' : ''}${d && d.ng ? ' 二周目' + (d.ng > 1 ? '×' + d.ng : '') : ''}</b><span>${d ? `${CHARS.hero.name} Lv${d.party[0].lv}　${(MAPS[d.map] || {}).short || (MAPS[d.map] || {}).name || ''}<br>${slotInfo(d).split(' ').slice(-1)[0]}　${DIFFS[d.diff] ? DIFFS[d.diff].name : ''}` : '（空白）'}</span>`;
      if (mode === 'load' && !d) b.disabled = true;
      b.onclick = () => {
        Snd.play('ok');
        if (mode === 'load') { this.loadGame(n); return; }
        if (d && !confirm(`記錄 ${n} 已經有冒險資料，要覆蓋嗎？`)) return;
        this.newSlot = n; this.showOv('diffs');
        document.querySelectorAll('.diff').forEach(x => x.classList.toggle('on', x.dataset.k === this.newDiff));
      };
      list.appendChild(b);
    }
    this.showOv('slots');
    const f = this.focusables(); const i = f.findIndex(b => !b.disabled); this.titleSel = Math.max(0, i); this.markSel();
  },
  titleInput() {
    const f = this.focusables(); if (!f.length) return;
    if (Input.dirPress === 'down' || Input.dirPress === 'right') { this.titleSel = (this.titleSel + 1) % f.length; Snd.play('cursor'); this.markSel(); }
    if (Input.dirPress === 'up' || Input.dirPress === 'left') { this.titleSel = (this.titleSel - 1 + f.length) % f.length; Snd.play('cursor'); this.markSel(); }
    if (Input.pressed.ok) { Snd.init(); const b = f[this.titleSel]; if (b) b.click(); }
    if (Input.pressed.cancel) { if (!document.getElementById('slots').hidden) document.getElementById('slotsBack').click(); else if (!document.getElementById('diffs').hidden) document.getElementById('diffBack').click(); }
  },
  async newGame(slot, diff) {
    G = Extra.migrate(newGameState(diff)); G.slot = slot;
    Store.data.lastSlot = slot; Store.save();
    this.enterGame();
    Field.load('maple', 4, 3, 'left', { quiet: true });
    this.save(slot);
  },
  loadGame(n) {
    const d = SaveIO.read(n); if (!d) return;
    G = Extra.migrate(d); G.slot = n; Store.data.lastSlot = n; Store.save();
    for (const m of G.party) { delete m.b; delete m.vhp; }
    this.enterGame();
    Field.load(G.map, G.x, G.y, G.dir || 'down');
    this.fadeA = 1; this.fadeIn(0.4);
    UI.toast('讀取了記錄 ' + n);
  },
  enterGame() {
    this.showOv(null);
    this.scene = 'field'; document.body.classList.add('ingame');
    UI.layers = []; Input.consume();
    this.resize();
  },
  toTitle() { this.scene = 'title'; Field.busy = false; this.showTitle(); },
  save(n) {
    if (!G || !n) return false;
    const L0 = Field.leader();
    if (L0) { G.x = L0.x; G.y = L0.y; G.dir = L0.dir; G.map = Field.id; }
    // 迷宮內記錄時，位置就是目前的位置
    return SaveIO.write(n, G);
  },
  autosave() { if (G && G.slot && this.save(G.slot)) UI.toast('已自動記錄'); },

  // ───── 轉場 ─────
  tween(fn, dur) { return new Promise(res => { this.overlay = { fn, t: 0, dur, res }; }); },
  async fadeOut(d = 0.3) { this.fading = true; const a0 = this.fadeA; await this.tween(k => { this.fadeA = lerp(a0, 1, k); }, d); },
  async fadeIn(d = 0.3) { const a0 = this.fadeA; await this.tween(k => { this.fadeA = lerp(a0, 0, k); }, d); this.fading = false; },
  async go(id, x, y, dir, o = {}) {
    await this.fadeOut(o.from === 'ferry' ? 0.1 : 0.25);
    UI.clearGhosts();
    const prevKind = Field.def && Field.def.kind;
    Field.load(id, x, y, dir, o);
    if (o.keepMusic) { }
    if (MAPS[id].kind === 'town' && (o.from === 'world' || prevKind === 'world')) this.autosave();
    await this.fadeIn(0.3);
  },
  async swirl(boss) {
    this.fading = true;
    await this.tween(k => { this.swirlK = k; this.swirlBoss = boss; }, boss ? 0.9 : 0.6);
    this.swirlK = 0; this.fadeA = 1;
    setTimeout(() => this.fadeIn(0.25), 30);
  },
  async wipe() {
    await this.fadeOut(0.8);
    const home = G.home || 'maple', m = MAPS[home];
    for (const p of G.party) { const s = Party.stats(p); p.hp = s.mhp; p.mp = s.mmp; p.st = {}; }
    G.gold = Math.floor(G.gold / 2);
    Field.load(home, m.revive[0], m.revive[1], 'up', { quiet: true });
    await this.fadeIn(0.6);
    await UI.say('……', `${CHARS.hero.name}他們在教會裡醒了過來。`, '神父：「你們全都倒下了，是曉鐘之光把你們帶回來的。」', '神父：「身上的金幣少了一半……下次記得多休息、多練功喔。」');
  },
  // 全螢幕的旁白
  story(pages, keep) {
    return new Promise(res => {
      let i = 0, t = 0;
      const lay = { modal: true };
      lay.update = dt => {
        t += dt;
        if ((Input.pressed.ok || Input.pressed.cancel || lay.tap || window.__autoMsg) && (t > 0.35 || window.__autoMsg)) {
          lay.tap = false; i++; t = 0; Snd.play('talk');
          if (i >= pages.length) { UI.remove(lay); if (!keep) { this.fadeA = 1; this.fadeIn(0.5); } else this.fadeA = 1; res(); }
        }
      };
      lay.draw = g => {
        const V = L.V, fs = L.FS;
        g.fillStyle = '#05060f'; g.fillRect(0, 0, L.W, L.H);
        const a = Math.min(1, t * 2.5);
        g.globalAlpha = a;
        const lines = UI.wrap(g, pages[Math.min(i, pages.length - 1)], Math.min(V.w * 0.84, fs * 28), fs * 1.05);
        lines.forEach((ln, j) => UI.text(g, ln, V.x + V.w / 2, V.y + V.h / 2 + (j - (lines.length - 1) / 2) * fs * 1.9, '#f4ecd8', fs * 1.05, 'center', 'middle'));
        if (t > 0.8 && Math.sin(UI.t * 6) > -0.3) UI.text(g, '▼', V.x + V.w / 2, V.y + V.h * 0.82, '#9aa6d8', fs * 0.8, 'center', 'middle');
        g.globalAlpha = 1;
        UI.hit(0, 0, L.W, L.H, () => { lay.tap = true; });
      };
      UI.push(lay);
    });
  },
  credits() {
    return new Promise(res => {
      const lines = ['曉鐘傳說', 'LEGEND OF THE DAWN BELL', '', '— 主要角色 —', '見習鐘守　洛恩', '見習神官　莉亞', '宮廷魔法師　米菈', '守衛隊長　巴爾克', '', '老鐘守　托爾爺爺', '砂金女王　娜菲莉', '黯騎士　加爾德', '黯王　諾克斯', '', '— 冒險記錄 —', `等級 ${G.party[0].lv}　戰鬥 ${G.battles} 次`, `遊戲時間 ${Math.floor(G.time / 3600)}:${String(Math.floor(G.time / 60) % 60).padStart(2, '0')}`, '', '音樂、圖像、故事', '全部以程式即時生成', '', 'MW · littlethings', '', '', '全劇終', '', '謝謝你的遊玩！'];
      let t = 0;
      const lay = { modal: true };
      lay.update = dt => { t += dt * (Input.held.ok ? 4 : 1) * (window.__speed || 1); if (t > lines.length * 1.1 + 6 && (Input.pressed.ok || lay.tap || window.__speed > 5)) { UI.remove(lay); finish(); } };
      const finish = async () => {
        G.cleared = true; G.flags.nox = true;
        if (G.slot) this.save(G.slot);
        await this.fadeOut(1); this.dawn = undefined; this.fadeA = 0; this.fading = false;
        this.toTitle(); res();
      };
      lay.draw = g => {
        const V = L.V, fs = L.FS;
        g.fillStyle = 'rgba(5,6,15,.6)'; g.fillRect(V.x, V.y, V.w, V.h);
        lines.forEach((ln, j) => {
          const y = V.y + V.h + j * fs * 2.2 - t * fs * 2.2 * 0.9;
          const end = j === lines.length - 1 || ln === '全劇終';
          const yy = end ? Math.max(y, V.y + V.h * 0.5 + (j - lines.length + 1) * fs * 2.2) : y;
          if (yy < V.y - fs * 2 || yy > V.y + V.h + fs) return;
          const big = j === 0 || ln === '全劇終';
          UI.text(g, ln, V.x + V.w / 2, yy, big ? '#ffe9a8' : ln.startsWith('—') ? '#9aa6d8' : '#fff', fs * (big ? 1.6 : 1), 'center', 'middle', big ? 900 : 500);
        });
        UI.hit(0, 0, L.W, L.H, () => { lay.tap = true; });
      };
      UI.push(lay);
    });
  },

  // ───── 主迴圈 ─────
  loop(ts) {
    const raw = (ts - (this.last || ts)) / 1000, dt = Math.min(0.05, raw); this.last = ts;
    // 效能不足時自動降低特效（光暈、粒子）
    if (raw > 0 && raw < 0.5) { this.avgDt = lerp(this.avgDt || 0.016, raw, 0.03); this.slowT = this.avgDt > 1 / 36 ? (this.slowT || 0) + raw : 0; if (this.slowT > 4 && !this.lowFx) this.lowFx = true; }
    Input.frame(dt);
    if (this.scene === 'title') { this.titleInput(); this.titleT = (this.titleT || 0) + dt; }
    UI.handleTaps();
    if (this.overlay) { const o = this.overlay; o.t += dt * (window.__speed || 1); o.fn(Math.min(1, o.t / o.dur)); if (o.t >= o.dur) { this.overlay = null; o.res(); } }
    UI.update(dt);
    if (this.scene === 'field') Field.update(dt);
    if (this.scene === 'battle') BScene.update(dt);
    if (G && this.scene !== 'title') G.time += dt;
    if (this.dawn !== undefined) this.dawn = lerp(this.dawn, this.dawnTarget, Math.min(1, dt * 0.6));
    this.flashWhite = Math.max(0, this.flashWhite - dt * 1.5); this.flashRed = Math.max(0, this.flashRed - dt * 2);
    this.draw();
    requestAnimationFrame(t => this.loop(t));
  },
  draw() {
    const g = ctx; UI.hits = [];
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#05060f'; g.fillRect(0, 0, L.W, L.H);
    g.imageSmoothingEnabled = false;
    if (this.scene === 'title') { this.drawTitleBg(g); return; }
    if (this.scene === 'field') Field.draw(g);
    else if (this.scene === 'battle') BScene.draw(g);
    UI.draw(g);
    const V = L.V;
    if (this.swirlK) {
      const k = this.swirlK;
      if (k < 0.35) { if (Math.floor(k * 24) % 2 === 0) { g.fillStyle = this.swirlBoss ? 'rgba(255,80,80,.7)' : 'rgba(255,255,255,.75)'; g.fillRect(V.x, V.y, V.w, V.h); } }
      else {
        const kk = (k - 0.35) / 0.65, n = 12;
        g.fillStyle = '#05060f';
        for (let i = 0; i < n; i++) { const a0 = i / n * TAU + kk * 2; g.beginPath(); g.moveTo(V.x + V.w / 2, V.y + V.h / 2); g.arc(V.x + V.w / 2, V.y + V.h / 2, Math.hypot(V.w, V.h), a0, a0 + TAU / n * kk); g.fill(); }
      }
    }
    if (this.flashWhite > 0) { g.fillStyle = `rgba(255,255,240,${Math.min(0.85, this.flashWhite)})`; g.fillRect(V.x, V.y, V.w, V.h); }
    if (this.flashRed > 0) { g.fillStyle = `rgba(255,40,40,${this.flashRed})`; g.fillRect(V.x, V.y, V.w, V.h); }
    if (this.fadeA > 0) {
      // 菱形格子的轉場
      const a = this.fadeA;
      if (a >= 0.999) { g.fillStyle = '#05060f'; g.fillRect(0, 0, L.W, L.H); }
      else {
        const c = Math.max(24, Math.round(L.FS * 2.6)); g.fillStyle = '#05060f';
        g.beginPath();
        for (let y = 0, j = 0; y < L.H + c; y += c / 2, j++) for (let x = (j % 2) * c / 2; x < L.W + c; x += c) {
          const k = clamp(a * 1.6 - (y / L.H) * 0.6, 0, 1), r = k * c * 0.75;
          if (r <= 0) continue; g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath();
        }
        g.fill();
      }
    }
  },
  drawTitleBg(g) {
    const img = this.titleBg && this.titleBg[Math.floor(this.titleT * 1.6) % 2];
    if (!img) return;
    const k = Math.max(2, Math.round(L.k * 0.8)), t = this.titleT || 0;
    const vw = L.W / k, vh = L.H / k;
    // 沿著大陸慢慢移動鏡頭
    const path = [[9, 8], [14, 26], [10, 40], [24, 33], [50, 33], [60, 40], [56, 22], [54, 10], [44, 8], [34, 8], [16, 6]];
    const u = (t * 0.035) % path.length, i0 = Math.floor(u), f = u - i0, a = path[i0], b = path[(i0 + 1) % path.length];
    const s2 = f * f * (3 - 2 * f), px = lerp(a[0], b[0], s2) * 16 + 8, py = lerp(a[1], b[1], s2) * 16 + 8;
    const sx = clamp(px - vw / 2, 0, Math.max(0, img.width - vw)), sy = clamp(py - vh / 2, 0, Math.max(0, img.height - vh));
    g.imageSmoothingEnabled = false;
    g.drawImage(img, sx, sy, Math.min(vw, img.width), Math.min(vh, img.height), 0, 0, Math.min(vw, img.width) * k, Math.min(vh, img.height) * k);
    const gr = g.createLinearGradient(0, 0, 0, L.H);
    gr.addColorStop(0, 'rgba(20,14,60,.55)'); gr.addColorStop(0.6, 'rgba(60,30,60,.35)'); gr.addColorStop(1, 'rgba(255,150,60,.25)');
    g.fillStyle = gr; g.fillRect(0, 0, L.W, L.H);
  },
};

// ───── 測試與除錯用的掛勾 ─────
window.__rpg = {
  get G() { return G; }, set G(v) { G = v; }, Game, Field, Battle, BScene, MAPS, MONS, ZONES, CHARS, Party, Bag, UI, Input,
  tp(map, x, y, dir = 'down') { Field.load(map, x, y, dir); },
  flag(k, v = true) { G.flags[k] = v; Field.rebake(); Field.refreshNpcs(); },
  give(id, n = 1) { Bag.add(id, n); },
  lv(n) { for (const m of G.party) { m.lv = n; m.exp = EXP_TABLE[n]; const s = Party.stats(m); m.hp = s.mhp; m.mp = s.mmp; } },
  join(id) { return S.join(id); },
  auto(on = true) { window.__autoBattle = on; },
  speed(n) { window.__speed = n; },
  autoMsg(on = true) { window.__autoMsg = on; },
  noEnc(on = true) { window.__noEnc = on; },
  battle(ids, o) { return new Promise(res => Field.run(async () => { res(await runBattle(ids, o)); })); },
  state() { return { scene: Game.scene, map: Field.id, x: Field.leader() && Field.leader().x, y: Field.leader() && Field.leader().y, busy: Field.busy, ui: UI.layers.length, party: G && G.party.map(m => ({ id: m.id, lv: m.lv, hp: m.hp, mp: m.mp })), gold: G && G.gold, flags: G && Object.keys(G.flags).filter(k => !k.startsWith('c:')) }; },
  // 不播動畫的戰鬥模擬（平衡用）
  sim(ids, o = {}) {
    const keepG = G; G = JSON.parse(JSON.stringify(keepG));
    try {
      const B = Battle.create(ids, o); let rounds = 0;
      while (!B.over && rounds < 200) {
        rounds++;
        const acts = B.party.map(m => Battle.canAct(m) ? Battle.auto(B, m, o) : null);
        for (const ent of Battle.order(B, acts)) { if (B.over) break; if (ent.side === 'p' && ent.who.hp <= 0) continue; if (ent.side === 'e' && !ent.who.alive) continue; Battle.act(B, ent); }
        if (!B.over) Battle.endRound(B);
      }
      const rw = B.over === 'win' ? Battle.rewards(B) : { exp: 0, gold: 0 };
      return { result: B.over || 'timeout', rounds, hp: B.party.map(m => m.hp / Party.stats(m).mhp), mp: B.party.map(m => m.mp / Math.max(1, Party.stats(m).mmp)), exp: rw.exp, gold: rw.gold, party: G.party };
    } finally { G = keepG; }
  },
  rollFormation, objective, SaveIO,
};
Game.init();
