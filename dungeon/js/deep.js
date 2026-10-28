'use strict';
// 深淵地牢：第三輪——深淵下層（第 18–25 層）
// 擊敗深淵之王之後，可以選擇凱旋歸來，或是踏進王座後方的「深淵裂隙」繼續往下：
// 溺沒古城（18–21，淹水的廢墟、深水運河、海妖）→ 星骸虛空（22–24，漂浮在虛空中的石島與石橋）→ 終焉之心（25，真正的最終頭目）
// 新地形：深水（只有會游泳或會飛的才能進去）、虛空裂谷（掉下去就落到下一層）；擊退（撞牆、推進裂谷）

// ---------- 新地形 ----------
T.DEEP = 21; T.CHASM = 22;
TP[T.DEEP] = { walk: 0, op: 0, n: '深水', liquid: 1 };
TP[T.CHASM] = { walk: 0, op: 0, n: '虛空裂谷' };
const DEEP_LAST = 25;
const isWet = v => v === T.WATER || v === T.DEEP;

// ---------- 新生態區 ----------
BIOMES.push(
  { n: '溺沒古城', en: 'DROWNED CITY', from: 18, to: 21, gen: 'flooded', flavor: '裂隙的另一頭是一座沉入地底的古城，冰冷的海水淹過了街道與神殿。',
    pal: { bg: '#050c0e', floor: '#46605e', floor2: '#3e5654', line: '#2c4240', wall: '#1c3032', wallHi: '#3f6466', face: '#2a4446', faceLo: '#142426', deco: '#5fd0b0', deco2: '#d0fff0', light: '#5fe8d0', water: '#1f6a78', grass: '#3f7a5a' } },
  { n: '星骸虛空', en: 'STARFALL VOID', from: 22, to: 24, gen: 'islands', flavor: '腳下不再有大地。破碎的石島漂浮在星海之中，只靠古老的石橋相連。',
    pal: { bg: '#04030a', floor: '#58546e', floor2: '#4e4a64', line: '#36324c', wall: '#221e36', wallHi: '#524a7a', face: '#332c50', faceLo: '#18142c', deco: '#ffd98a', deco2: '#9ab8ff', light: '#a8b8ff', water: '#3a3a8a', grass: '#4a4a6a' } },
  { n: '終焉之心', en: 'HEART OF THE END', from: 25, to: 25, gen: 'abyss', flavor: '星光在這裡一顆顆熄滅。有什麼東西，正在虛空的正中央等著你。',
    pal: { bg: '#020104', floor: '#43303e', floor2: '#3a2a36', line: '#2a1c28', wall: '#1a0f18', wallHi: '#4a2a44', face: '#2c1a2a', faceLo: '#120a12', deco: '#ff5a6a', deco2: '#ffb0c0', light: '#ff6a8a', water: '#3a1a3a', grass: '#4a2a3a' } },
);

// ---------- 新怪物 ----------
Object.assign(MON, {
  drowned: { n: '溺魂', spr: 'drowned', hp: 64, atk: [8, 15], acc: 6, eva: 2, arm: 3, spd: 100, xp: 34, d: 18, dx: 21, verb: '抓', undead: 1, grab: 1, pack: [1, 2], d2: '淹死在古城裡的亡魂，被抓住會動作遲緩。' },
  merman: { n: '鮫人槍兵', spr: 'merman', hp: 58, atk: [9, 16], acc: 7, eva: 5, arm: 3, spd: 100, xp: 36, d: 18, dx: 22, verb: '刺', swim: 1, pack: [2, 3], d2: '成群巡邏的半魚人，能潛進深水，在水裡更難打中。' },
  eel: { n: '雷電鰻', spr: 'eel', hp: 40, atk: [7, 13], acc: 7, eva: 6, arm: 1, spd: 150, xp: 30, d: 18, dx: 21, verb: '電', aquatic: 1, swim: 1, shock: 1, d2: '只在水裡游動。站在水中被牠咬到會麻痺。' },
  siren: { n: '海妖歌者', spr: 'siren', hp: 44, atk: [4, 8], acc: 6, eva: 6, arm: 1, spd: 100, xp: 40, d: 19, dx: 22, verb: '抓', swim: 1, ranged: { r: 6, dmg: [7, 12], k: 'frost', v: '唱出蠱惑之歌', conf: 1, cd: 3 }, kite: 1, flee: 0.25, d2: '歌聲會讓人頭昏腦脹。' },
  fallen: { n: '墮落騎士', spr: 'fallen', hp: 92, atk: [12, 20], acc: 8, eva: 2, arm: 7, spd: 100, xp: 58, d: 20, dx: 25, verb: '斬', shield: 1, dash: 1, d2: '被深淵吞沒的騎士。盾牌擋下一半的遠程與法術傷害，會突然衝鋒。' },
  starmote: { n: '星屑精', spr: 'starmote', hp: 30, atk: [6, 10], acc: 6, eva: 8, arm: 0, spd: 100, xp: 34, d: 21, dx: 25, verb: '灼燒', fly: 1, burst: 1, kite: 1, pack: [2, 3], ranged: { r: 6, dmg: [8, 13], k: 'magic', v: '射出星光', cd: 2 }, d2: '墜落的星星碎片。被打倒時會爆炸。' },
  voidling: { n: '虛空行者', spr: 'voidling', hp: 66, atk: [10, 18], acc: 7, eva: 6, arm: 2, spd: 100, xp: 44, d: 22, dx: 25, verb: '撕', phase: 1, d2: '從虛空中滲出來的影子，會突然出現在你身邊。' },
  horror: { n: '觸手畸變', spr: 'horror', hp: 120, atk: [13, 22], acc: 6, eva: -1, arm: 4, spd: 75, xp: 60, d: 22, dx: 25, verb: '絞', regen: 3, sleepy: 0.7, d2: '長滿眼睛與觸手的肉塊，傷口會不斷癒合。' },
  tentacle: { n: '海妖觸手', spr: 'tentacle', hp: 34, atk: [6, 11], acc: 6, eva: 0, arm: 2, spd: 100, xp: 4, d: 99, verb: '纏', immobile: 1, swim: 1, d2: '從地板裂縫裡伸出來的觸手，不會移動。' },
  // 頭目
  kraken: { n: '沉淪海妖', spr: 'kraken', hp: 420, atk: [13, 22], acc: 7, eva: 2, arm: 5, spd: 100, xp: 320, d: 99, verb: '絞', boss: 1, swim: 1, summon: { t: 'tentacle', n: 2, cd: 7, atP: 1 }, ranged: { r: 7, dmg: [10, 16], k: 'frost', v: '噴出激流', push: 2, cd: 3 }, d2: '盤據古城水底的巨大海妖，觸手會從你腳邊冒出來。' },
  devourer: { n: '終焉吞噬者', spr: 'devourer', hp: 760, atk: [16, 26], acc: 8, eva: 3, arm: 5, spd: 100, xp: 0, d: 99, verb: '吞噬', boss: 1, final: 1, ranged: { r: 8, dmg: [12, 20], k: 'void', v: '放出終焉之光', cd: 3 }, summon: { t: 'voidling', n: 1, cd: 9 }, blink: 1, meteor: 1, d2: '吞噬一切光與星辰的存在，深淵真正的盡頭。' },
});
MON.mimic.dx = DEEP_LAST;
BOSS_FLOOR[21] = 'kraken'; BOSS_FLOOR[25] = 'devourer';

