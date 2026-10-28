'use strict';
// 曉鐘傳說：第四輪追加（月汐群島篇）——地圖、地形、謎題機關、地圖特效

// ───── 地圖格子（由工具產生）─────
// W 退潮時才露出的水道　V 漲潮時才浮起的浮橋　J 潮汐拉桿　1～4 鐘柱　6 日輪石　9 灼熱地板　g 荊棘門
const ISL_ROWS = {
  coral1: [
    '########################',
    '#.....####....#####....#',
    '#..C..####..C.#####..>.#',
    '#.....VVVV....#####....#',
    '#.....####....#######V##',
    '##.#######.##########V##',
    '##.#######.##########V##',
    '##.###.......O####.....#',
    '##.###O.......WWWW.C...#',
    '##.###........####..J..#',
    '##.#######.#############',
    '#......#.....#.........#',
    '#..J...W.....W....~~...#',
    '#......W.S.C.W....~~.C.#',
    '#.O...s#.....#.........#',
    '####.###################',
    '####E###################',
  ],
  coral2: [
    '##########################',
    '#......###....J.#...S...##',
    '#.<....###..............##',
    '#......VVV......#.....C.##',
    '#......###......#.H.....##',
    '#....J.###O....O##########',
    '############W#############',
    '############W#######.....#',
    '#....#######W#######...J.#',
    '#.C..###.J.......###.....#',
    '#....WWW.........VVV.....#',
    '#....###.........###.....#',
    '#.C..###O.......O###....C#',
    '#....###############.....#',
    '######################W###',
    '######################W###',
    '#############.....~~.....#',
    '#####>......D............#',
    '#############............#',
    '##########################',
  ],
  coral3: [
    '######################',
    '#.<...################',
    '#.....################',
    '#............#########',
    '#.....######.#########',
    '############.#########',
    '###.............C#####',
    '###......S.......#####',
    '###..............#####',
    '###.C...##############',
    '###................O.#',
    '###...O..............#',
    '###..................#',
    '##########...~~~.~...#',
    '##########...~~~~~...#',
    '######################',
  ],
  mist1: [
    '########################',
    '###########..###########',
    '###########..###########',
    '###########....C########',
    '###########.....########',
    '###########..###########',
    '###########..###########',
    '########........########',
    '########.T....T.########',
    '#......................#',
    '#......................#',
    '##...###.T...s..###...##',
    '##...###........###...##',
    '##S..######..######..C##',
    '###########..###########',
    '###########..###########',
    '###########..###########',
    '###########..###########',
    '###########..###########',
    '###########E############',
  ],
  mist2: [
    '######################',
    '######.C......H.######',
    '######..........######',
    '######..........######',
    '##########gg##########',
    '####TT..........TT####',
    '####T......4.....T####',
    '####..............####',
    '####..............####',
    '####.3..........1.####',
    '####..............####',
    '####..............####',
    '####..............####',
    '####T.....2......T####',
    '####T............T####',
    '########s#.....#######',
    '##########...SC#######',
    '##########<###########',
  ],
  sun1: [
    '####################',
    '#########.>.########',
    '#########...########',
    '##########.#########',
    '##...#####D####...##',
    '#.6..............6.#',
    '#.....O......O.....#',
    '#99999..99999.99999#',
    '#99999...969..99999#',
    '#.......99999......#',
    '#..................#',
    '#...O..........O...#',
    '#.C.....S...s....C.#',
    '#..................#',
    '##########.#########',
    '##########E#########',
  ],
  sun2: [
    '####################',
    '#########.>.########',
    '#########...########',
    '##########.#########',
    '#....#####D####....#',
    '#.C..............C.#',
    '#..................#',
    '#....6..6..6..6....#',
    '#..................#',
    '#..................#',
    '#..99.99.99.99.9O..#',
    '#.99.99.99.99.99.9.#',
    '#..O....s..........#',
    '#...............<..#',
    '####################',
    '####################',
  ],
  sun3: [
    '####################',
    '#######...>...######',
    '#######.......######',
    '##########.#########',
    '#....#####D####....#',
    '#9C..............H9#',
    '#9....6...6...6...9#',
    '#9................9#',
    '#9................9#',
    '#9....6...6...6...9#',
    '#9................9#',
    '#9................9#',
    '#9.9.9.9.9.9s9.9.S.#',
    '#..<...............#',
    '####################',
    '####################',
  ],
  sun4: [
    '####################',
    '####################',
    '####............####',
    '###......RRR.....###',
    '###..O....R...O..###',
    '###.......R......###',
    '###.......R......###',
    '###.......R......###',
    '###.......R......###',
    '###.......R......###',
    '###..O....R...O..###',
    '###.......R......###',
    '####......R.....####',
    '##########<#########',
    '####################',
  ],
  tide: [
    'TTTTTTTTTTTT#######TTTTTT::~~~~~~',
    'TP..........#ooQoo#....P.::~~~~~~',
    'T.#######.,.#ooooo#######::~~~~~~',
    'T.#kookk#...#ooooo##oYoo#::~~~~~~',
    'T.#=====#...###+####oRoo#::~~~~~~',
    'T.#ooooo#......;...#tRot#::~~~~~~',
    'T.###+###.L....;...##+###::~~~~~~',
    'T....;;;;;;;;;;;;;;;;;;;;::~~~~~~',
    'T..............;;;;;;;;;;::~~~~~~',
    'TT......h...,..;......h..::~~~~~~',
    'T.######.......;.#######.::~~~~~~',
    'T.#kokk#.......;.#bob=o#.::~~~~~~',
    'T.#====#.......;.#boo=o#.::~~~~D~',
    'T.#oooo+;;;;;;;;;+oooop#.::~~~~D~',
    'T.######.......;.#######.::DDDDD~',
    'T......,.....w.;.........::~~~~D~',
    'TT.........,...;......,..::~~~~D~',
    'T.#####........;.........::~~~~~~',
    'T.#pkt#........;.........::~~~~~~',
    'T.#ooo#..L.....;.....L.P.::~~~~~~',
    'T.##+##........;...h.....::~~~~~~',
    'T...;;;;;;;;;;;;.........::~~~~~~',
    'T..............;.s.......::~~~~~~',
    'TTTTTTTTTTTTTT;;;TTTTTTTT::~~~~~~',
  ],
  isles: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~:::~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~:::...::::~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~::TT........:~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~T::~~~~:TTTTTT........:~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~:T..T:T::TTTTTTTT........:~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~:T.T...TTTTTT.TTTTT........~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~:T.TTTTTTT.TT.TTTT.T........:~~~~~~~~::::::~~~~~~',
    '~~~~:.TT.TTTTTTUT.T.TTTTT.......:~~~~~~~~::::::::~~~~~',
    '~~~:...TTTT.TTT;T.TTTTTT........:~~~~~~~hh::::h:::~~~~',
    '~~~:....TTTTTTT;TTTTTTT........:~~~~~~~:hhh::h::::~~~~',
    '~~~:.,...TTT.TT;TTTTT.........,:~~~~~~:h::::::::h::~~~',
    '~~~~:.......T,.;;;;;;;;;;;;;;;;;.zzzzz;;;;;;;X:::::~~~',
    '~~~~:...h......;..h...^..,......:~~~~~h::::::hh:h::~~~',
    '~~~~...h....h..;........^^....h.:~~~~~::::::::h::::~~~',
    '~~~~:........h.;.h.....^,^^..h...:~~~::h::h::::h::::~~',
    '~~~~:.h.,......;.....,..^.^^.....:~~~:h:::::::::hh::~~',
    '~~~:O;;;;;;;;;;;......,.....^,....~~~:::hh:::::h:h:~~~',
    '~~~:...h..h....;...........^..h.,:~~~~:::::::::::::~~~',
    '~~~:...h.h...h.;..,...........,.:~~~~~~::h:::::::h~~~~',
    '~~~:.......h...;................:~~~~~~::::::::hh:~~~~',
    '~~~:.h.........;.h.h.......h....:~~~~~~~:hh:::::::~~~~',
    '~~~........h.,.;..........h.h....~~~~~~~:::::h:::~~~~~',
    '~~~:....h......;.....h...........~~~~~~~~h::::::~~~~~~',
    '~~~~::...hh....;...............h:~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~:..h....,;......h........:~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~........N.h...,.h.......:~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~:.......h;......h.....,..:~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~::.......;................~~~~~~~~~~~~~~~:~~~~~~',
    '~~~~.~~~.:.....;...............:~~~~~~~~~~~~~:::::~~~~',
    '~~~:.:~~~~::...;.....h........:~~~~~~~~~~~~~~:::::~~~~',
    '~~:...:~~~~~.:,;...........h::~~~~~~~~~~~~~~~:::::~~~~',
    '~~~.::~~~~~~~~:;;;..::...::.~~~~~~~~~~~~~~~~~~~:~~~~~~',
    '~~~~~~~~~~~~~~~~:q::~~..~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
};Object.assign(MAP_ROWS, ISL_ROWS);

