// 123 小島：題材、台詞。瀏覽器和 Node 都能載入（tools/lines.js 用 allLines() 列出要預錄的句子）。
(function (root) {
  'use strict';

  // 數字的念法
  const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  function CN(n) {
    if (n <= 10) return D[n];
    if (n < 20) return '十' + D[n - 10];
    if (n >= 100) return '一百';
    return D[Math.floor(n / 10)] + '十' + (n % 10 ? D[n % 10] : '');
  }
  // 接量詞時 2 念「兩」
  const Q = n => (n === 2 ? '兩' : CN(n));

  // 可以數的東西（emoji、名稱、量詞）
  const ITEMS = [
    { e: '🍎', n: '蘋果', c: '顆' },
    { e: '🍓', n: '草莓', c: '顆' },
    { e: '⭐', n: '星星', c: '顆' },
    { e: '🎈', n: '氣球', c: '顆' },
    { e: '⚽', n: '球', c: '顆' },
    { e: '🍬', n: '糖果', c: '顆' },
    { e: '🐤', n: '小雞', c: '隻' },
    { e: '🐶', n: '小狗', c: '隻' },
    { e: '🐸', n: '青蛙', c: '隻' },
    { e: '🐟', n: '小魚', c: '條' },
    { e: '🍌', n: '香蕉', c: '根' },
    { e: '🚗', n: '小汽車', c: '台' },
    { e: '🌸', n: '花', c: '朵' },
  ];
  const BOXABLE = ITEMS.filter(x => x.c === '顆');   // 數到 20 用「一盒十顆」
  const FOOD = ITEMS.filter(x => ['🍎', '🍓', '🍬'].includes(x.e));   // 放盤子、分給小熊的
  const CLS = ['顆', '隻'];   // 加減乘除的題目只用這兩種量詞（少錄一點音檔）
  const STORY = ITEMS.filter(x => CLS.includes(x.c));
  const COME = { 隻: '又跑來了', 條: '又游來了', 台: '又開來了' };
  const AWAY = { 隻: '跑走了', 條: '游走了', 台: '開走了' };
  const OPW = { '+': '加', '-': '減', '×': '乘以', '÷': '除以' };

  // 第一段：A 數與量
  const LESSONS = [
    { id: 1, t: '數到 5', e: '🍎', g: 'A' },
    { id: 2, t: '數到 10', e: '🐤', g: 'A' },
    { id: 3, t: '數量配對', e: '🍽️', g: 'A' },
    { id: 4, t: '認數字', e: '🔢', g: 'A' },
    { id: 5, t: '比多少', e: '⚖️', g: 'A' },
    { id: 6, t: '排順序', e: '🚂', g: 'A' },
    { id: 7, t: '數到 20', e: '📦', g: 'A' },
    { id: 8, t: '5 的分合', e: '✋', g: 'B' },
    { id: 9, t: '6–9 的分合', e: '🤲', g: 'B' },
    { id: 10, t: '湊十', e: '🔟', g: 'B' },
    { id: 11, t: '5 以內加法', e: '🐤', g: 'C' },
    { id: 12, t: '10 以內加法', e: '➕', g: 'C' },
    { id: 13, t: '加法算式', e: '📝', g: 'C' },
    { id: 14, t: '加法小祕訣', e: '💡', g: 'C' },
    { id: 15, t: '數線跳跳', e: '🐸', g: 'C' },
    { id: 16, t: '5 以內減法', e: '🎈', g: 'D' },
    { id: 17, t: '10 以內減法', e: '➖', g: 'D' },
    { id: 18, t: '減法算式', e: '📝', g: 'D' },
    { id: 19, t: '減法小祕訣', e: '💡', g: 'D' },
    { id: 20, t: '加還是減', e: '🤔', g: 'E' },
    { id: 21, t: '小故事', e: '📖', g: 'E' },
    { id: 22, t: '20 以內加法', e: '🧮', g: 'E' },
    { id: 23, t: '幾個一盤', e: '🧺', g: 'F' },
    { id: 24, t: '跳著數', e: '🦘', g: 'F' },
    { id: 25, t: '乘法算式', e: '✖️', g: 'F' },
    { id: 26, t: '平分', e: '🐻', g: 'G' },
    { id: 27, t: '除法算式', e: '➗', g: 'G' },
  ];
  // 小遊戲
  const GAMES = [
    { id: 'feed', t: '餵動物', e: '🐶', lv: ['count', 'add', 'sub', 'mix'] },
    { id: 'balloon', t: '戳氣球', e: '🎈', lv: ['count', 'add', 'sub', 'mix'] },
    { id: 'fish', t: '魚缸', e: '🐠', lv: ['add', 'sub', 'mix'] },
    { id: 'ten', t: '湊數配對', e: '🃏', lv: ['five', 'ten'] },
  ];
  const LVNAME = { count: '數數', add: '加法', sub: '減法', mix: '加減', five: '湊五', ten: '湊十' };
  const ANIMALS = [{ e: '🐶', n: '小狗', f: '🍖' }, { e: '🐰', n: '小兔子', f: '🥕' }, { e: '🐵', n: '小猴子', f: '🍌' }];
  const FISH = ITEMS.find(x => x.e === '🐟');
  const GROUPS = { A: '數與量', B: '分與合', C: '加法', D: '減法', E: '加減一起', F: '乘法入門', G: '除法入門' };

  const P = {
    hello: '嗨！我是小黑，我們一起來玩數字！',
    pickOne: '想玩哪一個？點一下。',
    praise: ['答對了！', '好棒！', '沒錯！', '你好厲害！', '太棒了！'],
    together: '我們一起數一數。',
    tapToCount: '點一下，一個一個數。',
    tapGlow: '點一下發亮的答案。',
    roundDone: '好棒！送你一張貼紙！',
    rest: '玩很久了，休息一下，看看遠方吧！',
    book: '這是你的貼紙簿。',
    intro: {
      1: '數一數，有幾個？點一下東西，我陪你一起數。',
      2: '這次數到十。點一下，一個一個數。',
      3: '我說一個數字，你找出一樣多的那一盤。',
      4: '聽我說數字，找出那個數字。',
      5: '看看哪一盤比較多，哪一盤比較少。',
      6: '數字小火車，一節一節排好。',
      7: '一盒裝十顆，數完一盒再往下數。',
      8: '這邊有幾個，猜猜另一邊藏了幾個？',
      9: '數字變大了，猜猜另一邊藏了幾個？',
      10: '十格框要裝滿十個。還要幾個才會滿？',
      11: '東西變多了，就是加法。一起來算算看！',
      12: '看圖，也看算式。加號就是合起來。',
      13: '這次只有算式，可以用手指頭幫忙喔。',
      14: '加零、加一、一樣的數相加，都有小祕訣喔！',
      15: '小青蛙在數線上跳，加幾就往前跳幾格。',
      16: '東西變少了，就是減法。',
      17: '看圖，也看算式。減號就是拿走。',
      18: '這次只有減法算式，可以用手指頭幫忙喔。',
      19: '減零、減一、全部拿走，都有小祕訣喔！',
      20: '聽故事想一想：變多了用加，變少了用減。',
      21: '聽小故事，算算看。',
      22: '先把十格框裝滿，再數多出來的。',
      23: '每盤一樣多，一盤一盤跳著數。',
      24: '兩個兩個數、五個五個數、十個十個數。',
      25: '每盤幾個、有幾盤，就是乘法。',
      26: '把東西平分給小熊，每隻要一樣多。點一下東西，就會分給一隻小熊。',
      27: '除法就是平分。看算式，算算每隻小熊有幾個。',
    },
    // 小遊戲
    gIntro: {
      feed: '小動物肚子餓了！點食物餵牠，餵好了就按吃飽了。',
      balloon: '點一下對的氣球，把它戳破！',
      fish: '看看魚缸裡的小魚，算算有幾條。',
    },
    feed: (an, n) => `${an.n}想吃${Q(n)}個。`,
    feedEq: an => `${an.n}想吃幾個呢？`,
    ate: n => `吃了${Q(n)}個，吃飽了！`,
    tooFew: '還不夠，再餵一點。',
    tooMany: '太多了，多的還給你。',
    pairQ: { 5: '找兩張加起來是五的卡片。', 10: '找兩張加起來是十的卡片。' },
    pairNo: { 5: '不是五喔。', 10: '不是十喔。' },
    boardDone: '全部配好了！',
    // 分與合
    splitAll: (c, n) => `一共有${Q(n)}${c}。`,
    splitHere: (c, a) => `這邊有${Q(a)}${c}，`,
    splitQ: c => `另一邊藏了幾${c}？`,
    splitAns: (c, b) => `另一邊有${Q(b)}${c}。`,
    tenQ: '還要幾個，才會變成十？',
    // 加減小故事
    have: (it, n) => `有${Q(n)}${it.c}${it.n}，`,
    come: (c, n) => `${COME[c] || '又放了'}${Q(n)}${c}，`,
    away: (c, n) => `${AWAY[c] || '拿走了'}${Q(n)}${c}，`,
    nowQ: c => `現在有幾${c}？`,
    now: (c, n) => `現在有${Q(n)}${c}。`,
    allC: (c, n) => `一共有${Q(n)}${c}！`,
    // 算式
    eqQ: (a, op, b) => `${CN(a)}${OPW[op]}${CN(b)}等於多少？`,
    eqA: (a, op, b, r) => `${CN(a)}${OPW[op]}${CN(b)}等於${CN(r)}。`,
    tip: { add0: '加零，數字不會變。', add1: '加一，就是下一個數。', dbl: '一樣的數相加，叫做雙倍。', sub0: '減零，數字不會變。', sub1: '減一，就是前一個數。', suball: '全部拿走，就是零。' },
    frog: '小青蛙一格一格往前跳。',
    opQ: '要用加，還是用減？',
    opPlus: '變多了，用加！',
    opMinus: '變少了，用減！',
    makeTen: '先把十格框裝滿。',
    thenMore: '再往下數。',
    // 乘法、除法
    groups: (c, g, k) => `有${Q(g)}盤，每盤${Q(k)}${c}，`,
    allQ: c => `一共有幾${c}？`,
    skip: { 2: '兩個兩個數。', 5: '五個五個數。', 10: '十個十個數。' },
    share: (c, n, k) => `有${Q(n)}${c}，平分給${Q(k)}隻小熊，`,
    eachQ: c => `每隻小熊有幾${c}？`,
    eachA: (c, r) => `每隻小熊有${Q(r)}${c}。`,
    n: CN,
    howMany: it => `有幾${it.c}${it.n}？`,
    total: (it, n) => `一共有${Q(n)}${it.c}${it.n}！`,
    plate: (it, n) => `哪一盤有${Q(n)}${it.c}${it.n}？`,
    find: n => `${CN(n)}在哪裡？`,
    thisIs: n => `這是${CN(n)}。`,
    here: n => `${CN(n)}在這裡。`,
    more: '哪一盤比較多？',
    less: '哪一盤比較少？',
    same: '哪一盤和上面這盤一樣多？',
    moreThan: (a, b) => `${CN(a)}比${CN(b)}多。`,
    lessThan: (a, b) => `${CN(a)}比${CN(b)}少。`,
    sameAs: n => `一樣多，都是${CN(n)}。`,
    next: '下一個是幾？',
    missing: '少了哪一個？',
    order: '照順序點，從最小的開始。',
    orderDone: '小火車排好了，出發！',
    box: '一盒是十。',
    boxFirst: '先點盒子，一盒是十。',
  };

  function allLines() {
    const out = new Set();
    const add = t => out.add(t);
    ['hello', 'pickOne', 'together', 'tapToCount', 'tapGlow', 'roundDone', 'rest', 'book', 'more', 'less', 'same', 'next', 'missing', 'order', 'orderDone', 'box', 'boxFirst'].forEach(k => add(P[k]));
    P.praise.forEach(add);
    Object.values(P.intro).forEach(add);
    for (let n = 0; n <= 20; n++) add(CN(n));
    for (let n = 0; n <= 10; n++) { add(P.find(n)); add(P.thisIs(n)); add(P.here(n)); }
    for (const it of ITEMS) {
      add(P.howMany(it));
      for (let n = 1; n <= 10; n++) { add(P.total(it, n)); add(P.plate(it, n)); }
    }
    for (const it of BOXABLE) for (let n = 11; n <= 20; n++) add(P.total(it, n));
    for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
      if (a > b) add(P.moreThan(a, b));
      if (a < b) add(P.lessThan(a, b));
    }
    for (let n = 1; n <= 10; n++) add(P.sameAs(n));
    // 加減乘除
    for (let n = 0; n <= 100; n++) add(CN(n));
    Object.values(P.tip).forEach(add); Object.values(P.skip).forEach(add);
    ['tenQ', 'frog', 'opQ', 'opPlus', 'opMinus', 'makeTen', 'thenMore'].forEach(k => add(P[k]));
    for (const c of CLS) {
      add(P.splitQ(c)); add(P.nowQ(c)); add(P.allQ(c)); add(P.eachQ(c));
      for (let n = 0; n <= 10; n++) { add(P.splitAll(c, n)); add(P.splitHere(c, n)); add(P.splitAns(c, n)); add(P.come(c, n)); add(P.away(c, n)); add(P.now(c, n)); }
      for (let n = 1; n <= (c === '顆' ? 50 : 10); n++) add(P.allC(c, n));
    }
    for (const it of STORY) for (let n = 1; n <= 10; n++) add(P.have(it, n));
    for (let a = 0; a <= 10; a++) for (let b = 0; a + b <= 10; b++) { add(P.eqQ(a, '+', b)); add(P.eqA(a, '+', b, a + b)); }
    for (let a = 6; a <= 9; a++) for (let b = 2; b <= 9; b++) if (a + b > 10) { add(P.eqQ(a, '+', b)); add(P.eqA(a, '+', b, a + b)); }
    for (let a = 0; a <= 10; a++) for (let b = 0; b <= a; b++) { add(P.eqQ(a, '-', b)); add(P.eqA(a, '-', b, a - b)); }
    for (const k of [1, 2, 3, 4, 5, 10]) for (let g = 2; g <= 5; g++) {
      add(P.groups('顆', g, k));
      add(P.eqQ(k, '×', g)); add(P.eqA(k, '×', g, k * g));
    }
    for (let k = 2; k <= 4; k++) for (let r = 1; r <= 5; r++) {
      add(P.share('顆', k * r, k)); add(P.eachA('顆', r));
      add(P.eqQ(k * r, '÷', k)); add(P.eqA(k * r, '÷', k, r));
    }
    // 小遊戲
    Object.values(P.gIntro).forEach(add); Object.values(P.pairQ).forEach(add); Object.values(P.pairNo).forEach(add);
    ['tooFew', 'tooMany', 'boardDone'].forEach(k => add(P[k]));
    for (const an of ANIMALS) { add(P.feedEq(an)); for (let n = 1; n <= 10; n++) add(P.feed(an, n)); }
    for (let n = 1; n <= 10; n++) add(P.ate(n));
    add(P.nowQ('條'));
    for (let n = 0; n <= 10; n++) { add(P.have(FISH, n || 1)); add(P.come('條', n)); add(P.away('條', n)); add(P.now('條', n)); add(P.allC('條', n || 1)); }
    return Array.from(out);
  }

  // FNV-1a 32-bit，音檔檔名（和 ㄅㄆㄇ 小島一樣）
  function hash(text) {
    let h = 0x811c9dc5;
    const b = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text) : Buffer.from(text, 'utf8');
    for (const c of b) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }

  const M = { GAMES, LVNAME, ANIMALS, FISH, CN, Q, ITEMS, BOXABLE, FOOD, STORY, LESSONS, GROUPS, P, allLines, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.M = M;
})(typeof window !== 'undefined' ? window : globalThis);
