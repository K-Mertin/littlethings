'use strict';
/* 你畫我猜 — live draw-and-guess. One player at a time secretly picks a word on their phone and draws it with a finger;
   every other phone shows the drawing appearing live and guesses on its own screen (typing in adult mode, picking
   1 of 6 pictures in kid mode). Faster guesses score more; the drawer scores for every player who gets it.
   Drawing: [[colour, width, x0,y0, x1,y1, …], …] in a 1000×1000 square (same format as 傳畫接龍).
   Messages: {w:i} pick word · {d:strokes} drawing so far (drawer) · {g:'text'} adult guess · {p:i} kid picture guess · {skip:1} */
(() => {
  const KID_RAW = `🐶小狗 🐱小貓 🐰兔子 🐻熊 🐼熊貓 🐷小豬 🐮乳牛 🐸青蛙 🐵猴子 🦁獅子 🐘大象 🦒長頸鹿 🐧企鵝 🐔公雞 🐟小魚 🐳鯨魚
🐙章魚 🦀螃蟹 🐢烏龜 🐍蛇 🦋蝴蝶 🐝蜜蜂 🐌蝸牛 🦖恐龍 🍎蘋果 🍌香蕉 🍉西瓜 🍇葡萄 🍓草莓 🍕披薩 🍦冰淇淋 🍰蛋糕 🍩甜甜圈 🍭棒棒糖
🥕紅蘿蔔 🌽玉米 🍄香菇 🥚雞蛋 🚗汽車 🚌公車 🚂火車 ✈️飛機 🚀火箭 🚲腳踏車 🚢大船 ⚽足球 🎈氣球 🪁風箏 🎁禮物 ☀️太陽 🌙月亮
⭐星星 ☁️雲朵 🌈彩虹 ⛄雪人 🌧️下雨 🌳大樹 🌵仙人掌 🌻向日葵 🏠房子 🏰城堡 👑皇冠 👓眼鏡 👟球鞋 🎩帽子 ☂️雨傘 ⏰鬧鐘
📱手機 📺電視 💡燈泡 🔑鑰匙 ✏️鉛筆 ✂️剪刀 🎸吉他 🔔鈴鐺 👻小鬼 🤖機器人 ❤️愛心 👀眼睛 ✋手掌 🐛毛毛蟲 🦷牙齒 🍔漢堡`;
  const parseKid = s => { const m = s.match(/^([^㐀-鿿]+)(.+)$/); return m ? { e: m[1], w: m[2] } : { e: '❓', w: s }; };
  const ITEMS = KID_RAW.split(/\s+/).filter(Boolean).map(parseKid);
  // adult words: word / accepted alternatives (comma separated)
  const ADULT_RAW = `珍珠奶茶,珍奶 牛肉麵 小籠包 臭豆腐 滷肉飯 雞排 火鍋 便當 西瓜 鳳梨 香蕉 草莓 披薩 漢堡 薯條 甜甜圈 冰淇淋 蛋糕 熱狗 壽司
台北101,101 高鐵 捷運 機車,摩托車 腳踏車,自行車,單車 計程車 救護車 消防車 飛機 熱氣球 潛水艇 火箭 帆船 紅綠燈 斑馬線 加油站 便利商店
游泳池 溜滑梯 鞦韆 摩天輪 雲霄飛車 帳篷 營火 燈塔 城堡 金字塔 風車 橋 噴水池 天使 外星人 機器人 殭屍 美人魚 吸血鬼 雪人 聖誕老人
恐龍 長頸鹿 企鵝 章魚 螃蟹 蝸牛 刺蝟 孔雀 蝙蝠 獨角獸 鯊魚 烏龜 無尾熊 袋鼠 鱷魚 蜘蛛 蝴蝶 貓頭鷹 火鶴 河馬
牙刷 吹風機 雨傘 眼鏡 手錶 鑰匙 剪刀 吉他 鋼琴 耳機 麥克風 相機 電視 手機 電腦,筆電 檯燈 時鐘 鬧鐘 拖鞋 高跟鞋 領帶
皇冠 王冠 鑽石 寶箱 地圖 指南針 望遠鏡 放大鏡 磁鐵 電池 燈泡 蠟燭 氣球 風箏 禮物 煙火 彩虹 閃電 颱風 龍捲風 火山
下雨 太陽 月亮 星星 流星 地球 仙人掌 向日葵 玫瑰 蘑菇 椰子樹 竹子 楓葉 雪花 沙漏 骰子 撲克牌 棒球 籃球 足球 保齡球
跳繩 溜冰 衝浪 釣魚 露營 爬山 拔河 打噴嚏 打哈欠 刷牙 洗澡 睡覺 生日派對 婚禮 畢業 自拍 排隊 塞車 外送 健身 瑜伽`;
  const WORDS = ADULT_RAW.split(/\s+/).filter(Boolean).map(s => { const a = s.split(','); return { w: a[0], alt: a }; });
  const BOT_G = ['貓', '房子', '太陽', '是車子嗎', '花', '大象', '月亮', '火箭', '魚', '樹', '雨傘', '帽子'];

  const MAXPTS = 1500, MAXSTROKES = 220;
  const PAL = ['#ffffff', '#1f2346', '#ef4444', '#ff8a1f', '#ffd21f', '#22c26a', '#2f8cff', '#9b5cff', '#ff6fb7', '#8b5a2b', '#9aa3b5'];
  const PAL_KID = [1, 2, 3, 4, 5, 6, 7, 8], PAL_ADULT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const W_KID = [16, 30, 52], W_ADULT = [6, 14, 30];
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const norm = s => String(s || '').replace(/[\s　，。！？、,.!?~～]/g, '').toLowerCase();
  const nPts = d => d.reduce((a, s) => a + (s.length - 2) / 2, 0);
  function cleanDraw(d) {
    if (!Array.isArray(d)) return [];
    const out = []; let pts = 0;
    for (const s of d.slice(0, MAXSTROKES)) {
      if (!Array.isArray(s) || s.length < 4) continue;
      const c = s[0] | 0, w = s[1] | 0;
      if (c < 0 || c >= PAL.length || w < 2 || w > 96) continue;
      const a = [c, w];
      for (let i = 2; i + 1 < s.length && pts < MAXPTS; i += 2) { a.push(cl(Math.round(+s[i] || 0), 0, 1000), cl(Math.round(+s[i + 1] || 0), 0, 1000)); pts++; }
      if (a.length >= 4) out.push(a);
      if (pts >= MAXPTS) break;
    }
    return out;
  }
  function sizeCanvas(cv, px) {
    px = Math.max(40, Math.floor(px));
    const r = Math.min(2, window.devicePixelRatio || 1), W = Math.round(px * r);
    if (cv.width !== W) { cv.width = W; cv.height = W; }
    cv.style.width = cv.style.height = px + 'px';
  }
  function strokeOn(g, s, m, sc, from) {
    const w = s[1] * sc; g.strokeStyle = g.fillStyle = PAL[s[0]] || '#000';
    if (m <= 1) { g.beginPath(); g.arc(s[2] * sc, s[3] * sc, w / 2, 0, 7); g.fill(); return; }
    from = from || 0;
    g.lineWidth = w; g.beginPath(); g.moveTo(s[2 + from * 2] * sc, s[3 + from * 2] * sc);
    for (let i = from + 1; i < m; i++) g.lineTo(s[2 + i * 2] * sc, s[3 + i * 2] * sc);
    g.stroke();
  }
  function paint(cv, d) {
    const g = cv.getContext('2d'), W = cv.width, sc = W / 1000;
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, W);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of d || []) strokeOn(g, s, (s.length - 2) / 2, sc);
  }
  function botDraw(prev) {
    const d = (prev || []).slice();
    const st = [1 + rint(8), [6, 14, 30][rint(3)]]; let x = 200 + rint(600), y = 200 + rint(600), a = Math.random() * 7;
    for (let i = 0; i < 6 + rint(12); i++) { st.push(Math.round(x), Math.round(y)); a += rnd(-0.8, 0.8); x = cl(x + Math.cos(a) * 45, 20, 980); y = cl(y + Math.sin(a) * 45, 20, 980); }
    d.push(st); return d;
  }

  LGAMES.push({
    id: 'guess', name: '你畫我猜', icon: '✏️', col: '#2f8cff', cat: 'draw',
    blurb: '輪流畫畫，大家在自己手機上搶答猜猜看', players: [2, 6],
    opts: kid => [
      { k: 'r', n: '每人畫幾次', o: [[1, '1 次'], [2, '2 次'], [3, '3 次']], d: 1 },
      { k: 't', n: '畫畫時間', o: kid ? [[60, '60 秒'], [90, '90 秒']] : [[45, '45 秒'], [70, '70 秒'], [90, '90 秒']], d: kid ? 90 : 70 }
    ],
    rules: kid => kid ? [
      '✏️ 輪到你畫：從三張圖選一個，用手指畫出來（不能寫字喔）',
      '👀 其他人的手機會看到你一筆一筆畫出來',
      '🖼️ 猜的人從 6 張圖裡選一個，選錯要等 3 秒才能再猜',
      '⭐ 越快猜對分數越多，畫的人也會得分'
    ] : [
      '輪到你時從三個詞挑一個，在手機上畫出來（不能寫字或數字）',
      '其他人在自己手機上打字搶答，猜錯的答案大家都看得到，猜對的會被隱藏',
      '時間過一半會提示一個字；很接近時會私下告訴你「很接近」',
      '猜對：100 分＋越快越多（最多 +300）；畫的人每有一人猜對 +100',
      '大家都猜對或時間到就換下一個人畫'
    ],

    host(ctx) {
      const kid = ctx.kid, O = ctx.opt || {}, ids = ctx.players.map(p => p.id), N = ids.length, now = () => ctx.now();
      const TD = O.t || (kid ? 90 : 70), RN = O.r || 1, CH_T = kid ? 15 : 12, REV_T = 5;
      const turns = []; for (let r = 0; r < RN; r++) ids.forEach(id => turns.push(id));
      const usedW = new Set(), score = {}, add = {}, gotN = {}, drawN = {};
      ids.forEach(id => { score[id] = 0; gotN[id] = 0; drawN[id] = 0; });
      let ti = -1, ph = 'choose', T = 0, over = false, dr = null, choices = [], word = null, d = [], dv = 0, feed = [], got = [], cool = {}, hint = [], t0 = 0, kidOpts = [];
      const push = () => ctx.push();
      const pool = () => kid ? ITEMS : WORDS;
      function nextTurn() {
        ti++;
        if (ti >= turns.length) { ph = 'end'; T = now() + 0.5; push(); return; }
        dr = turns[ti]; word = null; d = []; dv++; feed = []; got = []; cool = {}; hint = [];
        ids.forEach(id => add[id] = 0);
        const cand = shuffle(pool().map((x, i) => i).filter(i => !usedW.has(i))).slice(0, 3);
        choices = cand.length === 3 ? cand : shuffle(pool().map((x, i) => i)).slice(0, 3);
        ph = 'choose'; T = now() + CH_T; ctx.sound(dr, 'turn'); push();
      }
      function pickWord(i) {
        word = choices[i]; usedW.add(word);
        if (kid) { const others = shuffle(ITEMS.map((x, k) => k).filter(k => k !== word)).slice(0, 5); kidOpts = shuffle([word, ...others]); }
        else { const w = [...WORDS[word].w]; hint = w.map(() => 0); }
        ph = 'draw'; t0 = now(); T = t0 + TD; ctx.sound('*', 'go'); push();
      }
      function endTurn(why) {
        ph = 'rev'; T = now() + REV_T;
        drawN[dr]++;
        ctx.sound('*', got.length ? 'star' : 'buzz');
        feed.push({ sys: why === 'all' ? '大家都猜對了！' : why === 'off' ? '畫畫的人離線了' : why === 'skip' ? '畫畫的人跳過了' : '時間到！' });
        push();
      }
      function correct(id) {
        const k = got.length, left = cl((T - now()) / TD, 0, 1);
        const pts = 100 + Math.round(300 * left / 10) * 10 - Math.min(60, k * 20);
        got.push(id); score[id] += pts; add[id] += pts; gotN[id]++;
        score[dr] += 100; add[dr] += 100;
        feed.push({ id, ok: 1 });
        ctx.sound(id, 'right'); ctx.sound(dr, 'coin');
        const need = ids.filter(x => x !== dr && ctx.online(x));
        if (need.every(x => got.includes(x))) endTurn('all'); else push();
      }
      nextTurn();
      return {
        get over() { return over; },
        tick() {
          const t = now();
          if (ph === 'choose') { if (t >= T) pickWord(rint(3)); else if (!ctx.online(dr) && t >= T - CH_T + 4) { endTurn('off'); } }
          else if (ph === 'draw') {
            if (t >= T) endTurn('time');
            else if (!kid) {   // reveal letters as time passes
              const fr = (t - t0) / TD, w = [...WORDS[word].w], want = w.length < 2 ? 0 : fr > 0.75 && w.length >= 3 ? 2 : fr > 0.5 ? 1 : 0;
              if (hint.filter(Boolean).length < want) { const c = w.map((x, i) => i).filter(i => !hint[i]); hint[c[rint(c.length)]] = 1; ctx.sound('*', 'pop'); push(); }
            }
          }
          else if (ph === 'rev') { if (t >= T) nextTurn(); }
          else if (ph === 'end') { if (t >= T) over = true; }
        },
        msg(id, m) {
          if (!m || !ids.includes(id)) return;
          if (m.w != null && ph === 'choose' && id === dr && choices[m.w | 0] != null) { pickWord(m.w | 0); return; }
          if (m.d && ph === 'draw' && id === dr) { d = cleanDraw(m.d); dv++; push(); return; }
          if (m.skip && id === dr && (ph === 'draw' || ph === 'choose')) { endTurn('skip'); return; }
          if (ph !== 'draw' || id === dr || got.includes(id)) return;
          const t = now();
          if (kid && m.p != null) {
            if (cool[id] && t < cool[id]) return;
            const p = m.p | 0; if (!kidOpts.includes(p)) return;
            if (p === word) correct(id);
            else { cool[id] = t + 3; feed.push({ id, i: p }); ctx.sound(id, 'wrong'); push(); }
            return;
          }
          if (!kid && typeof m.g === 'string') {
            const g = m.g.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16); if (!g) return;
            if (cool[id] && t < cool[id]) return; cool[id] = t + 0.6;
            const W = WORDS[word], ng = norm(g);
            if (W.alt.some(a => norm(a) === ng)) { correct(id); return; }
            const close = W.alt.some(a => { const na = norm(a); return na.length >= 2 && (ng.includes(na) || (na.includes(ng) && ng.length >= 2) || ([...na].filter(c => ng.includes(c)).length >= Math.max(2, na.length - 1))); });
            if (close) ctx.toast(id, '很接近了！🔥');
            feed.push({ id, t: g }); if (feed.length > 40) feed.splice(0, feed.length - 40);
            push();
          }
        },
        leave(id) { if (id === dr && ph === 'draw' && !got.length) { /* give them a moment to come back */ } push(); },
        back() { push(); },
        view(id) {
          const me = id && ids.includes(id) ? id : null, t = now();
          const v = { ph, dr, ti, tn: turns.length, tl: Math.max(0, Math.round((T - t) * 10) / 10), tt: ph === 'draw' ? TD : ph === 'choose' ? CH_T : REV_T, sc: score, got, feed: feed.slice(-14), dv };
          if (ph === 'choose' && me === dr) v.ch = choices.map(i => kid ? ITEMS[i] : { w: WORDS[i].w });
          if (ph === 'draw' || ph === 'rev') v.d = d;
          if (ph === 'draw' && kid) v.ko = kidOpts.map(i => ({ i, ...ITEMS[i] }));
          if (ph === 'draw' && !kid) v.hint = [...WORDS[word].w].map((c, i) => hint[i] ? c : '');
          if (word != null && (ph === 'rev' || me === dr || (me && got.includes(me)))) v.word = kid ? ITEMS[word] : { w: WORDS[word].w };
          if (ph === 'rev') v.add = add;
          if (me && cool[me] && cool[me] > t && kid) v.cd = Math.round((cool[me] - t) * 10) / 10;
          return v;
        },
        results() {
          return { rows: ids.map(id => ({ id, key: score[id], line: `${score[id]} 分 · 猜對 ${gotN[id]} 次` })) };
        }
      };
    },

    client(root, api) {
      if (!document.getElementById('gs-style')) { const st = document.createElement('style'); st.id = 'gs-style'; st.textContent = CSS; document.head.appendChild(st); }
      const kid = api.kid, me = api.me, tv = api.isTable;
      root.innerHTML = `<div class="gs ${kid ? 'gs-kid' : ''} ${tv ? 'gs-tv' : ''}">
        <div class="gs-top"><span class="gs-who"></span><span class="gs-word"></span><span class="gs-tm"></span></div>
        <div class="gs-bar"><i></i></div>
        <div class="gs-body"><div class="gs-cwrap"><canvas class="gs-cv"></canvas><div class="gs-cov"></div></div><div class="gs-side"></div></div>
      </div>`;
      const Q = s => root.querySelector(s);
      const wrap = Q('.gs'), elWho = Q('.gs-who'), elWord = Q('.gs-word'), elTm = Q('.gs-tm'), elBar = Q('.gs-bar i'), cv = Q('.gs-cv'), cw = Q('.gs-cwrap'), elCov = Q('.gs-cov'), elSide = Q('.gs-side');
      const P = id => api.player(id) || { name: '?', col: 0, animal: 0 };
      const set = (el, key, html) => { if (!el || el._k === key) return false; el._k = key; el.innerHTML = html; return true; };
      let V = null, tEnd = 0, raf = 0, lastDv = -1, painted = '', mode = '', lastTi = -1, lastTick = -1;
      // drawer state
      let strokes = [], cur = null, pid = null, pts = 0, col = (kid ? PAL_KID : PAL_ADULT)[0], wi = 1, eraser = false, sendT = 0, dirty = false;
      const fit = () => {
        const w = cw.clientWidth, h = cw.clientHeight; if (!w || !h) return;
        sizeCanvas(cv, Math.min(w, h) - 4); painted = ''; redraw();
      };
      const ro = new ResizeObserver(() => { wrap.classList.toggle('gs-wide', root.clientWidth > root.clientHeight * 1.1); fit(); });
      ro.observe(root); ro.observe(cw);
      function redraw() {
        if (!V) return;
        const drawing = V.ph === 'draw' && V.dr === me;
        const d = drawing ? strokes : (V.d || []);
        const key = drawing ? 'me' + strokes.length + ':' + pts : V.dv + ':' + cv.width;
        if (painted === key && !drawing) return;
        painted = key; paint(cv, d);
      }
      const pos = e => { const r = cv.getBoundingClientRect(); return [cl(Math.round((e.clientX - r.left) / r.width * 1000), 0, 1000), cl(Math.round((e.clientY - r.top) / r.height * 1000), 0, 1000)]; };
      const widths = kid ? W_KID : W_ADULT;
      function flush(force) {
        const t = performance.now();
        if (!dirty || (!force && t - sendT < 220)) return;
        sendT = t; dirty = false; api.send({ d: strokes });
      }
      if (me) {
        cv.addEventListener('pointerdown', e => {
          if (!V || V.ph !== 'draw' || V.dr !== me || cur) return;
          e.preventDefault();
          if (pts >= MAXPTS || strokes.length >= MAXSTROKES) { api.toast('墨水用完了！'); return; }
          try { cv.setPointerCapture(e.pointerId); } catch (er) { }
          pid = e.pointerId;
          const [x, y] = pos(e), w = eraser ? Math.min(96, Math.round(widths[wi] * 1.8)) : widths[wi];
          cur = [eraser ? 0 : col, w, x, y]; strokes.push(cur); pts++;
          const g = cv.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round'; strokeOn(g, cur, 1, cv.width / 1000);
          dirty = true; flush(); tools();
        });
        const move = e => {
          if (!cur || e.pointerId !== pid) return;
          const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
          const from = (cur.length - 2) / 2 - 1;
          for (const ev of (evs.length ? evs : [e])) {
            if (pts >= MAXPTS) break;
            const [x, y] = pos(ev), lx = cur[cur.length - 2], ly = cur[cur.length - 1];
            if (Math.hypot(x - lx, y - ly) >= 7) { cur.push(x, y); pts++; }
          }
          const np = (cur.length - 2) / 2;
          if (np - 1 > from) { const g = cv.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round'; strokeOn(g, cur, np, cv.width / 1000, from); }
          dirty = true; flush();
        };
        const up = e => { if (!cur || e.pointerId !== pid) return; cur = null; pid = null; dirty = true; flush(true); };
        cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      }
      function tools() {
        elSide.querySelectorAll('.gs-col').forEach(b => b.classList.toggle('on', !eraser && +b.dataset.c === col));
        elSide.querySelectorAll('.gs-sz').forEach(b => { b.classList.toggle('on', +b.dataset.w === wi); b.querySelector('i').style.background = eraser ? '#c9cfe0' : PAL[col]; });
        const er = elSide.querySelector('[data-er]'); if (er) er.classList.toggle('on', eraser);
      }
      function loop() {
        raf = requestAnimationFrame(loop);
        if (!V) return;
        const left = Math.max(0, tEnd - performance.now() / 1000);
        elBar.style.transform = `scaleX(${cl(left / V.tt, 0, 1)})`;
        elBar.classList.toggle('low', V.ph === 'draw' && left < 10);
        elTm.textContent = V.ph === 'end' ? '' : Math.ceil(left) + ' 秒';
        const s = Math.ceil(left);
        if (V.ph === 'draw' && s <= 5 && s > 0 && s !== lastTick) { lastTick = s; api.sfx('tick'); }
        if (dirty) flush();
      }
      raf = requestAnimationFrame(loop);

      const itemHTML = it => `<span class="gs-ie">${it.e}</span><span class="gs-iw">${esc(it.w)}</span>`;
      function feedHTML(v) {
        return v.feed.slice().reverse().map(f => {
          if (f.sys) return `<div class="gs-f sys">${esc(f.sys)}</div>`;
          const nm = esc(P(f.id).name) + (f.id === me ? '（你）' : '');
          if (f.ok) return `<div class="gs-f ok"><img alt="" src="${api.avatar(P(f.id), 48)}">${nm} 猜對了！🎉</div>`;
          if (f.i != null) { const it = ITEMS[f.i]; return `<div class="gs-f"><img alt="" src="${api.avatar(P(f.id), 48)}">${nm}：${it ? it.e : '?'} ❌</div>`; }
          return `<div class="gs-f"><img alt="" src="${api.avatar(P(f.id), 48)}"><b>${nm}</b>　${esc(f.t)}</div>`;
        }).join('') || `<div class="gs-f sys">${kid ? '猜猜看是什麼？' : '在下面輸入你的猜測'}</div>`;
      }
      function scoreHTML(v) {
        const ids = api.players().map(p => p.id).sort((a, b) => (v.sc[b] || 0) - (v.sc[a] || 0));
        return `<div class="gs-sc">${ids.map(id => `<span class="${id === v.dr ? 'dr' : ''} ${v.got.includes(id) ? 'got' : ''}"><img alt="" src="${api.avatar(P(id), 48)}">${v.sc[id] || 0}${v.ph === 'rev' && v.add && v.add[id] ? `<em>+${v.add[id]}</em>` : ''}</span>`).join('')}</div>`;
      }

      function draw() {
        const v = V;
        tEnd = performance.now() / 1000 + v.tl;
        if (v.ti !== lastTi) { lastTi = v.ti; strokes = []; pts = 0; cur = null; eraser = false; painted = ''; }
        const drawer = v.dr === me;
        elWho.innerHTML = v.ph === 'end' ? '' : `<img alt="" src="${api.avatar(P(v.dr), 48)}">${drawer ? '你畫' : esc(P(v.dr).name) + ' 畫'}<small>${v.ti + 1}/${v.tn}</small>`;
        let wd = '';
        if (v.word) wd = kid ? `${v.word.e} ${esc(v.word.w)}` : esc(v.word.w);
        else if (v.hint) wd = v.hint.map(c => `<i>${c ? esc(c) : '＿'}</i>`).join('') + `<small>${v.hint.length} 個字</small>`;
        else if (v.ph === 'draw' && kid) wd = '❓ 猜猜看';
        else if (v.ph === 'choose') wd = drawer ? '挑一個來畫' : '選題中…';
        set(elWord, wd, wd);
        // canvas cover
        let cov = '';
        if (v.ph === 'choose') {
          cov = drawer ? `<div class="gs-pickw"><b>選一個來畫 ✏️</b>${v.ch.map((c, i) => `<button class="gs-w" data-w="${i}">${kid ? itemHTML(c) : esc(c.w)}</button>`).join('')}</div>`
            : `<div class="gs-wait"><img alt="" src="${api.avatar(P(v.dr), 128)}"><b>${esc(P(v.dr).name)} 正在選題目…</b></div>`;
        } else if (v.ph === 'rev') cov = `<div class="gs-rev"><small>答案是</small><b>${v.word ? (kid ? itemHTML(v.word) : esc(v.word.w)) : ''}</b><span>${v.got.length ? `${v.got.length} 人猜對` : '沒有人猜到 😅'}</span></div>`;
        else if (v.ph === 'end') cov = `<div class="gs-rev"><b>🏁 畫完了！</b></div>`;
        if (set(elCov, cov + v.ti + v.ph, cov)) {
          elCov.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { api.send({ w: +b.dataset.w }); api.sfx('pop'); });
        }
        elCov.hidden = !cov;
        // side panel
        const m2 = v.ph === 'draw' ? (drawer ? 'tools' : !me ? 'feed' : kid ? 'pick' : 'type') : 'feed';
        if (m2 !== mode || (m2 === 'pick' && elSide._ti !== v.ti)) {
          mode = m2; elSide._ti = v.ti;
          if (m2 === 'tools') {
            const cols = kid ? PAL_KID : PAL_ADULT;
            elSide.innerHTML = `<div class="gs-tools"><div class="gs-cols">${cols.map(c => `<button class="gs-col" data-c="${c}" style="--c:${PAL[c]}" aria-label="顏色"></button>`).join('')}</div>
              <div class="gs-tl2">${widths.map((w, i) => `<button class="gs-sz" data-w="${i}" aria-label="筆刷"><i style="--d:${[8, 15, 24][i]}px"></i></button>`).join('')}
              <button class="gs-tb" data-er aria-label="橡皮擦">🧽</button><button class="gs-tb" data-undo aria-label="上一步">↩️</button><button class="gs-tb" data-clr aria-label="全部清掉">🗑️</button><button class="gs-tb" data-skip aria-label="跳過">⏭️</button></div></div><div class="gs-feed"></div>`;
            elSide.querySelectorAll('.gs-col').forEach(b => b.onclick = () => { col = +b.dataset.c; eraser = false; api.sfx('pop'); tools(); });
            elSide.querySelectorAll('.gs-sz').forEach(b => b.onclick = () => { wi = +b.dataset.w; api.sfx('tick'); tools(); });
            elSide.querySelector('[data-er]').onclick = () => { eraser = !eraser; api.sfx('pop'); tools(); };
            elSide.querySelector('[data-undo]').onclick = () => { if (cur || !strokes.length) return; strokes.pop(); pts = nPts(strokes); painted = ''; redraw(); dirty = true; flush(true); api.sfx('flip'); };
            elSide.querySelector('[data-clr]').onclick = () => { if (cur || !strokes.length) return; strokes = []; pts = 0; painted = ''; redraw(); dirty = true; flush(true); api.sfx('whoosh'); };
            elSide.querySelector('[data-skip]').onclick = () => { if (confirm('跳過這一題？')) api.send({ skip: 1 }); };
            tools();
          } else if (m2 === 'pick') {
            elSide.innerHTML = `<div class="gs-ko">${v.ko.map(it => `<button class="gs-k" data-p="${it.i}">${itemHTML(it)}</button>`).join('')}</div><div class="gs-feed"></div>`;
            elSide.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { if (!V || V.got.includes(me) || V.cd) return; api.send({ p: +b.dataset.p }); api.sfx('pop'); api.vibrate(20); });
          } else if (m2 === 'type') {
            elSide.innerHTML = `<form class="gs-in"><input class="txt" maxlength="16" placeholder="猜猜看是什麼？" autocomplete="off" enterkeyhint="send"><button class="btn acc">送出</button></form><div class="gs-feed"></div>`;
            const f = elSide.querySelector('form'), inp = f.querySelector('input');
            f.onsubmit = e => { e.preventDefault(); const t = inp.value.trim(); if (!t) return; api.send({ g: t }); inp.value = ''; api.sfx('pop'); };
          } else elSide.innerHTML = `<div class="gs-feed"></div>`;
        }
        const fd = elSide.querySelector('.gs-feed');
        set(fd, JSON.stringify([v.feed, v.sc, v.got, v.ph]), scoreHTML(v) + `<div class="gs-fl">${feedHTML(v)}</div>`);
        if (m2 === 'type') { const f = elSide.querySelector('form'); const g = v.got.includes(me); f.classList.toggle('done', g); f.querySelector('input').disabled = g; f.querySelector('input').placeholder = g ? '你猜對了！等其他人 🎉' : '猜猜看是什麼？'; }
        if (m2 === 'pick') {
          const g = v.got.includes(me);
          elSide.querySelectorAll('[data-p]').forEach(b => { b.disabled = g || !!v.cd; b.classList.toggle('ok', g && v.word && +b.dataset.p === ITEMS.findIndex(x => x.w === v.word.w)); });
          elSide.querySelector('.gs-ko').classList.toggle('cd', !!v.cd);
        }
        if (v.ph === 'draw' && v.dr === me && lastDv !== v.ti) { lastDv = v.ti; api.vibrate(40); }
        redraw();
      }
      return { view(v) { if (!v) return; V = v; draw(); }, destroy() { cancelAnimationFrame(raf); ro.disconnect(); } };
    },

    bot(v, api) {
      const me = api.me; if (!v || !me) return;
      if (v.ph === 'choose' && v.dr === me && v.ch && Math.random() < 0.5) api.send({ w: rint(3) });
      if (v.ph === 'draw' && v.dr === me && Math.random() < 0.3) api.send({ d: botDraw(v.d) });
      if (v.ph === 'draw' && v.dr !== me && !v.got.includes(me) && Math.random() < 0.15) {
        if (api.kid) { if (!v.cd && v.ko) api.send({ p: v.ko[rint(v.ko.length)].i }); }
        else api.send({ g: Math.random() < 0.25 && v.hint ? '?' : BOT_G[rint(BOT_G.length)] });
      }
    }
  });

  const CSS = `
.gs{position:absolute;inset:0;display:flex;flex-direction:column;gap:6px;padding:8px 10px calc(10px + env(safe-area-inset-bottom,0px));background:linear-gradient(180deg,#eaf3ff,#f6f0ff);font-family:var(--sans);overflow:hidden}
.gs-top{display:flex;gap:6px;align-items:center}
.gs-who{display:flex;align-items:center;gap:4px;background:#fff;border-radius:999px;padding:3px 10px 3px 4px;font-weight:900;font-size:13.5px;box-shadow:0 2px 0 var(--line);white-space:nowrap}
.gs-who:empty{display:none}
.gs-who img{width:26px;height:26px}.gs-who small{color:var(--mute);margin-left:4px;font-size:11px}
.gs-word{flex:1;min-width:0;text-align:center;font-weight:900;font-size:19px;letter-spacing:.06em;color:var(--prid);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gs-word i{font-style:normal;display:inline-block;min-width:1.1em;border-bottom:3px solid var(--pri);margin:0 2px;line-height:1.1}
.gs-word small{font-size:11px;color:var(--mute);margin-left:6px;letter-spacing:0}
.gs-tm{background:#fff;border-radius:999px;padding:4px 10px;font-family:var(--round);font-weight:700;box-shadow:0 2px 0 var(--line);min-width:58px;text-align:center}
.gs-bar{height:6px;border-radius:9px;background:rgba(20,40,80,.1);overflow:hidden}.gs-bar i{display:block;height:100%;background:#2f8cff;transform-origin:left}.gs-bar i.low{background:#ef4444}
.gs-body{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px}
.gs-cwrap{position:relative;flex:1 1 60%;min-height:0;display:flex;align-items:center;justify-content:center}
.gs-cv{background:#fff;border-radius:18px;box-shadow:0 4px 0 var(--line),0 8px 24px rgba(40,60,120,.1);touch-action:none;display:block}
.gs-cov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:10px}
.gs-pickw,.gs-wait,.gs-rev{background:#fff;border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:10px;align-items:center;box-shadow:0 10px 30px rgba(40,60,120,.2);max-width:320px;width:100%;text-align:center}
.gs-w{background:#f1f5ff;border-radius:16px;padding:12px;font-weight:900;font-size:22px;width:100%;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 3px 0 var(--line)}
.gs-ie{font-size:34px;line-height:1}.gs-iw{font-weight:900}
.gs-wait img{width:72px;height:72px}
.gs-rev{animation:gsPop .35s}.gs-rev small{color:var(--mute);font-weight:700}.gs-rev b{font-size:30px;display:flex;align-items:center;gap:8px}.gs-rev .gs-ie{font-size:52px}.gs-rev span{font-weight:700;color:var(--mute)}
.gs-side{flex:0 0 auto;display:flex;flex-direction:column;gap:6px;min-height:0;max-height:44%}
.gs-tools{display:flex;flex-direction:column;gap:6px}
.gs-cols{display:flex;gap:5px;justify-content:center;flex-wrap:wrap}
.gs-col{width:32px;height:32px;border-radius:50%;background:var(--c);box-shadow:0 2px 0 rgba(0,0,0,.15);border:3px solid #fff}
.gs-col.on{outline:3px solid var(--ink);transform:scale(1.1)}
.gs-tl2{display:flex;gap:5px;justify-content:center}
.gs-sz,.gs-tb{width:40px;height:40px;border-radius:12px;background:#fff;box-shadow:0 2px 0 var(--line);display:grid;place-items:center;font-size:18px}
.gs-sz i{width:var(--d);height:var(--d);border-radius:50%;display:block}
.gs-sz.on,.gs-tb.on{background:#eef0ff;outline:2px solid var(--pri)}
.gs-feed{display:flex;flex-direction:column;gap:5px;min-height:0;flex:1}
.gs-sc{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.gs-sc span{position:relative;display:flex;align-items:center;gap:3px;background:#fff;border-radius:999px;padding:2px 8px 2px 2px;font-family:var(--round);font-weight:700;font-size:13px;box-shadow:0 2px 0 var(--line)}
.gs-sc span.dr{box-shadow:0 0 0 2px #2f8cff}.gs-sc span.got{background:#dcfce7}
.gs-sc img{width:22px;height:22px}.gs-sc em{position:absolute;right:-6px;top:-10px;background:#22c26a;color:#fff;border-radius:999px;font-style:normal;font-size:10px;padding:0 5px}
.gs-fl{overflow:auto;display:flex;flex-direction:column;gap:3px;min-height:0;max-height:120px}
.gs-f{display:flex;align-items:center;gap:5px;font-size:13.5px;background:rgba(255,255,255,.75);border-radius:10px;padding:2px 8px 2px 3px}
.gs-f img{width:20px;height:20px}.gs-f.ok{background:#dcfce7;font-weight:900;color:#12924f}.gs-f.sys{justify-content:center;color:var(--mute);font-weight:700;padding:3px}
.gs-in{display:flex;gap:6px}.gs-in .txt{font-size:18px;padding:8px 10px}.gs-in .btn{min-height:46px;padding:8px 14px;flex:none}
.gs-in.done .txt{background:#dcfce7;border-color:#22c26a}
.gs-ko{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.gs-k{background:#fff;border-radius:14px;padding:6px 4px;display:flex;flex-direction:column;align-items:center;box-shadow:0 3px 0 var(--line);border:3px solid transparent}
.gs-k .gs-ie{font-size:30px}.gs-k .gs-iw{font-size:13px}
.gs-k:disabled{opacity:.5}.gs-k.ok{opacity:1;border-color:#22c26a;background:#dcfce7}
.gs-ko.cd{animation:gsShake .3s}
.gs-wide .gs-body{flex-direction:row}
.gs-wide .gs-cwrap{flex:1 1 auto}
.gs-wide .gs-side{width:min(44%,380px);max-height:none;flex:none}
.gs-wide .gs-fl{max-height:none}
.gs-tv .gs-word{font-size:36px}.gs-tv .gs-f{font-size:20px}.gs-tv .gs-sc span{font-size:20px}.gs-tv .gs-sc img{width:36px;height:36px}
@media (max-height:460px){.gs{gap:4px;padding-top:4px}.gs-col{width:26px;height:26px}.gs-sz,.gs-tb{width:34px;height:34px}.gs-k .gs-ie{font-size:24px}.gs-w{padding:6px;font-size:18px}.gs-pickw{gap:6px;padding:10px}.gs-rev b{font-size:24px}}
@keyframes gsPop{0%{transform:scale(.7);opacity:0}100%{transform:scale(1)}}
@keyframes gsShake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
`;
})();
