// 星系預設場景、軌道任務、天文小百科
import * as THREE from 'three';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tilt = (ax, az) => V(Math.sin(az), Math.cos(ax) * Math.cos(az), Math.sin(ax)).normalize();

// ---------------------------------------------------------------- 星系沙盒的預設
export const PRESETS = [
  {
    id: 'spiral', name: '旋臂星系', icon: '🌀', info: 'spiral',
    tip: '一個有兩條旋臂的星系。轉動視角看看，從旁邊看是不是薄薄一片？',
    run(S) { S.addGalaxy({ pos: V(0, 0, 0), mass: 3000, radius: 48, slots: 4, arms: 2, wind: 3.4, bulge: 0.12 }); },
    cam: { dist: 150, pitch: 0.85 },
  },
  {
    id: 'collide', name: '兩個星系相撞', short: '星系相撞', icon: '💥', info: 'collision',
    tip: '兩個星系擦身而過，重力把星星甩出長長的「潮汐尾巴」。按 2× 或 4× 看快一點！',
    run(S) {
      S.addGalaxy({ pos: V(-42, -4, -14), vel: V(2.1, 0.15, 0.95), normal: tilt(0.35, 0.2), mass: 1800, radius: 30, slots: 2, arms: 2 });
      S.addGalaxy({ pos: V(42, 4, 14), vel: V(-2.1, -0.15, -0.95), normal: tilt(-0.9, 0.5), mass: 1800, radius: 30, slots: 2, arms: 2 });
    },
    cam: { dist: 160, pitch: 1.0 },
  },
  {
    id: 'merge', name: '大星系吃小星系', short: '大吃小', icon: '🍽️', info: 'merger',
    tip: '小星系繞著大星系越轉越近，最後被拉散、吞進去。銀河系也正在吃好幾個小星系喔！',
    run(S) {
      S.addGalaxy({ pos: V(0, 0, 0), mass: 3200, radius: 44, slots: 3, arms: 2, wind: 3.6 });
      S.addGalaxy({ pos: V(70, 6, 0), vel: V(0, 0.3, 4.2), normal: tilt(0.6, 0.3), mass: 500, radius: 13, slots: 1, arms: 2, bulge: 0.3 });
    },
    cam: { dist: 200, pitch: 0.9 },
  },
  {
    id: 'hole', name: '黑洞闖進來', short: '黑洞闖入', icon: '🕳️', info: 'blackhole',
    tip: '一顆超大質量黑洞衝過星系：靠太近的星星會被吃掉，其他的被甩得亂七八糟。',
    run(S) {
      S.addGalaxy({ pos: V(0, 0, 0), mass: 2600, radius: 46, slots: 4, arms: 3, wind: 3 });
      S.addBlackHole({ pos: V(-130, 12, 40), vel: V(5.2, -0.4, -1.4), mass: 1500 });
    },
    cam: { dist: 210, pitch: 0.75 },
  },
  {
    id: 'nebula', name: '星雲漩渦', icon: '☁️', info: 'nebula',
    tip: '一大團亂亂的星雲繞著中心轉，慢慢被甩成一圈一圈的漩渦。',
    run(S) { S.addGalaxy({ pos: V(0, 0, 0), mass: 2600, radius: 60, slots: 4, kind: 1 }); },
    cam: { dist: 220, pitch: 0.7 },
  },
  {
    id: 'ring', name: '車輪星系', icon: '🎡', info: 'ring',
    tip: '一個小星系從大星系的正中間「穿」過去，重力像丟進水裡的石頭一樣，推出一圈往外跑的星星環。',
    run(S) {
      S.addGalaxy({ pos: V(0, 0, 0), mass: 2600, radius: 46, slots: 3, arms: 2, wind: 2.6, bulge: 0.1 });
      S.addGalaxy({ pos: V(4, 75, 3), vel: V(0, -7.5, 0), normal: tilt(1.2, 0.4), mass: 2200, radius: 9, slots: 1, arms: 2, bulge: 0.5 });
    },
    cam: { dist: 190, pitch: 1.2 },
  },
];

