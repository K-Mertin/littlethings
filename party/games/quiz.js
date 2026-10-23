'use strict';
/* 快問快答 — a TV quiz show. 咕咕博士 (an owl in a little mortarboard) hosts from his desk on the left,
   the question board glows in the middle, the timer ring ticks on the right and every player stands
   behind a podium with their name and score while the audience bobs in the front row.
   Each round the phones turn into four big coloured answer buttons (same colours and shapes as the
   tiles on the TV). Answer fast: a right answer is worth 100 + up to 100 speed bonus.
   小朋友: 8 picture questions a 4–6 year-old can do without reading (count the apples, whose shadow,
         who says 「汪汪」, colours, shapes, patterns, odd one out, ABC / ㄅㄆㄇ), 15 s, no penalty.
   大人: 10 general-knowledge questions (Taiwan, food, nature, science, culture, little math puzzles)
         from a bank of 70+, never repeated until the bank runs out, 12 s; a wrong answer costs 30.
   Keyboard players (testing): left/right (up/down) moves a cursor over the tiles, the button answers. */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', NUMF = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const EMOF = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const SKY = '#0ea5e9', DEEP = '#0369a1', INK = '#2b2340';
  const OPT = [
    { c: '#ff4f58', d: '#b8262f', sh: '▲', k: 'tri' }, { c: '#2f8cff', d: '#1658b5', sh: '◆', k: 'dia' },
    { c: '#f59e0b', d: '#a15c00', sh: '●', k: 'cir' }, { c: '#22c26a', d: '#127a40', sh: '■', k: 'sq' }
  ];
  const BX0 = 296, BY0 = 146, BX1 = 1304, BY1 = 448, BCY = 297; // the question board
  const TX = 1452, TY = 296, TR = 86;                          // the timer ring
  const HX = 150, HY = 452;                                    // the host
  const PY = 676, PTOP = 706;                                  // podium critters / podium tops
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[rint(a.length)];
  const isEmo = s => /\p{Extended_Pictographic}/u.test(s || '');
  const ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const back = k => { k = clamp(k, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  /* ------------------------------ question banks ------------------------------ */
  /* 大人: [picture, question, right answer, wrong, wrong, wrong] */
  const ADULT = [
    ['⛰️', '台灣最高的山是哪一座？', '玉山', '雪山', '合歡山', '阿里山'],
    ['🏔️', '台灣第二高的山是哪一座？', '雪山', '玉山', '大霸尖山', '合歡山'],
    ['🏞️', '台灣最長的河流是哪一條？', '濁水溪', '淡水河', '高屏溪', '大甲溪'],
    ['🛶', '日月潭在哪一個縣？', '南投縣', '嘉義縣', '台中市', '花蓮縣'],
    ['🧭', '台灣本島最北端的岬角是？', '富貴角', '鵝鑾鼻', '三貂角', '貓鼻頭'],
    ['🗺️', '台灣面積最大的縣市是？', '花蓮縣', '南投縣', '台東縣', '屏東縣'],
    ['🏯', '常被稱為「府城」的是哪個城市？', '台南', '台中', '高雄', '嘉義'],
    ['🌬️', '常被稱為「風城」的是哪個城市？', '新竹', '基隆', '澎湖', '台中'],
    ['🚂', '阿里山在哪一個縣？', '嘉義縣', '南投縣', '雲林縣', '台南市'],
    ['🏖️', '墾丁國家公園在哪一個縣？', '屏東縣', '台東縣', '高雄市', '台南市'],
    ['🌲', '台灣第一座國家公園是？', '墾丁', '玉山', '陽明山', '太魯閣'],
    ['⛰️', '太魯閣國家公園主要在哪個縣？', '花蓮縣', '台東縣', '宜蘭縣', '南投縣'],
    ['🛥️', '蘭嶼上的原住民族是？', '達悟族', '阿美族', '泰雅族', '排灣族'],
    ['🎶', '台灣人口最多的原住民族是？', '阿美族', '泰雅族', '布農族', '排灣族'],
    ['🏙️', '台北 101 大樓地面上有幾層樓？', '101', '88', '99', '110'],
    ['🏝️', '澎湖在台灣本島的哪一邊？', '西邊', '東邊', '南邊', '北邊'],
    ['🚄', '台灣高鐵最南邊的車站是？', '左營', '台南', '嘉義', '屏東'],
    ['🔪', '金門有名的菜刀，原料來自？', '砲彈', '鐵軌', '船錨', '鐵窗'],
    ['🐢', '綠島屬於哪一個縣？', '台東縣', '屏東縣', '花蓮縣', '澎湖縣'],
    ['🧋', '珍珠奶茶的「珍珠」主要用什麼做？', '樹薯粉', '糯米', '麵粉', '玉米粉'],
    ['🥙', '「刈包」又被叫做什麼？', '虎咬豬', '龍吐珠', '獅子頭', '螞蟻上樹'],
    ['🦪', '「蚵仔煎」的蚵仔是什麼？', '牡蠣', '蛤蜊', '蝦子', '花枝'],
    ['🍜', '「螞蟻上樹」的「螞蟻」其實是？', '絞肉', '芝麻', '黑胡椒', '蔥花'],
    ['🍡', '冬至傳統上要吃什麼？', '湯圓', '粽子', '月餅', '年糕'],
    ['🐉', '端午節的傳統活動是？', '划龍舟', '猜燈謎', '賞月', '掃墓'],
    ['🏮', '元宵節的傳統活動是？', '猜燈謎', '划龍舟', '吃粽子', '放鞭炮'],
    ['🌕', '中秋節常吃的點心是？', '月餅', '粽子', '湯圓', '春捲'],
    ['🌿', '清明節大家通常會做什麼？', '掃墓', '划龍舟', '猜燈謎', '賞月'],
    ['🍍', '鳳梨的台語發音像哪個吉祥話？', '旺來', '好運', '發財', '平安'],
    ['👑', '常被稱為「水果之王」的是？', '榴槤', '芒果', '西瓜', '鳳梨'],
    ['🍗', '「三杯雞」的三杯是哪三樣？', '麻油・米酒・醬油', '醋・糖・鹽', '茶・酒・水', '醬油・醋・辣油'],
    ['🍝', '「擔仔麵」源自哪一個城市？', '台南', '台北', '高雄', '基隆'],
    ['🐦', '被叫做「長尾山娘」的鳥是？', '台灣藍鵲', '黑面琵鷺', '帝雉', '八色鳥'],
    ['🐻', '台灣黑熊胸前的白毛是什麼形狀？', 'V 字形', '圓形', '星形', '心形'],
    ['🐋', '世界上最大的動物是？', '藍鯨', '大象', '長頸鹿', '鯊魚'],
    ['🕷️', '蜘蛛有幾隻腳？', '8', '6', '4', '10'],
    ['🐞', '昆蟲有幾隻腳？', '6', '8', '4', '10'],
    ['🐙', '章魚有幾隻腕足？', '8', '6', '10', '12'],
    ['🧊', '下面哪一種動物住在南極？', '企鵝', '北極熊', '駱駝', '無尾熊'],
    ['🐨', '無尾熊主要吃什麼？', '尤加利葉', '竹子', '香蕉', '青草'],
    ['🦒', '長頸鹿的脖子有幾節頸椎？', '7', '12', '20', '30'],
    ['🐬', '下面哪一種是哺乳類？', '海豚', '鯊魚', '鱷魚', '企鵝'],
    ['🦇', '蝙蝠屬於哪一類動物？', '哺乳類', '鳥類', '昆蟲', '爬蟲類'],
    ['🐳', '鯨魚用什麼呼吸？', '肺', '鰓', '皮膚', '氣孔裡的鰓'],
    ['🐝', '蜂巢的小格子是什麼形狀？', '六角形', '正方形', '三角形', '圓形'],
    ['♨️', '一大氣壓下，水在攝氏幾度沸騰？', '100 度', '80 度', '90 度', '120 度'],
    ['🪐', '太陽系最大的行星是？', '木星', '土星', '地球', '海王星'],
    ['☀️', '離太陽最近的行星是？', '水星', '金星', '火星', '地球'],
    ['🔴', '被叫做「紅色星球」的是？', '火星', '金星', '木星', '水星'],
    ['🌙', '月亮繞地球一圈大約要多久？', '一個月', '一天', '一星期', '一年'],
    ['🧍', '人體最大的器官是？', '皮膚', '肝臟', '心臟', '大腦'],
    ['🦷', '人體最硬的部分是？', '牙齒', '頭骨', '指甲', '大腿骨'],
    ['🌱', '植物行光合作用會吸收哪種氣體？', '二氧化碳', '氧氣', '氮氣', '氫氣'],
    ['💨', '空氣中最多的氣體是？', '氮氣', '氧氣', '二氧化碳', '氫氣'],
    ['⚡', '為什麼先看到閃電，才聽到雷聲？', '光比聲音快', '雷比較晚打', '耳朵比較慢', '閃電比較近'],
    ['🚀', '聲音在哪裡傳不出去？', '真空中', '水中', '空氣中', '鐵軌上'],
    ['⭐', '在夜空找到北極星，就知道哪個方向？', '北方', '南方', '東方', '西方'],
    ['🌀', '颱風最常在哪個季節來台灣？', '夏天', '冬天', '春天', '一年都一樣'],
    ['🐔', '3 隻雞和 2 隻兔子，一共有幾隻腳？', '14', '10', '12', '16'],
    ['➕', '1 + 2 + 3 + … + 10 等於多少？', '55', '45', '50', '100'],
    ['🥚', '「一打」是幾個？', '12', '10', '6', '20'],
    ['🕒', '3 點整，時針和分針夾幾度？', '90 度', '45 度', '60 度', '180 度'],
    ['🔢', '2、4、8、16，下一個是？', '32', '24', '20', '64'],
    ['🐚', '1、1、2、3、5、8，下一個是？', '13', '11', '12', '16'],
    ['🟦', '正方形有幾條對稱軸？', '4', '2', '1', '8'],
    ['💰', '拿 100 元買 35 元的東西，要找多少？', '65 元', '75 元', '55 元', '45 元'],
    ['✖️', '12 × 12 等於多少？', '144', '124', '122', '154'],
    ['📅', '今天星期一，100 天後是星期幾？', '星期三', '星期一', '星期二', '星期五'],
    ['🎲', '骰子相對的兩面，點數加起來是？', '7', '6', '8', '12'],
    ['📐', '三角形三個內角加起來是幾度？', '180 度', '90 度', '360 度', '270 度'],
    ['⏱️', '一小時有幾秒？', '3600', '60', '600', '360'],
    ['🤝', '5 個人兩兩握手一次，一共握幾次？', '10', '5', '20', '25'],
    ['🛵', '在台灣，車子靠哪一邊行駛？', '右邊', '左邊', '中間', '都可以'],
    ['🃏', '一副撲克牌（不含鬼牌）有幾張？', '52', '54', '48', '50'],
    ['🐭', '十二生肖排第一的是？', '鼠', '牛', '虎', '龍'],
    ['🐲', '十二生肖裡，排在龍後面的是？', '蛇', '馬', '兔', '虎'],
    ['🍎', '台灣的教師節是哪一天？', '9 月 28 日', '5 月 4 日', '10 月 10 日', '6 月 1 日'],
    ['🏅', '夏季奧運每幾年舉辦一次？', '4 年', '2 年', '3 年', '5 年'],
    ['🏹', '《三國演義》裡「草船借箭」的是？', '諸葛亮', '劉備', '關羽', '曹操'],
    ['🐒', '孫悟空的武器是什麼？', '金箍棒', '九齒釘耙', '青龍刀', '方天畫戟'],
    ['🐷', '豬八戒的師父是誰？', '唐三藏', '孫悟空', '沙悟淨', '如來佛祖'],
    ['🌛', '「床前明月光」是誰寫的？', '李白', '杜甫', '白居易', '王維'],
    ['🐇', '「龜兔賽跑」最後是誰贏了？', '烏龜', '兔子', '平手', '都沒跑完'],
    ['🐍', '「畫蛇添足」是什麼意思？', '多此一舉', '畫得很好', '跑得很快', '腳很多'],
    ['🎹', '標準鋼琴有幾個琴鍵？', '88', '76', '64', '100'],
    ['🎸', '一般的吉他有幾條弦？', '6', '4', '5', '8'],
    ['⚾', '棒球比賽每隊上場守備幾個人？', '9', '7', '10', '11'],
    ['⚽', '足球比賽每隊上場幾個人？', '11', '9', '10', '12'],
    ['🌊', '世界上最大的海洋是？', '太平洋', '大西洋', '印度洋', '北冰洋'],
    ['🏔️', '世界最高的山峰是？', '聖母峰', '玉山', '富士山', '阿爾卑斯山'],
    ['🐫', '金字塔在哪一個國家？', '埃及', '印度', '墨西哥', '希臘'],
    ['🦘', '袋鼠是哪一個國家的代表動物？', '澳洲', '紐西蘭', '巴西', '南非'],
    ['🗼', '日本的首都是？', '東京', '大阪', '京都', '北海道']
  ];

  /* 小朋友 picture questions */
  const COUNT = [['🍎', '蘋果', '顆'], ['🐟', '魚', '條'], ['⭐', '星星', '顆'], ['🎈', '氣球', '個'], ['🐥', '小雞', '隻'], ['🍓', '草莓', '顆'], ['🚗', '車子', '台'], ['🌸', '花', '朵'], ['🍪', '餅乾', '片'], ['🐞', '瓢蟲', '隻']];
  const SOUNDS = [['汪汪！', '🐶', '小狗'], ['喵～喵～', '🐱', '貓咪'], ['哞～', '🐮', '牛'], ['呱呱！', '🐸', '青蛙'], ['嘎嘎！', '🦆', '鴨子'], ['咩～', '🐑', '綿羊'], ['吱吱！', '🐭', '老鼠'], ['喔喔喔～', '🐓', '公雞'], ['嗡嗡嗡', '🐝', '蜜蜂'], ['嗷嗚～', '🐺', '野狼']];
  const COLORS = [['紅色', '#ef4444', '🍎', '蘋果'], ['黃色', '#facc15', '🍌', '香蕉'], ['綠色', '#22c55e', '🥦', '花椰菜'], ['紫色', '#a855f7', '🍇', '葡萄'], ['橘色', '#fb923c', '🍊', '橘子'], ['藍色', '#3b82f6', '🐳', '鯨魚'], ['粉紅色', '#f9a8d4', '🐷', '小豬'], ['咖啡色', '#92400e', '🐻', '小熊']];
  const SHAPES = [['circle', '圓形', '●'], ['tri', '三角形', '▲'], ['square', '正方形', '■'], ['star', '星星', '★'], ['heart', '愛心', '♥'], ['rect', '長方形', '▬']];
  const SHAPE_THINGS = [['🍕', 'tri'], ['🍩', 'circle'], ['🚪', 'rect'], ['⭐', 'star']];
  const SHADOWS = [
    [['🐘', '大象'], ['🐰', '兔子'], ['🦒', '長頸鹿'], ['🦋', '蝴蝶'], ['🐢', '烏龜'], ['🐧', '企鵝'], ['🦕', '恐龍'], ['🐌', '蝸牛']],
    [['🍌', '香蕉'], ['✈️', '飛機'], ['🚲', '腳踏車'], ['🍄', '香菇'], ['☂️', '雨傘'], ['🎸', '吉他']]
  ];
  const WHICH = [
    ['哪一個最大？', ['🐘', '大象'], [['🐶', '小狗'], ['🐭', '老鼠'], ['🐜', '螞蟻']]],
    ['哪一個最小？', ['🐜', '螞蟻'], [['🐘', '大象'], ['🦒', '長頸鹿'], ['🐄', '乳牛']]],
    ['哪一個會飛？', ['🐦', '小鳥'], [['🐟', '魚'], ['🐢', '烏龜'], ['🐶', '小狗']]],
    ['誰住在水裡？', ['🐟', '魚'], [['🐱', '貓咪'], ['🐔', '雞'], ['🐰', '兔子']]],
    ['哪一個是水果？', ['🍎', '蘋果'], [['🚗', '車子'], ['⚽', '足球'], ['👟', '鞋子']]],
    ['哪一個可以載人？', ['🚌', '公車'], [['🍌', '香蕉'], ['🐶', '小狗'], ['🌳', '大樹']]],
    ['下雨天要用什麼？', ['☂️', '雨傘'], [['🕶️', '太陽眼鏡'], ['🍦', '冰淇淋'], ['🎈', '氣球']]],
    ['晚上天空有什麼？', ['🌙', '月亮'], [['🌞', '太陽'], ['🌈', '彩虹'], ['🦋', '蝴蝶']]],
    ['哪一個冰冰的？', ['🧊', '冰塊'], [['🔥', '火'], ['☕', '熱茶'], ['🌞', '太陽']]],
    ['睡覺要用什麼？', ['🛏️', '床'], [['🍳', '平底鍋'], ['⚽', '足球'], ['🚲', '腳踏車']]],
    ['哪一個是蔬菜？', ['🥕', '紅蘿蔔'], [['🍰', '蛋糕'], ['🍭', '棒棒糖'], ['🍩', '甜甜圈']]],
    ['誰會下蛋？', ['🐔', '母雞'], [['🐶', '小狗'], ['🐱', '貓咪'], ['🐷', '小豬']]],
    ['誰的鼻子長長的？', ['🐘', '大象'], [['🐶', '小狗'], ['🐥', '小雞'], ['🐟', '魚']]],
    ['誰的脖子長長的？', ['🦒', '長頸鹿'], [['🐷', '小豬'], ['🐰', '兔子'], ['🐸', '青蛙']]],
    ['打電話要用什麼？', ['📱', '手機'], [['🥄', '湯匙'], ['🧸', '玩具熊'], ['🎈', '氣球']]],
    ['冬天穿什麼最暖？', ['🧥', '外套'], [['🩳', '短褲'], ['👒', '草帽'], ['🕶️', '太陽眼鏡']]],
    ['誰最愛吃香蕉？', ['🐵', '猴子'], [['🐟', '魚'], ['🐔', '雞'], ['🐢', '烏龜']]]
  ];
  const PATTERN = [['🍎', '🍌'], ['🐶', '🐱'], ['⭐', '🌙'], ['🔴', '🔵'], ['🐸', '🐟'], ['🌸', '🍀'], ['🚗', '🚲'], ['🍓', '🍇']];
  const ODD = [['🐶', '🐱'], ['🍎', '🍅'], ['🚗', '🚌'], ['🌞', '🌙'], ['🐟', '🐠'], ['⚽', '🏀'], ['🍌', '🌽'], ['🐸', '🐢'], ['🍓', '🍒'], ['🐥', '🐧']];
  const LETTERS = 'ABDEFGHMNQRT';
  const ZHUYIN = ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ', 'ㄍ', 'ㄎ', 'ㄏ', 'ㄐ', 'ㄑ', 'ㄒ'];

  /* questions already asked: the next games pick fresh ones until a bank runs out */
  const SEEN = new Set();
  function fresh(tag, list) {
    let left = list.filter((_, i) => !SEEN.has(tag + i));
    if (!left.length) { list.forEach((_, i) => SEEN.delete(tag + i)); left = list.slice(); }
    const it = pick(left); SEEN.add(tag + list.indexOf(it)); return it;
  }
  /* build options: right answer first in `all`, then shuffle (or sort numbers) and remember where it went */
  function opts(all, sortNum) {
    const o = all.map((x, i) => Object.assign({ ok: i === 0 }, x));
    if (sortNum) o.sort((a, b) => parseFloat(a.label || a.icon) - parseFloat(b.label || b.icon)); else shuffle(o);
    return { opts: o, ans: o.findIndex(x => x.ok) };
  }
  function nearNums(n, lo, hi) {
    const s = new Set([n]); let guard = 0;
    while (s.size < 4 && guard++ < 50) { const d = n + (rint(2) ? 1 : -1) * (1 + rint(3)); if (d >= lo && d <= hi) s.add(d); }
    for (let k = lo; s.size < 4 && k <= hi; k++) s.add(k);
    return [...s];
  }
  const KID = {
    count() {
      const [e, name, unit] = pick(COUNT), n = 1 + rint(10);
      return { q: `有幾${unit}${name}？`, say: `數一數，有幾${unit}${name}？`, pic: { t: 'count', e, n }, ...opts(nearNums(n, 1, 10).map(v => ({ icon: String(v), label: '' })), true) };
    },
    add() {
      const e = pick(COUNT)[0], a = 1 + rint(3), b = 1 + rint(3);
      return { q: '合起來有幾個？', say: '合起來一共有幾個？', pic: { t: 'add', e, a, b }, ...opts(nearNums(a + b, 1, 8).map(v => ({ icon: String(v), label: '' })), true) };
    },
    sound() {
      const it = fresh('snd', SOUNDS), others = shuffle(SOUNDS.filter(x => x !== it)).slice(0, 3);
      return { q: '是誰在叫呢？', say: `「${it[0]}」是誰在叫？`, pic: { t: 'sound', s: it[0] }, ...opts([it, ...others].map(x => ({ icon: x[1], label: x[2] }))) };
    },
    color() {
      const it = fresh('col', COLORS), others = shuffle(COLORS.filter(x => x !== it)).slice(0, 3);
      return { q: `哪一個是${it[0]}的？`, say: `找一找，哪一個是${it[0]}的？`, pic: { t: 'color', c: it[1], n: it[0] }, ...opts([it, ...others].map(x => ({ icon: x[2], label: x[3] }))) };
    },
    shape() {
      if (rint(3) === 0) {
        const [e, k] = fresh('sth', SHAPE_THINGS), it = SHAPES.find(s => s[0] === k), others = shuffle(SHAPES.filter(s => s !== it)).slice(0, 3);
        return { q: '它是什麼形狀？', say: '這個東西是什麼形狀？', pic: { t: 'emoji', e }, ...opts([it, ...others].map(s => ({ icon: s[2], label: s[1], shape: s[0] }))) };
      }
      const it = fresh('shp', SHAPES), others = shuffle(SHAPES.filter(s => s !== it)).slice(0, 3);
      return { q: '這是什麼形狀？', say: '這是什麼形狀呢？', pic: { t: 'shape', s: it[0], c: pick(['#ff6fb7', '#2f8cff', '#22c26a', '#9b5cff', '#ff9a1f']) }, ...opts([it, ...others].map(s => ({ icon: s[2], label: s[1], shape: s[0] }))) };
    },
    shadow() {
      const cat = pick(SHADOWS), it = fresh('sh' + SHADOWS.indexOf(cat), cat), others = shuffle(cat.filter(x => x !== it)).slice(0, 3);
      return { q: '這是誰的影子？', say: '猜猜看，這是誰的影子？', pic: { t: 'shadow', e: it[0] }, ...opts([it, ...others].map(x => ({ icon: x[0], label: x[1] }))) };
    },
    which() {
      const it = fresh('wh', WHICH);
      return { q: it[0], say: it[0], pic: null, ...opts([it[1], ...it[2]].map(x => ({ icon: x[0], label: x[1] }))) };
    },
    pattern() {
      const [a, b] = pick(PATTERN), kind = rint(3), seq = kind === 0 ? [a, b, a, b, a] : kind === 1 ? [a, a, b, a, a] : [a, b, b, a, b];
      const next = kind === 0 ? b : kind === 1 ? b : b;   // ABABA→B, AABAA→B, ABBAB→B
      const extra = shuffle(PATTERN.flat().filter(x => x !== a && x !== b)).slice(0, 2);
      return { q: '接下來是哪一個？', say: '排排看，接下來是哪一個？', pic: { t: 'row', items: seq }, ...opts([next, a, ...extra].map(e => ({ icon: e, label: '' }))) };
    },
    odd() {
      const [a, b] = pick(ODD), at = rint(4), items = [0, 1, 2, 3].map(i => i === at ? b : a);
      return { q: '哪一個不一樣？', say: '仔細看，哪一個不一樣？', pic: { t: 'odd' }, opts: items.map(e => ({ icon: e, label: '' })), ans: at };
    },
    letter() {
      const U = pick(LETTERS.split('')), l = U.toLowerCase();
      const conf = { b: 'dpq', d: 'bpq', q: 'pdb', m: 'nw', n: 'mhu', h: 'nk', r: 'nf', t: 'fl', f: 'tl', g: 'qp', e: 'ca', a: 'oe' };
      const pool = shuffle(((conf[l] || '') + 'abdefghmnqrt').split('').filter((c, i, s) => c !== l && s.indexOf(c) === i));
      return { q: `大寫 ${U} 的小寫是哪個？`, say: `大寫 ${U}，小寫長什麼樣子？`, pic: { t: 'letter', s: U }, ...opts([l, ...pool.slice(0, 3)].map(c => ({ icon: c, label: '' }))) };
    },
    zhuyin() {
      const z = pick(ZHUYIN), others = shuffle(ZHUYIN.filter(x => x !== z)).slice(0, 3);
      return { q: '找出一樣的注音', say: `這是「${z}」，找出一樣的！`, pic: { t: 'letter', s: z }, ...opts([z, ...others].map(c => ({ icon: c, label: '' }))) };
    }
  };
  function kidQuestions(n) {
    const cats = shuffle(['count', 'add', 'sound', 'color', 'shape', 'shadow', 'which', 'which', 'pattern', 'odd', 'letter', 'zhuyin']).slice(0, n);
    if (!cats.includes('count')) cats[rint(n)] = 'count';
    if (!cats.includes('sound')) { const i = cats.findIndex(c => c !== 'count'); cats[i] = 'sound'; }
    return cats.map(c => KID[c]());
  }
  function adultQuestions(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      let it, guard = 0;
      do it = fresh('ad', ADULT); while (out.some(q => q.src === it) && guard++ < 20);
      const num = it.slice(2).every(s => /^\d/.test(s));
      out.push({ src: it, q: it[1], say: it[1], pic: { t: 'emoji', e: it[0] }, ...opts(it.slice(2).map(s => ({ label: s })), num) });
    }
    return out;
  }

  /* ------------------------------ drawing helpers ------------------------------ */
  const EMO = new Map();
  function emoSprite(ch, px, sil) {
    const b = px <= 44 ? 44 : px <= 90 ? 90 : px <= 150 ? 150 : 240, key = ch + '|' + b + '|' + (sil || '');
    let c = EMO.get(key); if (c) return c;
    c = document.createElement('canvas'); const S = Math.ceil(b * 1.3); c.width = c.height = S;
    const cg = c.getContext('2d'); cg.font = `${b}px ${EMOF}`; cg.textAlign = 'center'; cg.textBaseline = 'middle';
    cg.fillText(ch, S / 2, S / 2 + b * 0.05);
    if (sil) { cg.globalCompositeOperation = 'source-in'; cg.fillStyle = sil; cg.fillRect(0, 0, S, S); }
    EMO.set(key, c); return c;
  }
  function emoji(g, ch, x, y, px, sil) { const c = emoSprite(ch, px, sil), s = px * 1.3; g.drawImage(c, x - s / 2, y - s / 2, s, s); }
  function text(g, s, x, y, size, col, o) {
    o = o || {};
    g.font = `${o.w || 900} ${size}px ${o.f || FONT}`; g.textAlign = o.a || 'center'; g.textBaseline = 'middle';
    if (o.stroke) { g.lineWidth = o.lw || size * 0.2; g.strokeStyle = o.stroke; g.lineJoin = 'round'; g.strokeText(s, x, y, o.max); }
    g.fillStyle = col; g.fillText(s, x, y, o.max);
  }
  function wrap(g, s, maxW) {
    const out = []; let line = '';
    for (const ch of s) {
      const t = line + ch;
      if (line && g.measureText(t).width > maxW && !'，。？！、」）'.includes(ch)) { out.push(line); line = ch; } else line = t;
    }
    if (line) out.push(line); return out;
  }
  /* option marks: ▲ ◆ ● ■ — the same on the TV tiles and the phone buttons */
  function mark(g, k, x, y, r, col) {
    g.fillStyle = col; g.beginPath();
    if (k === 'tri') { g.moveTo(x, y - r); g.lineTo(x + r * 0.95, y + r * 0.72); g.lineTo(x - r * 0.95, y + r * 0.72); g.closePath(); }
    else if (k === 'dia') { g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y); g.closePath(); }
    else if (k === 'cir') g.arc(x, y, r * 0.85, 0, TAU);
    else g.rect(x - r * 0.75, y - r * 0.75, r * 1.5, r * 1.5);
    g.fill();
  }
  /* kid shapes (with a little face when big) */
  function shapePath(g, s, x, y, r) {
    g.beginPath();
    if (s === 'circle') g.arc(x, y, r, 0, TAU);
    else if (s === 'tri') { g.moveTo(x, y - r * 1.05); g.lineTo(x + r * 1.1, y + r * 0.8); g.lineTo(x - r * 1.1, y + r * 0.8); g.closePath(); }
    else if (s === 'square') g.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76);
    else if (s === 'rect') g.rect(x - r * 1.3, y - r * 0.62, r * 2.6, r * 1.24);
    else if (s === 'star') { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.48 : r * 1.12; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
    else if (s === 'heart') { g.moveTo(x, y + r * 0.95); g.bezierCurveTo(x - r * 1.55, y - r * 0.1, x - r * 0.75, y - r * 1.25, x, y - r * 0.45); g.bezierCurveTo(x + r * 0.75, y - r * 1.25, x + r * 1.55, y - r * 0.1, x, y + r * 0.95); g.closePath(); }
  }
  function drawShape(g, s, x, y, r, col, face) {
    g.lineJoin = 'round';
    shapePath(g, s, x, y + r * 0.08, r); g.fillStyle = 'rgba(0,0,0,.16)'; g.fill();
    shapePath(g, s, x, y, r); g.fillStyle = col; g.fill();
    g.lineWidth = Math.max(2, r * 0.08); g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
    if (!face) return;
    const ey = s === 'heart' ? y - r * 0.15 : s === 'tri' ? y + r * 0.1 : y - r * 0.08;
    g.fillStyle = INK; for (const sx of [-1, 1]) { g.beginPath(); g.arc(x + sx * r * 0.26, ey, r * 0.09, 0, TAU); g.fill(); }
    g.fillStyle = '#fff'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(x + sx * r * 0.26 - r * 0.03, ey - r * 0.03, r * 0.03, 0, TAU); g.fill(); }
    g.strokeStyle = INK; g.lineWidth = r * 0.06; g.lineCap = 'round'; g.beginPath(); g.arc(x, ey + r * 0.12, r * 0.14, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(x + sx * r * 0.48, ey + r * 0.2, r * 0.12, r * 0.07, 0, 0, TAU); g.fill(); }
  }
  function blob(g, x, y, r, seed) {
    g.beginPath();
    for (let k = 0; k <= 40; k++) {
      const a = k / 40 * TAU, w = 1 + 0.12 * Math.sin(a * 5 + seed) + 0.07 * Math.sin(a * 9 + seed * 2.3);
      const px = x + Math.cos(a) * r * w, py = y + Math.sin(a) * r * w * 0.92; k ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  }

  /* 咕咕博士: the host owl with round glasses, a bow tie, a mortarboard and a microphone */
  function drawOwl(g, x, y, s, o) {
    o = o || {};
    const B = '#b7794a', BD = '#7a4a26', BL = '#d9a171', CR = '#ffefd2', FACE = '#f7dcb2', t = o.t || 0;
    g.save(); g.translate(x, y - (o.hop || 0)); g.scale(s, s); if (o.rot) g.rotate(o.rot);
    g.lineJoin = 'round'; g.lineCap = 'round';
    // left wing (behind)
    g.save(); g.translate(-62, 8); g.rotate(0.28 + (o.flap || 0) * 0.5);
    g.fillStyle = BD; g.beginPath(); g.ellipse(0, 10, 24, 52, 0, 0, TAU); g.fill();
    g.fillStyle = B; g.beginPath(); g.ellipse(2, 6, 18, 44, 0, 0, TAU); g.fill(); g.restore();
    // body
    const grd = g.createRadialGradient(-24, -30, 10, 0, 6, 92); grd.addColorStop(0, BL); grd.addColorStop(0.6, B); grd.addColorStop(1, BD);
    g.fillStyle = grd; g.beginPath(); g.ellipse(0, 8, 70, 82, 0, 0, TAU); g.fill();
    g.strokeStyle = BD; g.lineWidth = 4; g.stroke();
    // ear tufts
    for (const sx of [-1, 1]) { g.fillStyle = B; g.strokeStyle = BD; g.lineWidth = 4; g.beginPath(); g.moveTo(sx * 30, -66); g.lineTo(sx * 62, -98); g.lineTo(sx * 58, -50); g.closePath(); g.fill(); g.stroke(); }
    // belly with little feather marks
    g.fillStyle = CR; g.beginPath(); g.ellipse(0, 36, 46, 46, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(160,100,60,.45)'; g.lineWidth = 3;
    for (const [u, v] of [[-20, 30], [0, 24], [20, 30], [-12, 50], [12, 50], [0, 66]]) { g.beginPath(); g.moveTo(u - 6, v - 3); g.lineTo(u, v + 3); g.lineTo(u + 6, v - 3); g.stroke(); }
    // face disc
    g.fillStyle = FACE; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 26, -26, 33, 0, TAU); g.fill(); }
    // eyes
    const lx = o.look || 0;
    for (const sx of [-1, 1]) {
      const ex = sx * 26, ey = -28;
      if (o.happy) { g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(ex, ey + 6, 13, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); continue; }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 22, 0, TAU); g.fill();
      const blink = (t % 4.3) < 0.13;
      if (blink) { g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(ex - 14, ey); g.lineTo(ex + 14, ey); g.stroke(); continue; }
      g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(ex + lx * 6, ey + 2, 14, 0, TAU); g.fill();
      g.fillStyle = INK; g.beginPath(); g.arc(ex + lx * 7, ey + 2, 9, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + lx * 7 - 3, ey - 2, 3.5, 0, TAU); g.fill();
    }
    // round glasses
    g.strokeStyle = INK; g.lineWidth = 4.5; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 26, -28, 26, 0, TAU); g.stroke(); }
    g.beginPath(); g.moveTo(-4, -32); g.quadraticCurveTo(0, -36, 4, -32); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 26 - 10, -40, 7, 4, -0.6, 0, TAU); g.fill(); }
    // beak (opens while talking)
    const open = clamp(o.talk || 0, 0, 1) * 9;
    g.fillStyle = '#ff9f1c'; g.strokeStyle = '#c96f00'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-11, -10); g.lineTo(11, -10); g.lineTo(0, 6); g.closePath(); g.fill(); g.stroke();
    if (open > 1) { g.fillStyle = '#7a2e1a'; g.beginPath(); g.moveTo(-8, -2); g.lineTo(8, -2); g.lineTo(0, 4 + open); g.closePath(); g.fill(); g.fillStyle = '#ffb64a'; g.beginPath(); g.moveTo(-8, 2 + open * 0.6); g.lineTo(8, 2 + open * 0.6); g.lineTo(0, 10 + open); g.closePath(); g.fill(); }
    // cheeks
    g.fillStyle = 'rgba(255,120,140,.35)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 44, -4, 10, 6, 0, 0, TAU); g.fill(); }
    // bow tie
    g.fillStyle = SKY; g.strokeStyle = DEEP; g.lineWidth = 3;
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(0, 14); g.lineTo(sx * 24, 3); g.lineTo(sx * 24, 27); g.closePath(); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(0, 15, 7, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 15, 15, 2.5, 0, TAU); g.fill(); }
    // mortarboard
    g.save(); g.translate(0, -78); g.rotate(-0.12);
    g.fillStyle = '#2b2350'; g.beginPath(); g.ellipse(0, 6, 30, 10, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-48, -6); g.lineTo(0, -22); g.lineTo(48, -6); g.lineTo(0, 10); g.closePath(); g.fill();
    g.strokeStyle = '#4a3f80'; g.lineWidth = 2; g.stroke();
    const sw = Math.sin(t * 2.4) * 0.25;
    g.strokeStyle = '#ffd21f'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -6); g.lineTo(34, -2); g.lineTo(38 + sw * 8, 24); g.stroke();
    g.fillStyle = '#ffd21f'; g.beginPath(); g.ellipse(38 + sw * 8, 28, 4, 7, sw, 0, TAU); g.fill();
    g.restore();
    // right wing with the microphone
    g.save(); g.translate(58, 12); g.rotate(-0.3 - (o.wing || 0) * 1.1);
    g.fillStyle = BD; g.beginPath(); g.ellipse(0, 6, 22, 48, 0, 0, TAU); g.fill();
    g.fillStyle = B; g.beginPath(); g.ellipse(-2, 4, 16, 40, 0, 0, TAU); g.fill();
    g.translate(0, -38); g.rotate(-0.5);
    g.fillStyle = '#3a3a48'; g.beginPath(); g.roundRect(-5, -4, 10, 34, 4); g.fill();
    g.fillStyle = '#c9ccd8'; g.beginPath(); g.arc(0, -10, 11, 0, TAU); g.fill();
    g.strokeStyle = '#8b8fa3'; g.lineWidth = 1.5; for (let k = -6; k <= 6; k += 4) { g.beginPath(); g.moveTo(-9, -10 + k); g.lineTo(9, -10 + k); g.stroke(); }
    g.fillStyle = SKY; g.fillRect(-6, 6, 12, 5);
    g.restore();
    g.restore();
  }

  /* ------------------------------ the game ------------------------------ */
  class Quiz {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = null; this.edge = '#120c2c';
      this.teams = !!ctx.teams;
      this.N = this.kid ? 8 : 10; this.limit = this.kid ? 15 : 12;
      this.qs = this.kid ? kidQuestions(this.N) : adultQuestions(this.N);
      this.qi = -1; this.phase = 'pre'; this.pt = 0; this.qt = 0; this.started = false; this.flip = 0;
      const order = this.teams ? ctx.players.slice().sort((a, b) => a.team - b.team) : ctx.players.slice();
      const n = order.length, sp = Math.min(250, 1420 / n), gap = this.teams && n > 1 ? 50 : 0;
      const w0 = sp * (n - 1) + gap;
      this.es = order.map((p, i) => {
        const x = 800 - w0 / 2 + i * sp + (this.teams && p.team === 1 ? gap : 0);
        return { p, x, w: Math.min(206, sp - 26), score: 0, disp: 0, right: 0, pick: null, at: 0, res: null, gain: 0, streak: 0, best: 0,
          hop: 0, hv: 0, cheer: 0, sad: 0, cur: 0, kcd: 0, lit: 0, fast: false };
      });
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.aud = []; for (let x = 18; x < W; x += rnd(46, 62)) this.aud.push({ x, y: 884 + rnd(-6, 8), r: rnd(24, 31), k: rint(4), ph: rnd(0, TAU), hop: 0, stick: pick(['#ff6fb7', '#7dd3fc', '#fde047', '#86efac', '#c4b5fd']), has: Math.random() < 0.45 });
      this.cheer = 0; this.host = { say: '', sayT: 0, talk: 0, wing: 0, happy: 0, hop: 0, hv: 0 };
      this.beams = [{ sx: 230, a: 0 }, { sx: 640, a: 1.7 }, { sx: 960, a: 3.1 }, { sx: 1370, a: 4.4 }];
      this.bulb = 0; this.lastTick = -1;
      this.say(this.kid ? '小朋友好！我是咕咕博士！' : '歡迎來到快問快答！');
      this.next(2.4);
    }
    say(s, hold) { this.host.say = s; this.host.sayT = hold || 3.2; this.host.talk = 1; }
    live(e) { return e.p.online || e.p.local; }
    get cur() { return this.qs[this.qi] || null; }
    next(wait) {
      this.qi++;
      if (this.qi >= this.N) { this.phase = 'end'; this.pt = 2.2; this.ctx.sfx('win'); this.say('比賽結束！大家好棒！', 4); this.host.happy = 3; this.cheer = 3; return; }
      this.phase = 'pre'; this.pt = wait || 1.7; this.flip = 0;
      for (const e of this.es) { e.pick = null; e.at = 0; e.res = null; e.gain = 0; e.fast = false; e.cur = 0; }
      if (this.qi === this.N - 1) { Fx.announce('最後一題！', '#fde047', BCY); this.say('最後一題囉！'); }
      else if (this.qi > 0) this.say(pick(this.kid ? ['下一題來了！', '準備好了嗎？', '看清楚喔！'] : ['下一題！', '準備好了嗎？', '專心喔！']));
      this.ctx.sfx('whoosh');
    }
    ask() {
      this.phase = 'ask'; this.qt = 0; this.lastTick = -1; this.ctx.sfx('go');
      this.say(this.kid ? this.cur.say : pick(['請作答！', '想一想…', '快搶答！']), this.kid ? this.limit : 2.5);
    }
    choose(e, i) {
      if (this.phase !== 'ask' || e.pick != null || !(i >= 0 && i < this.cur.opts.length)) return;
      e.pick = i; e.at = this.qt; e.lit = 1;
      this.ctx.sfx('pop'); this.ctx.buzz(e.p, 30);
      Fx.ring(e.x, PTOP + 8, '#fde047', 70, 0.4);
    }
    onChoose(p, id) { const e = this.by.get(p); if (e && /^o\d$/.test(id)) this.choose(e, +id[1]); }
    reveal() {
      const Q = this.cur; this.phase = 'reveal'; this.pt = this.qi === this.N - 1 ? 3.8 : 3.4;
      let any = false, first = null;
      for (const e of this.es) {
        if (e.pick == null) { e.res = 'none'; e.gain = 0; e.streak = 0; continue; }
        if (e.pick === Q.ans) {
          e.res = 'right'; e.gain = 100 + Math.round(clamp(1 - e.at / this.limit, 0, 1) * 100); e.right++; e.streak++; e.best = Math.max(e.best, e.streak); any = true;
          if (!first || e.at < first.at) first = e;
        } else { e.res = 'wrong'; e.gain = this.kid ? 0 : -Math.min(30, e.score); e.streak = 0; }
      }
      if (first && this.es.filter(e => e.res === 'right').length > 1) first.fast = true;
      const label = Q.opts[Q.ans].label || Q.opts[Q.ans].icon;
      if (any) { this.ctx.sfx('star'); this.cheer = 2.2; this.host.happy = 2.4; this.say(`答案是「${label}」！`); }
      else { this.ctx.sfx('bonk'); this.say(`答案是「${label}」喔！`); }
      this.ansX = this.tileRect(Q.ans); Fx.burst(this.ansX.x + this.ansX.w / 2, this.ansX.y + this.ansX.h / 2, '#fde047', 18, 300);
      this.es.forEach((e, i) => {
        const delay = 0.15 + i * 0.07;
        e.revealIn = delay;
      });
    }
    /* option tiles on the TV: one row of tall tiles for kids, a 2×2 grid of wide ones for grown-ups */
    tileRect(i) {
      const Q = this.cur, n = Q ? Q.opts.length : 4;
      if (this.kid) { const w = 232, gap = 22, x0 = 800 - (n * w + (n - 1) * gap) / 2; return { x: x0 + i * (w + gap), y: 462, w, h: 114 }; }
      return { x: i % 2 ? 806 : 296, y: i < 2 ? 462 : 524, w: 498, h: 54 };
    }
    update(dt) {
      this.t += dt; this.started = true;
      const H_ = this.host;
      H_.sayT -= dt;
      H_.happy = Math.max(0, H_.happy - dt); H_.wing += ((this.phase === 'reveal' ? 1 : this.phase === 'ask' ? 0.15 : 0.45) - H_.wing) * Math.min(1, dt * 5);
      if (H_.hop > 0 || H_.hv) { H_.hv -= 1600 * dt; H_.hop = Math.max(0, H_.hop + H_.hv * dt); if (!H_.hop) H_.hv = 0; }
      if (H_.happy > 0 && !H_.hop && (this.t * 3 | 0) % 2 === 0) H_.hv = 260;
      this.cheer = Math.max(0, this.cheer - dt);
      this.bulb += dt * (this.phase === 'reveal' ? 14 : this.phase === 'ask' ? 5 : 8);
      for (const b of this.beams) b.a += dt * (this.phase === 'ask' ? 0.5 : 0.9);
      for (const a of this.aud) {
        if (this.cheer > 0 && !a.hop && Math.random() < dt * 4) a.hv = rnd(160, 300);
        if (a.hv || a.hop) { a.hv -= 1400 * dt; a.hop = Math.max(0, a.hop + a.hv * dt); if (!a.hop) a.hv = 0; }
      }
      for (const e of this.es) {
        e.disp += (e.score - e.disp) * Math.min(1, dt * 5); if (Math.abs(e.score - e.disp) < 0.5) e.disp = e.score;
        e.lit = Math.max(0, e.lit - dt * 2);
        if (e.hv || e.hop) { e.hv -= 1500 * dt; e.hop = Math.max(0, e.hop + e.hv * dt); if (!e.hop) e.hv = 0; }
        if (e.revealIn != null) {
          e.revealIn -= dt;
          if (e.revealIn <= 0) {
            e.revealIn = null; e.score = Math.max(0, e.score + e.gain);
            const C = this.teams ? TEAMS[e.p.team].c : PARTY_COLORS[e.p.col].c;
            if (e.res === 'right') { e.hv = 420; e.cheer = 2.4; Fx.burst(e.x, PY - 10, C, 16, 280); Fx.burst(e.x, PY - 10, '#fde047', 10, 220); Fx.pop(e.x, PY - 92, '+' + e.gain, '#16a34a', 40); this.ctx.buzz(e.p, 80); }
            else if (e.res === 'wrong') { e.sad = 2.4; Fx.pop(e.x, PY - 92, e.gain ? String(e.gain) : '✗', '#ef4444', 38); }
            else { e.sad = 1.2; Fx.pop(e.x, PY - 92, '⌛', '#94a3b8', 34); }
          }
        }
        e.cheer = Math.max(0, e.cheer - dt); e.sad = Math.max(0, e.sad - dt);
        if (e.cheer > 0 && !e.hop && !e.hv) e.hv = 300;
        // keyboard players: move a cursor over the tiles, the button answers
        if (e.p.local) {
          const pressed = this.ctx.pressed(e.p, 0);
          if (this.phase === 'ask' && e.pick == null) {
            const n = this.cur.opts.length, i = this.ctx.input(e.p); e.kcd -= dt;
            if (e.kcd <= 0) {
              if (Math.abs(i.x) > 0.6) { e.cur = this.kid ? (e.cur + (i.x > 0 ? 1 : n - 1)) % n : (e.cur ^ 1) % n; e.kcd = 0.22; this.ctx.sfx('tick'); }
              else if (!this.kid && Math.abs(i.y) > 0.6) { e.cur = (e.cur + 2) % 4; e.kcd = 0.22; this.ctx.sfx('tick'); }
            }
            if (pressed) this.choose(e, e.cur);
          }
        }
      }
      this.pt -= dt;
      if (this.phase === 'pre') { if (this.pt <= 0) this.ask(); }
      else if (this.phase === 'ask') {
        this.qt += dt; this.flip = Math.min(1, this.flip + dt * 3.2);
        const left = Math.ceil(this.limit - this.qt);
        if (left <= 5 && left > 0 && left !== this.lastTick) { this.lastTick = left; this.ctx.sfx('tick'); }
        const live = this.es.filter(e => this.live(e)), done = live.length > 0 && live.every(e => e.pick != null);
        if (done && this.allT == null) this.allT = 0.7;
        if (this.allT != null) this.allT -= dt;
        if (this.qt >= this.limit || (this.allT != null && this.allT <= 0)) {
          this.allT = null; this.phase = 'lock'; this.pt = 0.8;
          this.say(this.qt >= this.limit ? '時間到！' : '大家都答完了！', 1); this.ctx.sfx(this.qt >= this.limit ? 'end' : 'coin');
        }
      }
      else if (this.phase === 'lock') { if (this.pt <= 0) this.reveal(); }
      else if (this.phase === 'reveal') { if (this.pt <= 0) this.next(); }
      else if (this.phase === 'end') { if (this.pt <= 0) this.over = true; }
    }

    /* ------------------------------ drawing ------------------------------ */
    bg(g) {
      const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
      if (!this.bgCv || this.bgS !== s) {
        const c = this.bgCv || document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(H * s);
        const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 0, 0); this.paintBg(cg); this.bgCv = c; this.bgS = s;
      }
      g.drawImage(this.bgCv, 0, 0, W, H);
    }
    paintBg(g) {
      // back wall
      let gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, '#120b30'); gr.addColorStop(1, '#2e1b68');
      g.fillStyle = gr; g.fillRect(0, 0, W, 640);
      // LED wall: a soft grid of dots
      for (let y = 112; y < 620; y += 26) for (let x = 20; x < W; x += 26) {
        const k = 0.5 + 0.5 * Math.sin(x * 0.013 + y * 0.021);
        g.fillStyle = `rgba(${120 + k * 80 | 0},${90 + k * 60 | 0},255,${0.07 + k * 0.08})`; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill();
      }
      // the big arch behind the board
      gr = g.createLinearGradient(0, 120, 0, 640); gr.addColorStop(0, '#3b2a8c'); gr.addColorStop(1, '#25175a');
      g.fillStyle = gr; g.beginPath(); g.roundRect(262, 118, 1076, 540, [70, 70, 0, 0]); g.fill();
      g.strokeStyle = 'rgba(125,211,252,.35)'; g.lineWidth = 4; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo(262 + k * 134, 130); g.lineTo(262 + k * 134, 640); g.stroke(); }
      // side curtains
      for (const side of [0, 1]) {
        const x0 = side ? W - 84 : 0;
        for (let k = 0; k < 6; k++) {
          const x = x0 + k * 14; gr = g.createLinearGradient(x, 0, x + 14, 0); gr.addColorStop(0, '#7f1230'); gr.addColorStop(0.5, '#d1294f'); gr.addColorStop(1, '#7f1230');
          g.fillStyle = gr; g.fillRect(x, 0, 15, 840);
        }
        g.fillStyle = '#fbbf24'; g.beginPath(); g.ellipse(side ? W - 42 : 42, 470, 46, 10, 0, 0, TAU); g.fill();
      }
      // stage floor
      gr = g.createLinearGradient(0, 640, 0, 846); gr.addColorStop(0, '#4b3a9a'); gr.addColorStop(1, '#231650');
      g.fillStyle = gr; g.fillRect(0, 640, W, 206);
      g.fillStyle = 'rgba(255,255,255,.06)'; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(800 + (k - 4) * 60, 640); g.lineTo(800 + (k - 4) * 260, 846); g.lineTo(800 + (k - 4) * 260 + 40, 846); g.lineTo(800 + (k - 4) * 60 + 10, 640); g.fill(); }
      g.strokeStyle = 'rgba(125,211,252,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 641); g.lineTo(W, 641); g.stroke();
      // stage front edge
      g.fillStyle = '#1a1040'; g.fillRect(0, 840, W, 60);
      g.fillStyle = '#facc15'; g.fillRect(0, 838, W, 5);
      // host desk
      gr = g.createLinearGradient(0, 520, 0, 650); gr.addColorStop(0, '#0ea5e9'); gr.addColorStop(1, '#075985');
      g.fillStyle = gr; g.beginPath(); g.moveTo(52, 524); g.lineTo(248, 524); g.lineTo(232, 652); g.lineTo(68, 652); g.closePath(); g.fill();
      g.fillStyle = '#e0f2fe'; g.fillRect(44, 512, 212, 16);
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(52, 528, 196, 6);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(150, 588, 34, 0, TAU); g.fill();
      text(g, '?', 150, 590, 50, SKY, { f: NUMF });
      // the board frame
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(BX0 - 18, BY0 - 12, BX1 - BX0 + 36, BY1 - BY0 + 36, 34); g.fill();
      gr = g.createLinearGradient(0, BY0 - 18, 0, BY1 + 18); gr.addColorStop(0, '#1e3a8a'); gr.addColorStop(1, '#172554');
      g.fillStyle = gr; g.beginPath(); g.roundRect(BX0 - 20, BY0 - 20, BX1 - BX0 + 40, BY1 - BY0 + 40, 32); g.fill();
      g.strokeStyle = '#38bdf8'; g.lineWidth = 3; g.stroke();
      gr = g.createLinearGradient(0, BY0, 0, BY1); gr.addColorStop(0, '#fffdf6'); gr.addColorStop(1, '#ffefd0');
      g.fillStyle = gr; g.beginPath(); g.roundRect(BX0, BY0, BX1 - BX0, BY1 - BY0, 18); g.fill();
      // timer plate
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(TX, TY + 6, TR + 22, 0, TAU); g.fill();
      gr = g.createLinearGradient(0, TY - TR, 0, TY + TR); gr.addColorStop(0, '#1e3a8a'); gr.addColorStop(1, '#172554');
      g.fillStyle = gr; g.beginPath(); g.arc(TX, TY, TR + 20, 0, TAU); g.fill(); g.strokeStyle = '#38bdf8'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#0b1435'; g.beginPath(); g.arc(TX, TY, TR - 12, 0, TAU); g.fill();
      g.fillStyle = 'rgba(30,58,138,.8)'; g.beginPath(); g.roundRect(TX - 112, TY + 128, 224, 116, 22); g.fill();
      g.strokeStyle = 'rgba(56,189,248,.5)'; g.lineWidth = 2; g.stroke();
      // the quiz show sign over the host
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.roundRect(30, 132, 244, 64, 20); g.fill();
      g.fillStyle = '#fde047'; g.beginPath(); g.roundRect(28, 126, 244, 64, 20); g.fill();
      g.strokeStyle = '#f59e0b'; g.lineWidth = 4; g.stroke();
      text(g, '🧠 快問快答', 150, 159, 34, '#7c2d12');
    }
    beamsDraw(g) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const rev = this.phase === 'reveal', winners = rev ? this.es.filter(e => e.res === 'right') : [];
      this.beams.forEach((b, i) => {
        let tx = b.sx + Math.sin(b.a) * 320;
        if (winners.length) tx = winners[i % winners.length].x;
        const ty = rev && winners.length ? PTOP : 760, w = rev && winners.length ? 110 : 150;
        const gr = g.createLinearGradient(b.sx, -20, tx, ty); gr.addColorStop(0, 'rgba(255,248,220,.17)'); gr.addColorStop(1, 'rgba(255,248,220,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(b.sx - 14, -20); g.lineTo(b.sx + 14, -20); g.lineTo(tx + w, ty); g.lineTo(tx - w, ty); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,248,220,.07)'; g.beginPath(); g.ellipse(tx, ty, w, w * 0.18, 0, 0, TAU); g.fill();
      });
      g.restore();
    }
    bulbsDraw(g) {
      const per = [], x0 = BX0 - 10, y0 = BY0 - 10, x1 = BX1 + 10, y1 = BY1 + 10;
      if (!this.bulbPts) {
        const pts = []; const L = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]];
        for (const [a, b, c, d] of L) { const len = Math.hypot(c - a, d - b), n = Math.round(len / 42); for (let k = 0; k < n; k++) pts.push([a + (c - a) * k / n, b + (d - b) * k / n]); }
        this.bulbPts = pts;
      }
      const ph = this.bulb | 0;
      this.bulbPts.forEach(([x, y], i) => {
        const on = this.phase === 'reveal' ? (i + ph) % 2 === 0 : (i + ph) % 4 === 0;
        if (on) { g.fillStyle = 'rgba(253,224,71,.28)'; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill(); }
        g.fillStyle = on ? '#fef08a' : '#6b6290'; g.beginPath(); g.arc(x, y, 4.6, 0, TAU); g.fill();
      });
    }
    boardDraw(g, t) {
      const Q = this.cur, ph = this.phase;
      g.save(); g.beginPath(); g.roundRect(BX0, BY0, BX1 - BX0, BY1 - BY0, 18); g.clip();
      if (ph === 'pre' || ph === 'end' || !Q) {
        const k = back(1 - Math.max(0, this.pt - (ph === 'end' ? 1.2 : 0.7)) / 1);
        g.save(); g.translate(800, BCY); g.scale(k, k);
        if (ph === 'end') { emoji(g, '🏆', 0, -50, 120); text(g, '比賽結束！', 0, 80, 72, DEEP); }
        else {
          emoji(g, '🧠', -170, -6, 110);
          text(g, `第 ${this.qi + 1} 題`, 60, -20, 96, DEEP, { f: NUMF });
          text(g, `共 ${this.N} 題`, 60, 62, 34, '#64748b', { w: 700 });
        }
        g.restore(); g.restore(); return;
      }
      // the question flips in
      const k = ease(ph === 'ask' ? this.flip : 1);
      g.translate(800, BCY); g.scale(1, Math.max(0.02, k)); g.translate(-800, -BCY);
      if (this.kid) this.kidBoard(g, Q, t); else this.adultBoard(g, Q, t);
      g.restore();
    }
    adultBoard(g, Q, t) {
      emoji(g, Q.pic.e, 404, BCY + Math.sin(t * 2) * 6, 124);
      g.font = `900 50px ${FONT}`; let size = 50, lines = wrap(g, Q.q, 760);
      if (lines.length > 2) { size = 42; g.font = `900 42px ${FONT}`; lines = wrap(g, Q.q, 760); }
      const lh = size * 1.32, y0 = BCY - (lines.length - 1) * lh / 2;
      lines.forEach((l, i) => text(g, l, 880, y0 + i * lh, size, INK));
    }
    kidBoard(g, Q, t) {
      const P = Q.pic, cy = 326;
      if (!P) {   // a "which one" question: just the words, big, with a bouncing question mark
        text(g, Q.q, 800, 250, 64, INK);
        emoji(g, '❓', 800, 360 - Math.abs(Math.sin(t * 3)) * 14, 76);
        return;
      }
      text(g, Q.q, 800, 192, 40, INK);
      if (P.t === 'count') {
        const n = P.n, per = n > 5 ? Math.ceil(n / 2) : n, rows = n > 5 ? 2 : 1, sp = 104;
        for (let i = 0; i < n; i++) {
          const r = i / per | 0, c = i % per, inRow = r ? n - per : per;
          const x = 800 + (c - (inRow - 1) / 2) * sp, y = cy + (r - (rows - 1) / 2) * 96;
          const pop = back((this.flip * 1.6 - i * 0.05));
          emoji(g, P.e, x, y + Math.sin(t * 3 + i) * 3, 80 * Math.max(0.01, pop));
        }
      } else if (P.t === 'add') {
        const sz = 64, sp = 72, all = [];
        for (let i = 0; i < P.a; i++) all.push(['e', P.e]); all.push(['t', '＋']); for (let i = 0; i < P.b; i++) all.push(['e', P.e]); all.push(['t', '＝']); all.push(['e', '❓']);
        const x0 = 800 - (all.length - 1) * sp / 2;
        all.forEach(([k, s], i) => k === 'e' ? emoji(g, s, x0 + i * sp, cy + (s === '❓' ? Math.sin(t * 4) * 6 : 0), sz) : text(g, s, x0 + i * sp, cy, 60, DEEP));
      } else if (P.t === 'row') {
        const sp = 132, x0 = 800 - 5 * sp / 2;
        P.items.forEach((e, i) => emoji(g, e, x0 + i * sp, cy + Math.sin(t * 3 + i * 0.8) * 5, 92));
        const x = x0 + 5 * sp; g.strokeStyle = SKY; g.lineWidth = 5; g.setLineDash([12, 8]); g.beginPath(); g.roundRect(x - 56, cy - 56, 112, 112, 24); g.stroke(); g.setLineDash([]);
        text(g, '?', x, cy + 4, 80, SKY, { f: NUMF });
      } else if (P.t === 'odd') {
        emoji(g, '🔍', 800, cy + 6 + Math.sin(t * 2.4) * 8, 140);
      } else if (P.t === 'emoji') {
        emoji(g, P.e, 800, cy + Math.sin(t * 2) * 8, 160);
      } else if (P.t === 'shadow') {
        const s = 1 + Math.sin(t * 2.2) * 0.03;
        g.fillStyle = 'rgba(14,165,233,.12)'; g.beginPath(); g.arc(800, cy, 112, 0, TAU); g.fill();
        emoji(g, P.e, 800, cy, 180 * s, '#2b2350');
        emoji(g, '❓', 960, cy - 70 + Math.sin(t * 4) * 6, 54);
      } else if (P.t === 'color') {
        g.fillStyle = 'rgba(0,0,0,.12)'; blob(g, 806, cy + 10, 96, 1.3); g.fill();
        g.fillStyle = P.c; blob(g, 800, cy, 96, 1.3); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(770, cy - 46, 34, 16, -0.5, 0, TAU); g.fill();
        for (const [dx, dy, r] of [[-150, -60, 16], [150, 50, 20], [130, -80, 11], [-140, 70, 12]]) { g.fillStyle = P.c; g.beginPath(); g.arc(800 + dx, cy + dy, r, 0, TAU); g.fill(); }
        emoji(g, '🖌️', 960, cy + 40, 70);
      } else if (P.t === 'shape') {
        drawShape(g, P.s, 800, cy + Math.sin(t * 2.4) * 6, 96, P.c, true);
      } else if (P.t === 'sound') {
        emoji(g, '🔊', 560, cy, 96);
        g.strokeStyle = SKY; g.lineWidth = 7; g.lineCap = 'round';
        for (let k = 0; k < 3; k++) { const ph = (t * 1.6 + k / 3) % 1; g.globalAlpha = 1 - ph; g.beginPath(); g.arc(560, cy, 70 + ph * 60, -0.6, 0.6); g.stroke(); }
        g.globalAlpha = 1;
        const wob = Math.sin(t * 10) * 0.03, w = 440, h = 150, bx = 900;
        g.save(); g.translate(bx, cy); g.rotate(wob);
        g.fillStyle = '#fff'; g.strokeStyle = SKY; g.lineWidth = 6;
        g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 60); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-w / 2 + 6, 10); g.lineTo(-w / 2 - 50, 34); g.lineTo(-w / 2 + 10, 44); g.fill();
        text(g, P.s, 0, 4, 84, '#e11d48', { max: w - 40 });
        g.restore();
      } else if (P.t === 'letter') {
        g.fillStyle = '#e0f2fe'; g.strokeStyle = SKY; g.lineWidth = 6; g.beginPath(); g.roundRect(800 - 100, cy - 100, 200, 200, 34); g.fill(); g.stroke();
        text(g, P.s, 800, cy + 8, 156, DEEP, { f: /[A-Za-z]/.test(P.s) ? NUMF : FONT });
      }
    }
    optIcon(g, o, x, y, size, white) {
      if (o.shape) drawShape(g, o.shape, x, y, size * 0.42, white ? '#fff' : SKY, false);
      else if (isEmo(o.icon)) emoji(g, o.icon, x, y, size);
      else text(g, o.icon, x, y + size * 0.04, size, '#fff', { f: /[0-9A-Za-z]/.test(o.icon) ? NUMF : FONT, stroke: 'rgba(0,0,0,.18)', lw: 8 });
    }
    tilesDraw(g, t) {
      const Q = this.cur, ph = this.phase;
      if (!Q || ph === 'pre' || ph === 'end') return;
      const rev = ph === 'reveal', k = ease(ph === 'ask' ? this.flip * 1.3 - 0.2 : 1);
      Q.opts.forEach((o, i) => {
        const R = this.tileRect(i), O = OPT[i], right = i === Q.ans;
        const dim = rev && !right, pulse = rev && right ? 1 + Math.sin(t * 8) * 0.025 : 1;
        g.save(); g.translate(R.x + R.w / 2, R.y + R.h / 2); g.scale(pulse * Math.max(0.01, k), pulse * Math.max(0.01, k)); g.translate(-R.w / 2, -R.h / 2);
        g.globalAlpha = dim ? 0.32 : 1;
        if (rev && right) { g.fillStyle = 'rgba(253,224,71,.45)'; g.beginPath(); g.roundRect(-10, -10, R.w + 20, R.h + 20, 26); g.fill(); }
        g.fillStyle = O.d; g.beginPath(); g.roundRect(0, 5, R.w, R.h, 18); g.fill();
        g.fillStyle = O.c; g.beginPath(); g.roundRect(0, 0, R.w, R.h, 18); g.fill();
        g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.roundRect(6, 4, R.w - 12, R.h * 0.42, 14); g.fill();
        if (rev && right) { g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.roundRect(0, 0, R.w, R.h, 18); g.stroke(); }
        if (this.kid) {
          mark(g, O.k, 22, 22, 11, 'rgba(255,255,255,.85)');
          this.optIcon(g, o, R.w / 2, o.label ? 46 : R.h / 2, o.label ? 60 : 78, true);
          if (o.label) text(g, o.label, R.w / 2, 95, 25, '#fff', { stroke: 'rgba(0,0,0,.2)', lw: 6, max: R.w - 16 });
        } else {
          g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(32, R.h / 2, 21, 0, TAU); g.fill();
          mark(g, O.k, 32, R.h / 2 + (O.k === 'tri' ? 2 : 0), 12, O.c);
          text(g, o.label, 64, R.h / 2 + 1, 32, '#fff', { a: 'left', stroke: 'rgba(0,0,0,.18)', lw: 6, max: R.w - 120 });
        }
        if (rev && right) {
          g.fillStyle = '#16a34a'; g.beginPath(); g.arc(R.w - 4, 2, 24, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke();
          g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(R.w - 15, 2); g.lineTo(R.w - 7, 10); g.lineTo(R.w + 8, -7); g.stroke();
        }
        g.globalAlpha = 1;
        // keyboard cursors
        if (ph === 'ask') {
          const here = this.es.filter(e => e.p.local && e.pick == null && e.cur === i);
          here.forEach((e, j) => { g.strokeStyle = '#fff'; g.lineWidth = 5; g.setLineDash([10, 7]); g.beginPath(); g.roundRect(-6, -6, R.w + 12, R.h + 12, 22); g.stroke(); g.setLineDash([]); drawCritter(g, R.w - 18 - j * 30, R.h - 6, 15, e.p.col, e.p.animal, { noShadow: true, step: 0, moving: false }); });
        }
        // who picked what (after the reveal)
        if (rev) {
          const who = this.es.filter(e => e.pick === i);
          who.forEach((e, j) => drawCritter(g, this.kid ? R.w / 2 + (j - (who.length - 1) / 2) * 32 : R.w - 64 - j * 32, this.kid ? -4 : R.h / 2 + 2, 15, e.p.col, e.p.animal, { noShadow: true, happy: right, stun: !right, step: 0, moving: false }));
        }
        g.restore();
      });
    }
    timerDraw(g) {
      const ph = this.phase, frac = ph === 'ask' ? clamp(1 - this.qt / this.limit, 0, 1) : ph === 'pre' ? 1 : 0;
      const left = Math.max(0, Math.ceil(this.limit - this.qt));
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 18; g.beginPath(); g.arc(TX, TY, TR, 0, TAU); g.stroke();
      const col = frac > 0.5 ? '#22c55e' : frac > 0.25 ? '#facc15' : '#ef4444';
      if (frac > 0) { g.strokeStyle = col; g.lineWidth = 18; g.beginPath(); g.arc(TX, TY, TR, -Math.PI / 2, -Math.PI / 2 + TAU * frac); g.stroke(); }
      if (ph === 'ask') {
        const urgent = left <= 3, s = urgent ? 1 + (1 - (this.limit - this.qt) % 1) * 0.15 : 1;
        text(g, String(left), TX, TY + 4, 92 * s, urgent ? '#fca5a5' : '#fff', { f: NUMF });
      } else if (ph === 'reveal' || ph === 'lock') emoji(g, ph === 'lock' ? '⏰' : '💡', TX, TY, 80);
      else emoji(g, ph === 'end' ? '🏆' : '🧠', TX, TY, 80);
      // question counter and who has answered
      text(g, ph === 'end' ? '全部答完！' : `第 ${Math.min(this.qi + 1, this.N)} / ${this.N} 題`, TX, TY + 158, 32, '#fff', { f: NUMF });
      const n = this.es.length, live = this.es.filter(e => this.live(e)).length, done = this.es.filter(e => e.pick != null).length;
      text(g, ph === 'ask' || ph === 'lock' ? `已作答 ${done} / ${live}` : ph === 'reveal' ? `答對 ${this.es.filter(e => e.res === 'right').length} 人` : ph === 'end' && this.lead() ? `🏆 最高分：${this.lead().p.name}` : '看大螢幕！', TX, TY + 200, 24, '#bae6fd', { w: 700 });
      const sp = Math.min(30, 200 / Math.max(1, n));
      this.es.forEach((e, i) => {
        const x = TX + (i - (n - 1) / 2) * sp, y = TY + 230, on = e.pick != null;
        g.fillStyle = on ? '#fde047' : 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill();
      });
    }
    hostDraw(g, t) {
      const H_ = this.host, talk = H_.sayT > 0 ? Math.abs(Math.sin(t * 14)) * clamp(H_.sayT, 0, 1) : 0;
      const look = this.phase === 'reveal' && this.ansX ? 1 : this.phase === 'ask' ? 0.8 : Math.sin(t * 0.7) * 0.6;
      drawOwl(g, HX, HY + Math.sin(t * 2) * 3, 0.98, { t, talk: this.phase === 'ask' ? talk * 0.4 : talk, wing: H_.wing, happy: H_.happy > 0, hop: H_.hop, look, flap: Math.sin(t * 3) * 0.1 });
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(44, 528, 212, 8);   // desk edge shadow over the owl
      if (H_.sayT > 0 && H_.say) {
        g.font = `900 25px ${FONT}`; const lines = wrap(g, H_.say, 216), lh = 32, h = lines.length * lh + 24, y = 278 - h / 2;
        const a = clamp(H_.sayT * 3, 0, 1); g.globalAlpha = a;
        g.fillStyle = '#fff'; g.beginPath(); g.roundRect(24, y, 252, h, 20); g.fill();
        g.beginPath(); g.moveTo(130, y + h - 2); g.lineTo(150, y + h + 18); g.lineTo(166, y + h - 2); g.fill();
        g.strokeStyle = SKY; g.lineWidth = 4; g.beginPath(); g.roundRect(24, y, 252, h, 20); g.stroke();
        lines.forEach((l, i) => text(g, l, 150, y + 12 + lh / 2 + i * lh, 25, INK));
        g.globalAlpha = 1;
      }
    }
    podiumsDraw(g, t) {
      const ph = this.phase;
      for (const e of this.es) {
        const p = e.p, x = e.x, w = e.w, C = this.teams ? { c: TEAMS[p.team].c, d: TEAMS[p.team].d } : PARTY_COLORS[p.col];
        const shown = e.revealIn == null && (ph === 'reveal' || ph === 'end'), res = shown ? e.res : null, off = !this.live(e);
        // glow on the floor for a right answer
        if (res === 'right' && ph === 'reveal') { g.fillStyle = 'rgba(253,224,71,.28)'; g.beginPath(); g.ellipse(x, PTOP + 4, w * 0.7, 26, 0, 0, TAU); g.fill(); }
        const face = ph === 'ask' ? Math.atan2(BCY - PY, 800 - x) : Math.PI / 2;
        drawCritter(g, x, PY, 42, p.col, p.animal, { face, hop: e.hop, happy: res === 'right' || (ph === 'end' && e === this.lead()), stun: res === 'wrong' && e.sad > 0, step: 0, moving: false, alpha: off ? 0.45 : 1, squash: e.lit * 0.08 });
        // podium
        const top = PTOP, h = 128;
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, top + h + 2, w * 0.56, 12, 0, 0, TAU); g.fill();
        const gr = g.createLinearGradient(0, top, 0, top + h); gr.addColorStop(0, '#3b2f7a'); gr.addColorStop(1, '#1d1548');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, top + 10); g.lineTo(x + w / 2, top + 10); g.lineTo(x + w / 2 - 10, top + h); g.lineTo(x - w / 2 + 10, top + h); g.closePath(); g.fill();
        // the lit lip: bright when you've answered (buzzer light), green/red after the reveal
        const lip = res === 'right' ? '#22c55e' : res === 'wrong' ? '#ef4444' : (e.pick != null && (ph === 'ask' || ph === 'lock')) ? '#fde047' : C.c;
        if (e.pick != null && (ph === 'ask' || ph === 'lock') || res === 'right') { g.fillStyle = res === 'right' ? 'rgba(34,197,94,.35)' : 'rgba(253,224,71,.35)'; g.beginPath(); g.roundRect(x - w / 2 - 8, top - 8, w + 16, 30, 14); g.fill(); }
        g.fillStyle = lip; g.beginPath(); g.roundRect(x - w / 2 - 4, top - 2, w + 8, 18, 9); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - w / 2 + 6, top + 1, w - 12, 4);
        drawTag(g, x, top + 36, p);
        g.globalAlpha = off ? 0.5 : 1;
        text(g, String(Math.round(e.disp)), x, top + 78, 42, '#fff', { f: NUMF });
        text(g, '分', x + g.measureText(String(Math.round(e.disp))).width / 2 + 16, top + 86, 18, '#c7d2fe', { w: 700 });
        const sub = top + 112;
        if (off) text(g, '斷線', x, sub, 18, '#cbd5e1', { w: 700 });
        else if (shown && e.fast && ph === 'reveal') { g.fillStyle = '#facc15'; g.beginPath(); g.roundRect(x - 52, sub - 14, 104, 28, 14); g.fill(); text(g, '⚡ 最快！', x, sub + 1, 18, '#713f12'); }
        else if (e.streak >= 2) text(g, `🔥 連對 ${e.streak}`, x, sub, 18, '#fdba74', { w: 700 });
        else if (e.right) text(g, `答對 ${e.right} 題`, x, sub, 18, '#c7d2fe', { w: 700 });
        g.globalAlpha = 1;
        // little bubble by the head: ✓ answered (no peeking!), then the chosen mark after the reveal
        const bx = x + 50, by = PY - 50;
        if ((ph === 'ask' || ph === 'lock') && e.pick != null) {
          g.fillStyle = '#fde047'; g.beginPath(); g.arc(bx, by, 20, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
          text(g, '✓', bx, by + 1, 24, '#854d0e', { f: NUMF });
        } else if (shown && e.pick != null) {
          const O = OPT[e.pick];
          g.fillStyle = O.c; g.beginPath(); g.arc(bx, by, 21, 0, TAU); g.fill(); g.strokeStyle = res === 'right' ? '#22c55e' : '#ef4444'; g.lineWidth = 4; g.stroke();
          mark(g, O.k, bx, by + 1, 10, '#fff');
        } else if (ph === 'ask' && !off) {
          g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.arc(bx, by, 16, 0, TAU); g.fill();
          text(g, '…', bx, by - 3, 22, 'rgba(255,255,255,.7)');
        }
      }
    }
    audienceDraw(g, t) {
      for (const a of this.aud) {
        const y = a.y - a.hop - Math.sin(t * 2 + a.ph) * 2, r = a.r, cheer = this.cheer > 0;
        g.fillStyle = '#0c0722';
        if (a.k === 0) { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(a.x + s * r * 0.85, y - r * 0.2); g.lineTo(a.x + s * r * 0.8, y - r * 1.15); g.lineTo(a.x + s * r * 0.15, y - r * 0.85); g.fill(); } }
        else if (a.k === 1) { for (const s of [-1, 1]) { g.beginPath(); g.arc(a.x + s * r * 0.68, y - r * 0.68, r * 0.34, 0, TAU); g.fill(); } }
        else if (a.k === 2) { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(a.x + s * r * 0.36, y - r * 1.1, r * 0.22, r * 0.55, s * 0.2, 0, TAU); g.fill(); } }
        g.beginPath(); g.arc(a.x, y, r, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(160,140,255,.22)'; g.lineWidth = 3; g.beginPath(); g.arc(a.x, y, r - 1, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
        if (a.has) {
          const ang = cheer ? Math.sin(t * 9 + a.ph) * 0.6 : Math.sin(t * 2 + a.ph) * 0.25, sx = a.x + r * 0.9, sy = y + (cheer ? -r * 0.4 : r * 0.4);
          g.strokeStyle = a.stick; g.lineWidth = 7; g.lineCap = 'round'; g.globalAlpha = 0.9;
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.sin(ang) * 34, sy - Math.cos(ang) * 34); g.stroke(); g.globalAlpha = 1;
        }
      }
    }
    lead() { let b = null; for (const e of this.es) if (!b || e.score > b.score) b = e; return b && this.es.filter(e => e.score === b.score).length === 1 ? b : null; }
    draw(g, t) {
      this.bg(g);
      this.beamsDraw(g);
      this.bulbsDraw(g);
      this.boardDraw(g, t);
      this.tilesDraw(g, t);
      this.timerDraw(g);
      this.hostDraw(g, t);
      this.podiumsDraw(g, t);
      this.audienceDraw(g, t);
    }

    /* ------------------------------ phones ------------------------------ */
    padLayout(p) {
      if (!this.started) return null;   // the intro screen: the normal pad with the 🔔 button
      const e = this.by.get(p), Q = this.cur, ph = this.phase;
      const blank = (prompt) => ({ type: 'choices', prompt, options: (Q ? Q.opts : OPT).map((_, i) => ({ id: 'w' + i, label: '', icon: OPT[i].sh, col: OPT[i].c })), locked: true });
      if (ph === 'end' || !Q) return blank('比賽結束！看大螢幕 🏆');
      if (ph === 'pre') return blank(`第 ${this.qi + 1} 題，準備…`);
      const rev = ph === 'reveal';
      const options = Q.opts.map((o, i) => ({
        id: 'o' + i, label: o.label || '', icon: o.icon || OPT[i].sh, col: OPT[i].c,
        state: rev ? (i === Q.ans ? 'right' : i === e.pick ? 'wrong' : 'off') : (i === e.pick ? 'chosen' : '')
      }));
      let prompt = Q.q;
      if (rev) prompt = e.res === 'right' ? `答對了！+${e.gain} 🎉` : e.res === 'wrong' ? (this.kid ? '差一點點！下一題加油 💪' : `答錯了 ${e.gain ? e.gain : ''}`.trim()) : '這題沒有作答 ⌛';
      else if (ph === 'lock') prompt = e.pick != null ? '答案揭曉…' : '時間到！';
      else if (e.pick != null) prompt = '已作答！看大螢幕 ✓';
      return { type: 'choices', prompt, options, locked: rev || ph === 'lock' || e.pick != null };
    }
    chip(p) { return Math.round(this.by.get(p).disp) + ' 分'; }
    pad(p) {
      const e = this.by.get(p), ph = this.phase;
      if (ph === 'end') return `${e.score} 分・答對 ${e.right} 題`;
      if (ph === 'ask') return e.pick != null ? `${e.score} 分・等大家作答…` : `快選！還有 ${Math.max(0, Math.ceil(this.limit - this.qt))} 秒`;
      if (ph === 'reveal') return `${e.score} 分・答對 ${e.right} 題`;
      return `第 ${Math.min(this.qi + 1, this.N)} / ${this.N} 題・${e.score} 分`;
    }
    ready() { return false; }
    teamScore(t) { return this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.score, 0); }
    results() {
      const rows = this.es.slice().sort((a, b) => b.score - a.score || b.right - a.right).map(e => ({ p: e.p, key: e.score, line: `答對 ${e.right} 題・${e.score} 分` }));
      if (this.teams) return { rows, teamScores: [this.teamScore(0), this.teamScore(1)] };
      if (rows.length === 1) { const e = this.es[0]; return { rows, title: `答對 ${e.right} / ${this.N} 題！` + (e.right === this.N ? '全對！🎉' : '') }; }
      return { rows };
    }
  }

  GAMES.push({
    id: 'quiz', name: '快問快答', icon: '🧠', col: SKY, bg: '#120c2c', kind: 'vs', teams: true, players: '1–6 人',
    blurb: '咕咕博士出題，用手機搶答，越快答對分數越高！',
    btn: { label: '搶答', icon: '🔔' },
    rules: kid => kid
      ? ['看大螢幕的圖：數一數、猜影子、誰在叫…', '手機會變成彩色按鈕，按跟答案一樣的那一個', '答對得 100 分，越快答對加越多分', '答錯不扣分！一共 8 題，分數最多的人贏']
      : ['大螢幕出題，手機上選答案（顏色和形狀跟電視一樣）', '每題 12 秒，只能選一次，選了就不能改', '答對 100 分＋速度加分（最多 100）', '答錯扣 30 分（不會扣到負的）；10 題後分數最高的贏'],
    thumb(g) {
      let gr = g.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, '#140c34'); gr.addColorStop(1, '#3b2a8c'); g.fillStyle = gr; g.fillRect(0, 0, 320, 180);
      g.fillStyle = 'rgba(255,248,220,.12)'; g.beginPath(); g.moveTo(40, 0); g.lineTo(60, 0); g.lineTo(140, 150); g.lineTo(60, 150); g.fill(); g.beginPath(); g.moveTo(270, 0); g.lineTo(290, 0); g.lineTo(260, 150); g.lineTo(180, 150); g.fill();
      g.fillStyle = '#1e3a8a'; g.beginPath(); g.roundRect(92, 14, 196, 86, 14); g.fill(); g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(100, 22, 180, 70, 10); g.fill();
      for (let k = 0; k < 12; k++) { g.fillStyle = k % 2 ? '#fef08a' : '#6b6290'; g.beginPath(); g.arc(96 + k * 17, 16, 2.4, 0, TAU); g.fill(); }
      text(g, '第 1 題', 190, 44, 22, DEEP, { f: NUMF }); text(g, '有幾顆蘋果？', 190, 72, 18, INK);
      OPT.forEach((O, i) => { g.fillStyle = O.c; g.beginPath(); g.roundRect(96 + i * 47, 106, 42, 26, 7); g.fill(); mark(g, O.k, 117 + i * 47, 119, 7, '#fff'); });
      g.fillStyle = '#4b3a9a'; g.fillRect(0, 150, 320, 30);
      drawOwl(g, 46, 104, 0.42, { happy: true, wing: 0.6 });
      drawCritter(g, 160, 152, 16, 0, 0, { happy: true, hop: 4, noShadow: true, still: true });
      drawCritter(g, 216, 152, 16, 1, 1, { noShadow: true, still: true });
      for (const x of [160, 216]) { g.fillStyle = '#2a1f5a'; g.fillRect(x - 22, 160, 44, 20); g.fillStyle = x === 160 ? '#22c55e' : '#fde047'; g.fillRect(x - 24, 158, 48, 5); }
      g.fillStyle = '#0b1435'; g.beginPath(); g.arc(286, 150, 20, 0, TAU); g.fill();
      g.strokeStyle = '#22c55e'; g.lineWidth = 5; g.beginPath(); g.arc(286, 150, 18, -Math.PI / 2, Math.PI * 0.9); g.stroke();
      text(g, '7', 286, 152, 20, '#fff', { f: NUMF });
    },
    create: ctx => new Quiz(ctx)
  });
})();
