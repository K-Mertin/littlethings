'use strict';
// 第 8 章：星空閣樓（最終章）
(() => {
  const WALL = { c: '#2f3a6a', pat: 'star', wain: '#4a3a5a', trim: '#e8d8b8', floor: 'wood', fc: ['#8c6a4a', '#7a5a3e'] };
  const PLAN = { mercury: ['水星', '#a8a8b0'], venus: ['金星', '#f2c232'], mars: ['火星', '#e0604a'] };
  const ORB_ANS = { 1: 'mercury', 2: 'venus', 4: 'mars' };
  const DIRS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
  const CONS = [
    { pts: [[10, 40], [28, 34], [44, 38], [58, 46], [62, 64], [84, 66], [86, 46]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]], dir: '北', el: 40 },
    { pts: [[10, 30], [30, 60], [50, 36], [70, 62], [90, 32]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]], dir: '東北', el: 60 },
    { pts: [[50, 20], [20, 74], [82, 70]], lines: [[0, 1], [1, 2], [2, 0]], dir: '南', el: 30 },
    { pts: [[50, 12], [50, 50], [50, 86], [20, 44], [80, 48]], lines: [[0, 1], [1, 2], [3, 1], [1, 4]], dir: '西', el: 20 },
  ];
  const SUS = ['wang', 'li', 'mochi', 'gp'];
  const DESC = ['有<b>七顆星</b>，排起來像一把<b>大杓子</b>', '有<b>五顆星</b>，排起來像一個歪歪的 <b>W</b> 字', '只有<b>三顆星</b>，排成一個<b>三角形</b>', '有<b>五顆星</b>，排成一個<b>十字</b>'];
  const CNAME = ['北斗七星', 'W 字形的星座', '三角形的星座', '十字形的星座'];
  const CANON = { t: 0 };
  const V = s => (s && s.v) || CANON;
  const TG = s => CONS[V(s).t];

  Object.assign(ITEMS, Object.fromEntries(Object.entries(PLAN).map(([k, [n, c]]) => [k, { n: n + '球', d: `${c === '#a8a8b0' ? '灰色' : c === '#f2c232' ? '黃色' : '紅色'}的小球，底下寫著「${n}」。看起來是太陽系模型的零件。`, ic: () => IC.ball(c) }])));
  Object.assign(ITEMS, {
    lens: { n: '望遠鏡鏡片', d: '一片擦得亮晶晶的圓形鏡片。', ic: () => `<circle cx="50" cy="50" r="32" fill="url(#brass)" ${SW}/><circle cx="50" cy="50" r="24" fill="#cfeaf2" ${SW2}/><path d="M36 42l14-10M36 54l24-18" stroke="#fff" stroke-width="4" stroke-linecap="round"/>` },
    pouch: { n: '齒輪袋', d: '前七個房間找到的音符齒輪 Ⅰ～Ⅶ，全都裝在這個小布袋裡。', ic: () => `<path d="M26 40q-6 46 24 46t24-46z" fill="#c9895a" ${SW}/><path d="M30 40q20-14 40 0" fill="none" ${SW}/><path d="M34 36q16 8 32 0" stroke="#e0504a" stroke-width="4" fill="none"/>` + A.gear(50, 60, 12) },
  });

  const telescope = (x, y, sc, s) => `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 0, 110, 14)}<path d="M0-120L-80 0M0-120L80 0M0-120V0" stroke="#5a3a24" stroke-width="10" stroke-linecap="round"/><g transform="rotate(${s.aimed ? -40 : -25} 0 -130)"><rect x="-150" y="-152" width="300" height="44" rx="18" fill="url(#brass)" ${SW}/><rect x="110" y="-160" width="60" height="60" rx="12" fill="#c9a14a" ${SW}/><circle cx="170" cy="-130" r="22" fill="${s.lensOn ? '#cfeaf2' : '#3b2a1f'}" ${SW2}/><rect x="-170" y="-142" width="30" height="24" rx="6" fill="#a8742a" ${SW2}/><path d="M-100-152v44M40-152v44" stroke="#a8742a" stroke-width="4"/></g><circle cx="0" cy="-130" r="14" fill="#5a3a24" ${SW2}/></g>`;
  const dome = s => `<path d="M0 0H1000V200Q500 -60 0 200z" fill="#1f2a50"/><path d="M380 30Q500 -10 620 30V250H380z" fill="${s.aimed ? 'url(#skyNight)' : '#4a5a8a'}" ${SW}/>` + (s.aimed ? [...Array(14)].map((_, i) => `<circle cx="${392 + (i * 53) % 220}" cy="${50 + (i * 37) % 190}" r="${1.5 + (i % 3)}" fill="#fff8d0"/>`).join('') + TG(s).pts.map(([a, b]) => `<circle cx="${420 + a * 1.6}" cy="${80 + b * 1.6}" r="11" fill="#fff6b0" opacity=".3"/><circle cx="${420 + a * 1.6}" cy="${80 + b * 1.6}" r="5" fill="#fff6b0"/>`).join('') : `<path d="M500 20V250M380 140H620" stroke="#2f3a6a" stroke-width="6"/>${A.txt(500, 150, '天窗', 22, '#c9d4ee')}`);
  const orrery = (x, y, sc, s, big) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 120, 200, 20)}<path d="M-80 120h160l-30-60h-100z" fill="#7a4a2a" ${SW}/><rect x="-50" y="70" width="100" height="40" rx="6" fill="${s.orreryOk ? '#2a1a10' : '#a8703f'}" ${SW2}/>${s.orreryOk && !s.lensTaken ? `<g transform="translate(-24 64) scale(.5)">${ITEMS.lens.ic()}</g>` : ''}<path d="M0 60V0" stroke="#c9a14a" stroke-width="8"/>`;
    [1, 2, 3, 4].forEach(r => { o += `<ellipse cx="0" cy="0" rx="${r * 52}" ry="${r * 18}" fill="none" stroke="#d9b56a" stroke-width="3" opacity=".8"/>`; });
    o += `<circle cx="0" cy="0" r="26" fill="#ffcf4a" ${SW} filter="url(#glow)"/>`;
    [1, 2, 3, 4].forEach(r => {
      const a = [0.9, 2.4, 0.2, 3.6][r - 1], px = Math.cos(a) * r * 52, py = Math.sin(a) * r * 18;
      const k = r === 3 ? 'earth' : s.orb[r];
      const col = k === 'earth' ? '#4f8ad8' : k ? PLAN[k][1] : null;
      o += col ? `<circle cx="${px}" cy="${py}" r="${r === 3 ? 15 : 13}" fill="${col}" ${SW2}/>` + (k === 'earth' ? `<path d="M${px - 8} ${py - 4}q6-6 10 2t6 4" stroke="#6fae5a" stroke-width="4" fill="none"/>` : '') : `<circle cx="${px}" cy="${py}" r="11" fill="none" stroke="#fff3dc" stroke-width="2" stroke-dasharray="4 3"/>`;
      if (big) o += A.txt(px, py + 34, r, 16, '#fff3dc', 'middle', 900);
    });
    return o + '</g>';
  };
  const musicBox = (x, y, sc, s) => {
    if (!s.aimed) return `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 0, 170, 16)}<path d="M-160 0q-10-150 40-190h240q50 40 40 190z" fill="#3a3050" ${SW}/><path d="M-120-150q40 30 0 140M60-170q-30 60 20 160" stroke="#2a2040" stroke-width="5" fill="none"/></g>`;
    let o = `<g transform="translate(${x} ${y}) scale(${sc})"><ellipse cx="0" cy="-90" rx="230" ry="160" fill="url(#lampG)"/>${A.sh(0, 0, 180, 16)}<rect x="-170" y="-150" width="340" height="150" rx="14" fill="#8c3a4a" ${SW}/><path d="M-176-150l20-60h312l20 60z" fill="#a84a5a" ${SW}/><rect x="-150" y="-130" width="300" height="110" rx="8" fill="#6a2a3a" ${SW2}/>`;
    for (let i = 0; i < 8; i++) { const gx = -120 + i * 34.3, gy = -76; o += s.boxG[i] ? A.gear(gx, gy, 15) + A.txt(gx, gy + 5, ROMAN[i], 10, '#6a3d10', 'middle', 900) : `<circle cx="${gx}" cy="${gy}" r="14" fill="#3b1a24" ${SW2}/>` + A.txt(gx, gy + 5, ROMAN[i], 11, '#c9a0a8', 'middle', 900); }
    o += `<path d="M170-80h30v-40" stroke="url(#brass)" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="200" cy="-124" r="12" fill="#e0504a" ${SW2}/>${s.played ? `<g>${[0, 1, 2].map(i => A.txt(-80 + i * 80, -230 - (i % 2) * 20, '♪', 40, '#ffe9a0')).join('')}</g>` : ''}</g>`;
    return o;
  };
  const chart = (x, y, sc) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})"><rect x="0" y="0" width="460" height="300" rx="10" fill="#1f2a50" ${SW}/>${A.txt(230, 32, '爺爺的星空觀測表', 20, '#f2c46b', 'middle', 900)}`;
    CONS.forEach((c, i) => {
      const bx = 14 + i * 110, by = 50;
      o += `<rect x="${bx}" y="${by}" width="102" height="230" rx="8" fill="#2b3766" stroke="#f2c46b" stroke-opacity=".4" stroke-width="2"/><g transform="translate(${bx + 1} ${by + 12})">${c.lines.map(([a, b]) => `<path d="M${c.pts[a][0]} ${c.pts[a][1]}L${c.pts[b][0]} ${c.pts[b][1]}" stroke="#8fa8e0" stroke-width="1.5"/>`).join('')}${c.pts.map(([a, b]) => `<circle cx="${a}" cy="${b}" r="4.5" fill="#fff6b0"/>`).join('')}</g>`;
      o += A.txt(bx + 51, by + 150, '方位', 14, '#c9d4ee', 'middle', 500) + A.txt(bx + 51, by + 174, c.dir, 22, '#fff', 'middle', 900) + A.txt(bx + 51, by + 200, '仰角', 14, '#c9d4ee', 'middle', 500) + A.txt(bx + 51, by + 222, c.el + '°', 22, '#fff', 'middle', 900);
    });
    return o + '</g>';
  };

  ROOMS.push({
    id: 'r8', no: 8, name: '星空閣樓', en: 'THE STARRY ATTIC', mood: 'night', par: 720, walls: ['n', 'e', 's', 'w'],
    init: () => ({ orb: {}, boxG: [0, 0, 0, 0, 0, 0, 0, 0] }),
    canon: CANON,
    vary: r => ({ t: rInt(r, 1, 3) }),
    note: { v: 'e', x: 600, y: 118, s: 0.9 },
    amb: v => ['n', 'e', 's', 'w'].includes(v) ? [[60, 90], [250, 60], [700, 150], [930, 80], [880, 260], [130, 300], [610, 330]].map(([x, y]) => { A.twinkle(x, y, 3); return ''; }).join('') : '',
    prep: C => { if (!C.s.prepped) { C.s.prepped = 1; C.give('pouch', true); } ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'].forEach(id => G.memoAdd(id, true)); },
    intro: [
      '旋轉樓梯的盡頭，是一間圓圓的閣樓。圓頂上有一扇天窗，房間中央架著一座黃銅望遠鏡。',
      '這裡就是屋子「最高的地方」。可是……爺爺還是不在。',
      { w: 'mochi', t: '喵嗚～', sfx: 'meow' },
      '麻糬對著西邊角落一個蓋著布的大東西叫個不停。',
      { t: '你摸摸口袋裡的<b>齒輪袋</b>。七枚音符齒輪叮噹作響。\n只差最後一枚了。' },
    ],
    outro: [
      { t: '八音盒唱完最後一個音，望遠鏡後面的布簾「唰」地拉開了──', sfx: 'chime' },
      { w: 'gp', e: 'h', t: '「哈哈哈！被你抓到啦！」' },
      '戴著圓眼鏡、穿著綠背心的爺爺，笑咪咪地站在那裡，手裡還握著一支綠墨水鋼筆。',
      { w: 'gp', t: '「沒錯，X 就是我。我一直躲在閣樓，用望遠鏡和傳聲管偷偷看你闖關。」' },
      { w: 'gp', e: 'h', t: '「火車票是故意留下的線索，鈴鐺、娃娃、機器人，全都是我這一年慢慢做的。」' },
      { w: 'gp', t: '「孩子，這棟八音盒之家，就是爺爺送你的生日禮物。從今天起，你就是這裡的新主人了。」' },
      { t: '樓梯傳來熱鬧的腳步聲──王阿姨捧著草莓蛋糕、郵差小李拿著拉炮，大家都來了！', sfx: 'fanfare' },
      { w: 'wang', e: 'h', t: '「生日快樂！這個蛋糕是你爺爺一大早就來訂的喔。」' },
      { w: 'li', e: 'h', t: '「邀請函可是我親手送到的！」' },
      { w: 'mochi', t: '喵～！', sfx: 'meow' },
      '大八音盒叮叮咚咚唱起了生日快樂歌。天窗外，北斗七星在夜空裡閃閃發亮。',
      { big: 1, t: '～ 全劇終 ～' },
      '謝謝你玩到這裡！不過……爺爺說，地下室好像還藏著一個祕密。「番外篇」和「小鎮推理事件簿」都在等你喔。',
    ],
    views: {
      n: {
        draw: s => A.wall(WALL) + dome(s) + `<g filter="url(#ds)">${telescope(500, 480, 1.1, s)}</g>` + (s.aimed ? `<path d="M420 250L200 620H560L600 250z" fill="url(#beam)" opacity=".6"/>` : '') +
          `<g filter="url(#ds)"><rect x="790" y="390" width="90" height="90" rx="8" fill="#a8703f" ${SW}/></g>` + (s.has_mercury ? '' : `<g transform="translate(800 330) scale(.7)">${ITEMS.mercury.ic()}</g>`) + A.light(),
        hot: s => {
          const h = [{ id: 'scope', r: [300, 260, 420, 230], on: C => { if (s.aimed) { G.toast('望遠鏡對準了北斗七星。'); return; } if (!s.lensOn) { G.toast('望遠鏡前端的鏡片不見了，什麼都看不到。'); return; } W.wheels(C, { id: 'scope', title: '調整望遠鏡', sub: '轉動底座的兩個刻度盤，把望遠鏡對準想看的星座。', okText: '看看', wheels: [{ label: '方位', vals: DIRS, kind: 'txt' }, { label: '仰角', vals: [10, 20, 30, 40, 50, 60, 70, 80].map(v => v + '°'), kind: 'sm' }], check: (i, v) => v[0] === TG(s).dir && v[1] === TG(s).el + '°', failMsg: '望遠鏡裡只看到一片星星，不是爺爺說的那個星座。', okMsg: '看到了！就是爺爺最喜歡的星座！', ok: C => { s.aimed = 1; C.give('g8', true); Snd.play('light'); G.dlg([`望遠鏡裡，找到了爺爺日記裡寫的星座──${CNAME[V(s).t]}！`, { t: '「喀啦喀啦」，圓頂的天窗緩緩打開，星光灑進閣樓，照亮了西邊角落那個蓋著布的大東西。', sfx: 'open' }, { t: '望遠鏡的鏡筒裡，滑出了最後一枚「<b>音符齒輪 Ⅷ</b>」！', sfx: 'pick' }], () => C.render()); } }); }, use: { lens: C => { C.take('lens'); s.lensOn = 1; Snd.play('click'); G.toast('把鏡片裝回望遠鏡前端。現在看得清楚了！'); } } }];
          if (!s.has_mercury) h.push({ id: 'mercury', r: [790, 320, 90, 90], on: C => { s.has_mercury = 1; C.give('mercury'); } });
          h.push({ id: 'dome', r: [380, 30, 240, 210], t: s.aimed ? '天窗打開了，滿天星斗。' : '圓頂上的天窗關著。' });
          return h;
        },
      },
      e: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${chart(80, 80, 1)}</g>` + A.table(620, 380, 300, 92, '#7a4a2a') + `<g transform="rotate(-6 720 360)"><rect x="660" y="346" width="110" height="30" rx="4" fill="#4f8a5a" ${SW}/><rect x="666" y="340" width="98" height="10" fill="#fffaf0"/></g>` + A.lamp(870, 368, '#f2c46b') + (s.has_venus ? '' : `<g transform="translate(780 312) scale(.6)">${ITEMS.venus.ic()}</g>`) + A.light(),
        hot: s => {
          const h = [
            { id: 'chart', r: [70, 70, 480, 320], go: 'chart' },
            { id: 'diary', r: [640, 320, 150, 70], on: () => { s.readDiary = 1; G.read('爺爺的觀星日記', `我最喜歡的星座，${DESC[V(s).t]}。\n小時候，我的爺爺也是這樣抱著我，一起找它。\n\n孩子，用望遠鏡找到它吧。\n星光會告訴你最後一枚齒輪在哪裡。`, 'green'); } },
          ];
          if (!s.has_venus) h.push({ id: 'venus', r: [770, 300, 80, 80], on: C => { s.has_venus = 1; C.give('venus'); } });
          return h;
        },
      },
      chart: {
        back: 'e', title: '星空觀測表',
        draw: s => A.closeBg('#2f3a6a', 'star') + `<g filter="url(#ds)">${chart(75, 38, 1.85)}</g>` + A.light(),
        hot: s => [{ id: 'c', r: [40, 60, 920, 520], t: '四個星座的形狀，下面寫著要把望遠鏡轉到的方位和仰角。' }],
      },
      s: {
        draw: s => A.wall(WALL) + A.table(330, 380, 340, 92, '#7a4a2a') + `<g filter="url(#ds)">${orrery(500, 256, 0.95, s)}</g>` +
          `<g transform="rotate(2 860 200)"><rect x="760" y="100" width="200" height="230" rx="6" fill="#fff6e4" ${SW}/>${A.pin(860, 108)}${A.txt(860, 140, '太陽系的家人', 18, '#2f3a6a', 'middle', 900)}<circle cx="790" cy="190" r="16" fill="#ffcf4a" ${SW2}/>${[['#a8a8b0', '水星'], ['#f2c232', '金星'], ['#4f8ad8', '地球'], ['#e0604a', '火星']].map(([c, n], i) => `<circle cx="${828 + i * 34}" cy="190" r="${8 + (i === 2 ? 2 : 0)}" fill="${c}" ${SW2}/>` + A.txt(828 + i * 34, 222, n, 12, '#4a3222', 'middle', 700)).join('')}${A.txt(860, 262, '離太陽由近到遠', 14, '#7a6250', 'middle', 700)}<path d="M790 280h140" stroke="#7a6250" stroke-width="2" marker-end=""/><path d="M920 274l10 6-10 6" fill="none" stroke="#7a6250" stroke-width="2"/></g>` + A.light(),
        hot: s => [
          { id: 'orrery', r: [270, 170, 460, 260], go: 'orrery' },
          { id: 'poster', r: [750, 90, 220, 250], on: () => G.read('海報：太陽系的家人', '離太陽<b>由近到遠</b>：\n\n① 水星（灰色）\n② 金星（黃色）\n③ 地球（藍色）\n④ 火星（紅色）\n\n……還有更遠的木星、土星喔！') },
        ],
      },
      orrery: {
        back: 's', title: '太陽系模型',
        draw: s => A.closeBg('#2f3a6a', 'star') + `<g filter="url(#ds)">${orrery(500, 250, 2.1, s, true)}</g>` + A.txt(500, 56, '拿著行星球點軌道上的虛線圈；點放好的球可以拿下來。', 22, '#fff3dc', 'middle', 700) + A.light(),
        hot: s => {
          const h = [1, 2, 4].map(r => { const a = [0.9, 2.4, 0.2, 3.6][r - 1]; return { id: 'orb' + r, c: [500 + Math.cos(a) * r * 52 * 2.1, 250 + Math.sin(a) * r * 18 * 2.1, 42], on: C => { if (s.orreryOk) return; if (s.orb[r]) { C.give(s.orb[r], true); delete s.orb[r]; Snd.play('select'); } else G.toast(`第 ${r} 圈軌道，上面是空的。`); }, use: Object.fromEntries(Object.keys(PLAN).map(k => [k, C => { if (s.orb[r]) { G.toast('這條軌道上已經有行星了。'); return; } C.take(k); s.orb[r] = k; Snd.play('click'); checkOrrery(C); }])) }; });
          h.push({ id: 'base', r: [380, 380, 240, 120], on: C => { if (s.orreryOk && !s.lensTaken) { s.lensTaken = 1; C.give('lens'); } else if (!s.orreryOk) G.toast('底座有一個小抽屜，打不開。'); } });
          h.push({ id: 'earth', c: [500 + Math.cos(0.2) * 3 * 52 * 2.1, 250 + Math.sin(0.2) * 3 * 18 * 2.1, 36], t: '藍色的地球已經在第 3 圈軌道上了。' });
          return h;
        },
      },
      w: {
        draw: s => A.wall(WALL) + (s.aimed ? `<path d="M380 0L180 520H820L620 0z" fill="url(#beam)" opacity=".5"/>` : '') + `<g filter="url(#ds)"><rect x="300" y="420" width="400" height="60" rx="8" fill="#4a3a5a" ${SW}/></g>` + `<g filter="url(#ds)">${musicBox(500, 420, 1, s)}</g>` +
          (s.has_mars ? '' : `<g filter="url(#ds)"><rect x="90" y="400" width="120" height="80" rx="10" fill="#e98a8a" ${SW}/><ellipse cx="150" cy="400" rx="66" ry="14" fill="#f4a8a8" ${SW}/></g><g transform="translate(118 330) scale(.65)">${ITEMS.mars.ic()}</g>`) + A.cat(830, 478, 0.7) + A.light(),
        hot: s => {
          const h = [{ id: 'box', r: [300, 200, 420, 280], on: C => onBox(C), use: { pouch: C => { if (!s.aimed) { G.toast('太暗了，看不清楚布底下是什麼。'); C.give('pouch', true); return; } C.take('pouch'); for (let i = 0; i < 7; i++) s.boxG[i] = 1; Snd.play('gear'); G.toast('把齒輪 Ⅰ～Ⅶ 一枚一枚嵌進八音盒的凹槽。' + (s.boxG[7] ? '' : '還差一個「Ⅷ」。')); }, g8: C => { if (!s.aimed) return; C.take('g8'); s.boxG[7] = 1; Snd.play('gear'); G.toast('嵌進最後一枚齒輪 Ⅷ。'); } } }];
          if (!s.has_mars) h.push({ id: 'mars', r: [90, 320, 120, 160], on: C => { s.has_mars = 1; C.give('mars'); } });
          h.push({ id: 'cat', r: [770, 380, 120, 110], on: () => { Snd.play('meow'); G.toast('麻糬瞇著眼睛，一副「我早就知道了」的樣子。'); } });
          return h;
        },
      },
    },
    steps: [
      { goal: '找齊三顆行星球', done: s => s.has_mercury && s.has_venus && s.has_mars, h: ['閣樓裡散落著幾顆彩色的小球。', '北邊木箱上、東邊桌上、西邊帽盒上各有一顆。', '灰色水星在北邊、黃色金星在東邊桌上、紅色火星在西邊帽盒上。'] },
      { goal: '把太陽系模型排好', done: s => s.orreryOk, h: ['南邊的太陽系模型缺了三顆行星，牆上有海報。', '海報說離太陽由近到遠是水星、金星、地球、火星。地球已經在第 3 圈。', '第 1 圈放水星（灰）、第 2 圈放金星（黃）、第 4 圈放火星（紅）。'] },
      { goal: '修好望遠鏡', done: s => s.lensOn, h: ['太陽系模型的底座打開了。', '點底座的小抽屜拿到鏡片。', '拿望遠鏡鏡片點北邊的望遠鏡。'] },
      { goal: '用望遠鏡找到爺爺最喜歡的星座', done: s => s.aimed, h: ['東邊桌上有爺爺的觀星日記，牆上有星空觀測表。', s => `日記說那個星座${DESC[V(s).t].replace(/<\/?b>/g, '')}。在觀測表上找出形狀一樣的那一個。`, s => `把望遠鏡轉到方位「${TG(s).dir}」、仰角「${TG(s).el}°」。`] },
      { goal: '把八枚齒輪裝進八音盒', done: s => s.boxG.every(Boolean), h: ['天窗打開後，西邊角落的大八音盒露出來了。', '拿齒輪袋點八音盒，再拿齒輪 Ⅷ 點八音盒。', '齒輪袋和音符齒輪 Ⅷ 都要用在西邊的八音盒上。'] },
      { goal: '轉動八音盒', done: s => s.played, h: ['八音盒旁邊有一個紅色的搖桿。', '八枚齒輪都裝好了，點一下八音盒試試看。', '點西邊的八音盒，轉動搖桿讓它唱歌。'] },
      { goal: '說出 X 的真面目', done: s => s.solved, h: ['打開右上角的手帳，看看關於 X 的線索。X 的字條是用什麼寫的？', '手帳裡有一條線索說，那種墨水全世界只有一個人有。', 'X 就是鐘爺爺。出示「綠墨水鋼筆」那條線索。'] },
    ],
  });

  function checkOrrery(C) {
    const s = C.s;
    if (![1, 2, 4].every(r => s.orb[r])) return;
    if ([1, 2, 4].every(r => s.orb[r] === ORB_ANS[r])) { s.orreryOk = 1; Snd.play('unlock'); G.toast('行星們開始繞著太陽轉！底座的小抽屜「喀」地打開了。'); }
    else { Snd.play('wrong'); G.toast('模型轉了一下又停住了。行星的順序好像不對。'); }
  }
  function onBox(C) {
    const s = C.s;
    if (!s.aimed) { G.toast('角落太暗了，只看得到一個蓋著布的大東西。'); return; }
    if (!s.boxG.every(Boolean)) { G.toast(`一座好大的八音盒！上面有八個凹槽，刻著 Ⅰ～Ⅷ。${s.boxG.some(Boolean) ? '' : '口袋裡的齒輪好像剛好放得進去。'}`); return; }
    if (!s.played) {
      s.played = 1; C.save(); C.render();
      Snd.melody([67, 67, 69, 67, 72, 71, 0, 67, 67, 69, 67, 74, 72], 0.36);
      setTimeout(() => G.dlg([
        '轉動搖桿，八音盒叮叮咚咚地唱起了〈生日快樂歌〉。',
        { t: '歌聲結束後，八音盒裡傳出一段錄音：', sfx: 'chime' },
        { w: 'x', t: '「恭喜你，解開了八音盒之家所有的房間。」' },
        { w: 'x', t: '「最後一個問題──你知道我，X，是誰嗎？把答案告訴八音盒吧。」' },
      ], () => accuse(C)), 300);
      return;
    }
    if (!s.solved) accuse(C);
  }
  function accuse(C) {
    const s = C.s;
    const body = G.modal(`<h3>X 是誰？</h3><p class="sub">選出你心中的 X。</p><div class="choices">${SUS.map(k => `<button class="choice" data-s="${k}">${Face.draw(k, 'n')}${PEOPLE[k].n}</button>`).join('')}</div><p class="msg"></p>`, { w: 560 });
    body.onclick = e => {
      const b = e.target.closest('[data-s]'); if (!b) return;
      const k = b.dataset.s;
      if (k !== 'gp') {
        Snd.play('wrong');
        const why = { wang: '王阿姨有備用鑰匙……可是她的字跡是圓圓的藍色原子筆。手帳裡還有更關鍵的線索。', li: '小李送來了邀請函，可是他今天一直在鎮上送信。再看看手帳吧。', mochi: '麻糬確實什麼都知道的樣子……可是貓咪不會寫字啊！' }[k];
        W.fail(body, why); C.miss = (C.miss || 0) + 1; return;
      }
      G.closeModal();
      G.toast('那麼，哪一條線索能證明 X 就是爺爺呢？');
      setTimeout(() => G.memoView(true, id => {
        if (id === 'm3') {
          s.solved = 1; C.save(); Snd.play('objection');
          G.dlg([{ big: 1, t: 'X 就是──鐘爺爺！' }, 'X 的字條是用綠色墨水寫的。而那種「爺爺特調薄荷綠」墨水，全世界只有一瓶，就在爺爺的鋼筆裡！'], () => C.win());
        } else {
          Snd.play('wrong'); G.toast('嗯……這條線索好像還不能證明 X 就是爺爺。再找找看，有沒有「只有爺爺才有」的東西？');
        }
      }), 300);
    };
  }
})();
