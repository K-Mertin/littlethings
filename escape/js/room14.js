'use strict';
// 第二部 第 4 章：鐘樓（推鐵砣放下鐘架、照師傅的鐘牌掛好四口鐘、繫上鐘繩，讓鐘塔再響一次）
(() => {
  const WALL = { c: '#c9b89a', pat: 'brick', trim: '#e0d0b0', floor: 'stone', fc: ['#8a8070', '#7a7062'], fy: 500 };
  const SOKO = [
    { g: ['#######', '#.....#', '#.....#', '#.#...#', '#.#...#', '#######'], p: [2, 1], b: [[4, 3], [2, 2]], goal: [[1, 3], [1, 4]] },
    { g: ['#######', '#.....#', '##..#.#', '#.....#', '#.....#', '#######'], p: [5, 3], b: [[4, 3], [3, 3]], goal: [[2, 2], [5, 2]] },
    { g: ['#######', '#.....#', '#....##', '#...#.#', '##....#', '#######'], p: [2, 2], b: [[3, 3], [3, 2]], goal: [[5, 1], [4, 1]] },
    { g: ['#######', '#.....#', '#.....#', '#...#.#', '#....##', '#######'], p: [2, 4], b: [[2, 2], [4, 1]], goal: [[4, 4], [1, 1]] },
    { g: ['#######', '#.#..##', '#.#...#', '#.....#', '#...#.#', '#######'], p: [1, 3], b: [[4, 3], [2, 3]], goal: [[3, 1], [3, 2]] },
    { g: ['#######', '#.....#', '#.....#', '#..#.##', '#.....#', '#######'], p: [1, 3], b: [[4, 3], [2, 3]], goal: [[2, 1], [1, 1]] },
  ];
  const BN = ['銅鐘', '銀鐘', '金鐘', '鐵鐘'], BC = ['#c4783f', '#c9cfd6', '#f2c46b', '#6a6a72'], BS = [1.15, 0.9, 0.72, 1.0], BP = [60, 67, 72, 64];
  const gen = (r, canon) => ({ soko: canon ? 0 : rInt(r, 0, SOKO.length - 1), hang: W.hangMake(r, BN) });
  const CANON = gen(makeRng(20261030), true);
  const V = s => (s && s.v) || CANON;
  A.KEYS.r14 = 'n';

  Object.assign(ITEMS, {
    rope: { n: '鐘繩', d: '一大捆粗粗的麻繩，一端綁著紅色的流蘇。', ic: () => `<ellipse cx="50" cy="56" rx="32" ry="22" fill="none" stroke="#4a3222" stroke-width="13"/><ellipse cx="50" cy="56" rx="32" ry="22" fill="none" stroke="#d9b87a" stroke-width="8"/><ellipse cx="50" cy="56" rx="20" ry="13" fill="none" stroke="#4a3222" stroke-width="11"/><ellipse cx="50" cy="56" rx="20" ry="13" fill="none" stroke="#c9a46a" stroke-width="6"/><path d="M80 60q8 14 2 26" stroke="#e0504a" stroke-width="7" stroke-linecap="round"/>` },
  });

  const bell = (k, x, y, sc = 1, lying) => { const c = BC[k], s = BS[k] * sc; return `<g transform="translate(${x} ${y}) scale(${s})${lying ? ' rotate(-70)' : ''}">${lying ? '' : `<path d="M0 -92v14" stroke="#4a3222" stroke-width="7"/><circle cx="0" cy="-96" r="9" fill="none" stroke="#4a3222" stroke-width="5"/>`}<path d="M-38 0q4-12 6-40q2-38 32-40q30 2 32 40q2 28 6 40z" fill="${c}" ${SW}/><path d="M-38 0q4-12 6-40q2-38 32-40q30 2 32 40q2 28 6 40z" fill="url(#cyl)"/><path d="M-44 0h88" stroke="#4a3222" stroke-width="8" stroke-linecap="round"/><path d="M-44 0h88" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M-30 -36h60M-31 -30h62" stroke="${shade(c, -0.3)}" stroke-width="1.6"/><path d="M-18 -66q-10 20-10 54" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="0" cy="8" r="7" fill="${shade(c, -0.25)}" ${SW2}/>${A.txt(0, -48, BN[k][0], 18, shade(c, -0.55), 'middle', 900)}</g>`; };
  const harbor = (x, y, w, h) => { // 拱窗外的港口：海、燈塔、帆船、海鷗
    let o = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky)"/><circle cx="${x + w * 0.8}" cy="${y + h * 0.2}" r="${w * 0.06}" fill="#fff6c8"/>`;
    o += `<rect x="${x}" y="${y + h * 0.58}" width="${w}" height="${h * 0.42}" fill="#3f8ab8"/><rect x="${x}" y="${y + h * 0.58}" width="${w}" height="${h * 0.08}" fill="#6fb0d8"/>`;
    for (let i = 0; i < 8; i++) o += `<path d="M${x + (i * 61) % w} ${y + h * (0.68 + (i % 4) * 0.08)}q8-5 16 0t16 0" stroke="#cfe8f4" stroke-width="2" fill="none" opacity=".8"/>`;
    o += `<path d="M${x + w * 0.02} ${y + h * 0.6}q${w * 0.12}-${h * 0.18} ${w * 0.26} 0z" fill="#6a8a5a"/><rect x="${x + w * 0.11}" y="${y + h * 0.3}" width="${w * 0.04}" height="${h * 0.22}" fill="#fffaf0" ${SW2}/><path d="M${x + w * 0.11} ${y + h * 0.36}h${w * 0.04}M${x + w * 0.11} ${y + h * 0.44}h${w * 0.04}" stroke="#e0504a" stroke-width="5"/><path d="M${x + w * 0.1} ${y + h * 0.3}l${w * 0.03}-${h * 0.06}l${w * 0.03} ${h * 0.06}z" fill="#e0504a" ${SW2}/>`;
    A.fx(`<g class="bob" style="${A.ad(3)}"><path d="M${x + w * 0.55} ${y + h * 0.66}h${w * 0.14}l-${w * 0.02} ${h * 0.05}h-${w * 0.1}z" fill="#8c5634" ${SW2}/><path d="M${x + w * 0.62} ${y + h * 0.66}v-${h * 0.2}l${w * 0.07} ${h * 0.17}z" fill="#fffaf0" ${SW2}/></g>`);
    A.fx(`<g class="fly" style="animation-duration:9s;${A.ad(9)}"><path d="M${x + w * 0.3} ${y + h * 0.25}q6-6 12 0q6-6 12 0" stroke="#4a3222" stroke-width="2.4" fill="none"/></g>`);
    return o;
  };
  const arch = (x, y, w, h) => `<path d="M${x - 16} ${y + h}V${y + w / 2}a${w / 2 + 16} ${w / 2 + 16} 0 0 1 ${w + 32} 0V${y + h}z" fill="#e0d0b0" ${SW}/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden"><path d="M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}z" fill="#cfe6f4"/>${harbor(x, y, w, h)}</svg><path d="M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}" fill="none" ${SW}/><path d="M${x - 16} ${y + h}h${w + 32}" stroke="#a8977f" stroke-width="10"/>`;
  const frame = s => { // 鐘架（大橫樑和四個鉤子）；放下來以後比較低，也看得到掛好的鐘
    const y = s.sk_floor_ok ? 200 : 60;
    let o = `<path d="M150 0V${y}M850 0V${y}" stroke="#4a3a2e" stroke-width="6" stroke-dasharray="10 5"/><g filter="url(#ds)"><rect x="120" y="${y}" width="760" height="40" rx="6" fill="#6a4228" ${SW}/><rect x="120" y="${y}" width="760" height="40" rx="6" fill="url(#p-grainH)"/><rect x="120" y="${y}" width="760" height="40" rx="6" fill="url(#bevel)"/></g>`;
    [0, 1, 2, 3].forEach(i => { const hx = 230 + i * 180, b = (s.hung || [])[i]; o += `<path d="M${hx} ${y + 40}v24q0 12 10 12" stroke="#4a4a52" stroke-width="6" fill="none" stroke-linecap="round"/>` + A.txt(hx, y + 30, i + 1, 18, '#f0dcb8', 'middle', 900); if (s.hang_ok && b != null) o += bell(b, hx, y + 82 + 100 * BS[b], 1); });
    if (s.ropeOn) o += `<path d="M500 ${y + 40}V560" stroke="#4a3222" stroke-width="9"/><path d="M500 ${y + 40}V560" stroke="#d9b87a" stroke-width="5" stroke-dasharray="6 3"/><path d="M500 560l-8 30M500 560l8 30M500 560v34" stroke="#e0504a" stroke-width="5" stroke-linecap="round"/>`;
    return o;
  };

  ROOMS.push({
    id: 'r14', no: 14, ch: 4, arc: 2, name: '鐘樓', en: 'THE BELL LOFT', mood: 'warm', par: 780, walls: ['s', 'w', 'n', 'e'], thumb: 'n',
    init: () => ({ hung: [null, null, null, null] }),
    canon: CANON, soko: SOKO,
    vary: r => gen(r, false),
    note: { v: 's', x: 880, y: 120, s: 0.85 },
    intro: [
      '爬上梯子，海風一下子吹了進來。四面都是大大的拱窗，看得到整個港口和遠方的燈塔。',
      '可是鐘架上空空的──四口鐘都被拆下來，放在地上。鐘架也被吊得高高的，搆不到。',
      { w: 'mochi', t: '喵～', sfx: 'meow' },
    ],
    outro: [
      { t: '你用力一拉鐘繩──', sfx: 'click' },
      { t: '「噹──　噹──　噹──　噹──」', sfx: 'fanfare' },
      '四口鐘的聲音一起飛出拱窗，飛過港口、飛過燈塔，整個海港市都聽見了。',
      { w: 'pan', e: 'c', t: '「爸爸……你聽到了嗎？鐘塔又響了……」' },
      { w: 'gp', e: 'c', t: '「師傅說過：『等有一天，有人照著我的鐘牌把鐘掛好，鐘塔就會再響。』……原來那個人，是我的孫子。」' },
      { t: '金鐘裡掉出一張摺得小小的紙條，是師傅的字：', sfx: 'page' },
      { l: 1, who: '師傅的紙條', t: '一鳴：\n我知道你會回來。\n機關做得再好，也要有人願意花時間解開它。\n謝謝你，還有──陪你來的那個孩子。' },
      { w: 'gp', e: 'h', t: '「回家吧。今年的生日，是爺爺過得最熱鬧的一次。」' },
      { big: 1, t: '～ 第二部　完 ～' },
      '謝謝你一路玩到這裡！章節選擇裡的「計時連關」可以挑戰連續解謎，重玩任何一章謎題也都會改變喔。',
    ],
    views: {
      s: {
        draw: s => A.wall(WALL) + Deco.ceilBeam() + arch(120, 120, 200, 300) + arch(680, 120, 200, 300) +
          `<g filter="url(#ds)"><rect x="380" y="140" width="240" height="190" rx="8" fill="url(#brass)" ${SW}/><rect x="396" y="156" width="208" height="158" rx="4" fill="#5a3a24"/>${A.txt(500, 196, '師傅的鐘牌', 20, '#f2c46b', 'middle', 900)}<path d="M420 230h160M420 256h160M420 282h120" stroke="#c9a14a" stroke-width="3" opacity=".7"/></g>` +
          `<path d="M380 500l40-70h160l40 70z" fill="#2a1a10" ${SW}/><path d="M440 500l14-60M560 500l-14-60M446 470h108M450 450h100" stroke="#8c6a4a" stroke-width="6"/>` + A.light(),
        hot: s => [
          { id: 'plaque', r: [380, 140, 240, 190], on: C => { s.read = 1; G.read('師傅的鐘牌', '鐘樓的四口鐘，要照這樣掛（從左邊數第 1 到第 4 個鉤子）：\n\n' + V(s).hang.clues.map((c, i) => `${i + 1}. ${W.hangClue(c, V(s).hang.ans, BN)[1]}`).join('\n') + '\n\n掛對了，鐘塔就會再一次唱歌。', 'green'); } },
          { id: 'hatch', r: [380, 420, 240, 80], t: '下面就是機械室，大鐘正「喀、喀」地走著。' },
          { id: 'arch1', r: [110, 120, 220, 300], t: '拱窗外，帆船在港口裡慢慢地搖。' },
        ],
      },
      w: {
        draw: s => A.wall(WALL) + Deco.ceilBeam() + arch(400, 110, 200, 260) + [0, 1, 2, 3].map(k => (s.hung || []).includes(k) && s.hang_ok ? '' : `${A.sh(170 + k * 200, 494, 70, 10)}` + bell(k, 170 + k * 200, 480, 0.9)).join('') +
          (s.rope || s.ropeOn ? '' : `<g transform="translate(800 330) scale(1.1)">${ITEMS.rope.ic()}</g>`),
        hot: s => [
          ...[0, 1, 2, 3].map(k => ({ id: 'bell' + k, r: [110 + k * 200, 380, 120, 120], on: () => { Snd.bell(NOTE(BP[k] + 12), 0, 0.12, 1.4); G.toast(`${BN[k]}：${['最大的一口，聲音又低又厚。', '中等大小，聲音很亮。', '最小的一口，聲音叮叮的。', '黑黑的，聲音有點悶。'][k]}`); } })),
          { id: 'ropeW', r: [790, 320, 120, 110], on: C => { if (!s.rope && !s.ropeOn) { s.rope = 1; C.give('rope'); } } },
        ],
      },
      n: {
        draw: s => A.wall(WALL) + arch(300, 90, 400, 400) + frame(s) + A.light(),
        hot: s => [
          { id: 'frame', r: [110, s.sk_floor_ok ? 180 : 40, 780, s.sk_floor_ok ? 250 : 120], on: C => onFrame(C), use: { rope: C => { if (!s.sk_floor_ok) { G.toast('鐘架太高了，搆不到。'); return; } C.take('rope'); s.ropeOn = 1; Snd.play('click'); G.toast('把鐘繩綁在鐘架正中間，紅色的流蘇垂了下來。'); } } },
          ...(s.ropeOn ? [{ id: 'pull', r: [460, 440, 80, 160], on: C => onPull(C) }] : []),
        ],
      },
      e: {
        draw: s => A.wall(WALL) + Deco.ceilBeam() + arch(660, 120, 220, 300) + `<g filter="url(#ds)"><circle cx="300" cy="120" r="46" fill="url(#brass)" ${SW}/><circle cx="300" cy="120" r="14" fill="#5a3a24"/></g><path d="M260 120V${s.sk_floor_ok ? 360 : 300}M340 120V0" stroke="#4a3222" stroke-width="5"/>` +
          `<g filter="url(#ds)"><path d="M90 500l40-160h340l40 160z" fill="#8a7a66" ${SW}/>${[0, 1].map(i => `<ellipse cx="${200 + i * 160}" cy="440" rx="44" ry="16" fill="#5a4a3e" stroke="url(#brass)" stroke-width="5"/>`).join('')}</g>` + (s.sk_floor_ok ? [0, 1].map(i => `<path d="M${176 + i * 160} 436l8-40h32l8 40z" fill="#5a6a74" ${SW}/>`).join('') : `<path d="M260 470l8-40h32l8 40z" fill="#4a4a52" ${SW}/><path d="M380 400l8-40h32l8 40z" fill="#4a4a52" ${SW}/>`) + A.txt(280, 330, '平衡踏板', 16, '#fff3dc', 'middle', 900) + A.light(),
        hot: s => [
          { id: 'plates', r: [90, 320, 420, 180], on: C => onPlates(C) },
          { id: 'pulley', r: [240, 60, 120, 120], t: '一個大滑輪，繩子的一頭連著鐘架，另一頭連著地上的平衡踏板。' },
        ],
      },
    },
    steps: [
      { goal: '讀師傅的鐘牌', done: s => s.read, h: ['鐘樓裡有一塊黃銅牌子。', '南邊牆上的「師傅的鐘牌」。', '點南邊的鐘牌。'] },
      { goal: '把鐘架放下來', done: s => s.sk_floor_ok, h: ['鐘架被吊得太高了。東邊有一個大滑輪連著地上的平衡踏板。', '點東邊的平衡踏板，把兩個鐵砣都推到圓形的踏板上。鐵砣只能推、不能拉；別把它推進角落。', '先想好鐵砣最後要從哪一邊推上踏板，再繞到它的另一邊去推。卡住的話按「重新來過」。'] },
      { goal: '照鐘牌掛好四口鐘', done: s => s.hang_ok, h: ['鐘架放下來了，可以掛鐘了。鐘牌上寫著掛法。', '點北邊的鐘架。一條一條看鐘牌的提示：先找最確定的，再用「不能」的條件刪掉不可能的。', s => '由左到右：' + V(s).hang.ans.map(k => BN[k]).join('、') + '。'] },
      { goal: '繫上鐘繩', done: s => s.ropeOn, h: ['鐘要有繩子才拉得響。', '西邊地上有一捆鐘繩。', '拿西邊的鐘繩，再拿著它點北邊的鐘架。'] },
      { goal: '讓鐘塔再響一次', done: s => s.rang, h: ['萬事俱備！', '點北邊垂下來的鐘繩。', '點北邊的鐘繩，拉響大鐘。'] },
    ],
  });

  function onPlates(C) {
    const s = C.s;
    if (s.sk_floor_ok) { G.toast('兩個鐵砣都在踏板上，鐘架降下來了。'); return; }
    const L = SOKO[V(s).soko];
    W.soko(C, { id: 'floor', g: L.g, p: L.p, b: L.b, goal: L.goal, title: '平衡踏板', sub: '用方向鍵（或點旁邊的格子）走路；走向鐵砣就會把它往前推。把<b>兩個鐵砣</b>都推到<b>圓形踏板</b>上！鐵砣不能拉，推進角落就拿不出來了。', okMsg: '「喀啦──」鐘架降下來了！', ok: () => { Snd.play('door'); G.toast('滑輪轉動，北邊的鐘架慢慢降了下來！'); } });
  }
  function onFrame(C) {
    const s = C.s;
    if (!s.sk_floor_ok) { G.toast('鐘架被吊在好高的地方，上面有四個鉤子。'); return; }
    if (s.hang_ok) { G.toast(s.ropeOn ? '四口鐘都掛好了，鐘繩也繫上了。' : '四口鐘都掛好了。還少一條拉鐘的繩子。'); return; }
    let sel = -1;
    const hung = s.hung;
    const draw = () => {
      let q = `<svg class="wsvg" viewBox="0 0 760 330" style="max-width:600px;margin:0 auto"><rect width="760" height="330" rx="14" fill="#e9dcc0" ${SW}/><rect x="20" y="20" width="720" height="34" rx="6" fill="#6a4228" ${SW}/><rect x="20" y="20" width="720" height="34" rx="6" fill="url(#p-grainH)"/>`;
      [0, 1, 2, 3].forEach(i => { const hx = 110 + i * 180; q += `<g data-hk="${i}" style="cursor:pointer"><rect x="${hx - 80}" y="54" width="160" height="270" fill="transparent"/><path d="M${hx} 54v22q0 12 10 12" stroke="#4a4a52" stroke-width="6" fill="none"/>` + A.txt(hx, 46, i + 1, 18, '#f0dcb8', 'middle', 900) + (hung[i] != null ? bell(hung[i], hx, 96 + 100 * BS[hung[i]] * 1.05, 1.05) : `<rect x="${hx - 50}" y="120" width="100" height="140" rx="14" fill="none" stroke="#a8875f" stroke-width="3" stroke-dasharray="8 6"/>`) + `</g>`; });
      return q + `</svg>`;
    };
    const tray = () => [0, 1, 2, 3].map(k => `<button class="choice${sel === k ? ' on' : ''}" data-b="${k}" ${hung.includes(k) ? 'style="opacity:.45"' : ''}><svg viewBox="-60 -120 120 140">${bell(k, 0, 0, 0.9)}</svg>${BN[k]}</button>`).join('');
    const body = G.modal(`<h3>掛鐘</h3><p class="sub">先點下面的一口鐘，再點上面的鉤子把它掛上去（點已經掛的鐘可以拿下來）。</p><ol class="hangClues">${V(s).hang.clues.map(c => `<li>${W.hangClue(c, V(s).hang.ans, BN)[1]}</li>`).join('')}</ol><div class="hk">${draw()}</div><div class="choices hb">${tray()}</div><p class="msg"></p><div class="btnRow"><button class="ok" data-ok="1">就這樣掛</button></div>`, { w: 680, cls: 'wide' });
    const upd = () => { body.querySelector('.hk').innerHTML = draw(); body.querySelector('.hb').innerHTML = tray(); C.save(); };
    body.onclick = e => {
      if (s.hang_ok) return;
      const b = e.target.closest('[data-b]'); if (b) { const k = +b.dataset.b; sel = sel === k ? -1 : k; Snd.bell(NOTE(BP[k] + 12), 0, 0.1, 0.9); upd(); return; }
      const h = e.target.closest('[data-hk]');
      if (h) { const i = +h.dataset.hk; if (sel >= 0) { const j = hung.indexOf(sel); if (j >= 0) hung[j] = null; hung[i] = sel; sel = -1; Snd.play('click'); } else if (hung[i] != null) { hung[i] = null; Snd.play('tap'); } upd(); return; }
      if (e.target.closest('[data-ok]')) {
        if (hung.some(x => x == null)) { W.fail(body, '還有鉤子是空的。'); return; }
        if (hung.join() === V(s).hang.ans.join()) { s.hang_ok = 1; hung.forEach((k, i) => setTimeout(() => Snd.bell(NOTE(BP[k] + 12), 0, 0.12, 1.4), i * 260)); W.success(C, body, '四口鐘都掛好了！', () => G.toast('四口鐘在鐘架上輕輕地晃。'), 1500); }
        else W.fail(body, '師傅的鐘牌好像不是這樣說的……再一條一條對對看。');
      }
    };
  }
  function onPull(C) {
    const s = C.s;
    if (!s.hang_ok) { G.toast('鐘還沒掛好，拉了也不會響。'); return; }
    s.rang = 1; Snd.play('chime'); C.render(); C.win();
  }
})();
