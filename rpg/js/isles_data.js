'use strict';
// 曉鐘傳說：第四輪追加（月汐群島篇）——資料：新夥伴伊芙、怪物、道具、裝備、音樂、戰鬥背景

// ───── 新怪物外形 ─────
Object.assign(MTPL, {
  // 水母：半透明的傘與垂下的觸手
  jelly(p, c) {
    for (let i = 0; i < 6; i++) { const x0 = 12 + i * 4.8; for (let y = 24; y < 45; y += 1) { const x = x0 + Math.sin(y * 0.35 + i * 1.7) * 1.6; p.dot(x, y, i % 2 ? c.b : lighten(c.b, 0.25), 0.7); } }
    p.ell(24, 24, 15, 3.5, darken(c.a, 0.2));
    p.ell(24, 18, 16, 12, c.a, { clipY: 24, hl: true });
    p.ell(24, 16, 9, 6, lighten(c.a, 0.35), { clipY: 22, flat: true, noEdge: true });
    for (const [x, y] of [[13, 19], [35, 19], [24, 9]]) p.dot(x, y, c.c || '#ffffff', 1);
    p.eye2(19.5, 18, 2.2, '#1a1020'); p.line(22, 22, 26, 22, '#3a1a4a', 0.8);
  },
  // 鰭人：拿著三叉戟的魚人戰士
  fishman(p, c) {
    p.line(39, 4, 37, 46, '#8a6a3a', 1.4); p.poly([[34, 6], [36, 0], [38, 5], [40, -1], [41, 5], [43, 1], [43, 8], [35, 9]], c.d || '#d8dce8');
    p.rect2(17, 38, 5, 8, darken(c.a, 0.15)); p.ell2(18, 46, 4, 2, c.c || '#e0a040');
    p.ell(24, 31, 11, 11, c.a, { hl: true }); p.ell(24, 33, 6.5, 8, c.b);
    for (let y = 28; y < 40; y += 3) p.line(19, y, 29, y, darken(c.b, 0.15), 0.5);
    p.line2(14, 27, 8, 36, c.a, 2.2); p.line(34, 27, 38, 30, c.a, 2.2);
    p.ell(24, 15, 10, 9, c.a, { hl: true });
    p.poly([[17, 8], [20, 0], [23, 5], [26, -1], [29, 5], [32, 2], [31, 10]], c.c || '#e0a040');
    p.poly2([[13, 15], [7, 11], [9, 19]], c.c || '#e0a040');
    p.eye2(19.5, 14, 2.6, '#1a1020', { white: '#fff8d0' });
    p.ell(24, 21, 4, 1.6, '#3a0a1a', { flat: true });
  },
  // 海龜：岩石般的龜殼
  turtle(p, c) {
    p.ell2(11, 40, 5, 3.5, c.c); p.ell2(15, 34, 4, 3, c.c);
    p.ell(8, 29, 7, 6, c.c, { hl: true }); p.eye(6, 27, 1.8, '#1a1020'); p.line(3, 32, 8, 32, '#2a1a10', 0.7);
    p.ell(26, 28, 18, 13, c.a, { hl: true, clipY: 36 });
    p.ell(26, 36, 18, 3, darken(c.a, 0.3));
    for (const [x, y] of [[20, 22], [30, 22], [25, 30], [15, 30], [35, 30]]) { p.poly([[x - 4, y], [x - 2, y - 4], [x + 2, y - 4], [x + 4, y], [x + 2, y + 4], [x - 2, y + 4]], c.b, { flat: true }); }
    for (const [x, y] of [[22, 15], [32, 19], [12, 24]]) p.dot(x, y, c.d || '#ffffff', 0.8);
  },
  // 海蛇王：從水中探出的長頸
  serpent(p, c, o) {
    p.ell(24, 44, 22, 4, c.d || '#2a6ab8', { flat: true });
    for (let i = 0; i < 14; i++) { const t = i / 13, x = 14 + Math.sin(t * 3.2) * 9 + t * 8, y = 44 - t * 30, r = 7 - t * 2.2; p.ell(x, y, r, r, i % 2 ? c.a : darken(c.a, 0.08), { hl: true }); p.ell(x - r * 0.4, y, r * 0.45, r * 0.6, c.b, { flat: true, noEdge: true }); }
    p.poly([[30, 10], [44, 2], [40, 14]], c.c || '#e0f0ff'); p.poly([[18, 22], [6, 16], [12, 26]], c.c || '#e0f0ff');
    p.ell(30, 12, 10, 7, c.a, { hl: true }); p.ell(36, 16, 7, 3.5, c.b);
    p.poly([[26, 6], [22, -2], [28, 4]], '#f4f0e0'); p.poly([[33, 6], [35, -2], [36, 5]], '#f4f0e0');
    p.eye(28, 10, 2.3, '#1a1020', { white: c.e || '#ffe040' });
    for (let x = 32; x <= 41; x += 2.5) p.poly([[x, 17], [x + 1, 20], [x + 2, 17]], '#ffffff', { flat: true });
    if (o.crown) p.poly([[24, 4], [25, -1], [27, 3], [29, -2], [31, 3]], '#f2c14e');
  },
  // 大魚（海之主）
  fish(p, c) {
    p.poly([[38, 24], [47, 12], [46, 24], [47, 36]], c.b);
    p.poly([[20, 14], [26, 4], [32, 13]], c.b); p.poly([[22, 34], [26, 42], [30, 33]], c.b);
    p.ell(22, 24, 18, 12, c.a, { hl: true }); p.ell(22, 29, 14, 5, c.c || lighten(c.a, 0.4), { flat: true, noEdge: true });
    for (const [x, y] of [[20, 18], [28, 16], [30, 22], [16, 20], [25, 21]]) p.dot(x, y, darken(c.a, 0.3), 0.9);
    p.eye(10, 21, 2.6, '#1a1020', { white: c.e || '#fff8d0' });
    p.line(4, 27, 10, 28, '#3a0a1a', 1); p.line(5, 28, -1, 34, c.d || '#c8a060', 0.8); p.line(7, 29, 3, 38, c.d || '#c8a060', 0.8);
  },
});

