'use strict';
// 曉鐘傳說：第四輪追加（月汐群島篇）——劇情、人物、支線、冒險筆記、成就

// ───── 人物外觀 ─────
Object.assign(LOOKS, {
  tideelder: { skin: '#eec4a0', hair: '#e8e8f0', hs: 'bun', eye: '#3a2a5a', top: '#3a4a8a', trim: '#f2d27a', pants: '#3a4a8a', shoes: '#2a2a3a', belt: '#f2d27a', out: 'robe', robe2: '#2a3470', shawl: '#c8b0ff' },
  fisher: { skin: '#d89a70', hair: '#3a2a1a', hs: 'short', eye: '#2a1a1a', top: '#e8d8a0', trim: '#3a6a8a', pants: '#3a5a7a', shoes: '#3a2a1a', belt: '#6a4a2a', out: 'tunic', hat: 'wide', hatc: '#e0c070', beard: '#3a2a1a' },
  tideman: { skin: '#e0a878', hair: '#1a2a3a', hs: 'short', eye: '#2a1a1a', top: '#3aa0a0', trim: '#f4f0e0', pants: '#2a4a5a', shoes: '#3a2a1a', belt: '#f4f0e0', out: 'tunic', hat: 'band', hatc: '#f4f0e0' },
  tidewoman: { skin: '#f0c8a0', hair: '#2a2a4a', hs: 'long', eye: '#2a2a4a', top: '#5ab0c8', trim: '#ffffff', pants: '#5ab0c8', shoes: '#3a2a3a', belt: '#ffffff', out: 'dress', scarf: '#f2c14e' },
  tidegirl: { skin: '#f6d0b0', hair: '#3a3a8a', hs: 'pony', eye: '#3a4a9a', top: '#f0a0c0', trim: '#ffffff', pants: '#f0a0c0', shoes: '#c04060', belt: '#ffffff', out: 'dress', small: 1 },
});
Object.assign(SPEAKERS, { 瑪烏奶奶: 'tideelder', 瑪烏: 'tideelder', 岡瑟: 'fisher', 漁夫岡瑟: 'fisher', 娜拉: 'tidewoman', 樂師諾亞: 'bard', 諾亞: 'bard', 小汐: 'tidegirl', 月汐港的人: 'tideman', 懸賞官: 'soldier' });

// 隊伍裡有這個人才說這句話
const inP = id => G.party.some(m => m.id === id) || (G.reserve || []).some(m => m.id === id);
const sayIf = (...lines) => UI.say(...lines.filter(l => !Array.isArray(l) || inP(l[0])).map(l => Array.isArray(l) ? l[1] : l));

