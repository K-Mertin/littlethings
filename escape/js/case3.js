'use strict';
// 推理事件 3：鐘樓停擺之謎
(() => {
  const bust = (who, x, y, sc = 1, e = 'n') => `<svg x="${x}" y="${y}" width="${200 * sc}" height="${240 * sc}" viewBox="0 0 200 240">${Face.body(PEOPLE[who], e)}</svg>`;
  const tree = (x, y, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 4, 50, 10, 0.25)}<path d="M-9 0q3-60-2-110h22q-5 50-2 110z" fill="#7a4a2a" ${SW}/>${[[-38, -130, 46], [30, -138, 50], [-4, -176, 54], [-46, -176, 34], [44, -184, 36]].map(([a, b, r], k) => `<circle cx="${a}" cy="${b}" r="${r}" fill="${k % 2 ? '#5f9e5a' : '#4f8a4a'}" ${SW}/><circle cx="${a - r * 0.3}" cy="${b - r * 0.35}" r="${r * 0.45}" fill="#7ab86a" opacity=".7"/>`).join('')}</g>`;
  const lampPost = x => `<g filter="url(#ds2)"><path d="M${x} 450V250" stroke="#3b3a40" stroke-width="8"/><path d="M${x - 14} 450h28" stroke="#3b3a40" stroke-width="10" stroke-linecap="round"/><path d="M${x - 16} 250h32l-6-30h-20z" fill="#f6e2a0" ${SW2}/><path d="M${x - 20} 222h40l-20-16z" fill="#3b3a40" ${SW2}/></g>`;
  const bunt = (x1, y1, x2, y2) => { let o = `<path d="M${x1} ${y1}Q${(x1 + x2) / 2} ${Math.max(y1, y2) + 40} ${x2} ${y2}" stroke="#7a5a40" stroke-width="2" fill="none"/>`; const cols = ['#e0504a', '#f2c232', '#4f9e9a', '#e57aa8', '#4f8ad8']; for (let i = 1; i < 10; i++) { const t = i / 10, x = (1 - t) * (1 - t) * x1 + 2 * t * (1 - t) * (x1 + x2) / 2 + t * t * x2, y = (1 - t) * (1 - t) * y1 + 2 * t * (1 - t) * (Math.max(y1, y2) + 40) + t * t * y2; o += `<path d="M${x - 9} ${y}h18l-9 16z" fill="${cols[i % 5]}" ${SW2}/>`; } return o; };
  const scene = s => {
    let o = `<rect width="1000" height="625" fill="url(#sky)"/><circle cx="880" cy="80" r="70" fill="url(#sunG)"/><circle cx="880" cy="80" r="34" fill="#fff6c8"/>`;
    A.fx(`<g class="cloud" style="animation-duration:50s;${A.ad(50)}"><path d="M60 110h120a16 16 0 0 0-8-28a24 24 0 0 0-42-8a18 18 0 0 0-46 18z" fill="#fff" opacity=".9"/></g>`);
    A.fx(`<g class="cloud" style="animation-duration:70s;${A.ad(70)}"><path d="M640 70h90a12 12 0 0 0-6-22a18 18 0 0 0-32-6a14 14 0 0 0-34 14z" fill="#fff" opacity=".85"/></g>`);
    o += `<path d="M180 120q6-6 12 0q6-6 12 0M220 100q5-5 10 0q5-5 10 0M760 160q5-5 10 0q5-5 10 0" stroke="#4a5a7a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    // 遠方的屋頂與山丘
    o += `<path d="M0 330Q160 260 330 300T700 280T1000 300V440H0z" fill="#9fcf8a"/><path d="M0 360Q200 320 420 350T1000 340V440H0z" fill="#8cc47a"/>`;
    [[300, 330, '#c4683f'], [360, 320, '#d9a070'], [640, 316, '#a8494a'], [700, 330, '#c9895a'], [980, 330, '#c4683f']].forEach(([x, y, c]) => o += `<rect x="${x - 26}" y="${y}" width="52" height="${440 - y}" fill="#f4e6cc" ${SW2}/><rect x="${x - 26}" y="${y}" width="52" height="${440 - y}" fill="url(#p-brick)" opacity=".25"/><path d="M${x - 34} ${y}l34-28 34 28z" fill="${c}" ${SW2}/><path d="M${x - 26} ${y - 6}h52M${x - 18} ${y - 13}h36M${x - 10} ${y - 20}h20" stroke="${shade(c, -0.3)}" stroke-width="1" stroke-dasharray="4 2"/><rect x="${x + 12}" y="${y - 30}" width="8" height="14" fill="#a8746a" ${SW2}/><rect x="${x - 8}" y="${y + 18}" width="16" height="16" fill="#cfeaf2" ${SW2}/><path d="M${x} ${y + 18}v16M${x - 8} ${y + 26}h16" stroke="#fffaf0" stroke-width="1.4"/><rect x="${x - 10}" y="${y + 34}" width="20" height="4" fill="#8c5634"/><circle cx="${x - 5}" cy="${y + 33}" r="2" fill="#e57aa8"/><circle cx="${x + 4}" cy="${y + 33}" r="2" fill="#f2c232"/>`);
    // 石板廣場
    o += `<rect y="430" width="1000" height="195" fill="#d9c8a8"/>`;
    for (let r = 0; r < 7; r++) for (let k = 0; k < 22; k++) { const y = 444 + r * 26 + r * r * 0.8, x = k * 48 + (r % 2) * 24 - 10; o += `<rect x="${x}" y="${y}" width="${42 + r * 2}" height="${18 + r * 1.5}" rx="7" fill="${hash(r * 31 + k) > 0.5 ? '#e4d4b4' : '#cfbd9a'}" stroke="#b8a47e" stroke-width="1.5"/>`; }
    o += `<rect y="430" width="1000" height="40" fill="url(#aoDn)" opacity=".35"/>`;
    o += tree(330, 432, 0.95) + tree(680, 432, 1.05);
    // 鐘樓
    o += `<g filter="url(#ds)"><rect x="420" y="110" width="160" height="330" fill="#d9a070" ${SW}/><rect x="420" y="110" width="160" height="330" fill="url(#p-brick)" opacity=".55"/><rect x="420" y="110" width="160" height="330" fill="url(#cyl)" opacity=".6"/><path d="M400 110l100-80 100 80z" fill="#a8494a" ${SW}/><path d="M420 96l80-62" stroke="#fff" stroke-opacity=".25" stroke-width="5"/><circle cx="500" cy="190" r="62" fill="url(#brass)" ${SW}/><circle cx="500" cy="190" r="54" fill="#fffaf0" ${SW}/>`;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; o += `<circle cx="${(500 + Math.sin(a) * 45).toFixed(1)}" cy="${(190 - Math.cos(a) * 45).toFixed(1)}" r="${i % 3 ? 2.5 : 4}" fill="#4a3222"/>`; }
    o += `<path d="M500 190V150" stroke="#4a3222" stroke-width="6" stroke-linecap="round" transform="rotate(${3.25 * 30} 500 190)"/><path d="M500 190V144" stroke="#4a3222" stroke-width="4" stroke-linecap="round" transform="rotate(90 500 190)"/><circle cx="500" cy="190" r="5" fill="#4a3222"/><rect x="468" y="300" width="64" height="140" rx="30" fill="#7a4a2a" ${SW}/><rect x="468" y="300" width="64" height="140" rx="30" fill="url(#p-wood)"/><circle cx="520" cy="372" r="4" fill="url(#brass)"/><rect x="440" y="262" width="120" height="16" fill="#c9895a" ${SW2}/></g>`;
    o += A.txt(500, 280, '齒輪室', 13, '#4a3222', 'middle', 900);
    // 咖啡店
    o += `<g filter="url(#ds)"><rect x="40" y="220" width="240" height="220" fill="#fbe3b0" ${SW}/><rect x="40" y="220" width="240" height="220" fill="url(#p-brick)" opacity=".35"/><path d="M30 220h260l-20-50H50z" fill="#4f9e9a" ${SW}/><path d="M40 186h240" stroke="#fff" stroke-width="8" stroke-dasharray="20 20"/><path d="M30 220h260" stroke="#fff" stroke-width="4"/><rect x="70" y="300" width="80" height="140" fill="#8c5634" ${SW2}/><rect x="70" y="300" width="80" height="140" fill="url(#p-wood)"/><rect x="82" y="314" width="56" height="44" rx="4" fill="#cfeaf2" ${SW2}/><circle cx="140" cy="380" r="4" fill="url(#brass)"/><rect x="170" y="280" width="90" height="70" fill="#cfeaf2" ${SW2}/><rect x="170" y="280" width="90" height="70" fill="url(#glass)"/><path d="M215 280v70" ${SW2}/><rect x="166" y="350" width="98" height="10" rx="3" fill="#c9895a" ${SW2}/>` + [180, 214, 246].map(x => `<circle cx="${x}" cy="346" r="7" fill="${x % 3 ? '#e57aa8' : '#f2c232'}" ${SW2}/>`).join('') + `<rect x="196" y="400" width="54" height="40" rx="4" fill="#3b2a2a" ${SW2}/></g>` + A.txt(160, 255, '咖啡店', 20, '#4a3222', 'middle', 900) + A.txt(223, 418, '熱可可', 11, '#fff3dc', 'middle', 700) + A.txt(223, 432, '今日', 10, '#f6d48a', 'middle', 700);
    // 郵局
    o += `<g filter="url(#ds)"><rect x="720" y="230" width="240" height="210" fill="#e8f0e0" ${SW}/><rect x="720" y="230" width="240" height="210" fill="url(#p-stone)" opacity=".45"/><rect x="710" y="200" width="260" height="40" fill="#3f7f5a" ${SW}/><rect x="800" y="320" width="80" height="120" fill="#3f7f5a" ${SW2}/><rect x="812" y="334" width="56" height="40" rx="4" fill="#cfeaf2" ${SW2}/><rect x="740" y="280" width="50" height="40" fill="#cfeaf2" ${SW2}/><rect x="740" y="280" width="50" height="40" fill="url(#glass)"/><rect x="900" y="270" width="40" height="50" fill="#cfeaf2" ${SW2}/><rect x="914" y="380" width="34" height="60" rx="8" fill="#d9473a" ${SW2}/><rect x="920" y="392" width="22" height="5" fill="#2a1a10"/></g>` + A.txt(840, 228, '郵局', 20, '#fff', 'middle', 900);
    o += lampPost(305) + lampPost(700);
    o += bunt(420, 120, 280, 172) + bunt(580, 120, 712, 202);
    // 舞台
    o += `<g filter="url(#ds2)"><rect x="300" y="430" width="400" height="34" fill="#c4502c" ${SW}/><path d="M300 438h400" stroke="#f2c46b" stroke-width="3"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${310 + i * 50} 444q20 14 40 0" stroke="#a8322a" stroke-width="3" fill="none"/>`).join('')}</g><path d="M650 432V380" stroke="#3b3a40" stroke-width="4"/><path d="M638 432h24" stroke="#3b3a40" stroke-width="5" stroke-linecap="round"/><rect x="645" y="368" width="10" height="16" rx="5" fill="#3b3a40"/>`;
    // 人物（會呼吸、眨眼）
    A.person('mayor', 572, 274, 0.5, { full: 1 });
    A.person('wu', 286, 390, 0.54, { full: 1 });
    A.person('mei', 86, 386, 0.54, { full: 1, e: 'h', front: [['#e0504a', 44], ['#4fa3d8', 68], ['#f2c232', 92]].map(([c, x], i) => `<path d="M${x} ${400 - i * 6}Q${x + 6} 470 ${99} 522" stroke="#4a3222" stroke-width="1.5" fill="none"/><ellipse cx="${x}" cy="${378 - i * 6}" rx="18" ry="22" fill="${c}" ${SW2}/><ellipse cx="${x - 6}" cy="${370 - i * 6}" rx="5" ry="8" fill="#fff" opacity=".45"/>`).join('') });
    A.person('li', 786, 386, 0.54, { full: 1 });
    return o + A.light();
  };
  CASES.push({
    id: 'c3', no: 3, name: '鐘樓停擺之謎', par: 720, thumb: () => scene({}),
    ev: {
      photo: { n: '廣場的照片', d: '攝影師拍的照片：<b>鎮長</b>在廣場的台上致詞，背景的鐘樓剛好指著 <b>3:15</b>，之後就停住了。', ic: () => `<rect x="14" y="20" width="72" height="60" rx="3" fill="#fff" ${SW}/><rect x="20" y="26" width="60" height="44" fill="#8fd3f0"/><rect x="44" y="34" width="14" height="36" fill="#d9a070"/><circle cx="51" cy="40" r="5" fill="#fff"/>` },
      cafe: { n: '咖啡店老闆的話', d: '「3:15 的時候，店裡只有一位客人，是位<b>綁著雙馬尾的小姐</b>，點了熱可可。」', ic: () => `<path d="M26 40h40v30q0 12-12 12H38q-12 0-12-12z" fill="#fff" ${SW}/><path d="M66 46q14 0 10 12q-4 8-10 6" fill="none" ${SW}/><path d="M38 30q4-8 0-14M50 30q4-8 0-14" stroke="#c9a14a" stroke-width="3" fill="none"/>` },
      post: { n: '郵局職員的話', d: '「3:15 有人來寄包裹。那人<b>沒穿郵差制服</b>，是位<b>光頭的老先生</b>。」', ic: () => `<rect x="18" y="30" width="64" height="44" rx="4" fill="#fffaf0" ${SW}/><path d="M18 30l32 24 32-24" fill="none" ${SW}/>` },
      button: { n: '金色鈕扣', d: '卡在鐘樓齒輪裡的金色鈕扣，上面刻著<b>郵局的信封標誌</b>。齒輪之間還夾著一根掃把柄。', ic: () => `<circle cx="50" cy="50" r="24" fill="url(#brass)" ${SW}/><rect x="40" y="42" width="20" height="14" fill="none" stroke="#6a3d10" stroke-width="2"/><path d="M40 42l10 8 10-8" fill="none" stroke="#6a3d10" stroke-width="2"/>` },
      grid: { n: '3:15 行蹤表', d: '整理出來的結果：3:15 鎮長在<b>廣場</b>、阿美在<b>咖啡店</b>、老吳在<b>郵局</b>、小李在<b>鐘樓</b>。', ic: () => `<rect x="16" y="16" width="68" height="68" rx="4" fill="#fffaf0" ${SW}/><path d="M16 38h68M16 60h68M38 16v68M60 16v68" stroke="#c9a87f" stroke-width="2"/><circle cx="49" cy="27" r="6" fill="none" stroke="#2f7d4f" stroke-width="3"/><circle cx="27" cy="71" r="6" fill="none" stroke="#2f7d4f" stroke-width="3"/>` },
    },
    intro: [
      { big: 1, t: '事件 3　鐘樓停擺之謎' },
      '小鎮一年一度的秋日祭典。四點鐘，廣場上要舉行兒童合唱表演。',
      { w: 'mayor', e: 'w', t: '「不得了！鐘樓的時鐘在 3 點 15 分停住了！大家看不到時間，表演的流程全亂了！」' },
      { w: 'wu', e: 'a', t: '「我每天早上都上發條，齒輪也剛上過油，不可能自己停的！一定是有人搞鬼！」' },
      '3:15 前後，有四個人在鐘樓附近：鐘樓管理員老吳、賣氣球的阿美、郵差小李，還有鎮長。',
      '先到現場收集線索吧！',
    ],
    scene: {
      draw: scene,
      hot: [
        { id: 'tower', r: [430, 130, 140, 160], ev: 'photo', t: '鐘樓的時鐘停在 3:15。攝影師遞給你一張照片：鎮長在台上致詞，背景的鐘樓正好是 3:15。' },
        { id: 'gearroom', r: [440, 260, 120, 180], ev: 'button', t: '爬上齒輪室一看──兩個大齒輪之間卡著一根<b>掃把柄</b>！齒輪縫裡還夾著一顆<b>金色鈕扣</b>，上面刻著郵局的信封標誌。' },
        { id: 'cafe', r: [40, 170, 240, 120], ev: 'cafe', t: '咖啡店老闆說：「3:15 的時候，店裡只有一位客人，是位綁著雙馬尾的小姐，點了熱可可。」' },
        { id: 'post', r: [720, 200, 240, 120], ev: 'post', t: '郵局職員說：「3:15 有人來寄包裹。那人沒穿郵差制服，是位光頭的老先生。」' },
        { id: 'mayor', r: [590, 280, 100, 150], talk: [{ w: 'mayor', t: '「3 點 15 分？我正在台上致詞啊，全鎮的人都看到了。」' }] },
        { id: 'wu', r: [296, 396, 96, 170], talk: [{ w: 'wu', t: '「我那時候去寄包裹給孫子，回來鐘就停了！」' }] },
        { id: 'mei', r: [96, 392, 96, 170], talk: [{ w: 'mei', e: 'h', t: '「我去咖啡店喝了杯熱可可，氣球攤請隔壁幫我顧一下。」' }] },
        { id: 'li', r: [796, 392, 96, 170], talk: [{ w: 'li', e: 'w', t: '「我、我一直在郵局整理信件啦。今天的信好多喔。」' }, '小李的制服……好像少了一顆釦子？'] },
      ],
    },
    stages: [
      { type: 'inv', need: ['photo', 'button', 'cafe', 'post'], goal: '調查現場', h: ['鐘樓、齒輪室、咖啡店、郵局都可以調查。要收集 4 件證物。', '鐘樓下面的「齒輪室」也要進去看看。', '四件證物：廣場的照片、金色鈕扣、咖啡店老闆的話、郵局職員的話。'],
        after: ['線索收集齊了。先把四個人 3:15 在哪裡整理清楚吧！'] },
      { type: 'grid', title: '3:15 大家在哪裡？', sub: '根據證詞，整理出每個人 3:15 的位置。每個人只在一個地方，每個地方只有一個人。', goal: '整理行蹤', rows: ['mayor', 'mei', 'wu', 'li'], cols: ['鐘樓', '廣場', '郵局', '咖啡店'],
        clues: ['照片：3:15 鎮長在廣場的台上致詞。', '咖啡店老闆：3:15 店裡唯一的客人，是綁著雙馬尾的小姐。（四個人裡只有阿美綁雙馬尾）', '郵局職員：3:15 來寄包裹的，是沒穿制服的光頭老先生。（四個人裡只有老吳是光頭）'],
        ans: { mayor: '廣場', mei: '咖啡店', wu: '郵局', li: '鐘樓' }, give: 'grid',
        win: ['行蹤整理好了：鎮長在廣場、阿美在咖啡店、老吳在郵局……', '剩下的地方只有<b>鐘樓</b>。3:15 在鐘樓的，只可能是──', { w: 'li', e: 's', t: '「我、我說了，我在郵局整理信件！」' }],
        h: ['先把確定的人填 ○：照片、咖啡店、郵局的證詞各指出一個人。', '鎮長在廣場、阿美在咖啡店、老吳在郵局。剩下的人在剩下的地方。', '鎮長─廣場、阿美─咖啡店、老吳─郵局、小李─鐘樓，四個格子填 ○，其他留空或打 ✕。'] },
      { type: 'test', who: 'li', title: '小李的證詞：那時我在郵局', goal: '找出證詞的矛盾', hit: [0, 'grid'],
        lines: [
          { t: '三點十五分，我在郵局整理今天的信件。', press: [{ w: 'li', t: '「祭典的時候信特別多，大家都在寄明信片。」' }, '……3:15 的郵局裡，職員只看到一位光頭的老先生。'] },
          { t: '今天真的好忙，忙到連一口水都沒喝。', press: [{ w: 'li', e: 'w', t: '「真的啦，你看我滿頭大汗。」' }] },
          { t: '鐘樓那種地方，我平常送完信就走，很少多待。', press: [{ w: 'li', t: '「老吳的信我都放在鐘樓門口的信箱。」' }] },
          { t: '鐘會停，一定是老吳自己忘了上發條啦。', press: [{ w: 'wu', e: 'a', t: '「胡說！我每天早上都上發條，今天也一樣！」' }] },
        ],
        wrong: '「這、這能說明什麼？」',
        win: ['看看行蹤表！3:15 的郵局裡，只有寄包裹的老吳。鎮長、阿美、老吳都有人作證……', '3:15 能在<b>鐘樓</b>的，只剩下<b>你</b>！', { w: 'li', e: 's', t: '「唔……！」' }, { w: 'li', e: 'w', t: '「……好啦，我是去了鐘樓。可是我只是去送信而已！」' }],
        h: ['他說 3:15 他在郵局。', '你剛整理好的行蹤表，3:15 小李在哪裡？', '在第 1 句「三點十五分，我在郵局」出示「3:15 行蹤表」。'] },
      { type: 'test', who: 'li', title: '小李的證詞：我只是去送信', goal: '找出證詞的矛盾', hit: [2, 'button'],
        lines: [
          { t: '我上鐘樓，是要把一封信交給老吳。', press: [{ w: 'li', e: 'w', t: '「我不知道他去郵局了嘛。」' }] },
          { t: '看他不在，我就把信放下，馬上離開了。', press: [{ w: 'li', t: '「前後不到一分鐘。」' }] },
          { t: '齒輪室？我連門都沒進去過，更別說碰齒輪了。', press: [{ w: 'li', e: 'a', t: '「齒輪那麼危險，誰要去碰啊！」' }, '……他的制服，好像少了一顆釦子。'] },
          { t: '鐘停了，跟我一個送信的有什麼關係？', press: [{ w: 'li', e: 'w', t: '「我、我還要去送信……」' }] },
        ],
        wrong: '「我說了我沒碰齒輪！」',
        win: ['卡在齒輪縫裡的這顆<b>金色鈕扣</b>，刻著郵局的信封標誌。', '而你的制服上，正好<b>少了一顆釦子</b>！', { w: 'li', e: 's', t: '「……！」' }, '沒進過齒輪室的人，釦子怎麼會卡在齒輪裡？'],
        h: ['他說他連齒輪室的門都沒進去過。', '齒輪室裡找到的證物，跟郵差有關係。', '在第 3 句「齒輪室？我連門都沒進去過」出示「金色鈕扣」。'] },
      { type: 'accuse', ask: '是誰讓鐘樓停下來的？', who: ['li', 'wu', 'mei', 'mayor'], ans: 'li', evAsk: '決定性的證據是？', ev: 'button', goal: '指認犯人',
        win: [{ w: 'li', e: 'w', t: '「……是我。我用掃把柄卡住了齒輪。」' }, { w: 'li', e: 'w', t: '「我女兒今天要在四點的合唱表演唱獨唱。可是她搭的公車在山路上拋錨了……」' }, { w: 'li', e: 'w', t: '「我想，只要鐘不走，四點就不會到，表演就會等她……很傻吧。」' }, { w: 'mayor', e: 'h', t: '「傻爸爸！表演晚一點開始又怎樣？我們全鎮一起等她！」' }, { w: 'wu', e: 'h', t: '「我這就去把鐘修好。等你女兒到了，我讓鐘聲特別大聲地響！」' }],
        h: ['誰兩次說謊？', '卡在齒輪裡的東西是誰掉的？', '犯人是郵差小李，決定性的證據是「金色鈕扣」。'] },
    ],
    outro: ['半小時後，小李的女兒氣喘吁吁地跑進廣場。', { t: '「噹──噹──噹──噹──」鐘樓敲了四下，合唱開始了。', sfx: 'chime' }, { w: 'li', e: 'h', t: '「謝謝你，小偵探。……還有，害大家擔心了，對不起。」' }, '小鎮的三件怪事，全都解決了！'],
  });
})();