// ───── 新怪物 ─────
Object.assign(MONS, {
  // 月汐群島（主島）
  reefcrab: { name: '礁岩蟹', tpl: 'crab', pal: { a: '#e86a6a', b: '#ffd8c8' }, hp: 720, atk: 112, def: 118, agi: 18, exp: 290, gold: 170, acts: ['atk', 3, 'defend', 1], res: { thunder: 1.5 } },
  mgull: { name: '潮風海鳥', tpl: 'bird', pal: { a: '#f4f8ff', b: '#7ab8e8', c: '#ffffff', d: '#f2a040' }, hp: 600, atk: 118, def: 60, agi: 62, exp: 280, gold: 150, acts: ['atk', 1], twice: 0.3 },
  jelly: { name: '月光水母', tpl: 'jelly', pal: { a: '#b8a8ff', b: '#e8d8ff', c: '#ffffff' }, hp: 660, atk: 100, def: 70, agi: 40, exp: 300, gold: 160, acts: ['atk', 2, 'spell:zap', 1, 'spell:sleep', 1, 'poison:0.4', 1], res: { thunder: 1.5, fire: 0.5 } },
  finman: { name: '鰭人戰士', tpl: 'fishman', pal: { a: '#3a9ab0', b: '#c8f0e8', c: '#f0a040', d: '#d8dce8' }, hp: 820, atk: 124, def: 82, agi: 46, exp: 340, gold: 190, acts: ['atk', 3, 'atk2', 1], res: { thunder: 1.5 } },
  // 珊瑚洞窟
  finpriest: { name: '鰭人祭司', tpl: 'fishman', pal: { a: '#7a5ac8', b: '#e0d8ff', c: '#40e0d0', d: '#f2c14e' }, hp: 760, atk: 100, def: 76, agi: 50, exp: 370, gold: 230, acts: ['atk', 1, 'spell:ice', 2, 'spell:blizzard', 1, 'heal', 1], res: { ice: 0.5, thunder: 1.5 } },
  snapturtle: { name: '岩甲海龜', tpl: 'turtle', pal: { a: '#7a8a6a', b: '#5a6a4a', c: '#8ab070', d: '#c8f0ff' }, hp: 1000, atk: 120, def: 140, agi: 12, exp: 410, gold: 210, acts: ['atk', 3, 'defend', 1, 'charge', 1], res: { thunder: 1.5, ice: 0.5 } },
  eelserp: { name: '雷光海蛇', tpl: 'snake', pal: { a: '#3a6ad8', b: '#f8f080', e: '#ffe040' }, hp: 800, atk: 122, def: 70, agi: 58, exp: 360, gold: 180, acts: ['atk', 2, 'spell:zap', 2], res: { thunder: 0 } },
  // 霧之森
  mistfox: { name: '霧狐', tpl: 'wolf', pal: { a: '#c8c0e0', b: '#ffffff', e: '#8a5ad8' }, hp: 820, atk: 132, def: 72, agi: 70, exp: 410, gold: 200, acts: ['atk', 1], twice: 0.35 },
  mistwisp: { name: '迷霧鬼火', tpl: 'lantern', pal: { a: '#4a5a6a', b: '#2a3440', c: '#a8f0d8' }, hp: 760, atk: 110, def: 80, agi: 50, exp: 380, gold: 230, acts: ['atk', 2, 'sleepgas:0.35', 2, 'spell:firestorm', 2], undead: 1, res: { holy: 2 } },
  thornvine: { name: '荊棘妖花', tpl: 'plant', pal: { a: '#6a3a8a', b: '#3a5a2a', c: '#ff5a8a' }, hp: 950, atk: 128, def: 80, agi: 30, exp: 420, gold: 220, acts: ['atk', 3, 'poison:0.4', 2, 'multi', 1], res: { fire: 1.5 } },
  mistowl: { name: '夜霧梟', tpl: 'bird', pal: { a: '#8a7a6a', b: '#5a4a3a', c: '#f0e8d8', d: '#ffd040' }, hp: 800, atk: 126, def: 66, agi: 66, exp: 410, gold: 210, acts: ['atk', 3, 'spell:sleep', 1, 'spell:seal', 1] },
  // 東島（曜日之島）
  sunscorp: { name: '灼日蠍', tpl: 'scorpion', pal: { a: '#e8903a', c: '#ffe040' }, hp: 1000, atk: 142, def: 100, agi: 40, exp: 480, gold: 260, acts: ['atk', 3, 'poison:0.45', 2], res: { fire: 0.5 } },
  flamebird: { name: '火焰鳥', tpl: 'bird', pal: { a: '#ff7a3a', b: '#ffd040', c: '#fff0a0', d: '#ff3a2a' }, hp: 880, atk: 138, def: 74, agi: 72, exp: 460, gold: 250, acts: ['atk', 3, 'breath:fire:44:56', 1], res: { fire: 0, ice: 1.5 }, twice: 0.3 },
  salamander: { name: '火蜥蜴', tpl: 'dragon', pal: { a: '#d84a2a', b: '#8a2a1a', c: '#ffd080', d: '#ffe0a0', e: '#ffe040' }, hp: 1100, atk: 146, def: 96, agi: 40, exp: 500, gold: 270, acts: ['atk', 3, 'breath:fire:50:62', 2], res: { fire: 0, ice: 1.5 } },
  // 曜日之塔
  sunknight: { name: '曜日騎士', tpl: 'knight', pal: { a: '#e8c860', b: '#f8f0d0', c: '#ff8a2a', e: '#ff8a2a' }, hp: 1100, atk: 156, def: 116, agi: 46, exp: 590, gold: 320, acts: ['atk', 3, 'atk2', 2, 'defend', 1] },
  flamesp: { name: '炎之精靈', tpl: 'wisp', pal: { a: '#ff7a3a', b: '#ffe080' }, hp: 950, atk: 130, def: 80, agi: 70, exp: 550, gold: 300, acts: ['atk', 1, 'spell:firestorm', 2, 'spell:inferno', 1], res: { fire: 0, ice: 1.5 } },
  brassgolem: { name: '黃銅魔像', tpl: 'golem', pal: { a: '#c8a040', b: '#8a6a2a', c: '#ff6a2a' }, hp: 1100, atk: 160, def: 120, agi: 14, exp: 650, gold: 340, acts: ['atk', 3, 'charge', 1, 'atk2', 1], res: { thunder: 1.5 } },
  sunpriest: { name: '灼光祭司', tpl: 'mage', pal: { a: '#f0e0b0', b: '#c89a40', c: '#ff8a2a', e: '#ffe040' }, hp: 1080, atk: 120, def: 88, agi: 58, exp: 620, gold: 380, acts: ['atk', 1, 'spell:sunflare', 2, 'spell:heal2', 1, 'spell:seal', 1] },
  // 深淵海溝
  deepjelly: { name: '深淵水母', tpl: 'jelly', pal: { a: '#3a2a8a', b: '#8a6af0', c: '#40e0ff' }, hp: 1200, atk: 168, def: 110, agi: 60, exp: 1010, gold: 420, acts: ['atk', 2, 'spell:thunder2', 2, 'spell:sleep', 1], res: { fire: 0.5 } },
  abyssknight: { name: '深海騎士', tpl: 'fishman', pal: { a: '#1a3a5a', b: '#5a8ab0', c: '#40e0ff', d: '#c8d0e8' }, size: 60, hp: 1500, atk: 186, def: 140, agi: 50, exp: 1220, gold: 480, acts: ['atk', 3, 'atk2', 2], twice: 0.3, res: { thunder: 1.5 } },
  deepeel: { name: '深淵鰻', tpl: 'snake', pal: { a: '#1a2a4a', b: '#40e0c0', e: '#ff4060' }, hp: 1300, atk: 178, def: 100, agi: 76, exp: 1080, gold: 440, acts: ['atk', 3, 'breath:ice:66:80', 1, 'drain', 1] },
  // 稀有
  kingcrab: { name: '巨鉗王 哈普', tpl: 'crab', pal: { a: '#c83a3a', b: '#ffe0b0' }, size: 72, hp: 2200, atk: 140, def: 100, agi: 26, exp: 2800, gold: 2400, acts: ['atk', 3, 'atk2', 2, 'defend', 1], twice: 0.3, res: { thunder: 1.5 }, rare: 1 },
  phoenix: { name: '火鳳 菲尼', tpl: 'bird', pal: { a: '#ff5a2a', b: '#ffd040', c: '#fff8c0', d: '#ffffff' }, size: 72, hp: 3000, atk: 150, def: 90, agi: 80, exp: 3500, gold: 2800, acts: ['atk', 3, 'breath:fire:60:74', 2], res: { fire: 0, ice: 1.5 }, twice: 0.3, rare: 1 },
  // 頭目
  karkino: { name: '潮汐巨蟹 卡爾奇諾', tpl: 'crab', boss: 1, pal: { a: '#d8503a', b: '#ffe8c0' }, hp: 5600, atk: 158, def: 130, agi: 28, exp: 8000, gold: 5000, acts: ['atk', 3, 'atk2', 2, 'breath:water:52:64', 2, 'defend', 1, 'call:reefcrab', 1], res: { thunder: 1.5, ice: 0.5 }, twice: 0.35 },
  vesper: { name: '霧之魔女 薇絲柏', tpl: 'mage', boss: 1, pal: { a: '#5a6a8a', b: '#2a3450', c: '#a8f0d8', e: '#a8f0d8' }, hp: 4600, atk: 128, def: 96, agi: 70, exp: 10000, gold: 6000, acts: ['atk', 3, 'spell:darkstorm', 2, 'spell:blizzard', 1, 'spell:sleep', 1, 'heal', 1, 'call:mistwisp', 1], twice: 0.3 },
  sunguard: { name: '日輪魔像', tpl: 'golem', boss: 1, pal: { a: '#f0d070', b: '#b88a30', c: '#ff5a2a', e: '#ff5a2a' }, art: { spikes: 1 }, hp: 8000, atk: 186, def: 120, agi: 20, exp: 12000, gold: 7000, acts: ['atk', 3, 'atk2', 2, 'charge', 1, 'breath:fire:62:74', 2], res: { thunder: 1.5, fire: 0 }, twice: 0.45 },
  solvi1: { name: '灰燼賢者 索爾維', tpl: 'mage', boss: 1, pal: { a: '#e8dcc0', b: '#8a7a6a', c: '#ffb040', e: '#ffd040' }, hp: 5400, atk: 160, def: 104, agi: 64, exp: 0, gold: 0, acts: ['atk', 3, 'spell:sunflare', 2, 'spell:inferno', 1, 'heal', 1, 'dispel', 1], twice: 0.35 },
  solvi2: { name: '烈日化身 索爾維', tpl: 'demonlord', boss: 1, pal: { a: '#f8e8b0', b: '#e09a30', c: '#ff5a1a' }, hp: 7600, atk: 174, def: 112, agi: 66, exp: 22000, gold: 12000, acts: ['atk', 3, 'spell:sunflare', 2, 'breath:sun:62:74', 2, 'atk2', 2, 'roar', 1], twice: 0.45 },
  levi: { name: '深淵海皇 利維坦', tpl: 'serpent', boss: 1, pal: { a: '#2a5a9a', b: '#a8e0f0', c: '#e0f8ff', d: '#1a3a7a', e: '#ff4060' }, art: { crown: 1 }, hp: 13000, atk: 186, def: 128, agi: 70, exp: 40000, gold: 25000, acts: ['atk', 3, 'atk2', 2, 'breath:water:72:86', 2, 'spell:darkstorm2', 1, 'roar', 1], twice: 0.5, res: { ice: 0.5 } },
  nushi: { name: '海之主 古拉姆', tpl: 'fish', boss: 1, pal: { a: '#4a6a9a', b: '#2a4a7a', c: '#d8e8f0', d: '#c8a060', e: '#ffe080' }, hp: 8000, atk: 168, def: 100, agi: 50, exp: 12000, gold: 8000, acts: ['atk', 3, 'atk2', 2, 'breath:water:50:62', 2, 'drain', 1], twice: 0.5 },
});
for (const k in MONS) MONS[k].id = k;
Object.assign(ESPELLS, {
  sunflare: { name: '烈日之焰', el: 'fire', tgt: 'all', pow: [74, 88], anim: 'fire' },
  sunflare2: { name: '永晝之焰', el: 'fire', tgt: 'all', pow: [88, 104], anim: 'fire' },
});
Object.assign(BOSS_SPEAK, { 卡爾奇諾: 'karkino', 潮汐巨蟹: 'karkino', 薇絲柏: 'vesper', 霧之魔女: 'vesper', 索爾維: 'solvi1', 利維坦: 'levi', 海之主: 'nushi' });