// ---------------------------------------------------------------- 軌道任務（平面，太陽系尺度）
// bodies：gm（重力大小）、r（畫的半徑）、rail(t)：照固定路線走（不受別人影響）
// player：要發射的東西：起點、最大速度、relTo（速度相對於哪個天體）
export const MISSIONS = [
  {
    id: 'orbit', name: '繞太陽一圈', icon: '🪐', info: 'orbit',
    goal: '從行星往後拉、放開，讓它繞太陽轉完整一圈（不能撞到太陽，也不能飛走）。',
    hint: '往太陽的「側面」丟，不是對著太陽丟。速度太慢會掉進去，太快會飛走。',
    bodies: [{ id: 'sun', name: '太陽', gm: 400, r: 3.2, color: 0xffcc55, glow: 1 }],
    player: { name: '行星', pos: [26, 0], max: 8, color: 0x5aa8ff, r: 1.1 },
    check(st) {
      const r = st.p.length();
      if (r < 3.6) return { lose: '撞上太陽了！速度再快一點。' };
      if (r > 85) return { lose: '飛出太陽系了！速度再慢一點。' };
      if (st.sweep >= Math.PI * 2) return { win: '繞了一整圈！它現在是一顆穩定的行星了。' };
      return null;
    },
  },
  {
    id: 'moon', name: '月亮繞行星', icon: '🌙', info: 'moon',
    goal: '行星在繞太陽轉。把月亮發射出去，讓它繞著行星轉兩圈。',
    hint: '月亮離行星很近，要用小小的力氣、往行星的側面丟。速度是「相對於行星」的。',
    bodies: [
      { id: 'sun', name: '太陽', gm: 400, r: 3.2, color: 0xffcc55, glow: 1 },
      { id: 'planet', name: '行星', gm: 25, r: 1.4, color: 0x4fb1ff, rail: (t) => { const w = Math.sqrt(400 / 34 ** 3); return [Math.cos(w * t) * 34, Math.sin(w * t) * 34, -Math.sin(w * t) * 34 * w, Math.cos(w * t) * 34 * w]; } },
    ],
    player: { name: '月亮', pos: [38.5, 0], max: 5, color: 0xdddddd, r: 0.6, relTo: 'planet' },
    check(st) {
      const pl = st.body('planet'), d = st.p.clone().sub(pl.p).length();
      if (st.p.length() < 3.6) return { lose: '掉進太陽了！' };
      if (d < 1.6) return { lose: '撞到行星了！' };
      if (d > 12) return { lose: '月亮跑掉了！行星的重力抓不住它，速度小一點。' };
      if (st.sweepRel >= Math.PI * 4) return { win: '月亮穩穩地繞行星轉了兩圈！' };
      return null;
    },
  },
  {
    id: 'comet', name: '彗星進太陽系', icon: '☄️', info: 'comet',
    goal: '彗星從很遠的地方來。發射它，讓它從太陽旁邊（虛線圈裡面）繞過去，但不要撞上太陽。',
    hint: '不要直直對著太陽，稍微偏一點點。靠近太陽時彗星會長出尾巴！',
    bodies: [{ id: 'sun', name: '太陽', gm: 400, r: 3.2, color: 0xffcc55, glow: 1 }],
    ring: 9,
    player: { name: '彗星', pos: [-78, 52], max: 6, color: 0xbfefff, r: 0.7, comet: true },
    check(st) {
      const r = st.p.length();
      if (r < 3.6) return { lose: '撞上太陽了！瞄準旁邊一點。' };
      if (st.minR < 9 && r > 20) return { win: `彗星在距離太陽 ${st.minR.toFixed(1)} 的地方繞過去，又飛回太空了！` };
      if (r > 150 || (st.t > 60 && st.minR >= 9)) return { lose: '彗星沒有靠近太陽。要進到虛線圈裡面喔！' };
      return null;
    },
  },
  {
    id: 'assist', name: '彈弓加速', icon: '🚀', info: 'assist',
    goal: '探測器的引擎很弱（最快 4.5）。利用移動中的木星「甩」一下，讓它用超過 6.5 的速度飛出畫面。',
    hint: '從木星的「後面」掠過，木星會把探測器往前拉、加速。時間點很重要，可以按「預測」線多試幾次。',
    bodies: [{ id: 'jup', name: '木星', gm: 170, r: 2.4, color: 0xd9a066, rail: (t) => [-75 + 4.2 * t, 4, 4.2, 0] }],
    player: { name: '探測器', pos: [-6, -38], max: 4.5, color: 0xffffff, r: 0.5, probe: true },
    speedGoal: 6.5,
    check(st) {
      const j = st.body('jup'), d = st.p.clone().sub(j.p).length();
      if (d < 2.6) return { lose: '撞上木星了！' };
      const sp = st.v.length();
      if (st.p.length() > 95) return sp >= 6.5 ? { win: `成功！探測器用 ${sp.toFixed(1)} 的速度飛走了（發射時只有 ${st.v0.toFixed(1)}）。` } : { lose: `飛出去了，但速度只有 ${sp.toFixed(1)}，要超過 6.5。` };
      if (st.t > 70) return { lose: '時間到了。試試看從木星後面掠過。' };
      return null;
    },
  },
  {
    id: 'binary', name: '雙星系統', icon: '♊', info: 'binary',
    goal: '兩顆太陽互相繞著轉。讓行星在這個系統裡平安待 40 秒。',
    hint: '離兩顆太陽太近，軌道會被扯亂。遠一點、繞著「兩顆一起」轉比較穩。',
    bodies: [
      { id: 'a', name: '太陽 A', gm: 200, r: 2.4, color: 0xffd36b, glow: 1, rail: (t) => { const w = Math.sqrt(400 / 12 ** 3); return [Math.cos(w * t) * 6, Math.sin(w * t) * 6, -Math.sin(w * t) * 6 * w, Math.cos(w * t) * 6 * w]; } },
      { id: 'b', name: '太陽 B', gm: 200, r: 2.4, color: 0xff8f6b, glow: 1, rail: (t) => { const w = Math.sqrt(400 / 12 ** 3); return [-Math.cos(w * t) * 6, -Math.sin(w * t) * 6, Math.sin(w * t) * 6 * w, -Math.cos(w * t) * 6 * w]; } },
    ],
    player: { name: '行星', pos: [32, 0], max: 6, color: 0x7fe0a0, r: 1 },
    check(st) {
      for (const id of ['a', 'b']) if (st.p.clone().sub(st.body(id).p).length() < 2.8) return { lose: '撞上其中一顆太陽了！' };
      const r = st.p.length();
      if (r > 70) return { lose: '跑太遠了，被甩出去了！' };
      if (st.t >= 40) return { win: '行星在雙星系統裡平安轉了 40 秒！' };
      return null;
    },
    time: 40,
  },
  {
    id: 'ellipse', name: '長長的橢圓', icon: '🥚', info: 'kepler',
    goal: '讓行星繞太陽一整圈，而且軌道要拉得長長的：最遠要飛到虛線圈外面。',
    hint: '往側面丟，力氣比「繞一圈」大一點。太大力會飛走喔！看預測線有沒有碰到虛線圈。',
    bodies: [{ id: 'sun', name: '太陽', gm: 400, r: 3.2, color: 0xffcc55, glow: 1 }],
    ring: 50,
    player: { name: '行星', pos: [26, 0], max: 7, color: 0xff9a5a, r: 1.1 },
    check(st) {
      const r = st.p.length();
      if (r < 3.6) return { lose: '撞上太陽了！' };
      if (r > 95) return { lose: '飛出太陽系了！力氣小一點點。' };
      if (st.sweep >= Math.PI * 2) return st.maxR >= 50 ? { win: `繞了一圈，最遠飛到 ${st.maxR.toFixed(0)}！注意看：它在遠的地方跑得特別慢。` } : { lose: `繞了一圈，可是最遠只有 ${st.maxR.toFixed(0)}，要飛到 50 以外。` };
      return null;
    },
  },
  {
    id: 'dock', name: '追上太空站', icon: '🛰️', info: 'rendezvous',
    goal: '太空站在外圈繞太陽轉。從內圈發射太空船，飛過去和太空站碰在一起（對接）。',
    hint: '不要直直朝太空站丟——它會跑掉！往側面丟，讓太空船畫半個橢圓，剛好在外圈「等」到太空站。',
    bodies: [
      { id: 'sun', name: '太陽', gm: 400, r: 3.2, color: 0xffcc55, glow: 1 },
      { id: 'st', name: '太空站', gm: 0, r: 1.2, color: 0x9fffd0, rail: (t) => { const w = Math.sqrt(400 / 40 ** 3), a = w * t + 2.2; return [Math.cos(a) * 40, Math.sin(a) * 40, -Math.sin(a) * 40 * w, Math.cos(a) * 40 * w]; } },
    ],
    ring: 40,
    player: { name: '太空船', pos: [20, 0], max: 6, color: 0xffffff, r: 0.6, probe: true },
    check(st) {
      const d = st.p.clone().sub(st.body('st').p).length();
      if (st.p.length() < 3.6) return { lose: '掉進太陽了！' };
      if (d < 2.8) return { win: `對接成功！太空船花了 ${st.t.toFixed(0)} 秒追上太空站。` };
      if (st.p.length() > 90) return { lose: '飛太遠了！' };
      if (st.t > 120) return { lose: '時間到，沒有追上。試試讓軌道最遠的地方剛好碰到外圈。' };
      return null;
    },
  },
  {
    id: 'escape', name: '逃離太陽', icon: '🌠', info: 'escape',
    goal: '探測器在離太陽很近的地方。用夠快的速度發射，讓它掙脫太陽的重力，飛出畫面。',
    hint: '太陽很近、拉力很大，要用很大的力氣（接近最大速度），而且不要朝著太陽丟。',
    bodies: [{ id: 'sun', name: '太陽', gm: 400, r: 3.2, color: 0xffcc55, glow: 1 }],
    player: { name: '探測器', pos: [12, 0], max: 8.8, color: 0xd0e8ff, r: 0.5, probe: true },
    check(st) {
      const r = st.p.length();
      if (r < 3.6) return { lose: '掉進太陽了！' };
      if (r > 100) return { win: `逃出去了！離開時速度還有 ${st.v.length().toFixed(1)}。從這裡要逃走，最少要 8.2 的速度。` };
      if (st.t > 50 || st.sweep > Math.PI * 2.2) return { lose: '被太陽拉回來了！速度要再快一點。' };
      return null;
    },
  },
  {
    id: 'system', name: '設計太陽系', icon: '☀️', info: 'planets',
    goal: '依序發射 3 顆行星（近、中、遠）。三顆都要繞太陽轉滿 2 圈，一顆都不能掉進太陽或飛走。',
    hint: '離太陽越近要丟越快、越遠要越慢；每一顆都往「側面」丟。發射完第一顆，下一顆會出現在更外面。',
    bodies: [{ id: 'sun', name: '太陽', gm: 400, r: 3.2, color: 0xffcc55, glow: 1 }],
    multi: [[12, 0], [24, 0], [40, 0]], colors: [0xff9a5a, 0x5aa8ff, 0x9fe07a], laps: 2,
    player: { name: '行星', pos: [12, 0], max: 8, color: 0xff9a5a, r: 1.0 },
    check() { return null; },
  },
  {
    id: 'sandbox', name: '自由設計太陽系', icon: '🎨', info: 'planets', sandbox: true,
    goal: '沒有任務！想放幾顆行星就放幾顆（最多 12 顆），看看你的太陽系可以有幾顆穩定的行星。',
    hint: '每發射一顆，下一顆會出現在另一個位置。掉進太陽或飛走的會消失。按「重來」清空。',
    bodies: [{ id: 'sun', name: '太陽', gm: 400, r: 3.2, color: 0xffcc55, glow: 1 }],
    multi: [[10, 0], [0, 16], [-24, 0], [0, -32], [42, 0], [0, 52], [-62, 0], [0, -72]],
    colors: [0xff9a5a, 0x5aa8ff, 0x9fe07a, 0xe08aff, 0xffe066, 0x66e0d8, 0xff6b8b, 0xc8c8ff],
    player: { name: '行星', pos: [10, 0], max: 9, color: 0xff9a5a, r: 1.0 },
    check() { return null; },
  },
];