// ---------- 新道具 ----------
Object.assign(ITEMS, {
  voidblade: { c: 'weapon', n: '虛空之刃', spr: 'voidblade', dmg: [7, 17], acc: 1, d: 18, w: 4, price: 360 },
  starplate: { c: 'armor', n: '星辰鎧', spr: 'armor', arm: 8, eva: -2, d: 18, w: 3, price: 380, tint: '#8a86e0', look: 'plate' },
});
SPR.voidblade = { p: { w: '#f0d8ff', W: '#8a4ad0', g: '#ffd040', h: '#2a1a3a' }, m: [
  '.........www', '........wWWw', '.......wWWw.', '......wWWw..', '.....wWWw...', '....wWWw....',
  '.g.wWWw.....', '.ggWWw......', '..ggw.......', '.hhgg.......', 'hh..g.......', 'h...........'] };
WPN_LOOK.voidblade = 'voidblade';

// ---------- 大型擺設 ----------
Object.assign(PROPS, {
  coral: { n: '發光珊瑚', deco: 1, light: '90,230,210', d: '長在古城石柱上的珊瑚，在黑暗的水裡發著光。' },
  starstone: { n: '墜星石', deco: 1, light: '255,215,140', d: '從天上掉下來的星星，還帶著微微的溫度。' },
  shell: { n: '巨蚌', snd: 'pot' },
  orb: { n: '星塵甕', snd: 'pot' },
});
DECO_BY_BIOME.push('coral', 'starstone', 'brazier');
PROP_BY_BIOME.push(['shell', 'shell', 'urn', 'crate'], ['orb', 'orb', 'bones'], ['bones', 'orb']);

