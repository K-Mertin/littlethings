/* 棋牌桌遊 · 成就徽章
   只「讀」各遊戲已經存在的 localStorage 資料來判斷（前綴 tb:），不改任何存檔格式。
   取得日期另外記在 tb:badges = { <徽章 id>: 'YYYY-MM-DD' }。
   每個徽章：{ id, g: 分組, i: 圖示, n: 名稱, d: 說明, c: () => [目前, 目標] }，目前 ≥ 目標 就算取得。 */
(function () {
  'use strict';
  const get = (k, d) => { try { const v = localStorage.getItem('tb:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const st = (g, k) => (get('stats:' + g, {}) || {})[k] || 0;
  const sum = (games, k) => games.reduce((a, g) => a + st(g, k), 0);
  const any = (games, k) => games.reduce((a, g) => Math.max(a, st(g, k)), 0);
  const cnt = o => (o && typeof o === 'object') ? Object.keys(o).filter(k => o[k]).length : 0;
  const starSum = o => (o && typeof o === 'object') ? Object.values(o).reduce((a, b) => a + (+b || 0), 0) : 0;
  const yes = v => [v ? 1 : 0, 1];
  const at = (v, n) => [Math.min(v, n), n];
  const eloBest = () => ['xiangqi', 'chess', 'banqi', 'gomoku', 'reversi'].reduce((a, g) => { const o = get('elo:' + g, null); return Math.max(a, o ? (o.best || o.r || 0) : 0); }, 0);
  const lvWon = (g, lvs) => lvs.reduce((a, l) => a + st(g, 'won-lv' + l), 0);   // 贏過這些等級（含以上）
  const streakBest = () => Math.max(...['xqp', 'chp', 'sudoku', 'mines'].map(p => (get(p + ':streak', { n: 0 }) || {}).n || 0));
  const fastest = k => { const v = get(k, 0); return v > 0 ? v : Infinity; };
  const fcStreak = () => ((get('poker:streak:freecell', null) || {}).best || 0);   // 空當接龍最佳連勝
  const chapterFull = (pre, si, n) => { const s = get(pre + ':stars', {}) || {}; let c = 0; for (let i = 0; i < n; i++) if ((s[si + '-' + i] || 0) >= 3) c++; return c; };

  const BOARD = ['xiangqi', 'banqi', 'chess', 'gomoku', 'reversi', 'go', 'checkers'];
  const ALL = ['xiangqi', 'banqi', 'chess', 'gomoku', 'reversi', 'go', 'checkers', 'poker', 'mahjong', 'sudoku', 'mines', 'xq-puzzle', 'chess-puzzle', 'go-learn-cap'];
  const ONLINE = ['xiangqi-online', 'gomoku-online', 'banqi-online', 'mahjong-online'];
  const goWon = (sizes, lvs) => { let a = 0; sizes.forEach(n => lvs.forEach(l => { a += st('go', 'won-' + n + '-lv' + l); })); return a; };

  const B = [
    // ---- 入門 ----
    { id: 'first-cpu', g: '入門', i: '🎯', n: '初試身手', d: '第一次在任何一種棋贏過電腦', c: () => yes(sum(BOARD, 'won')) },
    { id: 'first-card', g: '入門', i: '🃏', n: '牌桌新手', d: '撲克牌任一種玩法贏一次', c: () => yes(st('poker', 'won')) },
    { id: 'explorer', g: '入門', i: '🧭', n: '到處逛逛', d: '玩過 6 種不同的遊戲', c: () => at(ALL.filter(g => st(g, 'played') > 0).length, 6) },
    { id: 'allround', g: '入門', i: '🌈', n: '樣樣都來', d: '玩過 12 種不同的遊戲', c: () => at(ALL.filter(g => st(g, 'played') > 0).length, 12) },
    { id: 'first-online', g: '入門', i: '📡', n: '連線對手', d: '玩一場線上對戰', c: () => yes(sum(ONLINE, 'played')) },

    // ---- 棋類 ----
    { id: 'xq-l4', g: '棋類', i: '🐎', n: '象棋高手', d: '象棋贏過「高級」電腦', c: () => yes(lvWon('xiangqi', [4, 5])) },
    { id: 'xq-l5', g: '棋類', i: '🏯', n: '大師殺手', d: '象棋贏過「大師」電腦', c: () => yes(lvWon('xiangqi', [5])) },
    { id: 'xq-50', g: '棋類', i: '📜', n: '象棋老手', d: '下完 50 盤象棋', c: () => at(st('xiangqi', 'played'), 50) },
    { id: 'bq-l3', g: '棋類', i: '🀄', n: '翻棋王', d: '暗棋贏過「困難」電腦', c: () => yes(lvWon('banqi', [3])) },
    { id: 'ch-l4', g: '棋類', i: '♞', n: '西洋棋高手', d: '西洋棋贏過「高級」電腦', c: () => yes(lvWon('chess', [4, 5])) },
    { id: 'ch-l5', g: '棋類', i: '♛', n: '西洋棋大師', d: '西洋棋贏過「大師」電腦', c: () => yes(lvWon('chess', [5])) },
    { id: 'gm-l3', g: '棋類', i: '⚫', n: '五子連珠', d: '五子棋贏過「高手」電腦', c: () => yes(lvWon('gomoku', [3])) },
    { id: 'rv-l3', g: '棋類', i: '⚪', n: '翻轉乾坤', d: '黑白棋贏過「高手」電腦', c: () => yes(lvWon('reversi', [3])) },
    { id: 'go-9', g: '棋類', i: '🪨', n: '圍棋初勝', d: '圍棋贏過電腦一次', c: () => yes(st('go', 'won')) },
    { id: 'go-9h', g: '棋類', i: '⛰️', n: '九路高手', d: '9 路圍棋贏過「高級」電腦', c: () => yes(goWon([9], [3])) },
    { id: 'go-13', g: '棋類', i: '🏔️', n: '十三路勝利', d: '13 路圍棋贏過「中級」以上電腦', c: () => yes(goWon([13], [2, 3])) },
    { id: 'ck-10', g: '棋類', i: '⭐', n: '跳棋達人', d: '跳棋贏 10 局', c: () => at(st('checkers', 'won'), 10) },
    { id: 'ck-hard', g: '棋類', i: '🔷', n: '跳過高手', d: '跳棋贏過「困難」電腦', c: () => yes(st('checkers', 'won-vs-lv2')) },
    { id: 'ck-hard5', g: '棋類', i: '💠', n: '跳棋常勝軍', d: '跳棋贏「困難」電腦 5 次', c: () => at(st('checkers', 'won-vs-lv2'), 5) },
    { id: 'ck-3hard', g: '棋類', i: '🌟', n: '以一敵三', d: '跳棋一局裡贏過 3 位以上「困難」電腦', c: () => yes(st('checkers', 'won-vs-3hard')) },
    { id: 'elo-1300', g: '棋類', i: '🥋', n: '初段', d: '任一種棋的等級分達到 1300（初段）', c: () => at(eloBest(), 1300) },
    { id: 'elo-1600', g: '棋類', i: '🎖️', n: '三段', d: '任一種棋的等級分達到 1600（三段）', c: () => at(eloBest(), 1600) },
    { id: 'elo-1900', g: '棋類', i: '👑', n: '五段', d: '任一種棋的等級分達到 1900（五段）', c: () => at(eloBest(), 1900) },
    { id: 'online-w1', g: '棋類', i: '🤝', n: '線上首勝', d: '線上對戰贏一場', c: () => yes(sum(ONLINE, 'won')) },
    { id: 'online-w10', g: '棋類', i: '🌐', n: '連線霸主', d: '線上對戰贏 10 場', c: () => at(sum(ONLINE, 'won'), 10) },

    // ---- 牌類 ----
    { id: 'kl-win', g: '牌類', i: '♠️', n: '接龍完成', d: '新接龍過關一次', c: () => yes(st('poker-klondike', 'won')) },
    { id: 'kl-5min', g: '牌類', i: '⏱️', n: '接龍快手', d: '新接龍 5 分鐘內過關', c: () => yes(fastest('poker:best:klondike') <= 300) },
    { id: 'kl-100', g: '牌類', i: '👣', n: '精打細算', d: '新接龍 100 步內過關', c: () => yes(fastest('poker:bestmoves:klondike') <= 100) },
    { id: 'kl-80', g: '牌類', i: '🎯', n: '一步不浪費', d: '新接龍 80 步內過關', c: () => yes(fastest('poker:bestmoves:klondike') <= 80) },
    { id: 'fc-5', g: '牌類', i: '🗂️', n: '空當專家', d: '空當接龍過關 5 次', c: () => at(st('poker-freecell', 'won'), 5) },
    { id: 'fc-st5', g: '牌類', i: '🔗', n: '空當連勝', d: '空當接龍連續過關 5 局（中途放棄會重算）', c: () => at(fcStreak(), 5) },
    { id: 'fc-st10', g: '牌類', i: '⛓️', n: '空當十連勝', d: '空當接龍連續過關 10 局', c: () => at(fcStreak(), 10) },
    { id: 'fc-5min', g: '牌類', i: '⚡', n: '空當閃電', d: '空當接龍 5 分鐘內過關', c: () => yes(fastest('poker:best:freecell') <= 300) },
    { id: 'sp-2', g: '牌類', i: '🕷️', n: '雙色蜘蛛', d: '蜘蛛紙牌兩種花色過關', c: () => yes(st('poker-spider', 'won2') + st('poker-spider', 'won4')) },
    { id: 'sp-4', g: '牌類', i: '🕸️', n: '蜘蛛之王', d: '蜘蛛紙牌四種花色過關', c: () => yes(st('poker-spider', 'won4')) },
    { id: 'py-win', g: '牌類', i: '🔺', n: '金字塔頂', d: '金字塔全部拆完', c: () => yes(st('poker-pyramid', 'won')) },
    { id: 'b2-10', g: '牌類', i: '2️⃣', n: '大老二常勝', d: '大老二贏 10 次', c: () => at(st('poker-bigtwo', 'won'), 10) },
    { id: 'rp-win', g: '牌類', i: '❤️', n: '撿紅點贏家', d: '撿紅點贏一次', c: () => yes(st('poker-redpoint', 'won')) },
    { id: 'ht-win', g: '牌類', i: '👏', n: '手最快', d: '心臟病贏一次', c: () => yes(st('poker-heart', 'won')) },
    { id: 'gz-win', g: '牌類', i: '🐷', n: '不吃豬', d: '拱豬贏一場', c: () => yes(st('poker-gongzhu', 'won')) },
    { id: 'mj-hu', g: '牌類', i: '🀄', n: '第一次胡', d: '麻將胡牌一次', c: () => yes(st('mahjong', 'hu') + st('mahjong-online', 'hu')) },
    { id: 'mj-zimo', g: '牌類', i: '🙌', n: '自摸十次', d: '麻將自摸 10 次', c: () => at(st('mahjong', 'zimo') + st('mahjong-online', 'zimo'), 10) },
    { id: 'mj-8', g: '牌類', i: '🧧', n: '大牌', d: '麻將胡一把 8 台以上', c: () => at(get('mahjong:maxTai', 0) || 0, 8) },
    { id: 'mj-16', g: '牌類', i: '🐉', n: '超級大牌', d: '麻將胡一把 16 台以上', c: () => at(get('mahjong:maxTai', 0) || 0, 16) },
    { id: 'mj-top', g: '牌類', i: '🏆', n: '一將之王', d: '麻將打完一將拿第一', c: () => yes(st('mahjong', 'won') + st('mahjong-online', 'won')) },

    // ---- 益智 ----
    { id: 'sd-hard', g: '益智', i: '🔢', n: '數獨好手', d: '數獨「困難」完成一題', c: () => yes(st('sudoku:3', 'won') + st('sudoku:4', 'won')) },
    { id: 'sd-exp', g: '益智', i: '🧠', n: '數獨專家', d: '數獨「專家」完成一題', c: () => yes(st('sudoku:4', 'won')) },
    { id: 'sd-path', g: '益智', i: '🛤️', n: '數獨之路', d: '數獨之路拿到 90 顆星', c: () => at(starSum(get('sudoku:path', {})), 90) },
    { id: 'sd-path3', g: '益智', i: '🌟', n: '數獨之路全滿', d: '數獨之路 60 關全部三星', c: () => at(starSum(get('sudoku:path', {})), 180) },
    { id: 'mn-hard', g: '益智', i: '💣', n: '排雷專家', d: '踩地雷「高級」過關', c: () => yes(st('mines:hard', 'won')) },
    { id: 'mn-100', g: '益智', i: '🚩', n: '百秒排雷', d: '踩地雷「高級」100 秒內過關', c: () => yes(fastest('mines:best:hard') <= 100) },
    { id: 'mn-camp', g: '益智', i: '🗺️', n: '闖關完成', d: '踩地雷 30 關闖關全部過關', c: () => at(cnt(get('mines:camp', {})), 30) },

    // ---- 挑戰（教室、殘局）----
    { id: 'xql-all', g: '挑戰', i: '🎓', n: '象棋畢業', d: '完成象棋教室全部 18 課', c: () => at(cnt(get('xql:done', {})), 18) },
    { id: 'gol-all', g: '挑戰', i: '📖', n: '圍棋畢業', d: '完成圍棋教室全部 14 課', c: () => at(cnt(((get('go-learn', {}) || {}).done) || {}), 14) },
    { id: 'xqp-30', g: '挑戰', i: '🧩', n: '殘局解手', d: '象棋殘局解開 30 題', c: () => at(cnt(get('xqp:stars', {})), 30) },
    { id: 'xqp-all', g: '挑戰', i: '🏅', n: '殘局全破', d: '象棋殘局 74 題全部解開', c: () => at(cnt(get('xqp:stars', {})), 74) },
    { id: 'xqp-ch1', g: '挑戰', i: '💫', n: '一章三星', d: '象棋殘局第一章 18 題全部三星', c: () => at(chapterFull('xqp', 0, 18), 18) },
    { id: 'chp-30', g: '挑戰', i: '♟️', n: '殺棋解手', d: '西洋棋殺棋解開 30 題', c: () => at(cnt(get('chp:stars', {})), 30) },
    { id: 'chp-all', g: '挑戰', i: '🥇', n: '殺棋全破', d: '西洋棋殺棋 56 題全部解開', c: () => at(cnt(get('chp:stars', {})), 56) },
    { id: 'cap-5', g: '挑戰', i: '⚪', n: '吃子小將', d: '圍棋教室的吃子遊戲贏 5 次', c: () => at(st('go-learn-cap', 'won'), 5) },

    // ---- 毅力 ----
    { id: 'daily-7', g: '毅力', i: '📅', n: '一週不間斷', d: '任一種「每日一題」連續 7 天', c: () => at(streakBest(), 7) },
    { id: 'daily-30', g: '毅力', i: '🗓️', n: '一個月不間斷', d: '任一種「每日一題」連續 30 天', c: () => at(streakBest(), 30) },
    { id: 'play-100', g: '毅力', i: '💯', n: '百局', d: '所有遊戲合計玩 100 局', c: () => at(sum(ALL, 'played'), 100) },
    { id: 'play-500', g: '毅力', i: '🔥', n: '五百局', d: '所有遊戲合計玩 500 局', c: () => at(sum(ALL, 'played'), 500) },
    { id: 'win-100', g: '毅力', i: '🏵️', n: '百勝', d: '所有遊戲合計贏 100 次', c: () => at(sum(ALL, 'won'), 100) },
  ];
  const GROUPS = ['入門', '棋類', '牌類', '益智', '挑戰', '毅力'];

  function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  /** 算出每個徽章的狀態；有新取得的就記下日期並回傳 */
  function evaluate() {
    let got; try { got = JSON.parse(localStorage.getItem('tb:badges') || '{}') || {}; } catch (e) { got = {}; }
    const fresh = [], list = B.map(b => {
      let cur = 0, tgt = 1; try { [cur, tgt] = b.c(); } catch (e) { }
      const ok = cur >= tgt;
      if (ok && !got[b.id]) { got[b.id] = today(); fresh.push(b); }
      return Object.assign({}, b, { cur, tgt, ok, date: got[b.id] || null });
    });
    if (fresh.length) { try { localStorage.setItem('tb:badges', JSON.stringify(got)); } catch (e) { } }
    return { list, fresh };
  }
  /** 第一次載入時，把「已經達成」的徽章默默記下（不跳通知），之後新達成的才跳 */
  function primeSilently() {
    try { if (localStorage.getItem('tb:badges') == null) { evaluate(); return true; } } catch (e) { }
    return false;
  }
  window.TBBadges = { list: B, groups: GROUPS, evaluate, primeSilently };
})();
