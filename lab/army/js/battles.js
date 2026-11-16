// 戰役：地形＋兩邊的部隊。座標：藍軍在 +z，紅軍在 −z。n 是「高畫質」的人數，會依裝置縮小。
// behavior（電腦）：hold 守著、敵人靠近才衝；wait 等 waitT 秒再衝；advance 直接衝；flank 騎兵繞側邊打弓箭手
import { T } from './sim.js';
const S = (type, n, x, z, o = {}) => ({ type, n, x, z, ...o });

export const BATTLES = [
  {
    id: 'plain', name: '平原對決', icon: '⚔️',
    intro: '第一戰！兩邊都是劍盾兵。先點一隊（或按「全選」），再點地上讓他們走過去；拖一條線可以排成一橫排。準備好按「開戰」。',
    tip: '把三隊排成一直線，比較不會被包圍。',
    terrain: {},
    blue: [S(T.SWORD, 125, -26, 30), S(T.SWORD, 125, 0, 30), S(T.SWORD, 125, 26, 30)],
    red: [S(T.SWORD, 110, -26, -30, { behavior: 'wait', waitT: 4 }), S(T.SWORD, 110, 0, -30, { behavior: 'wait', waitT: 4 }), S(T.SWORD, 110, 26, -30, { behavior: 'wait', waitT: 4 })],
  },
  {
    id: 'hill', name: '弓箭手的山丘', icon: '🏹',
    intro: '敵人比較多！你的弓箭手站在山丘上，射得比較遠。讓劍盾兵在山腳擋住敵人，弓箭手一直射。',
    tip: '劍盾兵的盾牌可以擋一半的箭；站在高處的弓箭手射程多 25%。',
    terrain: { hills: [{ x: 0, z: 34, r: 34, h: 7 }] },
    blue: [S(T.ARCHER, 100, -18, 36), S(T.ARCHER, 100, 18, 36), S(T.SWORD, 110, -20, 14), S(T.SWORD, 110, 20, 14)],
    red: [-48, -24, 0, 24, 48].map((x) => S(T.SWORD, 76, x, -40, { behavior: 'wait', waitT: 3 })),
  },
  {
    id: 'river', name: '過河', icon: '🌉',
    intro: '敵人守在河對岸。走進河裡會變很慢，還會被弓箭射。中間有座橋，兩邊各有一個淺灘（走得比較快）。',
    tip: '騎兵從淺灘繞過去，打敵人的弓箭手！',
    terrain: { river: { z: 0, amp: 5, f: 0.03, w: 6, fords: [-70, 70], bridges: [0] } },
    blue: [S(T.SWORD, 110, -14, 32), S(T.SWORD, 110, 14, 32), S(T.ARCHER, 90, 0, 46), S(T.CAV, 60, -50, 40), S(T.CAV, 60, 50, 40)],
    red: [S(T.ARCHER, 90, -20, -20, { behavior: 'hold' }), S(T.ARCHER, 90, 20, -20, { behavior: 'hold' }), S(T.SWORD, 110, -12, -34, { behavior: 'hold' }), S(T.SWORD, 110, 12, -34, { behavior: 'hold' })],
  },
  {
    id: 'flank', name: '騎兵包抄', icon: '🐎',
    intro: '敵人有一整排弓箭手躲在後面。正面衝會被射成刺蝟，試試看讓騎兵從旁邊繞過去。',
    tip: '騎兵跑很快、衝鋒的第一下傷害有 2.5 倍，但不要讓他們一直跟劍盾兵纏鬥。',
    terrain: { hills: [{ x: -70, z: 0, r: 25, h: 4 }, { x: 70, z: 0, r: 25, h: 4 }] },
    blue: [S(T.SWORD, 110, -16, 30), S(T.SWORD, 110, 16, 30), S(T.CAV, 70, -60, 36), S(T.CAV, 70, 60, 36)],
    red: [S(T.ARCHER, 90, -30, -52, { behavior: 'hold' }), S(T.ARCHER, 90, 0, -54, { behavior: 'hold' }), S(T.ARCHER, 90, 30, -52, { behavior: 'hold' }),
      S(T.SWORD, 100, -20, -30, { behavior: 'wait', waitT: 10 }), S(T.SWORD, 100, 20, -30, { behavior: 'wait', waitT: 10 })],
  },
  {
    id: 'forest', name: '森林伏擊', icon: '🌲',
    intro: '敵人的弓箭手很多，還有騎兵會從旁邊繞過來。樹林可以擋掉一半的箭，但在裡面走得比較慢。',
    tip: '弓箭手躲進樹林，劍盾兵守在樹林前面。',
    terrain: { forests: [{ x: -42, z: 14, r: 18 }, { x: 42, z: 14, r: 18 }, { x: 0, z: -45, r: 12 }] },
    blue: [S(T.SWORD, 110, -20, 30), S(T.SWORD, 110, 0, 30), S(T.SWORD, 110, 20, 30), S(T.ARCHER, 90, -14, 44), S(T.ARCHER, 90, 14, 44)],
    red: [S(T.ARCHER, 58, -36, -36, { behavior: 'wait', waitT: 8 }), S(T.ARCHER, 58, -12, -38, { behavior: 'wait', waitT: 8 }), S(T.ARCHER, 58, 12, -38, { behavior: 'wait', waitT: 8 }), S(T.ARCHER, 58, 36, -36, { behavior: 'wait', waitT: 8 }),
      S(T.CAV, 25, -70, -30, { behavior: 'flank' }), S(T.CAV, 25, 70, -30, { behavior: 'flank' })],
  },
  {
    id: 'grand', name: '萬軍大決戰', icon: '🏰',
    intro: '最後一戰：兩邊加起來快三千人。弓箭手、劍盾兵、騎兵全部用上！',
    tip: '先用弓箭手消耗敵人，劍盾兵頂住，騎兵等敵人纏住了再從側面衝。',
    terrain: { hills: [{ x: -60, z: 40, r: 30, h: 6 }, { x: 60, z: -40, r: 30, h: 6 }], forests: [{ x: 75, z: 25, r: 16 }, { x: -78, z: -28, r: 16 }] },
    blue: [-60, -36, -12, 12, 36, 60].map((x) => S(T.SWORD, 140, x, 22)).concat([S(T.ARCHER, 120, -60, 42), S(T.ARCHER, 120, -20, 42), S(T.ARCHER, 120, 20, 42), S(T.CAV, 80, -90, 30), S(T.CAV, 80, 90, 30)]),
    red: [-72, -48, -24, 0, 24, 48, 72].map((x) => S(T.SWORD, 140, x, -24, { behavior: 'wait', waitT: 12 })).concat([S(T.ARCHER, 120, -40, -46, { behavior: 'hold' }), S(T.ARCHER, 120, 0, -48, { behavior: 'hold' }), S(T.ARCHER, 120, 40, -46, { behavior: 'hold' }),
      S(T.CAV, 80, -95, -30, { behavior: 'flank' }), S(T.CAV, 80, 95, -30, { behavior: 'flank' })]),
  },
];

