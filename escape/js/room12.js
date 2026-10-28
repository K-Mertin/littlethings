'use strict';
// 第二部 第 2 章：行李車（找搖柄、印出電報、用摩斯電碼表解出保險箱密碼、推開貨箱救出麻糬）
(() => {
  const WALL = { c: '#b08458', pat: 'stripe', frieze: false, wain: '#6a4228', wy: 380, trim: '#c9a87a', floor: 'wood', fc: ['#8a6440', '#7a5634'], fy: 500 };
  const MORSE = ['-----', '.----', '..---', '...--', '....-', '.....', '-....', '--...', '---..', '----.'];
  // 推貨箱的盤面（事先用電腦算過最少步數：9～16 步）
  const RUSH = [
    [[2, 0, 2, 1], [4, 4, 2, 1], [0, 4, 3, 0], [3, 1, 3, 1], [4, 1, 2, 0], [5, 3, 2, 1], [0, 3, 2, 0], [4, 2, 2, 1]],
    [[2, 1, 2, 1], [2, 0, 2, 0], [3, 3, 3, 1], [3, 2, 2, 0], [0, 1, 2, 1], [5, 2, 3, 1], [1, 5, 2, 0], [0, 4, 3, 0], [4, 0, 2, 0]],
    [[2, 1, 2, 1], [4, 3, 2, 1], [1, 3, 3, 0], [0, 1, 2, 0], [1, 5, 2, 0], [3, 5, 2, 0], [3, 1, 2, 1], [5, 3, 2, 1], [2, 0, 3, 0], [4, 2, 2, 0]],
    [[2, 0, 2, 1], [4, 2, 3, 1], [0, 3, 3, 1], [2, 2, 2, 0], [2, 3, 2, 0], [5, 0, 2, 1], [3, 5, 2, 0], [1, 1, 3, 1], [1, 5, 2, 0]],
    [[2, 0, 2, 1], [0, 3, 2, 0], [4, 2, 2, 1], [1, 4, 3, 0], [3, 2, 2, 1], [0, 2, 3, 0], [4, 1, 2, 0]],
    [[2, 0, 2, 1], [3, 4, 3, 0], [3, 0, 2, 0], [0, 1, 3, 1], [4, 2, 2, 1], [4, 5, 2, 0], [3, 1, 2, 1], [0, 4, 2, 1], [1, 2, 2, 0]],
    [[2, 0, 2, 1], [4, 1, 2, 1], [0, 1, 2, 1], [3, 5, 2, 0], [5, 0, 2, 1], [1, 0, 3, 1], [1, 3, 2, 1], [1, 5, 2, 0], [2, 2, 2, 0], [3, 3, 2, 0], [3, 0, 2, 0]],
  ].map(L => L.map(([r, c, l, h]) => [r, c, l, !!h]));
  const CANON = { code: [4, 7, 2], rush: 2 };
  const V = s => (s && s.v) || CANON;
  A.KEYS.r12 = 'n';

  const mc = (d, x, y, sc = 1, col = '#3a2a1e') => { let o = '', cx = x; MORSE[d].split('').forEach(ch => { o += ch === '.' ? `<circle cx="${cx + 5 * sc}" cy="${y}" r="${4.6 * sc}" fill="${col}"/>` : `<rect x="${cx}" y="${y - 4 * sc}" width="${22 * sc}" height="${8 * sc}" rx="${4 * sc}" fill="${col}"/>`; cx += (ch === '.' ? 14 : 28) * sc; }); return { o, w: cx - x }; };
  const tapeSvg = (s, w = 560) => { // 電報紙帶：三組符號，中間用斜線隔開
    let o = `<svg class="wsvg" viewBox="0 0 ${w} 90" style="max-width:${w}px;margin:6px auto"><path d="M6 20h${w - 12}l-8 25 8 25H6l8-25z" fill="#fbf4e2" ${SW2}/><path d="M6 20h${w - 12}l-8 25 8 25H6l8-25z" fill="url(#p-noise)"/>`;
    let x = 36; V(s).code.forEach((d, i) => { const m = mc(d, x, 45, 1.25); o += m.o; x += m.w + 14; if (i < 2) { o += `<path d="M${x} 62l14-34" stroke="#c4502c" stroke-width="3" stroke-linecap="round"/>`; x += 30; } });
    return o + `</svg>`;
  };
  Object.assign(ITEMS, {
    crank: { n: '搖柄', d: '一支 L 形的黃銅搖柄，握把是木頭做的。好像是某台機器的零件。', ic: () => `<path d="M24 76V36h40" fill="none" stroke="#4a3222" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 76V36h40" fill="none" stroke="url(#brass)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><rect x="58" y="26" width="30" height="20" rx="8" fill="#a8703f" ${SW}/>` },
    tape: { n: '電報紙帶', d: s => '從電報機印出來的長紙條，上面印著點和長條，被斜線隔成三組。' + tapeSvg(s, 420), ic: () => `<path d="M10 40h80l-6 10 6 10H10l6-10z" fill="#fbf4e2" ${SW}/><circle cx="24" cy="50" r="3" fill="#3a2a1e"/><rect x="31" y="47" width="12" height="6" rx="3" fill="#3a2a1e"/><circle cx="50" cy="50" r="3" fill="#3a2a1e"/><rect x="58" y="47" width="12" height="6" rx="3" fill="#3a2a1e"/><circle cx="77" cy="50" r="3" fill="#3a2a1e"/>` },
    bar: { n: '撬棍', d: '又長又重的鐵撬棍，可以把很重的貨箱撬起來推動。', ic: () => `<g transform="rotate(-35 50 50)"><path d="M50 12v66q0 10-10 10" fill="none" stroke="#4a3222" stroke-width="12" stroke-linecap="round"/><path d="M50 12v66q0 10-10 10" fill="none" stroke="#c4502c" stroke-width="7" stroke-linecap="round"/><path d="M50 12l-6-6M50 12l6-6" stroke="#4a3222" stroke-width="5" stroke-linecap="round"/></g>` },
  });

  const lamp = () => { A.fx(`<g class="pend" style="${A.ad(5)}"><path d="M500 0v60" stroke="#3a2a22" stroke-width="3"/><path d="M478 60h44l-6 34h-32z" fill="#ffe9a0" ${SW2}/><path d="M478 60h44M482 72h36M486 84h28M500 60v34" stroke="#3a3a40" stroke-width="2.4"/><circle class="flick" cx="500" cy="84" r="120" fill="url(#lampG)"/></g>`); return ''; };
  const crates = (s, mochi) => { // 北邊地上堆得亂七八糟的貨箱
    let o = '';
    [[150, 492, 150, 110, '#b8844e'], [290, 500, 120, 90, '#a8743e'], [420, 494, 170, 80, '#c49058'], [580, 500, 130, 120, '#9a6a3a'], [180, 384, 110, 80, '#a8743e'], [600, 380, 100, 70, '#b8844e'], [720, 504, 140, 70, '#b8844e']].forEach(([x, y, w, h, c], i) => o += Deco.crate(x, y, w, h, c) + (i % 3 === 0 ? A.txt(x + w / 2, y - h / 2 + 6, ['易碎', '海港市', '郵件'][i % 3], 16, '#fff3dc', 'middle', 900, `stroke="${shade(c, -0.45)}" stroke-width="3" paint-order="stroke"`) : ''));
    if (mochi) { // 藤籃夾在貨箱中間，露出兩隻耳朵
      o += `<g transform="translate(400 412)"><path d="M-40 -6h80l-6 30h-68z" fill="#d9a85a" ${SW}/><path d="M-36 4h72M-34 14h68" stroke="#a8763a" stroke-width="2"/><path d="M-26 -6q26-34 52 0" fill="none" stroke="#8a5a2a" stroke-width="5"/></g>`;
      A.fx(`<g class="ear" style="transform-origin:400px 404px;${A.ad(5.5)}"><path d="M384 406l3-16 10 9zM416 406l-3-16-10 9z" fill="#fff8ee" ${SW2}/></g>`);
    }
    return o;
  };
  const telegraph = s => `<g filter="url(#ds)">${A.table(300, 380, 400, 110, '#7a4a2a')}</g><g filter="url(#ds)"><rect x="350" y="300" width="160" height="78" rx="8" fill="#3a3a44" ${SW}/><rect x="350" y="300" width="160" height="78" rx="8" fill="url(#bevel)"/><circle cx="390" cy="340" r="26" fill="url(#brass)" ${SW}/><circle cx="390" cy="340" r="9" fill="#5a3a24"/><circle cx="470" cy="340" r="18" fill="url(#silver)" ${SW2}/><path d="M512 336h40" stroke="#c9cfd6" stroke-width="5"/>` + (s.crankIn ? `<path d="M552 336v-30h26" fill="none" stroke="#4a3222" stroke-width="9" stroke-linecap="round"/><path d="M552 336v-30h26" fill="none" stroke="url(#brass)" stroke-width="5" stroke-linecap="round"/><rect x="574" y="296" width="24" height="16" rx="6" fill="#a8703f" ${SW2}/>` : '') +
    (s.tape ? `<path d="M350 352q-40 4-50 30t-40 30" fill="none" stroke="#fbf4e2" stroke-width="14"/><path d="M350 352q-40 4-50 30t-40 30" fill="none" stroke="#4a3222" stroke-width="1" stroke-dasharray="3 6"/>` : '') +
    `<rect x="560" y="356" width="90" height="22" rx="4" fill="#a8703f" ${SW2}/><path d="M580 356q14-30 34-2" stroke="#4a3222" stroke-width="4" fill="none"/><circle cx="614" cy="352" r="8" fill="#2a2a32" ${SW2}/></g>` + A.txt(430, 290, '鐵路電報機', 14, '#fff3dc', 'middle', 900);
  const chart = () => { let o = `<g filter="url(#ds)"><rect x="700" y="120" width="210" height="230" rx="6" fill="#fffaf0" ${SW}/><rect x="700" y="120" width="210" height="230" rx="6" fill="url(#p-noise)"/>${A.pin(805, 128)}` + A.txt(805, 152, '摩斯電碼（數字）', 15, '#c4502c', 'middle', 900); for (let d = 0; d < 10; d++) { const x = 714 + (d % 2) * 100, y = 178 + Math.floor(d / 2) * 34; const m = mc((d + 1) % 10, x + 26, y, 0.62); o += A.txt(x + 10, y + 7, (d + 1) % 10, 18, '#3a2a1e', 'middle', 900) + m.o; } return o + `</g>`; };
  const safe = s => { let o = `<g filter="url(#ds)"><rect x="560" y="210" width="260" height="280" rx="14" fill="#4a5a64" ${SW}/><rect x="560" y="210" width="260" height="280" rx="14" fill="url(#bevel)"/><rect x="560" y="210" width="260" height="280" rx="14" fill="url(#p-noise)"/>`;
    if (s.safeOpen) o += `<rect x="584" y="234" width="212" height="232" rx="8" fill="#2a2a32" ${SW2}/>` + (s.bar ? '' : `<g transform="translate(640 300) scale(1.1)">${ITEMS.bar.ic()}</g>`) + `<path d="M584 234l-60 20v200l60 12z" fill="#5a6a74" ${SW}/>`;
    else { o += `<rect x="584" y="234" width="212" height="232" rx="8" fill="#5a6a74" ${SW2}/>` + [0, 1, 2].map(i => `<rect x="${612 + i * 56}" y="300" width="44" height="60" rx="6" fill="#fffaf0" ${SW2}/>${A.txt(634 + i * 56, 340, (s.w_safe || [0, 0, 0])[i], 26, '#3a2a1e', 'middle', 900)}`).join('') + `<circle cx="690" cy="410" r="22" fill="url(#silver)" ${SW}/><path d="M690 394v32M674 410h32" stroke="#4a3222" stroke-width="3"/>`; }
    return o + `<rect x="580" y="490" width="30" height="8" fill="#2a2a32"/><rect x="770" y="490" width="30" height="8" fill="#2a2a32"/></g>` + A.txt(690, 228, '貨運保險箱', 14, '#fff3dc', 'middle', 900); };

  ROOMS.push({
    id: 'r12', no: 12, ch: 2, arc: 2, name: '行李車', en: 'THE BAGGAGE CAR', mood: 'night', par: 780, walls: ['n', 'e', 's', 'w'],
    init: () => ({}),
    canon: CANON,
    vary: r => ({ code: [rInt(r, 0, 9), rInt(r, 0, 9), rInt(r, 0, 9)], rush: rInt(r, 0, RUSH.length - 1) }),
    note: { v: 'w', x: 150, y: 150, s: 0.85 },
    intro: [
      '行李車裡冷冰冰的，只有一盞小燈晃來晃去。貨箱堆得像一座小山。',
      { w: 'mochi', t: '喵嗚……', sfx: 'meow' },
      '叫聲是從北邊那堆貨箱的正中間傳來的──麻糬好像鑽進了一個藤籃，卡在貨箱中間出不來了！',
      '貨箱好重，用手根本推不動。找找看有沒有能撬動貨箱的工具吧。',
    ],
    outro: [
      { t: '最後一個貨箱「轟」地滑開，藤籃被拉了出來。', sfx: 'slide' },
      { w: 'mochi', t: '喵！（從籃子裡跳出來，蹭了蹭你的手）', sfx: 'meow' },
      { t: '「嗚──！」列車廣播響起：「下一站，終點站，海港市。」', sfx: 'chime' },
      { w: 'gp', e: 'h', t: '「哎呀，你們跑到這裡來啦！快，下車囉。鐘塔就在港口旁邊。」' },
    ],
    views: {
      n: {
        draw: s => A.wall(WALL) + TR.ceiling('#d9c49a', '#a88a5a') + lamp() + TR.endDoor(780, 160, 150, 330, { c: '#6a4228' }) + `<g filter="url(#ds)"><rect x="60" y="130" width="140" height="100" rx="4" fill="#6a4228" ${SW}/>${[0, 1, 2].map(i => `<rect x="${72 + i * 42}" y="142" width="36" height="76" fill="#cfe6f4" ${SW2}/>`).join('')}<rect x="60" y="130" width="140" height="100" rx="4" fill="url(#glassR)"/></g>` +
          (s.rush_crates_ok ? Deco.crate(140, 492, 150, 110, '#b8844e') + Deco.crate(620, 500, 130, 120, '#9a6a3a') + Deco.sack(460, 500) : crates(s, true)) + A.light(),
        hot: s => [
          { id: 'crates', r: [100, 300, 660, 210], on: C => onCrates(C), use: { bar: C => { s.barUsed = 1; C.take('bar'); Snd.play('click'); G.toast('把撬棍卡在貨箱底下──「嘿咻！」貨箱可以推動了！'); onCrates(C); } } },
          { id: 'rear', r: [770, 150, 170, 340], t: '車尾的門外，鐵軌一直往後延伸，越來越遠。' },
        ],
      },
      e: {
        draw: s => A.wall(WALL) + TR.ceiling('#d9c49a', '#a88a5a') + lamp() + chart() + telegraph(s) + `<g filter="url(#ds)"><rect x="80" y="130" width="180" height="200" rx="6" fill="#6a4228" ${SW}/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${92 + (i % 3) * 56}" y="${144 + ((i / 3) | 0) * 90}" width="48" height="80" rx="3" fill="#3a2a1e" ${SW2}/><rect x="${96 + (i % 3) * 56}" y="${178 + ((i / 3) | 0) * 90}" width="40" height="${30 + (i % 2) * 10}" fill="#f4ead8" ${SW2}/>`).join('')}</g>` + A.txt(170, 350, '郵件格', 13, '#fff3dc', 'middle', 900) + A.light(),
        hot: s => [
          { id: 'telegraph', r: [330, 280, 330, 120], on: C => onTele(C), use: { crank: C => { C.take('crank'); s.crankIn = 1; Snd.play('click'); G.toast('搖柄「喀」地插進了電報機的側面。'); onTele(C); } } },
          { id: 'chart', r: [700, 120, 210, 230], on: C => G.modal(`<h3>摩斯電碼表（數字）</h3><p class="sub">每個數字都是五個符號：點（短）和長條（長）。</p><svg class="wsvg" viewBox="690 160 230 190" style="max-width:420px;margin:0 auto">${chart()}</svg>`, { w: 480 }) },
          { id: 'mail', r: [80, 130, 180, 200], t: '一格一格的郵件格，信都按照城市分好了：海港市、燈塔站、山城……' },
        ],
      },
      s: {
        draw: s => A.wall(WALL) + TR.ceiling('#d9c49a', '#a88a5a') + lamp() + TR.endDoor(430, 160, 150, 330, { open: true, label: '← 客車' }) +
          `<g filter="url(#ds)"><rect x="90" y="250" width="240" height="240" rx="6" fill="#8c5634" ${SW}/><rect x="90" y="250" width="240" height="240" rx="6" fill="url(#p-grainH)"/><rect x="104" y="300" width="212" height="12" fill="#5a3a24"/><rect x="104" y="390" width="212" height="12" fill="#5a3a24"/></g>` + A.txt(210, 280, '失物招領', 18, '#fff3dc', 'middle', 900) +
          `<g transform="translate(130 296)">${IC.jar('#e98a8a')}</g>` + `<g transform="translate(110 360) scale(.4)">${ITEMS.blanket.ic()}</g>` + (s.crank ? '' : `<g transform="translate(220 330) scale(.6)">${ITEMS.crank.ic()}</g>`) + `<g transform="translate(150 410) scale(.7)"><path d="M10 50q40-30 80 0v30H10z" fill="#4f6aa8" ${SW}/></g>` + `<g transform="translate(240 420) scale(.6)">${IC.key('#9aa6b0')}</g>` +
          Deco.sack(740, 500, '#c9a878') + Deco.sack(820, 500, '#b8986a', 0.85) + Deco.crate(640, 500, 90, 70) + A.light(),
        hot: s => [
          { id: 'lost', r: [90, 250, 240, 240], on: C => { if (!s.crank) { s.crank = 1; C.give('crank'); G.toast('失物招領的架子上，有一支黃銅搖柄，標籤寫著：「電報機的，別再弄丟了！──唐」'); } else G.toast('架子上還有一頂毛帽、一把雨傘和一串鑰匙，都不是你要找的。'); } },
          { id: 'door', r: [420, 150, 170, 340], t: '回客車的門。爺爺還在打呼。先把麻糬找回來！' },
          { id: 'sacks', r: [620, 380, 260, 120], t: '鼓鼓的郵袋，綁著「海港市」的標籤。' },
        ],
      },
      w: {
        draw: s => A.wall(WALL) + TR.ceiling('#d9c49a', '#a88a5a') + lamp() + safe(s) + Deco.sack(160, 500, '#c9a878', 1.1) + Deco.crate(240, 500, 120, 90, '#a8743e') + Deco.crate(260, 410, 80, 60, '#c49058') +
          `<g filter="url(#ds)"><path d="M420 250q0-60 50-60t50 60v140h-100z" fill="none" stroke="url(#brass)" stroke-width="4"/>${[0, 1, 2, 3, 4, 5, 6].map(k => `<path d="M${428 + k * 14} ${210 - Math.sin(k / 6 * Math.PI) * 18}V390" stroke="url(#brass)" stroke-width="2"/>`).join('')}<rect x="410" y="388" width="120" height="14" rx="3" fill="#a8703f" ${SW2}/><circle cx="470" cy="180" r="8" fill="none" stroke="url(#brass)" stroke-width="3"/><path d="M450 330h40" stroke="#8a5a2a" stroke-width="4"/></g><g transform="translate(470 318)"><ellipse rx="16" ry="20" fill="#4fae7a" ${SW2}/><circle cx="-4" cy="-24" r="12" fill="#e0504a" ${SW2}/><path d="M-14-22l-8 4 8 2z" fill="#f2c232" ${SW2}/><circle cx="-6" cy="-26" r="2.4" fill="#2a1a10"/><path d="M8 14l10 18" stroke="#3f8a5a" stroke-width="6" stroke-linecap="round"/></g>` + A.light(),
        hot: s => [
          { id: 'safe', r: [560, 210, 260, 280], on: C => onSafe(C) },
          { id: 'parrot', r: [410, 170, 120, 230], on: () => { Snd.tone(1400, 0.08, 'square', 0.05); setTimeout(() => Snd.tone(1100, 0.08, 'square', 0.05), 120); G.toast('鸚鵡歪著頭：「短短長！短短長！嘎──」'); } },
          { id: 'sackW', r: [100, 380, 300, 120], t: '一堆郵袋和貨箱。' },
        ],
      },
    },
    steps: [
      { goal: '找到能用的工具', done: s => s.crank, h: ['行李車裡有一個「失物招領」的架子。', '轉到南邊，看看失物招領架。', '點南邊的失物招領架，拿到搖柄。'] },
      { goal: '讓電報機印出電報', done: s => s.tape, h: ['東邊的電報機側面有個洞，好像少了一支搖柄。', '拿著搖柄點東邊的電報機，再轉動它。', '拿著搖柄點東邊的電報機，按「轉動搖柄」。'] },
      { goal: '解開保險箱的密碼', done: s => s.safeOpen, h: ['電報紙帶上印著三組點和長條。東邊牆上貼著摩斯電碼表。', '每一組都是五個符號，對照電碼表，就知道是哪個數字。點道具欄的電報紙帶可以再看一次。', s => `三組分別是 ${V(s).code.join('、')}，西邊保險箱的密碼是 ${V(s).code.join('')}。`] },
      { goal: '拿到撬棍', done: s => s.bar || s.barUsed, h: ['保險箱打開了。', '點西邊打開的保險箱。', '點西邊的保險箱，拿到撬棍。'] },
      { goal: '把麻糬的藤籃推出來', done: s => s.rush_crates_ok, h: ['北邊的貨箱很重，要用撬棍才推得動。', '拿著撬棍點北邊的貨箱。每個貨箱只能順著長的那一邊滑動；先想想哪些貨箱擋住了藤籃往右邊門口的路。', s => '最少的推法：' + rushHint(s)] },
    ],
  });

  function rushHint(s) {
    const cars = (s.rush_crates || RUSH[V(s).rush]).map(x => x.slice()), mv = W.rushSolve(cars), out = [];
    let cur = cars;
    mv.forEach(([i, d]) => { const [r, c, l, h] = cur[i]; out.push(`${i === 0 ? '藤籃' : `（第 ${r + 1} 排第 ${c + 1} 格的貨箱）`}往${h ? (d > 0 ? '右' : '左') : (d > 0 ? '下' : '上')} ${Math.abs(d)} 格`); cur = W.rushApply(cur, [i, d]); });
    return out.join('，') + '。';
  }
  function onCrates(C) {
    const s = C.s;
    if (s.rush_crates_ok) { G.toast('貨箱都推開了。'); return; }
    if (!s.barUsed) { G.toast('貨箱堆得好高，中間夾著一個藤籃，裡面傳出「喵嗚」的聲音。貨箱太重了，用手推不動。'); return; }
    W.rush(C, { id: 'crates', cars: RUSH[V(s).rush], title: '推開貨箱', sub: '先點一個貨箱，再點它要去的空格（貨箱只能順著<b>長的那一邊</b>滑動）。把<b>麻糬的藤籃</b>推到右邊的門口就成功了！', okMsg: '藤籃推出來了！', ok: () => { C.render(); C.win(); } });
  }
  function onTele(C) {
    const s = C.s;
    if (!s.crankIn) { G.toast('一台黃銅色的電報機，旁邊有一個小洞，好像少了什麼零件，搖不動。'); return; }
    const body = G.modal(`<h3>鐵路電報機</h3><p class="sub">轉動搖柄，電報機會把收到的電報印在紙帶上。</p><div class="tp">${s.tape ? tapeSvg(s) : '<p class="paper" style="text-align:center">（紙帶還是空的）</p>'}</div><p class="msg"></p><div class="btnRow"><button class="ok" data-t="1">轉動搖柄</button></div>`, { w: 620 });
    body.onclick = e => {
      if (!e.target.closest('[data-t]') || body._busy) return; body._busy = 1;
      Snd.play('click'); let t = 300;
      V(s).code.forEach(d => { MORSE[d].split('').forEach(ch => { setTimeout(() => Snd.tone(760, ch === '.' ? 0.08 : 0.24, 'sine', 0.05), t); t += ch === '.' ? 180 : 340; }); t += 380; });
      setTimeout(() => { if (!body.isConnected) return; body._busy = 0; body.querySelector('.tp').innerHTML = tapeSvg(s); if (!s.tape) { s.tape = 1; C.give('tape', true); G.toast('「滴、滴、答──」電報機印出了一段<b>電報紙帶</b>。'); } const m = body.querySelector('.msg'); m.className = 'msg'; m.style.color = '#2f7d4f'; m.textContent = '印好了！紙帶已經放進道具欄。'; C.save(); }, t);
    };
  }
  function onSafe(C) {
    const s = C.s;
    if (s.safeOpen) { if (!s.bar && !s.barUsed) { s.bar = 1; C.give('bar'); } else G.toast('保險箱裡空空的。'); return; }
    W.wheels(C, { id: 'safe', title: '貨運保險箱', sub: '三個數字轉輪。門上貼著一張紙：「密碼已用電報傳送。──唐列車長」', extra: s.tape ? tapeSvg(s, 420) : '', wheels: [0, 1, 2].map(() => ({ vals: '0123456789'.split('') })), check: (i, v) => v.join('') === V(s).code.join(''), okMsg: '保險箱打開了！', ok: C => { s.safeOpen = 1; Snd.play('door'); } });
  }
})();