// 新的吐息：水柱與日光（訊息與顏色）
{
  const BR = { water: ['噴出洶湧的水柱！', ['#ffffff', '#8ad8ff', '#3a8ae8']], sun: ['放出灼熱的日光！', ['#ffffff', '#fff0a0', '#ffb040']] };
  const ea0 = Battle.enemyAct.bind(Battle);
  Battle.enemyAct = function (B, e, ev) {
    const n0 = ev.length; ea0(B, e, ev);
    for (let i = n0; i < ev.length; i++) {
      const v = ev[i];
      if (v.t === 'anim' && v.kind === 'breath' && BR[v.el]) for (let j = i - 1; j >= n0; j--) if (ev[j].t === 'msg' && /undefined$/.test(ev[j].text)) { ev[j].text = ev[j].text.replace(/undefined$/, BR[v.el][0]); break; }
    }
  };
  const br0 = BFX.breath.bind(BFX);
  BFX.breath = function (src, targets, el) { if (!BR[el]) return br0(src, targets, el); return br0(src, targets, el === 'water' ? 'ice' : 'fire'); };
}

// ───── 新夥伴：暮鐘守 伊芙（弓與歌） ─────
CHARS.eve = { name: '伊芙', role: '暮鐘守', base: { hp: 30, mp: 12, str: 9, def: 6, agi: 11, int: 9 }, gr: { hp: 6.6, mp: 2.7, str: 2.25, def: 1.45, agi: 2.1, int: 1.8 }, eqMask: 'E', magic: '特技',
  learn: [[1, 'twinshot'], [8, 'lullaby'], [15, 'tidesong'], [22, 'moonarrow'], [28, 'arrowrain'], [34, 'duskhymn'], [40, 'starfall']] };
