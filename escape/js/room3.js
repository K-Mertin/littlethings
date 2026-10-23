'use strict';
// 第 3 章：溫室
(() => {
  const WALL = { c: '#bfe3e6', pat: 'glass', wain: '#c9763f', wy: 392, trim: '#f4fbf6', floor: 'tile', fc: ['#d98a5f', '#c97a4f'] };
  const GRID = ['....T.', '..M..#', '#.....', '.MS.M.', '...#..'];
  const COLS = 6, ROWS = 5;
  const FLOW = { 紅: '#e0504a', 橙: '#f08a3a', 黃: '#f2c232', 綠: '#5fae5a', 藍: '#4f8ad8', 紫: '#9a6ac8' };
  const POTC = ['黃', '紅', '藍'];

  Object.assign(ITEMS, {
    shears: { n: '園藝剪', d: '紅色握把的大剪刀，用來修剪植物。', ic: () => `<g transform="rotate(-35 50 50)"><path d="M50 50L52 8l6 2-2 40zM50 50L42 9l6-2 6 43z" fill="#d9dee4" ${SW2}/><circle cx="38" cy="72" r="14" fill="none" stroke="#4a3222" stroke-width="9"/><circle cx="38" cy="72" r="14" fill="none" stroke="#e0504a" stroke-width="5"/><circle cx="64" cy="72" r="14" fill="none" stroke="#4a3222" stroke-width="9"/><circle cx="64" cy="72" r="14" fill="none" stroke="#e0504a" stroke-width="5"/><circle cx="50" cy="52" r="4" fill="url(#brass)" ${SW2}/></g>` },
    mirror: { n: '小鏡子', d: '裝在小木座上的圓鏡子，可以插在什麼地方。', ic: () => `<rect x="40" y="70" width="20" height="18" rx="3" fill="#a8703f" ${SW}/><circle cx="50" cy="44" r="28" fill="#cfeaf2" ${SW}/><path d="M36 34l14-10M34 48l26-18" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` },
    can: { n: '澆水壺', d: '綠色的澆水壺，裡面是空的。', ic: s => `<path d="M24 40h44v40q0 6-6 6H30q-6 0-6-6z" fill="#5fae5a" ${SW}/><path d="M68 50l20-18 4 4-18 22" fill="#5fae5a" ${SW}/><path d="M30 40q16-26 32 0" fill="none" stroke="#4a3222" stroke-width="7"/><path d="M30 40q16-26 32 0" fill="none" stroke="#5fae5a" stroke-width="3"/>` },
    canFull: { n: '裝滿水的澆水壺', d: '沉甸甸的，裝滿了清水。', ic: s => ITEMS.can.ic() + `<path d="M94 30q4 10 0 14q-4-4 0-14zM86 22q4 10 0 14q-4-4 0-14z" fill="#8fd0ff" ${SW2}/><rect x="30" y="46" width="32" height="8" fill="#8fd0ff" opacity=".8"/>` },
  });

  // 光線模擬：回傳經過的格子與是否到達目標
  function trace(s) {
    let c = 0, r = 1, dc = 1, dr = 0; const path = [[-1.1, 1]]; let hit = false;
    for (let k = 0; k < 40; k++) {
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) { path.push([c, r]); break; }
      path.push([c, r]);
      const ch = GRID[r][c];
      if (ch === 'T') { hit = true; break; }
      if (ch === '#') break;
      const m = (ch === 'M' || (ch === 'S' && s.mirrorIn)) ? s.mir[c + ',' + r] : null;
      if (m === '/') { [dc, dr] = [-dr, -dc]; }
      else if (m === '\\') { [dc, dr] = [dr, dc]; }
      c += dc; r += dr;
    }
    return { path, hit };
  }
  const board = (s, big) => {
    const cs = 100; let o = `<rect x="-90" y="-20" width="${COLS * cs + 110}" height="${ROWS * cs + 40}" rx="18" fill="#8c5634" ${SW}/><rect x="0" y="0" width="${COLS * cs}" height="${ROWS * cs}" rx="8" fill="#5a3a24"/>`;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = c * cs, y = r * cs, ch = GRID[r][c];
      o += `<rect x="${x + 4}" y="${y + 4}" width="${cs - 8}" height="${cs - 8}" rx="8" fill="#6b4a33"/>`;
      if (ch === '#') o += `<path d="M${x + 22} ${y + 40}h56l-8 48H${x + 30}z" fill="#d9774b" ${SW}/><path d="M${x + 50} ${y + 40}q-20-30 0-34q20 4 0 34" fill="#5f9e5a" ${SW2}/>`;
      if (ch === 'T') o += s.lightOk ? `<circle cx="${x + 50}" cy="${y + 50}" r="46" fill="url(#sunG)"/>${[...Array(12)].map((_, i) => `<ellipse cx="${x + 50}" cy="${y + 28}" rx="9" ry="22" fill="#f2c232" ${SW2} transform="rotate(${i * 30} ${x + 50} ${y + 50})"/>`).join('')}<circle cx="${x + 50}" cy="${y + 50}" r="17" fill="#8c5634" ${SW2}/>` : `<path d="M${x + 50} ${y + 90}v-30" stroke="#5f9e5a" stroke-width="6"/><path d="M${x + 50} ${y + 20}q22 18 0 44q-22-26 0-44z" fill="#9fd08a" ${SW}/>${A.txt(x + 50, y + 98, '目標', 14, '#fff3c8')}`;
      if (ch === 'M' || ch === 'S') {
        o += `<circle cx="${x + 50}" cy="${y + 50}" r="34" fill="${ch === 'S' ? '#3b2a1f' : '#7a5a40'}" ${SW2} ${ch === 'S' ? 'stroke-dasharray="6 5"' : ''}/>`;
        const m = s.mir[c + ',' + r];
        if (ch === 'M' || s.mirrorIn) o += `<g transform="rotate(${m === '/' ? -45 : 45} ${x + 50} ${y + 50})"><rect x="${x + 12}" y="${y + 44}" width="76" height="12" rx="4" fill="#cfeaf2" ${SW}/><path d="M${x + 18} ${y + 48}h30" stroke="#fff" stroke-width="3"/></g>`;
        else o += A.txt(x + 50, y + 56, '空座', 15, '#c9a87f');
        if (big) o += `<rect data-mc="${c},${r}" x="${x}" y="${y}" width="${cs}" height="${cs}" fill="transparent" style="cursor:pointer"/>`;
      }
    }
    o += `<g transform="translate(-60 ${1.5 * cs})"><circle r="30" fill="url(#sunG)"/><circle r="16" fill="#ffe27a" ${SW}/></g>`;
    const t = trace(s);
    const pts = t.path.map(([c, r]) => `${c * cs + 50},${r * cs + 50}`).join(' ');
    o += `<polyline pointer-events="none" points="${pts}" fill="none" stroke="#fff6b0" stroke-width="16" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/><polyline pointer-events="none" points="${pts}" fill="none" stroke="#ffd84a" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;
    return o;
  };
  const pot = (x, y, n, s) => {
    let o = A.sh(x, y + 2, 50, 9);
    if (s['pot' + n]) {
      const c = FLOW[POTC[n - 1]];
      o += `<path d="M${x} ${y - 50}V${y - 150}" stroke="#4f8a4a" stroke-width="7"/><path d="M${x} ${y - 90}q-30-10-34-30q24 0 34 20M${x} ${y - 110}q30-8 34-28q-24 0-34 20" fill="#6fae5a" ${SW2}/>`;
      for (let i = 0; i < 6; i++) o += `<ellipse cx="${x}" cy="${y - 178}" rx="11" ry="20" fill="${c}" ${SW2} transform="rotate(${i * 60} ${x} ${y - 158})"/>`;
      o += `<circle cx="${x}" cy="${y - 158}" r="11" fill="#ffe27a" ${SW2}/>`;
    } else o += `<path d="M${x - 4} ${y - 52}q-2-12 6-18" stroke="#9a8a5a" stroke-width="4" fill="none"/>`;
    o += `<path d="M${x - 44} ${y - 60}h88l-10 60h-68z" fill="#d9774b" ${SW}/><rect x="${x - 50}" y="${y - 70}" width="100" height="16" rx="5" fill="#e58a5c" ${SW}/>`;
    o += `<circle cx="${x}" cy="${y - 28}" r="15" fill="#fff6e8" ${SW2}/>` + A.txt(x, y - 21, n, 20, '#8c3a1a', 'middle', 900);
    return o;
  };
  const sunflowerBig = (x, y, s) => s.lightOk ?
    `<path d="M${x} ${y}v120" stroke="#4f8a4a" stroke-width="10"/>${[...Array(14)].map((_, i) => `<ellipse cx="${x}" cy="${y - 42}" rx="13" ry="30" fill="#f2c232" ${SW2} transform="rotate(${i * 25.7} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="26" fill="#8c5634" ${SW}/>` +
    (s.canTaken ? '' : `<g transform="translate(${x - 60} ${y + 60}) scale(.9)">${ITEMS.can.ic()}</g>${A.gear(x + 46, y + 90, 22)}`)
    : `<path d="M${x} ${y}v120" stroke="#4f8a4a" stroke-width="10"/><path d="M${x} ${y - 40}q36 26 0 70q-36-44 0-70z" fill="#9fd08a" ${SW}/>`;

  ROOMS.push({
    id: 'r3', no: 3, name: '溫室', en: 'THE GREENHOUSE', mood: 'green', par: 600, walls: ['n', 'e', 's', 'w'],
    init: () => ({ mir: { '2,1': '/', '1,3': '\\', '2,3': '/', '4,3': '\\' } }),
    intro: [
      '玻璃屋頂下，陽光暖洋洋的。到處都是爺爺種的花草，空氣裡有泥土的香味。',
      { w: 'mochi', t: '喵～', sfx: 'meow' },
      '麻糬追著一隻蝴蝶跑來跑去。北邊有一座奇怪的木頭台子，上面擺滿了小鏡子。',
    ],
    outro: [
      { t: '三朵花的顏色對上了，玻璃門「叮鈴」一聲滑開。', sfx: 'door' },
      '門後飄來一股香甜的味道……是剛烤好的蛋糕？',
    ],
    views: {
      n: {
        draw: s => A.wall(WALL) + `<path d="M300 470l20-30h360l20 30z" fill="#7a4a2a" ${SW}/><g transform="translate(330 175) scale(.52)" filter="url(#ds)">${board(s)}</g>` + `<g>${sunflowerBig(830, 230, s)}</g>` + A.plant(120, 480, 1.3, '#d9774b', '#4f8a4a') + A.txt(500, 160, '陽光導引台', 22, '#fff8e8', 'middle', 900, 'stroke="#4a3222" stroke-width="5" paint-order="stroke"') + A.light(),
        hot: s => [
          { id: 'board', r: [270, 140, 420, 330], go: 'board' },
          { id: 'flower', r: [740, 140, 180, 280], on: C => { if (!s.lightOk) G.toast('一株還沒開花的向日葵花苞。它好像在等陽光。'); else if (!s.canTaken) { s.canTaken = 1; C.give('can', true); C.give('g3', true); Snd.play('pick'); G.toast('向日葵下面藏著「<b>澆水壺</b>」和「<b>音符齒輪 Ⅲ</b>」！'); } else G.toast('向日葵開得好燦爛。'); } },
        ],
      },
      board: {
        back: 'n', title: '陽光導引台',
        draw: s => A.closeBg('#bfe3e6', 'glass') + `<g transform="translate(250 60) scale(.84)" filter="url(#ds)">${board(s)}</g>` + A.light(),
        hot: s => [{ id: 'panel', r: [170, 40, 680, 500], on: C => openBoard(C), use: { mirror: C => { C.take('mirror'); s.mirrorIn = 1; Snd.play('click'); G.toast('把小鏡子插進空座了。'); } } }],
      },
      e: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)"><rect x="120" y="330" width="300" height="150" rx="6" fill="#e9e2d4" ${SW}/><path d="M110 330h320v-24H110z" fill="#f4f0e6" ${SW}/><path d="M150 312q0-20 120-20t120 20" fill="#cfe0e6" ${SW2}/><path d="M270 300v-70q0-20 30-20h20v20" fill="none" stroke="#9aa6b0" stroke-width="14"/><path d="M270 300v-70q0-20 30-20h20v20" fill="none" ${SW2}/><circle cx="240" cy="250" r="12" fill="#e0504a" ${SW2}/><rect x="140" y="350" width="120" height="110" rx="4" fill="#d9d0bf" ${SW2}/><rect x="280" y="350" width="120" height="110" rx="4" fill="#d9d0bf" ${SW2}/></g>` +
          (s.filling ? `<path d="M320 240v60" stroke="#8fd0ff" stroke-width="6"/>` : '') +
          `<g filter="url(#ds)"><path d="M610 470l-20-110h220l-20 110z" fill="#d9a45a" ${SW}/><path d="M600 380h200M606 410h188M612 440h176" stroke="#a87a3a" stroke-width="4"/><path d="M620 360q80-90 160 0" fill="none" stroke="#a87a3a" stroke-width="10"/><path d="M620 360q80-90 160 0" fill="none" ${SW2}/>` +
          (s.shears ? '' : `<g transform="translate(650 290) scale(.9)">${ITEMS.shears.ic()}</g>`) + `<path d="M720 352q20-40 50-30" stroke="#5f9e5a" stroke-width="5" fill="none"/></g>` +
          A.shelf(560, 170, 300) + A.plant(620, 170, 0.5, '#4f9e9a') + A.plant(720, 170, 0.45, '#e0a43a') + A.plant(810, 170, 0.5, '#d9774b') + A.light(),
        hot: s => [
          { id: 'sink', r: [110, 200, 320, 280], on: () => G.toast('一個大水槽。轉開紅色把手就會有水。'), use: { can: C => { C.take('can'); C.give('canFull', true); Snd.play('water'); G.toast('嘩啦啦……澆水壺<b>裝滿水</b>了！'); }, canFull: C => G.toast('澆水壺已經是滿的了。') } },
          { id: 'basket', r: [580, 260, 250, 220], on: C => { if (!s.shears) { s.shears = 1; C.give('shears'); } else G.toast('籃子裡只剩一些小石頭。'); } },
          { id: 'shelf', r: [560, 60, 300, 130], t: '架子上的小盆栽都長得很好。' },
        ],
      },
      s: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)"><rect x="140" y="430" width="720" height="24" rx="6" fill="#a8703f" ${SW}/><path d="M170 454v30M830 454v30M500 454v30" stroke="#7a4a2a" stroke-width="12"/></g>` + pot(260, 430, 1, s) + pot(500, 430, 2, s) + pot(740, 430, 3, s) +
          `<g transform="translate(420 70)">${A.paper(0, 0, 160, 90, 2, '#fff8e0', 0)}${A.txt(80, 30, '爺爺特製', 16, '#8c3a1a')}${A.txt(80, 54, '魔法速生種子', 18, '#4a3222', 'middle', 900)}${A.txt(80, 78, '澆一次水就開花', 13, '#7a6250', 'middle', 500)}</g>` + A.light(),
        hot: s => [1, 2, 3].map(n => ({ id: 'pot' + n, r: [180 + (n - 1) * 240, 220, 160, 230], on: () => G.toast(s['pot' + n] ? `${n} 號花盆開出了${POTC[n - 1]}色的花。` : `${n} 號花盆的土乾巴巴的，裡面好像埋了種子。`), use: { canFull: C => { if (s['pot' + n]) { G.toast('這盆已經開花了。'); return; } s['pot' + n] = 1; Snd.play('water'); setTimeout(() => Snd.play('light'), 300); G.toast(`澆了水……${n} 號花盆冒出芽，「啵」地開出一朵<b>${POTC[n - 1]}色</b>的花！`); }, can: () => G.toast('澆水壺是空的，要先裝水。') } })).concat([{ id: 'seed', r: [410, 60, 180, 110], t: '種子包裝：「爺爺特製・魔法速生種子・澆一次水就開花」。' }]),
      },
      w: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)"><rect x="380" y="120" width="240" height="350" rx="6" fill="#f4fbf6" ${SW}/><rect x="396" y="136" width="100" height="318" fill="${s.doorOpen ? '#fff4d6' : '#d6eef2'}" ${SW2}/><rect x="504" y="136" width="100" height="318" fill="${s.doorOpen ? '#fff4d6' : '#d6eef2'}" ${SW2}/><path d="M410 180l40-30M410 220l70-50" stroke="#fff" stroke-width="6" stroke-linecap="round"/></g>` +
          `<g transform="translate(640 260)"><rect x="0" y="0" width="70" height="120" rx="8" fill="#f4f0e6" ${SW}/>${[0, 1, 2].map(i => A.sym(4, 35, 24 + i * 36, 0.9, ['#f2c232', '#e0504a', '#4f8ad8'][i] && '#e4d6c0')).join('')}</g>` +
          `<g filter="url(#ds)"><rect x="90" y="250" width="200" height="220" rx="6" fill="#7a5a40" ${SW}/><rect x="104" y="266" width="82" height="190" rx="4" fill="#8c6a4a" ${SW2}/><rect x="194" y="266" width="82" height="190" rx="4" fill="${s.vines && s.mirrorTaken ? '#3b2a1f' : '#8c6a4a'}" ${SW2}/></g>` +
          (s.vines ? `<path d="M120 470q-20-60 10-120" stroke="#4f8a4a" stroke-width="6" fill="none" opacity=".6"/>` : `<g stroke="#3f7f3a" stroke-width="9" fill="none" stroke-linecap="round"><path d="M80 470q60-80 10-140t80-90 60 60-40 130 120 40"/><path d="M300 460q-80-40-40-120t-80-40-60 80"/><path d="M90 300q100 20 200-30"/></g>${[...Array(14)].map((_, i) => `<ellipse cx="${100 + (i * 47) % 190}" cy="${270 + (i * 71) % 190}" rx="14" ry="8" fill="#6fae5a" ${SW2} transform="rotate(${i * 40} ${100 + (i * 47) % 190} ${270 + (i * 71) % 190})"/>`).join('')}`) +
          (s.vines && !s.mirrorTaken ? `<g transform="translate(200 330) scale(.7)">${ITEMS.mirror.ic()}</g>` : '') + A.plant(880, 480, 1.2, '#4f9e9a', '#4f8a4a') + A.light(),
        hot: s => [
          { id: 'door', r: [380, 120, 240, 350], on: C => { if (s.doorOpen) C.win(); else G.toast('玻璃門鎖住了。旁邊有一個花朵形狀的鎖。'); } },
          { id: 'lock', r: [630, 250, 90, 140], on: C => W.wheels(C, { id: 'flowerLock', title: '花朵鎖', sub: '鎖上刻著：「讓花兒照著自己的號碼排好隊。」三個轉輪上面寫著 1、2、3。', wheels: [1, 2, 3].map(n => ({ label: `<b style="font-size:20px">${n}</b>`, vals: Object.keys(FLOW).map(k => `<svg viewBox="-20 -20 40 40">${A.sym(4, 0, 0, 1, FLOW[k])}</svg>`), kind: 'svg' })), check: i => i.map(k => Object.keys(FLOW)[k]).join('') === POTC.join(''), ok: C => { s.doorOpen = 1; Snd.play('door'); C.win(); }, okMsg: '叮鈴！' }) },
          { id: 'cab', r: [80, 240, 220, 240], on: C => { if (!s.vines) G.toast('一個小櫃子，被粗粗的藤蔓纏得緊緊的，打不開。'); else if (!s.mirrorTaken) { s.mirrorTaken = 1; C.give('mirror'); } else G.toast('櫃子裡空空的。'); }, use: { shears: C => { C.take('shears'); s.vines = 1; Snd.play('snip'); G.toast('喀嚓喀嚓！剪掉藤蔓，櫃門打開了。裡面有一面小鏡子。'); } } },
        ],
      },
    },
    steps: [
      { goal: '找一樣能修剪植物的工具', done: s => s.shears, h: ['東邊牆的籃子裡好像有東西。', '轉到東邊，點右邊的籃子。', '點籃子，拿到「園藝剪」。'] },
      { goal: '打開被藤蔓纏住的櫃子', done: s => s.mirrorTaken, h: ['西邊有個櫃子被藤蔓纏住了。', '拿著園藝剪點西邊的櫃子。', '用園藝剪剪掉藤蔓，再點櫃子拿到「小鏡子」。'] },
      { goal: '把陽光引到向日葵花苞', done: s => s.lightOk, h: ['陽光導引台上有一個「空座」，可以插鏡子。點鏡子可以改變它的方向。', '先把小鏡子插進空座。光從左邊第二排射進來，要讓它往下、往右、再往上，到達最上面的目標。', '把第二排的鏡子轉成「\\」、空座的鏡子轉成「\\」、右下那面鏡子轉成「/」，左下那面不用管。'] },
      { goal: '拿到向日葵送的禮物', done: s => s.canTaken, h: ['向日葵開花了！', '點北邊開花的向日葵。', '點向日葵，拿到澆水壺和音符齒輪。'] },
      { goal: '讓種子開花', done: s => s.pot1 && s.pot2 && s.pot3, h: ['南邊的花盆裡有種子，種子包裝說澆水就會開花。澆水壺是空的。', '先拿空澆水壺點東邊的水槽裝水，再一盆一盆澆。', '裝滿水後，拿著澆水壺分別點 1、2、3 號花盆。'] },
      { goal: '打開玻璃門', done: s => s.doorOpen, h: ['花朵鎖說：讓花兒照著自己的號碼排好隊。', '轉輪 1、2、3 對應南邊的 1、2、3 號花盆開出的花色。', '答案是：1 黃、2 紅、3 藍。'] },
    ],
  });

  function openBoard(C) {
    const s = C.s;
    const draw = () => `<svg class="wsvg" viewBox="-100 -30 720 560">${board(s, true)}</svg>`;
    const body = G.modal(`<h3>陽光導引台</h3><p class="sub">點鏡子可以轉動方向（／或＼）。讓左邊射進來的陽光照到最上面的花苞。${s.mirrorIn ? '' : '<br><b>有一個空座還沒有鏡子。</b>'}</p><div class="bd">${draw()}</div><p class="msg"></p>`, { w: 620 });
    body.onclick = e => {
      const g = e.target.closest('[data-mc]'); if (!g || s.lightOk) return;
      const k = g.dataset.mc, [c, r] = k.split(',').map(Number);
      if (GRID[r][c] === 'S' && !s.mirrorIn) { W.fail(body, '這個座位是空的，要先找一面鏡子插上。'); return; }
      s.mir[k] = s.mir[k] === '/' ? '\\' : '/'; Snd.play('click');
      body.querySelector('.bd').innerHTML = draw();
      if (trace(s).hit) { s.lightOk = 1; Snd.play('light'); W.success(C, body, '陽光照到花苞了！向日葵開花了！', () => G.toast('北邊的向日葵開花了！'), 1500); body.querySelector('.bd').innerHTML = draw(); }
    };
  }
})();
