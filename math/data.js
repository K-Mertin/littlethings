// 123 小島：題材、台詞。瀏覽器和 Node 都能載入（tools/lines.js 用 allLines() 列出要預錄的句子）。
(function (root) {
  'use strict';

  // 數字的念法
  const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  function CN(n) {
    if (n <= 10) return D[n];
    if (n < 20) return '十' + D[n - 10];
    if (n < 100) return D[Math.floor(n / 10)] + '十' + (n % 10 ? D[n % 10] : '');
    if (n === 100 || n >= 1000) return '一百';
    // 三位數：一百零五、一百一十、兩百三十四
    const h = Math.floor(n / 100), r = n % 100, hs = (h === 2 ? '兩' : D[h]) + '百';
    if (!r) return hs;
    if (r < 10) return hs + '零' + D[r];
    if (r < 20) return hs + '一十' + (r % 10 ? D[r % 10] : '');
    return hs + CN(r);
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
    { id: 28, t: '看一眼', e: '🎲', g: 'A' },
    { id: 29, t: '多一和少一', e: '↔️', g: 'A' },
    { id: 30, t: '加幾才會變', e: '❓', g: 'C' },
    { id: 31, t: '連加', e: '➕', g: 'C' },
    { id: 32, t: '數線往回跳', e: '🐸', g: 'D' },
    { id: 33, t: '多幾個', e: '🦴', g: 'D' },
    { id: 34, t: '20 以內減法', e: '📦', g: 'E' },
    { id: 35, t: '20 以內加減', e: '🔀', g: 'E' },
    { id: 36, t: '排排站', e: '🍓', g: 'F' },
    { id: 37, t: '九九 2、5、10', e: '🔟', g: 'F' },
    { id: 38, t: '九九 3、4', e: '🎯', g: 'F' },
    { id: 39, t: '分完還剩下', e: '🍪', g: 'G' },
    { id: 40, t: '認識錢幣', e: '🪙', g: 'H' },
    { id: 41, t: '數錢', e: '💰', g: 'H' },
    { id: 42, t: '買東西', e: '🛒', g: 'H' },
    { id: 43, t: '幾個十幾個一', e: '🧱', g: 'I' },
    { id: 44, t: '整十加減', e: '🏗️', g: 'I' },
    { id: 45, t: '二位數加法', e: '🔼', g: 'I' },
    { id: 46, t: '二位數減法', e: '🔽', g: 'I' },
    // 第 5 段（2026-10-28）：更多數數、10 以內的玩法，和幾課更深的
    { id: 47, t: '拿拿看', e: '🧺', g: 'A' },
    { id: 48, t: '數字比大小', e: '🐊', g: 'A' },
    { id: 49, t: '第幾個', e: '🚩', g: 'A' },
    { id: 50, t: '倒著數', e: '🚀', g: 'A' },
    { id: 51, t: '聽聽有幾下', e: '🥁', g: 'A' },
    { id: 52, t: '認識形狀', e: '🔺', g: 'J' },
    { id: 53, t: '找規律', e: '🎨', g: 'J' },
    { id: 54, t: '認識時鐘', e: '🕒', g: 'J' },
    { id: 55, t: '變一樣多', e: '⚖️', g: 'B' },
    { id: 56, t: '分合圖', e: '🔗', g: 'B' },
    { id: 57, t: '接著數', e: '📦', g: 'C' },
    { id: 58, t: '骰子加法', e: '🎲', g: 'C' },
    { id: 59, t: '算對了嗎', e: '✅', g: 'E' },
    { id: 60, t: '哪個算式', e: '🖼️', g: 'E' },
    { id: 61, t: '減幾才會變', e: '❔', g: 'D' },
    { id: 62, t: '十和幾', e: '🔟', g: 'I' },
    { id: 63, t: '百數表', e: '💯', g: 'I' },
    { id: 64, t: '二位數比大小', e: '🐊', g: 'I' },
    { id: 65, t: '加一位數（進位）', e: '⬆️', g: 'K' },
    { id: 66, t: '減一位數（退位）', e: '⬇️', g: 'K' },
    { id: 67, t: '二位數加二位數', e: '➕', g: 'K' },
    { id: 68, t: '加二位數（進位）', e: '🔼', g: 'K' },
    { id: 69, t: '二位數減二位數', e: '➖', g: 'K' },
    { id: 70, t: '減二位數（退位）', e: '🔽', g: 'K' },
    { id: 71, t: '直式加法', e: '📐', g: 'K' },
    { id: 72, t: '直式減法', e: '📏', g: 'K' },
    { id: 73, t: '九九 6、7', e: '6️⃣', g: 'L' },
    { id: 74, t: '九九 8、9', e: '9️⃣', g: 'L' },
    { id: 75, t: '九九大挑戰', e: '🏆', g: 'L' },
    { id: 76, t: '乘以幾', e: '❓', g: 'L' },
    { id: 77, t: '除法是乘法反過來', e: '🔄', g: 'M' },
    { id: 78, t: '九九除法', e: '➗', g: 'M' },
    { id: 79, t: '有餘數的除法', e: '🍪', g: 'M' },
    { id: 80, t: '二位數乘一位數', e: '✖️', g: 'M' },
    { id: 81, t: '加減應用題', e: '📖', g: 'N' },
    { id: 82, t: '乘除應用題', e: '📚', g: 'N' },
    { id: 83, t: '找錢', e: '🪙', g: 'N' },
    // 第 7 段（2026-11-26）
    { id: 84, t: '整十除以幾', e: '🧱', g: 'M' },
    { id: 85, t: '二位數除以一位數', e: '🍱', g: 'M' },
    { id: 86, t: '除法（拆開十）', e: '🔨', g: 'M' },
    { id: 87, t: '先乘除後加減', e: '🥇', g: 'O' },
    { id: 88, t: '括號先算', e: '🫧', g: 'O' },
    { id: 89, t: '從左邊算起', e: '👈', g: 'O' },
    { id: 90, t: '幾個百', e: '🟦', g: 'P' },
    { id: 91, t: '三位數比大小', e: '🐊', g: 'P' },
    { id: 92, t: '整百整十加減', e: '🏢', g: 'P' },
    { id: 93, t: '直式乘法', e: '🧾', g: 'M' },
    { id: 94, t: '半點', e: '🕞', g: 'J' },
    { id: 95, t: '幾點幾分', e: '⏰', g: 'J' },
  ];
  // 第 4 段：題目清單（和台詞一起列出，才知道要錄哪些句子）
  const rng = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const LISTS = {
    more1: rng(1, 9), less1: rng(1, 10),
    miss: rng(1, 9).flatMap(a => rng(a + 1, 10).map(c => ({ a, b: c - a, c }))),
    add3: rng(1, 4).flatMap(a => rng(1, 4).flatMap(b => rng(1, 4).filter(c => a + b + c <= 10).map(c => ({ a, b, c })))),
    sub20: rng(11, 18).flatMap(a => rng(2, 9).filter(b => a - b < 10 && a - b > 0).map(b => ({ a, b, op: '-' }))),
    add20: rng(6, 9).flatMap(a => rng(2, 9).filter(b => a + b > 10 && a + b <= 18).map(b => ({ a, b, op: '+' }))),
    arr: rng(2, 5).flatMap(r => rng(2, 5).map(c => ({ r, c }))),
    t2510: [2, 5, 10].flatMap(k => rng(1, 9).map(g => ({ k, g }))),
    t34: [3, 4].flatMap(k => rng(1, 9).map(g => ({ k, g }))),
    rem: [2, 3].flatMap(k => rng(1, 4).flatMap(q => rng(1, k - 1).map(l => ({ k, q, l, n: k * q + l })))),
    tens: [...rng(1, 9).flatMap(a => rng(1, 9 - a).map(b => ({ a: a * 10, b: b * 10, op: '+' }))), ...rng(2, 10).flatMap(a => rng(1, a - 1).map(b => ({ a: a * 10, b: b * 10, op: '-' })))],
    two: [...rng(1, 8).flatMap(t => [1, 3, 5].flatMap(o => [2, 3, 4].map(b => ({ a: t * 10 + o, b, op: '+' })))),
      ...rng(1, 8).flatMap(t => [4, 6, 8].flatMap(o => [1, 2, 3].map(b => ({ a: t * 10 + o, b, op: '-' }))))],
  };
  // 第 6 段：進位退位、九九、除法、應用題
  {
    const L = LISTS, tn = (t, o) => t * 10 + o;
    L.carry1 = rng(1, 8).flatMap(t => [[6, 4], [6, 5], [6, 7], [8, 4], [8, 5], [8, 7], [9, 4], [9, 5], [9, 7]].map(([o, b]) => ({ a: tn(t, o), b, op: '+' })));
    L.borrow1 = rng(2, 9).flatMap(t => [1, 2, 4].flatMap(o => [5, 6, 8].map(b => ({ a: tn(t, o), b, op: '-' }))));
    const two = (tens, ones, op) => tens.flatMap(([t1, t2]) => ones.map(([o1, o2]) => ({ a: tn(t1, o1), b: tn(t2, o2), op })));
    L.add2 = two([[1, 2], [2, 3], [3, 4], [1, 5], [4, 4], [2, 6], [5, 3], [6, 2]], [[1, 3], [2, 4], [3, 5], [4, 2], [5, 1]], '+');
    L.add2c = two([[1, 2], [2, 3], [3, 4], [1, 5], [2, 4], [4, 3], [5, 1], [3, 3]], [[5, 7], [6, 8], [8, 5], [9, 3], [7, 6]], '+');
    L.sub2 = two([[3, 1], [4, 2], [5, 2], [6, 3], [7, 4], [8, 5], [9, 6], [5, 1]], [[5, 3], [7, 2], [8, 6], [9, 4], [6, 1]], '-');
    L.sub2b = two([[4, 1], [5, 2], [6, 3], [7, 2], [8, 4], [9, 5], [6, 1], [7, 4]], [[2, 5], [3, 7], [1, 6], [4, 8], [0, 4]], '-');
    L.t67 = [6, 7].flatMap(k => rng(1, 9).map(g => ({ k, g })));
    L.t89 = [8, 9].flatMap(k => rng(1, 9).map(g => ({ k, g })));
    L.tall = rng(2, 9).flatMap(k => rng(2, 9).map(g => ({ k, g })));
    L.divT = L.tall.map(({ k, g }) => ({ n: k * g, k, q: g }));
    L.remD = rng(2, 9).flatMap(k => [3, 6, 8].map(q => ({ n: k * q + 1 + ((k + q) % (k - 1)), k, q, l: 1 + ((k + q) % (k - 1)) })));
    L.mul21 = [...[12, 13, 14, 21, 22, 23, 24, 31, 32, 33, 41, 42, 43].flatMap(a => [2, 3].filter(b => a * b < 100).map(b => ({ a, b }))), ...[12, 13, 21, 22, 23].map(a => ({ a, b: 4 }))];
    L.wp = [
      { t: 'stick', a: 25, b: 13, op: '+' }, { t: 'bird', a: 38, b: 7, op: '+' }, { t: 'stick', a: 46, b: 25, op: '+' }, { t: 'bird', a: 17, b: 8, op: '+' }, { t: 'stick', a: 54, b: 32, op: '+' }, { t: 'bird', a: 29, b: 14, op: '+' },
      { t: 'apple', a: 43, b: 12, op: '-' }, { t: 'bus', a: 35, b: 8, op: '-' }, { t: 'apple', a: 62, b: 27, op: '-' }, { t: 'bus', a: 50, b: 15, op: '-' }, { t: 'apple', a: 48, b: 6, op: '-' }, { t: 'bus', a: 71, b: 24, op: '-' },
    ];
    L.wpmd = [
      { t: 'box', k: 6, g: 4 }, { t: 'box', k: 8, g: 3 }, { t: 'box', k: 7, g: 5 }, { t: 'legs', k: 4, g: 6 }, { t: 'legs', k: 4, g: 8 }, { t: 'legs', k: 4, g: 7 },
      { t: 'share', n: 24, k: 4 }, { t: 'share', n: 36, k: 6 }, { t: 'share', n: 27, k: 3 }, { t: 'car', n: 20, k: 4 }, { t: 'car', n: 30, k: 5 }, { t: 'car', n: 42, k: 6 },
    ];
    L.change = [
      { e: '🍞', n: '麵包', p: 35, pay: 50 }, { e: '✏️', n: '鉛筆', p: 12, pay: 50 }, { e: '🍦', n: '冰淇淋', p: 25, pay: 50 }, { e: '🧃', n: '果汁', p: 18, pay: 50 },
      { e: '🍪', n: '餅乾', p: 43, pay: 50 }, { e: '🎈', n: '氣球', p: 9, pay: 50 }, { e: '🧸', n: '玩具熊', p: 68, pay: 100 }, { e: '📕', n: '故事書', p: 85, pay: 100 },
      { e: '🚗', n: '玩具車', p: 74, pay: 100 }, { e: '⚽', n: '足球', p: 56, pay: 100 }, { e: '🖍️', n: '蠟筆', p: 39, pay: 100 }, { e: '🪁', n: '風箏', p: 92, pay: 100 },
    ];
  }
  // 第 7 段：二位數除以一位數、混合運算、三位數、直式乘法、時鐘
  {
    const L = LISTS, nk = a => a.map(([n, k]) => ({ n, k }));
    L.div10 = nk([[20, 2], [40, 2], [60, 2], [80, 2], [30, 3], [60, 3], [90, 3], [40, 4], [80, 4], [50, 5], [60, 6], [70, 7], [80, 8], [90, 9]]);
    L.div21 = nk([[24, 2], [26, 2], [28, 2], [42, 2], [44, 2], [46, 2], [48, 2], [62, 2], [64, 2], [66, 2], [68, 2], [84, 2], [86, 2], [88, 2],
      [33, 3], [36, 3], [39, 3], [63, 3], [66, 3], [69, 3], [93, 3], [96, 3], [99, 3], [44, 4], [48, 4], [84, 4], [88, 4], [55, 5]]);
    L.div21r = nk([[32, 2], [34, 2], [36, 2], [38, 2], [52, 2], [56, 2], [58, 2], [72, 2], [74, 2], [76, 2], [92, 2], [94, 2], [42, 3], [45, 3], [48, 3], [51, 3],
      [54, 3], [57, 3], [72, 3], [75, 3], [78, 3], [52, 4], [56, 4], [60, 4], [64, 4], [72, 4], [76, 4], [65, 5], [70, 5], [75, 5], [72, 6], [84, 6]]);
    // 混合運算：t 是 [a, 運算, b, 運算, c]，p 是括號在左邊（L）或右邊（R）
    const X = (p, ...t) => ({ t, p });
    L.mix1 = [X(0, 3, '+', 2, '×', 4), X(0, 5, '+', 3, '×', 3), X(0, 10, '+', 4, '×', 5), X(0, 7, '+', 2, '×', 5), X(0, 20, '-', 3, '×', 4), X(0, 30, '-', 5, '×', 5),
      X(0, 18, '-', 2, '×', 6), X(0, 6, '+', 12, '÷', 3), X(0, 9, '+', 20, '÷', 4), X(0, 15, '-', 8, '÷', 2), X(0, 2, '×', 4, '+', 5), X(0, 3, '×', 5, '+', 6),
      X(0, 4, '×', 4, '-', 7), X(0, 5, '×', 6, '-', 9), X(0, 24, '÷', 4, '+', 8), X(0, 18, '÷', 3, '+', 9), X(0, 30, '÷', 5, '-', 2), X(0, 6, '×', 3, '+', 10)];
    L.mix2 = [X('L', 2, '+', 3, '×', 4), X('L', 4, '+', 1, '×', 5), X('L', 6, '+', 2, '×', 3), X('L', 3, '+', 3, '×', 6), X('L', 9, '-', 4, '×', 4), X('L', 10, '-', 3, '×', 3),
      X('L', 8, '-', 5, '×', 7), X('L', 12, '+', 8, '÷', 4), X('L', 15, '+', 3, '÷', 6), X('L', 20, '-', 4, '÷', 2), X('R', 5, '×', 2, '+', 4), X('R', 3, '×', 10, '-', 6),
      X('R', 4, '×', 1, '+', 6), X('R', 24, '÷', 2, '+', 4), X('R', 36, '÷', 10, '-', 6), X('R', 20, '-', 3, '+', 5), X('R', 15, '-', 9, '-', 4), X('R', 30, '-', 6, '×', 4)];
    L.mix3 = [X(0, 15, '+', 8, '-', 6), X(0, 20, '-', 7, '+', 5), X(0, 12, '+', 9, '-', 10), X(0, 30, '-', 12, '+', 8), X(0, 25, '+', 15, '-', 20), X(0, 9, '+', 6, '+', 8),
      X(0, 40, '-', 15, '-', 5), X(0, 17, '+', 5, '-', 9), X(0, 50, '-', 20, '+', 6), X(0, 33, '+', 7, '-', 12), X(0, 4, '×', 5, '÷', 2), X(0, 36, '÷', 4, '×', 3)];
    // 三位數
    L.vmul = [...[[12, 3], [13, 2], [21, 4], [32, 3], [23, 3], [41, 2], [11, 7], [22, 4]].map(([a, b]) => ({ a, b })),
      ...[[15, 3], [16, 4], [17, 5], [18, 3], [19, 4], [25, 3], [26, 2], [27, 3], [28, 3], [29, 2], [36, 2], [38, 2], [45, 2], [24, 4], [13, 7], [14, 6], [12, 8], [15, 6]].map(([a, b]) => ({ a, b }))];
    L.h3 = [100, 105, 120, 134, 203, 215, 246, 300, 307, 350, 362, 411, 428, 503, 537, 615, 640, 702, 758, 809, 861, 930, 172, 284];
    L.cmp3 = [[352, 325], [418, 481], [506, 560], [273, 237], [641, 614], [789, 798], [905, 950], [134, 143], [620, 602], [455, 545], [318, 381], [727, 772],
      [290, 209], [863, 836], [574, 547], [199, 201], [300, 299], [480, 408], [512, 498], [266, 626]].map(([a, b]) => ({ a, b }));
    L.hadd = [[300, 200, '+'], [400, 500, '+'], [100, 600, '+'], [700, 200, '-'], [900, 400, '-'], [500, 300, '-'], [230, 40, '+'], [450, 200, '+'], [312, 500, '+'],
      [641, 30, '+'], [680, 50, '-'], [760, 300, '-'], [895, 70, '-'], [523, 400, '-'], [150, 30, '+'], [405, 200, '+'], [270, 20, '+'], [836, 600, '-']].map(([a, b, op]) => ({ a, b, op }));
  }
  const COINS = [1, 5, 10, 50];
  const SHOP = [{ e: '🍎', n: '蘋果' }, { e: '🍭', n: '棒棒糖' }, { e: '🧃', n: '果汁' }];
  // 小遊戲
  const GAMES = [
    { id: 'feed', t: '餵動物', e: '🐶', lv: ['count', 'add', 'sub', 'mix'] },
    { id: 'balloon', t: '戳氣球', e: '🎈', lv: ['count', 'add', 'sub', 'mix', 'two', 'times'] },
    { id: 'fish', t: '魚缸', e: '🐠', lv: ['add', 'sub', 'mix'] },
    { id: 'ten', t: '湊數配對', e: '🃏', lv: ['five', 'ten'] },
    { id: 'mole', t: '打地鼠', e: '🐹', lv: ['count', 'add', 'sub', 'mix', 'two', 'times'] },
    { id: 'frog', t: '青蛙過河', e: '🐸', lv: ['order', 'add', 'sub', 'mix'] },
    { id: 'quick', t: '快快算', e: '⏱️', lv: ['add5', 'add', 'sub', 'mix', 'add20', 'two', 'times', 'div'] },
    { id: 'flip', t: '九九翻翻樂', e: '🎴', lv: ['t25', 't69'] },
    { id: 'balance', t: '天平', e: '⚖️', lv: ['bal10', 'bal20', 'balx'] },
  ];
  const LVNAME = { bal10: '10 以內', bal20: '20 以內', balx: '乘法', two: '二位數加減', times: '九九乘法', div: '九九除法', t25: '九九 2–5', t69: '九九 6–9', count: '數數', add: '加法', sub: '減法', mix: '加減', five: '湊五', ten: '湊十', order: '排順序', add5: '5 以內加法', add20: '20 以內加法' };
  // 第 5 段
  const SHAPES = ['圓形', '三角形', '正方形', '長方形'];
  const SHAPE_TIP = { 圓形: '圓形圓圓的，沒有角。', 三角形: '三角形有三條邊、三個角。', 正方形: '正方形有四條一樣長的邊。', 長方形: '長方形有四個角，兩條長邊、兩條短邊。' };
  const ANIMALS = [{ e: '🐶', n: '小狗', f: '🍖' }, { e: '🐰', n: '小兔子', f: '🥕' }, { e: '🐵', n: '小猴子', f: '🍌' }];
  const FISH = ITEMS.find(x => x.e === '🐟');
  const GROUPS = { A: '數與量', J: '形狀、規律、時鐘', B: '分與合', C: '加法', D: '減法', E: '加減一起', F: '乘法入門', G: '除法入門', H: '錢幣', I: '二位數', K: '進位和退位', L: '九九乘法', M: '除法', N: '應用題', O: '混合運算', P: '三位數' };

  const P = {
    hello: '嗨！我是小白兔小白，我們一起來玩數字！',
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
      28: '東西只出現一下下，看一眼就說出有幾個！',
      29: '多一就是往後一個，少一就是往前一個。',
      30: '已經有幾個，還要加幾個才會變成那個數？',
      31: '三個數加在一起，先加兩個，再加第三個。',
      32: '這次小青蛙往回跳，減幾就往回跳幾格。',
      33: '上下一個對一個排好，看看多出來幾個。',
      34: '先拿走外面的，不夠再從盒子裡拿。',
      35: '加法和減法混在一起，看清楚是加還是減。',
      36: '東西排得整整齊齊，一排一排數最快。',
      37: '二、五、十的乘法，跳著數就會了。',
      38: '三和四的乘法，一排一排跳著數。',
      39: '平分給小熊，分不完的就是剩下的。',
      40: '台灣的錢幣有一元、五元、十元、五十元。',
      41: '先數大的錢幣，再數小的。',
      42: '點錢幣付錢，付好了按付好了。',
      43: '一條是十，一顆是一。先數十，再數一。',
      44: '整十的加減，十個十個數。',
      45: '二位數加一位數，從大的數接著往下數。',
      46: '二位數減一位數，從大的數往回數。',
      47: '小白說要幾個，你就拿幾個。點一下放進籃子，一邊放一邊數，放好了按好了。',
      48: '數字越後面就越大。不知道的時候，數一數下面的小圓點。',
      49: '排隊的時候，從旗子這邊開始數：第一、第二、第三。',
      50: '火箭要發射了！倒著數，就是一個一個變少：十、九、八。',
      51: '耳朵聽，心裡數。小白每敲一下，你就數一下。',
      52: '我們來認識形狀：圓形、三角形、正方形、長方形。',
      53: '東西照一個樣子一直重複，就叫做規律。找出重複的那一段，就知道下一個。',
      54: '時鐘有長針和短針。長針指著十二的時候，短針指著幾，就是幾點。',
      55: '上面和下面一個對一個排。下面少了，就點加號放一個，一樣多了按好了。',
      56: '分合圖：上面是全部，下面分成兩份。兩份合起來，就是上面的數。',
      57: '盒子裡的不用再數，記住盒子上的數字，再接著往下數。',
      58: '骰子上的點，一眼就認得出來。兩個骰子加起來，從大的接著數。',
      59: '小白算了一題，你來當老師，看看對不對。',
      60: '看圖說故事：合起來用加，拿走用減。找出和圖一樣的算式。',
      61: '原本有幾個，拿走幾個以後剩下幾個？拿走的就是答案。',
      62: '十幾就是一個十，再加幾個一。十三就是十和三。',
      63: '百數表一排有十個數。往右一格多一，往下一格多十。',
      64: '兩個二位數比大小：先比十位，十位一樣，再比個位。',
      65: '個位加起來超過十，十個一就換成一條十。',
      66: '個位不夠減，就把一條十拆成十個一。',
      67: '二位數加二位數：個位加個位，十位加十位。',
      68: '個位加起來滿十，要進位到十位。',
      69: '二位數減二位數：個位減個位，十位減十位。',
      70: '個位不夠減，跟十位借一個十。',
      71: '直式加法：先算個位，再算十位。用下面的數字鍵寫答案。',
      72: '直式減法：先算個位，不夠減就跟十位借。',
      73: '六和七的乘法，一排一排跳著數。',
      74: '八和九的乘法，一排一排跳著數。',
      75: '二到九的乘法都來了，看你記住了幾個！',
      76: '乘以幾才會變成這個數？一排一排數上去。',
      77: '除法是乘法反過來：想想看，乘以幾會變成這個數。',
      78: '九九乘法表裡的除法，想想乘法就知道了。',
      79: '分不完的就是餘數，餘數一定比除數小。',
      80: '二位數乘一位數：有幾組一樣的，先數十，再數一。',
      81: '聽故事，想一想要用加法還是減法。',
      82: '聽故事，想一想要用乘法還是除法。',
      83: '付的錢比較多，要找回多少？從價錢往上數到付的錢。',
      84: '整十的除法：把一條一條的十，平分成幾份。',
      85: '二位數除以一位數：先把十平分，再把一平分。',
      86: '十分不完的時候，把剩下的十拆成十個一，再一起分。',
      87: '加減和乘除在一起的時候，要先算乘除，再算加減。',
      88: '有括號的時候，括號裡面要先算。',
      89: '只有加減，或只有乘除的時候，從左邊開始，一步一步算。',
      90: '十條十是一百。一大片是一百，一條是十，一顆是一。先數百，再數十，最後數一。',
      91: '三位數比大小：先比百位，百位一樣，再比十位，再比個位。',
      92: '整百整十的加減：百位和百位算，十位和十位算。',
      93: '直式乘法：先用個位乘，再用十位乘，別忘了加上進位。',
      94: '長針指著六，就是半點。這時候短針走到兩個數字的中間。',
      95: '長針走一大格是五分。長針指著幾，就五分、五分地數。',
    },
    // 第 7 段
    divTensL: '先把十平分。',
    divOnesL: '再把一平分。',
    eachPart: n => `每一份是${CN(n)}。`,
    mulFirst: '先算乘除，再算加減。',
    parenFirst: '括號裡面要先算。',
    leftFirst: '從左邊開始算。',
    thenRest: '再算下一步。',
    tenTens: '十條十，是一百。',
    onesWriteC: (d, c) => `個位寫${CN(d)}，進${CN(c)}。`,
    reviewIntro: '這些是之前答錯過的題目，我們再試一次！',
    halfA: h => `現在是${Q(h)}點半。`,
    halfHint: '長針指著六，就是半點。短針剛走過幾，就是幾點半。',
    shortPast: '短針剛走過幾，就是幾點。',
    timeA: (h, m) => `現在是${Q(h)}點${CN(m)}分。`,
    fiveHint: '長針一大格是五分，我們五分、五分地數。',
    carryN: c => `要進${CN(c)}到十位。`,
    plusCarry: (c, n) => `再加上進位的${CN(c)}，是${CN(n)}。`,
    cmpHund: '先比百位，百位大的就比較大。',
    cmpTens3: '百位一樣，再比十位。',
    cmpOnes3: '十位也一樣，再比個位。',
    bigger: (a, b) => `${CN(a)}比${CN(b)}大。`,
    colSay: (u, a, op, b, r) => `${u}：${CN(a)}${OPW[op]}${CN(b)}是${CN(r)}。`,
    // 第 6 段
    trade: '十個一，換成一條十。',
    breakTen: '一條十，拆成十個一。',
    addOnesL: '先加個位。', addTensL: '再加十位。',
    takeOnesL: '先拿走個位。', takeTensL: '再拿走十位。',
    colOnes: '先算個位。', colTens: '再算十位。',
    carryNote: '滿十了，要進一到十位。',
    borrowNote: '個位不夠減，跟十位借一。',
    plusOne: n => `再加上進位的一，是${CN(n)}。`,
    minusBorrow: '十位被借走了一。',
    onesWrite: (d, c) => `個位寫${CN(d)}${c ? '，進一' : ''}。`,
    tensWrite: d => `十位寫${CN(d)}。`,
    tryAgain: '再想想看。',
    mulMissQ: (k, n) => `${CN(k)}乘以幾等於${CN(n)}？`,
    remQ: (n, k) => `${CN(n)}除以${CN(k)}，商是多少？`,
    remLeftQ: '餘數是多少？',
    remA: (n, k, q, l) => `${CN(n)}除以${CN(k)}，商${CN(q)}，餘${CN(l)}。`,
    wpQ: q => ({
      stick: `小明有${CN(q.a)}張貼紙，又拿到${CN(q.b)}張，現在有幾張？`,
      bird: `樹上有${CN(q.a)}隻小鳥，又飛來${CN(q.b)}隻，一共有幾隻？`,
      apple: `媽媽買了${CN(q.a)}顆蘋果，送給鄰居${CN(q.b)}顆，還剩幾顆？`,
      bus: `公車上有${CN(q.a)}個人，下車${CN(q.b)}個人，車上還有幾個人？`,
      box: `每盒有${CN(q.k)}顆糖，有${CN(q.g)}盒，一共有幾顆？`,
      legs: `一隻小狗有四隻腳，${CN(q.g)}隻小狗一共有幾隻腳？`,
      share: `${CN(q.n)}顆草莓，平分給${CN(q.k)}個小朋友，每人幾顆？`,
      car: `${CN(q.n)}個小朋友，每${CN(q.k)}個人坐一台車，要幾台車？`,
    })[q.t],
    changeQ: q => `${q.n}要${CN(q.p)}元，付了${CN(q.pay)}元，要找回幾元？`,
    changeA: c => `要找回${CN(c)}元。`,
    countUp: '從價錢往上數到付的錢。',
    // 第 4 段
    subQ: '看一眼，是幾個？',
    more1Q: n => `比${CN(n)}多一是幾？`,
    less1Q: n => `比${CN(n)}少一是幾？`,
    more1A: n => `比${CN(n)}多一是${CN(n + 1)}。`,
    less1A: n => `比${CN(n)}少一是${CN(n - 1)}。`,
    missQ: (a, c) => `${CN(a)}加幾等於${CN(c)}？`,
    add3Q: (a, b, c) => `${CN(a)}加${CN(b)}加${CN(c)}等於多少？`,
    add3A: (a, b, c) => `${CN(a)}加${CN(b)}加${CN(c)}等於${CN(a + b + c)}。`,
    frogBack: '小青蛙一格一格往回跳。',
    diffQ: '上面比下面多幾個？',
    diffA: d => `多${Q(d)}個。`,
    left: n => `剩下${Q(n)}個。`,
    rowsQ: (r, c) => `一排${Q(c)}顆，有${Q(r)}排，`,
    leftQ: '還剩幾顆？',
    leftA: n => `還剩${Q(n)}顆。`,
    coinIs: v => `這是${Q(v)}元。`,
    coinQ: v => `${Q(v)}元在哪裡？`,
    moneyQ: '一共有幾元？',
    moneyA: n => `一共有${Q(n)}元。`,
    buyQ: (it, p) => `${it.n}要${Q(p)}元，請你付錢。`,
    payOk: '剛剛好！',
    payFew: '錢不夠喔，再付一點。',
    payMany: '付太多了，多的還給你。',
    tensQ: '數一數，是多少？',
    // 第 5 段
    watchMe: '先看小白做一次。',
    yourTurn: '換你了！',
    takeQ: (it, n) => `請拿${Q(n)}${it.c}${it.n}放進籃子。`,
    takeFew: '還不夠，再拿一點。',
    takeMany: '太多了，多的拿回來。',
    bigQ: '哪個數字比較大？',
    smallQ: '哪個數字比較小？',
    ordQ: n => `從旗子這邊數，第${CN(n)}個是誰？`,
    ord: n => `第${CN(n)}`,
    backNext: '倒著數，下一個是幾？',
    backMiss: '倒著數，少了哪一個？',
    liftoff: '發射！',
    drumQ: '仔細聽，小白敲了幾下鼓？',
    drumA: n => `敲了${Q(n)}下。`,
    shapeQ: s => `${s}在哪裡？`,
    shapeIs: s => `這是${s}。`,
    shapeCntQ: s => `數一數，有幾個${s}？`,
    shapeCntA: (s, n) => `有${Q(n)}個${s}。`,
    shapeTip: SHAPE_TIP,
    patQ: '看看是怎麼排的，下一個是什麼？',
    patMissQ: '看看是怎麼排的，少了哪一個？',
    patRepeat: '一直重複喔！',
    clockQ: '現在是幾點？',
    clockA: h => `現在是${Q(h)}點。`,
    clockHint: '長針指著十二，短針指著幾，就是幾點。',
    setQ: h => `請把短針撥到${Q(h)}點。`,
    sameQ: '下面要再放幾個，才會和上面一樣多？',
    equalOk: '一樣多了！',
    notYet: '還不一樣多，再放一點。',
    bondQ: (n, a) => `${CN(n)}可以分成${CN(a)}和幾？`,
    bondA: (n, a, b) => `${CN(n)}可以分成${CN(a)}和${CN(b)}。`,
    onQ: a => `盒子裡有${Q(a)}顆，接著往下數，一共有幾顆？`,
    tfQ: '這個算式對不對？',
    tfYes: '算對了！',
    tfNo: '不對喔。',
    whichEq: '哪一個算式和圖一樣？',
    missSubQ: (a, c) => `${CN(a)}減幾等於${CN(c)}？`,
    teenQ: n => `${CN(n)}是十和幾？`,
    teenA: n => `${CN(n)}是十和${CN(n - 10)}。`,
    cmpTens: '先比十位，十位大的就比較大。',
    cmpOnes: '十位一樣，再比個位。',
    frogHome: '小青蛙過河了！',
    quickGo: '準備好了嗎？開始！',
    timeUp: '時間到！',
    quickScore: n => `你答對了${Q(n)}題！`,
    newBest: '新紀錄！',
    // 小遊戲
    gIntro: {
      mole: '地鼠跑出來了！點一下對的那一隻。',
      frog: '幫小青蛙過河！跳到對的荷葉上。',
      quick: '快快算！看算式，點答案。',
      feed: '小動物肚子餓了！點食物餵牠，餵好了就按吃飽了。',
      balloon: '點一下對的氣球，把它戳破！',
      fish: '看看魚缸裡的小魚，算算有幾條。',
      flip: '翻兩張牌，把算式和答案配成一對。',
      balance: '天平兩邊要一樣重！選一個數字放上去。',
    },
    flipNo: '不是一對，再翻翻看。',
    freeIntro: '自由練習！上面可以選加減乘除，還有數字多大。',
    balQ: '放幾，兩邊才會一樣重？',
    leftHeavy: '左邊比較重，要放大一點的數。',
    rightHeavy: '右邊比較重，要放小一點的數。',
    balanced: '一樣重了！',
    balA: (l, r) => `兩邊都是${CN(l)}。`,
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
    // 第 4 段
    add(P.subQ); add(P.frogBack); add(P.diffQ); add(P.leftQ); add(P.moneyQ); add(P.payOk); add(P.payFew); add(P.payMany); add(P.tensQ);
    LISTS.more1.forEach(n => { add(P.more1Q(n)); add(P.more1A(n)); });
    LISTS.less1.forEach(n => { add(P.less1Q(n)); add(P.less1A(n)); });
    LISTS.miss.forEach(q => { add(P.missQ(q.a, q.c)); add(P.eqA(q.a, '+', q.b, q.c)); });
    LISTS.add3.forEach(q => { add(P.add3Q(q.a, q.b, q.c)); add(P.add3A(q.a, q.b, q.c)); });
    for (let d = 1; d <= 9; d++) { add(P.diffA(d)); add(P.left(d)); }
    for (const q of [...LISTS.sub20, ...LISTS.add20, ...LISTS.tens, ...LISTS.two]) { const r = q.op === '+' ? q.a + q.b : q.a - q.b; add(P.eqQ(q.a, q.op, q.b)); add(P.eqA(q.a, q.op, q.b, r)); }
    LISTS.arr.forEach(q => add(P.rowsQ(q.r, q.c)));
    for (const q of [...LISTS.t2510, ...LISTS.t34]) { add(P.eqQ(q.k, '×', q.g)); add(P.eqA(q.k, '×', q.g, q.k * q.g)); }
    LISTS.rem.forEach(q => { add(P.share('顆', q.n, q.k)); add(P.eachA('顆', q.q)); add(P.leftA(q.l)); });
    COINS.forEach(v => { add(P.coinIs(v)); add(P.coinQ(v)); });
    for (let n = 1; n <= 100; n++) add(P.moneyA(n));
    for (const it of SHOP) for (let p = 1; p <= 20; p++) add(P.buyQ(it, p));
    // 小遊戲
    Object.values(P.gIntro).forEach(add); Object.values(P.pairQ).forEach(add); Object.values(P.pairNo).forEach(add);
    ['tooFew', 'tooMany', 'boardDone'].forEach(k => add(P[k]));
    for (const an of ANIMALS) { add(P.feedEq(an)); for (let n = 1; n <= 10; n++) add(P.feed(an, n)); }
    for (let n = 1; n <= 10; n++) add(P.ate(n));
    add(P.nowQ('條'));
    for (let n = 0; n <= 10; n++) { add(P.have(FISH, n || 1)); add(P.come('條', n)); add(P.away('條', n)); add(P.now('條', n)); add(P.allC('條', n || 1)); }
    // 第 5 段
    ['watchMe', 'yourTurn', 'takeFew', 'takeMany', 'bigQ', 'smallQ', 'backNext', 'backMiss', 'liftoff', 'drumQ', 'patQ', 'patMissQ', 'patRepeat', 'clockQ', 'clockHint',
      'sameQ', 'equalOk', 'notYet', 'tfQ', 'tfYes', 'tfNo', 'whichEq', 'cmpTens', 'cmpOnes', 'frogHome', 'quickGo', 'timeUp', 'newBest'].forEach(k => add(P[k]));
    for (const it of FOOD) for (let n = 1; n <= 10; n++) add(P.takeQ(it, n));
    for (let n = 1; n <= 7; n++) { add(P.ordQ(n)); add(P.ord(n)); }
    for (let n = 1; n <= 8; n++) add(P.drumA(n));
    for (const s of SHAPES) { add(s); add(P.shapeQ(s)); add(P.shapeIs(s)); add(P.shapeCntQ(s)); add(SHAPE_TIP[s]); for (let n = 1; n <= 6; n++) add(P.shapeCntA(s, n)); }
    for (let h = 1; h <= 12; h++) { add(P.clockA(h)); add(P.setQ(h)); }
    for (let n = 2; n <= 10; n++) for (let a = 1; a < n; a++) { add(P.bondQ(n, a)); add(P.bondA(n, a, n - a)); }
    for (let a = 3; a <= 9; a++) add(P.onQ(a));
    for (let a = 2; a <= 10; a++) for (let c = 0; c < a; c++) add(P.missSubQ(a, c));
    for (let n = 11; n <= 19; n++) { add(P.teenQ(n)); add(P.teenA(n)); add(P.eqQ(10, '+', n - 10)); add(P.eqA(10, '+', n - 10, n)); }
    for (let n = 0; n <= 60; n++) add(P.quickScore(n));
    // 第 6 段
    ['trade', 'breakTen', 'addOnesL', 'addTensL', 'takeOnesL', 'takeTensL', 'colOnes', 'colTens', 'carryNote', 'borrowNote', 'minusBorrow', 'tryAgain', 'remLeftQ', 'countUp'].forEach(k => add(P[k]));
    for (let n = 1; n <= 10; n++) add(P.plusOne(n));
    for (let d = 0; d <= 9; d++) { add(P.onesWrite(d, 0)); add(P.onesWrite(d, 1)); add(P.tensWrite(d)); }
    const L6 = LISTS;
    for (const q of [...L6.carry1, ...L6.borrow1, ...L6.add2, ...L6.add2c, ...L6.sub2, ...L6.sub2b]) { const r = q.op === '+' ? q.a + q.b : q.a - q.b; add(P.eqQ(q.a, q.op, q.b)); add(P.eqA(q.a, q.op, q.b, r)); }
    // 直式：每一位的算式
    for (const q of [...L6.add2, ...L6.add2c]) { const o1 = q.a % 10, o2 = q.b % 10, t1 = Math.floor(q.a / 10), t2 = Math.floor(q.b / 10), os = o1 + o2; add(os > 10 && o1 < o2 ? P.eqA(o2, '+', o1, os) : P.eqA(o1, '+', o2, os)); add(P.eqA(t1, '+', t2, t1 + t2)); }
    for (const q of [...L6.sub2, ...L6.sub2b]) { const o1 = q.a % 10, o2 = q.b % 10, t1 = Math.floor(q.a / 10), t2 = Math.floor(q.b / 10); const br = o1 < o2; add(P.eqA(o1 + (br ? 10 : 0), '-', o2, o1 + (br ? 10 : 0) - o2)); add(P.eqA(t1 - (br ? 1 : 0), '-', t2, t1 - (br ? 1 : 0) - t2)); }
    for (const q of [...L6.t67, ...L6.t89, ...L6.tall]) { add(P.eqQ(q.k, '×', q.g)); add(P.eqA(q.k, '×', q.g, q.k * q.g)); add(P.mulMissQ(q.k, q.k * q.g)); }
    for (const q of L6.divT) { add(P.eqQ(q.n, '÷', q.k)); add(P.eqA(q.n, '÷', q.k, q.q)); }
    for (const q of L6.remD) { add(P.remQ(q.n, q.k)); add(P.remA(q.n, q.k, q.q, q.l)); }
    for (const q of L6.mul21) { add(P.eqQ(q.a, '×', q.b)); add(P.eqA(q.a, '×', q.b, q.a * q.b)); }
    for (const q of L6.wp) { add(P.wpQ(q)); add(P.eqA(q.a, q.op, q.b, q.op === '+' ? q.a + q.b : q.a - q.b)); }
    for (const q of L6.wpmd) { add(P.wpQ(q)); if (q.g) add(P.eqA(q.k, '×', q.g, q.k * q.g)); else add(P.eqA(q.n, '÷', q.k, q.n / q.k)); }
    for (const q of L6.change) { add(P.changeQ(q)); add(P.changeA(q.pay - q.p)); add(P.eqA(q.pay, '-', q.p, q.pay - q.p)); }
    Object.values(P.gIntro).forEach(add); add(P.flipNo);
    ['freeIntro', 'balQ', 'leftHeavy', 'rightHeavy', 'balanced'].forEach(k => add(P[k]));
    for (let n = 2; n <= 40; n++) add(P.balA(n, n));
    // 第 7 段
    add(P.divTensL); add(P.divOnesL); add(P.breakTen);
    for (const q of [...L6.div10, ...L6.div21, ...L6.div21r]) { add(P.eqQ(q.n, '÷', q.k)); add(P.eqA(q.n, '÷', q.k, q.n / q.k)); add(P.eachPart(q.n / q.k)); }
    ['mulFirst', 'parenFirst', 'leftFirst', 'thenRest'].forEach(k => add(P[k]));
    for (const q of [...L6.mix1, ...L6.mix2, ...L6.mix3]) for (const [a, op, b] of mixSteps(q)) { add(P.eqQ(a, op, b)); add(P.eqA(a, op, b, calc(a, op, b))); }
    ['tenTens', 'cmpHund', 'cmpTens3', 'cmpOnes3', 'bigQ', 'smallQ', 'tensQ'].forEach(k => add(P[k]));
    for (const { a, b } of L6.vmul) {
      const o = a % 10, t = Math.floor(a / 10), p = o * b, c = Math.floor(p / 10), y = t * b + c;
      add(P.eqQ(a, '×', b)); add(P.eqA(a, '×', b, a * b)); add(P.eqA(o, '×', b, p)); add(P.eqA(t, '×', b, t * b));
      add(c > 1 ? P.onesWriteC(p % 10, c) : P.onesWrite(p % 10, c)); if (c) add(P.plusCarry(c, y)); if (c > 1) add(P.carryN(c)); add(P.tensWrite(y));
    }
    ['reviewIntro', 'halfHint', 'shortPast', 'fiveHint', 'clockQ'].forEach(k => add(P[k]));
    for (let h = 1; h <= 12; h++) { add(P.halfA(h)); add(P.clockA(h)); for (let m = 5; m < 60; m += 5) add(P.timeA(h, m)); }
    for (let m = 5; m <= 60; m += 5) add(CN(m));
    for (const n of L6.h3) { add(P.thisIs(n)); countSteps(n).forEach(t => add(CN(t))); }
    for (let t = 10; t <= 100; t += 10) add(CN(t));
    for (const { a, b } of L6.cmp3) { add(P.bigger(Math.max(a, b), Math.min(a, b))); }
    for (const q of L6.hadd) { const r = calc(q.a, q.op, q.b); add(P.eqQ(q.a, q.op, q.b)); add(P.eqA(q.a, q.op, q.b, r)); colParts(q).forEach(x => add(P.colSay(...x))); }
    return Array.from(out);
  }
  // 數積木時一路念出來的數：先百、再十、再一
  function countSteps(n) {
    const out = []; let t = 0;
    for (let i = 0; i < Math.floor(n / 100); i++) out.push(t += 100);
    for (let i = 0; i < Math.floor(n / 10) % 10; i++) out.push(t += 10);
    for (let i = 0; i < n % 10; i++) out.push(t += 1);
    return out;
  }
  // 整百整十加減：哪一位要算（[位名, a 的那一位, 運算, b 的那一位, 結果]）
  function colParts(q) {
    const r = calc(q.a, q.op, q.b), out = [];
    [['百位', 100], ['十位', 10]].forEach(([u, m]) => { const d = x => Math.floor(x / m) % 10; if (d(q.b)) out.push([u, d(q.a), q.op, d(q.b), d(r)]); });
    return out;
  }
  const calc = (a, op, b) => op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b;
  // 混合運算的兩步：先算哪一段，再算剩下的
  function mixSteps(q) {
    const [a, o1, b, o2, c] = q.t, hi = o => o === '×' || o === '÷';
    const first = q.p === 'L' ? 0 : q.p === 'R' ? 1 : hi(o2) && !hi(o1) ? 1 : 0;
    if (first === 0) { const v = calc(a, o1, b); return [[a, o1, b], [v, o2, c]]; }
    const v = calc(b, o2, c); return [[b, o2, c], [a, o1, v]];
  }

  // FNV-1a 32-bit，音檔檔名（和 ㄅㄆㄇ 小島一樣）
  function hash(text) {
    let h = 0x811c9dc5;
    const b = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text) : Buffer.from(text, 'utf8');
    for (const c of b) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }

  const M = { mixSteps, countSteps, colParts, SHAPES, LISTS, COINS, SHOP, GAMES, LVNAME, ANIMALS, FISH, CN, Q, ITEMS, BOXABLE, FOOD, STORY, LESSONS, GROUPS, P, allLines, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.M = M;
})(typeof window !== 'undefined' ? window : globalThis);