// ───── 主題（城鎮與迷宮的配色）─────
Object.assign(LTH, {
  tide: { ground: 'grass', roofs: ['#2a9a9a', '#3a7ab8', '#2a8a7a', '#4a6ab0'], wall: '#f4efe0', wall2: '#d0c8b0', timber: '#4a6a7a', floor: '#c8955c', liquid: 'water', tops: '#3a4a5a' },
  coral: { floor: ['#5aa8a0', '#4a9890', '#78c0b4'], top: '#0e2a34', face: ['#c86a7a', '#9a4a5a', '#e898a0'], moss: '#ffb0c0', liquid: 'water' },
  mist: { floor: ['#3e5c3c', '#335032', '#4c6c46'], top: '#0c1a12', face: ['#3a2e22', '#2a2018', '#5a4a34'], moss: '#4a8a3a', liquid: 'water' },
  sun: { floor: ['#f0e2c4', '#dccaa4', '#fff4dc'], top: '#5a3a1a', face: ['#e8c070', '#c09040', '#fff0b0'], bricks: 1, liquid: 'lava' },
});
{
  const ft0 = floorTile;
  floorTile = function (g, th, x0, y0, seed, kind) {
    if (kind === 'coral' || kind === 'mist') {
      ft0(g, th, x0, y0, seed, 'cave');
      const r = seeded(seed * 3 + 1);
      if (kind === 'coral') { for (let i = 0; i < 3; i++) { const yy = y0 + 3 + ((r() * 11) | 0); px(g, x0 + ((r() * 8) | 0), yy, '#8ad0c4', 5, 1); } if (r() < 0.12) { px(g, x0 + 6, y0 + 7, '#ffe8d8', 3, 2); px(g, x0 + 7, y0 + 6, '#ffb0a0', 1, 1); } }
      else { for (let i = 0; i < 4; i++) { const xx = x0 + ((r() * 14) | 0), yy = y0 + 3 + ((r() * 11) | 0); px(g, xx, yy, '#5a8a48', 1, 2); px(g, xx + 1, yy + 1, '#4a7a3a', 1, 1); } if (r() < 0.1) { px(g, x0 + 7, y0 + 8, '#e8e0f0', 2, 1); px(g, x0 + 7, y0 + 9, '#c8b8a0', 2, 2); } }
      return;
    }
    if (kind === 'sun') {
      ft0(g, th, x0, y0, seed, 'tower');
      if (seed % 5 === 0) { px(g, x0 + 7, y0 + 3, '#e0b040', 2, 10); px(g, x0 + 3, y0 + 7, '#e0b040', 10, 2); px(g, x0 + 7, y0 + 7, '#fff0a0', 2, 2); }
      return;
    }
    return ft0(g, th, x0, y0, seed, kind);
  };
}

