'use strict';
// 曉鐘傳說：第三輪追加——大鬥技場、交換之旅、圖鑑委託、秘傳之書（技能自訂）、
// 通關後的指引、NPC 的小動作、劇情演出（黑邊、表情泡泡、震動）、渡船航行、附頭像的選單

// ───── 新角色外觀 ─────
Object.assign(LOOKS, {
  painter: { skin: '#f6c8a8', hair: '#3a2a5a', hs: 'bob', eye: '#2a2a4a', top: '#ece4d4', trim: '#c04040', pants: '#4a4a6a', shoes: '#4a3020', belt: '#c04040', out: 'tunic', hat: 'cap', hatc: '#c03a4a', apron: '#8aa8e0' },
  dancer: { skin: '#c88a58', hair: '#1a1010', hs: 'pony', eye: '#1a1010', top: '#e0408a', trim: '#f2c14e', pants: '#e0408a', shoes: '#a02a5a', belt: '#f2c14e', out: 'dress', scarf: '#f2c14e' },
  oldsailor: { skin: '#d89a70', hair: '#e0e0e8', hs: 'bald', eye: '#2a1a1a', top: '#f0f4fa', trim: '#2a4a8a', pants: '#2a4a8a', shoes: '#2a2a3a', belt: '#2a2a3a', out: 'tunic', hat: 'cap', hatc: '#2a3a6a', beard: '#e0e0e8', stripes: '#2a4a8a' },
  arena: { skin: '#c88a58', hair: '#2a1a10', hs: 'short', eye: '#1a1010', top: '#b8322e', trim: '#f2c14e', pants: '#5a4030', shoes: '#3a2010', belt: '#f2c14e', out: 'armor', hat: 'helm', hatc: '#f2c14e', cape: '#7a1a2a', big: 1, mous: '#2a1a10' },
});
Object.assign(SPEAKERS, { 畫家艾倫: 'painter', 艾倫: 'painter', 老水手: 'oldsailor', 老水手魯克: 'oldsailor', 魯克: 'oldsailor', 舞孃莎菈: 'dancer', 莎菈: 'dancer', 主持人: 'arena', 鬥技場主持人: 'arena', 雪國奶奶: 'oldwoman', 奶奶: 'oldwoman', 貨船水手: 'sailor', 商隊護衛: 'guard', 村裡的孩子: 'boy' });

// ───── 新道具：交換之旅的物品、秘傳之書、鬥技場獎品 ─────
const TOMES = {
  tome_guard: { spell: 'guard', who: 'HMB' },
  tome_heal2: { spell: 'heal2', who: 'MB' },
  tome_haste: { spell: 'haste', who: 'HLB' },
  tome_blizzard: { spell: 'blizzard', who: 'HL' },
  tome_meteor: { spell: 'meteor', who: 'HL' },
};
Object.assign(ITEMS, {
  tr_paint: { name: '楓葉之畫', kind: 'key', desc: '畫家艾倫畫的楓葉村秋景。他想送給白帆港的老水手魯克。' },
  tr_shell: { name: '七彩貝殼', kind: 'key', desc: '在陽光下會變色的大貝殼。砂金城的舞孃莎菈很想要。' },
  tr_rose: { name: '沙漠玫瑰', kind: 'key', desc: '沙子結晶成的玫瑰，永遠不會凋謝。霜鈴村的奶奶想看看沙漠的花。' },
  tr_snow: { name: '不融的雪晶', kind: 'key', desc: '霜鈴村的奶奶送的雪之結晶。楓葉村的畫家艾倫一直想畫雪。' },
  tome_guard: { name: '守護秘傳書', kind: 'tome', sell: 0, nobattle: 1, tgt: 'ally', desc: '讀了以後學會「守護」（提升全體防禦）。洛恩、米菈、巴爾克可以學。' },
  tome_heal2: { name: '強治癒秘傳書', kind: 'tome', sell: 0, nobattle: 1, tgt: 'ally', desc: '讀了以後學會「強治癒」。米菈、巴爾克可以學。' },
  tome_haste: { name: '疾風秘傳書', kind: 'tome', sell: 0, nobattle: 1, tgt: 'ally', desc: '讀了以後學會「加速」（提升全體速度）。洛恩、莉亞、巴爾克可以學。' },
  tome_blizzard: { name: '冰暴秘傳書', kind: 'tome', sell: 0, nobattle: 1, tgt: 'ally', desc: '讀了以後學會「冰暴」（冰屬性全體攻擊）。洛恩、莉亞可以學。' },
  tome_meteor: { name: '隕星秘傳書', kind: 'tome', sell: 0, nobattle: 1, tgt: 'ally', desc: '讀了以後學會「隕星」（無屬性全體大傷害）。洛恩、莉亞可以學。' },
});
Object.assign(EQUIP, {
  champbelt: { name: '鬥士腰帶', slot: 'x', atk: 14, def: 8, price: 0, sell: 2500, who: 'HLMB' },
  sageglass: { name: '賢者單眼鏡', slot: 'x', int: 18, agi: 6, price: 0, sell: 2000, who: 'HLMB' },
  herocrest: { name: '勇者紋章', slot: 'x', atk: 18, def: 14, agi: 12, int: 12, price: 0, sell: 9000, who: 'HLMB' },
});

// 秘傳之書：額外學會的法術（存在 m.learned，舊記錄沒有這個欄位也沒關係）
{
  const sp0 = Party.spells.bind(Party);
  Party.spells = function (m) { const a = sp0(m); for (const s of m.learned || []) if (!a.includes(s)) a.push(s); return a; };
  const use1 = window.fieldUseItemX || fieldUseItem;
  window.fieldUseItemX = async (id, user) => {
    const T = TOMES[id];
    if (!T) return use1(id, user);
    const sp = SPELLS[T.spell];
    const t = await pickMember('誰要讀這本書？', m => T.who.includes(CHARS[m.id].eqMask));
    if (!t) { if (!G.party.some(m => T.who.includes(CHARS[m.id].eqMask))) await UI.say('隊伍裡沒有人能讀懂這本書。'); return false; }
    if (Party.spells(t).includes(T.spell)) { await UI.say(`${Party.name(t)}已經會「${sp.name}」了。`); return false; }
    Bag.remove(id); t.learned = (t.learned || []).concat(T.spell);
    Snd.play('holy'); Game.flashWhite = 0.35;
    await UI.say(`${Party.name(t)}專心讀完了${ITEMS[id].name}……`, `${Party.name(t)}學會了「${sp.name}」！\n（消耗 MP ${sp.mp}：${sp.desc}）`);
    return true;
  };
}

