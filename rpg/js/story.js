'use strict';
// 曉鐘傳說：地圖設定、人物、劇情與支線任務
const countStones = () => ['stone1', 'stone2', 'stone3', 'stone4', 'stone5'].filter(s => Bag.has(s)).length;
const JOIN_EQ = {
  lia: { w: 'oakstaff', a: 'robe', h: 'cap' },
  mira: { w: 'magestaff', a: 'magerobe', h: 'pointhat' },
  balk: { w: 'axe', a: 'ironarmor', s: 'ironshield', h: 'ironhelm' },
};
const S = {
  async get(item, n = 1, text) { Bag.add(item, n); Music.jingle('item'); await UI.say(text || `得到了${itemInfo(item).name}！`); },
  async join(id) {
    const avg = G.party.reduce((s, m) => s + m.lv, 0) / G.party.length;
    const lv = Math.max({ lia: 4, mira: 10, balk: 16 }[id], Math.round(avg) - 1);
    const m = Party.make(id, lv);
    Object.assign(m.eq, JOIN_EQ[id]);
    const s = Party.stats(m); m.hp = s.mhp; m.mp = s.mmp;
    G.party.push(m);
    const L0 = Field.leader();
    Field.party.push({ x: L0.x, y: L0.y, fx: L0.x, fy: L0.y, dir: L0.dir, t: 1 });
    Music.jingle('join');
    await UI.say(`${CHARS[id].name}加入了隊伍！`);
  },
  async boss(ids, o = {}) {
    Snd.play('boss'); await Game.swirl(true);
    const r = await runBattle(ids, Object.assign({ boss: true, music: 'boss' }, o));
    if (r === 'lose') { await Game.wipe(); return false; }
    return true;
  },
  async fight(ids, o = {}) {
    Snd.play('encounter'); await Game.swirl();
    const r = await runBattle(ids, Object.assign({ noRun: true }, o));
    if (r === 'lose') { await Game.wipe(); return false; }
    return true;
  },
};