// ───── 白帆港：伊芙登場 ─────
async function eveIntro(n) {
  Field.emote(n, '！', 1);
  await UI.say('藍髮的少女：「請問……你就是敲響曉鐘的鐘守，洛恩嗎？」', '伊芙：「我叫伊芙，是南方「月汐群島」的見習暮鐘守。」', '伊芙：「我們的島上有一口「暮鐘」。每天黃昏它響起的時候，太陽才會安心地下山，星星才會出來。」', '伊芙：「可是……曉鐘再響的那天早上，暮鐘的三片「月音片」被搶走了。」', '伊芙：「從那天起，群島的太陽再也沒有落下過。花枯了、泉水乾了，大家睡不著覺，海水也越來越燙……」', '伊芙：「搶走月音片的，是一個自稱「灰燼賢者」的人。他說——「黑夜，永遠不要再回來」。」');
  await sayIf(['lia', '莉亞：「沒有盡頭的白天……跟黯王想要的，剛好相反呢。」'], ['mira', '米菈：「白天太長，一樣會出事啊。植物也要睡覺的！」'], ['balk', '巴爾克：「那就去把音片搶回來。這種事我們最拿手了。」']);
  await UI.say('伊芙：「你們願意幫忙嗎？謝謝你們！我的弓和歌，一定幫得上忙。」');
  G.flags.eve = true;
  await joinEve();
  await UI.say('伊芙：「我的「月帆船」就停在碼頭下面。準備好了，就跟船長說一聲吧！」');
}
async function joinEve() {
  let m;
  if (G.ngParty && G.ngParty.eve) { m = G.ngParty.eve; delete G.ngParty.eve; }
  else {
    const avg = G.party.reduce((s, x) => s + x.lv, 0) / G.party.length;
    m = Party.make('eve', Math.max(28, Math.round(avg) - 1));
    Object.assign(m.eq, JOIN_EQ.eve);
  }
  const s = Party.stats(m); m.hp = s.mhp; m.mp = s.mmp; m.st = {};
  G.reserve = G.reserve || [];
  Music.jingle('join');
  if (G.party.length < 4) {
    G.party.push(m);
    const L0 = Field.leader(); Field.party.push({ x: L0.x, y: L0.y, fx: L0.x, fy: L0.y, dir: L0.dir, t: 1 });
    await UI.say('伊芙加入了隊伍！');
  } else {
    G.reserve.push(m);
    await UI.say('伊芙成為了夥伴！', '（隊伍已經有 4 個人了，伊芙先在後方待命。\n打開選單的「隊伍」→「換人」就能讓她上場。待命的夥伴也會得到一部分經驗值。）');
  }
  Extra.check();
}
MAPS.port.npcs.push({ x: 29, y: 12, spr: 'eve', dir: 'left', if: () => F('nox') && !F('eve'), talk: n => cineWrap(() => eveIntro(n), { alert: 1 }) });
{
  const cap = MAPS.port.npcs.find(n => n.spr === 'captain');
  if (cap) {
    const t0 = cap.talk;
    cap.talk = async n => {
      if (!F('eve') || !F('d2')) return t0(n);
      const i = await UI.menu({ items: [{ t: '東方大陸（白帆船）' }, { t: '月汐群島（月帆船）' }, { t: '不搭船' }], title: '要去哪裡？', pos: mpos() });
      if (i === 0) { const keep = UI.yesno; UI.yesno = async () => true; try { await t0(n); } finally { UI.yesno = keep; } return; }
      if (i === 1) { await UI.say('伊芙：「月帆船準備好了！出發吧！」'); await sailToIsles(); }
    };
  }
}

// ───── 抵達群島 ─────
async function islesArrival() {
  G.flags.isl = true;
  Field.cineT = 1;
  await UI.say('伊芙：「這裡就是月汐群島……你們看，太陽一動也不動。」', '伊芙：「一個月了，它一直停在天空正中央。」');
  await sayIf(['mira', '米菈：「好熱……連影子都縮成一小團了。」'], ['lia', '莉亞：「大家一定都很累了吧。」']);
  await UI.say('伊芙：「沿著這條路往北走，就是我的家鄉月汐港。先去見瑪烏奶奶吧，她是暮鐘守。」');
  Field.cineT = 0;
}