// ───── 通關後的指引：冒險筆記、更多 NPC、祭壇的光柱 ─────
{
  const obj0 = objective;
  objective = function () {
    if (!F('nox')) return obj0();
    if (!F('star_seen')) return '世界恢復了光明。聽說北方海岸的星之祭壇在夜裡發出星光——到霜鈴村西北方的星之祭壇看看吧（通關後迷宮「星之迴廊」）。';
    if (!F('eclipse')) return '星之迴廊第二層盤踞著吞噬星光的星蝕龍。準備好再去挑戰吧。';
    if (!F('mirror')) return '星之迴廊最深處的「鏡之間」裡，有一面映出黯王身影的鏡子……';
    if (!F('arena4')) return '星之迴廊已經制霸！砂金城大鬥技場的「星辰之戰」還等著你。';
    return '所有的冒險都完成了！想再玩一次，就去楓葉村敲響曉鐘，開始二周目吧。';
  };
  SIDEQUESTS.push(
    { name: '通關後：星之迴廊', state: () => !F('nox') ? null : F('mirror') && F('eclipse') ? '完成！星蝕龍與鏡之黯王都被打倒了。' : F('star_seen') ? `已進入星之迴廊。頭目：星蝕龍${F('eclipse') ? '✓' : '✗'}　鏡之黯王${F('mirror') ? '✓' : '✗'}` : '在星之祭壇沿著星光階梯往上走，就能到達星之迴廊。' },
    { name: '支線：交換之旅', state: () => F('tr_done') ? '完成！得到了冰暴秘傳書。' : Bag.has('tr_snow') ? '把不融的雪晶帶回楓葉村給畫家艾倫。' : Bag.has('tr_rose') ? '把沙漠玫瑰帶去霜鈴村給奶奶。' : Bag.has('tr_shell') ? '把七彩貝殼帶去砂金城給舞孃莎菈。' : Bag.has('tr_paint') ? '把楓葉之畫帶去白帆港給老水手魯克。' : F('tr_met') ? '楓葉村的畫家艾倫想把畫送給白帆港的老水手。' : null },
    { name: '支線：圖鑑委託', state: () => { const n = Extra.bookCount(), got = G.flags.bookreq || 0; return n < 5 && !got ? null : got >= 45 ? '完成！研究員的委託全部達成。' : `打倒 ${[15, 30, 45].find(k => k > got)} 種怪物後去找楓葉村的研究員（目前 ${n} 種）。`; } },
    { name: '大鬥技場', state: () => { const n = ARENA.filter(a => F(a.id)).length; return !G.towns.includes('sand') ? null : n >= ARENA.length ? '全部制霸！你是鬥技場的傳說。' : `砂金城的大鬥技場：已制霸 ${n} / ${ARENA.length} 個等級。`; } },
  );
  MAPS.star1.onEnter = () => { G.flags.star_seen = true; };
  // 通關後才出現的 NPC：到處都有人在談論北方的星光
  MAPS.maple.npcs.push({ x: 6, y: 8, spr: 'boy', wander: 1, if: () => F('nox'), talk: () => UI.say('村裡的孩子：「昨天晚上，我看到北方有一道星光直直地衝上天空！」', '村裡的孩子：「爺爺說那是星之祭壇。洛恩哥哥，你要去看看嗎？」') });
  MAPS.port.npcs.push({ x: 6, y: 9, spr: 'sailor', wander: 1, if: () => F('nox'), talk: () => UI.say('貨船水手：「出海的時候，北邊海岸總有一道光柱，比燈塔還亮。」', '貨船水手：「是霜鈴村西北方的那座祭壇吧？聽說沿著光走，可以走到星星上面。」') });
  MAPS.sand.npcs.push({ x: 12, y: 15, spr: 'guard', if: () => F('nox'), talk: () => UI.say('商隊護衛：「太陽回來以後，北方的星之祭壇反而在晚上發光了。」', '商隊護衛：「據說祭壇上方出現了星光階梯，通往一座叫「星之迴廊」的地方……」') });
  // 讀取已通關的記錄時提示一次
  addEventListener('DOMContentLoaded', () => {
    const lg0 = Game.loadGame.bind(Game);
    Game.loadGame = function (n) {
      lg0(n);
      if (G && F('nox') && !F('pg_note')) { G.flags.pg_note = true; setTimeout(() => Field.run(() => UI.say('（通關後的冒險開放了！）', '北方海岸的星之祭壇正發出星光——沿著星光階梯，可以前往通關後的迷宮「星之迴廊」。', '另外，砂金城的大鬥技場也有更強的對手在等你。（詳細請看選單「手冊」→「冒險筆記」）')), 900); }
    };
  });
  // 大地圖：通關後星之祭壇射出光柱
  const wf0 = FieldFx.drawWorldFx.bind(FieldFx);
  FieldFx.drawWorldFx = function (g, f, sx0, sy0, k, T) {
    wf0(g, f, sx0, sy0, k, T);
    if (!f.isWorld() || !F('nox') || F('mirror')) return;
    const X = sx0 + (43 * 16 + 8) * k, Y = sy0 + (8 * 16 + 10) * k, t = f.t, V = L.V;
    if (X < V.x - 40 || X > V.x + V.w + 40 || Y < V.y - 200 || Y > V.y + V.h + 40) return;
    const w = Math.round((4 + Math.sin(t * 3)) * k);
    g.globalAlpha = 0.3; g.fillStyle = '#8a70e8'; g.fillRect(X - w * 1.6, V.y, w * 3.2, Y - V.y);
    g.globalAlpha = 0.45; g.fillStyle = '#c8b8ff'; g.fillRect(X - w, V.y, w * 2, Y - V.y);
    g.globalAlpha = 0.9; g.fillStyle = '#fffbe8'; g.fillRect(X - Math.max(k, w * 0.35), V.y, Math.max(k, w * 0.35) * 2, Y - V.y);
    g.fillStyle = '#fff4b0';
    for (let i = 0; i < 8; i++) { const ph = (t * 0.45 + i / 8) % 1, yy = Y - ph * Math.min(Y - V.y, 160 * k); g.globalAlpha = Math.sin(ph * Math.PI); g.fillRect(Math.round(X + Math.sin(t * 2 + i * 2) * w * 2.2), Math.round(yy), k, k); }
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45; g.drawImage(FieldFx.glowSpr('200,180,255'), X - 26 * k, Y - 22 * k, 52 * k, 40 * k);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  };
}

