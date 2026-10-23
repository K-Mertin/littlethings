'use strict';
// 推理事件 4：車站的金懷錶
(() => {
  const bust = (who, x, y, sc = 1, e = 'n') => `<svg x="${x}" y="${y}" width="${200 * sc}" height="${240 * sc}" viewBox="0 0 200 240">${Face.body(PEOPLE[who], e)}</svg>`;
  // 鞋底：kind = star 星星球鞋、heel 高跟、boot 雨鞋；len = 公分
  // 所有鞋底用同一個比例尺畫（方便比大小）：viewBox 0 0 130 200，最大 27 公分
  const sole = (kind, len, dusty) => {
    const h = len * 5.6, w = h * 0.38, x = 74, cy = 92, y = cy - h / 2;
    let o = dusty ? `<rect width="130" height="200" rx="10" fill="#e8dcc4"/>` + [...Array(14)].map((_, i) => `<circle cx="${(i * 37) % 130}" cy="${(i * 53) % 200}" r="${1 + i % 3}" fill="#c9b89a" opacity=".6"/>`).join('') : '';
    o += `<path d="M${x} ${y}c${w * 0.7} 0 ${w * 0.62} ${h * 0.34} ${w * 0.5} ${h * 0.52}c-${w * 0.06} ${h * 0.14} ${w * 0.12} ${h * 0.44} -${w * 0.5} ${h * 0.48}c-${w * 0.62} -${h * 0.04} -${w * 0.44} -${h * 0.34} -${w * 0.5} -${h * 0.48}c-${w * 0.12} -${h * 0.18} -${w * 0.2} -${h * 0.52} ${w * 0.5} -${h * 0.52}z" fill="${dusty ? '#9a8a7a' : '#5a4a3e'}" opacity="${dusty ? 0.8 : 1}" ${dusty ? '' : SW2}/>`;
    const pc = dusty ? '#efe4d0' : '#d8c8b0';
    if (kind === 'star') { [[0, 0.2], [-0.25, 0.36], [0.22, 0.4], [0, 0.55], [0, 0.82]].forEach(([dx, dy]) => o += A.star(x + dx * w, y + dy * h, w * 0.17, pc)); }
    if (kind === 'heel') { o += `<rect x="${x - w * 0.22}" y="${y + h * 0.78}" width="${w * 0.44}" height="${h * 0.16}" rx="4" fill="${pc}"/>`; for (let i = 0; i < 4; i++) o += `<circle cx="${x}" cy="${y + h * (0.2 + i * 0.1)}" r="${w * 0.08}" fill="${pc}"/>`; }
    if (kind === 'boot') for (let i = 0; i < 9; i++) o += `<path d="M${x - w * 0.36} ${y + h * (0.1 + i * 0.095)}h${w * 0.72}" stroke="${pc}" stroke-width="4"/>`;
    // 尺：每 5 公分一格
    o += `<path d="M18 ${y}v${h}" stroke="#7a5638" stroke-width="2.5"/><path d="M11 ${y}h14M11 ${y + h}h14" stroke="#7a5638" stroke-width="2.5"/>`;
    for (let c = 5; c < len; c += 5) o += `<path d="M14 ${y + h - c * 5.6}h8" stroke="#7a5638" stroke-width="1.5"/>`;
    o += A.txt(65, 194, len + ' 公分', 17, '#7a5638', 'middle', 900);
    return `<svg viewBox="0 0 130 200">${o}</svg>`;
  };
  const scene = s => {
    let o = `<rect width="1000" height="625" fill="#efe2c8"/><rect width="1000" height="625" fill="url(#p-noise)"/><rect width="1000" height="40" fill="#8c5634"/><rect y="40" width="1000" height="10" fill="#6b4a33"/>`;
    o += A.floor('tile', ['#c9b89a', '#b8a888'], 470);
    // 大窗與月台
    o += `<rect x="640" y="90" width="320" height="220" rx="110" fill="url(#sky)" ${SW}/><rect x="640" y="230" width="320" height="80" fill="#9aa6b0"/><path d="M640 250h320" stroke="#e0c27a" stroke-width="6"/><rect x="660" y="190" width="160" height="50" rx="10" fill="#4f9e9a" ${SW2}/><rect x="676" y="200" width="30" height="20" fill="#cfeaf2"/><rect x="716" y="200" width="30" height="20" fill="#cfeaf2"/><rect x="756" y="200" width="30" height="20" fill="#cfeaf2"/><rect x="640" y="90" width="320" height="220" rx="110" fill="url(#glass)"/><path d="M800 90v220M640 200h320" stroke="#8c5634" stroke-width="8"/>`;
    // 時鐘與時刻表
    o += A.wallClock(500, 110, 40, '#3f6a8a') + `<rect x="420" y="170" width="160" height="110" rx="6" fill="#2a3a4a" ${SW}/>` + A.txt(500, 198, '發車時刻', 16, '#f2c46b', 'middle', 900) + A.txt(500, 228, '10:15　山城', 15, '#fff', 'middle', 700) + A.txt(500, 256, '10:45　海港市', 15, '#fff', 'middle', 700);
    // 站長室
    o += `<rect x="40" y="110" width="260" height="360" fill="#d9c8a8" ${SW}/><rect x="40" y="110" width="260" height="360" fill="url(#p-wood)"/><rect x="200" y="250" width="80" height="220" fill="#8c5634" ${SW2}/><circle cx="268" cy="360" r="6" fill="url(#brass)"/>` + A.txt(170, 140, '站長室', 20, '#6b4a33', 'middle', 900) + `<rect x="80" y="160" width="90" height="60" fill="#cfeaf2" ${SW2}/><path d="M80 160l45-24 45 24" fill="none" ${SW2}/><rect x="80" y="160" width="90" height="60" fill="url(#glass)"/>`;
    // 被搬過去的長椅
    o += `<g filter="url(#ds)"><rect x="60" y="300" width="140" height="18" rx="4" fill="#a8703f" ${SW}/><path d="M74 318v40M186 318v40" stroke="#6b4a33" stroke-width="10"/></g><g transform="translate(118 309) rotate(80) scale(.32)" opacity=".7"><svg x="-65" y="-100" width="130" height="200" viewBox="0 0 130 200">${sole('star', 23, 1).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></g><path d="M200 470l-60-110M60 470l10-110" stroke="#9a8a7a" stroke-width="3" stroke-dasharray="6 8" opacity=".6"/>`;
    // 售票口
    o += `<rect x="330" y="300" width="250" height="170" fill="#a8703f" ${SW}/><rect x="350" y="320" width="100" height="70" rx="8" fill="#cfeaf2" ${SW2}/>` + A.txt(400, 412, '售票口', 16, '#fff3dc', 'middle', 900) + `<rect x="470" y="330" width="90" height="50" rx="3" fill="#fffaf0" ${SW2}/><path d="M480 345h70M480 358h56M480 370h62" stroke="#9aa" stroke-width="2"/>`;
    // 人物
    const H = null;
    A.person('chen', 196, 300, 0.55, { full: 1, hop: H === 'chen' });
    A.person('ning', 476, 343, 0.45, { full: 1, e: 'h', hop: H === 'ning' });
    A.person('gao', 576, 300, 0.55, { full: 1, hop: H === 'gao', front: `<g filter="url(#ds)"><rect x="640" y="420" width="70" height="56" rx="10" fill="#2a3a5a" ${SW}/><rect x="650" y="430" width="50" height="22" rx="4" fill="#c4502c" ${SW2}/><path d="M660 420q15-16 30 0" fill="none" stroke="#2a3a5a" stroke-width="6"/>${s.bagSeen ? '' : `<rect x="668" y="404" width="16" height="22" rx="3" fill="#b8a07a" ${SW2}/>`}</g>` });
    A.person('bai', 748, 300, 0.55, { full: 1, hop: H === 'bai', front: `<g filter="url(#ds)"><rect x="740" y="420" width="130" height="60" rx="6" fill="#5a6aa8" ${SW}/><path d="M780 420v-12h50v12" fill="none" ${SW2}/><path d="M748 440h114" stroke="#fff" stroke-opacity=".25" stroke-width="4"/><circle cx="756" cy="482" r="5" fill="#2a2a32"/><circle cx="854" cy="482" r="5" fill="#2a2a32"/></g>` });
    A.person('yu', 862, 296, 0.56, { full: 1, hop: H === 'yu', front: `<g filter="url(#ds)"><rect x="880" y="430" width="100" height="50" rx="6" fill="#e8f4f8" ${SW}/>${A.txt(930, 462, '冰', 22, '#4f8ad8', 'middle', 900)}<path d="M888 438h84" stroke="#fff" stroke-width="4"/></g>` });
    return o + A.light();
  };
  CASES.push({
    id: 'c4', no: 4, name: '車站的金懷錶', par: 720, thumb: () => scene({}),
    ev: {
      box: { n: '錶盒和小螺絲', d: '站長桌上的空錶盒。絨布上掉著<b>一顆小小的螺絲</b>──只有打開懷錶的背蓋時才會掉出來。', ic: () => `<rect x="18" y="34" width="64" height="40" rx="6" fill="#7a2a3a" ${SW}/><ellipse cx="50" cy="54" rx="22" ry="12" fill="#a83a4a"/><circle cx="58" cy="54" r="3" fill="#c9cfd6" ${SW2}/>` },
      bench: { n: '被搬動的長椅', d: '長椅被搬到站長室的<b>小窗正下方</b>。椅面上留著一個灰灰的鞋印：<b>星星花紋、23 公分</b>。站上去剛好搆得到小窗。', ic: () => `<rect x="12" y="44" width="76" height="12" rx="3" fill="#a8703f" ${SW}/><path d="M20 56v26M80 56v26" stroke="#6b4a33" stroke-width="6"/>${A.star(50, 40, 8, '#9a8a7a')}` },
      record: { n: '售票紀錄', d: '售票員的紀錄：「<b>10:22</b> 售出學生票一張，到海港市，10:45 發車。」今天早上只賣出這一張學生票。', ic: () => IC.paper('#fffaf0', '#4f8ad8', -4) },
      talk: { n: '站長的話', d: '「懷錶最近<b>每天慢五分鐘</b>，害我差點誤點。10:20 我去月台幫魚老闆搬冰塊，10:35 回來，錶就不見了。」', ic: () => `<circle cx="50" cy="50" r="30" fill="url(#brass)" ${SW}/><circle cx="50" cy="50" r="22" fill="#fffaf0" ${SW2}/><path d="M50 50V36M50 50l8 6" ${SW2}/><rect x="44" y="12" width="12" height="10" rx="3" fill="url(#brass)" ${SW2}/>` },
      bag: { n: '高同學的工具袋', d: '從背包露出來的帆布工具袋，繡著「老吳鐘錶行・學徒」。裡面有一組<b>修錶用的迷你螺絲起子</b>，最小的那把剛好能轉錶盒裡那種螺絲。', ic: () => `<rect x="18" y="30" width="64" height="48" rx="8" fill="#b8a07a" ${SW}/><path d="M30 30v-10M44 30v-14M58 30v-8M70 30v-12" stroke="#4a3222" stroke-width="4" stroke-linecap="round"/>${A.txt(50, 62, '學徒', 14, '#4a3222', 'middle', 900)}` },
      shoe: { n: '鞋印比對結果', d: '長椅上的鞋印（星星花紋、23 公分），和<b>高同學的球鞋</b>一模一樣。', ic: () => `<svg x="18" y="2" width="64" height="96" viewBox="0 0 130 200">${sole('star', 23).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>` },
    },
    intro: [
      { big: 1, t: '事件 4　車站的金懷錶' },
      '星期天早上，小鎮車站。10:45 往海港市的火車就快進站了。',
      { w: 'chen', e: 'w', t: '「小偵探，糟糕了！我的金懷錶不見了！那是我當上站長那天，老站長送給我的……」' },
      { w: 'chen', t: '「10:20 我鎖上站長室的門，去月台幫魚老闆搬冰塊。10:35 回來，桌上的錶盒就空了。」' },
      { w: 'chen', e: 'w', t: '「門一直是鎖著的。只有那扇小窗開著……可是那麼高，大人也很難爬進去啊。」' },
      '候車室裡有四個人：帶著大皮箱的白小姐、送冰塊的魚老闆、背著背包的高同學，還有抱著兔子玩偶的寧寧。先調查看看吧！',
    ],
    scene: {
      draw: scene,
      hot: [
        { id: 'office', r: [40, 110, 260, 180], ev: 'box', t: '站長帶你進站長室。桌上的空錶盒裡，絨布上掉著一顆小小的螺絲──只有打開懷錶的背蓋才會掉出來。' },
        { id: 'bench', r: [55, 290, 150, 80], ev: 'bench', t: '長椅被搬到了小窗正下方，椅面上有一個灰灰的鞋印：星星花紋、23 公分。站上去，剛好搆得到小窗。' },
        { id: 'ticket', r: [330, 300, 250, 170], ev: 'record', t: '售票員翻開紀錄：「10:22 賣出一張到海港市的學生票。今天早上只賣出這一張學生票喔。」' },
        { id: 'chen', r: [206, 302, 100, 170], ev: 'talk', t: '站長說：「懷錶最近每天慢五分鐘，害我差點誤點。10:20 我去月台幫魚老闆搬冰塊，10:35 回來，錶就不見了。」' },
        { id: 'bag', r: [636, 410, 80, 70], ev: 'bag', t: '高同學的背包口袋露出一個帆布工具袋，繡著「老吳鐘錶行・學徒」。裡面是一組修錶用的迷你螺絲起子。' },
        { id: 'gao', r: [588, 302, 96, 120], talk: [{ w: 'gao', t: '「我要搭 10:45 的火車去海港市，參加少年鐘錶比賽。」' }, { w: 'gao', e: 'w', t: '「懷錶？我、我不知道啦。」' }] },
        { id: 'bai', r: [760, 302, 96, 118], talk: [{ w: 'bai', t: '「我在看書等車，沒注意到什麼。只記得長椅一直被誰拖來拖去，好吵。」' }] },
        { id: 'yu', r: [872, 298, 96, 130], talk: [{ w: 'yu', e: 'h', t: '「站長一直在月台幫我搬冰塊，十點二十到三十五，一步都沒離開！」' }, { w: 'yu', t: '「我穿的是雨鞋，可沒有什麼星星。」' }] },
        { id: 'ning', r: [478, 345, 84, 128], talk: [{ w: 'ning', e: 'h', t: '「我的鞋子也有星星喔！可是我才 18 公分。」' }, { w: 'ning', t: '「剛剛有一個大哥哥站在椅子上，好像在偷看什麼。」' }] },
        { id: 'clock', c: [500, 110, 46], t: '候車室的大鐘：10:40。再五分鐘火車就要來了。' },
        { id: 'board', r: [420, 170, 160, 110], t: '發車時刻表：10:15 往山城、10:45 往海港市。' },
      ],
    },
    stages: [
      { type: 'inv', need: ['box', 'bench', 'record', 'talk', 'bag'], goal: '調查現場', h: ['站長室、長椅、售票口、站長本人、還有大家的行李都看看。要收集 5 件證物。', '高同學的背包口袋好像露出了什麼。', '五件證物：錶盒和小螺絲、被搬動的長椅、售票紀錄、站長的話、高同學的工具袋。'],
        after: ['長椅上那個星星鞋印，是誰的呢？先比對一下大家的鞋子吧。'] },
      { type: 'pick', title: '比對鞋印', sub: '長椅上的鞋印：<b>星星花紋、23 公分</b>。大家把鞋子翻過來給你看，哪一雙最像？', goal: '比對鞋印', ref: sole('star', 23, 1), refLbl: '長椅上的鞋印', ans: 'gao', give: 'shoe',
        opts: [{ id: 'ning', n: '寧寧', html: sole('star', 18) }, { id: 'gao', n: '高同學', html: sole('star', 23) }, { id: 'bai', n: '白小姐', html: sole('heel', 23) }, { id: 'yu', n: '魚老闆', html: sole('boot', 27) }],
        wrongMsg: '花紋或大小對不上，再仔細比比看。', okMsg: '一模一樣！',
        win: [{ w: 'gao', e: 's', t: '「欸？我、我只是站上去而已！」' }, { w: 'gao', e: 'w', t: '「聽我說！我真的什麼都沒做！」' }],
        h: ['鞋印有兩個特徵：花紋和長度。', '寧寧的也是星星，可是太小了；白小姐和魚老闆的花紋不一樣。', '選高同學的球鞋（星星花紋、23 公分）。'] },
      { type: 'test', who: 'gao', title: '高同學的證詞：我十點半才到', goal: '找出證詞的矛盾', hit: [1, 'record'],
        lines: [
          { t: '我要搭 10:45 的火車去海港市，參加少年鐘錶比賽。', press: [{ w: 'gao', e: 'h', t: '「我是老吳鐘錶行的學徒喔，老師說我很有天分！」' }] },
          { t: '我是十點半才走進車站的，一進來就坐著等車。', press: [{ w: 'gao', t: '「十點半整，我記得很清楚。」' }, '……他是什麼時候買票的呢？'] },
          { t: '站長室的小窗那麼高，我又不是猴子。', press: [{ w: 'gao', e: 'w', t: '「站、站在椅子上？誰會做那種事……」' }] },
          { t: '穿星星球鞋的人那麼多，又不是只有我。', press: [{ w: 'ning', e: 'h', t: '「我的也是星星！」' }, '可是寧寧的鞋只有 18 公分。'] },
        ],
        wrong: '「這跟我幾點到有什麼關係？」',
        win: ['售票紀錄寫著：<b>10:22</b> 賣出今天早上唯一一張到海港市的學生票。', '十點半才進車站的人，怎麼可能在 10:22 買票？', { w: 'gao', e: 's', t: '「唔……！」' }, { w: 'gao', e: 'w', t: '「好、好吧，我是十點二十分就到了。」' }],
        h: ['他說他十點半才走進車站。', '有一件證物記錄了他買票的時間。', '在第 2 句「十點半才走進車站」出示「售票紀錄」。'] },
      { type: 'test', who: 'gao', title: '高同學的證詞：我沒碰懷錶', goal: '找出證詞的矛盾', hit: [2, 'bag'],
        lines: [
          { t: '我是有站到椅子上啦，可是我只是想看清楚火車時刻表。', press: [{ w: 'gao', t: '「站高一點比較看得清楚嘛。」' }, '……時刻表明明掛在售票口上面，不在站長室那邊。'] },
          { t: '站長的懷錶？我從窗戶看了一眼而已。', press: [{ w: 'gao', e: 'w', t: '「那支錶好漂亮……我只是看看。」' }] },
          { t: '而且我根本不會拆懷錶，身上也沒有工具。', press: [{ w: 'gao', e: 'a', t: '「真的！什麼工具都沒有！」' }] },
          { t: '你們去問白小姐嘛，她一直坐在那邊。', press: [{ w: 'bai', t: '「我只聽到長椅被拖來拖去的聲音，沒抬頭看。」' }] },
        ],
        wrong: '「那又怎麼樣？」',
        win: ['不會拆懷錶？身上沒有工具？', '你的背包裡，明明有一組「<b>老吳鐘錶行</b>」的<b>修錶螺絲起子</b>！最小的那把，剛好轉得開錶盒裡掉出來的那種螺絲！', { w: 'gao', e: 's', t: '「…………！」' }],
        h: ['他說他不會拆懷錶，也沒帶工具。', '他背包裡露出來的東西是什麼？', '在第 3 句「身上也沒有工具」出示「高同學的工具袋」。'] },
      { type: 'accuse', ask: '是誰拿走了站長的金懷錶？', who: ['gao', 'bai', 'yu', 'ning'], ans: 'gao', evAsk: '哪件證物證明他動過懷錶？', ev: 'bag', goal: '指認犯人',
        win: [{ w: 'gao', e: 'c', t: '「對不起……懷錶在我的背包裡。」' }, { w: 'gao', e: 'w', t: '「我聽站長說，他的錶每天慢五分鐘，害他差點被罵。我想偷偷幫他修好，再放回去……」' }, { w: 'gao', e: 'c', t: '「可是一顆螺絲掉進錶盒裡，窗戶又搆不到了。我好怕被當成小偷，就……說謊了。」' }, { w: 'chen', e: 's', t: '「你、你把它修好了？」' }, '站長打開懷錶，秒針滴答滴答，走得又穩又準。', { w: 'chen', e: 'h', t: '「哈哈！比我帶去修錶店還準！下次直接跟我說就好啦，小師傅。」' }],
        h: ['誰的話裡有兩次矛盾？', '修錶工具是誰的？', '犯人是高同學，決定性的證據是「高同學的工具袋」。'] },
    ],
    outro: ['10:45，往海港市的火車準時進站。', { w: 'chen', e: 'h', t: '「祝你比賽順利！帶著我的懷錶去，給評審看看你的手藝！」' }, { w: 'gao', e: 'h', t: '「謝謝站長！還有……謝謝你，小偵探。」' }, { w: 'ning', e: 'h', t: '「火車來了！嘟嘟──！」' }, '……對了，鐘爺爺口袋裡那張沒剪過的 10:45 車票，說不定也是這班車呢。'],
  });
})();
