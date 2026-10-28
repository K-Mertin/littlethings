'use strict';
// 推理事件 7：港口燈塔的怪光（新：四個人只有一個說謊，找出是誰）
(() => {
  Object.assign(PEOPLE, {
    hai: { n: '老海', skin: '#e2b48e', hair: '#d9d4cc', style: 'short', cloth: '#2e4a6a', cloth2: '#f4f0e6', eye: '#3a3a3a', acc: ['cap', 'beard', 'wrinkle'] },
  });
  const scene = s => {
    let o = `<rect width="1000" height="625" fill="url(#skyNight)"/>`;
    for (let i = 0; i < 50; i++) o += `<circle cx="${(i * 157) % 1000}" cy="${(i * 71) % 260}" r="${0.7 + (i % 3) * 0.5}" fill="#fff8d8" opacity="${0.4 + (i % 4) * 0.15}"/>`;
    o += `<circle cx="820" cy="90" r="34" fill="#fff6d0"/><circle cx="820" cy="90" r="80" fill="#fff6d0" opacity=".1"/>`;
    // 海
    o += `<rect y="300" width="1000" height="325" fill="#1e3a5a"/><rect y="300" width="1000" height="24" fill="#2a4a6a"/>`;
    for (let i = 0; i < 18; i++) o += `<path d="M${(i * 113) % 1000} ${330 + (i * 37) % 120}q10-6 20 0t20 0" stroke="#5f8ab0" stroke-width="2" fill="none" opacity=".7"/>`;
    o += `<ellipse cx="820" cy="360" rx="50" ry="6" fill="#fff6d0" opacity=".3"/>`;
    // 遠方的漁船
    o += `<g transform="translate(640 318)"><path d="M-40 0h80l-10 14h-60z" fill="#3a2a22" ${SW2}/><path d="M0 0v-40l26 34z" fill="#c9d4ee" ${SW2}/><circle cx="-24" cy="-6" r="3" fill="#ffe27a"/></g>`;
    // 燈塔（岩石上），光束會轉
    o += `<path d="M30 340q60-50 200-30l20 40H20z" fill="#3a3a44" ${SW}/><g filter="url(#ds)"><path d="M90 320l14-220h52l14 220z" fill="#f4f0e6" ${SW}/><path d="M96 240h68M92 290h76M100 170h60" stroke="#c4502c" stroke-width="16"/><rect x="100" y="70" width="60" height="34" rx="4" fill="#ffe9a0" ${SW}/><path d="M94 70h72l-36-30z" fill="#c4502c" ${SW}/><rect x="114" y="260" width="32" height="60" rx="14" fill="#5a3a24" ${SW2}/></g>`;
    A.fx(`<g class="flick" style="${A.ad(3.3)}"><path d="M130 86L700 20L700 150z" fill="url(#shaftG)" opacity=".35"/><circle cx="130" cy="86" r="60" fill="url(#lampG)"/></g>`);
    // 碼頭（木棧道）
    o += `<path d="M0 470h1000v155H0z" fill="#6a4a32"/>`; for (let x = 0; x < 1000; x += 40) o += `<path d="M${x} 470v155" stroke="#4a3222" stroke-width="2"/>`; o += `<rect y="470" width="1000" height="155" fill="url(#p-grainV)" opacity=".5"/><path d="M0 470h1000" stroke="#3a2a1a" stroke-width="4"/>`;
    for (let x = 30; x < 1000; x += 160) o += `<rect x="${x}" y="440" width="16" height="40" rx="6" fill="#5a3a24" ${SW2}/>`;
    // 守燈人的小屋
    o += `<g filter="url(#ds)"><rect x="250" y="360" width="150" height="110" fill="#8c6a4a" ${SW}/><path d="M236 362l89-56 89 56z" fill="#4a5a6a" ${SW}/><rect x="270" y="388" width="44" height="40" fill="#ffe9a0" ${SW2}/><rect x="340" y="396" width="40" height="74" rx="3" fill="#5a3a24" ${SW2}/></g><circle cx="292" cy="408" r="60" fill="url(#lampG)" opacity=".5"/><path d="M332 410v10" stroke="#2a2a32" stroke-width="2"/><g transform="translate(322 414) scale(.22)">${IC.key('#c9cfd6')}</g>`;
    // 魚老闆的漁網、無線電
    o += `<g transform="translate(560 470)"><path d="M-60 0q20-40 60-34q40-6 60 34z" fill="#8a9a6a" opacity=".85" ${SW2}/>${[0, 1, 2, 3, 4].map(k => `<path d="M${-50 + k * 25} 0l10-30" stroke="#5a6a4a" stroke-width="1.4"/>`).join('')}</g><g filter="url(#ds)"><rect x="880" y="420" width="70" height="50" rx="6" fill="#3a3a44" ${SW}/><circle cx="900" cy="445" r="10" fill="url(#silver)" ${SW2}/><rect x="916" y="432" width="26" height="12" rx="2" fill="#6fd08a"/><path d="M936 420l14-36" stroke="#2a2a32" stroke-width="3"/></g>`;
    // 路燈
    o += `<path d="M450 470V330" stroke="#2a2a32" stroke-width="6"/><path d="M436 330h28l-6-22h-16z" fill="#ffe9a0" ${SW2}/><circle cx="450" cy="320" r="60" fill="url(#lampG)" opacity=".7"/>`;
    // 樓梯上的紙條
    o += `<g transform="translate(176 312) rotate(-12)"><rect width="22" height="16" fill="#fffaf0" ${SW2}/></g>`;
    A.person('hai', 380, 230, 0.6, { full: 1 });
    A.person('yu', 560, 240, 0.58, { full: 1 });
    A.person('lan', 690, 262, 0.52, { full: 1 });
    A.person('jin', 790, 236, 0.58, { full: 1, e: 'h' });
    return o + `<rect width="1000" height="625" fill="url(#vig)"/>`;
  };
  CASES.push({
    id: 'c7', no: 7, name: '港口燈塔的怪光', par: 720, thumb: () => scene({}), ach: 'c7',
    ev: {
      log: { n: '老海的值班日誌', d: '「九點整，燈塔的光<b>一下長、一下短地熄了好幾次</b>。我在小屋打瞌睡，8:50 到 9:10 什麼都沒看到。燈塔的鑰匙掛在小屋門邊的釘子上。」', ic: () => IC.paper('#f4ead8', '#2e4a6a', -5) },
      prints: { n: '樓梯上的鞋印', d: '燈塔螺旋樓梯上留著濕濕的鞋印：<b>小小的，大約 22 公分，平底鞋</b>。', ic: () => `<ellipse cx="42" cy="56" rx="12" ry="26" fill="#5a6a7a" ${SW2}/><ellipse cx="62" cy="40" rx="12" ry="26" fill="#5a6a7a" ${SW2}/>` },
      note: { n: '摩斯紙條', d: '燈塔樓梯上撿到的紙條，寫滿了一排一排的點和長條，旁邊還有對照的字母。紙的角落，畫著<b>一朵小小的蘭花</b>。', ic: () => `<rect x="20" y="18" width="60" height="64" rx="3" fill="#fffaf0" ${SW}/><circle cx="32" cy="34" r="3" fill="#3a2a1e"/><rect x="40" y="31" width="14" height="6" rx="3" fill="#3a2a1e"/><circle cx="62" cy="34" r="3" fill="#3a2a1e"/><rect x="30" y="48" width="14" height="6" rx="3" fill="#3a2a1e"/><circle cx="52" cy="51" r="3" fill="#3a2a1e"/><path d="M62 72q4-10 10-6q-2 8-10 6zM62 72q-6-8 0-12q4 6 0 12z" fill="#b07ac8" ${SW2}/>` },
      radio: { n: '漁船的無線電', d: '魚老闆的無線電收到漁船「海鷗號」的回報：「九點，燈塔的光一閃一閃，<b>好像在對我們說話</b>。」', ic: () => `<rect x="22" y="36" width="56" height="40" rx="6" fill="#3a3a44" ${SW}/><circle cx="38" cy="56" r="8" fill="url(#silver)"/><rect x="52" y="48" width="20" height="10" fill="#6fd08a"/><path d="M68 36l10-22" stroke="#2a2a32" stroke-width="3"/>` },
      key: { n: '門邊的鑰匙', d: '燈塔的鑰匙就掛在小屋門外的釘子上。誰經過，都拿得到。', ic: () => IC.key('#c9cfd6') },
      liar: { n: '說謊的人', d: '四個人只有一個說謊。小蘭和金先生的話互相矛盾，所以說謊的人一定在他們兩個之中；那魚老闆和老海說的都是真的──金先生沒上燈塔，所以<b>說謊的是小蘭</b>。', ic: () => `<circle cx="50" cy="46" r="26" fill="#fbd9bc" ${SW}/><path d="M38 40h6M56 40h6" ${SW2}/><path d="M42 58q8-6 16 0" ${SW2} fill="none"/><path d="M70 22l10-10M74 30l14-4" stroke="#e0504a" stroke-width="4" stroke-linecap="round"/>` },
    },
    intro: [
      { big: 1, t: '事件 7　港口燈塔的怪光' },
      '鐘塔重新響起的那天晚上，海港市的港口出了一件怪事。',
      { w: 'hai', e: 'w', t: '「小偵探，你來得正好！九點整，燈塔的光一閃一閃，熄了好幾次！」' },
      { w: 'hai', t: '「燈塔的光要是亂閃，夜裡的船會看錯方向的。到底是誰溜上去亂玩？」' },
      '碼頭上有四個人：守燈人老海、收網的魚老闆、拿著書包的小蘭，還有來看鐘塔的金先生。',
    ],
    scene: {
      draw: scene,
      hot: [
        { id: 'hai', r: [390, 232, 104, 176], ev: 'log', t: '老海翻開值班日誌：「九點整，光一下長、一下短地熄了好幾次。我在小屋打瞌睡，8:50 到 9:10 什麼都沒看到。」' },
        { id: 'stairs', r: [96, 230, 80, 100], ev: 'prints', t: '燈塔的門沒鎖。螺旋樓梯上有濕濕的鞋印：小小的，大約 22 公分，平底鞋。' },
        { id: 'paper', r: [160, 296, 50, 40], ev: 'note', t: '樓梯口掉著一張紙條，寫滿了點和長條，旁邊還有對照的字母。角落畫著一朵小小的蘭花。' },
        { id: 'radio', r: [870, 380, 90, 92], ev: 'radio', t: '魚老闆的無線電：「九點，燈塔的光一閃一閃，好像在對我們說話──海鷗號回報。」' },
        { id: 'key', r: [310, 396, 46, 46], ev: 'key', t: '燈塔的鑰匙就掛在小屋門外的釘子上。誰都拿得到。' },
        { id: 'yu', r: [570, 242, 100, 176], talk: [{ w: 'yu', e: 'h', t: '「又是你呀，小偵探！上次車站的事真謝謝你。」' }, { w: 'yu', t: '「九點的時候我在碼頭收網。小蘭本來在幫我，八點半就說要回家了。」' }] },
        { id: 'lan', r: [700, 264, 88, 150], talk: [{ w: 'lan', t: '「我……我在等爸爸的船回來。爸爸是海鷗號的船長。」' }, { w: 'lan', e: 't', t: '「燈塔？不、不知道。」' }] },
        { id: 'jin', r: [800, 238, 100, 170], talk: [{ w: 'jin', e: 'h', t: '「我是來看修好的鐘塔的。哎呀，這次又碰到你了。」' }, { w: 'jin', t: '「我的皮鞋是 27 公分的，那麼窄的樓梯，我可擠不上去。」' }] },
        { id: 'lighthouse', r: [90, 40, 90, 190], t: '白紅相間的燈塔。現在光又好好地轉著了。' },
      ],
    },
    stages: [
      { type: 'inv', need: ['log', 'prints', 'note', 'radio', 'key'], goal: '調查現場', h: ['燈塔、小屋、碼頭上的東西和人都看看。要收集 5 件證物。', '燈塔樓梯口的地上有一張小紙條；小屋門邊的釘子上掛著東西。', '五件證物：老海的值班日誌、樓梯上的鞋印、摩斯紙條、漁船的無線電、門邊的鑰匙。'],
        after: ['你把四個人叫到一起，問：「九點的時候，誰上過燈塔？」', '大家各說了一句話。老海小聲說：「我看得出來……這四句話裡，<b>只有一句是假的</b>。」'] },
      { type: 'liar', title: '誰在說謊？', goal: '找出說謊的人', sub: '老海說：這四句話裡<b>只有一句是假的</b>（其他三句都是真的）。點你認為說謊的人。', give: 'liar', okMsg: '就是他！',
        claims: [
          { who: 'yu', t: '九點的時候，我一直在碼頭收網，沒上過燈塔。' },
          { who: 'lan', t: '上燈塔的人是金先生，我看到了。' },
          { who: 'jin', t: '小蘭說的是假話。' },
          { who: 'hai', t: '金先生沒有上燈塔。' },
        ],
        ans: 'lan',
        no: { yu: '如果魚老闆說謊，那其他三句都是真的：可是小蘭說「金先生上了燈塔」，老海說「金先生沒上」──兩句真話打架了！', jin: '如果金先生說謊，小蘭說的就是真的（金先生上了燈塔）；可是老海說金先生沒上──又打架了。', hai: '如果老海說謊，其他三句都是真的：可是金先生說「小蘭說的是假話」，那小蘭也在說謊，就變成兩個人說謊了。' },
        win: ['小蘭說「金先生上了燈塔」，金先生說「小蘭說的是假話」──這兩句一定有一句是假的。', '所以魚老闆和老海說的都是真的：金先生<b>沒有</b>上燈塔。', '說謊的人，是小蘭！', { w: 'lan', e: 's', t: '「……！」' }],
        h: ['只有一個人說謊。先找找看：有沒有兩句話是「不可能同時是真的」？', '小蘭說金先生上了燈塔，金先生說小蘭說謊──這兩句一定是一真一假。所以魚老闆和老海說的是真話。', '老海說金先生沒上燈塔（真話），所以小蘭在說謊。點小蘭。'] },
      { type: 'test', who: 'lan', title: '小蘭的證詞：我什麼都不會', goal: '找出證詞的矛盾', hit: [2, 'note'],
        lines: [
          { t: '我只是在碼頭等爸爸的船回來而已。', press: [{ w: 'yu', t: '「她八點半就說要回家了啊……」' }] },
          { t: '燈塔那麼高、樓梯那麼窄，我才不敢一個人爬上去。', press: [{ w: 'lan', e: 'w', t: '「真的，好可怕的。」' }, '……那窄窄的樓梯上，留著 22 公分的小鞋印。'] },
          { t: '而且那些點點和長條，我一個都看不懂。', press: [{ w: 'lan', e: 'a', t: '「什麼摩斯電碼，我聽都沒聽過！」' }] },
          { t: '燈會一閃一閃，一定是燈泡壞掉了啦。', press: [{ w: 'hai', e: 'a', t: '「我的燈泡，昨天才換新的！」' }] },
        ],
        wrong: '「那個東西跟我有什麼關係？」',
        win: ['看不懂點點和長條？', '燈塔樓梯口掉的這張<b>摩斯紙條</b>，角落畫著一朵小小的<b>蘭花</b>──寫得工工整整的，是誰的呢？', { w: 'lan', e: 's', t: '「那、那是……！」' }],
        h: ['她說她看不懂點和長條。', '有一件證物上寫滿了點和長條，而且畫著跟她名字有關的東西。', '在第 3 句「我一個都看不懂」出示「摩斯紙條」。'] },
      { type: 'accuse', ask: '是誰讓燈塔的光一閃一閃？', who: ['lan', 'yu', 'jin', 'hai'], ans: 'lan', evAsk: '哪件證物證明是她？', ev: 'note', goal: '指認犯人',
        win: [{ w: 'lan', e: 'c', t: '「……是我。對不起。」' }, { w: 'lan', e: 'w', t: '「今天是爸爸的生日。他已經出海三個月了，我好想跟他說生日快樂。」' }, { w: 'lan', e: 'c', t: '「我在圖書館學了摩斯電碼，偷偷拿了鑰匙，爬上燈塔，用外套把燈一遮、一放……」' }, { w: 'hai', t: '「傻孩子。燈塔的光是給所有船看路的，不能亂遮喔。」' }, { w: 'hai', e: 'h', t: '「不過──我的小屋裡有一盞信號燈。走，我們用正式的方法，再跟你爸爸說一次。」' }],
        h: ['誰說了謊、又在證詞裡露出破綻？', '摩斯紙條上畫著什麼花？', '犯人是小蘭，決定性的證據是「摩斯紙條」。'] },
    ],
    outro: ['老海的信號燈一閃一閃：短、長、短……', '過了一會兒，海上的「海鷗號」也閃起了燈。', { w: 'lan', e: 'h', t: '「爸爸說『謝謝，我愛你』！他說了！」' }, { w: 'yu', e: 'h', t: '「哈哈，今晚的港口，好熱鬧啊。」' }, '遠方，修好的鐘塔「噹──」地敲了十下。'],
  });
})();
