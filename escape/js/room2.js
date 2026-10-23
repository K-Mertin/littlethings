'use strict';
// 第 2 章：書房
(() => {
  const WALL = { c: '#4f7a5e', pat: 'stripe', wain: '#7a4a2a', trim: '#f3e2c4', floor: 'wood', fc: ['#a8703f', '#93602f'] };
  const POEM = ['山高見飛鷹', '窗前貓兒睡', '書中有黃金', '燈火照夜讀', '頭上滿天星'];
  const COL = ['#d9473a', '#4f9e5a', '#3f6fc4', '#f2c232'], CN = ['紅', '綠', '藍', '黃'];
  // 標準答案：小鳥由左到右的顏色（索引）、四色書的數字
  const CANON = { birds: [0, 1, 2, 3], num: [7, 2, 9, 5] };
  const V = s => (s && s.v) || CANON;
  const code = s => V(s).birds.map(k => V(s).num[k]).join('');

  Object.assign(ITEMS, {
    keyBow: { n: '鑰匙柄', d: '一把鑰匙的「握柄」部分，前端斷掉了，接口是一個小小的卡榫。', ic: () => `<circle cx="34" cy="50" r="20" fill="url(#brass)" ${SW}/><circle cx="34" cy="50" r="8" fill="#fbf1df" ${SW2}/><path d="M54 45h16v10H54z" fill="url(#brass)" ${SW}/><path d="M70 42l8 8-8 8z" fill="#c9a14a" ${SW2}/>` },
    keyBit: { n: '鑰匙頭', d: '一把鑰匙的「齒」的部分，後面有一個缺口，好像能和什麼接起來。', ic: () => `<path d="M22 44h16l-6 6 6 6H22z" fill="#c9a14a" ${SW2}/><path d="M38 45h40v10h-6v12h-7V55h-5v8h-7v-8H38z" fill="url(#brass)" ${SW}/>` },
    studyKey: { n: '書房鑰匙', d: '鑰匙柄和鑰匙頭接起來，變成一把完整的鑰匙了！', ic: () => IC.key() },
  });
  Object.assign(MEMO, {
    m3: { t: '第二章 · 綠墨水鋼筆', d: '書桌抽屜裡有一支<b>綠墨水鋼筆</b>，筆桿刻著「鐘一鳴專用」。墨水瓶的標籤寫著：「爺爺特調薄荷綠──全世界只有這一瓶」。' },
  });

  const birdsArt = (st) => {
    let s = `<rect width="300" height="300" fill="#bfe6f2"/><circle cx="240" cy="60" r="34" fill="#fff3c0"/><path d="M0 230q80-30 150 0t150 0v70H0z" fill="#9fd08a"/><path d="M-10 175q160-40 320 10" stroke="#7a4a2a" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M60 162q-10-30 10-40M210 172q20-30 0-50" stroke="#7a4a2a" stroke-width="5" fill="none"/><ellipse cx="70" cy="118" rx="16" ry="10" fill="#6fae5a"/><ellipse cx="212" cy="118" rx="14" ry="9" fill="#6fae5a"/>`;
    V(st).birds.map(k => COL[k]).forEach((c, i) => {
      const x = 45 + i * 70, y = 150 - (i % 2) * 6;
      s += `<g transform="translate(${x} ${y})"><path d="M-22 6q-6 18 10 20" fill="${shade(c, -0.2)}" ${SW2}/><ellipse cx="0" cy="0" rx="24" ry="20" fill="${c}" ${SW}/><circle cx="12" cy="-14" r="13" fill="${c}" ${SW}/><circle cx="16" cy="-16" r="3" fill="#2a1a10"/><path d="M24 -14l10 3-10 4z" fill="#f2a23a" ${SW2}/><path d="M-10 0q8 12 18 4" fill="none" stroke="${shade(c, -0.3)}" stroke-width="3"/><path d="M-4 18v8M6 18v8" ${SW2}/></g>`;
    });
    return s + `<rect x="10" y="10" width="280" height="280" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="4"/>`;
  };
  const grid = (x, y, cell, s) => {
    let o = `<rect x="${x - cell * 0.9}" y="${y - cell * 0.9}" width="${cell * 6.2}" height="${cell * 6.2}" rx="8" fill="#f8efdc" ${SW}/>`;
    'ABCDE'.split('').forEach((L, i) => o += A.txt(x + cell * (i + 0.5), y - cell * 0.25, L, cell * 0.42, '#c4502c', 'middle', 900, 'font-family="serif"'));
    for (let r = 0; r < 5; r++) {
      o += A.txt(x - cell * 0.45, y + cell * (r + 0.66), r + 1, cell * 0.42, '#c4502c', 'middle', 900, 'font-family="serif"');
      for (let c = 0; c < 5; c++) o += `<rect x="${x + c * cell}" y="${y + r * cell}" width="${cell}" height="${cell}" fill="none" stroke="#c9a87f" stroke-width="1.5"/>` + A.txt(x + cell * (c + 0.5), y + cell * (r + 0.72), POEM[r][c], cell * 0.62, '#2a1a10', 'middle', 900, 'font-family="Noto Serif TC,serif"');
    }
    return o;
  };
  const desk = (s) => {
    let o = A.sh(500, 478, 300, 16);
    o += `<rect x="230" y="300" width="80" height="176" rx="4" fill="#7a4a2a" ${SW}/><rect x="690" y="300" width="80" height="176" rx="4" fill="#7a4a2a" ${SW}/>`;
    o += `<path d="M200 300L226 276H774L800 300z" fill="#a8703f" ${SW}/><rect x="200" y="296" width="600" height="26" rx="4" fill="#8c5634" ${SW}/>`;
    o += `<rect x="380" y="322" width="240" height="70" rx="4" fill="${s.drawerOpen ? '#3b2a1f' : '#9a6038'}" ${SW}/>`;
    if (s.drawerOpen) { o += `<path d="M370 392h260l-20 40H390z" fill="#9a6038" ${SW}/>`; if (!s.bowTaken) o += `<g transform="translate(440 376) scale(.5)">${ITEMS.keyBow.ic()}</g>`; o += `<path d="M520 384l60-14" stroke="#2f7d4f" stroke-width="8" stroke-linecap="round"/>`; }
    else { o += `<rect x="440" y="342" width="120" height="32" rx="6" fill="#3b2a1f" ${SW2}/>${[0, 1, 2].map(i => `<rect x="${448 + i * 38}" y="347" width="30" height="22" rx="3" fill="#fbf1df"/>` + A.txt(463 + i * 38, 365, '？', 16, '#7a4a2a')).join('')}`; }
    o += `<rect x="248" y="330" width="44" height="40" rx="3" fill="#9a6038" ${SW2}/><rect x="708" y="330" width="44" height="40" rx="3" fill="#9a6038" ${SW2}/>`;
    o += A.pool(300, 286, 120, 26, 0.7) + A.lamp(300, 276, '#e9a85a') + A.paper(520, 252, 80, 30, -6, '#fffdf3', 2) + A.sparkle(600, 250, 0.7);
    o += `<rect x="640" y="250" width="70" height="26" rx="3" fill="#c9583c" ${SW2}/><rect x="650" y="228" width="60" height="22" rx="3" fill="#3f7f8f" ${SW2}/><path d="M410 276v-26h40v26" fill="#4f7a5e" ${SW2}/><path d="M418 250v-20M430 250v-28M442 250v-16" stroke="#2f7d4f" stroke-width="3"/>`;
    return o;
  };
  const shelfArt = (sc, s) => {
    let o = `<rect x="40" y="40" width="420" height="440" rx="6" fill="#7a4a2a" ${SW}/><rect x="56" y="56" width="388" height="408" fill="#5a3420"/>`;
    const muted = ['#b9956a', '#8c6a4a', '#a88a6a', '#c9a87f', '#9a7a5a', '#7a5a40'];
    const N = V(s).num;
    const rows = [[['#f2c232', N[3]], 3], [['#d9473a', N[0]], 6], [['#3f6fc4', N[2]], 1, ['#4f9e5a', N[1]]]];
    for (let r = 0; r < 3; r++) {
      const y = 70 + r * 136;
      let x = 64, k = 0;
      const special = rows[r];
      const places = r === 2 ? [1, 6] : [special[1]];
      for (let i = 0; i < 9; i++) {
        let col = muted[(i + r * 2) % muted.length], num;
        if (places.includes(i)) { const sp = r === 2 ? (i === 1 ? special[0] : special[2]) : special[0]; col = sp[0]; num = sp[1]; }
        const w = num ? 40 : 30 + ((i * 7 + r) % 3) * 6, h = num ? 112 : 92 + ((i * 5 + r) % 3) * 8;
        o += A.book(x, y + 118 - h, w, h, col, num ? { num } : {}); x += w + 3; k++;
        if (x > 420) break;
      }
      o += `<rect x="56" y="${y + 118}" width="388" height="14" fill="#a8703f" ${SW2}/>`;
    }
    return `<g transform="scale(${sc})">${o}</g>`;
  };
  const globe = (x, y, sc, s) => `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 0, 90, 12)}<path d="M-60 0h120l-20-20h-80z" fill="#7a4a2a" ${SW}/><path d="M0-20v-60" stroke="#7a4a2a" stroke-width="16"/><rect x="-44" y="-96" width="88" height="40" rx="8" fill="#9a6038" ${SW}/>${[0, 1, 2, 3].map(i => `<rect x="${-38 + i * 20}" y="-88" width="16" height="24" rx="3" fill="#fbf1df" ${SW2}/>`).join('')}<path d="M-95-200a95 95 0 0 1 190 0" fill="none" stroke="url(#brass)" stroke-width="10"/><path d="M-95-200a95 95 0 0 1 190 0" fill="none" ${SW2}/>
    <circle cx="0" cy="-200" r="82" fill="${s.globeOpen ? '#3b2a1f' : '#6fb6d8'}" ${SW}/>${s.globeOpen ? (s.bitTaken ? '' : `<circle cx="0" cy="-200" r="50" fill="url(#lampG)"/>` + A.gear(-20, -196, 22) + `<g transform="translate(-12 -230) scale(.5)">${ITEMS.keyBit.ic()}</g>`) + `<path d="M-82-200a82 82 0 0 1 164 0" fill="#6fb6d8" ${SW} transform="rotate(-50 -82 -200)"/>` : `<path d="M-50-250q30 10 40 40t-20 40q-30-10-26-40zM20-260q40 0 50 30t-10 50q-30 0-40-30z" fill="#8fc77a" ${SW2}/><path d="M-82-200h164" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`}</g>`;

  ROOMS.push({
    id: 'r2', no: 2, name: '書房', en: 'THE STUDY', mood: 'warm', par: 660, walls: ['n', 'e', 's', 'w'],
    init: () => ({ slide_birds: W.slideRandom() }),
    canon: CANON,
    vary: r => { let b; do { b = shuffle([0, 1, 2, 3], r); } while (b.join() === '0,1,2,3'); return { birds: b, num: shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], r).slice(0, 4) }; },
    note: { v: 's', x: 150, y: 126, s: 0.85 },
    intro: [
      '書房裡堆滿了書，空氣裡有墨水和舊紙的味道。',
      { w: 'mochi', t: '喵嗚。', sfx: 'meow' },
      '麻糬跳上扶手椅，把自己捲成一顆白白的糯米糰。',
      '身後的門又「喀嚓」鎖上了。看來每個房間都得解開謎題才能離開。',
    ],
    outro: [
      { t: '鑰匙轉了半圈，門「咿呀」一聲開了。', sfx: 'door' },
      '走廊盡頭，一片溫暖的陽光透過玻璃灑進來──是爺爺的溫室。',
    ],
    views: {
      n: {
        draw: s => A.wall(WALL) + A.win(400, 90, 200, 150, { curtain: '#c9583c' }) + desk(s) + A.frame(110, 120, 110, 140, `<rect width="100" height="100" fill="#f3e2c4"/><circle cx="50" cy="38" r="20" fill="#f6d2b0"/><path d="M28 34q22-30 44 0" fill="#f4f1ea"/><circle cx="42" cy="38" r="6" fill="none" stroke="#4a3222" stroke-width="2"/><circle cx="58" cy="38" r="6" fill="none" stroke="#4a3222" stroke-width="2"/><path d="M20 100q30-46 60 0z" fill="#4f8a5a"/>`) + A.txt(165, 296, '鐘一鳴', 16, '#f3e2c4') + A.plant(880, 480, 1.1, '#c9583c') + A.light(),
        hot: s => [
          { id: 'note', r: [500, 220, 130, 70], on: () => { s.readNote = 1; G.read('桌上的便條', '抽屜密碼：\n\n<b style="font-size:24px;letter-spacing:.2em">C2 · A5 · E1</b>\n\n（先看上面的字母，再看左邊的數字。）'); } },
          { id: 'drawer', r: [370, 316, 260, 120], on: C => { if (!s.drawerOpen) W.wheels(C, { id: 'drawer', title: '抽屜的文字鎖', sub: '三個轉輪，每個都刻著不同的字。', wheels: [{ vals: ['狐', '貓', '狗', '熊', '鹿', '兔'], kind: 'txt' }, { vals: ['尾', '耳', '頭', '腳', '眼', '牙'], kind: 'txt' }, { vals: ['鵝', '雞', '鷹', '鴨', '燕', '鳥'], kind: 'txt' }], check: (i, v) => v.join('') === '貓頭鷹', ok: () => { s.drawerOpen = 1; G.toast('「貓頭鷹」！抽屜打開了。'); } }); else if (!s.bowTaken) { s.bowTaken = 1; C.give('keyBow'); G.memoAdd('m3'); G.toast('拿到「<b>鑰匙柄</b>」。抽屜裡還有一支綠色的鋼筆……'); } else G.read('綠墨水鋼筆', '筆桿上刻著「鐘一鳴專用」。\n旁邊的墨水瓶寫著：\n「爺爺特調薄荷綠──全世界只有這一瓶」。', 'green'); } },
          { id: 'portrait', r: [96, 106, 138, 168], t: '爺爺年輕時的畫像。圓眼鏡和綠背心，一點都沒變。' },
          { id: 'win', r: [390, 80, 220, 160], t: '窗外的天空藍藍的。' },
        ],
      },
      e: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${`<g transform="translate(70 10)">` + shelfArt(1, s) + '</g>'}</g>` +
          A.frame(640, 120, 220, 220, s.slide_birds_ok ? birdsArt(s) : (() => { const t = s.slide_birds || (s.slide_birds = W.slideRandom()); let o = ''; t.forEach((v, p) => { if (v === 8) { o += `<rect x="${(p % 3) * 100}" y="${((p / 3) | 0) * 100}" width="100" height="100" fill="#3b2a1f"/>`; return; } o += `<svg x="${(p % 3) * 100}" y="${((p / 3) | 0) * 100}" width="100" height="100" viewBox="${(v % 3) * 100} ${((v / 3) | 0) * 100} 100 100">${birdsArt(s)}</svg><rect x="${(p % 3) * 100}" y="${((p / 3) | 0) * 100}" width="100" height="100" fill="none" stroke="#3b2a1f" stroke-width="3"/>`; }); return o; })(), { vw: 300, vh: 300 }) +
          A.table(650, 400, 200, 74, '#8c5634') + `<path d="M690 388q-4-24 10-36h20q14 12 10 36z" fill="#e0a43a" ${SW}/>` + A.light(),
        hot: s => [
          { id: 'shelf', r: [100, 40, 440, 450], go: 'shelf' },
          { id: 'paint', r: [626, 106, 248, 248], on: C => { const bs = V(s).birds.map(k => CN[k]).join('、'); if (s.slide_birds_ok) { G.toast(`四隻小鳥排成一排：${bs}。`); return; } W.slide(C, { id: 'birds', title: '亂掉的畫', sub: '這幅畫被切成了九塊。點空格旁邊的小方塊，把畫拼回原樣。', img: () => birdsArt(s), ok: () => G.toast(`畫拼好了！枝頭上的四隻小鳥從左到右：${bs}。`), okMsg: '拼好了！' }); } },
        ],
      },
      shelf: {
        back: 'e', title: '書架',
        draw: s => A.closeBg('#4f7a5e', 'stripe') + `<g transform="translate(250 50) scale(1.05)" filter="url(#ds)">${shelfArt(1, s)}</g>` + A.light(),
        hot: s => [
          { id: 'books', r: [290, 90, 420, 440], t: '書架上大多是舊舊的咖啡色書，只有<b>四本彩色的書</b>書背上寫著大大的數字。' },
        ],
      },
      s: {
        draw: s => A.wall(WALL) + A.rug(500, 560, 300, 50, '#c9583c', '#f2c46b') + `<g filter="url(#ds)">${globe(330, 520, 1, s)}</g>` +
          `<g filter="url(#ds)"><path d="M610 480v-150q0-60 60-60h80q60 0 60 60v150z" fill="#c9583c" ${SW}/><rect x="590" y="380" width="60" height="100" rx="20" fill="#d9674c" ${SW}/><rect x="770" y="380" width="60" height="100" rx="20" fill="#d9674c" ${SW}/><rect x="640" y="400" width="140" height="56" rx="12" fill="#e07a5c" ${SW}/></g>` + A.cat(710, 400, 0.6, 'lie') +
          A.frame(640, 100, 140, 100, `<rect width="100" height="100" fill="#fbe8c0"/><path d="M10 80q20-40 40-20t40-30" stroke="#4f7a5e" stroke-width="6" fill="none"/>`) + `<path d="M150 230V470" stroke="#4a3222" stroke-width="6"/><ellipse cx="150" cy="472" rx="34" ry="9" fill="#7a4a2a" ${SW}/>` + A.lamp(150, 236, '#e9a85a') + A.light(),
        hot: s => [
          { id: 'globe', r: [220, 190, 220, 340], on: C => { if (!s.globeOpen) W.wheels(C, { id: 'globe', title: '地球儀的密碼鎖', sub: '底座的小銅牌刻著：「枝頭上的小鳥，會告訴你讀書的順序。」', wheels: [0, 1, 2, 3].map(() => ({ vals: '0123456789'.split('') })), check: (i, v) => v.join('') === code(s), ok: () => { s.globeOpen = 1; G.toast('地球儀「啪」地打開成兩半！'); } }); else if (!s.bitTaken) { s.bitTaken = 1; C.give('keyBit', true); C.give('g2', true); Snd.play('pick'); G.toast('地球儀裡有「<b>鑰匙頭</b>」和「<b>音符齒輪 Ⅱ</b>」！'); } else G.toast('地球儀裡空空的。'); } },
          { id: 'chair', r: [590, 270, 240, 210], on: () => { Snd.play('meow'); G.toast('麻糬在扶手椅上睡得正香。'); } },
        ],
      },
      w: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${grid(170, 140, 50, s)}</g>` + A.wallClock(545, 150, 32, '#7a4a2a') + `<g filter="url(#ds)">${A.door(650, 140, 200, 330, '#6f4128', { keyhole: true, open: s.doorOpen })}</g>` + A.light(),
        hot: s => [
          { id: 'grid', r: [120, 90, 300, 300], go: 'grid' },
          { id: 'door', r: [650, 140, 200, 330], on: C => { if (s.doorOpen) C.win(); else G.toast('門鎖著，鎖孔是一般鑰匙的形狀。'); }, use: { studyKey: C => { C.take('studyKey'); s.doorOpen = 1; Snd.play('door'); C.win(); } } },
        ],
      },
      grid: {
        back: 'w', title: '格子詩',
        draw: s => A.closeBg('#4f7a5e', 'stripe') + `<g filter="url(#ds)">${grid(330, 110, 86, s)}</g>` + A.light(),
        hot: s => [{ id: 'poem', r: [260, 40, 500, 500], t: '一首寫在格子裡的小詩。上面標著字母 A～E，左邊標著數字 1～5。' }],
      },
    },
    combos: [{ a: 'keyBow', b: 'keyBit', f: C => { C.take('keyBow'); C.take('keyBit'); C.give('studyKey', true); G.toast('喀！兩半接在一起，變成了「<b>書房鑰匙</b>」！'); } }],
    steps: [
      { goal: '看看書桌上有什麼', done: s => s.readNote, h: ['北邊的書桌上有一張便條。', '點書桌上的白色便條。', '便條寫著抽屜密碼：C2 · A5 · E1。'] },
      { goal: '打開書桌抽屜', done: s => s.drawerOpen, h: ['C2、A5、E1 像是座標。房間裡哪裡有字母和數字標示的格子？', '西邊牆的格子詩，上面是 A～E、左邊是 1～5。C2 就是 C 欄第 2 行的字。', '三個字是「貓」「頭」「鷹」，在抽屜鎖上轉出「貓頭鷹」。'] },
      { goal: '拿到抽屜裡的東西', done: s => s.bowTaken, h: ['抽屜打開了。', '再點一次打開的抽屜。', '點抽屜，拿到鑰匙柄。'] },
      { goal: '把亂掉的畫拼回去', done: s => s.slide_birds_ok, h: ['東邊牆的畫被切成九塊了。', '點畫打開拼圖，點空格旁的方塊就能移動。可以按「看完成的樣子」參考。', '先把最上面一排拼好，再拼左邊一欄，最後轉動右下角的四塊。'] },
      { goal: '打開地球儀', done: s => s.globeOpen, h: ['地球儀的銅牌說：小鳥會告訴你讀書的順序。', s => `畫裡的小鳥從左到右是${V(s).birds.map(k => CN[k]).join('、')}；書架上的彩色書也各有一個數字。`, s => `${V(s).birds.map(k => CN[k] + '書 ' + V(s).num[k]).join('、')}，密碼是 ${code(s)}。`] },
      { goal: '拿到地球儀裡的東西', done: s => s.bitTaken, h: ['地球儀打開了。', '再點一次地球儀。', '點打開的地球儀，拿到鑰匙頭和音符齒輪。'] },
      { goal: '離開書房', done: s => s.doorOpen, h: ['鑰匙柄和鑰匙頭好像能接起來。', '在道具欄點鑰匙柄拿在手上，再點鑰匙頭，就能組合。', '組合出書房鑰匙，拿著它點西邊的門。'] },
    ],
  });
})();
