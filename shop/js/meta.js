'use strict';
// 夜市小吃王：跨存檔的傳承（成就、傳承點數、加成）與新手教學

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

// ---------- 新手教學 ----------
// hl：依序找第一個看得到的元素加上提示光圈；done：完成條件；next：只要按「下一步」
const TUT = [
  { t: '歡迎來到夜市！', x: '我是隔壁賣香腸的<b>阿德伯</b>。第一次開店吧？跟著我一步一步來，很快就上手了！（隨時可以按「跳過教學」）', next: 1 },
  { t: '客人是怎麼來的', x: '客人會走到攤位前面<b>排隊</b>，廚師煮好就付錢，再找位子坐下來吃。右上角可以<b>暫停</b>或<b>加快時間</b>。', next: 1, hl: ['#speed'] },
  { t: '多擺幾張桌椅', x: '座位太少，客人只能外帶。打開<b>「建造」→「座位」</b>，買一組<b>塑膠桌椅</b>，放在店裡的空地上。', hl: ['[data-a="pick"][data-v="stool"]', '#panel [data-a="tab"][data-v="seat"]', '#bar [data-v="build"]'], done: () => Game.S.items.filter(i => F[i.id].cat === 'seat').length >= 3, r: { money: 600 } },
  { t: '研發新菜色', x: '菜色越多，客人越開心。打開<b>「研發」</b>，把<b>麵粉</b>和<b>雞蛋</b>放進兩個格子，按「研發！」。', sweet: '菜色越多，客人越開心。打開<b>「研發」</b>，把<b>茶葉</b>和<b>牛奶</b>放進兩個格子，按「研發！」。',
    hl: ['[data-a="rgo"]:not([disabled])', '[data-a="rpick"][data-v="@A"]:not(.on)', '[data-a="rpick"][data-v="@B"]:not(.on)', '#panel [data-a="tab"][data-v="lab"]', '#bar [data-v="lab"]'], done: () => Game.known().length >= 3, r: { idea: 6 } },
  { t: '調整價錢', x: '打開<b>「菜單」</b>可以調整每道菜的價錢。<b>綠色</b>剛好、<b>紅色</b>太貴、<b>藍色</b>太便宜。新菜也記得上架喔！', hl: ['#bar [data-v="menu"]'], done: () => UI.panel === 'menu' },
  { t: '請個幫手', x: '人手不夠了！到<b>「員工」→「徵人」</b>請一位新員工。<b>外場</b>會清桌子、招呼排隊的客人；每個人還有不同的<b>特質</b>。', hl: ['#panel [data-a="hire"]', '#panel [data-a="tab"][data-v="hire"]', '#bar [data-v="staff"]'], done: () => Game.S.staff.length >= 3, r: { money: 800 } },
  { t: '擺設組合', x: '有些東西放在<b>隔壁</b>（斜的也算）會變成<b>擺設組合</b>！試試把<b>兩個紅燈籠</b>放在一起。', hl: ['[data-a="pick"][data-v="lantern"]', '#panel [data-a="tab"][data-v="decor"]', '#bar [data-v="build"]'], done: () => Object.keys(Game.S.combos).length >= 1, r: { money: 1000 } },
  { t: '目標與擴建', x: '打開<b>「經營」</b>看看目標和排行榜。人氣到 <b>120</b> 就能擴建成「巷口小吃店」，店面變大、能請更多人！', hl: ['#bar [data-v="info"]'], done: () => UI.panel === 'info' },
  { t: '出師了！', x: '基本功都會了！之後會有<b>客人委託</b>、<b>節慶挑戰</b>、每年 10 月的<b>小吃大賽</b>，店變大以後還能到<b>「事業」</b>開分店、辦活動。目標是排行榜第一名，加油！', next: 1, r: { idea: 10 } },
];

const Tut = {
  el: null, hlEl: null, last: -2,
  init() { this.el = $('#tut'); },
  step() { const S = Game.S; return S && S.tut ? S.tut.step : -1; },
  active() { return Main.state === 'play' && this.step() >= 0 && this.step() < TUT.length; },
  pair() { return Game.S.scen === 'sweet' ? ['tea', 'milk'] : ['flour', 'egg']; },
  update() {
    if (!this.el) return;
    if (!this.active() || UI.modal) { this.el.hidden = true; this.clearHl(); return; }
    const i = this.step(), T = TUT[i];
    if (Game.S.week >= 48) { Game.S.tut.step = -1; this.clearHl(); this.el.hidden = true; return; }
    if (T.done && T.done()) { this.advance(); return; }
    if (this.last !== i) this.render();
    this.el.hidden = false;
    this.place();
    // 提示光圈
    let tgt = null;
    const [A, B] = this.pair();
    for (const q of T.hl || []) {
      const sel = q.replace('@A', A).replace('@B', B);
      // 研發：兩個都選好才提示按鈕，選了一個就提示另一個
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) { tgt = el; break; }
    }
    if (tgt !== this.hlEl) {
      this.clearHl();
      if (tgt) { tgt.classList.add('tut-hl'); this.hlEl = tgt; if (tgt.closest('.pb')) tgt.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }
  },
  clearHl() { if (this.hlEl) this.hlEl.classList.remove('tut-hl'); this.hlEl = null; document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl')); },
  place() {
    const r = this.el.style;
    const ev = $('#hudEv'), eb = ev && ev.textContent ? ev.getBoundingClientRect().bottom : 0;
    r.top = Math.max(R.top + 2, eb + 4) + 'px';
    const short = innerHeight < 520 && innerWidth > innerHeight;
    if (short && !UI.panel) { r.left = 'auto'; r.right = '8px'; } else { r.right = 'auto'; r.left = (R.left + 8) + 'px'; }
  },
  render() {
    const i = this.step(), T = TUT[i];
    this.last = i;
    const look = makeLook(4242, 'elder'); look.hat = 'band'; look.key += 'tut';
    const txt = Game.S.scen === 'sweet' && T.sweet ? T.sweet : T.x;
    this.el.innerHTML = `<div class="tp">${UI.img(Art.portrait(look, 'happy'), 2)}</div><div class="tx"><b>${T.t}</b><p>${txt}</p>
      <div class="tb"><span class="dots">${TUT.map((_, k) => `<i class="${k < i ? 'd' : k === i ? 'c' : ''}"></i>`).join('')}</span>
      <button class="skip" data-a="tutskip">跳過教學</button>${T.next ? `<button class="btn go" data-a="tutnext">${i === TUT.length - 1 ? '開始經營！' : '下一步'}</button>` : ''}</div></div>`;
  },
  advance() {
    const S = Game.S, T = TUT[this.step()];
    if (T && T.r) { Game.giveReward(T.r); UI.toast(`教學完成：${T.t}！ ${Game.rewardText(T.r)}`, 'good'); Snd.play('level'); }
    S.tut.step++;
    if (S.tut.step >= TUT.length) { S.tut.step = -1; this.clearHl(); Prefs.d.tutDone = 1; Prefs.save(); }
    this.last = -2;
    this.update();
  },
  skip() { Game.S.tut.step = -1; Prefs.d.tutDone = 1; Prefs.save(); this.clearHl(); this.el.hidden = true; UI.toast('已跳過教學，可以在「選單」重新開啟', ''); },
  restart() { Game.S.tut = { step: 0 }; this.last = -2; this.update(); },
};