LOOKS.eve = { skin: '#f6d2b4', hair: '#3a3a8a', hs: 'pony', eye: '#6a4ac8', top: '#2a5a9a', trim: '#f2d27a', pants: '#2a3a6a', shoes: '#4a3a5a', belt: '#c8a050', out: 'tunic', scarf: '#d8c8ff', cape: '#4a3a8a' };
BWEAP.eve = 'bow';
WANG.bow = { down: 80, down2: 50, fwd: 90, fwdDown: 70, up: 100, high: 90, back: 120, guard: 90 };
{
  const dw0 = drawWeapon;
  drawWeapon = function (p, kind, hx, hy, deg) {
    if (kind !== 'bow') return dw0(p, kind, hx, hy, deg);
    // 弓：以手為中心的弧線＋弦
    const a = deg * Math.PI / 180, ux = -Math.cos(a), uy = -Math.sin(a), nx = -uy, ny = ux;
    for (let t = -7; t <= 7; t += 0.5) { const bow = Math.cos(t / 7 * Math.PI / 2) * 2.6; p.P(hx + ux * t - nx * bow, hy + uy * t - ny * bow, Math.abs(t) > 5.5 ? '#f2c14e' : '#8a5a2a'); }
    for (let t = -6.5; t <= 6.5; t += 0.5) p.P(hx + ux * t + nx * 0.6, hy + uy * t + ny * 0.6, '#e8e8f0');
    p.P(hx - nx * 2.6, hy - ny * 2.6, '#c8f0ff');
  };
}
Object.assign(SPEAKERS, { 伊芙: 'eve' });
Object.assign(SPELLS, {
  twinshot: { name: '雙重射擊', mp: 3, tgt: 'enemies', kind: 'multi', hits: 2, mult: 0.85, acc: 0.96, desc: '連射兩箭，隨機射向敵人。' },
  lullaby: { name: '搖籃曲', mp: 5, tgt: 'enemies', kind: 'status', st: 'sleep', rate: 0.6, desc: '溫柔的歌聲讓敵人睡著。' },
  tidesong: { name: '潮汐之歌', mp: 12, tgt: 'allies', kind: 'heal', pow: [70, 86], field: 1, desc: '像潮水一樣的歌聲，回復全體夥伴的 HP。' },
  moonarrow: { name: '月光箭', mp: 9, tgt: 'enemy', kind: 'dmg', el: 'holy', pow: [100, 120], desc: '灌注月光的一箭，對不死怪物特別有效。' },
  arrowrain: { name: '箭雨', mp: 12, tgt: 'enemies', kind: 'phys', mult: 0.95, acc: 0.95, desc: '把箭射向天空，落向全部敵人。' },
  duskhymn: { name: '暮色讚歌', mp: 14, tgt: 'allies', kind: 'buff2', desc: '提升全體的防禦與速度。' },
  starfall: { name: '星落之矢', mp: 20, tgt: 'enemy', kind: 'phys', mult: 3.1, acc: 0.95, desc: '像流星一樣落下的必殺一箭。' },
});
// 新的技能種類：多段射擊、雙重提升
{
  const cs0 = Battle.castSpell.bind(Battle);
  Battle.castSpell = function (B, m, sid, target, ev) {
    const sp = SPELLS[sid];
    if (!sp || (sp.kind !== 'multi' && sp.kind !== 'buff2')) return cs0(B, m, sid, target, ev);
    const nm = Party.name(m), ps = this.pstat(m);
    if (sp.kind === 'buff2' && m.b.seal) { ev.push({ t: 'msg', text: `${nm}想唱「${sp.name}」，但是聲音被封印了！` }); return; }
    if (m.mp < sp.mp) { ev.push({ t: 'msg', text: `${nm}的 MP 不夠！` }); return; }
    m.mp -= sp.mp; ev.push({ t: 'mp', m });
    if (sp.kind === 'multi') {
      ev.push({ t: 'pact', m, kind: 'attack', target: this.pickTargetE(B, target) }, { t: 'msg', text: `${nm}使出了「${sp.name}」！` });
      for (let i = 0; i < sp.hits; i++) {
        const e = this.pickTargetE(B, i === 0 ? target : null); if (!e) break;
        ev.push({ t: 'anim', kind: 'slash', target: e, sfx: 'attack' });
        this.physHit(B, ps, e, sp.mult, ev, { acc: sp.acc, canCrit: true });
      }
      return;
    }
    ev.push({ t: 'pact', m, kind: 'cast', el: 'buff' }, { t: 'msg', text: `${nm}唱起了「${sp.name}」！` }, { t: 'anim', kind: 'buff', target: 'party', sfx: 'buff' });
    for (const t of this.liveP(B)) { t.b.buf.def = Math.min(2, t.b.buf.def + 1); t.b.buf.agi = Math.min(2, t.b.buf.agi + 1); }
    ev.push({ t: 'msg', text: '大家的防禦力和速度提升了！' });
  };
  // 自動戰鬥：伊芙的判斷
  const auto0 = Battle.auto.bind(Battle);
  Battle.auto = function (B, m, o = {}) {
    if (m.id !== 'eve') return auto0(B, m, o);
    const sp = Party.spells(m).filter(s => SPELLS[s].mp <= m.mp && !SPELLS[s].nobattle && (!m.b.seal || ['multi', 'phys'].includes(SPELLS[s].kind)));
    const has = s => sp.includes(s);
    const party = this.liveP(B), E = this.liveE(B), ratio = x => x.hp / Party.stats(x).mhp, mmp = Party.stats(m).mmp;
    if (!E.length) return { type: 'attack' };
    const low = party.filter(x => ratio(x) < 0.5);
    if (low.length >= 2 && has('tidesong')) return { type: 'spell', id: 'tidesong' };
    const big = B.boss || E.some(e => e.m.boss), metal = E.some(e => e.m.metal);
    const strongest = E.slice().sort((a, b) => b.hp - a.hp)[0], weakest = E.slice().sort((a, b) => a.hp - b.hp)[0];
    if (metal) return has('twinshot') ? { type: 'spell', id: 'twinshot', target: weakest } : { type: 'attack', target: weakest };
    if (big) {
      if (has('duskhymn') && party.some(x => x.b.buf.def < 1) && Math.random() < 0.4) return { type: 'spell', id: 'duskhymn' };
      if (m.mp > mmp * 0.15) { const s = ['starfall', 'moonarrow'].find(s => has(s) && (s !== 'moonarrow' || !(strongest.m.res && strongest.m.res.holy < 1))); if (s) return { type: 'spell', id: s, target: strongest }; }
    } else if (E.length >= 3 && m.mp > mmp * 0.35 && has('arrowrain')) return { type: 'spell', id: 'arrowrain' };
    else if (E.length >= 2 && has('twinshot') && m.mp > mmp * 0.3) return { type: 'spell', id: 'twinshot', target: weakest };
    if (has('moonarrow') && E.some(e => e.m.undead) && m.mp > mmp * 0.3) return { type: 'spell', id: 'moonarrow', target: E.find(e => e.m.undead) };
    return { type: 'attack', target: weakest };
  };
}