// ───── 大鬥技場（砂金城）─────
const ARENA = [
  { id: 'arena1', name: '青銅之戰', lv: 16, rounds: [['scorp', 'cactus', 'snake', 'scarab'], ['sandwolf', 'sandwolf', 'scarab', 'sandwolf'], ['mummy', 'urn', 'mummy', 'urn']], prize: 'tome_guard', gold: 800, again: 240 },
  { id: 'arena2', name: '白銀之戰', lv: 22, rounds: [['yeti', 'swolf', 'swolf', 'yeti'], ['igolem', 'icesp', 'icesp', 'igolem'], ['wyvern', 'image', 'wyvern', 'image']], prize: 'champbelt', prize2: 'tome_heal2', gold: 1600, again: 500 },
  { id: 'arena3', name: '黃金之戰', lv: 31, rounds: [['dknight', 'dmage', 'hound'], ['bdragon', 'shade', 'shade'], ['garde']], prize: 'tome_haste', gold: 3200, again: 900 },
  { id: 'arena4', name: '星辰之戰', lv: 40, post: 1, rounds: [['voidknight', 'chaoshound', 'nighteye'], ['frostdragon', 'wyvern', 'wyvern'], ['mummy', 'sandking', 'mummy'], ['dknight', 'garde', 'dknight']], prize: 'herocrest', prize2: 'tome_meteor', gold: 8000, again: 2000 },
];
{
  const create0 = Battle.create.bind(Battle);
  Battle.create = function (ids, o) { const B = create0(ids, o); Battle.last = B; return B; };
}
async function arenaTalk(npc) {
  Field.emote(npc, '！', 1);
  await UI.say('鬥技場主持人：「歡迎來到砂金城的大鬥技場！」', '主持人：「在這裡要連續打好幾場，中間只能稍微喘口氣，也不能逃跑。」', '主持人：「第一次制霸各個等級，都有特別的獎品喔！」');
  for (;;) {
    const items = ARENA.map((a, i) => {
      const locked = (i > 0 && !F(ARENA[i - 1].id)) || (a.post && !F('nox'));
      const rec = G.flags[a.id + 'r'];
      return { t: (F(a.id) ? '★ ' : '　') + a.name, r: locked ? '未開放' : rec ? `最佳 ${rec} 回合` : `建議 Lv${a.lv}`, dis: locked, rcol: rec ? '#ffe9a8' : undefined };
    }).concat([{ t: '說明' }, { t: '離開' }]);
    const i = await UI.menu({ items, title: '大鬥技場', pos: mpos(), allowDis: true });
    if (i < 0 || i === ARENA.length + 1) break;
    if (i === ARENA.length) { await UI.say('主持人：「每個等級要連贏 3～4 場。每場之間會恢復兩成的 HP 和 MP。」', '主持人：「輸了也沒關係，我們的醫護會幫你們療傷，金幣也不會少。」', '主持人：「制霸以後還可以再挑戰，刷新最少回合數的紀錄！」'); continue; }
    const a = ARENA[i];
    if (items[i].dis) { await UI.say(a.post ? '主持人：「「星辰之戰」只開放給打倒黯王的英雄。」' : `主持人：「先制霸「${ARENA[i - 1].name}」吧！」`); continue; }
    if (!await UI.yesno(`挑戰「${a.name}」（連戰 ${a.rounds.length} 場）嗎？`)) continue;
    await arenaRun(a);
  }
  await UI.say('主持人：「隨時歡迎再來挑戰！」');
}
async function arenaRun(a) {
  let rounds = 0;
  if (!G.party.some(m => m.hp > 0)) { await UI.say('主持人：「大家都倒下了，先去旅店休息吧！」'); return; }
  Field.cineT = 1;
  await UI.say(`主持人：「各位觀眾！挑戰者登場——」`, `主持人：「「${a.name}」，開始！」`);
  Field.cineT = 0;
  for (let k = 0; k < a.rounds.length; k++) {
    const last = k === a.rounds.length - 1, ids = a.rounds[k];
    Snd.play(last ? 'boss' : 'encounter'); await Game.swirl(last);
    const r = await runBattle(ids, { bg: 'arena', noRun: true, boss: last && ids.some(id => MONS[id].boss), music: last ? 'boss' : 'battle', winText: last ? '制霸！觀眾席爆出歡呼聲！' : `第 ${k + 1} 戰勝利！` });
    rounds += (Battle.last && Battle.last.round) || 0;
    if (r !== 'win') {
      for (const m of G.party) { const s = Party.stats(m); m.hp = s.mhp; m.mp = Math.max(m.mp, Math.round(s.mmp * 0.5)); m.st = {}; }
      await UI.say('……', '鬥技場的醫護把大家抬到休息室，傷都治好了。', '主持人：「真可惜！鍛鍊一下再來挑戰吧！」');
      return;
    }
    if (!last) {
      for (const m of G.party) if (m.hp > 0) { const s = Party.stats(m); m.hp = Math.min(s.mhp, m.hp + Math.round(s.mhp * 0.2)); m.mp = Math.min(s.mmp, m.mp + Math.round(s.mmp * 0.2)); }
      await UI.say(`主持人：「第 ${k + 1} 戰勝利！稍微喘口氣——下一場對手準備進場！」`);
    }
  }
  const first = !F(a.id), rec = G.flags[a.id + 'r'];
  G.flags[a.id] = true;
  if (!rec || rounds < rec) G.flags[a.id + 'r'] = rounds;
  Music.jingle('item');
  await UI.say(`主持人：「「${a.name}」制霸！總共只用了 ${rounds} 回合！」` + (rec && rounds < rec ? '\n刷新了最佳紀錄！' : ''));
  if (first) {
    G.gold += a.gold; Snd.play('coin');
    await S.get(a.prize, 1, `主持人：「這是第一次制霸的獎品！」\n得到了 ${a.gold} 金幣和${itemInfo(a.prize).name}！`);
    if (a.prize2) await S.get(a.prize2, 1, `得到了${itemInfo(a.prize2).name}！` + (TOMES[a.prize2] ? '\n（在「道具」裡使用就能學會新的法術。）' : ''));
  } else { G.gold += a.again; Snd.play('coin'); await UI.say(`得到了獎金 ${a.again} 金幣。`); }
  Extra.check();
}
ACHS.push(
  ['arena1', '鬥技場新星', '制霸青銅之戰', () => F('arena1')],
  ['arena4', '鬥技場的傳說', '制霸星辰之戰', () => F('arena4')],
  ['trade', '交換之旅', '完成交換之旅', () => F('tr_done')],
  ['tome', '博學多聞', '用秘傳書學會新法術', () => G.party.some(m => (m.learned || []).length)],
);
MAPS.sand.npcs.push({ x: 19, y: 23, spr: 'arena', dir: 'down', fixed: 1, talk: n => arenaTalk(n) });

