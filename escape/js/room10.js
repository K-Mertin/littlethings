'use strict';
// 番外 2：月光庭院（踩石頭過池塘、螢火蟲記憶、燈籠倒影、打開時光寶盒）
(() => {
  const PHASE = ['新月', '半月', '滿月'];
  const RULE = { 3: '3 的倍數', 4: '4 的倍數', 5: '5 的倍數' };
  const moonIc = (k, x, y, r = 12) => k === 0 ? `<circle cx="${x}" cy="${y}" r="${r}" fill="#2a3060" stroke="#c9d4ee" stroke-width="2.4"/>` : k === 1 ? `<circle cx="${x}" cy="${y}" r="${r}" fill="#2a3060" stroke="#c9d4ee" stroke-width="2.4"/><path d="M${x} ${y - r}a${r} ${r} 0 0 1 0 ${r * 2}z" fill="#fff6c8"/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff6c8" stroke="#c9d4ee" stroke-width="2.4"/>`;
  // 產生池塘的石頭：一條從下到上的路都是「規則的倍數」，其他石頭都不是
  function genPond(r, k) {
    const R = 5, Cc = 5; let path;
    for (let t = 0; t < 300; t++) { // 找一條「只有一種走法」的路：不相連的兩步不能相鄰，而且要拐彎
      let c = rInt(r, 0, Cc - 1); path = [[R - 1, c]]; let turns = 0;
      for (let row = R - 1; row > 0; row--) {
        const steps = rInt(r, 0, 3), dir = c === 0 ? 1 : c === Cc - 1 ? -1 : (r() < 0.5 ? -1 : 1);
        if (steps) turns++;
        for (let i = 0; i < steps; i++) { const nc = c + dir; if (nc < 0 || nc >= Cc) break; c = nc; path.push([row, c]); }
        path.push([row - 1, c]);
      }
      const bad = path.some((p, i) => path.some((q, j) => j > i + 1 && Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) === 1));
      if (!bad && turns >= 2) break;
    }
    const g = [];
    for (let i = 0; i < R; i++) { g.push([]); for (let j = 0; j < Cc; j++) { let n; do { n = rInt(r, 2, 9 * k); } while (n % k === 0); g[i].push(n); } }
    path.forEach(([i, j]) => g[i][j] = k * rInt(r, 1, 9));
    return { grid: g, k, path };
  }
  const gen = (r, canon) => {
    const syms = canon ? [3, 6, 1] : shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], r).slice(0, 3);
    let seq = [0, 2, 1, 3, 2]; if (!canon) { seq = [rInt(r, 0, 3)]; while (seq.length < 5) { const k = rInt(r, 0, 3); if (k !== seq[seq.length - 1]) seq.push(k); } }
    let sky = [0, 1, 4, 7]; if (!canon) { do { sky = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], r).slice(0, rInt(r, 4, 5)).sort((a, b) => a - b); } while (sky.map(flip).sort((a, b) => a - b).join() === sky.join()); }
    return { syms, seq, sky, pond: genPond(r, canon ? 3 : [3, 4, 5][rInt(r, 0, 2)]) };
  };
  const flip = p => (2 - ((p / 3) | 0)) * 3 + p % 3; // 上下顛倒
  const CANON = gen(makeRng(20261023), true);
  const V = s => (s && s.v) || CANON;

  Object.assign(ITEMS, {
    moonStone: { n: '月亮石', d: '圓圓的白色石頭，在月光下會微微發亮。', ic: () => `<circle cx="50" cy="50" r="40" fill="url(#lampG)"/><circle cx="50" cy="50" r="26" fill="#f4f0ff" ${SW}/><circle cx="42" cy="42" r="6" fill="#d8d4ec"/><circle cx="58" cy="58" r="4" fill="#d8d4ec"/><circle cx="50" cy="50" r="26" fill="url(#ballG)"/>` },
    fireflyJar: { n: '螢火蟲瓶', d: '裝滿螢火蟲的玻璃瓶，像一盞會呼吸的小燈。', ic: () => `<rect x="34" y="16" width="32" height="10" rx="3" fill="#b07644" ${SW2}/><path d="M30 28h40v50q0 8-8 8H38q-8 0-8-8z" fill="#cfe8d0" fill-opacity=".4" ${SW}/><circle cx="50" cy="56" r="26" fill="url(#lampG)"/>${[[42, 50], [56, 44], [50, 66], [60, 62], [40, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#fff6a0"/>`).join('')}` },
  });

  const night = (moonX = 820) => {
    let o = `<rect width="1000" height="625" fill="url(#skyNight)"/>`;
    for (let i = 0; i < 40; i++) { const x = (i * 157) % 1000, y = (i * 83) % 300; o += `<circle cx="${x}" cy="${y}" r="${0.8 + (i % 3) * 0.6}" fill="#fff8d8" opacity="${0.4 + (i % 4) * 0.15}"/>`; if (i % 9 === 0) A.twinkle(x, y, 2.4); }
    if (moonX) o += `<circle cx="${moonX}" cy="100" r="110" fill="#fff6d0" opacity=".08"/><circle cx="${moonX}" cy="100" r="60" fill="#fff6d0" opacity=".15"/><circle cx="${moonX}" cy="100" r="40" fill="#fff8e0"/><circle cx="${moonX - 12}" cy="92" r="7" fill="#efe6c4"/><circle cx="${moonX + 10}" cy="112" r="5" fill="#efe6c4"/>`;
    o += `<path d="M0 330Q200 280 400 320T800 300T1000 320V625H0z" fill="#1e3a3a"/>`;
    for (let i = 0; i < 14; i++) o += `<circle cx="${i * 78}" cy="${352 - (i % 3) * 12}" r="${48 + (i % 2) * 14}" fill="${i % 2 ? '#24483a' : '#2a5040'}"/>`;
    o += `<rect y="380" width="1000" height="245" fill="#2f5a3a"/><rect y="380" width="1000" height="245" fill="url(#p-noise)"/><rect y="380" width="1000" height="60" fill="url(#aoDn)" opacity=".7"/>`;
    for (let i = 0; i < 60; i++) { const x = (i * 97) % 1000, y = 450 + (i * 37) % 170; o += `<path d="M${x} ${y}l-4-12M${x} ${y}l2-14M${x} ${y}l6-10" stroke="#3f7a4a" stroke-width="2.5" stroke-linecap="round"/>`; }
    for (let i = 0; i < 8; i += 2) A.fx(`<g class="fly" style="animation-duration:${6 + i % 4}s;${A.ad(7 + i)}"><circle class="glowp" cx="${80 + i * 120}" cy="${300 + (i % 3) * 60}" r="9" fill="url(#lampG)"/><circle cx="${80 + i * 120}" cy="${300 + (i % 3) * 60}" r="2.6" fill="#fff6a0"/></g>`);
    return o;
  };
  const sign = (x, y, t) => `<g filter="url(#ds)"><path d="M${x} ${y + 40}v70" stroke="#6b4a33" stroke-width="10"/><rect x="${x - 70}" y="${y - 20}" width="140" height="64" rx="6" fill="#a8703f" ${SW}/><rect x="${x - 70}" y="${y - 20}" width="140" height="64" rx="6" fill="url(#p-wood)"/>${A.txt(x, y + 20, t, 18, '#fff3dc', 'middle', 900)}</g>`;
  const symStone = (x, y, k, sym, shown) => `<g filter="url(#ds)"><path d="M${x - 46} ${y}q-6-50 20-64h52q26 14 20 64z" fill="#7a7a80" ${SW}/><path d="M${x - 46} ${y}q-6-50 20-64h52q26 14 20 64z" fill="url(#cyl)"/></g>${moonIc(k, x - 22, y - 38, 11)}` + (shown ? `<circle cx="${x + 14}" cy="${y - 34}" r="26" fill="url(#lampG)"/>${A.sym(sym, x + 14, y - 34, 1, '#fff6c8')}` : `<circle cx="${x + 14}" cy="${y - 34}" r="14" fill="#5a5a60" opacity=".6"/>`);
  const lanternG = (x, y, on, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 2, 24, 6)}<rect x="-14" y="-10" width="28" height="10" rx="2" fill="#7a7a80" ${SW2}/><rect x="-7" y="-26" width="14" height="16" fill="#8a8a90" ${SW2}/><rect x="-17" y="-50" width="34" height="24" rx="3" fill="${on ? '#ffe9a0' : '#4a4a52'}" ${SW2}/><rect x="-9" y="-45" width="18" height="14" rx="2" fill="${on ? '#fff6c8' : '#3a3a40'}"/>${on ? `<circle cy="-38" r="36" fill="url(#lampG)"/>` : ''}<path d="M-26 -50h52l-26-18z" fill="#7a7a80" ${SW2}/></g>`;
  const lanPos = p => { const row = (p / 3) | 0, col = p % 3; return [700 + (col - 1) * (95 + row * 28), 300 + row * 66, 0.62 + row * 0.16]; };
  const skyDots = (pat, x, y, gap, r = 6) => { let o = ''; for (let p = 0; p < 9; p++) { const on = pat.includes(p), cx = x + (p % 3) * gap, cy = y + ((p / 3) | 0) * gap; o += on ? `<circle cx="${cx}" cy="${cy}" r="${r * 2.4}" fill="#fff6c8" opacity=".25"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff8d8"/>` : `<circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="#c9d4ee" opacity=".4"/>`; } return o; };
  const chest = (x, y, s) => `<g transform="translate(${x} ${y})">${A.sh(0, 4, 120, 14)}<rect x="-110" y="-80" width="220" height="84" rx="8" fill="#7a4a2a" ${SW}/><rect x="-110" y="-80" width="220" height="84" rx="8" fill="url(#cyl)"/>${s.chestOpen ? `<path d="M-116 -80l20-60h192l20 60z" fill="#8c5634" ${SW}/><circle cy="-90" r="60" fill="url(#lampG)"/>` : `<path d="M-116 -80q116-60 232 0z" fill="#8c5634" ${SW}/><circle cx="-60" cy="-52" r="18" fill="${s.stoneIn ? '#f4f0ff' : '#2a1a10'}" ${SW2}/>${s.stoneIn ? `<circle cx="-60" cy="-52" r="30" fill="url(#lampG)"/>` : ''}<rect x="-20" y="-66" width="110" height="40" rx="6" fill="url(#brass)" ${SW2}/>${[0, 1, 2].map(i => moonIc(i, -2 + i * 36, -46, 9)).join('')}`}<path d="M-110 -40h220" stroke="url(#brass)" stroke-width="6"/></g>`;

  ROOMS.push({
    id: 'r10', no: 10, bonus: true, name: '月光庭院', en: 'THE MOONLIT GARDEN', mood: 'green', par: 900, walls: ['n', 'e', 's', 'w'],
    init: () => ({ lan: [] }),
    canon: CANON,
    vary: r => gen(r, false),
    note: { v: 'w', x: 330, y: 150, s: 0.9 },
    intro: [
      '地道的盡頭，是一個被高高的樹籬圍起來的小庭院。',
      '月亮好圓好亮，螢火蟲在草叢裡一閃一閃。這裡就是爺爺小時候的「祕密基地」吧？',
      { w: 'mochi', t: '喵～', sfx: 'meow' },
      '西邊的老樹下，露出一個半埋在土裡的木箱子。箱子上刻著三個月亮。',
    ],
    outro: [
      { t: '三個轉輪對齊，箱蓋「啪」地彈開，一陣小小的音樂聲飄了出來。', sfx: 'chime' },
      '箱子裡有一個生鏽的小八音盒、一張泛黃的照片，還有一封信。',
      { l: 1, who: '十歲的一鳴', t: '給長大以後的我：\n你有沒有成為很厲害的機關師傅？\n有沒有做出一棟會唱歌的房子？\n如果有一天，有人幫你打開這個箱子，\n記得跟他說謝謝。' },
      { w: 'gp', e: 'c', t: '「……原來我小時候寫過這樣的信啊。」', sfx: 'meow' },
      { w: 'gp', e: 'h', t: '「謝謝你，孩子。這是爺爺收過最棒的生日禮物──雖然今天是你的生日。」' },
      { t: '月光下，兩個八音盒一起叮叮咚咚地唱著同一首歌。', sfx: 'fanfare' },
      { big: 1, t: '～ 番外篇 完 ～' },
      '謝謝你玩到最後！重玩任何一章，謎題的答案都會改變；也可以試試「挑戰模式」喔。',
    ],
    views: {
      n: {
        draw: s => night(820) + `<ellipse cx="500" cy="520" rx="420" ry="90" fill="#1f3a5a" ${SW}/><ellipse cx="500" cy="520" rx="420" ry="90" fill="url(#gloss)" opacity=".6"/><ellipse cx="760" cy="500" rx="60" ry="10" fill="#fff6d0" opacity=".25"/>` +
          [[260, 540], [330, 500], [420, 530], [500, 490], [590, 525], [680, 500], [740, 540]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="34" ry="12" fill="#8a8a80" ${SW2}/>`).join('') +
          symStone(500, 410, 0, V(s).syms[0], s.pond_ok) + (s.pond_ok && !s.stoneTaken ? `<g transform="translate(560 360) scale(.6)">${ITEMS.moonStone.ic()}</g>` : '') + sign(170, 300, '過河石'),
        hot: s => [
          { id: 'pond', r: [120, 430, 760, 190], on: C => { if (s.pond_ok) { G.toast('已經走過池塘了。'); return; } const P = V(s).pond; W.stones(C, { id: 'pond', grid: P.grid, ok_: n => n % P.k === 0, title: '過河石', sub: `立牌寫著：「<b>只能踩${RULE[P.k]}</b>，其他石頭一踩就沉。」從最下面一排出發，一步一步往上下左右走到對岸。`, okMsg: '到對岸了！', ok: () => G.toast('麻糬跳到對岸，石燈籠旁邊的石頭亮了起來，還有一顆發光的小石頭！') }); } },
          { id: 'sign', r: [90, 270, 160, 150], on: () => G.read('立牌', `過河石\n\n<b>只能踩${RULE[V(s).pond.k]}。</b>\n其他的石頭，一踩就會沉下去喔！\n\n　　　　　　　　　──一鳴`) },
          { id: 'far', r: [430, 320, 160, 110], on: C => { if (!s.pond_ok) G.toast('池塘對岸有一塊刻著新月的石頭，太遠了，看不清楚。'); else if (!s.stoneTaken) { s.stoneTaken = 1; C.give('moonStone'); } else G.toast(`新月旁邊，刻著一個「${A.SYM[V(s).syms[0]]}」。`); } },
        ],
      },
      e: {
        draw: s => night(0) + [180, 360, 540, 720].map((x, i) => `<g filter="url(#ds)"><ellipse cx="${x}" cy="440" rx="80" ry="54" fill="#2f5a3a" ${SW}/><ellipse cx="${x - 26}" cy="410" rx="44" ry="34" fill="#3f6a3a" ${SW2}/><ellipse cx="${x + 30}" cy="406" rx="40" ry="30" fill="#3a6436" ${SW2}/></g>${A.sym([0, 4, 6, 8][i], x, 470, 0.9, '#e8f4d8')}`).join('') +
          `<g filter="url(#ds)"><rect x="800" y="440" width="150" height="16" rx="4" fill="#8c5634" ${SW}/><path d="M816 456v40M934 456v40" stroke="#6b4a33" stroke-width="8"/></g>` + (s.jarTaken ? '' : `<g transform="translate(830 360) scale(.9)">${s.flies_ok ? ITEMS.fireflyJar.ic() : `<rect x="34" y="16" width="32" height="10" rx="3" fill="#b07644" ${SW2}/><path d="M30 28h40v50q0 8-8 8H38q-8 0-8-8z" fill="#cfe8d0" fill-opacity=".35" ${SW}/>`}</g>`) +
          symStone(900, 330, 1, V(s).syms[1], s.flies_ok),
        hot: s => [
          { id: 'bushes', r: [90, 360, 720, 150], on: C => { if (s.flies_ok) { G.toast('螢火蟲都飛進瓶子裡了。'); return; } W.simon(C, { id: 'flies', n: 4, seq: V(s).seq, icons: [0, 4, 6, 8], title: '螢火蟲的舞', sub: '四叢矮樹裡住著螢火蟲。按「看螢火蟲飛」，記住牠們亮起來的順序，再照順序點樹叢，牠們就會跟你回家。', okMsg: '螢火蟲飛進瓶子裡了！', ok: () => G.toast('螢火蟲一隻接一隻飛進長椅上的玻璃瓶，照亮了旁邊的石頭！') }); } },
          { id: 'jar', r: [810, 350, 120, 100], on: C => { if (!s.flies_ok) G.toast('長椅上有一個空的玻璃瓶，瓶蓋上有幾個小洞。'); else if (!s.jarTaken) { s.jarTaken = 1; C.give('fireflyJar'); } } },
          { id: 'rock', r: [840, 240, 130, 100], on: () => G.toast(s.flies_ok ? `半月旁邊刻著一個「${A.SYM[V(s).syms[1]]}」。` : '一塊刻著半月的石頭，旁邊好像還有字，太暗了看不清楚。') },
        ],
      },
      s: {
        draw: s => night(0) + `<g transform="translate(170 70)"><rect x="-40" y="-36" width="200" height="200" rx="18" fill="#141c40" opacity=".55"/>${skyDots(V(s).sky, 0, 0, 60, 7)}</g>` + A.txt(270, 270, '天上的星座', 16, '#c9d4ee') +
          `<ellipse cx="700" cy="530" rx="230" ry="70" fill="#1f3a5a" ${SW}/>` + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(p => { const [x, y, k] = lanPos(p); return lanternG(x, y, s.lan.includes(p), k); }).join('') +
          symStone(330, 520, 2, V(s).syms[2], s.lan_ok) + sign(820, 150, '倒影燈籠'),
        hot: s => [
          { id: 'lanterns', r: [540, 220, 340, 220], on: C => onLan(C), use: { fireflyJar: C => { s.jarIn = 1; Snd.play('light'); G.toast('打開瓶蓋，螢火蟲飛進九盞石燈籠裡。現在燈籠可以點亮了！'); } } },
          { id: 'sky', r: [110, 20, 260, 240], t: '夜空裡，有幾顆特別亮的星星排在一起。' },
          { id: 'sign2', r: [740, 120, 160, 150], on: () => G.read('立牌', '倒影燈籠\n\n<b>讓池塘裡燈籠的倒影，\n變成天上那個星座的樣子。</b>\n\n（倒影會上下顛倒喔！）\n\n　　　　　　　　　──一鳴') },
          { id: 'stone3', r: [260, 420, 140, 120], on: () => G.toast(s.lan_ok ? `滿月旁邊刻著一個「${A.SYM[V(s).syms[2]]}」。` : '一塊刻著滿月的石頭，旁邊黑黑的。') },
        ],
      },
      w: {
        draw: s => night(180) + `<g filter="url(#ds)"><path d="M380 480q-30-160 0-280h80q30 120 0 280z" fill="#5a3a24" ${SW}/><path d="M400 300q-120-40-200-10M460 260q100-60 200-30" stroke="#5a3a24" stroke-width="22" fill="none" stroke-linecap="round"/></g>` +
          [[260, 160, 110], [420, 110, 140], [580, 170, 110], [330, 220, 90], [520, 230, 90]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2f5a3a" ${SW}/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.5}" fill="#3f6a3a"/>`).join('') +
          chest(470, 560, s) + sign(800, 300, '時光寶盒'),
        hot: s => [
          { id: 'chest', r: [340, 440, 260, 150], on: C => onChest(C), use: { moonStone: C => { C.take('moonStone'); s.stoneIn = 1; Snd.play('click'); setTimeout(() => Snd.play('light'), 300); G.toast('月亮石放進凹洞，箱子上的三個月亮微微亮了起來！'); } } },
          { id: 'sign3', r: [720, 270, 160, 150], on: () => G.read('時光寶盒', '把月亮石放回它的家，\n再照著<b>新月、半月、滿月</b>的順序，\n轉出三塊月亮石頭旁邊刻的圖案。\n\n　　　　　　　　──十歲的一鳴'), },
          { id: 'tree', r: [200, 40, 480, 260], t: '一棵好老好老的樹。樹幹上刻著「一鳴到此一遊」。' },
        ],
      },
    },
    steps: [
      { goal: '走過池塘', done: s => s.pond_ok, h: [s => `北邊的立牌說：只能踩${RULE[V(s).pond.k]}。`, '從最下面一排找一顆符合規則的石頭開始，每一步只能往上、下、左、右相鄰的石頭走。', s => '依序踩：' + V(s).pond.path.map(([r, c]) => V(s).pond.grid[r][c]).join('、') + '。'] },
      { goal: '拿到發光的石頭', done: s => s.stoneTaken, h: ['對岸的石燈籠旁邊有東西在發光。', '點北邊池塘對岸的石頭。', '點對岸，拿到月亮石。'] },
      { goal: '收集螢火蟲', done: s => s.jarTaken, h: ['東邊的樹叢裡有螢火蟲。', '點樹叢，按「看螢火蟲飛」記住順序，再照順序點。', s => '順序是：' + V(s).seq.map(k => A.SYM[[0, 4, 6, 8][k]] + '樹叢').join('、') + '；完成後拿長椅上的螢火蟲瓶。'] },
      { goal: '點亮倒影燈籠', done: s => s.lan_ok, h: ['南邊有九盞石燈籠，立牌說倒影要變成天上的星座。先用螢火蟲瓶點燈籠。', '倒影會上下顛倒：天上最上面一排的星星，要用最下面一排的燈籠來點。', s => '點亮這幾盞燈籠（由左上數到右下 1～9）：' + V(s).sky.map(flip).sort((a, b) => a - b).map(p => p + 1).join('、') + '。'] },
      { goal: '把月亮石放回寶盒', done: s => s.stoneIn, h: ['西邊老樹下的寶盒上有一個圓圓的凹洞。', '月亮石剛好放得進去。', '拿著月亮石點西邊的寶盒。'] },
      { goal: '打開時光寶盒', done: s => s.chestOpen, h: ['寶盒的轉輪上畫著新月、半月、滿月。三塊月亮石頭旁邊各刻著一個圖案。', '新月在北邊池塘對岸、半月在東邊長椅旁、滿月在南邊燈籠前。', s => `依序轉成：${V(s).syms.map(k => A.SYM[k]).join('、')}。`] },
    ],
  });

  function onLan(C) {
    const s = C.s;
    if (s.lan_ok) { G.toast('燈籠的倒影在水面上閃閃發光。'); return; }
    if (!s.jarIn) { G.toast('九盞小石燈籠，裡面空空的，沒有火。'); return; }
    const draw = () => {
      let o = `<svg class="wsvg" viewBox="0 0 640 420" style="max-width:560px;margin:0 auto"><rect width="640" height="420" rx="16" fill="#142238"/><rect x="0" y="210" width="640" height="210" fill="#1f3a5a"/><path d="M0 210h640" stroke="#c9d4ee" stroke-opacity=".4" stroke-width="2"/>`;
      let refl = '';
      for (let p = 0; p < 9; p++) { const x = 80 + (p % 3) * 95, y = 76 + ((p / 3) | 0) * 62, on = s.lan.includes(p); o += `<g data-l="${p}" style="cursor:pointer"><rect x="${x - 44}" y="${y - 58}" width="88" height="60" fill="transparent"/>${lanternG(x, y, on, 0.95)}</g>`; refl += lanternG(x, y, on, 0.95); }
      o += `<g opacity=".5" transform="translate(0 420) scale(1 -1)">${refl}</g><path d="M0 214h640" stroke="#9fc4e8" stroke-opacity=".25" stroke-width="3" stroke-dasharray="20 14"/>`;
      o += A.txt(160, 404, '水裡的倒影', 15, '#c9d4ee') + `<g transform="translate(400 60)"><rect x="-20" y="-30" width="210" height="190" rx="12" fill="#0f1638"/>${skyDots(V(s).sky, 30, 0, 60, 8)}</g>` + A.txt(505, 190, '天上的星座', 15, '#c9d4ee');
      return o + `</svg>`;
    };
    const body = G.modal(`<h3>倒影燈籠</h3><p class="sub">點燈籠可以點亮或熄滅。讓<b>水裡的倒影</b>和右邊天上的星座一模一樣。</p><div class="ln">${draw()}</div><p class="msg"></p>`, { w: 620 });
    body.onclick = e => {
      if (s.lan_ok) return;
      const t = e.target.closest('[data-l]'); if (!t) return;
      const p = +t.dataset.l; s.lan = s.lan.includes(p) ? s.lan.filter(x => x !== p) : [...s.lan, p];
      Snd.tone(s.lan.includes(p) ? 1100 : 600, 0.1, 'triangle', 0.06); body.querySelector('.ln').innerHTML = draw(); C.save();
      const want = V(s).sky.map(flip).sort((a, b) => a - b).join();
      if (s.lan.slice().sort((a, b) => a - b).join() === want) { s.lan_ok = 1; W.success(C, body, '倒影和星座一模一樣！', () => G.toast('燈籠的光照亮了刻著滿月的石頭！'), 1300); }
    };
  }
  function onChest(C) {
    const s = C.s;
    if (s.chestOpen) { C.win(); return; }
    if (!s.stoneIn) { G.toast('寶盒上有一個圓圓的凹洞，還有三個畫著月亮的轉輪。好像要先把什麼東西放進凹洞。'); return; }
    W.wheels(C, { id: 'chest', title: '時光寶盒', sub: '三個轉輪上方畫著新月、半月、滿月。', wheels: [0, 1, 2].map(k => ({ label: `<svg viewBox="-16 -16 32 32">${moonIc(k, 0, 0, 12)}</svg>`, vals: A.SYM.map((_, i) => `<svg viewBox="-20 -20 40 40">${A.sym(i, 0, 0, 1)}</svg>`), kind: 'svg' })), check: i => i.join() === V(s).syms.join(), okMsg: '寶盒打開了！', ok: C => { s.chestOpen = 1; Snd.play('door'); C.render(); C.win(); } });
  }
})();
