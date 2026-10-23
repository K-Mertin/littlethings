'use strict';
// 番外 1：地下室（黑漆漆的地窖：點燈、倒果汁、接水管、跟著老鼠腳印找密碼）
(() => {
  const WALL = { c: '#8a7a68', pat: 'brick', trim: '#a8987f', floor: 'stone', fc: ['#6a5e52', '#5a4e44'] };
  const PATH = [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [2, 3], [1, 3], [1, 4], [2, 4], [3, 4]];
  const ROWS = 4, COLS = 5, IN_R = 0, OUT_R = 3;
  const BX = [190, 380, 570, 760]; // 酒桶位置
  const CANON = { jug: [8, 5, 3], goal: 4, num: [4, 8, 1, 6], order: [2, 0, 3] };
  const V = s => (s && s.v) || CANON;
  const CODE = s => V(s).order.map(i => V(s).num[i]).join('');
  const NTH = ['左邊數來第一個', '第二個', '第三個', '最右邊'];

  // 水管：照著路線放好正確的管子，再全部亂轉
  function makePipes() {
    for (let t = 0; t < 40; t++) {
      const g = [];
      for (let r = 0; r < ROWS; r++) { g.push([]); for (let c = 0; c < COLS; c++) g[r].push({ m: Math.random() < 0.5 ? 5 : 3, r: (Math.random() * 4) | 0 }); }
      PATH.forEach(([r, c], i) => {
        const dir = (a, b) => b[0] < a[0] ? 1 : b[1] > a[1] ? 2 : b[0] > a[0] ? 4 : 8;
        const from = i === 0 ? 8 : dir([r, c], PATH[i - 1]), to = i === PATH.length - 1 ? 2 : dir([r, c], PATH[i + 1]);
        g[r][c] = { m: (from | to) === 5 || (from | to) === 10 ? 5 : 3, r: (Math.random() * 4) | 0 };
      });
      if (!W.pipeFlow(g, ROWS, COLS, IN_R, OUT_R).ok) return g;
    }
  }

  Object.assign(ITEMS, {
    matches: { n: '火柴盒', d: '一盒小火柴，盒子上畫著一隻戴帽子的小老鼠。', ic: () => `<g transform="rotate(-10 50 50)"><rect x="18" y="32" width="64" height="40" rx="4" fill="#e0504a" ${SW}/><rect x="18" y="32" width="64" height="12" fill="#c4402a"/><rect x="26" y="48" width="48" height="18" rx="3" fill="#fff3dc" ${SW2}/><path d="M70 30l12-18" stroke="#f2d0a0" stroke-width="5" stroke-linecap="round"/><circle cx="83" cy="11" r="5" fill="#c4402a"/></g>` },
    wrench: { n: '扳手', d: '可以轉開六角螺栓的大扳手，有點重。', ic: () => `<g transform="rotate(-40 50 50)"><rect x="44" y="30" width="12" height="58" rx="5" fill="url(#silver)" ${SW}/><path d="M34 14a18 18 0 1 0 32 0l-8 8h-16z" fill="url(#silver)" ${SW}/></g>` },
    cellarKey: { n: '地窖鑰匙', d: '濕濕的老鑰匙，從玻璃管的軟木塞上拿下來的。鑰匙柄是一隻老鼠的形狀。', ic: () => IC.key('url(#silver)') + `<circle cx="22" cy="30" r="6" fill="#c9cfd6" ${SW2}/><circle cx="34" cy="30" r="6" fill="#c9cfd6" ${SW2}/>` },
  });

  const dark = (cx, cy, r = 0.55) => `<radialGradient id="dk" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="#05030a" stop-opacity=".1"/><stop offset=".45" stop-color="#05030a" stop-opacity=".72"/><stop offset="1" stop-color="#05030a" stop-opacity=".93"/></radialGradient><rect width="1000" height="625" fill="url(#dk)"/>`;
  const shade_ = (s, cx = 0.5, cy = 0.2) => s.lit ? A.light() : dark(cx, cy, 0.45);
  const barrel = (x, y, n, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 4, 78, 10)}<path d="M-70 0q-10-70 0-140h140q10 70 0 140z" fill="#8c5634" ${SW}/><path d="M-70 0q-10-70 0-140h140q10 70 0 140z" fill="url(#cyl)"/>${[-112, -28].map(yy => `<path d="M-74 ${yy}h148" stroke="#4a4a52" stroke-width="10"/><path d="M-74 ${yy - 3}h148" stroke="#8a96a4" stroke-width="3"/>`).join('')}<path d="M-40 -136v132M0-138v136M40-136v132" stroke="#6a3e22" stroke-width="2" opacity=".6"/><circle cx="0" cy="-70" r="26" fill="#f4ead8" ${SW2}/>${A.txt(0, -59, n, 32, '#6a3e22', 'middle', 900)}</g>`;
  const tube = (x, y, s) => {
    const lvl = s.pipes_ok ? 40 : 250;
    let o = `<rect x="${x - 40}" y="${y}" width="80" height="300" rx="10" fill="#6a5a4a" ${SW}/><rect x="${x - 28}" y="${y + 10}" width="56" height="280" rx="24" fill="#cfe6ee" fill-opacity=".35" ${SW2}/>`;
    o += `<rect x="${x - 26}" y="${y + lvl}" width="52" height="${288 - lvl}" rx="22" fill="#5fb8e8" opacity=".75"/>`;
    if (!s.keyTaken) o += `<g transform="translate(${x} ${y + lvl - 6})"><rect x="-16" y="-8" width="32" height="20" rx="6" fill="#c9a06a" ${SW2}/><path d="M0 12v20" stroke="#4a3222" stroke-width="2"/><g transform="translate(-16 26) scale(.32)">${ITEMS.cellarKey.ic()}</g></g>`;
    o += `<rect x="${x - 28}" y="${y + 10}" width="18" height="280" rx="9" fill="#fff" opacity=".25"/><rect x="${x - 46}" y="${y - 14}" width="92" height="20" rx="6" fill="#4a4038" ${SW}/><path d="M${x} ${y - 14}V${y - 70}H${x + 60}" stroke="#9aa6b0" stroke-width="12" fill="none"/><path d="M${x} ${y - 14}V${y - 70}H${x + 60}" ${SW2} fill="none"/>`;
    return o;
  };
  const lantern = (x, y, lit) => {
    if (lit) A.fx(`<circle class="flick" cx="${x}" cy="${y + 60}" r="300" fill="url(#lampG)" style="${A.ad(3.3)}"/><g transform="translate(${x} ${y + 64})"><g class="flame" style="${A.ad(0.8)}"><path d="M0 -24q12 14 0 24q-12-10 0-24z" fill="#ffb84a"/><path d="M0 -14q6 8 0 14q-6-6 0-14z" fill="#fff6c8"/></g></g>`);
    return `<path d="M${x} 0V${y}" stroke="#4a4a52" stroke-width="4"/><path d="M${x - 30} ${y + 20}h60l-8-20h-44z" fill="#4a4a52" ${SW}/><rect x="${x - 28}" y="${y + 20}" width="56" height="70" rx="6" fill="${lit ? '#ffe9a0' : '#3a3a40'}" fill-opacity="${lit ? 0.85 : 0.9}" ${SW}/><path d="M${x - 28} ${y + 44}h56M${x} ${y + 20}v70" stroke="#4a4a52" stroke-width="3"/><path d="M${x - 34} ${y + 90}h68l-6 12h-56z" fill="#4a4a52" ${SW}/>`;
  };
  const tracks = (s, sc = 1, ox = 0, oy = 0) => { // 老鼠腳印：從牆角的洞出發，依序到三個酒桶
    const pts = [[930, 492], ...V(s).order.map(i => [BX[i], 500])];
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    const dip = i => 40 + i * 34;
    for (let i = 1; i < pts.length; i++) { const [a, b] = pts[i - 1], [c, e] = pts[i]; d += `C${a} ${b + dip(i)} ${c} ${e + dip(i)} ${c} ${e}`; }
    let o = `<path id="trk" d="${d}" fill="none" stroke="#f4ead8" stroke-opacity=".12" stroke-width="20" transform="translate(${ox} ${oy}) scale(${sc})"/>`;
    // 沿著路線畫小腳印
    const seg = []; for (let i = 1; i < pts.length; i++) { const [a, b] = pts[i - 1], [c, e] = pts[i], D = dip(i); for (let k = 0.06; k < 0.97; k += 0.075) { const t = k, mt = 1 - t; const P = u => { const m = 1 - u; return [m * m * m * a + 3 * m * m * u * a + 3 * m * u * u * c + u * u * u * c, m * m * m * b + 3 * m * m * u * (b + D) + 3 * m * u * u * (e + D) + u * u * u * e]; }; const [x, y] = P(t), [x2, y2] = P(t + 0.01); seg.push([x, y, Math.round(k / 0.075) % 2, Math.atan2(y2 - y, x2 - x) * 180 / Math.PI + 90, Math.round(k / 0.075) % 4 === 1]); } }
    seg.forEach(([x, y, f, ang, arrow]) => o += `<g transform="translate(${ox + x * sc} ${oy + y * sc}) scale(${sc}) rotate(${ang.toFixed(0)}) translate(${f ? 6 : -6} 0)"><ellipse rx="4.5" ry="5.5" fill="#3a2a1e" opacity=".75"/><circle cx="-4" cy="-7" r="1.8" fill="#3a2a1e" opacity=".75"/><circle cx="0" cy="-8.5" r="1.8" fill="#3a2a1e" opacity=".75"/><circle cx="4" cy="-7" r="1.8" fill="#3a2a1e" opacity=".75"/></g>` + (arrow ? `<g transform="translate(${ox + x * sc} ${oy + y * sc}) scale(${sc}) rotate(${ang.toFixed(0)})"><path d="M-7 -14l7-10 7 10" stroke="#f4ead8" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/></g>` : ''));
    return o;
  };

  ROOMS.push({
    id: 'r9', no: 9, bonus: true, name: '地下室', en: 'THE SECRET CELLAR', mood: 'night', par: 900, walls: ['s', 'w', 'n', 'e'], thumb: 'w',
    init: () => ({ pipes: makePipes() }),
    canon: CANON,
    vary: r => {
      const sets = [[[10, 7, 3], 5], [[12, 7, 5], 6], [[12, 7, 5], 4], [[10, 7, 3], 2]], [jug, goal] = sets[rInt(r, 0, 3)];
      const num = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], r).slice(0, 4);
      return { jug, goal, num, order: shuffle([0, 1, 2, 3], r).slice(0, 3) };
    },
    note: { v: 'w', x: 760, y: 324, s: 0.85, cond: s => s.lit },
    intro: [
      { w: 'gp', e: 'h', t: '「孩子，八音盒之家還有最後一個祕密。」' },
      { w: 'gp', t: '「地下室裡，有一個爺爺小時候藏起來的『時光寶盒』。我把鑰匙弄丟了，一直沒能再打開它。」' },
      { w: 'gp', e: 't', t: '「你這麼會解謎，一定找得到。爺爺在上面等你的好消息！」' },
      { t: '你沿著窄窄的石階往下走。身後的木門「咿──」地關上了，四周一片漆黑。', sfx: 'door' },
      { w: 'mochi', t: '喵……', sfx: 'meow' },
      '只有樓梯頂端的門縫透進一點點光。先找找能照明的東西吧。',
    ],
    outro: [
      { t: '鑰匙一轉、密碼一對，厚重的木門「轟隆隆」地打開了。', sfx: 'door' },
      '門後是一條長長的地道，盡頭飄來青草和夜晚的味道……',
      { w: 'mochi', t: '喵！', sfx: 'meow' },
    ],
    views: {
      s: {
        draw: s => A.wall(WALL) +
          `<g filter="url(#ds)"><path d="M40 488L40 120H120V488z" fill="#5a4a3a" ${SW}/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${60 + i * 36} ${488 - i * 52}h${290 - i * 36}v${-14}h${-(290 - i * 36)}z" fill="#8c6a4a" ${SW2}/><rect x="${60 + i * 36}" y="${488 - i * 52 - 14}" width="${290 - i * 36}" height="52" fill="#6a5040" ${SW2}/>`).join('')}</g>` +
          `<path d="M280 0h80v130h-80z" fill="#fff4c8"/>` + A.shaft('280 130L360 130L420 488L180 488', s.lit ? 0.18 : 0.45) +
          `<g filter="url(#ds)"><rect x="520" y="340" width="360" height="22" rx="4" fill="#8c5634" ${SW}/><rect x="540" y="362" width="320" height="110" rx="4" fill="#7a4a2a" ${SW}/><rect x="560" y="378" width="130" height="80" rx="4" fill="${s.drawer ? '#2a1a10' : '#9a6038'}" ${SW2}/><rect x="710" y="378" width="130" height="80" rx="4" fill="#9a6038" ${SW2}/><circle cx="625" cy="418" r="7" fill="url(#brass)" ${SW2}/><circle cx="775" cy="418" r="7" fill="url(#brass)" ${SW2}/></g>` +
          (s.drawer && !s.matches ? `<g transform="translate(590 380) scale(.7)">${ITEMS.matches.ic()}</g>` : '') +
          Deco.jarShelf(540, 200, 320, ['#8a3a8a', '#e0504a', '#f2c232', '#8a3a8a', '#e98a8a']) + A.cat(250, 384, 0.55) + shade_(s, 0.3, 0.25),
        hot: s => [
          { id: 'drawer', r: [550, 360, 150, 110], on: C => { if (!s.drawer) { s.drawer = 1; Snd.play('open'); G.toast('抽屜一拉就開了。門縫的光剛好照到裡面──有一盒火柴！'); } else if (!s.matches) { s.matches = 1; C.give('matches'); } else G.toast('抽屜裡只剩幾根舊蠟筆。'); } },
          { id: 'drawer2', r: [705, 360, 150, 110], t: '右邊的抽屜卡住了，裡面好像只有舊報紙。' },
          { id: 'stairs', r: [40, 140, 300, 340], t: '回到樓上的石階。門從外面卡住了，爺爺說要找到寶盒才能出去喔。' },
          { id: 'cat', r: [210, 300, 90, 90], on: () => { Snd.play('meow'); G.toast('麻糬坐在階梯上，眼睛在黑暗裡閃閃發光。'); } },
          { id: 'jars', r: [530, 130, 340, 90], t: s.lit ? '一整排果醬罐：葡萄、草莓、檸檬……都是爺爺做的。' : '太暗了，看不清楚架子上放什麼。' },
        ],
      },
      w: {
        draw: s => A.wall(WALL) + BX.map((x, i) => `<g filter="url(#ds)">${barrel(x, 470, s.lit ? V(s).num[i] : '?')}</g>`).join('') +
          `<path d="M905 478q0-30 25-30t25 30z" fill="#1a1008" ${SW2}/>` + (s.lit ? tracks(s) + `<g transform="translate(${BX[V(s).order[2]] + 40} 330)"><ellipse rx="16" ry="10" fill="#9a8a7a" ${SW2}/><circle cx="-14" cy="-6" r="6" fill="#9a8a7a" ${SW2}/><circle cx="-18" cy="-8" r="1.5" fill="#2a1a10"/><path d="M14 2q14 4 12 14" stroke="#4a3222" stroke-width="2" fill="none"/></g>` : '') +
          A.paper(60, 120, 150, 110, -4, '#f4ead8', 0) + A.txt(135, 160, '小老鼠的', 18, '#6a3e22', 'middle', 900, 'transform="rotate(-4 135 175)"') + A.txt(135, 190, '夜間散步', 18, '#6a3e22', 'middle', 900, 'transform="rotate(-4 135 175)"') + shade_(s, 0.5, 0.15),
        hot: s => [
          { id: 'note', r: [50, 110, 170, 130], on: () => { if (!s.lit) { G.toast('牆上釘著一張紙，太暗了看不清楚。'); return; } s.readMouse = 1; G.read('牆上的紙條（爺爺小時候的字）', '我的祕密基地密碼，只有小老鼠知道。\n\n每天晚上，牠都從牆角的洞出發，\n照同樣的順序去偷吃三個酒桶上的葡萄乾。\n\n<b>照著牠拜訪的順序，念出酒桶上的數字，\n就是大門的密碼。</b>\n\n　　　　　　　　　──一鳴，十歲'); } },
          { id: 'tracks', r: [100, 470, 860, 150], go: 'tracks' },
          ...BX.map((x, i) => ({ id: 'barrel' + i, r: [x - 75, 330, 150, 140], t: s.lit ? `一個大酒桶，上面畫著數字「${V(s).num[i]}」。` : '黑暗中摸到一個圓圓的大木桶。' })),
          { id: 'hole', r: [895, 430, 70, 60], t: '牆角有一個小小的老鼠洞。' },
        ],
      },
      tracks: {
        back: 'w', title: '地上的腳印',
        draw: s => A.closeBg('#6a5e52', 'stone') + `<rect y="330" width="1000" height="295" fill="#5a4e44" opacity=".6"/>` + BX.map((x, i) => `<g filter="url(#ds)">${barrel(x, 330, s.lit ? V(s).num[i] : '?', 0.9)}</g>`).join('') + `<path d="M905 334q0-30 25-30t25 30z" fill="#1a1008" ${SW2}/>` + (s.lit ? tracks(s, 1, 0, -160) : '') + shade_(s),
        hot: s => [{ id: 'trk', r: [60, 140, 900, 460], t: s.lit ? '細細的小腳印從老鼠洞出發，彎彎曲曲地經過三個酒桶。' : '地上好像有什麼痕跡，可是太暗了。' }],
      },
      n: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${tube(160, 150, s)}</g>` + lantern(500, 40, s.lit) +
          `<g filter="url(#ds)">${A.door(630, 150, 220, 320, '#5a4030', { keyhole: true, knob: false, open: s.doorOpen, frame: '#8a7a68' })}</g>` +
          (s.doorOpen ? '' : `<g filter="url(#ds)"><rect x="700" y="300" width="80" height="70" rx="10" fill="url(#brass)" ${SW}/>${[0, 1, 2].map(i => `<rect x="${708 + i * 23}" y="318" width="19" height="30" rx="3" fill="${s.codeOk ? '#a8e0b0' : '#fffaf0'}" ${SW2}/>`).join('')}</g>`) +
          (s.keyIn && !s.doorOpen ? `<g transform="translate(830 330) scale(.45) rotate(90 50 50)">${ITEMS.cellarKey.ic()}</g>` : '') + shade_(s, 0.5, 0.2),
        hot: s => [
          { id: 'lantern', r: [450, 40, 100, 160], on: () => G.toast(s.lit ? '油燈暖暖地亮著。' : '天花板垂下一盞油燈。燈芯還在，可是沒有火。'), use: { matches: C => { s.lit = 1; Snd.play('match'); setTimeout(() => Snd.play('light'), 400); G.toast('「嚓」──點亮了油燈！整個地下室都亮起來了。'); } } },
          { id: 'tube', r: [110, 90, 120, 370], on: C => { if (!s.lit) { G.toast('黑暗中摸到一根冰冰涼涼的玻璃管。'); return; } if (s.keyTaken) { G.toast('玻璃管裡裝滿了水。'); return; } if (!s.pipes_ok) G.toast('高高的玻璃管底部，有一個軟木塞綁著一把鑰匙。管子太細，手伸不進去。管子頂端接著一根水管……'); else { s.keyTaken = 1; C.give('cellarKey'); G.toast('水把軟木塞浮了上來！拿到了「<b>地窖鑰匙</b>」。'); } } },
          { id: 'door', r: [630, 150, 220, 320], on: C => onDoor(C), use: { cellarKey: C => { C.take('cellarKey'); s.keyIn = 1; Snd.play('click'); G.toast('鑰匙插進鎖孔，「喀」地轉了一圈。可是門上還有一個三位數的密碼鎖。'); if (s.codeOk) openDoor(C); } } },
        ],
      },
      e: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${barrel(200, 470, '汁', 1.15)}</g><rect x="186" y="380" width="30" height="16" rx="4" fill="url(#brass)" ${SW2}/>` +
          `<g filter="url(#ds)"><rect x="300" y="400" width="250" height="20" rx="4" fill="#8c5634" ${SW}/><path d="M320 420v60M530 420v60" stroke="#6a3e22" stroke-width="12"/></g>` + [0, 1, 2].map(i => { const c = V(s).jug[i], w = 22 + c * 2.2, h = 24 + c * 5; return `<path d="M${345 + i * 75 - w / 2} ${400 - h}h${w}v${h - 4}q0 4-4 4h${-(w - 8)}q-4 0-4-4z" fill="#e8f4f8" fill-opacity=".5" ${SW2}/>` + A.txt(345 + i * 75, 392 - h, c + '升', 12, '#fff3dc'); }).join('') +
          `<g filter="url(#ds)"><rect x="330" y="120" width="190" height="170" rx="10" fill="#6a5a4a" ${SW}/><circle cx="425" cy="190" r="50" fill="#fffaf0" ${SW}/><path d="M425 190l${s.pour_juice_ok ? 30 : -30} -28" ${SW}/>${A.txt(425, 262, '剛好 ' + V(s).goal + ' 升', 20, '#fff3dc', 'middle', 900)}</g>` +
          `<rect x="350" y="300" width="150" height="80" rx="6" fill="${s.pour_juice_ok ? '#2a1a10' : '#7a6a58'}" ${SW}/>` + (s.pour_juice_ok && !s.wrench ? `<g transform="translate(380 290) scale(.9)">${ITEMS.wrench.ic()}</g>` : '') +
          `<g filter="url(#ds)"><rect x="590" y="110" width="320" height="330" rx="12" fill="#5a5048" ${SW}/>` + (s.panel ? pipesMini(s) : `<rect x="610" y="130" width="280" height="290" rx="8" fill="#7a6a58" ${SW2}/>${[[630, 150], [870, 150], [630, 400], [870, 400]].map(([a, b]) => `<path d="M${a - 10} ${b}l5-9h10l5 9-5 9h-10z" fill="url(#silver)" ${SW2}/>`).join('')}${A.txt(750, 280, '水管閥門', 30, '#3a2a1e', 'middle', 900)}`) + `</g>` + shade_(s, 0.5, 0.2),
        hot: s => [
          { id: 'jugs', r: [290, 300, 270, 130], on: C => { if (!s.lit) { G.toast('桌上好像有幾個壺，太暗了。'); return; } if (s.pour_juice_ok) { G.toast('秤上的小門已經打開了。'); return; } W.pour(C, { id: 'juice', cap: V(s).jug, goal: V(s).goal, title: '葡萄汁與三個壺', sub: `大壺裡裝滿了 ${V(s).jug[0]} 升葡萄汁，旁邊還有 ${V(s).jug[1]} 升和 ${V(s).jug[2]} 升的空壺（壺上沒有刻度可以看，只能倒滿或倒光）。<br>上面的秤寫著：「<b>剛好 ${V(s).goal} 升</b>，小門就會打開。」點一個壺，再點另一個壺，就能把果汁倒過去。`, okMsg: `剛好 ${V(s).goal} 升！`, ok: () => { Snd.play('open'); G.toast('秤的指針一轉，下面的小門「喀」地打開了！'); } }); } },
          { id: 'hatch', r: [340, 110, 190, 280], on: C => { if (!s.lit) { G.toast('牆上有個圓圓的東西，看不清楚。'); return; } if (s.pour_juice_ok && !s.wrench) { s.wrench = 1; C.give('wrench'); } else if (!s.pour_juice_ok) G.toast(`一台壁掛的秤，寫著「剛好 ${V(s).goal} 升」。下面有一扇鎖著的小門。`); else G.toast('小門裡空空的。'); } },
          { id: 'panel', r: [590, 110, 320, 330], on: C => { if (!s.lit) { G.toast('牆上有一塊冰冷的鐵板。'); return; } if (!s.panel) { G.toast('用四顆六角螺栓鎖住的鐵板，寫著「水管閥門」。用手轉不動。'); return; } if (s.pipes_ok) { G.toast('水嘩啦啦地流進玻璃管了。'); return; } W.pipes(C, { key: 'pipes', inR: IN_R, outR: OUT_R, title: '水管閥門', sub: '點一節水管就會轉 90 度。把水管接好，讓水從左邊的「進水」一路流到右邊的「出水」。接通的管子會變成藍色。', okMsg: '水流過去了！', ok: () => { Snd.play('water'); G.toast('嘩啦啦……水沿著水管流向北邊的玻璃管！'); } }); }, use: { wrench: C => { s.panel = 1; Snd.play('click'); G.toast('用扳手轉開四顆螺栓，鐵板「哐噹」掉下來！後面是一整排水管。'); } } },
          { id: 'barrel', r: [120, 320, 170, 160], t: '一大桶葡萄汁，旁邊的壺都是用來分裝的。' },
        ],
      },
    },
    steps: [
      { goal: '找到能照明的東西', done: s => s.matches, h: ['黑漆漆的……只有樓梯那邊透著一點光。', '看看南邊樓梯旁的工作台抽屜。', '點南邊工作台左邊的抽屜兩次，拿到火柴盒。'] },
      { goal: '點亮油燈', done: s => s.lit, h: ['天花板好像垂著一盞燈。', '轉到北邊，中間上方有一盞油燈。', '拿著火柴盒點北邊的油燈。'] },
      { goal: '倒出剛好的葡萄汁', done: s => s.pour_juice_ok, h: [s => `東邊的秤寫著「剛好 ${V(s).goal} 升」。桌上的三個壺可以互相倒來倒去。`, s => `壺上沒有刻度，只能「倒到另一個壺滿為止」或「全部倒光」。用 ${V(s).jug[2]} 升的小壺來回倒，量出需要的量。`, s => '按「倒回大桶、重新來過」後，依序倒：' + jugSolve(V(s).jug, V(s).goal).join('、') + '。'] },
      { goal: '拿到小門裡的工具', done: s => s.wrench, h: ['秤下面的小門打開了。', '點東邊秤下面打開的小門。', '點小門，拿到扳手。'] },
      { goal: '打開水管面板', done: s => s.panel, h: ['東邊右邊的鐵板用六角螺栓鎖著。', '扳手可以轉六角螺栓。', '拿著扳手點東邊的「水管閥門」鐵板。'] },
      { goal: '把水管接通', done: s => s.pipes_ok, h: ['點水管閥門，轉動每一節水管。', '從左邊的「進水」開始，一節一節接：接通的管子會變藍色。', '路線是：最上排第 1、2 格 → 往下到第 3 排 → 往右到第 4 格 → 往上到第 2 排 → 往右到最右邊 → 往下到最下排出水口。'] },
      { goal: '拿到浮起來的鑰匙', done: s => s.keyTaken, h: ['水流到哪裡去了？', '北邊的玻璃管裝滿水了，軟木塞會浮上來。', '點北邊的玻璃管，拿到地窖鑰匙。'] },
      { goal: '打開地窖的門', done: s => s.doorOpen, h: ['北邊的門要鑰匙，還要三位數的密碼。西邊牆上有一張爺爺小時候寫的紙條。', '小老鼠從西邊牆角的洞出發，沿著腳印依序經過三個酒桶。點地上的腳印可以看清楚。', s => `老鼠依序經過${V(s).order.map(i => NTH[i]).join('、')}酒桶，密碼是 ${CODE(s)}。鑰匙也要插進門上。`] },
    ],
  });

  // 用廣度優先搜尋找出最短的倒法（提示用）
  function jugSolve(cap, goal) {
    const N = ['大', '中', '小'], st = [cap[0], 0, 0], seen = { [st]: null }, q = [st];
    while (q.length) {
      const v = q.shift();
      if (v.includes(goal)) { const out = []; let k = v.join(); while (seen[k]) { out.unshift(seen[k][1]); k = seen[k][0]; } return out; }
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (i === j || !v[i] || v[j] === cap[j]) continue; const n = v.slice(), m = Math.min(v[i], cap[j] - v[j]); n[i] -= m; n[j] += m; const k = n.join(); if (!(k in seen)) { seen[k] = [v.join(), N[i] + '→' + N[j]]; q.push(n); } }
    }
    return [];
  }
  function pipesMini(s) {
    const g = s.pipes, f = W.pipeFlow(g, ROWS, COLS, IN_R, OUT_R); let o = `<rect x="610" y="130" width="280" height="290" rx="8" fill="#3a3028" ${SW2}/>`;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const m = W.pipeRot(g[r][c].m, g[r][c].r), x = 625 + c * 50, y = 160 + r * 58; let d = ''; [[1, 0, -24], [2, 24, 0], [4, 0, 24], [8, -24, 0]].forEach(([b, dx, dy]) => { if (m & b) d += `M${x + 25} ${y + 25}l${dx} ${dy}`; }); o += `<path d="${d}" stroke="#2a1a10" stroke-width="14"/><path d="${d}" stroke="${f.seen.has(r + ',' + c) ? '#5fb8e8' : '#b8c2cc'}" stroke-width="9"/>`; }
    return o;
  }
  function onDoor(C) {
    const s = C.s;
    if (!s.lit) { G.toast('黑暗中摸到一扇很重的木門。'); return; }
    if (s.doorOpen) { C.win(); return; }
    if (s.codeOk && !s.keyIn) { G.toast('密碼對了，可是門上的鎖孔還需要鑰匙。'); return; }
    if (s.codeOk) return;
    W.wheels(C, { id: 'cellar', title: '地窖門的密碼鎖', sub: '三個數字轉輪。門上刻著一隻小老鼠。', wheels: [0, 1, 2].map(() => ({ vals: '0123456789'.split('') })), check: (i, v) => v.join('') === CODE(s), ok: C => { s.codeOk = 1; if (s.keyIn) openDoor(C); else G.toast('密碼鎖「喀」地彈開了！可是門上還有一個鎖孔。'); } });
  }
  function openDoor(C) { C.s.doorOpen = 1; Snd.play('door'); C.render(); C.win(); }
})();