// ───── 支線：交換之旅（楓葉村 → 白帆港 → 砂金城 → 霜鈴村 → 楓葉村）─────
MAPS.maple.npcs.push({ x: 16, y: 19, spr: 'painter', dir: 'down', talk: async () => {
  if (F('tr_done')) return UI.say('畫家艾倫：「雪景畫好了！楓葉配上白雪，這是我畫過最美的一幅。」', '畫家艾倫：「謝謝你，洛恩。下次出遠門也記得幫我看看風景喔。」');
  if (Bag.has('tr_snow')) {
    await UI.say('畫家艾倫：「這、這是霜鈴村的雪晶？在手心裡也不會融化……」', '畫家艾倫：「我一直想畫雪，可是楓葉村從來不下雪。謝謝你！」');
    Bag.remove('tr_snow'); G.flags.tr_done = true;
    await S.get('tome_blizzard', 1, '畫家艾倫：「這本舊書是我旅行時撿到的，上面畫滿了冰的圖案。送給你！」\n得到了冰暴秘傳書！');
    return;
  }
  if (Bag.has('tr_paint') || Bag.has('tr_shell') || Bag.has('tr_rose')) return UI.say('畫家艾倫：「我的畫送到了嗎？白帆港的魯克爺爺是我的老朋友。」');
  G.flags.tr_met = true;
  await UI.say('畫家艾倫：「你好！我在畫楓葉村的秋天。」', '畫家艾倫：「白帆港有一位老水手魯克，年輕時就是從這個村子出海的。」', '畫家艾倫：「他說好想再看一眼故鄉的楓葉……可以幫我把這幅畫送給他嗎？」');
  await S.get('tr_paint', 1, '得到了楓葉之畫！');
} });
MAPS.port.npcs.push({ x: 14, y: 21, spr: 'oldsailor', dir: 'up', talk: async () => {
  if (Bag.has('tr_paint')) {
    await UI.say('老水手魯克：「這是……楓葉村的楓葉？是艾倫那小子畫的吧！」', '老水手魯克：「好懷念啊……我好像又聞到了秋天的味道。」');
    Bag.remove('tr_paint');
    await S.get('tr_shell', 1, '老水手魯克：「我沒什麼好回禮的，這個貝殼是我在南方的海撿到的。」\n得到了七彩貝殼！');
    await UI.say('老水手魯克：「砂金城有個跳舞的姑娘，最喜歡會發光的東西。說不定她會喜歡。」');
    return;
  }
  return UI.say('老水手魯克：「我年輕時從楓葉村出海，跑遍了整片大海。」', '老水手魯克：「現在老了，只想再看一眼故鄉的楓葉啊……」');
} });
MAPS.sand.npcs.push({ x: 6, y: 24, spr: 'dancer', dir: 'down', talk: async n => {
  if (Bag.has('tr_shell')) {
    Field.emote(n, '♥');
    await UI.say('舞孃莎菈：「哇！這個貝殼會變顏色！好漂亮……可以給我嗎？」', '舞孃莎菈：「我用它做跳舞的髮飾！作為交換，這朵花送給你。」');
    Bag.remove('tr_shell');
    await S.get('tr_rose', 1, '得到了沙漠玫瑰！');
    await UI.say('舞孃莎菈：「這是沙子變成的花，永遠不會凋謝。北方冷冷的雪國，應該很少看到花吧？」');
    return;
  }
  return UI.say('舞孃莎菈：「我每天晚上都在廣場跳舞。」', '舞孃莎菈：「要是有閃閃發光的髮飾就好了……海邊的東西最漂亮了。」');
} });
MAPS.snow.npcs.push({ x: 4, y: 10, spr: 'oldwoman', dir: 'down', talk: async n => {
  if (Bag.has('tr_rose')) {
    await UI.say('雪國奶奶：「哎呀，這是花嗎？是沙子做的花！」', '雪國奶奶：「我活了這麼久，第一次看到沙漠的花。真是謝謝你。」');
    Bag.remove('tr_rose');
    await S.get('tr_snow', 1, '雪國奶奶：「這個雪晶放多久都不會融化，帶去給想看雪的人吧。」\n得到了不融的雪晶！');
    return;
  }
  return UI.say('雪國奶奶：「這裡一年到頭都是雪，連一朵花也開不了。」', '雪國奶奶：「真想在死前看看南方沙漠裡的花啊……」');
} });

