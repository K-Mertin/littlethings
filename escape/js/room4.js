'use strict';
// 第 4 章：廚房
(() => {
  const WALL = { c: '#fbe3b0', pat: 'dots', wain: '#f4f0e6', wy: 300, trim: '#fff8ea', floor: 'check', fc: ['#f4f0e6', '#6f9fb8'] };
  const CANON = { a: 3, p: 5, c: 4, t: 180, m: 25 };
  const V = s => (s && s.v) || CANON;
  const T1 = s => [['apple', 'apple', 'apple'], ['w' + V(s).a * 3]], T2 = s => [['pear'], ['apple', 'w' + (V(s).p - V(s).a)]], T3 = s => [['pear', 'cherry'], ['apple', 'apple', 'apple']];
  const steam = (x, y) => [0, 1, 2].map(i => A.fx(`<g class="steam" style="animation-duration:3.6s;animation-delay:-${(i * 1.2 + (performance.now() / 1000) % 3.6).toFixed(2)}s"><circle cx="${x + i * 6 - 6}" cy="${y}" r="${10 - i * 2}" fill="#fff" opacity=".7"/></g>`)).join('');
  const fruit = (k, x, y, s = 1) => {
    const g = b => `<g transform="translate(${x} ${y}) scale(${s})">${b}</g>`;
    if (k === 'apple') return g(`<path d="M0-14C-10-22-24-14-22 2C-20 18-8 22 0 18C8 22 20 18 22 2C24-14 10-22 0-14z" fill="#e0504a" ${SW2}/><path d="M0-14q2-8 6-12" ${SW2} fill="none"/><path d="M2-18q8-8 14-4q-6 6-14 4z" fill="#6fae5a" ${SW2}/><ellipse cx="-9" cy="-5" rx="4" ry="6" fill="#fff" opacity=".45"/>`);
    if (k === 'pear') return g(`<path d="M0-24C-8-24-8-12-10-6C-20 2-18 22 0 22S20 2 10-6C8-12 8-24 0-24z" fill="#b8d65a" ${SW2}/><path d="M0-24v-8" ${SW2}/><path d="M1-30q8-6 12-2q-6 6-12 2z" fill="#6fae5a" ${SW2}/>`);
    if (k === 'cherry') return g(`<path d="M0 2Q0-14 8-22" fill="none" stroke="#4f8a4a" stroke-width="3.5"/><path d="M8-22q10-4 12 4q-8 2-12-4z" fill="#6fae5a" ${SW2}/><circle cx="0" cy="8" r="13" fill="#c8323a" ${SW2}/><circle cx="-4" cy="4" r="4" fill="#fff" opacity=".5"/>`);
    if (k === 'w') return '';
  };
  const weight = (n, x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-16 14h32l-6-26h-20z" fill="#7a8a9a" ${SW2}/><circle cx="0" cy="-16" r="6" fill="none" ${SW2}/>${A.txt(0, 9, n, 16, '#fff', 'middle', 900)}</g>`;
  // 天平磁磚：L、R 是左右盤上的東西
  const tile = (x, y, L, R, sz = 180) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sz / 180})"><rect x="0" y="0" width="180" height="180" rx="10" fill="#fffaf0" ${SW}/><rect x="8" y="8" width="164" height="164" rx="6" fill="none" stroke="#6f9fb8" stroke-width="3"/><g transform="translate(16 18) scale(.82)">`;
    o += `<path d="M90 150V60M60 158h60" stroke="#8c5634" stroke-width="7" stroke-linecap="round"/><path d="M24 60h132" stroke="#8c5634" stroke-width="6" stroke-linecap="round"/><path d="M90 52l-8 14h16z" fill="#8c5634"/>`;
    o += `<path d="M24 60l-20 48M24 60l20 48M156 60l-20 48M156 60l20 48" stroke="#8c5634" stroke-width="2"/><path d="M-8 108h64q-6 16-32 16t-32-16zM124 108h64q-6 16-32 16t-32-16z" fill="#d9a548" ${SW2}/>`;
    const put = (arr, cx) => { const n = arr.length; arr.forEach((k, i) => { const px = cx + (i - (n - 1) / 2) * (n > 2 ? 21 : 26), py = 94; o += k[0] === 'w' ? weight(k.slice(1), px, py + 2, 0.75) : fruit(k, px, py, n > 2 ? 0.55 : 0.72); }); };
    put(L, 24); put(R, 156);
    return o + `</g></g>`;
  };

  Object.assign(ITEMS, {
    egg: { n: '雞蛋', d: '兩顆新鮮的雞蛋。', ic: () => `<ellipse cx="38" cy="56" rx="18" ry="24" fill="#fff6e6" ${SW}/><ellipse cx="64" cy="58" rx="17" ry="22" fill="#f6e2c4" ${SW}/><ellipse cx="32" cy="46" rx="5" ry="8" fill="#fff"/>` },
    milk: { n: '牛奶', d: '一瓶冰涼的鮮奶。', ic: () => `<path d="M38 14h24v14l8 12v44q0 4-4 4H34q-4 0-4-4V40l8-12z" fill="#fff" ${SW}/><rect x="36" y="10" width="28" height="8" rx="3" fill="#6f9fb8" ${SW2}/><rect x="34" y="50" width="32" height="20" rx="3" fill="#6f9fb8"/>${A.txt(50, 65, 'MILK', 10, '#fff', 'middle', 900)}` },
    stool: { n: '小板凳', d: '木頭小板凳，站上去就能搆到高的地方。', ic: () => `<rect x="18" y="30" width="64" height="14" rx="5" fill="#c9895a" ${SW}/><path d="M28 44l-6 40M72 44l6 40M38 44l-2 40M62 44l2 40" stroke="#4a3222" stroke-width="7" stroke-linecap="round"/><path d="M28 44l-6 40M72 44l6 40" stroke="#a8703f" stroke-width="4" stroke-linecap="round"/><path d="M26 66h48" ${SW2}/>` },
    flour: { n: '麵粉', d: '一袋麵粉，袋子上印著麥穗。', ic: () => `<path d="M26 26q24-10 48 0l6 56q-30 8-60 0z" fill="#f4ead8" ${SW}/><path d="M28 26q-4-10 6-14q16 6 32 0q10 4 6 14" fill="#e9dcc0" ${SW2}/><path d="M50 72V42M50 50l-8-6M50 50l8-6M50 60l-8-6M50 60l8-6" stroke="#d9a548" stroke-width="3" stroke-linecap="round"/>` },
    batter: { n: '麵糊烤模', d: '倒進圓烤模的蛋糕麵糊，接下來要送進烤箱。', ic: () => `<ellipse cx="50" cy="60" rx="38" ry="14" fill="#b9bfc6" ${SW}/><path d="M12 60v-14h76v14" fill="#cfd5dc" ${SW}/><ellipse cx="50" cy="46" rx="38" ry="12" fill="#f6dfa0" ${SW}/>` },
    cake: { n: '海綿蛋糕', d: '香噴噴、軟綿綿的海綿蛋糕，剛出爐還熱熱的。', ic: () => `<ellipse cx="50" cy="72" rx="40" ry="12" fill="#fff" ${SW}/><path d="M16 66V44q34-16 68 0v22q-34 14-68 0z" fill="#e9b45a" ${SW}/><ellipse cx="50" cy="44" rx="34" ry="11" fill="#f6d08a" ${SW}/><path d="M24 40q6-8 12 0M52 36q6-8 12 0" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>` },
    backKey: { n: '後門鑰匙', d: '掛著草莓吊飾的鑰匙。', ic: () => IC.key('#d9dee4') + `<path d="M76 70c-8-6-10-16 0-18c10 2 8 12 0 18z" fill="#e0504a" ${SW2}/>` },
  });
  Object.assign(MEMO, {
    m4: { t: '第四章 · 蛋糕訂單', d: '冰箱上貼著暖暖烘焙的單子：「草莓生日蛋糕一個，訂購人：<b>鐘一鳴</b>，<b>今天下午</b>取貨。」爺爺今天還在鎮上？' },
    m5: { t: '第四章 · 便利貼', d: '冰箱上的便利貼：「<b>王阿姨</b>：備用鑰匙先放妳那邊，記得還我喔～ 一鳴」。王阿姨也能進這棟房子。' },
  });

  const fridge = (x, y, s) => `<g transform="translate(${x} ${y})" filter="url(#ds)"><rect x="0" y="0" width="200" height="330" rx="22" fill="#9fd0d8" ${SW}/><path d="M0 120h200" ${SW}/><rect x="168" y="30" width="12" height="70" rx="6" fill="#f4f0e6" ${SW2}/><rect x="168" y="140" width="12" height="100" rx="6" fill="#f4f0e6" ${SW2}/>
    <rect x="120" y="150" width="44" height="80" rx="8" fill="#f4ead8" ${SW2}/>${['pear', 'apple', 'cherry'].map((k, i) => fruit(k, 132, 166 + i * 24, 0.42) + `<rect x="144" y="${158 + i * 24}" width="14" height="16" rx="2" fill="${s.fridgeOpen ? '#a8e0b0' : '#3b2a1f'}"/>`).join('')}
    <g transform="rotate(-4 50 40)"><rect x="24" y="22" width="80" height="70" rx="3" fill="#fff" ${SW2}/>${A.pin(64, 26)}<path d="M34 46h56M34 58h48M34 70h52" stroke="#e98a8a" stroke-width="3"/></g><rect x="30" y="160" width="64" height="54" rx="2" fill="#fff6a8" ${SW2} transform="rotate(5 60 186)"/><path d="M40 178h40M40 192h32" stroke="#c9a14a" stroke-width="3"/>${A.sparkle(110, 26, 0.6)}</g>`;
  const oven = (x, y, s) => `<g transform="translate(${x} ${y})" filter="url(#ds)"><rect x="0" y="0" width="300" height="250" rx="12" fill="#e9604a" ${SW}/><rect x="0" y="0" width="300" height="56" rx="12" fill="#f4f0e6" ${SW}/><circle cx="70" cy="28" r="18" fill="#fff" ${SW2}/><path d="M70 28l0-12" ${SW2}/><circle cx="230" cy="28" r="18" fill="#fff" ${SW2}/><path d="M230 28l9-9" ${SW2}/>${A.txt(150, 36, s.baked ? '完成' : (s.batterIn ? '待機' : ''), 16, '#4a3222')}
    <rect x="30" y="76" width="240" height="150" rx="10" fill="${s.batterIn && !s.baked ? '#ffb46a' : '#3b2a1f'}" ${SW}/><rect x="40" y="86" width="220" height="16" rx="4" fill="#fff" opacity=".18"/>${s.batterIn && !s.baked ? `<g transform="translate(100 120) scale(1)">${ITEMS.batter.ic()}</g>` : ''}<rect x="60" y="64" width="180" height="10" rx="5" fill="#c9cfd6" ${SW2}/></g>`;

  ROOMS.push({
    id: 'r4', no: 4, name: '廚房', en: 'THE KITCHEN', mood: 'warm', par: 600, walls: ['n', 'e', 's', 'w'],
    init: () => ({}),
    canon: CANON,
    vary: r => {
      for (;;) { const a = rInt(r, 2, 4), p = rInt(r, a + 1, 9), c = 3 * a - p; if (c >= 1 && c <= 9 && new Set([a, p, c]).size === 3 && !(a === 3 && p === 5)) return { a, p, c, t: [150, 160, 170, 190, 200, 210][rInt(r, 0, 5)], m: [15, 20, 30, 35, 40][rInt(r, 0, 4)] }; }
    },
    note: { v: 'n', x: 180, y: 132, s: 0.85 },
    amb: (v, s) => (v === 'n' ? steam(405, 220) : '') + (v === 'e' && s.batterIn && !s.cakeOn ? steam(500, 220) : ''),
    intro: [
      '爺爺的廚房黃澄澄的，牆上貼著可愛的磁磚，到處都是鍋碗瓢盆。',
      { w: 'mochi', t: '喵、喵！', sfx: 'meow' },
      '麻糬一進門就跳上餐桌，盯著一個空空的盤子猛看。盤子上寫著：「把生日蛋糕放在這裡」。',
    ],
    outro: [
      { t: '草莓鑰匙轉開了後門，一陣悠揚的琴聲從走廊另一頭傳過來。', sfx: 'door' },
      { w: 'mochi', t: '喵～（舔舔嘴）', sfx: 'meow' },
      '麻糬偷吃了一小口蛋糕，心滿意足地跟上來。',
    ],
    views: {
      n: {
        draw: s => A.wall(WALL) + `<rect y="190" width="1000" height="110" fill="#6f9fb8" opacity=".5"/><rect y="190" width="1000" height="110" fill="url(#p-tile)"/>` + fridge(80, 150, s) +
          `<g filter="url(#ds)"><rect x="340" y="320" width="600" height="160" rx="6" fill="#f4f0e6" ${SW}/><rect x="330" y="300" width="620" height="24" rx="5" fill="#c9895a" ${SW}/>${[0, 1, 2, 3].map(i => `<rect x="${356 + i * 145}" y="340" width="130" height="124" rx="5" fill="#fffaf0" ${SW2}/><rect x="${405 + i * 145}" y="356" width="32" height="8" rx="4" fill="#c9895a"/>`).join('')}</g>` +
          `<g><ellipse cx="560" cy="296" rx="90" ry="18" fill="#cfd5dc" ${SW}/><path d="M470 296q0 60 90 60t90-60" fill="#e9eef2" ${SW}/><ellipse cx="560" cy="294" rx="80" ry="14" fill="${s.batterMade ? '#cfd5dc' : (s.bEgg || s.bMilk || s.bFlour ? '#f6dfa0' : '#b9c4cc')}"/>${s.bEgg && !s.batterMade ? '<ellipse cx="540" cy="292" rx="10" ry="6" fill="#ffd84a"/>' : ''}<path d="M630 270l40-60" stroke="#c9895a" stroke-width="8" stroke-linecap="round"/></g>` +
          A.win(720, 100, 160, 120, { curtain: '#e98a8a' }) + `<path d="M380 290v-60h50v60" fill="#e9604a" ${SW2}/><path d="M770 296q0-20 20-20h40q20 0 20 20z" fill="#f2c232" ${SW2}/>` + A.light(),
        hot: s => [
          { id: 'fridgeDoor', r: [80, 150, 110, 330], on: C => { if (s.fridgeOpen) C.go('fridge'); else G.toast('冰箱門被一個水果鎖鎖住了。'); } },
          { id: 'fridgeLock', r: [190, 290, 70, 100], on: C => { if (s.fridgeOpen) { C.go('fridge'); return; } W.wheels(C, { id: 'fridge', title: '冰箱的水果鎖', sub: '每個轉輪旁邊都畫著一種水果。', wheels: [['pear', '西洋梨'], ['apple', '蘋果'], ['cherry', '櫻桃']].map(([k, n]) => ({ label: `<svg viewBox="-30 -36 60 66">${fruit(k, 0, 0, 1.1)}</svg>`, vals: '0123456789'.split('') })), check: (i, v) => v.join('') === `${V(s).p}${V(s).a}${V(s).c}`, ok: () => { s.fridgeOpen = 1; G.toast('冰箱打開了！冷氣好舒服。'); } }); } },
          { id: 'notes', r: [100, 160, 130, 100], on: () => { G.read('冰箱上的單子和便利貼', '<b>暖暖烘焙　訂購單</b>\n草莓生日蛋糕　一個\n訂購人：鐘一鳴\n取貨時間：今天下午\n\n──────\n<span style="color:#b07a1a">（黃色便利貼）\n王阿姨：備用鑰匙先放妳那邊，記得還我喔～ 一鳴</span>'); G.memoAdd('m4'); G.memoAdd('m5', true); } },
          { id: 'bowl', r: [460, 250, 200, 110], on: C => { if (s.batterMade) { G.toast('攪拌碗已經洗乾淨了。'); return; } const need = [!s.bEgg && '雞蛋', !s.bMilk && '牛奶', !s.bFlour && '麵粉'].filter(Boolean); G.toast('一個大攪拌碗。旁邊的小卡片寫著：「雞蛋＋牛奶＋麵粉，攪一攪就是蛋糕麵糊」。' + (need.length < 3 ? `<br>還缺：${need.join('、')}` : '')); },
            use: Object.fromEntries([['egg', 'bEgg'], ['milk', 'bMilk'], ['flour', 'bFlour']].map(([it, k]) => [it, C => { C.take(it); s[k] = 1; Snd.play('water'); if (s.bEgg && s.bMilk && s.bFlour) { s.batterMade = 1; C.give('batter', true); Snd.play('combine'); G.toast('攪呀攪……麵糊完成了！倒進烤模，得到「<b>麵糊烤模</b>」。'); } else G.toast(`把${ITEMS[it].n}倒進碗裡。`); }])) },
          { id: 'win', r: [710, 90, 180, 150], t: '窗外的鳥兒在唱歌。' },
        ],
      },
      fridge: {
        back: 'n', title: '冰箱',
        draw: s => A.closeBg('#fbe3b0', 'dots') + `<g filter="url(#ds)"><rect x="250" y="40" width="500" height="560" rx="30" fill="#9fd0d8" ${SW}/><rect x="280" y="70" width="440" height="500" rx="16" fill="#eaf7f8" ${SW}/></g>` +
          [200, 340, 470].map(y => `<rect x="290" y="${y}" width="420" height="10" rx="4" fill="#cfe6ea" ${SW2}/>`).join('') +
          (s.eggTaken ? '' : `<g transform="translate(310 110) scale(1.4)">${ITEMS.egg.ic()}</g>`) + (s.milkTaken ? '' : `<g transform="translate(540 90) scale(1.1)">${ITEMS.milk.ic()}</g>`) +
          `<g transform="translate(320 260)">${fruit('apple', 30, 30, 1.4)}${fruit('pear', 100, 30, 1.4)}${fruit('cherry', 170, 34, 1.4)}</g><rect x="560" y="270" width="110" height="64" rx="10" fill="#f6e0a0" ${SW}/>${A.txt(615, 310, '果醬', 18)}<path d="M320 450q60-30 120 0v14H320z" fill="#6fae5a" ${SW2}/><rect x="520" y="400" width="140" height="64" rx="8" fill="#fff" ${SW}/>${A.txt(590, 440, '奶油', 18)}` + A.light(),
        hot: s => [
          { id: 'egg', r: [300, 90, 160, 110], on: C => { if (!s.eggTaken) { s.eggTaken = 1; C.give('egg'); } } },
          { id: 'milk', r: [530, 80, 140, 120], on: C => { if (!s.milkTaken) { s.milkTaken = 1; C.give('milk'); } } },
          { id: 'other', r: [300, 230, 400, 240], t: '水果、果醬、奶油……都是做點心的材料。' },
        ],
      },
      e: {
        draw: s => A.wall(WALL) + `<rect y="190" width="1000" height="110" fill="#6f9fb8" opacity=".5"/><rect y="190" width="1000" height="110" fill="url(#p-tile)"/>` + oven(350, 230, s) +
          `<g transform="rotate(3 210 200)"><rect x="140" y="120" width="150" height="170" rx="4" fill="#fffdf3" ${SW}/>${A.pin(215, 128)}${A.txt(215, 160, '海綿蛋糕', 20, '#c4502c', 'middle', 900)}${A.txt(215, 192, '雞蛋＋牛奶＋麵粉', 14, '#4a3222', 'middle', 500)}${A.txt(215, 228, `烤箱 ${V(s).t} 度`, 20, '#4a3222', 'middle', 900)}${A.txt(215, 258, `烤 ${V(s).m} 分鐘`, 20, '#4a3222', 'middle', 900)}</g>` +
          `<path d="M700 110h220" stroke="#8c5634" stroke-width="8" stroke-linecap="round"/>${[730, 800, 870].map((x, i) => `<path d="M${x} 110v20" ${SW2}/><circle cx="${x}" cy="${170 + i * 6}" r="${34 - i * 4}" fill="${['#e9604a', '#6f9fb8', '#f2c232'][i]}" ${SW}/><path d="M${x} ${136 + i * 6}v-6" stroke="#4a3222" stroke-width="6"/>`).join('')}` +
          `<g filter="url(#ds)"><rect x="680" y="320" width="260" height="160" rx="6" fill="#f4f0e6" ${SW}/><rect x="670" y="300" width="280" height="24" rx="5" fill="#c9895a" ${SW}/></g>` + A.plant(780, 300, 0.6, '#6f9fb8') + A.light(),
        hot: s => [
          { id: 'recipe', r: [130, 110, 170, 190], on: () => G.read('食譜卡', `<b style="color:#c4502c;font-size:20px">海綿蛋糕</b>\n\n材料：雞蛋＋牛奶＋麵粉，攪拌成麵糊。\n倒進烤模，送進烤箱：\n\n<b style="font-size:20px">溫度 ${V(s).t} 度，烤 ${V(s).m} 分鐘。</b>`) },
          { id: 'oven', r: [350, 230, 300, 250], on: C => { if (s.baked) { G.toast('烤箱裡空空的，還熱熱的。'); return; } if (!s.batterIn) { G.toast('一台紅色的小烤箱。上面有「溫度」和「時間」兩個旋鈕。'); return; } W.wheels(C, { id: 'oven', title: '設定烤箱', sub: '把兩個旋鈕轉到正確的設定，然後開始烤。', okText: '開始烤', wheels: [{ label: '溫度（度）', vals: [150, 160, 170, 180, 190, 200, 210, 220].map(String), kind: 'sm' }, { label: '時間（分）', vals: [10, 15, 20, 25, 30, 35, 40].map(String), kind: 'sm' }], check: (i, v) => v[0] === String(V(s).t) && v[1] === String(V(s).m), ok: C => { s.baked = 1; C.give('cake', true); Snd.play('chime'); G.toast('叮！香噴噴的「<b>海綿蛋糕</b>」出爐了！'); }, failMsg: '烤箱嗶嗶叫：這不是食譜上的設定喔。', okMsg: '烤呀烤……叮！' }); }, use: { batter: C => { C.take('batter'); s.batterIn = 1; Snd.play('open'); G.toast('把麵糊烤模放進烤箱。接下來要設定溫度和時間。'); } } },
          { id: 'pans', r: [690, 110, 240, 120], t: '掛著三個平底鍋，擦得亮晶晶的。' },
        ],
      },
      s: {
        draw: s => A.wall(WALL) + tile(110, 250, ...T1(s)) + tile(330, 250, ...T2(s)) + tile(550, 250, ...T3(s)) +
          A.txt(440, 230, '爺爺的水果天平', 20, '#8c5634', 'middle', 900) +
          `<g filter="url(#ds)"><rect x="760" y="60" width="200" height="150" rx="6" fill="#c9895a" ${SW}/><rect x="774" y="74" width="82" height="122" rx="4" fill="${s.cupOpen ? '#3b2a1f' : '#d9a070'}" ${SW2}/><rect x="864" y="74" width="82" height="122" rx="4" fill="#d9a070" ${SW2}/>${s.cupOpen && !s.flourTaken ? `<g transform="translate(770 100) scale(.9)">${ITEMS.flour.ic()}</g>` : ''}<circle cx="846" cy="140" r="5" fill="url(#brass)"/><circle cx="874" cy="140" r="5" fill="url(#brass)"/></g>` +
          (s.stoolOn ? `<g transform="translate(800 400) scale(1.2)">${ITEMS.stool.ic()}</g>` : '') + `<g filter="url(#ds)"><rect x="760" y="340" width="200" height="140" rx="6" fill="#f4f0e6" ${SW}/><rect x="750" y="320" width="220" height="24" rx="5" fill="#c9895a" ${SW}/></g>` + A.light(),
        hot: s => [
          { id: 'tiles', r: [100, 220, 640, 210], go: 'tiles' },
          { id: 'cup', r: [750, 50, 220, 170], on: C => { if (!s.stoolOn) G.toast('吊櫃好高，踮腳尖也搆不到。'); else if (!s.cupOpen) { s.cupOpen = 1; Snd.play('open'); G.toast('站上小板凳，打開吊櫃──裡面有一袋麵粉。'); } else if (!s.flourTaken) { s.flourTaken = 1; C.give('flour'); } else G.toast('吊櫃裡只剩幾個空罐子。'); }, use: { stool: C => { C.take('stool'); s.stoolOn = 1; Snd.play('step'); G.toast('把小板凳放在吊櫃下面。現在搆得到了！'); } } },
        ],
      },
      tiles: {
        back: 's', title: '水果天平',
        draw: s => A.closeBg('#fbe3b0', 'dots') + tile(40, 170, ...T1(s), 290) + tile(355, 170, ...T2(s), 290) + tile(670, 170, ...T3(s), 290) + A.txt(500, 120, '三座天平都剛好平衡。砝碼上的數字是重量。', 26, '#8c5634', 'middle', 900) + A.light(),
        hot: s => [{ id: 't', r: [30, 160, 940, 310], t: '每個天平左右兩邊一樣重。同一種水果的重量都一樣。' }],
      },
      w: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${A.door(90, 140, 190, 330, '#6f9fb8', { keyhole: true, open: s.doorOpen })}</g>` + A.table(420, 360, 360, 112, '#c9895a', { cloth: 34, clothC: '#fbe0e0' }) +
          `<ellipse cx="600" cy="352" rx="90" ry="20" fill="#fff" ${SW}/><ellipse cx="600" cy="350" rx="70" ry="13" fill="#fbe0e0"/>${s.cakeOn ? `<g transform="translate(540 296) scale(1.2)">${ITEMS.cake.ic()}</g><path d="M600 300v-26" stroke="#e98a8a" stroke-width="6"/><path d="M600 268q6-10 0-16q-6 6 0 16" fill="#f2c232"/>` : A.txt(600, 356, '生日蛋糕放這裡', 12, '#c4502c', 'middle', 700)}` +
          (s.cakeOn && !s.keyTaken ? `<rect x="520" y="372" width="160" height="30" rx="4" fill="#3b2a1f" ${SW2}/><g transform="translate(560 360) scale(.4)">${ITEMS.backKey.ic()}</g>${A.gear(640, 386, 14)}` : '') +
          (s.stool ? '' : `<g transform="translate(820 380) scale(1.1)">${ITEMS.stool.ic()}</g>`) + A.cat(470, 352, 0.55) + A.frame(560, 110, 120, 90, `<rect width="100" height="100" fill="#fff"/><path d="M20 80V50q30-20 60 0v30z" fill="#f6d08a"/><path d="M20 50q30 14 60 0" fill="#fbe0e0"/>${A.txt(50, 30, '♥', 26, '#e98a8a')}`) + A.light(),
        hot: s => [
          { id: 'door', r: [90, 140, 190, 330], on: C => { if (s.doorOpen) C.win(); else G.toast('後門鎖著。鎖孔旁邊畫著一顆小草莓。'); }, use: { backKey: C => { C.take('backKey'); s.doorOpen = 1; Snd.play('door'); C.win(); } } },
          { id: 'plate', r: [500, 300, 200, 110], on: C => { if (s.cakeOn && !s.keyTaken) { s.keyTaken = 1; C.give('backKey', true); C.give('g4', true); Snd.play('pick'); G.toast('從盤子下的小抽屜拿到「<b>後門鑰匙</b>」和「<b>音符齒輪 Ⅳ</b>」！'); } else if (!s.cakeOn) G.toast('盤子上寫著：「把生日蛋糕放在這裡」。盤子底下好像是空心的。'); else G.toast('好香的蛋糕。麻糬口水都快流下來了。'); }, use: { cake: C => { C.take('cake'); s.cakeOn = 1; Snd.play('click'); setTimeout(() => Snd.play('meow'), 400); G.toast('把蛋糕放上盤子──「喀噠」！盤子底下彈出一個小抽屜！'); } } },
          { id: 'stool', r: [800, 360, 130, 120], on: C => { if (!s.stool) { s.stool = 1; C.give('stool'); } } },
          { id: 'cat', r: [420, 270, 90, 90], on: () => { Snd.play('meow'); G.toast('麻糬一直盯著盤子，好像在等什麼好吃的。'); } },
        ],
      },
    },
    steps: [
      { goal: '打開冰箱', done: s => s.fridgeOpen, h: ['冰箱的鎖上畫著西洋梨、蘋果、櫻桃，各配一個數字轉輪。南邊牆上有三座水果天平。', s => `先從第一座天平算出蘋果有多重（三顆蘋果＝${V(s).a * 3}），再算西洋梨（梨＝蘋果＋${V(s).p - V(s).a}），最後算櫻桃（梨＋櫻桃＝三顆蘋果）。`, s => `蘋果 ${V(s).a}、西洋梨 ${V(s).p}、櫻桃 ${V(s).c}。照鎖上的順序（梨、蘋果、櫻桃）是 ${V(s).p}${V(s).a}${V(s).c}。`] },
      { goal: '拿到做蛋糕的材料', done: s => s.eggTaken && s.milkTaken, h: ['冰箱開了，往裡面看看。', '點冰箱進去，拿雞蛋和牛奶。', '點冰箱裡的雞蛋和牛奶，兩樣都要拿。'] },
      { goal: '拿到高處的麵粉', done: s => s.flourTaken, h: ['南邊的吊櫃太高了，需要墊腳的東西。', '西邊餐桌旁有一張小板凳。', '拿小板凳點南邊的吊櫃，打開後拿到麵粉。'] },
      { goal: '做出蛋糕麵糊', done: s => s.batterMade, h: ['北邊料理台上有攪拌碗，旁邊的卡片說了材料。', '把雞蛋、牛奶、麵粉一樣一樣拿去點攪拌碗。', '三樣都倒進攪拌碗，就會得到「麵糊烤模」。'] },
      { goal: '把蛋糕烤好', done: s => s.baked, h: ['東邊有烤箱，牆上貼著食譜卡。', '先把麵糊烤模放進烤箱，再點烤箱設定溫度和時間。', s => `溫度 ${V(s).t} 度、時間 ${V(s).m} 分鐘。`] },
      { goal: '把蛋糕放到該放的地方', done: s => s.keyTaken, h: ['西邊餐桌上有一個寫著字的盤子。', '盤子上寫著：把生日蛋糕放在這裡。', '拿海綿蛋糕點盤子，再點盤子拿到後門鑰匙和齒輪。'] },
      { goal: '從後門離開', done: s => s.doorOpen, h: ['西邊有一扇後門。', '後門鑰匙上有草莓吊飾，門上也畫著草莓。', '拿後門鑰匙點西邊的門。'] },
    ],
  });
})();
