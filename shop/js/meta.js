'use strict';
// 夜市小吃王：跨存檔的傳承（成就、傳承點數、加成）與阿德伯的年度故事（新手引導在 guide.js）

const Legacy = {
  d: { pts: 0, perks: {}, ach: {}, clear: 0, gens: 0 },
  load() {
    try { const v = JSON.parse(localStorage.getItem('shop.legacy') || 'null'); if (v && typeof v === 'object') Object.assign(this.d, v); } catch (e) { }
    this.d.perks = this.d.perks || {}; this.d.ach = this.d.ach || {};
  },
  save() { try { localStorage.setItem('shop.legacy', JSON.stringify(this.d)); } catch (e) { } },
  add(n) { if (Game.demoMode) return; this.d.pts += n; this.save(); },
  // 回傳是不是第一次解鎖（第一次才給點數）
  unlock(id, pt) {
    if (Game.demoMode) return false;
    if (this.d.ach[id]) return false;
    this.d.ach[id] = 1; this.d.pts += pt || 0; this.save();
    return true;
  },
  perkLv(id) { return this.d.perks[id] || 0; },
  perkCost(p) { return p.cost * (this.perkLv(p.id) + 1); },
  buy(id) {
    const p = PERKS.find(p => p.id === id); if (!p) return '沒有這個加成';
    const lv = this.perkLv(id);
    if (lv >= p.max) return '已經是最高等級';
    const c = this.perkCost(p);
    if (this.d.pts < c) return '傳承點數不夠';
    this.d.pts -= c; this.d.perks[id] = lv + 1; this.save();
    return '';
  },
  scenOpen(sc) { return !sc.lock || this.d.clear || this.d.gens > 0 || Object.keys(this.d.ach).length >= 8; },
};

// 每年開頭阿德伯的話（第 2 年～第 10 年），之後隨機
const STORY = [
  '第一年辛苦了！夜市的老客人開始記得你的味道了。今年，試著讓更多人認識你吧。',
  '聽說隔壁街的老店在打聽你的名字……被對手注意到，代表你真的變強了。',
  '我年輕的時候也想過要做到夜市第一。那時候啊，一碗滷肉飯才三十塊……',
  '颱風、寒流、菜價上漲，夜市人什麼沒遇過？撐過去，招牌就會越來越亮。',
  '有記者跑來問我你的事，我說：那孩子啊，是真心喜歡做吃的。',
  '別忘了常回頭看看第一天的那台小攤車。它記得你所有的努力。',
  '我打算明年把香腸攤收起來了。以後這條街，就交給你們年輕人了。',
  '我的攤子收了，但每天晚上我還是會來你店裡坐坐。這裡的燈，比以前更亮了。',
  '十年了。夜市的燈每晚都會亮起來，而你，已經是這條街的光。',
];
const STORY_LATE = [
  '新的一年，夜市又多了好多新面孔。保持初心，繼續前進吧！',
  '今天有個小朋友說，長大以後也想開一家像你這樣的店。',
  '老客人帶著孫子來吃了。你的味道，已經傳到第三代了呢。',
  '外國觀光客拿著手機，說是看了網路介紹專程來的。了不起！',
];