// ---------------------------------------------------------------- 天文小百科
export const INFO = {
  gravity: { t: '萬有引力', e: '🍎', d: '所有東西都會互相吸引，越重吸得越大力、越近也越大力（距離變兩倍，力氣只剩四分之一）。牛頓看到蘋果掉下來，想到月亮也是被地球「拉著」。' },
  orbit: { t: '軌道是一直在「掉」', e: '🪐', d: '行星其實一直往太陽掉，可是它往旁邊跑得夠快，每次都「掉偏了」，就變成繞圈圈。速度剛好就是圓形，快一點變成橢圓，太快就飛走了。' },
  planets: { t: '太陽系是怎麼排的', e: '☀️', d: '太陽系的八顆行星都在差不多同一個平面上、往同一個方向繞太陽。越靠近太陽的跑越快（水星每秒 47 公里），越遠的越慢（海王星每秒 5 公里），所以它們不會撞在一起。' },
  kepler: { t: '離得近跑得快', e: '⏱️', d: '克卜勒發現：行星靠近太陽時跑得比較快、離遠時比較慢。水星一年只有 88 天，海王星一年要 165 年！' },
  moon: { t: '月亮和希爾球', e: '🌙', d: '行星周圍有一塊它「抓得住」的範圍叫希爾球。月亮要在這裡面才不會被太陽搶走。地球的希爾球大約 150 萬公里，月亮在 38 萬公里的地方。' },
  comet: { t: '彗星的尾巴', e: '☄️', d: '彗星是冰和灰塵做的「髒雪球」。靠近太陽時冰被曬成氣體，太陽風把它往後吹，所以尾巴永遠指著「背對太陽」的方向，不是飛行的反方向！' },
  assist: { t: '彈弓效應', e: '🚀', d: '探測器從行星後面掠過，被行星拉著一起跑，就能「偷」到一點速度。航海家號就是靠木星和土星甩出太陽系的，現在已經飛了 240 億公里以上。' },
  binary: { t: '雙星', e: '♊', d: '天上大約一半的恆星有伴！兩顆星繞著共同的中心轉。星際大戰裡塔圖因星有兩個太陽，真的有類似的行星（克卜勒-16b）。' },
  rendezvous: { t: '太空交會', e: '🛰️', d: '太空船要追上太空站，不能直直衝過去：在太空裡「加速」會飛到更高、更慢的軌道。太空人會先算好時間，畫半個橢圓（霍曼轉移）剛好在對的地方碰面。' },
  escape: { t: '脫離速度', e: '🌠', d: '丟球越大力飛越高，夠快就再也不會掉下來。從地球表面要每秒 11.2 公里才逃得掉，從太陽系要更快。離得越近，要的速度越大。' },
  ring: { t: '車輪星系', e: '🎡', d: '5 億光年外的車輪星系，就是被一個小星系從中間穿過去。小星系經過時把星星往內拉，走了以後星星又彈回去，像水波一樣推出一圈亮亮的環，環上一直誕生新的藍色星星。' },
  spiral: { t: '旋臂星系', e: '🌀', d: '銀河系就是旋臂星系，直徑大約 10 萬光年，有一、兩千億顆恆星。旋臂不是固定的星星，比較像塞車：星星經過時擠在一起，新的藍色星星在那裡誕生。' },
  collision: { t: '星系碰撞', e: '💥', d: '星系相撞時星星幾乎不會真的撞在一起（星星之間太空曠了），可是重力會把星星甩成長長的潮汐尾巴。大約 45 億年後，銀河系會和仙女座星系相撞。' },
  merger: { t: '星系吃星系', e: '🍽️', d: '大星系會把靠近的小星系撕開、吞掉。銀河系現在正在吞人馬座矮星系，天上還看得到被扯出來的「星流」。' },
  blackhole: { t: '黑洞', e: '🕳️', d: '黑洞的重力大到連光都逃不出去。星系中心都有超大質量黑洞，銀河系中心的人馬座 A* 大約是太陽的 400 萬倍重。掉進去的氣體會在外面轉成發光的吸積盤。' },
  nebula: { t: '星雲', e: '☁️', d: '星雲是太空中的氣體和灰塵。重力讓它慢慢縮在一起，越轉越快、變成扁扁的盤子，中間點燃成恆星，旁邊的碎片變成行星——太陽系就是這樣誕生的。' },
};
export const INFO_ORDER = ['gravity', 'orbit', 'planets', 'kepler', 'moon', 'comet', 'assist', 'binary', 'rendezvous', 'escape', 'nebula', 'spiral', 'collision', 'merger', 'ring', 'blackhole'];