// ───── 新道具 ─────
Object.assign(ITEMS, {
  mshard1: { name: '潮之音片', kind: 'key', desc: '暮鐘的第一片月音片，像海浪一樣輕輕起伏。' },
  mshard2: { name: '霧之音片', kind: 'key', desc: '暮鐘的第二片月音片，表面總是蒙著一層薄霧。' },
  mshard3: { name: '光之音片', kind: 'key', desc: '暮鐘的最後一片月音片，還帶著夕陽的溫度。' },
  rod: { name: '釣竿', kind: 'key', desc: '漁夫岡瑟送的釣竿。面向水邊按 A 就能釣魚。' },
  rod2: { name: '名人釣竿', kind: 'key', desc: '岡瑟年輕時用的名竿。據說連「海之主」都拉得上來。' },
  score1: { name: '樂譜殘頁（上）', kind: 'key', desc: '暮鐘之歌的樂譜，開頭的部分。' },
  score2: { name: '樂譜殘頁（中）', kind: 'key', desc: '暮鐘之歌的樂譜，中間的部分。' },
  score3: { name: '樂譜殘頁（下）', kind: 'key', desc: '暮鐘之歌的樂譜，結尾的部分。' },
  moonwater: { name: '月露', kind: 'mp', pow: [70, 90], price: 900, tgt: 'ally', desc: '月光凝成的露水。回復約 80 MP。' },
  tome_tidesong: { name: '潮汐秘傳書', kind: 'tome', sell: 0, nobattle: 1, tgt: 'ally', desc: '讀了以後學會「潮汐之歌」（回復全體 HP）。洛恩、米菈、巴爾克可以學。' },
  tome_starfall: { name: '星落秘傳書', kind: 'tome', sell: 0, nobattle: 1, tgt: 'ally', desc: '讀了以後學會「星落之矢」（單體大傷害）。洛恩、巴爾克可以學。' },
});
Object.assign(TOMES, { tome_tidesong: { spell: 'tidesong', who: 'HMB' }, tome_starfall: { spell: 'starfall', who: 'HB' } });
Object.assign(EQUIP, {
  moonbow: { name: '月弦弓', slot: 'w', atk: 62, agi: 4, price: 0, sell: 3000, who: 'E' },
  tidebow: { name: '潮汐之弓', slot: 'w', atk: 76, agi: 6, price: 9200, who: 'E' },
  sunbow: { name: '曜日之弓', slot: 'w', atk: 94, agi: 8, int: 6, price: 0, sell: 6000, who: 'E' },
  duskbow: { name: '暮光之弓', slot: 'w', atk: 108, agi: 12, int: 10, price: 0, sell: 8000, who: 'E' },
  tidesword: { name: '潮汐之劍', slot: 'w', atk: 82, int: 6, price: 9800, who: 'H' },
  duskblade: { name: '暮光之劍', slot: 'w', atk: 104, int: 14, price: 0, sell: 8000, who: 'H' },
  coralaxe: { name: '珊瑚戰斧', slot: 'w', atk: 86, price: 0, sell: 5000, who: 'B' },
  tidehalberd: { name: '潮汐戰戟', slot: 'w', atk: 84, price: 9600, who: 'B' },
  seaking: { name: '海皇之戟', slot: 'w', atk: 112, agi: 6, price: 0, sell: 9000, who: 'HB' },
  pearlrod: { name: '珍珠權杖', slot: 'w', atk: 34, int: 34, price: 9400, who: 'LM' },
  tidemail: { name: '潮紋鎧', slot: 'a', def: 56, price: 9000, who: 'HB' },
  abyssmail: { name: '深淵之鎧', slot: 'a', def: 74, agi: 4, price: 0, sell: 7000, who: 'HB' },
  pearlrobe: { name: '珍珠法衣', slot: 'a', def: 40, int: 10, price: 8600, who: 'LME' },
  sunrobe: { name: '曜日法衣', slot: 'a', def: 50, int: 14, price: 0, sell: 6000, who: 'LME' },
  tidecoat: { name: '潮風外衣', slot: 'a', def: 34, agi: 6, price: 0, sell: 2000, who: 'E' },
  seashield: { name: '海神之盾', slot: 's', def: 30, price: 7400, who: 'HBE' },
  sunshield: { name: '曜日之盾', slot: 's', def: 36, price: 0, sell: 5000, who: 'HBE' },
  coralhelm: { name: '珊瑚盔', slot: 'h', def: 22, price: 6400, who: 'HB' },
  moonhood: { name: '月光頭巾', slot: 'h', def: 16, int: 8, price: 6000, who: 'LME' },
  tidering: { name: '潮汐戒指', slot: 'x', def: 12, int: 12, price: 0, sell: 3000, who: 'HLMBE' },
  mistcloak: { name: '霧隱斗篷', slot: 'x', agi: 20, def: 6, price: 0, sell: 3000, who: 'HLMBE' },
  duskcrown: { name: '暮光王冠', slot: 'x', atk: 12, def: 12, agi: 12, int: 16, price: 0, sell: 8000, who: 'HLMBE' },
  nushiscale: { name: '主之鱗', slot: 'x', def: 16, agi: 16, price: 0, sell: 6000, who: 'HLMBE' },
  levicrest: { name: '海皇紋章', slot: 'x', atk: 20, def: 20, agi: 14, int: 14, price: 0, sell: 12000, who: 'HLMBE' },
  anglerring: { name: '釣手戒指', slot: 'x', agi: 10, def: 8, price: 0, sell: 2500, who: 'HLMBE' },
  legendbelt: { name: '傳說腰帶', slot: 'x', atk: 22, def: 16, agi: 10, int: 10, price: 0, sell: 10000, who: 'HLMBE' },
});
// 伊芙能用的舊裝備：所有人都能用的，加上輕裝與法衣類
{
  const extra = ['leather', 'cap', 'robe', 'hood', 'magerobe', 'elfrobe', 'frostrobe', 'starrobe', 'woodshield', 'bronzeshield', 'silvershield', 'wisecrown'];
  for (const k in EQUIP) { const e = EQUIP[k]; if (!e.who.includes('E') && (e.who.includes('HLMB') || extra.includes(k))) e.who += 'E'; }
  const id0 = itemDesc;
  itemDesc = function (id) { const s = id0(id); return EQUIP[id] && EQUIP[id].who.includes('E') ? s.replace(/可裝備：(.*)$/, (a, b) => '可裝備：' + b.replace(/、?undefined/g, '') + '、伊芙') : s; };
}
SHOPS.tide_w = ['tidesword', 'tidehalberd', 'pearlrod', 'tidebow', 'tidemail', 'pearlrobe', 'seashield', 'coralhelm', 'moonhood'];
SHOPS.tide_i = ['herb2', 'herb3', 'antidote', 'wing', 'incense', 'smoke', 'feather', 'ether', 'moonwater'];
JOIN_EQ.eve = { w: 'moonbow', a: 'tidecoat', h: 'moonhood' };