// ───── 地圖 ─────
const MAPS = {
  world: { kind: 'world', name: '晨曦大陸', music: 'field' },

  maple: {
    kind: 'town', theme: 'town', name: '楓葉村', music: 'town', entry: [13, 20, 'up'], world: [9, 8], revive: [22, 14],
    signs: { '15,20': '「楓葉村」\n北邊的小屋是曉鐘的鐘樓。\n東北方的森林深處是苔蘚洞窟，南方的山口通往白帆港。' },
    onEnter() { if (!F('intro')) Field.run(introEvent); },
    npcs: [
      { x: 3, y: 3, spr: 'grandpa', dir: 'right', fixed: 1, talk: grandpaTalk },
      { x: 22, y: 3, spr: 'merchant', talk: () => shop('maple_w', '武器店老闆：「歡迎！冒險之前先把裝備買齊吧。」') },
      { x: 4, y: 15, spr: 'woman2', dir: 'up', talk: () => shop('maple_i', '道具店：「藥草要多帶幾株喔！」') },
      { x: 15, y: 13, spr: 'man2', dir: 'left', talk: () => inn(4) },
      { x: 22, y: 13, spr: 'priest', talk: () => church() },
      { x: 8, y: 10, spr: 'girl', wander: 1, if: () => !F('cat_done'), talk: catGirl },
      { x: 8, y: 10, spr: 'girl', if: () => F('cat_done'), talk: () => UI.say('小萌：「小花回來以後每天都黏著我。謝謝你，洛恩哥哥！」') },
      { x: 9, y: 10, spr: 'cat', if: () => F('cat_done'), talk: () => UI.say('小花：「喵嗚～」\n牠用頭蹭了蹭洛恩的腳。') },
      { x: 20, y: 10, spr: 'man2', wander: 1, talk: () => F('d1') ? UI.say('樵夫：「南邊山口的倒木我已經清掉啦！」', '樵夫：「沿著路往南走，就能到海邊的白帆港。」') : UI.say('樵夫：「南邊的山口有棵大樹倒下來，把路堵住了。」', '樵夫：「可是洞窟的魔物一直在吵，我不敢上山……要是有人能讓牠們安靜下來就好了。」') },
      { x: 17, y: 7, spr: 'woman', wander: 1, talk: () => UI.say(F('nox') ? '村姑：「太陽好亮啊！好久沒看到這麼漂亮的早晨了。」' : '村姑：「明明是白天，天空卻灰濛濛的……太陽好像越來越暗了。」') },
      { x: 6, y: 18, spr: 'boy', wander: 1, talk: () => UI.say('男孩：「托爾爺爺說，曉鐘一響，魔物都會嚇得躲起來！」', '男孩：「洛恩哥哥，你什麼時候才能自己敲鐘啊？」') },
      { x: 24, y: 9, spr: 'oldwoman', wander: 1, talk: () => UI.say('老婆婆：「傳說五百年前，黯王諾克斯被曉鐘的光封印在北方海上的孤島。」', '老婆婆：「那座島四周都是急流，誰也到不了……」') },
      { x: 13, y: 3, spr: 'boy', dir: 'down', if: () => !F('d1'), talk: () => UI.say('見習生：「鐘樓的門昨晚被撞壞了……爺爺他還好嗎？」') },
      { x: 10, y: 6, spr: 'man', wander: 1, talk: () => UI.say('村人：「把東西放進「道具」裡，在野外按選單就能用。」', '村人：「累了就去旅店休息，記得到教會跟神父說話記錄冒險。」') },
    ],
  },
  port: {
    kind: 'town', theme: 'port', name: '白帆港', music: 'town', entry: [1, 11, 'right'], world: [23, 33], revive: [5, 5],
    signs: { '2,11': '「白帆港」\n往南走到半島盡頭是風鳴燈塔。\n東北方的山腳下有一座舊礦坑。' },
    npcs: [
      { x: 6, y: 3, spr: 'lia', dir: 'down', if: () => !F('lia'), talk: liaTalk },
      { x: 5, y: 4, spr: 'priest', talk: () => church() },
      { x: 15, y: 3, spr: 'merchant', talk: () => shop('port_w', '武器防具店：「港口的貨最齊全！」') },
      { x: 5, y: 17, spr: 'woman', dir: 'up', talk: () => shop('port_i', '道具店：「出海、進礦坑都用得到，看看吧！」') },
      { x: 17, y: 14, spr: 'man', dir: 'left', talk: () => inn(9) },
      { x: 27, y: 11, spr: 'captain', dir: 'left', talk: captainTalk },
      { x: 21, y: 17, spr: 'miner', dir: 'down', talk: minerTalk },
      { x: 13, y: 10, spr: 'sailor', wander: 1, talk: () => UI.say(F('d2') ? '水手：「燈塔又亮起來了！今晚可以安心出海囉！」' : '水手：「燈塔的燈熄了以後，海上全是兇巴巴的怪鳥，船都不敢出港。」', '水手：「燈塔就在南邊半島的盡頭。」') },
      { x: 8, y: 21, spr: 'woman2', wander: 1, talk: () => UI.say('婦人：「聽說燈塔裡住進了一隻好大的鳥，翅膀一拍就是一陣暴風。」') },
      { x: 20, y: 6, spr: 'boy', wander: 1, talk: () => UI.say('男孩：「東方大陸有一片好大的沙漠，沙漠裡有一座金色的城喔！」') },
      { x: 23, y: 21, spr: 'sailor', wander: 1, talk: () => UI.say('漁夫：「舊礦坑最深處好像有會發光的鼴鼠，跑得超快，打倒牠能得到好多經驗。」') },
    ],
  },
  sand: {
    kind: 'town', theme: 'sand', name: '砂金城', music: 'town', entry: [14, 24, 'up'], world: [54, 34], revive: [25, 20],
    signs: { '17,22': '「砂金城」\n往東南方的沙漠深處走，就是古王陵墓。\n北方山脈的關卡需要通行證才能通過。' },
    npcs: [
      { x: 14, y: 2, spr: 'queen', fixed: 1, talk: queenTalk },
      { x: 12, y: 4, spr: 'guard', talk: () => UI.say('侍衛：「女王陛下很擔心宮廷魔法師米菈大人。」') },
      { x: 17, y: 4, spr: 'guard', talk: () => UI.say('侍衛：「北方關卡的守衛只認女王的印章。」') },
      { x: 13, y: 8, spr: 'guard', talk: () => UI.say('門衛：「這裡是砂金城的王宮。請保持安靜。」') },
      { x: 16, y: 8, spr: 'guard', talk: () => UI.say('門衛：「歡迎來到沙漠的明珠——砂金城。」') },
      { x: 4, y: 11, spr: 'desert', dir: 'right', talk: () => shop('sand_w', '武器防具店：「沙漠裡的魔物很硬，好武器不能少！」') },
      { x: 3, y: 19, spr: 'desertw', dir: 'right', talk: () => shop('sand_i', '道具店：「魔力水是我們的特產，很貴，但很有用喔。」') },
      { x: 25, y: 10, spr: 'desert', dir: 'left', talk: () => inn(18) },
      { x: 25, y: 19, spr: 'priest', talk: () => church() },
      { x: 12, y: 20, spr: 'desertw', dir: 'left', talk: motherTalk },
      { x: 10, y: 21, spr: 'girl', dir: 'up', fixed: 1, talk: () => F('herb_done') ? UI.say('女孩：「謝謝大哥哥大姊姊！我已經可以跑來跑去了！」') : UI.say('女孩睡得很沉，額頭燙燙的……') },
      { x: 17, y: 15, spr: 'scholar', wander: 1, talk: () => UI.say(F('mira') ? '學者賽門：「米菈那孩子跟著你們，我就放心了。她的火球可是我教的！」' : '學者賽門：「我的學生米菈跑去古王陵墓調查奇怪的聲音，到現在還沒回來……」', '學者賽門：「陵墓在城的東南方，沙漠的深處。」') },
      { x: 7, y: 16, spr: 'desert', wander: 1, talk: () => UI.say('商人：「沙漠裡的金色甲蟲會逃跑，可是牠帶著很多金幣喔。」') },
      { x: 22, y: 16, spr: 'desertw', wander: 1, talk: () => UI.say('舞孃：「北方的山上全是雪，聽說那邊的人從來沒見過太陽。」') },
    ],
  },
  snow: {
    kind: 'town', theme: 'snow', name: '霜鈴村', music: 'town', entry: [13, 20, 'up'], world: [54, 12], revive: [21, 14],
    signs: { '15,19': '「霜鈴村」\n東北方高聳的是冰晶塔。\n往西北走到海岸，可以看見古老的星之祭壇。' },
    npcs: [
      { x: 7, y: 5, spr: 'balk', dir: 'down', if: () => !F('balk'), talk: balkTalk },
      { x: 4, y: 4, spr: 'grandpa', talk: chiefTalk },
      { x: 14, y: 3, spr: 'smith', talk: smithTalk },
      { x: 23, y: 3, spr: 'snoww', talk: () => shop('snow_i', '道具店：「雪地裡很冷，多帶點藥吧。」') },
      { x: 8, y: 13, spr: 'snowm', dir: 'left', talk: () => inn(30) },
      { x: 21, y: 13, spr: 'priest', talk: () => church() },
      { x: 18, y: 10, spr: 'snoww', wander: 1, talk: () => UI.say(F('d4') ? '村婦：「暴風雪停了！屋頂上的雪終於可以清掉了。」' : '村婦：「暴風雪已經下了一個月，柴火都快燒完了……」') },
      { x: 6, y: 9, spr: 'boy', wander: 1, talk: () => UI.say('男孩：「巴爾克隊長是村裡最強的戰士！他一斧頭可以劈開一棵大樹！」') },
      { x: 22, y: 20, spr: 'snowm', wander: 1, talk: () => UI.say('獵人：「冰晶塔的地板滑溜溜的，一踩上去就停不下來。」', '獵人：「要靠石頭擋住自己，先想好路線再走。」') },
      { x: 9, y: 19, spr: 'oldwoman', talk: () => UI.say('老婆婆：「這些墓是被暴風雪帶走的人……」', '老婆婆：「孩子，替我們把春天找回來吧。」') },
    ],
  },

  cave1: {
    kind: 'dungeon', theme: 'cave', name: '苔蘚洞窟 B1', short: '苔蘚洞窟', music: 'dungeon', dark: 1, enc: 'd1', entry: [10, 17, 'up'], world: [16, 4],
    exits: [{ x: 20, y: 2, to: 'cave2', tx: 20, ty: 16 }],
    chests: { '4,3': { item: 'herb', n: 3 }, '3,9': { gold: 60 } },
    npcs: [{ x: 23, y: 16, spr: 'cat', if: () => !F('cat_found'), talk: catFound }],
  },
  cave2: {
    kind: 'dungeon', theme: 'cave', name: '苔蘚洞窟 B2', short: '苔蘚洞窟', music: 'dungeon', dark: 1, enc: 'd1',
    exits: [{ x: 20, y: 16, to: 'cave1', tx: 20, ty: 2 }],
    chests: { '4,9': { item: 'leather' }, '21,8': { item: 'antidote', n: 3 } },
    npcs: [{ x: 13, y: 2, mon: 'mushking', if: () => !F('d1'), talk: bossMushking }],
  },
  tower1: {
    kind: 'dungeon', theme: 'tower', name: '風鳴燈塔 1F', short: '風鳴燈塔', music: 'tower', enc: 'd2', entry: [10, 15, 'up'], world: [4, 43],
    exits: [{ x: 3, y: 3, to: 'tower2', tx: 3, ty: 3 }],
    chests: { '16,3': { item: 'herb2', n: 2 } },
  },
  tower2: {
    kind: 'dungeon', theme: 'tower', name: '風鳴燈塔 2F', short: '風鳴燈塔', music: 'tower', enc: 'd2',
    exits: [{ x: 3, y: 3, to: 'tower1', tx: 3, ty: 3 }, { x: 3, y: 14, to: 'tower3', tx: 3, ty: 14 }],
    chests: { '16,3': { gold: 300 } },
  },
  tower3: {
    kind: 'dungeon', theme: 'tower', name: '風鳴燈塔 頂樓', short: '風鳴燈塔', music: 'tower', enc: 'd2',
    exits: [{ x: 3, y: 14, to: 'tower2', tx: 3, ty: 14 }],
    chests: { '16,13': { item: 'feather' } },
    npcs: [{ x: 10, y: 5, mon: 'stormbird', if: () => !F('d2'), talk: bossStormbird }],
  },
  mine1: {
    kind: 'dungeon', theme: 'mine', name: '舊礦坑 B1', short: '舊礦坑', music: 'dungeon', dark: 2, enc: 'mine', entry: [12, 15, 'up'], world: [21, 28],
    exits: [{ x: 2, y: 10, to: 'mine2', tx: 2, ty: 10 }],
    chests: { '5,3': { item: 'herb2', n: 3 }, '23,3': { gold: 600 } },
  },
  mine2: {
    kind: 'dungeon', theme: 'mine', name: '舊礦坑 B2', short: '舊礦坑', music: 'dungeon', dark: 2, enc: 'mine',
    exits: [{ x: 2, y: 10, to: 'mine1', tx: 2, ty: 10 }],
    chests: { '16,13': { item: 'watch' }, '16,1': { item: 'stariron' }, '22,13': { item: 'elixir' } },
    triggers: [{ x: 13, y: 4, if: () => !F('golem'), run: bossGolem }],
    npcs: [{ x: 13, y: 2, mon: 'irongolem', if: () => !F('golem'), talk: bossGolem }],
  },
  tomb1: {
    kind: 'dungeon', theme: 'tomb', name: '古王陵墓 1F', short: '古王陵墓', music: 'dungeon', dark: 1, enc: 'd3', entry: [13, 18, 'up'], world: [63, 42],
    exits: [{ x: 23, y: 2, to: 'tomb2', tx: 23, ty: 2 }],
    chests: { '2,2': { item: 'herb2', n: 2 } },
    triggers: [{ x: 13, y: 9, if: () => !F('mira'), run: miraEvent }],
    npcs: [
      { x: 13, y: 5, spr: 'mira', dir: 'down', if: () => !F('mira'), talk: miraEvent },
      { x: 12, y: 6, mon: 'mummy', if: () => !F('mira'), talk: miraEvent },
      { x: 14, y: 6, mon: 'mummy', if: () => !F('mira'), talk: miraEvent },
    ],
  },
  tomb2: {
    kind: 'dungeon', theme: 'tomb', name: '古王陵墓 B1', short: '古王陵墓', music: 'dungeon', dark: 1, enc: 'd3',
    exits: [{ x: 23, y: 2, to: 'tomb1', tx: 23, ty: 2 }, { x: 22, y: 17, to: 'tomb3', tx: 13, ty: 17 }],
    chests: { '2,7': { item: 'tombkey' }, '7,16': { gold: 1500 } },
  },
  tomb3: {
    kind: 'dungeon', theme: 'tomb', name: '古王陵墓 王之間', short: '古王陵墓', music: 'dungeon', dark: 1, enc: 'd3',
    exits: [{ x: 13, y: 17, to: 'tomb2', tx: 22, ty: 17 }],
    chests: { '6,3': { item: 'moonherb' }, '20,3': { item: 'magicear' } },
    npcs: [{ x: 13, y: 4, mon: 'sandking', if: () => !F('d3'), talk: bossSandking }],
  },
  ice1: {
    kind: 'dungeon', theme: 'ice', name: '冰晶塔 1F', short: '冰晶塔', music: 'tower', enc: 'd4', entry: [10, 13, 'up'], world: [65, 5],
    exits: [{ x: 9, y: 1, to: 'ice2', tx: 2, ty: 2 }],
    chests: { '3,11': { item: 'herb3', n: 2 } },
  },
  ice2: {
    kind: 'dungeon', theme: 'ice', name: '冰晶塔 2F', short: '冰晶塔', music: 'tower', enc: 'd4',
    exits: [{ x: 2, y: 2, to: 'ice1', tx: 9, ty: 1 }, { x: 11, y: 11, to: 'ice3', tx: 9, ty: 1 }],
    chests: { '8,2': { item: 'windboots' }, '19,2': { item: 'ether', n: 2 } },
  },
  ice3: {
    kind: 'dungeon', theme: 'ice', name: '冰晶塔 3F', short: '冰晶塔', music: 'tower', enc: 'd4',
    exits: [{ x: 9, y: 1, to: 'ice2', tx: 11, ty: 11 }, { x: 12, y: 11, to: 'ice4', tx: 9, ty: 9 }],
    chests: { '6,11': { gold: 3500 } },
  },
  ice4: {
    kind: 'dungeon', theme: 'ice', name: '冰晶塔 頂樓', short: '冰晶塔', music: 'tower', enc: null,
    exits: [{ x: 9, y: 9, to: 'ice3', tx: 12, ty: 11 }],
    npcs: [{ x: 9, y: 3, mon: 'frostdragon', if: () => !F('d4'), talk: bossFrost }],
  },
  castle1: {
    kind: 'dungeon', theme: 'castle', name: '黯王城 1F', short: '黯王城', music: 'castle', dark: 1, enc: 'd5', noWarp: 1, entry: [13, 20, 'up'], world: [34, 8],
    exits: [{ x: 3, y: 3, to: 'castle2', tx: 3, ty: 18 }],
    chests: { '24,3': { item: 'meteoraxe' }, '3,18': { item: 'elixir' }, '24,18': { item: 'ether', n: 3 } },
  },
  castle2: {
    kind: 'dungeon', theme: 'castle', name: '黯王城 2F', short: '黯王城', music: 'castle', dark: 1, enc: 'd5', noWarp: 1,
    exits: [{ x: 3, y: 18, to: 'castle1', tx: 3, ty: 3 }, { x: 24, y: 2, to: 'castle3', tx: 24, ty: 18 }],
    chests: { '3,2': { item: 'sagestaff' }, '24,17': { item: 'lightarmor' } },
    triggers: [12, 13, 14, 15].map(x => ({ x, y: 7, if: () => !F('garde'), run: bossGarde })),
    npcs: [{ x: 13, y: 6, mon: 'garde', if: () => !F('garde'), talk: bossGarde }],
  },
  castle3: {
    kind: 'dungeon', theme: 'castle', name: '黯王城 王座', short: '黯王城', music: 'castle', dark: 1, enc: null, noWarp: 1,
    exits: [{ x: 24, y: 18, to: 'castle2', tx: 24, ty: 2 }],
    npcs: [{ x: 13, y: 3, mon: 'nox1', scale: 2.3, if: () => !F('nox'), talk: bossNox }],
  },
};
for (const id in MAPS) if (!MAP_ROWS[MAPS[id].rows || id]) console.warn('缺少地圖', id);

