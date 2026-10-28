'use strict';
/* 傳畫接龍 · draw-and-guess telephone. Every player starts a chain; the chains pass from phone to phone:
   write → draw → guess → draw → … Everyone works at the same time on a different chain and only ever sees the
   one thing handed to them. At the end the chains are revealed step by step on every screen (drawings replayed).
   Kid mode: pick a picture prompt, guess by picking 1 of 6 pictures — no typing at all.
   Entries: { by, t:'t' text | 'i' kid item index | 'd' drawing, v, f?: 'auto' system prompt | 'time' | 'off' }
   Drawing: [[colour, width, x0,y0, x1,y1, …], …] in a 1000×1000 square, whole numbers, ≤ MAXPTS points.
   Messages: {sub:1,k,t|i|d,tm?} submit this step · {nx:[rc,rs]} next reveal step · {ht:[c,s]} toggle ❤️ · {end:1} */
(() => {
  /* ---------- kid picture bank (emoji + word) ---------- */
  const KID_RAW = `🐶小狗 🐱小貓 🐰兔子 🐻熊 🐼熊貓 🐷小豬 🐮乳牛 🐸青蛙 🐵猴子 🦁獅子 🐯老虎 🐘大象 🦒長頸鹿 🐧企鵝 🐔公雞 🦆鴨子
🐟小魚 🐳鯨魚 🐙章魚 🦀螃蟹 🐢烏龜 🐍蛇 🦋蝴蝶 🐝蜜蜂 🐞瓢蟲 🐌蝸牛 🦖恐龍 🦄獨角獸 🐭老鼠 🦉貓頭鷹 🦈鯊魚 🐬海豚
🍎蘋果 🍌香蕉 🍉西瓜 🍇葡萄 🍓草莓 🍊橘子 🍍鳳梨 🍒櫻桃 🥕紅蘿蔔 🌽玉米 🍄香菇 🍕披薩 🍔漢堡 🍟薯條 🍦冰淇淋 🍰蛋糕
🍩甜甜圈 🍭棒棒糖 🍪餅乾 🥚雞蛋 🍙飯糰 🧋珍珠奶茶 🍉西瓜汁 🚗汽車 🚌公車 🚂火車 ✈️飛機 🚀火箭 🚲腳踏車 🚢大船 🚁直升機
🚒消防車 ⚽足球 🏀籃球 🎈氣球 🪁風箏 🎁禮物 🧸玩偶熊 🕯️蠟燭 ☀️太陽 🌙月亮 ⭐星星 ☁️雲朵 🌈彩虹 ❄️雪花 ⛄雪人 🌧️下雨
⚡閃電 🌳大樹 🌵仙人掌 🌻向日葵 🌷鬱金香 🍀幸運草 🏠房子 🏰城堡 ⛺帳篷 🏖️海灘 🌋火山 👑皇冠 👓眼鏡 👟球鞋 🧦襪子 👕衣服
🎩帽子 ☂️雨傘 ⏰鬧鐘 📱手機 📺電視 💡燈泡 🔑鑰匙 ✏️鉛筆 📚書本 ✂️剪刀 🪥牙刷 🛁浴缸 🎸吉他 🥁鼓 🔔鈴鐺 👻小鬼
🤖機器人 👽外星人 ❤️愛心 🦷牙齒 👀眼睛 ✋手掌 🐛毛毛蟲 🦔刺蝟 🐨無尾熊 🐊鱷魚`;
  const parseKid = s => { const m = s.match(/^([^㐀-鿿]+)(.+)$/); return m ? { e: m[1], w: m[2] } : { e: '❓', w: s }; };
  const ITEMS = [];
  for (const it of KID_RAW.split(/\s+/).filter(Boolean).map(parseKid)) if (!ITEMS.some(x => x.w === it.w || x.e === it.e)) ITEMS.push(it);

  /* ---------- adult prompt bank (「給我靈感」) ---------- */
  const IDEAS = `貓咪在開會 阿公在跳街舞 外星人在排隊買雞排 恐龍搭捷運 熊貓在健身房舉重 企鵝去墾丁衝浪 老闆在溜滑梯 珍奶做的游泳池
機器人在掃地 鯊魚在吃火鍋 夜市套圈圈套到老虎 颱風天吃泡麵 半夜冰箱在發光 狗狗在當新聞主播 蝸牛參加馬拉松 媽媽變成超人
香蕉在講電話 小籠包在做瑜珈 乳牛騎機車 月亮掉進湯裡 雪人在曬太陽 便利商店裡的鬼 外送員飛上天 長頸鹿卡在電梯裡
金魚在看電視 爸爸在追垃圾車 青蛙在唱KTV 鴨子排隊買蛋塔 大象坐垮沙發 烏龜開跑車 章魚在打鼓 老虎在刷牙 雞排比臉還大
阿嬤在打電動 鬧鐘長腳逃跑了 西瓜當安全帽 兔子在包水餃 熊冬眠在打呼 頭上長了一棵樹 機車載了一台冰箱 吸血鬼怕大蒜
貓咪統治地球 熱氣球載著一隻豬 魚在天上飛 狗在遛主人 雲朵下起珍珠 上課偷睡覺被抓 老師變成章魚 鳳梨在吃披薩
火山噴出爆米花 太陽戴墨鏡 海豚在跳火圈 猴子偷了手機 椅子長出腳跑掉 開會開到睡著 加班的貓頭鷹 臭豆腐在約會
在月球上放風箏 獅子在剪頭髮 機器人談戀愛 蟑螂突然飛起來 被蚊子叮滿頭包 排隊排到天荒地老 拔河拔到繩子斷掉 跨年看煙火
中秋節在烤肉 端午節划龍舟 過年發紅包 夜市撈金魚 颱風假在家耍廢 健身教練偷吃炸雞 鬼屋裡的鬼在滑手機 外星人來綁架乳牛
高鐵上的企鵝 釣魚釣到一隻靴子 河馬在泡溫泉 鱷魚當牙醫 魔術師變出一隻兔子 打噴嚏噴出火 樹上長滿了錢 存錢筒在減肥
吃到超酸的檸檬 被貓咪無視 老鼠在偷起司 斑馬在走斑馬線 熊貓在吃竹筍麵 會打拳擊的袋鼠 無尾熊抱著電線桿 狐狸在算錢
貓咪坐在鍵盤上 狗狗咬爛拖鞋 襪子又少了一隻 冰淇淋融化了 漢堡太高咬不下去 被蜜蜂追著跑 稻草人在跳舞 蝴蝶在等公車
機器人在煎荷包蛋 螃蟹橫著過馬路 電梯裡遇到一隻熊 下班衝去搶便當 一群鴿子在開會 跳傘的小豬 會飛的腳踏車 被鬧鐘吵醒很生氣
鯨魚在噴泉洗澡 外婆在騎重機 爺爺在玩滑板 海盜在找寶藏 小偷偷走了月亮 恐龍在吃麻辣燙 巫婆騎掃把塞車 鬼在怕鬼
在雨中跳舞的鴨子 超市裡迷路的企鵝 手機掉進馬桶 頭髮被風吹翻了 刺蝟想要抱抱 披著棉被的超人`;
  const IDEA = IDEAS.split(/\s+/).filter(Boolean);
  const BOT_GUESS = ['一隻貓', '外星人', '好像是房子', '火山爆發', '跳舞的人', '一碗麵', '恐龍？', '下雨天', '我不知道', '香蕉', '一台車', '太陽在笑', '大便', '怪獸', '一棵樹', '飛機', '有人在哭', '一顆球'];

  const MAXC = 20, MAXPTS = 1600, MAXSTROKES = 240;
  const PAL = ['#ffffff', '#1f2346', '#ef4444', '#ff8a1f', '#ffd21f', '#22c26a', '#2f8cff', '#9b5cff', '#ff6fb7', '#8b5a2b', '#9aa3b5'];
  const PAL_KID = [1, 2, 3, 4, 5, 6, 7, 8], PAL_ADULT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const W_KID = [16, 30, 52], W_ADULT = [6, 14, 30];
  const KIND_IC = { write: '✍️', draw: '🎨', guess: '💬' };
  const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim();
  const cut = s => [...s].slice(0, MAXC).join('');
  const kindOf = k => k === 0 ? 'write' : k % 2 ? 'draw' : 'guess';
  const nPts = d => d.reduce((a, s) => a + (s.length - 2) / 2, 0);

  function cleanDraw(d) {
    if (!Array.isArray(d)) return [];
    const out = []; let pts = 0;
    for (const s of d.slice(0, MAXSTROKES)) {
      if (!Array.isArray(s) || s.length < 4) continue;
      const c = s[0] | 0, w = s[1] | 0;
      if (c < 0 || c >= PAL.length || w < 2 || w > 96) continue;
      const a = [c, w];
      for (let i = 2; i + 1 < s.length && pts < MAXPTS; i += 2) { a.push(clamp(Math.round(+s[i] || 0), 0, 1000), clamp(Math.round(+s[i + 1] || 0), 0, 1000)); pts++; }
      if (a.length >= 4) out.push(a);
      if (pts >= MAXPTS) break;
    }
    return out;
  }
  /* Ramer–Douglas–Peucker on a flat [x,y,x,y…] list */
  function simplify(a, eps) {
    const n = a.length / 2; if (n < 3) return a;
    const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
    const st = [[0, n - 1]];
    while (st.length) {
      const [i, j] = st.pop(); let md = 0, mi = -1;
      const ax = a[i * 2], ay = a[i * 2 + 1], bx = a[j * 2], by = a[j * 2 + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
      for (let q = i + 1; q < j; q++) {
        const px = a[q * 2], py = a[q * 2 + 1];
        const d = L < 1e-6 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * px - dx * py + bx * ay - by * ax) / L;
        if (d > md) { md = d; mi = q; }
      }
      if (md > eps && mi > 0) { keep[mi] = 1; st.push([i, mi], [mi, j]); }
    }
    const out = []; for (let q = 0; q < n; q++) if (keep[q]) out.push(a[q * 2], a[q * 2 + 1]); return out;
  }
  function botDraw() {
    const d = [], ns = 2 + rint(4);
    for (let s = 0; s < ns; s++) {
      const st = [1 + rint(8), [6, 14, 30][rint(3)]]; let x = 200 + rint(600), y = 200 + rint(600), a = Math.random() * 7;
      const np = 6 + rint(18);
      for (let i = 0; i < np; i++) { st.push(Math.round(x), Math.round(y)); a += rnd(-0.8, 0.8); x = clamp(x + Math.cos(a) * 45, 20, 980); y = clamp(y + Math.sin(a) * 45, 20, 980); }
      d.push(st);
    }
    return d;
  }

  /* ---------- painting (shared by the pad, guess screen and reveal) ---------- */
  function sizeCanvas(cv, px) {
    px = Math.max(40, Math.floor(px));
    const r = Math.min(2, window.devicePixelRatio || 1), W = Math.round(px * r);
    if (cv.width !== W) { cv.width = W; cv.height = W; }
    cv.style.width = cv.style.height = px + 'px';
  }
  function strokeOn(g, s, m, sc) {
    const w = s[1] * sc; g.strokeStyle = g.fillStyle = PAL[s[0]] || '#000';
    if (m <= 1) { g.beginPath(); g.arc(s[2] * sc, s[3] * sc, w / 2, 0, 7); g.fill(); return; }
    g.lineWidth = w; g.beginPath(); g.moveTo(s[2] * sc, s[3] * sc);
    for (let i = 1; i < m; i++) g.lineTo(s[2 + i * 2] * sc, s[3 + i * 2] * sc);
    g.stroke();
  }
  function paint(cv, d, frac) {
    const g = cv.getContext('2d'), W = cv.width, sc = W / 1000;
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, W);
    g.lineCap = 'round'; g.lineJoin = 'round';
    let budget = frac == null || frac >= 1 ? Infinity : Math.floor(nPts(d) * frac);
    for (const s of d || []) {
      if (budget <= 0) break;
      const np = (s.length - 2) / 2, m = Math.min(np, budget); budget -= np;
      strokeOn(g, s, m, sc);
    }
  }

  LGAMES.push({
    id: 'telephone', name: '傳畫接龍', icon: '🎨', col: '#ff7a45', cat: 'party',
    blurb: '畫畫傳下去、猜猜傳下去，最後一起看歪成什麼樣', players: [3, 6],
    opts: kid => [{ k: 'draw', n: '畫畫時間', o: kid ? [[60, '60 秒'], [90, '90 秒'], [120, '120 秒']] : [[45, '45 秒'], [70, '70 秒'], [100, '100 秒']], d: kid ? 90 : 70 }],
    rules: kid => kid ? [
      '先選一張圖，偷偷不要說出來 🤫',
      '手機會傳給下一個人：把看到的東西用手指畫出來 🎨',
      '再下一個人看圖，從 6 張圖裡選出他覺得是什麼',
      '最後大家一起看：傳到最後還是一樣嗎？🎉'
    ] : [
      '每人先寫一個題目（20 字內，或按「給我靈感」）',
      '題目傳給下一位畫出來，再下一位只看圖猜文字，畫／猜輪流接下去',
      '大家同時進行，每一步都有時間限制，時間到就直接送出',
      '最後一串一串揭曉，看題目怎麼走歪；喜歡的步驟按 ❤️，選出最受歡迎'
    ],

    host(ctx) {
      const kid = ctx.kid, ids = ctx.players.map(p => p.id), n = ids.length, now = () => ctx.now();
      const S = n === 3 ? 5 : n;                                   // 3 players: one extra draw/guess loop
      const TM = kid ? { write: 25, draw: 90, guess: 40 } : { write: 40, draw: 70, guess: 35 };
      if (ctx.opt && ctx.opt.draw) TM.draw = ctx.opt.draw;
      const GRACE = 3, PASS = 1.8, IDLE = 45;
      const chains = ids.map(() => []);
      const chainOf = (id, k) => ((ids.indexOf(id) - k) % n + n) % n;     // chain this player works on at step k
      let ph = 'step', k = 0, tm = TM.write, T = now() + tm, over = false;
      const offT = {}, choices = {}, opts = {};
      if (kid) { const pool = shuffle(ITEMS.map((_, i) => i)); ids.forEach((id, j) => { choices[id] = pool.slice(j * 3, j * 3 + 3); }); }
      let rc = 0, rs = 0, lastAdv = 0, hearts = null, best = null;
      const push = () => ctx.push();
      const entryOf = (id, kk) => chains[chainOf(id, kk == null ? k : kk)][kk == null ? k : kk];
      const has = id => !!entryOf(id);
      const leadId = () => { try { const l = Host.leader(); return l ? l.id : null; } catch (e) { return null; } };
      const canAdv = id => { if (!id) return false; const l = leadId(); return id === ids[rc] || id === l || !ids.includes(l); };
      const lastGuess = () => { let g = S - 1; if (kindOf(g) !== 'guess') g--; return g; };
      const success = c => kid && S >= 3 && chains[c][lastGuess()] && chains[c][0] && chains[c][lastGuess()].v === chains[c][0].v;

      function put(id, e) {
        const c = chainOf(id, k); if (chains[c][k]) return false;
        chains[c][k] = Object.assign({ by: id }, e); return true;
      }
      function fill(id, f) {
        const kind = kindOf(k), c = chainOf(id, k);
        if (kind === 'write') put(id, kid ? { t: 'i', v: choices[id][rint(3)], f } : { t: 't', v: IDEA[rint(IDEA.length)], f: f === 'off' ? 'off' : 'auto' });
        else if (kind === 'draw') put(id, { t: 'd', v: [], f });
        else put(id, kid ? { t: 'i', v: opts[c][rint(opts[c].length)], f } : { t: 't', v: '', f });
      }
      function startStep(k2) {
        k = k2; ph = 'step'; const kind = kindOf(k); tm = TM[kind]; T = now() + tm;
        if (kid && kind === 'guess') {
          for (let c = 0; c < n; c++) {
            const right = chains[c][k - 2].v, pool = shuffle(ITEMS.map((_, i) => i).filter(i => i !== right));
            opts[c] = shuffle([right].concat(pool.slice(0, 5)));
          }
        }
        ctx.sound('*', 'go'); push();
      }
      function endStep() {
        if (k + 1 >= S) return startReveal();
        ph = 'pass'; T = now() + PASS; ctx.sound('*', 'whoosh'); push();
      }
      function startReveal() {
        ph = 'reveal'; rc = 0; rs = 0; lastAdv = now();
        hearts = chains.map(ch => ch.map(() => new Set()));
        ctx.sound('*', 'star'); push();
      }
      function advance() {
        lastAdv = now();
        if (rs < S - 1) { rs++; ctx.sound('*', 'flip'); if (rs === S - 1 && success(rc)) ctx.sound('*', 'win'); }
        else if (rc < n - 1) { rc++; rs = 0; ctx.sound('*', 'whoosh'); }
        else return award();
        push();
      }
      function award() {
        ph = 'award'; T = now() + 30;
        let bh = 0, cand = [];
        hearts.forEach((row, c) => row.forEach((set, s) => {
          if (set.size > bh) { bh = set.size; cand = [[c, s]]; } else if (set.size === bh && bh > 0) cand.push([c, s]);
        }));
        if (!cand.length) chains.forEach((ch, c) => ch.forEach((e, s) => { if (e.t === 'd' && e.v.length) cand.push([c, s]); }));
        if (!cand.length) cand = [[0, 0]];
        const [c, s] = cand[rint(cand.length)];
        best = { c, s, h: bh, own: ids[c], e: chains[c][s] };
        ctx.sound('*', 'win'); push();
      }
      const heartsOf = id => { let h = 0; if (hearts) hearts.forEach((row, c) => row.forEach((set, s) => { if (chains[c][s].by === id) h += set.size; })); return h; };
      const pub = (e, c, s, me) => {
        const o = { by: e.by, t: e.t, v: e.v };
        if (e.f) o.f = e.f;
        if (hearts) { o.h = hearts[c][s].size; if (me && hearts[c][s].has(me)) o.m = 1; }
        if (kid && e.t === 'i' && kindOf(s) === 'guess' && chains[c][s - 2] && chains[c][s - 2].v === e.v) o.y = 1;
        return o;
      };

      return {
        get over() { return over; },
        tick() {
          const t = now();
          if (ph === 'step') {
            let ch = false;
            for (const id of ids) {
              if (has(id)) continue;
              if (!ctx.online(id)) { if (offT[id] == null) offT[id] = t; else if (t - offT[id] > 3) { fill(id, 'off'); ch = true; } }
              else offT[id] = null;
            }
            if (t >= T + GRACE) { ids.forEach(id => { if (!has(id)) { fill(id, 'time'); ch = true; } }); }
            if (ids.every(has)) endStep(); else if (ch) push();
          } else if (ph === 'pass') { if (t >= T) startStep(k + 1); }
          else if (ph === 'reveal') { if (t - lastAdv > IDLE) advance(); }
          else if (ph === 'award') { if (t >= T) over = true; }
        },
        msg(id, d) {
          if (!d || typeof d !== 'object' || !ids.includes(id)) return;
          if (d.sub && ph === 'step' && d.k === k && !has(id) && now() < T + GRACE) {
            const kind = kindOf(k), c = chainOf(id, k), f = d.tm ? 'time' : undefined;
            let e = null;
            if (kind === 'write') {
              if (kid) { const i = d.i | 0; if (!choices[id].includes(i)) return; e = { t: 'i', v: i }; }
              else { const s = cut(clean(d.t)); e = s ? { t: 't', v: s } : { t: 't', v: IDEA[rint(IDEA.length)], f: 'auto' }; }
            } else if (kind === 'draw') e = { t: 'd', v: cleanDraw(d.d), f };
            else if (kid) {
              if (d.i == null) e = { t: 'i', v: opts[c][rint(opts[c].length)], f: 'time' };
              else { const i = d.i | 0; if (!opts[c].includes(i)) return; e = { t: 'i', v: i }; }
            } else e = { t: 't', v: cut(clean(d.t)), f };
            if (e.f === undefined) delete e.f;
            if (put(id, e)) { ctx.sound(id, 'pop'); push(); }
            return;
          }
          if (d.nx && ph === 'reveal' && Array.isArray(d.nx) && d.nx[0] === rc && d.nx[1] === rs && canAdv(id) && now() - lastAdv > 0.8) { advance(); return; }
          if (d.ht && (ph === 'reveal') && Array.isArray(d.ht)) {
            const c = d.ht[0] | 0, s = d.ht[1] | 0;
            if (c !== rc || s < 0 || s > rs) return;
            const e = chains[c][s]; if (!e || e.by === id) return;
            const set = hearts[c][s];
            if (set.has(id)) set.delete(id); else { set.add(id); ctx.sound(e.by, 'coin'); }
            push(); return;
          }
          if (d.end && ph === 'award' && (id === leadId() || !ids.includes(leadId()))) over = true;
        },
        leave() { push(); },
        back(id) { offT[id] = null; push(); },
        view(id) {
          const me = id && ids.includes(id) ? id : null;
          const v = { ph, n, S, ids };
          if (ph === 'step' || ph === 'pass') {
            v.k = k; v.kind = kindOf(k);
            v.st = ids.map(x => { const e = entryOf(x); return e ? (e.f === 'off' ? 2 : 1) : (ctx.online(x) ? 0 : 3); });
            if (ph === 'pass') v.nk = kindOf(k + 1);
            else { v.tl = Math.max(0, Math.round((T - now()) * 10) / 10); v.tm = tm; }
            if (me && ph === 'step') {
              const e = entryOf(me); v.sub = e ? 1 : 0;
              if (!e) {
                const c = chainOf(me, k);
                if (v.kind === 'write') { if (kid) v.ch = choices[me]; }
                else {
                  const p = chains[c][k - 1];
                  v.fr = p.by;
                  if (v.kind === 'draw') { v.pr = { t: p.t, v: p.v }; if (p.f) v.pr.f = p.f; }
                  else { v.dr = p.v; if (p.f) v.df = p.f; if (kid) v.op = opts[c]; }
                }
              }
            }
          } else if (ph === 'reveal') {
            Object.assign(v, { rc, rs, own: ids[rc], can: canAdv(me) ? 1 : 0 });
            v.steps = chains[rc].slice(0, rs + 1).map((e, s) => pub(e, rc, s, me));
            if (kid && rs === S - 1 && success(rc)) v.ok = 1;
          } else if (ph === 'award') {
            v.best = Object.assign(pub(best.e, best.c, best.s, me), { c: best.c, s: best.s, own: best.own, hh: best.h });
            v.tot = ids.map(heartsOf);
            if (kid) v.ok = chains.filter((_, c) => success(c)).length;
            v.can = me && (me === leadId() || !ids.includes(leadId())) ? 1 : 0;
            v.tl = Math.max(0, Math.round(T - now()));
          }
          return v;
        },
        results() {
          const name = x => { const p = ctx.players.find(q => q.id === x); return p ? p.name : '?'; };
          const rows = ids.map(id => {
            let dr = 0; chains.forEach(ch => ch.forEach(e => { if (e.by === id && e.t === 'd' && e.v.length) dr++; }));
            const h = heartsOf(id);
            return { id, key: 1, line: `❤️ ${h} 個讚 · 畫了 ${dr} 張圖${best && best.h > 0 && best.e.by === id ? ' · 🏆 最受歡迎' : ''}` };
          });
          let sub = best && best.h > 0 ? `最受歡迎：${name(best.e.by)} 的${best.e.t === 'd' ? '畫' : best.e.t === 'i' ? '圖卡' : '那一句'}（❤️ ${best.h}）` : '大家都畫得好有創意！';
          if (kid) { const ok = chains.filter((_, c) => success(c)).length; sub += ok ? `　·　有 ${ok} 串傳成功了 🎉` : '　·　每一串都變成新東西了 😆'; }
          return { rows, noWinner: true, title: '笑翻了！🤣', sub };
        }
      };
    },

    client(root, api) {
      if (!document.getElementById('tp-style')) {
        const st = document.createElement('style'); st.id = 'tp-style'; st.textContent = CSS; document.head.appendChild(st);
      }
      const kid = api.kid, me = api.me, tv = api.isTable;
      root.innerHTML = `<div class="tp ${kid ? 'tp-kid' : ''} ${tv ? 'tp-tv' : ''} ${me ? '' : 'tp-pub'}">
        <div class="tp-top"><span class="tp-pill"></span><span class="tp-ph"></span><span class="tp-tm" hidden><b></b></span></div>
        <div class="tp-bar"><i></i></div>
        <div class="tp-body"></div>
        <div class="tp-ov" hidden></div>
      </div>`;
      const Q = s => root.querySelector(s);
      const wrap = Q('.tp'), elPill = Q('.tp-pill'), elPh = Q('.tp-ph'), elTm = Q('.tp-tm'), elBar = Q('.tp-bar i'), body = Q('.tp-body'), elOv = Q('.tp-ov');
      const P = id => api.player(id) || { name: '?', col: 0, animal: 0 };
      const av = (id, sz) => `<img alt="" src="${api.avatar(P(id), sz || 96)}">`;
      const set = (el, key, html) => { if (!el || el._k === key) return false; el._k = key; el.innerHTML = html; return true; };
      const itemHTML = i => { const it = ITEMS[i] || { e: '❓', w: '?' }; return `<span class="tp-ie">${it.e}</span><span class="tp-iw">${esc(it.w)}</span>`; };

      let V = null, scr = null, tEnd = 0, tTot = 0, sentK = -1, lastTick = -1, ovT = 0, lastOv = '', raf = 0;
      const ro = new ResizeObserver(() => {
        wrap.classList.toggle('tp-land', root.clientWidth > root.clientHeight * 1.15);
        wrap.classList.toggle('tp-wide', root.clientWidth >= 760);
        if (scr && scr.resize) scr.resize();
      });
      ro.observe(root);
      const ro2 = new ResizeObserver(() => { if (scr && scr.resize) scr.resize(); });

      /* ---------- shared pieces ---------- */
      function stopAnim() { cancelAnimationFrame(raf); raf = 0; }
      function replay(cv, d, dur, done) {
        stopAnim();
        const t0 = performance.now(), tot = nPts(d);
        if (!tot) { paint(cv, d); done && done(); return; }
        let lastN = -1;
        const f = () => {
          const p = Math.min(1, (performance.now() - t0) / dur), nn = Math.floor(tot * p);
          if (nn !== lastN) { lastN = nn; paint(cv, d, p); }
          if (p < 1) raf = requestAnimationFrame(f); else { raf = 0; done && done(); }
        };
        f();
      }
      function textOf(e) {
        if (e.t === 'i') return itemHTML(e.v);
        if (e.v) return esc(e.v);
        return `<span class="tp-none">${e.f === 'off' ? '（不在）' : '（沒猜到）'}</span>`;
      }
      function overlay(key, html, ms, cls) {
        if (lastOv === key) return; lastOv = key;
        elOv.className = 'tp-ov ' + (cls || ''); elOv.innerHTML = html; elOv.hidden = false;
        clearTimeout(ovT); ovT = setTimeout(() => { elOv.hidden = true; }, ms);
      }
      elOv.onclick = () => { elOv.hidden = true; };
      function pplHTML(v) {
        const kidW = kid ? '🖼️' : '✍️';
        return v.ids.map((id, i) => {
          const s = v.st[i], p = P(id);
          const bd = s === 1 ? '✓' : s === 2 ? '😴' : s === 3 ? '📵' : (v.kind === 'write' ? kidW : KIND_IC[v.kind]);
          return `<div class="tp-pp ${s === 1 ? 'done' : s === 0 ? 'work' : 'off'} ${id === me ? 'me' : ''}"><div class="tp-ppa">${av(id, tv ? 160 : 96)}<span class="tp-ppb">${bd}</span></div><div class="tp-ppn">${esc(p.name)}</div></div>`;
        }).join('');
      }
      const doneN = v => v.st.filter(s => s === 1 || s === 2).length;

      /* ---------- screens ---------- */
      function sendSub(d) { if (!V || V.ph !== 'step') return; sentK = V.k; api.send(Object.assign({ sub: 1, k: V.k }, d)); api.sfx('pop'); api.vibrate(30); render(); }

      // adult write: free text + 「給我靈感」
      function scrWrite() {
        body.innerHTML = `<div class="tp-task tp-pop">
          <div class="tp-q">✍️ 出一個題目</div>
          <div class="tp-hint">寫一句好玩的話（${MAXC} 字內），下一個人要把它<b>畫出來</b>！</div>
          <div class="tp-in"><input class="txt" maxlength="${MAXC}" placeholder="例如：貓咪在開會" enterkeyhint="send" autocomplete="off"><span class="tp-cnt">0/${MAXC}</span></div>
          <div class="tp-row2"><button class="btn ghost" data-idea>🎲 給我靈感</button><button class="btn acc" data-go>送出 ✔</button></div>
        </div>`;
        const inp = body.querySelector('input'), cnt = body.querySelector('.tp-cnt');
        const upd = () => { cnt.textContent = [...inp.value].length + '/' + MAXC; };
        inp.addEventListener('input', upd);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) go(); });
        body.querySelector('[data-idea]').onclick = () => {
          let s; do { s = IDEA[rint(IDEA.length)]; } while (s === inp.value && IDEA.length > 1);
          inp.value = s; upd(); api.sfx('flip'); inp.classList.remove('tp-flash'); void inp.offsetWidth; inp.classList.add('tp-flash');
        };
        const go = () => {
          const t = inp.value.trim();
          if (!t) { api.toast('寫點什麼，或按「給我靈感」'); api.sfx('wrong'); inp.focus(); return; }
          sendSub({ t });
        };
        body.querySelector('[data-go]').onclick = go;
        return { auto: () => ({ t: inp.value.trim() }) };
      }
      // kid write: pick 1 of 3 pictures
      function scrPick(v) {
        body.innerHTML = `<div class="tp-task tp-pop">
          <div class="tp-q">🖼️ 選一個給大家畫！</div>
          <div class="tp-hint">點一張你喜歡的圖，不要說出來喔 🤫</div>
          <div class="tp-picks">${v.ch.map(i => `<button class="tp-pk" data-i="${i}">${itemHTML(i)}</button>`).join('')}</div>
        </div>`;
        body.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { b.classList.add('on'); sendSub({ i: +b.dataset.i }); });
        return { auto: () => ({ i: v.ch[rint(v.ch.length)] }) };
      }
      // draw: prompt + finger-drawing pad
      function scrDraw(v) {
        const pr = v.pr, cols = kid ? PAL_KID : PAL_ADULT, widths = kid ? W_KID : W_ADULT;
        let ptxt;
        if (pr.t === 'i') ptxt = `<span class="tp-pi">${itemHTML(pr.v)}</span>`;
        else if (pr.v) ptxt = `<b class="tp-pt">「${esc(pr.v)}」</b>`;
        else ptxt = `<b class="tp-pt tp-free">${pr.f === 'off' ? '上一位不在 😴' : '上一位沒猜出來 🤷'} 自由發揮，畫什麼都可以！</b>`;
        body.innerHTML = `<div class="tp-draw">
          <div class="tp-prompt tp-pop"><span class="tp-pl">🎨 請畫</span>${ptxt}<span class="tp-from">${av(v.fr, 64)}${esc(P(v.fr).name)} ${pr.t === 'i' ? '選的' : kindOf(v.k - 1) === 'write' ? '寫的' : '猜的'}</span></div>
          <div class="tp-dmain">
            <div class="tp-cwrap"><canvas class="tp-cv"></canvas><div class="tp-cvhint">用手指在這裡畫 ☝️</div></div>
            <div class="tp-tools">
              <div class="tp-cols">${cols.map(c => `<button class="tp-col" data-c="${c}" style="--c:${PAL[c]}" aria-label="顏色"></button>`).join('')}</div>
              <div class="tp-tl2">
                ${widths.map((w, i) => `<button class="tp-sz" data-w="${i}" aria-label="筆刷"><i style="--d:${[8, 15, 24][i]}px"></i></button>`).join('')}
                <button class="tp-tb" data-er aria-label="橡皮擦">🧽</button>
                <button class="tp-tb" data-undo aria-label="上一步">↩️</button>
                <button class="tp-tb" data-clr aria-label="全部清掉">🗑️</button>
              </div>
              <button class="btn acc wide tp-send" data-go>畫好了 ✔</button>
            </div>
          </div>
        </div>`;
        const cv = body.querySelector('.tp-cv'), cw = body.querySelector('.tp-cwrap'), hint = body.querySelector('.tp-cvhint');
        let strokes = [], cur = null, pid = null, pts = 0, backup = null, col = cols[0], wi = 1, eraser = false, full = false, px = 300;
        const tools = () => {
          body.querySelectorAll('.tp-col').forEach(b => b.classList.toggle('on', !eraser && +b.dataset.c === col));
          body.querySelectorAll('.tp-sz').forEach(b => { b.classList.toggle('on', +b.dataset.w === wi); b.querySelector('i').style.background = eraser ? '#c9cfe0' : PAL[col]; });
          body.querySelector('[data-er]').classList.toggle('on', eraser);
          body.querySelector('[data-undo]').disabled = !strokes.length && !backup;
          hint.hidden = strokes.length > 0;
        };
        const fit = () => {
          const w = cw.clientWidth, h = cw.clientHeight; if (!w || !h) return;
          px = Math.min(w, h) - 8; sizeCanvas(cv, px); paint(cv, strokes);
        };
        const pos = e => { const r = cv.getBoundingClientRect(); return [clamp(Math.round((e.clientX - r.left) / r.width * 1000), 0, 1000), clamp(Math.round((e.clientY - r.top) / r.height * 1000), 0, 1000)]; };
        const seg = (s, from) => {
          const g = cv.getContext('2d'), sc = cv.width / 1000;
          g.lineCap = 'round'; g.lineJoin = 'round';
          const np = (s.length - 2) / 2;
          if (np === 1) { strokeOn(g, s, 1, sc); return; }
          g.strokeStyle = PAL[s[0]]; g.lineWidth = s[1] * sc; g.beginPath();
          g.moveTo(s[2 + from * 2] * sc, s[3 + from * 2] * sc);
          for (let i = from + 1; i < np; i++) g.lineTo(s[2 + i * 2] * sc, s[3 + i * 2] * sc);
          g.stroke();
        };
        cv.addEventListener('pointerdown', e => {
          if (cur || !V || V.ph !== 'step') return;
          e.preventDefault();
          if (pts >= MAXPTS || strokes.length >= MAXSTROKES) { if (!full) { full = true; api.toast('墨水用完了！可以送出囉 ✔'); } return; }
          try { cv.setPointerCapture(e.pointerId); } catch (er) { }
          pid = e.pointerId; backup = null;
          const [x, y] = pos(e), w = eraser ? Math.min(96, Math.round(widths[wi] * 1.8)) : widths[wi];
          cur = [eraser ? 0 : col, w, x, y]; strokes.push(cur); pts++; seg(cur, 0); tools();
        });
        const move = e => {
          if (!cur || e.pointerId !== pid) return;
          const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
          const from = (cur.length - 2) / 2 - 1;
          for (const ev of (evs.length ? evs : [e])) {
            if (pts >= MAXPTS) break;
            const [x, y] = pos(ev), lx = cur[cur.length - 2], ly = cur[cur.length - 1];
            if (Math.hypot(x - lx, y - ly) >= 6) { cur.push(x, y); pts++; }
          }
          if ((cur.length - 2) / 2 - 1 > from) seg(cur, from);
        };
        const up = e => {
          if (!cur || e.pointerId !== pid) return;
          const before = (cur.length - 2) / 2, simp = simplify(cur.slice(2), 2.2);
          cur.length = 2; cur.push(...simp); pts -= before - simp.length / 2;
          cur = null; pid = null;
          if (pts >= MAXPTS && !full) { full = true; api.toast('墨水用完了！可以送出囉 ✔'); }
        };
        cv.addEventListener('pointermove', move);
        cv.addEventListener('pointerup', up);
        cv.addEventListener('pointercancel', up);
        body.querySelectorAll('.tp-col').forEach(b => b.onclick = () => { col = +b.dataset.c; eraser = false; api.sfx('pop'); tools(); });
        body.querySelectorAll('.tp-sz').forEach(b => b.onclick = () => { wi = +b.dataset.w; api.sfx('tick'); tools(); });
        body.querySelector('[data-er]').onclick = () => { eraser = !eraser; api.sfx('pop'); tools(); };
        body.querySelector('[data-undo]').onclick = () => {
          if (cur) return;
          if (strokes.length) strokes.pop(); else if (backup) { strokes = backup; backup = null; }
          pts = nPts(strokes); full = false; paint(cv, strokes); api.sfx('flip'); tools();
        };
        body.querySelector('[data-clr]').onclick = () => {
          if (cur || !strokes.length) return;
          backup = strokes; strokes = []; pts = 0; full = false; paint(cv, strokes); api.sfx('whoosh'); api.vibrate(30); tools();
        };
        body.querySelector('[data-go]').onclick = () => {
          if (!strokes.length && !confirm(kid ? '還沒有畫耶，要送出空白的嗎？' : '還沒畫任何東西，確定送出？')) return;
          cur = null; sendSub({ d: strokes });
        };
        tools(); requestAnimationFrame(fit);
        return { auto: () => { cur = null; return { d: strokes }; }, resize: fit };
      }
      // guess: show drawing; adult types, kid picks one of 6
      function scrGuess(v) {
        const empty = !v.dr || !v.dr.length;
        body.innerHTML = `<div class="tp-guess">
          <div class="tp-gq tp-pop">💬 ${kid ? '這是什麼？選一個！' : '這是什麼？'}<span class="tp-from">${av(v.fr, 64)}${esc(P(v.fr).name)} 畫的</span></div>
          <div class="tp-gmain">
            <div class="tp-cwrap"><canvas class="tp-cv"></canvas>${empty ? `<div class="tp-empty">${v.df === 'off' ? '（不在）' : '（沒畫完）'}</div>` : ''}</div>
            <div class="tp-gside">${kid
              ? `<div class="tp-opts">${v.op.map(i => `<button class="tp-op" data-i="${i}">${itemHTML(i)}</button>`).join('')}</div>`
              : `<div class="tp-hint">${empty ? '沒有圖…亂猜一個也可以 😆' : '用一句話說出這張圖畫的是什麼'}</div>
                 <div class="tp-in"><input class="txt" maxlength="${MAXC}" placeholder="我覺得是…" enterkeyhint="send" autocomplete="off"><span class="tp-cnt">0/${MAXC}</span></div>
                 <button class="btn acc wide tp-send" data-go>送出 ✔</button>`}</div>
          </div>
        </div>`;
        const cv = body.querySelector('.tp-cv'), cw = body.querySelector('.tp-cwrap');
        let first = true;
        const fit = () => {
          const w = cw.clientWidth, h = cw.clientHeight; if (!w || !h) return;
          sizeCanvas(cv, Math.min(w, h) - 8);
          if (first) { first = false; replay(cv, v.dr || [], Math.min(2200, 500 + nPts(v.dr || []) * 3)); } else if (!raf) paint(cv, v.dr || []);
        };
        requestAnimationFrame(fit);
        if (kid) {
          body.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { b.classList.add('on'); sendSub({ i: +b.dataset.i }); });
          return { auto: () => ({ i: null }), resize: fit };
        }
        const inp = body.querySelector('input'), cnt = body.querySelector('.tp-cnt');
        inp.addEventListener('input', () => { cnt.textContent = [...inp.value].length + '/' + MAXC; });
        const go = () => { const t = inp.value.trim(); if (!t && !confirm('不猜就送出嗎？')) return; sendSub({ t }); };
        inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) go(); });
        body.querySelector('[data-go]').onclick = go;
        return { auto: () => ({ t: inp.value.trim() }), resize: fit };
      }
      // waiting / public progress / pass
      function scrWait() {
        body.innerHTML = `<div class="tp-wait"><div class="tp-wbig"></div><div class="tp-wt"></div><div class="tp-ws"></div><div class="tp-ppl"></div></div>`;
        const big = body.querySelector('.tp-wbig'), t = body.querySelector('.tp-wt'), s = body.querySelector('.tp-ws'), ppl = body.querySelector('.tp-ppl');
        return {
          upd(v) {
            const nm = { write: kid ? '選圖' : '出題', draw: '畫畫', guess: '猜圖' };
            let ic, tt, ss;
            if (v.ph === 'pass') { ic = '<span class="tp-fly">📨</span>'; tt = '傳給下一位！'; ss = `下一步：${KIND_IC[v.nk]} ${nm[v.nk]}`; }
            else if (me && (v.sub || sentK === v.k)) { ic = '<span class="tp-okb">✅</span>'; tt = '送出了！'; ss = `等其他人… ${doneN(v)}/${v.n}`; }
            else { ic = `<span class="tp-wig">${v.kind === 'write' ? (kid ? '🖼️' : '✍️') : KIND_IC[v.kind]}</span>`; tt = v.kind === 'write' ? (kid ? '大家正在選圖…' : '大家正在出題…') : v.kind === 'draw' ? '大家正在畫畫…' : '大家正在猜…'; ss = `${doneN(v)}/${v.n} 完成　·　答案只在自己的手機上 🤫`; }
            set(big, ic, ic); t.textContent = tt; s.textContent = ss;
            set(ppl, JSON.stringify([v.st, v.kind, v.ph]), pplHTML(v));
          }
        };
      }
      // reveal: one chain at a time, current step on the big stage, earlier steps in a strip
      function scrReveal(v) {
        const own = v.own;
        body.innerHTML = `<div class="tp-rv">
          <div class="tp-rvh tp-pop">${av(own, tv ? 160 : 96)}<div><div class="tp-rvt">${esc(P(own).name)} 的接龍</div><div class="tp-rvs">第 ${v.rc + 1} / ${v.n} 串</div></div><div class="tp-dots"></div></div>
          <div class="tp-rvm"><div class="tp-strip"></div><div class="tp-stage"></div></div>
          <div class="tp-rvf"></div>
        </div>`;
        const dots = body.querySelector('.tp-dots'), strip = body.querySelector('.tp-strip'), stage = body.querySelector('.tp-stage'), foot = body.querySelector('.tp-rvf');
        let curV = v, stageKey = '', stCv = null, stDone = false;
        const lab = (e, s) => s === 0 ? (kid ? '選了' : '出題') : e.t === 'd' ? '畫了' : (kid ? '選了' : '猜是');
        const ico = (e, s) => s === 0 ? (kid ? '🖼️' : '✍️') : e.t === 'd' ? '🎨' : '💬';
        const flagTag = e => e.f === 'auto' ? '<span class="tp-tag">🎲 系統出題</span>' : e.f === 'off' ? '<span class="tp-tag">😴 不在</span>' : e.f === 'time' ? '<span class="tp-tag">⏰ 時間到</span>' : '';
        function drawStage(sv) {
          const s = sv.rs, e = sv.steps[s];
          stageKey = sv.rc + '-' + s; stDone = false;
          const empty = e.t === 'd' && !e.v.length;
          stage.innerHTML = `<div class="tp-card tp-in2 ${e.t === 'd' ? 'tp-cd' : 'tp-ct'}">
            <div class="tp-ch">${av(e.by, tv ? 128 : 64)}<b>${esc(P(e.by).name)}</b><span>${ico(e, s)} ${lab(e, s)}</span>${flagTag(e)}${e.y ? '<span class="tp-tag ok">✔ 猜對了</span>' : ''}<span class="tp-chh"></span></div>
            ${e.t === 'd' ? `<div class="tp-cbox"><canvas class="tp-cv"></canvas>${empty ? `<div class="tp-empty">${e.f === 'off' ? '（不在）' : '（沒畫完）'}</div>` : ''}</div>`
              : `<div class="tp-bub ${e.t === 'i' ? 'item' : ''}">${textOf(e)}</div>`}
          </div>
          ${sv.ok ? '<div class="tp-succ tp-stamp">🎉 傳成功了！</div>' : ''}`;
          stCv = stage.querySelector('canvas');
          if (stCv) requestAnimationFrame(() => { fitStage(); replay(stCv, e.v, clamp(600 + nPts(e.v) * 4, 900, 3600), () => { stDone = true; }); });
          else stopAnim();
        }
        function fitStage() {
          if (!stCv) return;
          const box = stage.querySelector('.tp-cbox'), w = box.clientWidth, h = box.clientHeight;
          if (!w || !h) return;
          sizeCanvas(stCv, Math.min(w, h));
          if (stDone || !raf) { const e = curV.steps[curV.rs]; if (e && e.t === 'd') paint(stCv, e.v); }
        }
        function drawStrip(sv) {
          set(strip, JSON.stringify(sv.steps.map(e => [e.by, e.h, e.m])) + sv.rs, sv.steps.map((e, s) => `<button class="tp-th ${s === sv.rs ? 'cur' : ''} ${me && e.by !== me ? 'can' : ''}" data-s="${s}">
              <span class="tp-thc">${e.t === 'd' ? '<canvas></canvas>' : `<span class="tp-tht">${e.t === 'i' ? (ITEMS[e.v] || {}).e || '❓' : esc(e.v || '…')}</span>`}</span>
              <span class="tp-thn">${av(e.by, 48)}<span class="tp-thh ${e.m ? 'on' : ''}">${e.m || (!me && e.h) ? '❤️' : '🤍'}${e.h || ''}</span></span>
            </button>`).join(''));
          strip.querySelectorAll('canvas').forEach(c => {
            const s = +c.closest('[data-s]').dataset.s; sizeCanvas(c, tv ? 104 : 60); paint(c, sv.steps[s].v);
          });
          strip.querySelectorAll('.tp-th.can').forEach(b => b.onclick = () => { api.send({ ht: [curV.rc, +b.dataset.s] }); api.sfx('pop'); api.vibrate(20); });
          const cur = strip.querySelector('.tp-th.cur'); if (cur) try { cur.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); } catch (e) { }
        }
        function drawFoot(sv) {
          const e = sv.steps[sv.rs], mine = e.by === me;
          const last = sv.rs === sv.S - 1, lastC = sv.rc === sv.n - 1;
          const nxt = !last ? '下一步 ▶' : !lastC ? '下一串 ▶' : '看最受歡迎 🏆';
          const heart = me ? `<button class="tp-heart ${e.m ? 'on' : ''}" data-ht ${mine ? 'disabled' : ''}>${e.m ? '❤️' : '🤍'}<b>${e.h || 0}</b></button>`
            : `<span class="tp-heart ro">❤️<b>${e.h || 0}</b></span>`;
          const btn = sv.can ? `<button class="btn acc tp-next" data-nx>${nxt}</button>`
            : `<span class="tp-waitn">${me ? `等 ${esc(P(sv.own).name)}${sv.own === me ? '' : ' 或 👑'} 按${last ? (lastC ? '「看最受歡迎」' : '「下一串」') : '「下一步」'}` : `${sv.rs + 1} / ${sv.S}`}</span>`;
          set(foot, [sv.rc, sv.rs, e.h, e.m, sv.can].join(), heart + btn);
          const hb = foot.querySelector('[data-ht]');
          if (hb) hb.onclick = () => { api.send({ ht: [curV.rc, curV.rs] }); api.sfx('pop'); api.vibrate(20); hb.classList.add('tp-boing'); };
          const nb = foot.querySelector('[data-nx]');
          if (nb) nb.onclick = () => { api.send({ nx: [curV.rc, curV.rs] }); api.sfx('tick'); nb.disabled = true; };
        }
        return {
          upd(sv) {
            curV = sv;
            set(dots, sv.rs + '/' + sv.S, Array.from({ length: sv.S }, (_, i) => `<i class="${i < sv.rs ? 'd' : i === sv.rs ? 'c' : ''}"></i>`).join(''));
            if (stageKey !== sv.rc + '-' + sv.rs) drawStage(sv);
            else if (sv.ok && !stage.querySelector('.tp-succ')) stage.insertAdjacentHTML('beforeend', '<div class="tp-succ tp-stamp">🎉 傳成功了！</div>');
            const ch = stage.querySelector('.tp-ch');
            drawStrip(sv); drawFoot(sv);
            if (ch) { const h = sv.steps[sv.rs].h || 0, hh = ch.querySelector('.tp-chh'); set(hh, 'h' + h, h ? `❤️ ${h}` : ''); }
          },
          resize() { fitStage(); }
        };
      }
      // award: most-liked step + everyone's hearts
      function scrAward(v) {
        const b = v.best, e = b;
        const tot = v.ids.map((id, i) => [id, v.tot[i]]);
        body.innerHTML = `<div class="tp-aw">
          <div class="tp-awh tp-pop">🏆 ${b.hh > 0 ? '最受歡迎' : '隨機精選'}</div>
          <div class="tp-awm">
            <div class="tp-card tp-in2 ${e.t === 'd' ? 'tp-cd' : 'tp-ct'}">
              <div class="tp-ch">${av(e.by, tv ? 128 : 64)}<b>${esc(P(e.by).name)}</b><span>${b.hh > 0 ? `❤️ ${b.hh} 個讚` : '大家都太害羞了 😆'}</span></div>
              ${e.t === 'd' ? `<div class="tp-cbox"><canvas class="tp-cv"></canvas></div>` : `<div class="tp-bub ${e.t === 'i' ? 'item' : ''}">${textOf(e)}</div>`}
              <div class="tp-awfrom">出自 ${esc(P(b.own).name)} 的接龍・第 ${b.s + 1} 步</div>
            </div>
            <div class="tp-awl">
              ${kid ? `<div class="tp-awok">${v.ok ? `🎉 有 <b>${v.ok}</b> 串傳成功了！` : '😆 每一串都變成新東西了！'}</div>` : ''}
              ${tot.map(([id, h]) => `<div class="tp-awr ${id === me ? 'me' : ''}">${av(id, 64)}<b>${esc(P(id).name)}</b><span>❤️ ${h}</span></div>`).join('')}
              <div class="tp-awb"></div>
            </div>
          </div>
        </div>`;
        const cv = body.querySelector('.tp-cv'), fb = body.querySelector('.tp-awb');
        let done = false;
        const fit = () => {
          if (!cv) return; const box = body.querySelector('.tp-cbox'), w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
          sizeCanvas(cv, Math.min(w, h)); if (done) paint(cv, e.v);
        };
        if (cv) requestAnimationFrame(() => { fit(); replay(cv, e.v, clamp(600 + nPts(e.v) * 4, 900, 3200), () => { done = true; }); });
        return {
          upd(sv) {
            set(fb, 'c' + sv.can, sv.can ? '<button class="btn acc wide" data-end>看結果 ▶</button>' : `<div class="tp-waitn">${me ? '等 👑 按「看結果」' : ''}</div>`);
            const eb = fb.querySelector('[data-end]'); if (eb) eb.onclick = () => { api.send({ end: 1 }); eb.disabled = true; };
          },
          resize: fit
        };
      }

      /* ---------- top bar ---------- */
      function drawTop(v) {
        const kn = { write: kid ? '🖼️ 選一個題目' : '✍️ 出題時間', draw: '🎨 畫畫時間', guess: kid ? '💬 這是什麼？' : '💬 猜猜看' };
        if (v.ph === 'step' || v.ph === 'pass') { elPill.textContent = `第 ${v.k + 1}/${v.S} 步`; elPh.textContent = v.ph === 'pass' ? '📨 傳給下一位' : kn[v.kind]; }
        else if (v.ph === 'reveal') { elPill.textContent = `第 ${v.rc + 1}/${v.n} 串`; elPh.textContent = `🎬 ${P(v.own).name} 的接龍`; }
        else { elPill.textContent = '結束'; elPh.textContent = '🎉 大家的讚'; }
      }

      function screenKey(v) {
        if (v.ph === 'step') {
          if (me && !v.sub && sentK !== v.k && (v.kind === 'write' ? (kid ? v.ch : true) : v.kind === 'draw' ? v.pr : v.dr)) return 'task' + v.k;
          return 'wait';
        }
        if (v.ph === 'pass') return 'wait';
        if (v.ph === 'reveal') return 'rv' + v.rc;
        return 'aw';
      }
      function build(key, v) {
        stopAnim();
        if (key.startsWith('task')) return v.kind === 'write' ? (kid ? scrPick(v) : scrWrite(v)) : v.kind === 'draw' ? scrDraw(v) : scrGuess(v);
        if (key === 'wait') return scrWait(v);
        if (key.startsWith('rv')) return scrReveal(v);
        return scrAward(v);
      }
      function render() {
        const v = V; if (!v) return;
        const key = screenKey(v);
        if (!scr || scr.key !== key) {
          ro2.disconnect();
          scr = build(key, v) || {}; scr.key = key; body.className = 'tp-body tp-s-' + key.replace(/\d+/g, '');
          body.querySelectorAll('.tp-cwrap,.tp-stage,.tp-cbox').forEach(el => ro2.observe(el));
        }
        if (scr.upd) scr.upd(v);
      }
      function moments(prev, v) {
        if (v.ph === 'step' && (!prev || prev.ph !== 'step' || prev.k !== v.k)) {
          lastTick = -1;
          if (me) {
            const t = { write: kid ? '🖼️ 選一張圖！' : '✍️ 出個題目！', draw: '🎨 換你畫畫！', guess: kid ? '💬 這是什麼？' : '💬 猜猜看！' }[v.kind];
            overlay('st' + v.k, `<div class="tp-ovb"><div class="tp-ovt">${t}</div></div>`, 1100, 'soft');
            api.vibrate([60, 40, 60]);
          }
        }
        if (v.ph === 'reveal' && (!prev || prev.ph !== 'reveal')) overlay('rv', `<div class="tp-ovb"><div class="tp-ovi">🎬</div><div class="tp-ovt">揭曉時間！</div><div class="tp-ovs">看看題目傳到最後變成什麼 🤣</div></div>`, 2000);
        if (v.ph === 'reveal' && v.ok && !(prev && prev.ok && prev.rc === v.rc)) { overlay('ok' + v.rc, `<div class="tp-ovb ok"><div class="tp-ovi">🎉</div><div class="tp-ovt">傳成功了！</div></div>`, 1800); api.vibrate(120); }
        if (v.ph === 'reveal' && prev && prev.ph === 'reveal' && prev.rc === v.rc && me) {
          const a = prev.steps[prev.steps.length - 1], b = v.steps[prev.steps.length - 1];
          if (a && b && a.by === me && b.h > (a.h || 0)) { api.vibrate(25); }
        }
        if (v.ph === 'award' && (!prev || prev.ph !== 'award')) api.vibrate(80);
      }

      // timer + auto submit when time is up
      const timer = setInterval(() => {
        elBar.parentNode.style.visibility = V && V.ph === 'step' ? '' : 'hidden';
        if (!V || V.ph !== 'step' || !tTot) { elTm.hidden = true; elBar.style.width = '0'; return; }
        const rem = Math.max(0, (tEnd - performance.now()) / 1000), s = Math.ceil(rem);
        elTm.hidden = false; elTm.querySelector('b').textContent = s;
        elTm.classList.toggle('low', s <= 10);
        elBar.style.width = (rem / tTot * 100).toFixed(1) + '%';
        elBar.parentNode.classList.toggle('low', s <= 10);
        const pending = me && scr && scr.auto && sentK !== V.k && !V.sub;
        if (pending && s <= 5 && s > 0 && s !== lastTick) { lastTick = s; api.sfx('tick'); if (s === 5) api.vibrate(40); }
        if (pending && rem <= 0.15) {
          const d = scr.auto(); sentK = V.k;
          api.send(Object.assign({ sub: 1, k: V.k, tm: 1 }, d)); api.sfx('buzz'); api.toast('⏰ 時間到！自動送出');
          render();
        }
      }, 200);

      return {
        view(v) {
          if (!v) return;
          const prev = V; V = v;
          tTot = v.ph === 'step' ? v.tm || 0 : 0; tEnd = performance.now() + (v.tl || 0) * 1000;
          wrap.classList.toggle('tp-rvmode', v.ph === 'reveal' || v.ph === 'award');
          drawTop(v); render(); moments(prev, v);
        },
        destroy() { clearInterval(timer); clearTimeout(ovT); stopAnim(); ro.disconnect(); ro2.disconnect(); }
      };
    },

    bot(v, api) {
      const me = api.me; if (!v || !me) return;
      if (v.ph === 'step' && !v.sub) {
        if (Math.random() > 0.22) return;
        if (v.kind === 'write') { if (api.kid) { if (v.ch) api.send({ sub: 1, k: v.k, i: v.ch[rint(v.ch.length)] }); } else api.send({ sub: 1, k: v.k, t: IDEA[rint(IDEA.length)] }); }
        else if (v.kind === 'draw') { if (v.pr) api.send({ sub: 1, k: v.k, d: Math.random() < 0.08 ? [] : botDraw() }); }
        else if (v.dr) { if (api.kid) api.send({ sub: 1, k: v.k, i: v.op[rint(v.op.length)] }); else api.send({ sub: 1, k: v.k, t: Math.random() < 0.08 ? '' : BOT_GUESS[rint(BOT_GUESS.length)] }); }
        return;
      }
      if (v.ph === 'reveal') {
        if (v.can && Math.random() < 0.09) { api.send({ nx: [v.rc, v.rs] }); return; }
        if (Math.random() < 0.05) { const s = rint(v.steps.length); if (v.steps[s].by !== me) api.send({ ht: [v.rc, s] }); }
        return;
      }
      if (v.ph === 'award' && v.can && Math.random() < 0.06) api.send({ end: 1 });
    }
  });

  const CSS = `
.tp{position:absolute;inset:0;display:flex;flex-direction:column;gap:8px;padding:10px 12px calc(12px + env(safe-area-inset-bottom,0px));overflow:hidden;
  background:radial-gradient(700px 420px at 100% 0,#ffe9dc 0,transparent 70%),radial-gradient(600px 400px at 0 100%,#e3ecff 0,transparent 70%)}
.tp-top{display:flex;align-items:center;gap:8px;flex:none}
.tp-pill{background:#ff7a45;color:#fff;font-weight:900;font-size:14px;border-radius:999px;padding:5px 12px;flex:none;font-family:var(--round)}
.tp-ph{flex:1;font-weight:900;font-size:19px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tp-tm{flex:none;font-family:var(--round);font-weight:700;font-size:20px;background:#fff;border-radius:999px;padding:3px 12px;box-shadow:0 2px 0 var(--line)}
.tp-tm::before{content:'⏱ ';font-size:15px}
.tp-tm.low{color:#fff;background:var(--bad);animation:tp-beat .5s infinite alternate}
.tp-bar{height:6px;border-radius:9px;background:#f3e3da;overflow:hidden;flex:none;margin-top:-4px}
.tp-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffb36b,#ff7a45);border-radius:9px;transition:width .2s linear}
.tp-bar.low i{background:var(--bad)}
.tp-body{flex:1;min-height:0;position:relative;display:flex;flex-direction:column}
.tp-body>*{flex:1;min-height:0}
/* task cards */
.tp-task{align-self:center;width:100%;max-width:560px;flex:none;margin:auto 0;background:#fff;border:4px solid #ffb36b;border-radius:26px;padding:18px 16px;box-shadow:0 0 0 6px rgba(255,179,107,.18),0 10px 30px rgba(60,70,140,.1);display:flex;flex-direction:column;gap:10px}
.tp-q{font-size:26px;font-weight:900;text-align:center;color:var(--accd)}
.tp-hint{text-align:center;color:var(--mute);font-weight:700;font-size:14px;line-height:1.55}
.tp-hint b{color:var(--ink)}
.tp-in{position:relative}
.tp-in input{padding-right:62px;font-size:22px}
.tp-in input.tp-flash{animation:tp-flash .5s}
.tp-cnt{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--mute);font-weight:700}
.tp-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tp-row2 .btn{min-height:58px}
.tp-picks{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.tp-pk,.tp-op{background:#fff8f2;border:4px solid #ffd9bf;border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:10px 4px;
  box-shadow:0 5px 0 #ffd9bf;transition:transform .15s;animation:tp-in .4s cubic-bezier(.3,1.5,.5,1) backwards;min-height:64px}
.tp-pk:nth-child(2),.tp-op:nth-child(2){animation-delay:.06s}.tp-pk:nth-child(3),.tp-op:nth-child(3){animation-delay:.12s}
.tp-op:nth-child(4){animation-delay:.18s}.tp-op:nth-child(5){animation-delay:.24s}.tp-op:nth-child(6){animation-delay:.3s}
.tp-pk .tp-ie{font-size:64px;line-height:1.1}.tp-pk .tp-iw{font-size:20px;font-weight:900}
.tp-pk:active,.tp-op:active,.tp-pk.on,.tp-op.on{transform:translateY(4px) scale(.97);box-shadow:0 1px 0 #ffd9bf;border-color:#ff7a45;background:#fff0e4}
.tp-ie{line-height:1}.tp-iw{font-weight:900}
/* drawing */
.tp-draw,.tp-guess{display:flex;flex-direction:column;gap:8px}
.tp-prompt,.tp-gq{flex:none;display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#fff;border-radius:18px;padding:8px 12px;box-shadow:0 2px 0 var(--line);font-weight:900}
.tp-gq{font-size:20px;color:var(--accd)}
.tp-pl{background:#ff7a45;color:#fff;border-radius:999px;padding:3px 10px;font-size:14px;flex:none}
.tp-pt{font-size:22px;line-height:1.25;flex:1;min-width:0}
.tp-pt.tp-free{font-size:16px;color:var(--accd)}
.tp-pi{display:flex;align-items:center;gap:6px;flex:1}.tp-pi .tp-ie{font-size:40px}.tp-pi .tp-iw{font-size:26px}
.tp-from{margin-left:auto;display:flex;align-items:center;gap:4px;font-size:12px;color:var(--mute);font-weight:700}
.tp-from img{width:26px;height:26px}
.tp-dmain,.tp-gmain{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px}
.tp-cwrap{flex:1;min-height:120px;padding:4px;position:relative;display:flex;align-items:center;justify-content:center}
.tp-cv{background:#fff;border-radius:18px;box-shadow:0 0 0 3px #ffd9bf,0 8px 24px rgba(60,70,140,.12);touch-action:none;display:block}
.tp-cvhint{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#c9cfe0;font-weight:900;font-size:18px;pointer-events:none;white-space:nowrap}
.tp-empty{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#aab2c8;font-weight:900;font-size:24px;pointer-events:none;white-space:nowrap}
.tp-tools{flex:none;display:flex;flex-direction:column;gap:8px}
.tp-cols{display:grid;grid-template-columns:repeat(10,1fr);gap:5px}
.tp-kid .tp-cols{grid-template-columns:repeat(8,1fr);gap:6px}
.tp-col{aspect-ratio:1;border-radius:50%;background:var(--c);box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 0 0 2px #fff,0 0 0 3px var(--line);min-height:28px;transition:transform .15s}
.tp-kid .tp-col{min-height:38px}
.tp-col.on{transform:scale(1.18);box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 0 0 3px #fff,0 0 0 6px var(--ink)}
.tp-tl2{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.tp-sz,.tp-tb{height:48px;border-radius:14px;background:#fff;box-shadow:0 3px 0 var(--line);border:3px solid transparent;display:grid;place-items:center;font-size:22px}
.tp-sz i{display:block;width:var(--d);height:var(--d);border-radius:50%;background:#1f2346}
.tp-sz.on,.tp-tb.on{border-color:#ff7a45;background:#fff4ec}
.tp-tb[disabled]{opacity:.35}
.tp-sz:active,.tp-tb:active{transform:translateY(2px);box-shadow:0 1px 0 var(--line)}
.tp-send{min-height:56px;font-size:21px}
.tp-gside{flex:none;display:flex;flex-direction:column;gap:8px}
.tp-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tp-op{padding:6px 2px;border-radius:18px}
.tp-op .tp-ie{font-size:40px}.tp-op .tp-iw{font-size:16px}
.tp-land .tp-dmain,.tp-land .tp-gmain{flex-direction:row}
.tp-land .tp-tools,.tp-land .tp-gside{width:min(46%,420px);justify-content:center}
.tp-land .tp-cols{grid-template-columns:repeat(5,1fr)}
.tp-land .tp-cols{grid-template-columns:repeat(5,34px);justify-content:center;gap:8px 12px}
.tp-land.tp-kid .tp-cols{grid-template-columns:repeat(4,40px)}
.tp-land .tp-col,.tp-land.tp-kid .tp-col{min-height:0}
.tp-land:not(.tp-tv) .tp-rvh{display:none}
.tp-land:not(.tp-tv) .tp-rv{flex-direction:row}
.tp-land:not(.tp-tv) .tp-rvm{flex:1}
.tp-land:not(.tp-tv) .tp-rvf{flex-direction:column;width:150px;justify-content:center}
.tp-land:not(.tp-tv) .tp-rvf>*{width:100%;flex:none}
.tp-land:not(.tp-tv) .tp-heart{justify-content:center}
/* waiting */
.tp-wait{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:10px}
.tp-wbig{font-size:84px;line-height:1.1;height:96px}
.tp-wig{display:inline-block;animation:tp-wig 1s ease-in-out infinite}
.tp-fly{display:inline-block;animation:tp-fly 1.6s ease-in-out infinite}
.tp-okb{display:inline-block;animation:tp-in .5s cubic-bezier(.3,1.6,.5,1)}
.tp-wt{font-size:28px;font-weight:900}
.tp-ws{color:var(--mute);font-weight:700;font-size:15px}
.tp-ppl{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:14px;max-width:560px}
.tp-pp{display:flex;flex-direction:column;align-items:center;width:76px;transition:transform .3s}
.tp-ppa{position:relative;width:64px;height:64px;border-radius:50%;background:#fff;box-shadow:0 2px 0 var(--line);display:grid;place-items:center}
.tp-ppa img{width:100%;height:100%}
.tp-ppb{position:absolute;right:-8px;bottom:-4px;background:#fff;border-radius:999px;min-width:28px;height:28px;display:grid;place-items:center;font-size:15px;box-shadow:0 1px 4px rgba(0,0,0,.2);font-weight:900}
.tp-pp.work .tp-ppb{animation:tp-wig 1.2s ease-in-out infinite}
.tp-pp.done .tp-ppb{background:var(--ok);color:#fff;animation:tp-in .4s cubic-bezier(.3,1.6,.5,1)}
.tp-pp.off{opacity:.5}
.tp-pp.me .tp-ppn{color:var(--accd)}
.tp-ppn{font-size:13px;font-weight:900;margin-top:4px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* reveal */
.tp-rv{display:flex;flex-direction:column;gap:8px}
.tp-rvh{flex:none;display:flex;align-items:center;gap:10px;background:#fff;border-radius:20px;padding:6px 12px 6px 6px;box-shadow:0 2px 0 var(--line)}
.tp-rvh img{width:48px;height:48px}
.tp-rvt{font-weight:900;font-size:19px}
.tp-rvs{font-size:12px;font-weight:700;color:var(--mute)}
.tp-dots{margin-left:auto;display:flex;gap:5px}
.tp-dots i{width:10px;height:10px;border-radius:50%;background:#e8ddd5;transition:all .3s}
.tp-dots i.d{background:#ffb36b}.tp-dots i.c{background:#ff7a45;transform:scale(1.35)}
.tp-rvm{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px}
.tp-strip{flex:none;display:flex;gap:6px;overflow-x:auto;padding:2px 2px 4px;scrollbar-width:none}
.tp-th{flex:none;display:flex;flex-direction:column;align-items:center;gap:2px;background:#fff;border-radius:14px;padding:4px;box-shadow:0 2px 0 var(--line);border:3px solid transparent;opacity:.8}
.tp-th.cur{border-color:#ff7a45;opacity:1}
.tp-thc{width:60px;height:60px;display:grid;place-items:center;overflow:hidden;border-radius:8px;background:#fafbff}
.tp-thc canvas{border-radius:8px}
.tp-tht{font-size:12px;font-weight:900;line-height:1.2;padding:2px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;word-break:break-all}
.tp-kid .tp-tht{font-size:36px}
.tp-thn{display:flex;align-items:center;gap:2px;font-size:11px;font-weight:900}
.tp-thn img{width:20px;height:20px}
.tp-thh.on{color:#e0245e}
.tp-stage{flex:1;min-height:0;position:relative;display:flex;flex-direction:column}
.tp-card{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;background:#fff;border-radius:24px;padding:10px;box-shadow:0 3px 0 var(--line),0 12px 30px rgba(60,70,140,.1)}
.tp-in2{animation:tp-card .55s cubic-bezier(.3,1.4,.5,1)}
.tp-ch{flex:none;display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:16px}
.tp-ch img{width:40px;height:40px}
.tp-ch span{color:var(--mute);font-weight:900}
.tp-tag{font-size:12px!important;background:#f1f3fb;border-radius:999px;padding:2px 8px}
.tp-tag.ok{background:#dcf7e7;color:#127a40!important}
.tp-cbox{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center}
.tp-cbox .tp-cv{box-shadow:0 0 0 3px #f1e6dd}
.tp-bub{flex:0 1 auto;min-height:45%;margin:auto 0;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;font-size:clamp(28px,8vw,46px);font-weight:900;line-height:1.3;padding:16px;
  background:#fff8f2;border-radius:20px;border:3px dashed #ffd0ae;word-break:break-word}
.tp-bub.item .tp-ie{font-size:120px}.tp-bub.item .tp-iw{font-size:40px}
.tp-none{color:#aab2c8}
.tp-succ{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-8deg);background:#22c26a;color:#fff;font-weight:900;font-size:34px;padding:8px 22px;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.25);white-space:nowrap;pointer-events:none}
.tp-rvf{flex:none;display:flex;align-items:center;gap:10px}
.tp-heart{display:flex;align-items:center;gap:6px;background:#fff;border-radius:16px;padding:0 16px;min-height:56px;font-size:28px;box-shadow:0 4px 0 var(--line);border:3px solid #ffd0dc}
.tp-heart b{font-family:var(--round);font-size:22px;color:#e0245e}
.tp-heart.on{background:#ffe8ee;border-color:#ff7aa0}
.tp-heart[disabled]{opacity:.45}
.tp-heart.ro{box-shadow:none}
.tp-boing{animation:tp-boing .4s}
.tp-next{flex:1;min-height:56px;font-size:21px}
.tp-waitn{flex:1;text-align:center;color:var(--mute);font-weight:900;font-size:15px}
/* award */
.tp-aw{display:flex;flex-direction:column;gap:8px}
.tp-awh{flex:none;text-align:center;font-size:30px;font-weight:900;color:#b77900}
.tp-awm{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px}
.tp-awm .tp-card{border:4px solid #ffd166;box-shadow:0 0 0 6px rgba(255,209,102,.3),0 12px 30px rgba(60,70,140,.12)}
.tp-awfrom{flex:none;text-align:center;font-size:13px;font-weight:700;color:var(--mute)}
.tp-awl{flex:none;display:flex;flex-direction:column;gap:6px;overflow:auto;max-height:40%}
.tp-awok{text-align:center;font-weight:900;font-size:18px;background:#dcf7e7;border-radius:14px;padding:8px}
.tp-awr{display:flex;align-items:center;gap:8px;background:#fff;border-radius:14px;padding:3px 12px 3px 4px;font-size:16px;box-shadow:0 2px 0 var(--line)}
.tp-awr img{width:36px;height:36px}
.tp-awr span{margin-left:auto;font-weight:900;color:#e0245e;font-family:var(--round)}
.tp-awr.me{outline:3px solid #ffb36b}
.tp-wide .tp-awm{flex-direction:row}.tp-wide .tp-awl{max-height:none;width:36%;justify-content:center}
.tp-land:not(.tp-wide) .tp-awm{flex-direction:row}.tp-land:not(.tp-wide) .tp-awl{max-height:none;width:44%}
/* overlay */
.tp-ov{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:rgba(31,35,70,.5);animation:tp-fade .25s}
.tp-ov.soft{background:rgba(31,35,70,.25);pointer-events:none}
.tp-ovb{background:#fff;border-radius:30px;padding:22px 34px;text-align:center;animation:tp-stamp .5s cubic-bezier(.3,1.6,.5,1);box-shadow:0 20px 60px rgba(0,0,0,.3);border:5px solid #ff7a45}
.tp-ovb.ok{border-color:#22c26a}
.tp-ovi{font-size:72px;line-height:1.1}
.tp-ovt{font-size:32px;font-weight:900}
.tp-ovs{font-size:16px;color:var(--mute);font-weight:700;margin-top:4px}
.tp-pop{animation:tp-in .4s cubic-bezier(.3,1.5,.5,1)}
.tp-stamp{animation:tp-stamp2 .6s cubic-bezier(.3,1.6,.5,1)}
@keyframes tp-in{from{transform:scale(.7);opacity:0}}
@keyframes tp-card{from{transform:translateY(40px) scale(.9);opacity:0}}
@keyframes tp-fade{from{opacity:0}}
@keyframes tp-stamp{from{transform:scale(2.2) rotate(-8deg);opacity:0}}
@keyframes tp-stamp2{from{transform:translate(-50%,-50%) scale(2.6) rotate(-14deg);opacity:0}}
@keyframes tp-beat{to{transform:scale(1.06)}}
@keyframes tp-wig{25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}}
@keyframes tp-fly{0%{transform:translateX(-40px) rotate(-10deg);opacity:0}30%{opacity:1}70%{opacity:1}100%{transform:translateX(60px) translateY(-20px) rotate(10deg);opacity:0}}
@keyframes tp-boing{40%{transform:scale(1.25)}}
@keyframes tp-flash{30%{background:#fff1c9;border-color:#ffb36b}}
/* kid: bigger everything */
.tp-kid .tp-q{font-size:30px}
.tp-kid .tp-tb,.tp-kid .tp-sz{height:56px;font-size:26px}
.tp-kid .tp-send{min-height:64px;font-size:24px}
/* wide phones in landscape / tablets */
.tp-wide .tp-rvm,.tp-land .tp-rvm{flex-direction:row}
.tp-wide .tp-strip,.tp-land .tp-strip{flex-direction:column;overflow-x:hidden;overflow-y:auto;width:auto}
@media (max-height:460px){.tp{padding:6px 10px;gap:5px}.tp-q{font-size:20px}.tp-task{padding:10px;gap:6px}.tp-pk .tp-ie{font-size:44px}.tp-wbig{font-size:54px;height:62px}
  .tp-wt{font-size:22px}.tp-rvh img{width:34px;height:34px}.tp-ppl{margin-top:4px}.tp-ppa{width:48px;height:48px}
  .tp-tb,.tp-sz,.tp-kid .tp-tb,.tp-kid .tp-sz{height:44px}.tp-send,.tp-kid .tp-send{min-height:48px}.tp-col{min-height:24px}.tp-kid .tp-col{min-height:30px}
  .tp-bub{font-size:28px}.tp-bub.item .tp-ie{font-size:70px}.tp-bub.item .tp-iw{font-size:26px}.tp-heart,.tp-next{min-height:48px}}
/* big screen */
.tp-tv{padding:20px 30px!important;gap:14px}
.tp-tv .tp-pill{font-size:24px;padding:8px 20px}
.tp-tv .tp-ph{font-size:40px}
.tp-tv .tp-tm{font-size:38px;padding:6px 20px}
.tp-tv .tp-bar{height:12px}
.tp-tv .tp-wbig{font-size:150px;height:170px}
.tp-tv .tp-wt{font-size:56px}
.tp-tv .tp-ws{font-size:26px}
.tp-tv .tp-ppl{gap:26px;max-width:1300px;margin-top:30px}
.tp-tv .tp-pp{width:160px}
.tp-tv .tp-ppa{width:140px;height:140px}
.tp-tv .tp-ppb{min-width:52px;height:52px;font-size:30px;right:-10px}
.tp-tv .tp-ppn{font-size:26px}
.tp-tv .tp-rvh{padding:6px 24px 6px 8px;border-radius:24px;gap:16px}
.tp-tv .tp-rvh img{width:68px;height:68px}
.tp-tv .tp-rvt{font-size:34px}.tp-tv .tp-rvs{font-size:20px}
.tp-tv .tp-rvf{display:none}
.tp-chh{display:none}
.tp-tv .tp-chh{display:inline;margin-left:auto;color:#e0245e!important;font-family:var(--round);font-size:40px}
.tp-tv .tp-bar{margin-top:-8px}
.tp-tv.tp-rvmode .tp-top,.tp-tv.tp-rvmode .tp-bar{display:none}
.tp-tv .tp-rvm{flex-direction:column;gap:14px}
.tp-tv .tp-strip{flex-direction:row;overflow-x:auto;overflow-y:hidden;justify-content:center}
.tp-tv .tp-bub.item{gap:10px}.tp-tv .tp-bub.item .tp-ie{line-height:1.05}
.tp-tv .tp-dots i{width:20px;height:20px}
.tp-tv .tp-dots{gap:12px}
.tp-tv .tp-strip{gap:12px;width:auto}
.tp-tv .tp-th{padding:6px;border-width:4px;border-radius:18px;flex-direction:row;gap:10px}
.tp-tv .tp-thc{width:104px;height:104px}
.tp-tv .tp-tht{font-size:18px}.tp-tv.tp-kid .tp-tht{font-size:60px}
.tp-tv .tp-thn{flex-direction:column;font-size:20px}.tp-tv .tp-thn img{width:44px;height:44px}
.tp-tv .tp-card{padding:18px;border-radius:32px;gap:14px}
.tp-tv .tp-ch{font-size:34px;gap:14px}.tp-tv .tp-ch img{width:80px;height:80px}
.tp-tv .tp-tag{font-size:20px!important;padding:4px 14px}
.tp-tv .tp-bub{font-size:84px;border-width:5px}
.tp-tv .tp-bub.item .tp-ie{font-size:230px}.tp-tv .tp-bub.item .tp-iw{font-size:80px}
.tp-tv .tp-succ{font-size:76px;padding:14px 40px;border-radius:28px}
.tp-tv .tp-heart{font-size:44px;min-height:80px;padding:0 26px}.tp-tv .tp-heart b{font-size:38px}
.tp-tv .tp-waitn{font-size:30px}
.tp-tv .tp-awh{font-size:56px}
.tp-tv .tp-awr{font-size:30px;padding:6px 20px 6px 6px;border-radius:20px}.tp-tv .tp-awr img{width:70px;height:70px}
.tp-tv .tp-awok{font-size:32px}
.tp-tv .tp-awfrom{font-size:22px}
.tp-tv .tp-ovb{padding:40px 70px;border-radius:44px;border-width:8px}.tp-tv .tp-ovi{font-size:140px}.tp-tv .tp-ovt{font-size:68px}.tp-tv .tp-ovs{font-size:30px}
`;
})();