// ───── 月汐港 ─────
async function elderTalk() {
  if (!F('tide1')) {
    G.flags.tide1 = true;
    await UI.say('瑪烏奶奶：「伊芙！妳平安回來了……這幾位是？」', '伊芙：「奶奶，他們就是敲響曉鐘的人！」', '瑪烏奶奶：「……是嗎。曉鐘的鐘守啊，歡迎來到月汐港。」', '瑪烏奶奶：「你看這口暮鐘。三片月音片被搶走以後，就再也敲不響了。」', '瑪烏奶奶：「灰燼賢者把音片分了出去。我聽得見它們的聲音——」', '瑪烏奶奶：「一片在西海岸的「珊瑚洞窟」，被一隻貪心的大螃蟹抱著；一片在北方的「霧之森」，那裡住著一位霧之魔女。」', '瑪烏奶奶：「最後一片，在東島的「曜日之塔」，在索爾維的手裡。東島被潮水隔開，只有月音片的力量，才能讓潮水退去。」', '瑪烏奶奶：「珊瑚洞窟的潮水，會跟著洞裡的「潮汐拉桿」漲落。先看清楚水道再動手。」', '瑪烏奶奶：「霧之森會讓迷路的人一直繞圈子。森林裡的螢火蟲……記得跟著牠們。」');
    return;
  }
  if (F('dusk')) return UI.say('瑪烏奶奶：「每天黃昏，暮鐘都會響。太陽下山，星星出來，大家都睡得好香。」', '瑪烏奶奶：「曉鐘喚醒早晨，暮鐘送走白天。兩口鐘，本來就是一對的啊。」', F('levi') ? '瑪烏奶奶：「深淵的海皇也安靜下來了。海很平靜呢。」' : '瑪烏奶奶：「暮鐘響了以後，珊瑚洞窟深處的「深淵之門」也打開了……那裡睡著一位海的古老君王。」');
  if (F('solvi')) return UI.say('瑪烏奶奶：「三片音片都回來了……快，去敲響暮鐘吧！」');
  if (F('sandbar')) return UI.say('瑪烏奶奶：「沙洲出現了！東島的曜日之塔……索爾維就在最頂樓。」', '瑪烏奶奶：「塔裡的「日輪石」據說會互相牽動。慢慢想，不要急。」');
  if (F('m1') && F('m2')) return UI.say('瑪烏奶奶：「兩片音片都找回來了！」', '瑪烏奶奶：「帶著它們到群島東岸，路的盡頭。伊芙，在那裡唱暮鐘之歌，潮水就會退去。」');
  const left = [!F('m1') && '西海岸珊瑚洞窟的「潮之音片」', !F('m2') && '北方霧之森的「霧之音片」'].filter(Boolean);
  return UI.say(`瑪烏奶奶：「還差${left.join('、還有')}。」`, '瑪烏奶奶：「路上累了，就回港口休息吧。」');
}
async function duskBellTalk() {
  if (F('dusk')) { Snd.bell(330, 0.3); Field.ring(15, 1.5, '200,180,255', 8, 1.6); return UI.say('暮鐘靜靜地垂掛著，三片月音片閃著柔和的光。'); }
  const n = ['mshard1', 'mshard2', 'mshard3'].filter(s => Bag.has(s)).length;
  if (n < 3) return UI.say('一口青銀色的鐘，上面刻著月亮與星星。', `鐘身裡本來應該有三片月音片……${n ? `現在找回了 ${n} 片。` : '現在全都空了。'}`);
  return duskEnding();
}
const TIDE_NPCS = [
  { x: 17, y: 2, spr: 'tideelder', dir: 'left', fixed: 1, talk: () => elderTalk() },
  { x: 5, y: 3, spr: 'tideman', dir: 'down', talk: () => shop('tide_w', '武器防具店：「這些都是用群島的珍珠和珊瑚打造的。」') },
  { x: 4, y: 11, spr: 'tidewoman', dir: 'down', talk: () => shop('tide_i', '道具店：「月露是群島的特產，喝一口精神就回來了！」') },
  { x: 22, y: 12, spr: 'tideman', dir: 'left', talk: () => inn(40) },
  { x: 21, y: 4, spr: 'priest', dir: 'down', talk: () => church() },
  { x: 31, y: 12, spr: 'fisher', dir: 'up', talk: () => fisherTalk() },
  { x: 3, y: 19, spr: 'tidewoman', dir: 'right', talk: () => fishBookTalk() },
  { x: 11, y: 8, spr: 'bard', wander: 1, talk: () => musicianTalk() },
  { x: 8, y: 16, spr: 'tidegirl', wander: 1, talk: () => shellGirlTalk() },
  { x: 19, y: 8, spr: 'soldier', dir: 'down', talk: () => tideBountyTalk() },
  { x: 21, y: 16, spr: 'tidewoman', wander: 1, talk: () => UI.say(F('dusk') ? '月汐港的人：「昨晚終於看到星星了！我抱著孩子哭了好久。」' : '月汐港的人：「太陽已經整整一個月沒下山了……孩子們都睡不著覺。」') },
  { x: 10, y: 20, spr: 'oldsailor', wander: 1, talk: () => UI.say(F('dusk') ? '老漁夫：「潮水又開始漲落了，跟以前一樣。今天的魚特別多！」' : '老漁夫：「海水越來越燙，魚都游到深海去了。」', '老漁夫：「岡瑟那傢伙整天待在碼頭盡頭釣魚，你們要不要也試試？」') },
  { x: 13, y: 19, spr: 'boy', wander: 1, talk: () => UI.say('男孩：「伊芙姊姊的弓箭超準的！她可以射中天上飛的海鳥喔！」', F('dusk') ? '男孩：「昨天晚上我數星星數到睡著了！」' : '男孩：「好想看星星喔……」') },
];
MAPS.tide.npcs.push(...TIDE_NPCS);
MAPS.tide.onEnter = () => { if (F('eve') && !F('tide1') && !F('tide0')) { G.flags.tide0 = true; setTimeout(() => Field.run(() => UI.say('伊芙：「這裡就是月汐港！瑪烏奶奶在北邊的鐘樓裡。」')), 700); } };