// ───── 劇情事件 ─────
async function introEvent() {
  Field.party[0].dir = 'left';
  await Game.story([
    '很久很久以前，世界被沒有盡頭的黑夜籠罩。',
    '一位鐘匠用五顆會唱歌的「音石」鑄成了一口鐘。\n鐘聲響起的那天早上，太陽終於升了起來。',
    '鐘聲把帶來黑夜的黯王諾克斯，封印在北方海上的孤島。\n人們把這口鐘叫做「曉鐘」。',
    '五百年來，楓葉村的鐘守每天清晨都會敲響曉鐘。',
    '直到某一個夜晚——',
  ]);
  G.flags.intro = true;
  await UI.say('托爾爺爺：「洛恩……洛恩，你醒了嗎？」');
  await grandpaTalk();
}
async function grandpaTalk() {
  const n = countStones();
  if (!F('g0')) {
    await UI.say(
      '托爾爺爺：「咳咳……別擔心，只是摔了一跤。」',
      '托爾爺爺：「昨晚有一群黑影闖進鐘樓，把曉鐘的五顆音石全部搶走了。我想攔住牠們，結果被打成這副模樣。」',
      '托爾爺爺：「你看看窗外。都已經早上了，天還是灰濛濛的……沒有音石，曉鐘就敲不響，太陽也一天比一天暗。」',
      '托爾爺爺：「那些黑影嘴裡唸著「黯王大人」。難道被封印的黯王……要回來了？」',
      '托爾爺爺：「洛恩，你是鐘守的徒弟。去把音石找回來吧。」',
      '托爾爺爺：「我聽得見音石的聲音。有一顆在東北方的苔蘚洞窟裡哭。」',
      '托爾爺爺：「這些錢你拿著，去村裡買點像樣的裝備。路上千萬小心。」',
    );
    G.flags.g0 = true; G.gold += 100; Snd.play('coin');
    await UI.say('得到了 100 金幣！', '（提示：按 X／B 打開選單，Z／A 調查與對話。到教會跟神父說話可以記錄冒險。）');
    return;
  }
  if (!F('d1')) return UI.say('托爾爺爺：「苔蘚洞窟在村子東北方，出了村子往東北走就看得到洞口。」', '托爾爺爺：「洞裡的毒菇會讓人中毒，記得帶解毒草。」');
  if (!F('d2')) return UI.say(`托爾爺爺：「晨之音石！做得好，洛恩。」`, '托爾爺爺：「下一顆的聲音……像是在風裡哭。南方的海邊有一座燈塔，去白帆港打聽看看吧。」', '托爾爺爺：「樵夫已經把南邊山口的倒木清掉了。」');
  if (!F('d3')) return UI.say(`托爾爺爺：「已經找回 ${n} 顆了。剩下的音石，聲音都從海的另一邊傳來。」`, '托爾爺爺：「白帆港的船能帶你們去東方大陸。」');
  if (!F('d4')) return UI.say(`托爾爺爺：「${n} 顆了……我聽見北方傳來冷冰冰的聲音，像冰塊互相碰撞。」`);
  if (!F('nox')) return UI.say('托爾爺爺：「四顆音石都回來了。可是最後一顆……就在黯王的身上。」', '托爾爺爺：「洛恩，我以你為傲。去吧，把天空找回來。」');
  return UI.say('托爾爺爺：「太陽出來了啊……你已經是個了不起的鐘守了。」', '托爾爺爺：「對了，聽說北方的星之祭壇，最近在夜裡會發出奇妙的光……」', '托爾爺爺：「還有，要是哪天想重新踏上旅程，就去敲一次曉鐘吧。」');
}
async function catGirl() {
  if (Bag.has('cat')) {
    await UI.say('小萌：「啊！小花！是小花！」', '把小花還給了小萌。');
    Bag.remove('cat'); G.flags.cat_done = true;
    await UI.say('小萌：「謝謝你，洛恩哥哥！這是我的寶貝護身符，送給你！」');
    await S.get('luckcharm', 1, '得到了幸運護符！\n（裝在「飾品」欄可以提升速度。）');
    return;
  }
  G.flags.cat_ask = true;
  await UI.say('小萌：「嗚嗚……我的貓咪小花不見了。」', '小萌：「小花最喜歡鑽進黑黑的洞裡……如果你在哪個洞窟看到一隻橘色的小貓，可以帶牠回來嗎？」');
}
async function catFound() {
  await UI.say('「喵～」', '是一隻橘色的小貓，脖子上的名牌寫著「小花」。');
  G.flags.cat_found = true;
  await S.get('cat', 1, '把小花抱了起來。小花舒服地打起呼嚕。');
}
async function bossMushking() {
  await UI.say('洞窟深處長著一朵巨大的毒蕈，傘蓋上鑲著一顆發光的石頭。', '毒霧蕈王：「咕嚕嚕……這顆石頭的光好刺眼，好討厭……」', '毒霧蕈王：「不過黯王大人說了，誰敢來拿，就把他變成蘑菇的肥料！」');
  if (await S.boss(['pmush', 'mushking', 'pmush'], { bg: 'cave' })) {
    G.flags.d1 = true;
    await S.get('stone1', 1, '毒霧蕈王化成了一團孢子。地上留下一顆淡金色的石頭。\n得到了晨之音石！');
    await UI.say('音石輕輕響了一聲，好像在說「帶我回家」。', '（回楓葉村告訴托爾爺爺吧。南邊山口的倒木應該也清掉了。）');
    Field.rebakeWorld = true;
  }
}
async function liaTalk() {
  await UI.say('見習神官：「你身上……有好溫暖的光。那是曉鐘的音石吧？」', '莉亞：「我是這座教會的見習神官，莉亞。」', '莉亞：「這幾天我一直夢見一座在風裡哭泣的燈塔。燈塔的燈熄滅以後，船就不敢出海了。」', '莉亞：「我想……下一顆音石，就在燈塔的頂端。」', '莉亞：「請讓我跟你一起去！我會治癒的法術，一定幫得上忙。」');
  G.flags.lia = true;
  await S.join('lia');
  await UI.say('莉亞：「燈塔在港口南邊，半島的最尖端。走吧！」');
}
async function captainTalk() {
  if (!F('d2')) return UI.say('船長：「燈塔的燈熄了，海上又全是怪鳥。這種天氣出海，等於送死啊。」', '船長：「要是燈塔能重新亮起來就好了……」');
  await UI.say('船長：「燈塔又亮了！多虧了你們。」');
  if (await UI.yesno('船長：「要搭船到東方大陸的碼頭嗎？船費就免了！」')) {
    await Game.fadeOut(0.5); Snd.play('wind');
    await Game.story(['白帆船乘著風，駛向東方。'], true);
    await Game.go('world', 44, 30, 'right', { from: 'ferry' });
  }
}
async function dockEvent() {
  if (await UI.yesno('東岸的碼頭停著白帆港的船。要搭船回白帆港嗎？')) {
    await Game.fadeOut(0.5); Snd.play('wind');
    await Game.go('port', 26, 11, 'left', { from: 'ferry' });
  }
}
async function minerTalk() {
  if (F('watch_done')) return UI.say('葛雷：「每天聽著懷錶滴答滴答，好像她還在我身邊一樣。」');
  if (Bag.has('watch')) {
    await UI.say('葛雷：「這、這是……我的懷錶！你們是在礦坑裡找到的嗎！」', '葛雷：「這是我過世的老伴送我的……真的太謝謝你們了。」');
    Bag.remove('watch'); G.flags.watch_done = true;
    await S.get('powerband', 1, '葛雷：「這個手環是我年輕時挖礦戴的，戴上它力氣會變大。送給你們！」\n得到了力量手環！');
    return;
  }
  G.flags.watch_ask = true;
  await UI.say('老礦工葛雷：「我年輕的時候，在東北方山腳的舊礦坑工作。」', '葛雷：「有一次礦坑崩塌，我為了逃命，把老伴送的懷錶掉在最深處了……」', '葛雷：「那裡現在全是魔物。聽說最深處還有一個鐵做的大傢伙，守著從天上掉下來的星鐵礦。」');
}
async function bossStormbird() {
  await UI.say('燈台旁邊站著一隻巨大的藍色怪鳥。牠的翅膀一張開，整座燈塔都在搖晃。', '嵐翼魔鳥：「嘎啊——！燈塔的光會吵醒黯王大人的敵人！」', '嵐翼魔鳥：「這顆石頭是我的！誰都別想拿走！」');
  if (await S.boss(['stormbird'], { bg: 'tower' })) {
    G.flags.d2 = true;
    await S.get('stone2', 1, '嵐翼魔鳥被吹散成一陣風。一顆涼涼的石頭掉在地上。\n得到了風之音石！');
    Game.flashWhite = 0.8; Snd.play('holy');
    await UI.say('就在這時，熄滅的燈台重新亮了起來！', '溫暖的光照亮了整片海。', '莉亞：「這樣船就能出海了！我們回白帆港找船長吧。」');
  }
}
async function bossGolem() {
  if (F('golem')) return;
  await UI.say('轟隆……轟隆……', '一個全身鐵甲的巨人擋在礦坑的最深處，身後隱約閃著星星般的光。', '鐵甲魔像：「……入侵者……排除……」');
  if (await S.boss(['irongolem'], { bg: 'mine' })) {
    G.flags.golem = true;
    await UI.say('鐵甲魔像轟然倒下，散成一堆廢鐵。', '礦坑深處的寶箱閃著微光。');
  }
}
async function queenTalk() {
  if (!F('mira')) { G.flags.queen1 = true; return UI.say('砂金女王娜菲莉：「遠道而來的旅人啊，歡迎來到砂金城。」', '娜菲莉：「最近，東南方的古王陵墓夜夜傳出可怕的聲音。」', '娜菲莉：「我的宮廷魔法師米菈前去調查，到現在還沒回來……若你們要去陵墓，請替我找找她。」'); }
  if (!F('d3')) return UI.say('娜菲莉：「米菈！你平安無事就好。」', '米菈：「陛下，陵墓深處有很強的魔力，我要跟洛恩他們一起去查清楚！」', '娜菲莉：「……好吧。各位，請一定要平安回來。」');
  if (!F('pass')) {
    await UI.say('娜菲莉：「你們打倒了在陵墓作亂的沙之王！整座城的人都要感謝你們。」', '娜菲莉：「你們要往北方的雪原去吧？北方的關卡只認我的印章。」');
    G.flags.pass = true;
    await S.get('pass', 1, '得到了通行證！');
    await UI.say('娜菲莉：「關卡就在城北方的山脈之間。願你們一路平安。」');
    return;
  }
  return UI.say('娜菲莉：「沙漠的人們都在為你們祈禱。」');
}
async function motherTalk() {
  if (F('herb_done')) return UI.say('母親：「女兒已經完全好了！真不知道該怎麼報答你們。」');
  if (Bag.has('moonherb')) {
    await UI.say('母親：「這是……月光草！你們真的從陵墓裡帶回來了！」', '母親把月光草煮成藥湯，餵女孩喝下……', '女孩：「……嗯……媽媽？」', '母親：「醒了！她醒了！」');
    Bag.remove('moonherb'); G.flags.herb_done = true;
    await S.get('wisecrown', 1, '母親：「這是我們家代代相傳的頭冠，請你們收下。」\n得到了智慧之冠！');
    Bag.add('ether', 2); await UI.say('還得到了魔力水 ×2！');
    return;
  }
  G.flags.herb_ask = true;
  await UI.say('母親：「女兒得了怪病，一直昏睡不醒……」', '母親：「醫生說，只有古王陵墓最深處長的「月光草」才能救她。可是那裡太危險了……」');
}
async function miraEvent() {
  if (F('mira')) return;
  await UI.say('大廳裡傳來年輕女孩的叫聲。', '紅髮女孩：「走、走開！為什麼我的火球怎麼燒都燒不完啊！」', '兩具木乃伊搖搖晃晃地逼近她……');
  if (!F('lia')) return;
  await UI.say('莉亞：「洛恩，快去幫她！」');
  if (await S.fight(['mummy', 'mummy'], { bg: 'tomb' })) {
    G.flags.mira = true;
    await UI.say('紅髮女孩：「呼……得救了。謝謝你們！」', '米菈：「我是砂金城的宮廷魔法師米菈。我是來調查陵墓裡的怪聲……結果被包圍了，哈哈。」', '米菈：「咦？你們在找曉鐘的音石？陵墓最深處確實有一股很強的魔力！」', '米菈：「我也要去！一個人調查太危險了，對吧？我的魔法一定能幫上忙！」');
    await S.join('mira');
    await UI.say('米菈：「聽說陵墓下層的大門要用鑰匙才打得開。仔細找找吧！」');
  }
}
async function bossSandking() {
  await UI.say('黃金棺木前站著一位戴著王冠的沙之巨人。', '沙之王：「……五百年了。黯王大人答應過我，只要守住這顆石頭，就讓我的王國重新復活。」', '沙之王：「打擾王之長眠的人，就化作沙漠裡的一粒沙吧！」');
  if (await S.boss(['mummy', 'sandking'], { bg: 'tomb' })) {
    G.flags.d3 = true;
    await UI.say('沙之王：「我的……王國……」', '沙之王的身體崩落成金色的沙子。');
    await S.get('stone3', 1, '得到了砂之音石！');
    await UI.say('米菈：「做到了！回砂金城向女王報告吧，她一定會很高興。」');
  }
}
async function worldBlock(c) {
  if (c === 'Y') { if (F('d1')) return; return UI.say('一棵巨大的倒木擋住了山路。', '（楓葉村的樵夫說，等洞窟的魔物安靜下來就會來清理。）'); }
  if (c === 'G') {
    if (F('gate')) return;
    if (Bag.has('pass')) {
      await UI.say('關卡的守衛仔細看了通行證……', '守衛：「是女王陛下的印章！開門——！」');
      G.flags.gate = true; Snd.play('door'); Field.rebake();
      await UI.say('沉重的大門打開了。北方吹來冰冷的風。');
    } else await UI.say('山脈之間有一座關卡，大門緊緊關著。', '守衛：「沒有砂金女王的通行證，誰都不能通過！」');
  }
}
async function balkTalk() {
  await UI.say('高大的戰士：「你們就是帶著音石的旅人？村裡已經傳開了。」', '巴爾克：「我是霜鈴村的守衛隊長，巴爾克。」', '巴爾克：「自從冰晶塔被一條霜牙龍佔據，村子就被暴風雪困住，整整一個月了。」', '巴爾克：「我的斧頭早就想劈那條臭龍了。帶我一起去吧，我扛得住任何攻擊！」');
  G.flags.balk = true;
  await S.join('balk');
  await UI.say('巴爾克：「冰晶塔在村子東北方。走吧！」');
}
async function chiefTalk() {
  if (!F('d4')) return UI.say('村長：「冰晶塔的地板結了冰，一踩上去就會滑到撞上東西才停。」', '村長：「仔細看清楚石頭擺在哪裡，再決定往哪個方向走。」');
  return UI.say('村長：「暴風雪停了！你們是霜鈴村的恩人。」', '村長：「傳說把四顆音石放上「星之祭壇」，就會出現一座通往黯王島的橋。」', '村長：「祭壇就在村子西北方的海岸。」');
}
async function smithTalk() {
  if (Bag.has('stariron') && !F('sword')) {
    await UI.say('鐵匠：「這、這是……星鐵礦！從天上掉下來的金屬！」', '鐵匠：「讓我替你打一把劍吧！給我一點時間……」');
    await Game.fadeOut(0.4);
    for (let i = 0; i < 3; i++) { Snd.play('hit'); await sleep(350); }
    await Game.fadeIn(0.4);
    Bag.remove('stariron'); G.flags.sword = true;
    await S.get('dawnsword', 1, '鐵匠：「完成了！這把劍就叫「曉光之劍」吧！」\n得到了曉光之劍！');
    return;
  }
  if (!F('sword')) G.flags.sword_ask = true;
  return shop('snow_w', F('sword') ? '鐵匠：「曉光之劍用得還順手嗎？要買點什麼嗎？」' : '鐵匠：「我這裡的武器可是用雪山的寒鐵打的！」\n鐵匠：「要是有「星鐵礦」，我還能打出更厲害的劍……」');
}
async function bossFrost() {
  await UI.say('塔頂颳著刺骨的寒風。一條全身覆蓋冰晶的巨龍盤踞在那裡。', '霜牙龍：「愚蠢的人類。這顆石頭讓我的冰永遠不會融化。」', '巴爾克：「就是你把村子凍了一個月！看斧！」');
  if (await S.boss(['frostdragon'], { bg: 'ice' })) {
    G.flags.d4 = true;
    await S.get('stone4', 1, '霜牙龍化成無數冰屑，被風吹散了。\n得到了霜之音石！');
    await UI.say('塔外的暴風雪漸漸停了下來。', '巴爾克：「……謝了。回村子看看吧，村長也許知道去黯王島的方法。」');
  }
}
async function altarEvent() {
  if (F('bridge')) return UI.say('四顆音石在祭壇上靜靜地發著光。\n彩虹橋一直延伸到黯王島。');
  if (!F('d4')) return UI.say('古老的石造祭壇，上面有四個圓形的凹槽。', '石碑上寫著：「集齊四聲之石，星之橋將引領鐘守。」');
  await UI.say('四顆音石在背包裡發出共鳴……', '把音石放到了祭壇的凹槽上。');
  Game.flashWhite = 1; Snd.play('holy');
  for (let j = 0; j < 4; j++) setTimeout(() => Field.ring(43, 8, ['255,140,140', '255,230,140', '140,255,180', '160,180,255'][j], 12, 2), j * 200);
  await sleep(600);
  G.flags.bridge = true; Field.rebake(); Field.shake(0.6);
  Snd.play('bell');
  await UI.say('祭壇射出七彩的光，一座彩虹橋出現在海面上！', '橋的另一端，是籠罩在黑霧裡的黯王島。', '米菈：「最後一顆音石，就在黯王身上……」', '莉亞：「大家，一起走吧。」');
  await UI.say('（音石自動回到了背包裡。）');
}
async function bossGarde() {
  if (F('garde')) return;
  const L0 = Field.leader();
  await UI.say('黑色的騎士擋住了走廊。', '黯騎士：「我是黯王陛下的騎士，加爾德。」', '加爾德：「……五百年前，我也曾是守護曉鐘的騎士。」', '加爾德：「但是漫長的黑夜讓我明白了——再亮的光，總有一天會熄滅。」', '加爾德：「想通過這裡，就證明你們的光不會熄滅吧！」');
  if (await S.boss(['garde'], { bg: 'castle' })) {
    G.flags.garde = true;
    await UI.say('加爾德：「……好耀眼的光。我也曾經……像你們一樣……」', '加爾德：「去吧，年輕的鐘守。讓那口鐘……再響一次……」', '加爾德化成黑色的羽毛，消失了。');
  }
}
async function bossNox() {
  await UI.say('王座上坐著一個披著黑色斗篷的人影。', '黯王諾克斯：「鐘守的小鬼……你們竟然走到這裡了。」', '諾克斯：「五百年前，那口鐘的聲音把我關在這片冰冷的海上。」', '諾克斯：「這一次，我要讓那口鐘永遠沉默，讓世界回到沒有盡頭的夜晚！」', '洛恩握緊了劍。夥伴們站到了他的身邊。');
  Snd.play('boss'); await Game.swirl(true);
  let r = await runBattle(['nox1'], { boss: true, music: 'final', bg: 'throne', keepMusic: true, noFanfare: true, winText: '黯王跪倒在地……' });
  if (r === 'lose') { await Game.wipe(); return; }
  await UI.say('諾克斯：「不……可能……區區人類……」', '諾克斯：「好……既然如此，就讓你們看看黯王真正的模樣！」');
  Game.flashWhite = 1; Snd.play('roar');
  await sleep(500);
  await UI.say('就在這時，背包裡的四顆音石發出溫暖的光……', '大家的傷勢都恢復了！');
  for (const m of G.party) { const s = Party.stats(m); m.hp = s.mhp; m.mp = s.mmp; m.st = {}; }
  Snd.play('heal');
  r = await runBattle(['nox2'], { boss: true, music: 'final', bg: 'throne', winText: '黯王真身崩塌了！' });
  if (r === 'lose') { await Game.wipe(); return; }
  G.flags.nox = true;
  await UI.say('諾克斯：「光……好刺眼……原來……這就是……早晨……」', '黯王的身體化成黑霧，被窗外透進來的光吹散了。');
  await S.get('stone5', 1, '一顆深藍色的石頭落在王座前。\n得到了夜之音石！');
  await endingEvent();
}
async function endingEvent() {
  Music.play('ending', true);
  await Game.story([
    '洛恩一行人帶著五顆音石，回到了楓葉村。',
    '村子裡的人全都聚集到了鐘樓前。',
  ], true);
  await Game.go('maple', 13, 3, 'up', { quiet: true, keepMusic: true });
  Field.party.forEach((p, i) => { p.x = [13, 12, 14, 13][i]; p.y = [3, 4, 4, 5][i]; p.fx = p.x; p.fy = p.y; p.dir = 'up'; p.t = 1; });
  Game.dawn = 0;
  await UI.say('托爾爺爺：「五顆音石都回來了……洛恩，敲吧。」', '洛恩把五顆音石嵌進了曉鐘，然後用盡全身的力氣拉動了鐘繩——');
  for (let i = 0; i < 3; i++) { Snd.play('bell'); Game.flashWhite = 0.6; Field.shake(0.25); for (let j = 0; j < 3; j++) setTimeout(() => Field.ring(13, 1.5, j ? '255,200,120' : '255,245,200', 10 + i * 3, 1.8), j * 260); await sleep(1600); }
  Game.dawnTarget = 1;
  await sleep(1800);
  await UI.say('噹——噹——噹——', '曉鐘的聲音越過山脈，越過大海，傳遍了整個世界。', '東方的天空，一點一點地亮了起來。', '太陽，終於升起來了。');
  await Game.credits();
}

