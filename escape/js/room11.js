'use strict';
// 第二部 第 1 章：藍色特快（拼出鏤空卡、轉卡片讀出告示、找到打孔器、照數字打孔開門）
(() => {
  const WALL = { c: '#efe0c0', pat: 'diamond', frieze: false, wain: '#7a4a2a', wy: 352, trim: '#d9b87f', floor: 'carpet', fc: ['#8a3a3a', '#7a3030'], fy: 500 };
  const NUM = ['一', '二', '三', '四', '五', '六'];
  const POOL = '海港市燈塔鐘站票車窗風山雲橋河鳥花樹茶書門東西南北早晚星月水石光影';
  // 打孔卡的圖案（5×5）：門鎖只看每一排、每一行的數字，排得出來就算對
  const PICS = [
    { n: '愛心', g: ['01010', '11111', '11111', '01110', '00100'] },
    { n: '鈴鐺', g: ['00100', '01110', '01110', '11111', '00100'] },
    { n: '小貓', g: ['10001', '11111', '10101', '11111', '01110'] },
    { n: '箭頭', g: ['00100', '01110', '10101', '00100', '00100'] },
    { n: '小房子', g: ['00100', '01110', '11111', '01010', '01110'] },
    { n: '火車', g: ['11000', '11111', '11111', '01010', '00000'] },
  ].map(p => ({ n: p.n, sol: p.g.map(r => r.split('').map(Number)) }));
  const gen = (r, canon) => {
    const box = canon ? 4 : rInt(r, 0, 5), k = canon ? 1 : rInt(r, 1, 3);
    return { box, pic: canon ? 0 : rInt(r, 0, PICS.length - 1), gr: W.grilleMake(r, '行李櫃' + NUM[box], k, POOL) };
  };
  const CANON = gen(makeRng(20261028), true);
  const V = s => (s && s.v) || CANON;
  const PHRASE = s => '行李櫃' + NUM[V(s).box];
  A.KEYS.r11 = 'e';

  Object.assign(ITEMS, {
    cardA: { n: '半張卡片（左）', d: '硬硬的深色卡片，被撕成兩半，上面開著方方的小洞。', ic: () => `<path d="M18 22h34l-6 12 8 10-8 12 6 10-6 12H18z" fill="#5a3a2a" ${SW}/><rect x="24" y="30" width="12" height="12" fill="#fffaf0" ${SW2}/><rect x="28" y="60" width="12" height="12" fill="#fffaf0" ${SW2}/>` },
    cardB: { n: '半張卡片（右）', d: '另外半張深色卡片，邊邊有個小小的「▲ 車頭」。', ic: () => `<path d="M82 22H50l-6 12 8 10-8 12 6 10-6 12h38z" fill="#5a3a2a" ${SW}/><rect x="60" y="48" width="12" height="12" fill="#fffaf0" ${SW2}/><rect x="64" y="70" width="12" height="12" fill="#fffaf0" ${SW2}/><path d="M66 28l5-7 5 7z" fill="#f2c46b"/>` },
    grille: { n: '鏤空卡', d: '列車長的祕密卡片，開著四個方洞，洞旁邊編著 1～4 號。蓋在寫滿字的紙上轉一轉，就能讀出藏起來的話。', ic: () => `<rect x="18" y="18" width="64" height="64" rx="4" fill="#5a3a2a" ${SW}/>${[[24, 24], [56, 30], [30, 58], [60, 62]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="14" height="14" fill="#fffaf0" ${SW2}/>` + A.txt(x - 2, y - 2, i + 1, 9, '#f2c46b', 'middle', 900)).join('')}<path d="M45 24l5-6 5 6z" fill="#f2c46b"/>` },
    blanket: { n: '格子毛毯', d: '暖呼呼的紅綠格子毛毯，上面繡著「藍色特快」。', ic: () => `<path d="M14 34q36-14 72 0v40q-36 12-72 0z" fill="#c4502c" ${SW}/><path d="M14 46q36-12 72 0M14 60q36-12 72 0M32 30v52M50 28v54M68 30v52" stroke="#3f7a4a" stroke-width="5" opacity=".75"/><path d="M14 74l-4 8M24 77l-2 8M76 77l2 8M86 74l4 8" stroke="#c4502c" stroke-width="3"/>` },
    punch: { n: '打孔器', d: '列車長剪票用的黃銅打孔器，一按就會在紙卡上打出一個圓洞。', ic: () => `<g transform="rotate(-25 50 50)"><path d="M26 30h40q10 0 10 10v6H26z" fill="url(#brass)" ${SW}/><path d="M26 54h50v6q0 10-10 10H26z" fill="url(#brass)" ${SW}/><path d="M26 30q-12 0-12 20t12 20" fill="none" ${SW}/><circle cx="64" cy="50" r="5" fill="#4a3222"/></g>` },
  });

  const lockers = s => { // 南邊的行李櫃（兩排三格）
    let o = `<g filter="url(#ds)"><rect x="300" y="150" width="400" height="330" rx="10" fill="#6a4228" ${SW}/><rect x="300" y="150" width="400" height="330" rx="10" fill="url(#p-grainV)"/>`;
    for (let i = 0; i < 6; i++) {
      const x = 318 + (i % 3) * 124, y = 168 + ((i / 3) | 0) * 150, open = s.boxOpen && i === V(s).box;
      o += open ? `<rect x="${x}" y="${y}" width="116" height="140" rx="6" fill="#2a1a10" ${SW2}/><rect x="${x}" y="${y}" width="116" height="20" fill="url(#aoDn)"/>` + (s.punch ? '' : `<g transform="translate(${x + 20} ${y + 40}) scale(.75)">${ITEMS.punch.ic()}</g>`) + `<path d="M${x} ${y}l-24 10v130l24-10" fill="#9a6a3a" ${SW2}/>`
        : `<rect x="${x}" y="${y}" width="116" height="140" rx="6" fill="#9a6a3a" ${SW2}/><rect x="${x}" y="${y}" width="116" height="140" rx="6" fill="url(#p-grainV)"/><rect x="${x}" y="${y}" width="116" height="140" rx="6" fill="url(#bevel)"/><rect x="${x + 10}" y="${y + 10}" width="96" height="120" rx="4" fill="none" stroke="#4a3222" stroke-opacity=".3" stroke-width="1.5"/><path d="M${x + 20} ${y + 92}h76M${x + 20} ${y + 102}h76M${x + 20} ${y + 112}h76" stroke="#4a3222" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>`;
      o += `<circle cx="${x + 58}" cy="${y + 42}" r="22" fill="#f4ead8" ${SW2}/>` + A.txt(x + 58, y + 52, NUM[i], 26, '#6a3e22', 'middle', 900, 'font-family="Noto Serif TC,serif"') + (open ? '' : `<rect x="${x + 96}" y="${y + 62}" width="10" height="20" rx="3" fill="url(#brass)" ${SW2}/>`);
    }
    return o + A.txt(500, 140, '行 李 櫃', 18, '#6a3e22', 'middle', 900) + `</g>`;
  };
  const notice = (x, y, s, big) => { // 北邊牆上的告示（4×4 的字）
    const G0 = V(s).gr, cs = big ? 40 : 30;
    let o = `<g filter="url(#ds)"><rect x="${x}" y="${y}" width="${cs * 4 + 30}" height="${cs * 4 + 64}" rx="4" fill="#fffaf0" ${SW}/><rect x="${x}" y="${y}" width="${cs * 4 + 30}" height="${cs * 4 + 64}" rx="4" fill="url(#p-noise)"/>${A.pin(x + (cs * 4 + 30) / 2, y + 8)}`;
    o += A.txt(x + (cs * 4 + 30) / 2, y + 34, '旅客須知', 15, '#c4502c', 'middle', 900);
    G0.grid.forEach((ch, i) => o += A.txt(x + 15 + (i % 4) * cs + cs / 2, y + 48 + ((i / 4) | 0) * cs + cs * 0.72, ch, cs * 0.7, '#3a2a1e', 'middle', 900, 'font-family="Noto Serif TC,serif"'));
    return o + `</g>`;
  };
  const punchLock = (x, y, s) => `<g filter="url(#ds)"><rect x="${x}" y="${y}" width="110" height="150" rx="10" fill="url(#brass)" ${SW}/><rect x="${x + 12}" y="${y + 14}" width="86" height="86" rx="4" fill="${s.nono_door_ok ? '#d8eccd' : '#f4ead8'}" ${SW2}/>${[0, 1, 2, 3, 4].map(i => [0, 1, 2, 3, 4].map(j => `<circle cx="${x + 22 + j * 16.5}" cy="${y + 24 + i * 16.5}" r="4.5" fill="${s.nono_door_ok && PICS[V(s).pic].sol[i][j] ? '#3a2a1e' : '#e4d2b0'}"/>`).join('')).join('')}<rect x="${x + 30}" y="${y + 112}" width="50" height="10" rx="3" fill="#4a3222"/><circle cx="${x + 55}" cy="${y + 138}" r="6" fill="${s.nono_door_ok ? '#6fd08a' : '#e0504a'}" ${SW2}/></g>`;

  ROOMS.push({
    id: 'r11', no: 11, ch: 1, arc: 2, name: '藍色特快', en: 'THE BLUE EXPRESS', mood: 'warm', par: 720, walls: ['w', 'n', 'e', 's'],
    init: () => ({}),
    canon: CANON, pics: PICS,
    vary: r => gen(r, false),
    note: { v: 'e', x: 905, y: 150, s: 0.8 },
    intro: [
      { big: 1, t: '第二部　海港鐘塔之旅' },
      '時光寶盒裡的照片上，十歲的一鳴站在一座好高好高的鐘塔前面。照片背面寫著：「海港市・師傅的鐘塔」。',
      { w: 'gp', e: 'c', t: '「那是我師傅蓋的鐘塔。我離開海港市以後，聽說它就再也沒響過了……」' },
      { w: 'gp', e: 'h', t: '「走吧！就用大衣口袋裡那張 10:45 的車票。我們去讓它再響一次！」' },
      { t: '「嗚──」藍色特快開動了。爺爺坐下來沒多久，就打起了呼嚕。', sfx: 'step' },
      { w: 'mochi', t: '喵！', sfx: 'meow' },
      '麻糬突然從座位上跳下去，一溜煙鑽過了車廂盡頭的門縫──往後面的行李車跑掉了！',
      '可是那扇門鎖著，門邊有一個奇怪的「打孔鎖」。先在車廂裡找找線索吧。',
    ],
    outro: [
      { t: '「喀啦、喀啦……叮！」打孔卡被吃了進去，門鎖的小燈變成了綠色。', sfx: 'chime' },
      { t: '滑門「刷」地打開，一陣冷風吹進來，後面是堆滿貨箱的行李車。', sfx: 'door' },
      { w: 'mochi', t: '喵嗚～（好遠的地方）', sfx: 'meow' },
    ],
    views: {
      w: {
        draw: s => A.wall(WALL) + TR.ceiling() + TR.window(110, 120, 220, 190) + TR.window(640, 120, 220, 190) + TR.straps([240, 760], 70) + TR.rack(80, 96, 840) +
          TR.seat(80, 500, 230, '#3f6a5a') + TR.seat(690, 500, 230, '#3f6a5a') +
          // 靠窗小桌、茶杯、報紙
          `<g filter="url(#ds)"><rect x="400" y="388" width="200" height="16" rx="5" fill="#8c5634" ${SW}/><rect x="400" y="388" width="200" height="16" rx="5" fill="url(#p-grainH)"/><path d="M500 404v90" stroke="#4a3222" stroke-width="8"/><path d="M470 494h60" stroke="#4a3222" stroke-width="6" stroke-linecap="round"/></g>` + Deco.teapot(440, 386, '#6f9fb8') + `<rect x="520" y="370" width="60" height="18" rx="2" fill="#f4ead8" ${SW2}/><path d="M526 376h48M526 382h36" stroke="#9aa" stroke-width="2"/>` +
          // 座椅背後的置物袋
          (s.cardA ? '' : `<path d="M300 344l18-4 4 22-18 4z" fill="#5a3a2a" ${SW2}/><rect x="305" y="349" width="6" height="6" fill="#fffaf0"/>`) + `<path d="M284 356h52l-4 84q-22 8-44 0z" fill="#8c5634" ${SW}/><path d="M284 356h52l-4 84q-22 8-44 0z" fill="url(#p-grainH)" opacity=".6"/><path d="M286 358h48l-3 22q-21 8-42 0z" fill="#a8703f" ${SW2}/><path d="M290 384q20 6 40 0M289 434q21 6 42 0" stroke="#e9d6a8" stroke-width="1.2" stroke-dasharray="3 3" fill="none"/><circle cx="310" cy="380" r="3.5" fill="url(#brass)" ${SW2}/>` + gpDraw(s) +
          lt(s),
        hot: s => [
          { id: 'gp', r: [690, 230, 230, 230], on: C => onGp(C), use: { blanket: C => { C.take('blanket'); s.blanket = 1; Snd.play('page'); G.toast('你輕輕幫爺爺蓋上毛毯。爺爺在夢裡笑了笑，手鬆開了──掉下來半張卡片！'); C.give('cardB'); } } },
          { id: 'pocket', r: [280, 340, 60, 110], on: C => { if (!s.cardA) { s.cardA = 1; C.give('cardA'); G.toast('座椅背後的置物袋裡，有半張深色的卡片。'); } else G.toast('置物袋裡只剩一份鐵路地圖。'); } },
          { id: 'table', r: [400, 360, 200, 50], on: () => G.read('車上的小報', '藍色特快　今日停靠站\n小鎮站 10:45 → 燈塔站 11:10 → 海港市 11:40\n\n<b>列車長的小遊戲</b>\n「旅客須知」上藏著一句話，\n拿我的<b>鏤空卡</b>蓋上去，\n讓卡片上的「▲ 車頭」轉來轉去，\n照著洞旁邊的編號 1、2、3、4 讀，\n就讀得出來喔！\n\n（鏤空卡被我撕成兩半，藏在車廂裡了，哈哈。──唐列車長）') },
          { id: 'win1', r: [110, 120, 220, 190], t: '窗外的田野和小樹一直往後跑。' },
        ],
      },
      n: {
        draw: s => A.wall(WALL) + TR.ceiling() + TR.endDoor(420, 160, 160, 330, { open: s.nono_door_ok, label: '行李車 →' }) + notice(120, 150, s) + punchLock(640, 250, s) +
          `<g filter="url(#ds)"><rect x="770" y="300" width="130" height="190" rx="8" fill="#9aa6b0" ${SW}/><rect x="782" y="314" width="106" height="80" rx="6" fill="#cfe6f4" ${SW2}/><rect x="782" y="314" width="106" height="80" rx="6" fill="url(#glassR)"/><circle cx="835" cy="440" r="12" fill="url(#silver)" ${SW2}/>${A.txt(835, 470, '飲水機', 13, '#2a3a4a', 'middle', 900)}</g>` + lt(s),
        hot: s => [
          { id: 'notice', r: [110, 140, 170, 230], on: C => onNotice(C), use: { grille: C => onNotice(C, true) } },
          { id: 'lock', r: [630, 240, 130, 170], on: C => onLock(C), use: { punch: C => { s.punchIn = 1; Snd.play('click'); onLock(C); } } },
          { id: 'door', r: [400, 140, 200, 350], on: C => { if (s.nono_door_ok) { s.left = 1; C.win(); } else G.toast('通往行李車的滑門鎖得緊緊的。門縫底下，傳來麻糬的叫聲……'); } },
          { id: 'water', r: [770, 300, 130, 190], t: '冰涼的飲水機。喝口水，冷靜一下再想想。' },
        ],
      },
      e: {
        draw: s => A.wall(WALL) + TR.ceiling() + TR.window(110, 120, 220, 190) + TR.window(390, 120, 220, 190, { blind: 70 }) + TR.window(670, 120, 220, 190) + TR.rack(80, 96, 840) + TR.straps([250, 500, 750], 70) +
          (s.blanket ? '' : s.blanketTaken ? '' : `<g transform="translate(560 30) scale(.9)">${ITEMS.blanket.ic()}</g>`) + `<g transform="translate(220 40) scale(1.1)"><rect x="0" y="20" width="90" height="40" rx="6" fill="#a8703f" ${SW}/><rect x="30" y="12" width="30" height="10" rx="4" fill="#6a4228" ${SW2}/></g>` +
          TR.seat(120, 500, 260, '#7a3a4a') + TR.seat(620, 500, 260, '#7a3a4a') + lt(s),
        hot: s => [
          { id: 'rackE', r: [520, 40, 160, 90], on: C => { if (!s.blanketTaken) { s.blanketTaken = 1; C.give('blanket'); } else G.toast('行李架上空空的。') } },
          { id: 'suitcase', r: [220, 40, 110, 90], t: '爺爺的皮箱，裡面裝著修鐘的工具，用皮帶綁得好好的。' },
          { id: 'seatE', r: [120, 290, 760, 210], t: '空著的座位。絨布座椅曬著太陽，暖暖的。' },
        ],
      },
      s: {
        draw: s => A.wall(WALL) + TR.ceiling() + lockers(s) + `<g filter="url(#ds)"><rect x="90" y="160" width="140" height="330" rx="6" fill="#8c5634" ${SW}/><rect x="90" y="160" width="140" height="330" rx="6" fill="url(#p-grainV)"/><rect x="108" y="184" width="104" height="110" rx="8" fill="#cfe6f4" ${SW2}/><rect x="108" y="184" width="104" height="110" rx="8" fill="url(#glassR)"/>${A.txt(160, 330, '← 1 號車', 14, '#fff3dc', 'middle', 900)}</g>` +
          `<g filter="url(#ds)"><rect x="770" y="260" width="140" height="230" rx="8" fill="#4f6a7a" ${SW}/><rect x="782" y="274" width="116" height="60" rx="4" fill="#2a3a4a"/>${A.txt(840, 300, '下一站', 12, '#f2c46b', 'middle', 700)}${A.txt(840, 324, '燈塔站', 18, '#fff', 'middle', 900)}<path d="M790 360h100M790 380h100M790 400h100" stroke="#2a3a4a" stroke-width="3"/>${A.txt(840, 450, '資訊板', 13, '#fff3dc', 'middle', 900)}</g>` + lt(s),
        hot: s => [
          ...[0, 1, 2, 3, 4, 5].map(i => ({ id: 'box' + i, r: [318 + (i % 3) * 124, 168 + ((i / 3) | 0) * 150, 116, 140], on: C => onBox(C, i) })),
          { id: 'backDoor', r: [90, 160, 140, 330], t: '往前面車廂的門。爺爺還在這節車廂睡覺，先別走遠。' },
          { id: 'info', r: [770, 260, 140, 230], t: '資訊板：下一站，燈塔站。' },
        ],
      },
    },
    steps: [
      { goal: '找到半張卡片', done: s => s.cardA, h: ['座位附近的小地方找找看。', '西邊左邊座椅的背後有一個置物袋。', '點西邊左邊座椅背後的置物袋。'] },
      { goal: '幫爺爺蓋毛毯', done: s => s.blanket, h: ['爺爺睡著了，手裡好像握著什麼。車廂有點冷……', '東邊的行李架上有一條毛毯。', '拿東邊行李架上的毛毯，再拿著毛毯點西邊的爺爺。'] },
      { goal: '拼好鏤空卡', done: s => s.hasGrille, h: ['兩張半張的卡片，形狀剛好可以拼起來。', '點一張半張卡片，再點另一張就能組合。', '把「半張卡片（左）」和「半張卡片（右）」組合成鏤空卡。'] },
      { goal: '讀出告示裡的話', done: s => s.gr_notice_ok, h: ['西邊小桌上的小報說：把鏤空卡蓋在「旅客須知」上。', '拿著鏤空卡點北邊的告示。轉一轉卡片，照洞旁的 1～4 號順序讀，找出一句有意思的話。', s => `轉到洞裡讀出「${PHRASE(s)}」的那一面就對了。`] },
      { goal: '打開對的行李櫃', done: s => s.punch, h: [s => `告示說「${PHRASE(s)}」。`, '南邊有六格行李櫃，上面寫著一到六。', s => `點南邊的第 ${NUM[V(s).box]} 格行李櫃，拿到打孔器。`] },
      { goal: '打開往行李車的門', done: s => s.nono_door_ok, h: ['北邊門邊的打孔鎖，要用打孔器在卡片上打洞。', '每一排、每一行旁邊的數字，是那一排「連在一起的洞」有幾個。例如「1 1」＝一個洞、空格、再一個洞。先從數字最大（5）的排開始。', s => '照這個圖打洞（● 是洞）：\n' + PICS[V(s).pic].sol.map(r => r.map(v => v ? '●' : '○').join('')).join('\n')] },
      { goal: '去行李車找麻糬', done: s => s.left, h: ['門打開了！', '點北邊打開的門。', '點北邊的門，走進行李車。'] },
    ],
    combos: [{ a: 'cardA', b: 'cardB', f: C => { C.take('cardA'); C.take('cardB'); C.s.hasGrille = 1; C.give('grille', true); Snd.play('combine'); G.toast('兩半卡片拼在一起，變成了「<b>鏤空卡</b>」！'); } }],
  });
  function lt() { return A.light(); }
  // 睡著的爺爺（坐在右邊的座位；前面再畫一次椅墊，才像坐在椅子上）
  function gpDraw(s) {
    const front = `<rect x="684" y="438" width="242" height="40" rx="14" fill="#5a8a7a" ${SW}/><rect x="684" y="438" width="242" height="40" rx="14" fill="url(#p-knit)"/>` +
      (s.blanket ? `<g transform="translate(0 40) scale(1 .82)" style="transform-origin:810px 476px"><path d="M716 372q90-24 180 0l10 104q-100 14-200 0z" fill="#c4502c" ${SW}/><path d="M716 400q95-20 190 0M714 432q96-18 192 0M752 366v110M796 362v116M840 362v116M884 366v110" stroke="#3f7a4a" stroke-width="6" opacity=".7"/><path d="M716 372q90-24 180 0l10 104q-100 14-200 0z" fill="url(#foldG)" opacity=".7"/></g>` : `<g transform="translate(800 418) rotate(12)"><path d="M-14-12h28v24h-28z" fill="#5a3a2a" ${SW2}/><rect x="-6" y="-4" width="7" height="7" fill="#fffaf0"/></g><ellipse cx="790" cy="428" rx="18" ry="10" fill="#f6d2b0" ${SW2}/>`);
    A.person('gp', 708, 250, 0.98, { e: 'h', d: 5.2, front });
    A.fx(`<g class="zz" style="${A.ad(3)}">${A.txt(900, 250, 'z', 22, '#8a7ab0', 'middle', 900)}</g>`);
    A.fx(`<g class="zz" style="animation-delay:-1.4s">${A.txt(920, 226, 'Z', 26, '#8a7ab0', 'middle', 900)}</g>`);
    return '';
  }
  function onGp(C) {
    const s = C.s;
    if (!s.blanket) { G.dlg([{ w: 'gp', e: 'h', t: '「呼……呼……（爺爺睡得好熟）」' }, '爺爺的手裡緊緊握著半張深色的卡片。他好像有點冷，縮著肩膀。']); return; }
    G.dlg([{ w: 'gp', e: 'h', t: '「呼……師傅……鐘塔……（說夢話）」' }]);
  }
  function onNotice(C, withCard) {
    const s = C.s;
    if (s.gr_notice_ok) { G.read('旅客須知', `用鏤空卡讀出來的話：\n\n<b>「${PHRASE(s)}」</b>`); return; }
    if (!withCard) { G.read('旅客須知', '紙上排著十六個字，四個一排：\n\n' + [0, 1, 2, 3].map(r => V(s).gr.grid.slice(r * 4, r * 4 + 4).join('　')).join('\n') + '\n\n亂七八糟的，讀不出意思。'); return; }
    W.grille(C, { id: 'notice', g: V(s).gr, phrase: PHRASE(s), title: '旅客須知＋鏤空卡', sub: '按按鈕轉動卡片。照著洞旁邊的編號 <b>1 → 2 → 3 → 4</b> 讀，哪一面讀得出意思？', ok: () => G.toast(`告示上藏著一句話：「<b>${PHRASE(s)}</b>」`) });
  }
  function onBox(C, i) {
    const s = C.s;
    if (i !== V(s).box) { G.toast(s.gr_notice_ok ? `第 ${NUM[i]} 格塞滿了別人的行李。` : '六格行李櫃都塞滿了東西。要找的到底是哪一格呢？'); return; }
    if (!s.gr_notice_ok) { G.toast('六格行李櫃都塞滿了東西。要找的到底是哪一格呢？'); return; }
    if (!s.boxOpen) { s.boxOpen = 1; Snd.play('open'); G.toast(`打開第 ${NUM[i]} 格行李櫃，裡面有一把黃銅的打孔器！`); return; }
    if (!s.punch) { s.punch = 1; C.give('punch'); return; }
    G.toast('行李櫃裡空空的。');
  }
  function onLock(C) {
    const s = C.s;
    if (s.nono_door_ok) { G.toast('門鎖的小燈是綠色的，門開了。'); return; }
    if (!s.punchIn) { G.read('打孔鎖', '門鎖上插著一張空白的打孔卡，卡片旁邊印著一排一排的數字。\n\n「請依照數字在卡片上打孔」\n\n要用打孔器才打得出洞。'); return; }
    const P = PICS[V(s).pic];
    W.nono(C, { id: 'door', sol: P.sol, title: '打孔鎖', sub: '每一排左邊、每一行上面的數字，是那一排<b>連在一起的洞有幾個</b>（「2 1」＝先連著兩個洞，空一格以上，再一個洞）。點格子打洞，再點一次補回去。', okMsg: `打孔卡上出現了一個「${P.n}」！`, ok: () => { Snd.play('door'); G.toast('「叮！」門鎖的燈變綠了，滑門打開了。'); } });
  }
})();
