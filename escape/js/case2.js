'use strict';
// 推理事件 2：畫展停電之夜
(() => {
  const bust = (who, x, y, sc = 1, e = 'n') => `<svg x="${x}" y="${y}" width="${200 * sc}" height="${240 * sc}" viewBox="0 0 200 240">${Face.body(PEOPLE[who], e)}</svg>`;
  const sunflower = (cat) => `<rect width="100" height="100" fill="#4f6aa8"/><rect y="70" width="100" height="30" fill="#c9895a"/><path d="M38 70q-2-20 4-30h18q6 10 4 30z" fill="#e9604a"/>${[...Array(10)].map((_, i) => `<ellipse cx="50" cy="22" rx="5" ry="12" fill="#f2c232" transform="rotate(${i * 36} 50 32)"/>`).join('')}<circle cx="50" cy="32" r="7" fill="#8c5634"/>${cat ? `<ellipse cx="80" cy="76" rx="10" ry="7" fill="#fff"/><path d="M73 72l2-6 4 4zM83 72l2-6 2 6z" fill="#fff"/>` : ''}`;
  const scene = s => {
    let o = `<rect width="1000" height="625" fill="#ece6dc"/><rect width="1000" height="480" fill="url(#p-noise)"/><rect y="330" width="1000" height="150" fill="#d8cfc0"/><rect y="330" width="1000" height="6" fill="#fffaf0"/><rect y="336" width="1000" height="10" fill="url(#aoDn)" opacity=".4"/>`;
    for (let x = 20; x < 1000; x += 120) o += `<rect x="${x}" y="356" width="100" height="100" rx="3" fill="none" stroke="#c4baa8" stroke-width="3"/><path d="M${x + 3} ${453}V${359}H${x + 97}" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none"/>`;
    o += `<rect width="1000" height="30" fill="#fffaf0"/><rect y="30" width="1000" height="8" fill="#d8cfc0"/><path d="M0 52h1000" stroke="#c9a14a" stroke-width="3"/>` + A.floor('wood', ['#b98a5a', '#a87a4a'], 480);
    o += `<rect y="466" width="1000" height="16" fill="#d9d0c0"/>`;
    // 軌道投射燈
    o += `<path d="M60 14h880" stroke="#3b3a40" stroke-width="6"/>` + [150, 330, 500, 670, 850].map(x => `<path d="M${x} 14v12" stroke="#3b3a40" stroke-width="4"/><path d="M${x - 12} 26h24l-6 22h-12z" fill="#3b3a40" ${SW2}/><ellipse cx="${x}" cy="48" rx="6" ry="3" fill="#fff6c8"/>`).join('') + A.shaft('140 50L160 50L230 330L60 330', 0.16) + A.shaft('840 50L860 50L940 330L760 330', 0.12);
    // 聚光燈
    o += `<path d="M430 0L330 470H670L570 0z" fill="#fff8d8" opacity=".45"/>`;
    o += A.frame(380, 110, 240, 240, sunflower(false)) + `<rect x="440" y="370" width="120" height="30" rx="4" fill="#fffaf0" ${SW2}/>` + A.txt(500, 391, '向日葵與貓', 15, '#4a3222');
    o += A.sh(500, 478, 150, 8, 0.2) + `<path d="M372 404q128 46 256 0" stroke="#4a3222" stroke-width="11" fill="none"/><path d="M372 404q128 46 256 0" stroke="#a8323a" stroke-width="7" fill="none"/><path d="M380 404q120 40 240 0" stroke="#fff" stroke-opacity=".25" stroke-width="2" fill="none"/>` + [372, 628].map(x => `<rect x="${x - 4}" y="398" width="8" height="74" fill="url(#brass)" ${SW2}/><circle cx="${x}" cy="396" r="9" fill="url(#brass)" ${SW2}/><ellipse cx="${x}" cy="474" rx="22" ry="7" fill="url(#brass)" ${SW2}/>`).join('');
    o += A.frame(80, 140, 150, 110, `<rect width="100" height="100" fill="#9fd08a"/><circle cx="70" cy="30" r="12" fill="#fff3c8"/><path d="M0 80q30-30 60 0t40-10V100H0z" fill="#5f9e5a"/>`, { fc: '#c9c0b0' });
    // 員工走廊門與配電箱
    o += `<rect x="760" y="150" width="170" height="320" rx="4" fill="#cfc6b8" ${SW}/><rect x="776" y="166" width="138" height="304" fill="#b8ae9e" ${SW2}/>` + A.txt(845, 140, '員工走廊', 16, '#7a6250', 'middle', 900);
    o += `<rect x="800" y="210" width="90" height="110" rx="6" fill="#9aa6b0" ${SW}/><rect x="814" y="226" width="62" height="40" rx="3" fill="#5a6a7a" ${SW2}/><rect x="836" y="236" width="18" height="22" rx="3" fill="#e0504a" ${SW2}/><circle cx="845" cy="290" r="6" fill="#3b2a1f" ${SW2}/>`;
    // 巡邏桌
    o += A.table(640, 390, 110, 80, '#8c5634') + `<rect x="652" y="372" width="70" height="16" rx="2" fill="#3e5a7a" ${SW2}/>` ; A.person('zhou', 640, 236, 0.55, { front: A.table(640, 390, 110, 80, '#8c5634') + `<rect x="652" y="372" width="70" height="16" rx="2" fill="#3e5a7a" ${SW2}/><path d="M660 380h50" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>` });
    // 包裹與金先生
    A.person('jin', 230, 200, 0.55, { front: `<g filter="url(#ds2)"><rect x="250" y="330" width="110" height="140" rx="4" fill="#d9b88a" ${SW}/><path d="M250 400h110M305 330v140" stroke="#a8742a" stroke-width="4"/><rect x="262" y="344" width="40" height="22" rx="2" fill="#fffaf0" ${SW2} transform="rotate(-4 282 355)"/></g>` });
    // 小蘭與水桶
    A.person('lan', 34, 310, 0.52, { full: 1, front: `<path d="M150 474l6-46h44l6 46z" fill="#4f8ad8" ${SW}/><path d="M156 440h44" stroke="#fff" stroke-opacity=".35" stroke-width="4"/><path d="M180 428V324" stroke="#a8742a" stroke-width="6"/><path d="M168 324h24l-4 -18h-16z" fill="#e9d8a8" ${SW2}/>` });
    // 館長與麥克風（台上）
    o += `<rect x="40" y="440" width="0" height="0"/>`;
    return o + A.light();
  };
  CASES.push({
    id: 'c2', no: 2, name: '畫展停電之夜', par: 660, thumb: () => scene({}),
    ev: {
      fake: { n: '掉包的畫', d: '〈向日葵與貓〉的假畫。真畫的右下角有一隻小白貓，這幅<b>沒有貓</b>，顏料也還有一點黏。', ic: () => `<rect x="16" y="16" width="68" height="68" fill="#d9a548" ${SW}/><svg x="24" y="24" width="52" height="52" viewBox="0 0 100 100">${sunflower(false)}</svg>` },
      breaker: { n: '配電箱', d: '在員工走廊裡。如果是電線出問題，<b>跳脫指示燈</b>會亮紅燈，可是現在沒亮。總開關把手上有新鮮的指紋──<b>是被人用手拉下來的</b>。', ic: () => `<rect x="22" y="14" width="56" height="72" rx="6" fill="#9aa6b0" ${SW}/><rect x="40" y="30" width="20" height="28" rx="3" fill="#e0504a" ${SW2}/><circle cx="50" cy="72" r="6" fill="#3b2a1f"/>` },
      keys: { n: '鑰匙登記表', d: '員工走廊的鑰匙只有兩把：<b>警衛老周</b>一把、<b>清潔員小蘭</b>一把。', ic: () => IC.key('#c9cfd6') },
      log: { n: '巡邏日誌', d: '老周的巡邏日誌，今晚最後一筆寫著：「<b>20:00　巡邏完畢，燈光正常，一切無異狀。</b>」', ic: () => `<rect x="20" y="16" width="60" height="70" rx="4" fill="#3e5a7a" ${SW}/><rect x="28" y="26" width="44" height="50" fill="#fffaf0"/><path d="M34 38h32M34 48h32M34 58h20" stroke="#9aa" stroke-width="3"/>` },
      package: { n: '金先生的包裹', d: '金先生帶來的大包裹。裡面是一個<b>空的畫框</b>，貼著標籤：「送往裱框店」。大小和〈向日葵與貓〉不一樣。', ic: () => `<rect x="18" y="20" width="64" height="62" rx="4" fill="#d9b88a" ${SW}/><path d="M18 50h64M50 20v62" stroke="#a8742a" stroke-width="4"/>` },
    },
    intro: [
      { big: 1, t: '事件 2　畫展停電之夜' },
      '小鎮美術館的開幕酒會。今晚的主角，是名畫〈向日葵與貓〉。',
      { w: 'ye', e: 'w', t: '「八點整，館裡突然停電，三分鐘後燈才亮起來。」' },
      { w: 'ye', e: 'w', t: '「燈一亮，我就發現……〈向日葵與貓〉被掉包了！真畫的右下角有一隻小白貓，這幅沒有！」' },
      { w: 'ye', t: '「停電的時候，我正在台上致詞，麥克風一直開著。大家都聽到我在說『請不要慌張』。」' },
      '館長有不在場證明。現場還有警衛老周、收藏家金先生、清潔員小蘭。調查看看吧！',
    ],
    scene: {
      draw: scene,
      hot: [
        { id: 'fake', r: [370, 100, 260, 260], ev: 'fake', t: '〈向日葵與貓〉……右下角的小白貓不見了。湊近一聞，顏料還有一點黏，是最近才畫的假畫。' },
        { id: 'breaker', r: [796, 200, 100, 130], ev: 'breaker', t: '員工走廊的配電箱。如果是電線出問題，跳脫指示燈會亮紅燈，現在卻沒亮。總開關的把手上有新鮮的指紋──是被人用手拉下來的。' },
        { id: 'keysHot', r: [776, 340, 140, 120], ev: 'keys', t: '員工走廊門邊掛著鑰匙登記表：鑰匙只有兩把，警衛老周一把、清潔員小蘭一把。' },
        { id: 'log', r: [640, 360, 100, 40], ev: 'log', t: '巡邏桌上的日誌。今晚最後一筆寫著：「20:00　巡邏完畢，燈光正常，一切無異狀。」' },
        { id: 'pkg', r: [250, 330, 110, 140], ev: 'package', t: '金先生的大包裹。打開一看，裡面是一個空畫框，標籤寫著「送往裱框店」。尺寸比〈向日葵與貓〉小了一圈。' },
        { id: 'zhou', r: [642, 232, 110, 130], talk: [{ w: 'zhou', t: '「我是這裡的警衛，做了二十年了。」' }, { w: 'zhou', e: 'w', t: '「停電的時候我在巡邏……詳細的等一下再說吧。」' }] },
        { id: 'jin', r: [232, 200, 110, 130], talk: [{ w: 'jin', e: 'a', t: '「看什麼看？我可是來買畫的貴客！」' }, { w: 'jin', t: '「我本來打算明天跟館長談，把〈向日葵與貓〉買下來呢。」' }] },
        { id: 'lan', r: [44, 314, 96, 160], talk: [{ w: 'lan', t: '「停電的時候，我在員工休息室吃便當。館長也有看到我進去。」' }, { w: 'lan', e: 'w', t: '「員工走廊的鑰匙？我是有一把，可是一直放在休息室的抽屜裡……」' }] },
        { id: 'other', r: [70, 130, 170, 130], t: '另一幅風景畫。好好的，沒有被動過。' },
      ],
    },
    stages: [
      { type: 'inv', need: ['fake', 'breaker', 'keys', 'log', 'package'], goal: '調查現場', h: ['畫、配電箱、門邊、巡邏桌、包裹都看看。要收集 5 件證物。', '員工走廊的門上有配電箱，門邊下方有鑰匙登記表。', '五件證物：掉包的畫、配電箱、鑰匙登記表、巡邏日誌、金先生的包裹。'],
        after: [{ w: 'jin', e: 'a', t: '「警衛先生，你倒是說說，停電的時候你在幹嘛？」' }, { w: 'zhou', t: '「好，我就把當時的情況說清楚。」' }] },
      { type: 'test', who: 'zhou', title: '老周的證詞：停電那三分鐘', goal: '找出證詞的矛盾', hit: [2, 'breaker'],
        lines: [
          { t: '八點整，我照規定在 A 廳巡邏。', press: [{ w: 'zhou', t: '「A 廳在另一頭，走過來要一分鐘左右。」' }] },
          { t: '突然一片漆黑，我趕快摸黑跑到員工走廊的配電箱。', press: [{ w: 'zhou', t: '「我在這裡二十年了，閉著眼睛都找得到。」' }] },
          { t: '配電箱的總開關是自己跳掉的，我把它推回去，燈就亮了。', press: [{ w: 'zhou', t: '「老房子嘛，電線常常出問題。」' }, '……電線出問題的話，配電箱上應該會有什麼記號？'] },
          { t: '偷畫的一定是金先生！他扛著那麼大一個包裹進來。', press: [{ w: 'jin', e: 'a', t: '「那是空畫框！要拿去裱框店的！你們自己看！」' }, '包裹裡的空畫框，比〈向日葵與貓〉小了一圈。'] },
        ],
        wrong: '「這跟停電有什麼關係？」',
        win: ['如果是電線出問題，<b>跳脫指示燈</b>會亮紅燈。可是燈沒亮，把手上還有新鮮的指紋！', '總開關不是「自己跳掉」的，是<b>有人用手拉下來的</b>！', { w: 'zhou', e: 's', t: '「……！」' }, { w: 'zhou', e: 'w', t: '「也、也許是有人故意拉的……但、但不是我！」' }],
        h: ['他說總開關是「自己跳掉的」。', '配電箱這件證物裡，有寫到開關是怎麼被關掉的。', '在第 3 句「總開關是自己跳掉的」出示「配電箱」。'] },
      { type: 'test', who: 'zhou', title: '老周的證詞：我整晚都照表巡邏', goal: '找出證詞的矛盾', hit: [2, 'log'],
        lines: [
          { t: '員工走廊的鑰匙，又不是只有我有。', press: [{ w: 'zhou', t: '「小蘭也有一把，登記表上寫得很清楚。」' }] },
          { t: '停電的時候，小蘭就在員工走廊附近，她最可疑！', press: [{ w: 'lan', e: 'a', t: '「我在休息室吃便當！館長看到我進去的！」' }, { w: 'ye', t: '「沒錯，七點五十分我看到小蘭進休息室。」' }] },
          { t: '我整晚都照表巡邏，日誌寫得清清楚楚。', press: [{ w: 'zhou', t: '「每個整點巡一次，一筆都沒漏。」' }, '……日誌最後一筆寫的是什麼？'] },
          { t: '我在美術館工作二十年了，怎麼可能偷畫？', press: [{ w: 'zhou', e: 'w', t: '「這裡的每一幅畫，我都像家人一樣顧著……」' }] },
        ],
        wrong: '「哼，你在胡說什麼？」',
        win: ['日誌上寫著「20:00 巡邏完畢，<b>燈光正常</b>」。可是八點整，館裡<b>正好停電</b>！', '這本日誌，是你<b>事先寫好的</b>。停電的時候，你根本沒有在巡邏！', { w: 'zhou', e: 's', t: '「…………」' }],
        h: ['他說日誌寫得清清楚楚。日誌上寫了什麼？', '日誌說 20:00 燈光正常。可是 20:00 發生了什麼事？', '在第 3 句「日誌寫得清清楚楚」出示「巡邏日誌」。'] },
      { type: 'accuse', ask: '是誰掉包了〈向日葵與貓〉？', who: ['zhou', 'jin', 'lan', 'ye'], ans: 'zhou', evAsk: '哪件證物證明他停電時沒在巡邏？', ev: 'log', goal: '指認犯人',
        win: [{ w: 'zhou', e: 'w', t: '「……是我。真畫在我的置物櫃裡，我一點都沒弄壞。」' }, { w: 'zhou', e: 'w', t: '「〈向日葵與貓〉的作者，是我過世的媽媽。畫裡那隻白貓，是我小時候養的。」' }, { w: 'zhou', e: 'w', t: '「聽說館長要把它賣給金先生……我只是，想把媽媽的畫留下來。」' }, { w: 'ye', e: 'w', t: '「老周……原來是這樣。對不起，我們都不知道。」' }, { w: 'ye', t: '「我答應你，這幅畫不賣了。它會一直掛在這裡，讓你每天巡邏的時候都看得到。」' }, { w: 'jin', t: '「……哼，既然是這種畫，我也不好意思買了。」' }],
        h: ['誰的話裡有兩次矛盾？', '他的日誌是事先寫好的。', '犯人是老周，決定性的證據是「巡邏日誌」。'] },
    ],
    outro: [{ w: 'ye', e: 'h', t: '「謝謝你，小偵探。下次來美術館，我請你喝熱可可。」' }, '〈向日葵與貓〉回到了牆上。右下角的小白貓，好像在對你眨眼睛。'],
  });
})();
