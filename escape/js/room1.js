'use strict';
// 第 1 章：玄關
(() => {
  const WALL = { c: '#8cc5b8', pat: 'flower', wain: '#e8d3b0', trim: '#fbf3e3', floor: 'check', fc: ['#f4e6cc', '#d98a5f'] };
  const UMB = [['#d9473a', 0], ['#f2c232', 1], ['#3f6fc4', 2], ['#f2c232', 3], ['#4f9e5a', 4], ['#d9473a', 5], ['#f2c232', 6], ['#4f9e5a', 7], ['#d9473a', 8], ['#f2c232', 9]];
  const KCOL = ['#d9473a', '#3f6fc4', '#f2c232', '#4f9e5a'];

  Object.assign(ITEMS, {
    ticket: { n: '火車票', d: '小鎮車站的火車票。', ic: () => `<g transform="rotate(-8 50 50)"><rect x="12" y="28" width="76" height="44" rx="5" fill="#ffe7b0" ${SW}/><path d="M66 28v44" stroke="#4a3222" stroke-width="2" stroke-dasharray="4 4"/><path d="M20 40h36M20 50h28" stroke="#c4502c" stroke-width="4" stroke-linecap="round"/>${A.txt(40, 66, '10:45', 13, '#4a3222')}</g>`,
      insp: C => { G.read('火車票', `<div style="text-align:center"><svg viewBox="0 0 320 170" style="width:100%;max-width:380px"><rect x="6" y="6" width="308" height="158" rx="12" fill="#ffe7b0" ${SW}/><path d="M236 6v158" stroke="#4a3222" stroke-width="2" stroke-dasharray="6 6"/>${A.txt(120, 42, '小鎮車站 → 海港市', 20)}${A.txt(120, 72, '單程票 · 一般車廂', 14, '#7a6250', 'middle', 500)}${A.txt(120, 128, '發車 10:45', 40, '#c4502c', 'middle', 900)}${A.txt(275, 70, '未', 30, '#4a3222')}${A.txt(275, 110, '剪', 30, '#4a3222')}</svg></div>咦？票上沒有剪票的洞……這張票根本還沒用過。`); G.memoAdd('m2'); } },
    skey: { n: '小鑰匙', d: '藏在腳踏墊底下的小小鑰匙，上面掛著一個鞋子形狀的吊牌。', ic: () => IC.key('#c9cfd6') + `<path d="M70 70q8-10 18 0v10H70z" fill="#d98a5f" ${SW2}/>` },
    mhand: { n: '時鐘分針', d: '一根細長的紅色指針，看起來是大鐘的「分針」。', ic: () => `<path d="M20 80L78 22" stroke="#4a3222" stroke-width="12" stroke-linecap="round"/><path d="M20 80L78 22" stroke="#c4502c" stroke-width="7" stroke-linecap="round"/><circle cx="20" cy="80" r="8" fill="url(#brass)" ${SW2}/>` },
    knob: { n: '黃銅門把', d: '亮晶晶的圓門把，背後有螺絲，應該能裝回某扇門上。', ic: () => `<rect x="18" y="42" width="30" height="16" rx="4" fill="url(#brass)" ${SW}/><circle cx="62" cy="50" r="24" fill="url(#brass)" ${SW}/><circle cx="54" cy="42" r="7" fill="#fff" opacity=".6"/>` },
  });
  Object.assign(MEMO, {
    m1: { t: '第一章 · X 的字條', d: 'X 的字條是用<b>綠色墨水</b>寫的，紙上還有淡淡的薄荷味。' },
    m2: { t: '第一章 · 火車票', d: '爺爺的大衣口袋裡有一張<b>沒剪過的火車票</b>。爺爺其實沒有搭上那班車？' },
    m7: { t: '第一章 · 邀請函', d: '早上是<b>郵差小李</b>把爺爺的邀請函送到你家的。' },
  });

  const umbrella = (x, c, i) => {
    const h = 200 + (i * 37) % 70, lean = ((i * 13) % 7 - 3) * 1.6;
    return `<g transform="rotate(${lean} ${x} 0)"><path d="M${x} -10V${-h}" stroke="#6b4a33" stroke-width="4"/><path d="M${x} ${-h}q0-22 -18-22q-12 0-12 12" fill="none" stroke="#4a3222" stroke-width="9" stroke-linecap="round"/><path d="M${x} ${-h}q0-22 -18-22q-12 0-12 12" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M${x - 11} -20L${x - 7} ${-h + 34}Q${x} ${-h + 20} ${x + 7} ${-h + 34}L${x + 11} -20z" fill="${c}" ${SW}/><path d="M${x - 3} ${-h + 40}L${x - 5} -26" stroke="#fff" stroke-opacity=".45" stroke-width="3"/></g>`;
  };
  const stand = (x, y, sc) => {
    let s = `<g transform="translate(${x} ${y}) scale(${sc})">` + A.sh(0, 2, 160, 14);
    UMB.forEach(([c], i) => s += umbrella(-126 + i * 28, c, i));
    s += `<path d="M-150 -120h300l-18 120H-132z" fill="#c9763f" ${SW}/><path d="M-140 -84h280M-136 -46h272" stroke="#a65a2a" stroke-width="4"/><rect x="-162" y="-132" width="324" height="20" rx="6" fill="#dc8a52" ${SW}/>`;
    return s + '</g>';
  };
  const gclock = (x, y, s, sc = 1) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})">` + A.sh(0, 0, 90, 12);
    o += `<path d="M-70 0V-200H70V0z" fill="#8c5634" ${SW}/><rect x="-46" y="-180" width="92" height="160" rx="40" fill="${s.clockDone ? '#2b1a10' : '#6f4128'}" ${SW}/>`;
    if (s.clockDone) { if (!s.gearTaken) o += `<circle cx="0" cy="-70" r="40" fill="url(#lampG)"/>` + A.gear(-12, -62, 18) + `<circle cx="16" cy="-84" r="12" fill="url(#brass)" ${SW2}/>`; o += `<path d="M-46 -150q-36 4-38 70" fill="#6f4128" ${SW}/>`; }
    else o += `<path d="M0 -172V-60" stroke="#c9a14a" stroke-width="4"/><circle cx="0" cy="-58" r="22" fill="url(#brass)" ${SW}/>`;
    o += `<path d="M-80 -200h160l-10-14H-70z" fill="#a8703f" ${SW}/><rect x="-62" y="-370" width="124" height="170" rx="8" fill="#9a6038" ${SW}/>`;
    o += `<path d="M-74 -370q74-70 148 0z" fill="#a8703f" ${SW}/><circle cx="0" cy="-292" r="52" fill="url(#brass)" ${SW}/><circle cx="0" cy="-292" r="44" fill="#fffaf0" ${SW2}/>`;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; o += `<circle cx="${Math.sin(a) * 36}" cy="${-292 - Math.cos(a) * 36}" r="${i % 3 ? 2 : 3.5}" fill="#4a3222"/>`; }
    const hm = s.clock_r1 || { h: 4, m: 0 };
    const ha = ((hm.h % 12) + hm.m / 60) * 30;
    o += `<path d="M0 -292V-316" stroke="#4a3222" stroke-width="6" stroke-linecap="round" transform="rotate(${ha} 0 -292)"/>`;
    if (s.handOn) o += `<path d="M0 -292V-330" stroke="#c4502c" stroke-width="4" stroke-linecap="round" transform="rotate(${hm.m * 6} 0 -292)"/>`;
    o += `<circle cx="0" cy="-292" r="5" fill="url(#brass)"/>`;
    return o + '</g>';
  };
  const sconce = (x, y) => `<circle cx="${x}" cy="${y}" r="70" fill="url(#lampG)"/><path d="M${x} ${y + 40}v-26" stroke="url(#brass)" stroke-width="6"/><path d="M${x} ${y + 40}v-26" ${SW2}/><rect x="${x - 12}" y="${y + 36}" width="24" height="10" rx="3" fill="url(#brass)" ${SW2}/><path d="M${x - 22} ${y + 14}h44l-10-34h-24z" fill="#fbe3a8" ${SW}/>`;
  const keypadPanel = (x, y, sc, s) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})"><rect x="-40" y="-62" width="80" height="124" rx="10" fill="#dcc29a" ${SW}/><rect x="-30" y="-50" width="60" height="18" rx="4" fill="${s.codeOk ? '#3a7a4a' : '#20302a'}" ${SW2}/>`;
    KCOL.forEach((c, i) => o += `<circle cx="${-21 + i * 14}" cy="-20" r="5.5" fill="${c}" ${SW2}/>`);
    for (let i = 0; i < 9; i++) o += `<rect x="${-26 + (i % 3) * 18}" y="${-8 + ((i / 3) | 0) * 18}" width="14" height="14" rx="3" fill="#fbf3e4" ${SW2}/>`;
    return o + `<rect x="-8" y="46" width="14" height="10" rx="3" fill="#fbf3e4" ${SW2}/></g>`;
  };
  const coat = (x, y, sc, s) => `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M-6-8h12v14h-12z" fill="#8c5634"/><path d="M0 0l-56 40-12 210h136L56 40z" fill="#e0703f" ${SW}/><path d="M-20 4L0 90 20 4" fill="#c4502c" ${SW}/><path d="M0 90v160" ${SW2}/><circle cx="-6" cy="120" r="4" fill="#4a3222"/><circle cx="-6" cy="160" r="4" fill="#4a3222"/><circle cx="-6" cy="200" r="4" fill="#4a3222"/>
    <path d="M18 150h40v40q-20 8-40 0z" fill="${s.ticket ? '#c4502c' : '#d65a33'}" ${SW}/>${s.ticket ? '' : `<rect x="26" y="138" width="22" height="18" rx="2" fill="#ffe7b0" ${SW2} transform="rotate(8 37 147)"/>`}
    <path d="M-56 40l-24 150h20l18-110M56 40l24 150h-20l-18-110" fill="#d65a33" ${SW}/></g>`;

  ROOMS.push({
    id: 'r1', no: 1, name: '玄關', en: 'THE FOYER', mood: 'warm', par: 480, walls: ['n', 'e', 's', 'w'],
    init: () => ({ clock_r1: { h: 4, m: 0 } }),
    intro: [
      '今天是你的生日。',
      { w: 'li', e: 'h', t: '「生日快樂！這是山丘上鐘爺爺寄給你的信喔。」\n一大早，郵差小李送來一封綠色的信。' },
      { l: 1, who: '爺爺的信', t: '親愛的孩子：\n生日快樂！今天來「八音盒之家」找我吧。\n你的禮物，藏在屋子最高的地方。\n　　　　　　　　　　──鐘一鳴' },
      '爺爺是鎮上有名的機關師傅，這棟房子裡的每一道門、每一個抽屜，都是他親手做的謎題。',
      { t: '你一走進玄關，大門就「喀嚓」一聲，自己鎖上了。', sfx: 'click' },
      { w: 'mochi', t: '喵～', sfx: 'meow' },
      '爺爺養的白貓「麻糬」在地毯上伸了個懶腰。……可是，爺爺呢？',
      { t: '<b>操作說明</b>\n點畫面上的東西調查；用左右箭頭轉向四面牆。\n撿到的道具會放在下方，點一下拿在手上，再點畫面就能使用。\n卡住的時候，可以按右上角的燈泡看提示。' },
    ],
    outro: [
      { t: '門鎖「喀啦」地彈開，裡面飄來一股好聞的墨水味。', sfx: 'door' },
      { w: 'mochi', t: '喵！', sfx: 'meow' },
      '麻糬搶先一步溜了進去。你把音符齒輪 Ⅰ 收進口袋，跟了上去。',
    ],
    views: {
      n: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${A.door(400, 150, 200, 320, '#5f8fa8', { open: s.doorOpen, knob: !!s.knobOn })}</g>` +
          keypadPanel(670, 352, 1, s) +
          A.frame(150, 120, 120, 150, `<rect width="100" height="100" fill="#f6e2b8"/><circle cx="50" cy="40" r="18" fill="#f2b632"/><path d="M0 100L30 60 55 85 75 55 100 100z" fill="#6fae5a"/>`) +
          A.frame(760, 140, 110, 110, `<rect width="100" height="100" fill="#fbe8e0"/>${A.sym(4, 50, 50, 2.4)}`) +
          A.plant(130, 480, 1, '#d9774b') + A.plant(880, 480, 0.85, '#4f9e9a') + A.rug(500, 560, 240, 46, '#d9774b', '#f2c46b') +
          sconce(330, 200) + sconce(670, 200) + A.light(),
        hot: s => [
          { id: 'door', r: [400, 150, 200, 320], on: C => { if (s.doorOpen) { C.win(); return; } if (!s.knobOn) G.toast('這扇門的門把不見了，只剩下一個圓圓的洞。'); else if (!s.codeOk) G.toast('門把裝好了，可是旁邊的密碼鎖還鎖著。'); }, use: { knob: C => { C.take('knob'); s.knobOn = 1; Snd.play('click'); G.toast('把黃銅門把裝回門上，轉緊螺絲……裝好了！'); if (s.codeOk) { s.doorOpen = 1; Snd.play('door'); C.win(); } } } },
          { id: 'keypad', r: [620, 280, 100, 140], on: C => W.keypad(C, { title: '門邊的密碼鎖', sub: '數字鍵上面有四個顏色的小圓點：<b style="color:#d9473a">紅</b>、<b style="color:#3f6fc4">藍</b>、<b style="color:#e0a400">黃</b>、<b style="color:#4f9e5a">綠</b>。下方的小銅牌刻著：「下雨天，大家的傘都回家了。」', len: 4, code: '3142', ok: C => { s.codeOk = 1; if (s.knobOn) { s.doorOpen = 1; Snd.play('door'); G.toast('密碼正確！門打開了！'); C.win(); } else G.toast('密碼鎖解開了！不過……門上沒有門把，還是打不開。'); }, okMsg: '嗶──密碼正確！' }) },
          { id: 'pic1', r: [136, 106, 148, 178], t: '一幅山丘上的風景畫。畫的好像就是這棟房子。' },
          { id: 'pic2', r: [746, 126, 138, 138], t: '一朵花的小畫，筆觸很可愛。' },
        ],
      },
      e: {
        draw: s => A.wall(WALL) + A.win(430, 110, 150, 190, { curtain: '#f2c46b' }) +
          `<g filter="url(#ds)"><path d="M190 470V120" stroke="#6b4a33" stroke-width="14" stroke-linecap="round"/><path d="M190 470V120" ${SW} /><path d="M150 470h80" stroke="#6b4a33" stroke-width="14" stroke-linecap="round"/><path d="M190 140l-50-14M190 140l50-14" stroke="#6b4a33" stroke-width="9" stroke-linecap="round"/>` +
          `<path d="M140 108q50-34 100 0l-6 18h-88z" fill="#3f6f8f" ${SW}/>` + coat(240, 132, 0.95, s) + `</g>` +
          `<g filter="url(#ds)">${stand(760, 540, 0.72)}</g>` +
          `<rect x="410" y="360" width="190" height="100" rx="6" fill="#b07644" ${SW}/><rect x="422" y="376" width="80" height="70" rx="4" fill="#c9895a" ${SW2}/><rect x="510" y="376" width="80" height="70" rx="4" fill="#c9895a" ${SW2}/>${A.cat(505, 362, 0.55, 'lie')}` + A.light(),
        hot: s => [
          { id: 'coat', r: [150, 130, 190, 270], go: 'coat' },
          { id: 'umb', r: [630, 300, 260, 260], go: 'umb' },
          { id: 'cat', r: [440, 320, 130, 50], on: () => { Snd.play('meow'); G.toast('麻糬瞇著眼睛呼嚕呼嚕。牠好像一點也不擔心爺爺。'); } },
          { id: 'win', r: [420, 100, 170, 210], t: '窗外是爺爺種的小花園。天氣真好。' },
        ],
      },
      coat: {
        back: 'e', title: '大衣',
        draw: s => A.closeBg('#8cc5b8', 'flower') + `<g filter="url(#ds)">${coat(500, 40, 2.2, s)}</g>` + A.light(),
        hot: s => [
          { id: 'pocket', r: [520, 340, 160, 140], on: C => { if (!s.ticket) { s.ticket = 1; C.give('ticket'); } else G.toast('口袋裡已經空空的了。'); } },
          { id: 'coatBody', r: [330, 60, 180, 420], t: '這是爺爺最喜歡的橘色大衣。出門的話，他一定會穿上它才對……' },
        ],
      },
      umb: {
        back: 'e', title: '傘架',
        draw: s => A.closeBg('#8cc5b8', 'flower') + A.floor('check', ['#f4e6cc', '#d98a5f'], 500) + `<g filter="url(#ds)">${stand(500, 590, 1.9)}</g>` + A.light(),
        hot: s => [{ id: 'umbs', r: [180, 40, 640, 560], t: '傘架裡插滿了顏色鮮豔的雨傘。' }],
      },
      s: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${A.door(390, 130, 220, 340, '#c4683f', { win: true, keyhole: true })}</g>` +
          A.win(130, 140, 140, 170, { curtain: '#e98a8a' }) +
          `<path d="M${s.matUp ? '380 532' : '380 520'}h240l20 50H360z" fill="#9c7a4a" ${SW} ${s.matUp ? 'transform="rotate(-4 500 540)"' : ''}/><path d="M392 532h216" stroke="#7a5a30" stroke-width="3" stroke-dasharray="8 6"/>${A.txt(500, 558, 'WELCOME', 18, '#5a3e1a', 'middle', 900)}` +
          `<g filter="url(#ds)">${A.box(700, 330, 210, 140, '#e9d8bd')}<rect x="716" y="346" width="178" height="52" rx="4" fill="${s.cab ? '#3b2a1f' : '#f4e6cc'}" ${SW2}/><rect x="716" y="406" width="178" height="52" rx="4" fill="#f4e6cc" ${SW2}/>${s.cab ? '' : `<rect x="796" y="364" width="18" height="18" rx="3" fill="url(#brass)" ${SW2}/>`}<circle cx="805" cy="432" r="7" fill="url(#brass)" ${SW2}/></g>` +
          `<path d="M730 316l20-28h28l6 28zM800 316l18-24h26l4 24z" fill="#4f6aa8" ${SW2}/>` + A.light(),
        hot: s => [
          { id: 'front', r: [390, 130, 220, 340], t: '大門從外面被鎖住了，怎麼推都推不開。只能往屋子裡面走了。' },
          { id: 'mat', r: [360, 505, 280, 80], on: C => { if (!s.keyTaken) { s.keyTaken = 1; s.matUp = 1; C.give('skey'); G.toast('掀開腳踏墊──底下藏著一把<b>小鑰匙</b>！'); Snd.play('pick'); } else G.toast('腳踏墊底下已經沒有東西了。'); } },
          { id: 'cabinet', r: [690, 300, 230, 170], go: 'cab' },
          { id: 'win', r: [110, 120, 180, 210], t: '玄關的小窗戶。窗台上積了一點灰。' },
        ],
      },
      cab: {
        back: 's', title: '鞋櫃',
        draw: s => A.closeBg('#8cc5b8', 'flower') + `<g filter="url(#ds)">${A.box(180, 150, 640, 420, '#e9d8bd', 40)}<rect x="220" y="190" width="560" height="170" rx="8" fill="${s.cab ? '#3b2a1f' : '#f4e6cc'}" ${SW}/><rect x="220" y="380" width="560" height="160" rx="8" fill="#f4e6cc" ${SW}/></g>` +
          (s.cab ? `<path d="M240 340h520" stroke="#6b4a33" stroke-width="6"/><path d="M260 340l40-60h50l10 60zM380 340l40-60h50l10 60z" fill="#4f6aa8" ${SW}/>` + (s.handTaken ? '' : `<path d="M560 330L720 230" stroke="#4a3222" stroke-width="14" stroke-linecap="round"/><path d="M560 330L720 230" stroke="#c4502c" stroke-width="8" stroke-linecap="round"/><circle cx="560" cy="330" r="10" fill="url(#brass)"/>`) : `<rect x="470" y="250" width="60" height="60" rx="8" fill="url(#brass)" ${SW}/><path d="M500 268a8 8 0 1 1 0.1 0l5 22h-10z" fill="#2a1a10"/>`) +
          `<circle cx="500" cy="460" r="16" fill="url(#brass)" ${SW}/>` + A.light(),
        hot: s => [
          { id: 'drawer', r: [220, 190, 560, 170], on: C => { if (!s.cab) G.toast('上面的抽屜上了鎖。鎖孔旁邊畫著一隻小鞋子。'); else if (!s.handTaken) { s.handTaken = 1; C.give('mhand'); } else G.toast('抽屜裡只剩下幾雙鞋子。'); }, use: { skey: C => { C.take('skey'); s.cab = 1; Snd.play('unlock'); G.toast('小鑰匙剛好插進去──抽屜打開了！裡面有一根紅色的指針。'); } } },
          { id: 'lower', r: [220, 380, 560, 160], t: '下層放著爺爺的拖鞋，還有一雙小小的貓咪拖鞋。' },
        ],
      },
      w: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${gclock(330, 476, s)}</g>` +
          A.table(600, 360, 220, 112, '#b07644', { cloth: 30, clothC: '#fbf3e3' }) +
          `<path d="M660 352q-6-40 14-60h24q20 20 14 60z" fill="#4f9e9a" ${SW}/>` + `<path d="M686 292q-30-50-6-80M690 292q10-60 40-70M680 292q-40-30-50-60" stroke="#5f9e5a" stroke-width="4" fill="none"/>${A.sym(4, 680, 210, 1.1)}${A.sym(4, 730, 222, 0.9, '#f2c232')}${A.sym(4, 630, 232, 0.9, '#e0605a')}` +
          (s.letter ? A.paper(740, 330, 60, 24, 4, '#f6fbf0', 1) : `<g transform="rotate(-6 760 340)"><rect x="728" y="322" width="70" height="44" rx="3" fill="#e3f1d8" ${SW2}/><path d="M728 322l35 24 35-24" fill="none" ${SW2}/>${A.sparkle(800, 316, 0.8)}</g>`) +
          A.frame(790, 100, 140, 100, `<rect width="100" height="100" fill="#fbe8c0"/><circle cx="50" cy="60" r="30" fill="#f2c46b"/>${A.txt(50, 70, '♪', 34, '#a6542c')}`) + A.light(),
        hot: s => [
          { id: 'clock', r: [250, 90, 160, 390], go: 'clock' },
          { id: 'letter', r: [710, 300, 110, 80], on: C => { s.letter = 1; G.read('桌上的字條（綠色墨水）', '歡迎來到八音盒之家。\n\n爺爺不在家──想找到他，就解開八個房間的謎題吧。每個房間都藏著一枚「音符齒輪」，集滿八枚，大八音盒就會重新唱歌。\n\n第一個提示：\n爺爺要搭的那班火車，就是大鐘該指著的時間。\n\n　　　　　　　　　　　　　── X', 'green'); G.memoAdd('m1'); G.memoAdd('m7', true); } },
          { id: 'vase', r: [620, 200, 130, 150], t: '花瓶裡插著剛摘下來的小花，還很新鮮。' },
        ],
      },
      clock: {
        back: 'w', title: '老爺鐘',
        draw: s => A.closeBg('#8cc5b8', 'flower') + `<g filter="url(#ds)">${gclock(500, 600, s, 1.55)}</g>` + A.light(),
        hot: s => [
          { id: 'face', c: [500, 147, 90], on: C => { if (!s.handOn) { G.toast('鐘面上只有短短的時針，長長的「分針」不見了。'); return; } if (s.clockDone) { G.toast('大鐘停在 10:45。'); return; } W.clock(C, { id: 'r1', title: '撥動老爺鐘', sub: '把指針撥到正確的時間。', hasMin: () => true, check: t => t.h === 10 && t.m === 45, ok: C => { s.clockDone = 1; Snd.play('chime'); G.toast('噹──噹──大鐘響了！下面的鐘擺小門彈開了。'); }, okMsg: '噹──！' }); }, use: { mhand: C => { C.take('mhand'); s.handOn = 1; Snd.play('click'); G.toast('把分針裝回鐘面上了。現在可以撥動指針了。'); } } },
          { id: 'pend', r: [425, 320, 150, 255], on: C => { if (!s.clockDone) G.toast('鐘擺的小門關得緊緊的，好像跟時間有關。'); else if (!s.gearTaken) { s.gearTaken = 1; C.give('knob', true); C.give('g1', true); Snd.play('pick'); G.toast('小門裡面有「<b>黃銅門把</b>」和「<b>音符齒輪 Ⅰ</b>」！'); } else G.toast('小門裡已經空了。'); } },
        ],
      },
    },
    steps: [
      { goal: '找找爺爺留下的東西', done: s => s.ticket, h: ['東邊的牆上掛著一件大衣，爺爺出門一定會穿它吧？', '轉到東邊牆，點大衣看看，口袋好像鼓鼓的。', '點大衣的口袋，拿到「火車票」。'] },
      { goal: '找到能打開抽屜的東西', done: s => s.keyTaken, h: ['大家回家時，都會在門口做一件事……', '看看南邊大門前的腳踏墊。', '點腳踏墊，底下藏著「小鑰匙」。'] },
      { goal: '打開鞋櫃', done: s => s.handTaken, h: ['小鑰匙的吊牌是鞋子形狀的。', '南邊牆的鞋櫃上層抽屜有鎖。', '拿著小鑰匙點鞋櫃抽屜，再點裡面的紅色指針。'] },
      { goal: '讓老爺鐘動起來', done: s => s.clockDone, h: ['西邊牆的桌上有一張字條，讀讀看。', '先把分針裝到老爺鐘上。字條說：火車的時間就是鐘該指的時間。看看火車票上的發車時間。', '把分針裝上鐘面，再把指針撥到 10:45（時針指 10、分針指 9）。'] },
      { goal: '拿到鐘擺小門裡的東西', done: s => s.gearTaken, h: ['大鐘響了以後，下面有東西打開了。', '點老爺鐘下面的鐘擺小門。', '點鐘擺小門，拿到門把和音符齒輪。'] },
      { goal: '打開北邊的門', done: s => s.doorOpen, h: ['北邊的門缺了門把，旁邊還有一個彩色圓點的密碼鎖。銅牌說：「下雨天，大家的傘都回家了」。', '數一數東邊傘架裡，每種顏色的雨傘各有幾把，照密碼鎖上圓點的顏色順序排。', '紅傘 3、藍傘 1、黃傘 4、綠傘 2，密碼是 3142；再把黃銅門把裝到門上。'] },
    ],
  });
})();