// ---------- 怪物與擺設的像素圖 ----------
Object.assign(MSPR, {
  drowned(P, f) {
    biped(P, { size: 'med', robe: 1, body: '#2f5552', trim: '#5fd0b0', skin: '#9ec0b0', arm: '#2f5552',
      back(P, ux, uy) { P.l(9 + ux, 6 + uy, 6 + ux, 16 + uy, '#2f6a4a'); P.l(8 + ux, 7 + uy, 5 + ux, 13 + uy, '#3f8a5a'); },
      torso(P, x, y) { P.r(x + 1, y + 2, 6, 1, '#1f3a38'); P.r(x + 2, y + 4, 4, 1, '#1f3a38'); P.p(x + 6, y + 7, '#5fd0b0'); },
      head(P, x, y, D, f, a) { P.e(x + 3.5, y + 3.6, 3.6, 3.7, '#9ec0b0'); P.r(x + 2, y + 2, 2, 2, '#0a1414'); P.r(x + 5, y + 2, 2, 2, '#0a1414'); P.p(x + 2, y + 2, '#7fffe0'); P.p(x + 5, y + 2, '#7fffe0'); P.r(x + 3, y + 5, 3, 1 + (a ? 1 : 0), '#1a2a2a');
        P.r(x - 1, y - 1, 9, 2, '#2f6a4a'); P.r(x - 1, y, 2, 6, '#2f6a4a'); P.r(x + 7, y, 1, 4, '#3f8a5a'); P.p(x + 1, y + 7, '#5fd0b0'); },
    }, f);
    if (f.i) P.p(17, 20, '#8ae8ff');
  },
  merman(P, f) {
    biped(P, { size: 'med', body: '#2f7a7a', leg: '#2a6a6a', boot: '#1a4a4a', skin: '#5ab0a0', arm: '#5ab0a0', belt: '#c8a040', wpn: 'spear', wo: { pal: { blade: '#d8f0ff', wood: '#5a7a6a', woodD: '#3a5a4a' } },
      torso(P, x, y) { for (let j = 1; j < 6; j += 2) for (let i = (j >> 1) % 2; i < 8; i += 2) P.p(x + i, y + j, '#4ab0a0'); P.r(x + 2, y, 4, 1, '#c8a040'); },
      head(P, x, y, D, f, a) { P.e(x + 3.5, y + 3.8, 3.8, 3.6, '#5ab0a0'); P.poly([[x - 1, y + 2], [x + 3, y - 4], [x + 5, y - 1], [x + 7, y - 3], [x + 7, y + 2]], '#e05a4a'); P.p(x + 5, y + 3, '#ffe04a'); P.p(x + 6, y + 3, '#1a1a1a'); P.r(x + 4, y + 6, 4, 1, a === 2 ? '#1a1010' : '#2a6a6a'); P.p(x, y + 4, '#3a8a8a'); P.p(x - 1, y + 5, '#3a8a8a'); },
    }, f);
  },
  eel(P, f) {
    const a = f.fr === 'atk' ? f.i + 1 : 0, ph = f.i ? 1 : 0;
    const pts = []; for (let i = 0; i <= 8; i++) pts.push([3 + i * 2.1 + (a === 2 ? 1 : 0) * i / 8, 17 + Math.sin(i * 0.9 + ph * 1.6) * 2.4 - i * 0.6]);
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; P.l(x0, y0, x1, y1, '#1a3a6a', 4); }
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; P.l(x0, y0 - 1, x1, y1 - 1, '#3a6ab0', 2); if (i % 2) P.p(x0, y0, '#ffe04a'); }
    const [hx, hy] = pts[8];
    P.e(hx + 1, hy, 3.2, 2.6, '#2a5aa0'); P.p(hx + 2, hy - 1, '#ffe04a'); P.r(hx + 2, hy + 1, 3, 1, a ? '#ffffff' : '#0a1a3a');
    P.poly([[3, 15], [0, 12], [1, 18]], '#3a6ab0');
    if (a) { P.p(hx + 5, hy - 3, '#fff6a0'); P.p(hx + 6, hy - 1, '#fff6a0'); P.p(hx + 4, hy - 4, '#ffffff'); }
    P.e(12, 21, 8, 1.2, 'rgba(120,220,255,.35)');
  },
  siren(P, f) {
    const b = f.fr === 'idle' && f.i ? 1 : 0;
    biped(P, { size: 'med', robe: 1, body: '#3a7aa0', trim: '#e8f8ff', skin: '#c8e8e0', arm: '#c8e8e0', wpn: 'orb', wo: { orb: '#e8f8ff' },
      back(P, ux, uy) { P.poly([[8 + ux, 4 + uy], [6 + ux, 18], [9 + ux, 16], [11 + ux, 6 + uy]], '#5fd0b0'); },
      torso(P, x, y) { P.e(x + 2, y + 1, 1.6, 1.2, '#f0b0c0'); P.e(x + 6, y + 1, 1.6, 1.2, '#f0b0c0'); P.r(x + 1, y + 4, 6, 1, '#e8f8ff'); },
      head(P, x, y, D, f, a) { P.e(x + 3.5, y + 3.6, 3.5, 3.6, '#c8e8e0'); P.r(x - 1, y - 1, 9, 3, '#5fd0b0'); P.r(x - 1, y + 1, 2, 7, '#5fd0b0'); P.p(x + 5, y + 3, '#2a2a6a'); P.p(x + 3, y + 3, '#2a2a6a'); P.r(x + 3, y + 5, 2, 1 + (a ? 1 : 0), '#a04a6a'); P.e(x + 6, y - 1, 1.4, 1.2, '#f0e0ff'); },
    }, f);
    if (f.fr === 'atk') { P.p(20, 6 - b, '#e8f8ff'); P.p(22, 4, '#bff0ff'); P.p(19, 3, '#bff0ff'); }
  },
  fallen(P, f) {
    biped(P, { size: 'big', body: '#3a3a4a', leg: '#2a2a36', boot: '#1a1a24', skin: '#5a5a6a', arm: '#3a3a4a', belt: '#7a2a3a', wpn: 'greatsword', wo: { pal: { blade: '#8a8aa0', bladeD: '#4a4a5a' } },
      back(P, ux, uy) { P.poly([[7 + ux, 9 + uy], [17 + ux, 9 + uy], [19, 21], [16, 19], [13, 21], [10, 19], [6, 21]], '#4a1a2a'); P.e(5 + ux, 14 + uy, 3.6, 5, '#2a2a36'); P.e(5 + ux, 14 + uy, 2.4, 3.6, '#5a2a4a'); P.p(5 + ux, 14 + uy, '#ff3a5a'); },
      torso(P, x, y) { P.r(x + 1, y + 1, 10, 1, '#5a5a6a'); P.r(x + 5, y + 2, 2, 5, '#5a5a6a'); P.p(x + 5, y + 3, '#ff3a5a'); },
      head(P, x, y, D, f, a) { P.e(x + 4.5, y + 4, 4.6, 4.2, '#4a4a5a'); P.r(x + 1, y + 4, 8, 1, '#0a0a10'); P.r(x + 5, y + 4, 3, 1, '#ff2a4a'); P.poly([[x + 1, y + 1], [x - 2, y - 3], [x + 3, y]], '#2a2a36'); P.poly([[x + 8, y + 1], [x + 11, y - 3], [x + 6, y]], '#2a2a36'); },
    }, f);
  },
  starmote(P, f) {
    const a = f.fr === 'atk' ? f.i + 1 : 0, s = 1 + (f.i ? 0.12 : 0) + a * 0.1, cx = 12, cy = 12;
    const pts = []; for (let i = 0; i < 10; i++) { const r = (i % 2 ? 3 : 7.5) * s, an = -Math.PI / 2 + i * Math.PI / 5 + (f.i ? 0.12 : 0); pts.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r]); }
    P.poly(pts, '#ffc84a'); P.e(cx, cy, 3.4 * s, 3.4 * s, '#fff0b0'); P.e(cx - 0.6, cy - 0.6, 1.6, 1.6, '#ffffff');
    P.p(cx - 1.5, cy, '#5a3a10'); P.p(cx + 1.5, cy, '#5a3a10');
    for (const [x, y] of [[3, 4], [21, 6], [4, 19], [20, 18]]) if ((x + y + f.i) % 2) P.p(x, y, '#ffe8a0');
  },
  voidling(P, f) {
    const fl = f.i, a = f.fr === 'atk' ? f.i + 1 : 0, ux = a === 2 ? 1 : a === 1 ? -1 : 0;
    P.poly([[8 + ux, 9], [16 + ux, 9], [18, 17], [16, 21 - fl], [13, 18], [10, 21 + fl - 1], [7, 17]], '#120c22');
    P.poly([[9 + ux, 10], [15 + ux, 10], [15, 16], [9, 16]], '#241a40');
    for (const [x, y] of [[10, 12], [14, 14], [12, 17], [11, 15], [15, 11]]) P.p(x + ux, y, (x + y + fl) % 3 ? '#9ab8ff' : '#ffffff');
    P.e(12.5 + ux, 6.5, 4, 4.2, '#120c22'); P.e(13 + ux, 7, 2.8, 2.6, '#06030c'); P.p(12 + ux, 7, '#c07aff'); P.p(14.5 + ux, 7, '#c07aff');
    const hx = a === 1 ? 12 : a === 2 ? 21 : 18, hy = a === 1 ? 6 : 12;
    P.l(15 + ux, 11, hx, hy, '#120c22', 2); P.l(hx, hy, hx + 2, hy - 2, '#c07aff'); P.l(hx, hy, hx + 2, hy + 1, '#c07aff');
    P.l(9 + ux, 11, 5 + ux, 15, '#120c22', 2); P.p(4 + ux, 16, '#c07aff');
  },
  horror(P, f) {
    const b = f.fr === 'idle' && f.i ? 1 : 0, a = f.fr === 'atk' ? f.i + 1 : 0, st = f.fr === 'walk' ? (f.i ? 1 : -1) : 0;
    for (const [x, k] of [[5, -1], [9, 1], [15, -1], [19, 1]]) P.l(x + 1, 16, x + (st * k > 0 ? 2 : -1), 22, '#7a3a6a', 2);
    P.l(4, 12, 0 - a, 6 + b, '#8a4a7a', 2); P.l(20, 12, 24 + a * 1.5, 7 - b, '#8a4a7a', 2);
    P.e(12, 13 + b * 0.5, 9, 7.5 - b * 0.5, '#8a4a7a'); P.e(12, 12 + b * 0.5, 7, 5.5, '#a85a8a');
    for (const [x, y, r] of [[9, 10, 1.8], [15, 11, 1.4], [12, 15, 1.2], [7, 14, 1], [17, 15, 1]]) { P.e(x, y + b * 0.5, r + 0.4, r + 0.3, '#f0e8d8'); P.p(x, y + b * 0.5, '#2a0a1a'); }
    P.r(9, 17 + b * 0.5, 7, 1 + (a ? 1 : 0), '#3a0a1a'); for (let x = 9; x < 16; x += 2) P.p(x, 17 + b * 0.5, '#f0e8d8');
  },
  tentacle(P, f) {
    const a = f.fr === 'atk' ? f.i + 1 : 0, w = f.i ? 1 : -1;
    P.e(12, 20, 7, 2.2, '#1f5a6a'); P.e(12, 20, 5, 1.4, '#2f8a9a');
    const pts = [[12, 20], [11 + w * 0.5, 16], [12 - w, 12], [13 + w * 0.5 + a, 8 - a], [14 + a * 2, 5 - a]];
    for (let i = 0; i < pts.length - 1; i++) P.l(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#5a3a7a', 4 - (i > 2 ? 1 : 0));
    for (let i = 0; i < pts.length - 1; i++) P.l(pts[i][0] + 1, pts[i][1], pts[i + 1][0] + 1, pts[i + 1][1], '#8a5aa8', 1);
    for (const [x, y] of pts.slice(1, 4)) P.p(x - 1, y, '#f0c8e0');
  },
  p_coral(P, f) { const g = f.i ? '#7ff0d8' : '#5fd0b0'; P.r(5, 19, 14, 3, '#2a4446'); P.r(5, 19, 14, 1, '#4a6a6a'); P.l(12, 19, 12, 9, '#c86a8a', 2); P.l(12, 13, 7, 8, '#c86a8a', 2); P.l(12, 15, 17, 7, '#c86a8a', 2); P.l(8, 9, 6, 5, '#e88aa8'); P.l(16, 8, 18, 4, '#e88aa8'); for (const [x, y] of [[6, 5], [18, 4], [12, 8], [9, 11], [15, 10]]) P.e(x, y, 1.3, 1.3, g); P.e(8, 21, 2, 1, g); },
  p_starstone(P, f) { const h = f.i ? '#fff4c0' : '#ffd98a'; P.e(12, 19, 8, 3, '#2a2440'); P.poly([[5, 19], [7, 12], [11, 9], [16, 10], [19, 15], [18, 19]], '#4a4466'); P.poly([[7, 13], [11, 10], [15, 11], [13, 15], [9, 16]], '#6a6490'); for (const [x, y] of [[10, 12], [14, 13], [12, 16], [16, 16]]) P.p(x, y, h); P.r(11, 13, 2, 2, h); P.p(4, 20, '#ffd98a'); P.p(20, 21, '#9ab8ff'); },
  p_shell(P) { P.e(12, 19, 8, 2.6, '#2a3a3a'); P.poly([[4, 19], [6, 12], [12, 9], [18, 12], [20, 19]], '#d8c8b8'); for (let x = 6; x < 19; x += 3) P.l(12, 19, x, 11, '#a89888'); P.r(4, 18, 16, 1, '#8a7a6a'); P.e(12, 18, 2, 1.2, '#f8f0ff'); },
  p_orb(P) { P.e(12, 20, 6, 2, '#1a1428'); P.e(12, 15, 6, 6, '#3a3460'); P.e(11, 14, 4.4, 4.4, '#5a5490'); P.r(9, 7, 6, 3, '#3a3460'); P.r(8, 6, 8, 1, '#9ab8ff'); P.p(10, 13, '#ffe8a0'); P.p(13, 16, '#ffffff'); P.p(14, 12, '#9ab8ff'); },
});
Object.assign(BSPR, {
  kraken: { w: 46, h: 40, draw(P, f, o) {
    const b = f.fr === 'idle' && f.i ? 1 : 0, a = f.fr === 'atk' ? f.i + 1 : 0, rg = o.rage;
    const sk = rg ? '#7a3a8a' : '#4a3a7a', sk2 = rg ? '#a04aa8' : '#6a5aa8';
    P.e(23, 37, 20, 3, '#1f5a6a'); P.e(23, 37, 16, 2, '#2f8a9a');
    const arm = (x0, dir, ph) => { const pts = []; for (let i = 0; i < 6; i++) pts.push([x0 + dir * i * 3.2, 33 - i * 2.2 + Math.sin(i * 1.2 + ph + f.i * 1.4) * 2 - (a && i > 3 ? a * 2 : 0)]); for (let i = 0; i < 5; i++) P.l(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], sk, 4 - (i >> 1)); for (let i = 1; i < 5; i++) P.p(pts[i][0], pts[i][1] + 1, '#f0c8e0'); };
    arm(14, -1, 0); arm(32, 1, 1); arm(17, -0.6, 2); arm(29, 0.6, 3);
    P.e(23, 18 + b, 13, 15, sk); P.e(23, 15 + b, 10, 11, sk2);
    for (const [x, y] of [[17, 8], [28, 10], [22, 5], [31, 17]]) P.e(x, y + b, 1.6, 1.4, shade(sk2, 0.25));
    P.e(17, 24 + b, 3.2, 3, '#f0e080'); P.e(29, 24 + b, 3.2, 3, '#f0e080'); P.r(16, 23 + b, 2, 3, '#1a0a1a'); P.r(28, 23 + b, 2, 3, '#1a0a1a'); P.p(17, 23 + b, rg ? '#ff3a3a' : '#ffffff'); P.p(29, 23 + b, rg ? '#ff3a3a' : '#ffffff');
    P.e(23, 31 + b, 4, 2 + a, '#2a0a2a'); for (let x = 20; x < 27; x += 2) P.p(x, 30 + b, '#f0e8d8');
  } },
  devourer: { w: 50, h: 46, draw(P, f, o) {
    const b = f.fr === 'idle' && f.i ? 1 : 0, a = f.fr === 'atk' ? f.i + 1 : 0, rg = o.rage;
    const body = '#0c0814', rim = rg ? '#ff3a5a' : '#c060ff', eye = rg ? '#ffd0d0' : '#ffe8a0';
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + f.i * 0.2, r0 = 15, r1 = 22 + (i % 2) * 2 + a * 1.5; P.l(25 + Math.cos(an) * r0, 22 + b + Math.sin(an) * r0 * 0.9, 25 + Math.cos(an) * r1, 22 + b + Math.sin(an) * r1 * 0.9, i % 2 ? '#2a1a40' : '#3a1a4a', 3); P.p(25 + Math.cos(an) * r1, 22 + b + Math.sin(an) * r1 * 0.9, rim); }
    P.e(25, 22 + b, 17, 16, body); P.e(25, 22 + b, 15.5, 14.5, '#1a1028');
    for (let i = 0; i < 7; i++) { const an = -Math.PI * 0.95 + i * Math.PI * 0.316, x = 25 + Math.cos(an) * 11, y = 21 + b + Math.sin(an) * 9.5; P.e(x, y, 2, 1.6, eye); P.p(x, y, '#1a0a1a'); }
    P.e(25, 24 + b, 7 + a, 6 + a * 1.2, '#000000'); P.e(25, 24 + b, 5 + a, 4 + a, rg ? '#5a0a1a' : '#2a0a3a'); P.e(25, 24 + b, 2.2, 2.2, rim); P.p(24, 23 + b, '#ffffff');
    for (let x = 19; x <= 31; x += 2) { P.p(x - a * 0.3, 18 + b - a, '#e8e0f0'); P.p(x - a * 0.3, 30 + b + a, '#e8e0f0'); }
    for (const [x, h] of [[15, 5], [20, 8], [25, 10], [30, 8], [35, 5]]) P.poly([[x - 2, 8 + b], [x, 8 + b - h], [x + 2, 8 + b]], '#d8c8ff');
  } },
});