// ───── 地圖設定 ─────
const islTideLow = id => F('tide:' + id);
Object.assign(MAPS, {
  isles: { kind: 'world', name: '月汐群島', music: 'isles', isles: 1 },
  tide: {
    kind: 'town', theme: 'tide', name: '月汐港', music: 'tidetown', entry: [15, 22, 'up'], world: [15, 29], worldMap: 'isles', revive: [21, 5], isl: 1,
    signs: { '17,22': '「月汐港」\n北邊的鐘樓裡掛著群島的暮鐘。\n西海岸有珊瑚洞窟，北方是霧之森，東島上聳立著曜日之塔。' },
    npcs: [],
  },
  coral1: { kind: 'dungeon', theme: 'coral', name: '珊瑚洞窟 B1', short: '珊瑚洞窟', music: 'dungeon', enc: 'dc', entry: [4, 15, 'up'], world: [4, 20], worldMap: 'isles', isl: 1, tide: 1,
    exits: [{ x: 21, y: 2, to: 'coral2', tx: 2, ty: 2 }],
    chests: { '3,2': { item: 'herb3', n: 3 }, '12,2': { item: 'score1' }, '11,13': { gold: 4000 }, '19,8': { item: 'magicfruit' }, '21,13': { item: 'tidering' } },
    signs: { '6,14': '「潮汐拉桿」\n拉一下，整座洞窟的潮水就會漲或退。\n退潮時，水道會露出來；漲潮時，浮橋才會浮起來。' } },
  coral2: { kind: 'dungeon', theme: 'coral', name: '珊瑚洞窟 B2', short: '珊瑚洞窟', music: 'dungeon', enc: 'dc', world: [4, 20], worldMap: 'isles', isl: 1, tide: 1,
    exits: [{ x: 2, y: 2, to: 'coral1', tx: 21, ty: 2 }, { x: 5, y: 17, to: 'coral3', tx: 2, ty: 1 }],
    chests: { '2,9': { item: 'ether', n: 3 }, '2,12': { item: 'powerfruit' }, '24,12': { item: 'elixir' }, '22,3': { item: 'coralaxe' } },
    npcs: [{ x: 16, y: 17, mon: 'karkino', scale: 2.2, if: () => !F('m1'), talk: () => bossKarkino() }],
    triggers: [16, 17, 18].map(y => ({ x: 20, y, if: () => !F('m1'), run: () => bossKarkino() })) },
  coral3: { kind: 'dungeon', theme: 'coral', name: '深淵海溝', short: '深淵海溝', music: 'castle', dark: 2, enc: 'dab', world: [4, 20], worldMap: 'isles', isl: 1,
    exits: [{ x: 2, y: 1, to: 'coral2', tx: 5, ty: 17 }],
    chests: { '4,9': { item: 'lifefruit' }, '16,6': { item: 'abyssmail' } },
    npcs: [{ x: 15, y: 12, mon: 'levi', scale: 2.5, if: () => !F('levi'), talk: () => bossLevi() }] },
  mist1: { kind: 'dungeon', theme: 'mist', name: '霧之森', short: '霧之森', music: 'mist', enc: 'df', entry: [11, 18, 'up'], world: [15, 11], worldMap: 'isles', isl: 1, tint: 'rgba(210,225,235,.10)',
    chests: { '15,3': { item: 'herb3', n: 4 }, '21,13': { item: 'mistcloak' } },
    signs: { '13,11': '「迷途之森」\n走錯路的人，會永遠在霧裡繞圈子。\n只有螢火蟲知道正確的路。' },
    triggers: [[11, 1, 'N'], [12, 1, 'N'], [22, 9, 'E'], [22, 10, 'E'], [1, 9, 'W'], [1, 10, 'W']].map(([x, y, d]) => ({ x, y, run: () => mistExit(d) })) },
  mist2: { kind: 'dungeon', theme: 'mist', name: '霧之森 鐘之林', short: '霧之森', music: 'mist', enc: 'df', world: [15, 11], worldMap: 'isles', isl: 1, tint: 'rgba(210,225,235,.08)',
    exits: [{ x: 10, y: 17, to: 'mist1', tx: 11, ty: 17, dir: 'down' }],
    chests: { '14,16': { item: 'score2' }, '7,1': { item: 'swiftfruit' } },
    signs: { '8,15': '「鐘之林」\n月出東方，潮落南岸，\n風起西林，星沉北海。' },
    npcs: [{ x: 10, y: 2, mon: 'vesper', scale: 1.9, if: () => !F('m2'), talk: () => bossVesper() }],
    triggers: [10, 11].map(x => ({ x, y: 3, if: () => !F('m2'), run: () => bossVesper() })) },
  sun1: { kind: 'dungeon', theme: 'sun', name: '曜日之塔 1F', short: '曜日之塔', music: 'suntower', enc: 'ds', entry: [10, 14, 'up'], world: [45, 15], worldMap: 'isles', isl: 1, tint: 'rgba(255,220,150,.06)', orbs: 'free',
    exits: [{ x: 10, y: 1, to: 'sun2', tx: 16, ty: 13 }],
    chests: { '2,12': { item: 'ether', n: 2 }, '17,12': { gold: 6000 } },
    signs: { '12,12': '「日輪石」\n點亮這一層全部的日輪石，\n封住樓梯的光之門就會打開。' } },
  sun2: { kind: 'dungeon', theme: 'sun', name: '曜日之塔 2F', short: '曜日之塔', music: 'suntower', enc: 'ds', world: [45, 15], worldMap: 'isles', isl: 1, tint: 'rgba(255,220,150,.06)', orbs: 'line',
    exits: [{ x: 16, y: 13, to: 'sun1', tx: 10, ty: 1 }, { x: 10, y: 1, to: 'sun3', tx: 3, ty: 13 }],
    chests: { '2,5': { item: 'score3' }, '17,5': { item: 'sunrobe' } },
    signs: { '8,12': '「相連的日輪」\n用光線連在一起的日輪石，\n會跟著一起轉動。' } },
  sun3: { kind: 'dungeon', theme: 'sun', name: '曜日之塔 3F', short: '曜日之塔', music: 'suntower', enc: 'ds', world: [45, 15], worldMap: 'isles', isl: 1, tint: 'rgba(255,220,150,.06)', orbs: 'grid',
    exits: [{ x: 3, y: 13, to: 'sun2', tx: 10, ty: 1 }, { x: 10, y: 1, to: 'sun4', tx: 10, ty: 13 }],
    chests: { '2,5': { item: 'sunshield' } },
    signs: { '12,12': '「日輪之陣」\n日輪的光會傳給上下左右的同伴。\n讓六顆日輪同時發光吧。' },
    npcs: [{ x: 10, y: 2, mon: 'sunguard', scale: 2, if: () => !F('sunguard'), talk: () => bossSunguard() }],
    triggers: [{ x: 10, y: 3, if: () => !F('sunguard'), run: () => bossSunguard() }] },
  sun4: { kind: 'dungeon', theme: 'sun', name: '曜日之塔 頂樓', short: '曜日之塔', music: 'suntower', enc: null, world: [45, 15], worldMap: 'isles', isl: 1, tint: 'rgba(255,200,120,.08)',
    exits: [{ x: 10, y: 13, to: 'sun3', tx: 10, ty: 1 }],
    npcs: [{ x: 10, y: 4, mon: 'solvi1', scale: 1.9, if: () => !F('solvi'), talk: () => bossSolvi() }],
    triggers: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(x => ({ x, y: 7, if: () => !F('solvi'), run: () => bossSolvi() })) },
});
// 群島與港口的天色：暮鐘響起之前，太陽一直掛在天上
for (const id of ['isles', 'tide']) Object.defineProperty(MAPS[id], 'tint', { get: () => (window.islSunset ? islSunset : F('dusk') ? null : 'rgba(255,196,110,.11)'), configurable: true });

