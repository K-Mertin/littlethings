'use strict';
// 第二部 第 3 章：鐘塔機械室（從背面讀鐘、打開保險櫃、照方向裝齒輪、讓大鐘重新走動）
(() => {
  const WALL = { c: '#a8977f', pat: 'brick', trim: '#c9b89a', floor: 'wood', fc: ['#7a5a3a', '#6a4a2e'], fy: 500 };
  // 齒輪盤面（事先用電腦算過：最少要放 4 個小齒輪，指針軸才會逆時針轉）
  const NETS = [
    { D: [0, 3], O: [4, 3], pegs: [[1, 0], [1, 1], [2, 2], [3, 2], [1, 3], [2, 3], [3, 3], [1, 4], [2, 4]] },
    { D: [0, 3], O: [4, 2], pegs: [[2, 0], [1, 1], [2, 1], [3, 1], [2, 2], [3, 2], [1, 3], [2, 4], [3, 4]] },
    { D: [0, 1], O: [4, 2], pegs: [[2, 0], [2, 1], [1, 2], [2, 2], [3, 2], [2, 3], [3, 3], [3, 4]] },
    { D: [0, 1], O: [4, 1], pegs: [[1, 1], [2, 1], [3, 1], [2, 2], [3, 2], [1, 3], [3, 3], [1, 4], [2, 4]] },
    { D: [0, 2], O: [4, 2], pegs: [[1, 0], [2, 0], [3, 0], [1, 1], [2, 1], [1, 2], [2, 2], [3, 2], [3, 4]] },
  ];
  const CANON = { h: 4, m: 10, net: 0 };
  const V = s => (s && s.v) || CANON;
  const CODE = s => String(V(s).h).padStart(2, '0') + String(V(s).m).padStart(2, '0');
  A.KEYS.r13 = 'n';
  Object.assign(PEOPLE, { pan: { skirt: 1, n: '潘婆婆', skin: '#f3d2b4', hair: '#d8d2ca', style: 'bun', cloth: '#7a5a8a', cloth2: '#f4ead8', eye: '#4a3a3a', acc: ['roundGlasses', 'scarf', 'wrinkle'] } });

  Object.assign(ITEMS, {
    idlers: { n: '小齒輪 ×4', d: '四個一模一樣的小黃銅齒輪，裝在絨布盒裡。可以裝在機械室的空軸上。', ic: () => [[34, 36], [66, 36], [34, 68], [66, 68]].map(([x, y]) => A.gear(x, y, 15, '#d9b56a', 10)).join('') },
  });

  // 從塔裡看到的鐘面（左右相反）：數字反過來、位置也反過來；指針照「反過來的角度」畫
  const face = (cx, cy, r, s, big) => {
    const v = V(s), ha = -((v.h % 12) + v.m / 60) * 30, ma = -v.m * 6;
    let o = `<circle cx="${cx}" cy="${cy}" r="${r + 26}" fill="#5a4a3a" ${SW}/><circle cx="${cx}" cy="${cy}" r="${r + 26}" fill="url(#p-grainH)" opacity=".5"/><circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="none" stroke="url(#brass)" stroke-width="6"/>`;
    o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff8e4"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sunG)" opacity=".55"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#p-noise)"/>`;
    // 窗格（玻璃分成好幾片）
    o += `<path d="M${cx - r} ${cy}h${2 * r}M${cx} ${cy - r}v${2 * r}" stroke="#4a3a2e" stroke-width="3" opacity=".7"/><circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="none" stroke="#4a3a2e" stroke-width="3" opacity=".6"/>`;
    for (let i = 0; i < 60; i++) { const a = -i * 6 * Math.PI / 180, r1 = i % 5 ? r * 0.9 : r * 0.84; o += `<path d="M${(cx + Math.sin(a) * r1).toFixed(1)} ${(cy - Math.cos(a) * r1).toFixed(1)}L${(cx + Math.sin(a) * r * 0.96).toFixed(1)} ${(cy - Math.cos(a) * r * 0.96).toFixed(1)}" stroke="#4a3a2e" stroke-opacity=".75" stroke-width="${i % 5 ? 1.5 : 4}"/>`; }
    [12, 3, 6, 9].forEach(n => { const a = -n * 30 * Math.PI / 180, x = cx + Math.sin(a) * r * 0.7, y = cy - Math.cos(a) * r * 0.7; o += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(-1 1)" opacity=".7">${A.txt(0, r * 0.08, n, r * 0.2, '#4a3a2e', 'middle', 900, 'font-family="Fredoka,sans-serif"')}</g>`; });
    // 灰塵把其他數字都蓋住了
    for (let i = 0; i < 9; i++) o += `<ellipse cx="${cx + Math.cos(i * 1.7) * r * 0.62}" cy="${cy + Math.sin(i * 2.3) * r * 0.55}" rx="${r * 0.2}" ry="${r * 0.08}" fill="#c9b89a" opacity=".2" transform="rotate(${i * 40} ${cx} ${cy})"/>`;
    o += `<path d="M${cx} ${cy + r * 0.1}V${cy - r * 0.5}" stroke="#2a1a10" stroke-width="${r * 0.07}" stroke-linecap="round" transform="rotate(${ha} ${cx} ${cy})"/><path d="M${cx} ${cy + r * 0.12}V${cy - r * 0.8}" stroke="#2a1a10" stroke-width="${r * 0.035}" stroke-linecap="round" transform="rotate(${ma} ${cx} ${cy})"/><circle cx="${cx}" cy="${cy}" r="${r * 0.06}" fill="url(#brass)" ${SW2}/>`;
    o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glassR)"/>`;
    if (big) o += A.txt(30, 40, '（從塔的裡面看，鐘面是反的）', 18, '#fff3dc', 'start', 700);
    return o;
  };
  const weights = () => { let o = ''; [140, 220].forEach((x, i) => { o += `<path d="M${x} 60V${250 + i * 60}" stroke="#4a4a52" stroke-width="4" stroke-dasharray="6 3"/>`; o += `<g filter="url(#ds)"><rect x="${x - 26}" y="${250 + i * 60}" width="52" height="${110 - i * 20}" rx="8" fill="#4a4a52" ${SW}/><rect x="${x - 26}" y="${250 + i * 60}" width="52" height="${110 - i * 20}" rx="8" fill="url(#cyl)"/>${A.txt(x, 310 + i * 50, i ? '50' : '80', 16, '#c9cfd6', 'middle', 900)}</g>`; }); return o; };
  const bigGears = run => { A.fx(`<g class="${run ? 'spin' : ''}" style="animation-duration:40s">${A.gear(880, 120, 90, 'url(#brass)', 18, 'opacity=".7"')}</g>`); A.fx(`<g class="${run ? 'spinr' : ''}" style="animation-duration:22s">${A.gear(740, 70, 50, 'url(#brass)', 11, 'opacity=".7"')}</g>`); return ''; };

  ROOMS.push({
    id: 'r13', no: 13, ch: 3, arc: 2, name: '鐘塔機械室', en: 'THE TOWER WORKS', mood: 'night', par: 780, walls: ['s', 'w', 'n', 'e'], thumb: 'n',
    init: () => ({}),
    canon: CANON, nets: NETS,
    vary: r => { let h, m; do { h = rInt(r, 1, 12); m = rInt(r, 1, 11) * 5; } while ((h % 6 === 0) || (m === 30) || (h * 5 % 60 === m)); return { h, m, net: rInt(r, 0, NETS.length - 1) }; },
    note: { v: 'w', x: 470, y: 120, s: 0.85 },
    intro: [
      '港口邊的大鐘塔好高好高。四面的大鐘，指針都停在同一個時間。',
      { w: 'pan', e: 'h', t: '「哎呀，一鳴？真的是你！我是師傅的女兒啊，你還記得我嗎？」' },
      { w: 'gp', e: 'c', t: '「小潘……你都變成潘婆婆了。這座鐘塔，五十年沒響了吧？」' },
      { w: 'pan', t: '「爸爸走了以後，誰也修不好它。機械室的保險櫃，大家都打不開。他只留下一本筆記。」' },
      { w: 'gp', e: 'h', t: '「孩子，這次換你帶路。爺爺的腿不好，在樓下等你喔！」' },
      '你和麻糬爬上窄窄的螺旋樓梯，推開了機械室的門。',
    ],
    outro: [
      { t: '「喀、喀、喀……」大大小小的齒輪一個帶一個轉了起來。', sfx: 'click' },
      '鐘面背後，指針慢慢往前走──五十年來，鐘塔第一次動了！',
      { t: '天花板上的活板門「碰」地彈開，一道梯子垂了下來。上面就是鐘樓。', sfx: 'door' },
    ],
    views: {
      s: {
        draw: s => A.wall(WALL) + Deco.ceilBeam() + bigGears(s.running) + `<g filter="url(#ds)"><path d="M60 500V210q0-40 40-40h120v330z" fill="#5a4a3a" ${SW}/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${70 + i * 8} ${490 - i * 50}h${150 - i * 8}v-14h${-(150 - i * 8)}z" fill="#8c6a4a" ${SW2}/>`).join('')}</g>` + A.txt(140, 160, '樓梯', 16, '#fff3dc', 'middle', 900) +
          `<g filter="url(#ds)">${A.table(380, 400, 360, 100, '#7a4a2a')}</g>` + `<g transform="translate(470 334)"><path d="M0 52l8-56h110l-8 56z" fill="#6a3e22" ${SW}/><path d="M12 48l6-46h92l-6 46z" fill="#f4ead8" ${SW2}/><path d="M24 14h70M22 24h70M20 34h50" stroke="#9aa" stroke-width="2"/>${A.txt(64, 64, '師傅的筆記', 14, '#fff3dc', 'middle', 900)}</g>` + Deco.oilCan(660, 388) + Deco.candle(420, 388) +
          `<g filter="url(#ds)"><rect x="280" y="150" width="56" height="160" rx="28" fill="#cfe6f4" ${SW}/><rect x="280" y="150" width="56" height="160" rx="28" fill="url(#glassR)"/></g>` + A.shaft('280 190L336 190L420 488L230 488', 0.18) + A.light(),
        hot: s => [
          { id: 'book', r: [460, 320, 140, 80], on: C => { s.read = 1; G.read('師傅的筆記', '<b>鐘塔筆記</b>　　　　──師傅\n\n一、大鐘停下的那一刻，就是保險櫃的密碼。\n　　（例如 3 點 05 分 → <b>0305</b>）\n二、在塔裡面看到的是鐘面的<b>背面</b>，左右是相反的：\n　　玻璃上的「3」，從裡面看會跑到左邊。\n三、所以從裡面看，指針是<b>逆時針</b>轉的。\n　　裝齒輪時，指針軸要<b>逆時針</b>轉才對。\n四、發條是順時針轉的。兩個齒輪咬在一起，\n　　轉的方向就會相反。三個齒輪咬成一圈，會卡死。', 'green'); } },
          { id: 'stairs', r: [60, 170, 170, 330], t: '往下的螺旋樓梯。爺爺和潘婆婆在下面等著。' },
          { id: 'slit', r: [270, 140, 76, 180], t: '細細的窗戶外面，港口的船慢慢地搖。' },
        ],
      },
      w: {
        draw: s => A.wall(WALL) + Deco.ceilBeam() + weights() + `<g filter="url(#ds)"><rect x="440" y="200" width="300" height="290" rx="10" fill="#5a6a74" ${SW}/><rect x="440" y="200" width="300" height="290" rx="10" fill="url(#bevel)"/><rect x="440" y="200" width="300" height="290" rx="10" fill="url(#p-noise)"/>` +
          (s.lockOk ? `<rect x="460" y="220" width="200" height="250" rx="6" fill="#2a2a32" ${SW2}/>` + (s.idlers ? '' : `<g transform="translate(500 290) scale(1.2)"><rect x="0" y="10" width="100" height="70" rx="6" fill="#7a2a3a" ${SW2}/><g transform="translate(0 0)">${ITEMS.idlers.ic()}</g></g>`) + `<path d="M460 220l-50 18v214l50 18z" fill="#6a7a84" ${SW}/>` : `<rect x="460" y="220" width="200" height="250" rx="6" fill="#6a7a84" ${SW2}/><rect x="476" y="250" width="168" height="40" rx="4" fill="#2a3a2a"/>${A.txt(560, 278, '- - - -', 22, '#6fd08a', 'middle', 900)}${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<rect x="${492 + (i % 3) * 46}" y="${306 + ((i / 3) | 0) * 46}" width="36" height="36" rx="6" fill="#e8d4b2" ${SW2}/>`).join('')}`) +
          `<rect x="676" y="300" width="40" height="80" rx="8" fill="url(#silver)" ${SW2}/></g>` + Deco.toolShelf(820, 500) + A.light(),
        hot: s => [
          { id: 'locker', r: [440, 200, 300, 290], on: C => onLocker(C) },
          { id: 'weights', r: [100, 240, 160, 230], t: '兩顆好重的鐵砣，用鐵鍊吊著。它們往下掉的力氣，就是大鐘的「發條」。' },
          { id: 'tools', r: [810, 190, 130, 310], t: '師傅的工具櫃：銼刀、鉗子、油壺……都整理得好好的。' },
        ],
      },
      n: {
        draw: s => A.wall(WALL) + Deco.ceilBeam() + face(500, 270, 190, s) + A.shaft('330 120L670 120L840 500L160 500', 0.22) + A.light(),
        hot: s => [{ id: 'face', c: [500, 270, 200], go: 'face' }],
      },
      face: {
        back: 'n', title: '鐘面背後',
        draw: s => A.closeBg('#5a4a3a', 'brick') + face(500, 290, 240, s, true),
        hot: s => [{ id: 'dial', c: [500, 290, 240], on: C => { s.saw = 1; G.toast(s.read ? '從背面看，數字和指針都是反的。筆記說：玻璃上的「3」從裡面看會跑到左邊……' : '好大的鐘面！從背面看，數字好像都反過來了。'); } }],
      },
      e: {
        draw: s => A.wall(WALL) + Deco.ceilBeam() + `<g filter="url(#ds)"><rect x="150" y="110" width="560" height="380" rx="14" fill="#3b2a1f" ${SW}/><rect x="150" y="110" width="560" height="380" rx="14" fill="url(#p-gear)" opacity=".5"/></g>` + mini(s) +
          `<g filter="url(#ds)"><rect x="790" y="240" width="80" height="250" rx="8" fill="#5a4a3a" ${SW}/><path d="M830 380L${s.running ? 870 : 790} 270" stroke="#4a3222" stroke-width="14" stroke-linecap="round"/><path d="M830 380L${s.running ? 870 : 790} 270" stroke="url(#silver)" stroke-width="8" stroke-linecap="round"/><circle cx="${s.running ? 870 : 790}" cy="270" r="16" fill="#e0504a" ${SW}/><circle cx="830" cy="380" r="12" fill="url(#brass)" ${SW2}/></g>` + A.txt(830, 470, '啟動桿', 15, '#fff3dc', 'middle', 900) + A.light(),
        hot: s => [
          { id: 'board', r: [150, 110, 560, 380], on: C => onBoard(C), use: { idlers: C => { s.idlersIn = 1; C.take('idlers'); Snd.play('click'); G.toast('把四個小齒輪拿出來，準備裝上空軸。'); onBoard(C); } } },
          { id: 'lever', r: [780, 230, 100, 270], on: C => onLever(C) },
        ],
      },
    },
    steps: [
      { goal: '讀師傅的筆記', done: s => s.read, h: ['機械室裡有師傅留下的東西。', '南邊的工作桌上有一本筆記。', '點南邊桌上的「師傅的筆記」。'] },
      { goal: '打開保險櫃', done: s => s.lockOk, h: ['筆記說：大鐘停下的時間就是保險櫃的密碼。北邊就是大鐘的背面。', '從裡面看，鐘面左右相反：指針指向左邊的時候，其實是指著「3」那一邊。看看玻璃上反過來的數字。', s => `大鐘停在 ${V(s).h} 點 ${String(V(s).m).padStart(2, '0')} 分，西邊保險櫃的密碼是 ${CODE(s)}。`] },
      { goal: '拿到小齒輪', done: s => s.idlers || s.idlersIn, h: ['保險櫃打開了。', '點西邊打開的保險櫃。', '點西邊的保險櫃，拿到小齒輪。'] },
      { goal: '裝好齒輪', done: s => s.gn_tower_ok, h: ['東邊的大木板上有一排空軸。發條順時針轉，指針軸要逆時針轉。', '每咬合一次，方向就反過來。發條到指針軸之間「咬合的次數」要是單數：所以中間要放雙數個齒輪（4 個）；而且不能有三個齒輪互相咬成一圈。', s => '把小齒輪放在這幾個軸上（由上往下數第幾排、由左往右數第幾個）：' + netHint(s)] },
      { goal: '讓大鐘走起來', done: s => s.running, h: ['齒輪裝好了，還差一個動作。', '東邊右邊有一支紅色的啟動桿。', '點東邊的啟動桿。'] },
    ],
  });

  function netHint(s) { const N = NETS[V(s).net], sol = []; const pick = (k, from, acc) => { if (sol.length) return; if (acc.length === 4) { if (W.gEval(N.D, N.O, acc).r === 'ccw') sol.push(acc.slice()); return; } for (let i = from; i < N.pegs.length; i++) { acc.push(N.pegs[i]); pick(k, i + 1, acc); acc.pop(); } }; pick(4, 0, []); const rows = {}; N.pegs.forEach(p => (rows[p[1]] = rows[p[1]] || []).push(p[0])); return sol[0].map(p => `第 ${p[1] + 1} 排第 ${rows[p[1]].sort((a, b) => a - b).indexOf(p[0]) + 1} 個`).join('、') + '。'; }
  function mini(s) { // 東邊牆上的齒輪板（縮小版）
    const N = NETS[V(s).net], pl = s.gn_tower || [], has = p => pl.some(q => q[0] === p[0] && q[1] === p[1]); let o = '';
    const T = (p) => { const [x, y] = W.gpt(...p); return [180 + x * 0.66, 100 + y * 0.66]; };
    N.pegs.forEach(p => { const [x, y] = T(p); o += has(p) ? A.gear(x, y, 36, '#d9b56a', 12) : `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="#f0dcb8" stroke-width="2.4" stroke-dasharray="5 5"/><circle cx="${x}" cy="${y}" r="6" fill="#c9cfd6"/>`; });
    [[N.D, '#9aa6b0', s.running ? 'spin' : ''], [N.O, '#c9a14a', s.running ? 'spinr' : '']].forEach(([p, c, cls]) => { const [x, y] = T(p); if (cls) A.fx(`<g class="${cls}" style="animation-duration:5s">${A.gear(x, y, 36, c, 12)}</g>`); else o += A.gear(x, y, 36, c, 12); });
    return o;
  }
  function onLocker(C) {
    const s = C.s;
    if (s.lockOk) { if (!s.idlers && !s.idlersIn) { s.idlers = 1; C.give('idlers'); } else G.toast('保險櫃裡空空的。'); return; }
    W.keypad(C, { title: '師傅的保險櫃', sub: '四位數的密碼。門上刻著一個小小的鐘。', len: 4, code: CODE(s), okMsg: '保險櫃打開了！', failMsg: '「嗶嗶！」密碼不對。', ok: () => { s.lockOk = 1; Snd.play('door'); } });
  }
  function onBoard(C) {
    const s = C.s;
    if (s.gn_tower_ok) { G.toast('齒輪都裝好了，咬得剛剛好。'); return; }
    if (!s.idlersIn) { G.toast(s.idlers ? '空軸上可以裝小齒輪。拿著小齒輪點這裡。' : '木板上有發條、指針軸，中間是一排空空的軸。好像少了齒輪。'); return; }
    const N = NETS[V(s).net];
    W.gearNet(C, { id: 'tower', D: N.D, O: N.O, pegs: N.pegs, k: 4, want: 'ccw', title: '鐘塔的齒輪', sub: '點空軸放上小齒輪（再點一次拆下來）。<b>發條順時針轉</b>，要讓<b>指針軸逆時針轉</b>（綠色箭頭）。兩個齒輪咬在一起，方向會相反；三個咬成一圈會卡死。', ok: () => G.toast('齒輪都接上了！右邊的啟動桿好像可以拉了。') });
  }
  function onLever(C) {
    const s = C.s;
    if (s.running) { C.win(); return; }
    if (!s.gn_tower_ok) { Snd.play('wrong'); G.toast('拉不動……齒輪還沒接好，大鐘轉不起來。'); return; }
    s.running = 1; Snd.play('click'); setTimeout(() => Snd.play('chime'), 300); C.render(); C.win();
  }
})();