// ───── 遇敵表 ─────
Object.assign(ZONES, {
  i1: { lv: 32, mons: ['reefcrab', 'mgull', 'jelly', 'finman'], w: [3, 3, 3, 3], n: [1, 3], bg: 'isles' },
  i2: { lv: 38, mons: ['sunscorp', 'flamebird', 'salamander', 'finman'], w: [3, 3, 3, 1], n: [1, 3], bg: 'sunisle' },
  dc: { lv: 34, mons: ['jelly', 'finpriest', 'snapturtle', 'eelserp', 'reefcrab'], w: [3, 3, 3, 3, 2], n: [1, 3], bg: 'coral' },
  df: { lv: 36, mons: ['mistfox', 'mistwisp', 'thornvine', 'mistowl'], w: [3, 3, 3, 3], n: [1, 3], bg: 'mist' },
  ds: { lv: 40, mons: ['sunknight', 'flamesp', 'brassgolem', 'sunpriest'], w: [3, 3, 2, 3], n: [1, 3], bg: 'sun' },
  dab: { lv: 46, mons: ['deepjelly', 'abyssknight', 'deepeel'], w: [3, 3, 3], n: [1, 3], bg: 'abyss' },
});
Object.assign(RARES, { i1: ['kingcrab', 1 / 36], i2: ['phoenix', 1 / 36] });