// ───── 支線：圖鑑委託（楓葉村的研究員）─────
{
  const sch = MAPS.maple.npcs.find(n => n.spr === 'scholar' && n.x === 12 && n.y === 8);
  if (sch) {
    const talk0 = sch.talk;
    sch.talk = async () => {
      await talk0();
      const n = Extra.bookCount(), got = G.flags.bookreq || 0;
      const R = [[15, 'ether', 3, '魔力水'], [30, 'sageglass', 1, '賢者單眼鏡'], [45, 'lifefruit', 2, '生命果實']];
      for (const [need, id, cnt] of R) if (n >= need && got < need) { G.flags.bookreq = need; await S.get(id, cnt, `研究員：「已經記錄 ${need} 種了？太了不起了！這是委託的謝禮。」\n得到了${itemInfo(id).name}${cnt > 1 ? ' ×' + cnt : ''}！`); }
      const nx = R.find(r => r[0] > (G.flags.bookreq || 0));
      if (nx) await UI.say(`研究員：「委託：請打倒 ${nx[0]} 種不同的怪物。完成的話我會送你${nx[3]}。」`);
    };
  }
}

// ───── NPC 的小動作：轉頭看人、偶爾冒出表情 ─────
{
  const EMO = { girl: ['♪', '♥'], boy: ['♪', '！'], bard: ['♪'], oldwoman: ['…'], grandpa: ['…'], scholar: ['？', '…'], merchant: ['♪'], gambler: ['…'], cat: ['♥'], dancer: ['♪', '♥'], painter: ['？', '♪'], sailor: ['♪'], oldsailor: ['…'] };
  const up0 = Field.updateNpcs.bind(Field);
  Field.updateNpcs = function (dt) {
    up0(dt);
    if (this.busy || UI.busy() || this.isWorld()) return;
    const L0 = this.leader(); if (!L0) return;
    this.emoT = (this.emoT ?? rnd(4, 8)) - dt;
    for (const n of this.npcs) {
      if (n.hidden || n.mv || n.d.fixed || n.d.mon || n.d.ghost) continue;
      n.it = (n.it ?? rnd(1.5, 4)) - dt;
      if (n.it > 0) continue;
      n.it = rnd(2, 5);
      const dx = L0.x - n.x, dy = L0.y - n.y, near = Math.abs(dx) + Math.abs(dy) <= 3;
      if (near && Math.random() < 0.75) n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      else if (!n.d.wander && Math.random() < 0.45) n.dir = pick(['down', 'down', 'left', 'right', n.d.dir || 'down']);
    }
    if (this.emoT <= 0) {
      this.emoT = rnd(5, 10);
      const cand = this.npcs.filter(n => !n.hidden && !n.d.mon && EMO[n.d.spr] && Math.abs(n.x - L0.x) < 7 && Math.abs(n.y - L0.y) < 6);
      if (cand.length) { const n = pick(cand); this.emote(n, pick(EMO[n.d.spr]), 1.6); }
    }
  };
  const ld0 = Field.load.bind(Field);
  Field.load = function (...a) { this.emotes = []; this.cineT = 0; this.cine = 0; this.hideParty = false; ld0(...a); this.vehicles = Ferry.parked(); };
}

// ───── 劇情演出：遇到頭目與夥伴加入時拉上黑邊、冒出驚嘆號、畫面震動 ─────
async function cineWrap(fn, o = {}) {
  Field.cineT = 1;
  try {
    if (o.alert) { Field.emote('leader', '！', 1.1); Snd.play(o.boss ? 'roar' : 'ok'); if (o.boss) Field.shake(0.5); await sleep(700); }
    return await fn();
  } finally { Field.cineT = 0; }
}
{
  const JOIN_TALKS = new Set(['liaTalk', 'miraEvent', 'balkTalk', 'balkEvent', 'queenTalk', 'altarEvent', 'bossNox']);
  for (const id in MAPS) for (const n of MAPS[id].npcs || []) {
    if (!n.talk || n.cine) continue;
    const t0 = n.talk;
    if (n.mon) { n.talk = npc => cineWrap(() => t0(npc), { alert: 1, boss: MONS[n.mon] && MONS[n.mon].boss }); n.cine = 1; }
    else if (JOIN_TALKS.has(t0.name)) { n.talk = npc => cineWrap(() => t0(npc), { alert: 1 }); n.cine = 1; }
  }
  for (const id in MAPS) for (const tr of MAPS[id].triggers || []) { if (tr.cine) continue; const r0 = tr.run; tr.run = () => cineWrap(r0, { alert: 1, boss: /^boss/.test(r0.name) }); tr.cine = 1; }
  const alt0 = altarEvent; altarEvent = () => cineWrap(alt0);
  const intro0 = introEvent; introEvent = () => cineWrap(intro0);
  const end0 = endingEvent; endingEvent = () => cineWrap(end0);
}