// ───── 位置表、地形 ─────
const ISL_LOCS = { N: ['tide', 15, 22, 'up'], O: ['coral1', 4, 15, 'up'], U: ['mist1', 11, 18, 'up'], X: ['sun1', 10, 14, 'up'] };
const ISL_SOLID = new Set(['J', '1', '2', '3', '4', '6']);
{
  const pass0 = Field.passable.bind(Field);
  Field.passable = function (x, y, who) {
    if (this.isWorld() || x < 0 || y < 0 || x >= this.w || y >= this.h) return pass0(x, y, who);
    const c = this.tile(x, y);
    let ok;
    if (c === 'W') ok = islTideLow(this.id);
    else if (c === 'V') ok = !islTideLow(this.id);
    else if (c === '9') ok = true;
    else if (c === 'g') ok = F('thorn');
    else if (ISL_SOLID.has(c)) ok = false;
    else return pass0(x, y, who);
    if (!ok) return false;
    for (const n of this.npcs) if (!n.hidden && !n.d.ghost && ((n.x === x && n.y === y) || (n.mv && n.mv.tx === x && n.mv.ty === y))) return false;
    return true;
  };
  const gr0 = Field.groundAt.bind(Field);
  Field.groundAt = function (x, y) {
    if (this.id !== 'isles') return gr0(x, y);
    const c = this.tile(x, y);
    if (c === ':' || x >= 36) return 'sand';
    return 'grass';
  };
  const zone0 = Field.zone.bind(Field);
  Field.zone = function () { if (this.id !== 'isles') return zone0(); return this.leader().x >= 34 ? 'i2' : 'i1'; };
  // 群島的沙洲：兩片音片的歌聲讓潮水退去以後才會出現
  const ad0 = Field.applyDynamic.bind(Field);
  Field.applyDynamic = function () {
    ad0();
    if (this.id === 'isles') { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (MAP_ROWS.isles[y][x] === 'z') this.grid[y][x] = F('sandbar') ? ':' : '~'; }
    if (this.id === 'coral2' && F('dusk')) G.flags['door:coral2:12,17'] = true;
  };
  Field.leaveTown = function () { const w = this.def.world, d = this.leader().dir; this.run(() => Game.go(this.def.worldMap || 'world', w[0], w[1], d === 'up' ? 'up' : d)); };
  // 大地圖烘焙：每張大地圖分開快取
  WorldBake.key = function () { return Field.id === 'isles' ? 'isles' + (F('sandbar') ? 1 : 0) + (F('dusk') ? 1 : 0) : 'world' + ['d1', 'gate', 'bridge', 'd2'].map(k => F(k) ? 1 : 0).join(''); };
  WorldBake.get = function (f) {
    const k = this.key(), pre = f.id === 'isles' ? 'isles' : 'world';
    if (!this.cache[k]) { for (const kk in this.cache) if (kk.startsWith(pre)) delete this.cache[kk]; this.cache[k] = this.bake(f); if (f.id === 'isles') islesDecor(f, this.cache[k]); }
    return this.cache[k];
  };
}
function islesDecor(f, frames) {
  const spr = {
    N: () => WSpr.village('#2aa8a0', '#f4f0e6'), O: () => WSpr.cave(false),
    U: () => WSpr.get('mistgate', 26, 24, p => {
      for (const [cx, w] of [[5, 5], [21, 5]]) { p.R(cx - 1, 12, 3, 12, '#3a2a1a'); p.R(cx - 1, 12, 1, 12, '#5a4028'); p.E(cx, 9, w, 8, (x, y, nx, ny) => (-nx * 0.5 - ny * 0.8 > 0.35 ? '#3a6a44' : -nx * 0.5 - ny * 0.8 < -0.3 ? '#14301c' : '#22462c')); }
      p.E(13, 6, 9, 5, (x, y, nx, ny) => (ny < -0.3 ? '#3a6a44' : '#1e3e26'));
      p.E(13, 18, 5, 6, (x, y) => (y > 23 ? null : y < 15 ? '#0a140e' : '#121e16'));
      for (const [x, y] of [[9, 14], [17, 16], [13, 12]]) p.P(x, y, '#e8ff90');
    }),
    X: () => WSpr.get('suntw', 20, 42, p => {
      for (let y = 10; y < 41; y++) { const w = 3 + (y > 36 ? 3 : 0) + Math.floor((y - 10) * 0.05); for (let x = 10 - w; x <= 9 + w; x++) p.P(x, y, x < 8 ? '#fffaf0' : x < 11 ? '#f0e2c4' : '#c8a870'); }
      for (const y of [16, 24, 32]) p.R(10 - 4, y, 8, 1, '#e0a030');
      p.R(8, 20, 3, 4, '#5a3a1a'); p.R(8, 34, 4, 6, '#3a2410'); p.P(9, 21, '#ffd040');
      p.E(10, 6, 5.5, 5.5, (x, y, nx, ny) => (nx * nx + ny * ny < 0.3 ? '#fffbe0' : '#ffc040'));
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; p.P(10 + Math.cos(a) * 8, 6 + Math.sin(a) * 8, '#ffd860'); }
    }),
  };
  const at = (g, img, tx, ty, ox = 0, oy = 0) => g.drawImage(img, Math.round(tx * 16 + 8 - img.width / 2 + ox), Math.round(ty * 16 + 16 - img.height + oy));
  for (const fr of frames) {
    const g = fr.getContext('2d');
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const c = f.tile(x, y);
      if (spr[c]) { g.fillStyle = 'rgba(20,30,10,.18)'; g.beginPath(); g.ellipse(x * 16 + 8, y * 16 + 15, 9, 2.5, 0, 0, TAU); g.fill(); at(g, spr[c](), x, y, 0, c === 'U' ? 3 : 2); }
      if (c === 'q') { g.fillStyle = '#3a2414'; g.fillRect(x * 16 + 2, y * 16, 12, 16); for (let yy = 0; yy < 16; yy += 3) { g.fillStyle = '#c8945a'; g.fillRect(x * 16 + 3, y * 16 + yy, 10, 2); g.fillStyle = '#e0b07a'; g.fillRect(x * 16 + 3, y * 16 + yy, 10, 1); } }
    }
  }
}