// ---------- 樓層產生 ----------
Object.assign(Gen, {
  // 溺沒古城：房間＋走廊，大量淺水、深水運河與水池
  flooded(rng, depth) {
    const F = this.rooms(rng, depth, 'flooded'); if (!F) return null;
    for (let i = rng.int(6, 9); i > 0; i--) {
      const [cx, cy] = this.randFloor(F, rng);
      for (const [x, y] of this.blob(rng, cx, cy, rng.int(18, 40))) if (this.get(F, x, y) === T.FLOOR) this.set(F, x, y, T.WATER);
    }
    // 深水運河（之後由連通修正搭上石橋）
    for (let c = rng.int(1, 2); c > 0; c--) {
      const horiz = rng.chance(0.5), len = horiz ? F.w : F.h;
      let p = rng.int(6, (horiz ? F.h : F.w) - 7);
      for (let s = 1; s < len - 1; s++) {
        for (let k = -1; k <= 1; k++) { const x = horiz ? s : p + k, y = horiz ? p + k : s, v = this.get(F, x, y); if (v === T.FLOOR || v === T.WATER || v === T.GRASS) this.set(F, x, y, k === 0 || rng.chance(0.7) ? T.DEEP : T.WATER); }
        if (rng.chance(0.25)) p = clamp(p + rng.int(-1, 1), 4, (horiz ? F.h : F.w) - 5);
      }
    }
    // 大房間中央的深水池
    const big = F.rooms.filter(r => r.kind === 'room' && !r.start && r.w >= 7 && r.h >= 5);
    rng.shuffle(big);
    for (const r of big.slice(0, 2)) for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) { const v = this.get(F, x, y); if ((v === T.FLOOR || v === T.WATER) && rng.chance(0.8)) this.set(F, x, y, T.DEEP); }
    // 起點不要泡在深水裡
    if (this.get(F, F.start[0], F.start[1]) !== T.FLOOR) { const r = F.rooms.find(o => o.start); if (r) F.start = this.freeIn(F, r, rng); }
    return F;
  },
  // 星骸虛空：漂浮在裂谷上的石島，用石橋相連
  islands(rng, depth) {
    const W = 58, H = 38, F = this.blank(W, H);
    F.t.fill(T.CHASM);
    const rooms = [];
    for (let i = 0; i < 300 && rooms.length < 12; i++) {
      const w = rng.int(5, 11), h = rng.int(4, 8), x = rng.int(2, W - w - 2), y = rng.int(2, H - h - 2);
      if (rooms.some(r => x - 3 < r.x + r.w && x + w + 3 > r.x && y - 3 < r.y + r.h && y + h + 3 > r.y)) continue;
      rooms.push({ x, y, w, h, kind: 'room', shape: 'isle' });
    }
    if (rooms.length < 7) return null;
    for (const r of rooms) {
      const cx = r.x + (r.w - 1) / 2, cy = r.y + (r.h - 1) / 2;
      for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
        const dx = (x - cx) / (r.w / 2 + 0.6), dy = (y - cy) / (r.h / 2 + 0.6), n = hash2(x, y, depth * 7 + 3) * 0.35;
        if (dx * dx + dy * dy <= 1.0 - n + 0.15 && x > 0 && y > 0 && x < W - 1 && y < H - 1) F.t[y * W + x] = T.FLOOR;
      }
      // 島上的斷牆與水晶（掩體）
      if (r.w >= 7 && r.h >= 5 && rng.chance(0.55)) {
        const horiz = rng.chance(0.5), n = rng.int(2, 4), sx = rng.int(r.x + 1, r.x + r.w - 2), sy = rng.int(r.y + 1, r.y + r.h - 2);
        for (let k = 0; k < n; k++) { const x = horiz ? sx + k : sx, y = horiz ? sy : sy + k; if (this.get(F, x, y) === T.FLOOR) this.set(F, x, y, rng.chance(0.3) ? T.CRYSTAL : T.WALL); }
      }
    }
    const cen = r => [r.x + (r.w >> 1), r.y + (r.h >> 1)];
    const inT = [rooms[0]], out = rooms.slice(1), edges = [];
    while (out.length) {
      let best = null, bd = 1e9;
      for (const a of inT) for (const b of out) { const [ax, ay] = cen(a), [bx, by] = cen(b), d = Math.abs(ax - bx) + Math.abs(ay - by); if (d < bd) { bd = d; best = [a, b]; } }
      edges.push(best); inT.push(best[1]); out.splice(out.indexOf(best[1]), 1);
    }
    for (let i = 0; i < 2; i++) { const a = rng.pick(rooms), b = rng.pick(rooms); if (a !== b) edges.push([a, b]); }
    for (const [a, b] of edges) this.bridgeLine(F, cen(a), cen(b), rng);
    // 零星的小碎石島（站得上去，用一格石橋接回大島）
    F.rooms = rooms;
    const start = rng.pick(rooms); start.start = 1;
    F.start = this.freeIn(F, start, rng);
    return F;
  },
  bridgeLine(F, [x0, y0], [x1, y1], rng) {
    let x = x0, y = y0;
    const step = (tx, ty) => { while (x !== tx || y !== ty) { if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y); const v = this.get(F, x, y); if (v === T.CHASM) this.set(F, x, y, T.BRIDGE); else if (v === T.WALL || v === T.CRYSTAL) this.set(F, x, y, T.RUBBLE); } };
    if (rng.chance(0.5)) { step(x1, y0); step(x1, y1); } else { step(x0, y1); step(x1, y1); }
  },
  // 終焉之心：虛空正中央的圓形石台
  abyss(rng) {
    const W = 40, H = 36, F = this.blank(W, H);
    F.t.fill(T.CHASM);
    const cx = 20, cy = 14, R = 10.5;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const d = Math.hypot(x - cx, (y - cy) * 1.1); if (d <= R + hash2(x, y, 77) * 0.8) F.t[y * W + x] = T.FLOOR; }
    for (const [dx, dy] of [[-5, -4], [5, -4], [-6, 3], [6, 3]]) this.set(F, cx + dx, cy + dy, T.CRYSTAL);
    // 入口石台與石橋
    for (let y = 29; y <= 32; y++) for (let x = 16; x <= 24; x++) if (Math.hypot(x - 20, (y - 30.5) * 1.4) <= 4.6) this.set(F, x, y, T.FLOOR);
    for (let y = 24; y < 29; y++) { this.set(F, 19, y, T.BRIDGE); this.set(F, 20, y, T.BRIDGE); this.set(F, 21, y, T.BRIDGE); }
    const hall = { x: cx - 9, y: cy - 8, w: 19, h: 16, kind: 'room', shape: 'isle' }, ent = { x: 16, y: 29, w: 9, h: 4, kind: 'room', shape: 'isle', start: 1 };
    F.rooms = [ent, hall];
    F.start = [20, 31];
    F.bossAt = [20, 8];
    F.arena = 1;
    return F;
  },
});