// ───── 渡船：白帆港 ⇄ 東岸碼頭，在大地圖上真的開船過海 ─────
const Ferry = {
  PORT: [26, 33], DOCK: [42, 30],
  spr(dir) {
    return LSpr.get('ship' + dir, 36, 30, p => {
      const W = '#8a5228', Wh = '#b8783a', Wd = '#5a3218', R = '#c0303a';
      // 船身
      for (let x = 3; x <= 32; x++) {
        const top = x > 27 ? 17 - (x - 27) * 0.8 : x < 6 ? 18 - (6 - x) * 0.5 : 18;
        const bot = 25 - Math.max(0, x - 26) * 0.9 - Math.max(0, 7 - x) * 0.9;
        for (let y = Math.round(top); y <= Math.round(bot); y++) p.P(x, y, y === Math.round(top) ? Wh : y > bot - 1.5 ? Wd : (y === 21 ? '#f0e6d0' : y === 22 ? R : W));
      }
      for (const x of [9, 15, 21]) { p.P(x, 20, '#2a1a10'); p.P(x + 1, 20, '#2a1a10'); }
      // 船尾樓
      p.R(3, 14, 6, 4, Wd); p.R(3, 14, 6, 1, Wh); p.P(5, 15, '#ffd98a'); p.P(6, 15, '#ffd98a');
      // 桅杆與帆
      p.R(16, 1, 1, 17, '#5a3a20');
      for (let y = 3; y <= 14; y++) { const bow = Math.sin((y - 3) / 11 * Math.PI) * 2.2; for (let x = 9; x <= 23 + Math.round(bow); x++) p.P(x, y, x > 20 + bow ? '#d8d0c0' : y < 5 ? '#ffffff' : '#f4eee0'); }
      p.R(9, 3, 15, 1, '#a8a090'); p.R(9, 14, 15, 1, '#a8a090');
      // 帆上的曉鐘紋章
      p.E(16.5, 8.2, 2.2, 2.6, (x, y) => (y > 9 ? null : '#f2c14e')); p.R(13, 9, 7, 2, '#f2c14e'); p.R(13, 10, 7, 1, '#c88a20'); p.P(16, 11, '#a86a10'); p.P(17, 11, '#a86a10'); p.P(15, 6, '#fff4b0'); p.P(15, 7, '#fff4b0');
      // 前帆
      for (let y = 5; y <= 15; y++) for (let x = 25; x <= 25 + Math.round((y - 5) * 0.55); x++) p.P(x, y, '#ece4d4');
      p.L(17, 3, 31, 16, '#5a3a20');
      // 旗子
      p.R(17, 0, 5, 2, R); p.P(22, 1, R); p.P(17, 0, '#ff8a8a');
    }, true);
  },
  draw(v) {
    return (g, X, Y, T) => {
      const img = Ferry.spr('r'), k = T / 16, bob = Math.round(Math.sin(Field.t * 2.4 + (v.ph || 0)) * k);
      const w = img.width * k, h = img.height * k, cx = X + T / 2, base = Y + T * 0.95 + bob;
      // 浪花尾跡
      g.fillStyle = '#f4fbff';
      const nW = v.moving ? 14 : 5, back = v.face < 0 ? 1 : -1;
      for (let i = 0; i < nW; i++) {
        const ph = (Field.t * (v.moving ? 1.3 : 0.5) + i / nW) % 1, d = w * 0.38 + ph * w * (v.moving ? 1.1 : 0.4), sp = (1 + ph * (v.moving ? 7 : 3)) * k;
        g.globalAlpha = (1 - ph) * 0.85;
        for (const sg of [-1, 1]) g.fillRect(Math.round(cx + back * d), Math.round(base - k * 2 + sg * sp), Math.max(k, Math.round(k * 3 * (1 - ph))), k);
      }
      if (v.moving) { g.globalAlpha = 0.8; for (let i = 0; i < 3; i++) g.fillRect(Math.round(cx - back * (w * 0.42 + i * k)), Math.round(base - k * (3 + ((Field.t * 8 + i) % 3))), k, k); }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(10,30,70,.28)'; g.fillRect(Math.round(cx - w * 0.42), Math.round(base - k), Math.round(w * 0.84), k * 2);
      g.save(); g.translate(Math.round(cx), 0); if (v.face < 0) g.scale(-1, 1);
      g.drawImage(img, Math.round(-w / 2), Math.round(base - h), w, h); g.restore();
    };
  },
  parked() {
    if (Field.id !== 'world' || !F('d2') || this.sailing) return [];
    const v = { x: this.DOCK[0] - 0.2, y: this.DOCK[1], face: -1, ph: 1 };
    v.draw = this.draw(v); return [v];
  },
  path(a, b) {
    const W = Field.w, H = Field.h, prev = new Int32Array(W * H).fill(-1), q = [a[1] * W + a[0]]; prev[q[0]] = q[0];
    const sea = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (Field.tile(x, y) === '~' || (x === b[0] && y === b[1]));
    while (q.length) { const i = q.shift(), x = i % W, y = (i / W) | 0; if (x === b[0] && y === b[1]) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * W + nx; if (sea(nx, ny) && prev[j] < 0) { prev[j] = i; q.push(j); } } }
    const end = b[1] * W + b[0]; if (prev[end] < 0) return null;
    const out = []; for (let i = end; ; i = prev[i]) { out.unshift([i % W, (i / W) | 0]); if (prev[i] === i) break; }
    // 去掉多餘的轉角，讓航線比較順
    return out.filter((p, i) => i === 0 || i === out.length - 1 || i % 2 === 0);
  },
  async sail(from, to) {
    Field.load('world', from[0], from[1], 'right', { quiet: true });
    const path = this.path(from, to);
    if (!path) return;
    this.sailing = true; Field.hideParty = true; Field.cineT = 1;
    const v = { x: from[0], y: from[1], face: to[0] > from[0] ? 1 : -1, moving: true };
    v.draw = this.draw(v); Field.vehicles = [v];
    const P = Field.party;
    const setPos = (x, y) => { v.x = x; v.y = y; for (const p of P) { p.x = x; p.y = y; p.fx = x; p.fy = y; p.t = 1; } };
    setPos(from[0], from[1]);
    await Game.fadeIn(0.5);
    Snd.play('wind');
    let seg = 0;
    await new Promise(res => {
      const lay = { modal: true, draw() { } };
      lay.update = dt => {
        const a = path[seg], b = path[seg + 1]; if (!b) { UI.remove(lay); res(); return; }
        v.k = (v.k || 0) + dt * 3.4 * (window.__speed || 1);
        if (b[0] !== a[0]) v.face = b[0] > a[0] ? 1 : -1;
        if (v.k >= 1) { v.k = 0; seg++; setPos(b[0], b[1]); return; }
        const e = v.k; setPos(lerp(a[0], b[0], e), lerp(a[1], b[1], e));
      };
      UI.push(lay);
    });
    v.moving = false;
    await sleep(350);
    Field.cineT = 0;
  },
};
{
  const port = MAPS.port.npcs.find(n => n.talk === captainTalk);
  if (port) port.talk = async () => {
    if (!F('d2')) return captainTalk();
    await UI.say('船長：「燈塔又亮了！多虧了你們。」');
    if (await UI.yesno('船長：「要搭船到東方大陸的碼頭嗎？船費就免了！」')) {
      await Game.fadeOut(0.5);
      await Game.story(['白帆船乘著風，駛向東方。'], true);
      await Ferry.sail(Ferry.PORT, Ferry.DOCK);
      await Game.fadeOut(0.35);
      Ferry.sailing = false;
      Field.load('world', 44, 30, 'right', { quiet: true });
      await Game.fadeIn(0.4);
    }
  };
}
dockEvent = async function () {
  if (await UI.yesno('東岸的碼頭停著白帆港的船。要搭船回白帆港嗎？')) {
    await Game.fadeOut(0.5);
    await Ferry.sail(Ferry.DOCK, Ferry.PORT);
    await Game.fadeOut(0.35);
    Ferry.sailing = false;
    await Game.go('port', 26, 11, 'left', { from: 'ferry' });
  }
};