// ───── 迷宮的機關與裝飾（烘焙在地圖上）─────
function islBakeOverlay(f, r) {
  const def = f.def, th = LTH[def.theme], low = islTideLow(f.id), W = LIQ.water;
  const T = (x, y) => (x < 0 || y < 0 || x >= f.w || y >= f.h) ? '#' : f.grid[y][x];
  const wall = (x, y) => WALLS.has(T(x, y));
  const orbs = islOrbs(f.id);
  r.frames.forEach((fr, k) => {
    const g = fr.getContext('2d'), ph = k / 4 * TAU;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const c = T(x, y), X = x * 16, Y = y * 16;
      // 迷宮的牆：霧之森畫成樹叢，珊瑚洞窟加上珊瑚
      if (wall(x, y) && !wall(x, y + 1) && y + 1 < f.h) {
        if (def.theme === 'mist') { const v = (hash2(x, y, 3) * 3) | 0, t = LSpr.tree(v, false); g.drawImage(t, X - 1, Y + 16 - t.height + 2); }
        if (def.theme === 'coral' && hash2(x, y, 9) < 0.45) { const cc = ['#ff7a8a', '#ffa860', '#e860c0', '#ffd0a0'][(hash2(x, y, 4) * 4) | 0]; const bx = X + 3 + ((hash2(x, y, 5) * 8) | 0); px(g, bx, Y + 8, cc, 2, 7); px(g, bx - 2, Y + 6, cc, 2, 3); px(g, bx + 2, Y + 5, cc, 2, 4); px(g, bx, Y + 8, lighten(cc, 0.4), 1, 4); }
        continue;
      }
      if (wall(x, y) && def.theme === 'mist') { px(g, X, Y, '#0c1a12', 16, 16); const rr = seeded(x * 37 + y); for (let i = 0; i < 6; i++) px(g, X + ((rr() * 14) | 0), Y + ((rr() * 14) | 0), '#1a3422', 3, 2); continue; }
      switch (c) {
        case 'W': {
          if (!low) { px(g, X, Y, W[0], 16, 16); for (let yy = 0; yy < 16; yy += 3) for (let xx = 0; xx < 16; xx++) if (Math.sin((xx + X) * 0.5 + ph + yy) > 0.7) px(g, X + xx, Y + yy + ((xx + k) & 1), W[1], 1, 1); if (Math.sin(ph + x * 2.3 + y) > 0.2) px(g, X + ((x * 5 + k * 3) % 12), Y + 4 + (y % 3) * 3, W[2], 3, 1); if (T(x, y - 1) !== 'W') { px(g, X, Y, darken(W[0], 0.4), 16, 2); px(g, X, Y + 2, W[3], 16, 1); } }
          else { px(g, X, Y, '#b8a47a', 16, 16); const rr = seeded(x * 7 + y * 13); for (let i = 0; i < 10; i++) px(g, X + ((rr() * 15) | 0), Y + ((rr() * 15) | 0), rr() < 0.5 ? '#a08a60' : '#d0bc90', 2, 1); if ((x + y) % 3 === 0) { px(g, X + 4, Y + 9, '#5a9ac8', 6, 2); px(g, X + 5, Y + 9, '#9ad0f0', 3, 1); } if (hash2(x, y, 2) < 0.4) { px(g, X + 10, Y + 4, '#ff9ab0', 2, 1); px(g, X + 11, Y + 3, '#ffd0d8', 1, 1); } }
          break;
        }
        case 'V': {
          if (!low) {
            px(g, X, Y, W[0], 16, 16); for (let yy = 1; yy < 16; yy += 4) px(g, X, Y + yy + (k & 1), W[1], 16, 1);
            const bob = (k + x) % 2;
            px(g, X + 1, Y + 2 + bob, '#3a2414', 14, 12); for (let yy = 3; yy < 13; yy += 3) { px(g, X + 2, Y + yy + bob, '#c8945a', 12, 2); px(g, X + 2, Y + yy + bob, '#e8b884', 12, 1); }
            px(g, X + 1, Y + 6 + bob, '#5a3a20', 14, 1); px(g, X + 1, Y + 11 + bob, '#5a3a20', 14, 1);
          } else {
            const gr = g.createLinearGradient(0, Y, 0, Y + 16); gr.addColorStop(0, '#0a1820'); gr.addColorStop(1, '#1e3a44'); g.fillStyle = gr; g.fillRect(X, Y, 16, 16);
            px(g, X + 3, Y + 11, '#3a2a1a', 10, 3); px(g, X + 3, Y + 11, '#5a4028', 10, 1);
            if (T(x, y - 1) !== 'V') px(g, X, Y, th.face[1], 16, 2);
            if (T(x - 1, y) !== 'V') px(g, X, Y, '#06121a', 2, 16); if (T(x + 1, y) !== 'V') px(g, X + 14, Y, '#06121a', 2, 16);
          }
          break;
        }
        case 'J': {
          px(g, X + 3, Y + 10, '#3a3a4a', 10, 5); px(g, X + 4, Y + 10, '#7a7a8a', 8, 1); px(g, X + 6, Y + 11, '#1a1a2a', 4, 2);
          const ang = low ? 0.6 : -0.6;
          for (let i = 0; i < 9; i++) px(g, Math.round(X + 8 + Math.sin(ang) * i), Math.round(Y + 12 - Math.cos(ang) * i), '#8a6a3a', 2, 1);
          px(g, Math.round(X + 7 + Math.sin(ang) * 9), Math.round(Y + 11 - Math.cos(ang) * 9), low ? '#e05a4a' : '#4ab0e0', 3, 3);
          px(g, X + 1, Y + 13, low ? '#d8b878' : '#3a8ad8', 3, 2); px(g, X + 12, Y + 13, low ? '#d8b878' : '#3a8ad8', 3, 2);
          break;
        }
        case '1': case '2': case '3': case '4': {
          px(g, X + 7, Y + 4, '#5a3a20', 2, 11); px(g, X + 3, Y + 3, '#6a4424', 10, 2); px(g, X + 3, Y + 3, '#8a5a30', 10, 1);
          const bc = ['#e8c060', '#c8d8e8', '#e8a0b0', '#b0e0a0'][+c - 1];
          px(g, X + 5, Y + 5, darken(bc, 0.3), 6, 1); px(g, X + 4, Y + 6, bc, 8, 5); px(g, X + 3, Y + 10, darken(bc, 0.2), 10, 2); px(g, X + 5, Y + 6, lighten(bc, 0.5), 1, 3); px(g, X + 7, Y + 12, '#3a2a1a', 2, 1);
          px(g, X + 4, Y + 15, 'rgba(0,0,0,.25)', 8, 1);
          break;
        }
        case '6': {
          const lit = orbs.lit(x, y);
          px(g, X + 2, Y + 11, '#a88a5a', 12, 4); px(g, X + 2, Y + 11, '#e8d0a0', 12, 1); px(g, X + 3, Y + 14, '#6a5030', 10, 1);
          const oc = lit ? ['#fff8c0', '#ffd040', '#e08a20'] : ['#8a8070', '#5a5048', '#3a3430'];
          for (let yy = 0; yy < 9; yy++) for (let xx = 0; xx < 9; xx++) { const dx = xx - 4, dy = yy - 4; if (dx * dx + dy * dy > 18) continue; px(g, X + 4 + xx, Y + 2 + yy, dx + dy < -3 ? oc[0] : dx + dy > 2 ? oc[2] : oc[1], 1, 1); }
          if (lit && k % 2) { px(g, X + 7, Y, '#fff8c0', 2, 1); px(g, X + 2, Y + 5, '#fff8c0', 1, 2); px(g, X + 13, Y + 5, '#fff8c0', 1, 2); }
          break;
        }
        case '9': {
          px(g, X, Y, '#5a2a1a', 16, 16); const rr = seeded(x * 11 + y * 5);
          for (let i = 0; i < 5; i++) { let cx = (rr() * 16) | 0, cy = (rr() * 16) | 0; for (let j = 0; j < 6; j++) { px(g, X + (cx & 15), Y + (cy & 15), (j + k + x) % 4 === 0 ? '#fff0a0' : '#ff8a2a', 1, 1); cx += rr() < 0.5 ? 1 : -1; cy += rr() < 0.5 ? 1 : 0; } }
          g.fillStyle = `rgba(255,120,40,${0.12 + 0.08 * Math.sin(ph + x + y)})`; g.fillRect(X, Y, 16, 16);
          break;
        }
        case 'g': {
          if (F('thorn')) break;
          px(g, X, Y + 2, '#2a1a2a', 16, 14);
          for (let i = 0; i < 7; i++) { const yy = 2 + i * 2; px(g, X + ((i * 5) % 12), Y + yy, '#4a2a4a', 6, 2); px(g, X + ((i * 7 + 3) % 12), Y + yy + 1, '#6a3a6a', 4, 1); }
          for (let i = 0; i < 6; i++) px(g, X + 1 + i * 2.5, Y + 3 + (i % 3) * 4, '#ff5a8a', 1, 1);
          break;
        }
      }
      // 太陽塔：連線的日輪之間畫出光線
      if (c === '6' && orbs.links) for (const [x2, y2] of orbs.links(x, y)) {
        if (x2 < x || y2 < y) continue;
        const both = orbs.lit(x, y) && orbs.lit(x2, y2);
        g.fillStyle = both ? 'rgba(255,220,100,.85)' : 'rgba(200,160,90,.55)';
        if (y2 === y) g.fillRect(X + 13, Y + 7, (x2 - x) * 16 - 10, 2); else g.fillRect(X + 7, Y + 13, 2, (y2 - y) * 16 - 10);
      }
    }
  });
  // 塔頂：燃燒的小太陽
  if (f.id === 'sun4' && !F('solvi')) {
    r.frames.forEach((fr, k) => {
      const g = fr.getContext('2d'), cx = 10 * 16 + 8, cy = 2 * 16 + 4, ph = k / 4 * TAU;
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + ph * 0.25, l = 17 + (i % 2) * 5 + Math.sin(ph + i) * 2; g.strokeStyle = i % 2 ? 'rgba(255,170,60,.8)' : 'rgba(255,230,140,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke(); }
      for (let rr = 12; rr > 0; rr--) { g.fillStyle = mix('#fffbe0', '#ff9a2a', rr / 12); g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill(); }
    });
    r.lights.push({ x: 10 * 16 + 8, y: 2 * 16 + 4, r: 110, col: '255,190,90', fl: 0.2 });
  }
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const c = T(x, y);
    if (c === '6' && orbs.lit(x, y)) r.lights.push({ x: x * 16 + 8, y: y * 16 + 6, r: 40, col: '255,215,110', fl: 0.2 });
    if (c === '9' && (x + y) % 2 === 0) r.lights.push({ x: x * 16 + 8, y: y * 16 + 8, r: 22, col: '255,110,40', fl: 0.2 });
    if (c === '~' && def.theme === 'coral') r.lights.push({ x: x * 16 + 8, y: y * 16 + 8, r: 26, col: '120,220,255', fl: 0 });
  }
}
{
  const bake0 = LocalBake.bake.bind(LocalBake);
  LocalBake.bake = function (f) { const r = bake0(f); if (f.def.isl && f.def.kind === 'dungeon') islBakeOverlay(f, r); return r; };
}

// ───── 珊瑚洞窟：潮汐拉桿 ─────
async function tideLever() {
  const id = Field.id, low = islTideLow(id);
  Snd.play('door'); await sleep(200);
  G.flags['tide:' + id] = !low;
  Snd.play(low ? 'wind' : 'swamp'); Field.shake(0.35);
  Field.rebake();
  await UI.say(low ? '拉下了潮汐拉桿……\n轟隆隆——海水湧了進來，潮水漲起來了！' : '拉下了潮汐拉桿……\n嘩啦啦——海水退了出去，水道露出來了！');
}