// ───── 沙洲 ─────
async function sandbarEvent() {
  if (!(F('m1') && F('m2'))) return UI.say('海的對面就是東島。曜日之塔閃著刺眼的光。', '伊芙：「潮水太深了……要是有月音片的力量就好了。」');
  Field.cineT = 1;
  await UI.say('伊芙把兩片月音片捧在手心，輕輕地唱起了暮鐘之歌。', '伊芙：「♪ 太陽啊，請休息吧——潮水啊，請退去吧——」');
  Snd.play('holy'); Game.flashWhite = 0.6;
  for (let i = 0; i < 3; i++) setTimeout(() => Field.ring(34 + i * 1.5, 15, '200,220,255', 10, 1.8), i * 250);
  await sleep(900);
  G.flags.sandbar = true; Field.applyDynamic(); Field.rebake(); Field.shake(0.6); Snd.play('wind');
  await UI.say('嘩啦啦——潮水退去了，一條白色的沙洲出現在海面上！', '伊芙：「路出現了！曜日之塔就在前面。」');
  Field.cineT = 0;
}

// ───── 頭目 ─────
async function bossKarkino() {
  if (F('m1')) return;
  await cineWrap(async () => {
    await UI.say('水潭裡浮起一隻巨大的紅色螃蟹，鉗子裡緊緊夾著一片閃閃發光的東西。', '卡爾奇諾：「喀喀喀！這片亮晶晶的貝殼是我的寶貝！」', '卡爾奇諾：「灰燼賢者說，只要抱著它，太陽就會一直照著我的殼，永遠閃閃發亮——」', '卡爾奇諾：「誰都別想搶走！」');
    if (await S.boss(['karkino'], { bg: 'coral' })) {
      G.flags.m1 = true;
      await UI.say('卡爾奇諾：「喀……我的寶貝……」', '巨蟹縮回殼裡，滾進了深深的水底。');
      await S.get('mshard1', 1, '得到了潮之音片！');
      await UI.say('伊芙：「是潮之音片！好溫柔的聲音……」', F('m2') ? '伊芙：「兩片都找回來了！回去告訴奶奶吧。」' : '伊芙：「還有一片在北方的霧之森。」');
      Extra.check();
    }
  }, { alert: 1, boss: 1 });
}
async function bossVesper() {
  if (F('m2')) return;
  await cineWrap(async () => {
    await UI.say('霧裡站著一位撐著綠色提燈的女人。', '薇絲柏：「……竟然解開了鐘之謎。你們不是索爾維的人吧？」', '薇絲柏：「我是守護這座森林的魔女。霧之音片，是我從索爾維手裡偷回來的。」', '薇絲柏：「可是我不能隨便交給別人。要是又落到他手裡，這片森林就永遠沒有夜晚了。」', '薇絲柏：「讓我看看你們的力量吧！」');
    if (await S.boss(['vesper'], { bg: 'mist' })) {
      G.flags.m2 = true;
      await UI.say('薇絲柏：「……很好。你們的光，跟他的不一樣。是溫暖的光。」', '薇絲柏：「拿去吧。還有……索爾維他，其實是個可憐的人。」');
      await S.get('mshard2', 1, '得到了霧之音片！');
      await UI.say('薇絲柏：「五百年前那場沒有盡頭的長夜，他是鑄造曉鐘的鐘匠的徒弟。」', '薇絲柏：「他看著村子一個一個被黑暗吞沒……從那天起，再也不敢閉上眼睛。」', '薇絲柏：「他把自己關在曜日之塔，靠太陽的力量活了五百年。他不是壞人——只是太害怕了。」', '伊芙：「……所以他才想要永遠的白天。」', '薇絲柏：「去吧，鐘守們。讓他好好睡一覺。」', '薇絲柏化成一陣霧，消失在林間。');
      Extra.check();
    }
  }, { alert: 1, boss: 1 });
}
async function bossSunguard() {
  if (F('sunguard')) return;
  await cineWrap(async () => {
    await UI.say('通往頂樓的階梯前，一尊金色的巨像睜開了眼睛。', '日輪魔像：「……太陽……不落……入侵者……燃盡……」');
    if (await S.boss(['sunguard'], { bg: 'sun' })) {
      G.flags.sunguard = true;
      await UI.say('日輪魔像的光一點一點地熄滅，化成了一堆溫熱的黃銅。');
      await S.get('sunbow', 1, '巨像的胸口留下了一把金色的弓。\n得到了曜日之弓！');
      await UI.say('伊芙：「頂樓就在上面了……」');
      Extra.check();
    }
  }, { alert: 1, boss: 1 });
}
async function bossSolvi() {
  if (F('solvi')) return;
  Field.cineT = 1;
  Field.emote('leader', '！', 1.1); Snd.play('roar'); Field.shake(0.5); await sleep(700);
  await UI.say('塔頂的中央燃燒著一顆小小的太陽。太陽前站著一位灰色長袍的老人。', '索爾維：「……你們就是敲響曉鐘的孩子嗎。」', '索爾維：「五百年前，我是鑄造曉鐘的鐘匠的徒弟。」', '索爾維：「那場沒有盡頭的黑夜裡，我看著村子一個一個被黑暗吞沒。」', '索爾維：「所以我發誓：只要有我在，黑夜就永遠不會回來。」', '伊芙：「可是，黑夜不是黯王！黑夜是讓大家休息、讓星星出來的時間啊！」', '索爾維：「休息？……我已經五百年沒有閉上眼睛了。只要一閉上眼，黑暗就會回來。」', '索爾維：「來吧。讓我看看，曉鐘的光能不能照亮我心裡的黑夜！」');
  Field.cineT = 0;
  Snd.play('boss'); await Game.swirl(true);
  let r = await runBattle(['solvi1'], { boss: true, music: 'final', bg: 'sun', keepMusic: true, noFanfare: true, winText: '索爾維跪倒在地……' });
  if (r === 'lose') { await Game.wipe(); return; }
  await UI.say('索爾維：「……不夠，還不夠亮！」', '索爾維：「太陽啊，就算把我燒成灰燼也沒關係——別讓夜晚回來！」');
  Game.flashWhite = 1; Snd.play('roar'); Field.shake(0.8);
  await sleep(500);
  await UI.say('索爾維和塔頂的小太陽合而為一了！', '伊芙：「大家撐住！我來唱歌！」', '伊芙的潮汐之歌包圍了大家……');
  for (const m of G.party) { const s = Party.stats(m); m.hp = s.mhp; m.mp = s.mmp; m.st = {}; }
  Snd.play('heal');
  r = await runBattle(['solvi2'], { boss: true, music: 'final', bg: 'sun', winText: '烈日化身崩落了！' });
  if (r === 'lose') { await Game.wipe(); return; }
  G.flags.solvi = true;
  await UI.say('索爾維：「……好溫暖。這是……什麼光？」', '伊芙：「是夕陽喔。太陽要下山的時候，就是這個顏色。」', '索爾維：「原來……黃昏是這種顏色啊。」', '索爾維：「師父……我可以……休息了嗎……」', '老人閉上了眼睛，化成一縷溫暖的灰，被風輕輕地吹散了。');
  await S.get('mshard3', 1, '灰燼裡，留下了一片還帶著溫度的音片。\n得到了光之音片！');
  await UI.say('伊芙：「三片都到齊了……我們回月汐港，敲響暮鐘吧！」');
  await duskEnding();
}
async function bossLevi() {
  if (F('levi')) return;
  await cineWrap(async () => {
    await UI.say('漆黑的海溝深處，一雙巨大的眼睛睜開了。', '利維坦：「……是誰，吵醒了深淵之王的睡眠。」', '利維坦：「暮鐘的聲音讓我醒了過來。既然醒了——就陪我玩玩吧，陸地的勇者！」');
    if (await S.boss(['levi'], { bg: 'abyss', music: 'final' })) {
      G.flags.levi = true;
      await UI.say('利維坦：「……好久沒有這麼痛快了。」', '利維坦：「拿去吧。這是海的王冠上掉下來的東西。」', '巨大的影子沉回了海溝深處。');
      await S.get('seaking', 1, '得到了海皇之戟！');
      await S.get('levicrest', 1, '得到了海皇紋章！');
      Extra.check();
    }
  }, { alert: 1, boss: 1 });
}