// ───── 目標與支線 ─────
function objective() {
  if (!F('d1')) return '到楓葉村東北方的苔蘚洞窟，找回第一顆音石。';
  if (!F('lia')) return '南邊山口的倒木已經清掉了。前往南方的白帆港。';
  if (!F('d2')) return '到白帆港南方半島盡頭的風鳴燈塔，找回第二顆音石。';
  if (!G.towns.includes('sand')) return '燈塔重新亮了！在白帆港的碼頭找船長，搭船前往東方大陸，再往東找到砂金城。';
  if (!F('mira')) return '到砂金城東南方的古王陵墓，尋找宮廷魔法師米菈。';
  if (!F('d3')) return '深入古王陵墓，打倒守護音石的魔物。下層的大門需要鑰匙。';
  if (!F('pass')) return '回到砂金城向女王報告。';
  if (!F('gate')) return '帶著通行證，前往砂金城北方山脈的關卡。';
  if (!F('balk')) return '穿過關卡，前往雪原上的霜鈴村。';
  if (!F('d4')) return '攀上霜鈴村東北方的冰晶塔，奪回第四顆音石。';
  if (!F('bridge')) return '到霜鈴村西北方海岸的星之祭壇。';
  if (!F('nox')) return '渡過彩虹橋，攻入黯王城，打倒黯王諾克斯！';
  return '世界恢復了光明。謝謝你的遊玩！';
}
const SIDEQUESTS = [
  { name: '支線：小花去哪了', state: () => F('cat_done') ? '完成！小萌送了幸運護符。' : Bag.has('cat') ? '找到小花了，帶回楓葉村給小萌吧。' : F('cat_ask') ? '楓葉村的小萌在找貓咪小花。牠喜歡鑽進黑黑的洞裡。' : null },
  { name: '支線：老礦工的懷錶', state: () => F('watch_done') ? '完成！葛雷送了力量手環。' : Bag.has('watch') ? '找到懷錶了，拿去白帆港還給葛雷。' : F('watch_ask') ? '白帆港的葛雷把懷錶掉在舊礦坑的最深處。' : null },
  { name: '支線：月光草', state: () => F('herb_done') ? '完成！女孩醒過來了。' : Bag.has('moonherb') ? '拿到月光草了，帶回砂金城。' : F('herb_ask') ? '砂金城的女孩昏睡不醒，需要古王陵墓深處的月光草。' : null },
  { name: '支線：星鐵之劍', state: () => F('sword') ? '完成！得到了曉光之劍。' : Bag.has('stariron') ? '拿到星鐵礦了，去霜鈴村找鐵匠。' : F('sword_ask') || F('watch_ask') ? '舊礦坑最深處有星鐵礦，但被鐵甲魔像守著。' : null },
];