// ───── 霧之森：迷途之森與鐘之謎 ─────
const MIST_SEQ = ['N', 'W', 'N', 'E'];
const MIST_PATHS = { N: [11, 1, 12, 6], E: [16, 9, 22, 10], W: [1, 9, 7, 10] };
async function mistExit(d) {
  const st = Field.mistStep || 0;
  if (d === MIST_SEQ[st]) {
    if (st + 1 >= MIST_SEQ.length) {
      Field.mistStep = 0;
      Snd.play('holy');
      await UI.say('螢火蟲聚成一道光，濃霧向兩旁散開了……', '森林深處，傳來了鐘聲。');
      await Game.go('mist2', 10, 16, 'up');
      return;
    }
    await Game.fadeOut(0.35);
    Field.load('mist1', 10 + (st % 2), 10, 'up', { quiet: true }); Field.mistStep = st + 1;
    await Game.fadeIn(0.35);
    await UI.say(['霧好像稍微變淡了。螢火蟲往另一個方向飛去……', '螢火蟲越聚越多了。', '遠處隱約聽得到鐘聲……'][st] || '霧好像稍微變淡了。');
  } else {
    await Game.fadeOut(0.35);
    Field.load('mist1', 11, 11, 'up', { quiet: true }); Field.mistStep = 0;
    await Game.fadeIn(0.35);
    await UI.say('……四周的景色看起來一模一樣。', '好像又繞回了原地。（螢火蟲在哪裡呢？）');
  }
}
const BELL_PITCH = { 1: 523, 2: 587, 3: 659, 4: 784 };
async function ringBell(x, y, c) {
  if (F('thorn')) { Snd.bell(BELL_PITCH[c], 0.25); Field.ring(x, y, '200,255,220', 4, 1); return UI.say('鐘柱輕輕地響了。'); }
  Snd.bell(BELL_PITCH[c], 0.32); Field.ring(x, y, '200,255,220', 6, 1.4);
  const seq = Field.bellSeq = (Field.bellSeq || '') + c;
  if ('1234'.startsWith(seq)) {
    if (seq.length === 4) {
      await sleep(500);
      for (const [n, t] of [[1, 0], [2, 180], [3, 360], [4, 540]]) setTimeout(() => Snd.bell(BELL_PITCH[n] * 2, 0.22), t);
      await sleep(900);
      G.flags.thorn = true; Field.bellSeq = ''; Field.rebake(); Field.shake(0.4); Snd.play('holy');
      await UI.say('四口鐘的聲音合成了一首歌。', '北邊的荊棘慢慢地退開了！');
      return;
    }
    return UI.say(['鐘聲在林間迴盪。', '兩個鐘聲疊在一起，像在說話。', '三個鐘聲……還差一個。'][seq.length - 1]);
  }
  Field.bellSeq = '';
  await sleep(300); Snd.play('debuff');
  await UI.say('鐘聲亂成一團，又安靜了下來。', '（好像要照著某種順序敲。）');
}

// ───── 曜日之塔：日輪石 ─────
function islOrbs(id) {
  const rows = MAP_ROWS[id] || [], pos = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '6') pos.push([x, y]); }));
  const def = MAPS[id] || {}, mode = def.orbs;
  const key = (x, y) => `orb:${id}:${x},${y}`;
  const links = mode === 'line' ? (x, y) => { const s = pos.slice().sort((a, b) => a[0] - b[0]), i = s.findIndex(p => p[0] === x && p[1] === y); return [s[i - 1], s[i + 1]].filter(Boolean); }
    : mode === 'grid' ? (x, y) => { const xs = [...new Set(pos.map(p => p[0]))].sort((a, b) => a - b), ys = [...new Set(pos.map(p => p[1]))].sort((a, b) => a - b), i = xs.indexOf(x), j = ys.indexOf(y); return [[xs[i - 1], y], [xs[i + 1], y], [x, ys[j - 1]], [x, ys[j + 1]]].filter(p => p[0] !== undefined && p[1] !== undefined); }
    : null;
  return { pos, links, lit: (x, y) => F(key(x, y)), set: (x, y, v) => { G.flags[key(x, y)] = v; }, all: () => pos.every(([x, y]) => F(key(x, y))) };
}
async function touchOrb(x, y) {
  const id = Field.id, O = islOrbs(id), door = `door:${id}:10,4`;
  if (F(door)) return UI.say('日輪石安靜地發著光。');
  const targets = O.links ? [[x, y], ...O.links(x, y)] : [[x, y]];
  if (!O.links && O.lit(x, y)) return UI.say('日輪石已經在發光了。');
  for (const [a, b] of targets) O.set(a, b, !O.lit(a, b));
  Snd.play(O.lit(x, y) ? 'holy' : 'debuff'); Field.rebake();
  if (O.all()) {
    await sleep(400);
    G.flags[door] = true; Field.rebake(); Field.shake(0.4); Snd.play('door'); Game.flashWhite = 0.4;
    await UI.say('所有的日輪石同時亮了起來！', '轟隆——封住樓梯的光之門打開了。');
  } else if (O.links) await UI.say(O.lit(x, y) ? '日輪石亮了起來。相連的日輪也跟著轉動了。' : '日輪石暗了下來。相連的日輪也跟著轉動了。');
  else await UI.say(`日輪石亮了起來！（還剩 ${O.pos.filter(([a, b]) => !O.lit(a, b)).length} 顆）`);
}

// ───── 互動、踩到的格子、離開迷宮 ─────
{
  const int0 = Field.interact.bind(Field);
  Field.interact = function () {
    const p = this.leader(), [dx, dy] = DIRS[p.dir], tx = p.x + dx, ty = p.y + dy, c = this.tile(tx, ty);
    if (!this.isWorld() && !this.npcAt(tx, ty)) {
      if (c === 'J' && this.def.tide) { this.run(tideLever); return; }
      if ('1234'.includes(c) && c.length === 1 && this.id === 'mist2') { this.run(() => ringBell(tx, ty, c)); return; }
      if (c === '6' && this.def.orbs) { this.run(() => touchOrb(tx, ty)); return; }
      if (c === 'g' && !F('thorn')) { this.run(() => UI.say('長滿尖刺的荊棘擋住了去路。', '荊棘上纏著四條褪色的鈴鐺緞帶……')); return; }
      if (c === 'D' && !this.passable(tx, ty) && this.def.isl) { this.run(() => UI.say(this.id === 'coral2' ? '刻滿潮汐紋路的石門緊緊關著。\n門上寫著：「暮鐘響起之時，深淵之門將會開啟。」' : '金色的光之門緊緊關著。\n（點亮這一層所有的日輪石，門就會打開。）')); return; }
      if (c === 'Q' && this.id === 'tide') { this.run(() => duskBellTalk()); return; }
    }
    return int0();
  };
  const step0 = Field.onStep.bind(Field);
  Field.onStep = function () {
    const p = this.leader(), x = p.x, y = p.y, c = this.tile(x, y);
    if (this.id === 'isles') {
      if (ISL_LOCS[c]) { const [id, ex, ey, ed] = ISL_LOCS[c]; G.x = x; G.y = y; this.run(() => Game.go(id, ex, ey, ed, { from: 'world' })); return; }
      if (c === 'q') { G.x = x; G.y = y; this.run(() => islDockEvent()); return; }
      if (x === 32 && y === 15 && !F('sandbar')) { G.x = x; G.y = y; this.run(() => sandbarEvent()); return; }
    } else if (this.def.worldMap && c === 'E' && !(this.def.exits || []).some(e => e.x === x && e.y === y)) {
      const w = this.def.world; Snd.play('door'); this.run(() => Game.go(this.def.worldMap, w[0], w[1], 'down')); return;
    }
    if (c === '9' && !this.isWorld()) {
      Snd.play('swamp'); Game.flashRed = 0.2;
      for (const m of G.party) if (m.hp > 0) m.hp = Math.max(1, m.hp - Math.max(3, Math.round(Party.stats(m).mhp * 0.03)));
    }
    return step0();
  };
  const ld0 = Field.load.bind(Field);
  Field.load = function (id, ...a) {
    if (id !== this.id) { this.mistStep = 0; this.bellSeq = ''; }
    ld0(id, ...a);
    if (id === 'isles') this.vehicles = [MoonBoat.make(17, 37, -1)];
    if (id === 'port' && F('eve')) this.vehicles = (this.vehicles || []).concat(MoonBoat.make(30.4, 13, -1));
  };
}

