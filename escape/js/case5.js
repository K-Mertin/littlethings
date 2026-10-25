'use strict';
// 推理事件 5：音樂會的走音事件（新：看照片找出不對勁的地方）
(() => {
  Object.assign(PEOPLE, {
    fang: { skirt: 1, shoe: '#2a2a32', n: '芳芳', skin: '#fbe0c8', hair: '#3a2420', style: 'pony', cloth: '#fbf6ee', cloth2: '#e0504a', eye: '#4a2e1c', acc: ['blush', 'lash', 'bowRed'], kid: true },
    su: { skirt: 1, n: '蘇老師', skin: '#f6d6bc', hair: '#5a3a3a', style: 'bun', cloth: '#7a4a8a', cloth2: '#f4ead8', eye: '#4a3a2a', acc: ['lash', 'pearl', 'roundGlasses'] },
    ke: { n: '柯指揮', skin: '#f1cfae', hair: '#e8e2d8', style: 'slick', cloth: '#2a2630', cloth2: '#fbf6ee', eye: '#3a2a20', acc: ['bowRed', 'suit', 'mustacheW', 'wrinkle'] },
    xiong: { shoe: '#4f8ad8', n: '大熊', skin: '#f3cfae', hair: '#2a1e18', style: 'short', cloth: '#f08a3a', cloth2: '#fff', eye: '#3a2a1a', acc: ['cap', 'freckle'], kid: true, pants: '#3f5a8a' },
  });
  // 練習室的照片（6:36，大熊從小窗拍的）
  const photo = (big) => {
    let o = `<rect width="600" height="400" fill="#e9d8c0"/><rect width="600" height="270" fill="#c9a8b8"/><rect width="600" height="270" fill="url(#p-diamond)"/><rect y="262" width="600" height="138" fill="#9a6a44"/><rect y="262" width="600" height="138" fill="url(#p-wood)"/><rect y="262" width="600" height="10" fill="#6a4a30"/>`;
    // 窗
    o += `<rect x="440" y="40" width="120" height="150" rx="6" fill="url(#skyEve)" ${SW}/><path d="M500 40v150M440 115h120" stroke="#f4ead8" stroke-width="7"/><rect x="430" y="186" width="140" height="10" rx="3" fill="#f4ead8" ${SW2}/>`;
    // 鋼琴（直立式）
    o += `<g filter="url(#ds2)"><rect x="70" y="80" width="300" height="200" rx="8" fill="#2a2228" ${SW}/><rect x="70" y="80" width="300" height="24" rx="6" fill="#3a3238" ${SW2}/><rect x="88" y="190" width="264" height="40" fill="#fbf6ee" ${SW2}/>`;
    for (let i = 0; i < 21; i++) o += `<path d="M${88 + i * 12.6} 190v40" stroke="#4a3222" stroke-width="1"/>`;
    for (let i = 0; i < 20; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) o += `<rect x="${96 + i * 12.6}" y="190" width="7" height="24" fill="#2a1a10"/>`;
    o += `<rect x="70" y="230" width="300" height="50" fill="#2a2228" ${SW2}/><path d="M80 110h280" stroke="#fff" stroke-opacity=".12" stroke-width="4"/></g>`;
    // 譜架上的樂譜
    o += `<rect x="160" y="124" width="120" height="58" rx="2" fill="#fffaf0" ${SW2}/>` + A.txt(220, 142, '小步舞曲', 12, '#4a3222', 'middle', 900) + [152, 162, 172].map(y => `<path d="M170 ${y}h100" stroke="#9a8a7a" stroke-width="1"/>`).join('') + `<circle cx="190" cy="160" r="3" fill="#4a3222"/><circle cx="216" cy="152" r="3" fill="#4a3222"/><circle cx="244" cy="166" r="3" fill="#4a3222"/>`;
    // 鋼琴蓋上的八音盒（發條在轉、跳出小音符）
    o += `<g filter="url(#ds2)"><rect x="276" y="48" width="74" height="32" rx="4" fill="#a8703f" ${SW2}/><rect x="276" y="48" width="74" height="10" rx="3" fill="#c9895a" ${SW2}/><circle cx="313" cy="66" r="7" fill="url(#brass)" ${SW2}/><path d="M350 62h10v-12h6v18h-16" fill="url(#brass)" ${SW2}/></g>` + A.txt(328, 38, '♪', 18, '#c4502c', 'middle', 900) + A.txt(300, 30, '♫', 14, '#c4502c', 'middle', 900);
    // 空空的鋼琴椅
    o += `<g filter="url(#ds2)"><rect x="150" y="290" width="140" height="22" rx="5" fill="#5a3a3a" ${SW2}/><path d="M162 312v60M278 312v60" stroke="#2a1a10" stroke-width="8"/></g>`;
    // 茶几與茶
    o += `<rect x="420" y="300" width="120" height="14" rx="4" fill="#8c5634" ${SW2}/><path d="M440 314v56M520 314v56" stroke="#5a3a24" stroke-width="7"/><path d="M462 300v-22h28v22z" fill="#fffaf0" ${SW2}/><path d="M490 284q10 0 8 10q-2 6-8 6" fill="none" ${SW2}/><path d="M470 270q-6-10 2-18M482 270q-6-10 2-18" stroke="#fff" stroke-width="3" opacity=".8" fill="none"/>`;
    o += A.plant(570, 370, 0.7, '#d9774b');
    // 照片的時間戳
    o += A.txt(586, 390, '6:36', 22, '#f08a3a', 'end', 900, 'font-family="monospace"') + `<rect width="600" height="400" fill="url(#vig)" opacity=".5"/>`;
    if (big) o += [['bench', 140, 280, 160, 100], ['sheet', 150, 116, 140, 74], ['mbox', 266, 22, 108, 68], ['tea', 410, 246, 140, 130], ['window', 430, 34, 140, 166], ['keys', 80, 186, 280, 48]].map(([id, x, y, w, h]) => `<rect class="sp" data-sp="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`).join('');
    return o;
  };
  const scene = s => {
    let o = A.wall({ c: '#6a2a34', pat: 'diamond', trim: '#c9a14a', wain: '#5a3420', wy: 344, floor: 'wood', fc: ['#8a5a34', '#7a4a2a'], fy: 476 }).replace('<!--DECO-->', '');
    // 舞台布幕與燈光控制台
    o += `<path d="M0 30h130q-20 120 0 240t-10 210H0z" fill="#a8222e" ${SW}/>${[20, 50, 80, 108].map(x => `<path d="M${x} 40q${x % 3 ? 10 : -8} 200 0 430" stroke="#7a1820" stroke-width="5" fill="none"/>`).join('')}<path d="M0 30h130" stroke="#e0b048" stroke-width="10"/><path d="M4 40q50 30 120 0" stroke="#e0b048" stroke-width="4" fill="none"/>`;
    A.fx(`<g class="flick" style="${A.ad(3.3)}"><path d="M60 0L150 0L360 480L-60 480z" fill="url(#shaftG)" opacity=".12"/></g>`);
    o += `<g filter="url(#ds)"><rect x="34" y="388" width="120" height="84" rx="6" fill="#3a3a44" ${SW}/><rect x="44" y="398" width="100" height="26" rx="3" fill="#20242a"/>${[0, 1, 2, 3, 4].map(i => `<rect x="${52 + i * 18}" y="432" width="6" height="30" rx="2" fill="#1a1a20"/><rect x="${48 + i * 18}" y="${440 - (i * 7) % 20}" width="14" height="8" rx="2" fill="#c9cfd6" ${SW2}/>`).join('')}${[0, 1, 2, 3].map(i => `<circle cx="${56 + i * 24}" cy="411" r="5" fill="${['#e0504a', '#f2c232', '#5fae5a', '#4f8ad8'][i]}"/>`).join('')}</g>` + A.txt(94, 382, '燈光', 13, '#f6d48a', 'middle', 900);
    // 化妝台與鏡子
    o += `<g filter="url(#ds)"><rect x="276" y="150" width="180" height="190" rx="10" fill="#e0b048" ${SW}/><rect x="292" y="166" width="148" height="158" rx="6" fill="#cfe2ea" ${SW2}/><rect x="292" y="166" width="148" height="158" rx="6" fill="url(#glass)"/>`;
    for (let i = 0; i < 5; i++) o += `<circle cx="${296 + i * 35}" cy="150" r="8" fill="#fff6c8" ${SW2}/><circle cx="${296 + i * 35}" cy="150" r="16" fill="url(#lampG)"/>`;
    o += `</g>` + A.table(256, 388, 230, 86, '#8c5634');
    // 小提琴（弦鬆掉、琴馬不見）與打開的琴盒
    o += `<g transform="translate(300 372) rotate(-12)"><path d="M0 0q0-14 20-14h96q20 0 20 14t-20 14H20Q0 14 0 0z" fill="#2a2a32" ${SW2}/><path d="M6 0q0-9 14-9h96q14 0 14 9t-14 9H20Q6 9 6 0z" fill="#8a2a3a"/></g>`;
    o += `<g transform="translate(330 360) rotate(-12)"><path d="M0 0q-6-12 6-16q10-2 12 6q4-6 14-4q14 4 8 14q8 6 0 14q6 10-8 14q-10 2-14-4q-2 8-12 6q-12-4-6-16q-6-6 0-14z" fill="#c4683f" ${SW2} transform="scale(1.3 .8)"/><path d="M40 -1h70" stroke="#2a1a10" stroke-width="6" stroke-linecap="round"/><path d="M110 -1h14" stroke="#2a1a10" stroke-width="9" stroke-linecap="round"/>${[-3, -1, 1, 3].map(d => `<path d="M0 ${d}q60 ${d * 3 + 6} 120 ${d * 0.4}" stroke="#e8e0d0" stroke-width="1" fill="none"/>`).join('')}</g>`;
    // 節目單海報
    o += `<g filter="url(#ds2)"><rect x="486" y="96" width="120" height="170" rx="4" fill="#fffaf0" ${SW}/><rect x="486" y="96" width="120" height="40" rx="4" fill="#3f6f8f"/>` + A.txt(546, 122, '小小音樂會', 15, '#fff3dc', 'middle', 900) + A.txt(546, 154, '19:00 開演', 13, '#c4502c', 'middle', 900) + A.txt(546, 180, '① 小提琴獨奏', 11, '#4a3222', 'middle', 700) + A.txt(546, 198, '芳芳', 11, '#4a3222', 'middle', 500) + A.txt(546, 222, '② 鋼琴 蘇老師', 11, '#4a3222', 'middle', 700) + A.txt(546, 246, '③ 合奏', 11, '#4a3222', 'middle', 700) + `</g>` + A.pin(546, 104);
    o += A.wallClock(650, 84, 30, '#5a3420');
    // 練習室的門
    o += `<g filter="url(#ds)">${A.door(712, 170, 170, 300, '#4a2a1a', { knob: true })}</g><rect x="740" y="196" width="114" height="80" rx="6" fill="#f6e2b0" ${SW2}/><rect x="740" y="196" width="114" height="80" rx="6" fill="url(#glass)"/><path d="M760 276v-40h70v40" fill="#2a2228"/><rect x="770" y="228" width="40" height="8" fill="#a8703f"/>` + `<rect x="752" y="134" width="90" height="28" rx="5" fill="#fffaf0" ${SW2}/>` + A.txt(797, 154, '練習室', 15, '#4a3222', 'middle', 900);
    A.fx(`<g class="bob" style="${A.ad(3)}">${A.txt(840, 214, '♪', 20, '#c4502c', 'middle', 900)}</g>`);
    // 掛著外套的衣帽架
    o += `<g filter="url(#ds)"><path d="M944 476V170" stroke="#4a3222" stroke-width="9"/><path d="M944 476V170" stroke="#8c5634" stroke-width="5"/><ellipse cx="944" cy="476" rx="34" ry="8" fill="#5a3420" ${SW2}/><path d="M920 186h48" stroke="#4a3222" stroke-width="6" stroke-linecap="round"/><path d="M944 190l-40 30-8 160h96l-8-160z" fill="#7a4a8a" ${SW}/><path d="M944 190l-14 70h28z" fill="#5a3a6a"/><path d="M906 300h22v26h-22z" fill="#6a3a7a" ${SW2}/></g>`;
    // 人物
    A.person('ke', 138, 312, 0.52, { full: 1 });
    A.person('fang', 470, 328, 0.5, { full: 1, e: s.fangOk ? 'h' : 'w' });
    A.person('su', 594, 312, 0.52, { full: 1 });
    A.person('xiong', 806, 372, 0.56, { full: 1, front: `<g transform="translate(870 512)"><rect x="-16" y="-10" width="32" height="22" rx="4" fill="#2a2a32" ${SW2}/><circle r="7" fill="#4f8ad8" stroke="#c9cfd6" stroke-width="2"/><rect x="6" y="-14" width="8" height="5" fill="#2a2a32"/></g>` });
    return o + A.light();
  };
  CASES.push({
    id: 'c5', no: 5, name: '音樂會的走音事件', en: 'THE OUT-OF-TUNE CONCERT', par: 780, ach: 'c5', thumb: () => scene({}),
    ev: {
      violin: { n: '芳芳的小提琴', d: '四根弦都被轉鬆了，撐著弦的「<b>琴馬</b>」不見了。琴身一點刮傷都沒有──動手的人很小心。', ic: () => `<g transform="rotate(-35 50 50)"><path d="M50 18q-14 0-14 12t8 14q-12 4-12 18q0 20 18 20t18-20q0-14-12-18q8-2 8-14t-14-12z" fill="#c4683f" ${SW}/><path d="M50 4v16" stroke="#2a1a10" stroke-width="6" stroke-linecap="round"/><path d="M50 20v58" stroke="#e8e0d0" stroke-width="1.5"/></g>` },
      program: { n: '節目單', d: '「6:30～6:45　練習室：蘇老師鋼琴暖身（〈小步舞曲〉）。<b>19:00 開演</b>，第一首是芳芳的小提琴獨奏。」', ic: () => IC.paper('#fffaf0', '#3f6f8f', 4) },
      photo: { n: '大熊的照片', d: '大熊 <b>6:36</b> 從練習室的小窗拍的照片。拍的是練習室裡的鋼琴。', ic: () => `<rect x="12" y="20" width="76" height="60" rx="3" fill="#fffaf0" ${SW}/><rect x="18" y="26" width="64" height="44" fill="#c9a8b8"/><rect x="24" y="40" width="34" height="24" fill="#2a2228"/><rect x="52" y="32" width="12" height="7" fill="#a8703f"/>${A.txt(80, 66, '6:36', 9, '#f08a3a', 'end', 900)}` },
      light: { n: '柯指揮的燈光表', d: '柯指揮在舞台上一盞一盞調燈。從 6:30 到 6:45，每五分鐘都簽了名，舞台工作人員也看到他一直在台上。', ic: () => IC.paper('#f4f0e6', '#c4502c', -4) },
      coat: { n: '蘇老師的外套', d: '衣帽架上的紫色外套。口袋裡有一張「老吳鐘錶行（也修樂器）」的收據：「<b>小提琴琴馬 1 個，6:38</b>」，袖口還沾著新鮮的<b>木屑</b>。', ic: () => `<path d="M50 16l-26 20-6 52h64l-6-52z" fill="#7a4a8a" ${SW}/><path d="M50 16l-8 40h16z" fill="#5a3a6a"/><rect x="62" y="60" width="16" height="12" rx="2" fill="#fffaf0" ${SW2}/>` },
      mbox: { n: '鋼琴上的八音盒', d: '一個會彈〈小步舞曲〉的木頭八音盒，上一次發條可以響<b>十五分鐘</b>。底下刻著「鐘一鳴 製」。', ic: () => `<rect x="18" y="40" width="64" height="38" rx="5" fill="#a8703f" ${SW}/><rect x="18" y="40" width="64" height="12" rx="4" fill="#c9895a" ${SW2}/><circle cx="50" cy="62" r="8" fill="url(#brass)" ${SW2}/><path d="M82 56h10v-14h6v20H82" fill="url(#brass)" ${SW2}/>${A.txt(40, 30, '♪', 18, '#c4502c', 'middle', 900)}` },
    },
    intro: [
      { big: 1, t: '事件 5　音樂會的走音事件' },
      '星期六晚上，小鎮音樂廳的後台。七點整，「小小音樂會」就要開始了。',
      { w: 'fang', e: 'c', t: '「小偵探……我的小提琴，四根弦全部鬆掉了！撐弦的琴馬也不見了！」' },
      { w: 'fang', e: 'w', t: '「六點半我把琴放在化妝台上，去喝水。六點四十回來，就變成這樣了……」' },
      { w: 'ke', e: 'a', t: '「七點就要開演了！到底是誰在惡作劇？」' },
      '後台還有三個人：調燈光的柯指揮、在練習室彈琴暖身的蘇老師，還有拿著相機到處拍的大熊。先調查看看吧！',
    ],
    scene: {
      draw: scene,
      hot: [
        { id: 'violin', r: [270, 330, 210, 70], ev: 'violin', t: '芳芳的小提琴：四根弦都被轉得鬆鬆的，撐弦的「琴馬」不見了。琴身一點刮傷都沒有，動手的人很小心。' },
        { id: 'poster', r: [480, 90, 132, 182], ev: 'program', t: '節目單：「6:30～6:45　練習室：蘇老師鋼琴暖身（〈小步舞曲〉）。19:00 開演，第一首是芳芳的小提琴獨奏。」' },
        { id: 'lights', r: [30, 370, 130, 106], ev: 'light', t: '燈光控制台上夾著一張燈光表。柯指揮從 6:30 到 6:45 一直在台上調燈，每五分鐘簽一次名。' },
        { id: 'coat', r: [892, 176, 100, 214], ev: 'coat', t: '衣帽架上掛著蘇老師的紫色外套。口袋露出一張收據：「老吳鐘錶行（也修樂器）──小提琴琴馬 1 個，6:38」。袖口還沾著新鮮的木屑。' },
        { id: 'pwin', r: [736, 190, 124, 92], t: '練習室的小窗。現在蘇老師的茶杯放在窗邊，鋼琴蓋是闔起來的。' },
        { id: 'clock', c: [650, 84, 38], t: '後台的時鐘：6:50。離開演只剩十分鐘了。' },
        { id: 'ke', r: [150, 318, 90, 160], talk: [{ w: 'ke', t: '「我六點半到六點四十五都在台上調燈，燈光表上有我的簽名。」' }, { w: 'ke', e: 'a', t: '「那段時間，練習室的琴聲一直沒停過。蘇老師的〈小步舞曲〉，我聽得一清二楚。」' }] },
        { id: 'fang', r: [478, 334, 84, 146], talk: [{ w: 'fang', e: 'w', t: '「琴馬是撐著弦的小木片……沒有它，琴就完全不能拉了。」' }, { w: 'fang', e: 'c', t: '「這是我第一次獨奏……」' }] },
        { id: 'su', r: [604, 318, 90, 160], talk: [{ w: 'su', t: '「我一直在練習室暖身，剛剛才出來。芳芳，別哭，一定有辦法的。」' }] },
        { id: 'xiong', r: [818, 380, 96, 168], ev: 'photo', t: '大熊把相機給你看：「我在幫大家拍後台的照片！這張是 6:36 從練習室的小窗拍的喔。」' },
      ],
    },
    stages: [
      { type: 'inv', need: ['violin', 'program', 'photo', 'light', 'coat'], goal: '調查現場', h: ['小提琴、牆上的節目單、燈光控制台、衣帽架，還有大熊的相機都看看。要收集 5 件證物。', '大熊手上拿著相機，問問他。衣帽架上的外套口袋好像有東西。', '五件證物：芳芳的小提琴、節目單、大熊的照片、柯指揮的燈光表、蘇老師的外套。'],
        after: ['柯指揮一直在台上，燈光表可以證明。那練習室裡的蘇老師呢？聽聽她怎麼說吧。'] },
      { type: 'test', who: 'su', title: '蘇老師的證詞：我一直在彈琴', goal: '找出證詞的矛盾', hit: [1, 'photo'],
        lines: [
          { t: '六點半，我照節目單進練習室，彈〈小步舞曲〉暖身。', press: [{ w: 'su', t: '「節目單上也寫著喔。」' }] },
          { t: '我一秒鐘都沒有離開過鋼琴，整個後台都聽得到琴聲吧？', press: [{ w: 'ke', t: '「對，琴聲一直沒有停過。」' }, '……可是，聽得到琴聲，就一定是蘇老師在彈嗎？'] },
          { t: '芳芳的琴？我連化妝台都沒有靠近過。', press: [{ w: 'su', e: 'w', t: '「真的……」' }] },
          { t: '你去問柯指揮嘛，他可以作證。', press: [{ w: 'ke', t: '「我只聽到琴聲，沒有看到人。」' }] },
        ],
        wrong: '「這跟我彈琴有什麼關係？」',
        win: ['大熊 6:36 從小窗拍的照片裡──', '<b>練習室的鋼琴椅上，根本沒有人！</b>', { w: 'su', e: 's', t: '「那、那是……」' }, '可是那時候，大家明明都聽到了琴聲。仔細看看這張照片吧！'],
        h: ['她說她一秒鐘都沒離開過鋼琴。', '有一件證物，拍下了 6:36 的練習室。', '在第 2 句「一秒鐘都沒有離開過鋼琴」出示「大熊的照片」。'] },
      { type: 'spot', title: '仔細看照片', goal: '找出照片裡的祕密', sub: '6:36 的練習室：鋼琴椅上沒有人，可是琴聲一直沒有停。<b>是什麼在「彈琴」？</b>點照片裡不對勁的地方。', pic: photo, ans: 'mbox', give: 'mbox',
        no: { bench: '鋼琴椅是空的──這個剛剛就發現了。是誰在「彈」呢？', sheet: '譜架上的〈小步舞曲〉樂譜，看起來很普通。', tea: '一杯還在冒煙的茶。', window: '窗外是音樂廳對面的街道。', keys: '琴鍵上沒有人的手。' },
        okMsg: '是八音盒！',
        win: [{ w: 'xiong', e: 'h', t: '「啊！鋼琴上面有一個木頭盒子，旁邊還有音符！」' }, '那是一個八音盒──上緊發條，就會自己彈〈小步舞曲〉，整整十五分鐘。', '6:30 上緊發條，琴聲就會一直響到 6:45。大家都以為蘇老師在練琴……', { w: 'su', e: 'w', t: '「……」' }],
        h: ['琴聲不一定是人彈出來的。', '看看鋼琴上面放著什麼，旁邊還飄著音符。', '點鋼琴蓋上的木頭盒子（八音盒）。'] },
      { type: 'test', who: 'su', title: '蘇老師的證詞：我只是出去走走', goal: '找出證詞的矛盾', hit: [2, 'coat'],
        lines: [
          { t: '好吧，我是離開了練習室一下子。', press: [{ w: 'su', t: '「上台前太緊張了，想出去走走嘛。」' }] },
          { t: '八音盒是我帶來陪學生練習的，放著放著就忘了關。', press: [{ w: 'su', e: 'w', t: '「它的聲音跟鋼琴很像吧？」' }] },
          { t: '可是我沒有去買任何東西，更沒有碰芳芳的琴。', press: [{ w: 'su', e: 'a', t: '「我身上一毛錢都沒花！」' }] },
          { t: '琴馬不見了……說不定是芳芳自己弄丟的吧？', press: [{ w: 'fang', e: 'c', t: '「才沒有！我出去喝水以前，琴還好好的……」' }] },
        ],
        wrong: '「那又怎麼樣呢？」',
        win: ['蘇老師外套口袋裡的收據：<b>「小提琴琴馬 1 個，6:38」</b>。', '沒有買任何東西？那這張收據是什麼？袖口上的木屑又是從哪裡來的？', { w: 'su', e: 's', t: '「啊……！」' }],
        h: ['她說她沒有買任何東西。', '衣帽架上的外套口袋裡有什麼？', '在第 3 句「沒有去買任何東西」出示「蘇老師的外套」。'] },
      { type: 'accuse', ask: '是誰弄鬆了芳芳的小提琴？', who: ['ke', 'su', 'xiong', 'fang'], ans: 'su', evAsk: '哪件證物證明她去換了琴馬？', ev: 'coat', goal: '指認犯人',
        win: [{ w: 'su', e: 'c', t: '「……對不起，芳芳。是老師。」' }, { w: 'su', e: 'w', t: '「六點半我經過化妝台，看到你的琴馬裂了一條縫。要是在台上拉到一半斷掉，繃緊的弦會彈起來打到你。」' }, { w: 'su', t: '「所以我先把弦轉鬆，拿著裂掉的琴馬跑去對面的老吳那裡買新的。我怕你知道了會更緊張，就上緊八音盒，讓大家以為我還在練琴……」' }, { w: 'su', e: 'h', t: '「新的琴馬已經削好了。來，老師幫你裝上，我們一起把音調準。」' }, { w: 'fang', e: 'h', t: '「老師……謝謝妳！」' }],
        h: ['誰的話裡有兩次矛盾？', '收據和木屑在誰的外套上？', '犯人是蘇老師，決定性的證據是「蘇老師的外套」。'] },
    ],
    outro: ['七點二十分，小小音樂會開始了。', '芳芳的小提琴，聲音又亮又穩。', { w: 'ke', e: 'h', t: '「下次這種事，直接說就好！不過……今天的音準，是我聽過最好的。」' }, { w: 'xiong', e: 'h', t: '「我拍到芳芳拉琴的照片了！」' }, '……那個八音盒底下刻著「鐘一鳴 製」。原來爺爺做的八音盒，也在小鎮的各個角落唱著歌呢。'],
  });
})();
