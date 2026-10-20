// 123 小島：題材、台詞。瀏覽器和 Node 都能載入（tools/lines.js 用 allLines() 列出要預錄的句子）。
(function (root) {
  'use strict';

  // 數字的念法
  const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  function CN(n) {
    if (n <= 10) return D[n];
    if (n < 20) return '十' + D[n - 10];
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

  // 第一段：A 數與量
  const LESSONS = [
    { id: 1, t: '數到 5', e: '🍎', g: 'A' },
    { id: 2, t: '數到 10', e: '🐤', g: 'A' },
    { id: 3, t: '數量配對', e: '🍽️', g: 'A' },
    { id: 4, t: '認數字', e: '🔢', g: 'A' },
    { id: 5, t: '比多少', e: '⚖️', g: 'A' },
    { id: 6, t: '排順序', e: '🚂', g: 'A' },
    { id: 7, t: '數到 20', e: '📦', g: 'A' },
  ];
  const GROUPS = { A: '數與量' };

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
    },
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
    return Array.from(out);
  }

  // FNV-1a 32-bit，音檔檔名（和 ㄅㄆㄇ 小島一樣）
  function hash(text) {
    let h = 0x811c9dc5;
    const b = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text) : Buffer.from(text, 'utf8');
    for (const c of b) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }

  const M = { CN, Q, ITEMS, BOXABLE, LESSONS, GROUPS, P, allLines, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.M = M;
})(typeof window !== 'undefined' ? window : globalThis);