// ───── 月帆船（伊芙的小船）─────
const MoonBoat = {
  spr() {
    return LSpr.get('moonboat', 30, 28, p => {
      for (let x = 2; x <= 27; x++) { const top = 19 - (x > 23 ? (x - 23) * 0.9 : 0) - (x < 5 ? (5 - x) * 0.6 : 0), bot = 25 - Math.max(0, x - 22) * 0.9 - Math.max(0, 6 - x) * 0.9; for (let y = Math.round(top); y <= Math.round(bot); y++) p.P(x, y, y === Math.round(top) ? '#8a7ab8' : y > bot - 1.5 ? '#2a2450' : y === 21 ? '#f2c14e' : '#4a3a7a'); }
      p.R(14, 2, 1, 17, '#5a3a20');
      for (let y = 3; y <= 16; y++) { const w = Math.round(Math.sin((y - 3) / 13 * Math.PI) * 8); for (let x = 15; x <= 15 + w; x++) p.P(x, y, x > 13 + w ? '#d8d0e8' : '#f8f4ff'); for (let x = 13 - Math.round(w * 0.6); x < 14; x++) p.P(x, y, '#ece6f8'); }
      p.E(18.5, 9.5, 2.6, 3.2, (x, y, nx) => (nx > 0.2 ? null : '#f2c14e')); p.P(17, 8, '#fff4b0');
      p.R(24, 14, 1, 5, '#5a3a20'); p.R(23, 12, 3, 2, '#ffd98a'); p.P(24, 12, '#ffffff');
      p.R(15, 0, 4, 2, '#8a6ad8');
    }, true);
  },
  make(x, y, face) {
    const v = { x, y, face, ph: 0.6 };
    v.draw = (g, X, Y, T) => {
      const img = this.spr(), k = T / 16, bob = Math.round(Math.sin(Field.t * 2.2 + 1) * k), w = img.width * k, h = img.height * k, cx = X + T / 2, base = Y + T * 0.95 + bob;
      g.fillStyle = '#f4fbff';
      const nW = v.moving ? 12 : 4, back = v.face < 0 ? 1 : -1;
      for (let i = 0; i < nW; i++) { const ph = (Field.t * (v.moving ? 1.3 : 0.5) + i / nW) % 1, d = w * 0.36 + ph * w * (v.moving ? 1.1 : 0.4), sp = (1 + ph * (v.moving ? 6 : 3)) * k; g.globalAlpha = (1 - ph) * 0.8; for (const sg of [-1, 1]) g.fillRect(Math.round(cx + back * d), Math.round(base - k * 2 + sg * sp), Math.max(k, Math.round(k * 3 * (1 - ph))), k); }
      g.globalAlpha = 1; g.fillStyle = 'rgba(10,30,70,.28)'; g.fillRect(Math.round(cx - w * 0.4), Math.round(base - k), Math.round(w * 0.8), k * 2);
      g.save(); g.translate(Math.round(cx), 0); if (v.face < 0) g.scale(-1, 1); g.drawImage(img, Math.round(-w / 2), Math.round(base - h), w, h); g.restore();
      // 船頭的小燈
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + Math.sin(Field.t * 3) * 0.1; const lx = cx + (v.face < 0 ? -1 : 1) * w * 0.3; g.drawImage(FieldFx.glowSpr('255,220,140'), lx - 8 * k, base - h * 0.55 - 8 * k, 16 * k, 16 * k); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    };
    return v;
  },
  async sail(map, from, to) {
    Field.load(map, from[0], from[1], 'up', { quiet: true });
    const path = Ferry.path(from, to);
    const v = this.make(from[0], from[1], to[0] > from[0] ? 1 : -1); v.moving = true;
    Field.vehicles = [v]; Field.hideParty = true; Field.cineT = 1;
    const setPos = (x, y) => { v.x = x; v.y = y; for (const p of Field.party) { p.x = Math.round(x); p.y = Math.round(y); p.fx = p.x; p.fy = p.y; p.t = 1; } };
    setPos(from[0], from[1]);
    await Game.fadeIn(0.5);
    Snd.play('wind');
    if (path) {
      let seg = 0;
      await new Promise(res => {
        const lay = { modal: true, draw() { } };
        lay.update = dt => {
          const a = path[seg], b = path[seg + 1]; if (!b) { UI.remove(lay); res(); return; }
          v.k = (v.k || 0) + dt * 3.2 * (window.__speed || 1);
          if (b[0] !== a[0]) v.face = b[0] > a[0] ? 1 : -1;
          if (v.k >= 1) { v.k = 0; seg++; setPos(b[0], b[1]); return; }
          setPos(lerp(a[0], b[0], v.k), lerp(a[1], b[1], v.k));
        };
        UI.push(lay);
      });
    }
    v.moving = false;
    await sleep(300);
    Field.cineT = 0; Field.hideParty = false;
  },
};
async function sailToIsles() {
  await Game.fadeOut(0.5);
  await Game.story(['月帆船乘著北風，朝著南方的海平線駛去。', '海越來越藍，太陽卻一直掛在頭頂上，一動也不動……'], true);
  await MoonBoat.sail('isles', [27, 39], [17, 37]);
  await Game.fadeOut(0.3);
  Field.load('isles', 17, 35, 'up', { quiet: true });
  await Game.fadeIn(0.4);
  if (!F('isl')) await islesArrival();
}
async function islDockEvent() {
  if (!await UI.yesno('伊芙的月帆船停在碼頭邊。要搭船回白帆港嗎？')) return;
  await Game.fadeOut(0.5);
  await MoonBoat.sail('isles', [17, 37], [27, 39]);
  await Game.fadeOut(0.35);
  await Game.story(['月帆船乘著南風，駛回了白帆港。'], true);
  await Game.go('port', 29, 11, 'left', { from: 'ferry' });
}