// ───── 音樂 ─────
Object.assign(SONGS, {
  isles: {
    bpm: 132, bar: 8, lead: 'square', bass: 'march', arp: 'broken', drum: 'soft',
    chords: 'D A Bm G D A G A D F#m G D Em A D D',
    mel: 'D5 2 F#5 2 A5 3 F#5 1 | E5 2 C#5 2 A4 4 | B4 2 D5 2 F#5 2 B5 2 | A5 3 G5 1 F#5 2 E5 2 | F#5 2 A5 2 D6 3 C#6 1 | B5 2 A5 2 E5 4 | G5 2 B5 2 D6 2 B5 2 | A5 6 R 2 |' +
      'D6 2 C#6 1 B5 1 A5 2 F#5 2 | A5 2 F#5 1 E5 1 C#5 4 | B4 2 D5 2 G5 3 F#5 1 | F#5 4 D5 4 | E5 2 G5 2 B5 2 E6 2 | C#6 3 B5 1 A5 4 | D6 2 A5 2 F#5 2 E5 2 | D5 6 R 2',
  },
  tidetown: {
    bpm: 108, bar: 6, lead: 'p25', bass: 'waltz', arp: 'waltz', drum: 'none',
    chords: 'F C Dm Bb F C Bb C F Am Bb F Gm C F F',
    mel: 'A4 2 C5 2 F5 2 | E5 4 C5 2 | D5 2 F5 2 A5 2 | G5 4 F5 2 | F5 2 A5 2 C6 2 | C6 3 Bb5 1 G5 2 | F5 2 D5 2 Bb4 2 | C5 6 |' +
      'C6 2 A5 2 F5 2 | E5 2 C5 2 E5 2 | D5 2 F5 2 Bb5 2 | A5 4 F5 2 | G5 2 Bb5 2 D6 2 | C6 2 Bb5 2 E5 2 | F5 2 A5 2 C6 2 | F5 6',
  },
  suntower: {
    bpm: 140, bar: 8, lead: 'square', bass: 'drive', arp: 'stab', drum: 'march',
    chords: 'Em F Em D Em F G F# Am G F Em Am B Em Em',
    mel: 'E5 2 G5 2 B5 2 E6 2 | F6 3 E6 1 C6 4 | B5 2 G5 2 E5 2 B4 2 | D5 3 F#5 1 A5 4 | G5 2 B5 2 E6 2 B5 2 | C6 2 A5 2 F5 2 A5 2 | B5 2 D6 2 G6 2 D6 2 | F#6 4 C#6 4 |' +
      'E6 2 C6 2 A5 2 C6 2 | D6 2 B5 2 G5 2 B5 2 | C6 3 B5 1 A5 2 F5 2 | G5 4 E5 4 | A5 2 C6 2 E6 2 A6 2 | F#6 3 D#6 1 B5 4 | E6 2 B5 2 G5 2 E5 2 | E5 6 R 2',
  },
  mist: {
    bpm: 92, bar: 8, lead: 'p25', bass: 'slow', arp: 'arp', drum: 'none',
    chords: 'Am Em F C Am Em Dm E Am G F C Dm Am E Am',
    mel: 'E5 4 A5 4 | G5 4 E5 4 | F5 3 E5 1 C5 4 | E5 8 | A5 4 C6 4 | B5 4 G5 4 | A5 3 F5 1 D5 4 | G#5 8 |' +
      'C6 3 B5 1 A5 4 | B5 3 A5 1 G5 4 | A5 2 F5 2 C5 4 | E5 8 | F5 2 A5 2 D6 4 | C6 3 B5 1 A5 4 | G#5 4 B5 4 | A5 8',
  },
});