// 自由對戰：每邊各種兵幾隊、哪種地形
export const FREE_TERRAINS = {
  plain: { name: '平原', def: {} },
  hills: { name: '山丘', def: { hills: [{ x: -50, z: 35, r: 30, h: 6 }, { x: 50, z: -35, r: 30, h: 6 }] } },
  river: { name: '河流', def: { river: { z: 0, amp: 5, f: 0.03, w: 6, fords: [-60, 60], bridges: [0] } } },
  forest: { name: '樹林', def: { forests: [{ x: -40, z: 0, r: 18 }, { x: 40, z: 0, r: 18 }] } },
};
export function freeBattle(cfg) {
  const side = (team, c) => {
    const out = [], z0 = team === 0 ? 1 : -1;
    const row = (type, k, z, n) => { for (let i = 0; i < k; i++) out.push(S(type, n, (i - (k - 1) / 2) * 26, z * z0, team === 1 ? { behavior: 'wait', waitT: 5 } : {})); };
    row(T.SWORD, c.sword, 26, 110); row(T.ARCHER, c.archer, 44, 100);
    for (let i = 0; i < c.cav; i++) out.push(S(T.CAV, 60, (i % 2 ? 1 : -1) * (75 + Math.floor(i / 2) * 18), 34 * z0, team === 1 ? { behavior: 'flank' } : {}));
    return out;
  };
  return { id: 'free', name: '自由對戰', icon: '🎲', intro: '自由對戰！排好隊形就按「開戰」。', tip: '', terrain: FREE_TERRAINS[cfg.terrain].def, blue: side(0, cfg.blue), red: side(1, cfg.red) };
}