// ---------- 規則 ----------
Object.assign(Game, {
  isWetAt(x, y) { return isWet(this.tile(x, y)); },
  monPass(m, x, y) {
    const v = this.tile(x, y), D = MON[m.k];
    if (D.aquatic) return isWet(v);
    if (v === T.DEEP) return !!(D.swim || D.fly);
    if (v === T.CHASM) return !!D.fly;
    if (!TP[v].walk) return false;
    if (v === T.LAVA && !(D.lavaWalk || D.fly || D.fireImm)) return false;
    return true;
  },
  // 只在水裡活動的怪物：生成時移到最近的水面，沒有水就換成鮫人
  fixAquatic(m) {
    const D = MON[m.k]; if (!D.aquatic || this.isWetAt(m.x, m.y)) return m;
    const F = G.F;
    for (let r = 1; r < 14; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
      const x = m.x + i, y = m.y + j; if (x < 1 || y < 1 || x >= F.w - 1 || y >= F.h - 1) continue;
      if (this.isWetAt(x, y) && !this.monAt(x, y) && !(x === G.P.x && y === G.P.y)) { m.x = x; m.y = y; m.tx = x; m.ty = y; return m; }
    }
    m.k = 'merman'; return m;
  },
  // ---------- 跳進（或被推進）虛空裂谷 ----------
  chasmStep(nx, ny, opts) {
    if (!opts.force && G.chasmWarn !== nx + ',' + ny) { G.chasmWarn = nx + ',' + ny; msg(this.canFallDeeper() ? '那是深不見底的虛空裂谷！再按一次就會跳下去（會落到下一層並受傷）。' : '那是深不見底的虛空裂谷！掉下去會被拋回入口。', 'w'); return false; }
    G.chasmWarn = null;
    const P = G.P; P.x = nx; P.y = ny;
    this.fallDown('自己跳進了虛空裂谷');
    if (!G.over && G.F && !this.canFallDeeper()) this.endTurn();
    return true;
  },
  canFallDeeper() { const n = G.depth + 1; return !BOSS_FLOOR[G.depth] && n !== LAST_FLOOR && n < DEEP_LAST && !G.F.branch && !G.rush; },
  fallDown(cause) {
    const P = G.P;
    if (typeof FX !== 'undefined') { FX.puff(P.x, P.y, '#9ab8ff', 14); FX.shake(6); }
    Snd.play('trap');
    if (this.canFallDeeper()) {
      msg('你墜入了虛空裂谷……穿過無盡的星光，摔到了下一層！', 'b');
      this.hurtP(G.rng.int(6, 12), '墜入虛空裂谷摔死');
      if (!G.over) this.enterFloor(G.depth + 1, 'fall');
    } else {
      msg('你墜入虛空……一股力量把你拋回了入口！', 'b');
      this.hurtP(Math.max(4, Math.round(P.mhp * 0.12)), '墜入虛空');
      if (!G.over) { [P.x, P.y] = G.F.start; if (typeof Render !== 'undefined') Render.snapCam(); this.updateFov(); }
    }
    G.interrupt = true;
  },
  // ---------- 擊退 ----------
  // 把怪物往 (dx,dy) 方向推 n 格：撞到牆或其他怪物會受傷並暈眩；被推進裂谷就掉下去，推進岩漿會燒傷
  knock(m, dx, dy, n, o = {}) {
    const D = MON[m.k]; if (!m || m.hp <= 0 || D.npc) return;
    if (D.boss || D.immobile) { if (o.slam) { this.damageMon(m, Math.max(1, Math.round(o.slam * 0.5)), {}); } return; }
    const fx = typeof FX !== 'undefined', x0 = m.x, y0 = m.y;
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const x = m.x + dx, y = m.y + dy, v = this.tile(x, y);
      if (v === T.CHASM && !D.fly) {
        m.x = x; m.y = y;
        msg(this.monName(m) + '被推進了虛空裂谷！', 'g');
        Meta.inc('falls'); Meta.event('fall');
        if (fx) { FX.puff(x, y, '#9ab8ff', 12); FX.burst(x, y, '#c0a0ff', 10); }
        this.killMon(m, { fall: 1 });
        return;
      }
      const blocked = !TP[v].walk && !(v === T.DEEP && (D.swim || D.fly)) || this.monAt(x, y) || (x === G.P.x && y === G.P.y) || v === T.PROP;
      if (blocked) {
        const other = this.monAt(x, y);
        const dmg = Math.max(1, Math.round((o.slam || 6) * (this.rset && this.rset('tide') ? 1.4 : 1)));
        msg(this.monName(m) + '重重撞上了' + (other ? this.monName(other) : TP[v].n) + '！', 'g');
        if (fx) { FX.shake(4); FX.spark(m.x, m.y, '#ffffff', 10); FX.ring(m.x, m.y, 0.5, '#ffe0b0'); }
        Snd.play('hit');
        m.st.stun = Math.max(m.st.stun || 0, 2);
        this.damageMon(m, dmg, {});
        if (other && other !== m && !MON[other.k].npc) this.damageMon(other, Math.max(1, dmg >> 1), {});
        break;
      }
      if (v === T.DOOR) this.setTile(x, y, T.ODOOR);
      m.x = x; m.y = y; moved++;
      if (v === T.DEEP && !D.swim && !D.fly) { m.st.stun = Math.max(m.st.stun || 0, 2); this.damageMon(m, G.rng.int(3, 7), {}); msg(this.monName(m) + '掉進深水裡掙扎！', 'g'); break; }
    }
    if (moved && fx) FX.trail(m, x0, y0, m.x, m.y, '#bfe8ff');
    if (moved && this.rset && this.rset('tide') && m.hp > 0) m.st.stun = Math.max(m.st.stun || 0, 1);
  },
  // 玩家被推開（海妖的激流）
  knockP(dx, dy, n, src) {
    const P = G.P, fx = typeof FX !== 'undefined', x0 = P.x, y0 = P.y;
    for (let i = 0; i < n; i++) {
      const x = P.x + dx, y = P.y + dy, v = this.tile(x, y);
      if (v === T.CHASM) { P.x = x; P.y = y; this.fallDown('被' + src + '推進了虛空裂谷'); return; }
      if (!TP[v].walk || this.monAt(x, y) || v === T.PROP || v === T.LAVA) { this.hurtP(G.rng.int(2, 5), '被' + src + '撞死在牆上'); if (fx) FX.shake(5); break; }
      if (v === T.DOOR) this.setTile(x, y, T.ODOOR);
      P.x = x; P.y = y;
    }
    if ((P.x !== x0 || P.y !== y0)) { msg('你被沖開了！', 'b'); if (fx) FX.trail(P, x0, y0, P.x, P.y, '#9fe8ff'); this.onEnter({ auto: 1 }); }
  },
  // ---------- 警示標記：流星（下一回合在標記處爆炸） ----------
  addMark(x, y, t, dmg, src, r = 1) {
    const F = G.F; F.marks = F.marks || [];
    if (x < 1 || y < 1 || x >= F.w - 1 || y >= F.h - 1) return;
    F.marks.push({ x, y, t, dmg, src, r });
  },
  marksTick() {
    const F = G.F; if (!F.marks || !F.marks.length) return;
    const fx = typeof FX !== 'undefined', P = G.P;
    for (const mk of F.marks) {
      if (--mk.t > 0) continue;
      if (fx && this.inView(mk.x, mk.y)) { FX.boom(mk.x, mk.y, mk.r + 0.4, '255,200,120'); FX.shake(5); FX.burst(mk.x, mk.y, '#ffd98a', 16); }
      Snd.play('boom');
      for (const m of F.mons.slice()) if (m.hp > 0 && !MON[m.k].npc && !MON[m.k].boss && cheb(m.x, m.y, mk.x, mk.y) <= mk.r) this.damageMon(m, mk.dmg, {});
      if (cheb(P.x, P.y, mk.x, mk.y) <= mk.r) this.hurtP(Math.max(1, mk.dmg - G.rng.int(0, this.stats().arm >> 1)), '被' + mk.src + '砸死');
      if (mk.gold && !G.over) this.dropItem(this.goldItem(G.depth, 0.8), mk.x, mk.y);
      if (G.over) return;
    }
    F.marks = F.marks.filter(mk => mk.t > 0);
  },
  // ---------- 擊敗深淵之王：凱旋或是繼續往下 ----------
  lordDown(m) {
    G.lordSlain = 1;
    G.stats.lord = 1;
    Store.meta.wins = (Store.meta.wins || 0) + 1;
    if (!G.dbgSkip) Store.meta.deepOpen = 1;
    Meta.event('win');
    msg('深淵之王化為塵土……你征服了深淵地牢！', 'y');
    Snd.play('victory');
    for (let i = 0; i < 2; i++) this.dropItem(i === 0 ? this.makeItem(G.rng.pick(['p_life', 'p_xheal'])) : this.goodItem(G.depth + 2), m.x, m.y);
    // 王座後方裂開一道通往深淵下層的裂隙
    const F = G.F; let at = F.bossAt && TP[this.tile(F.bossAt[0], F.bossAt[1])].walk && !this.monAt(F.bossAt[0], F.bossAt[1]) && !(G.P.x === F.bossAt[0] && G.P.y === F.bossAt[1]) ? F.bossAt : this.nearFree(m.x, m.y, null, 3);
    if (at) { this.setTile(at[0], at[1], T.STAIRS); F.stairs = [at[0], at[1]]; F.seen[at[1] * F.w + at[0]] = 1; if (typeof FX !== 'undefined') { FX.pillar(at[0], at[1], '200,120,255', 1.2); FX.ring(at[0], at[1], 1.5, '#d05cff'); } }
    G.deepChoice = 1;
    Store.saveMeta();
  },
  chooseDeep(go) {
    if (!G.deepChoice) return;
    G.deepChoice = 0;
    if (!go) { this.win(); return; }
    msg('王座後方裂開了一道深淵裂隙。踏上裂隙按「下樓」，就能前往深淵下層。', 'y');
    this.rollRelicChoice();
    this.healP(Math.round(G.P.mhp * 0.5));
    this.save();
  },
  // ---------- 怪物的新能力 ----------
  monSpecial(m, d) {
    const D = MON[m.k], P = G.P, fx = typeof FX !== 'undefined';
    // 虛空行者：瞬間出現在你身邊
    if (D.phase && d >= 3 && !(m.cd.phase > 0) && G.rng.chance(0.4)) {
      const c = DIRS8.map(([dx, dy]) => [P.x + dx, P.y + dy]).filter(([x, y]) => this.monCan(m, x, y) && this.inView(x, y));
      if (c.length) {
        const [x, y] = G.rng.pick(c);
        if (fx) { FX.burst(m.x, m.y, '#c07aff', 10); FX.ghost(m, null, null, '#6a4aaa', 0.4); }
        m.x = x; m.y = y; m.cd.phase = 5;
        if (fx) { FX.burst(x, y, '#c07aff', 12); FX.ring(x, y, 0.6, '#c07aff'); }
        if (this.monVisible(m)) msg(this.monName(m) + '從虛空中鑽了出來！', 'w');
        Snd.play('tele');
        return true;
      }
    }
    // 墮落騎士：衝鋒
    if (D.dash && d >= 2 && d <= 4 && !(m.cd.dash > 0) && G.rng.chance(0.5)) {
      const line = lineTo(m.x, m.y, P.x, P.y); line.pop();
      if (line.length && line.every(([x, y]) => this.monCan(m, x, y))) {
        const x0 = m.x, y0 = m.y, [x, y] = line[line.length - 1];
        m.x = x; m.y = y; m.cd.dash = 7;
        if (fx) { FX.trail(m, x0, y0, x, y, '#ff6a8a'); FX.shake(4); }
        msg(this.monName(m) + '舉盾衝鋒！', 'w'); Snd.play('charge');
        m.dashHit = 1; this.monMelee(m); m.dashHit = 0;
        return true;
      }
    }
    // 終焉吞噬者第三階段：流星雨
    if (D.meteor && m.hp < m.mhp * 0.3) {
      if (!m.phase3) { m.phase3 = 1; msg('終焉吞噬者撕開了星空——星辰開始墜落！', 'w'); Snd.play('roar'); if (fx) { FX.shake(12); FX.screen('255,200,120', 0.45); } if (typeof UI !== 'undefined') UI.banner('第三階段', MON[m.k].n + '・崩壞', '星辰開始墜落！留意地上的警示標記。', 1); }
      if (!(m.cd.met > 0)) {
        m.cd.met = 3;
        const n = 3;
        for (let i = 0; i < n; i++) { const x = P.x + G.rng.int(-2, 2), y = P.y + G.rng.int(-2, 2); if (TP[this.tile(x, y)].walk) this.addMark(x, y, 2, G.rng.int(12, 20), '墜落的星辰', 0); }
        this.addMark(P.x, P.y, 2, G.rng.int(12, 20), '墜落的星辰', 0); G.interrupt = true;
        if (fx) FX.cast(m, '255,200,120');
      }
    }
    return false;
  },
  monBurst(m) {
    const fx = typeof FX !== 'undefined', P = G.P;
    if (fx) { FX.boom(m.x, m.y, 1.4, '255,220,120'); FX.shake(5); }
    Snd.play('boom');
    msg(MON[m.k].n + '爆炸了！', 'w');
    for (const o of G.F.mons.slice()) if (o !== m && o.hp > 0 && !MON[o.k].npc && cheb(o.x, o.y, m.x, m.y) <= 1) this.damageMon(o, G.rng.int(6, 12), {});
    if (cheb(P.x, P.y, m.x, m.y) <= 1) this.hurtP(G.rng.int(6, 11), '被' + MON[m.k].n + '的爆炸炸死');
  },
});