// ───── 選單：附頭像與經驗條的隊伍卡片、換裝備時的角色面板 ─────
function drawPortraitBox(g, id, x, y, s) {
  const fs = L.FS;
  g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, x, y, s, s, fs * 0.2); g.fill();
  g.fillStyle = 'rgba(120,140,220,.22)'; rr(g, x, y, s, s * 0.6, fs * 0.2); g.fill();
  const im = portrait(id); if (im) { g.imageSmoothingEnabled = false; g.drawImage(im, x, y, s, s); }
  g.strokeStyle = 'rgba(232,214,160,.8)'; g.lineWidth = Math.max(1, fs * 0.07); rr(g, x, y, s, s, fs * 0.2); g.stroke();
}
function gaugeBar(g, x, y, w, h, k, c0, c1) {
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x, y, w, h);
  if (k > 0) { g.fillStyle = c1; g.fillRect(x, y, Math.max(1, w * clamp(k, 0, 1)), h); g.fillStyle = c0; g.fillRect(x, y, Math.max(1, w * clamp(k, 0, 1)), Math.max(1, h * 0.45)); }
}
partyPanel = function (o = {}) {
  return UI.panel(g => {
    const fs = L.FS, pad = L.pad, n = G.party.length, V = L.V;
    const w = Math.min(fs * 14.5, V.w - fs * 6.2 - pad * 3), rh = fs * 3.6, h = rh * n + pad * 1.4;
    const x = V.x + V.w - w - pad, y = V.y + pad + 34 * L.dpr;
    UI.win(g, x, y, w, h);
    const ps = rh - fs * 0.5;
    G.party.forEach((m, i) => {
      const s = Party.stats(m), yy = y + pad * 0.7 + i * rh, hi = o.hi && o.hi() === m;
      if (hi) { g.fillStyle = 'rgba(255,215,106,.14)'; rr(g, x + pad * 0.45, yy - fs * 0.1, w - pad * 0.9, rh - fs * 0.1, fs * 0.25); g.fill(); g.strokeStyle = 'rgba(255,215,106,.75)'; g.lineWidth = Math.max(1, fs * 0.07); g.stroke(); }
      drawPortraitBox(g, m.id, x + pad * 0.8, yy + fs * 0.1, ps);
      const tx = x + pad * 1.2 + ps, tw = x + w - pad * 1.1 - tx;
      const nameCol = m.hp <= 0 ? '#ff7a8a' : m.st.poison ? '#c08aff' : '#fff';
      UI.text(g, Party.name(m), tx, yy + fs * 0.05, nameCol, fs * 0.92, 'left', 'top', 700);
      UI.text(g, (m.hp <= 0 ? '倒下　' : m.st.poison ? '中毒　' : '') + 'Lv ' + m.lv, x + w - pad * 1.1, yy + fs * 0.12, m.hp <= 0 ? '#ff9aa8' : '#ffd76a', fs * 0.78, 'right', 'top', 700);
      const bw = tw, bh = Math.max(3, fs * 0.2);
      const r1 = yy + fs * 1.5, r2 = yy + fs * 2.35;
      UI.text(g, 'HP', tx, r1, '#9aa6d8', fs * 0.62, 'left', 'middle', 700); UI.text(g, `${m.hp}/${s.mhp}`, tx + bw, r1, '#fff', fs * 0.74, 'right', 'middle', 700);
      gaugeBar(g, tx, r1 + fs * 0.32, bw, bh, m.hp / s.mhp, m.hp < s.mhp / 4 ? '#ffb07a' : '#9affb0', m.hp < s.mhp / 4 ? '#e0603a' : '#3ab860');
      UI.text(g, 'MP', tx, r2, '#9aa6d8', fs * 0.62, 'left', 'middle', 700); UI.text(g, `${m.mp}/${s.mmp}`, tx + bw, r2, '#dfe8ff', fs * 0.74, 'right', 'middle', 700);
      gaugeBar(g, tx, r2 + fs * 0.32, bw, bh, s.mmp ? m.mp / s.mmp : 0, '#a8d8ff', '#3a6ad8');
      // 經驗條
      const e0 = EXP_TABLE[m.lv] || 0, e1 = EXP_TABLE[m.lv + 1] || e0 + 1;
      gaugeBar(g, tx, yy + rh - fs * 0.42, bw, Math.max(2, fs * 0.1), m.lv >= MAXLV ? 1 : (m.exp - e0) / (e1 - e0), '#fff0a0', '#d8a030');
    });
  });
};
statPanel = function (cmp) {
  return UI.panel(g => {
    const m = cmp.m, fs = L.FS, pad = L.pad, V = L.V, C = CHARS[m.id];
    const s = Party.stats(m);
    let n = null;
    if (cmp.next) { const eq = Object.assign({}, m.eq); eq[cmp.next.slot] = cmp.next.id; n = Party.stats(Object.assign({}, m, { eq })); }
    const narrow = V.w < fs * 27;
    const w = narrow ? V.w - pad * 2 : fs * 12.5, rows = [['攻擊力', 'atk'], ['防禦力', 'def'], ['速度', 'agi'], ['智力', 'int'], ['最大 HP', 'mhp']];
    const head = fs * 3.6, h = head + fs * 1.42 * rows.length + pad * 1.8;
    const x = narrow ? V.x + pad : V.x + V.w - w - pad, y = narrow ? V.y + V.h - h - pad : V.y + pad;
    UI.win(g, x, y, w, h);
    const ps = head - pad * 0.6;
    drawPortraitBox(g, m.id, x + pad * 0.9, y + pad * 0.7, ps);
    UI.text(g, C.name, x + pad * 1.5 + ps, y + pad * 0.8, '#fff', fs * 1.02, 'left', 'top', 700);
    UI.text(g, 'Lv ' + m.lv, x + w - pad * 1.2, y + pad * 0.95, '#ffd76a', fs * 0.8, 'right', 'top', 700);
    UI.text(g, C.role, x + pad * 1.5 + ps, y + pad * 0.8 + fs * 1.35, '#cfd6ff', fs * 0.76);
    if (G.party.length > 1) UI.text(g, '◀ ▶ 換人', x + w - pad * 1.2, y + pad * 0.8 + fs * 2.35, '#7a86b8', fs * 0.64, 'right');
    rows.forEach(([lab, k], i) => {
      const cw = Math.min(w - pad * 2, fs * 12), xx = x + pad, yy = y + head + pad * 0.6 + i * fs * 1.42;
      UI.text(g, lab, xx + pad * 0.3, yy, '#9aa6d8', fs * 0.82);
      UI.text(g, String(s[k]), xx + cw * 0.62, yy, '#fff', fs * 0.88, 'right', 'top', 700);
      if (n && n[k] !== s[k]) { const up = n[k] > s[k]; UI.text(g, (up ? '▲ ' : '▼ ') + n[k], xx + cw - pad * 0.4, yy, up ? '#7dffb0' : '#ff8a8a', fs * 0.88, 'right', 'top', 700); }
    });
  });
};