// ───── 結局：暮鐘再響 ─────
async function duskEnding() {
  Music.play('ending', true);
  await Game.story(['洛恩一行人帶著三片月音片，回到了月汐港。', '港口的人們全都聚集到了鐘樓前。'], true);
  await Game.go('tide', 15, 2, 'up', { quiet: true, keepMusic: true });
  Field.party.forEach((p, i) => { p.x = [15, 14, 16, 15][i] ?? 15; p.y = [2, 3, 3, 3][i] ?? 3; p.fx = p.x; p.fy = p.y; p.dir = 'up'; p.t = 1; });
  await UI.say('瑪烏奶奶：「三片都回來了……伊芙，妳來敲吧。」', '伊芙：「……嗯！」', '伊芙把三片月音片嵌進了暮鐘，和洛恩一起拉動了鐘繩——');
  for (let i = 0; i < 3; i++) { Snd.bell(330, 0.35); Snd.bell(247, 0.2, 0.4); Game.flashWhite = 0.4; Field.shake(0.2); for (let j = 0; j < 3; j++) setTimeout(() => Field.ring(15, 1.5, j ? '200,170,255' : '255,210,170', 9 + i * 3, 1.8), j * 260); await sleep(1600); }
  G.flags.dusk = true; Field.rebake();
  await sleep(600);
  await UI.say('噹——噹——噹——', '暮鐘的聲音越過海面，傳遍了整個群島。');
  window.islSunset = 'rgba(255,150,80,.22)';
  await UI.say('停了一個月的太陽，慢慢地、慢慢地往西邊沉了下去。');
  window.islSunset = 'rgba(200,90,110,.28)';
  await UI.say('天空染成了橘色、紅色，然後是溫柔的紫色。');
  window.islSunset = 'rgba(40,30,110,.42)'; Snd.play('holy');
  await UI.say('第一顆星星，亮了起來。');
  await UI.say('瑪烏奶奶：「謝謝你們。曉鐘喚醒早晨，暮鐘送走白天——兩口鐘，本來就是一對的啊。」');
  await S.get('duskblade', 1, '瑪烏奶奶：「這是歷代暮鐘守傳下來的劍和弓。送給曉鐘的鐘守，還有我們的伊芙。」\n得到了暮光之劍！');
  await S.get('duskbow', 1, '得到了暮光之弓！');
  await UI.say('伊芙：「洛恩，謝謝你。以後……也讓我跟你們一起旅行吧！早晨和黃昏，一起守護！」');
  await Game.story(['— 暮鐘篇　完 —', '月汐群島又有了黃昏與星空。\n人們終於能好好地睡一覺了。', '而在珊瑚洞窟的最深處，\n一扇刻著潮汐紋路的石門，悄悄地打開了……'], true);
  window.islSunset = null;
  Game.fadeA = 1; await Game.fadeIn(0.8);
  Music.play(Field.musicName(), true);
  Extra.check();
  if (G.slot) Game.save(G.slot);
}

