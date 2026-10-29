// 燼燈 · 世界資料
// 整個世界是一張大格子地圖（一格 32px）。地圖切成 24×14 格的「房格」，每個房間佔一個或多個房格。
// 房間先挖空內部（留 1 格牆），再用下面的小工具在裡面擺地形和東西。座標都是「房間內」的格子座標。
(() => {
'use strict';
const EM = window.EM = window.EM || {};
const T = EM.T = 32, CW = EM.CW = 24, CH = EM.CH = 14;
const TL = EM.TL = { AIR: 0, ROCK: 1, PLAT: 2, SPIKE: 3, BREAK: 4, LAVA: 5, WATER: 6, SHROOM: 7, CRUMB: 8, GATE: 9, SIGIL: 10 };

// 區域：名稱、配色、黑暗程度
EM.AREAS = {
  A: { name: '荒廢入口', en: 'THE FALLEN GATE', sky: ['#070a14', '#121a30', '#1d2846'], rock: '#141a2a', rock2: '#0b0f1a', rim: '#7f9cd8', glow: [140, 170, 255], dark: 0.52, fog: 'rgba(90,120,200,.06)', music: 0 },
  B: { name: '菌光洞窟', en: 'GLOWSPORE HOLLOW', sky: ['#04100f', '#0a2421', '#123a33'], rock: '#0f1f1d', rock2: '#081312', rim: '#4fe0c0', glow: [80, 240, 200], dark: 0.5, fog: 'rgba(60,220,180,.05)', music: 1 },
  C: { name: '沉沒水道', en: 'SUNKEN AQUEDUCT', sky: ['#040a16', '#0b1d38', '#143058'], rock: '#101a2c', rock2: '#080e1a', rim: '#6cb8ff', glow: [90, 170, 255], dark: 0.5, fog: 'rgba(80,160,255,.06)', music: 2 },
  D: { name: '熔爐深處', en: 'THE DEEP FORGE', sky: ['#140604', '#2a0e08', '#40160b'], rock: '#1d1210', rock2: '#120a08', rim: '#ff8a4a', glow: [255, 140, 70], dark: 0.44, fog: 'rgba(255,120,60,.05)', music: 3 },
  T: { name: '空殼王座', en: 'THRONE OF THE HOLLOW', sky: ['#0a0612', '#1a1028', '#2a1840'], rock: '#18121f', rock2: '#0e0a14', rim: '#c79bff', glow: [190, 140, 255], dark: 0.55, fog: 'rgba(180,140,255,.05)', music: 4 },
};

EM.buildWorld = function () {
  const GW = 9, GH = 8, W = GW * CW, H = GH * CH;
  const grid = new Uint8Array(W * H).fill(TL.ROCK);
  const roomOf = new Int16Array(W * H).fill(-1);
  const rooms = [];
  const E = { enemies: [], benches: [], items: [], tablets: [], plats: [], crushers: [], jets: [], bosses: [], gates: [], decor: [], hints: [], spawn: null };
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) grid[y * W + x] = t; };
  const fillA = (x0, y0, x1, y1, t) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) set(x, y, t); };

  function room(id, cx, cy, cw, ch, area, name, build) {
    const x0 = cx * CW, y0 = cy * CH, w = cw * CW, h = ch * CH;
    const R = { id, idx: rooms.length, area, name, x: x0, y: y0, w, h, cx, cy, cw, ch };
    rooms.push(R);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) roomOf[y * W + x] = R.idx;
    fillA(x0 + 1, y0 + 1, x0 + w - 2, y0 + h - 2, TL.AIR);
    const ax = x => x0 + x, ay = y => y0 + y;
    const px = x => (x0 + x) * T + T / 2, py = y => (y0 + y + 1) * T;   // 站在 (x,y) 這格上：腳底在這格的底
    R.fill = (a, b, c, d, t = TL.ROCK) => fillA(ax(a), ay(b), ax(c), ay(d), t);
    R.set = (a, b, t) => set(ax(a), ay(b), t);
    R.floor = (y) => fillA(ax(1), ay(y), ax(w - 2), ay(h - 2), TL.ROCK);
    R.plat = (a, c, y) => fillA(ax(a), ay(y), ax(c), ay(y), TL.PLAT);
    R.ladder = (a, c, yTop, yBot) => { for (let y = yBot; y >= yTop; y -= 2) R.plat(a, c, y); };
    // 門：在自己的牆和隔壁房間的牆一起挖洞
    R.door = (side, a, size = 3, t = TL.AIR) => {
      for (let k = 0; k < size; k++) {
        if (side === 'E') { set(ax(w - 1), ay(a + k), t); set(ax(w), ay(a + k), t); }
        if (side === 'W') { set(ax(0), ay(a + k), t); set(ax(-1), ay(a + k), t); }
        if (side === 'S') { set(ax(a + k), ay(h - 2), t); set(ax(a + k), ay(h - 1), t); set(ax(a + k), ay(h), t); }
      }
    };
    // 頭目房的鐵柵：entry＝戰鬥中關起來；exit＝打倒頭目才開
    R.gate = (side, a, size, kind) => {
      R.door(side, a, size, TL.GATE);
      const tiles = [];
      for (let k = 0; k < size; k++) {
        if (side === 'E') tiles.push([ax(w - 1), ay(a + k)], [ax(w), ay(a + k)]);
        if (side === 'W') tiles.push([ax(0), ay(a + k)], [ax(-1), ay(a + k)]);
      }
      E.gates.push({ room: R.idx, kind, tiles });
    };
    R.gateLine = (x, yTop, yBot, kind) => {
      const tiles = [];
      for (let y = yTop; y <= yBot; y++) { set(ax(x), ay(y), TL.GATE); tiles.push([ax(x), ay(y)]); }
      E.gates.push({ room: R.idx, kind, tiles });
    };
    R.enemy = (type, x, y, opt = {}) => E.enemies.push({ type, x: px(x), y: py(y), room: R.idx, ...opt });
    R.bench = (x, y) => E.benches.push({ id: `bench_${id}`, x: px(x), y: py(y), room: R.idx });
    R.item = (kind, iid, x, y) => E.items.push({ kind, id: iid, x: px(x), y: py(y) - 18, room: R.idx });
    R.tablet = (x, y, text) => E.tablets.push({ x: px(x), y: py(y), text, room: R.idx });
    R.hint = (x, y, text) => E.hints.push({ x: px(x), y: py(y) - 60, text, room: R.idx });
    R.mover = (x0p, y0p, x1p, y1p, wt, speed = 70) => E.plats.push({ x0: ax(x0p) * T, y0: ay(y0p) * T, x1: ax(x1p) * T, y1: ay(y1p) * T, w: wt * T, h: 12, speed, room: R.idx });
    R.crusher = (x, yTop, yBot, wt, delay = 0) => E.crushers.push({ x: ax(x) * T, yTop: ay(yTop) * T, yBot: ay(yBot + 1) * T, w: wt * T, h: 2 * T, delay, room: R.idx });
    R.jet = (x, y, period = 2.4, offset = 0) => E.jets.push({ x: ax(x) * T, y: ay(y) * T, period, offset, room: R.idx });
    R.boss = (type, x, y, opt = {}) => E.bosses.push({ type, x: px(x), y: py(y), room: R.idx, ...opt });
    R.decor = (kind, x, y, opt = {}) => E.decor.push({ kind, x: px(x), y: py(y), room: R.idx, ...opt });
    R.spawn = (x, y) => { E.spawn = { x: px(x), y: py(y), room: R.idx }; };
    build(R);
    return R;
  }

  // ════════════ 荒廢入口 ════════════
  room('A1', 0, 0, 1, 1, 'A', '墜落之井', R => {
    R.floor(12); R.fill(8, 11, 9, 11); R.plat(16, 20, 8);
    R.fill(1, 1, 4, 3); R.fill(19, 1, 22, 2);
    R.spawn(3, 11);
    R.bench(13, 11);
    R.tablet(6, 11, '這裡曾是灰燼城的入口。\n最後一個守燈人提著最後一盞燼燈，從井口墜了下來。\n他知道自己要去哪裡：城的最深處，火的心臟。');
    R.hint(3, 11, '← → 移動　Z 跳　X 攻擊');
    R.hint(13, 11, '在篝火旁按 ↑ 休息、存檔');
    R.decor('chain', 6, 4); R.decor('chain', 18, 5);
    R.door('E', 9);
  });
  room('A2', 1, 0, 2, 1, 'A', '破碎長廊', R => {
    R.floor(12);
    R.fill(40, 9, 43, 12); R.fill(44, 7, 46, 12); R.plat(36, 38, 10);
    R.fill(10, 1, 12, 2); R.fill(26, 1, 27, 3); R.fill(33, 1, 35, 1);
    R.door('S', 30); // 掉進墓穴的洞
    R.enemy('crawler', 12, 11); R.enemy('crawler', 24, 11); R.enemy('moth', 35, 6);
    R.tablet(19, 11, '國王說：「火是王國的心臟。\n只要火不熄，我們就永遠不會死。」\n他說對了一半。');
    R.hint(30, 9, '↓＋Z 可以往下穿過薄平台');
    R.decor('arch', 6, 11); R.decor('arch', 22, 11); R.decor('chain', 16, 4);
    R.door('E', 4);
  });
  room('A3', 3, 0, 1, 2, 'A', '鐘塔', R => {
    R.floor(26);
    R.fill(1, 7, 5, 7);
    for (const y of [24, 20, 16, 12, 8]) R.plat(7, 10, y);
    for (const y of [22, 18, 14, 10]) R.plat(2, 5, y);
    R.fill(17, 4, 19, 21);   // 中間的柱子：右邊是只能蹬牆爬上去的窄井
    R.item('life', 'life_A3', 21, 2);
    R.bench(13, 25);
    R.enemy('spitter', 3, 13);
    R.decor('bell', 12, 5); R.decor('chain', 12, 2);
    R.door('W', 23); R.door('E', 23);
  });
  room('A4', 4, 0, 1, 2, 'A', '斷橋', R => {
    R.floor(26);
    R.fill(8, 10, 20, 10); R.set(7, 10, TL.SPIKE); R.set(21, 10, TL.SPIKE);
    R.fill(1, 4, 1, 15, TL.SPIKE); R.fill(22, 4, 22, 15, TL.SPIKE);
    R.plat(9, 12, 24); R.plat(3, 6, 22); R.plat(9, 12, 20); R.plat(3, 6, 18); R.plat(9, 12, 16); R.plat(2, 5, 13);
    R.item('flask', 'flask_A4', 16, 9);
    R.tablet(11, 9, '橋斷的那天，城裡的鐘一起響了七次。\n之後再也沒有人聽過鐘聲。');
    R.enemy('crawler', 18, 25); R.enemy('moth', 14, 19);
    R.decor('chain', 9, 4); R.decor('chain', 19, 6);
  });
  room('A5', 1, 1, 2, 1, 'A', '墓穴', R => {
    R.floor(12);
    R.fill(8, 10, 10, 11); R.fill(20, 10, 22, 11); R.fill(38, 10, 40, 11);
    R.ladder(30, 32, 0, 10);
    R.enemy('crawler', 14, 11); R.enemy('crawler', 26, 11); R.enemy('spitter', 21, 9); R.enemy('moth', 36, 5);
    R.tablet(4, 11, '墓穴裡沒有屍骨。\n王把所有的靈魂都送進了爐心，\n只留下名字刻在牆上。');
    R.decor('arch', 15, 11); R.decor('arch', 34, 11);
    R.door('W', 9); R.door('E', 9);
  });
  room('A6', 0, 1, 1, 2, 'A', '深井', R => {
    R.floor(26);
    R.fill(16, 12, 22, 12);
    R.plat(11, 15, 14); R.plat(4, 8, 16); R.plat(11, 15, 18); R.plat(4, 8, 20); R.plat(11, 15, 22); R.plat(4, 8, 24);
    R.bench(16, 25);
    R.enemy('moth', 8, 6); R.enemy('moth', 14, 19);
    R.decor('chain', 3, 3); R.decor('chain', 9, 2);
  });
  room('G1', 1, 2, 2, 1, 'A', '守門者大廳', R => {
    R.floor(12);
    R.plat(8, 12, 8); R.plat(35, 39, 8);
    R.gate('W', 9, 3, 'entry'); R.gate('E', 9, 3, 'exit');
    R.boss('knight', 28, 11);
    R.decor('banner', 6, 4); R.decor('banner', 41, 4); R.decor('banner', 24, 3);
  });
  room('A7', 3, 2, 2, 1, 'A', '裂谷', R => {
    R.floor(12);
    R.fill(9, 12, 14, 12, TL.AIR); R.fill(9, 13, 14, 13, TL.SPIKE);   // 6 格寬的刺坑：要衝刺才過得去
    R.door('S', 19, 2);
    R.fill(40, 5, 46, 12);    // 高牆：要蹬牆跳
    R.enemy('crawler', 4, 11); R.enemy('charger', 30, 11); R.enemy('moth', 24, 5);
    R.tablet(5, 11, '守門的騎士至今仍在等候命令。\n沒有人告訴他，王國已經不在了。');
    R.hint(11, 9, '按 C 衝刺');
    R.decor('arch', 28, 11); R.decor('chain', 34, 3);
    R.door('E', 2);
  });

  // ════════════ 菌光洞窟 ════════════
  room('B1', 0, 3, 2, 1, 'B', '孢子林', R => {
    R.floor(12);
    R.fill(1, 1, 5, 8); R.fill(5, 9, 5, 11, TL.BREAK);
    R.item('life', 'life_B1', 3, 11);
    R.door('S', 12);
    R.set(20, 12, TL.SHROOM); R.set(21, 12, TL.SHROOM);
    R.fill(24, 6, 34, 6);
    R.enemy('hopper', 9, 11); R.enemy('hopper', 30, 11); R.enemy('spitter', 28, 5); R.enemy('moth', 16, 4); R.enemy('moth', 40, 6);
    R.tablet(32, 5, '菌類長在燒不完的灰上。\n它們記得每一個睡著的人做過的夢。');
    for (const [x, y] of [[8, 11], [17, 11], [26, 5], [37, 11], [44, 11]]) R.decor('fungus', x, y);
    R.door('E', 9);
  });
  room('B2', 2, 3, 2, 1, 'B', '菌光入口', R => {
    R.floor(12);
    R.ladder(43, 44, 0, 10);
    R.door('S', 10);
    R.set(26, 12, TL.SHROOM); R.set(27, 12, TL.SHROOM);
    R.fill(30, 6, 38, 6);
    R.enemy('hopper', 18, 11); R.enemy('hopper', 34, 11); R.enemy('moth', 22, 5);
    R.tablet(36, 5, '洞窟深處有菌后的巢。\n她不吃東西，她只是一直在長。');
    R.hint(26, 9, '踩菌菇可以彈得很高');
    for (const [x, y] of [[4, 11], [15, 11], [31, 5], [40, 11]]) R.decor('fungus', x, y);
  });
  room('B3', 4, 3, 1, 2, 'B', '菌后巢穴', R => {
    R.floor(26);
    R.fill(1, 12, 5, 12);
    R.plat(3, 7, 21); R.plat(16, 20, 21); R.plat(9, 14, 17);
    R.gate('W', 9, 3, 'entry'); R.gate('E', 9, 3, 'exit');
    R.boss('matriarch', 12, 25);
    for (const [x, y] of [[2, 25], [21, 25], [12, 16]]) R.decor('fungus', x, y);
  });
  room('B4', 0, 4, 1, 1, 'B', '腐根深處', R => {
    R.floor(12);
    R.ladder(12, 14, 0, 10);
    R.bench(5, 11);
    R.tablet(19, 11, '腐根之下，菌后用孢子織了一張床，\n等待永遠不會醒來的孩子。');
    R.decor('fungus', 9, 11); R.decor('fungus', 17, 11); R.decor('root', 4, 2); R.decor('root', 19, 1);
    R.door('E', 9);
  });
  room('B5', 1, 4, 2, 1, 'B', '菌絲迴廊', R => {
    R.floor(12);
    R.fill(8, 12, 13, 12, TL.AIR); R.fill(8, 13, 13, 13, TL.SPIKE);
    R.fill(27, 12, 32, 12, TL.AIR); R.fill(27, 13, 32, 13, TL.SPIKE);
    R.ladder(34, 36, 0, 10);
    R.door('S', 20);
    R.enemy('crawler', 17, 11); R.enemy('crawler', 41, 11); R.enemy('moth', 10, 6); R.enemy('moth', 30, 5);
    for (const [x, y] of [[3, 11], [16, 11], [24, 11], [44, 11]]) R.decor('fungus', x, y);
  });
  room('B6', 1, 5, 2, 1, 'B', '古老水管', R => {
    R.floor(12);
    R.ladder(20, 22, 0, 10);
    R.fill(3, 12, 15, 12, TL.SPIKE);
    for (const x of [13, 10, 7, 4]) R.fill(x, 9, x + 1, 9, TL.CRUMB);
    R.item('flask', 'flask_B6', 2, 11);
    R.enemy('spitter', 34, 11); R.enemy('spitter', 43, 11);
    R.tablet(38, 11, '水管通往城外的海。\n曾經有人試著逃走，\n但水總會把你帶回來。');
    R.decor('pipe', 28, 4); R.decor('pipe', 45, 3);
  });

  // ════════════ 沉沒水道 ════════════
  room('C3', 5, 3, 1, 1, 'C', '水門', R => {
    R.floor(12);
    R.ladder(4, 6, 0, 10);
    R.door('S', 16);
    R.bench(10, 11);
    R.tablet(14, 11, '水門關上之後，\n城裡的人學會了在黑暗裡呼吸。');
    R.decor('pipe', 20, 3);
    R.door('E', 9);
  });
  room('C1', 5, 2, 2, 1, 'C', '蓄水上層', R => {
    R.floor(12);
    R.fill(1, 5, 6, 5);
    R.door('S', 4);
    R.fill(18, 12, 27, 12, TL.AIR); R.fill(18, 13, 27, 13, TL.SPIKE);
    R.mover(18, 10, 26, 10, 2, 80);
    R.enemy('spitter', 10, 11); R.enemy('spitter', 36, 11); R.enemy('moth', 30, 6);
    R.tablet(41, 11, '蓄水池映出的天空是假的。\n真正的天空，已經三百年沒有人見過。');
    R.decor('arch', 14, 11); R.decor('arch', 33, 11); R.decor('waterfall', 22, 1);
    R.door('E', 9);
  });
  room('C4', 6, 3, 1, 1, 'C', '水車房', R => {
    R.floor(12);
    R.fill(5, 12, 18, 12, TL.AIR); R.fill(5, 13, 18, 13, TL.SPIKE);
    R.mover(5, 10, 11, 10, 2, 70); R.mover(16, 9, 12, 9, 2, 90); R.fill(20, 11, 22, 11);   // 東側小台階：從東邊回來也踩得上浮台
    R.enemy('moth', 9, 5); R.enemy('moth', 15, 4);
    R.decor('wheel', 12, 3);
    R.door('E', 9);
  });
  room('C2', 7, 2, 1, 2, 'C', '落水瀑布', R => {
    R.floor(26);
    R.fill(1, 12, 8, 12);
    R.fill(7, 23, 7, 25); R.fill(8, 22, 22, 25, TL.WATER);
    for (const [a, y] of [[3, 24], [9, 22], [3, 20], [9, 18], [3, 16], [9, 14]]) R.plat(a, a + 3, y);
    R.fill(1, 1, 1, 8, TL.SPIKE); R.fill(22, 1, 22, 21, TL.SPIKE);
    R.plat(2, 5, 8); R.fill(8, 4, 16, 4);
    R.item('life', 'life_C2', 12, 3);
    R.enemy('shield', 16, 21); R.enemy('moth', 14, 17);
    R.decor('waterfall', 19, 1);
    R.door('W', 23);
  });
  room('C5', 5, 4, 2, 1, 'C', '深潭', R => {
    R.fill(1, 7, 13, 12); R.fill(41, 7, 46, 12);
    R.fill(14, 7, 40, 12, TL.WATER);
    R.fill(14, 13, 40, 13);
    for (const y of [5, 3, 1]) R.plat(16, 18, y);
    R.set(16, -1, TL.PLAT); R.set(17, -1, TL.PLAT); R.set(18, -1, TL.PLAT);
    R.enemy('jelly', 22, 10); R.enemy('jelly', 30, 9); R.enemy('jelly', 36, 11); R.enemy('shield', 44, 6);
    R.hint(8, 6, '在水裡按 Z 往上游');
    R.decor('arch', 6, 6); R.decor('pipe', 30, 1);
    R.door('E', 4);
  });
  room('C6', 7, 4, 1, 2, 'C', '深淵', R => {
    R.floor(26);
    R.fill(1, 7, 5, 7);
    R.fill(1, 22, 22, 25, TL.WATER);
    R.plat(3, 7, 17); R.plat(16, 20, 17); R.plat(9, 14, 12);
    R.gate('W', 4, 3, 'entry'); R.gate('W', 23, 3, 'exit');
    R.boss('jelly', 12, 14);
    R.decor('waterfall', 4, 1); R.decor('waterfall', 19, 1);
  });
  room('C7', 6, 5, 1, 1, 'C', '排水口', R => {
    R.floor(12);
    R.fill(1, 8, 6, 12); R.fill(7, 9, 7, 11, TL.SPIKE);
    R.enemy('charger', 16, 11);
    R.tablet(12, 11, '再往下就是熔爐。\n守燈人的職責，是把火帶回它該去的地方。');
    R.hint(12, 8, '在空中再按一次 Z：二段跳');
    R.decor('pipe', 18, 2);
    R.door('W', 5);
  });

  // ════════════ 熔爐深處 ════════════
  room('D1', 4, 5, 2, 1, 'D', '熔爐入口', R => {
    R.floor(12);
    R.fill(38, 8, 46, 12);
    R.bench(43, 7);
    R.fill(10, 12, 14, 12, TL.LAVA); R.fill(22, 12, 28, 12, TL.LAVA);
    R.door('S', 32);
    R.jet(18, 11, 2.6, 0); R.jet(30, 11, 2.6, 1.3);
    R.enemy('charger', 17, 11); R.enemy('hopper', 6, 11);
    R.tablet(4, 11, '熔爐從不休息。\n它吃下的不只是煤，還有名字。');
    R.decor('gear', 8, 3); R.decor('gear', 30, 2); R.decor('chain', 20, 2);
  });
  room('D3', 5, 6, 2, 1, 'D', '鍛造廳', R => {
    R.floor(12);
    R.ladder(8, 10, 0, 10);
    R.crusher(20, 1, 10, 2, 0); R.crusher(26, 1, 10, 2, 0.9); R.crusher(32, 1, 10, 2, 1.8);
    R.jet(29, 11, 2.2, 0.6);
    R.item('life', 'life_D3', 42, 10);
    R.enemy('shield', 14, 11); R.enemy('moth', 40, 5);
    R.decor('gear', 24, 1); R.decor('furnace', 44, 11); R.decor('chain', 4, 2);
    R.door('W', 9);
  });
  room('D2', 2, 6, 3, 1, 'D', '熔渣河', R => {
    R.floor(12);
    R.fill(36, 12, 66, 12, TL.LAVA);
    R.mover(36, 10, 44, 10, 3, 80); R.mover(56, 9, 47, 9, 3, 90); R.mover(58, 10, 64, 10, 3, 70);
    R.bench(26, 11);
    R.door('S', 30, 3, TL.SIGIL);
    R.enemy('spitter', 12, 11); R.enemy('moth', 46, 5); R.enemy('moth', 60, 4);
    R.tablet(20, 11, '空殼之王仍坐在王座上。\n他守著那團火，就像守著自己最後一口氣。\n三個印記能打開王座之門。');
    R.decor('furnace', 6, 11); R.decor('chain', 40, 2); R.decor('gear', 52, 2);
  });
  room('T1', 3, 7, 3, 1, 'T', '空殼王座', R => {
    R.floor(12);
    R.ladder(6, 8, 0, 10);
    R.gateLine(16, 1, 11, 'entry');
    R.boss('king', 52, 11);
    R.decor('throne', 66, 11); R.decor('banner', 26, 3); R.decor('banner', 46, 3); R.decor('pillar', 20, 11); R.decor('pillar', 60, 11);
  });

  return { W, H, GW, GH, grid, roomOf, rooms, ...E };
};
})();
