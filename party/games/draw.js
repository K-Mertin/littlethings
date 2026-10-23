'use strict';
/* 你畫我猜 — a cosy art class. Everyone takes turns being the 畫家 (painter):
   the painter's phone becomes a little drawing board and shows the secret word (only there —
   never on the TV); the TV easel repeats every stroke live. Everyone else picks the answer
   from 6 big buttons on their phone (first tap counts). Faster right answers score more
   (100 → 30), and the painter earns points for every friend who guesses right — so draw clearly!
   小朋友: easier words, the painter sees an emoji hint, the category is shown right away, 60 s.
   大人: harder words (珍珠奶茶、捷運、颱風…), decoys from the same category with the same length,
         the category hint only appears after a while, 45 s.
   Alone: 練習 — draw three words, the TV shows the word, no scoring.
   Every finished drawing goes into a little gallery strip; at the end the whole 畫廊 is shown. */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', ROUND = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const ORANGE = '#f97316', DEEP = '#c2410c', INK = '#2b2340';
  const INKS = ['#2b2340', '#ff4f58', '#2f8cff', '#22c26a', '#ffbf1f', '#9b5cff', '#ffffff'];   // same as the phone board
  const OPT_COLS = ['#ff4f58', '#2f8cff', '#22c26a', '#f59e0b', '#9b5cff', '#ff6fb7'];
  const BX = 420, BY = 160, BW = 640, BH = 480;          // the paper on the easel (4:3, like the phone board)
  const ART_W = 800, ART_H = 600;
  const READY = 3, REVEAL = 5.2, GALLERY = 9;
  const DRAWER_AT = { x: 300, y: 588, r: 56 };
  const GUESS_Y = 724;
  const STRIP_Y = 806, SLOT_W = 104, SLOT_H = 78, SLOT_GAP = 16;

  /* the word bank: w = easy (小朋友 + 大人), h = harder (大人 only) */
  const CATS = [
    { n: '動物', i: '🐾', w: [['貓咪', '🐱'], ['小狗', '🐶'], ['兔子', '🐰'], ['大象', '🐘'], ['長頸鹿', '🦒'], ['魚', '🐟'], ['小鳥', '🐦'], ['蛇', '🐍'], ['烏龜', '🐢'], ['獅子', '🦁'], ['企鵝', '🐧'], ['蝴蝶', '🦋'], ['恐龍', '🦕']],
      h: [['章魚', '🐙'], ['螃蟹', '🦀'], ['蝸牛', '🐌'], ['刺蝟', '🦔'], ['無尾熊', '🐨'], ['孔雀', '🦚'], ['袋鼠', '🦘']] },
    { n: '水果', i: '🍎', w: [['蘋果', '🍎'], ['香蕉', '🍌'], ['西瓜', '🍉'], ['葡萄', '🍇'], ['草莓', '🍓'], ['鳳梨', '🍍'], ['櫻桃', '🍒']],
      h: [['檸檬', '🍋'], ['水蜜桃', '🍑'], ['奇異果', '🥝'], ['椰子', '🥥'], ['芒果', '🥭'], ['梨子', '🍐'], ['酪梨', '🥑']] },
    { n: '食物', i: '🍽️', w: [['冰淇淋', '🍦'], ['蛋糕', '🎂'], ['披薩', '🍕'], ['漢堡', '🍔'], ['甜甜圈', '🍩'], ['雞蛋', '🥚'], ['麵包', '🍞'], ['薯條', '🍟'], ['棒棒糖', '🍭']],
      h: [['熱狗', '🌭'], ['壽司', '🍣'], ['珍珠奶茶', '🧋'], ['鳳梨酥', '🥮'], ['飯糰', '🍙'], ['小籠包', '🥟'], ['拉麵', '🍜'], ['便當', '🍱'], ['爆米花', '🍿']] },
    { n: '交通工具', i: '🚦', w: [['汽車', '🚗'], ['公車', '🚌'], ['火車', '🚆'], ['飛機', '✈️'], ['帆船', '⛵'], ['腳踏車', '🚲'], ['火箭', '🚀'], ['消防車', '🚒']],
      h: [['直升機', '🚁'], ['救護車', '🚑'], ['捷運', '🚇'], ['摩托車', '🛵'], ['計程車', '🚕'], ['卡車', '🚚']] },
    { n: '日常用品', i: '🏠', w: [['雨傘', '☂️'], ['牙刷', '🪥'], ['杯子', '🥤'], ['剪刀', '✂️'], ['眼鏡', '👓'], ['時鐘', '⏰'], ['鑰匙', '🔑'], ['椅子', '🪑'], ['帽子', '🧢'], ['襪子', '🧦'], ['書本', '📖']],
      h: [['燈泡', '💡'], ['電話', '☎️'], ['手錶', '⌚'], ['衛生紙', '🧻'], ['掃把', '🧹'], ['馬桶', '🚽'], ['鏡子', '🪞']] },
    { n: '大自然', i: '🌿', w: [['太陽', '☀️'], ['月亮', '🌙'], ['星星', '⭐'], ['雲朵', '☁️'], ['彩虹', '🌈'], ['花朵', '🌸'], ['大樹', '🌳'], ['高山', '⛰️'], ['雪人', '⛄']],
      h: [['閃電', '⚡'], ['火山', '🌋'], ['颱風', '🌀'], ['仙人掌', '🌵'], ['海浪', '🌊'], ['楓葉', '🍁'], ['下雨', '🌧️']] },
    { n: '人物・職業', i: '🧑', w: [['醫生', '🧑‍⚕️'], ['警察', '👮'], ['廚師', '🧑‍🍳'], ['太空人', '🧑‍🚀'], ['公主', '👸'], ['國王', '🤴'], ['小丑', '🤡']],
      h: [['消防員', '🧑‍🚒'], ['老師', '🧑‍🏫'], ['農夫', '🧑‍🌾'], ['歌手', '🧑‍🎤'], ['魔術師', '🎩'], ['忍者', '🥷'], ['偵探', '🕵️']] },
    { n: '玩具・運動', i: '🎈', w: [['足球', '⚽'], ['籃球', '🏀'], ['風箏', '🪁'], ['氣球', '🎈'], ['積木', '🧱'], ['泰迪熊', '🧸'], ['小鼓', '🥁']],
      h: [['羽毛球', '🏸'], ['溜冰', '⛸️'], ['保齡球', '🎳'], ['骰子', '🎲'], ['拼圖', '🧩'], ['吉他', '🎸'], ['游泳', '🏊']] }
  ];
  const WORDS = [];
  CATS.forEach((c, ci) => { for (const [lvl, list] of [[0, c.w], [1, c.h]]) for (const [w, e] of list) WORDS.push({ w, e, ci, lvl }); });

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lenOf = s => Array.from(s).length;
  function bgLayer(self, g, paint) {
    const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
    if (!self.bgCv || self.bgS !== s) {
      const c = self.bgCv || document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(H * s);
      const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 0, 0); paint(cg); self.bgCv = c; self.bgS = s;
    }
    g.drawImage(self.bgCv, 0, 0, W, H);
  }
  function newArt() { const c = document.createElement('canvas'); c.width = ART_W; c.height = ART_H; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, ART_W, ART_H); return c; }
  /* paint one batch of normalised points onto an art canvas: smooth (midpoint curves), round caps */
  function paintBatch(cv, c, p) {
    const g = cv.getContext('2d'), w = cv.width, h = cv.height, n = p.length >> 1;
    g.strokeStyle = INKS[c] || INK; g.lineWidth = (c === 6 ? 42 : 14) * w / ART_W; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(p[0] * w, p[1] * h);
    if (n === 1) g.lineTo(p[0] * w + 0.01, p[1] * h);
    else {
      for (let i = 1; i < n - 1; i++) { const x = p[i * 2] * w, y = p[i * 2 + 1] * h, nx = p[i * 2 + 2] * w, ny = p[i * 2 + 3] * h; g.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2); }
      g.lineTo(p[n * 2 - 2] * w, p[n * 2 - 1] * h);
    }
    g.stroke();
  }
  /* a drawing pencil: tip at (0,0), pointing along +x; len = body length */
  function pencil(g, x, y, ang, len, th, body, wob) {
    g.save(); g.translate(x, y); g.rotate(ang + (wob || 0));
    const cone = th * 1.5;
    g.fillStyle = '#f5d0a0'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-cone, -th / 2); g.lineTo(-cone, th / 2); g.closePath(); g.fill();
    g.fillStyle = INK; g.beginPath(); g.moveTo(0, 0); g.lineTo(-cone * 0.36, -th * 0.18); g.lineTo(-cone * 0.36, th * 0.18); g.closePath(); g.fill();
    g.fillStyle = body || '#ffc81f'; g.fillRect(-cone - len, -th / 2, len, th);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-cone - len, -th / 2, len, th * 0.28);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-cone - len, th * 0.2, len, th * 0.3);
    g.fillStyle = '#b8bfcc'; g.fillRect(-cone - len - th * 0.55, -th / 2, th * 0.55, th);
    g.fillStyle = '#9aa0ad'; g.fillRect(-cone - len - th * 0.38, -th / 2, th * 0.08, th); g.fillRect(-cone - len - th * 0.2, -th / 2, th * 0.08, th);
    g.fillStyle = '#ff8fab'; g.beginPath(); g.roundRect(-cone - len - th * 1.25, -th / 2, th * 0.72, th, [th * 0.35, 0, 0, th * 0.35]); g.fill();
    g.restore();
  }
  /* a painter's beret riding on a critter's head */
  function beret(g, x, y, r, hop, col) {
    g.save(); g.translate(x, y - hop - r * 0.86); g.rotate(-0.18);
    g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, r * 0.74, r * 0.3, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(0, r * 0.12, r * 0.7, r * 0.12, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.1, r * 0.3, r * 0.1, -0.2, 0, TAU); g.fill();
    g.strokeStyle = col; g.lineWidth = r * 0.08; g.lineCap = 'round'; g.beginPath(); g.moveTo(r * 0.05, -r * 0.27); g.lineTo(r * 0.12, -r * 0.42); g.stroke();
    g.restore();
  }
  /* a crayon lying down / standing */
  function crayon(g, x, y, ang, col, len) {
    len = len || 70; g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = col; g.beginPath(); g.roundRect(-len / 2, -8, len - 12, 16, 4); g.fill();
    g.beginPath(); g.moveTo(len / 2 - 12, -7); g.lineTo(len / 2, -2); g.lineTo(len / 2, 2); g.lineTo(len / 2 - 12, 7); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(-len / 2 + 10, -8, 22, 16);
    g.fillStyle = col; g.globalAlpha = 0.55; g.fillRect(-len / 2 + 14, -3, 14, 6); g.globalAlpha = 1;
    g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(-len / 2, 3, len - 12, 5);
    g.restore();
  }
  function pill(g, x, y, text, bg, fg, size, border) {
    g.font = `900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width + size * 1.1, h = size * 1.6;
    g.fillStyle = bg; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill();
    if (border) { g.strokeStyle = border; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = fg; g.fillText(text, x, y + 1);
    return w;
  }
  /* a wooden picture frame with a white mat around a drawing */
  function framed(g, art, x, y, w, h, fr) {
    fr = fr || Math.max(5, w * 0.06);
    g.fillStyle = 'rgba(60,30,10,.25)'; g.fillRect(x - fr + 4, y - fr + 6, w + fr * 2, h + fr * 2);
    g.fillStyle = '#b97a45'; g.fillRect(x - fr, y - fr, w + fr * 2, h + fr * 2);
    g.fillStyle = '#d9a066'; g.fillRect(x - fr, y - fr, w + fr * 2, fr * 0.45);
    g.fillStyle = '#8a5428'; g.fillRect(x - fr, y + h + fr * 0.55, w + fr * 2, fr * 0.45);
    g.fillStyle = '#fff'; g.fillRect(x, y, w, h);
    if (art) g.drawImage(art, x, y, w, h);
  }

  class Draw {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = null; this.edge = '#e9b981'; this.music = true;
      this.seed = Math.random().toString(36).slice(2, 7);
      this.es = ctx.players.map(p => ({ p, score: 0, right: 0, hits: 0, drew: 0, hop: 0, vy: 0, sq: 0 }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      const artists = ctx.players.filter(p => p.peer);   // only phones can draw (a keyboard player just watches)
      this.solo = artists.length <= 1;
      this.limit = this.solo ? (this.kid ? 40 : 30) : (this.kid ? 60 : 45);
      this.turns = [];
      if (this.solo) { if (artists.length) for (let i = 0; i < 3; i++) this.turns.push(artists[0]); }
      else { const each = artists.length <= 3 ? 2 : 1; for (let k = 0; k < each; k++) this.turns.push(...artists); }
      this.used = new Set(); this.lastCat = -1;
      this.gallery = []; this.conf = []; this.turn = null; this.ti = -1;
      this.phase = 'ready'; this.pt = 0;
      if (this.turns.length) this.nextTurn(true); else { this.phase = 'gallery'; this.pt = GALLERY - 2; }
    }

    /* ---------------- turns ---------------- */
    pickWord() {
      let pool = WORDS.filter(w => !this.used.has(w.w) && (this.kid ? w.lvl === 0 : true) && w.ci !== this.lastCat);
      if (!this.kid) { const hard = pool.filter(w => w.lvl === 1); if (hard.length && Math.random() < 0.65) pool = hard; }
      if (!pool.length) pool = WORDS.filter(w => (this.kid ? w.lvl === 0 : true));
      const w = pool[rint(pool.length)]; this.used.add(w.w); this.lastCat = w.ci; return w;
    }
    makeOptions(word) {
      const same = WORDS.filter(w => w.ci === word.ci && w.w !== word.w && (this.kid ? w.lvl === 0 : true));
      let decoys;
      if (this.kid) decoys = shuffle(same.slice()).slice(0, 5);
      else {
        // 大人: closest look-alikes first — same category, same length, same difficulty
        const L = lenOf(word.w);
        decoys = same.map(w => ({ w, k: Math.abs(lenOf(w.w) - L) * 1.2 + (w.lvl !== word.lvl ? 0.5 : 0) + Math.random() * 1.1 })).sort((a, b) => a.k - b.k).slice(0, 5).map(o => o.w);
      }
      while (decoys.length < 5) { const x = WORDS[rint(WORDS.length)]; if (x.w !== word.w && !decoys.includes(x)) decoys.push(x); }
      return shuffle([word, ...decoys]).map((w, i) => ({ id: 'o' + i, w: w.w, e: w.e, ok: w === word }));
    }
    nextTurn(first) {
      for (;;) {
        this.ti++;
        if (this.ti >= this.turns.length) { this.startGallery(); return; }
        const d = this.turns[this.ti];
        if (d.online) break;
        this.gallery.push(null);     // painter left: an empty frame, skip the turn
      }
      const drawer = this.turns[this.ti], word = this.pickWord();
      this.turn = { drawer, word, opts: this.solo ? [] : this.makeOptions(word), ans: new Map(), art: newArt(), lastS: null, pts: 0, strokes: 0,
        pen: null, hint: this.kid || this.solo, hits: 0, note: '', offT: 0, allT: -1, drawerPts: 0 };
      this.phase = 'ready'; this.pt = first ? 0.5 : 0;
      const e = this.by.get(drawer); e.hop = 1; e.vy = 420;
      if (!first) this.ctx.sfx('whoosh');
      Fx.announce(this.solo ? `練習 第 ${this.ti + 1} 張` : `${drawer.name} 是畫家！`, ORANGE, 400);
      this.ctx.buzz(drawer, 120);
    }
    startDraw() { this.phase = 'draw'; this.pt = 0; this.ctx.sfx('go'); Fx.pop(BX + BW / 2, BY + BH / 2, '開始畫！', ORANGE, 70); }
    reveal(note) {
      const T = this.turn; this.phase = 'reveal'; this.pt = 0; T.note = note || '';
      T.hits = [...T.ans.values()].filter(a => a.ok).length;
      const cx = BX + BW / 2;
      if (T.hits || this.solo) {
        this.ctx.sfx('star'); Fx.flash('#fff', 0.25);
        for (let i = 0; i < 140; i++) this.conf.push({ x: rnd(BX - 80, BX + BW + 80), y: rnd(-40, 120), vx: rnd(-60, 60), vy: rnd(120, 300), rot: rnd(0, TAU), vr: rnd(-8, 8), col: OPT_COLS[rint(6)], w: rnd(8, 14), h: rnd(5, 9), t: 0 });
        Fx.burst(cx, BY + BH * 0.72, '#ffbf1f', 26, 380); Fx.burst(cx, BY + BH * 0.72, '#ff6fb7', 18, 300);
        const e = this.by.get(T.drawer); e.hop = 1; e.vy = 520;
      } else this.ctx.sfx('end');
      for (const g of this.guessers()) { const a = T.ans.get(g.p); if (a && a.ok) { g.hop = 1; g.vy = 460; } }
    }
    endTurn() {
      const T = this.turn;
      this.by.get(T.drawer).drew++;
      this.gallery.push({ art: T.art, word: T.word, drawer: T.drawer, hits: T.hits, n: this.solo ? 0 : this.guessers().filter(e => e.p.peer).length, fly: 0 });
      this.nextTurn(false);
    }
    startGallery() { this.phase = 'gallery'; this.pt = 0; this.turn = null; this.ctx.sfx('win'); }
    guessers() { const d = this.turn && this.turn.drawer; return this.es.filter(e => e.p !== d); }
    /* who still has to answer: phones that are online and haven't tapped yet */
    waiting() { const T = this.turn; return this.guessers().filter(e => e.p.peer && e.p.online && !T.ans.has(e.p)); }

    /* ---------------- phone input ---------------- */
    onDraw(p, d) {
      const T = this.turn;
      if (!T || p !== T.drawer || this.phase !== 'draw' || !d.p || d.p.length < 2) return;
      if (T.pts > 30000) return;   // plenty for one picture
      const pts = d.p.length & 1 ? d.p.slice(0, -1) : d.p;
      if (T.lastS !== d.s) { T.lastS = d.s; T.strokes++; }
      T.pts += pts.length >> 1;
      paintBatch(T.art, d.c, pts);
      T.pen = { x: pts[pts.length - 2], y: pts[pts.length - 1], c: d.c, t: 0.7 };
    }
    onDrawClear(p) {
      const T = this.turn;
      if (!T || p !== T.drawer || this.phase !== 'draw') return;
      const g = T.art.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, ART_W, ART_H);
      T.lastS = null; this.ctx.sfx('whoosh'); Fx.pop(BX + BW / 2, BY + BH / 2, '擦掉重畫！', '#7a6f8f', 46);
    }
    onChoose(p, id) {
      const T = this.turn;
      if (!T || this.solo || this.phase !== 'draw' || p === T.drawer || T.ans.has(p)) return;
      const o = T.opts.find(x => x.id === id); if (!o) return;
      const e = this.by.get(p), el = this.pt, idx = this.guessers().indexOf(e), pos = this.guessPos(idx, this.guessers().length);
      if (o.ok) {
        const pts = Math.max(30, Math.round((100 - 70 * clamp(el / this.limit, 0, 1)) / 5) * 5);
        T.ans.set(p, { id, ok: true, pts, at: el });
        e.score += pts; e.right++; e.hop = 1; e.vy = 420;
        const de = this.by.get(T.drawer), dp = 50; de.score += dp; de.hits++; T.drawerPts += dp;
        this.ctx.sfx('coin'); this.ctx.buzz(p, 40);
        Fx.pop(pos.x, pos.y - 70, '+' + pts, '#16a34a', 34); Fx.ring(pos.x, pos.y, '#22c26a', 70);
        Fx.pop(DRAWER_AT.x, DRAWER_AT.y - 110, '+' + dp, ORANGE, 30);
      } else {
        T.ans.set(p, { id, ok: false, pts: 0, at: el });
        this.ctx.sfx('bonk', 1);
      }
    }

    /* ---------------- phone layouts ---------------- */
    padLayout(p) {
      const T = this.turn;
      if (this.phase === 'gallery' || !T) return { type: 'tap', prompt: '🖼️ 看大螢幕上的畫廊！', btn: { icon: '🖼️', label: '畫廊' } };
      const w = T.word, id = 'd' + this.seed + '-' + this.ti;
      if (p === T.drawer) {
        const what = (this.kid ? w.e + ' ' : '') + w.w;
        if (this.phase === 'ready') return { type: 'draw', id, prompt: '準備！你要畫：' + what, canDraw: false };
        if (this.phase === 'draw') return { type: 'draw', id, prompt: '請畫：' + what, canDraw: true };
        return { type: 'draw', id, prompt: this.solo ? '畫好了！題目是：' + w.e + ' ' + w.w : '時間到！答案是 ' + w.e + ' ' + w.w + '，看大螢幕', canDraw: false };
      }
      if (this.solo) return { type: 'tap', prompt: '看大螢幕，大家在練習畫畫', btn: { icon: '✏️', label: '看' } };
      const a = T.ans.get(p), rev = this.phase === 'reveal';
      const options = T.opts.map((o, i) => ({ id: o.id, label: o.w, icon: o.e, col: OPT_COLS[i],
        state: rev ? (o.ok ? 'right' : a && a.id === o.id ? 'wrong' : '') : a && a.id === o.id ? 'chosen' : '' }));
      let prompt;
      if (this.phase === 'ready') prompt = '👀 ' + T.drawer.name + ' 要開始畫了…';
      else if (rev) prompt = a ? (a.ok ? '🎉 答對了！+' + a.pts : '答案是 ' + T.word.w + '，下次加油！') : '時間到！答案是 ' + T.word.w;
      else prompt = a ? '已經選好了，等答案揭曉…' : '看大螢幕，這是什麼？選一個！';
      return { type: 'choices', prompt, options, cols: 3, locked: this.phase !== 'draw' || !!a };
    }

    /* ---------------- update ---------------- */
    update(dt) {
      this.t += dt; this.pt += dt;
      for (const e of this.es) { if (e.hop > 0 || e.vy) { e.vy -= 1700 * dt; e.hop = Math.max(0, e.hop + e.vy * dt); if (e.hop <= 0) e.vy = 0; } }
      for (const c of this.conf) { c.t += dt; c.vy += 260 * dt; c.vx *= 0.99; c.x += (c.vx + Math.sin(c.t * 4 + c.rot) * 40) * dt; c.y += Math.min(c.vy, 260) * dt; c.rot += c.vr * dt; }
      this.conf = this.conf.filter(c => c.y < H + 20);
      for (const gi of this.gallery) if (gi && gi.fly < 1) gi.fly = Math.min(1, gi.fly + dt * 1.4);
      const T = this.turn;
      if (T && T.pen) { T.pen.t -= dt; if (T.pen.t <= 0) T.pen = null; }
      switch (this.phase) {
        case 'ready': if (this.pt >= READY) this.startDraw(); break;
        case 'draw': {
          const left = this.limit - this.pt, sec = Math.ceil(left);
          if (sec !== this.lastSec) { this.lastSec = sec; if (sec <= 5 && sec > 0) this.ctx.sfx('tick'); }
          if (!T.hint && this.pt >= this.limit * 0.4) { T.hint = true; this.ctx.sfx('pop'); Fx.pop(1325, 302, '新提示！', ORANGE, 30); }
          if (!T.drawer.online) { T.offT += dt; if (T.offT > 4) { this.reveal('畫家斷線了'); break; } } else T.offT = 0;
          if (!this.solo && this.waiting().length === 0 && T.ans.size > 0) { if (T.allT < 0) T.allT = 0.8; T.allT -= dt; if (T.allT <= 0) { this.reveal('大家都猜好了！'); break; } }
          if (left <= 0) this.reveal(this.solo ? '' : '時間到！');
          break;
        }
        case 'reveal': if (this.pt >= REVEAL) this.endTurn(); break;
        case 'gallery': if (this.pt >= GALLERY) this.over = true; break;
      }
    }

    /* ---------------- drawing ---------------- */
    paintBg(g) {
      // warm classroom wall with soft stripes
      const wall = g.createLinearGradient(0, 0, 0, 700); wall.addColorStop(0, '#fff3dc'); wall.addColorStop(1, '#fde2b4');
      g.fillStyle = wall; g.fillRect(0, 0, W, 700);
      g.fillStyle = 'rgba(255,255,255,.4)'; for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 26, 700);
      // bunting
      g.strokeStyle = '#a16207'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 150); g.quadraticCurveTo(W / 2, 190, W, 150); g.stroke();
      for (let i = 0; i < 26; i++) {
        const x = 20 + i * 62, k = x / W, y = 150 + 4 * 40 * k * (1 - k) * 1;
        g.fillStyle = OPT_COLS[i % 6]; g.beginPath(); g.moveTo(x - 18, y); g.lineTo(x + 18, y); g.lineTo(x, y + 30); g.closePath(); g.fill();
      }
      // pinned kids' drawings on the left wall
      const paper = (x, y, w, h, rot, doodle) => {
        g.save(); g.translate(x, y); g.rotate(rot);
        g.fillStyle = 'rgba(80,40,20,.18)'; g.fillRect(-w / 2 + 5, -h / 2 + 6, w, h);
        g.fillStyle = '#fffdf7'; g.fillRect(-w / 2, -h / 2, w, h);
        doodle(g, w, h);
        g.fillStyle = '#ff4f58'; g.beginPath(); g.arc(0, -h / 2 + 8, 6, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-2, -h / 2 + 6, 2, 0, TAU); g.fill();
        g.restore();
      };
      g.lineCap = 'round'; g.lineJoin = 'round';
      paper(110, 270, 150, 112, -0.07, (g) => {
        g.fillStyle = '#ffbf1f'; g.beginPath(); g.arc(-30, -12, 18, 0, TAU); g.fill();
        g.strokeStyle = '#ffbf1f'; g.lineWidth = 4; for (let k = 0; k < 8; k++) { const a = k * TAU / 8; g.beginPath(); g.moveTo(-30 + Math.cos(a) * 24, -12 + Math.sin(a) * 24); g.lineTo(-30 + Math.cos(a) * 32, -12 + Math.sin(a) * 32); g.stroke(); }
        g.fillStyle = '#22c26a'; g.fillRect(-75, 34, 150, 22);
        g.strokeStyle = '#2f8cff'; g.lineWidth = 4; g.beginPath(); g.moveTo(16, 30); g.lineTo(16, 0); g.lineTo(40, -18); g.lineTo(64, 0); g.lineTo(64, 30); g.closePath(); g.stroke();
      });
      paper(285, 330, 120, 150, 0.06, (g) => {
        g.strokeStyle = '#9b5cff'; g.lineWidth = 4; g.beginPath(); g.arc(0, -20, 30, 0, TAU); g.stroke();
        g.fillStyle = '#9b5cff'; g.beginPath(); g.arc(-10, -26, 4, 0, TAU); g.arc(10, -26, 4, 0, TAU); g.fill();
        g.beginPath(); g.arc(0, -16, 12, 0.3, Math.PI - 0.3); g.stroke();
        g.strokeStyle = '#ff4f58'; g.beginPath(); g.moveTo(0, 10); g.lineTo(0, 50); g.moveTo(-26, 26); g.lineTo(26, 26); g.moveTo(0, 50); g.lineTo(-18, 68); g.moveTo(0, 50); g.lineTo(18, 68); g.stroke();
      });
      // a little clock
      g.fillStyle = '#fff'; g.beginPath(); g.arc(150, 440, 34, 0, TAU); g.fill(); g.strokeStyle = '#2f8cff'; g.lineWidth = 7; g.stroke();
      g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(150, 440); g.lineTo(150, 418); g.moveTo(150, 440); g.lineTo(166, 448); g.stroke();
      // floor + baseboard + rug
      g.fillStyle = '#c98f5a'; g.fillRect(0, 690, W, 16);
      g.fillStyle = '#e9b981'; g.fillRect(0, 706, W, H - 706);
      g.fillStyle = 'rgba(150,90,40,.22)'; for (let y = 728; y < H; y += 30) g.fillRect(0, y, W, 2);
      for (let y = 706, k = 0; y < H; y += 30, k++) for (let x = (k % 2) * 120; x < W; x += 240) g.fillRect(x, y, 2, 30);
      g.fillStyle = '#fca5a5'; g.beginPath(); g.ellipse(840, 760, 660, 62, 0, 0, TAU); g.fill();
      g.strokeStyle = '#fff1f2'; g.lineWidth = 5; g.setLineDash([14, 10]); g.beginPath(); g.ellipse(840, 760, 630, 50, 0, 0, TAU); g.stroke(); g.setLineDash([]);
      // the easel: back leg, two front legs, top bar
      g.lineCap = 'round';
      g.strokeStyle = '#8a5428'; g.lineWidth = 20; g.beginPath(); g.moveTo(740, 130); g.lineTo(740, 770); g.stroke();
      g.strokeStyle = '#b97a45'; g.lineWidth = 24;
      g.beginPath(); g.moveTo(690, 126); g.lineTo(440, 790); g.stroke();
      g.beginPath(); g.moveTo(790, 126); g.lineTo(1040, 790); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(686, 128); g.lineTo(436, 786); g.stroke(); g.beginPath(); g.moveTo(786, 128); g.lineTo(1036, 786); g.stroke();
      g.fillStyle = '#a06a3a'; g.beginPath(); g.roundRect(660, 118, 160, 22, 10); g.fill();
      g.lineCap = 'butt';
      // the paper board (behind the paper): a wooden backing
      g.fillStyle = 'rgba(60,30,10,.25)'; g.fillRect(BX - 12, BY - 6, BW + 34, BH + 30);
      g.fillStyle = '#d9a066'; g.fillRect(BX - 16, BY - 14, BW + 32, BH + 28);
      // the tray with crayons
      g.fillStyle = '#8a5428'; g.beginPath(); g.roundRect(BX - 40, BY + BH + 8, BW + 80, 26, 8); g.fill();
      g.fillStyle = '#a06a3a'; g.beginPath(); g.roundRect(BX - 40, BY + BH + 4, BW + 80, 12, 6); g.fill();
      ['#ff4f58', '#2f8cff', '#22c26a', '#ffbf1f', '#9b5cff', '#ff6fb7', '#2b2340'].forEach((c, i) => crayon(g, BX + 30 + i * 52, BY + BH - 4, -0.08 + (i % 3) * 0.06, c, 58));
      // right side: a shelf of paint jars and a crayon box
      g.fillStyle = '#b97a45'; g.fillRect(1120, 640, 420, 16); g.fillStyle = '#8a5428'; g.fillRect(1120, 656, 420, 6);
      ['#ff4f58', '#2f8cff', '#22c26a', '#ffbf1f', '#9b5cff', '#ff6fb7', '#f97316', '#2b2340'].forEach((c, i) => {
        const x = 1160 + i * 50;
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.roundRect(x - 17, 596, 34, 44, 8); g.fill();
        g.fillStyle = c; g.beginPath(); g.roundRect(x - 15, 610, 30, 28, 6); g.fill();
        g.fillStyle = '#7a6f8f'; g.fillRect(x - 18, 590, 36, 9);
      });
      // crayon box
      g.save(); g.translate(110, 772); g.rotate(-0.08);
      ['#ff4f58', '#2f8cff', '#22c26a', '#ffbf1f', '#9b5cff'].forEach((c, i) => { g.fillStyle = c; g.fillRect(-46 + i * 19, -54 + (i % 2) * 8, 14, 50); g.beginPath(); g.moveTo(-46 + i * 19, -54 + (i % 2) * 8); g.lineTo(-39 + i * 19, -66 + (i % 2) * 8); g.lineTo(-32 + i * 19, -54 + (i % 2) * 8); g.fill(); });
      g.fillStyle = '#2f8cff'; g.beginPath(); g.roundRect(-56, -20, 112, 60, 8); g.fill();
      g.fillStyle = '#ffbf1f'; g.beginPath(); g.ellipse(0, 10, 40, 16, 0, 0, TAU); g.fill();
      g.fillStyle = '#c2410c'; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('蠟筆', 0, 11);
      g.restore();
    }

    guessPos(i, n) {
      const span = Math.min(1280, n * 270), x0 = 800 - span / 2 + span / n / 2;
      return { x: x0 + i * span / n + (n === 1 ? 120 : 0), y: GUESS_Y };
    }

    draw(g, t) {
      bgLayer(this, g, cg => this.paintBg(cg));
      const T = this.turn, ph = this.phase;
      // the paper on the easel
      g.fillStyle = '#fff'; g.fillRect(BX, BY, BW, BH);
      if (T) g.drawImage(T.art, BX, BY, BW, BH);
      g.strokeStyle = 'rgba(43,35,64,.15)'; g.lineWidth = 2; g.strokeRect(BX, BY, BW, BH);
      for (const cx of [BX + 150, BX + BW - 150]) { g.fillStyle = '#9aa0ad'; g.beginPath(); g.roundRect(cx - 22, BY - 18, 44, 30, 6); g.fill(); g.fillStyle = '#cfd4dd'; g.fillRect(cx - 18, BY - 14, 36, 8); }
      if (T && ph === 'ready') {
        g.fillStyle = 'rgba(43,35,64,.35)'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(this.solo ? '準備畫畫…' : T.drawer.name + ' 準備畫畫…', BX + BW / 2, BY + BH / 2);
      }
      if (T && ph === 'draw' && !T.pts) {
        g.fillStyle = 'rgba(43,35,64,.22)'; g.font = `900 34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('等畫家下筆…' + '．'.repeat(1 + (t * 2 | 0) % 3), BX + BW / 2, BY + BH / 2);
      }
      // the painter's live pencil on the paper
      if (T && T.pen) {
        const px = BX + T.pen.x * BW, py = BY + T.pen.y * BH;
        g.globalAlpha = Math.min(1, T.pen.t * 3);
        pencil(g, px, py, -2.3, 70, 16, T.pen.c === 6 ? '#ff8fab' : INKS[T.pen.c] === '#ffffff' ? '#ffc81f' : INKS[T.pen.c]);
        g.globalAlpha = 1;
      }
      this.drawRight(g, t);
      this.drawDrawer(g, t);
      this.drawGuessers(g, t);
      if (T && ph === 'reveal') this.drawReveal(g, t);
      if (ph !== 'gallery') this.drawStrip(g, t);
      for (const c of this.conf) { g.save(); g.translate(c.x, c.y); g.rotate(c.rot); g.fillStyle = c.col; g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); g.restore(); }
      if (ph === 'gallery') this.drawGallery(g, t);
    }

    drawRight(g, t) {
      const T = this.turn; if (!T) return;
      const ph = this.phase, x0 = 1110, w = 430, cx = x0 + w / 2;
      // clue card
      g.fillStyle = 'rgba(80,40,20,.18)'; g.beginPath(); g.roundRect(x0 + 6, 214, w, 222, 26); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x0, 206, w, 222, 26); g.fill();
      g.strokeStyle = ORANGE; g.lineWidth = 5; g.stroke();
      g.fillStyle = ORANGE; g.beginPath(); g.roundRect(cx - 80, 188, 160, 40, 20); g.fill();
      g.fillStyle = '#fff'; g.font = `900 24px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(this.solo ? '✏️ 題目' : '💡 提示', cx, 209);
      const chars = Array.from(T.word.w), n = chars.length, open = this.solo || ph === 'reveal';
      const bs = n >= 4 ? 70 : 80, gap = 12, tw = n * bs + (n - 1) * gap;
      for (let i = 0; i < n; i++) {
        const bx = cx - tw / 2 + i * (bs + gap), by = 246;
        g.fillStyle = open ? '#fff7ed' : '#fef3c7'; g.beginPath(); g.roundRect(bx, by, bs, bs, 14); g.fill();
        g.strokeStyle = open ? ORANGE : '#f59e0b'; g.lineWidth = 4; g.setLineDash(open ? [] : [10, 7]); g.stroke(); g.setLineDash([]);
        g.fillStyle = INK; g.font = `900 ${bs * 0.62}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(open ? chars[i] : '？', bx + bs / 2, by + bs / 2 + 2);
      }
      g.fillStyle = INK; g.font = `900 30px ${FONT}`; g.textAlign = 'center';
      g.fillText(open && this.solo ? T.word.e + ' ' + n + ' 個字' : `「${n} 個字」`, cx, 360);
      const cat = CATS[T.word.ci];
      g.font = `700 26px ${FONT}`; g.fillStyle = T.hint ? DEEP : '#7a6f8f';
      g.fillText(T.hint ? `類別：${cat.i} ${cat.n}` : '類別：等一下告訴你…', cx, 402);
      // pencil timer: the pencil gets shorter as time runs out
      const left = ph === 'draw' ? Math.max(0, this.limit - this.pt) : ph === 'ready' ? this.limit : 0, k = left / this.limit;
      const urgent = ph === 'draw' && left <= 10;
      const full = 300, len = Math.max(8, full * k), tipX = x0 + 46 + full + 40;
      g.fillStyle = 'rgba(80,40,20,.15)'; g.beginPath(); g.roundRect(x0, 462, w, 104, 26); g.fill();
      pencil(g, tipX, 500 + (urgent ? Math.sin(t * 30) * 2 : 0), 0, len, 34, urgent ? '#ff6b6b' : '#ffc81f');
      // shavings where the pencil used to be
      g.fillStyle = 'rgba(201,143,90,.5)'; for (let i = 0; i < 5; i++) { const sx = x0 + 30 + (full - len) * (i / 5); if (sx < tipX - 50 - len) { g.beginPath(); g.ellipse(sx + 10, 524, 8, 3, i, 0, TAU); g.fill(); } }
      g.fillStyle = urgent ? '#ff3b4a' : INK; g.font = `900 ${urgent ? 34 : 28}px ${ROUND}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ph === 'reveal' ? '⏰ 揭曉！' : Math.ceil(left) + ' 秒', this.solo ? cx : x0 + 110, 540);
      // who has answered
      if (!this.solo) {
        const gs = this.guessers().filter(e => e.p.peer), done = gs.filter(e => T.ans.has(e.p)).length;
        g.font = `700 24px ${FONT}`; g.fillStyle = '#7a6f8f'; g.fillText(`🙋 已作答 ${done} / ${gs.length}`, x0 + 300, 540);
      }
    }

    drawDrawer(g, t) {
      const T = this.turn; if (!T) return;
      const p = T.drawer, e = this.by.get(p), { x, y, r } = DRAWER_AT, ph = this.phase;
      const busy = T.pen && ph === 'draw', bob = busy ? Math.abs(Math.sin(t * 10)) * 4 : 0, hop = e.hop + bob;
      g.fillStyle = '#b97a45'; g.beginPath(); g.ellipse(x, y + r * 0.95, r * 1.1, r * 0.22, 0, 0, TAU); g.fill();   // little stool top
      g.fillStyle = '#8a5428'; g.fillRect(x - r * 0.8, y + r * 0.98, 10, 70); g.fillRect(x + r * 0.8 - 10, y + r * 0.98, 10, 70);
      drawCritter(g, x, y, r, p.col, p.animal, { face: busy ? -0.35 : 0, hop, happy: ph === 'reveal' && (T.hits > 0 || this.solo), still: true });
      beret(g, x, y, r, hop, '#dc2626');
      // a big pencil in the hand, pointing at the paper
      const wob = busy ? Math.sin(t * 22) * 0.18 : Math.sin(t * 2) * 0.05;
      pencil(g, x + r * 1.55, y + r * 0.1 - hop, -0.45, 60, 15, '#ffc81f', wob);
      drawTag(g, x, y + r + 42, p);
      pill(g, x, y - r - 54 - hop, '✏️ 畫家', ORANGE, '#fff', 22);
    }

    drawGuessers(g, t) {
      const T = this.turn, gs = T ? this.guessers() : [];
      if (!T || this.solo) return;
      gs.forEach((e, i) => {
        const pos = this.guessPos(i, gs.length), x = pos.x, y = pos.y, r = 32, a = T.ans.get(e.p), rev = this.phase === 'reveal';
        const think = !a && this.phase === 'draw';
        const sway = think ? Math.sin(t * 2 + i) * 0.06 : 0;
        drawCritter(g, x, y, r, e.p.col, e.p.animal, { face: -Math.PI / 2 + sway * 4, hop: e.hop, happy: !!(a && a.ok && (rev || true)), alpha: e.p.online || e.p.local ? 1 : 0.4, still: true });
        drawTag(g, x, y + r + 12, e.p);
        // thinking bubble
        const bx = x + 46, by = y - 64 - e.hop;
        g.fillStyle = '#fff'; g.strokeStyle = 'rgba(43,35,64,.25)'; g.lineWidth = 3;
        for (const [dx, dy, rr] of [[-26, 30, 5], [-16, 20, 8]]) { g.beginPath(); g.arc(bx + dx, by + dy, rr, 0, TAU); g.fill(); g.stroke(); }
        const col = a ? (a.ok ? '#22c26a' : '#ff4f58') : '#fff';
        g.fillStyle = a ? col : '#fff'; g.beginPath();
        for (const [dx, dy, rr] of [[-14, -2, 18], [0, -12, 20], [16, -4, 18], [6, 10, 18], [-10, 10, 16]]) { g.moveTo(bx + dx + rr, by + dy); g.arc(bx + dx, by + dy, rr, 0, TAU); }
        g.fill();
        g.fillStyle = a ? '#fff' : INK; g.font = `900 ${a ? 30 : 26}px ${ROUND}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        if (a) g.fillText(a.ok ? '✔' : '✘', bx + 1, by + 1);
        else if (this.phase === 'draw') g.fillText('．'.repeat(1 + ((t * 2.5 + i) | 0) % 3), bx, by - 2);
        else g.fillText('？', bx, by);
        if (a && a.ok && rev) { g.font = `900 22px ${ROUND}`; g.lineWidth = 5; g.strokeStyle = '#fff'; g.strokeText('+' + a.pts, x - 44, y - 40 - e.hop); g.fillStyle = '#16a34a'; g.fillText('+' + a.pts, x - 44, y - 40 - e.hop); }
      });
    }

    drawReveal(g, t) {
      const T = this.turn, k = Math.min(1, this.pt / 0.35), s = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + (k >= 1 ? Math.sin(this.pt * 3) * 0.01 : 0);
      const cx = BX + BW / 2, cy = BY + BH - 92;
      g.save(); g.translate(cx, cy); g.scale(s, s); g.globalAlpha = k;
      g.fillStyle = 'rgba(43,35,64,.2)'; g.beginPath(); g.roundRect(-272, -82, 552, 178, 30); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-280, -90, 560, 178, 30); g.fill();
      g.strokeStyle = ORANGE; g.lineWidth = 6; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '84px system-ui'; g.fillText(T.word.e, -170, -18);
      g.fillStyle = INK; g.font = `900 ${lenOf(T.word.w) >= 4 ? 64 : 76}px ${FONT}`; g.fillText(T.word.w, 50, -22);
      const right = this.guessers().filter(e => (T.ans.get(e.p) || {}).ok).map(e => e.p.name);
      let line;
      if (this.solo) line = '畫得好棒！🎨';
      else if (T.note === '畫家斷線了') line = '畫家斷線了，下一位！';
      else line = right.length ? '猜中：' + right.join('、') : '沒有人猜中…下次畫大一點！';
      g.font = `700 26px ${FONT}`; g.fillStyle = right.length || this.solo ? '#16a34a' : '#7a6f8f';
      g.fillText(line, 0, 52, 520);
      g.restore(); g.globalAlpha = 1;
    }

    slotRect(i) {
      const n = Math.max(this.turns.length, 1), span = n * SLOT_W + (n - 1) * SLOT_GAP, x0 = 800 - span / 2 + 60;
      return { x: x0 + i * (SLOT_W + SLOT_GAP), y: STRIP_Y, w: SLOT_W, h: SLOT_H };
    }
    drawStrip(g, t) {
      if (!this.turns.length) return;
      const a = this.slotRect(0), n = this.turns.length, z = this.slotRect(n - 1);
      g.fillStyle = 'rgba(138,84,40,.85)'; g.beginPath(); g.roundRect(a.x - 150, STRIP_Y - 14, z.x + z.w - a.x + 168, SLOT_H + 28, 18); g.fill();
      g.fillStyle = '#fff7ed'; g.font = `900 24px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🖼️ 畫廊', a.x - 74, STRIP_Y + SLOT_H / 2);
      for (let i = 0; i < n; i++) {
        const r = this.slotRect(i), it = this.gallery[i];
        if (!it || it.fly < 1) {
          g.strokeStyle = 'rgba(255,247,237,.6)'; g.lineWidth = 3; g.setLineDash([8, 6]); g.strokeRect(r.x, r.y, r.w, r.h); g.setLineDash([]);
          g.fillStyle = 'rgba(255,247,237,.6)'; g.font = `900 26px ${ROUND}`; g.fillText(i === this.ti && this.phase !== 'gallery' ? '✏️' : String(i + 1), r.x + r.w / 2, r.y + r.h / 2 + 1);
        }
        if (!it) continue;
        // fly from the easel into the strip
        const f = 1 - Math.pow(1 - it.fly, 3), x = BX + (r.x - BX) * f, y = BY + (r.y - BY) * f, w = BW + (r.w - BW) * f, h = BH + (r.h - BH) * f;
        framed(g, it.art, x, y, w, h, 5 + 14 * (1 - f));
        if (it.fly >= 1) { g.font = '22px system-ui'; g.fillText(it.word.e, r.x + r.w - 10, r.y + 10); }
      }
    }

    drawGallery(g, t) {
      const k = Math.min(1, this.pt / 0.5);
      g.globalAlpha = k;
      g.fillStyle = 'rgba(43,35,64,.9)'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff'; g.font = `900 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('🖼️ 今天的畫廊', W / 2, 186);
      const items = this.gallery.map((it, i) => ({ it, i })).filter(o => o.it);
      if (!items.length) { g.font = `700 30px ${FONT}`; g.fillText('這次沒有畫到畫…下次一起來畫！', W / 2, H / 2); g.globalAlpha = 1; return; }
      const n = items.length, cols = n <= 3 ? n : n === 4 ? 4 : 3, rows = Math.ceil(n / cols);
      const fw = Math.min(n === 4 ? 330 : 420, (1440 - (cols - 1) * 50) / cols, (640 / rows - 96) / 0.75), fh = fw * 0.75, rowH = fh + 96;
      const top = 236 + Math.max(0, (640 - rows * rowH) / 2);
      items.forEach(({ it }, j) => {
        const c = j % cols, rr = j / cols | 0, inRow = Math.min(cols, n - rr * cols);
        const x = W / 2 - (inRow * fw + (inRow - 1) * 50) / 2 + c * (fw + 50), y = top + rr * rowH;
        const pop = clamp((this.pt - 0.3 - j * 0.18) / 0.35, 0, 1), s = 0.7 + 0.3 * pop;
        if (pop <= 0) return;
        g.save(); g.translate(x + fw / 2, y + fh / 2); g.scale(s, s); g.rotate((j % 2 ? 1 : -1) * 0.015); g.globalAlpha = k * pop;
        framed(g, it.art, -fw / 2, -fh / 2, fw, fh, 14);
        g.restore(); g.globalAlpha = k;
        g.fillStyle = '#fff'; g.font = `900 28px ${FONT}`; g.textAlign = 'center';
        g.fillText(it.word.e + ' ' + it.word.w, x + fw / 2, y + fh + 38);
        g.font = `700 20px ${FONT}`; g.fillStyle = '#fde68a';
        g.fillText(this.solo ? '畫家 ' + it.drawer.name : `畫家 ${it.drawer.name}・猜中 ${it.hits} / ${it.n}`, x + fw / 2, y + fh + 68);
      });
      g.globalAlpha = 1;
    }

    /* ---------------- HUD / phones / results ---------------- */
    center() {
      if (this.phase === 'gallery') return '🖼️ 大家的畫廊';
      const T = this.turn; if (!T) return '';
      if (this.solo) return `✏️ 練習 第 ${this.ti + 1} / ${this.turns.length} 張・自己畫畫看`;
      return `第 ${this.ti + 1} / ${this.turns.length} 輪・畫家：${T.drawer.name}`;
    }
    chip(p) { const e = this.by.get(p); return this.solo ? '🖼️ ' + e.drew : '✏️ ' + e.score; }
    pad(p) {
      const T = this.turn, e = this.by.get(p);
      if (this.phase === 'gallery' || !T) return `🖼️ 畫廊時間！${this.solo ? '' : '你有 ' + e.score + ' 分'}`;
      if (p === T.drawer) {
        if (this.phase === 'ready') return '✏️ 你是畫家！準備…';
        if (this.phase === 'draw') return `✏️ 你是畫家！還有 ${Math.ceil(Math.max(0, this.limit - this.pt))} 秒`;
        return this.solo ? '🎨 畫好了！' : `🎨 ${T.hits} 人猜中！+${T.drawerPts}`;
      }
      if (this.solo) return '看大螢幕';
      const a = T.ans.get(p);
      if (this.phase === 'ready') return '👀 準備猜！';
      if (this.phase === 'draw') return a ? (a.ok ? `✔ 答對了 +${a.pts}` : '✘ 猜錯了…') : '🤔 快猜！';
      return a && a.ok ? `🎉 +${a.pts}・共 ${e.score} 分` : `共 ${e.score} 分`;
    }
    ready() { return false; }
    results() {
      const es = this.es;
      if (this.solo) {
        const e = es.find(x => x.p.peer) || es[0], n = this.gallery.filter(Boolean).length;
        return { rows: es.map(x => ({ p: x.p, key: 0, line: x === e ? `畫了 ${n} 張畫 🎨` : '在旁邊看畫畫' })), title: n ? `練習完成！畫了 ${n} 張畫` : '練習完成！', sub: '找朋友一起玩，就能互相猜！' };
      }
      const n = this.gallery.filter(Boolean).length;
      return {
        rows: es.slice().sort((a, b) => b.score - a.score || b.right - a.right).map(e => ({ p: e.p, key: e.score, line: `猜對 ${e.right} 次・畫的被猜中 ${e.hits} 次・${e.score} 分` })),
        sub: n ? `🖼️ 一共畫了 ${n} 張畫` : ''
      };
    }
  }

  GAMES.push({
    id: 'draw', name: '你畫我猜', icon: '✏️', col: ORANGE, bg: '#e9b981', kind: 'vs', players: '2–6 人',
    blurb: '輪流在手機上畫畫，大家在大螢幕猜！',
    btn: { label: '猜', icon: '✏️' },
    rules: kid => kid
      ? ['輪流當畫家：手機會偷偷告訴你要畫什麼', '你畫的每一筆，都會出現在大螢幕上', '其他人在手機點答案，越快猜對分數越多', '有人猜中，畫家也得分！所以要畫清楚喔']
      : ['輪流當畫家，題目只有畫家的手機看得到', '其他人從 6 個很像的答案裡選，只能選一次', '越快猜對分越多（100→30），猜錯 0 分', '每有一人猜中畫家 +50；類別提示要等一下才出現'],
    thumb(g) {
      g.fillStyle = '#fde2b4'; g.fillRect(0, 0, 320, 180);
      g.fillStyle = 'rgba(255,255,255,.4)'; for (let x = 0; x < 320; x += 26) g.fillRect(x, 0, 11, 180);
      g.fillStyle = '#e9b981'; g.fillRect(0, 148, 320, 32);
      g.strokeStyle = '#b97a45'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(150, 14); g.lineTo(98, 170); g.moveTo(178, 14); g.lineTo(232, 170); g.stroke();
      g.fillStyle = '#d9a066'; g.fillRect(88, 22, 152, 112);
      g.fillStyle = '#fff'; g.fillRect(94, 26, 140, 104);
      // a doodle cat on the paper
      g.strokeStyle = '#2b2340'; g.lineWidth = 4; g.lineJoin = 'round';
      g.beginPath(); g.arc(164, 84, 30, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(140, 66); g.lineTo(142, 42); g.lineTo(158, 56); g.moveTo(170, 56); g.lineTo(186, 42); g.lineTo(188, 66); g.stroke();
      g.fillStyle = '#2b2340'; g.beginPath(); g.arc(154, 80, 3.5, 0, TAU); g.arc(174, 80, 3.5, 0, TAU); g.fill();
      g.strokeStyle = '#ff4f58'; g.beginPath(); g.moveTo(158, 94); g.quadraticCurveTo(164, 100, 170, 94); g.stroke();
      g.strokeStyle = '#2f8cff'; g.lineWidth = 3; g.beginPath(); g.moveTo(132, 88); g.lineTo(112, 84); g.moveTo(196, 88); g.lineTo(216, 84); g.stroke();
      g.fillStyle = '#8a5428'; g.fillRect(84, 132, 160, 8);
      drawCritter(g, 54, 118, 24, 0, 2, { face: 0, noShadow: true, still: true });
      beret(g, 54, 118, 24, 0, '#dc2626');
      pencil(g, 100, 112, -0.5, 26, 8, '#ffc81f');
      drawCritter(g, 280, 140, 20, 1, 0, { face: -Math.PI / 2, noShadow: true, still: true });
      g.fillStyle = '#fff'; g.beginPath(); g.arc(292, 88, 18, 0, TAU); g.fill(); g.beginPath(); g.arc(282, 112, 5, 0, TAU); g.fill();
      g.fillStyle = '#f97316'; g.font = '900 24px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 292, 89);
    },
    create: ctx => new Draw(ctx)
  });
})();