// ───── 月光貝（隱藏收集品）─────
const SHELLS = [['isles', 4, 33], ['isles', 46, 24], ['tide', 2, 22], ['coral1', 13, 13], ['mist1', 2, 10], ['sun1', 17, 13]];
const shellCount = () => SHELLS.filter(([m, x, y]) => F(`sh:${m}:${x},${y}`)).length;
{
  const int1 = Field.interact.bind(Field);
  Field.interact = function () {
    const p = this.leader(), [dx, dy] = DIRS[p.dir];
    const s = SHELLS.find(([m, x, y]) => m === this.id && !F(`sh:${m}:${x},${y}`) && ((x === p.x && y === p.y) || (x === p.x + dx && y === p.y + dy && this.passable(x, y))));
    if (s) { this.run(async () => { G.flags[`sh:${s[0]}:${s[1]},${s[2]}`] = true; Snd.play('chest'); Game.flashWhite = 0.25; await UI.say(`沙子裡有什麼東西在發著淡淡的光……\n撿到了月光貝！（${shellCount()} / ${SHELLS.length}）`); }); return; }
    return int1();
  };
}

// ───── 地圖特效：群島的熱氣、洞窟的泡泡、森林的霧與螢火蟲、塔裡的火星 ─────
{
  const up0 = FieldFx.update.bind(FieldFx);
  FieldFx.update = function (dt, f) {
    const isl = f.id === 'isles';
    if (isl) { const pf = Object.create(f); pf.isWorld = () => false; pf.def = { theme: null }; up0(dt, pf); } else up0(dt, f);
    if (!isl && !f.def.isl) return;
    const sp = window.__speed || 1; dt *= sp;
    const p = f.leader(); if (!p) return;
    const vw = L.V.w / L.k, vh = L.V.h / L.k, cx = (p.x + 0.5) * 16, cy = (p.y + 0.5) * 16;
    const rand = (a, b) => a + Math.random() * (b - a);
    const add = o => { if (this.parts.length < (Game.lowFx ? 70 : 260)) this.parts.push(o); };
    const th = f.def.theme;
    if (isl) {
      if (!F('dusk') && Math.random() < dt * 6) add({ k: 'heat', x: cx + rand(-vw * 0.6, vw * 0.6), y: cy + rand(-vh * 0.5, vh * 0.5), vx: rand(-2, 2), vy: rand(-10, -5), life: 2.5, t: 0 });
      if (F('dusk') && Math.random() < dt * 2.5) add({ k: 'fly', x: cx + rand(-vw * 0.5, vw * 0.5), y: cy + rand(-vh * 0.5, vh * 0.5), vx: rand(-4, 4), vy: rand(-4, 4), life: 5, t: 0, ph: rand(0, 6) });
    } else if (th === 'coral') {
      if (Math.random() < dt * 7) add({ k: 'bubble', x: cx + rand(-vw * 0.6, vw * 0.6), y: cy + vh * 0.55, vx: 0, vy: rand(-16, -8), life: 7, t: 0, ph: rand(0, 6), s: Math.random() < 0.3 ? 2 : 1 });
    } else if (th === 'mist') {
      if (Math.random() < dt * 2.2) add({ k: 'fog', x: cx + rand(-vw * 0.7, vw * 0.5), y: cy + rand(-vh * 0.5, vh * 0.5), vx: rand(4, 9), vy: rand(-1, 1), life: 7, t: 0, s: rand(18, 34) });
      if (f.id === 'mist1') {
        const pth = MIST_PATHS[MIST_SEQ[f.mistStep || 0]];
        if (Math.random() < dt * 9) add({ k: 'fly', x: rand(pth[0], pth[2] + 1) * 16, y: rand(pth[1], pth[3] + 1) * 16, vx: rand(-4, 4), vy: rand(-4, 4), life: 3.5, t: 0, ph: rand(0, 6) });
      } else if (Math.random() < dt * 2) add({ k: 'fly', x: cx + rand(-vw * 0.5, vw * 0.5), y: cy + rand(-vh * 0.5, vh * 0.5), vx: rand(-4, 4), vy: rand(-4, 4), life: 5, t: 0, ph: rand(0, 6) });
    } else if (th === 'sun') {
      if (Math.random() < dt * 8) add({ k: 'ember', x: cx + rand(-vw * 0.6, vw * 0.6), y: cy + vh * 0.55, vx: rand(-5, 5), vy: rand(-22, -12), life: 6, t: 0, ph: rand(0, 6) });
    }
    for (const q of this.parts) { if (q.k === 'bubble') q.x += Math.sin(q.t * 3 + q.ph) * 6 * dt; if (q.k === 'fly' && th === 'mist') { q.vx += rand(-20, 20) * dt; q.vy += rand(-20, 20) * dt; q.vx = clamp(q.vx, -8, 8); q.vy = clamp(q.vy, -8, 8); } }
  };
  const wf0 = FieldFx.drawWorldFx.bind(FieldFx);
  FieldFx.drawWorldFx = function (g, f, sx0, sy0, k, T) {
    if (f.id === 'isles') {
      // 群島：雲影自己畫（不要畫到主大陸的星之祭壇光柱）
      const t = f.t, V = L.V;
      if (!this.clouds2) { const r = seeded(19); this.clouds2 = Array.from({ length: 7 }, () => ({ x: r() * 900, y: r() * 700, w: 50 + r() * 60, h: 20 + r() * 20 })); }
      g.fillStyle = 'rgba(10,20,40,.10)';
      for (const c of this.clouds2) { const X = sx0 + (((c.x + t * 5) % 900) - 80) * k, Y = sy0 + c.y * k; if (X > V.x + V.w + c.w * k || X < V.x - c.w * 2 * k || Y < V.y - c.h * 2 * k || Y > V.y + V.h + c.h * k) continue; g.beginPath(); g.ellipse(X, Y, c.w * k, c.h * k, 0, 0, TAU); g.fill(); }
      const pf = Object.create(f); pf.isWorld = () => false; wf0(g, pf, sx0, sy0, k, T);
    } else wf0(g, f, sx0, sy0, k, T);
    // 新的粒子
    for (const q of this.parts) {
      if (q.k !== 'bubble' && q.k !== 'fog' && q.k !== 'heat') continue;
      const X = sx0 + q.x * k, Y = sy0 + q.y * k, a = Math.min(1, q.t * 2, (q.life - q.t) * 1.2);
      if (q.k === 'bubble') { g.globalAlpha = a * 0.7; g.fillStyle = '#c8f4ff'; g.fillRect(X, Y, k * q.s, k * q.s); g.globalAlpha = a * 0.35; g.fillRect(X - k, Y, k, k * q.s); }
      else if (q.k === 'fog') { g.globalAlpha = a * 0.16; g.fillStyle = '#e8eef4'; g.fillRect(X - q.s * k, Y - q.s * 0.35 * k, q.s * 2 * k, q.s * 0.7 * k); }
      else { g.globalAlpha = a * 0.25; g.fillStyle = '#fff4d0'; g.fillRect(X, Y, k * 3, k * 0.6); }
    }
    g.globalAlpha = 1;
    // 月光貝的閃光
    const p = f.leader();
    for (const [m, x, y] of SHELLS) {
      if (m !== f.id || F(`sh:${m}:${x},${y}`) || Math.abs(x - p.x) > 4 || Math.abs(y - p.y) > 4) continue;
      const ph = (f.t * 0.9 + x * 0.29) % 1; if (ph > 0.4) continue;
      const a = Math.sin(ph / 0.4 * Math.PI), X = sx0 + (x * 16 + 8) * k, Y = sy0 + (y * 16 + 10) * k;
      g.globalAlpha = a; g.fillStyle = '#e8d8ff'; g.fillRect(X - k * 3, Y, k * 7, k); g.fillRect(X, Y - k * 3, k, k * 7); g.fillStyle = '#ffffff'; g.fillRect(X - k, Y - k, k * 3, k * 3);
    }
    g.globalAlpha = 1;
  };
}
