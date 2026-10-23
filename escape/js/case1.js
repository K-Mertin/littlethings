'use strict';
// 推理事件 1：草莓蛋糕不見了
(() => {
  const bust = (who, x, y, sc = 1, e = 'n') => `<svg x="${x}" y="${y}" width="${200 * sc}" height="${240 * sc}" viewBox="0 0 200 240">${Face.body(PEOPLE[who], e)}</svg>`;
  const scene = s => {
    let o = `<rect width="1000" height="625" fill="#f6c9c0"/><rect width="1000" height="420" fill="url(#p-stripe)"/><rect y="0" width="1000" height="30" fill="#fff6ee"/>`;
    o += A.floor('check', ['#fff6ee', '#e9a0a0'], 470);
    // 招牌與時鐘
    o += `<rect x="330" y="46" width="340" height="60" rx="30" fill="#fff6ee" ${SW}/>` + A.txt(500, 88, '暖暖烘焙', 32, '#c4502c', 'middle', 900, 'font-family="Noto Serif TC,serif"');
    o += `<circle cx="150" cy="90" r="44" fill="#fffaf0" ${SW}/><path d="M150 90V60M150 90l20 12" ${SW}/>`;
    // 價目牌
    o += `<rect x="740" y="50" width="200" height="120" rx="8" fill="#3b2a2a" ${SW}/>` + A.txt(840, 82, '今日蛋糕', 18, '#ffe9a0', 'middle', 900) + A.txt(840, 112, '6 吋草莓蛋糕', 17, '#fff', 'middle', 700) + A.txt(840, 140, '直徑 15 公分', 15, '#ffd0c0', 'middle', 500) + A.txt(840, 160, '★ 售完 ★', 13, '#f6a0a0', 'middle', 700);
    // 後廚房門口（阿哲）
    o += `<rect x="40" y="170" width="150" height="300" rx="6" fill="#fff6ee" ${SW}/><rect x="54" y="184" width="122" height="286" fill="#e9dcc8" ${SW2}/>` + A.person('zhe', 55, 230, 0.6, { front: `<rect x="40" y="380" width="150" height="90" fill="#c9895a" ${SW}/><rect x="40" y="380" width="150" height="14" fill="#e9b07a" ${SW2}/>` });
    // 櫃台與蛋糕玻璃罩
    o += `<g filter="url(#ds)"><rect x="230" y="300" width="360" height="170" rx="8" fill="#fff6ee" ${SW}/><rect x="246" y="316" width="328" height="70" rx="6" fill="#dff0f2" ${SW2}/>${[0, 1, 2, 3].map(i => `<circle cx="${280 + i * 80}" cy="352" r="22" fill="${['#e9b45a', '#d9774b', '#f6d08a', '#c9895a'][i]}" ${SW2}/>`).join('')}</g>`;
    o += A.person('wang', 420, 150, 0.62);
    o += `<ellipse cx="320" cy="296" rx="64" ry="12" fill="#fff" ${SW}/><path d="M262 296q0-90 58-90t58 90" fill="#dff0f2" fill-opacity=".55" ${SW}/><path d="M290 290q8-6 16 0" stroke="#f6a0b0" stroke-width="5"/>${A.sparkle(372, 214, 0.6)}`;
    // 小胖的桌子
    o += A.table(620, 380, 120, 90, '#c9895a') + A.person('pang', 618, 250, 0.55, { front: `<g transform="rotate(-8 660 370)"><rect x="628" y="356" width="56" height="40" rx="2" fill="#fff" ${SW2}/><path d="M636 384l10-14 8 8 10-16 10 22" stroke="#4f8ad8" stroke-width="3" fill="none"/></g><rect x="696" y="362" width="30" height="20" rx="2" fill="#fffaf0" ${SW2}/>` });
    // 林先生的窗邊座位
    o += A.win(800, 220, 160, 120, { curtain: '#e98a8a' });
    o += A.table(780, 400, 190, 72, '#c9895a') + A.person('lin', 810, 268, 0.6, { front: `<rect x="790" y="376" width="80" height="26" rx="2" fill="#f4f0e6" ${SW2} transform="rotate(-4 830 388)"/><path d="M800 386h60M800 394h40" stroke="#9aa" stroke-width="2"/>` });
    o += `<g filter="url(#ds)"><rect x="900" y="440" width="80" height="60" rx="6" fill="#6a4a3a" ${SW}/><rect x="926" y="432" width="28" height="12" rx="4" fill="none" ${SW2}/><rect x="930" y="460" width="20" height="10" rx="2" fill="url(#brass)" ${SW2}/><circle cx="950" cy="465" r="4" fill="#f6a0b0"/></g>`;
    return o + A.light();
  };
  CASES.push({
    id: 'c1', no: 1, name: '草莓蛋糕不見了', par: 600, thumb: () => scene({}),
    ev: {
      stand: { n: '空的蛋糕盤', d: '玻璃罩被打開了。盤子上只剩一點粉紅色的草莓奶油，蛋糕連盒子一起不見了。', ic: () => `<ellipse cx="50" cy="66" rx="40" ry="12" fill="#fff" ${SW}/><path d="M18 62q0-46 32-46t32 46" fill="#dff0f2" fill-opacity=".6" ${SW}/><path d="M40 60q6-6 14 0" stroke="#f6a0b0" stroke-width="5"/>` },
      drawing: { n: '小胖的畫', d: '小胖 3 點多畫的店內風景。牆上的時鐘畫著 <b>3:10</b>，林先生<b>站在蛋糕櫃旁邊</b>，看著蛋糕。', ic: () => `<rect x="14" y="20" width="72" height="60" rx="3" fill="#fff" ${SW}/><circle cx="30" cy="34" r="8" fill="none" stroke="#4a3222" stroke-width="2"/><path d="M30 34v-5M30 34l4 2" stroke="#4a3222" stroke-width="2"/><path d="M48 76V52l8-8 8 8v24" fill="#3f4d75" stroke="#4a3222" stroke-width="2"/><circle cx="56" cy="40" r="6" fill="#f1cfae" stroke="#4a3222" stroke-width="2"/><path d="M64 70h18" stroke="#f6a0b0" stroke-width="6"/>` },
      bag: { n: '林先生的公事包', d: '一個很大的公事包，足足有 40 公分寬。金屬扣環上<b>沾著一點粉紅色的草莓奶油</b>。', ic: () => `<rect x="14" y="34" width="72" height="50" rx="6" fill="#6a4a3a" ${SW}/><rect x="38" y="24" width="24" height="14" rx="4" fill="none" ${SW2}/><rect x="42" y="52" width="16" height="10" rx="2" fill="url(#brass)" ${SW2}/><circle cx="56" cy="56" r="4" fill="#f6a0b0"/>` },
      receipt: { n: '泡芙收據', d: '小胖桌上的收據：「奶油泡芙 1 個，<b>3:05</b>」。小胖嘴邊的奶油是泡芙的。', ic: () => IC.paper('#fffaf0', '#c9a14a', 4) },
      paper: { n: '林先生的報紙', d: '今天的報紙。林先生說他一直在看，可是報紙<b>摺都沒摺過</b>，填字遊戲也一格都沒填。', ic: () => `<rect x="14" y="20" width="72" height="60" rx="2" fill="#f4f0e6" ${SW}/><path d="M22 32h36M22 42h56M22 52h56M22 62h40" stroke="#8a8a8a" stroke-width="3"/><rect x="62" y="26" width="18" height="18" fill="none" stroke="#4a3222" stroke-width="2"/>` },
    },
    intro: [
      { big: 1, t: '事件 1　草莓蛋糕不見了' },
      '星期六下午，小鎮最受歡迎的麵包店「暖暖烘焙」。',
      { w: 'wang', e: 'w', t: '「小偵探，你來得正好！我放在櫃台上的草莓蛋糕，不見了！」' },
      { w: 'wang', e: 'w', t: '「3 點的時候，我進後面講了二十分鐘電話。出來的時候，玻璃罩打開了，蛋糕連盒子都不見了！」' },
      { w: 'wang', t: '「那段時間店裡只有三個人：窗邊看報紙的林先生、在畫畫的小胖，還有在後面揉麵團的學徒阿哲。店門的鈴鐺一次都沒響過。」' },
      '也就是說，蛋糕還在這間店裡。先四處調查看看吧！',
    ],
    scene: {
      draw: scene,
      hot: [
        { id: 'stand', r: [250, 200, 140, 110], ev: 'stand', t: '玻璃罩打開了，盤子上只剩一點粉紅色的草莓奶油。蛋糕連盒子一起不見了。' },
        { id: 'drawing', r: [620, 345, 75, 60], ev: 'drawing', t: '小胖的畫。畫的是店裡的樣子──牆上的時鐘指著 3:10，林先生<b>站在蛋糕櫃旁邊</b>盯著蛋糕看。' },
        { id: 'receipt', r: [690, 352, 45, 40], ev: 'receipt', t: '小胖桌上的收據：「奶油泡芙 1 個，3:05」。' },
        { id: 'paper', r: [785, 368, 95, 40], ev: 'paper', t: '林先生的報紙。奇怪，報紙摺得整整齊齊，像是根本沒翻開過。' },
        { id: 'bag', r: [895, 425, 95, 85], ev: 'bag', t: '林先生腳邊的大公事包。金屬扣環上沾著一點粉紅色的東西……甜甜的味道，是草莓奶油？' },
        { id: 'lin', r: [815, 270, 110, 100], talk: [{ w: 'lin', t: '「我？我一直在這裡看報紙，什麼都沒看到。」' }, { w: 'lin', e: 'w', t: '「我、我等一下還有事，可以走了吧？」' }] },
        { id: 'pang', r: [622, 252, 100, 90], talk: [{ w: 'pang', e: 'h', t: '「我在畫店裡的樣子！我畫得超認真的！」' }, { w: 'pang', t: '「嘴巴上的奶油？那是泡芙的啦，我有買喔！」' }] },
        { id: 'zhe', r: [56, 232, 120, 140], talk: [{ w: 'zhe', t: '「我整個下午都在後面揉麵團，手上全是麵粉。」' }, { w: 'zhe', e: 'w', t: '「我連奶油都沒碰過，真的！」' }] },
        { id: 'wang', r: [425, 152, 120, 140], talk: [{ w: 'wang', e: 'w', t: '「那個蛋糕是今天最後一個了……有位客人早就訂好了，等一下就要來拿啊！」' }] },
        { id: 'clock', c: [150, 90, 50], t: '牆上的時鐘。王阿姨是 3:00 到 3:20 在後面講電話。' },
        { id: 'menu', r: [740, 50, 200, 120], t: '價目牌：6 吋草莓蛋糕，直徑 15 公分。今天已經售完了。' },
      ],
    },
    stages: [
      { type: 'inv', need: ['stand', 'drawing', 'receipt', 'paper', 'bag'], goal: '調查現場', h: ['店裡的東西和人都點點看。證物簿要收集 5 件證物。', '櫃台的蛋糕盤、小胖桌上的畫和收據、林先生的報紙和腳邊的公事包。', '五件證物：空的蛋糕盤、小胖的畫、泡芙收據、林先生的報紙、林先生的公事包。'],
        after: [{ w: 'lin', e: 'a', t: '「喂喂，查夠了吧？我說了，我一直坐著看報紙，什麼都不知道！」' }, '林先生好像很急著離開。聽聽他怎麼說吧。'] },
      { type: 'test', who: 'lin', title: '林先生的證詞：我一直坐在位子上', goal: '找出證詞的矛盾', hit: [2, 'drawing'],
        lines: [
          { t: '王阿姨進去講電話的那二十分鐘，我一直坐在窗邊。', press: [{ w: 'lin', t: '「窗邊的位子光線好，我每次來都坐那裡。」' }] },
          { t: '我在看報紙，看得很專心，連頭都沒抬起來過。', press: [{ w: 'lin', t: '「今天的新聞可精彩了，你們小孩子不懂啦。」' }, '……報紙明明摺得整整齊齊的。不過光憑這個，還不能說他說謊。'] },
          { t: '我從頭到尾，一步也沒離開過座位。', press: [{ w: 'lin', e: 'a', t: '「一步都沒有！我發誓！」' }, '他說得好肯定……有沒有什麼東西，能看到 3 點多時店裡的樣子？'] },
          { t: '要我說，嘴邊沾著奶油的小胖最可疑！', press: [{ w: 'pang', e: 'a', t: '「我吃的是泡芙啦！我有收據！」' }, '小胖的收據證明他 3:05 買了奶油泡芙。'] },
        ],
        wrong: '「這個東西，跟我一直坐著有什麼關係？」',
        win: ['小胖的畫上，牆上的時鐘是 3:10。畫裡的林先生，明明<b>站在蛋糕櫃旁邊</b>！', { w: 'lin', e: 's', t: '「什、什麼！小孩子的畫怎麼能當真……」' }, { w: 'pang', e: 'a', t: '「我畫畫最認真了！叔叔那時候站在蛋糕前面看了好久！」' }, { w: 'lin', e: 'w', t: '「……好、好吧。我是起來過一下下。」' }],
        h: ['他說他「一步也沒離開過座位」。真的是這樣嗎？', '有一件證物，畫下了 3 點多時店裡的樣子。', '在第 3 句「一步也沒離開過座位」出示「小胖的畫」。'] },
      { type: 'test', who: 'lin', title: '林先生的證詞：我只是看看而已', goal: '找出證詞的矛盾', hit: [2, 'bag'],
        lines: [
          { t: '我只是走過去看看蛋糕，看完就回座位了。', press: [{ w: 'lin', t: '「草莓那麼大顆，誰都會想看一下吧？」' }] },
          { t: '而且那麼大的蛋糕盒，我拿了要藏在哪裡？', press: [{ w: 'lin', t: '「店裡就這麼一點大，藏哪裡都會被發現啦。」' }, '……6 吋蛋糕直徑 15 公分。他腳邊那個公事包，倒是大得很。'] },
          { t: '我的公事包裡只有文件，乾乾淨淨的，跟蛋糕沒關係。', press: [{ w: 'lin', e: 'w', t: '「不、不要碰我的公事包！裡面是重要文件！」' }] },
          { t: '我看啊，一定是後面那個學徒阿哲偷吃的。', press: [{ w: 'zhe', e: 'a', t: '「我手上全是麵粉！碰過奶油的話早就沾得到處都是了！」' }] },
        ],
        wrong: '「哼，那又能證明什麼？」',
        win: ['公事包「乾乾淨淨」？那扣環上這一點<b>粉紅色的草莓奶油</b>是怎麼來的？', { w: 'lin', e: 's', t: '「唔……！」' }, '只有把蛋糕盒塞進公事包、手上沾著奶油去扣扣環的人，才會留下這個痕跡！'],
        h: ['他說公事包「乾乾淨淨」、跟蛋糕沒關係。', '仔細看看公事包這件證物的說明。', '在第 3 句「公事包裡只有文件，乾乾淨淨」出示「林先生的公事包」。'] },
      { type: 'accuse', ask: '是誰拿走了草莓蛋糕？', who: ['lin', 'pang', 'zhe', 'wang'], ans: 'lin', evAsk: '哪件證物能證明蛋糕在他身上？', ev: 'bag', goal: '指認犯人',
        win: [{ w: 'lin', e: 'w', t: '「……對不起，蛋糕在我的公事包裡，一口都沒吃。」' }, { w: 'lin', e: 'w', t: '「今天是我女兒的生日，我忙到忘了訂蛋糕。店裡只剩這一個，又說已經被訂走了……我一時糊塗。」' }, { w: 'wang', e: 'h', t: '「傻瓜，早點說就好了嘛！訂蛋糕的客人跟我是老朋友，我再幫他做一個就是了。」' }, { w: 'wang', e: 'h', t: '「這個蛋糕，就讓你帶回去給女兒吧。錢可要照付喔！」' }, { w: 'lin', e: 'h', t: '「謝謝……真的謝謝你們！」' }],
        h: ['誰的證詞一直在說謊？', '扣環上沾著奶油的公事包是誰的？', '犯人是林先生，決定性的證據是「林先生的公事包」。'] },
    ],
    outro: [{ w: 'pang', e: 'h', t: '「偵探好厲害！我的畫有幫上忙耶！」' }, { w: 'wang', e: 'h', t: '「謝謝你啊，小偵探。來，這塊餅乾請你吃！」' }, '對了，王阿姨說的「訂蛋糕的老朋友」……該不會是你認識的人吧？'],
  });
})();