// ───── 鬥技場戰鬥背景 ─────
{
  const get0 = BBG.get.bind(BBG);
  BBG.get = function (kind, aspect) {
    if (kind !== 'arena') return get0(kind, aspect);
    const W = 320, H = clamp(Math.round(W * aspect / 8) * 8, 150, 420), key = 'arena' + H;
    if (this.cache[key]) return this.cache[key];
    const hz = Math.round(H * (aspect > 0.9 ? 0.36 : 0.46));
    const back = document.createElement('canvas'); back.width = W; back.height = H; const g = back.getContext('2d');
    const fg = document.createElement('canvas'); fg.width = W; fg.height = H;
    const r = seeded(77);
    let gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, '#f08a40'); gr.addColorStop(1, '#ffe0a0'); g.fillStyle = gr; g.fillRect(0, 0, W, hz);
    // 觀眾席：一層層石階與人群
    const tiers = 5, t0 = hz * 0.28;
    for (let i = 0; i < tiers; i++) {
      const y0 = t0 + i * (hz - t0) / tiers, y1 = t0 + (i + 1) * (hz - t0) / tiers;
      g.fillStyle = i % 2 ? '#b8885a' : '#c8986a'; g.fillRect(0, y0, W, y1 - y0); g.fillStyle = '#8a5a34'; g.fillRect(0, y1 - 2, W, 2); g.fillStyle = '#e0b888'; g.fillRect(0, y0, W, 1);
      for (let x = 2; x < W; x += 4) { if (r() < 0.12) continue; const c = pick(['#e04a4a', '#3a8ad8', '#f2c14e', '#4aa860', '#f4ece0', '#a050c0', '#d87a3a']); g.fillStyle = c; g.fillRect(x, y0 + 2, 3, Math.max(2, (y1 - y0) * 0.45)); g.fillStyle = pick(['#f0c098', '#c88a58', '#e8b080']); g.fillRect(x + 0.5, y0, 2, 2); }
    }
    // 拱門與旗幟
    for (let i = 0; i < 5; i++) { const x = (i + 0.5) * W / 5; g.fillStyle = '#7a5030'; g.fillRect(x - 1, t0 - 22, 2, 24); g.fillStyle = i % 2 ? '#c0303a' : '#3a6ad8'; g.beginPath(); g.moveTo(x + 1, t0 - 22); g.lineTo(x + 14, t0 - 18); g.lineTo(x + 1, t0 - 13); g.fill(); }
    g.fillStyle = '#9a6a40'; g.fillRect(0, hz - 4, W, 6); g.fillStyle = '#d8a870'; g.fillRect(0, hz - 4, W, 1);
    for (let x = 6; x < W; x += 26) { g.fillStyle = '#6a4024'; g.fillRect(x, hz - 12, 12, 10); g.fillStyle = '#5a3a20'; g.fillRect(x + 1, hz - 11, 10, 9); }
    // 沙地
    for (let y = hz + 2; y < H; y++) { const t = (y - hz) / (H - hz); g.fillStyle = mix('#e8c888', '#c8a060', t); g.fillRect(0, y, W, 1); }
    for (let i = 0; i < 260; i++) { const y = hz + 2 + Math.pow(r(), 0.8) * (H - hz - 2), s = 1 + (y - hz) / (H - hz) * 2; g.fillStyle = r() < 0.5 ? '#b89050' : '#f4dca0'; g.fillRect(r() * W, y, s, Math.max(1, s * 0.5)); }
    g.strokeStyle = 'rgba(160,110,60,.35)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(W / 2, hz + (H - hz) * 0.62, W * 0.42, (H - hz) * 0.3, 0, 0, TAU); g.stroke();
    return (this.cache[key] = { W, H, hz, back, fg, anim: 'heat', fy0: 0, fy1: 0 });
  };
}