// ───── 冒險筆記、支線、成就 ─────
{
  const obj1 = objective;
  objective = function () {
    if (!F('nox') || F('dusk')) return obj1();
    if (!F('eve')) return '世界恢復了光明。聽說白帆港的碼頭來了一艘掛著月亮帆的小船……去看看吧。（通關後的新篇章「月汐群島」）';
    if (!F('isl')) return '和伊芙一起搭月帆船，前往南方的月汐群島。（跟白帆港的船長說話）';
    if (!F('tide1')) return '沿著群島的路往北走，到月汐港找暮鐘守瑪烏奶奶。';
    if (!F('m1') || !F('m2')) return '找回兩片月音片：' + [!F('m1') && '西海岸珊瑚洞窟的「潮之音片」', !F('m2') && '北方霧之森的「霧之音片」'].filter(Boolean).join('、') + '。';
    if (!F('sandbar')) return '兩片音片都找回來了！到群島東岸的路的盡頭，讓伊芙的歌聲退去潮水。';
    if (!F('solvi')) return '穿過沙洲，登上東島的曜日之塔，打倒灰燼賢者索爾維。';
    return '回月汐港，敲響暮鐘。';
  };
  SIDEQUESTS.push(
    { name: '新篇章：月汐群島', state: () => !F('nox') ? null : F('dusk') ? '完成！暮鐘再次響起，群島有了黃昏與星空。' : F('eve') ? `月音片 ${['mshard1', 'mshard2', 'mshard3'].filter(s => Bag.has(s)).length} / 3` : '白帆港的碼頭來了一艘陌生的小船。' },
    { name: '隱藏頭目：深淵海皇', state: () => !F('dusk') ? null : F('levi') ? '完成！打倒了深淵海皇利維坦。' : '珊瑚洞窟 B2 的深淵之門打開了。最深處睡著海的古老君王。' },
    { name: '支線：暮鐘之歌的樂譜', state: () => !F('tide1') ? null : F('score_done') ? '完成！諾亞送了潮汐秘傳書。' : `月汐港的樂師諾亞在找三張樂譜殘頁（找到 ${['score1', 'score2', 'score3'].filter(s => Bag.has(s)).length} / 3）。` },
    { name: '支線：月光貝', state: () => !F('tide1') ? null : (G.flags.shellgot || 0) >= 6 ? '完成！小汐送了潮汐的寶物。' : `群島各地藏著 6 個月光貝（找到 ${shellCount()} / 6）。靠近時會閃光。` },
    { name: '支線：月汐懸賞', state: () => !F('tide1') ? null : ['kingcrab', 'phoenix'].every(k => F('tb_' + k)) ? '完成！' : '月汐港的懸賞官在找兩隻稀有魔物：巨鉗王（主島）、火鳳（東島）。' },
  );
  ACHS.push(
    ['eve', '月汐之友', '讓伊芙成為夥伴', () => F('eve')],
    ['dusk', '暮鐘再響', '讓月汐群島的太陽下山', () => F('dusk')],
    ['levi', '深淵霸主', '打倒深淵海皇利維坦', () => F('levi')],
    ['shell6', '拾貝人', '找到全部 6 個月光貝', () => shellCount() >= 6],
    ['puzzle', '解謎高手', '解開鐘之謎與三層日輪石', () => F('thorn') && ['sun1', 'sun2', 'sun3'].every(m => F(`door:${m}:10,4`))],
  );
  // 讀取已通關的記錄時提示新篇章（只提示一次）
  addEventListener('DOMContentLoaded', () => {
    const lg0 = Game.loadGame.bind(Game);
    Game.loadGame = function (n) {
      lg0(n);
      if (G && F('nox') && !F('eve') && !F('isl_note')) { G.flags.isl_note = true; setTimeout(() => Field.run(() => UI.say('（新的篇章開放了！）', '聽說白帆港的碼頭來了一艘掛著月亮帆的小船，船上的少女正在找敲響曉鐘的鐘守……')), 2600); }
    };
  });
  // 通關後的各城鎮：有人談論南方
  MAPS.maple.npcs.push({ x: 19, y: 19, spr: 'woman2', wander: 1, if: () => F('nox'), talk: () => UI.say(F('dusk') ? '村人：「聽說南方的群島也有一口鐘？曉鐘和暮鐘，好像是一對的呢。」' : '村人：「最近南方的海上，好像有一座島的太陽一直不下山……」') });
}

