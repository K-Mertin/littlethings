'use strict';
// 第 6 章：玩具房
(() => {
  const WALL = { c: '#a9c8e8', pat: 'star', wain: '#f6dce6', trim: '#fffaf2', floor: 'wood', fc: ['#e0b88a', '#d0a878'] };
  const PL = { bear: '熊熊', rabbit: '兔兔', fox: '狐狸', penguin: '企鵝' };
  // 排排坐規則（每一組都只有一種排法；工具檢查過）
  const RULES = [
    { t: ['企鵝怕熱，要坐在<b>最左邊</b>，靠窗戶的位置。', '兔兔不喜歡坐在<b>兩端</b>。', '熊熊要<b>緊緊挨著</b>坐在狐狸的<b>右邊</b>（從你看過去）。'], ans: ['penguin', 'rabbit', 'fox', 'bear'], h: '企鵝坐最左邊；兔兔不能在兩端，只能坐 2 或 3；熊熊要緊挨在狐狸右邊。如果狐狸坐 2、熊熊坐 3，兔兔就只能坐 4……' },
    { t: ['熊熊最愛看窗外，要坐在<b>最右邊</b>。', '狐狸和熊熊吵架了，<b>不能坐在一起</b>。', '企鵝要<b>緊緊挨著</b>坐在兔兔的<b>右邊</b>（從你看過去）。'], ans: ['fox', 'rabbit', 'penguin', 'bear'], h: '熊熊坐 4；狐狸不能坐 3，只能坐 1 或 2；兔兔和企鵝要挨在一起（兔兔在左）。如果狐狸坐 2，剩下的 1 和 3 就挨不到一起了……' },
    { t: ['兔兔要坐在<b>第 2 個</b>位置。', '企鵝<b>不坐兩端</b>。', '熊熊要坐在狐狸的<b>左邊</b>（不一定挨著）。'], ans: ['bear', 'rabbit', 'penguin', 'fox'], h: '兔兔坐 2，企鵝不坐兩端就只能坐 3；剩下 1 和 4 給熊熊和狐狸，熊熊在左邊。' },
    { t: ['企鵝要坐在<b>最右邊</b>。', '熊熊要<b>緊緊挨著</b>坐在企鵝的<b>左邊</b>。', '兔兔<b>不坐最左邊</b>。'], ans: ['fox', 'rabbit', 'bear', 'penguin'], h: '企鵝坐 4、熊熊坐 3；兔兔不坐最左邊，只能坐 2；剩下的 1 給狐狸。' },
  ];
  const CANON = { rule: 0, start: [0, 5, 7] };
  const V = s => (s && s.v) || CANON;
  const RU = s => RULES[V(s).rule];
  const POSN = ['左上角', '上排中間', '右上角', '中排最左邊', '正中間', '中排最右邊', '左下角', '最下排中間', '右下角'];

  const plush = (k, x, y, sc = 1) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})">`;
    const eyes = `<circle cx="-8" cy="-34" r="3.5" fill="#2a1a10"/><circle cx="8" cy="-34" r="3.5" fill="#2a1a10"/>`;
    if (k === 'bear') o += `<circle cx="-20" cy="-56" r="10" fill="#b07644" ${SW2}/><circle cx="20" cy="-56" r="10" fill="#b07644" ${SW2}/><ellipse cx="0" cy="-4" rx="26" ry="24" fill="#b07644" ${SW2}/><circle cx="0" cy="-34" r="24" fill="#c9895a" ${SW2}/><ellipse cx="0" cy="-26" rx="10" ry="7" fill="#f4dcc0"/><circle cx="0" cy="-29" r="3" fill="#2a1a10"/>${eyes}<path d="M-6 0h12" stroke="#e05a4a" stroke-width="5"/>`;
    if (k === 'rabbit') o += `<ellipse cx="-10" cy="-68" rx="8" ry="22" fill="#fffaf4" ${SW2}/><ellipse cx="10" cy="-68" rx="8" ry="22" fill="#fffaf4" ${SW2}/><ellipse cx="-10" cy="-66" rx="3.5" ry="14" fill="#f6b0c0"/><ellipse cx="10" cy="-66" rx="3.5" ry="14" fill="#f6b0c0"/><ellipse cx="0" cy="-4" rx="24" ry="24" fill="#fffaf4" ${SW2}/><circle cx="0" cy="-34" r="22" fill="#fffaf4" ${SW2}/>${eyes}<path d="M-3-26l3 3 3-3" ${SW2} fill="#f6b0c0"/><circle cx="-14" cy="-28" r="4" fill="#f6b0c0" opacity=".7"/><circle cx="14" cy="-28" r="4" fill="#f6b0c0" opacity=".7"/>`;
    if (k === 'fox') o += `<path d="M20 4q34 0 26-30q-14 14-26 10z" fill="#f08a3a" ${SW2}/><path d="M-22-46l-4-24 16 12zM22-46l4-24-16 12z" fill="#f08a3a" ${SW2}/><ellipse cx="0" cy="-4" rx="24" ry="24" fill="#f08a3a" ${SW2}/><ellipse cx="0" cy="0" rx="12" ry="16" fill="#fff4e6"/><path d="M-24-36q24-20 48 0q-10 18-24 18t-24-18z" fill="#f08a3a" ${SW2}/><path d="M-14-28q14 14 28 0q-6 10-14 10t-14-10z" fill="#fff4e6"/>${eyes}<circle cx="0" cy="-22" r="3" fill="#2a1a10"/>`;
    if (k === 'penguin') o += `<ellipse cx="0" cy="-20" rx="26" ry="40" fill="#3b4a5f" ${SW2}/><ellipse cx="0" cy="-12" rx="17" ry="30" fill="#fffaf4"/><circle cx="-8" cy="-38" r="3.5" fill="#2a1a10"/><circle cx="8" cy="-38" r="3.5" fill="#2a1a10"/><path d="M-6-30h12l-6 7z" fill="#f2b632" ${SW2}/><path d="M-12 18h10v6h-12zM2 18h10l2 6h-12z" fill="#f2b632" ${SW2}/><path d="M-26-20q-10 14-4 24M26-20q10 14 4 24" stroke="#3b4a5f" stroke-width="8" stroke-linecap="round"/>`;
    return o + '</g>';
  };
  Object.assign(ITEMS, Object.fromEntries(Object.entries(PL).map(([k, n]) => [k, { n: n + '娃娃', d: `軟綿綿的${n}娃娃。`, ic: () => plush(k, 50, 86, 1) }])));
  Object.assign(ITEMS, {
    battery: { n: '星星電池', d: '一顆大大的電池，上面印著星星，閃閃發亮。', ic: () => `<rect x="30" y="24" width="40" height="60" rx="6" fill="#ffd84a" ${SW}/><rect x="42" y="16" width="16" height="10" rx="2" fill="#c9cfd6" ${SW2}/>${A.star(50, 54, 14, '#fff6c8', SW2)}` },
    toyKey: { n: '星星鑰匙', d: '鑰匙柄是星星形狀的。', ic: () => `<g transform="rotate(-30 50 50)">${A.star(30, 50, 20, '#ffd84a', SW)}<path d="M46 46h40v8h-6v10h-7v-10h-5v7h-7v-7H46z" fill="#ffd84a" ${SW}/></g>` },
  });
  Object.assign(MEMO, {
    m6: { t: '第六章 · 機器人', d: '機器人說：「X 交代我，把鑰匙交給來玩的孩子。X 現在在<b>最高的地方</b>，看著你喔。嗶。」' },
  });

  const robot = (x, y, sc, on) => `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 0, 60, 10)}<rect x="-40" y="-14" width="30" height="14" rx="4" fill="#7a8a9a" ${SW2}/><rect x="10" y="-14" width="30" height="14" rx="4" fill="#7a8a9a" ${SW2}/><rect x="-46" y="-110" width="92" height="96" rx="14" fill="#cfd8e2" ${SW}/><rect x="-26" y="-90" width="52" height="40" rx="6" fill="${on ? '#9cf0b8' : '#5a6a7a'}" ${SW2}/>${on ? `<path d="M-18-70l8-8 8 8 8-8 8 8" stroke="#2f7d4f" stroke-width="3" fill="none"/>` : ''}<rect x="-68" y="-100" width="22" height="60" rx="10" fill="#9fb0c2" ${SW2}/><rect x="46" y="-100" width="22" height="60" rx="10" fill="#9fb0c2" ${SW2}/>
    <rect x="-34" y="-176" width="68" height="60" rx="16" fill="#e2e9f0" ${SW}/><circle cx="-14" cy="-148" r="9" fill="${on ? '#ffd84a' : '#4a5a6a'}" ${SW2}/><circle cx="14" cy="-148" r="9" fill="${on ? '#ffd84a' : '#4a5a6a'}" ${SW2}/><path d="M-10-128h20" ${SW2}/><path d="M0-176v-16" ${SW2}/><circle cx="0" cy="-196" r="6" fill="${on ? '#e0504a' : '#9aa6b0'}" ${SW2}/></g>`;
  const chest = (x, y, sc, s) => `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 0, 170, 14)}<rect x="-160" y="-150" width="320" height="150" rx="12" fill="#e98a5a" ${SW}/><path d="M-160-100h320M-160-50h320" stroke="#c9683a" stroke-width="4"/>
    ${s.chestOk ? `<path d="M-166-150l20-80h292l20 80z" fill="#f0a070" ${SW}/>` + (s.keyTaken ? '' : A.gear(-40, -160, 24) + `<g transform="translate(10 -200) scale(.7)">${ITEMS.toyKey.ic()}</g>`) : `<rect x="-166" y="-180" width="332" height="40" rx="10" fill="#f0a070" ${SW}/>${[0, 1, 2].map(i => A.star(-60 + i * 60, -160, 13, (s.lights_toy || [])[i] === 0 ? '#5a68a8' : '#ffd84a', SW2)).join('')}`}
    <rect x="-30" y="-130" width="60" height="40" rx="6" fill="#fff3d0" ${SW2}/>${A.txt(0, -104, 'TOYS', 16, '#c9683a', 'middle', 900)}</g>`;

  ROOMS.push({
    id: 'r6', no: 6, name: '玩具房', en: 'THE TOY ROOM', mood: 'title', par: 660, walls: ['n', 'e', 's', 'w'],
    init: () => ({ slots: [null, null, null, null] }),
    canon: CANON,
    vary: r => { let st; do { st = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], r).slice(0, 3).sort((a, b) => a - b); } while (st.join() === '0,5,7'); return { rule: rInt(r, 1, RULES.length - 1), start: st }; },
    note: { v: 'w', x: 153, y: 372, s: 0.85 },
    amb: (v, s) => v === 'e' ? `<g class="pend" style="animation-duration:5s;${A.ad(5)}"><path d="M330 0v70M270 70h120M270 70v40M330 70v60M390 70v34" stroke="#7a5a40" stroke-width="2.5" fill="none"/>${A.star(270, 118, 14, '#ffd84a', SW2)}${A.star(330, 140, 16, '#f6b0c0', SW2)}<circle cx="390" cy="114" r="11" fill="#9fd8ff" ${SW2}/><path d="M384 108a8 8 0 1 0 10 10" fill="#fff8d0"/></g>` : (v === 's' && s.robotOn ? `<circle class="glowp" cx="${820}" cy="${480 - 196}" r="12" fill="#ff8a7a" opacity=".6"/>` : ''),
    intro: [
      '玩具房的牆上畫滿了星星，到處都是積木、娃娃和小火車。這裡大概是爺爺小時候……不，是為你準備的房間。',
      { w: 'mochi', t: '喵喵喵！', sfx: 'meow' },
      '麻糬興奮地鑽進玩具堆裡。北邊的架子上空了四個位置，好像在等誰回家。',
    ],
    outro: [
      { t: '星星鑰匙「咔」地轉開了門。門後傳來滴答滴答、許許多多時鐘的聲音。', sfx: 'door' },
      { w: 'mochi', t: '喵。', sfx: 'meow' },
      '機器人揮揮手：「嗶嗶，一路順風！」',
    ],
    views: {
      n: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)"><rect x="220" y="150" width="560" height="200" rx="10" fill="#f6e2c8" ${SW}/><rect x="236" y="166" width="528" height="168" rx="6" fill="#fdf2e2" ${SW2}/>${[0, 1, 2].map(i => `<path d="M${368 + i * 132} 166v168" ${SW2}/>`).join('')}<rect x="300" y="350" width="400" height="80" rx="8" fill="${s.drawerOpen ? '#3b2a1f' : '#e9c9a8'}" ${SW}/>${s.drawerOpen ? (s.batTaken ? '' : `<g transform="translate(450 340) scale(.9)">${ITEMS.battery.ic()}</g>`) : `<rect x="470" y="380" width="60" height="16" rx="8" fill="#c9895a"/>`}</g>` +
          s.slots.map((k, i) => k ? plush(k, 302 + i * 132, 326, 1.15) : A.txt(302 + i * 132, 270, i + 1, 30, '#e0c8a8', 'middle', 900)).join('') +
          `<g transform="rotate(-3 880 230)">${A.paper(810, 140, 150, 170, 0, '#fffdf3', 0)}${A.pin(885, 146)}${A.txt(885, 178, '排排坐規則', 18, '#c4502c', 'middle', 900)}<path d="M830 200h110M830 230h96M830 260h110M830 290h80" stroke="#9fb89a" stroke-width="4" stroke-linecap="round"/>${A.sparkle(950, 150, 0.6)}</g>` +
          A.win(60, 120, 120, 150, { sky: 'skyNight', curtain: '#f6b0c0' }) + A.light(),
        hot: s => [
          { id: 'shelf', r: [220, 150, 560, 200], go: 'shelf' },
          { id: 'drawer', r: [300, 350, 400, 80], on: C => { if (!s.drawerOpen) G.toast('架子下的抽屜打不開。好像要先讓娃娃們乖乖坐好。'); else if (!s.batTaken) { s.batTaken = 1; C.give('battery'); } else G.toast('抽屜裡空了。'); } },
          { id: 'rules', r: [800, 130, 170, 190], on: () => { s.readRules = 1; G.read('排排坐規則', '<b>四個好朋友要在架子上排排坐（位置由左到右是 1～4）：</b>\n\n' + RU(s).t.map((x, i) => '①②③'[i] + ' ' + x).join('\n')); } },
        ],
      },
      shelf: {
        back: 'n', title: '娃娃架',
        draw: s => A.closeBg('#a9c8e8', 'star') + `<g filter="url(#ds)"><rect x="80" y="130" width="840" height="340" rx="14" fill="#f6e2c8" ${SW}/><rect x="100" y="150" width="800" height="300" rx="8" fill="#fdf2e2" ${SW2}/>${[0, 1, 2].map(i => `<path d="M${300 + i * 200} 150v300" ${SW2}/>`).join('')}</g>` +
          s.slots.map((k, i) => k ? plush(k, 200 + i * 200, 420, 2) : A.txt(200 + i * 200, 320, i + 1, 60, '#e0c8a8', 'middle', 900)).join('') + A.txt(500, 540, '拿著娃娃點空位放上去；點架子上的娃娃可以拿下來。', 24, '#2c3e66', 'middle', 700) + A.light(),
        hot: s => s.slots.map((k, i) => ({ id: 'slot' + i, r: [110 + i * 200, 160, 180, 280], on: C => { if (s.drawerOpen) { G.toast(`${PL[k]}乖乖坐好了。`); return; } if (k) { s.slots[i] = null; C.give(k, true); Snd.play('select'); } else G.toast('空位。拿著娃娃點這裡就能放上去。'); }, use: Object.fromEntries(Object.keys(PL).map(p => [p, C => { if (s.slots[i]) { G.toast('這裡已經坐了別人。'); return; } C.take(p); s.slots[i] = p; Snd.play('tap'); checkShelf(C); }])) })),
      },
      e: {
        draw: s => A.wall(WALL) + A.win(560, 100, 200, 170, { sky: 'skyNight', curtain: '#f6b0c0' }) + `<g filter="url(#ds)"><rect x="90" y="300" width="420" height="160" rx="12" fill="#9fb8e0" ${SW}/><rect x="70" y="200" width="40" height="280" rx="10" fill="#c9895a" ${SW}/><rect x="490" y="250" width="34" height="230" rx="10" fill="#c9895a" ${SW}/><path d="M110 300q100-20 380 0v40H110z" fill="#fff" ${SW}/><path d="M120 340h360v100H120z" fill="#f6b0c0" ${SW2}/><path d="M120 370h360M120 400h360" stroke="#fff" stroke-width="5" opacity=".6"/></g>` +
          (s.has_bear ? '' : plush('bear', 200, 330, 1.1)) + (s.has_rabbit ? '' : plush('rabbit', 300, 330, 1.1)) +
          `<g filter="url(#ds)"><path d="M700 470l20-60h120l20 60z" fill="#5fae5a" ${SW}/><circle cx="740" cy="470" r="14" fill="#3b2a1f"/><circle cx="820" cy="470" r="14" fill="#3b2a1f"/><rect x="760" y="370" width="60" height="40" rx="6" fill="#e0504a" ${SW}/></g>` + A.light(),
        hot: s => [
          { id: 'bear', r: [160, 250, 80, 100], on: C => { if (!s.has_bear) { s.has_bear = 1; C.give('bear'); } } },
          { id: 'rabbit', r: [260, 240, 80, 110], on: C => { if (!s.has_rabbit) { s.has_rabbit = 1; C.give('rabbit'); } } },
          { id: 'train', r: [690, 360, 180, 120], t: '一台小火車。發條轉一轉，嘟嘟嘟地跑起來。' },
          { id: 'win', r: [550, 90, 220, 190], t: '窗外的天色暗下來了，星星一顆一顆亮起來。' },
        ],
      },
      s: {
        draw: s => A.wall(WALL) + A.rug(500, 560, 330, 50, '#f2c46b', '#fff') + `<g filter="url(#ds)">${chest(470, 480, 1, s)}</g>` + `<g filter="url(#ds)">${robot(s.robotOn ? 820 : 470, s.robotOn ? 480 : 530, 1, s.robotOn)}</g>` +
          (s.has_penguin ? '' : plush('penguin', 160, 560, 1.3)) + A.frame(110, 110, 140, 110, `<rect width="100" height="100" fill="#fff"/><path d="M10 80l20-30 20 20 20-40 20 50z" fill="#9fd08a"/>${A.star(80, 24, 12, '#f2c232')}`) + A.light(),
        hot: s => {
          const h = [
            { id: 'chest', r: [300, 280, 340, 210], on: C => { if (!s.robotOn) { G.toast('機器人擋在玩具箱前面，重得推不動。'); return; } if (s.chestOk) { if (!s.keyTaken) { s.keyTaken = 1; C.give('toyKey', true); C.give('g6', true); Snd.play('pick'); G.toast('玩具箱裡有「<b>星星鑰匙</b>」和「<b>音符齒輪 Ⅵ</b>」！'); } else G.toast('箱子裡都是積木。'); return; } W.lights(C, { id: 'toy', title: '星星箱蓋', sub: '箱蓋上刻著：「讓所有星星一起亮。」<br>點一顆星星，它和上下左右的星星都會一起亮或熄。', start: V(s).start, ok: () => { s.chestOk = 1; G.toast('九顆星星全亮了！玩具箱的蓋子打開了。'); }, okMsg: '全部亮起來了！' }); } },
            { id: 'robot', r: s.robotOn ? [750, 280, 140, 210] : [400, 320, 140, 220], on: C => { if (!s.robotOn) G.toast('一個大大的玩具機器人，眼睛暗暗的。背後有一個星星形狀的電池盒，是空的。'); else { Snd.play('beep'); G.toast('機器人：「嗶嗶！X 在最高的地方等你喔！」'); } }, use: { battery: C => { C.take('battery'); s.robotOn = 1; Snd.play('beep'); G.memoAdd('m6'); G.dlg([{ t: '電池「喀」地裝進去，機器人的眼睛亮了起來！', sfx: 'beep' }, '「嗶嗶！電力充飽！我是看門機器人一號！」', '「X 交代我：如果有孩子來玩，就讓開路，讓他打開玩具箱。」', '「X 現在在最高的地方，看著你喔。嗶。」', '機器人喀啦喀啦地走到旁邊，讓出了玩具箱。'], () => C.render()); } } },
          ];
          if (!s.has_penguin) h.push({ id: 'penguin', r: [110, 470, 100, 110], on: C => { s.has_penguin = 1; C.give('penguin'); } });
          return h;
        },
      },
      w: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${A.door(560, 140, 210, 330, '#f08a8a', { keyhole: true, open: s.doorOpen })}</g>` +
          `<g filter="url(#ds)"><rect x="160" y="340" width="160" height="20" rx="6" fill="#9fd08a" ${SW}/><path d="M176 360v110M304 360v110" stroke="#4a3222" stroke-width="10" stroke-linecap="round"/><rect x="160" y="230" width="20" height="130" rx="6" fill="#9fd08a" ${SW}/></g>` + (s.has_fox ? '' : plush('fox', 240, 338, 1.2)) +
          `<g filter="url(#ds)">${[0, 1, 2].map(i => `<rect x="${110 + i * 46}" y="${436 - (i % 2) * 0}" width="40" height="40" rx="4" fill="${['#e0504a', '#4f8ad8', '#f2c232'][i]}" ${SW2}/>` + A.txt(130 + i * 46, 466, 'ABC'[i], 22, '#fff', 'middle', 900)).join('')}<rect x="133" y="396" width="40" height="40" rx="4" fill="#5fae5a" ${SW2}/></g>` + A.light(),
        hot: s => {
          const h = [{ id: 'door', r: [560, 140, 210, 330], on: C => { if (s.doorOpen) C.win(); else G.toast('門上的鎖孔是星星形狀的。'); }, use: { toyKey: C => { C.take('toyKey'); s.doorOpen = 1; Snd.play('door'); C.win(); } } }, { id: 'blocks', r: [100, 390, 170, 90], t: '積木上寫著 A、B、C。' }];
          if (!s.has_fox) h.push({ id: 'fox', r: [190, 260, 110, 100], on: C => { s.has_fox = 1; C.give('fox'); } });
          return h;
        },
      },
    },
    steps: [
      { goal: '找齊四個娃娃', done: s => s.has_bear && s.has_rabbit && s.has_fox && s.has_penguin, h: ['北邊的架子空了四個位置，房間各處有娃娃。', '東邊床上有兩個、南邊地毯上一個、西邊椅子上一個。', '熊熊和兔兔在東邊的床上，企鵝在南邊的地毯，狐狸在西邊的椅子上。'] },
      { goal: '讓娃娃照規則坐好', done: s => s.drawerOpen, h: ['北邊牆上貼著「排排坐規則」。', s => RU(s).h, s => '由左到右：' + RU(s).ans.map(k => PL[k]).join('、') + '。'] },
      { goal: '拿到抽屜裡的東西', done: s => s.batTaken, h: ['娃娃坐好之後，架子下的抽屜打開了。', '點北邊架子下面的抽屜。', '點抽屜，拿到星星電池。'] },
      { goal: '讓機器人動起來', done: s => s.robotOn, h: ['南邊的機器人背後有一個空的電池盒。', '拿著星星電池點機器人。', '把星星電池裝進南邊的機器人。'] },
      { goal: '打開玩具箱', done: s => s.keyTaken, h: ['機器人讓開了，玩具箱蓋上有九顆星星。', '點一顆星星，它和上下左右的星星都會切換。目標是九顆全亮。暗掉的星星形狀其實是線索：剛好是「某幾顆被按過」的樣子。', s => `按「重新來過」回到一開始的樣子，然後點：${V(s).start.map(p => POSN[p]).join('、')}，各點一次。`] },
      { goal: '離開玩具房', done: s => s.doorOpen, h: ['西邊的門有星星形狀的鎖孔。', '玩具箱裡有星星鑰匙。', '拿星星鑰匙點西邊的門。'] },
    ],
  });

  function checkShelf(C) {
    const s = C.s;
    if (s.slots.some(k => !k)) return;
    if (s.slots.join() === RU(s).ans.join()) { s.drawerOpen = 1; Snd.play('unlock'); G.toast('四個娃娃乖乖坐好了！架子下面傳來「喀噠」一聲──抽屜打開了。'); }
    else { Snd.play('wrong'); G.toast('娃娃們嘟著嘴，好像不滿意這樣坐。看看規則，再換換位置吧。'); }
  }
})();