// 生成只在水裡活動的怪物時，放到水面上
{
  const spawn0 = Game.spawnAt;
  Game.spawnAt = function (k, x, y, asleep, used) { const m = spawn0.call(this, k, x, y, asleep, used); if (MON[k].aquatic) this.fixAquatic(m); return m; };
}

// ---------- 成就 ----------
ACH.push(
  { id: 'deep18', n: '越過深淵', d: '踏入第 18 層（深淵下層）', s: 15, chk: e => e.t === 'depth' && e.v >= 18 },
  { id: 'kraken', n: '屠海者', d: '擊敗沉淪海妖', s: 30, chk: e => e.t === 'boss' && e.v === 'kraken' },
  { id: 'deep22', n: '星海漫步', d: '抵達第 22 層（星骸虛空）', s: 20, chk: e => e.t === 'depth' && e.v >= 22 },
  { id: 'truewin', n: '終焉', d: '擊敗終焉吞噬者', s: 100, chk: e => e.t === 'truewin' },
);

// ---------- 音樂 ----------
Object.assign(SONGS, {
  b5: { bpm: 62, root: 47, sc: 'dor', prog: [0, 5, 3, 4, 0, 5, 6, 4], arp: 0.3, bell: 0.28, pad: 0.045 },
  b6: { bpm: 56, root: 50, sc: 'lyd', prog: [0, 1, 4, 3], arp: 0.42, bell: 0.36, pad: 0.04, high: 1 },
  b7: { bpm: 60, root: 38, sc: 'phr', prog: [0, 1, 0, 6], arp: 0.2, bell: 0.15, pad: 0.05 },
});
{
  const amb0 = Music.amb;
  Music.amb = function (c) {
    if (!G || !G.F || G.F.biome < 5 || this.cur === 'title' || this.cur === 'boss') return amb0.call(this, c);
    if (Math.random() > 0.035) return;
    const b = G.F.biome, S = Snd;
    if (b === 5) { for (let i = 0; i < 3; i++) S.tone(300 + Math.random() * 500, 0.08, 'sine', 0.018, 700 + Math.random() * 400, i * 0.07, Snd.musG); }
    else { const f = 1200 + Math.random() * 1400; S.tone(f, 1.4, 'sine', 0.012, null, 0, Snd.musG, 0.01); S.tone(f * 1.5, 1.2, 'sine', 0.007, null, 0.15, Snd.musG, 0.01); }
  };
}