// ───── 支線：樂譜（樂師諾亞）─────
async function musicianTalk() {
  if (F('score_done')) return UI.say('樂師諾亞：「♪ 暮鐘之歌終於完整了。每天黃昏，我都在碼頭彈給大家聽。」');
  const got = ['score1', 'score2', 'score3'].filter(s => Bag.has(s));
  if (got.length === 3) {
    await UI.say('樂師諾亞：「三張都找到了！這就是暮鐘之歌的完整樂譜……」', '諾亞撥起了琴弦。溫柔的旋律像潮水一樣流過港口。');
    ['score1', 'score2', 'score3'].forEach(s => Bag.remove(s)); G.flags.score_done = true;
    await S.get('tome_tidesong', 1, '樂師諾亞：「這本書是我師父留下的，寫著用歌聲療傷的祕密。送給你們！」\n得到了潮汐秘傳書！');
    return;
  }
  G.flags.score_ask = true;
  return UI.say('樂師諾亞：「我是港口的樂師諾亞。」', '樂師諾亞：「暮鐘之歌的樂譜被灰燼賢者的手下撕成三張，丟進了群島的迷宮裡……」', `樂師諾亞：「珊瑚洞窟、霧之森、曜日之塔——要是找到樂譜殘頁，請帶回來給我！（目前 ${got.length} / 3）」`);
}
// ───── 支線：月光貝（小汐）─────
async function shellGirlTalk() {
  const n = shellCount(), got = G.flags.shellgot || 0;
  const R = [[3, 'moonwater', 3], [6, 'tidering', 1]];
  let gave = false;
  for (const [need, id, cnt] of R) if (n >= need && got < need) { G.flags.shellgot = need; gave = true; await S.get(id, cnt, `小汐：「哇！${need} 個月光貝！這個送你～」\n得到了${itemInfo(id).name}${cnt > 1 ? ' ×' + cnt : ''}！`); }
  if (gave) return;
  if (got >= 6) return UI.say('小汐：「我把月光貝串成項鍊了！晚上會發光喔，你看～」');
  return UI.say('小汐：「群島到處都藏著「月光貝」喔！晚上……啊，現在一直是白天。總之，靠近的時候會閃閃發亮！」', `小汐：「找到 3 個或 6 個的時候來找我，我有好東西送你！（目前 ${n} / 6）」`);
}
// ───── 支線：月汐懸賞 ─────
async function tideBountyTalk() {
  const list = [['kingcrab', '巨鉗王 哈普', '主島的草原和海岸', 3000, 'herb3', 3], ['phoenix', '火鳳 菲尼', '東島的沙地', 5000, 'anglerring', 1]];
  await UI.say('懸賞官：「這裡是月汐港的懸賞處。群島上有兩隻罕見的大傢伙。」');
  for (const [id, name, where, gold, item, cnt] of list) {
    const k = 'tb_' + id;
    if (F(k)) continue;
    if (Extra.kills(id) > 0) { G.flags[k] = true; G.gold += gold; Snd.play('coin'); await S.get(item, cnt, `懸賞官：「你打倒了${name}！這是賞金 ${gold} 金幣，還有這個。」\n得到了${itemInfo(item).name}${cnt > 1 ? ' ×' + cnt : ''}！`); }
    else await UI.say(`懸賞官：「目標：${name}。出沒在${where}，很少出現。」`);
  }
  if (list.every(l => F('tb_' + l[0]))) await UI.say('懸賞官：「兩張懸賞都完成了！群島的人都在傳你們的事蹟。」');
  Extra.check();
}