// ───── 戰鬥背景 ─────
{
  const get0 = BBG.get.bind(BBG);
  const KINDS = new Set(['isles', 'sunisle', 'coral', 'mist', 'sun', 'abyss']);
  BBG.get = function (kind, aspect) {
    if (!KINDS.has(kind)) return get0(kind, aspect);
    const W = 320, H = clamp(Math.round(W * aspect / 8) * 8, 150, 420), key = kind + H + (kind === 'isles' && F('dusk') ? 'd' : '');
    if (this.cache[key]) return this.cache[key];
    const hz = Math.round(H * (aspect > 0.9 ? 0.36 : 0.46));
    const back = document.createElement('canvas'); back.width = W; back.height = H; const g = back.getContext('2d');
    const fg = document.createElement('canvas'); fg.width = W; fg.height = H; const f = fg.getContext('2d');
    const r = seeded(kind.length * 131 + 7);
    const grad = (y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([t, c]) => gr.addColorStop(t, c)); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0); };
    const ridge = (y0, amp, col, fr, seed) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 2) g.lineTo(x, y0 - Math.abs(Math.sin(x * fr + seed)) * amp - Math.sin(x * fr * 2.7 + seed) * amp * 0.3); g.lineTo(W, H); g.fill(); };
    const floor = (top, c1, c2, c3, n = 0.3) => { for (let y = top; y < H; y++) { g.fillStyle = mix(c1, c2, (y - top) / (H - top)); g.fillRect(0, y, W, 1); } for (let i = 0; i < W * (H - top) * n / 40; i++) { const y = top + Math.pow(r(), 0.8) * (H - top), s = 1 + (y - top) / (H - top) * 3; g.fillStyle = r() < 0.5 ? c3 : lighten(mix(c1, c2, (y - top) / (H - top)), 0.12); g.fillRect(r() * W, y, s, Math.max(1, s * 0.5)); } };
    const palm = (x, y, s) => { g.fillStyle = '#8a5a2a'; for (let i = 0; i < 26 * s; i++) g.fillRect(x + Math.sin(i * 0.12) * 3 * s, y - i, 3 * s, 1); const tx = x + Math.sin(26 * s * 0.12) * 3 * s, ty = y - 26 * s; g.fillStyle = '#2a8a3a'; for (const a of [-2.6, -0.4, -1.9, -1.2, 2.5, 0.5]) for (let i = 0; i < 14 * s; i++) { const t = i / (14 * s); g.fillRect(tx + Math.cos(a) * i, ty + Math.sin(a) * i + t * t * 6 * s, 2 * s, 2 * s); } };
    let anim = null;
    switch (kind) {
      case 'isles': case 'sunisle': {
        const dusk = kind === 'isles' && F('dusk');
        if (kind === 'sunisle') grad(0, hz, [[0, '#ffb040'], [0.6, '#ffe8a0'], [1, '#fff8e0']]);
        else if (dusk) grad(0, hz, [[0, '#3a4a9a'], [0.5, '#e88a7a'], [1, '#ffd8a0']]);
        else grad(0, hz, [[0, '#2a90e8'], [0.7, '#bfe8ff'], [1, '#fff4d0']]);
        g.fillStyle = kind === 'sunisle' ? 'rgba(255,255,230,.95)' : dusk ? 'rgba(255,190,120,.9)' : 'rgba(255,255,220,.9)';
        g.beginPath(); g.arc(W * 0.78, dusk ? hz * 0.85 : hz * 0.22, kind === 'sunisle' ? 22 : 14, 0, TAU); g.fill();
        if (!dusk) for (let i = 0; i < 6; i++) { const x = r() * W, y = 8 + r() * hz * 0.4; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x, y, 18, 3); g.fillRect(x + 4, y - 2, 10, 2); }
        g.fillStyle = kind === 'sunisle' ? '#4a90c8' : dusk ? '#3a5a9a' : '#2f78d4'; g.fillRect(0, hz - 14, W, 16);
        g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 30; i++) g.fillRect(r() * W, hz - 12 + r() * 12, 4 + r() * 6, 1);
        floor(hz + 2, kind === 'sunisle' ? '#f0c878' : '#f0dca0', kind === 'sunisle' ? '#d89a48' : '#d8b878', kind === 'sunisle' ? '#c88a40' : '#c8a868', 0.5);
        for (const [x, s] of [[18, 1.1], [W - 30, 1.3], [W * 0.62, 0.7]]) palm(x, hz + 6 + s * 4, s);
        anim = kind === 'sunisle' ? 'heat' : 'waves';
        break;
      }
      case 'coral': {
        grad(0, H, [[0, '#0a2a3a'], [0.5, '#145a6a'], [1, '#2a8a8a']]);
        for (let i = 0; i < 9; i++) { const x = r() * W; g.fillStyle = 'rgba(160,240,255,.08)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 30, 0); g.lineTo(x + 60 + r() * 40, hz + 20); g.lineTo(x + 20, hz + 20); g.fill(); }
        ridge(hz + 4, 14, '#0e3a48', 0.03, 1);
        const coral = (x, y, s, col) => { g.strokeStyle = col; g.lineWidth = 2 * s; const br = (x0, y0, a, l, d) => { const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); if (d > 0) { br(x1, y1, a - 0.5, l * 0.7, d - 1); br(x1, y1, a + 0.45, l * 0.7, d - 1); } }; br(x, y, -Math.PI / 2, 10 * s, 3); };
        for (let i = 0; i < 12; i++) coral(r() * W, hz + 8 + r() * 6, 0.7 + r() * 0.5, pick(['#ff7a8a', '#ffa860', '#e860c0', '#ff9ab0']));
        floor(hz + 10, '#3a9a8a', '#1a5a5a', '#5ac0a8', 0.5);
        for (let i = 0; i < 18; i++) { g.fillStyle = pick(['#ffe0c0', '#ffffff', '#ffb0c8']); g.fillRect(r() * W, hz + 14 + r() * (H - hz - 14), 2, 1); }
        f.fillStyle = '#ff6a8a'; for (const x of [6, W - 20]) for (let i = 0; i < 4; i++) f.fillRect(x + i * 4, H - 10 - i * 3, 3, 10 + i * 3);
        anim = 'sparkle';
        break;
      }
      case 'mist': {
        grad(0, H, [[0, '#1a2a24'], [0.5, '#3a5048'], [1, '#2a3a30']]);
        for (let k = 0; k < 3; k++) for (let i = 0; i < 18; i++) { const x = i * 20 + r() * 12 + k * 7, h = 50 + r() * 40 - k * 10; g.fillStyle = ['#22382c', '#1a2e24', '#14241c'][k]; g.fillRect(x, hz - h + k * 8, 6 + k * 2, h + 20); g.beginPath(); g.arc(x + 3, hz - h + k * 8, 12 + k * 3, 0, TAU); g.fill(); }
        floor(hz + 8, '#3a5a3a', '#203a24', '#4a6a40', 0.5);
        g.fillStyle = 'rgba(220,230,240,.12)'; for (let i = 0; i < 5; i++) g.fillRect(0, hz - 30 + i * 14, W, 6);
        anim = 'mist';
        break;
      }
      case 'sun': {
        grad(0, H, [[0, '#fff4d0'], [0.5, '#ffd890'], [1, '#e8a850']]);
        g.fillStyle = 'rgba(255,250,220,.9)'; g.beginPath(); g.arc(W / 2, hz * 0.45, 26, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,200,80,.6)'; g.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * 30, hz * 0.45 + Math.sin(a) * 30); g.lineTo(W / 2 + Math.cos(a) * 44, hz * 0.45 + Math.sin(a) * 44); g.stroke(); }
        for (let i = 0; i < 5; i++) { const x = (i + 0.5) * W / 5 - 8; g.fillStyle = '#f4e8c8'; g.fillRect(x, hz - 64, 16, 72); g.fillStyle = '#fffaf0'; g.fillRect(x + 2, hz - 64, 3, 72); g.fillStyle = '#c8a050'; g.fillRect(x + 12, hz - 64, 4, 72); g.fillStyle = '#e0b050'; g.fillRect(x - 2, hz - 68, 20, 5); g.fillRect(x - 2, hz + 6, 20, 4); }
        floor(hz + 10, '#f0e0c0', '#c8a870', '#e8c070', 0.35);
        g.strokeStyle = 'rgba(200,150,60,.45)'; for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(W / 2 + i * 14, hz + 10); g.lineTo(W / 2 + i * 70, H); g.stroke(); }
        anim = 'embers';
        break;
      }
      case 'abyss': {
        grad(0, H, [[0, '#02060f'], [0.6, '#0a1a3a'], [1, '#142a4a']]);
        for (let i = 0; i < 40; i++) { g.fillStyle = pick(['#40e0ff', '#8a6af0', '#a8f0d8']); g.globalAlpha = 0.3 + r() * 0.5; g.fillRect(r() * W, r() * hz, 1, 1); } g.globalAlpha = 1;
        ridge(hz + 2, 18, '#081428', 0.025, 2);
        floor(hz + 8, '#1a3a5a', '#0a1a30', '#2a5a7a', 0.4);
        anim = 'sparkle';
        break;
      }
    }
    let fy0 = H, fy1 = 0; { const d = f.getImageData(0, 0, W, H).data; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]) { if (y < fy0) fy0 = y; fy1 = y + 1; break; } }
    return (this.cache[key] = { W, H, hz, back, fg, anim, fy0, fy1 });
  };
}
