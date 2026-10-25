'use strict';
/* 誰是臥底 · secret-word game. Everyone gets a word on their own phone; the 臥底 gets a similar but different one.
   Describe in turn (typed clue or said out loud), vote, reveal. Kid mode uses picture words + clue stickers. */
(() => {
  /* ---------- word banks ---------- */
  // kid: "emoji名稱/emoji名稱"
  const KID_RAW = `🐶小狗/🐱小貓 🍎蘋果/🍓草莓 🦁獅子/🐯老虎 🐰兔子/🐹倉鼠 🍌香蕉/🌽玉米 🍉西瓜/🍈哈密瓜 🍊橘子/🍋檸檬
🍇葡萄/🫐藍莓 🚗汽車/🚌公車 🚂火車/🚇捷運 ✈️飛機/🚁直升機 🚲腳踏車/🛴滑板車 🐟小魚/🐬海豚 🦈鯊魚/🐳鯨魚 🐓公雞/🦆鴨子
🐮乳牛/🐷小豬 🐴小馬/🦓斑馬 🐘大象/🦛河馬 🐒猴子/🦍大猩猩 🐸青蛙/🐢烏龜 🦋蝴蝶/🐝蜜蜂 🐜螞蟻/🐞瓢蟲 🍦冰淇淋/🍧剉冰
🍰蛋糕/🍩甜甜圈 🍪餅乾/🍫巧克力 🍞吐司/🥐可頌 🍕披薩/🍔漢堡 🍜拉麵/🍚白飯 🥛牛奶/🧃果汁 🥕紅蘿蔔/🌶️辣椒 🥦花椰菜/🥬青菜
🍅番茄/🍒櫻桃 🍑桃子/🥭芒果 ⚽足球/🏀籃球 🎈氣球/🪁風箏 👟球鞋/🧦襪子 👕衣服/👖褲子 🧤手套/🧣圍巾 🛏️床/🛋️沙發
🚪門/🪟窗戶 📺電視/💻電腦 📱手機/☎️電話 ✏️鉛筆/🖍️蠟筆 📚書本/📓筆記本 🪥牙刷/🧼肥皂 🛁浴缸/🚿蓮蓬頭 ☀️太陽/🌙月亮
☁️雲朵/🌈彩虹 🌧️下雨/❄️下雪 🌻向日葵/🌷鬱金香 🌳大樹/🌵仙人掌 🏠房子/🏰城堡 🏖️海灘/🏔️高山 🐧企鵝/🦭海豹 🦒長頸鹿/🦌梅花鹿
🐍蛇/🐛毛毛蟲 🦖恐龍/🐊鱷魚 🐑綿羊/🐐山羊 🦀螃蟹/🦐蝦子 🐙章魚/🦑魷魚 🍿爆米花/🍭棒棒糖 🥤汽水/🧋珍珠奶茶 🎸吉他/🎻小提琴
🥁鼓/🎺喇叭 🚒消防車/🚑救護車 🚓警車/🚕計程車 🚀火箭/🛸飛碟 🐼熊貓/🐨無尾熊 🐭老鼠/🐿️松鼠 🦜鸚鵡/🐦小鳥 🦊狐狸/🐺野狼
🍙飯糰/🍣壽司 🥞鬆餅/🧇格子鬆餅 🍗雞腿/🌭熱狗 🎁禮物/🧧紅包 🔑鑰匙/🔒鎖頭 🕯️蠟燭/💡燈泡 ⏰鬧鐘/⌚手錶 🥚雞蛋/🥔馬鈴薯
🐻棕熊/🦝浣熊 🧸玩偶熊/🪀溜溜球 🍐水梨/🍏青蘋果 🦔刺蝟/🦫河狸 🐌蝸牛/🐚貝殼 🌋火山/⛰️山`;
  const ADULT_RAW = `珍珠奶茶/椰果奶茶 牛肉麵/擔仔麵 小籠包/湯包 臭豆腐/麻辣鴨血 滷肉飯/雞肉飯 蚵仔煎/蚵仔麵線 鹹酥雞/雞排 豆花/仙草
蘿蔔糕/芋頭糕 水餃/鍋貼 肉圓/碗粿 刈包/潤餅 火鍋/麻辣燙 壽司/生魚片 拉麵/烏龍麵 披薩/義大利麵 漢堡/三明治 薯條/洋芋片
咖啡/奶茶 可樂/沙士 啤酒/紅酒 豆漿/米漿 燒餅/油條 蛋餅/飯糰 鳳梨酥/太陽餅 月餅/粽子 湯圓/元宵 芒果冰/雪花冰 布丁/奶酪
蛋塔/泡芙 鬆餅/可麗餅 冰淇淋/霜淇淋 醬油/醋 香菜/芹菜 高麗菜/大白菜 地瓜/芋頭 芒果/木瓜 柳丁/橘子 荔枝/龍眼 便當/自助餐
牛排/豬排 炒飯/炒麵 甜不辣/關東煮 圖書館/書店 電影院/劇場 便利商店/超市 夜市/菜市場 醫院/診所 機場/高鐵站 動物園/水族館
遊樂園/公園 健身房/游泳池 咖啡廳/早餐店 學校/補習班 海邊/溪邊 溫泉/三溫暖 寺廟/教堂 百貨公司/大賣場 銀行/郵局 警察局/消防局
墾丁/綠島 九份/淡水 日月潭/阿里山 KTV/網咖 民宿/飯店 醫生/護理師 老師/教授 警察/保全 廚師/麵包師傅 律師/法官 消防員/救生員
機師/空服員 歌手/演員 記者/主播 設計師/工程師 理髮師/美甲師 外送員/快遞員 公車司機/計程車司機 牙醫/獸醫 農夫/漁夫 魔術師/小丑
作家/編劇 攝影師/畫家 會計師/銀行員 導遊/領隊 網紅/直播主 手機/平板 耳機/喇叭 牙刷/牙線 洗髮精/沐浴乳 枕頭/抱枕 棉被/毛毯
雨傘/雨衣 眼鏡/隱形眼鏡 口罩/面膜 手錶/手環 鑰匙/門卡 吹風機/電風扇 冰箱/冷氣 電鍋/微波爐 洗衣機/烘衣機 拖鞋/涼鞋 高跟鞋/皮鞋
領帶/領結 項鍊/手鍊 戒指/耳環 口紅/腮紅 香水/乳液 鉛筆/原子筆 橡皮擦/立可帶 剪刀/美工刀 膠帶/膠水 字典/課本 地圖/導航 時鐘/鬧鐘
蠟燭/手電筒 撲克牌/麻將 象棋/圍棋 衛生紙/濕紙巾 行李箱/背包 安全帽/鴨舌帽 存錢筒/錢包 筷子/湯匙 籃球/排球 羽毛球/網球 桌球/撞球
游泳/潛水 爬山/露營 跑步/健走 瑜珈/皮拉提斯 滑雪/衝浪 唱歌/跳舞 釣魚/划船 拳擊/跆拳道 足球/橄欖球 馬拉松/鐵人三項 腳踏車/機車
老虎/獅子 企鵝/海豹 蚊子/蒼蠅 蟑螂/老鼠 烏龜/蝸牛 海豚/鯨魚 貓頭鷹/老鷹 鸚鵡/八哥 無尾熊/袋鼠 鴿子/麻雀 畫蛇添足/多此一舉
對牛彈琴/雞同鴨講 守株待兔/坐享其成 一石二鳥/一舉兩得 亡羊補牢/臨時抱佛腳 狐假虎威/仗勢欺人 井底之蛙/坐井觀天 半途而廢/虎頭蛇尾
三心二意/心不在焉 胸有成竹/十拿九穩 杯弓蛇影/草木皆兵 掩耳盜鈴/自欺欺人 刻舟求劍/緣木求魚 塞翁失馬/因禍得福 七上八下/忐忑不安
一見鍾情/日久生情 初戀/暗戀 結婚/訂婚 生日/週年紀念 情人節/七夕 中秋節/端午節 過年/跨年 吸血鬼/狼人 天使/仙女 外星人/機器人
魔法/超能力 颱風/地震 彩虹/極光 打噴嚏/打嗝 失眠/熬夜 減肥/健身 加班/出差 面試/考試 搬家/裝潢 網購/團購 自拍/直播 簡訊/電子郵件
紅包/禮金 婚禮/畢業典禮 鬼屋/密室逃脫 捷運/公車 高鐵/台鐵 計程車/共享單車`;
  const parseKid = s => { const m = s.match(/^([^㐀-鿿]+)(.+)$/); return m ? { e: m[1], w: m[2] } : { e: '❓', w: s }; };
  const KID = KID_RAW.split(/\s+/).filter(Boolean).map(x => x.split('/').map(parseKid));
  const ADULT = ADULT_RAW.split(/\s+/).filter(Boolean).map(x => x.split('/').map(w => ({ w })));
  // kid clue stickers
  const STK = [['🍽️', '能吃'], ['🍬', '甜甜的'], ['🐾', '動物'], ['🕊️', '會飛'], ['💧', '水裡'], ['🔊', '會叫'],
    ['🏠', '家裡有'], ['🌳', '外面有'], ['🤏', '小小的'], ['🐘', '大大的'], ['🔴', '紅紅的'], ['🟡', '黃黃的']];
  const BOT_CLUES = ['很常見', '我很喜歡', '有點貴', '大家都有', '圓圓的', '跟生活有關', '小時候常看到', '可以分享', '有很多種', '顏色很多', '台灣很多', '週末會想到'];
  const norm = s => String(s || '').replace(/[\s　]/g, '').toLowerCase();
  const MAXC = 12;

  LGAMES.push({
    id: 'spy', name: '誰是臥底', icon: '🕵️', col: '#6c5ce7', cat: 'party',
    blurb: '大家拿到一樣的詞，只有臥底不一樣', players: [3, 6],
    rules: kid => kid ? [
      '手機會出現一張圖，偷偷看，不要給別人看！',
      '有一個人的圖不一樣，他就是「臥底」🕵️（他自己也不知道喔）',
      '輪流用嘴巴說說看你的東西，不能直接說出名字',
      '大家投票：誰的東西不一樣？找到臥底就贏了！'
    ] : [
      '每人手機拿到一個詞；臥底拿到相似但不同的詞，沒人知道自己是不是臥底',
      '依序描述自己的詞：打字（12 字內）或直接用說的，不能說出詞本身',
      '每輪描述完投票，最高票出局並公開身分；平手重投一次',
      '找出所有臥底平民就贏；臥底撐到只剩 2 人或撐過最後一輪就贏（6 人局有 2 個臥底）'
    ],

    host(ctx) {
      const kid = ctx.kid, ids = ctx.players.map(p => p.id), n = ids.length, now = () => ctx.now();
      const pair = (kid ? KID : ADULT)[rint((kid ? KID : ADULT).length)];
      const flip = Math.random() < 0.5, civW = pair[flip ? 1 : 0], spyW = pair[flip ? 0 : 1];
      const nSpy = !kid && n >= 6 ? 2 : 1;
      const spies = shuffle(ids.slice()).slice(0, nSpy);
      const isSpy = id => spies.includes(id);
      const base = shuffle(ids.slice());
      const alive = new Set(ids), outs = [];
      const TALK = kid ? 30 : 40, VOTE = kid ? 30 : 30, LOOK = kid ? 14 : 10;
      const rmax = kid ? 3 : Math.max(3, n - 1);
      let ph = 'look', r = 0, T = now() + LOOK, tm = LOOK, over = false, win = null, why = '';
      let order = base.slice(), idx = -1, curT0 = 0, clues = [], votes = {}, cand = [], revote = false, rv = null;
      const ready = new Set();
      const name = id => { const p = ctx.players.find(q => q.id === id); return p ? p.name : '?'; };
      const cur = () => ph === 'talk' && idx >= 0 && idx < order.length ? order[idx] : null;
      const push = () => ctx.push();

      function startRound() {
        r++; ph = 'talk'; revote = false;
        const al = base.filter(id => alive.has(id)), k = (r - 1) % al.length;
        order = al.slice(k).concat(al.slice(0, k));
        clues.push([]); idx = -1; T = now() + 1.8; tm = 0;
        ctx.sound('*', 'whoosh'); push();
      }
      function nextSpeaker() {
        idx++;
        if (idx >= order.length) { T = now() + 1.6; tm = 0; push(); return; }
        const c = order[idx]; curT0 = now(); T = now() + TALK; tm = TALK;
        ctx.sound(c, 'turn'); push();
      }
      function speak(id, k, t, s) {
        clues[r - 1].push({ id, k, t: t || '', s: s || [] });
        if (k === 'type' || k === 'stk' || k === 'say') ctx.sound('*', 'pop');
        nextSpeaker();
      }
      function startVote(c) {
        ph = 'vote'; cand = c; votes = {}; T = now() + VOTE; tm = VOTE; rv = null;
        ctx.sound('*', 'go'); push();
      }
      const canVote = id => alive.has(id) && cand.some(c => c !== id);
      const pending = () => [...alive].filter(id => canVote(id) && !(id in votes) && ctx.online(id));
      function closeVote() {
        const tally = {}; cand.forEach(c => tally[c] = 0);
        const list = shuffle(Object.entries(votes));
        list.forEach(([, t]) => tally[t]++);
        const mx = Math.max(0, ...Object.values(tally));
        const top = mx > 0 ? cand.filter(c => tally[c] === mx) : [];
        const out = top.length === 1 ? top[0] : null;
        const tie = top.length > 1 ? top : null;
        ph = 'reveal'; tm = 0;
        rv = { votes: list, n: 0, st: 0, out, tie, none: mx === 0, again: !!tie && !kid && !revote };
        T = now() + 0.9; push();
      }
      function stepReveal() {
        if (rv.st === 0) {
          if (rv.n < rv.votes.length) { rv.n++; ctx.sound('*', 'card'); T = now() + (kid ? 0.9 : 0.75); }
          else {
            rv.st = 1; T = now() + 4.2;
            if (rv.out) { alive.delete(rv.out); outs.push({ id: rv.out, spy: isSpy(rv.out), r }); ctx.sound('*', isSpy(rv.out) ? 'star' : 'wrong'); }
            else ctx.sound('*', 'buzz');
          }
          push();
        } else proceed();
      }
      function proceed() {
        if (rv.out) {
          const sa = spies.filter(id => alive.has(id)).length, ca = alive.size - sa;
          if (sa === 0) return end('civ', 'found');
          if (sa >= ca) return end('spy', 'few');
        }
        if (rv.again) { revote = true; return startVote(rv.tie); }
        if (r >= rmax) return end('spy', 'rounds');
        startRound();
      }
      function end(w, y) { ph = 'end'; win = w; why = y; T = now() + 7; tm = 0; ctx.sound('*', w === 'civ' ? 'star' : 'boom'); push(); }

      return {
        get over() { return over; },
        tick() {
          const t = now();
          if (ph === 'look') {
            if (t >= T || ids.every(id => ready.has(id) || !ctx.online(id))) startRound();
          } else if (ph === 'talk') {
            const c = cur();
            if (idx < 0) { if (t >= T) nextSpeaker(); }
            else if (!c) { if (t >= T) startVote([...alive]); }
            else if (!ctx.online(c) && t - curT0 >= 2.5) speak(c, 'skip');
            else if (t >= T) speak(c, 'time');
          } else if (ph === 'vote') {
            if (t >= T || pending().length === 0) closeVote();
          } else if (ph === 'reveal') {
            if (t >= T) stepReveal();
          } else if (ph === 'end') {
            if (t >= T) over = true;
          }
        },
        msg(id, d) {
          if (!d || typeof d !== 'object' || !ids.includes(id)) return;
          if (d.ready && ph === 'look') { ready.add(id); push(); return; }
          if (d.done && ph === 'talk' && cur() === id) {
            if (kid) {
              const s = Array.isArray(d.s) ? [...new Set(d.s.map(x => x | 0).filter(x => x >= 0 && x < STK.length))].slice(0, 2) : [];
              speak(id, s.length ? 'stk' : 'say', '', s);
            } else {
              const t = String(d.t || '').replace(/[\u0000-\u001f<>]/g, '').trim();
              if ([...t].length > MAXC) { ctx.toast(id, `提示最多 ${MAXC} 個字`); return; }
              const w = norm(isSpy(id) ? spyW.w : civW.w);
              if (t && norm(t).includes(w)) { ctx.toast(id, '不能說出你的詞喔！換個說法'); ctx.sound(id, 'wrong'); return; }
              speak(id, t ? 'type' : 'say', t);
            }
            return;
          }
          if (d.vote != null && ph === 'vote' && canVote(id) && !(id in votes) && cand.includes(d.vote) && d.vote !== id) {
            votes[id] = d.vote; push();
          }
        },
        leave() { push(); },
        back() { push(); },
        view(id) {
          const me = id && ids.includes(id) ? id : null;
          const v = {
            ph, r, rmax, ns: nSpy, order, al: ids.filter(x => alive.has(x)), outs, cur: cur(), idx,
            tl: Math.max(0, Math.round((T - now()) * 10) / 10), tm, cl: clues
          };
          if (v.cur) v.off = !ctx.online(v.cur);
          if (ph === 'look') v.rd = ids.filter(x => ready.has(x));
          if (ph === 'vote') { v.cand = cand; v.vd = Object.keys(votes); v.rev = revote; v.cv = ids.filter(x => canVote(x) && (ctx.online(x) || x in votes)); if (me) v.mv = votes[me] || null; }
          if (ph === 'reveal') {
            v.rv = { votes: rv.votes.slice(0, rv.n), tot: rv.votes.length, st: rv.st, rev: revote };
            if (rv.st) Object.assign(v.rv, { out: rv.out, spy: rv.out ? isSpy(rv.out) : false, tie: rv.tie, none: rv.none, again: rv.again, left: spies.filter(x => alive.has(x)).length });
          }
          if (ph === 'end') v.end = { win, why, cw: civW, sw: spyW, spies };
          if (me) v.my = isSpy(me) ? spyW : civW;
          return v;
        },
        results() {
          const names = spies.map(name).join('、');
          const wordTxt = x => kid ? x.e + ' ' + x.w : x.w;
          const rows = ids.map(id => {
            const sp = isSpy(id), won = win ? (win === 'civ') !== sp : false;
            const line = !win ? (sp ? '臥底' : '平民') : sp ? (won ? '臥底・成功躲到最後' : (kid ? '臥底・被找到了！' : '臥底・被抓到了')) : (won ? '平民・找到臥底！' : '平民・沒找到臥底');
            return { id, key: won ? 1 : 0, line };
          });
          return {
            rows, noWinner: !win,
            title: !win ? `臥底是 ${names}` : win === 'civ' ? `找到臥底 ${names} 了！` : `臥底 ${names} 躲到最後！`,
            sub: `平民的詞：${wordTxt(civW)}　·　臥底的詞：${wordTxt(spyW)}`
          };
        }
      };
    },

    client(root, api) {
      if (!document.getElementById('sy-style')) {
        const st = document.createElement('style'); st.id = 'sy-style'; st.textContent = CSS; document.head.appendChild(st);
      }
      const kid = api.kid, me = api.me, tv = api.isTable;
      root.innerHTML = `<div class="sy ${kid ? 'sy-kid' : ''} ${tv ? 'sy-tv' : ''} ${me ? '' : 'sy-pub'}">
        <div class="sy-main">
          <div class="sy-top"><span class="sy-rd"></span><span class="sy-ph"></span><span class="sy-tm" hidden><b></b></span></div>
          <div class="sy-bar"><i></i></div>
          ${me ? '<div class="sy-card"></div>' : ''}
          <div class="sy-order"></div>
          <div class="sy-act"><div class="sy-a"></div><div class="sy-b"></div></div>
        </div>
        <div class="sy-side"><div class="sy-clues"></div></div>
        <div class="sy-ov" hidden></div>
      </div>`;
      const Q = s => root.querySelector(s);
      const wrap = Q('.sy'), elRd = Q('.sy-rd'), elPh = Q('.sy-ph'), elTm = Q('.sy-tm'), elBar = Q('.sy-bar i'),
        elCard = Q('.sy-card'), elOrder = Q('.sy-order'), elA = Q('.sy-a'), elB = Q('.sy-b'), elClues = Q('.sy-clues'), elOv = Q('.sy-ov');
      const P = id => api.player(id) || { name: '?', col: 0, animal: 0 };
      const av = (id, sz) => `<img alt="" src="${api.avatar(P(id), sz || 96)}">`;
      const nm = id => esc(P(id).name) + (id === me ? '（你）' : '');
      const set = (el, key, html) => { if (el._k === key) return false; el._k = key; el.innerHTML = html; return true; };
      const wordHTML = w => w ? (w.e ? `<span class="sy-we">${w.e}</span>` : '') + `<span class="sy-ww">${esc(w.w)}</span>` : '';

      let V = null, tEnd = 0, tTot = 0, lastTick = -1, peek = false, peekT = 0, sel = [], myVote = null, ovT = 0, lastOvKey = '', lastCur = null, lastPh = '';
      const ro = new ResizeObserver(() => wrap.classList.toggle('sy-wide', root.clientWidth >= 760));
      ro.observe(root);

      // word card: tap to peek / hide
      if (elCard) elCard.onclick = () => {
        if (!V || V.ph === 'look' || V.ph === 'end') return;
        peek = !peek; peekT = performance.now(); api.sfx('flip'); drawCard();
      };
      function drawCard() {
        if (!elCard || !V || !V.my) return;
        const out = !V.al.includes(me), look = V.ph === 'look', endp = V.ph === 'end';
        const show = look || endp || peek;
        set(elCard, [look, endp, show, out].join(), `<div class="sy-wc ${show ? 'on' : ''} ${look ? 'big' : ''}">
            <div class="sy-wf"><span class="sy-wq">🙈</span><span>${kid ? '點我偷看我的圖' : '點一下偷看我的詞'}</span><small>別讓旁邊的人看到喔</small></div>
            <div class="sy-wb"><small>${look ? (kid ? '這是你的東西，記住它！' : '你的詞（記住它）') : kid ? '我的東西' : '我的詞'}</small><div class="sy-wbody">${wordHTML(V.my)}</div>${look || endp ? '' : '<small>點一下藏起來</small>'}</div>
          </div>${out && !endp ? `<div class="sy-outtag">${kid ? '你先休息一下，看大家玩 👀' : '你已出局，繼續觀戰'}</div>` : ''}`);
      }

      function drawTop() {
        const v = V;
        elRd.textContent = v.ph === 'look' ? (kid ? '準備' : '發詞') : v.ph === 'end' ? '結束' : `第 ${v.r}/${v.rmax} 輪`;
        let t = '';
        const c = v.cur;
        if (v.ph === 'look') t = kid ? '👀 偷偷看你的圖' : '👀 看你的詞';
        else if (v.ph === 'talk') t = c ? (c === me ? '🗣️ 輪到你說了！' : `🗣️ ${esc(P(c).name)} 在說`) : v.idx < 0 ? `🎬 第 ${v.r} 輪開始` : '🗳️ 準備投票';
        else if (v.ph === 'vote') t = v.rev ? '🗳️ 平手！再投一次' : (kid ? '🗳️ 誰不一樣？' : '🗳️ 投票時間');
        else if (v.ph === 'reveal') t = '📣 開票';
        else if (v.ph === 'end') t = v.end.win === 'civ' ? '🎉 平民贏了' : '🕵️ 臥底贏了';
        elPh.innerHTML = t;
      }

      function orderIds() {
        const v = V, outIds = v.outs.map(o => o.id);
        const seq = v.order.filter(id => !outIds.includes(id));
        return seq.concat(outIds.filter(id => !seq.includes(id)));
      }
      function drawOrder() {
        const v = V, spoke = v.ph === 'talk' && v.cl[v.r - 1] ? v.cl[v.r - 1].map(c => c.id) : [];
        const list = orderIds();
        const key = JSON.stringify([list, v.cur, spoke, v.outs, v.vd, v.rd, v.ph, v.cv, api.players().map(p => p.online)]);
        set(elOrder, key, list.map((id, i) => {
          const o = v.outs.find(x => x.id === id), p = P(id);
          const cls = ['sy-pl'];
          let badge = '';
          if (o) { cls.push('out'); badge = o.spy ? '🕵️' : (kid ? '😊' : '🙂'); }
          else if (v.ph === 'talk' && id === v.cur) { cls.push('cur'); badge = '🗣️'; }
          else if (v.ph === 'talk' && spoke.includes(id)) { cls.push('done'); badge = '✔'; }
          else if (v.ph === 'vote' && v.vd.includes(id)) { cls.push('done'); badge = '✔'; }
          else if (v.ph === 'vote' && v.cv.includes(id)) { cls.push('wait'); badge = '…'; }
          else if (v.ph === 'look' && v.rd.includes(id)) { cls.push('done'); badge = '✔'; }
          if (p.online === false) cls.push('off');
          if (id === me) cls.push('me');
          const no = o ? '' : `<span class="sy-no">${i + 1}</span>`;
          return `<div class="${cls.join(' ')}">${no}<div class="sy-av">${av(id, tv ? 160 : 96)}${badge ? `<span class="sy-bd">${badge}</span>` : ''}</div><div class="sy-pn">${esc(p.name)}${p.online === false ? '<small>離線</small>' : ''}</div>${o ? `<div class="sy-role ${o.spy ? 'spy' : ''}">${o.spy ? '臥底' : '平民'}</div>` : ''}</div>`;
        }).join(''));
      }

      function clueHTML(c) {
        let body;
        if (c.k === 'type') body = `<span class="sy-ct">「${esc(c.t)}」</span>`;
        else if (c.k === 'stk') body = c.s.map(i => `<span class="sy-stk">${STK[i][0]}<small>${STK[i][1]}</small></span>`).join('');
        else if (c.k === 'say') body = `<span class="sy-cs">🗣️ 用說的</span>`;
        else if (c.k === 'skip') body = `<span class="sy-cs">😴 不在，跳過</span>`;
        else body = `<span class="sy-cs">⏰ 時間到</span>`;
        return body;
      }
      let clueCount = 0;
      function drawClues() {
        const v = V, total = v.cl.reduce((a, r) => a + r.length, 0);
        const key = JSON.stringify(v.cl) + v.r;
        const isNew = total > clueCount; clueCount = total;
        if (!set(elClues, key, '')) return;
        let h = `<div class="sy-ch">📝 ${kid ? '大家說了什麼' : '提示紀錄'}</div>`;
        if (!v.cl.length) h += `<div class="sy-empty">${kid ? '等一下大家會輪流說說看～' : '還沒有提示'}</div>`;
        for (let ri = v.cl.length - 1; ri >= 0; ri--) {
          const list = v.cl[ri];
          h += `<div class="sy-cr"><div class="sy-crh">第 ${ri + 1} 輪</div>`;
          if (!list.length) h += `<div class="sy-empty">${ri === v.r - 1 && v.ph === 'talk' ? '仔細聽…' : '—'}</div>`;
          list.forEach((c, i) => {
            const fresh = isNew && ri === v.cl.length - 1 && i === list.length - 1;
            const o = v.outs.find(x => x.id === c.id);
            h += `<div class="sy-cl ${fresh ? 'new' : ''} ${o ? 'gone' : ''}">${av(c.id, 64)}<div><div class="sy-cn">${esc(P(c.id).name)}</div><div class="sy-cb">${clueHTML(c)}</div></div></div>`;
          });
          h += '</div>';
        }
        elClues.innerHTML = h;
      }

      /* ----- action panel ----- */
      function drawAct() {
        const v = V, alive = me && v.al.includes(me);
        if (v.ph === 'look') {
          const done = v.rd.includes(me);
          set(elA, 'look' + done, me ? `<div class="sy-msg">${kid ? '記住你的圖，<b>不要給別人看</b>！<br>你可能是臥底🕵️，也可能不是喔～' : '記住你的詞，<b>不要給別人看</b>。<br>你可能是臥底，自己也不知道。'}</div>
            ${done ? '<div class="sy-wait">✔ 等其他人…</div>' : `<button class="btn acc wide sy-big" data-ready>${kid ? '我記住了！👍' : '我記住了'}</button>`}`
            : `<div class="sy-msg sy-hero">📱 大家正在偷看自己的${kid ? '圖' : '詞'}…<br><small>大螢幕不會顯示答案</small></div>`);
          set(elB, 'lk' + v.rd.length, `<div class="sy-prog">${v.rd.length}/${v.order.length} 人準備好了</div>`);
          return;
        }
        if (v.ph === 'talk') {
          set(elB, '', '');
          const c = v.cur;
          if (!c) {
            set(elA, 'tk' + v.r + v.idx, v.idx < 0
              ? `<div class="sy-msg sy-hero sy-pop">🎬 第 ${v.r} 輪<br><small>${kid ? '輪流說說看你的東西' : '依序描述你的詞'}</small></div>`
              : `<div class="sy-msg sy-hero sy-pop">✅ 大家都說完了<br><small>${kid ? '想一想，誰不一樣？' : '準備投票…'}</small></div>`);
            return;
          }
          if (c === me) { drawSpeak(); return; }
          set(elA, 'ls' + v.r + c + v.off, `<div class="sy-now sy-pop">${av(c, tv ? 240 : 160)}<div><div class="sy-nowt">${esc(P(c).name)} ${v.off ? '不在線上' : (kid ? '正在說…' : '正在描述…')}</div>
            <div class="sy-nows">${v.off ? '馬上跳過 ⏭️' : kid ? '仔細聽！他的東西跟你一樣嗎？' : '仔細聽，他的詞跟你一樣嗎？'}</div></div></div>`);
          return;
        }
        if (v.ph === 'vote') { drawVote(alive); return; }
        if (v.ph === 'reveal') { drawReveal(); return; }
        if (v.ph === 'end') { drawEnd(); return; }
      }

      function drawSpeak() {
        const v = V;
        if (!set(elA, 'sp' + v.r + v.idx, kid ? `<div class="sy-speak sy-pop">
            <div class="sy-yt">輪到你了！🗣️</div>
            <div class="sy-hint">用嘴巴說說看你的東西（不能說出名字喔）<br>也可以點 1～2 個貼圖幫忙</div>
            <div class="sy-stks">${STK.map((s, i) => `<button class="sy-sb" data-s="${i}"><span>${s[0]}</span><small>${s[1]}</small></button>`).join('')}</div>
            <button class="btn acc wide sy-big" data-done>我說完了 ✔</button></div>`
          : `<div class="sy-speak sy-pop">
            <div class="sy-yt">輪到你了！</div>
            <div class="sy-hint">打一句提示，或直接用說的再按「我說完了」<br>不能說出你的詞本身</div>
            <div class="sy-in"><input class="txt" maxlength="${MAXC}" placeholder="打一個提示（可留空）" enterkeyhint="send" autocomplete="off"><span class="sy-cnt">0/${MAXC}</span></div>
            <button class="btn acc wide sy-big" data-done>我說完了 ✔</button></div>`)) return;
        sel = [];
        const inp = elA.querySelector('input'), cnt = elA.querySelector('.sy-cnt');
        if (inp) {
          inp.addEventListener('input', () => { cnt.textContent = [...inp.value].length + '/' + MAXC; inp.classList.remove('bad'); });
          inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) elA.querySelector('[data-done]').click(); });
        }
        elA.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
          const i = +b.dataset.s;
          if (sel.includes(i)) sel = sel.filter(x => x !== i); else { sel.push(i); if (sel.length > 2) sel.shift(); }
          api.sfx('pop');
          elA.querySelectorAll('[data-s]').forEach(x => x.classList.toggle('on', sel.includes(+x.dataset.s)));
        });
        elA.querySelector('[data-done]').onclick = () => {
          if (inp) {
            const t = inp.value.trim();
            if (t && V.my && norm(t).includes(norm(V.my.w))) {
              inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad');
              api.sfx('wrong'); api.vibrate(120); api.toast('不能說出你的詞喔！換個說法'); return;
            }
            api.send({ done: 1, t });
          } else api.send({ done: 1, s: sel });
          api.sfx('pop');
        };
      }

      function drawVote(alive) {
        const v = V, others = v.cand.filter(id => id !== me);
        const voted = v.mv || (myVote && myVote.r === v.r + '' + v.rev ? myVote.id : null);
        const canV = alive && others.length && !voted;
        set(elA, 'v' + v.r + v.rev + (canV ? 'c' : voted || 'x') + v.cand.join(), canV
          ? `<div class="sy-vh">${v.rev ? '平手！再投一次 ' : ''}${kid ? '你覺得誰拿到<b>不一樣</b>的東西？點他！' : '你覺得誰是<b>臥底</b>？'}</div>
             <div class="sy-vg">${others.map(id => `<button class="sy-vb" data-v="${id}">${av(id, 128)}<span>${esc(P(id).name)}</span></button>`).join('')}</div>`
          : voted ? `<div class="sy-msg sy-pop">✔ 你投給了<div class="sy-vme">${av(voted, 96)}<b>${esc(P(voted).name)}</b></div>${kid ? '等大家投完～' : '等其他人投票…'}</div>`
            : `<div class="sy-msg sy-hero">🗳️ ${v.rev ? '平手！在 ' + v.cand.map(id => esc(P(id).name)).join(' 和 ') + ' 之間重投' : kid ? '大家在投票：誰不一樣？' : '投票中…'}</div>`);
        elA.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
          myVote = { r: v.r + '' + v.rev, id: b.dataset.v };
          api.send({ vote: b.dataset.v }); api.sfx('coin'); api.vibrate(40); drawVote(alive);
        });
        set(elB, 'vb' + v.vd.length + '/' + v.cv.length, `<div class="sy-prog">已投票 ${v.vd.length}/${v.cv.length}<div class="sy-pb"><i style="width:${v.cv.length ? v.vd.length / v.cv.length * 100 : 0}%"></i></div></div>`);
      }

      function drawReveal() {
        const v = V, R = v.rv, key = 'rv' + v.r + R.rev;
        if (set(elA, key, `<div class="sy-rvh">📣 ${kid ? '大家投給誰？' : '開票！'}</div><div class="sy-rvl"></div><div class="sy-tally"></div><div class="sy-res"></div>`)) elA._n = 0;
        const L = elA.querySelector('.sy-rvl');
        while (elA._n < R.votes.length) {
          const [a, b] = R.votes[elA._n++];
          const d = document.createElement('div'); d.className = 'sy-vl';
          d.innerHTML = `${av(a, 64)}<span class="sy-vn">${esc(P(a).name)}</span><span class="sy-arr">➜</span>${av(b, 64)}<span class="sy-vn">${esc(P(b).name)}</span>`;
          L.appendChild(d);
        }
        const tal = {}; R.votes.forEach(([, b]) => tal[b] = (tal[b] || 0) + 1);
        set(elA.querySelector('.sy-tally'), JSON.stringify(tal), Object.keys(tal).sort((a, b) => tal[b] - tal[a]).map(id => `<span class="sy-tc">${av(id, 64)}<b>${tal[id]}</b>票</span>`).join(''));
        if (!R.votes.length && !R.st) set(elA.querySelector('.sy-res'), 'w', `<div class="sy-wait">開票中…</div>`);
        if (R.st) {
          const o = R.out;
          set(elA.querySelector('.sy-res'), 'r', o
            ? `<div class="sy-rc ${R.spy ? 'spy' : 'civ'}">${av(o, 160)}<div><div class="sy-rt">${esc(P(o).name)}${o === me ? '（你）' : ''}</div><div class="sy-rs">${R.spy ? (kid ? '被找到了！他就是臥底 🕵️' : '是臥底！') : (kid ? '不是臥底～先休息一下' : '出局 — 他是平民')}</div>${R.spy && R.left ? `<div class="sy-rm">還有 ${R.left} 個臥底躲著…</div>` : ''}</div></div>`
            : `<div class="sy-rc tie"><div class="sy-rq">${R.none ? '🤷' : '⚖️'}</div><div><div class="sy-rt">${R.none ? '沒有人投票' : '平手！'}</div><div class="sy-rs">${R.again ? '在平手的人之間再投一次' : kid ? '這一輪沒有人被找到' : '這輪沒有人出局'}</div></div></div>`);
        }
        set(elB, '', '');
      }

      function drawEnd() {
        const v = V, E = v.end, civWin = E.win === 'civ';
        const why = E.why === 'found' ? (kid ? '臥底被找到了！' : '臥底全部被抓到了！') : E.why === 'rounds' ? `臥底撐過了 ${v.rmax} 輪！` : '臥底躲到最後！';
        set(elA, 'end', `<div class="sy-end sy-pop">
          <div class="sy-et">${civWin ? '🎉 平民贏了！' : '🕵️ 臥底贏了！'}</div><div class="sy-es">${why}</div>
          <div class="sy-ew"><div class="sy-ewc"><small>平民的${kid ? '東西' : '詞'}</small>${wordHTML(E.cw)}</div><div class="sy-ewc spy"><small>臥底的${kid ? '東西' : '詞'}</small>${wordHTML(E.sw)}</div></div>
          <div class="sy-esp">臥底是 ${E.spies.map(id => `<span>${av(id, 64)}${esc(P(id).name)}${id === me ? '（你）' : ''}</span>`).join('')}</div></div>`);
        set(elB, '', '');
      }

      /* big moment overlay */
      function ov(key, html, ms, cls) {
        if (lastOvKey === key) return; lastOvKey = key;
        elOv.className = 'sy-ov ' + (cls || ''); elOv.innerHTML = html; elOv.hidden = false;
        clearTimeout(ovT); ovT = setTimeout(() => { elOv.hidden = true; }, ms);
      }
      elOv.onclick = () => { elOv.hidden = true; };

      const scrollAct = () => setTimeout(() => { try { if (me) elA.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { } }, 60);
      function moments(prev) {
        const v = V;
        if (v.ph === 'talk' && v.cur === me && me && lastCur !== me) {
          api.vibrate([120, 60, 120]); api.sfx('turn'); peek = true; peekT = performance.now(); drawCard(); scrollAct();
          ov('turn' + v.r + v.idx, `<div class="sy-ovb"><div class="sy-ovi">🗣️</div><div class="sy-ovt">輪到你了！</div></div>`, 1300, 'soft');
        }
        if (v.ph === 'vote' && (lastPh !== 'vote' || prev.rev !== v.rev)) { api.vibrate(80); scrollAct(); ov('vote' + v.r + v.rev, `<div class="sy-ovb"><div class="sy-ovi">🗳️</div><div class="sy-ovt">${v.rev ? '平手！再投一次' : '投票！'}</div></div>`, 1300, 'soft'); }
        if (v.ph === 'reveal' && v.rv.st && v.rv.out) {
          const o = v.rv.out, spy = v.rv.spy;
          if (lastOvKey !== 'out' + v.r + o && o === me) api.vibrate(300);
          ov('out' + v.r + o, `<div class="sy-ovb ${spy ? 'spy' : 'civ'}">${av(o, 240)}<div class="sy-ovt">${esc(P(o).name)}</div><div class="sy-stamp">${spy ? (kid ? '被找到了！' : '是臥底！') : (kid ? '不是臥底' : '是平民')}</div></div>`, 2600);
        }
        if (v.ph === 'end' && lastPh !== 'end') {
          ov('end', `<div class="sy-ovb ${v.end.win === 'civ' ? 'civ' : 'spy'}"><div class="sy-ovi">${v.end.win === 'civ' ? '🎉' : '🕵️'}</div><div class="sy-ovt">${v.end.win === 'civ' ? '平民贏了！' : '臥底贏了！'}</div></div>`, 1800);
        }
        if (v.ph === 'look' && lastPh !== 'look' && me) api.vibrate(60);
        lastCur = v.cur; lastPh = v.ph;
      }

      // timer
      const timer = setInterval(() => {
        if (!V || !tTot) { elTm.hidden = true; elBar.style.width = '0'; return; }
        const rem = Math.max(0, (tEnd - performance.now()) / 1000), s = Math.ceil(rem);
        elTm.hidden = false; elTm.querySelector('b').textContent = s;
        elTm.classList.toggle('low', s <= 5);
        elBar.style.width = (rem / tTot * 100).toFixed(1) + '%';
        elBar.parentNode.classList.toggle('low', s <= 5);
        const mine = (V.ph === 'talk' && V.cur === me) || (V.ph === 'vote' && me && V.cv && V.cv.includes(me) && !V.mv);
        if (mine && s <= 5 && s > 0 && s !== lastTick) { lastTick = s; api.sfx('tick'); }
        if (peek && V.ph !== 'look' && !(V.ph === 'talk' && V.cur === me) && performance.now() - peekT > 5000) { peek = false; drawCard(); }
      }, 200);

      return {
        view(v) {
          if (!v) return;
          const prev = V; V = v;
          tTot = v.tm || 0; tEnd = performance.now() + (v.tl || 0) * 1000;
          if (prev && prev.ph !== v.ph) lastTick = -1;
          if (v.ph === 'look') peek = false;
          if (v.ph !== 'vote') myVote = null;
          drawTop(); drawCard(); drawOrder(); drawAct(); drawClues(); moments(prev);
        },
        destroy() { clearInterval(timer); clearTimeout(ovT); ro.disconnect(); }
      };
    },

    bot(v, api) {
      const me = api.me; if (!v || !me) return;
      if (v.ph === 'look') { if (!v.rd.includes(me) && Math.random() < 0.4) api.send({ ready: 1 }); return; }
      if (v.ph === 'talk' && v.cur === me) {
        if (Math.random() > 0.3) return;
        if (api.kid) { const s = Math.random() < 0.6 ? [rint(STK.length)] : []; api.send({ done: 1, s }); return; }
        const w = v.my ? norm(v.my.w) : '';
        const ok = BOT_CLUES.filter(c => !norm(c).includes(w));
        api.send({ done: 1, t: Math.random() < 0.75 ? ok[rint(ok.length)] : '' });
        return;
      }
      if (v.ph === 'vote' && v.cv && v.cv.includes(me) && !v.mv && Math.random() < 0.35) {
        const o = v.cand.filter(id => id !== me); if (o.length) api.send({ vote: o[rint(o.length)] });
      }
    }
  });

  const CSS = `
.sy{position:absolute;inset:0;overflow:auto;-webkit-overflow-scrolling:touch;padding:10px 12px calc(16px + env(safe-area-inset-bottom,0px));
  background:radial-gradient(700px 400px at 100% 0,#efe9ff 0,transparent 70%),radial-gradient(600px 400px at 0 100%,#fff0e6 0,transparent 70%)}
.sy-main,.sy-side{display:flex;flex-direction:column;gap:10px;max-width:640px;margin:0 auto}
.sy-side{margin-top:10px}
.sy.sy-wide{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;overflow:hidden;padding:12px 16px}
.sy.sy-wide .sy-main,.sy.sy-wide .sy-side{overflow:auto;max-width:none;margin:0;min-height:0;padding-bottom:12px}
.sy-top{display:flex;align-items:center;gap:8px}
.sy-rd{background:#6c5ce7;color:#fff;font-weight:900;font-size:14px;border-radius:999px;padding:5px 12px;flex:none;font-family:var(--round)}
.sy-ph{flex:1;font-weight:900;font-size:19px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sy-tm{flex:none;font-family:var(--round);font-weight:700;font-size:20px;background:#fff;border-radius:999px;padding:3px 12px;box-shadow:0 2px 0 var(--line)}
.sy-tm::before{content:'⏱ ';font-size:15px}
.sy-tm.low{color:#fff;background:var(--bad);animation:sy-beat .5s infinite alternate}
.sy-bar{height:6px;border-radius:9px;background:#e4e2f7;overflow:hidden;margin-top:-4px}
.sy-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#8f7bff,#6c5ce7);border-radius:9px;transition:width .2s linear}
.sy-bar.low i{background:var(--bad)}
/* word card */
.sy-card{perspective:900px;cursor:pointer}
.sy-wc{position:relative;height:96px;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.3,1.4,.5,1),height .3s}
.sy-kid .sy-wc{height:150px}
.sy-wc.big{height:150px}.sy-kid .sy-wc.big{height:230px}
.sy-wc.on{transform:rotateY(180deg)}
.sy-wf,.sy-wb{position:absolute;inset:0;border-radius:22px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  box-shadow:0 4px 0 rgba(60,50,140,.25),0 10px 24px rgba(60,70,140,.12)}
.sy-wf{background:repeating-linear-gradient(45deg,#6c5ce7 0 14px,#7b6cf0 14px 28px);color:#fff;font-weight:900;font-size:18px}
.sy-wf .sy-wq{font-size:34px;line-height:1}
.sy-wf small,.sy-wb small{font-size:12px;font-weight:700;opacity:.75}
.sy-wb{background:#fff;transform:rotateY(180deg);border:4px solid #6c5ce7}
.sy-wbody{display:flex;align-items:center;gap:12px}
.sy-we{font-size:56px;line-height:1}
.sy-wc.big .sy-we{font-size:110px}
.sy-ww{font-size:34px;font-weight:900;letter-spacing:.06em}
.sy-wc.big .sy-ww{font-size:42px}
.sy-kid .sy-wc.big .sy-wbody{flex-direction:column;gap:4px}
.sy-outtag{text-align:center;font-weight:900;color:var(--mute);font-size:14px;margin-top:6px}
/* order */
.sy-order{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;background:#fff;border-radius:20px;padding:10px 6px 8px;box-shadow:0 2px 0 var(--line)}
.sy-pl{position:relative;display:flex;flex-direction:column;align-items:center;width:52px;transition:transform .3s,opacity .3s}
.sy-av{position:relative;width:48px;height:48px;border-radius:50%;background:#f3f1ff;display:grid;place-items:center;transition:box-shadow .3s}
.sy-av img{width:100%;height:100%}
.sy-bd{position:absolute;right:-6px;bottom:-4px;background:#fff;border-radius:999px;font-size:13px;min-width:22px;height:22px;display:grid;place-items:center;box-shadow:0 1px 3px rgba(0,0,0,.2);font-weight:900;color:var(--ok)}
.sy-no{position:absolute;left:0;top:-4px;z-index:1;font-family:var(--round);font-size:11px;font-weight:700;background:#ece9ff;color:#6c5ce7;border-radius:999px;width:18px;height:18px;display:grid;place-items:center}
.sy-pn{font-size:12px;font-weight:900;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;line-height:1.3}
.sy-pn small{display:block;color:var(--bad);font-size:10px}
.sy-pl.cur{transform:scale(1.14);z-index:1}
.sy-pl.cur .sy-av{box-shadow:0 0 0 4px #ffb347,0 0 18px 4px rgba(255,170,60,.6);animation:sy-bob 1s ease-in-out infinite}
.sy-pl.cur .sy-bd{color:inherit;background:#ffb347}
.sy-pl.me .sy-pn{color:#6c5ce7}
.sy-pl.out{opacity:.5;filter:grayscale(.8)}
.sy-pl.off .sy-av{opacity:.5}
.sy-pl.wait .sy-bd{color:var(--mute)}
.sy-role{font-size:10px;font-weight:900;background:#dfe7ff;border-radius:6px;padding:0 5px;color:var(--prid)}
.sy-role.spy{background:#ffe0e0;color:#c0262f}
/* action */
.sy-act{display:flex;flex-direction:column;gap:8px}
.sy-a:empty,.sy-b:empty{display:none}
.sy-msg{background:#fff;border-radius:20px;padding:14px;text-align:center;font-weight:700;font-size:16px;line-height:1.6;box-shadow:0 2px 0 var(--line)}
.sy-hero{font-size:22px;font-weight:900;padding:22px 14px}
.sy-hero small{font-size:14px;color:var(--mute);font-weight:700}
.sy-big{margin-top:10px;font-size:22px;min-height:62px}
.sy-wait{text-align:center;font-weight:900;color:var(--mute);padding:12px}
.sy-prog{text-align:center;font-weight:900;color:var(--mute);font-size:14px}
.sy-pb{height:10px;border-radius:9px;background:#e4e2f7;margin-top:6px;overflow:hidden}
.sy-pb i{display:block;height:100%;background:var(--ok);transition:width .4s}
.sy-now{display:flex;align-items:center;gap:12px;background:#fff8ec;border:3px solid #ffd59a;border-radius:22px;padding:12px}
.sy-now img{width:84px;height:84px;flex:none;animation:sy-bob 1s ease-in-out infinite}
.sy-nowt{font-size:21px;font-weight:900}
.sy-nows{color:var(--mute);font-weight:700;font-size:14px;margin-top:4px}
.sy-speak{background:#fff;border:4px solid #ffb347;border-radius:24px;padding:14px;box-shadow:0 0 0 6px rgba(255,179,71,.18)}
.sy-yt{font-size:28px;font-weight:900;text-align:center;color:var(--accd);animation:sy-beat .6s ease-in-out infinite alternate}
.sy-hint{text-align:center;color:var(--mute);font-weight:700;font-size:13.5px;margin:6px 0 10px;line-height:1.55}
.sy-in{position:relative}
.sy-in input{padding-right:58px;font-size:22px}
.sy-in input.bad{border-color:var(--bad);animation:sy-shake .4s}
.sy-cnt{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--mute);font-weight:700}
.sy-stks{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sy-sb{background:#f6f5ff;border:3px solid transparent;border-radius:16px;padding:6px 2px;display:flex;flex-direction:column;align-items:center;min-height:64px;transition:transform .15s}
.sy-sb span{font-size:28px;line-height:1.1}
.sy-sb small{font-size:12px;font-weight:900;color:var(--mute)}
.sy-sb.on{border-color:#ffb347;background:#fff3df;transform:scale(1.06)}
.sy-vh{font-size:19px;font-weight:900;text-align:center;line-height:1.5}
.sy-vg{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin-top:4px}
.sy-vb{background:#fff;border-radius:20px;padding:8px 4px 10px;display:flex;flex-direction:column;align-items:center;gap:2px;box-shadow:0 4px 0 var(--line);border:3px solid transparent;font-weight:900;font-size:16px;animation:sy-in .35s backwards}
.sy-vb:nth-child(2){animation-delay:.05s}.sy-vb:nth-child(3){animation-delay:.1s}.sy-vb:nth-child(4){animation-delay:.15s}.sy-vb:nth-child(5){animation-delay:.2s}
.sy-vb img{width:72px;height:72px}
.sy-kid .sy-vb img{width:96px;height:96px}
.sy-kid .sy-vb{font-size:19px}
.sy-vb:active{transform:translateY(3px);box-shadow:0 1px 0 var(--line);border-color:#6c5ce7}
.sy-vme{display:flex;align-items:center;justify-content:center;gap:8px;font-size:20px;margin:6px 0}
.sy-vme img{width:56px;height:56px}
.sy-rvh{font-size:20px;font-weight:900;text-align:center}
.sy-rvl{display:flex;flex-direction:column;gap:5px}
.sy-wide .sy-rvl{display:grid;grid-template-columns:1fr 1fr}
.sy-vl{display:flex;align-items:center;gap:6px;background:#fff;border-radius:14px;padding:4px 10px;font-weight:900;font-size:14px;animation:sy-slide .4s cubic-bezier(.3,1.4,.5,1)}
.sy-vl img{width:34px;height:34px}
.sy-vn{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sy-arr{color:var(--acc);font-size:18px;margin:0 4px}
.sy-tally{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.sy-tc{display:flex;align-items:center;gap:4px;background:#ece9ff;border-radius:999px;padding:3px 12px 3px 3px;font-weight:700;font-size:14px;animation:sy-in .3s}
.sy-tc img{width:32px;height:32px}
.sy-tc b{font-family:var(--round);font-size:20px;color:#6c5ce7}
.sy-rc{display:flex;align-items:center;gap:12px;border-radius:22px;padding:12px;animation:sy-stamp .5s cubic-bezier(.3,1.6,.5,1)}
.sy-rc img{width:84px;height:84px;flex:none}
.sy-rc.spy{background:#ffe3e3;border:3px solid #ff8a8a}
.sy-rc.civ{background:#e6f0ff;border:3px solid #9cbcff}
.sy-rc.tie{background:#fff7e0;border:3px solid #ffd27a}
.sy-rq{font-size:56px;line-height:1}
.sy-rt{font-size:24px;font-weight:900}
.sy-rs{font-size:16px;font-weight:900;color:var(--mute)}
.sy-rc.spy .sy-rs{color:#c0262f}
.sy-rm{font-size:13px;font-weight:700;color:var(--mute);margin-top:2px}
.sy-end{background:#fff;border-radius:24px;padding:16px;text-align:center;box-shadow:0 2px 0 var(--line)}
.sy-et{font-size:30px;font-weight:900}
.sy-es{color:var(--mute);font-weight:900}
.sy-ew{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
.sy-ewc{background:#e6f0ff;border-radius:18px;padding:10px 6px;display:flex;flex-direction:column;align-items:center;gap:2px}
.sy-ewc.spy{background:#ffe3e3}
.sy-ewc small{font-weight:900;color:var(--mute);font-size:13px}
.sy-ewc .sy-we{font-size:56px}
.sy-ewc .sy-ww{font-size:26px}
.sy-esp{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;font-weight:900}
.sy-esp span{display:inline-flex;align-items:center;gap:2px;background:#ffe3e3;border-radius:999px;padding:2px 10px 2px 2px}
.sy-esp img{width:32px;height:32px}
/* clues */
.sy-clues{background:#fff;border-radius:22px;padding:12px;box-shadow:0 2px 0 var(--line)}
.sy-ch{font-weight:900;font-size:16px;margin-bottom:6px}
.sy-cr{margin-top:6px}
.sy-crh{font-size:12px;font-weight:900;color:#6c5ce7;background:#f1efff;border-radius:999px;display:inline-block;padding:1px 10px;margin-bottom:4px}
.sy-cl{display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px dashed #ebe9f7}
.sy-cl:last-child{border-bottom:0}
.sy-cl img{width:38px;height:38px;flex:none}
.sy-cl.gone{opacity:.55}
.sy-cl.new{animation:sy-slide .45s cubic-bezier(.3,1.4,.5,1)}
.sy-cn{font-size:12px;font-weight:900;color:var(--mute)}
.sy-cb{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.sy-ct{font-size:19px;font-weight:900}
.sy-cs{font-size:14px;font-weight:700;color:var(--mute)}
.sy-stk{display:inline-flex;align-items:center;gap:3px;background:#fff3df;border-radius:999px;padding:1px 10px 1px 6px;font-size:22px}
.sy-stk small{font-size:13px;font-weight:900}
.sy-empty{color:var(--mute);font-size:13px;font-weight:700;padding:4px 0}
/* overlay */
.sy-ov{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:rgba(31,35,70,.55);animation:sy-fade .25s}
.sy-ov.soft{background:rgba(31,35,70,.3);pointer-events:none}
.sy-ovb{background:#fff;border-radius:30px;padding:22px 34px;text-align:center;animation:sy-stamp .5s cubic-bezier(.3,1.6,.5,1);box-shadow:0 20px 60px rgba(0,0,0,.3);border:5px solid #6c5ce7}
.sy-ovb.spy{border-color:#ff5a5a}.sy-ovb.civ{border-color:#5b8cff}
.sy-ovb img{width:150px;height:150px}
.sy-ovi{font-size:72px;line-height:1.1}
.sy-ovt{font-size:30px;font-weight:900}
.sy-stamp{display:inline-block;margin-top:8px;font-size:30px;font-weight:900;color:#fff;background:#ff5a5a;border-radius:14px;padding:4px 18px;transform:rotate(-6deg);animation:sy-stamp .5s .35s cubic-bezier(.3,1.8,.5,1) backwards}
.sy-ovb.civ .sy-stamp{background:#5b8cff}
.sy-pop{animation:sy-in .4s cubic-bezier(.3,1.5,.5,1)}
@keyframes sy-in{from{transform:scale(.7);opacity:0}}
@keyframes sy-fade{from{opacity:0}}
@keyframes sy-slide{from{transform:translateX(-30px);opacity:0}}
@keyframes sy-stamp{from{transform:scale(2.2) rotate(-8deg);opacity:0}}
@keyframes sy-bob{50%{transform:translateY(-4px)}}
@keyframes sy-beat{to{transform:scale(1.06)}}
@keyframes sy-shake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
/* public view / big screen */
.sy-pub .sy-order{padding:14px 8px}
.sy-tv{padding:20px 28px!important}
.sy-tv .sy-rd{font-size:24px;padding:8px 20px}
.sy-tv .sy-ph{font-size:40px}
.sy-tv .sy-tm{font-size:38px;padding:6px 20px}
.sy-tv .sy-bar{height:12px}
.sy-tv .sy-order{gap:12px;padding:22px 12px 16px;border-radius:28px}
.sy-tv .sy-pl{width:118px}
.sy-tv .sy-av{width:104px;height:104px}
.sy-tv .sy-pn{font-size:22px}
.sy-tv .sy-no{width:30px;height:30px;font-size:18px}
.sy-tv .sy-bd{font-size:24px;min-width:40px;height:40px;right:-8px}
.sy-tv .sy-role{font-size:16px;padding:1px 10px}
.sy-tv .sy-pl.cur{transform:scale(1.18)}
.sy-tv .sy-msg{font-size:26px}
.sy-tv .sy-hero{font-size:44px;padding:40px 20px}
.sy-tv .sy-hero small{font-size:24px}
.sy-tv .sy-now{padding:22px;gap:24px;border-radius:30px}
.sy-tv .sy-now img{width:170px;height:170px}
.sy-tv .sy-nowt{font-size:44px}
.sy-tv .sy-nows{font-size:24px}
.sy-tv .sy-prog{font-size:24px}
.sy-tv .sy-wait{font-size:28px}
.sy-tv .sy-pb{height:16px}
.sy-tv .sy-rvh{font-size:34px}
.sy-tv .sy-vl{font-size:24px;padding:6px 16px}
.sy-tv .sy-vl img{width:56px;height:56px}
.sy-tv .sy-arr{font-size:30px}
.sy-tv .sy-tc{font-size:22px}.sy-tv .sy-tc img{width:52px;height:52px}.sy-tv .sy-tc b{font-size:32px}
.sy-tv .sy-rc img{width:150px;height:150px}
.sy-tv .sy-rt{font-size:44px}.sy-tv .sy-rs{font-size:28px}.sy-tv .sy-rm{font-size:20px}
.sy-tv .sy-et{font-size:52px}.sy-tv .sy-es{font-size:26px}
.sy-tv .sy-ewc .sy-we{font-size:110px}.sy-tv .sy-ewc .sy-ww{font-size:52px}.sy-tv .sy-ewc small{font-size:22px}
.sy-tv .sy-esp{font-size:26px}.sy-tv .sy-esp img{width:52px;height:52px}
.sy-tv .sy-clues{padding:20px;border-radius:28px}
.sy-tv .sy-ch{font-size:28px}
.sy-tv .sy-crh{font-size:18px;padding:2px 14px}
.sy-tv .sy-cl img{width:60px;height:60px}
.sy-tv .sy-cn{font-size:18px}
.sy-tv .sy-ct{font-size:32px}
.sy-tv .sy-cs{font-size:22px}
.sy-tv .sy-stk{font-size:36px}.sy-tv .sy-stk small{font-size:20px}
.sy-tv .sy-empty{font-size:20px}
.sy-tv .sy-ovb img{width:260px;height:260px}
.sy-tv .sy-ovt{font-size:56px}.sy-tv .sy-stamp{font-size:52px}.sy-tv .sy-ovi{font-size:120px}
@media (max-height:460px){.sy-wc,.sy-kid .sy-wc{height:76px}.sy-wc.big,.sy-kid .sy-wc.big{height:120px}.sy-wc.big .sy-we{font-size:64px}.sy-we{font-size:40px}.sy-ww{font-size:26px}
  .sy-kid .sy-wc.big .sy-wbody{flex-direction:row}.sy-hero{padding:12px}.sy-av{width:44px;height:44px}}
`;
})();
