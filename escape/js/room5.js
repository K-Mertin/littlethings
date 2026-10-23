'use strict';
// 第 5 章：音樂室
(() => {
  const WALL = { c: '#a8494a', pat: 'diamond', wain: '#5a3020', trim: '#f4e2c4', floor: 'wood', fc: ['#8c5634', '#7a4a2a'] };
  const BELL = { 紅: ['#e0504a', 72], 藍: ['#4f8ad8', 76], 綠: ['#5fae5a', 79], 黃: ['#f2c232', 84] };
  const STR = { G: 12, D: 8, A: 5, E: 2.2 };
  const SONGS = { 小蜜蜂: [5, 3, 3, 4, 2, 2], 小星星: [1, 1, 5, 5, 6, 6, 5], 兩隻老虎: [1, 2, 3, 1, 1, 2, 3, 1], 倫敦鐵橋: [5, 6, 5, 4, 3, 4, 5] };
  const CANON = { seq: ['紅', '黃', '藍', '紅', '綠'], lock: ['E', 'G', 'A', 'D'], song: '小蜜蜂' };
  const V = s => (s && s.v) || CANON;
  const SEQ_ = s => V(s).seq, LOCK_ = s => V(s).lock, TUNE = s => SONGS[V(s).song];
  const tuneTxt = s => { const t = TUNE(s), h = Math.ceil(t.length / 2); return t.slice(0, h).join(' ') + '　' + t.slice(h).join(' '); };
  const ORD = ['最粗', '第二粗', '第三粗', '最細'];

  Object.assign(ITEMS, {
    sheet: { n: '樂譜', d: '一張手寫的簡譜。', ic: () => IC.paper('#fffdf3', '#c9a14a', 4) + A.txt(52, 44, '♪', 22, '#a8494a'),
      insp: C => G.read('樂譜', `<div style="text-align:center"><b style="font-size:22px;color:#a8494a">♪ ${V(C.s).song} ♪</b>\n<span style="font:700 36px var(--round);letter-spacing:.2em">${tuneTxt(C.s)}</span>\n<span style="color:#7a6250">（簡譜：1＝Do、2＝Re、3＝Mi、4＝Fa、5＝Sol）</span>\n\n右下角有一行小字：\n「照著樂譜彈琴，琴會把唱片還給你。」</div>`) },
    record: { n: '唱片', d: '一張黑膠唱片，中間的標籤是紅色的。', ic: () => `<circle cx="50" cy="50" r="40" fill="#2a2228" ${SW}/><circle cx="50" cy="50" r="30" fill="none" stroke="#4a4048" stroke-width="2"/><circle cx="50" cy="50" r="22" fill="none" stroke="#4a4048" stroke-width="2"/><circle cx="50" cy="50" r="13" fill="#e0504a" ${SW2}/><circle cx="50" cy="50" r="3" fill="#2a2228"/><path d="M26 30q10-12 24-14" stroke="#fff" stroke-opacity=".35" stroke-width="4" fill="none"/>` },
  });

  const piano = (x, y, sc, s) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})">` + A.sh(0, 0, 260, 16);
    o += `<rect x="-230" y="-320" width="460" height="320" rx="14" fill="#3b2228" ${SW}/><rect x="-240" y="-330" width="480" height="30" rx="8" fill="#4a2c34" ${SW}/>`;
    if (s.pianoOk) o += `<path d="M-240 -330l20-70h440l20 70z" fill="#4a2c34" ${SW}/>` + (s.recTaken ? '' : `<g transform="translate(-40 -400) scale(.8)">${ITEMS.record.ic()}</g>`);
    o += `<rect x="-200" y="-280" width="400" height="100" rx="8" fill="#2a181e" ${SW2}/><path d="M-120 -230q40-30 80 0t80 0t80 0" stroke="url(#brass)" stroke-width="4" fill="none" opacity=".7"/>`;
    o += `<rect x="-90" y="-300" width="180" height="70" rx="4" fill="${s.sheetOn ? '#fffdf3' : '#5a3a40'}" ${SW2}/>` + (s.sheetOn ? A.txt(0, -258, tuneTxt(s), 20, '#4a3222', 'middle', 900) : '');
    o += `<rect x="-250" y="-180" width="500" height="26" rx="4" fill="#4a2c34" ${SW}/><rect x="-232" y="-154" width="464" height="52" fill="#fffaf0" ${SW}/>`;
    for (let i = 0; i < 16; i++) { o += `<path d="M${-232 + i * 29} -154v52" stroke="#4a3222" stroke-width="2"/>`; if (![2, 6, 9, 13].includes(i % 14) && i < 15 && i % 7 !== 2 && i % 7 !== 6) o += `<rect x="${-232 + i * 29 + 20}" y="-154" width="16" height="30" rx="2" fill="#2a181e"/>`; }
    for (let i = 0; i < 7; i++) o += `<circle cx="${-232 + (i + 4) * 29 + 14.5}" cy="-112" r="8" fill="#fff3a8" ${SW2}/>` + A.txt(-232 + (i + 4) * 29 + 14.5, -107, i + 1, 11, '#a8494a', 'middle', 900);
    o += `<rect x="-232" y="-102" width="464" height="102" fill="#3b2228" ${SW}/><path d="M-200 0v-30M200 0v-30" stroke="url(#brass)" stroke-width="10"/>`;
    return o + '</g>';
  };
  const violinCase = (x, y, sc, s) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})">`;
    if (s.caseOpen) {
      o += `<path d="M-150 -10q0-50 60-56q30-4 60 10q20 12 60 4q70-14 90 40z" fill="#7a2a34" ${SW}/>`;
      o += `<path d="M-160 0q0-40 50-46q30-4 60 10q20 12 60 4q80-14 100 32q0 30-40 34H-120q-40 0-40-34z" fill="#c9383e" ${SW}/>`;
      o += `<path d="M-120 -4q0-24 30-24q16 0 24 10h70q10-10 24-10q30 0 30 24q-4 22-30 22q-14 0-24-10h-70q-8 10-24 10q-30 0-30-22z" fill="#c9783a" ${SW2}/>`;
      if (!s.sheetTaken) o += `<g transform="rotate(-6)"><rect x="40" y="-30" width="70" height="46" rx="3" fill="#fffdf3" ${SW2}/>${A.txt(75, -2, '♪', 20, '#a8494a')}</g>`;
    } else {
      o += `<path d="M-160 0q0-40 50-46q30-4 60 10q20 12 60 4q80-14 100 32q0 30-40 34H-120q-40 0-40-34z" fill="#3b2a3f" ${SW}/><path d="M-150 0h240" stroke="#5a4a5f" stroke-width="3"/>`;
      o += `<rect x="-60" y="-14" width="110" height="34" rx="6" fill="url(#brass)" ${SW2}/>${[0, 1, 2, 3].map(i => `<rect x="${-52 + i * 25}" y="-8" width="20" height="22" rx="3" fill="#fffaf0" ${SW2}/>`).join('')}`;
    }
    return o + '</g>';
  };
  const poster = (x, y, sc) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})"><rect x="0" y="0" width="220" height="270" rx="6" fill="#fff6e4" ${SW}/>${A.pin(110, 10)}${A.txt(110, 44, '小提琴的四條弦', 20, '#a8494a', 'middle', 900)}`;
    Object.entries(STR).forEach(([k, w], i) => { const yy = 84 + i * 44; o += `<path d="M30 ${yy}H170" stroke="#4a3222" stroke-width="${w}" stroke-linecap="round"/>` + A.txt(195, yy + 9, k, 26, '#4a3222', 'middle', 900, 'font-family="var(--round)"'); });
    return o + A.txt(110, 255, '由粗到細，由低到高', 15, '#7a6250', 'middle', 700) + '</g>';
  };
  const phono = (x, y, sc, s) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})">` + A.sh(0, 0, 150, 14);
    o += `<rect x="-140" y="-140" width="280" height="140" rx="8" fill="#8c5634" ${SW}/><rect x="-120" y="-120" width="110" height="100" rx="4" fill="#a8703f" ${SW2}/><rect x="10" y="-120" width="110" height="100" rx="4" fill="#a8703f" ${SW2}/>`;
    o += `<rect x="-110" y="-190" width="220" height="50" rx="6" fill="#7a4a2a" ${SW}/><ellipse cx="-20" cy="-196" rx="80" ry="16" fill="#3b2a1f" ${SW}/>`;
    if (s.recOn) o += `<ellipse cx="-20" cy="-198" rx="70" ry="13" fill="#2a2228" ${SW2}/><ellipse cx="-20" cy="-198" rx="16" ry="4" fill="#e0504a"/>`;
    o += `<path d="M60 -196l20-80" stroke="url(#brass)" stroke-width="8"/><path d="M80 -276q10-20 30-30l120-110q30 40 10 120q-60-10-130 40z" fill="url(#brass)" ${SW}/><ellipse cx="230" cy="-356" rx="26" ry="64" fill="#e2ae4c" ${SW} transform="rotate(40 230 -356)"/><path d="M40 -200l30-20" stroke="#4a3222" stroke-width="5"/>`;
    o += '</g>';
    if (s.played) {
      SEQ_(s).forEach((c, i) => { const nx = x + (-300 + i * 80) * sc, ny = y - 290 * sc - Math.sin(i / 4 * Math.PI) * 40 * sc; o += `<g transform="translate(${nx} ${ny}) scale(${sc * 1.3})"><ellipse cx="-6" cy="16" rx="14" ry="10" fill="${BELL[c][0]}" ${SW2} transform="rotate(-20 -6 16)"/><path d="M6 14V-22l20 8" fill="none" stroke="#4a3222" stroke-width="4"/><circle cx="20" cy="22" r="10" fill="#fff6e4" ${SW2}/>${A.txt(20, 27, i + 1, 12, '#4a3222', 'middle', 900)}</g>`; });
    }
    return o;
  };
  const bells = (x, y, sc, s) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M-20 0h420" stroke="#7a4a2a" stroke-width="12" stroke-linecap="round"/>`;
    Object.entries(BELL).forEach(([k, [c]], i) => {
      const bx = 40 + i * 100, len = 50 + (i % 2) * 30, r = 34 - i * 2 + (i === 0 ? 8 : 0);
      o += `<path d="M${bx} 0v${len}" stroke="#4a3222" stroke-width="3"/><g transform="translate(${bx} ${len})"><path d="M${-r} ${r * 1.5}C${-r} ${r * 0.3} ${-r * 0.7} 0 0 0S${r} ${r * 0.3} ${r} ${r * 1.5}h${r * 0.2}v8h${-r * 2.4}v-8z" fill="${c}" ${SW}/><circle cy="${r * 1.5 + 12}" r="7" fill="url(#brass)" ${SW2}/><path d="M${-r * 0.5} ${r * 0.5}q-4 ${r * 0.4} 0 ${r * 0.8}" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none"/></g>`;
    });
    if (s.bellsOk && !s.gearTaken) o += A.gear(40, 150, 22);
    return o + '</g>';
  };

  ROOMS.push({
    id: 'r5', no: 5, name: '音樂室', en: 'THE MUSIC ROOM', mood: 'night', par: 540, walls: ['n', 'e', 's', 'w'],
    init: () => ({ ring: [] }),
    canon: CANON,
    vary: r => {
      let q; do { q = [rInt(r, 0, 3)]; while (q.length < 5) { const k = rInt(r, 0, 3); if (k !== q[q.length - 1]) q.push(k); } } while (new Set(q).size < 4);
      const lock = shuffle(['G', 'D', 'A', 'E'], r), songs = Object.keys(SONGS);
      return { seq: q.map(k => ['紅', '藍', '綠', '黃'][k]), lock, song: songs[rInt(r, 1, songs.length - 1)] };
    },
    note: { v: 's', x: 658, y: 126, s: 0.95 },
    amb: (v, s) => { if (v === 's' && s.recOn) { A.fx(`<g class="spin" style="animation-duration:1.8s"><g transform="translate(410 282)"><ellipse rx="70" ry="13" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-dasharray="20 30"/></g></g>`); [0, 1, 2].forEach(i => A.fx(`<g class="steam" style="animation-duration:3s;animation-delay:-${i}s">${A.txt(640 + i * 30, 160, '♪', 30, '#ffe9a0')}</g>`)); } return ''; },
    intro: [
      '一走進音樂室，腳步聲就被厚厚的地毯吸走了。鋼琴、留聲機、牆上的小提琴……全都靜悄悄的。',
      { w: 'mochi', t: '喵？', sfx: 'meow' },
      '麻糬用爪子碰了一下鋼琴鍵──「咚」。牠嚇得跳了起來。',
    ],
    outro: [
      { t: '五個鈴鐺響完，最大的紅鈴鐺裡「叮」地掉出一枚齒輪，門也跟著開了。', sfx: 'chime' },
      '門後傳來咕嚕咕嚕的機器聲，還有……小孩子的笑聲？',
    ],
    views: {
      n: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${piano(500, 480, 0.9, s)}</g>` + A.frame(110, 110, 120, 150, `<rect width="100" height="100" fill="#f4e2c4"/>${A.txt(50, 66, '♫', 60, '#a8494a')}`) + A.frame(790, 110, 110, 110, `<rect width="100" height="100" fill="#2a3a5a"/>${A.star(50, 50, 28, '#f2c46b')}`) + A.plant(880, 480, 1, '#a8494a', '#5f9e5a') + A.light(),
        hot: s => [
          { id: 'keys', r: [290, 300, 420, 110], on: C => openPiano(C) },
          { id: 'stand', r: [400, 190, 200, 80], on: C => { if (!s.sheetOn) G.toast('譜架上空空的。'); else G.toast('樂譜：' + tuneTxt(s)); }, use: { sheet: C => { s.sheetOn = 1; Snd.play('page'); G.toast('把樂譜放上譜架。這樣彈的時候就看得到了。'); C.give('sheet', true); } } },
          { id: 'lid', r: [270, 100, 460, 110], on: C => { if (!s.pianoOk) G.toast('鋼琴的上蓋關得緊緊的。'); else if (!s.recTaken) { s.recTaken = 1; C.give('record'); } else G.toast('鋼琴裡面只剩下琴弦。'); } },
        ],
      },
      e: {
        draw: s => A.wall(WALL) + poster(120, 110, 1) + A.table(470, 380, 400, 94, '#7a4a2a') + `<g filter="url(#ds)">${violinCase(670, 360, 1, s)}</g>` +
          `<g transform="translate(560 120) rotate(-20)"><path d="M0 0q-30 10-30 50q0 20 20 30q-26 10-24 50q4 46 54 46t54-46q2-40-24-50q20-10 20-30q0-40-30-50z" fill="#c9783a" ${SW}/><path d="M20 -4v-80" stroke="#3b2a1f" stroke-width="10"/><path d="M14 60q6 6 0 14M26 60q-6 6 0 14" ${SW2} fill="none"/></g>` + A.light(),
        hot: s => [
          { id: 'poster', r: [100, 100, 260, 300], on: () => G.read('海報', '<b>小提琴的四條弦</b>\n\n由粗到細（也就是由低音到高音）：\n<b style="font-size:26px;letter-spacing:.3em">G・D・A・E</b>\n\n最粗的是 G 弦，最細的是 E 弦。') },
          { id: 'case', r: [500, 290, 340, 120], on: C => { if (!s.caseOpen) W.wheels(C, { id: 'case', title: '小提琴盒的字母鎖', sub: '每個轉輪上方，都畫著一條粗細不同的弦。', wheels: [0, 1, 2, 3].map(i => ({ label: `<svg viewBox="0 0 60 30"><path d="M6 15H54" stroke="#4a3222" stroke-width="${STR[LOCK_(s)[i]]}" stroke-linecap="round"/></svg>`, vals: 'CDEFGAB'.split('') })), check: (i, v) => v.join('') === LOCK_(s).join(''), ok: () => { s.caseOpen = 1; G.toast('「喀」！小提琴盒打開了，裡面有一張樂譜。'); } }); else if (!s.sheetTaken) { s.sheetTaken = 1; C.give('sheet'); } else G.toast('盒子裡躺著一把漂亮的小提琴。'); } },
          { id: 'violin', r: [520, 30, 180, 220], t: '牆上掛著一把舊小提琴，琴弦好像鬆掉了。' },
        ],
      },
      s: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${phono(430, 480, 1, s)}</g>` + `<g filter="url(#ds)">${A.box(720, 330, 200, 150, '#7a4a2a')}${A.books(735, 340, 8, 120, 3)}</g>` + A.cat(160, 470, 0.7) + A.light(),
        hot: s => [
          { id: 'phono', r: [280, 80, 420, 400], on: C => { if (!s.recOn) G.toast('一台大喇叭留聲機，唱盤上沒有唱片。'); else { playRecord(s); G.toast(`留聲機唱出五個音，五個彩色音符在喇叭上飄著：${SEQ_(s).join('、')}。`); } }, use: { record: C => { C.take('record'); s.recOn = 1; s.played = 1; Snd.play('click'); setTimeout(() => playRecord(s), 400); G.toast('唱片轉起來了……叮、叮、叮、叮、叮！喇叭上飄出五個彩色的音符！'); } } },
          { id: 'cat', r: [100, 360, 120, 120], on: () => { Snd.play('meow'); G.toast('麻糬的耳朵跟著音樂動來動去。'); } },
          { id: 'shelf', r: [720, 300, 200, 180], t: '架子上都是爺爺收藏的唱片和樂譜。' },
        ],
      },
      w: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${A.door(400, 150, 200, 320, '#5a3020', { open: s.bellsOk })}</g>` + bells(320, 80, 0.95, s) + A.frame(120, 160, 120, 160, `<rect width="100" height="100" fill="#f4e2c4"/>${A.sym(8, 50, 50, 2.6, '#e0504a')}`) + A.frame(780, 160, 120, 160, `<rect width="100" height="100" fill="#f4e2c4"/>${A.sym(8, 50, 50, 2.6, '#f2c232')}`) + A.light(),
        hot: s => Object.keys(BELL).map((k, i) => ({ id: 'bell' + i, c: [320 + (40 + i * 100) * 0.95, 80 + (50 + (i % 2) * 30 + 40) * 0.95, 46], on: C => ring(C, k) })).concat([{ id: 'door', r: [400, 230, 200, 240], on: C => { if (s.bellsOk) C.win(); else G.toast('門上沒有鎖孔，只有門楣上掛著四個彩色的鈴鐺。'); } }]),
      },
    },
    steps: [
      { goal: '打開小提琴盒', done: s => s.caseOpen, h: ['東邊桌上的小提琴盒有字母鎖，每個轉輪上面都畫著一條弦。旁邊有一張海報。', '海報說小提琴的弦由粗到細是 G、D、A、E。看鎖上每條弦的粗細，對應到字母。', s => `鎖上的弦依序是：${LOCK_(s).map(k => ORD['GDAE'.indexOf(k)]).join('、')}，所以是 ${LOCK_(s).join(' ')}。`] },
      { goal: '拿到小提琴盒裡的東西', done: s => s.sheetTaken, h: ['小提琴盒打開了。', '再點一次小提琴盒。', '點小提琴盒，拿到樂譜。'] },
      { goal: '用鋼琴彈出樂譜上的曲子', done: s => s.pianoOk, h: ['樂譜上寫著簡譜，鋼琴鍵上也貼著數字貼紙。', s => `點鋼琴鍵盤，照樂譜上的數字依序彈：${TUNE(s).join(' ')}。`, s => `依序按貼紙 ${TUNE(s).join('、')}。`] },
      { goal: '拿到鋼琴裡的東西', done: s => s.recTaken, h: ['彈完曲子，鋼琴的上蓋打開了。', '點鋼琴上面打開的蓋子。', '點鋼琴上蓋，拿到唱片。'] },
      { goal: '讓留聲機唱歌', done: s => s.played, h: ['南邊有一台留聲機，唱盤上是空的。', '拿著唱片點留聲機。', '把唱片放上留聲機，仔細看飄出來的彩色音符順序。'] },
      { goal: '打開門', done: s => s.bellsOk, h: ['西邊門上掛著紅、藍、綠、黃四個鈴鐺。', '照留聲機飄出來的音符顏色順序搖鈴鐺。', s => `依序點：${SEQ_(s).join('、')}。`] },
    ],
  });

  function playRecord(s) { SEQ_(s).forEach((c, i) => Snd.bell(NOTE(BELL[c][1]), i * 0.45 + 0.1, 0.14, 1.6)); }
  function ring(C, k) {
    const s = C.s; if (s.bellsOk) { Snd.bell(NOTE(BELL[k][1]), 0, 0.14, 1.4); return; }
    Snd.bell(NOTE(BELL[k][1]), 0, 0.14, 1.4);
    s.ring.push(k); if (s.ring.length > 5) s.ring.shift();
    if (s.ring.join() === SEQ_(s).join()) {
      s.bellsOk = 1; s.gearTaken = 1; C.give('g5', true);
      setTimeout(() => Snd.play('unlock'), 500);
      G.toast('叮叮噹噹──門開了！最大的鈴鐺裡掉出了「<b>音符齒輪 Ⅴ</b>」！');
      C.win();
    } else G.toast(`噹～（${k}色的鈴鐺）`, 1200);
  }
  function openPiano(C) {
    const s = C.s;
    if (s.pianoOk) { G.toast('鋼琴的上蓋已經打開了。'); return; }
    const keys = [1, 2, 3, 4, 5, 6, 7].map(n => ({ id: String(n), html: `<span style="display:block;margin-top:70px;width:26px;height:26px;border-radius:50%;background:#fff3a8;border:2px solid #4a3222;font:900 15px/22px var(--round);color:#a8494a;margin-left:auto;margin-right:auto">${n}</span>`, style: 'width:13%;height:150px;border-radius:0 0 10px 10px;background:linear-gradient(180deg,#fff,#efe6d6);border:2px solid #4a3222;box-shadow:0 4px 0 #b9a68a', play: () => Snd.piano(59 + [0, 1, 3, 5, 6, 8, 10, 12][n] + (n > 0 ? 0 : 0)) }));
    keys.forEach((k, i) => k.play = () => Snd.piano([60, 62, 64, 65, 67, 69, 71][i]));
    W.seq(C, { title: '鋼琴', sub: `琴鍵上貼著 1～7 的數字貼紙。${s.sheetOn || C.has('sheet') ? `樂譜〈${V(s).song}〉：<b>${tuneTxt(s)}</b>` : '要彈什麼曲子呢？'}`, keys, len: TUNE(s).length, answer: TUNE(s).map(String), wrapStyle: 'display:flex;justify-content:center;gap:0;padding:10px;background:#3b2228;border-radius:12px', ok: () => { s.pianoOk = 1; G.toast('一曲彈完，鋼琴的上蓋「啪」地彈開了！'); }, okMsg: '♪ 好聽！', failMsg: '旋律好像不太對，再試一次。', dotColor: () => '#a8494a' });
  }
})();
